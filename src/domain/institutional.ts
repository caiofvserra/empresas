import type { Dataset } from './types';
import { inWindow, selectScope, windowBounds } from './engine';
import type { Scope } from './engine';
import { buildProfessionalModel } from './professionals';

/** These rows are a reproducible analytical example, never evidence about a real administration. */
export type InstitutionalProgramId = 'formacao' | 'coworkings' | 'cadastro' | 'orientacao';
export interface InstitutionalProgram {
  id: InstitutionalProgramId;
  name: string;
  purpose: string;
  participationMode: 'attendance' | 'cowork' | 'service';
}
export interface InstitutionalActivity {
  id: string;
  programId: InstitutionalProgramId;
  name: string;
  date: string;
  cityId: string;
  greId: string;
  kind: 'Palestra' | 'Oficina' | 'Orientação coletiva' | 'Plantão cadastral' | 'Uso de coworking';
  costCents: number;
  capacity: number;
}
export interface InstitutionalParticipation {
  id: string;
  activityId: string;
  professionalId?: string;
  registeredAt: string;
  attended: boolean;
  identityStatus: 'Identificador demonstrativo validado' | 'Identificador não informado';
}
export interface InstitutionalBudgetEntry {
  id: string;
  programId: InstitutionalProgramId;
  month: string;
  cityId: string;
  greId: string;
  plannedCents: number;
  executedCents: number;
  activityCostCents: number;
  otherExecutedCents: number;
}
export interface CoworkUnit {
  id: string;
  name: string;
  cityId: string;
  greId: string;
  openedAt: string;
  desks: number;
}
export interface CoworkMonth {
  id: string;
  unitId: string;
  activityId: string;
  month: string;
  availableDeskHours: number;
  executedCents: number;
}
export interface CoworkUsage {
  id: string;
  coworkMonthId: string;
  professionalId: string;
  usedDeskHours: number;
  evidence: 'Registro de utilização demonstrativo';
}
export type InstitutionalOutcome = 'Aplicação profissional relatada' | 'Aprendizado relatado' | 'Sem mudança relatada';
export interface InstitutionalFollowup {
  id: string;
  activityId: string;
  professionalId: string;
  dueAt: string;
  eligibleAtSnapshot: boolean;
  responded: boolean;
  respondedAt?: string;
  outcome?: InstitutionalOutcome;
  method: 'Resposta autodeclarada demonstrativa; sem atribuição causal';
}
export interface InstitutionalServiceRequest {
  id: string;
  programId: 'cadastro' | 'orientacao';
  cityId: string;
  greId: string;
  createdAt: string;
  resolvedAt?: string;
  userType: 'Profissional' | 'Empresa';
  professionalId?: string;
  companyId?: string;
  category: 'Atualização cadastral' | 'Orientação sobre ART' | 'Informação sobre atribuições' | 'Esclarecimento de registro';
  status: 'Resolvido' | 'Em atendimento';
  targetDays: 14;
}
export interface InstitutionalModel {
  programs: InstitutionalProgram[];
  activities: InstitutionalActivity[];
  participation: InstitutionalParticipation[];
  budgetEntries: InstitutionalBudgetEntry[];
  coworkUnits: CoworkUnit[];
  coworkMonths: CoworkMonth[];
  coworkUsage: CoworkUsage[];
  followups: InstitutionalFollowup[];
  serviceRequests: InstitutionalServiceRequest[];
  metadata: {
    synthetic: true;
    seed: number;
    seedLabel: string;
    snapshotDate: string;
    updatedAt: string;
    ruleVersion: string;
    currencyUnit: 'Centavos inteiros de BRL';
    territorialUnit: string;
    source: string;
    limitations: string[];
  };
}

const DAY = 86_400_000;
const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
const daysBetween = (first: string, last: string) => (Date.parse(last) - Date.parse(first)) / DAY;
const hash = (text: string, seed: number) => {
  let result = (2166136261 ^ seed) >>> 0;
  for (const character of text) { result ^= character.charCodeAt(0); result = Math.imul(result, 16777619) >>> 0; }
  return result;
};
const sum = <T>(rows: T[], pick: (row: T) => number) => rows.reduce((total, row) => total + pick(row), 0);
const distinct = <T>(rows: T[], pick: (row: T) => string | undefined) => new Set(rows.map(pick).filter((id): id is string => Boolean(id))).size;
const modelCache = new WeakMap<Dataset, InstitutionalModel>();

