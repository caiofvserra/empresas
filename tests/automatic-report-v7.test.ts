import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { dataset } from '../src/domain/dataset';
import { selectScope, summarize } from '../src/domain/engine';
import { selectProfessionalScope } from '../src/domain/professionals';
import { defaultFilters } from '../src/domain/types';
import ContractsReport, { buildContractAnalysis } from '../src/report/ContractsReport';
import MarketReport, { buildEmploymentOccupationRows } from '../src/report/MarketReport';
import ProfessionalsReport, { buildRegisteredFormation, buildRegisteredFormationLag } from '../src/report/ProfessionalsReport';

const scope = selectScope(dataset, defaultFilters);
const professionals = selectProfessionalScope(scope);
const unique = (values: string[]) => [...new Set(values)].sort();
const sum = <T,>(rows: T[], get: (row: T) => number) => rows.reduce((total, row) => total + get(row), 0);

test('formation cohorts count declared graduates once and keep degree count separate from people', () => {
  const graduation = professionals.model.education.filter(row => row.level === 'Graduação');
  const rows = buildRegisteredFormation(professionals);
  assert(rows.length <= 8 && rows.length > 0);
  for (const row of rows) {
    const expected = graduation.filter(degree => degree.completedYear === row.year);
    assert.deepEqual(unique(row.professionalIds), unique(expected.map(degree => degree.professionalId)));
    assert.equal(row.degrees, expected.length);
    assert.equal(row.graduates, row.professionalIds.length);
    assert.equal(row.withRt, row.professionalIds.filter(id => professionals.activeLinks.some(link => link.professionalId === id)).length);
    assert.equal(row.rtRate, row.graduates ? row.withRt / row.graduates * 100 : null);
  }
  const latest = rows.at(-1)!;
  const original = graduation.find(row => row.completedYear === latest.year)!;
  const augmented = { ...professionals, model: { ...professionals.model,
    education: [...professionals.model.education, { ...original, id: 'SECOND-DEGREE-SAME-PERSON' }] } };
  const augmentedRow = buildRegisteredFormation(augmented).at(-1)!;
  assert.equal(augmentedRow.graduates, latest.graduates);
  assert.equal(augmentedRow.degrees, latest.degrees + 1);
});

test('diploma-to-registration lag partitions eligible people and preserves company/person cross-selections', () => {
  for (const selected of [professionals, selectProfessionalScope(scope, { professionalIds: professionals.profiles.slice(0, 7).map(row => row.id) }),
    selectProfessionalScope(selectScope(dataset, { ...defaultFilters, cityIds: [dataset.cities[0].id] }))]) {
    const rows = buildRegisteredFormationLag(selected);
    const expected = selected.profiles.filter(profile => selected.model.education.some(row => row.professionalId === profile.id && row.level === 'Graduação'));
    const ids = rows.flatMap(row => row.professionalIds);
    assert.deepEqual(unique(ids), unique(expected.map(row => row.id)));
    assert.equal(ids.length, new Set(ids).size);
    assert.equal(sum(rows, row => row.professionals), expected.length);
    for (const row of rows) assert.equal(row.rtRate, row.professionals ? row.withRt / row.professionals * 100 : null);
    const selectedIds = new Set(selected.profiles.map(row => row.id));
    buildRegisteredFormation(selected).forEach(row => row.professionalIds.forEach(id => assert(selectedIds.has(id))));
  }
  const absent = { ...professionals, model: { ...professionals.model, education: [] } };
  assert.deepEqual(buildRegisteredFormation(absent), []);
  assert(buildRegisteredFormationLag(absent).every(row => row.professionals === 0 && row.rtRate === null));
});

test('CBO stock reconciles only the final snapshot while job flows reconcile the whole period', () => {
  for (const selected of [scope, selectScope(dataset, { ...defaultFilters, period: 3 }),
    selectScope(dataset, { ...defaultFilters, cityIds: [dataset.cities[0].id], cboCodes: [dataset.cbos[0].code] })]) {
    const rows = buildEmploymentOccupationRows(selected);
    const metrics = summarize(selected);
    assert.equal(sum(rows, row => row.stock), metrics.employees);
    assert.equal(sum(rows, row => row.admissions), metrics.admissions);
    assert.equal(sum(rows, row => row.dismissals), metrics.dismissals);
    assert.equal(sum(rows, row => row.balance), metrics.employmentBalance);
    assert(rows.every(row => row.balance === row.admissions - row.dismissals));
  }
  assert.deepEqual(buildEmploymentOccupationRows(selectScope(dataset, defaultFilters, [dataset.companies[0].id])), buildEmploymentOccupationRows(scope));
  assert.deepEqual(buildEmploymentOccupationRows(selectScope(dataset, { ...defaultFilters, sizes: ['Grande empresa'] })), buildEmploymentOccupationRows(scope));
  assert.deepEqual(buildEmploymentOccupationRows({ ...scope, employment: [] }), []);
});

