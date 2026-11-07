import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { brl, int, mes, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import type { Exportavel } from '../cockpit/ui';
import { decisoesAuto, faixasIdadeProcesso, faixasPrescricao, fases } from '../domain/gestao';
import type { LinhaCamara } from '../domain/gestao';
import { abrirProcessos, eixoCategoria, eixoValor, g, legenda } from './comum';

/**
 * Blocos da página Câmaras e plenário (06/11/2026): o estoque de processos de cada câmara especializada, a idade, o ritmo de entrada e
 * de julgamento, os autos perto da prescrição de cinco anos (Lei 9.873/1999), as decisões e a composição do plenário. Camada
 * demonstrativa: em produção, vem do sistema de processos do Crea-SP.
 */
const linhasPorEstoque = (ctx: CockpitCtx) => [...g(ctx).camaras.linhas].sort((a, b) => b.estoque.length - a.estoque.length);

/* ---------- Estoque por câmara e fase ---------- */
export const exportarEstoque = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Câmara', ...fases, 'Em julgamento', 'Julgados no período', 'Sessões no período', 'Julgados por sessão'], linhas: () => linhasPorEstoque(ctx).map(row => [row.camara, ...fases.map(fase => row.porFase[fase].length), row.estoque.length, row.julgados.length, row.sessoes, row.sessoes ? Math.round(row.julgados.length / row.sessoes * 10) / 10 : null]) });
export function EstoqueFase({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = linhasPorEstoque(ctx), cores = [tokens.heat[1], tokens.blue, tokens.brand];
  const option = useMemo(() => ({
    grid: { top: 24, right: 92, bottom: 2, left: 2, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>Câmara ${row.camara}</b><br/>${fases.map(fase => `${fase}: ${int(row.porFase[fase].length)}`).join('<br/>')}<br/>${int(row.julgados.length)} julgados em ${int(row.sessoes)} sessões no período<br/><span style="opacity:.7">clique para ver os processos</span>`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.camara), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: fases.map((fase, index) => ({ name: fase, type: 'bar', stack: 'e', barWidth: 13, data: rows.map(row => row.porFase[fase].length), itemStyle: { color: cores[index], borderColor: tokens.surface, borderWidth: 1, borderRadius: index === fases.length - 1 ? [0, 3, 3, 0] : 0 },
      ...(index === fases.length - 1 ? { label: { show: true, position: 'right', fontSize: 10, formatter: (params: any) => { const row = rows[params.dataIndex]; return `{n|${int(row.estoque.length)}} {s|${row.sessoes ? `${(row.julgados.length / row.sessoes).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por sessão` : ''}}`; }, rich: { n: { color: tokens.ink, fontWeight: 800, fontSize: 10.5 }, s: { color: tokens.muted, fontSize: 9.5 } } } } : {}) })),
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Processos em julgamento por câmara e fase" onPick={params => { const row = rows[params.dataIndex], fase = fases[params.seriesIndex]; if (row && fase) abrirProcessos(ctx, `Câmara ${row.camara} · ${fase.toLowerCase()}`, row.porFase[fase], 'Processos desta câmara nesta fase, na data escolhida.', 'Os mais antigos primeiro: distribua a relatoria e paute os que já têm relatório.'); }} />;
}

/* ---------- Entradas e julgamentos por mês, com o estoque ---------- */
export const exportarRitmo = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Mês', 'Entraram', 'Julgados', 'Em julgamento no fim do mês', 'Recursos esperando o plenário'], linhas: () => g(ctx).camaras.mensal.map(row => [mes(row.month), row.entradas, row.julgados, row.estoque, row.recursos]) });
/** Número em cima das barras dos mesmos meses que o eixo nomeia (um a cada três), para ler sem passar o mouse e sem amontoar. */
const rotuloMes = (color: string) => ({ show: true, position: 'top' as const, color, fontSize: 8.5, formatter: (params: any) => params.dataIndex % 3 === 0 ? int(params.value) : '' });
export function Ritmo({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = g(ctx).camaras.mensal.slice(-24), inicio = ctx.janela.start.slice(0, 7);
  const option = useMemo(() => ({
    grid: { top: 26, right: 6, bottom: 2, left: 4, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${mes(row.month)}</b><br/>${int(row.entradas)} entraram · ${int(row.julgados)} julgados<br/>${int(row.estoque)} em julgamento no fim do mês`; } },
    xAxis: eixoCategoria(tokens, rows.map(row => mes(row.month)), { axisLabel: { color: tokens.muted, fontSize: 10, interval: 2 } }),
    yAxis: [eixoValor(tokens), eixoValor(tokens, { splitLine: { show: false } })],
    series: [
      { name: 'Entraram', type: 'bar', barWidth: '32%', data: rows.map(row => row.entradas), itemStyle: { color: tokens.heat[1], borderRadius: [2, 2, 0, 0] }, label: rotuloMes(tokens.muted), markArea: { silent: true, itemStyle: { color: tokens.soft, opacity: 0.6 }, data: [[{ xAxis: mes(rows.find(row => row.month >= inicio)?.month ?? rows[0].month) }, { xAxis: mes(rows.at(-1)!.month) }]] } },
      { name: 'Julgados', type: 'bar', barWidth: '32%', data: rows.map(row => row.julgados), itemStyle: { color: tokens.brand, borderRadius: [2, 2, 0, 0] }, label: rotuloMes(tokens.ink) },
      { name: 'Em julgamento', type: 'line', yAxisIndex: 1, data: rows.map(row => row.estoque), symbol: 'none', smooth: 0.3, lineStyle: { color: tokens.accent, width: 2.4 },
        endLabel: { show: true, color: tokens.accent, fontWeight: 700, fontSize: 10, formatter: (params: any) => int(params.value) } },
    ],
  }), [rows, tokens, inicio]);
  return <Chart option={option} tokens={tokens} label="Processos que entraram e foram julgados por mês, com o estoque" />;
}

/* ---------- Idade dos processos em julgamento ---------- */
export const exportarIdade = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Câmara', ...faixasIdadeProcesso], linhas: () => linhasPorEstoque(ctx).map(row => [row.camara, ...row.idade.map(faixa => faixa.length)]) });
export function IdadeCalor({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = linhasPorEstoque(ctx), max = Math.max(1, ...rows.flatMap(row => row.idade.map(faixa => faixa.length)));
  const option = useMemo(() => ({
    grid: { top: 2, right: 4, bottom: 2, left: 2, containLabel: true },
    tooltip: { formatter: (item: any) => `<b>Câmara ${rows[item.value[1]].camara}</b><br/>Em julgamento há ${faixasIdadeProcesso[item.value[0]]}: <b>${int(item.value[2])}</b>` },
    xAxis: { type: 'category', position: 'top', data: faixasIdadeProcesso, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.muted, fontSize: 9.5, interval: 0 } },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => row.camara), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10 } },
    visualMap: { show: false, min: 0, max, inRange: { color: [tokens.soft, tokens.heat[1], tokens.accent, tokens.bad] } },
    series: [{ type: 'heatmap', data: rows.flatMap((row, y) => row.idade.map((faixa, x) => [x, y, faixa.length])), label: { show: true, fontSize: 10, fontWeight: 700, color: tokens.ink, formatter: (item: any) => item.value[2] ? int(item.value[2]) : '' }, itemStyle: { borderColor: tokens.surface, borderWidth: 2, borderRadius: 3 } }],
  }), [rows, tokens, max]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Processos em julgamento por câmara e tempo desde a entrada" onPick={params => { const [x, y] = params.value ?? []; const row = rows[y]; if (row) abrirProcessos(ctx, `Câmara ${row.camara} · em julgamento há ${faixasIdadeProcesso[x]}`, row.idade[x], 'Processos ainda sem julgamento, pela data de entrada na câmara.'); }} />;
}

