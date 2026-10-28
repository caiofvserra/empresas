import type { Scope } from '../domain/engine';
import { windowBounds } from '../domain/engine';
import type { Dataset, Invoice, Registration } from '../domain/types';
import { classifyDigitalObject } from '../domain/digital-inspection';
import { buildEnterpriseEvidence, isValidEnterpriseCnpj, normalizeEnterpriseCnpj } from './data';
import type { EnterpriseEvidence } from './data';
import type { EnterpriseMetric, EnterpriseModel, EnterpriseRegion, EnterpriseSector, MetricId } from './types';
export type { EnterpriseModel, EnterpriseMetric, EnterpriseIndicator, MetricId } from './types';

const DAY = 86400000;
const dateDay = (date: string) => Math.floor(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / DAY);
const dateText = (day: number) => new Date(day * DAY).toISOString().slice(0, 10);
const ids = (values: string[]) => [...new Set(values)].sort();
const cents = (value: number) => Math.round(value * 100);
const rate = (numerator: number, denominator: number) => denominator > 0 ? numerator / denominator * 100 : null;
const change = (first: number, last: number) => first > 0 ? (last - first) / first * 100 : null;
type Interval = [number, number];
const cache = new WeakMap<Scope, EnterpriseModel>();
const indexCache = new WeakMap<Dataset, ReturnType<typeof createIndex>>();
function mergeIntervals(intervals: Interval[]): Interval[] {
  const result: Interval[] = [];
  for (const [start, end] of [...intervals].filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0] || a[1] - b[1])) {
    const previous = result.at(-1);
    if (previous && start <= previous[1]) previous[1] = Math.max(previous[1], end);
    else result.push([start, end]);
  }
  return result;
}
const at = (intervals: Interval[] | undefined, cut: number) => Boolean(intervals?.some(([start, end]) => start <= cut && cut < end));
const intervalDays = (intervals: Interval[], start: number, end: number) => intervals.reduce((sum, [a, b]) => sum + Math.max(0, Math.min(end, b) - Math.max(start, a)), 0);
function coveredDays(registrations: Interval[], links: Interval[], start: number, end: number) {
  let total = 0;
  for (const [a, b] of registrations) for (const [c, d] of links) total += Math.max(0, Math.min(b, d, end) - Math.max(a, c, start));
  return total;
}
function createIndex(dataset: Dataset) {
  const ledger = new Map<string, Dataset['movements']>();
  for (const row of dataset.movements) ledger.set(row.registrationId, [...(ledger.get(row.registrationId) ?? []), row]);
  const registrationIntervals = new Map<string, Interval[]>();
  for (const registration of dataset.registrations) {
    const history = (ledger.get(registration.id) ?? []).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    const intervals: Interval[] = []; let opened: number | null = null;
    if (!history.length) intervals.push([dateDay(registration.startedAt), registration.ceasedAt ? dateDay(registration.ceasedAt) : Infinity]);
    for (const event of history) {
      const cut = dateDay(event.date);
      if (event.type === 'Novo registro' || event.type === 'Reativação') { if (opened === null) opened = cut; }
      else if (opened !== null) { intervals.push([opened, cut]); opened = null; }
    }
    if (opened !== null) intervals.push([opened, Infinity]);
    registrationIntervals.set(registration.id, mergeIntervals(intervals));
  }
  const establishmentById = new Map(dataset.establishments.map(row => [row.id, row]));
  const registrationsByCnpj = new Map<string, Registration[]>();
  for (const registration of dataset.registrations) {
    const establishment = establishmentById.get(registration.establishmentId); if (!establishment) continue;
    const key = normalizeEnterpriseCnpj(establishment.cnpj);
    registrationsByCnpj.set(key, [...(registrationsByCnpj.get(key) ?? []), registration]);
  }
  const rtByCompany = new Map<string, Interval[]>();
  for (const link of dataset.technicalLinks) rtByCompany.set(link.companyId, [...(rtByCompany.get(link.companyId) ?? []), [dateDay(link.startDate), link.endDate ? dateDay(link.endDate) : Infinity]]);
  for (const [companyId, intervals] of rtByCompany) rtByCompany.set(companyId, mergeIntervals(intervals));
  return { registrationIntervals, registrationsByCnpj, establishmentById, rtByCompany };
}
function indexFor(dataset: Dataset) { let index = indexCache.get(dataset); if (!index) { index = createIndex(dataset); indexCache.set(dataset, index); } return index; }
function balance(invoice: Invoice, cutoff: string, snapshot: string): number | null {
  if (invoice.paidAmount > 0 && !invoice.paymentDate && cutoff !== snapshot) return null;
  const paid = invoice.paymentDate ? invoice.paymentDate <= cutoff ? cents(invoice.paidAmount) : 0 : cents(invoice.paidAmount);
  return Math.max(0, cents(invoice.amount) - paid);
}

