import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { datasetAt, fiscalizacaoAt } from '../src/domain/tempo.ts';
import { defaultFilters } from '../src/domain/types.ts';
import { buildProfissionais, resumoProfissionais } from '../src/domain/profissionais.ts';
import { buildConselho } from '../src/domain/conselho.ts';
import { buildCarteira, despesaAcumulada, mesesAteData, modalidadeDaCamara, quadroDivida, receitaMensal } from '../src/domain/gestao.ts';
import type { CamaraConselho } from '../src/domain/gestao.ts';
import { alertaNoStatus, buildColegiado, quadroColegiado } from '../src/domain/colegiado.ts';
import { selectEnterpriseScope } from '../src/enterprise-v10/filters.ts';
import { buildEnterpriseModel } from '../src/enterprise-v10/model.ts';
import { cobertura, contagens } from '../src/observatorio/norte.ts';
import { artsPeriodo } from '../src/cockpit/medidas.ts';
import { buildFiscalizacao } from '../src/painel/fiscalizacao.ts';
import { camaraDaEmpresa, janela, porRegional, resumoFiscal } from '../src/painel/analise.ts';
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

const camaraDe = camaraDaEmpresa(dataset);
/** Os números dos cartões de cada painel, com a regional, o município e a câmara escolhidos no alto da tela (cada painel aplica a câmara do seu jeito). */
function dosPaineis(greId: string | null, cityId: string | null, camara: CamaraConselho | null = null) {
  const subset = camara ? view.companies.filter(row => camaraDe.get(row.id) === camara).map(row => row.id) : undefined;
  const scope = selectEnterpriseScope(view, { ...defaultFilters, period: periodo, greIds: greId ? [greId] : [], cityIds: cityId ? [cityId] : [] }, subset), model = buildEnterpriseModel(scope);
  const p = resumoProfissionais(profissionais, view, greId, periodo, { cityId, modalidade: camara ? modalidadeDaCamara[camara] : null, genero: null });
  const fc = camara ? { ...f, acoes: f.acoes.filter(row => camaraDe.get(row.companyId) === camara), alvos: f.alvos.filter(row => camaraDe.get(row.companyId) === camara) } : f;
  const fr = cityId ? { ...fc, acoes: fc.acoes.filter(row => row.cityId === cityId), alvos: fc.alvos.filter(row => row.cityId === cityId) } : fc, rf = resumoFiscal(fr, greId, periodo);
  const d = quadroDivida(carteira, hoje, { greId, cityId, camara: null }, w.start, w.prevEnd, []);
  const c = quadroColegiado(colegiado, profissionais, hoje, w.start, w.prevStart, w.prevEnd, { colegiado: camara, greId, cityId });
  const a = estruturaDe(view, greId, periodo).atendimento, conselho = buildConselho(view);
  const receita = receitaMensal(conselho, mesesAteData(hoje, periodo)).reduce((n, row) => n + row.total, 0);
  const ano = despesaAcumulada(conselho, hoje, null).filter(row => row.realizado !== null).at(-1)!;
  return {
    mercado: cobertura(scope, model).taxa, empresas: contagens(scope, model).raizes, rt: model.metrics.rtCoverage.value, artsEmpresas: artsPeriodo(scope, periodo).atual.length,
    profissionais: p.ativos.length, novos: p.novos.length, anuidadePf: p.taxaAdimplencia, artsProfissionais: p.arts.length,
    acoes: rf.acoes.length, autos: rf.autos.length, multas: rf.aplicada,
    receita, divida: d.total, perto: d.pertoDePrescrever, execucao: ano.realizado! / ano.previsto! * 100,
    atendimento: a.taxaNoPrazo, solicitacoes: a.pedidos.length, atrasadas: a.partes['Em aberto, prazo vencido'].length,
    pendentes: c.pendentes.length, vermelho: c.pendentes.filter(row => alertaNoStatus(row.diasNoStatus) === 'vermelho').length, prescricao: c.pertoDePrescrever.length, votados: c.votados.length,
  } satisfies Partial<Record<IndicadorId, number | null>>;
}
const semCamara = ['receita', 'divida', 'perto', 'execucao', 'atendimento', 'solicitacoes', 'atrasadas'] as const;
const daRegional = ['empresas', 'rt', 'artsEmpresas', 'atendimento', 'solicitacoes', 'atrasadas'] as const;

test('presidência: no estado, cada indicador é o número do cartão do painel do assunto', () => {
  const estado = recortar(foto, dataset, { greId: null, cityId: null, camara: null }), paineis = dosPaineis(null, null);
  for (const [id, esperado] of Object.entries(paineis)) perto(v(estado, id as IndicadorId), esperado, id);
  // A regularização é a do quadro das regionais da Fiscalização: a parte das ações do período que já terminou em regularização.
  const regionais = porRegional(view, f, buildEnterpriseModel(selectEnterpriseScope(view, { ...defaultFilters, period: periodo })), periodo);
  const acoes = regionais.reduce((n, row) => n + row.acoes, 0), regularizadas = regionais.reduce((n, row) => n + (row.taxa ?? 0) * row.acoes / 100, 0);
  perto(v(estado, 'regularizacao'), regularizadas / acoes * 100, 'regularizacao');
});

