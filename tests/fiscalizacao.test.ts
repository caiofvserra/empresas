import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { defaultFilters } from '../src/domain/types.ts';
import { selectEnterpriseScope } from '../src/enterprise-v10/filters.ts';
import { buildEnterpriseModel } from '../src/enterprise-v10/model.ts';
import { buildFiscalizacao, chance } from '../src/painel/fiscalizacao.ts';
import { camaraDaEmpresa, camaras, distribuicaoGre, janela, mercadoPorCamara, ponteBase, porRegional, quadroTecnico, regularizacaoAcumulada, resumoFiscal, segmentos, tercil, tipos } from '../src/painel/analise.ts';

const f = buildFiscalizacao(dataset);
const scope = selectEnterpriseScope(dataset, defaultFilters);
const model = buildEnterpriseModel(scope);
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

test('camada de fiscalização é determinística e coerente no tempo', () => {
  assert.equal(buildFiscalizacao(dataset), f, 'usa cache por cenário');
  assert.equal(chance('abc'), chance('abc'));
  for (const acao of f.acoes) {
    assert.ok(acao.date >= f.start && acao.date <= f.anchor, `ação ${acao.id} dentro da série`);
    if (acao.auto) { assert.ok(acao.auto.date > acao.date && acao.auto.date <= f.anchor); assert.ok(acao.auto.valor > 0); if (acao.regularizedAt) assert.ok(acao.auto.date < acao.regularizedAt); }
    if (acao.auto?.status === 'Paga') assert.ok(acao.auto.paidAt && acao.auto.paidAt >= acao.auto.date && acao.auto.paidAt <= f.anchor);
    if (acao.regularizedAt) { assert.ok(acao.regularizedAt > acao.date && acao.regularizedAt <= f.anchor); assert.ok(acao.resolucao); }
  }
  const ids = new Set(f.acoes.map(row => row.id));
  for (const alvo of f.alvos) if (alvo.acaoId) assert.ok(ids.has(alvo.acaoId), 'alvo aponta para ação existente');
});

test('primeiro registro após ação coincide com o cadastro', () => {
  const first = new Map<string, string>();
  for (const row of dataset.registrations) { const previous = first.get(row.establishmentId); if (!previous || row.startedAt < previous) first.set(row.establishmentId, row.startedAt); }
  for (const acao of f.acoes.filter(row => row.tipo === 'registro' && row.regularizedAt)) assert.equal(acao.regularizedAt, first.get(acao.establishmentId));
});

test('alvos de registro em aberto são os CNPJs elegíveis sem registro vigente', () => {
  const open = f.alvos.filter(row => row.tipo === 'registro' && !row.regularizedAt).map(row => row.establishmentId).sort();
  const active = new Set(model.metadata.activeEligibleEstablishmentIds);
  assert.deepEqual(open, model.metadata.eligibleEstablishmentIds.filter(id => !active.has(id)).sort());
});

test('resumo do período: situação dos alvos fecha e comparações usam a mesma janela um ano antes', () => {
  const resumo = resumoFiscal(f, null, 12), w = janela(f.anchor, 12);
  assert.equal(w.start, '2025-10-01'); assert.equal(w.prevStart, '2024-10-01'); assert.equal(w.prevEnd, '2025-09-30');
  assert.equal(resumo.mensal.length, 24);
  assert.equal(sum(resumo.mensal.slice(-12).map(row => row.acoes)), resumo.acoes.length);
  assert.equal(sum(resumo.mensal.slice(-12).map(row => sum(tipos.map(tipo => row.autos[tipo])))), resumo.autos.length);
  for (const item of resumo.situacao) assert.equal(sum(segmentos.map(segment => item.partes[segment].length)), item.total);
  assert.equal(sum(Object.values(resumo.multas).map(row => row.valor)), resumo.aplicada);
  for (const tipo of tipos) assert.equal(resumo.situacao.find(row => row.tipo === tipo)!.total - sum(['Regularizado após auto', 'Regularizado na notificação'].map(segment => resumo.situacao.find(row => row.tipo === tipo)!.partes[segment as never].length)), resumo.abertos[tipo].length);
  const capital = resumoFiscal(f, 'GRE5', 12);
  assert.ok(capital.acoes.every(row => row.greId === 'GRE5') && capital.acoes.length < resumo.acoes.length);
});

test('Kaplan-Meier: curva acumulada não decresce e respeita censura', () => {
  const pontos = regularizacaoAcumulada([{ tempo: 10, evento: true }, { tempo: 20, evento: false }, { tempo: 30, evento: true }, ...Array.from({ length: 20 }, () => ({ tempo: 400, evento: false }))], 360, 15);
  for (let index = 1; index < pontos.length; index++) assert.ok(pontos[index][1] >= pontos[index - 1][1]);
  assert.ok(Math.abs(pontos[1][1] - 1 / 23 * 100) < 1e-9, 'um evento entre 23 em risco aos 15 dias');
  for (const curve of resumoFiscal(f, null, 12).curvas) for (let index = 1; index < curve.pontos.length; index++) assert.ok(curve.pontos[index][1] >= curve.pontos[index - 1][1]);
});

test('mapa bivariado: regionais somam o estado e tercis classificam 0..2', () => {
  const regionais = porRegional(dataset, f, model, 12);
  assert.equal(sum(regionais.map(row => row.semRegistro)), model.metadata.eligibleEstablishmentIds.length - model.metadata.activeEligibleEstablishmentIds.length);
  assert.equal(sum(regionais.map(row => row.acoes)), resumoFiscal(f, null, 12).acoes.length);
  const classify = tercil([1, 2, 3, 4, 5, 6, null]);
  assert.deepEqual([1, 3, 6, null].map(classify), [0, 1, 2, null]);
});

test('ponte da base, mercado por câmara, regionais e quadro técnico reconciliam', () => {
  const ponte = ponteBase(model, scope, f, 12);
  assert.equal(ponte.abertura + ponte.espontaneas.length + ponte.viaFiscalizacao.length + ponte.retornos.length - ponte.saidas.length, ponte.final);
  assert.equal(ponte.final, model.metrics.base.value);
  const mercado = mercadoPorCamara(scope, model, f);
  assert.equal(sum(mercado.map(row => row.total)), model.metadata.eligibleEstablishmentIds.length);
  for (const row of mercado) assert.equal(sum(Object.values(row.partes).map(part => part.length)), row.total);
  const registered = sum(mercado.map(row => row.partes['Registro ativo, em dia'].length + row.partes['Registro ativo, inadimplente'].length));
  assert.equal(registered, model.metadata.activeEligibleEstablishmentIds.length);
  const gres = distribuicaoGre(scope, model);
  assert.equal(sum(gres.map(row => row.emDia.length + row.inadimplentes.length)), model.metadata.activeCompanyIds.length);
  const qt = quadroTecnico(scope, model, f);
  assert.equal(qt.comRt.length + qt.rtBaixado.length + qt.semVinculo.length, model.metadata.activeCompanyIds.length);
  assert.equal(qt.comRt.length, model.metrics.rtCoverage.numerator);
  const camara = camaraDaEmpresa(dataset);
  assert.ok(dataset.companies.every(row => camaras.includes(camara.get(row.id)!)));
});
