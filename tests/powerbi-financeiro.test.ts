import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { datasetAt, fiscalizacaoAt } from '../src/domain/tempo.ts';
import { addDays } from '../src/domain/hash.ts';
import { municipiosSp } from '../src/domain/municipios.ts';
import { buildProfissionais, resumoProfissionais } from '../src/domain/profissionais.ts';
import { adimplenciaPorMunicipio, buildCarteira, mesesAteData, quadroDivida } from '../src/domain/gestao.ts';
import { arrecadacaoDoMes, contratosQueTerminam, diariasNoPeriodo, execucaoDoAno, fornecedoresNoPeriodo, metaMensal, parteDoRecorte, PROTESTOS, pesosDaArrecadacao, ritmoDoMes, tiposReceita } from '../src/domain/financeiro.ts';
import ativosUf from '../public/data/engineer-statistics/confea-uf.json' with { type: 'json' };
import { mesesDaSerie } from '../src/domain/series-mensais.ts';
import { buildFiscalizacao } from '../src/painel/fiscalizacao.ts';
import { janela } from '../src/painel/analise.ts';
import { despesaDoMes, fin, mesDaData, mesesAte, receitaDoMes } from '../src/financeiro/dados.ts';
import { ATIVOS_SP, CARTOES } from '../src/powerbi/financeiro/modelo.ts';
import { modeloPowerBi, pacotePowerBi } from '../src/powerbi/pacote.ts';
import { arquivoDe, conferirCamposDosVisuais, conferirChavesUnicas, conferirNomesDePasta, conferirReferenciasDax, conferirSchemas, daxDe, fimDoMesUmAnoAntes, inicio, leitorCsv, noPeriodo, numero, soma } from './powerbi-pacote.ts';

/*
 * O pacote Power BI do painel Financeiro (07/11/2026), pela única entrada (`pacotePowerBi`): os schemas oficiais, as referências do
 * DAX e dos visuais (conferências comuns em `powerbi-pacote.ts`) e as regras das medidas refeitas sobre os CSV, contra a fonte da
 * verdade de cada número: o arquivo da Transparência e as funções que as páginas do painel usam (`src/domain/financeiro.ts`,
 * `src/financeiro/dados.ts` e, para a dívida e a adimplência do cenário, `quadroDivida` e `resumoProfissionais`).
 */
const nome = 'Financeiro', pacote = pacotePowerBi('financeiro', dataset), arquivo = arquivoDe(pacote), lerCsv = leitorCsv(pacote), dax = daxDe(pacote, nome);
const PAGINAS = ['arrecadacao', 'receita', 'divida', 'orcamento'] as const;

test('financeiro: projeto PBIP com modelo, relatório com as quatro páginas, tema, dados, mapa e instruções', () => {
  for (const caminho of [`${nome}.pbip`, 'LEIA-ME.md', `${nome}.Report/definition.pbir`, `${nome}.Report/definition/report.json`, `${nome}.Report/definition/pages/pages.json`,
    `${nome}.SemanticModel/definition.pbism`, `${nome}.SemanticModel/definition/model.tmdl`, 'mapas/sp-municipios.json', '.gitignore']) arquivo(caminho);
  assert.deepEqual(JSON.parse(arquivo(`${nome}.Report/definition/pages/pages.json`)).pageOrder, [...PAGINAS]);
  conferirNomesDePasta(pacote, nome);
  assert.match(arquivo('LEIA-ME.md'), /C:\\\\CREA-SP\\\\powerbi\\\\financeiro\\\\dados\\\\/);
  assert.match(arquivo(`${nome}.SemanticModel/definition/expressions.tmdl`), /powerbi\\financeiro\\dados/);
  // O LEIA-ME diz o que é real e o que é do cenário, no lugar da frase padrão de números fictícios.
  assert.match(arquivo('LEIA-ME.md'), /são REAIS, da Transparência do Crea-SP/);
  assert.doesNotMatch(arquivo('LEIA-ME.md'), /Os números são fictícios/);
});

