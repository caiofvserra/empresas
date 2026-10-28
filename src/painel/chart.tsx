import { useEffect, useRef, useState } from 'react';
import type { ECharts, EChartsOption } from 'echarts';

/** Cores dos gráficos lidas dos tokens CSS, para seguir o tema claro/escuro do visualizador. */
export interface Tokens { ink: string; muted: string; line: string; surface: string; brand: string; blue: string; accent: string; good: string; bad: string; soft: string; warn: string; heat: string[]; cat: string[] }
function read(): Tokens {
  const style = getComputedStyle(document.documentElement), get = (name: string) => style.getPropertyValue(name).trim();
  return { ink: get('--ink'), muted: get('--muted'), line: get('--line'), surface: get('--surface'), brand: get('--brand'), blue: get('--blue'), accent: get('--accent'), good: get('--good'), bad: get('--bad'), soft: get('--soft'), warn: get('--warn'), heat: [get('--heat-0'), get('--heat-1'), get('--heat-2'), get('--heat-3')], cat: [get('--cat-1'), get('--cat-2'), get('--cat-3'), get('--cat-4'), get('--cat-5')] };
}
export function useTokens(): Tokens {
  const [tokens, setTokens] = useState(read);
  useEffect(() => {
    const update = () => setTokens(read());
    const media = window.matchMedia('(prefers-color-scheme: dark)'); media.addEventListener('change', update);
    const observer = new MutationObserver(update); observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { media.removeEventListener('change', update); observer.disconnect(); };
  }, []);
  return tokens;
}

/** Malha IBGE dos municípios paulistas e o centro aproximado de cada um (média do maior anel), para posicionar bolhas. */
type Centroids = Map<string, [number, number]>;
let mapReady: Promise<Centroids> | null = null;
export function useSpMap(): Centroids | null {
  const [centroids, setCentroids] = useState<Centroids | null>(null);
  useEffect(() => {
    let alive = true;
    mapReady ??= Promise.all([import('../services/echarts'), import('../domain/sp-municipios.json')]).then(([echarts, geometry]) => {
      const geo = geometry.default as unknown as { features: { properties: { name: string }; geometry: { type: string; coordinates: number[][][] | number[][][][] } }[] };
      echarts.registerMap('spPainel', geometry.default as Parameters<typeof echarts.registerMap>[1]);
      const result: Centroids = new Map();
      for (const feature of geo.features) {
        const rings = feature.geometry.type === 'MultiPolygon' ? (feature.geometry.coordinates as number[][][][]).map(polygon => polygon[0]) : [(feature.geometry.coordinates as number[][][])[0]];
        const ring = rings.reduce((largest, current) => current.length > largest.length ? current : largest, rings[0]);
        result.set(feature.properties.name, [ring.reduce((total, point) => total + point[0], 0) / ring.length, ring.reduce((total, point) => total + point[1], 0) / ring.length]);
      }
      return result;
    });
    mapReady.then(value => { if (alive) setCentroids(value); });
    return () => { alive = false; };
  }, []);
  return centroids;
}

/** Eixos de valor sem formatador próprio recebem separador de milhar pt-BR (o padrão do ECharts usa vírgula). */
const eixoPtBr = (axis: any) => axis && typeof axis === 'object' && !Array.isArray(axis) && axis.type === 'value' && !axis.axisLabel?.formatter ? { ...axis, axisLabel: { ...(axis.axisLabel ?? {}), formatter: (number: number) => number.toLocaleString('pt-BR') } } : axis;
const eixos = (axis: unknown) => Array.isArray(axis) ? axis.map(eixoPtBr) : eixoPtBr(axis);
function comEixosPtBr(option: Record<string, unknown>): Record<string, unknown> { return { ...option, ...(option.xAxis ? { xAxis: eixos(option.xAxis) } : {}), ...(option.yAxis ? { yAxis: eixos(option.yAxis) } : {}) }; }

export function Chart({ option, tokens, onPick, label }: { option: Record<string, unknown>; tokens: Tokens; onPick?: (params: any) => void; label: string }) {
  const host = useRef<HTMLDivElement>(null), chart = useRef<ECharts | null>(null), pick = useRef(onPick);
  pick.current = onPick;
  const build = (raw: Record<string, unknown>) => {
    const value = comEixosPtBr(raw), tooltip = (value.tooltip ?? {}) as Record<string, unknown>;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    return { backgroundColor: 'transparent', animation: !reduced, animationDuration: 400, textStyle: { fontFamily: 'Lato, "Segoe UI", system-ui, sans-serif', color: tokens.muted, fontSize: 11 }, aria: { enabled: true, description: label }, ...value,
      tooltip: { backgroundColor: '#01224D', borderColor: '#FABD07', borderWidth: 1, padding: [8, 12], textStyle: { color: '#FFFFFF', fontSize: 12 }, extraCssText: 'border-radius:8px;box-shadow:0 10px 28px rgba(1,34,77,.3);line-height:1.5;', confine: true, ...tooltip } } as EChartsOption;
  };
  useEffect(() => {
    let alive = true, observer: ResizeObserver | undefined;
    import('../services/echarts').then(echarts => {
      if (!alive || !host.current) return;
      const instance = echarts.init(host.current, undefined, { renderer: 'svg' }); chart.current = instance;
      instance.on('click', params => pick.current?.(params));
      instance.setOption(build(option), { notMerge: true });
      observer = new ResizeObserver(() => instance.resize()); observer.observe(host.current);
    });
    return () => { alive = false; observer?.disconnect(); chart.current?.dispose(); chart.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { chart.current?.setOption(build(option), { notMerge: true }); }, [option, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={host} className={`chart ${onPick ? 'is-clickable' : ''}`} role="img" aria-label={label} />;
}

export function Spark({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const width = 100, height = 30, max = Math.max(...values), min = Math.min(...values), span = max - min || 1;
  const points = values.map((value, index) => [index / (values.length - 1) * width, height - 2 - (value - min) / span * (height - 4)]);
  const line = points.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  return <svg className="spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
    <path d={`${line}L${width},${height}L0,${height}Z`} fill={color} fillOpacity=".14" />
    <path d={line} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    <circle cx={points.at(-1)![0]} cy={points.at(-1)![1]} r="2.4" fill={color} />
  </svg>;
}
