import test from 'node:test';
import assert from 'node:assert/strict';
import { rotuloTrimestre, variacaoPlana } from '../src/cockpit/formatos.ts';

test('variação que arredonda para zero fica neutra, e não vermelha', () => {
  assert.equal(variacaoPlana(0.3, 'pct'), true, '+0,3% aparece como 0%');
  assert.equal(variacaoPlana(-0.4, 'pct'), true);
  assert.equal(variacaoPlana(0.6, 'pct'), false, '+0,6% arredonda para +1%');
  assert.equal(variacaoPlana(0.04, 'pp'), true, 'p.p. mostra uma casa: 0,04 vira 0');
  assert.equal(variacaoPlana(-0.06, 'pp'), false, '-0,06 p.p. aparece como -0,1');
});

test('trimestre escrito do mesmo jeito em todo o painel', () => {
  assert.equal(rotuloTrimestre('2024-T4'), '4º tri/24');
  assert.equal(rotuloTrimestre('2026-T1'), '1º tri/26');
});
