import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { datasetAt } from '../src/domain/tempo.ts';
import { addDays } from '../src/domain/hash.ts';
import { mediana } from '../src/domain/gestao.ts';
import { buildProfissionais } from '../src/domain/profissionais.ts';
import { buildConselho } from '../src/domain/conselho.ts';
import { buildEntidades } from '../src/domain/entidades.ts';
import { conselheiros, diariasPorPessoa, servidores } from '../src/domain/pessoas-conselho.ts';
import { buildColegiado, desfechos, destinosMulta, faixasNoStatus, infracaoDaAlinea, prescricaoDe, quadroColegiado, statusPendentes } from '../src/domain/colegiado.ts';
import type { Colegiado, RecorteColegiado } from '../src/domain/colegiado.ts';
import { janela } from '../src/painel/analise.ts';
import { modeloPowerBi, pacotePowerBi } from '../src/powerbi/pacote.ts';
import { CARTOES } from '../src/powerbi/conselho/modelo.ts';
import { arquivoDe, conferirCamposDosVisuais, conferirChavesUnicas, conferirNomesDePasta, conferirReferenciasDax, conferirSchemas, daxDe, fimDoMesUmAnoAntes, inicio, leitorCsv, noPeriodo, numero, soma } from './powerbi-pacote.ts';

/*
 * O pacote Power BI do painel de Gestão do Conselho, refeito com o colegiado (07/11/2026). Testado pela única entrada
 * (`pacotePowerBi`): os schemas oficiais, as referências do DAX e dos visuais (conferências comuns em `powerbi-pacote.ts`) e os
 * cartões e gráficos das cinco páginas refeitos a partir dos CSV pela regra que a medida DAX escreve, contra `quadroColegiado`, a
 * função das páginas do painel (a fonte da verdade), sem recorte e com o colegiado e a regional escolhidos.
 */
const pacote = pacotePowerBi('conselho', dataset), arquivo = arquivoDe(pacote), lerCsv = leitorCsv(pacote), dax = daxDe(pacote, 'Conselho');
const PAGINAS = ['colegiado', 'processos', 'conselheiros', 'decisoes', 'representacao'];

test('conselho: projeto PBIP com modelo, relatório com as cinco páginas, tema, dados e instruções', () => {
  for (const caminho of ['Conselho.pbip', 'LEIA-ME.md', 'Conselho.Report/definition.pbir', 'Conselho.Report/definition/report.json', 'Conselho.SemanticModel/definition/model.tmdl', '.gitignore']) arquivo(caminho);
  assert.deepEqual(JSON.parse(arquivo('Conselho.Report/definition/pages/pages.json')).pageOrder, PAGINAS);
  conferirNomesDePasta(pacote, 'Conselho');
  assert.match(arquivo('LEIA-ME.md'), /C:\\\\CREA-SP\\\\powerbi\\\\conselho\\\\dados\\\\/);
  assert.match(arquivo('Conselho.SemanticModel/definition/expressions.tmdl'), /powerbi\\conselho\\dados/);
  // O painel é só do colegiado: nada de receita, orçamento ou atendimento.
  for (const caminho of ['dados/receitas.csv', 'dados/despesas.csv', 'dados/solicitacoes.csv', 'dados/foto-divida.csv']) assert.equal(pacote.has(caminho), false, caminho);
});

test('conselho: todo JSON vale pelo schema oficial, cada Tabela[Coluna] e [Medida] do DAX existe, e o lado "um" das relações tem chave única', () => {
  assert.ok(conferirSchemas(pacote) > 40);
  assert.ok(conferirReferenciasDax(pacote, 'Conselho') >= 80);
  assert.ok(conferirCamposDosVisuais(pacote, 'Conselho') >= 100);
  conferirChavesUnicas(pacote, modeloPowerBi('conselho'));
});

