import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { datasetAt, fiscalizacaoAt } from '../src/domain/tempo.ts';
import { defaultFilters } from '../src/domain/types.ts';
import { buildProfissionais, resumoProfissionais } from '../src/domain/profissionais.ts';
import { buildConselho } from '../src/domain/conselho.ts';
import { buildCarteira, mesesAteData, quadroDivida, receitaMensal } from '../src/domain/gestao.ts';
import { alertaNoStatus, buildColegiado, quadroColegiado } from '../src/domain/colegiado.ts';
import { selectEnterpriseScope } from '../src/enterprise-v10/filters.ts';
import { buildEnterpriseModel } from '../src/enterprise-v10/model.ts';
import { cobertura } from '../src/observatorio/norte.ts';
import { buildFiscalizacao } from '../src/painel/fiscalizacao.ts';
import { janela, porRegional, resumoFiscal } from '../src/painel/analise.ts';
import { estruturaDe } from '../src/cockpit/estrutura.ts';
import { INDICADORES, fotoPresidencia, insumosPresidencia, porRegionalDaFoto, recortar, valorDe, variacao } from '../src/domain/presidencia.ts';
import type { IndicadorId } from '../src/domain/presidencia.ts';

/*
 * Painel da Presidência (07/11/2026). Seam: `fotoPresidencia`, a foto dos indicadores de todos os painéis numa data. A fonte da
 * verdade são as funções que os painéis de cada assunto usam nos seus cartões: o número da Presidência tem de ser o mesmo, no estado,
 * numa regional e num município.
 */
const hoje = dataset.snapshotDate, periodo = 12, w = janela(hoje, periodo);
const view = datasetAt(dataset, hoje), foto = fotoPresidencia(insumosPresidencia(dataset, hoje, periodo));
const profissionais = buildProfissionais(view), f = fiscalizacaoAt(buildFiscalizacao(dataset), hoje), carteira = buildCarteira(dataset, profissionais), colegiado = buildColegiado(dataset);
const v = (valores: ReturnType<typeof recortar>, id: IndicadorId) => valorDe(INDICADORES.find(row => row.id === id)!, valores[id]);
const perto = (a: number | null, b: number | null, msg: string) => { assert.ok(a !== null && b !== null, `${msg}: ${a} contra ${b}`); assert.ok(Math.abs(a! - b!) < 1e-6, `${msg}: ${a} contra ${b}`); };

/** Os números dos cartões de cada painel, com a regional e o município escolhidos no alto da tela. */
function dosPaineis(greId: string | null, cityId: string | null) {
  const scope = selectEnterpriseScope(view, { ...defaultFilters, period: periodo, greIds: greId ? [greId] : [], cityIds: cityId ? [cityId] : [] }), model = buildEnterpriseModel(scope);
  const p = resumoProfissionais(profissionais, view, greId, periodo, { cityId, modalidade: null, genero: null });
  const fr = cityId ? { ...f, acoes: f.acoes.filter(row => row.cityId === cityId), alvos: f.alvos.filter(row => row.cityId === cityId) } : f, rf = resumoFiscal(fr, greId, periodo);
  const d = quadroDivida(carteira, hoje, { greId, cityId, camara: null }, w.start, w.prevEnd, []);
  const c = quadroColegiado(colegiado, profissionais, hoje, w.start, w.prevStart, w.prevEnd, { colegiado: null, greId, cityId });
  const a = estruturaDe(view, greId, periodo).atendimento;
  const receita = receitaMensal(buildConselho(view), mesesAteData(hoje, periodo)).reduce((n, row) => n + row.total, 0);
  return {
    mercado: cobertura(scope, model).taxa, profissionais: p.ativos.length, anuidadePf: p.taxaAdimplencia, acoes: rf.acoes.length,
    receita, divida: d.total, perto: d.pertoDePrescrever, atendimento: a.taxaNoPrazo, solicitacoes: a.pedidos.length,
    pendentes: c.pendentes.length, vermelho: c.pendentes.filter(row => alertaNoStatus(row.diasNoStatus) === 'vermelho').length, prescricao: c.pertoDePrescrever.length,
  } satisfies Partial<Record<IndicadorId, number | null>>;
}