/** No real names, beneficiary network, CPF or employment match is generated. */
export function buildInstitutionalModel(dataset: Dataset): InstitutionalModel {
  const cached = modelCache.get(dataset);
  if (cached) return cached;
  const seed = dataset.seed;
  const code = (key: string) => hash(`institutional-v6:${key}`, seed);
  const profiles = buildProfessionalModel(dataset).profiles;
  const companyOpenedAt = new Map<string, string>();
  for (const establishment of dataset.establishments) {
    const previous = companyOpenedAt.get(establishment.companyId);
    if (!previous || establishment.openedAt < previous) companyOpenedAt.set(establishment.companyId, establishment.openedAt);
  }
  const programs: InstitutionalProgram[] = [
    { id: 'formacao', name: 'Formação e eventos', purpose: 'Acesso a formação e acompanhamento da aplicação relatada.', participationMode: 'attendance' },
    { id: 'coworkings', name: 'Coworkings', purpose: 'Oferta e utilização observada de infraestrutura compartilhada.', participationMode: 'cowork' },
    { id: 'cadastro', name: 'Serviço cadastral', purpose: 'Acesso e prazo de resolução de solicitações cadastrais.', participationMode: 'service' },
    { id: 'orientacao', name: 'Orientação técnica', purpose: 'Informação técnica e atendimento aos profissionais.', participationMode: 'attendance' },
  ];
  const activities: InstitutionalActivity[] = [];
  const participation: InstitutionalParticipation[] = [];
  const coworkMonths: CoworkMonth[] = [];
  const coworkUsage: CoworkUsage[] = [];
  const followups: InstitutionalFollowup[] = [];
  const serviceRequests: InstitutionalServiceRequest[] = [];
  const months = dataset.months.filter(month => `${month}-01` <= dataset.snapshotDate).slice(-24);
  const coworkUnits = dataset.cities.filter((_, index) => [1, 4, 5, 6, 8, 10].includes(index)).map((city, index): CoworkUnit => ({
    id: `COW-DEMO-${index + 1}`, name: `Unidade demonstrativa ${city.name}`, cityId: city.id, greId: city.greId,
    openedAt: `${months[0]}-01`, desks: 8 + code(`cowork-desks:${city.id}`) % 17,
  }));
  const candidatesFor = (date: string) => profiles.filter(profile => profile.registeredAt <= date);
  function addActivity(programId: InstitutionalProgramId, month: string, cityIndex: number, sequence: number) {
    const city = dataset.cities[cityIndex % dataset.cities.length];
    const id = `ACT-DEMO-${programId}-${month}-${sequence}`;
    const h = code(id);
    const date = `${month}-${String(5 + h % 21).padStart(2, '0')}`;
    const kind = programId === 'formacao' ? (sequence % 2 ? 'Oficina' : 'Palestra')
      : programId === 'cadastro' ? 'Plantão cadastral' : 'Orientação coletiva';
    const capacity = programId === 'formacao' ? 45 + h % 80 : programId === 'orientacao' ? 20 + h % 40 : 0;
    const costCents = (programId === 'formacao' ? 220_000 : programId === 'orientacao' ? 90_000 : 60_000) + h % 180_000;
    activities.push({ id, programId, name: `${kind} demonstrativa`, date, cityId: city.id, greId: city.greId, kind, costCents, capacity });
    if (programId === 'cadastro') return;
    // A fixed voluntary-participation pool leaves registered people with no observed program attendance.
    const candidates = candidatesFor(addDays(date, -3)).filter(profile => code(`attendance-pool:${profile.id}`) % 10 < 7);
    const entries = Math.min(capacity, 15 + h % Math.max(16, capacity - 14));
    // Each activity/person pair occurs at most once. Attendance in different activities is intentionally repeatable.
    const chosen = [...candidates].sort((a, b) => code(`${id}:${a.id}`) - code(`${id}:${b.id}`)).slice(0, entries);
    chosen.forEach((profile, index) => {
      const unidentified = code(`${id}:identity:${index}`) % 13 === 0;
      const attended = code(`${id}:attendance:${index}`) % 8 !== 0;
      participation.push({ id: `PART-${id}-${index + 1}`, activityId: id,
        ...(unidentified ? {} : { professionalId: profile.id }), registeredAt: addDays(date, -3), attended,
        identityStatus: unidentified ? 'Identificador não informado' : 'Identificador demonstrativo validado' });
      if (unidentified || !attended) return;
      const dueAt = addDays(date, 90);
      const eligibleAtSnapshot = dueAt <= dataset.snapshotDate;
      const responseAt = addDays(dueAt, code(`${id}:response-day:${index}`) % 12);
      const responded = eligibleAtSnapshot && responseAt <= dataset.snapshotDate && code(`${id}:response:${index}`) % 5 < 3;
      const outcomes: InstitutionalOutcome[] = ['Aplicação profissional relatada', 'Aprendizado relatado', 'Sem mudança relatada'];
      followups.push({ id: `FOLLOW-${id}-${profile.id}`, activityId: id, professionalId: profile.id, dueAt, eligibleAtSnapshot, responded,
        ...(responded ? { respondedAt: responseAt, outcome: outcomes[code(`${id}:outcome:${index}`) % outcomes.length] } : {}),
        method: 'Resposta autodeclarada demonstrativa; sem atribuição causal' });
    });
  }
  months.forEach((month, monthIndex) => {
    for (let index = 0; index < 5; index++) addActivity('formacao', month, (monthIndex * 7 + index * 5) % dataset.cities.length, index);
    for (let index = 0; index < 3; index++) addActivity('orientacao', month, (monthIndex * 5 + index * 7 + 2) % dataset.cities.length, index);
    for (let index = 0; index < 2; index++) addActivity('cadastro', month, (monthIndex * 3 + index * 11 + 4) % dataset.cities.length, index);
    for (const unit of coworkUnits) {
      const activityId = `ACT-DEMO-cowork-${unit.id}-${month}`;
      const h = code(activityId);
      const date = `${month}-15`;
      const executedCents = 550_000 + h % 650_000;
      activities.push({ id: activityId, programId: 'coworkings', name: `Utilização mensal · ${unit.name}`, date,
        cityId: unit.cityId, greId: unit.greId, kind: 'Uso de coworking', capacity: unit.desks, costCents: executedCents });
      const availableDeskHours = unit.desks * 160;
      const coworkMonthId = `${unit.id}-${month}`;
      coworkMonths.push({ id: coworkMonthId, unitId: unit.id, activityId, month, availableDeskHours, executedCents });
      const regionalCandidates = candidatesFor(date).filter(profile => dataset.cities.find(city => city.id === profile.cityId)?.greId === unit.greId);
      const candidates = regionalCandidates.length ? regionalCandidates : candidatesFor(date);
      const users = [...candidates].sort((a, b) => code(`${coworkMonthId}:${a.id}`) - code(`${coworkMonthId}:${b.id}`)).slice(0, 8 + h % 23);
      const observedHours = Math.floor(availableDeskHours * (12 + h % 64) / 100);
      const equalHours = Math.floor(observedHours / users.length);
      users.forEach((profile, index) => coworkUsage.push({ id: `USE-${coworkMonthId}-${profile.id}`, coworkMonthId,
        professionalId: profile.id, usedDeskHours: equalHours + (index < observedHours % users.length ? 1 : 0),
        evidence: 'Registro de utilização demonstrativo' }));
    }
    for (let index = 0; index < 45; index++) {
      const id = `REQ-DEMO-${month}-${index + 1}`;
      const h = code(id);
      const city = dataset.cities[h % dataset.cities.length];
      const createdAt = `${month}-${String(1 + (h >>> 6) % 25).padStart(2, '0')}`;
      const possibleResolvedAt = addDays(createdAt, 1 + (h >>> 12) % 28);
      const resolved = possibleResolvedAt <= dataset.snapshotDate && h % 9 !== 0;
      const userType = h % 3 ? 'Profissional' : 'Empresa';
      const people = candidatesFor(createdAt);
      const companies = dataset.companies.filter(company => (companyOpenedAt.get(company.id) ?? '9999-12-31') <= createdAt);
      const categories: InstitutionalServiceRequest['category'][] = ['Atualização cadastral', 'Orientação sobre ART', 'Informação sobre atribuições', 'Esclarecimento de registro'];
      const category = categories[(h >>> 4) % categories.length];
      serviceRequests.push({ id, programId: category === 'Atualização cadastral' || category === 'Esclarecimento de registro' ? 'cadastro' : 'orientacao',
        cityId: city.id, greId: city.greId, createdAt, ...(resolved ? { resolvedAt: possibleResolvedAt } : {}), userType,
        ...(userType === 'Profissional' ? { professionalId: people[(h >>> 10) % people.length].id }
          : { companyId: companies[(h >>> 10) % companies.length].id }), category,
        status: resolved ? 'Resolvido' : 'Em atendimento', targetDays: 14 });
    }
  });
  const budgetEntries: InstitutionalBudgetEntry[] = months.flatMap(month => programs.flatMap(program => dataset.cities.map(city => {
    const id = `BUDGET-DEMO-${program.id}-${city.id}-${month}`;
    const activityCostCents = sum(activities.filter(activity => activity.programId === program.id && activity.cityId === city.id && activity.date.startsWith(month)), activity => activity.costCents);
    const otherExecutedCents = program.id === 'coworkings' && !coworkUnits.some(unit => unit.cityId === city.id) ? 0 : 15_000 + code(`${id}:other`) % 65_000;
    const executedCents = activityCostCents + otherExecutedCents;
    // A plan is not a second expense; both columns have the same additive grain.
    const plannedCents = Math.round(executedCents * (90 + code(`${id}:plan`) % 36) / 100);
    return { id, programId: program.id, month, cityId: city.id, greId: city.greId, plannedCents, executedCents, activityCostCents, otherExecutedCents };
  })));
  const result: InstitutionalModel = { programs, activities, participation, budgetEntries, coworkUnits, coworkMonths, coworkUsage, followups, serviceRequests,
    metadata: { synthetic: true, seed, seedLabel: `${seed}+v6`, snapshotDate: dataset.snapshotDate, updatedAt: dataset.updatedAt,
      ruleVersion: 'resultados-institucionais-demo-6.0', currencyUnit: 'Centavos inteiros de BRL',
      territorialUnit: 'Município de oferta da atividade, unidade de coworking ou atendimento; domicílio profissional é outra dimensão.',
      source: 'Base relacional demonstrativa local; não corresponde a dados, gastos ou beneficiários da administração real do CREA-SP.',
      limitations: ['Programas, custos, participantes e resultados são inteiramente fictícios; não evidenciam superfaturamento, favorecimento ou desempenho da gestão atual.',
        'GRE dos municípios segue o mapeamento demonstrativo do protótipo; requer validação territorial institucional.',
        'Inscrição e presença são ocorrências. Pessoas distintas só podem ser contadas quando existe identificador validado; registros sem identificador ficam explícitos.',
        'Custo médio por pessoa identificada inclui o custo integral de formação/orientação, inclusive ações sem identificação completa; não é gasto individual nem retorno causal.',
        'Seguimento após 90 dias é autodeclarado e sujeito a não resposta; aplicação relatada não comprova emprego ou efeito do programa.',
        'Horas observadas de uso não equivalem a benefício profissional; capacidade contabiliza somente horários de abertura demonstrativos.',
        'Filtros empresariais não se aplicam ao universo institucional. Selecionar pessoas/atividades não reparte orçamento ou capacidade entre beneficiários.',
        'Dados de solicitações demonstram análise de serviço; não criam tratativas operacionais no BI. A meta de 14 dias é ilustrativa, não um prazo oficial.'] } };
  modelCache.set(dataset, result);
  return result;
}

