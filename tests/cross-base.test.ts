import assert from 'node:assert/strict';
import test from 'node:test';
import { dataset } from '../src/domain/dataset';
import { buildCrossBaseRows } from '../src/domain/cross-base';
import { group, makeSeries, selectScope, summarize } from '../src/domain/engine';
import { defaultFilters } from '../src/domain/types';
import type { Filters } from '../src/domain/types';

const filters = (patch: Partial<Filters> = {}): Filters => ({ ...defaultFilters, ...patch });
const all = selectScope(dataset, filters());
const allRows = buildCrossBaseRows(all);

test('regional cross-source company counts reconcile with the analytical scope and GRE dictionary', () => {
  const groups = new Map(group(all, 'gre').map(row => [row.id, row]));
  assert.equal(allRows.length, dataset.gres.length);
  assert.equal(new Set(allRows.map(row => row.id)).size, allRows.length);
  for (const row of allRows) {
    assert(dataset.gres.some(gre => gre.id === row.id && gre.name === row.label));
    const expected = groups.get(row.id)!;
    assert.equal(row.companies, expected.companies);
    assert.equal(row.registered, expected.registered);
    assert.equal(row.notMatched, expected.notMatched);
    assert.equal(row.coverage, expected.coverage);
    assert.equal(row.registered + row.notMatched, row.companies);
    assert.equal(row.contracts, expected.contracts);
  }
  assert.equal(allRows.reduce((sum, row) => sum + row.contracts, 0), summarize(all).contractValue);
  assert.equal(allRows.reduce((sum, row) => sum + row.employment, 0), summarize(all).employees);
});

test('employment growth uses first and last monthly stock snapshots, not admissions or cumulative stock', () => {
  const cityGre = new Map(dataset.cities.map(city => [city.id, city.greId]));
  const months = [...new Set(all.employment.map(row => row.month))].sort();
  for (const row of allRows) {
    const firstStock = all.employment.filter(fact => cityGre.get(fact.cityId) === row.id && fact.month === months[0]).reduce((sum, fact) => sum + fact.stock, 0);
    const lastStock = all.employment.filter(fact => cityGre.get(fact.cityId) === row.id && fact.month === months.at(-1)).reduce((sum, fact) => sum + fact.stock, 0);
    assert.equal(row.firstMonth, months[0]);
    assert.equal(row.lastMonth, months.at(-1));
    assert.equal(row.employmentFirst, firstStock);
    assert.equal(row.employment, lastStock);
    assert.equal(row.employmentChange, firstStock ? (lastStock - firstStock) / firstStock * 100 : null);
  }
});

test('registration growth compares rewound active stock at the same month ends as employment', () => {
  for (const row of allRows) {
    const regional = selectScope(dataset, filters({ greIds: [row.id] }));
    const history = makeSeries(regional);
    const first = history.find(point => point.date.startsWith(row.firstMonth))!;
    const last = history.find(point => point.date.startsWith(row.lastMonth))!;
    assert.equal(row.registrationFirst, first.base);
    assert.equal(row.registrationLast, last.base);
    assert.equal(row.registrationChange, first.base ? (last.base - first.base) / first.base * 100 : null);
  }
});

test('individual company subsets and size restrictions never attribute aggregated employment to CNPJs', () => {
  const subsets = [
    selectScope(dataset, filters(), [dataset.companies[0].id]),
    selectScope(dataset, filters({ sizes: ['Grande empresa'] })),
    selectScope(dataset, filters({ search: dataset.establishments[0].cnpj })),
  ];
  const expected = new Map(allRows.map(row => [row.id, row]));
  for (const scope of subsets) {
    const rows = buildCrossBaseRows(scope);
    assert.equal(rows.length, allRows.length);
    assert(scope.companies.length < all.companies.length);
    for (const row of rows) {
      assert.equal(row.employment, expected.get(row.id)!.employment);
      assert.equal(row.employmentFirst, expected.get(row.id)!.employmentFirst);
      assert.equal(row.employmentChange, expected.get(row.id)!.employmentChange);
    }
  }
});

test('regional and CBO selections restrict independent aggregate facts and preserve contract supplier units', () => {
  const scope = selectScope(dataset, filters({ greIds: ['GRE2'], cboCodes: [dataset.cbos[0].code], period: 3 }));
  const rows = buildCrossBaseRows(scope);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'GRE2');
  assert.equal(rows[0].employment, summarize(scope).employees);
  const registered = new Set(scope.registrations.map(row => row.companyId));
  const missing = new Set(scope.contracts.filter(row => !registered.has(row.companyId)).map(row => row.companyId));
  assert.equal(rows[0].contractMissing, missing.size);
  assert.equal(rows[0].firstMonth, '2026-07');
  assert.equal(rows[0].lastMonth, '2026-09');
});

test('missing employment observations produce explicit unavailable rates without fabricated region values', () => {
  const scope = selectScope(dataset, filters({ cboCodes: ['nonexistent'] }));
  const rows = buildCrossBaseRows(scope);
  assert(rows.length > 0);
  for (const row of rows) {
    assert.equal(row.employment, 0);
    assert.equal(row.employmentChange, null);
    assert.equal(row.registrationChange, null);
    assert.equal(row.firstMonth, '');
    assert.equal(row.lastMonth, '');
  }
});
