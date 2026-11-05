import { useMemo } from 'react';
import { brl, int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import type { Evolucao } from '../painel/evolucao';
import { entradasSaidas } from '../cockpit/medidas';
import { seriesEmpresas } from '../domain/series-empresas';
import { ultimoMesReceita } from '../domain/empresas';
import { classeDoEstabelecimento } from '../observatorio/norte';
import { mesesDaSerie } from '../domain/series-mensais';

/**
 * Séries mês a mês dos cartões de Empresas que abrem a evolução no painel lateral (05/11/2026): empresas registradas no fim de
 * cada mês, entradas e saídas e, desde o pedido do Caio no mesmo dia, as demais medidas dos cartões (parte registrada, sem
 * registro, anuidade, RT, ARTs, sem ART, abertas na Receita, permanência). O emprego formal vem do bloco de ritmo (PaginaEvolucao).
 */
export function useSeriesEmpresas(ctx: CockpitCtx) {
  return useMemo(() => {
    const rows = entradasSaidas(ctx.history, ctx.f), meses = rows.map(row => row.month);
    const s = seriesEmpresas(ctx.scope, ctx.history, ctx.norte.cobertura, ctx.period);
    const serie = (tipo: Evolucao['tipo'], valores: (number | null)[], extra: Partial<Evolucao> = {}): Evolucao => ({ tipo, meses, valores, fmt: int, ...extra });
    const taxa = (valores: (number | null)[], extra: Partial<Evolucao> = {}) => serie('taxa', valores, { fmt: value => pct(value, 1), curto: value => pct(value, 0), ...extra });
    // Abertas na Receita, pelo mesmo recorte do cartão (regional e município; o arquivo da Receita não tem porte nem câmara). O arquivo
    // chega com atraso: a série termina no último mês com arquivo, e as comparações são feitas nele.
    const ultimo = ultimoMesReceita(ctx.dataset), porMes = new Map<string, number>();
    for (const place of ctx.dataset.establishments) if ((!ctx.greId || place.greId === ctx.greId) && (!ctx.cidadeId || place.cityId === ctx.cidadeId) && classeDoEstabelecimento(ctx.dataset, place) !== null) porMes.set(place.openedAt.slice(0, 7), (porMes.get(place.openedAt.slice(0, 7)) ?? 0) + 1);
    const mesesReceita = ctx.dataset.months.filter(month => month <= ultimo).slice(-mesesDaSerie(ctx.period));
    const aberturas: Evolucao = { tipo: 'fluxo', meses: mesesReceita, valores: mesesReceita.map(month => porMes.get(month) ?? 0), fmt: int };
    // No gráfico, o valor em ART vai em milhões de reais sem o "R$", para os doze rótulos caberem.
    const milhoes = (value: number) => (value / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    return {
      base: serie('estoque', rows.map(row => row.base)),
      entradas: serie('fluxo', rows.map(row => row.viaFiscalizacao.length + row.demais.length)),
      saidas: serie('fluxo', rows.map(row => row.saidas.length), { goodUp: false }),
      cobertura: taxa(s.cobertura),
      semRegistro: serie('estoque', s.semRegistro, { goodUp: false }),
      adimplencia: taxa(s.adimplencia),
      comRt: taxa(s.comRt),
      rtBaixado: serie('estoque', s.rtBaixado, { goodUp: false }),
      arts: serie('fluxo', s.arts),
      valorArt: serie('fluxo', s.valorArt, { fmt: brl, curto: milhoes, unidade: 'em R$ milhões' }),
      semArt: taxa(s.semArt, { goodUp: false }),
      aberturas,
      permanencia: taxa(s.permanencia),
    };
  }, [ctx.history, ctx.f, ctx.scope, ctx.norte.cobertura, ctx.period, ctx.dataset, ctx.greId, ctx.cidadeId]);
}