test('presidência: numa regional e num município, os números são os do painel com o mesmo filtro', () => {
  const gre = 'GRE2', cidade = dataset.cities.find(row => row.greId === gre)!.id;
  const regional = recortar(foto, dataset, { greId: gre, cityId: null, camara: null }), paineis = dosPaineis(gre, null);
  for (const [id, esperado] of Object.entries(paineis)) perto(v(regional, id as IndicadorId), esperado, `${gre}: ${id}`);
  const municipio = recortar(foto, dataset, { greId: gre, cityId: cidade, camara: null }), daCidade = dosPaineis(gre, cidade);
  // O atendimento não tem município no painel dele, e as contagens de empresas não se somam entre municípios (a empresa com filiais
  // conta em cada um): seguem a regional. A receita e o orçamento do Conselho não têm lugar: são os do estado.
  for (const [id, esperado] of Object.entries(daCidade)) if (!(daRegional as readonly string[]).includes(id)) perto(v(municipio, id as IndicadorId), esperado, `${cidade}: ${id}`);
  for (const id of daRegional) perto(v(municipio, id), paineis[id], `${cidade}: ${id} segue a regional`);
});

test('presidência: com uma câmara, cada número segue a câmara do jeito do painel do assunto, e o que não tem câmara não muda', () => {
  for (const [gre, camara] of [[null, 'Elétrica'], ['GRE2', 'Civil']] as const) {
    const recorte = recortar(foto, dataset, { greId: gre, cityId: null, camara }), paineis = dosPaineis(gre, null, camara), todos = dosPaineis(gre, null);
    for (const [id, esperado] of Object.entries(paineis)) perto(v(recorte, id as IndicadorId), (semCamara as readonly string[]).includes(id) ? todos[id as keyof typeof todos] : esperado, `${gre ?? 'SP'} ${camara}: ${id}`);
  }
});

test('presidência: a regularização de uma regional e de uma câmara é a do quadro das regionais da Fiscalização com o mesmo filtro', () => {
  const model = buildEnterpriseModel(selectEnterpriseScope(view, { ...defaultFilters, period: periodo }));
  const taxaDe = (fiscal: typeof f, gre: string | null) => {
    const linhas = porRegional(view, fiscal, model, periodo).filter(row => !gre || row.id === gre);
    const acoes = linhas.reduce((n, row) => n + row.acoes, 0);
    return acoes ? linhas.reduce((n, row) => n + (row.taxa ?? 0) * row.acoes / 100, 0) / acoes * 100 : null;
  };
  // A câmara entra como no painel de Fiscalização: as ações das empresas da câmara.
  const daCamara = (camara: string) => ({ ...f, acoes: f.acoes.filter(row => camaraDe.get(row.companyId) === camara), alvos: f.alvos.filter(row => camaraDe.get(row.companyId) === camara) });
  for (const [gre, camara] of [['GRE2', null], ['GRE5', null], [null, 'Civil'], ['GRE2', 'Civil']] as const) {
    const recorte = recortar(foto, dataset, { greId: gre, cityId: null, camara });
    perto(v(recorte, 'regularizacao'), taxaDe(camara ? daCamara(camara) : f, gre), `${gre ?? 'SP'} ${camara ?? ''}: regularizacao`);
  }
});

test('presidência: as regionais somam o estado nas contagens e nos valores que se somam, e as taxas saem da soma das partes', () => {
  const estado = recortar(foto, dataset, { greId: null, cityId: null, camara: null }), linhas = porRegionalDaFoto(foto, dataset);
  assert.equal(linhas.size, dataset.gres.length);
  for (const indicador of INDICADORES.filter(row => row.lugar !== 'estado' && row.soma)) {
    const n = [...linhas.values()].reduce((total, row) => total + row[indicador.id].n, 0), d = [...linhas.values()].reduce((total, row) => total + row[indicador.id].d, 0);
    assert.ok(Math.abs(n - estado[indicador.id].n) < 1e-6, `${indicador.id}: numerador`);
    assert.ok(Math.abs(d - estado[indicador.id].d) < 1e-6, `${indicador.id}: denominador`);
  }
});

test('presidência: um número principal e mais dois ou três por painel, e a variação em pontos nas taxas e em % no resto', () => {
  const principais = INDICADORES.filter(row => row.principal);
  assert.deepEqual(principais.map(row => row.painel), ['empresas', 'profissionais', 'fiscalizacao', 'financeiro', 'atendimento', 'conselho']);
  for (const painel of principais.map(row => row.painel)) { const n = INDICADORES.filter(row => row.painel === painel).length; assert.ok(n >= 3 && n <= 4, `${painel}: ${n} indicadores`); }
  const taxa = INDICADORES.find(row => row.id === 'mercado')!, contagem = INDICADORES.find(row => row.id === 'pendentes')!;
  assert.equal(valorDe(taxa, { n: 1, d: 4 }), 25);
  assert.equal(valorDe(taxa, { n: 0, d: 0 }), null);
  assert.equal(variacao(taxa, { n: 3, d: 10 }, { n: 1, d: 4 }), 5);
  assert.equal(variacao(contagem, { n: 120, d: 0 }, { n: 100, d: 0 }), 20);
  assert.equal(variacao(contagem, { n: 5, d: 0 }, { n: 0, d: 0 }), null);
});
