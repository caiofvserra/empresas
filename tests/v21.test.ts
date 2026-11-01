import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { defaultFilters } from '../src/domain/types.ts';
import { datasetAt } from '../src/domain/tempo.ts';
import { selectEnterpriseScope } from '../src/enterprise-v10/filters.ts';
import { buildEnterpriseModel } from '../src/enterprise-v10/model.ts';
import { buildFiscalizacao } from '../src/painel/fiscalizacao.ts';
import { contratosPublicos } from '../src/painel/analise.ts';
import { buildInstalacoes, buildObras, buildSociedades, fontesInstalacao, pontesObra, quadroInstalacoes, quadroObras, quadroSociedades, situacoesObra } from '../src/domain/frentes.ts';
import { aberturasRfb, buildDemandaPlanejada, concentracaoMercado, densidadeRegional, etapasPca, permanenciaCoorte, populacaoCidade, quadroDemanda } from '../src/domain/mercado.ts';
import { datasHistorico, pontoHistorico } from '../src/observatorio/historico.ts';
import { malhaFina, regras } from '../src/cockpit/cruzamentos.ts';
import { casasLegislativas, familiasNormativas, frentePorId, gatePromocao, prontidaoFontes, proposicoes, regrasLeitura, frentes, casos } from '../src/observatorio/governanca.ts';

const hoje = dataset.snapshotDate, f = buildFiscalizacao(dataset);
const scope = selectEnterpriseScope(dataset, { ...defaultFilters, period: 12 }), model = buildEnterpriseModel(scope);
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

test('rede societária: sócios PJ por CNPJ exato, grupos fecham com as empresas e nada vem do futuro', () => {
  const soc = buildSociedades(dataset), companies = new Set(dataset.companies.map(row => row.id));
  assert.ok(soc.socios.length > 0 && soc.socios.every(row => row.desde <= hoje && row.participacao > 0 && row.participacao <= 100));
  assert.ok(soc.socios.every(row => row.socioCompanyId === null || companies.has(row.socioCompanyId)), 'sócio interno aponta para empresa do universo');
  assert.ok(soc.socios.every(row => row.socioCompanyId !== row.empresaId), 'empresa não é sócia de si mesma');
  const q = quadroSociedades(soc, dataset, null, null);
  assert.equal(q.sociosInternos + q.sociosExternos, q.socios.length);
  assert.ok(q.grupos.every(group => group.registradas <= group.empresas.length && group.externosEngenharia <= group.externos));
  const emGrupos = q.grupos.flatMap(group => group.empresas);
  assert.equal(new Set(emGrupos).size, emGrupos.length, 'cada empresa em um único grupo');
  assert.ok(q.gruposMultiplos <= q.grupos.length && q.maiorGrupo >= 2);
  assert.ok(q.investidasRegistradasComSocioEngenhariaSemRegistro.every(id => model.metadata.activeCompanyIds.includes(id)), 'a regra só olha investidas registradas');
  // Lida numa data anterior, a rede só tem sócios que já existiam.
  const d = datasHistorico(dataset)[0], antes = quadroSociedades(soc, datasetAt(dataset, d), null, null);
  assert.ok(antes.socios.length < q.socios.length && antes.socios.every(row => row.desde <= d));
  // Recorte por regional: subconjunto do total.
  const gre = dataset.gres[0].id, porGre = quadroSociedades(soc, dataset, null, gre);
  assert.ok(porGre.empresasComSocioPj.length <= q.empresasComSocioPj.length);
});

test('obras do Obrasgov: uma por contrato de obras, situação pelas datas, ponte em três graus e ART de fiscalização', () => {
  const layer = buildObras(dataset), contratosObras = dataset.contracts.filter(row => row.category === 'Obras' && row.date <= hoje);
  assert.equal(layer.obras.length, contratosObras.length);
  assert.ok(layer.obras.every(row => row.inicio >= contratosObras.find(c => c.id === row.contractId)!.date && (!row.fim || row.fim >= row.inicio)));
  assert.ok(layer.obras.every(row => situacoesObra.includes(row.situacao) && pontesObra.includes(row.ponte) && row.executado >= 0 && row.executado <= 100));
  assert.ok(layer.obras.every(row => (row.situacao === 'Não iniciada') === (row.inicio > hoje)), 'não iniciada é a obra com início depois de D');
  assert.ok(layer.obras.every(row => row.situacao !== 'Concluída' || (row.fim && row.fim <= hoje)), 'concluída tem fim até D');
  const q = quadroObras(layer, dataset, null, null);
  assert.equal(sum(q.porSituacao.map(row => row.n)), q.obras.length);
  assert.equal(sum(q.porPonte.map(row => row.n)), q.obras.length);
  assert.equal(sum(q.porGre.map(row => row.obras)), q.obras.length);
  assert.ok(q.semArtFiscalizacao.every(row => !row.artFiscalizacao && q.iniciadas.includes(row)));
  assert.equal(q.taxaSemArt, q.iniciadas.length ? q.semArtFiscalizacao.length / q.iniciadas.length * 100 : null);
  // A malha fina usa a mesma camada: obra sem ART de fiscalização vem das obras iniciadas com execução identificada.
  const malha = malhaFina(scope, model, f, contratosPublicos(scope, 12));
  const obraDe = new Map(layer.obras.map(row => [row.contractId, row]));
  assert.ok(malha.obrasSemFiscalizacao.every(row => obraDe.get(row.id) && !obraDe.get(row.id)!.artFiscalizacao));
  assert.ok(regras.some(row => row.id === 'socioPj') && regras.filter(row => row.coleta !== 'Convênio').length === 12, 'regra do sócio PJ entrou na malha fina');
});

