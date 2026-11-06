import { useMemo, useState } from 'react';
import { ArrowDownUp } from 'lucide-react';
import { Chart } from '../painel/chart';
import { brl, int, money, pct } from '../painel/ui';
import { canais, grupoOrganizacao } from '../domain/entidades';
import type { LinhaOrganizacao } from '../domain/entidades';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador } from '../cockpit/ui';
import type { Exportavel } from '../cockpit/ui';

/**
 * Painel de Gestão do Conselho, página 4 (veio do painel geral em 06/11/2026): entidades de classe e instituições de ensino ligadas
 * ao Conselho. Uma tabela por organização (natureza, parte EaD, cadeiras, convênios, contratos, patrocínios e repasses), cadeiras por
 * natureza, repasses por natureza e canal e, cruzando com o Censo da Educação Superior e o cadastro de profissionais, cada escola pelo
 * número de formados e pela parte que se registrou. Tudo lido na data de referência; a leitura é descritiva e não calcula relação
 * entre cadeiras e repasses.
 */
const change = (now: number, before: number) => before > 0 ? (now - before) / before * 100 : null;
const grupos = ['Entidade de classe', 'IES pública', 'IES privada'];

export default function PaginaEntidades({ ctx }: { ctx: CockpitCtx }) {
  const e = ctx.entidades, vigentes = e.linhas.reduce((sum, row) => sum + row.vigentes, 0);
  const porGrupo = (grupo: string) => e.linhas.filter(row => grupoOrganizacao(row) === grupo).length;
  return <div className="ck-grid ck-grid-cs-entidades">
    <section className="ck-cards is-four" style={{ gridArea: 'kpi' }} aria-label="Indicadores de entidades e IES">
      <Indicador destaque ficha="k-organizacoes" ctx={ctx} label="Organizações registradas" value={int(e.linhas.length)} sub={grupos.map(grupo => `${int(porGrupo(grupo))} ${grupo.toLowerCase().replace('ies', 'IES')}`).join(' · ')} />
      <Indicador ficha="k-cadeiras" ctx={ctx} label="Cadeiras no plenário" value={int(e.cadeiras)} sub={e.cadeirasPorNatureza.map(row => `${int(row.cadeiras)} ${row.grupo.toLowerCase().replace('ies', 'IES')}`).join(' · ')} />
      <Indicador ficha="k-repasses" ctx={ctx} label="Repasses em 12 meses" value={brl(e.total)} variacao={{ value: change(e.total, e.totalAntes), label: 'em relação aos 12 meses anteriores' }} sub={canais.map(canal => `${brl(e.repassePorAno.filter(row => row.canal === canal && row.ano === e.anos.at(-1)).reduce((sum, row) => sum + row.valor, 0))} ${canal.toLowerCase()}s no ano corrente`).join(' · ')} />
      <Indicador ficha="k-vigentes" ctx={ctx} label="Instrumentos vigentes" value={int(vigentes)} sub={`convênios, contratos e patrocínios em vigor, com ${int(e.linhas.filter(row => row.vigentes).length)} organizações`} />
    </section>
    <Bloco ctx={ctx} id="ec" area="ec" title="Cadeiras do plenário por natureza" exportar={{ cabecalho: ['Natureza', 'Cadeiras', 'Organizações', 'Repassado no total (R$)'], linhas: () => ctx.entidades.cadeirasPorNatureza.map(row => [row.grupo, row.cadeiras, row.organizacoes, Math.round(row.repassado)]) }}><Cadeiras ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="er" area="er" title="Repasses por ano" exportar={{ cabecalho: ['Ano', 'Natureza', 'Canal', 'Valor (R$)'], linhas: () => ctx.entidades.repassePorAno.map(row => [row.ano, row.grupo, row.canal, Math.round(row.valor)]) }}><Repasses ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ie" area="ie" title="Formados e registro em cada escola" exportar={exportarEscolas(ctx)}><Escolas ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="et" area="et" title="Cada organização" exportar={exportarTabela(ctx)}><Tabela ctx={ctx} /></Bloco>
  </div>;
}

const corGrupo = (tokens: CockpitCtx['tokens']): Record<string, string> => ({ 'Entidade de classe': tokens.brand, 'IES pública': tokens.blue, 'IES privada': tokens.heat[1] });