test('financeiro: todo JSON do projeto vale pelo schema oficial da Microsoft, e o tema pelo schema de tema', () => {
  const conferidos = conferirSchemas(pacote);
  assert.ok(conferidos > 40, `só ${conferidos} arquivos conferidos`);
});

test('financeiro: cada Tabela[Coluna] e cada [Medida] citados no DAX existem no modelo, e todo campo de visual também', () => {
  const medidas = conferirReferenciasDax(pacote, nome), campos = conferirCamposDosVisuais(pacote, nome);
  assert.ok(medidas >= 80, `só ${medidas} medidas`);
  assert.ok(campos >= 60, `só ${campos} campos em visuais`);
});

test('financeiro: o lado "um" de cada relação tem chave única no CSV', () => conferirChavesUnicas(pacote, modeloPowerBi('financeiro')));

test('cartões: cinco por página, com o título do cartão, a comparação (quando o painel tem) e a linha de apoio', () => {
  for (const pagina of PAGINAS) {
    assert.equal(CARTOES[pagina].length, 5, pagina);
    for (let i = 1; i <= 5; i++) {
      const visual = JSON.parse(arquivo(`${nome}.Report/definition/pages/${pagina}/visuals/${pagina}-cartao-${i}/visual.json`)).visual;
      const valores = (visual.query.queryState.Values.projections as { field: { Measure: { Property: string } } }[]).map(row => row.field.Measure.Property), [cartao] = valores;
      assert.equal(visual.visualContainerObjects.title[0].properties.text.expr.Literal.Value, `'${cartao}'`);
      assert.deepEqual(valores, CARTOES[pagina][i - 1].comparacao ? [cartao, `Comparação: ${cartao}`, `Detalhe: ${cartao}`] : [cartao, `Detalhe: ${cartao}`], `${pagina} ${cartao}`);
    }
  }
  // Estoque compara com o mesmo mês do ano anterior; o acumulado do ano fica só nos fluxos.
  assert.match(dax('Comparação: Anuidades vencidas'), /um ano antes/);
  const fotos = new Set(lerCsv('dados/datas-das-fotos.csv').map(row => row.Data));
  for (const { Data: d } of lerCsv('dados/datas-referencia.csv')) assert.ok(fotos.has(fimDoMesUmAnoAntes(d)), `${d}: falta a foto de ${fimDoMesUmAnoAntes(d)}`);
});

test('gastos com nome: diárias por pessoa e fornecedores pela razão social, e nenhum CPF no pacote', () => {
  const visual = JSON.parse(arquivo(`${nome}.Report/definition/pages/orcamento/visuals/orcamento-diarias/visual.json`)).visual;
  assert.equal(visual.visualType, 'tableEx');
  assert.deepEqual(visual.query.queryState.Values.projections[0].field.Column, { Expression: { SourceRef: { Entity: 'Pessoas' } }, Property: 'Nome' });
  const pessoas = lerCsv('dados/pessoas.csv'), ids = new Set(pessoas.map(row => row.Pessoa));
  assert.equal(pessoas.length, fin.diarias.length);
  for (const row of lerCsv('dados/diarias.csv')) assert.ok(ids.has(row.Pessoa), `diária de ${row.Pessoa} sem pessoa`);
  for (const [caminho, texto] of pacote) if (caminho.startsWith('dados/')) {
    assert.doesNotMatch(texto.split(/\r?\n/)[0], /CPF/i, `${caminho}: coluna de CPF`);
    assert.doesNotMatch(texto, /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/, `${caminho}: CPF formatado`);
  }
  for (const caminho of ['dados/pessoas.csv', 'dados/diarias.csv']) assert.doesNotMatch(arquivo(caminho), /\b\d{11}\b/, `${caminho}: CPF sem pontuação`);
  // O CNPJ de contratada e fornecedor tem 14 dígitos ou fica vazio (pessoa física): nenhum pedaço de CPF mascarado entra.
  for (const caminho of ['dados/contratos.csv', 'dados/fornecedores.csv']) for (const row of lerCsv(caminho)) assert.match(row.CNPJ, /^(\d{14})?$/, `${caminho}: ${row.CNPJ}`);
});

