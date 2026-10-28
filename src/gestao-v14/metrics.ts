import type { Scope } from '../domain/engine';
import type { CaseStatus, Dataset, Establishment } from '../domain/types';
import type { EnterpriseModel } from '../enterprise-v10/types';

/** Cockpit V14: medidas de gestão derivadas do mesmo modelo empresarial V13, sem pontuação opaca. */
const DAY = 86400000;
const day = (date: string) => Math.floor(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / DAY);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const unique = (values: string[]) => [...new Set(values)].sort();
export const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
export const quantile = (values: number[], q: number) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), position = (sorted.length - 1) * q, low = Math.floor(position);
  return sorted[low] + (sorted[Math.min(low + 1, sorted.length - 1)] - sorted[low]) * (position - low);
};

export interface Targets { coverage: number; rtCoverage: number; compliance: number; recovery: number }
export const defaultTargets: Targets = { coverage: 65, rtCoverage: 40, compliance: 60, recovery: 30 };

const mainCache = new WeakMap<Dataset, Map<string, Establishment>>();
/** Estabelecimento de referência da empresa: matriz, senão o primeiro estabelecimento. */
export function mainEstablishments(dataset: Dataset): Map<string, Establishment> {
  const saved = mainCache.get(dataset); if (saved) return saved;
  const result = new Map<string, Establishment>();
  for (const row of [...dataset.establishments].sort((a, b) => a.id.localeCompare(b.id))) {
    const previous = result.get(row.companyId);
    if (!previous || previous.branch !== 'Matriz' && row.branch === 'Matriz') result.set(row.companyId, row);
  }
  mainCache.set(dataset, result); return result;
}

/* ---------- KPIs com tendência ---------- */
export interface Kpi {
  id: 'base' | 'coverage' | 'receipts' | 'overdue' | 'opportunity';
  label: string; value: number | null; format: 'int' | 'pct' | 'brl';
  delta: number | null; deltaKind: 'pct' | 'pp'; deltaLabel: string; good: 'up' | 'down';
  spark: number[]; sparkLabels: string[]; target?: number; reference: string; origin: string; companyIds: string[];
}
/** Valor médio anual cobrado por empresa nas obrigações observadas: base da estimativa de potencial. */
export function averageAnnualTicket(scope: Scope): number | null {
  const byCompanyYear = new Map<string, number>();
  for (const row of scope.dataset.invoices) {
    if (row.dueDate > scope.anchor) continue;
    const key = `${row.companyId}|${row.dueDate.slice(0, 4)}`;
    byCompanyYear.set(key, (byCompanyYear.get(key) ?? 0) + row.amount);
  }
  return median([...byCompanyYear.values()]);
}
export function buildKpis(model: EnterpriseModel, history: EnterpriseModel, scope: Scope, targets: Targets): Kpi[] {
  const period = scope.filters.period, months = history.monthly, labels = months.map(row => row.month);
  const baseNow = model.metrics.base.value ?? 0;
  const baseBefore = months.length > period ? months[months.length - 1 - period].base : model.metadata.openingCompanyIds.length;
  const receiptsPrevious = months.length >= period * 2 ? sum(months.slice(-period * 2, -period).map(row => row.receipts)) : null;
  const overdueBefore = months.length > period ? months[months.length - 1 - period].overdue : null;
  const ticket = averageAnnualTicket(scope);
  const gap = model.metadata.eligibleEstablishmentIds.length - model.metadata.activeEligibleEstablishmentIds.length;
  const change = (now: number, before: number | null) => before ? (now - before) / before * 100 : null;
  const gapIds = new Set(model.metadata.notLocatedEstablishmentIds.concat(model.metadata.inactiveMatchedEstablishmentIds));
  return [
    { id: 'base', label: 'Empresas com registro vigente', value: baseNow, format: 'int', delta: change(baseNow, baseBefore), deltaKind: 'pct', deltaLabel: `vs. ${period} meses antes`, good: 'up', spark: months.map(row => row.base), sparkLabels: labels, reference: `${model.metadata.openingCompanyIds.length.toLocaleString('pt-BR')} na abertura da janela`, origin: 'CREA-SP', companyIds: model.metrics.base.companyIds },
    { id: 'coverage', label: 'Cobertura de registro', value: model.metrics.coverage.value, format: 'pct', delta: model.metrics.coverage.value === null ? null : model.metrics.coverage.value - targets.coverage, deltaKind: 'pp', deltaLabel: 'vs. meta', good: 'up', spark: [], sparkLabels: [], target: targets.coverage, reference: `${(model.metrics.coverage.numerator ?? 0).toLocaleString('pt-BR')} de ${(model.metrics.coverage.denominator ?? 0).toLocaleString('pt-BR')} CNPJs elegíveis`, origin: 'Receita × CREA-SP', companyIds: model.metrics.coverage.companyIds },
    { id: 'receipts', label: 'Arrecadação PJ no período', value: model.metrics.receipts.value, format: 'brl', delta: change(model.metrics.receipts.value ?? 0, receiptsPrevious), deltaKind: 'pct', deltaLabel: 'vs. período anterior', good: 'up', spark: months.map(row => row.receipts), sparkLabels: labels, reference: `adimplência ${(model.metrics.compliance.value ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% das empresas cobradas`, origin: 'Financeiro CREA-SP', companyIds: model.metrics.receipts.companyIds },
    { id: 'overdue', label: 'Saldo vencido PJ', value: model.metrics.overdue.value, format: 'brl', delta: change(model.metrics.overdue.value ?? 0, overdueBefore), deltaKind: 'pct', deltaLabel: `vs. ${period} meses antes`, good: 'down', spark: months.map(row => row.overdue), sparkLabels: labels, reference: `${model.metrics.overdue.companyIds.length.toLocaleString('pt-BR')} empresas devedoras`, origin: 'Financeiro CREA-SP', companyIds: model.metrics.overdue.companyIds },
    { id: 'opportunity', label: 'Potencial anual de registro', value: ticket === null ? null : gap * ticket, format: 'brl', delta: null, deltaKind: 'pct', deltaLabel: '', good: 'up', spark: [], sparkLabels: [], reference: `${gap.toLocaleString('pt-BR')} CNPJs elegíveis sem vigência × R$ ${(ticket ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/ano`, origin: 'Estimativa Receita × CREA-SP', companyIds: unique(scope.establishments.filter(row => gapIds.has(row.id)).map(row => row.companyId)) },
  ];
}

