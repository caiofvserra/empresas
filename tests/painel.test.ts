import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { defaultFilters } from '../src/domain/types.ts';
import { selectEnterpriseScope } from '../src/enterprise-v10/filters.ts';
import { buildEnterpriseModel } from '../src/enterprise-v10/model.ts';
import { actionList, buildPanel, caseStages, debtAging, gapByCnae } from '../src/painel/metrics.ts';

const scope = selectEnterpriseScope(dataset, defaultFilters);
const model = buildEnterpriseModel(scope);
const history = buildEnterpriseModel(selectEnterpriseScope(dataset, { ...defaultFilters, period: 24 }));
const panel = buildPanel(scope, model, history);
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

test('regionais somam o total em empresas, lacuna, sem RT, fiscalização e dinheiro', () => {
  for (const key of ['active', 'gap', 'eligible', 'noRt', 'openCases', 'oldCases', 'debtors', 'charged'] as const) assert.equal(sum(panel.areas.map(row => row[key])), panel.total[key], key);
  assert.ok(Math.abs(sum(panel.areas.map(row => row.overdue)) - panel.total.overdue) < 0.01);
  assert.ok(Math.abs(sum(panel.areas.map(row => row.receipts)) - panel.total.receipts) < 0.01);
});

test('cobertura por área fecha com elegíveis e lacuna', () => {
  assert.equal(panel.total.eligible, model.metadata.eligibleEstablishmentIds.length);
  assert.ok(Math.abs(panel.total.coverage! - model.metrics.coverage.value!) < 1e-9);
  for (const row of panel.areas) if (row.eligible) assert.ok(Math.abs(row.coverage! - (row.eligible - row.gap) / row.eligible * 100) < 1e-9);
});

test('indicadores batem com o modelo empresarial V13', () => {
  assert.equal(panel.indicators.base.value, model.metrics.base.value);
  assert.equal(panel.indicators.gap.value, model.metadata.eligibleEstablishmentIds.length - model.metadata.activeEligibleEstablishmentIds.length);
  assert.equal(panel.indicators.noRt.value, (model.metrics.rtCoverage.denominator ?? 0) - (model.metrics.rtCoverage.numerator ?? 0));
  assert.equal(panel.indicators.debt.value, model.metrics.overdue.value);
  assert.ok(Math.abs(sum(debtAging(scope).map(row => row.value)) - model.metrics.overdue.value!) < 0.01);
  assert.equal(panel.monthly.length, 12);
});

test('listas de ação têm o mesmo tamanho dos indicadores e respeitam a área', () => {
  assert.equal(actionList('gap', scope, model).length, panel.total.gap);
  assert.equal(actionList('noRt', scope, model).length, panel.total.noRt);
  assert.equal(actionList('cases', scope, model).length, panel.total.openCases);
  assert.equal(actionList('debt', scope, model).length, model.metrics.overdue.companyIds.length);
  const capital = panel.areas.find(row => row.id === 'GRE5')!, inCapital = (row: { greId: string }) => row.greId === 'GRE5';
  assert.equal(actionList('gap', scope, model, inCapital as never).length, capital.gap);
  assert.equal(actionList('noRt', scope, model, inCapital as never).length, capital.noRt);
  assert.equal(sum(caseStages(scope, inCapital as never).map(row => row.value)), capital.openCases);
  assert.ok(sum(gapByCnae(scope, model, inCapital as never).map(row => row.value)) <= capital.gap);
});

test('filtro de regional restringe a página inteira', () => {
  const filtered = selectEnterpriseScope(dataset, { ...defaultFilters, greIds: ['GRE2'] });
  const fModel = buildEnterpriseModel(filtered), fHistory = buildEnterpriseModel(selectEnterpriseScope(dataset, { ...defaultFilters, greIds: ['GRE2'], period: 24 }));
  const view = buildPanel(filtered, fModel, fHistory);
  assert.equal(view.indicators.base.value, fModel.metrics.base.value);
  assert.ok(view.total.active < panel.total.active);
});
