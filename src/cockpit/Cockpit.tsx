import { useEffect, useMemo, useState, useTransition } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { ArrowUpRight, BookOpenCheck, Building2, CalendarClock, ChevronDown, ClipboardCheck, Database, FileSignature, GraduationCap, Handshake, HardHat, Headset, Landmark, LayoutGrid, Moon, Network, RotateCcw, ScanSearch, ShieldCheck, Sun, Target, TrendingUp, Wallet, X } from 'lucide-react';
import { dataset } from '../domain/dataset';
import { datasReferencia as datasReferenciaDe, datasetAt, fiscalizacaoAt } from '../domain/tempo';
import { defaultFilters } from '../domain/types';
import type { Dataset, Filters } from '../domain/types';
import type { Scope } from '../domain/engine';
import { buildProfissionais, buildEmpregoCbo, remuneracaoPorCbo, resumoProfissionais } from '../domain/profissionais';
import { buildFormacao, quadroFormacao } from '../domain/formacao';
import { buildEntidades, quadroEntidades } from '../domain/entidades';
import { buildConselho, quadroConselho } from '../domain/conselho';
import { buildInstalacoes, buildObras, buildSociedades, quadroInstalacoes, quadroObras, quadroSociedades } from '../domain/frentes';
import { datasHistorico, pontoHistorico } from '../observatorio/historico';
import type { PontoHistorico } from '../observatorio/historico';
import { aberturasRfb, buildDemandaPlanejada, concentracaoMercado, permanenciaCoorte, quadroDemanda } from '../domain/mercado';
import { buildCno, buildCredenciamentos, buildDespesaTce, buildJucesp, buildLicencas, buildPericias, buildSociosPf, buildVinculos, coorteNominal, quadroCno, quadroCredenciamentos, quadroJucesp, quadroLicencas, quadroPericias, quadroSociosPf, quadroTce, quadroVinculos } from '../domain/parcerias';
import type { EnterpriseModel } from '../enterprise-v10/types';
import { EngineeringEmblem } from '../components/EngineeringIdentity';
import { selectEnterpriseScope } from '../enterprise-v10/filters';
import { buildEnterpriseModel } from '../enterprise-v10/model';
import { caoService } from '../gestao-v14/metrics';
import { buildFiscalizacao, tipoLabel } from '../painel/fiscalizacao';
import { resultadosForcas } from '../painel/forcas';
import { cobertura, contagens, conversao, receitaAtribuivel, tempoAteAgir } from '../observatorio/norte';
import { camaraDaEmpresa, camaraPorCnae, camaras, contratosPublicos, devedoras, janela as janelaDe, ponteBase, porRegional, receita, resumoFiscal } from '../painel/analise';
import { useTokens } from '../painel/chart';
import type { Detail } from '../painel/contexto';
import Drawer from '../painel/Drawer';
import { data, int } from '../painel/ui';
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
import PaginaProfissionais from './PaginaProfissionais';
import PaginaFormacao from './PaginaFormacao';
import PaginaFiscalizacao from './PaginaFiscalizacao';
import PaginaMalha from './PaginaMalha';
import PaginaReceita from './PaginaReceita';
import PaginaEntidades from './PaginaEntidades';
import PaginaControle from './PaginaControle';
import PaginaAtendimento from './PaginaAtendimento';
import PaginaMetodo from './PaginaMetodo';
import PaginaMercado from '../empresas/PaginaMercado';
import PaginaEvolucao from '../empresas/PaginaEvolucao';
import PaginaRt from '../empresas/PaginaRt';
import PaginaVinculos from '../empresas/PaginaVinculos';
import '../empresas/empresas.css';
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
  { id: 'profissionais', label: 'Profissionais', title: 'Profissionais', subtitle: 'Quantos profissionais estão ativos, quantos entram e saem, quem são, se pagam a anuidade, quantas ARTs registram e quantos empregos formais existem na área', icon: HardHat, Page: PaginaProfissionais },
  { id: 'formacao', label: 'Formação', title: 'Formação e registro', subtitle: 'Quantos se formam a cada ano e quantos se registram, trabalham e continuam no sistema, por instituição, modalidade e canal', icon: GraduationCap, Page: PaginaFormacao },
  { id: 'fiscalizacao', label: 'Fiscalização', title: 'Fiscalização', subtitle: 'Quantas ações a fiscalização faz, onde o processo demora, quantas terminam em regularização e qual foi o resultado das forças-tarefas', icon: ShieldCheck, Page: PaginaFiscalizacao },
  { id: 'malha', label: 'Malha fina', title: 'Malha fina', subtitle: 'Empresas apontadas pelo cruzamento de dados, separadas por regra e pela confiança do indício. A lista serve para análise e nunca gera auto de infração sozinha', icon: ScanSearch, Page: PaginaMalha },
  { id: 'receita', label: 'Receita', title: 'Receita e cobrança', subtitle: 'Quanto o Conselho arrecada das empresas, quanto está vencido, quanto da dívida é recuperado e como anda o orçamento', icon: Wallet, Page: PaginaReceita },
  { id: 'entidades', label: 'Entidades', title: 'Entidades de classe e instituições de ensino', subtitle: 'As organizações que se relacionam com o Conselho, os repasses, convênios, contratos e patrocínios, e as cadeiras que ocupam no plenário', icon: Handshake, Page: PaginaEntidades },
  { id: 'controle', label: 'Controle', title: 'Controle interno', subtitle: 'Em que o Conselho gasta, com diárias, fornecedores, contratos e pessoal, e a despesa que ele publica no Portal da Transparência', icon: ClipboardCheck, Page: PaginaControle },
  { id: 'atendimento', label: 'Atendimento', title: 'Atendimento e estrutura', subtitle: 'Se as solicitações são resolvidas no prazo, como os coworkings são usados e como está a qualidade do cadastro', icon: Headset, Page: PaginaAtendimento },
  { id: 'metodo', label: 'Método', title: 'Método, regras e fontes', subtitle: 'O que cada cruzamento permite concluir, o que foi corrigido no painel, as perguntas que ele responde, as regras da malha fina, as fontes de dados e o uso de inteligência artificial', icon: BookOpenCheck, Page: PaginaMetodo },
];
/** Painel de Empresas: o primeiro painel separado do painel geral (01/11/2026), com filtros de regional, câmara, período e data que valem para todas as páginas. */
const paginasEmpresas: PaginaDef[] = [
  { id: 'mercado', label: 'Mercado', title: 'Mercado e registro', subtitle: 'Quantas empresas com atividade de engenharia existem, quantas estão registradas no Crea-SP e em que atividades estão as que faltam', icon: Building2, Page: PaginaMercado },
  { id: 'evolucao', label: 'Evolução', title: 'Evolução das empresas', subtitle: 'Como a economia, a abertura de empresas de engenharia e os registros no Crea-SP andaram juntos, e quantas empresas entram e saem da base', icon: TrendingUp, Page: PaginaEvolucao },
  { id: 'rt', label: 'RT e ART', title: 'Responsáveis técnicos e ARTs', subtitle: 'Quantas empresas registradas têm responsável técnico, quantas empresas cada profissional assume e quantas ARTs as empresas registram', icon: FileSignature, Page: PaginaRt },
  { id: 'vinculos', label: 'Vínculos', title: 'Sócios, instalações e empregados', subtitle: 'Com quem as empresas se ligam: sócios, instalações e financiamentos de setores regulados, empregados técnicos, credenciamentos e alterações no contrato social', icon: Network, Page: PaginaVinculos },
];
export type PainelId = 'geral' | 'empresas';
interface Painel { id: PainelId; nome: string; paginas: PaginaDef[]; periodos: number[]; storage: string; outro: { id: PainelId; label: string; title: string } }
const paineis: Record<PainelId, Painel> = {
  geral: { id: 'geral', nome: 'Inteligência Estratégica', paginas: paginasGeral, periodos: [3, 6, 12], storage: 'crea-observatorio-v20', outro: { id: 'empresas', label: 'Empresas', title: 'Abrir o painel de Empresas' } },
  empresas: { id: 'empresas', nome: 'Inteligência Estratégica · Empresas', paginas: paginasEmpresas, periodos: [3, 6, 12, 24], storage: 'crea-empresas-v1', outro: { id: 'geral', label: 'Geral', title: 'Abrir o painel geral' } },
};
/** Endereço de outro painel: no site, empresas.html e index.html; na entrega em arquivo único, os dois HTML lado a lado na pasta entrega. */
export function enderecoPainel(id: PainelId, pagina?: PageId) {
  const entrega = /painel-[a-z-]+\.html$/.test(window.location.pathname);
  const arquivo = entrega ? (id === 'empresas' ? 'painel-empresas-creasp.html' : 'painel-gestao-creasp.html') : (id === 'empresas' ? 'empresas.html' : 'index.html');
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
const filtros = (greIds: string[], period: number): Filters => ({ ...defaultFilters, greIds, period });
const camaraMap = camaraDaEmpresa(dataset);
const hoje = dataset.snapshotDate;
const datasReferencia = datasReferenciaDe(dataset);
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
  const [page, setPage] = useState<PageId>(() => { const hash = window.location.hash.slice(1), saved = pages.some(item => item.id === hash) ? hash : ler<string>('pagina', pages[0].id); return pages.some(item => item.id === saved) ? saved as PageId : pages[0].id; });
  const [gre, setGre] = useState('');
  const [camara, setCamara] = useState('');
  const [period, setPeriod] = useState(12);
  const leve = painel.id === 'empresas';
  const [anchorSel, setAnchorSel] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark' | null>(() => ler<'light' | 'dark' | null>('tema', null));
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
  useEffect(() => { gravar('metas', metas); }, [metas]);
  // Atendimento, estrutura e orçamento vêm do modelo institucional (cerca de 1 s na primeira vez): calculado depois da primeira pintura.
  useEffect(() => { if (leve) return; let alive = true; setEstrutura(null); const id = window.setTimeout(() => { const value = estruturaDe(view, gre || null, period); if (alive) setEstrutura(value); }, 30); return () => { alive = false; window.clearTimeout(id); }; }, [view, gre, period, leve]);
  // Histórico por data de referência: um ponto por mês (cerca de 1 s cada), calculado depois da estrutura, um de cada vez, com cache.
  useEffect(() => {
    if (leve) return;
    let alive = true; const chave = `${view.snapshotDate}|${gre}`, datas = datasHistorico(view), fBase = camadasDe(view).f;
    setHistorico({ chave, pontos: [] });
    const passo = (index: number) => { if (!alive || index >= datas.length) return; const ponto = pontoHistorico(dataset, fBase, datas[index], gre || null); if (!alive) return; setHistorico(previous => previous.chave === chave ? { chave, pontos: [...previous.pontos, ponto] } : previous); window.setTimeout(() => passo(index + 1), 40); };
    const id = window.setTimeout(() => passo(0), 400);
    return () => { alive = false; window.clearTimeout(id); };
  }, [view, gre, leve]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === 'Escape') { if (detail) setDetail(null); else if (modal) setModal(null); else setFocus(null); return; }
      if (event.ctrlKey || event.metaKey || event.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || modal || detail) return;
      if (/^[0-9]$/.test(event.key)) { const index = event.key === '0' ? 9 : Number(event.key) - 1; if (pages[index]) setPage(pages[index].id); }
      else if ((event.key === 'm' || event.key === 'M') && pages.some(item => item.id === 'metodo')) setPage('metodo');
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [detail, modal, pages]);

  const subset = useMemo(() => camara ? view.companies.filter(row => camaraMap.get(row.id) === camara).map(row => row.id) : undefined, [view, camara]);
  const scope = useMemo(() => selectEnterpriseScope(view, filtros(gre ? [gre] : [], period), subset), [view, gre, period, subset]);
  const historyScope = useMemo(() => selectEnterpriseScope(view, filtros(gre ? [gre] : [], 24), subset), [view, gre, subset]);
  const stateScope = useMemo(() => gre ? selectEnterpriseScope(view, filtros([], period), subset) : scope, [view, gre, period, subset, scope]);
  const stateHistoryScope = useMemo(() => gre ? selectEnterpriseScope(view, filtros([], 24), subset) : historyScope, [view, gre, subset, historyScope]);
  const model = useMemo(() => modelo(`${anchor}|${gre}|${camara}|${period}`, scope), [scope]); // eslint-disable-line react-hooks/exhaustive-deps
  const history = useMemo(() => modelo(`${anchor}|${gre}|${camara}|24`, historyScope), [historyScope]); // eslint-disable-line react-hooks/exhaustive-deps
  const stateModel = useMemo(() => modelo(`${anchor}||${camara}|${period}`, stateScope), [stateScope]); // eslint-disable-line react-hooks/exhaustive-deps
  const stateHistory = useMemo(() => modelo(`${anchor}||${camara}|24`, stateHistoryScope), [stateHistoryScope]); // eslint-disable-line react-hooks/exhaustive-deps
  const base = useMemo(() => camadasDe(view), [view]);
  const f = useMemo(() => { const all = base.f; return camara ? { ...all, acoes: all.acoes.filter(row => camaraMap.get(row.companyId) === camara), alvos: all.alvos.filter(row => camaraMap.get(row.companyId) === camara) } : all; }, [base, camara]);
  const derived = useMemo(() => {
    const resumo = resumoFiscal(f, gre || null, period);
    const regionais = porRegional(view, f, stateModel, period, camara ? { empresa: id => camaraMap.get(id) === camara, cnae: code => camaraPorCnae[code] === camara } : {});
    const contratos = contratosPublicos(scope, period), malha = malhaFina(scope, model, f, contratos);
    const stateMalha = gre ? malhaFina(stateScope, stateModel, f, contratosPublicos(stateScope, period)) : malha;
    const arts = artsPeriodo(scope, period), stateArts = gre ? artsPeriodo(stateScope, period) : arts;
    const linhas = linhasGre(stateModel, stateHistory, stateScope, regionais, period, stateMalha, stateArts.atual);
    const cobradas = model.metrics.compliance.denominatorCompanyIds?.length ?? 0;
    const norte = { cobertura: cobertura(scope, model), contagens: contagens(scope, model), conversao: conversao(f, gre || null), receita: receitaAtribuivel(view, f, gre || null, period), tempo: tempoAteAgir(view, f, gre || null, period, tipoLabel) };
    const mercado = { concentracao: concentracaoMercado(contratos), demanda: quadroDemanda(buildDemandaPlanejada(view)), aberturas: aberturasRfb(view, gre || null, 24), permanencia: [3, 6, 12].map(meses => permanenciaCoorte(view, scope.companyIds, meses)) };
    return { resumo, regionais, contratos, malha, arts, linhas, ponte: ponteBase(model, scope, f, period), rec: receita(history, f, gre || null, period),
      inadimplencia: cobradas ? devedoras(model).size / cobradas * 100 : null, cao: caoService(scope).median, norte, mercado };
  }, [view, f, gre, period, camara, scope, model, history, stateScope, stateModel, stateHistory]);
  // Camadas da V20: profissionais, formação, entidades, controle interno e forças-tarefas, todas lidas em D.
  const extra = useMemo(() => {
    const greId = gre || null;
    const profissionais = { modelo: base.profissionais, resumo: resumoProfissionais(base.profissionais, view, greId, period), cbo: remuneracaoPorCbo(base.emprego, anchor, greId) };
    const formacao = quadroFormacao(base.formacao, base.profissionais, view, greId);
    const entidades = quadroEntidades(base.entidades, anchor, greId);
    const inicio = janelaDe(anchor, 12).start, acoesPorGre = new Map<string, number>();
    for (const row of f.acoes) if (row.date >= inicio && row.date <= anchor) acoesPorGre.set(row.greId, (acoesPorGre.get(row.greId) ?? 0) + 1);
    const conselho = quadroConselho(base.conselho, anchor, greId, acoesPorGre);
    const forcas = resultadosForcas(view, f, greId);
    const frentes = { sociedades: quadroSociedades(base.sociedades, view, scope.companyIds, greId), obras: quadroObras(base.obras, view, scope.companyIds, greId), instalacoes: quadroInstalacoes(base.instalacoes, view, greId) };
    const parcerias = { cno: quadroCno(base.cno, view, scope.companyIds, greId), licencas: quadroLicencas(base.licencas, view, scope.companyIds, greId), pericias: quadroPericias(base.pericias, view, base.profissionais, greId), tce: quadroTce(base.tce, derived.contratos),
      sociosPf: quadroSociosPf(base.sociosPf, view, base.profissionais, scope.companyIds, greId), coorteNominal: coorteNominal(base.formacao, base.profissionais, view, greId), vinculos: quadroVinculos(base.vinculos, view, scope.companyIds, greId),
      credenciamentos: quadroCredenciamentos(base.credenciamentos, view, scope.companyIds, greId), jucesp: quadroJucesp(base.jucesp, view, scope.companyIds, greId) };
    return { profissionais, formacao, entidades, conselho, forcas, frentes, parcerias };
  }, [base, view, anchor, f, gre, period, scope, derived.contratos]);
  const insights = useMemo(() => leitura({ metas, ponte: derived.ponte, cobertura: model.metrics.coverage.value, rt: model.metrics.rtCoverage.value, resumo: derived.resumo, rec: derived.rec, saldo: model.metrics.overdue.value ?? 0,
    inadimplencia: derived.inadimplencia, linhas: derived.linhas, malha: derived.malha, arts: { atual: derived.arts.atual.length, antes: derived.arts.antes }, cao: derived.cao, estrutura,
    conversao: derived.norte.conversao.atual, tempo: derived.norte.tempo, profissionais: extra.profissionais.resumo, formacao: extra.formacao, conselho: extra.conselho, forcas: extra.forcas }), [metas, derived, model, estrutura, extra]);

  // No painel de Empresas, os destaques são só os das páginas dele; no geral, um destaque de empresas abre o painel de Empresas.
  const destaques = leve ? insights.filter(item => pages.some(row => row.id === item.page)) : insights;
  const irPara = (target: PageId) => { if (pages.some(item => item.id === target)) setPage(target); else window.location.href = enderecoPainel(painelDaPagina(target), target); };
  const change = (work: () => void) => transition(work);
  const ctx: CockpitCtx = { dataset: view, f, scope, model, history, period, greId: gre || null, camara: camara || null, janela: janelaDe(f.anchor, period), resumo: derived.resumo, regionais: derived.regionais, tokens,
    open: setDetail, filterGre: id => change(() => setGre(previous => previous === id ? '' : id)), page, go: irPara, dark,
    anchor, hoje, datasReferencia, setAnchor: value => change(() => setAnchorSel(value && value < hoje ? value : null)),
    historyScope, stateScope, stateModel, stateHistory, linhas: derived.linhas, ponte: derived.ponte, rec: derived.rec, contratos: derived.contratos, malha: derived.malha, estrutura, arts: derived.arts,
    metas, insights, focus, toggleFocus: id => setFocus(previous => previous === id ? null : id), norte: derived.norte, mercado: derived.mercado, ...extra,
    historico: { pontos: historico.chave === `${view.snapshotDate}|${gre}` ? historico.pontos : [], datas: datasHistorico(view), completo: historico.chave === `${view.snapshotDate}|${gre}` && historico.pontos.length === datasHistorico(view).length } };
  const current = pages.find(item => item.id === page)!;
  const emD = anchor !== hoje;

  return <div className={`ck ${dark ? 'is-dark' : ''} ${emD ? 'is-passado' : ''}`} aria-busy={pending}>
    <nav className="ck-rail" aria-label="Assuntos do painel">
      <div className="ck-logo" title="CREA-SP"><EngineeringEmblem /></div>
      {pages.map((item, index) => <button key={item.id} className={page === item.id ? 'on' : ''} aria-current={page === item.id ? 'page' : undefined} onClick={() => setPage(item.id)} title={`${item.title} (tecla ${item.id === 'metodo' ? 'M' : (index + 1) % 10})`}><item.icon size={18} /><span>{item.label}</span></button>)}
      <a className="ck-rail-painel" href={enderecoPainel(painel.outro.id)} title={painel.outro.title}>{painel.outro.id === 'empresas' ? <Building2 size={18} /> : <LayoutGrid size={18} />}<span>{painel.outro.label}<ArrowUpRight size={10} /></span></a>
      <div className="ck-rail-bottom">
        <button onClick={() => setModal('metas')} title="Metas usadas nos cartões e no quadro das regionais"><Target size={17} /><span>Metas</span></button>
        <button onClick={() => setModal('fontes')} title="Fontes, métodos e limites"><Database size={17} /><span>Fontes</span></button>
        <button onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'} title={dark ? 'Tema claro' : 'Tema escuro'}>{dark ? <Sun size={17} /> : <Moon size={17} />}<span>{dark ? 'Claro' : 'Escuro'}</span></button>
      </div>
    </nav>
    <div className="ck-main">
      <header className="ck-header">
        <div className="ck-title"><span className="ck-eyebrow" title="Inteligência Estratégica Crea-SP, programa de dados da EDAD (SUPTEC)">{painel.nome} <span className="ck-legenda-parceria" title="Os blocos e as regras com este sinal mostram o que um acordo com outro órgão permitiria medir. Até o acordo ser fechado, os números são demonstrativos."><span className="selo selo-parceria is-compacto" aria-hidden="true">!</span>depende de parceria</span></span><h1>{current.title}</h1><p>{current.subtitle}</p></div>
        <div className="ck-pulse" aria-label="Destaques do período">
          <span className="ck-pulse-dot" aria-hidden="true" />
          <div className="ck-pulse-track">{[...destaques, ...destaques].map((item, index) => <button key={index} className={`is-${item.tone}`} aria-hidden={index >= destaques.length} tabIndex={index >= destaques.length ? -1 : 0} onClick={() => irPara(item.page)}><b>{item.strong}</b> {item.text}</button>)}</div>
        </div>
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
      <main className={`ck-page ck-page-${page} ${focus ? 'has-focus' : ''}`} key={page}><current.Page ctx={ctx} /></main>
      <footer className="ck-status"><span className={`ck-live ${pending ? 'is-busy' : ''}`} aria-hidden="true" /><strong>{int(scope.companies.length)} empresas no recorte</strong>
        <span className="ck-status-note">{pending ? 'Recalculando…' : focus ? 'Bloco ampliado. Aperte Esc para voltar.' : emD ? `O painel mostra a situação em ${data(anchor)}. Escolha “Hoje” na data, no alto da tela, para voltar.` : leve ? 'As teclas 1 a 4 trocam de página. Os filtros do alto valem para todas as páginas. Clique numa barra, faixa ou ponto para ver as empresas daquele item.' : 'As teclas 1 a 9 e M trocam de aba. O botão (i) explica cada bloco. Clique em qualquer número, barra ou regional para ver a lista de empresas.'}</span></footer>
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
