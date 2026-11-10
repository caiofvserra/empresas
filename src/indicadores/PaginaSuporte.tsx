import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { brl, int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco } from '../cockpit/ui';
import type { Exportavel } from '../cockpit/ui';
import { metricaPorCodigo } from '../domain/sistema-confea';
import { CartaoIndicador, ListaMetricas, abrirMetricas, exportarMetricas, fmtIndicador, s } from './comum';
import { Regionais } from './PaginaRegistro';
import type { ColunaRegional } from './PaginaRegistro';

/**
 * Painel de Indicadores do Sistema, página Suporte e Liderança (10/11/2026): inadimplência de profissionais e empresas, anuidades e
 * multas não pagas, a parte da despesa corrente gasta com a fiscalização, conta a conta (o indicador que o Caderno de 2021 descartou
 * por erro de conta, nota 24), o quadro de pessoal, as regionais e a representação no Plenário.
 */
export default function PaginaSuporte({ ctx }: { ctx: CockpitCtx }) {
  return <div className="ck-grid ck-grid-cf-suporte">
    <section className="ck-cards is-six" style={{ gridArea: 'kpi' }} aria-label="Indicadores de Suporte">
      <CartaoIndicador ctx={ctx} codigo={16} ficha="k-16" destaque />
      <CartaoIndicador ctx={ctx} codigo={8} ficha="k-8" sobeEBom={false} />
      <CartaoIndicador ctx={ctx} codigo={9} ficha="k-9" sobeEBom={false} />
      <CartaoIndicador ctx={ctx} codigo={10} ficha="k-10" sobeEBom={false} />
      <CartaoIndicador ctx={ctx} codigo={35} ficha="k-35" sobeEBom={false} />
      <CartaoIndicador ctx={ctx} codigo={11} ficha="k-11" />
    </section>
    <Bloco ctx={ctx} id="cf" area="cf" title="Quanto custa a fiscalização, conta a conta" exportar={exportarCusto(ctx)}><Custo ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="gr" area="gr" title="Inadimplência e quadro em cada regional" exportar={exportarRegionais(ctx)}><Regionais ctx={ctx} colunas={COLUNAS} /></Bloco>
    <Bloco ctx={ctx} id="li" area="li" title="Pessoas e representação" exportar={exportarPessoas(ctx)}><Pessoas ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="fo" area="fo" title="As 27 métricas de Suporte e Liderança" exportar={exportarMetricas(ctx, ['Suporte', 'Liderança'])}><ListaMetricas ctx={ctx} subs={['Suporte', 'Liderança']} /></Bloco>
  </div>;
}

/* ---------- Custo da fiscalização (indicador 16) ---------- */
const CONTAS: [number, string][] = [[155, 'Salários, encargos e benefícios'], [153, 'Verbas indenizatórias'], [160, 'Aluguel de veículos'], [161, 'Combustível'], [159, 'Manutenção, seguro, estacionamento e pedágio'],
  [158, 'Telefonia móvel dos fiscais'], [156, 'Capacitação'], [157, 'Seguro, calibração e manutenção de equipamentos']];
const exportarCusto = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Métrica', 'Conta', 'Valor (R$)', 'Parte da despesa corrente (%)'],
  linhas: () => { const q = s(ctx), total = q.metricas.get(150) ?? null; return CONTAS.map(([c, nome]) => [c, nome, q.metricas.get(c) ?? null, total && q.metricas.get(c) !== null ? (q.metricas.get(c)! / total * 100) : null]); } });
