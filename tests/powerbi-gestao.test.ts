import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { datasetAt } from '../src/domain/tempo.ts';
import { addDays } from '../src/domain/hash.ts';
import { buildConselho, quadroConselho } from '../src/domain/conselho.ts';
import { buildProfissionais, situacaoEm } from '../src/domain/profissionais.ts';
import { buildCarteira, receitaAcumulada, vencimentoContratos, despesaAcumulada, despesaMensal, distanciaUnidade, mediana, mesesAteData, quadroDivida, receitaMensal } from '../src/domain/gestao.ts';
import { mesesDaSerie } from '../src/domain/series-mensais.ts';
import { estruturaDe } from '../src/cockpit/estrutura.ts';
import { janela } from '../src/painel/analise.ts';
import { modeloPowerBi, pacotePowerBi } from '../src/powerbi/pacote.ts';
import { servidores } from '../src/domain/pessoas-conselho.ts';
import { arquivoDe, conferirCamposDosVisuais, conferirChavesUnicas, conferirNomesDePasta, conferirReferenciasDax, conferirSchemas, fimDoMesUmAnoAntes, inicio, leitorCsv, noPeriodo, numero, soma } from './powerbi-pacote.ts';

/*
 * Os pacotes Power BI que saem do modelo comum de `src/powerbi/gestao/`: Financeiro (Receita e Orçamento) e Atendimento, separados
 * em 07/11/2026 (o de Gestão do Conselho tem modelo próprio e é testado em `powerbi-conselho.test.ts`). Cada um é testado pela única entrada (`pacotePowerBi`), como o de Empresas:
 * os schemas oficiais, as referências do DAX e dos visuais (conferências comuns em `powerbi-pacote.ts`) e os cartões das cinco
 * páginas refeitos a partir dos CSV pela regra que a medida DAX escreve, contra as funções do protótipo (a fonte da verdade).
 */
const PAINEIS = [
  { painel: 'financeiro', nome: 'Financeiro', paginas: ['receita', 'orcamento'] },
  { painel: 'atendimento', nome: 'Atendimento', paginas: ['atendimento'] },
] as const;
const pacotes = new Map(PAINEIS.map(({ painel }) => [painel, pacotePowerBi(painel, dataset)]));
const PAGINAS = PAINEIS.flatMap(({ paginas }) => paginas);
/** O nome do projeto do pacote que tem a página: os visuais ficam em `<Nome>.Report/definition/pages/<página>/`. */
const nomeDaPagina = (pagina: string) => PAINEIS.find(({ paginas }) => (paginas as readonly string[]).includes(pagina))!.nome;
/** Os CSV que os dois pacotes levam são os mesmos: os cartões e os gráficos leem da união dos dois. */
const todos = new Map(PAINEIS.flatMap(({ painel }) => [...pacotes.get(painel)!]));
const arquivo = arquivoDe(todos), lerCsv = leitorCsv(todos);
/** O texto DAX de uma medida, no pacote que a tem. */
const dax = (medida: string) => {
  for (const { nome } of PAINEIS) {
    const texto = todos.get(`${nome}.SemanticModel/definition/tables/Medidas.tmdl`)!, inicio = texto.indexOf(`measure '${medida}' =`);
    if (inicio >= 0) return texto.slice(inicio, texto.indexOf('\r\n\t\tformatString', inicio));
  }
  assert.fail(`medida ${medida} em nenhum pacote`);
};

