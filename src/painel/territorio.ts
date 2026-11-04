import type { Dataset } from '../domain/types';
import { municipiosSp } from '../domain/municipios';

/**
 * Território das GREs no mapa: a GRE de cada município vem da tabela oficial do Crea-SP (src/domain/gre-municipios.json, desde
 * 04/11/2026). Município fora da tabela fica com a GRE do município-sede da amostra mais próximo.
 */
export function territorioGre(dataset: Dataset, centroids: Map<string, [number, number]>): Map<string, string> {
  const oficial = new Map(municipiosSp(dataset).map(row => [row.nome, row.greId]));
  const seeds = dataset.cities.map(city => ({ greId: city.greId, at: centroids.get(city.name) })).filter((seed): seed is { greId: string; at: [number, number] } => Boolean(seed.at));
  const result = new Map<string, string>();
  for (const [name, [x, y]] of centroids) {
    let best = seeds[0], distance = Infinity;
    for (const seed of seeds) { const dx = (seed.at[0] - x) * Math.cos(y * Math.PI / 180), dy = seed.at[1] - y, d = dx * dx + dy * dy; if (d < distance) { distance = d; best = seed; } }
    const tabela = oficial.get(name);
    if (tabela) result.set(name, tabela); else if (best) result.set(name, best.greId);
  }
  return result;
}
/** Ponto de rótulo de cada GRE: centro dos municípios do seu território. */
export function rotulosGre(territorio: Map<string, string>, centroids: Map<string, [number, number]>): Map<string, [number, number]> {
  const sums = new Map<string, [number, number, number]>();
  for (const [name, greId] of territorio) { const at = centroids.get(name); if (!at) continue; const item = sums.get(greId) ?? [0, 0, 0]; sums.set(greId, [item[0] + at[0], item[1] + at[1], item[2] + 1]); }
  return new Map([...sums].map(([greId, [x, y, n]]) => [greId, [x / n, y / n] as [number, number]]));
}
