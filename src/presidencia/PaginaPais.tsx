import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { brl, int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador, Selo } from '../cockpit/ui';
import type { Exportavel } from '../cockpit/ui';
import { brasil, contasPublicadas, fonteConfea, registrosNovos, ufs } from '../cockpit/publico';
import { compacto, eixoCategoria, eixoValor, legenda } from '../gestao/comum';
import { corDoTexto } from '../cockpit/formatos';

/**
 * Painel da Presidência, página No país (07/11/2026): só dados públicos reais, com o selo "Real". O Crea-SP ao lado dos outros Creas
 * (Confea e IBGE), a receita e a despesa publicadas no Portal da Transparência desde 2013, as maiores contas de receita e os registros
 * novos por ano. Nenhum filtro do alto da tela muda esta página.
 */
const sp = ufs.find(row => row.uf === 'SP')!;
const porMil = brasil.populacao ? brasil.ativos / brasil.populacao * 100000 : 0;
const fechados = contasPublicadas.exercicios.filter(row => row.ano !== contasPublicadas.aberto);
const ultimo = fechados.at(-1)!, penultimo = fechados.at(-2)!;
const art = contasPublicadas.contas[0];

export default function PaginaPais({ ctx }: { ctx: CockpitCtx }) {
  const posicao = [...ufs].sort((a, b) => b.por100mil - a.por100mil).findIndex(row => row.uf === 'SP') + 1;
  return <div className="ck-grid ck-grid-pr-pais">
    <section className="ck-cards is-six" style={{ gridArea: 'kpi' }} aria-label="O Crea-SP no país, com dados públicos reais">
      <Indicador destaque ctx={ctx} ficha="k-ativos" aspecto="Real · Confea" label="Profissionais ativos no Crea-SP" value={int(sp.ativos)} sub={`${pct(sp.ativos / brasil.ativos * 100, 1)} dos ${int(brasil.ativos)} do país`} />
      <Indicador ctx={ctx} ficha="k-densidade" aspecto="Real · Confea e IBGE" label="Profissionais por 100 mil habitantes" value={int(sp.por100mil)} sub={`${posicao}º entre as 27 unidades da federação; no país, ${int(porMil)}`} />
      <Indicador ctx={ctx} ficha="k-mulheres" aspecto="Real · Confea" label="Mulheres entre os profissionais" value={sp.pctMulheres === null ? '—' : pct(sp.pctMulheres, 1)} sub={brasil.pctMulheres === null ? '' : `no país, ${pct(brasil.pctMulheres, 1)}`} />
      <Indicador ctx={ctx} ficha="k-receita" aspecto="Real · Portal da Transparência" label={`Receita do Crea-SP em ${ultimo.ano}`} value={brl(ultimo.receita ?? 0)}
        variacao={{ value: ultimo.receita && penultimo.receita ? (ultimo.receita - penultimo.receita) / penultimo.receita * 100 : null, label: `em relação a ${penultimo.ano}` }} sub={`despesa paga de ${brl(ultimo.paga)}`} />
      <Indicador ctx={ctx} ficha="k-art" aspecto="Real · Portal da Transparência" label="Receita que vem da ART" value={art.parte === null ? '—' : pct(art.parte, 1)} sub={`${brl(art.valor)} de 2013 a ${contasPublicadas.aberto}, a maior conta de receita`} />
      <Indicador ctx={ctx} ficha="k-execucao" aspecto="Real · Portal da Transparência" label={`Despesa paga sobre a dotação em ${ultimo.ano}`} value={ultimo.dotacao ? pct(ultimo.paga / ultimo.dotacao * 100) : '—'}
        sub={ultimo.dotacao && penultimo.dotacao ? `em ${penultimo.ano}, ${pct(penultimo.paga / penultimo.dotacao * 100)}; dotação de ${brl(ultimo.dotacao)}` : ''} />
    </section>
    <Bloco ctx={ctx} id="uf" area="uf" title="Profissionais por 100 mil habitantes" badge={<Selo data={fonteConfea.data} />} exportar={exportarUfs}><Ufs ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mu" area="mu" title="Registro ativo e mulheres em cada estado" badge={<Selo data={fonteConfea.data} />} exportar={exportarUfs}><Mulheres ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="pn" area="pn" title="De onde vem a receita, de 2013 a hoje" badge={<Selo data={contasPublicadas.fonte.data} />} exportar={exportarFontes}><Fontes ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="rd" area="rd" title="Receita e despesa publicadas desde 2013" badge={<Selo data={contasPublicadas.fonte.data} />} exportar={exportarContas}><Contas ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="rg" area="rg" title={`Registros novos por ano; Crea-SP até ${ultimoSp}`} badge={<Selo data={registrosNovos.fonte.data} />} exportar={exportarRegistros}><Registros ctx={ctx} /></Bloco>
  </div>;
}

