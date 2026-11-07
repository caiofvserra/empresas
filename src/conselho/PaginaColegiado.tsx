import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { int, mes, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador } from '../cockpit/ui';
import type { Exportavel } from '../cockpit/ui';
import type { Evolucao } from '../painel/evolucao';
import { alertaNoStatus, statusPendentes } from '../domain/colegiado';
import type { Pendente } from '../domain/colegiado';
import { change, eixoCategoria, eixoValor, legenda } from '../gestao/comum';
import { abrirMembros, abrirPendentes, abrirTramitacoes, decimal, diasOu, q } from './comum';

/**
 * Painel de Gestão do Conselho, página 1 (07/11/2026): quem está no colegiado, quantos processos esperam voto, com quem eles estão,
 * em que status do Votenet, quanto o colegiado pauta e vota por mês e o caminho do processo até a multa paga.
 */
export default function PaginaColegiado({ ctx }: { ctx: CockpitCtx }) {
  const c = q(ctx), { tokens } = ctx;
  const series = useMemo(() => {
    const meses = c.mensal.map(row => row.month);
    return { pendentes: { tipo: 'estoque', meses, valores: c.mensal.map(row => row.pendentes), fmt: int, goodUp: false } as Evolucao, votados: { tipo: 'fluxo', meses, valores: c.mensal.map(row => row.votados), fmt: int } as Evolucao };
  }, [c]);
  const comConselheiro = c.pendentes.filter(row => c.pessoas.get(row.evento.com)?.papel === 'Conselheiro');
  const maior = c.posse.find(row => row.pessoa.papel === 'Conselheiro'), media = c.membros.length ? comConselheiro.length / c.membros.length : null;
  const aguardando = c.porStatus['Aguardando distribuição'].length, ano = ctx.anchor.slice(0, 4);
  return <div className="ck-grid ck-grid-cs-colegiado">
    <section className="ck-cards is-six" style={{ gridArea: 'kpi' }} aria-label="Indicadores do colegiado">
      <Indicador destaque ficha="k-membros" ctx={ctx} label="Conselheiros em exercício" value={int(c.membros.length)} sub={`indicados por ${int(c.organizacoes.entidades)} entidades de classe e ${int(c.organizacoes.escolas)} escolas`}
        onOpen={() => abrirMembros(ctx, 'Conselheiros em exercício', [...c.membros].sort((a, b) => a.nome.localeCompare(b.nome)), 'Conselheiros com mandato na data escolhida, com a câmara, a organização que indicou e o terço do mandato.')} />
      <Indicador ficha="k-pendentes" ctx={ctx} label="Processos esperando voto" serie={series.pendentes} value={int(c.pendentes.length)} variacao={{ value: change(c.pendentes.length, c.pendentesAntes), goodUp: false, label: 'em relação a um ano antes' }}
        spark={c.mensal.slice(-12).map(row => row.pendentes)} cor={tokens.accent} sub={`${int(aguardando)} ainda aguardam distribuição`}
        onOpen={() => abrirPendentes(ctx, 'Processos esperando voto', c.pendentes, 'Processos que entraram no colegiado e ainda não foram votados, na data escolhida, com o status do Votenet e quem está com cada um.')} />
      <Indicador ficha="k-media" ctx={ctx} label="Processos por conselheiro" value={media === null ? '—' : decimal(media)} sub={maior ? `o maior: ${maior.pessoa.nome}, com ${int(maior.pendentes.length)}` : 'nenhum processo com conselheiro'} />
      <Indicador ficha="k-votados" ctx={ctx} label="Votados no período" serie={series.votados} value={int(c.votados.length)} variacao={{ value: change(c.votados.length, c.votadosAntes) }}
        sub={`${int(c.votados.filter(t => t.instancia === 'Plenário').length)} deles no Plenário, em recurso`} onOpen={() => abrirTramitacoes(ctx, 'Votados no período', c.votados, 'Processos votados no período escolhido, nas câmaras e no Plenário.')} />
      <Indicador ficha="k-decisao" ctx={ctx} label="Da abertura à decisão" value={diasOu(c.tempoDecisao)} variacao={{ value: c.tempoDecisao === null || c.tempoDecisaoAntes === null ? null : change(c.tempoDecisao, c.tempoDecisaoAntes), goodUp: false }}
        sub="mediana dos votados na câmara, da abertura no GovAdm" />
      <Indicador ficha="k-anteriores" ctx={ctx} label="De exercícios anteriores" value={int(c.deExerciciosAnteriores.length)} sub={`${c.pendentes.length ? pct(c.deExerciciosAnteriores.length / c.pendentes.length * 100) : '—'} dos pendentes entraram antes de ${ano}`}
        onOpen={() => abrirPendentes(ctx, `Pendentes que entraram antes de ${ano}`, c.deExerciciosAnteriores, `Processos ainda sem voto que entraram no colegiado antes de 1º de janeiro de ${ano}: o marco do Confea para os pendentes de exercícios anteriores.`)} />
    </section>
    <Bloco ctx={ctx} id="po" area="po" title="Com quem estão os processos" exportar={exportarPosse(ctx)}><Posse ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="st" area="st" title="Em que status do Votenet" exportar={exportarStatus(ctx)}><Status ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="tc" area="tc" title="Terços do mandato" exportar={exportarTercos(ctx)}><Tercos ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="me" area="me" title="Pautados e votados por mês" exportar={exportarMensal(ctx)}><Mensal ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ca" area="ca" title="O caminho do processo no período" exportar={exportarCaminho(ctx)}><Caminho ctx={ctx} /></Bloco>
  </div>;
}

