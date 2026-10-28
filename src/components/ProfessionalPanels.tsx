import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, CircleHelp, Download, Search, UsersRound, X } from 'lucide-react';
import { previousWindow, windowBounds } from '../domain/engine';
import type { Scope } from '../domain/engine';
import {
  buildProfessionalCohorts, buildProfessionalHistogram, buildProfessionalNetwork, buildProfessionalTerritory,
  exportProfessionalCsv, selectProfessionalScope, summarizeProfessionals,
} from '../domain/professionals';
import type { ProfessionalScope, ProfessionalStatus } from '../domain/professionals';
import { cityById } from '../domain/dataset';
import Chart, { barOption, chartColors, heatmapOption, scatterOption } from './Chart';
import ReportOverlay from './ReportOverlay';
import ProfessionalDrawer from './ProfessionalDrawer';

export interface ProfessionalPanelsProps {
  scope: Scope;
  view: string;
  onSubset: (ids: string[], label: string, reason: string) => void;
  onCity: (id: string) => void;
  onCompany: (id: string) => void;
  onInfo: (id: string) => void;
  canExport: boolean;
  companySubset?: string[];
  comparison?: boolean;
}

const num = (value: number) => value.toLocaleString('pt-BR');
const distinct = (values: string[]) => [...new Set(values)];
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
const monthLabel = (value: string) => new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(`${value}-01T12:00:00Z`));
const professionalChartHeight = () => typeof window === 'undefined' ? 300 : Math.max(210, Math.min(370, window.innerHeight - 540));

function Panel({ title, subtitle, children, actions }: { title: string; subtitle: string; children: ReactNode; actions?: ReactNode }) {
  return <section className="p-panel"><header className="p-panel-header"><div><h2 className="p-panel-title">{title}</h2><p className="p-panel-subtitle">{subtitle}</p></div>{actions && <div className="p-controls">{actions}</div>}</header><div className="p-panel-body">{children}</div></section>;
}

function Metric({ id, label, value, note, onInfo, onClick, prior }: { id: string; label: string; value: number; note: string; onInfo: (id: string) => void; onClick?: () => void; prior?: number }) {
  return <article className="p-kpi" data-metric={id}><div className="p-kpi-label"><span>{label}</span><button className="p-info-button" aria-label={`Definição de ${label}`} onClick={() => onInfo(id)}><CircleHelp size={15} /></button></div>{onClick ? <button className="p-kpi-drill" onClick={onClick} aria-label={`Explorar ${label.toLowerCase()}`}><strong className="p-kpi-value">{num(value)}</strong><ArrowUpRight size={15} /></button> : <strong className="p-kpi-value">{num(value)}</strong>}<p className="p-kpi-note">{prior === undefined ? note : `${note} · ${num(prior)} na janela anterior`}</p></article>;
}

