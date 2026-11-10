import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { data, int } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador } from '../cockpit/ui';
import type { Exportavel } from '../cockpit/ui';
import { TOTAL_METRICAS, calendarioEntregas, indicadoresDoCrea, metricas, notasCaderno2021, subprogramas } from '../domain/sistema-confea';
import type { Conferencia, SituacaoMetrica } from '../domain/sistema-confea';
import { abrirIndicador, abrirMetricas, nomeCurto, s } from './comum';

/**
 * Painel de Indicadores do Sistema, página Entrega ao Confea (10/11/2026): o que falta antes de mandar a planilha. Quantas das 161
 * métricas estão preenchidas, quais fórmulas de verificação não fecham, quantos dos 29 indicadores do Crea-SP dá para calcular, as
 * próximas entregas da PL-2260/2023 e, para cada nota do Caderno de 2021 que citou o Crea-SP, se o problema continua.
 * A conferência é sempre do Conselho inteiro: a planilha vai inteira, sem regional.
 */
const DIA = 86_400_000;
const dias = (de: string, ate: string) => Math.round((Date.parse(ate) - Date.parse(de)) / DIA);
export default function PaginaEntrega({ ctx }: { ctx: CockpitCtx }) {
  const q = s(ctx), sit = [...q.situacao.values()], vazias = sit.filter(v => v === 'Vazia').length, erros = q.conferencias.filter(c => c.situacao === 'Não fecha').length;
  const calculaveis = indicadoresDoCrea.filter(c => q.porExercicio.find(e => e.exercicio.ano === q.exercicio.ano)!.indicadores.get(c)?.valor !== null).length, proxima = q.calendario[0];
  return <div className="ck-grid ck-grid-cf-entrega">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Situação da entrega">
      <Indicador ctx={ctx} ficha="k-preenchidas" destaque aspecto={`Exercício ${q.exercicio.rotulo}`} label="Métricas preenchidas" value={`${int(TOTAL_METRICAS - vazias)} de ${TOTAL_METRICAS}`}
        meta={{ atual: (TOTAL_METRICAS - vazias) / TOTAL_METRICAS * 100, alvo: 100 }} sub={vazias ? `${int(vazias)} vazias` : 'nenhuma vazia'}
        onOpen={() => abrirMetricas(ctx, 'Métricas vazias', metricas.filter(m => q.situacao.get(m.codigo) === 'Vazia').map(m => m.codigo), 'Métricas sem valor no exercício. Na planilha, vazia não é zero: o Confea deixa o Crea-SP de fora do indicador e cita em nota no Caderno de Resultados.')} />
      <Indicador ctx={ctx} ficha="k-conferencias" label="Conferências que não fecham" value={int(erros)} sub={`de ${int(q.conferencias.length)} conferências`}
        onOpen={() => abrirConferencias(ctx, q.conferencias.filter(c => c.situacao !== 'Fecha'))} />
      <Indicador ctx={ctx} ficha="k-calculaveis" label="Indicadores que saem" value={`${int(calculaveis)} de ${int(indicadoresDoCrea.length)}`} meta={{ atual: calculaveis / indicadoresDoCrea.length * 100, alvo: 100 }}
        sub="os seis da 3ª instância são do Confea" onOpen={() => abrirIndicadores(ctx)} />
      <Indicador ctx={ctx} ficha="k-proxima" label="Próxima entrega" value={proxima ? data(proxima.data) : '—'} sub={proxima ? `${proxima.ritmo.toLowerCase()}, em ${int(dias(ctx.anchor, proxima.data))} dias` : undefined} />
      <Indicador ctx={ctx} ficha="k-processo" label="Processo de contas" value={(() => { const e = calendarioEntregas(ctx.anchor, 40).find(c => c.data.endsWith('-04-01')); return e ? data(e.data) : '—'; })()} sub="peça III: esta planilha preenchida" />
    </section>
    <Bloco ctx={ctx} id="sp" area="sp" title="As 161 métricas por subprograma" exportar={exportarSubprogramas(ctx)}><Subprogramas ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="co" area="co" title="Conferências antes do envio" exportar={{ cabecalho: ['Tipo', 'Conferência', 'Métricas', 'Situação', 'Diferença'], linhas: () => s(ctx).conferencias.map(c => [c.tipo === 'soma' ? 'Fórmula de verificação' : 'Coerência', c.texto, c.metricas.join(' '), c.situacao, c.diferenca]) }}><Conferencias ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ca" area="ca" title="O calendário de entregas" exportar={{ cabecalho: ['Data', 'Ritmo', 'O que vai', 'O que acontece'], linhas: () => s(ctx).calendario.map(e => [e.data, e.ritmo, e.o_que, e.consequencia]) }}><Calendario ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="no" area="no" title="O que o Caderno de 2021 apontou, hoje" exportar={exportarNotas(ctx)}><Notas ctx={ctx} /></Bloco>
  </div>;
}

