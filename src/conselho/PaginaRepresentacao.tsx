import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { brl, data, int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador } from '../cockpit/ui';
import type { Exportavel } from '../cockpit/ui';
import { canais } from '../domain/entidades';
import { change, legenda } from '../gestao/comum';
import { abrirDeliberacoes, abrirMembros, nomeDe, parte, q } from './comum';

/**
 * Painel de Gestão do Conselho, página 5 (07/11/2026): como as cadeiras se dividem entre as câmaras e as modalidades do registro,
 * as mulheres no Conselho e no registro, o que as organizações com cadeira recebem do Conselho e as deliberações das atas do
 * Plenário que aprovam esse dinheiro, com quem propôs.
 */
export default function PaginaRepresentacao({ ctx }: { ctx: CockpitCtx }) {
  const c = q(ctx), repassado = c.organizacoesComCadeira.reduce((n, row) => n + row.repassado, 0), receberam = c.organizacoesComCadeira.filter(row => row.repassado > 0).length;
  const aprovado = c.deliberacoes.reduce((n, d) => n + d.valor, 0), conselheiras = c.membros.filter(m => m.genero === 'Feminino');
  return <div className="ck-grid ck-grid-cs-representacao">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores da representação">
      <Indicador destaque ficha="k-cadeiras" ctx={ctx} label="Cadeiras ocupadas" value={int(c.membros.length)} sub={`por ${int(c.organizacoesComCadeira.length)} organizações: ${int(c.organizacoes.entidades)} entidades e ${int(c.organizacoes.escolas)} escolas`}
        onOpen={() => abrirMembros(ctx, 'Cadeiras ocupadas', [...c.membros].sort((a, b) => a.sigla.localeCompare(b.sigla) || a.nome.localeCompare(b.nome)), 'Conselheiros em exercício na data, pela organização que indicou.')} />
      <Indicador ficha="k-mulheres" ctx={ctx} label="Conselheiras" value={parte(c.parteMulheres)} sub={`${int(conselheiras.length)} mulheres; no registro, elas são ${parte(c.parteMulheresRegistro)}`}
        onOpen={() => abrirMembros(ctx, 'Conselheiras', [...conselheiras].sort((a, b) => a.nome.localeCompare(b.nome)), 'Mulheres com mandato de conselheira na data escolhida.')} />
      <Indicador ficha="k-repasses" ctx={ctx} label="Repasses a quem tem cadeira" value={brl(repassado)} sub={`em 12 meses, a ${int(receberam)} das ${int(c.organizacoesComCadeira.length)} organizações`} onOpen={() => abrirOrganizacoes(ctx)} />
      <Indicador ficha="k-deliberacoes" ctx={ctx} label="Deliberações de repasse" value={int(c.deliberacoes.length)} variacao={{ value: change(c.deliberacoes.length, c.deliberacoesAntes) }} sub={`${brl(aprovado)} aprovados pelo Plenário no período`}
        onOpen={() => abrirDeliberacoes(ctx, 'Deliberações de repasse no período', c.deliberacoes, 'Convênios, contratos e patrocínios com organizações aprovados pelo Plenário no período, lidos das atas.')} />
      <Indicador ficha="k-conflitos" ctx={ctx} label="Propostos pela própria organização" value={int(c.conflitos.length)} sub="o conselheiro propôs repasse à organização que o indicou"
        onOpen={() => abrirDeliberacoes(ctx, 'Propostos pela própria organização', c.conflitos, 'Deliberações em que o conselheiro que propôs o repasse foi indicado pela organização que o recebe.', 'Não é irregularidade por si: confira na ata se o conselheiro declarou o impedimento e se absteve.')} />
    </section>
    <Bloco ctx={ctx} id="pl" area="pl" title="Cadeiras e profissionais de cada câmara" exportar={exportarPlenario(ctx)}><Plenario ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mu" area="mu" title="Mulheres no Conselho e no registro" exportar={exportarMulheres(ctx)}><Mulheres ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="or" area="or" title="Organizações com cadeira e o que receberam" exportar={exportarOrganizacoes(ctx)}><Organizacoes ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="dl" area="dl" title="Deliberações das atas" exportar={exportarDeliberacoes(ctx)}><Deliberacoes ctx={ctx} /></Bloco>
  </div>;
}

