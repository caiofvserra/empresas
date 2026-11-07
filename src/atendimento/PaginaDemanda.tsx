import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { data, int, mes, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador, avisoVazio, nomeEmpresa } from '../cockpit/ui';
import type { Exportavel } from '../cockpit/ui';
import { corDoTexto } from '../cockpit/formatos';
import { mesAno } from '../painel/evolucao';
import type { Evolucao } from '../painel/evolucao';
import { tiposOuvidoria } from '../domain/atendimento';
import { municipioPorId } from '../domain/municipios';
import { change, eixoCategoria, eixoValor, legenda } from '../gestao/comum';
import { a, decimal } from './comum';

/**
 * Painel de Atendimento, página 3 (07/11/2026): a demanda que vem de fora e o que se espera dela. Aberturas de empresas de engenharia
 * na Receita Federal contra os pedidos de registro de empresa, formandos do INEP contra os pedidos de registro de profissional,
 * protocolos de ART contra as ARTs registradas, a previsão dos três meses seguintes e os pedidos de informação e a ouvidoria.
 */
export default function PaginaDemanda({ ctx }: { ctx: CockpitCtx }) {
  const { d, servidores } = a(ctx), conv = d.conversaoAberturas, f = d.formatura;
  const seguintes = d.previsao.filter(m => m.previsto !== null), ultimos = d.art.slice(-12), anteriores = d.art.slice(-24, -12);
  const porMil = (rows: typeof d.art) => { const arts = rows.reduce((n, m) => n + m.arts, 0); return arts ? rows.reduce((n, m) => n + m.protocolos, 0) / arts * 1000 : null; };
  const artAgora = porMil(ultimos), artAntes = porMil(anteriores), lai = d.lai.at(-1)!;
  const series = useMemo(() => { const meses = d.previsao.filter(m => m.total !== null).map(m => m.mes);
    return { total: { tipo: 'fluxo', meses, valores: d.previsao.filter(m => m.total !== null).map(m => m.total), fmt: int, nome: 'Protocolos abertos no mês' } as Evolucao,
      art: { tipo: 'taxa', meses: d.art.map(m => m.mes), valores: d.art.map(m => m.porMil), fmt: (v: number) => decimal(v), goodUp: false } as Evolucao }; }, [d]);
  return <div className="ck-grid ck-grid-at-demanda">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores da demanda">
      <Indicador destaque ficha="k-previsao" ctx={ctx} label="Previstos nos próximos 3 meses" serie={series.total} value={int(d.proximos)}
        sub={`de ${mesAno(seguintes[0].mes)} a ${mesAno(seguintes.at(-1)!.mes)}${servidores ? `, cerca de ${int(d.proximos / servidores)} por colaborador` : ''}`} />
      <Indicador ficha="k-aberturas" ctx={ctx} label="Empresas novas que pediram registro" value={conv.aberturas ? pct(conv.pediram / conv.aberturas * 100) : '—'}
        sub={`${int(conv.pediram)} das ${int(conv.aberturas)} aberturas de engenharia na Receita, em até 180 dias`} onOpen={() => abrirSemPedido(ctx)} />
      <Indicador ficha="k-formados" ctx={ctx} label={`Formados de ${f.ano} já registrados`} value={f.concluintes ? pct(f.registrados / f.concluintes * 100) : '—'}
        sub={`${int(f.registrados)} dos ${int(f.concluintes)} concluintes do INEP no recorte`} />
      <Indicador ficha="k-art" ctx={ctx} label="Protocolos de ART por 1.000 ARTs" serie={series.art} value={artAgora === null ? '—' : decimal(artAgora)}
        variacao={{ value: artAgora === null || artAntes === null ? null : change(artAgora, artAntes), goodUp: false, label: 'em relação aos 12 meses anteriores' }} sub="baixa, cancelamento e regularização, em 12 meses" />
      <Indicador ficha="k-lai" ctx={ctx} label={`Pedidos de informação em ${lai.ano}`} value={int(lai.pedidos)} sub={`${lai.pedidos ? pct(lai.noPrazo / lai.pedidos * 100) : '—'} respondidos no prazo; ${int(lai.recursos)} recursos`} />
    </section>
    <Bloco ctx={ctx} id="pv" area="pv" title="Protocolos por mês e os três meses seguintes" exportar={{ cabecalho: ['Mês', 'Protocolos abertos', 'Previstos'], linhas: () => d.previsao.map(m => [m.mes, m.total, m.previsto]) }}><Previsao ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ab" vazio={avisoVazio(!d.aberturas.some(m => m.aberturas || m.pedidos), 'Nenhuma abertura nem pedido de registro')} area="ab" title="Aberturas na Receita e pedidos de registro de empresa" exportar={{ cabecalho: ['Mês', 'Aberturas de engenharia na Receita', 'Pedidos de registro de empresa'], linhas: () => d.aberturas.map(m => [m.mes, m.aberturas, m.pedidos]) }}><Aberturas ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="fo" vazio={avisoVazio(!d.registros.some(m => m.pedidos), 'Nenhum pedido de registro de profissional')} area="fo" title="Pedidos de registro de profissional e a formatura" exportar={{ cabecalho: ['Mês', 'Pedidos de registro de profissional'], linhas: () => d.registros.map(m => [m.mes, m.pedidos]) }}><Formatura ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ar" vazio={avisoVazio(!d.art.some(m => m.arts), 'Nenhuma ART registrada')} area="ar" title="Protocolos de ART por 1.000 ARTs registradas" exportar={{ cabecalho: ['Mês', 'Protocolos de ART', 'ARTs registradas', 'Por 1.000 ARTs'], linhas: () => d.art.map(m => [m.mes, m.protocolos, m.arts, m.porMil === null ? null : Math.round(m.porMil * 10) / 10]) }}><Art ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="la" area="la" title="Pedidos de informação e ouvidoria, por ano" exportar={{ cabecalho: ['Ano', 'Pedidos de informação', 'Respondidos no prazo', 'Recursos', ...tiposOuvidoria], linhas: () => d.lai.map(l => [l.ano, l.pedidos, l.noPrazo, l.recursos, ...tiposOuvidoria.map(t => l.ouvidoria[t])]) }}><Lai ctx={ctx} /></Bloco>
  </div>;
}