function abrirConferencias(ctx: CockpitCtx, lista: Conferencia[]) {
  ctx.open({ kind: 'linhas', title: 'Conferências que não fecham', what: 'As fórmulas de verificação da planilha (o total menos a soma das partes dá zero) e as coerências que o Confea usa para descartar um número.', use: 'Acerte na origem, antes do envio: o Caderno de 2021 descartou o Crea-SP por erro de conta.', listTitle: 'Conferências',
    rows: lista.map((c, i) => ({ key: String(i), title: c.texto, subtitle: `Métricas ${c.metricas.join(', ')}`, value: c.situacao, note: c.diferenca ? `diferença de ${int(c.diferenca)}` : '', sortValue: i })) });
}
function abrirIndicadores(ctx: CockpitCtx) {
  const q = s(ctx);
  ctx.open({ kind: 'linhas', title: 'Indicadores do Crea-SP', what: 'Os 29 indicadores que o Confea calcula com as métricas do Crea-SP, no exercício escolhido, do Conselho inteiro.', listTitle: 'Indicadores, na ordem do código',
    rows: indicadoresDoCrea.map(c => { const v = q.porExercicio.find(e => e.exercicio.ano === q.exercicio.ano)!.indicadores.get(c)!; return { key: String(c), title: `${c}. ${nomeCurto[c]}`, subtitle: v.falta.length ? `Faltam as métricas ${v.falta.join(', ')}` : 'Sai com as métricas do exercício', value: v.valor === null ? 'não sai' : 'sai', note: '', sortValue: c }; }) });
}

/* ---------- Situação por subprograma ---------- */
const SITUACOES: SituacaoMetrica[] = ['Preenchida', 'Não fecha', 'Vazia'];
const exportarSubprogramas = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Subprograma', ...SITUACOES], linhas: () => subprogramas.map(sp => [sp, ...SITUACOES.map(st => metricas.filter(m => m.subprograma === sp && s(ctx).situacao.get(m.codigo) === st).length)]) });
function Subprogramas({ ctx }: { ctx: CockpitCtx }) {
  const q = s(ctx), { tokens } = ctx, cores = [tokens.good, tokens.warn, tokens.bad];
  const lista = (sp: string, st: SituacaoMetrica) => metricas.filter(m => m.subprograma === sp && q.situacao.get(m.codigo) === st);
  const option = useMemo(() => ({
    grid: { top: 26, right: 130, bottom: 2, left: 2, containLabel: true }, legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 11 }, data: [...SITUACOES] },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: subprogramas, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    // Um rótulo só no fim da barra junta o que não está preenchido ("1 não fecha e 1 vazia"), para os rótulos não se sobreporem.
    series: [...SITUACOES.map((st, i) => ({ name: st, type: 'bar', stack: 's', barMaxWidth: 18, data: subprogramas.map(sp => lista(sp, st).length), itemStyle: { color: cores[i], borderColor: tokens.surface, borderWidth: 1 },
      label: { show: !i, position: 'inside', color: '#FFFFFF', fontSize: 11, fontWeight: 700, formatter: (p: any) => p.value ? int(p.value) : '' } })),
      { name: 'rótulo', type: 'bar', stack: 's', data: subprogramas.map(() => 0), itemStyle: { color: 'transparent' }, tooltip: { show: false },
        label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (p: any) => SITUACOES.slice(1).map(st => [lista(subprogramas[p.dataIndex], st).length, st.toLowerCase()] as const).filter(([n]) => n).map(([n, st]) => `${int(n)} ${st}`).join(' e ') } }],
  }), [q, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Métricas de cada subprograma: preenchidas, que não fecham com a soma das partes e vazias"
    onPick={p => { const sp = subprogramas[p.dataIndex], st = SITUACOES[p.seriesIndex]; if (sp && st) abrirMetricas(ctx, `${sp}: ${st.toLowerCase()}`, lista(sp, st).map(m => m.codigo), `Métricas do subprograma ${sp} na situação "${st}".`); }} />;
}

