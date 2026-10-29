import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, CircleHelp, Maximize2, Minimize2, Minus } from 'lucide-react';
import { mainEstablishments } from '../gestao-v14/metrics';
import { Spark } from '../painel/chart';
import { pct } from '../painel/ui';
import type { CockpitCtx } from './contexto';

/** Componentes do cockpit V18: bloco com ampliação e ajuda, cartão de indicador e selo de dado real. */
export function Bloco({ ctx, id, area, title, question, help, badge, actions, children, className }: { ctx: CockpitCtx; id: string; area: string; title: string; question?: string; help?: string; badge?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  const focus = ctx.focus === id;
  return <section className={`tile ck-tile ${focus ? 'is-focus' : ''} ${className ?? ''}`} style={{ gridArea: area }} aria-label={title}>
    <header><div><h3>{title}{badge}</h3>{question && <p>{question}</p>}</div>
      <div className="tile-tools">{actions}
        {help && <span className="help" tabIndex={0} data-tip={help} aria-label={help}><CircleHelp size={14} /></span>}
        <button className="icon-btn ghost-icon" aria-label={focus ? `Restaurar ${title}` : `Ampliar ${title}`} title={focus ? 'Restaurar (Esc)' : 'Ampliar'} onClick={() => ctx.toggleFocus(id)}>{focus ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
      </div></header>
    <div className="tile-body">{children}</div>
  </section>;
}

/** Selo para dados públicos reais (o restante do painel é demonstrativo, indicado no cabeçalho). */
export const Selo = ({ data }: { data: string }) => <span className="selo" title="Dado público real versionado no painel">Real · {data.split('-').reverse().join('/')}</span>;

export interface Variacao { value: number | null; kind?: 'pct' | 'pp'; goodUp?: boolean; label?: string }
export function Var({ value, kind = 'pct', goodUp = true, label = 'vs. ano anterior' }: Variacao) {
  if (value === null || !Number.isFinite(value)) return <span className="delta is-none">sem base de comparação</span>;
  const good = goodUp ? value >= 0 : value <= 0, Icon = Math.abs(value) < 0.5 ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  const text = kind === 'pp' ? `${value > 0 ? '+' : ''}${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p.` : `${value > 0 ? '+' : ''}${pct(value)}`;
  return <span className={`delta ${good ? 'is-good' : 'is-bad'}`}><Icon size={12} />{text}<em>{label}</em></span>;
}

/** Cartão de indicador: assunto, nome, valor, variação, série curta, meta e complemento. */
export function Indicador({ aspecto, label, value, variacao, spark, cor, meta, sub, onOpen, destaque }: { aspecto?: string; label: string; value: string; variacao?: Variacao; spark?: number[]; cor?: string; meta?: { atual: number | null; alvo: number }; sub?: ReactNode; onOpen?: () => void; destaque?: boolean }) {
  const body = <>
    {aspecto && <span className="ind-aspecto">{aspecto}</span>}
    <span className="ind-label" title={label}>{label}</span>
    <span className="ind-row"><strong>{value}</strong>{spark && spark.length > 1 && <Spark values={spark} color={cor ?? 'currentColor'} />}</span>
    {variacao && <Var {...variacao} />}
    {meta && meta.atual !== null && <span className="ind-meta" title={`Meta: ${meta.alvo}%`}><i style={{ width: `${Math.max(0, Math.min(100, meta.atual))}%` }} /><b style={{ left: `${meta.alvo}%` }} /></span>}
    {sub && <span className="ind-sub">{sub}</span>}
  </>;
  const className = `ind ${destaque ? 'is-destaque' : ''}`;
  return onOpen ? <button className={className} onClick={onOpen} title={`${label}: ver detalhe`}>{body}</button> : <div className={className}>{body}</div>;
}

/** Linhas do painel lateral para uma lista de empresas, com valor e observação próprios de cada visual. */
export function linhasEmpresas(ctx: CockpitCtx, ids: string[], info: (id: string) => { value: string; note: string; sort: number }) {
  const companies = new Map(ctx.dataset.companies.map(row => [row.id, row])), main = mainEstablishments(ctx.dataset), cities = new Map(ctx.dataset.cities.map(row => [row.id, row.name]));
  return [...new Set(ids)].map(id => { const company = companies.get(id), place = main.get(id), extra = info(id);
    return { key: id, companyId: id, title: company?.tradeName || company?.name || id, subtitle: `${company?.rootCnpj ?? ''} · ${cities.get(place?.cityId ?? '') ?? '—'}`, value: extra.value, note: extra.note, sortValue: extra.sort }; });
}
export const nomeEmpresa = (ctx: CockpitCtx, id: string) => { const company = ctx.dataset.companies.find(row => row.id === id); return company?.tradeName || company?.name || id; };
export const carregando = <div className="loading">Calculando…</div>;
