import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset';
import { defaultFilters } from '../src/domain/types';
import type { Dataset, Invoice } from '../src/domain/types';
import { isActiveLink, selectScope, summarize, windowBounds } from '../src/domain/engine';
import { buildProfessionalModel, selectProfessionalScope } from '../src/domain/professionals';
import { buildExecutiveCompanyContinuity, buildExecutiveProfessionalEngagement, buildExecutiveArtProduction,
  buildExecutiveCorporateReceipts, buildExecutiveRegionalEconomy, executiveActiveCompanyIdsAt, executiveCompanyTerritory, executiveMonths } from '../src/report/executive-decisions-v8';

const unique = (values: string[]) => [...new Set(values)].sort();
const base = selectScope(dataset, defaultFilters);
const scopes = [base, selectScope(dataset, { ...defaultFilters, greIds: ['GRE2'], period: 6 }),
  selectScope(dataset, { ...defaultFilters, cityIds: [dataset.cities[0].id], period: 24 }),
  selectScope(dataset, { ...defaultFilters, sizes: ['Grande empresa'], period: 36 }),
  selectScope(dataset, defaultFilters, dataset.companies.slice(50, 80).map(row => row.id))];

// These tests verify analytical grains, rather than echoing chart configuration.
test('technical continuity partitions ACTIVE distinct roots once, excluding inactive registrations from its denominator', () => {
  for (const scope of scopes) {
    const metric = buildExecutiveCompanyContinuity(scope);
    const active = unique(scope.registrations.filter(row => row.status === 'Ativo').map(row => row.companyId));
    const rt = new Set(scope.technicalLinks.filter(row => isActiveLink(row, scope.anchor)).map(row => row.companyId));
    assert.deepEqual(unique(metric.activeIds), active);
    assert.equal(metric.total, summarize(scope).activeCompanies);
    assert.equal(metric.withRtIds.length + metric.withoutRtIds.length, active.length);
    assert.deepEqual(unique([...metric.withRtIds, ...metric.withoutRtIds]), active);
    metric.withRtIds.forEach(id => assert(rt.has(id)));
    metric.withoutRtIds.forEach(id => assert(!rt.has(id)));
    const assigned = metric.rows.flatMap(row => row.companyIds);
    assert.equal(assigned.length, new Set(assigned).size);
    assert.deepEqual(unique(assigned), active);
    assert.equal(metric.rows.reduce((sum, row) => sum + row.withoutRtIds.length, 0), metric.withoutRtIds.length);
  }
});

test('territorial allocation prefers a visible headquarters, is deterministic under input order and never duplicates a branch-owning company', () => {
  const forward = executiveCompanyTerritory(base);
  const reverse = executiveCompanyTerritory({ ...base, establishments: [...base.establishments].reverse() });
  assert.deepEqual([...forward].sort(), [...reverse].sort());
  assert.equal(forward.size, base.companies.length);
  for (const company of base.companies) {
    const visibleHeadquarters = base.establishments.find(row => row.companyId === company.id && row.branch === 'Matriz');
    if (visibleHeadquarters) assert.equal(forward.get(company.id), visibleHeadquarters.greId);
  }
});

test('professional engagement partitions only active people and uses explicit ART authorship, never the RT bridge', () => {
  for (const scope of scopes) {
    const metric = buildExecutiveProfessionalEngagement(scope);
    const professional = selectProfessionalScope(scope);
    const active = unique(professional.profiles.filter(row => row.status === 'Ativo').map(row => row.id));
    const authors = new Set(professional.artAttributions.map(row => row.professionalId));
    assert.deepEqual(unique(metric.activeIds), active);
    assert.equal(metric.withArtIds.length + metric.withoutArtIds.length, active.length);
    metric.withArtIds.forEach(id => assert(authors.has(id)));
    metric.withoutArtIds.forEach(id => assert(!authors.has(id)));
    const assigned = metric.rows.flatMap(row => row.professionalIds);
    assert.equal(assigned.length, new Set(assigned).size);
    assert.deepEqual(unique(assigned), active);
    assert.equal(metric.rate, active.length ? metric.withArtIds.length / active.length * 100 : null);
    const allKnown = new Set(professional.model.artAttributions.map(row => row.artId));
    assert.equal(metric.sourceArtCount, professional.sourceArts.length);
    assert.equal(metric.identifiedArtCount, professional.sourceArts.filter(row => allKnown.has(row.id)).length);
    assert.equal(metric.authorCoverageRate, metric.sourceArtCount ? metric.identifiedArtCount / metric.sourceArtCount * 100 : null);
  }
  const selectedIds = selectProfessionalScope(base).profiles.slice(0, 19).map(row => row.id);
  assert(buildExecutiveProfessionalEngagement(base, selectedIds).activeIds.every(id => selectedIds.includes(id)));
});