test('cartões: os do painel em cada página, com o título do cartão, a comparação quando o painel tem e a linha de apoio', () => {
  for (const pagina of PAGINAS) {
    const lista = CARTOES[pagina as keyof typeof CARTOES];
    assert.equal(lista.length, pagina === 'colegiado' ? 6 : 5, pagina);
    lista.forEach((cartao, i) => {
      const visual = JSON.parse(arquivo(`Conselho.Report/definition/pages/${pagina}/visuals/${pagina}-cartao-${i + 1}/visual.json`)).visual;
      const valores = (visual.query.queryState.Values.projections as { field: { Measure: { Property: string } } }[]).map(row => row.field.Measure.Property);
      assert.equal(visual.visualContainerObjects.title[0].properties.text.expr.Literal.Value, `'${cartao.nome}'`);
      assert.deepEqual(valores, cartao.comparacao ? [cartao.nome, `Comparação: ${cartao.nome}`, `Detalhe: ${cartao.nome}`] : [cartao.nome, `Detalhe: ${cartao.nome}`]);
    });
  }
  // EOMONTH(data, -12) de cada data que se pode escolher precisa estar na tabela oculta de datas das fotos.
  const fotos = new Set(lerCsv('dados/datas-das-fotos.csv').map(row => row.Data));
  for (const { Data: d } of lerCsv('dados/datas-referencia.csv')) assert.ok(fotos.has(fimDoMesUmAnoAntes(d)), d);
  // O filtro de colegiado é de uma escolha só: as medidas leem o colegiado escolhido.
  const filtro = JSON.parse(arquivo('Conselho.Report/definition/pages/colegiado/visuals/colegiado-filtro-3/visual.json')).visual;
  assert.equal(filtro.visualContainerObjects.title[0].properties.text.expr.Literal.Value, "'Colegiado'");
  assert.match(dax('Conselheiros no terço'), /SELECTEDVALUE\('Colegiados'\[Colegiado\]\)/);
});

test('nomes: a fila, as diárias e as deliberações mostram quem, e toda pessoa da fila está na tabela de pessoas', () => {
  const pessoas = new Set(lerCsv('dados/pessoas.csv').map(row => row.Pessoa));
  for (const row of lerCsv('dados/foto-fila.csv')) assert.ok(pessoas.has(row.Pessoa), `${row.Tramitação}: ${row.Pessoa}`);
  for (const row of lerCsv('dados/diarias.csv')) assert.ok(pessoas.has(row.Pessoa), row.Pessoa);
  for (const id of ['processos-fila', 'conselheiros-diarias']) {
    const visual = JSON.parse(arquivo(`Conselho.Report/definition/pages/${id.split('-')[0]}/visuals/${id}/visual.json`)).visual;
    assert.ok(visual.query.queryState.Values.projections.some((row: { field: { Column?: { Property: string } } }) => row.field.Column?.Property === 'Nome'), id);
  }
  assert.ok(lerCsv('dados/deliberacoes.csv').every(row => row['Proposta por'].split(' ').length >= 2));
  // Nada depois da data do cenário: votos, relatos, pagamentos e sessões futuras ficam fora dos CSV.
  const hoje = dataset.snapshotDate;
  assert.ok(lerCsv('dados/tramitacoes.csv').every(row => row.Entrada <= hoje && (!row['Votado em'] || row['Votado em'] <= hoje) && (!row['Assinado em'] || row['Assinado em'] <= hoje)));
  assert.ok(lerCsv('dados/autos.csv').every(row => row['Julgado em'] <= hoje && (!row['Pago em'] || row['Pago em'] <= hoje)));
  assert.ok(lerCsv('dados/presencas.csv').every(row => row.Data <= hoje));
});

/* ---------- os cartões a partir dos CSV ---------- */
const tramitacoes = lerCsv('dados/tramitacoes.csv'), fila = lerCsv('dados/foto-fila.csv'), eventos = lerCsv('dados/eventos.csv'), mandatos = lerCsv('dados/conselheiros.csv');
const presencas = lerCsv('dados/presencas.csv'), diarias = lerCsv('dados/diarias.csv'), autos = lerCsv('dados/autos.csv'), fotoCamaras = lerCsv('dados/foto-camaras.csv');
const pagamentos = lerCsv('dados/pagamentos-repasses.csv'), deliberacoesCsv = lerCsv('dados/deliberacoes.csv'), pessoas = lerCsv('dados/pessoas.csv');
const greDe = new Map(lerCsv('dados/municipios.csv').map(row => [row['Código IBGE'], row.GRE])), tramitacao = new Map(tramitacoes.map(row => [row.Tramitação, row]));
const papelDe = new Map(pessoas.map(row => [row.Pessoa, row.Papel]));
const medianaDe = (rows: Record<string, string>[], coluna: string) => mediana(rows.filter(row => row[coluna] !== '').map(row => numero(row[coluna])));
const share = (parte: number, todo: number) => todo > 0 ? parte / todo * 100 : null;
const distintos = (rows: Record<string, string>[], coluna: string) => new Set(rows.map(row => row[coluna])).size;

