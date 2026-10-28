import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Spark } from './chart';

/* ---------- Formatação pt-BR ---------- */
export const int = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
export const pct = (value: number, digits = 0) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: digits })}%`;
export const brl = (value: number) => `R$ ${value.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })}`;
export const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export const mes = (value: string) => `${new Date(`${value}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '')}/${value.slice(2, 4)}`;
export const data = (value: string) => value.split('-').reverse().join('/');
export const short = (name: string) => name.split('·')[1]?.trim() ?? name;

/** Cor de texto legível sobre um fundo hexadecimal (luminância relativa sRGB). */
export function inkOn(background: string): string {
  const hex = background.trim().replace('#', ''); if (!/^[0-9a-f]{6}$/i.test(hex)) return '#FFFFFF';
  const [r, g, b] = [0, 2, 4].map(index => { const channel = parseInt(hex.slice(index, index + 2), 16) / 255; return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.32 ? '#1A202C' : '#FFFFFF';
}

/** Variação contra o mesmo período do ano anterior, com cor pelo sentido desejado. */
export function Delta({ value, goodUp = true, label = 'vs. ano anterior' }: { value: number | null; goodUp?: boolean; label?: string }) {
  if (value === null || !Number.isFinite(value)) return <span className="delta is-none">sem base anterior</span>;
  const good = goodUp ? value >= 0 : value <= 0, Icon = Math.abs(value) < 0.5 ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  return <span className={`delta ${good ? 'is-good' : 'is-bad'}`}><Icon size={12} />{value > 0 ? '+' : ''}{pct(value)}<em>{label}</em></span>;
}

export function Tile({ title, question, children, className, actions, area }: { title: string; question?: string; children: ReactNode; className?: string; actions?: ReactNode; area: string }) {
  return <section className={`tile ${className ?? ''}`} style={{ gridArea: area }} aria-label={title}>
    <header><div><h3>{title}</h3>{question && <p>{question}</p>}</div>{actions}</header>
    <div className="tile-body">{children}</div>
  </section>;
}

/** Cartão de etapa ou indicador: rótulo, número principal, variação, série curta e complemento. */
export function Card({ step, label, value, delta, spark, sparkColor, sub, extra, onOpen, tone }: { step?: string; label: string; value: string; delta?: ReactNode; spark?: number[]; sparkColor?: string; sub?: ReactNode; extra?: ReactNode; onOpen?: () => void; tone?: 'alert' }) {
  const body = <>
    {step && <span className="card-step">{step}</span>}
    <span className="card-label">{label}</span>
    <span className="card-row"><strong>{value}</strong>{spark && spark.length > 1 && sparkColor && <Spark values={spark} color={sparkColor} />}</span>
    {delta}
    {extra}
    {sub && <span className="card-sub">{sub}</span>}
  </>;
  return onOpen ? <button className={`card ${tone === 'alert' ? 'is-alert' : ''}`} onClick={onOpen} title={`${label}: ver as empresas`}>{body}</button> : <div className={`card ${tone === 'alert' ? 'is-alert' : ''}`}>{body}</div>;
}

/** Barra segmentada compacta com legenda no título de cada parte. */
export function Segments({ parts }: { parts: { label: string; value: number; color: string; format?: (value: number) => string }[] }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0) || 1;
  return <span className="segments" role="img" aria-label={parts.map(part => `${part.label}: ${part.format ? part.format(part.value) : int(part.value)}`).join('; ')}>
    {parts.filter(part => part.value > 0).map(part => <i key={part.label} style={{ width: `${part.value / total * 100}%`, background: part.color }} title={`${part.label}: ${part.format ? part.format(part.value) : int(part.value)} (${pct(part.value / total * 100)})`} />)}
  </span>;
}
