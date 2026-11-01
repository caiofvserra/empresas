import { useMemo } from 'react';
import { caoService, complianceFlow } from '../gestao-v14/metrics';
import { Chart, Spark } from '../painel/chart';
import { quadroTecnico } from '../painel/analise';
import { Mekko, PonteChart, Quadro } from '../painel/VisaoCadastro';
import { brl, data, int, mes, pct, short } from '../painel/ui';
import { classesCnae, correspondencias } from '../observatorio/norte';
import { fontesInstalacao } from '../domain/frentes';
import type { FonteInstalacao } from '../domain/frentes';
import type { CockpitCtx } from './contexto';
import { artPorCamara, artPorModalidade, artRegionalMes, artsPeriodo, camaraPorte, entradasSaidas, pagamento, prazoRegistro } from './medidas';
import { Bloco, Indicador } from './ui';

/**
 * Aba 2 · Empresas: três contagens que não se somam, conciliação Receita × Crea-SP com “Sim” e “Passível” separados, cobertura
 * por regional, situação, entradas e saídas, prazo de registro, regionais e, absorvidos da antiga aba de responsabilidade técnica,
 * o quadro técnico, as ARTs e as certidões. Tudo lido na data de referência.
 */
const change = (now: number, before: number) => before > 0 ? (now - before) / before * 100 : null;