/** New business-only analytical model. Every displayed subset is identified here. */
export function buildEnterpriseModel(scope: Scope, suppliedEvidence?: EnterpriseEvidence): EnterpriseModel {
  if (!suppliedEvidence) { const saved = cache.get(scope); if (saved) return saved; }
  const { dataset, anchor } = scope;
  const { start, previousEnd: openingCut } = windowBounds(scope.filters.period, anchor);
  const firstDay = dateDay(start), lastDay = dateDay(anchor), openingDay = firstDay - 1;
  const inPeriod = (date: string | undefined) => Boolean(date && date >= start && date <= anchor);
  const index = indexFor(dataset), evidence = suppliedEvidence ?? buildEnterpriseEvidence(dataset);
  const companyIntervals = new Map<string, Interval[]>();
  for (const registration of scope.registrations) companyIntervals.set(registration.companyId, [...(companyIntervals.get(registration.companyId) ?? []), ...(index.registrationIntervals.get(registration.id) ?? [])]);
  for (const [companyId, intervals] of companyIntervals) companyIntervals.set(companyId, mergeIntervals(intervals));
  const activeIds = ids([...companyIntervals].filter(([, intervals]) => at(intervals, lastDay)).map(([id]) => id));
  const openingIds = ids([...companyIntervals].filter(([, intervals]) => at(intervals, openingDay)).map(([id]) => id));
  const activeSet = new Set(activeIds);
  const registeredPeriodIds = ids([...companyIntervals].filter(([, intervals]) => intervalDays(intervals, firstDay, lastDay + 1) > 0).map(([id]) => id));
  const registeredPeriodSet = new Set(registeredPeriodIds);
  const cnaes = new Map(dataset.cnaes.map(row => [row.code, row]));
  const canonical = new Map<string, Scope['establishments'][number]>();
  for (const establishment of [...scope.establishments].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!isValidEnterpriseCnpj(establishment.cnpj) || establishment.rfbStatus !== 'Ativa' || establishment.openedAt > anchor) continue;
    if (![establishment.cnaeMain, ...establishment.cnaeSecondary].some(code => ['Relacionado', 'Depende de análise'].includes(cnaes.get(code)?.classification ?? ''))) continue;
    if (!canonical.has(normalizeEnterpriseCnpj(establishment.cnpj))) canonical.set(normalizeEnterpriseCnpj(establishment.cnpj), establishment);
  }
  const eligible = [...canonical.values()];
  const exactRegistrations = (cnpj: string) => index.registrationsByCnpj.get(normalizeEnterpriseCnpj(cnpj)) ?? [];
  const exactAt = (cnpj: string, cutoff: string) => exactRegistrations(cnpj).some(row => at(index.registrationIntervals.get(row.id), dateDay(cutoff)));
  const knownAt = (cnpj: string, cutoff: string) => exactRegistrations(cnpj).some(row => row.startedAt <= cutoff);
  const activeEligible = eligible.filter(row => exactAt(row.cnpj, anchor));
  const notLocated = eligible.filter(row => !knownAt(row.cnpj, anchor));
  const inactiveMatched = eligible.filter(row => knownAt(row.cnpj, anchor) && !exactAt(row.cnpj, anchor));
  const newMarket = notLocated.filter(row => inPeriod(row.openedAt));
  const economicallyActive = new Set(scope.establishments.filter(row => row.rfbStatus === 'Ativa').map(row => row.companyId));
  const retentionCohort = openingIds.filter(id => economicallyActive.has(id));
  const retained = retentionCohort.filter(id => activeSet.has(id));
  const rtWith = activeIds.filter(id => at(index.rtByCompany.get(id), lastDay));
  const rtWithout = activeIds.filter(id => !at(index.rtByCompany.get(id), lastDay));
  const artRows = scope.arts.filter(row => registeredPeriodSet.has(row.companyId) && inPeriod(row.date));
  const artCompanies = ids(artRows.map(row => row.companyId));
  const artCompanySet = new Set(artCompanies), rtWithSet = new Set(rtWith);
  const daysByCompany = new Map(registeredPeriodIds.map(id => {
    const registrations = companyIntervals.get(id) ?? [], links = index.rtByCompany.get(id) ?? [];
    return [id, { registered: intervalDays(registrations, firstDay, lastDay + 1), covered: coveredDays(registrations, links, firstDay, lastDay + 1) }];
  }));
  const totalDays = [...daysByCompany.values()].reduce((sum, row) => sum + row.registered, 0);
  const totalCoveredDays = [...daysByCompany.values()].reduce((sum, row) => sum + row.covered, 0);
  const periodContracts = [...new Map(scope.contracts.filter(row => inPeriod(row.date)).map(row => [row.id, row])).values()];
  const technicalContracts = periodContracts.filter(row => classifyDigitalObject(row.object).engineering);
  const technicalContractIds = new Set(technicalContracts.map(row => row.id));
  const artById = new Map(dataset.arts.map(row => [row.id, row]));
  const contractById = new Map(technicalContracts.map(row => [row.id, row]));
  const validBridge = [...new Map(evidence.contractArt.filter(row => {
    const art = artById.get(row.artId), contract = contractById.get(row.contractId);
    return technicalContractIds.has(row.contractId) && row.recordedAt <= anchor && Boolean(art && contract
      && art.companyId === row.companyId && contract.companyId === row.companyId
      && row.recordedAt >= art.date && row.recordedAt >= contract.date);
  }).map(row => [`${row.contractId}::${row.artId}`, row])).values()];
  const tracedContracts = technicalContracts.filter(row => validBridge.some(bridge => bridge.contractId === row.id));
  const providerLast = new Map<string, typeof technicalContracts[number]>();
  for (const contract of technicalContracts) {
    const provider = index.establishmentById.get(contract.establishmentId); if (!provider || !isValidEnterpriseCnpj(provider.cnpj)) continue;
    const cnpj = normalizeEnterpriseCnpj(provider.cnpj), previous = providerLast.get(cnpj);
    if (!previous || contract.date > previous.date || contract.date === previous.date && contract.id > previous.id) providerLast.set(cnpj, contract);
  }
  const supplierActive = [...providerLast].filter(([cnpj, contract]) => exactAt(cnpj, contract.date));
  const supplierInactive = [...providerLast].filter(([cnpj, contract]) => !exactAt(cnpj, contract.date));
  const technicalEstablishments = new Set(technicalContracts.map(row => row.establishmentId));
  const convergent = eligible.filter(row => technicalEstablishments.has(row.id) && !exactAt(row.cnpj, anchor));
  const convergentIds = ids(convergent.map(row => row.companyId));
  const invoices = scope.invoices.filter(row => Number.isFinite(row.amount) && row.amount >= 0 && row.dueDate <= anchor);
  const financeIds = ids(invoices.map(row => row.companyId));
  const overdueInvoices = invoices.filter(row => row.dueDate < anchor && (balance(row, anchor, anchor) ?? 0) > 0);
  const lateIds = new Set(overdueInvoices.map(row => row.companyId));
  const compliantIds = financeIds.filter(id => !lateIds.has(id));
  const paid = scope.invoices.filter(row => row.paidAmount > 0 && Number.isFinite(row.paidAmount) && inPeriod(row.paymentDate));
  const openingInvoices = invoices.filter(row => row.dueDate < start && (balance(row, openingCut, anchor) ?? 0) > 0);
  const openingBalance = openingInvoices.reduce((sum, row) => sum + (balance(row, openingCut, anchor) ?? 0), 0);
  const openingPaid = openingInvoices.filter(row => inPeriod(row.paymentDate));
  const recoveredCents = openingPaid.reduce((sum, row) => sum + Math.min(cents(row.paidAmount), balance(row, openingCut, anchor) ?? 0), 0);
  const receiptsCents = paid.reduce((sum, row) => sum + cents(row.paidAmount), 0);
  const overdueCents = overdueInvoices.reduce((sum, row) => sum + (balance(row, anchor, anchor) ?? 0), 0);
  const scopedEstablishmentIds = scope.establishmentIds;
  const cohort = evidence.observations.filter(row => row.observedAt === openingCut && scopedEstablishmentIds.has(row.establishmentId)
    && !knownAt(row.cnpj, openingCut));
  const converted = cohort.filter(row => exactRegistrations(row.cnpj).some(registration => registration.startedAt > row.observedAt && registration.startedAt <= anchor));
  const economicMonths = ids(scope.employment.map(row => row.month));
  const firstMonth = economicMonths[0] ?? '', lastMonth = economicMonths.at(-1) ?? '';
  const employmentFirst = scope.employment.filter(row => row.month === firstMonth).reduce((sum, row) => sum + row.stock, 0);
  const employmentLast = scope.employment.filter(row => row.month === lastMonth).reduce((sum, row) => sum + row.stock, 0);
  const comparable = !scope.employmentScopeLimited && firstMonth !== lastMonth && Boolean(firstMonth && lastMonth);
  const employmentGrowth = comparable ? change(employmentFirst, employmentLast) : null;
  const metrics = {} as Record<MetricId, EnterpriseMetric>;
  const metric = (id: MetricId, value: number | null, unit: EnterpriseMetric['unit'], companyIds: string[], note: string, numerator?: number, denominator?: number, denominatorCompanyIds?: string[], factIds?: string[]) => {
    metrics[id] = { id, value, unit, companyIds: ids(companyIds), note, ...(numerator !== undefined ? { numerator } : {}), ...(denominator !== undefined ? { denominator } : {}), ...(denominatorCompanyIds ? { denominatorCompanyIds: ids(denominatorCompanyIds) } : {}), ...(factIds ? { factIds: ids(factIds) } : {}) };
  };
  metric('base', activeIds.length, 'companies', activeIds, `Raízes distintas; saldo de ${activeIds.length - openingIds.length} empresas desde ${openingCut}.`, activeIds.length, undefined, undefined, scope.registrations.filter(row => at(index.registrationIntervals.get(row.id), lastDay)).map(row => row.id));
  metric('retention', rate(retained.length, retentionCohort.length), 'percent', retained, 'Coorte vigente na abertura e com estabelecimento RFB ativo no corte atual; não há inferência de situação RFB passada.', retained.length, retentionCohort.length, retentionCohort);
  metric('coverage', rate(activeEligible.length, eligible.length), 'percent', activeEligible.map(row => row.companyId), 'CNPJ completo e registro vigente. CNAE delimita universo de análise, sem concluir obrigação de registro.', activeEligible.length, eligible.length, eligible.map(row => row.companyId), activeEligible.map(row => row.id));
  metric('newMarket', newMarket.length, 'establishments', newMarket.map(row => row.companyId), 'Estabelecimentos abertos na janela, ativos na RFB e sem qualquer registro exato localizado até o corte.', newMarket.length, undefined, undefined, newMarket.map(row => row.id));
  metric('rtCoverage', rate(rtWith.length, activeIds.length), 'percent', rtWith, 'Vínculo técnico vigente identificado por empresa; escopo de estabelecimento/atribuição depende de homologação.', rtWith.length, activeIds.length, activeIds);
  metric('rtContinuity', rate(totalCoveredDays, totalDays), 'percent', registeredPeriodIds.filter(id => (daysByCompany.get(id)?.covered ?? 0) > 0), 'Dias-empresa de vínculo RT identificado / dias-empresa de registro vigente na janela. Não é conclusão de adequação legal.', totalCoveredDays, totalDays, registeredPeriodIds);
  metric('corporateActivity', rate(artCompanies.length, registeredPeriodIds.length), 'percent', artCompanies, 'Empresas com ART empresarial expressa no período / empresas com registro vigente em algum dia; não mede emprego ou execução física.', artCompanies.length, registeredPeriodIds.length, registeredPeriodIds, artRows.map(row => row.id));
  metric('economicContext', employmentGrowth, 'percent', registeredPeriodIds, comparable ? 'Variação entre os estoques do primeiro e último mês comparáveis; emprego permanece agregado por território/CNAE/CBO.' : 'Comparação indisponível: janela sem dois estoques válidos ou filtro nominal/porte/situação reduz apenas o cadastro. Emprego não é atribuído à coorte de empresas.', employmentLast, employmentFirst);
  metric('publicDemand', technicalContracts.reduce((sum, row) => sum + cents(row.value), 0) / 100, 'currency', technicalContracts.map(row => row.companyId), 'Valor nominal de contratos únicos publicados no período com indício textual técnico. Não é receita CREA, valor executado ou soma de aditivos.', undefined, undefined, undefined, technicalContracts.map(row => row.id));
  metric('supplierCoverage', rate(supplierActive.length, providerLast.size), 'percent', supplierActive.map(([, row]) => row.companyId), 'CNPJs completos vigentes na publicação mais recente de cada fornecedor técnico da janela; publicação não equivale a execução.', supplierActive.length, providerLast.size, [...providerLast.values()].map(row => row.companyId));
  metric('contractTrace', rate(tracedContracts.length, technicalContracts.length), 'percent', tracedContracts.map(row => row.companyId), 'Contratos com ao menos uma ponte contrato–ART documental explícita disponível. Sem ponte não significa ausência de ART.', tracedContracts.length, technicalContracts.length, technicalContracts.map(row => row.companyId), validBridge.map(row => row.id));
  metric('convergentEvidence', convergentIds.length, 'companies', convergentIds, 'Empresas com CNAE elegível, CNPJ sem vigência exata e contrato técnico na janela: critérios booleanos verificáveis, sem pontuação ou infração presumida.', convergentIds.length, undefined, undefined, convergent.map(row => row.id));
  metric('compliance', rate(compliantIds.length, financeIds.length), 'percent', compliantIds, 'Empresas com obrigações já exigíveis e sem saldo vencido no corte. Sem obrigação observada não é adimplência presumida.', compliantIds.length, financeIds.length, financeIds);
  metric('receipts', receiptsCents / 100, 'currency', paid.map(row => row.companyId), 'Fluxo PJ pela data efetiva de pagamento. Não inclui valor contratual de ART/PNCP; recuperação é parte desse fluxo.', undefined, undefined, undefined, paid.map(row => row.id));
  metric('overdue', overdueCents / 100, 'currency', [...lateIds], 'Estoque vencido no corte, líquido de pagamentos identificados; não somar saldos de meses.', undefined, undefined, undefined, overdueInvoices.map(row => row.id));
  metric('recovery', rate(recoveredCents, openingBalance), 'percent', openingPaid.map(row => row.companyId), 'Pagamentos no período de obrigações vencidas e em aberto na abertura / saldo dessa mesma coorte. Sem atribuição causal à gestão.', recoveredCents / 100, openingBalance / 100, openingInvoices.map(row => row.companyId), openingPaid.map(row => row.id));
  metric('observedEntry', rate(converted.length, cohort.length), 'percent', converted.map(row => row.companyId), `Coorte externa documental de ${openingCut}, sem correspondência naquele corte; primeiras inscrições posteriores observadas, não efeito causal de uma ação.`, converted.length, cohort.length, cohort.map(row => row.companyId), converted.map(row => row.id));
  const months = Array.from({ length: scope.filters.period }, (_, offset) => new Date(Date.UTC(Number(start.slice(0, 4)), Number(start.slice(5, 7)) - 1 + offset, 1)).toISOString().slice(0, 7));
  const monthly = months.map(month => {
    const monthStart = dateDay(`${month}-01`), monthEnd = Math.min(lastDay, dateDay(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10)));
    const currentActiveIds = ids([...companyIntervals].filter(([, intervals]) => at(intervals, monthEnd)).map(([id]) => id));
    const entered: string[] = [], exited: string[] = [];
    for (const [companyId, intervals] of companyIntervals) for (const [a, b] of intervals) {
      if (a >= monthStart && a <= monthEnd) entered.push(companyId);
      if (b >= monthStart && b <= monthEnd) exited.push(companyId);
    }
    const monthlyArts = artRows.filter(row => row.date.startsWith(month));
    const monthlyPaid = paid.filter(row => row.paymentDate?.startsWith(month));
    const monthlyRecovered = openingPaid.filter(row => row.paymentDate?.startsWith(month));
    const end = dateText(monthEnd);
    return { month, base: currentActiveIds.length, entered: entered.length, exited: exited.length, arts: monthlyArts.length,
      artCompanies: ids(monthlyArts.map(row => row.companyId)).length, receipts: monthlyPaid.reduce((sum, row) => sum + cents(row.paidAmount), 0) / 100,
      recovered: monthlyRecovered.reduce((sum, row) => sum + Math.min(cents(row.paidAmount), balance(row, openingCut, anchor) ?? 0), 0) / 100,
      overdue: invoices.filter(row => row.dueDate < end).reduce((sum, row) => sum + (balance(row, end, anchor) ?? 0), 0) / 100,
      companyIds: currentActiveIds, activeIds: currentActiveIds, enteredIds: ids(entered), exitedIds: ids(exited), artCompanyIds: ids(monthlyArts.map(row => row.companyId)),
      receiptCompanyIds: ids(monthlyPaid.map(row => row.companyId)), recoveredCompanyIds: ids(monthlyRecovered.map(row => row.companyId)), otherReceiptCompanyIds: ids(monthlyPaid.filter(row => !openingInvoices.some(opening => opening.id === row.id)).map(row => row.companyId)) };
  });
  const representative = new Map<string, Scope['establishments'][number]>();
  const establishmentsByCompany = new Map<string, Scope['establishments']>();
  for (const establishment of scope.establishments) establishmentsByCompany.set(establishment.companyId, [...(establishmentsByCompany.get(establishment.companyId) ?? []), establishment]);
  for (const company of scope.companies) {
    const establishments = (establishmentsByCompany.get(company.id) ?? []).sort((a, b) => a.id.localeCompare(b.id));
    const selected = establishments.find(row => row.branch === 'Matriz') ?? establishments[0]; if (selected) representative.set(company.id, selected);
  }
  const byEstablishments = (rows: Scope['establishments']) => ({ eligible: rows.length, matched: rows.filter(row => exactAt(row.cnpj, anchor)).length,
    companyIds: ids(rows.map(row => row.companyId)), matchedIds: ids(rows.filter(row => exactAt(row.cnpj, anchor)).map(row => row.companyId)),
    withoutMatchIds: ids(rows.filter(row => !exactAt(row.cnpj, anchor)).map(row => row.companyId)) });
  const cityGre = new Map(dataset.cities.map(row => [row.id, row.greId]));
  const firstEconomicCut = firstMonth ? dateDay(new Date(Date.UTC(Number(firstMonth.slice(0, 4)), Number(firstMonth.slice(5, 7)), 0)).toISOString().slice(0, 10)) : firstDay;
  const lastEconomicCut = lastMonth ? Math.min(lastDay, dateDay(new Date(Date.UTC(Number(lastMonth.slice(0, 4)), Number(lastMonth.slice(5, 7)), 0)).toISOString().slice(0, 10))) : lastDay;
  const regions: EnterpriseRegion[] = dataset.gres.map(gre => {
    const selected = eligible.filter(row => row.greId === gre.id), grouped = byEstablishments(selected);
    const active = activeIds.filter(id => representative.get(id)?.greId === gre.id);
    const companies = scope.companies.filter(row => representative.get(row.id)?.greId === gre.id).map(row => row.id);
    const facts = scope.employment.filter(row => cityGre.get(row.cityId) === gre.id);
    const initialJobs = facts.filter(row => row.month === firstMonth).reduce((sum, row) => sum + row.stock, 0);
    const finalJobs = facts.filter(row => row.month === lastMonth).reduce((sum, row) => sum + row.stock, 0);
    const initialCompanies = companies.filter(id => at(companyIntervals.get(id), firstEconomicCut)).length;
    const finalCompanies = companies.filter(id => at(companyIntervals.get(id), lastEconomicCut)).length;
    const withRtIds = active.filter(id => rtWithSet.has(id)), withoutRtIds = active.filter(id => !rtWithSet.has(id));
    return { id: gre.id, name: gre.name, ...grouped, companyIds: ids([...companies, ...grouped.companyIds]), base: active.length,
      coverage: rate(grouped.matched, grouped.eligible), withoutMatch: grouped.eligible - grouped.matched,
      notLocated: selected.filter(row => !knownAt(row.cnpj, anchor)).length,
      inactiveMatched: selected.filter(row => knownAt(row.cnpj, anchor) && !exactAt(row.cnpj, anchor)).length,
      missingCompanyIds: grouped.withoutMatchIds, rtCoverage: rate(withRtIds.length, active.length), withRtIds, withoutRtIds,
      jobGrowth: comparable ? change(initialJobs, finalJobs) : null, companyGrowth: comparable ? change(initialCompanies, finalCompanies) : null,
      jobStock: finalJobs, employmentBalance: facts.reduce((sum, row) => sum + row.admissions - row.dismissals, 0),
      contractValue: technicalContracts.filter(row => index.establishmentById.get(row.establishmentId)?.greId === gre.id).reduce((sum, row) => sum + cents(row.value), 0) / 100 };
  }).filter(row => row.companyIds.length || row.jobStock);
  const sectors: EnterpriseSector[] = ids(eligible.flatMap(row => [row.cnaeMain, ...row.cnaeSecondary])).filter(code => ['Relacionado', 'Depende de análise'].includes(cnaes.get(code)?.classification ?? '')).map(code => {
    const selected = eligible.filter(row => [row.cnaeMain, ...row.cnaeSecondary].includes(code)), grouped = byEstablishments(selected);
    const companies = new Set(grouped.companyIds);
    return { code, name: cnaes.get(code)?.label ?? code, ...grouped, coverage: rate(grouped.matched, grouped.eligible), withoutMatch: grouped.eligible - grouped.matched,
      artCompanies: artCompanies.filter(id => companies.has(id)).length,
      contractValue: technicalContracts.filter(row => companies.has(row.companyId)).reduce((sum, row) => sum + cents(row.value), 0) / 100 };
  }).sort((a, b) => b.withoutMatch - a.withoutMatch || a.code.localeCompare(b.code));
  const cityRows = dataset.cities.map(city => { const grouped = byEstablishments(eligible.filter(row => row.cityId === city.id)); return { id: city.id, name: city.name, ibgeCode: city.ibgeCode, ...grouped, coverage: rate(grouped.matched, grouped.eligible) }; }).filter(row => row.eligible);
  const gapGroups = [
    { name: 'Sem lacuna observada', companyIds: registeredPeriodIds.filter(id => daysByCompany.get(id)!.covered === daysByCompany.get(id)!.registered) },
    { name: 'Lacuna parcial', companyIds: registeredPeriodIds.filter(id => daysByCompany.get(id)!.covered > 0 && daysByCompany.get(id)!.covered < daysByCompany.get(id)!.registered) },
    { name: 'Sem RT identificado', companyIds: registeredPeriodIds.filter(id => daysByCompany.get(id)!.covered === 0) },
  ];
  const technicalPartition = [
    { name: 'RT vigente · ART observada', companyIds: activeIds.filter(id => rtWithSet.has(id) && artCompanySet.has(id)) },
    { name: 'RT vigente · sem ART observada', companyIds: activeIds.filter(id => rtWithSet.has(id) && !artCompanySet.has(id)) },
    { name: 'Sem RT identificado · ART observada', companyIds: activeIds.filter(id => !rtWithSet.has(id) && artCompanySet.has(id)) },
    { name: 'Sem RT identificado · sem ART observada', companyIds: activeIds.filter(id => !rtWithSet.has(id) && !artCompanySet.has(id)) },
  ].map(row => ({ ...row, count: row.companyIds.length }));
  const ranges = [{ name: 'Até 30 dias', min: 1, max: 30 }, { name: '31–90 dias', min: 31, max: 90 }, { name: '91–180 dias', min: 91, max: 180 }, { name: '181–365 dias', min: 181, max: 365 }, { name: 'Acima de 365 dias', min: 366, max: Infinity }];
  const debtBuckets = ranges.map(range => { const rows = overdueInvoices.filter(row => { const days = lastDay - dateDay(row.dueDate); return days >= range.min && days <= range.max; }); return { name: range.name, value: rows.reduce((sum, row) => sum + (balance(row, anchor, anchor) ?? 0), 0) / 100, companyIds: ids(rows.map(row => row.companyId)) }; });
  const contractCategories = ids(technicalContracts.map(row => row.category)).map(name => { const rows = technicalContracts.filter(row => row.category === name); return { name, value: rows.reduce((sum, row) => sum + cents(row.value), 0) / 100, companyIds: ids(rows.map(row => row.companyId)) }; });
  const cohortRows = [ { name: 'Observadas sem correspondência', count: cohort.length, companyIds: ids(cohort.map(row => row.companyId)) }, { name: 'Primeiro registro posterior', count: converted.length, companyIds: ids(converted.map(row => row.companyId)) }, { name: 'Sem primeiro registro posterior', count: cohort.length - converted.length, companyIds: ids(cohort.filter(row => !converted.some(current => current.id === row.id)).map(row => row.companyId)) } ];
  const countByCompany = <T extends { companyId: string }>(rows: T[]) => {
    const map = new Map<string, number>(); for (const row of rows) map.set(row.companyId, (map.get(row.companyId) ?? 0) + 1); return map;
  };
  const sumsByCompany = <T extends { companyId: string }>(rows: T[], value: (row: T) => number) => {
    const map = new Map<string, number>(); for (const row of rows) map.set(row.companyId, (map.get(row.companyId) ?? 0) + value(row)); return map;
  };
  const companyArtCount = countByCompany(artRows), companyEligible = countByCompany(eligible), companyActiveEligible = countByCompany(activeEligible);
  const companyReceiptCents = sumsByCompany(paid, row => cents(row.paidAmount));
  const companyOverdueCents = sumsByCompany(overdueInvoices, row => balance(row, anchor, anchor) ?? 0);
  const contractsByCompany = new Map<string, string[]>(), evidenceByCompany = new Map<string, string[]>();
  for (const row of technicalContracts) contractsByCompany.set(row.companyId, [...(contractsByCompany.get(row.companyId) ?? []), row.id]);
  for (const row of convergent) evidenceByCompany.set(row.companyId, [...(evidenceByCompany.get(row.companyId) ?? []), `CNPJ-${row.id}`]);
  const companyFacts = scope.companies.map(company => ({ companyId: company.id, active: activeSet.has(company.id), registeredInPeriod: registeredPeriodSet.has(company.id), withRt: rtWithSet.has(company.id),
    artCount: companyArtCount.get(company.id) ?? 0, registeredDays: daysByCompany.get(company.id)?.registered ?? 0, coveredDays: daysByCompany.get(company.id)?.covered ?? 0,
    receipts: (companyReceiptCents.get(company.id) ?? 0) / 100, overdue: (companyOverdueCents.get(company.id) ?? 0) / 100,
    eligibleEstablishments: companyEligible.get(company.id) ?? 0, exactActiveEstablishments: companyActiveEligible.get(company.id) ?? 0,
    evidenceIds: evidenceByCompany.get(company.id) ?? [], technicalContractIds: contractsByCompany.get(company.id) ?? [] }));
  const result: EnterpriseModel = { metrics, monthly, regions, sectors, cityRows, technicalPartition,
    rtRows: regions.filter(row => row.base).map(row => ({ name: row.name, withRt: row.withRtIds.length, withoutRt: row.withoutRtIds.length, companyIds: [...row.withRtIds, ...row.withoutRtIds], withRtIds: row.withRtIds, withoutRtIds: row.withoutRtIds })),
    debtBuckets, contractCategories, cohortRows, gapBuckets: gapGroups.map(row => ({ ...row, count: row.companyIds.length })),
    matchingRows: [{ name: 'Vigente na publicação', count: supplierActive.length, companyIds: ids(supplierActive.map(([, row]) => row.companyId)) }, { name: 'Sem vigência na publicação', count: supplierInactive.length, companyIds: ids(supplierInactive.map(([, row]) => row.companyId)) }],
    traceRows: [{ name: 'Ponte documental disponível', count: tracedContracts.length, companyIds: ids(tracedContracts.map(row => row.companyId)) }, { name: 'Ponte não informada', count: technicalContracts.length - tracedContracts.length, companyIds: ids(technicalContracts.filter(row => !tracedContracts.some(other => other.id === row.id)).map(row => row.companyId)) }],
    recoveryCohort: { openingBalance: openingBalance / 100, recovered: recoveredCents / 100, remaining: (openingBalance - recoveredCents) / 100,
      companyIds: ids(openingInvoices.map(row => row.companyId)), recoveredIds: ids(openingPaid.map(row => row.companyId)), remainingIds: ids(openingInvoices.filter(row => (balance(row, anchor, anchor) ?? 0) > 0).map(row => row.companyId)) }, companyFacts,
    contracts: technicalContracts.map(contract => ({ contract, technical: true, exactActiveAtPublication: exactAt(index.establishmentById.get(contract.establishmentId)?.cnpj ?? '', contract.date), artIds: ids(validBridge.filter(row => row.contractId === contract.id).map(row => row.artId)), classification: classifyDigitalObject(contract.object).label })),
    metadata: { start, end: anchor, openingCut, baseline: openingCut, synthetic: true, sourcesConnected: false,
      activeCompanyIds: activeIds, openingCompanyIds: openingIds, eligibleEstablishmentIds: eligible.map(row => row.id), activeEligibleEstablishmentIds: activeEligible.map(row => row.id), notLocatedEstablishmentIds: notLocated.map(row => row.id), inactiveMatchedEstablishmentIds: inactiveMatched.map(row => row.id),
      bridgeRows: validBridge.length, technicalContractCount: technicalContracts.length, corporateArtCount: artRows.length, cohortObservationCount: cohort.length,
      openingDebt: openingBalance / 100, recoveredOpeningDebt: recoveredCents / 100, registeredCompanyDays: totalDays, coveredCompanyDays: totalCoveredDays,
      matchedHistoricalCount: eligible.length - notLocated.length, employmentComparable: comparable, employmentFirstMonth: firstMonth, employmentLastMonth: lastMonth,
      notices: ['Todos os fatos são demonstrativos. SQL Server/Db2 e APIs/convênios ainda não estão conectados.', 'GRE e domicílio selecionam a localização cadastral da empresa/estabelecimento, não o local de execução da ART ou do contrato.', 'Setores com CNAEs secundários são não aditivos; uma empresa/estabelecimento pode aparecer em vários CNAEs.', 'RT é registrado no grão empresa na demonstração; homologar estabelecimento, atribuições e vigência na fonte institucional.', 'RFB usada na retenção é a situação disponível no corte atual. A fonte histórica RFB precisa de snapshots para medir sobrevivência econômica sem viés.', 'Pagamentos sem data são excluídos do fluxo e da coorte de recuperação histórica; preservados apenas no saldo conhecido do corte.', 'Classificação de objeto é regra textual demonstrativa, não modelo treinado, obrigação de registro ou infração.', 'CNPJ alfanumérico preservado com normalização em maiúsculas e verificação ASCII-48; validar a versão de homologação Receita na camada curada.'] } };
  if (!suppliedEvidence) cache.set(scope, result); return result;
}
