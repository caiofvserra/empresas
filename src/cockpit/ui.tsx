import { Fragment, useState } from 'react';
import type { ReactNode, SyntheticEvent } from 'react';
import { ArrowDownRight, ArrowUpRight, Info, Maximize2, Minimize2, Minus } from 'lucide-react';
import { parceriaPorId } from '../domain/parcerias';
import type { ParceriaId } from '../domain/parcerias';
import { mainEstablishments } from '../gestao-v14/metrics';
import { Spark } from '../painel/chart';
import { data, pct } from '../painel/ui';
import type { CockpitCtx } from './contexto';
import { fichaDe, parceriasDe } from './fichas';
import type { FichaBloco } from './fichas';
import type { Profissional } from '../domain/profissionais';

/**
 * Componentes do cockpit V20: bloco com ampliação e ficha (i), cartão de indicador com ficha e selo de dado real.
 * A ficha diz o que o bloco mede, como calcula, de onde vêm os dados, qual cruzamento e regra usa, o que não permite concluir,
 * quando foi calculado (a data de referência do painel) e quem responde por ele. Desde a V22, um bloco cuja ficha declara `parceria`
 * mostra o marcador "!" no título: o indicador só sai do demonstrativo quando o acordo com aquele parceiro existir.
 */
/** Marcador "!" de indicador que depende de parceria; o título diz qual acordo falta. */
export function Parceria({ id, compacto }: { id: ParceriaId; compacto?: boolean }) {
  const p = parceriaPorId[id];
  return <span className={`selo selo-parceria ${compacto ? 'is-compacto' : ''}`} role="img" aria-label={`Depende de parceria com ${p.parceiro}`} title={`Depende de parceria: ${p.parceiro}. ${p.entrega}.`}>!</span>;
}
export function Bloco({ ctx, id, area, title, question, help, badge, actions, children, className }: { ctx: CockpitCtx; id: string; area: string; title: string; question?: string; help?: string; badge?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  const focus = ctx.focus === id, ficha = fichaDe(ctx.page, id);
  return <section className={`tile ck-tile ${focus ? 'is-focus' : ''} ${ficha?.parceria ? 'is-parceria' : ''} ${className ?? ''}`} style={{ gridArea: area }} aria-label={title}>
    <header><div><h3>{title}{parceriasDe(ficha).map(id => <Parceria key={id} id={id} />)}{badge}</h3>{question && <p>{question}</p>}</div>
      <div className="tile-tools">{actions}
        <FichaPop ficha={ficha} titulo={title} leitura={help} anchor={ctx.anchor} />
        <button className="icon-btn ghost-icon" aria-label={focus ? `Restaurar ${title}` : `Ampliar ${title}`} title={focus ? 'Restaurar (Esc)' : 'Ampliar'} onClick={() => ctx.toggleFocus(id)}>{focus ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
      </div></header>
    <div className="tile-body">{children}</div>
  </section>;
}

/** Ficha do bloco ou do cartão: abre num balão ao clicar no (i). Sem ficha registrada, mostra só a leitura (ajuda) quando houver. */
export function FichaPop({ ficha, titulo, leitura, anchor }: { ficha?: FichaBloco; titulo: string; leitura?: string; anchor: string }) {
  // O balão é posicionado em coordenadas da janela ao abrir, para não ser cortado pela rolagem da página nem pela borda do bloco.
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  if (!ficha && !leitura) return null;
  const abrir = (event: SyntheticEvent<HTMLDetailsElement>) => {
    const el = event.currentTarget;
    if (!el.open) { setPos(null); return; }
    const rect = el.querySelector('summary')!.getBoundingClientRect(), largura = Math.min(380, window.innerWidth * 0.8), altura = Math.min(420, window.innerHeight * 0.7);
    setPos({ left: Math.max(8, Math.min(rect.right - largura, window.innerWidth - largura - 8)), top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - altura - 8)) });
  };
  return <details className="ficha-pop" onToggle={abrir}><summary aria-label={`Ficha: ${titulo}`} title="Ficha: o que mede, como calcula, fontes, regra e limites"><Info size={14} /></summary>
    <div className="ficha-card" role="dialog" aria-label={`Ficha de ${titulo}`} style={pos ? { position: 'fixed', top: pos.top, left: pos.left, right: 'auto' } : undefined}>
      <h4>{titulo}</h4>
      {ficha ? <dl className="ficha">
        <dt>O que mede</dt><dd>{ficha.mede}</dd>
        <dt>Como calcula</dt><dd>{ficha.calcula}</dd>
        <dt>Fontes e data</dt><dd>{ficha.fontes}</dd>
        {ficha.cruzamento && <><dt>Cruzamento</dt><dd>{ficha.cruzamento}</dd></>}
        <dt>Regra e versão</dt><dd>{ficha.regra}</dd>
        <dt>Limitações</dt><dd>{ficha.limites}</dd>
        {ficha.extra?.map(([rotulo, texto]) => <Fragment key={rotulo}><dt>{rotulo}</dt><dd>{texto}</dd></Fragment>)}
        {parceriasDe(ficha).map(id => <Fragment key={id}><dt>Depende de parceria</dt><dd className="ficha-parceria"><b>{parceriaPorId[id].parceiro}</b> precisa entregar: {parceriaPorId[id].entrega.charAt(0).toLowerCase()}{parceriaPorId[id].entrega.slice(1)}. Chave: {parceriaPorId[id].chave}. Até o acordo, a camada é demonstrativa.</dd></Fragment>)}
        {leitura && <><dt>Leitura</dt><dd>{leitura}</dd></>}
        <dt>Último cálculo</dt><dd>Calculado ao abrir, com a base lida em {data(anchor)} (data de referência do painel).</dd>
        <dt>Dono</dt><dd>{ficha.dono}</dd>
        {ficha.acao && <><dt>Ação sugerida</dt><dd className="ficha-acao">{ficha.acao}</dd></>}
      </dl> : <p className="ficha-leitura">{leitura}</p>}
    </div>
  </details>;
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

/** Cartão de indicador: assunto, nome, valor, variação, série curta, meta, complemento e ficha (i) quando `ficha` e `ctx` são informados. */
export function Indicador({ aspecto, label, value, variacao, spark, cor, meta, sub, onOpen, destaque, ficha, ctx }: { aspecto?: string; label: string; value: string; variacao?: Variacao; spark?: number[]; cor?: string; meta?: { atual: number | null; alvo: number }; sub?: ReactNode; onOpen?: () => void; destaque?: boolean; ficha?: string; ctx?: CockpitCtx }) {
  const body = <>
    {aspecto && <span className="ind-aspecto">{aspecto}</span>}
    <span className="ind-label" title={label}>{label}</span>
    <span className="ind-row"><strong>{value}</strong>{spark && spark.length > 1 && <Spark values={spark} color={cor ?? 'currentColor'} />}</span>
    {variacao && <Var {...variacao} />}
    {meta && meta.atual !== null && <span className="ind-meta" title={`Meta: ${meta.alvo}%`}><i style={{ width: `${Math.max(0, Math.min(100, meta.atual))}%` }} /><b style={{ left: `${meta.alvo}%` }} /></span>}
    {sub && <span className="ind-sub">{sub}</span>}
  </>;
  const className = `ind ${destaque ? 'is-destaque' : ''} ${ficha ? 'has-ficha' : ''}`;
  const card = onOpen ? <button className={className} onClick={onOpen} title={`${label}: ver detalhe`}>{body}</button> : <div className={className}>{body}</div>;
  if (!ficha || !ctx) return card;
  const registro = fichaDe(ctx.page, ficha);
  return <div className="ind-shell">{card}{registro?.parceria && <span className="ind-parceria">{parceriasDe(registro).map(id => <Parceria key={id} id={id} compacto />)}</span>}<FichaPop ficha={registro} titulo={label} anchor={ctx.anchor} /></div>;
}

/** Linhas do painel lateral para uma lista de empresas, com valor e observação próprios de cada visual. */
export function linhasEmpresas(ctx: CockpitCtx, ids: string[], info: (id: string) => { value: string; note: string; sort: number }) {
  const companies = new Map(ctx.dataset.companies.map(row => [row.id, row])), main = mainEstablishments(ctx.dataset), cities = new Map(ctx.dataset.cities.map(row => [row.id, row.name]));
  return [...new Set(ids)].map(id => { const company = companies.get(id), place = main.get(id), extra = info(id);
    return { key: id, companyId: id, title: company?.tradeName || company?.name || id, subtitle: `${company?.rootCnpj ?? ''} · ${cities.get(place?.cityId ?? '') ?? '—'}`, value: extra.value, note: extra.note, sortValue: extra.sort }; });
}
export const nomeEmpresa = (ctx: CockpitCtx, id: string) => { const company = ctx.dataset.companies.find(row => row.id === id); return company?.tradeName || company?.name || id; };
export const carregando = <div className="loading">Calculando…</div>;
/** Proporção com a base explícita: “12 de 48 (25%)”. */
export const proporcao = (parte: number, todo: number, digits = 0) => `${parte.toLocaleString('pt-BR')} de ${todo.toLocaleString('pt-BR')}${todo ? ` (${pct(parte / todo * 100, digits)})` : ''}`;
/** Linhas do painel lateral para uma lista de profissionais (sem ficha de empresa). */
export function linhasProfissionais(ctx: CockpitCtx, rows: Profissional[], info: (row: Profissional) => { value: string; note: string; sort: number }) {
  const cities = new Map(ctx.dataset.cities.map(row => [row.id, row.name]));
  return rows.map(row => { const extra = info(row); return { key: row.id, title: row.nome, subtitle: `${row.modalidade} · ${row.nivel} · ${cities.get(row.cityId) ?? '—'}`, value: extra.value, note: extra.note, sortValue: extra.sort }; });
}
