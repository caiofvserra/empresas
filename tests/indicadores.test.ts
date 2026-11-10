import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { DA_TERCEIRA_INSTANCIA, SOMAS, TOTAL_METRICAS, calcularIndicadores, calendarioEntregas, exercicioPadrao, exerciciosNaData, indicadoresConfea, indicadoresDoCrea, metricasDoEstado, porRegional,
  quadroSistema, reais } from '../src/domain/sistema-confea.ts';

/*
 * O domínio do painel de Indicadores do Sistema (10/11/2026): a planilha do Confea (161 métricas, 35 indicadores, dos quais 29 do
 * Crea), os exercícios que a data deixa ler, as fórmulas dos indicadores, as conferências plantadas no cenário, os números reais do
 * Sumário de 2025 e as regionais que somam o Conselho inteiro.
 */
const hoje = dataset.snapshotDate;

test('planilha: 161 métricas e 35 indicadores; os seis da 3ª instância são do Confea e o Crea-SP calcula 29', () => {
  assert.equal(TOTAL_METRICAS, 161);
  assert.equal(indicadoresConfea.length, 35);
  assert.equal(indicadoresDoCrea.length, 29);
  for (const c of DA_TERCEIRA_INSTANCIA) assert.ok(!indicadoresDoCrea.includes(c));
  assert.equal(SOMAS.length, 17);
});

test('exercícios: os completos desde 2022 e o do ano da data, parcial até ela; o padrão é o último completo', () => {
  const lista = exerciciosNaData('2026-09-30');
  assert.deepEqual(lista.map(e => e.ano), [2022, 2023, 2024, 2025, 2026]);
  assert.deepEqual(lista.map(e => e.parcial), [false, false, false, false, true]);
  assert.equal(lista.at(-1)!.fim, '2026-09-30');
  assert.equal(exercicioPadrao('2026-09-30'), 2025);
  // Numa data de dezembro, o exercício do ano ainda está aberto; o padrão continua o anterior.
  assert.equal(exercicioPadrao('2026-12-15'), 2025);
});

test('fórmulas: o crescimento, a razão e a taxa saem como a planilha manda, e métrica vazia impede o indicador', () => {
  const ex = exerciciosNaData(hoje).find(e => e.ano === 2025)!;
  const valores = new Map<number, number | null>([[1, 100], [3, 110], [6, 20], [8, 22], [21, 50], [22, 10], [24, 90], [37, 1000], [38, 250]]);
  const ind = calcularIndicadores(valores, ex);
  assert.ok(Math.abs(ind.get(1)!.valor! - 10) < 1e-9, 'crescimento dos profissionais: (110 + 22 - 100 - 20) / 120 = 10%');
  assert.ok(Math.abs(ind.get(3)!.valor! - 1.5) < 1e-9, 'quadro técnico por empresa: 90 / (50 + 10)');
  assert.ok(Math.abs(ind.get(12)!.valor! - 25) < 1e-9, 'índice de autuação: 250 / 1000');
  valores.set(38, null);
  assert.equal(calcularIndicadores(valores, ex).get(12)!.valor, null);
  assert.deepEqual(calcularIndicadores(valores, ex).get(12)!.falta, [38]);
});

test('cenário: em 2025, os números reais do Sumário, as duas conferências que não fecham e as três métricas vazias', () => {
  const q = quadroSistema(dataset, hoje, 2025, null);
  assert.equal(q.estado.get(37), reais[37].valor);
  assert.equal(q.estado.get(25), reais[25].valor);
  assert.equal(q.estado.get(2)! + q.estado.get(7)!, reais[2].valor);
  assert.deepEqual(q.conferencias.filter(c => c.situacao === 'Não fecha').map(c => c.metricas[0]).sort((a, b) => a - b), [60, 98]);
  assert.deepEqual([...q.situacao].filter(([, st]) => st === 'Vazia').map(([c]) => c), [111, 156, 157]);
  assert.equal(q.indicadores.get(16)!.valor, null, 'sem as métricas 156 e 157, o indicador 16 não sai');
  assert.ok(q.real(37) && !q.real(1));
});

test('regionais: as 16 somam o Conselho nas métricas que se dividem, e o crescimento de cada uma fica perto do estado', () => {
  for (const ano of [2024, 2025, 2026]) {
    const q = quadroSistema(dataset, hoje, ano, null);
    assert.equal(q.regionais.length, 16);
    for (const [c, total] of q.estado) {
      if (!porRegional(c) || total === null) continue;
      const soma = q.regionais.reduce((t, r) => t + (r.metricas.get(c) ?? 0), 0);
      assert.ok(Math.abs(soma - total) < 0.5, `${ano} M${c}: ${soma} contra ${total}`);
    }
  }
  // O estoque do ano anterior de cada regional (métrica 1) é o estoque de fim do ano anterior (métrica 3), regional a regional.
  const q24 = quadroSistema(dataset, hoje, 2024, null), q25 = quadroSistema(dataset, hoje, 2025, null);
  for (const r of q25.regionais) {
    const antes = q24.regionais.find(x => x.greId === r.greId)!.metricas.get(3)!, inicio = r.metricas.get(1)!;
    assert.ok(Math.abs(inicio - antes) / antes < 0.03, `${r.greId}: ${inicio} contra ${antes}`);
    const crescimento = r.indicadores.get(1)!.valor!;
    assert.ok(crescimento > -3 && crescimento < 9, `${r.greId}: crescimento de ${crescimento}%`);
  }
});

test('com uma regional escolhida, o indicador que não se divide por regional fica do Conselho inteiro', () => {
  const conselho = quadroSistema(dataset, hoje, 2025, null), gre = quadroSistema(dataset, hoje, 2025, 'GRE5');
  assert.equal(gre.indicadores.get(17)!.valor, conselho.indicadores.get(17)!.valor, 'julgamento é do Conselho');
  assert.notEqual(gre.indicadores.get(1)!.valor, conselho.indicadores.get(1)!.valor, 'crescimento dos profissionais segue a regional');
  assert.ok(gre.doEstado(150) && !gre.doEstado(3), 'a despesa não se divide por regional; os profissionais sim');
});

test('calendário: as próximas entregas depois da data, em ordem, com a mensal no dia 20', () => {
  const lista = calendarioEntregas(hoje);
  assert.ok(lista.length > 0 && lista.every(e => e.data > hoje));
  assert.deepEqual(lista.map(e => e.data), [...lista.map(e => e.data)].sort());
  assert.ok(lista.filter(e => e.ritmo === 'Mensal').every(e => e.data.endsWith('-20')));
  assert.ok(metricasDoEstado(exerciciosNaData(hoje).at(-1)!).size === 161);
});
