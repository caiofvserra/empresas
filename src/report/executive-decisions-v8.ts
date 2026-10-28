import type { Scope } from '../domain/engine';
import { isActiveLink, outstanding, windowBounds } from '../domain/engine';
import { buildProfessionalModel, selectProfessionalScope } from '../domain/professionals';
import type { Invoice } from '../domain/types';

const distinct = (values: string[]) => [...new Set(values)];
const inRange = (date: string | undefined, start: string, end: string) => Boolean(date && date >= start && date <= end);
const moneyCents = (amount: number) => Math.round(amount * 100);
const sumCents = (rows: Invoice[]) => rows.reduce((sum, row) => sum + moneyCents(row.paidAmount), 0);
const growth = (first: number, last: number) => first > 0 ? (last - first) / first * 100 : null;
const greName = (name: string) => name.replace(/^GRE\s*\d+\s*[-–·]?\s*/, '');

export function executiveMonths(scope: Scope) {
  const { start } = windowBounds(scope.filters.period, scope.anchor);
  const first = new Date(`${start}T00:00:00Z`);
  return Array.from({ length: scope.filters.period }, (_, offset) => {
    const date = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + offset, 1));
    const month = date.toISOString().slice(0, 7);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    const previousDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - scope.filters.period, 1));
    const previousMonth = previousDate.toISOString().slice(0, 7);
    // A partial current month is compared with the same elapsed calendar days.
    const previousLastDay = Math.min(Number(scope.anchor.slice(8, 10)), new Date(Date.UTC(previousDate.getUTCFullYear(), previousDate.getUTCMonth() + 1, 0)).getUTCDate());
    const partial = lastDay > scope.anchor;
    const previousEnd = partial ? `${previousMonth}-${String(previousLastDay).padStart(2, '0')}`
      : new Date(Date.UTC(previousDate.getUTCFullYear(), previousDate.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    return { month, label: new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(date),
      start: `${month}-01`, end: lastDay > scope.anchor ? scope.anchor : lastDay, previousMonth,
      previousStart: `${previousMonth}-01`, previousEnd };
  });
}

/** One allocation per CNPJ root: visible headquarters, otherwise the first visible branch by stable ID. */
export function executiveCompanyTerritory(scope: Scope) {
  const assignments = new Map<string, string>();
  const branches = new Map<string, Scope['establishments']>();
  for (const establishment of scope.establishments) {
    const rows = branches.get(establishment.companyId) ?? [];
    rows.push(establishment);
    branches.set(establishment.companyId, rows);
  }
  for (const company of scope.companies) {
    const rows = (branches.get(company.id) ?? []).sort((a, b) => a.id.localeCompare(b.id));
    const representative = rows.find(row => row.branch === 'Matriz') ?? rows[0];
    if (representative) assignments.set(company.id, representative.greId);
  }
  return assignments;
}

/** Only distinct companies with a current active registration form the denominator. */
export function buildExecutiveCompanyContinuity(scope: Scope) {
  const activeIds = distinct(scope.registrations.filter(row => row.status === 'Ativo').map(row => row.companyId));
  const currentRt = new Set(scope.technicalLinks.filter(row => isActiveLink(row, scope.anchor)).map(row => row.companyId));
  const withRtIds = activeIds.filter(id => currentRt.has(id));
  const withoutRtIds = activeIds.filter(id => !currentRt.has(id));
  const territory = executiveCompanyTerritory(scope);
  const rows = scope.dataset.gres.map(gre => {
    const companyIds = activeIds.filter(id => territory.get(id) === gre.id);
    return { id: gre.id, label: greName(gre.name), companyIds,
      withRtIds: companyIds.filter(id => currentRt.has(id)), withoutRtIds: companyIds.filter(id => !currentRt.has(id)) };
  }).filter(row => row.companyIds.length).sort((a, b) => b.withoutRtIds.length - a.withoutRtIds.length || b.companyIds.length - a.companyIds.length || a.id.localeCompare(b.id));
  return { total: activeIds.length, activeIds, withRtIds, withoutRtIds, rate: activeIds.length ? withRtIds.length / activeIds.length * 100 : null, rows };
}

