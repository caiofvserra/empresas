import { useEffect, useMemo, useState, useTransition } from 'react';
import type { ComponentType } from 'react';
import { ArrowDownToLine, ArrowUpRight, Building2, Database, Globe2, LayoutDashboard, Map as MapIcon, Moon, Search, Sun, Target, Wallet, Workflow, X } from 'lucide-react';
import { dataset } from '../domain/dataset';
import { defaultFilters } from '../domain/types';
import type { Filters } from '../domain/types';
import MultiSelect from '../components/MultiSelect';
import { EngineeringEmblem } from '../components/EngineeringIdentity';
import { selectEnterpriseScope } from '../enterprise-v10/filters';
import { buildEnterpriseModel } from '../enterprise-v10/model';
import { downloadCsv } from '../enterprise-v10/download';
import { exportEnterpriseCsv } from '../enterprise-v10/export';
import EnterpriseDialog from '../enterprise-v10/EnterpriseDialog';
import EnterpriseRecords from '../enterprise-v10/EnterpriseRecords';
import EnterpriseCompanyDrawer from '../enterprise-v10/EnterpriseCompanyDrawer';
import type { CockpitContext, PageId } from './context';
import { buildKpis, caoService, complianceFlow, debtRows, decompose, defaultTargets, greScorecard, holtForecast, narrative, stockBridge } from './metrics';
import type { Targets } from './metrics';
import { loadMacro, loadPublicContext, loadSpPopulation } from './public-data';
import type { MacroSeries, PublicContext, Sourced } from './public-data';
import { ExecutivePage, TerritoryPage } from './ExecutiveTerritory';
import { OperationsPage, PortfolioPage, PublicPage } from './PortfolioOperationsPublic';
import { FreshnessBadge, Segmented, fmt, palette } from './widgets';
import '../enterprise-v11/DetailSurfaces.css';
import '../enterprise-v11/IntegratedIntelligence.css';
import './cockpit.css';

const pages: { id: PageId; label: string; title: string; subtitle: string; icon: ComponentType<{ size?: number }>; Page: ComponentType<{ ctx: CockpitContext }> }[] = [
  { id: 'executive', label: 'Executiva', title: 'Visão executiva', subtitle: 'Base, arrecadação, conformidade e desempenho das GREs', icon: LayoutDashboard, Page: ExecutivePage },
  { id: 'territory', label: 'Território', title: 'Território', subtitle: 'Onde a presença do CREA-SP cresce, recua ou tem lacuna', icon: MapIcon, Page: TerritoryPage },
  { id: 'portfolio', label: 'Carteira', title: 'Carteira e arrecadação', subtitle: 'Dívida, recuperação e priorização da atuação', icon: Wallet, Page: PortfolioPage },
  { id: 'operations', label: 'Operação', title: 'Operação', subtitle: 'Fiscalização, CAO, ART e qualidade cadastral', icon: Workflow, Page: OperationsPage },
  { id: 'public', label: 'Contexto', title: 'Contexto público', subtitle: 'Dados públicos reais: Confea, IBGE, PNCP, BCB e Transparência', icon: Globe2, Page: PublicPage },
];
const STORAGE = 'crea-cockpit-v14';
const sizes = ['Microempresa', 'Pequena empresa', 'Média empresa', 'Grande empresa'];
const usedCnaes = new Set(dataset.establishments.flatMap(row => [row.cnaeMain, ...row.cnaeSecondary]));
const read = <T,>(key: string, fallback: T): T => { try { const raw = localStorage.getItem(`${STORAGE}-${key}`); return raw ? { ...fallback, ...JSON.parse(raw) } : fallback; } catch { return fallback; } };
const write = (key: string, value: unknown) => { try { localStorage.setItem(`${STORAGE}-${key}`, JSON.stringify(value)); } catch { /* URL mantém o estado */ } };
function restoreFilters(): Filters {
  try {
    const params = new URLSearchParams(location.search), raw = params.get('f'), value = raw ? JSON.parse(raw) : read<Partial<Filters>>('filters', {});
    const list = (item: unknown) => Array.isArray(item) ? item.filter(entry => typeof entry === 'string') : [];
    return { ...defaultFilters, greIds: list(value.greIds), cityIds: list(value.cityIds), cnaeCodes: list(value.cnaeCodes), sizes: list(value.sizes), search: typeof value.search === 'string' ? value.search : '', period: [3, 6, 12, 24].includes(value.period) ? value.period : 12 };
  } catch { return { ...defaultFilters }; }
}
const initialPage = (): PageId => { const page = new URLSearchParams(location.search).get('p'); return pages.some(item => item.id === page) ? page as PageId : 'executive'; };
const initialDark = () => { try { const saved = localStorage.getItem(`${STORAGE}-theme`); return saved ? saved === 'dark' : window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false; } catch { return false; } };

