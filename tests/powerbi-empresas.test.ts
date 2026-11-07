import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { datasetAt, fiscalizacaoAt } from '../src/domain/tempo.ts';
import { defaultFilters } from '../src/domain/types.ts';
import { selectEnterpriseScope } from '../src/enterprise-v10/filters.ts';
import { buildEnterpriseModel } from '../src/enterprise-v10/model.ts';
import { buildFiscalizacao } from '../src/painel/fiscalizacao.ts';
import { buildProfissionais } from '../src/domain/profissionais.ts';
import { cobertura, contagens } from '../src/observatorio/norte.ts';
import { artPorCamara, artsPeriodo, entradasSaidas, pagamento, primeirasEntradas } from '../src/cockpit/medidas.ts';
import { artsPorProfissional, cadastroIncompleto, faixasAntiguidade, faixasCapital, idadeCapital, primeirosRegistros, ritmoEconomico } from '../src/domain/empresas.ts';
import { seriesEmpresas } from '../src/domain/series-empresas.ts';
import { complianceFlow } from '../src/gestao-v14/metrics.ts';
import { variacaoAnual } from '../src/painel/evolucao.ts';
import { aberturasRfb, permanenciaCoorte } from '../src/domain/mercado.ts';
import { janela, mesesDaJanela, quadroTecnico } from '../src/painel/analise.ts';
import { pacotePowerBi } from '../src/powerbi/pacote.ts';
import { arquivoDe, conferirCamposDosVisuais, conferirNomesDePasta, conferirReferenciasDax, conferirSchemas, daxDe, fimDoMesUmAnoAntes, inicio, leitorCsv, noPeriodo, soma, conferirChavesUnicas } from './powerbi-pacote.ts';
import { modeloEmpresas } from '../src/powerbi/empresas/modelo.ts';

/*
 * O pacote Power BI do painel de Empresas, testado pela sua única entrada (`pacotePowerBi`): os arquivos que o Power BI Desktop abre.
 * Três conferências: (1) cada JSON vale pelo schema oficial da Microsoft (baixado em tests/fixtures/powerbi-schemas); (2) toda medida
 * e todo visual apontam para tabelas, colunas e medidas que existem (as duas em `powerbi-pacote.ts`, comuns aos painéis); (3) os
 * cartões, calculados a partir dos CSV pela mesma regra que a medida DAX escreve, dão os números que o painel mostra (as funções do
 * protótipo são a fonte da verdade).
 */
const pacote = pacotePowerBi('empresas', dataset);
const arquivo = arquivoDe(pacote), lerCsv = leitorCsv(pacote), dax = daxDe(pacote, 'Empresas');

test('pacote: projeto PBIP com modelo, relatório de quatro páginas, tema, dados e instruções', () => {
  for (const caminho of ['Empresas.pbip', 'LEIA-ME.md', 'Empresas.Report/definition.pbir', 'Empresas.Report/definition/report.json', 'Empresas.Report/definition/version.json',
    'Empresas.Report/definition/pages/pages.json', 'Empresas.SemanticModel/definition.pbism', 'Empresas.SemanticModel/definition/model.tmdl', '.gitignore']) arquivo(caminho);
  const paginas = JSON.parse(arquivo('Empresas.Report/definition/pages/pages.json')).pageOrder;
  assert.deepEqual(paginas, ['registro', 'evolucao', 'rt-art', 'vinculos']);
  for (const pagina of paginas) assert.ok(JSON.parse(arquivo(`Empresas.Report/definition/pages/${pagina}/page.json`)).displayName);
  assert.ok([...pacote.keys()].some(caminho => caminho.startsWith('Empresas.Report/StaticResources/RegisteredResources/') && caminho.endsWith('.json')), 'tema registrado');
  conferirNomesDePasta(pacote, 'Empresas');
});

test('pacote: todo JSON do projeto vale pelo schema oficial da Microsoft, e o tema pelo schema de tema', () => {
  const conferidos = conferirSchemas(pacote);
  assert.ok(conferidos > 30, `só ${conferidos} arquivos conferidos`);
});

/* ---------- referências: medidas e visuais só apontam para o que existe ---------- */
test('referências: cada Tabela[Coluna] e cada [Medida] citados no DAX existem no modelo', () => {
  const medidas = conferirReferenciasDax(pacote, 'Empresas');
  assert.ok(medidas >= 30, `só ${medidas} medidas`);
});

test('relações: o lado "um" de cada relação tem chave única no CSV', () => conferirChavesUnicas(pacote, modeloEmpresas));

test('referências: todo campo de visual aponta para uma coluna ou medida do modelo', () => {
  const campos = conferirCamposDosVisuais(pacote, 'Empresas');
  assert.ok(campos >= 40, `só ${campos} campos em visuais`);
});

