import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv';
import type { Modelo } from '../src/powerbi/modelo.ts';

/*
 * Conferências comuns aos pacotes Power BI de todos os painéis (os testes `powerbi-<painel>.test.ts` as chamam):
 * (1) cada JSON vale pelo schema oficial da Microsoft (baixado em tests/fixtures/powerbi-schemas); (2) toda medida e todo visual
 * apontam para tabelas, colunas e medidas que existem; e a leitura dos CSV, para refazer os cartões pela regra das medidas DAX.
 */
type Pacote = Map<string, string>;

export const arquivoDe = (pacote: Pacote) => (caminho: string) => { const texto = pacote.get(caminho); assert.ok(texto !== undefined, `falta ${caminho}`); return texto; };

/** Valida cada JSON do pacote pelo schema oficial (e o tema pelo schema de tema). Devolve quantos arquivos conferiu. */
export function conferirSchemas(pacote: Pacote): number {
  const ajv = new Ajv({ strict: false, allErrors: true });
  const raiz = join(import.meta.dirname, 'fixtures/powerbi-schemas');
  const varrer = (pasta: string): string[] => readdirSync(pasta).flatMap(nome => { const caminho = join(pasta, nome); return statSync(caminho).isDirectory() ? varrer(caminho) : [caminho]; });
  // O $id de alguns schemas diz "schema.embedded.json" e o $ref aponta para "schema-embedded.json": vale o caminho do arquivo.
  for (const caminho of varrer(join(raiz, 'fabric'))) ajv.addSchema({ ...JSON.parse(readFileSync(caminho, 'utf8')), $id: `https://developer.microsoft.com/json-schemas/${caminho.slice(raiz.length + 1).replaceAll('\\', '/')}` });
  const tema = new Ajv({ strict: false, allErrors: true, validateSchema: false }).compile(JSON.parse(readFileSync(join(raiz, 'tema/reportThemeSchema-2.159.json'), 'utf8')));
  let conferidos = 0;
  for (const [caminho, texto] of pacote) {
    if (texto.charCodeAt(0) === 0xfeff) assert.fail(`${caminho} começa com BOM`);
    if (!caminho.endsWith('.json') && !caminho.endsWith('.pbir') && !caminho.endsWith('.pbism') && !caminho.endsWith('.pbip')) continue;
    const json = JSON.parse(texto);
    if (caminho.includes('/RegisteredResources/') && !json.$schema?.includes('json-schemas/fabric')) { assert.ok(tema(json), `${caminho}: ${ajv.errorsText(tema.errors)}`); conferidos++; continue; }
    if (caminho.startsWith('dados/') || caminho.startsWith('mapas/')) continue;
    const validar = ajv.getSchema(json.$schema); assert.ok(validar, `${caminho}: schema ${json.$schema} não baixado`);
    assert.ok(validar(json), `${caminho}: ${ajv.errorsText(validar.errors)}`); conferidos++;
  }
  return conferidos;
}

/** Nomes de pasta de página e visual só com [A-Za-z0-9_-]: fora disso o Desktop ignora a pasta sem avisar. */
export function conferirNomesDePasta(pacote: Pacote, nome: string) {
  const padrao = new RegExp(`^${nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.Report/definition/pages/([^/]+)/(?:visuals/([^/]+)/)?`);
  for (const caminho of pacote.keys()) { const match = caminho.match(padrao); if (match) for (const parte of match.slice(1)) if (parte) assert.match(parte, /^[A-Za-z0-9_-]{1,50}$/); }
}

