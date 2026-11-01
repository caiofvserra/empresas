import { useMemo, useState } from 'react';
import { ArrowDownUp } from 'lucide-react';
import { Chart } from '../painel/chart';
import { int, pct } from '../painel/ui';
import type { Coorte, LinhaIes } from '../domain/formacao';
import type { CockpitCtx } from './contexto';
import { Bloco, Indicador, linhasProfissionais, proporcao } from './ui';

/**
 * Aba 4 · Formação e ingresso: concluintes do Censo (INEP, carga anual) por IES, modalidade e canal contra os registros novos
 * no Crea-SP, por coorte de conclusão, com três taxas: registro em 24 meses, atividade (ART em 24 meses) e permanência (ativo e
 * adimplente após 2 anos). Tudo lido na data de referência; coortes só fecham quando o prazo passou.
 */
export default function PaginaFormacao({ ctx }: { ctx: CockpitCtx }) {
  const q = ctx.formacao, fechada24 = q.coortes.filter(row => row.fechada24).at(-1), fechada48 = q.coortes.filter(row => row.fechada48).at(-1);
  const anterior24 = q.coortes.filter(row => row.fechada24).at(-2), anterior48 = q.coortes.filter(row => row.fechada48).at(-2);
  const pp = (now: number | null | undefined, before: number | null | undefined) => now == null || before == null ? null : now - before;
  return <div className="ck-grid ck-grid-formacao">
    <section className="ck-cards is-four" style={{ gridArea: 'kpi' }} aria-label="Indicadores de formação e ingresso">
      <Indicador destaque ficha="k-concluintes" ctx={ctx} label={`Concluintes de ${fechada24?.ano ?? '—'}`} value={fechada24 ? int(fechada24.concluintes) : '—'} variacao={{ value: fechada24 && anterior24?.concluintes ? (fechada24.concluintes - anterior24.concluintes) / anterior24.concluintes * 100 : null, label: `em relação aos formados em ${anterior24?.ano ?? 'ano anterior'}` }} sub={fechada24 ? `${int(q.serie.find(row => row.ano === fechada24.ano)?.ead ?? 0)} a distância; é o último ano já acompanhado por inteiro` : 'nenhum ano acompanhado por inteiro ainda'} />
      <Indicador ficha="k-registro" ctx={ctx} label="Registro em 24 meses" value={fechada24?.taxaRegistro24 == null ? '—' : pct(fechada24.taxaRegistro24, 1)} variacao={{ value: pp(fechada24?.taxaRegistro24, anterior24?.taxaRegistro24), kind: 'pp', label: `em relação aos formados em ${anterior24?.ano ?? 'ano anterior'}` }} sub={fechada24 ? `${proporcao(fechada24.registradosEm24.length, fechada24.concluintes, 1)} dos concluintes de ${fechada24.ano}` : ''} onOpen={() => fechada24 && abrirCoorte(ctx, fechada24, 'registradosEm24')} />
      <Indicador ficha="k-atividade" ctx={ctx} label="Atividade em 24 meses do registro" value={fechada48?.taxaAtividade == null ? '—' : pct(fechada48.taxaAtividade, 1)} variacao={{ value: pp(fechada48?.taxaAtividade, anterior48?.taxaAtividade), kind: 'pp', label: `em relação aos formados em ${anterior48?.ano ?? 'ano anterior'}` }} sub={fechada48 ? `${proporcao(fechada48.comAtividade.length, fechada48.registradosEm24.length)} dos registrados de ${fechada48.ano} com ART` : ''} onOpen={() => fechada48 && abrirCoorte(ctx, fechada48, 'comAtividade')} />
      <Indicador ficha="k-permanencia" ctx={ctx} label="Permanência após 2 anos" value={fechada48?.taxaPermanencia == null ? '—' : pct(fechada48.taxaPermanencia, 1)} variacao={{ value: pp(fechada48?.taxaPermanencia, anterior48?.taxaPermanencia), kind: 'pp', label: `em relação aos formados em ${anterior48?.ano ?? 'ano anterior'}` }} sub={fechada48 ? `${proporcao(fechada48.ativosAdimplentes.length, fechada48.registradosEm24.length)} ativos e em dia 2 anos depois do registro` : ''} onOpen={() => fechada48 && abrirCoorte(ctx, fechada48, 'ativosAdimplentes')} />
    </section>
    <Bloco ctx={ctx} id="fc" area="fc" title="Formados que se registram, atuam e continuam" question="Para cada turma de formados (dados do INEP), que parte se registrou no Crea-SP em até 24 meses, que parte registrou ART e que parte continua ativa e em dia dois anos depois. Turmas recentes aparecem claras e ficam fora da comparação."><Coortes ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="fs" area="fs" title="Formados por ano, presencial e a distância" question="Quantos se formaram em cada ano em cursos presenciais e a distância, segundo o Censo da Educação Superior. A linha mostra quantos desses formados já se registraram no Crea-SP."><Serie ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="fi" area="fi" title="Cada instituição de ensino" question="Formados, registrados, taxa de registro, parte a distância e cadeiras no plenário, somando as turmas que já completaram o prazo. Clique no nome de uma coluna para ordenar."><TabelaIes ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="fm" area="fm" title="Por modalidade" question="Formados e taxa de registro em 24 meses em cada modalidade, nas turmas que já completaram o prazo."><Modalidades ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="fn" area="fn" title="Presencial ou a distância, pública ou privada" question="Taxa de registro em 24 meses de quem estudou presencialmente e a distância, e de quem se formou em instituição pública e privada."><CanalNatureza ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="fp" area="fp" title="Turmas das instituições parceiras, pessoa a pessoa" question="Com a lista de formados que as instituições parceiras enviariam, mostra que parte de cada turma fez o primeiro registro no Crea-SP em até 3, 6, 12 e 24 meses depois da formatura." help="O resultado vale só para as instituições parceiras e não pode ser estendido a todas as de São Paulo. Quem já tinha registro antes de se formar é contado à parte. Turmas recentes ainda não têm resultado."><CoorteNominal ctx={ctx} /></Bloco>
  </div>;
}

