import type { Scope } from '../domain/engine';
import type { CaseStatus, Establishment } from '../domain/types';
import type { EnterpriseModel } from '../enterprise-v10/types';
import { averageAnnualTicket, median, stockBridge } from '../gestao-v14/metrics';

/** Painel de página única (V15/V16): só os indicadores que levam a uma decisão da administração. */
export type IndicatorId = 'base' | 'receipts' | 'debt' | 'gap' | 'noRt' | 'cases';
const DAY = 86400000;
const day = (date: string) => Math.floor(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / DAY);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const unique = (values: string[]) => [...new Set(values)].sort();

export interface AreaRow {
  id: string; name: string;
  active: number; growth: number | null; receipts: number; receiptsPrevious: number | null;
  overdue: number; debtors: number; charged: number; defaultRate: number | null;
  gap: number; eligible: number; coverage: number | null; noRt: number; noRtRate: number | null; openCases: number; oldCases: number; oldRate: number | null;
  companyIds: string[];
}
export interface Indicator { id: IndicatorId; value: number | null; delta: number | null; spark: number[]; secondary: string }
export interface PanelData { areas: AreaRow[]; cities: AreaRow[]; total: AreaRow; indicators: Record<IndicatorId, Indicator>; ticket: number | null; monthly: { month: string; receipts: number; previous: number | null; active: number }[] }

/** Estabelecimento de referência: matriz do recorte, senão o primeiro (mesma regra do modelo V13). */
function representatives(scope: Scope): Map<string, Establishment> {
  const result = new Map<string, Establishment>();
  for (const row of scope.establishments) { const previous = result.get(row.companyId); if (!previous || previous.branch !== 'Matriz' && row.branch === 'Matriz') result.set(row.companyId, row); }
  return result;
}
const openStatuses = new Set<CaseStatus>(['Identificada', 'Validação cadastral', 'Análise técnica', 'Encaminhada']);

/** Janela de recebimentos equivalente um ano antes; null quando a série não cobre esse período. */
function previousYear(history: EnterpriseModel, period: number): number | null {
  const months = history.monthly;
  return months.length >= 12 + period ? sum(months.slice(months.length - 12 - period, months.length - 12).map(row => row.receipts)) : null;
}