for (const { painel, nome, paginas } of PAINEIS) {
  const pacote = pacotes.get(painel)!, doPacote = arquivoDe(pacote);
  test(`${painel}: projeto PBIP com modelo, relatório com as suas páginas, tema, dados, mapa e instruções`, () => {
    for (const caminho of [`${nome}.pbip`, 'LEIA-ME.md', `${nome}.Report/definition.pbir`, `${nome}.Report/definition/report.json`, `${nome}.Report/definition/pages/pages.json`,
      `${nome}.SemanticModel/definition.pbism`, `${nome}.SemanticModel/definition/model.tmdl`, 'mapas/sp-municipios.json', '.gitignore']) doPacote(caminho);
    assert.deepEqual(JSON.parse(doPacote(`${nome}.Report/definition/pages/pages.json`)).pageOrder, paginas);
    conferirNomesDePasta(pacote, nome);
    assert.match(doPacote('LEIA-ME.md'), new RegExp(`C:\\\\\\\\CREA-SP\\\\\\\\powerbi\\\\\\\\${painel}\\\\\\\\dados\\\\\\\\`));
    assert.match(doPacote(`${nome}.SemanticModel/definition/expressions.tmdl`), new RegExp(`powerbi\\\\${painel}\\\\dados`));
  });

  test(`${painel}: todo JSON do projeto vale pelo schema oficial da Microsoft, e o tema pelo schema de tema`, () => {
    const conferidos = conferirSchemas(pacote);
    assert.ok(conferidos > 20, `só ${conferidos} arquivos conferidos`);
  });

  test(`${painel}: cada Tabela[Coluna] e cada [Medida] citados no DAX existem no modelo recortado, e todo campo de visual também`, () => {
    const medidas = conferirReferenciasDax(pacote, nome), campos = conferirCamposDosVisuais(pacote, nome);
    assert.ok(medidas >= 20, `só ${medidas} medidas`);
    assert.ok(campos >= 20, `só ${campos} campos em visuais`);
  });

  test(`${painel}: o lado "um" de cada relação tem chave única no CSV`, () => conferirChavesUnicas(pacote, modeloPowerBi(painel)));
}

test('recorte: cada pacote leva só as tabelas das suas páginas, e o CSV comum é o mesmo nos dois', () => {
  const csvs = (painel: string) => new Set([...pacotes.get(painel)!.keys()].filter(caminho => caminho.startsWith('dados/')));
  const financeiro = csvs('financeiro'), atendimento = csvs('atendimento');
  for (const caminho of ['dados/receitas.csv', 'dados/despesas.csv', 'dados/diarias.csv', 'dados/titulos.csv', 'dados/foto-divida.csv']) assert.ok(financeiro.has(caminho) && !atendimento.has(caminho), caminho);
  for (const caminho of ['dados/solicitacoes.csv', 'dados/coworkings-meses.csv']) assert.ok(atendimento.has(caminho) && !financeiro.has(caminho), caminho);
  for (const caminho of ['dados/regionais.csv', 'dados/municipios.csv', 'dados/datas-referencia.csv']) assert.equal(pacotes.get('financeiro')!.get(caminho), pacotes.get('atendimento')!.get(caminho), caminho);
  // Os processos, as câmaras e as entidades saíram para o pacote do Conselho.
  for (const painel of ['financeiro', 'atendimento']) for (const caminho of ['dados/processos.csv', 'dados/camaras.csv', 'dados/organizacoes.csv']) assert.equal(csvs(painel).has(caminho), false, `${painel}: ${caminho}`);
});

test('cartões: o título é o nome do cartão; embaixo vêm a comparação (quando o painel tem) e a linha de apoio', () => {
  const semComparacao = new Set(['Abaixo do piso de execução', 'Perto de prescrever', 'Recebido da dívida', 'Execução do orçamento no ano', 'Em atividades-fim', 'Contratos vigentes', 'Tempo de resolução', 'Moram a mais de 50 km de uma unidade']);
  let cartoes = 0;
  for (const pagina of PAGINAS) for (let i = 1; i <= 5; i++) {
    const visual = JSON.parse(arquivo(`${nomeDaPagina(pagina)}.Report/definition/pages/${pagina}/visuals/${pagina}-cartao-${i}/visual.json`)).visual;
    const valores = (visual.query.queryState.Values.projections as { field: { Measure: { Property: string } } }[]).map(row => row.field.Measure.Property), [nome] = valores;
    assert.equal(visual.visualContainerObjects.title[0].properties.text.expr.Literal.Value, `'${nome}'`);
    assert.deepEqual(valores, semComparacao.has(nome) ? [nome, `Detalhe: ${nome}`] : [nome, `Comparação: ${nome}`, `Detalhe: ${nome}`]);
    cartoes++;
  }
  assert.equal(cartoes, 15);
  // A despesa e as diárias comparam com os 12 meses anteriores, como no painel; os outros, com um ano antes.
  for (const nome of ['Despesa em 12 meses', 'Diárias e passagens']) assert.match(dax(`Comparação: ${nome}`), /" em relação aos 12 meses anteriores"/);
  assert.match(dax('Comparação: Solicitações resolvidas no prazo'), /" p\.p\. em relação a um ano antes"/);
  // EOMONTH(data, -12) de cada data que se pode escolher precisa estar na tabela oculta de datas das fotos.
  const fotos = new Set(lerCsv('dados/datas-das-fotos.csv').map(row => row.Data));
  for (const { Data: d } of lerCsv('dados/datas-referencia.csv')) assert.ok(fotos.has(fimDoMesUmAnoAntes(d)), `${d}: falta a foto de ${fimDoMesUmAnoAntes(d)}`);
});

