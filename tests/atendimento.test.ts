import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { buildProfissionais } from '../src/domain/profissionais.ts';
import { buildConselho } from '../src/domain/conselho.ts';
import { servidores } from '../src/domain/pessoas-conselho.ts';
import { municipiosSp } from '../src/domain/municipios.ts';
import { buildAtendimento, diasUteis, fechadoEm, prazoEm, quadroAtendimento, demandaAtendimento, serieMensal, servicos, situacaoEm, statusEm, tempoComCrea } from '../src/domain/atendimento.ts';
import type { BaseAtendimento, Protocolo } from '../src/domain/atendimento.ts';

/**
 * Painel de Atendimento (07/11/2026), a partir do painel de protocolos que o Crea-SP já usa. Seams: as regras do prazo (diasUteis,
 * tempoComCrea, prazoEm), a leitura do protocolo numa data (statusEm, situacaoEm), a base do cenário (buildAtendimento) e a
 * leitura com o recorte (quadroAtendimento), que as cinco páginas e o pacote Power BI usam.
 */

/** Um protocolo montado à mão: registro de profissional com prazo de 15 dias úteis, aberto numa segunda-feira. */
const protocolo = (eventos: Protocolo['eventos'], extra: Partial<Protocolo> = {}): Protocolo => ({
  id: 'PROT-TESTE', numero: '2026/000001', subtipo: 'Registro com diploma', tipo: 'Registro de profissional', prazo: 15, taxa: 0, solicitante: 'Profissional',
  cityId: '3550308', greId: 'GRE5', unidade: 'São Paulo', canal: 'Portal e chat', abertoEm: eventos[0].desde, eventos, ...extra,
});

test('dias úteis: conta do dia seguinte ao início até o fim, sem sábado, domingo e feriado nacional', () => {
  assert.equal(diasUteis('2026-11-13', '2026-11-16'), 1, 'de sexta para segunda, com o fim de semana no meio');
  assert.equal(diasUteis('2026-11-19', '2026-11-20'), 0, '20 de novembro, Dia da Consciência Negra, é feriado nacional desde 2024');
  assert.equal(diasUteis('2026-11-01', '2026-11-03'), 1, 'o dia 2 é Finados');
  assert.equal(diasUteis('2026-11-09', '2026-11-09'), 0);
  assert.equal(diasUteis('2026-11-09', '2026-11-13'), 4);
});

test('o relógio do prazo para enquanto o protocolo está em exigência com o solicitante ou aguardando pagamento', () => {
  const p = protocolo([
    { status: 'Aguardando pagamento', desde: '2026-11-09', com: null }, // segunda; paga na quarta: 2 dias úteis fora do relógio
    { status: 'Aguardando análise', desde: '2026-11-11', com: null },
    { status: 'Em análise', desde: '2026-11-12', com: 'SRV-1' },
    { status: 'Exigência', desde: '2026-11-16', com: 'SRV-1' }, // do pagamento à exigência: dias 12, 13 e 16 com o Crea-SP
    { status: 'Exigência atendida', desde: '2026-11-23', com: 'SRV-1' }, // uma semana com o solicitante, com o feriado do dia 20
    { status: 'Deferida', desde: '2026-11-25', com: 'SRV-1' },
  ], { taxa: 262 });
  assert.equal(tempoComCrea(p, '2026-11-30'), 3 + 2, 'do dia 11 ao 16 (3 dias úteis) e do dia 23 ao 25 (2)');
  assert.equal(tempoComCrea(p, '2026-11-13'), 2, 'lido no meio do caminho, conta só até a data');
  assert.equal(tempoComCrea(p, '2026-11-10'), 0, 'aguardando pagamento não conta');
});

