import { useEffect, useMemo, useState, useTransition } from 'react';
import { ChevronDown, Moon, Sun } from 'lucide-react';
import { dataset } from '../domain/dataset';
import { defaultFilters } from '../domain/types';
import type { Filters } from '../domain/types';
import { EngineeringEmblem } from '../components/EngineeringIdentity';
import { selectEnterpriseScope } from '../enterprise-v10/filters';
import { buildEnterpriseModel } from '../enterprise-v10/model';
import { buildFiscalizacao } from './fiscalizacao';
import { camaraDaEmpresa, camaraPorCnae, camaras, janela as janelaDe, porRegional, resumoFiscal } from './analise';
import { useTokens } from './chart';
import type { Ctx, Detail } from './contexto';
import Drawer from './Drawer';
import VisaoFiscalizacao from './VisaoFiscalizacao';
import VisaoCadastro from './VisaoCadastro';
import { data } from './ui';
import './painel.css';

/** V17 · empresas no CREA-SP em duas telas de PC: o que a fiscalização faz e obtém, e o que a base e a receita mostram. */
type View = 'fiscalizacao' | 'cadastro';
const views: { id: View; label: string }[] = [{ id: 'fiscalizacao', label: 'Fiscalização' }, { id: 'cadastro', label: 'Cadastro e receita' }];

export default function Painel() {
  const [view, setView] = useState<View>('fiscalizacao');
  const [gre, setGre] = useState('');
  const [camara, setCamara] = useState('');
  const [period, setPeriod] = useState(12);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
  const [pending, transition] = useTransition();
  const tokens = useTokens();
  useEffect(() => { if (theme) document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setDetail(null); }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, []);

  const camaraMap = camaraDaEmpresa(dataset);
  const subset = useMemo(() => camara ? dataset.companies.filter(row => camaraMap.get(row.id) === camara).map(row => row.id) : undefined, [camara, camaraMap]);
  const filters: Filters = useMemo(() => ({ ...defaultFilters, greIds: gre ? [gre] : [], period }), [gre, period]);
  const scope = useMemo(() => selectEnterpriseScope(dataset, filters, subset), [filters, subset]);
  const historyScope = useMemo(() => selectEnterpriseScope(dataset, { ...filters, period: 24 }, subset), [filters, subset]);
  const stateScope = useMemo(() => gre ? selectEnterpriseScope(dataset, { ...filters, greIds: [] }, subset) : scope, [gre, filters, subset, scope]);
  const model = useMemo(() => buildEnterpriseModel(scope), [scope]);
  const history = useMemo(() => buildEnterpriseModel(historyScope), [historyScope]);
  const stateModel = useMemo(() => gre ? buildEnterpriseModel(stateScope) : model, [gre, stateScope, model]);
  const f = useMemo(() => { const all = buildFiscalizacao(dataset); return camara ? { ...all, acoes: all.acoes.filter(row => camaraMap.get(row.companyId) === camara), alvos: all.alvos.filter(row => camaraMap.get(row.companyId) === camara) } : all; }, [camara, camaraMap]);
  const resumo = useMemo(() => resumoFiscal(f, gre || null, period), [f, gre, period]);
  const regionais = useMemo(() => porRegional(dataset, f, stateModel, period, camara ? { empresa: id => camaraMap.get(id) === camara, cnae: code => camaraPorCnae[code] === camara } : {}), [f, stateModel, period, camara, camaraMap]);
  const change = (work: () => void) => transition(work);
  const ctx: Ctx = { dataset, f, scope, model, history, period, greId: gre || null, camara: camara || null, janela: janelaDe(f.anchor, period), resumo, regionais, tokens,
    open: setDetail, filterGre: id => change(() => setGre(previous => previous === id ? '' : id)) };
  const isDark = theme === 'dark' || theme === null && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

  return <div className="app" aria-busy={pending}>
    <header className="top">
      <div className="brand"><EngineeringEmblem /><div><h1>Empresas no CREA-SP</h1><p>Fiscalização, registro e receita · corte {data(dataset.snapshotDate)}</p></div></div>
      <nav className="tabs" aria-label="Visões">{views.map(item => <button key={item.id} aria-current={view === item.id ? 'page' : undefined} className={view === item.id ? 'on' : ''} onClick={() => setView(item.id)}>{item.label}</button>)}</nav>
      <div className="controls">
        <label className="select"><span>Regional</span><select id="filtro-gre" value={gre} onChange={event => change(() => setGre(event.target.value))}><option value="">Todas</option>{dataset.gres.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select><ChevronDown size={14} /></label>
        <label className="select"><span>Câmara</span><select id="filtro-camara" value={camara} onChange={event => change(() => setCamara(event.target.value))}><option value="">Todas</option>{camaras.map(name => <option key={name} value={name}>{name}</option>)}</select><ChevronDown size={14} /></label>
        <div className="chips" role="radiogroup" aria-label="Período">{[3, 6, 12].map(value => <button key={value} role="radio" aria-checked={period === value} onClick={() => change(() => setPeriod(value))}>{value} meses</button>)}</div>
        <span className="demo" title="Valores internos fictícios, gerados para demonstrar o modelo">Demonstrativo</span>
        <button className="icon-btn on-band" aria-label={isDark ? 'Usar tema claro' : 'Usar tema escuro'} onClick={() => setTheme(isDark ? 'light' : 'dark')}>{isDark ? <Sun size={16} /> : <Moon size={16} />}</button>
      </div>
    </header>
    <main className={`board view-${view}`}>{view === 'fiscalizacao' ? <VisaoFiscalizacao ctx={ctx} /> : <VisaoCadastro ctx={ctx} />}</main>
    <footer className="foot">Dados internos demonstrativos: cadastro, financeiro e quadro técnico do cenário; ações, autos, multas e regularizações derivados dele (valores de multa ilustrativos). Receita Federal, RAIS/CAGED e PNCP entram como cruzamentos. Câmara pela atividade principal da empresa. Clique em qualquer número, barra ou regional para ver as empresas.</footer>
    {detail && <Drawer ctx={ctx} detail={detail} onClose={() => setDetail(null)} />}
  </div>;
}
