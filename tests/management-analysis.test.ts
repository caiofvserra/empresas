import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset';
import { defaultFilters } from '../src/domain/types';
import { selectScope } from '../src/domain/engine';
import { selectInstitutionalScope } from '../src/domain/institutional';
import { exportInstitutionalCsv } from '../src/domain/institutional-export';
import { institutionalIndicators } from '../src/domain/institutional-indicators';
import { reportIndicators } from '../src/domain/report-indicators';
import published from '../src/domain/creasp-management-public.json';

test('official CREA-SP aggregates preserve geography, distinct units and reported lower bounds', () => {
  assert.equal(published.metadata.uf, 'SP');
  assert.equal(published.metadata.referenceYear, 2025);
  assert.equal(published.metadata.synthetic, false);
  assert.equal(new Set(published.facts.map(row => row.id)).size, 13);
  const get = (id: string) => published.facts.find(row => row.id === id)!;
  assert.equal(get('creasp-2025-coworking-units').value, 37);
  assert.equal(get('creasp-2025-crealab-spaces').value, 2);
  for (const id of ['creasp-2025-coworking-users', 'creasp-2025-capacita-certificates', 'creasp-2025-capacita-spectators']) {
    assert.equal(get(id).valueKind, 'lowerBound'); assert(get(id).displayValue.startsWith('>'));
  }
  assert.equal(get('creasp-2025-infraction-notices').valueKind, 'approximate');
  assert(published.facts.every(row => row.uf === 'SP' && row.year === 2025));
});

test('active definitions preserve relational measures and exclude manual publication snapshots', () => {
  const definitions = reportIndicators;
  assert.equal(new Set(definitions.map(row => row.id)).size, definitions.length);
  assert(!definitions.some(row => row.id.startsWith('creasp-2025-')));
  assert(!definitions.some(row => row.id === 'priority' || row.id.startsWith('institutional')));
  assert(!definitions.some(row => ['publicProfessionalsSp', 'publicGraduates', 'pncpPublicCount', 'pncpPublicValue', 'publishedSalary', 'publishedFormationRegistration'].includes(row.id)));
  for (const id of ['activeCompaniesWithoutRt', 'activeArtAuthorsObserved', 'corporateReceipts', 'digitalEligible', 'digitalConvergent', 'registeredGraduates', 'registeredFormationLag']) {
    const definition = definitions.find(row => row.id === id)!;
    assert(definition); assert(definition.formula && definition.unit && definition.competence && definition.limitations && definition.owner);
  }
});

test('institutional exports enforce permission and distinguish cowork usage from attendance events', () => {
  const scope = selectInstitutionalScope(selectScope(dataset, defaultFilters), { programIds: ['coworkings'] });
  const financial = exportInstitutionalCsv(scope, { export: true, financial: true });
  const restricted = exportInstitutionalCsv(scope, { export: true, financial: false });
  assert.throws(() => exportInstitutionalCsv(scope, { export: false, financial: true }), /não permite/);
  assert(financial.startsWith('\uFEFF'));
  assert(financial.includes('Custo integral da atividade'));
  assert(!restricted.includes('Custo integral da atividade'));
  assert(restricted.includes('Horas de posição de trabalho utilizadas'));
  assert.equal(restricted.split('\r\n').length - 1, scope.activities.length);
  const records = restricted.split('\r\n').slice(1);
  assert(records.every(row => row.includes('"Não se aplica";"Não se aplica"')));
  assert(records.some(row => !row.includes('"Não se aplica";"0";"Não se aplica";"0"')));
});

test('activity export does not charge selected people a fabricated share of the full activity cost', () => {
  const companyScope = selectScope(dataset, defaultFilters);
  const base = selectInstitutionalScope(companyScope, { programIds: ['formacao'] });
  const known = base.participation.find(row => row.attended && row.professionalId)!;
  const selected = selectInstitutionalScope(companyScope, { programIds: ['formacao'], activityIds: [known.activityId], professionalIds: [known.professionalId!] });
  const csv = exportInstitutionalCsv(selected, { export: true, financial: true });
  assert.equal(selected.activities.length, 1);
  assert.equal(csv.split('\r\n').length, 2);
  assert(csv.includes(`"${selected.activities[0].costCents / 100}"`));
  assert(csv.includes('sem rateio por pessoas'));
});