function abrirCoorte(ctx: CockpitCtx, coorte: Coorte, chave: 'registradosEm24' | 'comAtividade' | 'ativosAdimplentes') {
  const titulos = { registradosEm24: 'registrados em 24 meses', comAtividade: 'com ART em 24 meses do registro', ativosAdimplentes: 'ativos e adimplentes 2 anos depois do registro' };
  const rows = coorte[chave]; if (!rows.length) return;
  ctx.open({ kind: 'linhas', eyebrow: `Formados em ${coorte.ano}`, title: `Concluintes de ${coorte.ano} ${titulos[chave]}`, what: 'Profissionais com este ano de conclusão informado no registro, na situação escolhida. Sem lista nominal das IES, o cruzamento é agregado por IES e ano.', listTitle: 'Profissionais, registro mais recente primeiro',
    summary: [['Concluintes', int(coorte.concluintes)], ['Registrados em 24 m', int(coorte.registradosEm24.length)], ['Com ART', int(coorte.comAtividade.length)]],
    rows: linhasProfissionais(ctx, rows, row => ({ value: `registro em ${row.registroEm.split('-').reverse().join('/')}`, note: `${ctx.formacao.porIes.find(item => item.ies.id === row.iesId)?.ies.sigla ?? row.iesId} · ${row.nivel}`, sort: -Date.parse(row.registroEm) })) });
}