export interface InstitutionalScopeOptions {
  professionalIds?: string[];
  activityIds?: string[];
  programIds?: InstitutionalProgramId[];
  serviceCategories?: InstitutionalServiceRequest['category'][];
  model?: InstitutionalModel;
}
export interface InstitutionalScope {
  dataset: Dataset;
  companyScope: Scope;
  model: InstitutionalModel;
  options: InstitutionalScopeOptions;
  activities: InstitutionalActivity[];
  allActivities: InstitutionalActivity[];
  activityIds: Set<string>;
  participation: InstitutionalParticipation[];
  allParticipation: InstitutionalParticipation[];
  budgetEntries: InstitutionalBudgetEntry[];
  coworkUnits: CoworkUnit[];
  coworkMonths: CoworkMonth[];
  coworkUsage: CoworkUsage[];
  allCoworkUsage: CoworkUsage[];
  followups: InstitutionalFollowup[];
  serviceRequests: InstitutionalServiceRequest[];
  baselineProfessionalIds: Set<string>;
  ignoredCompanyFilters: string[];
  cohortRestricted: boolean;
  coveredMonths: string[];
  coverageStart: string;
  coverageEnd: string;
  periodCoverageComplete: boolean;
  scopeNote: string;
}

/** OR within dimensions, AND between dimensions. Geography is the offering location. */
export function selectInstitutionalScope(companyScope: Scope, options: InstitutionalScopeOptions = {}): InstitutionalScope {
  const { dataset, filters, anchor } = companyScope;
  const model = options.model ?? buildInstitutionalModel(dataset);
  const coveredMonths = [...new Set(model.budgetEntries.map(row => row.month))].sort();
  const coverageStart = coveredMonths.length ? `${coveredMonths[0]}-01` : model.metadata.snapshotDate;
  const coverageEnd = model.metadata.snapshotDate;
  const bounds = windowBounds(filters.period, anchor);
  const periodCoverageComplete = coveredMonths.length > 0 && coverageStart <= bounds.start && coverageEnd >= bounds.end;
  const cityById = new Map(dataset.cities.map(city => [city.id, city]));
  const programs = options.programIds === undefined ? undefined : new Set(options.programIds);
  const selectedActivities = options.activityIds === undefined ? undefined : new Set(options.activityIds);
  const people = options.professionalIds === undefined ? undefined : new Set(options.professionalIds);
  const territory = (cityId: string, greId: string) => (!filters.cityIds.length || filters.cityIds.includes(cityId)) && (!filters.greIds.length || filters.greIds.includes(greId));
  const program = (programId: InstitutionalProgramId) => !programs || programs.has(programId);
  const allActivities = model.activities.filter(activity => territory(activity.cityId, activity.greId) && program(activity.programId)
    && inWindow(activity.date, filters.period, anchor) && (!selectedActivities || selectedActivities.has(activity.id)));
  const allActivityIds = new Set(allActivities.map(activity => activity.id));
  const allParticipation = model.participation.filter(row => allActivityIds.has(row.activityId));
  const participation = allParticipation.filter(row => !people || row.professionalId !== undefined && people.has(row.professionalId));
  const budgetEntries = model.budgetEntries.filter(row => territory(row.cityId, row.greId) && program(row.programId) && inWindow(row.month, filters.period, anchor));
  const coworkUnits = model.coworkUnits.filter(unit => territory(unit.cityId, unit.greId) && program('coworkings'));
  const unitIds = new Set(coworkUnits.map(unit => unit.id));
  // Capacity and total observed usage retain their full institutional grain even under a participant/activity drillthrough.
  const coworkMonths = model.coworkMonths.filter(row => unitIds.has(row.unitId) && inWindow(row.month, filters.period, anchor));
  const coworkMonthIds = new Set(coworkMonths.map(row => row.id));
  const allCoworkUsage = model.coworkUsage.filter(row => coworkMonthIds.has(row.coworkMonthId));
  const coworkUsage = allCoworkUsage.filter(row => (!people || people.has(row.professionalId))
    && (!selectedActivities || selectedActivities.has(model.coworkMonths.find(month => month.id === row.coworkMonthId)!.activityId)));
  const representedActivities = new Set([...participation.map(row => row.activityId), ...coworkUsage.map(row => model.coworkMonths.find(month => month.id === row.coworkMonthId)!.activityId)]);
  const activities = people ? allActivities.filter(activity => representedActivities.has(activity.id)) : allActivities;
  const activityIds = new Set(activities.map(activity => activity.id));
  const followups = model.followups.filter(row => allActivityIds.has(row.activityId) && (!people || people.has(row.professionalId)));
  const serviceRequests = model.serviceRequests.filter(row => territory(row.cityId, row.greId) && program(row.programId)
    && inWindow(row.createdAt, filters.period, anchor) && (!people || row.professionalId !== undefined && people.has(row.professionalId))
    && (options.serviceCategories === undefined || options.serviceCategories.includes(row.category)));
  const baselineProfessionalIds = new Set(buildProfessionalModel(dataset).profiles.filter(profile => {
    const city = cityById.get(profile.cityId);
    return profile.registeredAt <= anchor && city && territory(city.id, city.greId);
  }).map(profile => profile.id));
  const baselineCompanyScope = selectScope(dataset, filters);
  const subsetApplied = baselineCompanyScope.companyIds.size !== companyScope.companyIds.size || [...companyScope.companyIds].some(id => !baselineCompanyScope.companyIds.has(id));
  const ignoredCompanyFilters = [filters.cnaeCodes.length && 'CNAE', filters.sizes.length && 'Porte', filters.rfbStatuses.length && 'Situação Receita',
    filters.registrationStatuses.length && 'Situação empresarial CREA', filters.search.trim() && 'Busca empresarial', filters.onlyRelated && 'CNAEs relacionados',
    (filters.cboCodes ?? []).length && 'CBO', subsetApplied && 'Subconjunto empresarial'].filter((value): value is string => typeof value === 'string' && value.length > 0);
  return { dataset, companyScope, model, options, activities, allActivities, activityIds, participation, allParticipation, budgetEntries,
    coworkUnits, coworkMonths, coworkUsage, allCoworkUsage, followups, serviceRequests, baselineProfessionalIds, ignoredCompanyFilters,
    cohortRestricted: people !== undefined || selectedActivities !== undefined, coveredMonths, coverageStart, coverageEnd, periodCoverageComplete,
    scopeNote: 'Território = local de oferta; referência cadastral = domicílio profissional. Orçamento e capacidade não são repartidos por pessoas/atividades selecionadas.'
      + (ignoredCompanyFilters.length ? ` Sem aplicação de: ${ignoredCompanyFilters.join(', ')}.` : '')
      + (!periodCoverageComplete ? ` Cobertura temporal disponível: ${coverageStart} a ${coverageEnd}; meses anteriores não representam ausência de atividade.` : '') };
}