test('instalações e investimentos: agente por CNPJ, quatro fontes, por regional e novas em 12 meses', () => {
  const layer = buildInstalacoes(dataset), companies = new Set(dataset.companies.map(row => row.id));
  assert.ok(layer.instalacoes.length > 0 && layer.instalacoes.every(row => fontesInstalacao.includes(row.fonte) && row.desde <= hoje && row.agenteCnpj));
  assert.ok(layer.instalacoes.every(row => row.companyId === null || companies.has(row.companyId)));
  const q = quadroInstalacoes(layer, dataset, null);
  assert.equal(sum(q.porFonte.map(row => row.n)), q.instalacoes.length);
  assert.equal(sum(q.porGre.map(row => row.n)), q.instalacoes.length);
  assert.ok(q.porFonte.every(row => row.agentesRegistrados <= row.agentesNoUniverso && row.agentesNoUniverso <= row.n));
  assert.ok(q.porGre.every(row => sum(fontesInstalacao.map(fonte => row.porFonte[fonte])) === row.n));
  assert.ok(q.novas12 >= 0 && q.novasAntes >= 0 && q.novas12 <= q.instalacoes.length);
  const gre = dataset.gres[1].id, porGre = quadroInstalacoes(layer, dataset, gre);
  assert.ok(porGre.instalacoes.every(row => row.greId === gre) && porGre.instalacoes.length < q.instalacoes.length);
});

test('concentração do mercado público: participações somam 100, top 5 e HHI coerentes, por categoria também', () => {
  const contratos = contratosPublicos(scope, 12), c = concentracaoMercado(contratos);
  assert.equal(c.contratos, contratos.length);
  assert.equal(c.total, sum(contratos.map(row => row.valor)));
  assert.ok(Math.abs(sum(c.fornecedores.map(row => row.participacao)) - 100) < 1e-6);
  assert.ok(c.top5 !== null && c.top5 >= c.fornecedores[0].participacao && c.top5 <= 100);
  assert.ok(c.hhi !== null && c.hhi >= 10_000 / Math.max(1, c.n) - 1 && c.hhi <= 10_000);
  assert.ok(c.fornecedores.every((row, index) => index === 0 || row.valor <= c.fornecedores[index - 1].valor), 'ordenados do maior para o menor');
  assert.equal(sum(c.fornecedores.map(row => row.contratos)), contratos.length);
  assert.equal(sum(c.porCategoria.map(row => row.total)), c.total);
  assert.ok(c.valorRegistrado !== null && c.valorRegistrado >= 0 && c.valorRegistrado <= 100);
  assert.deepEqual(concentracaoMercado([]), { fornecedores: [], total: 0, n: 0, contratos: 0, top5: null, hhi: null, valorRegistrado: null, porCategoria: [] });
});

test('demanda planejada (PCA): itens por órgão e exercício, etapas fecham e nada se soma em dobro', () => {
  const layer = buildDemandaPlanejada(dataset), ano = Number(hoje.slice(0, 4));
  assert.equal(buildDemandaPlanejada(dataset), layer, 'cache por base');
  assert.ok(layer.itens.length > 0 && layer.itens.every(row => [ano, ano + 1].includes(row.exercicio) && etapasPca.includes(row.etapa) && row.valorEstimado > 0 && row.atualizadoEm <= hoje));
  assert.ok(layer.itens.filter(row => row.exercicio === ano + 1).every(row => row.etapa !== 'Contrato identificado'), 'o exercício seguinte não tem contrato identificado');
  const q = quadroDemanda(layer);
  assert.equal(sum(q.porEtapa.map(row => row.valor)), q.total);
  assert.equal(sum(q.porCategoria.map(row => row.valor)), q.total);
  assert.equal(sum(q.porExercicio.map(row => row.valor)), q.total);
  assert.equal(q.semMaterializacao, q.porEtapa.find(row => row.etapa === 'Planejado')!.valor);
  assert.ok(q.porCategoria.every(row => Math.abs(sum(etapasPca.map(etapa => row.porEtapa[etapa])) - row.valor) < 1e-6));
});

test('densidade por regional: população estável, elegíveis e cobertura por GRE', () => {
  const rows = densidadeRegional(dataset);
  assert.equal(rows.length, dataset.gres.length);
  assert.equal(densidadeRegional(dataset), rows, 'cache por base');
  assert.ok(rows.every(row => row.populacao > 0 && row.registradas <= row.elegiveis && (row.densidade === null || row.densidade >= 0)));
  assert.ok(rows.every(row => row.cobertura === null || (row.cobertura >= 0 && row.cobertura <= 100)));
  const city = dataset.cities[0].id;
  assert.equal(populacaoCidade(city), populacaoCidade(city));
  assert.ok(populacaoCidade(city) >= 15_000 && populacaoCidade(city) <= 1_400_000);
  assert.equal(sum(rows.map(row => row.populacao)), sum(dataset.cities.map(row => populacaoCidade(row.id))));
});

