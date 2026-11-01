import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { int, mes, money, pct, short } from '../painel/ui';
import { faixasIdade, situacaoEm } from '../domain/profissionais';
import type { Grupo, Profissional } from '../domain/profissionais';
import type { CockpitCtx } from './contexto';
import { pisoLegal as piso } from './publico';
import { Bloco, Indicador, linhasProfissionais, linhasEmpresas, proporcao } from './ui';
import { brl } from '../painel/ui';
import { faixasVinculos } from '../domain/parcerias';

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
    <Bloco ctx={ctx} id="pm" area="pm" title="Profissionais ativos por modalidade" question="Quantos profissionais têm registro ativo em cada modalidade e como o número mudou em relação a um ano antes."><Grupos ctx={ctx} grupos={p.porModalidade} abrir={abrir} rotulo="modalidade" /></Bloco>
    <Bloco ctx={ctx} id="pi" area="pi" title="Idade e gênero dos profissionais ativos" question="Mulheres à esquerda e homens à direita, por faixa de idade. Ajuda a prever quando será preciso repor o quadro técnico."><Piramide ctx={ctx} abrir={abrir} /></Bloco>
    <Bloco ctx={ctx} id="pg" area="pg" title="Profissionais ativos por regional" question="Pela regional do endereço do profissional, com a variação em relação a um ano antes."><Grupos ctx={ctx} grupos={p.porGre} abrir={abrir} rotulo="regional" curto /></Bloco>
    <Bloco ctx={ctx} id="pn" area="pn" title="Engenheiros, tecnólogos e técnicos" question="Quantos profissionais ativos há em cada nível de formação."><Niveis ctx={ctx} abrir={abrir} /></Bloco>
    <Bloco ctx={ctx} id="pr" area="pr" title="Quantas empresas cada responsável técnico assume" question="Profissionais agrupados pelo número de empresas em que são responsáveis técnicos hoje. Acima de três, vale conferir se há tempo e área compatíveis."><CargaRt ctx={ctx} abrir={abrir} /></Bloco>
    <Bloco ctx={ctx} id="pa" area="pa" title="Quantas ARTs cada profissional registra" question="Profissionais ativos agrupados pelo número de ARTs no período, e os que mais registraram. Volume alto, sozinho, não é indício; a malha fina trata os casos incomuns."><Concentracao ctx={ctx} abrir={abrir} /></Bloco>
    <Bloco ctx={ctx} id="pe" area="pe" title="Emprego formal em ocupações de engenharia" question="Quantas pessoas estavam empregadas com carteira em cada ocupação de engenharia no último mês disponível e o saldo de contratações em 12 meses, somados por ocupação (Novo CAGED e RAIS). Inclui cargos com nome de “analista”." ><Emprego ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ps" area="ps" title="Salário típico e piso salarial" question="Salário do meio da distribuição em cada ocupação, comparado com o piso legal (na base fixada pelo STF) e com a leitura do Confea, os dois para 8 horas diárias. Os números são somados por ocupação e só descrevem a situação."><Remuneracao ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="pt" area="pt" title="Registros, cancelamentos e ARTs por mês" question="Quantos registros novos, cancelamentos e ARTs houve em cada mês do período."><Mensal ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="pp" area="pp" title="Perícias judiciais" question="Peritos nomeados pelo Tribunal de Justiça nos últimos 24 meses, por especialidade. Mostra em quantos casos se encontrou a ART da perícia e quantos peritos não têm registro ativo hoje. Clique numa especialidade para ver as nomeações." help="Nomeação, perícia entregue e pagamento são coisas diferentes, e honorário arbitrado não é honorário pago. O tipo de processo, sozinho, não prova que a perícia exigia engenheiro."><Pericias ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="vn" area="vn" title="Empregados em ocupações técnicas, por empresa" question="Quantos empregados com carteira em ocupações de engenharia cada empresa tem, contados pela RAIS identificada que o Ministério do Trabalho só fornece por acordo. Mostra também empresas registradas que têm esses empregados e não têm responsável técnico." help="Ter um empregado em ocupação técnica não significa ter um profissional registrado nem um responsável técnico. Salários individuais não entram."><Vinculos ctx={ctx} /></Bloco>
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

