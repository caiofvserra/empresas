import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { janela } from '../src/painel/analise.ts';
import { buildProfissionais } from '../src/domain/profissionais.ts';
import { buildEntidades } from '../src/domain/entidades.ts';
import { membrosEm } from '../src/domain/pessoas-conselho.ts';
import { alertaNoStatus, buildColegiado, colegiados, prescricaoDe, quadroColegiado, statusEm, statusPendentes } from '../src/domain/colegiado.ts';
import type { Pendente, Tramitacao } from '../src/domain/colegiado.ts';

/**
 * Painel de Gestão do Conselho, refeito com o colegiado (07/11/2026). Seams: a base do colegiado (buildColegiado, statusEm,
 * membrosEm), a leitura na data com o recorte (quadroColegiado) e as duas regras do Caio e da lei (alertaNoStatus, prescricaoDe).
 */
const hoje = dataset.snapshotDate, w = janela(hoje, 12), modelo = buildProfissionais(dataset), base = buildColegiado(dataset);
const todos = { colegiado: null, greId: null, cityId: null };
const ler = (anchor: string, recorte = todos) => { const j = janela(anchor, 12); return quadroColegiado(base, modelo, anchor, j.start, j.prevStart, j.prevEnd, recorte); };
const q = quadroColegiado(base, modelo, hoje, w.start, w.prevStart, w.prevEnd, todos);

test('alerta da fila (decisão do Caio): amarelo de 90 a 120 dias no status, vermelho acima de 120', () => {
  assert.equal(alertaNoStatus(89), null);
  assert.equal(alertaNoStatus(90), 'amarelo');
  assert.equal(alertaNoStatus(120), 'amarelo');
  assert.equal(alertaNoStatus(121), 'vermelho');
});

test('prescrição do auto: cinco anos do fato ou três anos parado, o que vier primeiro; no Plenário, só os três anos parado', () => {
  const auto = base.tramitacoes.find(t => t.processo.tipo === 'Auto de infração' && t.instancia === 'Câmara')!;
  const pendente = (t: Tramitacao, desde: string, prescreveEm: string): Pendente => ({ t: { ...t, processo: { ...t.processo, prescreveEm } }, evento: { status: 'Distribuído ao relator', desde, com: t.relator }, diasNoStatus: 0, diasTotais: 0 });
  assert.deepEqual(prescricaoDe(pendente(auto, '2024-01-10', '2027-05-01')), { em: '2027-01-09', motivo: 'três anos parado' });
  assert.deepEqual(prescricaoDe(pendente(auto, '2025-06-01', '2026-12-01')), { em: '2026-12-01', motivo: 'cinco anos do fato' });
  assert.deepEqual(prescricaoDe(pendente({ ...auto, instancia: 'Plenário' }, '2025-06-01', '2026-12-01')), { em: '2028-05-31', motivo: 'três anos parado' });
  const outro = base.tramitacoes.find(t => t.processo.tipo !== 'Auto de infração')!;
  assert.equal(prescricaoDe({ t: outro, evento: outro.eventos[0], diasNoStatus: 0, diasTotais: 0 }), null, 'só auto de infração prescreve');
});

test('conselheiros: uma pessoa por cadeira em cada data, mandatos de três anos e um terço renovado por ano', () => {
  const entidades = buildEntidades(dataset), cadeiras = entidades.organizacoes.filter(org => org.registradaEm <= hoje).reduce((n, org) => n + org.cadeiras, 0);
  for (const data of ['2024-03-15', hoje]) {
    const membros = membrosEm(entidades, data);
    assert.equal(new Set(membros.map(m => m.cadeira)).size, membros.length, `${data}: ninguém divide cadeira`);
    assert.ok(membros.every(m => m.inicio <= data && m.fim >= data), `${data}: só mandatos em curso`);
  }
  const membros = membrosEm(entidades, hoje);
  assert.equal(membros.length, cadeiras, 'toda cadeira ocupada');
  assert.equal(new Set(membros.map(m => m.terco)).size, 3, 'três terços em exercício');
  assert.ok(membros.every(m => Number(m.fim.slice(0, 4)) - Number(m.inicio.slice(0, 4)) === 2), 'mandato de três anos, de janeiro a dezembro');
  const mulheres = membros.filter(m => m.genero === 'Feminino').length / membros.length;
  assert.ok(mulheres > 0.1 && mulheres < 0.3, `conselheiras: ${mulheres}`);
});

test('tramitação: o caminho do Votenet vai em ordem, termina no voto, e quem está pendente na data entrou e não foi votado', () => {
  for (const t of base.tramitacoes) {
    assert.equal(t.eventos.at(-1)!.status, 'Votado', t.id);
    assert.ok(t.eventos.every((e, i) => i === 0 || e.desde >= t.eventos[i - 1].desde), `${t.id}: eventos em ordem`);
    assert.ok(t.distribuidoEm <= t.assinadoEm && t.assinadoEm <= t.votadoEm, `${t.id}: distribuição, relato e voto em ordem`);
  }
  const t = base.tramitacoes[0];
  assert.equal(statusEm(t, t.votadoEm), null, 'no dia do voto, sai da fila');
  assert.equal(statusEm(t, '2019-01-01'), null, 'antes da entrada, não existe');
  assert.ok(q.pendentes.every(row => row.t.entrada <= hoje && row.t.votadoEm > hoje && statusPendentes.includes(row.evento.status)));
  assert.equal(statusPendentes.reduce((n, s) => n + q.porStatus[s].length, 0), q.pendentes.length, 'os status somam a fila');
});

