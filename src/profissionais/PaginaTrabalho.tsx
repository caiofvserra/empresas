import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { brl, int, mes, money, pct } from '../painel/ui';
import { parteAbaixo, situacaoEm } from '../domain/profissionais';
import type { Nomeacao } from '../domain/parcerias';
import { empregoMensal, empregoRegionalOcupacao } from '../domain/painel-profissionais';
import type { CockpitCtx } from '../cockpit/contexto';
import { pisoLegal as piso } from '../cockpit/publico';
import { Bloco, Indicador, linhasProfissionais } from '../cockpit/ui';

/**
 * Painel de Profissionais, página 5: emprego com carteira e salário nas ocupações de engenharia, em totais por ocupação e regional
 * (Novo CAGED e RAIS, sem identificar pessoas ou empresas), e as perícias judiciais, que dependem de acordo com o Tribunal de Justiça.
 * Com uma modalidade escolhida, ficam só as ocupações daquela modalidade; com um município, a série é a da regional dele.
 */
const ocupacoes = (ctx: CockpitCtx) => ctx.profissionais.cbo.filter(row => !ctx.modalidade || row.modalidade === ctx.modalidade);
const regionalDoRecorte = (ctx: CockpitCtx) => ctx.greId ?? (ctx.cidadeId ? ctx.dataset.cities.find(row => row.id === ctx.cidadeId)?.greId ?? null : null);

