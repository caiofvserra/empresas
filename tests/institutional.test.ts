import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dataset, generateDataset } from '../src/domain/dataset';
import { inWindow, selectScope } from '../src/domain/engine';
import { buildProfessionalModel } from '../src/domain/professionals';
import { defaultFilters } from '../src/domain/types';
import type { Filters } from '../src/domain/types';
import { buildCoworkAnalysis, buildInstitutionalModel, buildInstitutionalMonthly, buildInstitutionalPrograms,
  buildInstitutionalServiceAnalysis, buildInstitutionalTerritory, institutionalParticipantIds,
  selectInstitutionalScope, summarizeInstitutional } from '../src/domain/institutional';
import type { InstitutionalModel, InstitutionalServiceRequest } from '../src/domain/institutional';
import { exportInstitutional, institutionalCsvCell } from '../scripts/export-institutional';

const filters = (patch: Partial<Filters> = {}): Filters => ({ ...defaultFilters, ...patch });
const source = selectScope(dataset, filters());
const model = buildInstitutionalModel(dataset);
const all = selectInstitutionalScope(source);
const profiles = new Map(buildProfessionalModel(dataset).profiles.map(row => [row.id, row]));
const activityById = new Map(model.activities.map(row => [row.id, row]));
const cityById = new Map(dataset.cities.map(row => [row.id, row]));
const sum = <T>(rows: T[], pick: (row: T) => number) => rows.reduce((result, row) => result + pick(row), 0);
const addDays = (date: string, days: number) => new Date(Date.parse(date) + days * 86_400_000).toISOString().slice(0, 10);

test('institutional demonstration is seeded and reproducible without modifying company/professional data', () => {
  const before = JSON.stringify(dataset);
  assert.deepEqual(buildInstitutionalModel(generateDataset(dataset.seed)), model);
  assert.notDeepEqual(buildInstitutionalModel(generateDataset(dataset.seed + 1)).activities, model.activities);
  assert.equal(JSON.stringify(dataset), before);
  assert.equal(model.metadata.synthetic, true);
  assert.equal(model.metadata.seedLabel, `${dataset.seed}+v6`);
  assert.match(model.metadata.source, /não corresponde a dados/);
  assert.equal(model.programs.length, 4);
  assert(model.metadata.limitations.some(text => text.includes('não evidenciam')));
});

test('all institutional entity IDs and activity/person registration pairs are unique and referentially valid', () => {
  for (const rows of [model.programs, model.activities, model.participation, model.budgetEntries, model.coworkUnits,
    model.coworkMonths, model.coworkUsage, model.followups, model.serviceRequests]) {
    assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
  }
  const programs = new Set(model.programs.map(row => row.id));
  const units = new Map(model.coworkUnits.map(row => [row.id, row]));
  const months = new Map(model.coworkMonths.map(row => [row.id, row]));
  for (const row of model.activities) {
    assert(programs.has(row.programId));
    assert.equal(cityById.get(row.cityId)!.greId, row.greId);
    assert(row.date <= dataset.snapshotDate);
    assert(Number.isSafeInteger(row.costCents) && row.costCents >= 0);
  }
  const identified = model.participation.filter(row => row.professionalId);
  assert.equal(new Set(identified.map(row => `${row.activityId}/${row.professionalId}`)).size, identified.length);
  for (const row of model.participation) {
    const activity = activityById.get(row.activityId)!;
    assert(activity);
    assert(row.registeredAt <= activity.date);
    if (row.professionalId) {
      assert(profiles.has(row.professionalId));
      assert(profiles.get(row.professionalId)!.registeredAt <= row.registeredAt);
      assert.equal(row.identityStatus, 'Identificador demonstrativo validado');
    } else assert.equal(row.identityStatus, 'Identificador não informado');
  }
  for (const row of model.coworkMonths) {
    const unit = units.get(row.unitId)!;
    assert(unit && activityById.has(row.activityId));
    assert.equal(activityById.get(row.activityId)!.cityId, unit.cityId);
    assert(row.availableDeskHours === unit.desks * 160);
  }
  for (const row of model.coworkUsage) assert(months.has(row.coworkMonthId) && profiles.has(row.professionalId));
});

