import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { mesesDoArquivo } from '../src/domain/receita-mercado.ts';
import { catalogoCnae, contar, enquadrar, fecharContagem, lerEstabelecimento, casarSocio, indiceProfissionais, lerSocio, ligarMunicipios, novaContagem, remendar, colunasStaging } from '../scripts/integrations/receita.ts';

// Linha no leiaute dos dados abertos do CNPJ (Estabelecimentos): 30 campos entre aspas, separados por ponto e vírgula.
const linha = (campos: Record<number, string>) => Array.from({ length: 30 }, (_, i) => `"${campos[i] ?? ''}"`).join(';');
const catalogo = catalogoCnae([
  { code: '7112-0/00', classification: 'Relacionado' },
  { code: '4120-4/00', classification: 'Relacionado' },
  { code: '4744-0/99', classification: 'Depende de análise' },
]);

test('lê o estabelecimento do leiaute da Receita: CNPJ completo, município, situação, datas e atividades', () => {
  const e = lerEstabelecimento(linha({ 0: '12345678', 1: '0001', 2: '95', 3: '1', 5: '02', 6: '20200115', 10: '20190310', 11: '4744099', 12: '7112000,4120400', 19: 'SP', 20: '7107' }));
  assert.deepEqual(e, { cnpj: '12345678000195', basico: '12345678', matriz: true, situacao: 'Ativa', dataSituacao: '2020-01-15', inicio: '2019-03-10',
    cnaePrincipal: '4744-0/99', cnaesSecundarios: ['7112-0/00', '4120-4/00'], uf: 'SP', municipioRfb: '7107' });
});

test('enquadra pela atividade principal; sem ela na lista, pela secundária de classe mais forte', () => {
  const base = { cnpj: '1', basico: '1', matriz: true, situacao: 'Ativa' as const, dataSituacao: null, inicio: null, uf: 'SP', municipioRfb: '7107' };
  assert.deepEqual(enquadrar({ ...base, cnaePrincipal: '7112-0/00', cnaesSecundarios: [] }, catalogo), { classe: 'Sim', cnae: '7112-0/00' });
  assert.deepEqual(enquadrar({ ...base, cnaePrincipal: '4744-0/99', cnaesSecundarios: ['4120-4/00'] }, catalogo), { classe: 'Passível', cnae: '4744-0/99' });
  assert.deepEqual(enquadrar({ ...base, cnaePrincipal: '4711-3/02', cnaesSecundarios: ['4744-0/99', '4120-4/00'] }, catalogo), { classe: 'Sim', cnae: '4120-4/00' });
  assert.equal(enquadrar({ ...base, cnaePrincipal: '4711-3/02', cnaesSecundarios: ['5611-2/01'] }, catalogo), null);
});

// Uma posição por mês, de jan/2025 (início da contagem) a out/2026 (competência).
const mes = (porMes: Record<string, number>) => mesesDoArquivo({ desde: '2025-01', competencia: '2026-10' }).map(m => porMes[m] ?? 0);

