import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { brl, int, money, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador } from '../cockpit/ui';
import type { Exportavel } from '../cockpit/ui';
import { desvios, nomeColegiado } from '../domain/colegiado';
import type { LinhaConselheiro } from '../domain/colegiado';
import { abrirPessoaDiarias, change, eixoCategoria, eixoValor, g, legenda } from '../gestao/comum';
import { abrirMembros, abrirPendentes, abrirTramitacoes, diasOu, parte, pontos, q } from './comum';

/**
 * Painel de Gestão do Conselho, página 3 (07/11/2026): cada conselheiro pela carga de processos e pelo tempo de relato, a presença
 * nas sessões, as diárias com o nome de quem recebeu, o relato com e sem IA e os pedidos de vista, impedimentos e diligências.
 */
const diariasDoRecorte = (ctx: CockpitCtx) => { const ids = new Set(q(ctx).membros.map(m => m.id)); return g(ctx).diariasPessoas.filter(row => row.categoria === 'Conselheiros' && ids.has(row.id)); };
export default function PaginaConselheiros({ ctx }: { ctx: CockpitCtx }) {
  const c = q(ctx), diarias = diariasDoRecorte(ctx), totalDiarias = diarias.reduce((n, row) => n + row.valor, 0);
  const relatos = c.comIa.length + c.semIa.length;
  return <div className="ck-grid ck-grid-cs-conselheiros">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores dos conselheiros">
      <Indicador destaque ficha="k-presenca" ctx={ctx} label="Presença nas sessões" value={parte(c.presenca)} variacao={{ value: pontos(c.presenca, c.presencaAntes), kind: 'pp' }} sub={`${int(c.sessoes)} sessões ordinárias no período`}
        onOpen={() => abrirMembros(ctx, 'Presença nas sessões', [...c.conselheiros].sort((a, b) => (a.presenca ?? 101) - (b.presenca ?? 101)).map(row => row.membro), 'Conselheiros em exercício com a presença nas sessões ordinárias do período, a menor primeiro.', presencaDe(c.conselheiros))} />
      <Indicador ficha="k-relato" ctx={ctx} label="Tempo de relato" value={diasOu(c.tempoRelato)} variacao={{ value: c.tempoRelato === null || c.tempoRelatoAntes === null ? null : change(c.tempoRelato, c.tempoRelatoAntes), goodUp: false }} sub="mediana, da distribuição ao relato assinado" />
      <Indicador ficha="k-ia" ctx={ctx} label="Relato com IA" value={diasOu(c.tempoComIa)} sub={`sem IA: ${diasOu(c.tempoSemIa)}; ${relatos ? pct(c.comIa.length / relatos * 100) : '—'} dos relatos usaram IA`}
        onOpen={() => abrirTramitacoes(ctx, 'Relatos feitos com IA no período', c.comIa, 'Processos com relato assinado no período em que o relator usou a IA de apoio ao relato.')} />
      <Indicador ficha="k-vista" ctx={ctx} label="Pedidos de vista" value={int(c.vistas)} variacao={{ value: change(c.vistas, c.vistasAntes), goodUp: false }} sub="processos que saíram da pauta para outro conselheiro ler" />
      <Indicador ficha="k-diarias" ctx={ctx} label="Diárias dos conselheiros" value={brl(totalDiarias)} sub={`${int(diarias.length)} ${diarias.length === 1 ? 'conselheiro recebeu' : 'conselheiros receberam'} em 12 meses`}
        onOpen={() => ctx.open({ kind: 'linhas', title: 'Diárias dos conselheiros', what: 'Conselheiros em exercício que receberam diárias nos 12 meses até a data de referência, com o número de diárias e o valor.', use: 'Diária paga não é irregularidade: compare com as sessões, as comissões e as viagens de representação de cada um.',
          listTitle: 'Conselheiros, maior valor primeiro', summary: [['Conselheiros', int(diarias.length)], ['Diárias', int(diarias.reduce((n, row) => n + row.quantidade, 0))], ['Valor', brl(totalDiarias)]],
          rows: diarias.map(row => ({ key: row.id, title: row.nome, subtitle: row.cargo, value: money(row.valor), note: `${int(row.quantidade)} diárias em ${int(row.meses)} ${row.meses === 1 ? 'mês' : 'meses'}`, sortValue: row.valor })) })} />
    </section>
    <Bloco ctx={ctx} id="cr" area="cr" title="Carga e tempo de relato de cada conselheiro" exportar={exportarCarga(ctx)}><Carga ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="pr" area="pr" title="Menor presença nas sessões" exportar={exportarPresenca(ctx)}><Presenca ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="di" area="di" title="Diárias por conselheiro" exportar={exportarDiarias(ctx)}><Diarias ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ia" area="ia" title="Relato com e sem IA, por trimestre" exportar={exportarIa(ctx)}><Ia ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="dv" area="dv" title="Vista, impedimento e diligência" exportar={exportarDesvios(ctx)}><Desvios ctx={ctx} /></Bloco>
  </div>;
}

