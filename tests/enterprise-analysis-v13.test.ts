import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { defaultFilters } from '../src/domain/types.ts';
import type { Dataset, Filters } from '../src/domain/types.ts';
import { selectEnterpriseScope } from '../src/enterprise-v10/filters.ts';
import { buildEnterpriseModel } from '../src/enterprise-v10/model.ts';
import { buildEnterpriseAnalysis } from '../src/enterprise-v13/analysis.ts';

function fixture(): Dataset {
  const companies = ['A', 'B', 'C', 'D'].map((id, index) => ({ ...dataset.companies[index], id }));
  const city = dataset.cities[0];
  const establishments = ['A1', 'A2', 'B1', 'C1', 'D1'].map((id, index) => ({ ...dataset.establishments[index], id,
    companyId: id[0], cityId: city.id, greId: city.greId, creaCityId: city.id, openedAt: '2025-01-01',
    rfbStatus: id === 'A1' ? 'Baixada' as const : 'Ativa' as const,
  }));
  const registrations = ['A', 'B', 'C', 'D'].map(id => ({ id: `R${id}`, companyId: id, establishmentId: `${id}1`,
    requestedAt: '2025-11-01', startedAt: id === 'D' ? '2026-01-20' : '2025-12-01',
    type: 'Registro' as const, status: id === 'B' ? 'Inativo' as const : 'Ativo' as const,
  }));
  const movements: Dataset['movements'] = registrations.map(row => ({ id: `N${row.id}`, registrationId: row.id,
    companyId: row.companyId, establishmentId: row.establishmentId, date: row.startedAt, type: 'Novo registro' }));
  movements.push(
    { id: 'B-close', registrationId: 'RB', companyId: 'B', establishmentId: 'B1', date: '2026-01-04', type: 'Baixa' },
    { id: 'B-reopen', registrationId: 'RB', companyId: 'B', establishmentId: 'B1', date: '2026-01-08', type: 'Reativação' },
    { id: 'C-close', registrationId: 'RC', companyId: 'C', establishmentId: 'C1', date: '2026-01-04', type: 'Cancelamento' },
  );
  const arts = ['A-old', 'A-new', 'B-new', 'C-new'].map((id, index) => ({ ...dataset.arts[index], id,
    companyId: id[0], registrationId: `R${id[0]}`, date: index === 0 ? '2025-12-20' : '2026-01-02' }));
  const caos: Dataset['caos'] = [
    { id: 'CAO-A1', companyId: 'A', requestedAt: '2025-12-21', issuedAt: '2025-12-28', status: 'Emitida', artIds: ['A-old'], activity: 'Serviço técnico' },
    { id: 'CAO-A2', companyId: 'A', requestedAt: '2026-01-03', issuedAt: '2026-01-07', status: 'Revogada', artIds: ['A-old', 'A-new'], activity: 'Serviço técnico' },
    { id: 'CAO-B', companyId: 'B', requestedAt: '2026-01-03', issuedAt: '2026-01-08', status: 'Emitida', artIds: ['B-new'], activity: 'Serviço técnico' },
  ];
  return { ...dataset, companies, establishments, registrations, movements, arts, caos,
    technicalLinks: [], contracts: [], invoices: [], cases: [], qualityEvents: [], employment: [], publicRows: [],
    snapshotDate: '2026-01-10', months: ['2025-12', '2026-01'],
  };
}
function analyze(data: Dataset, filters: Partial<Filters> = {}, selected?: string[]) {
  const scope = selectEnterpriseScope(data, { ...defaultFilters, period: 2, ...filters }, selected);
  const model = buildEnterpriseModel(scope);
  return { scope, model, analysis: buildEnterpriseAnalysis(scope, model) };
}

test('V13 company universe partitions current, historical and never registered roots without counting branches twice', () => {
  const { analysis } = analyze(fixture());
  assert.deepEqual(analysis.universe.companyRows.map(row => [row.count, row.companyIds]), [[2, ['A', 'B']], [1, ['C']], [1, ['D']]]);
  assert.equal(analysis.universe.companies, 4);
  assert.equal(analysis.universe.establishments, 5);
  assert.equal(analysis.universe.registrations, 3, 'Future first registration is not historical at this cut');
  assert.equal(analysis.universe.currentRegistrations, 2);
  assert.equal(analysis.universe.currentEstablishments, 2);
  assert.equal(analysis.universe.historicalEstablishments, 3);
  assert.equal(analysis.universe.companyRows.reduce((sum, row) => sum + row.count, 0), 4);
});

test('V13 Receita comparison uses exact complete CNPJ and ledger vigency, not source labels or company-root coverage', () => {
  const { analysis } = analyze(fixture());
  assert.deepEqual(analysis.registryComparison.map(row => row.count), [1, 1, 0, 0]);
  assert.deepEqual(analysis.registryComparison[0].establishmentIds, ['B1'], 'Reactivated B is current despite source Inativo label');
  assert.deepEqual(analysis.registryComparison[1].establishmentIds, ['A1'], 'CNPJ baixado remains visible for reconciliation');
  assert(!analysis.registryComparison.flatMap(row => row.establishmentIds).includes('A2'), 'Unregistered branch is not covered by the company registration');
  assert.equal(analysis.registryComparison.reduce((sum, row) => sum + row.count, 0), analysis.universe.currentEstablishments);
});

