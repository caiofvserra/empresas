import assert from 'node:assert/strict';
import test from 'node:test';
import { dataset, generateDataset } from '../src/domain/dataset';
import { inWindow, isActiveLink, selectScope } from '../src/domain/engine';
import { defaultFilters } from '../src/domain/types';
import type { Filters } from '../src/domain/types';
import { buildProfessionalCohorts, buildProfessionalHistogram, buildProfessionalModel, buildProfessionalNetwork,
  buildProfessionalTerritory, exportProfessionalCsv, groupProfessionals, professionalIndicators,
  selectProfessionalScope, summarizeProfessionals } from '../src/domain/professionals';

const filters = (patch: Partial<Filters> = {}): Filters => ({ ...defaultFilters, ...patch });
const allCompany = selectScope(dataset, filters());
const all = selectProfessionalScope(allCompany);
const model = buildProfessionalModel(dataset);
const profiles = new Map(model.profiles.map(profile => [profile.id, profile]));
const links = new Map(dataset.technicalLinks.map(link => [link.id, link]));
const arts = new Map(dataset.arts.map(art => [art.id, art]));
const companies = new Set(dataset.companies.map(company => company.id));

test('professional enrichment is reproducible, seeded and preserves the canonical company dataset', () => {
  const sourceBefore = JSON.stringify(dataset);
  assert.deepEqual(buildProfessionalModel(generateDataset(dataset.seed)), model);
  assert.notDeepEqual(buildProfessionalModel(generateDataset(dataset.seed + 1)).profiles, model.profiles);
  assert.equal(JSON.stringify(dataset), sourceBefore);
  assert.equal(model.profiles.length, dataset.professionals.length);
  assert.equal(new Set(model.profiles.map(profile => profile.id)).size, model.profiles.length);
  assert.equal(model.metadata.synthetic, true);
  assert.equal(model.metadata.seed, dataset.seed);
});

test('education, domicile, identity and QSA relations preserve their declared referential integrity', () => {
  const cities = new Set(dataset.cities.map(city => city.id));
  for (const profile of model.profiles) {
    assert(cities.has(profile.cityId));
    assert(profile.registeredAt <= dataset.snapshotDate);
    assert(profile.statusSince >= profile.registeredAt && profile.statusSince <= dataset.snapshotDate);
    assert(profile.graduatedYear <= Number(profile.registeredAt.slice(0, 4)));
    const source = dataset.professionals.find(person => person.id === profile.id)!;
    assert.equal(profile.name, source.name);
    assert.equal(profile.registration, source.registration);
    assert(!Object.keys(profile).some(key => /cpf|salary|employer/i.test(key)), 'no fabricated personal public-employment match');
    const firstLink = dataset.technicalLinks.filter(link => link.professionalId === profile.id).map(link => link.startDate).sort()[0];
    if (firstLink) assert(profile.registeredAt < firstLink);
  }
  assert.equal(new Set(model.education.map(row => row.id)).size, model.education.length);
  for (const row of model.education) {
    assert(profiles.has(row.professionalId));
    assert(row.completedYear <= Number(profiles.get(row.professionalId)!.registeredAt.slice(0, 4)));
    assert.match(row.institutionId, /^IES-DEMO-/);
  }
  const safety = model.profiles.filter(profile => profile.modality === 'Segurança do trabalho');
  assert(safety.every(profile => model.education.some(row => row.professionalId === profile.id && row.level === 'Especialização')));
  assert.equal(new Set(model.qsa.map(row => row.id)).size, model.qsa.length);
  for (const row of model.qsa) {
    assert(companies.has(row.companyId));
    if (row.professionalId) assert(profiles.has(row.professionalId));
    if (row.matchStatus === 'Sem correspondência') assert.equal(row.professionalId, undefined);
    if (row.matchStatus === 'Sugestão por nome') assert.equal(row.reviewedAt, undefined);
    if (row.matchStatus === 'Confirmado por chave interna') assert(row.professionalId && row.reviewedAt);
  }
});

test('professional statuses reconcile, with active RT distinct from registration status and employment', () => {
  const metrics = summarizeProfessionals(all);
  assert.equal(metrics.professionals, metrics.activeProfessionals + metrics.interruptedProfessionals + metrics.cancelledProfessionals);
  assert.equal(metrics.professionals, metrics.withActiveLinks + metrics.withoutActiveLinks);
  assert.equal(metrics.withActiveLinks, new Set(dataset.technicalLinks.filter(link => isActiveLink(link, dataset.snapshotDate)).map(link => link.professionalId)).size);
  assert(metrics.activeLinks > metrics.withActiveLinks, 'link count must not be reported as distinct people');
  assert(metrics.activeProfessionals > metrics.withActiveLinks, 'active cadastral registration does not require an RT link');
  for (const link of all.activeLinks) assert.equal(profiles.get(link.professionalId)!.status, 'Ativo');
});

