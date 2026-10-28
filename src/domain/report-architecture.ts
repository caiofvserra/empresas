import type { PageId } from './types';

/** Domínios do relatório; perspectivas preservam a mesma segmentação e modelo. */
export const reportDomains = [
  { id: 'overview', title: 'Visão geral', pages: ['overview'] },
  { id: 'companies', title: 'Empresas', pages: ['registry', 'cao', 'financial'] },
  { id: 'professionals', title: 'Profissionais', pages: ['professionals', 'technical'] },
  { id: 'market', title: 'Mercado e emprego', pages: ['market', 'employment'] },
  { id: 'contracts', title: 'Contratações', pages: ['contracts'] },
  { id: 'inspection', title: 'Fiscalização', pages: ['inspection'] },
] as const;

export function reportDomainFor(page: PageId) {
  return reportDomains.find(domain => (domain.pages as readonly string[]).includes(page)) ?? reportDomains[0];
}
