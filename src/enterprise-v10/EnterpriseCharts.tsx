import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { CircleHelp } from 'lucide-react';
import Chart from '../components/Chart';
import type { EnterpriseModel, EnterpriseMonth, MetricId } from './types';

export type EnterprisePage = 'strategy' | 'presence' | 'technical' | 'intelligence' | 'resources';
export interface EnterpriseChartsProps {
  page: EnterprisePage;
  model: EnterpriseModel;
  financialAllowed: boolean;
  onCompanies: (ids: string[], label: string) => void;
  onDimension: (key: 'greIds' | 'cityIds' | 'cnaeCodes', ids: string[]) => void;
  onMetric: (id: MetricId) => void;
}

const NAVY = '#15265C', ROYAL = '#3662E2', GOLD = '#FFB001', LIGHT = '#A4B5DA', MUTED = '#6077B6';
const n = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const compact = (value: number) => value.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const money = (value: number) => `R$ ${compact(value)}`;
const fullMoney = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const escape = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
const monthLabel = (month: string) => new Date(`${month}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' }).replace('.', '');
const gradient = (color: string, horizontal = false) => ({ type: 'linear', x: 0, y: 0, x2: horizontal ? 1 : 0, y2: horizontal ? 0 : 1, colorStops: [{ offset: 0, color: color === ROYAL ? '#6686EC' : color === GOLD ? '#FFCD5E' : color }, { offset: 1, color }] });
const baseGrid = { top: 22, bottom: 33, left: 6, right: 10, containLabel: true };
const legend = { bottom: 0, type: 'scroll', itemWidth: 11, itemHeight: 7, textStyle: { color: '#334666', fontSize: 10 } };

type Series = { name: string; type: 'bar' | 'line'; data: (number | null)[]; color: string; axis?: number; stack?: string };
function combo(labels: string[], series: Series[], units: [string, string]): Record<string, unknown> {
  return { tooltip: { trigger: 'axis', formatter: (input: any) => {
      const params = Array.isArray(input) ? input : [input];
      return `${escape(String(params[0]?.axisValueLabel ?? params[0]?.name ?? ''))}<br/>${params.map((p: any) => {
        const row = series[p.seriesIndex], unit = units[row?.axis ?? 0];
        const value = p.value === null || !Number.isFinite(Number(p.value)) ? 'Sem base comparável' : unit.includes('R$') ? fullMoney(Number(p.value)) : unit.includes('%') ? `${Number(p.value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : n(Number(p.value));
        return `${p.marker ?? ''}${escape(String(p.seriesName))}: ${value}`;
      }).join('<br/>')}`;
    } }, legend, grid: baseGrid,
    xAxis: { type: 'category', data: labels, axisTick: { show: false }, axisLine: { lineStyle: { color: '#DCE4F3' } }, axisLabel: { fontSize: 10, hideOverlap: true } },
    yAxis: units.map((unit, index) => ({ type: 'value', show: unit !== '', name: unit, nameGap: 6, nameTextStyle: { fontSize: 10, color: '#526684', align: index ? 'right' : 'left' }, splitNumber: 3, axisLabel: { fontSize: 10, formatter: compact }, splitLine: { show: !index, lineStyle: { color: '#EDF1F9' } } })),
    series: series.map(row => ({ name: row.name, type: row.type, data: row.data, yAxisIndex: row.axis ?? 0, stack: row.stack, barMaxWidth: 22, symbol: 'circle', symbolSize: 5,
      itemStyle: { color: row.type === 'bar' ? gradient(row.color) : row.color, borderRadius: row.type === 'bar' ? [3, 3, 0, 0] : undefined, borderColor: row.color === GOLD ? NAVY : '#FFFFFF', borderWidth: row.color === GOLD ? 1 : .5 },
      lineStyle: { color: row.color === GOLD ? NAVY : row.color, width: 2.8 }, emphasis: { focus: 'series' } })),
  };
}

