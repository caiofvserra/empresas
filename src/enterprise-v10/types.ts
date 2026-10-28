import type { Contract } from '../domain/types';

export const metricIds = ['base', 'retention', 'coverage', 'newMarket', 'rtCoverage', 'rtContinuity', 'corporateActivity', 'economicContext', 'publicDemand', 'supplierCoverage', 'contractTrace', 'convergentEvidence', 'compliance', 'receipts', 'overdue', 'recovery', 'observedEntry'] as const;
export type MetricId = typeof metricIds[number];
export interface EnterpriseIndicator {
  id: MetricId; name: string; meaning: string; formula: string; decision: string; example: string;
  sources: string[]; limits: string; unit: string;
}
export interface EnterpriseMetric {
  id: MetricId; value: number | null; unit: 'companies' | 'establishments' | 'percent' | 'currency' | 'days' | 'context'; numerator?: number; denominator?: number;
  companyIds: string[]; denominatorCompanyIds?: string[]; factIds?: string[]; note: string;
}
export interface EnterpriseMonth {
  month: string; base: number; entered: number; exited: number; arts: number; artCompanies: number;
  receipts: number; recovered: number; overdue: number; companyIds: string[]; activeIds: string[]; enteredIds: string[]; exitedIds: string[]; artCompanyIds: string[]; receiptCompanyIds: string[]; recoveredCompanyIds: string[]; otherReceiptCompanyIds: string[];
}
export interface EnterpriseRegion {
  id: string; name: string; companyIds: string[]; base: number; eligible: number; matched: number;
  coverage: number | null; withoutMatch: number; notLocated: number; inactiveMatched: number;
  rtCoverage: number | null; jobGrowth: number | null; companyGrowth: number | null;
  contractValue: number; matchedIds: string[]; withoutMatchIds: string[]; withRtIds: string[]; withoutRtIds: string[]; missingCompanyIds: string[];
  jobStock: number; employmentBalance: number;
}
export interface EnterpriseSector {
  code: string; name: string; companyIds: string[]; eligible: number; matched: number; coverage: number | null;
  artCompanies: number; contractValue: number; withoutMatch: number; matchedIds: string[]; withoutMatchIds: string[];
}
export interface EnterpriseCompanyFact {
  companyId: string; active: boolean; registeredInPeriod: boolean; withRt: boolean; artCount: number;
  registeredDays: number; coveredDays: number; receipts: number; overdue: number; eligibleEstablishments: number;
  exactActiveEstablishments: number; evidenceIds: string[]; technicalContractIds: string[];
}
export interface EnterpriseModel {
  metrics: Record<MetricId, EnterpriseMetric>;
  monthly: EnterpriseMonth[]; regions: EnterpriseRegion[]; sectors: EnterpriseSector[];
  rtRows: { name: string; withRt: number; withoutRt: number; companyIds: string[]; withRtIds: string[]; withoutRtIds: string[] }[];
  debtBuckets: { name: string; value: number; companyIds: string[] }[];
  contractCategories: { name: string; value: number; companyIds: string[] }[];
  cohortRows: { name: string; count: number; companyIds: string[] }[];
  cityRows: { id: string; name: string; ibgeCode: string; eligible: number; matched: number; coverage: number | null; companyIds: string[]; matchedIds: string[]; withoutMatchIds: string[] }[];
  gapBuckets: { name: string; count: number; companyIds: string[] }[];
  technicalPartition: { name: string; count: number; companyIds: string[] }[];
  matchingRows: { name: string; count: number; companyIds: string[] }[];
  traceRows: { name: string; count: number; companyIds: string[] }[];
  recoveryCohort: { openingBalance: number; recovered: number; remaining: number; companyIds: string[]; recoveredIds: string[]; remainingIds: string[] };
  companyFacts: EnterpriseCompanyFact[];
  contracts: { contract: Contract; technical: boolean; exactActiveAtPublication: boolean; artIds: string[]; classification: string }[];
  metadata: {
    start: string; end: string; openingCut: string; baseline: string; synthetic: true; sourcesConnected: false;
    activeCompanyIds: string[]; openingCompanyIds: string[]; eligibleEstablishmentIds: string[];
    activeEligibleEstablishmentIds: string[]; notLocatedEstablishmentIds: string[]; inactiveMatchedEstablishmentIds: string[];
    bridgeRows: number; technicalContractCount: number; corporateArtCount: number; cohortObservationCount: number;
    openingDebt: number; recoveredOpeningDebt: number; registeredCompanyDays: number; coveredCompanyDays: number;
    matchedHistoricalCount: number; employmentComparable: boolean; employmentFirstMonth: string; employmentLastMonth: string;
    notices: string[];
  };
}
