import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { autosPorRegionalMes, tipos } from '../painel/analise';
import { tipoLabel } from '../painel/fiscalizacao';
import type { StatusMulta } from '../painel/fiscalizacao';
import { Curvas, MapaBivariado, Mensal, Situacao, corTipo } from '../painel/VisaoFiscalizacao';
import { Segments, brl, int, mes, money, pct, short } from '../painel/ui';
import type { CockpitCtx } from './contexto';
import { caminhoAcoes } from './medidas';
import { Bloco, Indicador } from './ui';

/** Aba 3 · Fiscalização: os atos do rito (ação, notificação, auto, multa, julgamento, dívida ativa) e o resultado (regularização e registro). */
const change = (now: number, before: number) => before > 0 ? (now - before) / before * 100 : null;
const cruzamento = new Set(['Cruzamento Receita (CNAE)', 'Contrato público (PNCP)', 'Cadastro CREA']);

export default function PaginaFiscalizacao({ ctx }: { ctx: CockpitCtx }) {
  const { resumo, tokens, ponte, metas, period } = ctx, colors = corTipo(tokens);
  const status: Record<StatusMulta, string> = { Paga: tokens.good, 'Em prazo de defesa': tokens.heat[1], 'Em julgamento': tokens.warn, 'Dívida ativa': tokens.bad, Cancelada: tokens.line };
  const entradas = ponte.espontaneas.length + ponte.viaFiscalizacao.length + ponte.retornos.length;
  const viaCruzamento = resumo.acoes.filter(row => cruzamento.has(row.origem)).length;
  return <div className="ck-grid ck-grid-fiscalizacao">
    <section className="ck-cards is-six" style={{ gridArea: 'kpi' }} aria-label="Indicadores da fiscalização">
      <Indicador destaque label="Ações fiscalizatórias" value={int(resumo.acoes.length)} variacao={{ value: change(resumo.acoes.length, resumo.acoesPrev) }} spark={resumo.mensal.map(row => row.acoes)} cor={tokens.accent}
        sub={`${int(resumo.acoes.length / period)} por mês · ${pct(viaCruzamento / Math.max(1, resumo.acoes.length) * 100)} a partir de cruzamento de dados`} onOpen={() => ctx.open({ kind: 'acoes' })} />
      <Indicador label="Autos de infração lavrados" value={int(resumo.autos.length)} variacao={{ value: change(resumo.autos.length, resumo.autosPrev) }} spark={resumo.mensal.map(row => tipos.reduce((sum, tipo) => sum + row.autos[tipo], 0))} cor={tokens.bad}
        sub={<><Segments parts={tipos.map(tipo => ({ label: tipoLabel[tipo], value: resumo.autos.filter(row => row.tipo === tipo).length, color: colors[tipo] }))} />{pct(resumo.acoes.filter(row => row.auto).length / Math.max(1, resumo.acoes.length) * 100)} das ações geraram auto</>} onOpen={() => ctx.open({ kind: 'autos' })} />
      <Indicador label="Multas aplicadas" value={brl(resumo.aplicada)} variacao={{ value: change(resumo.aplicada, resumo.aplicadaPrev) }}
        sub={<><Segments parts={(Object.keys(resumo.multas) as StatusMulta[]).map(key => ({ label: key, value: resumo.multas[key].valor, color: status[key], format: brl }))} />{brl(resumo.multas['Dívida ativa'].valor)} em dívida ativa · {brl(resumo.multas['Em julgamento'].valor)} em julgamento</>} onOpen={() => ctx.open({ kind: 'multas' })} />
      <Indicador label="Multas recebidas" value={brl(resumo.recebida)} sub={`${resumo.pagaCoorte === null ? '—' : pct(resumo.pagaCoorte)} do valor aplicado no período já foi pago`} onOpen={() => ctx.open({ kind: 'multas', status: 'Paga' })} />
      <Indicador label="Regularizações após ação" value={int(resumo.regularizacoes.length)} variacao={{ value: change(resumo.regularizacoes.length, resumo.regularizacoesPrev) }} spark={resumo.mensal.map(row => row.regularizacoes)} cor={tokens.good} meta={{ atual: resumo.taxa, alvo: metas.regularizacao }}
        sub={`${resumo.taxa === null ? '—' : pct(resumo.taxa)} das ações do período · mediana de ${resumo.medianaDias === null ? '—' : int(resumo.medianaDias)} dias · associação, não causa`} onOpen={() => ctx.open({ kind: 'regularizacoes' })} />
      <Indicador label="Registros obtidos pela fiscalização" value={int(ponte.viaFiscalizacao.length)} sub={`${pct(ponte.viaFiscalizacao.length / Math.max(1, entradas) * 100)} das entradas na base no período`}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Registros obtidos pela fiscalização', what: 'Empresas que passaram a ter registro ativo no período depois de uma ação fiscalizatória por falta de registro.', ids: ponte.viaFiscalizacao })} />
    </section>
    <MapaBivariado ctx={ctx} area="map" />
    <Bloco ctx={ctx} id="ca" area="ca" title="Caminho das ações fiscalizatórias" question="O que aconteceu com as ações do período: regularização após a notificação, auto de infração e o destino da multa." help="Rito da Resolução Confea nº 1.008/2004: notificação, auto de infração, defesa e julgamento pela câmara especializada, multa paga ou inscrita em dívida ativa. A regularização pode ocorrer em qualquer etapa."><Caminho ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="me" area="me" title="Ações, autos e regularizações por mês" question="Barra clara: ações; dentro dela, autos por infração; linha: regularizações."><Mensal ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="cu" area="cu" title="Tempo até regularizar, por origem da ação" question="Qual fonte de informação leva mais empresas à regularização, e mais rápido."><Curvas ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="it" area="it" title="Indícios tratados, por tipo" question="Indícios conhecidos e o ponto do rito em que estão, até a regularização."><Situacao ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="cv" area="cv" title="Conversão da fiscalização em 180 dias" question="Ações iniciadas em cada trimestre e quantas terminaram em regularização (registro, RT, ART ou baixa) em até 180 dias." help="Indicador-norte 2. Coorte pela data da ação; barras claras são coortes que ainda não completaram 180 dias e não entram na comparação. Associação no tempo, não prova de que a ação causou a regularização."><Conversao ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ta" area="ta" title="Tempo até agir, por regional" question="Mediana de dias entre a entrada do indício na base e a primeira ação fiscal, para indícios que entraram no período." help="Indicador-norte 4. Mediana de Kaplan-Meier: indícios ainda sem ação entram como abertos (censurados), não como zero. Regional sem mediana: mais da metade dos indícios segue sem ação."><TempoAgir ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ht" area="ht" title="Autos de infração por regional e mês" question="Últimos 12 meses. Mostra a constância da atuação de cada regional. Clique numa célula para ver os autos."><AutosRegionais ctx={ctx} /></Bloco>
  </div>;
}