test('gastos com nome: a tabela de diárias mostra quem recebeu, e os nomes de pessoas e fornecedores são do cenário', () => {
  const visual = JSON.parse(arquivo('Financeiro.Report/definition/pages/orcamento/visuals/orcamento-diarias/visual.json')).visual;
  assert.equal(visual.visualType, 'tableEx');
  assert.deepEqual(visual.query.queryState.Values.projections[0].field.Column, { Expression: { SourceRef: { Entity: 'Pessoas' } }, Property: 'Nome' });
  const pessoas = lerCsv('dados/pessoas.csv'), diarias = lerCsv('dados/diarias.csv'), ids = new Set(pessoas.map(row => row.Pessoa));
  assert.equal(new Set(pessoas.map(row => row.Nome)).size, pessoas.length, 'nomes repetidos');
  for (const row of diarias) assert.ok(ids.has(row.Pessoa), `diária de ${row.Pessoa} sem pessoa`);
  for (const row of lerCsv('dados/fornecedores.csv')) assert.match(row.Nome, /\(demonstrativo\)$/);
});

/* ---------- os cartões a partir dos CSV ---------- */
const receitas = lerCsv('dados/receitas.csv'), despesas = lerCsv('dados/despesas.csv'), diarias = lerCsv('dados/diarias.csv'), contratos = lerCsv('dados/contratos.csv');
const titulos = lerCsv('dados/titulos.csv'), fotoDivida = lerCsv('dados/foto-divida.csv');
const solicitacoes = lerCsv('dados/solicitacoes.csv'), coworkingsMeses = lerCsv('dados/coworkings-meses.csv'), coworkingsUsuarios = lerCsv('dados/coworkings-usuarios.csv'), coworkings = lerCsv('dados/coworkings.csv');
const ativosCsv = lerCsv('dados/profissionais-ativos.csv'), distanciaDe = new Map(lerCsv('dados/municipios.csv').map(row => [row['Código IBGE'], numero(row['Distância até a unidade (km)'])]));
const distintos = (rows: Record<string, string>[], coluna: string) => new Set(rows.map(row => row[coluna])).size;
const medianaDe = (rows: Record<string, string>[], coluna: string) => mediana(rows.map(row => numero(row[coluna])));
const taxa = (parte: number, todo: number) => todo > 0 ? parte / todo * 100 : null;

