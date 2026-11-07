import { useMemo } from 'react';
import type { CockpitCtx } from '../cockpit/contexto';
import { municipiosSp } from '../domain/municipios';
import triagemJson from '../domain/pncp-triagem-sp.json';
import { quadroTriagem } from '../domain/pncp-triagem';
import type { QuadroTriagem, TriagemPncp } from '../domain/pncp-triagem';
import type { Evolucao } from '../painel/evolucao';
import { int } from '../painel/ui';

/**
 * Dado real da triagem dos contratos de serviços gerais do PNCP com o modelo treinado (07/11/2026), no cartão da página Contratos.
 * Segue a GRE, o município e o período do alto da tela, contado até o último mês da rodada; não se divide por câmara, porque o
 * contrato de serviços gerais não tem atividade cadastrada, e não volta no tempo com a data de referência.
 */
export const triagemPncp = triagemJson as unknown as TriagemPncp;
export function useTriagem(ctx: CockpitCtx): { q: QuadroTriagem; serie: Evolucao | undefined } {
  return useMemo(() => {
    const q = quadroTriagem(triagemPncp, municipiosSp(ctx.dataset), { greId: ctx.greId, cityId: ctx.cidadeId, meses: Math.max(1, ctx.period) });
    const serie: Evolucao | undefined = q.meses.length ? { tipo: 'fluxo', meses: q.meses.map(row => row.mes), valores: q.meses.map(row => row.suspeitos), fmt: int, nome: 'Serviços gerais com objeto de engenharia' } : undefined;
    return { q, serie };
  }, [ctx.dataset, ctx.greId, ctx.cidadeId, ctx.period]);
}