interface Recorte { colegiado: Colegiado | null; gre: string | null }
const semRecorte: Recorte = { colegiado: null, gre: null };

/** Os cartões como o CSV e a regra da medida DAX os dão (espelho das medidas de src/powerbi/conselho/modelo.ts). */
function cartoesDoPacote(d: string, meses: number, { colegiado: c, gre }: Recorte) {
  const periodo = (data: string) => data !== '' && noPeriodo(data, d, meses);
  // A relação Tramitações → Colegiados e Municípios → Regionais; os conselheiros, os autos e as deliberações leem o colegiado.
  const doRecorte = (row: Record<string, string>) => (!c || row.Colegiado === c) && (!gre || greDe.get(row['Código IBGE']) === gre);
  const tram = tramitacoes.filter(doRecorte), naFila = fila.filter(row => row.Data === d && doRecorte(tramitacao.get(row.Tramitação)!));
  const membros = mandatos.filter(row => row.Início <= d && row.Fim >= d && row['Organização registrada em'] <= d && (!c || c === 'Plenário' || row.Câmara === c));
  const orgs = new Set(membros.map(row => row.Organização)), quem = new Set(membros.map(row => row.Pessoa));
  const conta = (coluna: string) => naFila.filter(row => row[coluna] === '1').length;
  const votados = tram.filter(row => periodo(row['Votado em'])), plenario = votados.filter(row => row.Instância === 'Plenário');
  // Os recursos no Plenário vêm pela câmara de origem: com uma câmara escolhida, os que vieram dela.
  const recursosVotados = tramitacoes.filter(row => row.Instância === 'Plenário' && periodo(row['Votado em']) && (!gre || greDe.get(row['Código IBGE']) === gre) && (!c || c === 'Plenário' || row['Câmara de origem'] === c));
  const cadastrados = tram.filter(row => row.Instância === 'Câmara' && periodo(row.Entrada)), relatos = tram.filter(row => periodo(row['Assinado em']) && row['Dias de relato'] !== '');
  const comIa = relatos.filter(row => row['Relato com IA'] === '1'), semIa = relatos.filter(row => row['Relato com IA'] === '0' && row['Distribuído depois da IA'] === '1');
  const sessoes = presencas.filter(row => (!c || row.Colegiado === c) && periodo(row.Data));
  const desvio = (status: string) => new Set(eventos.filter(row => row.Status === status && periodo(row.Desde) && doRecorte(tramitacao.get(row.Tramitação)!)).map(row => row.Tramitação)).size;
  const diariasDoRecorte = diarias.filter(row => noPeriodo(row.Mês, d, 12) && quem.has(row.Pessoa));
  const doColegiado = (row: Record<string, string>) => !c || row.Câmara === c || (c === 'Plenário' && row['Recurso ao Plenário em'] !== '' && row['Recurso ao Plenário em'] <= d);
  const autosVotados = autos.filter(row => periodo(row['Julgado em']) && doColegiado(row) && (!gre || greDe.get(row['Código IBGE']) === gre));
  const arquivados = autosVotados.filter(row => row.Desfecho.startsWith('Arquivamento'));
  const camaras = fotoCamaras.filter(row => row.Data === d && (!c || c === 'Plenário' || row.Câmara === c));
  const pagos = pagamentos.filter(row => row.Data > addDays(d, -365) && row.Data <= d && row['Início do repasse'] <= d && orgs.has(row.Organização));
  const delib = deliberacoesCsv.filter(row => periodo(row.Data) && (!c || c === 'Plenário' || orgs.has(row.Organização)));
  return {
    membros: membros.length, entidades: distintos(membros.filter(row => row.Natureza === 'Entidade de classe'), 'Organização'), escolas: distintos(membros.filter(row => row.Natureza === 'Instituição de ensino'), 'Organização'),
    pendentes: naFila.length, aguardando: naFila.filter(row => row.Status === 'Aguardando distribuição').length,
    comConselheiro: naFila.filter(row => papelDe.get(row.Pessoa) === 'Conselheiro').length,
    porConselheiro: membros.length ? naFila.filter(row => papelDe.get(row.Pessoa) === 'Conselheiro').length / membros.length : null,
    votados: votados.length, votadosPlenario: plenario.length, tempoDecisao: medianaDe(votados, 'Dias da abertura ao voto'), anteriores: conta('De exercício anterior'),
    vermelho: naFila.filter(row => row.Alerta === 'Vermelho').length, amarelo: naFila.filter(row => row.Alerta === 'Amarelo').length, ano: conta('Mais de um ano'),
    perto: conta('Perto da prescrição'), multasPerto: soma(naFila.filter(row => row['Perto da prescrição'] === '1'), 'Multa'), intercorrente: conta('Pela intercorrente'), parados: conta('Parado há mais de dois anos'),
    cadastro: medianaDe(cadastrados, 'Dias até o Votenet'), cadastrados: cadastrados.length, demorados: cadastrados.filter(row => numero(row['Dias até o Votenet']) > 15).length,
    presenca: share(soma(sessoes, 'Presente'), sessoes.length), sessoes: distintos(sessoes, 'Sessão'), tempoRelato: medianaDe(relatos, 'Dias de relato'),
    tempoComIa: medianaDe(comIa, 'Dias de relato'), tempoSemIa: medianaDe(semIa, 'Dias de relato'), comIa: comIa.length, semIa: semIa.length,
    vistas: desvio('Pedido de vista'), diarias: soma(diariasDoRecorte, 'Valor'), comDiaria: distintos(diariasDoRecorte, 'Pessoa'),
    autos: autosVotados.length, reincidentes: autosVotados.filter(row => row.Reincidente === '1').length, multas: soma(autosVotados, 'Multa da câmara'),
    arquivados: share(arquivados.length, autosVotados.length), prescritos: arquivados.filter(row => row.Desfecho === 'Arquivamento pela prescrição').length,
    recursos: naFila.filter(row => tramitacao.get(row.Tramitação)!.Instância === 'Plenário').length,
    reformadas: share(recursosVotados.filter(row => row['Decisão do Plenário'] === 'Decisão reformada').length, recursosVotados.length), recursosVotados: recursosVotados.length,
    organizacoes: orgs.size, mulheres: share(membros.filter(row => row.Gênero === 'Feminino').length, membros.length), conselheiras: membros.filter(row => row.Gênero === 'Feminino').length,
    mulheresRegistro: share(soma(camaras, 'Profissionais ativas'), soma(camaras, 'Profissionais ativos')),
    repasses: soma(pagos, 'Valor'), receberam: distintos(pagos, 'Organização'), deliberacoes: delib.length, aprovado: soma(delib, 'Valor'), conflitos: delib.filter(row => row['Proposta pela própria organização'] === '1').length,
  };
}

