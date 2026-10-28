import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { defaultFilters } from '../src/domain/types.ts';
import { selectEnterpriseScope } from '../src/enterprise-v10/filters.ts';
import { buildEnterpriseModel } from '../src/enterprise-v10/model.ts';
import { buildKpis, caoService, complianceFlow, debtRows, decompose, defaultTargets, greScorecard, holtForecast, inspectionFlow, median, narrative, priorityMatrix, quantile, receiptsYoY, stockBridge } from '../src/gestao-v14/metrics.ts';

const scope = selectEnterpriseScope(dataset, defaultFilters);
const model = buildEnterpriseModel(scope);
const historyScope = selectEnterpriseScope(dataset, { ...defaultFilters, period: 24 });
const history = buildEnterpriseModel(historyScope);

test('ponte do estoque reconcilia abertura, entradas e saídas em empresas distintas', () => {
  const bridge = stockBridge(model, scope);
  assert.equal(bridge.opening + bridge.newcomers + bridge.returning - bridge.exits, bridge.closing);
  assert.equal(bridge.closing, model.metrics.base.value);
  assert.equal(new Set([...bridge.newcomerIds, ...bridge.returningIds]).size, bridge.newcomers + bridge.returning);
  assert.ok(bridge.exitIds.every(id => !model.metadata.activeCompanyIds.includes(id)));
});

test('funil de conformidade conserva o fluxo em cada etapa', () => {
  const { nodes, links } = complianceFlow(model, scope);
  const value = (name: string) => nodes.find(node => node.name === name)?.value ?? 0;
  const outgoing = (name: string) => links.filter(link => link.source === name).reduce((sum, link) => sum + link.value, 0);
  assert.equal(outgoing('Universo empresarial'), value('Universo empresarial'));
  assert.equal(value('Registro vigente'), model.metrics.base.value);
  assert.equal(outgoing('Registro vigente'), value('Registro vigente'));
  assert.equal(value('Com RT'), model.metrics.rtCoverage.numerator);
  assert.equal(outgoing('Com RT') + outgoing('RT não identificado'), value('Registro vigente'));
});

test('previsão de Holt segue tendência linear e marca anomalias', () => {
  const linear = holtForecast([10, 20, 30, 40, 50, 60, 70, 80], 3);
  assert.deepEqual(linear.forecast.map(Math.round), [90, 100, 110]);
  assert.equal(linear.anomalies.length, 0);
  const spike = holtForecast([100, 101, 102, 103, 104, 180, 106, 107, 108, 109, 110, 111], 2);
  assert.ok(spike.anomalies.includes(5));
  assert.ok(spike.upper.every((value, index) => value >= spike.forecast[index] && spike.lower[index] <= spike.forecast[index]));
  assert.deepEqual(holtForecast([5, 6], 3).forecast, []);
});

test('árvore de decomposição soma o saldo vencido do modelo em qualquer dimensão', () => {
  const rows = debtRows(model, scope);
  const total = model.metrics.overdue.value!;
  for (const dimension of ['gre', 'size', 'cnae', 'aging', 'rt'] as const) {
    const nodes = decompose(rows, dimension);
    assert.ok(Math.abs(nodes.reduce((sum, node) => sum + node.value, 0) - total) < 0.01, dimension);
    assert.ok(Math.abs(nodes.reduce((sum, node) => sum + node.share, 0) - 100) < 1e-6);
    assert.ok(nodes.every((node, index) => index === 0 || nodes[index - 1].value >= node.value));
  }
});

test('KPIs trazem série, variação e meta coerentes com o modelo', () => {
  const kpis = buildKpis(model, history, scope, defaultTargets);
  assert.equal(kpis.length, 5);
  assert.equal(kpis[0].value, model.metrics.base.value);
  assert.equal(kpis[0].spark.length, 24);
  assert.equal(kpis[0].spark.at(-1), model.metrics.base.value);
  assert.equal(kpis[1].delta, model.metrics.coverage.value! - defaultTargets.coverage);
  assert.ok(kpis[4].value! > 0, 'potencial estimado positivo');
});

test('scorecard por GRE fecha com a base e gera série de 24 meses', () => {
  const rows = greScorecard(model, history, scope);
  assert.ok(rows.length > 0);
  assert.ok(rows.every(row => row.spark.length === 24));
  assert.ok(rows.every(row => row.spark.at(-1) === row.base));
});

test('recebimentos ano contra ano alinham 12 meses atuais a 12 anteriores', () => {
  const rows = receiptsYoY(history);
  assert.equal(rows.length, 12);
  assert.equal(rows.at(-1)!.month, history.monthly.at(-1)!.month);
  assert.equal(rows[0].previous, history.monthly[0].receipts);
});

test('matriz de prioridade usa critérios explícitos e mutuamente exclusivos', () => {
  const { points, overdueCut, gapCut } = priorityMatrix(model, scope);
  for (const point of points) {
    const debt = point.overdue > overdueCut && point.overdue > 0, gap = point.gapShare >= gapCut;
    assert.equal(point.quadrant, debt && gap ? 'Agir já' : debt ? 'Cobrar' : gap ? 'Orientar RT' : 'Acompanhar');
  }
});

test('operação: funil monotônico, prazos de CAO e narrativa automática', () => {
  const flow = inspectionFlow(scope);
  assert.ok(flow.reached.every((row, index) => index === 0 || flow.reached[index - 1].count >= row.count));
  assert.equal(flow.backlog.reduce((sum, row) => sum + row.byStage.reduce((a, b) => a + b, 0), 0), flow.open);
  const cao = caoService(scope);
  assert.equal(cao.histogram.reduce((sum, row) => sum + row.count, 0), cao.issued);
  assert.ok(cao.median !== null && cao.p90! >= cao.median);
  const kpis = buildKpis(model, history, scope, defaultTargets);
  const insights = narrative(kpis, stockBridge(model, scope), greScorecard(model, history, scope), holtForecast(history.monthly.map(row => row.base)), decompose(debtRows(model, scope), 'gre'), defaultTargets, cao);
  assert.ok(insights.length >= 5);
  assert.ok(insights.every(item => item.strong && item.text));
});

test('estatísticas auxiliares', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([]), null);
  assert.equal(quantile([0, 10], 0.9), 9);
});
