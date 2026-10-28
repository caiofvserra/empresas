import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { dataset } from '../src/domain/dataset';
import { defaultFilters } from '../src/domain/types';
import { selectEnterpriseScope } from '../src/enterprise-v10/filters';
import { buildEnterpriseModel } from '../src/enterprise-v10/model';
import { buildEnterpriseEvidence } from '../src/enterprise-v10/data';
import { enterpriseIndicators } from '../src/enterprise-v10/catalog';
import { exportEnterpriseCsv } from '../src/enterprise-v10/export';

const output = resolve(process.argv[2] ?? 'data-enterprise-v10');
const period = Number(process.argv[3] ?? 12);
if (![3, 6, 12, 24].includes(period)) throw new Error('A janela deve ser 3, 6, 12 ou 24 meses.');
mkdirSync(output, { recursive: true });
const scope = selectEnterpriseScope(dataset, { ...defaultFilters, period });
const model = buildEnterpriseModel(scope), evidence = buildEnterpriseEvidence(dataset);
const json = (name: string, value: unknown) => writeFileSync(resolve(output, `${name}.json`), JSON.stringify(value, null, 2) + '\n');
const cell = (value: unknown) => { const text = value == null ? '' : Array.isArray(value) ? value.join(' | ') : String(value); return `"${(typeof value === 'string' && /^[\s]*[=+\-@\t\r]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`; };
const tables: Record<string, number> = {};
function csv(name: string, values: object[]) {
  const rows = values as Record<string, unknown>[];
  const keys = [...new Set(rows.flatMap(row => Object.keys(row)))];
  writeFileSync(resolve(output, `${name}.csv`), '\uFEFF' + [keys, ...rows.map(row => keys.map(key => row[key]))].map(row => row.map(cell).join(';')).join('\r\n') + '\r\n');
  tables[name] = rows.length;
}
json('catalogo-17-indicadores', enterpriseIndicators);
csv('indicadores', Object.values(model.metrics).map(metric => ({ id: metric.id, nome: enterpriseIndicators.find(row => row.id === metric.id)!.name, valor: metric.value, unidade: metric.unit, numerador: metric.numerator, denominador: metric.denominator, empresas_relacionadas: metric.companyIds.length, observacao: metric.note })));
csv('serie-mensal', model.monthly);
csv('territorios-gre', model.regions);
csv('territorios-municipios', model.cityRows);
csv('cnaes-nao-aditivos', model.sectors);
csv('fatos-empresariais', model.companyFacts);
csv('ponte-documental-contrato-art', evidence.contractArt);
csv('observacoes-externas-baseline', evidence.observations.filter(row => row.observedAt === model.metadata.baseline));
writeFileSync(resolve(output, 'empresas-raiz.csv'), exportEnterpriseCsv(scope, model, { financial: true, export: true }));
json('manifest', { version: '10.0.0', synthetic: true, sourceConnectionsConfigured: false, seed: dataset.seed, period, start: model.metadata.start, end: model.metadata.end, baseline: model.metadata.baseline, companies: scope.companies.length, tables, note: 'Extração demonstrativa do mesmo modelo do painel. Os agregados não substituem os fatos e relacionamentos de produção. CSV numérico usa ponto decimal, exceto empresas-raiz.csv que usa vírgula nos campos financeiros.' });
console.log(JSON.stringify({ output, indicators: tables.indicadores, companies: scope.companies.length, tables }));
