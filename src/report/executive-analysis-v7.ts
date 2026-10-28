import type { Scope } from '../domain/engine';
import { makeSeries, windowBounds } from '../domain/engine';
import { selectProfessionalScope } from '../domain/professionals';

const distinct = (ids: string[]) => [...new Set(ids)];

/** Every person follows one branch per layer. RT and explicit ART authorship remain separate facts. */
export function buildExecutiveProfessionalFlow(companyScope: Scope, professionalIds?: string[]) {
  const scope = selectProfessionalScope(companyScope, { professionalIds });
  const rt = new Set(scope.activeLinks.map(row => row.professionalId));
  const authors = new Set(scope.artAttributions.map(row => row.professionalId));
  const ids = scope.profiles.map(row => row.id);
  const nodes: { name: string; description: string; ids: string[]; color: string }[] = [
    { name: 'Profissionais', description: 'Profissionais distintos no cadastro selecionado', ids, color: '#15265C' },
  ];
  const links: { source: string; target: string; value: number }[] = [];
  for (const hasRt of [true, false]) {
    const branchIds = ids.filter(id => rt.has(id) === hasRt);
    if (!branchIds.length) continue;
    const branch = hasRt ? 'RT vigente' : 'Sem RT';
    nodes.push({ name: branch, description: hasRt ? 'Pessoas com pelo menos um vínculo técnico vigente' : 'Pessoas sem vínculo técnico vigente identificado', ids: branchIds, color: hasRt ? '#3662E2' : '#A4B5DA' });
    links.push({ source: 'Profissionais', target: branch, value: branchIds.length });
    for (const hasArt of [true, false]) {
      const terminalIds = branchIds.filter(id => authors.has(id) === hasArt);
      if (!terminalIds.length) continue;
      const name = `${hasArt ? 'Autor ART' : 'Sem ART'} · ${hasRt ? 'RT' : 's/RT'}`;
      nodes.push({ name, description: `${hasArt ? 'Com' : 'Sem'} autoria expressa de ART no período · ${hasRt ? 'com' : 'sem'} RT vigente no corte`, ids: terminalIds, color: hasArt ? '#3662E2' : '#D4DEEF' });
      links.push({ source: branch, target: name, value: terminalIds.length });
    }
  }
  return { nodes, links, total: ids.length, scopeNote: scope.scopeNote };
}

/** Fixed current company cohort, aligned monthly events; comparison does not claim a past whole-register census. */
export function buildExecutiveEvolution(scope: Scope) {
  const registrations = new Set(scope.registrations.map(row => row.id));
  const history = scope.dataset.movements.filter(row => registrations.has(row.registrationId));
  const previousBounds = windowBounds(scope.filters.period, scope.anchor);
  return makeSeries(scope).map(row => {
    const start = new Date(`${row.date}T00:00:00Z`);
    start.setUTCMonth(start.getUTCMonth() - scope.filters.period);
    const previousMonth = start.toISOString().slice(0, 7);
    const previousNew = history.filter(event => event.type === 'Novo registro' && event.date.startsWith(previousMonth)
      && event.date >= previousBounds.previousStart && event.date <= previousBounds.previousEnd).length;
    return { ...row, previousNew,
      companyIds: distinct(scope.movements.filter(event => event.date.startsWith(row.date.slice(0, 7))).map(event => event.companyId)) };
  });
}

/** ART and CAO retain independent grains and follow their own event dates. */
export function buildExecutiveProduction(scope: Scope) {
  const currentCompanies = scope.companyIds;
  const historyArts = scope.dataset.arts.filter(row => currentCompanies.has(row.companyId));
  return makeSeries(scope).map(point => {
    const month = point.date.slice(0, 7);
    const arts = scope.arts.filter(row => row.date.startsWith(month));
    const caos = scope.caos.filter(row => row.issuedAt?.startsWith(month) && row.issuedAt <= scope.anchor);
    const previousDate = new Date(`${point.date}T00:00:00Z`);
    previousDate.setUTCMonth(previousDate.getUTCMonth() - scope.filters.period);
    const previousMonth = previousDate.toISOString().slice(0, 7);
    return { month, label: point.label, arts: arts.length, caos: caos.length,
      artCompanyIds: distinct(arts.map(row => row.companyId)), caoCompanyIds: distinct(caos.map(row => row.companyId)),
      previousArts: historyArts.filter(row => row.date.startsWith(previousMonth)).length };
  });
}
