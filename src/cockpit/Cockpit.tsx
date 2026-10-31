import { useEffect, useMemo, useState, useTransition } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { BookOpenCheck, Building2, ChevronDown, Database, Globe2, HardHat, Headset, Landmark, Moon, RotateCcw, ScanSearch, ShieldCheck, Sun, Target, Wallet, X } from 'lucide-react';
import { dataset } from '../domain/dataset';
import { defaultFilters } from '../domain/types';
import type { Filters } from '../domain/types';
import type { Scope } from '../domain/engine';
import type { EnterpriseModel } from '../enterprise-v10/types';
import { EngineeringEmblem } from '../components/EngineeringIdentity';
import { selectEnterpriseScope } from '../enterprise-v10/filters';
import { buildEnterpriseModel } from '../enterprise-v10/model';
import { caoService } from '../gestao-v14/metrics';
import { buildFiscalizacao, tipoLabel } from '../painel/fiscalizacao';
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
import { despesaPublicada, fonteConfea, formacaoSp, piso as pisoPublico, registrosNovos, resultados2025, salarios } from './publico';
import PaginaPresidencia from './PaginaPresidencia';
import PaginaCadastro from './PaginaCadastro';
import PaginaFiscalizacao from './PaginaFiscalizacao';
import PaginaMalha from './PaginaMalha';
import PaginaTecnica from './PaginaTecnica';
import PaginaReceita from './PaginaReceita';
import PaginaAtendimento from './PaginaAtendimento';
import PaginaPublico from './PaginaPublico';
import PaginaMetodo from './PaginaMetodo';
import '../painel/painel.css';
import './cockpit.css';

/**
 * V19 · Observatório Crea-SP (nome provisório) · Empresas. Evolução da V18 com os painéis da onda 1 do plano rev. 2:
 * Presidência (indicadores-norte), Empresas e cobertura e Fiscalização, mais a malha fina v1 com status de ligação e a página de método.
 */
const pages: { id: PageId; label: string; title: string; subtitle: string; icon: ComponentType<{ size?: number }>; Page: ComponentType<{ ctx: CockpitCtx }>; onda?: boolean }[] = [
  { id: 'presidencia', label: 'Presidência', title: 'Presidência', subtitle: 'Indicadores-norte, um cartão por assunto e as regionais contra o ano anterior', icon: Landmark, Page: PaginaPresidencia, onda: true },
  { id: 'cadastro', label: 'Empresas', title: 'Empresas e cobertura', subtitle: 'Quanto do mercado com CNAE da lista está registrado, por classe, câmara e regional', icon: Building2, Page: PaginaCadastro, onda: true },
  { id: 'fiscalizacao', label: 'Fiscalização', title: 'Fiscalização', subtitle: 'Quanto produzimos, onde o rito trava e quanto vira regularização', icon: ShieldCheck, Page: PaginaFiscalizacao, onda: true },
  { id: 'malha', label: 'Malha fina', title: 'Malha fina v1', subtitle: 'Indícios por regra, com status confirmado, candidato ou contexto. Lista para análise, nunca auto automático', icon: ScanSearch, Page: PaginaMalha },
  { id: 'tecnica', label: 'Resp. técnica', title: 'Responsabilidade técnica, ART e certidões', subtitle: 'Quadro técnico das empresas, ARTs e prazos de certidão', icon: HardHat, Page: PaginaTecnica },
  { id: 'receita', label: 'Receita', title: 'Receita, cobrança e orçamento', subtitle: 'Arrecadação, saldo vencido, recuperação e execução orçamentária', icon: Wallet, Page: PaginaReceita },
  { id: 'atendimento', label: 'Atendimento', title: 'Atendimento e estrutura', subtitle: 'Prazos de atendimento, coworkings, capacitação e qualidade do cadastro', icon: Headset, Page: PaginaAtendimento },
  { id: 'publico', label: 'Contexto', title: 'Contexto público', subtitle: 'Somente dados públicos reais, em retrato versionado: Relatório de Gestão, Confea, IBGE, INEP, CAGED e Transparência', icon: Globe2, Page: PaginaPublico },
  { id: 'metodo', label: 'Método', title: 'Método, regras e fontes', subtitle: 'O que cada cruzamento permite concluir, as 12 lacunas do V18, os 34 casos de uso e as 98 fontes do atlas', icon: BookOpenCheck, Page: PaginaMetodo },
];
const STORAGE = 'crea-observatorio-v19';
const ler = <T,>(key: string, fallback: T): T => { try { const raw = localStorage.getItem(`${STORAGE}-${key}`); return raw === null ? fallback : JSON.parse(raw) as T; } catch { return fallback; } };
const gravar = (key: string, value: unknown) => { try { localStorage.setItem(`${STORAGE}-${key}`, JSON.stringify(value)); } catch { /* navegador sem armazenamento: o painel segue funcionando */ } };
/** Modelos empresariais em cache por recorte (regional, câmara, período): trocar de filtro e voltar é imediato. */
const modelos = new Map<string, EnterpriseModel>();
function modelo(key: string, scope: Scope) {
  let value = modelos.get(key);
  if (!value) { value = buildEnterpriseModel(scope); modelos.set(key, value); if (modelos.size > 12) modelos.delete(modelos.keys().next().value!); }
  return value;
}
const filtros = (greIds: string[], period: number): Filters => ({ ...defaultFilters, greIds, period });
const camaraMap = camaraDaEmpresa(dataset);