/* ---------- Profissionais por 100 mil habitantes ---------- */
const exportarUfs: Exportavel = { cabecalho: ['UF', 'Profissionais ativos', 'População', 'Por 100 mil habitantes', 'Parte dos registros que está ativa (%)', 'Mulheres (%)'], linhas: () => ufs.map(row => [row.uf, row.ativos, row.populacao, Math.round(row.por100mil), row.pctAtivos ?? '', row.pctMulheres ?? '']) };
function Ufs({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => [...ufs].sort((a, b) => b.por100mil - a.por100mil), []);
  const option = useMemo(() => ({
    grid: { top: 4, right: 40, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.uf}</b><br/>${int(row.ativos)} profissionais ativos<br/>${int(row.populacao)} habitantes<br/>${int(row.por100mil)} por 100 mil habitantes`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.uf), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { fontSize: 11, color: tokens.ink, formatter: (uf: string) => uf === 'SP' ? `{sp|${uf}}` : uf, rich: { sp: { fontSize: 11, fontWeight: 800, color: tokens.accent } } } },
    series: [{ type: 'bar', barMaxWidth: 11, data: rows.map(row => ({ value: Math.round(row.por100mil), itemStyle: { color: row.uf === 'SP' ? tokens.accent : tokens.heat[1], borderRadius: [0, 3, 3, 0] } })),
      label: { show: true, position: 'right', fontSize: 11, color: tokens.ink, formatter: (p: any) => int(p.value) },
      markLine: { silent: true, symbol: 'none', data: [{ xAxis: Math.round(porMil) }], lineStyle: { color: tokens.muted, type: 'dashed' }, label: { formatter: `país: ${int(porMil)}`, color: tokens.muted, fontSize: 11, position: 'insideEndTop' } } }],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Profissionais com registro ativo por 100 mil habitantes em cada unidade da federação" />;
}

/* ---------- Registro ativo e mulheres ---------- */
function Mulheres({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = ufs.filter(row => row.pctAtivos !== null && row.pctMulheres !== null);
  const option = useMemo(() => ({
    grid: { top: 10, right: 16, bottom: 22, left: 6, containLabel: true },
    tooltip: { trigger: 'item', formatter: (p: any) => { const row = rows[p.dataIndex]; return `<b>${row.uf}</b><br/>${pct(row.pctAtivos!, 1)} dos registros estão ativos<br/>${pct(row.pctMulheres!, 1)} dos profissionais são mulheres<br/>${int(row.ativos)} ativos`; } },
    xAxis: { type: 'value', scale: true, name: 'parte dos registros que está ativa', nameLocation: 'middle', nameGap: 20, nameTextStyle: { color: tokens.muted, fontSize: 11 }, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 11, formatter: '{value}%' } },
    yAxis: { type: 'value', scale: true, name: 'mulheres', nameTextStyle: { color: tokens.muted, fontSize: 11, align: 'left' }, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 11, formatter: '{value}%' } },
    series: [{ type: 'scatter', data: rows.map(row => ({ value: [row.pctAtivos, row.pctMulheres], symbolSize: Math.max(7, Math.sqrt(row.ativos) / 9), itemStyle: { color: row.uf === 'SP' ? tokens.accent : tokens.heat[2], opacity: row.uf === 'SP' ? 1 : 0.55, borderColor: tokens.surface, borderWidth: 1 } })),
      label: { show: true, position: 'right', fontSize: 11, color: tokens.ink, formatter: (p: any) => rows[p.dataIndex].uf }, labelLayout: { hideOverlap: true } }],
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Parte dos registros que está ativa e parte de mulheres em cada unidade da federação; o tamanho do ponto é o número de ativos" />;
}

/* ---------- As maiores contas de receita ---------- */
const exportarFontes: Exportavel = { cabecalho: ['Conta de receita', 'Valor de 2013 a 2026 (R$)', 'Parte da receita (%)'], linhas: () => contasPublicadas.contas.map(row => [row.nome, Math.round(row.valor), row.parte ?? '']) };
function Fontes({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = contasPublicadas.contas, resto = Math.max(0, 100 - rows.reduce((n, row) => n + (row.parte ?? 0), 0));
  const option = useMemo(() => ({
    grid: { top: 4, right: 96, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.nome}</b><br/>${brl(row.valor)} de 2013 a ${contasPublicadas.aberto}<br/>${row.parte === null ? '' : `${pct(row.parte, 1)} da receita`}`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11, width: 230, overflow: 'truncate' } },
    series: [{ type: 'bar', barMaxWidth: 14, data: rows.map((row, i) => ({ value: row.valor, itemStyle: { color: i === 0 ? tokens.accent : tokens.heat[2], borderRadius: [0, 3, 3, 0] } })),
      label: { show: true, position: 'right', fontSize: 11, color: tokens.ink, formatter: (p: any) => `{v|${pct(rows[p.dataIndex].parte ?? 0, 1)}}  R$ ${compacto(rows[p.dataIndex].valor)}`, rich: { v: { fontWeight: 800, fontSize: 11, color: tokens.ink } } } }],
  }), [rows, tokens]);
  return <div className="cs-com-nota"><Chart option={option} tokens={tokens} label="As oito maiores contas de receita do Crea-SP de 2013 a 2026, com a parte de cada uma" />
    <p className="cs-nota">As oito contas somam <b>{pct(100 - resto, 1)}</b> da receita. Os nomes são os do plano de contas publicado no portal.</p></div>;
}