/* ---------- os dados reais: o que o CSV leva é o que a Transparência publica e o painel lê ---------- */
const receitas = lerCsv('dados/receitas.csv'), despesas = lerCsv('dados/despesas.csv'), metas = lerCsv('dados/metas.csv'), orcamento = lerCsv('dados/orcamento.csv');
const arrecadacao = lerCsv('dados/arrecadacao.csv'), dias = lerCsv('dados/dias.csv'), pesosCsv = lerCsv('dados/pesos.csv'), municipios = lerCsv('dados/municipios.csv');
const diarias = lerCsv('dados/diarias.csv'), pessoas = lerCsv('dados/pessoas.csv'), pagamentos = lerCsv('dados/pagamentos.csv'), fornecedores = lerCsv('dados/fornecedores.csv'), contratos = lerCsv('dados/contratos.csv');
const fotoDivida = lerCsv('dados/foto-divida.csv'), titulos = lerCsv('dados/titulos.csv'), fotoAdimplencia = lerCsv('dados/foto-adimplencia.csv'), protestosCsv = lerCsv('dados/categorias-protesto.csv');
const doMes = (rows: Record<string, string>[], mes: string) => rows.filter(row => row.Mês === `${mes}-01`);
const igual = (obtido: number | null, esperado: number | null, rotulo: string) => {
  if (esperado === null || obtido === null) { assert.equal(obtido, esperado, rotulo); return; }
  if (Number.isInteger(esperado) && Number.isInteger(obtido)) { assert.equal(obtido, esperado, rotulo); return; }
  // Os valores em reais saem do CSV com dois decimais: a soma pode diferir em centavos.
  assert.ok(Math.abs(obtido - esperado) <= Math.max(0.01 * 40, Math.abs(esperado) * 1e-7), `${rotulo}: ${obtido} ≠ ${esperado}`);
};

test('receita e despesa: cada mês, tipo a tipo e grupo a grupo, é o da Transparência que o painel lê, desde 2013', () => {
  const mesesReais = [...new Set(fin.receita.map(([mes]) => mes))];
  assert.ok(mesesReais[0] <= '2013-01' && mesesReais.at(-1) === fin.meta.ate, `de ${mesesReais[0]} a ${mesesReais.at(-1)}`);
  for (const mes of mesesReais) {
    for (const tipo of tiposReceita) igual(soma(doMes(receitas, mes).filter(row => row.Tipo === tipo), 'Valor'), receitaDoMes(mes, tipo), `receita ${mes} ${tipo}`);
    igual(soma(doMes(despesas, mes), 'Valor'), despesaDoMes(mes), `despesa ${mes}`);
  }
  // Os 12 meses de 2025 estão todos lá, cada um com receita.
  assert.equal(new Set(receitas.filter(row => row.Mês.startsWith('2025-') && numero(row.Valor) > 0).map(row => row.Mês)).size, 12);
});

test('meta: a de cada mês e tipo é a do painel, e a do ano soma a receita orçada reformulada', () => {
  for (const ano of [2024, 2025, 2026]) {
    for (const [tipo, valores] of metaMensal(fin, ano)) valores.forEach((valor, i) => igual(soma(doMes(metas, `${ano}-${String(i + 1).padStart(2, '0')}`).filter(row => row.Tipo === tipo), 'Meta'), valor, `meta ${ano}-${i + 1} ${tipo}`));
    const orcada = soma(orcamento.filter(row => row.Ano === String(ano) && row.Natureza === 'Receita'), 'Atual');
    igual(soma(metas.filter(row => row.Mês.startsWith(`${ano}-`)), 'Meta'), orcada, `meta do ano ${ano}`);
  }
});

