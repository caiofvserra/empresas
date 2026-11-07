import type { Genero } from '../domain/profissionais';
import type { Scope } from '../domain/engine';
import type { EnterpriseModel } from '../enterprise-v10/types';
import type { ContratoPublico, Ponte, Receita } from '../painel/analise';
import type { Ctx } from '../painel/contexto';
import type { Fiscalizacao } from '../painel/fiscalizacao';
import type { Malha } from './cruzamentos';
import type { Estrutura } from './estrutura';
import type { Insight, Metas, PageId } from './leitura';
import type { LinhaGre, artsPeriodo } from './medidas';
import type { Cobertura, Contagens, Coorte, ReceitaAtribuivel, TempoAteAgir } from '../observatorio/norte';
import type { EmpregoCbo, ModeloProfissionais, RemuneracaoCbo, ResumoProfissionais } from '../domain/profissionais';
import type { QuadroFormacao } from '../domain/formacao';
import type { QuadroEntidades } from '../domain/entidades';
import type { Beneficiario, Conselheiro, Servidor } from '../domain/pessoas-conselho';
import type { Conselho, QuadroConselho } from '../domain/conselho';
import type { ResultadoFt } from '../painel/forcas';
import type { QuadroInstalacoes, QuadroObras, QuadroSociedades } from '../domain/frentes';
import type { Historico } from '../observatorio/historico';
import type { Aberturas, Concentracao, Permanencia, QuadroDemanda } from '../domain/mercado';
import type { Acumulado, Carteira, QuadroDivida, ReceitaMensal } from '../domain/gestao';
import type { QuadroColegiado } from '../domain/colegiado';
import type { Presidencia } from '../presidencia/fotos';
import type { Profissional } from '../domain/profissionais';
import type { InstitutionalServiceRequest } from '../domain/institutional';
import type { QuadroCno, QuadroCoorteNominal, QuadroCredenciamentos, QuadroDenominacao, QuadroJucesp, QuadroLicencas, QuadroPericias, QuadroSociosPf, QuadroTce, QuadroVinculos } from '../domain/parcerias';

/** Indicadores-norte do programa Inteligência Estratégica Crea-SP no recorte. */
export interface Norte { cobertura: Cobertura; contagens: Contagens; conversao: { coortes: Coorte[]; atual: Coorte | null; anterior: Coorte | null }; receita: ReceitaAtribuivel; tempo: TempoAteAgir }

/**
 * Estado calculado do cockpit V20: o contexto da V19 (fiscalização, regionais, painel lateral, indicadores-norte) mais a data de
 * referência, os profissionais, a formação, as entidades e IES, o controle interno e as forças-tarefas. Tudo é lido em `anchor`.
 */
export interface CockpitCtx extends Ctx {
  page: PageId; go: (page: PageId) => void; dark: boolean;
  /** Painel de Fiscalização: a fiscalização do estado inteiro na câmara escolhida, sem o filtro de município (mapa e forças-tarefas). Nos outros painéis é igual a `f`. */
  fEstado: Fiscalizacao;
  /** Painel de Empresas: município escolhido no alto da tela (dentro da regional), visual enxuto (a explicação de cada bloco fica no (i)) e câmara de cada empresa. */
  cidadeId: string | null; enxuto: boolean; camaraDe: Map<string, string>;
  /** Painel de Profissionais: modalidade escolhida no alto da tela (no lugar da câmara). */
  modalidade: string | null;
  /** Painel de Profissionais: gênero escolhido no alto da tela (04/11/2026); nulo quando são os dois. */
  genero: Genero | null;
  /** Data de referência D: a base é lida como estava em D; `hoje` é o corte mais recente do cenário. */
  anchor: string; hoje: string; datasReferencia: string[]; setAnchor: (value: string | null) => void;
  historyScope: Scope; stateScope: Scope; stateModel: EnterpriseModel; stateHistory: EnterpriseModel;
  linhas: LinhaGre[]; ponte: Ponte; rec: Receita; contratos: ContratoPublico[]; malha: Malha; estrutura: Estrutura | null;
  arts: ReturnType<typeof artsPeriodo>; metas: Metas; insights: Insight[];
  focus: string | null; toggleFocus: (id: string) => void;
  norte: Norte;
  profissionais: { modelo: ModeloProfissionais; resumo: ResumoProfissionais; cbo: RemuneracaoCbo[]; emprego: EmpregoCbo[] };
  formacao: QuadroFormacao; entidades: QuadroEntidades; conselho: QuadroConselho; forcas: ResultadoFt[];
  /** V21: camadas das frentes com fonte automática (QSA aberto, Obrasgov, ANEEL/ANP/ANM/BNDES) e o histórico por data de referência. */
  frentes: { sociedades: QuadroSociedades; obras: QuadroObras; instalacoes: QuadroInstalacoes };
  historico: Historico;
  /** V21: medidas de mercado e de dinâmica da base do levantamento (UC34, UC33, UC31, UC05, UC04). */
  mercado: Mercado;
  /** V22: camadas que dependem de parceria (marcadas com "!"): CNO, licenças e alvarás, perícias, TCE-SP, contexto econômico, sócios PF, coorte nominal e vínculos. */
  parcerias: Parcerias;
  /** Painel de Gestão do Conselho (06/11/2026): câmaras, plenário, dívida, receita e despesa mês a mês e distância até a unidade. Nulo nos outros painéis. */
  gestao: Gestao | null;
  /** Painel da Presidência (07/11/2026): as fotos dos indicadores de todos os painéis nos 13 fins de mês até a data. Nulo nos outros painéis. */
  presidencia: Presidencia | null;
}
export interface Gestao {
  /** Lançamentos de receita, despesa, diárias, contratos e pessoal do Conselho, lidos na data de referência. */
  contas: Conselho;
  carteira: Carteira; divida: QuadroDivida;
  /** Meses da série dos cartões (24 ou o período mais 12), terminando no mês da data de referência. */
  meses: string[];
  receitaMensal: ReceitaMensal[]; receitaAcumulada: Acumulado[]; despesaAcumulada: Acumulado[]; despesaMensal: number[]; diariasMensais: number[];
  adimplencia: Map<string, { ativos: Profissional[]; atraso: Profissional[] }>;
  /** Gastos com nome: servidores do quadro, conselheiros do plenário e diárias de 12 meses pessoa a pessoa (no recorte de GRE). */
  equipe: Servidor[]; conselheiros: Conselheiro[]; diariasPessoas: Beneficiario[];
  distancia: Map<string, { km: number; unidade: string }>; origem: (row: InstitutionalServiceRequest) => string;
  /** Painel de Gestão do Conselho (07/11/2026): o colegiado lido na data, no período e no recorte (colegiado, regional e município). Nulo no Financeiro e no Atendimento. */
  colegiado: QuadroColegiado | null;
}
export interface Parcerias { cno: QuadroCno; licencas: QuadroLicencas; pericias: QuadroPericias; tce: QuadroTce; sociosPf: QuadroSociosPf; coorteNominal: QuadroCoorteNominal; vinculos: QuadroVinculos;
  /** Painel de Empresas: credenciamentos no DETRAN-SP e no INMETRO, e atos da Junta Comercial (JUCESP). */
  credenciamentos: QuadroCredenciamentos; jucesp: QuadroJucesp;
  /** Nome com “engenharia” ou “engenheiro” e quem dirige a empresa (Lei 5.194/66, arts. 4º e 5º); depende do CPF completo dos sócios. */
  denominacao: QuadroDenominacao }
export interface Mercado { concentracao: Concentracao; demanda: QuadroDemanda; aberturas: Aberturas; permanencia: Permanencia[] }