export default function PaginaTrabalho({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = ocupacoes(ctx), eng = rows.filter(row => row.engenharia), q = ctx.parcerias.pericias;
  const estoque = eng.reduce((t, row) => t + row.estoque, 0), saldo = eng.reduce((t, row) => t + row.saldo, 0), salario = estoque ? eng.reduce((t, row) => t + row.salario * row.estoque, 0) / estoque : null;
  const abaixo = eng.filter(row => row.piso && row.salario < piso.exigivel8h);
  const serie = useMemo(() => empregoMensal(ctx.profissionais.emprego, ctx.anchor, regionalDoRecorte(ctx), ctx.modalidade), [ctx.profissionais.emprego, ctx.anchor, ctx.greId, ctx.cidadeId, ctx.modalidade]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="ck-grid ck-grid-pf-trabalho">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores de emprego, salário e perícias">
      <Indicador destaque ficha="k-emprego" ctx={ctx} label="Empregos com carteira em engenharia" value={int(estoque)} spark={serie.slice(-12).map(row => row.estoque)} cor={tokens.blue} sub={eng[0] ? `em ${mes(eng[0].mes)}, último mês disponível` : 'sem dado no recorte'} />
      <Indicador ficha="k-saldo" ctx={ctx} label="Saldo de contratações em 12 meses" value={`${saldo >= 0 ? '+' : ''}${int(saldo)}`} variacao={{ value: estoque - saldo > 0 ? saldo / (estoque - saldo) * 100 : null, label: 'do estoque de um ano antes' }} sub="admissões menos desligamentos" />
      <Indicador ficha="k-salario" ctx={ctx} label="Salário típico em engenharia" value={salario === null ? '—' : money(salario)} variacao={{ value: salario === null ? null : (salario - piso.exigivel8h) / piso.exigivel8h * 100, label: 'em relação ao piso exigível' }} sub="o do meio da distribuição, ponderado pelos empregos" />
      <Indicador ficha="k-piso" ctx={ctx} label="Ocupações com salário típico abaixo do piso" value={`${int(abaixo.length)} de ${int(eng.filter(row => row.piso).length)}`} sub={abaixo.length ? abaixo.map(row => row.label.split('(')[0].trim()).join(', ') : 'nenhuma ocupação de engenharia abaixo do piso'} />
      <Indicador ficha="k-pericias" ctx={ctx} label="Nomeações de peritos em 24 meses" value={int(q.nomeacoes.length)} spark={q.mensal.map(row => row.n)} cor={tokens.accent} sub={`em ${int(q.processos)} processos de ${int(q.comarcas)} comarcas`} />
    </section>
    <Bloco ctx={ctx} id="ev" area="ev" title="Emprego com carteira mês a mês" question="Nas ocupações de engenharia, as admissões para cima e os desligamentos para baixo em cada mês, com a linha do total de empregos com carteira (eixo da direita)." help="Os números são totais do Novo CAGED e da RAIS, por ocupação e regional, e não identificam pessoas nem empresas. Com um município escolhido, a série é a da regional dele."><EmpregoMes ctx={ctx} serie={serie} /></Bloco>
    <Bloco ctx={ctx} id="pe" area="pe" title="Empregos por ocupação" question="Quantos empregos com carteira havia em cada ocupação no último mês disponível, com o saldo de contratações em 12 meses ao lado. As barras cinza são ocupações de fora da engenharia, mostradas para comparação." help="Inclui cargos com nome de “analista” que a classificação de ocupações (CBO) lista como engenheiro."><Emprego ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ps" area="ps" title="Salário por ocupação e piso" question="Cada caixa mostra quanto ganha a metade do meio dos empregos da ocupação; as hastes vão de 10% a 90% e o traço no meio é a mediana. A linha vermelha é o piso legal (na base fixada pelo STF) e a amarela, a leitura do Confea, as duas para 8 horas. Embaixo do nome, a parte dos empregos abaixo do piso." help="São totais por ocupação e só descrevem a situação. Não apontam empresa nem descumprimento do piso."><Remuneracao ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="eh" area="eh" title="Saldo de contratações em um ano, por regional" question="Admissões menos desligamentos nos últimos 12 meses, nas ocupações de engenharia, em cada regional. Ao lado, o quanto o saldo representa do total de empregos da regional. Azul contratou mais do que desligou; vermelho, o contrário."><RegionalOcupacao ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="pp" area="pp" title="Perícias judiciais por especialidade" question="Peritos nomeados pelo Tribunal de Justiça nos últimos 24 meses, por especialidade, separados pela situação do perito no cadastro do Crea-SP." help="Nomeação, perícia entregue e pagamento são coisas diferentes, e honorário fixado pelo juiz não é honorário pago. O tipo de processo, sozinho, não prova que a perícia exigia engenheiro. Clique numa barra para ver as nomeações."><Pericias ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="pr" area="pr" title="ART das perícias" question="Das nomeações, quantas trazem os dados mínimos para procurar a ART (número do processo, órgão e perito identificado) e em quantas a ART foi encontrada." help="Não achar a ART não quer dizer que ela não existe. A ligação é confirmada só com o número do processo citado na ART."><Rastreabilidade ctx={ctx} /></Bloco>
  </div>;
}

function EmpregoMes({ ctx, serie }: { ctx: CockpitCtx; serie: ReturnType<typeof empregoMensal> }) {
  const { tokens } = ctx, rows = serie.slice(-24);
  const option = useMemo(() => ({
    grid: { top: 26, right: 6, bottom: 2, left: 4, containLabel: true }, legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, itemGap: 10, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${mes(row.month)}</b><br/>Admissões: ${int(row.admissoes)} · desligamentos: ${int(row.desligamentos)}<br/>Saldo: <b>${row.saldo >= 0 ? '+' : ''}${int(row.saldo)}</b><br/>Empregos com carteira: ${int(row.estoque)}`; } },
    xAxis: { type: 'category', data: rows.map(row => mes(row.month)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10, interval: 2 } },
    yAxis: [{ type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: (value: number) => int(Math.abs(value)) } }, { type: 'value', scale: true, minInterval: 100, splitLine: { show: false }, axisLabel: { color: tokens.muted, formatter: (value: number) => value >= 1000 ? `${(value / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mil` : int(value) } }],
    series: [
      { name: 'Admissões', type: 'bar', stack: 'e', barWidth: '58%', data: rows.map(row => row.admissoes), itemStyle: { color: tokens.blue, borderRadius: [3, 3, 0, 0] } },
      { name: 'Desligamentos', type: 'bar', stack: 'e', data: rows.map(row => -row.desligamentos), itemStyle: { color: tokens.bad, borderRadius: [0, 0, 3, 3] } },
      { name: 'Empregos com carteira', type: 'line', yAxisIndex: 1, data: rows.map(row => row.estoque), smooth: 0.3, symbol: 'none', lineStyle: { color: tokens.ink, width: 2 }, itemStyle: { color: tokens.ink } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Admissões, desligamentos e empregos com carteira nas ocupações de engenharia" />;
}

function Emprego({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => [...ocupacoes(ctx)].sort((a, b) => b.estoque - a.estoque), [ctx.profissionais.cbo, ctx.modalidade]); // eslint-disable-line react-hooks/exhaustive-deps
  const option = useMemo(() => ({
    grid: { top: 4, right: 62, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.label}</b> · CBO ${row.cbo}<br/>Empregos em ${mes(row.mes)}: ${int(row.estoque)}<br/>Saldo em 12 meses: ${row.saldo >= 0 ? '+' : ''}${int(row.saldo)}${row.rotuloAnalista ? '<br/><span style="opacity:.75">cargo com nome de “analista” que a CBO lista como sinônimo</span>' : ''}`; } },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => row.label.split('(')[0].replace('Eng. civil · ', 'Eng. ').trim()), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10, width: 150, overflow: 'truncate' } },
    series: [{ type: 'bar', barWidth: '58%', data: rows.map(row => ({ value: row.estoque, itemStyle: { color: row.engenharia ? tokens.blue : tokens.line, borderRadius: [0, 3, 3, 0] } })),
      label: { show: true, position: 'right', fontSize: 9.5, formatter: (params: any) => { const row = rows[params.dataIndex]; return `{n|${int(row.estoque)}} {${row.saldo >= 0 ? 'g' : 'r'}|${row.saldo >= 0 ? '+' : ''}${int(row.saldo)}}`; }, rich: { n: { color: tokens.ink, fontWeight: 700 }, g: { color: tokens.good, fontWeight: 700 }, r: { color: tokens.bad, fontWeight: 700 } } } }],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Empregos com carteira por ocupação e saldo em 12 meses" />;
}

const milReais = (value: number) => `${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
/** Caixas de salário por ocupação: a caixa vai de 25% a 75% dos empregos, as hastes de 10% a 90%, e o traço do meio é a mediana.
 * As linhas verticais são o piso exigível e a leitura do Confea, os dois para 8 horas. Ao lado, a parte dos empregos abaixo do piso. */
function Remuneracao({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => ocupacoes(ctx).filter(row => row.estoque).sort((a, b) => b.salario - a.salario), [ctx.profissionais.cbo, ctx.modalidade]); // eslint-disable-line react-hooks/exhaustive-deps
  const abaixo = (row: (typeof rows)[number]) => parteAbaixo(row.faixa, piso.exigivel8h);
  const cor = (row: (typeof rows)[number]) => !row.piso ? tokens.muted : row.salario < piso.exigivel8h ? tokens.bad : tokens.blue;
  const option = useMemo(() => ({
    grid: { top: 22, right: 8, bottom: 2, left: 2, containLabel: true },
    title: { text: `{p|—} piso exigível ${milReais(piso.exigivel8h)}    {c|- - -} Confea ${milReais(piso.confea8h)}`, right: 4, top: 0, textStyle: { color: tokens.muted, fontSize: 10, fontWeight: 400, rich: { p: { color: tokens.bad, fontWeight: 800, fontSize: 12 }, c: { color: tokens.accent, fontWeight: 800, fontSize: 11 } } } },
    tooltip: { trigger: 'item', formatter: (item: any) => { const row = rows[item.dataIndex]; if (!row) return ''; const f = row.faixa, a = abaixo(row);
      return `<b>${row.label}</b> · CBO ${row.cbo}<br/>Metade dos empregos ganha entre <b>${money(f.p25)}</b> e <b>${money(f.p75)}</b><br/>Mediana: <b>${money(f.p50)}</b> · 10% ganham menos de ${money(f.p10)} e 10% mais de ${money(f.p90)}<br/>${row.piso ? `Abaixo do piso exigível: <b>${a === null ? '—' : pct(a)}</b> dos empregos` : 'Ocupação sem piso da Lei 4.950-A'}<br/><span style="opacity:.75">${int(row.estoque)} empregos em ${mes(row.mes)}</span>`; } },
    xAxis: { type: 'value', min: (value: { min: number }) => Math.floor(value.min / 2000) * 2000, max: (value: { max: number }) => Math.max(value.max, piso.confea8h) * 1.04, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 9, formatter: (value: number) => `${int(value / 1000)} mil` } },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => row.label.split('(')[0].replace('Eng. civil · ', 'Eng. ').trim()), axisTick: { show: false }, axisLine: { show: false },
      axisLabel: { color: tokens.ink, fontSize: 10, width: 150, overflow: 'truncate', formatter: (value: string, index: number) => { const row = rows[index], a = row ? abaixo(row) : null; return row?.piso && a !== null ? `${value}\n{a|${pct(a)} abaixo do piso}` : `${value}\n{s|sem piso legal}`; },
        rich: { a: { color: tokens.muted, fontSize: 9, align: 'right' }, s: { color: tokens.muted, fontSize: 9, align: 'right' } } } },
    series: [{ type: 'boxplot', boxWidth: [10, 20], data: rows.map(row => ({ value: [row.faixa.p10, row.faixa.p25, row.faixa.p50, row.faixa.p75, row.faixa.p90], itemStyle: { color: `${cor(row)}33`, borderColor: cor(row), borderWidth: 1.5 } })),
      markLine: { symbol: 'none', silent: true, label: { show: false }, data: [
        { xAxis: piso.exigivel8h, name: `piso ${milReais(piso.exigivel8h)}`, label: { position: 'start' }, lineStyle: { color: tokens.bad, type: 'solid', width: 1.5 } },
        { xAxis: piso.confea8h, name: `Confea ${milReais(piso.confea8h)}`, label: { position: 'start' }, lineStyle: { color: tokens.accent, type: 'dashed', width: 1.5 } }] } }],
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Distribuição do salário por ocupação comparada com o piso exigível e a leitura do Confea" />;
}

/** Saldo de contratações em 12 meses por regional, nas ocupações de engenharia, com o peso no estoque. */
function RegionalOcupacao({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, m = useMemo(() => empregoRegionalOcupacao(ctx.profissionais.emprego, ctx.dataset, ctx.anchor, ctx.modalidade), [ctx.profissionais.emprego, ctx.dataset, ctx.anchor, ctx.modalidade]);
  const escolhida = regionalDoRecorte(ctx);
  const rows = useMemo(() => m.gres.map((gre, y) => { const cels = m.celulas.filter(cel => cel.y === y && m.ocupacoes[cel.x].engenharia); const saldo = cels.reduce((n, cel) => n + cel.saldo, 0), estoque = cels.reduce((n, cel) => n + cel.estoque, 0);
    return { gre, nome: gre.name.split('·')[1]?.trim() ?? gre.name, saldo, estoque, parte: estoque ? saldo / estoque * 100 : null }; }).sort((a, b) => b.saldo - a.saldo), [m]);
  const option = useMemo(() => ({
    grid: { top: 4, right: 74, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.gre.name}</b><br/>Saldo em 12 meses: <b>${row.saldo >= 0 ? '+' : ''}${int(row.saldo)}</b> (${row.parte === null ? '—' : `${row.parte >= 0 ? '+' : ''}${pct(row.parte, 1)}`} do estoque)<br/>${int(row.estoque)} empregos em engenharia em ${mes(m.ultimo)}`; } },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => row.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10 } },
    series: [{ type: 'bar', barWidth: '62%', data: rows.map(row => ({ value: row.saldo, itemStyle: { color: row.saldo < 0 ? tokens.bad : tokens.blue, opacity: escolhida && row.gre.id !== escolhida ? 0.3 : 1, borderRadius: row.saldo < 0 ? [3, 0, 0, 3] : [0, 3, 3, 0] } })),
      label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, fontWeight: 700, formatter: (item: any) => { const row = rows[item.dataIndex]; return `${row.saldo >= 0 ? '+' : ''}${int(row.saldo)}  {p|${row.parte === null ? '' : `${row.parte >= 0 ? '+' : ''}${pct(row.parte, 1)}`}}`; }, rich: { p: { color: tokens.muted, fontSize: 9.5, fontWeight: 400 } } } }],
  }), [rows, tokens, escolhida, m.ultimo]);
  return <Chart option={option} tokens={tokens} label="Saldo de contratações em 12 meses por regional, nas ocupações de engenharia" />;
}

