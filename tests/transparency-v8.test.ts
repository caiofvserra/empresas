import assert from 'node:assert/strict';
import test from 'node:test';
import { selectTransparencyRows, summarizeTransparency, calculateFiscalBudgetShare, exportTransparencyCsv, transparencySource, transparencyAudit } from '../src/domain/transparency';
import catalog from '../src/domain/confea-ui-v8.json';
import rules from '../src/domain/transparency-rules-v8.json';

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const rows = selectTransparencyRows({ includeFederal: true });
const parseCsv = (text: string) => {
  const records: string[][] = []; let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (character === '\uFEFF' && i === 0) continue;
    if (character === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
    } else if (character === ';' && !quoted) { row.push(cell); cell = ''; }
    else if (character === '\n' && !quoted) { row.push(cell.replace(/\r$/, '')); records.push(row); row = []; cell = ''; }
    else cell += character;
  }
  if (cell || row.length) { row.push(cell); records.push(row); }
  return records;
};

test('the 53 Confea definitions have unique codes and unknown current values, never workbook cached numbers', () => {
  assert.equal(rows.length, 53);
  assert.deepEqual(rows.map(row => Number(row.code)), Array.from({ length: 53 }, (_, index) => index + 1));
  assert.equal(new Set(rows.map(row => row.id)).size, 53);
  assert(rows.every(row => row.numericValue === null && row.sourceStatus === 'connection-required'));
  assert.equal(transparencySource.isAutomaticDataSource, false);
  assert.equal(catalog.refreshContract.numericValuesFromWorkbookEnabled, false);
  assert.equal(catalog.refreshContract.missingValuePolicy, 'null_is_unknown_not_zero');
  assert(catalog.indicators.every(row => row.evidence.filledValueIsLiveData === false));
});

test('CREA-SP scope excludes federal-only measures by default while retaining explicit mixed dependencies', () => {
  const regional = selectTransparencyRows(), summary = summarizeTransparency();
  assert.equal(regional.length, 44);
  assert.equal(regional.filter(row => row.scope === 'crea_sp').length, 42);
  assert.equal(regional.filter(row => row.scope === 'mixed_requires_confea').length, 2);
  assert(!regional.some(row => row.scope === 'confea_national'));
  assert.equal(summary.federalIndicatorsExcluded, 9);
  assert.equal(summary.regionalIndicators, 44);
  assert.equal(summary.calculatedCurrentValues, 0);
  assert.equal(summary.connectedSources, 0);
  assert.equal(summary.publicReleaseApproved, false);
});

test('catalog search, program, mandatory classification and numeric sort apply to the same selected records', () => {
  const candidate = rows.find(row => row.mandatoryReport && row.scope === 'crea_sp')!;
  const program = selectTransparencyRows({ program: candidate.program, mandatoryOnly: true });
  assert(program.length > 0);
  assert(program.every(row => row.program === candidate.program && row.mandatoryReport));
  const searched = selectTransparencyRows({ search: normalize(candidate.title) });
  assert(searched.some(row => row.id === candidate.id));
  const forward = selectTransparencyRows({ includeFederal: true }), reverse = selectTransparencyRows({ includeFederal: true, descending: true });
  assert.deepEqual(reverse.map(row => row.id), forward.map(row => row.id).reverse());
  assert.deepEqual(selectTransparencyRows({ search: 'SEM_CORRESPONDENCIA_CATALOGO_987654' }), []);
});

test('indicator 53 uses approved fiscal budget 183 over approved total 182 and represents share, not real growth', () => {
  const indicator = rows.find(row => row.code === '53')!;
  assert.deepEqual(indicator.dependencies.map(row => row.split(' · ')[0]).sort(), ['crea:182', 'crea:183']);
  assert(indicator.reviewNotes.some(note => note.includes('participação orçamentária')));
  assert(indicator.reviewNotes.some(note => note.includes('Não mede por si')));
  assert.equal(calculateFiscalBudgetShare(200, 1000), 0.2);
  assert.equal(calculateFiscalBudgetShare(0, 1000), 0);
  assert.equal(calculateFiscalBudgetShare(null, 1000), null);
  assert.equal(calculateFiscalBudgetShare(200, null), null);
  assert.equal(calculateFiscalBudgetShare(0, 0), null);
  for (const [fiscal, total] of [[-1, 100], [100, -1], [Infinity, 100], [NaN, 100], [101, 100]]) {
    assert.throws(() => calculateFiscalBudgetShare(fiscal, total));
  }
});

