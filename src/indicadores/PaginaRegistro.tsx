import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { int } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco } from '../cockpit/ui';
import type { Exportavel } from '../cockpit/ui';
import { metasPmf, metricaPorCodigo, referencias2021 } from '../domain/sistema-confea';
import { CartaoIndicador, Codigo, ListaMetricas, abrirIndicador, abrirMetricas, exportarMetricas, fmtIndicador, nomeCurto, s } from './comum';

/**
 * Painel de Indicadores do Sistema, página Registro (10/11/2026): os indicadores 1 a 7 da planilha do Confea (crescimento de
 * profissionais e empresas, quadro técnico, ART e CAT), cada exercício lado a lado com a referência do Sistema, os profissionais por
 * modalidade, as regionais e as 30 métricas do subprograma.
 */
const DO_REGISTRO = [1, 2, 3, 4, 5, 6, 7];
export default function PaginaRegistro({ ctx }: { ctx: CockpitCtx }) {
  return <div className="ck-grid ck-grid-cf-registro">
    <section className="ck-cards is-seven" style={{ gridArea: 'kpi' }} aria-label="Indicadores do Registro">
      <CartaoIndicador ctx={ctx} codigo={1} ficha="k-1" destaque />
      <CartaoIndicador ctx={ctx} codigo={2} ficha="k-2" />
      <CartaoIndicador ctx={ctx} codigo={3} ficha="k-3" />
      <CartaoIndicador ctx={ctx} codigo={4} ficha="k-4" />
      <CartaoIndicador ctx={ctx} codigo={5} ficha="k-5" />
      <CartaoIndicador ctx={ctx} codigo={6} ficha="k-6" />
      <CartaoIndicador ctx={ctx} codigo={7} ficha="k-7" />
    </section>
    <Bloco ctx={ctx} id="ex" area="ex" title={`Os indicadores do Registro em cada exercício${s(ctx).greId ? " (Conselho inteiro)" : ""}`} exportar={exportarExercicios(ctx, DO_REGISTRO)}><TabelaExercicios ctx={ctx} codigos={DO_REGISTRO} meta="registro" /></Bloco>
    <Bloco ctx={ctx} id="mo" area="mo" title="Profissionais ativos por modalidade" exportar={exportarModalidades(ctx)}><Modalidades ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="gr" area="gr" title="O registro em cada regional" exportar={exportarRegionais(ctx)}><Regionais ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="fo" area="fo" title="As 30 métricas do Registro" exportar={exportarMetricas(ctx, ['Registro'])}><ListaMetricas ctx={ctx} subs={['Registro']} /></Bloco>
  </div>;
}

/* ---------- Cada indicador em cada exercício, com a referência do Sistema ---------- */
export const exportarExercicios = (ctx: CockpitCtx, codigos: number[]): Exportavel => ({ cabecalho: ['Indicador', 'Nome', ...s(ctx).porExercicio.map(e => e.exercicio.rotulo), 'Sistema em 2021', 'Sudeste em 2021'],
  linhas: () => codigos.map(c => [c, nomeCurto[c], ...s(ctx).porExercicio.map(e => e.indicadores.get(c)?.valor ?? null), referencias2021[c]?.brasil ?? null, referencias2021[c]?.sudeste ?? null]) });
/**
 * Tabela dos exercícios: uma linha por indicador, uma coluna por exercício (do Conselho inteiro) e a referência do Sistema em 2021.
 * O exercício escolhido no alto fica marcado. `meta` acrescenta a linha da meta do PMF que acompanha a página, fora da planilha.
 */
export function TabelaExercicios({ ctx, codigos, meta }: { ctx: CockpitCtx; codigos: number[]; meta?: keyof typeof metasPmf }) {
  const q = s(ctx), anos = q.porExercicio;
  return <div className="table-wrap"><table className="metodo is-dense cf-exercicios">
    <thead><tr><th scope="col">Indicador</th>{anos.map(e => <th key={e.exercicio.ano} scope="col" className={`num ${e.exercicio.ano === q.exercicio.ano ? 'is-atual' : ''}`}>{e.exercicio.parcial ? `${e.exercicio.ano}*` : e.exercicio.ano}</th>)}<th scope="col" className="num" title="Média dos Creas no Caderno de Resultados de 2021">Sistema 2021</th></tr></thead>
    <tbody>{codigos.map(c => <tr key={c} className="is-clicavel" tabIndex={0} onClick={() => abrirIndicador(ctx, c)} onKeyDown={event => { if (event.key === 'Enter') abrirIndicador(ctx, c); }}>
      <th scope="row"><Codigo tipo="I" codigo={c} /> {nomeCurto[c]}</th>
      {anos.map(e => { const v = e.indicadores.get(c); return <td key={e.exercicio.ano} className={`num ${e.exercicio.ano === q.exercicio.ano ? 'is-atual' : ''}`}>{v?.falta.length ? <b className="cf-alerta" title={`Faltam as métricas ${v.falta.join(', ')}`}>falta</b> : fmtIndicador(c, v?.valor)}</td>; })}
      <td className="num cf-antes">{referencias2021[c] ? fmtIndicador(c, referencias2021[c].brasil) : '—'}</td></tr>)}
      {meta && <tr className="cf-meta-linha"><th scope="row"><span className="cf-codigo is-meta">PMF {metasPmf[meta].codigo}</span> {metasPmf[meta].texto}</th>
        <td className="num" colSpan={anos.length + 1}>{q.exercicio.rotulo}: <b>{fmtMeta(ctx, meta)}</b> no prazo; a meta é {metasPmf[meta].alvo}%</td></tr>}</tbody></table>
    {anos.some(e => e.exercicio.parcial) && <p className="cf-nota">* Exercício em curso, até a data de referência. A tabela é do Conselho inteiro.</p>}</div>;
}
const fmtMeta = (ctx: CockpitCtx, meta: keyof typeof metasPmf) => { const f = s(ctx).fora; return `${(meta === 'registro' ? f.registro30 : meta === 'julgamento' ? f.julgados180 : f.etica360).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`; };

