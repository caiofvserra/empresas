import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { requestJson, HttpFailure } from '../scripts/integrations/http.ts';
import { fetchPncpBatch, PNCP_ENDPOINT } from '../scripts/integrations/pncp.ts';
import { mergeCoverage, mergePncpBatch, refreshPncp, rollingWindow } from '../scripts/integrations/store.ts';
import { validateConfiguration } from '../scripts/refresh-sources.ts';
import { automatedSourceCatalog, excludedSnapshotSources } from '../src/integrations/catalog.ts';

const start = '2026-10-01', end = '2026-10-02';
const clock = () => new Date('2026-10-03T09:00:00Z');
function contract(id: number, overrides: Record<string, unknown> = {}) {
  return {
    numeroControlePNCP: `id-${id}`, unidadeOrgao: { ufSigla: 'SP', codigoIbge: '3550308', municipioNome: 'São Paulo' },
    categoriaProcesso: { id: 8, nome: 'Serviços de engenharia' }, dataPublicacaoPncp: '2026-10-01T10:15:00',
    dataAtualizacao: '2026-10-02T11:00:00', tipoPessoa: 'PJ', niFornecedor: '12345678000199',
    nomeRazaoSocialFornecedor: 'Fornecedor de teste', objetoContrato: 'Manutenção de instalações elétricas',
    valorGlobal: 1400.5, valorInicial: 1000, ...overrides,
  };
}
function page(rows: unknown[], total: number, number = 1, size = 10) {
  const pages = Math.ceil(total / size);
  return { data: rows, totalRegistros: total, totalPaginas: pages, numeroPagina: number, paginasRestantes: Math.max(0, pages - number) };
}
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
function fetchPages(pages: unknown[]): typeof fetch {
  let index = 0;
  return (async (url: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(new URL(String(url)).origin, 'https://pncp.gov.br');
    assert.equal(init?.redirect, 'error');
    const payload = pages[index++];
    assert.notEqual(payload, undefined, 'unexpected extra fetch');
    return json(payload);
  }) as typeof fetch;
}
const baseOptions = { periodStart: start, periodEnd: end, pageSize: 10, now: clock, retries: 0 };
async function batch(rows = [contract(1)]) {
  return fetchPncpBatch({ ...baseOptions, fetch: fetchPages([page(rows, rows.length)]) });
}
async function temporary<T>(run: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), 'crea-integrations-'));
  try { return await run(directory); } finally { await rm(directory, { recursive: true, force: true }); }
}

test('official PNCP pages reconcile all Brazil rows before selecting SP and categories', async () => {
  const rows = Array.from({ length: 15 }, (_, i) => contract(i + 1));
  rows[2] = contract(3, { unidadeOrgao: { ufSigla: 'RJ', codigoIbge: '3304557', municipioNome: 'Rio de Janeiro' } });
  rows[3] = contract(4, { categoriaProcesso: { id: 2, nome: 'Compras' } });
  const result = await fetchPncpBatch({ ...baseOptions, fetch: fetchPages([page(rows.slice(0, 10), 15), page(rows.slice(10), 15, 2)]) });
  assert.equal(result.pages, 2); assert.equal(result.advertisedBrazilRows, 15); assert.equal(result.downloadedBrazilRows, 15);
  assert.equal(result.records.length, 13); assert(result.records.every(row => row.uf === 'SP' && row.categoryId === 8));
  assert.equal(result.records[0].contractValue, 1400.5); assert.equal(result.records[0].contractValueSource, 'valorGlobal');
  assert.equal(result.records[0].publishedAt, '2026-10-01T10:15:00', 'do not invent a timezone');
  assert.equal(result.fixture, false); assert.equal(result.status, 'observed');
});

test('HTTP retry budget, redirects and non-retryable errors prevent credential-bearing body leakage', async () => {
  let calls = 0, delays: number[] = [];
  const fetcher = (async (_: RequestInfo | URL, init?: RequestInit) => {
    calls++; assert.equal(init?.redirect, 'error');
    return calls < 3 ? new Response('SECRET_SERVER_BODY', { status: calls === 1 ? 429 : 503 }) : json({ ok: true });
  }) as typeof fetch;
  assert.deepEqual(await requestJson(new URL(PNCP_ENDPOINT), { fetch: fetcher, retries: 2, sleep: async ms => { delays.push(ms); } }), { ok: true });
  assert.equal(calls, 3); assert.deepEqual(delays, [250, 500]);
  await assert.rejects(requestJson(new URL(PNCP_ENDPOINT), { fetch: (async () => new Response('SECRET_SERVER_BODY', { status: 401 })) as typeof fetch }), error => error instanceof HttpFailure && error.message === 'Source returned HTTP 401.');
  await assert.rejects(requestJson(new URL('https://user:password@example.org')), /Credentials must not/);
  await assert.rejects(requestJson(new URL('http://example.org')), /HTTPS is required/);
});