/** Os mesmos cartões pelas contas das páginas do painel (quadroColegiado), na data e no período, com o recorte. */
const base = buildColegiado(dataset), nomeGre = new Map(dataset.gres.map(row => [row.name, row.id]));
function quadroDe(d: string, meses: number, { colegiado, gre }: Recorte) {
  const w = janela(d, meses), recorte: RecorteColegiado = { colegiado, greId: gre ? nomeGre.get(gre)! : null, cityId: null };
  return quadroColegiado(base, buildProfissionais(datasetAt(dataset, d)), d, w.start, w.prevStart, w.prevEnd, recorte);
}
function cartoesDoPainel(d: string, meses: number, recorte: Recorte) {
  const q = quadroDe(d, meses, recorte), relatos = q.comIa.length + q.semIa.length;
  const pessoa = (id: string) => q.pessoas.get(id);
  const repassado = q.organizacoesComCadeira.reduce((n, row) => n + row.repassado, 0);
  return {
    antes: { pendentes: q.pendentesAntes, votados: q.votadosAntes, tempoDecisao: q.tempoDecisaoAntes, presenca: q.presencaAntes, tempoRelato: q.tempoRelatoAntes, vistas: q.vistasAntes, multas: q.multasAntes, recursos: q.recursosAntes, deliberacoes: q.deliberacoesAntes },
    agora: {
      membros: q.membros.length, entidades: q.organizacoes.entidades, escolas: q.organizacoes.escolas,
      pendentes: q.pendentes.length, aguardando: q.porStatus['Aguardando distribuição'].length, comConselheiro: q.pendentes.filter(row => pessoa(row.evento.com)?.papel === 'Conselheiro').length,
      porConselheiro: q.membros.length ? q.pendentes.filter(row => pessoa(row.evento.com)?.papel === 'Conselheiro').length / q.membros.length : null,
      votados: q.votados.length, votadosPlenario: q.votados.filter(t => t.instancia === 'Plenário').length, tempoDecisao: q.tempoDecisao, anteriores: q.deExerciciosAnteriores.length,
      vermelho: q.pendentes.filter(row => row.diasNoStatus > 120).length, amarelo: q.pendentes.filter(row => row.diasNoStatus >= 90 && row.diasNoStatus <= 120).length, ano: q.pendentes.filter(row => row.diasTotais > 365).length,
      perto: q.pertoDePrescrever.length, multasPerto: q.pertoDePrescrever.reduce((n, row) => n + (row.t.processo.multa ?? 0), 0), intercorrente: q.pertoDePrescrever.filter(row => prescricaoDe(row)?.motivo === 'três anos parado').length,
      parados: q.parados.length, cadastro: q.cadastroMediana, cadastrados: q.cadastro.flat().length, demorados: q.cadastro.slice(4).flat().length,
      presenca: q.presenca, sessoes: q.sessoes, tempoRelato: q.tempoRelato, tempoComIa: q.tempoComIa, tempoSemIa: q.tempoSemIa, comIa: q.comIa.length, semIa: q.semIa.length, vistas: q.vistas,
      autos: q.autosVotados.length, reincidentes: q.autosVotados.filter(x => x.reincidente).length, multas: q.multasAplicadas, arquivados: q.arquivados, prescritos: q.autosVotados.filter(x => x.desfecho === 'Arquivamento pela prescrição').length,
      recursos: q.recursos.length, reformadas: q.reformadas, recursosVotados: q.votadosPlenario.length,
      organizacoes: q.organizacoesComCadeira.length, mulheres: q.parteMulheres, conselheiras: q.membros.filter(m => m.genero === 'Feminino').length, mulheresRegistro: q.parteMulheresRegistro,
      repasses: repassado, receberam: q.organizacoesComCadeira.filter(row => row.repassado > 0).length,
      deliberacoes: q.deliberacoes.length, aprovado: q.deliberacoes.reduce((n, x) => n + x.valor, 0), conflitos: q.conflitos.length,
    },
  };
}

