import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { brl, data, int, mes, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador, Selo, avisoVazio, nomeEmpresa } from '../cockpit/ui';
import type { Exportavel } from '../cockpit/ui';
import { corDoTexto } from '../cockpit/formatos';
import { addDays } from '../domain/hash';
import { contratosQueTerminam, execucaoDoAno } from '../domain/financeiro';
import type { ContratoVigente } from '../domain/financeiro';
import type { DevedorLinha } from '../domain/gestao';
import { alertaNoStatus, colegiados, faixaNoStatus, faixasNoStatus, nomeColegiado, prescricaoDe } from '../domain/colegiado';
import type { Pendente } from '../domain/colegiado';
import { indicador, porRegionalDaFoto, valorDe } from '../domain/presidencia';
import { abrirDevedores, compacto, eixoCategoria, eixoValor, g, legenda } from '../gestao/comum';
import { abrirPendentes, nomeDe } from '../conselho/comum';
import { misturar, nomeGre, ondeTexto, useLeitura } from './comum';
import { fin, fonteReal, mesDaData, mesesAte } from '../financeiro/dados';
import { abrirContratos, nomeProprio } from '../financeiro/blocos-orcamento';

/**
 * Painel da Presidência, página Riscos (07/11/2026): o que vence ou prescreve nos próximos 12 meses e onde. Anuidades que prescrevem
 * (cinco anos do vencimento), autos de infração que prescrevem (Lei 9.873/1999), processos que passam de 120 dias parados no mesmo
 * status do Votenet, contratos do Conselho que terminam, a fila do colegiado e o orçamento do ano. Toda lista abre com nome. Os contratos
 * e o orçamento são os reais da Transparência, como no painel Financeiro.
 */