function Caminho({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, caminho = useMemo(() => caminhoAcoes(ctx.resumo), [ctx.resumo]), total = caminho.nodes[0]?.value || 1;
  const cores: Record<string, string> = { 'Ações fiscalizatórias': tokens.brand, 'Regularizada após notificação': tokens.good, 'Auto de infração lavrado': tokens.bad, 'Notificada, sem desfecho': tokens.heat[1], 'Multa paga': tokens.good, 'Em prazo de defesa': tokens.heat[1], 'Em julgamento': tokens.warn, 'Inscrita em dívida ativa': tokens.bad, 'Auto cancelado': tokens.muted };
  const option = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (item: any) => item.dataType === 'edge' ? `${item.data.source} → ${item.data.target}<br/><b>${int(item.data.value)}</b> ações (${pct(item.data.value / total * 100)})` : `<b>${item.name}</b><br/>${int(item.value)} ações · ${pct(item.value / total * 100)}<br/><span style="opacity:.75">clique para ver</span>` },
    series: [{ type: 'sankey', nodeAlign: 'left', left: 4, right: 150, top: 6, bottom: 6, nodeWidth: 12, nodeGap: 9, draggable: false, emphasis: { focus: 'adjacency' },
      data: caminho.nodes.map(node => ({ name: node.name, value: node.value, itemStyle: { color: cores[node.name] ?? tokens.blue, borderWidth: 0 } })), links: caminho.links.map(link => ({ source: link.source, target: link.target, value: link.value })),
      lineStyle: { color: 'gradient', opacity: 0.3, curveness: 0.5 },
      label: { color: tokens.ink, fontSize: 10.5, formatter: (item: any) => `{n|${item.name}}\n{v|${int(item.value)} · ${pct(item.value / total * 100)}}`, rich: { n: { fontWeight: 700, color: tokens.ink, fontSize: 10.5 }, v: { color: tokens.muted, fontSize: 10 } } } }],
  }), [caminho, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Caminho das ações fiscalizatórias do período" onPick={item => {
    const acoes = item.dataType === 'edge' ? caminho.links.find(link => link.source === item.data.source && link.target === item.data.target)?.acoes : caminho.nodes.find(node => node.name === item.name)?.acoes;
    if (!acoes?.length) return;
    const nomes = new Map(ctx.dataset.companies.map(row => [row.id, row.tradeName || row.name])), places = new Map(ctx.dataset.establishments.map(row => [row.id, row]));
    ctx.open({ kind: 'linhas', title: item.dataType === 'edge' ? `${item.data.source} → ${item.data.target}` : item.name, what: 'Ações fiscalizatórias do período neste ponto do processo, com o auto e a multa quando houver.', listTitle: 'Ações, maior multa primeiro',
      summary: [['Ações', int(acoes.length)], ['Multas', brl(acoes.reduce((sum, row) => sum + (row.auto?.valor ?? 0), 0))], ['Regularizadas', pct(acoes.filter(row => row.regularizedAt).length / acoes.length * 100)]],
      rows: acoes.map(acao => ({ key: acao.id, companyId: acao.companyId, title: nomes.get(acao.companyId) ?? acao.companyId, subtitle: `${places.get(acao.establishmentId)?.cnpj ?? ''} · ação em ${acao.date.split('-').reverse().join('/')}`,
        value: acao.auto ? money(acao.auto.valor) : acao.regularizedAt ? 'regularizada' : 'notificada', note: `${tipoLabel[acao.tipo]} · ${acao.origem}${acao.auto ? ` · ${acao.auto.status.toLowerCase()}` : ''}`, sortValue: acao.auto?.valor ?? 0 })) });
  }} />;
}

