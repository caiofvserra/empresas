import type { Dataset } from './types';
import type { Acao, Alvo, Fiscalizacao, Origem, Tipo } from '../painel/fiscalizacao';
import { origens } from '../painel/fiscalizacao';
import { janela, tipos } from '../painel/analise';

/**
 * Painel de Fiscalização (03/11/2026): medidas que os blocos novos leem além das que já existiam no painel geral. Tudo é calculado
 * na data escolhida, a partir das ações e dos indícios da camada de fiscalização, sem alterar nenhum valor.
 */
const DAY = 86400000;
const toDay = (date: string) => Math.floor(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / DAY);
const dentro = (date: string | undefined, start: string, end: string) => Boolean(date && date >= start && date <= end);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
export const diasEntre = (de: string, ate: string) => toDay(ate) - toDay(de);

/** Distribuição para o boxplot: mínimo e máximo dentro de 1,5 vez a distância entre os quartis, quartis e mediana. */
export interface Quartis { min: number; q1: number; mediana: number; q3: number; max: number; n: number; foraMin: number[]; foraMax: number[] }
export function quartis(values: number[]): Quartis | null {
  if (!values.length) return null;
  const v = [...values].sort((a, b) => a - b), at = (p: number) => { const i = (v.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return v[lo] + (v[hi] - v[lo]) * (i - lo); };
  const q1 = at(0.25), q3 = at(0.75), iqr = q3 - q1, baixo = q1 - 1.5 * iqr, alto = q3 + 1.5 * iqr;
  const dentroLimite = v.filter(x => x >= baixo && x <= alto);
  return { min: dentroLimite[0], q1, mediana: at(0.5), q3, max: dentroLimite[dentroLimite.length - 1], n: v.length, foraMin: v.filter(x => x < baixo), foraMax: v.filter(x => x > alto) };
}

/** O que aconteceu com cada ação do período, lido na data escolhida. */
export type Destino = 'Regularizou sem auto' | 'Auto lavrado, depois regularizou' | 'Auto lavrado, sem regularizar' | 'Notificada, ainda sem desfecho';
export const destinos: Destino[] = ['Regularizou sem auto', 'Auto lavrado, depois regularizou', 'Auto lavrado, sem regularizar', 'Notificada, ainda sem desfecho'];
export const destinoDe = (acao: Acao): Destino => acao.regularizedAt ? (acao.auto ? 'Auto lavrado, depois regularizou' : 'Regularizou sem auto') : acao.auto ? 'Auto lavrado, sem regularizar' : 'Notificada, ainda sem desfecho';
export interface DestinoTipo { tipo: Tipo; acoes: Acao[]; partes: Record<Destino, Acao[]> }
export function destinoAcoes(acoes: Acao[]): DestinoTipo[] {
  return tipos.map(tipo => { const mine = acoes.filter(row => row.tipo === tipo);
    return { tipo, acoes: mine, partes: Object.fromEntries(destinos.map(destino => [destino, mine.filter(row => destinoDe(row) === destino)])) as Record<Destino, Acao[]> }; }).filter(row => row.acoes.length);
}

/** Ações do período por origem: quantas já regularizaram e em quantos dias (só as que regularizaram entram na distribuição). */
export interface OrigemAcoes { origem: Origem; acoes: Acao[]; regularizadas: Acao[]; dias: number[]; quartis: Quartis | null }
export function acoesPorOrigem(acoes: Acao[], anchor: string): OrigemAcoes[] {
  return origens.map(origem => { const mine = acoes.filter(row => row.origem === origem), regularizadas = mine.filter(row => row.regularizedAt && row.regularizedAt <= anchor);
    const dias = regularizadas.map(row => diasEntre(row.date, row.regularizedAt!));
    return { origem, acoes: mine, regularizadas, dias, quartis: quartis(dias) }; }).filter(row => row.acoes.length);
}

/** Ações dos últimos 24 meses por origem, para a distribuição dos dias até regularizar: o período escolhido pode ter poucas ações regularizadas. */
export function acoes24(f: Fiscalizacao, greId: string | null) { const w = janela(f.anchor, 24); return f.acoes.filter(row => (!greId || row.greId === greId) && dentro(row.date, w.start, w.end)); }

/** Indicador do mapa em cada regional, sempre no estado inteiro (o filtro de regional só aproxima o mapa). */
export interface RegionalFiscal {
  id: string; name: string; curto: string; acoes: Acao[]; autos: Acao[]; regularizadas: Acao[]; taxa: number | null;
  elegiveis: number; porCem: number | null; semAcao: Alvo[]; tempo: number | null; divida: Acao[]; valorDivida: number;
}
export function regionaisFiscalizacao(dataset: Dataset, f: Fiscalizacao, period: number, elegiveis: Map<string, number>, tempo: Map<string, number | null>, cityId: string | null) {
  const w = janela(f.anchor, period), cidades = new Map<string, number>();
  for (const row of f.acoes) if (dentro(row.date, w.start, w.end)) cidades.set(row.cityId, (cidades.get(row.cityId) ?? 0) + 1);
  const noLocal = (row: { cityId: string }) => !cityId || row.cityId === cityId;
  const linhas: RegionalFiscal[] = dataset.gres.map(gre => {
    const acoes = f.acoes.filter(row => row.greId === gre.id && dentro(row.date, w.start, w.end) && noLocal(row));
    const autos = f.acoes.filter(row => row.greId === gre.id && dentro(row.auto?.date, w.start, w.end) && noLocal(row));
    const regularizadas = acoes.filter(row => row.regularizedAt);
    const semAcao = f.alvos.filter(row => row.greId === gre.id && !row.regularizedAt && !row.acaoId && row.since <= f.anchor && noLocal(row));
    const divida = autos.filter(row => row.auto!.status === 'Dívida ativa'), n = elegiveis.get(gre.id) ?? 0;
    return { id: gre.id, name: gre.name, curto: gre.name.split('·')[1]?.trim() ?? gre.name, acoes, autos, regularizadas, taxa: acoes.length ? regularizadas.length / acoes.length * 100 : null,
      elegiveis: n, porCem: n ? acoes.length / n * 100 : null, semAcao, tempo: tempo.get(gre.id) ?? null, divida, valorDivida: sum(divida.map(row => row.auto!.valor)) };
  });
  return { linhas, cidades };
}

/** Indícios que surgiram no período e os dias até a primeira ação, por tipo de indício, para o boxplot. */
export function esperaPorTipo(esperas: { alvo: Alvo; dias: number; agiu: boolean }[]) {
  return tipos.map(tipo => { const mine = esperas.filter(row => row.alvo.tipo === tipo), agiu = mine.filter(row => row.agiu);
    return { tipo, total: mine.length, comAcao: agiu, semAcao: mine.filter(row => !row.agiu), quartis: quartis(agiu.map(row => row.dias)) }; }).filter(row => row.total);
}