test('presidência: no estado, cada indicador é o número do cartão do painel do assunto', () => {
  const estado = recortar(foto, dataset, { greId: null, cityId: null }), paineis = dosPaineis(null, null);
  for (const [id, esperado] of Object.entries(paineis)) perto(v(estado, id as IndicadorId), esperado, id);
  // A regularização é a do quadro das regionais da Fiscalização: a parte das ações do período que já terminou em regularização.
  const regionais = porRegional(view, f, buildEnterpriseModel(selectEnterpriseScope(view, { ...defaultFilters, period: periodo })), periodo);
  const acoes = regionais.reduce((n, row) => n + row.acoes, 0), regularizadas = regionais.reduce((n, row) => n + (row.taxa ?? 0) * row.acoes / 100, 0);
  perto(v(estado, 'regularizacao'), regularizadas / acoes * 100, 'regularizacao');
});

test('presidência: numa regional e num município, os números são os do painel com o mesmo filtro', () => {
  const gre = 'GRE2', cidade = dataset.cities.find(row => row.greId === gre)!.id;
  const regional = recortar(foto, dataset, { greId: gre, cityId: null }), paineis = dosPaineis(gre, null);
  for (const [id, esperado] of Object.entries(paineis)) perto(v(regional, id as IndicadorId), esperado, `${gre}: ${id}`);
  const municipio = recortar(foto, dataset, { greId: gre, cityId: cidade }), daCidade = dosPaineis(gre, cidade);
  // O atendimento não tem município no painel dele: segue a regional. A receita do Conselho não tem lugar: é a do estado.
  for (const id of ['mercado', 'profissionais', 'anuidadePf', 'acoes', 'divida', 'perto', 'pendentes', 'vermelho', 'prescricao', 'receita'] as const) perto(v(municipio, id), daCidade[id], `${cidade}: ${id}`);
  for (const id of ['atendimento', 'solicitacoes'] as const) perto(v(municipio, id), paineis[id], `${cidade}: ${id} segue a regional`);
});

test('presidência: as regionais somam o estado nas contagens e nos valores, e as taxas saem da soma das partes', () => {
  const estado = recortar(foto, dataset, { greId: null, cityId: null }), linhas = porRegionalDaFoto(foto, dataset);
  assert.equal(linhas.size, dataset.gres.length);
  for (const indicador of INDICADORES.filter(row => row.lugar !== 'estado')) {
    const n = [...linhas.values()].reduce((total, row) => total + row[indicador.id].n, 0), d = [...linhas.values()].reduce((total, row) => total + row[indicador.id].d, 0);
    assert.ok(Math.abs(n - estado[indicador.id].n) < 1e-6, `${indicador.id}: numerador`);
    assert.ok(Math.abs(d - estado[indicador.id].d) < 1e-6, `${indicador.id}: denominador`);
  }
});

test('presidência: um indicador por painel no resumo, e a variação em pontos nas taxas e em % no resto', () => {
  const principais = INDICADORES.filter(row => row.principal);
  assert.deepEqual(principais.map(row => row.painel), ['empresas', 'profissionais', 'fiscalizacao', 'financeiro', 'atendimento', 'conselho']);
  const taxa = INDICADORES.find(row => row.id === 'mercado')!, contagem = INDICADORES.find(row => row.id === 'pendentes')!;
  assert.equal(valorDe(taxa, { n: 1, d: 4 }), 25);
  assert.equal(valorDe(taxa, { n: 0, d: 0 }), null);
  assert.equal(variacao(taxa, { n: 3, d: 10 }, { n: 1, d: 4 }), 5);
  assert.equal(variacao(contagem, { n: 120, d: 0 }, { n: 100, d: 0 }), 20);
  assert.equal(variacao(contagem, { n: 5, d: 0 }, { n: 0, d: 0 }), null);
});