/* ---------- Ponte do estoque (waterfall) ---------- */
export interface Bridge { opening: number; newcomers: number; returning: number; exits: number; closing: number; newcomerIds: string[]; returningIds: string[]; exitIds: string[] }
/** Abertura + novas + retornos − saídas = fechamento, sempre em empresas-raiz distintas. */
export function stockBridge(model: EnterpriseModel, scope: Scope): Bridge {
  const opening = new Set(model.metadata.openingCompanyIds), closing = new Set(model.metadata.activeCompanyIds);
  const start = model.metadata.start;
  const previouslyRegistered = new Set(scope.registrations.filter(row => row.startedAt < start).map(row => row.companyId));
  const entered = [...closing].filter(id => !opening.has(id));
  const returningIds = entered.filter(id => previouslyRegistered.has(id)).sort();
  const newcomerIds = entered.filter(id => !previouslyRegistered.has(id)).sort();
  const exitIds = [...opening].filter(id => !closing.has(id)).sort();
  return { opening: opening.size, newcomers: newcomerIds.length, returning: returningIds.length, exits: exitIds.length, closing: closing.size, newcomerIds, returningIds, exitIds };
}

/* ---------- Funil de conformidade (Sankey) ---------- */
export interface FlowNode { name: string; value: number; companyIds: string[] }
export interface Flow { source: string; target: string; value: number; companyIds: string[] }
export function complianceFlow(model: EnterpriseModel, scope: Scope): { nodes: FlowNode[]; links: Flow[] } {
  const facts = new Map(model.companyFacts.map(row => [row.companyId, row]));
  const everRegistered = new Set(scope.registrations.filter(row => row.startedAt <= scope.anchor).map(row => row.companyId));
  const universe = model.companyFacts.filter(row => row.active || row.eligibleEstablishments > 0).map(row => row.companyId);
  const groups: Record<string, string[]> = {};
  const put = (key: string, id: string) => { (groups[key] ??= []).push(id); };
  for (const id of universe) {
    const fact = facts.get(id)!;
    if (!fact.active) { put(everRegistered.has(id) ? 'Só histórico' : 'Nunca registrada', id); continue; }
    put('Registro vigente', id);
    const rt = fact.withRt ? 'Com RT' : 'RT não identificado';
    put(rt, id); put(`${rt}>${fact.artCount > 0 ? 'Com ART no período' : 'Sem ART no período'}`, id);
  }
  const node = (name: string, companyIds: string[]) => ({ name, value: companyIds.length, companyIds });
  const nodes: FlowNode[] = [node('Universo empresarial', universe)];
  const links: Flow[] = [];
  for (const target of ['Registro vigente', 'Só histórico', 'Nunca registrada']) if (groups[target]?.length) { nodes.push(node(target, groups[target])); links.push({ source: 'Universo empresarial', target, value: groups[target].length, companyIds: groups[target] }); }
  for (const target of ['Com RT', 'RT não identificado']) if (groups[target]?.length) { nodes.push(node(target, groups[target])); links.push({ source: 'Registro vigente', target, value: groups[target].length, companyIds: groups[target] }); }
  const art = { with: [] as string[], without: [] as string[] };
  for (const source of ['Com RT', 'RT não identificado']) for (const [target, bucket] of [['Com ART no período', art.with], ['Sem ART no período', art.without]] as const) {
    const ids = groups[`${source}>${target}`] ?? [];
    if (ids.length) { links.push({ source, target, value: ids.length, companyIds: ids }); bucket.push(...ids); }
  }
  if (art.with.length) nodes.push(node('Com ART no período', art.with));
  if (art.without.length) nodes.push(node('Sem ART no período', art.without));
  return { nodes, links };
}