export default function Cockpit() {
  const [page, setPage] = useState<PageId>(() => { const saved = ler<string>('pagina', 'presidencia'); return pages.some(item => item.id === saved) ? saved as PageId : 'presidencia'; });
  const [gre, setGre] = useState('');
  const [camara, setCamara] = useState('');
  const [period, setPeriod] = useState(12);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark' | null>(() => ler<'light' | 'dark' | null>('tema', null));
  const [metas, setMetas] = useState<Metas>(() => ({ ...metasPadrao, ...ler<Partial<Metas>>('metas', {}) }));
  const [focus, setFocus] = useState<string | null>(null);
  const [modal, setModal] = useState<'metas' | 'fontes' | null>(null);
  const [estrutura, setEstrutura] = useState<Estrutura | null>(null);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  const [pending, transition] = useTransition();
  const tokens = useTokens();
  const dark = theme === 'dark' || theme === null && systemDark;

  useEffect(() => { const media = window.matchMedia('(prefers-color-scheme: dark)'), update = () => setSystemDark(media.matches); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  useEffect(() => { if (theme) document.documentElement.dataset.theme = theme; else delete document.documentElement.dataset.theme; gravar('tema', theme); }, [theme]);
  useEffect(() => { gravar('pagina', page); setFocus(null); }, [page]);
  useEffect(() => { gravar('metas', metas); }, [metas]);
  // Atendimento, estrutura e orçamento vêm do modelo institucional (cerca de 1 s na primeira vez): calculado depois da primeira pintura.
  useEffect(() => { let alive = true; const id = window.setTimeout(() => { const value = estruturaDe(dataset, gre || null, period); if (alive) setEstrutura(value); }, 30); return () => { alive = false; window.clearTimeout(id); }; }, [gre, period]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === 'Escape') { if (detail) setDetail(null); else if (modal) setModal(null); else setFocus(null); return; }
      if (/^[1-9]$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey && !['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) && !modal && !detail) setPage(pages[Number(event.key) - 1].id);
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [detail, modal]);

  const subset = useMemo(() => camara ? dataset.companies.filter(row => camaraMap.get(row.id) === camara).map(row => row.id) : undefined, [camara]);
  const scope = useMemo(() => selectEnterpriseScope(dataset, filtros(gre ? [gre] : [], period), subset), [gre, period, subset]);
  const historyScope = useMemo(() => selectEnterpriseScope(dataset, filtros(gre ? [gre] : [], 24), subset), [gre, subset]);
  const stateScope = useMemo(() => gre ? selectEnterpriseScope(dataset, filtros([], period), subset) : scope, [gre, period, subset, scope]);
  const stateHistoryScope = useMemo(() => gre ? selectEnterpriseScope(dataset, filtros([], 24), subset) : historyScope, [gre, subset, historyScope]);
  const model = useMemo(() => modelo(`${gre}|${camara}|${period}`, scope), [scope]); // eslint-disable-line react-hooks/exhaustive-deps
  const history = useMemo(() => modelo(`${gre}|${camara}|24`, historyScope), [historyScope]); // eslint-disable-line react-hooks/exhaustive-deps
  const stateModel = useMemo(() => modelo(`|${camara}|${period}`, stateScope), [stateScope]); // eslint-disable-line react-hooks/exhaustive-deps
  const stateHistory = useMemo(() => modelo(`|${camara}|24`, stateHistoryScope), [stateHistoryScope]); // eslint-disable-line react-hooks/exhaustive-deps
  const f = useMemo(() => { const all = buildFiscalizacao(dataset); return camara ? { ...all, acoes: all.acoes.filter(row => camaraMap.get(row.companyId) === camara), alvos: all.alvos.filter(row => camaraMap.get(row.companyId) === camara) } : all; }, [camara]);
  const derived = useMemo(() => {
    const resumo = resumoFiscal(f, gre || null, period);
    const regionais = porRegional(dataset, f, stateModel, period, camara ? { empresa: id => camaraMap.get(id) === camara, cnae: code => camaraPorCnae[code] === camara } : {});
    const contratos = contratosPublicos(scope, period), malha = malhaFina(scope, model, f, contratos);
    const stateMalha = gre ? malhaFina(stateScope, stateModel, f, contratosPublicos(stateScope, period)) : malha;
    const arts = artsPeriodo(scope, period), stateArts = gre ? artsPeriodo(stateScope, period) : arts;
    const linhas = linhasGre(stateModel, stateHistory, stateScope, regionais, period, stateMalha, stateArts.atual);
    const cobradas = model.metrics.compliance.denominatorCompanyIds?.length ?? 0;
    const norte = { cobertura: cobertura(scope, model), contagens: contagens(scope, model), conversao: conversao(f, gre || null), receita: receitaAtribuivel(dataset, f, gre || null, period), tempo: tempoAteAgir(dataset, f, gre || null, period, tipoLabel) };
    return { resumo, regionais, contratos, malha, arts, linhas, ponte: ponteBase(model, scope, f, period), rec: receita(history, f, gre || null, period),
      inadimplencia: cobradas ? devedoras(model).size / cobradas * 100 : null, cao: caoService(scope).median, norte };
  }, [f, gre, period, camara, scope, model, history, stateScope, stateModel, stateHistory]);
  const insights = useMemo(() => leitura({ metas, ponte: derived.ponte, cobertura: model.metrics.coverage.value, rt: model.metrics.rtCoverage.value, resumo: derived.resumo, rec: derived.rec, saldo: model.metrics.overdue.value ?? 0,
    inadimplencia: derived.inadimplencia, linhas: derived.linhas, malha: derived.malha, arts: { atual: derived.arts.atual.length, antes: derived.arts.antes }, cao: derived.cao, estrutura,
    conversao: derived.norte.conversao.atual, tempo: derived.norte.tempo }), [metas, derived, model, estrutura]);

  const change = (work: () => void) => transition(work);
  const ctx: CockpitCtx = { dataset, f, scope, model, history, period, greId: gre || null, camara: camara || null, janela: janelaDe(f.anchor, period), resumo: derived.resumo, regionais: derived.regionais, tokens,
    open: setDetail, filterGre: id => change(() => setGre(previous => previous === id ? '' : id)), page, go: setPage, dark,
    historyScope, stateScope, stateModel, stateHistory, linhas: derived.linhas, ponte: derived.ponte, rec: derived.rec, contratos: derived.contratos, malha: derived.malha, estrutura, arts: derived.arts,
    metas, insights, focus, toggleFocus: id => setFocus(previous => previous === id ? null : id), norte: derived.norte };
  const current = pages.find(item => item.id === page)!;

  return <div className={`ck ${dark ? 'is-dark' : ''}`} aria-busy={pending}>
    <nav className="ck-rail" aria-label="Assuntos do painel">
      <div className="ck-logo" title="CREA-SP"><EngineeringEmblem /></div>
      <span className="ck-rail-group" title="Painéis da onda 1 do plano do Observatório">Onda 1</span>
      {pages.map((item, index) => <button key={item.id} className={`${page === item.id ? 'on' : ''} ${pages[index - 1]?.onda && !item.onda ? 'is-after-onda' : ''}`} aria-current={page === item.id ? 'page' : undefined} onClick={() => setPage(item.id)} title={`${item.title} (tecla ${index + 1})`}><item.icon size={19} /><span>{item.label}</span></button>)}
      <div className="ck-rail-bottom">
        <button onClick={() => setModal('metas')} title="Metas usadas nos cartões e no quadro das regionais"><Target size={18} /><span>Metas</span></button>
        <button onClick={() => setModal('fontes')} title="Fontes, métodos e limites"><Database size={18} /><span>Fontes</span></button>
        <button onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'} title={dark ? 'Tema claro' : 'Tema escuro'}>{dark ? <Sun size={18} /> : <Moon size={18} />}<span>{dark ? 'Claro' : 'Escuro'}</span></button>
      </div>
    </nav>
    <div className="ck-main">
      <header className="ck-header">
        <div className="ck-title"><span className="ck-eyebrow" title="Nome provisório, a confirmar">Observatório Crea-SP · Empresas · V19</span><h1>{current.title}</h1><p>{current.subtitle}</p></div>
        <div className="ck-pulse" aria-label="Destaques do período">
          <span className="ck-pulse-dot" aria-hidden="true" />
          <div className="ck-pulse-track">{[...insights, ...insights].map((item, index) => <button key={index} className={`is-${item.tone}`} aria-hidden={index >= insights.length} tabIndex={index >= insights.length ? -1 : 0} onClick={() => setPage(item.page)}><b>{item.strong}</b> {item.text}</button>)}</div>
        </div>
        <div className="ck-meta"><span className="demo" title="Dados internos fictícios, gerados para demonstrar o modelo. Dados públicos reais trazem selo próprio.">Demonstrativo</span><span className="ck-cut">Corte<strong>{data(dataset.snapshotDate)}</strong></span></div>
      </header>
      <section className="ck-filters" aria-label="Filtros">
        <label className="ck-select"><span>Regional</span><select value={gre} onChange={event => change(() => setGre(event.target.value))}><option value="">Todas</option>{dataset.gres.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select><ChevronDown size={14} /></label>
        <label className="ck-select"><span>Câmara</span><select value={camara} onChange={event => change(() => setCamara(event.target.value))}><option value="">Todas</option>{camaras.map(name => <option key={name} value={name}>{name}</option>)}</select><ChevronDown size={14} /></label>
        <div className="seg" role="radiogroup" aria-label="Período">{[3, 6, 12].map(value => <button key={value} role="radio" aria-checked={period === value} className={period === value ? 'on' : ''} onClick={() => change(() => setPeriod(value))}>{value} meses</button>)}</div>
        <span className="ck-window">{data(ctx.janela.start)} a {data(ctx.janela.end)} · comparado com {data(ctx.janela.prevStart)} a {data(ctx.janela.prevEnd)}</span>
        {(gre || camara || period !== 12) && <button className="ghost" onClick={() => change(() => { setGre(''); setCamara(''); setPeriod(12); })}><RotateCcw size={14} />Limpar filtros</button>}
      </section>
      <main className={`ck-page ck-page-${page} ${focus ? 'has-focus' : ''}`} key={page}><current.Page ctx={ctx} /></main>
      <footer className="ck-status"><span className={`ck-live ${pending ? 'is-busy' : ''}`} aria-hidden="true" /><strong>{int(scope.companies.length)} empresas no recorte</strong>
        <span className="ck-status-note">{pending ? 'Recalculando…' : focus ? 'Bloco ampliado · Esc para voltar' : 'Teclas 1 a 9 trocam de assunto · clique em qualquer número, barra ou regional para ver as empresas'}</span></footer>
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
  const reais = [resultados2025.fonte, despesaPublicada.fonte, fonteConfea, registrosNovos.fonte, pisoPublico.fonte, salarios.fonte, formacaoSp.fonte];
  return <div className="ck-fontes">
    <article><h3>Dados internos · demonstrativos</h3><p>Cadastro de empresas e estabelecimentos, registros, vínculos de responsável técnico, ARTs, certidões de acervo operacional, anuidades e pagamentos, contratos públicos (PNCP), emprego formal por município e ocupação (RAIS/CAGED), pendências cadastrais, atendimento, coworkings, capacitação e orçamento dos programas. Cenário fictício e reproduzível (semente {dataset.seed}); em produção, as bases do CREA-SP e as fontes públicas.</p></article>
    <article><h3>Camadas derivadas do cenário · demonstrativas</h3><p>Ações fiscalizatórias, autos de infração, multas e regularizações: geradas por sorteio determinístico a partir de eventos do cadastro (primeiro registro, baixa de RT sem substituto, contrato público sem ART identificada). Ponte documental contrato–ART: fictícia e explícita, para mostrar o grau “confirmado por documento”. Em produção, o sistema de fiscalização do CREA-SP e o campo de contrato ou processo na ART.</p></article>
    <article><h3>Retiradas na V19</h3><p>Quadro de administradores sorteado (art. 5º), vínculos nominais de emprego com salário e piso por empresa, e “emprega engenheiro sem registro”. O QSA aberto mascara o CPF e o emprego público é agregado: não se ligam a CNPJ ou CPF sem acordo. Detalhes na página Método.</p></article>
    <article><h3>Dados públicos reais (com selo “Real”)</h3><ul>{reais.map(item => <li key={item.nome}><b>{item.nome}</b> · capturado em {data(item.data)} · <a href={item.url} target="_blank" rel="noreferrer">origem</a></li>)}</ul></article>
    <article><h3>Métodos</h3><ul>
      <li>Variações comparam a janela escolhida com a mesma janela um ano antes. A GRE da empresa é a da matriz.</li>
      <li>Situação no CREA-SP lida na data do fato (contrato, ação, pagamento), não na data de hoje.</li>
      <li>Toda ligação tem status: confirmada por documento ou chave exata, candidata (para revisão) ou contexto agregado. Candidatas ficam fora das contagens confirmadas.</li>
      <li>Mapas: o território de cada GRE é o conjunto dos seus municípios (aproximado pelos municípios-sede da amostra; em produção, a tabela oficial município → UGI → GRE).</li>
      <li>Tempo até regularizar e tempo até agir: Kaplan-Meier; casos ainda abertos contam como censurados, não como zero.</li>
      <li>Câmara: aproximada pelo CNAE principal da matriz em quatro câmaras (cenário). Em produção, cadastro técnico com relação N:N entre atividade, atribuição e modalidade.</li>
    </ul></article>
  </div>;
}