export interface InstitutionalMetrics {
  activities: number;
  attendanceActivities: number;
  registrations: number;
  attendances: number;
  identifiedRegistrations: number;
  identifiedAttendances: number;
  unidentifiedRegistrations: number;
  unidentifiedAttendances: number;
  distinctRegisteredProfessionals: number;
  distinctParticipants: number;
  repeatAttendances: number;
  participationTraceability: number | null;
  attendanceRate: number | null;
  plannedCents: number;
  executedCents: number;
  activityCostCents: number;
  otherExecutedCents: number;
  budgetExecutionRate: number | null;
  attendanceProgramExecutedCents: number;
  costPerIdentifiedParticipantCents: number | null;
  costInActivitiesWithUnknownIdentityCents: number;
  eligibleFollowups: number;
  pendingEligibilityFollowups: number;
  respondedFollowups: number;
  distinctEligibleProfessionals: number;
  distinctRespondingProfessionals: number;
  responseRate: number | null;
  reportedApplication: number;
  reportedLearning: number;
  reportedNoChange: number;
  reportedApplicationRateAmongResponses: number | null;
  coworkUnits: number;
  coworkAvailableDeskHours: number;
  coworkUsedDeskHours: number;
  coworkCohortUsedDeskHours: number;
  coworkDistinctUsers: number;
  coworkCohortDistinctUsers: number;
  coworkOccupancy: number | null;
  coworkExecutedCents: number;
  coworkCostPerUsedHourCents: number | null;
  serviceRequests: number;
  resolvedServiceRequests: number;
  openServiceRequests: number;
  serviceResolutionRate: number | null;
  serviceResolutionDaysMean: number | null;
  serviceResolutionDaysMedian: number | null;
  matureServiceRequests: number;
  immatureServiceRequests: number;
  onTimeMatureServiceRequests: number;
  lateResolvedMatureServiceRequests: number;
  overdueOpenMatureServiceRequests: number;
  matureServiceOnTimeRate: number | null;
  baselineProfessionals: number;
  participantReach: number | null;
}