/* ---------- Previsão (Holt linear) e anomalias ---------- */
export interface Forecast { fitted: number[]; forecast: number[]; lower: number[]; upper: number[]; anomalies: number[]; sigma: number; trendPerMonth: number }
export function holtForecast(series: number[], horizon = 6, alpha = 0.5, beta = 0.3): Forecast {
  if (series.length < 3) return { fitted: [...series], forecast: [], lower: [], upper: [], anomalies: [], sigma: 0, trendPerMonth: 0 };
  let level = series[0], trend = series[1] - series[0];
  const fitted = [series[0]], residuals: number[] = [];
  for (let index = 1; index < series.length; index++) {
    const predicted = level + trend; fitted.push(predicted); residuals.push(series[index] - predicted);
    const previous = level;
    level = alpha * series[index] + (1 - alpha) * (level + trend);
    trend = beta * (level - previous) + (1 - beta) * trend;
  }
  const mean = sum(residuals) / residuals.length;
  const sigma = Math.sqrt(sum(residuals.map(value => (value - mean) ** 2)) / Math.max(1, residuals.length - 1));
  const anomalies = residuals.map((value, index) => sigma > 0 && Math.abs(value - mean) > 2 * sigma ? index + 1 : -1).filter(index => index >= 0);
  const forecast = Array.from({ length: horizon }, (_, step) => Math.max(0, level + trend * (step + 1)));
  const band = (step: number) => 1.96 * sigma * Math.sqrt(step + 1);
  return { fitted, forecast, lower: forecast.map((value, step) => Math.max(0, value - band(step))), upper: forecast.map((value, step) => value + band(step)), anomalies, sigma, trendPerMonth: trend };
}

/* ---------- Scorecard GRE (matriz com formatação condicional) ---------- */
export interface GreRow { id: string; name: string; base: number; coverage: number | null; rtCoverage: number | null; companyGrowth: number | null; jobGrowth: number | null; overdue: number; receipts: number; gap: number; spark: number[]; companyIds: string[]; withoutMatchIds: string[] }
/** A GRE da empresa segue a regra do modelo V13: matriz do recorte, senão o primeiro estabelecimento. */
export function greScorecard(model: EnterpriseModel, history: EnterpriseModel, scope: Scope): GreRow[] {
  const facts = new Map(model.companyFacts.map(row => [row.companyId, row]));
  const byCompany = new Map<string, Establishment[]>();
  for (const row of scope.establishments) byCompany.set(row.companyId, [...(byCompany.get(row.companyId) ?? []), row]);
  const representative = new Map([...byCompany].map(([id, rows]) => [id, (rows.find(row => row.branch === 'Matriz') ?? rows[0]).greId]));
  return model.regions.map(region => {
    const members = new Set([...representative].filter(([, gre]) => gre === region.id).map(([id]) => id));
    return { id: region.id, name: region.name, base: region.base, coverage: region.coverage, rtCoverage: region.rtCoverage, companyGrowth: region.companyGrowth, jobGrowth: region.jobGrowth,
      overdue: sum(region.companyIds.map(id => facts.get(id)?.overdue ?? 0)), receipts: sum(region.companyIds.map(id => facts.get(id)?.receipts ?? 0)), gap: region.withoutMatch,
      spark: history.monthly.map(month => month.activeIds.reduce((count, id) => count + (members.has(id) ? 1 : 0), 0)), companyIds: region.companyIds, withoutMatchIds: region.withoutMatchIds };
  }).filter(row => row.companyIds.length);
}

