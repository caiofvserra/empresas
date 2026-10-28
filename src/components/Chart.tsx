import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ECharts, EChartsOption } from 'echarts';

export const chartColors = ['#3662E2', '#15265C', '#6077B6', '#395386', '#A2B4DB', '#0E1732'];

type ChartProps = {
  option: Record<string, unknown>;
  onPick?: (params: any) => void;
  height?: number;
  ariaLabel: string;
  summary?: ReactNode;
};

function displayOption(option: Record<string, unknown>, label: string): EChartsOption {
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tooltip = option.tooltip && !Array.isArray(option.tooltip) && typeof option.tooltip === 'object' ? option.tooltip : {};
  return {
    color: chartColors,
    backgroundColor: 'transparent',
    animationDuration: 220,
    animationDurationUpdate: 180,
    animation: !reducedMotion,
    textStyle: { fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif', fontSize: 12, color: '#526684' },
    aria: { enabled: true, description: label },
    ...option,
    tooltip: {
      backgroundColor: '#0E1732', borderColor: '#6077B6', borderWidth: 1,
      padding: [8, 11], textStyle: { color: '#FFFFFF', fontSize: 11 },
      extraCssText: 'border-radius:8px;box-shadow:0 8px 24px #0E173233;line-height:1.6;',
      confine: true, ...tooltip,
    },
  } as EChartsOption;
}

/** SVG charts retain sharp labels and resize with their containing analytical panel. */
export default function Chart({ option, onPick, height = 300, ariaLabel, summary }: ChartProps) {
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<ECharts | null>(null);
  const latest = useRef({ option, onPick, ariaLabel });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  latest.current = { option, onPick, ariaLabel };

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let observer: ResizeObserver | undefined;
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => instance.current?.resize());
    };

    import('../services/echarts').then(echarts => {
      if (cancelled || !host.current) return;
      const chart = echarts.init(host.current, undefined, { renderer: 'svg' });
      instance.current = chart;
      chart.on('click', params => latest.current.onPick?.(params));
      chart.setOption(displayOption(latest.current.option, latest.current.ariaLabel), { notMerge: true });
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(resize);
        observer.observe(host.current);
      }
      window.addEventListener('resize', resize);
      setReady(true);
    }).catch(() => { if (!cancelled) setError(true); });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      instance.current?.dispose();
      instance.current = null;
    };
  }, []);

  useEffect(() => {
    instance.current?.setOption(displayOption(option, ariaLabel), { notMerge: true, lazyUpdate: false });
  }, [option, ariaLabel]);

  useEffect(() => { instance.current?.resize(); }, [height]);

  return <figure className="p-chart" style={{ margin: 0 }}>
    <div ref={host} className={`p-chart-canvas ${onPick ? 'interactive' : ''}`} style={{ height, width: '100%', minWidth: 0 }} role="img" aria-label={ariaLabel} aria-busy={!ready && !error} />
    {!ready && !error && <span className="p-sr-only">Carregando gráfico.</span>}
    {error && <div className="p-error">Não foi possível carregar esta visualização. Os indicadores e a tabela continuam disponíveis.</div>}
    <figcaption className={summary ? 'p-chart-summary' : 'p-sr-only'}>{summary ?? ariaLabel}</figcaption>
  </figure>;
}

type BarRow = { label: string; value: number; color?: string };

export function barOption(rows: BarRow[], valueLabel = 'Estabelecimentos'): Record<string, unknown> {
  return {
    grid: { top: 12, bottom: 12, left: 8, right: 46, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (params: any[]) => `${params[0]?.name ?? ''}<br/>${valueLabel}: ${Number(params[0]?.value ?? 0).toLocaleString('pt-BR')}` },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: '#EDF0F6' } }, axisLabel: { fontSize: 12, color: '#8795AF' } },
    yAxis: { type: 'category', inverse: true, data: rows.map(r => r.label), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { fontSize: 12, color: '#5B6E92', width: 128, overflow: 'truncate' } },
    series: [{ type: 'bar', name: valueLabel, barMaxWidth: 18, label: { show: true, position: 'right', fontSize: 12, color: '#6077B6', formatter: (p: any) => Number(p.value).toLocaleString('pt-BR') }, data: rows.map((r, i) => ({ value: r.value, itemStyle: { color: r.color ?? (i === 0 ? '#3662E2' : '#6077B6'), borderRadius: [0, 3, 3, 0] } })) }],
  };
}

