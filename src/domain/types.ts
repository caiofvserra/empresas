export type CompanySize = 'Microempresa' | 'Pequena empresa' | 'Média empresa' | 'Grande empresa';
export interface Cnae { code: string; label: string; classification: 'Relacionado' | 'Depende de análise' | 'Não classificado'; originalClassification: string; sourceRow: number; sourceSheet: string; fields: Record<string, string> }
export interface Company { id: string; rootCnpj: string; name: string; tradeName: string; size: CompanySize; legalNature: string; externalOnly: boolean }
export interface City { id: string; name: string; greId: string; ibgeCode: string; x: number; y: number }
export interface Gre { id: string; name: string }
export type QualityKind = 'CNPJ inválido' | 'CNPJ duplicado na origem' | 'Sem CNAE' | 'Município divergente' | 'GRE não identificada' | 'CREA ativo / CNPJ baixado' | 'CNAE alterado' | 'Dados desatualizados';
export interface Establishment { id: string; companyId: string; cnpj: string; branch: 'Matriz' | 'Filial'; cityId: string; greId: string; cnaeMain: string; cnaeSecondary: string[]; openedAt: string; rfbStatus: 'Ativa' | 'Baixada' | 'Suspensa' | 'Inapta'; creaCityId: string; updatedAt: string }
export type RegistrationStatus = 'Ativo' | 'Inativo' | 'Cancelado';
export interface Registration { id: string; companyId: string; establishmentId: string; type: 'Registro' | 'Visto'; status: RegistrationStatus; requestedAt: string; startedAt: string; ceasedAt?: string }
export type MovementType = 'Novo registro' | 'Baixa' | 'Reativação' | 'Cancelamento';
export interface Movement { id: string; registrationId: string; companyId: string; establishmentId: string; date: string; type: MovementType }
export interface Professional { id: string; name: string; registration: string; modality: string }
export interface TechnicalLink { id: string; companyId: string; professionalId: string; startDate: string; endDate?: string; modality: string }
export interface Art { id: string; companyId: string; registrationId: string; date: string; endDate?: string; description: string; value: number; status: 'Registrada' | 'Baixada'; modality: string }
export type CaoStatus = 'Solicitada' | 'Em análise' | 'Pendente' | 'Emitida' | 'Revogada';
export interface Cao { id: string; companyId: string; requestedAt: string; issuedAt?: string; status: CaoStatus; artIds: string[]; activity: string }
export interface Invoice { id: string; companyId: string; registrationId: string; dueDate: string; amount: number; paidAmount: number; paymentDate?: string; installmentPlan: boolean; recovered: boolean }
export type CaseStatus = 'Identificada' | 'Validação cadastral' | 'Análise técnica' | 'Encaminhada' | 'Concluída';
export interface InspectionCase { id: string; companyId: string; establishmentId: string; createdAt: string; status: CaseStatus; completedAt?: string; outcome: string; history: { date: string; status: CaseStatus; note: string }[]; notice?: { id: string; date: string; stage: 'Notificação' | 'Auto de infração' | 'Defesa' | 'Decisão' | 'Arquivado' } }
export interface Buyer { id: string; name: string; sphere: string }
export interface Contract { id: string; companyId: string; establishmentId: string; buyerId: string; date: string; object: string; value: number; category: string }
export interface EmploymentFact { id: string; month: string; cityId: string; cnae: string; cbo: string; stock: number; admissions: number; dismissals: number }
export interface Cbo { code: string; label: string; technical: boolean }
export interface QualityEvent { id: string; establishmentId: string; companyId: string; type: QualityKind; date: string; resolved: boolean; source: string; evidence: string }
export interface PublicRow { id: string; establishmentId: string; cnpj: string; companyName: string; cityId: string; cnae: string; updatedAt: string }
export interface Dataset { companies: Company[]; establishments: Establishment[]; registrations: Registration[]; movements: Movement[]; professionals: Professional[]; technicalLinks: TechnicalLink[]; arts: Art[]; caos: Cao[]; invoices: Invoice[]; cases: InspectionCase[]; buyers: Buyer[]; contracts: Contract[]; employment: EmploymentFact[]; qualityEvents: QualityEvent[]; publicRows: PublicRow[]; cities: City[]; gres: Gre[]; cnaes: Cnae[]; cbos: Cbo[]; months: string[]; snapshotDate: string; updatedAt: string; seed: number }
export interface Filters { greIds: string[]; cityIds: string[]; cnaeCodes: string[]; cboCodes: string[]; sizes: string[]; rfbStatuses: string[]; registrationStatuses: string[]; period: number; search: string; onlyRelated: boolean }
export const defaultFilters: Filters = { greIds: [], cityIds: [], cnaeCodes: [], cboCodes: [], sizes: [], rfbStatuses: [], registrationStatuses: [], period: 12, search: '', onlyRelated: false };
export type PageId = 'overview' | 'registry' | 'market' | 'inspection' | 'technical' | 'cao' | 'financial' | 'employment' | 'contracts' | 'professionals';
export interface Classification { label: string; confidence: number; explanation: string; terms: string[]; engineering: boolean; method: string }
export interface Priority { score: number; level: 'Alta' | 'Média' | 'Baixa'; factors: { label: string; points: number; evidence: string }[]; limitation: string }
export interface IndicatorDefinition { id: string; name: string; concept: string; formula: string; unit: string; source: string; periodicity: string; limitations: string; owner: string }