/* ---------- Árvore de decomposição ---------- */
export type DecompositionDimension = 'gre' | 'size' | 'cnae' | 'aging' | 'rt';
export const decompositionLabels: Record<DecompositionDimension, string> = { gre: 'GRE da matriz', size: 'Porte', cnae: 'Divisão CNAE', aging: 'Faixa de atraso', rt: 'Situação do RT' };
export interface DebtRow { companyId: string; value: number; gre: string; size: string; cnae: string; aging: string; rt: string }
export interface DecompositionNode { key: string; label: string; value: number; share: number; companyIds: string[] }
export function debtRows(model: EnterpriseModel, scope: Scope): DebtRow[] {
  const main = mainEstablishments(scope.dataset), gres = new Map(scope.dataset.gres.map(row => [row.id, row.name]));
  const companies = new Map(scope.companies.map(row => [row.id, row]));
  const cnaeLabel = new Map(scope.dataset.cnaes.map(row => [row.code, row.label]));
  const oldest = new Map<string, number>();
  for (const invoice of scope.invoices) {
    const open = invoice.amount - (invoice.paymentDate && invoice.paymentDate <= scope.anchor ? invoice.paidAmount : 0);
    if (invoice.dueDate >= scope.anchor || open <= 0) continue;
    oldest.set(invoice.companyId, Math.max(oldest.get(invoice.companyId) ?? 0, day(scope.anchor) - day(invoice.dueDate)));
  }
  const aging = (days: number) => days <= 90 ? 'Até 90 dias' : days <= 180 ? '91–180 dias' : days <= 365 ? '181–365 dias' : 'Acima de 1 ano';
  return model.companyFacts.filter(row => row.overdue > 0).map(row => {
    const establishment = main.get(row.companyId), division = establishment?.cnaeMain.slice(0, 2) ?? '--';
    return { companyId: row.companyId, value: row.overdue, gre: gres.get(establishment?.greId ?? '') ?? 'Sem GRE', size: companies.get(row.companyId)?.size ?? 'Não informado',
      cnae: `${division} · ${(cnaeLabel.get(establishment?.cnaeMain ?? '') ?? 'Sem CNAE').split(/[,(]/)[0].trim().slice(0, 34)}`, aging: aging(oldest.get(row.companyId) ?? 0), rt: row.withRt ? 'Com RT' : 'RT não identificado' };
  });
}
export function decompose(rows: DebtRow[], dimension: DecompositionDimension): DecompositionNode[] {
  const total = sum(rows.map(row => row.value)), groups = new Map<string, DebtRow[]>();
  for (const row of rows) groups.set(row[dimension], [...(groups.get(row[dimension]) ?? []), row]);
  return [...groups].map(([key, members]) => {
    const value = sum(members.map(row => row.value));
    return { key, label: key, value, share: total ? value / total * 100 : 0, companyIds: unique(members.map(row => row.companyId)) };
  }).sort((a, b) => b.value - a.value);
}

/* ---------- Recebimentos ano contra ano ---------- */
export function receiptsYoY(history: EnterpriseModel) {
  const months = history.monthly.slice(-24), current = months.slice(-12), previous = months.slice(-24, -12);
  return current.map((row, index) => ({ month: row.month, current: row.receipts, previous: previous[index]?.receipts ?? null, recovered: row.recovered }));
}

/* ---------- Matriz de prioridade (critérios explícitos) ---------- */
export interface PriorityPoint { companyId: string; name: string; overdue: number; gapShare: number; arts: number; quadrant: 'Agir já' | 'Cobrar' | 'Orientar RT' | 'Acompanhar' }
export function priorityMatrix(model: EnterpriseModel, scope: Scope): { points: PriorityPoint[]; overdueCut: number; gapCut: number } {
  const names = new Map(scope.companies.map(row => [row.id, row.tradeName || row.name]));
  const rows = model.companyFacts.filter(row => row.registeredDays > 0);
  const overdueCut = quantile(rows.filter(row => row.overdue > 0).map(row => row.overdue), 0.5) ?? 0, gapCut = 50;
  const points = rows.map(row => {
    const gapShare = (1 - row.coveredDays / row.registeredDays) * 100, highDebt = row.overdue > overdueCut && row.overdue > 0, highGap = gapShare >= gapCut;
    return { companyId: row.companyId, name: names.get(row.companyId) ?? row.companyId, overdue: row.overdue, gapShare, arts: row.artCount,
      quadrant: (highDebt && highGap ? 'Agir já' : highDebt ? 'Cobrar' : highGap ? 'Orientar RT' : 'Acompanhar') as PriorityPoint['quadrant'] };
  });
  return { points, overdueCut, gapCut };
}

