import assert from 'node:assert/strict';
import test from 'node:test';
import { dataset } from '../src/domain/dataset';
import { classifyContract, detectAnomalies, exportCsv, group, inWindow, isActiveLink, makeSeries, matchPublicRow, outstanding, previousWindow, priorityFor, reconciliation, selectScope, summarize, windowBounds } from '../src/domain/engine';
import { indicators } from '../src/domain/indicators';
import { defaultFilters } from '../src/domain/types';
import type { Dataset, Filters, PublicRow } from '../src/domain/types';

const filters = (patch: Partial<Filters> = {}): Filters => ({ ...defaultFilters, ...patch });
const all = selectScope(dataset, filters());
const metrics = summarize(all);
const count = <T>(rows: T[], predicate: (row: T) => boolean) => rows.filter(predicate).length;

test('counting units reconcile companies, establishments and registration states independently', () => {
  assert.equal(metrics.companies, 3000);
  assert.equal(metrics.establishments, 3600);
  assert.equal(metrics.registrations, 4500);
  assert.equal(metrics.activeRegistrations + metrics.inactiveRegistrations + metrics.cancelledRegistrations, metrics.registrations);
  assert.equal(metrics.activeCompanies + metrics.inactiveCompanies, metrics.registeredCompanies);
  assert.equal(metrics.registeredCompanies + metrics.notMatched, metrics.companies);
  assert.equal(metrics.coverage, metrics.registeredCompanies / metrics.companies * 100);
  assert.notEqual(metrics.registrations, metrics.companies);
});

test('a three-month window and its comparison have equal calendar months with inclusive boundaries', () => {
  assert.deepEqual(windowBounds(3), { start: '2026-07-01', end: '2026-09-30', previousStart: '2026-04-01', previousEnd: '2026-06-30' });
  assert(inWindow('2026-07-01', 3));
  assert(inWindow('2026-09-30', 3));
  assert(!inWindow('2026-06-30', 3));
  assert(!inWindow('2026-10-01', 3));
  assert(previousWindow('2026-04-01', 3));
  assert(previousWindow('2026-06-30', 3));
  assert(!previousWindow('2026-07-01', 3));
});

test('month-only employment facts include the first selected month and all 36 historical months', () => {
  assert(inWindow('2026-07', 3));
  assert(previousWindow('2026-04', 3));
  assert.equal(selectScope(dataset, filters({ period: 36 })).employment.length, dataset.employment.length);
  const quarter = selectScope(dataset, filters({ period: 3 }));
  assert.equal(new Set(quarter.employment.map(row => row.month)).size, 3);
  assert.equal(quarter.employment.length, dataset.employment.length / 12);
});

test('CBO filters restrict aggregate employment and preserve independent company facts', () => {
  const code = dataset.cbos.find(row => row.technical)!.code;
  const scope = selectScope(dataset, filters({ cboCodes: [code] }));
  assert(scope.employment.length > 0);
  assert(scope.employment.every(row => row.cbo === code));
  assert.equal(scope.companies.length, all.companies.length);
  assert.equal(summarize(scope).registeredCompanies, metrics.registeredCompanies);
  assert(summarize(scope).employees < metrics.employees);
  assert.equal(summarize(scope).admissions, scope.employment.reduce((sum, row) => sum + row.admissions, 0));
});

test('dimension filters use OR within each dimension and AND between dimensions', () => {
  const cities = dataset.cities.slice(0, 2).map(row => row.id);
  const selectedSizes = ['Microempresa', 'Grande empresa'];
  const selected = selectScope(dataset, filters({ cityIds: cities, sizes: selectedSizes }));
  const companyMap = new Map(dataset.companies.map(row => [row.id, row]));
  const expected = dataset.establishments.filter(row => cities.includes(row.cityId) && selectedSizes.includes(companyMap.get(row.companyId)!.size));
  assert.deepEqual(selected.establishments.map(row => row.id), expected.map(row => row.id));
  assert(selected.companies.length < all.companies.length);
});

