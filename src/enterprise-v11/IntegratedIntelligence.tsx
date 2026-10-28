import { useEffect, useMemo, useState, useTransition } from 'react';
import { ArrowDownToLine, ArrowUpRight, BookOpen, CircleHelp, Database, Expand, Search, X } from 'lucide-react';
import { dataset } from '../domain/dataset';
import { defaultFilters } from '../domain/types';
import type { Filters } from '../domain/types';
import MultiSelect from '../components/MultiSelect';
import { EngineeringEmblem } from '../components/EngineeringIdentity';
import { downloadCsv } from '../enterprise-v10/download';
import { selectEnterpriseScope } from '../enterprise-v10/filters';
import { buildEnterpriseModel } from '../enterprise-v10/model';
import { buildEnterpriseAnalysis } from '../enterprise-v13/analysis';
import { enterpriseIndicators } from '../enterprise-v10/catalog';
import type { EnterpriseIndicatorDefinition } from '../enterprise-v10/catalog';
import type { EnterpriseMetric, MetricId } from '../enterprise-v10/types';
import EnterpriseDialog from '../enterprise-v10/EnterpriseDialog';
import EnterpriseRecords from '../enterprise-v10/EnterpriseRecords';
import EnterpriseCompanyDrawer from '../enterprise-v10/EnterpriseCompanyDrawer';
import { exportEnterpriseCsv } from '../enterprise-v10/export';
import IntegratedCharts from './IntegratedCharts';
import './DetailSurfaces.css';
import './IntegratedIntelligence.css';

const essentials: MetricId[] = ['base', 'coverage', 'rtCoverage', 'corporateActivity', 'convergentEvidence', 'publicDemand', 'compliance', 'receipts'];
const supporting: MetricId[] = ['retention', 'newMarket', 'rtContinuity', 'economicContext', 'supplierCoverage', 'contractTrace', 'overdue', 'recovery', 'observedEntry'];
const finance = new Set<MetricId>(['compliance', 'receipts', 'overdue', 'recovery']);
const integer = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const usedCnaes = new Set(dataset.establishments.flatMap(row => [row.cnaeMain, ...row.cnaeSecondary]));
const label = (id: MetricId) => enterpriseIndicators.find(row => row.id === id)!.name;
function display(metric: EnterpriseMetric): string {
  if (metric.value === null) return 'Sem base';
  if (metric.unit === 'currency') return `R$ ${metric.value.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })}`;
  if (metric.unit === 'percent') return `${number.format(metric.value)}%`;
  if (metric.unit === 'context') return 'Territorial';
  return integer.format(metric.value);
}
function restore(): Filters {
  try {
    const params = new URLSearchParams(location.search);
    const raw = ['11', '13'].includes(params.get('v') ?? '') ? params.get('f') : localStorage.getItem('crea-enterprise-v13-filters') ?? localStorage.getItem('crea-enterprise-v11-filters');
    const value = raw ? JSON.parse(raw) : {};
    return { ...defaultFilters, greIds: Array.isArray(value.greIds) ? value.greIds : [], cityIds: Array.isArray(value.cityIds) ? value.cityIds : [], cnaeCodes: Array.isArray(value.cnaeCodes) ? value.cnaeCodes : [], sizes: Array.isArray(value.sizes) ? value.sizes : [], search: typeof value.search === 'string' ? value.search : '', period: [3, 6, 12, 24].includes(value.period) ? value.period : 12 };
  } catch { return { ...defaultFilters }; }
}

