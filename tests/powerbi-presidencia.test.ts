import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { INDICADORES, recortar } from '../src/domain/presidencia.ts';
import type { RecortePresidencia } from '../src/domain/presidencia.ts';
import { contasPublicadas, ufs } from '../src/domain/publico-pais.ts';
import { modeloPowerBi, pacotePowerBi } from '../src/powerbi/pacote.ts';
import { CARTOES } from '../src/powerbi/presidencia/modelo.ts';
import { datasDaPresidencia, fotosDaPresidencia } from '../src/powerbi/presidencia/dados.ts';
import { arquivoDe, conferirCamposDosVisuais, conferirChavesUnicas, conferirNomesDePasta, conferirReferenciasDax, conferirSchemas, daxDe, fimDoMesUmAnoAntes, leitorCsv, modeloDoPacote, numero } from './powerbi-pacote.ts';

/*
 * O pacote Power BI do painel da Presidência (07/11/2026). Testado pela única entrada (`pacotePowerBi`): os schemas oficiais, as
 * referências do DAX e dos visuais, e a leitura da foto refeita a partir do CSV pela regra que as medidas [Numerador] e
 * [Denominador] escrevem, contra `recortar`, a função que o painel em HTML usa (a fonte da verdade), no estado, numa regional, num
 * município e com uma câmara.
 */
const pacote = pacotePowerBi('presidencia', dataset), arquivo = arquivoDe(pacote), lerCsv = leitorCsv(pacote), dax = daxDe(pacote, 'Presidencia');
const PAGINAS = ['resumo', 'regionais', 'riscos', 'pais'];

test('presidência: projeto PBIP com modelo, relatório com as quatro páginas, tema, dados, mapa e instruções', () => {
  for (const caminho of ['Presidencia.pbip', 'LEIA-ME.md', 'Presidencia.Report/definition.pbir', 'Presidencia.Report/definition/report.json', 'Presidencia.SemanticModel/definition/model.tmdl', 'mapas/sp-municipios.json', '.gitignore']) arquivo(caminho);
  assert.deepEqual(JSON.parse(arquivo('Presidencia.Report/definition/pages/pages.json')).pageOrder, PAGINAS);
  conferirNomesDePasta(pacote, 'Presidencia');
  assert.match(arquivo('LEIA-ME.md'), /C:\\\\CREA-SP\\\\powerbi\\\\presidencia\\\\dados\\\\/);
  assert.match(arquivo('Presidencia.SemanticModel/definition/expressions.tmdl'), /powerbi\\presidencia\\dados/);
  // O TCC do PNCP não entra em painel nenhum (regra do Caio, 07/11/2026).
  assert.ok(![...pacote.keys()].some(caminho => /pncp|tcc/i.test(caminho)));
});

test('presidência: todo JSON vale pelo schema oficial, cada Tabela[Coluna] e [Medida] do DAX existe, e o lado "um" das relações tem chave única', () => {
  assert.ok(conferirSchemas(pacote) > 30);
  assert.ok(conferirReferenciasDax(pacote, 'Presidencia') >= 70);
  assert.ok(conferirCamposDosVisuais(pacote, 'Presidencia') >= 60);
  conferirChavesUnicas(pacote, modeloPowerBi('presidencia'));
  // Nenhuma medida com o nome de uma coluna: o Desktop recusa o nome repetido.
  const { colunas, medidas } = modeloDoPacote(pacote, 'Presidencia'), nomes = new Set([...colunas.values()].flatMap(set => [...set]));
  for (const medida of medidas) assert.ok(!nomes.has(medida), `medida com nome de coluna: ${medida}`);
});

test('cartões: os do painel em cada página, com o título do cartão, a comparação quando o painel tem e a linha de apoio', () => {
  for (const pagina of ['resumo', 'riscos', 'pais'] as const) CARTOES[pagina].forEach((cartao, i) => {
    const visual = JSON.parse(arquivo(`Presidencia.Report/definition/pages/${pagina}/visuals/${pagina}-cartao-${i + 1}/visual.json`)).visual;
    const valores = (visual.query.queryState.Values.projections as { field: { Measure: { Property: string } } }[]).map(row => row.field.Measure.Property);
    assert.equal(visual.visualContainerObjects.title[0].properties.text.expr.Literal.Value, `'${cartao.nome}'`);
    assert.deepEqual(valores, cartao.comparacao ? [cartao.nome, `Comparação: ${cartao.nome}`, `Detalhe: ${cartao.nome}`] : [cartao.nome, `Detalhe: ${cartao.nome}`]);
  });
  // Um cartão por painel no Resumo, com o número principal de cada um.
  assert.deepEqual(CARTOES.resumo.map(row => row.nome), INDICADORES.filter(row => row.principal).map(row => row.nome));
  // Cada data que se pode escolher tem a foto de um ano antes e as 13 da série.
  const fotos = new Set(lerCsv('dados/datas-das-fotos.csv').map(row => row.Data)), { referencia } = datasDaPresidencia(dataset);
  assert.deepEqual(lerCsv('dados/datas-referencia.csv').map(row => row.Data), referencia);
  for (const d of referencia) assert.ok(fotos.has(fimDoMesUmAnoAntes(d)), d);
  assert.equal(fotos.size, 25);
  assert.match(arquivo('Presidencia.SemanticModel/definition/tables/Medidas.tmdl'), /measure Numerador =[^]*?SELECTEDVALUE\('Câmaras'\[Câmara\]\)/);
  assert.match(dax('Parte do mercado registrada'), /'Indicadores'\[Indicador\] = "mercado"/);
});