/** Os cartões como o CSV e a regra da medida DAX os dão (espelho das medidas de src/powerbi/gestao/modelo.ts). */
function cartoesDoPacote(d: string, meses: number) {
  const ini = inicio(d, meses), x = addDays(ini, -1), ano = `${d.slice(0, 4)}-01-01`, nos12 = (row: Record<string, string>) => noPeriodo(row.Mês, d, 12);
  // Receita e dívida.
  const divida = fotoDivida.filter(row => row.Data === d), perto = divida.filter(row => numero(row['Perto de prescrever']) > 0);
  const emAberto = (row: Record<string, string>, dia: string) => !row['Pago em'] || row['Pago em'] > dia;
  const inicioDivida = soma(titulos.filter(row => row.Vencimento < x && row.Vencimento >= addDays(x, -1826) && emAberto(row, x)), 'Valor');
  const novos = soma(titulos.filter(row => row.Vencimento >= x && row.Vencimento < d && emAberto(row, row.Vencimento)), 'Valor');
  const recebidos = soma(titulos.filter(row => row['Pago em'] >= ini && row['Pago em'] <= d && numero(row['Dias até o pagamento']) > 0 && numero(row['Dias até o pagamento']) <= 1826), 'Valor');
  const prescritos = soma(titulos.filter(row => row.Vencimento >= addDays(x, -1826) && row.Vencimento < addDays(d, -1826) && emAberto(row, d)), 'Valor');
  // Orçamento e despesa.
  const desp12 = despesas.filter(nos12), despAno = despesas.filter(row => row.Mês >= ano && row.Mês <= d), vigentes = contratos.filter(row => row.Início <= d && row.Fim >= d);
  // Atendimento.
  const pedidos = solicitacoes.filter(row => noPeriodo(row['Aberta em'], d, meses)), resolvida = (row: Record<string, string>) => row['Resolvida em'] !== '' && row['Resolvida em'] <= d;
  const noPrazo = pedidos.filter(row => resolvida(row) && row['Resolvida em'] <= row.Prazo).length, atraso = pedidos.filter(row => resolvida(row) && row['Resolvida em'] > row.Prazo).length;
  const vencidas = pedidos.filter(row => !resolvida(row) && row.Prazo < d).length;
  const cw = coworkingsMeses.filter(row => noPeriodo(row.Mês, d, meses)), ativos = ativosCsv.filter(row => row.Data === d);
  return {
    receita: soma(receitas.filter(row => noPeriodo(row.Mês, d, meses)), 'Realizada'),
    divida: soma(divida, 'Valor'), devedores: distintos(divida, 'Devedor'), dividaPf: soma(divida.filter(row => row['Tipo de devedor'] === 'Profissional'), 'Valor'),
    dividaPj: soma(divida.filter(row => row['Tipo de devedor'] === 'Empresa'), 'Valor'), abaixoDoPiso: soma(divida.filter(row => row['Acima do piso'] === '0'), 'Valor'),
    piso: 5 * Math.round(520 * Math.pow(1.055, Math.max(0, Number(d.slice(0, 4)) - 2020))), perto: soma(divida, 'Perto de prescrever'), devedoresPerto: distintos(perto, 'Devedor'),
    inicioDivida, novos, recebidos, prescritos,
    despesa: soma(desp12, 'Realizado'), execucao: taxa(soma(despAno, 'Realizado'), soma(despAno, 'Orçado')), fim: soma(desp12.filter(row => row.Atividade === 'Atividade-fim'), 'Realizado'),
    diarias: soma(diarias.filter(nos12), 'Valor'), quantidadeDiarias: soma(diarias.filter(nos12), 'Diárias'),
    contratos: vigentes.length, valorContratos: soma(vigentes, 'Valor'), vencem90: vigentes.filter(row => row.Fim <= addDays(d, 90)).length,
    noPrazo: taxa(noPrazo, noPrazo + atraso + vencidas), pedidos: pedidos.length, empresas: pedidos.filter(row => row.Solicitante === 'Empresa').length, vencidas,
    tempoResolucao: medianaDe(pedidos.filter(resolvida), 'Dias até resolver'),
    ativos: soma(ativos, 'Ativos'), longe: soma(ativos.filter(row => (distanciaDe.get(row['Código IBGE']) ?? 0) > 50), 'Ativos'),
    ocupacao: taxa(soma(cw, 'Horas usadas'), soma(cw, 'Horas disponíveis')), usuarios: new Set(coworkingsUsuarios.filter(row => noPeriodo(row.Mês, d, meses)).map(row => row.Profissional)).size,
    unidades: coworkings.length, custo: soma(cw, 'Custo'),
  };
}

