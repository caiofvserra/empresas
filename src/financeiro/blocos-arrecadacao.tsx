import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { brl, money, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import type { Exportavel } from '../cockpit/ui';
import { corDoTexto } from '../cockpit/formatos';
import { municipiosSp } from '../domain/municipios';
import { diasUteis, tiposReceita } from '../domain/financeiro';
import type { TipoReceita } from '../domain/financeiro';
import { compacto, eixoCategoria, eixoValor, g, legenda } from '../gestao/comum';
import type { Medida } from '../gestao/comum';
import { arrecadadoNoMes, comparativo, diasDoMes, metaDoMes, nomesMes, nomesMesLongo, receitaDoMes } from './dados';
import type { QuadroFinanceiro } from './dados';

/** Blocos da página Arrecadação do painel Financeiro (07/11/2026): o mês dia a dia contra a meta, como o painel de arrecadação que o Crea-SP já usa. */
export const coresTipo = (tokens: CockpitCtx['tokens']): Record<TipoReceita, string> => ({ Anuidades: tokens.blue, ART: tokens.brand, 'Dívida ativa': tokens.accent, Multas: tokens.bad, 'Serviços e outras': tokens.heat[1] });
const dia2 = (dia: number) => String(dia).padStart(2, '0');
const variacao = (atual: number, antes: number) => antes ? (atual / antes - 1) * 100 : null;
const seta = (value: number | null) => value === null ? '—' : `${value >= 0 ? '+' : '−'}${Math.abs(value).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;

/** Os dias de um dia útil: abre a arrecadação do dia por tipo. */
export function abrirDia(ctx: CockpitCtx, q: QuadroFinanceiro, mes: string, dia: number) {
  const linha = diasDoMes(q, mes).find(row => row.dia === dia); if (!linha) return;
  ctx.open({ kind: 'linhas', eyebrow: 'Arrecadação do dia', title: `${dia} de ${nomesMesLongo[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}`, what: 'O que entrou no dia, por tipo de receita. O total do mês é o publicado na Transparência; a divisão pelos dias úteis é demonstrativa até a ligação com a baixa dos boletos no CreaNet.',
    listTitle: 'Tipos de receita', summary: [['Arrecadado no dia', money(linha.total)]],
    rows: tiposReceita.map(t => ({ key: t, title: t, subtitle: `${pct(linha.total ? linha.porTipo[t] / linha.total * 100 : 0)} do dia`, value: money(linha.porTipo[t]), note: '', sortValue: linha.porTipo[t] })) });
}

/* ---------- O mês dia a dia: acumulado contra a meta ---------- */
export const exportarDiaADia = (q: QuadroFinanceiro, mes: string, dia: number): Exportavel => ({ cabecalho: ['Dia', 'Arrecadado no dia (R$)', 'Acumulado (R$)', 'Meta acumulada (R$)'], linhas: () => {
  const dias = diasDoMes(q, mes), meta = metaDoMes(q, Number(mes.slice(5, 7)) - 1); let soma = 0;
  return dias.filter(row => row.dia <= dia).map((row, index) => { soma += row.total; return [`${dia2(row.dia)}/${mes.slice(5, 7)}`, Math.round(row.total), Math.round(soma), Math.round(meta / dias.length * (index + 1))]; }); } });
export function DiaADia({ ctx, q, mes, dia }: { ctx: CockpitCtx; q: QuadroFinanceiro; mes: string; dia: number }) {
  const { tokens } = ctx;
  const option = useMemo(() => {
    const dias = diasDoMes(q, mes), meta = metaDoMes(q, Number(mes.slice(5, 7)) - 1), passo = dias.length ? meta / dias.length : 0;
    let soma = 0; const acumulado = dias.map(row => { if (row.dia > dia) return null; soma += row.total; return soma; });
    const passados = acumulado.filter(value => value !== null).length, media = passados ? soma / passados : 0;
    const projecao = dias.map((_, index) => index < passados - 1 ? null : soma + media * (index - passados + 1));
    const ultimo = (serie: (number | null)[]) => { for (let i = serie.length - 1; i >= 0; i--) if (serie[i] !== null) return i; return -1; };
    const rotulo = (serie: (number | null)[], cor: string, nome: string) => serie.map((value, index) => index === ultimo(serie) && value !== null ? { value, label: { show: true, position: 'top', color: cor, fontWeight: 700, fontSize: 11, formatter: () => `${nome} ${brl(value)}` } } : value);
    return {
      grid: { top: 30, right: 96, bottom: 2, left: 4, containLabel: true }, legend: legenda(tokens),
      tooltip: { trigger: 'axis', formatter: (items: any[]) => { const index = items[0].dataIndex, row = dias[index]; return `<b>${row.dia} de ${nomesMesLongo[Number(mes.slice(5, 7)) - 1]}</b><br/>${row.dia <= dia ? `No dia: ${money(row.total)}<br/>Acumulado: <b>${money(acumulado[index]!)}</b><br/>` : ''}Meta até o dia: ${money(passo * (index + 1))}`; } },
      xAxis: eixoCategoria(tokens, dias.map(row => dia2(row.dia))), yAxis: [eixoValor(tokens), { type: 'value', show: false }],
      series: [
        { name: 'No dia', type: 'bar', yAxisIndex: 1, barMaxWidth: 18, data: dias.map(row => row.dia <= dia ? row.total : null), itemStyle: { color: tokens.heat[1], borderRadius: [2, 2, 0, 0] } },
        { name: 'Meta acumulada', type: 'line', data: rotulo(dias.map((_, index) => passo * (index + 1)), tokens.muted, 'meta'), symbol: 'none', lineStyle: { color: tokens.muted, width: 1.6, type: [5, 4] } },
        { name: 'Arrecadado acumulado', type: 'line', data: rotulo(acumulado, tokens.brand, 'arrecadado'), symbol: 'circle', symbolSize: 4, lineStyle: { color: tokens.brand, width: 2.6 }, itemStyle: { color: tokens.brand }, areaStyle: { color: tokens.brand, opacity: 0.08 } },
        ...(passados < dias.length ? [{ name: 'No ritmo atual', type: 'line', data: rotulo(projecao, tokens.accent, 'no ritmo'), symbol: 'none', lineStyle: { color: tokens.accent, width: 1.6, type: [2, 3] } }] : []),
      ],
    };
  }, [q, mes, dia, tokens]);
  return <Chart option={option} tokens={tokens} label="Arrecadação acumulada no mês, dia a dia, contra a meta" onPick={params => { const row = diasDoMes(q, mes)[params.dataIndex as number]; if (row && row.dia <= dia) abrirDia(ctx, q, mes, row.dia); }} />;
}

/* ---------- Meta e realizado em cada mês do ano ---------- */
export const exportarMetaRealizado = (q: QuadroFinanceiro): Exportavel => ({ cabecalho: ['Mês', 'Meta (R$)', 'Realizado (R$)', 'Diferença (R$)', '% da meta'], linhas: () => nomesMes.map((nome, index) => {
  const mes = `${q.ano}-${dia2(index + 1)}`, meta = metaDoMes(q, index), real = mes <= q.mes ? arrecadadoNoMes(q, mes) : null;
  return [nome, Math.round(meta), real === null ? null : Math.round(real), real === null ? null : Math.round(real - meta), real === null || !meta ? null : Math.round(real / meta * 1000) / 10]; }) });
export function MetaRealizado({ ctx, q }: { ctx: CockpitCtx; q: QuadroFinanceiro }) {
  const { tokens } = ctx;
  const option = useMemo(() => {
    const rows = nomesMes.map((nome, index) => { const mes = `${q.ano}-${dia2(index + 1)}`, meta = metaDoMes(q, index); return { nome, mes, meta, real: mes <= q.mes ? arrecadadoNoMes(q, mes) : null, antes: arrecadadoNoMes(q, `${q.ano - 1}-${dia2(index + 1)}`) }; });
    return {
      grid: { top: 30, right: 6, bottom: 2, left: 4, containLabel: true }, legend: legenda(tokens),
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${nomesMesLongo[items[0].dataIndex]} de ${q.ano}</b><br/>Meta: ${money(row.meta)}<br/>${row.real === null ? 'Mês ainda não fechado' : `Realizado: <b>${money(row.real)}</b> (${pct(row.meta ? row.real / row.meta * 100 : 0)} da meta)<br/>Diferença: ${money(row.real - row.meta)}`}<br/>${q.ano - 1}: ${money(row.antes)}`; } },
      xAxis: eixoCategoria(tokens, rows.map(row => row.nome)), yAxis: eixoValor(tokens),
      series: [
        { name: 'Realizado', type: 'bar', barMaxWidth: 30, data: rows.map(row => row.real === null ? null : { value: row.real, itemStyle: { color: row.real >= row.meta ? tokens.good : tokens.brand, borderRadius: [3, 3, 0, 0] } }),
          label: { show: true, position: 'top', fontSize: 11, fontWeight: 700, color: tokens.ink, formatter: (params: any) => { const row = rows[params.dataIndex]; return row.meta && row.real !== null ? pct(row.real / row.meta * 100) : ''; } } },
        // A meta de cada mês é um traço sobre a barra, como numa régua: dá para ver de longe quem passou e quem ficou abaixo.
        { name: 'Meta', type: 'scatter', data: rows.map(row => row.meta), symbol: 'rect', symbolSize: [40, 3], itemStyle: { color: tokens.ink }, z: 4 },
        { name: String(q.ano - 1), type: 'line', data: rows.map(row => row.antes), symbol: 'circle', symbolSize: 3, lineStyle: { color: tokens.muted, width: 1 }, itemStyle: { color: tokens.muted } },
      ],
    };
  }, [q, tokens]);
  return <Chart option={option} tokens={tokens} label="Meta e realizado da arrecadação em cada mês do ano" />;
}

