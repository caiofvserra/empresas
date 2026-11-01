import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { brl, int, mes, money, pct, short } from '../painel/ui';
import { fontesReceita } from '../domain/conselho';
import type { CockpitCtx } from './contexto';
import { despesaPublicada } from './publico';
import { Bloco, Indicador, Selo, carregando } from './ui';

/**
 * Aba 9 · Controle interno: a despesa do Conselho como o Portal da Transparência a publica, organizada como no QUEDA
 * (atividade-fim × atividade-meio, natureza, diárias, sede × território, orçado × realizado, receita, fornecedores e contratos,
 * pessoal), mais capacitação sem medida de efeito e a despesa publicada real. Cada bloco diz o que mede e o que não mede; nenhum emite juízo.
 */
const change = (now: number, before: number) => before > 0 ? (now - before) / before * 100 : null;

export default function PaginaControle({ ctx }: { ctx: CockpitCtx }) {
  const c = ctx.conselho, cap = ctx.estrutura?.capacitacao;
  const despesa = c.porNatureza.reduce((sum, row) => sum + row.realizado, 0), despesaAntes = c.porNatureza.reduce((sum, row) => sum + row.antes, 0);
  const diarias = c.diarias.reduce((sum, row) => sum + row.valor, 0), diariasAntes = c.diarias.reduce((sum, row) => sum + row.antes, 0);
  const anoCorrente = c.orcadoRealizado.at(-1);
  return <div className="ck-grid ck-grid-controle">
    <section className="ck-cards is-six" style={{ gridArea: 'kpi' }} aria-label="Indicadores de controle interno">
      <Indicador destaque ficha="k-despesa" ctx={ctx} label="Despesa realizada em 12 meses" value={brl(despesa)} variacao={{ value: change(despesa, despesaAntes), goodUp: false, label: 'vs. 12 meses anteriores' }} spark={c.ritmo.slice(-12).map(row => row.realizado)} cor={ctx.tokens.accent} sub={`competência até ${mes(c.ultimoMes)}`} />
      <Indicador ficha="k-fim" ctx={ctx} label="Em atividades-fim" value={c.fimMeioAtual.taxaFim === null ? '—' : pct(c.fimMeioAtual.taxaFim)} sub={`${brl(c.fimMeioAtual.fim)} fiscalização, atendimento e institucional · ${brl(c.fimMeioAtual.meio)} meio`} />
      <Indicador ficha="k-execucao" ctx={ctx} label={`Execução orçamentária ${anoCorrente?.ano ?? ''}`} value={anoCorrente?.execucao == null ? '—' : pct(anoCorrente.execucao)} sub={anoCorrente ? `${brl(anoCorrente.realizado)} realizados de ${brl(anoCorrente.orcado)} orçados até a data de referência` : ''} />
      <Indicador ficha="k-diarias" ctx={ctx} label="Diárias e passagens" value={brl(diarias)} variacao={{ value: change(diarias, diariasAntes), goodUp: false, label: 'vs. 12 meses anteriores' }} spark={c.diariasMensal.slice(-12).map(row => row.valor)} cor={ctx.tokens.blue} sub={`${int(c.diarias.reduce((sum, row) => sum + row.quantidade, 0))} diárias em 12 meses`} />
      <Indicador ficha="k-concentracao" ctx={ctx} label="Cinco maiores fornecedores" value={c.concentracao === null ? '—' : pct(c.concentracao)} sub={`do empenhado em 12 meses · ${int(c.fornecedores.length)} fornecedores · HHI ${int(c.hhi)}`} />
      <Indicador ficha="k-contratos" ctx={ctx} label="Contratos vigentes" value={int(c.contratos.vigentes)} sub={`${brl(c.contratos.valorVigente)} · ${int(c.contratos.comAditivo)} com aditivo · ${int(c.contratos.vencem90)} vencem em 90 dias`} />
    </section>
    <Bloco ctx={ctx} id="cf" area="cf" title="Despesa com a atividade-fim e com a atividade-meio" question="Quanto o Conselho gastou por ano com fiscalização, atendimento e ações institucionais, comparado com o gasto em direção e administração. O ano corrente vai até a data escolhida no alto da tela."><FimMeio ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="cn" area="cn" title="Despesa por natureza" question="O orçado (barra clara) e o realizado (barra escura) nos últimos 12 meses. A seta compara com os 12 meses anteriores."><Naturezas ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="cs" area="cs" title="Gasto na sede e nas regionais, e custo de cada ação fiscal" question="À esquerda, a despesa da sede e a das regionais. À direita, quanto cada regional gastou com fiscalização dividido pelo número de ações fiscais que fez em 12 meses."><SedeTerritorio ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="cd" area="cd" title="Diárias" question="Quantidade, valor e quilometragem das diárias em 12 meses, por tipo de beneficiário. Abaixo, a evolução mensal nos últimos 24 meses."><Diarias ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="cr" area="cr" title="De onde vem a receita do Conselho" question="Receita de cada ano por origem: anuidades de profissionais e de empresas, taxas de ART, multas e outras. O ano corrente ainda está incompleto."><ReceitaFontes ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="cc" area="cc" title="Fornecedores e contratos" question="Quanto foi empenhado e pago a cada fornecedor nos últimos 12 meses, e os contratos vigentes por modalidade de contratação. Concentração alta não significa irregularidade."><Fornecedores ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="cp" area="cp" title="Pessoal por função" question="Servidores efetivos, comissionados e o custo mensal da folha em cada função, na data escolhida."><Pessoal ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ck" area="ck" title="Capacitação: quantas pessoas e quanto custou" question="Cursos e ações de orientação no período, quantas pessoas participaram e o custo por participante. O painel não mede o efeito da capacitação.">{cap ? <Capacitacao ctx={ctx} /> : carregando}</Bloco>
    <Bloco ctx={ctx} id="dp" area="dp" title="Despesa publicada pelo Conselho" question={`Dados reais do Portal da Transparência: a despesa de cada exercício e a composição acumulada ${despesaPublicada.periodo}. Este bloco não muda com os filtros.`} badge={<Selo data={despesaPublicada.fonte.data} />}><Despesa ctx={ctx} /></Bloco>
  </div>;
}