const presencaDe = (linhas: LinhaConselheiro[]) => { const por = new Map(linhas.map(row => [row.membro.id, row])); return (m: { id: string }) => { const row = por.get(m.id)!; return { value: row.presenca === null ? 'sem sessão no período' : `${pct(row.presenca)} (${int(row.presencas)} de ${int(row.sessoes)} sessões)`, sortValue: row.presenca ?? 101 }; }; };

/* ---------- Carga × tempo de relato ---------- */
const exportarCarga = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Conselheiro', 'Câmara', 'Organização', 'Processos com ele', 'Relatos no período', 'Tempo de relato (dias, mediana)', 'Presença (%)', 'Pedidos de vista'],
  linhas: () => q(ctx).conselheiros.map(row => [row.membro.nome, row.membro.camara, row.membro.sigla, row.carga.length, row.relatos.length, row.tempoRelato, row.presenca === null ? null : Math.round(row.presenca), row.vistas]) });
function Carga({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, linhas = q(ctx).conselheiros.filter(row => row.tempoRelato !== null);
  const mediana = (values: number[]) => { const s = [...values].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  const mCarga = mediana(linhas.map(row => row.carga.length)), mTempo = mediana(linhas.map(row => row.tempoRelato!));
  const destaque = new Set([...[...linhas].sort((a, b) => b.carga.length - a.carga.length).slice(0, 4), ...[...linhas].sort((a, b) => b.tempoRelato! - a.tempoRelato!).slice(0, 3)].map(row => row.membro.id));
  const option = useMemo(() => ({
    grid: { top: 26, right: 18, bottom: 22, left: 8, containLabel: true },
    tooltip: { trigger: 'item', formatter: (item: any) => { const row = linhas[item.dataIndex]; return `<b>${row.membro.nome}</b> · ${nomeColegiado(row.membro.camara)}<br/>${int(row.carga.length)} processos com ele · ${int(row.relatos.length)} relatos no período<br/>Tempo de relato: <b>${int(row.tempoRelato!)} dias</b> (mediana)<br/><span style="opacity:.7">clique para ver os processos com ele</span>`; } },
    xAxis: { type: 'value', max: (v: { max: number }) => Math.ceil(v.max * 1.2), name: 'processos com o conselheiro', nameLocation: 'middle', nameGap: 20, nameTextStyle: { color: tokens.muted, fontSize: 10 }, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 9.5 } },
    yAxis: { type: 'value', name: 'dias de relato', nameTextStyle: { color: tokens.muted, fontSize: 10, align: 'left' }, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 9.5 } },
    series: [{ type: 'scatter', data: linhas.map(row => ({ value: [row.carga.length, row.tempoRelato], symbolSize: 6 + Math.min(16, row.relatos.length), label: { show: destaque.has(row.membro.id), formatter: row.membro.nome.split(' ').slice(0, 2).join(' ') },
      itemStyle: { color: row.carga.length > mCarga && row.tempoRelato! > mTempo ? tokens.bad : tokens.blue, opacity: 0.8, borderColor: tokens.surface, borderWidth: 1 } })),
      label: { position: 'right', color: tokens.ink, fontSize: 9.5 }, labelLayout: { hideOverlap: true },
      markLine: { silent: true, symbol: 'none', lineStyle: { color: tokens.muted, type: 'dashed' }, label: { color: tokens.muted, fontSize: 9, position: 'end', formatter: (p: any) => p.name }, data: [{ name: `mediana: ${int(mCarga)} processos`, xAxis: mCarga }, { name: `mediana: ${int(mTempo)} dias`, yAxis: mTempo }] } }],
  }), [linhas, tokens, mCarga, mTempo, destaque]);
  if (!linhas.length) return <div className="empty-note">Nenhum relato assinado no período neste recorte.</div>;
  return <Chart option={option} tokens={tokens} label="Conselheiros pela carga de processos e pelo tempo de relato" onPick={params => { const row = linhas[params.dataIndex]; if (row) abrirPendentes(ctx, `Com ${row.membro.nome}`, row.carga, `Processos esperando voto com ${row.membro.nome}, relator na ${nomeColegiado(row.membro.camara)}.`); }} />;
}