function Cadeiras({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = ctx.entidades.cadeirasPorNatureza, cores = corGrupo(tokens);
  const option = useMemo(() => ({
    grid: { top: 8, right: 90, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.grupo}</b><br/>${int(row.cadeiras)} cadeiras · ${int(row.organizacoes)} organizações<br/>${brl(row.repassado)} repassados no total`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.grupo), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [{ type: 'bar', barWidth: 18, data: rows.map(row => ({ value: row.cadeiras, itemStyle: { color: cores[row.grupo], borderRadius: [0, 4, 4, 0] } })), showBackground: true, backgroundStyle: { color: tokens.soft, borderRadius: 4 },
      label: { show: true, position: 'right', color: tokens.ink, fontSize: 10.5, formatter: (params: any) => `${int(params.value)} · ${int(rows[params.dataIndex].organizacoes)} org.` } }],
  }), [rows, tokens, cores]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Cadeiras no plenário por natureza da organização" />;
}

function Repasses({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, e = ctx.entidades, [abertura, setAbertura] = useState<'grupo' | 'canal'>('grupo'), cores = corGrupo(tokens);
  const corCanal: Record<string, string> = { Convênio: tokens.blue, Contrato: tokens.accent, Patrocínio: tokens.heat[2] };
  const series = abertura === 'grupo' ? grupos : [...canais];
  const valor = (ano: string, item: string) => e.repassePorAno.filter(row => row.ano === ano && (abertura === 'grupo' ? row.grupo === item : row.canal === item)).reduce((sum, row) => sum + row.valor, 0);
  const option = useMemo(() => ({
    grid: { top: 30, right: 8, bottom: 2, left: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>${items[0].name}</b>${items[0].name === e.anos.at(-1) ? ' · parcial até a data de referência' : ''}<br/>${items.map(item => `${item.marker}${item.seriesName}: ${money(item.value)}`).join('<br/>')}<br/>Total: <b>${money(items.reduce((sum, item) => sum + item.value, 0))}</b>` },
    xAxis: { type: 'category', data: e.anos, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: (value: number) => value.toLocaleString('pt-BR', { notation: 'compact' }) } },
    series: series.map((item, index) => ({ name: item, type: 'bar', stack: 'r', barWidth: '54%', data: e.anos.map(ano => valor(ano, item)), itemStyle: { color: abertura === 'grupo' ? cores[item] : corCanal[item], borderRadius: index === series.length - 1 ? [3, 3, 0, 0] : 0 } })),
  }), [e, abertura, tokens, series]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="stack">
    <div className="seg" role="radiogroup" aria-label="Abertura dos repasses">{([['grupo', 'Por natureza'], ['canal', 'Por canal']] as const).map(([id, label]) => <button key={id} role="radio" aria-checked={abertura === id} className={abertura === id ? 'on' : ''} onClick={() => setAbertura(id)}>{label}</button>)}</div>
    <Chart option={option} tokens={tokens} label={`Repasses por ano e ${abertura === 'grupo' ? 'natureza da organização' : 'canal'}`} />
  </div>;
}

type Coluna = { key: string; label: string; get: (row: LinhaOrganizacao) => number | null; cell: (row: LinhaOrganizacao) => string };
const exportarTabela = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Sigla', 'Organização', 'Natureza', ...colunas.map(item => item.label)], linhas: () => ctx.entidades.linhas.map(row => [row.sigla, row.nome, grupoOrganizacao(row), ...colunas.map(item => item.get(row))]) });
const colunas: Coluna[] = [
  { key: 'ead', label: 'EaD', get: row => row.ead, cell: row => row.ead === null ? '—' : pct(row.ead) },
  { key: 'cadeiras', label: 'Cadeiras', get: row => row.cadeiras, cell: row => int(row.cadeiras) },
  { key: 'convenios', label: 'Convênios', get: row => row.convenios, cell: row => int(row.convenios) },
  { key: 'contratos', label: 'Contratos', get: row => row.contratos, cell: row => int(row.contratos) },
  { key: 'patrocinios', label: 'Patrocínios', get: row => row.patrocinios, cell: row => int(row.patrocinios) },
  { key: 'repassadoAno', label: 'Repasses 12 m', get: row => row.repassadoAno, cell: row => brl(row.repassadoAno) },
  { key: 'repassado', label: 'Repasses total', get: row => row.repassado, cell: row => brl(row.repassado) },
  { key: 'vigentes', label: 'Vigentes', get: row => row.vigentes, cell: row => int(row.vigentes) },
];
function Tabela({ ctx }: { ctx: CockpitCtx }) {
  const rows = ctx.entidades.linhas, [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: 'repassadoAno', dir: -1 });
  const coluna = colunas.find(item => item.key === sort.key)!, ordenadas = [...rows].sort((a, b) => ((coluna.get(a) ?? -Infinity) - (coluna.get(b) ?? -Infinity)) * sort.dir);
  return <div className="table-wrap"><table className="metodo is-dense">
    <thead><tr><th>Organização</th><th>Natureza</th>{colunas.map(item => <th key={item.key} aria-sort={sort.key === item.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}><button className="th-sort" onClick={() => setSort({ key: item.key, dir: sort.key === item.key ? (sort.dir === 1 ? -1 : 1) : -1 })}>{item.label}{sort.key === item.key && <ArrowDownUp size={10} />}</button></th>)}</tr></thead>
    <tbody>{ordenadas.map(row => <tr key={row.id}><td><b>{row.sigla}</b><small>{row.nome} · {row.tipo}</small></td><td>{grupoOrganizacao(row)}</td>{colunas.map(item => <td key={item.key} className="num">{item.cell(row)}</td>)}</tr>)}</tbody>
  </table></div>;
}

