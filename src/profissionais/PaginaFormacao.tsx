import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { int, pct } from '../painel/ui';
import type { Coorte } from '../domain/formacao';
import type { CockpitCtx } from '../cockpit/contexto';
import { avisoVazio, Bloco, Indicador, linhasProfissionais, proporcao } from '../cockpit/ui';

/**
 * Painel de Profissionais, página 4 (veio do painel geral em 03/11/2026): formados do Censo da Educação Superior (INEP) por
 * instituição, modalidade e canal, comparados com os registros novos no Crea-SP, por ano de formatura. Três taxas: registro em
 * até 24 meses, atividade (ART nos 12 meses antes da data escolhida) e permanência (ativo e em dia dois anos depois do registro).
 */
/** Nome da instituição sem a marca de demonstração (07/11/2026): a sigla inventada ("UE-TAU2") parecia um código. */
const DEMO = ' (demonstrativo)';

export default function PaginaFormacao({ ctx }: { ctx: CockpitCtx }) {
  const vazio = avisoVazio(!ctx.formacao.porModalidade.some(row => row.concluintes), 'Nenhum formado');
  const q = ctx.formacao, fechadas24 = q.coortes.filter(row => row.fechada24), fechadas48 = q.coortes.filter(row => row.fechada48);
  const ultima = fechadas24.at(-1), anterior = fechadas24.at(-2), ultima48 = fechadas48.at(-1), anterior48 = fechadas48.at(-2);
  const pp = (now: number | null | undefined, before: number | null | undefined) => now == null || before == null ? null : now - before;
  return <div className="ck-grid ck-grid-pf-formacao">
    <section className="ck-cards is-four" style={{ gridArea: 'kpi' }} aria-label="Indicadores de formação e registro">
      <Indicador destaque ficha="k-concluintes" ctx={ctx} label={`Formados em ${ultima?.ano ?? '—'}`} value={ultima ? int(ultima.concluintes) : '—'} variacao={{ value: ultima && anterior?.concluintes ? (ultima.concluintes - anterior.concluintes) / anterior.concluintes * 100 : null, label: `em relação aos formados em ${anterior?.ano ?? 'ano anterior'}` }} sub={ultima ? `${int(q.serie.find(row => row.ano === ultima.ano)?.ead ?? 0)} a distância; último ano acompanhado por inteiro` : 'nenhum ano acompanhado por inteiro ainda'} />
      <Indicador ficha="k-registro" ctx={ctx} label="Registro em até 24 meses" value={ultima?.taxaRegistro24 == null ? '—' : pct(ultima.taxaRegistro24, 1)} variacao={{ value: pp(ultima?.taxaRegistro24, anterior?.taxaRegistro24), kind: 'pp', label: `em relação aos formados em ${anterior?.ano ?? 'ano anterior'}` }} sub={ultima ? `${proporcao(ultima.registradosEm24.length, ultima.concluintes, 1)} dos formados em ${ultima.ano}` : ''} onOpen={() => ultima && abrirCoorte(ctx, ultima, 'registradosEm24')} />
      <Indicador ficha="k-atividade" ctx={ctx} label="Registraram ART no último ano" value={ultima?.taxaAtividade == null ? '—' : pct(ultima.taxaAtividade, 1)} variacao={{ value: pp(ultima?.taxaAtividade, anterior?.taxaAtividade), kind: 'pp', label: `em relação aos formados em ${anterior?.ano ?? 'ano anterior'}` }} sub={ultima ? `${proporcao(ultima.comAtividade.length, ultima.registradosEm24.length)} dos registrados que se formaram em ${ultima.ano}` : ''} onOpen={() => ultima && abrirCoorte(ctx, ultima, 'comAtividade')} />
      <Indicador ficha="k-permanencia" ctx={ctx} label="Ativos e em dia 2 anos depois" value={ultima48?.taxaPermanencia == null ? '—' : pct(ultima48.taxaPermanencia, 1)} variacao={{ value: pp(ultima48?.taxaPermanencia, anterior48?.taxaPermanencia), kind: 'pp', label: `em relação aos formados em ${anterior48?.ano ?? 'ano anterior'}` }} sub={ultima48 ? `${proporcao(ultima48.ativosAdimplentes.length, ultima48.registradosEm24.length)} dos registrados que se formaram em ${ultima48.ano}` : ''} onOpen={() => ultima48 && abrirCoorte(ctx, ultima48, 'ativosAdimplentes')} />
    </section>
    <Bloco ctx={ctx} vazio={vazio} id="fc" area="fc" title="Formados e quantos se registram" question="Para cada ano de formatura (dados do INEP), quantos se formaram (barra clara), quantos se registraram em até 24 meses (barra escura) e a parte que isso representa (linha)." help="Os anos marcados “em curso” ainda não completaram 24 meses e ficam fora da comparação. A atividade (ART) e a permanência dos registrados estão nos cartões do alto. Clique numa barra para ver os profissionais."><Coortes ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} vazio={vazio} id="fi" area="fi" title="Registro por instituição de ensino" question="Cada ponto é uma instituição: quantos se formaram nela (para a direita, mais formados) e que parte se registrou em até 24 meses (para cima, mais registro), somando os anos já acompanhados por inteiro. Azul é pública; laranja, privada." help="A taxa varia mais nas instituições pequenas. O gráfico só descreve e não é um ranking oficial. Clique num ponto para ver os registrados da instituição."><Instituicoes ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} vazio={vazio} id="fm" area="fm" title="Formados e registrados, por modalidade" question="Formados e parte registrada em até 24 meses em cada modalidade, nos anos já acompanhados por inteiro."><Modalidades ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} vazio={vazio} id="fs" area="fs" title="Formados por ano, presencial e a distância" question="Quantos se formaram em cada ano em cursos presenciais e a distância, segundo o Censo da Educação Superior. Em cima de cada barra, a parte que estudou a distância."><Serie ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} vazio={vazio} id="fn" area="fn" title="Registro em 24 meses, por instituição e canal" question="Em cada tipo de instituição (pública ou privada), a parte dos formados que se registrou no Crea-SP em até 24 meses, separando quem estudou presencialmente (azul) e a distância (amarelo). No alto, à direita, a parte de todos os formados juntos." help="As diferenças também refletem o perfil e a região dos alunos."><CanalNatureza ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} vazio={vazio} id="fp" area="fp" title="Turmas das instituições parceiras, pessoa a pessoa" question="Com a lista de formados que as instituições parceiras enviariam, mostra que parte de cada turma fez o primeiro registro no Crea-SP em até 12 e em até 24 meses depois da formatura." help="O resultado vale só para as instituições parceiras e não pode ser estendido a todas as de São Paulo. Quem já tinha registro antes de se formar é contado à parte. Turmas recentes ainda não têm resultado."><CoorteNominal ctx={ctx} /></Bloco>
  </div>;
}

