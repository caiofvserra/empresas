import { useMemo } from 'react';
import { ReportChartV9 as ReportChart } from './chart-design-v9';
import { CircleHelp } from 'lucide-react';
import type { Scope } from '../domain/engine';
import { inWindow, isActiveLink, makeSeries, outstanding, previousWindow, summarize } from '../domain/engine';
import type { CompanySize, Invoice } from '../domain/types';
import { combinedOption, compact, currency, distinct, horizontalOption, num, percent, ReportPanel } from './primitives';
import type { ReportProps } from './primitives';

const SIZES: CompanySize[] = ['Microempresa', 'Pequena empresa', 'Média empresa', 'Grande empresa'];
export const companyAgeBands = ['Até 30 dias', '31–90 dias', '91–180 dias', '181–365 dias', 'Mais de 365 dias'];
const total = <T,>(rows: T[], value: (row: T) => number) => rows.reduce((sum, row) => sum + value(row), 0);
const countCompanies = <T extends { companyId: string },>(rows: T[]) => distinct(rows.map(row => row.companyId)).length;
const elapsed = (first: string, last: string) => Math.max(0, Math.floor((Date.parse(`${last}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / 86_400_000));
const ids = <T extends { companyId: string },>(rows: T[]) => distinct(rows.map(row => row.companyId));
const shortGre = (name: string) => name.replace(/^GRE\s*\d+\s*[·–—-]?\s*/i, '').replace(/^Gerência Regional\s*/i, '');
const monthCutoff = (month: string, anchor: string) => {
  const end = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);
  return end < anchor ? end : anchor;
};

export function companyAgeBand(invoice: Invoice, anchor: string): string {
  const age = elapsed(invoice.dueDate, anchor);
  return age <= 30 ? companyAgeBands[0] : age <= 90 ? companyAgeBands[1] : age <= 180 ? companyAgeBands[2] : age <= 365 ? companyAgeBands[3] : companyAgeBands[4];
}

/** One visible establishment per legal entity; branch counts never multiply company facts. */
export function companyRepresentativeEstablishments(scope: Scope) {
  const map = new Map<string, Scope['establishments'][number]>();
  for (const row of [...scope.establishments].sort((a, b) => a.id.localeCompare(b.id))) {
    const current = map.get(row.companyId);
    if (!current || row.branch === 'Matriz' && current.branch !== 'Matriz') map.set(row.companyId, row);
  }
  return map;
}

/** The plotted monthly registration stock has its own matching company cohort. */
export function companyActiveRegistrationCohort(scope: Scope, cutoff: string) {
  const registrationIds = new Set(scope.registrations.map(row => row.id));
  const last = new Map<string, Scope['movements'][number]>();
  for (const event of scope.dataset.movements) {
    if (!registrationIds.has(event.registrationId) || event.date > cutoff) continue;
    const current = last.get(event.registrationId);
    if (!current || event.date > current.date || event.date === current.date && event.id > current.id) last.set(event.registrationId, event);
  }
  const active = scope.registrations.filter(row => {
    const event = last.get(row.id);
    return event ? event.type === 'Novo registro' || event.type === 'Reativação' : false;
  });
  return { registrationCount: active.length, companyIds: ids(active) };
}

/** Common CNPJ-root cohort for cadastro, acervo and finance; no synthetic joins. */
export function buildCompaniesAnalysis(scope: Scope, financialAllowed = true) {
  const series = makeSeries(scope);
  const previous = makeSeries(scope, scope.filters.period * 2).slice(0, scope.filters.period);
  const registered = new Set(scope.registrations.map(row => row.companyId));
  const active = new Set(scope.registrations.filter(row => row.status === 'Ativo').map(row => row.companyId));
  const representatives = companyRepresentativeEstablishments(scope);
  const eligibleInvoices = financialAllowed ? scope.invoices.filter(row => registered.has(row.companyId) && row.dueDate <= scope.anchor) : [];
  const overdueInvoices = eligibleInvoices.filter(row => row.dueDate < scope.anchor && outstanding(row, scope.anchor) > 0);
  const recovered = financialAllowed ? scope.invoices.filter(row => registered.has(row.companyId) && row.recovered && inWindow(row.paymentDate, scope.filters.period, scope.anchor)) : [];
  const previousArts = scope.dataset.arts.filter(row => scope.companyIds.has(row.companyId) && previousWindow(row.date, scope.filters.period, scope.anchor));
  const issuedCaos = scope.caos.filter(row => inWindow(row.issuedAt, scope.filters.period, scope.anchor));
  const activeLinks = scope.technicalLinks.filter(row => isActiveLink(row, scope.anchor));
  const byGre = scope.dataset.gres.map(gre => {
    const companyIds = [...registered].filter(id => representatives.get(id)?.greId === gre.id);
    const members = new Set(companyIds);
    const invoices = eligibleInvoices.filter(row => members.has(row.companyId));
    const late = overdueInvoices.filter(row => members.has(row.companyId));
    const financeCompanies = countCompanies(invoices);
    const delinquentCompanies = countCompanies(late);
    return { id: gre.id, label: shortGre(gre.name), companyIds, companies: companyIds.length,
      active: companyIds.filter(id => active.has(id)).length, inactive: companyIds.filter(id => !active.has(id)).length,
      financeCompanies, delinquentCompanies, overdue: total(late, row => outstanding(row, scope.anchor)),
      delinquency: financeCompanies ? delinquentCompanies / financeCompanies * 100 : 0 };
  }).filter(row => row.companies).sort((a, b) => b.companies - a.companies);
  const bySize = SIZES.map(size => {
    const members = scope.companies.filter(row => row.size === size && registered.has(row.id)).map(row => row.id);
    return { size, companyIds: members, active: members.filter(id => active.has(id)).length, inactive: members.filter(id => !active.has(id)).length };
  });
  const ageBands = companyAgeBands.map(label => {
    const invoices = overdueInvoices.filter(row => companyAgeBand(row, scope.anchor) === label);
    return { label, amount: total(invoices, row => outstanding(row, scope.anchor)), companies: countCompanies(invoices), companyIds: ids(invoices) };
  });
  const qualityTypes = [...new Set(scope.qualityEvents.filter(row => !row.resolved).map(row => row.type))];
  const quality = qualityTypes.map(type => {
    const events = scope.qualityEvents.filter(row => !row.resolved && row.type === type);
    return { type, events: events.length, companies: countCompanies(events), establishments: new Set(events.map(row => row.establishmentId)).size,
      companyIds: ids(events), sources: distinct(events.map(row => row.source)) };
  }).sort((a, b) => b.events - a.events);
  const production = series.map((point, index) => {
    const month = point.date.slice(0, 7);
    const arts = scope.arts.filter(row => row.date.startsWith(month));
    const caos = issuedCaos.filter(row => row.issuedAt?.startsWith(month));
    const previousMonth = previous[index]?.date.slice(0, 7);
    return { month, label: point.label, arts: arts.length, caos: caos.length, artCompanies: countCompanies(arts), caoCompanies: countCompanies(caos),
      previousArts: previousArts.filter(row => row.date.startsWith(previousMonth ?? 'invalid')).length,
      artCompanyIds: ids(arts), caoCompanyIds: ids(caos), bothCompanyIds: ids([...arts, ...caos]) };
  });
  const rfb = ['Ativa', 'Baixada', 'Suspensa', 'Inapta'].map(status => {
    const members = [...registered].filter(id => representatives.get(id)?.rfbStatus === status);
    return { label: status, companies: members.length, companyIds: members };
  });
  const linksByCompany = new Map<string, number>();
  for (const link of activeLinks) linksByCompany.set(link.companyId, (linksByCompany.get(link.companyId) ?? 0) + 1);
  const byRt = ['Sem vínculo vigente', 'Um vínculo vigente', 'Múltiplos vínculos'].map((label, index) => {
    const members = [...registered].filter(id => {
      const count = linksByCompany.get(id) ?? 0;
      return index === 0 ? count === 0 : index === 1 ? count === 1 : count > 1;
    });
    return { label, companies: members.length, companyIds: members };
  });
  return { series, previous, registered, active, representatives, byGre, bySize, production, quality, ageBands, rfb, byRt,
    financeCompanies: countCompanies(eligibleInvoices), overdueCompanies: countCompanies(overdueInvoices),
    recoveredAmount: total(recovered, row => row.paidAmount), recoveredCompanies: countCompanies(recovered),
    overdueAmount: total(overdueInvoices, row => outstanding(row, scope.anchor)), issuedCaos,
    qualityCompanies: countCompanies(scope.qualityEvents.filter(row => !row.resolved)),
    sources: distinct(scope.qualityEvents.filter(row => !row.resolved).map(row => row.source)) };
}

function definitionAction(id: string, title: string, onInfo: ReportProps['onInfo']) {
  return <button className="p-iconbutton r5-info" aria-label={`Definição: ${title}`} title={`Definição: ${title}`} onClick={() => onInfo(id)}><CircleHelp size={15} /></button>;
}

const pairedHorizontal = (labels: string[], first: number[], second: number[], firstName: string, secondName: string, financial = false): Record<string, unknown> => ({
  tooltip: { trigger: 'axis', confine: true, axisPointer: { type: 'shadow' }, formatter: (params: any[]) => `${params[0]?.name ?? ''}<br/>${params.map(row => `${row.marker ?? ''}${row.seriesName}: ${financial && row.seriesIndex === 0 ? currency(Number(row.value)) : num(Number(row.value))}`).join('<br/>')}` },
  legend: { bottom: 0, type: 'scroll', itemWidth: 10, itemHeight: 6, textStyle: { fontSize: 10, color: '#566786' } },
  grid: { top: 20, bottom: 30, left: 0, right: 12, containLabel: true },
  xAxis: [
    { type: 'value', name: financial ? 'R$' : 'Ocorrências', splitNumber: 3, nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 10, formatter: (value: number) => compact(value) }, splitLine: { lineStyle: { color: '#EEF1F7' } } },
    { type: 'value', name: 'Empresas', position: 'top', splitNumber: 3, nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 10, formatter: (value: number) => compact(value) }, splitLine: { show: false } },
  ],
  yAxis: { type: 'category', inverse: true, data: labels, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { fontSize: 10, width: 94, overflow: 'truncate' } },
  series: [
    { type: 'bar', name: firstName, data: first, barMaxWidth: 13, itemStyle: { color: '#6077B6', borderRadius: [0, 3, 3, 0] } },
    { type: 'line', name: secondName, xAxisIndex: 1, data: second, symbolSize: 5, itemStyle: { color: '#15265C' }, lineStyle: { width: 2.5 } },
  ],
});

export default function CompaniesReport({ scope, comparison, financialAllowed, onDimension, onSubset, onInfo }: ReportProps) {
  const analysis = useMemo(() => buildCompaniesAnalysis(scope, financialAllowed), [scope, financialAllowed]);
  const metrics = useMemo(() => summarize(scope), [scope]);
  const series = analysis.series;
  const cadastreOption = combinedOption(series.map(row => row.label), [
    { name: 'Novos + reativações', type: 'bar', data: series.map(row => row.newRegistrations + row.reactivations), color: '#3662E2' },
    { name: 'Baixas + cancelamentos', type: 'bar', data: series.map(row => -(row.closures + row.cancellations)), color: '#A4B5DA' },
    { name: 'Registros ativos', type: 'line', axis: 1, data: series.map(row => row.base), color: '#15265C' },
    ...(comparison ? [{ name: 'Ativos · janela anterior', type: 'line' as const, axis: 1, data: analysis.previous.map(row => row.base), color: '#6077B6', dashed: true }] : []),
  ], ['Movimentos', 'Estoque']);
  const profileOption: Record<string, unknown> = {
    ...horizontalOption(analysis.bySize.map(row => row.size.replace(' empresa', '')), [], 'Empresas'),
    legend: { bottom: 0, itemWidth: 10, itemHeight: 6, textStyle: { fontSize: 10 } },
    grid: { top: 8, bottom: 28, left: 0, right: 10, containLabel: true },
    series: [
      { type: 'bar', name: 'Ativas no CREA', stack: 'porte', data: analysis.bySize.map(row => row.active), barMaxWidth: 21, itemStyle: { color: '#3662E2' } },
      { type: 'bar', name: 'Inativas no CREA', stack: 'porte', data: analysis.bySize.map(row => row.inactive), barMaxWidth: 21, itemStyle: { color: '#A4B5DA', borderRadius: [0, 3, 3, 0] } },
    ],
  };
  const greRows = analysis.byGre.slice(0, 7);
  const greOption = combinedOption(greRows.map(row => row.label), financialAllowed ? [
    { name: 'Empresas registradas', type: 'bar', data: greRows.map(row => row.companies), color: '#A4B5DA' },
    { name: 'Empresas inadimplentes', type: 'bar', data: greRows.map(row => row.delinquentCompanies), color: '#3662E2' },
    { name: 'Saldo vencido (R$)', type: 'line', axis: 1, data: greRows.map(row => row.overdue), color: '#15265C' },
  ] : [
    { name: 'Empresas registradas', type: 'bar', data: greRows.map(row => row.companies), color: '#A4B5DA' },
    { name: 'Empresas ativas', type: 'line', data: greRows.map(row => row.active), color: '#3662E2' },
  ], financialAllowed ? ['Empresas', 'R$'] : ['Empresas']);
  const productionOption = combinedOption(analysis.production.map(row => row.label), [
    { name: 'ARTs registradas', type: 'bar', data: analysis.production.map(row => row.arts), color: '#3662E2' },
    { name: 'CAOs emitidas', type: 'line', axis: 1, data: analysis.production.map(row => row.caos), color: '#FFB001' },
    ...(comparison ? [{ name: 'ARTs · janela anterior', type: 'line' as const, data: analysis.production.map(row => row.previousArts), color: '#15265C', dashed: true }] : []),
  ], ['ARTs', 'CAOs']);
  const qualityLabels: Record<string, string> = { 'CNPJ inválido': 'CNPJ inválido', 'CNPJ duplicado na origem': 'Duplicado na origem', 'Sem CNAE': 'Sem CNAE', 'Município divergente': 'Município divergente', 'GRE não identificada': 'GRE não identificada', 'CREA ativo / CNPJ baixado': 'Ativo / CNPJ baixado', 'CNAE alterado': 'CNAE alterado', 'Dados desatualizados': 'Desatualizados' };
  const qualityOption = pairedHorizontal(analysis.quality.map(row => qualityLabels[row.type] ?? row.type), analysis.quality.map(row => row.events), analysis.quality.map(row => row.companies), 'Eventos pendentes', 'Empresas distintas');
  const ageOption = pairedHorizontal(analysis.ageBands.map(row => row.label), analysis.ageBands.map(row => row.amount), analysis.ageBands.map(row => row.companies), 'Saldo vencido (R$)', 'Empresas distintas', true);
  const timeSource = `Cadastro interno demonstrativo · saldo = entradas − saídas. Linha: registros ativos, não empresas. ${num(analysis.registered.size)} empresas / ${num(scope.registrations.length)} registros no recorte.`;
  const profileSource = 'Cadastro CREA-SP · uma empresa é ativa se possuir pelo menos um registro ativo no recorte; categorias de porte e situação reconciliam o total.';
  const financeSource = financialAllowed ? `Financeiro interno demonstrativo · ${num(analysis.overdueCompanies)} inadimplentes / ${num(analysis.financeCompanies)} empresas com obrigação com vencimento até a competência. Empresa atribuída uma vez à matriz visível; filiais não multiplicam valores.` : 'Cadastro CREA-SP · empresas distintas atribuídas uma vez à matriz visível. Informações financeiras restritas ao perfil autorizado.';
  return <div className="r5-grid">
    <ReportPanel id="companies-cadastre" step="01" title="Como a base empresarial evolui?" subtitle={`${num(metrics.net)} de saldo no período · ${num(metrics.activeRegistrations)} registros ativos na competência`} source={timeSource} wide action={definitionAction('net', 'Evolução cadastral', onInfo)}>
      <ReportChart option={cadastreOption} label="Novos registros, reativações, baixas e cancelamentos comparados ao estoque mensal de registros ativos" onPick={params => {
        const point = series[params.dataIndex]; if (!point) return;
        if (params.seriesName === 'Registros ativos' || params.seriesName === 'Ativos · janela anterior') {
          const stockPoint = params.seriesName === 'Ativos · janela anterior' ? analysis.previous[params.dataIndex] : point;
          if (!stockPoint) return;
          const cohort = companyActiveRegistrationCohort(scope, monthCutoff(stockPoint.date.slice(0, 7), scope.anchor));
          onSubset(cohort.companyIds, `Estoque ativo · ${stockPoint.label}`, `${num(cohort.registrationCount)} registros ativos no fechamento do mês. Os demais gráficos analisam suas empresas distintas, sem transformar quantidade de registros em quantidade de empresas.`);
          return;
        }
        const month = point.date.slice(0, 7);
        const rows = params.seriesName === 'Novos + reativações' ? scope.movements.filter(row => row.date.startsWith(month) && ['Novo registro', 'Reativação'].includes(row.type)) : params.seriesName === 'Baixas + cancelamentos' ? scope.movements.filter(row => row.date.startsWith(month) && ['Baixa', 'Cancelamento'].includes(row.type)) : scope.movements.filter(row => row.date.startsWith(month));
        onSubset(ids(rows), `Movimentação · ${point.label}`, 'O mês seleciona empresas com os movimentos indicados; todos os demais gráficos usam essas mesmas empresas. O estoque é contado em registros.');
      }} />
    </ReportPanel>
    <ReportPanel id="companies-profile" step="02" title="Qual perfil sustenta essa base?" subtitle={`${num(metrics.activeCompanies)} ativas · ${num(metrics.inactiveCompanies)} inativas no CREA`} source={profileSource} action={definitionAction('registeredCompanies', 'Perfil de empresas', onInfo)}>
      <ReportChart option={profileOption} label="Empresas de cada porte com situação ativa e inativa no CREA" onPick={params => {
        const row = analysis.bySize[params.dataIndex]; if (!row) return;
        const members = row.companyIds.filter(id => params.seriesName === 'Ativas no CREA' ? analysis.active.has(id) : !analysis.active.has(id));
        onSubset(members, `${row.size} · ${params.seriesName}`, 'Empresas distintas com esse porte e situação cadastral; uma empresa com qualquer registro ativo pertence à categoria ativa.');
      }} />
    </ReportPanel>
    <ReportPanel id="companies-territory" step="03" title={financialAllowed ? 'Cadastro e débitos por GRE' : 'Onde a base está concentrada?'} subtitle="Sete GREs com maior base · clique para cruzar o território" source={financeSource} action={definitionAction(financialAllowed ? 'delinquentCompanies' : 'activeCompanies', 'Comparação regional', onInfo)}>
      <ReportChart option={greOption} label={financialAllowed ? 'Empresas registradas, inadimplentes e saldo vencido por GRE com unidade de empresa e escala monetária separadas' : 'Empresas registradas e ativas por GRE'} onPick={params => {
        const row = greRows[params.dataIndex]; if (row) onDimension('greIds', [row.id]);
      }} />
    </ReportPanel>
    <ReportPanel id="companies-production" step="04" title="A base se traduz em atividade e acervo?" subtitle={`${num(metrics.arts)} ARTs · ${num(metrics.caoIssued)} CAOs emitidas · ${num(metrics.caoCompanies)} empresas com CAO`} source="ART + CAO + cadastro · relação pelo ID da empresa. ARTs no mês do registro; CAOs no mês da emissão. CAO é acervo operacional da pessoa jurídica; CAT é acervo do profissional." wide action={definitionAction('caoIssued', 'ART e acervo operacional', onInfo)}>
      <ReportChart option={productionOption} label="ARTs registradas e CAOs emitidas por mês com séries combinadas e escalas distintas" onPick={params => {
        const row = analysis.production[params.dataIndex]; if (!row) return;
        const selected = params.seriesName === 'CAOs emitidas' ? row.caoCompanyIds : params.seriesName === 'ARTs registradas' ? row.artCompanyIds : params.seriesName === 'ARTs · janela anterior' ? ids(scope.dataset.arts.filter(art => scope.companyIds.has(art.companyId) && art.date.startsWith(analysis.previous[params.dataIndex]?.date.slice(0, 7) ?? 'invalid'))) : row.bothCompanyIds;
        onSubset(selected, `${params.seriesName ?? 'Produção'} · ${row.label}`, 'Empresas das ARTs ou CAOs da série selecionada; volume de ARTs e volume de CAOs são unidades diferentes, relacionadas pela mesma empresa.');
      }} />
    </ReportPanel>
    <ReportPanel id="companies-finance" step="05" title={financialAllowed ? 'O valor vencido está envelhecendo?' : 'Como as empresas se conectam à RT?'} subtitle={financialAllowed ? `${currency(analysis.overdueAmount)} vencidos · ${currency(analysis.recoveredAmount)} recuperados no período` : `${num(metrics.withRt)} empresas com vínculo vigente · ${num(metrics.activeLinks)} vínculos`} source={financialAllowed ? `Financeiro interno · saldo residual por faixa na competência, com ${num(analysis.recoveredCompanies)} empresas com recuperação no período. Empresas podem aparecer em mais de uma faixa; não somar as contagens distintas. Recuperação é fluxo; dívida é estoque.` : 'Vínculos de responsabilidade técnica · uma empresa por categoria; quantidade de vínculos difere de profissionais distintos. Ausência de vínculo identificado não comprova irregularidade.'} action={definitionAction(financialAllowed ? 'overdueAmount' : 'activeLinks', financialAllowed ? 'Envelhecimento financeiro' : 'Vínculos de responsabilidade técnica', onInfo)}>
      <ReportChart option={financialAllowed ? ageOption : horizontalOption(analysis.byRt.map(row => row.label), analysis.byRt.map(row => row.companies), 'Empresas')} label={financialAllowed ? 'Saldo vencido e empresas distintas por faixa de atraso com duas escalas' : 'Empresas com zero, um ou múltiplos vínculos vigentes de responsabilidade técnica'} onPick={params => {
        const row = financialAllowed ? analysis.ageBands[params.dataIndex] : analysis.byRt[params.dataIndex];
        if (row) onSubset(row.companyIds, row.label, financialAllowed ? 'Empresas com saldo residual vencido nesta faixa de atraso; os demais gráficos passam a analisar o mesmo conjunto.' : 'Empresas no grupo de vínculos vigentes selecionado, respeitando início e encerramento na competência.');
      }} />
    </ReportPanel>
    <ReportPanel id="companies-quality" step="06" title="Até onde os dados são confiáveis?" subtitle={`${num(analysis.qualityCompanies)} empresas com divergências · ${percent(metrics.qualityScore)} dos estabelecimentos sem evento pendente`} source={`Qualidade cadastral · ${analysis.sources.join(' + ') || 'cadastro CREA-SP e origem CNPJ'}. Ocorrências pendentes; uma empresa pode possuir diversos eventos. CNPJs inválidos e duplicados estão na origem, sem duplicar o cadastro mestre.`} action={definitionAction('qualityScore', 'Qualidade entre fontes', onInfo)}>
      <ReportChart option={qualityOption} label="Eventos pendentes de qualidade cadastral e quantidade de empresas distintas em cada tipo de divergência" onPick={params => {
        const row = analysis.quality[params.dataIndex]; if (row) onSubset(row.companyIds, `Qualidade · ${row.type}`, `Empresas com evento pendente de ${row.type}; fontes: ${row.sources.join(', ')}. A divergência é uma questão de qualidade dos dados, sem conclusão automática de infração.`);
      }} />
    </ReportPanel>
  </div>;
}