/* ---------- Fiscalização ---------- */
export const caseStages: CaseStatus[] = ['Identificada', 'Validação cadastral', 'Análise técnica', 'Encaminhada', 'Concluída'];
export function inspectionFlow(scope: Scope) {
  const reached = caseStages.map(stage => ({ stage, count: scope.cases.filter(row => row.history.some(step => step.status === stage)).length, companyIds: unique(scope.cases.filter(row => row.status === stage).map(row => row.companyId)) }));
  const transitions = caseStages.slice(0, -1).map((stage, index) => {
    const durations = scope.cases.flatMap(row => {
      const from = row.history.find(step => step.status === stage), to = row.history.find(step => step.status === caseStages[index + 1]);
      return from && to ? [day(to.date) - day(from.date)] : [];
    });
    return { from: stage, to: caseStages[index + 1], median: median(durations), p75: quantile(durations, 0.75), p25: quantile(durations, 0.25), n: durations.length };
  });
  const open = scope.cases.filter(row => row.status !== 'Concluída');
  const ages = [{ name: 'Até 90 dias', min: 0, max: 90 }, { name: '91–180 dias', min: 91, max: 180 }, { name: '181–365 dias', min: 181, max: 365 }, { name: 'Acima de 1 ano', min: 366, max: Infinity }];
  const backlog = ages.map(bucket => {
    const rows = open.filter(row => { const age = day(scope.anchor) - day(row.createdAt); return age >= bucket.min && age <= bucket.max; });
    return { name: bucket.name, byStage: caseStages.slice(0, -1).map(stage => rows.filter(row => row.status === stage).length), companyIds: unique(rows.map(row => row.companyId)) };
  });
  const cycle = scope.cases.filter(row => row.completedAt).map(row => day(row.completedAt!) - day(row.createdAt));
  const notices = scope.cases.filter(row => row.notice).length;
  return { reached, transitions, backlog, open: open.length, total: scope.cases.length, cycleMedian: median(cycle), notices };
}

/* ---------- CAO: prazo de emissão e fila ---------- */
export function caoService(scope: Scope) {
  const issued = scope.caos.filter(row => row.issuedAt && row.issuedAt <= scope.anchor);
  const days = issued.map(row => day(row.issuedAt!) - day(row.requestedAt));
  const bins = [{ name: '≤30', max: 30 }, { name: '31–60', max: 60 }, { name: '61–90', max: 90 }, { name: '91–180', max: 180 }, { name: '181–365', max: 365 }, { name: '>365', max: Infinity }];
  let previous = -Infinity;
  const histogram = bins.map(bin => { const count = days.filter(value => value > previous && value <= bin.max).length; previous = bin.max; return { name: bin.name, count }; });
  const queue = (['Solicitada', 'Em análise', 'Pendente'] as const).map(status => {
    const rows = scope.caos.filter(row => row.status === status);
    return { status, count: rows.length, medianAge: median(rows.map(row => day(scope.anchor) - day(row.requestedAt))), companyIds: unique(rows.map(row => row.companyId)) };
  });
  return { issued: issued.length, revoked: scope.caos.filter(row => row.status === 'Revogada').length, median: median(days), p90: quantile(days, 0.9), histogram, queue };
}

/* ---------- ART: mês × GRE e modalidades ---------- */
export function artActivity(scope: Scope, history: Scope) {
  const main = mainEstablishments(scope.dataset);
  const months = unique(history.arts.map(row => row.date.slice(0, 7))).slice(-12);
  const gres = scope.dataset.gres.filter(gre => scope.establishments.some(row => row.greId === gre.id));
  const cells: [number, number, number][] = [];
  gres.forEach((gre, y) => months.forEach((month, x) => cells.push([x, y, history.arts.filter(row => row.date.startsWith(month) && main.get(row.companyId)?.greId === gre.id).length])));
  const modalities = new Map<string, { count: number; value: number }>();
  for (const row of scope.arts) { const item = modalities.get(row.modality) ?? { count: 0, value: 0 }; item.count++; item.value += row.value; modalities.set(row.modality, item); }
  return { months, gres: gres.map(row => row.name), cells, modalities: [...modalities].map(([name, item]) => ({ name, ...item })).sort((a, b) => b.count - a.count), total: scope.arts.length, value: sum(scope.arts.map(row => row.value)) };
}

