import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { ArrowUpRight, Building2, FileCheck2, FileText, Fingerprint, Landmark, LockKeyhole, SearchCheck, ShieldCheck, UsersRound, Wallet, X } from 'lucide-react';
import { dataset, companyById, establishmentById, cityById, greById, cnaeByCode, professionalById } from '../domain/dataset';
import { classifyContract, inWindow, isActiveLink, matchPublicRow, outstanding, selectScope } from '../domain/engine';
import { buildDigitalInspection, digitalMatchLabels } from '../domain/digital-inspection';
import { defaultFilters } from '../domain/types';
import type { Invoice, PageId } from '../domain/types';

type TabId = 'registry' | 'responsibility' | 'documents' | 'financial' | 'inspection' | 'market' | 'contracts' | 'quality';
type DrawerProps = {
  companyId: string | null;
  onClose: () => void;
  period: number;
  financialAllowed: boolean;
  inspectionAllowed?: boolean;
  onNavigate?: (page: PageId, companyIds: string[]) => void;
};

const tabs: { id: TabId; label: string; page: PageId }[] = [
  { id: 'registry', label: 'Cadastro', page: 'registry' },
  { id: 'responsibility', label: 'Responsabilidade', page: 'technical' },
  { id: 'documents', label: 'ART & CAO', page: 'cao' },
  { id: 'financial', label: 'Financeiro', page: 'financial' },
  { id: 'inspection', label: 'Fiscalização', page: 'inspection' },
  { id: 'market', label: 'Mercado', page: 'market' },
  { id: 'contracts', label: 'Contratações', page: 'contracts' },
  { id: 'quality', label: 'Qualidade', page: 'registry' },
];

const numberFormat = new Intl.NumberFormat('pt-BR');
const moneyFormat = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
const percentFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const number = (value: number) => numberFormat.format(value);
const money = (value: number) => moneyFormat.format(value);
const percent = (value: number) => `${percentFormat.format(value)}%`;
const digits = (value: string) => value.replace(/\D/g, '');
const dateStamp = (value: string) => Date.parse(`${value.slice(0, 10)}T00:00:00Z`);
const daysBetween = (from: string, to: string) => Math.max(0, Math.round((dateStamp(to) - dateStamp(from)) / 86_400_000));

