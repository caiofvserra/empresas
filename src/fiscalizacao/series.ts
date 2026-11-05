import { useMemo } from 'react';
import { brl, int } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import type { Evolucao } from '../painel/evolucao';
import { mesesDaSerie, seriesFiscalizacao } from '../domain/series-mensais';

/**
 * Séries mês a mês dos cartões de Fiscalização que abrem a evolução no painel lateral (05/11/2026). O recebido depois de uma ação
 * vem da mesma conta do cartão, mês a mês; a malha fina vem do histórico refeito no fim de cada mês, que
 * tem só 12 meses, então ali não há comparação com um ano antes.
 */
export function useSeriesFiscalizacao(ctx: CockpitCtx) {
  const n = mesesDaSerie(ctx.period);
  return useMemo(() => {
    const s = seriesFiscalizacao(ctx.f.acoes, ctx.f.anchor, ctx.greId, n);
    const fluxo = (valores: number[], goodUp = true, extra: Partial<Evolucao> = {}): Evolucao => ({ tipo: 'fluxo', meses: s.meses, valores, fmt: int, goodUp, ...extra });
    // No gráfico, o valor das multas vai em milhares de reais sem o "R$", para os doze rótulos caberem.
    const mil = (value: number) => (value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
    const r = ctx.norte.receita.serieMensal;
    const receita: Evolucao = { tipo: 'fluxo', meses: r.map(row => row.month), valores: r.map(row => row.valor), fmt: brl, curto: mil, unidade: 'em R$ mil' };
    // O histórico é refeito aos poucos depois que a página abre; a série só entra quando ele está completo (e termina na data escolhida).
    const pontos = ctx.historico.pontos, malha = (campo: 'comIndicio' | 'confirmadas' | 'comAcao', goodUp: boolean): Evolucao | undefined => ctx.historico.completo && pontos.length > 1 ? { tipo: 'estoque', meses: pontos.map(p => p.data.slice(0, 7)), valores: pontos.map(p => p[campo]), fmt: int, goodUp } : undefined;
    return { acoes: fluxo(s.acoes), autos: fluxo(s.autos, false), multas: fluxo(s.multas, true, { fmt: brl, curto: mil, unidade: 'em R$ mil' }), recebidas: fluxo(s.recebidas, true, { fmt: brl, curto: mil, unidade: 'em R$ mil' }), regularizacoes: fluxo(s.regularizacoes), receita,
      comIndicio: malha('comIndicio', false), confirmadas: malha('confirmadas', false), comAcao: malha('comAcao', true) };
  }, [ctx.f, ctx.greId, n, ctx.norte.receita, ctx.historico.pontos, ctx.historico.completo]);
}