test('CNAE selection includes secondary activity without double-counting companies or establishments', () => {
  const code = dataset.establishments[0].cnaeSecondary[0];
  const selected = selectScope(dataset, filters({ cnaeCodes: [code] }));
  const expected = dataset.establishments.filter(row => row.cnaeMain === code || row.cnaeSecondary.includes(code));
  assert.deepEqual(selected.establishments.map(row => row.id), expected.map(row => row.id));
  assert.equal(new Set(selected.companies.map(row => row.id)).size, selected.companies.length);
  assert(selected.establishments.some(row => row.cnaeMain !== code));
});

test('registration status narrows establishments and preserves matching registration rows', () => {
  const selected = selectScope(dataset, filters({ registrationStatuses: ['Ativo'] }));
  assert(selected.registrations.every(row => row.status === 'Ativo'));
  assert(selected.establishments.every(row => selected.registrations.some(registration => registration.establishmentId === row.id)));
  assert.equal(summarize(selected).inactiveRegistrations, 0);
});

test('formatted CNPJ search is deterministic and name search is accent-insensitive', () => {
  const establishment = dataset.establishments[0];
  const formatted = establishment.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  const selected = selectScope(dataset, filters({ search: formatted }));
  assert.equal(selected.establishments.length, 1);
  assert.equal(selected.establishments[0].id, establishment.id);
  assert.equal(selectScope(dataset, filters({ search: establishment.cnpj.slice(0, 8) })).establishments.length, 0);
  assert(selectScope(dataset, filters({ search: 'vertice' })).companies.length > 0);
});

test('drillthrough subsets preserve related entities and empty subsets yield empty company indicators', () => {
  const companyId = dataset.registrations[0].companyId;
  const selected = selectScope(dataset, filters(), [companyId]);
  assert.equal(selected.companies.length, 1);
  for (const key of ['registrations', 'movements', 'technicalLinks', 'arts', 'caos', 'invoices', 'cases', 'contracts', 'qualityEvents'] as const) {
    assert(selected[key].every(row => row.companyId === companyId), key);
  }
  const empty = summarize(selectScope(dataset, filters(), []));
  assert.equal(empty.companies, 0);
  assert.equal(empty.coverage, 0);
  assert.equal(empty.financeUniverse, 0);
  assert(Number.isFinite(empty.registrationDaysMean));
  assert(Number.isFinite(empty.caoDaysMedian));
});

test('aggregate employment responds only to available dimensions, never individual CNPJ or company subset', () => {
  const selected = selectScope(dataset, filters({ search: dataset.establishments[0].cnpj, sizes: ['Grande empresa'], registrationStatuses: ['Ativo'] }), [dataset.companies[0].id]);
  assert.deepEqual(selected.employment, all.employment);
  assert(selected.employmentScopeLimited);
  const cityId = dataset.cities[0].id;
  const city = selectScope(dataset, filters({ cityIds: [cityId] }));
  assert(city.employment.every(row => row.cityId === cityId));
  assert(city.employment.length < all.employment.length);
  assert.equal(summarize(city).employees, city.employment.filter(row => row.month === '2026-09').reduce((sum, row) => sum + row.stock, 0));
});

test('transaction periods change flows while snapshots preserve registers, links and financial balances', () => {
  const quarter = selectScope(dataset, filters({ period: 3 }));
  const annual = selectScope(dataset, filters({ period: 12 }));
  assert.equal(quarter.registrations.length, annual.registrations.length);
  assert.equal(quarter.invoices.length, annual.invoices.length);
  assert.equal(quarter.technicalLinks.length, annual.technicalLinks.length);
  assert(quarter.contracts.length < annual.contracts.length);
  assert(quarter.arts.length < annual.arts.length);
  assert(quarter.movements.every(row => inWindow(row.date, 3)));
  assert.equal(summarize(quarter).openAmount, summarize(annual).openAmount);
});

