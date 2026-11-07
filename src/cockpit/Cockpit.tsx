import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { ArrowUpRight, BadgeCheck, BookOpenCheck, Briefcase, Building2, CalendarClock, ChartPie, ChevronDown, Construction, Database, FileSignature, Gavel, GraduationCap, Handshake, HardHat, Headset, Landmark, Moon, Network, RotateCcw, Scale, ScanSearch, ScrollText, Search, ShieldCheck, SlidersHorizontal, Sun, Target, TrendingUp, Users, Wallet, X } from 'lucide-react';
import { dataset } from '../domain/dataset';
import { datasReferencia as datasReferenciaDe, datasetAt, fiscalizacaoAt } from '../domain/tempo';
import { defaultFilters } from '../domain/types';
import type { CompanySize, Dataset, Establishment, Filters } from '../domain/types';
import type { Scope } from '../domain/engine';
import { buildProfissionais, buildEmpregoCbo, remuneracaoPorCbo, resumoProfissionais } from '../domain/profissionais';
import type { Genero } from '../domain/profissionais';
import { municipiosSp } from '../domain/municipios';
import { modalidades } from '../domain/entidades';
import { buildFormacao, quadroFormacao } from '../domain/formacao';
import { buildEntidades, quadroEntidades } from '../domain/entidades';
import { buildConselho, quadroConselho } from '../domain/conselho';
import { buildInstalacoes, buildObras, buildSociedades, quadroInstalacoes, quadroObras, quadroSociedades } from '../domain/frentes';
import { datasHistorico, pontoHistorico } from '../observatorio/historico';
import type { PontoHistorico } from '../observatorio/historico';
import { aberturasRfb, buildDemandaPlanejada, concentracaoMercado, permanenciaCoorte, quadroDemanda } from '../domain/mercado';
import { buildCno, buildCredenciamentos, buildDespesaTce, buildJucesp, buildLicencas, buildPericias, buildSociosPf, buildVinculos, coorteNominal, quadroCno, quadroCredenciamentos, quadroDenominacao, quadroJucesp, quadroLicencas, quadroPericias, quadroSociosPf, quadroTce, quadroVinculos } from '../domain/parcerias';
import type { EnterpriseModel } from '../enterprise-v10/types';
import { EngineeringEmblem } from '../components/EngineeringIdentity';
import { selectEnterpriseScope } from '../enterprise-v10/filters';
import { buildEnterpriseModel } from '../enterprise-v10/model';
import { caoService } from '../gestao-v14/metrics';
import { buildFiscalizacao, tipoLabel } from '../painel/fiscalizacao';
import { resultadosForcas } from '../painel/forcas';
import { cobertura, contagens, conversao, receitaAtribuivel, tempoAteAgir } from '../observatorio/norte';
import { camaraDaEmpresa, camaraPorCnae, camaras, contratosPublicos, devedoras, janela as janelaDe, mesesDaJanela, ponteBase, porRegional, receita, resumoFiscal } from '../painel/analise';
import { useTokens } from '../painel/chart';
import type { Detail } from '../painel/contexto';
import Drawer from '../painel/Drawer';
import { anexarEvolucao } from '../painel/evolucao';
import { brl, data, int, mes } from '../painel/ui';
import type { CockpitCtx } from './contexto';
import { malhaFina } from './cruzamentos';
import { estruturaDe } from './estrutura';
import type { Estrutura } from './estrutura';
import { leitura, metasPadrao } from './leitura';
import { painelDaPagina } from './leitura';
import type { Metas, PageId } from './leitura';
import { artsPeriodo, linhasGre } from './medidas';
import { despesaPublicada, fonteConfea, formacaoSp, piso as pisoPublico, registrosNovos, resultados2025 } from './publico';
import PaginaPresidencia from './PaginaPresidencia';
import PaginaMetodo from './PaginaMetodo';
import PaginaMercado from '../empresas/PaginaMercado';
import PaginaEvolucao from '../empresas/PaginaEvolucao';
import PaginaRt from '../empresas/PaginaRt';
import PaginaVinculos from '../empresas/PaginaVinculos';
import PaginaProfissionais from '../profissionais/PaginaProfissionais';
import PaginaFluxo from '../profissionais/PaginaFluxo';
import PaginaAtuacao from '../profissionais/PaginaAtuacao';
import PaginaFormacao from '../profissionais/PaginaFormacao';
import PaginaTrabalho from '../profissionais/PaginaTrabalho';
import PaginaAcoes from '../fiscalizacao/PaginaAcoes';
import PaginaResultado from '../fiscalizacao/PaginaResultado';
import PaginaMalha from '../fiscalizacao/PaginaMalha';
import PaginaContratos from '../fiscalizacao/PaginaContratos';
import PaginaObras from '../fiscalizacao/PaginaObras';
import PaginaReceita from '../financeiro/PaginaReceita';
import PaginaOrcamento from '../financeiro/PaginaOrcamento';
import PaginaColegiado from '../conselho/PaginaColegiado';
import PaginaProcessos from '../conselho/PaginaProcessos';
import PaginaConselheiros from '../conselho/PaginaConselheiros';
import PaginaDecisoes from '../conselho/PaginaDecisoes';
import PaginaRepresentacao from '../conselho/PaginaRepresentacao';
import { buildColegiado, colegiados, quadroColegiado } from '../domain/colegiado';
import type { Colegiado } from '../domain/colegiado';
import PaginaAtendimento from '../atendimento/PaginaAtendimento';
import { adimplenciaPorMunicipio, buildCarteira, despesaAcumulada, despesaMensal, diariasMensais, distanciaUnidade, mesesAteData, municipioDoSolicitante, quadroDivida, receitaAcumulada, receitaMensal } from '../domain/gestao';
import { conselheiros, diariasPorPessoa, servidores } from '../domain/pessoas-conselho';
import type { Gestao } from './contexto';
import { mesesDaSerie } from '../domain/series-mensais';
import '../empresas/empresas.css';
import '../profissionais/profissionais.css';
import '../fiscalizacao/fiscalizacao.css';
import '../gestao/gestao.css';
import '../painel/painel.css';
import './cockpit.css';

/**
 * V21 · Inteligência Estratégica Crea-SP (nome escolhido em 01/11/2026; antes Prumo, antes Observatório). Protótipo completo, revisado: 11 assuntos, data de referência (o painel como
 * estava em D, sem sobrescrever nenhum valor), ficha (i) em todo bloco e cartão, profissionais e formação com a mesma
 * profundidade das empresas, entidades e IES, controle interno, forças-tarefas com grupo de comparação e malha fina v2.
 */