function ProfessionalMap({ rows, onCity, height }: { rows: ReturnType<typeof buildProfessionalTerritory>; onCity: (id: string) => void; height: number }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Promise.all([import('../services/echarts'), import('../domain/sp-municipios.json')]).then(([echarts, geometry]) => {
      echarts.registerMap('spMunicipal', geometry.default as Parameters<typeof echarts.registerMap>[1]);
      if (!cancelled) setReady(true);
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);
  const option = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}<br/>${Number.isFinite(p.value) ? `${num(p.value)} profissionais distintos` : 'Sem profissionais no recorte demonstrativo'}` },
    visualMap: { min: 0, max: Math.max(1, ...rows.map(row => row.professionals)), left: 4, bottom: 0, orient: 'horizontal', itemWidth: 12, itemHeight: 125, text: ['Maior', '0'], inRange: { color: ['#E9EFFB', '#A2B4DB', '#3662E2', '#15265C'] }, textStyle: { fontSize: 12, color: '#52637E' } },
    series: [{ type: 'map', map: 'spMunicipal', roam: false, layoutCenter: ['50%', '43%'], layoutSize: '135%', itemStyle: { areaColor: '#F1F3F7', borderColor: '#D1D9E7', borderWidth: .45 }, emphasis: { label: { color: '#0E1732', fontSize: 12 }, itemStyle: { areaColor: '#B4C6ED' } }, data: rows.map(row => ({ name: row.label, id: row.cityId, value: row.professionals })) }],
  }), [rows]);
  return <div className="p-professional-map">{ready ? <Chart option={option} height={height} ariaLabel="Mapa de profissionais distintos por município de domicílio no cadastro demonstrativo" onPick={p => { const selected = rows.find(row => row.label === p.name); if (selected) onCity(selected.cityId); }} /> : <div className="p-loading">{error ? 'Malha indisponível. Selecione o município no filtro global.' : 'Preparando mapa municipal…'}</div>}<p className="p-source">Domicílio profissional · malha oficial IBGE · valores fictícios.</p></div>;
}

function ProfessionalRecords({ scope, onProfessional, canExport }: { scope: ProfessionalScope; onProfessional: (id: string) => void; canExport: boolean }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(1);
  const [exportError, setExportError] = useState('');
  const rows = useMemo(() => {
    const counts = new Map<string, Set<string>>();
    for (const row of scope.activeLinks) { const ids = counts.get(row.professionalId) ?? new Set<string>(); ids.add(row.companyId); counts.set(row.professionalId, ids); }
    const artCounts = new Map<string, Set<string>>();
    for (const row of scope.artAttributions) { const ids = artCounts.get(row.professionalId) ?? new Set<string>(); ids.add(row.artId); artCounts.set(row.professionalId, ids); }
    return scope.profiles.filter(row => !query || normalize(`${row.name} ${row.registration} ${row.modality} ${cityById.get(row.cityId)?.name ?? ''}`).includes(normalize(query.trim())))
      .map(row => ({ profile: row, companies: counts.get(row.id)?.size ?? 0, arts: artCounts.get(row.id)?.size ?? 0 }))
      .sort((a, b) => sort === 'companies' ? b.companies - a.companies || a.profile.name.localeCompare(b.profile.name, 'pt-BR') : sort === 'arts' ? b.arts - a.arts || a.profile.name.localeCompare(b.profile.name, 'pt-BR') : a.profile.name.localeCompare(b.profile.name, 'pt-BR'));
  }, [scope, query, sort]);
  useEffect(() => { setPage(1); }, [scope, query, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / 8));
  const download = () => {
    try {
      // Keep the current ART/date subset when exporting a production drillthrough.
      const profileIds = new Set(rows.map(row => row.profile.id));
      const filtered = { ...scope, profiles: scope.profiles.filter(row => profileIds.has(row.id)), profileIds };
      const url = URL.createObjectURL(new Blob([exportProfessionalCsv(filtered, canExport)], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = 'crea-sp-profissionais-demonstrativos.csv'; link.click(); URL.revokeObjectURL(url); setExportError('');
    } catch (error) { setExportError(error instanceof Error ? error.message : 'Não foi possível exportar este recorte.'); }
  };
  return <section className="p-table-panel" id="professional-list"><div className="p-table-tools"><div><h2>Profissionais do recorte <span className="p-count">{num(rows.length)}</span></h2><p>Pessoa distinta · empresas por RT vigente · ARTs com autoria declarada na demonstração.</p></div><div className="p-controls"><label className="p-search"><Search size={15} /><input aria-label="Pesquisar profissionais do recorte" placeholder="Nome, registro ou município" value={query} onChange={event => setQuery(event.target.value)} /></label><select aria-label="Ordenar profissionais" value={sort} onChange={event => setSort(event.target.value)}><option value="name">Nome</option><option value="companies">Mais empresas por RT</option><option value="arts">Mais ARTs atribuídas</option></select><button className="p-secondary" disabled={!canExport || !rows.length} title={!canExport ? 'O perfil atual não permite exportação' : 'Exportar o conjunto filtrado'} onClick={download}><Download size={15} />CSV</button></div></div>{exportError && <p className="p-error" role="alert">{exportError}</p>}<div className="p-table-scroll"><table className="p-table"><thead><tr><th>Profissional / registro</th><th>Modalidade</th><th>Domicílio</th><th>Situação</th><th>Empresas por RT</th><th>ARTs atribuídas</th></tr></thead><tbody>{rows.slice((page - 1) * 8, page * 8).map(({ profile, companies, arts }) => <tr key={profile.id}><td><button className="p-company-link" onClick={() => onProfessional(profile.id)}>{profile.name}</button><br/><small>{profile.registration}</small></td><td>{profile.modality}</td><td>{cityById.get(profile.cityId)?.name ?? profile.cityId}</td><td><span className="p-badge">{profile.status}</span></td><td>{num(companies)}</td><td>{num(arts)}</td></tr>)}</tbody></table>{!rows.length && <p className="p-empty">Nenhum profissional corresponde à pesquisa.</p>}</div><div className="p-pagination"><span>{num(rows.length)} profissionais · 8 por página</span><div><button aria-label="Página anterior de profissionais" disabled={page === 1} onClick={() => setPage(value => value - 1)}><ChevronLeft size={15} /></button><span>{page} / {pages}</span><button aria-label="Próxima página de profissionais" disabled={page >= pages} onClick={() => setPage(value => value + 1)}><ChevronRight size={15} /></button></div></div></section>;
}

export default function ProfessionalPanels({ scope: companyScope, view, onSubset, onCity, onCompany, onInfo, canExport, companySubset, comparison = false }: ProfessionalPanelsProps) {
  const [modality, setModality] = useState('');
  const [status, setStatus] = useState<ProfessionalStatus | ''>('');
  const [selection, setSelection] = useState<{ ids: string[]; label: string } | null>(null);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [relationship, setRelationship] = useState('rt');
  const [artMonth, setArtMonth] = useState('');
  const [activity, setActivity] = useState('');
  const [territoryView, setTerritoryView] = useState('map');
  const [chartHeight, setChartHeight] = useState(professionalChartHeight);
  useEffect(() => { const resize = () => setChartHeight(professionalChartHeight()); window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize); }, []);
  const base = useMemo(() => selectProfessionalScope(companyScope, { companySubset }), [companyScope, companySubset]);
  const scope = useMemo(() => selectProfessionalScope(companyScope, { companySubset, modalities: modality ? [modality] : [], statuses: status ? [status] : [], professionalIds: selection?.ids }), [companyScope, companySubset, modality, status, selection]);
  const metrics = useMemo(() => summarizeProfessionals(scope), [scope]);
  const bounds = windowBounds(companyScope.filters.period, companyScope.anchor);
  const priorScope = useMemo(() => comparison ? selectProfessionalScope({ ...companyScope, anchor: bounds.previousEnd }, { companySubset, modalities: modality ? [modality] : [], statuses: status ? [status] : [], professionalIds: selection?.ids }) : null, [comparison, companyScope, bounds.previousEnd, companySubset, modality, status, selection]);
  const priorArts = priorScope?.arts.filter(row => !activity || row.description === activity) ?? [];
  const priorEntries = comparison ? scope.profiles.filter(row => previousWindow(row.registeredAt, companyScope.filters.period, companyScope.anchor)).length : undefined;
  const modalities = distinct(base.model.profiles.map(row => row.modality)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const territory = useMemo(() => buildProfessionalTerritory(scope), [scope]);
  const cohorts = useMemo(() => buildProfessionalCohorts(scope), [scope]);
  const network = useMemo(() => buildProfessionalNetwork(scope), [scope]);
  const histogram = useMemo(() => buildProfessionalHistogram(scope), [scope]);
  const productionArts = useMemo(() => scope.arts.filter(row => (!artMonth || row.date.startsWith(artMonth)) && (!activity || row.description === activity)), [scope, artMonth, activity]);
  const productionIds = new Set(productionArts.map(row => row.id));
  const productionAttributions = scope.artAttributions.filter(row => productionIds.has(row.artId));
  const productionAuthors = distinct(productionAttributions.map(row => row.professionalId));
  const productionCompanies = distinct(productionAttributions.map(row => row.companyId));
  const productionAuthorIds = new Set(productionAuthors);
  const recordScope: ProfessionalScope = view === 'producao' ? { ...scope,
    profiles: scope.profiles.filter(row => productionAuthorIds.has(row.id)), profileIds: productionAuthorIds,
    arts: productionArts, artAttributions: productionAttributions,
    technicalLinks: scope.technicalLinks.filter(row => productionAuthorIds.has(row.professionalId)),
    activeLinks: scope.activeLinks.filter(row => productionAuthorIds.has(row.professionalId)),
    qsaConfirmed: scope.qsaConfirmed.filter(row => row.professionalId && productionAuthorIds.has(row.professionalId)),
    qsaSuggestions: scope.qsaSuggestions.filter(row => row.professionalId && productionAuthorIds.has(row.professionalId)),
  } : scope;
  const allMonths = scope.dataset.months.filter(month => month >= bounds.start.slice(0, 7) && month <= bounds.end.slice(0, 7));
  useEffect(() => { if (artMonth && !allMonths.includes(artMonth)) setArtMonth(''); }, [artMonth, allMonths.join('|')]);
  const chooseProfessionals = (ids: string[], label: string) => setSelection({ ids: distinct(ids), label });
  const openProfessional = (id: string) => { setRecordsOpen(false); setProfessionalId(id); };
  const profileById = useMemo(() => new Map(scope.profiles.map(row => [row.id, row])), [scope]);

  const relationshipData = useMemo(() => {
    if (relationship === 'rt') return network;
    const byCompany = new Map(scope.dataset.establishments.filter(row => row.branch === 'Matriz').map(row => [row.companyId, row]));
    const links = new Map<string, { source: string; target: string; value: number; professionalIds: string[]; companyIds: string[] }>();
    for (const row of scope.qsaConfirmed) {
      if (!row.professionalId) continue;
      const profile = scope.profiles.find(profile => profile.id === row.professionalId);
      const establishment = byCompany.get(row.companyId);
      if (!profile || !establishment) continue;
      const source = profile.modality;
      const target = establishment.cnaeMain || 'CNAE não informado';
      const key = `${source}|${target}`;
      const bucket = links.get(key) ?? { source, target, value: 0, professionalIds: [], companyIds: [] };
      bucket.value++; bucket.professionalIds.push(profile.id); bucket.companyIds.push(row.companyId); links.set(key, bucket);
    }
    const edges = [...links.values()].map(row => ({ ...row, professionalIds: distinct(row.professionalIds), companyIds: distinct(row.companyIds) }));
    return { nodes: distinct(edges.flatMap(row => [row.source, row.target])).map(name => ({ name, id: name, kind: modalities.includes(name) ? 'modalidade' : 'cnae' })), links: edges, note: 'Somente vínculos societários confirmados por chave interna na demonstração; sociedade não representa responsabilidade técnica.' };
  }, [network, scope, companyScope, relationship, modalities.join('|')]);
  const sankeyOption = {
    tooltip: { trigger: 'item', formatter: (p: any) => p.dataType === 'edge' ? `${p.data.source} → ${p.data.target}<br/>${num(p.data.value)} ${relationship === 'rt' ? 'vínculos técnicos' : 'relações societárias confirmadas'}` : p.name },
    series: [{ type: 'sankey', left: 8, right: 91, top: 15, bottom: 10, nodeWidth: 10, nodeGap: 12, layoutIterations: 32, data: relationshipData.nodes.map((row, index) => ({ name: row.name, itemStyle: { color: chartColors[index % chartColors.length] } })), links: relationshipData.links, label: { color: '#15265C', fontSize: 12, width: 125, overflow: 'truncate' }, lineStyle: { color: 'source', curveness: .45, opacity: .26 }, emphasis: { focus: 'adjacency', lineStyle: { opacity: .6 } } }],
  };
  const partnerHistogram = useMemo(() => {
    const rows = scope.profiles.map(profile => ({ id: profile.id, companies: new Set(scope.qsaConfirmed.filter(row => row.professionalId === profile.id).map(row => row.companyId)).size }));
    return [{ label: 'Nenhuma', min: 0, max: 0 }, { label: '1 empresa', min: 1, max: 1 }, { label: '2 empresas', min: 2, max: 2 }, { label: '3 ou mais', min: 3, max: Infinity }].map(bucket => ({ ...bucket, professionalIds: rows.filter(row => row.companies >= bucket.min && row.companies <= bucket.max).map(row => row.id), professionals: rows.filter(row => row.companies >= bucket.min && row.companies <= bucket.max).length }));
  }, [scope]);
  const displayedHistogram = relationship === 'rt' ? histogram : partnerHistogram;

  const cohortYears = distinct(cohorts.map(row => String(row.year))).sort();
  const recentYears = cohortYears.slice(-8);
  const olderYears = cohortYears.slice(0, -8);
  const yearLabels = olderYears.length ? [`Até ${olderYears.at(-1)}`, ...recentYears] : recentYears;
  const cohortModalities = distinct(cohorts.map(row => row.modality)).sort();
  const cohortCells = cohortModalities.flatMap((label, y) => yearLabels.map((year, x) => {
    const rows = cohorts.filter(row => row.modality === label && (year.startsWith('Até ') ? olderYears.includes(String(row.year)) : String(row.year) === year));
    return { x, y, value: rows.reduce((sum, row) => sum + row.value, 0), ids: distinct(rows.flatMap(row => row.professionalIds)) };
  }));
  const productionModalities = distinct(productionAttributions.map(row => profileById.get(row.professionalId)?.modality ?? '')).filter(Boolean).sort();
  const productionActivities = distinct(productionArts.map(row => row.description)).sort();
  const artsById = new Map(productionArts.map(row => [row.id, row]));
  const activityCells = productionActivities.flatMap((description, y) => productionModalities.map((label, x) => {
    const rows = productionAttributions.filter(row => profileById.get(row.professionalId)?.modality === label && artsById.get(row.artId)?.description === description);
    return { x, y, value: distinct(rows.map(row => row.artId)).length, ids: distinct(rows.map(row => row.professionalId)) };
  }));
  const productionMonths = artMonth ? [artMonth] : allMonths;
  const priorMonthFor = (month: string) => {
    const [year, index] = month.split('-').map(Number);
    return new Date(Date.UTC(year, index - 1 - companyScope.filters.period, 1)).toISOString().slice(0, 7);
  };
  const productionPriorArts = artMonth ? priorArts.filter(row => row.date.startsWith(priorMonthFor(artMonth))) : priorArts;
  const productionSeries = productionMonths.map(month => {
    const artIds = new Set(productionArts.filter(row => row.date.startsWith(month)).map(row => row.id));
    return { month, arts: artIds.size, authors: new Set(productionAttributions.filter(row => artIds.has(row.artId)).map(row => row.professionalId)).size,
      priorArts: priorArts.filter(row => row.date.startsWith(priorMonthFor(month))).length };
  });
  const productionOption = { grid: { top: 18, bottom: 62, left: 8, right: 16, containLabel: true }, tooltip: { trigger: 'axis' }, legend: { bottom: 0, textStyle: { fontSize: 12 } }, xAxis: { type: 'category', data: productionSeries.map(row => monthLabel(row.month)), axisLabel: { fontSize: 12 }, axisTick: { show: false } }, yAxis: { type: 'value', axisLabel: { fontSize: 12 }, splitLine: { lineStyle: { color: '#EDF0F6' } } }, series: [{ type: 'bar', name: 'ARTs distintas', data: productionSeries.map(row => row.arts), barMaxWidth: 28, itemStyle: { color: '#6077B6', borderRadius: [3, 3, 0, 0] } }, { type: 'line', name: 'Autores distintos no mês', data: productionSeries.map(row => row.authors), symbolSize: 5, lineStyle: { width: 2.5 }, itemStyle: { color: '#3662E2' } }] };

  if (comparison) productionOption.series.push({ type: 'line', name: 'ARTs · janela anterior', data: productionSeries.map(row => row.priorArts), symbolSize: 4, lineStyle: { width: 2, type: 'dashed' } as any, itemStyle: { color: '#15265C' } } as any);

  const renderMetrics = () => {
    if (view === 'producao') return <><Metric id="linkedArts" label="ARTs com autoria declarada" value={productionArts.length} note="ARTs distintas no período e na seleção" prior={comparison ? productionPriorArts.length : undefined} onInfo={onInfo} onClick={() => { chooseProfessionals(productionAuthors, 'Autores das ARTs selecionadas'); setRecordsOpen(true); }} /><Metric id="artAuthors" label="Autores no período" value={productionAuthors.length} note="Pessoas distintas; não somar autores por mês" onInfo={onInfo} /><Metric id="artCompanies" label="Empresas relacionadas às ARTs" value={productionCompanies.length} note="Pessoas jurídicas distintas" onInfo={onInfo} onClick={() => onSubset(productionCompanies, 'Empresas das ARTs com autoria declarada', 'Ponte profissional–ART declarada na base fictícia; não inferida apenas pela responsabilidade técnica.')} /></>;
    if (view === 'conexoes') return <><Metric id="professionals" label="Profissionais no recorte" value={metrics.professionals} note="Inclui pessoas sem vínculo empresarial" onInfo={onInfo} onClick={() => setRecordsOpen(true)} /><Metric id={relationship === 'rt' ? 'withActiveLinks' : 'confirmedPartners'} label={relationship === 'rt' ? 'Com empresas por RT vigente' : 'Sócios com identidade confirmada'} value={relationship === 'rt' ? metrics.withActiveLinks : distinct(scope.qsaConfirmed.flatMap(row => row.professionalId ? [row.professionalId] : [])).length} note={relationship === 'rt' ? `${num(metrics.activeLinks)} vínculos técnicos vigentes` : 'Somente correspondências revisadas por chave interna'} onInfo={onInfo} /><Metric id={relationship === 'rt' ? 'linkedCompanies' : 'partnerCompanies'} label="Empresas conectadas" value={relationship === 'rt' ? metrics.linkedCompanies : distinct(scope.qsaConfirmed.map(row => row.companyId)).length} note={relationship === 'rt' ? 'Por responsabilidade técnica vigente' : 'Por vínculo societário confirmado'} onInfo={onInfo} onClick={() => onSubset(relationship === 'rt' ? distinct(scope.activeLinks.map(row => row.companyId)) : distinct(scope.qsaConfirmed.map(row => row.companyId)), relationship === 'rt' ? 'Empresas com RTs do recorte profissional' : 'Empresas dos sócios confirmados', relationship === 'rt' ? 'Relações de responsabilidade técnica vigentes na competência.' : 'Sociedade identificada por chave interna revisada; não equivale a responsabilidade técnica.')} /></>;
    return <><Metric id="professionals" label="Profissionais registrados" value={metrics.professionals} note="Cadastro interno de pessoas distintas" onInfo={onInfo} onClick={() => setRecordsOpen(true)} /><Metric id="activeProfessionals" label="Registro profissional ativo" value={metrics.activeProfessionals} note={`${num(metrics.interruptedProfessionals)} interrompidos · ${num(metrics.cancelledProfessionals)} cancelados`} onInfo={onInfo} onClick={() => { setStatus('Ativo'); setSelection(null); }} /><Metric id="newProfessionals" label="Entradas no período" value={metrics.newProfessionals} note={`Primeiro registro nos últimos ${companyScope.filters.period} meses`} prior={priorEntries} onInfo={onInfo} /></>;
  };

  return <div className="p-professional-analysis">
    <section className="p-summary p-professional-metrics" aria-label="Indicadores do universo profissional">{renderMetrics()}</section>
    <div className="p-professional-toolbar"><div className="p-controls"><select aria-label="Filtrar modalidade profissional" value={modality} onChange={event => { setModality(event.target.value); setSelection(null); }}><option value="">Todas as modalidades</option>{modalities.map(value => <option key={value}>{value}</option>)}</select><select aria-label="Filtrar situação profissional" value={status} onChange={event => { setStatus(event.target.value as ProfessionalStatus | ''); setSelection(null); }}><option value="">Todas as situações</option><option>Ativo</option><option>Interrompido</option><option>Cancelado</option></select>{view === 'conexoes' && <div className="p-toggle" role="group" aria-label="Tipo de relação empresarial"><button aria-pressed={relationship === 'rt'} className={relationship === 'rt' ? 'active' : ''} onClick={() => { setRelationship('rt'); setSelection(null); }}>Responsabilidade técnica</button><button aria-pressed={relationship === 'qsa'} className={relationship === 'qsa' ? 'active' : ''} onClick={() => { setRelationship('qsa'); setSelection(null); }}>Sociedade confirmada</button></div>}</div><button className="p-secondary" onClick={() => setRecordsOpen(true)}><UsersRound size={15} />Explorar profissionais <ArrowUpRight size={14} /></button></div>
    {(selection || artMonth || activity) && <div className="p-professional-context"><span>{selection?.label}{artMonth && ` · ${monthLabel(artMonth)}`}{activity && ` · ${activity}`}</span><button className="p-text-button" onClick={() => { setSelection(null); setArtMonth(''); setActivity(''); }}><X size={14} />Limpar seleção profissional</button></div>}
    {!scope.profiles.length ? <div className="p-empty"><UsersRound size={26} /><h3>Nenhum profissional neste recorte</h3><p>Revise a seleção profissional e os filtros de território ou empresas.</p>{(modality || status || selection) && <button className="p-secondary" onClick={() => { setModality(''); setStatus(''); setSelection(null); }}>Limpar filtros profissionais</button>}</div> : view === 'conexoes' ? <div className="p-grid two"><Panel title={relationship === 'rt' ? 'Profissionais e empresas · relações vigentes' : 'Profissionais e empresas · relações societárias'} subtitle={relationship === 'rt' ? 'Modalidade → CNAE principal · espessura representa vínculos, não pessoas distintas.' : 'Modalidade → CNAE principal · somente identidades confirmadas e revisadas.'}>{relationshipData.links.length ? <Chart option={sankeyOption} height={chartHeight} ariaLabel={relationship === 'rt' ? 'Fluxo de vínculos técnicos entre modalidades profissionais e atividades das empresas' : 'Fluxo de relações societárias confirmadas entre modalidades e atividades empresariais'} onPick={p => {
      if (p.dataType === 'edge') { const row = relationshipData.links.find(row => row.source === p.data.source && row.target === p.data.target); if (row) { chooseProfessionals(row.professionalIds, `${row.source} → ${row.target}`); onSubset(row.companyIds, `${row.source} → ${row.target}`, relationship === 'rt' ? 'Empresas e profissionais conectados por vínculos técnicos vigentes.' : 'Empresas e profissionais conectados por sociedade confirmada na demonstração. Sociedade não equivale a RT.'); } }
      else if (modalities.includes(p.name)) { setModality(p.name); setSelection(null); }
      else { const rows = relationshipData.links.filter(row => row.target === p.name); if (rows.length) { chooseProfessionals(rows.flatMap(row => row.professionalIds), `Profissionais conectados ao CNAE ${p.name}`); onSubset(distinct(rows.flatMap(row => row.companyIds)), `Empresas conectadas · ${p.name}`, 'Seleção da rede agregada de relações confirmadas.'); } }
    }} /> : <p className="p-empty">Sem relações confirmadas para representar neste recorte.</p>}<p className="p-source">{relationshipData.note}</p></Panel><Panel title="Concentração das conexões empresariais" subtitle={relationship === 'rt' ? 'Número de empresas distintas por profissional com RT vigente; inclui a faixa sem vínculos.' : 'Número de empresas distintas por sócio confirmado; inclui profissionais sem sociedade identificada.'}><Chart option={barOption(displayedHistogram.map(row => ({ label: row.label, value: row.professionals })), 'Profissionais distintos')} height={chartHeight} ariaLabel="Histograma de profissionais por quantidade de empresas conectadas" onPick={p => { const row = displayedHistogram[p.dataIndex]; if (row) chooseProfessionals(row.professionalIds, `${relationship === 'rt' ? 'RT' : 'Sociedade'} · ${row.label}`); }} /><p className="p-source">{relationship === 'rt' ? 'Pessoas e empresas são contadas distintamente; vários vínculos com a mesma empresa não multiplicam a contagem de conexões.' : `${num(scope.qsaSuggestions.length)} sugestões por nome ficam fora da rede confirmada. Nome e CPF mascarado não comprovam identidade.`}</p></Panel></div> : view === 'producao' ? <div className="p-grid two"><Panel title="Produção técnica ao longo do período" subtitle="ARTs distintas e autores distintos em cada mês; clique para selecionar uma competência."><Chart option={productionOption} height={chartHeight} ariaLabel="Evolução mensal de ARTs com autoria declarada e profissionais autores distintos" onPick={p => { const row = productionSeries[p.dataIndex]; if (row) setArtMonth(value => value === row.month ? '' : row.month); }} /><p className="p-source">Autoria sintética declarada em ponte própria. A existência de RT, isoladamente, não permite atribuir uma ART a alguém.</p></Panel><Panel title="Modalidade profissional × atividade da ART" subtitle="Contagem distinta de ARTs atribuídas aos profissionais de cada modalidade.">{activityCells.length ? <Chart option={heatmapOption(productionModalities, productionActivities, activityCells.map(row => [row.x, row.y, row.value]))} height={chartHeight} ariaLabel="Matriz das ARTs atribuídas por modalidade dos autores e atividade técnica" onPick={p => { const [x, y] = p.value; const cell = activityCells.find(row => row.x === x && row.y === y); if (cell?.value) { setActivity(productionActivities[y]); setModality(productionModalities[x]); chooseProfessionals(cell.ids, `${productionModalities[x]} · ${productionActivities[y]}`); } }} /> : <p className="p-empty">Sem ARTs com autoria declarada neste recorte.</p>}<p className="p-source">CAO pertence à empresa. CAT profissional exige sua própria fonte e modelo; não é deduzida das CAOs nem simulada neste painel.</p></Panel></div> : <div className="p-grid two"><Panel title="Coortes de entrada no cadastro" subtitle="Ano do primeiro registro × modalidade · anos anteriores agrupados; pessoas distintas."><Chart option={heatmapOption(yearLabels, cohortModalities, cohortCells.map(row => [row.x, row.y, row.value]))} height={chartHeight} ariaLabel="Matriz das coortes de entrada profissional no cadastro CREA por ano e modalidade" onPick={p => { const [x, y] = p.value; const row = cohortCells.find(row => row.x === x && row.y === y); if (row?.value) chooseProfessionals(row.ids, `${cohortModalities[y]} · entrada ${yearLabels[x]}`); }} /><p className="p-source">Estoque completo por coorte · entradas no período contam apenas a janela selecionada.</p></Panel><Panel title={territoryView === 'map' ? "Presença profissional no território" : "Cadastro profissional e contexto de emprego"} subtitle={territoryView === 'map' ? "Pessoas distintas por domicílio cadastral; selecione um município." : "Ponto = município · cadastro e emprego têm universos distintos."} actions={<select aria-label="Visualização do território profissional" value={territoryView} onChange={event => setTerritoryView(event.target.value)}><option value="map">Mapa</option><option value="employment">Profissionais × emprego</option></select>}>{territoryView === 'map' ? <ProfessionalMap rows={territory} onCity={onCity} height={chartHeight} /> : <><Chart option={scatterOption(territory.map(row => ({label: row.label, x: row.professionals, y: row.employment})), 'Profissionais cadastrados', 'Empregos agregados')} height={chartHeight} ariaLabel="Dispersão municipal de profissionais cadastrados e estoque agregado de empregos; não corresponde a vínculo de emprego individual" onPick={p => { const row = territory.find(row => row.label === p.data?.name); if (row) onCity(row.cityId); }} /><p className="p-source">Emprego RAIS/CAGED demonstrativo; não estima desemprego nem cobertura profissional.</p></>}</Panel></div>}
    <details className="p-professional-evidence"><summary>Fontes e relações entre as bases</summary><p>{scope.scopeNote}</p><p>Fontes externas de emprego e formação contextualizam território e modalidade; não identificam trabalhadores ou comprovam registro individual. Participação societária confirmada, vínculo RT e autoria de ART são relações próprias. Sugestões por nome exigem revisão humana. ARTs sem ponte de autoria permanecem na análise empresarial e não são atribuídas a pessoas. CAO pertence à empresa; CAT profissional exige uma fonte própria.</p></details>
    {recordsOpen && <ReportOverlay title="Explorar profissionais" subtitle="Dados fictícios relacionados; nenhuma identificação de trabalhador é obtida de RAIS ou CAGED." onClose={() => setRecordsOpen(false)}><ProfessionalRecords scope={recordScope} canExport={canExport} onProfessional={openProfessional} /></ReportOverlay>}
    {professionalId && <ProfessionalDrawer professionalId={professionalId} scope={recordScope} onClose={() => setProfessionalId(null)} onCompany={id => { setProfessionalId(null); onCompany(id); }} />}
  </div>;
}
