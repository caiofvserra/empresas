import { selectScope } from '../domain/engine';
import type { Dataset, Filters } from '../domain/types';

const text = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
const identifier = (value: string) => value.toUpperCase().replace(/[.\/\-\s]/g, '');

/** Search is a company filter, never a join to aggregated employment. */
export function selectEnterpriseScope(dataset: Dataset, filters: Filters, selectedIds?: string[]) {
  if (!filters.search.trim()) return selectScope(dataset, filters, selectedIds);
  const clean = { ...filters, search: '' };
  const initial = selectScope(dataset, clean, selectedIds);
  const query = text(filters.search.trim());
  const cnpj = identifier(filters.search);
  const ids = new Set(initial.companies.filter(company => text(`${company.name} ${company.tradeName}`).includes(query)
    || cnpj.length >= 3 && identifier(company.rootCnpj).includes(cnpj)).map(company => company.id));
  if (cnpj.length >= 3) for (const establishment of initial.establishments) {
    if (identifier(establishment.cnpj).includes(cnpj)) ids.add(establishment.companyId);
  }
  return { ...selectScope(dataset, clean, [...ids]), filters, employmentScopeLimited: true };
}