export default function IntegratedIntelligence() {
  const [filters, setFilters] = useState<Filters>(restore);
  const [selection, setSelection] = useState<{ ids: string[]; label: string } | null>(null);
  const [profile, setProfile] = useState('admin');
  const [pending, transition] = useTransition();
  const [modal, setModal] = useState<'catalog' | 'sources' | 'records' | MetricId | null>(null);
  const [query, setQuery] = useState('');
  const [company, setCompany] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const effective = useMemo(() => ({ ...filters, greIds: profile === 'regional' ? ['GRE2'] : filters.greIds }), [filters, profile]);
  const base = useMemo(() => selectEnterpriseScope(dataset, effective), [effective]);
  const scope = useMemo(() => selection ? selectEnterpriseScope(dataset, effective, selection.ids) : base, [base, effective, selection]);
  const model = useMemo(() => buildEnterpriseModel(scope), [scope]);
  const analysis = useMemo(() => buildEnterpriseAnalysis(scope, model), [scope, model]);
  const financialAllowed = profile === 'admin', canExport = profile !== 'viewer';
  const choose = (ids: string[], name: string) => transition(() => setSelection({ ids: [...new Set(ids)].filter(id => base.companyIds.has(id)), label: name }));
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => transition(() => { setFilters(previous => ({ ...previous, [key]: value, ...(key === 'greIds' ? { cityIds: [] } : {}) })); });
  const dimension = (key: 'greIds' | 'cityIds' | 'cnaeCodes', ids: string[]) => update(key, effective[key].length === ids.length && ids.every(id => effective[key].includes(id)) ? [] : ids);
  const clear = () => { setFilters({ ...defaultFilters }); setSelection(null); };
  useEffect(() => {
    try { localStorage.setItem('crea-enterprise-v13-filters', JSON.stringify(filters)); } catch { /* URL persistence remains available. */ }
    const params = new URLSearchParams(); params.set('v', '13'); params.set('f', JSON.stringify(filters));
    history.replaceState(null, '', `${location.pathname}?${params}`);
  }, [filters]);
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key === 'Escape' && !modal && !company && !document.querySelector('[role="dialog"]')) setExpanded(null); }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [modal, company]);
  const doExport = () => {
    try { downloadCsv(exportEnterpriseCsv(scope, model, { financial: financialAllowed, export: canExport }), `creasp-empresas-${dataset.snapshotDate}.csv`); setMessage('CSV exportado com as empresas do recorte.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível exportar.'); }
  };
  const investigate = (id: MetricId) => { if (finance.has(id) && !financialAllowed) return; choose(model.metrics[id].companyIds, label(id)); };
  const definitions = enterpriseIndicators.filter(row => `${row.name} ${row.question} ${row.meaning} ${row.sources.join(' ')}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  const definition = (row: EnterpriseIndicatorDefinition) => {
    const metric = model.metrics[row.id], allowed = !finance.has(row.id) || financialAllowed;
    return <article className="e10-definition" data-indicator={row.id} key={row.id}>
      <header className="e10-definition-head"><div><span>INDICADOR {String(enterpriseIndicators.indexOf(row) + 1).padStart(2, '0')}</span><h3>{row.name}</h3><p className="v11-definition-question">{row.question}</p></div><strong>{allowed ? display(metric) : 'Restrito'}</strong></header>
      <p>{row.meaning}</p><dl className="e10-definition-grid">
        <div><dt>Decisão apoiada</dt><dd>{row.decision}</dd></div><div><dt>Como calcular</dt><dd>{row.formula}</dd></div>
        <div><dt>Origem do indicador</dt><dd>{row.origin}</dd></div><div><dt>Unidade e denominador</dt><dd>{row.unit}</dd></div><div><dt>Fontes dos dados</dt><dd>{row.sources.join(' · ')}</dd></div>
        <div><dt>Exemplo didático</dt><dd>{row.example}</dd></div><div><dt>Atualização proposta</dt><dd>{row.periodicity}</dd></div>
        <div><dt>Validação responsável</dt><dd>{row.validation}</dd></div><div><dt>Limites de interpretação</dt><dd>{row.limits}</dd></div>
      </dl><p className="e10-definition-note">{allowed ? metric.note : 'Informação financeira restrita ao perfil Administração nesta demonstração.'}</p>
      <button className="e10-link-action" disabled={!allowed || !metric.companyIds.length} onClick={() => { investigate(row.id); setModal('records'); }}>Investigar empresas relacionadas <ArrowUpRight size={14} /></button>
    </article>;
  };
  const metric = (id: MetricId) => {
    const item = model.metrics[id], allowed = !finance.has(id) || financialAllowed;
    const info = enterpriseIndicators.find(row => row.id === id)!;
    const denominatorUnit = id === 'rtContinuity' ? 'dias-empresa' : id === 'coverage' || id === 'supplierCoverage' || id === 'observedEntry' ? 'CNPJs' : id === 'contractTrace' ? 'contratos' : id === 'economicContext' ? 'empregos iniciais' : 'empresas';
    const unit = item.denominator !== undefined ? id === 'recovery' ? `Base: R$ ${item.denominator.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })}` : `Base: ${integer.format(item.denominator)} ${denominatorUnit}` : info.countLabel;
    return <article className="v11-metric" data-metric={id} key={id}><span className="v13-origin">{info.origin}</span>
      <div className="v11-metric-heading"><span title={enterpriseIndicators.find(row => row.id === id)!.name}>{label(id)}</span><button aria-label={`Definição de ${label(id)}`} title="Resumo, fórmula, fonte e exemplo" onClick={() => setModal(id)}><CircleHelp size={12} /></button></div>
      <button className="v11-metric-value" aria-label={`Investigar ${enterpriseIndicators.find(row => row.id === id)!.name}`} disabled={!allowed || !item.companyIds.length} title={allowed ? `${item.note} · Clique para selecionar as empresas relacionadas.` : 'Informação financeira interna restrita neste perfil.'} onClick={() => investigate(id)}><strong>{allowed ? display(item) : 'Restrito'}</strong></button>
      <small title={allowed ? item.note : 'Acesso restrito'}>{allowed ? unit : 'acesso restrito'}</small>
    </article>;
  };

  return <div className="v11-app">
    <header className="v11-header"><div className="v11-brand"><EngineeringEmblem /><strong>CREA-SP</strong></div><div className="v11-title"><h1>Panorama empresarial</h1><span>INTELIGÊNCIA INTEGRADA · SÃO PAULO</span></div><div className="v11-header-actions"><span className="v11-demo"><i /> DADOS DEMONSTRATIVOS</span><span className="v11-competence">CORTE<strong>{new Date(`${dataset.snapshotDate}T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).toLocaleUpperCase('pt-BR')}</strong></span><button aria-label="Catálogo dos 17 indicadores" title="Dicionário dos indicadores" onClick={() => { setQuery(''); setModal('catalog'); }}><BookOpen size={17} /></button><button aria-label="Fontes e limitações" title="Fontes, atualização e limites" onClick={() => setModal('sources')}><Database size={17} /></button><button aria-label="Exportar recorte empresarial CSV" title="Exportar empresas do recorte" disabled={!canExport} onClick={doExport}><ArrowDownToLine size={17} /></button><select aria-label="Perfil de acesso demonstrativo" value={profile} onChange={event => { setProfile(event.target.value); setSelection(null); setFilters(previous => ({ ...previous, cityIds: [] })); }}><option value="admin">Administração</option><option value="regional">GRE2 · regional</option><option value="viewer">Consulta</option></select></div></header>
    <main className="v11-main" aria-busy={pending}>
      <section className="v11-filters" aria-label="Segmentações empresariais"><MultiSelect label="GRE" options={dataset.gres.filter(row => profile !== 'regional' || row.id === 'GRE2').map(row => ({ value: row.id, label: row.name }))} value={effective.greIds} onChange={value => update('greIds', value)} /><MultiSelect label="Município" options={dataset.cities.filter(row => !effective.greIds.length || effective.greIds.includes(row.greId)).map(row => ({ value: row.id, label: row.name }))} value={effective.cityIds} onChange={value => update('cityIds', value)} /><MultiSelect label="CNAE" options={dataset.cnaes.filter(row => usedCnaes.has(row.code)).map(row => ({ value: row.code, label: `${row.code} · ${row.label}`, meta: row.originalClassification }))} value={effective.cnaeCodes} onChange={value => update('cnaeCodes', value)} /><MultiSelect label="Porte" options={['Microempresa', 'Pequena empresa', 'Média empresa', 'Grande empresa'].map(value => ({ value, label: value }))} value={effective.sizes} onChange={value => update('sizes', value)} /><label className="v11-search"><Search size={14} /><input aria-label="Pesquisar empresa ou CNPJ" placeholder="Empresa ou CNPJ" value={filters.search} onChange={event => update('search', event.target.value)} /></label><label className="v11-period">Janela<select aria-label="Janela de análise" value={filters.period} onChange={event => update('period', Number(event.target.value))}><option value={3}>3 meses</option><option value={6}>6 meses</option><option value={12}>12 meses</option><option value={24}>24 meses</option></select></label><button aria-label="Limpar todos os filtros" title="Limpar filtros e subconjunto" className="v11-reset" onClick={clear}><X size={15} /></button></section>
      <section className="v11-essentials" aria-label="Oito indicadores essenciais">{essentials.map(metric)}</section>
      <div className="v11-stage"><IntegratedCharts analysis={analysis} model={model} financialAllowed={financialAllowed} onCompanies={choose} onDimension={dimension} onMetric={id => setModal(id)} expandedChart={expanded} onExpand={id => setExpanded(previous => previous === id ? null : id)} />{!scope.companies.length && <div className="v11-empty" role="status"><Search size={28} /><strong>Nenhuma empresa neste recorte</strong><p>Revise a pesquisa, os filtros ou o subconjunto selecionado.</p><button onClick={clear}>Limpar filtros</button></div>}</div>
      <section className="v11-support" aria-label="Nove indicadores complementares">{supporting.map(metric)}</section>
      <footer className="v11-status"><div className="v11-scope"><span className="v11-live-dot" /><strong>{integer.format(scope.companies.length)} empresas no recorte</strong>{selection ? <button className="v11-selection" aria-label="Limpar subconjunto selecionado" title={selection.label} onClick={() => setSelection(null)}>{selection.label}<X size={12} /></button> : <span className="v11-units-note">Unidades e denominadores próprios por indicador</span>}</div><span className="v11-status-note">{pending ? 'Recalculando…' : expanded ? 'Gráfico ampliado · Esc para restaurar' : `${model.metadata.start.split('-').reverse().join('/')} a ${model.metadata.end.split('-').reverse().join('/')} · Demonstração`}</span><button className="v11-records-action" aria-label="Ver empresas deste recorte" onClick={() => setModal('records')}>Explorar empresas <ArrowUpRight size={14} /></button>{expanded && <button className="v11-expand-reset" aria-label="Restaurar visão integrada" onClick={() => setExpanded(null)}><Expand size={14} /></button>}</footer>
    </main>
    {modal && <EnterpriseDialog key={modal} title={modal === 'catalog' ? 'Catálogo dos 17 indicadores' : modal === 'sources' ? 'Fontes, dados e limitações' : modal === 'records' ? 'Empresas do recorte' : 'Definição do indicador'} subtitle={modal === 'records' ? `${integer.format(scope.companies.length)} empresas-raiz · ${selection?.label ?? 'Panorama empresarial'} · corte ${dataset.snapshotDate}` : 'Conceito · exemplo · fonte · cálculo · unidade · decisão · atualização · limites'} onClose={() => setModal(null)}>
      {modal === 'catalog' ? <><label className="e10-catalog-search"><Search size={16} /><input aria-label="Pesquisar indicadores estratégicos" placeholder="Nome, decisão ou fonte" value={query} onChange={event => setQuery(event.target.value)} /></label><p>{definitions.length} de 17 indicadores · exemplos didáticos separados dos valores calculados.</p><div className="e10-catalog-list">{definitions.map(definition)}</div></> : modal === 'sources' ? <div className="e10-source-list"><article className="e10-source-card"><h3>Dados internos · SQL Server e Db2</h3><p>Cadastro empresarial, estabelecimentos, registros e vigências; vínculos de responsabilidade técnica; ARTs; obrigações e pagamentos de pessoas jurídicas.</p><strong>Integração prevista via gateway; conexão institucional não configurada.</strong></article><article className="e10-source-card"><h3>Mercado · CNPJ e PNCP</h3><p>CNPJ completo, CNAEs e situação cadastral por ingestão oficial automatizada ou integração institucional autorizada. PNCP dispõe de API pública. Correspondência exata considera o estabelecimento e a data do fato.</p><p>CNAE não determina obrigação. Contrato publicado não comprova execução. Ausência de ponte documental não demonstra falta de ART.</p></article><article className="e10-source-card"><h3>Emprego e parcerias</h3><p>RAIS/CAGED públicos entram como contexto agregado por território, CNAE e competência. Dados de empregadores identificados, alvarás e vínculos documentais exigem acesso autorizado e homologação.</p><p>Um agregado territorial não pode ser atribuído a uma empresa específica.</p></article><article className="e10-source-card"><h3>Competência e rastreabilidade</h3><p>Cenário relacional reproduzível, semente {dataset.seed}; {integer.format(dataset.companies.length)} empresas e {integer.format(dataset.establishments.length)} estabelecimentos fictícios. Corte demonstrativo: {dataset.snapshotDate}. Última carga institucional: inexistente.</p><p>Classificação de objetos por regras demonstrativas, sem modelo treinado. Vínculos documentais e atribuições às GREs são demonstrativos. Ingresso observado não comprova efeito da gestão.</p></article><article className="e10-source-card"><h3>Governança e Power BI</h3><p>Perfis locais simulam restrições. Produção exige RLS/OLS, regras de exportação e responsáveis pela homologação. A audiência é definida nas configurações de compartilhamento do projeto. Este protótipo não é um arquivo .pbix.</p><p><a href="/downloads/crea-sp-bi-v13.zip" download="crea-sp-bi-v13.zip">Baixar projeto, dados e documentação · ZIP completo</a></p><p><a href="/docs/REVISAO_E_INDICADORES_V13.md" target="_blank" rel="noreferrer">Ficha dos 17 indicadores</a> · <a href="/docs/FONTES_EMPRESARIAIS_V10.md" target="_blank" rel="noreferrer">Fontes, APIs e parcerias</a> · <a href="/docs/POWER_BI_V13.md" target="_blank" rel="noreferrer">Canvas e implementação no Power BI</a></p></article></div> : modal === 'records' ? <EnterpriseRecords scope={scope} model={model} financialAllowed={financialAllowed} canExport={canExport} onCompany={id => { setModal(null); setCompany(id); }} onSelect={(ids, name) => { choose(ids, name); setModal(null); }} /> : definition(enterpriseIndicators.find(row => row.id === modal)!)}
    </EnterpriseDialog>}
    {company && <EnterpriseCompanyDrawer companyId={company} scope={scope} model={model} financialAllowed={financialAllowed} onClose={() => setCompany(null)} />}
    {message && <div className="e10-toast" role="status">{message}<button aria-label="Fechar aviso" onClick={() => setMessage('')}><X size={15} /></button></div>}
  </div>;
}