/* ---------- Profissionais por modalidade (métricas 11 a 18) ---------- */
const MODALIDADES = [11, 12, 13, 14, 15, 16, 17, 18];
const nomeModalidade = (c: number) => metricaPorCodigo.get(c)!.nome.replace('Nº de profissionais - ', '').replace('Especial (Seg. Trabalho)', 'Segurança do Trabalho');
const exportarModalidades = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Métrica', 'Modalidade', 'Profissionais', 'Exercício anterior'], linhas: () => MODALIDADES.map(c => [c, nomeModalidade(c), s(ctx).metricas.get(c) ?? null, s(ctx).metricasAntes.get(c) ?? null]) });
function Modalidades({ ctx }: { ctx: CockpitCtx }) {
  const q = s(ctx), { tokens } = ctx, linhas = MODALIDADES.map(c => ({ c, nome: nomeModalidade(c), v: q.metricas.get(c) ?? 0, antes: q.metricasAntes.get(c) ?? null })).sort((a, b) => b.v - a.v);
  const option = useMemo(() => ({
    grid: { top: 4, right: 80, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const l = linhas[items[0].dataIndex]; return `<b>${l.nome}</b> (métrica ${l.c})<br/>${int(l.v)} profissionais${l.antes ? `<br/>${q.anterior?.rotulo}: ${int(l.antes)}` : ''}`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: linhas.map(l => l.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [{ type: 'bar', barMaxWidth: 16, data: linhas.map(l => l.v), itemStyle: { color: tokens.brand, borderRadius: [0, 3, 3, 0] },
      label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (p: any) => { const l = linhas[p.dataIndex], d = l.antes ? (l.v - l.antes) / l.antes * 100 : null; return `${int(l.v)}${d === null ? '' : `  ${d >= 0 ? '+' : ''}${d.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}`; } } }],
  }), [linhas, tokens, q.anterior]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Profissionais ativos por modalidade, com a variação contra o exercício anterior" onPick={p => { const l = linhas[p.dataIndex]; if (l) abrirMetricas(ctx, l.nome, [l.c], 'Profissionais com registro ativo na modalidade em 31/12, ou na data no exercício em curso.'); }} />;
}

/* ---------- As regionais ---------- */
const COLUNAS: { titulo: string; valor: (m: Map<number, number | null>, i: Map<number, { valor: number | null }>) => number | null; fmt: (v: number | null) => string }[] = [
  { titulo: 'Profissionais', valor: m => (m.get(3) ?? 0) + (m.get(8) ?? 0), fmt: v => v === null ? '—' : int(v) },
  { titulo: 'Crescimento', valor: (_, i) => i.get(1)?.valor ?? null, fmt: v => fmtIndicador(1, v) },
  { titulo: 'Empresas', valor: m => m.get(21) ?? null, fmt: v => v === null ? '—' : int(v) },
  { titulo: 'Crescimento', valor: (_, i) => i.get(2)?.valor ?? null, fmt: v => fmtIndicador(2, v) },
  { titulo: 'Registram ART', valor: (_, i) => i.get(4)?.valor ?? null, fmt: v => fmtIndicador(4, v) },
  { titulo: 'ARTs por profissional', valor: (_, i) => i.get(5)?.valor ?? null, fmt: v => fmtIndicador(5, v) },
];
const exportarRegionais = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Regional', 'Profissionais ativos', 'Crescimento dos profissionais (%)', 'Empresas ativas', 'Crescimento das empresas (%)', 'Profissionais que registram ART (%)', 'ARTs por profissional'],
  linhas: () => s(ctx).regionais.map(r => [ctx.dataset.gres.find(g => g.id === r.greId)?.name ?? r.greId, ...COLUNAS.map(col => col.valor(r.metricas, r.indicadores))]) });
/** Uma linha por regional; a escolhida no alto fica marcada. Clicar filtra a regional. */
export function Regionais({ ctx, colunas = COLUNAS }: { ctx: CockpitCtx; colunas?: typeof COLUNAS }) {
  const q = s(ctx), nome = new Map(ctx.dataset.gres.map(g => [g.id, g.name]));
  return <div className="table-wrap"><table className="metodo is-dense cf-regionais">
    <thead><tr><th scope="col">Regional</th>{colunas.map((col, i) => <th key={i} scope="col" className="num">{col.titulo}</th>)}</tr></thead>
    <tbody>{q.regionais.map(r => <tr key={r.greId} className={`is-clicavel ${ctx.greId === r.greId ? 'is-atual' : ''}`} tabIndex={0} onClick={() => ctx.filterGre(r.greId)} onKeyDown={event => { if (event.key === 'Enter') ctx.filterGre(r.greId); }} title="Clique para escolher a regional no alto da tela">
      <th scope="row">{nome.get(r.greId)}</th>{colunas.map((col, i) => <td key={i} className="num">{col.fmt(col.valor(r.metricas, r.indicadores))}</td>)}</tr>)}</tbody></table></div>;
}
export type ColunaRegional = (typeof COLUNAS)[number];