test('monthly ART production includes records with missing authors, counts monthly DISTINCT authors and recomputes annual distinctness', () => {
  const model = buildProfessionalModel(dataset);
  for (const scope of scopes) {
    const metric = buildExecutiveArtProduction(scope);
    assert.equal(metric.rows.length, scope.filters.period);
    assert.equal(metric.rows.reduce((sum, row) => sum + row.arts, 0), scope.arts.length);
    const currentIds = new Set(scope.arts.map(row => row.id));
    const authors = model.artAttributions.filter(row => currentIds.has(row.artId));
    assert.equal(metric.authors, new Set(authors.map(row => row.professionalId)).size);
    assert.equal(metric.unattributedArts, scope.arts.filter(art => !authors.some(row => row.artId === art.id)).length);
    for (const row of metric.rows) {
      const ids = new Set(row.artIds);
      assert.equal(row.authors, new Set(authors.filter(bridge => ids.has(bridge.artId)).map(bridge => bridge.professionalId)).size);
      assert.equal(row.arts, ids.size);
      row.companyIds.forEach(id => assert(scope.companyIds.has(id)));
    }
  }
  const metric = buildExecutiveArtProduction(base);
  assert(metric.unattributedArts > 0, 'incomplete author coverage must remain visible');
  assert(metric.rows.reduce((sum, row) => sum + row.authors, 0) > metric.authors, 'annual DISTINCT cannot be replaced with sum of monthly DISTINCT');
});

test('an explicit person selection restricts production only through declared ART author keys', () => {
  const model = buildProfessionalModel(dataset);
  const selected = model.profiles.filter(row => row.status === 'Ativo').slice(0, 20).map(row => row.id);
  const ids = new Set(model.artAttributions.filter(row => selected.includes(row.professionalId)).map(row => row.artId));
  const expected = base.arts.filter(row => ids.has(row.id));
  const metric = buildExecutiveArtProduction(base, selected);
  assert.equal(metric.arts, expected.length);
  assert.deepEqual(unique(metric.rows.flatMap(row => row.artIds)), unique(expected.map(row => row.id)));
  metric.rows.flatMap(row => row.authorIds).forEach(id => assert(selected.includes(id)));
  assert.equal(metric.unattributedArts, 0);
});

test('corporate cash receipts sum by payment date, recovered is a subset and overdue remains a separate dated stock', () => {
  for (const scope of scopes) {
    const metric = buildExecutiveCorporateReceipts(scope);
    const bounds = windowBounds(scope.filters.period, scope.anchor);
    const registered = new Set(scope.registrations.map(row => row.companyId));
    const payments = scope.invoices.filter(row => registered.has(row.companyId) && row.paidAmount > 0
      && row.paymentDate && row.paymentDate >= bounds.start && row.paymentDate <= bounds.end);
    const cents = (rows: Invoice[]) => rows.reduce((sum, row) => sum + Math.round(row.paidAmount * 100), 0);
    assert.equal(Math.round(metric.receivedAmount * 100), cents(payments));
    assert.equal(Math.round(metric.recoveredAmount * 100), cents(payments.filter(row => row.recovered)));
    assert(metric.recoveredAmount <= metric.receivedAmount);
    metric.rows.forEach(row => assert.equal(row.regularCents + row.recoveredCents, row.receivedCents));
    assert.deepEqual(unique(metric.companyIds), unique(payments.map(row => row.companyId)));
  }
});

test('cashflow ignores due-date window for receipts, handles advance payment, partial payment and future receipt correctly', () => {
  const original = dataset.invoices[0];
  const invoices: Invoice[] = [
    { ...original, id: 'A', amount: 100, paidAmount: 100, dueDate: '2020-01-01', paymentDate: '2026-09-05', recovered: true },
    { ...original, id: 'B', amount: 75.25, paidAmount: 25.1, dueDate: '2026-09-20', paymentDate: '2026-09-15', recovered: false },
    { ...original, id: 'C', amount: 200, paidAmount: 200, dueDate: '2026-10-01', paymentDate: '2026-09-10', recovered: false },
    { ...original, id: 'D', amount: 100, paidAmount: 100, dueDate: '2026-09-20', paymentDate: '2026-10-05', recovered: false },
    { ...original, id: 'E', amount: 50, paidAmount: 0, dueDate: '2026-09-01', paymentDate: undefined, recovered: false },
    { ...original, id: 'F', amount: 70, paidAmount: 70, dueDate: '2025-09-01', paymentDate: '2025-09-15', recovered: false },
  ];
  const fixture: Dataset = { ...dataset, invoices };
  const metric = buildExecutiveCorporateReceipts(selectScope(fixture, defaultFilters));
  assert.equal(metric.receivedAmount, 325.1);
  assert.equal(metric.recoveredAmount, 100);
  assert.equal(metric.overdueAmount, 200.15);
  assert.equal(metric.previousReceivedAmount, 70);
  assert.deepEqual(metric.rows.at(-1)!.invoiceIds, ['A', 'B', 'C']);
});