function date(value?: string) {
  if (!value) return 'Não informada';
  const parsed = new Date(`${value.slice(0, 10)}${value.length === 7 ? '-01' : ''}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', value.length === 7
    ? { month: 'short', year: 'numeric', timeZone: 'UTC' }
    : { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(parsed);
}

function cnpj(value: string) {
  const raw = digits(value);
  if (raw.length === 8) return raw.replace(/^(\d{2})(\d{3})(\d{3})$/, '$1.$2.$3');
  if (raw.length !== 14) return value || 'Não informado';
  return raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function indexBy<T>(rows: T[], key: (row: T) => string) {
  const result = new Map<string, T[]>();
  for (const row of rows) {
    const value = key(row);
    const bucket = result.get(value);
    if (bucket) bucket.push(row); else result.set(value, [row]);
  }
  return result;
}

function Badge({ children, tone }: { children: ReactNode; tone?: 'good' | 'warning' | 'muted' }) {
  const inferred = ['Ativo', 'Ativa', 'Vigente', 'Emitida', 'Concluída', 'Resolvido', 'Quitado', 'Exata', 'Adimplente'].includes(String(children))
    ? 'good' : ['Pendente', 'Em análise', 'Solicitada', 'Revogada', 'Inadimplente', 'Vencido', 'Sugestão', 'Raiz', 'Sem correspondência', 'Em aberto'].includes(String(children)) ? 'warning' : 'muted';
  return <span className={`p-badge is-${tone ?? inferred}`}>{children}</span>;
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return <div className="p-detail"><span>{label}</span><strong>{children}</strong></div>;
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="p-drawer-empty"><SearchCheck size={22} aria-hidden="true" /><p>{children}</p></div>;
}

function Records({ label, children }: { label: string; children: ReactNode }) {
  return <div className="p-record-list" role="region" aria-label={label} tabIndex={0}
    style={{ maxHeight: 460, overflowY: 'auto', overscrollBehavior: 'contain' }}>{children}</div>;
}

function CnaeDetail({ code, secondary = false }: { code: string; secondary?: boolean }) {
  const row = cnaeByCode.get(code);
  return <div className="p-provenance p-cnae-detail">
    <div className="p-record-head"><strong>{secondary ? 'Secundário' : 'Principal'} · {code || 'CNAE não informado'}</strong><Badge tone={row?.classification === 'Relacionado' ? 'good' : 'warning'}>{row?.classification ?? 'Não classificado'}</Badge></div>
    <p>{row?.label ?? 'Código sem correspondência no catálogo importado.'}</p>
    {row && <small>Classificação original: “{row.originalClassification}” · {row.sourceSheet}, linha {row.sourceRow}.</small>}
  </div>;
}

function invoiceStatus(invoice: Invoice, anchor: string) {
  const balance = outstanding(invoice, anchor);
  return balance < 0.01 ? 'Quitado' : invoice.dueDate < anchor ? 'Vencido' : 'A vencer';
}

export default function EnterpriseDrawer({ companyId, onClose, period, financialAllowed, onNavigate, inspectionAllowed = false }: DrawerProps) {
  const [selectedTab, setTab] = useState<TabId>('registry');
  const tab: TabId = !inspectionAllowed && selectedTab === 'inspection' ? 'registry' : selectedTab;
  const drawerRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeHandler = useRef(onClose);
  const identity = useId();

  const indexes = useMemo(() => ({
    establishments: indexBy(dataset.establishments, row => row.companyId),
    registrations: indexBy(dataset.registrations, row => row.companyId),
    movements: indexBy(dataset.movements, row => row.companyId),
    links: indexBy(dataset.technicalLinks, row => row.companyId),
    arts: indexBy(dataset.arts, row => row.companyId),
    caos: indexBy(dataset.caos, row => row.companyId),
    invoices: indexBy(dataset.invoices, row => row.companyId),
    cases: indexBy(dataset.cases, row => row.companyId),
    contracts: indexBy(dataset.contracts, row => row.companyId),
    quality: indexBy(dataset.qualityEvents, row => row.companyId),
    publicByEstablishment: indexBy(dataset.publicRows, row => row.establishmentId),
    publicByRoot: indexBy(dataset.publicRows, row => digits(row.cnpj).slice(0, 8)),
    artById: new Map(dataset.arts.map(row => [row.id, row])),
    buyerById: new Map(dataset.buyers.map(row => [row.id, row])),
    cboByCode: new Map(dataset.cbos.map(row => [row.code, row])),
  }), []);

  const records = useMemo(() => {
    const company = companyId ? companyById.get(companyId) : undefined;
    if (!company) return null;
    const establishments = indexes.establishments.get(company.id) ?? [];
    const publicCandidates = [...(indexes.publicByRoot.get(digits(company.rootCnpj)) ?? []),
      ...establishments.flatMap(row => indexes.publicByEstablishment.get(row.id) ?? [])];
    const uniquePublic = new Map(publicCandidates.map(row => [row.id, row]));
    return {
      company, establishments,
      registrations: indexes.registrations.get(company.id) ?? [],
      movements: indexes.movements.get(company.id) ?? [],
      links: indexes.links.get(company.id) ?? [],
      arts: indexes.arts.get(company.id) ?? [],
      caos: indexes.caos.get(company.id) ?? [],
      invoices: indexes.invoices.get(company.id) ?? [],
      cases: indexes.cases.get(company.id) ?? [],
      contracts: indexes.contracts.get(company.id) ?? [],
      quality: indexes.quality.get(company.id) ?? [],
      publicRows: [...uniquePublic.values()],
    };
  }, [companyId, indexes]);

  const publicMatches = useMemo(() => tab === 'market' && records
    ? records.publicRows.map(row => ({ row, match: matchPublicRow(row, dataset) })) : [], [records, tab]);
  const classifiedContracts = useMemo(() => records ? records.contracts
    .filter(row => inWindow(row.date, period, dataset.snapshotDate))
    .map(row => ({ row, classification: classifyContract(row.object) })) : [], [records, period]);
  const digitalInspection = useMemo(() => tab === 'inspection' && inspectionAllowed && records
    ? buildDigitalInspection(selectScope(dataset, { ...defaultFilters, period }, [records.company.id]))
    : null, [records, period, tab, inspectionAllowed]);
  const digitalCompany = digitalInspection?.companies.find(row => row.companyId === companyId);
  const digitalEvidence = digitalInspection?.evidenceRows.filter(row => row.companyId === companyId) ?? [];
  const employment = useMemo(() => {
    if (tab !== 'market' || !records) return [];
    const territoryActivities = new Set(records.establishments.flatMap(row =>
      [row.cnaeMain, ...row.cnaeSecondary].filter(Boolean).map(code => `${row.cityId}|${code}`)));
    return dataset.employment.filter(row => territoryActivities.has(`${row.cityId}|${row.cnae}`) && inWindow(row.month, period, dataset.snapshotDate));
  }, [records, period, tab]);

  useEffect(() => { closeHandler.current = onClose; }, [onClose]);
  useEffect(() => { if (panelRef.current) panelRef.current.scrollTop = 0; }, [tab, companyId]);
  useEffect(() => {
    if (!companyId || !companyById.has(companyId)) return;
    setTab('registry');
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const focusable = () => Array.from(drawerRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
    ) ?? []).filter(element => element.getClientRects().length > 0 && element.tabIndex >= 0);
    const handleKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeHandler.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      if (!elements.length) { event.preventDefault(); drawerRef.current?.focus(); return; }
      const first = elements[0];
      const last = elements[elements.length - 1];
      const outside = !drawerRef.current?.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || outside || document.activeElement === drawerRef.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || outside || document.activeElement === drawerRef.current)) {
        event.preventDefault(); first.focus();
      }
    };
    const keepFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !drawerRef.current?.contains(event.target)) closeRef.current?.focus();
    };
    document.addEventListener('keydown', handleKey, true);
    document.addEventListener('focusin', keepFocus);
    return () => {
      document.removeEventListener('keydown', handleKey, true);
      document.removeEventListener('focusin', keepFocus);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected && previousFocus !== document.body) previousFocus.focus();
      else document.querySelector<HTMLButtonElement>('button[aria-label="Explorar recorte"]')?.focus();
    };
  }, [companyId]);

  if (!records) return null;

  const { company } = records;
  const anchor = dataset.snapshotDate;
  const arts = records.arts.filter(row => inWindow(row.date, period, anchor));
  const caos = records.caos.filter(row => row.requestedAt <= anchor);
  const caoRequested = caos.filter(row => inWindow(row.requestedAt, period, anchor));
  const caoIssued = caos.filter(row => inWindow(row.issuedAt, period, anchor));
  const movements = records.movements.filter(row => inWindow(row.date, period, anchor));
  const activeLinks = records.links.filter(row => isActiveLink(row, anchor));
  const visibleLinks = records.links.filter(row => row.startDate <= anchor);
  const cases = records.cases.filter(row => row.createdAt <= anchor);
  const quality = records.quality.filter(row => row.date <= anchor);
  const unresolved = quality.filter(row => !row.resolved);
  const activeRegistrations = records.registrations.filter(row => row.status === 'Ativo');
  const visibleTabs = tabs.filter(item => inspectionAllowed || item.id !== 'inspection');
  const currentTab = visibleTabs.find(item => item.id === tab) ?? visibleTabs[0];
  const latestEmploymentMonth = employment.reduce((latest, row) => row.month > latest ? row.month : latest, '');
  const employmentStock = employment.filter(row => row.month === latestEmploymentMonth);
  const stockByCbo = new Map<string, number>();
  for (const row of employmentStock) stockByCbo.set(row.cbo, (stockByCbo.get(row.cbo) ?? 0) + row.stock);

  const handleTabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = visibleTabs.findIndex(item => item.id === tab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? visibleTabs.length - 1
      : (current + (event.key === 'ArrowRight' ? 1 : -1) + visibleTabs.length) % visibleTabs.length;
    setTab(visibleTabs[next].id);
    document.getElementById(`${identity}-${visibleTabs[next].id}`)?.focus();
  };
  const navigateToCompany = () => { onNavigate?.(currentTab.page, [company.id]); onClose(); };

  const financeContent = () => {
    if (!financialAllowed) return <div className="p-drawer-empty p-profile"><LockKeyhole size={26} aria-hidden="true" /><h3>Acesso financeiro restrito</h3><p>O perfil atual não tem acesso a anuidades, saldos e pagamentos. Selecione um perfil autorizado no painel para consultar esta aba.</p></div>;
    const invoices = records.invoices;
    const eligible = invoices.filter(row => row.dueDate <= anchor);
    const late = eligible.filter(row => row.dueDate < anchor && outstanding(row, anchor) > 0);
    const amountOpen = invoices.reduce((sum, row) => sum + outstanding(row, anchor), 0);
    const overdue = late.reduce((sum, row) => sum + outstanding(row, anchor), 0);
    const recovered = invoices.filter(row => row.recovered && inWindow(row.paymentDate, period, anchor)).reduce((sum, row) => sum + row.paidAmount, 0);
    const visibleInvoices = records.invoices.filter(row => inWindow(row.dueDate, period, anchor) || inWindow(row.paymentDate, period, anchor));
    const futureInvoices = invoices.filter(row => row.dueDate > anchor);
    return <>
      <section className="p-drawer-section">
        <h3><Wallet size={17} aria-hidden="true" />Situação financeira da empresa</h3>
        <div className="p-detail-grid">
          <Detail label="Situação no snapshot">{eligible.length ? <Badge>{late.length ? 'Inadimplente' : 'Adimplente'}</Badge> : 'Sem lançamentos elegíveis'}</Detail>
          <Detail label="Saldo em aberto, incluindo a vencer">{money(amountOpen)}</Detail>
          <Detail label="Saldo vencido">{money(overdue)}</Detail>
          <Detail label="Recuperado no período">{money(recovered)}</Detail>
          <Detail label="Saldo com vencimento após o snapshot">{money(futureInvoices.reduce((sum, row) => sum + outstanding(row, anchor), 0))}</Detail>
        </div>
        <p className="p-drawer-note">Adimplência: ausência de saldo positivo em obrigação com vencimento anterior a {date(anchor)}. O saldo considera pagamentos até esse snapshot; valores futuros não determinam inadimplência. Recuperação considera a data do pagamento no período.</p>
      </section>
      <section className="p-drawer-section">
        <h3>Adimplência por registro ou visto</h3>
        {records.registrations.length ? <Records label="Situação financeira por registro">{records.registrations.map(registration => {
          const rows = records.invoices.filter(row => row.registrationId === registration.id);
          const eligibleRows = rows.filter(row => row.dueDate <= anchor);
          const hasOverdue = rows.some(row => row.dueDate < anchor && outstanding(row, anchor) > 0);
          return <div className="p-record" key={registration.id}><div className="p-record-head"><strong>{registration.type} {registration.id}</strong><Badge>{eligibleRows.length ? hasOverdue ? 'Inadimplente' : 'Adimplente' : rows.length ? 'Somente obrigações futuras' : 'Sem lançamentos'}</Badge></div><p>{registration.status} · {number(rows.length)} lançamentos, {number(eligibleRows.length)} vencidos/atuais</p><small>Saldo em aberto, incluindo a vencer: {money(rows.reduce((sum, row) => sum + outstanding(row, anchor), 0))}</small></div>;
        })}</Records> : <Empty>Nenhum registro ou visto localizado nesta empresa para análise financeira.</Empty>}
      </section>
      <section className="p-drawer-section">
        <h3>Lançamentos e pagamentos no período</h3>
        {visibleInvoices.length ? <Records label="Lançamentos financeiros no período">{visibleInvoices.map(row => {
          const balance = outstanding(row, anchor);
          const openDelay = balance > 0 && row.dueDate < anchor ? daysBetween(row.dueDate, anchor) : 0;
          const paidDelay = row.paymentDate && row.paymentDate <= anchor ? daysBetween(row.dueDate, row.paymentDate) : 0;
          return <div className="p-record" key={row.id}>
            <div className="p-record-head"><strong>{row.id}</strong><Badge>{invoiceStatus(row, anchor)}</Badge></div>
            <p>Registro ou visto: {row.registrationId}</p>
            <div className="p-detail-grid"><Detail label="Valor lançado">{money(row.amount)}</Detail><Detail label="Pago até o snapshot">{money(row.amount - balance)}</Detail><Detail label="Saldo">{money(balance)}</Detail><Detail label="Vencimento">{date(row.dueDate)}</Detail><Detail label="Pagamento">{row.paymentDate && row.paymentDate <= anchor ? date(row.paymentDate) : 'Sem pagamento até o snapshot'}</Detail><Detail label={openDelay ? 'Atraso em aberto' : 'Atraso no pagamento'}>{number(openDelay || paidDelay)} dias</Detail></div>
            <div className="p-record-meta"><Badge tone="muted">{row.installmentPlan ? 'Com parcelamento' : 'Sem parcelamento'}</Badge>{row.recovered && <Badge tone="good">Pagamento recuperado</Badge>}</div>
          </div>;
        })}</Records> : <Empty>Nenhum vencimento ou pagamento desta empresa no período selecionado.</Empty>}
      </section>
      {futureInvoices.length > 0 && <section className="p-drawer-section">
        <h3>Obrigações a vencer após o snapshot</h3>
        <p className="p-drawer-note">Essas obrigações compõem o saldo em aberto e permanecem fora da apuração de inadimplência no snapshot.</p>
        <Records label="Obrigações com vencimento futuro">{futureInvoices.map(row => <div className="p-record" key={row.id}>
          <div className="p-record-head"><strong>{row.id}</strong><Badge>A vencer</Badge></div>
          <p>Registro/visto {row.registrationId} · vencimento {date(row.dueDate)}</p>
          <div className="p-record-meta"><span>{row.installmentPlan ? 'Com parcelamento' : 'Sem parcelamento'}</span><strong>{money(outstanding(row, anchor))}</strong></div>
        </div>)}</Records>
      </section>}
    </>;
  };

  return <div className="p-drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <aside ref={drawerRef} className="p-drawer" role="dialog" aria-modal="true" aria-labelledby={`${identity}-title`} aria-describedby={`${identity}-demo`} tabIndex={-1}>
      <header className="p-drawer-head">
        <div><span className="p-eyebrow">FICHA DA EMPRESA</span><h2 id={`${identity}-title`}>{company.name}</h2><p>{company.tradeName} · raiz CNPJ {cnpj(company.rootCnpj)}</p></div>
        <button ref={closeRef} type="button" className="p-icon-button" onClick={onClose} aria-label="Fechar ficha da empresa"><X size={21} aria-hidden="true" /></button>
      </header>
      <div className="p-drawer-identity"><span>{number(records.establishments.length)} estabelecimentos</span><span>{number(records.registrations.length)} registros/vistos</span><Badge tone={activeRegistrations.length ? 'good' : 'muted'}>{activeRegistrations.length ? `${number(activeRegistrations.length)} registro(s)/visto(s) ativo(s)` : records.registrations.length ? 'Sem registro/visto ativo' : 'Não localizada no cadastro CREA'}</Badge></div>
      <div className="p-drawer-demo" id={`${identity}-demo`}><ShieldCheck size={16} aria-hidden="true" /><span>Empresa, CNPJs, profissionais e ocorrências fictícios. O catálogo CNAE preserva a planilha recebida. Snapshot: {date(anchor)}.</span></div>
      <div className="p-company-perspective"><label htmlFor={`${identity}-details`}>Detalhes da empresa</label><select id={`${identity}-details`} value={tab} onChange={event => setTab(event.target.value as TabId)}>{visibleTabs.map(item => <option key={item.id} value={item.id}>{item.label}{item.id === 'financial' && !financialAllowed ? ' · acesso restrito' : ''}</option>)}</select>{!inspectionAllowed && onNavigate && <button className="p-link-button" onClick={() => onNavigate('inspection', [company.id])}>Abrir em Fiscalização <ArrowUpRight size={13} /></button>}</div>
      <div ref={panelRef} className="p-drawer-body" id={`${identity}-panel`} role="region" aria-label={currentTab.label} tabIndex={0}>
        <div className="p-drawer-actions"><span className="p-drawer-note">Eventos nos últimos {period} meses · até {date(anchor)}</span>{onNavigate && (tab !== 'financial' || financialAllowed) && <button type="button" className="p-link-button" onClick={navigateToCompany}>Analisar esta empresa no painel <ArrowUpRight size={14} aria-hidden="true" /></button>}</div>

        {tab === 'registry' && <>
          <section className="p-drawer-section">
            <h3><Building2 size={17} aria-hidden="true" />Identidade empresarial</h3>
            <div className="p-detail-grid"><Detail label="Razão social">{company.name}</Detail><Detail label="Nome fantasia">{company.tradeName}</Detail><Detail label="Porte">{company.size}</Detail><Detail label="Natureza jurídica">{company.legalNature}</Detail><Detail label="Raiz demonstrativa do CNPJ">{cnpj(company.rootCnpj)}</Detail><Detail label="Origem da presença no painel">{company.externalOnly ? 'Universo externo simulado' : 'Cadastro interno simulado'}</Detail></div>
            <p className="p-drawer-note">Empresa é a entidade da raiz CNPJ; cada CNPJ completo identifica um estabelecimento. Registros e vistos são entidades próprias e podem coexistir ou apresentar situações diferentes.</p>
            {!records.registrations.length && <div className="p-drawer-callout"><strong>Correspondência cadastral não localizada</strong><p>A ausência na base simulada exige conciliação e análise da atividade efetivamente exercida. Não comprova obrigação de registro ou irregularidade.</p></div>}
          </section>
          <section className="p-drawer-section">
            <h3>Estabelecimentos da mesma raiz</h3>
            {records.establishments.length ? <Records label="Estabelecimentos da empresa">{records.establishments.map(row => {
              const registrations = records.registrations.filter(item => item.establishmentId === row.id);
              return <article className="p-record" key={row.id}>
                <div className="p-record-head"><strong>{row.branch} · {cnpj(row.cnpj)}</strong><Badge>{row.rfbStatus}</Badge></div>
                <div className="p-detail-grid"><Detail label="Município da Receita">{cityById.get(row.cityId)?.name ?? 'Não identificado'}</Detail><Detail label="Município no CREA">{cityById.get(row.creaCityId)?.name ?? 'Não localizado'}</Detail><Detail label="GRE da amostra">{greById.get(row.greId)?.name ?? 'Não identificada'}</Detail><Detail label="Abertura">{date(row.openedAt)}</Detail><Detail label="Atualização cadastral">{date(row.updatedAt)}</Detail><Detail label="Registros/vistos">{number(registrations.length)}</Detail></div>
                <CnaeDetail code={row.cnaeMain} />
                {row.cnaeSecondary.map(code => <CnaeDetail key={code} code={code} secondary />)}
                {!row.cnaeSecondary.length && <p className="p-drawer-note">Sem CNAEs secundários informados na amostra.</p>}
              </article>;
            })}</Records> : <Empty>Nenhum estabelecimento associado à empresa.</Empty>}
            <p className="p-drawer-note">Fonte cadastral: campos sintéticos de CNPJ e cadastro CREA. A correspondência município–GRE desta amostra é demonstrativa. “Relacionado” e “Depende de análise” são rótulos analíticos do catálogo, sem conclusão automática de obrigação.</p>
          </section>
          <section className="p-drawer-section">
            <h3>Registros, vistos e tramitação</h3>
            {records.registrations.length ? <Records label="Registros e vistos da empresa">{records.registrations.map(row => <article className="p-record" key={row.id}>
              <div className="p-record-head"><strong>{row.type} {row.id}</strong><Badge>{row.status}</Badge></div>
              <p>Estabelecimento: {cnpj(establishmentById.get(row.establishmentId)?.cnpj ?? row.establishmentId)}</p>
              <div className="p-detail-grid"><Detail label="Solicitação">{date(row.requestedAt)}</Detail><Detail label="Início">{date(row.startedAt)}</Detail><Detail label="Cessação">{row.ceasedAt ? date(row.ceasedAt) : 'Sem cessação informada'}</Detail><Detail label="Solicitação até início">{number(daysBetween(row.requestedAt, row.startedAt))} dias</Detail></div>
            </article>)}</Records> : <Empty>Nenhum registro ou visto localizado na base simulada.</Empty>}
          </section>
          <section className="p-drawer-section"><h3>Movimentações no período</h3>{movements.length ? <Records label="Movimentações cadastrais">{movements.map(row => <div className="p-record" key={row.id}><div className="p-record-head"><strong>{row.type}</strong><span>{date(row.date)}</span></div><small>{row.id} · registro/visto {row.registrationId}</small></div>)}</Records> : <Empty>Sem novos registros, baixas, reativações ou cancelamentos no período.</Empty>}</section>
        </>}

        {tab === 'responsibility' && <>
          <section className="p-drawer-section"><h3><UsersRound size={17} aria-hidden="true" />Vínculos de responsabilidade técnica</h3>
            <div className="p-detail-grid"><Detail label="Vínculos vigentes no snapshot">{number(activeLinks.length)}</Detail><Detail label="Profissionais distintos vigentes">{number(new Set(activeLinks.map(row => row.professionalId)).size)}</Detail><Detail label="Novos vínculos no período">{number(visibleLinks.filter(row => inWindow(row.startDate, period, anchor)).length)}</Detail><Detail label="Encerramentos no período">{number(visibleLinks.filter(row => inWindow(row.endDate, period, anchor)).length)}</Detail></div>
            <p className="p-drawer-note">Os nomes abaixo pertencem exclusivamente ao cadastro profissional interno fictício. Dados públicos de emprego não identificam nem comprovam vínculos individuais com esta empresa. Modalidade e vínculo não dispensam análise das atribuições para cada atividade.</p>
          </section>
          <section className="p-drawer-section"><h3>Vínculos atuais e histórico</h3>
            {visibleLinks.length ? <Records label="Histórico de responsabilidade técnica">{visibleLinks.map(row => {
              const professional = professionalById.get(row.professionalId);
              return <article className="p-record" key={row.id}><div className="p-record-head"><strong>{professional?.name ?? 'Profissional não localizado'}</strong><Badge>{isActiveLink(row, anchor) ? 'Vigente' : 'Encerrado'}</Badge></div><p>{row.modality}</p><div className="p-detail-grid"><Detail label="Registro profissional">{professional?.registration ?? row.professionalId}</Detail><Detail label="Modalidade no cadastro">{professional?.modality ?? 'Não informada'}</Detail><Detail label="Início do vínculo">{date(row.startDate)}</Detail><Detail label="Fim do vínculo">{row.endDate ? date(row.endDate) : 'Sem término informado'}</Detail></div><small>Vínculo {row.id} · situação em {date(anchor)}</small></article>;
            })}</Records> : <Empty>Nenhum vínculo técnico na base interna demonstrativa. O resultado requer validação da fonte.</Empty>}
            <p className="p-drawer-note">O histórico inclui vínculos iniciados antes do período, pois a vigência é apurada na data do snapshot.</p>
          </section>
        </>}

        {tab === 'documents' && <>
          <div className="p-drawer-callout p-documentation"><strong>Documentos com finalidades distintas</strong><p>ART registra a responsabilidade por uma atividade. CAT refere-se ao acervo técnico do profissional; CAO, ao acervo operacional da pessoa jurídica. ART não substitui CAO. As certidões desta amostra são fictícias, sem emissão ou validade oficial.</p></div>
          <section className="p-drawer-section"><h3><FileCheck2 size={17} aria-hidden="true" />ART e procedimentos de CAO</h3><div className="p-detail-grid"><Detail label="ARTs no período">{number(arts.length)}</Detail><Detail label="CAOs solicitadas no período">{number(caoRequested.length)}</Detail><Detail label="CAOs emitidas no período">{number(caoIssued.length)}</Detail><Detail label="CAOs em análise ou pendentes no snapshot">{number(caos.filter(row => ['Solicitada', 'Em análise', 'Pendente'].includes(row.status)).length)}</Detail></div></section>
          <section className="p-drawer-section"><h3>ARTs relacionadas</h3>{arts.length ? <Records label="ARTs no período">{arts.map(row => <article className="p-record" key={row.id}><div className="p-record-head"><strong>{row.id}</strong><Badge>{row.status}</Badge></div><p>{row.description}</p><div className="p-record-meta"><span>{row.modality} · {date(row.date)}</span><strong>{money(row.value)}</strong></div><small>Registro/visto {row.registrationId}{row.endDate ? ` · Baixa em ${date(row.endDate)}` : ''}</small></article>)}</Records> : <Empty>Nenhuma ART registrada para esta empresa no período.</Empty>}</section>
          <section className="p-drawer-section"><h3>Certidões de Acervo Operacional</h3><p className="p-drawer-note">Procedimentos até o snapshot, incluindo solicitações anteriores ao período. Solicitação e emissão são contadas pela própria data; pendências representam a situação no snapshot.</p>
            {caos.length ? <Records label="Procedimentos de CAO da empresa">{caos.map(row => <article className="p-record p-processing" key={row.id}>
              <div className="p-record-head"><strong>{row.id}</strong><Badge>{row.status}</Badge></div><p>{row.activity}</p>
              <div className="p-detail-grid"><Detail label="Solicitação">{date(row.requestedAt)}</Detail><Detail label="Emissão">{row.issuedAt ? date(row.issuedAt) : 'Ainda não emitida'}</Detail><Detail label={row.issuedAt ? 'Prazo até emissão' : 'Tempo desde solicitação'}>{number(daysBetween(row.requestedAt, row.issuedAt ?? anchor))} dias corridos</Detail><Detail label="ARTs vinculadas">{number(row.artIds.length)}</Detail></div>
              <details><summary>Consultar ARTs vinculadas</summary><div className="p-record-list">{row.artIds.map(id => { const art = indexes.artById.get(id); return <div className="p-record" key={id}><strong>{id}</strong><p>{art?.description ?? 'Referência não localizada na amostra.'}</p>{art && <small>{art.status} · {date(art.date)}{art.endDate ? ` · baixa ${date(art.endDate)}` : ''}</small>}</div>; })}{!row.artIds.length && <p className="p-drawer-note">Nenhuma ART vinculada informada.</p>}</div></details>
            </article>)}</Records> : <Empty>Nenhum procedimento de CAO associado à empresa até o snapshot.</Empty>}
          </section>
        </>}

        {tab === 'financial' && financeContent()}

        {tab === 'inspection' && inspectionAllowed && <>
          <div className="p-drawer-callout"><strong>Evidências para fiscalização digital</strong><p>Cruzamentos cadastrais e documentais selecionam conjuntos para verificação humana. CNAE, objeto contratual, ausência de correspondência ou vínculo não comprovam obrigação de registro nem infração.</p></div>
          <section className="p-drawer-section" data-inspection-evidence="company">
            <h3><ShieldCheck size={17} aria-hidden="true" />Correspondência e cobertura das fontes</h3>
            <div className="p-detail-grid">
              <Detail label="Correspondência no universo selecionado">{digitalCompany ? digitalMatchLabels[digitalCompany.match] : 'Fora do universo RFB ativo com CNAE selecionado'}</Detail>
              <Detail label="Estabelecimentos elegíveis">{number(digitalCompany?.establishmentIds.length ?? 0)}</Detail>
              <Detail label="Registros vigentes correspondentes">{digitalCompany ? number(digitalCompany.activeRegistrationIds.length) : 'Não se aplica ao universo selecionado'}</Detail>
              <Detail label="Vínculos RT identificados no corte">{digitalCompany ? number(digitalCompany.activeRtIds.length) : 'Não se aplica ao universo selecionado'}</Detail>
              <Detail label="Contratos com indício textual no período">{digitalCompany ? number(digitalCompany.technicalContractIds.length) : 'Não se aplica ao universo selecionado'}</Detail>
              <Detail label="Competência cadastral">{date(digitalInspection?.asOf ?? anchor)}</Detail>
            </div>
            <p className="p-drawer-note">A seleção considera CNPJ válido e deduplicado, situação RFB ativa e CNAE principal ou secundário classificado como relacionado ou dependente de análise. Correspondência usa CNPJ completo; raiz indica candidato para revisão. Registros e vínculos são consultados no corte cadastral, preservando os {period} meses para contratos.</p>
            {digitalCompany && <details><summary>Identificadores usados na conciliação</summary>
              <div className="p-detail-grid"><Detail label="CNPJs elegíveis">{digitalCompany.cnpjs.map(cnpj).join(' · ')}</Detail><Detail label="Linhas da base externa">{digitalCompany.sourceRowIds.join(' · ')}</Detail><Detail label="Registros por CNPJ completo">{digitalCompany.registrationIds.join(' · ') || 'Nenhum localizado'}</Detail><Detail label="Candidatos pela raiz">{digitalCompany.rootCandidateRegistrationIds.join(' · ') || 'Nenhum candidato adicional'}</Detail><Detail label="Vínculos vigentes da empresa">{digitalCompany.activeRtIds.join(' · ') || 'Nenhum identificado na fonte'}</Detail></div>
            </details>}
            <p className="p-drawer-note">{digitalInspection?.source}</p>
          </section>
          <section className="p-drawer-section">
            <h3>Regras, critérios e documentos de origem</h3>
            {digitalEvidence.length ? <Records label="Evidências digitais da empresa">{digitalEvidence.map(evidence => <article className="p-record" key={evidence.id}>
              <div className="p-record-head"><strong>{evidence.title}</strong><Badge tone="muted">{evidence.ruleId}</Badge></div>
              <p>{evidence.criteria}</p>
              <div className="p-detail-grid"><Detail label="Fonte cruzada">{evidence.source}</Detail><Detail label="Corte cadastral">{date(evidence.asOf)}</Detail><Detail label="Evidência">{evidence.id}</Detail></div>
              <p className="p-drawer-note"><strong>Limitação: </strong>{evidence.limitation}</p>
              <details><summary>Consultar referências da origem ({number(evidence.factIds.length)})</summary>{evidence.factIds.map(factId => {
                const publicRow = records.publicRows.find(row => row.id === factId);
                const registration = records.registrations.find(row => row.id === factId);
                const contract = records.contracts.find(row => row.id === factId);
                const qualityEvent = records.quality.find(row => row.id === factId);
                return <div className="p-record" key={factId}><strong>{factId}</strong>
                  {publicRow && <p>CNPJ {cnpj(publicRow.cnpj)} · CNAE {publicRow.cnae} · {cityById.get(publicRow.cityId)?.name ?? 'Município não identificado'} · atualização {date(publicRow.updatedAt)}</p>}
                  {registration && <p>{registration.type} · início {date(registration.startedAt)}{registration.ceasedAt ? ` · cessação informada ${date(registration.ceasedAt)}` : ''}. Vigência no corte apurada pelo histórico de movimentações.</p>}
                  {contract && <><p>{contract.object}</p><small>Contrato de {date(contract.date)} · fornecedor/estabelecimento {cnpj(establishmentById.get(contract.establishmentId)?.cnpj ?? contract.establishmentId)}.</small></>}
                  {qualityEvent && <p>{qualityEvent.type} · {qualityEvent.evidence} · {date(qualityEvent.date)}</p>}
                  {!publicRow && !registration && !contract && !qualityEvent && <p>Referência preservada pela regra; consultar a fonte homologada para o documento completo.</p>}
                </div>;
              })}</details>
            </article>)}</Records> : <Empty>{digitalCompany ? 'Nenhuma combinação de evidências digitais definida para esta empresa no corte. Ausência de sinal não comprova regularidade.' : 'Empresa fora do universo RFB ativo com CNAE selecionado desta análise. Isso não exclui atividade técnica nem equivale a ausência de obrigação.'}</Empty>}
          </section>
          <section className="p-drawer-section">
            <h3>Limites dos cruzamentos</h3>
            <p className="p-drawer-note">RAIS e Novo CAGED permanecem agregados por território, CNAE, CBO e competência: não identificam empregados nem vínculos desta empresa. Contratos e ARTs da mesma empresa não possuem ligação documental comprovada nesta demonstração; não se conclui que uma contratação esteja sem ART. O cadastro observado no corte não comprova vigência na data de execução do contrato.</p>
          </section>
          <section className="p-drawer-section"><details><summary>Contexto histórico de fiscalização ({number(cases.length)} registros)</summary>
            <p className="p-drawer-note">Documentos simulados registrados até {date(anchor)}, inclusive anteriores ao período. Este histórico não é uma medida de produtividade e não altera processos.</p>{cases.length ? <Records label="Contexto histórico de fiscalização">{cases.map(row => <article className="p-record" key={row.id}>
              <div className="p-record-head"><strong>{row.id}</strong><Badge>{row.status}</Badge></div><p>Estabelecimento {cnpj(establishmentById.get(row.establishmentId)?.cnpj ?? row.establishmentId)}</p><div className="p-detail-grid"><Detail label="Abertura">{date(row.createdAt)}</Detail><Detail label="Conclusão registrada">{row.completedAt ? date(row.completedAt) : 'Sem conclusão informada'}</Detail><Detail label="Documento no histórico">{row.notice?.stage ?? 'Sem notificação informada'}</Detail></div>
              {row.notice && <p className="p-drawer-note">{row.notice.stage} · documento {row.notice.id} · {date(row.notice.date)}. Notificação, auto ou defesa não constituem decisão definitiva.</p>}
              <details><summary>Consultar eventos e resultado registrado</summary><ol className="p-timeline">{[...row.history].filter(event => event.date <= anchor).sort((a, b) => a.date.localeCompare(b.date)).map((event, index) => <li key={`${event.date}-${index}`}><strong>{event.status}</strong><small>{date(event.date)}</small><p>{event.note}</p></li>)}</ol><p className="p-drawer-note"><strong>Resultado registrado: </strong>{row.outcome || 'Sem resultado conclusivo registrado.'}</p></details>
            </article>)}</Records> : <Empty>Nenhum documento de fiscalização vinculado à empresa na amostra.</Empty>}
          </details></section>
        </>}

        {tab === 'market' && <>
          <section className="p-drawer-section"><h3><Fingerprint size={17} aria-hidden="true" />Conciliação com o universo público</h3><p className="p-drawer-note">Linhas externas relacionadas pelo estabelecimento ou raiz demonstrativa. Correspondência exata de CNPJ não garante registro ativo. Raiz coincidente identifica a empresa; sugestões exigem revisão manual e não mesclam entidades automaticamente.</p>
            {publicMatches.length ? <Records label="Linhas públicas e resultados da conciliação">{publicMatches.map(({ row, match }) => <article className="p-record" key={row.id}><div className="p-record-head"><strong>{row.companyName}</strong><Badge>{match.status}</Badge></div><p>{cnpj(row.cnpj)} · {cityById.get(row.cityId)?.name ?? 'Município não identificado'}</p><small>CNAE {row.cnae} · atualização da fonte {date(row.updatedAt)}</small><div className="p-record-meta"><span>Índice diagnóstico do cruzamento: {percent(match.confidence)}</span></div><details><summary>Explicação e evidência da correspondência</summary><p>{match.explanation}</p>{match.companyId && <p>Candidato: {companyById.get(match.companyId)?.name ?? match.companyId}{match.establishmentId ? ` · estabelecimento ${match.establishmentId}` : ''}.</p>}<small>Linha de origem: {row.id}. Nenhuma alteração cadastral é aplicada por esta consulta.</small></details></article>)}</Records> : <Empty>Nenhuma linha pública vinculada à raiz ou aos estabelecimentos desta empresa na amostra.</Empty>}
          </section>
          <section className="p-drawer-section"><h3>Atividades e mercado potencial</h3><p className="p-drawer-note">Catálogo integral da planilha recebida. “Relacionado” representa o marcador original Sim/sim; “Depende de análise” representa Passível de obrigação. O CNAE declarado exige análise da atividade real.</p><Records label="CNAEs da empresa no catálogo">{[...new Set(records.establishments.flatMap(row => [row.cnaeMain, ...row.cnaeSecondary]).filter(Boolean))].map(code => <div className="p-record" key={code}><CnaeDetail code={code} /></div>)}</Records></section>
          <section className="p-drawer-section"><h3>Mercado de trabalho agregado do território</h3><div className="p-drawer-callout"><strong>Emprego territorial, sem associação individual</strong><p>Os valores agregam os pares município–CNAE dos estabelecimentos. Não correspondem ao quadro de funcionários desta empresa e não permitem identificar trabalhadores ou cruzar vínculos individuais com o CREA.</p></div>
            {employment.length ? <><div className="p-detail-grid"><Detail label={`Estoque agregado · ${date(latestEmploymentMonth)}`}>{number(employmentStock.reduce((sum, row) => sum + row.stock, 0))}</Detail><Detail label="Admissões no período">{number(employment.reduce((sum, row) => sum + row.admissions, 0))}</Detail><Detail label="Desligamentos no período">{number(employment.reduce((sum, row) => sum + row.dismissals, 0))}</Detail><Detail label="Saldo no período">{number(employment.reduce((sum, row) => sum + row.admissions - row.dismissals, 0))}</Detail></div><Records label="Ocupações no estoque territorial">{[...stockByCbo.entries()].sort((a, b) => b[1] - a[1]).map(([code, count]) => <div className="p-record" key={code}><div className="p-record-head"><strong>{indexes.cboByCode.get(code)?.label ?? code}</strong><Badge tone="muted">{number(count)} vínculos</Badge></div><small>CBO {code}{indexes.cboByCode.get(code)?.technical ? ' · ocupação técnica declarada' : ''}</small></div>)}</Records></> : <Empty>Sem fatos de emprego agregado para esses pares município–CNAE no período.</Empty>}
            <p className="p-drawer-note">Fonte: fatos sintéticos com estrutura de RAIS, Novo CAGED e CBO. Ocupação declarada não comprova registro nem atribuição profissional.</p>
          </section>
        </>}

        {tab === 'contracts' && <>
          <section className="p-drawer-section"><h3><Landmark size={17} aria-hidden="true" />Contratações públicas no período</h3><div className="p-detail-grid"><Detail label="Contratações">{number(classifiedContracts.length)}</Detail><Detail label="Valor contratado">{money(classifiedContracts.reduce((sum, item) => sum + item.row.value, 0))}</Detail><Detail label="Categorias de objetos">{number(new Set(classifiedContracts.map(item => item.row.category)).size)}</Detail><Detail label="Origem">PNCP simulado</Detail></div>
            {classifiedContracts.length ? <Records label="Contratações e diagnóstico dos objetos">{classifiedContracts.map(({ row, classification }) => { const buyer = indexes.buyerById.get(row.buyerId); return <article className="p-record" key={row.id}>
              <div className="p-record-head"><strong>{row.id}</strong><Badge>{row.category}</Badge></div><p>{row.object}</p><small>{buyer?.name ?? row.buyerId} · {buyer?.sphere ?? 'Esfera não informada'} · {date(row.date)}</small><div className="p-record-meta"><span>{row.category}</span><strong>{money(row.value)}</strong></div><p className="p-drawer-note">CNPJ do estabelecimento: {cnpj(establishmentById.get(row.establishmentId)?.cnpj ?? row.establishmentId)}</p>{inspectionAllowed && <details><summary>Termos usados para leitura do objeto</summary><p>{classification.explanation}</p><p>Termos: {classification.terms.length ? classification.terms.join(' · ') : 'nenhum termo reconhecido'}.</p><small>Dicionário textual demonstrativo, sem modelo treinado ou probabilidade de infração. Validar objeto, execução e obrigação com análise humana.</small></details>}
            </article>; })}</Records> : <Empty>Nenhuma contratação pública vinculada à empresa no período.</Empty>}
            <p className="p-drawer-note">Fonte: contratos e compradores fictícios, com estrutura inspirada no PNCP. Data usada para o período: data da contratação.</p>
          </section>
        </>}

        {tab === 'quality' && <>
          <section className="p-drawer-section p-quality"><h3><SearchCheck size={17} aria-hidden="true" />Consistência e rastreabilidade</h3><div className="p-detail-grid"><Detail label="Eventos de qualidade até o snapshot">{number(quality.length)}</Detail><Detail label="Divergências em aberto">{number(unresolved.length)}</Detail><Detail label="Eventos resolvidos">{number(quality.length - unresolved.length)}</Detail><Detail label="Atualização da amostra">{date(dataset.updatedAt)}</Detail></div><p className="p-drawer-note">O histórico preserva fonte, evidência, estabelecimento e resolução. Divergências são sinais para validação dos dados, sem conclusão automática de irregularidade.</p>
            {quality.length ? <Records label="Eventos e evidências de qualidade cadastral">{quality.map(row => <article className="p-record" key={row.id}><div className="p-record-head"><strong>{row.type}</strong><Badge>{row.resolved ? 'Resolvido' : 'Em aberto'}</Badge></div><p>{row.evidence}</p><div className="p-detail-grid"><Detail label="Fonte indicada">{row.source}</Detail><Detail label="Data do evento">{date(row.date)}</Detail><Detail label="Estabelecimento">{cnpj(establishmentById.get(row.establishmentId)?.cnpj ?? row.establishmentId)}</Detail><Detail label="Evento">{row.id}</Detail></div></article>)}</Records> : <Empty>Nenhum evento de qualidade registrado para esta empresa. A ausência de eventos não garante completude das fontes.</Empty>}
          </section>
          <section className="p-drawer-section p-provenance"><h3>Procedência dos dados e critérios</h3><div className="p-detail-grid"><Detail label="Cadastro, vínculos e processos">Base interna sintética</Detail><Detail label="Universo público e emprego">Base externa sintética e agregada</Detail><Detail label="Classificação CNAE">Planilha recebida, com rótulo original preservado</Detail><Detail label="GRE e município">Atribuição demonstrativa da amostra</Detail><Detail label="Data de referência">{date(anchor)}</Detail><Detail label="Versão de dados">Amostra normalizada · semente {number(dataset.seed)}</Detail></div><p className="p-drawer-note">CNPJ, estabelecimento, empresa, registro/visto, vínculo profissional, ART, CAO e processo permanecem entidades separadas. Conciliação por raiz ou sugestão não promove associação automática; os registros de origem permanecem consultáveis.</p></section>
        </>}

        <footer className="p-drawer-footer p-drawer-note"><FileText size={13} aria-hidden="true" /> {company.id} · amostra demonstrativa · snapshot {date(anchor)}</footer>
      </div>
    </aside>
  </div>;
}