/* ---------- Qualidade cadastral ---------- */
export function qualityQueue(scope: Scope) {
  const events = scope.dataset.qualityEvents.filter(row => scope.establishmentIds.has(row.establishmentId) && row.date <= scope.anchor);
  const kinds = new Map<string, { open: number; resolved: number; companyIds: string[] }>();
  for (const row of events) { const item = kinds.get(row.type) ?? { open: 0, resolved: 0, companyIds: [] }; if (row.resolved) item.resolved++; else { item.open++; item.companyIds.push(row.companyId); } kinds.set(row.type, item); }
  return [...kinds].map(([type, item]) => ({ type, ...item, companyIds: unique(item.companyIds) })).sort((a, b) => b.open - a.open);
}

/* ---------- Leitura do período (narrativa automática) ---------- */
export interface Insight { tone: 'good' | 'bad' | 'neutral'; text: string; strong: string }
const pct = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const brl = (value: number) => `R$ ${value.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })}`;
export function narrative(kpis: Kpi[], bridge: Bridge, gres: GreRow[], forecast: Forecast, decomposition: DecompositionNode[], targets: Targets, cao: ReturnType<typeof caoService>): Insight[] {
  const insights: Insight[] = [], base = kpis[0], coverage = kpis[1], receipts = kpis[2];
  const net = bridge.closing - bridge.opening;
  insights.push({ tone: net >= 0 ? 'good' : 'bad', strong: `${net >= 0 ? '+' : ''}${net.toLocaleString('pt-BR')} empresas`, text: `na base vigente: ${bridge.newcomers.toLocaleString('pt-BR')} novas e ${bridge.returning.toLocaleString('pt-BR')} retornos contra ${bridge.exits.toLocaleString('pt-BR')} saídas.` });
  if (forecast.forecast.length) insights.push({ tone: forecast.trendPerMonth >= 0 ? 'good' : 'bad', strong: `${Math.round(forecast.forecast.at(-1)!).toLocaleString('pt-BR')} empresas`, text: `é a projeção para daqui a ${forecast.forecast.length} meses se o ritmo recente continuar (${forecast.trendPerMonth >= 0 ? '+' : ''}${Math.round(forecast.trendPerMonth).toLocaleString('pt-BR')}/mês).` });
  if (coverage.value !== null) insights.push({ tone: coverage.value >= targets.coverage ? 'good' : 'bad', strong: pct(coverage.value), text: `de cobertura de registro, ${Math.abs(coverage.value - targets.coverage).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p. ${coverage.value >= targets.coverage ? 'acima' : 'abaixo'} da meta de ${targets.coverage}%.` });
  const ranked = gres.filter(row => row.coverage !== null && row.gap > 0).sort((a, b) => b.gap - a.gap);
  if (ranked[0]) insights.push({ tone: 'neutral', strong: ranked[0].name.split('·')[1]?.trim() ?? ranked[0].name, text: `concentra a maior lacuna: ${ranked[0].gap.toLocaleString('pt-BR')} CNPJs elegíveis sem registro vigente.` });
  if (receipts.value !== null && receipts.delta !== null) insights.push({ tone: receipts.delta >= 0 ? 'good' : 'bad', strong: brl(receipts.value), text: `arrecadados de PJ, ${pct(Math.abs(receipts.delta))} ${receipts.delta >= 0 ? 'acima' : 'abaixo'} do período anterior.` });
  if (decomposition[0]) insights.push({ tone: 'bad', strong: pct(decomposition[0].share), text: `do saldo vencido está em ${decomposition[0].label} (${brl(decomposition[0].value)}).` });
  if (cao.median !== null) insights.push({ tone: cao.median <= 90 ? 'good' : 'bad', strong: `${Math.round(cao.median)} dias`, text: `é o prazo mediano de emissão de CAO; ${cao.queue.reduce((total, row) => total + row.count, 0).toLocaleString('pt-BR')} pedidos aguardam.` });
  if (base.delta !== null && Math.abs(base.delta) < 0.05) insights.push({ tone: 'neutral', strong: 'Base estável', text: 'em relação ao início da janela.' });
  return insights;
}