export function buildPanel(scope: Scope, model: EnterpriseModel, history: EnterpriseModel): PanelData {
  const period = scope.filters.period, rep = representatives(scope), facts = new Map(model.companyFacts.map(row => [row.companyId, row]));
  const establishments = new Map(scope.establishments.map(row => [row.id, row]));
  const active = new Set(model.metadata.activeCompanyIds);
  const before = history.monthly.length > period ? new Set(history.monthly[history.monthly.length - 1 - period].activeIds) : new Set(model.metadata.openingCompanyIds);
  const charged = new Set(model.metrics.compliance.denominatorCompanyIds ?? []), compliant = new Set(model.metrics.compliance.companyIds);
  const withRt = new Set(model.metrics.rtCoverage.companyIds);
  const activeEligible = new Set(model.metadata.activeEligibleEstablishmentIds);
  const eligibleEstablishments = model.metadata.eligibleEstablishmentIds.map(id => establishments.get(id)).filter((row): row is Establishment => Boolean(row));
  const gapEstablishments = eligibleEstablishments.filter(row => !activeEligible.has(row.id));
  const open = scope.cases.filter(row => openStatuses.has(row.status));
  const paymentsByCompany = new Map<string, number>();
  const previousStart = history.monthly.length >= 12 + period ? history.monthly[history.monthly.length - 12 - period].month : null;
  const previousEnd = history.monthly.length >= 12 ? history.monthly[history.monthly.length - 13]?.month : null;
  if (previousStart && previousEnd) for (const invoice of scope.invoices) {
    const month = invoice.paymentDate?.slice(0, 7);
    if (month && month >= previousStart && month <= previousEnd && invoice.paidAmount > 0) paymentsByCompany.set(invoice.companyId, (paymentsByCompany.get(invoice.companyId) ?? 0) + invoice.paidAmount);
  }

  const aggregate = (id: string, name: string, member: (companyId: string) => boolean, establishmentMember: (row: Establishment) => boolean): AreaRow => {
    const companies = scope.companies.map(row => row.id).filter(member);
    const nowActive = companies.filter(companyId => active.has(companyId)), wasActive = companies.filter(companyId => before.has(companyId)).length;
    const chargedHere = companies.filter(companyId => charged.has(companyId)), debtors = chargedHere.filter(companyId => !compliant.has(companyId)).length;
    const noRt = nowActive.filter(companyId => !withRt.has(companyId)).length;
    const cases = open.filter(row => { const place = establishments.get(row.establishmentId); return place ? establishmentMember(place) : false; });
    const receiptsPrevious = previousStart ? sum(companies.map(companyId => paymentsByCompany.get(companyId) ?? 0)) : null;
    const eligible = eligibleEstablishments.filter(establishmentMember).length, gapHere = gapEstablishments.filter(establishmentMember).length;
    const oldCases = cases.filter(row => day(scope.anchor) - day(row.createdAt) > 365).length;
    return { id, name, active: nowActive.length, growth: wasActive ? (nowActive.length - wasActive) / wasActive * 100 : null,
      receipts: sum(companies.map(companyId => facts.get(companyId)?.receipts ?? 0)), receiptsPrevious,
      overdue: sum(companies.map(companyId => facts.get(companyId)?.overdue ?? 0)), debtors, charged: chargedHere.length, defaultRate: chargedHere.length ? debtors / chargedHere.length * 100 : null,
      gap: gapEstablishments.filter(establishmentMember).length, eligible, coverage: eligible ? (eligible - gapHere) / eligible * 100 : null,
      noRt, noRtRate: nowActive.length ? noRt / nowActive.length * 100 : null,
      openCases: cases.length, oldCases, oldRate: cases.length ? oldCases / cases.length * 100 : null, companyIds: companies };
  };
  const areas = scope.dataset.gres.map(gre => aggregate(gre.id, gre.name, companyId => rep.get(companyId)?.greId === gre.id, row => row.greId === gre.id)).filter(row => row.companyIds.length || row.gap || row.openCases);
  const cities = scope.dataset.cities.map(city => aggregate(city.id, city.name, companyId => rep.get(companyId)?.cityId === city.id, row => row.cityId === city.id)).filter(row => row.companyIds.length || row.gap);
  const total = aggregate('all', 'Total', () => true, () => true);

  const months = history.monthly, current = months.slice(-12), last = months.slice(-24, -12);
  const ticket = averageAnnualTicket(scope);
  const bridge = stockBridge(model, scope);
  const yoy = previousYear(history, period);
  const indicators: Record<IndicatorId, Indicator> = {
    base: { id: 'base', value: total.active, delta: total.growth, spark: months.map(row => row.base), secondary: `${bridge.newcomers + bridge.returning} entradas · ${bridge.exits} saídas` },
    receipts: { id: 'receipts', value: model.metrics.receipts.value, delta: yoy ? ((model.metrics.receipts.value ?? 0) - yoy) / yoy * 100 : null, spark: months.map(row => row.receipts), secondary: yoy === null ? 'sem base do ano anterior' : `mesmo período do ano anterior: ${brl(yoy)}` },
    debt: { id: 'debt', value: model.metrics.overdue.value, delta: total.defaultRate, spark: months.map(row => row.overdue), secondary: `${total.debtors.toLocaleString('pt-BR')} de ${total.charged.toLocaleString('pt-BR')} empresas cobradas em atraso` },
    gap: { id: 'gap', value: total.gap, delta: null, spark: [], secondary: ticket === null ? '' : `potencial de ${brl(total.gap * ticket)}/ano em anuidades` },
    noRt: { id: 'noRt', value: total.noRt, delta: total.noRtRate, spark: [], secondary: `de ${total.active.toLocaleString('pt-BR')} empresas com registro ativo` },
    cases: { id: 'cases', value: total.openCases, delta: null, spark: [], secondary: `${total.oldCases.toLocaleString('pt-BR')} abertos há mais de 1 ano · mediana ${Math.round(median(open.map(row => day(scope.anchor) - day(row.createdAt))) ?? 0)} dias` },
  };
  return { areas, cities, total, indicators, ticket, monthly: current.map((row, index) => ({ month: row.month, receipts: row.receipts, previous: last[index]?.receipts ?? null, active: row.base })) };
}
export const brl = (value: number) => `R$ ${value.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })}`;

