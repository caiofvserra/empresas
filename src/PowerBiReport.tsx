import { lazy, Suspense, useEffect, useMemo, useState, useTransition } from 'react';
import { ArrowDownToLine, BarChart3, BookOpen, Building2, CircleHelp, Database, FileChartColumnIncreasing, Layers3, Search, ShieldCheck, SlidersHorizontal, UsersRound, FileCheck2, X } from 'lucide-react';
import { dataset, companyById } from './domain/dataset';
import { defaultFilters } from './domain/types';
import type { Filters, PageId } from './domain/types';
import { exportCsv, group, inWindow, isActiveLink, selectScope, summarize } from './domain/engine';
import { exportProfessionalCsv, selectProfessionalScope, summarizeProfessionals } from './domain/professionals';
import { ReportChart, compact, currency, distinct, num, percent } from './report/primitives';
import type { ReportPage, ReportProps } from './report/primitives';
import { integratedCompanyFlow } from './report/OverviewReport';
import InstitutionalExecutiveReport from './report/InstitutionalExecutiveReport';
import { buildExecutiveCompanyContinuity, buildExecutiveProfessionalEngagement, buildExecutiveCorporateReceipts } from './report/executive-decisions-v8';
import { buildDigitalInspection, exportDigitalInspectionCsv } from './domain/digital-inspection';
import DigitalEvidenceRecords from './report/DigitalEvidenceRecords';
import confeaSummary from './domain/confea-summary-v8.json';
const TransparencyReport = lazy(() => import('./report/TransparencyReport'));
import CompaniesReport from './report/CompaniesReport';
import ProfessionalsReport from './report/ProfessionalsReport';
import MarketReport from './report/MarketReport';
import ContractsReport from './report/ContractsReport';
import InspectionReport from './report/InspectionReport';
import ProfessionalRecords from './report/ProfessionalRecords';
import ProfessionalDrawer from './components/ProfessionalDrawer';
import MultiSelect from './components/MultiSelect';
import ReportOverlay from './components/ReportOverlay';
import CompanyTable, { downloadCsv } from './components/CompanyTable';
import EnterpriseDrawer from './components/EnterpriseDrawer';
import GovernanceModal from './components/GovernanceModal';
import type { AuditEntry } from './components/GovernanceModal';
import { EngineeringEmblem, EngineeringBlueprint } from './components/EngineeringIdentity';

type Profile = 'admin' | 'regional' | 'viewer';
type SelectedCompanies = { ids: string[]; label: string; reason: string };
type SelectedPeople = { ids: string[]; label: string };
const reports = [
  { id: 'overview', title: 'Presidência e resultados', icon: Layers3, question: 'Base ativa, autoria observada e recebimentos: quais mudanças orientam as decisões do CREA-SP?' },
  { id: 'companies', title: 'Empresas', icon: Building2, question: 'Como evoluem o cadastro, o acervo operacional e a situação financeira?' },
  { id: 'professionals', title: 'Profissionais e formação', icon: UsersRound, question: 'Qual é o cenário de formação e como a base profissional se liga às empresas?' },
  { id: 'market', title: 'Mercado e emprego', icon: BarChart3, question: 'Onde se concentram as atividades e como o emprego acompanha o cadastro?' },
  { id: 'contracts', title: 'Contratações', icon: FileChartColumnIncreasing, question: 'Como se distribuem recursos públicos, fornecedores e produção técnica?' },
  { id: 'inspection', title: 'Fiscalização digital', icon: ShieldCheck, question: 'Quais cruzamentos cadastrais e contratuais justificam verificação técnica?' },
  { id: 'transparency', title: 'Transparência', icon: FileCheck2, question: 'Exigências verificadas, catálogo Confea e fontes para uma futura publicação institucional.' },
] as const;
const legacy: Record<PageId, ReportPage> = { overview: 'overview', registry: 'companies', cao: 'companies', financial: 'companies', professionals: 'professionals', technical: 'professionals', market: 'market', employment: 'market', contracts: 'contracts', inspection: 'inspection' };
function readPage(): ReportPage { const id = location.hash.slice(1); return reports.find(row => row.id === id)?.id ?? legacy[id as PageId] ?? 'overview'; }
function restore(): Filters {
  try {
    const text = new URLSearchParams(location.search).get('f') ?? localStorage.getItem('crea-report-filters-v5');
    const filters = { ...defaultFilters, ...(text ? JSON.parse(text) : {}) };
    for (const key of ['greIds', 'cityIds', 'cnaeCodes', 'cboCodes', 'sizes', 'rfbStatuses', 'registrationStatuses'] as const) if (!Array.isArray(filters[key])) filters[key] = [];
    filters.period = [3, 6, 12, 24, 36].includes(Number(filters.period)) ? Number(filters.period) : 12;
    filters.search = typeof filters.search === 'string' ? filters.search : '';
    return filters;
  } catch { return { ...defaultFilters }; }
}
interface Kpi { id: string; title: string; value: string; note: string; source?: 'public'; select?: () => void }

