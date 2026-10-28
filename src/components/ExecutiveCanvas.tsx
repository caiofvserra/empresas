import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { PageId } from '../domain/types';
import type { Group, Metrics, Scope, SeriesPoint } from '../domain/engine';
import { group } from '../domain/engine';
import { buildCrossBaseRows } from '../domain/cross-base';
import type { CrossBaseRow } from '../domain/cross-base';
export { buildCrossBaseRows } from '../domain/cross-base';
import Chart from './Chart';
import MunicipalMap from './MunicipalMap';

export interface ExecutiveCanvasProps {
  scope: Scope;
  metrics: Metrics;
  groupsCity?: Group[];
  groupsGre?: Group[];
  series: SeriesPoint[];
  evolutionOption: Record<string, unknown>;
  periodControls?: ReactNode;
  comparison: boolean;
  financialAllowed: boolean;
  onCity: (id: string) => void;
  onGre: (id: string) => void;
  onSubset: (ids: string[], label: string, reason: string) => void;
  onNavigate: (id: PageId) => void;
  onInfo: (id: string) => void;
  onBucket?: (label: string) => void;
}

export type CrossBaseAnalysisProps = Pick<ExecutiveCanvasProps, 'scope' | 'metrics' | 'onCity' | 'onGre' | 'onSubset' | 'onNavigate' | 'onInfo'>;

