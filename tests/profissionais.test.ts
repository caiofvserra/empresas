import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dataset } from '../src/domain/dataset.ts';
import { buildEmpregoCbo, buildProfissionais, parteAbaixo, remuneracaoPorCbo, resumoProfissionais, situacaoEm } from '../src/domain/profissionais.ts';
import { buildFormacao, quadroFormacao } from '../src/domain/formacao.ts';
import { buildPericias, quadroPericias } from '../src/domain/parcerias.ts';
import { artPorIdade, empregoMensal, empregoRegionalOcupacao, fluxoMensal, inicioPeriodo, modalidadeNivel, permanenciaPorAno, regionaisProfissionais, transicoes } from '../src/domain/painel-profissionais.ts';
import { fichas, parceriasDe } from '../src/cockpit/fichas.ts';
import { tituloPorCodigo } from '../src/domain/titulos.ts';
import { pageIdsGeral, pageIdsProfissionais, painelDaPagina } from '../src/cockpit/leitura.ts';

const modelo = buildProfissionais(dataset), hoje = dataset.snapshotDate;
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

test('painel de Profissionais: cinco páginas próprias, fora do painel geral', () => {
  assert.deepEqual(pageIdsProfissionais, ['profissionais', 'fluxo', 'atuacao', 'formacao', 'trabalho']);
  assert.ok(pageIdsProfissionais.every(page => painelDaPagina(page) === 'profissionais'));
  assert.ok(!(pageIdsGeral as string[]).includes('profissionais') && !(pageIdsGeral as string[]).includes('formacao'));
  assert.equal(painelDaPagina('presidencia'), 'geral');
  assert.equal(painelDaPagina('mercado'), 'empresas');
});

test('recorte: município e modalidade reduzem os profissionais e as partições fecham', () => {
  const todos = resumoProfissionais(modelo, dataset, null, 12), cidade = dataset.cities[0], civil = resumoProfissionais(modelo, dataset, null, 12, { modalidade: 'Civil' });
  const local = resumoProfissionais(modelo, dataset, cidade.greId, 12, { cityId: cidade.id });
  assert.ok(local.ativos.length > 0 && local.ativos.length < todos.ativos.length);
  assert.ok(local.ativos.every(row => row.cityId === cidade.id));
  assert.ok(civil.ativos.every(row => row.modalidade === 'Civil') && civil.ativos.length < todos.ativos.length);
  assert.ok(civil.arts.every(art => modelo.porId.get(modelo.autoria.get(art.id)!)?.modalidade === 'Civil'));
  const ramos = modalidadeNivel(modelo, dataset, null, {});
  assert.equal(sum(ramos.map(row => row.ativos)), todos.ativos.length, 'modalidade e nível somam os ativos');
});

test('cenário plausível: registros novos sem saltos, base crescendo devagar e civil como a maior ocupação de engenharia', () => {
  const r = resumoProfissionais(modelo, dataset, null, 12);
  const variacao = (r.novos.length - r.novosAntes) / r.novosAntes * 100;
  assert.ok(Math.abs(variacao) < 40, `registros novos variam ${variacao.toFixed(0)}% em um ano`);
  const porAno = (ano: number) => modelo.profissionais.filter(row => row.registroEm.startsWith(String(ano))).length;
  for (let ano = 2015; ano <= 2025; ano++) assert.ok(porAno(ano) < porAno(ano - 1) * 1.5 && porAno(ano) > porAno(ano - 1) / 1.5, `registros de ${ano}`);
  const ativosAntes = r.porNivel.reduce((total, row) => total + row.antes, 0), base = (r.ativos.length - ativosAntes) / ativosAntes * 100;
  assert.ok(base > -2 && base < 8, `a base de ativos muda ${base.toFixed(1)}% em um ano`);
  const cbo = remuneracaoPorCbo(buildEmpregoCbo(dataset), hoje, null).filter(row => row.engenharia).sort((a, b) => b.estoque - a.estoque);
  assert.equal(cbo[0].label, 'Engenheiro civil');
  const q = quadroPericias(buildPericias(dataset, modelo), dataset, modelo, null);
  assert.ok(q.peritosSemRegistroAtivo.length < q.nomeacoes.length * 0.2, 'a maior parte dos peritos tem registro ativo');
});

