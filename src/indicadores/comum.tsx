import type { ReactNode } from 'react';
import type { CockpitCtx } from '../cockpit/contexto';
import { Indicador, Selo } from '../cockpit/ui';
import type { Exportavel } from '../cockpit/ui';
import { brl, int } from '../painel/ui';
import { DA_TERCEIRA_INSTANCIA, nomeCurtoIndicador, emDias, indicadorRegional, emPorcentagem, emReais, fonteSumario, indicadorPorCodigo, metricaPorCodigo, metricas, metricasDoIndicador, reais, referencias2021 } from '../domain/sistema-confea';
import type { QuadroSistema, Subprograma } from '../domain/sistema-confea';

/**
 * Peças comuns do painel de Indicadores do Sistema (10/11/2026). Cada número leva o código da métrica ou do indicador da planilha do
 * Confea numa etiqueta (o detalhe próprio do painel), para quem confere a planilha achar a linha sem procurar. As regras são as dos
 * outros painéis: clicar abre a lista no painel lateral, a explicação fica no (i) e cada página cabe numa tela.
 */
export const s = (ctx: CockpitCtx): QuadroSistema => ctx.sistema!;

/** Nome curto de cada indicador (fica no domínio, porque o pacote Power BI também usa). */
export const nomeCurto = nomeCurtoIndicador;

