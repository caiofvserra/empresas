import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { defaultFilters } from '../src/domain/types.ts';
import { datasetAt } from '../src/domain/tempo.ts';
import { selectEnterpriseScope } from '../src/enterprise-v10/filters.ts';
import { buildEnterpriseModel } from '../src/enterprise-v10/model.ts';
import { buildFiscalizacao } from '../src/painel/fiscalizacao.ts';
import { contratosPublicos } from '../src/painel/analise.ts';
import { buildProfissionais, situacaoEm } from '../src/domain/profissionais.ts';
import { buildFormacao } from '../src/domain/formacao.ts';
import { datasHistorico } from '../src/observatorio/historico.ts';
import { malhaFina, regras } from '../src/cockpit/cruzamentos.ts';
import { fichas, parceriasDe } from '../src/cockpit/fichas.ts';
import { frentes, prontidaoFontes, regrasLeitura, casos } from '../src/observatorio/governanca.ts';
import { buildCno, buildDespesaTce, buildLicencas, buildPericias, buildSociosPf, buildVinculos, contextoEconomico, coorteNominal, faixasVinculos, fontesLicenca, parceriaPorId, parcerias, quadroCno, quadroLicencas, quadroPericias, quadroSociosPf, quadroTce, quadroVinculos } from '../src/domain/parcerias.ts';

const hoje = dataset.snapshotDate, f = buildFiscalizacao(dataset), modelo = buildProfissionais(dataset);
const scope = selectEnterpriseScope(dataset, { ...defaultFilters, period: 12 }), model = buildEnterpriseModel(scope);
const antes = datasHistorico(dataset)[0], viewAntes = datasetAt(dataset, antes);

test('parcerias: toda ficha com "!" aponta para uma parceria conhecida, toda parceria tem ao menos um bloco e as regras de convênio declaram o parceiro', () => {
  const usadas = new Set<string>();
  for (const [key, ficha] of Object.entries(fichas)) for (const id of parceriasDe(ficha)) { assert.ok(parceriaPorId[id], `parceria desconhecida em ${key}`); usadas.add(id); }
  for (const row of parcerias) assert.ok(usadas.has(row.id), `parceria sem bloco marcado: ${row.id}`);
  assert.equal(new Set(parcerias.map(row => row.id)).size, parcerias.length);
  const convenio = regras.filter(row => row.coleta === 'Convênio');
  assert.ok(convenio.length >= 2 && convenio.every(row => row.parceria && parceriaPorId[row.parceria] && row.status !== 'Confirmado'), 'regra de convênio tem parceiro e nunca é confirmada');
  assert.ok(regras.filter(row => row.parceria).every(row => row.coleta === 'Convênio'));
  assert.ok(!JSON.stringify(parcerias).match(/firmad[oa]\b(?! )/), 'nenhuma parceria é apresentada como firmada');
});

test('CNO: obras só de empresas do universo, inscritas até D, funil monotônico e regra de executora sem ART', () => {
  const layer = buildCno(dataset), q = quadroCno(layer, dataset, null, null);
  assert.ok(layer.obras.length > 50 && layer.obras.every(row => row.inscricao <= hoje));
  assert.ok(q.comDadosMinimos.length <= q.obras.length && q.comCampoArt.length <= q.comDadosMinimos.length && q.comArtLocalizada.length <= q.comCampoArt.length);
  assert.ok(layer.obras.every(row => !row.artLocalizada || row.campoArt), 'ART localizada exige campo preenchido');
  assert.ok(q.cobertura !== null && q.cobertura > 0 && q.cobertura < 100);
  assert.equal(q.porSituacao.reduce((a, b) => a + b.n, 0), q.obras.length);
  const ids = new Set(layer.obras.filter(row => row.id).map(row => row.companyId));
  for (const id of q.executorasSemArt) { assert.ok(ids.has(id)); assert.ok(layer.obras.some(row => row.companyId === id && row.papel === 'Executora' && row.situacao !== 'Encerrada' && !row.artLocalizada)); }
  assert.ok(quadroCno(layer, viewAntes, null, null).obras.length < q.obras.length, 'lida antes, a camada tem menos obras');
  const gre = dataset.gres[0].id; assert.ok(quadroCno(layer, dataset, null, gre).obras.every(row => row.greId === gre));
});