test('arrecadação do dia: só dias úteis, e os dias de cada mês somam a receita real do mês, tipo a tipo', () => {
  const uteis = new Set(dias.filter(row => row.Útil === '1').map(row => row.Dia));
  for (const row of arrecadacao) assert.ok(uteis.has(row.Dia), `${row.Dia} não é dia útil`);
  const mesesComDia = [...new Set(arrecadacao.map(row => row.Dia.slice(0, 7)))];
  assert.ok(mesesComDia.length >= 40, `${mesesComDia.length} meses`);
  for (const mes of mesesComDia) for (const tipo of tiposReceita)
    igual(soma(arrecadacao.filter(row => row.Dia.startsWith(mes) && row.Tipo === tipo), 'Valor'), receitaDoMes(mes, tipo), `${mes} ${tipo}`);
});

test('recorte: a parte de cada regional e de um município no peso do estado é a do painel, tipo a tipo', () => {
  // O peso do painel em hoje, com as mesmas bases (`pesosPorTipo` de src/financeiro/dados.ts).
  const hoje = dataset.snapshotDate, profissionais = buildProfissionais(dataset), carteira = buildCarteira(dataset, profissionais), cidades = municipiosSp(dataset);
  const ativos = new Map([...adimplenciaPorMunicipio(profissionais, hoje)].map(([id, item]) => [id, item.ativos.length]));
  const estabelecimentos = new Map<string, number>(), vencido = new Map<string, number>(), acoes = new Map<string, number>();
  for (const row of dataset.establishments) estabelecimentos.set(row.cityId, (estabelecimentos.get(row.cityId) ?? 0) + 1);
  for (const row of carteira.titulos) vencido.set(row.cityId, (vencido.get(row.cityId) ?? 0) + row.valor);
  for (const row of fiscalizacaoAt(buildFiscalizacao(dataset), hoje).acoes) acoes.set(row.cityId, (acoes.get(row.cityId) ?? 0) + 1);
  const pesos = pesosDaArrecadacao({ cidades: cidades.map(c => c.id), ativos, estabelecimentos, vencido, acoes });
  const greDe = new Map(municipios.map(row => [row['Código IBGE'], row.GRE]));
  const parteCsv = (tipo: string, dentro: (id: string) => boolean) => { const doTipo = pesosCsv.filter(row => row.Tipo === tipo); return soma(doTipo.filter(row => dentro(row['Código IBGE'])), 'Peso') / soma(doTipo, 'Peso'); };
  for (const gre of dataset.gres.slice(0, 5)) for (const tipo of tiposReceita) {
    const ids = new Set(cidades.filter(c => c.greId === gre.id).map(c => c.id));
    assert.ok(Math.abs(parteCsv(tipo, id => greDe.get(id) === gre.name) - parteDoRecorte(pesos[tipo], ids)) < 1e-5, `${gre.name} ${tipo}`);
  }
  const capital = cidades.find(c => c.nome === 'São Paulo')!;
  for (const tipo of tiposReceita) assert.ok(Math.abs(parteCsv(tipo, id => id === capital.id) - parteDoRecorte(pesos[tipo], new Set([capital.id]))) < 1e-5, `capital ${tipo}`);
  // Todo município de SP tem peso em cada tipo: nenhum some do mapa.
  for (const tipo of tiposReceita) assert.equal(pesosCsv.filter(row => row.Tipo === tipo && numero(row.Peso) > 0).length, 645, tipo);
});

/* ---------- os cartões, pela regra da medida DAX sobre os CSV, contra o painel ---------- */
/** O protestado do painel: a anuidade protestável vezes o fator de cada categoria (`protestos` em blocos-divida.tsx). */
const protestos = (anuidade: number) => PROTESTOS.reduce((n, [, fator]) => n + anuidade * fator, 0);
const carteira = buildCarteira(dataset, buildProfissionais(dataset)), semRecorte = { greId: null, cityId: null, camara: null };
const DATAS = [['2026-09-30', 12], ['2026-03-31', 12], ['2025-09-30', 6], ['2026-06-30', 3]] as const;

