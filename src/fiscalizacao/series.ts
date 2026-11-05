import { useMemo } from 'react';
import { brl, int } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import type { Evolucao } from '../painel/evolucao';
import { mesesDaSerie, seriesFiscalizacao } from '../domain/series-mensais';

/** Séries mês a mês dos cartões de Fiscalização que abrem a evolução no painel lateral (05/11/2026). */
export function useSeriesFiscalizacao(ctx: CockpitCtx) {
  const n = mesesDaSerie(ctx.period);
  return useMemo(() => {
    const s = seriesFiscalizacao(ctx.f.acoes, ctx.f.anchor, ctx.greId, n);
    const fluxo = (valores: number[], goodUp = true, extra: Partial<Evolucao> = {}): Evolucao => ({ tipo: 'fluxo', meses: s.meses, valores, fmt: int, goodUp, ...extra });
    // No gráfico, o valor das multas vai em milhares de reais sem o "R$", para os doze rótulos caberem.
    const mil = (value: number) => (value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
    return { acoes: fluxo(s.acoes), autos: fluxo(s.autos, false), multas: fluxo(s.multas, true, { fmt: brl, curto: mil, unidade: 'em R$ mil' }), regularizacoes: fluxo(s.regularizacoes) };
  }, [ctx.f, ctx.greId, n]);
}
