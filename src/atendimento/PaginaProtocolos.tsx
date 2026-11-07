import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { int, mes, money, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador, avisoVazio } from '../cockpit/ui';
import type { Exportavel } from '../cockpit/ui';
import { corDoTexto } from '../cockpit/formatos';
import type { Evolucao } from '../painel/evolucao';
import { PRAZO_EXIGENCIA, situacoes } from '../domain/atendimento';
import type { Linha } from '../domain/atendimento';
import { change, eixoCategoria, eixoValor, legenda } from '../gestao/comum';
import { a, abrirProtocolos, coresSituacao, diasUteisTexto, pctOu } from './comum';

/**
 * Painel de Atendimento, página 1 (07/11/2026): a visão do painel de protocolos que o Crea-SP já usa, com o prazo de cada serviço em
 * dias úteis. Quantos protocolos entraram no período, em que situação e status estão, dentro ou fora do prazo, como cada mês se
 * compara com o mesmo mês um ano antes, cada serviço contra o seu prazo e por que os protocolos voltam ao solicitante.
 */
export default function PaginaProtocolos({ ctx }: { ctx: CockpitCtx }) {
  const { q, serie } = a(ctx), { metas } = ctx, vazio = avisoVazio(!q.linhas.length, 'Nenhum protocolo aberto no período');
  const series = useMemo(() => { const meses = serie.map(m => m.mes);
    return { abertos: { tipo: 'fluxo', meses, valores: serie.map(m => m.abertos), fmt: int } as Evolucao,
      noPrazo: { tipo: 'taxa', meses, valores: serie.map(m => m.noPrazo), fmt: (v: number) => pct(v) } as Evolucao,
      mediana: { tipo: 'estoque', meses, valores: serie.map(m => m.mediana), fmt: (v: number) => diasUteisTexto(v), goodUp: false } as Evolucao,
      andamento: { tipo: 'estoque', meses, valores: serie.map(m => m.emAndamento), fmt: int, goodUp: false, nome: 'Em andamento no fim do mês' } as Evolucao }; }, [serie]);
  const s = q.porSituacao, andamento = [...s.Aberto, ...s['Exigência']], foraAndamento = andamento.filter(l => l.prazo === 'Fora do prazo');
  const fechados = s.Fechado, semResposta = fechados.filter(l => l.status === 'Finalizada sem resposta à exigência');
  const exigenciaVencida = s['Exigência'].filter(l => l.prazo === 'Fora do prazo');
  return <div className="ck-grid ck-grid-at-protocolos">
    <section className="ck-cards is-six" style={{ gridArea: 'kpi' }} aria-label="Indicadores dos protocolos">
      <Indicador destaque ficha="k-prazo" ctx={ctx} label="Fechados no prazo" serie={series.noPrazo} value={pctOu(q.noPrazo)} meta={{ atual: q.noPrazo, alvo: metas.atendimento }}
        variacao={{ value: q.noPrazo === null || q.noPrazoAntes === null ? null : q.noPrazo - q.noPrazoAntes, kind: 'pp', label: 'em relação a um ano antes' }} sub={`${int(fechados.length)} fechados; a meta é ${metas.atendimento}%`}
        onOpen={() => abrirProtocolos(ctx, 'Fechados fora do prazo', fechados.filter(l => l.prazo === 'Fora do prazo'), 'Protocolos abertos no período e fechados depois do prazo do serviço, contado em dias úteis com o Crea-SP.')} />
      <Indicador ficha="k-total" ctx={ctx} label="Abertos no período" serie={series.abertos} value={int(q.linhas.length)} variacao={{ value: change(q.linhas.length, q.antes.length), label: 'em relação a um ano antes' }}
        sub={`${pct(fechados.length / Math.max(1, q.linhas.length) * 100)} já fechados`} onOpen={() => abrirProtocolos(ctx, 'Protocolos abertos no período', q.linhas, 'Todos os protocolos abertos no período, com a situação na data escolhida.')} />
      <Indicador ficha="k-mediana" ctx={ctx} label="Tempo típico até fechar" serie={series.mediana} value={diasUteisTexto(q.mediana)} variacao={{ value: q.mediana === null || q.medianaAntes === null ? null : change(q.mediana, q.medianaAntes), goodUp: false, label: 'em relação a um ano antes' }}
        sub="mediana dos fechados" />
      <Indicador ficha="k-andamento" ctx={ctx} label="Em andamento" serie={series.andamento} value={int(andamento.length)} variacao={{ value: change(andamento.length, q.antesPorSituacao.Aberto.length + q.antesPorSituacao['Exigência'].length), goodUp: false, label: 'em relação a um ano antes' }}
        sub={`${int(foraAndamento.length)} já passaram do prazo`} onOpen={() => abrirProtocolos(ctx, 'Em andamento', andamento, 'Protocolos abertos no período que seguem em aberto ou em exigência na data escolhida.', 'Comece pelos que estão fora do prazo.')} />
      <Indicador ficha="k-exigencia" ctx={ctx} label="Em exigência" value={int(s['Exigência'].length)} sub={`${int(exigenciaVencida.length)} passaram dos ${PRAZO_EXIGENCIA} dias; ${int(semResposta.length)} finalizados sem resposta`}
        onOpen={() => abrirProtocolos(ctx, 'Em exigência', s['Exigência'], `Protocolos que voltaram ao solicitante para completar documentos. Ele tem ${PRAZO_EXIGENCIA} dias corridos para responder.`)} />
      <Indicador ficha="k-pagamento" ctx={ctx} label="Sem pagamento" value={int(s['Sem pagamento'].length)} sub={`${money(q.valorSemPagamento)} em taxas; ${int(s.Cancelado.length)} cancelados`}
        onOpen={() => abrirProtocolos(ctx, 'Sem pagamento', s['Sem pagamento'], 'Protocolos abertos que esperam o pagamento da taxa do serviço. O prazo só começa a contar depois do pagamento.')} />
    </section>
    <Bloco ctx={ctx} id="sp" vazio={vazio} area="sp" title="Situação contra o prazo, por status" exportar={exportarStatus(ctx)}><PorStatus ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mm" vazio={vazio} area="mm" title="Protocolos por mês" exportar={exportarMensal(ctx)}><Mensal ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="su" vazio={vazio} area="su" title="Cada serviço contra o seu prazo" exportar={exportarServicos(ctx)}><Servicos ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mo" vazio={avisoVazio(!q.motivos.length, 'Nenhuma exigência')} area="mo" title="Por que há exigência" exportar={{ cabecalho: ['Tipo de serviço', 'Motivo da exigência', 'Protocolos'], linhas: () => q.motivos.map(m => [m.tipo, m.motivo, m.linhas.length]) }}><Motivos ctx={ctx} /></Bloco>
  </div>;
}

