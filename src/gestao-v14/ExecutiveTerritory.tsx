import { useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, Sparkles } from 'lucide-react';
import type { CockpitContext } from './context';
import { mainEstablishments } from './metrics';
import type { GreRow } from './metrics';
import { EChart, KpiCard, Segmented, Sparkline, Tile, ensureSpMap, esc, fmt } from './widgets';

const greShort = (name: string) => name.split('·')[1]?.trim() ?? name;

/* =============================== Visão executiva =============================== */
export function ExecutivePage({ ctx }: { ctx: CockpitContext }) {
  const { theme, history, forecast, bridge, flow, model, period } = ctx;
  const months = history.monthly.map(row => row.month);
  const future = Array.from({ length: forecast.forecast.length }, (_, step) => {
    const [year, month] = months.at(-1)!.split('-').map(Number), date = new Date(Date.UTC(year, month + step, 1));
    return date.toISOString().slice(0, 7);
  });
  const forecastOption = useMemo(() => {
    const actual = history.monthly.map(row => row.base), pad = actual.map(() => null), last = actual.at(-1)!;
    const labels = [...months, ...future].map(fmt.month);
    return {
      grid: { top: 26, right: 18, bottom: 26, left: 8, containLabel: true },
      tooltip: { trigger: 'axis', formatter: (items: any[]) => `<b>${esc(items[0].axisValueLabel)}</b><br/>${items.filter(item => item.value !== null && item.value !== undefined && item.seriesName !== 'faixa-base').map(item => `${item.marker}${esc(item.seriesName === 'faixa' ? 'Faixa de 95% (largura)' : item.seriesName)}: ${fmt.int(Number(item.value))}`).join('<br/>')}` },
      legend: { top: 0, right: 0, itemWidth: 14, itemHeight: 8, textStyle: { color: theme.muted }, data: ['Empresas vigentes', 'Projeção'] },
      xAxis: { type: 'category', data: labels, boundaryGap: false, axisLine: { lineStyle: { color: theme.grid } }, axisTick: { show: false }, axisLabel: { color: theme.muted, interval: 3 } },
      yAxis: { type: 'value', scale: true, splitLine: { lineStyle: { color: theme.grid, type: 'dashed' } }, axisLabel: { color: theme.muted, formatter: (value: number) => fmt.compact(value) } },
      series: [
        { name: 'Empresas vigentes', type: 'line', data: [...actual, ...future.map(() => null)], smooth: 0.35, symbol: 'circle', symbolSize: 5, showSymbol: false, lineStyle: { width: 3, color: theme.primary }, itemStyle: { color: theme.primary },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: theme.dark ? 'rgba(99,156,224,.35)' : 'rgba(8,45,116,.22)' }, { offset: 1, color: 'rgba(8,45,116,0)' }] } },
          markArea: { silent: true, itemStyle: { color: theme.dark ? 'rgba(250,189,7,.06)' : 'rgba(250,189,7,.09)' }, label: { show: period >= 6, position: 'insideTop', color: theme.muted, fontSize: 10, formatter: `janela de ${period} meses` }, data: [[{ xAxis: labels[Math.max(0, months.length - period)] }, { xAxis: labels[months.length - 1] }]] },
          markPoint: { symbol: 'pin', symbolSize: 34, itemStyle: { color: theme.bad }, label: { color: '#fff', fontSize: 9, formatter: '!' }, data: forecast.anomalies.map(index => ({ coord: [labels[index], actual[index]], name: 'Mês atípico' })) } },
        { name: 'faixa-base', type: 'line', stack: 'band', data: [...pad.slice(1), last, ...forecast.lower], lineStyle: { opacity: 0 }, symbol: 'none', silent: true, tooltip: { show: false } },
        { name: 'faixa', type: 'line', stack: 'band', data: [...pad.slice(1), 0, ...forecast.upper.map((value, step) => value - forecast.lower[step])], lineStyle: { opacity: 0 }, symbol: 'none', areaStyle: { color: theme.dark ? 'rgba(250,189,7,.18)' : 'rgba(250,189,7,.24)' } },
        { name: 'Projeção', type: 'line', data: [...pad.slice(1), last, ...forecast.forecast], symbol: 'circle', symbolSize: 6, lineStyle: { width: 2.5, type: [6, 4], color: theme.gold }, itemStyle: { color: theme.gold, borderColor: theme.panel, borderWidth: 2 } },
      ],
    };
  }, [history, forecast, theme, period]); // eslint-disable-line react-hooks/exhaustive-deps

  const waterfall = useMemo(() => {
    const steps = [
      { name: 'Abertura', value: bridge.opening, base: 0, color: theme.sky, ids: model.metadata.openingCompanyIds },
      { name: 'Novas', value: bridge.newcomers, base: bridge.opening, color: theme.good, ids: bridge.newcomerIds },
      { name: 'Retornos', value: bridge.returning, base: bridge.opening + bridge.newcomers, color: theme.good, ids: bridge.returningIds },
      { name: 'Saídas', value: bridge.exits, base: bridge.opening + bridge.newcomers + bridge.returning - bridge.exits, color: theme.bad, ids: bridge.exitIds },
      { name: 'Final', value: bridge.closing, base: 0, color: theme.primary, ids: model.metadata.activeCompanyIds },
    ];
    return { steps, option: {
      grid: { top: 30, right: 8, bottom: 8, left: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const step = steps[items[0].dataIndex]; return `<b>${step.name}</b><br/>${fmt.int(step.value)} empresas<br/><span style="opacity:.7">clique para filtrar</span>`; } },
      xAxis: { type: 'category', data: steps.map(step => step.name), axisTick: { show: false }, axisLine: { lineStyle: { color: theme.grid } }, axisLabel: { color: theme.ink, fontWeight: 700, interval: 0 } },
      yAxis: { type: 'value', show: false, min: Math.max(0, Math.min(bridge.opening, bridge.closing) * 0.82 - bridge.exits) },
      series: [
        { type: 'bar', stack: 'w', silent: true, itemStyle: { color: 'transparent' }, data: steps.map(step => step.base) },
        { type: 'bar', stack: 'w', barWidth: '56%', data: steps.map(step => ({ value: step.value, itemStyle: { color: step.color, borderRadius: 6 } })),
          label: { show: true, position: 'top', color: theme.ink, fontWeight: 700, fontSize: 12, formatter: (item: any) => `${item.dataIndex === 3 ? '−' : item.dataIndex === 1 || item.dataIndex === 2 ? '+' : ''}${fmt.int(item.value)}` } },
      ],
    } };
  }, [bridge, theme, model]);

  const sankey = useMemo(() => {
    const colors: Record<string, string> = { 'Universo empresarial': theme.primary, 'Registro vigente': theme.blue, 'Só histórico': theme.neutral, 'Nunca registrada': theme.bad, 'Com RT': theme.good, 'RT não identificado': theme.gold, 'Com ART no período': theme.sky, 'Sem ART no período': theme.neutral };
    const total = flow.nodes[0]?.value || 1;
    return {
      tooltip: { trigger: 'item', formatter: (item: any) => item.dataType === 'edge' ? `${esc(item.data.source)} → ${esc(item.data.target)}<br/><b>${fmt.int(item.data.value)}</b> empresas (${fmt.pct(item.data.value / total * 100)} do universo)` : `<b>${esc(item.name)}</b><br/>${fmt.int(item.value)} empresas · ${fmt.pct(item.value / total * 100)}` },
      series: [{ type: 'sankey', nodeAlign: 'left', left: 4, right: 150, top: 8, bottom: 8, nodeWidth: 14, nodeGap: 12, draggable: false, layoutIterations: 64, emphasis: { focus: 'adjacency' },
        data: flow.nodes.map(node => ({ name: node.name, value: node.value, itemStyle: { color: colors[node.name] ?? theme.sky, borderWidth: 0 } })),
        links: flow.links.map(link => ({ ...link })),
        lineStyle: { color: 'gradient', opacity: theme.dark ? 0.32 : 0.26, curveness: 0.5 },
        label: { color: theme.ink, fontSize: 11, formatter: (item: any) => `{n|${item.name}}\n{v|${fmt.int(item.value)} · ${fmt.pct(item.value / total * 100, 0)}}`, rich: { n: { fontWeight: 700, color: theme.ink, fontSize: 11 }, v: { color: theme.muted, fontSize: 10, padding: [2, 0, 0, 0] } } } }],
    };
  }, [flow, theme]);

  return <div className="ck-grid ck-grid-exec">
    <div className="ck-kpis" style={{ gridArea: 'kpi' }}>{ctx.kpis.map(kpi => <KpiCard key={kpi.id} kpi={kpi} theme={theme} restricted={!ctx.financialAllowed && (kpi.id === 'receipts' || kpi.id === 'overdue' || kpi.id === 'opportunity')} active={false} onClick={() => ctx.select(kpi.companyIds, kpi.label)} />)}</div>
    <Tile area="fc" title="Base vigente e projeção" subtitle="Empresas com registro vigente · 24 meses + 6 meses projetados" help="Projeção por suavização exponencial de Holt sobre a série mensal. A faixa amarela é o intervalo de 95% calculado pelos resíduos; pinos vermelhos marcam meses fora de ±2σ (anomalias)." focus={ctx.focus === 'fc'} onFocus={() => ctx.toggleFocus('fc')}
      badge={<span className="ck-chip-ai"><Sparkles size={11} /> previsão</span>}>
      <EChart theme={theme} option={forecastOption} ariaLabel="Série de empresas vigentes com projeção" onPick={item => { const month = history.monthly[item.dataIndex]; if (month && item.seriesName === 'Empresas vigentes') ctx.select(month.activeIds, `Vigentes em ${fmt.month(month.month)}`); }} />
    </Tile>
    <Tile area="wf" title="Ponte do estoque" subtitle={`Variação de empresas vigentes em ${period} meses`} help="Abertura + novas (sem registro anterior) + retornos (já registradas antes) − saídas = fechamento. Empresas-raiz distintas; reconcilia exatamente." focus={ctx.focus === 'wf'} onFocus={() => ctx.toggleFocus('wf')}>
      <EChart theme={theme} option={waterfall.option} ariaLabel="Ponte do estoque de empresas" onPick={item => { const step = waterfall.steps[item.dataIndex]; if (step) ctx.select(step.ids, `Ponte · ${step.name}`); }} />
    </Tile>
    <Tile area="nr" title="Leitura do período" subtitle="Narrativa gerada automaticamente a partir do recorte" className="ck-narrative" badge={<span className="ck-chip-ai"><Sparkles size={11} /> automática</span>}>
      <ul>{ctx.insights.filter(item => ctx.financialAllowed || !/arrecad|saldo vencido/.test(item.text)).map((item, index) => <li key={index} className={`is-${item.tone}`}><i /><p><strong>{item.strong}</strong> {item.text}</p></li>)}</ul>
      <p className="ck-foot">Texto recalculado a cada filtro. Dados internos demonstrativos; não indica causalidade.</p>
    </Tile>
    <Tile area="sk" title="Funil de conformidade empresarial" subtitle="Universo → registro vigente → responsável técnico → ART" help="Empresas-raiz. Universo = empresas com estabelecimento em CNAE elegível ou com registro vigente. RT não identificado não significa ausência real; clique em um nó ou fluxo para filtrar." focus={ctx.focus === 'sk'} onFocus={() => ctx.toggleFocus('sk')}>
      <EChart theme={theme} option={sankey} ariaLabel="Funil de conformidade em Sankey" onPick={item => { const ids = item.dataType === 'edge' ? item.data.companyIds : flow.nodes.find(node => node.name === item.name)?.companyIds; if (ids?.length) ctx.select(ids, item.dataType === 'edge' ? `${item.data.source} → ${item.data.target}` : item.name); }} />
    </Tile>
    <Tile area="sc" title="Scorecard das gerências regionais" subtitle="Clique numa linha para filtrar a GRE · cabeçalhos ordenam" focus={ctx.focus === 'sc'} onFocus={() => ctx.toggleFocus('sc')}>
      <Scorecard rows={ctx.gres} ctx={ctx} />
    </Tile>
  </div>;
}