test('missing participant identifiers remain missing and are not turned into fictional unique beneficiaries', () => {
  const metrics = summarizeInstitutional(all);
  const attendance = all.participation.filter(row => row.attended);
  assert(metrics.unidentifiedRegistrations > 0 && metrics.unidentifiedAttendances > 0);
  assert.equal(metrics.registrations, metrics.identifiedRegistrations + metrics.unidentifiedRegistrations);
  assert.equal(metrics.attendances, metrics.identifiedAttendances + metrics.unidentifiedAttendances);
  assert.equal(metrics.distinctParticipants, new Set(attendance.filter(row => row.professionalId).map(row => row.professionalId)).size);
  assert.equal(metrics.identifiedAttendances, metrics.distinctParticipants + metrics.repeatAttendances);
  assert(metrics.repeatAttendances > metrics.distinctParticipants);
  assert(metrics.distinctParticipants < profiles.size, 'a voluntary program cohort is not the entire professional register');
  assert.equal(metrics.participationTraceability, metrics.identifiedAttendances / metrics.attendances);
  assert.equal(metrics.attendanceRate, metrics.attendances / metrics.registrations);
});

test('global period applies to the dates of each institutional fact, with 3-month rows a proper subset of 12 months', () => {
  const quarter = selectInstitutionalScope(selectScope(dataset, filters({ period: 3 })));
  assert(quarter.activities.length > 0 && quarter.activities.length < all.activities.length);
  assert(quarter.activities.every(row => inWindow(row.date, 3, dataset.snapshotDate)));
  assert(quarter.budgetEntries.every(row => inWindow(row.month, 3, dataset.snapshotDate)));
  assert(quarter.coworkMonths.every(row => inWindow(row.month, 3, dataset.snapshotDate)));
  assert(quarter.serviceRequests.every(row => inWindow(row.createdAt, 3, dataset.snapshotDate)));
  assert(quarter.activities.every(row => all.activityIds.has(row.id)));
  const monthly = buildInstitutionalMonthly(quarter);
  assert.deepEqual(monthly.map(row => row.month), ['2026-07', '2026-08', '2026-09']);
  assert.equal(sum(monthly, row => row.executedCents), summarizeInstitutional(quarter).executedCents);
});

test('a period exceeding the 24-month demonstration exposes missing coverage instead of inserting false historical zeros', () => {
  const scoped = selectInstitutionalScope(selectScope(dataset, filters({ period: 36 })));
  assert.equal(scoped.periodCoverageComplete, false);
  assert.equal(scoped.coverageStart, '2024-10-01');
  assert.match(scoped.scopeNote, /meses anteriores não representam ausência/);
  assert.equal(buildInstitutionalMonthly(scoped).length, 24);
  assert.equal(buildInstitutionalMonthly(scoped)[0].month, '2024-10');
  assert.equal(all.periodCoverageComplete, true);
});

test('municipality/GRE/program filters use OR within dimensions and AND between dimensions', () => {
  const cityA = dataset.cities[4];
  const cityB = dataset.cities.find(row => row.greId === cityA.greId && row.id !== cityA.id)!;
  const scoped = selectInstitutionalScope(selectScope(dataset, filters({ cityIds: [cityA.id, cityB.id], greIds: [cityA.greId] })), { programIds: ['formacao', 'orientacao'] });
  const expected = all.activities.filter(row => [cityA.id, cityB.id].includes(row.cityId) && row.greId === cityA.greId && ['formacao', 'orientacao'].includes(row.programId));
  assert.deepEqual(scoped.activities, expected);
  assert(scoped.activities.length > 0);
  assert(scoped.budgetEntries.every(row => [cityA.id, cityB.id].includes(row.cityId) && row.greId === cityA.greId && ['formacao', 'orientacao'].includes(row.programId)));
  const conflict = selectInstitutionalScope(selectScope(dataset, filters({ cityIds: [cityA.id], greIds: ['GRE1'] })));
  assert.equal(conflict.activities.length, 0);
  assert.equal(conflict.budgetEntries.length, 0);
  assert.equal(conflict.baselineProfessionalIds.size, 0);
});

