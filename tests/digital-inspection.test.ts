import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset';
import { selectScope } from '../src/domain/engine';
import { defaultFilters } from '../src/domain/types';
import type { Dataset, Registration } from '../src/domain/types';
import { buildDigitalInspection, classifyDigitalObject, digitalRegistrationActive, exportDigitalInspectionCsv, isValidDigitalCnpj } from '../src/domain/digital-inspection';
import { buildDigitalMatchingFlow } from '../src/report/InspectionReport';

const scope = selectScope(dataset, defaultFilters);
const analysis = buildDigitalInspection(scope);
const unique = (values: string[]) => [...new Set(values)].sort();

function fixture(): Dataset {
  const branchCompanyId = dataset.establishments.find(row => row.branch === 'Filial')!.companyId;
  const companies = [dataset.companies.find(row => row.id === branchCompanyId)!, ...dataset.companies.filter(row => row.id !== branchCompanyId).slice(0, 2)].map(row => ({ ...row }));
  const main = companies.map(company => ({ ...dataset.establishments.find(row => row.companyId === company.id && row.branch === 'Matriz')!, rfbStatus: 'Ativa' as const }));
  const filial = { ...dataset.establishments.find(row => row.companyId === companies[0].id && row.branch === 'Filial')!, rfbStatus: 'Ativa' as const, cityId: dataset.cities[1].id, greId: dataset.cities[1].greId };
  const related = dataset.cnaes.find(row => row.classification === 'Relacionado')!.code;
  const depends = dataset.cnaes.find(row => row.classification === 'Depende de análise')!.code;
  const establishments = [...main, filial].map((row, index) => ({ ...row, openedAt: '2024-01-01', cnaeMain: '0000-0/00', cnaeSecondary: [index % 2 ? depends : related], cityId: row.id === filial.id ? dataset.cities[1].id : dataset.cities[0].id, greId: row.id === filial.id ? dataset.cities[1].greId : dataset.cities[0].greId }));
  const registrations: Registration[] = [
    { id: 'REG-A', companyId: companies[0].id, establishmentId: main[0].id, type: 'Registro', status: 'Ativo', requestedAt: '2024-01-15', startedAt: '2024-02-01' },
    { id: 'REG-C', companyId: companies[2].id, establishmentId: main[2].id, type: 'Registro', status: 'Inativo', requestedAt: '2024-01-15', startedAt: '2024-02-01', ceasedAt: '2026-08-01' },
  ];
  const movements: Dataset['movements'] = registrations.map((row, index) => ({ id: `MOV-${index}`, registrationId: row.id, companyId: row.companyId, establishmentId: row.establishmentId, date: '2024-02-01', type: 'Novo registro' }));
  movements.push({ id: 'MOV-C-END', registrationId: 'REG-C', companyId: companies[2].id, establishmentId: main[2].id, date: '2026-08-01', type: 'Baixa' });
  const publicRows: Dataset['publicRows'] = establishments.map((row, index) => ({ id: `RFB-${index}`, establishmentId: row.id, cnpj: row.cnpj, companyName: companies.find(company => company.id === row.companyId)!.name, cityId: row.cityId, cnae: row.cnaeMain, updatedAt: dataset.snapshotDate }));
  publicRows.push({ ...publicRows[0], id: 'RFB-DUP' });
  publicRows.push({ ...publicRows[0], id: 'RFB-INVALID', cnpj: publicRows[0].cnpj.slice(0, 13) + 'X' });
  return { ...dataset, companies, establishments, registrations, movements, publicRows, technicalLinks: [], arts: [], caos: [], invoices: [], cases: [], qualityEvents: [], contracts: [
    { id: 'PNCP-C', companyId: companies[2].id, establishmentId: main[2].id, buyerId: dataset.buyers[0].id, date: '2026-07-01', object: 'Manutenção preventiva de instalações elétricas', value: 120000, category: 'Manutenção' },
    { id: 'PNCP-B', companyId: companies[1].id, establishmentId: main[1].id, buyerId: dataset.buyers[0].id, date: '2026-07-01', object: 'Fornecimento de material de escritório', value: 20000, category: 'Fornecimento' },
  ] };
}

test('digital universe deduplicates source rows and reconciles mutually exclusive identities', () => {
  assert.equal(analysis.metrics.invalidSourceRows, 60);
  assert.equal(analysis.metrics.duplicatedSourceRows, 120);
  assert.equal(unique(analysis.companies.map(row => row.companyId)).length, analysis.metrics.eligibleCompanies);
  assert.equal(unique(analysis.companies.flatMap(row => row.cnpjs)).length, analysis.metrics.eligibleEstablishments);
  assert.equal(['exact-active', 'exact-inactive', 'root-suggestion', 'none'].reduce((sum, match) => sum + analysis.companies.filter(row => row.match === match).length, 0), analysis.metrics.eligibleCompanies);
  assert(analysis.metrics.eligibleCompanies < dataset.companies.length);
  for (const company of analysis.companies) assert(company.cnpjs.every(isValidDigitalCnpj));
});

