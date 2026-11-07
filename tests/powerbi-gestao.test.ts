import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { datasetAt } from '../src/domain/tempo.ts';
import { buildProfissionais, situacaoEm } from '../src/domain/profissionais.ts';
import { distanciaUnidade, mediana } from '../src/domain/gestao.ts';
import { estruturaDe } from '../src/cockpit/estrutura.ts';
import { modeloPowerBi, pacotePowerBi } from '../src/powerbi/pacote.ts';
import { arquivoDe, conferirCamposDosVisuais, conferirChavesUnicas, conferirNomesDePasta, conferirReferenciasDax, conferirSchemas, daxDe, fimDoMesUmAnoAntes, leitorCsv, noPeriodo, numero, soma } from './powerbi-pacote.ts';

/*
 * O pacote Power BI do painel de Atendimento, que sai do modelo comum de `src/powerbi/gestao/` (o de Gestão do Conselho e o
 * Financeiro têm modelo próprio desde 07/11/2026, testados em `powerbi-conselho.test.ts` e `powerbi-financeiro.test.ts`). É testado
 * pela única entrada (`pacotePowerBi`), como o de Empresas: os schemas oficiais, as referências do DAX e dos visuais (conferências
 * comuns em `powerbi-pacote.ts`) e os cartões refeitos a partir dos CSV pela regra que a medida DAX escreve, contra as funções do
 * protótipo (a fonte da verdade).
 */
const painel = 'atendimento', nome = 'Atendimento';
const pacote = pacotePowerBi(painel, dataset), arquivo = arquivoDe(pacote), lerCsv = leitorCsv(pacote), dax = daxDe(pacote, nome);

test('atendimento: projeto PBIP com modelo, relatório com a sua página, tema, dados, mapa e instruções', () => {
  for (const caminho of [`${nome}.pbip`, 'LEIA-ME.md', `${nome}.Report/definition.pbir`, `${nome}.Report/definition/report.json`, `${nome}.Report/definition/pages/pages.json`,
    `${nome}.SemanticModel/definition.pbism`, `${nome}.SemanticModel/definition/model.tmdl`, 'mapas/sp-municipios.json', '.gitignore']) arquivo(caminho);
  assert.deepEqual(JSON.parse(arquivo(`${nome}.Report/definition/pages/pages.json`)).pageOrder, ['atendimento']);
  conferirNomesDePasta(pacote, nome);
  assert.match(arquivo('LEIA-ME.md'), /C:\\\\CREA-SP\\\\powerbi\\\\atendimento\\\\dados\\\\/);
  assert.match(arquivo(`${nome}.SemanticModel/definition/expressions.tmdl`), /powerbi\\atendimento\\dados/);
});

test('atendimento: todo JSON do projeto vale pelo schema oficial da Microsoft, e o tema pelo schema de tema', () => {
  const conferidos = conferirSchemas(pacote);
  assert.ok(conferidos > 10, `só ${conferidos} arquivos conferidos`);
});

test('atendimento: cada Tabela[Coluna] e cada [Medida] citados no DAX existem no modelo recortado, e todo campo de visual também', () => {
  const medidas = conferirReferenciasDax(pacote, nome), campos = conferirCamposDosVisuais(pacote, nome);
  assert.ok(medidas >= 20, `só ${medidas} medidas`);
  assert.ok(campos >= 10, `só ${campos} campos em visuais`);
});

test('atendimento: o lado "um" de cada relação tem chave única no CSV', () => conferirChavesUnicas(pacote, modeloPowerBi(painel)));

test('recorte: o pacote leva só as tabelas do atendimento, sem as do Financeiro e do Conselho', () => {
  const csvs = new Set([...pacote.keys()].filter(caminho => caminho.startsWith('dados/')));
  for (const caminho of ['dados/solicitacoes.csv', 'dados/coworkings-meses.csv', 'dados/profissionais-ativos.csv', 'dados/municipios.csv']) assert.ok(csvs.has(caminho), caminho);
  for (const caminho of ['dados/receitas.csv', 'dados/despesas.csv', 'dados/diarias.csv', 'dados/titulos.csv', 'dados/foto-divida.csv', 'dados/processos.csv', 'dados/camaras.csv']) assert.equal(csvs.has(caminho), false, caminho);
});