test('CNAE, company size, status and company drillthrough do not silently filter institutional activity', () => {
  assert.deepEqual(all.ignoredCompanyFilters, []);
  assert(!all.scopeNote.includes('Sem aplicação'));
  const constrained = selectScope(dataset, filters({ cnaeCodes: ['7112-0/00'], sizes: ['Grande empresa'], onlyRelated: true }), [dataset.companies[0].id]);
  const scoped = selectInstitutionalScope(constrained);
  assert.deepEqual(scoped.activities, all.activities);
  assert.deepEqual(scoped.budgetEntries, all.budgetEntries);
  assert(scoped.ignoredCompanyFilters.includes('CNAE'));
  assert(scoped.ignoredCompanyFilters.includes('Porte'));
  assert(scoped.ignoredCompanyFilters.includes('Subconjunto empresarial'));
  assert.match(scoped.scopeNote, /Sem aplicação/);
});

test('selecting a participant changes nominal records but never prorates institutional budgets or capacity', () => {
  const professionalId = all.participation.find(row => row.attended && row.professionalId)!.professionalId!;
  const cohort = selectInstitutionalScope(source, { professionalIds: [professionalId] });
  const original = summarizeInstitutional(all);
  const metrics = summarizeInstitutional(cohort);
  assert(cohort.participation.length > 0 && cohort.participation.length < all.participation.length);
  assert(cohort.participation.every(row => row.professionalId === professionalId));
  assert(cohort.followups.every(row => row.professionalId === professionalId));
  assert.equal(metrics.distinctParticipants, 1);
  assert.equal(metrics.executedCents, original.executedCents);
  assert.equal(metrics.plannedCents, original.plannedCents);
  assert.equal(metrics.coworkAvailableDeskHours, original.coworkAvailableDeskHours);
  assert.equal(metrics.coworkUsedDeskHours, original.coworkUsedDeskHours);
  assert.equal(metrics.coworkOccupancy, original.coworkOccupancy);
  assert.equal(metrics.costPerIdentifiedParticipantCents, null);
  assert(metrics.coworkCohortUsedDeskHours <= metrics.coworkUsedDeskHours);
  assert.equal(cohort.cohortRestricted, true);
});

test('activity drillthrough joins only its records and exposes real participant IDs without allocating the full budget', () => {
  const activity = all.activities.find(row => row.programId === 'formacao')!;
  const scoped = selectInstitutionalScope(source, { activityIds: [activity.id] });
  assert.deepEqual(scoped.activities.map(row => row.id), [activity.id]);
  assert(scoped.participation.every(row => row.activityId === activity.id));
  assert(scoped.followups.every(row => row.activityId === activity.id));
  const expected = [...new Set(scoped.participation.filter(row => row.attended && row.professionalId).map(row => row.professionalId!))].sort();
  assert.deepEqual(institutionalParticipantIds(scoped), expected);
  assert.equal(summarizeInstitutional(scoped).costPerIdentifiedParticipantCents, null);
  assert.equal(summarizeInstitutional(scoped).executedCents, summarizeInstitutional(all).executedCents);
});

test('budget integer amounts reconcile by month, program, municipality and linked activity plus other execution', () => {
  const tuples = new Set<string>();
  for (const row of model.budgetEntries) {
    const key = `${row.programId}/${row.cityId}/${row.month}`;
    assert(!tuples.has(key)); tuples.add(key);
    assert.equal(row.executedCents, row.activityCostCents + row.otherExecutedCents);
    assert.equal(row.activityCostCents, sum(model.activities.filter(activity => activity.programId === row.programId && activity.cityId === row.cityId && activity.date.startsWith(row.month)), activity => activity.costCents));
    for (const amount of [row.plannedCents, row.executedCents, row.activityCostCents, row.otherExecutedCents]) assert(Number.isSafeInteger(amount) && amount >= 0);
  }
  const metrics = summarizeInstitutional(all);
  const programs = buildInstitutionalPrograms(all);
  const territory = buildInstitutionalTerritory(all);
  const monthly = buildInstitutionalMonthly(all);
  for (const rows of [programs, territory, monthly]) assert.equal(sum(rows, row => row.executedCents), metrics.executedCents);
  assert.equal(sum(programs, row => row.plannedCents), metrics.plannedCents);
  assert.equal(metrics.executedCents, metrics.activityCostCents + metrics.otherExecutedCents);
  assert.equal(metrics.costPerIdentifiedParticipantCents, metrics.attendanceProgramExecutedCents / metrics.distinctParticipants);
  assert(Math.abs(sum(territory, row => row.budgetShare ?? 0) - 1) < 1e-12);
  assert(Math.abs(sum(territory, row => row.professionalShare ?? 0) - 1) < 1e-12);
});