test('Sankey conserves each distinct company through exact identity, vigency and RT', () => {
  for (const view of [analysis, buildDigitalInspection(selectScope(dataset, { ...defaultFilters, cityIds: [dataset.cities[0].id] }))]) {
    const flow = buildDigitalMatchingFlow(view);
    assert.equal(flow.total, view.companies.length);
    for (const node of flow.nodes) {
      const incoming = flow.links.filter(link => link.target === node.name);
      const outgoing = flow.links.filter(link => link.source === node.name);
      if (incoming.length) assert.equal(incoming.reduce((sum, link) => sum + link.value, 0), node.ids.length);
      if (outgoing.length) assert.equal(outgoing.reduce((sum, link) => sum + link.value, 0), node.ids.length);
    }
    const leaves = flow.nodes.filter(node => !flow.links.some(link => link.source === node.name));
    assert.equal(leaves.reduce((sum, node) => sum + node.ids.length, 0), flow.total);
    assert.deepEqual(unique(leaves.flatMap(node => node.ids)), unique(view.companies.map(row => row.companyId)));
  }
});

test('secondary related and depends-on-analysis CNAEs remain eligible without classifying registration duty', () => {
  const tiny = fixture(); const view = buildDigitalInspection(selectScope(tiny, defaultFilters));
  assert.equal(view.metrics.eligibleCompanies, 3);
  assert.equal(view.metrics.eligibleEstablishments, 4);
  assert.equal(view.metrics.invalidSourceRows, 1);
  assert.equal(view.metrics.duplicatedSourceRows, 1);
  assert(view.companies.some(row => row.classification === 'Depende de análise'));
  assert(view.companies.every(row => !row.cnaeCodes.includes('0000-0/00')));
  assert(view.evidenceRows.every(row => row.limitation.length > 40));
});

test('a root candidate for another establishment never becomes an exact match or active registration', () => {
  const tiny = fixture();
  const local = selectScope(tiny, { ...defaultFilters, cityIds: [dataset.cities[1].id] });
  const view = buildDigitalInspection(local);
  assert.equal(view.companies.length, 1);
  const company = view.companies[0];
  assert.equal(company.match, 'root-suggestion');
  assert.deepEqual(company.registrationIds, []);
  assert.deepEqual(company.activeRegistrationIds, []);
  assert.deepEqual(company.rootCandidateRegistrationIds, ['REG-A']);
  assert.equal(view.metrics.noCorrespondence, 0);
  assert.equal(view.metrics.rootSuggestions, 1);
  assert(company.signals.some(row => row.ruleId === 'DIG-02'));
  const whole = buildDigitalInspection(selectScope(tiny, defaultFilters));
  const region = whole.regions.find(row => row.id === dataset.cities[1].greId)!;
  assert.equal(region.coverage, 0);
  assert.deepEqual(region.rootSuggestionIds, [company.companyId]);
  assert.equal(whole.employmentContext.find(row => row.cityId === dataset.cities[1].id)?.coverage, 0);
});

test('lookup matches and RT remain independent of period and unrelated territorial filters', () => {
  const tiny = fixture();
  const a = tiny.companies[0].id;
  tiny.technicalLinks.push({ id: 'RT-A', companyId: a, professionalId: tiny.professionals[0].id, startDate: '2024-02-02', modality: tiny.professionals[0].modality });
  const whole = buildDigitalInspection(selectScope(tiny, defaultFilters)).companies.find(row => row.companyId === a)!;
  const recent = buildDigitalInspection(selectScope(tiny, { ...defaultFilters, period: 1 }, [a])).companies[0];
  assert.equal(whole.match, recent.match);
  assert.deepEqual(whole.activeRegistrationIds, recent.activeRegistrationIds);
  assert.deepEqual(recent.activeRtIds, ['RT-A']);
  assert(!recent.signals.some(row => row.ruleId === 'DIG-05'));
});

test('registration vigency follows cancellation and reactivation events at the observation date', () => {
  const tiny = fixture(); const registration = tiny.registrations[0];
  tiny.movements.push({ id: 'MOV-INT', registrationId: registration.id, companyId: registration.companyId, establishmentId: registration.establishmentId, date: '2026-02-01', type: 'Baixa' }, { id: 'MOV-REACT', registrationId: registration.id, companyId: registration.companyId, establishmentId: registration.establishmentId, date: '2026-07-01', type: 'Reativação' });
  assert.equal(digitalRegistrationActive(registration, tiny, '2026-05-31'), false);
  assert.equal(digitalRegistrationActive(registration, tiny, '2026-09-30'), true);
  assert.equal(digitalRegistrationActive({ ...registration, startedAt: '2026-10-01' }, tiny, '2026-09-30'), false);
});

