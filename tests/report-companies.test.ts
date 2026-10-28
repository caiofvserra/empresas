import assert from 'node:assert/strict';
import test from 'node:test';
import { dataset } from '../src/domain/dataset';
import { inWindow, outstanding, selectScope, summarize } from '../src/domain/engine';
import { defaultFilters } from '../src/domain/types';
import { buildCompaniesAnalysis, companyActiveRegistrationCohort, companyRepresentativeEstablishments } from '../src/report/CompaniesReport';

const all = selectScope(dataset, { ...defaultFilters });
const analysis = buildCompaniesAnalysis(all);

test('company profile and regional root allocation reconcile without multiplying branch facts', () => {
  const metrics = summarize(all);
  assert.equal(analysis.bySize.reduce((sum, row) => sum + row.active, 0), metrics.activeCompanies);
  assert.equal(analysis.bySize.reduce((sum, row) => sum + row.inactive, 0), metrics.inactiveCompanies);
  assert.equal(analysis.byGre.reduce((sum, row) => sum + row.companies, 0), metrics.registeredCompanies);
  assert.equal(new Set(analysis.byGre.flatMap(row => row.companyIds)).size, metrics.registeredCompanies);
  const representatives = companyRepresentativeEstablishments(all);
  for (const company of all.companies) {
    const rows = all.establishments.filter(row => row.companyId === company.id);
    assert(rows.some(row => row.id === representatives.get(company.id)?.id));
    if (rows.some(row => row.branch === 'Matriz')) assert.equal(representatives.get(company.id)?.branch, 'Matriz');
  }
});

test('monthly registration stock drillthrough is reconstructed from the same dated movement ledger', () => {
  for (const point of analysis.series) {
    const monthEnd = new Date(Date.UTC(Number(point.date.slice(0, 4)), Number(point.date.slice(5, 7)), 0)).toISOString().slice(0, 10);
    const cutoff = monthEnd < all.anchor ? monthEnd : all.anchor;
    const cohort = companyActiveRegistrationCohort(all, cutoff);
    assert.equal(cohort.registrationCount, point.base, `stock ${point.date}`);
    assert.equal(new Set(cohort.companyIds).size, cohort.companyIds.length);
    assert(cohort.companyIds.every(id => all.companyIds.has(id)));
  }
  assert.equal(companyActiveRegistrationCohort(all, all.anchor).registrationCount, summarize(all).activeRegistrations);
  assert.equal(companyActiveRegistrationCohort(all, '1900-01-01').registrationCount, 0);
});

test('combined ART and CAO production reconciles to event dates and exposes actual company cohorts', () => {
  const metrics = summarize(all);
  assert.equal(analysis.production.reduce((sum, row) => sum + row.arts, 0), metrics.arts);
  assert.equal(analysis.production.reduce((sum, row) => sum + row.caos, 0), metrics.caoIssued);
  for (const row of analysis.production) {
    const arts = all.arts.filter(art => art.date.startsWith(row.month));
    const caos = all.caos.filter(cao => cao.issuedAt?.startsWith(row.month) && inWindow(cao.issuedAt, 12, all.anchor));
    assert.deepEqual(new Set(row.artCompanyIds), new Set(arts.map(art => art.companyId)));
    assert.deepEqual(new Set(row.caoCompanyIds), new Set(caos.map(cao => cao.companyId)));
    assert.deepEqual(new Set(row.bothCompanyIds), new Set([...arts, ...caos].map(event => event.companyId)));
  }
});

test('financial ageing and GRE sums partition residual values while distinct company counts stay explicit', () => {
  const eligible = all.invoices.filter(row => analysis.registered.has(row.companyId) && row.dueDate < all.anchor && outstanding(row, all.anchor) > 0);
  const expectedAmount = eligible.reduce((sum, row) => sum + outstanding(row, all.anchor), 0);
  assert(Math.abs(analysis.ageBands.reduce((sum, row) => sum + row.amount, 0) - expectedAmount) < .00001);
  assert(Math.abs(analysis.byGre.reduce((sum, row) => sum + row.overdue, 0) - expectedAmount) < .00001);
  assert.equal(analysis.overdueCompanies, new Set(eligible.map(row => row.companyId)).size);
  assert.equal(analysis.byGre.reduce((sum, row) => sum + row.delinquentCompanies, 0), analysis.overdueCompanies);
  for (const row of analysis.ageBands) assert.equal(row.companies, new Set(row.companyIds).size);
});

test('company report respects common filters and removes private monetary aggregates for restricted profiles', () => {
  const filtered = selectScope(dataset, { ...defaultFilters, cityIds: [dataset.cities[0].id], period: 3 });
  const selected = buildCompaniesAnalysis(filtered);
  assert.equal(selected.series.length, 3);
  assert(selected.byGre.flatMap(row => row.companyIds).every(id => filtered.companyIds.has(id)));
  assert(selected.production.flatMap(row => row.bothCompanyIds).every(id => filtered.companyIds.has(id)));
  assert(selected.quality.flatMap(row => row.companyIds).every(id => filtered.companyIds.has(id)));
  const restricted = buildCompaniesAnalysis(filtered, false);
  assert.equal(restricted.overdueAmount, 0);
  assert.equal(restricted.recoveredAmount, 0);
  assert.equal(restricted.recoveredCompanies, 0);
  assert.equal(restricted.financeCompanies, 0);
  assert(restricted.byGre.every(row => row.overdue === 0 && row.delinquentCompanies === 0));
  assert(restricted.ageBands.every(row => row.amount === 0 && row.companies === 0 && row.companyIds.length === 0));
  assert.equal(restricted.byRt.reduce((sum, row) => sum + row.companies, 0), summarize(filtered).registeredCompanies);
  const empty = buildCompaniesAnalysis(selectScope(dataset, { ...defaultFilters }, []));
  assert.equal(empty.registered.size, 0);
  assert.equal(empty.production.reduce((sum, row) => sum + row.arts + row.caos, 0), 0);
});
