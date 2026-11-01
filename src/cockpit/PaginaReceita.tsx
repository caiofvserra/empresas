import { useMemo } from 'react';
import { debtRows } from '../gestao-v14/metrics';
import { DecompositionTree, palette } from '../gestao-v14/widgets';
import { Chart } from '../painel/chart';
import { devedoras } from '../painel/analise';
import { brl, int, mes, money, pct } from '../painel/ui';
import type { CockpitCtx } from './contexto';
import { averageAnnualTicket } from '../gestao-v14/metrics';
import { Bloco, Indicador, carregando } from './ui';

/** Aba 7 · Receita, cobrança e orçamento: arrecadação ano contra ano, saldo vencido (idade, recuperação, decomposição) e execução orçamentária dos programas. A despesa publicada foi para o Controle interno. */
const change = (now: number, before: number | null | undefined) => before ? (now - before) / before * 100 : null;

export default function PaginaReceita({ ctx }: { ctx: CockpitCtx }) {
  const { model, history, rec, tokens, metas, period, estrutura } = ctx;
  const months = history.monthly, before = months.length > period ? months[months.length - 1 - period] : null, saldo = model.metrics.overdue.value ?? 0;
  const debtors = devedoras(model), cobradas = model.metrics.compliance.denominatorCompanyIds ?? [], adimplencia = cobradas.length ? 100 - debtors.size / cobradas.length * 100 : null;
  const gap = model.metadata.eligibleEstablishmentIds.length - model.metadata.activeEligibleEstablishmentIds.length, ticket = useMemo(() => averageAnnualTicket(ctx.scope), [ctx.scope]);
  const orc = estrutura?.orcamento;
  return <div className="ck-grid ck-grid-receita">
    <section className="ck-cards is-six" style={{ gridArea: 'kpi' }} aria-label="Indicadores de receita, cobrança e orçamento">
      <Indicador destaque ficha="k-arrecadacao" ctx={ctx} label="Arrecadação de empresas" value={brl(rec.total)} variacao={{ value: rec.totalAntes === null ? null : change(rec.total, rec.totalAntes) }} spark={rec.mensal.map(row => row.anuidades + row.multas)} cor={tokens.accent} sub={`${brl(rec.anuidades)} anuidades · ${brl(rec.multas)} multas`} />
      <Indicador ficha="k-saldo" ctx={ctx} label="Saldo vencido" value={brl(saldo)} variacao={{ value: change(saldo, before?.overdue), goodUp: false, label: `em ${period} meses` }} spark={months.map(row => row.overdue)} cor={tokens.bad} sub={`${int(debtors.size)} empresas devedoras`}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas com saldo vencido', what: 'Empresas cobradas com valor vencido e não pago no corte.', use: 'Cobre primeiro os maiores saldos e os mais recentes; confira se o CNPJ segue ativo.', ids: [...debtors] })} />
      <Indicador ficha="k-adimplencia" ctx={ctx} label="Adimplência" value={adimplencia === null ? '—' : pct(adimplencia)} meta={{ atual: adimplencia, alvo: metas.adimplencia }} variacao={{ value: adimplencia === null ? null : adimplencia - metas.adimplencia, kind: 'pp', label: `vs. meta de ${metas.adimplencia}%` }} sub={`${int(cobradas.length - debtors.size)} de ${int(cobradas.length)} empresas cobradas em dia`} />
      <Indicador ficha="k-recuperacao" ctx={ctx} label="Recuperação da dívida" value={model.metrics.recovery.value === null ? '—' : pct(model.metrics.recovery.value)} meta={{ atual: model.metrics.recovery.value, alvo: metas.recuperacao }} sub={`${brl(model.recoveryCohort.recovered)} recebidos de ${brl(model.recoveryCohort.openingBalance)} vencidos no início`} />
      <Indicador ficha="k-execucao" ctx={ctx} label="Execução orçamentária" value={orc?.execucao == null ? '…' : pct(orc.execucao)} sub={orc ? `${brl(orc.executado)} executados de ${brl(orc.planejado)} planejados` : 'calculando…'} />
      <Indicador ficha="k-potencial" ctx={ctx} label="Potencial anual de registro" value={ticket === null ? '—' : brl(gap * ticket)} sub={`${int(gap)} CNPJs sem registro × ${ticket === null ? '—' : money(ticket)} de anuidade mediana`} />
    </section>
    <Bloco ctx={ctx} id="yoy" area="yoy" title="Arrecadação de empresas, mês a mês" question="Anuidades e multas recebidas; a linha é o total do mesmo mês no ano anterior. Setas: variação de cada mês."><AnoContraAno ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="rg" area="rg" title="Recuperação e idade do saldo vencido" question="Quanto do saldo vencido no início do período já foi recebido, e há quanto tempo o saldo atual está vencido."><Recuperacao ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="tr" area="tr" title="Onde está o saldo vencido" question="Clique numa barra para abrir o próximo nível; troque a dimensão no cabeçalho de cada coluna; ⌖ lista as empresas." help="Árvore de decomposição: regional, porte, faixa de atraso, atividade (CNAE) e situação do RT."><Arvore ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="or" area="or" title="Orçamento dos programas" question="Planejado (barra clara) e executado (barra escura) no período, por programa.">{orc ? <Orcamento ctx={ctx} /> : carregando}</Bloco>
  </div>;
}

