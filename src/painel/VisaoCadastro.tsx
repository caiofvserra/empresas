import { useMemo } from 'react';
import type { Ctx } from './contexto';
import { complianceFlow } from '../gestao-v14/metrics';
import { devedoras, distribuicaoGre, mercadoPorCamara, ponteBase, quadroTecnico, receita, saneamento, segmentosMercado, variacao } from './analise';
import type { SegmentoMercado } from './analise';
import { Chart } from './chart';
import { Card, Delta, Segments, Tile, brl, inkOn, int, mes, money, pct, short } from './ui';

/** Visão 2 · Cadastro e receita: o que a base registrada e a arrecadação mostram, com mercado (Receita), câmara e quadro técnico. */
export default function VisaoCadastro({ ctx }: { ctx: Ctx }) {
  const { model, scope, history, f, tokens, period } = ctx;
  const ponte = useMemo(() => ponteBase(model, scope, f, period), [model, scope, f, period]);
  const rec = useMemo(() => receita(history, f, ctx.greId, period), [history, f, ctx.greId, period]);
  const san = useMemo(() => saneamento(scope, model), [scope, model]);
  const debtors = useMemo(() => devedoras(model), [model]);
  const flow = useMemo(() => complianceFlow(model, scope), [model, scope]);
  const inativas = flow.nodes.find(node => node.name === 'Só histórico')?.companyIds ?? [];
  const charged = model.metrics.compliance.denominatorCompanyIds ?? [];
  const entradas = [...ponte.espontaneas, ...ponte.viaFiscalizacao, ...ponte.retornos];
  const gapIds = model.metadata.eligibleEstablishmentIds.filter(id => !new Set(model.metadata.activeEligibleEstablishmentIds).has(id));
  const growth = ponte.abertura ? (ponte.final - ponte.abertura) / ponte.abertura * 100 : null;
  const vistos = new Set(scope.registrations.filter(row => row.type === 'Visto' && row.status === 'Ativo').map(row => row.companyId)).size;
  return <>
    <section className="kpis" aria-label="Indicadores do cadastro e da receita">
      <Card label="Empresas registradas" value={int(ponte.final)} delta={<Delta value={growth} label="no período" />} spark={history.monthly.map(row => row.base)} sparkColor={tokens.blue} sub={`${int(inativas.length)} com registro inativo · ${int(vistos)} com visto de outro estado`} onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas com registro ativo', what: 'Empresas (CNPJ raiz) com registro vigente no CREA-SP no corte.', ids: model.metadata.activeCompanyIds })} />
      <Card label="Novos registros no período" value={int(entradas.length)} spark={history.monthly.map(row => row.entered)} sparkColor={tokens.accent} sub={<><b className="hl">{pct(ponte.viaFiscalizacao.length / Math.max(1, entradas.length) * 100)}</b> após ação de fiscalização · {int(ponte.retornos.length)} retornos</>} onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas que entraram na base no período', what: 'Primeiro registro (espontâneo ou após ação de fiscalização) e retornos de empresas que já tinham sido registradas.', ids: entradas })} />
      <Card label="Cobertura do mercado" value={model.metrics.coverage.value === null ? '—' : pct(model.metrics.coverage.value, 1)} sub={`${int(gapIds.length)} CNPJs de engenharia ativos na Receita sem registro`} onOpen={() => ctx.open({ kind: 'cnpjs', title: 'CNPJs de engenharia sem registro', what: 'CNPJs ativos na Receita Federal, com CNAE de engenharia, sem registro vigente no CREA-SP. CNAE não prova obrigação: confirmar a atividade.', use: 'Base para fiscalização: cruzar com contratos públicos e com a RAIS antes de notificar.', ids: gapIds })} />
      <Card label="Inadimplência" value={pct(debtors.size / Math.max(1, charged.length) * 100)} sub={`${int(debtors.size)} empresas devem ${brl(model.metrics.overdue.value ?? 0)}`} onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas inadimplentes', what: 'Empresas cobradas com algum valor vencido e não pago no corte.', use: 'Cobrar primeiro os maiores saldos; checar se o CNPJ ainda está ativo na Receita.', ids: [...debtors] })} />
      <Card label="Arrecadação de empresas" value={brl(rec.total)} delta={<Delta value={rec.totalAntes === null ? null : variacao(rec.total, rec.totalAntes)} />} spark={rec.mensal.map(row => row.anuidades + row.multas)} sparkColor={tokens.good} sub={`${brl(rec.anuidades)} anuidades · ${brl(rec.multas)} multas`} />
      <Card label="Cadastro a sanear" value={int(san.registros.length)} tone="alert" sub={`registros ativos de CNPJ baixado, inapto ou suspenso na Receita · ${brl(san.vencido)} vencidos`} onOpen={() => ctx.open({ kind: 'cnpjs', title: 'Registro ativo com CNPJ inativo na Receita', what: 'Estabelecimentos com registro vigente no CREA-SP cujo CNPJ está baixado, inapto ou suspenso na Receita Federal.', use: 'Rever o registro: a base fica inflada e a anuidade lançada dificilmente será recebida.', ids: san.establishmentIds })} />
    </section>
    <div className="grid grid-cad">
      <Tile area="mkk" title="Mercado de engenharia por câmara" question="Largura: CNPJs de engenharia ativos na Receita em cada câmara. Altura: quanto está registrado, em dia, e quanto falta registrar."><Mekko ctx={ctx} /></Tile>
      <Tile area="gre" title="Empresas por regional" question="Registradas em dia, inadimplentes e CNPJs de engenharia ainda sem registro."><PorRegional ctx={ctx} /></Tile>
      <Tile area="pnt" title="Entradas e saídas da base" question={`Quanto a fiscalização contribuiu para o crescimento da base no período?`}><PonteChart ctx={ctx} ponte={ponte} /></Tile>
      <Tile area="rec" title="Arrecadação de empresas mês a mês" question="Anuidades e multas recebidas, contra o total dos mesmos meses do ano anterior."><ReceitaChart ctx={ctx} rec={rec} /></Tile>
      <Tile area="qt" title="Quadro técnico" question="Responsável técnico das empresas registradas."><Quadro ctx={ctx} /></Tile>
    </div>
  </>;
}

