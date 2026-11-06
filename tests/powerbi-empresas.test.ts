import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv';
import { dataset } from '../src/domain/dataset.ts';
import { datasetAt, fiscalizacaoAt } from '../src/domain/tempo.ts';
import { defaultFilters } from '../src/domain/types.ts';
import { selectEnterpriseScope } from '../src/enterprise-v10/filters.ts';
import { buildEnterpriseModel } from '../src/enterprise-v10/model.ts';
import { buildFiscalizacao } from '../src/painel/fiscalizacao.ts';
import { buildProfissionais } from '../src/domain/profissionais.ts';
import { cobertura, contagens } from '../src/observatorio/norte.ts';
import { artPorCamara, artsPeriodo, entradasSaidas, pagamento, primeirasEntradas } from '../src/cockpit/medidas.ts';
import { cadastroIncompleto, primeirosRegistros, ritmoEconomico } from '../src/domain/empresas.ts';
import { aberturasRfb, permanenciaCoorte } from '../src/domain/mercado.ts';
import { janela, mesesDaJanela, quadroTecnico } from '../src/painel/analise.ts';
import { pacotePowerBi } from '../src/powerbi/pacote.ts';

/*
 * O pacote Power BI do painel de Empresas, testado pela sua única entrada (`pacotePowerBi`): os arquivos que o Power BI Desktop abre.
 * Três conferências: (1) cada JSON vale pelo schema oficial da Microsoft (baixado em tests/fixtures/powerbi-schemas); (2) toda medida
 * e todo visual apontam para tabelas, colunas e medidas que existem; (3) os cartões, calculados a partir dos CSV pela mesma regra que
 * a medida DAX escreve, dão os números que o painel mostra (as funções do protótipo são a fonte da verdade).
 */
const pacote = pacotePowerBi('empresas', dataset);
const arquivo = (caminho: string) => { const texto = pacote.get(caminho); assert.ok(texto !== undefined, `falta ${caminho}`); return texto; };

test('pacote: projeto PBIP com modelo, relatório de quatro páginas, tema, dados e instruções', () => {
  for (const caminho of ['Empresas.pbip', 'LEIA-ME.md', 'Empresas.Report/definition.pbir', 'Empresas.Report/definition/report.json', 'Empresas.Report/definition/version.json',
    'Empresas.Report/definition/pages/pages.json', 'Empresas.SemanticModel/definition.pbism', 'Empresas.SemanticModel/definition/model.tmdl', '.gitignore']) arquivo(caminho);
  const paginas = JSON.parse(arquivo('Empresas.Report/definition/pages/pages.json')).pageOrder;
  assert.deepEqual(paginas, ['registro', 'evolucao', 'rt-art', 'vinculos']);
  for (const pagina of paginas) assert.ok(JSON.parse(arquivo(`Empresas.Report/definition/pages/${pagina}/page.json`)).displayName);
  assert.ok([...pacote.keys()].some(caminho => caminho.startsWith('Empresas.Report/StaticResources/RegisteredResources/') && caminho.endsWith('.json')), 'tema registrado');
  // Nomes de pasta de página e visual só com [A-Za-z0-9_-]: fora disso o Desktop ignora a pasta sem avisar.
  for (const caminho of pacote.keys()) { const match = caminho.match(/^Empresas\.Report\/definition\/pages\/([^/]+)\/(?:visuals\/([^/]+)\/)?/); if (match) for (const parte of match.slice(1)) if (parte) assert.match(parte, /^[A-Za-z0-9_-]{1,50}$/); }
});

test('pacote: todo JSON do projeto vale pelo schema oficial da Microsoft, e o tema pelo schema de tema', () => {
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
  assert.ok(conferidos > 30, `só ${conferidos} arquivos conferidos`);
});