function abrirCoorte(ctx: CockpitCtx, coorte: Coorte, chave: 'registradosEm24' | 'comAtividade' | 'ativosAdimplentes') {
  const titulos = { registradosEm24: 'que se registraram em até 24 meses', comAtividade: 'que registraram ART no último ano', ativosAdimplentes: 'ativos e em dia 2 anos depois do registro' };
  const rows = coorte[chave]; if (!rows.length) return;
  ctx.open({ kind: 'linhas', eyebrow: `Formados em ${coorte.ano}`, title: `Formados em ${coorte.ano} ${titulos[chave]}`, what: 'Profissionais com este ano de formatura informado no registro, na situação escolhida. Sem a lista nominal das instituições, a comparação é feita em totais por instituição e ano.', listTitle: 'Profissionais, registro mais recente primeiro',
    summary: [['Formados', int(coorte.concluintes)], ['Registrados em 24 meses', int(coorte.registradosEm24.length)], ['Com ART no último ano', int(coorte.comAtividade.length)]],
    rows: linhasProfissionais(ctx, rows, row => ({ value: `registro em ${row.registroEm.split('-').reverse().join('/')}`, note: `${ctx.formacao.porIes.find(item => item.ies.id === row.iesId)?.ies.nome.replace(DEMO, '') ?? row.iesId} · ${row.nivel}`, sort: -Date.parse(row.registroEm) })) });
}