test('cartões: o título é o nome do cartão; embaixo vêm a comparação (quando o painel tem) e a linha de apoio', () => {
  const semComparacao = new Set(['Tempo de resolução', 'Moram a mais de 50 km de uma unidade']);
  for (let i = 1; i <= 5; i++) {
    const visual = JSON.parse(arquivo(`${nome}.Report/definition/pages/atendimento/visuals/atendimento-cartao-${i}/visual.json`)).visual;
    const valores = (visual.query.queryState.Values.projections as { field: { Measure: { Property: string } } }[]).map(row => row.field.Measure.Property), [cartao] = valores;
    assert.equal(visual.visualContainerObjects.title[0].properties.text.expr.Literal.Value, `'${cartao}'`);
    assert.deepEqual(valores, semComparacao.has(cartao) ? [cartao, `Detalhe: ${cartao}`] : [cartao, `Comparação: ${cartao}`, `Detalhe: ${cartao}`]);
  }
  assert.match(dax('Comparação: Solicitações resolvidas no prazo'), /" p\.p\. em relação a um ano antes"/);
  // EOMONTH(data, -12) de cada data que se pode escolher precisa estar na tabela oculta de datas das fotos.
  const fotos = new Set(lerCsv('dados/datas-das-fotos.csv').map(row => row.Data));
  for (const { Data: d } of lerCsv('dados/datas-referencia.csv')) assert.ok(fotos.has(fimDoMesUmAnoAntes(d)), `${d}: falta a foto de ${fimDoMesUmAnoAntes(d)}`);
});

/* ---------- os cartões a partir dos CSV ---------- */
const solicitacoes = lerCsv('dados/solicitacoes.csv'), coworkingsMeses = lerCsv('dados/coworkings-meses.csv'), coworkingsUsuarios = lerCsv('dados/coworkings-usuarios.csv'), coworkings = lerCsv('dados/coworkings.csv');
const ativosCsv = lerCsv('dados/profissionais-ativos.csv'), distanciaDe = new Map(lerCsv('dados/municipios.csv').map(row => [row['Código IBGE'], numero(row['Distância até a unidade (km)'])]));
const medianaDe = (rows: Record<string, string>[], coluna: string) => mediana(rows.map(row => numero(row[coluna])));
const taxa = (parte: number, todo: number) => todo > 0 ? parte / todo * 100 : null;

/** Os cartões como o CSV e a regra da medida DAX os dão (espelho das medidas de src/powerbi/gestao/modelo.ts). */
function cartoesDoPacote(d: string, meses: number) {
  const pedidos = solicitacoes.filter(row => noPeriodo(row['Aberta em'], d, meses)), resolvida = (row: Record<string, string>) => row['Resolvida em'] !== '' && row['Resolvida em'] <= d;
  const noPrazo = pedidos.filter(row => resolvida(row) && row['Resolvida em'] <= row.Prazo).length, atraso = pedidos.filter(row => resolvida(row) && row['Resolvida em'] > row.Prazo).length;
  const vencidas = pedidos.filter(row => !resolvida(row) && row.Prazo < d).length;
  const cw = coworkingsMeses.filter(row => noPeriodo(row.Mês, d, meses)), ativos = ativosCsv.filter(row => row.Data === d);
  return {
    noPrazo: taxa(noPrazo, noPrazo + atraso + vencidas), pedidos: pedidos.length, empresas: pedidos.filter(row => row.Solicitante === 'Empresa').length, vencidas,
    tempoResolucao: medianaDe(pedidos.filter(resolvida), 'Dias até resolver'),
    ativos: soma(ativos, 'Ativos'), longe: soma(ativos.filter(row => (distanciaDe.get(row['Código IBGE']) ?? 0) > 50), 'Ativos'),
    ocupacao: taxa(soma(cw, 'Horas usadas'), soma(cw, 'Horas disponíveis')), usuarios: new Set(coworkingsUsuarios.filter(row => noPeriodo(row.Mês, d, meses)).map(row => row.Profissional)).size,
    unidades: coworkings.length, custo: soma(cw, 'Custo'),
  };
}

/** Os mesmos cartões pelas funções do protótipo, como a página de Atendimento os calcula, sem recorte. */
const distancia = distanciaUnidade(dataset);
function cartoesDoPainel(d: string, meses: number) {
  const view = datasetAt(dataset, d), { atendimento: at, coworking: cw } = estruturaDe(view, null, meses), ativos = buildProfissionais(view).profissionais.filter(row => situacaoEm(row, d) === 'Ativo');
  return {
    antes: { noPrazo: at.taxaNoPrazoAntes, pedidos: at.totalAntes, ocupacao: cw.ocupacaoAntes },
    agora: {
      noPrazo: at.taxaNoPrazo, pedidos: at.pedidos.length, empresas: at.empresas, vencidas: at.partes['Em aberto, prazo vencido'].length, tempoResolucao: at.medianaDias,
      ativos: ativos.length, longe: ativos.filter(row => (distancia.get(row.cityId)?.km ?? 0) > 50).length,
      ocupacao: cw.ocupacao, usuarios: cw.usuarios, unidades: cw.unidades.length, custo: cw.custo,
    },
  };
}

