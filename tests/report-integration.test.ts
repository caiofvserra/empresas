import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset';
import { defaultFilters } from '../src/domain/types';
import { isActiveLink, selectScope, windowBounds } from '../src/domain/engine';
import { selectProfessionalScope, summarizeProfessionals } from '../src/domain/professionals';
import { integratedCompanyFlow, joinedCompanyRegions } from '../src/report/OverviewReport';
import { buildProfessionalCohortMatrix, buildProfessionalEnterpriseConnections, buildProfessionalProduction, buildPublishedFormationRegistrationComparison, selectEducationForTerritory } from '../src/report/ProfessionalsReport';
import education from '../src/domain/external-education.json';
import published from '../src/domain/user-engineer-statistics.json';
import { buildEmploymentMapRows } from '../src/report/MarketReport';
import { summarize } from '../src/domain/engine';

const scope = selectScope(dataset, defaultFilters);
const professionals = selectProfessionalScope(scope);
const distinct = (values: string[]) => [...new Set(values)];

test('municipal employment map reconciles the last stock and remains independent of company size and individual CNPJ', () => {
  const scopes = [scope, selectScope(dataset, { ...defaultFilters, sizes: ['Grande empresa'] }), selectScope(dataset, defaultFilters, [dataset.companies[0].id])];
  for (const selected of scopes) {
    const rows = buildEmploymentMapRows(selected);
    assert.equal(rows.reduce((sum, row) => sum + row.employment, 0), summarize(selected).employees);
    assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
    assert.deepEqual(rows, buildEmploymentMapRows(scope));
  }
  const local = selectScope(dataset, { ...defaultFilters, cityIds: [dataset.cities[0].id], cboCodes: [dataset.cbos[0].code] });
  assert(buildEmploymentMapRows(local).every(row => row.id === dataset.cities[0].id));
  assert.equal(buildEmploymentMapRows(local).reduce((sum, row) => sum + row.employment, 0), summarize(local).employees);
});

test('integrated company Sankey conserves the distinct CREA universe through every layer', () => {
  for (const selected of [scope, selectScope(dataset, { ...defaultFilters, cityIds: [dataset.cities[0].id], sizes: ['Microempresa'] })]) {
    const flow = integratedCompanyFlow(selected);
    const registered = distinct(selected.registrations.map(row => row.companyId));
    assert.equal(flow.total, registered.length);
    assert.equal(flow.links.filter(row => row.source === 'Cadastro CREA').reduce((total, row) => total + row.value, 0), registered.length);
    const ends = flow.nodes.filter(row => !flow.links.some(link => link.source === row.name));
    assert.equal(ends.reduce((total, row) => total + row.ids.length, 0), registered.length);
    assert.deepEqual(distinct(ends.flatMap(row => row.ids)).sort(), [...registered].sort());
    for (const node of flow.nodes) {
      const incoming = flow.links.filter(row => row.target === node.name);
      const outgoing = flow.links.filter(row => row.source === node.name);
      if (incoming.length) assert.equal(incoming.reduce((total, row) => total + row.value, 0), node.ids.length);
      if (outgoing.length) assert.equal(outgoing.reduce((total, row) => total + row.value, 0), node.ids.length);
    }
  }
});

test('regional cross-source matrix assigns each company once and joins only its own facts', () => {
  const rows = joinedCompanyRegions(scope);
  const assigned = rows.flatMap(row => row.companyIds);
  assert.equal(new Set(assigned).size, scope.companies.length);
  assert.equal(assigned.length, scope.companies.length);
  const expected = [scope.registrations, scope.technicalLinks.filter(row => isActiveLink(row, scope.anchor)), scope.arts,
    scope.caos.filter(row => row.issuedAt && row.issuedAt >= windowBounds(scope.filters.period, scope.anchor).start && row.issuedAt <= scope.anchor), scope.contracts]
    .map(rows => distinct(rows.map(row => row.companyId)));
  for (let column = 0; column < expected.length; column++) {
    const ids = rows.flatMap(row => row.dimensions[column]);
    assert.equal(ids.length, new Set(ids).size, 'fact presence must not duplicate companies across GREs');
    assert.deepEqual([...ids].sort(), [...expected[column]].sort());
    rows.forEach(row => row.dimensions[column].forEach(id => assert(row.companyIds.includes(id))));
  }
});

