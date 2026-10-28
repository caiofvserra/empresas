import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ECharts, EChartsOption } from 'echarts';
import { ArrowDownRight, ArrowUpRight, CircleHelp, Maximize2, Minimize2, Minus } from 'lucide-react';
import type { DebtRow, DecompositionDimension, Kpi } from './metrics';
import { decompose, decompositionLabels } from './metrics';
import type { Freshness } from './public-data';

/* ---------- Paleta por tema: mesmas famílias CREA, papéis ajustados ao fundo ---------- */
export interface Palette { dark: boolean; ink: string; muted: string; grid: string; panel: string; primary: string; blue: string; sky: string; pale: string; gold: string; good: string; bad: string; neutral: string; tooltip: string; seq: string[] }
export const palette = (dark: boolean): Palette => dark
  ? { dark, ink: '#EDF2F7', muted: '#A0AEC0', grid: '#24365C', panel: '#0F1E3B', primary: '#8DB6EC', blue: '#3182CE', sky: '#639CE0', pale: '#2A4372', gold: '#FABD07', good: '#2FD3A4', bad: '#FF7A7A', neutral: '#A0AEC0', tooltip: '#01224D', seq: ['#1B2F55', '#246FB5', '#639CE0', '#D4EDFF'] }
  : { dark, ink: '#1A202C', muted: '#3B4453', grid: '#E2E8F0', panel: '#FFFFFF', primary: '#082D74', blue: '#3182CE', sky: '#639CE0', pale: '#D4EDFF', gold: '#FABD07', good: '#007061', bad: '#A81919', neutral: '#718096', tooltip: '#01224D', seq: ['#EAF4FF', '#9CC3EE', '#3182CE', '#082D74'] };

export const fmt = {
  int: (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
  pct: (value: number, digits = 1) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: digits })}%`,
  brl: (value: number) => `R$ ${value.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })}`,
  money: (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }),
  compact: (value: number) => value.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }),
  month: (value: string) => new Date(`${value}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' }).replace('.', ''),
};
export const esc = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));

