import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador } from '../cockpit/ui';
import type { Exportavel } from '../cockpit/ui';
import { MapaMunicipios } from '../gestao/comum';
import type { Medida } from '../gestao/comum';
import { municipioPorId } from '../domain/municipios';
import { metasPmf, metricaPorCodigo } from '../domain/sistema-confea';
import { CartaoIndicador, ListaMetricas, SeloReal, abrirMetricas, exportarMetricas, fmtIndicador, s } from './comum';

/**
 * Painel de Indicadores do Sistema, página Fiscalização (10/11/2026): os indicadores 11 a 15 e a meta 2.3 do PMF (mais 12% de ações até
 * 2027 sobre 2024), as ações em cada município (dos 645, quantos tiveram ação no exercício), os autos por capitulação da Lei 5.194/66 e as
 * 24 métricas do subprograma. O índice de autuação do Crea-SP passa do dobro do Sistema: a ficha pede conferir a definição antes do envio.
 */
export default function PaginaFiscalizacao({ ctx }: { ctx: CockpitCtx }) {
  const q = s(ctx), base = q.porExercicio.find(e => e.exercicio.ano === metasPmf.acoes.base)?.metricas.get(37) ?? null, acoes = q.metricas.get(37) ?? null;
  const meta = acoes !== null && base && !q.greId && !q.exercicio.parcial ? (acoes / base - 1) * 100 : null;
  return <div className="ck-grid ck-grid-cf-fiscalizacao">
    <section className="ck-cards is-six" style={{ gridArea: 'kpi' }} aria-label="Indicadores da Fiscalização">
      <CartaoIndicador ctx={ctx} codigo={12} ficha="k-12" destaque sobeEBom={false} />
      <CartaoIndicador ctx={ctx} codigo={13} ficha="k-13" />
      <CartaoIndicador ctx={ctx} codigo={14} ficha="k-14" />
      <CartaoIndicador ctx={ctx} codigo={15} ficha="k-15" />
      <CartaoIndicador ctx={ctx} codigo={11} ficha="k-11" />
      <Indicador ctx={ctx} ficha="k-meta" aspecto={`Meta ${metasPmf.acoes.codigo} do PMF`} label="Ações contra 2024" value={meta === null ? '—' : `${meta >= 0 ? '+' : ''}${meta.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}
        meta={meta === null ? undefined : { atual: Math.max(0, meta / metasPmf.acoes.alvo * 100), alvo: 100 }}
        sub={meta === null ? (q.greId ? 'meta do Conselho inteiro; tire a regional' : 'só em exercício completo, a partir de 2025') : `${int(acoes!)} ações; a meta é +${metasPmf.acoes.alvo}% até 2027`}
        onOpen={() => abrirMetricas(ctx, 'Ações de fiscalização', [37], `${metasPmf.acoes.texto}. A base é ${metasPmf.acoes.base}: ${base === null ? '—' : int(base)} ações.`)} />
    </section>
    <Bloco ctx={ctx} id="mp" area="mp" title="Ações de fiscalização em cada município" badge={<SeloReal ctx={ctx} parte="no total" />} exportar={exportarMunicipios(ctx)}><Mapa ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ca" area="ca" title="Autos por capitulação da Lei 5.194/1966" exportar={exportarCapitulacoes(ctx)}><Capitulacoes ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ac" area="ac" title={`Ações e autos em cada exercício${q.greId ? " (Conselho inteiro)" : ""}`} badge={<SeloReal ctx={ctx} parte="em 2025" />} exportar={exportarSerie(ctx)}><Serie ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="fo" area="fo" title="As 24 métricas da Fiscalização" exportar={exportarMetricas(ctx, ['Fiscalização'])}><ListaMetricas ctx={ctx} subs={['Fiscalização']} /></Bloco>
  </div>;
}

/* ---------- Mapa dos municípios ---------- */
const exportarMunicipios = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Código IBGE', 'Município', 'Regional', 'Ações', 'Autos'],
  linhas: () => { const muns = municipioPorId(ctx.dataset); return [...s(ctx).municipios].map(([id, v]) => [id, muns.get(id)?.nome ?? id, muns.get(id)?.greId ?? '', v.acoes, v.autos]); } });
function Mapa({ ctx }: { ctx: CockpitCtx }) {
  const q = s(ctx), muns = municipioPorId(ctx.dataset);
  const medida = useMemo<Medida>(() => {
    const cidade = new Map([...q.municipios].map(([id, v]) => [id, v.acoes])), gre = new Map(q.regionais.map(r => [r.greId, r.metricas.get(37) ?? null]));
    return { label: 'Ações de fiscalização no exercício', curto: 'Ações', fmt: int, cidade, gre, dica: id => { const v = q.municipios.get(id)!; return v.acoes ? `${int(v.autos)} autos (${pct(v.autos / v.acoes * 100)})` : 'Nenhuma ação no exercício'; } };
  }, [q]);
  const semAcao = [...q.municipios].filter(([id, v]) => !v.acoes && (!ctx.greId || muns.get(id)?.greId === ctx.greId));
  return <div className="cf-mapa">
    <MapaMunicipios ctx={ctx} medida={medida} onCidade={id => { const v = q.municipios.get(id)!; ctx.open({ kind: 'linhas', title: muns.get(id)?.nome ?? id, what: `Ações e autos no município no exercício ${q.exercicio.rotulo}. A métrica 33 conta os municípios com ao menos uma ação.`, listTitle: '', rows: [], summary: [['Ações', int(v.acoes)], ['Autos', int(v.autos)]] }); }} onGre={id => ctx.filterGre(id)} />
    <button className="cf-sem-acao" onClick={() => ctx.open({ kind: 'linhas', title: 'Municípios sem ação no exercício', what: 'Municípios do recorte sem nenhuma ação de fiscalização no exercício. Eles ficam fora da métrica 33 e baixam o indicador 14.', listTitle: 'Municípios, pela população', use: 'Planeje uma ação em cada um antes do fim do exercício.',
      rows: semAcao.map(([id]) => { const m = muns.get(id)!; return { key: id, title: m.nome, subtitle: ctx.dataset.gres.find(g => g.id === m.greId)?.name ?? m.greId, value: `${int(m.populacao)} hab.`, note: '', sortValue: -m.populacao }; }) })}>
      <b>{int(semAcao.length)}</b> {semAcao.length === 1 ? 'município ficou' : 'municípios ficaram'} sem ação</button>
  </div>;
}

/* ---------- Autos por capitulação (métricas 39 a 50) ---------- */
const CAPITULACOES = Array.from({ length: 12 }, (_, i) => 39 + i);
const NOME_CAPITULACAO: Record<number, string> = { 39: 'Art. 6º, alínea a', 40: 'Art. 6º, alínea b', 41: 'Art. 6º, alínea c', 42: 'Art. 6º, alínea d', 43: 'Art. 6º, alínea e',
  44: 'Art. 16', 45: 'Art. 55', 46: 'Art. 58', 47: 'Art. 59', 48: 'Art. 82', 49: 'ART (art. 1º da Lei 6.496/77)', 50: 'Outras (arts. 13, 14, 17, 60, 67)' };
/** Nome curto de cada capitulação: os artigos são da Lei 5.194/1966, salvo o da ART. */
const nomeCapitulacao = (c: number) => NOME_CAPITULACAO[c] ?? metricaPorCodigo.get(c)!.nome;
const exportarCapitulacoes = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Métrica', 'Capitulação', 'Autos', 'Exercício anterior'], linhas: () => CAPITULACOES.map(c => [c, nomeCapitulacao(c), s(ctx).metricas.get(c) ?? null, s(ctx).metricasAntes.get(c) ?? null]) });
function Capitulacoes({ ctx }: { ctx: CockpitCtx }) {
  const q = s(ctx), { tokens } = ctx, linhas = CAPITULACOES.map(c => ({ c, nome: nomeCapitulacao(c), v: q.metricas.get(c) ?? 0 })).sort((a, b) => b.v - a.v), total = linhas.reduce((t, l) => t + l.v, 0);
  const option = useMemo(() => ({
    grid: { top: 4, right: 74, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const l = linhas[items[0].dataIndex]; return `<b>${metricaPorCodigo.get(l.c)!.nome}</b><br/>${int(l.v)} autos (${pct(l.v / Math.max(1, total) * 100)})`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: linhas.map(l => l.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11, width: 190, overflow: 'truncate' } },
    series: [{ type: 'bar', barMaxWidth: 14, data: linhas.map(l => l.v), itemStyle: { color: tokens.brand, borderRadius: [0, 3, 3, 0] },
      label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (p: any) => `${int(p.value)} (${pct(p.value / Math.max(1, total) * 100)})` } }],
  }), [linhas, tokens, total]);
  return <Chart option={option} tokens={tokens} label="Autos de infração do exercício por capitulação" onPick={p => { const l = linhas[p.dataIndex]; if (l) abrirMetricas(ctx, l.nome, [l.c], metricaPorCodigo.get(l.c)!.definicao); }} />;
}

/* ---------- Ações e autos por exercício, contra a meta 2.3 ---------- */
const exportarSerie = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Exercício', 'Ações (métrica 37)', 'Autos (métrica 38)', 'Índice de autuação (%)'],
  linhas: () => s(ctx).porExercicio.map(e => [e.exercicio.rotulo, e.metricas.get(37) ?? null, e.metricas.get(38) ?? null, e.indicadores.get(12)?.valor ?? null]) });
function Serie({ ctx }: { ctx: CockpitCtx }) {
  const q = s(ctx), { tokens } = ctx, anos = q.porExercicio, base = anos.find(e => e.exercicio.ano === metasPmf.acoes.base)?.metricas.get(37) ?? null;
  const option = useMemo(() => ({
    grid: { top: 28, right: 8, bottom: 2, left: 4, containLabel: true }, legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 11 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: anos.map(e => e.exercicio.parcial ? `${e.exercicio.ano}*` : String(e.exercicio.ano)), axisTick: { show: false }, axisLabel: { color: tokens.muted, fontSize: 11 }, axisLine: { lineStyle: { color: tokens.line } } },
    yAxis: { type: 'value', show: false },
    series: [
      { name: 'Ações', type: 'bar', barMaxWidth: 34, data: anos.map(e => ({ value: e.metricas.get(37), itemStyle: { color: e.exercicio.ano === q.exercicio.ano ? tokens.brand : tokens.blue, opacity: e.exercicio.parcial ? 0.55 : 1 } })),
        label: { show: true, position: 'top', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (p: any) => `${(p.value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil` } },
      { name: 'Autos', type: 'bar', barMaxWidth: 34, data: anos.map(e => e.metricas.get(38)), itemStyle: { color: tokens.muted },
        label: { show: true, position: 'top', color: tokens.muted, fontSize: 11, formatter: (p: any) => `${fmtIndicador(12, anos[p.dataIndex].indicadores.get(12)?.valor)}` } },
      ...(base ? [{ name: `Meta ${metasPmf.acoes.codigo}: +${metasPmf.acoes.alvo}% até 2027`, type: 'line', symbol: 'none', lineStyle: { type: 'dashed', color: tokens.warn, width: 2 },
        data: anos.map(e => e.exercicio.ano >= metasPmf.acoes.base ? Math.round(base * (1 + metasPmf.acoes.alvo / 100 * (e.exercicio.ano - metasPmf.acoes.base) / 3)) : null) }] : []),
    ],
  }), [anos, tokens, base, q.exercicio.ano]);
  return <Chart option={option} tokens={tokens} label="Ações e autos de fiscalização por exercício, com o índice de autuação sobre as barras dos autos e a meta 2.3" onPick={p => { const e = anos[p.dataIndex]; if (!e) return;
    ctx.open({ kind: 'linhas', title: `Ações e autos em ${e.exercicio.rotulo}`, what: 'Do Conselho inteiro, como o Crea-SP manda na planilha.', listTitle: 'Métricas', rows: [37, 38].map(c => ({ key: String(c), title: `${c}. ${metricaPorCodigo.get(c)!.nome}`, subtitle: metricaPorCodigo.get(c)!.definicao, value: int(e.metricas.get(c) ?? 0), note: '', sortValue: c })),
      summary: [['Índice de autuação', fmtIndicador(12, e.indicadores.get(12)?.valor)]] }); }} />;
}
