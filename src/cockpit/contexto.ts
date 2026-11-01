import type { Scope } from '../domain/engine';
import type { EnterpriseModel } from '../enterprise-v10/types';
import type { ContratoPublico, Ponte, Receita } from '../painel/analise';
import type { Ctx } from '../painel/contexto';
import type { Malha } from './cruzamentos';
import type { Estrutura } from './estrutura';
import type { Insight, Metas, PageId } from './leitura';
import type { LinhaGre, artsPeriodo } from './medidas';
import type { Cobertura, Contagens, Coorte, ReceitaAtribuivel, TempoAteAgir } from '../observatorio/norte';
import type { ModeloProfissionais, RemuneracaoCbo, ResumoProfissionais } from '../domain/profissionais';
import type { QuadroFormacao } from '../domain/formacao';
import type { QuadroEntidades } from '../domain/entidades';
import type { QuadroConselho } from '../domain/conselho';
import type { ResultadoFt } from '../painel/forcas';
import type { QuadroInstalacoes, QuadroObras, QuadroSociedades } from '../domain/frentes';
import type { Historico } from '../observatorio/historico';
import type { Aberturas, Concentracao, DensidadeGre, Permanencia, QuadroDemanda } from '../domain/mercado';

/** Indicadores-norte do Prumo no recorte. */
export interface Norte { cobertura: Cobertura; contagens: Contagens; conversao: { coortes: Coorte[]; atual: Coorte | null; anterior: Coorte | null }; receita: ReceitaAtribuivel; tempo: TempoAteAgir }

/**
 * Estado calculado do cockpit V20: o contexto da V19 (fiscalização, regionais, painel lateral, indicadores-norte) mais a data de
 * referência, os profissionais, a formação, as entidades e IES, o controle interno e as forças-tarefas. Tudo é lido em `anchor`.
 */
export interface CockpitCtx extends Ctx {
  page: PageId; go: (page: PageId) => void; dark: boolean;
  /** Data de referência D: a base é lida como estava em D; `hoje` é o corte mais recente do cenário. */
  anchor: string; hoje: string; datasReferencia: string[]; setAnchor: (value: string | null) => void;
  historyScope: Scope; stateScope: Scope; stateModel: EnterpriseModel; stateHistory: EnterpriseModel;
  linhas: LinhaGre[]; ponte: Ponte; rec: Receita; contratos: ContratoPublico[]; malha: Malha; estrutura: Estrutura | null;
  arts: ReturnType<typeof artsPeriodo>; metas: Metas; insights: Insight[];
  focus: string | null; toggleFocus: (id: string) => void;
  norte: Norte;
  profissionais: { modelo: ModeloProfissionais; resumo: ResumoProfissionais; cbo: RemuneracaoCbo[] };
  formacao: QuadroFormacao; entidades: QuadroEntidades; conselho: QuadroConselho; forcas: ResultadoFt[];
  /** V21: camadas das frentes com fonte automática (QSA aberto, Obrasgov, ANEEL/ANP/ANM/BNDES) e o histórico por data de referência. */
  frentes: { sociedades: QuadroSociedades; obras: QuadroObras; instalacoes: QuadroInstalacoes };
  historico: Historico;
  /** V21: medidas de mercado e de dinâmica da base do levantamento (UC34, UC33, UC31, UC05, UC04). */
  mercado: Mercado;
}
export interface Mercado { concentracao: Concentracao; demanda: QuadroDemanda; densidade: DensidadeGre[]; aberturas: Aberturas; permanencia: Permanencia[] }
