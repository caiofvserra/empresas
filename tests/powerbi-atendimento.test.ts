import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { distanciaUnidade, faixaDistancia, faixasDistancia, mediana } from '../src/domain/gestao.ts';
import { buildAtendimento, demandaAtendimento, quadroAtendimento, situacoes, statusProtocolo } from '../src/domain/atendimento.ts';
import type { RecorteAtendimento } from '../src/domain/atendimento.ts';
import { pacotePowerBi } from '../src/powerbi/pacote.ts';
import { datasetAt } from '../src/domain/tempo.ts';
import { buildProfissionais, situacaoEm } from '../src/domain/profissionais.ts';
import { estruturaDe } from '../src/cockpit/estrutura.ts';
import { rotuloTrimestre } from '../src/cockpit/formatos.ts';
import { arquivoDe, daxDe, fimDoMesUmAnoAntes, inicio, leitorCsv, numero, soma } from './powerbi-pacote.ts';

/*
 * O pacote Power BI do painel de Atendimento (07/11/2026): três páginas (Protocolos, Equipe e território, Demanda) do modelo comum de
 * `src/powerbi/gestao/`. Seam: a única entrada, `pacotePowerBi('atendimento', dataset)`. Os cartões e os gráficos são refeitos a partir
 * dos CSV pela regra que a medida DAX escreve e conferidos com `quadroAtendimento` e `demandaAtendimento`, as funções das páginas
 * (a fonte da verdade). As conferências comuns (schemas, referências do DAX, chaves) ficam em `powerbi-gestao.test.ts`.
 */
const pacote = pacotePowerBi('atendimento', dataset), arquivo = arquivoDe(pacote), lerCsv = leitorCsv(pacote), dax = daxDe(pacote, 'Atendimento');
const base = buildAtendimento(dataset), hoje = dataset.snapshotDate;
const SEM_RECORTE: RecorteAtendimento = { greId: null, cityId: null, tipo: null, unidade: null };

type Linha = Record<string, string>;
const protocolos = new Map(lerCsv('dados/protocolos.csv').map(row => [row.Protocolo, row]));
const foto = lerCsv('dados/foto-protocolos.csv'), colaboradores = lerCsv('dados/colaboradores.csv');
const municipios = lerCsv('dados/municipios.csv'), greDe = new Map(municipios.map(row => [row['Código IBGE'], row.GRE])), nomeGre = new Map(dataset.gres.map(row => [row.id, row.name]));
const aberturas = lerCsv('dados/aberturas-receita.csv'), artsPorMes = lerCsv('dados/arts-por-mes.csv'), concluintes = lerCsv('dados/concluintes.csv'), formados = lerCsv('dados/formados-registrados.csv');
const ouvidoria = lerCsv('dados/ouvidoria-e-informacao.csv');
const taxa = (parte: number, todo: number) => todo > 0 ? parte / todo * 100 : null;
const sim = (valor: string) => valor === '1';
const mesDe = (data: string) => `${data.slice(0, 7)}-01`;
/** O primeiro dia do mês `n` meses antes do mês da data (EDATE do primeiro dia). */
const mesAntes = (d: string, n: number) => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1 - n, 1)).toISOString().slice(0, 10);

/** O recorte do alto da página, como os filtros o levam aos CSV: a regional pelo município do protocolo, e o tipo de serviço. */
interface Filtro { gre?: string; tipo?: string }
const noLugar = (cityId: string, filtro: Filtro) => !filtro.gre || greDe.get(cityId) === nomeGre.get(filtro.gre);
/** A foto na data, com o protocolo ao lado (a relação Foto dos protocolos → Protocolos). */
const naFoto = (d: string, filtro: Filtro = {}) => foto.filter(row => row.Data === d).map(row => ({ f: row, p: protocolos.get(row.Protocolo)! }))
  .filter(({ p }) => noLugar(p['Código IBGE'], filtro) && (!filtro.tipo || p.Tipo === filtro.tipo));