const n = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const pct = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const signed = (value: number) => `${value > 0 ? '+' : ''}${pct(value)}`;
const compact = (value: number) => new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
const money = (value: number) => `R$ ${compact(value)}`;
const month = (value: string) => value ? new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-01T12:00:00Z`)) : '';
const distinct = (ids: string[]) => [...new Set(ids)];

function Panel({ title, subtitle, action, children, className = '' }: { title: string; subtitle: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`p-panel bi-overview-panel ${className}`}>
    <header className="p-panel-header"><div><h2 className="p-panel-title bi-panel-title">{title}</h2><p className="p-panel-subtitle bi-panel-subtitle">{subtitle}</p></div>{action}</header>
    <div className="p-panel-body">{children}</div>
  </section>;
}

function DetailAction({ label, onClick }: { label: string; onClick: () => void }) {
  return <button className="bi-chart-action p-text-button" onClick={onClick}>{label}<ArrowUpRight size={13} /></button>;
}

/** Growth rates use the same first and last month-end snapshots, at GRE level. */
function growthScatter(rows: CrossBaseRow[]): Record<string, unknown> {
  const values = rows.filter(row => row.employmentChange !== null && row.registrationChange !== null);
  return {
    grid: { top: 30, bottom: 52, left: 12, right: 26, containLabel: true },
    tooltip: { formatter: (params: { data: { name: string; value: number[]; employment: number; firstMonth: string; lastMonth: string } }) => `${params.data.name}<br/>${month(params.data.firstMonth)} → ${month(params.data.lastMonth)}<br/>Emprego: ${signed(params.data.value[0])}<br/>Registros ativos: ${signed(params.data.value[1])}<br/>Estoque de empregos: ${n(params.data.employment)}` },
    xAxis: { type: 'value', name: 'Variação do emprego (%)', nameLocation: 'middle', nameGap: 34, axisLabel: { fontSize: 12, formatter: '{value}%' }, splitLine: { lineStyle: { color: '#E8EDF5' } } },
    yAxis: { type: 'value', name: 'Registros ativos (%)', nameTextStyle: { fontSize: 12 }, axisLabel: { fontSize: 12, formatter: '{value}%' }, splitLine: { lineStyle: { color: '#E8EDF5' } } },
    series: [{ name: 'GRE', type: 'scatter', data: values.map(row => ({ name: row.label, id: row.id, employment: row.employment, firstMonth: row.firstMonth, lastMonth: row.lastMonth, value: [row.employmentChange!, row.registrationChange!, row.employment] })), symbolSize: (value: number[]) => Math.max(12, Math.min(42, Math.sqrt(value[2]) / 5)), itemStyle: { color: '#3662E2', opacity: .75 }, emphasis: { itemStyle: { color: '#15265C' }, label: { show: true, position: 'top', formatter: '{b}', color: '#0E1732', fontSize: 12 } }, markLine: { symbol: 'none', silent: true, label: { show: false }, lineStyle: { color: '#AFBED7', type: 'dashed' }, data: [{ xAxis: 0 }, { yAxis: 0 }] } }],
  };
}

function comparisonLabel(rows: CrossBaseRow[]) {
  const first = rows.find(row => row.firstMonth && row.lastMonth);
  return first ? `${month(first.firstMonth)} → ${month(first.lastMonth)}` : 'Sem histórico agregado neste recorte';
}

function GrowthNote({ rows }: { rows: CrossBaseRow[] }) {
  const largest = [...rows].filter(row => row.employmentChange !== null && row.registrationChange !== null).sort((a, b) => b.employment - a.employment || a.id.localeCompare(b.id))[0];
  return <p className="bi-micro-note bi-growth-note">{largest
    ? `${largest.label}, maior estoque de emprego do recorte: emprego ${signed(largest.employmentChange!)} e registros ativos ${signed(largest.registrationChange!)} nos mesmos fins de mês.`
    : 'A comparação exige estoques de emprego e de registros nos dois fins de mês.'}</p>;
}

export default function ExecutiveCanvas(props: ExecutiveCanvasProps) {
  const { scope, evolutionOption, periodControls, onCity, onGre, onSubset, onNavigate } = props;
  const cities = useMemo(() => props.groupsCity ?? group(scope, 'city'), [scope, props.groupsCity]);
  const regional = useMemo(() => buildCrossBaseRows(scope), [scope]);
  const scatter = useMemo(() => growthScatter(regional), [regional]);
  const hasGrowth = regional.some(row => row.employmentChange !== null && row.registrationChange !== null);
  const choosePeriod = (label: string) => {
    if (props.onBucket) { props.onBucket(label); return; }
    const index = props.series.findIndex(row => row.label === label);
    const first = props.series[index];
    if (!first) return;
    const next = props.series[index + 1]?.date ?? `${scope.anchor.slice(0, 7)}-32`;
    const registrationIds = new Set(scope.registrations.map(row => row.id));
    const movements = scope.dataset.movements.filter(row => registrationIds.has(row.registrationId) && row.date >= first.date && row.date < next && row.date <= scope.anchor);
    onSubset(distinct(movements.map(row => row.companyId)), `Movimentação cadastral · ${label}`, 'Empresas com movimentos cadastrais no intervalo selecionado. O gráfico distingue eventos e estoque de registros ativos.');
  };

  return <div className="bi-overview bi-executive-canvas">
    <Panel title="Evolução da base empresarial" subtitle="Movimentos do período e estoque de registros ativos" action={periodControls} className="bi-executive-wide">
      <Chart option={evolutionOption} height={240} ariaLabel="Evolução integrada: novos registros, baixas, saldo e estoque ativo" onPick={params => choosePeriod(params.name)} />
    </Panel>
    <Panel title="Empresas no território paulista" subtitle="Empresas distintas por município · selecione para filtrar" action={<DetailAction label="Mercado" onClick={() => onNavigate('market')} />} className="bi-executive-territory bi-executive-map">
      <MunicipalMap groups={cities} metric="companies" onCity={onCity} />
      <p className="bi-micro-note">Receita e cadastro CREA simulados. Empresas com filiais podem participar de vários municípios.</p>
    </Panel>
    <Panel title="Emprego × evolução cadastral" subtitle={`Cada ponto é uma GRE · ${comparisonLabel(regional)}`} action={<DetailAction label="Emprego" onClick={() => onNavigate('employment')} />} className="bi-executive-growth">
      {hasGrowth ? <Chart option={scatter} height={250} ariaLabel="Variação regional do emprego agregado e do estoque de registros ativos. Tamanho do ponto proporcional ao emprego." onPick={params => { if (params.data?.id) onGre(params.data.id); }} />
        : <div className="p-empty"><h3>Sem comparação de estoques neste recorte</h3><p>Selecione outro território ou período com dados nas duas fontes.</p></div>}
      <GrowthNote rows={regional} />
    </Panel>
  </div>;
}

function contractTreemap(rows: CrossBaseRow[]): Record<string, unknown> {
  return {
    tooltip: { formatter: (params: { data: { name: string; value: number; count: number } }) => `${params.data.name}<br/>Valor contratado: ${params.data.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}<br/>Contratações: ${n(params.data.count)}` },
    series: [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, left: 0, right: 0, top: 0, bottom: 0, label: { show: true, color: '#FFFFFF', fontSize: 12, formatter: (params: { name: string; value: number }) => `${params.name}\n${money(params.value)}` }, itemStyle: { borderColor: '#FFFFFF', borderWidth: 3, gapWidth: 3 }, levels: [{ itemStyle: { borderWidth: 0, gapWidth: 4 } }, { color: ['#3662E2', '#15265C', '#395386', '#0E1732', '#274477'], colorMappingBy: 'index', itemStyle: { borderWidth: 3, gapWidth: 3 } }], data: rows.filter(row => row.contracts > 0).map(row => ({ id: row.id, name: row.label, value: row.contracts, count: row.contractCount })) }],
  };
}

export function CrossBaseAnalysis(props: CrossBaseAnalysisProps) {
  const { scope, onGre, onNavigate } = props;
  const rows = useMemo(() => buildCrossBaseRows(scope), [scope]);
  const scatter = useMemo(() => growthScatter(rows), [rows]);
  const treemap = useMemo(() => contractTreemap(rows), [rows]);
  const hasGrowth = rows.some(row => row.employmentChange !== null && row.registrationChange !== null);
  const hasContracts = rows.some(row => row.contracts > 0);
  const maxCompanyCount = Math.max(1, ...rows.map(row => row.companies));

  return <div className="bi-crossbase">
    <div className="bi-crossbase-top p-grid two">
      <Panel title="Dinâmica econômica e cadastral" subtitle={`Variação entre fins de mês · ${comparisonLabel(rows)}`}>
        {hasGrowth ? <Chart option={scatter} height={310} ariaLabel="Dispersão por GRE: variação do emprego agregado versus variação dos registros ativos. Tamanho proporcional ao emprego." onPick={params => { if (params.data?.id) onGre(params.data.id); }} />
          : <div className="p-empty"><h3>Sem comparação nas duas fontes</h3><p>O recorte precisa de estoques nos dois fins de mês.</p></div>}
        <GrowthNote rows={rows} />
      </Panel>
      <Panel title="Participação regional nas contratações" subtitle="Área proporcional ao valor contratado · cada contrato contado uma vez" action={<DetailAction label="Contratações" onClick={() => onNavigate('contracts')} />}>
        {hasContracts ? <Chart option={treemap} height={310} ariaLabel="Treemap do valor das contratações públicas por GRE do estabelecimento fornecedor" onPick={params => { if (params.data?.id) onGre(params.data.id); }} />
          : <div className="p-empty"><h3>Nenhuma contratação no período</h3><p>Altere os filtros ou amplie a janela de análise.</p></div>}
        <p className="bi-micro-note">PNCP simulado. Território do fornecedor; valor contratado não equivale a faturamento ou execução.</p>
      </Panel>
    </div>
    <details className="p-panel bi-crossbase-matrix bi-crossbase-details">
      <summary className="bi-table-disclosure">Comparação regional em tabela <span>{n(rows.length)} GREs</span></summary>
      <div className="p-panel-body"><div className="p-table-scroll"><table className="bi-crossbase-table">
        <caption className="p-sr-only">Empresas, cadastro CREA, empregos agregados, crescimento e contratações públicas por GRE.</caption>
        <thead><tr><th scope="col">GRE</th><th scope="col">Empresas</th><th scope="col">Registradas</th><th scope="col">Empregos</th><th scope="col">Δ emprego</th><th scope="col">Δ registros ativos</th><th scope="col">Valor contratado</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.id}>
          <th scope="row"><button onClick={() => onGre(row.id)}>{row.label}<ArrowUpRight size={12} /></button></th>
          <td><span className="bi-cell-bar"><i style={{ width: `${row.companies / maxCompanyCount * 100}%` }} /><b>{n(row.companies)}</b></span></td>
          <td>{n(row.registered)}</td><td>{n(row.employment)}</td>
          <td>{row.employmentChange === null ? '—' : signed(row.employmentChange)}</td>
          <td>{row.registrationChange === null ? '—' : signed(row.registrationChange)}</td>
          <td title={row.contracts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}>{money(row.contracts)}</td>
        </tr>)}</tbody>
      </table></div>
        <p className="bi-micro-note">Empresas distintas podem participar de várias GREs; seus totais regionais não são aditivos. Emprego responde a território, CNAE, CBO e período, sem ligação individual a CNPJ ou profissional. Fontes demonstrativas.</p>
      </div>
    </details>
  </div>;
}