export default function PaginaCadastro({ ctx }: { ctx: CockpitCtx }) {
  const { model, scope, tokens, arts, metas } = ctx;
  const flow = useMemo(() => complianceFlow(model, scope), [model, scope]);
  const qt = useMemo(() => quadroTecnico(scope, model, ctx.f), [scope, model, ctx.f]);
  const cao = useMemo(() => caoService(scope), [scope]), pay = pagamento(model), ativas = model.metadata.activeCompanyIds;
  const fila = cao.queue.reduce((sum, row) => sum + row.count, 0), rt = model.metrics.rtCoverage.value;
  return <div className="ck-grid ck-grid-cadastro">
    <section className="ck-cards is-six" style={{ gridArea: 'kpi' }} aria-label="Indicadores de responsabilidade técnica, ART e certidões">
      <Indicador destaque ficha="k-rt" ctx={ctx} label="Empresas com responsável técnico" value={rt === null ? '—' : pct(rt)} meta={{ atual: rt, alvo: metas.rt }} variacao={{ value: rt === null ? null : rt - metas.rt, kind: 'pp', label: `vs. meta de ${metas.rt}%` }} sub={`${int(qt.comRt.length)} de ${int(ativas.length)} empresas registradas`}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas registradas sem RT identificado', what: 'Empresas com registro ativo sem responsável técnico de vínculo vigente: RT baixado sem substituto ou nenhum vínculo carregado.', use: 'Notifique as de RT baixado; confira o cadastro das sem vínculo.', ids: [...qt.rtBaixado, ...qt.semVinculo] })} />
      <Indicador ficha="k-rt-baixado" ctx={ctx} label="RT baixado sem substituto" value={int(qt.rtBaixado.length)} sub="baixa do RT sem novo vínculo em 30 dias" onOpen={() => ctx.open({ kind: 'alvos', tipo: 'rt' })} />
      <Indicador ficha="k-arts" ctx={ctx} label="ARTs de empresas" value={int(arts.atual.length)} variacao={{ value: change(arts.atual.length, arts.antes) }} spark={arts.mensal} cor={tokens.blue} sub={`${int(new Set(arts.atual.map(row => row.companyId)).size)} empresas com ART no período`}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas com ART no período', what: 'Empresas com ao menos uma ART registrada no período.', ids: [...new Set(arts.atual.map(row => row.companyId))] })} />
      <Indicador ficha="k-valor-art" ctx={ctx} label="Valor declarado em ART" value={brl(arts.valor)} variacao={{ value: change(arts.valor, arts.valorAntes) }} sub="soma do valor de contrato das ARTs" />
      <Indicador ficha="k-cao" ctx={ctx} label="Certidão de acervo operacional" value={cao.median === null ? '—' : `${int(cao.median)} dias`} sub={`prazo mediano · 90% em até ${cao.p90 === null ? '—' : int(cao.p90)} dias · ${int(fila)} pedidos na fila`} />
      <Indicador ficha="k-quitacao" ctx={ctx} label="Aptas à certidão de registro e quitação" value={pct(pay.emDia.length / Math.max(1, ativas.length) * 100)} sub={`${int(pay.inadimplentes.length)} empresas registradas com anuidade vencida`}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas sem quitação de anuidade', what: 'Empresas registradas com anuidade vencida no corte: não obteriam a certidão de registro e quitação exigida em licitações.', use: 'Cobrança prioritária das que têm contrato público.', ids: pay.inadimplentes })} />
    </section>
    <Bloco ctx={ctx} id="tc" area="tc" title="Três contagens, três unidades" question="Empresa-raiz, estabelecimento e registro vigentes na data de referência. Nunca se somam como sinônimos." help="Caso de uso UC01. Empresa = raiz do CNPJ com ao menos um registro ou visto vigente. Estabelecimento = CNPJ completo. Registro = episódio de registro ou visto. Inativas = raízes com histórico e nenhum registro vigente."><Contagens ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="cv" area="cv" title="Conciliação Receita × Crea-SP" question="CNPJs completos ativos com CNAE da lista, por classe e correspondência no cadastro no mesmo corte." help="Caso de uso UC02. Classe pela atividade principal (Lei 6.839/80, atividade básica): “Sim” = CNAE com registro obrigatório na lista do Crea-SP (rev. mar/2025); “Passível” = passível de obrigação. O universo inclui CNAE principal ou secundário da lista. Sem correspondência não quer dizer irregular: o CNAE não prova atividade nem obrigação."><Conciliacao ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="cg" area="cg" title="Cobertura “Sim” por regional" question="Parte dos CNPJs “Sim” de cada GRE com registro ou visto vigente, e o que está só no histórico ou sem correspondência."><CoberturaGre ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="reg" area="reg" title="Situação do registro e do pagamento" question="Empresas do universo de engenharia pelo registro no CREA-SP, e as registradas pela situação das anuidades."><Situacoes ctx={ctx} flow={flow} /></Bloco>
    <Bloco ctx={ctx} id="es" area="es" title="Entradas e saídas da base, mês a mês" question="Acima da linha zero, as entradas (após fiscalização em destaque); abaixo, as saídas. A linha mostra as empresas registradas."><EntradasSaidas ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="pt" area="pt" title="Ponte da base no período" question="De onde veio e para onde foi a variação de empresas registradas."><PonteChart ctx={ctx} ponte={ctx.ponte} /></Bloco>
    <Bloco ctx={ctx} id="mk" area="mk" title="Mercado por câmara" question="Largura: CNPJs ativos na Receita com CNAE da lista (câmara aproximada pelo CNAE principal). Altura: quanto está registrado, em dia, e quanto falta registrar."><Mekko ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="sk" area="sk" title="Funil de conformidade" question="Universo com CNAE da lista → registro ativo → responsável técnico → ART no período. Clique num fluxo para ver as empresas."><Funil ctx={ctx} flow={flow} /></Bloco>
    <Bloco ctx={ctx} id="cp" area="cp" title="Empresas registradas por câmara e porte" question="Câmara pela atividade principal; porte declarado na Receita."><CamaraPorte ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="pz" area="pz" title="Prazo de concessão do registro" question="Dias entre o pedido e o início do registro, para os registros concedidos no período."><PrazoRegistro ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mu" area="mu" title="Empresas registradas por regional, 24 meses" question="Cada quadro na sua própria escala. Verde cresce, vermelho recua. Clique para o resumo da regional."><Multiplos ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="qt" area="qt" title="Quadro técnico das empresas" question="Responsável técnico das empresas registradas e a carga de empresas por profissional." help="Acima de 3 empresas por profissional, verificar a compatibilidade de tempo e área de atuação (conferir o limite na norma vigente)."><Quadro ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ah" area="ah" title="ARTs de empresas por regional e mês" question="Últimos 12 meses, pela regional da matriz. Quedas mostram retração de atividade ou de registro de ART."><ArtRegional ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="am" area="am" title="ARTs por modalidade" question="Quantidade no período e valor de contrato declarado."><ArtModalidade ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ca" area="ca" title="Prazo da certidão de acervo operacional (CAO)" question="Dias do pedido à emissão, para as certidões emitidas; e os pedidos que aguardam." help="Certidão de acervo operacional da empresa (Resolução Confea nº 1.137/2023)."><Certidoes ctx={ctx} cao={cao} /></Bloco>
    <Bloco ctx={ctx} id="rg" area="rg" title="Responsável técnico e quitação, por regional" question="% das empresas registradas com RT identificado e % aptas à certidão de registro e quitação."><RegionalRt ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="sa" area="sa" title="Empresas registradas sem ART no período" question="Atividade não declarada ou empresa parada? Por câmara, % das registradas sem nenhuma ART."><SemArt ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="qs" area="qs" title="Rede societária: sócios pessoa jurídica" question="Sócios PJ do QSA aberto da Receita, por chave CNPJ exata: grupos de empresas ligadas por participação e sócios de fora do universo que se apresentam como engenharia. Clique num grupo para ver as empresas." help="Sócio pessoa física fica fora (CPF mascarado no QSA aberto). Participação declarada não prova controle nem que o sócio seja RT."><RedeSocietaria ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="in" area="in" title="Instalações e investimentos com agente identificado" question="ANEEL (usinas e agentes), ANP (instalações e revendas), ANM (processos com titular) e BNDES (operações), por regional, com o agente identificado por CNPJ e sua presença no cadastro." help="Contexto: o agente é operador, titular ou financiado; não é, por isso, projetista, instalador ou responsável técnico."><Instalacoes ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="dn" area="dn" title="Densidade empresarial por regional" question="Estabelecimentos elegíveis (Receita ativa, CNAE da lista) por 10 mil habitantes contra a cobertura cadastral. Tamanho: população. Clique para o resumo da regional."><Densidade ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ab" area="ab" title="Dinâmica da base: aberturas na Receita e permanência" question="Estabelecimentos com CNAE da lista abertos nos últimos 24 meses e quantos já têm registro ou visto; permanência das coortes de empresas registradas há 3, 6 e 12 meses."><Dinamica ctx={ctx} /></Bloco>
  </div>;
}

