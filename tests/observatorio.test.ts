import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { defaultFilters } from '../src/domain/types.ts';
import { selectEnterpriseScope } from '../src/enterprise-v10/filters.ts';
import { buildEnterpriseModel } from '../src/enterprise-v10/model.ts';
import { buildFiscalizacao, tipoLabel } from '../src/painel/fiscalizacao.ts';
import { PRAZO_ATRIBUICAO, PRAZO_CONVERSAO, classesCnae, cobertura, contagens, conversao, correspondencias, fichas, medianaKm, origensIndicio, receitaAtribuivel, tempoAteAgir } from '../src/observatorio/norte.ts';
import { casos, fontes, frentes, lacunas, regrasLeitura, situacoesCaso, situacoesCruzamento } from '../src/observatorio/governanca.ts';

const f = buildFiscalizacao(dataset);
const scope = selectEnterpriseScope(dataset, { ...defaultFilters, period: 12 }), model = buildEnterpriseModel(scope);
const days = (from: string, to: string) => (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000;

test('cobertura: partição Sim/Passível × vigente/histórico/sem correspondência fecha com o universo', () => {
  const c = cobertura(scope, model);
  const todos = classesCnae.flatMap(classe => correspondencias.flatMap(nome => c.porClasse[classe][nome]));
  assert.equal(todos.length, c.total);
  assert.equal(new Set(todos).size, c.total, 'cada CNPJ em uma única célula');
  assert.equal(c.porClasse.Sim['Registro ou visto vigente'].length + c.porClasse.Passível['Registro ou visto vigente'].length, c.vigentes);
  assert.equal(c.taxa, model.metrics.coverage.value, 'mesma cobertura do modelo empresarial');
  assert.equal(c.porGre.reduce((sum, row) => sum + row.total, 0), c.total);
  assert.ok(c.porClasse.Passível['Sem correspondência'].length > 0, 'o cenário tem “Passível” sem correspondência');
});

test('três contagens são unidades diferentes e coerentes', () => {
  const k = contagens(scope, model);
  assert.equal(k.raizes, model.metadata.activeCompanyIds.length);
  assert.ok(k.estabelecimentos >= k.raizes, 'toda raiz vigente tem ao menos um estabelecimento');
  assert.ok(k.registros >= k.estabelecimentos, 'registros e vistos podem ser mais de um por estabelecimento');
});

test('conversão: coorte pela data da ação, 180 dias e só coortes completas na comparação', () => {
  const c = conversao(f, null);
  assert.ok(c.coortes.length > 0 && c.atual?.completa);
  for (const row of c.coortes) {
    assert.ok(row.convertidas.every(acao => acao.regularizedAt && days(acao.date, acao.regularizedAt) <= PRAZO_CONVERSAO));
    assert.ok(row.acoes.every(acao => acao.date >= row.inicio && acao.date <= row.fim));
    if (row.completa) assert.ok(days(row.fim, f.anchor) >= PRAZO_CONVERSAO);
  }
  assert.ok(c.coortes.some(row => !row.completa), 'coortes recentes aparecem em aberto');
});

test('receita atribuível: só pagamentos em até 12 meses de casos abertos por indício', () => {
  const r = receitaAtribuivel(dataset, f, null, 12), acoes = new Map(f.acoes.map(row => [row.id, row]));
  assert.ok(r.pagamentos.length > 0);
  for (const row of r.pagamentos) {
    const acao = acoes.get(row.acaoId)!;
    assert.ok(origensIndicio.includes(acao.origem));
    assert.ok(row.data >= acao.date && days(acao.date, row.data) <= PRAZO_ATRIBUICAO);
    assert.equal(acao.companyId, row.companyId);
  }
  assert.ok(Math.abs(r.total - r.anuidades - r.multas) < 0.01);
  assert.ok(Math.abs(r.mensal.reduce((sum, row) => sum + row.valor, 0) - r.total) < 0.01);
});

test('tempo até agir: abertos são censurados, não zero', () => {
  assert.equal(medianaKm([{ dias: 10, agiu: true }, { dias: 20, agiu: false }, { dias: 30, agiu: false }]), null, 'mais da metade sem ação');
  assert.equal(medianaKm([{ dias: 10, agiu: true }, { dias: 20, agiu: true }, { dias: 30, agiu: false }]), 20);
  const t = tempoAteAgir(dataset, f, null, 12, tipoLabel);
  assert.ok(t.esperas.length > 0 && t.abertos > 0);
  assert.ok(t.esperas.every(row => row.dias >= 0));
  assert.equal(t.porGre.reduce((sum, row) => sum + row.n, 0), t.esperas.length);
  if (t.mediana !== null && t.medianaAgidos !== null) assert.ok(t.mediana >= t.medianaAgidos, 'censurar abertos não encurta a mediana');
});

test('método: fichas, regras de leitura, 12 lacunas, 34 casos e 98 fontes', () => {
  assert.deepEqual(Object.keys(fichas).sort(), ['cobertura', 'conversao', 'receita', 'tempo']);
  assert.ok(Object.values(fichas).every(row => row.formula && row.data && row.leitura));
  assert.equal(regrasLeitura.length, 20, 'matriz dos principais cruzamentos do mapa de relações');
  assert.equal(frentes.length, 9, 'oito frentes externas e a base interna');
  const ids = new Set(frentes.map(row => row.id));
  assert.ok(regrasLeitura.every(row => ids.has(row.frente) && row.chave && row.pode && row.naoPode && row.noPainel && situacoesCruzamento.includes(row.situacao)));
  assert.ok(frentes.every(row => row.potencial && row.fontes && row.noPainel && situacoesCruzamento.includes(row.situacao)));
  assert.ok([...ids].every(id => regrasLeitura.some(row => row.frente === id)), 'toda frente tem ao menos um cruzamento na matriz');
  assert.deepEqual(lacunas.map(row => row.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.equal(casos.length, 34);
  assert.ok(casos.every(row => row.onde !== '—'), 'todo caso tem lugar ou destino');
  assert.ok(casos.every(row => situacoesCaso.includes(row.situacao)));
  assert.ok(!casos.some(row => /onda/i.test(row.onde)), 'sem linguagem de ondas');
  assert.ok(lacunas.every(row => !/onda/i.test(`${row.oQueMudou} ${row.falta}`)) && regrasLeitura.every(row => !/onda/i.test(row.noPainel)));
  assert.equal(fontes.length, 98);
});
