import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dataset } from '../src/domain/dataset.ts';
import { defaultFilters } from '../src/domain/types.ts';
import { selectEnterpriseScope } from '../src/enterprise-v10/filters.ts';
import { buildEnterpriseModel } from '../src/enterprise-v10/model.ts';
import { buildFiscalizacao } from '../src/painel/fiscalizacao.ts';
import { contratosPublicos, janela, resumoFiscal } from '../src/painel/analise.ts';
import { resultadosForcas } from '../src/painel/forcas.ts';
import { malhaFina } from '../src/cockpit/cruzamentos.ts';
import { acoesPorOrigem, destinoAcoes, destinos, quartis, regionaisFiscalizacao } from '../src/domain/painel-fiscalizacao.ts';
import { fichas, parceriasDe } from '../src/cockpit/fichas.ts';
import { pageIdsFiscalizacao, pageIdsGeral, painelDaPagina } from '../src/cockpit/leitura.ts';

const f = buildFiscalizacao(dataset), hoje = dataset.snapshotDate;
const scope = selectEnterpriseScope(dataset, { ...defaultFilters, period: 12 }), model = buildEnterpriseModel(scope);
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

test('painel de Fiscalização: cinco páginas próprias, e Fiscalização e Malha fina saíram do painel geral', () => {
  assert.deepEqual(pageIdsFiscalizacao, ['fiscalizacao', 'resultado', 'malha', 'contratos', 'obras']);
  assert.ok(pageIdsFiscalizacao.every(page => painelDaPagina(page) === 'fiscalizacao'));
  assert.ok(!(pageIdsGeral as string[]).includes('fiscalizacao') && !(pageIdsGeral as string[]).includes('malha'));
  const src = readFileSync(join(import.meta.dirname, '..', 'src', 'cockpit', 'Cockpit.tsx'), 'utf8');
  assert.ok(src.includes("fiscalizacao: { site: 'fiscalizacao.html', entrega: 'painel-fiscalizacao-creasp.html' }"), 'endereço do painel no site e na entrega');
});

test('quartis: mediana, quartis e hastes de 1,5 vez a distância entre os quartis', () => {
  const q = quartis([1, 2, 3, 4, 5, 6, 7, 8, 100])!;
  assert.equal(q.mediana, 5); assert.equal(q.q1, 3); assert.equal(q.q3, 7);
  assert.equal(q.max, 8, 'o caso extremo fica fora da haste'); assert.deepEqual(q.foraMax, [100]);
  assert.equal(quartis([]), null);
});

test('destino e origem das ações fecham com as ações do período', () => {
  const r = resumoFiscal(f, null, 12), partes = destinoAcoes(r.acoes);
  assert.equal(sum(partes.map(row => row.acoes.length)), r.acoes.length);
  for (const row of partes) assert.equal(sum(destinos.map(destino => row.partes[destino].length)), row.acoes.length, `${row.tipo}: as partes somam 100%`);
  const origens = acoesPorOrigem(r.acoes, hoje);
  assert.equal(sum(origens.map(row => row.acoes.length)), r.acoes.length);
  assert.ok(origens.every(row => row.dias.every(dia => dia > 0)), 'a regularização vem depois da ação');
});

test('mapa: as regionais somam as ações do estado, e o filtro de município só reduz', () => {
  const r = resumoFiscal(f, null, 12), t = regionaisFiscalizacao(dataset, f, 12, new Map(), new Map(), null);
  assert.equal(sum(t.linhas.map(row => row.acoes.length)), r.acoes.length);
  assert.equal(sum([...t.cidades.values()]), r.acoes.length);
  const cidade = dataset.cities.find(row => t.cidades.get(row.id))!, local = regionaisFiscalizacao(dataset, f, 12, new Map(), new Map(), cidade.id);
  assert.equal(sum(local.linhas.map(row => row.acoes.length)), t.cidades.get(cidade.id));
});

test('cenário plausível: ações estáveis de um ano para o outro, forças-tarefas com dezenas de ações e menos da metade dos contratos sem ART', () => {
  const w = janela(hoje, 12), atual = f.acoes.filter(row => row.date >= w.start && row.date <= w.end).length, antes = f.acoes.filter(row => row.date >= w.prevStart && row.date <= w.prevEnd).length;
  assert.ok(Math.abs(atual - antes) / antes < 0.2, `ações de um ano para o outro: ${antes} e ${atual}`);
  const r = resumoFiscal(f, null, 12);
  assert.ok(r.taxa !== null && r.taxa > 15 && r.taxa < 60, `regularização entre 15% e 60%: ${r.taxa}`);
  for (const ft of resultadosForcas(dataset, f, null).filter(row => row.fechada)) assert.ok(ft.grupo.acoes.length >= 10, `${ft.ft.id} tem ${ft.grupo.acoes.length} ações`);
  const malha = malhaFina(scope, model, f, contratosPublicos(scope, 12)), semArt = malha.contratosComChave.filter(row => row.vinculo === 'Não identificado').length;
  assert.ok(semArt / malha.contratosComChave.length < 0.5, `contratos sem ART: ${semArt} de ${malha.contratosComChave.length}`);
  assert.ok(malha.volumesArt.length > 0 && malha.limiteArt >= 6);
});

test('fichas do painel de Fiscalização: Tribunal de Contas, cadastro de obras e licenças levam "!" e plano B; nenhum bloco abre o resumo da regional', () => {
  for (const key of ['contratos.tc', 'contratos.k-pago']) assert.deepEqual(parceriasDe(fichas[key]), ['tce-sp'], key);
  for (const key of ['obras.cn', 'obras.cp', 'obras.k-cno', 'obras.k-cnosem']) assert.deepEqual(parceriasDe(fichas[key]), ['rfb-cno'], key);
  for (const key of ['obras.li', 'obras.k-licencas']) assert.deepEqual(parceriasDe(fichas[key]), ['prefeituras', 'bombeiros', 'cetesb'], key);
  for (const page of pageIdsFiscalizacao) assert.ok(Object.keys(fichas).some(key => key.startsWith(`${page}.`)), `fichas da página ${page}`);
  const dir = join(import.meta.dirname, '..', 'src', 'fiscalizacao');
  for (const name of readdirSync(dir).filter(file => file.endsWith('.tsx'))) {
    const src = readFileSync(join(dir, name), 'utf8');
    assert.ok(!src.includes("kind: 'gre'"), `${name} abre o resumo da regional`);
    assert.ok(!/\bdon[oa]s?\b/i.test(src), `${name} usa a palavra dono`);
  }
});
