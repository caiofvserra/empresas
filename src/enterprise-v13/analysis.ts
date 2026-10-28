import type { Scope } from '../domain/engine';
import type { Dataset, Establishment, Registration } from '../domain/types';
import { isValidEnterpriseCnpj, normalizeEnterpriseCnpj } from '../enterprise-v10/data';
import type { EnterpriseModel } from '../enterprise-v10/types';

export interface EnterpriseAnalysisRow {
  name: string; count: number; companyIds: string[];
}
export interface RegistryComparisonRow extends EnterpriseAnalysisRow {
  establishmentIds: string[];
}
export interface EnterpriseAcervoMonth {
  month: string; arts: number; caos: number; artCompanies: number; caoCompanies: number;
  artCompanyIds: string[]; caoCompanyIds: string[];
}
export interface EnterpriseAnalysis {
  universe: {
    companyRows: EnterpriseAnalysisRow[];
    companies: number; establishments: number; registrations: number;
    currentRegistrations: number; currentEstablishments: number; historicalEstablishments: number;
    invalidCnpjEstablishments: number;
  };
  registryComparison: RegistryComparisonRow[];
  acervo: {
    monthly: EnterpriseAcervoMonth[]; arts: number; caos: number;
    artCompanyIds: string[]; caoCompanyIds: string[]; artIds: string[]; caoIds: string[];
    revokedCaos: number; invalidCaoIds: string[];
  };
}

const unique = (values: string[]) => [...new Set(values)].sort();
const cache = new WeakMap<Scope, EnterpriseAnalysis>();
const states = new WeakMap<Dataset, Map<string, Set<string>>>();

/** Same dated movement rule as the enterprise model: source status labels never
 * back-project current vigency. Future events do not activate past records. */
function activeRegistrations(dataset: Dataset, cut: string): Set<string> {
  let byCut = states.get(dataset);
  if (!byCut) { byCut = new Map(); states.set(dataset, byCut); }
  const saved = byCut.get(cut); if (saved) return saved;
  const movements = new Map<string, Dataset['movements']>();
  for (const row of dataset.movements) {
    const bucket = movements.get(row.registrationId) ?? [];
    bucket.push(row); movements.set(row.registrationId, bucket);
  }
  const active = new Set<string>();
  for (const row of dataset.registrations) {
    const history = [...(movements.get(row.id) ?? [])].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    if (!history.length) {
      if (row.startedAt <= cut && (!row.ceasedAt || row.ceasedAt > cut)) active.add(row.id);
      continue;
    }
    let opened = false;
    for (const event of history) {
      if (event.date > cut) break;
      opened = event.type === 'Novo registro' || event.type === 'Reativação';
    }
    if (opened) active.add(row.id);
  }
  byCut.set(cut, active); return active;
}

/** Contextual views complement the controlled 17 measures without changing their
 * denominators. Unit changes are explicit: company, CNPJ, registration, document. */
