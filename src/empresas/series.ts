import { useMemo } from 'react';
import { int } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import type { Evolucao } from '../painel/evolucao';
import { entradasSaidas } from '../cockpit/medidas';

/** Séries mês a mês dos cartões de Empresas que abrem a evolução no painel lateral (05/11/2026): empresas registradas no fim de cada mês, entradas e saídas. */
export function useSeriesEmpresas(ctx: CockpitCtx) {
  return useMemo(() => {
    const rows = entradasSaidas(ctx.history, ctx.f), meses = rows.map(row => row.month);
    return {
      base: { tipo: 'estoque', meses, valores: rows.map(row => row.base), fmt: int } as Evolucao,
      entradas: { tipo: 'fluxo', meses, valores: rows.map(row => row.viaFiscalizacao.length + row.demais.length), fmt: int } as Evolucao,
      saidas: { tipo: 'fluxo', meses, valores: rows.map(row => row.saidas.length), fmt: int, goodUp: false } as Evolucao,
    };
  }, [ctx.history, ctx.f]);
}
