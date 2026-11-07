import { useMemo } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Chart } from '../painel/chart';
import { brl, int, mes, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Var } from '../cockpit/ui';
import { rotuloTrimestre } from '../cockpit/formatos';
import type { Exportavel } from '../cockpit/ui';
import { fichas as fichasNorte } from '../observatorio/norte';
import { INDICADORES, porRegionalDaFoto, valorDe } from '../domain/presidencia';
import type { Indicador as Ind, PainelResumo } from '../domain/presidencia';
import { destino, formato, nomeGre, nomePainel, ondeTexto, principais, ressalva, useLeitura, variacaoTexto } from './comum';
import type { Leitura } from './comum';

/**
 * Painel da Presidência, página Resumo (07/11/2026): um quadro por painel, com o número principal (variação em um ano, meta e os 13
 * meses) e mais dois ou três números do mesmo assunto; embaixo, as regionais contra a meta, os destaques e os indicadores do
 * programa. Clicar num número abre o painel do assunto com os mesmos filtros. O Caio pediu, em 07/11/2026, mais de um número por painel.
 */
const areas: Record<PainelResumo, string> = { empresas: 'em', profissionais: 'pf', fiscalizacao: 'fi', financeiro: 'fn', atendimento: 'at', conselho: 'co' };
export default function PaginaResumo({ ctx }: { ctx: CockpitCtx }) {
  const l = useLeitura(ctx), calculando = l.atual ? undefined : 'Calculando o resumo dos painéis';
  return <div className="ck-grid ck-grid-pr-resumo">
    {principais.map(ind => <Bloco key={ind.painel} ctx={ctx} id={`p-${ind.painel}`} area={areas[ind.painel]} title={nomePainel[ind.painel]} vazio={calculando} exportar={exportarPainel(l, ind.painel)}
      badge={!l.completo && l.atual ? <span className="pr-calculando" role="status">calculando os meses</span> : undefined}
      actions={<button className="pr-abrir" onClick={() => ctx.go(destino[ind.id])} title={`Abrir o painel ${nomePainel[ind.painel]} com os mesmos filtros`}>Abrir<ArrowUpRight size={12} /></button>}>
      <QuadroPainel ctx={ctx} l={l} principal={ind} />
    </Bloco>)}
    <Bloco ctx={ctx} id="mt" area="mt" title="As regionais contra a meta" vazio={calculando} exportar={exportarMeta(ctx)}><Metas ctx={ctx} l={l} /></Bloco>
    <Bloco ctx={ctx} id="lt" area="lt" title="Destaques do período" className="t-leitura">
      <ul className="leitura pr-leitura">{ctx.insights.slice(0, 6).map((item, index) => <li key={index} className={`is-${item.tone}`}><button onClick={() => ctx.go(item.page)}><i aria-hidden="true" /><span><b>{item.strong}</b> {item.text}</span></button></li>)}</ul>
    </Bloco>
    <Bloco ctx={ctx} id="no" area="no" title="Os indicadores do programa"><Programa ctx={ctx} /></Bloco>
  </div>;
}

