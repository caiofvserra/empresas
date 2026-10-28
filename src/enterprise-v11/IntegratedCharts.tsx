import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { CircleHelp, Info, Maximize2, Minimize2 } from 'lucide-react';
import EnterpriseDialog from '../enterprise-v10/EnterpriseDialog';
import Chart from '../components/Chart';
import type { EnterpriseModel, EnterpriseMonth, MetricId } from '../enterprise-v10/types';
import type { EnterpriseAnalysis } from '../enterprise-v13/analysis';

export interface IntegratedChartsProps {
  model: EnterpriseModel;
  analysis: EnterpriseAnalysis;
  financialAllowed: boolean;
  onCompanies: (ids: string[], label: string) => void;
  onDimension: (key: 'greIds' | 'cityIds' | 'cnaeCodes', ids: string[]) => void;
  onMetric: (id: MetricId) => void;
  focusMetric?: MetricId | null;
  expandedChart?: string | null;
  onExpand?: (id: string) => void;
}

const BLUE = '#246FB5', PRIMARY = '#082D74', GOLD = '#FABD07', LIGHT = '#639CE0', WHITE = '#FFFFFF', INK = '#1A202C', MUTED = '#3B4453', GRID = '#E2E8F0';
const n = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const short = (value: number) => value.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
const monthName = (value: string) => new Date(`${value}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' }).replace('.', '');
const gradient = (color: string, horizontal = false) => ({ type: 'linear', x: 0, y: 0, x2: horizontal ? 1 : 0, y2: horizontal ? 0 : 1, colorStops: [{ offset: 0, color: color === BLUE ? '#639CE0' : color === GOLD ? '#FFD148' : color }, { offset: 1, color }] });
const textStyle = { color: MUTED, fontSize: 11, fontFamily: 'Lato, system-ui, sans-serif' };
const gridLine = { lineStyle: { color: GRID, type: 'dashed' } };
const legend = { bottom: 0, type: 'scroll', pageIconColor: LIGHT, pageIconInactiveColor: '#A0AEC0', pageTextStyle: textStyle, itemWidth: 10, itemHeight: 6, textStyle };
const chartText = { color: MUTED, fontSize: 11, fontFamily: 'Lato, system-ui, sans-serif' };
type CountRow = { name: string; count: number; companyIds: string[] };
type Series = { name: string; type: 'bar' | 'line'; data: (number | null)[]; color: string; axis?: number; stack?: string };

function combo(labels: string[], series: Series[], units: [string, string]): Record<string, unknown> {
  return {
    textStyle: chartText, legend, grid: { top: 14, bottom: 26, left: 4, right: 5, containLabel: true },
    tooltip: { trigger: 'axis', formatter: (value: any) => { const items = Array.isArray(value) ? value : [value]; return `${esc(String(items[0]?.axisValueLabel ?? ''))}<br/>${items.map((item: any) => {
      const unit = units[series[item.seriesIndex]?.axis ?? 0];
      const number = item.value === null ? 'Sem base' : unit.includes('R$') ? money(Number(item.value)) : unit.includes('%') ? `${Number(item.value).toFixed(1)}%` : n(Number(item.value));
      return `${item.marker ?? ''}${esc(String(item.seriesName))}: ${number}`;
    }).join('<br/>')}`; } },
    xAxis: { type: 'category', data: labels, axisTick: { show: false }, axisLine: { lineStyle: { color: GRID } }, axisLabel: { ...textStyle, hideOverlap: true } },
    yAxis: units.map((unit, index) => ({ type: 'value', show: !!unit, name: unit, nameGap: 4, min: unit.includes('%') ? 0 : undefined, max: unit.includes('%') ? 100 : undefined, nameTextStyle: { ...textStyle, align: index ? 'right' : 'left' }, splitNumber: 2, axisLabel: { ...textStyle, formatter: short, hideOverlap: true }, splitLine: index ? { show: false } : gridLine })),
    series: series.map(row => ({ name: row.name, type: row.type, data: row.data, stack: row.stack, yAxisIndex: row.axis ?? 0, barMaxWidth: 18, symbol: 'circle', symbolSize: 4, showSymbol: row.type === 'line',
      itemStyle: { color: row.type === 'bar' ? gradient(row.color) : row.color, borderColor: row.type === 'line' ? PRIMARY : undefined, borderWidth: row.type === 'line' ? 1 : undefined, borderRadius: row.type === 'bar' ? [3, 3, 0, 0] : undefined },
      lineStyle: { color: row.color === GOLD ? PRIMARY : row.color, width: 2.4 }, emphasis: { focus: 'series', scale: 1.4 } })),
  };
}

function bars(rows: CountRow[], unit: string): Record<string, unknown> {
  return {
    textStyle: chartText,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0]?.dataIndex]; return row ? `${esc(row.name)}<br/>${esc(unit)}: ${unit.includes('R$') ? money(row.count) : n(row.count)}<br/>${n(row.companyIds.length)} empresas distintas no detalhamento` : ''; } },
    grid: { top: 4, bottom: 4, left: 2, right: 38, containLabel: true },
    xAxis: { type: 'value', splitNumber: 3, axisLabel: { ...textStyle, formatter: short }, splitLine: gridLine },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => row.name), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { ...textStyle, width: 135, overflow: 'truncate' } },
    series: [{ type: 'bar', name: unit, barMaxWidth: 20, data: rows.map((row, index) => ({ value: row.count, itemStyle: { color: gradient(index === 0 ? BLUE : index === 1 ? LIGHT : PRIMARY, true), borderRadius: [0, 3, 3, 0] } })), label: { show: true, color: INK, position: 'right', fontSize: 11, formatter: (item: any) => short(item.value) }, emphasis: { focus: 'self' } }],
  };
}

function Toggle({ label, value, options, onChange }: { label: string; value: string; options: { id: string; label: string }[]; onChange: (value: string) => void }) {
  return <div className="v11-chart-tools" role="group" aria-label={label}>{options.map(option => <button key={option.id} type="button" aria-pressed={value === option.id} aria-label={`${label}: ${option.label}`} onClick={() => onChange(option.id)}>{option.label}</button>)}</div>;
}

function Panel({ id, title, subtitle, reading, source, metric, onMetric, controls, option, onPick, children, highlighted = false, expandedChart, onExpand }: {
  id: string; title: string; subtitle: string; reading: string; source: string; metric?: MetricId; onMetric: (id: MetricId) => void;
  controls: ReactNode; option?: Record<string, unknown>; onPick?: (event: any) => void; children?: ReactNode; highlighted?: boolean;
  expandedChart?: string | null; onExpand?: (id: string) => void;
}) {
  const [showReading, setShowReading] = useState(false);
  const series = Array.isArray(option?.series) ? option.series : [];
  const topology = series.some((row: any) => row.type === 'sankey') ? JSON.stringify(series.map((row: any) => ({ nodes: row.data?.map((item: any) => item.name), links: row.links?.map((item: any) => [item.source, item.target]) }))) : '';
  return <section className="v11-panel" data-chart={id} data-highlighted={highlighted || undefined} aria-label={title}>
    <header className="v11-panel-head"><div><h2>{title}</h2><p className="v11-panel-subtitle" title={subtitle}>{subtitle}</p></div><div className="v11-panel-actions">{metric && <button type="button" className="v11-chart-help" aria-label={`Definição: ${title}`} title="Definição do indicador" onClick={() => onMetric(metric)}><CircleHelp size={14} /></button>}{onExpand && <button type="button" className="v11-chart-expand" aria-label={`${expandedChart === id ? 'Restaurar' : 'Ampliar'} gráfico ${title}`} title={expandedChart === id ? 'Restaurar os seis gráficos' : 'Ampliar no mesmo canvas'} onClick={() => onExpand(id)}>{expandedChart === id ? <Minimize2 size={13} /> : <Maximize2 size={13} />}</button>}</div></header>
    {controls}
    <div className="v11-chart-body">{children ?? (option ? <Chart key={`${id}:${topology}`} option={option} onPick={onPick} ariaLabel={`${title}. ${subtitle}`} /> : null)}</div>
    <footer className="v11-chart-source"><span>{reading}</span><button type="button" className="v13-reading-help" aria-label={`Como ler o gráfico ${title}`} title="Como ler, fontes e limites" onClick={() => setShowReading(true)}><Info size={14} /></button></footer>
    {showReading && <EnterpriseDialog title={`Como ler: ${title}`} subtitle="Leitura, universo, origem e cuidados" onClose={() => setShowReading(false)}><div className="e10-source-list"><article className="e10-source-card"><h3>O que o gráfico mostra</h3><p>{reading}</p><p>{subtitle}</p><p>Selecione um ponto, uma barra ou uma célula para investigar os registros correspondentes. O recorte é compartilhado com os demais indicadores.</p></article><article className="e10-source-card"><h3>Origem e cuidados</h3><p>{source}</p><p>Valores fictícios e reproduzíveis nesta demonstração. Ausência de correspondência ou documento na fonte não comprova irregularidade. Consulte a definição do indicador para fórmula e denominador.</p>{metric && <button type="button" className="e10-secondary" onClick={() => { setShowReading(false); onMetric(metric); }}>Ver definição do indicador</button>}</article></div></EnterpriseDialog>}
  </section>;
}

function State({ children }: { children: ReactNode }) { return <div className="v11-chart-state" role="status">{children}</div>; }

function MunicipalMap({ rows, onCity }: { rows: EnterpriseModel['cityRows']; onCity: (id: string) => void }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => { let mounted = true; Promise.all([import('../services/echarts'), import('../domain/sp-municipios.json')]).then(([echarts, geometry]) => { echarts.registerMap('enterpriseSpV11', geometry.default as Parameters<typeof echarts.registerMap>[1]); if (mounted) setStatus('ready'); }).catch(() => { if (mounted) setStatus('error'); }); return () => { mounted = false; }; }, []);
  if (status !== 'ready') return <State>{status === 'error' ? 'Malha indisponível. Selecione GRE para explorar a cobertura.' : 'Preparando a malha de São Paulo…'}</State>;
  const observations = rows.filter(row => row.eligible > 0);
  const option = {
    textStyle: chartText,
    tooltip: { formatter: (item: any) => { const row = observations.find(city => city.name === item.name); return row ? `${esc(row.name)}<br/>CNPJs elegíveis: ${n(row.eligible)}<br/>Sem registro CREA vigente: ${n(row.eligible - row.matched)}<br/>Cobertura no CREA: ${row.coverage === null ? 'Sem denominador' : `${row.coverage.toFixed(1)}%`}` : `${esc(String(item.name))}<br/>Sem observação nesta amostra`; } },
    visualMap: { min: 0, max: Math.max(1, ...observations.map(row => row.eligible - row.matched)), calculable: false, left: 8, bottom: 0, orient: 'horizontal', itemWidth: 7, itemHeight: 76, text: ['Mais CNPJs', '0'], textStyle, inRange: { color: ['#D4EDFF', '#639CE0', BLUE, PRIMARY] } },
    series: [{ type: 'map', map: 'enterpriseSpV11', name: 'CNPJs sem registro CREA vigente', roam: false, selectedMode: false, layoutCenter: ['54%', '43%'], layoutSize: '91%',
      itemStyle: { areaColor: '#E2E8F0', borderColor: '#A0AEC0', borderWidth: .4 }, emphasis: { itemStyle: { areaColor: GOLD }, label: { show: true, color: INK, fontSize: 11 } },
      data: observations.map(row => ({ name: row.name, value: row.eligible - row.matched, id: row.id })),
    }],
  };
  return <Chart option={option} ariaLabel="Mapa de São Paulo: CNPJs elegíveis sem registro vigente identificado. Cinza é ausência de observação, não zero." onPick={item => { const row = observations.find(city => city.name === item.name); if (row) onCity(row.id); }} />;
}

export default function IntegratedCharts({ model, analysis, financialAllowed, onCompanies, onDimension, onMetric, focusMetric, expandedChart, onExpand }: IntegratedChartsProps) {
  const [trajectory, setTrajectory] = useState('base');
  const [territory, setTerritory] = useState('regions');
  const [technical, setTechnical] = useState('matrix');
  const [digital, setDigital] = useState('demand');
  const [finance, setFinance] = useState('cash');
  const [economy, setEconomy] = useState('employment');
  useEffect(() => {
    if (focusMetric === 'corporateActivity') setTrajectory('art');
    if (focusMetric === 'base') setTrajectory('base');
    if (focusMetric === 'rtContinuity') setTechnical('continuity');
    if (focusMetric === 'rtCoverage') setTechnical('matrix');
    if (focusMetric === 'supplierCoverage') setDigital('suppliers');
    if (focusMetric === 'contractTrace') setDigital('trace');
    if (focusMetric === 'publicDemand') setDigital('demand');
    if (focusMetric === 'overdue') setFinance('debt');
    if (focusMetric === 'receipts' || focusMetric === 'recovery') setFinance('cash');
    if (focusMetric === 'observedEntry') setEconomy('cohort');
    if (focusMetric === 'economicContext') setEconomy('employment');
  }, [focusMetric]);
  const months = model.monthly.map(row => monthName(row.month));
  const pickRows = (rows: CountRow[], label: string) => (event: any) => { const row = rows[event.dataIndex]; if (row) onCompanies(row.companyIds, `${label} · ${row.name}`); };
  const pickMonth = (keys: (keyof EnterpriseMonth)[], label: string) => (event: any) => { const row = model.monthly[event.dataIndex], key = keys[event.seriesIndex]; if (row && key && Array.isArray(row[key])) onCompanies(row[key] as string[], `${label} · ${monthName(row.month)}`); };
  const trajectoryOption = trajectory === 'base' ? combo(months, [
    { name: 'Entradas CREA', type: 'bar', data: model.monthly.map(row => row.entered), color: BLUE },
    { name: 'Saídas CREA', type: 'bar', data: model.monthly.map(row => -row.exited), color: '#639CE0' },
    { name: 'Empresas CREA', type: 'line', data: model.monthly.map(row => row.base), color: GOLD, axis: 1 },
  ], ['Entradas / saídas', 'Empresas CREA']) : combo(months, [
    { name: 'ARTs empresariais', type: 'bar', data: model.monthly.map(row => row.arts), color: BLUE },
    { name: 'Empresas com ART', type: 'line', data: model.monthly.map(row => row.artCompanies), color: GOLD, axis: 1 },
  ], ['ARTs', 'Empresas']);

  const regions = [...model.regions].filter(row => row.eligible > 0).sort((a, b) => b.eligible - a.eligible).slice(0, 7);
  const territoryOption = combo(regions.map(row => row.name.replace(/\s*·.*/, '')), [
    { name: 'CREA vigente', type: 'bar', data: regions.map(row => row.matched), color: BLUE, stack: 'coverage' },
    { name: 'Sem CREA vigente', type: 'bar', data: regions.map(row => row.withoutMatch), color: '#639CE0', stack: 'coverage' },
    { name: 'Cobertura CREA %', type: 'line', data: regions.map(row => row.coverage), color: GOLD, axis: 1 },
  ], ['CNPJs', '%']);
  const sectors = [...model.sectors].sort((a, b) => b.withoutMatch - a.withoutMatch || a.code.localeCompare(b.code)).slice(0, 6).map(row => ({ name: row.code, count: row.withoutMatch, companyIds: row.withoutMatchIds }));

  // Model order: RT+ART, RT without ART, ART without RT, neither.
  // x = ART observation; inverse y = current RT, keeping cohort clicks exact.
  const partitionMax = Math.max(1, ...model.technicalPartition.map(row => row.count));
  const matrixPoints = model.technicalPartition.map((row, index) => ({ value: [index % 2, index < 2 ? 0 : 1, row.count], rowIndex: index, label: { color: row.count > partitionMax * .65 ? WHITE : INK } }));
  const matrix: Record<string, unknown> = {
    textStyle: chartText, grid: { top: 5, right: 3, bottom: 3, left: 3, containLabel: true },
    tooltip: { formatter: (item: any) => { const row = model.technicalPartition[item.data.rowIndex]; return `${esc(row.name)}<br/>${n(row.count)} empresas vigentes<br/>RT vigente no CREA-SP; ART observada no período`; } },
    xAxis: { type: 'category', data: ['ART observada', 'Sem ART observada'], axisLabel: textStyle, axisTick: { show: false }, axisLine: { show: false }, splitArea: { show: false } },
    yAxis: { type: 'category', inverse: true, data: ['Com RT no CREA', 'RT não identificado'], axisLabel: { ...textStyle, width: 90, overflow: 'break' }, axisTick: { show: false }, axisLine: { show: false } },
    visualMap: { show: false, min: 0, max: Math.max(1, ...model.technicalPartition.map(row => row.count)), inRange: { color: ['#D4EDFF', '#639CE0', PRIMARY] } },
    series: [{ type: 'heatmap', data: matrixPoints, label: { show: true, color: INK, fontSize: 21, fontWeight: 700, formatter: (item: any) => n(item.value[2]) }, itemStyle: { borderColor: '#FFFFFF', borderWidth: 5, borderRadius: 4 }, emphasis: { itemStyle: { borderColor: GOLD, borderWidth: 2 } } }],
  };

  const categories = model.contractCategories;
  const demand: Record<string, unknown> = { textStyle: chartText, tooltip: { formatter: (item: any) => `${esc(String(item.name))}<br/>Valor publicado: ${money(Number(item.value))}<br/>Não equivale a execução ou a receita do CREA.` },
    series: [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, left: 0, right: 0, top: 0, bottom: 0, color: [PRIMARY, '#163E8C', '#246FB5', '#01224D', '#082D74'],
      data: categories.map((row, index) => ({ name: row.name, value: row.value, rowIndex: index })), label: { color: WHITE, fontSize: 11, lineHeight: 16, formatter: (item: any) => `${item.name}\nR$ ${short(Number(item.value))}` }, itemStyle: { borderColor: '#FFFFFF', borderWidth: 2, gapWidth: 2 }, emphasis: { itemStyle: { borderColor: GOLD } } }],
  };

  const cash = combo(months, [
    { name: 'Demais recebimentos PJ', type: 'bar', data: model.monthly.map(row => row.receipts - row.recovered), color: BLUE, stack: 'cash' },
    { name: 'Recuperação da carteira inicial', type: 'bar', data: model.monthly.map(row => row.recovered), color: GOLD, stack: 'cash' },
  ], ['R$ recebidos', '']);
  const debt = model.debtBuckets.map(row => ({ name: row.name, count: row.value, companyIds: row.companyIds }));
  const recovery: CountRow[] = [
    { name: 'Saldo na abertura', count: model.recoveryCohort.openingBalance, companyIds: model.recoveryCohort.companyIds },
    { name: 'Recuperado na janela', count: model.recoveryCohort.recovered, companyIds: model.recoveryCohort.recoveredIds },
    { name: 'Remanescente', count: model.recoveryCohort.remaining, companyIds: model.recoveryCohort.remainingIds },
  ];

  const economyRegions = model.regions.filter(row => row.companyGrowth !== null && row.jobGrowth !== null);
  const economyOption: Record<string, unknown> = {
    textStyle: chartText, tooltip: { formatter: (item: any) => `${esc(item.data.name)}<br/>Emprego agregado: ${item.value[0].toFixed(1)}%<br/>Empresas com registro CREA: ${item.value[1].toFixed(1)}%<br/>Estoque de empregos: ${n(item.value[2])}` },
    grid: { top: 14, bottom: 26, left: 2, right: 9, containLabel: true },
    xAxis: { type: 'value', name: 'Emprego · variação %', nameLocation: 'middle', nameGap: 23, nameTextStyle: textStyle, min: (range: { min: number }) => Math.min(0, Math.floor(range.min / 5) * 5), max: (range: { max: number }) => Math.max(5, Math.ceil(range.max / 5) * 5), splitNumber: 2, axisLabel: { ...textStyle, hideOverlap: true, formatter: (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }, axisLine: { onZero: true, lineStyle: { color: '#A0AEC0' } }, splitLine: gridLine },
    yAxis: { type: 'value', name: 'Empresas CREA · variação %', nameGap: 7, nameTextStyle: { ...textStyle, align: 'left' }, min: (range: { min: number }) => Math.min(0, Math.floor(range.min / 5) * 5), max: (range: { max: number }) => Math.max(5, Math.ceil(range.max / 5) * 5), splitNumber: 2, axisLabel: { ...textStyle, hideOverlap: true, formatter: (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }, axisLine: { onZero: true, lineStyle: { color: '#A0AEC0' } }, splitLine: gridLine },
    series: [{ type: 'scatter', data: economyRegions.map(row => ({ name: row.name, id: row.id, value: [row.jobGrowth, row.companyGrowth, row.jobStock] })), symbolSize: (value: number[]) => Math.max(9, Math.min(27, Math.sqrt(value[2]) / 9)), itemStyle: { color: BLUE, opacity: .9, borderColor: PRIMARY, borderWidth: 1 }, emphasis: { itemStyle: { color: GOLD }, label: { show: true, color: INK, formatter: '{b}', position: 'top', fontSize: 11 } } }],
  };
  const branches = model.cohortRows.slice(1).map((row, index) => ({ ...row, rowIndex: index + 1 })).filter(row => row.count > 0);
  const cohort: Record<string, unknown> = {
    textStyle: chartText, tooltip: { formatter: (item: any) => { const row = model.cohortRows[item.data?.rowIndex ?? item.data?.targetIndex]; return row ? `${esc(row.name)}<br/>${n(row.count)} CNPJs<br/>${n(row.companyIds.length)} empresas distintas<br/>Sem atribuição causal à administração.` : ''; } },
    series: [{ type: 'sankey', animation: false, layoutIterations: 0, nodeAlign: 'justify', left: 6, right: 111, top: 8, bottom: 8, nodeWidth: 9, nodeGap: 22, draggable: false,
      data: model.cohortRows[0] ? [{ name: model.cohortRows[0].name, rowIndex: 0, itemStyle: { color: '#639CE0' } }, ...branches.map(row => ({ name: row.name, rowIndex: row.rowIndex, itemStyle: { color: row.rowIndex === 1 ? GOLD : BLUE } }))] : [],
      links: branches.map(row => ({ source: model.cohortRows[0].name, target: row.name, value: row.count, targetIndex: row.rowIndex })),
      label: { color: INK, fontSize: 11, distance: 5, position: 'right', formatter: (item: any) => { const row = model.cohortRows[item.data?.rowIndex]; return row ? `${item.data.rowIndex === 0 ? 'Observados' : item.data.rowIndex === 1 ? 'Ingresso posterior' : 'Sem ingresso'}\n${n(row.count)} CNPJs` : ''; } },
      itemStyle: { borderWidth: 0 }, lineStyle: { color: 'gradient', opacity: .32 }, emphasis: { focus: 'adjacency', lineStyle: { opacity: .65 } },
    }],
  };
  const caoMonths = analysis.acervo.monthly.map(row => monthName(row.month));
  const caoOption = combo(caoMonths, [
    { name: 'CAOs emitidas', type: 'bar', data: analysis.acervo.monthly.map(row => row.caos), color: BLUE },
    { name: 'Empresas com CAO', type: 'line', data: analysis.acervo.monthly.map(row => row.caoCompanies), color: GOLD, axis: 1 },
  ], ['Emissões de CAO', 'Empresas']);
  const caoPick = (event: any) => { const row = analysis.acervo.monthly[event.dataIndex]; if (row) onCompanies(row.caoCompanyIds, `Empresas com CAO emitida · ${monthName(row.month)}`); };
  const panelActions = { expandedChart, onExpand };
  const trajectorySource = trajectory === 'universe'
    ? `Registros/vistos CREA-SP e universo externo selecionado. ${n(analysis.universe.companies)} empresas-raiz, ${n(analysis.universe.establishments)} estabelecimentos e ${n(analysis.universe.registrations)} registros são unidades distintas; não somar. As barras particionam as empresas-raiz conforme seu histórico CREA no corte.`
    : trajectory === 'base'
      ? 'Histórico de registros e vistos empresariais CREA-SP. Entradas e saídas são transições de empresas-raiz, sem duplicar registros simultâneos. Estoque inicial + entradas − saídas = estoque final.'
      : 'ARTs e vínculo empresarial explícito no CREA-SP. Barras contam documentos; a linha conta empresas distintas em cada mês. Não somar os distintos mensais para obter o distinto do período.';
  const territorySource = territory === 'receipt'
    ? 'Receita Federal × registros CREA-SP. O universo inclui todos os estabelecimentos com registro exato vigente no CREA no corte, inclusive CNPJ não ativo na fotografia disponível da Receita. A situação da Receita não é regularidade tributária nem conclusão automática de irregularidade perante o CREA.'
    : territory === 'map'
      ? 'Receita Federal/CNPJ × registros CREA-SP, por CNPJ completo. Universo externo ativo na Receita e CNAEs selecionados. Cinza é município sem observação; não representa zero. A atribuição dos municípios às GREs é demonstrativa.'
      : territory === 'regions'
        ? 'Receita Federal/CNPJ × registros CREA-SP. Sete maiores universos regionais de CNPJs ativos na Receita com CNAEs selecionados; a linha é a proporção com registro exato vigente no CREA. CNAE selecionado não comprova obrigação de registro.'
        : 'Receita Federal/CNPJ e classificação CNAE fornecida. Ranking de CNPJs externos elegíveis sem registro CREA vigente, considerando CNAE principal e secundário. Um CNPJ pode constar em várias barras: não somar grupos.';
  const technicalSource = technical === 'cao'
    ? `CAO vinculada à pessoa jurídica e às ARTs declaradas no CREA-SP. Emissões são contadas por data de emissão, com vínculo documental válido, independentemente da situação atual. ${n(analysis.acervo.caos)} CAOs emitidas na janela; ${n(analysis.acervo.revokedCaos)} estão revogadas na fotografia atual e continuam no histórico de emissão. CAO empresarial não é CAT profissional.`
    : technical === 'matrix'
      ? 'Registros/vistos empresariais, vínculos RT e ARTs no CREA-SP. A matriz particiona as empresas com registro vigente no corte: RT vigente no corte × ART observada na janela. É um universo diferente da taxa de atividade ART, que inclui empresas com algum dia de vigência no período.'
      : 'Histórico de registros e vínculos RT no CREA-SP. Barras contam empresas com registro na janela conforme a existência de intervalos sem RT identificado. A taxa de continuidade é calculada em dias-empresa; vínculos sobrepostos não duplicam dias. Lacuna na fonte não comprova ausência real de RT.';

  return <div className="v11-charts" data-focused={expandedChart ?? ''}>
    <Panel {...panelActions} id="trajectory" title="Registros no CREA-SP"
      subtitle={trajectory === 'base' ? 'Entradas, saídas e empresas com registro vigente' : trajectory === 'universe' ? 'Empresas distintas conforme o histórico no CREA-SP' : 'ARTs e empresas com ART no CREA-SP, por mês'}
      reading={trajectory === 'base' ? 'Barras: entradas e saídas. Linha: empresas com registro CREA vigente.' : trajectory === 'universe' ? 'Cada empresa aparece uma única vez, conforme seu histórico no CREA-SP.' : 'Barras: ARTs emitidas. Linha: empresas distintas com ART no mês.'}
      source={trajectorySource} metric={trajectory === 'art' ? 'corporateActivity' : 'base'} onMetric={onMetric}
      highlighted={focusMetric === 'base' || focusMetric === 'corporateActivity'}
      controls={<Toggle label="Evolução" value={trajectory} options={[{ id: 'base', label: 'Registros' }, { id: 'art', label: 'ART' }, { id: 'universe', label: 'Universo' }]} onChange={setTrajectory} />}
      option={trajectory === 'universe' ? bars(analysis.universe.companyRows, 'Empresas distintas') : trajectoryOption}
      onPick={trajectory === 'universe' ? pickRows(analysis.universe.companyRows, 'Histórico no CREA-SP') : trajectory === 'base' ? pickMonth(['enteredIds', 'exitedIds', 'activeIds'], 'Registros CREA-SP') : pickMonth(['artCompanyIds', 'artCompanyIds'], 'ART empresarial')} />
    <Panel {...panelActions} id="territory" title="Receita × cadastro CREA-SP"
      subtitle={territory === 'map' ? 'CNPJs ativos na Receita, sem registro CREA vigente' : territory === 'regions' ? 'CNPJs ativos na Receita e cobertura no CREA-SP' : territory === 'receipt' ? 'Situação na Receita dos CNPJs com CREA vigente' : 'CNPJs sem registro CREA vigente, por CNAE'}
      reading={territory === 'map' ? 'Azul mais escuro: mais CNPJs sem registro CREA vigente. Cinza: sem dado.' : territory === 'regions' ? 'Barras: CNPJs com e sem CREA vigente. Linha: cobertura no CREA-SP.' : territory === 'receipt' ? 'As barras mostram a situação na Receita de CNPJs com registro CREA vigente.' : 'CNPJs com vários CNAEs podem aparecer em mais de uma barra.'}
      source={territorySource} metric="coverage" onMetric={onMetric} highlighted={focusMetric === 'coverage' || focusMetric === 'newMarket'}
      controls={<Toggle label="Território" value={territory} options={[{ id: 'regions', label: 'GRE' }, { id: 'map', label: 'Mapa' }, { id: 'sectors', label: 'CNAE' }, { id: 'receipt', label: 'Receita' }]} onChange={setTerritory} />}
      option={territory === 'regions' ? territoryOption : territory === 'receipt' ? bars(analysis.registryComparison, 'CNPJs com CREA vigente') : bars(sectors, 'CNPJs')}
      onPick={territory === 'regions' ? (event => { const row = regions[event.dataIndex]; if (row) onDimension('greIds', [row.id]); }) : territory === 'receipt' ? pickRows(analysis.registryComparison, 'Situação Receita de CNPJs com CREA vigente') : pickRows(sectors, 'CNAEs sem registro CREA vigente')}>
      {territory === 'map' ? <MunicipalMap rows={model.cityRows} onCity={id => onDimension('cityIds', [id])} /> : undefined}
    </Panel>
    <Panel {...panelActions} id="technical" title="RT, ART e acervo empresarial"
      subtitle={technical === 'matrix' ? 'Empresas com CREA vigente: RT atual × ART no período' : technical === 'cao' ? 'Emissões de CAO e empresas certificadas, por mês' : 'Empresas conforme intervalos sem RT no CREA-SP'}
      reading={technical === 'matrix' ? 'Cada célula conta empresas com a combinação de RT e ART indicada.' : technical === 'cao' ? 'Barras: CAOs emitidas. Linha: empresas distintas com emissão no mês.' : 'Barras: empresas agrupadas pela continuidade de RT identificada no CREA.'}
      source={technicalSource} metric={technical === 'cao' ? undefined : technical === 'matrix' ? 'rtCoverage' : 'rtContinuity'} onMetric={onMetric}
      highlighted={focusMetric === 'rtCoverage' || focusMetric === 'rtContinuity'}
      controls={<Toggle label="Vínculo técnico" value={technical} options={[{ id: 'matrix', label: 'RT × ART' }, { id: 'continuity', label: 'Continuidade' }, { id: 'cao', label: 'CAO' }]} onChange={setTechnical} />}
      option={technical === 'matrix' ? matrix : technical === 'cao' ? caoOption : bars(model.gapBuckets, 'Empresas')}
      onPick={technical === 'matrix' ? (event => { const row = model.technicalPartition[event.data?.rowIndex]; if (row) onCompanies(row.companyIds, row.name); }) : technical === 'cao' ? caoPick : pickRows(model.gapBuckets, 'Continuidade de RT')} />
    <Panel {...panelActions} id="digital" title="PNCP × registros CREA-SP"
      subtitle={digital === 'demand' ? 'Valor dos contratos técnicos publicados no PNCP' : digital === 'suppliers' ? 'Registro CREA na última publicação de cada fornecedor' : 'Contratos do PNCP com vínculo documental a ART'}
      reading={digital === 'demand' ? 'Área de cada bloco: valor publicado por categoria de contratação.' : digital === 'suppliers' ? 'Barras: fornecedores com e sem registro CREA na publicação analisada.' : 'Barras: contratos com e sem vínculo documental confirmado a ART.'}
      source={digital === 'trace' ? 'PNCP × ART do CREA-SP, com ponte documental explícita por contrato. Sem ponte informada não equivale a ausência de ART. O denominador considera todos os contratos técnicos selecionados.' : digital === 'suppliers' ? 'Fornecedor do PNCP identificado por CNPJ completo. A vigência do registro CREA é verificada na última publicação técnica selecionada de cada fornecedor. Publicação não comprova execução, obrigação de registro ou infração.' : 'PNCP/API e classificação textual por regras demonstrativas. Valor publicado não representa execução, pagamento ou receita do CREA. O território do fornecedor não prova o local da obra.'}
      metric={digital === 'demand' ? 'publicDemand' : digital === 'suppliers' ? 'supplierCoverage' : 'contractTrace'} onMetric={onMetric}
      highlighted={['publicDemand', 'supplierCoverage', 'contractTrace', 'convergentEvidence'].includes(focusMetric ?? '')}
      controls={<Toggle label="Contratações" value={digital} options={[{ id: 'demand', label: 'Demanda' }, { id: 'suppliers', label: 'Fornecedores' }, { id: 'trace', label: 'Vínculo ART' }]} onChange={setDigital} />}
      option={digital === 'demand' ? demand : bars(digital === 'suppliers' ? model.matchingRows : model.traceRows, digital === 'suppliers' ? 'CNPJs fornecedores' : 'Contratos')}
      onPick={digital === 'demand' ? (event => { const row = categories[event.data?.rowIndex]; if (row) onCompanies(row.companyIds, `Demanda técnica PNCP · ${row.name}`); }) : pickRows(digital === 'suppliers' ? model.matchingRows : model.traceRows, 'Contratos técnicos PNCP')} />
    <Panel {...panelActions} id="finance" title="Financeiro PJ no CREA-SP"
      subtitle={finance === 'cash' ? 'Pagamentos efetivos de empresas ao CREA-SP' : finance === 'debt' ? 'Dívida vencida ao CREA-SP, por faixa de atraso' : 'Dívida vencida inicial: recebimento e saldo restante'}
      reading={finance === 'cash' ? 'As parcelas somam o recebido: a recuperação já está incluída no total.' : finance === 'debt' ? 'Cada barra soma o saldo vencido dos títulos daquela faixa de atraso.' : 'A carteira é fixa: dívida inicial, valor recuperado e saldo restante.'}
      source="Financeiro empresarial do CREA-SP: títulos, pagamentos e datas efetivas. Recebimento é fluxo na janela; dívida é saldo no corte. Recuperação usa a mesma carteira vencida na abertura e integra os recebimentos, sem dupla contagem. O perfil controla a apresentação dos valores."
      metric={finance === 'cash' ? 'receipts' : finance === 'debt' ? 'overdue' : 'recovery'} onMetric={onMetric}
      highlighted={['compliance', 'receipts', 'overdue', 'recovery'].includes(focusMetric ?? '')}
      controls={<Toggle label="Financeiro" value={finance} options={[{ id: 'cash', label: 'Recebido' }, { id: 'debt', label: 'Atraso' }, { id: 'recovery', label: 'Recuperação' }]} onChange={setFinance} />}
      option={financialAllowed ? finance === 'cash' ? cash : bars(finance === 'debt' ? debt : recovery, 'R$') : undefined}
      onPick={financialAllowed ? finance === 'cash' ? pickMonth(['otherReceiptCompanyIds', 'recoveredCompanyIds'], 'Recebimentos PJ ao CREA') : pickRows(finance === 'debt' ? debt : recovery, 'Carteira financeira PJ no CREA') : undefined}>
      {!financialAllowed ? <State><strong>Informação financeira restrita</strong><span>Disponível ao perfil Administração nesta demonstração.</span></State> : undefined}
    </Panel>
    <Panel {...panelActions} id="economy" title="Mercado × presença no CREA-SP"
      subtitle={economy === 'employment' ? 'Variação do emprego formal e de empresas com CREA' : 'CNPJs externos observados antes da janela analisada'}
      reading={economy === 'employment' ? 'Cada bolha é uma GRE; o tamanho indica o estoque agregado de empregos.' : 'CNPJs observados se dividem entre ingresso posterior no CREA e sem ingresso.'}
      source={economy === 'employment' ? 'RAIS/Novo CAGED agregados por território, CNAE e competência × histórico empresarial CREA-SP. Os dois eixos comparam variações nas mesmas competências; emprego é contexto regional, sem vínculo individual com CNPJ ou atribuição causal ao CREA.' : 'Fotografia externa anterior à janela e primeiro registro exato no CREA-SP. Os dois desfechos são paralelos da mesma coorte de CNPJs. Ingresso posterior pode não estar vigente no corte e não comprova resultado causado pela gestão.'}
      metric={economy === 'employment' ? 'economicContext' : 'observedEntry'} onMetric={onMetric}
      highlighted={focusMetric === 'economicContext' || focusMetric === 'observedEntry'}
      controls={<Toggle label="Mercado" value={economy} options={[{ id: 'employment', label: 'Emprego' }, { id: 'cohort', label: 'Ingresso CREA' }]} onChange={setEconomy} />}
      option={economy === 'employment' ? economyOption : cohort}
      onPick={economy === 'employment' ? (event => { if (event.data?.id) onDimension('greIds', [event.data.id]); }) : (event => { const row = model.cohortRows[event.data?.rowIndex ?? event.data?.targetIndex]; if (row) onCompanies(row.companyIds, `Coorte externa → CREA-SP · ${row.name}`); })}>
      {economy === 'employment' && (!model.metadata.employmentComparable || !economyRegions.length) ? <State><strong>Universos não comparáveis neste recorte</strong><span>Emprego permanece agregado. Use território e CNAE para comparar.</span></State> : economy === 'cohort' && !model.cohortRows[0]?.count ? <State>Sem CNPJs na coorte observada neste recorte.</State> : undefined}
    </Panel>
  </div>;
}
