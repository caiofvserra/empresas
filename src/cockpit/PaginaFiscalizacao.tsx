import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { autosPorRegionalMes, tipos } from '../painel/analise';
import { tipoLabel } from '../painel/fiscalizacao';
import type { StatusMulta } from '../painel/fiscalizacao';
import { Curvas, MapaBivariado, Mensal, Situacao, corTipo } from '../painel/VisaoFiscalizacao';
import { Segments, brl, int, mes, money, pct, short } from '../painel/ui';
import type { CockpitCtx } from './contexto';
import { caminhoAcoes } from './medidas';
import { Bloco, FichaPop, Indicador } from './ui';
import { fichaDe } from './fichas';
import { PRAZO_RESULTADO } from '../painel/forcas';
import type { ResultadoFt } from '../painel/forcas';
import { situacoesObra } from '../domain/frentes';
import type { SituacaoObra } from '../domain/frentes';
import { etapasPca } from '../domain/mercado';
import { fontesLicenca, pontesTce } from '../domain/parcerias';
import type { FonteLicenca, PapelCno, SituacaoCno } from '../domain/parcerias';
import { nomeEmpresa } from './ui';

/** Aba 5 · Fiscalização: os atos do rito (ação, notificação, auto, multa, julgamento, dívida ativa), o resultado (regularização e registro) e as forças-tarefas contra o seu grupo de comparação. Tudo lido na data de referência. */
const change = (now: number, before: number) => before > 0 ? (now - before) / before * 100 : null;
const cruzamento = new Set(['Cruzamento Receita (CNAE)', 'Contrato público (PNCP)', 'Cadastro CREA']);

