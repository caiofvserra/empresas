import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset';
import { selectScope } from '../src/domain/engine';
import { defaultFilters } from '../src/domain/types';
import type { Dataset } from '../src/domain/types';
import type { EnterpriseModel } from '../src/enterprise-v10/types';
import { enterpriseRecords, exportEnterpriseCsv, normalizedCnpj } from '../src/enterprise-v10/export';

const first = { ...dataset.companies[0], id: 'TEST-A', name: '=HYPERLINK("https://example.invalid"); A', rootCnpj: '00AB1234' };
const second = { ...dataset.companies[1], id: 'TEST-B', name: 'B empresa' };
const originals = dataset.establishments.slice(0, 3);
const small = { ...dataset, companies: [first, second], establishments: [
  { ...originals[0], id: 'EST-A1', companyId: first.id, cnpj: '00AB1234000199' },
  { ...originals[1], id: 'EST-A2', companyId: first.id, cnpj: '00AB1234000299', branch: 'Filial' },
  { ...originals[2], id: 'EST-B1', companyId: second.id },
], registrations: [{ ...dataset.registrations[0], id: 'REG-A', companyId: first.id, establishmentId: 'EST-A1', status: 'Ativo' }],
} as Dataset;
const scope = selectScope(small, { ...defaultFilters });
const model = { companyFacts: [
  { companyId: first.id, active: false, withRt: true, artCount: 3, registeredDays: 100, coveredDays: 80, receipts: 123.45, overdue: 67.89, evidenceIds: ['EV-A'] },
  { companyId: second.id, active: true, withRt: false, artCount: 0, registeredDays: 22, coveredDays: 0, receipts: 987.65, overdue: 0, evidenceIds: [] },
], metadata: { start: '2025-10-01', end: '2026-09-30' } } as unknown as EnterpriseModel;
const parse = (csv: string) => csv.replace(/^\uFEFF/, '').trimEnd().split('\r\n').map(row => [...row.matchAll(/"((?:[^"]|"")*)"(?:;|$)/g)].map(match => match[1].replace(/""/g, '"')));

test('enterprise CSV and table preserve one root row for a multi-establishment company, including an alphanumeric CNPJ', () => {
  const rows = enterpriseRecords(scope, model);
  assert.equal(rows.length, 2);
  assert.equal(rows.find(row => row.id === first.id)?.cnpjs.length, 2);
  const output = parse(exportEnterpriseCsv(scope, model, { financial: true, export: true }));
  assert.equal(output.length, 3);
  assert.equal(output.filter(row => row[0] === first.id).length, 1);
  assert(output.find(row => row[0] === first.id)![5].includes('00AB1234000199 | 00AB1234000299'));
  assert.equal(normalizedCnpj('00.ab1.234/0001-99'), '00AB1234000199');
});

test('enterprise current status, company-days and cash values come from the analytical fact, not the registration status column', () => {
  const output = parse(exportEnterpriseCsv(scope, model, { financial: true, export: true }));
  const header = output[0], row = output.find(value => value[0] === first.id)!;
  assert.equal(row[header.indexOf('registro_vigente_no_corte')], 'Não');
  assert.equal(row[header.indexOf('rt_vigente_identificado')], 'Sim');
  assert.equal(row[header.indexOf('dias_registrada_na_janela')], '100');
  assert.equal(row[header.indexOf('recebido_pj_no_periodo_brl')], '123,45');
  assert.equal(row[header.indexOf('vencido_no_corte_brl')], '67,89');
});

test('financial restriction removes monetary fields entirely rather than blanking or disguising their values', () => {
  const output = parse(exportEnterpriseCsv(scope, model, { financial: false, export: true }));
  assert(!output[0].some(value => /brl|recebido|vencido/.test(value)));
  assert(output.every(row => row.length === output[0].length));
  assert(!output.flat().includes('123,45'));
  assert(!output.flat().includes('67,89'));
});

test('export permission is checked before inspecting the source or model', () => {
  assert.throws(() => exportEnterpriseCsv(null as unknown as typeof scope, null as unknown as EnterpriseModel, { financial: false, export: false }), /não permite exportar/);
});

test('CSV quotes embedded separators and neutralizes spreadsheet formulas without changing source names', () => {
  const output = parse(exportEnterpriseCsv(scope, model, { financial: false, export: true }));
  const row = output.find(value => value[0] === first.id)!;
  assert.equal(row[2], `'${first.name}`);
  assert.equal(scope.companies.find(company => company.id === first.id)?.name, first.name);
  assert.equal(row.length, output[0].length);
});

test('explicit export subsets preserve visible ordering, exclude out-of-scope identities and never turn an empty selection into all rows', () => {
  const output = parse(exportEnterpriseCsv(scope, model, { financial: false, export: true }, [second.id, first.id, second.id, 'OTHER']));
  assert.deepEqual(output.slice(1).map(row => row[0]), [second.id, first.id]);
  assert.equal(parse(exportEnterpriseCsv(scope, model, { financial: true, export: true }, [])).length, 1);
});
