import { municipioPorId } from '../domain/municipios';
import { tituloPorCodigo } from '../domain/titulos';
import { Fragment, useRef, useState } from 'react';
import type { ReactNode, RefObject, SyntheticEvent } from 'react';
import { ArrowDownRight, ArrowUpRight, Download, Info, Maximize2, Minimize2, Minus } from 'lucide-react';
import { baixarCsv, baixarPng, nomeArquivo } from '../painel/exportar';
import type { Celula } from '../painel/exportar';
import { parceriaPorId } from '../domain/parcerias';
import type { ParceriaId } from '../domain/parcerias';
import { mainEstablishments } from '../gestao-v14/metrics';
import { Spark } from '../painel/chart';
import { abrirComEvolucao, variacaoAnual } from '../painel/evolucao';
import type { Evolucao } from '../painel/evolucao';
import { data, pct } from '../painel/ui';
import type { CockpitCtx } from './contexto';
import { fichaDe, parceriasDe } from './fichas';
import type { FichaBloco } from './fichas';
import type { Profissional } from '../domain/profissionais';
import { statusAjuda } from './cruzamentos';
import type { StatusLigacao } from './cruzamentos';
import { variacaoPlana } from './formatos';

/**
 * Componentes do cockpit V20: bloco com ampliação e ficha (i), cartão de indicador com ficha e selo de dado real.
 * A ficha diz o que o bloco mede, como calcula, de onde vêm os dados, qual cruzamento e regra usa, o que não permite concluir,
 * e quando foi calculado (a data de referência do painel). Desde a V22, um bloco cuja ficha declara `parceria`
 * mostra o marcador "!" no título: o indicador só sai do demonstrativo quando o acordo com aquele parceiro existir.
 */
/** Confiança da ligação entre as bases (confirmado, candidato, contexto), usada na aba Método. Saiu da antiga aba Malha fina do painel geral em 03/11/2026. */
export const Status = ({ status }: { status: StatusLigacao }) => <span className={`status is-${status.toLowerCase()}`} title={statusAjuda[status]}>{status}</span>;
/** Marcador "!" de indicador que depende de parceria; o título diz qual acordo falta. */
export function Parceria({ id, compacto }: { id: ParceriaId; compacto?: boolean }) {
  const p = parceriaPorId[id];
  return <span className={`selo selo-parceria ${compacto ? 'is-compacto' : ''}`} role="img" aria-label={`Depende de parceria com ${p.parceiro}`} title={`Depende de parceria: ${p.parceiro}. ${p.entrega}.`}>!</span>;
}
/** Dados de um bloco para exportar em CSV: cabeçalho e linhas, calculados só quando o botão é apertado. */
export interface Exportavel { cabecalho: string[]; linhas: () => Celula[][] }
/**
 * Frase do bloco quando o recorte não tem nenhuma empresa com atividade de engenharia (07/11/2026, crítica de design): antes os
 * anéis e o mapa de árvore desenhavam fatias e caixas com zero, e a tela parecia ter proporções que não existiam.
 */