export default function PaginaFiscalizacao({ ctx }: { ctx: CockpitCtx }) {
  const { resumo, tokens, ponte, metas, period } = ctx, colors = corTipo(tokens);
  const status: Record<StatusMulta, string> = { Paga: tokens.good, 'Em prazo de defesa': tokens.heat[1], 'Em julgamento': tokens.warn, 'Dívida ativa': tokens.bad, Cancelada: tokens.line };
  const entradas = ponte.espontaneas.length + ponte.viaFiscalizacao.length + ponte.retornos.length;
  const viaCruzamento = resumo.acoes.filter(row => cruzamento.has(row.origem)).length;
  return <div className="ck-grid ck-grid-fiscalizacao">
    <section className="ck-cards is-six" style={{ gridArea: 'kpi' }} aria-label="Indicadores da fiscalização">
      <Indicador destaque ficha="k-acoes" ctx={ctx} label="Ações fiscalizatórias" value={int(resumo.acoes.length)} variacao={{ value: change(resumo.acoes.length, resumo.acoesPrev) }} spark={resumo.mensal.map(row => row.acoes)} cor={tokens.accent}
        sub={`${int(resumo.acoes.length / period)} por mês; ${pct(viaCruzamento / Math.max(1, resumo.acoes.length) * 100)} nasceram do cruzamento de dados`} onOpen={() => ctx.open({ kind: 'acoes' })} />
      <Indicador ficha="k-autos" ctx={ctx} label="Autos de infração lavrados" value={int(resumo.autos.length)} variacao={{ value: change(resumo.autos.length, resumo.autosPrev) }} spark={resumo.mensal.map(row => tipos.reduce((sum, tipo) => sum + row.autos[tipo], 0))} cor={tokens.bad}
        sub={<><Segments parts={tipos.map(tipo => ({ label: tipoLabel[tipo], value: resumo.autos.filter(row => row.tipo === tipo).length, color: colors[tipo] }))} />{pct(resumo.acoes.filter(row => row.auto).length / Math.max(1, resumo.acoes.length) * 100)} das ações geraram auto</>} onOpen={() => ctx.open({ kind: 'autos' })} />
      <Indicador ficha="k-multas" ctx={ctx} label="Multas aplicadas" value={brl(resumo.aplicada)} variacao={{ value: change(resumo.aplicada, resumo.aplicadaPrev) }}
        sub={<><Segments parts={(Object.keys(resumo.multas) as StatusMulta[]).map(key => ({ label: key, value: resumo.multas[key].valor, color: status[key], format: brl }))} />{brl(resumo.multas['Dívida ativa'].valor)} em dívida ativa · {brl(resumo.multas['Em julgamento'].valor)} em julgamento</>} onOpen={() => ctx.open({ kind: 'multas' })} />
      <Indicador ficha="k-recebidas" ctx={ctx} label="Multas recebidas" value={brl(resumo.recebida)} sub={`${resumo.pagaCoorte === null ? '—' : pct(resumo.pagaCoorte)} do valor aplicado no período já foi pago`} onOpen={() => ctx.open({ kind: 'multas', status: 'Paga' })} />
      <Indicador ficha="k-regularizacoes" ctx={ctx} label="Regularizações após ação" value={int(resumo.regularizacoes.length)} variacao={{ value: change(resumo.regularizacoes.length, resumo.regularizacoesPrev) }} spark={resumo.mensal.map(row => row.regularizacoes)} cor={tokens.good} meta={{ atual: resumo.taxa, alvo: metas.regularizacao }}
        sub={`${resumo.taxa === null ? '—' : pct(resumo.taxa)} das ações do período, em ${resumo.medianaDias === null ? '—' : int(resumo.medianaDias)} dias no caso típico. A ação pode não ser a causa.`} onOpen={() => ctx.open({ kind: 'regularizacoes' })} />
      <Indicador ficha="k-registros" ctx={ctx} label="Registros obtidos pela fiscalização" value={int(ponte.viaFiscalizacao.length)} sub={`${pct(ponte.viaFiscalizacao.length / Math.max(1, entradas) * 100)} das entradas na base no período`}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Registros obtidos pela fiscalização', what: 'Empresas que passaram a ter registro ativo no período depois de uma ação fiscalizatória por falta de registro.', ids: ponte.viaFiscalizacao })} />
    </section>
    <MapaBivariado ctx={ctx} area="map" tools={<FichaPop ficha={fichaDe('fiscalizacao', 'map')} titulo="Mapa bivariado das regionais" anchor={ctx.anchor} />} />
    <Bloco ctx={ctx} id="ca" area="ca" title="O que aconteceu com as ações de fiscalização" question="Das ações do período, quantas terminaram em regularização depois da notificação, quantas viraram auto de infração e qual foi o destino das multas." help="O rito segue a Resolução Confea nº 1.008/2004: notificação, auto de infração, defesa, julgamento pela câmara e multa paga ou inscrita em dívida ativa. A empresa pode se regularizar em qualquer etapa."><Caminho ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="me" area="me" title="Ações, autos e regularizações por mês" question="A barra clara mostra as ações de fiscalização de cada mês, e a parte escura dentro dela, os autos de infração. A linha mostra as regularizações."><Mensal ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="cu" area="cu" title="Quanto tempo leva para regularizar, conforme a origem da ação" question="Compara as fontes que deram origem às ações: qual delas leva mais empresas a se regularizar e em quanto tempo."><Curvas ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="it" area="it" title="Em que etapa estão os casos conhecidos" question="Para cada tipo de caso, quantos já foram identificados e em que etapa da fiscalização estão, até a regularização."><Situacao ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="cv" area="cv" title="Ações que terminaram em regularização em até 180 dias" question="Para as ações iniciadas em cada trimestre, que parte terminou em regularização (registro, responsável técnico, ART ou baixa) em até 180 dias." help="As barras claras são trimestres que ainda não completaram 180 dias e por isso não entram na comparação. A regularização pode ter acontecido por outros motivos além da ação."><Conversao ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ta" area="ta" title="Tempo até a primeira ação, por regional" question="Quantos dias se passaram, no meio da lista, entre o caso aparecer na base e a primeira ação de fiscalização sobre ele, para os casos que surgiram no período." help="Casos que ainda não tiveram ação contam como em aberto, e não como zero. Quando mais da metade segue sem ação, a regional fica sem valor."><TempoAgir ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ft" area="ft" title="Resultado das forças-tarefas" question="Cada força-tarefa comparada com as ações do mesmo tipo e da mesma época feitas fora dela: quantas regularizaram em 180 dias, quanto foi recebido em um ano e quantos dias levou. O resultado só é fechado quando todas as ações completam 180 dias." help="A comparação mostra o que aconteceu, mas não prova que a força-tarefa causou o resultado, porque ela escolhe os alvos. A lista de forças-tarefas é de exemplo; em produção virá da SUPFIS."><Forcas ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ht" area="ht" title="Autos de infração por regional e mês" question="Autos lavrados nos últimos 12 meses em cada regional, para ver se a atuação é constante. Clique numa célula para ver os autos."><AutosRegionais ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ob" area="ob" title="Obras públicas e ART de fiscalização" question="Obras públicas cadastradas no Obrasgov e ligadas aos contratos publicados no PNCP, pela regional onde a obra acontece. Mostra a situação de cada obra, se a ligação com o contrato é segura e se existe ART de fiscalização. Clique numa regional para ver as obras." help="A ligação é segura quando o contrato traz o código do projeto (CIPI). Obra com ART de execução e sem ART de fiscalização vai para a malha fina."><Obras ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mp" area="mp" title="Quem ganha os contratos públicos técnicos e o que os órgãos planejam contratar" question="À esquerda, a parte de cada empresa no valor dos contratos técnicos do período, com os cinco maiores e um índice de concentração do mercado (HHI). À direita, o que os órgãos públicos incluíram nos seus planos anuais de contratação e quanto disso já virou licitação ou contrato." help="Mercado concentrado não quer dizer favorecimento. Plano de contratação é intenção, não gasto garantido."><MercadoPublico ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="cn" area="cn" title="Obras privadas do cadastro da Receita e a ART informada" question="Obras inscritas no Cadastro Nacional de Obras (CNO) em São Paulo cujo responsável está na base: quantas têm os dados mínimos, quantas informam o número da ART e em quantas essa ART foi encontrada. Clique numa etapa para ver as obras." help="O responsável pela obra na Receita nem sempre é a construtora ou o responsável técnico. Não encontrar a ART não prova que ela não exista."><Cno ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="li" area="li" title="Alvarás e licenças, e a ART da obra" question="Alvarás das prefeituras, autos de vistoria do Corpo de Bombeiros (AVCB) e licenças ambientais, por órgão emissor. Mostra quantos titulares estão registrados, em quantos casos se sabe quem executa a obra e em quantos há ART ligada ao processo. Clique num órgão para ver a lista." help="Licença vencida não indica atividade atual. Quem tira a licença nem sempre projeta ou executa a obra, e a ART só se liga pelo número do processo."><Licencas ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="tc" area="tc" title="Quanto dos contratos já foi pago" question="Para os contratos técnicos do período, o valor contratado comparado com o que já foi empenhado, liquidado e pago, segundo o Tribunal de Contas do Estado. Ao lado, os órgãos com mais valor contratado." help="Os quatro valores são etapas do mesmo gasto e não se somam. Na capital, os dados vêm do Tribunal de Contas do Município. Não é avaliação de regularidade."><Tce ctx={ctx} /></Bloco>
  </div>;
}

