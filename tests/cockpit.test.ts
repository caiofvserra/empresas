import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { defaultFilters } from '../src/domain/types.ts';
import { selectEnterpriseScope } from '../src/enterprise-v10/filters.ts';
import { buildEnterpriseModel } from '../src/enterprise-v10/model.ts';
import { buildFiscalizacao } from '../src/painel/fiscalizacao.ts';
import { contratosPublicos, ponteBase, porRegional, receita, resumoFiscal } from '../src/painel/analise.ts';
import { estruturaDe, situacoesPedido } from '../src/cockpit/estrutura.ts';
import { malhaFina, regras } from '../src/cockpit/cruzamentos.ts';
import { artsPeriodo, caminhoAcoes, entradasSaidas, linhasGre, prazoRegistro } from '../src/cockpit/medidas.ts';
import { leitura, metasPadrao } from '../src/cockpit/leitura.ts';

const f = buildFiscalizacao(dataset);
const scope = selectEnterpriseScope(dataset, { ...defaultFilters, period: 12 }), model = buildEnterpriseModel(scope);
const historyScope = selectEnterpriseScope(dataset, { ...defaultFilters, period: 24 }), history = buildEnterpriseModel(historyScope);
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const contratos = contratosPublicos(scope, 12), malha = malhaFina(scope, model, f, contratos);

test('atendimento, coworking, capacitação e orçamento fecham por partes', () => {
  const e = estruturaDe(dataset, null, 12);
  assert.equal(estruturaDe(dataset, null, 12), e, 'recorte em cache');
  assert.equal(sum(situacoesPedido.map(item => e.atendimento.partes[item].length)), e.atendimento.pedidos.length);
  assert.equal(sum(e.atendimento.porAssunto.map(row => row.total)), e.atendimento.pedidos.length);
  assert.ok(e.atendimento.taxaNoPrazo! >= 0 && e.atendimento.taxaNoPrazo! <= 100);
  assert.equal(e.coworking.celulas.length, e.coworking.unidades.length * 12);
  assert.ok(Math.abs(sum(e.orcamento.programas.map(row => row.executado)) - e.orcamento.executado) < 0.01);
  for (let index = 1; index < e.capacitacao.etapas.length; index++) assert.ok(e.capacitacao.etapas[index].valor <= e.capacitacao.etapas[index - 1].valor, 'funil não cresce');
  const capital = estruturaDe(dataset, 'GRE5', 12);
  assert.ok(capital.atendimento.pedidos.every(row => row.greId === 'GRE5') && capital.atendimento.pedidos.length < e.atendimento.pedidos.length);
});

test('malha fina v1: cada regra tem status, indícios dentro do recorte e contratos em três graus', () => {
  assert.equal(new Set(regras.map(row => row.id)).size, regras.length);
  assert.ok(regras.every(row => ['Confirmado', 'Candidato', 'Contexto'].includes(row.status) && row.fonte && row.versao && row.naoConcluir));
  assert.ok(!malha.indicios.some(row => /diretoria|piso|emprega/i.test(row.label)), 'camadas retiradas na V19 não voltam');
  const union = new Set(malha.indicios.flatMap(item => item.empresas));
  assert.deepEqual([...union].sort(), malha.empresas);
  assert.ok(malha.confirmadas.every(id => union.has(id)));
  assert.ok(malha.empresas.every(id => scope.companyIds.has(id)));
  assert.ok(malha.comAcao.every(id => f.acoes.some(row => row.companyId === id)));
  assert.equal(malha.semRegistroSim.length + malha.semRegistroPassivel.length, malha.semRegistro.length);
  for (const row of contratos) {
    assert.equal(row.situacao, !row.registrada ? 'Sem registro na data' : !row.quitada ? 'Registrada, com anuidade vencida' : 'Registrada e quitada');
    if (!row.chave) assert.equal(row.vinculo, 'Sem chave para a busca');
    if (row.vinculo === 'Confirmado por documento') assert.ok(row.artsDocumento.length > 0 && row.artsCandidatas.length === 0, 'candidata não conta como confirmada');
    if (row.vinculo === 'Candidato para revisão') assert.ok(row.artsDocumento.length === 0 && row.artsCandidatas.length > 0);
    if (row.vinculo === 'Não identificado') assert.ok(row.artsDocumento.length === 0 && row.artsCandidatas.length === 0);
  }
  assert.ok(contratos.some(row => row.vinculo === 'Confirmado por documento') && contratos.some(row => row.vinculo === 'Candidato para revisão'), 'o cenário exercita os graus');
});

test('cadastro, fiscalização e regionais reconciliam', () => {
  for (const row of entradasSaidas(history, f)) assert.equal(row.viaFiscalizacao.length + row.demais.length, history.monthly.find(month => month.month === row.month)!.entered);
  const resumo = resumoFiscal(f, null, 12), caminho = caminhoAcoes(resumo);
  assert.equal(sum(caminho.links.filter(link => link.source === 'Ações fiscalizatórias').map(link => link.value)), resumo.acoes.length);
  const auto = caminho.nodes.find(node => node.name === 'Auto de infração lavrado')!;
  assert.equal(sum(caminho.links.filter(link => link.source === auto.name).map(link => link.value)), auto.value);
  const prazo = prazoRegistro(scope, 12);
  assert.equal(sum(prazo.faixas.map(item => item.ids.length)), prazo.total);
  const arts = artsPeriodo(scope, 12), linhas = linhasGre(model, history, scope, porRegional(dataset, f, model, 12), 12, malha, arts.atual);
  assert.equal(sum(linhas.map(row => row.semRegistro)), model.metadata.eligibleEstablishmentIds.length - model.metadata.activeEligibleEstablishmentIds.length);
  assert.ok(sum(linhas.map(row => row.arts)) <= arts.atual.length);
  const insights = leitura({ metas: metasPadrao, ponte: ponteBase(model, scope, f, 12), cobertura: model.metrics.coverage.value, rt: model.metrics.rtCoverage.value, resumo, rec: receita(history, f, null, 12), saldo: model.metrics.overdue.value ?? 0,
    inadimplencia: 40, linhas, malha, arts: { atual: arts.atual.length, antes: arts.antes }, cao: 120, estrutura: estruturaDe(dataset, null, 12) });
  assert.ok(insights.length >= 10);
  assert.ok(insights.every(item => item.strong && item.text && ['presidencia', 'cadastro', 'fiscalizacao', 'malha', 'tecnica', 'receita', 'atendimento', 'publico', 'metodo'].includes(item.page)));
});
