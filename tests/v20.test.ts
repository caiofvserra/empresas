import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { dataset } from '../src/domain/dataset.ts';
import { defaultFilters } from '../src/domain/types.ts';
import { datasReferencia, datasetAt, fiscalizacaoAt } from '../src/domain/tempo.ts';
import { buildProfissionais, buildEmpregoCbo, remuneracaoPorCbo, resumoProfissionais, situacaoEm } from '../src/domain/profissionais.ts';
import { buildFormacao, quadroFormacao } from '../src/domain/formacao.ts';
import { buildEntidades, quadroEntidades } from '../src/domain/entidades.ts';
import { buildConselho, quadroConselho } from '../src/domain/conselho.ts';
import { selectEnterpriseScope } from '../src/enterprise-v10/filters.ts';
import { buildEnterpriseModel } from '../src/enterprise-v10/model.ts';
import { buildFiscalizacao } from '../src/painel/fiscalizacao.ts';
import { PRAZO_RESULTADO, etiquetas, forcasTarefa, resultadosForcas } from '../src/painel/forcas.ts';
import { contratosPublicos } from '../src/painel/analise.ts';
import { LIMITE_ART, malhaFina, regras } from '../src/cockpit/cruzamentos.ts';
import { fichas } from '../src/cockpit/fichas.ts';
import { pageIds } from '../src/cockpit/leitura.ts';
import { coletaDe, coletas, ferramentasIa, fontes } from '../src/observatorio/governanca.ts';