test('cartões: o título é o nome do cartão; embaixo do número vêm a comparação e a linha de apoio, como no painel', () => {
  for (const pagina of ['registro', 'evolucao', 'rt-art']) for (let i = 1; i <= 5; i++) {
    const visual = JSON.parse(arquivo(`Empresas.Report/definition/pages/${pagina}/visuals/${pagina}-cartao-${i}/visual.json`)).visual;
    const valores = (visual.query.queryState.Values.projections as { field: { Measure: { Property: string } } }[]).map(row => row.field.Measure.Property), [nome] = valores;
    assert.equal(visual.visualType, 'multiRowCard');
    assert.equal(visual.visualContainerObjects.title[0].properties.text.expr.Literal.Value, `'${nome}'`);
    assert.equal(visual.objects.categoryLabels[0].properties.show.expr.Literal.Value, 'false');
    // O cadastro incompleto não tem comparação no painel: só a pendência mais comum.
    assert.deepEqual(valores, nome === 'Registradas com cadastro incompleto' ? [nome, `Detalhe: ${nome}`] : [nome, `Comparação: ${nome}`, `Detalhe: ${nome}`]);
  }
  // As frases: um ano antes (em % ou em p.p.), a meta (parte registrada e RT) e os meses do gráfico (emprego).
  assert.match(dax('Comparação: Empresas registradas'), /FORMAT\(v, "\+0\.0%;-0\.0%;0\.0%"\) & " em relação a um ano antes"/);
  assert.match(dax('Comparação: Registradas em dia com a anuidade'), /FORMAT\(v, "\+0\.0;-0\.0;0\.0"\) & " p\.p\. em relação a um ano antes"/);
  assert.match(dax('Comparação: Parte do mercado que está registrada'), /\[Distância da meta da parte registrada\][\s\S]*" p\.p\. em relação à meta de "/);
  assert.match(dax('Comparação: Emprego formal em engenharia'), /\[Variação do emprego nos meses do gráfico\][\s\S]*" em " & \[Meses no gráfico da economia\] & " meses"/);
  // EOMONTH(data, -12) de cada data que se pode escolher precisa estar na tabela oculta de datas das fotos.
  const fotos = new Set(lerCsv('dados/datas-das-fotos.csv').map(row => row.Data));
  for (const { Data: d } of lerCsv('dados/datas-referencia.csv')) {
    const alvo = new Date(Date.UTC(Number(d.slice(0, 4)) - 1, Number(d.slice(5, 7)), 0)).toISOString().slice(0, 10);
    assert.ok(fotos.has(alvo), `${d}: falta a foto de ${alvo}`);
  }
});

/* ---------- os cartões a partir dos CSV ---------- */
const fotoEmpresas = lerCsv('dados/foto-empresas.csv'), fotoEstab = lerCsv('dados/foto-estabelecimentos.csv'), estab = lerCsv('dados/estabelecimentos.csv');
const movimentos = lerCsv('dados/entradas-saidas.csv'), arts = lerCsv('dados/arts.csv'), emprego = lerCsv('dados/emprego.csv');
const classeDe = new Map(estab.map(row => [row.Estabelecimento, row.Classe]));
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
  const mov = movimentos.filter(row => noPeriodo(row.Mês, d, meses)), entradas = mov.filter(row => row.Tipo === 'Entrada');
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
    saidas: mov.filter(row => row.Tipo === 'Saída').length,
    abertas: abertas.length, abertasComRegistro: abertas.filter(row => registroAtivo.has(row.Estabelecimento)).length,
    permanencia: coorte.filter(row => row['Continua registrada desde 12 meses'] === '1').length / coorte.length * 100, coorte: coorte.length,
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

/* ---------- a variação em um ano dos cartões, contra `variacaoAnual` do painel ---------- */
/**
 * Cartão do pacote, série do painel e se a série é fluxo. Ficam de fora o "RT que saiu sem substituto" e a permanência: a série do
 * painel recalcula cada mês passado com a base de hoje, e a foto do pacote guarda o que o cartão mostrava naquele mês (ADR 0002).
 * A parte registrada e o RT comparam com a meta, e o emprego com o primeiro mês do gráfico: não têm variação em um ano.
 */
const COMPARADOS = [['registradas', 'base', 'estoque'], ['semRegistro', 'semRegistro', 'estoque'], ['emDia', 'adimplencia', 'taxa'], ['entradas', 'entradas', 'fluxo'], ['saidas', 'saidas', 'fluxo'],
  ['arts', 'arts', 'fluxo'], ['valorArt', 'valorArt', 'fluxo'], ['semArt', 'semArt', 'taxa']] as const;