/** Os protocolos abertos no período, lidos na data: a base de quase todas as medidas (`doPeriodo` no modelo). */
const doPeriodo = (d: string, meses: number, filtro: Filtro = {}) => naFoto(d, filtro).filter(({ p }) => p['Aberto em'] >= inicio(d, meses) && p['Aberto em'] <= d);
type Lida = ReturnType<typeof naFoto>[number];
const em = (rows: Lida[], ...situacoesQueContam: string[]) => rows.filter(({ f }) => situacoesQueContam.includes(f.Situação));
const fora = (rows: Lida[]) => rows.filter(({ f }) => f.Prazo === 'Fora do prazo');
const atribuidos = (rows: Lida[]) => rows.filter(({ f }) => sim(f.Atribuído));

/** Os cartões das três páginas como o CSV e a regra da medida DAX os dão (espelho de src/powerbi/gestao/atendimento.ts). */
function cartoesDoPacote(d: string, meses: number, filtro: Filtro = {}) {
  const rows = doPeriodo(d, meses, filtro), fechados = em(rows, 'Fechado'), andamento = em(rows, 'Aberto', 'Exigência'), exigencia = em(rows, 'Exigência');
  const semAtribuicao = em(rows, 'Aberto', 'Sem pagamento').filter(({ f }) => !sim(f.Atribuído));
  const fila = new Map<string, { fila: number; fora: number; total: number; nome: string }>();
  for (const { f } of atribuidos(rows)) { const item = fila.get(f.Pessoa) ?? { fila: 0, fora: 0, total: 0, nome: colaboradores.find(c => c.Pessoa === f.Pessoa)!.Nome };
    item.total++; if (f.Situação === 'Aberto' || f.Situação === 'Exigência') { item.fila++; if (f.Prazo === 'Fora do prazo') item.fora++; } fila.set(f.Pessoa, item); }
  const maior = [...fila.values()].sort((x, y) => y.fila - x.fila || y.fora - x.fora || y.total - x.total || x.nome.localeCompare(y.nome))[0];
  const noQuadro = colaboradores.filter(c => sim(c['No quadro']) && (!filtro.gre || c.GRE === nomeGre.get(filtro.gre))).length;
  // Fechados nos 12 meses: todo protocolo do lugar (sem o tipo), aberto em qualquer data, que fechou nos 12 meses (o cancelado não entra).
  const fechadosNoAno = naFoto(d, { gre: filtro.gre }).filter(({ f }) => f.Situação === 'Fechado' && f['Fechado em'] >= inicio(d, 12) && f['Fechado em'] <= d).length;
  return {
    noPrazo: taxa(fechados.filter(({ f }) => f.Prazo === 'Dentro do prazo').length, fechados.length), fechados: fechados.length,
    abertos: rows.length, mediana: mediana(fechados.map(({ f }) => numero(f['Dias com o Crea-SP']))),
    andamento: andamento.length, andamentoFora: fora(andamento).length,
    exigencia: exigencia.length, exigenciaVencida: fora(exigencia).length, semResposta: rows.filter(({ f }) => f.Status === 'Finalizada sem resposta à exigência').length,
    semPagamento: em(rows, 'Sem pagamento').length, taxas: em(rows, 'Sem pagamento').reduce((n, { p }) => n + numero(p.Taxa), 0), cancelados: em(rows, 'Cancelado').length,
    filaFora: fora(atribuidos(andamento)).length, fila: atribuidos(andamento).length, comProtocolo: new Set(atribuidos(rows).map(({ f }) => f.Pessoa)).size, noQuadro,
    porColaborador: noQuadro ? fechadosNoAno / 12 / noQuadro : null,
    semAtribuicao: semAtribuicao.length, esperando: semAtribuicao.filter(({ f }) => numero(f['Dias úteis no status']) > 5).length,
    maiorFila: maior?.fila ?? null, maiorFora: maior?.fora ?? null, maiorNome: maior?.nome ?? null,
  };
}