type PaginaDef = { id: PageId; label: string; title: string; subtitle: string; icon: ComponentType<{ size?: number }>; Page: ComponentType<{ ctx: CockpitCtx }> };
const paginasGeral: PaginaDef[] = [
  { id: 'presidencia', label: 'Presidência', title: 'Presidência', subtitle: 'Os quatro indicadores principais, um resumo de cada assunto e a comparação das regionais com o ano anterior', icon: Landmark, Page: PaginaPresidencia },
  { id: 'metodo', label: 'Método', title: 'Método, regras e fontes', subtitle: 'O que cada cruzamento permite concluir, o que foi corrigido no painel, as perguntas que ele responde, as regras da malha fina, as fontes de dados e o uso de inteligência artificial', icon: BookOpenCheck, Page: PaginaMetodo },
];
/** Painel de Empresas: o primeiro painel separado do painel geral (01/11/2026), com filtros de regional, câmara, período e data que valem para todas as páginas. Não tem atalho de volta ao painel geral: o Caio pediu para remover em 03/11/2026, porque ele é entregue sozinho. */
const paginasEmpresas: PaginaDef[] = [
  { id: 'mercado', label: 'Registro', title: 'Registro e mercado', subtitle: 'Quantas empresas estão registradas no Crea-SP, quanto do mercado de engenharia isso cobre e em que atividades e regionais estão as que faltam', icon: Building2, Page: PaginaMercado },
  { id: 'evolucao', label: 'Evolução', title: 'Evolução das empresas', subtitle: 'Como a economia, a abertura de empresas de engenharia e os registros no Crea-SP andaram juntos, e quantas empresas entram e saem da base', icon: TrendingUp, Page: PaginaEvolucao },
  { id: 'rt', label: 'RT e ART', title: 'Responsáveis técnicos e ARTs', subtitle: 'Quantas empresas registradas têm responsável técnico, quantas empresas cada profissional assume e quantas ARTs as empresas registram', icon: FileSignature, Page: PaginaRt },
  { id: 'vinculos', label: 'Vínculos', title: 'Sócios, instalações e empregados', subtitle: 'Com quem as empresas se ligam: sócios, instalações e financiamentos de setores regulados, empregados técnicos, credenciamentos e alterações no contrato social', icon: Network, Page: PaginaVinculos },
];
/** Painel de Profissionais: o segundo painel separado do painel geral (03/11/2026), com filtros de regional, município, modalidade, período e data. */
const paginasProfissionais: PaginaDef[] = [
  { id: 'profissionais', label: 'Registro', title: 'Profissionais registrados', subtitle: 'Quantos profissionais têm registro ativo, onde moram, em que modalidade e nível, quem são e se pagam a anuidade', icon: HardHat, Page: PaginaProfissionais },
  { id: 'fluxo', label: 'Evolução', title: 'Entradas e saídas do registro', subtitle: 'Quantos profissionais se registram, interrompem, voltam e cancelam o registro, mês a mês, e quantos de cada ano continuam ativos', icon: TrendingUp, Page: PaginaFluxo },
  { id: 'atuacao', label: 'ART e RT', title: 'ARTs e responsabilidade técnica', subtitle: 'Quantos profissionais registram ART, em que modalidade e idade, quantas empresas cada responsável técnico assume', icon: FileSignature, Page: PaginaAtuacao },
  { id: 'formacao', label: 'Formação', title: 'Formação e registro', subtitle: 'Quantos se formam a cada ano e quantos se registram, atuam e continuam no sistema, por instituição, modalidade e canal', icon: GraduationCap, Page: PaginaFormacao },
  { id: 'trabalho', label: 'Trabalho', title: 'Emprego, salário e perícias', subtitle: 'Quantos empregos com carteira existem nas ocupações de engenharia, quanto pagam comparado com o piso e quantas perícias judiciais são feitas', icon: Briefcase, Page: PaginaTrabalho },
];
/** Painel de Fiscalização e malha fina: o terceiro painel separado do painel geral (03/11/2026), com filtros de regional, município, câmara, período e data. Reúne as antigas abas Fiscalização e Malha fina do painel geral. */
const paginasFiscalizacao: PaginaDef[] = [
  { id: 'fiscalizacao', label: 'Ações', title: 'Ações de fiscalização', subtitle: 'Quantas ações a fiscalização faz, onde, de que origem, quantas viram auto de infração e o que acontece com as multas', icon: ShieldCheck, Page: PaginaAcoes },
  { id: 'resultado', label: 'Resultado', title: 'Resultado da fiscalização', subtitle: 'Quantas ações terminam em regularização, em quantos dias, quanto tempo o indício espera pela primeira ação e o resultado das forças-tarefas', icon: BadgeCheck, Page: PaginaResultado },
  { id: 'malha', label: 'Malha fina', title: 'Malha fina', subtitle: 'Empresas apontadas pelo cruzamento de dados, separadas por regra e pela confiança do indício. A lista serve para análise e nunca gera auto de infração sozinha', icon: ScanSearch, Page: PaginaMalha },
  { id: 'contratos', label: 'Contratos', title: 'Contratos públicos e ART', subtitle: 'Os contratos públicos técnicos do PNCP, a ART encontrada para cada um, a situação do fornecedor na data do contrato e quem ganha os contratos', icon: ScrollText, Page: PaginaContratos },
  { id: 'obras', label: 'Obras', title: 'Obras e licenças', subtitle: 'As obras públicas e a ART de fiscalização, as obras privadas do cadastro da Receita e os alvarás e licenças, com a ART de cada uma', icon: Construction, Page: PaginaObras },
];
/**
 * Painéis que vieram do antigo painel de Gestão do Conselho (06/11/2026). Em 07/11/2026 o Caio separou os temas: o Conselho fica só
 * com o colegiado (câmaras, plenário e entidades), Receita e Orçamento vão para o painel Financeiro e Atendimento ganha painel próprio.
 */
const paginaReceita: PaginaDef = { id: 'receita', label: 'Receita', title: 'Receita e dívida', subtitle: 'Quanto o Conselho arrecada, de onde vem o dinheiro, quanto está vencido com profissionais e empresas, o que pode ser cobrado na Justiça e o que está perto de prescrever', icon: Wallet, Page: PaginaReceita };
const paginaOrcamento: PaginaDef = { id: 'orcamento', label: 'Orçamento', title: 'Orçamento e despesa', subtitle: 'Como o orçamento do ano está sendo executado, em que o Conselho gasta, na sede e nas regionais, com diárias, fornecedores, contratos e pessoal', icon: ChartPie, Page: PaginaOrcamento };
const paginaAtendimento: PaginaDef = { id: 'atendimento', label: 'Atendimento', title: 'Atendimento e estrutura', subtitle: 'Se as solicitações são resolvidas no prazo, por que canal chegam, a que distância cada município está de uma unidade e como os coworkings são usados', icon: Headset, Page: PaginaAtendimento };
const paginasFinanceiro: PaginaDef[] = [paginaReceita, paginaOrcamento];
const paginasAtendimento: PaginaDef[] = [paginaAtendimento];
/**
 * Painel de Gestão do Conselho, refeito em 07/11/2026 só com o colegiado: conselheiros, câmaras, Plenário e processos. O caminho do
 * processo segue o guia da SUPCOL (GovAdm e Votenet) e os marcos do Confea; o filtro do alto escolhe o Plenário ou uma câmara.
 */
