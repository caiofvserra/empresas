import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { brl, int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador, avisoVazio } from '../cockpit/ui';
import { corDoTexto } from '../cockpit/formatos';
import type { Exportavel } from '../cockpit/ui';
import { alertaNoStatus, faixasCadastro, faixasNoStatus, faixasPrescricaoRelator, nomeColegiado, prescricaoDe, statusPendentes } from '../domain/colegiado';
import type { Pendente } from '../domain/colegiado';
import { legenda } from '../gestao/comum';
import { abrirPendentes, abrirTramitacoes, diasOu, nomeDe, q } from './comum';

/**
 * Painel de Gestão do Conselho, página 2 (07/11/2026): a fila dos processos que esperam voto, do mais parado ao menos, com quem
 * está cada um; o tempo em cada status do Votenet; os autos perto da prescrição por relator; e o tempo entre o recebimento no
 * GovAdm e o cadastro no Votenet.
 */
export default function PaginaProcessos({ ctx }: { ctx: CockpitCtx }) {
  const c = q(ctx);
  const vermelho = c.pendentes.filter(row => alertaNoStatus(row.diasNoStatus) === 'vermelho'), amarelo = c.pendentes.filter(row => alertaNoStatus(row.diasNoStatus) === 'amarelo');
  const anoTotal = c.pendentes.filter(row => row.diasTotais > 365), intercorrente = c.pertoDePrescrever.filter(row => prescricaoDe(row)?.motivo === 'três anos parado').length;
  const multas = c.pertoDePrescrever.reduce((n, row) => n + (row.t.processo.multa ?? 0), 0);
  const recebidos = c.cadastro.flat(), demorados = c.cadastro.slice(4).flat().length;
  const prescreveAntes = (rows: Pendente[]) => [...rows].sort((a, b) => prescricaoDe(a)!.em.localeCompare(prescricaoDe(b)!.em));
  return <div className="ck-grid ck-grid-cs-processos">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores da fila de processos">
      <Indicador destaque ficha="k-vermelho" ctx={ctx} label="Em alerta vermelho" value={int(vermelho.length)} sub={`mais de 120 dias no mesmo status, e ${int(amarelo.length)} em amarelo (90 a 120)`}
        onOpen={() => abrirPendentes(ctx, 'Em alerta vermelho', vermelho, 'Processos esperando voto há mais de 120 dias no mesmo status do Votenet.', 'Cobre de quem está com o processo, pelo nome na lista.')} />
      <Indicador ficha="k-ano" ctx={ctx} label="Há mais de 1 ano no colegiado" value={int(anoTotal.length)} sub={`${c.pendentes.length ? pct(anoTotal.length / c.pendentes.length * 100) : '—'} dos que esperam voto`}
        onOpen={() => abrirPendentes(ctx, 'Há mais de 1 ano no colegiado', anoTotal, 'Processos esperando voto que entraram no colegiado há mais de um ano.')} />
      <Indicador ficha="k-prescricao" ctx={ctx} label="Autos perto da prescrição" value={int(c.pertoDePrescrever.length)} sub={`${brl(multas)} em multas; ${int(intercorrente)} por três anos parados`}
        onOpen={() => abrirPendentes(ctx, 'Autos perto da prescrição', prescreveAntes(c.pertoDePrescrever), 'Autos de infração esperando voto que prescrevem em até 12 meses: cinco anos do fato ou três anos parados no mesmo status (Lei 9.873/1999).', 'Paute primeiro os que prescrevem antes.')} />
      <Indicador ficha="k-parados" ctx={ctx} label="Parados há mais de 2 anos" value={int(c.parados.length)} sub="no mesmo status; com 3 anos, o auto prescreve"
        onOpen={() => abrirPendentes(ctx, 'Parados há mais de 2 anos', c.parados, 'Processos há mais de dois anos no mesmo status do Votenet. Um auto de infração parado por três anos prescreve (Lei 9.873/1999, art. 1º, § 1º).')} />
      <Indicador ficha="k-cadastro" ctx={ctx} label="Do GovAdm ao Votenet" value={diasOu(c.cadastroMediana)} sub={`mediana; ${recebidos.length ? pct(demorados / recebidos.length * 100) : '—'} levaram mais de 15 dias`}
        onOpen={() => abrirTramitacoes(ctx, 'Recebidos no período', recebidos, 'Processos recebidos nas câmaras no período, com o tempo até o cadastro no Votenet.')} />
    </section>
    <Bloco ctx={ctx} id="fi" vazio={avisoVazio(!c.pendentes.length, 'Nenhum processo esperando voto')} area="fi" title="A fila, do mais parado ao menos" exportar={exportarFila(ctx)}><Fila ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ca" vazio={avisoVazio(!c.pendentes.length, 'Nenhum processo esperando voto')} area="ca" title="Há quanto tempo estão no status" exportar={exportarCalor(ctx)}><Calor ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="pr" vazio={avisoVazio(!q(ctx).prescricaoPorRelator.length, 'Nenhum auto esperando voto prescreve nos próximos 12 meses')} area="pr" title="Perto da prescrição, por relator" exportar={exportarPrescricao(ctx)}><Prescricao ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="cd" area="cd" title="Do GovAdm ao Votenet" exportar={exportarCadastro(ctx)}><Cadastro ctx={ctx} /></Bloco>
  </div>;
}