/* ---------- Conferências ---------- */
function Conferencias({ ctx }: { ctx: CockpitCtx }) {
  const q = s(ctx), ordem = { 'Não fecha': 0, 'Falta métrica': 1, Fecha: 2 } as const, lista = [...q.conferencias].sort((a, b) => ordem[a.situacao] - ordem[b.situacao]);
  return <div className="table-wrap"><table className="metodo is-dense cf-conferencias">
    <thead><tr><th scope="col">Conferência</th><th scope="col" className="num">Situação</th></tr></thead>
    <tbody>{lista.map((c, i) => { const abrir = () => abrirMetricas(ctx, c.texto, c.metricas, c.tipo === 'soma' ? 'Fórmula de verificação da planilha: o total menos a soma das partes tem de dar zero.' : 'Coerência que o Confea usa para descartar um número.');
      return <tr key={i} className={`is-clicavel ${c.situacao === 'Não fecha' ? 'is-erro' : c.situacao === 'Falta métrica' ? 'is-vazia' : ''}`} tabIndex={0}
      onClick={abrir} onKeyDown={event => { if (event.key === 'Enter') abrir(); }}>
      <td>{c.tipo === 'soma' ? <span className="cf-codigo">soma</span> : <span className="cf-codigo is-meta">coerência</span>} {c.texto}</td>
      <td className="num">{c.situacao === 'Fecha' ? 'fecha' : <b className="cf-alerta">{c.situacao === 'Não fecha' ? `não fecha${c.diferenca ? ` (${c.diferenca > 0 ? '+' : ''}${int(c.diferenca)})` : ''}` : 'falta métrica'}</b>}</td></tr>; })}</tbody></table></div>;
}

/* ---------- Calendário ---------- */
function Calendario({ ctx }: { ctx: CockpitCtx }) {
  const q = s(ctx);
  return <ol className="cf-calendario">{q.calendario.map((e, i) => <li key={i} className={`is-${e.ritmo.toLowerCase()}`}>
    <time dateTime={e.data}><b>{data(e.data).slice(0, 5)}</b><small>{e.data.slice(0, 4)}</small></time>
    <div><span className="cf-ritmo">{e.ritmo}</span> <span className="cf-faltam">em {int(dias(ctx.anchor, e.data))} dias</span><p>{e.o_que}</p><small>{e.consequencia}</small></div></li>)}</ol>;
}

/* ---------- Notas do Caderno de 2021 ---------- */
const hoje = (ctx: CockpitCtx, n: typeof notasCaderno2021[number]) => {
  const q = s(ctx), vazias = n.metricas.filter(c => q.estado.get(c) === null), naoFecham = n.metricas.filter(c => q.situacao.get(c) === 'Não fecha');
  const semIndicador = n.indicadores.filter(c => q.porExercicio.find(e => e.exercicio.ano === q.exercicio.ano)!.indicadores.get(c)?.valor === null);
  return vazias.length ? `Continua: faltam ${vazias.join(', ')}` : naoFecham.length ? `Continua: ${naoFecham.join(', ')} não fecha` : semIndicador.length ? `Indicador ${semIndicador.join(', ')} não sai` : 'Resolvido';
};
const exportarNotas = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Nota', 'Assunto', 'O que houve em 2021', 'Métricas', 'Indicadores', `Hoje (${s(ctx).exercicio.rotulo})`], linhas: () => notasCaderno2021.map(n => [n.nota, n.assunto, n.houve, n.metricas.join(' '), n.indicadores.join(' '), hoje(ctx, n)]) });
function Notas({ ctx }: { ctx: CockpitCtx }) {
  return <div className="table-wrap"><table className="metodo is-dense cf-notas">
    <thead><tr><th scope="col">Nota</th><th scope="col">Em 2021</th><th scope="col">Hoje</th></tr></thead>
    <tbody>{notasCaderno2021.map(n => { const h = hoje(ctx, n);
      const abrir = () => n.indicadores.length === 1 ? abrirIndicador(ctx, n.indicadores[0]) : abrirMetricas(ctx, `Nota ${n.nota}: ${n.assunto}`, n.metricas, `${n.houve} no Caderno de 2021.`);
      return <tr key={n.nota} className="is-clicavel" tabIndex={0} onClick={abrir}
        onKeyDown={event => { if (event.key === 'Enter') abrir(); }}>
        <th scope="row">{n.nota}</th><td><b>{n.houve}</b><br /><small>{n.assunto}</small></td><td>{h === 'Resolvido' ? 'resolvido' : <b className="cf-alerta">{h.toLowerCase()}</b>}</td></tr>; })}</tbody></table></div>;
}