/* ---------- Com quem estão os processos: as dez pessoas com mais processos, pelo alerta ---------- */
const faixasAlerta = ['até 90 dias no status', '90 a 120 dias', 'mais de 120 dias'] as const;
const porAlerta = (rows: Pendente[]) => [rows.filter(row => !alertaNoStatus(row.diasNoStatus)), rows.filter(row => alertaNoStatus(row.diasNoStatus) === 'amarelo'), rows.filter(row => alertaNoStatus(row.diasNoStatus) === 'vermelho')];
const exportarPosse = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Pessoa', 'Papel', 'Onde', 'Processos', ...faixasAlerta, 'Há mais de 1 ano no total'], linhas: () => q(ctx).posse.map(row => [row.pessoa.nome, row.pessoa.papel, row.pessoa.detalhe, row.pendentes.length, ...porAlerta(row.pendentes).map(rows => rows.length), row.pendentes.filter(p => p.diasTotais > 365).length]) });
function Posse({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, c = q(ctx), rows = c.posse.slice(0, 10), cores = [tokens.blue, tokens.warn, tokens.bad];
  const option = useMemo(() => ({
    grid: { top: 24, right: 34, bottom: 2, left: 2, containLabel: true }, legend: { ...legenda(tokens), data: [...faixasAlerta] },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex], partes = porAlerta(row.pendentes); return `<b>${row.pessoa.nome}</b> · ${row.pessoa.papel.toLowerCase()}<br/><span style="opacity:.8">${row.pessoa.detalhe}</span><br/>${faixasAlerta.map((f, i) => `${f}: ${int(partes[i].length)}`).join('<br/>')}<br/><span style="opacity:.7">clique para ver os processos</span>`; } },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => row.pessoa.id), axisTick: { show: false }, axisLine: { show: false },
      axisLabel: { fontSize: 10.5, formatter: (id: string) => { const row = rows.find(r => r.pessoa.id === id)!; return `{n|${row.pessoa.nome}}\n{p|${row.pessoa.papel === 'Funcionário' ? 'funcionário' : 'conselheiro'} · ${row.pessoa.detalhe.split(',')[0]}}`; }, rich: { n: { color: tokens.ink, fontSize: 10.5, fontWeight: 700 }, p: { color: tokens.muted, fontSize: 9 } } } },
    series: faixasAlerta.map((faixa, index) => ({ name: faixa, type: 'bar', stack: 'p', barWidth: 12, data: rows.map(row => porAlerta(row.pendentes)[index].length), itemStyle: { color: cores[index], borderColor: tokens.surface, borderWidth: 1 },
      label: { show: true, position: 'inside', color: index === 1 ? '#1A202C' : '#FFFFFF', fontSize: 9.5, fontWeight: 700, formatter: (params: any) => params.value || '' } }))
      .concat([{ name: 'total', type: 'bar', stack: 'p', barWidth: 12, data: rows.map(() => 0), itemStyle: { color: 'transparent' }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 10.5, fontWeight: 800, formatter: (params: any) => int(rows[params.dataIndex].pendentes.length) } } as any]),
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!rows.length) return <div className="empty-note">Nenhum processo esperando voto neste recorte.</div>;
  return <div className="cs-com-nota">
    <Chart option={option} tokens={tokens} label="As dez pessoas com mais processos esperando voto, pelo tempo no status" onPick={params => { const row = rows[params.dataIndex]; if (!row) return; const partes = porAlerta(row.pendentes), lista = params.seriesIndex < 3 ? partes[params.seriesIndex] : row.pendentes;
      abrirPendentes(ctx, `Com ${row.pessoa.nome}`, lista, `Processos esperando voto que estão com ${row.pessoa.nome} (${row.pessoa.papel.toLowerCase()}, ${row.pessoa.detalhe}).`, 'Os parados há mais tempo primeiro.'); }} />
    <p className="cs-nota"><button className="cs-link" onClick={() => ctx.open({ kind: 'linhas', title: 'Com quem estão os processos', what: 'Todas as pessoas com processos esperando voto, conselheiros e funcionários, com o número de processos e quantos estão em alerta.', listTitle: 'Pessoas, mais processos primeiro',
      summary: [['Pessoas', int(c.posse.length)], ['Conselheiros', int(c.posse.filter(row => row.pessoa.papel === 'Conselheiro').length)], ['Funcionários', int(c.posse.filter(row => row.pessoa.papel === 'Funcionário').length)]],
      rows: c.posse.map(row => { const partes = porAlerta(row.pendentes); return { key: row.pessoa.id, title: row.pessoa.nome, subtitle: `${row.pessoa.papel} · ${row.pessoa.detalhe}`, value: `${int(row.pendentes.length)} processos`, note: `${int(partes[2].length)} em alerta vermelho, ${int(partes[1].length)} em amarelo`, sortValue: -row.pendentes.length }; }) })}>
      Ver as {int(c.posse.length)} pessoas</button> · <b>{int(c.posse.filter(row => row.pessoa.papel === 'Funcionário').reduce((n, row) => n + row.pendentes.length, 0))}</b> processos estão com funcionários</p>
  </div>;
}