const corMercado = (tokens: Ctx['tokens']): Record<SegmentoMercado, string> => ({ 'Registro ativo, em dia': tokens.blue, 'Registro ativo, inadimplente': tokens.heat[1], 'Sem registro, com ação': tokens.warn, 'Sem registro, sem ação': tokens.bad });
export function Mekko({ ctx }: { ctx: Ctx }) {
  const rows = useMemo(() => mercadoPorCamara(ctx.scope, ctx.model, ctx.f), [ctx.scope, ctx.model, ctx.f]), colors = corMercado(ctx.tokens);
  const order = [...segmentosMercado].reverse();
  return <div className="mekko">
    <ul className="legend">{segmentosMercado.map(segment => <li key={segment}><i style={{ background: colors[segment] }} />{segment}</li>)}</ul>
    <div className="mk-cols">{rows.map(row => { const registered = row.partes['Registro ativo, em dia'].length + row.partes['Registro ativo, inadimplente'].length;
      return <div className="mk-col" key={row.camara} style={{ flexGrow: row.total }}>
        <div className="mk-stack">{order.map(segment => { const count = row.partes[segment].length, share = count / Math.max(1, row.total) * 100;
          return count > 0 && <button key={segment} style={{ flexGrow: count, background: colors[segment], color: inkOn(colors[segment]) }} onClick={() => ctx.open({ kind: 'cnpjs', title: `${row.camara} · ${segment.toLowerCase()}`, what: 'CNPJs ativos na Receita com CNAE de engenharia desta câmara, nesta situação.', use: segment.startsWith('Sem registro') ? 'Notificar os sem ação e acompanhar os já notificados.' : undefined, ids: row.partes[segment], segmento: segment })} title={`${segment}: ${int(count)} (${pct(share)})`}>{share >= 9 && <span>{pct(share)}</span>}</button>; })}</div>
        <p className="mk-label"><b>{row.camara}</b><span>{int(row.total)} CNPJs · {pct(registered / Math.max(1, row.total) * 100)} registrados</span></p>
      </div>; })}</div>
  </div>;
}

