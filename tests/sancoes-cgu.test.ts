import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { colunasStagingSancoes, lerSancoes, linhaStaging, vigentes } from '../scripts/integrations/sancoes.ts';

// CEIS e CNEP da CGU como vêm no ZIP diário (";", aspas em todo campo, Latin-1 já decodificado). Nomes e CNPJ fictícios.
const cabecalhoCeis = '"CADASTRO";"CÓDIGO DA SANÇÃO";"TIPO DE PESSOA";"CPF OU CNPJ DO SANCIONADO";"NOME DO SANCIONADO";"NOME INFORMADO PELO ÓRGÃO SANCIONADOR";"RAZÃO SOCIAL - CADASTRO RECEITA";"NOME FANTASIA - CADASTRO RECEITA";"NÚMERO DO PROCESSO";"CATEGORIA DA SANÇÃO";"DATA INÍCIO SANÇÃO";"DATA FINAL SANÇÃO";"DATA PUBLICAÇÃO";"PUBLICAÇÃO";"DETALHAMENTO DO MEIO DE PUBLICAÇÃO";"DATA DO TRÂNSITO EM JULGADO";"ABRAGÊNCIA DA SANÇÃO";"ÓRGÃO SANCIONADOR";"UF ÓRGÃO SANCIONADOR";"ESFERA ÓRGÃO SANCIONADOR";"FUNDAMENTAÇÃO LEGAL";"DATA ORIGEM INFORMAÇÃO";"ORIGEM INFORMAÇÕES";"OBSERVAÇÕES"';
const ceis = (tipo: string, doc: string, categoria: string, inicio: string, fim: string, abrangencia: string, esfera = 'MUNICIPAL') =>
  `"CEIS";"1";"${tipo}";"${doc}";"Empresa X";"Empresa X";"";"";"P-1";"${categoria}";"${inicio}";"${fim}";"${inicio}";"DOE";"";"";"${abrangencia}";"Prefeitura de Exemplo";"SP";"${esfera}";"LEI 14133 - ART. 156, III; texto com ""aspas""";"01/11/2026";"Prefeitura";""`;
const cabecalhoCnep = '"CADASTRO";"CÓDIGO DA SANÇÃO";"TIPO DE PESSOA";"CPF OU CNPJ DO SANCIONADO";"NOME DO SANCIONADO";"NOME INFORMADO PELO ÓRGÃO SANCIONADOR";"RAZÃO SOCIAL - CADASTRO RECEITA";"NOME FANTASIA - CADASTRO RECEITA";"NÚMERO DO PROCESSO";"CATEGORIA DA SANÇÃO";"VALOR DA MULTA";"DATA INÍCIO SANÇÃO";"DATA FINAL SANÇÃO";"DATA PUBLICAÇÃO";"PUBLICAÇÃO";"DETALHAMENTO DO MEIO DE PUBLICAÇÃO";"DATA DO TRÂNSITO EM JULGADO";"ABRAGÊNCIA DA SANÇÃO";"ÓRGÃO SANCIONADOR";"UF ÓRGÃO SANCIONADOR";"ESFERA ÓRGÃO SANCIONADOR";"FUNDAMENTAÇÃO LEGAL";"DATA ORIGEM INFORMAÇÃO";"ORIGEM INFORMAÇÕES";"OBSERVAÇÕES"';
const cnep = '"CNEP";"7";"J";"11222333000144";"Empresa Y";"Empresa Y";"Empresa Y";"";"PAR-1";"Multa";"36680,49";"01/07/2022";"";"01/07/2022";"DOU";"";"";"Todas as Esferas em todos os Poderes";"Ministério de Exemplo";"";"FEDERAL";"LEI 12846 - ART. 6º, I";"07/07/2022";"CGU";""';

test('lê o CEIS e o CNEP pelo nome das colunas: só pessoa jurídica, datas em AAAA-MM-DD e a raiz do CNPJ', () => {
  const texto = [cabecalhoCeis,
    ceis('J', '01234567000189', 'Impedimento/proibição de contratar com prazo determinado', '07/04/2026', '07/04/2029', 'Em todos os Poderes da Esfera do órgão sancionador'),
    ceis('F', '12345678901', 'Suspensão', '01/01/2026', '01/01/2027', 'No órgão sancionador'),
    ''].join('\r\n');
  assert.deepEqual(lerSancoes(texto), [{
    cadastro: 'CEIS', codigo: '1', cnpj: '01234567000189', cnpjBasico: '01234567', nome: 'Empresa X', processo: 'P-1',
    categoria: 'Impedimento/proibição de contratar com prazo determinado', impedeContratar: true, alcance: 'Esfera do órgão',
    inicio: '2026-04-07', fim: '2029-04-07', orgao: 'Prefeitura de Exemplo', ufOrgao: 'SP', esfera: 'Municipal',
    fundamentacao: 'LEI 14133 - ART. 156, III; texto com "aspas"',
  }], 'a pessoa física fica de fora: o cruzamento é com empresas');
  const [multa] = lerSancoes(`${cabecalhoCnep}\n${cnep}`);
  assert.equal(multa.cadastro, 'CNEP');
  assert.equal(multa.fim, null, 'sem data final, a sanção não tem prazo');
  assert.equal(multa.impedeContratar, false, 'multa da Lei Anticorrupção não impede contratar');
  assert.equal(multa.esfera, 'Federal');
  assert.throws(() => lerSancoes('"CADASTRO";"NOME"\n"CEIS";"X"'), /CPF OU CNPJ DO SANCIONADO/);
});