test('contract monthly series, categories, suppliers, municipality cells and principal CNAEs share one universe', () => {
  for (const selected of [scope, selectScope(dataset, { ...defaultFilters, period: 3, cityIds: [dataset.cities[0].id] }),
    selectScope(dataset, defaultFilters, [scope.contracts[0].companyId])]) {
    const analysis = buildContractAnalysis(selected);
    const value = sum(selected.contracts, row => row.value);
    assert.equal(analysis.totalValue, value);
    for (const rows of [analysis.monthly, analysis.categories, analysis.suppliers, analysis.municipalities, analysis.cnaes])
      assert.equal(sum(rows, row => row.value), value);
    assert.equal(sum(analysis.categories, row => row.count), selected.contracts.length);
    assert.equal(sum(analysis.monthly, row => row.count), selected.contracts.length);
    assert.equal(sum(analysis.cells, row => row.contractIds.length), selected.contracts.length);
    assert.deepEqual(unique(analysis.cells.flatMap(row => row.contractIds)), unique(selected.contracts.map(row => row.id)));
    assert.equal(sum(analysis.cells, row => row.amount), value);
    assert.equal(sum(analysis.cnaes, row => row.supplierCount), analysis.suppliers.length);
    for (const region of analysis.regions) assert([region.registered, region.rt, region.art].every(count => count <= region.suppliers));
    let cumulative = 0;
    for (const row of analysis.pareto) { cumulative += row.value; assert.equal(row.cumulative, value ? cumulative / value * 100 : 0); }
  }
});

test('contract drillthrough follows exact supplier keys and explains company-level cohort selection', () => {
  const analysis = buildContractAnalysis(scope);
  const cell = analysis.cells.find(row => row.companyIds.length > 0)!;
  const selected = selectScope(dataset, { ...defaultFilters, cityIds: [cell.cityId] }, cell.companyIds);
  assert(selected.contracts.every(row => cell.companyIds.includes(row.companyId)));
  const establishments = new Map(dataset.establishments.map(row => [row.id, row]));
  assert(selected.contracts.every(row => establishments.get(row.establishmentId)?.cityId === cell.cityId));
  assert(cell.contractIds.every(id => selected.contracts.some(row => row.id === id)));
  assert.deepEqual(unique(cell.companyIds), unique(scope.contracts.filter(row => cell.contractIds.includes(row.id)).map(row => row.companyId)));
  for (const category of analysis.categories)
    assert.deepEqual(unique(category.companyIds), unique(scope.contracts.filter(row => row.category === category.id).map(row => row.companyId)));
  assert.deepEqual(buildContractAnalysis({ ...scope, contracts: [] }).suppliers, []);
});

test('all three six-panel report renders exclude frozen website/PDF values and mark production connections pending', () => {
  const noop = () => {};
  const props = { scope, filters: defaultFilters, comparison: false, financialAllowed: true,
    onDimension: noop, onSubset: noop, onProfessionals: noop, onInfo: noop };
  for (const component of [ProfessionalsReport, MarketReport, ContractsReport]) {
    const html = renderToStaticMarkup(createElement(component, props));
    assert.equal((html.match(/data-panel=/g) ?? []).length, 6);
    assert(!html.includes('Referência salarial'));
    assert(!html.includes('PNCP: o que foi publicado'));
    assert(!html.includes('contratos reais'));
    assert(!html.includes('30 mil espectadores'));
    assert.match(html, /demonstrativ/);
    assert.match(html, /não conectad/);
    const empty = renderToStaticMarkup(createElement(component, { ...props, scope: selectScope(dataset, defaultFilters, []), professionalIds: [] }));
    assert.equal((empty.match(/data-panel=/g) ?? []).length, 6);
  }
});