for (const [d, meses] of [['2026-09-30', 12], ['2026-06-30', 3]] as const) {
  test(`variação em um ano: a medida dá a variação do cartão do painel em ${d}, período de ${meses} meses`, () => {
    const view = datasetAt(dataset, d), f = fiscalizacaoAt(fBase, d), filtros = { ...defaultFilters, period: meses };
    const scope = selectEnterpriseScope(view, filtros), model = buildEnterpriseModel(scope), history = buildEnterpriseModel(selectEnterpriseScope(view, { ...filtros, period: mesesDaJanela(meses) }));
    const rows = entradasSaidas(history, f), s = seriesEmpresas(scope, history, cobertura(scope, model), meses);
    const series: Record<string, (number | null)[]> = { base: rows.map(row => row.base), entradas: rows.map(row => row.viaFiscalizacao.length + row.demais.length), saidas: rows.map(row => row.saidas.length),
      semRegistro: s.semRegistro, adimplencia: s.adimplencia, arts: s.arts, valorArt: s.valorArt, semArt: s.semArt };
    const agora = cartoesDoPacote(d, meses), antes = cartoesDoPacote(fimDoMesUmAnoAntes(d), meses);
    for (const [cartao, serie, tipo] of COMPARADOS) {
      const esperado = variacaoAnual({ tipo, meses: rows.map(row => row.month), valores: series[serie], fmt: String }, meses).value;
      // A medida DAX: (agora - antes) / antes no estoque e no fluxo (em %), agora - antes na taxa (em p.p.).
      const obtido = tipo === 'taxa' ? agora[cartao] - antes[cartao] : (agora[cartao] - antes[cartao]) / antes[cartao] * 100;
      assert.ok(esperado !== null && Math.abs(obtido - esperado) < 1e-6, `${cartao}: ${obtido} ≠ ${esperado}`);
    }
  });
}

/* ---------- os gráficos novos, contra as funções do protótipo ---------- */
const empresasCsv = lerCsv('dados/empresas.csv'), capitalDe = new Map(empresasCsv.map(row => [row.Empresa, row['Capital social']]));
const escopoEm = (d: string, meses: number) => { const view = datasetAt(dataset, d), scope = selectEnterpriseScope(view, { ...defaultFilters, period: meses }); return { view, scope, model: buildEnterpriseModel(scope) }; };

test('funil "Do mercado à ART": as medidas dão as etapas do funil do painel (complianceFlow)', () => {
  const d = '2026-09-30', meses = 12, { scope, model } = escopoEm(d, meses), etapas = new Map(complianceFlow(model, scope).nodes.map(node => [node.name, node.value]));
  const foto = fotoEmpresas.filter(row => row.Data === d), mercado = foto.filter(row => row['No mercado do funil'] === '1'), registradas = foto.filter(row => row.Registrada === '1');
  const comArt = new Set(arts.filter(row => noPeriodo(row.Data, d, meses)).map(row => row.Empresa)), comRt = registradas.filter(row => row['Com RT'] === '1').length;
  const situacao = (nome: string) => mercado.filter(row => row['Situação no funil'] === nome).length;
  assert.deepEqual({
    'Universo empresarial': mercado.length, 'Registro vigente': situacao('Registro ativo'), 'Só histórico': situacao('Registro inativo'), 'Nunca registrada': situacao('Nunca registrada'),
    'Com RT': comRt, 'RT não identificado': registradas.length - comRt,
    'Com ART no período': registradas.filter(row => comArt.has(row.Empresa)).length, 'Sem ART no período': registradas.filter(row => !comArt.has(row.Empresa)).length,
  }, Object.fromEntries(['Universo empresarial', 'Registro vigente', 'Só histórico', 'Nunca registrada', 'Com RT', 'RT não identificado', 'Com ART no período', 'Sem ART no período'].map(nome => [nome, etapas.get(nome) ?? 0])));
});

test('matriz de tempo de registro e capital social: cada célula dá a do painel (idadeCapital)', () => {
  for (const d of ['2026-09-30', '2026-05-31']) {
    const { scope, model } = escopoEm(d, 12), registradas = fotoEmpresas.filter(row => row.Data === d && row.Registrada === '1');
    for (const celula of idadeCapital(scope, model).celulas) {
      const obtido = registradas.filter(row => row['Tempo de registro'] === faixasAntiguidade[celula.idade] && capitalDe.get(row.Empresa) === faixasCapital[celula.capital]).length;
      assert.equal(obtido, celula.ids.length, `${d}: ${faixasAntiguidade[celula.idade]} × ${faixasCapital[celula.capital]}`);
    }
  }
});

