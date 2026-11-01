import { useMemo } from 'react';
import { qualityQueue } from '../gestao-v14/metrics';
import { Chart } from '../painel/chart';
import { int, mes, money, pct } from '../painel/ui';
import type { CockpitCtx } from './contexto';
import { situacaoPedido, situacoesPedido } from './estrutura';
import type { Estrutura, SituacaoPedido } from './estrutura';
import { Bloco, Indicador, carregando, linhasEmpresas } from './ui';

/** Aba 10 · Atendimento e estrutura: prazos do atendimento, uso dos coworkings e qualidade do cadastro. A capacitação (custo e alcance) foi para o Controle interno. */
const change = (now: number, before: number) => before > 0 ? (now - before) / before * 100 : null;

export default function PaginaAtendimento({ ctx }: { ctx: CockpitCtx }) {
  const { estrutura, metas, tokens } = ctx, quality = useMemo(() => qualityQueue(ctx.scope), [ctx.scope]);
  const pendencias = quality.reduce((sum, row) => sum + row.open, 0);
  if (!estrutura) return <div className="ck-grid ck-grid-atendimento"><div className="ck-wait">{carregando}</div></div>;
  const { atendimento, coworking } = estrutura;
  return <div className="ck-grid ck-grid-atendimento">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores de atendimento e estrutura">
      <Indicador destaque ficha="k-prazo" ctx={ctx} label="Solicitações resolvidas no prazo" value={atendimento.taxaNoPrazo === null ? '—' : pct(atendimento.taxaNoPrazo)} meta={{ atual: atendimento.taxaNoPrazo, alvo: metas.atendimento }}
        variacao={{ value: atendimento.taxaNoPrazo === null || atendimento.taxaNoPrazoAntes === null ? null : atendimento.taxaNoPrazo - atendimento.taxaNoPrazoAntes, kind: 'pp' }} sub={`em até 14 dias · meta ${metas.atendimento}%`} />
      <Indicador ficha="k-solicitacoes" ctx={ctx} label="Solicitações de atendimento" value={int(atendimento.pedidos.length)} variacao={{ value: change(atendimento.pedidos.length, atendimento.totalAntes) }} sub={`${pct(atendimento.empresas / Math.max(1, atendimento.pedidos.length) * 100)} vindas de empresas`} />
      <Indicador ficha="k-tempo" ctx={ctx} label="Tempo de resolução" value={atendimento.medianaDias === null ? '—' : `${int(atendimento.medianaDias)} dias`} sub={`mediana · ${int(atendimento.partes['Em aberto, prazo vencido'].length)} em aberto com prazo vencido`} />
      <Indicador ficha="k-coworking" ctx={ctx} label="Ocupação dos coworkings" value={coworking.ocupacao === null ? '—' : pct(coworking.ocupacao)} variacao={{ value: coworking.ocupacao === null || coworking.ocupacaoAntes === null ? null : coworking.ocupacao - coworking.ocupacaoAntes, kind: 'pp' }}
        sub={coworking.unidades.length ? `${int(coworking.unidades.length)} unidades · ${int(coworking.usuarios)} usuários · ${coworking.usadas ? money(coworking.custo / coworking.usadas) : '—'} por hora usada` : 'sem unidade nesta regional'} />
      <Indicador ficha="k-pendencias" ctx={ctx} label="Pendências cadastrais abertas" value={int(pendencias)} sub={quality[0] ? `maior: ${quality[0].type}` : 'sem pendências'} onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas com pendência cadastral aberta', what: 'Empresas com ao menos uma pendência de qualidade cadastral não resolvida.', ids: [...new Set(quality.flatMap(row => row.companyIds))] })} />
    </section>
    <Bloco ctx={ctx} id="as" area="as" title="Solicitações por assunto e situação" question="Resolvidas no prazo de 14 dias, resolvidas com atraso, abertas com prazo vencido e abertas no prazo." help="Prazo de referência de 14 dias, ilustrativo. Território = local do atendimento; o filtro de câmara não se aplica."><Assuntos ctx={ctx} estrutura={estrutura} /></Bloco>
    <Bloco ctx={ctx} id="cw" area="cw" title="Ocupação dos coworkings por unidade e mês" question="Horas de mesa usadas ÷ horas disponíveis, nos últimos 12 meses. Ao lado, usuários e custo por hora usada no período."><Coworkings ctx={ctx} estrutura={estrutura} /></Bloco>
    <Bloco ctx={ctx} id="mm" area="mm" title="Solicitações por mês" question="Quantidade e % resolvidas no prazo, mês a mês no período."><Mensal ctx={ctx} estrutura={estrutura} /></Bloco>
    <Bloco ctx={ctx} id="qa" area="qa" title="Qualidade do cadastro" question="Pendências abertas e resolvidas por tipo. A base sustenta todos os indicadores do painel."><Qualidade ctx={ctx} quality={quality} /></Bloco>
  </div>;
}