/** Os mesmos cartões pelas funções das páginas. */
function cartoesDoPainel(d: string, meses: number, filtro: Filtro = {}) {
  const recorte = { ...SEM_RECORTE, greId: filtro.gre ?? null, tipo: (filtro.tipo ?? null) as RecorteAtendimento['tipo'] };
  const q = quadroAtendimento(base, { anchor: d, period: meses, recorte }), s = q.porSituacao, andamento = [...s.Aberto, ...s['Exigência']];
  const servidores = [...base.colaboradores.values()].filter(c => !filtro.gre || c.greId === filtro.gre || (c.greId === null && filtro.gre === 'GRE5')).length;
  const dd = demandaAtendimento(dataset, base, { anchor: d, recorte, colaboradores: servidores });
  const maior = [...q.colaboradores].sort((x, y) => y.fila.length - x.fila.length || y.filaFora.length - x.filaFora.length)[0];
  return {
    noPrazo: q.noPrazo, fechados: s.Fechado.length, abertos: q.linhas.length, mediana: q.mediana,
    andamento: andamento.length, andamentoFora: andamento.filter(l => l.prazo === 'Fora do prazo').length,
    exigencia: s['Exigência'].length, exigenciaVencida: s['Exigência'].filter(l => l.prazo === 'Fora do prazo').length, semResposta: s.Fechado.filter(l => l.status === 'Finalizada sem resposta à exigência').length,
    semPagamento: s['Sem pagamento'].length, taxas: q.valorSemPagamento, cancelados: s.Cancelado.length,
    filaFora: q.colaboradores.reduce((n, c) => n + c.filaFora.length, 0), fila: q.colaboradores.reduce((n, c) => n + c.fila.length, 0), comProtocolo: q.colaboradores.length, noQuadro: servidores,
    porColaborador: dd.porColaborador,
    semAtribuicao: q.semAtribuicao.length, esperando: q.esperaSemAtribuicao.slice(2).reduce((n, rows) => n + rows.length, 0),
    maiorFila: maior?.fila.length ?? null, maiorFora: maior?.filaFora.length ?? null, maiorNome: maior?.nome ?? null,
  };
}

const igual = (obtido: number | string | null, esperado: number | string | null, rotulo: string) => {
  if (typeof esperado !== 'number' || typeof obtido !== 'number') { assert.equal(obtido, esperado, rotulo); return; }
  assert.ok(Math.abs(obtido - esperado) <= Math.max(1e-6, Math.abs(esperado) * 1e-7), `${rotulo}: ${obtido} ≠ ${esperado}`);
};
const conferir = <T extends Record<string, number | string | null>>(obtido: T, esperado: T, prefixo: string) => { for (const chave of Object.keys(esperado)) igual(obtido[chave], esperado[chave], `${prefixo}: ${chave}`); };

test('páginas: Protocolos, Equipe e território e Demanda, com os cartões do painel e a comparação onde o painel compara', () => {
  assert.deepEqual(JSON.parse(arquivo('Atendimento.Report/definition/pages/pages.json')).pageOrder, ['protocolos', 'equipe', 'demanda']);
  const esperados = {
    protocolos: ['Fechados no prazo', 'Abertos no período', 'Tempo típico até fechar', 'Em andamento', 'Em exigência', 'Sem pagamento'],
    equipe: ['Na fila e fora do prazo', 'Fechados por colaborador', 'Sem atribuição', 'Maior fila de uma pessoa', 'A mais de 50 km da unidade', 'Ocupação dos coworkings'],
    demanda: ['Previstos nos próximos 3 meses', 'Empresas novas que pediram registro', 'Formados do ano anterior já registrados', 'Protocolos de ART por 1.000 ARTs', 'Pedidos de informação no ano'],
  };
  const comComparacao = new Set(['Fechados no prazo', 'Abertos no período', 'Tempo típico até fechar', 'Em andamento', 'Ocupação dos coworkings', 'Protocolos de ART por 1.000 ARTs']);
  for (const [pagina, nomes] of Object.entries(esperados)) nomes.forEach((nome, i) => {
    const visual = JSON.parse(arquivo(`Atendimento.Report/definition/pages/${pagina}/visuals/${pagina}-cartao-${i + 1}/visual.json`)).visual;
    const valores = (visual.query.queryState.Values.projections as { field: { Measure: { Property: string } } }[]).map(row => row.field.Measure.Property);
    assert.deepEqual(valores, comComparacao.has(nome) ? [nome, `Comparação: ${nome}`, `Detalhe: ${nome}`] : [nome, `Detalhe: ${nome}`], `${pagina}: ${nome}`);
  });
  assert.match(dax('Comparação: Fechados no prazo'), /" p\.p\. em relação a um ano antes"/);
  assert.match(dax('Comparação: Protocolos de ART por 1.000 ARTs'), /" em relação aos 12 meses anteriores"/);
  // As solicitações do modelo antigo (prazo único de 14 dias) saíram do pacote.
  assert.ok(![...pacote.keys()].includes('dados/solicitacoes.csv'));
});