test('a situação numa data agrupa os status como o painel antigo, e antes da abertura o protocolo não existe', () => {
  const p = protocolo([
    { status: 'Aguardando análise', desde: '2026-03-02', com: null },
    { status: 'Em análise', desde: '2026-03-04', com: 'SRV-1' },
    { status: 'Exigência', desde: '2026-03-10', com: 'SRV-1' },
    { status: 'Exigência atendida', desde: '2026-03-20', com: 'SRV-1' },
    { status: 'Deferida', desde: '2026-03-25', com: 'SRV-1' },
  ]);
  assert.equal(statusEm(p, '2026-03-01'), null);
  assert.equal(situacaoEm(p, '2026-03-01'), null);
  assert.equal(situacaoEm(p, '2026-03-03'), 'Aberto');
  assert.equal(situacaoEm(p, '2026-03-12'), 'Exigência');
  assert.equal(situacaoEm(p, '2026-03-21'), 'Aberto');
  assert.equal(situacaoEm(p, '2026-03-25'), 'Fechado');
  assert.equal(statusEm(p, '2026-03-12')?.com, 'SRV-1');
  assert.equal(situacaoEm(protocolo([{ status: 'Aguardando pagamento', desde: '2026-03-02', com: null }]), '2026-04-01'), 'Sem pagamento');
  assert.equal(situacaoEm(protocolo([{ status: 'Aguardando pagamento', desde: '2026-03-02', com: null }, { status: 'Cancelada', desde: '2026-05-01', com: null }]), '2026-05-01'), 'Cancelado');
});

test('dentro ou fora do prazo: aberto pelo tempo com o Crea-SP contra o prazo do serviço, exigência pelos 30 dias para responder', () => {
  const aberto = protocolo([{ status: 'Aguardando análise', desde: '2026-03-02', com: null }]);
  assert.equal(prazoEm(aberto, '2026-03-20'), 'Dentro do prazo', '14 dias úteis de 15');
  assert.equal(prazoEm(aberto, '2026-03-24'), 'Fora do prazo', '16 dias úteis');
  const exigencia = protocolo([{ status: 'Em análise', desde: '2026-03-02', com: 'SRV-1' }, { status: 'Exigência', desde: '2026-03-03', com: 'SRV-1' }]);
  assert.equal(prazoEm(exigencia, '2026-04-02'), 'Dentro do prazo', '30 dias corridos com o solicitante');
  assert.equal(prazoEm(exigencia, '2026-04-03'), 'Fora do prazo', '31 dias corridos');
  const fechado = protocolo([{ status: 'Em análise', desde: '2026-03-02', com: 'SRV-1' }, { status: 'Deferida', desde: '2026-03-31', com: 'SRV-1' }]);
  assert.equal(prazoEm(fechado, '2026-06-01'), 'Fora do prazo', 'fechado com 21 dias úteis, acima dos 15 do serviço');
  assert.equal(prazoEm(protocolo([{ status: 'Aguardando pagamento', desde: '2026-03-02', com: null }]), '2026-06-01'), null, 'sem pagamento não tem prazo do Crea-SP');
});

/* ---------- A base do cenário ---------- */

const hoje = dataset.snapshotDate, base = buildAtendimento(dataset), inicio = `${dataset.months[0]}-01`;
const doSubtipo = (subtipo: string) => base.protocolos.filter(p => p.subtipo === subtipo);

test('cada registro de profissional concedido no cenário tem o seu protocolo, deferido no dia do registro', () => {
  const registrados = buildProfissionais(dataset).profissionais.filter(p => p.registroEm >= inicio && p.registroEm <= hoje);
  const deferidos = new Map(base.protocolos.filter(p => p.tipo === 'Registro de profissional' && p.profissionalId && /^Registro com/.test(p.subtipo) && statusEm(p, hoje)?.status === 'Deferida').map(p => [p.profissionalId!, p]));
  assert.ok(registrados.length > 100);
  for (const r of registrados) assert.equal(deferidos.get(r.id)?.eventos.at(-1)?.desde, r.registroEm, r.id);
  assert.equal(deferidos.size, registrados.length, 'nenhum registro deferido sem o registro no cadastro');
});

test('o pedido de registro de empresa abre no dia do pedido e é deferido no início do registro; a CAT, na emissão da certidão', () => {
  const pedidos = dataset.registrations.filter(r => r.type === 'Registro' && r.requestedAt >= inicio && r.requestedAt <= hoje);
  const porEmpresa = doSubtipo('Registro de empresa');
  for (const r of pedidos) {
    const p = porEmpresa.find(row => row.companyId === r.companyId && row.abertoEm === r.requestedAt);
    assert.ok(p, r.id);
    if (r.startedAt <= hoje) assert.equal(fechadoEm(p!, hoje), r.startedAt, r.id);
  }
  for (const cao of dataset.caos.filter(c => c.requestedAt >= inicio && c.issuedAt && c.issuedAt <= hoje)) {
    const p = doSubtipo('Certidão de Acervo Técnico').find(row => row.companyId === cao.companyId && row.abertoEm === cao.requestedAt);
    assert.equal(p && fechadoEm(p, hoje), cao.issuedAt, cao.id);
  }
});