/* ---------- Formatos ---------- */
const dec = (v: number, casas: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
/** Valor de um indicador: as taxas em % com uma casa; as médias com duas casas. */
export const fmtIndicador = (codigo: number, v: number | null | undefined) => v === null || v === undefined ? '—' : emPorcentagem(codigo) ? `${dec(v, 1)}%` : dec(v, 2);
/** Valor de uma métrica: reais, dias ou contagem. */
export const fmtMetrica = (codigo: number, v: number | null | undefined) => v === null || v === undefined ? 'vazia' : emReais(codigo) ? brl(v) : emDias(codigo) ? `${int(v)} dias` : int(v);
/** Etiqueta com o código: "M 37" para métrica, "I 12" para indicador. */
export const Codigo = ({ tipo, codigo }: { tipo: 'M' | 'I'; codigo: number }) => <span className="cf-codigo" title={tipo === 'M' ? `Métrica ${codigo} da planilha do Confea` : `Indicador ${codigo} da planilha do Confea`}>{tipo}{' '}{codigo}</span>;
/** Referência do Sistema em 2021 (Caderno de Resultados do Confea), escrita para o cartão. */
export function referencia(codigo: number) {
  const ref = referencias2021[codigo]; if (!ref) return null;
  return `Sistema em 2021: ${fmtIndicador(codigo, ref.brasil)}${ref.sudeste !== undefined ? `; Sudeste: ${fmtIndicador(codigo, ref.sudeste)}` : ''}`;
}
/** Diferença contra o exercício anterior: pontos percentuais nas taxas, % nas médias. */
export function variacao(q: QuadroSistema, codigo: number, sobeEBom = true) {
  const agora = q.indicadores.get(codigo)?.valor ?? null, antes = q.indicadoresAntes?.get(codigo)?.valor ?? null, label = q.anterior ? `em relação a ${q.anterior.rotulo}` : 'sem exercício anterior';
  if (agora === null || antes === null) return { value: null, label };
  return emPorcentagem(codigo) ? { value: agora - antes, kind: 'pp' as const, goodUp: sobeEBom, label } : { value: antes ? (agora - antes) / antes * 100 : null, goodUp: sobeEBom, label };
}

/* ---------- Painel lateral ---------- */
/** As métricas de uma lista no painel lateral: código, nome, valor no exercício e no anterior, situação e definição. */
export function abrirMetricas(ctx: CockpitCtx, title: string, codigos: number[], what: string, use?: string) {
  const q = s(ctx);
  ctx.open({ kind: 'linhas', title, eyebrow: `Exercício ${q.exercicio.rotulo}`, what, use, listTitle: 'Métricas da planilha, na ordem do código',
    summary: [['Métricas', int(codigos.length)], ['Vazias', int(codigos.filter(c => q.metricas.get(c) === null).length)], ['Que não fecham', int(codigos.filter(c => q.situacao.get(c) === 'Não fecha').length)]],
    rows: codigos.map(c => { const m = metricaPorCodigo.get(c)!, v = q.metricas.get(c) ?? null, antes = q.metricasAntes.get(c);
      return { key: String(c), title: `${c}. ${m.nome}`, subtitle: [m.definicao, q.doEstado(c) ? 'Do Conselho inteiro.' : ''].filter(Boolean).join(' '), value: fmtMetrica(c, v),
        note: [q.situacao.get(c) === 'Não fecha' && !q.greId ? 'não fecha com a soma das partes' : '', q.anterior && antes !== undefined ? `${q.anterior.rotulo}: ${fmtMetrica(c, antes)}` : '', q.real(c) ? reais[c].texto : ''].filter(Boolean).join('; '), sortValue: c }; }) });
}
/** O indicador no painel lateral: a fórmula oficial e as métricas que ele usa, com os valores do exercício. */
export function abrirIndicador(ctx: CockpitCtx, codigo: number) {
  const ind = indicadorPorCodigo.get(codigo)!, q = s(ctx), v = q.indicadores.get(codigo);
  abrirMetricas(ctx, `${codigo}. ${ind.nome}`, metricasDoIndicador(codigo), `Fórmula do Confea: ${ind.formula}${ind.observacao ? ` Observação da planilha: ${ind.observacao}` : ''}`,
    v?.falta.length ? `Faltam as métricas ${v.falta.join(', ')}: sem elas, o Confea não calcula o indicador e o Crea-SP aparece em nota no Caderno de Resultados.` : referencia(codigo) ?? undefined);
}

/* ---------- Cartão de indicador ---------- */
export function CartaoIndicador({ ctx, codigo, ficha, destaque, sobeEBom = true, sub }: { ctx: CockpitCtx; codigo: number; ficha: string; destaque?: boolean; sobeEBom?: boolean; sub?: ReactNode }) {
  const q = s(ctx), v = q.indicadores.get(codigo)!, regional = Boolean(q.greId) && !v.terceira && !indicadorRegional(codigo);
  const linha = sub ?? (v.falta.length ? `Faltam as métricas ${v.falta.join(', ')}` : [referencia(codigo), regional ? 'do Conselho inteiro' : ''].filter(Boolean).join('; ') || undefined);
  return <Indicador ctx={ctx} ficha={ficha} destaque={destaque} aspecto={`Indicador ${codigo}`} label={nomeCurto[codigo]} value={fmtIndicador(codigo, v.valor)} variacao={variacao(q, codigo, sobeEBom)}
    sub={linha} onOpen={() => abrirIndicador(ctx, codigo)} />;
}

/* ---------- Lista das métricas de um subprograma ---------- */
export const situacaoTexto = (q: QuadroSistema, c: number) => q.metricas.get(c) === null ? 'Vazia' : !q.greId && q.situacao.get(c) === 'Não fecha' ? 'Não fecha' : 'Preenchida';
export const exportarMetricas = (ctx: CockpitCtx, subs: Subprograma[]): Exportavel => ({ cabecalho: ['Código', 'Subprograma', 'Tema', 'Métrica', 'Valor', 'Exercício anterior', 'Situação'],
  linhas: () => { const q = s(ctx); return metricas.filter(m => subs.includes(m.subprograma)).map(m => [m.codigo, m.subprograma, m.tema, m.nome, q.metricas.get(m.codigo) ?? null, q.metricasAntes.get(m.codigo) ?? null, situacaoTexto(q, m.codigo)]); } });
/** A folha da planilha: as métricas do subprograma com o valor no exercício, o anterior e a situação. Rola dentro do bloco. */
export function ListaMetricas({ ctx, subs }: { ctx: CockpitCtx; subs: Subprograma[] }) {
  const q = s(ctx), linhas = metricas.filter(m => subs.includes(m.subprograma));
  return <div className="table-wrap cf-folha" role="region" aria-label="Métricas da planilha" tabIndex={0}><table className="metodo is-dense">
    <thead><tr><th scope="col">Cód.</th><th scope="col">Métrica</th><th scope="col" className="num">{q.exercicio.rotulo}</th><th scope="col" className="num">{q.anterior?.rotulo ?? 'Anterior'}</th></tr></thead>
    <tbody>{linhas.map(m => { const sit = situacaoTexto(q, m.codigo);
      return <tr key={m.codigo} className={`is-clicavel ${sit === 'Vazia' ? 'is-vazia' : sit === 'Não fecha' ? 'is-erro' : ''}`} tabIndex={0} onClick={() => abrirMetricas(ctx, `Métrica ${m.codigo}`, [m.codigo], m.orientacao || m.definicao)}
        onKeyDown={event => { if (event.key === 'Enter') abrirMetricas(ctx, `Métrica ${m.codigo}`, [m.codigo], m.orientacao || m.definicao); }}>
        <td><Codigo tipo="M" codigo={m.codigo} /></td><td className="cf-nome" title={m.nome}>{m.nome}{q.doEstado(m.codigo) && <em> (Conselho inteiro)</em>}</td>
        <td className="num">{sit === 'Vazia' ? <b className="cf-alerta">vazia</b> : <>{fmtMetrica(m.codigo, q.metricas.get(m.codigo))}{sit === 'Não fecha' && <b className="cf-alerta" title="A soma das partes não dá o total"> ≠</b>}{q.real(m.codigo) && <span className="cf-real" title={`${reais[m.codigo].texto}. ${fonteSumario.nome}`}> R</span>}</>}</td>
        <td className="num cf-antes">{fmtMetrica(m.codigo, q.metricasAntes.get(m.codigo))}</td></tr>; })}</tbody></table></div>;
}

/** Selo de dado real quando o exercício escolhido é o do Sumário de 2025 e não há regional. */
export const SeloReal = ({ ctx, parte }: { ctx: CockpitCtx; parte?: string }) => s(ctx).real(37) ? <Selo data={fonteSumario.data} parte={parte} /> : null;

/** Os indicadores da 3ª instância ficam no Confea: o cartão e as tabelas mostram só a referência do Sistema. */
export const daTerceira = (codigo: number) => DA_TERCEIRA_INSTANCIA.includes(codigo);