test('evolução: o fluxo mensal bate com o resumo e as mudanças de situação fecham', () => {
  const r = resumoProfissionais(modelo, dataset, null, 12), meses = fluxoMensal(modelo, dataset, null, {}, 24), inicio = inicioPeriodo(hoje, 12).slice(0, 7);
  assert.equal(meses.length, 24);
  assert.equal(sum(meses.filter(row => row.month >= inicio).map(row => row.novos.length)), r.novos.length);
  assert.equal(sum(meses.filter(row => row.month >= inicio).map(row => row.cancelamentos.length)), r.cancelamentos.length);
  const t = transicoes(modelo, dataset, 12, null, {});
  assert.ok(t.fluxos.every(row => row.de !== row.para));
  const entraram = sum(t.fluxos.filter(row => row.de === 'Sem registro').map(row => row.ids.length));
  assert.equal(entraram, r.novos.length, 'quem não tinha registro no início e tem agora é registro novo');
  for (const row of t.fluxos) for (const id of row.ids) assert.equal(situacaoEm(modelo.porId.get(id)!, hoje), row.para);
  for (const ano of permanenciaPorAno(modelo, dataset, null, {}, 15)) assert.equal(ano.ativos.length + ano.fora.length, ano.registrados.length);
});

test('mapa e ART: as regionais somam os ativos do estado e o calor de ART não passa de 100%', () => {
  const r = resumoProfissionais(modelo, dataset, null, 12), t = regionaisProfissionais(modelo, dataset, 12, {});
  assert.equal(sum(t.linhas.map(row => row.ativos.length)), r.ativos.length);
  assert.equal(sum([...t.cidades.values()]), r.ativos.length);
  for (const row of t.linhas) assert.ok(row.semArt.length <= row.ativos.length && row.inadimplentes.length <= row.ativos.length);
  const a = artPorIdade(modelo, dataset, r.ativos, 12);
  assert.ok(a.celulas.every(cel => cel.comArt.length <= cel.ativos.length));
  const comArt = new Set(r.artsPorModalidade.filter(row => row.arts > 0).map(row => row.modalidade));
  assert.ok(a.linhas.length > 0 && a.linhas.every(linha => comArt.has(linha as never)), 'modalidade sem ART no período fica de fora');
});

test('formação: a atividade é medida no último ano para todas as turmas acompanhadas, sem o zero das turmas antigas', () => {
  const q = quadroFormacao(buildFormacao(dataset), modelo, dataset, null);
  const fechadas = q.coortes.filter(row => row.fechada24);
  assert.ok(fechadas.length >= 5);
  assert.ok(fechadas.every(row => row.taxaAtividade !== null && row.taxaAtividade > 10), 'nenhuma turma com atividade perto de zero por falta de ART antiga no cenário');
  const civil = quadroFormacao(buildFormacao(dataset), modelo, dataset, null, { modalidade: 'Civil' });
  assert.ok(civil.porModalidade.every(row => row.modalidade === 'Civil'));
});

test('emprego em totais: a série mensal e a matriz por regional usam só ocupações de engenharia do recorte', () => {
  const emprego = buildEmpregoCbo(dataset), serie = empregoMensal(emprego, hoje, null, null), civil = empregoMensal(emprego, hoje, null, 'Civil');
  assert.ok(serie.length >= 24 && serie.every(row => row.estoque > 0));
  assert.ok(civil.every((row, index) => row.estoque < serie[index].estoque));
  const m = empregoRegionalOcupacao(emprego, dataset, hoje, null);
  assert.equal(m.celulas.length, m.gres.length * m.ocupacoes.length);
  assert.ok(m.ocupacoes.every(row => row.engenharia));
});

test('fichas do painel de Profissionais: perícias e lista de formados levam "!" e plano B; nenhum texto com "dono" ou resumo da regional', () => {
  for (const key of ['trabalho.pp', 'trabalho.pr', 'trabalho.k-pericias']) assert.deepEqual(parceriasDe(fichas[key]), ['tjsp'], key);
  assert.deepEqual(parceriasDe(fichas['formacao.fp']), ['ies']);
  const dir = join(import.meta.dirname, '..', 'src', 'profissionais');
  for (const name of readdirSync(dir).filter(file => file.endsWith('.tsx'))) {
    const src = readFileSync(join(dir, name), 'utf8');
    assert.ok(!src.includes("kind: 'gre'"), `${name} abre o resumo da regional`);
    assert.ok(!/\bdon[oa]\b/i.test(src), `${name} usa a palavra dono`);
  }
});

test('cenário plausível: a maioria dos RTs responde por uma empresa e o emprego não oscila em ondas', () => {
  const modelo = buildProfissionais(dataset), r = resumoProfissionais(modelo, dataset, null, 12);
  const [uma, , , quatro] = r.cargaRt.map(row => row.ids.length), total = r.cargaRt.reduce((n, row) => n + row.ids.length, 0);
  assert.ok(uma / total > 0.6, 'RT de uma empresa só é a maioria');
  assert.ok(quatro / total < 0.06, 'RT de quatro empresas ou mais é exceção');
  const serie = empregoMensal(buildEmpregoCbo(dataset), dataset.snapshotDate, null, null);
  assert.ok(serie.every(row => Math.abs(row.saldo) / row.estoque < 0.006), 'saldo mensal pequeno perto do estoque');
});