/* ---------- referências: medidas e visuais só apontam para o que existe ---------- */
const tmdl = [...pacote].filter(([caminho]) => caminho.startsWith('Empresas.SemanticModel/definition/tables/'));
const semAspas = (nome: string) => nome.startsWith("'") ? nome.slice(1, -1).replaceAll("''", "'") : nome;
const colunas = new Map<string, Set<string>>(), medidas = new Set<string>();
for (const [, texto] of tmdl) {
  const tabela = semAspas(texto.match(/^table ('(?:[^']|'')+'|\S+)/m)![1]);
  colunas.set(tabela, new Set([...texto.matchAll(/^\tcolumn ('(?:[^']|'')+'|\S+)/gm)].map(match => semAspas(match[1]))));
  for (const match of texto.matchAll(/^\tmeasure ('(?:[^']|'')+'|\S+)/gm)) medidas.add(semAspas(match[1]));
}

test('referências: cada Tabela[Coluna] e cada [Medida] citados no DAX existem no modelo', () => {
  assert.ok(medidas.size >= 30, `só ${medidas.size} medidas`);
  for (const [caminho, texto] of tmdl) for (const bloco of texto.split(/\r\n\tmeasure /).slice(1)) {
    const dax = bloco.split(/\r\n\t\t(?:formatString|displayFolder|lineageTag):/)[0];
    for (const match of dax.matchAll(/'((?:[^']|'')+)'\[([^\]]+)\]|\b([A-Za-z_][\w]*)\[([^\]]+)\]/g)) {
      const tabela = (match[1] ?? match[3]).replaceAll("''", "'"), coluna = match[2] ?? match[4];
      assert.ok(colunas.get(tabela)?.has(coluna), `${caminho}: ${tabela}[${coluna}] não existe`);
    }
    for (const match of dax.matchAll(/(?<![\w'\]])\[([^\]]+)\]/g)) assert.ok(medidas.has(match[1]), `${caminho}: medida [${match[1]}] não existe (${bloco.slice(0, 40)})`);
  }
});

test('referências: todo campo de visual aponta para uma coluna ou medida do modelo', () => {
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
  assert.ok(campos >= 40, `só ${campos} campos em visuais`);
});

test('cartões: cada cartão mostra a variação em um ano, menos o cadastro incompleto, e a data um ano antes tem foto', () => {
  for (const pagina of ['registro', 'evolucao', 'rt-art']) for (let i = 1; i <= 5; i++) {
    const visual = JSON.parse(arquivo(`Empresas.Report/definition/pages/${pagina}/visuals/${pagina}-cartao-${i}/visual.json`)).visual;
    const valores = visual.query.queryState.Values.projections as { field: { Measure: { Property: string } }; displayName?: string }[];
    assert.equal(visual.visualType, 'multiRowCard');
    if (valores[0].field.Measure.Property === 'Registradas com cadastro incompleto') { assert.equal(valores.length, 1); continue; }
    assert.equal(valores[1].field.Measure.Property, `Variação em um ano: ${valores[0].field.Measure.Property}`);
    assert.match(valores[1].displayName ?? '', /em relação a um ano antes$/);
  }
  // EOMONTH(data, -12) de cada data que se pode escolher precisa estar na tabela oculta de datas das fotos.
  const fotos = new Set(lerCsv('dados/datas-das-fotos.csv').map(row => row.Data));
  for (const { Data: d } of lerCsv('dados/datas-referencia.csv')) {
    const alvo = new Date(Date.UTC(Number(d.slice(0, 4)) - 1, Number(d.slice(5, 7)), 0)).toISOString().slice(0, 10);
    assert.ok(fotos.has(alvo), `${d}: falta a foto de ${alvo}`);
  }
});

/* ---------- os cartões a partir dos CSV ---------- */
function lerCsv(caminho: string): Record<string, string>[] {
  const [cabecalho, ...linhas] = arquivo(caminho).replace(/\r?\n$/, '').split(/\r?\n/).map(linha => [...linha.matchAll(/("(?:[^"]|"")*"|[^;]*)(?:;|$)/g)].map(match => match[1].startsWith('"') ? match[1].slice(1, -1).replaceAll('""', '"') : match[1]).slice(0, -1));
  return linhas.map(linha => Object.fromEntries(cabecalho.map((nome, i) => [nome, linha[i] ?? ''])));
}
const numero = (valor: string) => Number(valor.replace(',', '.'));
const fotoEmpresas = lerCsv('dados/foto-empresas.csv'), fotoEstab = lerCsv('dados/foto-estabelecimentos.csv'), estab = lerCsv('dados/estabelecimentos.csv');
const movimentos = lerCsv('dados/entradas-saidas.csv'), arts = lerCsv('dados/arts.csv'), emprego = lerCsv('dados/emprego.csv');
const classeDe = new Map(estab.map(row => [row.Estabelecimento, row.Classe]));
const soma = (rows: Record<string, string>[], coluna: string) => rows.reduce((total, row) => total + numero(row[coluna]), 0);
/** Início do período como a medida DAX escreve: DATE(YEAR(D), MONTH(D) - meses + 1, 1). */
const inicio = (d: string, meses: number) => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - meses, 1)).toISOString().slice(0, 10);
const noPeriodo = (data: string, d: string, meses: number) => data >= inicio(d, meses) && data <= d;
/** EDATE(data, -12) do DAX: o mesmo dia um ano antes, ou o último dia do mês quando ele não existe. */
const umAnoAntes = (data: string) => { const ano = Number(data.slice(0, 4)) - 1, mes = Number(data.slice(5, 7)), ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate(); return `${ano}-${data.slice(5, 7)}-${String(Math.min(Number(data.slice(8, 10)), ultimo)).padStart(2, '0')}`; };

/** Os cartões como o CSV e a regra da medida DAX os dão (espelho das medidas de src/powerbi/empresas/modelo.ts). */
function cartoesDoPacote(d: string, meses: number) {
  const foto = fotoEmpresas.filter(row => row.Data === d), registradas = foto.filter(row => row.Registrada === '1');
  const fe = fotoEstab.filter(row => row.Data === d), mercado = fe.filter(row => row['No mercado'] === '1');
  const vigente = (rows: typeof fe) => rows.filter(row => row['Situação no cadastro'] === 'Com registro ou visto').length;
  const obrigatorio = mercado.filter(row => classeDe.get(row.Estabelecimento) === 'Registro obrigatório');
  const artsPeriodo = arts.filter(row => noPeriodo(row.Data, d, meses));
  const anteriores = arts.filter(row => row.Data >= umAnoAntes(inicio(d, meses)) && row.Data <= umAnoAntes(d));
  const comArt = new Set(artsPeriodo.map(row => row.Empresa));
  const mov = movimentos.filter(row => noPeriodo(row.Mês, d, meses)), entradas = mov.filter(row => row.Movimento === 'Entrada');
  const registroAtivo = new Set(fe.filter(row => row['Registro ativo'] === '1').map(row => row.Estabelecimento));
  const abertas = estab.filter(row => row.Classe && noPeriodo(row['Aberto em'], d, meses));
  const coorte = foto.filter(row => row['Registrada 12 meses antes'] === '1');
  return {
    registradas: registradas.length, estabelecimentos: soma(foto, 'Estabelecimentos registrados'), vistos: soma(foto, 'Vistos'),
    cobertura: vigente(mercado) / mercado.length * 100, coberturaObrigatoria: vigente(obrigatorio) / obrigatorio.length * 100,
    semRegistro: obrigatorio.filter(row => row['Situação no cadastro'] === 'Nunca apareceu no cadastro').length,
    emDia: registradas.filter(row => row['Anuidade vencida'] === '0').length / registradas.length * 100, inadimplentes: registradas.filter(row => row['Anuidade vencida'] === '1').length,
    incompleto: registradas.filter(row => row['Cadastro incompleto'] === '1').length,
    entradas: entradas.length, primeiras: entradas.filter(row => row['Primeira vez'] === '1').length, viaFiscalizacao: entradas.filter(row => row['Após fiscalização'] === '1').length,
    saidas: mov.filter(row => row.Movimento === 'Saída').length,
    abertas: abertas.length, abertasComRegistro: abertas.filter(row => registroAtivo.has(row.Estabelecimento)).length,
    permanencia: coorte.filter(row => row['Continua registrada'] === '1').length / coorte.length * 100, coorte: coorte.length,
    emprego: soma(emprego.filter(row => row.Mês === `${d.slice(0, 7)}-01`), 'Empregados'),
    comRt: registradas.filter(row => row['Com RT'] === '1').length / registradas.length * 100, rtSaiu: registradas.filter(row => row['RT saiu sem substituto'] === '1').length,
    arts: artsPeriodo.length, artsAntes: anteriores.length, valorArt: Math.round(soma(artsPeriodo, 'Valor')), valorAntes: Math.round(soma(anteriores, 'Valor')),
    semArt: registradas.filter(row => !comArt.has(row.Empresa)).length / registradas.length * 100,
  };
}

/** Os mesmos cartões pelas funções do protótipo, como as páginas do painel de Empresas os calculam. */
const fBase = buildFiscalizacao(dataset);
function cartoesDoPainel(d: string, meses: number) {
  const view = datasetAt(dataset, d), f = fiscalizacaoAt(fBase, d), filtros = { ...defaultFilters, period: meses };
  const scope = selectEnterpriseScope(view, filtros), model = buildEnterpriseModel(scope), history = buildEnterpriseModel(selectEnterpriseScope(view, { ...filtros, period: mesesDaJanela(meses) }));
  const c = cobertura(scope, model), n = contagens(scope, model), pay = pagamento(model), ativas = model.metadata.activeCompanyIds;
  const w = janela(d, meses), rows = entradasSaidas(history, f).filter(row => row.month >= w.start.slice(0, 7) && row.month <= w.end.slice(0, 7));
  const entradas = rows.flatMap(row => [...row.viaFiscalizacao, ...row.demais]), origem = primeirasEntradas(rows, primeirosRegistros(view));
  const a = aberturasRfb(view, null, mesesDaJanela(meses)).meses.slice(-meses), p12 = permanenciaCoorte(view, scope.companyIds, 12);
  const qt = quadroTecnico(scope, model, f, buildProfissionais(view)), art = artsPeriodo(scope, meses), semArt = artPorCamara(view, model);
  return {
    registradas: n.raizes, estabelecimentos: n.estabelecimentos, vistos: n.vistos,
    cobertura: c.taxa!, coberturaObrigatoria: c.taxaSim!, semRegistro: c.porClasse.Sim['Sem correspondência'].length,
    emDia: pay.emDia.length / ativas.length * 100, inadimplentes: pay.inadimplentes.length, incompleto: cadastroIncompleto(scope, model).ids.length,
    entradas: entradas.length, primeiras: origem.primeiras.length, viaFiscalizacao: rows.flatMap(row => row.viaFiscalizacao).length, saidas: rows.flatMap(row => row.saidas).length,
    abertas: a.reduce((total, row) => total + row.aberturas, 0), abertasComRegistro: a.reduce((total, row) => total + row.comRegistro, 0),
    permanencia: p12.taxa!, coorte: p12.coorte.length, emprego: ritmoEconomico(view, null, null, mesesDaJanela(meses)).pontos.at(-1)!.emprego,
    comRt: model.metrics.rtCoverage.value!, rtSaiu: qt.rtBaixado.length,
    arts: art.atual.length, artsAntes: art.antes, valorArt: Math.round(art.valor), valorAntes: Math.round(art.valorAntes),
    semArt: semArt.flatMap(row => row.semArt).length / semArt.reduce((total, row) => total + row.ativas.length, 0) * 100,
  };
}

for (const [d, meses] of [['2026-09-30', 12], ['2026-03-31', 12], ['2025-09-30', 12], ['2026-09-30', 24], ['2026-06-30', 3]] as const) {
  test(`cartões: os CSV com a regra das medidas dão os números do painel em ${d}, período de ${meses} meses`, () => {
    const pacote = cartoesDoPacote(d, meses), painel = cartoesDoPainel(d, meses);
    for (const chave of Object.keys(painel) as (keyof typeof painel)[]) {
      const esperado = painel[chave], obtido = pacote[chave];
      if (Number.isInteger(esperado)) assert.equal(obtido, esperado, chave); else assert.ok(Math.abs(obtido - esperado) < 1e-9, `${chave}: ${obtido} ≠ ${esperado}`);
    }
  });
}