test('foto dos protocolos: cada fim de mês com foto lê todo protocolo aberto até ele, e nada depois da data do cenário', () => {
  const datas = new Set(lerCsv('dados/datas-das-fotos.csv').map(row => row.Data));
  for (const row of foto) assert.ok(datas.has(row.Data) && protocolos.get(row.Protocolo)!['Aberto em'] <= row.Data, `${row.Data} ${row.Protocolo}`);
  for (const d of ['2026-09-30', '2025-09-30']) assert.equal(foto.filter(row => row.Data === d).length, base.protocolos.filter(p => p.abertoEm <= d && p.abertoEm >= inicio(d, 36)).length, d);
  assert.equal(protocolos.size, base.protocolos.filter(p => p.abertoEm <= hoje).length);
  assert.ok(colaboradores.some(c => c.Nome === 'Sem atribuição' && c['No quadro'] === '0'));
});

for (const [d, meses, filtro] of [['2026-09-30', 12, {}], ['2026-03-31', 12, {}], ['2025-09-30', 6, {}], ['2026-09-30', 24, {}], ['2026-09-30', 12, { gre: 'GRE5' }], ['2026-06-30', 3, { gre: 'GRE2' }], ['2026-09-30', 12, { tipo: 'Serviços de ART' }]] as const) {
  test(`cartões: os CSV com a regra das medidas dão os números do painel em ${d}, ${meses} meses${'gre' in filtro ? `, ${filtro.gre}` : ''}${'tipo' in filtro ? `, ${filtro.tipo}` : ''}`, () => {
    const { porColaborador, ...doPacote } = cartoesDoPacote(d, meses, filtro), { porColaborador: doPainel, ...painel } = cartoesDoPainel(d, meses, filtro);
    conferir(doPacote, painel, d);
    // Os fechados por colaborador olham só o lugar, como a demanda: o tipo de serviço não entra.
    if (!('tipo' in filtro)) igual(porColaborador, doPainel, `${d}: fechados por colaborador`);
  });
}

test('variação em um ano: os cartões lidos em EOMONTH(d, -12) dão a base de comparação do painel', () => {
  for (const [d, meses] of [['2026-09-30', 12], ['2026-06-30', 3]] as const) {
    const antes = cartoesDoPacote(fimDoMesUmAnoAntes(d), meses), q = quadroAtendimento(base, { anchor: d, period: meses, recorte: SEM_RECORTE });
    igual(antes.noPrazo, q.noPrazoAntes, `${d}: no prazo`); igual(antes.abertos, q.antes.length, `${d}: abertos`); igual(antes.mediana, q.medianaAntes, `${d}: mediana`);
    igual(antes.andamento, q.antesPorSituacao.Aberto.length + q.antesPorSituacao['Exigência'].length, `${d}: em andamento`);
  }
});