/* ---------- A fila nominal ---------- */
const exportarFila = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Processo', 'Tipo', 'Colegiado', 'Status', 'Com quem', 'Papel', 'Dias no status', 'Dias desde a entrada', 'Alerta'],
  linhas: () => q(ctx).pendentes.map(row => [row.t.id, row.t.processo.tipo, nomeColegiado(row.t.colegiado), row.evento.status, nomeDe(ctx, row.evento.com), q(ctx).pessoas.get(row.evento.com)?.papel ?? '', row.diasNoStatus, row.diasTotais, alertaNoStatus(row.diasNoStatus) ?? '']) });
function Fila({ ctx }: { ctx: CockpitCtx }) {
  const c = q(ctx), rows = c.pendentes.slice(0, 40);
  return <div className="cs-com-nota">
    <div className="table-wrap"><table className="metodo is-dense cs-fila">
      <thead><tr><th>Processo</th><th>Status</th><th>Com quem</th><th className="num">No status</th><th className="num">No total</th></tr></thead>
      <tbody>{rows.map(row => { const alerta = alertaNoStatus(row.diasNoStatus), pessoa = c.pessoas.get(row.evento.com);
        return <tr key={row.t.id} className="is-clicavel" onClick={() => abrirPendentes(ctx, row.t.id, [row], 'O processo, com o status do Votenet, quem está com ele e há quanto tempo.')}>
          <td><b>{row.t.processo.tipo}</b><small>{nomeColegiado(row.t.colegiado)}, processo {row.t.id}</small></td><td>{row.evento.status}</td>
          <td><b>{pessoa?.nome ?? row.evento.com}</b><small>{pessoa?.papel === 'Funcionário' ? 'funcionário' : 'conselheiro'}</small></td>
          <td className="num"><span className={`cs-alerta ${alerta ? `is-${alerta}` : ''}`}>{int(row.diasNoStatus)} dias</span></td>
          <td className={`num ${row.diasTotais > 365 ? 'cs-mais-de-ano' : ''}`}>{int(row.diasTotais)} dias</td></tr>; })}</tbody>
    </table></div>
    <p className="cs-nota"><button className="cs-link" onClick={() => abrirPendentes(ctx, 'A fila inteira', c.pendentes, 'Todos os processos esperando voto, do mais parado ao menos.')}>Ver os {int(c.pendentes.length)} processos da fila</button>. Vermelho acima de 120 dias no status, amarelo de 90 a 120; o total acende acima de 1 ano</p>
  </div>;
}

