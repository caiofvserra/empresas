import { useEffect, useMemo, useState, useTransition } from 'react';
import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Building2, ChevronDown, MapPin, Moon, Sparkles, Sun, Wallet } from 'lucide-react';
import { dataset } from '../domain/dataset';
import { defaultFilters } from '../domain/types';
import type { Filters } from '../domain/types';
import { EngineeringEmblem } from '../components/EngineeringIdentity';
import { selectEnterpriseScope } from '../enterprise-v10/filters';
import { buildEnterpriseModel } from '../enterprise-v10/model';
import { caoService, complianceFlow, holtForecast, stockBridge } from '../gestao-v14/metrics';
import { brl, buildPanel, debtAging, money } from './metrics';
import type { AreaRow, IndicatorId, PanelData } from './metrics';
import { Chart, Spark, useSpMap, useTokens } from './chart';
import type { Tokens } from './chart';
import { cut, info, monthLabel, pct, short, sizes } from './definitions';
import DetailPanel from './Detail';
import type { Detail } from './Detail';
import './painel.css';

/** V16 · uma tela, três grupos: Receita, Base e conformidade, Onde agir. Tamanho de cada visual segue o peso da decisão. */
const RECOVERY_TARGET = 30;

/* ---------- Lentes do mapa: em todas, bolha = quantidade do problema e cor = proporção do problema (maior = pior) ---------- */
type LensId = 'market' | 'revenue' | 'rt' | 'cases';
const lenses: Record<LensId, { label: string; problem: string; rate: string; detail: IndicatorId; get: (row: AreaRow) => { volume: number; rate: number | null }; formatVolume: (value: number) => string; read: string }> = {
  market: { label: 'Registro', problem: 'CNPJs sem registro', rate: 'sem registro', detail: 'gap', get: row => ({ volume: row.gap, rate: row.coverage === null ? null : 100 - row.coverage }), formatVolume: value => `${value.toLocaleString('pt-BR')} CNPJs`, read: 'CNPJs de engenharia sem registro. Bolha grande e vermelha: muitos e em proporção alta. Prioridade de fiscalização.' },
  revenue: { label: 'Inadimplência', problem: 'saldo vencido', rate: 'das empresas em atraso', detail: 'debt', get: row => ({ volume: row.overdue, rate: row.defaultRate }), formatVolume: brl, read: 'Saldo vencido de empresas. Bolha grande e vermelha: muito dinheiro em atraso e muitas empresas devendo. Prioridade de cobrança.' },
  rt: { label: 'Responsável técnico', problem: 'empresas sem RT', rate: 'das ativas sem RT', detail: 'noRt', get: row => ({ volume: row.noRt, rate: row.noRtRate }), formatVolume: value => `${value.toLocaleString('pt-BR')} empresas`, read: 'Empresas registradas sem RT identificado. Bolha grande e vermelha: notificar para indicação de RT.' },
  cases: { label: 'Fiscalização', problem: 'casos em aberto', rate: 'há mais de 1 ano', detail: 'cases', get: row => ({ volume: row.openCases, rate: row.oldRate }), formatVolume: value => `${value.toLocaleString('pt-BR')} casos`, read: 'Casos de fiscalização em aberto. Bolha grande e vermelha: fila grande e antiga; reforçar equipe ou fazer mutirão.' },
};

