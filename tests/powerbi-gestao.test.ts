import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { datasetAt } from '../src/domain/tempo.ts';
import { estruturaDe } from '../src/cockpit/estrutura.ts';
import { modeloPowerBi, pacotePowerBi } from '../src/powerbi/pacote.ts';
import { arquivoDe, conferirCamposDosVisuais, conferirChavesUnicas, conferirNomesDePasta, conferirReferenciasDax, conferirSchemas, fimDoMesUmAnoAntes, leitorCsv, noPeriodo, soma } from './powerbi-pacote.ts';

/*
 * O pacote Power BI do painel de Atendimento, que sai do modelo comum de `src/powerbi/gestao/` (o de Gestão do Conselho e o
 * Financeiro têm modelo próprio desde 07/11/2026, testados em `powerbi-conselho.test.ts` e `powerbi-financeiro.test.ts`). É testado
 * pela única entrada (`pacotePowerBi`), como o de Empresas: os schemas oficiais, as referências do DAX e dos visuais (conferências
 * comuns em `powerbi-pacote.ts`) e os cartões refeitos a partir dos CSV pela regra que a medida DAX escreve, contra as funções do
 * protótipo (a fonte da verdade). Os cartões e os gráficos dos protocolos, da equipe e da demanda estão em
 * `powerbi-atendimento.test.ts`; aqui ficam a estrutura, o recorte e os coworkings.
 */
const painel = 'atendimento', nome = 'Atendimento';
const pacote = pacotePowerBi(painel, dataset), arquivo = arquivoDe(pacote), lerCsv = leitorCsv(pacote);

test('atendimento: projeto PBIP com modelo, relatório com as suas três páginas, tema, dados, mapa e instruções', () => {
  for (const caminho of [`${nome}.pbip`, 'LEIA-ME.md', `${nome}.Report/definition.pbir`, `${nome}.Report/definition/report.json`, `${nome}.Report/definition/pages/pages.json`,
    `${nome}.SemanticModel/definition.pbism`, `${nome}.SemanticModel/definition/model.tmdl`, 'mapas/sp-municipios.json', '.gitignore']) arquivo(caminho);
  assert.deepEqual(JSON.parse(arquivo(`${nome}.Report/definition/pages/pages.json`)).pageOrder, ['protocolos', 'equipe', 'demanda']);
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
  for (const caminho of ['dados/protocolos.csv', 'dados/foto-protocolos.csv', 'dados/colaboradores.csv', 'dados/coworkings-meses.csv', 'dados/municipios.csv']) assert.ok(csvs.has(caminho), caminho);
  for (const caminho of ['dados/solicitacoes.csv', 'dados/receitas.csv', 'dados/despesas.csv', 'dados/diarias.csv', 'dados/titulos.csv', 'dados/foto-divida.csv', 'dados/processos.csv', 'dados/camaras.csv']) assert.equal(csvs.has(caminho), false, caminho);
});

test('datas das fotos: EOMONTH(data, -12) de cada data que se pode escolher está na tabela oculta de datas das fotos', () => {
  const fotos = new Set(lerCsv('dados/datas-das-fotos.csv').map(row => row.Data));
  for (const { Data: d } of lerCsv('dados/datas-referencia.csv')) assert.ok(fotos.has(fimDoMesUmAnoAntes(d)), `${d}: falta a foto de ${fimDoMesUmAnoAntes(d)}`);
});

/* ---------- os coworkings, contra as funções do protótipo ---------- */
const coworkingsMeses = lerCsv('dados/coworkings-meses.csv'), coworkings = lerCsv('dados/coworkings.csv');
const taxa = (parte: number, todo: number) => todo > 0 ? parte / todo * 100 : null;
const igual = (obtido: number | null, esperado: number | null, rotulo: string) => {
  if (esperado === null || obtido === null) { assert.equal(obtido, esperado, rotulo); return; }
  assert.ok(Math.abs(obtido - esperado) <= Math.max(1e-6, Math.abs(esperado) * 1e-7), `${rotulo}: ${obtido} ≠ ${esperado}`);
};

test('gráficos da equipe: a ocupação de cada coworking dá a do painel', () => {
  for (const [d, meses] of [['2026-09-30', 12], ['2025-12-31', 6]] as const) {
    const { coworking: cw } = estruturaDe(datasetAt(dataset, d), null, meses), cwMeses = coworkingsMeses.filter(row => noPeriodo(row.Mês, d, meses));
    for (const unidade of cw.unidades) { const daUnidade = cwMeses.filter(row => row.Unidade === unidade.nome); igual(taxa(soma(daUnidade, 'Horas usadas'), soma(daUnidade, 'Horas disponíveis')), unidade.ocupacao, `${d} ${unidade.nome}`); }
  }
});

test('recorte por regional: os coworkings seguem a GRE, como no painel', () => {
  for (const gre of dataset.gres.slice(0, 4)) assert.equal(coworkings.filter(row => row.GRE === gre.name).length, estruturaDe(dataset, gre.id, 12).coworking.unidades.length, `${gre.name}: coworkings`);
});