test('salário em caixas e canal cruzado com natureza (03/11/2026)', () => {
  const linhas = remuneracaoPorCbo(buildEmpregoCbo(dataset), dataset.snapshotDate, null).filter(row => row.estoque);
  for (const row of linhas) {
    const f = row.faixa;
    assert.ok(f.p10 < f.p25 && f.p25 < f.p50 && f.p50 < f.p75 && f.p75 < f.p90, `${row.label}: pontos em ordem`);
    assert.ok(Math.abs(parteAbaixo(f, f.p50)! - 50) < 0.5, 'metade dos empregos abaixo da mediana');
  }
  const q = quadroFormacao(buildFormacao(dataset), buildProfissionais(dataset), dataset, null);
  for (const natureza of q.porNatureza) {
    const grupos = q.porCanalNatureza.filter(row => row.natureza === natureza.natureza);
    assert.equal(grupos.reduce((n, row) => n + row.concluintes, 0), natureza.concluintes, `${natureza.natureza}: formados batem`);
  }
});

test('regionais são GREs pelo número, sem nome de cidade', () => {
  assert.ok(dataset.gres.every((gre, index) => gre.name === `GRE ${index + 1}`));
  const r = regionaisProfissionais(modelo, dataset, 12);
  assert.ok(r.linhas.every(row => /^GRE \d+$/.test(row.curto)));
});

test('mapa por município: soma dos municípios bate com a GRE, e município pequeno fica sem taxa', () => {
  const r = regionaisProfissionais(modelo, dataset, 12);
  for (const gre of r.linhas) assert.equal(sum([...r.municipios.values()].filter(row => row.greId === gre.id).map(row => row.ativos.length)), gre.ativos.length);
  for (const row of r.municipios.values()) if (row.ativos.length < 20) assert.equal(row.inadimplencia, null);
});

test('filtro de gênero vale para registro, formados, emprego e salário', () => {
  const todos = resumoProfissionais(modelo, dataset, null, 12), f = resumoProfissionais(modelo, dataset, null, 12, { genero: 'Feminino' }), m = resumoProfissionais(modelo, dataset, null, 12, { genero: 'Masculino' });
  assert.equal(f.ativos.length + m.ativos.length, todos.ativos.length);
  assert.ok(f.ativos.every(row => row.genero === 'Feminino'));
  const formacao = buildFormacao(dataset), conc = (g: 'Feminino' | 'Masculino' | null) => sum(quadroFormacao(formacao, modelo, dataset, null, { genero: g }).coortes.map(row => row.concluintes));
  assert.equal(conc('Feminino') + conc('Masculino'), conc(null));
  const taxaF = quadroFormacao(formacao, modelo, dataset, null, { genero: 'Feminino' }).taxaGeral!, taxaM = quadroFormacao(formacao, modelo, dataset, null, { genero: 'Masculino' }).taxaGeral!;
  assert.ok(taxaF > 8 && taxaF < taxaM, `registro das formadas ${taxaF}`);
  const emprego = buildEmpregoCbo(dataset), cbo = (g: 'Feminino' | 'Masculino' | null) => remuneracaoPorCbo(emprego, hoje, null, g).find(row => row.cbo === '2142-05')!;
  assert.ok(Math.abs(cbo('Feminino').estoque + cbo('Masculino').estoque - cbo(null).estoque) <= 1);
  assert.ok(cbo('Feminino').salario < cbo(null).salario && cbo(null).salario < cbo('Masculino').salario);
  const serie = (g: 'Feminino' | null) => empregoMensal(emprego, hoje, null, null, g).at(-1)!.estoque;
  assert.ok(serie('Feminino') < serie(null) * 0.3);
});

test('título profissional segue o catálogo do Confea; técnico só o de segurança do trabalho', () => {
  assert.ok(modelo.profissionais.every(row => tituloPorCodigo.get(row.titulo)?.modalidade === row.modalidade && tituloPorCodigo.get(row.titulo)?.nivel === row.nivel));
  assert.ok(modelo.profissionais.filter(row => row.nivel === 'Técnico').every(row => row.modalidade === 'Segurança do trabalho'));
  const civil = modalidadeNivel(modelo, dataset, null).find(row => row.modalidade === 'Civil')!.niveis.find(row => row.nivel === 'Engenheiro')!;
  assert.equal(civil.titulos[0].codigo, '111-02-00');
  assert.equal(sum(civil.titulos.map(row => row.ativos.length)), civil.ativos.length);
});