const igual = (obtido: number | null, esperado: number | null, rotulo: string) => {
  if (esperado === null || obtido === null) { assert.equal(obtido, esperado, rotulo); return; }
  if (Number.isInteger(esperado) && Number.isInteger(obtido)) { assert.equal(obtido, esperado, rotulo); return; }
  // Os valores em reais saem do CSV com dois decimais: a soma pode diferir em centavos.
  assert.ok(Math.abs(obtido - esperado) <= Math.max(1e-6, Math.abs(esperado) * 1e-7), `${rotulo}: ${obtido} ≠ ${esperado}`);
};
for (const [d, meses] of [['2026-09-30', 12], ['2026-03-31', 12], ['2025-09-30', 12], ['2026-09-30', 24], ['2026-06-30', 3]] as const) {
  test(`cartões: os CSV com a regra das medidas dão os números do painel em ${d}, período de ${meses} meses`, () => {
    const pacote = cartoesDoPacote(d, meses), { agora } = cartoesDoPainel(d, meses);
    // Os usuários dos coworkings só se comparam em hoje: o cenário sorteia de novo quem usou a mesa a cada data lida (as horas
    // não mudam). Na base real, o uso é um fato e não muda com a data de referência.
    for (const chave of Object.keys(agora) as (keyof typeof agora)[]) if (chave !== 'usuarios' || d === dataset.snapshotDate) igual(pacote[chave], agora[chave], chave);
  });
}

/* ---------- a variação em um ano: a medida lê o mesmo cartão em EOMONTH(d, -12), e o painel compara com um ano antes ---------- */
for (const [d, meses] of [['2026-09-30', 12], ['2026-06-30', 3]] as const) {
  test(`variação em um ano: o cartão lido um ano antes dá a base de comparação do painel em ${d}, período de ${meses} meses`, () => {
    const antes = cartoesDoPacote(fimDoMesUmAnoAntes(d), meses), painel = cartoesDoPainel(d, meses).antes;
    for (const chave of Object.keys(painel) as (keyof typeof painel)[]) igual(antes[chave], painel[chave], chave);
  });
}

/* ---------- os gráficos, contra as funções do protótipo (sem recorte) ---------- */
test('gráficos do atendimento: assunto e situação e ocupação de cada coworking dão os do painel', () => {
  for (const [d, meses] of [['2026-09-30', 12], ['2025-12-31', 6]] as const) {
    const view = datasetAt(dataset, d);
    const { atendimento: at, coworking: cw } = estruturaDe(view, null, meses), pedidos = solicitacoes.filter(row => noPeriodo(row['Aberta em'], d, meses));
    const resolvida = (row: Record<string, string>) => row['Resolvida em'] !== '' && row['Resolvida em'] <= d;
    const situacaoDe = (row: Record<string, string>) => resolvida(row) ? (row['Resolvida em'] <= row.Prazo ? 'Resolvido no prazo' : 'Resolvido com atraso') : row.Prazo < d ? 'Em aberto, prazo vencido' : 'Em aberto, no prazo';
    for (const linha of at.porAssunto) for (const [situacao, rows] of Object.entries(linha.partes)) assert.equal(pedidos.filter(row => row.Assunto === linha.assunto && situacaoDe(row) === situacao).length, rows.length, `${d} ${linha.assunto} ${situacao}`);
    const cwMeses = coworkingsMeses.filter(row => noPeriodo(row.Mês, d, meses));
    for (const unidade of cw.unidades) { const daUnidade = cwMeses.filter(row => row.Unidade === unidade.nome); igual(taxa(soma(daUnidade, 'Horas usadas'), soma(daUnidade, 'Horas disponíveis')), unidade.ocupacao, `${d} ${unidade.nome}`); }
  }
});

test('recorte por regional: solicitações e coworkings seguem a GRE, como no painel', () => {
  const d = dataset.snapshotDate, meses = 12;
  for (const gre of dataset.gres.slice(0, 4)) {
    const { atendimento: at, coworking: cw } = estruturaDe(dataset, gre.id, meses);
    assert.equal(solicitacoes.filter(row => row.GRE === gre.name && noPeriodo(row['Aberta em'], d, meses)).length, at.pedidos.length, `${gre.name}: solicitações`);
    assert.equal(coworkings.filter(row => row.GRE === gre.name).length, cw.unidades.length, `${gre.name}: coworkings`);
  }
});