test('financial indicators use a company denominator and exclude unmatured invoices from delinquency', () => {
  const registered = new Set(all.registrations.map(row => row.companyId));
  const eligible = all.invoices.filter(row => row.dueDate <= dataset.snapshotDate && registered.has(row.companyId));
  const universe = new Set(eligible.map(row => row.companyId));
  const overdue = eligible.filter(row => row.dueDate < dataset.snapshotDate && outstanding(row) > 0);
  const delinquent = new Set(overdue.map(row => row.companyId));
  assert.equal(metrics.financeUniverse, universe.size);
  assert.equal(metrics.delinquentCompanies, delinquent.size);
  assert.equal(metrics.compliantCompanies + metrics.delinquentCompanies, metrics.financeUniverse);
  assert.equal(metrics.compliance, (universe.size - delinquent.size) / universe.size * 100);
  assert.equal(metrics.overdueAmount, overdue.reduce((sum, row) => sum + outstanding(row), 0));
  assert(all.invoices.some(row => row.dueDate > dataset.snapshotDate));
  assert(metrics.openAmount >= metrics.overdueAmount);
});

test('financial balances aggregate all company registrations even during establishment drillthrough', () => {
  const establishment = dataset.establishments.find(row => dataset.establishments.some(other => other.companyId === row.companyId && other.cityId !== row.cityId) && dataset.invoices.some(invoice => invoice.companyId === row.companyId))!;
  assert(establishment);
  const selected = selectScope(dataset, filters({ cityIds: [establishment.cityId] }), [establishment.companyId]);
  const expected = dataset.invoices.filter(row => row.companyId === establishment.companyId);
  assert.deepEqual(selected.invoices, expected);
  assert.equal(summarize(selected).openAmount, expected.reduce((sum, row) => sum + outstanding(row), 0));
});

test('RT reconciliation distinguishes professionals from links and companies with / without current links', () => {
  const active = all.technicalLinks.filter(row => isActiveLink(row));
  assert.equal(metrics.activeLinks, active.length);
  assert.equal(metrics.distinctProfessionals, new Set(active.map(row => row.professionalId)).size);
  assert.equal(metrics.withRt + metrics.withoutRt, metrics.registeredCompanies);
  assert(metrics.distinctProfessionals <= metrics.activeLinks);
  assert(metrics.multiRt <= metrics.withRt);
  assert.equal(metrics.newLinks, count(all.technicalLinks, row => inWindow(row.startDate, 12)));
});

test('CAO issuance counts historical emissions, including certidões later revoked', () => {
  const issued = all.caos.filter(row => inWindow(row.issuedAt, 12));
  const revokedIssued = issued.filter(row => row.status === 'Revogada');
  assert(revokedIssued.length > 0);
  assert.equal(metrics.caoIssued, issued.length);
  assert.equal(metrics.caoRevoked, all.caos.filter(row => row.status === 'Revogada').length);
  assert.equal(metrics.artReferences, new Set(issued.flatMap(row => row.artIds)).size);
  assert.equal(makeSeries(all).reduce((sum, row) => sum + row.caos, 0), metrics.caoIssued);
});

test('registration time series reconcile flow, accumulated active stock and grain aggregation', () => {
  const monthly = makeSeries(all);
  assert.equal(monthly.length, 12);
  assert.equal(monthly.at(-1)!.base, metrics.activeRegistrations);
  assert.equal(monthly.reduce((sum, row) => sum + row.net, 0), metrics.net);
  assert.equal(monthly.reduce((sum, row) => sum + row.newRegistrations, 0), metrics.newRegistrations);
  for (let index = 1; index < monthly.length; index++) assert.equal(monthly[index].base - monthly[index - 1].base, monthly[index].net);
  const quarterly = makeSeries(all, 12, 'quarter');
  assert.equal(quarterly.length, 4);
  assert.equal(quarterly.reduce((sum, row) => sum + row.net, 0), metrics.net);
  assert.equal(quarterly.at(-1)!.base, metrics.activeRegistrations);
  const annual = makeSeries(all, 12, 'year');
  assert.equal(annual.reduce((sum, row) => sum + row.contractValue, 0), metrics.contractValue);
});

test('employment series reconcile admissions / dismissals, with stock from latest month rather than summed months', () => {
  const series = makeSeries(all);
  assert.equal(series.reduce((sum, row) => sum + row.admissions, 0), metrics.admissions);
  assert.equal(series.reduce((sum, row) => sum + row.dismissals, 0), metrics.dismissals);
  assert.equal(metrics.employmentBalance, metrics.admissions - metrics.dismissals);
  assert.equal(metrics.employees, dataset.employment.filter(row => row.month === '2026-09').reduce((sum, row) => sum + row.stock, 0));
});