/* ---------- Presença ---------- */
const comSessoes = (ctx: CockpitCtx) => q(ctx).conselheiros.filter(row => row.sessoes >= 3 && row.presenca !== null).sort((a, b) => a.presenca! - b.presenca! || a.membro.nome.localeCompare(b.membro.nome));
const exportarPresenca = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Conselheiro', 'Câmara', 'Sessões no período', 'Presenças', 'Presença (%)'], linhas: () => q(ctx).conselheiros.map(row => [row.membro.nome, row.membro.camara, row.sessoes, row.presencas, row.presenca === null ? null : Math.round(row.presenca)]) });
function Presenca({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = comSessoes(ctx).slice(0, 10), media = q(ctx).presenca;
  const option = useMemo(() => ({
    grid: { top: 18, right: 70, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.membro.nome}</b> · ${nomeColegiado(row.membro.camara)}<br/>${int(row.presencas)} presenças em ${int(row.sessoes)} sessões (${pct(row.presenca!)})`; } },
    xAxis: { type: 'value', show: false, max: 100 }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.membro.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10 } },
    series: [{ type: 'bar', barWidth: 11, data: rows.map(row => ({ value: row.presenca, itemStyle: { color: row.presenca! < 75 ? tokens.bad : tokens.warn, borderRadius: [0, 3, 3, 0] } })),
      label: { show: true, position: 'right', fontSize: 9.5, color: tokens.ink, formatter: (params: any) => { const row = rows[params.dataIndex]; return `{b|${pct(row.presenca!)}} {s|${int(row.presencas)} de ${int(row.sessoes)}}`; }, rich: { b: { fontWeight: 800, fontSize: 10, color: tokens.ink }, s: { fontSize: 9, color: tokens.muted } } },
      markLine: media === null ? undefined : { silent: true, symbol: 'none', lineStyle: { color: tokens.muted, type: 'dashed' }, label: { formatter: `média ${pct(media)}`, color: tokens.muted, fontSize: 9, position: 'end' }, data: [{ xAxis: media }] } }],
  }), [rows, tokens, media]);
  if (!rows.length) return <div className="empty-note">Nenhum conselheiro com três sessões ou mais no período neste recorte.</div>;
  return <Chart option={option} tokens={tokens} label="Os dez conselheiros com menor presença nas sessões do período" onPick={() => abrirMembros(ctx, 'Presença nas sessões', comSessoes(ctx).map(row => row.membro), 'Conselheiros com três sessões ou mais no período, a menor presença primeiro.', presencaDe(q(ctx).conselheiros))} />;
}

/* ---------- Diárias por conselheiro ---------- */
const exportarDiarias = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Conselheiro', 'Indicação', 'Diárias em 12 meses', 'Meses com diária', 'Valor (R$)'], linhas: () => diariasDoRecorte(ctx).map(row => [row.nome, row.cargo, row.quantidade, row.meses, Math.round(row.valor)]) });
function Diarias({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = diariasDoRecorte(ctx).slice(0, 10);
  const option = useMemo(() => ({
    grid: { top: 4, right: 64, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.nome}</b><br/>${row.cargo}<br/>${int(row.quantidade)} diárias em ${int(row.meses)} meses: <b>${money(row.valor)}</b><br/><span style="opacity:.7">clique para ver mês a mês</span>`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10 } },
    series: [{ type: 'bar', barWidth: 11, data: rows.map(row => row.valor), itemStyle: { color: tokens.brand, borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', fontSize: 9.5, fontWeight: 700, color: tokens.ink, formatter: (params: any) => brl(params.value) } }],
  }), [rows, tokens]);
  if (!rows.length) return <div className="empty-note">Nenhuma diária de conselheiro nos 12 meses neste recorte.</div>;
  return <Chart option={option} tokens={tokens} label="Os dez conselheiros que mais receberam diárias em 12 meses" onPick={params => { const row = rows[params.dataIndex]; if (row) abrirPessoaDiarias(ctx, row); }} />;
}

/* ---------- Relato com e sem IA ---------- */
const exportarIa = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Trimestre', 'Relato com IA (dias, mediana)', 'Relato sem IA (dias, mediana)', 'Relatos com IA (%)'], linhas: () => q(ctx).iaTrimestral.map(row => [row.trimestre, row.comIa, row.semIa, row.parteIa === null ? null : Math.round(row.parteIa)]) });
function Ia({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = q(ctx).iaTrimestral, rotulo = (t: string) => t.replace('-T', ' T').replace(/^(\d{4}) T(\d)$/, '$2º tri $1');
  const option = useMemo(() => ({
    grid: { top: 26, right: 8, bottom: 2, left: 4, containLabel: true }, legend: { ...legenda(tokens), data: ['Relatos com IA', 'Dias com IA', 'Dias sem IA'] },
    tooltip: { trigger: 'axis', formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${rotulo(row.trimestre)}</b><br/>${row.parteIa === null ? '—' : pct(row.parteIa)} dos relatos com IA<br/>Com IA: ${diasOu(row.comIa)} · sem IA: ${diasOu(row.semIa)}`; } },
    xAxis: eixoCategoria(tokens, rows.map(row => rotulo(row.trimestre))),
    yAxis: [eixoValor(tokens), eixoValor(tokens, { max: 100, splitLine: { show: false }, axisLabel: { color: tokens.muted, fontSize: 9.5, formatter: '{value}%' } })],
    series: [
      { name: 'Relatos com IA', type: 'bar', yAxisIndex: 1, barWidth: '38%', data: rows.map(row => row.parteIa), itemStyle: { color: tokens.soft, borderColor: tokens.line, borderRadius: [2, 2, 0, 0] }, label: { show: true, position: 'insideBottom', color: tokens.muted, fontSize: 9, formatter: (p: any) => p.value === null ? '' : pct(p.value) } },
      { name: 'Dias com IA', type: 'line', data: rows.map(row => row.comIa), symbol: 'circle', symbolSize: 6, lineStyle: { color: tokens.good, width: 2.4 }, itemStyle: { color: tokens.good }, label: { show: true, position: 'bottom', color: tokens.good, fontSize: 9.5, fontWeight: 700, formatter: (p: any) => p.value === null ? '' : int(p.value) } },
      { name: 'Dias sem IA', type: 'line', data: rows.map(row => row.semIa), symbol: 'circle', symbolSize: 6, lineStyle: { color: tokens.accent, width: 2.4 }, itemStyle: { color: tokens.accent }, label: { show: true, position: 'top', color: tokens.accent, fontSize: 9.5, fontWeight: 700, formatter: (p: any) => p.value === null ? '' : int(p.value) } },
    ],
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!rows.length) return <div className="empty-note">A IA de apoio ao relato começou em julho de 2025; ainda não há relatos nesta data.</div>;
  return <Chart option={option} tokens={tokens} label="Tempo de relato com e sem IA e parte dos relatos com IA, por trimestre" />;
}

/* ---------- Vista, impedimento e diligência por colegiado ---------- */
const exportarDesvios = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Colegiado', ...desvios], linhas: () => q(ctx).desvios.map(row => [nomeColegiado(row.colegiado), ...desvios.map(d => row.porTipo[d].length)]) });
function Desvios({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = q(ctx).desvios.filter(row => desvios.some(d => row.porTipo[d].length)), cores = [tokens.blue, tokens.bad, tokens.warn];
  const option = useMemo(() => ({
    grid: { top: 24, right: 30, bottom: 2, left: 2, containLabel: true }, legend: { ...legenda(tokens), data: [...desvios] },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${nomeColegiado(row.colegiado)}</b><br/>${desvios.map(d => `${d}: ${int(row.porTipo[d].length)}`).join('<br/>')}`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.colegiado), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10 } },
    series: desvios.map((d, index) => ({ name: d, type: 'bar', stack: 'd', barWidth: 11, data: rows.map(row => row.porTipo[d].length), itemStyle: { color: cores[index], borderColor: tokens.surface, borderWidth: 1 },
      label: { show: true, position: 'inside', color: index === 2 ? '#1A202C' : '#FFFFFF', fontSize: 9, fontWeight: 700, formatter: (p: any) => p.value || '' } })),
  }), [rows, tokens]);
  if (!rows.length) return <div className="empty-note">Nenhum pedido de vista, impedimento ou diligência no período neste recorte.</div>;
  return <Chart option={option} tokens={tokens} label="Pedidos de vista, impedimentos e diligências no período, por colegiado" onPick={params => { const row = rows[params.dataIndex], d = desvios[params.seriesIndex]; if (row && d) abrirTramitacoes(ctx, `${nomeColegiado(row.colegiado)} · ${d.toLowerCase()}`, row.porTipo[d], `Processos com ${d.toLowerCase()} no período.`); }} />;
}