/** Os mesmos cartões pelas funções do protótipo, como as páginas dos painéis Financeiro e de Atendimento os calculam, sem recorte. */
const carteira = buildCarteira(dataset, buildProfissionais(dataset)), distancia = distanciaUnidade(dataset);
const semRecorte = { greId: null, cityId: null, camara: null };
function cartoesDoPainel(d: string, meses: number) {
  const view = datasetAt(dataset, d), conselho = buildConselho(view), w = janela(d, meses), serie = mesesAteData(d, mesesDaSerie(meses));
  const rm = receitaMensal(conselho, serie).slice(-meses), dv = quadroDivida(carteira, d, semRecorte, w.start, w.prevEnd, serie);
  const qc = quadroConselho(conselho, d, null, new Map()), ano = despesaAcumulada(conselho, d, null).filter(row => row.realizado !== null).at(-1)!;
  const { atendimento: at, coworking: cw } = estruturaDe(view, null, meses), ativos = buildProfissionais(view).profissionais.filter(row => situacaoEm(row, d) === 'Ativo');
  return {
    antes: { receita: rm.every(row => row.antes !== null) ? rm.reduce((n, row) => n + row.antes!, 0) : null, divida: dv.totalAntes, despesa: despesaMensal(conselho, serie, null).slice(-24, -12).reduce((n, v) => n + v, 0),
      diarias: qc.diarias.reduce((n, row) => n + row.antes, 0),
      noPrazo: at.taxaNoPrazoAntes, pedidos: at.totalAntes, ocupacao: cw.ocupacaoAntes },
    agora: {
      receita: rm.reduce((n, row) => n + row.total, 0),
      divida: dv.total, devedores: dv.devedores.length, dividaPf: dv.pf, dividaPj: dv.pj, abaixoDoPiso: dv.abaixoDoPiso, piso: dv.piso, perto: dv.pertoDePrescrever, devedoresPerto: dv.pertoIds.length,
      inicioDivida: dv.cascata.inicio, novos: dv.cascata.novos, recebidos: dv.cascata.recebidos, prescritos: dv.cascata.prescritos,
      despesa: despesaMensal(conselho, serie, null).slice(-12).reduce((n, v) => n + v, 0), execucao: ano.previsto ? ano.realizado! / ano.previsto * 100 : null, fim: qc.fimMeioAtual.fim,
      diarias: qc.diarias.reduce((n, row) => n + row.valor, 0), quantidadeDiarias: qc.diarias.reduce((n, row) => n + row.quantidade, 0),
      contratos: qc.contratos.vigentes, valorContratos: qc.contratos.valorVigente, vencem90: qc.contratos.vencem90,
      noPrazo: at.taxaNoPrazo, pedidos: at.pedidos.length, empresas: at.empresas, vencidas: at.partes['Em aberto, prazo vencido'].length, tempoResolucao: at.medianaDias,
      ativos: ativos.length, longe: ativos.filter(row => (distancia.get(row.cityId)?.km ?? 0) > 50).length,
      ocupacao: cw.ocupacao, usuarios: cw.usuarios, unidades: cw.unidades.length, custo: cw.custo,
    },
  };
}

const igual = (obtido: number | null, esperado: number | null, rotulo: string) => {
  if (esperado === null || obtido === null) { assert.equal(obtido, esperado, rotulo); return; }
  if (Number.isInteger(esperado) && Number.isInteger(obtido)) { assert.equal(obtido, esperado, rotulo); return; }
  // Os valores em reais saem do CSV com dois decimais: a soma pode diferir em centavos.
  assert.ok(Math.abs(obtido - esperado) <= Math.max(1e-6, Math.abs(esperado) * 1e-7), `${rotulo}: ${obtido} ≠ ${esperado}`);
};
for (const [d, meses] of [['2026-09-30', 12], ['2026-03-31', 12], ['2025-09-30', 12], ['2026-09-30', 24], ['2026-06-30', 3]] as const) {
  test(`cartões: os CSV com a regra das medidas dão os números do painel em ${d}, período de ${meses} meses`, () => {
    const pacote = cartoesDoPacote(d, meses), { agora } = cartoesDoPainel(d, meses);
    // Os usuários dos coworkings só se comparam em hoje: o cenário sorteia de novo quem usou a mesa a cada data lida (as horas
    // não mudam). Na base real, o uso é um fato e não muda com a data de referência.
    for (const chave of Object.keys(agora) as (keyof typeof agora)[]) if (chave !== 'usuarios' || d === dataset.snapshotDate) igual(pacote[chave], agora[chave], chave);
  });
}

