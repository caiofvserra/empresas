import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import data from '../src/domain/user-engineer-statistics.json';

const original = (name: string) => JSON.parse(readFileSync(join(process.cwd(), 'public/data/engineer-statistics', `${name}.json`), 'utf8'));

test('published user formation and registration flows preserve every canonical point and scope', () => {
  const graduates = original('formacao-concluintes');
  for (const series of graduates.data.series) {
    const scope = series.id === 'estrito' ? 'engineering-strict' : 'cine07-broad';
    assert.deepEqual(data.graduateAnnual.filter(row => row.scope === scope).map(row => [row.year, row.graduates]),
      series.valores.map((row: { periodo: string; valor: number }) => [Number(row.periodo), row.valor]));
  }
  const registrations = original('confea-registros-ano');
  for (const series of registrations.data.series) {
    const uf = series.id === 'nacional' ? 'BR' : 'SP';
    assert.deepEqual(data.annualRegistrations.filter(row => row.uf === uf).map(row => [row.year, row.registrations, row.partial]),
      series.valores.map((row: { periodo: string; valor: number }) => [Number(row.periodo.split('-')[0]), row.valor, row.periodo.includes('parcial')]));
  }
  assert.equal(data.annualRegistrations.filter(row => row.uf === 'SP').at(-1)?.year, 2022);
  assert.equal(data.annualRegistrations.find(row => row.uf === 'BR' && row.year === 2026)?.partial, true);
  assert(!data.graduateAnnual.some(row => row.scope === 'engineering-strict' && row.year === 2024));
});

test('public active professionals and all registration situations reconcile for every UF and Brazil', () => {
  const ufs = data.registrations.filter(row => row.uf !== 'BR');
  const brazil = data.registrations.find(row => row.uf === 'BR')!;
  assert.equal(ufs.length, 27);
  for (const row of data.registrations) {
    assert.equal(row.professionals + row.interrupted + row.cancelled + row.suspended + row.other, row.registeredTotal);
    assert(Math.abs(row.activeShare - row.professionals / row.registeredTotal * 100) <= 0.051);
    assert.equal(row.asOf, '2026-08-30');
  }
  for (const field of ['professionals', 'registeredTotal', 'interrupted', 'cancelled', 'suspended', 'other', 'population'] as const) {
    assert.equal(ufs.reduce((sum, row) => sum + row[field], 0), brazil[field], field);
  }
  assert.equal(brazil.professionals, original('confea-uf').data.valores.reduce((sum: number, row: { valor: number }) => sum + row.valor, 0));
});

test('formation, titles and professional stocks retain different grains without fabricated individual joins', () => {
  assert(data.graduateAnnual.every(row => row.kind === 'flow' && row.unit === 'pessoas/ano' && row.uf === 'BR'));
  assert(data.registrations.every(row => row.kind === 'stock' && row.scope === 'all-system-professions'));
  assert(data.engineeringTitles.every(row => row.unit === 'títulos ativos' && row.scope === 'engineering-group'));
  assert.equal(data.engineeringTitles.reduce((sum, row) => sum + row.titles, 0), original('confea-modalidades').data.porGrupo.find((row: { id: string }) => row.id === 'engenharia').valor);
  assert.equal(data.modalityTitles.reduce((sum, row) => sum + row.titles, 0), data.engineeringTitles.reduce((sum, row) => sum + row.titles, 0));
  assert(data.stockBenchmarks.every(row => row.nestedWithOtherStocks === false));
  assert.equal(data.stockBenchmarks.find(row => row.id === 'diplomados-censo2022')?.displayValue, '2,37 milhões');
  for (const rows of [data.graduateAnnual, data.annualRegistrations, data.registrations, data.engineeringTitles, data.salaryOccupations, data.employmentBalances]) {
    assert(rows.every(row => !Object.keys(row).some(key => /^(cpf|cnpj|professionalId|companyId|greId|cityId)$/i.test(key))));
  }
});

test('published aggregates have unique keys and refer to the original source registry', () => {
  const sourceIds = new Set(data.metadata.sources.map(row => row.id));
  const arrays = [data.graduateAnnual, data.annualRegistrations, data.registrations, data.engineeringTitles,
    data.stockBenchmarks, data.modalityTitles, data.salaryOccupations, data.employmentBalances];
  for (const rows of arrays) {
    for (const row of rows) {
      assert(sourceIds.has(row.sourceId));
      assert.match(row.sourceUrl, /^https:\/\//);
      assert(row.sourceConfidence.length > 0);
    }
  }
  for (const keys of [data.graduateAnnual.map(row => `${row.scope}:${row.year}`),
    data.annualRegistrations.map(row => `${row.uf}:${row.year}`), data.registrations.map(row => row.uf),
    data.engineeringTitles.map(row => row.uf), data.salaryOccupations.map(row => `${row.cbo}:${row.period}`)]) {
    assert.equal(new Set(keys).size, keys.length);
  }
});

test('downloadable canonical user envelopes match their recorded hashes without edits', () => {
  assert.equal(data.metadata.files.length, 29);
  for (const entry of data.metadata.files) {
    const bytes = readFileSync(join(process.cwd(), 'public/data/engineer-statistics', entry.file));
    assert.equal(bytes.byteLength, entry.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.file);
    assert.equal(entry.sourceUrl, `${data.metadata.projectUrl}dados/${entry.file}`);
    const parsed = JSON.parse(bytes.toString());
    assert(parsed.meta && parsed.data);
  }
});
