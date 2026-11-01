import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dataset } from '../src/domain/dataset.ts';
import { defaultFilters } from '../src/domain/types.ts';
import { datasetAt } from '../src/domain/tempo.ts';
import { selectEnterpriseScope } from '../src/enterprise-v10/filters.ts';
import { buildEnterpriseModel } from '../src/enterprise-v10/model.ts';
import { antiguidadeRegistro, artsMensais, cadastroIncompleto, cnaesDoMercado, faixasAntiguidade, idadeCapital, mercadoEmArvore, porCapital, registrosPorCamara, ritmoEconomico, territorio } from '../src/domain/empresas.ts';
import { camaraDaEmpresa, camaraPorCnae } from '../src/painel/analise.ts';
import { buildProfissionais } from '../src/domain/profissionais.ts';
import { buildCredenciamentos, buildJucesp, buildSociosPf, parcerias, quadroCredenciamentos, quadroDenominacao, quadroJucesp } from '../src/domain/parcerias.ts';
import { fichas, parceriasDe } from '../src/cockpit/fichas.ts';
import { pageIdsEmpresas, painelDaPagina } from '../src/cockpit/leitura.ts';
import { datasHistorico } from '../src/observatorio/historico.ts';

const scope = selectEnterpriseScope(dataset, { ...defaultFilters, period: 12 }), model = buildEnterpriseModel(scope);
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

test('painel de Empresas: quatro páginas próprias, separadas do painel geral', () => {
  assert.deepEqual(pageIdsEmpresas, ['mercado', 'evolucao', 'rt', 'vinculos']);
  assert.ok(pageIdsEmpresas.every(page => painelDaPagina(page) === 'empresas'));
  assert.equal(painelDaPagina('fiscalizacao'), 'geral');
});

test('economia, aberturas e registros: 24 meses, todas as séries começam em 100 e o filtro de regional reduz as contagens', () => {
  const r = ritmoEconomico(dataset, null, null, 24), gre = ritmoEconomico(dataset, dataset.gres[0].id, null, 24);
  assert.equal(r.pontos.length, 24);
  for (const serie of Object.values(r.indice)) assert.equal(serie[0], 100);
  assert.ok(r.pontos.every(row => row.aberturas12 >= 0 && row.registros12 >= 0 && row.emprego > 0 && row.credito > 0 && row.pib > 0));
  assert.ok(gre.pontos.every((row, index) => row.aberturas12 <= r.pontos[index].aberturas12 && row.registros12 <= r.pontos[index].registros12));
  // Na data de referência do passado, a série termina no mês daquela data.
  const antes = datasHistorico(dataset)[0], rAntes = ritmoEconomico(datasetAt(dataset, antes), null, null, 24);
  assert.equal(rAntes.pontos.at(-1)?.month, antes.slice(0, 7));
});

test('atividades sem registro: cada linha fecha e a ordem é pelo número sem registro', () => {
  const rows = cnaesDoMercado(scope, model, 12);
  assert.ok(rows.length > 0 && rows.length <= 12);
  for (const row of rows) assert.equal(row.registrados.length + row.semRegistro.length, row.total);
  for (let index = 1; index < rows.length; index++) assert.ok(rows[index - 1].semRegistro.length >= rows[index].semRegistro.length);
});

test('tempo de registro e capital social: as faixas dividem as empresas registradas sem sobra', () => {
  const a = antiguidadeRegistro(scope, model), ativas = model.metadata.activeCompanyIds.length;
  assert.equal(a.faixas.length, faixasAntiguidade.length);
  assert.equal(sum(a.faixas.map(row => row.ids.length)), ativas);
  assert.equal(sum(porCapital(scope, model).map(row => row.ids.length)), ativas);
  const arts = artsMensais(scope);
  assert.equal(arts.length, 24);
  assert.ok(cadastroIncompleto(scope, model).ids.every(id => model.metadata.activeCompanyIds.includes(id)));
});

test('credenciamentos e Junta Comercial: dependem de parceria, ficam marcados com "!" e fecham por empresa', () => {
  const ids = new Set(parcerias.map(row => row.id));
  for (const id of ['jucesp', 'detran', 'inmetro'] as const) assert.ok(ids.has(id), `parceria ${id}`);
  assert.deepEqual(parceriasDe(fichas['vinculos.cr']), ['detran', 'inmetro']);
  assert.deepEqual(parceriasDe(fichas['vinculos.jc']), ['jucesp']);
  assert.deepEqual(parceriasDe(fichas['evolucao.ec']), ['bcb']);
  const c = quadroCredenciamentos(buildCredenciamentos(dataset), dataset, null, null);
  assert.ok(c.total > 0);
  for (const row of c.linhas) assert.equal(row.comRt.length + row.registradasSemRt.length + row.semRegistro.length, row.empresas.length);
  const j = quadroJucesp(buildJucesp(dataset), dataset, null, null);
  assert.ok(j.atos.length > 0);
  const sem = new Set(j.semRegistro);
  assert.ok(j.registradasDepois.every(id => !sem.has(id)) && j.jaRegistradas.every(id => !sem.has(id)));
  assert.equal(sum(j.trimestres.map(row => row.aberturas + row.alteracoes)), j.atos.length);
});

test('painel de Empresas: clicar detalha o item clicado, nunca abre o resumo genérico da regional, e não há "dono" nem "em D" no texto', () => {
  const dir = join(import.meta.dirname, '..', 'src', 'empresas');
  for (const name of readdirSync(dir).filter(file => file.endsWith('.tsx'))) {
    const src = readFileSync(join(dir, name), 'utf8');
    assert.ok(!src.includes("kind: 'gre'"), `${name} abre o resumo da regional`);
    assert.ok(!/\bdon[oa]\b/i.test(src), `${name} usa a palavra dono`);
    assert.ok(!/['"`][^'"`]*\bem D\b[^'"`]*['"`]/.test(src), `${name} mostra "em D" no texto`);
  }
});

