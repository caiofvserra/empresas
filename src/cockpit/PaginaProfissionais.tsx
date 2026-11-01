import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { int, mes, money, pct, short } from '../painel/ui';
import { faixasIdade, situacaoEm } from '../domain/profissionais';
import type { Grupo, Profissional } from '../domain/profissionais';
import type { CockpitCtx } from './contexto';
import { pisoLegal as piso } from './publico';
import { Bloco, Indicador, linhasProfissionais, proporcao } from './ui';

/**
 * Aba 3 · Profissionais, com a mesma profundidade de Empresas: situação, modalidade, nível, regional, idade e gênero, carga de
 * responsabilidade técnica, ARTs por autor e, em agregado por CBO, emprego formal e remuneração contra duas leituras do piso.
 * Tudo lido na data de referência. Emprego e salário ficam em agregado até o acordo com o MTE.
 */
const change = (now: number, before: number) => before > 0 ? (now - before) / before * 100 : null;

export default function PaginaProfissionais({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, metas, period } = ctx, p = ctx.profissionais.resumo;
  const ativosAntes = p.porNivel.reduce((sum, row) => sum + row.antes, 0);
  const abrir = (titulo: string, rows: Profissional[], what: string, use?: string) => { if (rows.length) ctx.open({ kind: 'linhas', title: titulo, what, use, listTitle: 'Profissionais', rows: linhasProfissionais(ctx, rows, row => ({ value: situacaoEm(row, ctx.anchor) ?? '—', note: `registro em ${row.registroEm.split('-').reverse().join('/')}`, sort: -Date.parse(row.registroEm) })) }); };
  return <div className="ck-grid ck-grid-profissionais">
    <section className="ck-cards is-six" style={{ gridArea: 'kpi' }} aria-label="Indicadores dos profissionais">
      <Indicador destaque ficha="k-ativos" ctx={ctx} label="Profissionais com registro ativo" value={int(p.ativos.length)} variacao={{ value: change(p.ativos.length, ativosAntes), label: 'vs. um ano antes' }} sub={`${int(p.interrompidos.length)} interrompidos · ${int(p.cancelados.length)} cancelados`} onOpen={() => abrir('Profissionais com registro ativo', p.ativos, 'Profissionais com registro ativo na data de referência.')} />
      <Indicador ficha="k-novos" ctx={ctx} label="Registros novos" value={int(p.novos.length)} variacao={{ value: change(p.novos.length, p.novosAntes) }} spark={p.mensal.map(row => row.novos)} cor={tokens.blue} sub={`${int(Math.round(p.novos.length / period))} por mês no período`} onOpen={() => abrir('Registros profissionais novos no período', p.novos, 'Profissionais cujo registro tem data dentro do período.')} />
      <Indicador ficha="k-saidas" ctx={ctx} label="Cancelamentos e interrupções" value={int(p.cancelamentos.length + p.interrupcoes)} variacao={{ value: change(p.cancelamentos.length, p.cancelamentosAntes), goodUp: false, label: 'cancelamentos vs. ano anterior' }} spark={p.mensal.map(row => row.cancelamentos)} cor={tokens.bad} sub={`${int(p.cancelamentos.length)} cancelamentos · ${int(p.interrupcoes)} interrupções`} onOpen={() => abrir('Cancelamentos no período', p.cancelamentos, 'Profissionais com registro cancelado no período.')} />
      <Indicador ficha="k-adimplencia" ctx={ctx} label="Anuidade em dia" value={p.taxaAdimplencia === null ? '—' : pct(p.taxaAdimplencia)} meta={{ atual: p.taxaAdimplencia, alvo: metas.adimplencia }} variacao={{ value: p.taxaAdimplencia === null ? null : p.taxaAdimplencia - metas.adimplencia, kind: 'pp', label: `vs. meta de ${metas.adimplencia}%` }} sub={`${int(p.inadimplentes.length)} ativos inadimplentes`} onOpen={() => abrir('Profissionais ativos com anuidade vencida', p.inadimplentes, 'Profissionais ativos com anuidade vencida na data de referência.', 'Cobrança por lote, começando pelos que têm ART recente.')} />
      <Indicador ficha="k-perfil" ctx={ctx} label="Mulheres e idade mediana" value={p.mulheres === null ? '—' : pct(p.mulheres, 1)} sub={`${int(p.porGenero[0]?.ids.length ?? 0)} mulheres entre os ativos · idade mediana de ${p.idadeMediana === null ? '—' : int(p.idadeMediana)} anos`} />
      <Indicador ficha="k-arts" ctx={ctx} label="ARTs por autor no período" value={int(p.arts.length)} variacao={{ value: change(p.arts.length, p.artsAntes) }} spark={p.mensal.map(row => row.arts)} cor={tokens.accent} sub={`${proporcao(p.autores, p.ativos.length)} dos ativos registraram ao menos uma`} />
    </section>
    <Bloco ctx={ctx} id="pm" area="pm" title="Ativos por modalidade" question="Profissionais com registro ativo em cada modalidade e a variação contra um ano antes."><Grupos ctx={ctx} grupos={p.porModalidade} abrir={abrir} rotulo="modalidade" /></Bloco>
    <Bloco ctx={ctx} id="pi" area="pi" title="Idade e gênero dos ativos" question="Pirâmide por faixa etária: mulheres à esquerda, homens à direita. Antecipa a reposição do quadro técnico."><Piramide ctx={ctx} abrir={abrir} /></Bloco>
    <Bloco ctx={ctx} id="pg" area="pg" title="Ativos por regional" question="Pela GRE do endereço profissional; a variação compara com um ano antes."><Grupos ctx={ctx} grupos={p.porGre} abrir={abrir} rotulo="regional" curto /></Bloco>
    <Bloco ctx={ctx} id="pn" area="pn" title="Ativos por nível" question="Engenheiros, tecnólogos e técnicos com registro no Crea-SP."><Niveis ctx={ctx} abrir={abrir} /></Bloco>
    <Bloco ctx={ctx} id="pr" area="pr" title="Carga de responsabilidade técnica" question="Empresas por responsável técnico com vínculo vigente. Acima de 3, verificar compatibilidade de tempo e área."><CargaRt ctx={ctx} abrir={abrir} /></Bloco>
    <Bloco ctx={ctx} id="pa" area="pa" title="Concentração das ARTs por autor" question="Ativos por faixa de ARTs no período e os autores com mais ARTs. Volume alto não é indício por si; a malha fina trata o padrão anormal."><Concentracao ctx={ctx} abrir={abrir} /></Bloco>
    <Bloco ctx={ctx} id="pe" area="pe" title="Emprego formal em ocupações de engenharia" question="Estoque CLT no último mês disponível e saldo de 12 meses, por CBO, em agregado (Novo CAGED e RAIS). Inclui ocupações com rótulo “analista”." ><Emprego ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ps" area="ps" title="Remuneração mediana × piso" question="Salário mediano por CBO contra o piso exigível (base congelada pelo STF) e a leitura do Confea, ambos para 8 h. Agregado e descritivo."><Remuneracao ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="pt" area="pt" title="Registros, cancelamentos e ARTs por mês" question="Contagens mensais pela data do evento, no período."><Mensal ctx={ctx} /></Bloco>
  </div>;
}

