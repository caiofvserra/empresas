import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dataset } from '../src/domain/dataset.ts';
import { defaultFilters } from '../src/domain/types.ts';
import { datasetAt } from '../src/domain/tempo.ts';
import { selectEnterpriseScope } from '../src/enterprise-v10/filters.ts';
import { buildEnterpriseModel } from '../src/enterprise-v10/model.ts';
import { antiguidadeRegistro, artsMensais, cadastroIncompleto, cnaesDoMercado, faixasAntiguidade, idadeCapital, artsPorProfissional, mercadoEmArvore, porCapital, registrosPorCamara, ritmoEconomico, territorio } from '../src/domain/empresas.ts';
import { camaraDaEmpresa, camaraPorCnae, camaras } from '../src/painel/analise.ts';
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
  assert.equal(painelDaPagina('receita'), 'geral');
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

test('painel geral: as abas que ficaram continuam no menu, e Empresas, Profissionais e Fiscalização viraram painéis à parte', () => {
  const src = readFileSync(join(import.meta.dirname, '..', 'src', 'cockpit', 'Cockpit.tsx'), 'utf8');
  const geral = src.slice(src.indexOf('const paginasGeral'), src.indexOf('const paginasEmpresas'));
  for (const id of ['presidencia', 'receita', 'entidades', 'controle', 'atendimento', 'metodo']) assert.ok(geral.includes(`id: '${id}'`), `aba ${id} no painel geral`);
  for (const id of ['cadastro', 'profissionais', 'formacao', 'fiscalizacao', 'malha']) assert.ok(!geral.includes(`id: '${id}'`), `aba ${id} saiu do painel geral`);
});

test('as nove câmaras do Crea-SP aparecem no painel, com empresas em todas e a civil na frente (03/11/2026)', () => {
  assert.deepEqual(camaras, ['Civil', 'Elétrica', 'Mecânica e Metalúrgica', 'Segurança do Trabalho', 'Agronomia', 'Química', 'Ambiental e Sanitária', 'Agrimensura', 'Geologia e Minas']);
  const porCamara = new Map<string, number>();
  for (const camara of camaraDaEmpresa(dataset).values()) porCamara.set(camara, (porCamara.get(camara) ?? 0) + 1);
  for (const camara of camaras) assert.ok((porCamara.get(camara) ?? 0) > 0, `empresas na câmara ${camara}`);
  const civil = porCamara.get('Civil')!, total = sum([...porCamara.values()]);
  assert.ok(civil / total > 0.45 && civil / total < 0.6, `civil com ${civil} de ${total}`);
  for (const code of dataset.companies.map(row => dataset.establishments.find(place => place.companyId === row.id)!.cnaeMain)) assert.ok(camaraPorCnae[code], `CNAE ${code} sem câmara`);
});

test('os painéis de Empresas e de Profissionais não têm atalho para o painel geral (pedido de 03/11/2026)', () => {
  const src = readFileSync(join(import.meta.dirname, '..', 'src', 'cockpit', 'Cockpit.tsx'), 'utf8');
  assert.ok(src.includes("{painel.id === 'geral' && <div className=\"ck-rail-paineis\">"), 'só o painel geral mostra atalhos para os outros painéis');
  const atalhos = src.slice(src.indexOf('const atalhos'), src.indexOf('];', src.indexOf('const atalhos')));
  assert.ok(!atalhos.includes("id: 'geral'"), 'nenhum atalho leva de volta ao painel geral');
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

test('ARTs por modalidade em proporção aos profissionais ativos da mesma modalidade, com a média geral', () => {
  const profissionais = buildProfissionais(dataset).profissionais, anchor = dataset.snapshotDate, arts = dataset.arts.filter(row => row.date <= anchor && row.date > '2025-11-01');
  const r = artsPorProfissional(arts, profissionais, anchor, null, null);
  assert.ok(r.linhas.length >= 3, 'precisa de várias modalidades para comparar');
  assert.equal(sum(r.linhas.map(row => row.arts)), arts.length, 'toda ART entra numa modalidade');
  assert.ok(r.linhas.some(row => row.modalidade === 'Mecânica e metalúrgica'), 'mecânica da ART vira mecânica e metalúrgica do profissional');
  for (const row of r.linhas) if (row.porCem !== null) assert.ok(Math.abs(row.porCem - row.arts / row.ativos * 100) < 1e-9);
  for (let i = 1; i < r.linhas.length; i++) assert.ok((r.linhas[i - 1].porCem ?? -1) >= (r.linhas[i].porCem ?? -1), 'ordem pela taxa');
  const gre = dataset.gres[0].id, local = artsPorProfissional(arts, profissionais, anchor, gre, null);
  assert.ok(sum(local.linhas.map(row => row.ativos)) < sum(r.linhas.map(row => row.ativos)), 'o filtro de regional reduz os profissionais');
});

test('plano B: toda parceria tem um caminho se o acordo não sair, e a ficha e o Método mostram', () => {
  for (const row of parcerias) assert.ok(row.planoB && row.planoB.length > 40, `plano B de ${row.id}`);
  const ui = readFileSync(join(import.meta.dirname, '..', 'src', 'cockpit', 'ui.tsx'), 'utf8'), metodo = readFileSync(join(import.meta.dirname, '..', 'src', 'cockpit', 'PaginaMetodo.tsx'), 'utf8');
  assert.ok(ui.includes('Se o acordo não sair') && ui.includes('.planoB'), 'a ficha precisa mostrar o plano B');
  assert.ok(metodo.includes('row.planoB'), 'o Método precisa listar o plano B');
});

test('painel de Empresas: sem mapa de bolhas, sem rede de sócias e sem quadrado colorido que pareça uma segunda legenda', () => {
  const blocos = readFileSync(join(import.meta.dirname, '..', 'src', 'empresas', 'blocos.tsx'), 'utf8');
  assert.ok(!blocos.includes("type: 'graph'") && !blocos.includes('RedeSocietaria'), 'a rede de empresas sócias saiu');
  assert.ok(!blocos.includes("roseType") && !blocos.includes("coordinateSystem: 'polar'"), 'rosa e barras em círculo saíram');
  assert.ok(!/symbolSize: 6 \+ Math\.sqrt/.test(blocos), 'o mapa de bolhas saiu');
  assert.ok(blocos.includes("map: 'spPainel'") && blocos.includes('geo-rank'), 'o mapa tem o limite dos municípios e a lista das regionais');
  // Quadrado colorido em botão de atalho só se for legenda do gráfico ao lado; os atalhos usam is-acao.
  assert.ok(!/<button (?!className="is-acao")[^>]*><i style=\{\{ background: tokens\./.test(blocos), 'atalho com quadrado colorido parece legenda');
  assert.ok(!/legend:[^\n]*\n[^\n]*tooltip: \{ trigger: 'axis', formatter: \(items: any\[\]\) => \{ const ponto/.test(blocos), 'o ritmo econômico já tem a lista ao lado como legenda');
});
