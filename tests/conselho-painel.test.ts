import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dataset } from '../src/domain/dataset.ts';
import { datasetAt } from '../src/domain/tempo.ts';
import { municipiosSp } from '../src/domain/municipios.ts';
import { buildProfissionais } from '../src/domain/profissionais.ts';
import { buildEntidades } from '../src/domain/entidades.ts';
import { buildConselho } from '../src/domain/conselho.ts';
import { buildInstitutionalModel } from '../src/domain/institutional.ts';
import { janela } from '../src/painel/analise.ts';
import { buildCarteira, buildProcessos, camarasConselho, canalPorDistancia, distanciaUnidade, dividaPorSituacao, mesesAteData, municipioDoSolicitante, pisoExecucao, plenario, quadroDivida, receitaAcumulada, vencimentoContratos } from '../src/domain/gestao.ts';
import { fichas, parceriasDe } from '../src/cockpit/fichas.ts';
import { pageIdsAtendimento, pageIdsConselho, pageIdsFinanceiro, pageIdsGeral, painelDaPagina } from '../src/cockpit/leitura.ts';

/**
 * Painel de Gestão do Conselho (06/11/2026). Seams testados: as leituras do domínio que os blocos usam (buildProcessos, quadroDivida,
 * plenario, distanciaUnidade, canalPorDistancia, receitaAcumulada, vencimentoContratos) e a estrutura do painel (páginas, fichas, Cockpit).
 */
const hoje = dataset.snapshotDate, w = janela(hoje, 12), meses = mesesAteData(hoje, 24), todos = { greId: null, cityId: null, camara: null };
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const processos = buildProcessos(dataset), modelo = buildProfissionais(dataset);

test('Financeiro, Atendimento e Conselho: o antigo painel de Gestão do Conselho virou três, cada um no seu HTML (07/11/2026)', () => {
  assert.deepEqual(pageIdsFinanceiro, ['receita', 'orcamento']);
  assert.deepEqual(pageIdsAtendimento, ['atendimento']);
  assert.deepEqual(pageIdsConselho, ['colegiado', 'processos', 'conselheiros', 'decisoes', 'representacao']);
  for (const [paginas, painel] of [[pageIdsFinanceiro, 'financeiro'], [pageIdsAtendimento, 'atendimento'], [pageIdsConselho, 'conselho']] as const) assert.ok(paginas.every(page => painelDaPagina(page) === painel), painel);
  assert.deepEqual(pageIdsGeral, ['presidencia', 'metodo']);
  const src = readFileSync(join(import.meta.dirname, '..', 'src', 'cockpit', 'Cockpit.tsx'), 'utf8'), vite = readFileSync(join(import.meta.dirname, '..', 'vite.config.ts'), 'utf8');
  const build = readFileSync(join(import.meta.dirname, '..', 'scripts', 'build-painel.mjs'), 'utf8');
  for (const painel of ['financeiro', 'atendimento', 'conselho']) {
    assert.ok(src.includes(`${painel}: { site: '${painel}.html', entrega: 'painel-${painel}-creasp.html' }`), `${painel}: endereço no site e na entrega`);
    assert.ok(vite.includes(`${painel}: '${painel}.html'`), `${painel}: entrada do site`);
    assert.ok(build.includes(`'entrega/painel-${painel}-creasp.html'`), `${painel}: HTML da entrega`);
    assert.match(readFileSync(join(import.meta.dirname, '..', `${painel}.html`), 'utf8'), new RegExp(`src/${painel}/main.tsx`));
  }
  // O filtro de colegiado (Plenário ou câmara) só vale no Conselho.
  assert.match(src, /conselho: \{[^}]*filtro: 'colegiado' \}/);
  assert.match(src, /financeiro: \{[^}]*filtro: 'nenhum' \}/);
  assert.match(src, /atendimento: \{[^}]*filtro: 'nenhum' \}/);
  for (const page of [...pageIdsFinanceiro, ...pageIdsAtendimento, ...pageIdsConselho]) assert.ok(Object.keys(fichas).some(key => key.startsWith(`${page}.`)), `fichas da página ${page}`);
  assert.ok(!Object.keys(fichas).some(key => key.startsWith('controle.')), 'a aba Controle virou Orçamento');
});