function Situacoes({ ctx, flow }: { ctx: CockpitCtx; flow: ReturnType<typeof complianceFlow> }) {
  const { tokens, model, scope } = ctx, ids = (name: string) => flow.nodes.find(node => node.name === name)?.companyIds ?? [];
  const registro = [{ name: 'Ativa', ids: ids('Registro vigente'), color: tokens.blue }, { name: 'Inativa (já registrada)', ids: ids('Só histórico'), color: tokens.heat[1] }, { name: 'Nunca registrada', ids: ids('Nunca registrada'), color: tokens.bad }];
  const pay = pagamento(model), pagamentoParts = [{ name: 'Em dia', ids: pay.emDia, color: tokens.good }, { name: 'Inadimplente', ids: pay.inadimplentes, color: tokens.warn }];
  const vistos = new Set(scope.registrations.filter(row => row.type === 'Visto' && row.status === 'Ativo').map(row => row.companyId)).size;
  const rosca = (parts: { name: string; ids: string[]; color: string }[], total: number, titulo: string) => ({
    tooltip: { trigger: 'item', formatter: (item: any) => `<b>${item.name}</b><br/>${int(item.value)} empresas · ${pct(item.percent)}<br/><span style="opacity:.75">clique para ver</span>` },
    title: { text: int(total), subtext: titulo, left: 'center', top: '33%', textStyle: { color: tokens.ink, fontSize: 19, fontWeight: 800, fontFamily: 'Raleway, Lato, sans-serif' }, subtextStyle: { color: tokens.muted, fontSize: 10.5 } },
    legend: { bottom: 0, left: 'center', itemWidth: 9, itemHeight: 9, itemGap: 8, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    series: [{ type: 'pie', radius: ['52%', '76%'], center: ['50%', '42%'], padAngle: 2, itemStyle: { borderRadius: 4, borderColor: tokens.surface, borderWidth: 2 }, label: { show: false },
      data: parts.map(part => ({ name: part.name, value: part.ids.length, itemStyle: { color: part.color } })) }],
  });
  const abrir = (parts: { name: string; ids: string[] }[], titulo: string) => (params: any) => { const part = parts[params.dataIndex]; if (part?.ids.length) ctx.open({ kind: 'empresas', title: `${titulo} · ${part.name.toLowerCase()}`, what: 'Empresas (CNPJ raiz) nesta situação no corte.', ids: part.ids }); };
  return <div className="duo">
    <Chart option={rosca(registro, registro.reduce((sum, part) => sum + part.ids.length, 0), 'empresas de engenharia')} tokens={tokens} label="Empresas por situação do registro" onPick={abrir(registro, 'Situação do registro')} />
    <Chart option={rosca(pagamentoParts, pay.emDia.length + pay.inadimplentes.length, 'empresas registradas')} tokens={tokens} label="Empresas registradas por situação de pagamento" onPick={abrir(pagamentoParts, 'Situação de pagamento')} />
    <p className="duo-note">{int(vistos)} empresas com visto de outro CREA ativo · {int(ctx.ponte.saidas.length)} saídas no período</p>
  </div>;
}

function EntradasSaidas({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, janela } = ctx, rows = useMemo(() => entradasSaidas(ctx.history, ctx.f), [ctx.history, ctx.f]);
  const option = useMemo(() => ({
    grid: { top: 30, right: 6, bottom: 2, left: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex], entradas = row.viaFiscalizacao.length + row.demais.length;
      return `<b>${mes(row.month)}</b><br/>Entradas: ${int(entradas)} (${int(row.viaFiscalizacao.length)} após fiscalização)<br/>Saídas: ${int(row.saidas.length)}<br/>Saldo: <b>${entradas - row.saidas.length >= 0 ? '+' : ''}${int(entradas - row.saidas.length)}</b><br/>Empresas registradas: ${int(row.base)}<br/><span style="opacity:.75">clique para ver as empresas</span>`; } },
    xAxis: { type: 'category', data: rows.map(row => mes(row.month)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, interval: 2, fontSize: 10 } },
    yAxis: [{ type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: (value: number) => int(Math.abs(value)) } },
      { type: 'value', scale: true, splitLine: { show: false }, axisLabel: { color: tokens.muted, formatter: (value: number) => value.toLocaleString('pt-BR', { notation: 'compact' }) } }],
    series: [
      { name: 'Entradas após fiscalização', type: 'bar', stack: 'mov', barWidth: '58%', data: rows.map(row => row.viaFiscalizacao.length), itemStyle: { color: tokens.accent },
        markArea: { silent: true, itemStyle: { color: tokens.blue, opacity: 0.07 }, data: [[{ xAxis: mes(janela.start.slice(0, 7)) }, { xAxis: mes(janela.end.slice(0, 7)) }]] } },
      { name: 'Demais entradas', type: 'bar', stack: 'mov', data: rows.map(row => row.demais.length), itemStyle: { color: tokens.blue, borderRadius: [3, 3, 0, 0] } },
      { name: 'Saídas', type: 'bar', stack: 'mov', data: rows.map(row => -row.saidas.length), itemStyle: { color: tokens.bad, borderRadius: [0, 0, 3, 3] } },
      { name: 'Empresas registradas', type: 'line', yAxisIndex: 1, data: rows.map(row => row.base), smooth: 0.3, symbol: 'none', lineStyle: { color: tokens.ink, width: 2 }, itemStyle: { color: tokens.ink } },
    ],
  }), [rows, tokens, janela]);
  return <Chart option={option} tokens={tokens} label="Entradas e saídas de empresas por mês" onPick={params => { const row = rows[params.dataIndex]; if (!row) return;
    const saidas = params.seriesName === 'Saídas', ids = saidas ? row.saidas : params.seriesName === 'Entradas após fiscalização' ? row.viaFiscalizacao : [...row.viaFiscalizacao, ...row.demais];
    if (ids.length) ctx.open({ kind: 'empresas', title: `${saidas ? 'Saídas' : 'Entradas'} em ${mes(row.month)}`, what: saidas ? 'Empresas cujo registro deixou de estar ativo no mês (baixa ou cancelamento).' : 'Empresas que passaram a ter registro ativo no mês.', ids }); }} />;
}

