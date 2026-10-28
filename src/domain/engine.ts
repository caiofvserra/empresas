import type { Art, Cao, Classification, Company, Contract, Dataset, EmploymentFact, Establishment, Filters, InspectionCase, Invoice, Movement, Priority, PublicRow, QualityEvent, Registration, TechnicalLink } from './types';

/** Pure analytical layer. Every count is derived from the same relational scope. */
export interface Scope {
  dataset: Dataset; filters: Filters; anchor: string;
  companies: Company[]; establishments: Establishment[]; registrations: Registration[];
  movements: Movement[]; technicalLinks: TechnicalLink[]; arts: Art[]; caos: Cao[];
  invoices: Invoice[]; cases: InspectionCase[]; contracts: Contract[];
  employment: EmploymentFact[]; qualityEvents: QualityEvent[];
  companyIds: Set<string>; establishmentIds: Set<string>; employmentScopeLimited: boolean;
}

const DEFAULT_ANCHOR = '2026-09-30';
const day = 86_400_000;
const dateOnly = (value: string) => value.length === 7 ? `${value}-01` : value.slice(0, 10);
const stamp = (value: string) => Date.parse(`${dateOnly(value)}T00:00:00Z`);
const iso = (date: Date) => date.toISOString().slice(0, 10);
const normalized = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const digits = (text: string) => text.replace(/\D/g, '');
const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
const median = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); return sorted.length ? (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2 : 0; };
const sum = <T>(rows: T[], pick: (row: T) => number) => rows.reduce((total, row) => total + pick(row), 0);
const countDistinct = <T>(rows: T[], pick: (row: T) => string) => new Set(rows.map(pick)).size;
const matches = (selected: string[], value: string) => !selected.length || selected.includes(value);
const elapsedDays = (start: string, end: string) => Math.max(0, (stamp(end) - stamp(start)) / day);
interface Indexes {
  companies: Map<string, Company>;
  cities: Map<string, Dataset['cities'][number]>;
  cnaes: Map<string, Dataset['cnaes'][number]>;
  registered: Set<string>;
  internalEstablishments: Establishment[];
  internalByCnpj: Map<string, Establishment[]>;
  internalByRoot: Map<string, Establishment[]>;
  names: Map<string, Set<string>>;
  establishmentsByCompany: Map<string, Establishment[]>;
  registrationsByCompany: Map<string, Registration[]>;
  qualityByCompany: Map<string, QualityEvent[]>;
  contractsByCompany: Map<string, Contract[]>;
  casesByCompany: Map<string, InspectionCase[]>;
}
const indexCache = new WeakMap<Dataset, Indexes>();
const nameTokens = (name: string) => new Set(normalized(name).split(' ').filter(token => token.length > 2 && !['ltda', 'empresa', 'servicos'].includes(token)));
function indexes(dataset: Dataset): Indexes {
  const cached = indexCache.get(dataset);
  if (cached) return cached;
  const byCompany = <T extends { companyId: string }>(rows: T[]) => {
    const map = new Map<string, T[]>();
    for (const row of rows) { const bucket = map.get(row.companyId) ?? []; bucket.push(row); map.set(row.companyId, bucket); }
    return map;
  };
  const registered = new Set(dataset.registrations.map(row => row.companyId));
  const internalEstablishments = dataset.establishments.filter(row => registered.has(row.companyId));
  const internalByCnpj = new Map<string, Establishment[]>();
  const internalByRoot = new Map<string, Establishment[]>();
  for (const row of internalEstablishments) {
    const cnpj = digits(row.cnpj); const root = cnpj.slice(0, 8);
    internalByCnpj.set(cnpj, [...(internalByCnpj.get(cnpj) ?? []), row]);
    internalByRoot.set(root, [...(internalByRoot.get(root) ?? []), row]);
  }
  const result: Indexes = { companies: new Map(dataset.companies.map(row => [row.id, row])), cities: new Map(dataset.cities.map(row => [row.id, row])), cnaes: new Map(dataset.cnaes.map(row => [row.code, row])), registered, internalEstablishments, internalByCnpj, internalByRoot, names: new Map(dataset.companies.map(row => [row.id, nameTokens(row.name)])), establishmentsByCompany: byCompany(dataset.establishments), registrationsByCompany: byCompany(dataset.registrations), qualityByCompany: byCompany(dataset.qualityEvents), contractsByCompany: byCompany(dataset.contracts), casesByCompany: byCompany(dataset.cases) };
  indexCache.set(dataset, result);
  return result;
}

export function windowBounds(period: number, anchor = DEFAULT_ANCHOR): { start: string; end: string; previousStart: string; previousEnd: string } {
  const end = new Date(`${anchor.slice(0, 10)}T00:00:00Z`);
  const months = Math.max(1, Math.floor(period || 12));
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - months + 1, 1));
  const previousStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - months, 1));
  const previousEnd = new Date(stamp(iso(start)) - day);
  return { start: iso(start), end: anchor.slice(0, 10), previousStart: iso(previousStart), previousEnd: iso(previousEnd) };
}
export function inWindow(date: string | undefined, period: number, anchor = DEFAULT_ANCHOR): boolean {
  if (!date) return false;
  const { start, end } = windowBounds(period, anchor);
  return dateOnly(date) >= start && dateOnly(date) <= end;
}
export function previousWindow(date: string | undefined, period: number, anchor = DEFAULT_ANCHOR): boolean {
  if (!date) return false;
  const { previousStart, previousEnd } = windowBounds(period, anchor);
  return dateOnly(date) >= previousStart && dateOnly(date) <= previousEnd;
}
export const isActiveLink = (link: TechnicalLink, anchor = DEFAULT_ANCHOR) => link.startDate <= anchor && (!link.endDate || link.endDate > anchor);