const igual = (obtido: number | null, esperado: number | null, rotulo: string) => {
  if (esperado === null || obtido === null) { assert.equal(obtido, esperado, rotulo); return; }
  if (Number.isInteger(esperado) && Number.isInteger(obtido)) { assert.equal(obtido, esperado, rotulo); return; }
  // Os valores em reais saem do CSV com dois decimais: a soma pode diferir em centavos.
  assert.ok(Math.abs(obtido - esperado) <= Math.max(1e-6, Math.abs(esperado) * 1e-6), `${rotulo}: ${obtido} ≠ ${esperado}`);
};
const CASOS: [string, number, Recorte][] = [
  [dataset.snapshotDate, 12, semRecorte], ['2026-03-31', 12, semRecorte], ['2025-09-30', 12, semRecorte], [dataset.snapshotDate, 24, semRecorte], ['2026-06-30', 3, semRecorte],
  [dataset.snapshotDate, 12, { colegiado: 'Civil', gre: null }], [dataset.snapshotDate, 12, { colegiado: 'Plenário', gre: null }], ['2025-12-31', 6, { colegiado: 'Elétrica', gre: null }],
  [dataset.snapshotDate, 12, { colegiado: null, gre: dataset.gres[4].name }], [dataset.snapshotDate, 12, { colegiado: 'Plenário', gre: dataset.gres[1].name }],
];
for (const [d, meses, recorte] of CASOS) {
  test(`cartões: os CSV com a regra das medidas dão os números do painel em ${d}, ${meses} meses, ${recorte.colegiado ?? 'todos os colegiados'}${recorte.gre ? `, ${recorte.gre}` : ''}`, () => {
    const pacoteAgora = cartoesDoPacote(d, meses, recorte), { agora } = cartoesDoPainel(d, meses, recorte);
    // As diárias têm teste próprio abaixo: o painel as lê da contabilidade, fora do quadro do colegiado.
    for (const chave of Object.keys(agora) as (keyof typeof agora)[]) igual(pacoteAgora[chave], agora[chave], chave);
  });
}