test('financial comparison aligns partial current-month payment cutoff with equivalent days of the prior month', () => {
  const original = dataset.invoices[0];
  const fixture: Dataset = { ...dataset, snapshotDate: '2026-09-15', invoices: [
    { ...original, id: 'PREVIOUS_IN', paidAmount: 90, paymentDate: '2025-09-14' },
    { ...original, id: 'PREVIOUS_OUT', paidAmount: 120, paymentDate: '2025-09-16' },
    { ...original, id: 'CURRENT_IN', paidAmount: 150, paymentDate: '2026-09-14' },
    { ...original, id: 'CURRENT_OUT', paidAmount: 170, paymentDate: '2026-09-16' },
  ] };
  const selected = selectScope(fixture, defaultFilters);
  const row = buildExecutiveCorporateReceipts(selected).rows.at(-1)!;
  assert.equal(row.end, '2026-09-15');
  assert.equal(row.previousEnd, '2025-09-15');
  assert.equal(row.receivedAmount, 150);
  assert.equal(row.previousReceivedAmount, 90);
  assert.equal(executiveMonths(selected).length, 12);
});

test('regional economic comparison uses SAME month-end dates, distinct active roots and last employment stock without summing months', () => {
  for (const scope of scopes.filter(scope => !scope.employmentScopeLimited)) {
    const metric = buildExecutiveRegionalEconomy(scope);
    assert(metric.comparable);
    assert.equal(metric.rows.reduce((sum, row) => sum + row.employmentLast, 0), summarize(scope).employees);
    const current = executiveActiveCompanyIdsAt(scope, metric.lastCutoff);
    assert.deepEqual(unique(current), unique(scope.registrations.filter(row => row.status === 'Ativo').map(row => row.companyId)));
    assert.equal(metric.rows.reduce((sum, row) => sum + row.companiesLast, 0), current.length);
    assert.equal(metric.rows.flatMap(row => row.lastCompanyIds).length, new Set(metric.rows.flatMap(row => row.lastCompanyIds)).size);
    metric.rows.forEach(row => {
      assert.equal(row.firstCutoff, metric.firstCutoff);
      assert.equal(row.lastCutoff, metric.lastCutoff);
      assert.equal(row.companyChange, row.companiesFirst ? (row.companiesLast - row.companiesFirst) / row.companiesFirst * 100 : null);
    });
  }
  assert.equal(buildExecutiveRegionalEconomy(selectScope(dataset, { ...defaultFilters, sizes: ['Grande empresa'] })).comparable, false);
  assert.equal(buildExecutiveRegionalEconomy(selectScope(dataset, defaultFilters, [dataset.companies[1].id])).comparable, false);
});

test('historical active-company reconstruction follows explicit register events instead of summing records or selecting current survivors', () => {
  const registration = { ...dataset.registrations[0], startedAt: '2025-01-01' };
  const second = { ...registration, id: 'HISTORY_2', startedAt: '2025-06-01' };
  const fixture: Dataset = { ...dataset, registrations: [registration, second], movements: [
    { id: 'H1', companyId: registration.companyId, establishmentId: registration.establishmentId, registrationId: registration.id, type: 'Novo registro', date: '2025-01-01' },
    { id: 'H2', companyId: registration.companyId, establishmentId: registration.establishmentId, registrationId: registration.id, type: 'Baixa', date: '2025-03-01' },
    { id: 'H3', companyId: registration.companyId, establishmentId: registration.establishmentId, registrationId: registration.id, type: 'Reativação', date: '2025-05-01' },
    { id: 'H4', companyId: registration.companyId, establishmentId: registration.establishmentId, registrationId: second.id, type: 'Novo registro', date: '2025-06-01' },
  ] };
  const selected = selectScope(fixture, defaultFilters);
  assert.deepEqual(executiveActiveCompanyIdsAt(selected, '2024-12-31'), []);
  assert.deepEqual(executiveActiveCompanyIdsAt(selected, '2025-02-28'), [registration.companyId]);
  assert.deepEqual(executiveActiveCompanyIdsAt(selected, '2025-04-30'), []);
  assert.deepEqual(executiveActiveCompanyIdsAt(selected, '2025-05-31'), [registration.companyId]);
  assert.deepEqual(executiveActiveCompanyIdsAt(selected, '2025-06-30'), [registration.companyId]);
});

test('empty selections preserve no-data denominator and never fabricate firms, people or payments', () => {
  const empty = selectScope(dataset, defaultFilters, []);
  const continuity = buildExecutiveCompanyContinuity(empty);
  assert.equal(continuity.total, 0);
  assert.equal(continuity.rate, null);
  const engagement = buildExecutiveProfessionalEngagement(empty);
  assert.equal(engagement.total, 0);
  assert.equal(engagement.rate, null);
  assert.equal(buildExecutiveArtProduction(empty).arts, 0);
  assert.equal(buildExecutiveArtProduction(base, []).arts, 0);
  assert.equal(buildExecutiveCorporateReceipts(empty).receivedAmount, 0);
  assert.deepEqual(buildExecutiveCorporateReceipts(empty).companyIds, []);
});

test('a single observed employment competence does not fabricate a growth comparison', () => {
  const metric = buildExecutiveRegionalEconomy(selectScope(dataset, { ...defaultFilters, period: 1 }));
  assert(metric.rows.every(row => row.employmentChange === null && row.companyChange === null));
});