/* ---------- Autos perto da prescrição ---------- */
const comRisco = (ctx: CockpitCtx) => g(ctx).camaras.linhas.filter(row => row.prescricao.some(faixa => faixa.length)).sort((a, b) => b.prescricao.flat().length - a.prescricao.flat().length);
const multa = (rows: LinhaCamara['estoque']) => rows.reduce((n, row) => n + (row.multa ?? 0), 0);
export const exportarPrescricao = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Câmara', ...faixasPrescricao.map(f => `Prescreve em ${f}`), 'Multas em risco (R$)'], linhas: () => comRisco(ctx).map(row => [row.camara, ...row.prescricao.map(faixa => faixa.length), multa(row.prescricao.flat())]) });
export function Prescricao({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = comRisco(ctx), cores = [tokens.bad, tokens.accent, tokens.heat[1]];
  const option = useMemo(() => ({
    grid: { top: 24, right: 74, bottom: 2, left: 2, containLabel: true }, legend: { ...legenda(tokens), data: faixasPrescricao.map(faixa => `em ${faixa}`) },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>Câmara ${row.camara}</b><br/>${faixasPrescricao.map((f, i) => `Prescreve em ${f}: ${int(row.prescricao[i].length)}`).join('<br/>')}<br/>Multas em risco: <b>${brl(multa(row.prescricao.flat()))}</b>`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.camara), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: faixasPrescricao.map((faixa, index) => ({ name: `em ${faixa}`, type: 'bar', stack: 'p', barWidth: 13, data: rows.map(row => row.prescricao[index].length), itemStyle: { color: cores[index], borderColor: tokens.surface, borderWidth: 1 },
      label: { show: true, position: 'inside', color: index === 2 ? tokens.ink : '#FFFFFF', fontSize: 9.5, fontWeight: 700, formatter: (params: any) => params.value || '' } })).concat([{ name: 'multas', type: 'bar', stack: 'p', barWidth: 13, data: rows.map(() => 0), itemStyle: { color: 'transparent' }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, fontWeight: 700, formatter: (params: any) => brl(multa(rows[params.dataIndex].prescricao.flat())) } } as any]),
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!rows.length) return <div className="empty-note">Nenhum auto em julgamento prescreve nos próximos 12 meses neste recorte.</div>;
  return <Chart option={option} tokens={tokens} label="Autos em julgamento que prescrevem nos próximos 12 meses, por câmara" onPick={params => { const row = rows[params.dataIndex]; if (!row) return; const faixa = params.seriesIndex < 3 ? row.prescricao[params.seriesIndex] : row.prescricao.flat();
    abrirProcessos(ctx, `Câmara ${row.camara} · autos perto da prescrição`, [...faixa].sort((a, b) => a.prescreveEm!.localeCompare(b.prescreveEm!)), 'Autos de infração ainda sem julgamento que completam cinco anos do fato nos próximos meses. Depois disso, a multa não pode mais ser cobrada (Lei 9.873/1999, art. 1º).', 'Paute primeiro os que prescrevem antes.'); }} />;
}

/* ---------- Decisões dos autos julgados ---------- */
const comDecisao = (ctx: CockpitCtx) => g(ctx).camaras.linhas.filter(row => decisoesAuto.some(d => row.decisoes[d].length));
export const exportarDecisoes = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Câmara', ...decisoesAuto], linhas: () => comDecisao(ctx).map(row => [row.camara, ...decisoesAuto.map(d => row.decisoes[d].length)]) });
export function Decisoes({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = comDecisao(ctx), cores = [tokens.brand, tokens.blue, tokens.heat[1], tokens.bad];
  const total = (row: LinhaCamara) => decisoesAuto.reduce((n, d) => n + row.decisoes[d].length, 0);
  const option = useMemo(() => ({
    grid: { top: 24, right: 36, bottom: 2, left: 2, containLabel: true }, legend: { ...legenda(tokens), data: decisoesAuto },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex], n = total(row); return `<b>Câmara ${row.camara}</b> · ${int(n)} autos julgados no período<br/>${decisoesAuto.map(d => `${d}: ${int(row.decisoes[d].length)} (${pct(row.decisoes[d].length / Math.max(1, n) * 100)})`).join('<br/>')}`; } },
    xAxis: { type: 'value', show: false, max: 100 }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.camara), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: decisoesAuto.map((d, index) => ({ name: d, type: 'bar', stack: 'd', barWidth: 13, data: rows.map(row => row.decisoes[d].length / Math.max(1, total(row)) * 100), itemStyle: { color: cores[index], borderColor: tokens.surface, borderWidth: 1 },
      label: { show: true, position: 'inside', color: index === 2 ? tokens.ink : '#FFFFFF', fontSize: 9, fontWeight: 700, formatter: (params: any) => params.value >= 9 ? pct(params.value) : '' } })).concat([{ name: 'total', type: 'bar', stack: 'd', barWidth: 13, data: rows.map(() => 0), itemStyle: { color: 'transparent' }, label: { show: true, position: 'right', color: tokens.muted, fontSize: 9.5, formatter: (params: any) => int(total(rows[params.dataIndex])) } } as any]),
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Decisões dos autos de infração julgados no período, por câmara" onPick={params => { const row = rows[params.dataIndex], d = decisoesAuto[params.seriesIndex]; if (row && d) abrirProcessos(ctx, `Câmara ${row.camara} · ${d.toLowerCase()}`, row.decisoes[d], 'Autos de infração julgados pela câmara no período, com esta decisão.'); }} />;
}

/* ---------- Plenário: cadeiras e profissionais de cada câmara ---------- */
export const exportarPlenario = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Câmara', 'Cadeiras', 'Cadeiras (%)', 'Profissionais ativos', 'Profissionais ativos (%)', 'Organizações'], linhas: () => g(ctx).plenario.map(row => [row.camara, row.cadeiras, row.parteCadeiras === null ? null : Math.round(row.parteCadeiras * 10) / 10, row.profissionais, row.parteProfissionais === null ? null : Math.round(row.parteProfissionais * 10) / 10, row.organizacoes.join(', ')]) });
export function Plenario({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => [...g(ctx).plenario].sort((a, b) => (b.parteProfissionais ?? b.parteCadeiras ?? 0) - (a.parteProfissionais ?? a.parteCadeiras ?? 0)), [ctx.gestao]); // eslint-disable-line react-hooks/exhaustive-deps
  const option = useMemo(() => ({
    grid: { top: 24, right: 14, bottom: 2, left: 2, containLabel: true }, legend: { ...legenda(tokens), data: ['Cadeiras no plenário', 'Profissionais ativos'] },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>Câmara ${row.camara}</b><br/>${int(row.cadeiras)} cadeiras (${row.parteCadeiras === null ? '—' : pct(row.parteCadeiras, 1)})<br/>${row.parteProfissionais === null ? 'sem modalidade própria no registro' : `${int(row.profissionais)} profissionais ativos (${pct(row.parteProfissionais, 1)})`}<br/><span style="opacity:.8">${row.organizacoes.slice(0, 8).join(', ')}${row.organizacoes.length > 8 ? '…' : ''}</span>`; } },
    xAxis: { type: 'value', axisLabel: { color: tokens.muted, fontSize: 9.5, formatter: '{value}%' }, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } } },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => row.camara), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: [
      { type: 'custom', silent: true, renderItem: (params: any, api: any) => { const row = rows[params.dataIndex]; if (row.parteProfissionais === null || row.parteCadeiras === null) return null; const a = api.coord([row.parteCadeiras, params.dataIndex]), b = api.coord([row.parteProfissionais, params.dataIndex]);
        return { type: 'line', shape: { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, style: { stroke: tokens.line, lineWidth: 3 } }; }, data: rows.map((_, index) => index), z: 1 },
      { name: 'Cadeiras no plenário', type: 'scatter', symbolSize: 11, data: rows.map(row => row.parteCadeiras), itemStyle: { color: tokens.brand }, z: 3, label: { show: true, position: 'top', distance: 4, color: tokens.brand, fontSize: 9.5, fontWeight: 700, formatter: (params: any) => pct(params.value) } },
      { name: 'Profissionais ativos', type: 'scatter', symbol: 'diamond', symbolSize: 11, data: rows.map(row => row.parteProfissionais), itemStyle: { color: tokens.accent }, z: 2, label: { show: true, position: 'bottom', distance: 4, color: tokens.muted, fontSize: 9.5, formatter: (params: any) => params.value === null ? '' : pct(params.value) } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Parte das cadeiras do plenário e parte dos profissionais ativos de cada câmara" />;
}
