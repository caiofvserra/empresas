import type { CockpitCtx } from '../cockpit/contexto';
import { mainEstablishments } from '../gestao-v14/metrics';
import { municipiosSp } from '../domain/municipios';
import { populacaoCidade } from '../domain/mercado';

/**
 * Valor de cada município no indicador do mapa (pedido do Caio em 04/11/2026: a cor é do município, e a lista ao lado traz as GREs).
 * Usa o estado inteiro no recorte de câmara e período, como a lista das GREs, para o mapa comparar municípios mesmo com uma GRE escolhida.
 * São os 645 municípios da tabela oficial (todos têm empresas no cenário desde 04/11/2026). Contagens valem 0 onde não há nada;
 * porcentagens só aparecem com pelo menos `MINIMO` no denominador; abaixo disso o município fica cinza ("poucos dados").
 */
export const MINIMO = 2;
export interface LinhaCidade { id: string; nome: string; greId: string; valor: number | null; base: number; ids: string[] }
export type Abre = 'faltam' | 'ativas' | 'devedoras';
export type MetricaCidade = 'cobertura' | 'semRegistro' | 'empresas' | 'crescimento' | 'rt' | 'inadimplencia' | 'arts' | 'emprego';

const taxa = (parte: number, todo: number) => todo >= MINIMO ? parte / todo * 100 : null;

export function valoresPorCidade(ctx: CockpitCtx, metrica: MetricaCidade, period: number): Map<string, LinhaCidade> {
  const { stateScope: scope, stateModel: model, stateHistory: history } = ctx, dataset = scope.dataset;
  const lugares = new Map(scope.establishments.map(row => [row.id, row])), principal = mainEstablishments(dataset);
  const cidadeDe = (companyId: string) => principal.get(companyId)?.cityId;
  const contagem = metrica === 'semRegistro' || metrica === 'empresas' || metrica === 'arts' || metrica === 'emprego';
  const linhas = new Map(municipiosSp(dataset).map(city => [city.id, { id: city.id, nome: city.nome, greId: city.greId, valor: contagem ? 0 as number | null : null, base: 0, ids: [] as string[] }]));
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
  // emprego: o cubo do cenário só tem as cidades-sede; o estoque técnico de cada GRE no último mês é repartido entre os municípios dela pela população.
  // Em produção, a RAIS e o CAGED trazem o município do vínculo.
  const tecnicas = new Set(dataset.cbos.filter(row => row.technical).map(row => row.code)), mes = scope.anchor.slice(0, 7), greDaSede = new Map(dataset.cities.map(row => [row.id, row.greId]));
  const porGre = new Map<string, number>(), popGre = new Map<string, number>();
  for (const fato of dataset.employment) { if (fato.month !== mes || !tecnicas.has(fato.cbo)) continue; const gre = greDaSede.get(fato.cityId); if (gre) porGre.set(gre, (porGre.get(gre) ?? 0) + fato.stock); }
  for (const row of linhas.values()) popGre.set(row.greId, (popGre.get(row.greId) ?? 0) + populacaoCidade(row.id));
  for (const row of linhas.values()) row.valor = Math.round((porGre.get(row.greId) ?? 0) * populacaoCidade(row.id) / Math.max(1, popGre.get(row.greId) ?? 1));
  for (const row of linhas.values()) { row.ids = ativas.get(row.id) ?? []; row.base = row.ids.length; }
  return linhas;
}

/**
 * Cinco faixas por quantil que aguentam muitos valores repetidos (comum nos municípios pequenos: 0 CNPJ sem registro, 100% registrado).
 * Com zeros, o zero vira uma faixa só dele e os positivos se dividem em quatro; sem zeros, os valores se dividem em cinco.
 * Quando os empates juntam os cortes, eles saem dos valores distintos; as faixas usadas ficam seguidas, da mais clara à mais escura.
 */
export function faixasPorQuantil(valores: number[]): (value: number) => number {
  const ordem = [...valores].sort((a, b) => a - b), temZero = ordem[0] === 0 && ordem.some(value => value > 0);
  const base = temZero ? ordem.filter(value => value > 0) : ordem, partes = temZero ? 4 : 5;
  const quantis = (lista: number[]) => [...new Set(Array.from({ length: partes - 1 }, (_, k) => lista[Math.min(lista.length - 1, Math.floor(lista.length * (k + 1) / partes))]))].filter(corte => corte > lista[0]);
  // Muitos empates (vários municípios com o mesmo valor) juntam os cortes; aí os cortes saem dos valores distintos.
  let cortes = quantis(base); if (cortes.length < partes - 1) cortes = quantis([...new Set(base)]);
  return value => temZero && value <= 0 ? 0 : (temZero ? 1 : 0) + cortes.filter(corte => value >= corte).length;
}
