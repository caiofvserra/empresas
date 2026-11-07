import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { brl, int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador, avisoVazio } from '../cockpit/ui';
import { corDoTexto } from '../cockpit/formatos';
import type { Exportavel } from '../cockpit/ui';
import { desfechos, destinosMulta, infracaoDaAlinea } from '../domain/colegiado';
import type { Desdobramento } from '../domain/colegiado';
import { change, eixoCategoria, eixoValor, legenda } from '../gestao/comum';
import { abrirAutos, abrirTramitacoes, parte, q } from './comum';

/**
 * Painel de Gestão do Conselho, página 4 (07/11/2026): o que as câmaras decidem nos autos de infração (multa, multa reduzida, em
 * dobro na reincidência, suspensão ou arquivamento), as multas pela alínea do art. 73 da Lei 5.194/66, o que o Plenário mantém ou
 * reforma no recurso e o destino das multas: recurso ao Confea, trânsito em julgado, cobrança e pagamento.
 */
export default function PaginaDecisoes({ ctx }: { ctx: CockpitCtx }) {
  const c = q(ctx), reincidentes = c.autosVotados.filter(d => d.reincidente).length, prescritos = c.autosVotados.filter(d => d.desfecho === 'Arquivamento pela prescrição').length;
  const maiorMulta = [...c.autosVotados].sort((a, b) => b.multaCamara - a.multaCamara);
  return <div className="ck-grid ck-grid-cs-decisoes">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores das decisões">
      <Indicador destaque ficha="k-autos" ctx={ctx} label="Autos votados nas câmaras" value={int(c.autosVotados.length)} sub={`${int(reincidentes)} de reincidentes, com a multa em dobro`}
        onOpen={() => abrirAutos(ctx, 'Autos votados nas câmaras', maiorMulta, 'Autos de infração votados pelas câmaras no período, com a penalidade, a alínea do art. 73 e o que aconteceu depois.')} />
      <Indicador ficha="k-multas" ctx={ctx} label="Multas aplicadas" value={brl(c.multasAplicadas)} variacao={{ value: change(c.multasAplicadas, c.multasAntes) }} sub="na decisão da câmara, antes do recurso" />
      <Indicador ficha="k-arquivados" ctx={ctx} label="Autos arquivados" value={parte(c.arquivados)} sub={`dos votados; ${int(prescritos)} pela prescrição`}
        onOpen={() => abrirAutos(ctx, 'Autos arquivados', c.autosVotados.filter(d => d.desfecho === 'Arquivamento' || d.desfecho === 'Arquivamento pela prescrição'), 'Autos de infração votados no período e arquivados, pela defesa ou pela prescrição.')} />
      <Indicador ficha="k-recursos" ctx={ctx} label="Recursos esperando o Plenário" value={int(c.recursos.length)} variacao={{ value: change(c.recursos.length, c.recursosAntes), goodUp: false, label: 'em relação a um ano antes' }} sub="decisões das câmaras levadas ao Plenário"
        onOpen={() => abrirTramitacoes(ctx, 'Recursos esperando o Plenário', c.recursos, 'Processos em que a parte recorreu da decisão da câmara e o Plenário ainda não votou, na data escolhida.')} />
      <Indicador ficha="k-reformadas" ctx={ctx} label="Reformadas pelo Plenário" value={parte(c.reformadas)} sub={`dos ${int(c.votadosPlenario.length)} recursos votados no período`}
        onOpen={() => abrirTramitacoes(ctx, 'Recursos votados pelo Plenário', c.votadosPlenario, 'Recursos votados pelo Plenário no período, com a decisão mantida ou reformada.')} />
    </section>
    <Bloco ctx={ctx} id="de" vazio={avisoVazio(!comAutos(ctx).length, 'Nenhum auto de infração votado no período')} area="de" title="O que as câmaras decidiram nos autos" exportar={exportarDesfechos(ctx)}><Desfechos ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="al" area="al" title="Multas por infração do art. 73" exportar={exportarAlineas(ctx)}><Alineas ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="pl" vazio={avisoVazio(!comRecurso(ctx).length, 'Nenhum recurso votado pelo Plenário no período')} area="pl" title="O Plenário mantém ou reforma" exportar={exportarPlenario(ctx)}><Plenario ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mu" area="mu" title="O que aconteceu com as multas" exportar={exportarDestino(ctx)}><Destino ctx={ctx} /></Bloco>
  </div>;
}