/** Ratios have explicit denominators; an absent denominator is null, never a fabricated zero. */
export function summarizeInstitutional(scope: InstitutionalScope): InstitutionalMetrics {
  const { participation, budgetEntries, followups, coworkMonths, allCoworkUsage, coworkUsage, serviceRequests, model } = scope;
  const attended = participation.filter(row => row.attended);
  const identifiedAttendance = attended.filter(row => row.professionalId !== undefined);
  const distinctParticipants = distinct(identifiedAttendance, row => row.professionalId);
  const plannedCents = sum(budgetEntries, row => row.plannedCents);
  const executedCents = sum(budgetEntries, row => row.executedCents);
  const attendanceProgramIds = new Set(model.programs.filter(program => program.participationMode === 'attendance').map(program => program.id));
  const attendanceProgramExecutedCents = sum(budgetEntries.filter(row => attendanceProgramIds.has(row.programId)), row => row.executedCents);
  const unknownActivityIds = new Set(scope.allParticipation.filter(row => !row.professionalId).map(row => row.activityId));
  const eligible = followups.filter(row => row.dueAt <= scope.companyScope.anchor);
  const responded = eligible.filter(row => row.responded && row.respondedAt! <= scope.companyScope.anchor);
  const reportedApplication = responded.filter(row => row.outcome === 'Aplicação profissional relatada').length;
  const coworkAvailableDeskHours = sum(coworkMonths, row => row.availableDeskHours);
  const coworkUsedDeskHours = sum(allCoworkUsage, row => row.usedDeskHours);
  const coworkExecutedCents = sum(budgetEntries.filter(row => row.programId === 'coworkings'), row => row.executedCents);
  const resolved = serviceRequests.filter(row => row.resolvedAt && row.resolvedAt <= scope.companyScope.anchor);
  const durationDays = resolved.map(row => daysBetween(row.createdAt, row.resolvedAt!)).sort((a, b) => a - b);
  const mature = serviceRequests.filter(row => addDays(row.createdAt, row.targetDays) <= scope.companyScope.anchor);
  const matureOnTime = mature.filter(row => row.resolvedAt && row.resolvedAt <= addDays(row.createdAt, row.targetDays));
  const matureLate = mature.filter(row => row.resolvedAt && row.resolvedAt <= scope.companyScope.anchor && row.resolvedAt > addDays(row.createdAt, row.targetDays));
  const domesticParticipants = new Set(identifiedAttendance.map(row => row.professionalId!).filter(id => scope.baselineProfessionalIds.has(id)));
  return {
    activities: scope.activities.length,
    attendanceActivities: scope.activities.filter(activity => attendanceProgramIds.has(activity.programId)).length,
    registrations: participation.length, attendances: attended.length,
    identifiedRegistrations: participation.filter(row => row.professionalId !== undefined).length,
    identifiedAttendances: identifiedAttendance.length,
    unidentifiedRegistrations: participation.filter(row => row.professionalId === undefined).length,
    unidentifiedAttendances: attended.filter(row => row.professionalId === undefined).length,
    distinctRegisteredProfessionals: distinct(participation, row => row.professionalId), distinctParticipants,
    repeatAttendances: identifiedAttendance.length - distinctParticipants,
    participationTraceability: attended.length ? identifiedAttendance.length / attended.length : null,
    attendanceRate: participation.length ? attended.length / participation.length : null,
    plannedCents, executedCents, activityCostCents: sum(budgetEntries, row => row.activityCostCents), otherExecutedCents: sum(budgetEntries, row => row.otherExecutedCents),
    budgetExecutionRate: plannedCents ? executedCents / plannedCents : null,
    attendanceProgramExecutedCents,
    costPerIdentifiedParticipantCents: !scope.cohortRestricted && distinctParticipants ? attendanceProgramExecutedCents / distinctParticipants : null,
    costInActivitiesWithUnknownIdentityCents: sum(scope.allActivities.filter(activity => unknownActivityIds.has(activity.id)), activity => activity.costCents),
    eligibleFollowups: eligible.length, pendingEligibilityFollowups: followups.length - eligible.length,
    respondedFollowups: responded.length,
    distinctEligibleProfessionals: distinct(eligible, row => row.professionalId), distinctRespondingProfessionals: distinct(responded, row => row.professionalId),
    responseRate: eligible.length ? responded.length / eligible.length : null,
    reportedApplication, reportedLearning: responded.filter(row => row.outcome === 'Aprendizado relatado').length,
    reportedNoChange: responded.filter(row => row.outcome === 'Sem mudança relatada').length,
    reportedApplicationRateAmongResponses: responded.length ? reportedApplication / responded.length : null,
    coworkUnits: scope.coworkUnits.length, coworkAvailableDeskHours, coworkUsedDeskHours,
    coworkCohortUsedDeskHours: sum(coworkUsage, row => row.usedDeskHours),
    coworkDistinctUsers: distinct(allCoworkUsage, row => row.professionalId), coworkCohortDistinctUsers: distinct(coworkUsage, row => row.professionalId),
    coworkOccupancy: coworkAvailableDeskHours ? coworkUsedDeskHours / coworkAvailableDeskHours : null,
    coworkExecutedCents, coworkCostPerUsedHourCents: coworkUsedDeskHours ? coworkExecutedCents / coworkUsedDeskHours : null,
    serviceRequests: serviceRequests.length, resolvedServiceRequests: resolved.length, openServiceRequests: serviceRequests.length - resolved.length,
    serviceResolutionRate: serviceRequests.length ? resolved.length / serviceRequests.length : null,
    serviceResolutionDaysMean: durationDays.length ? sum(durationDays, value => value) / durationDays.length : null,
    serviceResolutionDaysMedian: durationDays.length ? (durationDays[Math.floor((durationDays.length - 1) / 2)] + durationDays[Math.floor(durationDays.length / 2)]) / 2 : null,
    matureServiceRequests: mature.length, immatureServiceRequests: serviceRequests.length - mature.length,
    onTimeMatureServiceRequests: matureOnTime.length, lateResolvedMatureServiceRequests: matureLate.length,
    overdueOpenMatureServiceRequests: mature.length - matureOnTime.length - matureLate.length,
    matureServiceOnTimeRate: mature.length ? matureOnTime.length / mature.length : null,
    baselineProfessionals: scope.baselineProfessionalIds.size,
    participantReach: scope.baselineProfessionalIds.size ? domesticParticipants.size / scope.baselineProfessionalIds.size : null,
  };
}