test('indicator 35 retains the known denominator discrepancy before any calculation and never resolves it silently', () => {
  const indicator = rows.find(row => row.code === '35')!;
  assert.equal(indicator.numericValue, null);
  assert(indicator.reviewNotes.some(note => note.includes('J156') && note.includes('J155')));
  assert(indicator.reviewNotes.some(note => note.includes('nenhuma correção silenciosa')));
  const source = catalog.indicators.find(row => row.indicatorId === 35)!;
  assert(source.excelFormula.includes('J156'));
  assert(normalize(source.formulaText).includes('anterior'));
  assert(transparencyAudit.some(note => note.id === 'indicator_35_denominator_mismatch'));
});

test('active data requirements preserve source routes and exclude the retired 37-C metric', () => {
  const data = selectTransparencyRows({ mode: 'data' });
  assert(data.length > 0);
  assert(!data.some(row => row.code === '37-C'));
  assert(data.every(row => row.numericValue === null && row.sourceStatus === 'connection-required'));
  for (const row of catalog.metrics.filter(row => row.catalogStatus === 'active_rule')) {
    assert.equal(row.sourceRoute.transport, 'on_premises_gateway');
    assert.deepEqual(row.sourceRoute.databases, ['SQL Server', 'DB2']);
    assert.equal(row.sourceRoute.workbookIsDataFeed, false);
  }
});

test('catalog CSV exports only selected definitions with empty current-value cells and enforces role restrictions', () => {
  const selected = selectTransparencyRows({ includeFederal: true, search: rows.find(row => row.code === '53')!.title });
  assert(selected.some(row => row.code === '53'));
  const csv = exportTransparencyCsv(selected, true), parsed = parseCsv(csv);
  assert.equal(parsed.length, selected.length + 1);
  assert.equal(parsed[0].indexOf('Valor atual'), 12);
  assert(parsed.slice(1).every(row => row[12] === '' && row[11] === 'Fonte não conectada'));
  assert.deepEqual(parsed.slice(1).map(row => row[0]), selected.map(row => row.code));
  assert.throws(() => exportTransparencyCsv(selected, false), /não permite exportação/);
  const injection = exportTransparencyCsv([{ ...selected[0], title: '=HYPERLINK("external")' }], true);
  assert.equal(parseCsv(injection)[1][1], '\'=HYPERLINK("external")');
});

test('verified publication obligations distinguish regional DN216 rules, Confea submissions and initially federal API endpoints', () => {
  assert.equal(rules.jurisdiction, 'CREA-SP / São Paulo');
  assert.equal(rules.publicationStatus, 'private_preview_only');
  assert.equal(rules.publicPublicationAuthorized, false);
  assert(rules.sources.every(source => source.numericDataFeed === false));
  const report = rules.obligations.find(row => row.id === 'regional-management-report')!;
  assert.equal(report.sourceId, 'tcu-dn216'); assert.equal(report.section, 'art. 4º, I');
  assert.equal(report.mandatoryForRegional, true); assert.equal(report.obligationKind, 'active_publication');
  assert(report.excerpt.includes('31 de março'));
  const submission = rules.obligations.find(row => row.id === 'regional-annual-package')!;
  assert.equal(submission.obligationKind, 'submission_to_federal'); assert(submission.excerpt.includes('1º de abril'));
  const federalApi = rules.obligations.find(row => row.id === 'federal-standard-api')!;
  assert.equal(federalApi.appliesTo, 'confea_national'); assert.equal(federalApi.mandatoryForRegional, false);
  assert.equal(federalApi.sourceId, 'tcu-segecex10'); assert.equal(federalApi.section, 'art. 7º');
  assert(federalApi.excerpt.includes('apenas dos conselhos federais'));
  const spending = rules.obligations.find(row => row.id === 'public-budget-execution')!;
  assert(spending.description.includes('Não se confundem com débitos individuais'));
});