/** As empresas abertas na Receita de 6 a 18 meses antes da data que não pediram registro em até 180 dias. */
function abrirSemPedido(ctx: CockpitCtx) {
  const ids = new Set(a(ctx).d.conversaoAberturas.semPedido), cidades = municipioPorId(ctx.dataset), estabelecimentos = ctx.dataset.establishments.filter(e => ids.has(e.id));
  if (!estabelecimentos.length) return;
  ctx.open({ kind: 'linhas', title: 'Abertas sem pedido de registro', what: 'Estabelecimentos com atividade de engenharia abertos na Receita Federal de 6 a 18 meses antes da data escolhida que não pediram registro no Crea-SP em até 180 dias da abertura.',
    use: 'Nem toda empresa com atividade de engenharia precisa de registro: confira a atividade antes de orientar ou fiscalizar.', listTitle: 'Estabelecimentos, abertos há mais tempo primeiro',
    summary: [['Estabelecimentos', int(estabelecimentos.length)], ['Municípios', int(new Set(estabelecimentos.map(e => e.cityId)).size)]],
    rows: estabelecimentos.map(e => ({ key: e.id, companyId: e.companyId, title: nomeEmpresa(ctx, e.companyId), subtitle: `${cidades.get(e.cityId)?.nome ?? ''}, ${e.branch === 'Matriz' ? 'matriz' : 'filial'}`, value: `aberta em ${data(e.openedAt)}`, note: 'sem pedido de registro no Crea-SP', sortValue: Date.parse(e.openedAt) })) });
}