const hoje = dataset.snapshotDate, f = buildFiscalizacao(dataset);
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const days = (from: string, to: string) => (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000;

test('data de referência: a base lida em D só tem o que existia em D e nada é sobrescrito', () => {
  const datas = datasReferencia(dataset);
  assert.ok(datas.length >= 6 && datas.every(value => value < hoje) && datas.every((value, index) => index === 0 || value > datas[index - 1]));
  assert.equal(datasetAt(dataset, hoje), dataset, 'D igual ao corte devolve a própria base');
  const antes = { registros: dataset.registrations.length, arts: dataset.arts.length, acoes: f.acoes.length };
  const d = datas[Math.floor(datas.length / 2)], view = datasetAt(dataset, d);
  assert.equal(datasetAt(dataset, d), view, 'mesma leitura em cache');
  assert.equal(view.snapshotDate, d);
  assert.ok(view.registrations.length <= dataset.registrations.length && view.registrations.every(row => row.startedAt <= d && (!row.ceasedAt || row.ceasedAt <= d)));
  assert.ok(view.arts.every(row => row.date <= d && (!row.endDate || row.endDate <= d)));
  assert.ok(view.contracts.every(row => row.date <= d) && view.movements.every(row => row.date <= d));
  assert.ok(view.invoices.every(row => !row.paymentDate || row.paymentDate <= d), 'pagamento posterior a D ainda não existe em D');
  assert.ok(view.months.every(month => `${month}-01` <= d));
  const fd = fiscalizacaoAt(f, d);
  assert.equal(fd.anchor, d);
  assert.ok(fd.acoes.every(row => row.date <= d && (!row.regularizedAt || row.regularizedAt <= d) && (!row.auto || row.auto.date <= d)));
  assert.ok(fd.acoes.length < f.acoes.length);
  assert.deepEqual({ registros: dataset.registrations.length, arts: dataset.arts.length, acoes: f.acoes.length }, antes, 'a base de hoje não muda ao ler o passado');
  // Um registro cancelado depois de D aparece como ativo em D.
  const cancelado = dataset.registrations.find(row => row.status !== 'Ativo' && row.ceasedAt && row.ceasedAt > d && row.startedAt <= d);
  if (cancelado) assert.equal(view.registrations.find(row => row.id === cancelado.id)?.status, 'Ativo');
});

test('ficha (i): todo bloco e cartão de toda aba tem ficha registrada, e toda ficha registrada é usada', () => {
  const dir = join(import.meta.dirname, '..', 'src', 'cockpit');
  const paginaDe: Record<string, string> = { PaginaPresidencia: 'presidencia', PaginaCadastro: 'cadastro', PaginaProfissionais: 'profissionais', PaginaFormacao: 'formacao', PaginaFiscalizacao: 'fiscalizacao', PaginaMalha: 'malha', PaginaReceita: 'receita', PaginaEntidades: 'entidades', PaginaControle: 'controle', PaginaAtendimento: 'atendimento', PaginaMetodo: 'metodo' };
  const arquivos = readdirSync(dir).filter(name => /^Pagina\w+\.tsx$/.test(name));
  assert.deepEqual(arquivos.map(name => paginaDe[name.replace('.tsx', '')]).sort(), [...pageIds].sort(), 'uma página por aba, sem páginas sobrando');
  const usadas = new Set<string>();
  for (const name of arquivos) {
    const page = paginaDe[name.replace('.tsx', '')], src = readFileSync(join(dir, name), 'utf8');
    const ids = [...src.matchAll(/<Bloco\b[^>]*?\sid="([a-z0-9-]+)"/g)].map(match => match[1]);
    const cards = [...src.matchAll(/\sficha="([a-z0-9-]+)"/g)].map(match => match[1]);
    const soltas = [...src.matchAll(/fichaDe\('(\w+)',\s*'([a-z0-9-]+)'\)/g)].map(match => `${match[1]}.${match[2]}`);
    const norte = [...src.matchAll(/<Norte\b[^>]*?\sarea="(n\d)"/g)].map(match => match[1]);
    const todos = [...ids, ...cards, ...norte].map(id => `${page}.${id}`).concat(soltas);
    assert.ok(todos.length > 0, `${name} tem blocos ou cartões`);
    for (const key of todos) { assert.ok(fichas[key], `ficha ausente: ${key} (${name})`); usadas.add(key); }
  }
  for (const key of Object.keys(fichas)) assert.ok(usadas.has(key), `ficha registrada sem bloco: ${key}`);
  for (const [key, ficha] of Object.entries(fichas)) {
    assert.ok(ficha.mede && ficha.calcula && ficha.fontes && ficha.regra && ficha.limites && ficha.dono, `ficha incompleta: ${key}`);
    assert.ok(!/onda/i.test(JSON.stringify(ficha)), `ficha com linguagem de ondas: ${key}`);
  }
});

test('profissionais: situação, entradas e saídas, adimplência e autoria fecham no recorte e em D', () => {
  const modelo = buildProfissionais(dataset), r = resumoProfissionais(modelo, dataset, null, 12);
  assert.equal(r.ativos.length + r.interrompidos.length + r.cancelados.length, r.registrados.length);
  assert.ok(r.registrados.every(row => row.registroEm <= hoje));
  assert.ok(r.ativos.every(row => situacaoEm(row, hoje) === 'Ativo') && r.cancelados.every(row => situacaoEm(row, hoje) === 'Cancelado'));
  for (const grupos of [r.porModalidade, r.porNivel, r.porGre, r.porGenero, r.porIdade]) assert.equal(sum(grupos.map(group => group.ids.length)), r.ativos.length, 'cada partição dos ativos fecha');
  assert.ok(r.inadimplentes.every(row => row.inadimplenteDesde && row.inadimplenteDesde <= hoje));
  assert.ok(r.taxaAdimplencia === null || (r.taxaAdimplencia >= 0 && r.taxaAdimplencia <= 100));
  assert.equal(sum(r.faixasArt.map(item => item.ids.length)), r.ativos.length, 'faixas de ARTs particionam os ativos, inclusive quem não tem ART');
  assert.ok(r.autores >= r.faixasArt.filter(item => item.nome !== 'nenhuma').reduce((n, item) => n + item.ids.length, 0), 'autores podem incluir não ativos');
  assert.equal(sum(r.mensal.map(row => row.arts)), r.arts.length);
  assert.ok(r.top.every(row => modelo.porId.has(row.id)));
  const gre = dataset.gres[0].id, parcial = resumoProfissionais(modelo, dataset, gre, 12);
  assert.ok(parcial.ativos.every(row => row.greId === gre) && parcial.ativos.length < r.ativos.length);
  // Em D passado: ninguém registrado depois de D, e a autoria só com ARTs até D.
  const d = datasReferencia(dataset)[0], view = datasetAt(dataset, d), modeloD = buildProfissionais(view), rd = resumoProfissionais(modeloD, view, null, 12);
  assert.ok(rd.registrados.every(row => row.registroEm <= d) && rd.arts.every(row => row.date <= d));
  assert.ok(rd.registrados.length <= r.registrados.length);
  const cbo = remuneracaoPorCbo(buildEmpregoCbo(dataset), hoje, null);
  assert.ok(cbo.length > 0 && cbo.every(row => row.estoque >= 0 && row.salario > 0 && row.mes <= hoje.slice(0, 7)), 'emprego por CBO só em agregado, com mês até D');
});

test('formação: três taxas por coorte, fechamento em 24 e 48 meses e tabela por IES', () => {
  const modelo = buildProfissionais(dataset), q = quadroFormacao(buildFormacao(dataset), modelo, dataset, null);
  assert.ok(q.coortes.length >= 5);
  for (const c of q.coortes) {
    assert.ok(c.registradosEm24.length <= c.registrados.length && c.registrados.length <= c.concluintes);
    assert.ok(c.comAtividade.length <= c.registrados.length && c.ativosAdimplentes.length <= c.registrados.length);
    if (c.taxaRegistro24 !== null) assert.ok(Math.abs(c.taxaRegistro24 - c.registradosEm24.length / c.concluintes * 100) < 1e-9);
    if (c.taxaAtividade !== null) assert.ok(c.taxaAtividade >= 0 && c.taxaAtividade <= 100);
    if (c.taxaPermanencia !== null) assert.ok(c.taxaPermanencia >= 0 && c.taxaPermanencia <= 100);
    assert.equal(c.fechada24, days(`${c.ano}-12-31`, hoje) >= 730);
    assert.equal(c.fechada48, days(`${c.ano}-12-31`, hoje) >= 1460);
    if (c.fechada48) assert.ok(c.fechada24);
    assert.ok(c.registrados.every(row => row.anoConclusao === c.ano && row.registroEm <= hoje));
  }
  assert.ok(q.anosFechados.every(ano => q.coortes.find(c => c.ano === ano)!.fechada24));
  const fechados = sum(q.coortes.filter(c => c.fechada24).map(c => c.concluintes));
  assert.ok(fechados < sum(q.coortes.map(c => c.concluintes)), 'há coortes ainda abertas');
  assert.equal(sum(q.porIes.map(row => row.concluintes)), fechados, 'tabela por IES só com coortes fechadas');
  assert.equal(sum(q.porModalidade.map(row => row.concluintes)), fechados);
  assert.equal(sum(q.porCanal.map(row => row.concluintes)), fechados);
  assert.equal(sum(q.porNatureza.map(row => row.concluintes)), fechados);
  assert.ok(q.porIes.every(row => row.ead === null || (row.ead >= 0 && row.ead <= 100)));
});

test('entidades e IES: repasses pagos até D, partição por natureza e canal', () => {
  const e = buildEntidades(dataset), q = quadroEntidades(e, hoje, null);
  assert.ok(q.linhas.length > 0 && q.linhas.every(row => row.convenios + row.contratos + row.patrocinios >= row.vigentes));
  assert.ok(Math.abs(sum(q.linhas.map(row => row.repassadoAno)) - q.total) < 0.01, 'total de 12 meses fecha com as linhas');
  assert.ok(Math.abs(sum(q.linhas.map(row => row.repassadoAntes)) - q.totalAntes) < 0.01);
  assert.ok(q.linhas.every(row => row.repassadoAno + row.repassadoAntes <= row.repassado + 0.01));
  assert.ok(Math.abs(sum(q.repassePorAno.map(row => row.valor)) - sum(q.linhas.map(row => row.repassado))) < 0.01, 'série por ano fecha com o acumulado das organizações');
  assert.equal(sum(q.cadeirasPorNatureza.map(row => row.cadeiras)), q.cadeiras);
  const d = datasReferencia(dataset)[0], qd = quadroEntidades(e, d, null);
  assert.ok(qd.total <= sum(e.repasses.flatMap(row => row.pagamentos.map(p => p.valor))) && qd.anos.every(ano => ano <= d.slice(0, 4)));
});

test('controle interno: despesa por natureza e função fecham, fim e meio particionam, diárias e fornecedores em D', () => {
  const c = buildConselho(dataset), acoes = new Map<string, number>();
  for (const row of f.acoes) acoes.set(row.greId, (acoes.get(row.greId) ?? 0) + 1);
  const q = quadroConselho(c, hoje, null, acoes);
  const porNatureza = sum(q.porNatureza.map(row => row.realizado)), porFuncao = sum(q.porFuncao.map(row => row.realizado));
  assert.ok(Math.abs(porNatureza - porFuncao) < 0.01, 'as duas visões da despesa de 12 meses somam o mesmo');
  assert.ok(Math.abs(q.fimMeioAtual.fim + q.fimMeioAtual.meio - porFuncao) < 0.01);
  assert.ok(q.fimMeioAtual.taxaFim === null || (q.fimMeioAtual.taxaFim >= 0 && q.fimMeioAtual.taxaFim <= 100));
  assert.ok(Math.abs(q.sedeTerritorio.sede + q.sedeTerritorio.territorio - porFuncao) < 0.01);
  assert.ok(q.sedeTerritorio.porGre.every(row => row.custoPorAcao === null ? row.acoes === 0 : row.custoPorAcao >= 0));
  assert.ok(q.diariasMensal.every(row => row.month <= hoje.slice(0, 7)) && q.diarias.every(row => row.valor >= 0));
  assert.ok(q.concentracao === null || (q.concentracao >= 0 && q.concentracao <= 100));
  assert.ok(q.hhi >= 0 && q.hhi <= 10000);
  assert.ok(q.fornecedores.every(row => row.pago <= row.empenhado + 0.01));
  assert.ok(q.orcadoRealizado.every(row => row.execucao === null || row.execucao >= 0));
  assert.ok(q.pessoal.length > 0 && q.pessoal.every(row => row.efetivos >= 0 && row.comissionados >= 0));
  assert.ok(Math.abs(sum(q.receita.map(row => row.realizada)) - sum(q.receitaAnual.filter(row => row.ano === hoje.slice(0, 4)).map(row => row.valor))) >= 0, 'receita anual e de 12 meses são janelas diferentes');
});

test('forças-tarefas: resultado em 180 dias contra grupo de comparação do mesmo tipo e período, lido em D', () => {
  const r = resultadosForcas(dataset, f, null), marcas = etiquetas(f);
  assert.equal(r.length, forcasTarefa.length);
  for (const item of r) {
    assert.ok(item.grupo.acoes.every(row => row.greId === item.ft.greId && row.tipo === item.ft.tema && row.date >= item.ft.inicio && row.date <= item.ft.fim));
    assert.ok(item.comparacao.acoes.every(row => !marcas.has(row.id) && row.tipo === item.ft.tema && row.date >= item.ft.inicio && row.date <= item.ft.fim), 'comparação: mesmo tipo e período, fora de qualquer força-tarefa');
    assert.ok(!item.comparacao.acoes.some(row => item.grupo.acoes.includes(row)));
    assert.ok(item.grupo.regularizadas.every(row => row.regularizedAt && days(row.date, row.regularizedAt) <= PRAZO_RESULTADO));
    assert.equal(item.fechada, item.grupo.acoes.every(row => days(row.date, hoje) >= PRAZO_RESULTADO));
    if (item.grupo.taxa !== null && item.comparacao.taxa !== null) assert.ok(Math.abs(item.diferenca! - (item.grupo.taxa - item.comparacao.taxa)) < 1e-9);
    else assert.equal(item.diferenca, null);
  }
  assert.ok(r.some(item => item.grupo.acoes.length > 0), 'o cenário tem ações dentro de alguma força-tarefa');
  const d = datasReferencia(dataset)[0], rd = resultadosForcas(datasetAt(dataset, d), fiscalizacaoAt(f, d), null);
  assert.ok(rd.every(item => item.grupo.acoes.every(row => row.date <= d)));
});

test('malha fina v2: 11 regras com forma de coleta, regras novas com indícios coerentes', () => {
  const scope = selectEnterpriseScope(dataset, { ...defaultFilters, period: 12 }), model = buildEnterpriseModel(scope);
  const malha = malhaFina(scope, model, f, contratosPublicos(scope, 12));
  assert.equal(regras.length, 14); // 12 da V21 mais as duas regras de convênio da V22 (CNO e licenças), marcadas com parceria
  assert.ok(regras.every(row => ['Interna', 'Automática', 'Convênio'].includes(row.coleta)));
  assert.ok(!regras.some(row => /salário|salario\.com|portal salário/i.test(`${row.fonte} ${row.regra}`)), 'Portal Salário fora');
  assert.ok(malha.autoresAnormais.every(row => row.arts >= Math.max(LIMITE_ART, 3 * malha.medianaArts) && (row.regionais >= 4 || row.empresas >= 5)), 'autor anormal: volume acima do limite e dispersão');
  assert.ok(malha.obrasSemFiscalizacao.every(row => malha.obrasComExecucao.includes(row)), 'sem fiscalização é subconjunto das obras com execução');
  assert.ok(malha.sucessoes.every(row => row.anterior !== row.nova && row.abertaEm >= row.baixaEm));
  assert.ok(malha.nomesSemRegistro.every(id => !model.metadata.activeCompanyIds.includes(id)));
  for (const indicio of malha.indicios) assert.ok(indicio.empresas.every(id => scope.companyIds.has(id)), `${indicio.id} dentro do recorte`);
});

test('método: forma de coleta derivada do atlas e ferramentas de IA ligadas a blocos', () => {
  const porColeta = Object.fromEntries(coletas.map(item => [item, fontes.filter(row => coletaDe(row) === item).length]));
  assert.equal(sum(Object.values(porColeta)), fontes.length);
  assert.ok(porColeta['Automática'] > 0 && porColeta['Convênio'] > 0 && porColeta['Fora da coleta automática'] > 0);
  assert.ok(fontes.filter(row => row.acesso !== 'Público').every(row => coletaDe(row) === 'Convênio'));
  assert.ok(fontes.filter(row => row.acesso === 'Público' && /sob demanda|eventual|descontinuada|a confirmar/i.test(row.rotina)).every(row => coletaDe(row) === 'Fora da coleta automática'));
  assert.ok(fontes.filter(row => row.acesso === 'Público' && /^(mensal|anual|diária|semanal|trimestral)$/i.test(row.rotina)).every(row => coletaDe(row) === 'Automática'));
  assert.ok(!fontes.some(row => /salario\.com\.br/i.test(`${row.fonte} ${row.origem}`)) || fontes.filter(row => /salario\.com\.br/i.test(`${row.fonte} ${row.origem}`)).every(row => coletaDe(row) !== 'Automática'), 'Portal Salário não entra como coleta automática');
  assert.ok(ferramentasIa.length >= 5 && ferramentasIa.every(row => row.nome && row.bloco && row.entrada && row.saida && row.validacao));
  assert.ok(ferramentasIa.every(row => ['No painel', 'Protótipo', 'Planejada'].includes(row.situacao)));
});