/* ---------- Tipo a tipo: este ano e o anterior ---------- */
/** A meta de um tipo de janeiro até o mês, no recorte. */
const metaAteOMes = (q: QuadroFinanceiro, mes: string, tipo: TipoReceita) => Array.from({ length: Number(mes.slice(5, 7)) }, (_, i) => metaDoMes(q, i, tipo)).reduce((a, b) => a + b, 0);
export const exportarPorTipo = (q: QuadroFinanceiro, mes: string): Exportavel => ({ cabecalho: ['Tipo', `Mês ${q.ano - 1} (R$)`, `Mês ${q.ano} (R$)`, 'Variação do mês (%)', `Acumulado ${q.ano - 1} (R$)`, `Acumulado ${q.ano} (R$)`, 'Variação do acumulado (%)', `Meta até o mês ${q.ano} (R$)`, 'Acumulado na meta (%)'],
  linhas: () => comparativo(q, mes).map(row => { const meta = metaAteOMes(q, mes, row.tipo as TipoReceita);
    return [row.tipo, Math.round(row.mes.antes), Math.round(row.mes.atual), variacao(row.mes.atual, row.mes.antes), Math.round(row.acumulado.antes), Math.round(row.acumulado.atual), variacao(row.acumulado.atual, row.acumulado.antes), Math.round(meta), meta ? Math.round(row.acumulado.atual / meta * 1000) / 10 : null]; }) });