function Assuntos({ ctx, estrutura }: { ctx: CockpitCtx; estrutura: Estrutura }) {
  const { tokens } = ctx, rows = estrutura.atendimento.porAssunto;
  const cores: Record<SituacaoPedido, string> = { 'Resolvido no prazo': tokens.good, 'Resolvido com atraso': tokens.accent, 'Em aberto, prazo vencido': tokens.bad, 'Em aberto, no prazo': tokens.heat[1] };
  const option = useMemo(() => ({
    grid: { top: 26, right: 38, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.assunto}</b><br/>${items.map(item => `${item.marker}${item.seriesName}: ${int(item.value)}`).join('<br/>')}<br/>${int(row.empresas)} de ${int(row.total)} vindas de empresas`; } },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => row.assunto), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: situacoesPedido.map((situacao, index) => ({ name: situacao, type: 'bar', stack: 'a', barWidth: 16, data: rows.map(row => row.partes[situacao].length), itemStyle: { color: cores[situacao], borderColor: tokens.surface, borderWidth: 1, borderRadius: index === situacoesPedido.length - 1 ? [0, 3, 3, 0] : 0 },
      label: index === situacoesPedido.length - 1 ? { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (params: any) => int(rows[params.dataIndex].total) } : undefined })),
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Solicitações de atendimento por assunto e situação" onPick={params => { const row = rows[params.dataIndex], situacao = situacoesPedido[params.seriesIndex]; if (!row || !situacao) return;
    const pedidos = row.partes[situacao], empresas = pedidos.filter(item => item.companyId);
    ctx.open({ kind: 'linhas', title: `${row.assunto} · ${situacao.toLowerCase()}`, what: 'Solicitações de atendimento do período neste assunto e situação. As de profissionais aparecem sem ficha de empresa.', listTitle: 'Solicitações, mais antigas primeiro',
      summary: [['Solicitações', int(pedidos.length)], ['De empresas', int(empresas.length)], ['De profissionais', int(pedidos.length - empresas.length)]],
      rows: pedidos.map(item => ({ key: item.id, companyId: item.companyId, title: item.companyId ? (ctx.dataset.companies.find(company => company.id === item.companyId)?.tradeName ?? item.companyId) : 'Profissional (demonstrativo)', subtitle: `${ctx.dataset.cities.find(city => city.id === item.cityId)?.name ?? ''} · aberta em ${item.createdAt.split('-').reverse().join('/')}`,
        value: item.resolvedAt && item.resolvedAt <= ctx.f.anchor ? `resolvida em ${Math.round((Date.parse(item.resolvedAt) - Date.parse(item.createdAt)) / 86400000)} dias` : 'em aberto', note: `${item.userType} · ${situacaoPedido(item, ctx.f.anchor)}`, sortValue: -Date.parse(item.createdAt) })) }); }} />;
}

function Coworkings({ ctx, estrutura }: { ctx: CockpitCtx; estrutura: Estrutura }) {
  const { tokens } = ctx, cw = estrutura.coworking;
  const option = useMemo(() => ({
    grid: { top: 4, right: 8, bottom: 34, left: 4, containLabel: true },
    tooltip: { formatter: (item: any) => `<b>${cw.unidades[item.value[1]].nome}</b> · ${mes(cw.meses[item.value[0]])}<br/>Ocupação: ${item.value[2] === null ? '—' : pct(item.value[2])}` },
    xAxis: { type: 'category', data: cw.meses.map(mes), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: { type: 'category', data: cw.unidades.map(row => row.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5, width: 120, overflow: 'truncate' } },
    visualMap: { min: 0, max: 100, orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 10, itemHeight: 160, calculable: false, text: ['100%', '0%'], textStyle: { color: tokens.muted, fontSize: 10 }, inRange: { color: tokens.heat } },
    series: [{ type: 'heatmap', data: cw.celulas, label: { show: true, fontSize: 9.5, color: tokens.ink, formatter: (item: any) => item.value[2] === null ? '' : Math.round(item.value[2]) }, itemStyle: { borderColor: tokens.surface, borderWidth: 2, borderRadius: 3 } }],
  }), [cw, tokens]);
  if (!cw.unidades.length) return <div className="empty-note">Nenhuma unidade de coworking nesta regional (dados demonstrativos).</div>;
  return <div className="split is-wide">
    <Chart option={option} tokens={tokens} label="Ocupação dos coworkings por unidade e mês" />
    <ul className="side-list">{cw.unidades.map(row => <li key={row.id}><span className="side-row"><span>{row.nome}</span><b>{row.ocupacao === null ? '—' : pct(row.ocupacao)}</b><small>{int(row.usuarios)} usuários · {row.custoHora === null ? '—' : money(row.custoHora)}/h · {row.mesas} mesas</small></span></li>)}</ul>
  </div>;
}

function Mensal({ ctx, estrutura }: { ctx: CockpitCtx; estrutura: Estrutura }) {
  const { tokens } = ctx, pedidos = estrutura.atendimento.pedidos;
  const rows = useMemo(() => ctx.janela.months.filter(month => `${month}-01` >= `${ctx.janela.start.slice(0, 7)}-01`).map(month => { const own = pedidos.filter(item => item.createdAt.startsWith(month)), situacoes = own.map(item => situacaoPedido(item, ctx.f.anchor));
    const decididos = situacoes.filter(item => item !== 'Em aberto, no prazo').length; return { month, total: own.length, taxa: decididos ? situacoes.filter(item => item === 'Resolvido no prazo').length / decididos * 100 : null }; }), [pedidos, ctx.janela, ctx.f.anchor]);
  const option = useMemo(() => ({
    grid: { top: 26, right: 6, bottom: 2, left: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${mes(row.month)}</b><br/>${int(row.total)} solicitações<br/>No prazo: ${row.taxa === null ? '—' : pct(row.taxa)}`; } },
    xAxis: { type: 'category', data: rows.map(row => mes(row.month)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: [{ type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } }, { type: 'value', min: 0, max: 100, splitLine: { show: false }, axisLabel: { color: tokens.muted, formatter: '{value}%' } }],
    series: [
      { name: 'Solicitações', type: 'bar', barWidth: '56%', data: rows.map(row => row.total), itemStyle: { color: tokens.heat[1], borderRadius: [4, 4, 0, 0] } },
      { name: '% no prazo', type: 'line', yAxisIndex: 1, data: rows.map(row => row.taxa), smooth: 0.3, symbol: 'circle', symbolSize: 5, lineStyle: { color: tokens.good, width: 2.5 }, itemStyle: { color: tokens.good },
        markLine: { silent: true, symbol: 'none', lineStyle: { color: tokens.accent, type: 'dashed' }, label: { formatter: `meta ${ctx.metas.atendimento}%`, color: tokens.muted, fontSize: 10, position: 'insideEndTop' }, data: [{ yAxis: ctx.metas.atendimento }] } },
    ],
  }), [rows, tokens, ctx.metas.atendimento]);
  return <Chart option={option} tokens={tokens} label="Solicitações por mês e percentual resolvido no prazo" />;
}