/* ---------- Listas de ação (detalhe ao clicar) ---------- */
export interface ActionRow { companyId: string; name: string; cnpj: string; city: string; gre: string; value: number; valueLabel: string; note: string }
export function actionList(id: IndicatorId, scope: Scope, model: EnterpriseModel, areaFilter?: (row: Establishment) => boolean): ActionRow[] {
  const rep = representatives(scope), facts = new Map(model.companyFacts.map(row => [row.companyId, row]));
  const companies = new Map(scope.companies.map(row => [row.id, row]));
  const cities = new Map(scope.dataset.cities.map(row => [row.id, row.name])), gres = new Map(scope.dataset.gres.map(row => [row.id, row.name.split('·')[1]?.trim() ?? row.name]));
  const establishments = new Map(scope.establishments.map(row => [row.id, row]));
  const cnaes = new Map(scope.dataset.cnaes.map(row => [row.code, row.label]));
  const inArea = (companyId: string) => { const place = rep.get(companyId); return !areaFilter || Boolean(place && areaFilter(place)); };
  const base = (companyId: string, place = rep.get(companyId)) => ({ companyId, name: companies.get(companyId)?.tradeName || companies.get(companyId)?.name || companyId, cnpj: place?.cnpj ?? companies.get(companyId)?.rootCnpj ?? '', city: cities.get(place?.cityId ?? '') ?? '—', gre: gres.get(place?.greId ?? '') ?? '—' });
  const anchor = day(scope.anchor);
  if (id === 'debt') {
    const oldest = new Map<string, number>();
    for (const invoice of scope.invoices) { const open = invoice.amount - (invoice.paymentDate && invoice.paymentDate <= scope.anchor ? invoice.paidAmount : 0); if (invoice.dueDate < scope.anchor && open > 0) oldest.set(invoice.companyId, Math.max(oldest.get(invoice.companyId) ?? 0, anchor - day(invoice.dueDate))); }
    return model.companyFacts.filter(row => row.overdue > 0 && inArea(row.companyId)).sort((a, b) => b.overdue - a.overdue).map(row => ({ ...base(row.companyId), value: row.overdue, valueLabel: money(row.overdue), note: `atraso de ${oldest.get(row.companyId) ?? 0} dias${facts.get(row.companyId)?.active ? '' : ' · sem registro ativo'}` }));
  }
  if (id === 'noRt') {
    const withRt = new Set(model.metrics.rtCoverage.companyIds);
    return model.metadata.activeCompanyIds.filter(companyId => !withRt.has(companyId) && inArea(companyId)).map(companyId => { const fact = facts.get(companyId); const days = fact ? fact.registeredDays - fact.coveredDays : 0; return { ...base(companyId), value: days, valueLabel: `${days} dias`, note: `${fact?.artCount ?? 0} ARTs no período${(fact?.overdue ?? 0) > 0 ? ` · deve ${money(fact!.overdue)}` : ''}` }; }).sort((a, b) => b.value - a.value);
  }
  if (id === 'gap') {
    const active = new Set(model.metadata.activeEligibleEstablishmentIds), inactive = new Set(model.metadata.inactiveMatchedEstablishmentIds);
    return model.metadata.eligibleEstablishmentIds.filter(establishmentId => !active.has(establishmentId)).map(establishmentId => establishments.get(establishmentId)).filter((row): row is Establishment => Boolean(row && (!areaFilter || areaFilter(row))))
      .map(row => ({ ...base(row.companyId, row), value: day(row.openedAt), valueLabel: row.openedAt.split('-').reverse().join('/'), note: `${inactive.has(row.id) ? 'registro inativo' : 'nunca registrada'} · ${row.cnaeMain} ${(cnaes.get(row.cnaeMain) ?? '').split(/[,(]/)[0].trim().slice(0, 40)}` }))
      .sort((a, b) => b.value - a.value);
  }
  if (id === 'cases') {
    return scope.cases.filter(row => openStatuses.has(row.status)).map(row => ({ row, place: establishments.get(row.establishmentId) })).filter(item => item.place && (!areaFilter || areaFilter(item.place)))
      .map(({ row, place }) => ({ ...base(row.companyId, place), value: anchor - day(row.createdAt), valueLabel: `${anchor - day(row.createdAt)} dias`, note: `${row.status}${row.notice ? ` · ${row.notice.stage}` : ''}` })).sort((a, b) => b.value - a.value);
  }
  if (id === 'base') {
    const bridge = stockBridge(model, scope);
    return bridge.exitIds.filter(inArea).map(companyId => ({ ...base(companyId), value: facts.get(companyId)?.overdue ?? 0, valueLabel: (facts.get(companyId)?.overdue ?? 0) > 0 ? money(facts.get(companyId)!.overdue) : '—', note: 'saiu do registro no período' })).sort((a, b) => b.value - a.value);
  }
  return model.companyFacts.filter(row => row.receipts > 0 && inArea(row.companyId)).sort((a, b) => b.receipts - a.receipts).map(row => ({ ...base(row.companyId), value: row.receipts, valueLabel: money(row.receipts), note: row.overdue > 0 ? `ainda deve ${money(row.overdue)}` : 'em dia' }));
}
export const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

