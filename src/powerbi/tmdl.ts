import type { Coluna, Medida, Modelo, Tabela, TipoColuna } from './modelo';

/**
 * Arquivos TMDL de um modelo (a pasta `<Nome>.SemanticModel/` do PBIP), com os caminhos relativos a ela.
 * Regras da documentação TMDL (docs/pesquisa/powerbi-pbip.md, seções 2 e 7): UTF-8 sem BOM, CRLF, um TAB por nível,
 * nome fora de [A-Za-z0-9_] entre aspas simples, expressão multilinha entre três crases. O `lineageTag` é derivado do
 * nome do objeto, então gerar de novo não muda nada.
 */
export function modeloTmdl(modelo: Modelo): Map<string, string> {
  const arquivos = new Map<string, string>();
  const tag = (...partes: string[]) => guid(modelo.nome, ...partes);
  arquivos.set('definition.pbism', `${JSON.stringify({ $schema: 'https://developer.microsoft.com/json-schemas/fabric/item/semanticModel/definitionProperties/1.0.0/schema.json', version: '4.0', settings: {} }, null, 2)}\n`);
  arquivos.set('definition/database.tmdl', texto(['database', '\tcompatibilityLevel: 1567']));
  arquivos.set('definition/model.tmdl', texto([
    'model Model', '\tculture: pt-BR', '\tdefaultPowerBIDataSourceVersion: powerBI_V3', '\tsourceQueryCulture: pt-BR',
    '\tdataAccessOptions', '\t\tlegacyRedirects', '\t\treturnErrorValuesAsNull', '',
    'annotation __PBI_TimeIntelligenceEnabled = 0', '',
    ...modelo.tabelas.map(tabela => `ref table ${nome(tabela.nome)}`),
  ]));
  arquivos.set('definition/expressions.tmdl', texto(modelo.parametros.flatMap(parametro => [
    ...descricao(parametro.descricao, ''),
    `expression ${nome(parametro.nome)} = "${parametro.valor.replaceAll('"', '""')}" meta [IsParameterQuery=true, Type="Text", IsParameterQueryRequired=true]`,
    `\tlineageTag: ${tag('parametro', parametro.nome)}`, '',
  ])));
  arquivos.set('definition/relationships.tmdl', texto(modelo.relacoes.flatMap(relacao => [
    `relationship ${tag('relacao', ...relacao.de, ...relacao.para)}`,
    ...(relacao.ambasDirecoes ? ['\tcrossFilteringBehavior: bothDirections'] : []),
    ...(relacao.inativa ? ['\tisActive: false'] : []),
    `\tfromColumn: ${nome(relacao.de[0])}.${nome(relacao.de[1])}`,
    `\ttoColumn: ${nome(relacao.para[0])}.${nome(relacao.para[1])}`, '',
  ])));
  for (const tabela of modelo.tabelas) arquivos.set(`definition/tables/${tabela.nome}.tmdl`, texto(linhasTabela(tabela, tag, modelo.parametros[0]?.nome)));
  return arquivos;
}

function linhasTabela(tabela: Tabela, tag: (...partes: string[]) => string, pasta?: string): string[] {
  const linhas = [...descricao(tabela.descricao, ''), `table ${nome(tabela.nome)}`, ...(tabela.oculta ? ['\tisHidden'] : []), `\tlineageTag: ${tag('tabela', tabela.nome)}`, ''];
  for (const medida of tabela.medidas ?? []) linhas.push(...linhasMedida(medida, tag(tabela.nome, 'medida', medida.nome)), '');
  for (const coluna of tabela.colunas) linhas.push(...linhasColuna(coluna, tag(tabela.nome, 'coluna', coluna.nome)), '');
  if (tabela.calculada) linhas.push(`\tpartition ${nome(tabela.nome)} = calculated`, '\t\tmode: import', `\t\tsource = ${tabela.calculada}`);
  else linhas.push(`\tpartition ${nome(tabela.nome)} = m`, '\t\tmode: import', '\t\tsource =', ...origem(tabela, pasta).map(row => `\t\t\t\t${row}`));
  return linhas;
}