test('cowork used desk-hours never exceed capacity and neither users nor costs are summed as fake unique people', () => {
  for (const month of model.coworkMonths) {
    const usage = model.coworkUsage.filter(row => row.coworkMonthId === month.id);
    assert(sum(usage, row => row.usedDeskHours) <= month.availableDeskHours);
    assert.equal(new Set(usage.map(row => row.professionalId)).size, usage.length);
    assert(usage.every(row => Number.isSafeInteger(row.usedDeskHours) && row.usedDeskHours >= 0));
  }
  const units = buildCoworkAnalysis(all);
  const metrics = summarizeInstitutional(all);
  assert.equal(sum(units, row => row.availableDeskHours), metrics.coworkAvailableDeskHours);
  assert.equal(sum(units, row => row.usedDeskHours), metrics.coworkUsedDeskHours);
  assert.equal(sum(units, row => row.executedCents), metrics.coworkExecutedCents);
  assert.equal(metrics.coworkOccupancy, metrics.coworkUsedDeskHours / metrics.coworkAvailableDeskHours);
  assert.equal(metrics.coworkCostPerUsedHourCents, metrics.coworkExecutedCents / metrics.coworkUsedDeskHours);
  assert.equal(metrics.coworkDistinctUsers, new Set(all.allCoworkUsage.map(row => row.professionalId)).size);
  assert(units.every(row => row.occupancy !== null && row.occupancy >= 0 && row.occupancy <= 1));
});

test('90-day followup preserves eligible/responded/person denominators without treating non-response as failure or employment', () => {
  for (const row of model.followups) {
    const activity = activityById.get(row.activityId)!;
    assert.equal(row.dueAt, addDays(activity.date, 90));
    assert.equal(row.eligibleAtSnapshot, row.dueAt <= dataset.snapshotDate);
    assert(model.participation.some(participation => participation.activityId === row.activityId && participation.professionalId === row.professionalId && participation.attended));
    if (row.responded) {
      assert(row.eligibleAtSnapshot && row.respondedAt && row.outcome);
      assert(row.respondedAt >= row.dueAt && row.respondedAt <= dataset.snapshotDate);
    } else { assert.equal(row.respondedAt, undefined); assert.equal(row.outcome, undefined); }
    assert.match(row.method, /sem atribuição causal/);
  }
  const metrics = summarizeInstitutional(all);
  assert.equal(metrics.reportedApplication + metrics.reportedLearning + metrics.reportedNoChange, metrics.respondedFollowups);
  assert.equal(metrics.eligibleFollowups + metrics.pendingEligibilityFollowups, all.followups.length);
  assert.equal(metrics.responseRate, metrics.respondedFollowups / metrics.eligibleFollowups);
  assert.equal(metrics.reportedApplicationRateAmongResponses, metrics.reportedApplication / metrics.respondedFollowups);
  assert(metrics.distinctRespondingProfessionals <= metrics.respondedFollowups);
  assert(metrics.distinctEligibleProfessionals <= metrics.eligibleFollowups);
  assert(!Object.keys(metrics).some(key => /employment|salary|jobConversion/i.test(key)));
});