/* ---------- ECharts com tema e animação contida ---------- */
let mapReady: Promise<void> | null = null;
export function ensureSpMap(): Promise<void> {
  mapReady ??= Promise.all([import('../services/echarts'), import('../domain/sp-municipios.json')]).then(([echarts, geometry]) => { echarts.registerMap('spCockpit', geometry.default as Parameters<typeof echarts.registerMap>[1]); });
  return mapReady;
}
export function EChart({ option, theme, onPick, ariaLabel, className }: { option: Record<string, unknown>; theme: Palette; onPick?: (params: any) => void; ariaLabel: string; className?: string }) {
  const host = useRef<HTMLDivElement>(null), instance = useRef<ECharts | null>(null), pick = useRef(onPick);
  const [failed, setFailed] = useState(false);
  pick.current = onPick;
  const themed = (value: Record<string, unknown>) => {
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const tooltip = (value.tooltip ?? {}) as Record<string, unknown>;
    return { backgroundColor: 'transparent', animation: !reduced, animationDuration: 450, animationEasing: 'cubicOut', animationDurationUpdate: 300,
      textStyle: { fontFamily: 'Lato, system-ui, sans-serif', color: theme.muted, fontSize: 11 }, aria: { enabled: true, description: ariaLabel }, ...value,
      tooltip: { backgroundColor: theme.tooltip, borderColor: theme.gold, borderWidth: 1, padding: [8, 12], textStyle: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Lato, system-ui, sans-serif' }, extraCssText: 'border-radius:10px;box-shadow:0 12px 32px rgba(1,34,77,.35);line-height:1.55;', confine: true, ...tooltip } } as EChartsOption;
  };
  useEffect(() => {
    let alive = true, observer: ResizeObserver | undefined;
    import('../services/echarts').then(echarts => {
      if (!alive || !host.current) return;
      const chart = echarts.init(host.current, undefined, { renderer: 'svg' }); instance.current = chart;
      chart.on('click', params => pick.current?.(params));
      chart.setOption(themed(option), { notMerge: true });
      observer = new ResizeObserver(() => chart.resize()); observer.observe(host.current);
    }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; observer?.disconnect(); instance.current?.dispose(); instance.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { instance.current?.setOption(themed(option), { notMerge: true }); }, [option, theme]); // eslint-disable-line react-hooks/exhaustive-deps
  return failed ? <div className="ck-chart-error">Visualização indisponível neste navegador.</div>
    : <div ref={host} className={`ck-chart ${onPick ? 'is-interactive' : ''} ${className ?? ''}`} role="img" aria-label={ariaLabel} />;
}

/* ---------- Bloco do bento: título, subtítulo, ações, foco ---------- */
export function Tile({ title, subtitle, area, children, actions, help, badge, focus, onFocus, className }: { title: string; subtitle?: string; area: string; children: ReactNode; actions?: ReactNode; help?: string; badge?: ReactNode; focus?: boolean; onFocus?: () => void; className?: string }) {
  return <section className={`ck-tile ${focus ? 'is-focus' : ''} ${className ?? ''}`} style={{ gridArea: area }} aria-label={title}>
    <header className="ck-tile-head"><div><h2>{title}{badge}</h2>{subtitle && <p>{subtitle}</p>}</div>
      <div className="ck-tile-actions">{actions}{help && <span className="ck-help" tabIndex={0} aria-label={help} data-tip={help}><CircleHelp size={14} /></span>}{onFocus && <button className="ck-icon" aria-label={focus ? `Restaurar ${title}` : `Modo foco: ${title}`} title={focus ? 'Restaurar (Esc)' : 'Modo foco'} onClick={onFocus}>{focus ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>}</div></header>
    <div className="ck-tile-body">{children}</div>
  </section>;
}
export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; label: string }) {
  return <div className="ck-seg" role="radiogroup" aria-label={label}>{options.map(option => <button key={String(option.value)} role="radio" aria-checked={value === option.value} className={value === option.value ? 'on' : ''} onClick={() => onChange(option.value)}>{option.label}</button>)}</div>;
}
export function FreshnessBadge({ freshness, date }: { freshness: Freshness; date?: string }) {
  return <span className={`ck-fresh ck-fresh-${freshness === 'ao vivo' ? 'live' : freshness === 'snapshot' ? 'snap' : 'off'}`}><i />{freshness === 'ao vivo' ? 'Ao vivo' : freshness === 'snapshot' ? `Real · ${date ? date.split('-').reverse().join('/') : 'snapshot'}` : 'Indisponível'}</span>;
}

/* ---------- Sparkline SVG leve (cards, matriz e pequenos múltiplos) ---------- */
export function Sparkline({ values, color, fill = true, height = 34, highlightLast = true, max: forcedMax, min: forcedMin }: { values: number[]; color: string; fill?: boolean; height?: number; highlightLast?: boolean; max?: number; min?: number }) {
  if (values.length < 2) return null;
  const width = 120, max = forcedMax ?? Math.max(...values), min = forcedMin ?? Math.min(...values), span = max - min || 1;
  const points = values.map((value, index) => [index / (values.length - 1) * width, height - 3 - (value - min) / span * (height - 6)]);
  const line = points.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  const id = `g${color.replace('#', '')}`;
  return <svg className="ck-spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".32" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
    {fill && <path d={`${line}L${width},${height}L0,${height}Z`} fill={`url(#${id})`} />}
    <path d={line} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    {highlightLast && <circle cx={points.at(-1)![0]} cy={points.at(-1)![1]} r="2.6" fill={color} vectorEffect="non-scaling-stroke" />}
  </svg>;
}

/* ---------- Novo cartão KPI: valor, variação, sparkline, meta ---------- */
export function KpiCard({ kpi, theme, restricted, onClick, active }: { kpi: Kpi; theme: Palette; restricted: boolean; onClick: () => void; active: boolean }) {
  const value = restricted ? 'Restrito' : kpi.value === null ? 'Sem base' : kpi.format === 'int' ? fmt.int(kpi.value) : kpi.format === 'pct' ? fmt.pct(kpi.value) : fmt.brl(kpi.value);
  const positive = kpi.delta !== null && (kpi.good === 'up' ? kpi.delta >= 0 : kpi.delta <= 0);
  const Icon = kpi.delta === null || Math.abs(kpi.delta) < 0.05 ? Minus : kpi.delta > 0 ? ArrowUpRight : ArrowDownRight;
  return <button className={`ck-kpi ${active ? 'is-active' : ''}`} data-kpi={kpi.id} disabled={restricted || !kpi.companyIds.length} onClick={onClick} title={`${kpi.label} · clique para filtrar as empresas relacionadas`}>
    <span className="ck-kpi-origin">{kpi.origin}</span>
    <span className="ck-kpi-label">{kpi.label}</span>
    <strong className="ck-kpi-value">{value}</strong>
    {!restricted && kpi.delta !== null && <span className={`ck-delta ${positive ? 'is-good' : 'is-bad'}`}><Icon size={13} />{kpi.deltaKind === 'pp' ? `${kpi.delta >= 0 ? '+' : ''}${kpi.delta.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p.` : `${kpi.delta >= 0 ? '+' : ''}${fmt.pct(kpi.delta)}`}<em>{kpi.deltaLabel}</em></span>}
    {!restricted && kpi.target !== undefined && kpi.value !== null && <span className="ck-bullet" aria-label={`Meta ${kpi.target}%`}><i style={{ width: `${Math.min(100, kpi.value)}%` }} /><b style={{ left: `${kpi.target}%` }} /></span>}
    {!restricted && kpi.spark.length > 1 && <span className="ck-kpi-spark"><Sparkline values={kpi.spark} color={kpi.id === 'overdue' ? theme.bad : kpi.id === 'receipts' ? theme.gold : theme.sky} /></span>}
    <small className="ck-kpi-ref">{restricted ? 'Perfil sem acesso financeiro' : kpi.reference}</small>
  </button>;
}

/* ---------- Árvore de decomposição (estilo Power BI) ---------- */
export function DecompositionTree({ rows, theme, onSelect }: { rows: DebtRow[]; theme: Palette; onSelect: (ids: string[], label: string) => void }) {
  const all: DecompositionDimension[] = ['gre', 'size', 'aging', 'cnae', 'rt'];
  const [levels, setLevels] = useState<{ dimension: DecompositionDimension; key: string | null }[]>([{ dimension: 'gre', key: null }]);
  const total = rows.reduce((value, row) => value + row.value, 0);
  const columns: { dimension: DecompositionDimension; nodes: ReturnType<typeof decompose>; key: string | null }[] = [];
  let subset = rows;
  for (const level of levels) {
    const nodes = decompose(subset, level.dimension);
    columns.push({ dimension: level.dimension, nodes, key: level.key });
    if (!level.key) break;
    subset = subset.filter(row => row[level.dimension] === level.key);
  }
  const used = new Set(levels.map(level => level.dimension));
  const choose = (index: number, key: string) => {
    const next = levels.slice(0, index + 1); next[index] = { ...next[index], key: next[index].key === key ? null : key };
    const remaining = all.filter(dimension => !next.some(level => level.dimension === dimension));
    if (next[index].key && remaining.length) next.push({ dimension: remaining[0], key: null });
    setLevels(next);
  };
  const changeDimension = (index: number, dimension: DecompositionDimension) => setLevels([...levels.slice(0, index), { dimension, key: null }]);
  return <div className="ck-tree" role="tree" aria-label="Árvore de decomposição do saldo vencido">
    <div className="ck-tree-col ck-tree-root"><span className="ck-tree-head">Saldo vencido</span><div className="ck-tree-node is-on" role="treeitem" aria-selected="true"><span>Total</span><strong>{fmt.brl(total)}</strong><i style={{ width: '100%', background: theme.primary }} /></div><small>{fmt.int(rows.length)} empresas</small></div>
    {columns.map((column, index) => {
      const max = Math.max(...column.nodes.map(node => node.value), 1);
      return <div className="ck-tree-col" key={`${index}-${column.dimension}`}>
        <select className="ck-tree-head" aria-label={`Dimensão do nível ${index + 1}`} value={column.dimension} onChange={event => changeDimension(index, event.target.value as DecompositionDimension)}>
          {all.filter(dimension => dimension === column.dimension || !used.has(dimension)).map(dimension => <option key={dimension} value={dimension}>{decompositionLabels[dimension]}</option>)}
        </select>
        <div className="ck-tree-list">{column.nodes.slice(0, 8).map((node, rank) => <div key={node.key} role="treeitem" aria-selected={column.key === node.key} className={`ck-tree-node ${column.key === node.key ? 'is-on' : ''} ${column.key && column.key !== node.key ? 'is-dim' : ''}`}>
          <button onClick={() => choose(index, node.key)} title={`${node.label}: ${fmt.money(node.value)} (${fmt.pct(node.share)} do nível) · clique para abrir o próximo nível`}><span>{node.label}</span><strong>{fmt.brl(node.value)}</strong><i style={{ width: `${node.value / max * 100}%`, background: rank === 0 ? theme.bad : theme.sky }} /></button>
          <button className="ck-tree-filter" aria-label={`Filtrar empresas de ${node.label}`} title="Filtrar o painel por estas empresas" onClick={() => onSelect(node.companyIds, `Saldo vencido · ${node.label}`)}>⌖</button>
        </div>)}{column.nodes.length > 8 && <small>+{column.nodes.length - 8} itens menores</small>}</div>
      </div>;
    })}
  </div>;
}
