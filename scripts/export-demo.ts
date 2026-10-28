import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { dataset } from '../src/domain/dataset';
import { indicators } from '../src/domain/indicators';
import { reportIndicators } from '../src/domain/report-indicators';
import { buildProfessionalModel } from '../src/domain/professionals';

// Explicit local export of fictitious data, with bridges instead of JSON in cells.
const output = resolve(process.argv[2] ?? 'data-demo');
mkdirSync(output, { recursive: true });
type Row = Record<string, unknown>;
const csvCell = (value: unknown) => {
  const raw = value == null ? '' : String(value);
  const safe = /^[\s]*[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
};
const manifest: Record<string, number> = {};
function save(name: string, values: unknown[], omit: string[] = []) {
  const rows = values as Row[];
  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))].filter(column => !omit.includes(column));
  const csv = [columns.map(csvCell).join(';'), ...rows.map(row => columns.map(column => csvCell(row[column])).join(';'))].join('\r\n');
  writeFileSync(resolve(output, `${name}.csv`), '\uFEFF' + csv, 'utf8');
  manifest[name] = rows.length;
}
save('empresas', dataset.companies);
save('estabelecimentos', dataset.establishments, ['cnaeSecondary']);
save('estabelecimento_cnae', dataset.establishments.flatMap(row => [
  { establishmentId: row.id, cnae: row.cnaeMain, role: 'Principal' },
  ...row.cnaeSecondary.map(code => ({ establishmentId: row.id, cnae: code, role: 'Secundário' })),
]));
save('cnaes', dataset.cnaes.map(({ fields, ...row }) => ({ ...row, originalCode: fields.SUBCLASSE, originalLabel: fields['DESCRIÇÃO'], originalClassification: fields['OBRIGAÇÃO DE REGISTRO'] })));
save('municipios', dataset.cities);
save('gres', dataset.gres);
const professionalModel = buildProfessionalModel(dataset);
save('profissionais', professionalModel.profiles);
save('formacao_profissional', professionalModel.education);
save('participacoes_societarias', professionalModel.qsa);
save('autoria_art', professionalModel.artAttributions);
writeFileSync(resolve(output, 'profissionais-metadados.json'), JSON.stringify(professionalModel.metadata, null, 2));
save('vinculos_tecnicos', dataset.technicalLinks);
save('registros', dataset.registrations);
save('movimentacoes', dataset.movements);
save('arts', dataset.arts);
save('caos', dataset.caos, ['artIds']);
save('cao_art', dataset.caos.flatMap(row => row.artIds.map(artId => ({ caoId: row.id, artId }))));
save('obrigacoes', dataset.invoices);
save('pagamentos', dataset.invoices.filter(row => row.paymentDate && row.paidAmount > 0).map(row => ({ invoiceId: row.id, companyId: row.companyId, registrationId: row.registrationId, date: row.paymentDate, amount: row.paidAmount, recovered: row.recovered })));
save('casos', dataset.cases, ['history', 'notice']);
save('etapas_casos', dataset.cases.flatMap(row => row.history.map((event, index) => ({ id: `${row.id}-${index + 1}`, caseId: row.id, companyId: row.companyId, ...event }))));
save('eventos_processuais', dataset.cases.filter(row => row.notice).map(row => ({ caseId: row.id, companyId: row.companyId, ...row.notice })));
save('contratos', dataset.contracts);
save('orgaos_contratantes', dataset.buyers);
save('emprego_agregado', dataset.employment.map(row => ({ ...row, month: `${row.month}-01` })));
save('cbos', dataset.cbos);
save('eventos_qualidade', dataset.qualityEvents);
save('origem_publica_simulada', dataset.publicRows);
save('indicadores', indicators.map(indicator => reportIndicators.find(row => row.id === indicator.id) ?? indicator));
writeFileSync(resolve(output, 'dicionario-relatorio-v8.json'), JSON.stringify(reportIndicators, null, 2));
const firstDate = [...dataset.establishments.map(row => row.openedAt), ...dataset.registrations.map(row => row.requestedAt), ...professionalModel.profiles.map(row => row.registeredAt), ...professionalModel.education.map(row => `${row.completedYear}-01-01`)].sort()[0];
const lastDate = [dataset.snapshotDate, ...dataset.invoices.map(row => row.dueDate)].sort().at(-1)!;
save('calendario', Array.from({ length: (Date.parse(lastDate) - Date.parse(firstDate)) / 86400000 + 1 }, (_, index) => {
  const date = new Date(Date.parse(firstDate) + index * 86400000);
  return { date: date.toISOString().slice(0, 10), year: date.getUTCFullYear(), quarter: Math.floor(date.getUTCMonth() / 3) + 1, month: date.getUTCMonth() + 1, yearMonth: date.toISOString().slice(0, 7) };
}));
writeFileSync(resolve(output, 'manifest.json'), JSON.stringify({ synthetic: true, seed: dataset.seed, snapshotDate: dataset.snapshotDate, updatedAt: dataset.updatedAt, applicationVersion: '6.0.0', ruleVersion: '1.0.0', delimiter: ';', encoding: 'UTF-8 BOM', tables: manifest }, null, 2));
console.log(JSON.stringify({ output, tables: Object.keys(manifest).length, rows: Object.values(manifest).reduce((sum, count) => sum + count, 0), synthetic: true }));