function Coortes({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = ctx.formacao.coortes;
  const option = useMemo(() => ({
    grid: { top: 30, right: 8, bottom: 2, left: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex];
      return `<b>Formados em ${row.ano}</b>${row.fechada24 ? '' : ' (registro ainda em acompanhamento)'}${row.fechada24 && !row.fechada48 ? ' (atividade e permanência ainda em acompanhamento)' : ''}<br/>${int(row.concluintes)} concluintes · ${int(row.registradosEm24.length)} registrados em 24 meses<br/>Registro: <b>${row.taxaRegistro24 === null ? '—' : pct(row.taxaRegistro24, 1)}</b> · Atividade: <b>${row.taxaAtividade === null ? '—' : pct(row.taxaAtividade, 1)}</b> · Permanência: <b>${row.taxaPermanencia === null ? '—' : pct(row.taxaPermanencia, 1)}</b>`; } },
    xAxis: { type: 'category', data: rows.map(row => String(row.ano)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: [{ type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } }, { type: 'value', max: 100, splitLine: { show: false }, axisLabel: { color: tokens.muted, formatter: '{value}%' } }],
    series: [
      { name: 'Concluintes', type: 'bar', barWidth: '54%', data: rows.map(row => ({ value: row.concluintes, itemStyle: { color: row.fechada24 ? tokens.heat[1] : tokens.line, borderRadius: [3, 3, 0, 0] } })) },
      { name: 'Registrados em 24 meses', type: 'bar', barGap: '-100%', barWidth: '54%', data: rows.map(row => ({ value: row.registradosEm24.length, itemStyle: { color: row.fechada24 ? tokens.blue : tokens.muted, borderRadius: [3, 3, 0, 0] } })) },
      { name: 'Registro', type: 'line', yAxisIndex: 1, data: rows.map(row => row.fechada24 ? row.taxaRegistro24 : null), symbol: 'circle', symbolSize: 6, lineStyle: { color: tokens.ink, width: 2 }, itemStyle: { color: tokens.ink } },
      { name: 'Atividade', type: 'line', yAxisIndex: 1, data: rows.map(row => row.fechada48 ? row.taxaAtividade : null), symbol: 'diamond', symbolSize: 7, lineStyle: { color: tokens.accent, width: 2 }, itemStyle: { color: tokens.accent } },
      { name: 'Permanência', type: 'line', yAxisIndex: 1, data: rows.map(row => row.fechada48 ? row.taxaPermanencia : null), symbol: 'rect', symbolSize: 6, lineStyle: { color: tokens.good, width: 2, type: 'dashed' }, itemStyle: { color: tokens.good } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Formados, registrados e as três taxas por ano de formatura" onPick={params => { const row = rows[params.dataIndex]; if (!row) return; abrirCoorte(ctx, row, params.seriesName === 'Atividade' ? 'comAtividade' : params.seriesName === 'Permanência' ? 'ativosAdimplentes' : 'registradosEm24'); }} />;
}

function Serie({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = ctx.formacao.serie;
  const option = useMemo(() => ({
    grid: { top: 30, right: 8, bottom: 2, left: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.ano}</b><br/>Presencial: ${int(row.presencial)} · EaD: ${int(row.ead)} (${pct(row.ead / Math.max(1, row.presencial + row.ead) * 100)})<br/>Registrados até a data de referência: <b>${int(row.registrados)}</b>`; } },
    xAxis: { type: 'category', data: rows.map(row => String(row.ano)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
    series: [
      { name: 'Presencial', type: 'bar', stack: 'c', barWidth: '56%', data: rows.map(row => row.presencial), itemStyle: { color: tokens.blue } },
      { name: 'A distância (EaD)', type: 'bar', stack: 'c', data: rows.map(row => row.ead), itemStyle: { color: tokens.heat[1], borderRadius: [3, 3, 0, 0] } },
      { name: 'Registrados do mesmo ano de formatura', type: 'line', data: rows.map(row => row.registrados), smooth: 0.3, symbol: 'circle', symbolSize: 5, lineStyle: { color: tokens.ink, width: 2 }, itemStyle: { color: tokens.ink } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Formados por ano e canal, e quantos se registraram" />;
}

type ColunaIes = { key: string; label: string; get: (row: LinhaIes) => number | null; cell: (row: LinhaIes) => string };
function TabelaIes({ ctx }: { ctx: CockpitCtx }) {
  const rows = ctx.formacao.porIes, [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: 'concluintes', dir: -1 });
  const colunas: ColunaIes[] = [
    { key: 'concluintes', label: 'Concluintes', get: row => row.concluintes, cell: row => int(row.concluintes) },
    { key: 'registrados', label: 'Registrados', get: row => row.registrados, cell: row => int(row.registrados) },
    { key: 'taxa', label: 'Registro 24 m', get: row => row.taxa, cell: row => row.taxa === null ? '—' : pct(row.taxa, 1) },
    { key: 'ead', label: 'EaD', get: row => row.ead, cell: row => row.ead === null ? '—' : pct(row.ead) },
    { key: 'cadeiras', label: 'Cadeiras', get: row => row.cadeiras, cell: row => int(row.cadeiras) },
  ];
  const coluna = colunas.find(item => item.key === sort.key)!, ordenadas = [...rows].sort((a, b) => ((coluna.get(a) ?? -Infinity) - (coluna.get(b) ?? -Infinity)) * sort.dir);
  return <div className="table-wrap"><table className="metodo is-dense">
    <thead><tr><th>IES</th><th>Natureza</th>{colunas.map(item => <th key={item.key} aria-sort={sort.key === item.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}><button className="th-sort" onClick={() => setSort({ key: item.key, dir: sort.key === item.key ? (sort.dir === 1 ? -1 : 1) : -1 })}>{item.label}{sort.key === item.key && <ArrowDownUp size={10} />}</button></th>)}</tr></thead>
    <tbody>{ordenadas.map(row => <tr key={row.ies.id}><td><b>{row.ies.sigla}</b><small>{row.ies.nome} · {row.ies.tipo}</small></td><td>{row.ies.natureza}</td>{colunas.map(item => <td key={item.key} className="num">{item.cell(row)}</td>)}</tr>)}</tbody>
  </table></div>;
}

function Modalidades({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => [...ctx.formacao.porModalidade].sort((a, b) => b.concluintes - a.concluintes), [ctx.formacao]);
  const option = useMemo(() => ({
    grid: { top: 4, right: 74, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.modalidade}</b><br/>${int(row.concluintes)} concluintes · ${int(row.registrados)} registrados em 24 meses<br/>Taxa: <b>${row.taxa === null ? '—' : pct(row.taxa, 1)}</b>`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.modalidade), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5, width: 110, overflow: 'truncate' } },
    series: [{ type: 'bar', barWidth: 13, data: rows.map(row => row.concluintes), itemStyle: { color: tokens.heat[2], borderRadius: [0, 4, 4, 0] }, showBackground: true, backgroundStyle: { color: tokens.soft, borderRadius: 4 },
      label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (params: any) => { const row = rows[params.dataIndex]; return `${int(row.concluintes)} · ${row.taxa === null ? '—' : pct(row.taxa)}`; } } }],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Concluintes e taxa de registro por modalidade" />;
}

function CanalNatureza({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.formacao;
  const rows = useMemo(() => [...q.porCanal.map(row => ({ nome: row.canal, concluintes: row.concluintes, registrados: row.registrados, taxa: row.taxa, grupo: 'Canal' })), ...q.porNatureza.map(row => ({ nome: `IES ${row.natureza.toLowerCase()}`, concluintes: row.concluintes, registrados: row.registrados, taxa: row.taxa, grupo: 'Natureza' }))], [q]);
  const option = useMemo(() => ({
    grid: { top: 4, right: 60, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.nome}</b><br/>${int(row.registrados)} registrados em 24 meses de ${int(row.concluintes)} concluintes<br/>Taxa: <b>${row.taxa === null ? '—' : pct(row.taxa, 1)}</b>`; } },
    xAxis: { type: 'value', max: 100, show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: [{ type: 'bar', barWidth: 16, data: rows.map(row => ({ value: row.taxa ?? 0, itemStyle: { color: row.grupo === 'Canal' ? tokens.blue : tokens.brand, borderRadius: [0, 4, 4, 0] } })), showBackground: true, backgroundStyle: { color: tokens.soft, borderRadius: 4 },
      label: { show: true, position: 'right', color: tokens.ink, fontSize: 10.5, fontWeight: 700, formatter: (params: any) => rows[params.dataIndex].taxa === null ? '—' : pct(params.value, 1) } }],
  }), [rows, tokens]);
  return <div className="stack">
    <Chart option={option} tokens={tokens} label="Taxa de registro em 24 meses por canal e natureza da IES" />
    <p className="kpi-line">A parte média dos concluintes formados a distância (EaD) é: {q.porNatureza.map(row => `${row.natureza.toLowerCase()}, ${row.ead === null ? '—' : pct(row.ead)}`).join('; ')}. As diferenças também refletem o perfil e a região dos alunos.</p>
  </div>;
}

function CoorteNominal({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.parcerias.coorteNominal, coortes = q.coortes, prazos = [3, 6, 12, 24], cores = [tokens.soft, tokens.accent, tokens.blue, tokens.good];
  const option = useMemo(() => ({
    grid: { top: 24, right: 8, bottom: 2, left: 2, containLabel: true }, legend: { top: 0, left: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = coortes[items[0].dataIndex]; return `<b>Coorte ${row.ano}</b> · ${int(row.diplomados)} diplomados das IES parceiras<br/>${row.ate.map(item => `${item.meses} meses: ${item.fechada ? `${int(item.registrados)} (${pct(item.taxa ?? 0, 1)})` : 'ainda não fechou'}`).join('<br/>')}<br/>${int(row.registroAnterior)} com registro anterior à conclusão`; } },
    xAxis: { type: 'category', data: coortes.map(row => String(row.ano)), axisLabel: { color: tokens.muted, fontSize: 10 }, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } } },
    yAxis: { type: 'value', max: Math.min(100, Math.ceil(Math.max(5, ...coortes.flatMap(row => row.ate.map(item => item.taxa ?? 0))) * 1.25 / 5) * 5), splitLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10, formatter: '{value}%' } },
    series: prazos.map((meses, index) => ({ type: 'bar', name: `até ${meses} meses`, barGap: '10%', data: coortes.map(row => { const item = row.ate[index]; return item.fechada ? item.taxa : null; }), itemStyle: { color: cores[index], borderColor: index === 0 ? tokens.line : undefined, borderWidth: index === 0 ? 1 : 0 } })),
  }), [coortes, tokens, cores]);
  const ultima = q.ultimaFechada;
  return <div className="split is-wide">
    <div className="stack">
      <p className="kpi-line"><b>{int(q.iesParceiras)}</b> das {int(q.iesTotal)} instituições de ensino enviaram a lista com o nome dos formados{q.coberturaIes === null ? '' : ` (${pct(q.coberturaIes)})`}. {ultima ? <>Dos {int(ultima.diplomados)} diplomados de <b>{ultima.ano}</b>, último ano já acompanhado por inteiro, {pct(ultima.ate[3].taxa ?? 0, 1)} se registraram em até 24 meses ({pct(ultima.ate[2].taxa ?? 0, 1)} em até 12).</> : 'Nenhum ano de formatura foi acompanhado por inteiro ainda.'}</p>
      <Chart option={option} tokens={tokens} label="Primeiro registro em até 3, 6, 12 e 24 meses depois da formatura, nas instituições parceiras" onPick={params => { const row = coortes[params.dataIndex]; if (row?.registrados.length) ctx.open({ kind: 'linhas', eyebrow: 'Lista de formados que depende de acordo com as instituições de ensino', title: `Formados em ${row.ano} que se registraram depois de concluir o curso`, what: 'Pessoas da lista nominal autorizada das IES parceiras com primeiro registro depois do fim do ano de conclusão.', use: 'Agregado na apresentação; a lista nominal fica restrita à EDAD e à área de relacionamento.', listTitle: 'Profissionais', rows: linhasProfissionais(ctx, row.registrados, item => ({ value: item.registroEm.split('-').reverse().join('/'), note: item.iesId, sort: -Date.parse(item.registroEm) })) }); }} />
    </div>
    <ul className="side-list" aria-label="Anos já acompanhados por inteiro">
      {coortes.filter(row => row.ate[3].fechada).slice(-4).reverse().map(row => <li key={row.ano}><button disabled><i style={{ background: tokens.good }} /><span>Coorte {row.ano}<small>{int(row.diplomados)} diplomados · {int(row.registroAnterior)} já registrados antes</small></span><b>{pct(row.ate[3].taxa ?? 0, 1)}</b></button></li>)}
      <li className="side-note">Depende de um termo com cada instituição para receber a lista de formados com CPF, com finalidade amparada em lei. Os dados públicos do INEP não trazem nomes. Os números são demonstrativos.</li>
    </ul>
  </div>;
}