/** Engagement is an observed ART-authorship signal among ACTIVE people, never employment. */
export function buildExecutiveProfessionalEngagement(scope: Scope, professionalIds?: string[]) {
  const professionals = selectProfessionalScope(scope, { professionalIds });
  const activeProfiles = professionals.profiles.filter(row => row.status === 'Ativo');
  const activeIds = activeProfiles.map(row => row.id);
  const authors = new Set(professionals.artAttributions.map(row => row.professionalId));
  const knownArtIds = new Set(professionals.model.artAttributions.map(row => row.artId));
  const sourceArtCount = professionals.sourceArts.length;
  const identifiedArtCount = professionals.sourceArts.filter(row => knownArtIds.has(row.id)).length;
  const withArtIds = activeIds.filter(id => authors.has(id));
  const withoutArtIds = activeIds.filter(id => !authors.has(id));
  const modalities = distinct(activeProfiles.map(row => row.modality));
  const rows = modalities.map(modality => {
    const ids = activeProfiles.filter(row => row.modality === modality).map(row => row.id);
    return { id: modality, label: modality, professionalIds: ids, withArtIds: ids.filter(id => authors.has(id)), withoutArtIds: ids.filter(id => !authors.has(id)) };
  }).sort((a, b) => b.professionalIds.length - a.professionalIds.length || a.label.localeCompare(b.label));
  return { total: activeIds.length, activeIds, withArtIds, withoutArtIds,
    rate: activeIds.length ? withArtIds.length / activeIds.length * 100 : null, rows, sourceArtCount, identifiedArtCount,
    authorCoverageRate: sourceArtCount ? identifiedArtCount / sourceArtCount * 100 : null, scopeNote: professionals.scopeNote };
}

/** Production uses all ARTs in the business scope; authors require the explicit bridge, never an RT inference. */
export function buildExecutiveArtProduction(scope: Scope, professionalIds?: string[]) {
  const model = buildProfessionalModel(scope.dataset);
  const selectedPeople = professionalIds === undefined ? undefined : new Set(professionalIds);
  const companyArtIds = new Set(scope.arts.map(row => row.id));
  const selectedAttributions = model.artAttributions.filter(row => (!selectedPeople || selectedPeople.has(row.professionalId)) && companyArtIds.has(row.artId));
  const attributedIds = new Set(selectedAttributions.map(row => row.artId));
  const arts = selectedPeople ? scope.arts.filter(row => attributedIds.has(row.id)) : scope.arts;
  const currentIds = new Set(arts.map(row => row.id));
  const attributions = selectedAttributions.filter(row => currentIds.has(row.artId));
  const companyIds = scope.companyIds;
  const historicArts = scope.dataset.arts.filter(row => companyIds.has(row.companyId));
  const historicSelected = selectedPeople ? new Set(model.artAttributions.filter(row => selectedPeople.has(row.professionalId)).map(row => row.artId)) : null;
  const rows = executiveMonths(scope).map(point => {
    const monthlyArts = arts.filter(row => inRange(row.date, point.start, point.end));
    const artIds = monthlyArts.map(row => row.id);
    const ids = new Set(artIds);
    const authorIds = distinct(attributions.filter(row => ids.has(row.artId)).map(row => row.professionalId));
    const previousArts = historicArts.filter(row => inRange(row.date, point.previousStart, point.previousEnd) && (!historicSelected || historicSelected.has(row.id)));
    const previousArtIds = previousArts.map(row => row.id);
    return { ...point, arts: monthlyArts.length, authors: authorIds.length, artIds, authorIds,
      companyIds: distinct(monthlyArts.map(row => row.companyId)),
      unattributedArts: monthlyArts.filter(row => !attributedIds.has(row.id)).length,
      previousArts: previousArts.length, previousArtIds, previousCompanyIds: distinct(previousArts.map(row => row.companyId)) };
  });
  return { rows, arts: arts.length, authors: distinct(attributions.map(row => row.professionalId)).length,
    unattributedArts: arts.filter(row => !attributedIds.has(row.id)).length };
}

/** Cash receipts are payment-date flows. Recovery is a subset of receipt, not an additive third amount. */
export function buildExecutiveCorporateReceipts(scope: Scope) {
  const registeredCompanies = new Set(scope.registrations.map(row => row.companyId));
  const invoices = scope.invoices.filter(row => registeredCompanies.has(row.companyId));
  const points = executiveMonths(scope);
  const rows = points.map(point => {
    const paid = invoices.filter(row => row.paidAmount > 0 && inRange(row.paymentDate, point.start, point.end));
    const recovered = paid.filter(row => row.recovered);
    const previous = invoices.filter(row => row.paidAmount > 0 && inRange(row.paymentDate, point.previousStart, point.previousEnd));
    const late = invoices.filter(row => row.dueDate < point.end && outstanding(row, point.end) > 0);
    const receivedCents = sumCents(paid);
    const recoveredCents = sumCents(recovered);
    return { ...point, receivedCents, recoveredCents, regularCents: receivedCents - recoveredCents,
      receivedAmount: receivedCents / 100, recoveredAmount: recoveredCents / 100, regularAmount: (receivedCents - recoveredCents) / 100,
      previousReceivedAmount: sumCents(previous) / 100,
      overdueAmount: late.reduce((sum, row) => sum + moneyCents(outstanding(row, point.end)), 0) / 100,
      companyIds: distinct(paid.map(row => row.companyId)), recoveredCompanyIds: distinct(recovered.map(row => row.companyId)),
      regularCompanyIds: distinct(paid.filter(row => !row.recovered).map(row => row.companyId)), previousCompanyIds: distinct(previous.map(row => row.companyId)),
      invoiceIds: paid.map(row => row.id) };
  });
  const receivedCents = rows.reduce((sum, row) => sum + row.receivedCents, 0);
  const recoveredCents = rows.reduce((sum, row) => sum + row.recoveredCents, 0);
  return { rows, receivedAmount: receivedCents / 100, recoveredAmount: recoveredCents / 100,
    overdueAmount: rows.at(-1)?.overdueAmount ?? 0, previousReceivedAmount: rows.reduce((sum, row) => sum + moneyCents(row.previousReceivedAmount), 0) / 100,
    companyIds: distinct(rows.flatMap(row => row.companyIds)), recoveredCompanyIds: distinct(rows.flatMap(row => row.recoveredCompanyIds)) };
}