export function institutionalParticipantIds(scope: InstitutionalScope, activityIds?: string[]): string[] {
  const selected = activityIds === undefined ? scope.activityIds : new Set(activityIds);
  const coworkMonthIds = new Set(scope.coworkMonths.filter(row => selected.has(row.activityId)).map(row => row.id));
  return [...new Set([...scope.participation.filter(row => row.attended && selected.has(row.activityId)).map(row => row.professionalId),
    ...scope.coworkUsage.filter(row => coworkMonthIds.has(row.coworkMonthId)).map(row => row.professionalId)]
    .filter((id): id is string => id !== undefined))].sort();
}

export function buildInstitutionalMonthly(scope: InstitutionalScope) {
  const { start, end } = windowBounds(scope.companyScope.filters.period, scope.companyScope.anchor);
  return scope.coveredMonths.filter(month => `${month}-01` >= start && `${month}-01` <= end).map(month => {
    const activityIds = new Set(scope.activities.filter(row => row.date.startsWith(month)).map(row => row.id));
    const attendance = scope.participation.filter(row => activityIds.has(row.activityId));
    const budget = scope.budgetEntries.filter(row => row.month === month);
    return { month, activities: activityIds.size, registrations: attendance.length, attendances: attendance.filter(row => row.attended).length,
      distinctParticipants: distinct(attendance.filter(row => row.attended), row => row.professionalId),
      plannedCents: sum(budget, row => row.plannedCents), executedCents: sum(budget, row => row.executedCents),
      activityIds: [...activityIds], professionalIds: institutionalParticipantIds(scope, [...activityIds]) };
  });
}