test('protocolos nos 645 municípios, com a GRE da tabela oficial, e cada colaborador é do quadro de atendimento da mesma regional ou da sede', () => {
  const municipios = new Map(municipiosSp(dataset).map(m => [m.id, m]));
  assert.equal(new Set(base.protocolos.map(p => p.cityId)).size, 645);
  const quadro = new Map(servidores(buildConselho(dataset), dataset).filter(s => s.funcao === 'Atendimento').map(s => [s.id, s]));
  for (const p of base.protocolos) {
    assert.equal(p.greId, municipios.get(p.cityId)!.greId, p.id);
    assert.ok(servicos.some(s => s.subtipo === p.subtipo && s.tipo === p.tipo && s.prazo === p.prazo), p.id);
    assert.ok(p.eventos.every((e, i) => i === 0 || e.desde >= p.eventos[i - 1].desde), `${p.id}: eventos em ordem`);
    assert.equal(p.eventos[0].desde, p.abertoEm);
    for (const e of p.eventos) if (e.com) { const s = quadro.get(e.com); assert.ok(s && (s.greId === p.greId || s.greId === null), `${p.id}: ${e.com}`); }
  }
  // Volume parecido com o do painel antigo, na escala do cenário: todo mês tem protocolos de todos os tipos com volume.
  for (const mes of dataset.months.slice(0, -1)) for (const tipo of ['Registro de profissional', 'Registro de empresa', 'Serviços de ART', 'Orientação'])
    assert.ok(base.protocolos.filter(p => p.abertoEm.startsWith(mes) && p.tipo === tipo).length >= 5, `${mes} ${tipo}`);
});

/* ---------- A leitura com o recorte ---------- */

const todos = { greId: null, cityId: null, tipo: null, unidade: null };

test('quadro de um cenário pequeno, feito à mão: totais por situação, prazo, mediana, colaboradores e quem está sem atribuição', () => {
  const ev = (status: Protocolo['eventos'][number]['status'], desde: string, com: string | null = null) => ({ status, desde, com });
  const mini: BaseAtendimento = { colaboradores: new Map([['SRV-1', { id: 'SRV-1', nome: 'Ana Souza', cargo: 'Assistente de atendimento', greId: 'GRE5' }]]), protocolos: [
    protocolo([ev('Em análise', '2026-09-01', 'SRV-1'), ev('Deferida', '2026-09-08', 'SRV-1')], { id: 'A' }), // 4 dias úteis (7 de setembro é feriado): no prazo
    protocolo([ev('Em análise', '2026-08-03', 'SRV-1'), ev('Deferida', '2026-09-04', 'SRV-1')], { id: 'B' }), // 24 dias úteis (7 de setembro fica fora): fora do prazo
    protocolo([ev('Aguardando análise', '2026-09-20')], { id: 'C' }), // sem atribuição, 8 dias úteis: dentro do prazo
    protocolo([ev('Aguardando pagamento', '2026-09-25')], { id: 'D', taxa: 262 }),
    protocolo([ev('Em análise', '2026-09-02', 'SRV-1'), ev('Exigência', '2026-09-03', 'SRV-1')], { id: 'E', tipo: 'Serviços de ART', subtipo: 'Regularização de ART', prazo: 20 }),
    protocolo([ev('Aguardando análise', '2025-09-10')], { id: 'F' }), // aberto no ano anterior: fica de fora do período de 12 meses
  ] };
  const q = quadroAtendimento(mini, { anchor: '2026-09-30', period: 1, recorte: todos });
  assert.deepEqual(Object.fromEntries(Object.entries(q.porSituacao).map(([s, rows]) => [s, rows.length])), { Aberto: 1, 'Exigência': 1, 'Sem pagamento': 1, Cancelado: 0, Fechado: 1 }, 'B abriu em agosto, fora do período de um mês');
  const ano = quadroAtendimento(mini, { anchor: '2026-09-30', period: 12, recorte: todos });
  assert.equal(ano.linhas.length, 5);
  assert.equal(ano.noPrazo, 50, 'A no prazo e B fora');
  assert.equal(ano.mediana, (4 + 24) / 2);
  assert.deepEqual(ano.semAtribuicao.map(l => l.p.id).sort(), ['C', 'D']);
  const ana = ano.colaboradores.find(c => c.id === 'SRV-1')!;
  assert.equal(ana.nome, 'Ana Souza');
  assert.deepEqual(ana.linhas.map(l => l.p.id).sort(), ['A', 'B', 'E']);
  assert.deepEqual(ana.fila.map(l => l.p.id), ['E'], 'a fila do colaborador são os abertos e em exigência com ele');
  assert.deepEqual(ano.porTipo.find(t => t.tipo === 'Serviços de ART')!.total, 1);
  assert.equal(ano.porStatus.find(s => s.status === 'Aguardando análise')!.dentro.length, 1);
  // O calor da regional é por trimestre (um mês tem poucos fechados por GRE): A (no prazo) e B (fora) caem no 3º trimestre de 2026.
  assert.equal(ano.trimestres.at(-1), '2026-T3');
  const gre5 = ano.calor.find(c => c.greId === 'GRE5')!.trimestres.at(-1)!;
  assert.deepEqual([gre5.fechados, gre5.noPrazo], [2, 50]);
});

