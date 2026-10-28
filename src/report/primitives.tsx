import type { ReactNode } from 'react';
import type { Scope } from '../domain/engine';
import type { Filters } from '../domain/types';
import Chart from '../components/Chart';

export type ReportPage = 'overview' | 'companies' | 'professionals' | 'market' | 'contracts' | 'inspection' | 'transparency';
export interface ReportProps {
  scope: Scope;
  filters: Filters;
  comparison: boolean;
  financialAllowed: boolean;
  companySubset?: string[];
  professionalIds?: string[];
  onDimension: (key: 'greIds' | 'cityIds' | 'cnaeCodes' | 'cboCodes', ids: string[]) => void;
  onSubset: (ids: string[], label: string, reason: string) => void;
  onProfessionals: (ids: string[], label: string) => void;
  onInfo: (id: string) => void;
  publicContractSelection?: { categoryId?: string; municipalityId?: string };
  onPublicContractSelection?: (selection: { categoryId?: string; municipalityId?: string }) => void;
}

export const num = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
export const percent = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
export const compact = (value: number) => value.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
export const currency = (value: number) => `R$ ${compact(value)}`;
export const distinct = (values: string[]) => [...new Set(values)];
export const palette = ['#3662E2', '#15265C', '#6077B6', '#A4B5DA', '#0E1732'];

export function ReportPanel({ id, step, title, subtitle, source, wide = false, action, children }: { id: string; step: string; title: string; subtitle?: string; source: string; wide?: boolean; action?: ReactNode; children: ReactNode }) {
  return <section className={`r5-panel ${wide ? 'r5-wide' : ''}`} data-panel={id} aria-label={title}>
    <header className="r5-panel-header"><span className="r5-step">{step}</span><div><h2>{title}</h2>{subtitle && <p title={subtitle}>{subtitle}</p>}</div>{action}</header>
    <div className="r5-panel-content">{children}</div>
    <footer className="r5-panel-source" title={source}>{source}</footer>
  </section>;
}

export function ReportChart({ option, label, onPick }: { option: Record<string, unknown>; label: string; onPick?: (params: any) => void }) {
  // Axis names start inside the chart; centered names can escape narrow BI panels.
  const alignAxis = (axis: any, index: number) => axis?.name ? { ...axis, nameTextStyle: { fontSize: 10, ...axis.nameTextStyle, align: index === 0 ? 'left' : 'right' } } : axis;
  const alignHorizontal = (axis: any) => axis?.name && (!axis.nameLocation || axis.nameLocation === 'end') ? { ...axis, nameGap: 3, nameTextStyle: { fontSize: 10, ...axis.nameTextStyle, align: 'right' } } : axis;
  const display = { ...option, ...(option.yAxis ? { yAxis: Array.isArray(option.yAxis) ? option.yAxis.map(alignAxis) : alignAxis(option.yAxis, 0) } : {}), ...(option.xAxis ? { xAxis: Array.isArray(option.xAxis) ? option.xAxis.map(alignHorizontal) : alignHorizontal(option.xAxis) } : {}) };
  // ECharts 6 keeps hover references to removed Sankey nodes across notMerge updates.
  // A topology change needs a fresh renderer so mouseout cannot read a stale data index.
  const series = Array.isArray(option.series) ? option.series : option.series ? [option.series] : [];
  const sankeys = series.filter((row: any) => row.type === 'sankey');
  const topology = sankeys.length ? JSON.stringify(sankeys.map((row: any) => ({
    nodes: (row.data ?? []).map((node: any) => node.name),
    links: (row.links ?? []).map((link: any) => [link.source, link.target]),
  }))) : undefined;
  return <div className="r5-chart"><Chart key={topology} option={display} ariaLabel={label} onPick={onPick} /></div>;
}