test('conta o mercado por município do IBGE: ativos por classe, fora de atividade, porte da empresa, aberturas e baixas por mês', () => {
  const base = { matriz: true, dataSituacao: null, inicio: null, uf: 'SP', cnaesSecundarios: [] as string[] };
  const contagem = novaContagem({ desde: '2025-01' });
  contar(contagem, { ...base, cnpj: '11111111000101', basico: '11111111', situacao: 'Ativa', inicio: '2025-03-04', cnaePrincipal: '7112-0/00', municipioRfb: '7107' }, catalogo);
  contar(contagem, { ...base, cnpj: '11111111000292', basico: '11111111', matriz: false, situacao: 'Ativa', cnaePrincipal: '7112-0/00', municipioRfb: '6291' }, catalogo);
  contar(contagem, { ...base, cnpj: '22222222000101', basico: '22222222', situacao: 'Ativa', inicio: '2024-12-31', cnaePrincipal: '4744-0/99', municipioRfb: '7107' }, catalogo);
  contar(contagem, { ...base, cnpj: '33333333000101', basico: '33333333', situacao: 'Baixada', dataSituacao: '2025-06-30', cnaePrincipal: '4120-4/00', municipioRfb: '7107' }, catalogo);
  contar(contagem, { ...base, cnpj: '66666666000101', basico: '66666666', situacao: 'Ativa', cnaePrincipal: '4711-3/02', cnaesSecundarios: ['4120-4/00'], municipioRfb: '7107' }, catalogo);
  contar(contagem, { ...base, cnpj: '44444444000101', basico: '44444444', situacao: 'Ativa', cnaePrincipal: '5611-2/01', municipioRfb: '7107' }, catalogo);
  contar(contagem, { ...base, cnpj: '55555555000101', basico: '55555555', situacao: 'Ativa', uf: 'MG', cnaePrincipal: '7112-0/00', municipioRfb: '4123' }, catalogo);
  const mercado = fecharContagem(contagem, {
    competencia: '2026-10', municipios: new Map([['7107', '3550308'], ['6291', '3509502']]), gres: new Map([['3550308', 'GRE5'], ['3509502', 'GRE2']]), maisAtividades: 2, porte: new Map([['11111111', '03'], ['22222222', '01']]), nomesRfb: new Map(),
  });
  assert.equal(mercado.competencia, '2026-10');
  assert.deepEqual(mercado.total, { sim: 3, passivel: 1, empresas: 3, fora: 1 });
  assert.deepEqual(mercado.municipios['3550308'], { sim: 2, passivel: 1, principal: { sim: 1, passivel: 1 }, fora: { Suspensa: 0, Inapta: 0, Baixada: 1 }, porte: { ME: 1, EPP: 1, Demais: 0, 'Não informado': 1 },
    aberturas: mes({ '2025-03': 1 }), baixas: mes({ '2025-06': 1 }), cnaes: { '4120-4/00': 1, '4744-0/99': 1 } }, 'com duas atividades por município, a terceira (empate) sai pela ordem do código');
  assert.deepEqual(mercado.cnaes, { '4120-4/00': 1, '4744-0/99': 1, '7112-0/00': 2 }, 'o estado guarda todas as atividades');
  assert.deepEqual(mercado.gres, { GRE2: { '7112-0/00': 1 }, GRE5: { '4120-4/00': 1, '4744-0/99': 1, '7112-0/00': 1 } });
  assert.deepEqual(mercado.municipios['3509502'].porte, { ME: 0, EPP: 1, Demais: 0, 'Não informado': 0 });
  assert.deepEqual(mercado.naoLocalizados, []);
});

test('liga o município da Receita ao do IBGE pelo nome, sem acento, hífen nem apóstrofo, e pelos nomes antigos', () => {
  const ibge = [{ id: '3548500', nome: "Santa Bárbara d'Oeste" }, { id: '3515004', nome: 'Embu das Artes' }, { id: '3530805', nome: 'Mogi Mirim' }, { id: '3550308', nome: 'São Paulo' }];
  const rfb = new Map([['7109', "SANTA BARBARA D'OESTE"], ['6413', 'EMBU'], ['6705', 'MOJI-MIRIM'], ['7107', 'SAO PAULO'], ['9999', 'LUGAR NENHUM']]);
  const ligados = ligarMunicipios(rfb, ibge, ['7109', '6413', '6705', '7107', '9999']);
  assert.deepEqual([...ligados.municipios], [['7109', '3548500'], ['6413', '3515004'], ['6705', '3530805'], ['7107', '3550308']]);
  assert.deepEqual(ligados.semPar, ['9999']);
});