/* ---------- Desfecho por câmara ---------- */
const comAutos = (ctx: CockpitCtx) => q(ctx).desfechoPorCamara.filter(row => desfechos.some(d => row.porDesfecho[d].length));
const totalDe = (row: { porDesfecho: Record<string, Desdobramento[]> }) => Object.values(row.porDesfecho).reduce((n, rows) => n + rows.length, 0);
const exportarDesfechos = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Câmara', ...desfechos], linhas: () => comAutos(ctx).map(row => [row.camara, ...desfechos.map(d => row.porDesfecho[d].length)]) });
function Desfechos({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = comAutos(ctx), cores = [tokens.brand, tokens.blue, tokens.bad, '#6B46C1', tokens.heat[1], tokens.muted];
  const option = useMemo(() => ({
    grid: { top: 40, right: 34, bottom: 2, left: 2, containLabel: true }, legend: { ...legenda(tokens), data: desfechos },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex], n = totalDe(row); return `<b>Câmara ${row.camara}</b>, ${int(n)} autos votados<br/>${desfechos.map(d => `${d}: ${int(row.porDesfecho[d].length)} (${pct(row.porDesfecho[d].length / Math.max(1, n) * 100)})`).join('<br/>')}`; } },
    xAxis: { type: 'value', show: false, max: 101 }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.camara), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: desfechos.map((d, index) => ({ name: d, type: 'bar', stack: 'd', barMaxWidth: 13, data: rows.map(row => row.porDesfecho[d].length / Math.max(1, totalDe(row)) * 100), itemStyle: { color: cores[index], borderColor: tokens.surface, borderWidth: 1 },
      label: { show: true, position: 'inside', color: corDoTexto(cores[index]), fontSize: 11, fontWeight: 700, formatter: (p: any) => p.value >= 9 ? pct(p.value) : '' } }))
      .concat([{ name: 'total', type: 'bar', stack: 'd', barMaxWidth: 13, data: rows.map(() => 0), itemStyle: { color: 'transparent' }, label: { show: true, position: 'right', color: tokens.muted, fontSize: 11, formatter: (p: any) => int(totalDe(rows[p.dataIndex])) } } as any]),
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Desfecho dos autos de infração votados no período, por câmara" onPick={params => { const row = rows[params.dataIndex], d = desfechos[params.seriesIndex]; if (row && d) abrirAutos(ctx, `${d} na câmara ${row.camara}`, row.porDesfecho[d], 'Autos de infração votados pela câmara no período, com este desfecho.'); }} />;
}