function Funil({ ctx, flow }: { ctx: CockpitCtx; flow: ReturnType<typeof complianceFlow> }) {
  const { tokens } = ctx, total = flow.nodes[0]?.value || 1;
  const nomes: Record<string, string> = { 'Universo empresarial': 'Universo de engenharia', 'Registro vigente': 'Registro ativo', 'Só histórico': 'Registro inativo', 'Nunca registrada': 'Nunca registrada', 'Com RT': 'Com RT', 'RT não identificado': 'Sem RT identificado', 'Com ART no período': 'Com ART no período', 'Sem ART no período': 'Sem ART no período' };
  const cores: Record<string, string> = { 'Universo empresarial': tokens.brand, 'Registro vigente': tokens.blue, 'Só histórico': tokens.heat[1], 'Nunca registrada': tokens.bad, 'Com RT': tokens.good, 'RT não identificado': tokens.warn, 'Com ART no período': tokens.cat[4], 'Sem ART no período': tokens.muted };
  const option = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (item: any) => item.dataType === 'edge' ? `${nomes[item.data.source]} → ${nomes[item.data.target]}<br/><b>${int(item.data.value)}</b> empresas (${pct(item.data.value / total * 100)} do universo)` : `<b>${nomes[item.name]}</b><br/>${int(item.value)} empresas · ${pct(item.value / total * 100)}` },
    series: [{ type: 'sankey', nodeAlign: 'left', left: 4, right: 128, top: 6, bottom: 6, nodeWidth: 12, nodeGap: 10, draggable: false, emphasis: { focus: 'adjacency' },
      data: flow.nodes.map(node => ({ name: node.name, value: node.value, itemStyle: { color: cores[node.name] ?? tokens.blue, borderWidth: 0 } })), links: flow.links.map(link => ({ ...link })),
      lineStyle: { color: 'gradient', opacity: 0.28, curveness: 0.5 },
      label: { color: tokens.ink, fontSize: 10.5, formatter: (item: any) => `{n|${nomes[item.name] ?? item.name}}\n{v|${int(item.value)} · ${pct(item.value / total * 100)}}`, rich: { n: { fontWeight: 700, color: tokens.ink, fontSize: 10.5 }, v: { color: tokens.muted, fontSize: 10 } } } }],
  }), [flow, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Funil de conformidade das empresas" onPick={item => { const ids = item.dataType === 'edge' ? item.data.companyIds : flow.nodes.find(node => node.name === item.name)?.companyIds;
    if (ids?.length) ctx.open({ kind: 'empresas', title: item.dataType === 'edge' ? `${nomes[item.data.source]} → ${nomes[item.data.target]}` : nomes[item.name], what: 'Empresas (CNPJ raiz) nesta etapa do funil de conformidade.', ids }); }} />;
}