export function buildInstitutionalTerritory(scope: InstitutionalScope) {
  const cityIds = [...new Set([...scope.budgetEntries.map(row => row.cityId), ...scope.activities.map(row => row.cityId)])];
  const profiles = buildProfessionalModel(scope.dataset).profiles;
  const totalBudget = sum(scope.budgetEntries, row => row.executedCents);
  return cityIds.map(cityId => {
    const city = scope.dataset.cities.find(row => row.id === cityId)!;
    const activityIds = new Set(scope.activities.filter(row => row.cityId === cityId).map(row => row.id));
    const attended = scope.participation.filter(row => row.attended && activityIds.has(row.activityId));
    const executedCents = sum(scope.budgetEntries.filter(row => row.cityId === cityId), row => row.executedCents);
    const baselineProfessionals = profiles.filter(profile => profile.cityId === cityId && scope.baselineProfessionalIds.has(profile.id)).length;
    return { cityId, city: city.name, greId: city.greId, activities: activityIds.size, attendances: attended.length,
      distinctParticipants: distinct(attended, row => row.professionalId), baselineProfessionals, executedCents,
      budgetShare: totalBudget ? executedCents / totalBudget : null,
      professionalShare: scope.baselineProfessionalIds.size ? baselineProfessionals / scope.baselineProfessionalIds.size : null,
      activityIds: [...activityIds], professionalIds: institutionalParticipantIds(scope, [...activityIds]) };
  });
}