type Abrir = (titulo: string, rows: Profissional[], what: string, use?: string) => void;
const porIds = (ctx: CockpitCtx, ids: string[]) => ids.map(id => ctx.profissionais.modelo.porId.get(id)).filter((row): row is Profissional => Boolean(row));

function Grupos({ ctx, grupos, abrir, rotulo, curto }: { ctx: CockpitCtx; grupos: Grupo[]; abrir: Abrir; rotulo: string; curto?: boolean }) {
  const { tokens } = ctx, rows = useMemo(() => [...grupos].sort((a, b) => b.ids.length - a.ids.length), [grupos]);
  const option = useMemo(() => ({
    grid: { top: 4, right: 96, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex], delta = change(row.ids.length, row.antes); return `<b>${row.nome}</b><br/>${int(row.ids.length)} ativos${delta === null ? '' : ` · ${delta >= 0 ? '+' : ''}${pct(delta)} vs. um ano antes`}<br/><span style="opacity:.75">clique para ver</span>`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => curto ? short(row.nome) : row.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5, interval: 0 } },
    series: [{ type: 'bar', barWidth: rows.length > 10 ? 11 : 14, data: rows.map(row => row.ids.length), itemStyle: { color: tokens.blue, borderRadius: [0, 4, 4, 0] }, showBackground: true, backgroundStyle: { color: tokens.soft, borderRadius: 4 },
      label: { show: true, position: 'right', fontSize: 10, formatter: (params: any) => { const row = rows[params.dataIndex], delta = change(row.ids.length, row.antes); return `{n|${int(row.ids.length)}} {${delta === null ? 'n' : delta >= 0 ? 'g' : 'r'}|${delta === null ? '' : `${delta >= 0 ? '+' : ''}${pct(delta)}`}}`; },
        rich: { n: { color: tokens.ink, fontWeight: 700, fontSize: 10 }, g: { color: tokens.good, fontWeight: 700, fontSize: 9.5 }, r: { color: tokens.bad, fontWeight: 700, fontSize: 9.5 } } } }],
  }), [rows, tokens, curto]);
  return <Chart option={option} tokens={tokens} label={`Profissionais ativos por ${rotulo}`} onPick={params => { const row = rows[params.dataIndex]; if (row) abrir(`${row.nome} · ativos`, porIds(ctx, row.ids), `Profissionais com registro ativo nesta ${rotulo}.`); }} />;
}