/** Aviso do bloco quando o recorte não tem dados (07/11/2026): no lugar de um gráfico de zeros, que parece real. */
export const avisoVazio = (vazio: boolean, quem: string) => vazio ? `${quem} neste recorte. Tire um dos filtros do alto da tela.` : undefined;
export const recorteVazio = (ctx: CockpitCtx) => avisoVazio(!ctx.model.companyFacts.some(row => row.active || row.eligibleEstablishments > 0), 'Nenhuma empresa');
export function Bloco({ ctx, id, area, title, question, help, badge, actions, children, className, exportar, vazio }: { ctx: CockpitCtx; id: string; area: string; title: string; question?: string; help?: string; badge?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; exportar?: Exportavel; vazio?: string }) {
  // No painel de Empresas o visual fica enxuto: a pergunta e a leitura do bloco vão para o (i), e o bloco mostra só o título.
  const focus = ctx.focus === id, ficha = fichaDe(ctx.page, id), leitura = ctx.enxuto ? [question, help].filter(Boolean).join(' ') || undefined : help;
  const alvo = useRef<HTMLElement>(null);
  return <section ref={alvo} className={`tile ck-tile ${focus ? 'is-focus' : ''} ${ficha?.parceria ? 'is-parceria' : ''} ${className ?? ''}`} style={{ gridArea: area }} aria-label={title}>
    <header><div><h3>{title}<Parcerias ids={parceriasDe(ficha)} />{badge}</h3>{question && !ctx.enxuto && <p>{question}</p>}</div>
      <div className="tile-tools">{actions}
        {!vazio && <ExportaPop ctx={ctx} titulo={title} exportar={exportar} alvo={alvo} />}
        <FichaPop ficha={ficha} titulo={title} leitura={leitura} anchor={ctx.anchor} />
        <button className="icon-btn ghost-icon" aria-label={focus ? `Restaurar ${title}` : `Ampliar ${title}`} title={focus ? 'Restaurar (Esc)' : 'Ampliar'} onClick={() => ctx.toggleFocus(id)}>{focus ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
      </div></header>
    <div className="tile-body">{vazio ? <p className="tile-vazio" role="status">{vazio}</p> : children}</div>
  </section>;
}

/** Um "!" só, mesmo quando o bloco depende de mais de um acordo; o título cita todos os parceiros (05/11/2026: dois "!" pareciam erro). */
export function Parcerias({ ids, compacto }: { ids: ParceriaId[]; compacto?: boolean }) {
  if (!ids.length) return null;
  if (ids.length === 1) return <Parceria id={ids[0]} compacto={compacto} />;
  const nomes = ids.map(id => parceriaPorId[id].parceiro);
  return <span className={`selo selo-parceria ${compacto ? 'is-compacto' : ''}`} role="img" aria-label={`Depende de parceria com ${nomes.join(' e ')}`} title={`Depende de parceria: ${nomes.join(' e ')}. ${ids.map(id => parceriaPorId[id].entrega).join(' ')}`}>!</span>;
}

/** Menu de exportação do bloco: os dados em CSV (quando o bloco os informa) e a imagem do gráfico em PNG (quando há SVG no bloco). */
export function ExportaPop({ ctx, titulo, exportar, alvo }: { ctx: CockpitCtx; titulo: string; exportar?: Exportavel; alvo: RefObject<HTMLElement | null> }) {
  const [aviso, setAviso] = useState('');
  const base = ['empresas', ctx.page, titulo, ctx.anchor];
  const fechar = () => { const el = alvo.current?.querySelector<HTMLDetailsElement>('details.exporta-pop'); if (el) el.open = false; };
  const csv = () => { if (!exportar) return; baixarCsv(nomeArquivo(base, 'csv'), exportar.cabecalho, exportar.linhas()); fechar(); };
  const png = async () => {
    const svg = alvo.current?.querySelector<SVGSVGElement>('.tile-body svg') ?? null, fundo = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#FFFFFF';
    const ok = await baixarPng(nomeArquivo(base, 'png'), svg, fundo); setAviso(ok ? '' : 'Este bloco não tem gráfico para salvar.'); if (ok) fechar();
  };
  return <details className="exporta-pop"><summary aria-label={`Exportar ${titulo}`} title="Exportar: dados em CSV ou imagem em PNG"><Download size={14} /></summary>
    <div className="exporta-menu" role="menu">
      {exportar && <button role="menuitem" onClick={csv}>Dados (CSV)</button>}
      <button role="menuitem" onClick={png}>Imagem (PNG)</button>
      {aviso && <p role="status">{aviso}</p>}
    </div>
  </details>;
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
        <dt>Versão da regra</dt><dd>{ficha.regra}</dd>
        <dt>Limitações</dt><dd>{ficha.limites}</dd>
        {ficha.extra?.map(([rotulo, texto]) => <Fragment key={rotulo}><dt>{rotulo}</dt><dd>{texto}</dd></Fragment>)}
        {parceriasDe(ficha).map(id => <Fragment key={id}><dt>Depende de parceria</dt><dd className="ficha-parceria"><b>{parceriaPorId[id].parceiro}</b> precisa entregar: {parceriaPorId[id].entrega.charAt(0).toLowerCase()}{parceriaPorId[id].entrega.slice(1)}. Os dados se ligam por: {parceriaPorId[id].chave}. Até o acordo ser fechado, os números são demonstrativos.</dd><dt>Se o acordo não sair</dt><dd className="ficha-planob">{parceriaPorId[id].planoB}</dd></Fragment>)}
        {leitura && <><dt>Leitura</dt><dd>{leitura}</dd></>}
        <dt>Último cálculo</dt><dd>Calculado ao abrir o painel, com a base como estava em {data(anchor)}, a data escolhida no alto da tela.</dd>
        {ficha.acao && <><dt>Ação sugerida</dt><dd className="ficha-acao">{ficha.acao}</dd></>}
      </dl> : <p className="ficha-leitura">{leitura}</p>}
    </div>
  </details>;
}