const semAspas = (nome: string) => nome.startsWith("'") ? nome.slice(1, -1).replaceAll("''", "'") : nome;
/** As tabelas, colunas e medidas do modelo, lidas dos arquivos TMDL. */
export function modeloDoPacote(pacote: Pacote, nome: string) {
  const tmdl = [...pacote].filter(([caminho]) => caminho.startsWith(`${nome}.SemanticModel/definition/tables/`));
  const colunas = new Map<string, Set<string>>(), medidas = new Set<string>();
  for (const [, texto] of tmdl) {
    const tabela = semAspas(texto.match(/^table ('(?:[^']|'')+'|\S+)/m)![1]);
    colunas.set(tabela, new Set([...texto.matchAll(/^\tcolumn ('(?:[^']|'')+'|\S+)/gm)].map(match => semAspas(match[1]))));
    for (const match of texto.matchAll(/^\tmeasure ('(?:[^']|'')+'|\S+)/gm)) medidas.add(semAspas(match[1]));
  }
  return { tmdl, colunas, medidas };
}

/** Cada Tabela[Coluna] e cada [Medida] citados no DAX existem no modelo. */
export function conferirReferenciasDax(pacote: Pacote, nome: string) {
  const { tmdl, colunas, medidas } = modeloDoPacote(pacote, nome);
  for (const [caminho, texto] of tmdl) for (const bloco of texto.split(/\r\n\tmeasure /).slice(1)) {
    const dax = bloco.split(/\r\n\t\t(?:formatString|displayFolder|lineageTag):/)[0];
    for (const match of dax.matchAll(/'((?:[^']|'')+)'\[([^\]]+)\]|\b([A-Za-z_][\w]*)\[([^\]]+)\]/g)) {
      const tabela = (match[1] ?? match[3]).replaceAll("''", "'"), coluna = match[2] ?? match[4];
      assert.ok(colunas.get(tabela)?.has(coluna), `${caminho}: ${tabela}[${coluna}] não existe`);
    }
    // Colunas que a própria medida cria (ADDCOLUMNS(..., "Nome", ...)) também valem como [Nome].
    const criadas = new Set([...dax.matchAll(/,\s*"([^"]+)",/g)].map(match => match[1]));
    for (const match of dax.matchAll(/(?<![\w'\]])\[([^\]]+)\]/g)) assert.ok(medidas.has(match[1]) || criadas.has(match[1]), `${caminho}: medida [${match[1]}] não existe (${bloco.slice(0, 40)})`);
  }
  return medidas.size;
}

/** Todo campo de visual aponta para uma coluna ou medida do modelo. Devolve quantos campos conferiu. */
export function conferirCamposDosVisuais(pacote: Pacote, nome: string): number {
  const { colunas, medidas } = modeloDoPacote(pacote, nome);
  let campos = 0;
  for (const [caminho, texto] of pacote) {
    if (!caminho.endsWith('/visual.json')) continue;
    const visual = JSON.parse(texto).visual;
    for (const papel of Object.values<{ projections: { field: Record<string, { Expression: { SourceRef: { Entity: string } }; Property: string }> }[] }>(visual.query?.queryState ?? {}))
      for (const { field } of papel.projections) {
        const [tipo, alvo] = Object.entries(field)[0];
        if (tipo === 'Measure') assert.ok(medidas.has(alvo.Property), `${caminho}: medida ${alvo.Property}`);
        else assert.ok(colunas.get(alvo.Expression.SourceRef.Entity)?.has(alvo.Property), `${caminho}: coluna ${alvo.Expression.SourceRef.Entity}[${alvo.Property}]`);
        campos++;
      }
  }
  return campos;
}

/** O texto DAX de uma medida, até o formatString. */
export const daxDe = (pacote: Pacote, nome: string) => (medida: string) => {
  const texto = arquivoDe(pacote)(`${nome}.SemanticModel/definition/tables/Medidas.tmdl`), inicio = texto.indexOf(`measure '${medida}' =`);
  assert.ok(inicio >= 0, medida); return texto.slice(inicio, texto.indexOf('\r\n\t\tformatString', inicio));
};

/** Lê um CSV do pacote como linhas de { coluna: texto }. */
export const leitorCsv = (pacote: Pacote) => (caminho: string): Record<string, string>[] => {
  const [cabecalho, ...linhas] = arquivoDe(pacote)(caminho).replace(/\r?\n$/, '').split(/\r?\n/).map(linha => [...linha.matchAll(/("(?:[^"]|"")*"|[^;]*)(?:;|$)/g)].map(match => match[1].startsWith('"') ? match[1].slice(1, -1).replaceAll('""', '"') : match[1]).slice(0, -1));
  return linhas.map(linha => Object.fromEntries(cabecalho.map((nome, i) => [nome, linha[i] ?? ''])));
};
export const numero = (valor: string) => Number(valor.replace(',', '.'));
export const soma = (rows: Record<string, string>[], coluna: string) => rows.reduce((total, row) => total + numero(row[coluna]), 0);
/** Início do período como a medida DAX escreve: DATE(YEAR(D), MONTH(D) - meses + 1, 1). */
export const inicio = (d: string, meses: number) => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - meses, 1)).toISOString().slice(0, 10);
export const noPeriodo = (data: string, d: string, meses: number) => data >= inicio(d, meses) && data <= d;
/** EOMONTH(d, -12): o último dia do mesmo mês um ano antes, a data que a medida de variação lê. */
export const fimDoMesUmAnoAntes = (d: string) => new Date(Date.UTC(Number(d.slice(0, 4)) - 1, Number(d.slice(5, 7)), 0)).toISOString().slice(0, 10);

/**
 * O lado "um" de cada relação precisa de chave única no CSV: com chave repetida, o Power BI recusa a relação ao atualizar
 * (ou a cria como muitos para muitos, e os filtros deixam de valer).
 */
export function conferirChavesUnicas(pacote: Pacote, modelo: Modelo) {
  // Chave do lado "muitos" sem par no lado "um" é permitida: cai na linha em branco (como os estabelecimentos abertos antes do calendário).
  const lerCsv = leitorCsv(pacote), arquivoDaTabela = new Map(modelo.tabelas.map(tabela => [tabela.nome, tabela.arquivo]));
  for (const { de, para } of modelo.relacoes) {
    const arquivo = arquivoDaTabela.get(para[0]); assert.ok(arquivo, `${para[0]} sem CSV`);
    const chaves = lerCsv(`dados/${arquivo}`).map(row => row[para[1]]), unicas = new Set(chaves);
    assert.equal(unicas.size, chaves.length, `${para[0]}[${para[1]}] tem chave repetida (relação de ${de[0]})`);
  }
}
