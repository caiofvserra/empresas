import { useMemo } from 'react';
import { ReportChartV9 as ReportChart } from './chart-design-v9';
import { buildInstitutionalServiceAnalysis, buildInstitutionalTerritory } from '../domain/institutional';
import type { InstitutionalScope, InstitutionalScopeOptions } from '../domain/institutional';
import { buildExecutiveEvolution } from './executive-analysis-v7';
import { buildExecutiveCompanyContinuity, buildExecutiveProfessionalEngagement, buildExecutiveArtProduction, buildExecutiveCorporateReceipts, buildExecutiveRegionalEconomy, executiveActiveCompanyIdsAt } from './executive-decisions-v8';
import { ReportPanel, combinedOption, compact, currency, distinct, num, percent } from './primitives';
import type { ReportProps } from './primitives';

export type InstitutionalSelection = Pick<InstitutionalScopeOptions, 'programIds' | 'activityIds' | 'serviceCategories'>;
export interface InstitutionalExecutiveReportProps extends ReportProps {
  institutionalScope?: InstitutionalScope;
  onInstitutionalSelection?: (selection: InstitutionalSelection) => void;
}

/** Budget, attendance and follow-up retain their original units and never imply causal effectiveness. */
export function institutionalTerritorialComparison(scope: InstitutionalScope) {
  const cityRows = buildInstitutionalTerritory(scope);
  const executed = cityRows.reduce((sum, row) => sum + row.executedCents, 0);
  const baseline = cityRows.reduce((sum, row) => sum + row.baselineProfessionals, 0);
  const allIdentified = distinct(scope.participation.filter(row => row.attended && row.professionalId).map(row => row.professionalId!));
  return scope.dataset.gres.map(gre => {
    const cities = cityRows.filter(row => row.greId === gre.id);
    const activityIds = new Set(cities.flatMap(row => row.activityIds));
    const professionalIds = distinct(scope.participation.filter(row => row.attended && row.professionalId && activityIds.has(row.activityId)).map(row => row.professionalId!));
    const budgetCents = cities.reduce((sum, row) => sum + row.executedCents, 0);
    const professionals = cities.reduce((sum, row) => sum + row.baselineProfessionals, 0);
    return { greId: gre.id, name: gre.name.replace(/^GRE\s*\d+\s*[-–·]?\s*/, ''), budgetCents, professionals, participants: professionalIds.length,
      budgetShare: executed ? budgetCents / executed : null, professionalShare: baseline ? professionals / baseline : null,
      participantShare: allIdentified.length ? professionalIds.length / allIdentified.length : null, professionalIds };
  }).filter(row => row.professionals || row.budgetCents || row.participants);
}

export const institutionalServiceCohorts = buildInstitutionalServiceAnalysis;