function Niveis({ ctx, abrir }: { ctx: CockpitCtx; abrir: Abrir }) {
  const { tokens } = ctx, rows = ctx.profissionais.resumo.porNivel, total = rows.reduce((sum, row) => sum + row.ids.length, 0), cores = [tokens.brand, tokens.blue, tokens.heat[1]];
  const option = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (item: any) => `<b>${item.name}</b><br/>${int(item.value)} ativos · ${pct(item.percent)}<br/><span style="opacity:.75">clique para ver</span>` },
    title: { text: int(total), subtext: 'ativos', left: 'center', top: '36%', textStyle: { color: tokens.ink, fontSize: 19, fontWeight: 800, fontFamily: 'Raleway, Lato, sans-serif' }, subtextStyle: { color: tokens.muted, fontSize: 10.5 } },
    legend: { bottom: 0, left: 'center', itemWidth: 9, itemHeight: 9, itemGap: 8, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    series: [{ type: 'pie', radius: ['52%', '76%'], center: ['50%', '44%'], padAngle: 2, itemStyle: { borderRadius: 4, borderColor: tokens.surface, borderWidth: 2 }, label: { show: false },
      data: rows.map((row, index) => ({ name: row.nome, value: row.ids.length, itemStyle: { color: cores[index] } })) }],
  }), [rows, tokens, total]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Profissionais ativos por nível" onPick={params => { const row = rows[params.dataIndex]; if (row) abrir(`${row.nome}s ativos`, porIds(ctx, row.ids), 'Profissionais com registro ativo neste nível.'); }} />;
}

function Piramide({ ctx, abrir }: { ctx: CockpitCtx; abrir: Abrir }) {
  const { tokens } = ctx, p = ctx.profissionais.resumo;
  const celulas = useMemo(() => faixasIdade.map(faixa => { const ids = p.porIdade.find(row => row.nome === faixa)?.ids ?? [], rows = porIds(ctx, ids);
    return { faixa, mulheres: rows.filter(row => row.genero === 'Feminino'), homens: rows.filter(row => row.genero === 'Masculino') }; }), [p, ctx]);
  const maximo = Math.max(1, ...celulas.map(row => Math.max(row.mulheres.length, row.homens.length)));
  const option = useMemo(() => ({
    grid: { top: 26, right: 12, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = celulas[items[0].dataIndex]; return `<b>${row.faixa} anos</b><br/>${int(row.mulheres.length)} mulheres · ${int(row.homens.length)} homens<br/><span style="opacity:.75">clique para ver</span>`; } },
    xAxis: { type: 'value', min: -maximo, max: maximo, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 10, formatter: (value: number) => int(Math.abs(value)) } },
    yAxis: { type: 'category', data: celulas.map(row => row.faixa), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: [
      { name: 'Mulheres', type: 'bar', stack: 'p', barWidth: 16, data: celulas.map(row => -row.mulheres.length), itemStyle: { color: tokens.accent, borderRadius: [4, 0, 0, 4] }, label: { show: true, position: 'left', color: tokens.ink, fontSize: 10, formatter: (params: any) => int(Math.abs(params.value)) } },
      { name: 'Homens', type: 'bar', stack: 'p', barWidth: 16, data: celulas.map(row => row.homens.length), itemStyle: { color: tokens.blue, borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (params: any) => int(params.value) } },
    ],
  }), [celulas, tokens, maximo]);
  return <Chart option={option} tokens={tokens} label="Profissionais ativos por faixa etária e gênero" onPick={params => { const row = celulas[params.dataIndex]; if (!row) return; const mulheres = params.seriesName === 'Mulheres'; abrir(`${row.faixa} anos · ${mulheres ? 'mulheres' : 'homens'}`, mulheres ? row.mulheres : row.homens, 'Profissionais ativos nesta faixa etária e gênero.'); }} />;
}