test('service requests reference either an existing company or professional, with no invented nominal employment link', () => {
  const companies = new Set(dataset.companies.map(row => row.id));
  for (const row of model.serviceRequests) {
    assert.equal(cityById.get(row.cityId)!.greId, row.greId);
    assert(row.createdAt <= dataset.snapshotDate);
    if (row.userType === 'Profissional') { assert(row.professionalId && profiles.has(row.professionalId)); assert.equal(row.companyId, undefined); }
    else {
      assert(row.companyId && companies.has(row.companyId)); assert.equal(row.professionalId, undefined);
      assert(dataset.establishments.some(establishment => establishment.companyId === row.companyId && establishment.openedAt <= row.createdAt));
    }
    if (row.resolvedAt) { assert(row.resolvedAt >= row.createdAt && row.resolvedAt <= dataset.snapshotDate); assert.equal(row.status, 'Resolvido'); }
    else assert.equal(row.status, 'Em atendimento');
    assert.equal(row.targetDays, 14);
  }
  const metrics = summarizeInstitutional(all);
  assert.equal(metrics.serviceRequests, metrics.resolvedServiceRequests + metrics.openServiceRequests);
  assert.equal(metrics.serviceRequests, metrics.matureServiceRequests + metrics.immatureServiceRequests);
  assert.equal(metrics.matureServiceRequests, metrics.onTimeMatureServiceRequests + metrics.lateResolvedMatureServiceRequests + metrics.overdueOpenMatureServiceRequests);
  assert.equal(metrics.matureServiceOnTimeRate, metrics.onTimeMatureServiceRequests / metrics.matureServiceRequests);
  const categories = buildInstitutionalServiceAnalysis(all);
  assert.equal(sum(categories, row => row.requests), metrics.serviceRequests);
  assert.equal(sum(categories, row => row.onTime), metrics.onTimeMatureServiceRequests);
});

test('service category selection changes service requests only and retains the other fact grains', () => {
  const scoped = selectInstitutionalScope(source, { serviceCategories: ['Atualização cadastral', 'Orientação sobre ART'] });
  assert(scoped.serviceRequests.length > 0 && scoped.serviceRequests.length < all.serviceRequests.length);
  assert(scoped.serviceRequests.every(row => ['Atualização cadastral', 'Orientação sobre ART'].includes(row.category)));
  assert.deepEqual(scoped.activities, all.activities);
  assert.deepEqual(scoped.budgetEntries, all.budgetEntries);
});

test('territory budget shares and professional domicile shares reconcile without treating travelling attendance as local coverage', () => {
  const city = dataset.cities[4];
  const scoped = selectInstitutionalScope(selectScope(dataset, filters({ cityIds: [city.id] })));
  const metrics = summarizeInstitutional(scoped);
  const attendees = new Set(scoped.participation.filter(row => row.attended && row.professionalId).map(row => row.professionalId!));
  const domestic = [...attendees].filter(id => profiles.get(id)!.cityId === city.id);
  assert.equal(metrics.baselineProfessionals, [...profiles.values()].filter(row => row.cityId === city.id && row.registeredAt <= dataset.snapshotDate).length);
  assert.equal(metrics.participantReach, domestic.length / metrics.baselineProfessionals);
  assert(metrics.participantReach! <= 1);
  assert(metrics.distinctParticipants >= domestic.length);
  assert.equal(buildInstitutionalTerritory(scoped)[0].professionalShare, 1);
});

function fixture(): InstitutionalModel {
  const city = dataset.cities[0];
  const [person1, person2, person3] = [...profiles.keys()];
  const activities: InstitutionalModel['activities'] = [
    { id: 'A', programId: 'formacao', name: 'Oficina fictícia A', kind: 'Oficina', date: '2026-06-01', cityId: city.id, greId: city.greId, capacity: 10, costCents: 40_000 },
    { id: 'B', programId: 'formacao', name: 'Oficina fictícia B', kind: 'Oficina', date: '2026-09-01', cityId: city.id, greId: city.greId, capacity: 10, costCents: 30_000 },
  ];
  const participation: InstitutionalModel['participation'] = [
    { id: 'P1', activityId: 'A', professionalId: person1, attended: true, registeredAt: '2026-05-30', identityStatus: 'Identificador demonstrativo validado' },
    { id: 'P2', activityId: 'A', professionalId: person2, attended: true, registeredAt: '2026-05-30', identityStatus: 'Identificador demonstrativo validado' },
    { id: 'P3', activityId: 'A', attended: true, registeredAt: '2026-05-30', identityStatus: 'Identificador não informado' },
    { id: 'P4', activityId: 'A', professionalId: person3, attended: false, registeredAt: '2026-05-30', identityStatus: 'Identificador demonstrativo validado' },
    { id: 'P5', activityId: 'B', professionalId: person1, attended: true, registeredAt: '2026-08-30', identityStatus: 'Identificador demonstrativo validado' },
    { id: 'P6', activityId: 'B', professionalId: person2, attended: false, registeredAt: '2026-08-30', identityStatus: 'Identificador demonstrativo validado' },
  ];
  return { ...model, activities, participation,
    budgetEntries: [{ id: 'BUDGET', programId: 'formacao', month: '2026-09', cityId: city.id, greId: city.greId, plannedCents: 100_000, executedCents: 120_000, activityCostCents: 70_000, otherExecutedCents: 50_000 }],
    coworkUnits: [], coworkMonths: [], coworkUsage: [], serviceRequests: [],
    followups: [
      { id: 'F1', activityId: 'A', professionalId: person1, dueAt: '2026-08-30', eligibleAtSnapshot: true, responded: true, respondedAt: '2026-09-01', outcome: 'Aplicação profissional relatada', method: 'Resposta autodeclarada demonstrativa; sem atribuição causal' },
      { id: 'F2', activityId: 'A', professionalId: person2, dueAt: '2026-08-30', eligibleAtSnapshot: true, responded: false, method: 'Resposta autodeclarada demonstrativa; sem atribuição causal' },
      { id: 'F3', activityId: 'B', professionalId: person1, dueAt: '2026-11-30', eligibleAtSnapshot: false, responded: false, method: 'Resposta autodeclarada demonstrativa; sem atribuição causal' },
    ] };
}