/** Each question has an explicit grain, denominator and investigation path. */
export default function InstitutionalExecutiveReport({ scope, comparison, financialAllowed, professionalIds,
  onDimension, onSubset, onProfessionals }: InstitutionalExecutiveReportProps) {
  const evolution = useMemo(() => buildExecutiveEvolution(scope), [scope]);
  const continuity = useMemo(() => buildExecutiveCompanyContinuity(scope), [scope]);
  const engagement = useMemo(() => buildExecutiveProfessionalEngagement(scope, professionalIds), [scope, professionalIds]);
  const production = useMemo(() => buildExecutiveArtProduction(scope, professionalIds), [scope, professionalIds]);
  const receipts = useMemo(() => buildExecutiveCorporateReceipts(scope), [scope]);
  const economy = useMemo(() => buildExecutiveRegionalEconomy(scope), [scope]);
  const shortGre = (name: string) => name.replace(/^GRE\s*\d+\s*[-–·]?\s*/, '');

  const evolutionOption = combinedOption(evolution.map(row => row.label), [
    { name: 'Entradas', type: 'bar', data: evolution.map(row => row.newRegistrations + row.reactivations), color: '#3662E2' },
    { name: 'Saídas', type: 'bar', data: evolution.map(row => -(row.closures + row.cancellations)), color: '#A4B5DA' },
    { name: 'Estoque ativo', type: 'line', axis: 1, data: evolution.map(row => row.base), color: '#15265C' },
    ...(comparison ? [{ name: 'Novos · anterior', type: 'line' as const, data: evolution.map(row => row.previousNew), color: '#6077B6', dashed: true }] : []),
  ], ['Eventos', 'Registros ativos']);
  evolutionOption.tooltip = { trigger: 'axis', confine: true, formatter: (params: any[]) => {
    const row = evolution[params[0]?.dataIndex];
    return row ? `${row.label}<br/>${num(row.newRegistrations)} novos + ${num(row.reactivations)} reativações<br/>${num(row.closures)} baixas + ${num(row.cancellations)} cancelamentos<br/>Saldo: ${num(row.net)} eventos · estoque: ${num(row.base)} registros ativos`
      + (comparison ? `<br/>${num(row.previousNew)} novos na janela anterior, na mesma coorte de registros` : '')
      + '<br/>Novos registros e vistos não equivalem a novas empresas. Estoque é reconstruído pelos movimentos.' : '';
  } };

  // Keep the complete denominator even when the compact canvas groups the smaller categories.
  const continuityRows = continuity.rows.slice(0, 5).map(row => ({ ...row, greIds: [row.id] }));
  if (continuity.rows.length > 5) {
    const other = continuity.rows.slice(5);
    continuityRows.push({ id: 'others', label: 'Demais GREs', greIds: other.map(row => row.id),
      companyIds: other.flatMap(row => row.companyIds), withRtIds: other.flatMap(row => row.withRtIds), withoutRtIds: other.flatMap(row => row.withoutRtIds) });
  }
  const continuityOption = horizontalStack(continuityRows.map(row => row.label), [
    { name: 'RT vigente', data: continuityRows.map(row => row.withRtIds.length), color: '#3662E2' },
    { name: 'Sem RT identificado', data: continuityRows.map(row => row.withoutRtIds.length), color: '#A4B5DA' },
  ], 'Empresas ativas');
  continuityOption.tooltip = { trigger: 'axis', confine: true, formatter: (params: any[]) => {
    const row = continuityRows[params[0]?.dataIndex];
    return row ? `${row.label}<br/>${num(row.companyIds.length)} empresas distintas com registro ativo<br/>${num(row.withRtIds.length)} com RT vigente · ${num(row.withoutRtIds.length)} sem RT vigente identificado<br/>${percent(row.withoutRtIds.length / row.companyIds.length * 100)} sem RT neste grupo<br/>Cada CNPJ raiz pertence a uma GRE pela matriz visível, ou primeira filial.<br/>Ausência de vínculo pode refletir cadastro ou situação específica; não comprova infração.` : '';
  } };

  const engagementRows = engagement.rows.slice(0, 5);
  if (engagement.rows.length > 5) {
    const other = engagement.rows.slice(5);
    engagementRows.push({ id: 'others', label: 'Demais modalidades', professionalIds: other.flatMap(row => row.professionalIds),
      withArtIds: other.flatMap(row => row.withArtIds), withoutArtIds: other.flatMap(row => row.withoutArtIds) });
  }
  const engagementOption = horizontalStack(engagementRows.map(row => row.label), [
    { name: 'Com autoria ART', data: engagementRows.map(row => row.withArtIds.length), color: '#3662E2' },
    { name: 'Sem autoria observada', data: engagementRows.map(row => row.withoutArtIds.length), color: '#D4DEEF' },
  ], 'Pessoas ativas');
  engagementOption.tooltip = { trigger: 'axis', confine: true, formatter: (params: any[]) => {
    const row = engagementRows[params[0]?.dataIndex];
    return row ? `${row.label}<br/>${num(row.professionalIds.length)} profissionais com cadastro ativo<br/>${num(row.withArtIds.length)} com autoria expressa de ART no período<br/>${num(row.withoutArtIds.length)} sem autoria identificada<br/>${percent(row.withArtIds.length / row.professionalIds.length * 100)} com autoria observada nesta coorte<br/>Sem autoria observada não significa desemprego, inatividade ou infração.<br/>Cobertura da fonte: ${num(engagement.identifiedArtCount)} / ${num(engagement.sourceArtCount)} ARTs com autor identificado; faltantes podem ocultar participação.<br/>O vínculo RT não presume autoria. Uma modalidade cadastral por pessoa nesta demonstração.` : '';
  } };

  const productionOption = combinedOption(production.rows.map(row => row.label), [
    { name: 'ARTs', type: 'bar', data: production.rows.map(row => row.arts), color: '#3662E2' },
    { name: 'Autores distintos', type: 'line', axis: 1, data: production.rows.map(row => row.authors), color: '#FFB001' },
    ...(comparison ? [{ name: 'ARTs · anterior', type: 'line' as const, data: production.rows.map(row => row.previousArts), color: '#6077B6', dashed: true }] : []),
  ], ['ARTs', 'Pessoas']);
  productionOption.tooltip = { trigger: 'axis', confine: true, formatter: (params: any[]) => {
    const row = production.rows[params[0]?.dataIndex];
    return row ? `${row.label}<br/>${num(row.arts)} ARTs · ${num(row.companyIds.length)} empresas relacionadas<br/>${num(row.authors)} autores distintos com identificação expressa<br/>${num(row.unattributedArts)} ARTs sem autor identificado na ponte demonstrativa`
      + (comparison ? `<br/>${num(row.previousArts)} ARTs no período anterior, com corte equivalente` : '')
      + `<br/>Autores distintos na janela inteira: ${num(production.authors)}; não somar os distintos mensais.<br/>Todas as ARTs disponíveis; a fonte demonstrativa não distingue inicial, complementar ou substituição.` : '';
  } };

  const receiptsOption = combinedOption(receipts.rows.map(row => row.label), [
    { name: 'Recebido · demais', type: 'bar', stack: 'receipts', data: receipts.rows.map(row => row.regularAmount), color: '#3662E2' },
    { name: 'Recuperado', type: 'bar', stack: 'receipts', data: receipts.rows.map(row => row.recoveredAmount), color: '#FFB001' },
    ...(comparison ? [{ name: 'Recebido · anterior', type: 'line' as const, data: receipts.rows.map(row => row.previousReceivedAmount), color: '#15265C', dashed: true }] : []),
  ], ['R$']);
  receiptsOption.tooltip = { trigger: 'axis', confine: true, formatter: (params: any[]) => {
    const row = receipts.rows[params[0]?.dataIndex];
    return row ? `${row.label}<br/>Recebido na data de pagamento: ${currency(row.receivedAmount)}<br/>Deste total, recuperado: ${currency(row.recoveredAmount)}<br/>${num(row.companyIds.length)} empresas pagantes · ${num(row.invoiceIds.length)} obrigações com pagamento`
      + (comparison ? `<br/>Anterior, com corte equivalente: ${currency(row.previousReceivedAmount)}` : '')
      + `<br/>Saldo vencido no fim do mês: ${currency(row.overdueAmount)} (estoque, não somar aos recebimentos)<br/>Somente obrigações empresariais desta fonte; não representa toda a arrecadação do CREA-SP.<br/>Valor informado em ART é valor de obra/serviço, não receita do conselho.` : '';
  } };

  const economyOption = { tooltip: { confine: true, formatter: (p: any) => {
    const row = economy.rows.find(item => item.id === p.data?.greId);
    return row ? `${row.label}<br/>${row.firstCutoff} → ${row.lastCutoff}<br/>Emprego formal: ${num(row.employmentFirst)} → ${num(row.employmentLast)} · ${percent(row.employmentChange!)}<br/>Empresas com registro ativo: ${num(row.companiesFirst)} → ${num(row.companiesLast)} · ${percent(row.companyChange!)}<br/>Cada empresa é alocada uma vez; vínculos de emprego são agregados por município/CNAE/CBO.<br/>Divergência indica contexto econômico para análise; não comprova causa, desemprego de engenheiros ou obrigação de registro.` : '';
  } }, grid: { top: 26, right: 16, bottom: 29, left: 5, containLabel: true },
    xAxis: { type: 'value', name: 'Emprego formal %', nameLocation: 'middle', nameGap: 22, nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 10 }, splitNumber: 3, splitLine: { lineStyle: { color: '#EEF1F7' } } },
    yAxis: { type: 'value', name: 'Empresas ativas %', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 10 }, splitNumber: 3, splitLine: { lineStyle: { color: '#EEF1F7' } } },
    series: [{ type: 'scatter', name: 'GRE', symbolSize: (values: number[]) => Math.max(10, Math.min(30, Math.sqrt(values[2]) / 18)),
      emphasis: { label: { show: true, position: 'top', fontSize: 10, formatter: '{b}' } }, itemStyle: { color: '#3662E2', opacity: .8 },
      data: economy.rows.filter(row => row.employmentChange !== null && row.companyChange !== null).map(row => ({ name: shortGre(row.label), greId: row.id, value: [row.employmentChange, row.companyChange, row.employmentLast] })),
      markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: '#A4B5DA', width: 1, type: 'dashed' }, data: [{ xAxis: 0 }, { yAxis: 0 }] } }] };

  return <div className="r5-grid r7-executive">
    <ReportPanel id="executive-evolution" wide step="01" title="A base cresce ou perde registros?" subtitle="Entradas, saídas e estoque reconciliados na mesma competência" source="Banco CREA demonstrativo · eventos e estoque de registros; novas empresas são outra unidade"><ReportChart option={evolutionOption} label="Gráfico combinado de entradas, saídas e estoque de registros ativos" onPick={p => {
      const row = evolution[p.dataIndex];
      if (!row) return;
      const monthEnd = new Date(Date.UTC(Number(row.date.slice(0, 4)), Number(row.date.slice(5, 7)), 0)).toISOString().slice(0, 10);
      if (p.seriesName === 'Estoque ativo') onSubset(executiveActiveCompanyIdsAt(scope, monthEnd > scope.anchor ? scope.anchor : monthEnd), `Estoque ativo · ${row.label}`, 'Empresas com ao menos um registro ativo no fim da competência selecionada; o gráfico conta registros.');
      else if (p.seriesName === 'Novos · anterior') {
        const previousDate = new Date(`${row.date}T00:00:00Z`); previousDate.setUTCMonth(previousDate.getUTCMonth() - scope.filters.period);
        const ids = new Set(scope.registrations.map(registration => registration.id));
        const previousMonth = previousDate.toISOString().slice(0, 7);
        onSubset(distinct(scope.dataset.movements.filter(event => ids.has(event.registrationId) && event.type === 'Novo registro' && event.date.startsWith(previousMonth)).map(event => event.companyId)), `Novos · ${previousMonth}`, 'Empresas dos novos registros no mês da comparação anterior; não representam o estoque inteiro daquela época.');
      } else {
        const inbound = p.seriesName === 'Entradas';
        const selected = scope.movements.filter(event => event.date.startsWith(row.date.slice(0, 7)) && (inbound ? event.type === 'Novo registro' || event.type === 'Reativação' : event.type === 'Baixa' || event.type === 'Cancelamento'));
        onSubset(distinct(selected.map(event => event.companyId)), `${inbound ? 'Entradas' : 'Saídas'} · ${row.label}`, 'Empresas dos eventos selecionados; eventos, registros e CNPJs raiz são contagens diferentes.');
      }
    }} /></ReportPanel>
    <ReportPanel id="executive-continuity" step="02" title="A base ativa mantém vínculo técnico?" subtitle="CNPJs raiz ativos · uma GRE por empresa" source="Banco CREA demonstrativo · RT vigente no corte / empresas com registro ativo; ausência não comprova infração"><ReportChart option={continuityOption} label="Barras empilhadas de empresas com registro ativo com e sem RT vigente por GRE" onPick={p => {
      const row = continuityRows[p.dataIndex]; if (!row) return;
      const hasRt = p.seriesName === 'RT vigente';
      onSubset(hasRt ? row.withRtIds : row.withoutRtIds, `${hasRt ? 'Com RT' : 'Sem RT identificado'} · ${row.label}`, 'Somente empresas com ao menos um registro ativo. RT avaliado na data de corte; ausência exige validação cadastral e técnica.');
    }} /></ReportPanel>
    <ReportPanel id="executive-engagement" step="02" title="Quem tem autoria técnica observada?" subtitle={`Ativos · autoria identificada em ${engagement.authorCoverageRate === null ? 'nenhuma ART disponível' : percent(engagement.authorCoverageRate) + ' das ARTs da fonte'}`} source="Banco CREA demonstrativo · ativos por domicílio e modalidade; ausência de autoria não significa desemprego"><ReportChart option={engagementOption} label="Barras empilhadas de profissionais ativos com e sem autoria expressa de ART no período por modalidade" onPick={p => {
      const row = engagementRows[p.dataIndex]; if (!row) return;
      const hasArt = p.seriesName === 'Com autoria ART';
      onProfessionals(hasArt ? row.withArtIds : row.withoutArtIds, `${hasArt ? 'Com autoria ART' : 'Sem autoria observada'} · ${row.label} · cadastro ativo`);
    }} /></ReportPanel>
    <ReportPanel id="executive-production" wide step="03" title="A produção cresce com mais profissionais?" subtitle="ARTs e autores distintos por mês · escalas próprias" source="Banco CREA demonstrativo · autoria pela ponte explícita; distintos anuais não são soma dos mensais"><ReportChart option={productionOption} label="Gráfico combinado mensal de ARTs e profissionais autores distintos" onPick={p => {
      const row = production.rows[p.dataIndex]; if (!row) return;
      if (p.seriesName === 'Autores distintos') onProfessionals(row.authorIds, `Autores de ART · ${row.label}`);
      else {
        const previous = p.seriesName === 'ARTs · anterior';
        onSubset(previous ? row.previousCompanyIds : row.companyIds, `ARTs · ${previous ? row.previousMonth : row.label}`, 'CNPJs relacionados às ARTs selecionadas; autores são identificados exclusivamente por ponte explícita.');
      }
    }} /></ReportPanel>
    <ReportPanel id="executive-receipts" step="04" title="Quanto entra e quanto é recuperado?" subtitle="Obrigações PJ · pagamento no mês · recuperação é parte do total" source="Banco financeiro demonstrativo · recebimentos empresariais; não é a arrecadação total do CREA-SP">
      {financialAllowed ? <ReportChart option={receiptsOption} label="Colunas mensais de recebimentos empresariais e sua parcela recuperada" onPick={p => {
        const row = receipts.rows[p.dataIndex]; if (!row) return;
        const previous = p.seriesName === 'Recebido · anterior';
        const recovered = p.seriesName === 'Recuperado';
        const ids = previous ? row.previousCompanyIds : recovered ? row.recoveredCompanyIds : row.regularCompanyIds;
        onSubset(ids, `${previous ? 'Recebimentos anteriores' : recovered ? 'Recuperação' : 'Demais recebimentos'} · ${previous ? row.previousMonth : row.label}`, 'Empresas com pagamentos efetivos no período; recuperação é um subconjunto dos recebimentos. Saldo vencido é estoque separado.');
      }} /> : <div className="r6-empty">Os recebimentos empresariais são restritos ao perfil Administração.</div>}
    </ReportPanel>
    <ReportPanel id="executive-economy" step="05" title="Onde economia e base ativa divergem?" subtitle="GRE · mesma janela · bolha = estoque de empregos" source="Emprego agregado + banco CREA demonstrativos · empresas alocadas uma vez; comparação territorial não causal">
      {!economy.comparable ? <div className="r6-empty">Remova a seleção de empresas, porte e situação cadastral para comparar os universos territoriais completos. Esses filtros não existem na fonte agregada de emprego.</div>
        : economy.rows.some(row => row.employmentChange !== null && row.companyChange !== null) ? <ReportChart option={economyOption} label="Dispersão do crescimento do emprego formal e das empresas com registro ativo por GRE na mesma janela" onPick={p => { if (p.data?.greId) onDimension('greIds', [p.data.greId]); }} />
          : <div className="r6-empty">Sem duas competências e bases iniciais positivas para comparar este território.</div>}
    </ReportPanel>
  </div>;
}

function horizontalStack(labels: string[], series: { name: string; data: number[]; color: string }[], unit: string): Record<string, unknown> {
  return { tooltip: { trigger: 'axis', confine: true }, legend: { bottom: 0, type: 'scroll', itemWidth: 9, itemHeight: 6, textStyle: { fontSize: 9, color: '#566786' } },
    grid: { top: 14, right: 12, bottom: 28, left: 0, containLabel: true },
    xAxis: { type: 'value', name: unit, nameTextStyle: { fontSize: 9 }, nameGap: 4, axisLabel: { fontSize: 9, formatter: (value: number) => compact(value) }, splitNumber: 3, splitLine: { lineStyle: { color: '#EEF1F7' } } },
    yAxis: { type: 'category', inverse: true, data: labels, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { fontSize: 10, width: 70, overflow: 'truncate' } },
    series: series.map(row => ({ type: 'bar', name: row.name, data: row.data, stack: 'cohort', barMaxWidth: 17, itemStyle: { color: row.color }, emphasis: { focus: 'series' } })) };
}