/** OR within a dimension, AND between dimensions; secondary CNAEs participate. */
export function selectScope(dataset: Dataset, filters: Filters, companySubset?: string[]): Scope {
  const anchor = dataset.snapshotDate;
  const { start: periodStart, end: periodEnd } = windowBounds(filters.period, anchor);
  const inPeriod = (date: string) => dateOnly(date) >= periodStart && dateOnly(date) <= periodEnd;
  const subset = companySubset === undefined ? undefined : new Set(companySubset);
  const index = indexes(dataset);
  const companiesById = index.companies;
  const cnaeByCode = index.cnaes;
  const selectedRegistrations = new Set(dataset.registrations.filter(registration => matches(filters.registrationStatuses, registration.status)).map(registration => registration.establishmentId));
  const query = filters.search.trim();
  const numericQuery = query !== '' && /^[\d\s./-]+$/.test(query);
  const searchDigits = digits(query);
  const searchName = normalized(query);
  const establishments = dataset.establishments.filter(establishment => {
    const company = companiesById.get(establishment.companyId);
    if (!company || subset && !subset.has(company.id)) return false;
    const cnaes = [establishment.cnaeMain, ...establishment.cnaeSecondary];
    if (!matches(filters.greIds, establishment.greId) || !matches(filters.cityIds, establishment.cityId) || !matches(filters.sizes, company.size) || !matches(filters.rfbStatuses, establishment.rfbStatus)) return false;
    if (filters.cnaeCodes.length && !filters.cnaeCodes.some(code => cnaes.includes(code))) return false;
    if (filters.onlyRelated && !cnaes.some(code => cnaeByCode.get(code)?.classification === 'Relacionado' || cnaeByCode.get(code)?.classification === 'Depende de análise')) return false;
    if (filters.registrationStatuses.length && !selectedRegistrations.has(establishment.id)) return false;
    if (query && (numericQuery ? digits(establishment.cnpj) !== searchDigits : !normalized(`${company.name} ${company.tradeName}`).includes(searchName))) return false;
    return true;
  });
  const establishmentIds = new Set(establishments.map(row => row.id));
  const companyIds = new Set(establishments.map(row => row.companyId));
  const registrations = dataset.registrations.filter(row => establishmentIds.has(row.establishmentId) && matches(filters.registrationStatuses, row.status));
  const registrationIds = new Set(registrations.map(row => row.id));
  const companyFact = <T extends { companyId: string }>(rows: T[]) => rows.filter(row => companyIds.has(row.companyId));
  const establishmentFact = <T extends { establishmentId: string }>(rows: T[]) => rows.filter(row => establishmentIds.has(row.establishmentId));
  const employment = dataset.employment.filter(row => {
    const city = index.cities.get(row.cityId);
    if (!city || !matches(filters.cityIds, row.cityId) || !matches(filters.greIds, city.greId) || !matches(filters.cnaeCodes, row.cnae) || !matches(filters.cboCodes ?? [], row.cbo)) return false;
    if (filters.onlyRelated && !['Relacionado', 'Depende de análise'].includes(cnaeByCode.get(row.cnae)?.classification ?? '')) return false;
    return inPeriod(row.month);
  });
  return {
    dataset, filters, anchor, companyIds, establishmentIds,
    companies: dataset.companies.filter(row => companyIds.has(row.id)), establishments, registrations,
    movements: dataset.movements.filter(row => registrationIds.has(row.registrationId) && inPeriod(row.date)),
    technicalLinks: companyFact(dataset.technicalLinks).filter(row => row.startDate <= anchor),
    arts: companyFact(dataset.arts).filter(row => inPeriod(row.date)),
    caos: companyFact(dataset.caos).filter(row => row.requestedAt <= anchor),
    invoices: companyFact(dataset.invoices),
    cases: establishmentFact(dataset.cases).filter(row => row.createdAt <= anchor),
    contracts: establishmentFact(dataset.contracts).filter(row => inPeriod(row.date)),
    employment, qualityEvents: establishmentFact(dataset.qualityEvents).filter(row => row.date <= anchor),
    employmentScopeLimited: Boolean(subset || query || filters.sizes.length || filters.rfbStatuses.length || filters.registrationStatuses.length),
  };
}

export interface Metrics {
  companies: number; establishments: number; registrations: number; activeRegistrations: number; inactiveRegistrations: number; cancelledRegistrations: number;
  registeredCompanies: number; activeCompanies: number; inactiveCompanies: number; notMatched: number; coverage: number;
  new30: number; closed30: number; net30: number; newRegistrations: number; closures: number; reactivations: number; cancellations: number; net: number;
  registrationDaysMean: number; registrationDaysMedian: number; tenureMonths: number;
  withRt: number; withoutRt: number; multiRt: number; activeLinks: number; distinctProfessionals: number; newLinks: number; closedLinks: number; linkDaysMean: number;
  caoRequested: number; caoIssued: number; caoRevoked: number; caoAnalysis: number; caoPending: number; caoDaysMean: number; caoDaysMedian: number; caoCompanies: number; arts: number; artValue: number; artReferences: number;
  financeUniverse: number; compliantCompanies: number; delinquentCompanies: number; compliance: number; openAmount: number; overdueAmount: number; recoveredAmount: number; installments: number; delayDaysMean: number;
  contractCount: number; contractValue: number; engineeringContracts: number; contractMissingCompanies: number;
  caseCount: number; highPriorityCases: number; forwardedCases: number; completedCases: number; caseDaysMean: number;
  employees: number; technicalEmployees: number; admissions: number; dismissals: number; employmentBalance: number;
  qualityEvents: number; qualityScore: number; multiEstablishmentCompanies: number; reactivatedCompanies: number; externalCompanies: number;
}

