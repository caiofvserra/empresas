import test from 'node:test';
import assert from 'node:assert/strict';
import { corDoTexto, rotuloTrimestre, variacaoPlana } from '../src/cockpit/formatos.ts';

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

test('rótulo dentro da barra usa a cor de texto que mais contrasta com o fundo', () => {
  assert.equal(corDoTexto('#A9C9EE'), '#1A202C', 'azul-claro pede texto escuro');
  assert.equal(corDoTexto('#3DD6A9'), '#1A202C', 'verde-menta do tema escuro pede texto escuro');
  assert.equal(corDoTexto('#082D74'), '#FFFFFF', 'azul-marinho pede texto branco');
  assert.equal(corDoTexto('rgb(192, 86, 33)'), '#FFFFFF', 'laranja-escuro pede texto branco');
  assert.equal(corDoTexto('#F6AD55'), '#1A202C', 'laranja médio pede texto escuro');
});