/** Distribuições curtas exibidas no detalhe. */
/** Saldo vencido por idade da parcela, com o mesmo critério de saldo do modelo (pagamento até o corte). */
export function debtAging(scope: Scope, areaFilter?: (row: Establishment) => boolean) {
  const rep = representatives(scope), anchor = day(scope.anchor);
  const buckets = [{ name: 'Até 30 dias', max: 30 }, { name: '31–90 dias', max: 90 }, { name: '91–180 dias', max: 180 }, { name: '181–365 dias', max: 365 }, { name: 'Acima de 365 dias', max: Infinity }].map(row => ({ ...row, value: 0 }));
  for (const invoice of scope.invoices) {
    const place = rep.get(invoice.companyId); if (areaFilter && (!place || !areaFilter(place))) continue;
    const open = invoice.amount - (invoice.paymentDate && invoice.paymentDate <= scope.anchor ? invoice.paidAmount : 0);
    if (invoice.dueDate >= scope.anchor || open <= 0) continue;
    const age = anchor - day(invoice.dueDate); buckets.find(row => age <= row.max)!.value += open;
  }
  return buckets.map(({ name, value }) => ({ name, value }));
}
export function caseStages(scope: Scope, areaFilter?: (row: Establishment) => boolean) {
  const stages: CaseStatus[] = ['Identificada', 'Validação cadastral', 'Análise técnica', 'Encaminhada'];
  const establishments = new Map(scope.establishments.map(row => [row.id, row]));
  const cases = scope.cases.filter(row => { const place = establishments.get(row.establishmentId); return !areaFilter || Boolean(place && areaFilter(place)); });
  return stages.map(stage => { const rows = cases.filter(row => row.status === stage); return { name: stage, value: rows.length, age: median(rows.map(row => day(scope.anchor) - day(row.createdAt))) }; });
}
export function gapByCnae(scope: Scope, model: EnterpriseModel, areaFilter?: (row: Establishment) => boolean) {
  const active = new Set(model.metadata.activeEligibleEstablishmentIds), establishments = new Map(scope.establishments.map(row => [row.id, row]));
  const labels = new Map(scope.dataset.cnaes.map(row => [row.code, row.label])), counts = new Map<string, number>();
  for (const id of model.metadata.eligibleEstablishmentIds) { const place = establishments.get(id); if (active.has(id) || !place || areaFilter && !areaFilter(place)) continue; counts.set(place.cnaeMain, (counts.get(place.cnaeMain) ?? 0) + 1); }
  return [...counts].map(([code, value]) => ({ name: `${code} ${(labels.get(code) ?? '').split(/[,(]/)[0].trim()}`.slice(0, 46), value })).sort((a, b) => b.value - a.value).slice(0, 8);
}
export { unique };