function AnoContraAno({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, rec } = ctx, rows = rec.mensal;
  const option = useMemo(() => ({
    grid: { top: 30, right: 8, bottom: 2, left: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', formatter: (items: any[]) => { const row = rows[items[0].dataIndex], now = row.anuidades + row.multas, before = row.anuidadesAntes === null ? null : row.anuidadesAntes + (row.multasAntes ?? 0);
      return `<b>${mes(row.month)}</b><br/>Anuidades: ${money(row.anuidades)}<br/>Multas: ${money(row.multas)}<br/>Total: <b>${money(now)}</b>${before ? `<br/>Mesmo mês do ano anterior: ${money(before)} (${now >= before ? '+' : ''}${pct((now / before - 1) * 100)})` : ''}`; } },
    xAxis: { type: 'category', data: rows.map(row => mes(row.month)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: (value: number) => value.toLocaleString('pt-BR', { notation: 'compact' }) } },
    series: [
      { name: 'Anuidades', type: 'bar', stack: 'r', barWidth: '56%', data: rows.map(row => row.anuidades), itemStyle: { color: tokens.blue } },
      { name: 'Multas', type: 'bar', stack: 'r', barWidth: '56%', data: rows.map(row => row.multas), itemStyle: { color: tokens.accent, borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top', fontSize: 9.5, formatter: (params: any) => { const row = rows[params.dataIndex], before = row.anuidadesAntes === null ? null : row.anuidadesAntes + (row.multasAntes ?? 0); if (!before) return ''; const delta = ((row.anuidades + row.multas) / before - 1) * 100; return `{${delta >= 0 ? 'g' : 'r'}|${delta >= 0 ? '▲' : '▼'}${Math.abs(delta).toFixed(0)}%}`; },
          rich: { g: { color: tokens.good, fontWeight: 700, fontSize: 9.5 }, r: { color: tokens.bad, fontWeight: 700, fontSize: 9.5 } } } },
      { name: 'Total do ano anterior', type: 'line', data: rows.map(row => row.anuidadesAntes === null ? null : row.anuidadesAntes + (row.multasAntes ?? 0)), smooth: 0.3, symbol: 'circle', symbolSize: 4, lineStyle: { color: tokens.ink, width: 1.5, type: [4, 4] }, itemStyle: { color: tokens.ink } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Arrecadação de empresas por mês contra o ano anterior" onPick={params => { const month = ctx.history.monthly.find(row => row.month === rows[params.dataIndex]?.month); if (month?.receiptCompanyIds.length) ctx.open({ kind: 'empresas', title: `Empresas que pagaram em ${mes(month.month)}`, what: 'Empresas com pagamento de anuidade no mês.', ids: month.receiptCompanyIds }); }} />;
}

function Recuperacao({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, model, metas } = ctx, valor = model.metrics.recovery.value ?? 0;
  const gauge = useMemo(() => ({
    series: [{ type: 'gauge', startAngle: 205, endAngle: -25, min: 0, max: 100, radius: '96%', center: ['50%', '62%'], progress: { show: true, width: 14, roundCap: true, itemStyle: { color: valor >= metas.recuperacao ? tokens.good : tokens.accent } },
      axisLine: { lineStyle: { width: 14, color: [[1, tokens.soft]] }, roundCap: true }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, pointer: { show: false }, anchor: { show: false },
      title: { show: true, offsetCenter: [0, '42%'], color: tokens.muted, fontSize: 10 },
      detail: { valueAnimation: true, offsetCenter: [0, '0%'], fontSize: 24, fontWeight: 800, fontFamily: 'Raleway, Lato, sans-serif', color: tokens.ink, formatter: (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` },
      data: [{ value: valor, name: `recuperado · meta ${metas.recuperacao}%` }] }],
  }), [valor, metas, tokens]);
  const aging = useMemo(() => ({
    grid: { top: 4, right: 64, bottom: 2, left: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>Vencido há ${String(items[0].name).toLowerCase()}</b><br/>${money(items[0].value)}` },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: model.debtBuckets.map(row => row.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: [{ type: 'bar', barWidth: 11, data: model.debtBuckets.map((row, index) => ({ value: row.value, itemStyle: { borderRadius: 5, color: [tokens.heat[1], tokens.blue, tokens.accent, tokens.warn, tokens.bad][index] ?? tokens.bad } })), label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (params: any) => brl(params.value) }, showBackground: true, backgroundStyle: { color: tokens.soft, borderRadius: 5 } }],
  }), [model, tokens]);
  return <div className="gauge-stack">
    <Chart option={gauge} tokens={tokens} label="Recuperação do saldo vencido no início do período" />
    <Chart option={aging} tokens={tokens} label="Saldo vencido por idade" onPick={params => { const row = model.debtBuckets[params.dataIndex]; if (row?.companyIds.length) ctx.open({ kind: 'empresas', title: `Saldo vencido há ${row.name.toLowerCase()}`, what: 'Empresas com saldo vencido nesta faixa de atraso.', ids: row.companyIds }); }} />
  </div>;
}

function Arvore({ ctx }: { ctx: CockpitCtx }) {
  const rows = useMemo(() => debtRows(ctx.model, ctx.scope), [ctx.model, ctx.scope]);
  const theme = { ...palette(ctx.dark), primary: ctx.tokens.brand, bad: ctx.tokens.bad, sky: ctx.tokens.heat[2] };
  return <DecompositionTree rows={rows} theme={theme} onSelect={(ids, label) => ctx.open({ kind: 'empresas', title: label, what: 'Empresas com saldo vencido neste ramo da decomposição.', ids })} />;
}

function Orcamento({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, orc = ctx.estrutura!.orcamento, rows = orc.programas;
  const option = useMemo(() => ({
    grid: { top: 26, right: 52, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.nome}</b><br/>Planejado: ${money(row.planejado)}<br/>Executado: ${money(row.executado)}<br/>Execução: <b>${row.execucao === null ? '—' : pct(row.execucao)}</b>`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: [
      { name: 'Planejado', type: 'bar', barWidth: 18, barGap: '-100%', data: rows.map(row => row.planejado), itemStyle: { color: tokens.soft, borderColor: tokens.heat[1], borderWidth: 1, borderRadius: 4 }, z: 1 },
      { name: 'Executado', type: 'bar', barWidth: 8, data: rows.map(row => row.executado), itemStyle: { color: tokens.brand, borderRadius: 3 }, z: 2, label: { show: true, position: 'right', distance: 26, color: tokens.ink, fontSize: 10.5, fontWeight: 700, formatter: (params: any) => rows[params.dataIndex].execucao === null ? '' : pct(rows[params.dataIndex].execucao!) } },
    ],
  }), [rows, tokens]);
  return <div className="stack">
    <p className="kpi-line"><b>{orc.execucao === null ? '—' : pct(orc.execucao)}</b> de execução · {brl(orc.executado)} de {brl(orc.planejado)} · {orc.executadoAntes ? `${orc.executado >= orc.executadoAntes ? '+' : ''}${pct((orc.executado / orc.executadoAntes - 1) * 100)} executado vs. ano anterior` : ''}</p>
    <Chart option={option} tokens={tokens} label="Orçamento planejado e executado por programa" />
  </div>;
}
