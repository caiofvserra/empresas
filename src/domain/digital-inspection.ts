import { isActiveLink, windowBounds } from './engine';
import type { Scope } from './engine';
import type { Contract, Dataset, Registration } from './types';

export type DigitalMatch = 'exact-active' | 'exact-inactive' | 'root-suggestion' | 'none';
export const digitalMatchLabels: Record<DigitalMatch, string> = {
  'exact-active': 'CNPJ exato · registro vigente',
  'exact-inactive': 'CNPJ exato · sem registro vigente',
  'root-suggestion': 'Somente raiz · revisar estabelecimento',
  none: 'Sem correspondência exata ou por raiz',
};
export interface DigitalObjectClassification {
  engineering: boolean;
  label: string;
  terms: string[];
  ruleIds: string[];
  method: string;
  limitation: string;
}
export interface DigitalInspectionEvidence {
  id: string; companyId: string; ruleId: string; title: string; factIds: string[];
  criteria: string; limitation: string; source: string; asOf: string;
}
export interface DigitalInspectionCompany {
  companyId: string; name: string; tradeName: string; rootCnpj: string;
  establishmentIds: string[]; cnpjs: string[]; greIds: string[]; cityIds: string[]; cnaeCodes: string[];
  sourceRowIds: string[]; registrationIds: string[]; activeRegistrationIds: string[];
  rootCandidateRegistrationIds: string[]; activeRtIds: string[]; technicalContractIds: string[];
  match: DigitalMatch; signals: DigitalInspectionEvidence[];
  classification: 'Relacionado' | 'Depende de análise';
  contractArtLink: 'Vínculo contratual ART não disponível';
}
export interface DigitalInspectionRegion {
  id: string; label: string; companyIds: string[]; exactActiveIds: string[]; exactInactiveIds: string[];
  rootSuggestionIds: string[]; noCorrespondenceIds: string[]; coverage: number | null;
}
export interface DigitalEmploymentContext {
  cityId: string; name: string; greId: string; companyIds: string[]; eligible: number;
  coverage: number | null; admissions: number; dismissals: number; balance: number;
  stock: number; lastMonth: string; employmentFactIds: string[];
}
export interface DigitalInspectionAnalysis {
  companies: DigitalInspectionCompany[]; evidenceRows: DigitalInspectionEvidence[];
  metrics: { eligibleCompanies: number; eligibleEstablishments: number; noCorrespondence: number;
    rootSuggestions: number; technicalContractSuppliers: number; registeredWithoutRt: number;
    convergentSignals: number; invalidSourceRows: number; duplicatedSourceRows: number };
  regions: DigitalInspectionRegion[];
  cnaes: { code: string; label: string; companyIds: string[] }[];
  employmentContext: DigitalEmploymentContext[];
  contracts: { contract: Contract; classification: DigitalObjectClassification }[];
  source: string; periodStart: string; asOf: string;
}

const unique = (values: string[]) => [...new Set(values)].sort();
const digits = (value: string) => value.replace(/[.\-/\s]/g, '');
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const sum = <T>(values: T[], pick: (value: T) => number) => values.reduce((total, value) => total + pick(value), 0);
const analysisCache = new WeakMap<Scope, DigitalInspectionAnalysis>();

/** Numeric CNPJs in the supplied demonstration. Alphanumeric production CNPJs
 * require the Receita Federal's versioned validation rule in the curated layer. */