test('licenças e alvarás: fases pela vigência em D, taxas por papel com denominadores próprios e regra de obra sem ART', () => {
  const layer = buildLicencas(dataset), q = quadroLicencas(layer, dataset, null, null);
  assert.ok(q.licencas.length > 100 && fontesLicenca.every(fonte => q.porFonte.some(row => row.fonte === fonte)));
  assert.equal(q.porFonte.reduce((a, b) => a + b.n, 0), q.licencas.length);
  assert.ok(q.licencas.every(row => row.fase !== 'Vigente' || row.validade >= hoje) && q.licencas.every(row => row.fase !== 'Expirada' || row.validade < hoje));
  assert.ok(q.licencas.every(row => row.obra || !row.artPonte), 'ART ligada só em licença de obra');
  assert.ok(q.taxaTitular !== null && q.taxaExecutora !== null && q.taxaArt !== null && q.taxaArt <= 100);
  assert.ok(q.obrasSemArt.length > 0 && q.obrasSemArt.every(id => dataset.companies.some(row => row.id === id)));
  const vigentesAntes = quadroLicencas(layer, viewAntes, null, null);
  assert.ok(vigentesAntes.licencas.every(row => row.emissao <= antes && (row.fase !== 'Expirada' || row.validade < antes)));
});

test('perícias: nomeações em 24 meses, processos distintos, rastreabilidade só sobre dados mínimos e peritos sem registro ativo', () => {
  const layer = buildPericias(dataset, modelo), q = quadroPericias(layer, dataset, modelo, null);
  assert.ok(q.nomeacoes.length > 50 && q.nomeacoes.every(row => row.data <= hoje));
  assert.ok(q.processos < q.nomeacoes.length && q.comarcas <= dataset.cities.length, 'processos não são o mesmo total que nomeações');
  const minimos = q.nomeacoes.filter(row => row.dadosMinimos);
  assert.ok(minimos.every(row => row.profissionalId && row.ponte !== 'Sem chave') && q.nomeacoes.filter(row => !row.dadosMinimos).every(row => row.ponte === 'Sem chave'));
  assert.equal(q.porPonte.reduce((a, b) => a + b.n, 0), q.nomeacoes.length);
  assert.ok(q.rastreabilidade !== null && q.coberturaChaves !== null && q.rastreabilidade <= 100);
  for (const perito of q.peritosSemRegistroAtivo) assert.notEqual(situacaoEm(perito, hoje), 'Ativo');
  assert.equal(q.nomeacoesSemRegistroAtivo.filter(row => !row.profissionalId).length, q.naoLocalizadas);
  assert.equal(q.mensal.length, 12);
  assert.ok(q.nomeacoes.every(row => /^\d{7}-\d{2}\.\d{4}\.8\.26\.\d{4}$/.test(row.processo)), 'número no padrão CNJ do TJSP');
});

test('TCE-SP: etapas financeiras por contrato nunca se somam e são monotônicas; só contratos do período entram no quadro', () => {
  const layer = buildDespesaTce(dataset), contratos = contratosPublicos(scope, 12), q = quadroTce(layer, contratos);
  assert.ok(layer.etapas.every(row => row.pago <= row.liquidado && row.liquidado <= row.empenhado && row.empenhado <= row.contratado));
  const ids = new Set(contratos.map(row => row.id)); assert.ok(q.etapas.every(row => ids.has(row.contractId)) && q.etapas.length <= contratos.length);
  assert.ok(q.pago <= q.liquidado && q.liquidado <= q.empenhado && q.empenhado <= q.contratado && q.contratado > 0);
  assert.equal(q.porPonte.reduce((a, b) => a + b.n, 0), q.etapas.length);
  assert.ok(q.semPagamento.every(row => row.ponte === 'Validada' && row.pago === 0));
  const esferas = new Map(dataset.buyers.map(row => [row.id, row.sphere])); assert.ok(layer.etapas.every(row => esferas.get(row.buyerId) !== 'Federal'), 'tribunal estadual não publica despesa federal');
});

test('contexto econômico: PIB, VAB e crédito por regional com denominadores explícitos', () => {
  const rows = contextoEconomico(dataset);
  assert.equal(rows.length, dataset.gres.length);
  assert.ok(rows.every(row => row.vab <= row.pib && row.creditoSaldo > 0 && row.registradas <= row.elegiveis && (row.creditoPorElegivel === null) === (row.elegiveis === 0)));
  assert.ok(rows.every(row => row.pibPorHabitante !== null && row.pibPorHabitante >= 18_000 && row.pibPorHabitante <= 62_000));
});

