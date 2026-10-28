import type { Dataset } from '../domain/types';
import { classifyDigitalObject } from '../domain/digital-inspection';

export interface ContractArtEvidence { id: string; contractId: string; artId: string; companyId: string; recordedAt: string; source: string }
export interface ExternalObservation { id: string; establishmentId: string; companyId: string; cnpj: string; observedAt: string; rfbStatus: 'Ativa'; matchAtObservation: 'Não localizado'; source: string }
export interface EnterpriseEvidence { contractArt: ContractArtEvidence[]; observations: ExternalObservation[]; synthetic: true }
const cache = new WeakMap<Dataset, EnterpriseEvidence>();
/** Preserve alphanumeric roots: the RFB check uses each ASCII code minus 48. */
export const normalizeEnterpriseCnpj = (value: string) => value.toUpperCase().replace(/[.\-/\s]/g, '');
export function isValidEnterpriseCnpj(value: string): boolean {
  const cnpj = normalizeEnterpriseCnpj(value);
  if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(cnpj) || /^(.)\1{13}$/.test(cnpj)) return false;
  const check = (base: string) => {
    const weights = base.length === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    const remainder = [...base].reduce((sum, char, index) => sum + (char.charCodeAt(0) - 48) * weights[index], 0) % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return Number(cnpj[12]) === check(cnpj.slice(0,12)) && Number(cnpj[13]) === check(cnpj.slice(0,13));
}
const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

/** Explicit, reproducible fictional documents. These never stand for a real API load. */
export function buildEnterpriseEvidence(dataset: Dataset): EnterpriseEvidence {
  const existing = cache.get(dataset); if (existing) return existing;
  const artsByCompany = new Map<string, Dataset['arts']>();
  for (const art of dataset.arts) artsByCompany.set(art.companyId, [...(artsByCompany.get(art.companyId) ?? []), art]);
  const contractArt: ContractArtEvidence[] = [];
  for (const [index, contract] of dataset.contracts.entries()) {
    if (index % 3 !== 0 || !classifyDigitalObject(contract.object).engineering) continue;
    const art = (artsByCompany.get(contract.companyId) ?? []).filter(row => row.date >= contract.date && row.date <= addDays(contract.date, 365) && row.date <= dataset.snapshotDate).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))[0];
    if (art) contractArt.push({ id: `DOC-${contract.id}-${art.id}`, contractId: contract.id, artId: art.id, companyId: contract.companyId,
      recordedAt: art.date, source: 'Ponte documental fictícia explícita V10; não inferida como evidência real por CNPJ ou texto.' });
  }
  const codes = new Map(dataset.cnaes.map(row => [row.code, row]));
  const registrationStarts = new Map<string, string>();
  for (const row of dataset.registrations) { const previous = registrationStarts.get(row.establishmentId); if (!previous || row.startedAt < previous) registrationStarts.set(row.establishmentId, row.startedAt); }
  const cuts = [...new Set(dataset.months.map(month => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 0)).toISOString().slice(0, 10)))].sort();
  const observations: ExternalObservation[] = [];
  for (const cut of cuts) {
    for (const establishment of dataset.establishments) {
      if (cut > dataset.snapshotDate || establishment.openedAt > cut || establishment.rfbStatus !== 'Ativa' || !isValidEnterpriseCnpj(establishment.cnpj)) continue;
      if (![establishment.cnaeMain, ...establishment.cnaeSecondary].some(code => ['Relacionado', 'Depende de análise'].includes(codes.get(code)?.classification ?? ''))) continue;
      const first = registrationStarts.get(establishment.id);
      if (first && first <= cut) continue;
      observations.push({ id: `OBS-${cut}-${establishment.id}`, establishmentId: establishment.id, companyId: establishment.companyId,
        cnpj: establishment.cnpj, observedAt: cut, rfbStatus: 'Ativa', matchAtObservation: 'Não localizado',
        source: 'Snapshot externo longitudinal fictício V10; competência e evidência próprias, sem captura institucional real.' });
    }
  }
  const result: EnterpriseEvidence = { contractArt, observations, synthetic: true }; cache.set(dataset, result); return result;
}
