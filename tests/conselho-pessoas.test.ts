import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { buildEntidades } from '../src/domain/entidades.ts';
import { buildConselho, quadroConselho } from '../src/domain/conselho.ts';
import { conselheiros, diariasPorPessoa, servidores } from '../src/domain/pessoas-conselho.ts';

/**
 * Gastos com nome (06/11/2026, pedido do Caio): quem recebe diárias, quem são os servidores de cada função e quem são os fornecedores.
 * Seams: servidores, conselheiros e diariasPorPessoa, que precisam fechar com os totais que o painel já mostra.
 */
const hoje = dataset.snapshotDate, contas = buildConselho(dataset), entidades = buildEntidades(dataset);
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const equipe = servidores(contas, dataset), plenario = conselheiros(entidades);

test('servidores: um por posto de cada função, com nome, cargo e remuneração que somam o custo mensal publicado', () => {
  for (const row of contas.pessoal) {
    const da = equipe.filter(s => s.funcao === row.funcao);
    assert.equal(da.filter(s => s.vinculo === 'Efetivo').length, row.efetivos, `${row.funcao}: efetivos`);
    assert.equal(da.filter(s => s.vinculo === 'Comissionado').length, row.comissionados, `${row.funcao}: comissionados`);
    assert.ok(Math.abs(sum(da.map(s => s.remuneracao)) - row.custoMes) <= da.length, `${row.funcao}: remuneração soma o custo`);
  }
  assert.ok(equipe.every(s => s.nome.split(' ').length >= 3 && s.cargo && s.remuneracao > 0));
  assert.equal(new Set(equipe.map(s => s.nome)).size, equipe.length, 'nomes não se repetem');
  assert.ok(equipe.some(s => s.funcao === 'Fiscalização' && s.greId), 'fiscais lotados nas GREs');
});

test('conselheiros: um por cadeira do plenário, com a organização que indicou', () => {
  assert.equal(plenario.length, sum(entidades.organizacoes.map(org => org.cadeiras)));
  assert.ok(plenario.every(row => row.nome && row.sigla));
  assert.equal(new Set([...plenario, ...equipe].map(row => row.nome)).size, plenario.length + equipe.length, 'conselheiro e servidor nunca têm o mesmo nome');
});

test('diárias por pessoa: fecham com o total de cada categoria, no estado e numa GRE, e o fiscal da GRE é lotado nela', () => {
  for (const greId of [null, dataset.gres[3].id]) {
    const quadro = quadroConselho(contas, hoje, greId, new Map()), pessoas = diariasPorPessoa(contas, equipe, plenario, hoje, greId);
    for (const row of quadro.diarias) {
      const delas = pessoas.filter(p => p.categoria === row.categoria);
      assert.equal(sum(delas.map(p => p.valor)), row.valor, `${row.categoria} (${greId ?? 'estado'}): valor`);
      assert.equal(sum(delas.map(p => p.quantidade)), row.quantidade, `${row.categoria} (${greId ?? 'estado'}): diárias`);
    }
    if (greId) assert.ok(pessoas.filter(p => p.categoria === 'Inspetores e agentes de campo').every(p => p.greId === greId));
    assert.ok(pessoas.every(p => p.nome && p.valor > 0 && p.quantidade > 0));
    const ordem = pessoas.map(p => p.valor); assert.deepEqual(ordem, [...ordem].sort((a, b) => b - a), 'maior valor primeiro');
  }
});

test('fornecedores com nome próprio, sem repetir, e não mais "Fornecedor demonstrativo NN"', () => {
  const nomes = contas.fornecedores.map(row => row.nome);
  assert.equal(new Set(nomes).size, nomes.length);
  assert.ok(nomes.every(nome => !/Fornecedor demonstrativo/.test(nome) && !nome.includes(' · ')));
});