function Caminho({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, caminho = useMemo(() => caminhoAcoes(ctx.resumo), [ctx.resumo]), total = caminho.nodes[0]?.value || 1;
  const cores: Record<string, string> = { 'Ações fiscalizatórias': tokens.brand, 'Regularizada após notificação': tokens.good, 'Auto de infração lavrado': tokens.bad, 'Notificada, sem desfecho': tokens.heat[1], 'Multa paga': tokens.good, 'Em prazo de defesa': tokens.heat[1], 'Em julgamento': tokens.warn, 'Inscrita em dívida ativa': tokens.bad, 'Auto cancelado': tokens.muted };
  const option = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (item: any) => item.dataType === 'edge' ? `${item.data.source} → ${item.data.target}<br/><b>${int(item.data.value)}</b> ações (${pct(item.data.value / total * 100)})` : `<b>${item.name}</b><br/>${int(item.value)} ações · ${pct(item.value / total * 100)}<br/><span style="opacity:.75">clique para ver</span>` },
    series: [{ type: 'sankey', nodeAlign: 'left', left: 4, right: 150, top: 6, bottom: 6, nodeWidth: 12, nodeGap: 9, draggable: false, emphasis: { focus: 'adjacency' },
      data: caminho.nodes.map(node => ({ name: node.name, value: node.value, itemStyle: { color: cores[node.name] ?? tokens.blue, borderWidth: 0 } })), links: caminho.links.map(link => ({ source: link.source, target: link.target, value: link.value })),
      lineStyle: { color: 'gradient', opacity: 0.3, curveness: 0.5 },
      label: { color: tokens.ink, fontSize: 10.5, formatter: (item: any) => `{n|${item.name}}\n{v|${int(item.value)} · ${pct(item.value / total * 100)}}`, rich: { n: { fontWeight: 700, color: tokens.ink, fontSize: 10.5 }, v: { color: tokens.muted, fontSize: 10 } } } }],
  }), [caminho, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Caminho das ações fiscalizatórias do período" onPick={item => {
    const acoes = item.dataType === 'edge' ? caminho.links.find(link => link.source === item.data.source && link.target === item.data.target)?.acoes : caminho.nodes.find(node => node.name === item.name)?.acoes;
    if (!acoes?.length) return;
    const nomes = new Map(ctx.dataset.companies.map(row => [row.id, row.tradeName || row.name])), places = new Map(ctx.dataset.establishments.map(row => [row.id, row]));
    ctx.open({ kind: 'linhas', title: item.dataType === 'edge' ? `${item.data.source} → ${item.data.target}` : item.name, what: 'Ações fiscalizatórias do período neste ponto do processo, com o auto e a multa quando houver.', listTitle: 'Ações, maior multa primeiro',
      summary: [['Ações', int(acoes.length)], ['Multas', brl(acoes.reduce((sum, row) => sum + (row.auto?.valor ?? 0), 0))], ['Regularizadas', pct(acoes.filter(row => row.regularizedAt).length / acoes.length * 100)]],
      rows: acoes.map(acao => ({ key: acao.id, companyId: acao.companyId, title: nomes.get(acao.companyId) ?? acao.companyId, subtitle: `${places.get(acao.establishmentId)?.cnpj ?? ''} · ação em ${acao.date.split('-').reverse().join('/')}`,
        value: acao.auto ? money(acao.auto.valor) : acao.regularizedAt ? 'regularizada' : 'notificada', note: `${tipoLabel[acao.tipo]} · ${acao.origem}${acao.auto ? ` · ${acao.auto.status.toLowerCase()}` : ''}`, sortValue: acao.auto?.valor ?? 0 })) });
  }} />;
}

function AutosRegionais({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, heat = useMemo(() => autosPorRegionalMes(ctx.dataset, ctx.f), [ctx.dataset, ctx.f]);
  const maximo = Math.max(...heat.cells.map(cell => cell[2]), 1);
  const option = useMemo(() => ({
    grid: { top: 4, right: 8, bottom: 36, left: 4, containLabel: true },
    tooltip: { formatter: (item: any) => `<b>${heat.gres[item.value[1]].name}</b> · ${mes(heat.months[item.value[0]])}<br/>${int(item.value[2])} autos de infração` },
    xAxis: { type: 'category', data: heat.months.map(mes), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: { type: 'category', data: heat.gres.map(row => short(row.name)), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10, interval: 0 } },
    visualMap: { min: 0, max: maximo, orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 10, itemHeight: 160, calculable: false, textStyle: { color: tokens.muted, fontSize: 10 }, inRange: { color: tokens.heat } },
    series: [{ type: 'heatmap', data: heat.cells, label: { show: true, fontSize: 9.5, color: tokens.ink, formatter: (item: any) => item.value[2] || '' }, itemStyle: { borderColor: tokens.surface, borderWidth: 2, borderRadius: 3 }, emphasis: { itemStyle: { borderColor: tokens.accent, borderWidth: 2 } } }],
  }), [heat, tokens, maximo]);
  return <Chart option={option} tokens={tokens} label="Autos de infração por regional e mês" onPick={item => { const gre = heat.gres[item.value?.[1]], month = heat.months[item.value?.[0]]; if (!gre || !month) return;
    const acoes = ctx.f.acoes.filter(row => row.greId === gre.id && row.auto?.date.startsWith(month)); if (!acoes.length) return;
    const nomes = new Map(ctx.dataset.companies.map(row => [row.id, row.tradeName || row.name]));
    ctx.open({ kind: 'linhas', eyebrow: `${short(gre.name)} · ${mes(month)}`, title: 'Autos de infração do mês', what: 'Autos lavrados na regional no mês.', listTitle: 'Autos, maior multa primeiro',
      summary: [['Autos', int(acoes.length)], ['Multas', brl(acoes.reduce((sum, row) => sum + row.auto!.valor, 0))], ['Origens', [...new Set(acoes.map(row => row.origem))].length.toString()]],
      rows: acoes.map(acao => ({ key: acao.id, companyId: acao.companyId, title: nomes.get(acao.companyId) ?? acao.companyId, subtitle: `auto em ${acao.auto!.date.split('-').reverse().join('/')}`, value: money(acao.auto!.valor), note: `${tipoLabel[acao.tipo]} · ${acao.origem} · ${acao.auto!.status.toLowerCase()}`, sortValue: acao.auto!.valor })) });
  }} />;
}

function Conversao({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, c = ctx.norte.conversao, rows = c.coortes;
  const option = useMemo(() => ({
    grid: { top: 28, right: 8, bottom: 2, left: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex];
      return `<b>${row.trimestre.replace('-', ' ')}</b>${row.completa ? '' : ' · coorte em aberto'}<br/>${int(row.acoes.length)} ações · ${int(row.convertidas.length)} regularizadas em até 180 dias<br/>Conversão: <b>${row.taxa === null ? '—' : pct(row.taxa, 1)}</b>`; } },
    xAxis: { type: 'category', data: rows.map(row => row.trimestre.replace('-', ' ')), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: [{ type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } }, { type: 'value', max: 100, splitLine: { show: false }, axisLabel: { color: tokens.muted, formatter: '{value}%' } }],
    series: [
      { name: 'Ações iniciadas', type: 'bar', barWidth: '56%', itemStyle: { color: tokens.heat[1] }, data: rows.map(row => ({ value: row.acoes.length, itemStyle: { color: row.completa ? tokens.heat[1] : tokens.line, borderRadius: [3, 3, 0, 0] } })) },
      { name: 'Regularizadas em 180 dias', type: 'bar', barGap: '-100%', barWidth: '56%', itemStyle: { color: tokens.good }, data: rows.map(row => ({ value: row.convertidas.length, itemStyle: { color: row.completa ? tokens.good : tokens.muted, borderRadius: [3, 3, 0, 0] } })) },
      { name: 'Conversão', type: 'line', yAxisIndex: 1, data: rows.map(row => row.completa ? row.taxa : null), symbol: 'circle', symbolSize: 6, lineStyle: { color: tokens.ink, width: 2 }, itemStyle: { color: tokens.ink },
        label: { show: true, position: 'top', color: tokens.ink, fontSize: 10, formatter: (params: any) => params.value == null ? '' : pct(params.value) } },
    ],
  }), [rows, tokens]);
  return <div className="stack">
    <p className="kpi-line">{c.atual ? <><b>{pct(c.atual.taxa ?? 0, 1)}</b> das ações iniciadas em {c.atual.trimestre.replace('-', ' ')} terminaram em regularização, no trimestre mais recente que já completou 180 dias.{c.anterior && c.anterior !== c.atual && c.anterior.taxa !== null && <> No trimestre anterior ({c.anterior.trimestre.replace('-', ' ')}) foram {pct(c.anterior.taxa, 1)}.</>}</> : 'Nenhum trimestre completou 180 dias ainda.'} {int(rows.filter(row => !row.completa).length)} trimestres ainda estão dentro do prazo.</p>
    <Chart option={option} tokens={tokens} label="Conversão em 180 dias por coorte trimestral" onPick={params => { const row = rows[params.dataIndex]; if (!row?.acoes.length) return;
      const ids = params.seriesName === 'Regularizadas em 180 dias' ? row.convertidas : row.acoes;
      ctx.open({ kind: 'empresas', title: `Ações iniciadas em ${row.trimestre.replace('-', ' ')}, ${String(params.seriesName).toLowerCase()}`, what: 'Empresas das ações fiscais iniciadas no trimestre.', use: 'Associação no tempo, não efeito causal.', ids: [...new Set(ids.map(acao => acao.companyId))] }); }} />
  </div>;
}

