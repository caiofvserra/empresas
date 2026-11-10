import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { exercicioPadrao, indicadorRegional, indicadoresDoCrea, metricas, porRegional, quadroSistema } from '../src/domain/sistema-confea.ts';
import { modeloPowerBi, pacotePowerBi } from '../src/powerbi/pacote.ts';
import { CARTOES } from '../src/powerbi/indicadores/modelo.ts';
import { arquivoDe, conferirCamposDosVisuais, conferirChavesUnicas, conferirNomesDePasta, conferirReferenciasDax, conferirSchemas, daxDe, leitorCsv, modeloDoPacote, numero } from './powerbi-pacote.ts';

/*
 * O pacote Power BI do painel de Indicadores do Sistema (10/11/2026). Testado pela única entrada (`pacotePowerBi`): os schemas
 * oficiais, as referências do DAX e dos visuais, e os CSV contra `quadroSistema`, a função que o painel em HTML usa (a fonte da
 * verdade): as métricas e os indicadores do Conselho inteiro e de uma regional, as regionais que somam o Conselho e os números reais.
 */
const pacote = pacotePowerBi('indicadores', dataset), arquivo = arquivoDe(pacote), lerCsv = leitorCsv(pacote), dax = daxDe(pacote, 'Indicadores');
const PAGINAS = ['registro', 'fiscalizacao', 'julgamento', 'suporte', 'entrega'];
const hoje = dataset.snapshotDate, padrao = exercicioPadrao(hoje);

test('indicadores: projeto PBIP com modelo, relatório com as cinco páginas, tema, dados, mapa e instruções', () => {
  for (const caminho of ['Indicadores.pbip', 'LEIA-ME.md', 'Indicadores.Report/definition.pbir', 'Indicadores.SemanticModel/definition/model.tmdl', 'mapas/sp-municipios.json', '.gitignore']) arquivo(caminho);
  assert.deepEqual(JSON.parse(arquivo('Indicadores.Report/definition/pages/pages.json')).pageOrder, PAGINAS);
  conferirNomesDePasta(pacote, 'Indicadores');
  assert.match(arquivo('LEIA-ME.md'), /C:\\\\CREA-SP\\\\powerbi\\\\indicadores\\\\dados\\\\/);
  assert.ok(![...pacote.keys()].some(caminho => /pncp|tcc/i.test(caminho)));
});

test('indicadores: todo JSON vale pelo schema oficial, cada Tabela[Coluna] e [Medida] do DAX existe, e o lado "um" das relações tem chave única', () => {
  assert.ok(conferirSchemas(pacote) > 30);
  assert.ok(conferirReferenciasDax(pacote, 'Indicadores') >= 80);
  assert.ok(conferirCamposDosVisuais(pacote, 'Indicadores') >= 80);
  conferirChavesUnicas(pacote, modeloPowerBi('indicadores'));
  const { colunas, medidas } = modeloDoPacote(pacote, 'Indicadores'), nomes = new Set([...colunas.values()].flatMap(set => [...set]));
  for (const medida of medidas) assert.ok(!nomes.has(medida), `medida com nome de coluna: ${medida}`);
});

test('cartões: os do painel em cada página, com o título e a linha de apoio; a taxa divide por 100 e a média não', () => {
  for (const pagina of PAGINAS as (keyof typeof CARTOES)[]) CARTOES[pagina].forEach((cartao, i) => {
    const visual = JSON.parse(arquivo(`Indicadores.Report/definition/pages/${pagina}/visuals/${pagina}-cartao-${i + 1}/visual.json`)).visual;
    assert.equal(visual.visualContainerObjects.title[0].properties.text.expr.Literal.Value, `'${cartao.nome}'`);
  });
  assert.equal(CARTOES.registro.length, 7);
  assert.match(dax('Índice de autuação'), /'Valores dos indicadores'\[Indicador\] = 12[^]*DIVIDE\(IF\(NOT ISBLANK\(regional\), regional, conselho\), 100\)/);
  assert.doesNotMatch(dax('Quadro técnico por empresa'), /, 100\)/);
});

test('exercícios: de 2022 até o da data, o último parcial, e o padrão é o último completo', () => {
  const exercicios = lerCsv('dados/exercicios.csv');
  assert.deepEqual(exercicios.map(row => row.Ano), ['2022', '2023', '2024', '2025', '2026']);
  assert.deepEqual(exercicios.map(row => row.Parcial), ['0', '0', '0', '0', '1']);
  assert.deepEqual(exercicios.filter(row => row['Padrão'] === '1').map(row => Number(row.Ano)), [padrao]);
  assert.equal(exercicios.at(-1)!['Rótulo'], '2026*');
});