export function isValidDigitalCnpj(value: string): boolean {
  const cnpj = digits(value);
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const check = (base: string) => {
    let weight = base.length - 7;
    const total = [...base].reduce((result, digit) => { const next = result + Number(digit) * weight; weight = weight === 2 ? 9 : weight - 1; return next; }, 0);
    const rest = total % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const base = cnpj.slice(0, 12);
  return Number(cnpj[12]) === check(base) && Number(cnpj[13]) === check(cnpj.slice(0, 13));
}

const objectRules = [
  { id: 'TXT-01', label: 'Obra / engenharia civil', terms: ['construcao', 'pavimentacao', 'obra civil', 'execucao de obra', 'ponte', 'edificacao'] },
  { id: 'TXT-02', label: 'Instalações elétricas', terms: ['instalacoes eletricas', 'instalacao eletrica', 'rede eletrica', 'redes de energia', 'engenharia eletrica'] },
  { id: 'TXT-03', label: 'Saneamento / ambiente', terms: ['saneamento', 'esgoto', 'tratamento de agua', 'drenagem'] },
  { id: 'TXT-04', label: 'Sistemas mecânicos', terms: ['sistemas mecanicos', 'engenharia mecanica', 'climatizacao', 'elevador'] },
  { id: 'TXT-05', label: 'Serviços técnicos', terms: ['engenharia', 'laudo tecnico', 'projeto tecnico', 'topografia', 'geotecnia'] },
];
export function classifyDigitalObject(object: string): DigitalObjectClassification {
  const text = normalize(object);
  const hits = objectRules.map(rule => ({ ...rule, terms: rule.terms.filter(term => text.includes(term)) })).filter(rule => rule.terms.length);
  return {
    engineering: hits.length > 0,
    label: hits.length ? unique(hits.map(rule => rule.label)).join(' / ') : 'Objeto sem indício textual específico',
    terms: unique(hits.flatMap(rule => rule.terms)), ruleIds: hits.map(rule => rule.id),
    method: 'Dicionário textual demonstrativo v8 · sem modelo treinado ou probabilidade calibrada',
    limitation: 'Termos orientam leitura humana do objeto. Não comprovam execução, obrigação de registro ou infração; ausência de termo não exclui atividade técnica.',
  };
}

/** Snapshot of the actual registration history, including reactivation. */
export function digitalRegistrationActive(registration: Registration, dataset: Dataset, asOf: string): boolean {
  if (registration.startedAt > asOf) return false;
  const history = dataset.movements.filter(row => row.registrationId === registration.id && row.date <= asOf)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const last = history.at(-1);
  if (last) return last.type === 'Novo registro' || last.type === 'Reativação';
  return !registration.ceasedAt || registration.ceasedAt > asOf;
}

/** Exact external establishment CNPJ -> the registered establishment. Company
 * roots identify review candidates only. Scope filters never remove an existing
 * internal match or RT from the lookup and thereby manufacture an absence. */
export function buildDigitalInspection(scope: Scope): DigitalInspectionAnalysis {
  const cached = analysisCache.get(scope);
  if (cached) return cached;
  const { dataset, anchor } = scope;
  const { start: periodStart } = windowBounds(scope.filters.period, anchor);
  const companyById = new Map(dataset.companies.map(row => [row.id, row]));
  const establishmentById = new Map(dataset.establishments.map(row => [row.id, row]));
  const cnaeByCode = new Map(dataset.cnaes.map(row => [row.code, row]));
  const relatedCode = (code: string) => ['Relacionado', 'Depende de análise'].includes(cnaeByCode.get(code)?.classification ?? '');
  const visibleEstablishmentIds = new Set(scope.establishments.map(row => row.id));
  const sourceRows = dataset.publicRows.filter(row => visibleEstablishmentIds.has(row.establishmentId));
  const invalidRows = sourceRows.filter(row => !isValidDigitalCnpj(row.cnpj));
  const validRows = sourceRows.filter(row => isValidDigitalCnpj(row.cnpj));
  const sourceByCnpj = new Map<string, typeof validRows>();
  for (const row of validRows) {
    const key = digits(row.cnpj); const list = sourceByCnpj.get(key) ?? []; list.push(row); sourceByCnpj.set(key, list);
  }
  const duplicateRows = sum([...sourceByCnpj.values()], rows => Math.max(0, rows.length - 1));
  const eligible = new Map<string, { establishmentId: string; cnpj: string; sourceIds: string[]; codes: string[] }>();
  for (const [cnpj, rows] of sourceByCnpj) {
    const row = rows[0]; const establishment = establishmentById.get(row.establishmentId);
    if (!establishment || establishment.rfbStatus !== 'Ativa' || establishment.openedAt > anchor) continue;
    const codes = unique([row.cnae, ...establishment.cnaeSecondary].filter(relatedCode));
    if (!codes.length) continue;
    eligible.set(cnpj, { establishmentId: establishment.id, cnpj, sourceIds: unique(rows.map(item => item.id)), codes });
  }
  const registrations = dataset.registrations.filter(row => row.startedAt <= anchor);
  const regByCnpj = new Map<string, Registration[]>();
  const regByRoot = new Map<string, Registration[]>();
  for (const registration of registrations) {
    const establishment = establishmentById.get(registration.establishmentId);
    if (!establishment || !isValidDigitalCnpj(establishment.cnpj)) continue;
    const cnpj = digits(establishment.cnpj);
    regByCnpj.set(cnpj, [...(regByCnpj.get(cnpj) ?? []), registration]);
    regByRoot.set(cnpj.slice(0, 8), [...(regByRoot.get(cnpj.slice(0, 8)) ?? []), registration]);
  }
  const lastMovementByRegistration = new Map<string, Dataset['movements'][number]>();
  for (const movement of dataset.movements.filter(row => row.date <= anchor).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))) lastMovementByRegistration.set(movement.registrationId, movement);
  const activeRegistrationIds = new Set(registrations.filter(row => {
    const last = lastMovementByRegistration.get(row.id);
    return last ? last.type === 'Novo registro' || last.type === 'Reativação' : !row.ceasedAt || row.ceasedAt > anchor;
  }).map(row => row.id));
  const classifiedContracts = scope.contracts.map(contract => ({ contract, classification: classifyDigitalObject(contract.object) }));
  const contractsByCompany = new Map<string, typeof classifiedContracts>();
  for (const row of classifiedContracts.filter(row => row.classification.engineering)) {
    contractsByCompany.set(row.contract.companyId, [...(contractsByCompany.get(row.contract.companyId) ?? []), row]);
  }
  const rtByCompany = new Map<string, string[]>();
  for (const row of dataset.technicalLinks.filter(row => isActiveLink(row, anchor))) rtByCompany.set(row.companyId, [...(rtByCompany.get(row.companyId) ?? []), row.id]);
  const byCompany = new Map<string, typeof eligible extends Map<string, infer T> ? T[] : never>();
  for (const row of eligible.values()) {
    const companyId = establishmentById.get(row.establishmentId)!.companyId;
    byCompany.set(companyId, [...(byCompany.get(companyId) ?? []), row]);
  }
  const companies: DigitalInspectionCompany[] = [];
  for (const [companyId, establishments] of byCompany) {
    const company = companyById.get(companyId); if (!company) continue;
    const exactRegistrations = establishments.flatMap(row => regByCnpj.get(row.cnpj) ?? []);
    const exactIds = unique(exactRegistrations.map(row => row.id));
    const activeIds = exactIds.filter(id => activeRegistrationIds.has(id));
    const rootCandidateIds = unique(establishments.flatMap(row => regByRoot.get(row.cnpj.slice(0, 8)) ?? []).map(row => row.id)).filter(id => !exactIds.includes(id));
    const match: DigitalMatch = exactIds.length ? activeIds.length ? 'exact-active' : 'exact-inactive' : rootCandidateIds.length ? 'root-suggestion' : 'none';
    const selectedEstablishments = establishments.map(row => establishmentById.get(row.establishmentId)!);
    const technicalContracts = contractsByCompany.get(companyId) ?? [];
    const row: DigitalInspectionCompany = {
      companyId, name: company.name, tradeName: company.tradeName, rootCnpj: company.rootCnpj,
      establishmentIds: unique(establishments.map(item => item.establishmentId)), cnpjs: unique(establishments.map(item => item.cnpj)),
      greIds: unique(selectedEstablishments.map(item => item.greId)), cityIds: unique(selectedEstablishments.map(item => item.cityId)),
      cnaeCodes: unique(establishments.flatMap(item => item.codes)), sourceRowIds: unique(establishments.flatMap(item => item.sourceIds)),
      registrationIds: exactIds, activeRegistrationIds: activeIds, rootCandidateRegistrationIds: rootCandidateIds,
      activeRtIds: unique(rtByCompany.get(companyId) ?? []), technicalContractIds: unique(technicalContracts.map(item => item.contract.id)),
      match, signals: [], classification: establishments.some(item => item.codes.some(code => cnaeByCode.get(code)?.classification === 'Relacionado')) ? 'Relacionado' : 'Depende de análise',
      contractArtLink: 'Vínculo contratual ART não disponível',
    };
    const evidence = (ruleId: string, title: string, factIds: string[], criteria: string, limitation: string, source: string) => row.signals.push({
      id: `${ruleId}:${companyId}`, companyId, ruleId, title, factIds: unique(factIds), criteria,
      limitation, source, asOf: anchor,
    });
    const cnaeCriterion = `Estabelecimento RFB ativo com CNAE principal ou secundário da lista: ${row.cnaeCodes.join(', ')}; classificação ${row.classification}.`;
    if (match === 'none') evidence('DIG-01', 'CNAE selecionado + cadastro não localizado', row.sourceRowIds,
      `${cnaeCriterion} CNPJ completo e raiz não encontrados nos estabelecimentos com registro iniciado até ${anchor}.`,
      'Ausência de correspondência é informação sobre as fontes consultadas. CNAE isolado não determina obrigação; validar atividade efetivamente exercida e atualização cadastral.', 'RFB/CNPJ ↔ cadastro CREA');
    if (match === 'root-suggestion') evidence('DIG-02', 'Mesma raiz, estabelecimento não confirmado', [...row.sourceRowIds, ...rootCandidateIds],
      `${cnaeCriterion} Sem registro para o CNPJ completo; registro encontrado apenas para outro estabelecimento da mesma raiz.`,
      'Correspondência por raiz é uma sugestão de conciliação. Não confirma registro nem sua abrangência territorial ou cobertura do estabelecimento analisado.', 'RFB/CNPJ ↔ cadastro CREA');
    if (match === 'exact-inactive') evidence('DIG-03', 'RFB ativa + registro sem vigência identificada', [...row.sourceRowIds, ...row.registrationIds],
      `${cnaeCriterion} CNPJ completo corresponde ao cadastro; nenhum dos registros correspondentes está vigente em ${anchor}.`,
      'Histórico inativo não comprova exercício atual de atividade sujeita ao conselho. Examinar motivo, período, visto e atividade efetiva.', 'RFB/CNPJ ↔ registro/movimentação CREA');
    if (technicalContracts.length && match !== 'exact-active') evidence('DIG-04', 'Objeto técnico + registro vigente não identificado', [...row.sourceRowIds, ...row.registrationIds, ...row.rootCandidateRegistrationIds, ...row.technicalContractIds],
      `${cnaeCriterion} ${technicalContracts.length} contrato(s) no período ${periodStart} a ${anchor} com termos: ${unique(technicalContracts.flatMap(item => item.classification.terms)).join(', ')}. Estado cadastral: ${digitalMatchLabels[match]}.`,
      'Cadastro é observado na competência, não na data da execução. Texto não comprova obrigação, execução nem infração. A ligação contrato↔ART não está disponível; não se infere ART ausente.', 'RFB/CNPJ + PNCP/objetos ↔ cadastro CREA');
    if (match === 'exact-active' && !row.activeRtIds.length) evidence('DIG-05', 'Registro vigente + vínculo RT não identificado', [...row.sourceRowIds, ...row.activeRegistrationIds],
      `CNPJ completo com registro vigente em ${anchor}; nenhum vínculo técnico da empresa satisfaz início ≤ competência e fim ausente ou posterior à competência.`,
      'É ausência no cadastro de vínculos consultado, não ausência comprovada de responsável técnico; verificar vigência, abrangência e qualidade da integração.', 'Registro CREA ↔ vínculo técnico CREA');
    const cityDivergences = scope.qualityEvents.filter(item => item.companyId === companyId && row.establishmentIds.includes(item.establishmentId) && !item.resolved && item.type === 'Município divergente');
    if (cityDivergences.length) evidence('DIG-06', 'Divergência de localização entre cadastros', cityDivergences.map(item => item.id),
      'Existe evento de qualidade não resolvido de município divergente para estabelecimento elegível.',
      'Endereço divergente pode refletir defasagem ou mudança legítima. Conciliação cadastral deve preceder interpretação territorial.', 'Eventos de qualidade RFB ↔ CREA');
    companies.push(row);
  }
  companies.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR') || a.companyId.localeCompare(b.companyId));
  const evidenceRows = companies.flatMap(row => row.signals);
  const territorialMatch = (companyId: string, accepts: (establishmentId: string) => boolean): DigitalMatch => {
    const local = (byCompany.get(companyId) ?? []).filter(row => accepts(row.establishmentId));
    const exact = local.flatMap(row => regByCnpj.get(row.cnpj) ?? []);
    if (exact.length) return exact.some(row => activeRegistrationIds.has(row.id)) ? 'exact-active' : 'exact-inactive';
    return local.some(row => (regByRoot.get(row.cnpj.slice(0, 8)) ?? []).length) ? 'root-suggestion' : 'none';
  };
  const region = (id: string, label: string, members: DigitalInspectionCompany[]): DigitalInspectionRegion => {
    const exact = members.filter(row => row.match.startsWith('exact'));
    return { id, label, companyIds: members.map(row => row.companyId),
      exactActiveIds: members.filter(row => row.match === 'exact-active').map(row => row.companyId),
      exactInactiveIds: members.filter(row => row.match === 'exact-inactive').map(row => row.companyId),
      rootSuggestionIds: members.filter(row => row.match === 'root-suggestion').map(row => row.companyId),
      noCorrespondenceIds: members.filter(row => row.match === 'none').map(row => row.companyId),
      coverage: members.length ? exact.length / members.length * 100 : null };
  };
  const regions = dataset.gres.map(gre => region(gre.id, gre.name, companies.filter(row => row.greIds.includes(gre.id)).map(row => ({ ...row,
    match: territorialMatch(row.companyId, establishmentId => establishmentById.get(establishmentId)?.greId === gre.id) })))).filter(row => row.companyIds.length)
    .sort((a, b) => b.noCorrespondenceIds.length - a.noCorrespondenceIds.length || a.label.localeCompare(b.label, 'pt-BR'));
  const cnaes = unique(companies.flatMap(row => row.cnaeCodes)).map(code => ({ code, label: cnaeByCode.get(code)?.label ?? code,
    companyIds: companies.filter(row => row.cnaeCodes.includes(code)).map(row => row.companyId) })).sort((a, b) => b.companyIds.length - a.companyIds.length || a.code.localeCompare(b.code));
  const relatedEmployment = scope.employment.filter(row => relatedCode(row.cnae));
  const lastMonth = relatedEmployment.reduce((latest, row) => row.month > latest ? row.month : latest, '');
  const employmentContext = dataset.cities.map(city => {
    const facts = relatedEmployment.filter(row => row.cityId === city.id);
    const members = companies.filter(row => row.cityIds.includes(city.id));
    const exact = members.filter(row => territorialMatch(row.companyId, establishmentId => establishmentById.get(establishmentId)?.cityId === city.id).startsWith('exact')).length;
    const admissions = sum(facts, row => row.admissions); const dismissals = sum(facts, row => row.dismissals);
    return { cityId: city.id, name: city.name, greId: city.greId, companyIds: members.map(row => row.companyId), eligible: members.length,
      coverage: members.length ? exact / members.length * 100 : null, admissions, dismissals, balance: admissions - dismissals,
      stock: sum(facts.filter(row => row.month === lastMonth), row => row.stock), lastMonth, employmentFactIds: facts.map(row => row.id) };
  }).filter(row => row.employmentFactIds.length);
  const analysis: DigitalInspectionAnalysis = { companies, evidenceRows, regions, cnaes, employmentContext, contracts: classifiedContracts,
    metrics: { eligibleCompanies: companies.length, eligibleEstablishments: eligible.size,
      noCorrespondence: companies.filter(row => row.match === 'none').length,
      rootSuggestions: companies.filter(row => row.match === 'root-suggestion').length,
      technicalContractSuppliers: companies.filter(row => row.technicalContractIds.length).length,
      registeredWithoutRt: companies.filter(row => row.match === 'exact-active' && !row.activeRtIds.length).length,
      convergentSignals: companies.filter(row => row.signals.some(signal => signal.ruleId === 'DIG-04')).length,
      invalidSourceRows: invalidRows.length, duplicatedSourceRows: duplicateRows },
    source: 'Demonstração relacional SP · produção prevista: RFB/CNPJ e PNCP → camada curada; cadastro e RT via SQL Server/DB2 + gateway. Não conectado aos bancos reais.',
    periodStart, asOf: anchor };
  analysisCache.set(scope, analysis);
  return analysis;
}