function Custo({ ctx }: { ctx: CockpitCtx }) {
  const q = s(ctx), { tokens } = ctx, total = q.metricas.get(150) ?? 0, linhas = CONTAS.map(([c, nome]) => ({ c, nome, v: q.metricas.get(c) ?? null }));
  const option = useMemo(() => ({
    grid: { top: 4, right: 96, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const l = linhas[items[0].dataIndex]; return `<b>${metricaPorCodigo.get(l.c)!.nome}</b> (métrica ${l.c})<br/>${l.v === null ? 'Métrica vazia: o Confea não calcula o indicador 16 sem ela' : `${brl(l.v)} · ${pct(l.v / Math.max(1, total) * 100, 1)} da despesa corrente`}`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: linhas.map(l => `${l.nome} (${l.c})`), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11, width: 210, overflow: 'truncate' } },
    series: [{ type: 'bar', barMaxWidth: 14, data: linhas.map(l => ({ value: l.v ?? 0, itemStyle: { color: l.v === null ? tokens.bad : tokens.brand } })), itemStyle: { borderRadius: [0, 3, 3, 0] },
      label: { show: true, position: 'right', fontSize: 11, fontWeight: 700, color: tokens.ink, formatter: (p: any) => linhas[p.dataIndex].v === null ? 'vazia' : `${brl(p.value)} · ${pct(p.value / Math.max(1, total) * 100, 1)}` } }],
  }), [linhas, tokens, total]); // eslint-disable-line react-hooks/exhaustive-deps
  const vazias = linhas.filter(l => l.v === null);
  return <div className="cf-custo">
    <p className="cf-total">Despesa corrente empenhada (métrica 150): <b>{brl(total)}</b>{q.greId ? ' · do Conselho inteiro' : ''}. {vazias.length ? <span className="cf-alerta">Faltam {vazias.map(l => l.c).join(' e ')}: sem elas, o indicador 16 não sai.</span> : <>A fiscalização leva <b>{fmtIndicador(16, q.indicadores.get(16)?.valor)}</b>.</>}</p>
    <div className="cf-custo-grafico"><Chart option={option} tokens={tokens} label="Despesa da fiscalização por conta, em reais e em parte da despesa corrente" onPick={p => { const l = linhas[p.dataIndex]; if (l) abrirMetricas(ctx, l.nome, [l.c, 150], metricaPorCodigo.get(l.c)!.definicao); }} /></div>
  </div>;
}

/* ---------- Regionais ---------- */
const COLUNAS: ColunaRegional[] = [
  { titulo: 'Inadimplência prof.', valor: (_, i) => i.get(8)?.valor ?? null, fmt: v => fmtIndicador(8, v) },
  { titulo: 'Inadimplência emp.', valor: (_, i) => i.get(9)?.valor ?? null, fmt: v => fmtIndicador(9, v) },
  { titulo: 'Anuidades não pagas', valor: m => (m.get(145) ?? 0) + (m.get(147) ?? 0), fmt: v => v === null ? '—' : int(v) },
  { titulo: 'Multas não pagas', valor: m => m.get(149) ?? null, fmt: v => v === null ? '—' : int(v) },
  { titulo: 'Agentes fiscais', valor: m => m.get(142) ?? null, fmt: v => v === null ? '—' : int(v) },
  { titulo: 'Fiscalizações por dia', valor: (_, i) => i.get(13)?.valor ?? null, fmt: v => fmtIndicador(13, v) },
];
const exportarRegionais = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Regional', ...COLUNAS.map(c => c.titulo)], linhas: () => s(ctx).regionais.map(r => [ctx.dataset.gres.find(g => g.id === r.greId)?.name ?? r.greId, ...COLUNAS.map(c => c.valor(r.metricas, r.indicadores))]) });

/* ---------- Pessoas e representação (métricas 135 a 143) ---------- */
const PESSOAS: [number, string][] = [[140, 'Empregados do Crea-SP'], [141, 'No atendimento, cadastro, registro e julgamento'], [143, 'Na fiscalização'], [142, 'Agentes fiscais'],
  [139, 'Inspetores'], [137, 'Conselheiros das entidades de classe'], [138, 'Conselheiros das instituições de ensino'], [135, 'Entidades de classe registradas'], [136, 'Instituições de ensino registradas']];
const exportarPessoas = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Métrica', 'Quem', 'Quantos', 'Exercício anterior'], linhas: () => PESSOAS.map(([c, nome]) => [c, nome, s(ctx).metricas.get(c) ?? null, s(ctx).metricasAntes.get(c) ?? null]) });
function Pessoas({ ctx }: { ctx: CockpitCtx }) {
  const q = s(ctx);
  return <ul className="cf-pessoas">{PESSOAS.map(([c, nome], i) => { const v = q.metricas.get(c) ?? null, antes = q.metricasAntes.get(c) ?? null;
    return <li key={c} className={i === 4 ? 'is-grupo' : ''}><button onClick={() => abrirMetricas(ctx, nome, [c], metricaPorCodigo.get(c)!.definicao)}>
      <span className="cf-codigo">M{' '}{c}</span><span className="cf-pessoa-nome">{nome}{q.doEstado(c) && <em> · Conselho inteiro</em>}</span><b>{v === null ? '—' : int(v)}</b>
      <small>{antes === null || v === null || antes === v ? '' : `${v > antes ? '+' : ''}${int(v - antes)}`}</small></button></li>; })}</ul>;
}