export function buildEnterpriseAnalysis(scope: Scope, model: EnterpriseModel): EnterpriseAnalysis {
  const saved = cache.get(scope); if (saved) return saved;
  const { dataset, anchor } = scope;
  const inPeriod = (date: string | undefined) => Boolean(date && date >= model.metadata.start && date <= anchor);
  const scopeIds = new Set(scope.companies.map(row => row.id));
  const history = [...new Map(scope.registrations.filter(row => row.startedAt <= anchor && scopeIds.has(row.companyId)).map(row => [row.id, row])).values()];
  const historicalCompanies = new Set(history.map(row => row.companyId));
  const activeIds = new Set(model.metadata.activeCompanyIds.filter(id => scopeIds.has(id)));
  const companyRows: EnterpriseAnalysisRow[] = [
    { name: 'Registro CREA-SP vigente', count: activeIds.size, companyIds: unique([...activeIds]) },
    { name: 'Histórico CREA sem vigência', count: 0, companyIds: unique([...historicalCompanies].filter(id => !activeIds.has(id))) },
    { name: 'Sem histórico no CREA-SP', count: 0, companyIds: unique([...scopeIds].filter(id => !historicalCompanies.has(id) && !activeIds.has(id))) },
  ].map(row => ({ ...row, count: row.companyIds.length }));
  const currentRecordIds = new Set(model.metrics.base.factIds ?? []);
  const currentRecords = history.filter(row => currentRecordIds.has(row.id));
  const globalActive = activeRegistrations(dataset, anchor);
  const globalEstablishments = new Map(dataset.establishments.map(row => [row.id, row]));
  const recordsByCnpj = new Map<string, Registration[]>();
  for (const registration of dataset.registrations) {
    const establishment = globalEstablishments.get(registration.establishmentId);
    if (!establishment || !isValidEnterpriseCnpj(establishment.cnpj)) continue;
    const key = normalizeEnterpriseCnpj(establishment.cnpj);
    const bucket = recordsByCnpj.get(key) ?? []; bucket.push(registration); recordsByCnpj.set(key, bucket);
  }
  // Canonical full-CNPJ rows, not root matches. Equal CNPJs in source records are
  // counted once; another branch with the same company root is not covered.
  const canonical = new Map<string, Establishment>();
  for (const establishment of [...scope.establishments].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!isValidEnterpriseCnpj(establishment.cnpj) || establishment.openedAt > anchor) continue;
    const key = normalizeEnterpriseCnpj(establishment.cnpj);
    if (!canonical.has(key)) canonical.set(key, establishment);
  }
  const exactCurrent = [...canonical].filter(([key]) => recordsByCnpj.get(key)?.some(row => globalActive.has(row.id))).map(([, row]) => row);
  const historicalEstablishments = [...canonical].filter(([key]) => recordsByCnpj.get(key)?.some(row => row.startedAt <= anchor)).length;
  const statuses: Establishment['rfbStatus'][] = ['Ativa', 'Baixada', 'Suspensa', 'Inapta'];
  const registryComparison = statuses.map(status => {
    const rows = exactCurrent.filter(row => row.rfbStatus === status);
    return { name: `Receita: ${status}`, count: rows.length, companyIds: unique(rows.map(row => row.companyId)), establishmentIds: rows.map(row => row.id).sort() };
  });

  // ART uses the same explicit corporate cohort/fact IDs as the activity measure.
  const corporateIds = new Set(model.metrics.corporateActivity.factIds ?? []);
  const arts = [...new Map(scope.arts.filter(row => corporateIds.has(row.id) && scopeIds.has(row.companyId) && inPeriod(row.date)).map(row => [row.id, row])).values()];
  const allArts = new Map(dataset.arts.map(row => [row.id, row]));
  const issued = [...new Map(scope.caos.filter(row => row.issuedAt && inPeriod(row.issuedAt)).map(row => [row.id, row])).values()];
  const validCao = (row: typeof issued[number]) => scopeIds.has(row.companyId)
    && (row.status === 'Emitida' || row.status === 'Revogada')
    && Boolean(row.issuedAt && row.requestedAt <= row.issuedAt)
    && row.artIds.length > 0
    && row.artIds.every(id => {
      const art = allArts.get(id);
      return Boolean(art && art.companyId === row.companyId && art.date <= row.issuedAt!);
    });
  const caos = issued.filter(validCao), invalidCaoIds = issued.filter(row => !validCao(row)).map(row => row.id).sort();
  const monthly = model.monthly.map(({ month }) => {
    const artRows = arts.filter(row => row.date.startsWith(month)), caoRows = caos.filter(row => row.issuedAt!.startsWith(month));
    const artCompanyIds = unique(artRows.map(row => row.companyId)), caoCompanyIds = unique(caoRows.map(row => row.companyId));
    return { month, arts: artRows.length, caos: caoRows.length, artCompanies: artCompanyIds.length, caoCompanies: caoCompanyIds.length, artCompanyIds, caoCompanyIds };
  });
  const result: EnterpriseAnalysis = {
    universe: {
      companyRows, companies: scopeIds.size, establishments: new Set(scope.establishments.map(row => row.id)).size,
      registrations: history.length, currentRegistrations: currentRecords.length,
      currentEstablishments: exactCurrent.length, historicalEstablishments,
      invalidCnpjEstablishments: scope.establishments.filter(row => !isValidEnterpriseCnpj(row.cnpj)).length,
    },
    registryComparison,
    acervo: { monthly, arts: arts.length, caos: caos.length, artCompanyIds: unique(arts.map(row => row.companyId)), caoCompanyIds: unique(caos.map(row => row.companyId)),
      artIds: arts.map(row => row.id).sort(), caoIds: caos.map(row => row.id).sort(), revokedCaos: caos.filter(row => row.status === 'Revogada').length, invalidCaoIds },
  };
  cache.set(scope, result); return result;
}