test('gráficos dos protocolos: status contra o prazo, mês a mês, cada serviço e os motivos de exigência dão os do painel', () => {
  for (const [d, meses] of [['2026-09-30', 12], ['2026-03-31', 6]] as const) {
    const q = quadroAtendimento(base, { anchor: d, period: meses, recorte: SEM_RECORTE }), rows = doPeriodo(d, meses);
    for (const s of q.porStatus) {
      const doStatus = rows.filter(({ f }) => f.Status === s.status);
      assert.deepEqual(['Dentro do prazo', 'Fora do prazo', 'Sem prazo'].map(prazo => doStatus.filter(({ f }) => f.Prazo === prazo).length), [s.dentro.length, s.fora.length, s.sem.length], `${d} ${s.status}`);
    }
    // Mês a mês: 12 meses, ou o período quando passa de 12; cada mês pela situação na data, e o mesmo mês um ano antes.
    const lidos = naFoto(d);
    for (const m of q.mensal) {
      const doMes = lidos.filter(({ p }) => p.Mês === `${m.mes}-01`);
      assert.deepEqual(situacoes.map(s => em(doMes, s).length), situacoes.map(s => m.partes[s].length), `${d} ${m.mes}`);
      assert.equal([...protocolos.values()].filter(p => p.Mês === mesAntes(`${m.mes}-01`, 12)).length, m.antes, `${d} ${m.mes} um ano antes`);
    }
    for (const r of q.porSubtipo.filter(row => row.total)) {
      const doServico = rows.filter(({ p }) => p.Serviço === r.servico.subtipo), fechados = em(doServico, 'Fechado'), exig = doServico.filter(({ p, f }) => p['Motivo da exigência'] && numero(f['Dias com o solicitante']) > 0);
      igual(doServico.length, r.total, `${d} ${r.servico.subtipo}`); igual(fora(em(doServico, 'Aberto', 'Exigência')).length, r.linhas.filter(l => (l.situacao === 'Aberto' || l.situacao === 'Exigência') && l.prazo === 'Fora do prazo').length, `${d} ${r.servico.subtipo} fora`);
      igual(taxa(fechados.length - fora(fechados).length, fechados.length), r.noPrazo, `${d} ${r.servico.subtipo} no prazo`);
      igual(mediana(fechados.map(({ f }) => numero(f['Dias com o Crea-SP']))), r.mediana, `${d} ${r.servico.subtipo} mediana`);
      igual(exig.length ? exig.reduce((n, { f }) => n + numero(f['Dias com o solicitante']), 0) / exig.length : null, r.comSolicitante, `${d} ${r.servico.subtipo} com o solicitante`);
    }
    for (const m of q.motivos) assert.equal(rows.filter(({ p, f }) => p['Motivo da exigência'] === m.motivo && p.Tipo === m.tipo && sim(f['Já teve exigência'])).length, m.linhas.length, `${d} ${m.motivo}`);
  }
});

test('gráficos da equipe: cada colaborador pela situação, o calor por regional e trimestre e o canal pela distância dão os do painel', () => {
  const d = hoje, meses = 12, q = quadroAtendimento(base, { anchor: d, period: meses, recorte: SEM_RECORTE }), rows = doPeriodo(d, meses), distancia = distanciaUnidade(dataset);
  for (const c of q.colaboradores) assert.deepEqual(situacoes.map(s => em(rows, s).filter(({ f }) => f.Pessoa === c.id).length), situacoes.map(s => c.partes[s].length), c.nome);
  // A linha "Sem atribuição" da medida "Com a pessoa": só os abertos e os sem pagamento, como a do painel.
  assert.match(dax('Com a pessoa'), /IN \{"Aberto", "Sem pagamento"\}/);
  assert.equal(em(rows, 'Aberto', 'Sem pagamento').filter(({ f }) => f.Pessoa === 'sem-atribuicao').length, q.semAtribuicao.length, 'sem atribuição');
  // O calor usa os meses do gráfico (12 a 24), não o período; o trimestre é o da abertura.
  const doGrafico = naFoto(d).filter(({ p }) => p['Aberto em'] >= inicio(d, Math.min(24, Math.max(12, meses))));
  for (const row of q.calor) for (const t of row.trimestres) {
    const fechados = em(doGrafico.filter(({ p }) => greDe.get(p['Código IBGE']) === nomeGre.get(row.greId) && p.Trimestre === rotuloTrimestre(t.chave)), 'Fechado');
    igual(fechados.length, t.fechados, `${row.greId} ${t.chave}`); igual(taxa(fechados.length - fora(fechados).length, fechados.length), t.noPrazo, `${row.greId} ${t.chave} no prazo`);
  }
  for (const l of q.linhas) assert.equal(protocolos.get(l.p.numero)!['Distância do solicitante'], faixasDistancia[faixaDistancia(distancia.get(l.p.cityId)?.km ?? 0)], l.p.id);
  for (const l of q.linhas) assert.equal(protocolos.get(l.p.numero)!.Canal, l.p.canal, l.p.id);
});