function abrirNomeacoes(ctx: CockpitCtx, title: string, lista: Nomeacao[]) {
  if (!lista.length) return;
  const cidades = new Map(ctx.dataset.cities.map(row => [row.id, row.name])), modelo = ctx.profissionais.modelo;
  ctx.open({ kind: 'linhas', eyebrow: 'Depende de acordo com o Tribunal de Justiça', title, what: 'Nomeações de peritos com número do processo, comarca, data, perito e situação da ART, na data escolhida.', use: 'Honorário fixado pelo juiz não é pagamento efetuado. A nomeação é ato do tribunal.', listTitle: 'Nomeações',
    rows: lista.map(item => { const perito = item.profissionalId ? modelo.porId.get(item.profissionalId) : undefined;
      return { key: item.id, title: item.processo, subtitle: `${cidades.get(item.cityId) ?? '—'} · ${item.data.split('-').reverse().join('/')} · ${perito ? perito.nome : 'perito não localizado'}`, value: brl(item.honorariosArbitrados), note: `ART ${item.ponte === 'Sem chave' ? 'sem dados para procurar' : item.ponte.toLowerCase()}${perito ? `; registro ${(situacaoEm(perito, ctx.anchor) ?? '—').toLowerCase()}` : ''}`, sortValue: item.honorariosArbitrados }; }) });
}

