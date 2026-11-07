import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { datasetAt } from '../src/domain/tempo.ts';
import { addDays } from '../src/domain/hash.ts';
import { buildConselho, quadroConselho } from '../src/domain/conselho.ts';
import { buildEntidades, quadroEntidades } from '../src/domain/entidades.ts';
import { buildProfissionais, situacaoEm } from '../src/domain/profissionais.ts';
import { buildCarteira, buildProcessos, plenario, despesaAcumulada, despesaMensal, distanciaUnidade, mediana, mesesAteData, quadroCamaras, quadroDivida, receitaMensal } from '../src/domain/gestao.ts';
import { mesesDaSerie } from '../src/domain/series-mensais.ts';
import { estruturaDe } from '../src/cockpit/estrutura.ts';
import { janela } from '../src/painel/analise.ts';
import { pacotePowerBi } from '../src/powerbi/pacote.ts';
import { modeloConselho } from '../src/powerbi/conselho/modelo.ts';
import { arquivoDe, conferirCamposDosVisuais, conferirChavesUnicas, conferirNomesDePasta, conferirReferenciasDax, conferirSchemas, daxDe, fimDoMesUmAnoAntes, inicio, leitorCsv, noPeriodo, numero, soma } from './powerbi-pacote.ts';

/*
 * O pacote Power BI do painel de Gestão do Conselho, testado pela sua única entrada (`pacotePowerBi`), como o de Empresas: os
 * schemas oficiais, as referências do DAX e dos visuais (conferências comuns em `powerbi-pacote.ts`) e os cartões das cinco
 * páginas refeitos a partir dos CSV pela regra que a medida DAX escreve, contra as funções do protótipo (a fonte da verdade).
 */
const pacote = pacotePowerBi('conselho', dataset);
const arquivo = arquivoDe(pacote), lerCsv = leitorCsv(pacote), dax = daxDe(pacote, 'Conselho');
const PAGINAS = ['receita', 'orcamento', 'camaras', 'entidades', 'atendimento'];

test('pacote: projeto PBIP com modelo, relatório de cinco páginas, tema, dados, mapa e instruções', () => {
  for (const caminho of ['Conselho.pbip', 'LEIA-ME.md', 'Conselho.Report/definition.pbir', 'Conselho.Report/definition/report.json', 'Conselho.Report/definition/pages/pages.json',
    'Conselho.SemanticModel/definition.pbism', 'Conselho.SemanticModel/definition/model.tmdl', 'mapas/sp-municipios.json', '.gitignore']) arquivo(caminho);
  assert.deepEqual(JSON.parse(arquivo('Conselho.Report/definition/pages/pages.json')).pageOrder, PAGINAS);
  conferirNomesDePasta(pacote, 'Conselho');
  assert.match(arquivo('LEIA-ME.md'), /C:\\\\CREA-SP\\\\powerbi\\\\conselho\\\\dados\\\\/);
});

test('pacote: todo JSON do projeto vale pelo schema oficial da Microsoft, e o tema pelo schema de tema', () => {
  const conferidos = conferirSchemas(pacote);
  assert.ok(conferidos > 60, `só ${conferidos} arquivos conferidos`);
});

test('referências: cada Tabela[Coluna] e cada [Medida] citados no DAX existem no modelo, e todo campo de visual também', () => {
  const medidas = conferirReferenciasDax(pacote, 'Conselho'), campos = conferirCamposDosVisuais(pacote, 'Conselho');
  assert.ok(medidas >= 100, `só ${medidas} medidas`);
  assert.ok(campos >= 80, `só ${campos} campos em visuais`);
});

test('relações: o lado "um" de cada relação tem chave única no CSV', () => conferirChavesUnicas(pacote, modeloConselho));