/* ---------- Cada escola: formados, parte registrada em 24 meses, ensino a distância e cadeiras (Censo da Educação Superior × cadastro) ---------- */
const escolas = (ctx: CockpitCtx) => ctx.formacao.porIes.filter(row => row.concluintes > 0);
const exportarEscolas = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Instituição', 'Natureza', 'Formados nos anos acompanhados', 'Registrados em até 24 meses', 'Registrados (%)', 'Ensino a distância (%)', 'Cadeiras no plenário'], linhas: () => escolas(ctx).map(row => [row.ies.sigla, row.ies.natureza, row.concluintes, row.registrados, row.taxa === null ? null : Math.round(row.taxa * 10) / 10, row.ead === null ? null : Math.round(row.ead), row.cadeiras]) });
function Escolas({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = escolas(ctx), media = rows.reduce((n, row) => n + row.registrados, 0) / Math.max(1, rows.reduce((n, row) => n + row.concluintes, 0)) * 100;
  // Rótulo só nas escolas que contam a história: as maiores, a de maior e a de menor registro e as com mais cadeiras; as outras no tooltip.
  const comTaxa = rows.filter(row => row.taxa !== null), porTaxa = [...comTaxa].sort((a, b) => b.taxa! - a.taxa!);
  const destaque = new Set([...[...comTaxa].sort((a, b) => b.concluintes - a.concluintes).slice(0, 4), porTaxa[0], porTaxa.at(-1), ...[...comTaxa].sort((a, b) => b.cadeiras - a.cadeiras).slice(0, 2)].filter(Boolean).map(row => row!.ies.id));
  const taxas = comTaxa.map(row => row.taxa!), topo = Math.min(100, Math.ceil((Math.max(media, ...taxas) + 3) / 5) * 5), piso = Math.max(0, Math.floor((Math.min(media, ...taxas) - 3) / 5) * 5);
  const option = useMemo(() => ({
    grid: { top: 26, right: 18, bottom: 22, left: 6, containLabel: true }, legend: { top: 0, left: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'item', formatter: (item: any) => { const row = rows.find(r => r.ies.id === item.data.id)!; return `<b>${row.ies.sigla}</b> · ${row.ies.nome}<br/>${int(row.concluintes)} formados · ${row.taxa === null ? '—' : pct(row.taxa)} registrados em até 24 meses<br/>Ensino a distância: ${row.ead === null ? '—' : pct(row.ead)} · ${int(row.cadeiras)} cadeiras no plenário`; } },
    xAxis: { type: 'log', min: (v: { min: number }) => Math.max(1, Math.floor(v.min * 0.8)), max: (v: { max: number }) => Math.ceil(v.max * 1.25), name: 'formados (escala log)', nameLocation: 'middle', nameGap: 20, nameTextStyle: { color: tokens.muted, fontSize: 10 }, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 9.5 } },
    yAxis: { type: 'value', min: piso, max: topo, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 9.5, formatter: '{value}%' } },
    series: (['Pública', 'Privada'] as const).map(natureza => ({ name: `IES ${natureza.toLowerCase()}`, type: 'scatter',
      data: rows.filter(row => row.ies.natureza === natureza && row.taxa !== null).map(row => ({ id: row.ies.id, value: [row.concluintes, row.taxa], symbolSize: 8 + Math.min(18, row.cadeiras * 4), label: { show: destaque.has(row.ies.id), formatter: row.ies.sigla } })),
      itemStyle: { color: natureza === 'Pública' ? tokens.blue : tokens.accent, opacity: 0.85, borderColor: tokens.surface, borderWidth: 1 }, label: { position: 'right', color: tokens.ink, fontSize: 9.5 }, labelLayout: { hideOverlap: true },
      ...(natureza === 'Pública' ? { markLine: { silent: true, symbol: 'none', lineStyle: { color: tokens.muted, type: 'dashed' }, label: { formatter: `média ${pct(media)}`, color: tokens.muted, fontSize: 9.5, position: 'insideEndTop' }, data: [[{ coord: [Math.max(1, Math.floor(Math.min(...rows.map(row => row.concluintes)) * 0.8)), media] }, { coord: [Math.ceil(Math.max(...rows.map(row => row.concluintes)) * 1.25), media] }]] } } : {}) })),
  }), [rows, tokens, media, destaque, piso, topo]);
  return <Chart option={option} tokens={tokens} label="Instituições de ensino por formados e parte registrada em 24 meses" />;
}