export const outstanding = (invoice: Invoice, anchor = DEFAULT_ANCHOR) => Math.max(0, invoice.amount - (!invoice.paymentDate || invoice.paymentDate <= anchor ? invoice.paidAmount : 0));

export function summarize(scope: Scope, period = scope.filters.period): Metrics {
  const { anchor, dataset } = scope;
  const registered = new Set(scope.registrations.map(row => row.companyId));
  const active = new Set(scope.registrations.filter(row => row.status === 'Ativo').map(row => row.companyId));
  const registrationIds = new Set(scope.registrations.map(row => row.id));
  const movements = dataset.movements.filter(row => registrationIds.has(row.registrationId) && inWindow(row.date, period, anchor));
  const movementCount = (type: Movement['type']) => movements.filter(row => row.type === type).length;
  const last30Start = iso(new Date(stamp(anchor) - 29 * day));
  const last30 = dataset.movements.filter(row => registrationIds.has(row.registrationId) && row.date >= last30Start && row.date <= anchor);
  const new30 = last30.filter(row => row.type === 'Novo registro').length;
  const closed30 = last30.filter(row => row.type === 'Baixa' || row.type === 'Cancelamento').length;
  const reactivated30 = last30.filter(row => row.type === 'Reativação').length;
  const newRegistrations = movementCount('Novo registro');
  const closures = movementCount('Baixa');
  const reactivations = movementCount('Reativação');
  const cancellations = movementCount('Cancelamento');
  const requestDurations = scope.registrations.filter(row => inWindow(row.startedAt, period, anchor)).map(row => elapsedDays(row.requestedAt, row.startedAt));
  const links = scope.technicalLinks.filter(row => isActiveLink(row, anchor));
  const linksPerCompany = new Map<string, number>();
  for (const row of links) linksPerCompany.set(row.companyId, (linksPerCompany.get(row.companyId) ?? 0) + 1);
  const rtCompanies = [...registered].filter(id => linksPerCompany.has(id));
  const issued = scope.caos.filter(row => inWindow(row.issuedAt, period, anchor));
  const caoDurations = issued.map(row => elapsedDays(row.requestedAt, row.issuedAt!));
  const eligibleInvoices = scope.invoices.filter(row => row.dueDate <= anchor && registered.has(row.companyId));
  const financialUniverse = new Set(eligibleInvoices.map(row => row.companyId));
  const late = eligibleInvoices.filter(row => row.dueDate < anchor && outstanding(row, anchor) > 0);
  const delinquent = new Set(late.map(row => row.companyId));
  const completed = scope.cases.filter(row => row.status === 'Concluída' && inWindow(row.completedAt, period, anchor));
  const openCases = scope.cases.filter(row => row.status !== 'Concluída');
  const latestEmploymentMonth = scope.employment.reduce((latest, row) => row.month > latest ? row.month : latest, '');
  const stock = scope.employment.filter(row => row.month === latestEmploymentMonth);
  const technicalCodes = new Set(dataset.cbos.filter(row => row.technical).map(row => row.code));
  const admissions = sum(scope.employment, row => row.admissions);
  const dismissals = sum(scope.employment, row => row.dismissals);
  const unresolved = scope.qualityEvents.filter(row => !row.resolved);
  const defectEstablishments = new Set(unresolved.map(row => row.establishmentId));
  const establishmentCounts = new Map<string, number>();
  for (const row of scope.establishments) establishmentCounts.set(row.companyId, (establishmentCounts.get(row.companyId) ?? 0) + 1);
  return {
    companies: scope.companies.length, establishments: scope.establishments.length, registrations: scope.registrations.length,
    activeRegistrations: scope.registrations.filter(row => row.status === 'Ativo').length,
    inactiveRegistrations: scope.registrations.filter(row => row.status === 'Inativo').length,
    cancelledRegistrations: scope.registrations.filter(row => row.status === 'Cancelado').length,
    registeredCompanies: registered.size, activeCompanies: active.size, inactiveCompanies: [...registered].filter(id => !active.has(id)).length,
    notMatched: scope.companies.length - registered.size, coverage: scope.companies.length ? registered.size / scope.companies.length * 100 : 0,
    new30, closed30, net30: new30 + reactivated30 - closed30,
    newRegistrations, closures, reactivations, cancellations, net: newRegistrations + reactivations - closures - cancellations,
    registrationDaysMean: mean(requestDurations), registrationDaysMedian: median(requestDurations),
    tenureMonths: mean(scope.registrations.map(row => elapsedDays(row.startedAt, row.ceasedAt && row.ceasedAt < anchor ? row.ceasedAt : anchor) / 30.4375)),
    withRt: rtCompanies.length, withoutRt: registered.size - rtCompanies.length, multiRt: [...registered].filter(id => (linksPerCompany.get(id) ?? 0) > 1).length,
    activeLinks: links.length, distinctProfessionals: countDistinct(links, row => row.professionalId),
    newLinks: scope.technicalLinks.filter(row => inWindow(row.startDate, period, anchor)).length,
    closedLinks: scope.technicalLinks.filter(row => inWindow(row.endDate, period, anchor)).length,
    linkDaysMean: mean(links.map(row => elapsedDays(row.startDate, anchor))),
    caoRequested: scope.caos.filter(row => inWindow(row.requestedAt, period, anchor)).length,
    caoIssued: issued.length, caoRevoked: scope.caos.filter(row => row.status === 'Revogada').length, caoAnalysis: scope.caos.filter(row => row.status === 'Em análise').length,
    caoPending: scope.caos.filter(row => row.status === 'Pendente' || row.status === 'Solicitada').length,
    caoDaysMean: mean(caoDurations), caoDaysMedian: median(caoDurations), caoCompanies: countDistinct(issued, row => row.companyId),
    arts: scope.arts.length, artValue: sum(scope.arts, row => row.value), artReferences: new Set(issued.flatMap(row => row.artIds)).size,
    financeUniverse: financialUniverse.size, compliantCompanies: financialUniverse.size - delinquent.size, delinquentCompanies: delinquent.size,
    compliance: financialUniverse.size ? (financialUniverse.size - delinquent.size) / financialUniverse.size * 100 : 0,
    openAmount: sum(scope.invoices, row => outstanding(row, anchor)), overdueAmount: sum(late, row => outstanding(row, anchor)),
    recoveredAmount: sum(scope.invoices.filter(row => row.recovered && inWindow(row.paymentDate, period, anchor)), row => row.paidAmount),
    installments: countDistinct(scope.invoices.filter(row => row.installmentPlan && outstanding(row, anchor) > 0), row => row.companyId),
    delayDaysMean: mean(late.map(row => elapsedDays(row.dueDate, anchor))),
    contractCount: scope.contracts.length, contractValue: sum(scope.contracts, row => row.value),
    engineeringContracts: scope.contracts.filter(row => classifyContract(row.object).engineering).length,
    contractMissingCompanies: countDistinct(scope.contracts.filter(row => !registered.has(row.companyId)), row => row.companyId),
    caseCount: openCases.length, highPriorityCases: openCases.filter(row => priorityFor(row.companyId, scope).score >= 65).length,
    forwardedCases: scope.cases.filter(row => row.status === 'Encaminhada').length, completedCases: completed.length,
    caseDaysMean: mean(completed.map(row => elapsedDays(row.createdAt, row.completedAt!))),
    employees: sum(stock, row => row.stock), technicalEmployees: sum(stock.filter(row => technicalCodes.has(row.cbo)), row => row.stock),
    admissions, dismissals, employmentBalance: admissions - dismissals, qualityEvents: unresolved.length,
    qualityScore: scope.establishments.length ? (1 - defectEstablishments.size / scope.establishments.length) * 100 : 0,
    multiEstablishmentCompanies: [...establishmentCounts.values()].filter(value => value > 1).length,
    reactivatedCompanies: countDistinct(dataset.movements.filter(row => scope.companyIds.has(row.companyId) && row.type === 'Reativação'), row => row.companyId),
    externalCompanies: scope.companies.filter(row => row.externalOnly).length,
  };
}