test('plenário: as cadeiras e os profissionais ativos de cada câmara dão os do painel (plenario)', () => {
  const foto = lerCsv('dados/foto-plenario.csv');
  for (const d of ['2026-09-30', '2025-06-30']) {
    const view = datasetAt(dataset, d);
    for (const linha of plenario(buildEntidades(view), buildProfissionais(view), d)) {
      const row = foto.find(item => item.Data === d && item.Câmara === linha.camara); assert.ok(row, `${d}: ${linha.camara}`);
      assert.deepEqual([numero(row.Cadeiras), numero(row['Profissionais ativos'])], [linha.cadeiras, linha.profissionais], `${d}: ${linha.camara}`);
    }
  }
});

test('cartões: o título é o nome do cartão; embaixo vêm a comparação (quando o painel tem) e a linha de apoio', () => {
  const semComparacao = new Set(['Abaixo do piso de execução', 'Perto de prescrever', 'Recebido da dívida', 'Execução do orçamento no ano', 'Em atividades-fim', 'Contratos vigentes', 'Autos perto da prescrição',
    'Organizações registradas', 'Cadeiras no plenário', 'Instrumentos vigentes', 'Tempo de resolução', 'Moram a mais de 50 km de uma unidade']);
  let cartoes = 0;
  for (const pagina of PAGINAS) for (let i = 1; i <= 5; i++) {
    const texto = pacote.get(`Conselho.Report/definition/pages/${pagina}/visuals/${pagina}-cartao-${i}/visual.json`); if (!texto) { assert.ok(pagina === 'entidades' && i === 5, `${pagina}: falta o cartão ${i}`); continue; }
    const visual = JSON.parse(texto).visual, valores = (visual.query.queryState.Values.projections as { field: { Measure: { Property: string } } }[]).map(row => row.field.Measure.Property), [nome] = valores;
    assert.equal(visual.visualContainerObjects.title[0].properties.text.expr.Literal.Value, `'${nome}'`);
    assert.deepEqual(valores, semComparacao.has(nome) ? [nome, `Detalhe: ${nome}`] : [nome, `Comparação: ${nome}`, `Detalhe: ${nome}`]);
    cartoes++;
  }
  assert.equal(cartoes, 24);
  // A despesa, as diárias e os repasses comparam com os 12 meses anteriores, como no painel; os outros, com um ano antes.
  for (const nome of ['Despesa em 12 meses', 'Diárias e passagens', 'Repasses em 12 meses']) assert.match(dax(`Comparação: ${nome}`), /" em relação aos 12 meses anteriores"/);
  assert.match(dax('Comparação: Solicitações resolvidas no prazo'), /" p\.p\. em relação a um ano antes"/);
  // EOMONTH(data, -12) de cada data que se pode escolher precisa estar na tabela oculta de datas das fotos.
  const fotos = new Set(lerCsv('dados/datas-das-fotos.csv').map(row => row.Data));
  for (const { Data: d } of lerCsv('dados/datas-referencia.csv')) assert.ok(fotos.has(fimDoMesUmAnoAntes(d)), `${d}: falta a foto de ${fimDoMesUmAnoAntes(d)}`);
});

test('gastos com nome: a tabela de diárias mostra quem recebeu, e os nomes de pessoas e fornecedores são do cenário', () => {
  const visual = JSON.parse(arquivo('Conselho.Report/definition/pages/orcamento/visuals/orcamento-diarias/visual.json')).visual;
  assert.equal(visual.visualType, 'tableEx');
  assert.deepEqual(visual.query.queryState.Values.projections[0].field.Column, { Expression: { SourceRef: { Entity: 'Pessoas' } }, Property: 'Nome' });
  const pessoas = lerCsv('dados/pessoas.csv'), diarias = lerCsv('dados/diarias.csv'), ids = new Set(pessoas.map(row => row.Pessoa));
  assert.equal(new Set(pessoas.map(row => row.Nome)).size, pessoas.length, 'nomes repetidos');
  for (const row of diarias) assert.ok(ids.has(row.Pessoa), `diária de ${row.Pessoa} sem pessoa`);
  for (const row of lerCsv('dados/fornecedores.csv')) assert.match(row.Nome, /\(demonstrativo\)$/);
});

