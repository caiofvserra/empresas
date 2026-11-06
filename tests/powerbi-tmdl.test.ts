import test from 'node:test';
import assert from 'node:assert/strict';
import { modeloTmdl } from '../src/powerbi/tmdl.ts';
import type { Modelo } from '../src/powerbi/modelo.ts';

// O formato esperado segue os exemplos da documentação TMDL da Microsoft (docs/pesquisa/powerbi-pbip.md, seção 2):
// um TAB por nível, nomes com espaço entre aspas simples, DAX multilinha entre três crases e CRLF no fim de cada linha.
const modelo: Modelo = {
  nome: 'Empresas',
  parametros: [{ nome: 'Pasta dos dados', valor: 'C:\\CREA-SP\\empresas\\', descricao: 'Pasta com os CSV do pacote.' }],
  tabelas: [
    { nome: 'Municípios', arquivo: 'municipios.csv', colunas: [
      { nome: 'Código IBGE', tipo: 'string' },
      { nome: 'GRE', tipo: 'string' },
    ] },
    { nome: 'Foto das empresas', arquivo: 'foto-empresas.csv', oculta: true, colunas: [
      { nome: 'Data', tipo: 'dateTime', formato: 'dd/mm/yyyy' },
      { nome: 'Registrada', tipo: 'int64' },
    ], medidas: [
      { nome: 'Empresas registradas', dax: 'SUM(\'Foto das empresas\'[Registrada])', formato: '#,##0', pasta: 'Registro e mercado', descricao: 'Empresas com registro ou visto ativo.' },
      { nome: 'Parte registrada', dax: 'VAR a = 1\nRETURN DIVIDE(a, 2)', formato: '0.0%' },
    ] },
  ],
  relacoes: [{ de: ['Foto das empresas', 'Código IBGE'], para: ['Municípios', 'Código IBGE'] }],
};

const arquivos = modeloTmdl(modelo);
const linhas = (texto: string | undefined) => (texto ?? '').split('\r\n');

test('TMDL: o modelo traz database, model, parâmetro, relações e um arquivo por tabela, todos com CRLF e sem BOM', () => {
  assert.deepEqual([...arquivos.keys()].sort(), [
    'definition.pbism', 'definition/database.tmdl', 'definition/expressions.tmdl', 'definition/model.tmdl', 'definition/relationships.tmdl',
    'definition/tables/Foto das empresas.tmdl', 'definition/tables/Municípios.tmdl',
  ]);
  for (const [caminho, texto] of arquivos) {
    assert.ok(!texto.startsWith('\uFEFF'), `${caminho} começa com BOM`);
    if (caminho.endsWith('.tmdl')) assert.ok(!/[^\r]\n/.test(texto), `${caminho} tem LF sem CR`);
  }
  assert.equal(JSON.parse(arquivos.get('definition.pbism')!).version, '4.0');
  assert.deepEqual(linhas(arquivos.get('definition/database.tmdl')).slice(0, 2), ['database', '\tcompatibilityLevel: 1567']);
});

test('TMDL: model fixa a cultura pt-BR e a ordem das tabelas', () => {
  const model = linhas(arquivos.get('definition/model.tmdl'));
  assert.equal(model[0], 'model Model');
  assert.ok(model.includes('\tculture: pt-BR'));
  assert.ok(model.includes("ref table 'Municípios'") || model.includes('ref table Municípios'));
  assert.ok(model.indexOf("ref table 'Foto das empresas'") > model.findIndex(row => row.startsWith('ref table') && row.includes('Municípios')));
});

test('TMDL: tabela com coluna, medida de uma linha, medida multilinha e partição que lê o CSV pela pasta do parâmetro', () => {
  const tabela = linhas(arquivos.get('definition/tables/Foto das empresas.tmdl'));
  assert.equal(tabela[0], "table 'Foto das empresas'");
  assert.ok(tabela.includes('\tisHidden'));
  // Medida de uma linha, com a descrição em /// logo acima.
  const i = tabela.indexOf("\tmeasure 'Empresas registradas' = SUM('Foto das empresas'[Registrada])");
  assert.ok(i > 0, 'medida de uma linha');
  assert.equal(tabela[i - 1], '\t/// Empresas com registro ou visto ativo.');
  assert.ok(tabela.slice(i + 1, i + 5).includes('\t\tformatString: #,##0'));
  assert.ok(tabela.slice(i + 1, i + 5).includes("\t\tdisplayFolder: Registro e mercado"));
  // Medida multilinha: três crases, corpo três TABs para dentro.
  const j = tabela.indexOf("\tmeasure 'Parte registrada' = ```");
  assert.deepEqual(tabela.slice(j + 1, j + 4), ['\t\t\tVAR a = 1', '\t\t\tRETURN DIVIDE(a, 2)', '\t\t\t```']);
  // Coluna.
  const k = tabela.indexOf('\tcolumn Data');
  assert.deepEqual(tabela.slice(k + 1, k + 5), ['\t\tdataType: dateTime', '\t\tformatString: dd/mm/yyyy', '\t\tsummarizeBy: none', '\t\tsourceColumn: Data']);
  // Partição M: lê o CSV em UTF-8 com ponto e vírgula, promove o cabeçalho e tipa com a cultura pt-BR.
  const p = tabela.indexOf("\tpartition 'Foto das empresas' = m");
  assert.equal(tabela[p + 1], '\t\tmode: import');
  const m = tabela.slice(p + 2).join('\n');
  assert.match(m, /File\.Contents\(#"Pasta dos dados" & "foto-empresas\.csv"\)/);
  assert.match(m, /Delimiter = ";", Encoding = 65001/);
  assert.match(m, /Table\.PromoteHeaders/);
  assert.match(m, /\{"Data", type date\}, \{"Registrada", Int64\.Type\}/);
});

test('TMDL: lineageTag estável e único, para gerar de novo sem diferença', () => {
  const tags = [...arquivos.values()].flatMap(texto => [...texto.matchAll(/lineageTag: (\S+)/g)].map(match => match[1]));
  assert.ok(tags.length >= 8);
  assert.equal(new Set(tags).size, tags.length);
  assert.deepEqual(modeloTmdl(modelo), arquivos);
});

test('TMDL: parâmetro de texto e relação da foto para a dimensão', () => {
  const expressao = linhas(arquivos.get('definition/expressions.tmdl'));
  assert.equal(expressao[0], '/// Pasta com os CSV do pacote.');
  assert.equal(expressao[1], 'expression \'Pasta dos dados\' = "C:\\CREA-SP\\empresas\\" meta [IsParameterQuery=true, Type="Text", IsParameterQueryRequired=true]');
  const relacao = linhas(arquivos.get('definition/relationships.tmdl'));
  assert.match(relacao[0], /^relationship [0-9a-f-]{36}$/);
  assert.ok(relacao.includes("\tfromColumn: 'Foto das empresas'.'Código IBGE'"));
  assert.ok(relacao.includes("\ttoColumn: 'Municípios'.'Código IBGE'"));
});