function CamaraPorte({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => camaraPorte(ctx.dataset, ctx.model), [ctx.dataset, ctx.model]), cores = [tokens.heat[1], tokens.blue, tokens.brand, tokens.accent];
  const option = useMemo(() => ({
    grid: { top: 26, right: 30, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => row.camara), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: (rows[0]?.portes ?? []).map((item, index) => ({ name: item.porte.replace(' empresa', ''), type: 'bar', stack: 'p', barWidth: 16, data: rows.map(row => row.portes[index].ids.length), itemStyle: { color: cores[index], borderColor: tokens.surface, borderWidth: 1 },
      label: index === 3 ? { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (params: any) => int(rows[params.dataIndex].portes.reduce((sum, part) => sum + part.ids.length, 0)) } : undefined })),
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Empresas registradas por câmara e porte" onPick={params => { const row = rows[params.dataIndex], part = row?.portes[params.seriesIndex];
    if (part?.ids.length) ctx.open({ kind: 'empresas', title: `${row.camara} · ${part.porte.toLowerCase()}`, what: 'Empresas registradas desta câmara (atividade principal) e porte.', ids: part.ids }); }} />;
}

function PrazoRegistro({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, prazo = useMemo(() => prazoRegistro(ctx.scope, ctx.period), [ctx.scope, ctx.period]);
  const option = useMemo(() => ({
    grid: { top: 12, right: 6, bottom: 24, left: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>${items[0].name} dias</b><br/>${int(items[0].value)} registros concedidos` },
    xAxis: { type: 'category', data: prazo.faixas.map(item => item.nome), name: 'dias entre pedido e registro', nameLocation: 'middle', nameGap: 22, nameTextStyle: { color: tokens.muted, fontSize: 10 }, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
    series: [{ type: 'bar', barWidth: '64%', data: prazo.faixas.map((item, index) => ({ value: item.ids.length, itemStyle: { borderRadius: [4, 4, 0, 0], color: index <= 2 ? tokens.good : index <= 4 ? tokens.accent : tokens.bad } })), label: { show: true, position: 'top', color: tokens.ink, fontSize: 10 } }],
  }), [prazo, tokens]);
  return <div className="stack">
    <p className="kpi-line"><b>{prazo.mediana === null ? '—' : `${int(prazo.mediana)} dias`}</b> de mediana · 90% em até <b>{prazo.p90 === null ? '—' : `${int(prazo.p90)} dias`}</b> · {int(prazo.total)} registros no período</p>
    <Chart option={option} tokens={tokens} label="Distribuição do prazo de concessão do registro" onPick={params => { const item = prazo.faixas[params.dataIndex]; if (item?.ids.length) ctx.open({ kind: 'empresas', title: `Registros concedidos em ${item.nome} dias`, what: 'Empresas cujo registro começou no período, pelo prazo entre o pedido e a concessão.', ids: item.ids }); }} />
  </div>;
}

function Multiplos({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx;
  return <div className="multiples">{[...ctx.linhas].sort((a, b) => b.base - a.base).map(row => { const first = row.spark[0] ?? 0, last = row.spark.at(-1) ?? 0, delta = first ? (last - first) / first * 100 : null;
    return <button key={row.id} className={`multiple ${ctx.greId === row.id ? 'is-selected' : ''}`} onClick={() => ctx.open({ kind: 'gre', id: row.id })} title={`${row.name}: resumo da regional`}>
      <span><b>{row.curto}</b><em className={delta === null ? '' : delta >= 0 ? 'pos' : 'neg'}>{delta === null ? '—' : `${delta >= 0 ? '+' : ''}${pct(delta)}`}</em></span>
      <Spark values={row.spark} color={last >= first ? tokens.good : tokens.bad} /><small>{int(last)} empresas</small></button>; })}</div>;
}

function Contagens({ ctx }: { ctx: CockpitCtx }) {
  const c = ctx.norte.contagens;
  const itens: [string, number, string][] = [['Empresas (raiz CNPJ)', c.raizes, 'com ao menos um registro ou visto vigente'], ['Estabelecimentos (CNPJ completo)', c.estabelecimentos, 'com registro ou visto vigente'], ['Registros e vistos vigentes', c.registros, `${int(c.vistos)} vistos de outro CREA`]];
  return <div className="tres">
    {itens.map(([label, value, note]) => <div key={label} className="tres-item"><span>{label}</span><strong>{int(value)}</strong><small>{note}</small></div>)}
    <p className="duo-note">{int(c.raizesHistorico)} empresas só com histórico (inativas) · data de referência {data(ctx.dataset.snapshotDate)}</p>
  </div>;
}

function Conciliacao({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, c = ctx.norte.cobertura, cores = [tokens.blue, tokens.heat[1], tokens.warn];
  const option = useMemo(() => ({
    grid: { top: 26, right: 40, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const classe = classesCnae[items[0].dataIndex], total = correspondencias.reduce((sum, nome) => sum + c.porClasse[classe][nome].length, 0);
      return `<b>“${classe}”</b> · ${int(total)} CNPJs<br/>${items.map(item => `${item.marker}${item.seriesName}: ${int(item.value)} (${pct(item.value / Math.max(1, total) * 100)})`).join('<br/>')}`; } },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
    yAxis: { type: 'category', inverse: true, data: classesCnae.map(row => `“${row}”`), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: correspondencias.map((nome, index) => ({ name: nome, type: 'bar', stack: 'c', barWidth: 22, data: classesCnae.map(classe => c.porClasse[classe][nome].length), itemStyle: { color: cores[index], borderColor: tokens.surface, borderWidth: 1 },
      label: index === correspondencias.length - 1 ? { show: true, position: 'right', color: tokens.ink, fontSize: 10.5, formatter: (params: any) => { const classe = classesCnae[params.dataIndex]; const taxa = classe === 'Sim' ? c.taxaSim : c.taxaPassivel; return taxa === null ? '' : pct(taxa, 1); } } : undefined })),
  }), [c, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="stack">
    <p className="kpi-line"><b>{c.taxa === null ? '—' : pct(c.taxa, 1)}</b> de cobertura em {int(c.total)} CNPJs · “Sim” <b>{c.taxaSim === null ? '—' : pct(c.taxaSim, 1)}</b> · “Passível” <b>{c.taxaPassivel === null ? '—' : pct(c.taxaPassivel, 1)}</b> · Receita e cadastro em {data(c.competenciaReceita)}</p>
    <Chart option={option} tokens={tokens} label="Conciliação dos CNPJs com CNAE da lista com o cadastro do Crea-SP" onPick={params => { const classe = classesCnae[params.dataIndex], nome = correspondencias[params.seriesIndex]; const ids = classe && nome ? c.porClasse[classe][nome] : [];
      if (ids.length) ctx.open({ kind: 'cnpjs', title: `“${classe}” · ${nome.toLowerCase()}`, what: 'CNPJs completos ativos na Receita com CNAE da lista do Crea-SP nesta classe e correspondência.', use: nome === 'Sem correspondência' ? 'Sem correspondência não quer dizer irregular. Confirmar atividade antes de orientar ou notificar.' : undefined, ids }); }} />
  </div>;
}

function CoberturaGre({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => [...ctx.norte.cobertura.porGre].sort((a, b) => (a.taxaSim ?? 0) - (b.taxaSim ?? 0)), [ctx.norte]), cores = [tokens.blue, tokens.heat[1], tokens.warn];
  const short = (name: string) => name.split('·')[1]?.trim() ?? name;
  const option = useMemo(() => ({
    grid: { top: 24, right: 36, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: tokens.muted, fontSize: 10 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', max: 100, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: '{value}%' } },
    yAxis: { type: 'category', data: rows.map(row => short(row.name)), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10 } },
    series: correspondencias.map((nome, index) => ({ name: nome, type: 'bar', stack: 'g', barWidth: 10, data: rows.map(row => { const total = correspondencias.reduce((sum, item) => sum + row.sim[item].length, 0); return total ? Math.round(row.sim[nome].length / total * 1000) / 10 : 0; }),
      itemStyle: { color: cores[index] }, label: index === 0 ? { show: true, position: 'insideLeft', color: '#FFFFFF', fontSize: 9.5, formatter: (params: any) => params.value >= 12 ? `${params.value.toLocaleString('pt-BR')}%` : '' } : undefined })),
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Cobertura dos CNPJs “Sim” por regional" onPick={params => { const row = rows[params.dataIndex]; if (row) ctx.open({ kind: 'gre', id: row.id }); }} />;
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

/* ---------- V21 · frentes com fonte automática e medidas do levantamento ---------- */
function RedeSocietaria({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.frentes.sociedades, grupos = useMemo(() => q.grupos.slice().sort((a, b) => b.empresas.length - a.empresas.length || a.id.localeCompare(b.id)).slice(0, 10), [q]);
  const option = useMemo(() => ({
    grid: { top: 6, right: 40, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = grupos[items[0].dataIndex]; return `<b>Grupo ${row.id}</b><br/>${int(row.empresas.length)} empresas do universo, ${int(row.registradas)} registradas<br/>${int(row.externos)} sócios PJ de fora (${int(row.externosEngenharia)} com CNAE da lista)`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: grupos.map(row => `Grupo ${row.id}`), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: [
      { type: 'bar', name: 'Registradas', stack: 'g', barWidth: 12, data: grupos.map(row => row.registradas), itemStyle: { color: tokens.good } },
      { type: 'bar', name: 'Sem registro vigente', stack: 'g', data: grupos.map(row => row.empresas.length - row.registradas), itemStyle: { color: tokens.warn, borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (params: any) => int(grupos[params.dataIndex].empresas.length) } },
    ],
  }), [grupos, tokens]);
  return <div className="split">
    <div className="stack">
      <p className="kpi-line"><b>{int(q.empresasComSocioPj.length)}</b> empresas com sócio PJ · <b>{int(q.sociosInternos)}</b> sócios do universo e <b>{int(q.sociosExternos)}</b> de fora · <b>{int(q.gruposMultiplos)}</b> grupos com duas ou mais empresas (maior: {int(q.maiorGrupo)})</p>
      <Chart option={option} tokens={tokens} label="Maiores grupos societários por número de empresas" onPick={params => { const row = grupos[params.dataIndex]; if (row) ctx.open({ kind: 'empresas', title: `Grupo societário ${row.id}`, what: 'Empresas do universo ligadas por participação societária de pessoa jurídica (QSA aberto, chave CNPJ exata).', use: 'Contexto: a ligação é societária, não técnica. Ver o registro e o RT de cada empresa antes de qualquer leitura.', ids: row.empresas }); }} />
    </div>
    <ul className="side-list" aria-label="Sócios PJ de engenharia">
      <li><button onClick={() => q.investidasRegistradasComSocioEngenhariaSemRegistro.length && ctx.open({ kind: 'empresas', title: 'Registradas com sócio PJ de engenharia sem registro', what: 'Empresas registradas cujo sócio PJ, de fora do universo, tem CNAE da lista do Crea-SP e nenhum registro localizado.', use: 'Contexto para a malha fina (regra sócio PJ): o sócio pode não exercer a atividade.', ids: q.investidasRegistradasComSocioEngenhariaSemRegistro })}><i style={{ background: tokens.warn }} /><span>Registradas com sócio PJ de engenharia sem registro</span><b>{int(q.investidasRegistradasComSocioEngenhariaSemRegistro.length)}</b></button></li>
      <li><button disabled><i style={{ background: tokens.muted }} /><span>Sócios PJ de fora com CNAE da lista</span><b>{int(q.externosEngenharia.length)}</b></button></li>
      <li className="side-note">QSA aberto da Receita (mensal). Sócio PF depende de acordo (CPF completo).</li>
    </ul>
  </div>;
}

function Instalacoes({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.frentes.instalacoes, gres = useMemo(() => new Map(ctx.dataset.gres.map(row => [row.id, short(row.name)])), [ctx.dataset]);
  const rows = useMemo(() => q.porGre.slice().sort((a, b) => b.n - a.n), [q]), cores: Record<FonteInstalacao, string> = { ANEEL: tokens.accent, ANP: tokens.blue, ANM: tokens.heat[1], BNDES: tokens.brand };
  const option = useMemo(() => ({
    grid: { top: 24, right: 8, bottom: 2, left: 2, containLabel: true }, legend: { top: 0, left: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: rows.map(row => gres.get(row.greId) ?? row.greId), axisLabel: { color: tokens.muted, fontSize: 10, interval: 0, rotate: 30 }, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    series: fontesInstalacao.map(fonte => ({ type: 'bar', name: fonte, stack: 'f', barWidth: 16, data: rows.map(row => row.porFonte[fonte]), itemStyle: { color: cores[fonte] } })),
  }), [rows, gres, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="split is-wide">
    <div className="stack">
      <p className="kpi-line"><b>{int(q.instalacoes.length)}</b> instalações e operações com agente identificado por CNPJ · <b>{int(q.novas12)}</b> novas nos últimos 12 meses ({q.novasAntes ? `${q.novas12 >= q.novasAntes ? '+' : ''}${pct((q.novas12 - q.novasAntes) / q.novasAntes * 100)} vs. 12 meses anteriores` : 'sem base anterior'})</p>
      <Chart option={option} tokens={tokens} label="Instalações e investimentos por regional e fonte" onPick={params => { const row = rows[params.dataIndex]; if (row) ctx.filterGre(row.greId); }} />
    </div>
    <ul className="side-list" aria-label="Por fonte">
      {q.porFonte.map(row => <li key={row.fonte}><button disabled><i style={{ background: cores[row.fonte] }} /><span>{row.fonte} · {int(row.n)} registros<br /><small>{int(row.agentesNoUniverso)} agentes no universo, {int(row.agentesRegistrados)} registrados</small></span><b>{row.fonte === 'BNDES' ? brl(row.valor) : `${row.valor.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })} ${row.unidade}`}</b></button></li>)}
      <li className="side-note">Agente = operador, titular ou financiado, por CNPJ exato. Não é prova de projeto, instalação ou RT.</li>
    </ul>
  </div>;
}

function Densidade({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = ctx.mercado.densidade.filter(row => row.densidade !== null && row.cobertura !== null);
  const option = useMemo(() => {
    if (!rows.length) return {};
    const xs = rows.map(row => row.densidade!), ys = rows.map(row => row.cobertura!);
    return {
      grid: { top: 12, right: 22, bottom: 34, left: 8, containLabel: true },
      tooltip: { formatter: (item: any) => `<b>${item.data.name}</b><br/>${item.value[0].toLocaleString('pt-BR', { maximumFractionDigits: 1 })} estabelecimentos elegíveis por 10 mil hab.<br/>Cobertura: ${pct(item.value[1], 1)}<br/>População: ${int(item.value[2])} · elegíveis: ${int(item.data.elegiveis)}` },
      xAxis: { type: 'log', logBase: 10, name: 'estabelecimentos elegíveis por 10 mil habitantes (escala log)', nameLocation: 'middle', nameGap: 22, nameTextStyle: { color: tokens.muted, fontSize: 10 }, min: Math.max(0.1, Math.round(Math.min(...xs) / 1.5 * 10) / 10), max: 10 ** Math.ceil(Math.log10(Math.max(...xs) * 1.2)), splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
      yAxis: { type: 'value', min: Math.floor((Math.min(...ys) - 2) / 5) * 5, max: Math.ceil((Math.max(...ys) + 2) / 5) * 5, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: '{value}%' } },
      series: [{ type: 'scatter', data: rows.map(row => ({ name: short(row.name), id: row.greId, elegiveis: row.elegiveis, value: [row.densidade, row.cobertura, row.populacao], itemStyle: { color: tokens.blue, opacity: 0.8, borderColor: tokens.surface, borderWidth: 1.5 } })),
        symbolSize: (value: number[]) => Math.max(8, Math.sqrt(value[2] / 1000) * 1.1), label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (item: any) => item.data.name }, labelLayout: { hideOverlap: true } }],
    };
  }, [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Densidade de estabelecimentos elegíveis contra cobertura cadastral por regional" onPick={item => item.data?.id && ctx.open({ kind: 'gre', id: item.data.id })} />;
}

function Dinamica({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, a = ctx.mercado.aberturas, coortes = ctx.mercado.permanencia;
  const option = useMemo(() => ({
    grid: { top: 24, right: 8, bottom: 2, left: 2, containLabel: true }, legend: { top: 0, left: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = a.meses[items[0].dataIndex]; return `<b>${mes(row.month)}</b><br/>${int(row.aberturas)} estabelecimentos abertos com CNAE da lista<br/>${int(row.comRegistro)} já com registro ou visto em D`; } },
    xAxis: { type: 'category', data: a.meses.map(row => mes(row.month)), axisLabel: { color: tokens.muted, fontSize: 10, interval: 2 }, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    series: [
      { type: 'bar', name: 'Já registrados', stack: 'a', barWidth: 10, data: a.meses.map(row => row.comRegistro), itemStyle: { color: tokens.good } },
      { type: 'bar', name: 'Sem registro em D', stack: 'a', data: a.meses.map(row => row.aberturas - row.comRegistro), itemStyle: { color: tokens.soft, borderColor: tokens.line, borderWidth: 1 } },
    ],
  }), [a, tokens]);
  return <div className="split is-wide">
    <div className="stack">
      <p className="kpi-line"><b>{int(a.total)}</b> estabelecimentos com CNAE da lista abertos em 24 meses · <b>{int(a.comRegistro)}</b> já registrados ({a.total ? pct(a.comRegistro / a.total * 100) : '—'}) · <b>{int(a.foraDeAtividade)}</b> elegíveis baixados, inaptos ou suspensos na fotografia</p>
      <Chart option={option} tokens={tokens} label="Estabelecimentos abertos na Receita por mês e situação no cadastro" onPick={() => a.ids.length && ctx.open({ kind: 'cnpjs', title: 'Abertos na Receita em 24 meses', what: 'Estabelecimentos com CNAE da lista do Crea-SP abertos nos últimos 24 meses antes da data de referência (data de abertura da Receita).', use: 'Aberturas são mercado novo; a correspondência no cadastro é uma decomposição, não um filtro. Sem registro não quer dizer irregular.', ids: a.ids })} />
    </div>
    <ul className="side-list" aria-label="Permanência das coortes">
      {coortes.map(row => <li key={row.mesesAtras}><button onClick={() => row.saidas.length && ctx.open({ kind: 'empresas', title: `Saíram da base em ${row.mesesAtras} meses`, what: `Empresas com registro ou visto vigente em ${data(row.d0)} e sem registro vigente na data de referência.`, use: 'Perda de vínculo institucional; cadastro vigente não prova atividade e a saída não tem causa atribuída.', ids: row.saidas })}><i style={{ background: row.taxa !== null && row.taxa >= 90 ? tokens.good : tokens.warn }} /><span>Coorte de {row.mesesAtras} meses ({data(row.d0)})<br /><small>{int(row.permanecem.length)} de {int(row.coorte.length)} permanecem · {int(row.saidas.length)} saíram</small></span><b>{row.taxa === null ? '—' : pct(row.taxa, 1)}</b></button></li>)}
      <li className="side-note">Coorte fixa de raízes vigentes em D − n meses; quem entrou depois não conta. Aberturas: fotografia mensal da Receita, com defasagem.</li>
    </ul>
  </div>;
}