test('sócio pessoa física: lê o CPF mascarado e casa com o profissional pelo nome e pelos seis dígitos visíveis', () => {
  const s = lerSocio('"12345678";"2";"MARIA DA SILVA";"***456789**";"49";"20200101";"";"***000000**";"";"00";"5"');
  assert.deepEqual(s, { basico: '12345678', tipo: 'PF', nome: 'MARIA DA SILVA', documento: '***456789**', qualificacao: '49', entrada: '2020-01-01' });
  const indice = indiceProfissionais([
    { id: 'p1', nome: 'Maria da Silva', cpf: '123.456.789-01' },
    { id: 'p2', nome: 'Maria da Silva', cpf: '999.456.789-77' },
    { id: 'p3', nome: 'Maria da Silva', cpf: '123.000.789-01' },
    { id: 'p4', nome: 'João Souza', cpf: '111.222.333-44' },
  ]);
  assert.deepEqual(casarSocio(s, indice), { situacao: 'Homônimo', profissionais: ['p1', 'p2'] });
  assert.deepEqual(casarSocio({ ...s, nome: 'JOAO SOUZA', documento: '***222333**' }, indice), { situacao: 'Identificado', profissionais: ['p4'] });
  assert.deepEqual(casarSocio({ ...s, nome: 'JOAO SOUZA', documento: '***000000**' }, indice), { situacao: 'Sem par', profissionais: [] });
  assert.deepEqual(casarSocio({ ...s, tipo: 'PJ', documento: '12345678000195' }, indice), { situacao: 'Sem par', profissionais: [] });
});

test('linha quebrada da Receita (campo com quebra de linha dentro) é descartada, sem derrubar a leitura', () => {
  assert.equal(lerEstabelecimento('"12345678";"0001";"95";"1";"LOJA DO'), null);
  assert.equal(lerEstabelecimento('CENTRO";"02";"20200115"'), null);
  assert.equal(lerSocio('"12345678";"2"'), null);
});

test('registro com quebra de linha dentro de um campo é remendado antes da leitura, e as linhas inteiras passam iguais', () => {
  const inteira = linha({ 0: '11111111', 19: 'SP' });
  const quebrada = linha({ 0: '22222222', 15: 'RUA A\nFUNDOS', 19: 'SP' }).split('\n');
  assert.deepEqual([...remendar([inteira, ...quebrada, inteira])], [inteira, `${quebrada[0]}\n${quebrada[1]}`, inteira]);
  assert.equal(lerEstabelecimento([...remendar(quebrada)][0])?.uf, 'SP');
});

test('o contrato SQL do cruzamento descreve as colunas e os valores que o coletor grava no staging', () => {
  const sql = readFileSync(join(import.meta.dirname, '..', 'integrations', 'sql', 'receita-x-cadastro.sql'), 'utf8');
  for (const [arquivo, { tabela, colunas }] of Object.entries(colunasStaging)) {
    const trecho = sql.match(new RegExp(`${tabela.replace('.', '\\.')}\\s+<- ${arquivo.replace('.', '\\.')}[^\\n]*\\n--\\s+\\(([^)]*)\\)`));
    assert.ok(trecho, `o contrato descreve ${arquivo}`);
    assert.deepEqual(trecho[1].split(',').map(c => c.replace(/--/g, '').trim()), colunas, `colunas de ${arquivo}`);
  }
  // Os valores em texto que as consultas filtram são os que o coletor grava (situação, classe e tipo de sócio por extenso).
  const valores = new Set(['Ativa', 'Suspensa', 'Inapta', 'Baixada', 'Nula', 'Sim', 'Passível', 'PJ', 'PF', 'Estrangeiro', 'Ativo', 'Identificado', 'Homônimo', 'fora_de_sp', 'fora_da_lista', '2026-10']);
  const filtrados = [...sql.replace(/^--.*$/gm, '').matchAll(/(?:situacao|classe|tipo|situacao_par)\s*(?:=|<>)\s*'([^']*)'/g)].map(m => m[1]);
  assert.ok(filtrados.length >= 8);
  for (const v of filtrados) assert.ok(valores.has(v), `valor filtrado no SQL que o coletor não grava: ${v}`);
  assert.equal(lerSocio('"12345678";"2";"MARIA";"***456789**";"49";"20200101"')?.tipo, 'PF');
});