const PRESCREVE = 1827;
const prescreveEm = (vencimento: string) => addDays(vencimento, PRESCREVE);
interface Mes { month: string; anuidades: DevedorLinha[]; valor: number; autos: Pendente[]; alerta: Pendente[]; contratos: { n: number; valor: number; contratos: ContratoVigente[] } }
function useCalendario(ctx: CockpitCtx) {
  const gestao = g(ctx), c = gestao.colegiado!, anchor = ctx.anchor;
  return useMemo(() => {
    // Os 12 meses a partir do mês da data, e os contratos vigentes que terminam em cada um.
    const meses = mesesAte(anchor.slice(0, 7), 12).map(m => { const d = new Date(`${m}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 11); return d.toISOString().slice(0, 7); }), fim = `${meses.at(-1)}-31`;
    const vigentes = contratosQueTerminam(fin, anchor, 12);
    return meses.map((month): Mes => {
      const lista = vigentes.filter(row => row.fim.startsWith(month)), contrato = { n: lista.length, valor: lista.reduce((n, row) => n + row.valor, 0), contratos: lista };
      const dentro = (dia: string) => dia > anchor && dia <= fim && dia.startsWith(month);
      const anuidades = gestao.divida.devedores.map(row => { const titulos = row.titulos.filter(t => dentro(prescreveEm(t.vencimento))); return titulos.length ? { ...row, titulos, valor: titulos.reduce((n, t) => n + t.valor, 0), maisAntigo: titulos[0].vencimento } : null; }).filter((row): row is DevedorLinha => row !== null);
      return { month, anuidades, valor: anuidades.reduce((n, row) => n + row.valor, 0), contratos: contrato,
        autos: c.pendentes.filter(row => { const p = prescricaoDe(row); return p !== null && dentro(p.em); }),
        alerta: c.pendentes.filter(row => row.diasNoStatus <= 120 && dentro(addDays(row.evento.desde, 121))) };
    });
  }, [gestao, c, anchor]);
}

export default function PaginaRiscos({ ctx }: { ctx: CockpitCtx }) {
  const gestao = g(ctx), c = gestao.colegiado!, d = gestao.divida, l = useLeitura(ctx), cal = useCalendario(ctx);
  const perto = d.devedores.filter(row => d.pertoIds.includes(row.pessoaId)), vermelho = c.pendentes.filter(row => alertaNoStatus(row.diasNoStatus) === 'vermelho');
  const mesReal = mesDaData(ctx.anchor), despesa = execucaoDoAno(fin, 'despesa', mesReal), receita = execucaoDoAno(fin, 'receita', mesReal);
  const contratos90 = contratosQueTerminam(fin, ctx.anchor, 3);
  return <div className="ck-grid ck-grid-pr-riscos">
    <section className="ck-cards is-six" style={{ gridArea: 'kpi' }} aria-label="Os riscos e os prazos">
      <Indicador destaque ctx={ctx} ficha="k-perto" aspecto="Financeiro" label="Dívida perto de prescrever" value={brl(d.pertoDePrescrever)} sub={`com ${int(perto.length)} devedores; prescreve em menos de um ano`}
        onOpen={() => abrirDevedores(ctx, 'Dívida perto de prescrever', perto, 'Devedores com anuidade vencida há mais de quatro anos: ela prescreve cinco anos depois do vencimento.', 'Os que podem ir à execução judicial primeiro.')} />
      <Indicador ctx={ctx} ficha="k-autos" aspecto="Colegiados" label="Autos perto da prescrição" value={int(c.pertoDePrescrever.length)} sub="prescrevem em até um ano sem voto"
        onOpen={() => abrirPendentes(ctx, 'Autos perto da prescrição', c.pertoDePrescrever, 'Autos de infração esperando voto que prescrevem em até um ano: cinco anos do fato ou três anos parados no mesmo status.')} />
      <Indicador ctx={ctx} ficha="k-vermelho" aspecto="Colegiados" label="Processos em alerta vermelho" value={int(vermelho.length)} sub={`mais de 120 dias no mesmo status; ${int(vermelho.filter(row => row.diasTotais > 365).length)} há mais de um ano no total`}
        onOpen={() => abrirPendentes(ctx, 'Processos em alerta vermelho', vermelho, 'Processos esperando voto há mais de 120 dias no mesmo status do Votenet.')} />
      <Indicador ctx={ctx} ficha="k-vencidas" aspecto="Atendimento" label="Protocolos na fila e fora do prazo" value={l.atual ? int(l.valor('atrasadas') ?? 0) : '…'} sub={l.atual ? `de ${int(l.valor('solicitacoes') ?? 0)} protocolos abertos no período, ${ondeTexto(ctx)}` : 'calculando…'} onOpen={() => ctx.go('equipe')} />
      <Indicador ctx={ctx} ficha="k-orcamento" aspecto="Real · Financeiro" label={`Execução do orçamento de ${mesReal.slice(0, 4)}`} value={despesa.orcado ? pct(despesa.realizado / despesa.orcado * 100) : '—'}
        sub={`da despesa orçada, até ${mes(mesReal)}; a receita está em ${receita.orcado ? pct(receita.realizado / receita.orcado * 100) : '—'} da orçada`} onOpen={() => ctx.go('orcamento')} />
      <Indicador ctx={ctx} ficha="k-contratos" aspecto="Real · Financeiro" label="Contratos que terminam em 90 dias" value={int(contratos90.length)} sub={`${brl(contratos90.reduce((n, row) => n + row.valor, 0))} contratados, pela Transparência`}
        onOpen={() => abrirContratos(ctx, 'Contratos que terminam em 90 dias', contratos90)} />
    </section>
    <Bloco ctx={ctx} id="cl" area="cl" title="O que vence nos próximos 12 meses" exportar={exportarCalendario(cal)}><Calendario ctx={ctx} cal={cal} /></Bloco>
    <Bloco ctx={ctx} id="ur" area="ur" title="O que vence primeiro" vazio={avisoVazio(!cal.some(row => row.autos.length || row.anuidades.length || row.contratos.n), 'Nada vence nos próximos 12 meses')}><Urgentes ctx={ctx} cal={cal} /></Bloco>
    <Bloco ctx={ctx} id="ex" area="ex" title="Dívida perto de prescrever por regional" vazio={ctx.presidencia?.atual ? undefined : 'Calculando as regionais'} exportar={exportarExposicao(ctx)}><Exposicao ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="fl" area="fl" title="A fila de cada colegiado pelo tempo no status" vazio={avisoVazio(!c.pendentes.length, 'Nenhum processo esperando voto')} exportar={exportarFila(ctx)}><Fila ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="or" area="or" title="Receita e despesa do ano contra o orçado" badge={<Selo data={fonteReal.data} />} exportar={exportarOrcamento(ctx)}><Orcamento ctx={ctx} /></Bloco>
  </div>;
}

/* ---------- Calendário: o que vence em cada mês ---------- */
const linhasCalendario = ['Anuidades que prescrevem (R$)', 'Autos que prescrevem', 'Processos que passam de 120 dias no status', 'Contratos que terminam'] as const;
const valorDoMes = (row: Mes, linha: number) => [row.valor, row.autos.length, row.alerta.length, row.contratos.n][linha];
const exportarCalendario = (cal: Mes[]): Exportavel => ({ cabecalho: ['Mês', 'Anuidades que prescrevem (R$)', 'Devedores', 'Autos que prescrevem', 'Processos que passam de 120 dias no status', 'Contratos que terminam', 'Valor dos contratos (R$)'],
  linhas: () => cal.map(row => [mes(row.month), Math.round(row.valor), row.anuidades.length, row.autos.length, row.alerta.length, row.contratos.n, Math.round(row.contratos.valor)]) });
function Calendario({ ctx, cal }: { ctx: CockpitCtx; cal: Mes[] }) {
  const { tokens, dark } = ctx;
  const option = useMemo(() => {
    const neutro = dark ? '#15265C' : '#F4F6F9', cores = [tokens.bad, tokens.bad, tokens.warn, tokens.heat[2]];
    const dados = linhasCalendario.flatMap((_, y) => { const max = Math.max(1, ...cal.map(row => valorDoMes(row, y)));
      return cal.map((row, x) => { const value = valorDoMes(row, y), cor = value ? misturar(neutro, cores[y], 0.18 + value / max * 0.82) : neutro;
        return { value: [x, y, value], itemStyle: { color: cor, borderColor: tokens.surface, borderWidth: 2, borderRadius: 3 }, label: { color: value ? corDoTexto(cor) : tokens.muted } }; }); });
    return {
      grid: { top: 2, right: 4, bottom: 2, left: 2, containLabel: true },
      tooltip: { formatter: (p: any) => { const row = cal[p.value[0]], y = p.value[1];
        const texto = [`${brl(row.valor)} de ${int(row.anuidades.length)} devedores`, `${int(row.autos.length)} autos de infração`, `${int(row.alerta.length)} processos, se nada andar`, `${int(row.contratos.n)} contratos, ${brl(row.contratos.valor)}`][y];
        return `<b>${linhasCalendario[y]}</b><br/>${mes(row.month)}: ${texto}<br/><span style="opacity:.7">clique para ver a lista</span>`; } },
      xAxis: { type: 'category', data: cal.map(row => mes(row.month)), position: 'top', axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11, fontWeight: 700 } },
      yAxis: { type: 'category', inverse: true, data: [...linhasCalendario], axisTick: { show: false }, axisLine: { show: false }, axisLabel: { interval: 0, color: tokens.ink, fontSize: 11, width: 180, overflow: 'break', lineHeight: 13 } },
      // O ECharts exige um visualMap no mapa de calor; ele só fixa a opacidade, e a cor de cada célula vem do item (o texto precisa saber a cor).
      visualMap: { show: false, dimension: 2, min: -1e15, max: 1e15, inRange: { opacity: 1 } },
      series: [{ type: 'heatmap', data: dados, label: { show: true, fontSize: 11, fontWeight: 700, formatter: (p: any) => p.value[2] ? (p.value[1] === 0 ? compacto(p.value[2]) : int(p.value[2])) : '0' } }],
    };
  }, [cal, tokens, dark]);
  return <Chart option={option} tokens={tokens} label={`O que vence ou prescreve em cada um dos próximos 12 meses, ${ondeTexto(ctx)}`} onPick={p => {
    const row = cal[p.value?.[0]], y = p.value?.[1]; if (!row) return;
    if (y === 0) abrirDevedores(ctx, `Anuidades que prescrevem em ${mes(row.month)}`, row.anuidades, 'Devedores com anuidades que completam cinco anos de vencidas no mês e prescrevem se não forem cobradas antes. O valor é só o dessas anuidades.', 'Cobrar ou executar antes do mês.');
    else if (y === 1) abrirPendentes(ctx, `Autos que prescrevem em ${mes(row.month)}`, row.autos, 'Autos de infração esperando voto que prescrevem no mês: cinco anos do fato ou três anos parados no mesmo status.', 'Pautar antes do mês.');
    else if (y === 2) abrirPendentes(ctx, `Passam de 120 dias no status em ${mes(row.month)}`, row.alerta, 'Processos esperando voto que entram em alerta vermelho no mês se continuarem no mesmo status do Votenet.');
    else abrirContratos(ctx, `Contratos que terminam em ${mes(row.month)}`, row.contratos.contratos);
  }} />;
}

/* ---------- O que vence primeiro: a lista com nome ---------- */
interface Prazo { key: string; dia: string; tipo: string; titulo: string; detalhe: string; valor: string; abrir: () => void }
function Urgentes({ ctx, cal }: { ctx: CockpitCtx; cal: Mes[] }) {
  const prazos = useMemo(() => {
    const out: Prazo[] = [];
    for (const row of cal) {
      for (const p of row.autos) { const em = prescricaoDe(p)!.em, empresa = p.t.processo.companyId ? nomeEmpresa(ctx, p.t.processo.companyId) : `Processo ${p.t.id}`;
        out.push({ key: `a:${p.t.id}`, dia: em, tipo: 'Auto prescreve', titulo: empresa, detalhe: `${nomeColegiado(p.t.colegiado)}, com ${nomeDe(ctx, p.evento.com)}`, valor: `${int(p.diasNoStatus)} ${p.diasNoStatus === 1 ? 'dia' : 'dias'} no status`, abrir: () => abrirPendentes(ctx, empresa, [p], 'O auto de infração e quem está com ele.') }); }
      for (const devedor of row.anuidades.filter(item => item.acimaDoPiso)) { const dia = prescreveEm(devedor.titulos[0].vencimento), nome = devedor.devedor === 'Empresa' ? nomeEmpresa(ctx, devedor.pessoaId) : ctx.profissionais.modelo.porId.get(devedor.pessoaId)?.nome ?? devedor.pessoaId;
        out.push({ key: `d:${devedor.pessoaId}:${row.month}`, dia, tipo: 'Anuidade prescreve', titulo: nome, detalhe: `${devedor.devedor === 'Empresa' ? 'empresa' : 'profissional'}, pode ir à execução judicial`, valor: brl(devedor.valor), abrir: () => abrirDevedores(ctx, nome, [devedor], 'As anuidades deste devedor que prescrevem no mês.') }); }
      for (const contrato of row.contratos.contratos) { const nome = nomeProprio(contrato.contratada); out.push({ key: `c:${contrato.numero}`, dia: contrato.fim, tipo: 'Contrato termina', titulo: nome, detalhe: `contrato ${contrato.numero}`, valor: brl(contrato.valor), abrir: () => abrirContratos(ctx, nome, [contrato]) }); }
    }
    return out.sort((a, b) => a.dia.localeCompare(b.dia)).slice(0, 12);
  }, [cal, ctx]);
  return <ol className="pr-prazos">{prazos.map(item => <li key={item.key}><button onClick={item.abrir}>
    <time dateTime={item.dia}>{data(item.dia)}</time><span className={`pr-tipo is-${item.tipo.split(' ')[0].toLowerCase()}`}>{item.tipo}</span>
    <span className="pr-prazo-nome"><b>{item.titulo}</b><small>{item.detalhe}</small></span><span className="pr-prazo-valor">{item.valor}</span></button></li>)}</ol>;
}

/* ---------- Dívida perto de prescrever por regional ---------- */
const exportarExposicao = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Regional', 'Dívida perto de prescrever (R$)', 'Autos perto da prescrição'], linhas: () => {
  const foto = ctx.presidencia?.atual; if (!foto) return []; return [...porRegionalDaFoto(foto, ctx.dataset, ctx.camara)].map(([greId, row]) => [nomeGre(ctx, greId), Math.round(row.perto.n), row.prescricao.n]); } });
function Exposicao({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, foto = ctx.presidencia?.atual ?? null;
  const rows = useMemo(() => foto ? [...porRegionalDaFoto(foto, ctx.dataset, ctx.camara)].map(([greId, row]) => ({ greId, valor: valorDe(indicador('perto'), row.perto) ?? 0, autos: row.prescricao.n })).sort((a, b) => b.valor - a.valor) : [], [foto, ctx.dataset, ctx.camara]);
  const option = useMemo(() => ({
    grid: { top: 2, right: 112, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${nomeGre(ctx, row.greId)}</b><br/>${brl(row.valor)} de anuidades perto de prescrever<br/>${int(row.autos)} autos perto da prescrição<br/><span style="opacity:.7">clique para ver a regional</span>`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => nomeGre(ctx, row.greId)), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [{ type: 'bar', barMaxWidth: 12, data: rows.map(row => ({ value: row.valor, itemStyle: { color: ctx.greId && ctx.greId !== row.greId ? tokens.line : tokens.bad, borderRadius: [0, 3, 3, 0] } })),
      label: { show: true, position: 'right', fontSize: 11, color: tokens.ink, formatter: (p: any) => { const n = rows[p.dataIndex].autos; return `{v|${brl(rows[p.dataIndex].valor)}}${n ? `  ${int(n)} ${n === 1 ? 'auto' : 'autos'}` : ''}`; }, rich: { v: { fontWeight: 800, fontSize: 11, color: tokens.ink } } } }],
  }), [rows, tokens, ctx.greId]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Dívida de anuidades perto de prescrever e autos perto da prescrição em cada regional" onPick={p => { const row = rows[p.dataIndex]; if (row) ctx.filterGre(row.greId); }} />;
}

/* ---------- A fila de cada colegiado pelo tempo no status ---------- */
const exportarFila = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Colegiado', ...faixasNoStatus], linhas: () => colegiados.map(col => [nomeColegiado(col), ...faixasNoStatus.map((_, i) => g(ctx).colegiado!.pendentes.filter(row => row.t.colegiado === col && faixaNoStatus(row.diasNoStatus) === i).length)]) });
function Fila({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, c = g(ctx).colegiado!;
  const rows = useMemo(() => colegiados.map(col => { const pend = c.pendentes.filter(row => row.t.colegiado === col); return { col, faixas: faixasNoStatus.map((_, i) => pend.filter(row => faixaNoStatus(row.diasNoStatus) === i)), total: pend.length }; }).filter(row => row.total).sort((a, b) => b.total - a.total), [c]);
  const option = useMemo(() => {
    const cores = [tokens.heat[1], tokens.heat[2], tokens.warn, tokens.bad, misturar(tokens.bad, '#000000', 0.35)];
    const maior = Math.max(1, ...rows.map(row => row.total));
    return {
      grid: { top: 24, right: 30, bottom: 2, left: 2, containLabel: true }, legend: { ...legenda(tokens), data: [...faixasNoStatus] },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${nomeColegiado(row.col)}</b>: ${int(row.total)} esperando voto<br/>${faixasNoStatus.map((f, i) => `${f} no status: ${int(row.faixas[i].length)}`).join('<br/>')}`; } },
      xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.col), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
      series: faixasNoStatus.map((faixa, i) => ({ name: faixa, type: 'bar', stack: 'f', barMaxWidth: 14, data: rows.map(row => row.faixas[i].length), itemStyle: { color: cores[i], borderColor: tokens.surface, borderWidth: 1 },
        label: { show: true, position: 'inside', fontSize: 11, fontWeight: 700, color: corDoTexto(cores[i]), formatter: (p: any) => p.value >= Math.max(4, maior * 0.08) ? p.value : '' } }))
        .concat([{ name: 'total', type: 'bar', stack: 'f', barMaxWidth: 14, data: rows.map(() => 0), itemStyle: { color: 'transparent', borderColor: 'transparent', borderWidth: 0 }, label: { show: true, position: 'right', fontSize: 11, fontWeight: 800, color: tokens.ink, formatter: (p: any) => int(rows[p.dataIndex].total) } } as any]),
    };
  }, [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Processos esperando voto em cada colegiado pelo tempo no mesmo status" onPick={p => { const row = rows[p.dataIndex]; if (!row) return; const lista = p.seriesIndex < faixasNoStatus.length ? row.faixas[p.seriesIndex] : row.faixas.flat();
    abrirPendentes(ctx, `${nomeColegiado(row.col)}${p.seriesIndex < faixasNoStatus.length ? `, ${faixasNoStatus[p.seriesIndex]} no status` : ''}`, lista, `Processos esperando voto no colegiado ${nomeColegiado(row.col)}.`); }} />;
}

/* ---------- Receita e despesa do ano contra o orçado (reais, da Transparência) ---------- */
/** O acumulado do ano, mês a mês, e o ritmo do orçado: o orçado do ano dividido em doze partes iguais, como na página Orçamento do Financeiro. */
function doAno(anchor: string) {
  const mesReal = mesDaData(anchor), r = execucaoDoAno(fin, 'receita', mesReal), d = execucaoDoAno(fin, 'despesa', mesReal);
  return r.acumulado.map((row, i) => ({ mes: row.mes, receita: row.realizado, receitaOrcada: r.orcado * (i + 1) / 12, despesa: d.acumulado[i].realizado, despesaOrcada: d.orcado * (i + 1) / 12 }));
}
const exportarOrcamento = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Mês', 'Receita orçada no ritmo do ano', 'Receita realizada acumulada', 'Despesa orçada no ritmo do ano', 'Despesa realizada acumulada'],
  linhas: () => doAno(ctx.anchor).map(row => [row.mes, Math.round(row.receitaOrcada), row.receita ?? '', Math.round(row.despesaOrcada), row.despesa ?? '']) });
function Orcamento({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, linhas = useMemo(() => doAno(ctx.anchor), [ctx.anchor]), ano = linhas[0]?.mes.slice(0, 4) ?? '';
  const option = useMemo(() => {
    const linha = (name: string, valores: (number | null)[], cor: string, tracejada: boolean) => ({ name, type: 'line', data: valores, symbol: 'circle', symbolSize: 4, connectNulls: false, lineStyle: { color: cor, width: tracejada ? 1.5 : 2.4, type: tracejada ? 'dashed' : 'solid' }, itemStyle: { color: cor },
      endLabel: { show: !tracejada, fontSize: 11, fontWeight: 700, color: cor, formatter: (p: any) => `R$ ${compacto(p.value)}` } });
    return {
      grid: { top: 30, right: 62, bottom: 2, left: 4, containLabel: true }, legend: { ...legenda(tokens), itemGap: 8 },
      tooltip: { trigger: 'axis', valueFormatter: (value: number) => value === null || value === undefined ? '—' : brl(value) },
      xAxis: eixoCategoria(tokens, linhas.map(row => mes(row.mes)), { boundaryGap: false }), yAxis: eixoValor(tokens),
      series: [linha('Receita orçada', linhas.map(row => row.receitaOrcada), tokens.good, true), linha('Receita', linhas.map(row => row.receita), tokens.good, false),
        linha('Despesa orçada', linhas.map(row => row.despesaOrcada), tokens.bad, true), linha('Despesa', linhas.map(row => row.despesa), tokens.bad, false)],
    };
  }, [linhas, tokens]);
  return <Chart option={option} tokens={tokens} label={`Receita e despesa acumuladas em ${ano} contra o orçado, pela Transparência`} onPick={() => ctx.go('orcamento')} />;
}