/** Selo para dados públicos reais (o restante do painel é demonstrativo, indicado no cabeçalho). */
/** Selo de dado público real. `parte` diz onde está o real quando o bloco mistura real e cenário (por exemplo, "à esquerda"). */
export const Selo = ({ data, parte }: { data: string; parte?: string }) => <span className="selo" title="Dado público real versionado no painel">{parte ? `Real ${parte}` : 'Real'} · {data.split('-').reverse().join('/')}</span>;

export interface Variacao { value: number | null; kind?: 'pct' | 'pp'; goodUp?: boolean; label?: string }
export function Var({ value, kind = 'pct', goodUp = true, label = 'em relação ao ano anterior' }: Variacao) {
  if (value === null || !Number.isFinite(value)) return <span className="delta is-none">sem base de comparação</span>;
  const plana = variacaoPlana(value, kind);
  const good = goodUp ? value >= 0 : value <= 0, Icon = plana ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  const text = kind === 'pp' ? `${value > 0 ? '+' : ''}${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p.` : `${value > 0 ? '+' : ''}${pct(value)}`;
  return <span className={`delta ${plana ? 'is-flat' : good ? 'is-good' : 'is-bad'}`}><Icon size={12} />{plana ? (kind === 'pp' ? '0 p.p.' : '0%') : text}<em>{label}</em></span>;
}

/**
 * Cartão de indicador: assunto, nome, valor, variação, série curta, meta, complemento e ficha (i) quando `ficha` e `ctx` são informados.
 * Com `serie` (05/11/2026), clicar no cartão abre o painel lateral com a evolução mês a mês acima da lista, e o cartão sem variação
 * própria ganha a variação contra um ano antes.
 */
