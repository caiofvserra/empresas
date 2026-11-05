import { useMemo } from 'react';
import { brl, int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import type { Evolucao } from '../painel/evolucao';
import { entradasSaidas } from '../cockpit/medidas';
import { seriesEmpresas } from '../domain/series-empresas';
import { ultimoMesReceita } from '../domain/empresas';

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
    // As aberturas vêm do arquivo mensal da Receita, que chega com atraso: depois do último mês com arquivo a série fica vazia, não zero.
    const ultimo = ultimoMesReceita(ctx.dataset), porMes = new Map(ctx.mercado.aberturas.meses.map(row => [row.month, row.aberturas]));
    const aberturas = meses.map(month => month > ultimo ? null : porMes.get(month) ?? 0);
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
      aberturas: serie('fluxo', aberturas),
      permanencia: taxa(s.permanencia),
    };
  }, [ctx.history, ctx.f, ctx.scope, ctx.norte.cobertura, ctx.period, ctx.dataset, ctx.mercado.aberturas]);
}