const classificationRules: { label: string; terms: string[]; confidence: number }[] = [
  { label: 'Engenharia elétrica', terms: ['eletrica', 'eletrico', 'subestacao', 'rede de energia', 'iluminacao'], confidence: 93 },
  { label: 'Engenharia civil', terms: ['obra', 'pavimentacao', 'construcao', 'ponte', 'edificacao', 'drenagem'], confidence: 91 },
  { label: 'Engenharia mecânica', terms: ['mecanica', 'elevador', 'climatizacao', 'ar condicionado', 'maquina'], confidence: 88 },
  { label: 'Engenharia ambiental / saneamento', terms: ['saneamento', 'esgoto', 'tratamento de agua', 'residuo', 'ambiental'], confidence: 87 },
  { label: 'Serviços de engenharia', terms: ['engenharia', 'laudo tecnico', 'projeto tecnico', 'topografia', 'geotecnia'], confidence: 90 },
];
export function classifyContract(text: string): Classification {
  const object = normalized(text);
  const hits = classificationRules.map(rule => ({ ...rule, terms: rule.terms.filter(term => object.includes(term)) })).filter(rule => rule.terms.length);
  const match = hits.sort((a, b) => b.terms.length - a.terms.length || b.confidence - a.confidence)[0];
  return match ? {
    label: match.label, confidence: Math.min(98, match.confidence + match.terms.length - 1), terms: match.terms,
    engineering: true, method: 'Regras textuais demonstrativas; sem modelo treinado',
    explanation: `Termos reconhecidos: ${match.terms.join(', ')}. O índice exprime força da regra, não probabilidade calibrada. A classificação depende de validação técnica e não determina obrigação de registro.`,
  } : {
    label: 'Objeto sem evidência textual suficiente', confidence: 35, terms: [], engineering: false,
    method: 'Regras textuais demonstrativas; sem modelo treinado',
    explanation: 'Nenhum termo do dicionário demonstrativo foi encontrado. Ausência de termo não exclui atividade técnica; revisar objeto e escopo do contrato.',
  };
}