function Previsao({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = a(ctx).d.previsao;
  const option = useMemo(() => ({
    grid: { top: 26, right: 6, bottom: 2, left: 4, containLabel: true }, legend: { ...legenda(tokens), data: ['Abertos', 'Previstos'] },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const m = rows[items[0].dataIndex]; return `<b>${mesAno(m.mes)}</b><br/>${m.total !== null ? `Abertos: ${int(m.total)}` : `Previstos: ${int(m.previsto!)}<br/><span style="opacity:.8">o mesmo mês um ano antes, corrigido pela tendência dos 12 meses</span>`}`; } },
    xAxis: eixoCategoria(tokens, rows.map(m => mes(m.mes))), yAxis: eixoValor(tokens),
    series: [{ name: 'Abertos', type: 'bar', stack: 'p', barMaxWidth: 22, data: rows.map(m => m.total), itemStyle: { color: tokens.cat[0], borderRadius: [3, 3, 0, 0] },
      label: { show: true, position: 'top', color: tokens.muted, fontSize: 11, formatter: (p: any) => p.dataIndex >= rows.length - 15 && p.value !== null ? int(p.value) : '' } },
      { name: 'Previstos', type: 'bar', stack: 'p', barMaxWidth: 22, data: rows.map(m => m.previsto), itemStyle: { color: tokens.surface, borderColor: tokens.cat[0], borderWidth: 1.5, borderType: 'dashed', borderRadius: [3, 3, 0, 0] },
        label: { show: true, position: 'top', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (p: any) => p.value === null ? '' : int(p.value) } }],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Protocolos abertos por mês nos últimos 24 meses e os previstos para os três meses seguintes" />;
}

function Aberturas({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = a(ctx).d.aberturas.slice(-12);
  const option = useMemo(() => ({
    grid: { top: 26, right: 6, bottom: 2, left: 4, containLabel: true }, legend: { ...legenda(tokens), data: ['Aberturas de engenharia na Receita', 'Pedidos de registro de empresa'] },
    tooltip: { trigger: 'axis', formatter: (items: any[]) => { const m = rows[items[0].dataIndex]; return `<b>${mesAno(m.mes)}</b><br/>Aberturas na Receita: ${m.aberturas === null ? 'o arquivo do mês ainda não saiu' : int(m.aberturas)}<br/>Pedidos de registro: ${int(m.pedidos)}`; } },
    xAxis: eixoCategoria(tokens, rows.map(m => mes(m.mes))), yAxis: { type: 'value', show: false },
    series: [{ name: 'Aberturas de engenharia na Receita', type: 'bar', barMaxWidth: 18, data: rows.map(m => m.aberturas), itemStyle: { color: tokens.heat[1], borderRadius: [3, 3, 0, 0] }, label: { show: true, position: 'top', color: tokens.muted, fontSize: 11 } },
      { name: 'Pedidos de registro de empresa', type: 'bar', barMaxWidth: 18, data: rows.map(m => m.pedidos), itemStyle: { color: tokens.brand, borderRadius: [3, 3, 0, 0] }, label: { show: true, position: 'top', color: tokens.ink, fontSize: 11, fontWeight: 700 } }],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Aberturas de estabelecimentos de engenharia na Receita e pedidos de registro de empresa, por mês" onPick={() => abrirSemPedido(ctx)} />;
}

function Formatura({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, { registros, formatura: f } = a(ctx).d, rows = registros.slice(-12), max = Math.max(...rows.map(m => m.pedidos));
  const option = useMemo(() => ({
    grid: { top: 8, right: 6, bottom: 2, left: 4, containLabel: true },
    tooltip: { trigger: 'axis', formatter: (items: any[]) => { const m = rows[items[0].dataIndex]; return `<b>${mesAno(m.mes)}</b><br/>${int(m.pedidos)} pedidos de registro de profissional`; } },
    xAxis: eixoCategoria(tokens, rows.map(m => mes(m.mes))), yAxis: { type: 'value', show: false },
    series: [{ type: 'bar', barMaxWidth: 26, data: rows.map(m => ({ value: m.pedidos, itemStyle: { color: m.pedidos === max ? tokens.accent : tokens.cat[0], borderRadius: [3, 3, 0, 0] } })),
      label: { show: true, position: 'top', color: tokens.ink, fontSize: 11, fontWeight: 700 } }],
  }), [rows, tokens, max]);
  return <div className="cs-com-nota"><Chart option={option} tokens={tokens} label="Pedidos de registro de profissional por mês" />
    <p className="cs-nota">INEP: <b>{int(f.concluintes)}</b> concluintes em {f.ano} no recorte, <b>{int(f.registrados)}</b> já registrados. Em amarelo, o mês com mais pedidos.</p></div>;
}

function Art({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = a(ctx).d.art.slice(-12);
  const option = useMemo(() => ({
    grid: { top: 26, right: 8, bottom: 2, left: 4, containLabel: true }, legend: { ...legenda(tokens), data: ['Protocolos de ART', 'Por 1.000 ARTs'] },
    tooltip: { trigger: 'axis', formatter: (items: any[]) => { const m = rows[items[0].dataIndex]; return `<b>${mesAno(m.mes)}</b><br/>${int(m.protocolos)} protocolos de ART para ${int(m.arts)} ARTs registradas<br/>${m.porMil === null ? '—' : decimal(m.porMil)} por 1.000 ARTs`; } },
    xAxis: eixoCategoria(tokens, rows.map(m => mes(m.mes))), yAxis: [{ type: 'value', show: false }, { type: 'value', show: false }],
    series: [{ name: 'Protocolos de ART', type: 'bar', barMaxWidth: 22, data: rows.map(m => m.protocolos), itemStyle: { color: tokens.heat[1], borderRadius: [3, 3, 0, 0] }, label: { show: true, position: 'insideBottom', color: corDoTexto(tokens.heat[1]), fontSize: 11 } },
      { name: 'Por 1.000 ARTs', type: 'line', yAxisIndex: 1, data: rows.map(m => m.porMil), symbol: 'circle', symbolSize: 5, lineStyle: { color: tokens.bad, width: 2 }, itemStyle: { color: tokens.bad },
        label: { show: true, position: 'top', color: tokens.bad, fontSize: 11, fontWeight: 700, formatter: (p: any) => p.value === null ? '' : decimal(p.value, 0) } }],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Protocolos de baixa, cancelamento e regularização de ART por mês e por 1.000 ARTs registradas" />;
}

function Lai({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = a(ctx).d.lai, cores = [tokens.bad, tokens.cat[0], tokens.accent, tokens.cat[2], tokens.good];
  const option = useMemo(() => ({
    grid: { top: 26, right: 6, bottom: 2, left: 4, containLabel: true }, legend: { ...legenda(tokens), data: [...tiposOuvidoria, 'Pedidos de informação'] },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const l = rows[items[0].dataIndex]; return `<b>${l.ano}</b><br/>${tiposOuvidoria.map(t => `${t}: ${int(l.ouvidoria[t])}`).join('<br/>')}<br/>Pedidos de informação: ${int(l.pedidos)}, ${int(l.noPrazo)} no prazo, ${int(l.recursos)} recursos`; } },
    xAxis: eixoCategoria(tokens, rows.map(l => String(l.ano))), yAxis: { type: 'value', show: false },
    series: [...tiposOuvidoria.map((t, i) => ({ name: t, type: 'bar', stack: 'o', barMaxWidth: 40, data: rows.map(l => l.ouvidoria[t]), itemStyle: { color: cores[i], borderColor: tokens.surface, borderWidth: 1 },
      label: { show: true, position: 'inside', color: corDoTexto(cores[i]), fontSize: 11, formatter: (p: any) => p.value >= 200 ? int(p.value) : '' } })),
      { name: 'Pedidos de informação', type: 'bar', stack: 'l', barMaxWidth: 40, data: rows.map(l => l.pedidos), itemStyle: { color: tokens.brand, borderRadius: [3, 3, 0, 0] },
        label: { show: true, position: 'top', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (p: any) => int(p.value) } }],
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="cs-com-nota"><Chart option={option} tokens={tokens} label="Manifestações da ouvidoria por tipo e pedidos de acesso à informação, por ano" />
    <p className="cs-nota">Dado demonstrativo. Em produção, vem do Portal da Transparência do Crea-SP; o ano da data vai só até ela.</p></div>;
}