function FimMeio({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = ctx.conselho.fimMeio;
  const option = useMemo(() => ({
    grid: { top: 30, right: 8, bottom: 2, left: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex], total = row.fim + row.meio; return `<b>${row.ano}</b>${row.ano === rows.at(-1)?.ano ? ' · até a data de referência' : ''}<br/>Fim: ${money(row.fim)} (${pct(row.fim / Math.max(1, total) * 100)})<br/>Meio: ${money(row.meio)}`; } },
    xAxis: { type: 'category', data: rows.map(row => row.ano), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: (value: number) => value.toLocaleString('pt-BR', { notation: 'compact' }) } },
    series: [
      { name: 'Atividade-fim', type: 'bar', stack: 'd', barWidth: '54%', data: rows.map(row => row.fim), itemStyle: { color: tokens.brand } },
      { name: 'Atividade-meio', type: 'bar', stack: 'd', data: rows.map(row => row.meio), itemStyle: { color: tokens.heat[1], borderRadius: [3, 3, 0, 0] }, label: { show: true, position: 'top', color: tokens.ink, fontSize: 10, formatter: (params: any) => { const row = rows[params.dataIndex]; return pct(row.fim / Math.max(1, row.fim + row.meio) * 100); } } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Despesa em atividades-fim e atividades-meio por ano" />;
}

function Naturezas({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => [...ctx.conselho.porNatureza].sort((a, b) => b.realizado - a.realizado), [ctx.conselho]);
  const option = useMemo(() => ({
    grid: { top: 26, right: 84, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex], delta = change(row.realizado, row.antes); return `<b>${row.natureza}</b><br/>Orçado: ${money(row.orcado)}<br/>Realizado: ${money(row.realizado)} (${pct(row.realizado / Math.max(1, row.orcado) * 100)} do orçado)${delta === null ? '' : `<br/>${delta >= 0 ? '+' : ''}${pct(delta)} vs. 12 meses anteriores`}`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.natureza), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5, width: 130, overflow: 'truncate' } },
    series: [
      { name: 'Orçado', type: 'bar', barWidth: 16, barGap: '-100%', data: rows.map(row => row.orcado), itemStyle: { color: tokens.soft, borderColor: tokens.heat[1], borderWidth: 1, borderRadius: 4 }, z: 1 },
      { name: 'Realizado', type: 'bar', barWidth: 8, data: rows.map(row => row.realizado), itemStyle: { color: tokens.brand, borderRadius: 3 }, z: 2,
        label: { show: true, position: 'right', distance: 24, fontSize: 10, formatter: (params: any) => { const row = rows[params.dataIndex], delta = change(row.realizado, row.antes); return `{n|${brl(row.realizado)}} {${delta === null || Math.abs(delta) < 0.5 ? 'n' : delta > 0 ? 'r' : 'g'}|${delta === null ? '' : `${delta >= 0 ? '+' : ''}${pct(delta)}`}}`; },
          rich: { n: { color: tokens.ink, fontWeight: 700, fontSize: 10 }, g: { color: tokens.good, fontWeight: 700, fontSize: 9.5 }, r: { color: tokens.bad, fontWeight: 700, fontSize: 9.5 } } } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Despesa por natureza: orçado e realizado nos últimos 12 meses" />;
}

function SedeTerritorio({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, s = ctx.conselho.sedeTerritorio, gres = new Map(ctx.dataset.gres.map(row => [row.id, short(row.name)]));
  const rows = useMemo(() => s.porGre.filter(row => row.acoes > 0), [s]);
  const rosca = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (item: any) => `<b>${item.name}</b><br/>${money(item.value)} · ${pct(item.percent)}` },
    title: { text: brl(s.sede + s.territorio), subtext: '12 meses', left: 'center', top: '36%', textStyle: { color: tokens.ink, fontSize: 15, fontWeight: 800, fontFamily: 'Raleway, Lato, sans-serif' }, subtextStyle: { color: tokens.muted, fontSize: 10 } },
    legend: { bottom: 0, left: 'center', itemWidth: 9, itemHeight: 9, textStyle: { color: tokens.muted, fontSize: 10 } },
    series: [{ type: 'pie', radius: ['54%', '78%'], center: ['50%', '44%'], padAngle: 2, itemStyle: { borderRadius: 4, borderColor: tokens.surface, borderWidth: 2 }, label: { show: false },
      data: [{ name: 'Sede', value: s.sede, itemStyle: { color: tokens.brand } }, { name: 'Território (regionais)', value: s.territorio, itemStyle: { color: tokens.accent } }] }],
  }), [s, tokens]);
  const barras = useMemo(() => ({
    grid: { top: 4, right: 70, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${gres.get(row.greId) ?? row.greId}</b><br/>${money(row.valor)} em fiscalização · ${int(row.acoes)} ações<br/>Custo por ação: <b>${row.custoPorAcao === null ? '—' : money(row.custoPorAcao)}</b>`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => gres.get(row.greId) ?? row.greId), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10, interval: 0 } },
    series: [{ type: 'bar', barWidth: 9, data: rows.map(row => row.custoPorAcao ?? 0), itemStyle: { color: tokens.blue, borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 9.5, formatter: (params: any) => brl(params.value) } }],
  }), [rows, tokens, gres]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="duo is-sede">
    <Chart option={rosca} tokens={tokens} label="Despesa da sede e do território" />
    <Chart option={barras} tokens={tokens} label="Custo por ação fiscal por regional" onPick={params => { const row = rows[params.dataIndex]; if (row) ctx.open({ kind: 'gre', id: row.greId }); }} />
    <p className="duo-note">Custo por ação varia com distância e tipo de ação; comparar regionais com cautela.</p>
  </div>;
}

function Diarias({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, c = ctx.conselho, rows = useMemo(() => [...c.diarias].sort((a, b) => b.valor - a.valor), [c]);
  const barras = useMemo(() => ({
    grid: { top: 4, right: 96, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex], delta = change(row.valor, row.antes); return `<b>${row.categoria}</b><br/>${money(row.valor)} · ${int(row.quantidade)} diárias · ${int(row.km)} km${delta === null ? '' : `<br/>${delta >= 0 ? '+' : ''}${pct(delta)} vs. 12 meses anteriores`}`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.categoria), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5, width: 130, overflow: 'truncate' } },
    series: [{ type: 'bar', barWidth: 13, data: rows.map(row => row.valor), itemStyle: { color: tokens.blue, borderRadius: [0, 4, 4, 0] }, showBackground: true, backgroundStyle: { color: tokens.soft, borderRadius: 4 },
      label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (params: any) => `${brl(params.value)} · ${int(rows[params.dataIndex].quantidade)}` } }],
  }), [rows, tokens]);
  const mensal = useMemo(() => ({
    grid: { top: 6, right: 6, bottom: 2, left: 4, containLabel: true },
    tooltip: { trigger: 'axis', formatter: (items: any[]) => `<b>${mes(c.diariasMensal[items[0].dataIndex].month)}</b><br/>${money(items[0].value)}` },
    xAxis: { type: 'category', data: c.diariasMensal.map(row => mes(row.month)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 9.5, interval: 3 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 9.5, formatter: (value: number) => value.toLocaleString('pt-BR', { notation: 'compact' }) } },
    series: [{ type: 'line', data: c.diariasMensal.map(row => row.valor), smooth: 0.3, symbol: 'none', areaStyle: { color: tokens.blue, opacity: 0.12 }, lineStyle: { color: tokens.blue, width: 2 } }],
  }), [c, tokens]);
  return <div className="gauge-stack is-even">
    <Chart option={barras} tokens={tokens} label="Diárias por categoria de beneficiário em 12 meses" />
    <Chart option={mensal} tokens={tokens} label="Diárias por mês, 24 meses" />
  </div>;
}

function ReceitaFontes({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, c = ctx.conselho, cores = [tokens.blue, tokens.brand, tokens.accent, tokens.bad, tokens.line];
  const option = useMemo(() => ({
    grid: { top: 30, right: 8, bottom: 2, left: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>${items[0].name}</b>${items[0].name === c.anos.at(-1) ? ' · parcial' : ''}<br/>${items.map(item => `${item.marker}${item.seriesName}: ${money(item.value)}`).join('<br/>')}<br/>Total: <b>${money(items.reduce((sum, item) => sum + item.value, 0))}</b>` },
    xAxis: { type: 'category', data: c.anos, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: (value: number) => value.toLocaleString('pt-BR', { notation: 'compact' }) } },
    series: fontesReceita.map((fonte, index) => ({ name: fonte, type: 'bar', stack: 'r', barWidth: '54%', data: c.anos.map(ano => c.receitaAnual.find(row => row.ano === ano && row.fonte === fonte)?.valor ?? 0), itemStyle: { color: cores[index], borderRadius: index === fontesReceita.length - 1 ? [3, 3, 0, 0] : 0 } })),
  }), [c, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = c.receita.reduce((sum, row) => sum + row.realizada, 0), antes = c.receita.reduce((sum, row) => sum + row.antes, 0), delta = change(total, antes);
  return <div className="stack">
    <p className="kpi-line"><b>{brl(total)}</b> realizados em 12 meses{delta === null ? '' : ` (${delta >= 0 ? '+' : ''}${pct(delta)} vs. 12 meses anteriores)`} · {c.receita.filter(row => row.realizada).map(row => `${row.fonte.toLowerCase()} ${pct(row.realizada / Math.max(1, total) * 100)}`).join(' · ')}</p>
    <Chart option={option} tokens={tokens} label="Receita realizada por fonte e ano" />
  </div>;
}

function Fornecedores({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, c = ctx.conselho, rows = c.fornecedores.slice(0, 8), total = c.fornecedores.reduce((sum, row) => sum + row.empenhado, 0);
  const option = useMemo(() => ({
    grid: { top: 26, right: 70, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.fornecedor.nome}</b><br/>${row.fornecedor.objeto} · ${row.fornecedor.natureza}<br/>Empenhado: ${money(row.empenhado)} (${pct(row.empenhado / Math.max(1, total) * 100)}) · Pago: ${money(row.pago)}<br/>${int(row.contratos)} contrato${row.contratos === 1 ? '' : 's'} vigente${row.contratos === 1 ? '' : 's'}`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.fornecedor.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10, width: 130, overflow: 'truncate' } },
    series: [
      { name: 'Empenhado', type: 'bar', barWidth: 12, barGap: '-100%', data: rows.map(row => row.empenhado), itemStyle: { color: tokens.soft, borderColor: tokens.heat[1], borderWidth: 1, borderRadius: 3 }, z: 1, label: { show: true, position: 'right', color: tokens.ink, fontSize: 9.5, formatter: (params: any) => `${brl(params.value)} · ${pct(params.value / Math.max(1, total) * 100)}` } },
      { name: 'Pago', type: 'bar', barWidth: 6, data: rows.map(row => row.pago), itemStyle: { color: tokens.brand, borderRadius: 3 }, z: 2 },
    ],
  }), [rows, tokens, total]);
  return <div className="split is-wide">
    <Chart option={option} tokens={tokens} label="Maiores fornecedores por valor empenhado em 12 meses" />
    <ul className="side-list" aria-label="Contratos vigentes por modalidade">{c.contratos.porModalidade.filter(row => row.n).map(row => <li key={row.modalidade}><span className="side-row"><span>{row.modalidade}</span><b>{int(row.n)}</b><small>{brl(row.valor)}</small></span></li>)}
      <li className="side-note">{int(c.contratos.vigentes)} contratos vigentes · {int(c.contratos.comAditivo)} com aditivo · {int(c.contratos.vencem90)} vencem em 90 dias · HHI {int(c.hhi)} (acima de 2.500 é alta concentração)</li></ul>
  </div>;
}

function Pessoal({ ctx }: { ctx: CockpitCtx }) {
  const rows = ctx.conselho.pessoal, total = rows.reduce((sum, row) => sum + row.efetivos + row.comissionados, 0), custo = rows.reduce((sum, row) => sum + row.custoMes, 0);
  return <div className="table-wrap"><table className="metodo is-dense">
    <thead><tr><th>Função</th><th className="num">Efetivos</th><th className="num">Comissionados</th><th className="num">Custo mensal</th><th className="num">Por pessoa</th></tr></thead>
    <tbody>{rows.map(row => { const n = row.efetivos + row.comissionados; return <tr key={row.funcao}><td><b>{row.funcao}</b></td><td className="num">{int(row.efetivos)}</td><td className="num">{int(row.comissionados)}</td><td className="num">{brl(row.custoMes)}</td><td className="num">{n ? money(row.custoMes / n) : '—'}</td></tr>; })}
      <tr><td><b>Total</b></td><td className="num"><b>{int(rows.reduce((sum, row) => sum + row.efetivos, 0))}</b></td><td className="num"><b>{int(rows.reduce((sum, row) => sum + row.comissionados, 0))}</b></td><td className="num"><b>{brl(custo)}</b></td><td className="num">{total ? money(custo / total) : '—'}</td></tr></tbody>
  </table></div>;
}

function Capacitacao({ ctx }: { ctx: CockpitCtx }) {
  const cap = ctx.estrutura!.capacitacao;
  return <div className="tres is-two">
    <div className="tres-item"><span>Atividades</span><strong>{int(cap.atividades)}</strong><small>formação e orientação no período</small></div>
    <div className="tres-item"><span>Participantes</span><strong>{int(cap.participantes)}</strong><small>{int(cap.presencas)} presenças em {int(cap.inscricoes)} inscrições</small></div>
    <div className="tres-item"><span>Custo</span><strong>{brl(cap.custo)}</strong><small>executado nos programas de capacitação</small></div>
    <div className="tres-item"><span>Por participante</span><strong>{cap.custoPorParticipante === null ? '—' : money(cap.custoPorParticipante)}</strong><small>{cap.custoPorPresenca === null ? '—' : money(cap.custoPorPresenca)} por presença</small></div>
    <p className="duo-note">Custo e alcance apenas. O retorno autodeclarado saiu na V20 porque não mede efeito; qualquer medida de efeito exige desenho próprio.</p>
  </div>;
}

function Despesa({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, exercicios = despesaPublicada.exercicios, subgrupos = [...despesaPublicada.subgrupos].sort((a, b) => b.valor - a.valor);
  const primeiro = exercicios[0], ultimo = exercicios.at(-1)!;
  const option = useMemo(() => ({
    grid: { top: 4, right: 64, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>${items[0].name}</b><br/>${money(items[0].value)} acumulados ${despesaPublicada.periodo}` },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: subgrupos.map(row => row.label), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5, width: 150, overflow: 'truncate' } },
    series: [{ type: 'bar', barWidth: 12, data: subgrupos.map(row => row.valor), itemStyle: { color: tokens.heat[2], borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (params: any) => brl(params.value) } }],
  }), [subgrupos, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="stack">
    <p className="kpi-line">Despesa de <b>{brl(ultimo.valor)}</b> em {ultimo.ano}, contra {brl(primeiro.valor)} em {primeiro.ano} ({ultimo.valor >= primeiro.valor ? '+' : ''}{pct((ultimo.valor / primeiro.valor - 1) * 100)})</p>
    <Chart option={option} tokens={tokens} label="Despesa publicada do CREA-SP por subgrupo" />
  </div>;
}