export function Indicador({ aspecto, label, value, variacao, spark, cor, meta, sub, onOpen, destaque, ficha, ctx, serie }: { aspecto?: string; label: string; value: string; variacao?: Variacao; spark?: number[]; cor?: string; meta?: { atual: number | null; alvo: number }; sub?: ReactNode; onOpen?: () => void; destaque?: boolean; ficha?: string; ctx?: CockpitCtx; serie?: Evolucao }) {
  if (!variacao && serie && ctx) { const anual = variacaoAnual(serie, ctx.period); variacao = { ...anual, goodUp: serie.goodUp ?? true, label: 'em relação a um ano antes' }; }
  // Cartão sem lista para abrir, mas com série: abre o painel lateral só com a evolução mês a mês (05/11/2026).
  const soEvolucao = serie && ctx ? () => ctx.open({ kind: 'linhas', title: label, what: fichaDe(ctx.page, ficha ?? '')?.mede ?? 'O indicador mês a mês.', listTitle: '', rows: [], evolucao: { ...serie, nome: serie.nome ?? label } }) : undefined;
  const abrir = onOpen && serie ? () => abrirComEvolucao({ ...serie, nome: serie.nome ?? label }, onOpen) : onOpen ?? soEvolucao;
  const body = <>
    {aspecto && <span className="ind-aspecto">{aspecto}</span>}
    <span className="ind-label" title={label}>{label}</span>
    <span className="ind-row"><strong>{value}</strong>{spark && spark.length > 1 && <Spark values={spark} color={cor ?? 'currentColor'} />}</span>
    {variacao && <Var {...variacao} />}
    {meta && meta.atual !== null && <span className="ind-meta" title={`Meta: ${meta.alvo}%`}><i style={{ width: `${Math.max(0, Math.min(100, meta.atual))}%` }} /><b style={{ left: `${meta.alvo}%` }} /></span>}
    {sub && <span className="ind-sub">{sub}</span>}
  </>;
  const className = `ind ${destaque ? 'is-destaque' : ''} ${ficha ? 'has-ficha' : ''}`;
  const card = abrir ? <button className={className} onClick={abrir} title={!onOpen ? `${label}: ver a evolução mês a mês` : serie ? `${label}: ver a evolução mês a mês e a lista` : `${label}: ver detalhe`}>{body}</button> : <div className={className}>{body}</div>;
  if (!ficha || !ctx) return card;
  const registro = fichaDe(ctx.page, ficha);
  return <div className="ind-shell">{card}{registro?.parceria && <span className="ind-parceria"><Parcerias ids={parceriasDe(registro)} compacto /></span>}<FichaPop ficha={registro} titulo={label} anchor={ctx.anchor} /></div>;
}

/** Linhas do painel lateral para uma lista de empresas, com valor e observação próprios de cada visual. */
export function linhasEmpresas(ctx: CockpitCtx, ids: string[], info: (id: string) => { value: string; note: string; sort: number }) {
  const companies = new Map(ctx.dataset.companies.map(row => [row.id, row])), main = mainEstablishments(ctx.dataset), cities = new Map([...municipioPorId(ctx.dataset).values()].map(row => [row.id, row.nome]));
  return [...new Set(ids)].map(id => { const company = companies.get(id), place = main.get(id), extra = info(id);
    return { key: id, companyId: id, title: company?.tradeName || company?.name || id, subtitle: `${company?.rootCnpj ?? ''} · ${cities.get(place?.cityId ?? '') ?? '—'}`, value: extra.value, note: extra.note, sortValue: extra.sort }; });
}
export const nomeEmpresa = (ctx: CockpitCtx, id: string) => { const company = ctx.dataset.companies.find(row => row.id === id); return company?.tradeName || company?.name || id; };
export const carregando = <div className="loading">Calculando…</div>;
/** Proporção com a base explícita: “12 de 48 (25%)”. */
export const proporcao = (parte: number, todo: number, digits = 0) => `${parte.toLocaleString('pt-BR')} de ${todo.toLocaleString('pt-BR')}${todo ? ` (${pct(parte / todo * 100, digits)})` : ''}`;
/** Linhas do painel lateral para uma lista de profissionais (sem ficha de empresa). */
export function linhasProfissionais(ctx: CockpitCtx, rows: Profissional[], info: (row: Profissional) => { value: string; note: string; sort: number }) {
  const cities = new Map([...municipioPorId(ctx.dataset).values()].map(row => [row.id, row.nome]));
  return rows.map(row => { const extra = info(row); return { key: row.id, title: row.nome, subtitle: `${tituloPorCodigo.get(row.titulo)?.titulo ?? `${row.modalidade} · ${row.nivel}`} · ${cities.get(row.cityId) ?? '—'}`, value: extra.value, note: extra.note, sortValue: extra.sort }; });
}