function TempoAgir({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, t = ctx.norte.tempo;
  const rows = useMemo(() => [...t.porGre].sort((a, b) => b.abertos / b.n - a.abertos / a.n), [t]);
  const option = useMemo(() => ({
    grid: { top: 24, right: 112, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.nome}</b><br/>Mediana até a primeira ação: ${row.mediana === null ? 'em aberto (mais da metade sem ação)' : `${int(row.mediana)} dias`}<br/>${int(row.agidos)} indícios com ação · ${int(row.abertos)} ainda sem ação`; } },
    xAxis: { type: 'value', max: 100, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: '{value}%' } },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => short(row.nome)), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10, interval: 0 } },
    series: [
      { name: 'Indícios já com ação', type: 'bar', stack: 't', barCategoryGap: '28%', data: rows.map(row => Math.round(row.agidos / row.n * 1000) / 10), itemStyle: { color: tokens.blue } },
      { name: 'Ainda sem ação', type: 'bar', stack: 't', data: rows.map(row => Math.round(row.abertos / row.n * 1000) / 10), itemStyle: { color: tokens.line, borderRadius: [0, 3, 3, 0] },
        label: { show: true, position: 'right', color: tokens.ink, fontSize: 9.5, formatter: (params: any) => { const row = rows[params.dataIndex]; return row.mediana === null ? 'mediana em aberto' : `mediana ${int(row.mediana)} d`; } } },
    ],
  }), [rows, tokens]);
  return <div className="stack">
    <p className="kpi-line"><b>{t.mediana === null ? 'mais da metade sem ação' : `${int(t.mediana)} dias`}</b> é o tempo típico (mediana) no estado entre o indício e a ação. <b>{int(t.abertos)}</b> dos {int(t.esperas.length)} indícios do período ainda não tiveram ação. Por tipo: {t.porTipo.map(row => `${row.nome.toLowerCase()}, ${row.mediana === null ? 'mais da metade sem ação' : `${int(row.mediana)} dias`}`).join('; ')}.</p>
    <Chart option={option} tokens={tokens} label="Indícios com e sem ação e tempo mediano até a primeira ação, por regional" onPick={params => { const row = rows[params.dataIndex]; if (row) ctx.open({ kind: 'gre', id: row.id }); }} />
  </div>;
}

function Forcas({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, forcas } = ctx, gres = new Map(ctx.dataset.gres.map(row => [row.id, short(row.name)]));
  const fechadas = forcas.filter(row => row.fechada), positivas = fechadas.filter(row => (row.diferenca ?? 0) > 0).length;
  const abrir = (item: ResultadoFt, grupo: 'grupo' | 'comparacao') => { const g = item[grupo]; if (!g.acoes.length) return;
    const nomes = new Map(ctx.dataset.companies.map(row => [row.id, row.tradeName || row.name])), ok = new Set(g.regularizadas.map(row => row.id));
    ctx.open({ kind: 'linhas', eyebrow: `${item.ft.id} · ${grupo === 'grupo' ? 'força-tarefa' : 'grupo de comparação'}`, title: grupo === 'grupo' ? item.ft.nome : `Demais ações de ${tipoLabel[item.ft.tema].toLowerCase()} no período`, what: grupo === 'grupo' ? item.ft.descricao : 'Ações do mesmo tipo e período fora de qualquer força-tarefa, em todo o estado.', use: 'Associação no tempo, não causa.', listTitle: 'Ações, regularizadas primeiro',
      summary: [['Ações', int(g.acoes.length)], ['Regularizadas em 180 d', g.taxa === null ? '—' : pct(g.taxa)], ['Receita em 365 d', brl(g.receita)]],
      rows: g.acoes.map(acao => ({ key: acao.id, companyId: acao.companyId, title: nomes.get(acao.companyId) ?? acao.companyId, subtitle: `${gres.get(acao.greId) ?? acao.greId} · ação em ${acao.date.split('-').reverse().join('/')}`, value: ok.has(acao.id) ? `regularizada em ${acao.regularizedAt!.split('-').reverse().join('/')}` : acao.regularizedAt ? 'regularizada depois de 180 dias' : 'sem regularização', note: `${acao.origem}${acao.auto ? ` · auto ${money(acao.auto.valor)}` : ''}`, sortValue: ok.has(acao.id) ? 1 : 0 })) }); };
  const max = Math.max(1, ...forcas.map(row => Math.max(row.grupo.acoes.length, row.comparacao.acoes.length)));
  const taxa = (value: number | null) => value === null ? '—' : pct(value);
  return <div className="stack">
    <p className="kpi-line"><b>{int(forcas.length)}</b> forças-tarefas nos filtros escolhidos. <b>{int(fechadas.length)}</b> já têm resultado, e {int(positivas)} delas regularizaram mais que o grupo de comparação. <b>{int(forcas.length - fechadas.length)}</b> ainda não completaram {PRAZO_RESULTADO} dias.</p>
    <div className="table-wrap"><table className="regras ft">
      <thead><tr><th>Força-tarefa</th><th>Período</th><th>Ações</th><th>Regularização 180 d</th><th>Comparação</th><th>Diferença</th><th>Receita 365 d</th><th>Mediana</th></tr></thead>
      <tbody>{forcas.map(item => <tr key={item.ft.id} tabIndex={0} onClick={() => abrir(item, 'grupo')} onKeyDown={event => { if (event.key === 'Enter') abrir(item, 'grupo'); }}>
        <td><b>{item.ft.id} · {item.ft.nome}</b><small>{tipoLabel[item.ft.tema]} · {gres.get(item.ft.greId) ?? item.ft.greId}{item.fechada ? '' : ' · em aberto'}</small></td>
        <td><small>{item.ft.inicio.split('-').reverse().join('/')} a {item.ft.fim.split('-').reverse().join('/')}</small></td>
        <td><span className="cellbar"><i style={{ width: `${item.grupo.acoes.length / max * 100}%` }} /><em>{int(item.grupo.acoes.length)}</em></span></td>
        <td><b>{taxa(item.grupo.taxa)}</b><small>{int(item.grupo.regularizadas.length)} de {int(item.grupo.acoes.length)}</small></td>
        <td><button className="link" onClick={event => { event.stopPropagation(); abrir(item, 'comparacao'); }}>{taxa(item.comparacao.taxa)}</button><small>{int(item.comparacao.regularizadas.length)} de {int(item.comparacao.acoes.length)} ações</small></td>
        <td>{item.diferenca === null ? '—' : <span className={item.diferenca >= 0 ? 'pos' : 'neg'}>{item.diferenca >= 0 ? '+' : ''}{item.diferenca.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} p.p.</span>}{!item.fechada && <small>parcial</small>}</td>
        <td>{brl(item.grupo.receita)}<small>{int(item.grupo.empresasPagantes)} empresas · comparação {brl(item.comparacao.receita)}</small></td>
        <td>{item.grupo.medianaDias === null ? '—' : `${int(item.grupo.medianaDias)} d`}<small>comparação {item.comparacao.medianaDias === null ? '—' : `${int(item.comparacao.medianaDias)} d`}</small></td></tr>)}</tbody>
    </table></div>
  </div>;
}

/* ---------- V21 · obras do Obrasgov e mercado público ---------- */
function Obras({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.frentes.obras, gres = useMemo(() => new Map(ctx.dataset.gres.map(row => [row.id, short(row.name)])), [ctx.dataset]);
  const rows = useMemo(() => q.porGre.filter(row => row.obras > 0).sort((a, b) => b.obras - a.obras), [q]);
  const corSituacao: Record<SituacaoObra, string> = { 'Não iniciada': tokens.muted, 'Em execução': tokens.blue, Paralisada: tokens.warn, Concluída: tokens.good };
  const option = useMemo(() => ({
    grid: { top: 24, right: 8, bottom: 2, left: 2, containLabel: true }, legend: { top: 0, left: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${gres.get(row.greId)}</b><br/>${int(row.obras)} obras (${brl(row.valor)}) · ${int(row.emExecucao)} em execução<br/>${int(row.semArt)} com ART de execução e sem ART de fiscalização`; } },
    xAxis: { type: 'category', data: rows.map(row => gres.get(row.greId) ?? row.greId), axisLabel: { color: tokens.muted, fontSize: 10, interval: 0, rotate: 30 }, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    series: [
      { type: 'bar', name: 'Em execução', stack: 'o', barWidth: 16, data: rows.map(row => row.emExecucao), itemStyle: { color: tokens.blue } },
      { type: 'bar', name: 'Demais situações', stack: 'o', data: rows.map(row => row.obras - row.emExecucao), itemStyle: { color: tokens.soft, borderColor: tokens.line, borderWidth: 1 } },
      { type: 'line', name: 'Sem ART de fiscalização', data: rows.map(row => row.semArt), symbol: 'circle', symbolSize: 7, lineStyle: { width: 0 }, itemStyle: { color: tokens.warn } },
    ],
  }), [rows, gres, tokens]);
  const abrir = (greId: string) => { const obras = q.obras.filter(row => row.greId === greId); if (obras.length) ctx.open({ kind: 'linhas', title: `Obras públicas · ${gres.get(greId)}`, what: 'Obras do Obrasgov com local de execução na regional, ligadas ao contrato do PNCP e lidas na data de referência.', use: 'Local de execução vem do Obrasgov, não da sede do fornecedor nem do órgão.', listTitle: 'Obras', rows: obras.map(row => ({ key: row.id, companyId: row.companyId, title: nomeEmpresa(ctx, row.companyId), subtitle: `${row.objeto} · ${row.situacao} · ${row.ponte}`, value: brl(row.valor), note: row.artFiscalizacao ? 'ART de fiscalização localizada' : 'sem ART de fiscalização', sortValue: row.valor })) }); };
  return <div className="split is-wide">
    <div className="stack">
      <p className="kpi-line"><b>{int(q.obras.length)}</b> obras públicas somam {brl(q.valorTotal)}, e <b>{int(q.iniciadas.length)}</b> já começaram. Em <b>{int(q.semArtFiscalizacao.length)}</b> delas existe ART de execução, mas não ART de fiscalização{q.taxaSemArt === null ? '' : ` (${pct(q.taxaSemArt)} das obras iniciadas)`}.</p>
      <Chart option={option} tokens={tokens} label="Obras públicas por regional do local de execução" onPick={params => { const row = rows[params.dataIndex]; if (row) abrir(row.greId); }} />
    </div>
    <ul className="side-list" aria-label="Situação e ponte">
      {q.porSituacao.map(row => <li key={row.situacao}><button disabled><i style={{ background: corSituacao[row.situacao as SituacaoObra] }} /><span>{row.situacao}</span><b>{int(row.n)}</b></button></li>)}
      {q.porPonte.map(row => <li key={row.ponte}><button disabled><i style={{ background: row.ponte === 'CIPI no contrato' ? tokens.good : row.ponte === 'Não identificada' ? tokens.muted : tokens.accent }} /><span><small>Ponte: {row.ponte}</small></span><b>{int(row.n)}</b></button></li>)}
      <li className="side-note">As situações possíveis são: {situacoesObra.join(', ').toLowerCase()}. As obras vêm do Obrasgov e do Portal Nacional de Contratações Públicas (PNCP), consultados todos os dias; as ARTs vêm do sistema do Crea-SP.</li>
    </ul>
  </div>;
}

