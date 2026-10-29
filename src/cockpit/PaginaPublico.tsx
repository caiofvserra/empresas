import { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { Chart } from '../painel/chart';
import { int, money, pct } from '../painel/ui';
import type { CockpitCtx } from './contexto';
import { piso } from './cruzamentos';
import { brasil, fonteConfea, formacaoSp, medianaAdmissaoCivil, registrosNovos, resultados2025, salarios, ufs } from './publico';
import { Bloco, Selo } from './ui';

/** Aba 8 · Contexto público: somente dados públicos reais, com fonte e data de captura. Não respondem aos filtros do painel. */
export default function PaginaPublico({ ctx }: { ctx: CockpitCtx }) {
  return <div className="ck-grid ck-grid-publico">
    <section className="ck-facts" style={{ gridArea: 'kpi' }} aria-label="Resultados publicados pelo CREA-SP em 2025">
      <span className="ck-facts-title">Resultados publicados · exercício 2025 <Selo data={resultados2025.fonte.data} /><a href={resultados2025.fonte.url} target="_blank" rel="noreferrer" aria-label="Abrir o Relatório de Gestão 2025"><ExternalLink size={13} /></a></span>
      <div className="ck-facts-row">{resultados2025.itens.map(item => <div key={item.id} className="ck-fact"><strong>{item.display}</strong><span>{item.label}</span></div>)}</div>
    </section>
    <Bloco ctx={ctx} id="pi" area="pi" title="Remuneração de engenheiros × piso legal" question="Salário médio CLT de ocupações de engenharia contra o piso exigível e a leitura do Confea." badge={<Selo data={salarios.fonte.data} />} help={`Piso da Lei 4.950-A/66 em jornada de 8 h: ${money(piso.exigivel8h)} (8,5 × R$ 1.212, base congelada pelo STF em 2022); leitura Confea com o salário mínimo vigente: ${money(piso.confea8h)}. Salários: CAGED via portal salario.com.br.`}><Remuneracao ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="fo" area="fo" title="Formação em engenharia em São Paulo" question="Concluintes e ingressantes de cursos presenciais de engenharia, por ano. Ao lado, os maiores cursos." badge={<Selo data={formacaoSp.fonte.data} />}><Formacao ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="de" area="de" title="Profissionais por 100 mil habitantes, por UF" question="Profissionais ativos no Sistema Confea/Crea em relação à população. SP em destaque; a linha é a média do Brasil." badge={<Selo data={fonteConfea.data} />}><Densidade ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mu" area="mu" title="Participação feminina, por UF" question="% de mulheres entre os profissionais registrados. SP em destaque; a linha é a média do Brasil." badge={<Selo data={fonteConfea.data} />}><Mulheres ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="rn" area="rn" title="Registros profissionais novos por ano" question="CREA-SP (barras, série publicada até 2022) e Brasil (linha). Antecipa a reposição de responsáveis técnicos." badge={<Selo data={registrosNovos.fonte.data} />}><Registros ctx={ctx} /></Bloco>
  </div>;
}

function Remuneracao({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx;
  const rows = useMemo(() => [...salarios.linhas.filter(row => row.engenharia).map(row => ({ nome: row.ocupacao, valor: row.salario, nota: `${int(row.movimentacoes)} movimentações · ${row.horas} h/semana` })),
    ...(medianaAdmissaoCivil ? [{ nome: 'Engenheiro civil · mediana de admissão', valor: medianaAdmissaoCivil.valor, nota: `Novo CAGED, ${medianaAdmissaoCivil.periodo}` }] : [])].sort((a, b) => a.valor - b.valor), []);
  const option = useMemo(() => ({
    grid: { top: 26, right: 34, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.nome}</b><br/>${money(row.valor)} · ${pct(row.valor / piso.exigivel8h * 100)} do piso exigível<br/><span style="opacity:.75">${row.nota}</span>`; } },
    xAxis: { type: 'value', min: 0, max: (value: { max: number }) => Math.max(value.max, piso.confea8h) * 1.08, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: (value: number) => value.toLocaleString('pt-BR', { notation: 'compact' }) } },
    yAxis: { type: 'category', data: rows.map(row => row.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5, width: 170, overflow: 'break' } },
    series: [
      { type: 'bar', barWidth: 3, data: rows.map(row => ({ value: row.valor, itemStyle: { color: row.valor < piso.exigivel8h ? tokens.bad : tokens.blue } })), silent: true,
        markLine: { symbol: 'none', silent: true, label: { color: tokens.muted, fontSize: 10, position: 'end', formatter: (item: any) => item.name }, data: [
          { xAxis: piso.exigivel8h, name: `piso exigível ${money(piso.exigivel8h)}`, lineStyle: { color: tokens.bad, type: 'solid', width: 1.5 } },
          { xAxis: piso.confea8h, name: `leitura Confea ${money(piso.confea8h)}`, lineStyle: { color: tokens.accent, type: 'dashed', width: 1.5 }, label: { position: 'start', color: tokens.muted, fontSize: 10, formatter: (item: any) => item.name } }] } },
      { type: 'scatter', symbolSize: 13, data: rows.map(row => ({ value: row.valor, itemStyle: { color: row.valor < piso.exigivel8h ? tokens.bad : tokens.blue, borderColor: tokens.surface, borderWidth: 2 } })), label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, fontWeight: 700, formatter: (item: any) => money(item.value) } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Salário médio de ocupações de engenharia contra o piso legal" />;
}

function Formacao({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, total = formacaoSp.total, primeiro = total[0], ultimo = total.at(-1)!;
  const option = useMemo(() => ({
    grid: { top: 26, right: 6, bottom: 2, left: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: total.map(row => row.ano), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: (value: number) => value.toLocaleString('pt-BR', { notation: 'compact' }) } },
    series: [
      { name: 'Concluintes', type: 'bar', barWidth: '52%', data: total.map(row => row.concluintes), itemStyle: { color: tokens.blue, borderRadius: [4, 4, 0, 0] }, label: { show: true, position: 'top', color: tokens.ink, fontSize: 9.5, formatter: (item: any) => (item.value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil' } },
      { name: 'Ingressantes', type: 'line', data: total.map(row => row.ingressantes), smooth: 0.3, symbol: 'circle', symbolSize: 5, lineStyle: { color: tokens.accent, width: 2.5 }, itemStyle: { color: tokens.accent } },
    ],
  }), [total, tokens]);
  return <div className="split">
    <Chart option={option} tokens={tokens} label="Concluintes e ingressantes de engenharia em SP por ano" />
    <ul className="side-list">{formacaoSp.cursos.slice(0, 6).map(curso => { const first = curso.serie[0], last = curso.serie.at(-1)!; return <li key={curso.curso}><span className="side-row"><span>{curso.curso}</span><b>{int(last)}</b><small className={last >= first ? 'pos' : 'neg'}>{first ? `${last >= first ? '+' : ''}${pct((last / first - 1) * 100)} desde ${formacaoSp.anos[0]}` : ''}</small></span></li>; })}
      <li className="side-note">Total: {int(primeiro.concluintes)} concluintes em {primeiro.ano} e {int(ultimo.concluintes)} em {ultimo.ano} ({pct((ultimo.concluintes / primeiro.concluintes - 1) * 100)})</li></ul>
  </div>;
}

function rankingUf(ctx: CockpitCtx, rows: { uf: string; valor: number }[], media: number | null, formato: (value: number) => string, label: string) {
  const { tokens } = ctx, sorted = [...rows].sort((a, b) => b.valor - a.valor);
  return {
    grid: { top: 18, right: 8, bottom: 2, left: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>${sorted[items[0].dataIndex].uf}</b><br/>${label}: ${formato(items[0].value)}` },
    xAxis: { type: 'category', data: sorted.map(row => row.uf), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 9.5, interval: 0 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
    series: [{ type: 'bar', barWidth: '64%', data: sorted.map(row => ({ value: row.valor, itemStyle: { borderRadius: [3, 3, 0, 0], color: row.uf === 'SP' ? tokens.accent : tokens.heat[1] } })),
      label: { show: true, position: 'top', fontSize: 10, fontWeight: 700, color: tokens.ink, formatter: (item: any) => sorted[item.dataIndex].uf === 'SP' ? `SP ${formato(item.value)}` : '' },
      markLine: media === null ? undefined : { symbol: 'none', silent: true, lineStyle: { color: tokens.brand, type: 'dashed' }, label: { formatter: `Brasil ${formato(media)}`, color: tokens.ink, fontSize: 10, position: 'insideEndTop' }, data: [{ yAxis: media }] } }],
  };
}
function Densidade({ ctx }: { ctx: CockpitCtx }) {
  const option = useMemo(() => rankingUf(ctx, ufs.map(row => ({ uf: row.uf, valor: Math.round(row.por100mil) })), Math.round(brasil.ativos / brasil.populacao * 100000), int, 'Profissionais por 100 mil hab.'), [ctx.tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={ctx.tokens} label="Profissionais ativos por 100 mil habitantes por UF" />;
}
function Mulheres({ ctx }: { ctx: CockpitCtx }) {
  const option = useMemo(() => rankingUf(ctx, ufs.filter(row => row.pctMulheres !== null).map(row => ({ uf: row.uf, valor: row.pctMulheres! })), brasil.pctMulheres, value => pct(value, 1), 'Mulheres'), [ctx.tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={ctx.tokens} label="Percentual de mulheres entre os profissionais por UF" />;
}
function Registros({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, serie = registrosNovos.serie;
  const option = useMemo(() => ({
    grid: { top: 26, right: 6, bottom: 2, left: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', formatter: (items: any[]) => `<b>${items[0].axisValue}</b><br/>${items.map(item => `${item.marker}${item.seriesName}: ${item.value === null || item.value === undefined ? 'não publicado' : int(item.value)}`).join('<br/>')}` },
    xAxis: { type: 'category', data: serie.map(row => row.ano), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: [{ type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: (value: number) => value.toLocaleString('pt-BR', { notation: 'compact' }) } }, { type: 'value', splitLine: { show: false }, axisLabel: { color: tokens.muted, formatter: (value: number) => value.toLocaleString('pt-BR', { notation: 'compact' }) } }],
    series: [
      { name: 'CREA-SP (eixo esquerdo)', type: 'bar', barWidth: '54%', data: serie.map(row => row.sp), itemStyle: { color: tokens.accent, borderRadius: [3, 3, 0, 0] } },
      { name: 'Brasil (eixo direito)', type: 'line', yAxisIndex: 1, data: serie.map(row => row.brasil), smooth: 0.3, symbol: 'circle', symbolSize: 5, lineStyle: { color: tokens.brand, width: 2.5 }, itemStyle: { color: tokens.brand } },
    ],
  }), [serie, tokens]);
  return <Chart option={option} tokens={tokens} label="Registros profissionais novos por ano, CREA-SP e Brasil" />;
}
