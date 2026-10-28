import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { integer, isoDate, nonempty, object } from './integrations/http.ts';
import { refreshPncp, rollingWindow } from './integrations/store.ts';
import { PNCP_ENDPOINT } from './integrations/pncp.ts';

export type RefreshConfiguration = {
  schemaVersion: 'crea-refresh-1.0'; outputDirectory: string;
  pncp: { enabled: boolean; endpoint: typeof PNCP_ENDPOINT; lookbackDays: number; lagDays: number; pageSize: number; maxPages: number; categoryIds: number[]; timeoutMs: number; retries: number; maxBytes: number };
};

export function validateConfiguration(value: unknown): RefreshConfiguration {
  const config = object(value, 'refresh configuration');
  if (config.schemaVersion !== 'crea-refresh-1.0') throw new Error('Unsupported refresh configuration.');
  const pncp = object(config.pncp, 'PNCP configuration');
  if (typeof pncp.enabled !== 'boolean' || pncp.endpoint !== PNCP_ENDPOINT) throw new Error('PNCP official endpoint and explicit enabled flag are required.');
  if (!Array.isArray(pncp.categoryIds) || !pncp.categoryIds.length) throw new Error('PNCP categories required.');
  const configuration: RefreshConfiguration = {
    schemaVersion: 'crea-refresh-1.0', outputDirectory: nonempty(config.outputDirectory, 'outputDirectory'),
    pncp: {
      enabled: pncp.enabled, endpoint: PNCP_ENDPOINT,
      lookbackDays: integer(pncp.lookbackDays, 'lookbackDays', 1), lagDays: integer(pncp.lagDays, 'lagDays'),
      pageSize: integer(pncp.pageSize, 'pageSize', 10), maxPages: integer(pncp.maxPages, 'maxPages', 1),
      categoryIds: [...new Set(pncp.categoryIds.map(id => integer(id, 'categoryId', 1)))].sort((a, b) => a - b),
      timeoutMs: integer(pncp.timeoutMs, 'timeoutMs', 1), retries: integer(pncp.retries, 'retries'), maxBytes: integer(pncp.maxBytes, 'maxBytes', 1),
    },
  };
  if (configuration.pncp.pageSize > 500 || configuration.pncp.retries > 10 || configuration.pncp.lookbackDays > 366 || configuration.pncp.lagDays > 366) throw new Error('PNCP configuration exceeds safety bounds.');
  // No credential, arbitrary URL or internal SQL connection is accepted by this collector.
  return configuration;
}

export async function runCli(args: string[]): Promise<void> {
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i], value = args[i + 1];
    if (!['--config', '--start', '--end'].includes(key) || !value || value.startsWith('--') || flags.has(key)) throw new Error('Usage: --config file.json [--start YYYY-MM-DD --end YYYY-MM-DD]');
    flags.set(key, value);
  }
  if (!flags.has('--config') || flags.has('--start') !== flags.has('--end')) throw new Error('Configuration and paired date bounds required.');
  const configuration = validateConfiguration(JSON.parse(await readFile(resolve(flags.get('--config')!), 'utf8')));
  if (!configuration.pncp.enabled) { console.log(JSON.stringify({ sourceId: 'pncp', status: 'disabled', connectedToPowerBi: false })); return; }
  const window = flags.has('--start') ? { start: isoDate(flags.get('--start'), 'start'), end: isoDate(flags.get('--end'), 'end') } : rollingWindow(new Date(), configuration.pncp.lookbackDays, configuration.pncp.lagDays);
  const result = await refreshPncp({ ...configuration.pncp, outputDirectory: resolve(configuration.outputDirectory), periodStart: window.start, periodEnd: window.end });
  console.log(JSON.stringify({ sourceId: 'pncp', status: 'collected-not-promoted', ...result, connectedToPowerBi: false }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli(process.argv.slice(2)).catch(() => { console.error('Refresh failed. The last good batch is preserved; inspect status.json/runs.ndjson and the validated configuration.'); process.exitCode = 1; });
}