export function PorTipo({ ctx, q, mes }: { ctx: CockpitCtx; q: QuadroFinanceiro; mes: string }) {
  const rows = comparativo(q, mes), cores = coresTipo(ctx.tokens), nome = nomesMes[Number(mes.slice(5, 7)) - 1];
  const total = rows.reduce((t, row) => ({ mes: { atual: t.mes.atual + row.mes.atual, antes: t.mes.antes + row.mes.antes }, acumulado: { atual: t.acumulado.atual + row.acumulado.atual, antes: t.acumulado.antes + row.acumulado.antes } }), { mes: { atual: 0, antes: 0 }, acumulado: { atual: 0, antes: 0 } });
  const metas = new Map(rows.map(row => [row.tipo, metaAteOMes(q, mes, row.tipo as TipoReceita)])), metaTotal = [...metas.values()].reduce((a, b) => a + b, 0);
  const maximo = Math.max(...rows.map(row => Math.max(row.acumulado.atual, row.acumulado.antes, metas.get(row.tipo) ?? 0)), 1);
  const chip = (value: number | null) => <em className={`fin-var ${value === null || Math.abs(value) < 0.5 ? '' : value > 0 ? 'is-up' : 'is-down'}`}>{seta(value)}</em>;
  const linha = (tipo: string, item: typeof total, meta: number, cor?: string, forte?: boolean) => <tr key={tipo} className={forte ? 'is-total' : ''}>
    <th scope="row">{cor && <i style={{ background: cor }} />}{tipo}</th>
    <td>{brl(item.mes.antes)}</td><td><b>{brl(item.mes.atual)}</b></td><td>{chip(variacao(item.mes.atual, item.mes.antes))}</td>
    <td>{brl(item.acumulado.antes)}</td><td><b>{brl(item.acumulado.atual)}</b>{!forte && <span className="fin-barra"><span style={{ width: `${item.acumulado.antes / maximo * 100}%` }} className="is-antes" /><span style={{ width: `${item.acumulado.atual / maximo * 100}%`, background: cor }} />{meta > 0 && <b style={{ left: `${meta / maximo * 100}%` }} />}</span>}</td><td>{chip(variacao(item.acumulado.atual, item.acumulado.antes))}</td><td>{meta ? pct(item.acumulado.atual / meta * 100) : '—'}</td></tr>;
  return <table className="fin-tabela">
    <thead><tr><th rowSpan={2}>Tipo</th><th colSpan={3}>Em {nome}</th><th colSpan={4}>De janeiro a {nome}</th></tr>
      <tr><th>{q.ano - 1}</th><th>{q.ano}</th><th>variação</th><th>{q.ano - 1}</th><th>{q.ano}</th><th>variação</th><th>da meta</th></tr></thead>
    <tbody>{rows.map(row => linha(row.tipo, row, metas.get(row.tipo) ?? 0, cores[row.tipo]))}{linha('Total', total, metaTotal, undefined, true)}</tbody>
  </table>;
}