export function heatmapOption(xLabels: string[], yLabels: string[], values: [number, number, number][]): Record<string, unknown> {
  const max = Math.max(...values.map(v => v[2]), 1);
  return {
    grid: { top: 12, bottom: 66, left: 8, right: 8, containLabel: true },
    tooltip: { position: 'top', formatter: (p: any) => `${yLabels[p.value[1]]} · ${xLabels[p.value[0]]}<br/>${Number(p.value[2]).toLocaleString('pt-BR')}` },
    xAxis: { type: 'category', data: xLabels, splitArea: { show: true }, axisLabel: { fontSize: 12, color: '#6077B6', interval: 0, rotate: xLabels.length > 7 ? 30 : 0 }, axisLine: { show: false }, axisTick: { show: false } },
    yAxis: { type: 'category', data: yLabels, axisLabel: { fontSize: 12, color: '#6077B6', width: 100, overflow: 'truncate' }, axisLine: { show: false }, axisTick: { show: false } },
    visualMap: { min: 0, max, calculable: false, orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 12, itemHeight: 110, textStyle: { fontSize: 12, color: '#516584' }, inRange: { color: ['#EFF3FD', '#A2B4DB', '#3662E2', '#15265C'] } },
    series: [{ type: 'heatmap', data: values, label: { show: true, fontSize: 12, formatter: (p: any) => `{${p.value[2] / max >= .58 ? 'light' : 'dark'}|${Number(p.value[2]).toLocaleString('pt-BR')}}`, rich: { light: { color: '#FFFFFF', fontSize: 12 }, dark: { color: '#0E1732', fontSize: 12 } } }, itemStyle: { borderColor: '#FFFFFF', borderWidth: 3 }, emphasis: { itemStyle: { borderColor: '#3662E2', borderWidth: 2 } } }],
  };
}

export function treemapOption(rows: { name: string; value: number; children?: unknown[] }[]): Record<string, unknown> {
  return {
    tooltip: { formatter: (p: any) => `${p.name}<br/>${Number(p.value).toLocaleString('pt-BR')}` },
    series: [{ type: 'treemap', data: rows, roam: false, nodeClick: false, breadcrumb: { show: false }, left: 0, right: 0, top: 0, bottom: 0, label: { show: true, color: '#FFFFFF', fontSize: 12, formatter: '{b}\n{c}' }, itemStyle: { borderColor: '#FFF', borderWidth: 3, gapWidth: 3 }, levels: [{ itemStyle: { borderWidth: 0, gapWidth: 4 } }, { color: ['#3662E2', '#15265C', '#395386', '#0E1732', '#274477'], colorMappingBy: 'index', itemStyle: { borderWidth: 3, gapWidth: 3 } }] }],
  };
}

export function scatterOption(rows: { label: string; x: number; y: number; size?: number }[], xLabel: string, yLabel: string): Record<string, unknown> {
  return {
    grid: { top: 20, right: 25, bottom: 55, left: 15, containLabel: true },
    tooltip: { formatter: (p: any) => `${p.data.name}<br/>${xLabel}: ${Number(p.value[0]).toLocaleString('pt-BR')}<br/>${yLabel}: ${Number(p.value[1]).toLocaleString('pt-BR')}` },
    xAxis: { type: 'value', name: xLabel, nameLocation: 'middle', nameGap: 33, axisLabel: { fontSize: 12 }, splitLine: { lineStyle: { color: '#EDF0F6' } } },
    yAxis: { type: 'value', name: yLabel, nameTextStyle: { fontSize: 12 }, axisLabel: { fontSize: 12 }, splitLine: { lineStyle: { color: '#EDF0F6' } } },
    series: [{ type: 'scatter', data: rows.map(r => ({ name: r.label, value: [r.x, r.y, r.size ?? 1] })), symbolSize: (v: number[]) => Math.max(8, Math.min(38, Math.sqrt(v[2]) * 4)), itemStyle: { color: '#3662E2', opacity: .75 }, emphasis: { itemStyle: { color: '#15265C' }, label: { show: true, formatter: '{b}', position: 'top', fontSize: 12 } } }],
  };
}

export function comboOption(labels: string[], bars: number[], line: number[], barLabel = 'Estabelecimentos', lineLabel = 'Cobertura'): Record<string, unknown> {
  return {
    grid: { top: 30, bottom: 46, left: 12, right: 12, containLabel: true },
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, itemWidth: 12, itemHeight: 8, textStyle: { fontSize: 12, color: '#6077B6' } },
    xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 12, color: '#6077B6' }, axisLine: { lineStyle: { color: '#E6EBF5' } }, axisTick: { show: false } },
    yAxis: [{ type: 'value', axisLabel: { fontSize: 12 }, splitLine: { lineStyle: { color: '#EDF0F6' } } }, { type: 'value', axisLabel: { fontSize: 12, formatter: '{value}%' }, splitLine: { show: false } }],
    series: [{ name: barLabel, type: 'bar', data: bars, barMaxWidth: 23, itemStyle: { color: '#6077B6', borderRadius: [3, 3, 0, 0] } }, { name: lineLabel, type: 'line', data: line, yAxisIndex: 1, itemStyle: { color: '#3662E2' }, lineStyle: { width: 3 }, symbolSize: 6 }],
  };
}