test('declared synthetic ART authorship references an existing person, ART and plausible active RT interval', () => {
  assert.equal(new Set(model.artAttributions.map(row => row.id)).size, model.artAttributions.length);
  assert.equal(new Set(model.artAttributions.map(row => row.artId)).size, model.artAttributions.length);
  assert(model.artAttributions.length > 0 && model.artAttributions.length < dataset.arts.length);
  for (const row of model.artAttributions) {
    const art = arts.get(row.artId)!;
    const link = links.get(row.technicalLinkId)!;
    assert(art && link && profiles.has(row.professionalId));
    assert.equal(row.companyId, art.companyId);
    assert.equal(row.companyId, link.companyId);
    assert.equal(row.professionalId, link.professionalId);
    assert.equal(art.modality, link.modality);
    assert(isActiveLink(link, art.date));
    assert.equal(row.method, 'Autoria sintética declarada');
    assert.equal(row.role, 'Autor declarado na demonstração');
  }
  const metrics = summarizeProfessionals(all);
  assert.equal(metrics.linkedArts, model.artAttributions.filter(row => inWindow(arts.get(row.artId)!.date, 12, dataset.snapshotDate)).length);
  assert.equal(metrics.artAuthors, new Set(all.artAttributions.map(row => row.professionalId)).size);
  assert.equal(metrics.artCompanies, new Set(all.artAttributions.map(row => row.companyId)).size);
  assert.equal(metrics.partnerCompanies, new Set(all.qsaConfirmed.map(row => row.companyId)).size);
  const authorIds = new Set(model.artAttributions.map(row => row.artId));
  assert.equal(metrics.unattributedArts, dataset.arts.filter(art => inWindow(art.date, 12, dataset.snapshotDate) && !authorIds.has(art.id)).length);
});

test('the complete professional universe retains people without any company or active RT relationship', () => {
  const everLinked = new Set(dataset.technicalLinks.map(link => link.professionalId));
  const neverLinked = dataset.professionals.filter(profile => !everLinked.has(profile.id));
  assert(neverLinked.length > 0);
  assert.equal(all.profiles.length, dataset.professionals.length);
  assert(neverLinked.every(profile => all.profileIds.has(profile.id)));
  const interrupted = selectProfessionalScope(allCompany, { statuses: ['Interrompido'] });
  assert(interrupted.profiles.length > 0);
  assert.equal(interrupted.activeLinks.length, 0);
  assert(interrupted.profiles.every(profile => profile.status === 'Interrompido'));
  assert.equal(summarizeProfessionals(interrupted).professionals, summarizeProfessionals(all).interruptedProfessionals);
});

test('geographic selections apply to professional domicile without requiring the linked company in the same city', () => {
  const professional = model.profiles.find(profile => all.activeLinks.some(link => link.professionalId === profile.id
    && dataset.establishments.find(establishment => establishment.companyId === link.companyId && establishment.branch === 'Matriz')!.cityId !== profile.cityId))!;
  assert(professional);
  const scope = selectProfessionalScope(selectScope(dataset, filters({ cityIds: [professional.cityId] })));
  assert.equal(scope.companyRestricted, false);
  assert(scope.profiles.every(profile => profile.cityId === professional.cityId));
  assert(scope.profileIds.has(professional.id));
  assert.equal(scope.technicalLinks.filter(link => link.professionalId === professional.id).length,
    dataset.technicalLinks.filter(link => link.professionalId === professional.id && link.startDate <= dataset.snapshotDate).length);
  const greId = dataset.cities.find(city => city.id === professional.cityId)!.greId;
  const regional = selectProfessionalScope(selectScope(dataset, filters({ greIds: [greId] })));
  assert(regional.profiles.every(profile => dataset.cities.find(city => city.id === profile.cityId)!.greId === greId));
});