export default function Cockpit() {
  const [filters, setFilters] = useState<Filters>(restoreFilters);
  const [page, setPage] = useState<PageId>(initialPage);
  const [selection, setSelection] = useState<{ ids: string[]; label: string } | null>(null);
  const [profile, setProfile] = useState('admin');
  const [dark, setDark] = useState(initialDark);
  const [targets, setTargets] = useState<Targets>(() => read('targets', defaultTargets));
  const [focus, setFocus] = useState<string | null>(null);
  const [modal, setModal] = useState<'records' | 'sources' | 'targets' | null>(null);
  const [company, setCompany] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [publicData, setPublicData] = useState<PublicContext | null>(null);
  const [macro, setMacro] = useState<Sourced<MacroSeries[]> | null>(null);
  const [population, setPopulation] = useState<Sourced<{ year: string; value: number }> | null>(null);
  const [pending, transition] = useTransition();
  const theme = useMemo(() => palette(dark), [dark]);

  const effective = useMemo(() => ({ ...filters, greIds: profile === 'regional' ? ['GRE2'] : filters.greIds }), [filters, profile]);
  const base = useMemo(() => selectEnterpriseScope(dataset, effective), [effective]);
  const scope = useMemo(() => selection ? selectEnterpriseScope(dataset, effective, selection.ids) : base, [base, effective, selection]);
  const historyScope = useMemo(() => effective.period === 24 ? scope : selectEnterpriseScope(dataset, { ...effective, period: 24 }, selection?.ids), [effective, scope, selection]);
  const model = useMemo(() => buildEnterpriseModel(scope), [scope]);
  const history = useMemo(() => buildEnterpriseModel(historyScope), [historyScope]);
  const derived = useMemo(() => {
    const kpis = buildKpis(model, history, scope, targets), bridge = stockBridge(model, scope), flow = complianceFlow(model, scope);
    const forecast = holtForecast(history.monthly.map(row => row.base)), gres = greScorecard(model, history, scope), debt = debtRows(model, scope);
    const insights = narrative(kpis, bridge, gres, forecast, decompose(debt, 'gre'), targets, caoService(scope));
    return { kpis, bridge, flow, forecast, gres, debt, insights };
  }, [model, history, scope, targets]);

  const financialAllowed = profile === 'admin', canExport = profile !== 'viewer';
  const select = (ids: string[], label: string) => transition(() => { const valid = [...new Set(ids)].filter(id => base.companyIds.has(id)); if (valid.length) setSelection({ ids: valid, label }); });
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => transition(() => setFilters(previous => ({ ...previous, [key]: value, ...(key === 'greIds' ? { cityIds: [] } : {}) })));
  const dimension = (key: 'greIds' | 'cityIds' | 'cnaeCodes', ids: string[]) => update(key, effective[key].length === ids.length && ids.every(id => effective[key].includes(id)) ? [] : ids);
  const clear = () => transition(() => { setFilters({ ...defaultFilters }); setSelection(null); });

  useEffect(() => { write('filters', filters); const params = new URLSearchParams(); params.set('p', page); params.set('f', JSON.stringify(filters)); window.history.replaceState(null, '', `${location.pathname}?${params}`); }, [filters, page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { try { localStorage.setItem(`${STORAGE}-theme`, dark ? 'dark' : 'light'); } catch { /* sem persistência */ } document.documentElement.dataset.theme = dark ? 'dark' : 'light'; }, [dark]);
  useEffect(() => { write('targets', targets); }, [targets]);
  useEffect(() => { setFocus(null); }, [page]);
  useEffect(() => {
    let alive = true;
    loadPublicContext().then(value => { if (alive) setPublicData(value); });
    loadMacro().then(value => { if (alive) setMacro(value); });
    loadSpPopulation().then(value => { if (alive) setPopulation(value); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === 'Escape' && !modal && !company && !document.querySelector('[role="dialog"]')) setFocus(null);
      if (/^[1-5]$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey && !['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) && !modal) setPage(pages[Number(event.key) - 1].id);
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [modal, company]);

  const doExport = () => {
    try { downloadCsv(exportEnterpriseCsv(scope, model, { financial: financialAllowed, export: canExport }), `creasp-cockpit-${dataset.snapshotDate}.csv`); setMessage('CSV exportado com as empresas do recorte.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível exportar.'); }
  };
  const current = pages.find(item => item.id === page)!;
  const ctx: CockpitContext = { theme, scope, historyScope, model, history, ...derived, targets, financialAllowed, period: effective.period, publicData, macro, population, select, openCompany: setCompany, dimension, focus, toggleFocus: id => setFocus(previous => previous === id ? null : id) };
  const pills = [
    ...effective.greIds.map(id => ({ key: `g${id}`, label: dataset.gres.find(row => row.id === id)?.name ?? id, remove: profile === 'regional' ? undefined : () => update('greIds', effective.greIds.filter(item => item !== id)) })),
    ...effective.cityIds.map(id => ({ key: `c${id}`, label: dataset.cities.find(row => row.id === id)?.name ?? id, remove: () => update('cityIds', effective.cityIds.filter(item => item !== id)) })),
    ...effective.cnaeCodes.map(code => ({ key: `n${code}`, label: `CNAE ${code}`, remove: () => update('cnaeCodes', effective.cnaeCodes.filter(item => item !== code)) })),
  ];
  const ticker = derived.insights.filter(item => financialAllowed || !/arrecad|saldo vencido/.test(item.text));

  return <div className={`ck-app ${dark ? 'is-dark' : ''}`} data-theme={dark ? 'dark' : 'light'}>
    <nav className="ck-rail" aria-label="Páginas do painel">
      <div className="ck-rail-logo" title="CREA-SP"><EngineeringEmblem /></div>
      {pages.map((item, index) => <button key={item.id} className={page === item.id ? 'on' : ''} aria-current={page === item.id ? 'page' : undefined} onClick={() => setPage(item.id)} title={`${item.title} (tecla ${index + 1})`}><item.icon size={19} /><span>{item.label}</span></button>)}
      <div className="ck-rail-bottom">
        <button onClick={() => setModal('targets')} title="Metas da gestão (parâmetros)"><Target size={18} /><span>Metas</span></button>
        <button onClick={() => setModal('sources')} title="Fontes, atualização e limites"><Database size={18} /><span>Fontes</span></button>
        <button onClick={() => setDark(value => !value)} aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'} title={dark ? 'Tema claro' : 'Tema escuro'}>{dark ? <Sun size={18} /> : <Moon size={18} />}<span>{dark ? 'Claro' : 'Escuro'}</span></button>
      </div>
    </nav>
    <div className="ck-main">
      <header className="ck-header">
        <div className="ck-title"><span className="ck-eyebrow">CREA-SP · COCKPIT DE GESTÃO EMPRESARIAL</span><h1>{current.title}</h1><p>{current.subtitle}</p></div>
        <div className="ck-pulse" aria-label="Destaques do período" aria-live="polite"><span className="ck-pulse-dot" /><div className="ck-pulse-track">{[...ticker, ...ticker].map((item, index) => <span key={index} className={`is-${item.tone}`} aria-hidden={index >= ticker.length}><b>{item.strong}</b> {item.text}</span>)}</div></div>
        <div className="ck-header-meta">
          <span className="ck-source-chip"><i className="is-demo" />Interno demonstrativo</span>
          <span className="ck-source-chip"><i className="is-real" />Público real</span>
          <span className="ck-cut">CORTE<strong>{new Date(`${dataset.snapshotDate}T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '').toLocaleUpperCase('pt-BR')}</strong></span>
          <select aria-label="Perfil de acesso demonstrativo" value={profile} onChange={event => { setProfile(event.target.value); setSelection(null); setFilters(previous => ({ ...previous, cityIds: [] })); }}><option value="admin">Administração</option><option value="regional">GRE2 · regional</option><option value="viewer">Consulta</option></select>
          <button className="ck-icon-btn" aria-label="Exportar recorte em CSV" title="Exportar empresas do recorte" disabled={!canExport} onClick={doExport}><ArrowDownToLine size={16} /></button>
        </div>
      </header>
      <section className="ck-filters" aria-label="Segmentações">
        <MultiSelect label="GRE" options={dataset.gres.filter(row => profile !== 'regional' || row.id === 'GRE2').map(row => ({ value: row.id, label: row.name }))} value={effective.greIds} onChange={value => update('greIds', value)} />
        <MultiSelect label="Município" options={dataset.cities.filter(row => !effective.greIds.length || effective.greIds.includes(row.greId)).map(row => ({ value: row.id, label: row.name }))} value={effective.cityIds} onChange={value => update('cityIds', value)} />
        <MultiSelect label="CNAE" options={dataset.cnaes.filter(row => usedCnaes.has(row.code)).map(row => ({ value: row.code, label: `${row.code} · ${row.label}`, meta: row.originalClassification }))} value={effective.cnaeCodes} onChange={value => update('cnaeCodes', value)} />
        <div className="ck-chipset" role="group" aria-label="Porte">{sizes.map(size => <button key={size} aria-pressed={filters.sizes.includes(size)} className={filters.sizes.includes(size) ? 'on' : ''} onClick={() => update('sizes', filters.sizes.includes(size) ? filters.sizes.filter(item => item !== size) : [...filters.sizes, size])}>{size.replace(' empresa', '').replace('empresa', '')}</button>)}</div>
        <Segmented label="Janela de análise" value={filters.period} onChange={value => update('period', value)} options={[3, 6, 12, 24].map(value => ({ value, label: `${value}m` }))} />
        <label className="ck-search"><Search size={14} /><input aria-label="Pesquisar empresa ou CNPJ" placeholder="Empresa ou CNPJ" value={filters.search} onChange={event => update('search', event.target.value)} /></label>
        <button className="ck-clear" onClick={clear} title="Limpar filtros e seleção"><X size={14} />Limpar</button>
      </section>
      {pills.length === 0 && !selection ? <div className="ck-pills-empty" /> : <div className="ck-pills" aria-label="Filtros ativos">
        {pills.map(pill => <span key={pill.key} className="ck-pill">{pill.label}{pill.remove && <button aria-label={`Remover ${pill.label}`} onClick={pill.remove}><X size={11} /></button>}</span>)}
        {selection && <span className="ck-pill is-selection" title="Seleção cruzada aplicada a todas as páginas">Seleção: {selection.label} · {fmt.int(selection.ids.length)}<button aria-label="Remover seleção" onClick={() => setSelection(null)}><X size={11} /></button></span>}
      </div>}
      <main className={`ck-page ck-page-${page} ${focus ? 'has-focus' : ''}`} aria-busy={pending} key={page}>
        {scope.companies.length ? <current.Page ctx={ctx} /> : <div className="ck-empty" role="status"><Search size={28} /><strong>Nenhuma empresa neste recorte</strong><p>Revise a pesquisa, os filtros ou a seleção.</p><button onClick={clear}>Limpar filtros</button></div>}
      </main>
      <footer className="ck-status">
        <span className={`ck-live ${pending ? 'is-busy' : ''}`} /><strong>{fmt.int(scope.companies.length)} empresas no recorte</strong>
        <span className="ck-status-note">{pending ? 'Recalculando…' : focus ? 'Modo foco · Esc para voltar' : `${model.metadata.start.split('-').reverse().join('/')} a ${model.metadata.end.split('-').reverse().join('/')} · teclas 1–5 trocam de página · clique nos visuais para filtrar`}</span>
        <a className="ck-legacy" href="?v=13">Versão V13</a>
        <button className="ck-explore" onClick={() => setModal('records')}><Building2 size={14} />Explorar empresas<ArrowUpRight size={14} /></button>
      </footer>
    </div>
    {modal && <EnterpriseDialog key={modal} title={modal === 'records' ? 'Empresas do recorte' : modal === 'targets' ? 'Metas da gestão' : 'Fontes, atualização e limites'} subtitle={modal === 'records' ? `${fmt.int(scope.companies.length)} empresas-raiz · ${selection?.label ?? current.title}` : modal === 'targets' ? 'Parâmetros usados nos cartões, no scorecard e na narrativa · salvos neste navegador' : 'Dados internos demonstrativos e dados públicos reais, com data de captura'} onClose={() => setModal(null)}>
      {modal === 'records' ? <EnterpriseRecords scope={scope} model={model} financialAllowed={financialAllowed} canExport={canExport} onCompany={id => { setModal(null); setCompany(id); }} onSelect={(ids, label) => { select(ids, label); setModal(null); }} />
        : modal === 'targets' ? <TargetsForm targets={targets} onChange={setTargets} />
        : <SourcesList publicData={publicData} macro={macro} population={population} />}
    </EnterpriseDialog>}
    {company && <EnterpriseCompanyDrawer companyId={company} scope={scope} model={model} financialAllowed={financialAllowed} onClose={() => setCompany(null)} />}
    {message && <div className="e10-toast" role="status">{message}<button aria-label="Fechar aviso" onClick={() => setMessage('')}><X size={15} /></button></div>}
  </div>;
}

function TargetsForm({ targets, onChange }: { targets: Targets; onChange: (value: Targets) => void }) {
  const fields: { key: keyof Targets; label: string; help: string }[] = [
    { key: 'coverage', label: 'Cobertura de registro (%)', help: 'CNPJs elegíveis com registro vigente' },
    { key: 'rtCoverage', label: 'Empresas com RT (%)', help: 'Empresas vigentes com responsável técnico identificado' },
    { key: 'compliance', label: 'Adimplência PJ (%)', help: 'Empresas cobradas sem saldo vencido' },
    { key: 'recovery', label: 'Recuperação da dívida (%)', help: 'Parcela da dívida de abertura recebida no período' },
  ];
  return <div className="ck-targets">{fields.map(field => <label key={field.key}><span><b>{field.label}</b><small>{field.help}</small></span>
    <input type="range" min={0} max={100} value={targets[field.key]} onChange={event => onChange({ ...targets, [field.key]: Number(event.target.value) })} aria-label={field.label} /><output>{targets[field.key]}%</output></label>)}
    <button className="ck-clear" onClick={() => onChange(defaultTargets)}>Restaurar metas padrão</button>
    <p className="ck-foot">Metas são parâmetros de leitura (equivalentes a parâmetros what-if do Power BI); não são metas oficiais do CREA-SP.</p></div>;
}

function SourcesList({ publicData, macro, population }: { publicData: PublicContext | null; macro: Sourced<MacroSeries[]> | null; population: Sourced<{ year: string; value: number }> | null }) {
  const external = publicData ? [publicData.ufs, publicData.spDecade, publicData.modalities, publicData.spending, publicData.management, publicData.pncp] : [];
  return <div className="ck-sources">
    <article><h3>Dados internos · demonstrativos</h3><p>Cadastro empresarial, estabelecimentos, registros, vínculos de RT, ARTs, CAOs, obrigações e pagamentos PJ, casos de fiscalização e eventos de qualidade cadastral. Cenário fictício reproduzível (semente {dataset.seed}); produção prevista via SQL Server e IBM Db2 pelo gateway on-premises.</p></article>
    <article><h3>Dados públicos reais</h3><ul>{[...external, ...(population ? [population] : []), ...(macro ? [macro] : [])].map(item => <li key={item.source}><FreshnessBadge freshness={item.freshness} date={item.capturedAt} /> <b>{item.source}</b>{item.url && <> · <a href={item.url} target="_blank" rel="noreferrer">origem</a></>}{item.note && <small> — {item.note}</small>}</li>)}</ul></article>
    <article><h3>Consultas ao vivo</h3><p>Ao abrir o painel, o navegador consulta o Banco Central (SGS: IPCA 433, INCC 192, Selic 432) e o IBGE (agregado 6579, população de SP). Se a API não responder, o painel usa o snapshot versionado ou exibe “indisponível” — nunca estima o valor.</p></article>
    <article><h3>Métodos</h3><p>Projeção: suavização de Holt (α 0,5; β 0,3) com faixa de 95% pelos resíduos; anomalia = resíduo acima de 2 desvios. Potencial de registro = CNPJs elegíveis sem vigência × mediana anual cobrada por empresa. Matriz de prioridade usa dois critérios visíveis, sem score composto.</p></article>
  </div>;
}