test('métricas: o CSV é o quadro do HTML, as regionais somam o Conselho e os números do Sumário de 2025 levam a marca Real', () => {
  const valores = lerCsv('dados/valores.csv');
  assert.equal(lerCsv('dados/metricas.csv').length, 161);
  for (const ano of [2024, padrao, 2026]) {
    const q = quadroSistema(dataset, hoje, ano, null), doAno = valores.filter(row => Number(row.Ano) === ano);
    for (const m of metricas) {
      const conselho = doAno.find(row => row['Nível'] === 'Conselho' && Number(row['Código']) === m.codigo)!, esperado = q.estado.get(m.codigo) ?? null;
      if (esperado === null) assert.equal(conselho.Valor, '', `${ano} M${m.codigo} vazia`);
      else assert.ok(Math.abs(numero(conselho.Valor) - esperado) < 0.01, `${ano} M${m.codigo}`);
      const regionais = doAno.filter(row => row['Nível'] === 'Regional' && Number(row['Código']) === m.codigo);
      if (!porRegional(m.codigo)) { assert.equal(regionais.length, 0, `M${m.codigo} não se divide por regional`); continue; }
      assert.equal(regionais.length, 16);
      if (esperado !== null) assert.ok(Math.abs(regionais.reduce((t, row) => t + numero(row.Valor), 0) - esperado) < 0.5, `${ano} M${m.codigo}: regionais somam o Conselho`);
    }
  }
  const real = (codigo: number) => valores.find(row => row.Ano === '2025' && row['Nível'] === 'Conselho' && Number(row['Código']) === codigo)!;
  assert.equal(real(37).Valor, '409757'); assert.equal(real(37).Real, '1');
  assert.equal(real(25).Valor, '1899583');
  assert.equal(real(1).Real, '0');
  // As ações dos municípios somam a métrica 37.
  const acoes = lerCsv('dados/acoes-municipios.csv').filter(row => Number(row.Ano) === padrao).reduce((t, row) => t + numero(row['Ações']), 0);
  assert.equal(acoes, numero(real(37).Valor));
});

test('indicadores: os 29 do Crea, iguais aos do HTML no Conselho e numa regional; a regional só onde todas as métricas se dividem', () => {
  const linhas = lerCsv('dados/valores-indicadores.csv'), q = quadroSistema(dataset, hoje, padrao, null), qGre = quadroSistema(dataset, hoje, padrao, 'GRE5');
  assert.equal(lerCsv('dados/indicadores.csv').length, indicadoresDoCrea.length);
  const nomeGre5 = dataset.gres.find(row => row.id === 'GRE5')!.name;
  for (const c of indicadoresDoCrea) {
    const conselho = linhas.find(row => Number(row.Ano) === padrao && row['Nível'] === 'Conselho' && Number(row.Indicador) === c)!, v = q.indicadores.get(c)!;
    if (v.valor === null) { assert.equal(conselho.Sai, '0'); assert.notEqual(conselho.Faltam, ''); }
    else assert.ok(Math.abs(numero(conselho.Valor) - v.valor) < 0.006, `I${c}`);
    const regional = linhas.find(row => Number(row.Ano) === padrao && row['Nível'] === 'Regional' && row.GRE === nomeGre5 && Number(row.Indicador) === c);
    assert.equal(Boolean(regional), indicadorRegional(c), `I${c} por regional`);
    if (regional && qGre.indicadores.get(c)!.valor !== null) assert.ok(Math.abs(numero(regional.Valor) - qGre.indicadores.get(c)!.valor!) < 0.006, `I${c} na GRE 5`);
  }
});

test('entrega: as conferências plantadas no cenário não fecham em 2025, e as métricas vazias são as três do cenário', () => {
  const conferencias = lerCsv('dados/conferencias.csv').filter(row => row.Ano === '2025' && row['Situação'] === 'Não fecha');
  assert.deepEqual(conferencias.map(row => row['Conferência'].split(' ')[0]).sort(), ['38', '98']);
  const vazias = lerCsv('dados/situacao-metricas.csv').filter(row => row.Ano === '2025' && row['Situação'] === 'Vazia').map(row => Number(row['Código']));
  assert.deepEqual(vazias, [111, 156, 157]);
  assert.ok(lerCsv('dados/calendario-entregas.csv').every(row => row.Data > hoje));
});