/* ---------- Multas por alínea ---------- */
const exportarAlineas = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Alínea do art. 73', 'Infração', 'Autos com multa', 'Valor (R$)'], linhas: () => q(ctx).porAlinea.map(row => [row.alinea, infracaoDaAlinea[row.alinea], row.autos.length, row.valor]) });
function Alineas({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = [...q(ctx).porAlinea].sort((a, b) => b.valor - a.valor);
  const option = useMemo(() => ({
    grid: { top: 4, right: 104, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${infracaoDaAlinea[row.alinea]}</b><br/>${int(row.autos.length)} autos com multa: <b>${brl(row.valor)}</b>`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => infracaoDaAlinea[row.alinea]), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [{ type: 'bar', barMaxWidth: 13, data: rows.map(row => row.valor), itemStyle: { color: tokens.accent, borderRadius: [0, 3, 3, 0] },
      label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, formatter: (p: any) => `{v|${brl(p.value)}} {n|${int(rows[p.dataIndex].autos.length)} autos}`, rich: { v: { fontWeight: 800, fontSize: 11, color: tokens.ink }, n: { color: tokens.muted, fontSize: 11 } } } }],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Valor das multas aplicadas no período por alínea do art. 73 da Lei 5.194/66" onPick={params => { const row = rows[params.dataIndex]; if (row) abrirAutos(ctx, infracaoDaAlinea[row.alinea], row.autos, `Autos votados no período com multa pela ${infracaoDaAlinea[row.alinea].toLowerCase()}.`); }} />;
}

/* ---------- Plenário: mantidas e reformadas, pela câmara de origem ---------- */
const comRecurso = (ctx: CockpitCtx) => q(ctx).plenarioPorCamara.filter(row => row.mantidas.length + row.reformadas.length > 0);
const exportarPlenario = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Câmara de origem', 'Decisões mantidas', 'Decisões reformadas'], linhas: () => comRecurso(ctx).map(row => [row.camara, row.mantidas.length, row.reformadas.length]) });
function Plenario({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = comRecurso(ctx);
  const option = useMemo(() => ({
    grid: { top: 24, right: 24, bottom: 2, left: 24, containLabel: true }, legend: { ...legenda(tokens), data: ['Reformadas', 'Mantidas'] },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex], n = row.mantidas.length + row.reformadas.length; return `<b>Câmara ${row.camara}</b>, ${int(n)} recursos votados<br/>Mantidas: ${int(row.mantidas.length)}; reformadas: ${int(row.reformadas.length)} (${pct(row.reformadas.length / n * 100)})`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.camara), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [
      { name: 'Reformadas', type: 'bar', stack: 'p', barMaxWidth: 13, data: rows.map(row => -row.reformadas.length), itemStyle: { color: tokens.bad, borderRadius: [3, 0, 0, 3] }, label: { show: true, position: 'left', color: tokens.bad, fontSize: 11, fontWeight: 700, formatter: (p: any) => p.value ? int(-p.value) : '' } },
      { name: 'Mantidas', type: 'bar', stack: 'p', barMaxWidth: 13, data: rows.map(row => row.mantidas.length), itemStyle: { color: tokens.brand, borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (p: any) => p.value ? int(p.value) : '' } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Recursos votados pelo Plenário no período: decisões mantidas e reformadas, pela câmara de origem" onPick={params => { const row = rows[params.dataIndex]; if (!row) return; const lista = params.seriesIndex === 0 ? row.reformadas : row.mantidas;
    abrirTramitacoes(ctx, `Câmara ${row.camara}: decisões ${params.seriesIndex === 0 ? 'reformadas' : 'mantidas'} pelo Plenário`, lista, 'Recursos votados pelo Plenário no período, vindos desta câmara.'); }} />;
}

/* ---------- Destino das multas, pelo ano da decisão ---------- */
const exportarDestino = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Ano da decisão', ...destinosMulta.map(d => `${d} (autos)`), ...destinosMulta.map(d => `${d} (R$)`)], linhas: () => q(ctx).multasPorAno.map(row => [row.ano, ...destinosMulta.map(d => row.porDestino[d].length), ...destinosMulta.map(d => row.valor[d])]) });
function Destino({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = q(ctx).multasPorAno, cores = [tokens.good, tokens.accent, tokens.blue, tokens.muted], maior = Math.max(1, ...rows.map(row => destinosMulta.reduce((n, d) => n + row.valor[d], 0)));
  const option = useMemo(() => ({
    grid: { top: 26, right: 6, bottom: 2, left: 4, containLabel: true }, legend: { ...legenda(tokens), data: [...destinosMulta] },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>Multas decididas em ${row.ano}</b>${row.ano === ctx.anchor.slice(0, 4) ? ' (até a data)' : ''}<br/>${destinosMulta.map(d => `${d}: ${brl(row.valor[d])} em ${int(row.porDestino[d].length)} autos`).join('<br/>')}`; } },
    xAxis: eixoCategoria(tokens, rows.map(row => row.ano)), yAxis: eixoValor(tokens),
    series: destinosMulta.map((d, index) => ({ name: d, type: 'bar', barMaxWidth: 64, stack: 'm', barWidth: '62%', data: rows.map(row => row.valor[d]), itemStyle: { color: cores[index], borderColor: tokens.surface, borderWidth: 1 },
      label: { show: true, position: 'inside', color: corDoTexto(cores[index]), fontSize: 11, fontWeight: 700, formatter: (p: any) => p.value >= maior * 0.2 ? `${int(Math.round(p.value / 1000))} mil` : '' } })),
  }), [rows, tokens, ctx.anchor, maior]);
  return <Chart option={option} tokens={tokens} label="Valor das multas aplicadas pelas câmaras, pelo ano da decisão e pelo que aconteceu depois" onPick={params => { const row = rows[params.dataIndex], d = destinosMulta[params.seriesIndex]; if (row && d) abrirAutos(ctx, `Multas de ${row.ano}: ${d.toLowerCase()}`, row.porDestino[d], `Autos com multa decididos pelas câmaras em ${row.ano}, hoje ${d.toLowerCase()}.`); }} />;
}
