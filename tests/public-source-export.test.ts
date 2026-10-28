import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { exportPublicSources, publicCsvCell } from '../scripts/export-public-sources';
import education from '../src/domain/external-education.json';
import pncp from '../src/domain/pncp-public-aggregate.json';

function csvRows(content: string) {
  const records: string[][] = [];
  let record: string[] = [], value = '', quoted = false;
  const text = content.replace(/^\uFEFF/, '');
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index++; }
      else quoted = !quoted;
    } else if (char === ';' && !quoted) { record.push(value); value = ''; }
    else if (char === '\n' && !quoted) { record.push(value.replace(/\r$/, '')); records.push(record); record = []; value = ''; }
    else value += char;
  }
  if (value || record.length) { record.push(value); records.push(record); }
  const [headers, ...rows] = records;
  return rows.map(row => Object.fromEntries(headers.map((column, index) => [column, row[index]])));
}

test('public CSV export protects spreadsheet strings while preserving negative numeric balances and Unicode', () => {
  assert.equal(publicCsvCell(' =SUM(1;2)'), '"\' =SUM(1;2)"');
  assert.equal(publicCsvCell('@cmd'), '"\'@cmd"');
  assert.equal(publicCsvCell(-812), '"-812"');
  assert.equal(publicCsvCell('São Paulo; "Civil"'), '"São Paulo; ""Civil"""');
  assert.equal(publicCsvCell(null), '""');
  assert.throws(() => publicCsvCell(Number.NaN));
});

test('ten public fact exports preserve keys, published precision, source provenance and no synthetic identifiers', () => {
  const output = mkdtempSync(join(tmpdir(), 'crea-public-csv-'));
  try {
    const summary = exportPublicSources(output);
    assert.equal(summary.tables, 10);
    assert.equal(summary.rows, 1068);
    assert.equal(summary.synthetic, false);
    assert.equal(summary.seed, null);
    const manifest = JSON.parse(readFileSync(join(output, 'manifest.json'), 'utf8'));
    assert.equal(manifest.realPublicData, true);
    assert.equal(manifest.seed, null);
    for (const table of manifest.tables) {
      const bytes = readFileSync(join(output, table.file));
      assert.deepEqual([...bytes.subarray(0, 3)], [239, 187, 191]);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), table.sha256);
      const rows = csvRows(bytes.toString());
      assert.equal(rows.length, table.rows);
      const keys = rows.map(row => JSON.stringify(table.keys.map((key: string) => row[key])));
      assert.equal(new Set(keys).size, keys.length);
      assert(rows.every(row => row.sourceUrl?.startsWith('https://')));
      assert(rows.every(row => !Object.keys(row).some(key => /^(cpf|cnpj|companyId|professionalId)$/i.test(key))));
      assert(table.grain && table.reference && table.limitations.length);
    }
  } finally { rmSync(output, { recursive: true, force: true }); }
});

test('exported education, PNCP and professional stock totals reconcile at compatible grains', () => {
  const output = mkdtempSync(join(tmpdir(), 'crea-public-totals-'));
  try {
    exportPublicSources(output);
    const read = (name: string) => csvRows(readFileSync(join(output, `${name}.csv`), 'utf8'));
    const annual = read('educacao_sp_ano'), fields = read('educacao_sp_cine_ano'), municipal = read('educacao_sp_municipio_cine_2024');
    for (const year of annual) {
      for (const metric of ['graduates', 'entrants', 'enrolled']) {
        assert.equal(fields.filter(row => row.year === year.year).reduce((sum, row) => sum + Number(row[metric]), 0), Number(year[metric]));
        if (year.year === '2024') assert.equal(municipal.reduce((sum, row) => sum + Number(row[metric]), 0), Number(year[metric]));
      }
    }
    assert.equal(Number(annual.find(row => row.year === '2024')!.graduates), education.annual.find(row => row.year === 2024)!.graduates);
    const contracts = read('pncp_sp_municipio_categoria');
    assert.equal(contracts.reduce((sum, row) => sum + Number(row.contractCount), 0), pncp.metadata.collection.spSelectedContractRows);
    assert(Math.abs(contracts.reduce((sum, row) => sum + Number(row.contractValue), 0) - pncp.rows.reduce((sum, row) => sum + row.contractValue, 0)) < 0.005);
    const stock = read('situacao_profissional_uf'), brazil = stock.find(row => row.uf === 'BR')!;
    assert.equal(stock.filter(row => row.uf !== 'BR').reduce((sum, row) => sum + Number(row.professionals), 0), Number(brazil.professionals));
    assert.equal(read('emprego_saldo_cbo').find(row => row.cbo === '2142-05')?.balance, '-812');
    assert.equal(read('registros_profissionais_ano').find(row => row.uf === 'BR' && row.year === '2026')?.partial, 'true');
  } finally { rmSync(output, { recursive: true, force: true }); }
});
