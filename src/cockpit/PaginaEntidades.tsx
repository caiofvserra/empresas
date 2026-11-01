import { useMemo, useState } from 'react';
import { ArrowDownUp } from 'lucide-react';
import { Chart } from '../painel/chart';
import { brl, int, money, pct } from '../painel/ui';
import { canais, grupoOrganizacao } from '../domain/entidades';
import type { LinhaOrganizacao } from '../domain/entidades';
import type { CockpitCtx } from './contexto';
import { Bloco, Indicador } from './ui';

/**
 * Aba 8 · Entidades de classe e instituições de ensino ligadas ao Conselho: uma tabela por organização (natureza, parte EaD,
 * cadeiras no plenário, convênios, contratos, patrocínios e repasses) e dois gráficos neutros: cadeiras por natureza e repasses
 * por natureza e canal. Tudo lido na data de referência; a leitura é descritiva e não calcula relação entre cadeiras e repasses.
 */
const change = (now: number, before: number) => before > 0 ? (now - before) / before * 100 : null;
const grupos = ['Entidade de classe', 'IES pública', 'IES privada'];

export default function PaginaEntidades({ ctx }: { ctx: CockpitCtx }) {
  const e = ctx.entidades, vigentes = e.linhas.reduce((sum, row) => sum + row.vigentes, 0);
  const porGrupo = (grupo: string) => e.linhas.filter(row => grupoOrganizacao(row) === grupo).length;
  return <div className="ck-grid ck-grid-entidades">
    <section className="ck-cards is-four" style={{ gridArea: 'kpi' }} aria-label="Indicadores de entidades e IES">
      <Indicador destaque ficha="k-organizacoes" ctx={ctx} label="Organizações registradas" value={int(e.linhas.length)} sub={grupos.map(grupo => `${int(porGrupo(grupo))} ${grupo.toLowerCase().replace('ies', 'IES')}`).join(' · ')} />
      <Indicador ficha="k-cadeiras" ctx={ctx} label="Cadeiras no plenário" value={int(e.cadeiras)} sub={e.cadeirasPorNatureza.map(row => `${int(row.cadeiras)} ${row.grupo.toLowerCase().replace('ies', 'IES')}`).join(' · ')} />
      <Indicador ficha="k-repasses" ctx={ctx} label="Repasses em 12 meses" value={brl(e.total)} variacao={{ value: change(e.total, e.totalAntes), label: 'vs. 12 meses anteriores' }} sub={canais.map(canal => `${brl(e.repassePorAno.filter(row => row.canal === canal && row.ano === e.anos.at(-1)).reduce((sum, row) => sum + row.valor, 0))} ${canal.toLowerCase()}s no ano corrente`).join(' · ')} />
      <Indicador ficha="k-vigentes" ctx={ctx} label="Instrumentos vigentes" value={int(vigentes)} sub={`convênios, contratos e patrocínios com vigência na data de referência · ${int(e.linhas.filter(row => row.vigentes).length)} organizações`} />
    </section>
    <Bloco ctx={ctx} id="ec" area="ec" title="Quem ocupa as cadeiras do plenário" question="Quantos conselheiros foram indicados por entidades de classe, por instituições de ensino públicas e por instituições privadas, e quantas organizações há em cada grupo."><Cadeiras ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="er" area="er" title="Repasses por ano" question="Pagamentos feitos a entidades e instituições de ensino por convênios, contratos e patrocínios, pela data do pagamento. Você pode abrir por tipo de organização ou por tipo de instrumento. O ano corrente ainda está incompleto."><Repasses ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ee" area="ee" title="Instituições de ensino públicas e privadas" question="Quantas instituições há em cada grupo, que parte dos formados estudou a distância, quantas cadeiras ocupam no plenário e quanto receberam em 12 meses."><Ies ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="et" area="et" title="Cada organização" question="Tipo, parte do ensino a distância, cadeiras, convênios, contratos, patrocínios, repasses em 12 meses e instrumentos vigentes. Clique no nome de uma coluna para ordenar. A tabela apenas põe os fatos lado a lado, sem tirar conclusões entre eles."><Tabela ctx={ctx} /></Bloco>
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
  return <div className="stack">
    <p className="kpi-line"><b>{int(ctx.entidades.cadeiras)}</b> cadeiras ocupadas por indicação de organizações registradas · composição demonstrativa fixa</p>
    <Chart option={option} tokens={tokens} label="Cadeiras no plenário por natureza da organização" />
  </div>;
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

function Ies({ ctx }: { ctx: CockpitCtx }) {
  const e = ctx.entidades, rows = (['Pública', 'Privada'] as const).map(natureza => { const mine = e.linhas.filter(row => row.grupo === 'IES' && row.natureza === natureza);
    return { natureza, n: mine.length, ead: mine.length ? mine.reduce((sum, row) => sum + (row.ead ?? 0), 0) / mine.length : null, cadeiras: mine.reduce((sum, row) => sum + row.cadeiras, 0), repasses: mine.reduce((sum, row) => sum + row.repassadoAno, 0), vigentes: mine.reduce((sum, row) => sum + row.vigentes, 0) }; });
  return <div className="tres is-two">
    {rows.map(row => <div key={row.natureza} className="tres-item is-tall"><span>IES {row.natureza.toLowerCase()}s</span><strong>{int(row.n)}</strong><small>EaD médio {row.ead === null ? '—' : pct(row.ead)} · {int(row.cadeiras)} cadeiras · {brl(row.repasses)} em 12 meses · {int(row.vigentes)} instrumentos vigentes</small></div>)}
    <p className="duo-note">Parte EaD pela oferta de concluintes do Censo. Leitura descritiva, sem juízo sobre representatividade.</p>
  </div>;
}

type Coluna = { key: string; label: string; get: (row: LinhaOrganizacao) => number | null; cell: (row: LinhaOrganizacao) => string };
function Tabela({ ctx }: { ctx: CockpitCtx }) {
  const rows = ctx.entidades.linhas, [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: 'repassadoAno', dir: -1 });
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
  const coluna = colunas.find(item => item.key === sort.key)!, ordenadas = [...rows].sort((a, b) => ((coluna.get(a) ?? -Infinity) - (coluna.get(b) ?? -Infinity)) * sort.dir);
  return <div className="table-wrap"><table className="metodo is-dense">
    <thead><tr><th>Organização</th><th>Natureza</th>{colunas.map(item => <th key={item.key} aria-sort={sort.key === item.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}><button className="th-sort" onClick={() => setSort({ key: item.key, dir: sort.key === item.key ? (sort.dir === 1 ? -1 : 1) : -1 })}>{item.label}{sort.key === item.key && <ArrowDownUp size={10} />}</button></th>)}</tr></thead>
    <tbody>{ordenadas.map(row => <tr key={row.id}><td><b>{row.sigla}</b><small>{row.nome} · {row.tipo}</small></td><td>{grupoOrganizacao(row)}</td>{colunas.map(item => <td key={item.key} className="num">{item.cell(row)}</td>)}</tr>)}</tbody>
  </table></div>;
}