export function priorityFor(companyId: string, scope: Scope): Priority {
  const index = indexes(scope.dataset);
  const company = index.companies.get(companyId);
  const establishments = index.establishmentsByCompany.get(companyId) ?? [];
  const registrations = index.registrationsByCompany.get(companyId) ?? [];
  const cnaes = new Set(establishments.flatMap(row => [row.cnaeMain, ...row.cnaeSecondary]));
  const factors: Priority['factors'] = [];
  const relevant = scope.dataset.cnaes.filter(row => cnaes.has(row.code) && row.classification !== 'Não classificado');
  if (relevant.length) factors.push({ label: 'CNAE selecionado para análise', points: 20, evidence: `${relevant.length} CNAE(s) relacionados ou dependentes de análise; classificação preservada da planilha.` });
  if (!registrations.length) factors.push({ label: 'Sem correspondência no cadastro CREA', points: 25, evidence: 'Nenhum registro empresarial localizado para este identificador na base demonstrativa.' });
  if (company?.size === 'Grande empresa' || company?.size === 'Média empresa') factors.push({ label: 'Porte empresarial', points: company.size === 'Grande empresa' ? 15 : 8, evidence: company.size });
  if (establishments.some(row => elapsedDays(row.openedAt, scope.anchor) < 365)) factors.push({ label: 'Abertura recente', points: 8, evidence: 'Pelo menos um estabelecimento aberto nos últimos 365 dias.' });
  const contracts = (index.contractsByCompany.get(companyId) ?? []).filter(row => inWindow(row.date, scope.filters.period, scope.anchor) && classifyContract(row.object).engineering);
  if (contracts.length) factors.push({ label: 'Contratação com objeto potencialmente técnico', points: 18, evidence: `${contracts.length} contratação(ões) no período classificada(s) por regras textuais demonstrativas.` });
  const issues = (index.qualityByCompany.get(companyId) ?? []).filter(row => !row.resolved);
  if (issues.length) factors.push({ label: 'Divergências cadastrais', points: Math.min(12, issues.length * 4), evidence: [...new Set(issues.map(row => row.type))].join('; ') });
  const completed = (index.casesByCompany.get(companyId) ?? []).some(row => row.status === 'Concluída');
  if (completed) factors.push({ label: 'Análise anterior concluída', points: -10, evidence: 'Revisar conclusão e data do histórico antes de uma nova análise.' });
  const score = Math.max(0, Math.min(100, sum(factors, factor => factor.points)));
  return { score, level: score >= 65 ? 'Alta' : score >= 40 ? 'Média' : 'Baixa', factors, limitation: 'Pontuação demonstrativa de prioridade de verificação, versão 1.0. Não representa probabilidade de infração, irregularidade ou obrigação automática de registro; exige validação humana.' };
}

export interface MatchResult { status: 'Exata' | 'Raiz' | 'Sugestão' | 'Sem correspondência'; companyId?: string; establishmentId?: string; confidence: number; explanation: string }
export function matchPublicRow(row: PublicRow, dataset?: Dataset): MatchResult {
  if (!dataset) return { status: 'Sem correspondência', confidence: 0, explanation: 'Base de comparação não fornecida.' };
  const index = indexes(dataset);
  const internal = index.internalEstablishments;
  const cnpj = digits(row.cnpj);
  const exact = cnpj.length === 14 ? index.internalByCnpj.get(cnpj) ?? [] : [];
  if (exact.length === 1) return { status: 'Exata', companyId: exact[0].companyId, establishmentId: exact[0].id, confidence: 100, explanation: 'Correspondência determinística pelo CNPJ completo de 14 dígitos. Não implica situação de registro ativo.' };
  if (exact.length > 1) return { status: 'Sugestão', confidence: 80, explanation: 'CNPJ completo duplicado na origem; revisão necessária, sem associação automática.' };
  const roots = cnpj.length === 14 ? index.internalByRoot.get(cnpj.slice(0, 8)) ?? [] : [];
  if (roots.length) return { status: 'Raiz', companyId: roots[0].companyId, confidence: 85, explanation: 'Raiz de CNPJ coincidente; a empresa foi localizada, mas o estabelecimento exige revisão. Não considerar correspondência exata nem mesclar automaticamente.' };
  const tokens = nameTokens(row.companyName);
  const scored = internal.filter(establishment => establishment.cityId === row.cityId || [establishment.cnaeMain, ...establishment.cnaeSecondary].includes(row.cnae)).map(establishment => {
    const candidateTokens = index.names.get(establishment.companyId)!;
    const intersection = [...tokens].filter(token => candidateTokens.has(token)).length;
    const similarity = intersection / Math.max(1, new Set([...tokens, ...candidateTokens]).size);
    return { establishment, score: similarity * 70 + (establishment.cityId === row.cityId ? 15 : 0) + ([establishment.cnaeMain, ...establishment.cnaeSecondary].includes(row.cnae) ? 15 : 0), similarity };
  }).sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (best && best.similarity >= 0.55 && best.score >= 65) return { status: 'Sugestão', companyId: best.establishment.companyId, establishmentId: best.establishment.id, confidence: Math.round(best.score), explanation: `Sugestão por razão social normalizada, município e CNAE (índice ${Math.round(best.score)}/100). Requer revisão humana; nenhuma conciliação automática foi realizada.` };
  return { status: 'Sem correspondência', confidence: 0, explanation: 'Nenhum CNPJ completo, raiz ou sugestão suficientemente semelhante localizado. Não constitui conclusão sobre obrigatoriedade de registro.' };
}