function cartoesDoPacote(d: string, meses: number) {
  const ini = inicio(d, meses), mes = `${d.slice(0, 7)}-01`, ano = `${d.slice(0, 4)}-01-01`, noP = (row: Record<string, string>) => noPeriodo(row.Mês, d, meses);
  const vigentes = contratos.filter(row => row.Início <= d && row.Fim > d), limite90 = new Date(`${d}T00:00:00Z`); limite90.setUTCMonth(limite90.getUTCMonth() + 3);
  const despAno = soma(despesas.filter(row => row.Mês >= ano && row.Mês <= mes), 'Valor'), orcadaAno = soma(orcamento.filter(row => row.Ano === d.slice(0, 4) && row.Natureza === 'Despesa'), 'Atual');
  // Dívida: a foto da data e os títulos para a cascata do período.
  const divida = fotoDivida.filter(row => row.Data === d), x = addDays(ini, -1), emAberto = (row: Record<string, string>, dia: string) => !row['Pago em'] || row['Pago em'] > dia;
  const adim = fotoAdimplencia.filter(row => row.Data === d), fatores = soma(protestosCsv, 'Fator por milhão') / 1e6;
  // O ritmo do mês: os dias úteis da tabela Dias, até a data e no mês inteiro.
  const uteisDoMes = dias.filter(row => row.Mês === mes && row.Útil === '1'), passados = uteisDoMes.filter(row => row.Dia <= d).length, faltam = uteisDoMes.length - passados;
  const noMes = soma(arrecadacao.filter(row => row.Dia >= mes && row.Dia <= d), 'Valor'), metaMes = soma(metas.filter(row => row.Mês === mes), 'Meta'), falta = Math.max(0, metaMes - noMes);
  const fim12 = new Date(`${mes}T00:00:00Z`); fim12.setUTCMonth(fim12.getUTCMonth() - 11); const de12 = fim12.toISOString().slice(0, 10);
  const receita = soma(receitas.filter(noP), 'Valor'), despesa = soma(despesas.filter(noP), 'Valor');
  return {
    falta, mediaNecessaria: faltam > 0 && falta > 0 ? falta / faltam : 0, ritmo: passados ? noMes / passados * uteisDoMes.length : 0,
    dividaAtiva: soma(receitas.filter(noP).filter(row => row.Tipo === 'Dívida ativa'), 'Valor'), porAtivo: soma(receitas.filter(row => row.Mês >= de12 && row.Mês <= mes), 'Valor') / ATIVOS_SP,
    resultado: receita - despesa, deslocamento: soma(despesas.filter(noP).filter(row => row.Grupo === 'Diárias e deslocamento'), 'Valor'),
    arrecadadoNoMes: soma(arrecadacao.filter(row => row.Dia >= mes && row.Dia <= d), 'Valor'), metaDoMes: soma(metas.filter(row => row.Mês === mes), 'Meta'),
    arrecadadoNoAno: soma(arrecadacao.filter(row => row.Dia >= ano && row.Dia <= d), 'Valor'), metaAteOMes: soma(metas.filter(row => row.Mês >= ano && row.Mês <= mes), 'Meta'),
    receita, art: soma(receitas.filter(noP).filter(row => row.Tipo === 'ART'), 'Valor'), anuidades: soma(receitas.filter(noP).filter(row => row.Tipo === 'Anuidades'), 'Valor'),
    despesa, execucao: despAno / orcadaAno,
    diarias: soma(diarias.filter(noP), 'Valor'), pago: soma(pagamentos.filter(noP), 'Valor'),
    contratos: vigentes.length, valorContratos: soma(vigentes, 'Valor'), terminam90: vigentes.filter(row => row.Fim <= limite90.toISOString().slice(0, 10)).length,
    divida: soma(divida, 'Valor'), devedores: new Set(divida.map(row => row.Devedor)).size, abaixoDoPiso: soma(divida.filter(row => row['Acima do piso'] === '0'), 'Valor'), perto: soma(divida, 'Perto de prescrever'),
    inicioDivida: soma(titulos.filter(row => row.Vencimento < x && row.Vencimento >= addDays(x, -1826) && emAberto(row, x)), 'Valor'),
    recebidos: soma(titulos.filter(row => row['Pago em'] >= ini && row['Pago em'] <= d && numero(row['Dias até o pagamento']) > 0 && numero(row['Dias até o pagamento']) <= 1826), 'Valor'),
    protestado: soma(divida.filter(row => row.Protestável === '1'), 'Valor') * fatores,
    ativos: soma(adim, 'Ativos'), atraso: soma(adim, 'Em atraso'),
  };
}