test('a hand-calculated cohort distinguishes six registrations, four presences, two people and unknown-identity costs', () => {
  const scoped = selectInstitutionalScope(source, { model: fixture() });
  const metrics = summarizeInstitutional(scoped);
  assert.equal(metrics.registrations, 6);
  assert.equal(metrics.attendances, 4);
  assert.equal(metrics.identifiedAttendances, 3);
  assert.equal(metrics.distinctParticipants, 2);
  assert.equal(metrics.repeatAttendances, 1);
  assert.equal(metrics.unidentifiedAttendances, 1);
  assert.equal(metrics.executedCents, 120_000);
  assert.equal(metrics.plannedCents, 100_000);
  assert.equal(metrics.budgetExecutionRate, 1.2);
  assert.equal(metrics.costPerIdentifiedParticipantCents, 60_000);
  assert.equal(metrics.costInActivitiesWithUnknownIdentityCents, 40_000);
  assert.equal(metrics.eligibleFollowups, 2);
  assert.equal(metrics.pendingEligibilityFollowups, 1);
  assert.equal(metrics.respondedFollowups, 1);
  assert.equal(metrics.responseRate, 0.5);
  assert.equal(metrics.reportedApplicationRateAmongResponses, 1);
});

test('a hand-calculated service cohort keeps late/pending mature requests in the denominator and excludes immature ones', () => {
  const example = fixture();
  const city = dataset.cities[0];
  const professionalId = [...profiles.keys()][0];
  const request = (id: string, createdAt: string, resolvedAt?: string): InstitutionalServiceRequest => ({ id, programId: 'cadastro',
    cityId: city.id, greId: city.greId, createdAt, ...(resolvedAt ? { resolvedAt } : {}), userType: 'Profissional', professionalId,
    category: 'Atualização cadastral', status: resolvedAt ? 'Resolvido' : 'Em atendimento', targetDays: 14 });
  example.serviceRequests = [request('R1', '2026-09-01', '2026-09-08'), request('R2', '2026-09-01', '2026-09-25'),
    request('R3', '2026-09-01'), request('R4', '2026-09-25', '2026-09-27'), request('R5', '2026-09-25')];
  const metrics = summarizeInstitutional(selectInstitutionalScope(source, { model: example }));
  assert.equal(metrics.serviceRequests, 5);
  assert.equal(metrics.resolvedServiceRequests, 3);
  assert.equal(metrics.matureServiceRequests, 3);
  assert.equal(metrics.immatureServiceRequests, 2);
  assert.equal(metrics.onTimeMatureServiceRequests, 1);
  assert.equal(metrics.lateResolvedMatureServiceRequests, 1);
  assert.equal(metrics.overdueOpenMatureServiceRequests, 1);
  assert.equal(metrics.matureServiceOnTimeRate, 1 / 3);
  assert.equal(metrics.serviceResolutionDaysMean, 11);
  assert.equal(metrics.serviceResolutionDaysMedian, 7);
});