/*
 * A regra das medidas [Numerador] e [Denominador], escrita em TypeScript sobre o CSV da foto: o nível de cada indicador sai da
 * coluna Leitura; a regional vem do município escolhido ou do filtro; a câmara só vale onde o indicador divide.
 */
const foto = lerCsv('dados/foto.csv'), indicadores = new Map(lerCsv('dados/indicadores.csv').map(row => [row.Indicador, row]));
const municipios = new Map(lerCsv('dados/municipios.csv').map(row => [row['Código IBGE'], row])), nomeGre = new Map(dataset.gres.map(row => [row.id, row.name]));
function lerFoto(d: string, recorte: RecortePresidencia) {
  const cidade = recorte.cityId ? municipios.get(recorte.cityId)! : null, gre = cidade ? cidade.GRE : recorte.greId ? nomeGre.get(recorte.greId)! : '';
  const out = new Map<string, { n: number; d: number }>();
  for (const row of foto) {
    if (row.Data !== d) continue;
    const ind = indicadores.get(row.Indicador)!, forma = ind.Leitura, divide = ind['Divide por câmara'] === '1';
    const nivel = forma === 'Município' ? 'Município' : forma === 'Regional' ? 'Regional' : forma === 'Estado e regional' ? (gre ? 'Regional' : 'Estado') : 'Estado';
    if (row['Nível'] !== nivel) continue;
    if (divide && recorte.camara && row['Câmara'] !== recorte.camara) continue;
    if (nivel === 'Município') {
      // A regional e o município chegam pela relação com os municípios.
      if (cidade && row['Código IBGE'] !== recorte.cityId) continue;
      if (!cidade && gre && municipios.get(row['Código IBGE'])?.GRE !== gre) continue;
    } else if (nivel === 'Regional' && gre && row.GRE !== gre) continue;
    const p = out.get(row.Indicador) ?? { n: 0, d: 0 }; p.n += numero(row.N); p.d += numero(row.D); out.set(row.Indicador, p);
  }
  return out;
}
const perto = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.011, Math.abs(b) * 1e-9);
const fotos = fotosDaPresidencia(dataset), cidadeDaGre2 = [...municipios.values()].find(row => row.GRE === nomeGre.get('GRE2'))!['Código IBGE'];
for (const d of [dataset.snapshotDate, datasDaPresidencia(dataset).referencia[0]]) for (const recorte of [
  { greId: null, cityId: null, camara: null }, { greId: 'GRE2', cityId: null, camara: null }, { greId: 'GRE2', cityId: cidadeDaGre2, camara: null },
  { greId: null, cityId: null, camara: 'Civil' }, { greId: 'GRE5', cityId: null, camara: 'Elétrica' },
] as RecortePresidencia[]) {
  test(`foto: as medidas sobre o CSV dão os números do painel em ${d}${recorte.greId ? `, ${recorte.greId}` : ''}${recorte.cityId ? ', num município' : ''}${recorte.camara ? `, câmara ${recorte.camara}` : ''}`, () => {
    const painel = recortar(fotos.get(d)!, dataset, recorte), pbi = lerFoto(d, recorte);
    for (const ind of INDICADORES) {
      const a = pbi.get(ind.id) ?? { n: 0, d: 0 }, b = painel[ind.id];
      assert.ok(perto(a.n, b.n) && perto(a.d, b.d), `${ind.id}: Power BI ${a.n}/${a.d}, painel ${b.n}/${b.d}`);
    }
  });
}

test('no país: os CSV dão os números da página No país, com os dados públicos reais', () => {
  const sp = lerCsv('dados/ufs.csv').find(row => row.UF === 'SP')!, real = ufs.find(row => row.uf === 'SP')!;
  assert.equal(numero(sp['Profissionais ativos']), real.ativos);
  assert.ok(Math.abs(numero(sp['Por 100 mil habitantes']) - real.por100mil) < 0.01);
  const contas = lerCsv('dados/contas-de-receita.csv');
  assert.equal(contas[0].Conta, contasPublicadas.contas[0].nome);
  assert.equal(lerCsv('dados/exercicios.csv').filter(row => row.Encerrado === '0').map(row => row.Ano).join(), contasPublicadas.aberto);
});