test('série mês a mês dos cartões: abertos no mês, em andamento no fim do mês e fechados no mês, no prazo e pela mediana', () => {
  const ev = (status: Protocolo['eventos'][number]['status'], desde: string, com: string | null = null) => ({ status, desde, com });
  const mini: BaseAtendimento = { colaboradores: new Map(), protocolos: [
    protocolo([ev('Em análise', '2026-09-01', 'SRV-1'), ev('Deferida', '2026-09-08', 'SRV-1')], { id: 'A' }),
    protocolo([ev('Em análise', '2026-08-03', 'SRV-1'), ev('Deferida', '2026-09-04', 'SRV-1')], { id: 'B' }),
    protocolo([ev('Aguardando análise', '2026-09-20')], { id: 'C' }),
    protocolo([ev('Aguardando pagamento', '2026-09-25')], { id: 'D', taxa: 262 }),
    protocolo([ev('Em análise', '2026-09-02', 'SRV-1'), ev('Exigência', '2026-09-03', 'SRV-1')], { id: 'E', tipo: 'Serviços de ART', subtipo: 'Regularização de ART', prazo: 20 }),
    protocolo([ev('Aguardando análise', '2025-09-10')], { id: 'F' }),
  ] };
  const s = serieMensal(mini, { anchor: '2026-09-30', recorte: todos });
  assert.equal(s.length, 24);
  assert.equal(s[0].mes, '2024-10');
  const set = s.at(-1)!, ago = s.at(-2)!, umAno = s.find(m => m.mes === '2025-09')!;
  assert.deepEqual([set.abertos, set.emAndamento, set.fechados, set.noPrazo, set.mediana], [4, 3, 2, 50, 14], 'C, E e F seguem em andamento; A no prazo e B fora');
  assert.deepEqual([ago.abertos, ago.emAndamento, ago.fechados, ago.noPrazo], [1, 2, 0, null]);
  assert.deepEqual([umAno.abertos, umAno.emAndamento], [1, 1]);
  const soArt = serieMensal(mini, { anchor: '2026-09-30', recorte: { ...todos, tipo: 'Serviços de ART' } }).at(-1)!;
  assert.deepEqual([soArt.abertos, soArt.emAndamento], [1, 1], 'o recorte vale para a série');
});

test('o quadro do cenário fecha por partes e o recorte recorta todas as linhas', () => {
  const q = quadroAtendimento(base, { anchor: hoje, period: 12, recorte: todos });
  const soma = (rows: { length: number }[]) => rows.reduce((n, r) => n + r.length, 0);
  assert.equal(soma(Object.values(q.porSituacao)), q.linhas.length);
  assert.equal(q.porTipo.reduce((n, t) => n + t.total, 0), q.linhas.length);
  assert.equal(q.porGre.reduce((n, g) => n + g.total, 0), q.linhas.length);
  assert.equal(q.mensal.reduce((n, m) => n + m.total, 0), q.linhas.length);
  assert.ok(q.noPrazo! > 50 && q.noPrazo! < 90, `no prazo: ${q.noPrazo}`);
  for (const [chave, valor, campo] of [['greId', 'GRE9', 'greId'], ['tipo', 'Serviços de ART', 'tipo'], ['unidade', 'Campinas', 'unidade'], ['cityId', '3509502', 'cityId']] as const) {
    const r = quadroAtendimento(base, { anchor: hoje, period: 12, recorte: { ...todos, [chave]: valor } });
    assert.ok(r.linhas.length > 0 && r.linhas.length < q.linhas.length, chave);
    assert.ok(r.linhas.every(l => l.p[campo] === valor), chave);
  }
});