test('V13 multiple current records and duplicate source CNPJs preserve separate registration and establishment grains', () => {
  const data = fixture();
  data.registrations.push({ ...data.registrations[0], id: 'RA-2' });
  data.establishments.push({ ...data.establishments[0], id: 'A1-duplicate' });
  const { analysis } = analyze(data);
  assert.equal(analysis.universe.currentRegistrations, 3, 'Two valid records of one CNPJ stay separate records');
  assert.equal(analysis.universe.currentEstablishments, 2, 'Repeated CNPJ source row is one matched establishment');
  assert.equal(analysis.registryComparison[1].count, 1);
  assert.equal(analysis.universe.companyRows[0].count, 2);
});

test('V13 acervo reconciles document events while recomputing distinct companies over the whole window', () => {
  const { analysis, model } = analyze(fixture());
  assert.equal(analysis.acervo.arts, 4);
  assert.deepEqual(analysis.acervo.artCompanyIds, ['A', 'B', 'C']);
  assert.equal(analysis.acervo.caos, 3);
  assert.deepEqual(analysis.acervo.caoCompanyIds, ['A', 'B']);
  assert.equal(analysis.acervo.revokedCaos, 1, 'Later-revoked CAO remains an observed historical issuance');
  assert.equal(analysis.acervo.monthly.reduce((sum, row) => sum + row.arts, 0), 4);
  assert.equal(analysis.acervo.monthly.reduce((sum, row) => sum + row.caos, 0), 3);
  assert.equal(analysis.acervo.monthly.reduce((sum, row) => sum + row.caoCompanies, 0), 3);
  assert.equal(analysis.acervo.caoCompanyIds.length, 2, 'Distinct company count is not the sum of monthly distincts');
  assert.deepEqual(analysis.acervo.artIds, [...model.metrics.corporateActivity.factIds!].sort());
});

test('V13 CAO issue events require coherent company and documentary references and never fabricate issuance dates', () => {
  const data = fixture(), base = data.caos[0];
  data.caos.push(
    { ...base, id: 'missing-art', artIds: ['absent'] },
    { ...base, id: 'wrong-company', artIds: ['B-new'] },
    { ...base, id: 'future-art', artIds: ['A-new'] },
    { ...base, id: 'premature', requestedAt: '2026-01-01' },
    { ...base, id: 'unfinished', status: 'Pendente' },
    { ...base, id: 'no-date', issuedAt: undefined },
    { ...base, id: 'future-issue', requestedAt: '2026-01-11', issuedAt: '2026-01-20' },
    { ...base },
  );
  const { analysis } = analyze(data);
  assert.equal(analysis.acervo.caos, 3, 'Invalid rows, a future date and duplicate document ID do not inflate emissions');
  assert.deepEqual(analysis.acervo.invalidCaoIds, ['future-art', 'missing-art', 'premature', 'unfinished', 'wrong-company']);
  assert(!analysis.acervo.caoIds.includes('no-date'));
});

test('V13 filtering and period selection reduce event facts without altering the cut-date registry state', () => {
  const data = fixture(), selected = analyze(data, { period: 1 }, ['A']);
  assert.equal(selected.analysis.universe.companies, 1);
  assert.equal(selected.analysis.universe.establishments, 2);
  assert.equal(selected.analysis.universe.currentEstablishments, 1);
  assert.equal(selected.analysis.acervo.monthly.length, 1);
  assert.equal(selected.analysis.acervo.arts, 1);
  assert.equal(selected.analysis.acervo.caos, 1);
  assert.deepEqual(selected.analysis.acervo.caoCompanyIds, ['A']);
  const empty = analyze(data, {}, []);
  assert(empty.analysis.universe.companyRows.every(row => row.count === 0));
  assert(empty.analysis.registryComparison.every(row => row.count === 0));
  assert.equal(empty.analysis.acervo.arts, 0); assert.equal(empty.analysis.acervo.caos, 0);
});

test('V13 contextual views preserve alphanumeric identifiers and reject invalid CNPJs from exact matches', () => {
  const data = fixture(); data.establishments[0].cnpj = '12.ABC.345/01DE-35';
  const a = analyze(data).analysis;
  assert.equal(a.universe.currentEstablishments, 2);
  assert.equal(a.registryComparison[1].count, 1);
  const invalid = structuredClone(data); invalid.establishments[0].cnpj = '12.ABC.345/01DE-36';
  const b = analyze(invalid).analysis;
  assert.equal(b.universe.currentEstablishments, 1);
  assert.equal(b.universe.invalidCnpjEstablishments, 1);
  assert.equal(b.universe.currentRegistrations, 2, 'Internal record grain is distinct from valid external CNPJ matching');
});

test('V13 seeded production-size contextual totals reconcile to the shared 17-indicator model', () => {
  const { analysis, model } = analyze(dataset, { period: 12 });
  assert.deepEqual(analysis.universe.companyRows.map(row => row.count), [1908, 663, 429]);
  assert.equal(analysis.universe.companyRows[0].count, model.metrics.base.value);
  assert.equal(analysis.universe.companies, 3000); assert.equal(analysis.universe.establishments, 3600);
  assert.equal(analysis.universe.currentRegistrations, 2157);
  assert.deepEqual(analysis.registryComparison.map(row => row.count), [1863, 173, 63, 58]);
  assert.equal(analysis.acervo.arts, model.metadata.corporateArtCount);
  assert.equal(analysis.acervo.artCompanyIds.length, model.metrics.corporateActivity.numerator);
  assert.equal(analysis.acervo.caos, 402); assert.equal(analysis.acervo.revokedCaos, 52);
  for (const row of analysis.registryComparison) {
    assert.equal(new Set(row.companyIds).size, row.companyIds.length);
    assert.equal(new Set(row.establishmentIds).size, row.count);
  }
});