test('com quem está o processo: cada pendente está com uma pessoa com nome, conselheiro do colegiado ou funcionário da assessoria', () => {
  assert.equal(q.posse.reduce((n, row) => n + row.pendentes.length, 0), q.pendentes.length);
  for (const row of q.posse) {
    assert.ok(row.pessoa.nome.split(' ').length >= 2, row.pessoa.id);
    if (row.pessoa.papel === 'Conselheiro') assert.ok(row.pendentes.every(p => { const m = base.membros.find(x => x.id === row.pessoa.id && x.inicio <= p.evento.desde && x.fim >= p.evento.desde); return m && (p.t.colegiado === 'Plenário' || m.camara === p.t.colegiado); }), `${row.pessoa.nome}: só processos do colegiado em que tinha mandato`);
  }
  assert.ok(q.posse.some(row => row.pessoa.papel === 'Funcionário') && q.posse.some(row => row.pessoa.papel === 'Conselheiro'));
});

test('recorte: o colegiado filtra processos e conselheiros; regional e município filtram só os processos', () => {
  const civil = ler(hoje, { ...todos, colegiado: 'Civil' });
  assert.ok(civil.pendentes.every(row => row.t.colegiado === 'Civil') && civil.pendentes.length < q.pendentes.length);
  assert.ok(civil.membros.every(m => m.camara === 'Civil') && civil.membros.length < q.membros.length);
  const plenario = ler(hoje, { ...todos, colegiado: 'Plenário' });
  assert.ok(plenario.pendentes.every(row => row.t.instancia === 'Plenário'));
  assert.equal(plenario.membros.length, q.membros.length, 'todo conselheiro está no Plenário');
  assert.ok(plenario.autosVotados.every(d => d.processo.recursoEm), 'no Plenário, as decisões são só dos autos que chegaram a ele');
  const gre = dataset.gres[0].id, local = ler(hoje, { ...todos, greId: gre });
  assert.ok(local.pendentes.every(row => row.t.processo.greId === gre) && local.pendentes.length < q.pendentes.length);
  assert.equal(local.membros.length, q.membros.length, 'o conselheiro não é de uma regional');
  assert.deepEqual(colegiados.slice(0, 2), ['Plenário', 'Civil']);
});

test('data passada: nada do que veio depois aparece, e o ritmo fica estável de um ano para o outro', () => {
  const d = '2025-06-30', passado = ler(d);
  assert.ok(passado.votados.every(t => t.votadoEm <= d));
  assert.ok(passado.pendentes.every(row => row.t.entrada <= d && row.evento.desde <= d));
  assert.ok(passado.deliberacoes.every(x => x.data <= d));
  assert.equal(passado.mensal.at(-1)!.month, '2025-06');
  assert.equal(q.mensal.at(-1)!.pendentes, q.pendentes.length, 'o último mês da série é a data');
  assert.ok(Math.abs(q.votados.length - q.votadosAntes) / q.votadosAntes < 0.2, `votados ${q.votadosAntes} e ${q.votados.length}`);
});

test('presença, relato e IA: taxas entre 0 e 100, e o relato com IA é mais rápido que sem', () => {
  assert.ok(q.presenca! > 70 && q.presenca! < 100, `presença ${q.presenca}`);
  assert.ok(q.conselheiros.every(row => row.presencas <= row.sessoes));
  assert.ok(base.sessoes.every(s => s.presentes.every(id => s.membros.includes(id))), 'só está presente quem é do colegiado');
  assert.ok(q.tempoComIa! < q.tempoSemIa!, `com IA ${q.tempoComIa}, sem ${q.tempoSemIa}`);
  assert.ok(q.comIa.every(t => t.ia && t.distribuidoEm >= '2025-07-01'));
});

test('decisões: multa em dobro só na reincidência, multa zerada quando o Plenário reforma, e o trânsito vem depois da decisão', () => {
  for (const d of base.desdobramentos) {
    if (d.desfecho === 'Multa em dobro') assert.ok(d.reincidente, d.processo.id);
    if (d.desfecho.startsWith('Arquivamento')) assert.equal(d.multaCamara, 0, d.processo.id);
    if (d.processo.decisaoPlenario === 'Decisão reformada') assert.equal(d.multaFinal, 0, d.processo.id);
    if (d.transitoEm) assert.ok(d.transitoEm > (d.processo.plenarioEm ?? d.processo.julgadoEm), d.processo.id);
    if (d.pagoEm) assert.ok(d.multaFinal > 0 && d.pagoEm > d.transitoEm!, d.processo.id);
  }
  assert.equal(q.porAlinea.reduce((n, a) => n + a.valor, 0), q.multasAplicadas, 'as alíneas somam as multas');
});

test('deliberações: o conflito é o conselheiro que propõe repasse à organização que o indicou', () => {
  assert.ok(base.deliberacoes.length > 0);
  for (const d of base.deliberacoes) {
    const m = base.membros.find(x => x.id === d.proponente && x.inicio <= d.data && x.fim >= d.data);
    assert.ok(m, `${d.id}: quem propôs tinha mandato`);
    assert.equal(d.conflito, m!.orgId === d.orgId, d.id);
  }
});