type CountRow = { name: string; count: number; companyIds: string[] };
function horizontal(rows: CountRow[], unit: string, color = ROYAL): Record<string, unknown> {
  return { tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (params: any[]) => { const row = rows[params[0]?.dataIndex]; return row ? `${escape(row.name)}<br/>${escape(unit)}: ${unit.includes('R$') ? fullMoney(row.count) : n(row.count)}<br/>Empresas distintas no detalhamento: ${n(row.companyIds.length)}` : ''; } }, grid: { top: 6, bottom: 7, left: 0, right: 38, containLabel: true },
    xAxis: { type: 'value', name: unit, nameLocation: 'end', nameTextStyle: { fontSize: 9, align: 'right' }, nameGap: 2, splitNumber: 3, axisLabel: { fontSize: 10, formatter: compact }, splitLine: { lineStyle: { color: '#EDF1F9' } } },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => row.name), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { fontSize: 10, width: 155, overflow: 'truncate' } },
    series: [{ type: 'bar', name: unit, data: rows.map(row => row.count), barMaxWidth: 20, itemStyle: { color: gradient(color, true), borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right', formatter: (p: any) => compact(p.value), fontSize: 10, color: NAVY }, emphasis: { focus: 'self' } }],
  };
}

function Panel({ id, step, title, subtitle, source, span, tone = 'light', metric, onMetric, option, onPick, children }: {
  id: string; step: string; title: string; subtitle: string; source: string; span: number; tone?: string;
  metric: MetricId; onMetric: (id: MetricId) => void; option?: Record<string, unknown>; onPick?: (event: any) => void; children?: ReactNode;
}) {
  const series = Array.isArray(option?.series) ? option.series : [];
  const topology = series.some((row: any) => row.type === 'sankey') ? JSON.stringify(series.map((row: any) => ({ nodes: row.data?.map((node: any) => node.name), links: row.links?.map((link: any) => [link.source, link.target]) }))) : '';
  return <section className="e10-panel" data-panel={id} data-span={span} data-tone={tone} aria-label={title}>
    <header className="e10-panel-head"><span className="e10-step">{step}</span><div><h2>{title}</h2><p title={subtitle}>{subtitle}</p></div><button className="e10-panel-help" aria-label={`Entender ${title}`} title="Conceito, decisão, fórmula e limites" onClick={() => onMetric(metric)}><CircleHelp size={14} /></button></header>
    <div className="e10-chart">{children ?? (option ? <Chart key={`${id}:${topology}`} option={option} ariaLabel={`${title}. ${subtitle}`} onPick={onPick} /> : null)}</div>
    <footer className="e10-source" title={source}>{source}</footer>
  </section>;
}

function MunicipalPresence({ rows, onCity }: { rows: EnterpriseModel['cityRows']; onCity: (id: string) => void }) {
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false);
  useEffect(() => { let current = true;
    Promise.all([import('../services/echarts'), import('../domain/sp-municipios.json')]).then(([echarts, geometry]) => { echarts.registerMap('enterpriseSp', geometry.default as Parameters<typeof echarts.registerMap>[1]); if (current) setReady(true); }).catch(() => { if (current) setFailed(true); });
    return () => { current = false; };
  }, []);
  const observations = rows.filter(row => row.eligible > 0);
  const option: Record<string, unknown> = {
    tooltip: { trigger: 'item', formatter: (p: any) => { const row = observations.find(city => city.name === p.name); return row ? `${escape(row.name)}<br/>CNPJs elegíveis: ${n(row.eligible)}<br/>Sem registro vigente identificado: ${n(row.eligible - row.matched)}<br/>Correspondência vigente: ${row.coverage === null ? 'Sem denominador' : `${row.coverage.toFixed(1)}%`}` : `${escape(p.name)}<br/>Sem observação nesta amostra.`; } },
    visualMap: { min: 0, max: Math.max(1, ...observations.map(row => row.eligible - row.matched)), calculable: false, left: 4, bottom: 0, orient: 'horizontal', itemWidth: 9, itemHeight: 95, text: ['Mais CNPJs', '0'], textStyle: { fontSize: 9, color: '#526684' }, inRange: { color: ['#EDF2FC', '#A4B5DA', '#6077B6', NAVY] } },
    series: [{ name: 'CNPJs sem vigência identificada', type: 'map', map: 'enterpriseSp', roam: false, selectedMode: false, layoutCenter: ['53%', '42%'], layoutSize: '88%',
      itemStyle: { areaColor: '#F1F3F7', borderColor: '#C8D2E6', borderWidth: .4 }, emphasis: { itemStyle: { areaColor: '#D0DDFA' }, label: { show: true, color: NAVY, fontSize: 10 } },
      data: observations.map(row => ({ name: row.name, value: row.eligible - row.matched, id: row.id })),
    }],
  };
  if (!ready) return <div className="e10-chart-state" role="status">{failed ? 'Malha indisponível. Use o filtro de municípios.' : 'Preparando a malha municipal de São Paulo…'}</div>;
  return <Chart option={option} ariaLabel="Mapa municipal paulista: CNPJs elegíveis sem registro vigente identificado. Cinza indica ausência de observação, não zero." onPick={p => { const row = observations.find(city => city.name === p.name); if (row) onCity(row.id); }} />;
}