/* ---------- Status do Votenet ---------- */
const exportarStatus = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Status', 'Processos', 'Em alerta vermelho', 'Em alerta amarelo'], linhas: () => statusPendentes.map(s => { const rows = q(ctx).porStatus[s]; return [s, rows.length, rows.filter(r => alertaNoStatus(r.diasNoStatus) === 'vermelho').length, rows.filter(r => alertaNoStatus(r.diasNoStatus) === 'amarelo').length]; }) });
function Status({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, c = q(ctx), cores = [tokens.muted, tokens.brand, tokens.blue, tokens.heat[2], tokens.good, tokens.accent, tokens.warn, tokens.bad];
  const dados = statusPendentes.map((status, index) => ({ name: status, value: c.porStatus[status].length, itemStyle: { color: cores[index] } })).filter(row => row.value > 0);
  const option = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (item: any) => `<b>${item.name}</b><br/>${int(item.value)} processos (${pct(item.percent)})<br/><span style="opacity:.7">clique para ver os processos</span>` },
    series: [{ type: 'pie', radius: ['42%', '66%'], center: ['50%', '54%'], data: dados, itemStyle: { borderColor: tokens.surface, borderWidth: 2 }, minAngle: 4,
      label: { color: tokens.ink, fontSize: 9.5, formatter: (item: any) => `{n|${item.name}}\n{v|${int(item.value)}} {p|${pct(item.percent)}}`, rich: { n: { color: tokens.muted, fontSize: 9.5 }, v: { color: tokens.ink, fontWeight: 800, fontSize: 11 }, p: { color: tokens.muted, fontSize: 9 } } },
      labelLine: { length: 6, length2: 6 }, labelLayout: { hideOverlap: true } }],
    graphic: [{ type: 'text', left: 'center', top: '48%', style: { text: int(c.pendentes.length), fill: tokens.ink, font: '800 18px Raleway, Lato, sans-serif', align: 'center' } }, { type: 'text', left: 'center', top: '57%', style: { text: 'esperam voto', fill: tokens.muted, font: '10px Lato, sans-serif', align: 'center' } }],
  }), [dados, tokens, c.pendentes.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!dados.length) return <div className="empty-note">Nenhum processo esperando voto neste recorte.</div>;
  return <Chart option={option} tokens={tokens} label="Processos esperando voto por status do Votenet" onPick={params => { const rows = c.porStatus[params.name as keyof typeof c.porStatus]; if (rows) abrirPendentes(ctx, `Status: ${params.name}`, rows, `Processos esperando voto que estão no status "${params.name}" do Votenet, na data escolhida.`); }} />;
}