test('painel geral: todas as abas do painel geral continuam no menu, e Empresas virou um painel à parte', () => {
  const src = readFileSync(join(import.meta.dirname, '..', 'src', 'cockpit', 'Cockpit.tsx'), 'utf8');
  const geral = src.slice(src.indexOf('const paginasGeral'), src.indexOf('const paginasEmpresas'));
  for (const id of ['presidencia', 'profissionais', 'formacao', 'fiscalizacao', 'malha', 'receita', 'entidades', 'controle', 'atendimento', 'metodo']) assert.ok(geral.includes(`id: '${id}'`), `aba ${id} no painel geral`);
  assert.ok(!geral.includes("id: 'cadastro'"));
});

test('mapa e município: regionais e municípios somam o mesmo mercado, e o filtro de município reduz o recorte', () => {
  const t = territorio(scope, model), elegiveis = model.metadata.eligibleEstablishmentIds.length;
  assert.equal(sum(t.cidades.map(row => row.total)), elegiveis);
  assert.equal(sum(t.gres.map(row => row.total)), elegiveis);
  for (const row of t.cidades) assert.equal(row.registrados.length + row.historico.length + row.semRegistro.length, row.total);
  const cidade = dataset.cities[1], local = selectEnterpriseScope(dataset, { ...defaultFilters, period: 12, cityIds: [cidade.id] });
  assert.ok(local.companies.length > 0 && local.companies.length < scope.companies.length);
  assert.ok(local.establishments.every(row => row.cityId === cidade.id));
  const rGre = ritmoEconomico(dataset, cidade.greId, null, 24), rCidade = ritmoEconomico(dataset, null, null, 24, cidade.id);
  assert.ok(rCidade.pontos.every((row, index) => row.aberturas12 <= rGre.pontos[index].aberturas12 && row.registros12 <= rGre.pontos[index].registros12));
  // O emprego sai em totais por regional: com um município, a série é a da regional dele.
  assert.deepEqual(rCidade.pontos.map(row => row.emprego), rGre.pontos.map(row => row.emprego));
});

test('mapa de árvore, matriz de tempo e capital e calor de registros fecham com as contagens', () => {
  const ramos = mercadoEmArvore(scope, model, camaraPorCnae);
  assert.equal(sum(ramos.map(row => row.total)), sum(cnaesDoMercado(scope, model, Number.MAX_SAFE_INTEGER).map(row => row.total)));
  for (const ramo of ramos) assert.equal(ramo.total, sum(ramo.atividades.map(row => row.total)));
  const m = idadeCapital(scope, model), ativas = model.metadata.activeCompanyIds.length;
  assert.equal(m.celulas.length, 25);
  assert.equal(sum(m.celulas.map(row => row.ids.length)), ativas);
  const r = registrosPorCamara(scope, camaraDaEmpresa(dataset), 24);
  assert.equal(r.months.length, 24);
  for (const linha of r.linhas) assert.equal(linha.total, sum([...linha.porMes.values()].map(ids => ids.length)));
});

test('nome com engenharia: a regra da Lei 5.194/66 olha só empresas com a palavra no nome e conta a diretoria', () => {
  const profissionais = buildProfissionais(dataset), q = quadroDenominacao(buildSociosPf(dataset, profissionais), dataset, profissionais, null, null);
  assert.ok(q.linhas.length > 0);
  assert.ok(q.linhas.every(row => /engenharia|agronomia|engenheir/i.test(row.nome)));
  for (const row of q.linhas) if (row.regra.startsWith('Maioria')) assert.equal(row.atende, row.dirigentes > 0 && row.profissionaisAtivos > row.dirigentes / 2);
  assert.equal(q.atendem.length + q.naoAtendem.length + q.semDirigente.length, q.linhas.length);
  assert.ok(q.naoAtendemRegistradas.every(id => q.naoAtendem.includes(id)));
  assert.deepEqual(parceriasDe(fichas['vinculos.dn']), ['rfb-cpf']);
});

test('painel de Empresas enxuto: sem barra de aviso rolante, sem notas de rodapé nos blocos, explicação no (i)', () => {
  const cockpit = readFileSync(join(import.meta.dirname, '..', 'src', 'cockpit', 'Cockpit.tsx'), 'utf8');
  assert.ok(!cockpit.includes('ck-pulse'), 'a barra de destaques rolante voltou');
  const blocos = readFileSync(join(import.meta.dirname, '..', 'src', 'empresas', 'blocos.tsx'), 'utf8');
  assert.ok(!blocos.includes('kpi-line') && !blocos.includes('side-note'), 'texto corrido voltou para dentro dos blocos');
  const ui = readFileSync(join(import.meta.dirname, '..', 'src', 'cockpit', 'ui.tsx'), 'utf8');
  assert.ok(ui.includes('!ctx.enxuto'), 'a pergunta do bloco precisa ir para o (i) no painel de Empresas');
  const css = readFileSync(join(import.meta.dirname, '..', 'src', 'empresas', 'empresas.css'), 'utf8');
  for (const grade of ['mercado', 'evolucao', 'rt', 'vinculos']) assert.match(css, new RegExp(`\\.ck-grid-${grade} \\{ grid-template-rows: [^;]*minmax\\(0, 1fr\\)`), `a grade ${grade} precisa dividir a altura da tela`);
});