function Coortes({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = ctx.formacao.coortes;
  const option = useMemo(() => ({
    grid: { top: 26, right: 4, bottom: 2, left: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, itemGap: 8, textStyle: { color: tokens.muted, fontSize: 11 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex];
      return `<b>Formados em ${row.ano}</b>${row.fechada24 ? '' : ' (registro ainda em acompanhamento)'}${row.fechada24 && !row.fechada48 ? ' (permanência ainda em acompanhamento)' : ''}<br/>${int(row.concluintes)} formados · ${int(row.registradosEm24.length)} registrados em 24 meses<br/>Registro: <b>${row.taxaRegistro24 === null ? '—' : pct(row.taxaRegistro24, 1)}</b> · ART no último ano: <b>${row.taxaAtividade === null ? '—' : pct(row.taxaAtividade, 1)}</b> · Permanência: <b>${row.fechada48 && row.taxaPermanencia !== null ? pct(row.taxaPermanencia, 1) : '—'}</b>`; } },
    xAxis: { type: 'category', data: rows.map(row => row.fechada24 ? String(row.ano) : `${row.ano}\n(em curso)`), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 11, lineHeight: 12 } },
    yAxis: [{ type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } }, { type: 'value', max: 100, splitLine: { show: false }, axisLabel: { color: tokens.muted, formatter: '{value}%' } }],
    series: [
      { name: 'Formados', type: 'bar', barWidth: '54%', itemStyle: { color: tokens.heat[1] }, data: rows.map(row => ({ value: row.concluintes, itemStyle: { color: row.fechada24 ? tokens.heat[1] : tokens.line, borderRadius: [3, 3, 0, 0] } })) },
      { name: 'Registrados em 24 meses', type: 'bar', barGap: '-100%', barWidth: '54%', itemStyle: { color: tokens.blue }, data: rows.map(row => ({ value: row.registradosEm24.length, itemStyle: { color: row.fechada24 ? tokens.blue : tokens.muted, borderRadius: [3, 3, 0, 0] } })) },
      { name: 'Parte que se registrou', type: 'line', yAxisIndex: 1, data: rows.map(row => row.fechada24 ? row.taxaRegistro24 : null), symbol: 'circle', symbolSize: 6, lineStyle: { color: tokens.accent, width: 2 }, itemStyle: { color: tokens.accent }, label: { show: true, position: 'top', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (item: any) => item.value === null ? '' : pct(item.value) } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Formados e quantos se registraram em até 24 meses, por ano de formatura" onPick={params => { const row = rows[params.dataIndex]; if (!row) return; abrirCoorte(ctx, row, 'registradosEm24'); }} />;
}

/** Dispersão: cada instituição pelo número de formados e pela parte registrada em até 24 meses, com a média como referência. */
function Instituicoes({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = ctx.formacao.porIes.filter(row => row.taxa !== null);
  const media = (() => { const c = rows.reduce((t, row) => t + row.concluintes, 0), r = rows.reduce((t, row) => t + row.registrados, 0); return c ? r / c * 100 : null; })();
  const maiorIes = Math.max(1, ...rows.map(row => row.concluintes));
  // Só três rótulos, para não encavalar: a maior instituição, a de maior registro e a de menor registro.
  const destaques = new Set([[...rows].sort((a, b) => b.concluintes - a.concluintes)[0], [...rows].sort((a, b) => b.taxa! - a.taxa!)[0], [...rows].sort((a, b) => a.taxa! - b.taxa!)[0]].filter(Boolean));
  const option = useMemo(() => ({
    grid: { top: 26, right: 14, bottom: 22, left: 4, containLabel: true },
    title: { text: '{a|●} pública   {b|●} privada', right: 6, top: 0, textStyle: { fontSize: 11, fontWeight: 400, color: tokens.muted, rich: { a: { color: tokens.blue, fontSize: 11 }, b: { color: tokens.accent, fontSize: 11 } } } },
    tooltip: { trigger: 'item', formatter: (item: any) => { const row = rows[item.dataIndex]; return `<b>${row.ies.nome}</b><br/>${row.ies.natureza} · ${int(row.concluintes)} formados · ${int(row.registrados)} registrados em 24 meses<br/>Registro: <b>${pct(row.taxa!, 1)}</b>${row.ead ? ` · ${pct(row.ead)} a distância` : ''}<br/><span style="opacity:.75">clique para ver os registrados</span>`; } },
    xAxis: { type: 'value', name: 'formados', nameLocation: 'middle', nameGap: 18, nameTextStyle: { color: tokens.muted, fontSize: 11 }, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 11 } },
    yAxis: { type: 'value', min: 0, name: 'registrados em 24 meses', nameTextStyle: { color: tokens.muted, fontSize: 11, align: 'left' }, nameGap: 6, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 11, formatter: '{value}%' } },
    series: [{ type: 'scatter', symbolSize: 10, data: rows.map(row => ({ value: [row.concluintes, row.taxa], label: { position: row.concluintes > maiorIes * 0.6 ? 'left' : 'right' }, itemStyle: { color: row.ies.natureza === 'Pública' ? tokens.blue : tokens.accent, opacity: 0.85, borderColor: tokens.surface, borderWidth: 1 } })),
      label: { show: true, position: 'right', fontSize: 11, color: tokens.muted, formatter: (item: any) => { const row = rows[item.dataIndex]; return destaques.has(row) ? row.ies.nome.replace(DEMO, '') : ''; } },
      markLine: media === null ? undefined : { silent: true, symbol: 'none', lineStyle: { color: tokens.ink, type: 'dashed', width: 1 }, label: { position: 'insideStartTop', color: tokens.muted, fontSize: 11, formatter: `média ${pct(media, 1)}` }, data: [{ yAxis: media }] } }],
  }), [rows, media, tokens, destaques]);
  return <Chart option={option} tokens={tokens} label="Instituições de ensino por formados e parte registrada" onPick={params => { const row = rows[params.dataIndex]; if (!row) return;
    const ids = new Set(ctx.formacao.coortes.filter(c => c.fechada24).flatMap(c => c.registradosEm24.filter(p => p.iesId === row.ies.id)));
    ctx.open({ kind: 'linhas', eyebrow: row.ies.nome, title: `${row.ies.nome.replace(DEMO, '')}: formados que se registraram em até 24 meses`, what: 'Profissionais que informaram esta instituição no registro e se registraram em até 24 meses depois da formatura, nos anos já acompanhados por inteiro.', listTitle: 'Profissionais',
      summary: [['Formados', int(row.concluintes)], ['Registrados', int(row.registrados)], ['Cadeiras no plenário', int(row.cadeiras)]],
      rows: linhasProfissionais(ctx, [...ids], p => ({ value: `formado em ${p.anoConclusao}`, note: `registro em ${p.registroEm.split('-').reverse().join('/')}`, sort: -Date.parse(p.registroEm) })) }); }} />;
}

function Modalidades({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => [...ctx.formacao.porModalidade].sort((a, b) => b.concluintes - a.concluintes), [ctx.formacao]);
  const option = useMemo(() => ({
    grid: { top: 24, right: 110, bottom: 2, left: 2, containLabel: true }, legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, data: ['Formados', 'Registrados em 24 meses'], textStyle: { color: tokens.muted, fontSize: 11 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.modalidade}</b><br/>${int(row.concluintes)} formados · ${int(row.registrados)} registrados em 24 meses<br/>Registro: <b>${row.taxa === null ? '—' : pct(row.taxa, 1)}</b>`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.modalidade), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11, width: 110, overflow: 'truncate' } },
    series: [
      { name: 'Formados', type: 'bar', barWidth: '56%', data: rows.map(row => row.concluintes), itemStyle: { color: tokens.heat[1], borderRadius: [0, 4, 4, 0] } },
      { name: 'Registrados em 24 meses', type: 'bar', barWidth: '56%', barGap: '-100%', data: rows.map(row => row.registrados), itemStyle: { color: tokens.blue, borderRadius: [0, 4, 4, 0] },
      },
      { type: 'bar', barWidth: '56%', barGap: '-100%', data: rows.map(row => row.concluintes), itemStyle: { color: 'transparent' }, silent: true, // A parte registrada vai à direita da barra, em tinta (07/11/2026): dentro da barra azul curta, o branco caía sobre o azul-claro.
        label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, formatter: (params: any) => { const row = rows[params.dataIndex]; return `${int(params.value)} · {b|${row.taxa === null ? '—' : pct(row.taxa)} registrados}`; }, rich: { b: { color: tokens.ink, fontSize: 11, fontWeight: 700 } } } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Formados e parte registrada por modalidade" />;
}

function Serie({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = ctx.formacao.serie;
  const option = useMemo(() => ({
    grid: { top: 26, right: 6, bottom: 2, left: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, itemGap: 8, textStyle: { color: tokens.muted, fontSize: 11 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.ano}</b><br/>Presencial: ${int(row.presencial)} · a distância: ${int(row.ead)} (${pct(row.ead / Math.max(1, row.presencial + row.ead) * 100)})`; } },
    xAxis: { type: 'category', data: rows.map(row => String(row.ano)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 11 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
    series: [
      { name: 'Presencial', type: 'bar', stack: 'c', barWidth: '56%', data: rows.map(row => row.presencial), itemStyle: { color: tokens.blue } },
      { name: 'A distância', type: 'bar', stack: 'c', data: rows.map(row => row.ead), itemStyle: { color: tokens.heat[1], borderRadius: [3, 3, 0, 0] },
        label: { show: true, position: 'top', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (item: any) => { const row = rows[item.dataIndex]; return `${pct(row.ead / Math.max(1, row.presencial + row.ead) * 100)} EaD`; } } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Formados por ano, presencial e a distância" />;
}

/** Canal cruzado com a natureza: para cada tipo de instituição, a parte registrada de quem estudou presencialmente e a distância, com a média geral. */
function CanalNatureza({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.formacao, naturezas = ['Pública', 'Privada'], canais = [{ id: 'Presencial', nome: 'Presencial', cor: tokens.blue }, { id: 'EaD', nome: 'A distância', cor: tokens.accent }];
  // Grupo com menos de 50 formados fica sem barra: a parte registrada de um grupo tão pequeno varia demais (e o canal do registrado é estimado).
  const MINIMO = 50, celula = (natureza: string, canal: string) => q.porCanalNatureza.find(row => row.natureza === natureza && row.canal === canal);
  const taxaDe = (natureza: string, canal: string) => { const c = celula(natureza, canal); return c && c.concluintes >= MINIMO ? c.taxa : null; };
  const option = useMemo(() => ({
    grid: { top: 30, right: 8, bottom: 2, left: 4, containLabel: true }, legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 11 } },
    title: q.taxaGeral === null ? undefined : { text: `todos os formados juntos: ${pct(q.taxaGeral, 1)}`, right: 4, top: 0, textStyle: { color: tokens.muted, fontSize: 11, fontWeight: 400 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const natureza = naturezas[items[0].dataIndex];
      return `<b>Instituição ${natureza.toLowerCase()}</b><br/>${canais.map(canal => { const c = celula(natureza, canal.id); return !c ? '' : c.concluintes < MINIMO ? `${canal.nome}: só ${int(c.concluintes)} formados, poucos para medir` : `${canal.nome}: <b>${c.taxa === null ? '—' : pct(c.taxa, 1)}</b> registrados em 24 meses (${int(c.registrados)} de ${int(c.concluintes)} formados)`; }).join('<br/>')}`; } },
    xAxis: { type: 'category', data: naturezas.map(row => `Instituição ${row.toLowerCase()}`), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    yAxis: { type: 'value', min: 0, max: (value: { max: number }) => Math.ceil(value.max * 1.3 / 5) * 5, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 11, formatter: '{value}%' } },
    series: canais.map((canal, index) => ({ name: canal.nome, type: 'bar', barWidth: '30%', barGap: '12%', itemStyle: { color: canal.cor, borderRadius: [4, 4, 0, 0] },
      data: naturezas.map(natureza => taxaDe(natureza, canal.id) ?? { value: 0, poucos: true, itemStyle: { color: 'transparent' } }),
      label: { show: true, position: 'top', color: tokens.ink, fontSize: 11, fontWeight: 800, lineHeight: 13, formatter: (item: any) => { const c = celula(naturezas[item.dataIndex], canal.id); if (!c) return ''; return c.concluintes < MINIMO ? `{n|${canal.nome.toLowerCase()}:\npoucos formados}` : c.taxa === null ? '' : `${pct(c.taxa, 1)}\n{n|${int(c.concluintes)} formados}`; }, rich: { n: { fontSize: 11, fontWeight: 400, color: tokens.muted } } } })),
  }), [q, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Parte registrada em até 24 meses por natureza da instituição e canal de ensino" />;
}

function CoorteNominal({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.parcerias.coorteNominal, coortes = q.coortes, prazos = [12, 24], cores = [tokens.heat[1], tokens.blue];
  const option = useMemo(() => ({
    grid: { top: 24, right: 6, bottom: 2, left: 2, containLabel: true }, legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 11 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = coortes[items[0].dataIndex]; return `<b>Formados em ${row.ano}</b> · ${int(row.diplomados)} das instituições parceiras<br/>${row.ate.map(item => `até ${item.meses} meses: ${item.fechada ? `${int(item.registrados)} (${pct(item.taxa ?? 0, 1)})` : 'ainda em acompanhamento'}`).join('<br/>')}<br/>${int(row.registroAnterior)} já tinham registro antes de se formar<br/><span style="opacity:.75">clique para ver</span>`; } },
    xAxis: { type: 'category', data: coortes.map(row => String(row.ano)), axisLabel: { color: tokens.muted, fontSize: 11 }, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } } },
    yAxis: { type: 'value', max: Math.min(100, Math.ceil(Math.max(5, ...coortes.flatMap(row => row.ate.map(item => item.taxa ?? 0))) * 1.25 / 5) * 5), splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 11, formatter: '{value}%' } },
    series: prazos.map((meses, index) => ({ type: 'bar', name: `registrados em até ${meses} meses`, barGap: '10%', barWidth: '30%', data: coortes.map(row => { const item = row.ate.find(entry => entry.meses === meses); return item?.fechada ? item.taxa : null; }), itemStyle: { color: cores[index], borderRadius: [3, 3, 0, 0] },
      label: { show: index === 1, position: 'top', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (item: any) => item.value === null ? '' : pct(item.value) } })),
  }), [coortes, tokens, cores]);
  return <Chart option={option} tokens={tokens} label="Primeiro registro em até 12 e 24 meses depois da formatura, nas instituições parceiras" onPick={params => { const row = coortes[params.dataIndex]; if (row?.registrados.length) ctx.open({ kind: 'linhas', eyebrow: 'Lista de formados que depende de acordo com as instituições de ensino', title: `Formados em ${row.ano} que se registraram depois da formatura`, what: 'Pessoas da lista de formados das instituições parceiras com o primeiro registro depois do fim do ano de formatura.', use: 'No painel, só os totais. A lista com nomes fica restrita à equipe de dados e à área de relacionamento com as instituições.', listTitle: 'Profissionais', rows: linhasProfissionais(ctx, row.registrados, item => ({ value: item.registroEm.split('-').reverse().join('/'), note: item.iesId, sort: -Date.parse(item.registroEm) })) }); }} />;
}
