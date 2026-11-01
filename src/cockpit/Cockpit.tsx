import { useEffect, useMemo, useState, useTransition } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { BookOpenCheck, Building2, CalendarClock, ChevronDown, ClipboardCheck, Database, GraduationCap, Handshake, HardHat, Headset, Landmark, Moon, RotateCcw, ScanSearch, ShieldCheck, Sun, Target, Wallet, X } from 'lucide-react';
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
import { aberturasRfb, buildDemandaPlanejada, concentracaoMercado, densidadeRegional, permanenciaCoorte, quadroDemanda } from '../domain/mercado';
import { buildCno, buildDespesaTce, buildLicencas, buildPericias, buildSociosPf, buildVinculos, contextoEconomico, coorteNominal, quadroCno, quadroLicencas, quadroPericias, quadroSociosPf, quadroTce, quadroVinculos } from '../domain/parcerias';
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
import type { Metas, PageId } from './leitura';
import { artsPeriodo, linhasGre } from './medidas';
import { despesaPublicada, fonteConfea, formacaoSp, piso as pisoPublico, registrosNovos, resultados2025 } from './publico';
import PaginaPresidencia from './PaginaPresidencia';
import PaginaCadastro from './PaginaCadastro';
import PaginaProfissionais from './PaginaProfissionais';
import PaginaFormacao from './PaginaFormacao';
import PaginaFiscalizacao from './PaginaFiscalizacao';
import PaginaMalha from './PaginaMalha';
import PaginaReceita from './PaginaReceita';
import PaginaEntidades from './PaginaEntidades';
import PaginaControle from './PaginaControle';
import PaginaAtendimento from './PaginaAtendimento';
import PaginaMetodo from './PaginaMetodo';
import '../painel/painel.css';
import './cockpit.css';

/**
 * V21 · Inteligência Estratégica Crea-SP (nome escolhido em 01/11/2026; antes Prumo, antes Observatório). Protótipo completo, revisado: 11 assuntos, data de referência (o painel como
 * estava em D, sem sobrescrever nenhum valor), ficha (i) em todo bloco e cartão, profissionais e formação com a mesma
 * profundidade das empresas, entidades e IES, controle interno, forças-tarefas com grupo de comparação e malha fina v2.
 */
const pages: { id: PageId; label: string; title: string; subtitle: string; icon: ComponentType<{ size?: number }>; Page: ComponentType<{ ctx: CockpitCtx }> }[] = [
  { id: 'presidencia', label: 'Presidência', title: 'Presidência', subtitle: 'Indicadores-norte, um cartão por assunto e as regionais contra o ano anterior', icon: Landmark, Page: PaginaPresidencia },
  { id: 'cadastro', label: 'Empresas', title: 'Empresas, cobertura e responsabilidade técnica', subtitle: 'Quanto do mercado com CNAE da lista está registrado, por classe, câmara e regional; quadro técnico, ARTs e certidões', icon: Building2, Page: PaginaCadastro },
  { id: 'profissionais', label: 'Profissionais', title: 'Profissionais', subtitle: 'Registros ativos, entradas e saídas, perfil, adimplência, ARTs por autor e emprego formal por ocupação', icon: HardHat, Page: PaginaProfissionais },
  { id: 'formacao', label: 'Formação', title: 'Formação e registro', subtitle: 'Concluintes por coorte, taxa de registro, de atividade e de permanência, por IES, modalidade e canal', icon: GraduationCap, Page: PaginaFormacao },
  { id: 'fiscalizacao', label: 'Fiscalização', title: 'Fiscalização', subtitle: 'Quanto produzimos, onde o rito trava, quanto vira regularização e o resultado das forças-tarefas', icon: ShieldCheck, Page: PaginaFiscalizacao },
  { id: 'malha', label: 'Malha fina', title: 'Malha fina v2', subtitle: 'Indícios por regra, com status confirmado, candidato ou contexto. Lista para análise, nunca auto automático', icon: ScanSearch, Page: PaginaMalha },
  { id: 'receita', label: 'Receita', title: 'Receita e cobrança', subtitle: 'Arrecadação, saldo vencido, recuperação e execução orçamentária', icon: Wallet, Page: PaginaReceita },
  { id: 'entidades', label: 'Entidades', title: 'Entidades de classe e instituições de ensino', subtitle: 'Organizações com relação com o Conselho: repasses, convênios, contratos, patrocínios e cadeiras', icon: Handshake, Page: PaginaEntidades },
  { id: 'controle', label: 'Controle', title: 'Controle interno', subtitle: 'Despesa por natureza e função, diárias, fornecedores, contratos, pessoal e a despesa publicada', icon: ClipboardCheck, Page: PaginaControle },
  { id: 'atendimento', label: 'Atendimento', title: 'Atendimento e estrutura', subtitle: 'Prazos de atendimento, coworkings e qualidade do cadastro', icon: Headset, Page: PaginaAtendimento },
  { id: 'metodo', label: 'Método', title: 'Método, regras e fontes', subtitle: 'O que cada cruzamento permite concluir, as lacunas do V18, os casos de uso, as regras da malha, as fontes e as análises com IA', icon: BookOpenCheck, Page: PaginaMetodo },
];
const STORAGE = 'crea-observatorio-v20';
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
  cno: ReturnType<typeof buildCno>; licencas: ReturnType<typeof buildLicencas>; pericias: ReturnType<typeof buildPericias>; tce: ReturnType<typeof buildDespesaTce>; sociosPf: ReturnType<typeof buildSociosPf>; vinculos: ReturnType<typeof buildVinculos> };