test('sócios pessoa física: identificação por CPF, RT da própria empresa e leituras de contexto só sobre registradas', () => {
  const layer = buildSociosPf(dataset, modelo), q = quadroSociosPf(layer, dataset, modelo, null, null);
  assert.ok(q.socios.length > 100 && q.socios.every(row => row.desde <= hoje));
  assert.ok(q.sociosProfissionais.every(row => row.profissionalId && modelo.porId.has(row.profissionalId)));
  assert.ok(q.socioEhRt.length > 0 && q.socioEhRt.every(row => dataset.technicalLinks.some(link => link.companyId === row.empresaId && link.professionalId === row.profissionalId && link.startDate <= hoje && (!link.endDate || link.endDate > hoje))));
  const registradas = new Set(model.metadata.activeCompanyIds);
  assert.ok(q.registradasSemRtComSocioProfissional.every(id => registradas.has(id)) && q.registradasComSocioProfissionalInativo.every(id => registradas.has(id)));
  assert.equal(q.porQualificacao.reduce((a, b) => a + b.n, 0), q.socios.length);
  assert.ok(quadroSociosPf(layer, dataset, modelo, scope.companyIds, null).socios.length <= q.socios.length);
});

test('coorte nominal: só IES parceiras, registrados nunca excedem diplomados, coortes recentes não fecham', () => {
  const formacao = buildFormacao(dataset), q = coorteNominal(formacao, modelo, dataset, null);
  assert.ok(q.iesParceiras > 0 && q.iesParceiras < q.iesTotal && q.coortes.length > 0);
  for (const row of q.coortes) {
    const ate = row.ate.map(item => item.registrados);
    assert.ok(ate.every((valor, index) => index === 0 || valor >= ate[index - 1]), 'curva acumulada cresce');
    assert.ok(row.registrados.length + row.registroAnterior <= row.diplomados, `registrados ≤ diplomados na coorte ${row.ano}`);
    for (const item of row.ate) assert.equal(item.taxa === null, !item.fechada);
  }
  assert.ok(q.coortes.some(row => !row.ate[3].fechada), 'a coorte mais recente ainda não fechou em 24 meses');
  assert.ok(q.ultimaFechada && q.ultimaFechada.ate[3].taxa !== null);
});

test('vínculos por empresa: só contagens, faixas fecham e as leituras de contexto respeitam registro e RT', () => {
  const layer = buildVinculos(dataset), q = quadroVinculos(layer, dataset, null, null);
  assert.ok(q.empresas.length > 100 && q.empresas.every(row => row.vinculosTecnicos <= row.vinculosTotal && Number.isInteger(row.vinculosTecnicos)));
  assert.ok(!('salario' in (q.empresas[0] as object)) && !JSON.stringify(q.empresas[0]).match(/salari/i), 'nenhum salário individual');
  assert.equal(q.porFaixa.length, faixasVinculos.length);
  const registradas = new Set(model.metadata.activeCompanyIds), rtVigente = new Set(dataset.technicalLinks.filter(link => link.startDate <= hoje && (!link.endDate || link.endDate > hoje)).map(link => link.companyId));
  assert.ok(q.registradasSemRt.every(id => registradas.has(id) && !rtVigente.has(id)) && q.semRegistroComTecnicos.every(id => !registradas.has(id)));
});

test('malha fina: as duas regras de convênio entram como candidatas, fora das confirmadas, e o Método registra as parcerias', () => {
  const contratos = contratosPublicos(scope, 12), malha = malhaFina(scope, model, f, contratos);
  const cno = malha.indicios.find(row => row.id === 'cnoSemArt')!, lic = malha.indicios.find(row => row.id === 'licencaSemArt')!;
  assert.ok(cno.empresas.length > 0 && lic.empresas.length > 0 && cno.status === 'Candidato' && lic.status === 'Candidato');
  assert.ok(cno.empresas.every(id => !malha.confirmadas.includes(id) || malha.indicios.some(row => row.status === 'Confirmado' && row.empresas.includes(id))));
  assert.equal(frentes.find(row => row.id === 'cno')!.situacao, 'Depende de acordo');
  assert.ok(frentes.filter(row => /\(!/.test(row.noPainel)).length >= 4, 'frentes apontam onde a camada demonstrativa está');
  assert.ok(regrasLeitura.filter(row => row.situacao === 'Depende de acordo').every(row => /!/.test(row.noPainel)), 'toda regra que depende de acordo diz onde a camada está');
  assert.ok(['UC16', 'UC17', 'UC29', 'UC30'].every(id => /!/.test(casos.find(row => row.id === id)!.onde)));
  assert.ok(prontidaoFontes.filter(row => row.passo === 0).length >= 8 && prontidaoFontes.every(row => row.passo >= 0 && row.passo <= 7));
});
