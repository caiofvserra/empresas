import { useMemo } from 'react';
import { ExternalLink, Radio } from 'lucide-react';
import type { CockpitContext } from './context';
import { artActivity, caoService, caseStages, inspectionFlow, priorityMatrix, qualityQueue, receiptsYoY } from './metrics';
import type { PriorityPoint } from './metrics';
import { DecompositionTree, EChart, FreshnessBadge, Sparkline, Tile, esc, fmt } from './widgets';

/* =============================== Carteira e arrecadação =============================== */
export function PortfolioPage({ ctx }: { ctx: CockpitContext }) {
  if (!ctx.financialAllowed) return <div className="ck-restricted"><strong>Página financeira restrita</strong><p>O perfil atual não acessa saldos, recebimentos e dívida PJ. Selecione o perfil Administração para ver esta página.</p></div>;
  return <PortfolioContent ctx={ctx} />;
}
function PortfolioContent({ ctx }: { ctx: CockpitContext }) {
  const { theme, model, history, scope, targets } = ctx;
  const recovery = model.metrics.recovery.value;
  const gauge = useMemo(() => ({
    series: [{ type: 'gauge', startAngle: 205, endAngle: -25, min: 0, max: 100, radius: '100%', center: ['50%', '62%'], progress: { show: true, width: 16, roundCap: true, itemStyle: { color: recovery !== null && recovery >= targets.recovery ? theme.good : theme.gold } },
      axisLine: { lineStyle: { width: 16, color: [[1, theme.dark ? '#1B2F55' : '#EDF2F7']] }, roundCap: true }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, pointer: { show: false },
      anchor: { show: false }, title: { show: true, offsetCenter: [0, '46%'], color: theme.muted, fontSize: 10 },
      detail: { valueAnimation: true, offsetCenter: [0, '-2%'], fontSize: 28, fontWeight: 800, fontFamily: 'Raleway, Lato, sans-serif', color: theme.ink, formatter: (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` },
      data: [{ value: recovery ?? 0, name: `recuperado · meta ${targets.recovery}%` }],
      markLine: undefined }],
    graphic: [{ type: 'text', left: 'center', bottom: 2, style: { text: `${fmt.brl(model.recoveryCohort.recovered)} de ${fmt.brl(model.recoveryCohort.openingBalance)} da dívida de abertura`, fill: theme.muted, fontSize: 10 } }],
  }), [recovery, targets, theme, model]);
  const aging = useMemo(() => ({
    grid: { top: 4, right: 52, bottom: 4, left: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>${esc(items[0].name)}</b><br/>${fmt.money(items[0].value)}` },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: model.debtBuckets.map(row => row.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: theme.ink, fontSize: 11 } },
    series: [{ type: 'bar', barWidth: 12, data: model.debtBuckets.map((row, index) => ({ value: row.value, itemStyle: { borderRadius: 6, color: [theme.sky, theme.blue, theme.gold, '#E0AB0C', theme.bad][index] ?? theme.bad } })), label: { show: true, position: 'right', color: theme.ink, fontSize: 10, formatter: (item: any) => fmt.brl(item.value) }, showBackground: true, backgroundStyle: { color: theme.dark ? 'rgba(255,255,255,.04)' : '#F1F5F9', borderRadius: 6 } }],
  }), [model, theme]);
  const yoy = useMemo(() => receiptsYoY(history), [history]);
  const yoyOption = useMemo(() => ({
    grid: { top: 30, right: 10, bottom: 24, left: 6, containLabel: true },
    legend: { top: 0, right: 0, itemWidth: 12, itemHeight: 8, textStyle: { color: theme.muted } },
    tooltip: { trigger: 'axis', formatter: (items: any[]) => { const row = yoy[items[0].dataIndex]; const delta = row.previous ? (row.current - row.previous) / row.previous * 100 : null; return `<b>${fmt.month(row.month)}</b><br/>Recebido: ${fmt.money(row.current)}<br/>Mesmo mês, ano anterior: ${row.previous === null ? '—' : fmt.money(row.previous)}${delta === null ? '' : `<br/>Variação: <b>${delta >= 0 ? '+' : ''}${fmt.pct(delta)}</b>`}<br/>Recuperação incluída: ${fmt.money(row.recovered)}`; } },
    xAxis: { type: 'category', data: yoy.map(row => fmt.month(row.month)), axisTick: { show: false }, axisLine: { lineStyle: { color: theme.grid } }, axisLabel: { color: theme.muted } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: theme.grid, type: 'dashed' } }, axisLabel: { color: theme.muted, formatter: (value: number) => fmt.compact(value) } },
    series: [
      { name: 'Últimos 12 meses', type: 'bar', barWidth: '52%', data: yoy.map(row => ({ value: row.current, itemStyle: { borderRadius: [5, 5, 0, 0], color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#FFD148' }, { offset: 1, color: theme.gold }] } } })),
        label: { show: true, position: 'top', fontSize: 9, formatter: (item: any) => { const row = yoy[item.dataIndex]; if (!row.previous) return ''; const delta = (row.current - row.previous) / row.previous * 100; return `{${delta >= 0 ? 'g' : 'r'}|${delta >= 0 ? '▲' : '▼'}${Math.abs(delta).toFixed(0)}%}`; }, rich: { g: { color: theme.good, fontWeight: 700, fontSize: 9 }, r: { color: theme.bad, fontWeight: 700, fontSize: 9 } } } },
      { name: '12 meses anteriores', type: 'line', data: yoy.map(row => row.previous), smooth: 0.3, symbol: 'circle', symbolSize: 5, lineStyle: { color: theme.primary, width: 2, type: [5, 4] }, itemStyle: { color: theme.primary } },
    ],
  }), [yoy, theme]);
  const matrix = useMemo(() => priorityMatrix(model, scope), [model, scope]);
  const quadrantColor: Record<PriorityPoint['quadrant'], string> = { 'Agir já': theme.bad, Cobrar: theme.gold, 'Orientar RT': theme.blue, Acompanhar: theme.dark ? '#3B4F75' : '#CBD5E0' };
  const matrixOption = useMemo(() => {
    const points = matrix.points.filter(point => point.overdue > 0);
    return {
      grid: { top: 30, right: 16, bottom: 34, left: 6, containLabel: true },
      tooltip: { formatter: (item: any) => `<b>${esc(item.data.name)}</b><br/>Saldo vencido: ${fmt.money(item.value[0])}<br/>Dias sem RT identificado: ${fmt.pct(item.value[1], 0)}<br/>ARTs no período: ${item.data.arts}<br/><span style="opacity:.7">${item.data.quadrant} · clique abre a ficha</span>` },
      xAxis: { type: 'log', logBase: 10, min: 10 ** Math.floor(Math.log10(Math.max(10, points.length ? Math.min(...points.map(point => point.overdue)) : 10))), name: 'Saldo vencido (R$, escala log)', nameLocation: 'middle', nameGap: 22, nameTextStyle: { color: theme.muted }, splitLine: { lineStyle: { color: theme.grid, type: 'dashed' } }, axisLabel: { color: theme.muted, formatter: (value: number) => fmt.compact(value) } },
      yAxis: { type: 'value', min: 0, max: 100, name: '% dias sem RT', nameTextStyle: { color: theme.muted, align: 'left' }, splitLine: { lineStyle: { color: theme.grid, type: 'dashed' } }, axisLabel: { color: theme.muted, formatter: '{value}%' } },
      series: [{ type: 'scatter', symbolSize: (value: number[]) => 5 + Math.min(10, Math.sqrt(value[2] ?? 0) * 2.5), data: points.map(point => ({ name: point.name, companyId: point.companyId, quadrant: point.quadrant, arts: point.arts, value: [Math.max(10, point.overdue), point.gapShare, point.arts], itemStyle: { color: quadrantColor[point.quadrant], opacity: 0.78 } })),
        markLine: { silent: true, symbol: 'none', lineStyle: { color: theme.neutral, type: 'dashed' }, label: { show: false }, data: [{ xAxis: Math.max(10, matrix.overdueCut) }, { yAxis: matrix.gapCut }] } }],
    };
  }, [matrix, theme]); // eslint-disable-line react-hooks/exhaustive-deps
  const quadrants = (['Agir já', 'Cobrar', 'Orientar RT', 'Acompanhar'] as const).map(name => ({ name, ids: matrix.points.filter(point => point.quadrant === name).map(point => point.companyId) }));

  return <div className="ck-grid ck-grid-portfolio">
    <Tile area="tree" title="Árvore de decomposição · saldo vencido" subtitle="Clique numa barra para abrir o próximo nível; troque a dimensão no cabeçalho de cada coluna" help="Equivalente à árvore de decomposição do Power BI. A barra vermelha é o maior contribuinte do nível; o botão ⌖ filtra o painel pelas empresas daquele nó." focus={ctx.focus === 'tree'} onFocus={() => ctx.toggleFocus('tree')}>
      <DecompositionTree rows={ctx.debt} theme={theme} onSelect={ctx.select} />
    </Tile>
    <Tile area="gauge" title="Recuperação e aging" subtitle="Dívida de abertura recuperada · saldo vencido por idade">
      <div className="ck-gauge-stack"><EChart theme={theme} option={gauge} ariaLabel="Medidor de recuperação da dívida" /><EChart theme={theme} option={aging} ariaLabel="Saldo vencido por faixa de atraso" onPick={item => { const row = model.debtBuckets[item.dataIndex]; if (row) ctx.select(row.companyIds, `Atraso ${row.name}`); }} /></div>
    </Tile>
    <Tile area="yoy" title="Arrecadação PJ · ano contra ano" subtitle="Recebido no mês vs. mesmo mês do ano anterior" focus={ctx.focus === 'yoy'} onFocus={() => ctx.toggleFocus('yoy')}>
      <EChart theme={theme} option={yoyOption} ariaLabel="Recebimentos mensais comparados ao ano anterior" onPick={item => { const month = history.monthly.slice(-12)[item.dataIndex]; if (month) ctx.select(month.receiptCompanyIds, `Pagaram em ${fmt.month(month.month)}`); }} />
    </Tile>
    <Tile area="mx" title="Matriz de prioridade de atuação" subtitle="Empresas devedoras: saldo vencido × dias sem RT identificado · tamanho = ARTs" help={`Corte de saldo = mediana dos devedores (${fmt.money(matrix.overdueCut)}); corte de RT = 50% dos dias registrados sem RT identificado. Não é score de irregularidade: cada eixo é verificável na ficha.`} focus={ctx.focus === 'mx'} onFocus={() => ctx.toggleFocus('mx')}
      actions={<div className="ck-legend-chips">{quadrants.map(item => <button key={item.name} onClick={() => ctx.select(item.ids, `Prioridade · ${item.name}`)} title={`Filtrar ${item.ids.length} empresas`}><i style={{ background: quadrantColor[item.name] }} />{item.name} <b>{fmt.int(item.ids.length)}</b></button>)}</div>}>
      <EChart theme={theme} option={matrixOption} ariaLabel="Matriz de prioridade por empresa" onPick={item => item.data?.companyId && ctx.openCompany(item.data.companyId)} />
    </Tile>
  </div>;
}

/* =============================== Operação =============================== */
export function OperationsPage({ ctx }: { ctx: CockpitContext }) {
  const { theme, scope, historyScope } = ctx;
  const inspection = useMemo(() => inspectionFlow(scope), [scope]);
  const cao = useMemo(() => caoService(scope), [scope]);
  const art = useMemo(() => artActivity(scope, historyScope), [scope, historyScope]);
  const quality = useMemo(() => qualityQueue(scope), [scope]);
  const stageColors = [theme.primary, theme.blue, theme.sky, theme.gold, theme.good];
  const funnel = {
    tooltip: { formatter: (item: any) => `<b>${esc(item.name)}</b><br/>${fmt.int(item.value)} casos alcançaram a etapa<br/><span style="opacity:.7">clique filtra empresas na etapa atual</span>` },
    series: [{ type: 'funnel', left: 4, right: 4, top: 6, bottom: 6, minSize: '28%', gap: 3, sort: 'none', label: { position: 'inside', color: '#fff', fontWeight: 700, fontSize: 11, formatter: (item: any) => `${item.name}  ${fmt.int(item.value)}` }, itemStyle: { borderWidth: 0 },
      data: inspection.reached.map((row, index) => ({ name: row.stage, value: row.count, itemStyle: { color: stageColors[index] }, label: { color: index === 3 ? '#1A202C' : '#fff' } })) }],
  };
  const lead = {
    grid: { top: 8, right: 44, bottom: 22, left: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = inspection.transitions[items[0].dataIndex]; return `<b>${esc(row.from)} → ${esc(row.to)}</b><br/>Mediana: ${row.median === null ? '—' : `${Math.round(row.median)} dias`}<br/>Intervalo interquartil: ${row.p25 === null ? '—' : `${Math.round(row.p25)}–${Math.round(row.p75!)} dias`}<br/>${row.n} transições observadas`; } },
    xAxis: { type: 'value', name: 'dias', nameTextStyle: { color: theme.muted }, splitLine: { lineStyle: { color: theme.grid, type: 'dashed' } }, axisLabel: { color: theme.muted } },
    yAxis: { type: 'category', inverse: true, data: inspection.transitions.map(row => `${row.from.split(' ')[0]} → ${row.to.split(' ')[0]}`), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: theme.ink, fontSize: 10 } },
    series: [
      { type: 'bar', stack: 'r', silent: true, itemStyle: { color: 'transparent' }, data: inspection.transitions.map(row => row.p25 ?? 0), barWidth: 14 },
      { type: 'bar', stack: 'r', data: inspection.transitions.map(row => (row.p75 ?? 0) - (row.p25 ?? 0)), itemStyle: { color: theme.dark ? 'rgba(99,156,224,.35)' : 'rgba(49,130,206,.25)', borderRadius: 7 }, barWidth: 14 },
      { type: 'scatter', symbol: 'diamond', symbolSize: 14, data: inspection.transitions.map(row => row.median ?? 0), itemStyle: { color: theme.gold, borderColor: theme.primary, borderWidth: 1.5 }, label: { show: true, position: 'right', color: theme.ink, fontWeight: 700, fontSize: 10, formatter: (item: any) => `${Math.round(item.value)} d` }, z: 5 },
    ],
  };
  const backlog = {
    grid: { top: 26, right: 8, bottom: 6, left: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: theme.muted, fontSize: 10 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: theme.grid, type: 'dashed' } }, axisLabel: { color: theme.muted } },
    yAxis: { type: 'category', inverse: true, data: inspection.backlog.map(row => row.name), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: theme.ink, fontSize: 10 } },
    series: caseStages.slice(0, -1).map((stage, index) => ({ name: stage, type: 'bar', stack: 'b', barWidth: 16, data: inspection.backlog.map(row => row.byStage[index]), itemStyle: { color: stageColors[index], borderColor: theme.panel, borderWidth: 1 } })),
  };
  const caoOption = {
    grid: { top: 10, right: 8, bottom: 22, left: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>${esc(items[0].name)} dias</b><br/>${fmt.int(items[0].value)} CAOs emitidas` },
    xAxis: { type: 'category', data: cao.histogram.map(row => row.name), axisTick: { show: false }, axisLine: { lineStyle: { color: theme.grid } }, axisLabel: { color: theme.muted, fontSize: 10 }, name: 'dias entre pedido e emissão', nameLocation: 'middle', nameGap: 22, nameTextStyle: { color: theme.muted, fontSize: 10 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: theme.grid, type: 'dashed' } }, axisLabel: { color: theme.muted } },
    series: [{ type: 'bar', barWidth: '70%', data: cao.histogram.map((row, index) => ({ value: row.count, itemStyle: { borderRadius: [4, 4, 0, 0], color: index <= 2 ? theme.good : index === 3 ? theme.gold : theme.bad } })), label: { show: true, position: 'top', color: theme.ink, fontSize: 10 } }],
  };
  const maxArt = Math.max(...art.cells.map(cell => cell[2]), 1);
  const heat = {
    grid: { top: 4, right: 8, bottom: 42, left: 4, containLabel: true },
    tooltip: { formatter: (item: any) => `<b>${esc(art.gres[item.value[1]])}</b> · ${fmt.month(art.months[item.value[0]])}<br/>${fmt.int(item.value[2])} ARTs de empresas` },
    xAxis: { type: 'category', data: art.months.map(fmt.month), splitArea: { show: false }, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: theme.muted, fontSize: 9 } },
    yAxis: { type: 'category', data: art.gres.map(name => name.split('·')[1]?.trim() ?? name), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: theme.ink, fontSize: 9, interval: 0 } },
    visualMap: { min: 0, max: maxArt, orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 10, itemHeight: 140, calculable: false, textStyle: { color: theme.muted, fontSize: 9 }, inRange: { color: theme.seq } },
    series: [{ type: 'heatmap', data: art.cells, itemStyle: { borderColor: theme.panel, borderWidth: 2, borderRadius: 3 }, emphasis: { itemStyle: { borderColor: theme.gold, borderWidth: 2 } } }],
  };
  const qualityOption = {
    grid: { top: 22, right: 8, bottom: 4, left: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: theme.muted, fontSize: 10 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: quality.map(row => row.type), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: theme.ink, fontSize: 10, width: 128, overflow: 'truncate' } },
    series: [
      { name: 'Abertas', type: 'bar', stack: 'q', barWidth: 12, data: quality.map(row => row.open), itemStyle: { color: theme.bad }, label: { show: true, position: 'insideLeft', color: '#fff', fontSize: 9, formatter: (item: any) => item.value || '' } },
      { name: 'Resolvidas', type: 'bar', stack: 'q', barWidth: 12, data: quality.map(row => row.resolved), itemStyle: { color: theme.dark ? '#2B416B' : '#CBD5E0', borderRadius: [0, 6, 6, 0] } },
    ],
  };
  const queueTotal = cao.queue.reduce((total, row) => total + row.count, 0);
  return <div className="ck-grid ck-grid-ops">
    <div className="ck-ops-strip" style={{ gridArea: 'strip' }}>
      <div><span>Casos de fiscalização em aberto</span><strong>{fmt.int(inspection.open)}</strong><em>de {fmt.int(inspection.total)} no recorte</em></div>
      <div><span>Ciclo mediano até conclusão</span><strong>{inspection.cycleMedian === null ? '—' : `${Math.round(inspection.cycleMedian)} dias`}</strong><em>{fmt.int(inspection.notices)} com auto/decisão</em></div>
      <div><span>Prazo mediano de CAO</span><strong>{cao.median === null ? '—' : `${Math.round(cao.median)} dias`}</strong><em>P90 {cao.p90 === null ? '—' : `${Math.round(cao.p90)} dias`}</em></div>
      <div><span>Fila de CAO</span><strong>{fmt.int(queueTotal)}</strong><em>{cao.queue.map(row => `${row.status} ${row.count}`).join(' · ')}</em></div>
      <div><span>ARTs de empresas na janela</span><strong>{fmt.int(art.total)}</strong><em>{fmt.brl(art.value)} em valor declarado</em></div>
      <div><span>Pendências cadastrais abertas</span><strong>{fmt.int(quality.reduce((total, row) => total + row.open, 0))}</strong><em>{quality[0] ? `maior: ${quality[0].type}` : 'sem pendências'}</em></div>
    </div>
    <Tile area="fun" title="Funil da fiscalização" subtitle="Casos que alcançaram cada etapa">
      <EChart theme={theme} option={funnel} ariaLabel="Funil de etapas da fiscalização" onPick={item => { const row = inspection.reached.find(stage => stage.stage === item.name); if (row) ctx.select(row.companyIds, `Fiscalização · ${row.stage}`); }} />
    </Tile>
    <Tile area="lead" title="Tempo entre etapas" subtitle="Mediana (◆) e intervalo interquartil" help="Gargalo = transição com maior mediana ou faixa mais larga. Calculado a partir do histórico de etapas de cada caso." focus={ctx.focus === 'lead'} onFocus={() => ctx.toggleFocus('lead')}>
      <EChart theme={theme} option={lead} ariaLabel="Tempo entre etapas da fiscalização" />
    </Tile>
    <Tile area="back" title="Backlog por idade" subtitle="Casos abertos por tempo desde a identificação">
      <EChart theme={theme} option={backlog} ariaLabel="Backlog de fiscalização por idade" onPick={item => { const row = inspection.backlog[item.dataIndex]; if (row) ctx.select(row.companyIds, `Backlog ${row.name}`); }} />
    </Tile>
    <Tile area="cao" title="Prazo de emissão de CAO" subtitle="Distribuição do pedido até a emissão · verde até 90 dias">
      <EChart theme={theme} option={caoOption} ariaLabel="Distribuição do prazo de emissão de CAO" />
    </Tile>
    <Tile area="heat" title="ARTs de empresas · mês × GRE" subtitle="Últimos 12 meses · intensidade = quantidade" focus={ctx.focus === 'heat'} onFocus={() => ctx.toggleFocus('heat')}>
      <EChart theme={theme} option={heat} ariaLabel="Mapa de calor de ARTs por mês e GRE" />
    </Tile>
    <Tile area="qual" title="Qualidade cadastral" subtitle="Pendências abertas × resolvidas">
      <EChart theme={theme} option={qualityOption} ariaLabel="Pendências de qualidade cadastral" onPick={item => { const row = quality[item.dataIndex]; if (row?.companyIds.length) ctx.select(row.companyIds, `Pendência · ${row.type}`); }} />
    </Tile>
  </div>;
}

/* =============================== Contexto público (dados reais) =============================== */
export function PublicPage({ ctx }: { ctx: CockpitContext }) {
  const { theme, publicData, macro, population } = ctx;
  if (!publicData) return <div className="ck-loading ck-loading-page">Carregando fontes públicas…</div>;
  const ufs = publicData.ufs.data ?? [], sp = ufs.find(row => row.uf === 'SP');
  const brActive = ufs.reduce((total, row) => total + row.active, 0), brPopulation = ufs.reduce((total, row) => total + row.population, 0);
  const brDensity = brPopulation ? brActive / brPopulation * 100000 : 0;
  const spPopulation = population?.data?.value ?? sp?.population ?? 0;
  const ranking = [...ufs].sort((a, b) => b.per100k - a.per100k);
  const density = {
    grid: { top: 8, right: 36, bottom: 4, left: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = ranking[items[0].dataIndex]; return `<b>${row.crea}</b><br/>${fmt.int(row.active)} profissionais ativos<br/>${fmt.int(row.population)} habitantes<br/><b>${row.per100k.toFixed(0)}</b> por 100 mil hab.`; } },
    xAxis: { type: 'category', data: ranking.map(row => row.uf), axisTick: { show: false }, axisLine: { lineStyle: { color: theme.grid } }, axisLabel: { color: theme.muted, fontSize: 9, interval: 0 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: theme.grid, type: 'dashed' } }, axisLabel: { color: theme.muted } },
    series: [{ type: 'bar', barWidth: '64%', data: ranking.map(row => ({ value: Math.round(row.per100k), itemStyle: { borderRadius: [4, 4, 0, 0], color: row.uf === 'SP' ? theme.gold : theme.dark ? '#2F548C' : '#9CC3EE' } })),
      label: { show: true, position: 'top', fontSize: 9, color: theme.ink, formatter: (item: any) => ranking[item.dataIndex].uf === 'SP' ? `SP ${item.value}` : '' },
      markLine: { symbol: 'none', lineStyle: { color: theme.primary, type: 'dashed' }, label: { formatter: `Brasil ${brDensity.toFixed(0)}`, color: theme.primary, fontSize: 10, position: 'insideEndTop' }, data: [{ yAxis: brDensity }] } }],
  };
  const retention = {
    grid: { top: 18, right: 18, bottom: 30, left: 6, containLabel: true },
    tooltip: { formatter: (item: any) => `<b>${esc(item.data.crea)}</b><br/>${item.value[0].toFixed(0)} ativos por 100 mil hab.<br/>${fmt.pct(item.value[1])} dos registros seguem ativos` },
    xAxis: { type: 'value', name: 'Ativos por 100 mil hab.', nameLocation: 'middle', nameGap: 20, nameTextStyle: { color: theme.muted, fontSize: 10 }, scale: true, splitLine: { lineStyle: { color: theme.grid, type: 'dashed' } }, axisLabel: { color: theme.muted } },
    yAxis: { type: 'value', name: '% registros ativos', nameTextStyle: { color: theme.muted, fontSize: 10, align: 'left' }, scale: true, splitLine: { lineStyle: { color: theme.grid, type: 'dashed' } }, axisLabel: { color: theme.muted, formatter: '{value}%' } },
    series: [{ type: 'scatter', data: ufs.filter(row => row.activeShare !== null).map(row => ({ crea: row.crea, value: [row.per100k, row.activeShare], symbolSize: row.uf === 'SP' ? 22 : Math.max(7, Math.sqrt(row.active) / 22), itemStyle: { color: row.uf === 'SP' ? theme.gold : theme.sky, opacity: row.uf === 'SP' ? 1 : 0.7, borderColor: row.uf === 'SP' ? theme.primary : 'transparent', borderWidth: 2 }, label: { show: true, position: 'right', color: row.uf === 'SP' ? theme.ink : theme.muted, fontWeight: row.uf === 'SP' ? 800 : 400, fontSize: row.uf === 'SP' ? 11 : 9, formatter: row.uf } })) }],
  };
  const decade = publicData.spDecade.data ?? [];
  const registrations = {
    grid: { top: 30, right: 6, bottom: 22, left: 6, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 12, itemHeight: 8, textStyle: { color: theme.muted, fontSize: 10 } },
    tooltip: { trigger: 'axis', formatter: (items: any[]) => `<b>${items[0].axisValue}</b><br/>${items.map(item => `${item.marker}${esc(item.seriesName)}: ${item.value === null || item.value === undefined ? 'não publicado' : fmt.int(item.value)}`).join('<br/>')}` },
    xAxis: { type: 'category', data: decade.map(row => row.year), axisTick: { show: false }, axisLine: { lineStyle: { color: theme.grid } }, axisLabel: { color: theme.muted, fontSize: 9 } },
    yAxis: [{ type: 'value', splitLine: { lineStyle: { color: theme.grid, type: 'dashed' } }, axisLabel: { color: theme.muted, formatter: (value: number) => fmt.compact(value) } }, { type: 'value', splitLine: { show: false }, axisLabel: { color: theme.muted, formatter: (value: number) => fmt.compact(value) } }],
    series: [
      { name: 'CREA-SP (eixo esq.)', type: 'bar', barWidth: '55%', data: decade.map(row => row.sp), itemStyle: { color: theme.gold, borderRadius: [4, 4, 0, 0] } },
      { name: 'Brasil (eixo dir.)', type: 'line', yAxisIndex: 1, smooth: 0.3, data: decade.map(row => row.br), symbol: 'circle', symbolSize: 5, lineStyle: { color: theme.primary, width: 2.5 }, itemStyle: { color: theme.primary } },
    ],
  };
  const modalities = {
    tooltip: { formatter: (item: any) => `<b>${esc(item.name)}</b><br/>${fmt.int(item.value)} títulos · ${fmt.pct(item.percent)}` },
    series: [{ type: 'pie', radius: ['48%', '78%'], center: ['50%', '52%'], padAngle: 2, itemStyle: { borderRadius: 6, borderColor: theme.panel, borderWidth: 2 }, label: { color: theme.ink, fontSize: 10, formatter: '{b}\n{d}%' }, labelLine: { length: 6, length2: 6 },
      data: (publicData.modalities.data ?? []).map((row, index) => ({ name: row.name, value: row.value, itemStyle: { color: [theme.primary, theme.blue, theme.gold, theme.sky, theme.good, theme.neutral][index] } })) }],
    graphic: [{ type: 'text', left: 'center', top: '46%', style: { text: fmt.compact((publicData.modalities.data ?? []).reduce((total, row) => total + row.value, 0)), fill: theme.ink, fontSize: 16, fontWeight: 800, fontFamily: 'Raleway, Lato, sans-serif', textAlign: 'center' } }],
  };
  const pncp = publicData.pncp.data!;
  const pncpOption = {
    tooltip: { formatter: (item: any) => `<b>${esc(item.name)}</b><br/>${fmt.money(item.value)}<br/>${fmt.int(item.data.count)} contratos publicados` },
    series: [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, left: 0, right: 0, top: 0, bottom: 0, label: { show: true, color: '#fff', fontSize: 10, overflow: 'truncate', formatter: (item: any) => `${item.name}\n${fmt.brl(item.value)}` },
      itemStyle: { borderColor: theme.panel, borderWidth: 2, gapWidth: 2, borderRadius: 4 },
      data: pncp.municipalities.slice(0, 18).map((row, index) => ({ name: row.name, value: row.value, count: row.count, itemStyle: { color: index === 0 ? theme.primary : index < 4 ? theme.blue : index < 9 ? theme.sky : theme.dark ? '#2F548C' : '#9CC3EE' }, label: { color: index < 9 ? '#fff' : '#1A202C' } })) }],
  };
  const spending = publicData.spending.data ?? [];
  const spendingOption = {
    grid: { top: 4, right: 60, bottom: 4, left: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>${esc(items[0].name)}</b><br/>${fmt.money(items[0].value)}` },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: spending.map(row => row.label.replace('Despesa do exercício de', 'Despesa total').toLocaleLowerCase('pt-BR').replace(/^./, character => character.toUpperCase())), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: theme.ink, fontSize: 10, width: 170, overflow: 'truncate' } },
    series: [{ type: 'bar', barWidth: 12, data: spending.map(row => ({ value: row.value, itemStyle: { borderRadius: 6, color: /exercício/.test(row.label) ? theme.primary : theme.sky } })), label: { show: true, position: 'right', color: theme.ink, fontSize: 10, formatter: (item: any) => fmt.brl(item.value) } }],
  };
  return <div className="ck-grid ck-grid-public">
    <div className="ck-public-strip" style={{ gridArea: 'facts' }} aria-label="Resultados publicados pelo CREA-SP em 2025">
      <span className="ck-strip-title">Relatório de Gestão CREA-SP 2025 <FreshnessBadge freshness="snapshot" date={publicData.management.capturedAt} /><a href={publicData.management.url} target="_blank" rel="noreferrer" aria-label="Abrir fonte do Relatório de Gestão"><ExternalLink size={12} /></a></span>
      <div className="ck-marquee">{(publicData.management.data ?? []).map(row => <div key={row.id} className="ck-fact"><strong>{row.display}</strong><span>{row.label}</span></div>)}</div>
    </div>
    <div className="ck-macro" style={{ gridArea: 'macro' }}>
      <div className="ck-macro-head"><Radio size={13} /> Conjuntura · Banco Central (SGS) {macro ? <FreshnessBadge freshness={macro.freshness} date={macro.capturedAt} /> : <span className="ck-fresh ck-fresh-snap"><i />consultando…</span>}</div>
      {macro?.data ? macro.data.map(series => { const last = series.points.at(-1); return <div key={series.id} className="ck-macro-card"><span>{series.label}</span><strong>{last ? `${last.value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}` : '—'}<em>{series.unit}</em></strong><Sparkline values={series.points.map(point => point.value)} color={series.id === 'incc' ? theme.gold : theme.sky} height={28} /><small>{last ? last.date.split('-').reverse().join('/') : ''}</small></div>; })
        : macro ? <p className="ck-offline">API do BCB indisponível nesta rede ({macro.note}). Nenhum valor é estimado; a consulta é refeita a cada abertura do painel.</p> : null}
      <div className="ck-macro-card ck-macro-sp"><span>Profissionais ativos / 100 mil hab. · SP</span><strong>{sp && spPopulation ? (sp.active / spPopulation * 100000).toFixed(0) : '—'}<em>Brasil {brDensity.toFixed(0)}</em></strong><small>{sp ? `${fmt.int(sp.active)} ativos · ${fmt.compact(spPopulation)} hab. (IBGE ${population?.data?.year ?? ''}, ${population?.freshness ?? 'snapshot'})` : ''}</small></div>
    </div>
    <Tile area="dens" title="Densidade profissional por UF" subtitle="Profissionais ativos no Sistema Confea/Crea por 100 mil habitantes" badge={<FreshnessBadge freshness={publicData.ufs.freshness} date={publicData.ufs.capturedAt} />} focus={ctx.focus === 'dens'} onFocus={() => ctx.toggleFocus('dens')}>
      <EChart theme={theme} option={density} ariaLabel="Ranking de profissionais por 100 mil habitantes" />
    </Tile>
    <Tile area="ret" title="Densidade × permanência do registro" subtitle="Cada ponto é um Crea; SP em destaque" badge={<FreshnessBadge freshness={publicData.ufs.freshness} date={publicData.ufs.capturedAt} />} help="Eixo vertical = registros ativos ÷ todos os registros já feitos no Crea (Confea SIC). Mede quanto da base histórica continua ativa.">
      <EChart theme={theme} option={retention} ariaLabel="Dispersão densidade por permanência" />
    </Tile>
    <Tile area="reg" title="Registros profissionais novos por ano" subtitle={publicData.spDecade.note ?? ''} badge={<FreshnessBadge freshness={publicData.spDecade.freshness} date={publicData.spDecade.capturedAt} />}>
      <EChart theme={theme} option={registrations} ariaLabel="Registros novos por ano CREA-SP e Brasil" />
    </Tile>
    <Tile area="mod" title="Modalidades de engenharia" subtitle="Títulos ativos no Brasil (títulos ≠ pessoas)" badge={<FreshnessBadge freshness={publicData.modalities.freshness} date={publicData.modalities.capturedAt} />}>
      <EChart theme={theme} option={modalities} ariaLabel="Distribuição de títulos por modalidade" />
    </Tile>
    <Tile area="pncp" title="Contratações públicas de obras e serviços · SP" subtitle={`PNCP · publicações de ${pncp.period.split('-').reverse().join('/')} por município do órgão`} badge={<FreshnessBadge freshness={publicData.pncp.freshness} date={publicData.pncp.capturedAt} />} help="Recorte de um dia de publicações da API pública do PNCP, categorias obras/serviços de engenharia. Não representa estoque de contratos nem local de execução.">
      <EChart theme={theme} option={pncpOption} ariaLabel="Treemap de valores PNCP por município" />
    </Tile>
    <Tile area="spend" title="Despesa do CREA-SP" subtitle="Portal da Transparência · exercícios e subgrupos acumulados 2013–2026" badge={<FreshnessBadge freshness={publicData.spending.freshness} date={publicData.spending.capturedAt} />} help="Agregados reproduzidos da API do Portal da Transparência do CREA-SP. Subgrupos são acumulados do período e não se somam à despesa de um exercício.">
      <EChart theme={theme} option={spendingOption} ariaLabel="Despesa do CREA-SP por subgrupo" />
    </Tile>
  </div>;
}