test('ARTs por modalidade a cada 100 profissionais: dão as do painel (artsPorProfissional)', () => {
  const d = '2026-09-30', meses = 12, { view, scope } = escopoEm(d, meses), ativos = lerCsv('dados/profissionais-ativos.csv').filter(row => row.Data === d);
  const { linhas } = artsPorProfissional(artsPeriodo(scope, meses).atual, buildProfissionais(view).profissionais, d, null, null);
  assert.ok(linhas.length >= 5, `só ${linhas.length} modalidades`);
  for (const linha of linhas) {
    const n = arts.filter(row => row.Modalidade === linha.modalidade && noPeriodo(row.Data, d, meses)).length, profissionais = soma(ativos.filter(row => row.Modalidade === linha.modalidade), 'Ativos');
    assert.equal(n, linha.arts, `${linha.modalidade}: ARTs`); assert.equal(profissionais, linha.ativos, `${linha.modalidade}: ativos`);
    // A medida DAX fica em branco sem profissionais; o painel dá null.
    assert.equal(n > 0 && profissionais > 0 ? n / profissionais * 100 : null, linha.porCem, linha.modalidade);
  }
});

test('permanência de 3 e 6 meses: a foto dá a do painel (permanenciaCoorte)', () => {
  for (const d of ['2026-09-30', '2026-06-30']) for (const meses of [3, 6]) {
    const { view, scope } = escopoEm(d, 12), p = permanenciaCoorte(view, scope.companyIds, meses);
    const coorte = fotoEmpresas.filter(row => row.Data === d && row[`Registrada ${meses} meses antes`] === '1');
    assert.equal(coorte.length, p.coorte.length, `${d}, ${meses} meses: coorte`);
    assert.ok(Math.abs(coorte.filter(row => row[`Continua registrada desde ${meses} meses`] === '1').length / coorte.length * 100 - p.taxa!) < 1e-9, `${d}, ${meses} meses`);
  }
});

test('economia: os índices (primeiro mês = 100) e a variação do emprego dão os do painel (ritmoEconomico)', () => {
  const calendario = lerCsv('dados/calendario.csv').map(row => row.Mês), credito = lerCsv('dados/credito.csv');
  const indice = (valores: (number | null)[]) => valores.map(valor => valor === null || !valores[0] ? null : Math.round(valor / valores[0] * 1000) / 10);
  const mais = (mes: string, n: number) => new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)) - 1 + n, 1)).toISOString().slice(0, 10);
  for (const [d, meses] of [['2026-09-30', 12], ['2026-03-31', 24], ['2026-09-30', 30]] as const) {
    const view = datasetAt(dataset, d), ritmo = ritmoEconomico(view, null, null, mesesDaJanela(meses));
    // INICIO_DA_ECONOMIA: os meses do gráfico, mas nunca antes do 12º mês da base.
    const primeiro = [inicio(d, mesesDaJanela(meses)), calendario[11]].sort().at(-1)!, eixo = calendario.filter(mes => mes >= primeiro && mes <= d);
    const receita = estab.filter(row => row['Aberto em'] <= d).map(row => row['Mês de abertura']).sort().at(-1)!;
    const emprego_ = eixo.map(mes => soma(emprego.filter(row => row.Mês === mes), 'Empregados'));
    const abertas = eixo.map(mes => mes > receita ? null : estab.filter(row => row.Classe && row['Mês de abertura'] >= mais(mes, -11) && row['Mês de abertura'] <= mes).length);
    const registros = eixo.map(mes => empresasCsv.filter(row => row['Primeiro registro'] && row['Primeiro registro'] >= mais(mes, -11) && row['Primeiro registro'] < mais(mes, 1)).length);
    assert.deepEqual(eixo.map(mes => mes.slice(0, 7)), ritmo.pontos.map(row => row.month), `${d}: meses do gráfico`);
    assert.deepEqual(indice(emprego_), ritmo.indice.emprego, `${d}: emprego`);
    assert.deepEqual(indice(abertas), ritmo.indice.aberturas12, `${d}: abertas na Receita`);
    assert.deepEqual(indice(registros), ritmo.indice.registros12, `${d}: registros`);
    assert.ok(Math.abs((emprego_.at(-1)! - emprego_[0]) / emprego_[0] * 100 - ritmo.variacao.emprego!) < 1e-9, `${d}: variação do emprego`);
  }
  // O crédito ("!") vem por regional, na data de hoje do cenário.
  for (const gre of dataset.gres.slice(0, 3)) {
    const ritmo = ritmoEconomico(dataset, gre.id, null, 24), linhas = credito.filter(row => row.GRE === gre.name);
    assert.deepEqual(indice(ritmo.pontos.map(row => soma(linhas.filter(linha => linha.Mês === `${row.month}-01`), 'Saldo'))), ritmo.indice.credito, gre.name);
  }
});