/* ---------- a variação em um ano: a medida lê o mesmo cartão em EOMONTH(d, -12), e o painel compara com um ano antes ---------- */
for (const [d, meses] of [['2026-09-30', 12], ['2026-06-30', 3]] as const) {
  test(`variação em um ano: o cartão lido um ano antes dá a base de comparação do painel em ${d}, período de ${meses} meses`, () => {
    const antes = cartoesDoPacote(fimDoMesUmAnoAntes(d), meses), painel = cartoesDoPainel(d, meses).antes;
    for (const chave of Object.keys(painel) as (keyof typeof painel)[]) igual(antes[chave], painel[chave], chave);
  });
}

/* ---------- os gráficos, contra as funções do protótipo (sem recorte) ---------- */
const doMes = (rows: Record<string, string>[], coluna: string, mes: string) => rows.filter(row => row[coluna] === `${mes}-01`);

test('gráficos da receita: receita por mês e origem, previsto e realizado no ano e a dívida por idade e piso dão os do painel', () => {
  for (const [d, meses] of [['2026-09-30', 12], ['2026-03-31', 6]] as const) {
    const conselho = buildConselho(datasetAt(dataset, d)), serie = mesesAteData(d, mesesDaSerie(meses));
    for (const row of receitaMensal(conselho, serie).slice(-meses)) for (const [origem, valor] of Object.entries(row.porFonte))
      igual(soma(doMes(receitas, 'Mês', row.month).filter(item => item.Origem === origem), 'Realizada'), valor, `${d} ${row.month} ${origem}`);
    // Acumulado de janeiro até o mês do eixo; no ano da data, só até o mês dela.
    const ano = Number(d.slice(0, 4)), acumulado = (rows: Record<string, string>[], coluna: string, a: number, m: number) => soma(rows.filter(row => row.Mês >= `${a}-01-01` && row.Mês <= `${a}-${String(m).padStart(2, '0')}-01`), coluna);
    for (const row of receitaAcumulada(conselho, d)) {
      igual(acumulado(receitas, 'Realizada', ano - 1, row.mes), row.realizadoAntes, `${d} receita do ano anterior até ${row.mes}`);
      if (row.realizado !== null) { igual(acumulado(receitas, 'Realizada', ano, row.mes), row.realizado, `${d} receita até ${row.mes}`); igual(acumulado(receitas, 'Prevista', ano, row.mes), row.previsto, `${d} prevista até ${row.mes}`); }
    }
    for (const row of despesaAcumulada(conselho, d, null)) if (row.realizado !== null) igual(acumulado(despesas, 'Orçado', ano, row.mes), row.previsto, `${d} orçado até ${row.mes}`);
    const w = janela(d, meses), dv = quadroDivida(carteira, d, semRecorte, w.start, w.prevEnd, serie), foto = fotoDivida.filter(row => row.Data === d);
    for (const faixa of dv.idade) {
      const daFaixa = foto.filter(row => row['Idade da anuidade'] === faixa.faixa);
      igual(soma(daFaixa.filter(row => row['Acima do piso'] === '0'), 'Valor'), faixa.abaixo, `${d} ${faixa.faixa} abaixo`); igual(soma(daFaixa.filter(row => row['Acima do piso'] === '1'), 'Valor'), faixa.acima, `${d} ${faixa.faixa} acima`);
    }
  }
});

