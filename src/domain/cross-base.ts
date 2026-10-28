import type { Scope } from './engine';
import { group, makeSeries } from './engine';

const distinct = (ids: string[]) => [...new Set(ids)];
const sum = <T>(rows: T[], value: (row: T) => number) => rows.reduce((result, row) => result + value(row), 0);
const change = (first: number, last: number) => first > 0 ? (last - first) / first * 100 : null;

export interface CrossBaseRow {
  id: string; label: string; companies: number; registered: number; notMatched: number; coverage: number;
  employment: number; employmentFirst: number; employmentChange: number | null;
  registrationFirst: number; registrationLast: number; registrationChange: number | null;
  contracts: number; contractCount: number; contractMissing: number;
  firstMonth: string; lastMonth: string;
}

/**
 * Cross-source observations share geography and time, never a worker-to-CNPJ link.
 * Both growth rates compare the first and last month-end snapshots in the window.
 * Company membership is distinct inside each GRE and may overlap across GREs.
 */
export function buildCrossBaseRows(scope: Scope): CrossBaseRow[] {
  const cityGre = new Map(scope.dataset.cities.map(row => [row.id, row.greId]));
  const visibleGres = new Set([
    ...scope.establishments.map(row => row.greId),
    ...scope.employment.map(row => cityGre.get(row.cityId)).filter((id): id is string => Boolean(id)),
  ]);
  const companyGroups = new Map(group(scope, 'gre').map(row => [row.id, row]));
  const registeredIds = new Set(scope.registrations.map(row => row.companyId));
  const months = [...new Set(scope.employment.map(row => row.month))].sort();
  const firstMonth = months[0] ?? '';
  const lastMonth = months.at(-1) ?? '';
  return scope.dataset.gres.filter(gre => visibleGres.has(gre.id)).map(gre => {
    const establishments = scope.establishments.filter(row => row.greId === gre.id);
    const establishmentIds = new Set(establishments.map(row => row.id));
    const companyIds = new Set(establishments.map(row => row.companyId));
    const registrations = scope.registrations.filter(row => establishmentIds.has(row.establishmentId));
    const registrationIds = new Set(registrations.map(row => row.id));
    const employment = scope.employment.filter(row => cityGre.get(row.cityId) === gre.id);
    const contracts = scope.contracts.filter(row => establishmentIds.has(row.establishmentId));
    const regionalScope: Scope = {
      ...scope,
      filters: { ...scope.filters, greIds: [gre.id] },
      companies: scope.companies.filter(row => companyIds.has(row.id)), establishments, registrations,
      companyIds, establishmentIds, employment, contracts,
      movements: scope.movements.filter(row => registrationIds.has(row.registrationId)),
      technicalLinks: scope.technicalLinks.filter(row => companyIds.has(row.companyId)),
      arts: scope.arts.filter(row => companyIds.has(row.companyId)),
      caos: scope.caos.filter(row => companyIds.has(row.companyId)),
      invoices: scope.invoices.filter(row => companyIds.has(row.companyId)),
      cases: scope.cases.filter(row => establishmentIds.has(row.establishmentId)),
      qualityEvents: scope.qualityEvents.filter(row => establishmentIds.has(row.establishmentId)),
    };
    const series = makeSeries(regionalScope);
    const first = firstMonth ? series.find(row => row.date.startsWith(firstMonth)) : undefined;
    const last = lastMonth ? series.find(row => row.date.startsWith(lastMonth)) : undefined;
    const employmentFirst = sum(employment.filter(row => row.month === firstMonth), row => row.stock);
    const employmentLast = sum(employment.filter(row => row.month === lastMonth), row => row.stock);
    const companyGroup = companyGroups.get(gre.id);
    return {
      id: gre.id, label: gre.name,
      companies: companyGroup?.companies ?? 0, registered: companyGroup?.registered ?? 0,
      notMatched: companyGroup?.notMatched ?? 0, coverage: companyGroup?.coverage ?? 0,
      employment: employmentLast, employmentFirst,
      employmentChange: firstMonth && lastMonth ? change(employmentFirst, employmentLast) : null,
      registrationFirst: first?.base ?? 0, registrationLast: last?.base ?? 0,
      registrationChange: first && last ? change(first.base, last.base) : null,
      contracts: sum(contracts, row => row.value), contractCount: contracts.length,
      contractMissing: distinct(contracts.filter(row => !registeredIds.has(row.companyId)).map(row => row.companyId)).length,
      firstMonth, lastMonth,
    };
  }).sort((a, b) => b.companies - a.companies || a.label.localeCompare(b.label, 'pt-BR'));
}