/* ---------- Calendário do mês ---------- */
export function Calendario({ ctx, q, mes, dia }: { ctx: CockpitCtx; q: QuadroFinanceiro; mes: string; dia: number }) {
  const { tokens, dark } = ctx;
  const option = useMemo(() => {
    const dias = diasDoMes(q, mes), uteis = new Set(diasUteis(mes)), valores = dias.filter(row => row.dia <= dia).map(row => row.total);
    const min = Math.min(...valores, 0), max = Math.max(...valores, 1), ultimoDia = new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)).getUTCDate();
    const cores = dark ? ['#1E3A5F', '#2B6CB0', '#5E9BDD', '#A9C9EE'] : ['#DCE8F7', '#93BCEA', '#2B6CB0', '#082D74'];
    const porDia = new Map(dias.map(row => [row.dia, row.total]));
    const data = Array.from({ length: ultimoDia }, (_, i) => { const d = i + 1, valor = d <= dia ? porDia.get(d) ?? null : null; return [`${mes}-${dia2(d)}`, valor === null ? (uteis.has(d) && d > dia ? -1 : -2) : valor]; });
    const corDe = (value: number) => { if (value < 0) return value === -1 ? tokens.soft : 'transparent'; const t = (value - min) / Math.max(1, max - min); return cores[Math.min(cores.length - 1, Math.floor(t * cores.length))]; };
    return {
      tooltip: { formatter: (params: any) => { const [data_, value] = params.data as [string, number], d = Number(data_.slice(8, 10)); return value >= 0 ? `<b>${d} de ${nomesMesLongo[Number(mes.slice(5, 7)) - 1]}</b><br/>${money(value)}` : `<b>${d}</b><br/>${value === -1 ? 'Depois do dia escolhido' : 'Sem expediente'}`; } },
      visualMap: { show: false, type: 'piecewise', dimension: 1, pieces: [{ min: -1e15, max: 1e15 }], inRange: { opacity: 1 } }, // o ECharts exige um visualMap no mapa de calor; a cor vem de cada célula
      calendar: { top: 22, left: 6, right: 6, bottom: 4, orient: 'vertical', range: mes, cellSize: ['auto', 'auto'], splitLine: { show: false }, itemStyle: { borderColor: tokens.surface, borderWidth: 3, color: 'transparent' },
        dayLabel: { firstDay: 0, position: 'start', margin: 6, nameMap: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'], color: tokens.muted, fontSize: 11 }, monthLabel: { show: false }, yearLabel: { show: false } },
      series: [{ type: 'heatmap', coordinateSystem: 'calendar', data: data.map(([d, value]) => ({ value: [d, value], itemStyle: { color: corDe(value as number), borderRadius: 4 } })),
        label: { show: true, fontSize: 11, formatter: (params: any) => { const [d, value] = params.data.value as [string, number]; const n = Number(d.slice(8, 10)); return value >= 0 ? `{d|${n}}\n{v|${compacto(value / 1e6)}}` : `{x|${n}}`; },
          rich: { d: { fontSize: 11, color: tokens.muted }, v: { fontSize: 11, fontWeight: 700, color: tokens.ink }, x: { fontSize: 11, color: tokens.muted } } } }],
      _cor: corDe,
    };
  }, [q, mes, dia, tokens, dark]);
  // O texto de cada célula segue o fundo dela (regra dos painéis: `corDoTexto`, nunca branco fixo).
  const ajustado = useMemo(() => { const { _cor, ...resto } = option as any; const serie = resto.series[0];
    return { ...resto, series: [{ ...serie, data: serie.data.map((item: any) => { const value = item.value[1] as number, fundo = _cor(value), texto = value >= 0 ? corDoTexto(fundo) : tokens.muted;
      return { ...item, label: { rich: { d: { fontSize: 11, color: texto, opacity: 0.8 }, v: { fontSize: 11, fontWeight: 700, color: texto }, x: { fontSize: 11, color: tokens.muted } } } }; }) }] }; }, [option, tokens]);
  return <div className="cs-com-nota"><Chart option={ajustado} tokens={tokens} label="Calendário do mês com o valor arrecadado em cada dia útil, em R$ milhões" onPick={params => { const [d, value] = params.data.value as [string, number]; if (value >= 0) abrirDia(ctx, q, mes, Number(d.slice(8, 10))); }} />
    <p className="cs-nota">Em R$ milhões por dia útil. Clique num dia para ver os tipos.</p></div>;
}