function Scorecard({ rows, ctx }: { rows: GreRow[]; ctx: CockpitContext }) {
  const { theme, targets, financialAllowed } = ctx;
  const [sort, setSort] = useState<{ key: keyof GreRow; dir: 1 | -1 }>({ key: 'base', dir: -1 });
  const sorted = [...rows].sort((a, b) => ((Number(a[sort.key] ?? -Infinity) - Number(b[sort.key] ?? -Infinity)) || 0) * sort.dir);
  const maxBase = Math.max(...rows.map(row => row.base), 1), maxOverdue = Math.max(...rows.map(row => row.overdue), 1), maxGap = Math.max(...rows.map(row => row.gap), 1);
  const head = (key: keyof GreRow, label: string, title?: string) => <th aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}><button title={title} onClick={() => setSort({ key, dir: sort.key === key ? (sort.dir === 1 ? -1 : 1) : -1 })}>{label}{sort.key === key && <ArrowDownUp size={10} />}</button></th>;
  return <div className="ck-table-wrap"><table className="ck-score">
    <thead><tr>{head('name', 'GRE')}{head('base', 'Empresas')}<th>Tendência 24m</th>{head('coverage', 'Cobertura', `Meta ${targets.coverage}%`)}{head('rtCoverage', 'RT', `Meta ${targets.rtCoverage}%`)}{head('companyGrowth', 'Δ base')}{head('gap', 'Lacuna', 'CNPJs elegíveis sem registro vigente')}{financialAllowed && head('overdue', 'Saldo vencido')}</tr></thead>
    <tbody>{sorted.map(row => {
      const coverageOk = row.coverage !== null && row.coverage >= targets.coverage, rtOk = row.rtCoverage !== null && row.rtCoverage >= targets.rtCoverage;
      return <tr key={row.id} tabIndex={0} onClick={() => ctx.dimension('greIds', [row.id])} onKeyDown={event => { if (event.key === 'Enter') ctx.dimension('greIds', [row.id]); }} title={`Filtrar ${row.name}`}>
        <td className="ck-score-name"><b>{row.id.replace('GRE', '')}</b>{greShort(row.name)}</td>
        <td><span className="ck-cellbar"><i style={{ width: `${row.base / maxBase * 100}%`, background: theme.sky }} /><em>{fmt.int(row.base)}</em></span></td>
        <td className="ck-score-spark"><Sparkline values={row.spark} color={row.spark.at(-1)! >= row.spark[0] ? theme.good : theme.bad} height={22} fill={false} /></td>
        <td><span className={`ck-flag ${coverageOk ? 'is-good' : 'is-bad'}`}>{coverageOk ? '▲' : '▼'}</span>{row.coverage === null ? '—' : fmt.pct(row.coverage, 0)}</td>
        <td><span className={`ck-flag ${rtOk ? 'is-good' : 'is-bad'}`}>{rtOk ? '▲' : '▼'}</span>{row.rtCoverage === null ? '—' : fmt.pct(row.rtCoverage, 0)}</td>
        <td className={row.companyGrowth === null ? '' : row.companyGrowth >= 0 ? 'ck-pos' : 'ck-neg'}>{row.companyGrowth === null ? '—' : `${row.companyGrowth >= 0 ? '+' : ''}${fmt.pct(row.companyGrowth, 0)}`}</td>
        <td><span className="ck-heat" style={{ background: `color-mix(in srgb, ${theme.gold} ${Math.round(row.gap / maxGap * 85) + 8}%, transparent)` }}>{fmt.int(row.gap)}</span></td>
        {financialAllowed && <td><span className="ck-heat" style={{ background: `color-mix(in srgb, ${theme.bad} ${Math.round(row.overdue / maxOverdue * 55) + 6}%, transparent)` }}>{fmt.brl(row.overdue)}</span></td>}
      </tr>;
    })}</tbody></table></div>;
}

