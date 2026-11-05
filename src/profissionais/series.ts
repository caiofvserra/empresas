import { useMemo } from 'react';
import { int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import type { Evolucao } from '../painel/evolucao';
import { artsMensaisPorModalidade, fluxoMensal } from '../domain/painel-profissionais';
import { mesesDaSerie, seriesRegistro } from '../domain/series-mensais';
import { filtroDe } from './blocos';

/** Séries mês a mês dos cartões de Profissionais que abrem a evolução no painel lateral (05/11/2026). */
const taxa = (value: number) => pct(value, 1);
export function useSeriesProfissionais(ctx: CockpitCtx) {
  const n = mesesDaSerie(ctx.period);
  const registro = useMemo(() => seriesRegistro(ctx.profissionais.modelo, ctx.dataset, ctx.greId, filtroDe(ctx), n), [ctx.profissionais.modelo, ctx.dataset, ctx.greId, ctx.cidadeId, ctx.modalidade, ctx.genero, n]); // eslint-disable-line react-hooks/exhaustive-deps
  const fluxo = useMemo(() => fluxoMensal(ctx.profissionais.modelo, ctx.dataset, ctx.greId, filtroDe(ctx), n), [ctx.profissionais.modelo, ctx.dataset, ctx.greId, ctx.cidadeId, ctx.modalidade, ctx.genero, n]); // eslint-disable-line react-hooks/exhaustive-deps
  const arts = useMemo(() => artsMensaisPorModalidade(ctx.profissionais.modelo, ctx.dataset, ctx.greId, filtroDe(ctx), n), [ctx.profissionais.modelo, ctx.dataset, ctx.greId, ctx.cidadeId, ctx.modalidade, ctx.genero, n]); // eslint-disable-line react-hooks/exhaustive-deps
  return useMemo(() => {
    const meses = registro.meses;
    const estoque = (valores: number[], goodUp = true): Evolucao => ({ tipo: 'estoque', meses, valores, fmt: int, goodUp });
    const parte = (valores: (number | null)[]): Evolucao => ({ tipo: 'taxa', meses, valores, fmt: taxa });
    const conta = (campo: 'novos' | 'reativacoes' | 'interrupcoes' | 'cancelamentos', goodUp = true): Evolucao => ({ tipo: 'fluxo', meses: fluxo.map(row => row.month), valores: fluxo.map(row => row[campo].length), fmt: int, goodUp });
    return { ativos: estoque(registro.ativos), fora: estoque(registro.fora, false), adimplencia: parte(registro.adimplencia), mulheres: parte(registro.mulheres), sessenta: { ...parte(registro.sessenta), goodUp: false }, rts: estoque(registro.rts), rt4: estoque(registro.rt4, false),
      arts: { tipo: 'fluxo', meses: arts.meses, valores: arts.meses.map((_, index) => arts.series.reduce((total, serie) => total + serie.valores[index], 0)), fmt: int } as Evolucao,
      novos: conta('novos'), reativacoes: conta('reativacoes'), interrupcoes: conta('interrupcoes', false), cancelamentos: conta('cancelamentos', false) };
  }, [registro, fluxo, arts]);
}
