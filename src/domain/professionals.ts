import type { Art, Dataset, IndicatorDefinition, Professional, TechnicalLink } from './types';
import { inWindow, isActiveLink, selectScope } from './engine';
import type { Scope } from './engine';

/** Separate synthetic relations preserve the previously validated company dataset. */
export type ProfessionalStatus = 'Ativo' | 'Interrompido' | 'Cancelado';
export interface ProfessionalProfile extends Professional {
  cityId: string;
  registeredAt: string;
  status: ProfessionalStatus;
  statusSince: string;
  title: string;
  graduatedYear: number;
}
export interface ProfessionalEducation {
  id: string;
  professionalId: string;
  level: 'Graduação' | 'Especialização';
  course: string;
  institutionId: string;
  institution: string;
  completedYear: number;
}
export type QsaMatchStatus = 'Confirmado por chave interna' | 'Sugestão por nome' | 'Sem correspondência';
export interface QsaRelationship {
  id: string;
  companyId: string;
  partyName: string;
  role: 'Sócio' | 'Sócio-administrador';
  professionalId?: string;
  matchStatus: QsaMatchStatus;
  evidence: string;
  reviewedAt?: string;
}
export interface ProfessionalArtAttribution {
  id: string;
  artId: string;
  professionalId: string;
  technicalLinkId: string;
  companyId: string;
  role: 'Autor declarado na demonstração';
  method: 'Autoria sintética declarada';
}
export interface ProfessionalModel {
  profiles: ProfessionalProfile[];
  education: ProfessionalEducation[];
  qsa: QsaRelationship[];
  artAttributions: ProfessionalArtAttribution[];
  metadata: {
    synthetic: true;
    seed: number;
    snapshotDate: string;
    updatedAt: string;
    ruleVersion: string;
    territorialUnit: string;
    artAttributionMethod: string;
    qsaMethod: string;
    limitations: string[];
  };
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const hash = (value: string, seed: number) => {
  let result = (2166136261 ^ seed) >>> 0;
  for (const character of value) { result ^= character.charCodeAt(0); result = Math.imul(result, 16777619) >>> 0; }
  return result;
};
const modalityTitles: Record<string, { title: string; course: string }> = {
  Civil: { title: 'Engenheiro civil', course: 'Engenharia Civil' },
  Elétrica: { title: 'Engenheiro eletricista', course: 'Engenharia Elétrica' },
  Mecânica: { title: 'Engenheiro mecânico', course: 'Engenharia Mecânica' },
  Agronomia: { title: 'Engenheiro agrônomo', course: 'Agronomia' },
  'Segurança do trabalho': { title: 'Engenheiro de segurança do trabalho', course: 'Engenharia Civil' },
};
const modelCache = new WeakMap<Dataset, ProfessionalModel>();

/** No CPF, real person or automatic name-based identity match is generated. */
export function buildProfessionalModel(dataset: Dataset): ProfessionalModel {
  const cached = modelCache.get(dataset);
  if (cached) return cached;
  const linksByProfessional = new Map<string, TechnicalLink[]>();
  const linksByCompany = new Map<string, TechnicalLink[]>();
  for (const link of dataset.technicalLinks) {
    linksByProfessional.set(link.professionalId, [...(linksByProfessional.get(link.professionalId) ?? []), link]);
    linksByCompany.set(link.companyId, [...(linksByCompany.get(link.companyId) ?? []), link]);
  }
  const profiles = dataset.professionals.map((professional): ProfessionalProfile => {
    const code = hash(professional.id, dataset.seed);
    const links = linksByProfessional.get(professional.id) ?? [];
    const firstLink = links.map(link => link.startDate).sort()[0];
    const proposedYear = 2010 + code % 17;
    const registeredYear = Math.min(proposedYear, firstLink ? Number(firstLink.slice(0, 4)) - 1 : 2026);
    const registeredAt = `${registeredYear}-${String(1 + (code >>> 7) % 9).padStart(2, '0')}-${String(1 + (code >>> 12) % 27).padStart(2, '0')}`;
    const currentLink = links.some(link => isActiveLink(link, dataset.snapshotDate));
    const status: ProfessionalStatus = currentLink || code % 10 < 7 ? 'Ativo' : code % 10 < 9 ? 'Interrompido' : 'Cancelado';
    const latestEnd = links.map(link => link.endDate ?? '').filter(date => date && date <= dataset.snapshotDate).sort().at(-1);
    const proposedSince = `2026-${String(1 + (code >>> 16) % 8).padStart(2, '0')}-01`;
    // Status is a snapshot, never a claim about historical attrition or retention.
    const statusSince = status === 'Ativo' ? registeredAt : [registeredAt, latestEnd ?? '', proposedSince].sort().at(-1)!;
    return { ...professional, cityId: dataset.cities[(code >>> 5) % dataset.cities.length].id, registeredAt, status,
      statusSince, title: modalityTitles[professional.modality]?.title ?? professional.modality,
      graduatedYear: registeredYear - 1 - (code >>> 20) % 4 };
  });
  const education: ProfessionalEducation[] = profiles.flatMap(profile => {
    const code = hash(`education:${profile.id}`, dataset.seed);
    const institutionId = `IES-DEMO-${String(1 + code % 8).padStart(2, '0')}`;
    const common = { professionalId: profile.id, institutionId, institution: `Instituto Superior Demonstrativo ${1 + code % 8}` };
    const rows: ProfessionalEducation[] = [{ ...common, id: `EDU-${profile.id}-1`, level: 'Graduação',
      course: modalityTitles[profile.modality]?.course ?? profile.modality, completedYear: profile.graduatedYear }];
    if (profile.modality === 'Segurança do trabalho') rows.push({ ...common, id: `EDU-${profile.id}-2`,
      level: 'Especialização', course: 'Engenharia de Segurança do Trabalho', completedYear: Number(profile.registeredAt.slice(0, 4)) });
    return rows;
  });
  const qsa: QsaRelationship[] = [];
  profiles.filter((_, index) => index % 4 === 0).forEach((profile, index) => {
    const links = linksByProfessional.get(profile.id) ?? [];
    const code = hash(`qsa:${profile.id}`, dataset.seed);
    const companyId = index % 2 === 0 && links.length ? links[0].companyId : dataset.companies[code % dataset.companies.length].id;
    const confirmed = index % 3 !== 0;
    qsa.push({ id: `QSA-DEMO-${String(index + 1).padStart(4, '0')}`, companyId, partyName: profile.name,
      role: index % 2 ? 'Sócio' : 'Sócio-administrador', professionalId: profile.id,
      matchStatus: confirmed ? 'Confirmado por chave interna' : 'Sugestão por nome',
      evidence: confirmed ? 'Identificador interno fictício, autorizado e validado na demonstração; não utiliza CPF público.'
        : 'Nome normalizado apenas sugere um candidato; homônimos e CPF mascarado impedem confirmar identidade.',
      ...(confirmed ? { reviewedAt: dataset.updatedAt } : {}) });
  });
  for (let index = 0; index < 60; index++) qsa.push({ id: `QSA-EXTERNO-${String(index + 1).padStart(4, '0')}`,
    companyId: dataset.companies[hash(`external-qsa:${index}`, dataset.seed) % dataset.companies.length].id,
    partyName: `Pessoa jurídica ou sócio demonstrativo ${String(index + 1).padStart(3, '0')}`, role: 'Sócio',
    matchStatus: 'Sem correspondência', evidence: 'Nenhuma identidade profissional validada; permanece somente na origem externa.' });

  const artAttributions: ProfessionalArtAttribution[] = [];
  for (const art of dataset.arts) {
    const eligible = (linksByCompany.get(art.companyId) ?? []).filter(link => link.modality === art.modality
      && link.startDate <= art.date && (!link.endDate || link.endDate > art.date));
    if (!eligible.length) continue;
    const link = eligible[hash(`author:${art.id}`, dataset.seed) % eligible.length];
    // A fictional declared author is a new fact. Active RT is a generation guard,
    // not an analytical rule that infers real-world authorship from an RT link.
    artAttributions.push({ id: `AUTORIA-${art.id}`, artId: art.id, professionalId: link.professionalId,
      technicalLinkId: link.id, companyId: art.companyId, role: 'Autor declarado na demonstração', method: 'Autoria sintética declarada' });
  }
  const result: ProfessionalModel = { profiles, education, qsa, artAttributions, metadata: {
    synthetic: true, seed: dataset.seed, snapshotDate: dataset.snapshotDate, updatedAt: dataset.updatedAt,
    ruleVersion: 'profissionais-demo-1.0', territorialUnit: 'Domicílio cadastral do profissional',
    artAttributionMethod: 'Autoria sintética declarada; em produção exige autoria expressa na fonte ART.',
    qsaMethod: 'Chave interna validada confirma; similaridade nominal somente sugere revisão; sócio não equivale a RTS.',
    limitations: ['Formação, domicílio e status são fictícios; títulos não representam atribuições legais individuais.',
      'Coorte significa ano de ingresso cadastral; status atual não permite estimar retenção histórica.',
      'RAIS/CAGED/CBO são agregados territoriais, sem vínculo individual a profissionais ou CNPJs.',
      'CAT profissional não foi simulada; CAO pertence à empresa.',
      'Dívidas empresariais não são atribuídas aos profissionais vinculados ou sócios.'],
  } };
  modelCache.set(dataset, result);
  return result;
}

export interface ProfessionalFilters {
  modalities?: string[];
  statuses?: ProfessionalStatus[];
  search?: string;
  companySubset?: string[];
  professionalIds?: string[];
}
export interface ProfessionalScope {
  dataset: Dataset;
  model: ProfessionalModel;
  companyScope: Scope;
  profiles: ProfessionalProfile[];
  profileIds: Set<string>;
  technicalLinks: TechnicalLink[];
  activeLinks: TechnicalLink[];
  qsaConfirmed: QsaRelationship[];
  qsaSuggestions: QsaRelationship[];
  artAttributions: ProfessionalArtAttribution[];
  arts: Art[];
  sourceArts: Art[];
  employment: Dataset['employment'];
  companyRestricted: boolean;
  scopeNote: string;
}

/** Geography describes residence. Company constraints traverse explicit RT/QSA bridges. */
export function selectProfessionalScope(companyScope: Scope, options: ProfessionalFilters = {}): ProfessionalScope {
  const { dataset, filters, anchor } = companyScope;
  const model = buildProfessionalModel(dataset);
  const cityById = new Map(dataset.cities.map(city => [city.id, city]));
  const baseline = selectScope(dataset, filters);
  const hasImplicitSubset = baseline.companyIds.size !== companyScope.companyIds.size
    || [...companyScope.companyIds].some(id => !baseline.companyIds.has(id));
  const companySubset = options.companySubset ?? (hasImplicitSubset ? [...companyScope.companyIds] : undefined);
  const companyRestricted = Boolean(companySubset !== undefined || filters.cnaeCodes.length || filters.sizes.length
    || filters.rfbStatuses.length || filters.registrationStatuses.length || filters.search.trim() || filters.onlyRelated);
  const eligibleCompanyScope = selectScope(dataset, { ...filters, greIds: [], cityIds: [] }, companySubset);
  const companyIds = eligibleCompanyScope.companyIds;
  const relatedProfessionalIds = new Set([
    ...dataset.technicalLinks.filter(link => link.startDate <= anchor && companyIds.has(link.companyId)).map(link => link.professionalId),
    ...model.qsa.filter(row => row.matchStatus === 'Confirmado por chave interna' && companyIds.has(row.companyId)).map(row => row.professionalId!),
  ]);
  const selectedProfessionals = options.professionalIds === undefined ? undefined : new Set(options.professionalIds);
  const query = normalize(options.search ?? '');
  const profiles = model.profiles.filter(profile => {
    const city = cityById.get(profile.cityId);
    return profile.registeredAt <= anchor && Boolean(city)
      && (!filters.cityIds.length || filters.cityIds.includes(profile.cityId))
      && (!filters.greIds.length || filters.greIds.includes(city!.greId))
      && (!options.modalities?.length || options.modalities.includes(profile.modality))
      && (!options.statuses?.length || options.statuses.includes(profile.status))
      && (!query || normalize(`${profile.name} ${profile.registration} ${profile.title}`).includes(query))
      && (!companyRestricted || relatedProfessionalIds.has(profile.id))
      && (!selectedProfessionals || selectedProfessionals.has(profile.id));
  });
  const profileIds = new Set(profiles.map(profile => profile.id));
  const technicalLinks = dataset.technicalLinks.filter(link => profileIds.has(link.professionalId)
    && link.startDate <= anchor && (!companyRestricted || companyIds.has(link.companyId)));
  const activeLinks = technicalLinks.filter(link => isActiveLink(link, anchor));
  const relevantQsa = model.qsa.filter(row => row.professionalId && profileIds.has(row.professionalId)
    && (!companyRestricted || companyIds.has(row.companyId)));
  const sourceArts = dataset.arts.filter(art => inWindow(art.date, filters.period, anchor)
    && (!companyRestricted || companyIds.has(art.companyId)));
  const sourceArtIds = new Set(sourceArts.map(art => art.id));
  const artAttributions = model.artAttributions.filter(row => profileIds.has(row.professionalId) && sourceArtIds.has(row.artId));
  const attributedIds = new Set(artAttributions.map(row => row.artId));
  return { dataset, model, companyScope, profiles, profileIds, technicalLinks, activeLinks,
    qsaConfirmed: relevantQsa.filter(row => row.matchStatus === 'Confirmado por chave interna'),
    qsaSuggestions: relevantQsa.filter(row => row.matchStatus === 'Sugestão por nome'), artAttributions,
    arts: sourceArts.filter(art => attributedIds.has(art.id)), sourceArts,
    employment: companyScope.employment, companyRestricted,
    scopeNote: companyRestricted
      ? 'Profissionais associados às empresas selecionadas por RT histórico ou QSA confirmado. Território representa o domicílio profissional; vínculos e autoria permanecem entidades distintas.'
      : 'Universo profissional cadastral, inclusive pessoas sem vínculo empresarial. Território representa o domicílio profissional; emprego público permanece agregado por município, CNAE e mês.',
  };
}

export interface ProfessionalMetrics {
  professionals: number;
  activeProfessionals: number;
  interruptedProfessionals: number;
  cancelledProfessionals: number;
  withActiveLinks: number;
  withoutActiveLinks: number;
  activeLinks: number;
  linkedCompanies: number;
  newProfessionals: number;
  confirmedPartners: number;
  suggestedPartners: number;
  partnerCompanies: number;
  linkedArts: number;
  artAuthors: number;
  artCompanies: number;
  unattributedArts: number;
}
export function summarizeProfessionals(scope: ProfessionalScope): ProfessionalMetrics {
  const withLinks = new Set(scope.activeLinks.map(link => link.professionalId));
  const allAttributedArtIds = new Set(scope.model.artAttributions.map(row => row.artId));
  return {
    professionals: scope.profiles.length,
    activeProfessionals: scope.profiles.filter(profile => profile.status === 'Ativo').length,
    interruptedProfessionals: scope.profiles.filter(profile => profile.status === 'Interrompido').length,
    cancelledProfessionals: scope.profiles.filter(profile => profile.status === 'Cancelado').length,
    withActiveLinks: withLinks.size, withoutActiveLinks: scope.profiles.length - withLinks.size,
    activeLinks: scope.activeLinks.length, linkedCompanies: new Set(scope.activeLinks.map(link => link.companyId)).size,
    newProfessionals: scope.profiles.filter(profile => inWindow(profile.registeredAt, scope.companyScope.filters.period, scope.companyScope.anchor)).length,
    confirmedPartners: new Set(scope.qsaConfirmed.map(row => row.professionalId)).size,
    suggestedPartners: new Set(scope.qsaSuggestions.map(row => row.professionalId)).size,
    partnerCompanies: new Set(scope.qsaConfirmed.map(row => row.companyId)).size,
    linkedArts: new Set(scope.artAttributions.map(row => row.artId)).size,
    artAuthors: new Set(scope.artAttributions.map(row => row.professionalId)).size,
    artCompanies: new Set(scope.artAttributions.map(row => row.companyId)).size,
    unattributedArts: scope.sourceArts.filter(art => !allAttributedArtIds.has(art.id)).length,
  };
}

export type ProfessionalGroupDimension = 'modality' | 'title' | 'city' | 'status' | 'cohort';
export interface ProfessionalGroup {
  id: string;
  label: string;
  professionals: number;
  activeProfessionals: number;
  activeLinks: number;
  companyIds: string[];
  professionalIds: string[];
}
export function groupProfessionals(scope: ProfessionalScope, dimension: ProfessionalGroupDimension): ProfessionalGroup[] {
  const cityById = new Map(scope.dataset.cities.map(city => [city.id, city]));
  const buckets = new Map<string, ProfessionalProfile[]>();
  for (const profile of scope.profiles) {
    const key = dimension === 'cohort' ? profile.registeredAt.slice(0, 4) : dimension === 'city' ? profile.cityId : profile[dimension];
    buckets.set(key, [...(buckets.get(key) ?? []), profile]);
  }
  return [...buckets].map(([id, profiles]) => {
    const ids = new Set(profiles.map(profile => profile.id));
    const links = scope.activeLinks.filter(link => ids.has(link.professionalId));
    return { id, label: dimension === 'city' ? cityById.get(id)?.name ?? id : id,
      professionals: profiles.length, activeProfessionals: profiles.filter(profile => profile.status === 'Ativo').length,
      activeLinks: links.length, companyIds: [...new Set(links.map(link => link.companyId))], professionalIds: [...ids] };
  }).sort((a, b) => dimension === 'cohort' ? a.id.localeCompare(b.id) : b.professionals - a.professionals || a.label.localeCompare(b.label));
}

export interface ProfessionalNetwork {
  nodes: { name: string; id: string; kind: 'modalidade' | 'título' | 'cnae' }[];
  links: { source: string; target: string; value: number; professionalIds: string[]; companyIds: string[] }[];
  note: string;
}
export function buildProfessionalNetwork(scope: ProfessionalScope, dimension: 'modality' | 'title' = 'modality'): ProfessionalNetwork {
  const profiles = new Map(scope.profiles.map(profile => [profile.id, profile]));
  const representative = new Map(scope.dataset.establishments.filter(establishment => establishment.branch === 'Matriz').map(establishment => [establishment.companyId, establishment]));
  const cnaes = new Map(scope.dataset.cnaes.map(cnae => [cnae.code, cnae]));
  const nodes = new Map<string, ProfessionalNetwork['nodes'][number]>();
  const buckets = new Map<string, { source: string; target: string; links: TechnicalLink[] }>();
  for (const link of scope.activeLinks) {
    const profile = profiles.get(link.professionalId);
    const establishment = representative.get(link.companyId);
    if (!profile || !establishment) continue;
    const source = profile[dimension];
    const target = `${establishment.cnaeMain} · ${cnaes.get(establishment.cnaeMain)?.label ?? 'CNAE não informado'}`;
    nodes.set(source, { id: `${dimension}:${source}`, name: source, kind: dimension === 'title' ? 'título' : 'modalidade' });
    nodes.set(target, { id: `cnae:${establishment.cnaeMain}`, name: target, kind: 'cnae' });
    const key = `${source}|${target}`;
    const bucket = buckets.get(key) ?? { source, target, links: [] };
    bucket.links.push(link); buckets.set(key, bucket);
  }
  return { nodes: [...nodes.values()], links: [...buckets.values()].map(bucket => ({ source: bucket.source, target: bucket.target,
    value: bucket.links.length, professionalIds: [...new Set(bucket.links.map(link => link.professionalId))],
    companyIds: [...new Set(bucket.links.map(link => link.companyId))] })),
    note: 'Fluxo de vínculos RT vigentes → CNAE principal da matriz. Espessura conta vínculos; pessoas e empresas são contadas distintamente, sem somar fluxos como pessoas únicas.' };
}

export function buildProfessionalCohorts(scope: ProfessionalScope): { year: string; modality: string; value: number; professionalIds: string[] }[] {
  const buckets = new Map<string, { year: string; modality: string; value: number; professionalIds: string[] }>();
  for (const profile of scope.profiles) {
    const year = profile.registeredAt.slice(0, 4);
    const key = `${year}:${profile.modality}`;
    const cell = buckets.get(key) ?? { year, modality: profile.modality, value: 0, professionalIds: [] };
    cell.value++; cell.professionalIds.push(profile.id); buckets.set(key, cell);
  }
  return [...buckets.values()].sort((a, b) => a.year.localeCompare(b.year) || a.modality.localeCompare(b.modality));
}

export function buildProfessionalHistogram(scope: ProfessionalScope): { label: string; min: number; max: number; professionals: number; professionalIds: string[] }[] {
  const companies = new Map<string, Set<string>>();
  for (const link of scope.activeLinks) { const ids = companies.get(link.professionalId) ?? new Set<string>(); ids.add(link.companyId); companies.set(link.professionalId, ids); }
  const bins = [{ label: 'Sem vínculo vigente', min: 0, max: 0 }, { label: '1 empresa', min: 1, max: 1 },
    { label: '2 empresas', min: 2, max: 2 }, { label: '3–4 empresas', min: 3, max: 4 }, { label: '5+ empresas', min: 5, max: Infinity }];
  return bins.map(bin => { const professionalIds = scope.profiles.filter(profile => { const count = companies.get(profile.id)?.size ?? 0; return count >= bin.min && count <= bin.max; }).map(profile => profile.id); return { ...bin, professionals: professionalIds.length, professionalIds }; });
}

export interface ProfessionalTerritory {
  cityId: string;
  label: string;
  professionals: number;
  activeProfessionals: number;
  activeLinks: number;
  employment: number;
  growth: number | null;
  professionalIds: string[];
}
export function buildProfessionalTerritory(scope: ProfessionalScope): ProfessionalTerritory[] {
  const { filters } = scope.companyScope;
  const grouped = new Map(groupProfessionals(scope, 'city').map(row => [row.id, row]));
  return scope.dataset.cities.filter(city => (!filters.cityIds.length || filters.cityIds.includes(city.id))
    && (!filters.greIds.length || filters.greIds.includes(city.greId))).map(city => {
    const facts = scope.employment.filter(row => row.cityId === city.id);
    const months = [...new Set(facts.map(row => row.month))].sort();
    const first = facts.filter(row => row.month === months[0]).reduce((sum, row) => sum + row.stock, 0);
    const last = facts.filter(row => row.month === months.at(-1)).reduce((sum, row) => sum + row.stock, 0);
    const row = grouped.get(city.id);
    return { cityId: city.id, label: city.name, professionals: row?.professionals ?? 0,
      activeProfessionals: row?.activeProfessionals ?? 0, activeLinks: row?.activeLinks ?? 0,
      employment: last, growth: first ? (last - first) / first * 100 : null, professionalIds: row?.professionalIds ?? [] };
  });
}

const csvCell = (value: unknown) => {
  const text = String(value ?? '');
  return `"${(/^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`;
};
/** Permission is enforced again at the export boundary, independent of the button. */
export function exportProfessionalCsv(scope: ProfessionalScope, allowed: boolean): string {
  if (!allowed) throw new Error('Este perfil demonstrativo não permite exportar profissionais.');
  const cityById = new Map(scope.dataset.cities.map(city => [city.id, city]));
  const header = ['ID fictício', 'Nome fictício', 'Registro demonstrativo', 'Modalidade', 'Título demonstrativo', 'Status cadastral', 'Data do status atual', 'Ingresso cadastral', 'Município de domicílio', 'Empresas com RT vigente', 'Vínculos RT vigentes', 'QSA confirmado', 'ARTs com autoria declarada', 'Fonte'];
  const rows = scope.profiles.map(profile => {
    const links = scope.activeLinks.filter(link => link.professionalId === profile.id);
    return [profile.id, profile.name, profile.registration, profile.modality, profile.title, profile.status,
      profile.statusSince, profile.registeredAt, cityById.get(profile.cityId)?.name ?? profile.cityId,
      new Set(links.map(link => link.companyId)).size, links.length,
      scope.qsaConfirmed.filter(row => row.professionalId === profile.id).length,
      new Set(scope.artAttributions.filter(row => row.professionalId === profile.id).map(row => row.artId)).size,
      `Demonstração sintética · semente ${scope.dataset.seed}`];
  });
  return '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(';')).join('\r\n');
}

const proposedOwner = 'Área responsável por cadastro e registros profissionais · validação a designar pelo CREA-SP';
export const professionalIndicators: IndicatorDefinition[] = [
  { id: 'professionals', name: 'Profissionais distintos', concept: 'Pessoas físicas fictícias cadastradas no universo profissional selecionado.', formula: 'DISTINCTCOUNT(Profissional.id), por domicílio e filtros profissionais; filtros empresariais atravessam RT ou QSA confirmado.', unit: 'profissional', source: 'Cadastro profissional interno demonstrativo', periodicity: 'Snapshot mensal', limitations: 'Inclui profissionais sem vínculo empresarial. Cadastro profissional não equivale a emprego formal.', owner: proposedOwner },
  { id: 'activeProfessionals', name: 'Profissionais com registro ativo', concept: 'Profissionais cujo status cadastral atual é ativo.', formula: 'DISTINCTCOUNT(Profissional.id WHERE status atual = Ativo)', unit: 'profissional', source: 'Cadastro profissional interno demonstrativo', periodicity: 'Snapshot mensal', limitations: 'Status atual não reconstrói retenção histórica nem comprova exercício profissional.', owner: proposedOwner },
  { id: 'withActiveLinks', name: 'Profissionais com RT vigente', concept: 'Profissionais distintos com ao menos um vínculo técnico vigente no escopo.', formula: 'DISTINCTCOUNT(Vínculo.profissionalId WHERE início ≤ competência AND (fim ausente OR fim > competência))', unit: 'profissional', source: 'Vínculos RT internos demonstrativos', periodicity: 'Snapshot mensal', limitations: 'Pessoa é contada uma vez, mesmo quando vinculada a várias empresas. Ausência de vínculo não é sinal de irregularidade.', owner: proposedOwner },
  { id: 'linkedCompanies', name: 'Empresas com vínculos profissionais', concept: 'Empresas distintas relacionadas aos profissionais pelo RT vigente.', formula: 'DISTINCTCOUNT(Vínculo.empresaId nos vínculos RT vigentes selecionados)', unit: 'empresa', source: 'Vínculos RT internos demonstrativos', periodicity: 'Snapshot mensal', limitations: 'Relação técnica não equivale a participação societária ou vínculo de emprego.', owner: proposedOwner },
  { id: 'confirmedPartners', name: 'Profissionais com participação societária confirmada', concept: 'Profissionais relacionados ao QSA por uma chave interna fictícia validada.', formula: 'DISTINCTCOUNT(QSA.profissionalId WHERE matchStatus = Confirmado por chave interna)', unit: 'profissional', source: 'QSA sintético + identidade interna demonstrativa', periodicity: 'Snapshot mensal', limitations: 'Similaridade nominal e CPF público mascarado não confirmam identidade. Sócio não equivale a responsável técnico.', owner: proposedOwner },
  { id: 'linkedArts', name: 'ARTs com autoria profissional declarada', concept: 'ARTs distintas cuja autoria foi explicitamente criada na relação demonstrativa.', formula: 'DISTINCTCOUNT(Autoria_ART.artId WHERE data ART no período AND profissional selecionado)', unit: 'ART', source: 'Ponte de autoria sintética declarada', periodicity: 'Mensal', limitations: 'RT vigente é apenas um critério de plausibilidade na geração. Em produção, autoria exige a fonte de autores da ART; não pode ser inferida de vínculos RT.', owner: proposedOwner },
  { id: 'newProfessionals', name: 'Ingressos profissionais no período', concept: 'Profissionais cuja primeira data de ingresso cadastral pertence à janela selecionada.', formula: 'DISTINCTCOUNT(Profissional.id WHERE registeredAt no período)', unit: 'profissional', source: 'Cadastro profissional interno demonstrativo', periodicity: 'Mensal', limitations: 'Ingresso cadastral não equivale a conclusão de curso, novo emprego ou ingresso no mercado de trabalho.', owner: proposedOwner },
  { id: 'artAuthors', name: 'Autores profissionais de ARTs no período', concept: 'Profissionais distintos com autoria explicitamente declarada para ARTs na janela selecionada.', formula: 'DISTINCTCOUNT(Autoria_ART.profissionalId WHERE data ART no período)', unit: 'profissional', source: 'Ponte de autoria sintética declarada', periodicity: 'Mensal', limitations: 'Não equivale ao cadastro profissional inteiro nem aos responsáveis técnicos. Autoria real exige informação expressa da fonte ART.', owner: proposedOwner },
  { id: 'artCompanies', name: 'Empresas relacionadas às ARTs com autoria declarada', concept: 'Empresas distintas das ARTs que possuem autor profissional declarado no recorte.', formula: 'DISTINCTCOUNT(Autoria_ART.empresaId WHERE data ART no período AND profissional selecionado)', unit: 'empresa', source: 'ARTs + ponte de autoria sintética declarada', periodicity: 'Mensal', limitations: 'Uma empresa pode relacionar-se a várias ARTs e vários autores; contagem distinta evita duplicidade.', owner: proposedOwner },
  { id: 'partnerCompanies', name: 'Empresas com participação societária profissional confirmada', concept: 'Empresas distintas com QSA confirmado para os profissionais selecionados.', formula: 'DISTINCTCOUNT(QSA.empresaId WHERE matchStatus = Confirmado por chave interna AND profissional selecionado)', unit: 'empresa', source: 'QSA sintético + identidade interna demonstrativa', periodicity: 'Snapshot mensal', limitations: 'Representa participação societária demonstrativa, sem presumir RT, emprego ou obrigação de registro.', owner: proposedOwner },
];
