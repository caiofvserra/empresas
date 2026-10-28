import { mkdir, open, readFile, rename, unlink, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fetchPncpBatch, PNCP_ENDPOINT } from './pncp.ts';
import type { PncpBatch, PncpContract } from './pncp.ts';
import type { HttpOptions } from './http.ts';
import { integer, isoDate, nonempty, object, instant } from './http.ts';

export type DateWindow = { start: string; end: string };
export type PncpStore = {
  schemaVersion: 'pncp-store-1.0'; sourceId: 'pncp'; fixture: false; uf: 'SP';
  status: 'collected-not-promoted'; endpoint: string; categoryIds: number[];
  lastSuccessAt: string; publicationWatermark: string; coverage: DateWindow[];
  lastBatch: Omit<PncpBatch, 'records'> & { selectedRows: number };
  records: PncpContract[];
  limitations: string[];
};

export function rollingWindow(now: Date, lookbackDays = 7, lagDays = 1): DateWindow {
  integer(lookbackDays, 'lookbackDays', 1);
  integer(lagDays, 'lagDays');
  if (lookbackDays > 366 || lagDays > 366) throw new Error('Invalid PNCP rolling-window size.');
  if (Number.isNaN(now.getTime())) throw new Error('Invalid collection clock.');
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - lagDays * 86_400_000);
  return { start: new Date(end.getTime() - (lookbackDays - 1) * 86_400_000).toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function mergeCoverage(windows: DateWindow[]): DateWindow[] {
  const ordered = windows.map(window => ({ start: isoDate(window.start, 'coverage start'), end: isoDate(window.end, 'coverage end') })).sort((a, b) => a.start.localeCompare(b.start));
  const merged: DateWindow[] = [];
  for (const window of ordered) {
    if (window.start > window.end) throw new Error('Invalid coverage interval.');
    const previous = merged.at(-1);
    const nextDay = previous ? new Date(Date.parse(`${previous.end}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10) : null;
    if (previous && nextDay! >= window.start) previous.end = previous.end > window.end ? previous.end : window.end;
    else merged.push({ ...window });
  }
  return merged;
}

/** Replace the complete re-collected publication window; never append duplicate keys. */
export function mergePncpBatch(previous: PncpStore | null, batch: PncpBatch): PncpStore {
  if (previous && (previous.sourceId !== 'pncp' || previous.fixture !== false || previous.uf !== 'SP' || JSON.stringify(previous.categoryIds) !== JSON.stringify(batch.categoryIds))) throw new Error('PNCP stored partition differs from collection configuration.');
  const retained = (previous?.records ?? []).filter(row => row.publishedAt.slice(0, 10) < batch.periodStart || row.publishedAt.slice(0, 10) > batch.periodEnd);
  const keys = new Set(retained.map(row => row.id));
  if (keys.size !== retained.length) throw new Error('PNCP stored keys are not unique.');
  for (const row of batch.records) {
    if (keys.has(row.id)) throw new Error('PNCP publication date moved outside recollected window; historical recomposition is required.');
    keys.add(row.id);
  }
  const { records, ...metadata } = batch;
  return {
    schemaVersion: 'pncp-store-1.0', sourceId: 'pncp', fixture: false, uf: 'SP', status: 'collected-not-promoted',
    endpoint: PNCP_ENDPOINT, categoryIds: batch.categoryIds, lastSuccessAt: batch.fetchedAt,
    publicationWatermark: previous && previous.publicationWatermark > batch.periodEnd ? previous.publicationWatermark : batch.periodEnd,
    coverage: mergeCoverage([...(previous?.coverage ?? []), { start: batch.periodStart, end: batch.periodEnd }]),
    lastBatch: { ...metadata, selectedRows: records.length },
    records: [...retained, ...records].sort((a, b) => a.id.localeCompare(b.id)),
    limitations: [...batch.limitations, 'Watermark registra publicação coletada; não comprova CDC nem cobertura anterior ao primeiro intervalo.', 'Lote coletado não significa conexão do modelo Power BI: a carga de staging, homologação e agendamento ainda são necessários.'],
  };
}

async function readPrevious(directory: string): Promise<PncpStore | null> {
  let raw: string;
  try { raw = await readFile(join(directory, 'current.json'), 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
  const data = object(JSON.parse(raw), 'stored PNCP batch');
  if (data.schemaVersion !== 'pncp-store-1.0' || data.sourceId !== 'pncp' || data.fixture !== false || data.uf !== 'SP' || data.status !== 'collected-not-promoted' || data.endpoint !== PNCP_ENDPOINT) throw new Error('Stored PNCP metadata is invalid.');
  instant(data.lastSuccessAt, 'stored lastSuccessAt'); isoDate(data.publicationWatermark, 'stored watermark');
  if (!Array.isArray(data.records) || !Array.isArray(data.categoryIds) || !Array.isArray(data.coverage)) throw new Error('Stored PNCP arrays are invalid.');
  const categories = data.categoryIds.map(value => integer(value, 'stored category', 1));
  mergeCoverage(data.coverage.map(value => { const window = object(value, 'stored coverage'); return { start: isoDate(window.start, 'coverage start'), end: isoDate(window.end, 'coverage end') }; }));
  const keys = new Set<string>();
  for (const value of data.records) {
    const row = object(value, 'stored contract');
    const id = nonempty(row.id, 'stored contract id');
    if (keys.has(id) || row.uf !== 'SP' || !categories.includes(integer(row.categoryId, 'stored category', 1))) throw new Error('Stored PNCP partition or keys are invalid.');
    keys.add(id);
    const publication = nonempty(row.publishedAt, 'stored publication'); isoDate(publication.slice(0, 10), 'stored publication date');
    if (!/^35\d{5}$/.test(nonempty(row.municipalityId, 'stored municipality'))) throw new Error('Stored PNCP municipality is invalid.');
    if (row.contractValue !== null && (typeof row.contractValue !== 'number' || !Number.isFinite(row.contractValue) || row.contractValue < 0)) throw new Error('Stored PNCP value is invalid.');
  }
  return data as PncpStore;
}

/** Same-directory rename is the commit point; current.json includes data and checkpoint. */
async function atomicJson(destination: string, value: unknown): Promise<void> {
  const temporary = `${destination}.${randomUUID()}.tmp`;
  const handle = await open(temporary, 'wx', 0o600);
  try {
    try { await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8'); await handle.sync(); }
    finally { await handle.close(); }
    await rename(temporary, destination);
  }
  finally { await unlink(temporary).catch(() => undefined); }
}

export async function refreshPncp(options: HttpOptions & {
  outputDirectory: string; periodStart: string; periodEnd: string;
  pageSize?: number; maxPages?: number; categoryIds?: number[]; now?: () => Date;
}): Promise<{ selectedRows: number; retainedRows: number; pages: number; publicationWatermark: string }> {
  await mkdir(options.outputDirectory, { recursive: true });
  const lockPath = join(options.outputDirectory, '.refresh.lock');
  let lock;
  try { lock = await open(lockPath, 'wx', 0o600); }
  catch { throw new Error('Collection is locked; verify the existing job before manually removing its lock.'); }
  let committed = false;
  try {
    await lock.writeFile(JSON.stringify({ processId: process.pid, startedAt: (options.now ?? (() => new Date()))().toISOString() }));
    const previous = await readPrevious(options.outputDirectory);
    const batch = await fetchPncpBatch(options);
    const current = mergePncpBatch(previous, batch);
    await mkdir(join(options.outputDirectory, 'batches'), { recursive: true });
    await atomicJson(join(options.outputDirectory, 'batches', `${batch.fetchedAt.replaceAll(':', '-')}-${randomUUID()}.json`), batch);
    await atomicJson(join(options.outputDirectory, 'current.json'), current);
    committed = true;
    // Health/log failures must not reinterpret an already committed data batch as rolled back.
    await atomicJson(join(options.outputDirectory, 'status.json'), { sourceId: 'pncp', status: 'collected-not-promoted', lastAttemptAt: batch.fetchedAt, lastSuccessAt: current.lastSuccessAt, rows: current.records.length, fixture: false, connectedToPowerBi: false }).catch(() => undefined);
    await appendFile(join(options.outputDirectory, 'runs.ndjson'), `${JSON.stringify({ sourceId: 'pncp', result: 'committed', at: batch.fetchedAt, selectedRows: batch.records.length, retainedRows: current.records.length, pages: batch.pages })}\n`, { mode: 0o600 }).catch(() => undefined);
    return { selectedRows: batch.records.length, retainedRows: current.records.length, pages: batch.pages, publicationWatermark: current.publicationWatermark };
  } catch (error) {
    if (!committed) {
      const at = (options.now ?? (() => new Date()))().toISOString();
      await atomicJson(join(options.outputDirectory, 'status.json'), { sourceId: 'pncp', status: 'last-attempt-failed', lastAttemptAt: at, lastGoodUnchanged: true, errorCode: 'COLLECTION_OR_STORAGE_FAILED', connectedToPowerBi: false }).catch(() => undefined);
      await appendFile(join(options.outputDirectory, 'runs.ndjson'), `${JSON.stringify({ sourceId: 'pncp', result: 'failed', at, errorCode: 'COLLECTION_OR_STORAGE_FAILED', lastGoodUnchanged: true })}\n`, { mode: 0o600 }).catch(() => undefined);
    }
    throw error;
  } finally { await lock.close(); await unlink(lockPath).catch(() => undefined); }
}
