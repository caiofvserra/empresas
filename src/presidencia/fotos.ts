import { useEffect, useState } from 'react';
import { dataset } from '../domain/dataset';
import { mesesAteData } from '../domain/gestao';
import { fotoPresidencia, insumosPresidencia } from '../domain/presidencia';
import type { FotoPresidencia } from '../domain/presidencia';

/**
 * As fotos do painel da Presidência (07/11/2026): os indicadores de todos os painéis no fim de cada um dos 12 meses anteriores e na
 * data escolhida. Cada foto lê a base como estava naquele dia e leva de dois a quatro segundos, por isso o painel calcula primeiro a
 * da data, depois a de um ano antes (a comparação dos cartões) e as outras aos poucos, da mais recente para a mais antiga. Nada é
 * guardado na base: as fotos ficam em memória enquanto o painel está aberto.
 */
export interface Presidencia {
  /** Os 13 dias lidos, do mais antigo (um ano antes) à data escolhida. */
  datas: string[];
  /** A foto de cada dia, na ordem de `datas`; nula enquanto não foi calculada ou quando a base ainda não existia naquele dia. */
  fotos: (FotoPresidencia | null)[];
  atual: FotoPresidencia | null; anoAntes: FotoPresidencia | null; completo: boolean;
}
const fimDoMes = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);
/** O fim de cada um dos 12 meses anteriores e a própria data. */
export const datasDaPresidencia = (anchor: string) => mesesAteData(anchor, 13).map((month, index, all) => index === all.length - 1 ? anchor : fimDoMes(month));
/** A ordem do cálculo: a data, um ano antes e o resto do mais recente ao mais antigo. */
export const ordemDoCalculo = (datas: string[]) => [datas.length - 1, 0, ...datas.map((_, index) => index).slice(1, -1).reverse()];

const cache = new Map<string, FotoPresidencia | null>();
const chave = (data: string, periodo: number) => `${data}|${periodo}`;
function calcular(data: string, periodo: number): FotoPresidencia | null {
  const key = chave(data, periodo);
  if (!cache.has(key)) cache.set(key, data < `${dataset.months[0]}-01` ? null : fotoPresidencia(insumosPresidencia(dataset, data, periodo)));
  return cache.get(key)!;
}

export function usePresidencia(ativo: boolean, anchor: string, periodo: number): Presidencia | null {
  const datas = datasDaPresidencia(anchor), id = `${anchor}|${periodo}`;
  const [estado, setEstado] = useState<{ id: string; prontas: number }>({ id, prontas: 0 });
  useEffect(() => {
    if (!ativo) return;
    let vivo = true; const ordem = ordemDoCalculo(datas);
    setEstado({ id, prontas: ordem.filter(index => cache.has(chave(datas[index], periodo))).length });
    const passo = (k: number) => {
      if (!vivo || k >= ordem.length) return;
      const data = datas[ordem[k]], pronta = cache.has(chave(data, periodo));
      calcular(data, periodo);
      if (!vivo) return;
      setEstado({ id, prontas: ordem.filter(index => cache.has(chave(datas[index], periodo))).length });
      window.setTimeout(() => passo(k + 1), pronta ? 0 : 40);
    };
    const timer = window.setTimeout(() => passo(0), 60);
    return () => { vivo = false; window.clearTimeout(timer); };
  }, [ativo, id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ativo) return null;
  const fotos = datas.map(data => cache.get(chave(data, periodo)) ?? null);
  return { datas, fotos, atual: fotos.at(-1) ?? null, anoAntes: fotos[0], completo: estado.id === id && datas.every(data => cache.has(chave(data, periodo))) };
}