function linhasMedida(medida: Medida, lineageTag: string): string[] {
  const dax = medida.dax.trim().split('\n');
  const declaracao = dax.length === 1 ? [`\tmeasure ${nome(medida.nome)} = ${dax[0]}`] : [`\tmeasure ${nome(medida.nome)} = \`\`\``, ...dax.map(row => `\t\t\t${row}`), '\t\t\t```'];
  return [...descricao(medida.descricao, '\t'), ...declaracao,
    ...(medida.formato ? [`\t\tformatString: ${medida.formato}`] : []), ...(medida.pasta ? [`\t\tdisplayFolder: ${medida.pasta}`] : []), `\t\tlineageTag: ${lineageTag}`];
}

function linhasColuna(coluna: Coluna, lineageTag: string): string[] {
  return [...descricao(coluna.descricao, '\t'), `\tcolumn ${nome(coluna.nome)}`, `\t\tdataType: ${coluna.tipo}`,
    ...(coluna.formato ? [`\t\tformatString: ${coluna.formato}`] : []), ...(coluna.oculta ? ['\t\tisHidden'] : []),
    `\t\tsummarizeBy: ${coluna.somar ? 'sum' : 'none'}`, `\t\tsourceColumn: ${coluna.origem ?? coluna.nome}`,
    ...(coluna.ordenarPor ? [`\t\tsortByColumn: ${nome(coluna.ordenarPor)}`] : []), `\t\tlineageTag: ${lineageTag}`,
    // Os arquivos salvos pelo Desktop marcam assim a coluna de um parâmetro de intervalo numérico; a documentação não descreve.
    ...(coluna.parametro ? ['', '\t\textendedProperty ParameterMetadata =', '\t\t\t\t{', '\t\t\t\t  "version": 0', '\t\t\t\t}'] : [])];
}

const tipoM: Record<TipoColuna, string> = { string: 'type text', int64: 'Int64.Type', double: 'type number', dateTime: 'type date', boolean: 'type logical' };

/** Expressão M da partição: o CSV da pasta do parâmetro, ou uma tabela vazia de uma coluna para a tabela que só guarda medidas. */
function origem(tabela: Tabela, pasta?: string): string[] {
  if (!tabela.arquivo || !pasta) return ['let', `    Fonte = #table(type table [${tabela.colunas.map(coluna => `#"${m(coluna.nome)}" = ${tipoM[coluna.tipo]}`).join(', ')}], {})`, 'in', '    Fonte'];
  const tipos = tabela.colunas.map(coluna => `{"${m(coluna.nome)}", ${tipoM[coluna.tipo]}}`).join(', ');
  return ['let',
    `    Fonte = Csv.Document(File.Contents(#"${m(pasta)}" & "${m(tabela.arquivo)}"), [Delimiter = ";", Encoding = 65001, QuoteStyle = QuoteStyle.Csv]),`,
    '    Cabecalhos = Table.PromoteHeaders(Fonte, [PromoteAllScalars = true]),',
    `    Tipos = Table.TransformColumnTypes(Cabecalhos, {${tipos}}, "pt-BR")`,
    'in', '    Tipos'];
}

/** Texto dentro de aspas duplas em M: a aspa interna é dobrada. */
const m = (valor: string) => valor.replaceAll('"', '""');
const descricao = (texto: string | undefined, recuo: string) => texto ? texto.split('\n').map(row => `${recuo}/// ${row}`) : [];
/** Nome de objeto TMDL: entre aspas simples quando foge de [A-Za-z0-9_] (acentos, espaço, ponto), com a aspa interna dobrada. */
export const nome = (valor: string) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(valor) ? valor : `'${valor.replaceAll("'", "''")}'`;
const texto = (linhas: string[]) => `${linhas.join('\r\n').replace(/(\r\n)+$/, '')}\r\n`;
/** GUID determinístico a partir de um nome, no formato de um UUID: quatro FNV-1a de 32 bits com sementes diferentes (não é um UUID v5 de verdade, que usa SHA-1). Roda no Node e no navegador. */
export function guid(...partes: string[]): string {
  const texto = partes.join('\u0000');
  const fnv = (semente: number) => { let h = semente >>> 0; for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
  const hex = [0x811c9dc5, 0x050c5d1f, 0x2b5a8f3d, 0x6c62272e].map(fnv).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${hex.slice(18, 20)}-${hex.slice(20, 32)}`;
}