/** Duas partes lado a lado em cada linha (um círculo e um losango ligados por um traço), com os números escritos. */
function Haltere({ ctx, linhas, nomes, a, b, label, rotuloA, rotuloB }: { ctx: CockpitCtx; linhas: string[]; nomes: [string, string]; a: (number | null)[]; b: (number | null)[]; label: string; rotuloA?: (i: number) => string; rotuloB?: (i: number) => string }) {
  const { tokens } = ctx;
  const option = useMemo(() => ({
    grid: { top: 24, right: 14, bottom: 2, left: 2, containLabel: true }, legend: { ...legenda(tokens), data: nomes },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const i = items[0].dataIndex; return `<b>${linhas[i]}</b><br/>${nomes[0]}: ${a[i] === null ? '—' : pct(a[i]!, 1)}${rotuloA ? ` (${rotuloA(i)})` : ''}<br/>${nomes[1]}: ${b[i] === null ? 'sem dado' : pct(b[i]!, 1)}${rotuloB && b[i] !== null ? ` (${rotuloB(i)})` : ''}`; } },
    xAxis: { type: 'value', axisLabel: { color: tokens.muted, fontSize: 9.5, formatter: '{value}%' }, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } } },
    yAxis: { type: 'category', inverse: true, data: linhas, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: [
      { type: 'custom', silent: true, renderItem: (params: any, api: any) => { const i = params.dataIndex; if (a[i] === null || b[i] === null) return null; const p = api.coord([a[i], i]), r = api.coord([b[i], i]); return { type: 'line', shape: { x1: p[0], y1: p[1], x2: r[0], y2: r[1] }, style: { stroke: tokens.line, lineWidth: 3 } }; }, data: linhas.map((_, i) => i), z: 1 },
      { name: nomes[0], type: 'scatter', symbolSize: 11, data: a, itemStyle: { color: tokens.brand }, z: 3, label: { show: true, position: 'top', distance: 4, color: tokens.brand, fontSize: 9.5, fontWeight: 700, formatter: (p: any) => p.value === null ? '' : pct(p.value) } },
      { name: nomes[1], type: 'scatter', symbol: 'diamond', symbolSize: 11, data: b, itemStyle: { color: tokens.accent }, z: 2, label: { show: true, position: 'bottom', distance: 4, color: tokens.muted, fontSize: 9.5, formatter: (p: any) => p.value === null ? '' : pct(p.value) } },
    ],
  }), [linhas, a, b, tokens, nomes, rotuloA, rotuloB]);
  return <Chart option={option} tokens={tokens} label={label} />;
}

