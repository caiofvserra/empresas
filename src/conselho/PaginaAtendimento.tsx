import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Chart } from '../painel/chart';
import { int, mes, money, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { situacaoPedido, situacoesPedido } from '../cockpit/estrutura';
import type { Estrutura, SituacaoPedido } from '../cockpit/estrutura';
import { Bloco, Indicador, carregando } from '../cockpit/ui';
import type { Exportavel } from '../cockpit/ui';
import { canaisAtendimento, canalPorDistancia } from '../domain/gestao';
import { municipioPorId } from '../domain/municipios';
import { situacaoEm } from '../domain/profissionais';
import { MapaMunicipios, g, legenda } from './comum';
import type { Medida } from './comum';

/**
 * Painel de Gestão do Conselho, página 5 (veio do painel geral em 06/11/2026): prazos do atendimento, o canal por onde cada pedido
 * chega, a distância de cada um dos 645 municípios até a unidade de atendimento mais próxima e o uso dos coworkings.
 */
const change = (now: number, before: number) => before > 0 ? (now - before) / before * 100 : null;

export default function PaginaAtendimento({ ctx }: { ctx: CockpitCtx }) {
  const { estrutura, metas } = ctx, [metrica, setMetrica] = useState<MetricaDistancia>('km');
  const longe = useMemo(() => { const d = g(ctx).distancia, ativos = ctx.profissionais.modelo.profissionais.filter(row => situacaoEm(row, ctx.anchor) === 'Ativo' && (!ctx.greId || row.greId === ctx.greId) && (!ctx.cidadeId || row.cityId === ctx.cidadeId));
    return { ativos: ativos.length, longe: ativos.filter(row => (d.get(row.cityId)?.km ?? 0) > 50) }; }, [ctx.gestao, ctx.profissionais.modelo, ctx.anchor, ctx.greId, ctx.cidadeId]); // eslint-disable-line react-hooks/exhaustive-deps
  const medida = useMemo(() => medidaDistancia(ctx, metrica), [ctx.gestao, ctx.profissionais.modelo, ctx.anchor, metrica]); // eslint-disable-line react-hooks/exhaustive-deps
  const cidades = municipioPorId(ctx.dataset), nomeGre = new Map(ctx.dataset.gres.map(row => [row.id, row.name]));
  if (!estrutura) return <div className="ck-grid ck-grid-cs-atendimento"><div className="ck-wait">{carregando}</div></div>;
  const { atendimento, coworking } = estrutura;
  return <div className="ck-grid ck-grid-cs-atendimento">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores de atendimento e estrutura">
      <Indicador destaque ficha="k-prazo" ctx={ctx} label="Solicitações resolvidas no prazo" value={atendimento.taxaNoPrazo === null ? '—' : pct(atendimento.taxaNoPrazo)} meta={{ atual: atendimento.taxaNoPrazo, alvo: metas.atendimento }}
        variacao={{ value: atendimento.taxaNoPrazo === null || atendimento.taxaNoPrazoAntes === null ? null : atendimento.taxaNoPrazo - atendimento.taxaNoPrazoAntes, kind: 'pp' }} sub={`em até 14 dias; a meta é ${metas.atendimento}%`} />
      <Indicador ficha="k-solicitacoes" ctx={ctx} label="Solicitações de atendimento" value={int(atendimento.pedidos.length)} variacao={{ value: change(atendimento.pedidos.length, atendimento.totalAntes) }} sub={`${pct(atendimento.empresas / Math.max(1, atendimento.pedidos.length) * 100)} vindas de empresas`} />
      <Indicador ficha="k-tempo" ctx={ctx} label="Tempo de resolução" value={atendimento.medianaDias === null ? '—' : `${int(atendimento.medianaDias)} dias`} sub={`tempo típico (mediana); ${int(atendimento.partes['Em aberto, prazo vencido'].length)} pedidos abertos já passaram do prazo`} />
      <Indicador ficha="k-distancia" ctx={ctx} label="Moram a mais de 50 km de uma unidade" value={longe.ativos ? pct(longe.longe.length / longe.ativos * 100) : '—'} sub={`${int(longe.longe.length)} dos ${int(longe.ativos)} profissionais ativos do recorte, em linha reta`} />
      <Indicador ficha="k-coworking" ctx={ctx} label="Ocupação dos coworkings" value={coworking.ocupacao === null ? '—' : pct(coworking.ocupacao)} variacao={{ value: coworking.ocupacao === null || coworking.ocupacaoAntes === null ? null : coworking.ocupacao - coworking.ocupacaoAntes, kind: 'pp' }}
        sub={coworking.unidades.length ? `${int(coworking.unidades.length)} unidades · ${int(coworking.usuarios)} usuários · ${coworking.usadas ? money(coworking.custo / coworking.usadas) : '—'} por hora usada` : 'sem unidade nesta regional'} />
    </section>
    <Bloco ctx={ctx} id="mp" area="mp" title="Distância até a unidade mais próxima"
      exportar={{ cabecalho: ['Município', 'GRE', 'Unidade mais próxima', 'Distância em linha reta (km)', 'Profissionais ativos'], linhas: () => [...g(ctx).distancia].map(([id, row]) => [cidades.get(id)?.nome ?? id, nomeGre.get(cidades.get(id)?.greId ?? '') ?? '', row.unidade, row.km, g(ctx).adimplencia.get(id)?.ativos.length ?? 0]) }}
      actions={<label className="ck-select is-compact"><span className="sr-only">Indicador do mapa</span><select value={metrica} onChange={event => setMetrica(event.target.value as MetricaDistancia)}>{(Object.keys(metricasDistancia) as MetricaDistancia[]).map(id => <option key={id} value={id}>{metricasDistancia[id]}</option>)}</select><ChevronDown size={14} /></label>}>
      <MapaMunicipios ctx={ctx} medida={medida} onCidade={cityId => ctx.filtrar({ cidade: cityId })} onGre={greId => ctx.filtrar({ gre: greId })} /></Bloco>
    <Bloco ctx={ctx} id="as" area="as" title="Solicitações por assunto e situação" exportar={{ cabecalho: ['Assunto', ...situacoesPedido, 'Total'], linhas: () => atendimento.porAssunto.map(row => [row.assunto, ...situacoesPedido.map(item => row.partes[item].length), row.total]) }}><Assuntos ctx={ctx} estrutura={estrutura} /></Bloco>
    <Bloco ctx={ctx} id="cd" area="cd" title="Canal do atendimento pela distância" exportar={exportarCanal(ctx, estrutura)}><CanalDistancia ctx={ctx} estrutura={estrutura} /></Bloco>
    <Bloco ctx={ctx} id="mm" area="mm" title="Solicitações por mês"><Mensal ctx={ctx} estrutura={estrutura} /></Bloco>
    <Bloco ctx={ctx} id="cw" area="cw" title="Uso dos coworkings" exportar={{ cabecalho: ['Unidade', 'Ocupação (%)', 'Usuários', 'Custo por hora usada (R$)', 'Mesas'], linhas: () => coworking.unidades.map(row => [row.nome, row.ocupacao === null ? null : Math.round(row.ocupacao), row.usuarios, row.custoHora === null ? null : Math.round(row.custoHora), row.mesas]) }}><Coworkings ctx={ctx} estrutura={estrutura} /></Bloco>
  </div>;
}

function Assuntos({ ctx, estrutura }: { ctx: CockpitCtx; estrutura: Estrutura }) {
  const { tokens } = ctx, rows = estrutura.atendimento.porAssunto;
  const cores: Record<SituacaoPedido, string> = { 'Resolvido no prazo': tokens.good, 'Resolvido com atraso': tokens.accent, 'Em aberto, prazo vencido': tokens.bad, 'Em aberto, no prazo': tokens.heat[1] };
  const option = useMemo(() => ({
    grid: { top: 26, right: 38, bottom: 2, left: 2, containLabel: true },
    legend: legenda(tokens),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.assunto}</b><br/>${items.map(item => `${item.marker}${item.seriesName}: ${int(item.value)}`).join('<br/>')}<br/>${int(row.empresas)} de ${int(row.total)} vindas de empresas`; } },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => row.assunto), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: situacoesPedido.map((situacao, index) => ({ name: situacao, type: 'bar', stack: 'a', barWidth: 16, data: rows.map(row => row.partes[situacao].length), itemStyle: { color: cores[situacao], borderColor: tokens.surface, borderWidth: 1, borderRadius: index === situacoesPedido.length - 1 ? [0, 3, 3, 0] : 0 },
      label: index === situacoesPedido.length - 1 ? { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (params: any) => int(rows[params.dataIndex].total) } : undefined })),
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Solicitações de atendimento por assunto e situação" onPick={params => { const row = rows[params.dataIndex], situacao = situacoesPedido[params.seriesIndex]; if (!row || !situacao) return;
    const pedidos = row.partes[situacao], empresas = pedidos.filter(item => item.companyId);
    ctx.open({ kind: 'linhas', title: `${row.assunto} · ${situacao.toLowerCase()}`, what: 'Solicitações de atendimento do período neste assunto e situação. As de profissionais aparecem sem ficha de empresa.', listTitle: 'Solicitações, mais antigas primeiro',
      summary: [['Solicitações', int(pedidos.length)], ['De empresas', int(empresas.length)], ['De profissionais', int(pedidos.length - empresas.length)]],
      rows: pedidos.map(item => ({ key: item.id, companyId: item.companyId, title: item.companyId ? (ctx.dataset.companies.find(company => company.id === item.companyId)?.tradeName ?? item.companyId) : 'Profissional (demonstrativo)', subtitle: `${ctx.dataset.cities.find(city => city.id === item.cityId)?.name ?? ''} · aberta em ${item.createdAt.split('-').reverse().join('/')}`,
        value: item.resolvedAt && item.resolvedAt <= ctx.f.anchor ? `resolvida em ${Math.round((Date.parse(item.resolvedAt) - Date.parse(item.createdAt)) / 86400000)} dias` : 'em aberto', note: `${item.userType} · ${situacaoPedido(item, ctx.f.anchor)}`, sortValue: -Date.parse(item.createdAt) })) }); }} />;
}

function Coworkings({ ctx, estrutura }: { ctx: CockpitCtx; estrutura: Estrutura }) {
  const { tokens } = ctx, cw = estrutura.coworking;
  const option = useMemo(() => ({
    grid: { top: 4, right: 8, bottom: 34, left: 4, containLabel: true },
    tooltip: { formatter: (item: any) => `<b>${cw.unidades[item.value[1]].nome}</b> · ${mes(cw.meses[item.value[0]])}<br/>Ocupação: ${item.value[2] === null ? '—' : pct(item.value[2])}` },
    xAxis: { type: 'category', data: cw.meses.map(mes), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: { type: 'category', data: cw.unidades.map(row => row.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5, width: 120, overflow: 'truncate' } },
    visualMap: { min: 0, max: 100, orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 10, itemHeight: 160, calculable: false, text: ['100%', '0%'], textStyle: { color: tokens.muted, fontSize: 10 }, inRange: { color: tokens.heat } },
    series: [{ type: 'heatmap', data: cw.celulas, label: { show: true, fontSize: 9.5, color: tokens.ink, formatter: (item: any) => item.value[2] === null ? '' : Math.round(item.value[2]) }, itemStyle: { borderColor: tokens.surface, borderWidth: 2, borderRadius: 3 } }],
  }), [cw, tokens]);
  if (!cw.unidades.length) return <div className="empty-note">Nenhuma unidade de coworking nesta regional (dados demonstrativos).</div>;
  return <div className="split is-wide">
    <Chart option={option} tokens={tokens} label="Ocupação dos coworkings por unidade e mês" />
    <ul className="side-list">{cw.unidades.map(row => <li key={row.id}><span className="side-row"><span>{row.nome}</span><b>{row.ocupacao === null ? '—' : pct(row.ocupacao)}</b><small>{int(row.usuarios)} usuários · {row.custoHora === null ? '—' : money(row.custoHora)}/h · {row.mesas} mesas</small></span></li>)}</ul>
  </div>;
}

function Mensal({ ctx, estrutura }: { ctx: CockpitCtx; estrutura: Estrutura }) {
  const { tokens } = ctx, pedidos = estrutura.atendimento.pedidos;
  const rows = useMemo(() => ctx.janela.months.filter(month => `${month}-01` >= `${ctx.janela.start.slice(0, 7)}-01`).map(month => { const own = pedidos.filter(item => item.createdAt.startsWith(month)), situacoes = own.map(item => situacaoPedido(item, ctx.f.anchor));
    const decididos = situacoes.filter(item => item !== 'Em aberto, no prazo').length; return { month, total: own.length, taxa: decididos ? situacoes.filter(item => item === 'Resolvido no prazo').length / decididos * 100 : null }; }), [pedidos, ctx.janela, ctx.f.anchor]);
  const option = useMemo(() => ({
    grid: { top: 26, right: 6, bottom: 2, left: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${mes(row.month)}</b><br/>${int(row.total)} solicitações<br/>No prazo: ${row.taxa === null ? '—' : pct(row.taxa)}`; } },
    xAxis: { type: 'category', data: rows.map(row => mes(row.month)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: [{ type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } }, { type: 'value', min: 0, max: 100, splitLine: { show: false }, axisLabel: { color: tokens.muted, formatter: '{value}%' } }],
    series: [
      { name: 'Solicitações', type: 'bar', barWidth: '56%', data: rows.map(row => row.total), itemStyle: { color: tokens.heat[1], borderRadius: [4, 4, 0, 0] } },
      { name: '% no prazo', type: 'line', yAxisIndex: 1, data: rows.map(row => row.taxa), smooth: 0.3, symbol: 'circle', symbolSize: 5, lineStyle: { color: tokens.good, width: 2.5 }, itemStyle: { color: tokens.good },
        markLine: { silent: true, symbol: 'none', lineStyle: { color: tokens.accent, type: 'dashed' }, label: { formatter: `meta ${ctx.metas.atendimento}%`, color: tokens.muted, fontSize: 10, position: 'insideEndTop' }, data: [{ yAxis: ctx.metas.atendimento }] } },
    ],
  }), [rows, tokens, ctx.metas.atendimento]);
  return <Chart option={option} tokens={tokens} label="Solicitações por mês e percentual resolvido no prazo" />;
}