const paginasConselho: PaginaDef[] = [
  { id: 'colegiado', label: 'Colegiado', title: 'O colegiado', subtitle: 'Quem está no Conselho, quantos processos esperam voto, com quem eles estão, em que status do Votenet e quanto o colegiado vota por mês', icon: Landmark, Page: PaginaColegiado },
  { id: 'processos', label: 'Processos', title: 'A fila de processos', subtitle: 'Os processos parados há mais tempo, com quem estão, os autos perto da prescrição e quanto o processo leva do GovAdm ao Votenet', icon: Scale, Page: PaginaProcessos },
  { id: 'conselheiros', label: 'Conselheiros', title: 'Os conselheiros', subtitle: 'A carga e o tempo de relato de cada conselheiro, a presença nas sessões, os pedidos de vista, o relato com IA e as diárias', icon: Users, Page: PaginaConselheiros },
  { id: 'decisoes', label: 'Decisões', title: 'As decisões', subtitle: 'O que as câmaras decidem nos autos de infração, as multas por infração, o que o Plenário mantém ou reforma e o que acontece com as multas depois', icon: Gavel, Page: PaginaDecisoes },
  { id: 'representacao', label: 'Representação', title: 'A representação', subtitle: 'Como as cadeiras se dividem entre as câmaras, as mulheres no Conselho e no registro, o que as organizações com cadeira recebem e as deliberações das atas', icon: Handshake, Page: PaginaRepresentacao },
];
export type PainelId = 'geral' | 'empresas' | 'profissionais' | 'fiscalizacao' | 'financeiro' | 'atendimento' | 'conselho';
/** `filtro`: o terceiro filtro do alto, a câmara ou a modalidade (com o gênero); no Financeiro e no Atendimento não há terceiro filtro. */
interface Painel { id: PainelId; nome: string; paginas: PaginaDef[]; periodos: number[]; storage: string; filtro: 'camara' | 'modalidade' | 'colegiado' | 'nenhum' }
const paineis: Record<PainelId, Painel> = {
  geral: { id: 'geral', nome: 'Inteligência Estratégica', paginas: paginasGeral, periodos: [3, 6, 12], storage: 'crea-observatorio-v20', filtro: 'camara' },
  empresas: { id: 'empresas', nome: 'Inteligência Estratégica · Empresas', paginas: paginasEmpresas, periodos: [3, 6, 12, 24], storage: 'crea-empresas-v1', filtro: 'camara' },
  profissionais: { id: 'profissionais', nome: 'Inteligência Estratégica · Profissionais', paginas: paginasProfissionais, periodos: [3, 6, 12, 24], storage: 'crea-profissionais-v1', filtro: 'modalidade' },
  fiscalizacao: { id: 'fiscalizacao', nome: 'Inteligência Estratégica · Fiscalização', paginas: paginasFiscalizacao, periodos: [3, 6, 12, 24], storage: 'crea-fiscalizacao-v1', filtro: 'camara' },
  financeiro: { id: 'financeiro', nome: 'Inteligência Estratégica · Financeiro', paginas: paginasFinanceiro, periodos: [3, 6, 12, 24], storage: 'crea-financeiro-v1', filtro: 'nenhum' },
  atendimento: { id: 'atendimento', nome: 'Inteligência Estratégica · Atendimento', paginas: paginasAtendimento, periodos: [3, 6, 12, 24], storage: 'crea-atendimento-v1', filtro: 'nenhum' },
  conselho: { id: 'conselho', nome: 'Inteligência Estratégica · Gestão do Conselho', paginas: paginasConselho, periodos: [3, 6, 12, 24], storage: 'crea-conselho-v3', filtro: 'colegiado' },
};
/** Atalhos do menu lateral, só no painel geral. Os painéis temáticos são entregues sozinhos e não têm caminho de volta (pedido do Caio, 03/11/2026). */
const atalhos: { id: PainelId; label: string; title: string; icon: ComponentType<{ size?: number }> }[] = [
  { id: 'empresas', label: 'Empresas', title: 'Abrir o painel de Empresas', icon: Building2 },
  { id: 'profissionais', label: 'Profissionais', title: 'Abrir o painel de Profissionais', icon: HardHat },
  { id: 'fiscalizacao', label: 'Fiscalização', title: 'Abrir o painel de Fiscalização e malha fina', icon: ShieldCheck },
  { id: 'financeiro', label: 'Financeiro', title: 'Abrir o painel Financeiro', icon: Wallet },
  { id: 'atendimento', label: 'Atendimento', title: 'Abrir o painel de Atendimento', icon: Headset },
  { id: 'conselho', label: 'Conselho', title: 'Abrir o painel de Gestão do Conselho', icon: Scale },
];
/** Endereço de outro painel: no site, o HTML de cada painel (index.html, empresas.html...); na entrega em arquivo único, os HTML lado a lado na pasta entrega. */
const arquivos: Record<PainelId, { site: string; entrega: string }> = {
  geral: { site: 'index.html', entrega: 'painel-gestao-creasp.html' },
  empresas: { site: 'empresas.html', entrega: 'painel-empresas-creasp.html' },
  profissionais: { site: 'profissionais.html', entrega: 'painel-profissionais-creasp.html' },
  fiscalizacao: { site: 'fiscalizacao.html', entrega: 'painel-fiscalizacao-creasp.html' },
  financeiro: { site: 'financeiro.html', entrega: 'painel-financeiro-creasp.html' },
  atendimento: { site: 'atendimento.html', entrega: 'painel-atendimento-creasp.html' },
  conselho: { site: 'conselho.html', entrega: 'painel-conselho-creasp.html' },
};
export function enderecoPainel(id: PainelId, pagina?: PageId) {
  const entrega = /painel-[a-z-]+\.html$/.test(window.location.pathname), arquivo = entrega ? arquivos[id].entrega : arquivos[id].site;
  return pagina ? `${arquivo}#${pagina}` : arquivo;
}
let STORAGE = 'crea-observatorio-v20';
const ler = <T,>(key: string, fallback: T): T => { try { const raw = localStorage.getItem(`${STORAGE}-${key}`); return raw === null ? fallback : JSON.parse(raw) as T; } catch { return fallback; } };
const gravar = (key: string, value: unknown) => { try { localStorage.setItem(`${STORAGE}-${key}`, JSON.stringify(value)); } catch { /* navegador sem armazenamento: o painel segue funcionando */ } };
/** Modelos empresariais em cache por recorte (data de referência, regional, câmara, período): trocar de filtro e voltar é imediato. */
const modelos = new Map<string, EnterpriseModel>();
function modelo(key: string, scope: Scope) {
  let value = modelos.get(key);
  if (!value) { value = buildEnterpriseModel(scope); modelos.set(key, value); if (modelos.size > 16) modelos.delete(modelos.keys().next().value!); }
  return value;
}
const filtros = (greIds: string[], period: number, cityId = '', extra: { porte?: string; situacao?: string } = {}): Filters => ({ ...defaultFilters, greIds, period, cityIds: cityId ? [cityId] : [], sizes: extra.porte ? [extra.porte] : [], rfbStatuses: extra.situacao ? [extra.situacao] : [] });
const portes: CompanySize[] = ['Microempresa', 'Pequena empresa', 'Média empresa', 'Grande empresa'];
const situacoes: Establishment['rfbStatus'][] = ['Ativa', 'Baixada', 'Suspensa', 'Inapta'];
/** Página e filtros no endereço: `#registro?gre=GRE5&cidade=3550308&camara=Civil&meses=24&data=2026-06-30`. */
type Endereco = Record<'gre' | 'cidade' | 'camara' | 'colegiado' | 'modalidade' | 'genero' | 'meses' | 'data' | 'porte' | 'situacao', string>;
function lerEndereco(): Endereco & { pagina: string } {
  const [pagina, consulta = ''] = window.location.hash.slice(1).split('?'), params = new URLSearchParams(consulta);
  const chave = (name: keyof Endereco) => params.get(name) ?? '';
  return { pagina, gre: chave('gre'), cidade: chave('cidade'), camara: chave('camara'), colegiado: chave('colegiado'), modalidade: chave('modalidade'), genero: chave('genero'), meses: chave('meses'), data: chave('data'), porte: chave('porte'), situacao: chave('situacao') };
}
function gravarEndereco(pagina: string, valores: Endereco) {
  const params = new URLSearchParams(); for (const [name, value] of Object.entries(valores)) if (value) params.set(name, value);
  const consulta = params.toString(), hash = `#${pagina}${consulta ? `?${consulta}` : ''}`;
  if (window.location.hash !== hash) window.history.replaceState(null, '', hash);
}
const camaraMap = camaraDaEmpresa(dataset);
const hoje = dataset.snapshotDate;
const datasReferencia = datasReferenciaDe(dataset);
/** O filtro de município lista os 645 municípios do estado em todos os painéis (04/11/2026): há profissionais e empresas em todos. */
const municipiosDe = (greId: string) => municipiosSp(dataset).filter(row => !greId || row.greId === greId).map(row => ({ id: row.id, name: row.nome, greId: row.greId })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
/** Camadas construídas uma vez por base lida em D (cache por referência da base). */
const camadas = new WeakMap<Dataset, Camadas>();
type Camadas = { f: ReturnType<typeof buildFiscalizacao>; profissionais: ReturnType<typeof buildProfissionais>; emprego: ReturnType<typeof buildEmpregoCbo>; formacao: ReturnType<typeof buildFormacao>; entidades: ReturnType<typeof buildEntidades>; conselho: ReturnType<typeof buildConselho>; sociedades: ReturnType<typeof buildSociedades>; obras: ReturnType<typeof buildObras>; instalacoes: ReturnType<typeof buildInstalacoes>;
  cno: ReturnType<typeof buildCno>; licencas: ReturnType<typeof buildLicencas>; pericias: ReturnType<typeof buildPericias>; tce: ReturnType<typeof buildDespesaTce>; sociosPf: ReturnType<typeof buildSociosPf>; vinculos: ReturnType<typeof buildVinculos>; credenciamentos: ReturnType<typeof buildCredenciamentos>; jucesp: ReturnType<typeof buildJucesp> };
function camadasDe(view: Dataset) {
  let value = camadas.get(view);
  if (!value) {
    const profissionais = buildProfissionais(view);
    value = { f: fiscalizacaoAt(buildFiscalizacao(dataset), view.snapshotDate), profissionais, emprego: buildEmpregoCbo(view), formacao: buildFormacao(view), entidades: buildEntidades(view), conselho: buildConselho(view), sociedades: buildSociedades(view), obras: buildObras(view), instalacoes: buildInstalacoes(view),
      cno: buildCno(view), licencas: buildLicencas(view), pericias: buildPericias(view, profissionais), tce: buildDespesaTce(view), sociosPf: buildSociosPf(view, profissionais), vinculos: buildVinculos(view), credenciamentos: buildCredenciamentos(view), jucesp: buildJucesp(view) };
    camadas.set(view, value);
  }
  return value;
}

export default function Cockpit({ painel: painelId = 'geral' }: { painel?: PainelId }) {
  const painel = paineis[painelId], pages = painel.paginas;
  STORAGE = painel.storage;
  // O endereço guarda a página e os filtros (`#registro?gre=GRE5&meses=24`), para um link levar a mesma tela (05/11/2026).
  const inicial = useMemo(() => lerEndereco(), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [page, setPage] = useState<PageId>(() => { const hash = inicial.pagina, saved = pages.some(item => item.id === hash) ? hash : ler<string>('pagina', pages[0].id); return pages.some(item => item.id === saved) ? saved as PageId : pages[0].id; });
  // Com município no endereço, a regional é a dele pela tabela oficial, ainda que o endereço diga outra.
  const [gre, setGre] = useState(() => municipiosSp(dataset).find(row => row.id === inicial.cidade)?.greId ?? (dataset.gres.some(row => row.id === inicial.gre) ? inicial.gre : ''));
  const [camara, setCamara] = useState(() => (camaras as string[]).includes(inicial.camara) ? inicial.camara : '');
  // Gestão do Conselho: o Plenário ou uma das nove câmaras (07/11/2026); nos outros painéis fica vazio.
  const [colegiado, setColegiado] = useState<'' | Colegiado>(() => (colegiados as string[]).includes(inicial.colegiado) ? inicial.colegiado as Colegiado : '');
  const [modalidade, setModalidade] = useState(() => (modalidades as string[]).includes(inicial.modalidade) ? inicial.modalidade : '');
  const [genero, setGenero] = useState<'' | Genero>(() => inicial.genero === 'Feminino' || inicial.genero === 'Masculino' ? inicial.genero : '');
  const [cidade, setCidade] = useState(() => municipiosSp(dataset).some(row => row.id === inicial.cidade) ? inicial.cidade : '');
  const [period, setPeriod] = useState(() => { const value = Number(inicial.meses); return Number.isInteger(value) && value >= 1 && value <= dataset.months.length ? value : 12; });
  const leve = painel.id !== 'geral', deProfissionais = painel.id === 'profissionais', deFiscalizacao = painel.id === 'fiscalizacao', deGestao = painel.id === 'conselho' || painel.id === 'financeiro' || painel.id === 'atendimento';
  const [anchorSel, setAnchorSel] = useState<string | null>(() => datasReferencia.includes(inicial.data) ? inicial.data : null);
  const [avisoPeriodo, setAvisoPeriodo] = useState('');
  // Mais filtros (05/11/2026): porte e situação do CNPJ na Receita, que o motor já aceitava e o cabeçalho não oferecia.
  const [porte, setPorte] = useState(() => (portes as string[]).includes(inicial.porte) ? inicial.porte : '');
  const [situacao, setSituacao] = useState(() => (situacoes as string[]).includes(inicial.situacao) ? inicial.situacao : '');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark' | null>(() => { const salvo = ler<'light' | 'dark' | null>('tema', null); if (salvo) document.documentElement.dataset.theme = salvo; return salvo; }); // o tema salvo entra antes da primeira leitura das cores dos gráficos
  const [metas, setMetas] = useState<Metas>(() => ({ ...metasPadrao, ...ler<Partial<Metas>>('metas', {}) }));
  const [focus, setFocus] = useState<string | null>(null);
  const [modal, setModal] = useState<'metas' | 'fontes' | null>(null);
  const [estrutura, setEstrutura] = useState<Estrutura | null>(null);
  const [historico, setHistorico] = useState<{ chave: string; pontos: PontoHistorico[] }>({ chave: '', pontos: [] });
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  const [pending, transition] = useTransition();
  const tokens = useTokens();
  const dark = theme === 'dark' || theme === null && systemDark;
  const anchor = anchorSel ?? hoje;
  const view = useMemo(() => datasetAt(dataset, anchor), [anchor]);

  useEffect(() => { const media = window.matchMedia('(prefers-color-scheme: dark)'), update = () => setSystemDark(media.matches); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  useEffect(() => { if (theme) document.documentElement.dataset.theme = theme; else delete document.documentElement.dataset.theme; gravar('tema', theme); }, [theme]);
  useEffect(() => { gravar('pagina', page); setFocus(null); }, [page]);
  useEffect(() => { gravarEndereco(page, { gre, cidade, camara, colegiado, modalidade, genero, meses: period === 12 ? '' : String(period), data: anchorSel ?? '', porte, situacao }); }, [page, gre, cidade, camara, colegiado, modalidade, genero, period, anchorSel, porte, situacao]);
  useEffect(() => { gravar('metas', metas); }, [metas]);
  // Atendimento, estrutura e orçamento vêm do modelo institucional (cerca de 1 s na primeira vez): calculado depois da primeira pintura.
  useEffect(() => { if (leve && !deGestao) return; let alive = true; setEstrutura(null); const id = window.setTimeout(() => { const value = estruturaDe(view, gre || null, period); if (alive) setEstrutura(value); }, 30); return () => { alive = false; window.clearTimeout(id); }; }, [view, gre, period, leve, deGestao]);
  // Histórico por data de referência: um ponto por mês (cerca de 1 s cada), calculado depois da estrutura, um de cada vez, com cache. Nos painéis temáticos, só o de Fiscalização usa (bloco da malha fina mês a mês).
  useEffect(() => {
    if (leve && !deFiscalizacao) return;
    let alive = true; const chave = `${view.snapshotDate}|${gre}`, datas = datasHistorico(view), fBase = camadasDe(view).f;
    setHistorico({ chave, pontos: [] });
    const passo = (index: number) => { if (!alive || index >= datas.length) return; const ponto = pontoHistorico(dataset, fBase, datas[index], gre || null); if (!alive) return; setHistorico(previous => previous.chave === chave ? { chave, pontos: [...previous.pontos, ponto] } : previous); window.setTimeout(() => passo(index + 1), 40); };
    const id = window.setTimeout(() => passo(0), 400);
    return () => { alive = false; window.clearTimeout(id); };
  }, [view, gre, leve, deFiscalizacao]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      // Esc fecha primeiro o balão aberto (ficha (i) ou exportação), depois (07/11/2026) o painel lateral, a janela e o bloco ampliado.
      if (event.key === 'Escape') { const balao = document.querySelector<HTMLDetailsElement>('details.ficha-pop[open], details.exporta-pop[open], details.ck-mais[open]');
        if (balao) { balao.open = false; balao.querySelector('summary')?.focus(); } else if (detail) setDetail(null); else if (modal) setModal(null); else setFocus(null); return; }
      if (event.ctrlKey || event.metaKey || event.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || modal || detail) return;
      if (event.key === '/' && leve && !deProfissionais && !deGestao) { event.preventDefault(); buscarRef.current(); return; }
      if (/^[0-9]$/.test(event.key)) { const index = event.key === '0' ? 9 : Number(event.key) - 1; if (pages[index]) setPage(pages[index].id); }
      else if ((event.key === 'm' || event.key === 'M') && pages.some(item => item.id === 'metodo')) setPage('metodo');
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [detail, modal, pages, leve, deProfissionais, deGestao]);
  const buscarRef = useRef<() => void>(() => {});

  const subset = useMemo(() => camara ? view.companies.filter(row => camaraMap.get(row.id) === camara).map(row => row.id) : undefined, [view, camara]);
  const mais = useMemo(() => ({ porte, situacao }), [porte, situacao]), chaveMais = `${porte}|${situacao}`;
  const scope = useMemo(() => selectEnterpriseScope(view, filtros(gre ? [gre] : [], period, cidade, mais), subset), [view, gre, period, subset, cidade, mais]);
  // O histórico mês a mês cobre 24 meses, ou o período inteiro quando ele passa de 24 (período livre, 05/11/2026).
  const mesesHist = mesesDaJanela(period);
  const historyScope = useMemo(() => selectEnterpriseScope(view, filtros(gre ? [gre] : [], mesesHist, cidade, mais), subset), [view, gre, subset, cidade, mesesHist, mais]);
  const stateScope = useMemo(() => gre ? selectEnterpriseScope(view, filtros([], period, '', mais), subset) : scope, [view, gre, period, subset, scope, mais]);
  const stateHistoryScope = useMemo(() => gre ? selectEnterpriseScope(view, filtros([], mesesHist, '', mais), subset) : historyScope, [view, gre, subset, historyScope, mesesHist, mais]);
  const model = useMemo(() => modelo(`${anchor}|${gre}|${cidade}|${camara}|${period}|${chaveMais}`, scope), [scope]); // eslint-disable-line react-hooks/exhaustive-deps
  const history = useMemo(() => modelo(`${anchor}|${gre}|${cidade}|${camara}|${mesesHist}|${chaveMais}`, historyScope), [historyScope]); // eslint-disable-line react-hooks/exhaustive-deps
  const stateModel = useMemo(() => modelo(`${anchor}||${camara}|${period}|${chaveMais}`, stateScope), [stateScope]); // eslint-disable-line react-hooks/exhaustive-deps
  const stateHistory = useMemo(() => modelo(`${anchor}||${camara}|${mesesHist}|${chaveMais}`, stateHistoryScope), [stateHistoryScope]); // eslint-disable-line react-hooks/exhaustive-deps
  const base = useMemo(() => camadasDe(view), [view]);
  // `fEstado` é a fiscalização do estado inteiro na câmara escolhida (mapa, forças-tarefas e comparação das regionais); `f` também segue o município no painel de Fiscalização.
  const fEstado = useMemo(() => { const all = base.f; return camara ? { ...all, acoes: all.acoes.filter(row => camaraMap.get(row.companyId) === camara), alvos: all.alvos.filter(row => camaraMap.get(row.companyId) === camara) } : all; }, [base, camara]);
  const f = useMemo(() => deFiscalizacao && cidade ? { ...fEstado, acoes: fEstado.acoes.filter(row => row.cityId === cidade), alvos: fEstado.alvos.filter(row => row.cityId === cidade) } : fEstado, [fEstado, cidade, deFiscalizacao]);
  const derived = useMemo(() => {
    const resumo = resumoFiscal(f, gre || null, period);
    const regionais = porRegional(view, fEstado, stateModel, period, camara ? { empresa: id => camaraMap.get(id) === camara, cnae: code => camaraPorCnae[code] === camara } : {});
    const contratos = contratosPublicos(scope, period), malha = malhaFina(scope, model, f, contratos);
    const stateMalha = gre ? malhaFina(stateScope, stateModel, f, contratosPublicos(stateScope, period)) : malha;
    const arts = artsPeriodo(scope, period), stateArts = gre ? artsPeriodo(stateScope, period) : arts;
    const linhas = linhasGre(stateModel, stateHistory, stateScope, regionais, period, stateMalha, stateArts.atual);
    const cobradas = model.metrics.compliance.denominatorCompanyIds?.length ?? 0;
    const norte = { cobertura: cobertura(scope, model), contagens: contagens(scope, model), conversao: conversao(f, gre || null), receita: receitaAtribuivel(view, f, gre || null, period), tempo: tempoAteAgir(view, f, gre || null, period, tipoLabel) };
    const mercado = { concentracao: concentracaoMercado(contratos), demanda: quadroDemanda(buildDemandaPlanejada(view)), aberturas: aberturasRfb(view, gre || null, mesesHist, cidade || null), permanencia: [3, 6, 12].map(meses => permanenciaCoorte(view, scope.companyIds, meses)) };
    return { resumo, regionais, contratos, malha, arts, linhas, ponte: ponteBase(model, scope, f, period), rec: receita(history, f, gre || null, period),
      inadimplencia: cobradas ? devedoras(model).size / cobradas * 100 : null, cao: caoService(scope).median, norte, mercado };
  }, [view, f, fEstado, gre, cidade, period, mesesHist, camara, scope, model, history, stateScope, stateModel, stateHistory]);
  // Camadas da V20: profissionais, formação, entidades, controle interno e forças-tarefas, todas lidas em D.
  const extra = useMemo(() => {
    const greId = gre || null, recorte = { cityId: cidade || null, modalidade: modalidade || null, genero: genero || null };
    const profissionais = { modelo: base.profissionais, resumo: resumoProfissionais(base.profissionais, view, greId, period, recorte), cbo: remuneracaoPorCbo(base.emprego, anchor, greId, genero || null), emprego: base.emprego };
    const formacao = quadroFormacao(base.formacao, base.profissionais, view, greId, recorte);
    const entidades = quadroEntidades(base.entidades, anchor, greId);
    const inicio = janelaDe(anchor, 12).start, acoesPorGre = new Map<string, number>();
    for (const row of f.acoes) if (row.date >= inicio && row.date <= anchor) acoesPorGre.set(row.greId, (acoesPorGre.get(row.greId) ?? 0) + 1);
    const conselho = quadroConselho(base.conselho, anchor, greId, acoesPorGre);
    const forcas = resultadosForcas(view, fEstado, greId);
    const frentes = { sociedades: quadroSociedades(base.sociedades, view, scope.companyIds, greId), obras: quadroObras(base.obras, view, scope.companyIds, greId), instalacoes: quadroInstalacoes(base.instalacoes, view, greId) };
    const parcerias = { cno: quadroCno(base.cno, view, scope.companyIds, greId), licencas: quadroLicencas(base.licencas, view, scope.companyIds, greId), pericias: quadroPericias(base.pericias, view, base.profissionais, greId, recorte), tce: quadroTce(base.tce, derived.contratos),
      sociosPf: quadroSociosPf(base.sociosPf, view, base.profissionais, scope.companyIds, greId), coorteNominal: coorteNominal(base.formacao, base.profissionais, view, greId, recorte), vinculos: quadroVinculos(base.vinculos, view, scope.companyIds, greId),
      credenciamentos: quadroCredenciamentos(base.credenciamentos, view, scope.companyIds, greId), jucesp: quadroJucesp(base.jucesp, view, scope.companyIds, greId),
      denominacao: quadroDenominacao(base.sociosPf, view, base.profissionais, scope.companyIds, greId) };
    return { profissionais, formacao, entidades, conselho, forcas, frentes, parcerias };
  }, [base, view, anchor, f, fEstado, gre, cidade, modalidade, genero, period, scope, derived.contratos]);
  // Painel de Gestão do Conselho: câmaras, plenário, carteira de dívida, receita e despesa mês a mês e distância até a unidade (06/11/2026).
  const gestao = useMemo<Gestao | null>(() => {
    if (!deGestao) return null;
    const w = janelaDe(anchor, period), meses = mesesAteData(anchor, mesesDaSerie(period)), recorte = { greId: gre || null, cityId: cidade || null, camara: null };
    const carteira = buildCarteira(dataset, base.profissionais);
    const equipe = servidores(base.conselho, dataset), plenarioNomes = conselheiros(base.entidades);
    return { contas: base.conselho, carteira, meses, divida: quadroDivida(carteira, anchor, recorte, w.start, w.prevEnd, meses), receitaMensal: receitaMensal(base.conselho, meses), receitaAcumulada: receitaAcumulada(base.conselho, anchor),
      despesaAcumulada: despesaAcumulada(base.conselho, anchor, gre || null), despesaMensal: despesaMensal(base.conselho, meses, gre || null), diariasMensais: diariasMensais(base.conselho, meses, gre || null),
      adimplencia: adimplenciaPorMunicipio(base.profissionais, anchor), equipe, conselheiros: plenarioNomes, diariasPessoas: diariasPorPessoa(base.conselho, equipe, plenarioNomes, anchor, gre || null), distancia: distanciaUnidade(dataset), origem: municipioDoSolicitante(dataset),
      colegiado: painel.id === 'conselho' ? quadroColegiado(buildColegiado(dataset), base.profissionais, anchor, w.start, w.prevStart, w.prevEnd, { colegiado: colegiado || null, greId: gre || null, cityId: cidade || null }) : null };
  }, [deGestao, painel.id, anchor, period, gre, cidade, colegiado, base]);
  const insights = useMemo(() => leitura({ metas, ponte: derived.ponte, cobertura: model.metrics.coverage.value, rt: model.metrics.rtCoverage.value, resumo: derived.resumo, rec: derived.rec, saldo: model.metrics.overdue.value ?? 0,
    inadimplencia: derived.inadimplencia, linhas: derived.linhas, malha: derived.malha, arts: { atual: derived.arts.atual.length, antes: derived.arts.antes }, cao: derived.cao, estrutura,
    conversao: derived.norte.conversao.atual, tempo: derived.norte.tempo, profissionais: extra.profissionais.resumo, formacao: extra.formacao, conselho: extra.conselho, forcas: extra.forcas }), [metas, derived, model, estrutura, extra]);

  const irPara = (target: PageId) => { if (pages.some(item => item.id === target)) setPage(target); else window.location.href = enderecoPainel(painelDaPagina(target), target); };
  const change = (work: () => void) => transition(work);
  const ctx: CockpitCtx = { dataset: view, f, fEstado, scope, model, history, period, greId: gre || null, camara: camara || null, janela: janelaDe(f.anchor, period), resumo: derived.resumo, regionais: derived.regionais, tokens,
    open: detail => setDetail(anexarEvolucao(detail)), filterGre: id => change(() => { setCidade(''); setGre(previous => previous === id ? '' : id); }), page, go: irPara,
    filtrar: recorte => change(() => { if (recorte.cidade) { setCidade(recorte.cidade); setGre(municipiosDe('').find(row => row.id === recorte.cidade)?.greId ?? ''); } else if (recorte.gre) { setGre(recorte.gre); setCidade(''); } if (recorte.camara) setCamara(recorte.camara); }), dark, cidadeId: cidade || null, enxuto: leve, camaraDe: camaraMap, modalidade: modalidade || null, genero: genero || null,
    anchor, hoje, datasReferencia, setAnchor: value => change(() => setAnchorSel(value && value < hoje ? value : null)),
    historyScope, stateScope, stateModel, stateHistory, linhas: derived.linhas, ponte: derived.ponte, rec: derived.rec, contratos: derived.contratos, malha: derived.malha, estrutura, arts: derived.arts,
    metas, insights, focus, toggleFocus: id => setFocus(previous => previous === id ? null : id), norte: derived.norte, mercado: derived.mercado, ...extra, gestao,
    historico: { pontos: historico.chave === `${view.snapshotDate}|${gre}` ? historico.pontos : [], datas: datasHistorico(view), completo: historico.chave === `${view.snapshotDate}|${gre}` && historico.pontos.length === datasHistorico(view).length } };
  const current = pages.find(item => item.id === page)!;
  const emD = anchor !== hoje;
  const maxMeses = view.months.length;
  // Filtros em uso, mostrados no rodapé com um "x" cada (05/11/2026): o leitor vê o recorte sem olhar os seletores.
  const recorte: { chave: string; rotulo: string; tirar: () => void }[] = [
    ...(gre && !cidade ? [{ chave: 'gre', rotulo: dataset.gres.find(row => row.id === gre)?.name ?? gre, tirar: () => setGre('') }] : []),
    ...(cidade ? [{ chave: 'cidade', rotulo: `${municipiosDe('').find(row => row.id === cidade)?.name ?? cidade} (${dataset.gres.find(row => row.id === gre)?.name ?? ''})`, tirar: () => setCidade('') }] : []),
    ...(camara ? [{ chave: 'camara', rotulo: camara, tirar: () => setCamara('') }] : []),
    ...(colegiado ? [{ chave: 'colegiado', rotulo: colegiado === 'Plenário' ? 'Plenário' : `Câmara ${colegiado}`, tirar: () => setColegiado('') }] : []),
    ...(modalidade ? [{ chave: 'modalidade', rotulo: modalidade, tirar: () => setModalidade('') }] : []),
    ...(genero ? [{ chave: 'genero', rotulo: genero === 'Feminino' ? 'Mulheres' : 'Homens', tirar: () => setGenero('') }] : []),
    ...(porte ? [{ chave: 'porte', rotulo: porte, tirar: () => setPorte('') }] : []),
    ...(situacao ? [{ chave: 'situacao', rotulo: `CNPJ ${situacao.toLowerCase()} na Receita`, tirar: () => setSituacao('') }] : []),
    ...(period !== 12 ? [{ chave: 'meses', rotulo: `${period} meses (${data(ctx.janela.start)} a ${data(ctx.janela.end)})`, tirar: () => { setPeriod(12); setAvisoPeriodo(''); } }] : []),
    ...(emD ? [{ chave: 'data', rotulo: `situação em ${data(anchor)}`, tirar: () => setAnchorSel(null) }] : []),
  ];
  // Busca de empresa (05/11/2026): abre a gaveta com todas as empresas do recorte e o campo de busca em foco; a tecla / faz o mesmo.
  const buscar = () => { setDetail({ kind: 'empresas', title: 'Buscar empresa', what: 'Todas as empresas do recorte atual. Digite parte do nome, do CNPJ ou do município para achar uma e abrir a ficha dela.', ids: [...scope.companyIds] }); window.setTimeout(() => document.getElementById('busca-detalhe')?.focus(), 80); };
  buscarRef.current = buscar;

  return <div className={`ck ${dark ? 'is-dark' : ''} ${emD ? 'is-passado' : ''}`} aria-busy={pending}>
    <nav className="ck-rail" aria-label="Assuntos do painel">
      <div className="ck-logo" title="CREA-SP"><EngineeringEmblem /></div>
      {pages.map((item, index) => <button key={item.id} className={page === item.id ? 'on' : ''} aria-current={page === item.id ? 'page' : undefined} onClick={() => setPage(item.id)} title={`${item.title} (tecla ${item.id === 'metodo' ? 'M' : (index + 1) % 10})`}><item.icon size={18} /><span>{item.label}</span></button>)}
      {painel.id === 'geral' && <div className="ck-rail-paineis">{atalhos.map(item => <a key={item.id} className="ck-rail-painel" href={enderecoPainel(item.id)} title={item.title}><item.icon size={17} /><span>{item.label}<ArrowUpRight size={10} /></span></a>)}</div>}
      <div className="ck-rail-bottom">
        {leve && !deProfissionais && !deGestao && <button onClick={buscar} title="Buscar uma empresa pelo nome, CNPJ ou município (tecla /)"><Search size={17} /><span>Buscar</span></button>}
        <button onClick={() => setModal('metas')} title="Metas usadas nos cartões e no quadro das regionais"><Target size={17} /><span>Metas</span></button>
        <button onClick={() => setModal('fontes')} title="Fontes, métodos e limites"><Database size={17} /><span>Fontes</span></button>
        <button onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'} title={dark ? 'Tema claro' : 'Tema escuro'}>{dark ? <Sun size={17} /> : <Moon size={17} />}<span>{dark ? 'Claro' : 'Escuro'}</span></button>
      </div>
    </nav>
    <div className={`ck-main ${leve ? 'is-enxuto' : ''}`}>
      {leve ? <header className={`ck-header is-enxuto ${painel.filtro === 'modalidade' ? 'tem-genero' : ''}`}>
        <div className="ck-title" title={current.subtitle}><span className="ck-eyebrow">{painel.nome} <span className="ck-legenda-parceria" title="Os blocos com este sinal mostram o que um acordo com outro órgão permitiria medir. Até o acordo ser fechado, os números são demonstrativos."><span className="selo selo-parceria is-compacto" aria-hidden="true">!</span>depende de parceria</span></span><h1>{current.title}</h1></div>
        <section className="ck-filters is-inline" aria-label="Filtros">
          <label className="ck-select"><select aria-label="Regional" value={gre} onChange={event => change(() => { setGre(event.target.value); setCidade(''); })}><option value="">Todas as regionais</option>{dataset.gres.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select><ChevronDown size={14} /></label>
          <label className="ck-select"><select aria-label="Município" value={cidade} onChange={event => change(() => { const id = event.target.value; setCidade(id); if (id) setGre(municipiosDe('').find(row => row.id === id)?.greId ?? ''); })}><option value="">Todos os municípios</option>{municipiosDe(gre).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select><ChevronDown size={14} /></label>
          {painel.filtro === 'modalidade'
            ? <><label className="ck-select"><select aria-label="Modalidade" value={modalidade} onChange={event => change(() => setModalidade(event.target.value))}><option value="">Todas as modalidades</option>{modalidades.map(name => <option key={name} value={name}>{name}</option>)}</select><ChevronDown size={14} /></label>
              <label className="ck-select"><select aria-label="Gênero" value={genero} onChange={event => change(() => setGenero(event.target.value as '' | Genero))}><option value="">Mulheres e homens</option><option value="Feminino">Mulheres</option><option value="Masculino">Homens</option></select><ChevronDown size={14} /></label></>
            : painel.filtro === 'nenhum' ? null : painel.filtro === 'colegiado' ? <label className="ck-select"><select aria-label="Colegiado" value={colegiado} onChange={event => change(() => setColegiado(event.target.value as '' | Colegiado))}><option value="">Todos os colegiados</option>{colegiados.map(name => <option key={name} value={name}>{name === 'Plenário' ? 'Plenário' : `Câmara ${name}`}</option>)}</select><ChevronDown size={14} /></label> : <><label className="ck-select"><select aria-label="Câmara" value={camara} onChange={event => change(() => setCamara(event.target.value))}><option value="">Todas as câmaras</option>{camaras.map(name => <option key={name} value={name}>{name}</option>)}</select><ChevronDown size={14} /></label>
              {!deGestao && <details className={`ck-mais ${porte || situacao ? 'on' : ''}`}><summary title="Mais filtros: porte da empresa e situação do CNPJ na Receita"><SlidersHorizontal size={14} /><span>Mais{porte || situacao ? ` · ${[porte, situacao].filter(Boolean).length}` : ''}</span></summary>
                <div className="ck-mais-menu">
                  <label className="ck-select"><span>Porte</span><select aria-label="Porte" value={porte} onChange={event => change(() => setPorte(event.target.value))}><option value="">Todos os portes</option>{portes.map(name => <option key={name} value={name}>{name}</option>)}</select><ChevronDown size={14} /></label>
                  <label className="ck-select"><span>Situação na Receita</span><select aria-label="Situação na Receita" value={situacao} onChange={event => change(() => setSituacao(event.target.value))}><option value="">Todas as situações</option>{situacoes.map(name => <option key={name} value={name}>{name}</option>)}</select><ChevronDown size={14} /></label>
                  <p>O porte é o da empresa na Receita; a situação é a do CNPJ da matriz. Os dois valem para todas as abas.</p>
                </div></details>}</>}
          <div className="seg" role="radiogroup" aria-label="Período" title={`De ${data(ctx.janela.start)} a ${data(ctx.janela.end)}, comparado com ${data(ctx.janela.prevStart)} a ${data(ctx.janela.prevEnd)}`}>{painel.periodos.map(value => <button key={value} role="radio" aria-checked={period === value} className={period === value ? 'on' : ''} onClick={() => change(() => { setPeriod(value); setAvisoPeriodo(''); })}>{value} meses</button>)}
            <label className={`seg-livre ${painel.periodos.includes(period) ? '' : 'on'}`} title={`Qualquer número de meses até ${maxMeses}: o histórico começa em ${mes(view.months[0])}`}><input type="number" inputMode="numeric" min={1} max={maxMeses} step={1} aria-label="Outro período, em meses" placeholder="outro" value={painel.periodos.includes(period) ? '' : period} onChange={event => { const pedido = Number(event.target.value); if (!Number.isInteger(pedido) || pedido < 1) return; const value = Math.min(maxMeses, pedido); setAvisoPeriodo(pedido > maxMeses ? `O histórico começa em ${mes(view.months[0])}, por isso o período foi limitado a ${maxMeses} meses.` : value > 24 && `${ctx.janela.prevStart}` < `${view.months[0]}-01` ? `Com ${value} meses não há período anterior completo para comparar; as variações ficam sem base.` : ''); change(() => setPeriod(value)); }} />{!painel.periodos.includes(period) && <span>meses</span>}</label></div>
          {(gre || cidade || camara || colegiado || modalidade || genero || porte || situacao || period !== 12 || emD) && <button className="ghost" onClick={() => change(() => { setGre(''); setCidade(''); setCamara(''); setColegiado(''); setModalidade(''); setGenero(''); setPorte(''); setSituacao(''); setPeriod(12); setAnchorSel(null); setAvisoPeriodo(''); })} title="Limpar filtros" aria-label="Limpar filtros"><RotateCcw size={14} /><span className="ck-limpar-texto">Limpar</span></button>}
        </section>
        <div className="ck-meta">
          <span className="demo" title="Dados internos fictícios, gerados para demonstrar o modelo. Dados públicos reais trazem selo próprio.">Demonstrativo</span>
          <label className={`ck-ref ${emD ? 'is-passado' : ''}`} title="Data de referência: o painel inteiro é recalculado com a base como estava nessa data. Nenhum valor é sobrescrito; a mesma base lida em datas diferentes dá os números de cada dia.">
            <CalendarClock size={15} aria-hidden="true" /><span>Data de referência</span>
            <select value={anchorSel ?? ''} onChange={event => ctx.setAnchor(event.target.value || null)} aria-label="Data de referência do painel">
              <option value="">Hoje · {data(hoje)}</option>
              {[...datasReferencia].reverse().map(value => <option key={value} value={value}>{data(value)}</option>)}
            </select><ChevronDown size={14} />
          </label>
        </div>
      </header> : <>
      <header className="ck-header">
          <div className="ck-title"><span className="ck-eyebrow" title="Inteligência Estratégica Crea-SP, programa de dados da EDAD (SUPTEC)">{painel.nome} <span className="ck-legenda-parceria" title="Os blocos e as regras com este sinal mostram o que um acordo com outro órgão permitiria medir. Até o acordo ser fechado, os números são demonstrativos."><span className="selo selo-parceria is-compacto" aria-hidden="true">!</span>depende de parceria</span></span><h1>{current.title}</h1><p>{current.subtitle}</p></div>
          <div className="ck-meta">
            <span className="demo" title="Dados internos fictícios, gerados para demonstrar o modelo. Dados públicos reais trazem selo próprio.">Demonstrativo</span>
            <label className={`ck-ref ${emD ? 'is-passado' : ''}`} title="Data de referência: o painel inteiro é recalculado com a base como estava nessa data. Nenhum valor é sobrescrito; a mesma base lida em datas diferentes dá os números de cada dia.">
              <CalendarClock size={15} aria-hidden="true" /><span>Data de referência</span>
              <select value={anchorSel ?? ''} onChange={event => ctx.setAnchor(event.target.value || null)} aria-label="Data de referência do painel">
                <option value="">Hoje · {data(hoje)}</option>
                {[...datasReferencia].reverse().map(value => <option key={value} value={value}>{data(value)}</option>)}
              </select><ChevronDown size={14} />
            </label>
          </div>
        </header>
        <section className="ck-filters" aria-label="Filtros">
          <label className="ck-select"><span>Regional</span><select value={gre} onChange={event => change(() => setGre(event.target.value))}><option value="">Todas</option>{dataset.gres.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select><ChevronDown size={14} /></label>
          <label className="ck-select"><span>Câmara</span><select value={camara} onChange={event => change(() => setCamara(event.target.value))}><option value="">Todas</option>{camaras.map(name => <option key={name} value={name}>{name}</option>)}</select><ChevronDown size={14} /></label>
          <div className="seg" role="radiogroup" aria-label="Período">{painel.periodos.map(value => <button key={value} role="radio" aria-checked={period === value} className={period === value ? 'on' : ''} onClick={() => change(() => setPeriod(value))}>{value} meses</button>)}</div>
          <span className="ck-window">De {data(ctx.janela.start)} a {data(ctx.janela.end)}, comparado com {data(ctx.janela.prevStart)} a {data(ctx.janela.prevEnd)}.{emD && <> Situação em <strong>{data(anchor)}</strong>.</>}</span>
          {(gre || camara || period !== 12 || emD) && <button className="ghost" onClick={() => change(() => { setGre(''); setCamara(''); setPeriod(12); setAnchorSel(null); })}><RotateCcw size={14} />Limpar filtros</button>}
        </section>
      </>}
      <main className={`ck-page ck-page-${page} ${focus ? 'has-focus' : ''}`} key={page}><current.Page ctx={ctx} /></main>
      <footer className="ck-status"><span className={`ck-live ${pending ? 'is-busy' : ''}`} aria-hidden="true" /><strong>{deGestao && gestao ? (painel.id === 'financeiro' ? `${brl(gestao.divida.total)} de anuidades vencidas no recorte` : painel.id === 'atendimento' ? (estrutura ? `${int(estrutura.atendimento.pedidos.length)} solicitações de atendimento no período` : 'Calculando o atendimento…') : gestao.colegiado ? `${int(gestao.colegiado.pendentes.length)} processos esperando voto no recorte` : '') : deProfissionais ? `${int(extra.profissionais.resumo.ativos.length)} profissionais ativos no recorte` : deFiscalizacao ? `${int(derived.resumo.acoes.length)} ações de fiscalização no recorte` : leve ? `${int(model.companyFacts.filter(row => row.active || row.eligibleEstablishments > 0).length)} empresas com atividade de engenharia no recorte` : `${int(scope.companies.length)} empresas no recorte`}</strong>
        {leve && recorte.length > 0 && <ul className="ck-chips" aria-label="Filtros em uso">{recorte.map(chip => <li key={chip.chave}><span>{chip.rotulo}</span><button aria-label={`Tirar o filtro ${chip.rotulo}`} title="Tirar este filtro" onClick={() => change(chip.tirar)}><X size={11} /></button></li>)}</ul>}
        <span className="ck-status-note">{pending ? 'Recalculando…' : avisoPeriodo ? avisoPeriodo : focus ? 'Bloco ampliado. Aperte Esc para voltar.' : emD ? `O painel mostra a situação em ${data(anchor)}. Escolha “Hoje” na data, no alto da tela, para voltar.` : deGestao ? `Clique num item para ver ${painel.id === 'financeiro' ? 'os devedores ou os lançamentos' : painel.id === 'atendimento' ? 'as solicitações ou os profissionais' : 'os processos, os conselheiros ou as organizações'}. O (i) explica cada bloco e diz quais filtros valem para ele.` : leve ? `Clique num item para ver ${deProfissionais ? 'os profissionais' : deFiscalizacao ? 'as ações, as empresas ou os contratos' : 'as empresas'}. O (i) explica cada bloco.${deProfissionais ? '' : ' A tecla / busca uma empresa.'}` : 'As teclas 1 a 9 e M trocam de aba. O botão (i) explica cada bloco. Clique em qualquer número, barra ou regional para ver a lista de empresas.'}</span></footer>
    </div>
    {detail && <Drawer ctx={ctx} detail={detail} onClose={() => setDetail(null)} />}
    {modal === 'metas' && <Janela title="Metas do painel" subtitle="As metas usadas nos cartões, no quadro das regionais e nos destaques. Elas ficam salvas neste navegador." onClose={() => setModal(null)}><MetasForm metas={metas} onChange={setMetas} /></Janela>}
    {modal === 'fontes' && <Janela title="Fontes, métodos e limites" subtitle="O que é dado real, o que é demonstrativo e como cada número é calculado" onClose={() => setModal(null)}><Fontes /></Janela>}
  </div>;
}

function Janela({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
  return <div className="drawer-backdrop ck-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="ck-modal" role="dialog" aria-modal="true" aria-label={title}>
      <header><div><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={18} /></button></header>
      <div className="ck-modal-body">{children}</div>
    </div>
  </div>;
}

const camposMeta: { key: keyof Metas; label: string; help: string }[] = [
  { key: 'cobertura', label: 'Cobertura cadastral estimada', help: 'CNPJs completos com CNAE da lista ativos na Receita com registro ou visto vigente' },
  { key: 'rt', label: 'Empresas com responsável técnico', help: 'Empresas ativas com RT de vínculo vigente' },
  { key: 'adimplencia', label: 'Adimplência', help: 'Empresas cobradas sem saldo vencido' },
  { key: 'recuperacao', label: 'Recuperação da dívida', help: 'Parcela do saldo vencido no início recebida no período' },
  { key: 'regularizacao', label: 'Regularização após ação', help: 'Ações do período já regularizadas e conversão em 180 dias da coorte' },
  { key: 'atendimento', label: 'Atendimento no prazo', help: 'Solicitações resolvidas em até 14 dias' },
];
function MetasForm({ metas, onChange }: { metas: Metas; onChange: (value: Metas) => void }) {
  return <div className="ck-metas">{camposMeta.map(field => <label key={field.key}><span><b>{field.label}</b><small>{field.help}</small></span>
    <input type="range" min={0} max={100} value={metas[field.key]} onChange={event => onChange({ ...metas, [field.key]: Number(event.target.value) })} aria-label={field.label} /><output>{metas[field.key]}%</output></label>)}
    <button className="ghost" onClick={() => onChange(metasPadrao)}><RotateCcw size={14} />Restaurar metas padrão</button>
    <p className="what">Metas são parâmetros de leitura ajustáveis, como parâmetros de cenário do Power BI; não são metas oficiais do CREA-SP. O plano recomenda fixar metas só depois de dois ciclos de medição da linha de base.</p></div>;
}

function Fontes() {
  const reais = [resultados2025.fonte, despesaPublicada.fonte, fonteConfea, registrosNovos.fonte, pisoPublico.fonte, formacaoSp.fonte];
  return <div className="ck-fontes">
    <article><h3>O que é real e o que é demonstrativo</h3><p>Quase todos os números deste painel vêm de um cenário fictício, montado para mostrar como o painel vai funcionar. O cenário é sempre o mesmo (semente {dataset.seed}), por isso os números não mudam de uma abertura para outra. Os poucos dados reais levam o selo “Real” e estão listados no fim desta janela. Em produção, os números virão das bases do Crea-SP e das fontes públicas descritas abaixo.</p></article>
    <article><h3>Dados do Crea-SP</h3><p>O cenário imita o que o Crea-SP já tem: o cadastro de empresas e estabelecimentos, os registros, os responsáveis técnicos, as ARTs, as certidões, as anuidades e os pagamentos. Também imita os profissionais, as entidades de classe e as instituições de ensino com seus repasses e convênios, a despesa e a receita do Conselho, as diárias, os fornecedores, o pessoal, o atendimento, os coworkings e a capacitação.</p><p>As ações de fiscalização, os autos, as multas e as regularizações são sorteados a partir de acontecimentos do cadastro, como um primeiro registro, a saída de um responsável técnico sem substituto ou um contrato público sem ART. Em produção, virão do sistema de fiscalização do Crea-SP.</p></article>
    <article><h3>Fontes públicas com coleta automática</h3><p>O painel só usa fontes públicas que podem ser coletadas automaticamente e com frequência. São elas: os contratos e planos de contratação do Portal Nacional de Contratações Públicas (PNCP), as obras públicas do Obrasgov, o quadro de sócios que a Receita publica todo mês, as instalações registradas na ANEEL, na ANP, na ANM e no BNDES, a população dos municípios, o emprego formal agregado (RAIS e Novo CAGED), o Censo da Educação Superior do INEP e as proposições legislativas da Câmara, do Senado e da Assembleia Legislativa. Em todas, a empresa é identificada pelo CNPJ exato, e cada fato guarda a sua data.</p></article>
    <article><h3>O que depende de acordo (sinal “!”)</h3><p>Algumas informações só existem com acordo entre o Crea-SP e outro órgão. Elas entraram no painel como demonstração, com os dados que o acordo precisaria entregar, e levam o sinal “!”. São elas: as obras privadas do Cadastro Nacional de Obras (Receita Federal e Serpro), os alvarás das prefeituras, os autos de vistoria do Corpo de Bombeiros, as licenças ambientais da CETESB, as nomeações de peritos do Tribunal de Justiça, os pagamentos por contrato do Tribunal de Contas do Estado e do Município, o crédito por município e atividade do Banco Central, os sócios pessoas físicas com CPF completo (Receita Federal e Junta Comercial), a lista nominal de formados das instituições de ensino e o número de empregados por empresa do Ministério do Trabalho, sem salários.</p><p>Duas regras da malha fina usam esses dados: obra privada sem ART e alvará ou licença de obra sem ART. Elas ficam fora das contagens de casos confirmados. O PIB e o valor adicionado dos municípios vêm do IBGE e não dependem de acordo. Nenhum número marcado com “!” é real.</p></article>
    <article><h3>A data no alto da tela</h3><p>Cada fato do cenário guarda quando começou e quando terminou. Ao escolher uma data, o painel considera só o que já existia naquele dia e refaz todas as abas. Nenhum valor é apagado ou substituído, e a mesma base lida em dias diferentes mostra os números de cada dia. O histórico da Presidência e da Malha fina faz a mesma conta no fim de cada um dos 12 meses anteriores. Em produção, esse papel será de uma tabela diária de indicadores no banco de dados do Crea-SP.</p></article>
    <article><h3>O que foi retirado e por quê</h3><p>Saíram do painel as informações que não têm coleta automática nem acordo previsto, como o Portal Salário, e as que ligariam pessoas ou salários a empresas sem base legal. O quadro de sócios público esconde parte do CPF, e o emprego público só existe em agregado, por isso nenhum dos dois é ligado a uma empresa ou pessoa sem acordo. A aba Método detalha cada caso.</p></article>
    <article><h3>Dados públicos reais (selo “Real”)</h3><ul>{reais.map(item => <li key={item.nome}><b>{item.nome}</b>, coletado em {data(item.data)} (<a href={item.url} target="_blank" rel="noreferrer">ver a origem</a>)</li>)}</ul></article>
    <article><h3>Como os números são calculados</h3><ul>
      <li>As variações comparam o período escolhido com o mesmo período um ano antes. A regional da empresa é a da matriz, e a do profissional é a do município onde ele mora.</li>
      <li>A situação de uma empresa no Crea-SP é lida na data de cada fato (contrato, ação ou pagamento), e não na data de hoje.</li>
      <li>Toda ligação entre bases tem um grau de confiança. Ela é confirmada quando há documento ou CNPJ exato, é candidata quando ainda precisa de revisão, e é só contexto quando o dado é agregado. As candidatas ficam fora das contagens confirmadas.</li>
      <li>O resultado de uma força-tarefa é a parte das ações que terminaram em regularização em 180 dias. Ele é comparado com ações do mesmo tipo e período feitas em outras regionais. A diferença ajuda a leitura, mas não prova que a força-tarefa causou o resultado.</li>
      <li>Na formação, o painel acompanha os formados de cada ano: quantos se registraram em até 24 meses, quantos registraram ao menos uma ART e quantos continuam ativos e com a anuidade em dia. Um ano só é considerado completo depois de 24 ou 48 meses.</li>
      <li>A despesa do Conselho é mostrada sem juízo sobre o gasto. A capacitação aparece só com custo e alcance, sem medida de efeito.</li>
      <li>Nos mapas, cada regional é formada pelos seus municípios. Em produção, será usada a tabela oficial que liga município, unidade e regional.</li>
      <li>Os tempos até regularizar e até agir levam em conta os casos ainda abertos, que não contam como zero (método de Kaplan-Meier).</li>
      <li>A câmara de cada empresa é estimada pela atividade principal da matriz. Em produção, virá do cadastro técnico, que liga atividade, atribuição e modalidade.</li>
    </ul></article>
  </div>;
}