test('company and CNAE restrictions traverse RT or confirmed QSA, never an unreviewed nominal suggestion', () => {
  const confirmedOnly = model.qsa.find(row => row.matchStatus === 'Confirmado por chave interna'
    && !dataset.technicalLinks.some(link => link.companyId === row.companyId && link.professionalId === row.professionalId))!;
  assert(confirmedOnly);
  const scope = selectProfessionalScope(selectScope(dataset, filters(), [confirmedOnly.companyId]), { companySubset: [confirmedOnly.companyId] });
  assert(scope.companyRestricted);
  assert(scope.profileIds.has(confirmedOnly.professionalId!));
  const expected = new Set([
    ...dataset.technicalLinks.filter(link => link.companyId === confirmedOnly.companyId && link.startDate <= dataset.snapshotDate).map(link => link.professionalId),
    ...model.qsa.filter(row => row.companyId === confirmedOnly.companyId && row.matchStatus === 'Confirmado por chave interna').map(row => row.professionalId),
  ]);
  assert.deepEqual(scope.profileIds, expected);
  assert(scope.technicalLinks.every(link => link.companyId === confirmedOnly.companyId));
  const suggestionOnly = model.qsa.find(row => row.matchStatus === 'Sugestão por nome'
    && !dataset.technicalLinks.some(link => link.companyId === row.companyId && link.professionalId === row.professionalId)
    && !model.qsa.some(other => other.companyId === row.companyId && other.professionalId === row.professionalId && other.matchStatus === 'Confirmado por chave interna'))!;
  assert(suggestionOnly);
  const suggestionScope = selectProfessionalScope(selectScope(dataset, filters(), [suggestionOnly.companyId]), { companySubset: [suggestionOnly.companyId] });
  assert(!suggestionScope.profileIds.has(suggestionOnly.professionalId!), 'name alone cannot create a real identity edge');
  const cnae = dataset.establishments.find(establishment => establishment.companyId === confirmedOnly.companyId && establishment.branch === 'Matriz')!.cnaeMain;
  const selectedCompanyScope = selectScope(dataset, filters({ cnaeCodes: [cnae] }));
  const cnaeScope = selectProfessionalScope(selectedCompanyScope);
  assert(cnaeScope.companyRestricted);
  assert(cnaeScope.technicalLinks.every(link => selectedCompanyScope.companyIds.has(link.companyId)));
});

test('professional cross-selections reconcile every related view and do not reassign aggregate employment', () => {
  const cohort = buildProfessionalCohorts(all)[0];
  const selected = selectProfessionalScope(allCompany, { professionalIds: cohort.professionalIds });
  assert.equal(selected.profiles.length, cohort.value);
  assert(selected.technicalLinks.every(link => selected.profileIds.has(link.professionalId)));
  assert(selected.qsaConfirmed.every(row => selected.profileIds.has(row.professionalId!)));
  assert(selected.artAttributions.every(row => selected.profileIds.has(row.professionalId)));
  assert.deepEqual(selected.employment, all.employment);
  assert.deepEqual(buildProfessionalTerritory(selected).map(row => [row.cityId, row.employment, row.growth]),
    buildProfessionalTerritory(all).map(row => [row.cityId, row.employment, row.growth]));
  const empty = selectProfessionalScope(allCompany, { professionalIds: [] });
  assert.equal(summarizeProfessionals(empty).professionals, 0);
  assert.equal(empty.arts.length, 0);
  assert.equal(empty.activeLinks.length, 0);
});

test('cohort matrices, company histograms and title/CNAE flows expose their correct count units', () => {
  for (const dimension of ['modality', 'title', 'city', 'status', 'cohort'] as const) {
    const rows = groupProfessionals(all, dimension);
    assert.equal(rows.reduce((sum, row) => sum + row.professionals, 0), all.profiles.length);
    assert.equal(rows.reduce((sum, row) => sum + row.activeLinks, 0), all.activeLinks.length);
  }
  assert.equal(buildProfessionalCohorts(all).reduce((sum, cell) => sum + cell.value, 0), all.profiles.length);
  assert.equal(buildProfessionalHistogram(all).reduce((sum, bin) => sum + bin.professionals, 0), all.profiles.length);
  for (const dimension of ['modality', 'title'] as const) {
    const network = buildProfessionalNetwork(all, dimension);
    assert.equal(new Set(network.nodes.map(node => node.id)).size, network.nodes.length);
    assert.equal(network.links.reduce((sum, row) => sum + row.value, 0), all.activeLinks.length);
    assert(network.links.every(row => row.professionalIds.length <= row.value && row.companyIds.length <= row.value));
  }
  const shorter = selectProfessionalScope(selectScope(dataset, filters({ period: 3 })));
  assert.equal(summarizeProfessionals(shorter).newProfessionals,
    shorter.profiles.filter(profile => inWindow(profile.registeredAt, 3, dataset.snapshotDate)).length);
});

test('professional exports respect permissions, the selected rows, CSV escaping and synthetic provenance', () => {
  assert.throws(() => exportProfessionalCsv(all, false), /não permite exportar/);
  const selected = selectProfessionalScope(allCompany, { professionalIds: [all.profiles[0].id] });
  const csv = exportProfessionalCsv(selected, true);
  assert(csv.startsWith('\uFEFF'));
  assert.equal(csv.split('\r\n').length, 2);
  assert(csv.includes(selected.profiles[0].registration));
  assert(csv.includes('Demonstração sintética'));
  assert(!csv.includes('CPF'));
  const injection = exportProfessionalCsv({ ...selected, profiles: [{ ...selected.profiles[0], name: '=HYPERLINK("bad")' }] }, true);
  assert(injection.includes('"\'=HYPERLINK(""bad"")"'));
  for (const indicator of professionalIndicators) {
    for (const field of ['id', 'name', 'concept', 'formula', 'unit', 'source', 'periodicity', 'limitations', 'owner'] as const) assert(indicator[field]);
  }
});