/* ---------- Mapa da arrecadação por município ---------- */
export type MetricaArrecadacao = 'ano' | 'art' | 'porAtivo';
export const metricasArrecadacao: Record<MetricaArrecadacao, string> = { ano: 'Arrecadado no ano', art: 'ART no ano', porAtivo: 'Por profissional ativo' };
export function medidaArrecadacao(ctx: CockpitCtx, q: QuadroFinanceiro, metrica: MetricaArrecadacao): Medida {
  const meses = Array.from({ length: Number(q.mes.slice(5, 7)) }, (_, i) => `${q.ano}-${dia2(i + 1)}`), tipos = metrica === 'art' ? ['ART' as TipoReceita] : tiposReceita;
  const totalTipo = Object.fromEntries(tipos.map(t => [t, meses.reduce((s, m) => s + receitaDoMes(m, t), 0)])) as Record<string, number>;
  const somaPeso = Object.fromEntries(tipos.map(t => [t, [...q.pesos[t].values()].reduce((a, b) => a + b, 0)])) as Record<string, number>;
  const ativos = new Map([...g(ctx).adimplencia].map(([id, item]) => [id, item.ativos.length]));
  const cidade = new Map<string, number | null>(), gre = new Map<string, number | null>(), somaGre = new Map<string, { valor: number; ativos: number }>();
  for (const c of municipiosSp(ctx.dataset)) {
    const valor = tipos.reduce((s, t) => s + (somaPeso[t] ? totalTipo[t] * (q.pesos[t].get(c.id) ?? 0) / somaPeso[t] : 0), 0), n = ativos.get(c.id) ?? 0;
    cidade.set(c.id, metrica === 'porAtivo' ? (n >= 5 ? valor / n : null) : valor);
    const item = somaGre.get(c.greId) ?? { valor: 0, ativos: 0 }; item.valor += valor; item.ativos += n; somaGre.set(c.greId, item);
  }
  for (const [id, item] of somaGre) gre.set(id, metrica === 'porAtivo' ? (item.ativos ? item.valor / item.ativos : null) : item.valor);
  return { label: metricasArrecadacao[metrica], curto: metrica === 'porAtivo' ? 'POR ATIVO' : 'NO ANO', fmt: brl, cidade, gre };
}