function CargaRt({ ctx, abrir }: { ctx: CockpitCtx; abrir: Abrir }) {
  const { tokens } = ctx, p = ctx.profissionais.resumo, rows = p.cargaRt;
  const option = useMemo(() => ({
    grid: { top: 8, right: 64, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>${items[0].name}</b><br/>${int(items[0].value)} responsáveis técnicos<br/><span style="opacity:.75">clique para ver</span>` },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [{ type: 'bar', barWidth: 16, data: rows.map((row, index) => ({ value: row.ids.length, itemStyle: { color: index <= 1 ? tokens.good : index === 2 ? tokens.accent : tokens.bad, borderRadius: [0, 4, 4, 0] } })), showBackground: true, backgroundStyle: { color: tokens.soft, borderRadius: 4 },
      label: { show: true, position: 'right', color: tokens.ink, fontSize: 10.5, fontWeight: 700, formatter: (params: any) => `${int(params.value)} · ${pct(params.value / Math.max(1, p.rtAtivos) * 100)}` } }],
  }), [rows, tokens, p.rtAtivos]);
  return <div className="stack">
    <p className="kpi-line"><b>{int(p.rtAtivos)}</b> profissionais são RT de ao menos uma empresa · <b>{int(rows[3]?.ids.length ?? 0)}</b> com 4 ou mais empresas</p>
    <Chart option={option} tokens={tokens} label="Responsáveis técnicos por número de empresas" onPick={params => { const row = rows[params.dataIndex]; if (row) abrir(`RT de ${row.nome}`, porIds(ctx, row.ids), 'Profissionais com vínculo de responsável técnico vigente neste número de empresas.', params.dataIndex >= 3 ? 'Verificar compatibilidade de tempo e área de atuação antes de qualquer tratativa.' : undefined); }} />
  </div>;
}

function Concentracao({ ctx, abrir }: { ctx: CockpitCtx; abrir: Abrir }) {
  const { tokens } = ctx, p = ctx.profissionais.resumo, faixas = p.faixasArt;
  const option = useMemo(() => ({
    grid: { top: 8, right: 56, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>${items[0].name} ART${items[0].name === '1 a 2' ? '' : 's'}</b><br/>${int(items[0].value)} profissionais ativos` },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: faixas.map(row => row.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: [{ type: 'bar', barWidth: 13, data: faixas.map(row => row.ids.length), itemStyle: { color: tokens.heat[2], borderRadius: [0, 4, 4, 0] }, showBackground: true, backgroundStyle: { color: tokens.soft, borderRadius: 4 }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (params: any) => int(params.value) } }],
  }), [faixas, tokens]);
  return <div className="split is-wide">
    <Chart option={option} tokens={tokens} label="Profissionais ativos por faixa de ARTs no período" onPick={params => { const row = faixas[params.dataIndex]; if (row) abrir(`Ativos com ${row.nome} ART${row.nome === 'nenhuma' ? '' : 's'} no período`, porIds(ctx, row.ids), 'Profissionais ativos nesta faixa de ARTs registradas como autor no período.'); }} />
    <ul className="side-list" aria-label="Autores com mais ARTs">{p.top.map(row => <li key={row.id}><span className="side-row"><span>{row.nome}</span><b>{int(row.arts)}</b><small>{int(row.empresas)} empresa{row.empresas === 1 ? '' : 's'} distinta{row.empresas === 1 ? '' : 's'}</small></span></li>)}
      <li className="side-note">Autores com mais ARTs no período. Lista descritiva: a regra de padrão anormal está na Malha fina.</li></ul>
  </div>;
}