test('lida numa data passada, a página não vê nada do que veio depois', () => {
  const d = '2025-06-30', q = quadroAtendimento(base, { anchor: d, period: 12, recorte: todos });
  assert.ok(q.linhas.length > 0);
  for (const l of q.linhas) { assert.ok(l.p.abertoEm <= d); assert.equal(l.status, statusEm(l.p, d)!.status); assert.ok(!l.fechadoEm || l.fechadoEm <= d); }
});

/* ---------- Demanda ---------- */

test('demanda: formatura contra registro, aberturas na Receita contra pedidos de registro e a previsão dos três meses seguintes', () => {
  const d = demandaAtendimento(dataset, base, { anchor: hoje, recorte: todos, colaboradores: 100 });
  const ano = Number(hoje.slice(0, 4)) - 1;
  assert.equal(d.formatura.ano, ano);
  assert.equal(d.formatura.registrados, buildProfissionais(dataset).profissionais.filter(p => p.anoConclusao === ano && p.registroEm <= hoje).length);
  assert.ok(d.formatura.registrados < d.formatura.concluintes);
  assert.ok(d.conversaoAberturas.pediram <= d.conversaoAberturas.aberturas && d.conversaoAberturas.aberturas > 50);
  assert.equal(d.conversaoAberturas.semPedido.length, d.conversaoAberturas.aberturas - d.conversaoAberturas.pediram);
  assert.deepEqual(d.previsao.slice(-3).map(m => m.mes), ['2026-10', '2026-11', '2026-12']);
  assert.ok(d.previsao.slice(-3).every(m => m.total === null && m.previsto! > 0) && d.previsao.slice(0, -3).every(m => m.previsto === null));
  assert.equal(d.proximos, d.previsao.slice(-3).reduce((n, m) => n + m.previsto!, 0));
  assert.equal(d.lai.at(-1)!.ano, 2026);
  const gre = demandaAtendimento(dataset, base, { anchor: hoje, recorte: { ...todos, greId: 'GRE9' }, colaboradores: 10 });
  assert.ok(gre.aberturas.reduce((n, m) => n + (m.aberturas ?? 0), 0) < d.aberturas.reduce((n, m) => n + (m.aberturas ?? 0), 0));
  assert.ok(gre.formatura.concluintes < d.formatura.concluintes && gre.formatura.registrados <= gre.formatura.concluintes, 'a formatura segue a instituição de ensino da regional');
  // A Receita publica o cadastro com um mês de atraso: o mês sem arquivo fica vazio, e não zero.
  const ultimaAbertura = dataset.establishments.map(e => e.openedAt).sort().at(-1)!.slice(0, 7);
  assert.ok(d.aberturas.filter(m => m.mes > ultimaAbertura).every(m => m.aberturas === null) && d.aberturas.filter(m => m.mes <= ultimaAbertura).every(m => m.aberturas !== null));
});

test('os últimos meses não perdem protocolos: os que nascem do cadastro e ainda não fecharam entram em andamento na data de corte', () => {
  const s = serieMensal(base, { anchor: hoje, recorte: todos }), [a, b, c, ultimo] = s.slice(-4).map(m => m.abertos);
  assert.ok(ultimo >= (a + b + c) / 3 * 0.8, `o último mês (${ultimo}) não cai mais de 20% contra a média dos três anteriores (${Math.round((a + b + c) / 3)})`);
  const empresas = (mes: string) => base.protocolos.filter(p => p.subtipo === 'Registro de empresa' && p.abertoEm.startsWith(mes)).length;
  assert.ok(empresas(hoje.slice(0, 7)) >= empresas('2026-08') * 0.6, 'pedidos de registro de empresa no último mês');
  const pendentes = base.protocolos.filter(p => p.abertoEm.startsWith(hoje.slice(0, 7)) && ['Aberto', 'Exigência', 'Sem pagamento'].includes(situacaoEm(p, hoje)!));
  assert.ok(pendentes.length > 30, 'boa parte dos abertos no último mês segue em andamento');
});

test('cenário: cada protocolo tem chave e número próprios (a chave sorteia a data, a cidade e o caminho)', () => {
  assert.equal(new Set(base.protocolos.map(p => p.id)).size, base.protocolos.length);
  assert.equal(new Set(base.protocolos.map(p => p.numero)).size, base.protocolos.length);
});