/* ---------- os cartões a partir dos CSV ---------- */
const receitas = lerCsv('dados/receitas.csv'), despesas = lerCsv('dados/despesas.csv'), diarias = lerCsv('dados/diarias.csv'), contratos = lerCsv('dados/contratos.csv');
const titulos = lerCsv('dados/titulos.csv'), fotoDivida = lerCsv('dados/foto-divida.csv'), processos = lerCsv('dados/processos.csv'), fotoProcessos = lerCsv('dados/foto-processos.csv');
const organizacoes = lerCsv('dados/organizacoes.csv'), repasses = lerCsv('dados/repasses.csv'), pagamentos = lerCsv('dados/pagamentos-repasses.csv');
const solicitacoes = lerCsv('dados/solicitacoes.csv'), coworkingsMeses = lerCsv('dados/coworkings-meses.csv'), coworkingsUsuarios = lerCsv('dados/coworkings-usuarios.csv'), coworkings = lerCsv('dados/coworkings.csv');
const ativosCsv = lerCsv('dados/profissionais-ativos.csv'), distanciaDe = new Map(lerCsv('dados/municipios.csv').map(row => [row['Código IBGE'], numero(row['Distância até a unidade (km)'])]));
const multaDe = new Map(processos.map(row => [row.Processo, row.Multa ? numero(row.Multa) : 0]));
const registradaEm = new Map(organizacoes.map(row => [row.Organização, row['Registrada em']])), repasseDe = new Map(repasses.map(row => [row.Repasse, row]));
const distintos = (rows: Record<string, string>[], coluna: string) => new Set(rows.map(row => row[coluna])).size;
const medianaDe = (rows: Record<string, string>[], coluna: string) => mediana(rows.map(row => numero(row[coluna])));
const taxa = (parte: number, todo: number) => todo > 0 ? parte / todo * 100 : null;

/** Os cartões como o CSV e a regra da medida DAX os dão (espelho das medidas de src/powerbi/conselho/modelo.ts). */
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
  // Câmaras.
  const foto = fotoProcessos.filter(row => row.Data === d), emJulgamento = foto.filter(row => row.Fase), emRisco = foto.filter(row => row['Prescreve em até 12 meses'] === '1');
  const julgados = processos.filter(row => row['Julgado em'] && noPeriodo(row['Julgado em'], d, meses));
  // Entidades.
  const registradas = organizacoes.filter(row => row['Registrada em'] <= d), daOrganizacao = (row: Record<string, string>) => registradaEm.get(row.Organização)! <= d;
  const pagos = (de: string, ate: string) => soma(pagamentos.filter(row => row.Data > de && row.Data <= ate && repasseDe.get(row.Repasse)!.Início <= d && daOrganizacao(row)), 'Valor');
  const instrumentos = repasses.filter(row => row.Início <= d && row.Fim >= d && daOrganizacao(row));
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
    estoque: emJulgamento.length, entradas: processos.filter(row => noPeriodo(row.Entrada, d, meses)).length, julgados: julgados.length, medianaDias: medianaDe(julgados, 'Dias até o julgamento'),
    emRisco: emRisco.length, multas: emRisco.reduce((total, row) => total + (multaDe.get(row.Processo) ?? 0), 0), prescritosAutos: julgados.filter(row => row.Decisão === 'Arquivado pela prescrição').length,
    recursos: foto.filter(row => row['Recurso esperando o plenário'] === '1').length,
    organizacoes: registradas.length, cadeiras: soma(registradas, 'Cadeiras'), repasses: pagos(addDays(d, -365), d), repassesAntes: pagos(addDays(d, -730), addDays(d, -365)),
    instrumentos: instrumentos.length, comInstrumento: distintos(instrumentos, 'Organização'),
    noPrazo: taxa(noPrazo, noPrazo + atraso + vencidas), pedidos: pedidos.length, empresas: pedidos.filter(row => row.Solicitante === 'Empresa').length, vencidas,
    tempoResolucao: medianaDe(pedidos.filter(resolvida), 'Dias até resolver'),
    ativos: soma(ativos, 'Ativos'), longe: soma(ativos.filter(row => (distanciaDe.get(row['Código IBGE']) ?? 0) > 50), 'Ativos'),
    ocupacao: taxa(soma(cw, 'Horas usadas'), soma(cw, 'Horas disponíveis')), usuarios: new Set(coworkingsUsuarios.filter(row => noPeriodo(row.Mês, d, meses)).map(row => row.Profissional)).size,
    unidades: coworkings.length, custo: soma(cw, 'Custo'),
  };
}

