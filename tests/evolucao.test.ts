import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { buildProfissionais, resumoProfissionais } from '../src/domain/profissionais.ts';
import { buildFiscalizacao } from '../src/painel/fiscalizacao.ts';
import { resumoFiscal } from '../src/painel/analise.ts';
import { seriesFiscalizacao, seriesRegistro, mesesDaSerie } from '../src/domain/series-mensais.ts';
import { comparacoes, variacaoAnual, abrirComEvolucao, anexarEvolucao } from '../src/painel/evolucao.ts';
import type { Evolucao } from '../src/painel/evolucao.ts';

const modelo = buildProfissionais(dataset), f = buildFiscalizacao(dataset);
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

test('evolução: o último mês da série é o valor do cartão', () => {
  const r = resumoProfissionais(modelo, dataset, null, 12), s = seriesRegistro(modelo, dataset, null, {}, 24);
  assert.equal(s.meses.length, 24);
  assert.equal(s.meses.at(-1), dataset.snapshotDate.slice(0, 7));
  assert.equal(s.ativos.at(-1), r.ativos.length);
  assert.equal(s.fora.at(-1), r.interrompidos.length + r.cancelados.length);
  assert.equal(s.adimplencia.at(-1), r.taxaAdimplencia);
  assert.equal(s.mulheres.at(-1), r.mulheres);
  assert.equal(s.rts.at(-1), r.rtAtivos);
  // Um ano antes, o estoque é o mesmo que o cartão usa na variação.
  assert.equal(s.ativos.at(-13), r.porNivel.reduce((n, row) => n + row.antes, 0));
});

test('evolução: fluxos da fiscalização somam o mesmo que o período do cartão', () => {
  const resumo = resumoFiscal(f, null, 12), s = seriesFiscalizacao(f.acoes, f.anchor, null, 24);
  assert.equal(sum(s.acoes.slice(-12)), resumo.acoes.length);
  assert.equal(sum(s.autos.slice(-12)), resumo.autos.length);
  assert.equal(Math.round(sum(s.multas.slice(-12))), Math.round(resumo.aplicada));
  assert.equal(sum(s.regularizacoes.slice(-12)), resumo.regularizacoes.length);
  assert.equal(mesesDaSerie(24), 36);
});

test('evolução: acumulado do ano soma no fluxo e vira "desde dezembro" no estoque', () => {
  const meses = Array.from({ length: 24 }, (_, i) => `${2024 + Math.floor((i + 10) / 12)}-${String((i + 10) % 12 + 1).padStart(2, '0')}`); // nov/2024 a out/2026
  const valores = meses.map((_, i) => i + 1), fmt = String;
  const fluxo = comparacoes({ tipo: 'fluxo', meses, valores, fmt });
  assert.equal(fluxo[2].titulo, 'No acumulado do ano');
  assert.equal(fluxo[2].agora, sum(valores.slice(14))); // jan a out/2026
  assert.equal(fluxo[2].antes, sum(valores.slice(2, 12))); // jan a out/2025
  assert.equal(fluxo[2].quando, 'jan a out/2026');
  const estoque = comparacoes({ tipo: 'estoque', meses, valores, fmt });
  assert.equal(estoque[2].titulo, 'Desde dezembro');
  assert.equal(estoque[2].antes, valores[meses.indexOf('2025-12')]);
  assert.equal(estoque[1].antes, valores[11]);
  const taxa = comparacoes({ tipo: 'taxa', meses, valores: valores.map(v => v / 2), fmt });
  assert.equal(taxa[0].kind, 'pp'); assert.equal(taxa[0].variacao, 0.5);
  assert.equal(variacaoAnual({ tipo: 'fluxo', meses, valores, fmt }, 12).value, (sum(valores.slice(12)) - sum(valores.slice(0, 12))) / sum(valores.slice(0, 12)) * 100);
});