/** History follows each registration's ledger; distinct active roots are evaluated at each shared cutoff. */
export function executiveActiveCompanyIdsAt(scope: Scope, cutoff: string) {
  const registrationIds = new Set(scope.registrations.map(row => row.id));
  const lastEvent = new Map<string, Scope['movements'][number]>();
  const ledgerRegistrations = new Set<string>();
  for (const event of scope.dataset.movements) {
    if (!registrationIds.has(event.registrationId)) continue;
    ledgerRegistrations.add(event.registrationId);
    if (event.date > cutoff) continue;
    const current = lastEvent.get(event.registrationId);
    if (!current || event.date > current.date || event.date === current.date && event.id > current.id) lastEvent.set(event.registrationId, event);
  }
  return distinct(scope.registrations.filter(registration => {
    const event = lastEvent.get(registration.id);
    if (event) return event.type === 'Novo registro' || event.type === 'Reativação';
    // A complete ledger with only future events cannot imply an earlier active record.
    if (ledgerRegistrations.has(registration.id)) return false;
    return registration.startedAt <= cutoff && (!registration.ceasedAt || registration.ceasedAt > cutoff);
  }).map(row => row.companyId));
}

/** Territory and BOTH month-end cutoffs are identical. No worker or aggregate employment fact is joined to a CNPJ. */
export function buildExecutiveRegionalEconomy(scope: Scope) {
  const months = distinct(scope.employment.map(row => row.month)).sort();
  const firstMonth = months[0] ?? '';
  const lastMonth = months.at(-1) ?? '';
  const monthEnd = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const firstCutoff = firstMonth ? monthEnd(firstMonth) : '';
  const lastCutoff = lastMonth ? (monthEnd(lastMonth) > scope.anchor ? scope.anchor : monthEnd(lastMonth)) : '';
  const firstActive = new Set(firstCutoff ? executiveActiveCompanyIdsAt(scope, firstCutoff) : []);
  const lastActive = new Set(lastCutoff ? executiveActiveCompanyIdsAt(scope, lastCutoff) : []);
  const territory = executiveCompanyTerritory(scope);
  const cityGre = new Map(scope.dataset.cities.map(row => [row.id, row.greId]));
  const observedGres = new Set(scope.employment.map(row => cityGre.get(row.cityId)).filter(Boolean));
  const rows = scope.dataset.gres.filter(gre => observedGres.has(gre.id)).map(gre => {
    const facts = scope.employment.filter(row => cityGre.get(row.cityId) === gre.id);
    const employmentFirst = facts.filter(row => row.month === firstMonth).reduce((sum, row) => sum + row.stock, 0);
    const employmentLast = facts.filter(row => row.month === lastMonth).reduce((sum, row) => sum + row.stock, 0);
    const firstCompanyIds = [...firstActive].filter(id => territory.get(id) === gre.id);
    const lastCompanyIds = [...lastActive].filter(id => territory.get(id) === gre.id);
    return { id: gre.id, label: greName(gre.name), firstMonth, lastMonth, firstCutoff, lastCutoff,
      employmentFirst, employmentLast, employmentChange: firstMonth !== lastMonth ? growth(employmentFirst, employmentLast) : null,
      companiesFirst: firstCompanyIds.length, companiesLast: lastCompanyIds.length,
      companyChange: firstMonth !== lastMonth ? growth(firstCompanyIds.length, lastCompanyIds.length) : null, firstCompanyIds, lastCompanyIds };
  });
  return { rows, firstMonth, lastMonth, firstCutoff, lastCutoff, comparable: !scope.employmentScopeLimited };
}