/* ---------- Mapa: distância até a unidade e profissionais ativos por município ---------- */
type MetricaDistancia = 'km' | 'longe';
const metricasDistancia: Record<MetricaDistancia, string> = { km: 'Distância até a unidade (km)', longe: 'Profissionais ativos a mais de 50 km' };
function medidaDistancia(ctx: CockpitCtx, metrica: MetricaDistancia): Medida {
  const gest = g(ctx), cidade = new Map<string, number | null>(), soma = new Map<string, { km: number; n: number; longe: number }>(), cidades = municipioPorId(ctx.dataset);
  for (const [id, row] of gest.distancia) { const ativos = gest.adimplencia.get(id)?.ativos.length ?? 0, greId = cidades.get(id)?.greId ?? '';
    cidade.set(id, metrica === 'km' ? row.km : row.km > 50 ? ativos : 0);
    const item = soma.get(greId) ?? { km: 0, n: 0, longe: 0 }; item.km += row.km * ativos; item.n += ativos; if (row.km > 50) item.longe += ativos; soma.set(greId, item); }
  // Na GRE, a distância é a média dos municípios pesada pelos profissionais ativos de cada um.
  const gre = new Map([...soma].map(([greId, item]) => [greId, metrica === 'km' ? (item.n ? item.km / item.n : null) : item.longe]));
  return { label: metricasDistancia[metrica], curto: metrica === 'km' ? 'km' : 'ativos', fmt: metrica === 'km' ? (value: number) => `${int(value)} km` : int, alerta: true, cidade, gre,
    dica: id => { const row = gest.distancia.get(id); return row ? `${row.km ? `${int(row.km)} km até ${row.unidade}` : `unidade na cidade (${row.unidade})`} · ${int(gest.adimplencia.get(id)?.ativos.length ?? 0)} profissionais ativos` : ''; } };
}