function MercadoPublico({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, c = ctx.mercado.concentracao, d = ctx.mercado.demanda, top = useMemo(() => c.fornecedores.slice(0, 15), [c]);
  const option = useMemo(() => {
    let acumulado = 0; const linha = top.map(row => { acumulado += row.participacao; return acumulado; });
    return {
      grid: { top: 10, right: 44, bottom: 2, left: 2, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = top[items[0].dataIndex]; return `<b>${nomeEmpresa(ctx, row.companyId)}</b><br/>${brl(row.valor)} em ${int(row.contratos)} contrato(s) · ${pct(row.participacao, 1)} da carteira<br/>acumulado: ${pct(linha[items[0].dataIndex], 1)}${row.registradaEmTodos ? '' : '<br/>sem registro na data de ao menos um contrato'}`; } },
      xAxis: { type: 'category', data: top.map((_, index) => `${index + 1}º`), axisLabel: { color: tokens.muted, fontSize: 10 }, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } } },
      yAxis: [{ type: 'value', splitLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10, formatter: '{value}%' } }, { type: 'value', max: 100, axisLabel: { color: tokens.muted, fontSize: 10, formatter: '{value}%' }, splitLine: { show: false } }],
      series: [
        { type: 'bar', name: 'Participação', barWidth: 14, data: top.map(row => ({ value: row.participacao, itemStyle: { color: row.registradaEmTodos ? tokens.blue : tokens.warn } })) },
        { type: 'line', name: 'Acumulado', yAxisIndex: 1, data: linha, symbol: 'circle', symbolSize: 5, lineStyle: { color: tokens.ink, width: 1.5 }, itemStyle: { color: tokens.ink } },
      ],
    };
  }, [top, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="split is-wide">
    <div className="stack">
      <p className="kpi-line"><b>{int(c.n)}</b> fornecedores dividem <b>{int(c.contratos)}</b> contratos técnicos, que somam {brl(c.total)}. Os cinco maiores ficam com <b>{c.top5 === null ? '—' : pct(c.top5, 1)}</b> do valor, e o índice de concentração (HHI) é <b>{c.hhi === null ? '—' : int(c.hhi)}</b>. {c.valorRegistrado === null ? '—' : pct(c.valorRegistrado)} do valor foi para fornecedores registrados no Crea-SP.</p>
      <Chart option={option} tokens={tokens} label="Participação dos quinze maiores fornecedores na carteira técnica" onPick={params => { const row = top[params.dataIndex]; if (row) ctx.open({ kind: 'empresas', title: `${nomeEmpresa(ctx, row.companyId)} · fornecedor público`, what: `${int(row.contratos)} contrato(s) técnico(s) no período, ${brl(row.valor)}.`, use: 'Participação descreve o mercado, não favorecimento. Conferir registro e ART na data de cada contrato (Malha fina).', ids: [row.companyId] }); }} />
    </div>
    <ul className="side-list" aria-label="Demanda planejada">
      {d.porEtapa.map(row => <li key={row.etapa}><button disabled><i style={{ background: row.etapa === 'Planejado' ? tokens.accent : row.etapa === 'Contratação publicada' ? tokens.blue : tokens.good }} /><span>{row.etapa}<br /><small>{int(row.n)} itens do PCA</small></span><b>{brl(row.valor)}</b></button></li>)}
      {d.porExercicio.map(row => <li key={row.exercicio}><button disabled><i style={{ background: tokens.muted }} /><span><small>Exercício {row.exercicio}: {int(row.n)} itens, {brl(row.planejado)} sem materialização</small></span><b>{brl(row.valor)}</b></button></li>)}
      <li className="side-note">As etapas ({etapasPca.join(', ').toLowerCase()}) são a mesma compra em momentos diferentes e não devem ser somadas. Os dados vêm do Plano de Contratações Anual (PCA) publicado no PNCP, consultado todos os dias. O cenário é demonstrativo.</li>
    </ul>
  </div>;
}