/* ---------- O quadro de cada painel: o número principal com os 13 meses e os outros números ---------- */
const exportarPainel = (l: Leitura, painel: PainelResumo): Exportavel => ({ cabecalho: ['Indicador', 'Agora', 'Um ano antes', 'Variação', ...l.datas], linhas: () => INDICADORES.filter(ind => ind.painel === painel).map(ind => [ind.nome, formato(ind, l.valor(ind.id)), formato(ind, l.antesDe(ind.id)), variacaoTexto(ind, l.variacao(ind.id)), ...l.linha(ind.id).map(value => value === null ? '' : Math.round(value * 10) / 10)]) });
function QuadroPainel({ ctx, l, principal }: { ctx: CockpitCtx; l: Leitura; principal: Ind }) {
  const outros = INDICADORES.filter(ind => ind.painel === principal.painel && !ind.principal), meta = principal.meta ? ctx.metas[principal.meta] : null, value = l.valor(principal.id), nota = ressalva(ctx, principal);
  const variacao = (ind: Ind) => ({ value: l.variacao(ind.id), kind: ind.unidade === 'taxa' ? 'pp' as const : 'pct' as const, goodUp: ind.sobeBom, label: 'em um ano' });
  return <div className="pr-painel">
    <button className="pr-principal" onClick={() => ctx.go(destino[principal.id])} title={`${principal.nome}: abrir o painel`}>
      <span className="pr-nome">{principal.nome}{nota && <em> ({nota})</em>}</span>
      <strong>{formato(principal, value)}</strong>
      <Var {...variacao(principal)} />
      {meta !== null && <span className="pr-meta-linha">{value !== null && <span className="ind-meta pr-meta" title={`Meta de ${meta}%`}><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /><b style={{ left: `${meta}%` }} /></span>}
        <span className="pr-meta-texto">meta de {meta}%</span></span>}
    </button>
    <div className="pr-serie"><Serie ctx={ctx} l={l} ind={principal} /></div>
    <ul className="pr-outros">{outros.map(ind => { const aviso = ressalva(ctx, ind); return <li key={ind.id}><button onClick={() => ctx.go(destino[ind.id])} title={`${ind.nome}: abrir o painel`}>
      <span className="pr-outro-nome">{ind.nome}{ind.tipo === 'fluxo' && ind.unidade !== 'taxa' ? ' no período' : ''}{aviso && <em> ({aviso})</em>}</span>
      <b>{formato(ind, l.valor(ind.id))}</b><Var {...variacao(ind)} /></button></li>; })}</ul>
  </div>;
}
/** Os 13 meses do número principal, com o primeiro e o último valor escritos. */
function Serie({ ctx, l, ind }: { ctx: CockpitCtx; l: Leitura; ind: Ind }) {
  const { tokens } = ctx, valores = l.linha(ind.id), cor = ind.sobeBom ? tokens.blue : tokens.bad, ultimo = valores.length - 1;
  const option = useMemo(() => ({
    grid: { top: 16, right: 30, bottom: 18, left: 30 },
    tooltip: { trigger: 'axis', formatter: (items: any[]) => `<b>${ind.nome}</b><br/>${l.datas[items[0].dataIndex].split('-').reverse().join('/')}: ${formato(ind, items[0].value ?? null)}` },
    xAxis: { type: 'category', data: l.datas.map(dia => mes(dia.slice(0, 7))), boundaryGap: false, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 11, interval: (i: number) => i === 0 || i === ultimo } },
    // A escala não começa no zero, mas também não amplia a diferença de uma unidade: a faixa mínima é 5% do maior valor.
    yAxis: { type: 'value', show: false, min: (v: { min: number; max: number }) => v.min - Math.max(v.max - v.min, Math.abs(v.max) * 0.05) * 0.6, max: (v: { min: number; max: number }) => v.max + Math.max(v.max - v.min, Math.abs(v.max) * 0.05) * 0.35 },
    series: [{ type: 'line', data: valores, symbol: 'circle', symbolSize: 4, lineStyle: { color: cor, width: 2 }, itemStyle: { color: cor }, areaStyle: { color: cor, opacity: 0.08 },
      label: { show: true, position: 'top', fontSize: 11, fontWeight: 700, color: tokens.ink, formatter: (p: any) => p.dataIndex === 0 || p.dataIndex === ultimo ? formato(ind, p.value) : '' } }],
  }), [valores.join('|'), tokens, l.datas]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label={`${ind.nome} no fim de cada mês, ${ondeTexto(ctx)}`} onPick={() => ctx.go(destino[ind.id])} />;
}

/* ---------- As regionais contra a meta: um ponto por regional em cada taxa com meta ---------- */
const comMeta = INDICADORES.filter(row => row.meta);
const exportarMeta = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Regional', ...comMeta.map(ind => ind.nome)], linhas: () => {
  const foto = ctx.presidencia?.atual; if (!foto) return []; const linhas = porRegionalDaFoto(foto, ctx.dataset, ctx.camara);
  return [...linhas].map(([greId, v]) => [nomeGre(ctx, greId), ...comMeta.map(ind => { const value = valorDe(ind, v[ind.id]); return value === null ? '' : Math.round(value * 10) / 10; })]); } });
