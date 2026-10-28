import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, FileText, GraduationCap, UsersRound, X } from 'lucide-react';
import type { ProfessionalScope } from '../domain/professionals';
import { cityById, companyById } from '../domain/dataset';
import { isActiveLink } from '../domain/engine';

const date = (value?: string) => value ? value.slice(0, 10).split('-').reverse().join('/') : 'Sem encerramento informado';
const num = (value: number) => value.toLocaleString('pt-BR');
const tabs = [{ id: 'profile', label: 'Perfil' }, { id: 'relations', label: 'Relações' }, { id: 'production', label: 'Produção' }] as const;
type TabId = typeof tabs[number]['id'];
function Detail({ label, children }: { label: string; children: ReactNode }) { return <div className="p-detail"><span>{label}</span><strong>{children}</strong></div>; }

export default function ProfessionalDrawer({ professionalId, scope, onClose, onCompany }: { professionalId: string; scope: ProfessionalScope; onClose: () => void; onCompany: (id: string) => void }) {
  const [tab, setTab] = useState<TabId>('profile');
  const [page, setPage] = useState(1);
  const identity = useId();
  const drawer = useRef<HTMLElement>(null);
  const close = useRef(onClose); close.current = onClose;
  const profile = scope.model.profiles.find(row => row.id === professionalId);
  const links = scope.technicalLinks.filter(row => row.professionalId === professionalId).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const activeLinks = links.filter(row => isActiveLink(row, scope.companyScope.anchor));
  const confirmed = scope.qsaConfirmed.filter(row => row.professionalId === professionalId);
  const suggested = scope.qsaSuggestions.filter(row => row.professionalId === professionalId);
  const attributedIds = new Set(scope.artAttributions.filter(row => row.professionalId === professionalId).map(row => row.artId));
  const arts = scope.arts.filter(row => attributedIds.has(row.id)).sort((a, b) => b.date.localeCompare(a.date));
  const education = scope.model.education.filter(row => row.professionalId === professionalId);
  useEffect(() => { setTab('profile'); setPage(1); }, [professionalId]);
  useEffect(() => { setPage(1); }, [tab]);
  useEffect(() => {
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawer.current?.querySelector<HTMLButtonElement>('[data-close]')?.focus();
    const key = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const controls = [...drawer.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]') ?? []].filter(element => element.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key); document.body.style.overflow = overflow;
      if (before?.isConnected) before.focus();
      else [...document.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.includes('Explorar profissionais'))?.focus();
    };
  }, []);
  if (!profile) return null;
  const handleTabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = tabs.findIndex(row => row.id === tab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    setTab(tabs[next].id); document.getElementById(`${identity}-${tabs[next].id}`)?.focus();
  };
  const pages = Math.max(1, Math.ceil((tab === 'production' ? arts.length : links.length) / 8));
  const company = (id: string) => <button className="p-company-link" onClick={() => onCompany(id)}>{companyById.get(id)?.name ?? id}<ArrowUpRight size={13} /></button>;
  return <div className="p-drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><aside ref={drawer} className="p-drawer p-professional-drawer" role="dialog" aria-modal="true" aria-labelledby={`${identity}-title`}>
    <header className="p-drawer-head"><div><span className="p-eyebrow">DETALHAMENTO PROFISSIONAL</span><h2 id={`${identity}-title`}>{profile.name}</h2><p>{profile.registration} · {profile.modality}</p></div><button data-close className="p-icon-button" aria-label="Fechar ficha do profissional" onClick={onClose}><X size={21} /></button></header>
    <div className="p-drawer-identity"><span className="p-badge">{profile.status}</span><span>{num(new Set(activeLinks.map(row => row.companyId)).size)} empresas por RT vigente</span><span>{num(arts.length)} ARTs atribuídas no período</span></div>
    <div className="p-drawer-demo"><UsersRound size={16} /><span>Pessoa, registro, formação e relações fictícios. Relações exibidas respeitam o recorte atual; emprego público não identifica esta pessoa.</span></div>
    <div className="p-drawer-tabs" role="tablist" aria-label="Informações do profissional" onKeyDown={handleTabKey}>{tabs.map(row => <button key={row.id} id={`${identity}-${row.id}`} role="tab" aria-selected={tab === row.id} aria-controls={`${identity}-panel`} tabIndex={tab === row.id ? 0 : -1} className={tab === row.id ? 'active' : ''} onClick={() => setTab(row.id)}>{row.label}</button>)}</div>
    <div className="p-drawer-body" id={`${identity}-panel`} role="tabpanel" aria-labelledby={`${identity}-${tab}`} tabIndex={0}>
      {tab === 'profile' && <><section className="p-drawer-section"><h3><UsersRound size={17} />Identificação e cadastro</h3><div className="p-detail-grid"><Detail label="Registro demonstrativo">{profile.registration}</Detail><Detail label="Título cadastral demonstrativo">{profile.title}</Detail><Detail label="Modalidade">{profile.modality}</Detail><Detail label="Domicílio cadastral">{cityById.get(profile.cityId)?.name ?? profile.cityId}</Detail><Detail label="Primeiro ingresso cadastral">{date(profile.registeredAt)}</Detail><Detail label="Situação atual desde">{date(profile.statusSince)}</Detail></div><p className="p-drawer-note">Título cadastral e formação não descrevem as atribuições legais individuais. Situação atual é um snapshot; não permite deduzir retenção histórica ou vínculo de emprego.</p></section><section className="p-drawer-section"><h3><GraduationCap size={17} />Formação cadastrada na demonstração</h3>{education.map(row => <article key={row.id} className="p-record"><div className="p-record-head"><strong>{row.course}</strong><span className="p-badge">{row.level}</span></div><p>{row.institution} · conclusão em {row.completedYear}</p></article>)}<p className="p-drawer-note">Instituições e diplomas são fictícios. Indicadores públicos do INEP descrevem cursos e concluintes agregados; não comprovam o diploma de uma pessoa.</p></section></>}
      {tab === 'relations' && <><section className="p-drawer-section"><h3>Responsabilidade técnica · vigência e empresa</h3><p className="p-drawer-note">{num(links.length)} vínculos históricos · {num(activeLinks.length)} vigentes na competência. A mesma pessoa pode ter relações distintas com a mesma empresa.</p><div className="p-record-list">{links.slice((page - 1) * 8, page * 8).map(row => <article className="p-record" key={row.id}><div className="p-record-head"><strong>{row.id}</strong><span className="p-badge">{isActiveLink(row, scope.companyScope.anchor) ? 'Vigente' : 'Encerrado'}</span></div>{company(row.companyId)}<p>{row.modality} · {date(row.startDate)} → {row.endDate ? date(row.endDate) : 'Vigente na competência'}</p></article>)}</div>{!links.length && <p className="p-drawer-empty">Nenhum vínculo técnico neste recorte.</p>}</section><section className="p-drawer-section"><h3>Participação societária confirmada</h3>{confirmed.map(row => <article className="p-record" key={row.id}>{company(row.companyId)}<p>{row.role} · {row.matchStatus}</p><small>{row.evidence} · revisão {date(row.reviewedAt)}</small></article>)}{!confirmed.length && <p className="p-drawer-note">Nenhuma identidade societária confirmada neste recorte.</p>}<p className="p-drawer-note">Sócio e responsável técnico são relações diferentes. Uma não comprova a outra nem identifica vínculo de emprego.</p></section>{suggested.length > 0 && <section className="p-drawer-section"><h3>Sugestões externas para revisão de identidade</h3>{suggested.map(row => <article className="p-record" key={row.id}>{company(row.companyId)}<p>{row.partyName} · {row.role}</p><small>{row.evidence}</small></article>)}<p className="p-drawer-note">Essas sugestões ficam fora das contagens e da rede de correspondências confirmadas.</p></section>}</>}
      {tab === 'production' && <><section className="p-drawer-section"><h3><FileText size={17} />ARTs com autoria declarada</h3><p className="p-drawer-note">Últimos {scope.companyScope.filters.period} meses · profissional → autoria → ART → empresa. A ponte de autoria é declarada na base fictícia; não é inferida apenas pelo vínculo RT.</p><div className="p-record-list">{arts.slice((page - 1) * 8, page * 8).map(row => <article className="p-record" key={row.id}><div className="p-record-head"><strong>{row.id}</strong><span className="p-badge">{row.status}</span></div><p>{row.description} · {date(row.date)}</p>{company(row.companyId)}<small>Modalidade da ART: {row.modality} · autor declarado na demonstração.</small></article>)}</div>{!arts.length && <p className="p-drawer-empty">Nenhuma ART com autoria declarada para este profissional no período.</p>}</section><section className="p-drawer-section"><h3>Acervo profissional e operacional</h3><p className="p-drawer-note">CAO corresponde ao acervo da pessoa jurídica. CAT corresponde ao acervo técnico profissional e exige uma fonte própria. Esta demonstração não transforma CAOs de empresas em CATs do profissional.</p></section></>}
      {tab !== 'profile' && pages > 1 && <div className="p-pagination"><span>{tab === 'production' ? 'ARTs atribuídas' : 'Vínculos técnicos'} · 8 por página</span><div><button aria-label="Página anterior na ficha profissional" disabled={page === 1} onClick={() => setPage(value => value - 1)}><ChevronLeft size={15} /></button><span>{page} / {pages}</span><button aria-label="Próxima página na ficha profissional" disabled={page >= pages} onClick={() => setPage(value => value + 1)}><ChevronRight size={15} /></button></div></div>}
      <p className="p-source">Cadastro interno e relações sintéticos · competência {date(scope.companyScope.anchor)} · atualização {date(scope.model.metadata.updatedAt)}.</p>
    </div>
  </aside></div>;
}