test('empty denominators yield null; empty selected people do not erase institutional spending/capacity', () => {
  const empty = { ...fixture(), activities: [], participation: [], budgetEntries: [], followups: [], serviceRequests: [] };
  const metrics = summarizeInstitutional(selectInstitutionalScope(source, { model: empty }));
  assert.equal(metrics.registrations, 0);
  for (const key of ['attendanceRate', 'participationTraceability', 'costPerIdentifiedParticipantCents', 'responseRate',
    'reportedApplicationRateAmongResponses', 'coworkOccupancy', 'coworkCostPerUsedHourCents', 'budgetExecutionRate',
    'serviceResolutionRate', 'serviceResolutionDaysMean', 'serviceResolutionDaysMedian', 'matureServiceOnTimeRate'] as const) assert.equal(metrics[key], null);
  const cohort = summarizeInstitutional(selectInstitutionalScope(source, { professionalIds: [] }));
  assert.equal(cohort.registrations, 0);
  assert.equal(cohort.distinctParticipants, 0);
  assert.equal(cohort.costPerIdentifiedParticipantCents, null);
  assert(cohort.executedCents > 0 && cohort.coworkAvailableDeskHours > 0);
  const noPrograms = summarizeInstitutional(selectInstitutionalScope(source, { programIds: [] }));
  assert.equal(noPrograms.executedCents, 0);
  assert.equal(noPrograms.activities, 0);
});

test('a zero-use cowork has no cost-per-used-hour ratio and retains real available capacity', () => {
  const zeroUse = { ...model, coworkUsage: [] };
  const metrics = summarizeInstitutional(selectInstitutionalScope(source, { model: zeroUse, programIds: ['coworkings'] }));
  assert(metrics.coworkAvailableDeskHours > 0);
  assert.equal(metrics.coworkUsedDeskHours, 0);
  assert.equal(metrics.coworkOccupancy, 0);
  assert.equal(metrics.coworkCostPerUsedHourCents, null);
  assert(buildCoworkAnalysis(selectInstitutionalScope(source, { model: zeroUse, programIds: ['coworkings'] })).every(row => row.costPerUsedHourCents === null));
});

test('historical followup eligibility is recalculated from the observation date, not a later snapshot status', () => {
  const earlierSource = { ...source, anchor: '2026-07-01' };
  const metrics = summarizeInstitutional(selectInstitutionalScope(earlierSource, { model: fixture() }));
  assert.equal(metrics.eligibleFollowups, 0);
  assert.equal(metrics.respondedFollowups, 0);
  assert.equal(metrics.pendingEligibilityFollowups, 2);
  assert.equal(metrics.responseRate, null);
  assert.equal(metrics.reportedApplicationRateAmongResponses, null);
});

test('institutional CSV exports reconcile table counts, use hashes and retain missing identity without a manufactured beneficiary', () => {
  const directory = mkdtempSync(join(tmpdir(), 'crea-institutional-test-'));
  try {
    const result = exportInstitutional(directory);
    const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8'));
    assert.equal(result.tables, 9);
    assert.equal(manifest.synthetic, true);
    assert.equal(manifest.seedLabel, `${dataset.seed}+v6`);
    assert.equal(manifest.tables.reduce((total: number, row: { rows: number }) => total + row.rows, 0), result.rows);
    for (const table of manifest.tables) {
      const contents = readFileSync(join(directory, table.file));
      assert.equal(createHash('sha256').update(contents).digest('hex'), table.sha256);
      assert.equal(contents.subarray(0, 3).toString('hex'), 'efbbbf');
      assert.equal(contents.toString('utf8').split('\r\n').length - 2, table.rows);
      assert(table.grain.length > 5);
    }
    const participation = readFileSync(join(directory, 'participacoes.csv'), 'utf8');
    assert.match(participation, /Identificador não informado/);
    assert.equal(manifest.tables.find((row: { file: string }) => row.file === 'participacoes.csv').rows, model.participation.length);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('CSV guards spreadsheet text formulas while preserving numeric values and empty missing data', () => {
  assert.equal(institutionalCsvCell('=SUM(A1)'), '"\'=SUM(A1)"');
  assert.equal(institutionalCsvCell('@import'), '"\'@import"');
  assert.equal(institutionalCsvCell(-812), '"-812"');
  assert.equal(institutionalCsvCell(1_234), '"1234"');
  assert.equal(institutionalCsvCell(undefined), '""');
  assert.equal(institutionalCsvCell('Oficina "A"'), '"Oficina ""A"""');
});