test('demanda: previsão, aberturas na Receita, formatura, ART por 1.000 e pedidos de informação dão os do painel', () => {
  for (const [d, gre] of [['2026-09-30', null], ['2026-03-31', null], ['2026-09-30', 'GRE2']] as const) {
    const recorte = { ...SEM_RECORTE, greId: gre }, dd = demandaAtendimento(dataset, base, { anchor: d, recorte, colaboradores: 1 }), filtro = gre ? { gre } : {};
    const doLugar = [...protocolos.values()].filter(p => noLugar(p['Código IBGE'], filtro) && p['Aberto em'] <= d), noMes = (mes: string, rows = doLugar) => rows.filter(p => p.Mês === mes).length;
    const m0 = mesAntes(d, 0), entre = (de: number, ate: number) => doLugar.filter(p => p.Mês >= mesAntes(d, de) && p.Mês <= mesAntes(d, ate)).length;
    const ultimos = entre(11, 0), anteriores = entre(23, 12), tendencia = anteriores > 0 ? ultimos / anteriores : 1;
    igual([1, 2, 3].reduce((n, i) => n + Math.round(noMes(mesAntes(m0, 12 - i)) * tendencia), 0), dd.proximos, `${d} ${gre}: previstos`);
    for (const m of dd.previsao) igual(m.total === null ? Math.round(noMes(mesAntes(`${m.mes}-01`, 12)) * tendencia) : noMes(`${m.mes}-01`), m.total ?? m.previsto, `${d} ${gre}: ${m.mes}`);
    // Aberturas da coorte: de 18 a 6 meses antes da data; pediram registro até a data, entre 30 dias antes e 180 depois da abertura.
    const coorte = aberturas.filter(row => noLugar(row['Código IBGE'], filtro) && row['Aberta em'] >= mesAntes(d, 17) && row['Aberta em'] < mesAntes(d, 5));
    igual(coorte.length, dd.conversaoAberturas.aberturas, `${d} ${gre}: coorte`); igual(coorte.filter(row => row['Pediu registro em'] && row['Pediu registro em'] <= d).length, dd.conversaoAberturas.pediram, `${d} ${gre}: pediram`);
    for (const m of dd.aberturas) {
      if (m.aberturas !== null) igual(aberturas.filter(row => noLugar(row['Código IBGE'], filtro) && row.Mês === `${m.mes}-01` && row['Aberta em'] <= d).length, m.aberturas, `${d} ${gre}: aberturas ${m.mes}`);
      igual(doLugar.filter(p => p.Mês === `${m.mes}-01` && p.Serviço === 'Registro de empresa').length, m.pedidos, `${d} ${gre}: pedidos ${m.mes}`);
    }
    for (const m of dd.registros) igual(doLugar.filter(p => p.Mês === `${m.mes}-01` && sim(p['Pedido de registro de profissional'])).length, m.pedidos, `${d} ${gre}: registros ${m.mes}`);
    const ano = String(Number(d.slice(0, 4)) - 1);
    igual(soma(concluintes.filter(row => row.Ano === ano && noLugar(row['Código IBGE'], filtro)), 'Concluintes'), dd.formatura.concluintes, `${d} ${gre}: concluintes`);
    igual(formados.filter(row => row['Ano de conclusão'] === ano && row['Registro em'] <= d && noLugar(row['Código IBGE'], filtro)).length, dd.formatura.registrados, `${d} ${gre}: registrados`);
    for (const m of dd.art) {
      igual(doLugar.filter(p => p.Mês === `${m.mes}-01` && sim(p['Serviço de ART'])).length, m.protocolos, `${d} ${gre}: protocolos de ART ${m.mes}`);
      igual(soma(artsPorMes.filter(row => row.Mês === `${m.mes}-01` && noLugar(row['Código IBGE'], filtro)), 'ARTs'), m.arts, `${d} ${gre}: ARTs ${m.mes}`);
    }
    for (const l of dd.lai) {
      const doAno = ouvidoria.filter(row => row.Data === d && row.Ano === String(l.ano)), lai = doAno.find(row => row.Tipo === 'Pedido de informação')!;
      assert.deepEqual([numero(lai.Quantidade), numero(lai['Respondidos no prazo']), numero(lai.Recursos)], [l.pedidos, l.noPrazo, l.recursos], `${d}: LAI ${l.ano}`);
      for (const [tipo, n] of Object.entries(l.ouvidoria)) assert.equal(numero(doAno.find(row => row.Tipo === tipo)!.Quantidade), n, `${d}: ${tipo} ${l.ano}`);
    }
  }
});

