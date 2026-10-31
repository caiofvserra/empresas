import { useMemo } from 'react';
import { complianceFlow } from '../gestao-v14/metrics';
import { Chart, Spark } from '../painel/chart';
import { Mekko, PonteChart } from '../painel/VisaoCadastro';
import { data, int, mes, pct } from '../painel/ui';
import { classesCnae, correspondencias } from '../observatorio/norte';
import type { CockpitCtx } from './contexto';
import { camaraPorte, entradasSaidas, pagamento, prazoRegistro } from './medidas';
import { Bloco } from './ui';

/**
 * Aba 2 · Empresas e cobertura (painel da onda 1, evolução do Cadastro da V18): três contagens que não se somam, conciliação
 * Receita × Crea-SP com “Sim” e “Passível” separados, cobertura por regional, situação, entradas e saídas, prazo de registro e regionais.
 */
export default function PaginaCadastro({ ctx }: { ctx: CockpitCtx }) {
  const { model, scope, tokens } = ctx;
  const flow = useMemo(() => complianceFlow(model, scope), [model, scope]);
  return <div className="ck-grid ck-grid-cadastro">
    <Bloco ctx={ctx} id="tc" area="tc" title="Três contagens, três unidades" question="Empresa-raiz, estabelecimento e registro vigentes no corte. Nunca se somam como sinônimos." help="Caso de uso UC01. Empresa = raiz do CNPJ com ao menos um registro ou visto vigente. Estabelecimento = CNPJ completo. Registro = episódio de registro ou visto. Inativas = raízes com histórico e nenhum registro vigente."><Contagens ctx={ctx} /></Bloco>
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
    <p className="duo-note">{int(c.raizesHistorico)} empresas só com histórico (inativas) · corte {data(ctx.dataset.snapshotDate)}</p>
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