/* ---------- Cadeiras e profissionais por câmara ---------- */
const exportarPlenario = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Câmara', 'Cadeiras', 'Cadeiras (%)', 'Profissionais ativos', 'Profissionais ativos (%)', 'Organizações'], linhas: () => q(ctx).plenario.map(row => [row.camara, row.cadeiras, row.parteCadeiras === null ? null : Math.round(row.parteCadeiras * 10) / 10, row.profissionais, row.parteProfissionais === null ? null : Math.round(row.parteProfissionais * 10) / 10, row.organizacoes.join(', ')]) });
function Plenario({ ctx }: { ctx: CockpitCtx }) {
  const rows = useMemo(() => [...q(ctx).plenario].sort((a, b) => (b.parteProfissionais ?? b.parteCadeiras ?? 0) - (a.parteProfissionais ?? a.parteCadeiras ?? 0)), [ctx.gestao]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Haltere ctx={ctx} linhas={rows.map(row => row.camara)} nomes={['Cadeiras no Plenário', 'Profissionais ativos']} a={rows.map(row => row.parteCadeiras)} b={rows.map(row => row.parteProfissionais)}
    rotuloA={i => `${int(rows[i].cadeiras)} cadeiras`} rotuloB={i => `${int(rows[i].profissionais)} profissionais`} label="Parte das cadeiras do Plenário e parte dos profissionais ativos de cada câmara" />;
}

/* ---------- Mulheres por câmara ---------- */
const exportarMulheres = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Câmara', 'Conselheiras', 'Conselheiros e conselheiras', 'Conselheiras (%)', 'Mulheres no registro da modalidade (%)'], linhas: () => q(ctx).mulheres.map(row => [row.camara, row.conselheiras, row.conselheiros, row.parteConselho === null ? null : Math.round(row.parteConselho * 10) / 10, row.parteRegistro === null ? null : Math.round(row.parteRegistro * 10) / 10]) });
function Mulheres({ ctx }: { ctx: CockpitCtx }) {
  const rows = useMemo(() => [...q(ctx).mulheres].filter(row => row.conselheiros > 0).sort((a, b) => (b.parteRegistro ?? 0) - (a.parteRegistro ?? 0)), [ctx.gestao]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Haltere ctx={ctx} linhas={rows.map(row => row.camara)} nomes={['Conselheiras', 'Mulheres no registro']} a={rows.map(row => row.parteConselho)} b={rows.map(row => row.parteRegistro)}
    rotuloA={i => `${int(rows[i].conselheiras)} de ${int(rows[i].conselheiros)}`} label="Parte de mulheres entre os conselheiros e entre os profissionais ativos de cada câmara" />;
}

/* ---------- Organizações com cadeira e repasses ---------- */
/** A lista de todas as organizações com cadeira, pelo que receberam do Conselho em 12 meses, com os conselheiros de cada uma. */
function abrirOrganizacoes(ctx: CockpitCtx) {
  const rows = q(ctx).organizacoesComCadeira; if (!rows.length) return;
  ctx.open({ kind: 'linhas', title: 'Organizações com cadeira e o que receberam', what: 'Cada organização com conselheiro em exercício no recorte, pelo que recebeu do Conselho nos 12 meses até a data, por convênio, contrato ou patrocínio.', listTitle: 'Organizações, quem mais recebeu primeiro',
    summary: [['Organizações', int(rows.length)], ['Receberam', int(rows.filter(row => row.repassado > 0).length)], ['Em 12 meses', brl(rows.reduce((n, row) => n + row.repassado, 0))]],
    rows: rows.map(row => ({ key: row.orgId, title: `${row.sigla} · ${row.nome}`, subtitle: `${row.natureza} · ${int(row.cadeiras)} ${row.cadeiras === 1 ? 'cadeira' : 'cadeiras'}: ${row.membros.map(m => m.nome).join(', ')}`,
      value: brl(row.repassado), note: canais.map(canal => `${canal.toLowerCase()}: ${brl(row.porCanal[canal])}`).join('; '), sortValue: row.repassado })) });
}
const exportarOrganizacoes = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Sigla', 'Organização', 'Natureza', 'Cadeiras', 'Conselheiros', ...canais.map(canal => `${canal} em 12 meses (R$)`), 'Total em 12 meses (R$)'],
  linhas: () => q(ctx).organizacoesComCadeira.map(row => [row.sigla, row.nome, row.natureza, row.cadeiras, row.membros.map(m => m.nome).join('; '), ...canais.map(canal => Math.round(row.porCanal[canal])), Math.round(row.repassado)]) });