function Cno({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.parcerias.cno;
  const etapas = useMemo(() => [{ label: 'Obras do CNO em SP', rows: q.obras }, { label: 'Com dados mínimos', rows: q.comDadosMinimos }, { label: 'Campo ART preenchido', rows: q.comCampoArt }, { label: 'ART localizada na base', rows: q.comArtLocalizada }], [q]);
  const corSituacao: Record<SituacaoCno, string> = { Ativa: tokens.blue, Paralisada: tokens.warn, Encerrada: tokens.muted }, corPapel: Record<PapelCno, string> = { Executora: tokens.good, 'Responsável tributário': tokens.accent, Proprietário: tokens.soft };
  const option = useMemo(() => ({
    grid: { top: 6, right: 48, bottom: 2, left: 2, containLabel: true }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: etapas.map(row => row.label), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: [{ type: 'bar', name: 'Obras', barWidth: 16, data: etapas.map((row, index) => ({ value: row.rows.length, itemStyle: { color: index === 3 ? tokens.good : index === 0 ? tokens.soft : tokens.blue, borderColor: index === 0 ? tokens.line : undefined, borderWidth: index === 0 ? 1 : 0, borderRadius: [0, 3, 3, 0] } })), label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (params: any) => `${int(params.value)}${params.dataIndex ? ` · ${pct(params.value / Math.max(1, etapas[0].rows.length) * 100)}` : ''}` } }],
  }), [etapas, tokens]);
  const abrir = (index: number) => { const rows = etapas[index]?.rows ?? []; if (rows.length) ctx.open({ kind: 'linhas', eyebrow: 'Depende de parceria (CNO autorizado)', title: `Obras do CNO · ${etapas[index].label.toLowerCase()}`, what: 'Obras inscritas no Cadastro Nacional de Obras, localizadas em SP, cujo responsável tem atividade de engenharia, na data escolhida.', use: 'O papel do responsável (executora, responsável tributário, proprietário) muda o que a ART deve cobrir.', listTitle: 'Obras', rows: rows.map(row => ({ key: row.id, companyId: row.companyId, title: nomeEmpresa(ctx, row.companyId), subtitle: `CNO ${row.cno} · ${row.papel} · ${row.situacao}`, value: row.artLocalizada ? 'ART localizada' : row.campoArt ? 'ART não localizada' : 'campo ART vazio', note: `inscrita em ${row.inscricao.split('-').reverse().join('/')}`, sortValue: row.artLocalizada ? 0 : 1 })) }); };
  return <div className="split">
    <div className="stack">
      <p className="kpi-line"><b>{int(q.obras.length)}</b> obras privadas cadastradas. Entre as que têm dados suficientes para a busca, a ART foi localizada em {q.cobertura === null ? '—' : <b>{pct(q.cobertura)}</b>}. O campo de ART vem preenchido em {q.preenchimento === null ? "—" : pct(q.preenchimento)} dessas obras, e <b>{int(q.executorasSemArt.length)}</b> empresas executam obra ativa sem nenhuma ART localizada.</p>
      <Chart option={option} tokens={tokens} label="Funil da conciliação das obras do CNO" onPick={params => abrir(params.dataIndex)} />
    </div>
    <ul className="side-list" aria-label="Situação e papel">
      {q.porSituacao.map(row => <li key={row.situacao}><button disabled><i style={{ background: corSituacao[row.situacao] }} /><span>{row.situacao}</span><b>{int(row.n)}</b></button></li>)}
      {q.porPapel.map(row => <li key={row.papel}><button disabled><i style={{ background: corPapel[row.papel] }} /><span><small>Papel: {row.papel} · {int(row.registradas)} registradas</small></span><b>{int(row.n)}</b></button></li>)}
      <li><button onClick={() => q.executorasSemArt.length && ctx.open({ kind: 'empresas', title: 'Executoras de obra do CNO sem ART localizada', what: 'Empresas no papel de executora em obra ativa ou paralisada do CNO, com campo ART vazio ou não correspondente.', use: 'Regra da malha fina (candidato). Orientar o preenchimento antes de notificar.', ids: q.executorasSemArt, eyebrow: 'Indício a confirmar, que depende de parceria' })}><i style={{ background: tokens.warn }} /><span>Executoras sem ART localizada</span><b>{int(q.executorasSemArt.length)}</b></button></li>
      <li className="side-note">Depende de acesso autorizado ao Cadastro Nacional de Obras (CNO), mantido pela Receita Federal e pelo Serpro, que não é público. Os números são demonstrativos.</li>
    </ul>
  </div>;
}