/* ---------- Canal do atendimento pela distância do solicitante ---------- */
const canais = (ctx: CockpitCtx, estrutura: Estrutura) => canalPorDistancia(estrutura.atendimento.pedidos, g(ctx).distancia, g(ctx).origem);
const exportarCanal = (ctx: CockpitCtx, estrutura: Estrutura): Exportavel => ({ cabecalho: ['Distância do solicitante até a unidade', ...canaisAtendimento, 'Total'], linhas: () => canais(ctx, estrutura).map(row => [row.faixa, ...canaisAtendimento.map(c => row.porCanal[c]), row.total]) });
function CanalDistancia({ ctx, estrutura }: { ctx: CockpitCtx; estrutura: Estrutura }) {
  const { tokens } = ctx, rows = useMemo(() => canais(ctx, estrutura).filter(row => row.total), [ctx.gestao, estrutura]); // eslint-disable-line react-hooks/exhaustive-deps
  const cores = [tokens.brand, tokens.blue, tokens.accent, tokens.heat[1]];
  const option = useMemo(() => ({
    grid: { top: 24, right: 34, bottom: 2, left: 2, containLabel: true }, legend: { ...legenda(tokens), data: canaisAtendimento },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>Solicitante ${row.faixa}</b> · ${int(row.total)} pedidos<br/>${canaisAtendimento.map(c => `${c}: ${int(row.porCanal[c])} (${pct(row.porCanal[c] / row.total * 100)})`).join('<br/>')}`; } },
    xAxis: { type: 'value', show: false, max: 100 }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.faixa), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: [...canaisAtendimento.map((canal, index) => ({ name: canal, type: 'bar', stack: 'c', barWidth: 15, data: rows.map(row => row.porCanal[canal] / row.total * 100), itemStyle: { color: cores[index], borderColor: tokens.surface, borderWidth: 1 },
      label: { show: true, position: 'inside', color: index === 3 ? tokens.ink : '#FFFFFF', fontSize: 9.5, fontWeight: 700, formatter: (params: any) => params.value >= 8 ? pct(params.value) : '' } })),
      { name: 'total', type: 'bar', stack: 'c', barWidth: 15, data: rows.map(() => 0), itemStyle: { color: 'transparent' }, label: { show: true, position: 'right', color: tokens.muted, fontSize: 9.5, formatter: (params: any) => int(rows[params.dataIndex].total) } }],
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Canal das solicitações pela distância entre o solicitante e a unidade" onPick={params => { const row = rows[params.dataIndex]; if (!row) return;
    ctx.open({ kind: 'linhas', title: `Solicitantes ${row.faixa}`, what: 'Solicitações do período de quem mora nesta faixa de distância até a unidade mais próxima.', listTitle: 'Solicitações, mais recentes primeiro', summary: canaisAtendimento.map(c => [c, int(row.porCanal[c])] as [string, string]),
      rows: row.pedidos.map(item => ({ key: item.id, ...(item.companyId ? { companyId: item.companyId } : {}), title: item.category, subtitle: `${municipioPorId(ctx.dataset).get(g(ctx).origem(item))?.nome ?? ''} · aberta em ${item.createdAt.split('-').reverse().join('/')}`, value: situacaoPedido(item, ctx.f.anchor), note: item.userType, sortValue: -Date.parse(item.createdAt) })) }); }} />;
}