test('diárias dos conselheiros: o valor e quem recebeu em 12 meses dão os do painel, sem recorte e numa câmara', () => {
  const d = dataset.snapshotDate, contas = buildConselho(dataset), entidades = buildEntidades(dataset);
  const pessoas = diariasPorPessoa(contas, servidores(contas, dataset), conselheiros(entidades), d, null).filter(row => row.categoria === 'Conselheiros');
  for (const recorte of [semRecorte, { colegiado: 'Civil' as Colegiado, gre: null }]) {
    const ids = new Set(quadroDe(d, 12, recorte).membros.map(m => m.id)), esperado = pessoas.filter(row => ids.has(row.id)), obtido = cartoesDoPacote(d, 12, recorte);
    igual(obtido.diarias, esperado.reduce((n, row) => n + row.valor, 0), `${recorte.colegiado}: valor`);
    assert.equal(obtido.comDiaria, esperado.length, `${recorte.colegiado}: conselheiros`);
  }
});

/* ---------- a variação em um ano: a medida lê o mesmo cartão em EOMONTH(d, -12), e o painel compara com um ano antes ---------- */
for (const [d, meses, recorte] of [[dataset.snapshotDate, 12, semRecorte], ['2026-06-30', 3, semRecorte], [dataset.snapshotDate, 12, { colegiado: 'Civil', gre: null }]] as [string, number, Recorte][]) {
  test(`variação em um ano: o cartão lido um ano antes dá a base de comparação do painel em ${d}, ${meses} meses, ${recorte.colegiado ?? 'todos'}`, () => {
    const antes = cartoesDoPacote(fimDoMesUmAnoAntes(d), meses, recorte), painel = cartoesDoPainel(d, meses, recorte).antes;
    for (const chave of Object.keys(painel) as (keyof typeof painel)[]) igual(antes[chave], painel[chave], chave);
  });
}

/* ---------- os gráficos, contra o painel ---------- */
test('gráficos do colegiado e dos processos: status, tempo no status, pautados e votados por mês e o caminho dão os do painel', () => {
  for (const [d, meses] of [[dataset.snapshotDate, 12], ['2025-12-31', 6]] as const) {
    const q = quadroDe(d, meses, semRecorte), naFila = fila.filter(row => row.Data === d), ini = inicio(d, meses);
    for (const status of statusPendentes) {
      assert.equal(naFila.filter(row => row.Status === status).length, q.porStatus[status].length, `${d} ${status}`);
      faixasNoStatus.forEach((faixa, i) => assert.equal(naFila.filter(row => row.Status === status && row['Tempo no status'] === faixa).length, q.calor[statusPendentes.indexOf(status)][i].length, `${d} ${status} ${faixa}`));
    }
    for (const row of q.mensal.slice(-24)) {
      const mes = `${row.month}-01`;
      assert.equal(eventos.filter(e => e.Status === 'Pautado' && e.Mês === mes && e.Desde <= d).length, row.pautados, `${d} pautados ${row.month}`);
      assert.equal(tramitacoes.filter(t => t['Mês do voto'] === mes && t['Votado em'] <= d).length, row.votados, `${d} votados ${row.month}`);
    }
    // O caminho: cada processo uma vez, dos que já chegaram ao colegiado na data; os marcos dos autos, nos autos.
    const marco = (coluna: string) => new Set(tramitacoes.filter(t => t.Entrada <= d && t[coluna] !== '' && t[coluna] >= ini && t[coluna] <= d).map(t => t.Processo)).size;
    const marcoAuto = (coluna: string) => autos.filter(a => a[coluna] !== '' && a[coluna] >= ini && a[coluna] <= d).length;
    assert.deepEqual([marco('Entrada do processo'), marco('Julgado na câmara em'), marco('Recurso em'), marco('Plenário em'), marcoAuto('Recurso ao Confea em'), marcoAuto('Trânsito em julgado'), marcoAuto('Pago em')],
      q.caminho.map(row => row.total), d);
  }
});