test('dimension grouping preserves distinct counts and geographical contracts use the supplier establishment', () => {
  const rows = group(all, 'city');
  assert.equal(rows.reduce((sum, row) => sum + row.establishments, 0), metrics.establishments);
  assert.equal(rows.reduce((sum, row) => sum + row.contracts, 0), metrics.contractValue);
  for (const row of rows) {
    assert.equal(row.registered + row.notMatched, row.companies);
    assert.equal(row.coverage, row.registered / row.companies * 100);
  }
  const sectors = group(all, 'cnae');
  assert(sectors.reduce((sum, row) => sum + row.companies, 0) > metrics.companies, 'secondary CNAE many-to-many must not be falsely additive');
});

test('demonstrative classifiers explain their textual rules and do not claim trained AI or legal obligation', () => {
  const electrical = classifyContract('Contratação de serviços de manutenção preventiva e corretiva de instalações elétricas');
  assert.equal(electrical.label, 'Engenharia elétrica');
  assert(electrical.engineering);
  assert(electrical.terms.length);
  assert.match(electrical.method, /sem modelo treinado/);
  assert.match(electrical.explanation, /validação técnica/);
  assert.match(electrical.explanation, /não determina obrigação/);
  const supplies = classifyContract('Aquisição de papel e material de expediente');
  assert(!supplies.engineering);
  assert.match(supplies.explanation, /não exclui atividade técnica/);
});

test('priority score is reproducible, bounded and fully explained as verification priority', () => {
  for (const company of dataset.companies.slice(0, 50)) {
    const priority = priorityFor(company.id, all);
    assert.equal(priority.score, Math.max(0, Math.min(100, priority.factors.reduce((sum, factor) => sum + factor.points, 0))));
    assert(priority.factors.every(factor => factor.evidence.length > 0));
    assert.match(priority.limitation, /Não representa probabilidade de infração/);
    assert.deepEqual(priority, priorityFor(company.id, all));
  }
});

test('public reconciliation prioritizes exact CNPJ, flags root matches and returns review-only fuzzy suggestions', () => {
  const establishment = dataset.establishments.find(row => dataset.registrations.some(registration => registration.companyId === row.companyId))!;
  const company = dataset.companies.find(row => row.id === establishment.companyId)!;
  const row: PublicRow = { id: 'fixture', establishmentId: establishment.id, cnpj: establishment.cnpj, companyName: company.name, cityId: establishment.cityId, cnae: establishment.cnaeMain, updatedAt: dataset.snapshotDate };
  assert.equal(matchPublicRow(row, dataset).status, 'Exata');
  assert.equal(matchPublicRow({ ...row, cnpj: `${row.cnpj.slice(0, 8)}999999` }, dataset).status, 'Raiz');
  const suggestion = matchPublicRow({ ...row, cnpj: '77000001999999' }, dataset);
  assert.equal(suggestion.status, 'Sugestão');
  assert.match(suggestion.explanation, /nenhuma conciliação automática/);
  const noMatch = matchPublicRow({ ...row, cnpj: '77000002999999', companyName: 'Abacaxi Espacial QZV' }, dataset);
  assert.equal(noMatch.status, 'Sem correspondência');
  assert.match(noMatch.explanation, /Não constitui conclusão/);
});

test('reconciliation category counts reconcile to external rows without changing the canonical master', () => {
  const companyId = dataset.registrations[0].companyId;
  const scope = selectScope(dataset, filters(), [companyId]);
  const result = reconciliation(scope);
  assert.equal(result.exact + result.root + result.suggestions + result.unmatched, result.total);
  assert.equal(result.rows.length, result.total);
  assert.equal(dataset.companies.length, 3000);
});

test('CSV exports exactly the filtered establishments and honors export and financial permissions', () => {
  const selected = selectScope(dataset, filters(), [dataset.registrations[0].companyId]);
  const csv = exportCsv(selected, { export: true, financial: false }, ['name', 'cnpj', 'overdueAmount']);
  assert.equal(csv.split('\r\n').length, selected.establishments.length + 1);
  assert(csv.startsWith('\uFEFF'));
  assert(!csv.includes('Vencido'));
  assert.throws(() => exportCsv(selected, { export: false, financial: true }), /perfil/);
  assert.throws(() => exportCsv(selected, { export: true, financial: false }, ['overdueAmount']), /coluna permitida/);
  assert(exportCsv(selected, { export: true, financial: true }, ['overdueAmount']).includes('não somar por estabelecimento'));
});

