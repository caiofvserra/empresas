import { useMemo } from 'react';
import bruto from '../../public/data/transparencia/financeiro-crea-sp.json';
import type { CockpitCtx } from '../cockpit/contexto';
import { municipiosSp } from '../domain/municipios';
import { arrecadacaoDoMes, comparativoAnual, contratosQueTerminam, diariasNoPeriodo, execucaoDoAno, fornecedoresNoPeriodo, metaMensal, parteDoRecorte, pesosDaArrecadacao, porGrupoEMes, ritmoDoMes, tiposReceita } from '../domain/financeiro';
import type { Financeiro, TipoReceita } from '../domain/financeiro';
import { g } from '../gestao/comum';

/**
 * Leitura do painel Financeiro (07/11/2026). A receita, a despesa, o orçamento, as diárias, os fornecedores e os contratos são
 * reais, da Transparência do Crea-SP, do estado inteiro. A divisão da arrecadação por dia e por município é demonstrativa: em
 * produção, sai da baixa de cada boleto no CreaNet, com o endereço de quem pagou.
 */
export const fin = bruto as unknown as Financeiro;
export const fonteReal = { nome: fin.meta.fonte, url: fin.meta.url, data: fin.meta.capturadoEm };
export const nomesMes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const nomesMesLongo = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const somar = (values: number[]) => values.reduce((a, b) => a + b, 0);
/** Meses ("AAAA-MM") de `n` meses terminando em `ate`. */
export const mesesAte = (ate: string, n: number) => Array.from({ length: n }, (_, index) => { const d = new Date(`${ate}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() - (n - 1 - index)); return d.toISOString().slice(0, 7); });
/** O mês da data de referência, limitado ao último mês que a Transparência já fechou. */
export const mesDaData = (anchor: string) => anchor.slice(0, 7) < fin.meta.ate ? anchor.slice(0, 7) : fin.meta.ate;

const receitaPorTipo = porGrupoEMes(fin.receita), despesaPorGrupo = porGrupoEMes(fin.despesa);
export const receitaDoMes = (mes: string, tipo?: string) => tipo ? receitaPorTipo.get(tipo)?.get(mes) ?? 0 : somar(tiposReceita.map(t => receitaPorTipo.get(t)?.get(mes) ?? 0));
export const despesaDoMes = (mes: string, grupo?: string) => grupo ? despesaPorGrupo.get(grupo)?.get(mes) ?? 0 : somar([...despesaPorGrupo.values()].map(item => item.get(mes) ?? 0));
export const gruposDespesa = ['Pessoal e encargos', 'Benefícios ao pessoal', 'Serviços e materiais', 'Cota-parte ao Confea e à Mútua', 'Tributos', 'Convênios e parcerias', 'Diárias e deslocamento', 'Sentenças e honorários', 'Investimentos', 'Outras despesas'];
export const anosReais = [...new Set(fin.receita.map(([mes]) => mes.slice(0, 4)))].sort();

/** Peso de cada município na arrecadação de cada tipo, no cenário (a regra está em `pesosDaArrecadacao`). */
function pesosPorTipo(ctx: CockpitCtx): Record<TipoReceita, Map<string, number>> {
  const gest = g(ctx), ativos = new Map<string, number>(), estabelecimentos = new Map<string, number>(), vencido = new Map<string, number>(), acoes = new Map<string, number>();
  for (const [id, item] of gest.adimplencia) ativos.set(id, item.ativos.length);
  for (const row of ctx.dataset.establishments) estabelecimentos.set(row.cityId, (estabelecimentos.get(row.cityId) ?? 0) + 1);
  for (const row of gest.carteira.titulos) vencido.set(row.cityId, (vencido.get(row.cityId) ?? 0) + row.valor);
  for (const row of ctx.fEstado.acoes) acoes.set(row.cityId, (acoes.get(row.cityId) ?? 0) + 1);
  return pesosDaArrecadacao({ cidades: municipiosSp(ctx.dataset).map(c => c.id), ativos, estabelecimentos, vencido, acoes });
}

export interface QuadroFinanceiro {
  /** O mês lido (o da data, ou o último fechado na Transparência) e o ano dele. */
  mes: string; ano: number;
  /** Parte do recorte (regional ou município) em cada tipo de receita; 1 sem recorte. */
  parte: Record<TipoReceita, number>;
  pesos: Record<TipoReceita, Map<string, number>>;
  meta: Map<string, number[]>;
}
export function useQuadro(ctx: CockpitCtx): QuadroFinanceiro {
  return useMemo(() => {
    const mes = mesDaData(ctx.anchor), ano = Number(mes.slice(0, 4)), pesos = pesosPorTipo(ctx);
    const cidades = ctx.cidadeId ? new Set([ctx.cidadeId]) : ctx.greId ? new Set(municipiosSp(ctx.dataset).filter(c => c.greId === ctx.greId).map(c => c.id)) : null;
    const parte = Object.fromEntries(tiposReceita.map(t => [t, parteDoRecorte(pesos[t], cidades)])) as Record<TipoReceita, number>;
    return { mes, ano, parte, pesos, meta: metaMensal(fin, ano) };
  }, [ctx.anchor, ctx.greId, ctx.cidadeId, ctx.gestao, ctx.dataset, ctx.fEstado]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** A arrecadação do recorte num mês, por tipo e no total. */
export const arrecadadoNoMes = (q: QuadroFinanceiro, mes: string) => somar(tiposReceita.map(t => receitaDoMes(mes, t) * q.parte[t]));
/** A meta do recorte num mês (índice 0 a 11) do ano lido. */
export const metaDoMes = (q: QuadroFinanceiro, indice: number, tipo?: TipoReceita) => somar((tipo ? [tipo] : tiposReceita).map(t => (q.meta.get(t)?.[indice] ?? 0) * q.parte[t]));
/** Cada dia útil do mês com a arrecadação do recorte por tipo (divisão demonstrativa). */
export function diasDoMes(q: QuadroFinanceiro, mes: string): { dia: number; porTipo: Record<string, number>; total: number }[] {
  return [...arrecadacaoDoMes(fin, mes)].map(([dia, linha]) => { const porTipo = Object.fromEntries(tiposReceita.map(t => [t, (linha[t] ?? 0) * q.parte[t]])); return { dia, porTipo, total: somar(Object.values(porTipo)) }; });
}
export const ritmo = (q: QuadroFinanceiro, mes: string, ate: number) => ritmoDoMes(mes, new Map(diasDoMes(q, mes).map(row => [row.dia, row.total])), metaDoMes(q, Number(mes.slice(5, 7)) - 1), ate);
/** Cada tipo no mês e no acumulado do ano, contra o ano anterior, no recorte. */
export function comparativo(q: QuadroFinanceiro, mes: string) {
  const c = comparativoAnual(fin, mes);
  return tiposReceita.map(tipo => { const item = c.get(tipo) ?? { mes: { atual: 0, antes: 0 }, acumulado: { atual: 0, antes: 0 } }, p = q.parte[tipo];
    return { tipo, mes: { atual: item.mes.atual * p, antes: item.mes.antes * p }, acumulado: { atual: item.acumulado.atual * p, antes: item.acumulado.antes * p } }; });
}
export { contratosQueTerminam, diariasNoPeriodo, execucaoDoAno, fornecedoresNoPeriodo };