function Pericias({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.parcerias.pericias, rows = q.porEspecialidade;
  const option = useMemo(() => ({
    grid: { top: 24, right: 8, bottom: 2, left: 2, containLabel: true }, legend: { top: 0, left: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: rows.map(row => short(row.especialidade)), axisLabel: { color: tokens.muted, fontSize: 10, interval: 0, rotate: 20 }, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    series: [
      { type: 'bar', name: 'Nomeações', barWidth: 16, data: rows.map(row => row.n), itemStyle: { color: tokens.blue } },
      { type: 'line', name: 'Perito sem registro ativo', data: rows.map(row => row.semRegistroAtivo), symbol: 'circle', symbolSize: 7, lineStyle: { width: 0 }, itemStyle: { color: tokens.warn } },
    ],
  }), [rows, tokens]);
  const abrirPeritos = () => q.peritosSemRegistroAtivo.length && ctx.open({ kind: 'linhas', eyebrow: 'Candidato · depende de parceria (TJSP)', title: 'Peritos nomeados sem registro ativo', what: 'Profissionais nomeados peritos nos últimos 24 meses cujo registro está cancelado ou interrompido na data de referência.', use: 'Conferir a situação e a especialidade antes de qualquer contato com o juízo; a nomeação é ato do tribunal.', listTitle: 'Profissionais',
    rows: linhasProfissionais(ctx, q.peritosSemRegistroAtivo, row => { const n = q.nomeacoesSemRegistroAtivo.filter(item => item.profissionalId === row.id).length; return { value: `${n} nomeação${n === 1 ? '' : 'ões'}`, note: situacaoEm(row, ctx.anchor) ?? '—', sort: n }; }) });
  return <div className="split">
    <div className="stack">
      <p className="kpi-line"><b>{int(q.nomeacoes.length)}</b> nomeações em <b>{int(q.processos)}</b> processos e {int(q.comarcas)} comarcas · rastreabilidade com a ART {q.rastreabilidade === null ? '—' : pct(q.rastreabilidade)} · cobertura de chaves {q.coberturaChaves === null ? '—' : pct(q.coberturaChaves)} · honorários arbitrados {brl(q.honorariosArbitrados)}</p>
      <Chart option={option} tokens={tokens} label="Nomeações de peritos por especialidade" onPick={params => { const row = rows[params.dataIndex]; if (!row) return; const lista = q.nomeacoes.filter(item => item.especialidade === row.especialidade); ctx.open({ kind: 'linhas', title: `Nomeações · ${row.especialidade}`, what: 'Nomeações com número CNJ, comarca, data e ponte com a ART, lidas na data de referência.', use: 'Honorários arbitrados não são pagamentos efetuados.', listTitle: 'Nomeações', rows: lista.map(item => ({ key: item.id, title: item.processo, subtitle: `${ctx.dataset.cities.find(city => city.id === item.cityId)?.name ?? '—'} · ${item.data.split('-').reverse().join('/')}`, value: brl(item.honorariosArbitrados), note: `ponte ${item.ponte.toLowerCase()}${item.profissionalId ? '' : ' · perito não localizado'}`, sortValue: item.honorariosArbitrados })) }); }} />
    </div>
    <ul className="side-list" aria-label="Ponte com a ART e peritos">
      {q.porPonte.map(row => <li key={row.ponte}><button disabled><i style={{ background: row.ponte === 'Confirmada' ? tokens.good : row.ponte === 'Sem chave' ? tokens.muted : tokens.accent }} /><span>Ponte {row.ponte.toLowerCase()}</span><b>{int(row.n)}</b></button></li>)}
      <li><button onClick={abrirPeritos}><i style={{ background: tokens.warn }} /><span>Peritos nomeados sem registro ativo em D</span><b>{int(q.peritosSemRegistroAtivo.length)}</b></button></li>
      <li><button disabled><i style={{ background: tokens.line }} /><span>Nomeações sem perito localizado</span><b>{int(q.naoLocalizadas)}</b></button></li>
      <li className="side-note">Depende do acordo com o TJSP (identidade do perito e especialidade); DJE e e-SAJ só por captura homologada. Demonstrativo.</li>
    </ul>
  </div>;
}

function Vinculos({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.parcerias.vinculos, rows = q.porFaixa;
  const option = useMemo(() => ({
    grid: { top: 24, right: 8, bottom: 2, left: 2, containLabel: true }, legend: { top: 0, left: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: faixasVinculos.map(faixa => `${faixa} técnico${faixa === 'nenhum' ? '' : 's'}`), axisLabel: { color: tokens.muted, fontSize: 10, interval: 0 }, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    series: [
      { type: 'bar', name: 'Registradas', stack: 'v', barWidth: 22, data: rows.map(row => row.registradas), itemStyle: { color: tokens.good } },
      { type: 'bar', name: 'Sem registro (universo)', stack: 'v', data: rows.map(row => row.semRegistro), itemStyle: { color: tokens.warn, borderRadius: [3, 3, 0, 0] } },
    ],
  }), [rows, tokens]);
  const abrir = (titulo: string, ids: string[], what: string, use: string) => ids.length && ctx.open({ kind: 'linhas', eyebrow: 'Contexto · depende de parceria (MTE)', title: titulo, what, use, listTitle: 'Empresas, mais vínculos técnicos primeiro', rows: linhasEmpresas(ctx, ids, id => { const row = q.empresas.find(item => item.companyId === id)!; return { value: `${int(row.vinculosTecnicos)} técnico${row.vinculosTecnicos === 1 ? '' : 's'}`, note: `${int(row.vinculosTotal)} vínculos no total`, sort: row.vinculosTecnicos }; }) });
  return <div className="split">
    <div className="stack">
      <p className="kpi-line"><b>{int(q.vinculosTecnicos)}</b> vínculos em CBO de engenharia em <b>{int(q.comTecnicos.length)}</b> empresas · {int(q.vinculosTotal)} vínculos no total das empresas com dado</p>
      <Chart option={option} tokens={tokens} label="Empresas por faixa de vínculos técnicos e situação do registro" />
    </div>
    <ul className="side-list" aria-label="Leituras dos vínculos">
      <li><button onClick={() => abrir('Registradas com empregados técnicos e sem RT vigente', q.registradasSemRt, 'Empresas registradas com ao menos um vínculo CLT em CBO de engenharia e nenhum responsável técnico vigente na data de referência.', 'Conferir se há atividade técnica e orientar a anotação do RT. Empregado em CBO técnico não é RT.')}><i style={{ background: tokens.accent }} /><span>Registradas com técnicos e sem RT vigente</span><b>{int(q.registradasSemRt.length)}</b></button></li>
      <li><button onClick={() => abrir('Universo sem registro com empregados técnicos', q.semRegistroComTecnicos, 'Estabelecimentos com CNAE da lista, sem registro vigente, com vínculos em CBO de engenharia.', 'Prioriza a análise do CNAE sem registro; o vínculo não prova atividade privativa.')}><i style={{ background: tokens.warn }} /><span>Universo sem registro com técnicos</span><b>{int(q.semRegistroComTecnicos.length)}</b></button></li>
      <li className="side-note">Depende do acordo com o MTE (RAIS identificada ou eSocial), só contagens por CNPJ e CBO; nenhum salário individual. Demonstrativo.</li>
    </ul>
  </div>;
}