test('gráficos do orçamento: despesa por natureza, fornecedores, contratos que terminam e pessoal por função dão os do painel', () => {
  const d = dataset.snapshotDate, conselho = buildConselho(dataset), qc = quadroConselho(conselho, d, null, new Map()), desp12 = despesas.filter(row => noPeriodo(row.Mês, d, 12));
  for (const row of qc.porNatureza) { const daNatureza = desp12.filter(item => item.Natureza === row.natureza); igual(soma(daNatureza, 'Realizado'), row.realizado, row.natureza); igual(soma(daNatureza, 'Orçado'), row.orcado, row.natureza); }
  const empenhos = lerCsv('dados/empenhos.csv').filter(row => noPeriodo(row.Mês, d, 12));
  for (const row of qc.fornecedores) igual(soma(empenhos.filter(item => item.Fornecedor === row.fornecedor.id), 'Valor'), row.empenhado, row.fornecedor.nome);
  // Os 12 meses a partir do mês da data, com os contratos vigentes nela.
  const vigentes = contratos.filter(row => row.Início <= d && row.Fim >= d);
  for (const row of vencimentoContratos(conselho, d)) assert.equal(vigentes.filter(item => item.Fim.startsWith(row.month)).length, row.n, row.month);
  // O bloco Pessoal conta os servidores da equipe (`servidores`) e soma o custo de cada um.
  const pessoas = lerCsv('dados/pessoas.csv').filter(row => row.Tipo === 'Servidor'), equipe = servidores(conselho, dataset);
  for (const { funcao } of conselho.pessoal) {
    const daFuncao = pessoas.filter(item => item.Função === funcao), daEquipe = equipe.filter(s => s.funcao === funcao);
    assert.deepEqual([daFuncao.filter(item => item.Vínculo === 'Efetivo').length, daFuncao.filter(item => item.Vínculo === 'Comissionado').length],
      [daEquipe.filter(s => s.vinculo === 'Efetivo').length, daEquipe.filter(s => s.vinculo === 'Comissionado').length], funcao);
    igual(soma(daFuncao, 'Custo mensal'), daEquipe.reduce((n, s) => n + s.remuneracao, 0), funcao);
  }
});

test('gráficos do atendimento: assunto e situação e ocupação de cada coworking dão os do painel', () => {
  for (const [d, meses] of [['2026-09-30', 12], ['2025-12-31', 6]] as const) {
    const view = datasetAt(dataset, d);
    const { atendimento: at, coworking: cw } = estruturaDe(view, null, meses), pedidos = solicitacoes.filter(row => noPeriodo(row['Aberta em'], d, meses));
    const resolvida = (row: Record<string, string>) => row['Resolvida em'] !== '' && row['Resolvida em'] <= d;
    const situacaoDe = (row: Record<string, string>) => resolvida(row) ? (row['Resolvida em'] <= row.Prazo ? 'Resolvido no prazo' : 'Resolvido com atraso') : row.Prazo < d ? 'Em aberto, prazo vencido' : 'Em aberto, no prazo';
    for (const linha of at.porAssunto) for (const [situacao, rows] of Object.entries(linha.partes)) assert.equal(pedidos.filter(row => row.Assunto === linha.assunto && situacaoDe(row) === situacao).length, rows.length, `${d} ${linha.assunto} ${situacao}`);
    const cwMeses = coworkingsMeses.filter(row => noPeriodo(row.Mês, d, meses));
    for (const unidade of cw.unidades) { const daUnidade = cwMeses.filter(row => row.Unidade === unidade.nome); igual(taxa(soma(daUnidade, 'Horas usadas'), soma(daUnidade, 'Horas disponíveis')), unidade.ocupacao, `${d} ${unidade.nome}`); }
  }
});

test('recorte por regional: solicitações e coworkings seguem a GRE, como no painel', () => {
  const d = dataset.snapshotDate, meses = 12;
  for (const gre of dataset.gres.slice(0, 4)) {
    const { atendimento: at, coworking: cw } = estruturaDe(dataset, gre.id, meses);
    assert.equal(solicitacoes.filter(row => row.GRE === gre.name && noPeriodo(row['Aberta em'], d, meses)).length, at.pedidos.length, `${gre.name}: solicitações`);
    assert.equal(coworkings.filter(row => row.GRE === gre.name).length, cw.unidades.length, `${gre.name}: coworkings`);
  }
});