test('gráficos dos conselheiros e das decisões: relato por trimestre, desvios, desfechos, alíneas, Plenário e destino das multas dão os do painel', () => {
  const d = dataset.snapshotDate, meses = 12, q = quadroDe(d, meses, semRecorte), periodo = (data: string) => data !== '' && noPeriodo(data, d, meses);
  for (const row of q.iaTrimestral) {
    const doTrimestre = tramitacoes.filter(t => t['Trimestre do relato'] === row.trimestre && t['Assinado em'] <= d && t['Distribuído depois da IA'] === '1');
    igual(medianaDe(doTrimestre.filter(t => t['Relato com IA'] === '1'), 'Dias de relato'), row.comIa, `${row.trimestre} com IA`);
    igual(medianaDe(doTrimestre.filter(t => t['Relato com IA'] === '0'), 'Dias de relato'), row.semIa, `${row.trimestre} sem IA`);
  }
  for (const row of q.desvios) for (const [tipo, rows] of Object.entries(row.porTipo))
    assert.equal(new Set(eventos.filter(e => e.Status === tipo && periodo(e.Desde) && tramitacoes.find(t => t.Tramitação === e.Tramitação)!.Colegiado === row.colegiado).map(e => e.Tramitação)).size, rows.length, `${row.colegiado} ${tipo}`);
  const votados = autos.filter(a => periodo(a['Julgado em']));
  for (const row of q.desfechoPorCamara) for (const desfecho of desfechos) assert.equal(votados.filter(a => a.Câmara === row.camara && a.Desfecho === desfecho).length, row.porDesfecho[desfecho].length, `${row.camara} ${desfecho}`);
  for (const row of q.porAlinea) igual(soma(votados.filter(a => a.Infração === infracaoDaAlinea[row.alinea]), 'Multa da câmara'), row.valor, row.alinea);
  for (const row of q.plenarioPorCamara) for (const [decisao, rows] of [['Decisão mantida', row.mantidas], ['Decisão reformada', row.reformadas]] as const)
    assert.equal(tramitacoes.filter(t => t.Instância === 'Plenário' && periodo(t['Votado em']) && t['Câmara de origem'] === row.camara && t['Decisão do Plenário'] === decisao).length, rows.length, `${row.camara} ${decisao}`);
  // O destino na data: anulada no recurso, paga, em cobrança (transitou) ou em recurso, pelo ano da decisão.
  const ate = (data: string) => data !== '' && data <= d;
  const destino = (a: Record<string, string>) => numero(a['Multa final']) === 0 && ate(a['Plenário em']) ? 'Anulada no recurso' : ate(a['Pago em']) ? 'Paga' : ate(a['Trânsito em julgado']) ? 'Em cobrança' : 'Em recurso';
  for (const row of q.multasPorAno) for (const x of destinosMulta)
    igual(soma(autos.filter(a => a['Ano da decisão'] === row.ano && a['Julgado em'] <= d && numero(a['Multa da câmara']) > 0 && destino(a) === x), 'Multa da câmara'), row.valor[x], `${row.ano} ${x}`);
});

test('gráficos da representação: cadeiras, profissionais e mulheres de cada câmara e o que cada organização com cadeira recebeu dão os do painel', () => {
  for (const d of [dataset.snapshotDate, '2025-06-30']) {
    const q = quadroDe(d, 12, semRecorte), foto = fotoCamaras.filter(row => row.Data === d);
    for (const linha of q.plenario) { const row = foto.find(item => item.Câmara === linha.camara)!; assert.deepEqual([numero(row.Cadeiras), numero(row['Profissionais ativos'])], [linha.cadeiras, linha.profissionais], `${d} ${linha.camara}`); }
    for (const linha of q.mulheres) {
      const row = foto.find(item => item.Câmara === linha.camara)!, membros = mandatos.filter(m => m.Início <= d && m.Fim >= d && m['Organização registrada em'] <= d && m.Câmara === linha.camara);
      igual(share(membros.filter(m => m.Gênero === 'Feminino').length, membros.length), linha.parteConselho, `${d} ${linha.camara} no Conselho`);
      igual(numero(row['Profissionais ativos']) ? share(numero(row['Profissionais ativas']), numero(row['Profissionais ativos'])) : null, linha.parteRegistro, `${d} ${linha.camara} no registro`);
    }
    for (const org of q.organizacoesComCadeira) for (const canal of ['Convênio', 'Contrato', 'Patrocínio'] as const)
      igual(soma(pagamentos.filter(p => p.Organização === org.orgId && p.Canal === canal && p.Data > addDays(d, -365) && p.Data <= d && p['Início do repasse'] <= d), 'Valor'), org.porCanal[canal], `${d} ${org.sigla} ${canal}`);
  }
});