export function buildInstitutionalPrograms(scope: InstitutionalScope) {
  return scope.model.programs.filter(program => scope.options.programIds === undefined || scope.options.programIds.includes(program.id)).map(program => {
    const activities = scope.activities.filter(row => row.programId === program.id);
    const activityIds = new Set(activities.map(row => row.id));
    const attendance = scope.participation.filter(row => activityIds.has(row.activityId));
    const budget = scope.budgetEntries.filter(row => row.programId === program.id);
    return { programId: program.id, program: program.name, activities: activities.length,
      registrations: attendance.length, attendances: attendance.filter(row => row.attended).length,
      distinctParticipants: distinct(attendance.filter(row => row.attended), row => row.professionalId),
      plannedCents: sum(budget, row => row.plannedCents), executedCents: sum(budget, row => row.executedCents),
      activityIds: [...activityIds], professionalIds: institutionalParticipantIds(scope, [...activityIds]) };
  });
}

export function buildCoworkAnalysis(scope: InstitutionalScope) {
  return scope.coworkUnits.map(unit => {
    const months = scope.coworkMonths.filter(row => row.unitId === unit.id);
    const monthIds = new Set(months.map(row => row.id));
    const usage = scope.allCoworkUsage.filter(row => monthIds.has(row.coworkMonthId));
    const availableDeskHours = sum(months, row => row.availableDeskHours);
    const usedDeskHours = sum(usage, row => row.usedDeskHours);
    // Budget has one cowork unit per municipality in the demonstrative model.
    const executedCents = sum(scope.budgetEntries.filter(row => row.programId === 'coworkings' && row.cityId === unit.cityId), row => row.executedCents);
    return { unitId: unit.id, name: unit.name, cityId: unit.cityId, greId: unit.greId, availableDeskHours, usedDeskHours,
      occupancy: availableDeskHours ? usedDeskHours / availableDeskHours : null,
      uniqueUsers: distinct(usage, row => row.professionalId), executedCents,
      costPerUsedHourCents: usedDeskHours ? executedCents / usedDeskHours : null,
      professionalIds: [...new Set(usage.map(row => row.professionalId))].sort(), activityIds: months.map(row => row.activityId) };
  });
}

export function buildInstitutionalServiceAnalysis(scope: InstitutionalScope) {
  const categories: InstitutionalServiceRequest['category'][] = ['Atualização cadastral', 'Orientação sobre ART', 'Informação sobre atribuições', 'Esclarecimento de registro'];
  return categories.map(category => {
    const requests = scope.serviceRequests.filter(row => row.category === category);
    const mature = requests.filter(row => addDays(row.createdAt, row.targetDays) <= scope.companyScope.anchor);
    const resolved = requests.filter(row => row.resolvedAt && row.resolvedAt <= scope.companyScope.anchor);
    const onTime = mature.filter(row => row.resolvedAt && row.resolvedAt <= addDays(row.createdAt, row.targetDays));
    const lateResolved = mature.filter(row => row.resolvedAt && row.resolvedAt <= scope.companyScope.anchor && row.resolvedAt > addDays(row.createdAt, row.targetDays));
    return { category, requests: requests.length, resolved: resolved.length, pending: requests.length - resolved.length,
      mature: mature.length, immature: requests.length - mature.length, onTime: onTime.length, lateResolved: lateResolved.length,
      overdueOpen: mature.length - onTime.length - lateResolved.length,
      onTimeRate: mature.length ? onTime.length / mature.length : null, targetDays: 14,
      requestIds: requests.map(row => row.id), professionalIds: [...new Set(requests.map(row => row.professionalId).filter((id): id is string => Boolean(id)))],
      companyIds: [...new Set(requests.map(row => row.companyId).filter((id): id is string => Boolean(id)))] };
  });
}

export { institutionalIndicators } from './institutional-indicators';