function Pericias({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.parcerias.pericias, modelo = ctx.profissionais.modelo;
  const grupos = useMemo(() => { const situacao = (item: Nomeacao) => { const p = item.profissionalId ? modelo.porId.get(item.profissionalId) : undefined; return !p ? 'nao' : situacaoEm(p, ctx.anchor) === 'Ativo' ? 'ativo' : 'inativo'; };
    return q.porEspecialidade.map(row => { const lista = q.nomeacoes.filter(item => item.especialidade === row.especialidade); return { especialidade: row.especialidade, ativo: lista.filter(item => situacao(item) === 'ativo'), inativo: lista.filter(item => situacao(item) === 'inativo'), nao: lista.filter(item => situacao(item) === 'nao') }; }); }, [q, modelo, ctx.anchor]);
  const series = [{ key: 'ativo', name: 'Perito com registro ativo', color: tokens.blue }, { key: 'inativo', name: 'Perito sem registro ativo', color: tokens.bad }, { key: 'nao', name: 'Perito não localizado', color: tokens.line }] as const;
  const option = useMemo(() => ({
    grid: { top: 24, right: 30, bottom: 2, left: 2, containLabel: true }, legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, itemGap: 8, textStyle: { color: tokens.muted, fontSize: 10 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: grupos.map(row => row.especialidade), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: series.map((serie, index) => ({ name: serie.name, type: 'bar', stack: 'p', barWidth: '58%', data: grupos.map(row => row[serie.key].length), itemStyle: { color: serie.color, borderRadius: index === 2 ? [0, 3, 3, 0] : 0 },
      label: index === 2 ? { show: true, position: 'right', color: tokens.ink, fontSize: 10, fontWeight: 700, formatter: (params: any) => int(grupos[params.dataIndex].ativo.length + grupos[params.dataIndex].inativo.length + grupos[params.dataIndex].nao.length) } : undefined })),
  }), [grupos, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Nomeações de peritos por especialidade e situação do perito" onPick={params => { const row = grupos[params.dataIndex], serie = series[params.seriesIndex]; if (row && serie) abrirNomeacoes(ctx, `${row.especialidade}: ${serie.name.toLowerCase()}`, row[serie.key]); }} />;
}

function Rastreabilidade({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.parcerias.pericias, comDados = q.nomeacoes.filter(item => item.dadosMinimos), confirmadas = comDados.filter(item => item.ponte === 'Confirmada');
  const etapas = [{ name: 'Nomeações', rows: q.nomeacoes, color: tokens.heat[1] }, { name: 'Com dados para procurar a ART', rows: comDados, color: tokens.blue }, { name: 'ART encontrada', rows: confirmadas, color: tokens.good }];
  const option = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (item: any) => `<b>${item.name}</b><br/>${int(item.value)} nomeações · ${pct(item.value / Math.max(1, q.nomeacoes.length) * 100)} do total<br/><span style="opacity:.75">clique para ver</span>` },
    series: [{ type: 'funnel', left: 4, right: 4, top: 4, bottom: 4, minSize: '28%', sort: 'none', gap: 3, label: { show: true, position: 'inside', color: '#FFFFFF', fontSize: 10.5, fontWeight: 700, formatter: (item: any) => `${item.name}\n${int(item.value)}` },
      itemStyle: { borderColor: tokens.surface, borderWidth: 1 }, data: etapas.map(etapa => ({ name: etapa.name, value: etapa.rows.length, itemStyle: { color: etapa.color } })) }],
  }), [etapas.map(e => e.rows.length).join(), tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  const peritos = () => q.peritosSemRegistroAtivo.length && ctx.open({ kind: 'linhas', eyebrow: 'Indício a confirmar, que depende de acordo com o Tribunal de Justiça', title: 'Peritos nomeados sem registro ativo', what: 'Profissionais nomeados peritos nos últimos 24 meses com o registro cancelado ou interrompido na data escolhida.', use: 'Conferir a situação e a especialidade antes de qualquer contato com o juízo; a nomeação é ato do tribunal.', listTitle: 'Profissionais',
    rows: linhasProfissionais(ctx, q.peritosSemRegistroAtivo, row => { const n = q.nomeacoesSemRegistroAtivo.filter(item => item.profissionalId === row.id).length; return { value: `${n} nomeação${n === 1 ? '' : 'ões'}`, note: situacaoEm(row, ctx.anchor) ?? '—', sort: n }; }) });
  return <div className="split">
    <Chart option={option} tokens={tokens} label="Nomeações de peritos, as que têm dados para procurar a ART e as que têm a ART encontrada" onPick={params => { const etapa = etapas[params.dataIndex]; if (etapa) abrirNomeacoes(ctx, etapa.name, etapa.rows); }} />
    <ul className="side-list" aria-label="Atalhos das perícias">
      <li className="side-head">ART encontrada</li>
      <li className="side-big"><b>{q.rastreabilidade === null ? '—' : pct(q.rastreabilidade)}</b><small>das nomeações com dados</small></li>
      <li><button className="is-acao" onClick={peritos}><span>Peritos sem registro ativo</span><b>{int(q.peritosSemRegistroAtivo.length)}</b></button></li>
      <li><button className="is-acao" onClick={() => abrirNomeacoes(ctx, 'Nomeações sem perito localizado', q.nomeacoes.filter(item => !item.profissionalId))}><span>Perito não localizado</span><b>{int(q.naoLocalizadas)}</b></button></li>
      <li><span className="side-serie is-texto"><span>Honorários fixados</span><b>{brl(q.honorariosArbitrados)}</b></span></li>
    </ul>
  </div>;
}