export default function Painel() {
  const [gre, setGre] = useState('');
  const [chosenSizes, setSizes] = useState<string[]>([]);
  const [period, setPeriod] = useState(12);
  const [lens, setLens] = useState<LensId>('market');
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
  const extra = useMemo(() => ({ flow: complianceFlow(model, scope), bridge: stockBridge(model, scope), forecast: holtForecast(history.monthly.map(row => row.base)), cao: caoService(scope), aging: debtAging(scope) }), [model, scope, history]);
  const isDark = theme === 'dark' || theme === null && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const change = (work: () => void) => transition(work);
  const open = (id: IndicatorId, area?: Detail['area']) => setDetail({ id, area });
  const outside = extra.flow.nodes.filter(node => node.name === 'Só histórico' || node.name === 'Nunca registrada').reduce((total, node) => total + node.value, 0);
  const recovery = model.metrics.recovery.value;

  return <div className="app" aria-busy={pending}>
    <header className="top">
      <div className="brand"><EngineeringEmblem /><div><h1>Gestão de empresas</h1><p>CREA-SP · corte {cut} · últimos {period} meses</p></div></div>
      <div className="controls">
        <label className="select"><span>Regional</span><select id="filtro-gre" value={gre} onChange={event => change(() => setGre(event.target.value))}><option value="">Todas as GREs</option>{dataset.gres.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select><ChevronDown size={14} /></label>
        <div className="chips" role="group" aria-label="Porte da empresa">{sizes.map(size => <button key={size} aria-pressed={chosenSizes.includes(size)} onClick={() => change(() => setSizes(previous => previous.includes(size) ? previous.filter(item => item !== size) : [...previous, size]))}>{size.replace(/ ?empresa/i, '')}</button>)}</div>
        <div className="chips" role="radiogroup" aria-label="Período">{[3, 6, 12].map(value => <button key={value} role="radio" aria-checked={period === value} aria-pressed={period === value} onClick={() => change(() => setPeriod(value))}>{value} meses</button>)}</div>
        <span className="demo" title="Valores internos fictícios para demonstração do modelo">Dados demonstrativos</span>
        <button className="icon" aria-label={isDark ? 'Usar tema claro' : 'Usar tema escuro'} onClick={() => setTheme(isDark ? 'light' : 'dark')}>{isDark ? <Sun size={16} /> : <Moon size={16} />}</button>
      </div>
    </header>

    <main className="board">
      {/* ===== 1. Receita: a principal preocupação da administração; coluna mais à esquerda e gráfico mais alto ===== */}
      <section className="group" aria-labelledby="g-receita">
        <h2 className="group-title" id="g-receita"><Wallet size={15} />Receita</h2>
        <div className="cluster">
          <Metric label="Arrecadação de empresas" value={brl(model.metrics.receipts.value ?? 0)} chip={data.indicators.receipts.delta === null ? null : { text: `${data.indicators.receipts.delta >= 0 ? '+' : ''}${pct(data.indicators.receipts.delta, 0)} vs. ano anterior`, tone: data.indicators.receipts.delta >= 0 ? 'good' : 'bad', arrow: data.indicators.receipts.delta >= 0 ? 'up' : 'down' }} spark={data.monthly.map(row => row.receipts)} color={tokens.accent} onOpen={() => open('receipts')} />
          <Metric label="Saldo vencido" value={brl(model.metrics.overdue.value ?? 0)} chip={data.total.defaultRate === null ? null : { text: `${pct(data.total.defaultRate, 0)} das empresas em atraso`, tone: data.total.defaultRate > 35 ? 'bad' : 'neutral' }} spark={history.monthly.slice(-12).map(row => row.overdue)} color={tokens.bad} onOpen={() => open('debt')} />
          <Metric label="Dívida antiga recuperada" value={recovery === null ? '—' : pct(recovery)} chip={recovery === null ? null : { text: `meta ${RECOVERY_TARGET}%`, tone: recovery >= RECOVERY_TARGET ? 'good' : 'bad' }} gauge={recovery === null ? undefined : { value: recovery, target: RECOVERY_TARGET }} sub={`${brl(model.recoveryCohort.recovered)} de ${brl(model.recoveryCohort.openingBalance)}`} onOpen={() => open('debt')} />
        </div>
        <Tile title="Arrecadação mês a mês" note="Barras: últimos 12 meses. Linha: mesmos meses do ano anterior. Percentual sobre a barra: variação." className="t-tall">
          <ReceiptsChart data={data} tokens={tokens} onOpen={() => open('receipts')} />
        </Tile>
        <Tile title="Dívida por idade" note="Quanto mais antiga, mais difícil de receber: priorize a faixa de 31 a 365 dias.">
          <AgingChart rows={extra.aging} tokens={tokens} onOpen={() => open('debt')} />
        </Tile>
      </section>

      {/* ===== 2. Base e conformidade: quantas empresas temos, quantas deveriam estar e se cumprem a exigência de RT ===== */}
      <section className="group" aria-labelledby="g-base">
        <h2 className="group-title" id="g-base"><Building2 size={15} />Base e conformidade</h2>
        <div className="cluster">
          <Metric label="Empresas registradas" value={(model.metrics.base.value ?? 0).toLocaleString('pt-BR')} chip={data.total.growth === null ? null : { text: `${data.total.growth >= 0 ? '+' : ''}${pct(data.total.growth)} no período`, tone: data.total.growth >= 0 ? 'good' : 'bad', arrow: data.total.growth >= 0 ? 'up' : 'down' }} spark={history.monthly.map(row => row.base)} color={tokens.blue} onOpen={() => open('base')} />
          <Metric label="CNPJs sem registro" value={data.total.gap.toLocaleString('pt-BR')} chip={data.ticket === null ? null : { text: `potencial ${brl(data.total.gap * data.ticket)}/ano`, tone: 'neutral' }} sub={`${outside.toLocaleString('pt-BR')} empresas fora do registro`} onOpen={() => open('gap')} />
          <Metric label="Empresas sem RT" value={data.total.noRt.toLocaleString('pt-BR')} chip={data.total.noRtRate === null ? null : { text: `${pct(data.total.noRtRate, 0)} das ativas`, tone: data.total.noRtRate > 20 ? 'bad' : 'neutral' }} sub="responsável técnico não identificado" onOpen={() => open('noRt')} />
        </div>
        <Tile title="Base de empresas e projeção" note={`${(extra.bridge.newcomers + extra.bridge.returning).toLocaleString('pt-BR')} entradas e ${extra.bridge.exits.toLocaleString('pt-BR')} saídas no período. Faixa amarela: projeção de 6 meses no ritmo recente.`} badge={<span className="chip-ai"><Sparkles size={11} />previsão</span>}>
          <BaseChart history={history} forecast={extra.forecast} tokens={tokens} period={period} onOpen={() => open('base')} />
        </Tile>
        <Tile title="Funil de conformidade" note="Empresas com atividade de engenharia: quantas estão registradas e, dessas, quantas têm RT. Clique num bloco para ver as empresas." className="t-tall">
          <FlowChart flow={extra.flow} tokens={tokens} onOpen={open} />
        </Tile>
      </section>

      {/* ===== 3. Onde agir: o território junta os indicadores acima; fiscalização é a ação de campo ===== */}
      <section className="group" aria-labelledby="g-onde">
        <h2 className="group-title" id="g-onde"><MapPin size={15} />Onde agir</h2>
        <div className="cluster">
          <Metric label="Fiscalizações em aberto" value={data.total.openCases.toLocaleString('pt-BR')} chip={data.total.oldRate === null ? null : { text: `${pct(data.total.oldRate, 0)} há mais de 1 ano`, tone: data.total.oldRate > 30 ? 'bad' : 'neutral' }} sub={`${data.total.oldCases.toLocaleString('pt-BR')} casos antigos`} onOpen={() => open('cases')} />
          <Metric label="Prazo mediano de CAO" value={extra.cao.median === null ? '—' : `${Math.round(extra.cao.median)} dias`} chip={extra.cao.median === null ? null : { text: extra.cao.median <= 90 ? 'até 90 dias' : 'acima de 90 dias', tone: extra.cao.median <= 90 ? 'good' : 'bad' }} sub={`${extra.cao.queue.reduce((total, row) => total + row.count, 0).toLocaleString('pt-BR')} pedidos aguardando`} />
        </div>
        <Tile title="Mapa de atuação" note={lenses[lens].read} className="t-map" actions={<div className="seg" role="radiogroup" aria-label="Indicador do mapa">{(Object.keys(lenses) as LensId[]).map(id => <button key={id} role="radio" aria-checked={lens === id} className={lens === id ? 'on' : ''} onClick={() => setLens(id)}>{lenses[id].label}</button>)}</div>}>
          <LensMap rows={data.cities} lens={lens} tokens={tokens} onCity={row => open(lenses[lens].detail, { level: 'city', id: row.id, name: row.name })} />
          <GreRanking rows={data.areas} lens={lens} selected={gre} onFilter={id => change(() => setGre(previous => previous === id ? '' : id))} onOpen={row => open(lenses[lens].detail, { level: 'gre', id: row.id, name: short(row.name) })} />
        </Tile>
      </section>
    </main>
    <footer className="foot">Valores internos fictícios, gerados para demonstrar o modelo: a variação de arrecadação e a parcela sem RT são altas por efeito do gerador, não de dados reais. Empresas contadas por CNPJ raiz; "CNPJs sem registro" conta estabelecimentos.</footer>
    {detail && <DetailPanel detail={detail} scope={scope} model={model} history={history} data={data} tokens={tokens} onClose={() => setDetail(null)} />}
  </div>;
}

/* ---------- Blocos ---------- */
function Tile({ title, note, children, className, actions, badge }: { title: string; note: string; children: ReactNode; className?: string; actions?: ReactNode; badge?: ReactNode }) {
  return <section className={`tile ${className ?? ''}`} aria-label={title}>
    <header><div><h3>{title}{badge}</h3><p>{note}</p></div>{actions}</header>
    <div className="tile-body">{children}</div>
  </section>;
}
interface Chip { text: string; tone: 'good' | 'bad' | 'neutral'; arrow?: 'up' | 'down' }
function Metric({ label, value, chip, spark, color, sub, gauge, onOpen }: { label: string; value: string; chip: Chip | null; spark?: number[]; color?: string; sub?: string; gauge?: { value: number; target: number }; onOpen?: () => void }) {
  const Arrow = chip?.arrow === 'down' ? ArrowDownRight : ArrowUpRight;
  const body = <>
    <span className="m-label">{label}</span>
    <span className="m-row"><strong>{value}</strong>{spark && spark.length > 1 && color && <Spark values={spark} color={color} />}{gauge && <Ring value={gauge.value} target={gauge.target} />}</span>
    {chip ? <span className={`chip is-${chip.tone}`}>{chip.arrow && <Arrow size={12} />}{chip.text}</span> : <span />}
    {sub && <span className="m-sub">{sub}</span>}
  </>;
  return onOpen ? <button className="metric" onClick={onOpen} title={`${label} · ver detalhe e empresas`}>{body}</button> : <div className="metric">{body}</div>;
}
function Ring({ value, target }: { value: number; target: number }) {
  const radius = 15, length = 2 * Math.PI * radius, angle = (target / 100) * 360 - 90;
  return <svg className="ring" viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r={radius} fill="none" stroke="var(--soft)" strokeWidth="5" />
    <circle cx="20" cy="20" r={radius} fill="none" stroke={value >= target ? 'var(--good)' : 'var(--accent)'} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${Math.min(100, value) / 100 * length} ${length}`} transform="rotate(-90 20 20)" />
    <line x1={20 + Math.cos(angle * Math.PI / 180) * 10} y1={20 + Math.sin(angle * Math.PI / 180) * 10} x2={20 + Math.cos(angle * Math.PI / 180) * 20} y2={20 + Math.sin(angle * Math.PI / 180) * 20} stroke="var(--ink)" strokeWidth="1.5" />
  </svg>;
}

/* ---------- Receita ---------- */
function ReceiptsChart({ data, tokens, onOpen }: { data: PanelData; tokens: Tokens; onOpen: () => void }) {
  const option = useMemo(() => ({
    grid: { top: 30, right: 6, bottom: 4, left: 4, containLabel: true },
    legend: { top: 0, right: 0, itemWidth: 12, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 11 } },
    tooltip: { trigger: 'axis', formatter: (items: any[]) => { const row = data.monthly[items[0].dataIndex]; const delta = row.previous ? (row.receipts - row.previous) / row.previous * 100 : null; return `<b>${monthLabel(row.month)}/${row.month.slice(2, 4)}</b><br/>Recebido: ${money(row.receipts)}<br/>Um ano antes: ${row.previous === null ? '—' : money(row.previous)}${delta === null ? '' : `<br/><b>${delta >= 0 ? '+' : ''}${pct(delta, 0)}</b>`}`; } },
    xAxis: { type: 'category', data: data.monthly.map(row => monthLabel(row.month)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: (value: number) => value.toLocaleString('pt-BR', { notation: 'compact' }) } },
    series: [
      { name: 'Últimos 12 meses', type: 'bar', barWidth: '56%', data: data.monthly.map(row => row.receipts), itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#FFD148' }, { offset: 1, color: tokens.accent }] }, borderRadius: [5, 5, 0, 0] },
        label: { show: true, position: 'top', fontSize: 10, formatter: (item: any) => { const row = data.monthly[item.dataIndex]; if (!row.previous) return ''; const delta = (row.receipts - row.previous) / row.previous * 100; return `{${delta >= 0 ? 'g' : 'r'}|${delta >= 0 ? '▲' : '▼'}${Math.abs(delta).toFixed(0)}%}`; }, rich: { g: { color: tokens.good, fontWeight: 700, fontSize: 10 }, r: { color: tokens.bad, fontWeight: 700, fontSize: 10 } } } },
      { name: 'Ano anterior', type: 'line', data: data.monthly.map(row => row.previous), smooth: 0.3, symbol: 'circle', symbolSize: 5, lineStyle: { color: tokens.brand, width: 2, type: [5, 4] }, itemStyle: { color: tokens.brand } },
    ],
  }), [data, tokens]);
  return <Chart option={option} tokens={tokens} label="Arrecadação mensal comparada ao ano anterior" onPick={onOpen} />;
}
function AgingChart({ rows, tokens, onOpen }: { rows: { name: string; value: number }[]; tokens: Tokens; onOpen: () => void }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;
  const option = useMemo(() => ({
    grid: { top: 2, right: 92, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>${items[0].name}</b><br/>${money(items[0].value)} · ${pct(items[0].value / total * 100, 0)} do saldo` },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.name), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [{ type: 'bar', barWidth: 14, data: rows.map((row, index) => ({ value: row.value, itemStyle: { borderRadius: 7, color: [tokens.blue, tokens.blue, tokens.accent, '#E0AB0C', tokens.bad][index] ?? tokens.bad } })),
      label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, formatter: (item: any) => `${brl(item.value)}  ·  ${pct(item.value / total * 100, 0)}` }, showBackground: true, backgroundStyle: { color: tokens.soft, borderRadius: 7 } }],
  }), [rows, tokens, total]);
  return <Chart option={option} tokens={tokens} label="Saldo vencido por idade da dívida" onPick={onOpen} />;
}