/** Os mesmos cartões pelas funções do protótipo, como as páginas do painel de Gestão do Conselho os calculam, sem recorte. */
const carteira = buildCarteira(dataset, buildProfissionais(dataset)), todosProcessos = buildProcessos(dataset), distancia = distanciaUnidade(dataset);
const semRecorte = { greId: null, cityId: null, camara: null };
function cartoesDoPainel(d: string, meses: number) {
  const view = datasetAt(dataset, d), conselho = buildConselho(view), w = janela(d, meses), serie = mesesAteData(d, mesesDaSerie(meses));
  const rm = receitaMensal(conselho, serie).slice(-meses), dv = quadroDivida(carteira, d, semRecorte, w.start, w.prevEnd, serie);
  const qc = quadroConselho(conselho, d, null, new Map()), ano = despesaAcumulada(conselho, d, null).filter(row => row.realizado !== null).at(-1)!;
  const q = quadroCamaras(todosProcessos, d, meses, semRecorte, w.start, w.prevStart, w.prevEnd, serie), e = quadroEntidades(buildEntidades(view), d, null);
  const { atendimento: at, coworking: cw } = estruturaDe(view, null, meses), ativos = buildProfissionais(view).profissionais.filter(row => situacaoEm(row, d) === 'Ativo');
  return {
    antes: { receita: rm.every(row => row.antes !== null) ? rm.reduce((n, row) => n + row.antes!, 0) : null, divida: dv.totalAntes, despesa: despesaMensal(conselho, serie, null).slice(-24, -12).reduce((n, v) => n + v, 0),
      diarias: qc.diarias.reduce((n, row) => n + row.antes, 0), estoque: q.mensal.at(-13)!.estoque, julgados: q.julgadosAntes, medianaDias: q.medianaDiasAntes, recursos: q.recursosAntes,
      noPrazo: at.taxaNoPrazoAntes, pedidos: at.totalAntes, ocupacao: cw.ocupacaoAntes },
    agora: {
      receita: rm.reduce((n, row) => n + row.total, 0),
      divida: dv.total, devedores: dv.devedores.length, dividaPf: dv.pf, dividaPj: dv.pj, abaixoDoPiso: dv.abaixoDoPiso, piso: dv.piso, perto: dv.pertoDePrescrever, devedoresPerto: dv.pertoIds.length,
      inicioDivida: dv.cascata.inicio, novos: dv.cascata.novos, recebidos: dv.cascata.recebidos, prescritos: dv.cascata.prescritos,
      despesa: despesaMensal(conselho, serie, null).slice(-12).reduce((n, v) => n + v, 0), execucao: ano.previsto ? ano.realizado! / ano.previsto * 100 : null, fim: qc.fimMeioAtual.fim,
      diarias: qc.diarias.reduce((n, row) => n + row.valor, 0), quantidadeDiarias: qc.diarias.reduce((n, row) => n + row.quantidade, 0),
      contratos: qc.contratos.vigentes, valorContratos: qc.contratos.valorVigente, vencem90: qc.contratos.vencem90,
      estoque: q.estoque.length, entradas: q.entradas, julgados: q.julgados.length, medianaDias: q.medianaDias,
      emRisco: q.emRisco.length, multas: q.emRisco.reduce((n, row) => n + (row.multa ?? 0), 0), prescritosAutos: q.prescritos.length, recursos: q.recursos.length,
      organizacoes: e.linhas.length, cadeiras: e.cadeiras, repasses: e.total, repassesAntes: e.totalAntes, instrumentos: e.linhas.reduce((n, row) => n + row.vigentes, 0), comInstrumento: e.linhas.filter(row => row.vigentes).length,
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