test('textual rules preserve observed terms, ambiguity and no fabricated confidence or trained AI', () => {
  const technical = classifyDigitalObject('Manutenção de instalações elétricas da unidade');
  assert.equal(technical.engineering, true);
  assert.deepEqual(technical.terms, ['instalacoes eletricas']);
  assert.deepEqual(technical.ruleIds, ['TXT-02']);
  assert.equal(classifyDigitalObject('Serviços de operação e manutenção').engineering, false);
  assert.equal(classifyDigitalObject('Material de escritório').engineering, false);
  assert(!('confidence' in technical));
  assert.match(technical.method, /sem modelo treinado/);
});

test('contract convergence keeps IDs and snapshot limitation, without inferring missing ART from suppliers', () => {
  const tiny = fixture();
  const view = buildDigitalInspection(selectScope(tiny, defaultFilters));
  const company = view.companies.find(row => row.companyId === tiny.companies[2].id)!;
  const signal = company.signals.find(row => row.ruleId === 'DIG-04')!;
  assert.equal(company.match, 'exact-inactive');
  assert(signal.factIds.includes('PNCP-C'));
  assert(signal.factIds.includes('REG-C'));
  assert.match(signal.criteria, /instalacoes eletricas/);
  assert.match(signal.limitation, /não na data da execução/);
  assert.equal(company.contractArtLink, 'Vínculo contratual ART não disponível');
  const withArts = { ...tiny, arts: dataset.arts.filter(row => row.companyId === company.companyId) };
  assert.deepEqual(buildDigitalInspection(selectScope(withArts, defaultFilters)).companies.find(row => row.companyId === company.companyId)!.signals, company.signals);
});

test('all evidence source references exist and no employment fact is attached to individual companies', () => {
  const facts = new Set([...dataset.publicRows, ...dataset.registrations, ...dataset.technicalLinks, ...dataset.contracts, ...dataset.qualityEvents].map(row => row.id));
  const employment = new Set(dataset.employment.map(row => row.id));
  assert.equal(new Set(analysis.evidenceRows.map(row => row.id)).size, analysis.evidenceRows.length);
  for (const row of analysis.evidenceRows) {
    assert(scope.companyIds.has(row.companyId));
    assert(row.factIds.length > 0);
    assert(row.factIds.every(id => facts.has(id) && !employment.has(id)));
    assert(row.criteria.length > 20);
    assert(row.source.length > 10);
  }
});

test('CAGED territorial context is not reduced by individual CNPJ or size filters', () => {
  const projection = (view: ReturnType<typeof buildDigitalInspection>) => view.employmentContext.map(row => ({ cityId: row.cityId, employmentFactIds: row.employmentFactIds, balance: row.balance, stock: row.stock }));
  const subset = buildDigitalInspection(selectScope(dataset, defaultFilters, [analysis.companies[0].companyId]));
  const sized = buildDigitalInspection(selectScope(dataset, { ...defaultFilters, sizes: ['Grande empresa'] }));
  assert.deepEqual(projection(subset), projection(analysis));
  assert.deepEqual(projection(sized), projection(analysis));
  assert(subset.metrics.eligibleCompanies <= 1);
});

test('cross filters and exact evidence subset retain related source identities', () => {
  const chosen = analysis.companies.filter(row => row.signals.some(signal => signal.ruleId === 'DIG-04')).slice(0, 4);
  const restricted = buildDigitalInspection(selectScope(dataset, defaultFilters, chosen.map(row => row.companyId)));
  assert.deepEqual(restricted.companies.map(row => row.companyId).sort(), chosen.map(row => row.companyId).sort());
  for (const row of restricted.companies) assert.deepEqual(row.signals, analysis.companies.find(company => company.companyId === row.companyId)!.signals);
  const city = dataset.cities[0].id;
  const local = buildDigitalInspection(selectScope(dataset, { ...defaultFilters, cityIds: [city] }));
  assert(local.companies.every(row => row.cityIds.length === 1 && row.cityIds[0] === city));
});

test('CSV honours export permission, rule and exact evidence filters with formulas protected', () => {
  assert.throws(() => exportDigitalInspectionCsv(scope, false), /não permite exportar/);
  const chosen = analysis.evidenceRows.find(row => row.ruleId === 'DIG-04')!;
  const csv = exportDigitalInspectionCsv(scope, true, [chosen.companyId], chosen.ruleId, [chosen.id]);
  const lines = csv.replace(/^\uFEFF/, '').split('\r\n');
  assert.equal(lines.length, 2);
  assert(lines[1].includes(chosen.companyId));
  assert(lines[1].includes('DIG-04'));
  assert(lines[1].includes('Vínculo contratual ART não disponível'));
  assert(lines[1].includes(chosen.factIds.find(id => id.startsWith('PNCP'))!));
  assert.equal(exportDigitalInspectionCsv(scope, true, []).split('\r\n').length, 1);
  const tiny = fixture(); tiny.companies[0].name = '=HYPERLINK("x")';
  assert(exportDigitalInspectionCsv(selectScope(tiny, defaultFilters), true).includes("'=HYPERLINK"));
});