function cartoesDoPainel(d: string, meses: number) {
  const mes = mesDaData(d), ano = mes.slice(0, 4), periodo = mesesAte(mes, meses), metaAno = metaMensal(fin, Number(ano)), indice = Number(mes.slice(5, 7)) - 1;
  const mesesDoAno = Array.from({ length: indice + 1 }, (_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`);
  const somaMeses = (lista: string[], f: (m: string) => number) => lista.reduce((n, m) => n + f(m), 0);
  const exec = execucaoDoAno(fin, 'despesa', mes), terminam = contratosQueTerminam(fin, d, 3);
  const w = janela(d, meses), dv = quadroDivida(carteira, d, semRecorte, w.start, w.prevEnd, mesesAteData(d, mesesDaSerie(meses)));
  const umAno = `${Number(d.slice(0, 4)) - 1}${d.slice(4)}`, protestavel = dv.devedores.filter(row => row.acimaDoPiso && row.maisAntigo <= umAno).reduce((n, row) => n + row.valor, 0);
  const view = datasetAt(dataset, d), r = resumoProfissionais(buildProfissionais(view), view, null, meses);
  const porDia = new Map([...arrecadacaoDoMes(fin, mes)].map(([dia, linha]) => [dia, Object.values(linha).reduce((a, b) => a + b, 0)]));
  const rm = ritmoDoMes(mes, porDia, tiposReceita.reduce((n, t) => n + (metaAno.get(t)?.[indice] ?? 0), 0), Number(d.slice(8, 10)));
  const receita = somaMeses(periodo, m => receitaDoMes(m)), despesa = somaMeses(periodo, m => despesaDoMes(m));
  return {
    falta: rm.falta, mediaNecessaria: rm.mediaNecessaria, ritmo: rm.projecao,
    dividaAtiva: somaMeses(periodo, m => receitaDoMes(m, 'Dívida ativa')), porAtivo: somaMeses(mesesAte(mes, 12), m => receitaDoMes(m)) / ativosUf.data.valores.find(row => row.ufCodigo === '35')!.valor,
    resultado: receita - despesa, deslocamento: somaMeses(periodo, m => despesaDoMes(m, 'Diárias e deslocamento')),
    arrecadadoNoMes: receitaDoMes(mes), metaDoMes: tiposReceita.reduce((n, t) => n + (metaAno.get(t)?.[indice] ?? 0), 0),
    arrecadadoNoAno: somaMeses(mesesDoAno, m => receitaDoMes(m)), metaAteOMes: tiposReceita.reduce((n, t) => n + (metaAno.get(t) ?? []).slice(0, indice + 1).reduce((a, b) => a + b, 0), 0),
    receita, art: somaMeses(periodo, m => receitaDoMes(m, 'ART')), anuidades: somaMeses(periodo, m => receitaDoMes(m, 'Anuidades')),
    despesa, execucao: exec.realizado / exec.orcado,
    diarias: diariasNoPeriodo(fin, periodo).reduce((n, p) => n + p.valor, 0), pago: fornecedoresNoPeriodo(fin, periodo).reduce((n, f) => n + f.pago, 0),
    contratos: fin.contratos.filter(row => row.inicio <= d && row.fim > d).length, valorContratos: fin.contratos.filter(row => row.inicio <= d && row.fim > d).reduce((n, row) => n + row.valor, 0), terminam90: terminam.length,
    divida: dv.total, devedores: dv.devedores.length, abaixoDoPiso: dv.abaixoDoPiso, perto: dv.pertoDePrescrever, inicioDivida: dv.cascata.inicio, recebidos: dv.cascata.recebidos,
    protestado: protestos(protestavel),
    ativos: r.ativos.length, atraso: r.inadimplentes.length,
  };
}

for (const [d, meses] of DATAS) {
  test(`cartões: os CSV com a regra das medidas dão os números do painel em ${d}, período de ${meses} meses`, () => {
    const pacoteAgora = cartoesDoPacote(d, meses), painel = cartoesDoPainel(d, meses);
    for (const chave of Object.keys(painel) as (keyof typeof painel)[]) {
      if (chave === 'execucao') { assert.ok(Math.abs(pacoteAgora.execucao - painel.execucao) < 1e-9, chave); continue; }
      igual(pacoteAgora[chave], painel[chave], `${d} ${chave}`);
    }
  });
}

test('cartões: a comparação com um ano antes lê a mesma regra em EOMONTH(d, -12), e o painel compara com o mesmo período do ano anterior', () => {
  const d = '2026-09-30', meses = 12, antes = cartoesDoPacote(fimDoMesUmAnoAntes(d), meses), mes = mesDaData(d), periodoAntes = mesesAte(`${Number(mes.slice(0, 4)) - 1}${mes.slice(4)}`, meses);
  igual(antes.receita, periodoAntes.reduce((n, m) => n + receitaDoMes(m), 0), 'receita um ano antes');
  igual(antes.despesa, periodoAntes.reduce((n, m) => n + despesaDoMes(m), 0), 'despesa um ano antes');
  igual(antes.dividaAtiva, periodoAntes.reduce((n, m) => n + receitaDoMes(m, 'Dívida ativa'), 0), 'dívida ativa um ano antes');
  igual(antes.deslocamento, periodoAntes.reduce((n, m) => n + despesaDoMes(m, 'Diárias e deslocamento'), 0), 'deslocamento um ano antes');
  // O estoque da dívida um ano antes é a foto de um ano antes, como o painel compara.
  const w = janela(d, meses), dv = quadroDivida(carteira, d, semRecorte, w.start, w.prevEnd, mesesAteData(d, mesesDaSerie(meses)));
  igual(antes.divida, dv.totalAntes, 'anuidades vencidas um ano antes');
});

/* ---------- os gráficos e as tabelas, contra o painel ---------- */
test('tabelas com nome: diárias de cada pessoa e pago a cada fornecedor no período são os do painel', () => {
  const d = dataset.snapshotDate, periodo = mesesAte(mesDaData(d), 12), noP = (row: Record<string, string>) => noPeriodo(row.Mês, d, 12);
  const nomeDe = new Map(pessoas.map(row => [row.Pessoa, row.Nome])), porPessoa = new Map<string, { valor: number; pagamentos: number; meses: number }>();
  for (const row of diarias.filter(noP)) { const item = porPessoa.get(row.Pessoa) ?? { valor: 0, pagamentos: 0, meses: 0 }; item.valor += numero(row.Valor); item.pagamentos += numero(row.Pagamentos); item.meses++; porPessoa.set(row.Pessoa, item); }
  const doPainel = diariasNoPeriodo(fin, periodo), maiores = [...porPessoa].sort((a, b) => b[1].valor - a[1].valor).slice(0, 20);
  assert.ok(doPainel.length > 100, `${doPainel.length} pessoas`);
  maiores.forEach(([id, item], i) => {
    assert.equal(nomeDe.get(id), doPainel[i].nome, `posição ${i + 1}`);
    igual(item.valor, doPainel[i].valor, doPainel[i].nome); assert.equal(item.pagamentos, doPainel[i].pagamentos, doPainel[i].nome); assert.equal(item.meses, doPainel[i].meses, doPainel[i].nome);
  });
  const razao = new Map(fornecedores.map(row => [row.Fornecedor, row.Nome])), pago = new Map<string, number>();
  for (const row of pagamentos.filter(noP)) pago.set(razao.get(row.Fornecedor)!, (pago.get(razao.get(row.Fornecedor)!) ?? 0) + numero(row.Valor));
  for (const f of fornecedoresNoPeriodo(fin, periodo)) igual(pago.get(f.nome) ?? 0, f.pago, f.nome);
});

test('orçamento: execução acumulada mês a mês e contratos que terminam em cada mês são os do painel', () => {
  const d = dataset.snapshotDate, mes = mesDaData(d), ano = Number(mes.slice(0, 4)), exec = execucaoDoAno(fin, 'despesa', mes);
  exec.acumulado.forEach((row, i) => {
    const ate = `${ano}-${String(i + 1).padStart(2, '0')}-01`, ateAntes = `${ano - 1}-${String(i + 1).padStart(2, '0')}-01`;
    if (row.realizado !== null) igual(soma(despesas.filter(item => item.Mês >= `${ano}-01-01` && item.Mês <= ate), 'Valor'), row.realizado, `realizado até ${row.mes}`);
    igual(soma(despesas.filter(item => item.Mês >= `${ano - 1}-01-01` && item.Mês <= ateAntes), 'Valor'), row.antes, `ano anterior até ${row.mes}`);
  });
  const vigentes = contratos.filter(row => row.Início <= d && row.Fim > d), doPainel = contratosQueTerminam(fin, d, 12);
  // Os 12 meses a partir do mês da data, como a medida "Contratos que terminam no mês" e o gráfico do painel.
  for (let i = 0; i < 12; i++) {
    const x = new Date(`${d.slice(0, 7)}-01T00:00:00Z`); x.setUTCMonth(x.getUTCMonth() + i); const m = x.toISOString().slice(0, 7);
    assert.equal(vigentes.filter(row => row.Fim.startsWith(m)).length, doPainel.filter(row => row.fim.startsWith(m)).length, m);
  }
});

test('dívida: a foto por idade e piso e o recorte por regional dão os do painel', () => {
  for (const [d, meses] of [['2026-09-30', 12], ['2025-12-31', 6]] as const) {
    const w = janela(d, meses), serie = mesesAteData(d, mesesDaSerie(meses)), dv = quadroDivida(carteira, d, semRecorte, w.start, w.prevEnd, serie), foto = fotoDivida.filter(row => row.Data === d);
    for (const faixa of dv.idade) {
      const daFaixa = foto.filter(row => row['Idade da anuidade'] === faixa.faixa);
      igual(soma(daFaixa.filter(row => row['Acima do piso'] === '0'), 'Valor'), faixa.abaixo, `${d} ${faixa.faixa} abaixo`);
      igual(soma(daFaixa.filter(row => row['Acima do piso'] === '1'), 'Valor'), faixa.acima, `${d} ${faixa.faixa} acima`);
    }
    const greDe = new Map(municipios.map(row => [row['Código IBGE'], row.GRE]));
    for (const gre of dataset.gres.slice(0, 4)) {
      const doRecorte = quadroDivida(carteira, d, { greId: gre.id, cityId: null, camara: null }, w.start, w.prevEnd, serie);
      igual(soma(foto.filter(row => greDe.get(row['Código IBGE']) === gre.name), 'Valor'), doRecorte.total, `${d} ${gre.name}`);
    }
  }
});
