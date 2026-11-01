import type { Dataset } from '../domain/types';
import { chance, share, sum, toDay } from '../domain/hash';
import type { Acao, Fiscalizacao, Tipo } from './fiscalizacao';

/**
 * V20 · Forças-tarefas: ações fiscais concentradas em um tema, uma regional e um período, com resultado medido contra as demais
 * ações do mesmo tipo e período (grupo de comparação). Camada DEMONSTRATIVA: a lista é fictícia e a etiqueta de cada ação é
 * sorteada por chave. Em produção: a lista de forças-tarefas da SUPFIS (nome, tema, território, início e fim) e um campo de
 * origem na ação fiscal. A leitura é sempre de associação no tempo, não de causa.
 */
export interface ForcaTarefa { id: string; nome: string; tema: Tipo; greId: string; inicio: string; fim: string; descricao: string }
export const forcasTarefa: ForcaTarefa[] = [
  { id: 'FT-01', nome: 'Registro de empresas de instalações · Capital', tema: 'registro', greId: 'GRE5', inicio: '2025-04-01', fim: '2025-06-30', descricao: 'CNPJs com CNAE 4321-5/00 e 4322-3/01 ativos na Receita sem registro: visita e notificação em lote.' },
  { id: 'FT-02', nome: 'Registro de construtoras · Campinas', tema: 'registro', greId: 'GRE2', inicio: '2025-10-01', fim: '2025-12-31', descricao: 'CNPJs de construção civil ativos na Receita sem registro, com contrato público no ano.' },
  { id: 'FT-03', nome: 'Registro em polos industriais · São José dos Campos', tema: 'registro', greId: 'GRE6', inicio: '2025-10-01', fim: '2025-12-31', descricao: 'Indústrias com CNAE da lista e sem registro, a partir do cruzamento com a Receita.' },
  { id: 'FT-04', nome: 'Registro de empresas de projetos · Sorocaba', tema: 'registro', greId: 'GRE11', inicio: '2025-10-01', fim: '2025-12-31', descricao: 'Escritórios de projeto e consultoria sem registro, identificados pelo CNAE e pelo nome.' },
  { id: 'FT-05', nome: 'Registro de empresas de instalações · Capital, 2ª rodada', tema: 'registro', greId: 'GRE5', inicio: '2026-01-01', fim: '2026-03-31', descricao: 'Repetição da FT-01 nos CNPJs que não responderam à primeira notificação.' },
  { id: 'FT-06', nome: 'Obras públicas sem ART · Capital', tema: 'art', greId: 'GRE5', inicio: '2026-04-01', fim: '2026-06-30', descricao: 'Contratos de obra do PNCP sem ART identificada, conferência em campo com o órgão contratante.' },
];
export const PRAZO_RESULTADO = 180;
export const PRAZO_RECEITA = 365;

const etiquetaCache = new WeakMap<Fiscalizacao, Map<string, string>>();
/** Ação → força-tarefa: ação do tema, na regional, dentro do período; 70% delas pertencem à força-tarefa (as demais são a rotina da regional). */
export function etiquetas(f: Fiscalizacao): Map<string, string> {
  const saved = etiquetaCache.get(f); if (saved) return saved;
  const map = new Map<string, string>();
  for (const acao of f.acoes) {
    const ft = forcasTarefa.find(row => row.tema === acao.tipo && row.greId === acao.greId && acao.date >= row.inicio && acao.date <= row.fim);
    if (ft && chance(`ft:${acao.id}`) < 0.7) map.set(acao.id, ft.id);
  }
  etiquetaCache.set(f, map); return map;
}

export interface GrupoResultado { acoes: Acao[]; regularizadas: Acao[]; taxa: number | null; receita: number; empresasPagantes: number; medianaDias: number | null }
export interface ResultadoFt { ft: ForcaTarefa; fechada: boolean; grupo: GrupoResultado; comparacao: GrupoResultado; diferenca: number | null }
const median = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null; };

/**
 * Resultado de cada força-tarefa lido em D: regularizações em até 180 dias da ação e anuidades e multas recebidas em até 365 dias
 * (data do pagamento). Comparação: ações do mesmo tipo e período fora de qualquer força-tarefa, em todo o estado.
 * A força-tarefa só "fecha" quando todas as ações completaram 180 dias em D.
 */
export function resultadosForcas(dataset: Dataset, f: Fiscalizacao, greId: string | null): ResultadoFt[] {
  const anchor = f.anchor, marcas = etiquetas(f);
  const pagosPorEmpresa = new Map<string, { data: string; valor: number }[]>();
  for (const row of dataset.invoices) if (row.paymentDate && row.paidAmount > 0 && row.paymentDate <= anchor) pagosPorEmpresa.set(row.companyId, [...(pagosPorEmpresa.get(row.companyId) ?? []), { data: row.paymentDate, valor: row.paidAmount }]);
  const grupo = (acoes: Acao[]): GrupoResultado => {
    const regularizadas = acoes.filter(row => row.regularizedAt && row.regularizedAt <= anchor && toDay(row.regularizedAt) - toDay(row.date) <= PRAZO_RESULTADO);
    const pagantes = new Set<string>();
    const receita = sum(acoes.map(acao => { const limite = toDay(acao.date) + PRAZO_RECEITA;
      const anuidades = (pagosPorEmpresa.get(acao.companyId) ?? []).filter(pay => pay.data >= acao.date && toDay(pay.data) <= limite);
      const multa = acao.auto?.paidAt && acao.auto.paidAt <= anchor && toDay(acao.auto.paidAt) <= limite ? acao.auto.valor : 0;
      if (anuidades.length || multa) pagantes.add(acao.companyId);
      return sum(anuidades.map(pay => pay.valor)) + multa; }));
    return { acoes, regularizadas, taxa: share(regularizadas.length, acoes.length), receita, empresasPagantes: pagantes.size, medianaDias: median(regularizadas.map(row => toDay(row.regularizedAt!) - toDay(row.date))) };
  };
  return forcasTarefa.filter(ft => ft.inicio <= anchor && (!greId || ft.greId === greId)).map(ft => {
    const mine = f.acoes.filter(row => marcas.get(row.id) === ft.id);
    const outras = f.acoes.filter(row => !marcas.has(row.id) && row.tipo === ft.tema && row.date >= ft.inicio && row.date <= ft.fim);
    const g = grupo(mine), c = grupo(outras);
    return { ft, fechada: toDay(ft.fim) + PRAZO_RESULTADO <= toDay(anchor), grupo: g, comparacao: c, diferenca: g.taxa !== null && c.taxa !== null ? g.taxa - c.taxa : null };
  });
}
