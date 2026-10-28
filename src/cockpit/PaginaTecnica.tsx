import { useMemo } from 'react';
import { caoService } from '../gestao-v14/metrics';
import { Chart } from '../painel/chart';
import { quadroTecnico } from '../painel/analise';
import { Quadro } from '../painel/VisaoCadastro';
import { brl, int, mes, pct, short } from '../painel/ui';
import type { CockpitCtx } from './contexto';
import { artPorCamara, artPorModalidade, artRegionalMes, artsPeriodo, pagamento } from './medidas';
import { Bloco, Indicador } from './ui';

/** Aba 5 · Responsabilidade técnica, ART e certidões: quadro técnico, atividade declarada em ART e prazos de certidão. */
const change = (now: number, before: number) => before > 0 ? (now - before) / before * 100 : null;

export default function PaginaTecnica({ ctx }: { ctx: CockpitCtx }) {
  const { model, tokens, arts, metas } = ctx;
  const qt = useMemo(() => quadroTecnico(ctx.scope, model, ctx.f), [ctx.scope, model, ctx.f]);
  const cao = useMemo(() => caoService(ctx.scope), [ctx.scope]), pay = pagamento(model), ativas = model.metadata.activeCompanyIds;
  const fila = cao.queue.reduce((sum, row) => sum + row.count, 0), rt = model.metrics.rtCoverage.value;
  return <div className="ck-grid ck-grid-tecnica">
    <section className="ck-cards is-six" style={{ gridArea: 'kpi' }} aria-label="Indicadores de responsabilidade técnica, ART e certidões">
      <Indicador destaque label="Empresas com responsável técnico" value={rt === null ? '—' : pct(rt)} meta={{ atual: rt, alvo: metas.rt }} variacao={{ value: rt === null ? null : rt - metas.rt, kind: 'pp', label: `vs. meta de ${metas.rt}%` }} sub={`${int(qt.comRt.length)} de ${int(ativas.length)} empresas registradas`}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas registradas sem RT identificado', what: 'Empresas com registro ativo sem responsável técnico de vínculo vigente: RT baixado sem substituto ou nenhum vínculo carregado.', use: 'Notifique as de RT baixado; confira o cadastro das sem vínculo.', ids: [...qt.rtBaixado, ...qt.semVinculo] })} />
      <Indicador label="RT baixado sem substituto" value={int(qt.rtBaixado.length)} sub="baixa do RT sem novo vínculo em 30 dias" onOpen={() => ctx.open({ kind: 'alvos', tipo: 'rt' })} />
      <Indicador label="ARTs de empresas" value={int(arts.atual.length)} variacao={{ value: change(arts.atual.length, arts.antes) }} spark={arts.mensal} cor={tokens.blue} sub={`${int(new Set(arts.atual.map(row => row.companyId)).size)} empresas com ART no período`}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas com ART no período', what: 'Empresas com ao menos uma ART registrada no período.', ids: [...new Set(arts.atual.map(row => row.companyId))] })} />
      <Indicador label="Valor declarado em ART" value={brl(arts.valor)} variacao={{ value: change(arts.valor, arts.valorAntes) }} sub="soma do valor de contrato das ARTs" />
      <Indicador label="Certidão de acervo operacional" value={cao.median === null ? '—' : `${int(cao.median)} dias`} sub={`prazo mediano · 90% em até ${cao.p90 === null ? '—' : int(cao.p90)} dias · ${int(fila)} pedidos na fila`} />
      <Indicador label="Aptas à certidão de registro e quitação" value={pct(pay.emDia.length / Math.max(1, ativas.length) * 100)} sub={`${int(pay.inadimplentes.length)} empresas registradas com anuidade vencida`}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas sem quitação de anuidade', what: 'Empresas registradas com anuidade vencida no corte: não obteriam a certidão de registro e quitação exigida em licitações.', use: 'Cobrança prioritária das que têm contrato público.', ids: pay.inadimplentes })} />
    </section>
    <Bloco ctx={ctx} id="qt" area="qt" title="Quadro técnico das empresas" question="Responsável técnico das empresas registradas e a carga de empresas por profissional." help="Acima de 3 empresas por profissional, verificar a compatibilidade de tempo e área de atuação (conferir o limite na norma vigente)."><Quadro ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ah" area="ah" title="ARTs de empresas por regional e mês" question="Últimos 12 meses, pela regional da matriz. Quedas mostram retração de atividade ou de registro de ART."><ArtRegional ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="am" area="am" title="ARTs por modalidade" question="Quantidade no período e valor de contrato declarado."><ArtModalidade ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ca" area="ca" title="Prazo da certidão de acervo operacional (CAO)" question="Dias do pedido à emissão, para as certidões emitidas; e os pedidos que aguardam." help="Certidão de acervo operacional da empresa (Resolução Confea nº 1.137/2023)."><Certidoes ctx={ctx} cao={cao} /></Bloco>
    <Bloco ctx={ctx} id="rg" area="rg" title="Responsável técnico e quitação, por regional" question="% das empresas registradas com RT identificado e % aptas à certidão de registro e quitação."><RegionalRt ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="sa" area="sa" title="Empresas registradas sem ART no período" question="Atividade não declarada ou empresa parada? Por câmara, % das registradas sem nenhuma ART."><SemArt ctx={ctx} /></Bloco>
  </div>;
}

