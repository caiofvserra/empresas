/** Sorteio estável por chave (FNV-1a + mistura), independente da ordem de iteração. Toda camada sintética da V20 usa só isto. */
export function chance(key: string): number {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index++) { hash ^= key.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  hash ^= hash >>> 15; hash = Math.imul(hash, 0x2c1b3c6d); hash ^= hash >>> 12; hash = Math.imul(hash, 0x297a2d39); hash ^= hash >>> 15;
  return (hash >>> 0) / 4294967296;
}
export const between = (key: string, min: number, max: number) => min + Math.floor(chance(key) * (max - min + 1));
export const pick = <T>(key: string, items: readonly T[]): T => items[Math.floor(chance(key) * items.length)];
/** Escolha ponderada: pesos relativos, na ordem dos itens. */
export function weighted<T>(key: string, items: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = chance(key) * total;
  for (let index = 0; index < items.length; index++) { roll -= weights[index]; if (roll < 0) return items[index]; }
  return items[items.length - 1];
}
const DAY = 86400000;
export const toDay = (date: string) => Math.floor(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / DAY);
export const toDate = (day: number) => new Date(day * DAY).toISOString().slice(0, 10);
export const addDays = (date: string, days: number) => toDate(toDay(date) + days);
export const dateBetween = (key: string, first: string, last: string) => toDate(between(key, toDay(first), Math.max(toDay(first), toDay(last))));
export const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
export const share = (part: number, whole: number) => whole > 0 ? part / whole * 100 : null;