/* ---------- Cada status, dentro e fora do prazo ---------- */
const partesPrazo = ['Dentro do prazo', 'Fora do prazo', 'Sem prazo'] as const;
const exportarStatus = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Status', ...partesPrazo], linhas: () => a(ctx).q.porStatus.map(row => [row.status, row.dentro.length, row.fora.length, row.sem.length]) });
function PorStatus({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = a(ctx).q.porStatus.filter(row => row.dentro.length + row.fora.length + row.sem.length), cores = [tokens.good, tokens.bad, tokens.line];
  // Cada barra é o status inteiro (100%), dividida pelo prazo; o número dentro é a contagem e o da direita, o total do status.
  const listas = (index: number) => rows.map(row => [row.dentro, row.fora, row.sem][index]), total = (row: typeof rows[number]) => row.dentro.length + row.fora.length + row.sem.length;
  const option = useMemo(() => ({
    grid: { top: 24, right: 44, bottom: 2, left: 2, containLabel: true }, legend: { ...legenda(tokens), data: [...partesPrazo] },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.status}</b>: ${int(total(row))}<br/>Dentro do prazo: ${int(row.dentro.length)}<br/>Fora do prazo: ${int(row.fora.length)}<br/>Sem prazo (sem pagamento ou cancelado): ${int(row.sem.length)}`; } },
    xAxis: { type: 'value', show: false, max: 100 }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.status), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [...partesPrazo.map((nome, index) => ({ name: nome, type: 'bar', stack: 's', barMaxWidth: 16, data: listas(index).map((l, i) => l.length / total(rows[i]) * 100), itemStyle: { color: cores[index], borderColor: tokens.surface, borderWidth: 1 },
      label: { show: true, position: 'inside', color: corDoTexto(cores[index]), fontSize: 11, fontWeight: 700, formatter: (p: any) => p.value >= 9 ? int(listas(index)[p.dataIndex].length) : '' } })),
      { name: 'total', type: 'bar', stack: 's', barMaxWidth: 16, data: rows.map(() => 0), itemStyle: { color: 'transparent' }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (p: any) => int(total(rows[p.dataIndex])) } }],
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Protocolos do período por status, com a parte dentro e fora do prazo" onPick={p => { const row = rows[p.dataIndex]; if (!row) return; const lista = p.seriesIndex < 3 ? listas(p.seriesIndex)[p.dataIndex] : [...row.dentro, ...row.fora, ...row.sem];
    abrirProtocolos(ctx, p.seriesIndex < 3 ? `${row.status}, ${partesPrazo[p.seriesIndex].toLowerCase()}` : row.status, lista, 'Protocolos abertos no período neste status na data escolhida.'); }} />;
}

/* ---------- Mês a mês, pela situação, contra o mesmo mês um ano antes ---------- */
const exportarMensal = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Mês', ...situacoes, 'Total', 'Mesmo mês um ano antes', 'Fechados no prazo (%)', 'Mediana (dias úteis)'],
  linhas: () => a(ctx).q.mensal.map(m => [m.mes, ...situacoes.map(s => m.partes[s].length), m.total, m.antes, m.noPrazo === null ? null : Math.round(m.noPrazo), m.mediana]) });
function Mensal({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = a(ctx).q.mensal, cores = coresSituacao(tokens);
  const option = useMemo(() => ({
    grid: { top: 26, right: 6, bottom: 2, left: 4, containLabel: true }, legend: { ...legenda(tokens), data: [...[...situacoes], 'Mesmo mês um ano antes'] },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const m = rows[items[0].dataIndex]; return `<b>${mes(m.mes)}</b>: ${int(m.total)} protocolos<br/>${situacoes.map(s => `${s}: ${int(m.partes[s].length)}`).join('<br/>')}<br/>Um ano antes: ${int(m.antes)}<br/>Fechados no prazo: ${pctOu(m.noPrazo)}; mediana ${diasUteisTexto(m.mediana)}`; } },
    xAxis: eixoCategoria(tokens, rows.map(m => mes(m.mes))), yAxis: eixoValor(tokens),
    series: [...situacoes.map(s => ({ name: s, type: 'bar', stack: 'm', barMaxWidth: 34, data: rows.map(m => m.partes[s].length), itemStyle: { color: cores[s], borderColor: tokens.surface, borderWidth: 1 } })),
      { name: 'total', type: 'bar', stack: 'm', barMaxWidth: 34, data: rows.map(() => 0), itemStyle: { color: 'transparent' }, label: { show: true, position: 'top', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (p: any) => int(rows[p.dataIndex].total) } },
      { name: 'Mesmo mês um ano antes', type: 'line', data: rows.map(m => m.antes), symbol: 'circle', symbolSize: 5, lineStyle: { color: tokens.muted, type: 'dashed', width: 1.5 }, itemStyle: { color: tokens.muted }, z: 5 }],
  }), [rows, tokens, cores]);
  return <Chart option={option} tokens={tokens} label="Protocolos abertos por mês, pela situação, e o mesmo mês um ano antes" onPick={p => { const m = rows[p.dataIndex]; if (!m) return; const s = situacoes[p.seriesIndex];
    abrirProtocolos(ctx, s ? `${mes(m.mes)}, ${s.toLowerCase()}` : `Abertos em ${mes(m.mes)}`, s ? m.partes[s] : m.linhas, 'Protocolos abertos neste mês, com a situação na data escolhida.'); }} />;
}

/* ---------- Tabela dos serviços ---------- */
const exportarServicos = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Tipo', 'Serviço', 'Prazo (dias úteis)', 'Protocolos', 'Em andamento', 'Fora do prazo agora', 'Fechados no prazo (%)', 'Mediana (dias úteis)', 'Com o solicitante (média, dias corridos)'],
  linhas: () => a(ctx).q.porSubtipo.filter(r => r.total).map(r => [r.servico.tipo, r.servico.subtipo, r.servico.prazo, r.total, r.partes.Aberto.length + r.partes['Exigência'].length, foraAgora(r.linhas).length, r.noPrazo === null ? null : Math.round(r.noPrazo), r.mediana, r.comSolicitante === null ? null : Math.round(r.comSolicitante)]) });
const foraAgora = (rows: Linha[]) => rows.filter(l => (l.situacao === 'Aberto' || l.situacao === 'Exigência') && l.prazo === 'Fora do prazo');
function Servicos({ ctx }: { ctx: CockpitCtx }) {
  const rows = a(ctx).q.porSubtipo.filter(r => r.total).sort((x, y) => y.total - x.total), meta = ctx.metas.atendimento;
  return <div className="cs-com-nota">
    <div className="table-wrap"><table className="metodo is-dense at-servicos">
      <thead><tr><th>Serviço</th><th className="num">Prazo</th><th className="num">Protocolos</th><th className="num">Em andamento</th><th className="num">Fora do prazo</th><th className="num">No prazo</th><th className="num">Tempo típico</th><th className="num">Com o solicitante</th></tr></thead>
      <tbody>{rows.map(r => { const atrasados = foraAgora(r.linhas), andamento = r.partes.Aberto.length + r.partes['Exigência'].length;
        return <tr key={r.servico.subtipo} className="is-clicavel" tabIndex={0} onClick={() => abrirProtocolos(ctx, r.servico.subtipo, r.linhas, `Protocolos deste serviço abertos no período. O prazo é de ${r.servico.prazo} dias úteis com o Crea-SP.`)}
          onKeyDown={event => { if (event.key === 'Enter') abrirProtocolos(ctx, r.servico.subtipo, r.linhas, `Protocolos deste serviço abertos no período. O prazo é de ${r.servico.prazo} dias úteis com o Crea-SP.`); }}>
          <td className="at-nome" title={`${r.servico.subtipo} (${r.servico.tipo})`}><b>{r.servico.subtipo}</b></td><td className="num">{r.servico.prazo} dias</td><td className="num">{int(r.total)}</td><td className="num">{int(andamento)}</td>
          <td className="num">{atrasados.length ? <span className="cs-alerta is-vermelho">{int(atrasados.length)}</span> : '0'}</td>
          <td className={`num ${r.noPrazo !== null && r.noPrazo < meta ? 'at-abaixo' : ''}`}>{pctOu(r.noPrazo)}</td>
          <td className={`num ${r.mediana !== null && r.mediana > r.servico.prazo ? 'at-abaixo' : ''}`}>{r.mediana === null ? '—' : `${int(r.mediana)} dias`}</td>
          <td className="num">{r.comSolicitante === null ? '—' : `${int(r.comSolicitante)} dias`}</td></tr>; })}</tbody>
    </table></div>
    <p className="cs-nota">Fora do prazo: em andamento e já atrasados. No prazo: parte dos fechados. Prazo e tempo típico em dias úteis com o Crea-SP; com o solicitante, média de dias corridos em exigência. Em vermelho, abaixo da meta de {meta}% ou acima do prazo.</p>
  </div>;
}

/* ---------- Motivos das exigências ---------- */
function Motivos({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = a(ctx).q.motivos.slice(0, 6);
  const option = useMemo(() => ({
    grid: { top: 2, right: 150, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const m = rows[items[0].dataIndex]; return `<b>${m.motivo}</b><br/>${m.tipo}: ${int(m.linhas.length)} protocolos`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(m => m.motivo), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11, width: 210, overflow: 'truncate' } },
    series: [{ type: 'bar', barMaxWidth: 12, data: rows.map(m => m.linhas.length), itemStyle: { color: tokens.accent, borderRadius: [0, 3, 3, 0] },
      label: { show: true, position: 'right', fontSize: 11, formatter: (p: any) => `{b|${int(p.value)}} {t|${rows[p.dataIndex].tipo}}`, rich: { b: { color: tokens.ink, fontWeight: 700, fontSize: 11 }, t: { color: tokens.muted, fontSize: 11 } } } }],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Os seis motivos de exigência mais comuns, com o tipo de serviço" onPick={p => { const m = rows[p.dataIndex]; if (m) abrirProtocolos(ctx, m.motivo, m.linhas, `Protocolos de ${m.tipo.toLowerCase()} que voltaram ao solicitante por este motivo.`, 'Motivo que se repete pede uma orientação melhor no portal ou no balcão.'); }} />;
}