test('professional cohort matrix counts unlinked people and reconciles its whole population', () => {
  const cohorts = buildProfessionalCohortMatrix(professionals);
  assert.equal(cohorts.cells.reduce((total, cell) => total + cell.value[2], 0), professionals.profiles.length);
  const ids = cohorts.cells.flatMap(cell => cell.professionalIds);
  assert.equal(ids.length, new Set(ids).size);
  assert.equal(professionals.profiles.length, 600);
  assert(summarizeProfessionals(professionals).withoutActiveLinks > 0);
});

test('professional-enterprise Sankey keeps RT and confirmed society bridges distinct', () => {
  const connections = buildProfessionalEnterpriseConnections(professionals);
  assert.equal(connections.filter(row => row.relation === 'RT vigente').reduce((total, row) => total + row.value, 0), professionals.activeLinks.length);
  assert.equal(connections.filter(row => row.relation === 'Sociedade confirmada').reduce((total, row) => total + row.value, 0), professionals.qsaConfirmed.filter(row => row.professionalId).length);
  for (const connection of connections) {
    assert(connection.value >= connection.professionalIds.length);
    assert(connection.value >= connection.companyIds.length);
    const bridge = connection.relation === 'RT vigente' ? professionals.activeLinks : professionals.qsaConfirmed;
    connection.companyIds.forEach(id => assert(bridge.some(row => row.companyId === id)));
    connection.professionalIds.forEach(id => assert(bridge.some(row => row.professionalId === id)));
  }
});

test('professional production and comparison derive only from explicit author-ART relations', () => {
  const production = buildProfessionalProduction(professionals);
  assert.equal(production.length, scope.filters.period);
  assert.equal(production.reduce((total, row) => total + row.arts, 0), professionals.arts.length);
  for (const row of production) {
    const arts = professionals.arts.filter(art => art.date.startsWith(row.month));
    const ids = new Set(arts.map(art => art.id));
    const authors = professionals.artAttributions.filter(bridge => ids.has(bridge.artId));
    assert.equal(row.authors, new Set(authors.map(bridge => bridge.professionalId)).size);
    assert.equal(row.arts, new Set(arts.map(art => art.id)).size);
  }
  const bounds = windowBounds(scope.filters.period, scope.anchor);
  const previous = selectProfessionalScope({ ...scope, anchor: bounds.previousEnd });
  const previousProduction = buildProfessionalProduction(previous);
  assert.equal(previousProduction.reduce((total, row) => total + row.arts, 0), previous.arts.length);
  assert(previousProduction.every(row => row.month < production[0].month));
});

test('municipal formation uses course geography and stays independent from synthetic company filters', () => {
  const city = dataset.cities.find(row => education.cities.some(observation => observation.ibgeCode === row.ibgeCode))!;
  const selected = selectEducationForTerritory(selectProfessionalScope(selectScope(dataset, { ...defaultFilters, cityIds: [city.id], sizes: ['Grande empresa'] })));
  const observation = education.cities.find(row => row.ibgeCode === city.ibgeCode)!;
  assert.equal(selected.annual.length, 1);
  assert.equal(selected.annual[0].year, 2024);
  assert.equal(selected.annual[0].graduates, observation.graduates);
  const corporate = selectEducationForTerritory(selectProfessionalScope(selectScope(dataset, { ...defaultFilters, cnaeCodes: [dataset.cnaes[0].code], sizes: ['Grande empresa'] })));
  assert.deepEqual(corporate.annual, education.annual);
  assert.equal(corporate.annual.at(-1)!.graduates, 19859);
});

test('formation and new registration comparison uses only observed São Paulo years, never Brazilian totals or fabricated zeros', () => {
  const rows = buildPublishedFormationRegistrationComparison();
  assert.deepEqual(rows.map(row => row.year), [2019, 2020, 2021, 2022]);
  for (const row of rows) {
    assert.equal(row.graduates, education.annual.find(value => value.year === row.year)!.graduates);
    assert.equal(row.registrations, published.annualRegistrations.find(value => value.uf === 'SP' && value.year === row.year && !value.partial)!.registrations);
    assert.notEqual(row.registrations, published.annualRegistrations.find(value => value.uf === 'BR' && value.year === row.year)!.registrations);
  }
  assert.equal(education.annual.at(-1)!.year, 2024);
  assert(!rows.some(row => row.year > 2022), 'unavailable CREA-SP years remain absent, never zero');
});