function ArtRegional({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, heat = useMemo(() => artRegionalMes(ctx.dataset, artsPeriodo(ctx.scope, 12).atual, ctx.scope.anchor), [ctx.dataset, ctx.scope]);
  const maximo = Math.max(...heat.cells.map(cell => cell[2]), 1);
  const option = useMemo(() => ({
    grid: { top: 4, right: 8, bottom: 36, left: 4, containLabel: true },
    tooltip: { formatter: (item: any) => `<b>${heat.gres[item.value[1]].name}</b> · ${mes(heat.months[item.value[0]])}<br/>${int(item.value[2])} ARTs de empresas` },
    xAxis: { type: 'category', data: heat.months.map(mes), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: { type: 'category', data: heat.gres.map(row => short(row.name)), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10, interval: 0 } },
    visualMap: { min: 0, max: maximo, orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 10, itemHeight: 160, calculable: false, textStyle: { color: tokens.muted, fontSize: 10 }, inRange: { color: tokens.heat } },
    series: [{ type: 'heatmap', data: heat.cells, itemStyle: { borderColor: tokens.surface, borderWidth: 2, borderRadius: 3 }, emphasis: { itemStyle: { borderColor: tokens.accent, borderWidth: 2 } } }],
  }), [heat, tokens, maximo]);
  return <Chart option={option} tokens={tokens} label="ARTs de empresas por regional e mês" onPick={item => { const gre = heat.gres[item.value?.[1]]; if (gre) ctx.open({ kind: 'gre', id: gre.id }); }} />;
}

function ArtModalidade({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => artPorModalidade(ctx.arts.atual), [ctx.arts]);
  const option = useMemo(() => ({
    grid: { top: 4, right: 128, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.modalidade}</b><br/>${int(row.quantidade)} ARTs · ${brl(row.valor)} declarados<br/>${int(row.ids.length)} empresas`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.modalidade), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [{ type: 'bar', barWidth: 14, data: rows.map(row => row.quantidade), itemStyle: { color: tokens.blue, borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (params: any) => `${int(params.value)} · ${brl(rows[params.dataIndex].valor)}` } }],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="ARTs de empresas por modalidade" onPick={params => { const row = rows[params.dataIndex]; if (row) ctx.open({ kind: 'empresas', title: `ARTs de ${row.modalidade.toLowerCase()}`, what: 'Empresas com ART desta modalidade no período.', ids: row.ids }); }} />;
}

function Certidoes({ ctx, cao }: { ctx: CockpitCtx; cao: ReturnType<typeof caoService> }) {
  const { tokens } = ctx;
  const option = useMemo(() => ({
    grid: { top: 10, right: 6, bottom: 24, left: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>${items[0].name} dias</b><br/>${int(items[0].value)} certidões emitidas` },
    xAxis: { type: 'category', data: cao.histogram.map(row => row.name), name: 'dias entre o pedido e a emissão', nameLocation: 'middle', nameGap: 22, nameTextStyle: { color: tokens.muted, fontSize: 10 }, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
    series: [{ type: 'bar', barWidth: '66%', data: cao.histogram.map((row, index) => ({ value: row.count, itemStyle: { borderRadius: [4, 4, 0, 0], color: index <= 1 ? tokens.good : index <= 3 ? tokens.accent : tokens.bad } })), label: { show: true, position: 'top', color: tokens.ink, fontSize: 10 } }],
  }), [cao, tokens]);
  return <div className="stack">
    <Chart option={option} tokens={tokens} label="Distribuição do prazo de emissão da certidão de acervo operacional" />
    <ul className="chips-row" aria-label="Pedidos que aguardam">{cao.queue.map(row => <li key={row.status}><button onClick={() => ctx.open({ kind: 'empresas', title: `Certidões · ${row.status.toLowerCase()}`, what: 'Empresas com pedido de certidão de acervo operacional nesta situação.', ids: row.companyIds })}><b>{int(row.count)}</b> {row.status.toLowerCase()}<small>há {row.medianAge === null ? '—' : int(row.medianAge)} dias (mediana)</small></button></li>)}
      <li className="chips-note">{int(cao.issued)} emitidas · {int(cao.revoked)} revogadas</li></ul>
  </div>;
}

function RegionalRt({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, metas } = ctx, rows = [...ctx.linhas].filter(row => row.ativas.length).sort((a, b) => (a.rt ?? 0) - (b.rt ?? 0));
  const aptas = (row: typeof rows[number]) => (row.ativas.length - row.devedoras.length) / row.ativas.length * 100;
  const option = useMemo(() => ({
    grid: { top: 24, right: 34, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.name}</b><br/>Com RT: ${pct(row.rt ?? 0)} (meta ${metas.rt}%)<br/>Aptas à certidão: ${pct(aptas(row))}<br/>${int(row.ativas.length)} empresas registradas`; } },
    xAxis: { type: 'value', max: 100, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: '{value}%' } },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => row.curto), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: [
      { name: 'Com RT', type: 'bar', barWidth: 7, barGap: '25%', data: rows.map(row => row.rt ?? 0), itemStyle: { color: tokens.blue, borderRadius: [0, 3, 3, 0] },
        markLine: { silent: true, symbol: 'none', lineStyle: { color: tokens.accent, type: 'dashed', width: 1.5 }, label: { formatter: `meta ${metas.rt}%`, color: tokens.muted, fontSize: 10, position: 'insideEndTop' }, data: [{ xAxis: metas.rt }] } },
      { name: 'Aptas à certidão de registro e quitação', type: 'bar', barWidth: 7, data: rows.map(aptas), itemStyle: { color: tokens.good, borderRadius: [0, 3, 3, 0] } },
    ],
  }), [rows, tokens, metas]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Responsável técnico e aptidão à certidão por regional" onPick={params => { const row = rows[params.dataIndex]; if (row) ctx.open({ kind: 'gre', id: row.id }); }} />;
}

function SemArt({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => artPorCamara(ctx.dataset, ctx.model), [ctx.dataset, ctx.model]);
  const option = useMemo(() => ({
    grid: { top: 8, right: 70, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.camara}</b><br/>${int(row.semArt.length)} de ${int(row.ativas.length)} empresas registradas sem ART no período`; } },
    xAxis: { type: 'value', max: 100, show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.camara), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [{ type: 'bar', barWidth: 16, data: rows.map(row => row.semArt.length / row.ativas.length * 100), itemStyle: { color: tokens.warn, borderRadius: [0, 4, 4, 0] }, showBackground: true, backgroundStyle: { color: tokens.soft, borderRadius: 4 },
      label: { show: true, position: 'right', color: tokens.ink, fontSize: 10.5, formatter: (params: any) => `${pct(params.value)} · ${int(rows[params.dataIndex].semArt.length)}` } }],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Empresas registradas sem ART no período por câmara" onPick={params => { const row = rows[params.dataIndex]; if (row?.semArt.length) ctx.open({ kind: 'empresas', title: `${row.camara} · registradas sem ART no período`, what: 'Empresas com registro ativo sem nenhuma ART registrada no período.', use: 'Verifique se a empresa está em atividade; se estiver, oriente sobre a obrigação de ART (Lei 6.496/77).', ids: row.semArt }); }} />;
}