export function reconciliation(scope: Scope) {
  const rows = scope.dataset.publicRows.filter(row => scope.establishmentIds.has(row.establishmentId));
  const matches = rows.map(row => ({ row, match: matchPublicRow(row, scope.dataset) }));
  return { total: rows.length, exact: matches.filter(row => row.match.status === 'Exata').length, root: matches.filter(row => row.match.status === 'Raiz').length, suggestions: matches.filter(row => row.match.status === 'Sugestão').length, unmatched: matches.filter(row => row.match.status === 'Sem correspondência').length, rows: matches };
}

export interface SeriesPoint { label: string; date: string; newRegistrations: number; closures: number; reactivations: number; cancellations: number; net: number; base: number; overdue: number; caos: number; newLinks: number; closedLinks: number; admissions: number; dismissals: number; contractValue: number }
export function makeSeries(scope: Scope, period = scope.filters.period, grain: 'month' | 'quarter' | 'year' = 'month'): SeriesPoint[] {
  const bounds = windowBounds(period, scope.anchor);
  const start = new Date(`${bounds.start}T00:00:00Z`);
  const registrationIds = new Set(scope.registrations.map(row => row.id));
  const allMovements = scope.dataset.movements.filter(row => registrationIds.has(row.registrationId));
  const activeAt = (end: string) => {
    // Rewind current active snapshot using the event ledger, including cancellations.
    const future = allMovements.filter(row => row.date > end && row.date <= scope.anchor);
    const delta = sum(future, row => row.type === 'Novo registro' || row.type === 'Reativação' ? 1 : -1);
    return scope.registrations.filter(row => row.status === 'Ativo').length - delta;
  };
  const monthly: SeriesPoint[] = [];
  const monthCount = Math.max(1, Math.floor(period || 12));
  for (let offset = 0; offset < monthCount; offset++) {
    const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1));
    const prefix = iso(date).slice(0, 7);
    const end = iso(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)));
    const cutoff = end < scope.anchor ? end : scope.anchor;
    const movements = allMovements.filter(row => row.date.startsWith(prefix) && row.date <= cutoff);
    const count = (type: Movement['type']) => movements.filter(row => row.type === type).length;
    const employment = scope.employment.filter(row => row.month.startsWith(prefix));
    const newRegistrations = count('Novo registro'); const closures = count('Baixa'); const reactivations = count('Reativação'); const cancellations = count('Cancelamento');
    monthly.push({ label: new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(date), date: iso(date), newRegistrations, closures, reactivations, cancellations, net: newRegistrations + reactivations - closures - cancellations, base: activeAt(cutoff), overdue: sum(scope.invoices.filter(row => row.dueDate < cutoff), row => outstanding(row, cutoff)), caos: scope.caos.filter(row => row.issuedAt?.startsWith(prefix)).length, newLinks: scope.technicalLinks.filter(row => row.startDate.startsWith(prefix)).length, closedLinks: scope.technicalLinks.filter(row => row.endDate?.startsWith(prefix)).length, admissions: sum(employment, row => row.admissions), dismissals: sum(employment, row => row.dismissals), contractValue: sum(scope.contracts.filter(row => row.date.startsWith(prefix)), row => row.value) });
  }
  if (grain === 'month') return monthly;
  const bins = new Map<string, SeriesPoint[]>();
  for (const point of monthly) {
    const date = new Date(`${point.date}T00:00:00Z`);
    const key = grain === 'year' ? String(date.getUTCFullYear()) : `${Math.floor(date.getUTCMonth() / 3) + 1}º tri / ${date.getUTCFullYear()}`;
    bins.set(key, [...(bins.get(key) ?? []), point]);
  }
  return [...bins].map(([label, rows]) => ({ ...rows.at(-1)!, label, date: rows[0].date, newRegistrations: sum(rows, row => row.newRegistrations), closures: sum(rows, row => row.closures), reactivations: sum(rows, row => row.reactivations), cancellations: sum(rows, row => row.cancellations), net: sum(rows, row => row.net), caos: sum(rows, row => row.caos), newLinks: sum(rows, row => row.newLinks), closedLinks: sum(rows, row => row.closedLinks), admissions: sum(rows, row => row.admissions), dismissals: sum(rows, row => row.dismissals), contractValue: sum(rows, row => row.contractValue) }));
}