/* ---------- Status × tempo no status ---------- */
const exportarCalor = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Status', ...faixasNoStatus], linhas: () => statusPendentes.map((s, i) => [s, ...q(ctx).calor[i].map(rows => rows.length)]) });
function Calor({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, c = q(ctx), linhas = statusPendentes.map((status, index) => ({ status, faixas: c.calor[index] })).filter(row => row.faixas.some(f => f.length));
  const max = Math.max(1, ...linhas.flatMap(row => row.faixas.map(f => f.length)));
  const option = useMemo(() => ({
    grid: { top: 2, right: 4, bottom: 2, left: 2, containLabel: true },
    tooltip: { formatter: (item: any) => `<b>${linhas[item.value[1]].status}</b><br/>Há ${faixasNoStatus[item.value[0]]} no status: <b>${int(item.value[2])}</b>` },
    xAxis: { type: 'category', position: 'top', data: faixasNoStatus, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { fontSize: 11, interval: 0, color: (_: string, index: number) => index >= 3 ? tokens.bad : index === 2 ? tokens.warn : tokens.muted } },
    yAxis: { type: 'category', inverse: true, data: linhas.map(row => row.status), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    visualMap: { show: false, min: 0, max, inRange: { color: [tokens.soft, tokens.heat[1], tokens.accent, tokens.bad] } },
    series: [{ type: 'heatmap', data: linhas.flatMap((row, y) => row.faixas.map((f, x) => [x, y, f.length])), label: { show: true, fontSize: 11, fontWeight: 700, color: tokens.ink, formatter: (item: any) => item.value[2] ? int(item.value[2]) : '' }, itemStyle: { borderColor: tokens.surface, borderWidth: 2, borderRadius: 3 } }],
  }), [linhas, tokens, max]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Processos esperando voto por status e tempo no status" onPick={params => { const [x, y] = params.value ?? []; const row = linhas[y]; if (row) abrirPendentes(ctx, `${row.status}, há ${faixasNoStatus[x]}`, row.faixas[x], 'Processos neste status do Votenet há este tempo, na data escolhida.'); }} />;
}

/* ---------- Prescrição por relator ---------- */
const exportarPrescricao = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Relator', ...faixasPrescricaoRelator.map(f => `Prescreve em ${f}`), 'Multas (R$)'], linhas: () => q(ctx).prescricaoPorRelator.map(row => [row.pessoa.nome, ...row.faixas.map(f => f.length), row.multas]) });
function Prescricao({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = q(ctx).prescricaoPorRelator.slice(0, 6), cores = [tokens.bad, tokens.accent, tokens.heat[1]];
  const option = useMemo(() => ({
    grid: { top: 24, right: 112, bottom: 2, left: 2, containLabel: true }, legend: { ...legenda(tokens), data: [...faixasPrescricaoRelator] },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.pessoa.nome}</b><br/>${faixasPrescricaoRelator.map((f, i) => `Prescreve em ${f}: ${int(row.faixas[i].length)}`).join('<br/>')}<br/>Multas: <b>${brl(row.multas)}</b>`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.pessoa.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: faixasPrescricaoRelator.map((faixa, index) => ({ name: faixa, type: 'bar', stack: 'p', barMaxWidth: 13, data: rows.map(row => row.faixas[index].length), itemStyle: { color: cores[index], borderColor: tokens.surface, borderWidth: 1 },
      label: { show: true, position: 'inside', color: corDoTexto(cores[index]), fontSize: 11, fontWeight: 700, formatter: (params: any) => params.value >= 2 ? params.value : '' } }))
      .concat([{ name: 'multas', type: 'bar', stack: 'p', barMaxWidth: 13, data: rows.map(() => 0), itemStyle: { color: 'transparent' }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (params: any) => { const row = rows[params.dataIndex]; return `${int(row.faixas.flat().length)} ${row.faixas.flat().length === 1 ? 'auto' : 'autos'}, ${brl(row.multas)}`; } } } as any]),
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Autos que prescrevem em até 12 meses, por relator" onPick={params => { const row = rows[params.dataIndex]; if (!row) return; const lista = params.seriesIndex < 3 ? row.faixas[params.seriesIndex] : row.faixas.flat();
    abrirPendentes(ctx, `Perto da prescrição, com o relator ${row.pessoa.nome}`, [...lista].sort((a, b) => prescricaoDe(a)!.em.localeCompare(prescricaoDe(b)!.em)), 'Autos de infração deste relator que prescrevem em até 12 meses (cinco anos do fato ou três anos parados).', 'Paute primeiro os que prescrevem antes.'); }} />;
}

/* ---------- Do recebimento no GovAdm ao cadastro no Votenet ---------- */
const exportarCadastro = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Tempo até o cadastro no Votenet', 'Processos recebidos no período'], linhas: () => faixasCadastro.map((f, i) => [f, q(ctx).cadastro[i].length]) });
function Cadastro({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, c = q(ctx), total = Math.max(1, c.cadastro.flat().length);
  const option = useMemo(() => ({
    grid: { top: 18, right: 4, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>${faixasCadastro[items[0].dataIndex]}</b><br/>${int(items[0].value)} processos (${pct(items[0].value / total * 100)})` },
    xAxis: { type: 'category', data: faixasCadastro, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 11, interval: 0, formatter: (v: string) => v.replace(' dias', '\ndias').replace('no mesmo dia', 'no mesmo\ndia') } },
    yAxis: { type: 'value', show: false },
    series: [{ type: 'bar', barMaxWidth: 34, barWidth: '58%', data: c.cadastro.map((rows, index) => ({ value: rows.length, itemStyle: { color: index >= 4 ? tokens.bad : index === 3 ? tokens.warn : tokens.brand, borderRadius: [3, 3, 0, 0] } })),
      label: { show: true, position: 'top', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (params: any) => `${int(params.value)}` } }],
  }), [c.cadastro, tokens, total]);
  return <Chart option={option} tokens={tokens} label="Processos recebidos no período pelo tempo até o cadastro no Votenet" onPick={params => { const rows = c.cadastro[params.dataIndex]; if (rows) abrirTramitacoes(ctx, `Cadastrados no Votenet ${faixasCadastro[params.dataIndex]}`, rows, `Processos recebidos no período e cadastrados no Votenet ${faixasCadastro[params.dataIndex]} depois do recebimento no GovAdm.`); }} />;
}