test('status e situações: as colunas de ordem seguem o caminho do protocolo e as cinco situações do painel antigo', () => {
  const lidos = foto.filter(row => row.Data === hoje);
  for (const row of lidos) { assert.equal(numero(row['Ordem do status']), statusProtocolo.indexOf(row.Status as never) + 1, row.Status); assert.equal(numero(row['Ordem da situação']), situacoes.indexOf(row.Situação as never) + 1, row.Situação); }
});

/* ---------- os cartões que não saem dos protocolos: a distância, os coworkings e a ART por 1.000 ---------- */
test('cartões: a distância até a unidade, a ocupação dos coworkings e os protocolos de ART por 1.000 ARTs dão os do painel, agora e um ano antes', () => {
  const ativosCsv = lerCsv('dados/profissionais-ativos.csv'), distanciaDe = new Map(municipios.map(row => [row['Código IBGE'], numero(row['Distância até a unidade (km)'])]));
  const cwMeses = lerCsv('dados/coworkings-meses.csv'), distancia = distanciaUnidade(dataset);
  const ocupacao = (d: string, meses: number) => { const rows = cwMeses.filter(row => row.Mês >= inicio(d, meses) && row.Mês <= d); return taxa(soma(rows, 'Horas usadas'), soma(rows, 'Horas disponíveis')); };
  const artPorMil = (d: string, filtro: Filtro) => {
    const meses = new Set(Array.from({ length: 12 }, (_, i) => mesAntes(d, i)));
    const arts = soma(artsPorMes.filter(row => meses.has(row.Mês) && noLugar(row['Código IBGE'], filtro)), 'ARTs');
    const n = [...protocolos.values()].filter(p => meses.has(p.Mês) && p['Aberto em'] <= d && sim(p['Serviço de ART']) && noLugar(p['Código IBGE'], filtro)).length;
    return arts ? n / arts * 1000 : null;
  };
  const porMil = (rows: { protocolos: number; arts: number }[]) => { const arts = rows.reduce((n, m) => n + m.arts, 0); return arts ? rows.reduce((n, m) => n + m.protocolos, 0) / arts * 1000 : null; };
  for (const [d, meses] of [['2026-09-30', 12], ['2026-06-30', 3]] as const) {
    // A mais de 50 km: a foto dos profissionais ativos na data, pela distância do município, contra o cadastro lido na data.
    const ativos = ativosCsv.filter(row => row.Data === d), doPainel = buildProfissionais(datasetAt(dataset, d)).profissionais.filter(row => situacaoEm(row, d) === 'Ativo');
    igual(soma(ativos, 'Ativos'), doPainel.length, `${d}: ativos`);
    igual(soma(ativos.filter(row => (distanciaDe.get(row['Código IBGE']) ?? 0) > 50), 'Ativos'), doPainel.filter(row => (distancia.get(row.cityId)?.km ?? 0) > 50).length, `${d}: a mais de 50 km`);
    const cw = estruturaDe(datasetAt(dataset, d), null, meses).coworking;
    igual(ocupacao(d, meses), cw.ocupacao, `${d}: ocupação`); igual(ocupacao(fimDoMesUmAnoAntes(d), meses), cw.ocupacaoAntes, `${d}: ocupação um ano antes`);
    for (const gre of [null, 'GRE2'] as const) {
      const art = demandaAtendimento(dataset, base, { anchor: d, recorte: { ...SEM_RECORTE, greId: gre }, colaboradores: 1 }).art, filtro = gre ? { gre } : {};
      igual(artPorMil(d, filtro), porMil(art.slice(-12)), `${d} ${gre}: ART por 1.000`);
      igual(artPorMil(fimDoMesUmAnoAntes(d), filtro), porMil(art.slice(-24, -12)), `${d} ${gre}: ART por 1.000 nos 12 meses anteriores`);
    }
  }
});
