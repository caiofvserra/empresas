import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset';
import { defaultFilters } from '../src/domain/types';
import { selectEnterpriseScope } from '../src/enterprise-v10/filters';

test('enterprise search accepts a formatted alphanumeric CNPJ and keeps the company grain', () => {
  const first = dataset.establishments[0];
  const source = { ...dataset, establishments: dataset.establishments.map((row, index) => index === 0 ? { ...row, cnpj: '12ABC34501DE35' } : row) };
  const scope = selectEnterpriseScope(source, { ...defaultFilters, search: '12.ABC.345/01DE-35' });
  assert.deepEqual([...scope.companyIds], [first.companyId]);
  assert(scope.establishments.some(row => row.cnpj === '12ABC34501DE35'));
  assert.equal(scope.employmentScopeLimited, true);
});

test('enterprise name search respects the selected company cohort and never invents a company match', () => {
  const first = dataset.companies[0], second = dataset.companies[1];
  assert.deepEqual([...selectEnterpriseScope(dataset, { ...defaultFilters, search: first.name }, [first.id]).companyIds], [first.id]);
  assert.equal(selectEnterpriseScope(dataset, { ...defaultFilters, search: first.name }, [second.id]).companyIds.size, 0);
  assert.equal(selectEnterpriseScope(dataset, { ...defaultFilters, search: 'CNPJ inexistente 00000000000000000000' }).companyIds.size, 0);
});

test('corporate selection and geography retain aggregate employment independently of a nominal company search', () => {
  const initial = selectEnterpriseScope(dataset, { ...defaultFilters, greIds: ['GRE2'] });
  const company = initial.companies[0];
  const searched = selectEnterpriseScope(dataset, { ...defaultFilters, greIds: ['GRE2'], search: company.name });
  assert.deepEqual(searched.employment, initial.employment);
  assert(searched.establishments.every(row => row.greId === 'GRE2'));
  assert.equal(searched.employmentScopeLimited, true);
  assert.equal(initial.employmentScopeLimited, false);
});
