import type { Scope } from '../domain/engine';
import type { EnterpriseModel } from './types';

export interface EnterpriseRecord {
  id: string; rootCnpj: string; name: string; tradeName: string; size: string;
  cnpjs: string[]; cities: string[]; cnaes: string[];
  active: boolean | null; withRt: boolean | null; artCount: number | null;
  registeredDays: number | null; coveredDays: number | null;
  receipts: number | null; overdue: number | null; evidenceIds: string[];
}

const unique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b, 'pt-BR'));
export const normalizedCnpj = (value: string) => value.toUpperCase().replace(/[.\/\-\s]/g, '');
export const normalizedText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

/** One record per company-root. Establishment totals are deliberately not summed here. */
export function enterpriseRecords(scope: Scope, model: EnterpriseModel): EnterpriseRecord[] {
  const cities = new Map(scope.dataset.cities.map(row => [row.id, row.name]));
  const facts = new Map(model.companyFacts.map(row => [row.companyId, row]));
  const establishments = new Map<string, Scope['establishments']>();
  for (const establishment of scope.establishments) {
    const rows = establishments.get(establishment.companyId) ?? [];
    rows.push(establishment); establishments.set(establishment.companyId, rows);
  }
  return scope.companies.map(company => {
    const rows = establishments.get(company.id) ?? [], fact = facts.get(company.id);
    return {
      id: company.id, rootCnpj: company.rootCnpj, name: company.name, tradeName: company.tradeName, size: company.size,
      cnpjs: unique(rows.map(row => row.cnpj)), cities: unique(rows.map(row => cities.get(row.cityId) ?? row.cityId)),
      cnaes: unique(rows.flatMap(row => [row.cnaeMain, ...row.cnaeSecondary]).filter(Boolean)),
      active: fact?.active ?? null, withRt: fact?.withRt ?? null, artCount: fact?.artCount ?? null,
      registeredDays: fact?.registeredDays ?? null, coveredDays: fact?.coveredDays ?? null,
      receipts: fact?.receipts ?? null, overdue: fact?.overdue ?? null, evidenceIds: fact?.evidenceIds ?? [],
    };
  }).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR') || a.id.localeCompare(b.id));
}

const moneyCell = (value: number | null) => value === null ? '' : value.toFixed(2).replace('.', ',');
const yesNo = (value: boolean | null) => value === null ? '' : value ? 'Sim' : 'Não';
const safeCell = (value: string | number) => {
  const text = String(value);
  const safe = /^[\s\uFEFF]*[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** Export is authorization-gated before reading any rows; restricted columns do not exist in the output. */
export function exportEnterpriseCsv(scope: Scope, model: EnterpriseModel, permission: { financial: boolean; export: boolean }, companyIds?: string[]): string {
  if (!permission.export) throw new Error('O perfil de consulta não permite exportar.');
  const rows = enterpriseRecords(scope, model);
  const index = new Map(rows.map(row => [row.id, row]));
  const selected = companyIds === undefined ? rows : [...new Set(companyIds)].flatMap(id => index.has(id) ? [index.get(id)!] : []);
  const header = ['empresa_id', 'raiz_cnpj', 'razao_social', 'nome_fantasia', 'porte', 'cnpjs_no_recorte', 'municipios_no_recorte', 'cnaes_no_recorte', 'registro_vigente_no_corte', 'rt_vigente_identificado', 'arts_no_periodo', 'dias_registrada_na_janela', 'dias_cobertos_por_rt', 'inicio_janela', 'fim_janela', ...(permission.financial ? ['recebido_pj_no_periodo_brl', 'vencido_no_corte_brl'] : [])];
  const contents = selected.map(row => [row.id, row.rootCnpj, row.name, row.tradeName, row.size,
    row.cnpjs.join(' | '), row.cities.join(' | '), row.cnaes.join(' | '), yesNo(row.active), yesNo(row.withRt),
    row.artCount ?? '', row.registeredDays ?? '', row.coveredDays ?? '', model.metadata.start, model.metadata.end,
    ...(permission.financial ? [moneyCell(row.receipts), moneyCell(row.overdue)] : []),
  ]);
  return '\uFEFF' + [header, ...contents].map(row => row.map(safeCell).join(';')).join('\r\n') + '\r\n';
}