/* ---------- Base e conformidade ---------- */
function BaseChart({ history, forecast, tokens, period, onOpen }: { history: ReturnType<typeof buildEnterpriseModel>; forecast: ReturnType<typeof holtForecast>; tokens: Tokens; period: number; onOpen: () => void }) {
  const option = useMemo(() => {
    const months = history.monthly.map(row => row.month), actual = history.monthly.map(row => row.base), last = actual.at(-1)!;
    const future = forecast.forecast.map((_, step) => { const [year, month] = months.at(-1)!.split('-').map(Number); return new Date(Date.UTC(year, month + step, 1)).toISOString().slice(0, 7); });
    const labels = [...months, ...future].map(value => `${monthLabel(value)}/${value.slice(2, 4)}`), pad = actual.slice(1).map(() => null);
    return {
      grid: { top: 12, right: 10, bottom: 2, left: 4, containLabel: true },
      tooltip: { trigger: 'axis', formatter: (items: any[]) => `<b>${items[0].axisValueLabel}</b><br/>${items.filter(item => item.value !== null && item.value !== undefined && !String(item.seriesName).startsWith('faixa')).map(item => `${item.marker}${item.seriesName}: ${Math.round(Number(item.value)).toLocaleString('pt-BR')}`).join('<br/>')}` },
      xAxis: { type: 'category', data: labels, boundaryGap: false, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, interval: 5 } },
      yAxis: { type: 'value', scale: true, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
      series: [
        { name: 'Empresas ativas', type: 'line', data: [...actual, ...future.map(() => null)], smooth: 0.3, showSymbol: false, lineStyle: { color: tokens.brand, width: 2.5 }, itemStyle: { color: tokens.brand },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: tokens.heat[1] }, { offset: 1, color: 'rgba(0,0,0,0)' }] }, opacity: 0.5 },
          markArea: { silent: true, itemStyle: { color: tokens.soft, opacity: 0.6 }, data: [[{ xAxis: labels[Math.max(0, months.length - period)] }, { xAxis: labels[months.length - 1] }]] } },
        { name: 'faixa-base', type: 'line', stack: 'faixa', data: [...pad, last, ...forecast.lower], lineStyle: { opacity: 0 }, symbol: 'none', silent: true },
        { name: 'faixa', type: 'line', stack: 'faixa', data: [...pad, 0, ...forecast.upper.map((value, step) => value - forecast.lower[step])], lineStyle: { opacity: 0 }, symbol: 'none', areaStyle: { color: tokens.accent, opacity: 0.22 }, silent: true },
        { name: 'Projeção', type: 'line', data: [...pad, last, ...forecast.forecast], symbol: 'circle', symbolSize: 5, lineStyle: { color: tokens.accent, width: 2.5, type: [6, 4] }, itemStyle: { color: tokens.accent } },
      ],
    };
  }, [history, forecast, tokens, period]);
  return <Chart option={option} tokens={tokens} label="Empresas com registro ativo, 24 meses e projeção" onPick={onOpen} />;
}
function FlowChart({ flow, tokens, onOpen }: { flow: ReturnType<typeof complianceFlow>; tokens: Tokens; onOpen: (id: IndicatorId) => void }) {
  const nodes = flow.nodes.filter(node => !node.name.includes('ART')), links = flow.links.filter(link => !link.target.includes('ART'));
  const colors: Record<string, string> = { 'Universo empresarial': tokens.brand, 'Registro vigente': tokens.blue, 'Só histórico': tokens.accent, 'Nunca registrada': tokens.bad, 'Com RT': tokens.good, 'RT não identificado': tokens.bad };
  const names: Record<string, string> = { 'Universo empresarial': 'Empresas de engenharia', 'Registro vigente': 'Registradas', 'Só histórico': 'Registro inativo', 'Nunca registrada': 'Nunca registradas', 'Com RT': 'Com RT', 'RT não identificado': 'Sem RT' };
  const total = nodes[0]?.value || 1;
  const target: Record<string, IndicatorId> = { 'Só histórico': 'gap', 'Nunca registrada': 'gap', 'RT não identificado': 'noRt', 'Com RT': 'base', 'Registro vigente': 'base', 'Universo empresarial': 'gap' };
  const option = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (item: any) => item.dataType === 'edge' ? `${names[item.data.source]} → ${names[item.data.target]}<br/><b>${item.data.value.toLocaleString('pt-BR')}</b> empresas` : `<b>${names[item.name]}</b><br/>${item.value.toLocaleString('pt-BR')} empresas · ${pct(item.value / total * 100, 0)}` },
    series: [{ type: 'sankey', nodeAlign: 'left', left: 2, right: 118, top: 6, bottom: 6, nodeWidth: 14, nodeGap: 14, draggable: false, emphasis: { focus: 'adjacency' },
      data: nodes.map(node => ({ name: node.name, value: node.value, itemStyle: { color: colors[node.name], borderWidth: 0 } })), links,
      lineStyle: { color: 'gradient', opacity: 0.28, curveness: 0.5 },
      label: { color: tokens.ink, formatter: (item: any) => `{n|${names[item.name]}}\n{v|${item.value.toLocaleString('pt-BR')} · ${pct(item.value / total * 100, 0)}}`, rich: { n: { fontWeight: 700, fontSize: 12, color: tokens.ink }, v: { fontSize: 11, color: tokens.muted, padding: [2, 0, 0, 0] } } } }],
  }), [flow, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Funil de conformidade: registro e responsável técnico" onPick={item => { const name = item.dataType === 'edge' ? item.data.target : item.name; if (target[name]) onOpen(target[name]); }} />;
}