export interface Group { id: string; label: string; companies: number; establishments: number; registered: number; notMatched: number; coverage: number; employment: number; contracts: number; overdue: number; arts: number; caos: number }
export function group(scope: Scope, dimension: 'city' | 'gre' | 'cnae' | 'size' | 'nature' | 'modality'): Group[] {
  const buckets = new Map<string, Set<string>>();
  const labels = new Map<string, string>();
  const companyLookup = new Map(scope.companies.map(row => [row.id, row]));
  const add = (id: string, label: string, companyId: string) => { if (!id) return; labels.set(id, label); const members = buckets.get(id) ?? new Set<string>(); members.add(companyId); buckets.set(id, members); };
  for (const establishment of scope.establishments) {
    const company = companyLookup.get(establishment.companyId)!;
    if (dimension === 'city') add(establishment.cityId, scope.dataset.cities.find(row => row.id === establishment.cityId)?.name ?? establishment.cityId, company.id);
    if (dimension === 'gre') add(establishment.greId, scope.dataset.gres.find(row => row.id === establishment.greId)?.name ?? establishment.greId, company.id);
    if (dimension === 'cnae') for (const code of [establishment.cnaeMain, ...establishment.cnaeSecondary]) add(code, scope.dataset.cnaes.find(row => row.code === code)?.label ?? code, company.id);
    if (dimension === 'size') add(company.size, company.size, company.id);
    if (dimension === 'nature') add(company.legalNature, company.legalNature, company.id);
  }
  if (dimension === 'modality') for (const link of scope.technicalLinks.filter(row => isActiveLink(row, scope.anchor))) add(link.modality, link.modality, link.companyId);
  const registered = new Set(scope.registrations.map(row => row.companyId));
  const latestMonth = scope.employment.reduce((latest, row) => row.month > latest ? row.month : latest, '');
  return [...buckets].map(([id, members]) => {
    const establishments = scope.establishments.filter(row => members.has(row.companyId) && (dimension === 'city' ? row.cityId === id : dimension === 'gre' ? row.greId === id : dimension === 'cnae' ? [row.cnaeMain, ...row.cnaeSecondary].includes(id) : true));
    const matched = [...members].filter(companyId => registered.has(companyId)).length;
    const employment = dimension === 'city' || dimension === 'gre' || dimension === 'cnae' ? sum(scope.employment.filter(row => row.month === latestMonth && (dimension === 'city' ? row.cityId === id : dimension === 'cnae' ? row.cnae === id : scope.dataset.cities.find(city => city.id === row.cityId)?.greId === id)), row => row.stock) : 0;
    const establishmentIds = new Set(establishments.map(row => row.id));
    return { id, label: labels.get(id)!, companies: members.size, establishments: establishments.length, registered: matched, notMatched: members.size - matched, coverage: members.size ? matched / members.size * 100 : 0, employment, contracts: sum(scope.contracts.filter(row => establishmentIds.has(row.establishmentId)), row => row.value), overdue: sum(scope.invoices.filter(row => members.has(row.companyId) && row.dueDate < scope.anchor), row => outstanding(row, scope.anchor)), arts: scope.arts.filter(row => members.has(row.companyId)).length, caos: scope.caos.filter(row => members.has(row.companyId) && inWindow(row.issuedAt, scope.filters.period, scope.anchor)).length };
  }).sort((a, b) => b.companies - a.companies || a.label.localeCompare(b.label, 'pt-BR'));
}

export interface AnalyticAlert {
  id: string; title: string; metric: string; date: string; observed: number; baseline: number; score: number;
  companyIds: string[]; explanation: string; limitations: string;
}

/** Six prior monthly observations, deterministic z-score; no trained AI is implied. */
export function detectAnomalies(scope: Scope, period = scope.filters.period): AnalyticAlert[] {
  const months = Math.max(1, Math.floor(period || 12));
  const series = makeSeries(scope, months + 6);
  const registrationIds = new Set(scope.registrations.map(row => row.id));
  const allMovements = scope.dataset.movements.filter(row => registrationIds.has(row.registrationId));
  const monthlyCompanyIds = <T extends { companyId: string }>(rows: T[], dateOf: (row: T) => string | undefined, month: string) => [...new Set(rows.filter(row => dateOf(row)?.startsWith(month)).map(row => row.companyId))];
  const channels: { metric: string; title: string; values: number[]; minimum: number; members: (month: string) => string[]; limitation?: string }[] = [
    { metric: 'newRegistrations', title: 'Novos registros', values: series.map(row => row.newRegistrations), minimum: 5, members: month => monthlyCompanyIds(allMovements.filter(row => row.type === 'Novo registro'), row => row.date, month) },
    { metric: 'cancellations', title: 'Cancelamentos cadastrais', values: series.map(row => row.cancellations), minimum: 3, members: month => monthlyCompanyIds(allMovements.filter(row => row.type === 'Cancelamento'), row => row.date, month) },
    { metric: 'overdueAmount', title: 'Saldo financeiro vencido', values: series.map(row => row.overdue), minimum: 1000, members: month => { const cutoff = iso(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0))); return [...new Set(scope.invoices.filter(row => row.dueDate < cutoff && outstanding(row, cutoff) > 0).map(row => row.companyId))]; }, limitation: 'A série financeira reconstrói pagamentos pela data disponível, sem histórico de parcelas intermediárias; validar com a contabilidade.' },
    { metric: 'caoIssued', title: 'Emissões de CAO', values: series.map(row => row.caos), minimum: 3, members: month => monthlyCompanyIds(scope.caos, row => row.issuedAt, month) },
    { metric: 'newLinks', title: 'Novos vínculos de RTS', values: series.map(row => row.newLinks), minimum: 3, members: month => monthlyCompanyIds(scope.technicalLinks, row => row.startDate, month) },
    { metric: 'closedLinks', title: 'Encerramentos de RTS', values: series.map(row => row.closedLinks), minimum: 3, members: month => monthlyCompanyIds(scope.technicalLinks, row => row.endDate, month) },
  ];
  const births = new Map<string, Map<string, Set<string>>>();
  const titles = new Map<string, string>();
  const addBirth = (key: string, title: string, establishment: Establishment) => {
    const byMonth = births.get(key) ?? new Map<string, Set<string>>();
    const month = establishment.openedAt.slice(0, 7);
    const ids = byMonth.get(month) ?? new Set<string>();
    ids.add(establishment.companyId); byMonth.set(month, ids); births.set(key, byMonth); titles.set(key, title);
  };
  for (const establishment of scope.establishments) {
    const city = scope.dataset.cities.find(row => row.id === establishment.cityId);
    addBirth(`births-city:${establishment.cityId}`, `Aberturas empresariais em ${city?.name ?? establishment.cityId}`, establishment);
    for (const code of [establishment.cnaeMain, ...establishment.cnaeSecondary]) addBirth(`births-cnae:${code}`, `Aberturas com CNAE ${code}`, establishment);
  }
  for (const [metric, byMonth] of births) channels.push({ metric, title: titles.get(metric)!, values: series.map(row => byMonth.get(row.date.slice(0, 7))?.size ?? 0), minimum: 5, members: month => [...(byMonth.get(month) ?? [])], limitation: 'Conta empresas com abertura de estabelecimento no mês; CNAEs principal e secundários podem se sobrepor. Não é estimativa de obrigação de registro.' });
  const alerts: AnalyticAlert[] = [];
  for (const channel of channels) {
    for (let index = 6; index < series.length; index++) {
      const history = channel.values.slice(index - 6, index);
      const baseline = mean(history);
      const observed = channel.values[index];
      const deviation = Math.sqrt(mean(history.map(value => (value - baseline) ** 2)));
      // A degenerate baseline cannot support a statistical score; it is not fabricated.
      if (deviation === 0 || Math.max(baseline, observed) < channel.minimum) continue;
      const score = (observed - baseline) / deviation;
      if (!Number.isFinite(score) || Math.abs(score) < 2) continue;
      const month = series[index].date.slice(0, 7);
      const direction = score > 0 ? 'acima' : 'abaixo';
      alerts.push({ id: `${channel.metric}:${month}`, title: `${channel.title} ${direction} do padrão recente`, metric: channel.metric, date: series[index].date, observed, baseline, score, companyIds: channel.members(month), explanation: `Observado ${observed.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}; média dos seis meses anteriores ${baseline.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}; desvio-padrão ${deviation.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}; z = ${score.toFixed(2)}. Limiar demonstrativo: |z| ≥ 2. Registros correspondem ao universo filtrado.`, limitations: `Detecção estatística demonstrativa, sem modelo treinado. Não corrige sazonalidade, não prova causa nem infração e requer validação humana. ${channel.limitation ?? 'Mudanças de cobertura e qualidade cadastral podem explicar o sinal.'}${observed === 0 ? ' Não há registros no mês observado; ausência não gera empresas artificiais para investigação.' : ''}` });
    }
  }
  return alerts.sort((a, b) => b.date.localeCompare(a.date) || Math.abs(b.score) - Math.abs(a.score));
}