function Emprego({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => [...ctx.profissionais.cbo].sort((a, b) => b.estoque - a.estoque), [ctx.profissionais.cbo]);
  const option = useMemo(() => ({
    grid: { top: 26, right: 70, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.label}</b> · CBO ${row.cbo}<br/>Estoque em ${mes(row.mes)}: ${int(row.estoque)}<br/>Saldo em 12 meses: ${row.saldo >= 0 ? '+' : ''}${int(row.saldo)}${row.rotuloAnalista ? '<br/><span style="opacity:.75">rótulo “analista” que a CBO lista como sinônimo</span>' : ''}`; } },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => row.label), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10, width: 150, overflow: 'truncate' } },
    series: [{ name: 'Estoque CLT', type: 'bar', barWidth: 11, data: rows.map(row => ({ value: row.estoque, itemStyle: { color: row.engenharia ? tokens.blue : tokens.line, borderRadius: [0, 3, 3, 0] } })),
      label: { show: true, position: 'right', fontSize: 9.5, formatter: (params: any) => { const row = rows[params.dataIndex]; return `{${row.saldo >= 0 ? 'g' : 'r'}|${row.saldo >= 0 ? '+' : ''}${int(row.saldo)} em 12 m}`; }, rich: { g: { color: tokens.good, fontWeight: 700 }, r: { color: tokens.bad, fontWeight: 700 } } } }],
  }), [rows, tokens]);
  return <div className="stack">
    <p className="kpi-line"><b>{int(rows.filter(row => row.engenharia).reduce((sum, row) => sum + row.estoque, 0))}</b> vínculos CLT em CBOs de engenharia · último mês {rows[0] ? mes(rows[0].mes) : '—'} · barras cinza: ocupações de comparação</p>
    <Chart option={option} tokens={tokens} label="Estoque de emprego formal por CBO e saldo em 12 meses" />
  </div>;
}

function Remuneracao({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => [...ctx.profissionais.cbo].filter(row => row.estoque).sort((a, b) => a.salario - b.salario), [ctx.profissionais.cbo]);
  const nome = (row: typeof rows[number]) => row.rotuloAnalista && !row.engenharia ? `${row.label} (fora da engenharia)` : row.label;
  const option = useMemo(() => ({
    grid: { top: 26, right: 40, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.label}</b> · CBO ${row.cbo}<br/>Mediana: ${money(row.salario)} · ${pct(row.salario / piso.exigivel8h * 100)} do piso exigível<br/><span style="opacity:.75">${int(row.estoque)} vínculos em ${mes(row.mes)}${row.piso ? '' : ' · ocupação sem piso da Lei 4.950-A'}</span>`; } },
    xAxis: { type: 'value', min: 0, max: (value: { max: number }) => Math.max(value.max, piso.confea8h) * 1.08, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 10, formatter: (value: number) => value.toLocaleString('pt-BR', { notation: 'compact' }) } },
    yAxis: { type: 'category', data: rows.map(nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10, width: 170, overflow: 'break' } },
    series: [
      { type: 'bar', barWidth: 3, silent: true, data: rows.map(row => ({ value: row.salario, itemStyle: { color: !row.piso ? tokens.line : row.salario < piso.exigivel8h ? tokens.bad : tokens.blue } })),
        markLine: { symbol: 'none', silent: true, label: { color: tokens.muted, fontSize: 10, position: 'end', formatter: (item: any) => item.name }, data: [
          { xAxis: piso.exigivel8h, name: `piso exigível ${money(piso.exigivel8h)}`, lineStyle: { color: tokens.bad, type: 'solid', width: 1.5 } },
          { xAxis: piso.confea8h, name: `leitura Confea ${money(piso.confea8h)}`, lineStyle: { color: tokens.accent, type: 'dashed', width: 1.5 }, label: { position: 'start', color: tokens.muted, fontSize: 10, formatter: (item: any) => item.name } }] } },
      { type: 'scatter', symbolSize: 12, data: rows.map(row => ({ value: row.salario, itemStyle: { color: !row.piso ? tokens.muted : row.salario < piso.exigivel8h ? tokens.bad : tokens.blue, borderColor: tokens.surface, borderWidth: 2 } })), label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, fontWeight: 700, formatter: (item: any) => money(item.value) } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Remuneração mediana por CBO contra o piso exigível e a leitura do Confea" />;
}

function Mensal({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = ctx.profissionais.resumo.mensal;
  const option = useMemo(() => ({
    grid: { top: 26, right: 6, bottom: 2, left: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: rows.map(row => mes(row.month)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: [{ type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } }, { type: 'value', splitLine: { show: false }, axisLabel: { color: tokens.muted } }],
    series: [
      { name: 'Registros novos', type: 'bar', stack: 'm', barWidth: '56%', data: rows.map(row => row.novos), itemStyle: { color: tokens.blue, borderRadius: [3, 3, 0, 0] } },
      { name: 'Cancelamentos', type: 'bar', stack: 'm', data: rows.map(row => -row.cancelamentos), itemStyle: { color: tokens.bad, borderRadius: [0, 0, 3, 3] } },
      { name: 'ARTs (eixo direito)', type: 'line', yAxisIndex: 1, data: rows.map(row => row.arts), smooth: 0.3, symbol: 'none', lineStyle: { color: tokens.accent, width: 2 }, itemStyle: { color: tokens.accent } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Registros novos, cancelamentos e ARTs por mês" />;
}