export default function PowerBiReport() {
  const [page, setPage] = useState<ReportPage>(readPage);
  const [filters, setFilters] = useState<Filters>(restore);
  const [comparison, setComparison] = useState(false);
  const [profile, setProfile] = useState<Profile>('admin');
  const [companies, setCompanies] = useState<SelectedCompanies | null>(null);
  const [people, setPeople] = useState<SelectedPeople | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [records, setRecords] = useState(false);
  const [digitalRecords, setDigitalRecords] = useState(false);
  const [catalogReset, setCatalogReset] = useState(0);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [pending, transition] = useTransition();
  const [message, setMessage] = useState('');
  const [publicContractSelection, setPublicContractSelection] = useState<{ categoryId?: string; municipalityId?: string }>({});
  const report = reports.find(row => row.id === page)!;
  const effectiveFilters = useMemo(() => ({ ...filters, greIds: profile === 'regional' ? ['GRE2'] : filters.greIds }), [filters, profile]);
  const base = useMemo(() => selectScope(dataset, effectiveFilters), [effectiveFilters]);
  const scope = useMemo(() => companies ? selectScope(dataset, effectiveFilters, companies.ids) : base, [base, companies, effectiveFilters]);
  const metrics = useMemo(() => summarize(scope), [scope]);
  const professionalScope = useMemo(() => selectProfessionalScope(scope, { companySubset: companies?.ids, professionalIds: people?.ids }), [scope, companies, people]);
  const professionals = useMemo(() => summarizeProfessionals(professionalScope), [professionalScope]);
  const continuity = useMemo(() => buildExecutiveCompanyContinuity(scope), [scope]);
  const engagement = useMemo(() => buildExecutiveProfessionalEngagement(scope, people?.ids), [scope, people]);
  const receipts = useMemo(() => buildExecutiveCorporateReceipts(scope), [scope]);
  const digital = useMemo(() => buildDigitalInspection(scope), [scope]);
  const detailProfessionalScope = useMemo(() => selectProfessionalScope(selectScope(dataset, { ...defaultFilters, period: effectiveFilters.period })), [effectiveFilters.period]);
  const financialAllowed = profile === 'admin';
  const canExport = profile !== 'viewer';
  const log = (action: string, detail: string) => setAudit(previous => [...previous.slice(-49), { at: new Date().toISOString(), action, detail, role: profile }]);
  const changePage = (next: ReportPage) => { history.pushState(null, '', `${location.pathname}${location.search}#${next}`); setPage(next); setSelectedCompany(null); setSelectedProfessional(null); log('Página analítica', next); };
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => { transition(() => setFilters(previous => ({ ...previous, [key]: value, ...(key === 'greIds' ? { cityIds: [] } : {}) }))); log('Segmentação', `${key}: ${Array.isArray(value) ? value.join(', ') : value}`); };
  const dimension: ReportProps['onDimension'] = (key, ids) => update(key, filters[key].length === ids.length && ids.every(id => filters[key].includes(id)) ? [] : ids);
  const subset: ReportProps['onSubset'] = (ids, label, reason) => { const selected = distinct(ids).filter(id => base.companyIds.has(id)); transition(() => setCompanies({ ids: selected, label, reason })); log('Filtro cruzado', `${label}: ${selected.length} empresas`); };
  const selectPeople: ReportProps['onProfessionals'] = (ids, label) => { transition(() => setPeople({ ids: distinct(ids), label })); log('Recorte profissional', `${label}: ${distinct(ids).length} pessoas`); };
  const clear = () => { setFilters({ ...defaultFilters }); setCompanies(null); setPeople(null); setCatalogReset(value => value + 1); setComparison(false); setPublicContractSelection({}); log('Limpar segmentações', 'Universo permitido ao perfil.'); };
  useEffect(() => { setPublicContractSelection({}); }, [filters]);
  useEffect(() => { try { localStorage.setItem('crea-report-filters-v5', JSON.stringify(filters)); } catch { /* Analysis also works without local storage. */ } const params = new URLSearchParams(); params.set('f', JSON.stringify(filters)); history.replaceState(null, '', `${location.pathname}?${params}#${page}`); }, [page, filters]);
  useEffect(() => { const back = () => { setPage(readPage()); setFilters(restore()); }; window.addEventListener('popstate', back); return () => window.removeEventListener('popstate', back); }, []);
  const exportData = async () => {
    try { if (page === 'transparency') { const catalog = await import('./domain/transparency'); downloadCsv(catalog.exportTransparencyCsv(catalog.selectTransparencyRows(), canExport), 'creasp-catalogo-regional-completo.csv'); setMessage('Catálogo regional completo exportado, sem valores atuais.'); return; } downloadCsv(page === 'inspection' ? exportDigitalInspectionCsv(scope, canExport) : page === 'professionals' || page === 'overview' && people ? exportProfessionalCsv(professionalScope, canExport) : exportCsv(scope, { financial: financialAllowed, export: canExport }), `crea-sp-${page === 'professionals' || page === 'overview' && people ? 'profissionais' : 'recorte'}-${dataset.snapshotDate}.csv`); log('Exportação de dados', page === 'professionals' || page === 'overview' && people ? `${professionalScope.profiles.length} profissionais no recorte` : `${scope.establishments.length} estabelecimentos no recorte`); setMessage('CSV do recorte exportado.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao exportar.'); }
  };
  const registered = distinct(scope.registrations.map(row => row.companyId));
  const activeIds = distinct(scope.registrations.filter(row => row.status === 'Ativo').map(row => row.companyId));
  const rtIds = distinct(scope.technicalLinks.filter(row => isActiveLink(row, scope.anchor)).map(row => row.companyId));
  const degreeIds = new Set(professionalScope.model.education.filter(row => row.level === 'Graduação' && professionalScope.profileIds.has(row.professionalId)).map(row => row.professionalId));
  const kpi = (id: string, title: string, value: number, note: string, select?: () => void): Kpi => ({ id, title, value: num(value), note, select });
  const companyCount = kpi('companies', 'Empresas no universo', metrics.companies, 'CNPJ raiz · cenário demonstrativo');
  const registeredKpi = kpi('registeredCompanies', 'Empresas no CREA', metrics.registeredCompanies, 'Empresas distintas com registro', () => subset(registered, 'Empresas no cadastro CREA', 'Ao menos um registro associado; situações separadas nos gráficos.'));
  const activeKpi = kpi('activeCompanies', 'Empresas ativas', metrics.activeCompanies, 'Ao menos um registro ativo', () => subset(activeIds, 'Empresas com registro ativo', 'Empresa contada uma vez, ainda que possua vários registros.'));
  const rtKpi = kpi('activeLinks', 'Vínculos RT vigentes', metrics.activeLinks, `${num(metrics.distinctProfessionals)} pessoas · ${num(rtIds.length)} empresas`, () => subset(rtIds, 'Empresas com RT vigente', 'Relação técnica vigente na competência demonstrativa.'));
  let kpis: Kpi[] = [registeredKpi, activeKpi, kpi('professionals', 'Profissionais no recorte', professionals.professionals, 'Cadastro demonstrativo · pessoas'), rtKpi, kpi('employees', 'Empregos formais', metrics.employees, 'Contexto agregado · cenário demonstrativo')];
  if (page === 'overview') kpis = [activeKpi,
    kpi('activeProfessionals', 'Profissionais ativos', engagement.total, 'Pessoas distintas no corte · demonstração', () => selectPeople(engagement.rows.flatMap(row => row.withArtIds.concat(row.withoutArtIds)), 'Profissionais ativos no recorte')),
    kpi('activeArtAuthorsObserved', 'Autores ativos identificados', engagement.withArtIds.length, `${num(engagement.withArtIds.length)} / ${num(engagement.total)} ativos · autoria identificada em ${engagement.authorCoverageRate === null ? 'nenhuma' : percent(engagement.authorCoverageRate)} das ARTs`, () => selectPeople(engagement.withArtIds, 'Ativos com autoria expressa de ART no período')),
    { id: 'corporateReceipts', title: 'Recebido de empresas', value: financialAllowed ? currency(receipts.receivedAmount) : 'Restrito', note: 'Pagamentos na janela · recorte PJ demonstrativo, sem ART como receita', ...(financialAllowed ? { select: () => subset(receipts.companyIds, 'Empresas com pagamento recebido no período', 'Pagamentos observados no corte; recuperação é um subconjunto, não uma receita adicional.') } : {}) },
    kpi('activeCompaniesWithoutRt', 'Ativas sem RT identificado', continuity.withoutRtIds.length, `${num(continuity.withoutRtIds.length)} / ${num(continuity.total)} empresas ativas · requer conferir vigência e fonte`, () => subset(continuity.withoutRtIds, 'Empresas ativas sem RT vigente identificado', 'Ausência identificada no cadastro demonstrativo; não é conclusão de infração.')),
  ];
  if (page === 'companies') kpis = [registeredKpi, kpi('establishments', 'Estabelecimentos', metrics.establishments, 'CNPJ completo · matriz e filial'), kpi('arts', 'ARTs no período', metrics.arts, 'Eventos vinculados à empresa'), kpi('caoIssued', 'CAOs emitidas', metrics.caoIssued, 'Acervo operacional · pessoa jurídica'), { id: 'compliance', title: 'Adimplência empresarial', value: financialAllowed ? percent(metrics.compliance) : 'Restrito', note: financialAllowed ? `${num(metrics.compliantCompanies)} de ${num(metrics.financeUniverse)} empresas elegíveis` : 'Valores disponíveis à Administração' }];
  if (page === 'professionals') kpis = [kpi('professionals', 'Profissionais no recorte', professionals.professionals, 'Cadastro interno · pessoas distintas · demonstração'), kpi('activeProfessionals', 'Profissionais ativos', professionals.activeProfessionals, 'Status cadastral · demonstração'), kpi('registeredGraduates', 'Diplomados no cadastro', degreeIds.size, 'Graduação declarada · pessoas únicas · demonstração'), kpi('withActiveLinks', 'Pessoas com RT vigente', professionals.withActiveLinks, `${num(professionals.activeLinks)} vínculos técnicos · demonstração`), kpi('linkedArts', 'ARTs com autoria', professionals.linkedArts, `${num(professionals.artAuthors)} autores distintos · demonstração`)];
  if (page === 'market') kpis = [companyCount, registeredKpi, { id: 'coverage', title: 'Correspondência Receita × CREA', value: percent(metrics.coverage), note: `${num(metrics.registeredCompanies)} / ${num(metrics.companies)} empresas · demonstração` }, kpi('employees', 'Estoque de empregos', metrics.employees, 'Município × CNAE × CBO · demonstração'), { id: 'employmentBalance', title: 'Saldo de empregos', value: num(metrics.employmentBalance), note: 'Admissões − desligamentos no período' }];
  if (page === 'contracts') kpis = [kpi('contractCount', 'Contratos no período', metrics.contractCount, 'Base relacional demonstrativa · fonte prevista: PNCP/API'), { id: 'contractValue', title: 'Valor contratado', value: currency(metrics.contractValue), note: 'Valor de contrato ≠ execução ou pagamento · demonstração' }, kpi('contractSuppliers', 'Fornecedores distintos', distinct(scope.contracts.map(row => row.companyId)).length, 'CNPJ raiz · cenário demonstrativo'), kpi('engineeringContracts', 'Objetos técnicos indicados', metrics.engineeringContracts, 'Classificação demonstrativa · requer validação'), kpi('contractMissingCompanies', 'Fornecedores sem correspondência', metrics.contractMissingCompanies, 'Ausência no cadastro não comprova infração')];
  if (page === 'inspection') kpis = [
    kpi('digitalEligible', 'Universo externo elegível', digital.metrics.eligibleCompanies, 'CNPJ raiz · RFB ativa + CNAEs da regra · demonstração', () => subset(digital.companies.map(row => row.companyId), 'Universo externo selecionado', 'CNAE principal ou secundário da classificação; não implica obrigação automática.')),
    kpi('digitalNoMatch', 'Sem correspondência cadastral', digital.metrics.noCorrespondence, 'Sem CNPJ/raiz correspondente · sugestões por raiz são separadas', () => subset(digital.companies.filter(row => row.match === 'none').map(row => row.companyId), 'Sem correspondência determinística', 'CNPJ completo não localizado, após os critérios do universo; conferir origem antes de enquadrar.')),
    kpi('digitalTechnicalSuppliers', 'Fornecedores com objeto técnico', digital.metrics.technicalContractSuppliers, 'PNCP demonstrativo · texto explicável · CNPJ fornecedor', () => subset(digital.companies.filter(row => row.technicalContractIds.length).map(row => row.companyId), 'Fornecedores de objetos potencialmente técnicos', 'Classificação lexical demonstrativa; não é decisão de obrigatoriedade.')),
    kpi('digitalWithoutRt', 'Registradas sem RT identificado', digital.metrics.registeredWithoutRt, 'Vigência e chaves da base · verificar cobertura', () => subset(digital.companies.filter(row => row.signals.some(signal => signal.ruleId === 'DIG-05')).map(row => row.companyId), 'Registro ativo sem RT vigente identificado', 'Sinal de fonte; requer validação cadastral e análise técnica.')),
    kpi('digitalConvergent', 'Evidências convergentes', digital.metrics.convergentSignals, 'Combinação de critérios · sem nota ou probabilidade', () => subset(digital.companies.filter(row => row.signals.some(signal => signal.ruleId === 'DIG-04')).map(row => row.companyId), 'Conjuntos com evidências convergentes', 'Critérios booleanos e documentos rastreáveis; não classificação automática de irregularidade.')),
  ];
  if (page === 'transparency') kpis = [
    kpi('requestedConfeaIndicators', 'Indicadores regionais', confeaSummary.indicatorScopes.crea_sp, 'Catálogo: 42 diretos + 2 dependem de dados Confea'),
    kpi('requestedConfeaData', 'Linhas de dados CREA', confeaSummary.creaMetrics, 'Catálogo enviado · uma linha excluída na origem'),
    kpi('rgMandatoryCatalog', 'RG segundo o catálogo', confeaSummary.creaMetricsMarkedReportMandatory, 'Marcação da planilha · não comprova exigência pública isolada'),
    kpi('publicThemes', 'Temas na DN-TCU 216', 8, 'Dados regionais para consolidação do Sistema'),
    { id: 'publicPreviewStatus', title: 'Publicação institucional', value: 'Prévia privada', note: 'Fontes não conectadas · liberação pública não realizada' },
  ];
  const flow = useMemo(() => integratedCompanyFlow(scope), [scope]);
  const companiesWithRtAndArt = registered.filter(id => rtIds.includes(id) && scope.arts.some(row => row.companyId === id)).length;
  const largest = group(scope, 'gre')[0];
  let insight = `Dos ${num(flow.total)} CNPJs no CREA, ${num(companiesWithRtAndArt)} possuem RT vigente e ART no período. ${largest ? `${largest.label} reúne ${num(largest.companies)} empresas com estabelecimento no recorte.` : 'Não há empresas neste recorte.'}`;
  if (page === 'overview') insight = `No recorte, ${num(continuity.withoutRtIds.length)} de ${num(continuity.total)} empresas ativas não têm RT vigente identificado. Autoria observada: ${num(engagement.withArtIds.length)} ativos, com cobertura de apenas ${engagement.authorCoverageRate === null ? 'nenhuma' : percent(engagement.authorCoverageRate)} das ARTs; ausência de autoria identificada não significa inatividade ou desemprego.`;
  if (page === 'companies') insight = `O mesmo recorte de ${num(metrics.companies)} empresas sustenta cadastro, ${num(metrics.arts)} ARTs e ${num(metrics.caoIssued)} CAOs emitidas. ${financialAllowed ? `A adimplência usa somente as ${num(metrics.financeUniverse)} empresas com obrigações elegíveis.` : 'O perfil atual restringe informações financeiras.'}`;
  if (page === 'professionals') insight = `O recorte reúne ${num(professionals.professionals)} pessoas e ${num(degreeIds.size)} diplomados com graduação declarada no cadastro demonstrativo. ${num(professionals.withActiveLinks)} possuem RT vigente e ${num(professionals.artAuthors)} têm autoria expressa de ART. Formação cadastral não estima todos os concluintes paulistas; a carga estadual depende do banco educacional.`;
  if (page === 'market') insight = `A correspondência cadastral é ${percent(metrics.coverage)} no universo selecionado. O saldo de ${num(metrics.employmentBalance)} empregos é agregado por território e atividade; não identifica empregados de cada empresa.`;
  if (page === 'contracts') insight = `${num(metrics.contractCount)} contratos demonstrativos de ${num(distinct(scope.contracts.map(row => row.companyId)).length)} fornecedores são relacionados por chaves ao cadastro e à produção técnica. A carga real será obtida pela API oficial PNCP; não há conexão automática ativa nesta demonstração.`;
  if (page === 'inspection') insight = `${num(digital.metrics.eligibleCompanies)} empresas no universo externo: ${num(digital.metrics.noCorrespondence)} sem correspondência exata e ${num(digital.metrics.convergentSignals)} com critérios convergentes. CNPJ, vigência e documentos sustentam a evidência; CNAE não define obrigação. CAGED permanece contexto agregado por território e atividade.`;
  if (page === 'transparency') insight = 'RG regional público até 31/03; envio ao Confea até 01/04. Indicador 53 mede participação do orçamento aprovado; não crescimento real acima da inflação. Nenhum valor histórico da planilha foi publicado como resultado atual.';
  const props: ReportProps = { scope, filters: effectiveFilters, comparison, financialAllowed, companySubset: companies?.ids, professionalIds: people?.ids, onDimension: dimension, onSubset: subset, onProfessionals: selectPeople, onInfo: id => id === 'digital-evidence' ? setDigitalRecords(true) : setInfo(id), publicContractSelection, onPublicContractSelection: setPublicContractSelection };
  const content = page === 'overview' ? <InstitutionalExecutiveReport {...props} /> : page === 'companies' ? <CompaniesReport {...props} /> : page === 'professionals' ? <ProfessionalsReport {...props} /> : page === 'market' ? <MarketReport {...props} /> : page === 'contracts' ? <ContractsReport {...props} /> : page === 'transparency' ? <Suspense fallback={<div className="r5-empty" role="status">Carregando catálogo normativo…</div>}><TransparencyReport key={catalogReset} canExport={canExport}/></Suspense> : <InspectionReport {...props} />;
  const tablePage: PageId = page === 'companies' || page === 'transparency' ? 'registry' : page;
  return <div className="r5-app" data-page={page}>
    <header className="r5-top"><div className="r5-brand"><EngineeringEmblem /><strong>CREA-SP</strong><span>INTELIGÊNCIA EMPRESARIAL E PROFISSIONAL</span></div><div className="r5-top-right"><span className="r5-data-badge">DEMONSTRAÇÃO · FONTES NÃO CONECTADAS</span><button aria-label="Dicionário de indicadores" title="Dicionário de indicadores" onClick={() => setInfo('')}><BookOpen size={16} /></button><button aria-label="Fontes e metodologia" title="Fontes, competências e metodologia" onClick={() => setInfo('sources')}><Database size={16} /></button><button aria-label="Exportar dados do recorte" title={page === 'transparency' ? 'Exportar catálogo regional completo, sem valores atuais' : page === 'inspection' ? 'Exportar evidências digitais do recorte' : 'Exportar dados demonstrativos selecionados'} disabled={!canExport} onClick={exportData}><ArrowDownToLine size={16} /></button><select aria-label="Perfil demonstrativo" value={profile} onChange={event => { setProfile(event.target.value as Profile); setCompanies(null); setPeople(null); }}><option value="admin">Administração</option><option value="regional">GRE2 · consulta</option><option value="viewer">Consulta</option></select></div></header>
    <main className="r5-report">
      <div className="r5-heading"><div className="r9-title-block"><span className="r9-page-index" aria-hidden="true">{String(reports.findIndex(row => row.id === page) + 1).padStart(2, '0')}</span><h1>{report.title}</h1><p>{report.question}</p></div><EngineeringBlueprint /><div className="r5-reading-guide">{page === 'overview' ? <><span>01 Evolução</span><span>02 Relações</span><span>03 Território</span><span>04 Recursos</span></> : <><span>01 Universo</span><span>02 Evolução</span><span>03 Relações</span><span>04 Leitura</span></>}</div></div>
      <section className="r5-filters" aria-label="Segmentações sincronizadas">{page === 'transparency' ? <><span className="r8-catalog-scope">CREA-SP · prestação de contas anual · fórmulas e fontes sob homologação</span><button className="r5-icon" aria-label="Limpar filtros do catálogo" title="Restaurar pesquisa e subprograma" onClick={clear}><X size={16}/></button></> : <><MultiSelect label="GRE" options={dataset.gres.filter(row => profile !== 'regional' || row.id === 'GRE2').map(row => ({ value: row.id, label: row.name }))} value={effectiveFilters.greIds} onChange={value => update('greIds', value)} /><MultiSelect label="Município" options={dataset.cities.filter(row => !effectiveFilters.greIds.length || effectiveFilters.greIds.includes(row.greId)).map(row => ({ value: row.id, label: row.name }))} value={filters.cityIds} onChange={value => update('cityIds', value)} /><><MultiSelect label="CNAE" options={dataset.cnaes.map(row => ({ value: row.code, label: `${row.code} · ${row.label}`, meta: row.originalClassification }))} value={filters.cnaeCodes} onChange={value => update('cnaeCodes', value)} /><MultiSelect label="Porte" options={['Microempresa', 'Pequena empresa', 'Média empresa', 'Grande empresa'].map(value => ({ value, label: value }))} value={filters.sizes} onChange={value => update('sizes', value)} /></><label className="r5-period">Período interno<select aria-label="Período interno" value={filters.period} onChange={event => update('period', Number(event.target.value))}><option value="3">3 meses</option><option value="6">6 meses</option><option value="12">12 meses</option><option value="24">24 meses</option><option value="36">36 meses</option></select></label><label className="r5-comparison"><input type="checkbox" checked={comparison} onChange={event => setComparison(event.target.checked)} />Comparar</label><button className="r5-icon" aria-label="Mais segmentações" title="Situação cadastral e pesquisa" onClick={() => setAdvanced(true)}><SlidersHorizontal size={16} /></button><button className="r5-icon" aria-label="Limpar todas as segmentações" title="Restaurar o universo" onClick={clear}><X size={16} /></button></>}</section>
      <section className="r5-kpis" aria-label="Indicadores integrados">{kpis.map(row => <article data-metric={row.id} key={row.id} className={row.source === 'public' ? 'r5-kpi r5-public-kpi' : 'r5-kpi'}><div className="r5-kpi-label">{row.title}<button title={row.note} aria-label={`Definição de ${row.title}`} onClick={() => setInfo(row.id)}><CircleHelp size={12} /></button></div>{row.select ? <button className="r5-kpi-select" aria-label={`Selecionar ${row.title}`} onClick={row.select}><strong>{row.value}</strong></button> : <strong>{row.value}</strong>}<span title={row.note}>{row.note}</span></article>)}</section>
      <div className="r5-stage" aria-busy={pending}>{content}{!scope.companies.length && ['companies', 'inspection'].includes(page) && <div className="r5-no-results" role="status"><strong>Nenhuma empresa neste recorte</strong><span>Revise as segmentações ou restaure o universo permitido.</span><button onClick={clear}>Limpar segmentações</button></div>}</div>
      <section className="r5-insight" aria-label="Leitura do recorte"><span className="r5-insight-label">LEITURA DO RECORTE</span><p title={insight}>{insight}</p>{companies && <button className="r5-selection" title={`${companies.label}: ${companies.reason}`} aria-label="Limpar seleção de empresas" onClick={() => setCompanies(null)}>{num(scope.companies.length)} empresas selecionadas <X size={11} /></button>}{people && <button className="r5-selection" title={people.label} aria-label="Limpar seleção de profissionais" onClick={() => setPeople(null)}>{num(page === 'overview' ? people.ids.length : professionals.professionals)} pessoas selecionadas <X size={11} /></button>}<button className="r5-drill" onClick={() => page === 'inspection' ? setDigitalRecords(true) : page === 'transparency' ? setInfo('sources') : setRecords(true)} aria-label="Ver dados que sustentam o recorte">Ver dados <Search size={12} /></button></section>
      <footer className="r5-footer"><span>{pending ? 'Atualizando recorte…' : 'Demonstração · SET/2026 · produção prevista: SQL Server e DB2 via gateway; fontes externas por API'}</span><span>Filtro no visual → recorte sincronizado → detalhes dos dados</span></footer>
    </main>
    <nav className="r5-pages" aria-label="Páginas do relatório"><span className="r5-page-label">RELATÓRIO</span>{reports.map(row => { const Icon = row.icon; return <button key={row.id} onClick={() => changePage(row.id)} aria-current={page === row.id ? 'page' : undefined} className={page === row.id ? 'active' : ''}><Icon size={14} /><span>{row.title}</span></button>; })}<span className="r5-page-counter">{reports.findIndex(row => row.id === page) + 1} / {reports.length}</span></nav>
    {advanced && <ReportOverlay kind="filters" title="Segmentações adicionais" subtitle="Filtros afetam os fatos com dimensões compatíveis." onClose={() => setAdvanced(false)}><><MultiSelect label="Situação Receita" options={['Ativa', 'Baixada', 'Suspensa', 'Inapta'].map(value => ({ value, label: value }))} value={filters.rfbStatuses} onChange={value => update('rfbStatuses', value)} /><MultiSelect label="Situação do registro" options={['Ativo', 'Inativo', 'Cancelado'].map(value => ({ value, label: value }))} value={filters.registrationStatuses} onChange={value => update('registrationStatuses', value)} /><label className="r5-search-label">Pesquisar empresa ou CNPJ<input aria-label="Pesquisar empresa ou CNPJ" value={filters.search} onChange={event => update('search', event.target.value)} /></label><p className="p-source">Emprego é agregado por território, CNAE, CBO e tempo. Formação declarada pertence às pessoas do cadastro demonstrativo. Concluintes estaduais dependerão de carga educacional automatizada para banco. A fonte real PNCP dependerá da rotina de API, sem misturar fornecedores reais e fictícios.</p></><button className="p-primary" onClick={() => setAdvanced(false)}>Voltar ao relatório</button></ReportOverlay>}
    {records && <ReportOverlay title="Dados que sustentam o recorte" subtitle={page === 'professionals' || page === 'overview' && people ? `${num(professionals.professionals)} pessoas demonstrativas · ${people?.label ?? report.title}` : `${num(scope.companies.length)} empresas demonstrativas · ${companies?.label ?? report.title}`} onClose={() => setRecords(false)}>{page === 'professionals' || page === 'overview' && people ? <ProfessionalRecords scope={professionalScope} onProfessional={id => { setRecords(false); setSelectedProfessional(id); }} canExport={canExport} /> : <CompanyTable scope={scope} page={tablePage} onCompany={id => { setRecords(false); setSelectedCompany(id); }} onSubset={(ids, label, reason) => { subset(ids, label, reason); setRecords(false); }} financialAllowed={financialAllowed} canExport={canExport} />}</ReportOverlay>}
    {digitalRecords && <ReportOverlay title="Evidências da fiscalização digital" subtitle="Critério, origem, chave e limite do cruzamento · demonstração" onClose={() => setDigitalRecords(false)}><DigitalEvidenceRecords scope={scope} canExport={canExport} onCompany={id => { setDigitalRecords(false); setSelectedCompany(id); }} onSubset={(ids, label, reason) => { subset(ids, label, reason); setDigitalRecords(false); }}/></ReportOverlay>}
    {selectedProfessional && <ProfessionalDrawer professionalId={selectedProfessional} scope={detailProfessionalScope} onClose={() => setSelectedProfessional(null)} onCompany={id => { if (detailProfessionalScope.companyScope.companyIds.has(id)) { setSelectedProfessional(null); setSelectedCompany(id); } }} />}
    <EnterpriseDrawer companyId={selectedCompany} inspectionAllowed={page === 'inspection'} period={filters.period} financialAllowed={financialAllowed} onClose={() => setSelectedCompany(null)} onNavigate={(next, ids) => { setSelectedCompany(null); subset(ids, companyById.get(ids[0])?.name ?? 'Empresa selecionada', 'Detalhamento do recorte; segmentações preservadas.'); changePage(legacy[next]); }} />
    {info !== null && <GovernanceModal initial={info} audit={audit} onClose={() => setInfo(null)} />}
    {message && <div className="r5-toast" role="status">{message}<button aria-label="Fechar aviso" onClick={() => setMessage('')}><X size={14} /></button></div>}
  </div>;
}
