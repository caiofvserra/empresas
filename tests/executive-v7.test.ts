import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset';
import { defaultFilters } from '../src/domain/types';
import { selectScope, summarize, windowBounds } from '../src/domain/engine';
import { selectProfessionalScope } from '../src/domain/professionals';
import { buildExecutiveEvolution, buildExecutiveProduction, buildExecutiveProfessionalFlow } from '../src/report/executive-analysis-v7';

const unique = (values: string[]) => [...new Set(values)].sort();
const base = selectScope(dataset, defaultFilters);
const scopes = [base, selectScope(dataset, { ...defaultFilters, greIds: ['GRE2'], period: 6 }),
  selectScope(dataset, { ...defaultFilters, sizes: ['Grande empresa'], period: 24 })];

test('executive professional flow assigns every selected person to exactly one terminal branch', () => {
  for (const scope of scopes) {
    const people = selectProfessionalScope(scope);
    const flow = buildExecutiveProfessionalFlow(scope);
    assert.equal(flow.total, people.profiles.length);
    const leaves = flow.nodes.filter(node => !flow.links.some(link => link.source === node.name));
    const assigned = leaves.flatMap(node => node.ids);
    assert.equal(assigned.length, new Set(assigned).size);
    assert.deepEqual(unique(assigned), unique(people.profiles.map(row => row.id)));
    for (const node of flow.nodes) {
      assert.equal(node.ids.length, new Set(node.ids).size);
      const incoming = flow.links.filter(link => link.target === node.name);
      const outgoing = flow.links.filter(link => link.source === node.name);
      if (incoming.length) assert.equal(incoming.reduce((sum, link) => sum + link.value, 0), node.ids.length);
      if (outgoing.length) assert.equal(outgoing.reduce((sum, link) => sum + link.value, 0), node.ids.length);
    }
  }
});

test('executive professional branches use distinct RT and explicitly declared author bridges', () => {
  const people = selectProfessionalScope(base);
  const rt = new Set(people.activeLinks.map(row => row.professionalId));
  const authors = new Set(people.artAttributions.map(row => row.professionalId));
  const flow = buildExecutiveProfessionalFlow(base);
  for (const node of flow.nodes.filter(node => node.name !== 'Profissionais')) {
    if (node.name === 'RT vigente' || node.name.endsWith(' · RT')) node.ids.forEach(id => assert(rt.has(id)));
    if (node.name === 'Sem RT' || node.name.endsWith(' · s/RT')) node.ids.forEach(id => assert(!rt.has(id)));
    if (node.name.startsWith('Autor ART')) node.ids.forEach(id => assert(authors.has(id)));
    if (node.name.startsWith('Sem ART')) node.ids.forEach(id => assert(!authors.has(id)));
  }
  const cohort = people.profiles.slice(0, 13).map(row => row.id);
  assert.deepEqual(unique(buildExecutiveProfessionalFlow(base, cohort).nodes[0].ids), unique(cohort));
  assert.equal(buildExecutiveProfessionalFlow(base, []).total, 0);
});

test('executive evolution reconciles event units and conserves monthly active-registration stock', () => {
  for (const scope of scopes) {
    const rows = buildExecutiveEvolution(scope);
    assert.equal(rows.length, scope.filters.period);
    const registrationIds = new Set(scope.registrations.map(row => row.id));
    const history = dataset.movements.filter(event => registrationIds.has(event.registrationId));
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const events = history.filter(event => event.date.startsWith(row.date.slice(0, 7)) && event.date <= scope.anchor);
      assert.equal(row.newRegistrations, events.filter(event => event.type === 'Novo registro').length);
      assert.equal(row.reactivations, events.filter(event => event.type === 'Reativação').length);
      assert.equal(row.closures, events.filter(event => event.type === 'Baixa').length);
      assert.equal(row.cancellations, events.filter(event => event.type === 'Cancelamento').length);
      assert.equal(row.net, row.newRegistrations + row.reactivations - row.closures - row.cancellations);
      assert.deepEqual(unique(row.companyIds), unique(scope.movements.filter(event => event.date.startsWith(row.date.slice(0, 7))).map(event => event.companyId)));
      if (index) assert.equal(row.base - rows[index - 1].base, row.net);
    }
    assert.equal(rows.at(-1)!.base, scope.registrations.filter(row => row.status === 'Ativo').length);
  }
});

test('executive comparison aligns previous event months to the same selected registration cohort', () => {
  for (const scope of scopes) {
    const bounds = windowBounds(scope.filters.period, scope.anchor);
    const registrationIds = new Set(scope.registrations.map(row => row.id));
    for (const row of buildExecutiveEvolution(scope)) {
      const date = new Date(`${row.date}T00:00:00Z`);
      date.setUTCMonth(date.getUTCMonth() - scope.filters.period);
      const month = date.toISOString().slice(0, 7);
      assert.equal(row.previousNew, dataset.movements.filter(event => registrationIds.has(event.registrationId)
        && event.type === 'Novo registro' && event.date.startsWith(month)
        && event.date >= bounds.previousStart && event.date <= bounds.previousEnd).length);
    }
  }
});

test('executive ART and CAO production reconcile independent event counts and company subsets', () => {
  for (const scope of scopes) {
    const rows = buildExecutiveProduction(scope);
    const bounds = windowBounds(scope.filters.period, scope.anchor);
    assert.equal(rows.length, scope.filters.period);
    assert.equal(rows.reduce((sum, row) => sum + row.arts, 0), summarize(scope).arts);
    assert.equal(rows.reduce((sum, row) => sum + row.caos, 0), scope.caos.filter(row => row.issuedAt && row.issuedAt >= bounds.start && row.issuedAt <= scope.anchor).length);
    for (const row of rows) {
      const arts = scope.arts.filter(art => art.date.startsWith(row.month));
      const caos = scope.caos.filter(cao => cao.issuedAt?.startsWith(row.month) && cao.issuedAt <= scope.anchor);
      assert.equal(row.arts, arts.length);
      assert.equal(row.caos, caos.length);
      assert.deepEqual(unique(row.artCompanyIds), unique(arts.map(art => art.companyId)));
      assert.deepEqual(unique(row.caoCompanyIds), unique(caos.map(cao => cao.companyId)));
      [...row.artCompanyIds, ...row.caoCompanyIds].forEach(id => assert(scope.companyIds.has(id)));
      const previousDate = new Date(`${row.month}-01T00:00:00Z`);
      previousDate.setUTCMonth(previousDate.getUTCMonth() - scope.filters.period);
      assert.equal(row.previousArts, dataset.arts.filter(art => scope.companyIds.has(art.companyId)
        && art.date.startsWith(previousDate.toISOString().slice(0, 7))).length);
    }
  }
});

test('executive empty company subsets do not fabricate event production or professional identity', () => {
  const empty = selectScope(dataset, defaultFilters, []);
  assert(buildExecutiveEvolution(empty).every(row => row.base === 0 && row.net === 0 && !row.companyIds.length));
  assert(buildExecutiveProduction(empty).every(row => !row.arts && !row.caos && !row.artCompanyIds.length && !row.caoCompanyIds.length));
  assert.equal(buildExecutiveProfessionalFlow(empty).total, 0);
});