export type ExportColumn = 'companyId' | 'name' | 'tradeName' | 'cnpj' | 'branch' | 'city' | 'gre' | 'cnae' | 'size' | 'rfbStatus' | 'creaStatus' | 'openAmount' | 'overdueAmount';
export interface ExportPermissions { financial: boolean; export: boolean }
const csvCell = (value: string | number) => {
  const raw = String(value);
  const protectedValue = /^[\s]*[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${protectedValue.replace(/"/g, '""')}"`;
};
export function exportCsv(scope: Scope, permissions: ExportPermissions, columns?: string[]): string {
  if (!permissions.export) throw new Error('Seu perfil não permite exportar registros.');
  const defaults: ExportColumn[] = ['companyId', 'name', 'cnpj', 'branch', 'city', 'gre', 'cnae', 'size', 'rfbStatus', 'creaStatus'];
  const allowed = new Set<ExportColumn>([...defaults, 'tradeName', ...(permissions.financial ? ['openAmount', 'overdueAmount'] as ExportColumn[] : [])]);
  const selected = (columns ?? defaults).filter(column => allowed.has(column as ExportColumn)) as ExportColumn[];
  if (!selected.length) throw new Error('Nenhuma coluna permitida foi selecionada.');
  const labels: Record<ExportColumn, string> = { companyId: 'ID da empresa', name: 'Razão social', tradeName: 'Nome fantasia', cnpj: 'CNPJ', branch: 'Matriz/filial', city: 'Município', gre: 'GRE', cnae: 'CNAE principal', size: 'Porte', rfbStatus: 'Situação Receita', creaStatus: 'Situação CREA (empresa no recorte)', openAmount: 'Em aberto (empresa; não somar por estabelecimento)', overdueAmount: 'Vencido (empresa; não somar por estabelecimento)' };
  const companies = new Map(scope.companies.map(company => [company.id, company]));
  const lines = scope.establishments.map(establishment => {
    const company = companies.get(establishment.companyId)!;
    const registrations = scope.registrations.filter(row => row.companyId === company.id);
    const invoices = scope.invoices.filter(row => row.companyId === company.id);
    const row: Record<ExportColumn, string | number> = { companyId: company.id, name: company.name, tradeName: company.tradeName, cnpj: establishment.cnpj, branch: establishment.branch, city: scope.dataset.cities.find(city => city.id === establishment.cityId)?.name ?? '', gre: scope.dataset.gres.find(gre => gre.id === establishment.greId)?.name ?? '', cnae: establishment.cnaeMain, size: company.size, rfbStatus: establishment.rfbStatus, creaStatus: registrations.some(registration => registration.status === 'Ativo') ? 'Ativa' : registrations.length ? 'Inativa' : 'Sem correspondência', openAmount: sum(invoices, invoice => outstanding(invoice, scope.anchor)).toFixed(2), overdueAmount: sum(invoices.filter(invoice => invoice.dueDate < scope.anchor), invoice => outstanding(invoice, scope.anchor)).toFixed(2) };
    return selected.map(column => csvCell(row[column])).join(';');
  });
  return '\uFEFF' + [selected.map(column => csvCell(labels[column])).join(';'), ...lines].join('\r\n');
}