function AutosRegionais({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, heat = useMemo(() => autosPorRegionalMes(ctx.dataset, ctx.f), [ctx.dataset, ctx.f]);
  const maximo = Math.max(...heat.cells.map(cell => cell[2]), 1);
  const option = useMemo(() => ({
    grid: { top: 4, right: 8, bottom: 36, left: 4, containLabel: true },
    tooltip: { formatter: (item: any) => `<b>${heat.gres[item.value[1]].name}</b> · ${mes(heat.months[item.value[0]])}<br/>${int(item.value[2])} autos de infração` },
    xAxis: { type: 'category', data: heat.months.map(mes), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: { type: 'category', data: heat.gres.map(row => short(row.name)), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10, interval: 0 } },
    visualMap: { min: 0, max: maximo, orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 10, itemHeight: 160, calculable: false, textStyle: { color: tokens.muted, fontSize: 10 }, inRange: { color: tokens.heat } },
    series: [{ type: 'heatmap', data: heat.cells, label: { show: true, fontSize: 9.5, color: tokens.ink, formatter: (item: any) => item.value[2] || '' }, itemStyle: { borderColor: tokens.surface, borderWidth: 2, borderRadius: 3 }, emphasis: { itemStyle: { borderColor: tokens.accent, borderWidth: 2 } } }],
  }), [heat, tokens, maximo]);
  return <Chart option={option} tokens={tokens} label="Autos de infração por regional e mês" onPick={item => { const gre = heat.gres[item.value?.[1]], month = heat.months[item.value?.[0]]; if (!gre || !month) return;
    const acoes = ctx.f.acoes.filter(row => row.greId === gre.id && row.auto?.date.startsWith(month)); if (!acoes.length) return;
    const nomes = new Map(ctx.dataset.companies.map(row => [row.id, row.tradeName || row.name]));
    ctx.open({ kind: 'linhas', eyebrow: `${short(gre.name)} · ${mes(month)}`, title: 'Autos de infração do mês', what: 'Autos lavrados na regional no mês.', listTitle: 'Autos, maior multa primeiro',
      summary: [['Autos', int(acoes.length)], ['Multas', brl(acoes.reduce((sum, row) => sum + row.auto!.valor, 0))], ['Origens', [...new Set(acoes.map(row => row.origem))].length.toString()]],
      rows: acoes.map(acao => ({ key: acao.id, companyId: acao.companyId, title: nomes.get(acao.companyId) ?? acao.companyId, subtitle: `auto em ${acao.auto!.date.split('-').reverse().join('/')}`, value: money(acao.auto!.valor), note: `${tipoLabel[acao.tipo]} · ${acao.origem} · ${acao.auto!.status.toLowerCase()}`, sortValue: acao.auto!.valor })) });
  }} />;
}

function Conversao({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, c = ctx.norte.conversao, rows = c.coortes;
  const option = useMemo(() => ({
    grid: { top: 28, right: 8, bottom: 2, left: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex];
      return `<b>${row.trimestre.replace('-', ' ')}</b>${row.completa ? '' : ' · coorte em aberto'}<br/>${int(row.acoes.length)} ações · ${int(row.convertidas.length)} regularizadas em até 180 dias<br/>Conversão: <b>${row.taxa === null ? '—' : pct(row.taxa, 1)}</b>`; } },
    xAxis: { type: 'category', data: rows.map(row => row.trimestre.replace('-', ' ')), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: [{ type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } }, { type: 'value', max: 100, splitLine: { show: false }, axisLabel: { color: tokens.muted, formatter: '{value}%' } }],
    series: [
      { name: 'Ações iniciadas', type: 'bar', barWidth: '56%', itemStyle: { color: tokens.heat[1] }, data: rows.map(row => ({ value: row.acoes.length, itemStyle: { color: row.completa ? tokens.heat[1] : tokens.line, borderRadius: [3, 3, 0, 0] } })) },
      { name: 'Regularizadas em 180 dias', type: 'bar', barGap: '-100%', barWidth: '56%', itemStyle: { color: tokens.good }, data: rows.map(row => ({ value: row.convertidas.length, itemStyle: { color: row.completa ? tokens.good : tokens.muted, borderRadius: [3, 3, 0, 0] } })) },
      { name: 'Conversão', type: 'line', yAxisIndex: 1, data: rows.map(row => row.completa ? row.taxa : null), symbol: 'circle', symbolSize: 6, lineStyle: { color: tokens.ink, width: 2 }, itemStyle: { color: tokens.ink },
        label: { show: true, position: 'top', color: tokens.ink, fontSize: 10, formatter: (params: any) => params.value == null ? '' : pct(params.value) } },
    ],
  }), [rows, tokens]);
  return <div className="stack">
    <p className="kpi-line">{c.atual ? <><b>{pct(c.atual.taxa ?? 0, 1)}</b> na coorte completa mais recente ({c.atual.trimestre.replace('-', ' ')}){c.anterior && c.anterior !== c.atual && c.anterior.taxa !== null && <> · {pct(c.anterior.taxa, 1)} em {c.anterior.trimestre.replace('-', ' ')}</>}</> : 'Nenhuma coorte completou 180 dias'} · {int(rows.filter(row => !row.completa).length)} coortes em aberto</p>
    <Chart option={option} tokens={tokens} label="Conversão em 180 dias por coorte trimestral" onPick={params => { const row = rows[params.dataIndex]; if (!row?.acoes.length) return;
      const ids = params.seriesName === 'Regularizadas em 180 dias' ? row.convertidas : row.acoes;
      ctx.open({ kind: 'empresas', title: `Coorte ${row.trimestre.replace('-', ' ')} · ${String(params.seriesName).toLowerCase()}`, what: 'Empresas das ações fiscais iniciadas no trimestre.', use: 'Associação no tempo, não efeito causal.', ids: [...new Set(ids.map(acao => acao.companyId))] }); }} />
  </div>;
}