export function exportDigitalInspectionCsv(scope: Scope, canExport: boolean, companyIds?: string[], ruleId?: string, evidenceIds?: string[]): string {
  if (!canExport) throw new Error('Este perfil não permite exportar evidências cadastrais.');
  const selected = companyIds === undefined ? undefined : new Set(companyIds);
  const selectedEvidence = evidenceIds === undefined ? undefined : new Set(evidenceIds);
  const analysis = buildDigitalInspection(scope);
  const lines: (string | number)[][] = [['Empresa ID', 'Razão social', 'Raiz CNPJ', 'CNPJs elegíveis', 'CNAEs selecionados', 'Correspondência', 'Registros correspondentes', 'Registros vigentes', 'Sugestões por raiz', 'Vínculos RT vigentes', 'Contratos com indício textual', 'Regra', 'Evidência', 'IDs da origem', 'Critério', 'Limitação', 'Fonte', 'Competência', 'Vínculo contrato ART', 'Natureza dos dados']];
  for (const company of analysis.companies.filter(row => !selected || selected.has(row.companyId))) {
    const signals: (DigitalInspectionEvidence | undefined)[] = company.signals.length ? company.signals : [undefined];
    for (const signal of signals.filter(row => (!ruleId || (row?.ruleId ?? 'DIG-00') === ruleId) && (!selectedEvidence || selectedEvidence.has(row?.id ?? `DIG-00:${company.companyId}`)))) lines.push([company.companyId, company.name, company.rootCnpj, company.cnpjs.join(' | '), company.cnaeCodes.join(' | '), digitalMatchLabels[company.match], company.registrationIds.join(' | '), company.activeRegistrationIds.join(' | '), company.rootCandidateRegistrationIds.join(' | '), company.activeRtIds.join(' | '), company.technicalContractIds.join(' | '), signal?.ruleId ?? 'DIG-00', signal?.title ?? 'Universo elegível sem combinação de evidência selecionada', (signal?.factIds ?? company.sourceRowIds).join(' | '), signal?.criteria ?? 'RFB ativa; CNAE relacionado ou depende de análise; identidade CNPJ validada e deduplicada.', signal?.limitation ?? 'Ausência de sinal não comprova regularidade. Revisão humana e fontes atualizadas necessárias.', signal?.source ?? 'RFB/CNPJ ↔ cadastro CREA', analysis.asOf, company.contractArtLink, 'Demonstrativo · semente fixa; sem conclusão de infração']);
  }
  const cell = (value: string | number) => `"${String(value).replace(/^[=+\-@]/, "'$&").replace(/"/g, '""')}"`;
  return '\uFEFF' + lines.map(line => line.map(cell).join(';')).join('\r\n');
}