export function PorRegional({ ctx }: { ctx: Ctx }) {
  const { tokens } = ctx, rows = useMemo(() => distribuicaoGre(ctx.scope, ctx.model).sort((a, b) => (b.emDia.length + b.inadimplentes.length) - (a.emDia.length + a.inadimplentes.length)), [ctx.scope, ctx.model]);
  const option = useMemo(() => ({
    grid: { top: 24, right: 34, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.name}</b><br/>Em dia: ${int(row.emDia.length)} empresas<br/>Inadimplentes: ${int(row.inadimplentes.length)} (${pct(row.inadimplentes.length / Math.max(1, row.emDia.length + row.inadimplentes.length) * 100)})<br/>Sem registro: ${int(row.semRegistro.length)} CNPJs`; } },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => short(row.name)), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [
      { name: 'Em dia (empresas)', type: 'bar', stack: 'ativas', barWidth: 9, data: rows.map(row => row.emDia.length), itemStyle: { color: tokens.blue } },
      { name: 'Inadimplentes (empresas)', type: 'bar', stack: 'ativas', barWidth: 9, data: rows.map(row => row.inadimplentes.length), itemStyle: { color: tokens.heat[1], borderRadius: [0, 3, 3, 0] } },
      { name: 'Sem registro (CNPJs)', type: 'bar', barWidth: 5, barGap: '30%', data: rows.map(row => row.semRegistro.length), itemStyle: { color: tokens.bad, borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', fontSize: 9.5, color: tokens.bad, formatter: (item: any) => item.value || '' } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Empresas por regional" onPick={params => { const row = rows[params.dataIndex]; if (!row) return;
    if (params.seriesIndex === 2) ctx.open({ kind: 'cnpjs', title: `${short(row.name)} · CNPJs sem registro`, what: 'CNPJs de engenharia ativos na Receita sem registro vigente nesta regional.', ids: row.semRegistro });
    else ctx.open({ kind: 'empresas', title: `${short(row.name)} · ${params.seriesIndex === 0 ? 'empresas em dia' : 'empresas inadimplentes'}`, what: 'Empresas com registro ativo nesta regional.', ids: params.seriesIndex === 0 ? row.emDia : row.inadimplentes }); }} />;
}

export function PonteChart({ ctx, ponte }: { ctx: Ctx; ponte: ReturnType<typeof ponteBase> }) {
  const { tokens, model } = ctx;
  const steps = [
    { name: 'Abertura', value: ponte.abertura, base: 0, color: tokens.heat[2], ids: model.metadata.openingCompanyIds, sign: '' },
    { name: 'Espontâneas', value: ponte.espontaneas.length, base: ponte.abertura, color: tokens.blue, ids: ponte.espontaneas, sign: '+' },
    { name: 'Após fiscalização', value: ponte.viaFiscalizacao.length, base: ponte.abertura + ponte.espontaneas.length, color: tokens.accent, ids: ponte.viaFiscalizacao, sign: '+' },
    { name: 'Retornos', value: ponte.retornos.length, base: ponte.abertura + ponte.espontaneas.length + ponte.viaFiscalizacao.length, color: tokens.cat[4], ids: ponte.retornos, sign: '+' },
    { name: 'Saídas', value: ponte.saidas.length, base: ponte.final, color: tokens.bad, ids: ponte.saidas, sign: '−' },
    { name: 'Final', value: ponte.final, base: 0, color: tokens.brand, ids: model.metadata.activeCompanyIds, sign: '' },
  ];
  const option = useMemo(() => ({
    grid: { top: 22, right: 4, bottom: 2, left: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const step = steps[items[0].dataIndex]; return `<b>${step.name}</b><br/>${step.sign}${int(step.value)} empresas<br/><span style="opacity:.75">clique para ver</span>`; } },
    xAxis: { type: 'category', data: steps.map(step => step.name), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.ink, fontSize: 10, interval: 0, width: 64, overflow: 'break' } },
    yAxis: { type: 'value', show: false, min: Math.max(0, Math.min(ponte.abertura, ponte.final) - ponte.saidas.length * 1.4) },
    series: [{ type: 'bar', stack: 'p', silent: true, data: steps.map(step => step.base), itemStyle: { color: 'transparent' } },
      { type: 'bar', stack: 'p', barWidth: '58%', data: steps.map(step => ({ value: step.value, itemStyle: { color: step.color, borderRadius: 4 } })), label: { show: true, position: 'top', color: tokens.ink, fontWeight: 700, fontSize: 11, formatter: (item: any) => `${steps[item.dataIndex].sign}${int(item.value)}` } }],
  }), [steps, tokens, ponte]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Ponte da base de empresas registradas" onPick={params => { const step = steps[params.dataIndex]; if (step) ctx.open({ kind: 'empresas', title: `Base registrada · ${step.name.toLowerCase()}`, what: 'Empresas desta etapa da variação da base no período.', ids: step.ids }); }} />;
}

export function ReceitaChart({ ctx, rec }: { ctx: Ctx; rec: ReturnType<typeof receita> }) {
  const { tokens } = ctx;
  const option = useMemo(() => ({
    grid: { top: 26, right: 6, bottom: 2, left: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', formatter: (items: any[]) => { const row = rec.mensal[items[0].dataIndex], now = row.anuidades + row.multas, before = row.anuidadesAntes === null ? null : row.anuidadesAntes + (row.multasAntes ?? 0);
      return `<b>${mes(row.month)}</b><br/>Anuidades: ${money(row.anuidades)}<br/>Multas: ${money(row.multas)}<br/>Total: <b>${money(now)}</b>${before ? `<br/>Ano anterior: ${money(before)} (${now >= before ? '+' : ''}${pct((now / before - 1) * 100)})` : ''}`; } },
    xAxis: { type: 'category', data: rec.mensal.map(row => mes(row.month)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: (value: number) => value.toLocaleString('pt-BR', { notation: 'compact' }) } },
    series: [
      { name: 'Anuidades', type: 'bar', stack: 'r', barWidth: '58%', data: rec.mensal.map(row => row.anuidades), itemStyle: { color: tokens.blue } },
      { name: 'Multas', type: 'bar', stack: 'r', barWidth: '58%', data: rec.mensal.map(row => row.multas), itemStyle: { color: tokens.accent, borderRadius: [3, 3, 0, 0] } },
      { name: 'Total do ano anterior', type: 'line', data: rec.mensal.map(row => row.anuidadesAntes === null ? null : row.anuidadesAntes + (row.multasAntes ?? 0)), smooth: 0.3, symbol: 'circle', symbolSize: 4, lineStyle: { color: tokens.ink, width: 1.5, type: [4, 4] }, itemStyle: { color: tokens.ink } },
    ],
  }), [rec, tokens]);
  return <Chart option={option} tokens={tokens} label="Arrecadação de empresas por mês" />;
}

export function Quadro({ ctx }: { ctx: Ctx }) {
  const { tokens } = ctx, qt = useMemo(() => quadroTecnico(ctx.scope, ctx.model, ctx.f), [ctx.scope, ctx.model, ctx.f]);
  const acima = qt.distribuicao.filter(row => row.empresas > qt.limite).reduce((sum, row) => sum + row.profissionais.length, 0);
  const option = useMemo(() => ({
    grid: { top: 18, right: 2, bottom: 2, left: 2, containLabel: true },
    title: { text: 'Empresas por responsável técnico', left: 0, top: 0, textStyle: { color: tokens.ink, fontSize: 11, fontWeight: 700, fontFamily: 'Lato, sans-serif' } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `${int(items[0].value)} profissionais respondem por ${items[0].name} empresa(s)` },
    xAxis: { type: 'category', data: qt.distribuicao.map(row => row.empresas === 5 ? '5+' : String(row.empresas)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted } },
    yAxis: { type: 'value', show: false },
    series: [{ type: 'bar', barWidth: '62%', data: qt.distribuicao.map(row => ({ value: row.profissionais.length, itemStyle: { color: row.empresas > qt.limite ? tokens.bad : tokens.heat[1], borderRadius: [3, 3, 0, 0] } })), label: { show: true, position: 'top', fontSize: 10, color: tokens.ink } }],
  }), [qt, tokens]);
  return <div className="quadro">
    <Segments parts={[{ label: 'Com RT', value: qt.comRt.length, color: tokens.good }, { label: 'RT baixado sem substituto', value: qt.rtBaixado.length, color: tokens.bad }, { label: 'Sem vínculo carregado', value: qt.semVinculo.length, color: tokens.line }]} />
    <ul className="qt-list">
      <li><button onClick={() => ctx.open({ kind: 'alvos', tipo: 'rt' })}><i style={{ background: tokens.bad }} /><span>RT baixado sem substituto</span><b>{int(qt.rtBaixado.length)}</b></button></li>
      <li><button onClick={() => ctx.open({ kind: 'empresas', title: 'Empresas com RT identificado', what: 'Empresas com registro ativo e responsável técnico com vínculo vigente.', ids: qt.comRt })}><i style={{ background: tokens.good }} /><span>Com RT identificado</span><b>{int(qt.comRt.length)}</b></button></li>
      <li className="is-muted"><button onClick={() => ctx.open({ kind: 'empresas', title: 'Empresas sem vínculo de RT no cadastro', what: 'Empresas ativas sem nenhum vínculo de RT carregado. O registro exige RT; tratar como falha de carga a conferir, não como infração.', ids: qt.semVinculo })}><i style={{ background: tokens.line }} /><span>Sem vínculo carregado (conferir cadastro)</span><b>{int(qt.semVinculo.length)}</b></button></li>
    </ul>
    <div className="qt-chart"><Chart option={option} tokens={tokens} label="Distribuição de empresas por responsável técnico" onPick={params => { const row = qt.distribuicao[params.dataIndex]; if (row?.profissionais.length) ctx.open({ kind: 'profissionais', empresas: row.empresas, ids: row.profissionais }); }} /></div>
    <p className="insight"><b>{int(acima)}</b> profissionais respondem por mais de {qt.limite} empresas.</p>
  </div>;
}