function Licencas({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.parcerias.licencas, rows = q.porFonte;
  const option = useMemo(() => ({
    grid: { top: 44, right: 8, bottom: 2, left: 2, containLabel: true }, legend: { top: 0, left: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.fonte}</b><br/>${int(row.n)} licenças (${int(row.vigentes)} vigentes) · ${int(row.titularRegistrado)} titulares com registro<br/>${int(row.obras)} de obra ou instalação · ${int(row.executoraIdentificada)} com executora identificada · ${int(row.artPonte)} com ART ligada`; } },
    xAxis: { type: 'category', data: rows.map(row => row.fonte === 'Alvará municipal' ? 'Alvará' : row.fonte), axisLabel: { color: tokens.muted, fontSize: 10, interval: 0 }, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    series: [
      { type: 'bar', name: 'Titular com registro', stack: 'l', barWidth: 22, data: rows.map(row => row.titularRegistrado), itemStyle: { color: tokens.good } },
      { type: 'bar', name: 'Titular sem registro', stack: 'l', data: rows.map(row => row.n - row.titularRegistrado), itemStyle: { color: tokens.soft, borderColor: tokens.line, borderWidth: 1, borderRadius: [3, 3, 0, 0] } },
      { type: 'line', name: 'ART ligada ao processo', data: rows.map(row => row.artPonte), symbol: 'circle', symbolSize: 7, lineStyle: { width: 0 }, itemStyle: { color: tokens.blue } },
    ],
  }), [rows, tokens]);
  const abrir = (fonte: FonteLicenca) => { const lista = q.licencas.filter(row => row.fonte === fonte); if (lista.length) ctx.open({ kind: 'linhas', eyebrow: 'Depende de parceria', title: `Licenças e alvarás · ${fonte}`, what: 'Licenças, alvarás e autos cujo titular tem atividade de engenharia, na data escolhida. A fase depende de a licença estar ou não vigente nessa data.', use: 'Titular não é executora. A ART só se liga pela chave do processo.', listTitle: 'Licenças', rows: lista.map(row => ({ key: row.id, companyId: row.companyId, title: nomeEmpresa(ctx, row.companyId), subtitle: `${row.tipo} · ${row.processo} · ${row.fase}`, value: row.obra ? (row.artPonte ? 'ART ligada' : 'sem ART ligada') : 'não é obra', note: row.executoraId ? `executora: ${nomeEmpresa(ctx, row.executoraId)}` : 'executora não identificada', sortValue: row.obra && !row.artPonte ? 1 : 0 })) }); };
  return <div className="split">
    <div className="stack">
      <p className="kpi-line"><b>{int(q.licencas.length)}</b> licenças e alvarás de {int(q.titularesDistintos)} titulares, dos quais {int(q.vigentes.length)} estão vigentes. O titular tem registro no Crea-SP em {q.taxaTitular === null ? '—' : pct(q.taxaTitular)} dos casos. Nas licenças de obra, a empresa executora foi identificada em {q.taxaExecutora === null ? '—' : pct(q.taxaExecutora)} e a ART foi encontrada em {q.taxaArt === null ? '—' : pct(q.taxaArt)}.</p>
      <Chart option={option} tokens={tokens} label="Licenças e alvarás por fonte e registro do titular" onPick={params => { const row = rows[params.dataIndex]; if (row) abrir(row.fonte); }} />
    </div>
    <ul className="side-list" aria-label="Fontes e indícios">
      {fontesLicenca.map(fonte => { const row = rows.find(item => item.fonte === fonte)!; return <li key={fonte}><button onClick={() => abrir(fonte)}><i style={{ background: tokens.blue }} /><span>{fonte}<small>{int(row.vigentes)} vigentes · {int(row.obras)} de obra</small></span><b>{int(row.n)}</b></button></li>; })}
      <li><button onClick={() => q.obrasSemArt.length && ctx.open({ kind: 'empresas', title: 'Alvará ou licença de obra vigente sem ART ligada', what: 'Empresas executoras, ou o titular quando a executora não aparece, de licenças de obra vigentes sem nenhuma ART ligada ao processo.', use: 'Regra da malha fina (candidato). A ART pode existir sob outro número.', ids: q.obrasSemArt, eyebrow: 'Indício a confirmar, que depende de parceria' })}><i style={{ background: tokens.warn }} /><span>Obra vigente sem ART ligada</span><b>{int(q.obrasSemArt.length)}</b></button></li>
      <li className="side-note">Depende de acordos com as prefeituras, o Corpo de Bombeiros e a CETESB. Os dados públicos do IBAMA e da ANA não trazem CNPJ confiável. Os números são demonstrativos.</li>
    </ul>
  </div>;
}

function Tce({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.parcerias.tce, orgaos = useMemo(() => new Map(ctx.dataset.buyers.map(row => [row.id, row.name.replace(' (simulação)', '').replace('Administração municipal de ', 'Prefeitura de ').replace(' demonstrativo', '')])), [ctx.dataset]);
  const etapas = useMemo(() => [{ label: 'Contratado (PNCP)', valor: q.contratado, cor: tokens.soft }, { label: 'Empenhado', valor: q.empenhado, cor: tokens.blue }, { label: 'Liquidado', valor: q.liquidado, cor: tokens.accent }, { label: 'Pago', valor: q.pago, cor: tokens.good }], [q, tokens]);
  const option = useMemo(() => ({
    grid: { top: 6, right: 70, bottom: 2, left: 2, containLabel: true }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (value: number) => brl(value) },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: etapas.map(row => row.label), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: [{ type: 'bar', name: 'Valor', barWidth: 16, data: etapas.map((row, index) => ({ value: row.valor, itemStyle: { color: row.cor, borderColor: index === 0 ? tokens.line : undefined, borderWidth: index === 0 ? 1 : 0, borderRadius: [0, 3, 3, 0] } })), label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (params: any) => `${brl(params.value)}${params.dataIndex ? ` · ${pct(params.value / Math.max(1, q.contratado) * 100)}` : ''}` } }],
  }), [etapas, tokens, q.contratado]);
  const abrirOrgao = (buyerId: string) => { const lista = q.etapas.filter(row => row.buyerId === buyerId); if (lista.length) ctx.open({ kind: 'linhas', eyebrow: 'Depende de parceria (TCE-SP)', title: `Etapas financeiras · ${orgaos.get(buyerId) ?? buyerId}`, what: 'Contratos técnicos do período com as etapas publicadas pelo tribunal, lidas na data de referência.', use: 'Pago menor que contratado é execução em curso, não irregularidade.', listTitle: 'Contratos', rows: lista.map(row => ({ key: row.contractId, companyId: row.companyId, title: nomeEmpresa(ctx, row.companyId), subtitle: `${row.fonte}; ligação com o contrato ${row.ponte.toLowerCase()}`, value: `${brl(row.pago)} pagos`, note: `${brl(row.contratado)} contratados · ${brl(row.empenhado)} empenhados · ${brl(row.liquidado)} liquidados`, sortValue: row.contratado })) }); };
  return <div className="split">
    <div className="stack">
      <p className="kpi-line"><b>{int(q.etapas.length)}</b> dos {int(q.contratosNoPeriodo)} contratos do período têm as etapas de despesa publicadas pelo Tribunal de Contas. A ligação entre o contrato e a despesa foi confirmada em {q.coberturaPonte === null ? '—' : <b>{pct(q.coberturaPonte)}</b>} deles, e <b>{int(q.semPagamento.length)}</b> contratos confirmados ainda não tiveram nenhum pagamento.</p>
      <Chart option={option} tokens={tokens} label="Valor contratado, empenhado, liquidado e pago" />
    </div>
    <ul className="side-list" aria-label="Ponte e órgãos">
      {pontesTce.map(ponte => { const row = q.porPonte.find(item => item.ponte === ponte)!; return <li key={ponte}><button disabled><i style={{ background: ponte === 'Validada' ? tokens.good : ponte === 'Sem ponte' ? tokens.muted : tokens.accent }} /><span>Ponte {ponte.toLowerCase()}<small>{brl(row.contratado)} contratados</small></span><b>{int(row.n)}</b></button></li>; })}
      {q.porOrgao.slice(0, 2).map(row => <li key={row.buyerId}><button onClick={() => abrirOrgao(row.buyerId)}><i style={{ background: tokens.blue }} /><span>{orgaos.get(row.buyerId) ?? row.buyerId}<small>{int(row.contratos)} contratos · {brl(row.pago)} pagos</small></span><b>{brl(row.contratado)}</b></button></li>)}
      <li className="side-note">Depende de acordo com o Tribunal de Contas do Estado (TCE-SP) e, na capital, com o Tribunal de Contas do Município (TCM-SP). É o primeiro acordo sugerido no plano. Os números são demonstrativos.</li>
    </ul>
  </div>;
}
