import test from 'node:test';
import assert from 'node:assert/strict';
import { diasUteis } from '../src/domain/financeiro.ts';

test('dias úteis do mês descontam fins de semana e feriados nacionais, de São Paulo e móveis', () => {
  assert.equal(diasUteis('2026-09').length, 21, 'setembro de 2026: 7 de setembro numa segunda');
  assert.deepEqual(diasUteis('2026-09').slice(0, 5), [1, 2, 3, 4, 8]);
  assert.equal(diasUteis('2026-04').length, 20, 'abril de 2026: Sexta-feira Santa (3) e Tiradentes (21)');
  assert.equal(diasUteis('2026-02').length, 18, 'fevereiro de 2026: carnaval em 16 e 17');
  assert.equal(diasUteis('2026-06').length, 21, 'junho de 2026: Corpus Christi em 4');
});

import { metaMensal } from '../src/domain/financeiro.ts';
import type { Financeiro } from '../src/domain/financeiro.ts';

const vazio: Financeiro = { meta: { fonte: '', url: '', capturadoEm: '2026-11-07', ate: '2026-10', nota: '' }, receita: [], despesa: [], orcamento: [], caixa: [], diarias: [], fornecedores: [], contratos: [] };
const mesesDe = (ano: number) => Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`);

test('meta do mês: o orçamento reformulado do ano dividido no ritmo do ano anterior, tipo a tipo', () => {
  const fin: Financeiro = { ...vazio,
    receita: mesesDe(2025).map((mes, i) => [mes, 'ART', i === 0 ? 400 : 100] as [string, string, number]),
    orcamento: [{ ano: '2026', tipo: 'receita', grupo: 'ART', inicial: 2500, atual: 3000 }] };
  const meta = metaMensal(fin, 2026);
  assert.equal(meta.get('ART')![0], 800, 'janeiro tinha 400 de 1.500 no ano anterior');
  assert.equal(meta.get('ART')![1], 200);
  assert.equal(meta.get('ART')!.reduce((a, b) => a + b, 0), 3000);
});

test('meta do mês sem ano anterior divide o orçamento em doze partes iguais', () => {
  const fin: Financeiro = { ...vazio, orcamento: [{ ano: '2013', tipo: 'receita', grupo: 'Multas', inicial: 1200, atual: 1200 }] };
  assert.deepEqual(metaMensal(fin, 2013).get('Multas'), Array(12).fill(100));
});

import { ritmoDoMes } from '../src/domain/financeiro.ts';

test('ritmo do mês: quanto falta para a meta e a média por dia útil que resta', () => {
  const porDia = new Map(diasUteis('2026-09').map(dia => [dia, 80]));
  const r = ritmoDoMes('2026-09', porDia, 2100, 10);
  assert.equal(r.arrecadado, 560, 'sete dias úteis até 10 de setembro');
  assert.equal(r.falta, 1540);
  assert.equal(r.uteis, 21);
  assert.equal(r.uteisPassados, 7);
  assert.equal(r.uteisRestantes, 14);
  assert.equal(r.mediaNecessaria, 110);
  assert.equal(r.projecao, 1680, 'no ritmo de 80 por dia útil, o mês fecha em 1.680');
});

test('ritmo do mês com a meta batida não pede média nenhuma', () => {
  const porDia = new Map(diasUteis('2026-09').map(dia => [dia, 200]));
  const r = ritmoDoMes('2026-09', porDia, 2100, 30);
  assert.equal(r.falta, 0);
  assert.equal(r.uteisRestantes, 0);
  assert.equal(r.mediaNecessaria, 0);
});

import { grupoDespesa, tipoReceita } from '../src/domain/financeiro.ts';

test('cada conta de receita do plano dos Creas cai num tipo do painel', () => {
  assert.equal(tipoReceita('6.2.1.2.1.01.01.01.001'), 'ART', 'Anotação de Responsabilidade Técnica');
  assert.equal(tipoReceita('6.2.1.2.1.02.02.01.003'), 'Anuidades', 'anuidade de pessoa jurídica, faixa 3');
  assert.equal(tipoReceita('6.2.1.2.1.08.01.13'), 'Dívida ativa', 'dívida ativa de anuidade PF');
  assert.equal(tipoReceita('6.2.1.2.1.08.02.02'), 'Multas', 'auto de infração de pessoa jurídica');
  assert.equal(tipoReceita('6.2.1.2.1.05.03.03'), 'Serviços e outras', 'acervo técnico');
  assert.equal(tipoReceita('6.2.2.1.1.01.04.05'), null, 'conta de despesa não é receita');
});

test('cada conta de despesa cai num grupo do painel', () => {
  assert.equal(grupoDespesa('6.2.2.1.1.01.01.01.001', 'Salários'), 'Pessoal e encargos');
  assert.equal(grupoDespesa('6.2.2.1.1.01.04.05.002', 'Diarias com Conselheiros'), 'Diárias e deslocamento');
  assert.equal(grupoDespesa('6.2.2.1.1.01.04.08.002', 'Locomoção de Conselheiros'), 'Diárias e deslocamento');
  assert.equal(grupoDespesa('6.2.2.1.1.01.05.02.002', 'Cota Parte Confea'), 'Cota-parte ao Confea e à Mútua');
  assert.equal(grupoDespesa('6.2.2.1.1.01.08.05.001', 'Termos de Colaboração'), 'Convênios e parcerias');
  assert.equal(grupoDespesa('6.2.2.1.1.01.06.01', 'Sentenças Judiciais'), 'Sentenças e honorários');
  assert.equal(grupoDespesa('6.2.2.1.1.01.04.09.005', 'Serviços de Informática'), 'Serviços e materiais');
  assert.equal(grupoDespesa('6.2.2.1.1.02.01.01', 'OBRAS, INSTALAÇÕES E REFORMAS'), 'Investimentos');
});

import { arrecadacaoDoMes } from '../src/domain/financeiro.ts';

test('a arrecadação do mês dividida por dia cai só em dias úteis e soma o total real do mês', () => {
  const fin: Financeiro = { ...vazio, receita: [['2026-09', 'ART', 21000], ['2026-09', 'Anuidades', 4200], ['2026-08', 'ART', 999]] };
  const dias = arrecadacaoDoMes(fin, '2026-09');
  const uteis = new Set(diasUteis('2026-09'));
  assert.ok([...dias.keys()].every(dia => uteis.has(dia)), 'nada em fim de semana nem no 7 de setembro');
  const soma = (tipo: string) => [...dias.values()].reduce((total, linha) => total + (linha[tipo] ?? 0), 0);
  assert.equal(Math.round(soma('ART')), 21000);
  assert.equal(Math.round(soma('Anuidades')), 4200);
  assert.deepEqual(arrecadacaoDoMes(fin, '2026-09'), dias, 'a divisão é a mesma a cada leitura');
});

import { comparativoAnual } from '../src/domain/financeiro.ts';

test('este ano contra o anterior, no mês e no acumulado de janeiro até o mês', () => {
  const linhas: [string, string, number][] = [['2026-01', 'ART', 100], ['2026-02', 'ART', 200], ['2026-03', 'ART', 300], ['2026-04', 'ART', 999],
    ['2025-01', 'ART', 50], ['2025-02', 'ART', 100], ['2025-03', 'ART', 200], ['2024-03', 'ART', 1]];
  const c = comparativoAnual({ ...vazio, receita: linhas }, '2026-03').get('ART')!;
  assert.deepEqual(c.mes, { atual: 300, antes: 200 });
  assert.deepEqual(c.acumulado, { atual: 600, antes: 350 });
});

import { concentracao, contratosQueTerminam, diariasNoPeriodo, fornecedoresNoPeriodo } from '../src/domain/financeiro.ts';

test('diárias no período: soma de cada pessoa só nos meses escolhidos, maior valor primeiro', () => {
  const fin: Financeiro = { ...vazio, diarias: [
    { nome: 'ANA', categoria: 'Conselheiros', meses: [['2026-08', 500, 2], ['2026-09', 300, 1], ['2025-01', 9999, 9]] },
    { nome: 'BRUNO', categoria: 'Empregados', meses: [['2026-09', 1000, 4]] }] };
  const d = diariasNoPeriodo(fin, ['2026-08', '2026-09']);
  assert.deepEqual(d.map(p => [p.nome, p.valor, p.pagamentos, p.meses]), [['BRUNO', 1000, 4, 1], ['ANA', 800, 3, 2]]);
});

test('concentração dos fornecedores pelo índice de Herfindahl, de 0 a 1', () => {
  assert.equal(Math.round(concentracao([50, 30, 20]) * 100) / 100, 0.38, '0,5² + 0,3² + 0,2²');
  assert.equal(concentracao([]), null);
});

test('fornecedores no período: total pago a cada um, maior primeiro', () => {
  const fin: Financeiro = { ...vazio, fornecedores: [
    { nome: 'A LTDA', cnpj: '1', objeto: 'Informática', meses: [['2026-09', 100], ['2024-01', 5000]] },
    { nome: 'B SA', cnpj: '2', objeto: 'Limpeza', meses: [['2026-08', 300]] }] };
  assert.deepEqual(fornecedoresNoPeriodo(fin, ['2026-08', '2026-09']).map(f => [f.nome, f.pago]), [['B SA', 300], ['A LTDA', 100]]);
});

test('contratos vigentes na data que terminam nos próximos meses, o mais próximo primeiro', () => {
  const c = (numero: string, inicio: string, fim: string) => ({ numero, processo: null, cnpj: '', contratada: numero, valor: 1, inicio, fim });
  const fin: Financeiro = { ...vazio, contratos: [c('ja-acabou', '2024-01-01', '2026-08-01'), c('daqui-a-um-ano-e-meio', '2025-01-01', '2028-03-01'), c('em-dezembro', '2025-01-01', '2026-12-15'), c('em-outubro', '2025-01-01', '2026-10-05'), c('nao-comecou', '2026-12-01', '2027-01-01')] };
  assert.deepEqual(contratosQueTerminam(fin, '2026-09-30', 12).map(row => row.numero), ['em-outubro', 'em-dezembro']);
});

import { execucaoDoAno, parteDoRecorte } from '../src/domain/financeiro.ts';

test('execução do orçamento: realizado de janeiro até o mês sobre o orçado reformulado do ano, mês a mês', () => {
  const fin: Financeiro = { ...vazio,
    despesa: [['2026-01', 'Pessoal e encargos', 100], ['2026-02', 'Pessoal e encargos', 100], ['2026-02', 'Investimentos', 50], ['2026-03', 'Pessoal e encargos', 999], ['2025-01', 'Pessoal e encargos', 80], ['2025-02', 'Pessoal e encargos', 90]],
    orcamento: [{ ano: '2026', tipo: 'despesa', grupo: 'Pessoal e encargos', inicial: 1000, atual: 1100 }, { ano: '2026', tipo: 'despesa', grupo: 'Investimentos', inicial: 100, atual: 100 }, { ano: '2026', tipo: 'receita', grupo: 'ART', inicial: 1, atual: 1 }] };
  const e = execucaoDoAno(fin, 'despesa', '2026-02');
  assert.equal(e.orcado, 1200);
  assert.equal(e.realizado, 250);
  assert.deepEqual(e.acumulado.slice(0, 3), [{ mes: '2026-01', realizado: 100, antes: 80 }, { mes: '2026-02', realizado: 250, antes: 170 }, { mes: '2026-03', realizado: null, antes: 170 }]);
});

test('parte do recorte: o peso dos municípios escolhidos sobre o peso do estado', () => {
  const pesos = new Map([['a', 30], ['b', 10], ['c', 60]]);
  assert.equal(parteDoRecorte(pesos, null), 1);
  assert.equal(parteDoRecorte(pesos, new Set(['a', 'b'])), 0.4);
  assert.equal(parteDoRecorte(new Map(), new Set(['a'])), 0);
});