test('streaming response byte limit and malformed JSON fail without retrying', async () => {
  let calls = 0;
  const fetcher = (async () => { calls++; return new Response('123456789'); }) as typeof fetch;
  await assert.rejects(requestJson(new URL(PNCP_ENDPOINT), { fetch: fetcher, maxBytes: 4 }), error => error instanceof HttpFailure && error.status === 413);
  assert.equal(calls, 1);
  await assert.rejects(requestJson(new URL(PNCP_ENDPOINT), { fetch: (async () => new Response('{bad')) as typeof fetch }), error => error instanceof HttpFailure && error.status === 422);
});

test('PNCP handles a real HTTP 204 empty window but rejects JSON null', async () => {
  const result = await fetchPncpBatch({ ...baseOptions, fetch: (async () => new Response(null, { status: 204 })) as typeof fetch });
  assert.equal(result.advertisedBrazilRows, 0); assert.deepEqual(result.records, []);
  await assert.rejects(fetchPncpBatch({ ...baseOptions, fetch: fetchPages([null]) }), /object required/);
});

test('incomplete pages, changed totals and duplicate keys do not pass coverage validation', async () => {
  const rows = Array.from({ length: 15 }, (_, i) => contract(i + 1));
  await assert.rejects(fetchPncpBatch({ ...baseOptions, fetch: fetchPages([page(rows.slice(0, 9), 15)]) }), /Incomplete PNCP page/);
  await assert.rejects(fetchPncpBatch({ ...baseOptions, fetch: fetchPages([page(rows.slice(0, 10), 15), page(rows.slice(10), 16, 2)]) }), /pagination changed/);
  const duplicates = [...rows.slice(10, 14), rows[0]];
  await assert.rejects(fetchPncpBatch({ ...baseOptions, fetch: fetchPages([page(rows.slice(0, 10), 15), page(duplicates, 15, 2)]) }), /duplicate keys invalidate/);
  const conflict = [...rows.slice(10, 14), contract(1, { valorGlobal: 9000 })];
  await assert.rejects(fetchPncpBatch({ ...baseOptions, fetch: fetchPages([page(rows.slice(0, 10), 15), page(conflict, 15, 2)]) }), /Conflicting PNCP duplicate/);
});

test('SP IBGE identifiers, valid calendar bounds and contract values are required', async () => {
  await assert.rejects(batch([contract(1, { unidadeOrgao: { ufSigla: 'SP', codigoIbge: '3304557', municipioNome: 'Erro' } })]), /SP IBGE identifier/);
  await assert.rejects(batch([contract(1, { valorGlobal: -1 })]), /contract value/);
  await assert.rejects(batch([contract(1, { dataPublicacaoPncp: '2026-09-30T10:00:00' })]), /outside requested/);
  await assert.rejects(fetchPncpBatch({ ...baseOptions, periodStart: '2026-02-30', fetch: fetchPages([]) }), /ISO calendar/);
  await assert.rejects(fetchPncpBatch({ ...baseOptions, periodStart: end, periodEnd: start, fetch: fetchPages([]) }), /must not exceed/);
  await assert.rejects(fetchPncpBatch({ ...baseOptions, pageSize: 2, fetch: fetchPages([]) }), /integer required/);
  await assert.rejects(fetchPncpBatch({ ...baseOptions, maxPages: 1, fetch: fetchPages([page(Array.from({ length: 10 }, (_, i) => contract(i)), 20)]) }), /safety limit/);
  const missing = await batch([contract(1, { valorGlobal: null, valorInicial: null })]);
  assert.equal(missing.records[0].contractValue, null); assert.equal(missing.records[0].contractValueSource, null);
});

test('rolling dates and coverage intervals are explicit, including gaps', () => {
  assert.deepEqual(rollingWindow(new Date('2026-10-12T01:00:00-03:00')), { start: '2026-10-05', end: '2026-10-11' });
  assert.deepEqual(mergeCoverage([{ start: '2026-10-03', end: '2026-10-04' }, { start, end }, { start: '2026-10-07', end: '2026-10-07' }]), [{ start, end: '2026-10-04' }, { start: '2026-10-07', end: '2026-10-07' }]);
});

test('overlapping recollection deduplicates IDs, reflects deletions and retains other windows', async () => {
  const original = mergePncpBatch(null, await batch([contract(1), contract(2)]));
  const later = await fetchPncpBatch({ ...baseOptions, periodStart: '2026-10-03', periodEnd: '2026-10-03', fetch: fetchPages([page([contract(3, { dataPublicacaoPncp: '2026-10-03T12:00:00' })], 1)]) });
  const accumulated = mergePncpBatch(original, later);
  const corrected = mergePncpBatch(accumulated, await batch([contract(1, { valorGlobal: 1800 })]));
  assert.deepEqual(corrected.records.map(row => row.id), ['id-1', 'id-3']);
  assert.equal(corrected.records[0].contractValue, 1800); assert.equal(corrected.publicationWatermark, '2026-10-03');
  assert.deepEqual(corrected.coverage, [{ start, end: '2026-10-03' }]);
  assert.equal(corrected.status, 'collected-not-promoted');
});