/* =============================== Território =============================== */
type MapMetric = 'coverage' | 'gap' | 'overdue' | 'companies';
export function TerritoryPage({ ctx }: { ctx: CockpitContext }) {
  const { theme, model, scope, gres } = ctx;
  const [metric, setMetric] = useState<MapMetric>('coverage');
  const [mapReady, setMapReady] = useState(false);
  const [shared, setShared] = useState(false);
  useEffect(() => { let alive = true; ensureSpMap().then(() => { if (alive) setMapReady(true); }); return () => { alive = false; }; }, []);
  const cityRows = useMemo(() => {
    const main = mainEstablishments(scope.dataset), facts = new Map(model.companyFacts.map(row => [row.companyId, row]));
    const overdue = new Map<string, number>(), companies = new Map<string, number>();
    for (const company of scope.companies) { const city = main.get(company.id)?.cityId; if (!city) continue; companies.set(city, (companies.get(city) ?? 0) + 1); overdue.set(city, (overdue.get(city) ?? 0) + (facts.get(company.id)?.overdue ?? 0)); }
    return model.cityRows.map(row => ({ ...row, gap: row.eligible - row.matched, overdue: overdue.get(row.id) ?? 0, companies: companies.get(row.id) ?? 0 }));
  }, [model, scope]);
  const available: MapMetric[] = ctx.financialAllowed ? ['coverage', 'gap', 'overdue', 'companies'] : ['coverage', 'gap', 'companies'];
  const value = (row: typeof cityRows[number]) => metric === 'coverage' ? row.coverage : metric === 'gap' ? row.gap : metric === 'overdue' ? row.overdue : row.companies;
  const display = (number: number | null) => number === null ? '—' : metric === 'coverage' ? fmt.pct(number) : metric === 'overdue' ? fmt.brl(number) : fmt.int(number);
  const mapOption = useMemo(() => {
    const values = cityRows.map(value).filter((item): item is number => item !== null);
    const reverse = metric === 'gap' || metric === 'overdue';
    const ramp = reverse ? (theme.dark ? ['#2A2A3D', '#7A5A10', '#FABD07', '#FF7A7A'] : ['#FFF7D6', '#FFD148', '#E0AB0C', '#A81919']) : theme.seq;
    return {
      tooltip: { trigger: 'item', formatter: (item: any) => { const row = cityRows.find(city => city.name === item.name); return row ? `<b>${esc(row.name)}</b><br/>Cobertura: ${row.coverage === null ? '—' : fmt.pct(row.coverage)}<br/>Sem vigência: ${fmt.int(row.gap)} CNPJs<br/>Empresas: ${fmt.int(row.companies)}${ctx.financialAllowed ? `<br/>Saldo vencido: ${fmt.brl(row.overdue)}` : ''}` : `${esc(item.name)}<br/><span style="opacity:.7">sem amostra no cenário</span>`; } },
      visualMap: { min: metric === 'coverage' ? 0 : 0, max: metric === 'coverage' ? 100 : Math.max(1, ...values), left: 8, bottom: 8, orient: 'horizontal', itemWidth: 10, itemHeight: 120, calculable: false, text: [metric === 'coverage' ? '100%' : 'maior', metric === 'coverage' ? '0%' : '0'], textStyle: { color: theme.muted, fontSize: 10 }, inRange: { color: ramp } },
      series: [{ type: 'map', map: 'spCockpit', roam: true, scaleLimit: { min: 1, max: 6 }, left: 4, right: 4, top: 4, bottom: 36, selectedMode: false,
        itemStyle: { areaColor: theme.dark ? '#16284A' : '#EEF2F7', borderColor: theme.dark ? '#2B416B' : '#CBD5E0', borderWidth: 0.4 },
        emphasis: { itemStyle: { areaColor: theme.gold }, label: { show: true, color: '#1A202C', fontWeight: 700 } },
        data: cityRows.map(row => ({ name: row.name, value: value(row) ?? undefined, id: row.id })) }],
    };
  }, [cityRows, metric, theme]); // eslint-disable-line react-hooks/exhaustive-deps
  const ranking = [...cityRows].filter(row => value(row) !== null).sort((a, b) => metric === 'coverage' ? (a.coverage ?? 0) - (b.coverage ?? 0) : Number(value(b)) - Number(value(a))).slice(0, 7);

  const quadrant = useMemo(() => {
    const rows = gres.filter(row => row.coverage !== null && row.jobGrowth !== null);
    const meanX = rows.reduce((total, row) => total + row.coverage!, 0) / Math.max(1, rows.length), meanY = rows.reduce((total, row) => total + row.jobGrowth!, 0) / Math.max(1, rows.length);
    const xs = rows.map(row => row.coverage!), ys = rows.map(row => row.jobGrowth!);
    const [minX, maxX, minY, maxY] = [Math.min(...xs) - 3, Math.max(...xs) + 3, Math.min(...ys) - 1.5, Math.max(...ys) + 1.5];
    const zone = (x: number, y: number) => x < meanX && y >= meanY ? theme.bad : x >= meanX && y >= meanY ? theme.good : x < meanX ? theme.gold : theme.sky;
    const corner = (text: string, x: number, y: number, align: string, vertical: 'top' | 'bottom' = 'top') => ({ type: 'text', [align === 'left' ? 'left' : 'right']: x, [vertical]: y, style: { text, fill: theme.muted, fontSize: 10, fontWeight: 700, opacity: 0.85 } });
    return {
      grid: { top: 20, right: 24, bottom: 36, left: 8, containLabel: true },
      graphic: [corner('↖ EXPANDIR PRESENÇA', 52, 24, 'left'), corner('CONSOLIDAR ↗', 28, 24, 'right'), corner('↙ MONITORAR', 52, 62, 'left', 'bottom'), corner('MERCADO EM AJUSTE ↘', 28, 62, 'right', 'bottom')],
      tooltip: { formatter: (item: any) => `<b>${esc(item.data.name)}</b><br/>Cobertura CREA: ${fmt.pct(item.value[0])}<br/>Emprego setorial: ${item.value[1] >= 0 ? '+' : ''}${fmt.pct(item.value[1])}<br/>Empresas vigentes: ${fmt.int(item.value[2])}` },
      xAxis: { type: 'value', name: 'Cobertura de registro (%)', nameLocation: 'middle', nameGap: 24, min: Math.floor(minX / 5) * 5, max: Math.ceil(maxX / 5) * 5, interval: 5, nameTextStyle: { color: theme.muted }, splitLine: { lineStyle: { color: theme.grid, type: 'dashed' } }, axisLabel: { color: theme.muted } },
      yAxis: { type: 'value', min: Math.floor(minY / 2) * 2, max: Math.ceil(maxY / 2) * 2, interval: 2, axisLabel: { color: theme.muted, formatter: (value: number) => `${value}%` }, splitLine: { lineStyle: { color: theme.grid, type: 'dashed' } } },
      series: [{ type: 'scatter', labelLayout: { hideOverlap: true }, data: rows.map(row => ({ name: row.name, id: row.id, value: [row.coverage, row.jobGrowth, row.base], itemStyle: { color: zone(row.coverage!, row.jobGrowth!), opacity: 0.88, borderColor: theme.panel, borderWidth: 1.5 } })),
        symbolSize: (data: number[]) => Math.max(14, Math.sqrt(data[2]) * 2.6), label: { show: true, position: 'right', color: theme.ink, fontSize: 10, formatter: (item: any) => greShort(item.data.name) }, emphasis: { scale: 1.15 },
        markLine: { silent: true, symbol: 'none', lineStyle: { color: theme.neutral, type: 'dashed', width: 1 }, label: { color: theme.muted, fontSize: 10, formatter: (item: any) => item.value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }, data: [{ xAxis: meanX }, { yAxis: meanY }] } }],
    };
  }, [gres, theme]);
  const maxSpark = Math.max(...gres.flatMap(row => row.spark), 1), minSpark = Math.min(...gres.flatMap(row => row.spark));

  return <div className="ck-grid ck-grid-territory">
    <Tile area="map" title="Mapa municipal" subtitle="Malha IBGE · 645 municípios · role e use a roda para ampliar" focus={ctx.focus === 'map'} onFocus={() => ctx.toggleFocus('map')}
      actions={<Segmented label="Métrica do mapa" value={metric} onChange={setMetric} options={available.map(item => ({ value: item, label: item === 'coverage' ? 'Cobertura' : item === 'gap' ? 'Lacuna' : item === 'overdue' ? 'Vencido' : 'Empresas' }))} />}>
      <div className="ck-map-layout">
        {mapReady ? <EChart theme={theme} option={mapOption} ariaLabel="Mapa coroplético de São Paulo" onPick={item => { const row = cityRows.find(city => city.name === item.name); if (row) ctx.dimension('cityIds', [row.id]); }} /> : <div className="ck-loading">Carregando malha municipal…</div>}
        <ol className="ck-rank" aria-label="Municípios em destaque">{ranking.map((row, index) => <li key={row.id}><button onClick={() => ctx.dimension('cityIds', [row.id])}><b>{index + 1}</b><span>{row.name}</span><strong>{display(value(row))}</strong></button></li>)}
          <li className="ck-rank-note">{metric === 'coverage' ? 'Menor cobertura primeiro' : 'Maiores valores primeiro'} · clique filtra o município</li></ol>
      </div>
    </Tile>
    <Tile area="quad" title="Quadrante estratégico das GREs" subtitle="Cobertura do CREA-SP (x) × variação do emprego formal no setor, RAIS/CAGED (y)" help="Linhas tracejadas = médias das GREs. Mercado crescendo com cobertura baixa (vermelho) sugere expandir presença institucional. Tamanho = empresas vigentes. Clique filtra a GRE." focus={ctx.focus === 'quad'} onFocus={() => ctx.toggleFocus('quad')}>
      <EChart theme={theme} option={quadrant} ariaLabel="Quadrante cobertura por emprego" onPick={item => item.data?.id && ctx.dimension('greIds', [item.data.id])} />
    </Tile>
    <Tile area="mult" title="Pequenos múltiplos · base vigente por GRE" subtitle="24 meses · verde cresce, vermelho recua" focus={ctx.focus === 'mult'} onFocus={() => ctx.toggleFocus('mult')}
      actions={<Segmented label="Escala" value={shared ? 'shared' : 'own'} onChange={value => setShared(value === 'shared')} options={[{ value: 'own', label: 'Escala própria' }, { value: 'shared', label: 'Escala comum' }]} />}>
      <div className="ck-multiples">{[...gres].sort((a, b) => b.base - a.base).map(row => {
        const first = row.spark[0] ?? 0, last = row.spark.at(-1) ?? 0, delta = first ? (last - first) / first * 100 : null;
        return <button key={row.id} className="ck-multiple" onClick={() => ctx.dimension('greIds', [row.id])} title={`Filtrar ${row.name}`}>
          <span><b>{greShort(row.name)}</b><em className={delta === null ? '' : delta >= 0 ? 'ck-pos' : 'ck-neg'}>{delta === null ? '—' : `${delta >= 0 ? '+' : ''}${fmt.pct(delta, 0)}`}</em></span>
          <Sparkline values={row.spark} color={last >= first ? theme.good : theme.bad} height={40} max={shared ? maxSpark : undefined} min={shared ? minSpark : undefined} />
          <small>{fmt.int(last)} empresas</small>
        </button>;
      })}</div>
    </Tile>
  </div>;
}
