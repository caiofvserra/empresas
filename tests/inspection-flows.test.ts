import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset';
import { classifyContract } from '../src/domain/engine';
import { buildInspectionFlow, buildContractClassificationFlow } from '../src/components/InspectionIntelligence';
import { reportDomains, reportDomainFor } from '../src/domain/report-architecture';

test('six BI domains partition every report route and keep inspection in its own domain', () => {
  assert.equal(reportDomains.length, 6);
  const routes = reportDomains.flatMap(domain => [...domain.pages]);
  assert.equal(routes.length, new Set(routes).size);
  assert.equal(reportDomainFor('professionals').id, 'professionals');
  assert.equal(reportDomainFor('technical').id, 'professionals');
  assert.equal(reportDomainFor('financial').id, 'companies');
  assert.deepEqual(reportDomainFor('inspection').pages, ['inspection']);
});

test('inspection Sankey conserves actual case histories and has one terminal exit per case', () => {
  const flow = buildInspectionFlow(dataset.cases, dataset.snapshotDate);
  assert.equal(flow.includedCount, dataset.cases.length);
  assert.equal(flow.excludedCaseIds.length, 0);
  const ends = new Set(flow.nodes.filter(node => node.depth === 5).map(node => node.name));
  const exits = flow.links.filter(link => ends.has(link.target));
  assert.equal(exits.reduce((sum, link) => sum + link.value, 0), dataset.cases.length);
  assert.equal(new Set(exits.flatMap(link => link.recordIds)).size, dataset.cases.length);
  for (const node of flow.nodes.filter(node => node.depth > 0 && node.depth < 5)) {
    const incoming = flow.links.filter(link => link.target === node.name).reduce((sum, link) => sum + link.value, 0);
    const outgoing = flow.links.filter(link => link.source === node.name).reduce((sum, link) => sum + link.value, 0);
    assert.equal(incoming, outgoing, node.name);
  }
  for (const link of flow.links) {
    assert.equal(link.recordIds.length, link.value);
    assert(link.companyIds.every(id => dataset.companies.some(company => company.id === id)));
  }
});

test('future case events never enter historical flows and reversals are reported for review', () => {
  const example = dataset.cases.find(row => row.history.length > 2)!;
  const earlier = buildInspectionFlow([example], example.history[0].date);
  assert.equal(earlier.includedCount, 1);
  assert.equal(earlier.links.length, 1);
  assert.equal(earlier.links[0].value, 1);
  const reversed = { ...example, history: [...example.history, { date: dataset.snapshotDate, status: 'Identificada' as const, note: 'Retorno sintético para validação' }] };
  const flow = buildInspectionFlow([reversed], dataset.snapshotDate);
  assert.equal(flow.includedCount, 0);
  assert.deepEqual(flow.excludedCaseIds, [example.id]);
});

test('contract classification flows count each contract once without fabricating documentary evidence', () => {
  const rows = dataset.contracts.map(row => ({ ...row, prediction: classifyContract(row.object) }));
  const flow = buildContractClassificationFlow(rows);
  assert.equal(flow.links.reduce((sum, link) => sum + link.value, 0), rows.length);
  assert.equal(new Set(flow.links.flatMap(link => link.recordIds)).size, rows.length);
  for (const link of flow.links) assert.equal(new Set(link.recordIds).size, link.value);
  assert(flow.nodes.every(node => /Publicada|Sugestão/.test(node.name)));
  assert(!flow.nodes.some(node => /ART ausente|irregular|infração/i.test(node.name)));
});
