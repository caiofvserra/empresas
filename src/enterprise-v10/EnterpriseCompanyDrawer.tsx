import { useEffect, useMemo, useRef } from 'react';
import { Building2, FileCheck2, Fingerprint, Landmark, LockKeyhole, ShieldCheck, UsersRound, Wallet, X } from 'lucide-react';
import type { Scope } from '../domain/engine';
import { isActiveLink } from '../domain/engine';
import { digitalRegistrationActive } from '../domain/digital-inspection';
import type { EnterpriseModel } from './types';

interface Props { companyId: string; scope: Scope; model: EnterpriseModel; financialAllowed: boolean; onClose: () => void }
const number = (value: number) => value.toLocaleString('pt-BR');
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = (value?: string) => value ? value.slice(0, 10).split('-').reverse().join('/') : 'Não informada';

export default function EnterpriseCompanyDrawer({ companyId, scope, model, financialAllowed, onClose }: Props) {
  const panel = useRef<HTMLElement>(null), close = useRef(onClose); close.current = onClose;
  const company = scope.dataset.companies.find(row => row.id === companyId);
  const details = useMemo(() => ({
    fact: model.companyFacts.find(row => row.companyId === companyId),
    establishments: scope.establishments.filter(row => row.companyId === companyId),
    registrations: scope.registrations.filter(row => row.companyId === companyId),
    links: scope.technicalLinks.filter(row => row.companyId === companyId),
    arts: scope.arts.filter(row => row.companyId === companyId),
    caos: scope.caos.filter(row => row.companyId === companyId),
    contracts: model.contracts.filter(row => row.contract.companyId === companyId),
    quality: scope.qualityEvents.filter(row => row.companyId === companyId),
  }), [companyId, scope, model]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null, oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; panel.current?.querySelector<HTMLButtonElement>('[data-close]')?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close.current(); return; }
      if (event.key !== 'Tab') return;
      const controls = [...(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]') ?? [])].filter(element => element.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('keydown', key, true); document.body.style.overflow = oldOverflow; if (previous?.isConnected) previous.focus(); };
  }, []);
  if (!company) return null;
  const cities = new Map(scope.dataset.cities.map(row => [row.id, row.name])), gres = new Map(scope.dataset.gres.map(row => [row.id, row.name]));
  const professionals = new Map(scope.dataset.professionals.map(row => [row.id, row]));
  const { fact } = details;
  return <div className="e10-company-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <aside ref={panel} className="e10-company-drawer" role="dialog" aria-modal="true" aria-label="Ficha empresarial">
      <header className="e10-drawer-head"><div><span className="e10-eyebrow">EMPRESA · DADOS DEMONSTRATIVOS</span><h2>{company.name}</h2><p>Raiz CNPJ {company.rootCnpj} · corte {date(model.metadata.end)}</p></div><button className="e10-iconbutton" data-close aria-label="Fechar ficha empresarial" onClick={onClose}><X size={20}/></button></header>
      <div className="e10-drawer-body">
        <section className="e10-detail-section"><h3><Building2 size={17}/> Identificação e presença</h3>
          <dl className="e10-detail-grid"><div><dt>Nome fantasia</dt><dd>{company.tradeName}</dd></div><div><dt>Porte / natureza jurídica</dt><dd>{company.size} · {company.legalNature}</dd></div><div><dt>Cadastro no corte</dt><dd>{fact ? fact.active ? 'Ao menos um registro vigente identificado' : 'Sem registro vigente identificado' : 'Sem fato analítico disponível'}</dd></div><div><dt>Unidades de contagem</dt><dd>1 empresa-raiz · {number(details.establishments.length)} estabelecimentos visíveis neste recorte</dd></div></dl>
          <div className="e10-detail-scroll"><table className="e10-mini-table"><thead><tr><th>CNPJ / unidade</th><th>Município / GRE</th><th>CNAEs / Receita</th></tr></thead><tbody>{details.establishments.map(row => <tr key={row.id}><td>{row.cnpj}<small>{row.branch} · abertura {date(row.openedAt)}</small></td><td>{cities.get(row.cityId) ?? row.cityId}<small>{gres.get(row.greId) ?? row.greId}</small></td><td>{row.cnaeMain}<small>Secundários: {row.cnaeSecondary.join(' · ') || 'Nenhum informado'} · RFB {row.rfbStatus}</small></td></tr>)}</tbody></table></div>
          {!!details.registrations.length && <div className="e10-detail-scroll"><table className="e10-mini-table"><thead><tr><th>Registro / estabelecimento</th><th>Histórico / vigência no corte</th></tr></thead><tbody>{details.registrations.map(row => <tr key={row.id}><td>{row.id}<small>{row.type} · {row.establishmentId}</small></td><td>{digitalRegistrationActive(row, scope.dataset, model.metadata.end) ? 'Vigente no corte' : 'Sem vigência no corte'}<small>Início {date(row.startedAt)} · encerramento cadastrado {row.ceasedAt ? date(row.ceasedAt) : 'não informado'}</small></td></tr>)}</tbody></table></div>}
          <p className="e10-detail-note">O quadro mantém os estabelecimentos e a janela do filtro. Correspondência por raiz não estende automaticamente o registro de uma matriz às filiais.</p>
        </section>
        <section className="e10-detail-section"><h3><UsersRound size={17}/> Vínculos técnicos identificados</h3>
          <dl className="e10-detail-grid"><div><dt>RT vigente no corte</dt><dd>{fact?.withRt ? 'Identificado' : 'Não identificado nesta fonte'}</dd></div><div><dt>Continuidade na janela</dt><dd>{fact && fact.registeredDays ? `${number(fact.coveredDays)} de ${number(fact.registeredDays)} dias-empresa registrados com cobertura RT` : 'Sem dias registrados no universo desta medida'}</dd></div></dl>
          {details.links.length ? <div className="e10-detail-scroll"><table className="e10-mini-table"><thead><tr><th>Profissional vinculado / modalidade</th><th>Vínculo / período</th></tr></thead><tbody>{details.links.map(row => <tr key={row.id}><td>{professionals.get(row.professionalId)?.name ?? row.professionalId}<small>{row.modality} · registro {professionals.get(row.professionalId)?.registration ?? 'não informado'}</small></td><td>{isActiveLink(row, model.metadata.end) ? 'Vigente' : 'Encerrado'}<small>{row.id} · {date(row.startDate)} a {row.endDate ? date(row.endDate) : 'sem encerramento informado'}</small></td></tr>)}</tbody></table></div> : <p>Nenhum vínculo técnico identificado neste recorte.</p>}
          <p className="e10-detail-note">O vínculo é apresentado porque referencia esta empresa. O escopo empresa/estabelecimento e a modalidade exigem homologação na fonte real; ausência na base não comprova infração.</p>
        </section>
        <section className="e10-detail-section"><h3><FileCheck2 size={17}/> ARTs empresariais e acervo operacional</h3>
          <p>{number(details.arts.length)} ARTs da empresa na janela de {date(model.metadata.start)} a {date(model.metadata.end)}. Contagem documental observada, sem inferir faturamento, emprego ou conclusão da obra.</p>
          {details.arts.length > 0 && <div className="e10-detail-scroll"><table className="e10-mini-table"><thead><tr><th>ART / registro</th><th>Data / atividade</th></tr></thead><tbody>{details.arts.map(row => <tr key={row.id}><td>{row.id}<small>{row.registrationId} · {row.status}</small></td><td>{date(row.date)} · {row.modality}<small>{row.description}</small></td></tr>)}</tbody></table></div>}
          {details.caos.length ? <div className="e10-detail-scroll"><table className="e10-mini-table"><thead><tr><th>CAO / situação</th><th>Solicitação / emissão / ARTs relacionadas</th></tr></thead><tbody>{details.caos.map(row => <tr key={row.id}><td>{row.id}<small>{row.status} · {row.activity}</small></td><td>{date(row.requestedAt)} / {date(row.issuedAt)}<small>{row.artIds.join(' · ')}</small></td></tr>)}</tbody></table></div> : <p className="e10-detail-note">Nenhuma CAO identificada até o corte. CAO é acervo operacional da pessoa jurídica; CAT tem outro grão, profissional.</p>}
        </section>
        <section className="e10-detail-section"><h3><Landmark size={17}/> Contratações e ponte documental</h3>
          {details.contracts.length ? <div className="e10-detail-scroll"><table className="e10-mini-table"><thead><tr><th>Contrato / publicação</th><th>Objeto / evidência</th></tr></thead><tbody>{details.contracts.map(row => <tr key={row.contract.id}><td>{row.contract.id}<small>{date(row.contract.date)} · {money(row.contract.value)}</small></td><td>{row.contract.object}<small>{row.classification} · {row.exactActiveAtPublication ? 'CNPJ com registro vigente na publicação' : 'Vigência exata não identificada na publicação'}</small><small>{row.artIds.length ? `Ponte documental explícita: ${row.artIds.join(' · ')}` : 'Ponte contrato–ART não informada na fonte; isso não demonstra ausência de ART.'}</small></td></tr>)}</tbody></table></div> : <p>Nenhuma contratação identificada nesta janela.</p>}
          <p className="e10-detail-note">Publicação e execução são datas diferentes. O valor contratado pertence ao mercado fornecedor, não à receita do conselho. A classificação de objetos é demonstrativa e requer validação humana.</p>
        </section>
        <section className="e10-detail-section"><h3><ShieldCheck size={17}/> Evidências de cruzamento</h3>
          <p>{fact?.evidenceIds.length ? `Referências verificáveis desta empresa: ${fact.evidenceIds.join(' · ')}.` : 'Nenhuma combinação de evidências selecionada para esta empresa na fonte demonstrativa.'}</p>
          <p className="e10-detail-note">São sinais de verificação baseados nas chaves cadastrais, vigências e documentos disponíveis. CNAE, crescimento de emprego e ausência de correspondência não determinam automaticamente obrigação de registro ou irregularidade. Emprego público permanece agregado por município/CNAE e não é atribuído a este CNPJ.</p>
        </section>
        <section className="e10-detail-section"><h3><Wallet size={17}/> Recursos empresariais</h3>
          {financialAllowed ? <dl className="e10-detail-grid"><div><dt>Recebido PJ na janela</dt><dd>{fact ? money(fact.receipts) : 'Sem fato analítico'}</dd></div><div><dt>Saldo vencido no corte</dt><dd>{fact ? money(fact.overdue) : 'Sem fato analítico'}</dd></div></dl> : <p className="e10-restricted"><LockKeyhole size={16}/> Informação financeira restrita ao perfil Administração.</p>}
          <p className="e10-detail-note">Pagamentos usam a data de recebimento; dívida é estoque no corte. Os dois valores não devem ser somados. O perfil é demonstrativo; permissões reais dependem de RLS/OLS no ambiente institucional.</p>
        </section>
        <section className="e10-detail-section"><h3><Fingerprint size={17}/> Origem, qualidade e limites</h3>
          <dl className="e10-detail-grid"><div><dt>Natureza / competência</dt><dd>Demonstração relacional · {date(model.metadata.end)}</dd></div><div><dt>Fontes de produção previstas</dt><dd>SQL Server / Db2 via gateway e fontes externas homologadas. Conexões não configuradas.</dd></div></dl>
          {details.quality.length ? <ul>{details.quality.map(row => <li key={row.id}>{row.type} · {date(row.date)} · {row.resolved ? 'resolvido na demonstração' : 'requer validação'}<small>{row.id} · {row.source} · {row.evidence}</small></li>)}</ul> : <p>Nenhum evento de qualidade registrado para esta empresa no recorte; isso não certifica a integridade de todas as fontes.</p>}
        </section>
      </div>
    </aside>
  </div>;
}