test('atomic checkpoint preserves the last good batch and watermark when a later page fails', async () => temporary(async directory => {
  await refreshPncp({ ...baseOptions, outputDirectory: directory, fetch: fetchPages([page([contract(1)], 1)]) });
  const before = await readFile(join(directory, 'current.json'), 'utf8');
  const first = page(Array.from({ length: 10 }, (_, i) => contract(i + 1)), 15);
  let calls = 0;
  const fetcher = (async () => { calls++; if (calls === 1) return json(first); throw new Error('SECRET_TOKEN_FROM_NETWORK'); }) as typeof fetch;
  await assert.rejects(refreshPncp({ ...baseOptions, outputDirectory: directory, fetch: fetcher }), /no batch was published/);
  assert.equal(await readFile(join(directory, 'current.json'), 'utf8'), before);
  const status = JSON.parse(await readFile(join(directory, 'status.json'), 'utf8'));
  assert.equal(status.status, 'last-attempt-failed'); assert.equal(status.connectedToPowerBi, false);
  assert(!String(await readFile(join(directory, 'runs.ndjson'), 'utf8')).includes('SECRET'));
  await assert.rejects(readFile(join(directory, '.refresh.lock')), error => (error as NodeJS.ErrnoException).code === 'ENOENT');
}));

test('concurrent lock and corrupted prior store refuse mutation instead of silently resetting', async () => temporary(async directory => {
  await writeFile(join(directory, '.refresh.lock'), 'other-job');
  await assert.rejects(refreshPncp({ ...baseOptions, outputDirectory: directory, fetch: fetchPages([]) }), /locked/);
  assert.equal(await readFile(join(directory, '.refresh.lock'), 'utf8'), 'other-job');
  await rm(join(directory, '.refresh.lock'));
  await writeFile(join(directory, 'current.json'), '{corrupted');
  await assert.rejects(refreshPncp({ ...baseOptions, outputDirectory: directory, fetch: fetchPages([]) }));
  assert.equal(await readFile(join(directory, 'current.json'), 'utf8'), '{corrupted');
}));

test('config only accepts the official PNCP origin and explicit bounded settings', async () => {
  const sample = JSON.parse(await readFile(new URL('../integrations/refresh-sources.example.json', import.meta.url), 'utf8'));
  assert.equal(validateConfiguration(sample).pncp.enabled, false);
  assert.throws(() => validateConfiguration({ ...sample, pncp: { ...sample.pncp, endpoint: 'https://example.org/secret' } }), /official endpoint/);
  assert.throws(() => validateConfiguration({ ...sample, pncp: { ...sample.pncp, pageSize: 501 } }), /safety bounds/);
  assert.throws(() => validateConfiguration({ ...sample, pncp: { ...sample.pncp, retries: -1 } }), /integer required/);
});

test('catalog and direct connector templates do not claim a configured source or mandatory internal API', async () => {
  assert(automatedSourceCatalog.some(row => row.access === 'sql-server-gateway'));
  assert(automatedSourceCatalog.some(row => row.access === 'db2-gateway'));
  assert(automatedSourceCatalog.every(row => row.fixture === false && row.status !== ('connected' as string)));
  assert(!JSON.stringify(automatedSourceCatalog).includes('CREA_BI_API_URL'));
  assert(excludedSnapshotSources.some(row => row.artifact === 'user-engineer-statistics.json'));
  for (const file of ['SQL_SERVER_EMPRESA.pq', 'DB2_EMPRESA.pq', 'SQL_SERVER_MOVIMENTO_INCREMENTAL.pq', 'DB2_MOVIMENTO_INCREMENTAL.pq', 'PNCP_BATCH_FILE.pq']) {
    const text = await readFile(new URL(`../integrations/power-query/${file}`, import.meta.url), 'utf8');
    assert(!/\b(password|authorization|bearer)\s*[=:]/i.test(text));
    if (file.includes('INCREMENTAL')) { assert(text.includes('RangeStart')); assert(text.includes('RangeEnd')); assert(text.includes('event_at_utc') || text.includes('EVENT_AT_UTC')); }
  }
  for (const file of ['sql-server-contract.sql', 'db2-contract.sql']) {
    const sql = await readFile(new URL(`../integrations/sql/${file}`, import.meta.url), 'utf8');
    const statements = sql.split('\n').filter(line => !line.trim().startsWith('--')).join('\n');
    assert(!/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC)\b/i.test(statements));
  }
});