/* ---------- Onde agir: mapa com lente e ranking das regionais ---------- */
function LensMap({ rows, lens, tokens, onCity }: { rows: AreaRow[]; lens: LensId; tokens: Tokens; onCity: (row: AreaRow) => void }) {
  const centroids = useSpMap(), config = lenses[lens];
  const option = useMemo(() => {
    const points = rows.map(row => ({ row, ...config.get(row), at: centroids?.get(row.name) })).filter(point => point.at && point.volume > 0);
    const maxVolume = Math.max(1, ...points.map(point => point.volume));
    const ramp = [tokens.good, tokens.accent, tokens.bad];
    const rates = points.map(point => point.rate).filter((value): value is number => value !== null);
    const [minRate, maxRate] = rates.length ? [Math.floor(Math.min(...rates)), Math.ceil(Math.max(...rates))] : [0, 100];
    const ranked = [...points].sort((a, b) => b.volume - a.volume).slice(0, 5).map(point => point.row.id);
    return {
      tooltip: { trigger: 'item', formatter: (item: any) => { const point = points.find(entry => entry.row.name === item.name); if (!point) return `${item.name}<br/><span style="opacity:.75">fora da amostra demonstrativa</span>`; return `<b>${point.row.name}</b><br/>${config.formatVolume(point.volume)} · ${config.problem}<br/>${point.rate === null ? '—' : pct(point.rate, 0)} ${config.rate}<br/><span style="opacity:.75">clique para ver as empresas</span>`; } },
      geo: { map: 'spPainel', roam: true, scaleLimit: { min: 1, max: 6 }, left: 0, right: 0, top: 0, bottom: 26, silent: true, itemStyle: { areaColor: tokens.soft, borderColor: tokens.line, borderWidth: 0.4 } },
      visualMap: { type: 'continuous', dimension: 3, seriesIndex: 0, min: minRate, max: Math.max(maxRate, minRate + 1), calculable: false, orient: 'horizontal', left: 0, bottom: 0, itemWidth: 9, itemHeight: 110, text: [`${maxRate}%`, `${minRate}%`], textStyle: { color: tokens.muted, fontSize: 10 }, inRange: { color: ramp } },
      series: [{ type: 'scatter', coordinateSystem: 'geo', data: points.map(point => ({ name: point.row.name, value: [...point.at!, point.volume, point.rate ?? 0] })),
        symbolSize: (value: number[]) => 8 + Math.sqrt(value[2] / maxVolume) * 34, itemStyle: { opacity: 0.85, borderColor: tokens.surface, borderWidth: 1.5 }, emphasis: { scale: 1.2, label: { show: true } },
        label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, fontWeight: 700, formatter: (item: any) => ranked.includes(points.find(point => point.row.name === item.name)?.row.id ?? '') ? item.name : '' }, labelLayout: { hideOverlap: true } }],
    };
  }, [rows, config, centroids, tokens]);
  return <div className="map-box">{centroids ? <Chart option={option} tokens={tokens} label={`Mapa: ${config.problem} e % ${config.rate} por município`} onPick={item => { const row = rows.find(city => city.name === item.name); if (row) onCity(row); }} /> : <div className="loading">Carregando mapa…</div>}
    <p className="map-key"><span className="key-size" />tamanho: {config.problem}<span className="key-color" />cor: % {config.rate}</p></div>;
}
function GreRanking({ rows, lens, selected, onFilter, onOpen }: { rows: AreaRow[]; lens: LensId; selected: string; onFilter: (id: string) => void; onOpen: (row: AreaRow) => void }) {
  const config = lenses[lens];
  const ranked = rows.map(row => ({ row, ...config.get(row) })).filter(item => item.volume > 0).sort((a, b) => b.volume - a.volume);
  const max = Math.max(1, ...ranked.map(item => item.volume));
  const rates = ranked.map(item => item.rate).filter((value): value is number => value !== null), average = rates.length ? rates.reduce((total, value) => total + value, 0) / rates.length : null;
  return <div className="ranking"><p className="ranking-head"><span>Regionais por {config.problem}</span><span>% {config.rate}</span></p>
    <ol>{ranked.map(item => {
      const high = average !== null && item.rate !== null && item.rate > average;
      return <li key={item.row.id} className={selected === item.row.id ? 'is-selected' : ''}>
        <button className="r-name" onClick={() => onFilter(item.row.id)} title={selected === item.row.id ? 'Remover filtro' : 'Filtrar a página por esta regional'}><b>{item.row.id.replace('GRE', '')}</b>{short(item.row.name)}</button>
        <button className="r-bar" onClick={() => onOpen(item.row)} title="Ver empresas desta regional"><i className={high ? 'is-bad' : ''} style={{ width: `calc((100% - 120px) * ${item.volume / max})` }} /><span>{config.formatVolume(item.volume)}</span><small className={high ? 'is-bad' : ''}>{item.rate === null ? '—' : pct(item.rate, 0)}</small></button>
      </li>;
    })}</ol>{average !== null && <p className="ranking-foot">Barra vermelha: proporção acima da média das regionais ({pct(average, 0)}).</p>}</div>;
}