function Qualidade({ ctx, quality }: { ctx: CockpitCtx; quality: ReturnType<typeof qualityQueue> }) {
  const { tokens } = ctx;
  const option = useMemo(() => ({
    grid: { top: 24, right: 8, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: quality.map(row => row.type), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5, width: 150, overflow: 'truncate' } },
    series: [
      { name: 'Abertas', type: 'bar', stack: 'q', barWidth: 12, data: quality.map(row => row.open), itemStyle: { color: tokens.bad }, label: { show: true, position: 'insideLeft', color: '#FFFFFF', fontSize: 9.5, formatter: (item: any) => item.value || '' } },
      { name: 'Resolvidas', type: 'bar', stack: 'q', barWidth: 12, data: quality.map(row => row.resolved), itemStyle: { color: tokens.line, borderRadius: [0, 4, 4, 0] } },
    ],
  }), [quality, tokens]);
  return <Chart option={option} tokens={tokens} label="Pendências de qualidade do cadastro por tipo" onPick={params => { const row = quality[params.dataIndex]; if (row?.companyIds.length) ctx.open({ kind: 'linhas', title: `Pendência · ${row.type.toLowerCase()}`, what: 'Empresas com esta pendência de qualidade cadastral em aberto.', use: 'Corrija na origem: a pendência afeta cobrança, fiscalização e indicadores.', listTitle: 'Empresas',
    rows: linhasEmpresas(ctx, row.companyIds, () => ({ value: 'em aberto', note: row.type, sort: 0 })) }); }} />;
}