/* ---------- Receita e despesa publicadas ---------- */
const exportarContas: Exportavel = { cabecalho: ['Exercício', 'Receita realizada', 'Dotação', 'Despesa empenhada', 'Despesa paga'], linhas: () => contasPublicadas.exercicios.map(row => [row.ano, row.receita ?? '', row.dotacao ?? '', row.empenhada ?? '', row.paga]) };
function Contas({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = contasPublicadas.exercicios;
  const option = useMemo(() => ({
    grid: { top: 26, right: 52, bottom: 2, left: 4, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.ano}</b>${row.ano === contasPublicadas.aberto ? ' (até 08/09)' : ''}<br/>receita: ${brl(row.receita ?? 0)}<br/>despesa paga: ${brl(row.paga)}${row.dotacao ? `<br/>dotação: ${brl(row.dotacao)}` : ''}`; } },
    xAxis: eixoCategoria(tokens, rows.map(row => row.ano === contasPublicadas.aberto ? `${row.ano}*` : row.ano)), yAxis: eixoValor(tokens),
    series: [
      { name: 'Receita realizada', type: 'bar', barMaxWidth: 16, itemStyle: { color: tokens.good }, data: rows.map(row => ({ value: row.receita, itemStyle: { color: tokens.good, opacity: row.ano === contasPublicadas.aberto ? 0.45 : 1, borderRadius: [2, 2, 0, 0] } })),
        label: { show: true, position: 'top', fontSize: 11, color: tokens.ink, formatter: (p: any) => p.value && (rows.length - 2 - p.dataIndex) % 3 === 0 ? compacto(p.value) : '' }, labelLayout: { hideOverlap: true } },
      { name: 'Despesa paga', type: 'bar', barMaxWidth: 16, itemStyle: { color: tokens.bad }, data: rows.map(row => ({ value: row.paga, itemStyle: { color: tokens.bad, opacity: row.ano === contasPublicadas.aberto ? 0.45 : 1, borderRadius: [2, 2, 0, 0] } })) },
      { name: 'Dotação do orçamento', type: 'line', data: rows.map(row => row.dotacao), symbol: 'circle', symbolSize: 4, lineStyle: { color: tokens.muted, type: 'dashed', width: 1.5 }, itemStyle: { color: tokens.muted },
        endLabel: { show: true, fontSize: 11, color: tokens.muted, formatter: (p: any) => `R$ ${compacto(p.value)}` } },
    ],
  }), [rows, tokens]);
  return <div className="cs-com-nota"><Chart option={option} tokens={tokens} label="Receita realizada, despesa paga e dotação do orçamento do Crea-SP em cada exercício" />
    <p className="cs-nota">* {contasPublicadas.aberto} até a coleta de 08/09/2026, exercício ainda aberto. Em {ultimo.ano}, a despesa paga foi <b>{pct(ultimo.paga / (ultimo.dotacao ?? ultimo.paga) * 100)}</b> da dotação.</p></div>;
}

/* ---------- Registros novos por ano ---------- */
const primeiroSp = registrosNovos.serie.findIndex(row => row.sp !== null), ultimoSp = registrosNovos.serie.filter(row => row.sp !== null).at(-1)?.ano ?? '';
const exportarRegistros: Exportavel = { cabecalho: ['Ano', 'Registros novos no país', 'Registros novos no Crea-SP'], linhas: () => registrosNovos.serie.map(row => [row.ano, row.brasil, row.sp ?? '']) };
function Registros({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = registrosNovos.serie;
  const option = useMemo(() => ({
    grid: { top: 26, right: 40, bottom: 2, left: 4, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.ano}</b><br/>país: ${int(row.brasil)}<br/>Crea-SP: ${row.sp === null ? '—' : int(row.sp)}${row.sp !== null ? ` (${pct(row.sp / row.brasil * 100, 1)})` : ''}`; } },
    xAxis: eixoCategoria(tokens, rows.map(row => row.ano)),
    yAxis: [eixoValor(tokens), { type: 'value', show: false, max: 100 }],
    series: [
      { name: 'No país', type: 'bar', barMaxWidth: 16, data: rows.map(row => row.brasil), itemStyle: { color: tokens.heat[1], borderRadius: [2, 2, 0, 0] },
        label: { show: true, position: 'insideTop', fontSize: 11, color: corDoTexto(tokens.heat[1]), formatter: (p: any) => (rows.length - 1 - p.dataIndex) % 3 === 0 ? compacto(p.value) : '' }, labelLayout: { hideOverlap: true } },
      { name: 'No Crea-SP', type: 'bar', barMaxWidth: 16, data: rows.map(row => row.sp), itemStyle: { color: tokens.accent, borderRadius: [2, 2, 0, 0] } },
      { name: 'Parte do Crea-SP', type: 'line', yAxisIndex: 1, data: rows.map(row => row.sp === null ? null : Math.round(row.sp / row.brasil * 1000) / 10), symbol: 'circle', symbolSize: 4, lineStyle: { color: tokens.ink, width: 1.5 }, itemStyle: { color: tokens.ink },
        label: { show: true, position: 'top', fontSize: 11, color: tokens.ink, formatter: (p: any) => p.value === null || !(p.dataIndex === primeiroSp || rows[p.dataIndex].ano === ultimoSp || (rows.length - 1 - p.dataIndex) % 3 === 0) ? '' : `${String(p.value).replace('.', ',')}%` }, labelLayout: { hideOverlap: true } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Registros profissionais novos por ano no país e no Crea-SP, com a parte do Crea-SP" />;
}