/* ---------- Terços do mandato ---------- */
const exportarTercos = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Mandato', 'Indicados por entidades de classe', 'Indicados por escolas', 'Total'], linhas: () => q(ctx).tercos.map(row => [row.terco, row.entidades.length, row.escolas.length, row.entidades.length + row.escolas.length]) });
function Tercos({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = q(ctx).tercos, ano = Number(ctx.anchor.slice(0, 4));
  const option = useMemo(() => ({
    grid: { top: 24, right: 96, bottom: 2, left: 2, containLabel: true }, legend: { ...legenda(tokens), data: ['Entidades de classe', 'Escolas'] },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>Mandato de ${row.terco}</b><br/>${int(row.entidades.length)} indicados por entidades de classe<br/>${int(row.escolas.length)} indicados por escolas`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.terco), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5, fontWeight: 700 } },
    series: [
      { name: 'Entidades de classe', type: 'bar', stack: 't', barWidth: 16, data: rows.map(row => row.entidades.length), itemStyle: { color: tokens.brand }, label: { show: true, position: 'inside', color: '#FFFFFF', fontSize: 10, fontWeight: 700 } },
      { name: 'Escolas', type: 'bar', stack: 't', barWidth: 16, data: rows.map(row => row.escolas.length), itemStyle: { color: tokens.accent, borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'inside', color: '#1A202C', fontSize: 10, fontWeight: 700 } },
      { name: 'fim', type: 'bar', stack: 't', barWidth: 16, data: rows.map(() => 0), itemStyle: { color: 'transparent' }, label: { show: true, position: 'right', fontSize: 9.5, color: tokens.muted, formatter: (params: any) => { const fim = Number(rows[params.dataIndex].terco.slice(-4)); return fim === ano ? `{a|termina em dez/${fim}}` : `termina em dez/${fim}`; }, rich: { a: { color: tokens.bad, fontWeight: 700, fontSize: 9.5 } } } },
    ],
  }), [rows, tokens, ano]);
  return <Chart option={option} tokens={tokens} label="Conselheiros por terço do mandato e natureza da organização que indicou" onPick={params => { const row = rows[params.dataIndex]; if (!row) return; const lista = params.seriesIndex === 0 ? row.entidades : params.seriesIndex === 1 ? row.escolas : [...row.entidades, ...row.escolas];
    abrirMembros(ctx, `Mandato de ${row.terco}`, [...lista].sort((a, b) => a.camara.localeCompare(b.camara) || a.nome.localeCompare(b.nome)), `Conselheiros com mandato de ${row.terco}. Um terço do Plenário se renova a cada ano.`); }} />;
}

/* ---------- Pautados e votados por mês ---------- */
const exportarMensal = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Mês', 'Idas à pauta', 'Votados', 'Votados no mesmo mês um ano antes', 'Esperando voto no fim do mês'], linhas: () => q(ctx).mensal.map(row => [mes(row.month), row.pautados, row.votados, row.votadosAntes, row.pendentes]) });
function Mensal({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = q(ctx).mensal.slice(-12);
  const option = useMemo(() => ({
    grid: { top: 26, right: 6, bottom: 2, left: 4, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${mes(row.month)}</b><br/>${int(row.pautados)} idas à pauta · ${int(row.votados)} votados<br/>um ano antes: ${int(row.votadosAntes)} votados<br/>${int(row.pendentes)} esperando voto no fim do mês`; } },
    xAxis: eixoCategoria(tokens, rows.map(row => mes(row.month))), yAxis: eixoValor(tokens),
    series: [
      { name: 'Idas à pauta', type: 'bar', barWidth: '30%', data: rows.map(row => row.pautados), itemStyle: { color: tokens.heat[1], borderRadius: [2, 2, 0, 0] }, label: { show: true, position: 'top', color: tokens.muted, fontSize: 8.5 } },
      { name: 'Votados', type: 'bar', barWidth: '30%', data: rows.map(row => row.votados), itemStyle: { color: tokens.brand, borderRadius: [2, 2, 0, 0] }, label: { show: true, position: 'top', color: tokens.ink, fontSize: 8.5, fontWeight: 700 } },
      { name: 'Votados um ano antes', type: 'line', data: rows.map(row => row.votadosAntes), symbol: 'circle', symbolSize: 4, lineStyle: { color: tokens.muted, type: 'dashed', width: 1.6 }, itemStyle: { color: tokens.muted } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Idas à pauta e processos votados por mês, com os votados um ano antes" />;
}

/* ---------- O caminho do processo ---------- */
const exportarCaminho = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Marco', 'Processos no período'], linhas: () => q(ctx).caminho.map(row => [row.etapa, row.total]) });
function Caminho({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = q(ctx).caminho, max = Math.max(1, ...rows.map(row => row.total));
  const cores = [tokens.blue, tokens.brand, tokens.accent, tokens.accent, tokens.warn, tokens.good, tokens.good];
  const option = useMemo(() => ({
    grid: { top: 2, right: 64, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>${rows[items[0].dataIndex].etapa}</b><br/>${int(rows[items[0].dataIndex].total)} no período` },
    xAxis: { type: 'value', show: false, max }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.etapa), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: [{ type: 'bar', barWidth: 13, data: rows.map((row, index) => ({ value: row.total, itemStyle: { color: cores[index] ?? tokens.brand, borderRadius: [0, 3, 3, 0] } })),
      label: { show: true, position: 'right', color: tokens.ink, fontSize: 10.5, fontWeight: 800, formatter: (params: any) => int(params.value) } }],
  }), [rows, tokens, max]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Processos que passaram por cada marco do caminho no período" />;
}