function camadasDe(view: Dataset) {
  let value = camadas.get(view);
  if (!value) {
    const profissionais = buildProfissionais(view);
    value = { f: fiscalizacaoAt(buildFiscalizacao(dataset), view.snapshotDate), profissionais, emprego: buildEmpregoCbo(view), formacao: buildFormacao(view), entidades: buildEntidades(view), conselho: buildConselho(view), sociedades: buildSociedades(view), obras: buildObras(view), instalacoes: buildInstalacoes(view),
      cno: buildCno(view), licencas: buildLicencas(view), pericias: buildPericias(view, profissionais), tce: buildDespesaTce(view), sociosPf: buildSociosPf(view, profissionais), vinculos: buildVinculos(view) };
    camadas.set(view, value);
  }
  return value;
}

export default function Cockpit() {
  const [page, setPage] = useState<PageId>(() => { const saved = ler<string>('pagina', 'presidencia'); return pages.some(item => item.id === saved) ? saved as PageId : 'presidencia'; });
  const [gre, setGre] = useState('');
  const [camara, setCamara] = useState('');
  const [period, setPeriod] = useState(12);
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
  useEffect(() => { let alive = true; setEstrutura(null); const id = window.setTimeout(() => { const value = estruturaDe(view, gre || null, period); if (alive) setEstrutura(value); }, 30); return () => { alive = false; window.clearTimeout(id); }; }, [view, gre, period]);
  // Histórico por data de referência: um ponto por mês (cerca de 1 s cada), calculado depois da estrutura, um de cada vez, com cache.
  useEffect(() => {
    let alive = true; const chave = `${view.snapshotDate}|${gre}`, datas = datasHistorico(view), fBase = camadasDe(view).f;
    setHistorico({ chave, pontos: [] });
    const passo = (index: number) => { if (!alive || index >= datas.length) return; const ponto = pontoHistorico(dataset, fBase, datas[index], gre || null); if (!alive) return; setHistorico(previous => previous.chave === chave ? { chave, pontos: [...previous.pontos, ponto] } : previous); window.setTimeout(() => passo(index + 1), 40); };
    const id = window.setTimeout(() => passo(0), 400);
    return () => { alive = false; window.clearTimeout(id); };
  }, [view, gre]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === 'Escape') { if (detail) setDetail(null); else if (modal) setModal(null); else setFocus(null); return; }
      if (event.ctrlKey || event.metaKey || event.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || modal || detail) return;
      if (/^[0-9]$/.test(event.key)) { const index = event.key === '0' ? 9 : Number(event.key) - 1; if (pages[index]) setPage(pages[index].id); }
      else if (event.key === 'm' || event.key === 'M') setPage('metodo');
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [detail, modal]);

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
    const mercado = { concentracao: concentracaoMercado(contratos), demanda: quadroDemanda(buildDemandaPlanejada(view)), densidade: densidadeRegional(view), aberturas: aberturasRfb(view, gre || null, 24), permanencia: [3, 6, 12].map(meses => permanenciaCoorte(view, scope.companyIds, meses)) };
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
      contexto: contextoEconomico(view), sociosPf: quadroSociosPf(base.sociosPf, view, base.profissionais, scope.companyIds, greId), coorteNominal: coorteNominal(base.formacao, base.profissionais, view, greId), vinculos: quadroVinculos(base.vinculos, view, scope.companyIds, greId) };
    return { profissionais, formacao, entidades, conselho, forcas, frentes, parcerias };
  }, [base, view, anchor, f, gre, period, scope, derived.contratos]);
  const insights = useMemo(() => leitura({ metas, ponte: derived.ponte, cobertura: model.metrics.coverage.value, rt: model.metrics.rtCoverage.value, resumo: derived.resumo, rec: derived.rec, saldo: model.metrics.overdue.value ?? 0,
    inadimplencia: derived.inadimplencia, linhas: derived.linhas, malha: derived.malha, arts: { atual: derived.arts.atual.length, antes: derived.arts.antes }, cao: derived.cao, estrutura,
    conversao: derived.norte.conversao.atual, tempo: derived.norte.tempo, profissionais: extra.profissionais.resumo, formacao: extra.formacao, conselho: extra.conselho, forcas: extra.forcas }), [metas, derived, model, estrutura, extra]);

  const change = (work: () => void) => transition(work);
  const ctx: CockpitCtx = { dataset: view, f, scope, model, history, period, greId: gre || null, camara: camara || null, janela: janelaDe(f.anchor, period), resumo: derived.resumo, regionais: derived.regionais, tokens,
    open: setDetail, filterGre: id => change(() => setGre(previous => previous === id ? '' : id)), page, go: setPage, dark,
    anchor, hoje, datasReferencia, setAnchor: value => change(() => setAnchorSel(value && value < hoje ? value : null)),
    historyScope, stateScope, stateModel, stateHistory, linhas: derived.linhas, ponte: derived.ponte, rec: derived.rec, contratos: derived.contratos, malha: derived.malha, estrutura, arts: derived.arts,
    metas, insights, focus, toggleFocus: id => setFocus(previous => previous === id ? null : id), norte: derived.norte, mercado: derived.mercado, ...extra,
    historico: { pontos: historico.chave === `${view.snapshotDate}|${gre}` ? historico.pontos : [], datas: datasHistorico(view), completo: historico.chave === `${view.snapshotDate}|${gre}` && historico.pontos.length === datasHistorico(view).length } };
  const current = pages.find(item => item.id === page)!;
  const emD = anchor !== hoje;

  return <div className={`ck ${dark ? 'is-dark' : ''} ${emD ? 'is-passado' : ''}`} aria-busy={pending}>
    <nav className="ck-rail" aria-label="Assuntos do painel">
      <div className="ck-logo" title="CREA-SP"><EngineeringEmblem /></div>
      {pages.map((item, index) => <button key={item.id} className={page === item.id ? 'on' : ''} aria-current={page === item.id ? 'page' : undefined} onClick={() => setPage(item.id)} title={`${item.title} (tecla ${index === 10 ? 'M' : (index + 1) % 10})`}><item.icon size={18} /><span>{item.label}</span></button>)}
      <div className="ck-rail-bottom">
        <button onClick={() => setModal('metas')} title="Metas usadas nos cartões e no quadro das regionais"><Target size={17} /><span>Metas</span></button>
        <button onClick={() => setModal('fontes')} title="Fontes, métodos e limites"><Database size={17} /><span>Fontes</span></button>
        <button onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'} title={dark ? 'Tema claro' : 'Tema escuro'}>{dark ? <Sun size={17} /> : <Moon size={17} />}<span>{dark ? 'Claro' : 'Escuro'}</span></button>
      </div>
    </nav>
    <div className="ck-main">
      <header className="ck-header">
        <div className="ck-title"><span className="ck-eyebrow" title="Inteligência Estratégica Crea-SP · programa de dados estratégicos da EDAD (SUPTEC)">Inteligência Estratégica · V22 <span className="ck-legenda-parceria" title="Blocos e regras com este marcador medem o que um acordo permitiria; até o acordo, a camada é demonstrativa."><span className="selo selo-parceria is-compacto" aria-hidden="true">!</span>depende de parceria</span></span><h1>{current.title}</h1><p>{current.subtitle}</p></div>
        <div className="ck-pulse" aria-label="Destaques do período">
          <span className="ck-pulse-dot" aria-hidden="true" />
          <div className="ck-pulse-track">{[...insights, ...insights].map((item, index) => <button key={index} className={`is-${item.tone}`} aria-hidden={index >= insights.length} tabIndex={index >= insights.length ? -1 : 0} onClick={() => setPage(item.page)}><b>{item.strong}</b> {item.text}</button>)}</div>
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
        <div className="seg" role="radiogroup" aria-label="Período">{[3, 6, 12].map(value => <button key={value} role="radio" aria-checked={period === value} className={period === value ? 'on' : ''} onClick={() => change(() => setPeriod(value))}>{value} meses</button>)}</div>
        <span className="ck-window">{data(ctx.janela.start)} a {data(ctx.janela.end)} · comparado com {data(ctx.janela.prevStart)} a {data(ctx.janela.prevEnd)}{emD && <> · base lida em <strong>{data(anchor)}</strong></>}</span>
        {(gre || camara || period !== 12 || emD) && <button className="ghost" onClick={() => change(() => { setGre(''); setCamara(''); setPeriod(12); setAnchorSel(null); })}><RotateCcw size={14} />Limpar filtros</button>}
      </section>
      <main className={`ck-page ck-page-${page} ${focus ? 'has-focus' : ''}`} key={page}><current.Page ctx={ctx} /></main>
      <footer className="ck-status"><span className={`ck-live ${pending ? 'is-busy' : ''}`} aria-hidden="true" /><strong>{int(scope.companies.length)} empresas no recorte</strong>
        <span className="ck-status-note">{pending ? 'Recalculando…' : focus ? 'Bloco ampliado · Esc para voltar' : emD ? `Painel como estava em ${data(anchor)} · escolha “Hoje” na data de referência para voltar` : 'Teclas 1 a 9, 0 e M trocam de assunto · (i) abre a ficha de cada bloco · clique em qualquer número, barra ou regional para ver a lista'}</span></footer>
    </div>
    {detail && <Drawer ctx={ctx} detail={detail} onClose={() => setDetail(null)} />}
    {modal === 'metas' && <Janela title="Metas do painel" subtitle="Parâmetros de leitura usados nos cartões, no quadro das regionais e nos destaques · salvos neste navegador" onClose={() => setModal(null)}><MetasForm metas={metas} onChange={setMetas} /></Janela>}
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
    <article><h3>Dados internos · demonstrativos</h3><p>Cadastro de empresas e estabelecimentos, registros, vínculos de responsável técnico, ARTs, certidões de acervo operacional, anuidades e pagamentos, contratos públicos (PNCP), emprego formal por município e ocupação (RAIS/CAGED), pendências cadastrais, atendimento, coworkings, capacitação e orçamento dos programas. Cenário fictício e reproduzível (semente {dataset.seed}); em produção, as bases do CREA-SP e as fontes públicas.</p></article>
    <article><h3>Camadas derivadas do cenário · demonstrativas</h3><p>Ações fiscalizatórias, autos de infração, multas e regularizações: geradas por sorteio determinístico a partir de eventos do cadastro (primeiro registro, baixa de RT sem substituto, contrato público sem ART identificada). Ponte documental contrato–ART: fictícia e explícita, para mostrar o grau “confirmado por documento”. Em produção, o sistema de fiscalização do CREA-SP e o campo de contrato ou processo na ART.</p></article>
    <article><h3>Camadas novas na V20 · demonstrativas</h3><p>Profissionais (registro, situação, interrupções, anuidade, autoria das ARTs), emprego formal por ocupação CBO (estoque, saldo e salário mediano, só em agregado), concluintes por IES, ano, modalidade e canal, entidades de classe e IES com repasses, convênios, contratos e patrocínios, despesa e receita do Conselho por natureza, função e regional, diárias, fornecedores, empenhos, contratos administrativos e pessoal, e forças-tarefas de fiscalização. Todas derivadas do mesmo cenário determinístico, com as regras descritas em cada ficha (i). Em produção, o sistema de registro profissional, o Novo CAGED e a RAIS agregados, o Censo da Educação Superior do INEP, os sistemas de convênios e de execução orçamentária do Conselho.</p></article>
    <article><h3>Camadas novas na V21 · demonstrativas</h3><p>Frentes do mapa de relações com fonte pública de coleta automática: sócios pessoa jurídica do QSA aberto (rede societária e regra “sócio PJ de engenharia sem registro”), obras do Obrasgov ligadas aos contratos do PNCP pelo CIPI (situação, local de execução, ART de execução e de fiscalização), instalações e operações da ANEEL, ANP, ANM e BNDES com agente identificado por CNPJ, planos anuais de contratação do PNCP (demanda planejada por etapa), população por município para a densidade regional, e a estrutura do radar normativo (Câmara, Senado e ALESP, com proposições fictícias até o conector). Também as medidas do levantamento que faltavam: concentração do mercado público (cinco maiores e HHI), aberturas na Receita e permanência de coortes. Tudo derivado do mesmo cenário determinístico; em produção, os dados abertos de cada órgão com a chave CNPJ exata e a data de cada fato.</p></article>
    <article><h3>Camadas que dependem de parceria · V22 · demonstrativas (marcadas com “!”)</h3><p>Tudo o que o levantamento deixou fora por depender de acordo entrou como camada demonstrativa, com a estrutura de dados que o acordo precisa entregar: obras do CNO com o campo ART (Receita Federal e Serpro), alvarás de construção e de funcionamento (prefeituras), AVCB (Corpo de Bombeiros), licenças ambientais (CETESB; IBAMA e ANA quando trouxerem CNPJ), nomeações de peritos com número CNJ (TJSP), empenho, liquidação e pagamento por contrato (TCE-SP e TCM-SP), crédito por município e CNAE (Banco Central), sócios pessoa física com CPF completo (Receita Federal e JUCESP), coorte nominal de formandos (IES parceiras) e vínculos CLT por empresa em CBO técnico (MTE, só contagens). Duas regras novas da malha fina (obra do CNO sem ART; alvará ou licença de obra sem ART) usam essas camadas e ficam fora das contagens confirmadas. O PIB e o VAB municipais (IBGE) entraram no mesmo bloco de contexto e não dependem de acordo. O “!” no título do bloco, no cartão ou na regra diz qual parceiro falta; a ficha (i) diz o que ele precisa entregar e a chave. Nenhum valor é real.</p></article>
    <article><h3>Histórico por data de referência</h3><p>Os indicadores-norte, a base e os indícios da malha fina recalculados com a base como estava no fim de cada um dos 12 meses anteriores a D (Presidência e Malha fina). É a mesma leitura do seletor de data aplicada mês a mês; o cálculo roda depois da primeira pintura, um ponto por vez, e fica em cache. Em produção, é a tabela diária de indicadores do DW.</p></article>
    <article><h3>Data de referência</h3><p>Cada fato do cenário guarda a sua data (início e fim). Escolher uma data de referência D lê a base só com o que já existia em D e recalcula todas as abas; nenhum valor é sobrescrito e a mesma base lida em datas diferentes dá os números de cada dia. Em produção, é o papel do histórico (SCD2) e da tabela diária de indicadores no DW.</p></article>
    <article><h3>Retiradas desde a V19</h3><p>Quadro de administradores sorteado (art. 5º), vínculos nominais de emprego com salário e piso por empresa, “emprega engenheiro sem registro” e, na V20, o Portal Salário e as demais fontes com coleta pontual: só entram fontes com coleta automática periódica ou com acordo previsto. O QSA aberto mascara o CPF e o emprego público é agregado: não se ligam a CNPJ ou CPF sem acordo. Detalhes na página Método.</p></article>
    <article><h3>Dados públicos reais (com selo “Real”)</h3><ul>{reais.map(item => <li key={item.nome}><b>{item.nome}</b> · capturado em {data(item.data)} · <a href={item.url} target="_blank" rel="noreferrer">origem</a></li>)}</ul></article>
    <article><h3>Métodos</h3><ul>
      <li>Variações comparam a janela escolhida com a mesma janela um ano antes. A GRE da empresa é a da matriz; a do profissional, a do seu município.</li>
      <li>Situação no CREA-SP lida na data do fato (contrato, ação, pagamento), não na data de hoje.</li>
      <li>Toda ligação tem status: confirmada por documento ou chave exata, candidata (para revisão) ou contexto agregado. Candidatas ficam fora das contagens confirmadas.</li>
      <li>Forças-tarefas: o resultado é a regularização em 180 dias das ações da força, comparada com as ações do mesmo tipo e período fora da regional da força (grupo de comparação). Diferença sem significância estatística formal: leitura, não prova.</li>
      <li>Formação: taxa de registro (concluintes que se registraram em até 24 meses), taxa de atividade (registrados com ao menos uma ART) e taxa de permanência (ativos e adimplentes na data de referência). Coorte fechada só depois de 24 ou 48 meses.</li>
      <li>Controle interno: despesa por natureza e função mostrada de forma neutra, sem juízo sobre o gasto; o custo da capacitação é informado sem medida de efeito.</li>
      <li>Mapas: o território de cada GRE é o conjunto dos seus municípios (aproximado pelos municípios-sede da amostra; em produção, a tabela oficial município → UGI → GRE).</li>
      <li>Tempo até regularizar e tempo até agir: Kaplan-Meier; casos ainda abertos contam como censurados, não como zero.</li>
      <li>Câmara: aproximada pelo CNAE principal da matriz em quatro câmaras (cenário). Em produção, cadastro técnico com relação N:N entre atividade, atribuição e modalidade.</li>
    </ul></article>
  </div>;
}
