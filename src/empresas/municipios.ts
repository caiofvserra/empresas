import type { CockpitCtx } from '../cockpit/contexto';
import { mainEstablishments } from '../gestao-v14/metrics';

/**
 * Valor de cada município no indicador do mapa (pedido do Caio em 04/11/2026: a cor é do município, e a lista ao lado traz as GREs).
 * Usa o estado inteiro no recorte de câmara e período, como a lista das GREs, para o mapa comparar municípios mesmo com uma GRE escolhida.
 * Porcentagens só aparecem com pelo menos `MINIMO` no denominador; abaixo disso o município fica cinza ("poucos dados").
 */
export const MINIMO = 3;
export interface LinhaCidade { id: string; nome: string; greId: string; valor: number | null; base: number; ids: string[] }
export type Abre = 'faltam' | 'ativas' | 'devedoras';
export type MetricaCidade = 'cobertura' | 'semRegistro' | 'empresas' | 'crescimento' | 'rt' | 'inadimplencia' | 'arts' | 'emprego';

const taxa = (parte: number, todo: number) => todo >= MINIMO ? parte / todo * 100 : null;

export function valoresPorCidade(ctx: CockpitCtx, metrica: MetricaCidade, period: number): Map<string, LinhaCidade> {
  const { stateScope: scope, stateModel: model, stateHistory: history } = ctx, dataset = scope.dataset;
  const lugares = new Map(scope.establishments.map(row => [row.id, row])), principal = mainEstablishments(dataset);
  const cidadeDe = (companyId: string) => principal.get(companyId)?.cityId;
  const linhas = new Map(dataset.cities.map(city => [city.id, { id: city.id, nome: city.name, greId: city.greId, valor: null as number | null, base: 0, ids: [] as string[] }]));
  const conta = (ids: Iterable<string>, chave: (id: string) => string | undefined) => { const out = new Map<string, string[]>(); for (const id of ids) { const c = chave(id); if (c) out.set(c, [...(out.get(c) ?? []), id]); } return out; };
  const ativas = conta(model.metadata.activeCompanyIds, cidadeDe);
  if (metrica === 'cobertura' || metrica === 'semRegistro') {
    const vigentes = new Set(model.metadata.activeEligibleEstablishmentIds);
    const elegiveis = conta(model.metadata.eligibleEstablishmentIds, id => lugares.get(id)?.cityId);
    for (const [cityId, ids] of elegiveis) { const row = linhas.get(cityId); if (!row) continue; const faltam = ids.filter(id => !vigentes.has(id));
      row.base = ids.length; row.ids = faltam; row.valor = metrica === 'cobertura' ? taxa(ids.length - faltam.length, ids.length) : faltam.length; }
    return linhas;
  }
  if (metrica === 'empresas' || metrica === 'rt' || metrica === 'inadimplencia' || metrica === 'arts') {
    const comRt = new Set(model.regions.flatMap(region => region.withRtIds)), devedoras = new Set(ctx.linhas.flatMap(row => row.devedoras));
    const fatos = new Map(model.companyFacts.map(row => [row.companyId, row]));
    for (const [cityId, ids] of ativas) { const row = linhas.get(cityId); if (!row) continue; row.base = ids.length;
      if (metrica === 'empresas') { row.valor = ids.length; row.ids = ids; }
      else if (metrica === 'rt') { row.valor = taxa(ids.filter(id => comRt.has(id)).length, ids.length); row.ids = ids; }
      else if (metrica === 'inadimplencia') { row.ids = ids.filter(id => devedoras.has(id)); row.valor = taxa(row.ids.length, ids.length); }
      else { row.valor = ids.reduce((total, id) => total + (fatos.get(id)?.artCount ?? 0), 0); row.ids = ids; } }
    return linhas;
  }
  if (metrica === 'crescimento') {
    const meses = history.monthly, ultimo = meses.at(-1), antes = meses.length > period ? meses[meses.length - 1 - period] : undefined;
    const agora = conta(ultimo?.activeIds ?? [], cidadeDe), entao = conta(antes?.activeIds ?? [], cidadeDe);
    for (const row of linhas.values()) { const a = agora.get(row.id)?.length ?? 0, b = entao.get(row.id)?.length ?? 0; row.base = b; row.ids = ativas.get(row.id) ?? []; row.valor = b >= MINIMO ? (a - b) / b * 100 : null; }
    return linhas;
  }
  // emprego: estoque de vínculos em ocupações técnicas no último mês, pelo município do vínculo
  const tecnicas = new Set(dataset.cbos.filter(row => row.technical).map(row => row.code)), mes = scope.anchor.slice(0, 7);
  for (const fato of dataset.employment) { if (fato.month !== mes || !tecnicas.has(fato.cbo)) continue; const row = linhas.get(fato.cityId); if (row) row.valor = (row.valor ?? 0) + fato.stock; }
  for (const row of linhas.values()) { row.ids = ativas.get(row.id) ?? []; row.base = row.ids.length; }
  return linhas;
}