test('processos do cenário: o auto prescreve cinco anos depois do fato, e o arquivado pela prescrição foi julgado nesse dia', () => {
  assert.ok(processos.filter(row => row.prescreveEm).every(row => Date.parse(row.prescreveEm!) - Date.parse(row.fatoEm!) === 1826 * 86400000));
  assert.ok(processos.filter(row => row.decisao === 'Arquivado pela prescrição').every(row => row.julgadoEm === row.prescreveEm));
});

test('plenário: as cadeiras das organizações se dividem pelas nove câmaras, e a Civil tem menos cadeiras do que a parte dela nos profissionais', () => {
  const entidades = buildEntidades(dataset), linhas = plenario(entidades, modelo, hoje);
  assert.deepEqual(linhas.map(row => row.camara), camarasConselho);
  const cadeiras = sum(entidades.organizacoes.filter(row => row.registradaEm <= hoje).map(row => row.cadeiras));
  assert.equal(sum(linhas.map(row => row.cadeiras)), cadeiras, 'nenhuma cadeira some ou sobra');
  assert.ok(Math.abs(sum(linhas.map(row => row.parteCadeiras ?? 0)) - 100) < 0.01);
  assert.equal(linhas.find(row => row.camara === 'Ambiental e Sanitária')!.parteProfissionais, null, 'a ambiental não tem modalidade própria no registro');
  const civil = linhas.find(row => row.camara === 'Civil')!;
  assert.ok(civil.parteCadeiras! < civil.parteProfissionais!);
});

test('dívida: o piso de execução é cinco anuidades, a cascata fecha e as faixas de idade somam o total', () => {
  assert.equal(pisoExecucao(2026), 3585);
  const carteira = buildCarteira(dataset, modelo), q = quadroDivida(carteira, hoje, todos, w.start, w.prevEnd, meses);
  assert.ok(q.total > 0); assert.equal(Math.round(q.pf + q.pj), Math.round(q.total));
  assert.equal(Math.round(sum(q.idade.map(row => row.abaixo + row.acima))), Math.round(q.total));
  assert.equal(Math.round(sum(q.devedores.map(row => row.valor))), Math.round(q.total));
  const c = q.cascata; assert.equal(Math.round(c.inicio + c.novos - c.recebidos - c.prescritos), Math.round(c.fim), 'início + novos - recebidos - prescritos = fim');
  assert.ok(q.devedores.every(row => row.acimaDoPiso === row.valor >= q.piso));
  assert.ok(q.abaixoDoPiso / q.total > 0.5, 'a maior parte da dívida de anuidade fica abaixo do piso');
  assert.ok(q.coortes.length === 4 && q.coortes.every(row => row.curva[0] !== null));
  for (const row of q.coortes) { const valores = row.curva.filter((v): v is number => v !== null); assert.ok(valores.every((v, i) => i === 0 || v >= valores[i - 1]), `${row.nome}: a curva só sobe`); }
  assert.equal(q.mensal.at(-1)!.valor, q.total);
  const porSituacao = dividaPorSituacao(dataset, q.devedores);
  assert.equal(Math.round(sum(porSituacao.map(row => row.valor))), Math.round(q.pj), 'a situação do CNPJ divide a dívida das empresas');
});

test('atendimento: os 645 municípios têm distância até uma unidade, a capital fica a zero e o canal soma os pedidos', () => {
  const d = distanciaUnidade(dataset), municipios = municipiosSp(dataset);
  assert.equal(d.size, 645);
  const sp = municipios.find(row => row.nome === 'São Paulo')!;
  assert.equal(d.get(sp.id)!.km, 0);
  assert.ok([...d.values()].every(row => row.km >= 0 && row.km < 250));
  const pedidos = buildInstitutionalModel(dataset).serviceRequests, origem = municipioDoSolicitante(dataset);
  assert.ok(pedidos.every(row => municipios.find(m => m.id === origem(row))?.greId === row.greId), 'o solicitante mora na regional que atendeu');
  const linhas = canalPorDistancia(pedidos, d, origem);
  assert.equal(sum(linhas.map(row => row.total)), pedidos.length);
  for (const row of linhas) assert.equal(sum(Object.values(row.porCanal)), row.total);
  const perto = linhas[0], longe = linhas.at(-1)!;
  if (perto.total > 50 && longe.total > 50) assert.ok(perto.porCanal.Presencial / perto.total > longe.porCanal.Presencial / longe.total, 'quem mora longe vai menos à unidade');
});