test('CSV values neutralize spreadsheet formulas and quote separators, quotes and newlines', () => {
  const company = dataset.companies[0];
  const malicious = '=HYPERLINK("https://exemplo.invalid";"Nome")\nLinha';
  const fixture: Dataset = { ...dataset, companies: dataset.companies.map(row => row.id === company.id ? { ...row, name: malicious } : row) };
  const selected = selectScope(fixture, filters(), [company.id]);
  const csv = exportCsv(selected, { export: true, financial: false }, ['name']);
  assert(csv.includes('"\'=HYPERLINK(""https://exemplo.invalid"";""Nome"")\nLinha"'));
});

test('CSV registration status matches the filtered table cohort rather than unrestricted company history', () => {
  const companyId = dataset.registrations.find(row => row.status === 'Cancelado' && dataset.registrations.some(other => other.companyId === row.companyId && other.status === 'Ativo'))!.companyId;
  const scope = selectScope(dataset, filters({ registrationStatuses: ['Cancelado'] }), [companyId]);
  assert(scope.registrations.every(row => row.status === 'Cancelado'));
  assert(dataset.registrations.some(row => row.companyId === companyId && row.status === 'Ativo'));
  const csv = exportCsv(scope, { financial: false, export: true }, ['creaStatus']);
  assert(csv.includes('Situação CREA (empresa no recorte)'));
  assert(csv.split('\r\n').slice(1).every(row => row === '"Inativa"'));
});

test('every metric has a complete, unique indicator definition with a formula and validation owner', () => {
  assert.equal(new Set(indicators.map(row => row.id)).size, indicators.length);
  for (const id of Object.keys(metrics)) assert(indicators.some(row => row.id === id), `${id}: missing definition`);
  for (const definition of indicators) {
    for (const value of Object.values(definition)) assert(typeof value === 'string' && value.trim().length > 0, definition.id);
    assert.match(definition.owner, /validação a designar/);
  }
});

test('anomalies use six preceding months, exceed the explained threshold and contain only actual filtered company IDs', () => {
  const alerts = detectAnomalies(all, 12);
  assert(alerts.length > 0, 'the seeded dataset has demonstrative changes');
  for (const alert of alerts) {
    assert(Math.abs(alert.score) >= 2);
    assert(Number.isFinite(alert.baseline) && Number.isFinite(alert.observed));
    assert(alert.companyIds.every(id => all.companyIds.has(id)));
    assert.equal(new Set(alert.companyIds).size, alert.companyIds.length);
    assert(inWindow(alert.date, 12));
    assert.match(alert.explanation, /seis meses anteriores/);
    assert.match(alert.limitations, /sem modelo treinado/);
  }
  const registry = alerts.find(alert => alert.metric === 'newRegistrations');
  assert(registry);
  const series = makeSeries(all, 18);
  const index = series.findIndex(point => point.date === registry.date);
  const baseline = series.slice(index - 6, index).reduce((sum, point) => sum + point.newRegistrations, 0) / 6;
  assert.equal(registry.baseline, baseline);
  assert.equal(registry.observed, series[index].newRegistrations);
  for (const companyId of registry.companyIds) assert(dataset.movements.some(row => row.companyId === companyId && row.type === 'Novo registro' && row.date.startsWith(registry.date.slice(0, 7))));
  assert.deepEqual(alerts, detectAnomalies(all, 12));
});

test('empty / constant analytical scopes do not fabricate anomaly scores or company records', () => {
  assert.deepEqual(detectAnomalies(selectScope(dataset, filters(), [])), []);
  const scope = selectScope(dataset, filters({ cityIds: [dataset.cities[0].id] }));
  for (const alert of detectAnomalies(scope, 3)) {
    assert(inWindow(alert.date, 3));
    assert(alert.companyIds.every(id => scope.companyIds.has(id)));
  }
});