test('aberturas na Receita e permanência de coortes: janelas, decomposição e coorte fixa', () => {
  const a = aberturasRfb(dataset, null, 24);
  assert.equal(a.meses.length, 24);
  assert.equal(sum(a.meses.map(row => row.aberturas)), a.total);
  assert.equal(sum(a.meses.map(row => row.comRegistro)), a.comRegistro);
  assert.equal(sum(a.porGre.map(row => row.aberturas)), a.total);
  assert.ok(a.comRegistro <= a.total && a.ids.length === a.total);
  const gre = dataset.gres[0].id, porGre = aberturasRfb(dataset, gre, 24);
  assert.equal(porGre.total, a.porGre.find(row => row.greId === gre)!.aberturas);
  const coortes = [3, 6, 12].map(meses => permanenciaCoorte(dataset, null, meses));
  for (const row of coortes) {
    assert.equal(row.permanecem.length + row.saidas.length, row.coorte.length);
    assert.ok(row.d0 < hoje && row.taxa !== null && row.taxa > 0 && row.taxa <= 100);
    assert.ok(row.permanecem.every(id => model.metadata.activeCompanyIds.includes(id)), 'quem permanece está ativo em D');
  }
  assert.ok(coortes[0].taxa! >= coortes[2].taxa!, 'a coorte mais recente permanece mais');
  const recorte = permanenciaCoorte(dataset, new Set(coortes[2].coorte.slice(0, 50)), 12);
  assert.equal(recorte.coorte.length, 50);
});

test('histórico por data de referência: 13 datas, ponto coerente com a leitura em D e cache', () => {
  const datas = datasHistorico(dataset);
  assert.equal(datas.length, 13);
  assert.equal(datas[datas.length - 1], hoje);
  assert.ok(datas.every((value, index) => index === 0 || value > datas[index - 1]));
  const d = datas[datas.length - 2], ponto = pontoHistorico(dataset, f, d, null);
  assert.equal(pontoHistorico(dataset, f, d, null), ponto, 'cache por base, data e regional');
  const view = datasetAt(dataset, d), scopeD = selectEnterpriseScope(view, { ...defaultFilters, period: 12 }), modelD = buildEnterpriseModel(scopeD);
  assert.equal(ponto.registradas, modelD.metadata.activeCompanyIds.length);
  assert.equal(ponto.cobertura, modelD.metrics.coverage.value);
  assert.ok(Object.keys(ponto.porRegra).length === regras.length && ponto.comIndicio >= ponto.confirmadas && ponto.comAcao <= ponto.comIndicio);
  const hojePonto = pontoHistorico(dataset, f, hoje, null);
  assert.equal(hojePonto.registradas, model.metadata.activeCompanyIds.length, 'o ponto de hoje é a leitura de hoje');
});

test('radar normativo e gate de promoção: estrutura completa, rótulo demonstrativo e passos dentro do gate', () => {
  assert.ok(proposicoes.length >= 10 && proposicoes.every(row => casasLegislativas.includes(row.casa) && familiasNormativas.includes(row.familia) && row.ementa && /^\d{4}-\d{2}-\d{2}$/.test(row.ultimaTramitacao)));
  assert.ok(proposicoes.every(row => /exemplo/i.test(row.sigla)), 'toda proposição se declara exemplo (fictícia)');
  assert.ok(casasLegislativas.every(casa => proposicoes.some(row => row.casa === casa)));
  assert.equal(gatePromocao.length, 7);
  assert.ok(prontidaoFontes.length >= 10 && prontidaoFontes.every(row => row.passo >= 0 && row.passo <= 7 && frentePorId[row.frente] && row.evidencia && row.pendente && row.noPainel));
  assert.ok(prontidaoFontes.every(row => row.passo < 7), 'nenhuma fonte nova chegou ao núcleo operacional');
  // As situações do Método acompanham as camadas: as frentes com fonte automática saíram de "Planejada".
  assert.ok(!frentes.some(row => row.situacao === 'Planejada'), 'nenhuma frente segue planejada');
  assert.ok(!regrasLeitura.some(row => row.situacao === 'Planejada'), 'nenhum cruzamento da matriz segue planejado');
  for (const id of ['UC04', 'UC05', 'UC15', 'UC18', 'UC19', 'UC31', 'UC33', 'UC34']) assert.equal(casos.find(row => row.id === id)?.situacao, 'No painel', id);
  for (const id of ['UC07', 'UC32']) assert.equal(casos.find(row => row.id === id)?.situacao, 'Parcial', id);
  assert.ok(!casos.some(row => row.situacao === 'Fora da coleta automática'), 'todo caso tem fonte automática ou depende de acordo');
});
