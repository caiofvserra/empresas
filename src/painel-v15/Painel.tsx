import { useEffect, useMemo, useState, useTransition } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronDown, Copy, Moon, Search, Sun, X } from 'lucide-react';
import { dataset } from '../domain/dataset';
import { defaultFilters } from '../domain/types';
import type { Establishment, Filters } from '../domain/types';
import { EngineeringEmblem } from '../components/EngineeringIdentity';
import { selectEnterpriseScope } from '../enterprise-v10/filters';
import { buildEnterpriseModel } from '../enterprise-v10/model';
import type { EnterpriseModel } from '../enterprise-v10/types';
import type { Scope } from '../domain/engine';
import { actionList, brl, buildPanel, caseStages, debtAging, gapByCnae, money } from './metrics';
import type { ActionRow, AreaRow, IndicatorId, PanelData } from './metrics';
import { Chart, Spark, useSpMap, useTokens } from './chart';
import type { Tokens } from './chart';
import './painel.css';

/* ---------- Definições: o que é, por que importa, o que fazer ---------- */
const info: Record<IndicatorId, { label: string; short: string; what: string; action: string; list: string; column: (row: AreaRow) => number | null; format: (value: number) => string; higherIsWorse: boolean }> = {
  base: { label: 'Empresas com registro ativo', short: 'Empresas ativas', what: 'Empresas (CNPJ raiz) com registro vigente no CREA-SP no fim do período.', action: 'Entender por que empresas saíram e contatar as que ainda operam.', list: 'Empresas que saíram do registro no período', column: row => row.active, format: value => value.toLocaleString('pt-BR'), higherIsWorse: false },
  receipts: { label: 'Arrecadação de empresas', short: 'Arrecadação', what: 'Pagamentos efetivos de pessoas jurídicas no período, incluindo dívida recuperada.', action: 'Comparar com o mesmo período do ano anterior e localizar regionais em queda.', list: 'Maiores pagadores no período', column: row => row.receipts, format: brl, higherIsWorse: false },
  debt: { label: 'Saldo vencido de empresas', short: 'Inadimplência', what: 'Valor em aberto de obrigações já vencidas, no corte. O percentual é a parcela de empresas cobradas com algum atraso.', action: 'Priorizar cobrança pelos maiores saldos e pelos atrasos mais antigos.', list: 'Maiores devedores', column: row => row.defaultRate, format: value => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`, higherIsWorse: true },
  gap: { label: 'Empresas sem registro', short: 'Sem registro', what: 'CNPJs ativos na Receita, com CNAE de engenharia, sem registro vigente no CREA-SP (nunca registrados ou com registro inativo).', action: 'Base para fiscalização e orientação ao registro. CNAE não prova obrigação: confirmar a atividade.', list: 'CNPJs sem registro, mais recentes primeiro', column: row => row.gap, format: value => value.toLocaleString('pt-BR'), higherIsWorse: true },
  noRt: { label: 'Empresas sem responsável técnico', short: 'Sem RT', what: 'Empresas com registro ativo sem vínculo de responsável técnico identificado no corte.', action: 'Notificar para indicação de RT; conferir antes se o vínculo não está só desatualizado no cadastro.', list: 'Empresas ativas sem RT, há mais tempo primeiro', column: row => row.noRt, format: value => value.toLocaleString('pt-BR'), higherIsWorse: true },
  cases: { label: 'Fiscalizações em aberto', short: 'Fiscalização', what: 'Casos de fiscalização de empresas ainda não concluídos.', action: 'Atacar os casos mais antigos e a etapa onde a fila acumula.', list: 'Casos abertos, mais antigos primeiro', column: row => row.openCases, format: value => value.toLocaleString('pt-BR'), higherIsWorse: true },
};
const order: IndicatorId[] = ['base', 'receipts', 'debt', 'gap', 'noRt', 'cases'];
const sizes = ['Microempresa', 'Pequena empresa', 'Média empresa', 'Grande empresa'];
const short = (name: string) => name.split('·')[1]?.trim() ?? name;
const pct = (value: number, digits = 1) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: digits })}%`;
const monthLabel = (value: string) => new Date(`${value}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '');
const cut = new Date(`${dataset.snapshotDate}T12:00:00Z`).toLocaleDateString('pt-BR');

interface Detail { id: IndicatorId; area?: { level: 'gre' | 'city'; id: string; name: string } }

export default function Painel() {
  const [gre, setGre] = useState('');
  const [chosenSizes, setSizes] = useState<string[]>([]);
  const [period, setPeriod] = useState(12);
  const [metric, setMetric] = useState<IndicatorId>('gap');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
  const [pending, transition] = useTransition();
  const tokens = useTokens();
  useEffect(() => { if (theme) document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setDetail(null); }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, []);

  const filters: Filters = useMemo(() => ({ ...defaultFilters, greIds: gre ? [gre] : [], sizes: chosenSizes, period }), [gre, chosenSizes, period]);
  const scope = useMemo(() => selectEnterpriseScope(dataset, filters), [filters]);
  const historyScope = useMemo(() => selectEnterpriseScope(dataset, { ...filters, period: 24 }), [filters]);
  const model = useMemo(() => buildEnterpriseModel(scope), [scope]);
  const history = useMemo(() => buildEnterpriseModel(historyScope), [historyScope]);
  const data = useMemo(() => buildPanel(scope, model, history), [scope, model, history]);
  const isDark = theme === 'dark' || theme === null && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const change = (work: () => void) => transition(work);

  return <div className="app" aria-busy={pending}>
    <header className="top">
      <div className="brand"><EngineeringEmblem /><div><h1>Gestão de empresas</h1><p>CREA-SP · corte {cut} · {period} meses</p></div></div>
      <div className="controls">
        <label className="select"><span>Regional</span><select id="filtro-gre" value={gre} onChange={event => change(() => setGre(event.target.value))}><option value="">Todas as GREs</option>{dataset.gres.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select><ChevronDown size={14} /></label>
        <div className="chips" role="group" aria-label="Porte da empresa">{sizes.map(size => <button key={size} aria-pressed={chosenSizes.includes(size)} onClick={() => change(() => setSizes(previous => previous.includes(size) ? previous.filter(item => item !== size) : [...previous, size]))}>{size.replace(/ ?empresa/i, '')}</button>)}</div>
        <div className="chips" role="radiogroup" aria-label="Período">{[3, 6, 12].map(value => <button key={value} role="radio" aria-checked={period === value} aria-pressed={period === value} onClick={() => change(() => setPeriod(value))}>{value} meses</button>)}</div>
        <span className="demo" title="Valores internos fictícios para demonstração do modelo">Dados demonstrativos</span>
        <button className="icon" aria-label={isDark ? 'Usar tema claro' : 'Usar tema escuro'} onClick={() => setTheme(isDark ? 'light' : 'dark')}>{isDark ? <Sun size={16} /> : <Moon size={16} />}</button>
      </div>
    </header>

    <section className="kpis" aria-label="Indicadores">
      {order.map(id => <Kpi key={id} id={id} data={data} tokens={tokens} active={detail?.id === id && !detail.area} onOpen={() => setDetail({ id })} />)}
    </section>

    <main className="board">
      <section className="panel table-panel" aria-labelledby="t-onde">
        <header><div><h2 id="t-onde">Onde agir</h2><p>Por gerência regional. Clique num número para ver as empresas; no nome da GRE para filtrar a página.</p></div></header>
        <AreaTable rows={data.areas} total={data.total} metric={metric} selectedGre={gre} onMetric={setMetric} onFilter={id => change(() => setGre(previous => previous === id ? '' : id))} onCell={(id, row) => setDetail({ id, area: { level: 'gre', id: row.id, name: short(row.name) } })} />
      </section>
      <section className="panel map-panel" aria-labelledby="t-mapa">
        <header><div><h2 id="t-mapa">{info[metric].short} por município</h2><p>Mesma medida da coluna destacada na tabela. Clique num município para ver as empresas.</p></div></header>
        <CityMap rows={data.cities} metric={metric} tokens={tokens} onCity={row => setDetail({ id: metric, area: { level: 'city', id: row.id, name: row.name } })} />
      </section>
      <section className="panel trend-panel" aria-labelledby="t-arr">
        <header><div><h2 id="t-arr">Arrecadação mensal de empresas</h2><p>Últimos 12 meses comparados aos mesmos meses do ano anterior.</p></div></header>
        <ReceiptsChart data={data} tokens={tokens} />
      </section>
    </main>
    <footer className="foot">Valores internos fictícios, gerados para demonstrar o modelo; a versão de produção lê o cadastro, o financeiro e a fiscalização do CREA-SP. Contagens por empresa (CNPJ raiz), exceto "sem registro", que conta CNPJs completos.</footer>
    {detail && <DetailPanel detail={detail} scope={scope} model={model} history={history} data={data} tokens={tokens} onClose={() => setDetail(null)} />}
  </div>;
}

/* ---------- Cartão de indicador ---------- */
function Kpi({ id, data, tokens, active, onOpen }: { id: IndicatorId; data: PanelData; tokens: Tokens; active: boolean; onOpen: () => void }) {
  const item = data.indicators[id], meta = info[id];
  const value = item.value === null ? '—' : id === 'receipts' || id === 'debt' ? brl(item.value) : item.value.toLocaleString('pt-BR');
  let badge: { text: string; tone: 'good' | 'bad' | 'neutral' } | null = null;
  if (id === 'base' && item.delta !== null) badge = { text: `${item.delta >= 0 ? '+' : ''}${pct(item.delta)} no período`, tone: item.delta >= 0 ? 'good' : 'bad' };
  if (id === 'receipts' && item.delta !== null) badge = { text: `${item.delta >= 0 ? '+' : ''}${pct(item.delta, 0)} vs. ano anterior`, tone: item.delta >= 0 ? 'good' : 'bad' };
  if (id === 'debt' && item.delta !== null) badge = { text: `${pct(item.delta, 0)} das empresas em atraso`, tone: item.delta > 40 ? 'bad' : 'neutral' };
  if (id === 'noRt' && item.delta !== null) badge = { text: `${pct(item.delta, 0)} das ativas`, tone: item.delta > 20 ? 'bad' : 'neutral' };
  const Arrow = item.delta !== null && item.delta < 0 ? ArrowDownRight : ArrowUpRight;
  return <button className={`kpi ${active ? 'is-active' : ''}`} onClick={onOpen} aria-label={`${meta.label}: ${value}. Ver detalhes`}>
    <span className="kpi-label">{meta.label}</span>
    <span className="kpi-row"><strong>{value}</strong>{item.spark.length > 1 && <Spark values={item.spark.slice(-12)} color={id === 'debt' ? tokens.bad : id === 'receipts' ? tokens.accent : tokens.blue} />}</span>
    {badge ? <span className={`badge is-${badge.tone}`}>{(id === 'base' || id === 'receipts') && <Arrow size={12} />}{badge.text}</span> : <span className="badge is-none" />}
    <span className="kpi-sub">{item.secondary}</span>
  </button>;
}

/* ---------- Tabela "Onde agir" ---------- */
const columns: { id: IndicatorId; head: string; sub: string }[] = [
  { id: 'base', head: 'Empresas ativas', sub: 'variação' },
  { id: 'receipts', head: 'Arrecadação', sub: 'vs. ano ant.' },
  { id: 'debt', head: 'Inadimplência', sub: 'saldo vencido' },
  { id: 'gap', head: 'Sem registro', sub: 'CNPJs' },
  { id: 'noRt', head: 'Sem RT', sub: '% das ativas' },
  { id: 'cases', head: 'Fiscalização', sub: '> 1 ano' },
];
function AreaTable({ rows, total, metric, selectedGre, onMetric, onFilter, onCell }: { rows: AreaRow[]; total: AreaRow; metric: IndicatorId; selectedGre: string; onMetric: (id: IndicatorId) => void; onFilter: (id: string) => void; onCell: (id: IndicatorId, row: AreaRow) => void }) {
  const [sort, setSort] = useState<{ id: IndicatorId | 'name'; dir: 1 | -1 }>({ id: 'gap', dir: -1 });
  const sorted = [...rows].sort((a, b) => sort.id === 'name' ? a.name.localeCompare(b.name, 'pt-BR', { numeric: true }) * sort.dir : ((info[sort.id].column(a) ?? -1) - (info[sort.id].column(b) ?? -1)) * sort.dir);
  const max = Object.fromEntries(columns.map(column => [column.id, Math.max(1, ...rows.map(row => info[column.id].column(row) ?? 0))])) as Record<IndicatorId, number>;
  const sortBy = (id: IndicatorId) => { setSort(previous => ({ id, dir: previous.id === id ? (previous.dir === 1 ? -1 : 1) : -1 })); onMetric(id); };
  const secondary = (id: IndicatorId, row: AreaRow) => {
    if (id === 'base') return row.growth === null ? '' : <em className={row.growth >= 0 ? 'up' : 'down'}>{row.growth >= 0 ? '+' : ''}{pct(row.growth, 0)}</em>;
    if (id === 'receipts') return row.receiptsPrevious ? <em className={row.receipts >= row.receiptsPrevious ? 'up' : 'down'}>{row.receipts >= row.receiptsPrevious ? '+' : ''}{pct((row.receipts - row.receiptsPrevious) / row.receiptsPrevious * 100, 0)}</em> : '';
    if (id === 'debt') return <em>{brl(row.overdue)}</em>;
    if (id === 'noRt') return row.noRtRate === null ? '' : <em>{pct(row.noRtRate, 0)}</em>;
    if (id === 'cases') return row.oldCases ? <em className="down">{row.oldCases}</em> : <em>0</em>;
    return '';
  };
  const cell = (id: IndicatorId, row: AreaRow, isTotal = false) => {
    const value = info[id].column(row), share = value === null ? 0 : value / max[id];
    const heat = info[id].higherIsWorse && !isTotal ? `color-mix(in srgb, var(--bad) ${Math.round(share * 22)}%, transparent)` : undefined;
    return <td key={id} className={`num ${metric === id ? 'is-metric' : ''}`} style={heat ? { backgroundColor: heat } : undefined}>
      <button disabled={value === null} onClick={() => onCell(id, row)} title={`${info[id].label} · ${short(row.name)} · ver empresas`}>
        <span className="val">{value === null ? '—' : info[id].format(value)}</span>{secondary(id, row)}
        {!isTotal && !info[id].higherIsWorse && <i className="bar" style={{ width: `${share * 100}%` }} />}
      </button>
    </td>;
  };
  return <div className="table-wrap"><table className="areas">
    <thead><tr>
      <th className="name"><button onClick={() => setSort(previous => ({ id: 'name', dir: previous.id === 'name' ? (previous.dir === 1 ? -1 : 1) : 1 }))}>GRE</button></th>
      {columns.map(column => <th key={column.id} className={`num ${metric === column.id ? 'is-metric' : ''}`} aria-sort={sort.id === column.id ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}><button onClick={() => sortBy(column.id)} title="Ordenar e mostrar no mapa">{column.head}<small>{column.sub}</small></button></th>)}
    </tr></thead>
    <tbody>{sorted.map(row => <tr key={row.id} className={selectedGre === row.id ? 'is-selected' : ''}>
      <th className="name" scope="row"><button onClick={() => onFilter(row.id)} title={selectedGre === row.id ? 'Remover filtro' : 'Filtrar a página por esta GRE'}><b>{row.id.replace('GRE', '')}</b>{short(row.name)}</button></th>
      {columns.map(column => cell(column.id, row))}
    </tr>)}</tbody>
    <tfoot><tr><th className="name" scope="row"><span>Total</span></th>{columns.map(column => cell(column.id, total, true))}</tr></tfoot>
  </table></div>;
}

/* ---------- Mapa municipal ---------- */
function CityMap({ rows, metric, tokens, onCity }: { rows: AreaRow[]; metric: IndicatorId; tokens: Tokens; onCity: (row: AreaRow) => void }) {
  const ready = useSpMap();
  const option = useMemo(() => {
    const values = rows.map(row => info[metric].column(row)).filter((value): value is number => value !== null);
    const ramp = info[metric].higherIsWorse ? [tokens.soft, tokens.accent, tokens.bad] : [tokens.soft, tokens.blue, tokens.brand];
    return {
      tooltip: { trigger: 'item', formatter: (item: any) => { const row = rows.find(city => city.name === item.name); return row ? `<b>${row.name}</b><br/>${info[metric].label}: ${info[metric].column(row) === null ? '—' : info[metric].format(info[metric].column(row)!)}<br/><span style="opacity:.75">clique para ver as empresas</span>` : `${item.name}<br/><span style="opacity:.75">fora da amostra demonstrativa</span>`; } },
      visualMap: { min: 0, max: Math.max(1, ...values), left: 0, bottom: 0, orient: 'horizontal', itemWidth: 10, itemHeight: 110, calculable: false, text: ['maior', '0'], textStyle: { color: tokens.muted, fontSize: 10 }, inRange: { color: ramp } },
      series: [{ type: 'map', map: 'spPainel', roam: true, scaleLimit: { min: 1, max: 6 }, left: 0, right: 0, top: 0, bottom: 28, selectedMode: false,
        itemStyle: { areaColor: tokens.soft, borderColor: tokens.line, borderWidth: 0.5 }, emphasis: { itemStyle: { areaColor: tokens.accent }, label: { show: true, color: '#1A202C', fontWeight: 700 } },
        data: rows.map(row => ({ name: row.name, value: info[metric].column(row) ?? undefined })) }],
    };
  }, [rows, metric, tokens]);
  return ready ? <Chart option={option} tokens={tokens} label={`Mapa de ${info[metric].label} por município`} onPick={item => { const row = rows.find(city => city.name === item.name); if (row) onCity(row); }} /> : <div className="loading">Carregando mapa…</div>;
}

/* ---------- Arrecadação 12 x 12 ---------- */
function ReceiptsChart({ data, tokens }: { data: PanelData; tokens: Tokens }) {
  const option = useMemo(() => ({
    grid: { top: 26, right: 6, bottom: 4, left: 4, containLabel: true },
    legend: { top: 0, right: 0, itemWidth: 12, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 11 } },
    tooltip: { trigger: 'axis', formatter: (items: any[]) => { const row = data.monthly[items[0].dataIndex]; const delta = row.previous ? (row.receipts - row.previous) / row.previous * 100 : null; return `<b>${monthLabel(row.month)}/${row.month.slice(2, 4)}</b><br/>Recebido: ${money(row.receipts)}<br/>Um ano antes: ${row.previous === null ? '—' : money(row.previous)}${delta === null ? '' : `<br/><b>${delta >= 0 ? '+' : ''}${pct(delta, 0)}</b>`}`; } },
    xAxis: { type: 'category', data: data.monthly.map(row => monthLabel(row.month)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: (value: number) => value.toLocaleString('pt-BR', { notation: 'compact' }) } },
    series: [
      { name: 'Últimos 12 meses', type: 'bar', barWidth: '55%', data: data.monthly.map(row => row.receipts), itemStyle: { color: tokens.accent, borderRadius: [4, 4, 0, 0] } },
      { name: 'Ano anterior', type: 'line', data: data.monthly.map(row => row.previous), smooth: 0.3, symbol: 'circle', symbolSize: 5, lineStyle: { color: tokens.brand, width: 2, type: [5, 4] }, itemStyle: { color: tokens.brand } },
    ],
  }), [data, tokens]);
  return <Chart option={option} tokens={tokens} label="Arrecadação mensal comparada ao ano anterior" />;
}

/* ---------- Painel lateral de detalhe ---------- */
function DetailPanel({ detail, scope, model, history, data, tokens, onClose }: { detail: Detail; scope: Scope; model: EnterpriseModel; history: EnterpriseModel; data: PanelData; tokens: Tokens; onClose: () => void }) {
  const meta = info[detail.id];
  const [query, setQuery] = useState(''), [open, setOpen] = useState<string | null>(null), [limit, setLimit] = useState(40), [copied, setCopied] = useState('');
  const filter = useMemo(() => detail.area ? (row: Establishment) => detail.area!.level === 'gre' ? row.greId === detail.area!.id : row.cityId === detail.area!.id : undefined, [detail]);
  const list = useMemo(() => actionList(detail.id, scope, model, filter), [detail, scope, model]); // eslint-disable-line react-hooks/exhaustive-deps
  const visible = list.filter(row => !query || `${row.name} ${row.cnpj} ${row.city}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  useEffect(() => { setOpen(null); setLimit(40); setQuery(''); }, [detail]);
  const copy = async () => {
    const csv = ['Empresa;CNPJ;Município;GRE;Valor;Observação', ...visible.map(row => [row.name, row.cnpj, row.city, row.gre, row.valueLabel, row.note].map(value => `"${String(value).replace(/"/g, '""')}"`).join(';'))].join('\n');
    try { await navigator.clipboard.writeText(csv); setCopied(`${visible.length} linhas copiadas. Cole numa planilha.`); } catch { setCopied('Não foi possível copiar neste navegador.'); }
  };
  const area = detail.area ? (detail.area.level === 'gre' ? data.areas : data.cities).find(row => row.id === detail.area!.id) : data.total;
  return <div className="drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="drawer" role="dialog" aria-modal="true" aria-label={meta.label}>
      <header><div><span className="eyebrow">{detail.area ? `${detail.area.level === 'gre' ? 'Regional' : 'Município'} · ${detail.area.name}` : 'Todo o recorte'}</span><h2>{meta.label}</h2></div><button className="icon" onClick={onClose} aria-label="Fechar detalhe"><X size={18} /></button></header>
      <div className="drawer-body">
        <p className="what">{meta.what}</p>
        <p className="todo"><b>Uso:</b> {meta.action}</p>
        {area && <AreaSummary id={detail.id} row={area} />}
        <div className="mini"><DetailChart id={detail.id} scope={scope} model={model} history={history} data={data} tokens={tokens} filter={filter} /></div>
        <div className="list-head"><h3>{meta.list}<span>{list.length.toLocaleString('pt-BR')}</span></h3>
          <div className="list-tools"><label className="search"><Search size={14} /><input id="busca-lista" placeholder="Buscar empresa, CNPJ ou município" value={query} onChange={event => setQuery(event.target.value)} /></label><button className="ghost" onClick={copy} disabled={!visible.length}><Copy size={14} />Copiar lista</button></div>
          {copied && <p className="copied" role="status">{copied}</p>}
        </div>
        <ol className="list">{visible.slice(0, limit).map(row => <li key={`${row.companyId}-${row.cnpj}`} className={open === row.cnpj ? 'is-open' : ''}>
          <button onClick={() => setOpen(previous => previous === row.cnpj ? null : row.cnpj)} aria-expanded={open === row.cnpj}><span className="who"><b>{row.name}</b><small>{row.cnpj} · {row.city}</small></span><span className="amount"><b>{row.valueLabel}</b><small>{row.note}</small></span></button>
          {open === row.cnpj && <CompanyFacts row={row} scope={scope} model={model} />}
        </li>)}</ol>
        {visible.length > limit && <button className="ghost more" onClick={() => setLimit(value => value + 60)}>Mostrar mais ({(visible.length - limit).toLocaleString('pt-BR')} restantes)</button>}
        {!visible.length && <p className="empty">Nenhuma empresa nesta seleção.</p>}
      </div>
    </aside>
  </div>;
}

function AreaSummary({ id, row }: { id: IndicatorId; row: AreaRow }) {
  const facts: [string, string][] = id === 'base' ? [['Ativas', row.active.toLocaleString('pt-BR')], ['Variação', row.growth === null ? '—' : `${row.growth >= 0 ? '+' : ''}${pct(row.growth)}`]]
    : id === 'receipts' ? [['Recebido', money(row.receipts)], ['Ano anterior', row.receiptsPrevious === null ? '—' : money(row.receiptsPrevious)]]
    : id === 'debt' ? [['Saldo vencido', money(row.overdue)], ['Empresas em atraso', `${row.debtors.toLocaleString('pt-BR')} de ${row.charged.toLocaleString('pt-BR')}`]]
    : id === 'gap' ? [['CNPJs sem registro', row.gap.toLocaleString('pt-BR')], ['Empresas ativas', row.active.toLocaleString('pt-BR')]]
    : id === 'noRt' ? [['Sem RT', row.noRt.toLocaleString('pt-BR')], ['% das ativas', row.noRtRate === null ? '—' : pct(row.noRtRate)]]
    : [['Em aberto', row.openCases.toLocaleString('pt-BR')], ['Há mais de 1 ano', row.oldCases.toLocaleString('pt-BR')]];
  return <dl className="summary">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function DetailChart({ id, scope, model, history, data, tokens, filter }: { id: IndicatorId; scope: Scope; model: EnterpriseModel; history: EnterpriseModel; data: PanelData; tokens: Tokens; filter?: (row: Establishment) => boolean }) {
  const option = useMemo(() => {
    const bars = (rows: { name: string; value: number }[], format: (value: number) => string, color: string, title: string) => ({
      title: { text: title, left: 0, top: 0, textStyle: { color: tokens.ink, fontSize: 12, fontWeight: 700, fontFamily: 'Lato, sans-serif' } },
      grid: { top: 26, right: 64, bottom: 2, left: 2, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `${items[0].name}<br/><b>${format(items[0].value)}</b>` },
      xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.name), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11, width: 170, overflow: 'truncate' } },
      series: [{ type: 'bar', barWidth: 12, data: rows.map(row => row.value), itemStyle: { color, borderRadius: 6 }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, formatter: (item: any) => format(item.value) }, showBackground: true, backgroundStyle: { color: tokens.soft, borderRadius: 6 } }],
    });
    if (id === 'base') return {
      title: { text: 'Empresas ativas · 24 meses', left: 0, top: 0, textStyle: { color: tokens.ink, fontSize: 12, fontWeight: 700, fontFamily: 'Lato, sans-serif' } },
      grid: { top: 30, right: 8, bottom: 2, left: 2, containLabel: true }, tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: history.monthly.map(row => `${monthLabel(row.month)}/${row.month.slice(2, 4)}`), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, interval: 5 } },
      yAxis: { type: 'value', scale: true, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
      series: [{ type: 'line', name: 'Empresas ativas', data: history.monthly.map(row => row.base), smooth: 0.3, showSymbol: false, lineStyle: { color: tokens.brand, width: 2.5 }, areaStyle: { color: tokens.soft } }],
    };
    if (id === 'receipts') return bars(data.areas.filter(row => row.receipts > 0).sort((a, b) => b.receipts - a.receipts).slice(0, 8).map(row => ({ name: short(row.name), value: row.receipts })), brl, tokens.accent, 'Arrecadação por regional');
    if (id === 'debt') return bars(debtAging(scope, filter), brl, tokens.bad, 'Saldo vencido por tempo de atraso');
    if (id === 'gap') return bars(gapByCnae(scope, model, filter), value => value.toLocaleString('pt-BR'), tokens.blue, 'CNPJs sem registro por atividade (CNAE principal)');
    if (id === 'noRt') return bars(data.areas.filter(row => row.noRtRate !== null).sort((a, b) => (b.noRtRate ?? 0) - (a.noRtRate ?? 0)).slice(0, 8).map(row => ({ name: short(row.name), value: row.noRtRate ?? 0 })), value => pct(value, 0), tokens.bad, '% de empresas ativas sem RT, por regional');
    return bars(caseStages(scope, filter).map(row => ({ name: `${row.name}${row.age === null ? '' : ` · ${Math.round(row.age)} d`}`, value: row.value })), value => value.toLocaleString('pt-BR'), tokens.blue, 'Casos abertos por etapa · idade mediana');
  }, [id, scope, model, history, data, tokens, filter]);
  return <Chart option={option} tokens={tokens} label="Gráfico de detalhe" />;
}

function CompanyFacts({ row, scope, model }: { row: ActionRow; scope: Scope; model: EnterpriseModel }) {
  const fact = model.companyFacts.find(item => item.companyId === row.companyId), company = scope.companies.find(item => item.id === row.companyId);
  const cases = scope.cases.filter(item => item.companyId === row.companyId), units = scope.establishments.filter(item => item.companyId === row.companyId);
  const facts: [string, string][] = [
    ['Razão social', company?.name ?? '—'], ['Porte', company?.size ?? '—'], ['Regional', row.gre], ['Estabelecimentos', String(units.length)],
    ['Registro da empresa (qualquer estabelecimento)', fact?.active ? 'Ativo' : 'Sem registro ativo'], ['Responsável técnico', fact?.withRt ? 'Identificado' : 'Não identificado'],
    ['ARTs no período', String(fact?.artCount ?? 0)], ['Saldo vencido', money(fact?.overdue ?? 0)], ['Pago no período', money(fact?.receipts ?? 0)],
    ['Fiscalizações', cases.length ? cases.map(item => item.status).join(', ') : 'Nenhuma'],
  ];
  return <dl className="facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