test('o que impede contratar e onde: inidoneidade vale em todas as esferas, mesmo quando a abrangência veio sem informação', () => {
  const linha = (categoria: string, abrangencia: string) => lerSancoes(`${cabecalhoCeis}\n${ceis('J', '01234567000189', categoria, '01/01/2026', '', abrangencia)}`)[0];
  assert.deepEqual([linha('Declaração de Inidoneidade sem prazo determinado', 'Sem Informação')].map(s => [s.impedeContratar, s.alcance]), [[true, 'Todas as esferas']]);
  assert.deepEqual([linha('Suspensão', 'No órgão sancionador')].map(s => [s.impedeContratar, s.alcance]), [[true, 'Só o órgão']]);
  assert.deepEqual([linha('Suspensão/Interdição das atividades com prazo determinado', 'Sem Informação')].map(s => [s.impedeContratar, s.alcance]), [[false, 'Sem informação']]);
  assert.deepEqual([linha('Impedimento/proibição de contratar sem prazo determinado', 'Todas as Esferas em todos os Poderes')].map(s => [s.impedeContratar, s.alcance]), [[true, 'Todas as esferas']]);
  assert.deepEqual([linha('Impedimento/proibição de contratar com prazo determinado', 'Na Esfera e no Poder do órgão sancionador')].map(s => s.alcance), ['Esfera do órgão']);
});

test('vigente na data: começou até a data e não terminou antes dela; sem data final, segue vigente', () => {
  const texto = [cabecalhoCeis,
    ceis('J', '01234567000189', 'Suspensão', '01/01/2025', '31/12/2025', 'No órgão sancionador'),
    ceis('J', '01234567000270', 'Suspensão', '01/01/2026', '07/11/2026', 'No órgão sancionador'),
    ceis('J', '99888777000166', 'Declaração de Inidoneidade sem prazo determinado', '01/03/2020', '', 'Sem Informação'),
    ceis('J', '55444333000122', 'Suspensão', '08/11/2026', '08/11/2027', 'No órgão sancionador')].join('\n');
  assert.deepEqual(vigentes(lerSancoes(texto), '2026-11-07').map(s => s.cnpj), ['01234567000270', '99888777000166']);
});

test('a linha de staging segue as colunas do contrato e grava os valores em texto', () => {
  const [s] = lerSancoes(`${cabecalhoCnep}\n${cnep}`);
  assert.deepEqual(colunasStagingSancoes.colunas, ['data_arquivo', 'cadastro', 'codigo', 'cnpj', 'cnpj_basico', 'nome', 'categoria', 'impede_contratar', 'alcance', 'inicio', 'fim', 'orgao', 'uf_orgao', 'esfera', 'processo', 'fundamentacao']);
  assert.deepEqual(linhaStaging('2026-11-06', s), ['2026-11-06', 'CNEP', '7', '11222333000144', '11222333', 'Empresa Y', 'Multa', 'Não', 'Todas as esferas', '2022-07-01', '', 'Ministério de Exemplo', '', 'Federal', 'PAR-1', 'LEI 12846 - ART. 6º, I']);
});

test('o contrato SQL do cruzamento descreve as colunas e os valores que o coletor grava no staging', () => {
  const sql = readFileSync(join(import.meta.dirname, '..', 'integrations', 'sql', 'sancoes-x-cadastro.sql'), 'utf8');
  const trecho = sql.match(/stg\.cgu_sancao\s+<- sancoes-pj\.csv[^\n]*\n--\s+\(([^)]*)\)/);
  assert.ok(trecho, 'o SQL descreve a carga de stg.cgu_sancao');
  assert.deepEqual(trecho[1].split(',').map(c => c.trim()), [...colunasStagingSancoes.colunas]);
  const gravados = new Set(['Sim', 'Não', 'Todas as esferas', 'Esfera do órgão', 'Só o órgão', 'Sem informação', 'CEIS', 'CNEP', 'Federal', 'Estadual', 'Municipal']);
  const filtrados = [...sql.replace(/^--.*$/gm, '').matchAll(/(?:impede_contratar|alcance|cadastro|esfera)\s*(?:=|<>|IN\s*\()\s*'([^']*)'/g)].map(m => m[1]);
  assert.ok(filtrados.length >= 2, 'o SQL filtra por algum valor gravado');
  for (const v of filtrados) assert.ok(gravados.has(v), `valor filtrado no SQL que o coletor não grava: ${v}`);
});