export interface CombinedSeries { name: string; type: 'bar' | 'line'; data: (number | null)[]; axis?: number; color?: string; stack?: string; dashed?: boolean }
export function combinedOption(labels: string[], series: CombinedSeries[], units: string[] = ['Quantidade', 'Quantidade']): Record<string, unknown> {
  return {
    tooltip: { trigger: 'axis', confine: true },
    legend: { bottom: 0, type: 'scroll', itemWidth: 10, itemHeight: 6, textStyle: { fontSize: 10, color: '#566786' } },
    grid: { top: 23, right: 12, bottom: 36, left: 8, containLabel: true },
    xAxis: { type: 'category', data: labels, axisTick: { show: false }, axisLine: { lineStyle: { color: '#E2E8F2' } }, axisLabel: { fontSize: 10, hideOverlap: true } },
    yAxis: units.map((unit, index) => ({ type: 'value', name: unit, nameTextStyle: { fontSize: 10 }, splitNumber: 3, axisLabel: { fontSize: 10, formatter: (v: number) => compact(v) }, splitLine: { show: index === 0, lineStyle: { color: '#EEF1F7' } } })),
    series: series.map((row, index) => ({ name: row.name, type: row.type, data: row.data, yAxisIndex: row.axis ?? 0, stack: row.stack, barMaxWidth: 19, symbolSize: 4, connectNulls: false, itemStyle: { color: row.color ?? palette[index % palette.length], borderRadius: row.type === 'bar' ? [3, 3, 0, 0] : undefined }, lineStyle: { width: 2.5, type: row.dashed ? 'dashed' : 'solid' }, emphasis: { focus: 'series' } })),
  };
}

export function horizontalOption(labels: string[], values: number[], name = 'Quantidade', color = '#3662E2'): Record<string, unknown> {
  return { tooltip: { trigger: 'axis', confine: true, axisPointer: { type: 'shadow' } }, grid: { top: 5, bottom: 6, left: 0, right: 32, containLabel: true },
    xAxis: { type: 'value', splitNumber: 3, axisLabel: { fontSize: 10, formatter: (v: number) => compact(v) }, splitLine: { lineStyle: { color: '#EEF1F7' } } },
    yAxis: { type: 'category', inverse: true, data: labels, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { fontSize: 11, width: 108, overflow: 'truncate' } },
    series: [{ type: 'bar', name, barMaxWidth: 15, data: values, itemStyle: { color, borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', fontSize: 10, color: '#4B5D7B', formatter: (p: any) => compact(p.value) } }] };
}

export function matrixOption(x: string[], y: string[], data: [number, number, number][], unit = 'Quantidade'): Record<string, unknown> {
  const max = Math.max(1, ...data.map(row => row[2]));
  return { tooltip: { confine: true, formatter: (p: any) => `${y[p.value[1]]} · ${x[p.value[0]]}<br/>${unit}: ${num(p.value[2])}` }, grid: { left: 0, right: 8, top: 4, bottom: 26, containLabel: true },
    xAxis: { type: 'category', data: x, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { fontSize: 10, hideOverlap: true, width: 65, overflow: 'truncate' } },
    yAxis: { type: 'category', data: y, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { fontSize: 10, width: 90, overflow: 'truncate' } },
    visualMap: { show: false, min: 0, max, inRange: { color: ['#F1F4FC', '#BACBEC', '#3662E2', '#15265C'] } },
    series: [{ type: 'heatmap', data, label: { show: true, fontSize: 10, color: '#0E1732', formatter: (p: any) => `{${p.value[2] > max * .55 ? 'white' : 'dark'}|${compact(p.value[2])}}`, rich: { white: { color: 'white', fontSize: 10 }, dark: { color: '#0E1732', fontSize: 10 } } }, itemStyle: { borderWidth: 2, borderColor: '#fff' } }] };
}

export function treemapReportOption(rows: { name: string; value: number; id?: string }[], unit = 'Quantidade'): Record<string, unknown> {
  return { tooltip: { confine: true, formatter: (p: any) => `${p.name}<br/>${unit}: ${num(p.value)}` }, series: [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, data: rows, left: 0, top: 0, right: 0, bottom: 0, label: { fontSize: 11, color: 'white', formatter: (p: any) => `${p.name}\n${compact(p.value)}` }, itemStyle: { borderWidth: 2, borderColor: '#fff', gapWidth: 2 }, color: palette }] };
}