export function visibleTechnicalRows(model: EnterpriseModel) {
  return [...model.rtRows].sort((a, b) => (b.withRt + b.withoutRt) - (a.withRt + a.withoutRt) || a.name.localeCompare(b.name)).slice(0, 8);
}

function LockedFinance() {
  return <div className="e10-chart-state"><strong>Informação financeira restrita.</strong><span>Disponível ao perfil Administração nesta demonstração.</span></div>;
}

export default function EnterpriseCharts({ page, model, financialAllowed, onCompanies, onDimension, onMetric }: EnterpriseChartsProps) {
  const months = model.monthly.map(row => monthLabel(row.month));
  const source = 'Cenário relacional demonstrativo · produção prevista: SQL Server/Db2 via gateway';
  const choose = (rows: CountRow[], label: string) => (event: any) => { const row = rows[event.dataIndex]; if (row) onCompanies(row.companyIds, `${label}: ${row.name}`); };
  const monthlyPick = (keys: (keyof EnterpriseMonth)[], label: string) => (event: any) => {
    const row = model.monthly[event.dataIndex], key = keys[event.seriesIndex];
    if (row && key && Array.isArray(row[key])) onCompanies(row[key] as string[], `${label} · ${monthLabel(row.month)}`);
  };
  const flow = combo(months, [
    { name: 'Entradas', type: 'bar', data: model.monthly.map(row => row.entered), color: ROYAL },
    { name: 'Saídas', type: 'bar', data: model.monthly.map(row => -row.exited), color: LIGHT },
    { name: 'Base vigente', type: 'line', data: model.monthly.map(row => row.base), color: NAVY, axis: 1 },
  ], ['Transições de empresas', 'Empresas vigentes']);

  if (page === 'strategy') {
    const regions = model.regions.filter(row => row.eligible > 0 && row.coverage !== null);
    const territory: Record<string, unknown> = { tooltip: { formatter: (p: any) => `${escape(p.data.name)}<br/>CNPJs elegíveis: ${n(p.value[0])}<br/>Registro vigente identificado: ${p.value[1].toFixed(1)}%<br/>Empresas vigentes: ${n(p.value[2])}` },
      grid: { top: 18, bottom: 30, left: 4, right: 15, containLabel: true },
      xAxis: { type: 'value', name: 'Universo externo · CNPJs', nameLocation: 'middle', nameGap: 24, nameTextStyle: { fontSize: 10 }, splitNumber: 4, axisLabel: { fontSize: 10, formatter: compact }, splitLine: { lineStyle: { color: '#EDF1F9' } } },
      yAxis: { type: 'value', name: 'Correspondência vigente %', nameGap: 6, min: 0, max: 100, splitNumber: 4, nameTextStyle: { fontSize: 10, align: 'left' }, axisLabel: { fontSize: 10, formatter: '{value}%' }, splitLine: { lineStyle: { color: '#EDF1F9' } } },
      series: [{ type: 'scatter', data: regions.map(row => ({ name: row.name, id: row.id, value: [row.eligible, row.coverage, row.base] })), symbolSize: (values: number[]) => Math.max(9, Math.min(34, Math.sqrt(values[2]) * 1.4)), itemStyle: { color: ROYAL, opacity: .82, borderColor: '#FFFFFF', borderWidth: 1.2 }, emphasis: { label: { show: true, formatter: '{b}', position: 'top', fontSize: 10, color: NAVY } } }],
    };
    const cash = financialAllowed ? combo(months, [
      { name: 'Recebido de empresas', type: 'bar', data: model.monthly.map(row => row.receipts), color: ROYAL },
      { name: 'Base vigente', type: 'line', data: model.monthly.map(row => row.base), color: GOLD, axis: 1 },
    ], ['R$ recebidos no mês', 'Empresas vigentes']) : undefined;
    return <div className="e10-panels" data-view={page}>
      <Panel id="e10-strategy-base" step="01" title="A presença empresarial cresce de forma sustentada?" subtitle="Transições de empresas-raiz e estoque vigente no fechamento mensal" source={`${source} · estoque anterior + entradas − saídas = estoque final`} span={7} tone="primary" metric="base" onMetric={onMetric} option={flow} onPick={monthlyPick(['enteredIds', 'exitedIds', 'activeIds'], 'Evolução da base')} />
      <Panel id="e10-strategy-territory" step="02" title="Onde o mercado encontra menor presença cadastral?" subtitle="Cada ponto é uma GRE · tamanho = empresas vigentes" source="RFB + cadastro demonstrativos · denominador: estabelecimentos elegíveis · CNAE não define obrigação" span={5} tone="blue" metric="coverage" onMetric={onMetric} option={territory} onPick={p => { if (p.data?.id) onDimension('greIds', [p.data.id]); }} />
      <Panel id="e10-strategy-activity" step="03" title="Presença formal também tem vínculo e atividade observada?" subtitle="Partição sem sobreposição das empresas vigentes no corte" source={`${source} · RT vigente e ART empresarial expressa · ausência de ART observada não prova inatividade`} span={4} metric="corporateActivity" onMetric={onMetric} option={horizontal(model.technicalPartition, 'Empresas')} onPick={choose(model.technicalPartition, 'Base técnica')} />
      <Panel id="e10-strategy-cash" step="04" title="Como o caixa empresarial evolui junto à base?" subtitle="Pagamentos efetivos de PJ e empresas vigentes · escalas próprias" source={`${source} · data de pagamento; não é receita total do CREA nem valor declarado em ART`} span={8} tone="warm" metric="receipts" onMetric={onMetric} option={cash} onPick={financialAllowed ? monthlyPick(['receiptCompanyIds', 'activeIds'], 'Caixa e base empresarial') : undefined}>{!financialAllowed ? <LockedFinance /> : undefined}</Panel>
    </div>;
  }

  if (page === 'presence') {
    const regions = [...model.regions].filter(row => row.eligible > 0).sort((a, b) => b.eligible - a.eligible);
    const coverage = combo(regions.map(row => row.name.replace(/^GRE\d+\s*·\s*/, '')), [
      { name: 'CNPJ vigente identificado', type: 'bar', data: regions.map(row => row.matched), color: ROYAL, stack: 'cnpj' },
      { name: 'Sem vigência identificada', type: 'bar', data: regions.map(row => row.withoutMatch), color: LIGHT, stack: 'cnpj' },
      { name: 'Correspondência %', type: 'line', data: regions.map(row => row.coverage), color: GOLD, axis: 1 },
    ], ['CNPJs elegíveis', '% de correspondência']);
    const sectors = [...model.sectors].sort((a, b) => b.withoutMatch - a.withoutMatch).slice(0, 8);
    const sectorRows = sectors.map(row => ({ name: row.code, count: row.withoutMatch, companyIds: row.withoutMatchIds }));
    const denominatorIds = model.metrics.retention.denominatorCompanyIds ?? [];
    const retainedIds = model.metrics.retention.companyIds;
    const retained = new Set(retainedIds);
    const retentionRows: CountRow[] = [
      { name: 'Coorte inicial elegível', count: denominatorIds.length, companyIds: denominatorIds },
      { name: 'Permanece vigente', count: retainedIds.length, companyIds: retainedIds },
      { name: 'Sem vigência no corte', count: denominatorIds.filter(id => !retained.has(id)).length, companyIds: denominatorIds.filter(id => !retained.has(id)) },
    ];
    return <div className="e10-panels" data-view={page}>
      <Panel id="e10-presence-regions" step="01" title="Em quais regiões há espaço para ampliar a presença?" subtitle="CNPJ completo · cadastro vigente e demais CNPJs do universo selecionado" source="RFB × registros demonstrativos · GRE por estabelecimento · sem somar empresas-raiz multifiliais" span={7} tone="primary" metric="coverage" onMetric={onMetric} option={coverage} onPick={p => { const row = regions[p.dataIndex]; if (row) onDimension('greIds', [row.id]); }} />
      <Panel id="e10-presence-sectors" step="02" title="Quais atividades concentram CNPJs sem vigência identificada?" subtitle="CNAEs principais e secundários · grupos não aditivos" source="RFB + classificação CNAE enviada · um CNPJ pode aparecer em mais de um grupo; não somar barras · CNAE não define obrigação" span={5} metric="coverage" onMetric={onMetric} option={horizontal(sectorRows, 'CNPJs', MUTED)} onPick={choose(sectorRows, 'CNPJs sem vigência identificada')} />
      <Panel id="e10-presence-map" step="03" title="Onde se distribui esse mercado no território paulista?" subtitle="Mapa dos CNPJs elegíveis sem registro vigente identificado" source="Malha IBGE: 645 municípios · valores demonstrativos na amostra · cinza = sem observação; GRE demonstrativa" span={5} tone="blue" metric="coverage" onMetric={onMetric}><MunicipalPresence rows={model.cityRows} onCity={id => onDimension('cityIds', [id])} /></Panel>
      <Panel id="e10-presence-retention" step="04" title="A relação permanece entre empresas economicamente ativas?" subtitle="Coorte vigente na abertura da janela e RFB ativa no corte atual" source={`${source} · condição de sobrevivência atual explícita; não reconstrói histórico RFB sem snapshots`} span={7} metric="retention" onMetric={onMetric} option={horizontal(retentionRows, 'Empresas')} onPick={choose(retentionRows, 'Retenção empresarial')} />
    </div>;
  }

  if (page === 'technical') {
    const rt = visibleTechnicalRows(model);
    const rtOption: Record<string, unknown> = { tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, legend, grid: { top: 6, left: 0, right: 12, bottom: 27, containLabel: true },
      xAxis: { type: 'value', splitNumber: 4, axisLabel: { fontSize: 10, formatter: compact }, splitLine: { lineStyle: { color: '#EDF1F9' } } },
      yAxis: { type: 'category', inverse: true, data: rt.map(row => row.name), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { fontSize: 10, width: 110, overflow: 'truncate' } },
      series: [
        { name: 'RT vigente', type: 'bar', stack: 'rt', data: rt.map(row => row.withRt), barMaxWidth: 17, itemStyle: { color: gradient(ROYAL, true) } },
        { name: 'Sem RT identificado', type: 'bar', stack: 'rt', data: rt.map(row => row.withoutRt), barMaxWidth: 17, itemStyle: { color: LIGHT } },
      ],
    };
    const production = combo(months, [
      { name: 'ARTs empresariais', type: 'bar', data: model.monthly.map(row => row.arts), color: ROYAL },
      { name: 'Empresas com ART', type: 'line', data: model.monthly.map(row => row.artCompanies), color: GOLD, axis: 1 },
    ], ['ARTs no mês', 'Empresas distintas']);
    return <div className="e10-panels" data-view={page}>
      <Panel id="e10-technical-rt" step="01" title="A base vigente mantém responsabilidade técnica identificada?" subtitle="Empresas-raiz ativas · maiores regiões · partição com/sem RT no corte" source={`${source} · vínculo expresso empresa–profissional e vigência; ausência identificada exige validar fonte`} span={7} tone="primary" metric="rtCoverage" onMetric={onMetric} option={rtOption} onPick={p => { const row = rt[p.dataIndex]; if (row) onCompanies(p.seriesIndex === 0 ? row.withRtIds : row.withoutRtIds, `${row.name}: ${p.seriesIndex === 0 ? 'RT vigente' : 'sem RT identificado'}`); }} />
      <Panel id="e10-technical-continuity" step="02" title="O vínculo técnico cobre os dias de registro na janela?" subtitle="Empresas com dias registrados · intervalos de vigência, sem sobreposição" source={`${source} · dias com registro × dias cobertos por RT; não mede capacidade legal nem infração`} span={5} metric="rtContinuity" onMetric={onMetric} option={horizontal(model.gapBuckets, 'Empresas', MUTED)} onPick={choose(model.gapBuckets, 'Continuidade de vínculo técnico')} />
      <Panel id="e10-technical-art" step="03" title="A produção formal envolve mais empresas?" subtitle="ARTs e empresas distintas por mês · uma empresa pode emitir várias ARTs" source={`${source} · vínculo empresarial expresso de ART; não equivale a emprego, faturamento ou obra concluída`} span={5} tone="blue" metric="corporateActivity" onMetric={onMetric} option={production} onPick={monthlyPick(['artCompanyIds', 'artCompanyIds'], 'Atividade ART empresarial')} />
      <Panel id="e10-technical-network" step="04" title="Como registro, RT e ART se combinam na mesma empresa?" subtitle="Quatro grupos sem sobreposição, todos dentro da base vigente no corte" source={`${source} · ART observada na janela × RT no corte; ausência de documento observado não prova inatividade`} span={7} metric="corporateActivity" onMetric={onMetric} option={horizontal(model.technicalPartition, 'Empresas')} onPick={choose(model.technicalPartition, 'Combinação de vínculos e atividade')} />
    </div>;
  }

  if (page === 'intelligence') {
    const categories = model.contractCategories;
    const treemap: Record<string, unknown> = { tooltip: { formatter: (p: any) => `${escape(p.name)}<br/>Valor publicado: ${fullMoney(p.value)}<br/>Valor contratual não é receita do CREA nem execução financeira.` },
      series: [{ type: 'treemap', nodeClick: false, roam: false, breadcrumb: { show: false }, left: 0, right: 0, top: 0, bottom: 0, color: [ROYAL, NAVY, '#254AAD', '#284477', '#0E1732'],
        data: categories.map((row, index) => ({ name: row.name, value: row.value, rowIndex: index })), label: { color: '#FFFFFF', fontSize: 11, fontWeight: 600, formatter: (p: any) => `${p.name}\n${money(p.value)}` }, itemStyle: { borderColor: '#FFFFFF', borderWidth: 3, gapWidth: 3 },
      }],
    };
    const economyRegions = model.regions.filter(row => row.companyGrowth !== null && row.jobGrowth !== null);
    const economy: Record<string, unknown> = { tooltip: { formatter: (p: any) => `${escape(p.data.name)}<br/>Emprego agregado: ${p.value[0].toFixed(1)}%<br/>Empresas vigentes: ${p.value[1].toFixed(1)}%<br/>Estoque de empregos: ${n(p.value[2])}` }, grid: { top: 20, bottom: 30, left: 3, right: 12, containLabel: true },
      xAxis: { type: 'value', name: 'Variação do emprego %', nameLocation: 'middle', nameGap: 23, nameTextStyle: { fontSize: 10 }, splitNumber: 4, axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { color: '#EDF1F9' } } },
      yAxis: { type: 'value', name: 'Variação da base empresarial %', nameGap: 6, nameTextStyle: { fontSize: 10, align: 'left' }, splitNumber: 4, axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { color: '#EDF1F9' } } },
      series: [{ type: 'scatter', data: economyRegions.map(row => ({ name: row.name, id: row.id, value: [row.jobGrowth, row.companyGrowth, row.jobStock] })), symbolSize: (value: number[]) => Math.max(9, Math.min(32, Math.sqrt(value[2]) / 8)), itemStyle: { color: ROYAL, borderColor: '#FFFFFF', borderWidth: 1, opacity: .85 }, emphasis: { label: { show: true, formatter: '{b}', position: 'top', fontSize: 10 } } }],
    };
    return <div className="e10-panels" data-view={page}>
      <Panel id="e10-intelligence-demand" step="01" title="Que demanda pública técnica movimenta o mercado empresarial?" subtitle="Objetos categorizados por regras demonstrativas; leitura por valor publicado" source="PNCP demonstrativo · contratos relacionados às empresas selecionadas; publicação não comprova execução ou irregularidade" span={7} tone="primary" metric="publicDemand" onMetric={onMetric} option={treemap} onPick={p => { const row = categories[p.data?.rowIndex]; if (row) onCompanies(row.companyIds, `Contratações técnicas: ${row.name}`); }} />
      <Panel id="e10-intelligence-suppliers" step="02" title="Os fornecedores tinham registro na publicação observada?" subtitle="CNPJs fornecedores únicos · última publicação de cada CNPJ na janela" source="PNCP × registro demonstrativos · correspondência exata e data; sede do fornecedor não é local da obra" span={5} metric="supplierCoverage" onMetric={onMetric} option={horizontal(model.matchingRows, 'CNPJs fornecedores', MUTED)} onPick={choose(model.matchingRows, 'Fornecedores técnicos')} />
      <Panel id="e10-intelligence-economy" step="03" title="A evolução da base acompanha o contexto econômico regional?" subtitle="Mesma GRE e competências · bolha = estoque agregado de empregos" source="CAGED/RAIS agregados + cadastro demonstrativos · contexto regional, sem vínculo trabalhador–empresa ou inferência causal" span={5} tone="blue" metric="economicContext" onMetric={onMetric} option={model.metadata.employmentComparable && economyRegions.length ? economy : undefined} onPick={p => { if (p.data?.id) onDimension('greIds', [p.data.id]); }}>{!model.metadata.employmentComparable || !economyRegions.length ? <div className="e10-chart-state"><strong>Universos não comparáveis neste recorte.</strong><span>Filtros nominais, porte ou situação não reduzem a base pública de emprego. Use território e CNAE para uma leitura compatível.</span></div> : undefined}</Panel>
      <Panel id="e10-intelligence-trace" step="04" title="Quanto da contratação tem rastreabilidade documental explícita?" subtitle="Contratos técnicos com ponte contrato–ART e aqueles sem ponte informada" source="Ponte documental demonstrativa explícita · sem ponte disponível não significa falta de ART; verificar execução e documentos" span={7} metric="contractTrace" onMetric={onMetric} option={horizontal(model.traceRows, 'Contratos', MUTED)} onPick={choose(model.traceRows, 'Rastreabilidade de contratos')} />
    </div>;
  }

  const receiptSeries = financialAllowed ? combo(months, [
    { name: 'Demais recebimentos', type: 'bar', data: model.monthly.map(row => row.receipts - row.recovered), color: ROYAL, stack: 'cash' },
    { name: 'Recuperado da coorte inicial', type: 'bar', data: model.monthly.map(row => row.recovered), color: GOLD, stack: 'cash' },
  ], ['R$ recebidos', '']) : undefined;
  const debtRows = financialAllowed ? model.debtBuckets.map(row => ({ name: row.name, count: row.value, companyIds: row.companyIds })) : [];
  const openingRows: CountRow[] = financialAllowed ? [
    { name: 'Saldo da coorte na abertura', count: model.recoveryCohort.openingBalance, companyIds: model.recoveryCohort.companyIds },
    { name: 'Recuperado nessa janela', count: model.recoveryCohort.recovered, companyIds: model.recoveryCohort.recoveredIds },
    { name: 'Permanece na coorte', count: model.recoveryCohort.remaining, companyIds: model.recoveryCohort.remainingIds },
  ] : [];
  // The two outcomes are parallel branches of one observed CNPJ cohort, not
  // sequential funnel stages. Preserve the exact documented denominator.
  const cohortBranches = model.cohortRows.slice(1).map((row, index) => ({ ...row, rowIndex: index + 1 })).filter(row => row.count > 0);
  const cohort: Record<string, unknown> = { tooltip: { trigger: 'item', formatter: (p: any) => {
      const index = p.data?.rowIndex ?? p.data?.targetIndex, row = model.cohortRows[index];
      return row ? `${escape(row.name)}<br/>CNPJs: ${n(row.count)}<br/>Empresas distintas no detalhamento: ${n(row.companyIds.length)}<br/>Resultado observado; não atribui causalidade à gestão.` : '';
    } },
    series: [{ type: 'sankey', animation: false, layoutIterations: 0, nodeAlign: 'justify', left: 8, right: 177, top: 10, bottom: 10, nodeWidth: 12, nodeGap: 24, draggable: false,
      data: model.cohortRows[0] ? [
        { name: model.cohortRows[0].name, rowIndex: 0, itemStyle: { color: NAVY } },
        ...cohortBranches.map(row => ({ name: row.name, rowIndex: row.rowIndex, itemStyle: { color: row.rowIndex === 1 ? ROYAL : MUTED } })),
      ] : [],
      links: cohortBranches.map(row => ({ source: model.cohortRows[0].name, target: row.name, value: row.count, targetIndex: row.rowIndex })),
      label: { position: 'right', color: NAVY, fontSize: 10, distance: 7, formatter: (p: any) => {
        const row = model.cohortRows[p.data.rowIndex];
        return row ? `${p.data.rowIndex === 0 ? 'Observadas na origem' : p.data.rowIndex === 1 ? 'Primeiro registro posterior' : 'Sem primeiro registro posterior'}\n${n(row.count)} CNPJs` : '';
      } },
      lineStyle: { color: 'gradient', opacity: .3 }, itemStyle: { borderColor: '#FFFFFF', borderWidth: 1 }, emphasis: { focus: 'adjacency', lineStyle: { opacity: .6 } },
    }],
  };
  return <div className="e10-panels" data-view={page}>
    <Panel id="e10-resources-cash" step="01" title="Quanto do recebido vem da recuperação da dívida inicial?" subtitle="Caixa PJ por pagamento; a recuperação integra o total recebido" source={`${source} · soma das duas parcelas = recebimentos; ART e valor de contrato não são receitas do conselho`} span={7} tone="primary" metric="receipts" onMetric={onMetric} option={receiptSeries} onPick={financialAllowed ? monthlyPick(['otherReceiptCompanyIds', 'recoveredCompanyIds'], 'Recebimentos empresariais') : undefined}>{!financialAllowed ? <LockedFinance /> : undefined}</Panel>
    <Panel id="e10-resources-debt" step="02" title="Que parte do saldo vencido exige atenção financeira?" subtitle="Estoque em aberto no corte, por faixa de atraso do título" source={`${source} · R$ em aberto, sem duplicar pagamento ou confundir título com empresa`} span={5} metric="overdue" onMetric={onMetric} option={financialAllowed ? horizontal(debtRows, 'R$ vencidos', MUTED) : undefined} onPick={financialAllowed ? choose(debtRows, 'Saldo vencido') : undefined}>{!financialAllowed ? <LockedFinance /> : undefined}</Panel>
    <Panel id="e10-resources-recovery" step="03" title="Quanto do saldo vencido inicial voltou ao caixa?" subtitle="Coorte fixa de obrigações vencidas na abertura da janela" source={`${source} · saldo inicial = recuperado + remanescente; não mistura novos vencimentos no denominador`} span={4} tone="warm" metric="recovery" onMetric={onMetric} option={financialAllowed ? horizontal(openingRows, 'R$ da coorte') : undefined} onPick={financialAllowed ? choose(openingRows, 'Recuperação da coorte financeira') : undefined}>{!financialAllowed ? <LockedFinance /> : undefined}</Panel>
    <Panel id="e10-resources-outcomes" step="04" title="O que aconteceu com as empresas identificadas anteriormente?" subtitle={`Coorte externa em ${model.metadata.baseline} · dois desfechos até ${model.metadata.end}`} source="Histórico externo e registros demonstrativos · primeiro registro ou sem primeiro registro na janela, sem atribuição causal à fiscalização ou à administração" span={8} metric="observedEntry" onMetric={onMetric} option={cohort} onPick={p => { const row = model.cohortRows[p.data?.rowIndex ?? p.data?.targetIndex]; if (row) onCompanies(row.companyIds, `Coorte externa: ${row.name}`); }}>{!model.cohortRows[0]?.count ? <div className="e10-chart-state"><strong>Sem empresas na coorte observada neste recorte.</strong><span>A observação histórica é um universo próprio, com data e CNPJ documentados.</span></div> : undefined}</Panel>
  </div>;
}