function TempoAgir({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, t = ctx.norte.tempo;
  const rows = useMemo(() => [...t.porGre].sort((a, b) => b.abertos / b.n - a.abertos / a.n), [t]);
  const option = useMemo(() => ({
    grid: { top: 24, right: 112, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.nome}</b><br/>Mediana até a primeira ação: ${row.mediana === null ? 'em aberto (mais da metade sem ação)' : `${int(row.mediana)} dias`}<br/>${int(row.agidos)} indícios com ação · ${int(row.abertos)} ainda sem ação`; } },
    xAxis: { type: 'value', max: 100, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: '{value}%' } },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => short(row.nome)), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10, interval: 0 } },
    series: [
      { name: 'Indícios já com ação', type: 'bar', stack: 't', barCategoryGap: '28%', data: rows.map(row => Math.round(row.agidos / row.n * 1000) / 10), itemStyle: { color: tokens.blue } },
      { name: 'Ainda sem ação', type: 'bar', stack: 't', data: rows.map(row => Math.round(row.abertos / row.n * 1000) / 10), itemStyle: { color: tokens.line, borderRadius: [0, 3, 3, 0] },
        label: { show: true, position: 'right', color: tokens.ink, fontSize: 9.5, formatter: (params: any) => { const row = rows[params.dataIndex]; return row.mediana === null ? 'mediana em aberto' : `mediana ${int(row.mediana)} d`; } } },
    ],
  }), [rows, tokens]);
  return <div className="stack">
    <p className="kpi-line"><b>{t.mediana === null ? 'mais da metade sem ação' : `${int(t.mediana)} dias`}</b> de mediana no estado · <b>{int(t.abertos)}</b> de {int(t.esperas.length)} indícios do período ainda sem ação · {t.porTipo.map(row => `${row.nome.toLowerCase()}: ${row.mediana === null ? 'em aberto' : `${int(row.mediana)} d`}`).join(' · ')}</p>
    <Chart option={option} tokens={tokens} label="Indícios com e sem ação e tempo mediano até a primeira ação, por regional" onPick={params => { const row = rows[params.dataIndex]; if (row) ctx.open({ kind: 'gre', id: row.id }); }} />
  </div>;
}