function Organizacoes({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, todas = q(ctx).organizacoesComCadeira, rows = todas.slice(0, 14), cores = [tokens.brand, tokens.blue, tokens.accent];
  const option = useMemo(() => ({
    grid: { top: 24, right: 118, bottom: 2, left: 2, containLabel: true }, legend: { ...legenda(tokens), data: [...canais] },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.sigla}</b> · ${row.nome}<br/>${int(row.cadeiras)} ${row.cadeiras === 1 ? 'cadeira' : 'cadeiras'}: ${row.membros.map(m => m.nome).join(', ')}<br/>${canais.map(canal => `${canal}: ${brl(row.porCanal[canal])}`).join('<br/>')}<br/>Em 12 meses: <b>${brl(row.repassado)}</b>`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.sigla), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10, fontWeight: 700 } },
    series: canais.map((canal, index) => ({ name: canal, type: 'bar', stack: 'r', barWidth: 11, data: rows.map(row => row.porCanal[canal]), itemStyle: { color: cores[index], borderColor: tokens.surface, borderWidth: 1 } }))
      .concat([{ name: 'total', type: 'bar', stack: 'r', barWidth: 11, data: rows.map(() => 0), itemStyle: { color: 'transparent' }, label: { show: true, position: 'right', fontSize: 9.5, color: tokens.ink,
        formatter: (p: any) => { const row = rows[p.dataIndex]; return `{v|${row.repassado ? brl(row.repassado) : 'nada'}} {c|${int(row.cadeiras)} ${row.cadeiras === 1 ? 'cadeira' : 'cadeiras'}}`; }, rich: { v: { fontWeight: 800, color: tokens.ink, fontSize: 10 }, c: { color: tokens.muted, fontSize: 9 } } } } as any]),
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!rows.length) return <div className="empty-note">Nenhuma organização com cadeira neste recorte.</div>;
  return <div className="cs-com-nota">
    <Chart option={option} tokens={tokens} label="Organizações com cadeira no Conselho pelo valor recebido em 12 meses, por canal" onPick={params => { const row = rows[params.dataIndex]; if (row) abrirMembros(ctx, `${row.sigla} · ${row.nome}`, row.membros, `Conselheiros indicados pela organização. Em 12 meses ela recebeu ${brl(row.repassado)} do Conselho (${canais.map(canal => `${canal.toLowerCase()}: ${brl(row.porCanal[canal])}`).join('; ')}).`); }} />
    <p className="cs-nota"><button className="cs-link" onClick={() => abrirOrganizacoes(ctx)}>Ver as {int(todas.length)} organizações com cadeira</button>{todas.length > rows.length ? ` · no gráfico, as ${int(rows.length)} que mais receberam` : ''}</p>
  </div>;
}

/* ---------- Deliberações das atas ---------- */
const exportarDeliberacoes = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Sessão', 'Organização', 'Canal', 'Objeto', 'Valor (R$)', 'Proposto por', 'Conselheiro da mesma organização'], linhas: () => q(ctx).deliberacoes.map(d => [data(d.data), d.organizacao, d.canal, d.objeto, d.valor, nomeDe(ctx, d.proponente), d.conflito ? 'sim' : 'não']) });
function Deliberacoes({ ctx }: { ctx: CockpitCtx }) {
  const rows = q(ctx).deliberacoes;
  if (!rows.length) return <div className="empty-note">Nenhuma deliberação de repasse no período neste recorte.</div>;
  return <div className="table-wrap"><table className="metodo is-dense">
    <thead><tr><th>Sessão</th><th>Organização</th><th>Canal</th><th className="num">Valor</th><th>Proposto por</th></tr></thead>
    <tbody>{rows.map(d => <tr key={d.id} className={d.conflito ? 'cs-conflito' : ''}><td>{data(d.data)}</td><td><b>{d.organizacao}</b><small>{d.objeto}</small></td><td>{d.canal}</td><td className="num">{brl(d.valor)}</td>
      <td><b>{nomeDe(ctx, d.proponente)}</b>{d.conflito && <small className="cs-conflito-nota">indicado pela mesma organização</small>}</td></tr>)}</tbody>
  </table></div>;
}
