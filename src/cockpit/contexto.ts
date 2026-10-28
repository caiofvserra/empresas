import type { Scope } from '../domain/engine';
import type { EnterpriseModel } from '../enterprise-v10/types';
import type { ContratoPublico, Ponte, Receita } from '../painel/analise';
import type { Ctx } from '../painel/contexto';
import type { Malha } from './cruzamentos';
import type { Estrutura } from './estrutura';
import type { Insight, Metas, PageId } from './leitura';
import type { LinhaGre, artsPeriodo } from './medidas';

/** Estado calculado do cockpit V18: o contexto da V17 (fiscalização, regionais, painel lateral) mais os demais assuntos. */
export interface CockpitCtx extends Ctx {
  page: PageId; go: (page: PageId) => void; dark: boolean;
  historyScope: Scope; stateScope: Scope; stateModel: EnterpriseModel; stateHistory: EnterpriseModel;
  linhas: LinhaGre[]; ponte: Ponte; rec: Receita; contratos: ContratoPublico[]; malha: Malha; estrutura: Estrutura | null;
  arts: ReturnType<typeof artsPeriodo>; metas: Metas; insights: Insight[];
  focus: string | null; toggleFocus: (id: string) => void;
}