test('receita e contratos: o acumulado do ano só cresce e para no mês da data, e os vencimentos olham os próximos 12 meses', () => {
  const conselho = buildConselho(dataset), a = receitaAcumulada(conselho, hoje), ultimo = Number(hoje.slice(5, 7));
  assert.equal(a.length, 12);
  assert.ok(a.slice(0, ultimo).every((row, i) => row.realizado !== null && (i === 0 || row.realizado >= a[i - 1].realizado!)));
  assert.ok(a.slice(ultimo).every(row => row.realizado === null));
  const v = vencimentoContratos(conselho, hoje);
  assert.equal(v.length, 12);
  assert.ok(v.every(row => row.contratos.every(c => c.fim.startsWith(row.month) && c.fim >= hoje)));
  const passado = datasetAt(dataset, '2025-06-30');
  assert.ok(receitaAcumulada(buildConselho(passado), '2025-06-30').slice(6).every(row => row.realizado === null));
});

test('fichas do Financeiro, do Atendimento e do Conselho: nenhum bloco leva "!" sem plano B, e nenhuma página abre o resumo da regional nem usa a palavra dono', () => {
  const paginas = [...pageIdsFinanceiro, ...pageIdsAtendimento, ...pageIdsConselho];
  for (const [key, ficha] of Object.entries(fichas).filter(([key]) => paginas.some(page => key.startsWith(`${page}.`)))) for (const id of parceriasDe(ficha)) assert.ok(id, key);
  for (const dir of ['financeiro', 'atendimento', 'conselho', 'gestao'].map(pasta => join(import.meta.dirname, '..', 'src', pasta))) for (const name of readdirSync(dir).filter(file => file.endsWith('.tsx'))) {
    const src = readFileSync(join(dir, name), 'utf8');
    assert.ok(!src.includes("kind: 'gre'"), `${name} abre o resumo da regional`);
    assert.ok(!/\bdon[oa]s?\b/i.test(src), `${name} usa a palavra dono`);
    assert.ok(!/\bGRE \d+ ·|· GRE/.test(src), `${name} escreve a regional com cidade`);
  }
});

test('páginas do Conselho seguem as regras de design dos outros painéis: fonte de 11px, barra com largura máxima, rótulo com corDoTexto, sem "·" e sem gráfico em recorte vazio', () => {
  const dir = join(import.meta.dirname, '..', 'src', 'conselho');
  for (const name of readdirSync(dir).filter(file => file.endsWith('.tsx'))) {
    const src = readFileSync(join(dir, name), 'utf8');
    const pequenas = [...src.matchAll(/fontSize: ?(\d+(?:\.\d+)?)/g)].map(m => Number(m[1])).filter(n => n < 11);
    assert.deepEqual(pequenas, [], `${name}: fonte menor que 11px`);
    assert.ok(!/\b([0-9]|10)px (Lato|Raleway)/.test(src), `${name}: fonte menor que 11px no texto do gráfico`);
    assert.equal((src.match(/type: 'bar'/g) ?? []).length, (src.match(/type: 'bar',[^}]{0,90}barMaxWidth/g) ?? []).length, `${name}: barra sem barMaxWidth`);
    assert.ok(!/'#(FFFFFF|FFF|1A202C)'/i.test(src), `${name}: rótulo com cor fixa, use corDoTexto`);
    assert.ok(!src.includes('·'), `${name}: "·" no texto visível`);
    assert.ok(!src.includes('empty-note'), `${name}: recorte vazio sem o aviso do Bloco`);
  }
});