function Metas({ ctx, l }: { ctx: CockpitCtx; l: Leitura }) {
  const { tokens, metas } = ctx, foto = ctx.presidencia?.atual;
  const linhas = useMemo(() => foto ? porRegionalDaFoto(foto, ctx.dataset, ctx.camara) : new Map(), [foto, ctx.dataset, ctx.camara]);
  const pontos = useMemo(() => comMeta.flatMap((ind, row) => [...linhas].map(([greId, v]) => ({ greId, row, ind, value: valorDe(ind, v[ind.id]) }))).filter(p => p.value !== null), [linhas]);
  const option = useMemo(() => ({
    grid: { top: 26, right: 18, bottom: 22, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 10, itemGap: 12, textStyle: { color: tokens.muted, fontSize: 11 }, data: ['Regionais', ctx.greId || ctx.cidadeId ? 'O recorte' : 'O estado', 'A meta'] },
    tooltip: { trigger: 'item', formatter: (p: any) => p.data?.texto ?? '' },
    xAxis: { type: 'value', min: 0, max: 100, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 11, formatter: '{value}%' } },
    yAxis: { type: 'category', inverse: true, data: comMeta.map(ind => { const value = l.valor(ind.id); return `${ind.nome}  {v|${value === null ? '—' : pct(value, 1)}}  {m|meta ${metas[ind.meta!]}%}`; }), axisTick: { show: false }, axisLine: { show: false },
      axisLabel: { interval: 0, color: tokens.ink, fontSize: 11, width: 300, overflow: 'truncate', rich: { v: { color: tokens.brand, fontSize: 11, fontWeight: 800 }, m: { color: tokens.bad, fontSize: 11, fontWeight: 700 } } } },
    series: [
      { name: 'Regionais', type: 'scatter', symbolSize: 9, data: pontos.map(p => ({ value: [p.value, p.row], greId: p.greId, itemStyle: { color: ctx.greId === p.greId ? tokens.accent : tokens.heat[2], opacity: ctx.greId && ctx.greId !== p.greId ? 0.45 : 0.85, borderColor: tokens.surface, borderWidth: 1 },
        texto: `<b>${nomeGre(ctx, p.greId)}</b><br/>${p.ind.nome}: ${pct(p.value!, 1)}<br/>meta de ${metas[p.ind.meta!]}%<br/><span style="opacity:.7">clique para ver a regional</span>` })) },
      { name: ctx.greId || ctx.cidadeId ? 'O recorte' : 'O estado', type: 'scatter', symbol: 'diamond', symbolSize: 16, z: 5, itemStyle: { color: tokens.brand, borderColor: tokens.surface, borderWidth: 1.5 },
        data: comMeta.map((ind, row) => { const value = l.valor(ind.id); return value === null ? null : { value: [value, row], texto: `<b>${ind.nome}</b> ${ondeTexto(ctx)}: ${pct(value, 1)}` }; }).filter(Boolean) },
      { name: 'A meta', type: 'scatter', symbol: 'rect', symbolSize: [3, 16], z: 4, itemStyle: { color: tokens.bad },
        data: comMeta.map((ind, row) => ({ value: [metas[ind.meta!], row], texto: `Meta de ${ind.nome.toLowerCase()}: ${metas[ind.meta!]}%. Ajuste em “Metas”, no menu.` })) },
    ],
  }), [pontos, l, tokens, metas, ctx.greId, ctx.cidadeId]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Cada regional nas quatro taxas com meta, com o estado e a meta" onPick={p => { if (p.seriesIndex === 0 && p.data?.greId) ctx.filterGre(p.data.greId); }} />;
}

/* ---------- Os quatro indicadores do programa ---------- */
function Programa({ ctx }: { ctx: CockpitCtx }) {
  const { cobertura, conversao, receita, tempo } = ctx.norte;
  const itens = [
    { id: 'cobertura' as const, valor: cobertura.taxa === null ? '—' : pct(cobertura.taxa, 1), texto: `de ${int(cobertura.total)} estabelecimentos de engenharia têm registro`, page: 'mercado' as const },
    { id: 'conversao' as const, valor: conversao.atual?.taxa == null ? '—' : pct(conversao.atual.taxa, 1), texto: conversao.atual ? `das ações de ${rotuloTrimestre(conversao.atual.trimestre)} regularizadas em 180 dias` : 'nenhum trimestre completou 180 dias', page: 'resultado' as const },
    { id: 'receita' as const, valor: brl(receita.total), texto: `pagos por ${int(receita.casos)} empresas depois de um caso aberto`, page: 'resultado' as const },
    { id: 'tempo' as const, valor: tempo.mediana === null ? 'sem mediana' : `${int(tempo.mediana)} dias`, texto: `do indício à primeira ação; ${int(tempo.abertos)} ainda sem ação`, page: 'resultado' as const },
  ];
  return <ul className="pr-programa">{itens.map(item => <li key={item.id}><button onClick={() => ctx.go(item.page)} title={`${fichasNorte[item.id].nome}: abrir o painel`}>
    <span className="pr-programa-nome">{fichasNorte[item.id].nome}</span><strong>{item.valor}</strong><span className="pr-programa-texto">{item.texto}</span></button></li>)}</ul>;
}