test('evolução: o cartão anexa a série só ao detalhe que ele abre', () => {
  const serie: Evolucao = { tipo: 'estoque', meses: ['2026-01'], valores: [1], fmt: String };
  let aberto: { kind: string; evolucao?: Evolucao } | null = null;
  abrirComEvolucao(serie, () => { aberto = anexarEvolucao({ kind: 'acoes' }); });
  assert.equal(aberto!.evolucao, serie);
  assert.equal(anexarEvolucao({ kind: 'acoes' }).evolucao, undefined);
});

test('evolução: as séries novas dos cartões de Empresas terminam no valor do cartão', async () => {
  const { selectEnterpriseScope } = await import('../src/enterprise-v10/filters.ts');
  const { buildEnterpriseModel } = await import('../src/enterprise-v10/model.ts');
  const { defaultFilters } = await import('../src/domain/types.ts');
  const { cobertura } = await import('../src/observatorio/norte.ts');
  const { pagamento, artsPeriodo, artPorCamara } = await import('../src/cockpit/medidas.ts');
  const { quadroTecnico } = await import('../src/painel/analise.ts');
  const { permanenciaCoorte } = await import('../src/domain/mercado.ts');
  const { seriesEmpresas } = await import('../src/domain/series-empresas.ts');
  const period = 12, scope = selectEnterpriseScope(dataset, { ...defaultFilters, period }), model = buildEnterpriseModel(scope);
  const history = buildEnterpriseModel(selectEnterpriseScope(dataset, { ...defaultFilters, period: 24 }));
  const c = cobertura(scope, model), s = seriesEmpresas(scope, history, c, period);
  assert.equal(s.meses.length, 24);
  assert.equal(s.meses.at(-1), dataset.snapshotDate.slice(0, 7));
  assert.equal(s.cobertura.at(-1), c.taxa);
  assert.equal(s.semRegistro.at(-1), c.porClasse.Sim['Sem correspondência'].length);
  const pay = pagamento(model), ativas = model.metadata.activeCompanyIds;
  assert.equal(s.inadimplentes.at(-1), pay.inadimplentes.length);
  assert.equal(s.adimplencia.at(-1), pay.emDia.length / ativas.length * 100);
  assert.equal(s.comRt.at(-1), model.metrics.rtCoverage.value);
  const qt = quadroTecnico(scope, model, f);
  assert.equal(s.rtBaixado.at(-1), qt.rtBaixado.length);
  const arts = artsPeriodo(scope, period);
  assert.equal(sum(s.arts.slice(-period)), arts.atual.length);
  assert.ok(Math.abs(sum(s.valorArt.slice(-period)) - arts.valor) < 1);
  const semArt = artPorCamara(dataset, model);
  assert.equal(s.semArt.at(-1), semArt.flatMap(row => row.semArt).length / semArt.reduce((n, row) => n + row.ativas.length, 0) * 100);
  assert.equal(s.permanencia.at(-1), permanenciaCoorte(dataset, scope.companyIds, 12).taxa);
  // Nenhuma série fica parada: a evolução tem de mostrar movimento no cenário.
  for (const key of ['cobertura', 'adimplencia', 'comRt', 'semArt', 'permanencia'] as const) assert.ok(new Set(s[key]).size > 3, key);

test('evolução: 60 anos ou mais, RT de 4 empresas e recebidas batem com o cartão', () => {
  const r = resumoProfissionais(modelo, dataset, null, 12), s = seriesRegistro(modelo, dataset, null, {}, 24);
  const sessenta = r.porIdade.at(-1)!.ids.length / r.ativos.length * 100;
  assert.ok(Math.abs(s.sessenta.at(-1)! - sessenta) < 1e-9);
  assert.equal(s.rt4.at(-1), r.cargaRt[3].ids.length);
  const resumo = resumoFiscal(f, null, 12), fs = seriesFiscalizacao(f.acoes, f.anchor, null, 24);
  assert.equal(Math.round(sum(fs.recebidas.slice(-12))), Math.round(resumo.recebida));
});
