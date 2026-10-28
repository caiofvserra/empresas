import { useEffect, useMemo, useState } from 'react';
import { Copy, Filter, Search, X } from 'lucide-react';
import type { Acao, Alvo, StatusMulta } from './fiscalizacao';
import { tipoLabel } from './fiscalizacao';
import { camaraDaEmpresa, segmentos } from './analise';
import type { Ctx, Detail } from './contexto';
import { brl, data, int, money, pct, short } from './ui';

/** Painel lateral: o que o número mede, como usar e a lista para agir (busca, ficha e cópia para planilha). */
interface Row { key: string; companyId?: string; title: string; subtitle: string; value: string; note: string; sortValue: number; companies?: string[] }
interface Content { eyebrow: string; title: string; what: string; use?: string; summary: [string, string][]; rows: Row[]; listTitle: string; greId?: string }

const DAY = 86400000;
const days = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
const statusAuto = (acao: Acao) => acao.auto ? `auto ${acao.auto.status.toLowerCase()}` : acao.regularizedAt ? 'regularizada na notificação' : 'notificada';

export default function Drawer({ ctx, detail, onClose }: { ctx: Ctx; detail: Detail; onClose: () => void }) {
  const content = useMemo(() => build(ctx, detail), [ctx, detail]);
  const [query, setQuery] = useState(''), [open, setOpen] = useState<string | null>(null), [limit, setLimit] = useState(50), [copied, setCopied] = useState('');
  useEffect(() => { setQuery(''); setOpen(null); setLimit(50); setCopied(''); }, [detail]);
  const visible = content.rows.filter(row => !query || `${row.title} ${row.subtitle} ${row.note}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  const copy = async () => {
    const csv = ['Nome;Identificação;Valor;Situação', ...visible.map(row => [row.title, row.subtitle, row.value, row.note].map(value => `"${value.replace(/"/g, '""')}"`).join(';'))].join('\n');
    try { await navigator.clipboard.writeText(csv); setCopied(`${int(visible.length)} linhas copiadas. Cole numa planilha.`); } catch { setCopied('Não foi possível copiar neste navegador.'); }
  };
  return <div className="drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="drawer" role="dialog" aria-modal="true" aria-label={content.title}>
      <header><div><span className="eyebrow">{content.eyebrow}</span><h2>{content.title}</h2></div>
        <div className="drawer-actions">{content.greId && <button className="ghost" onClick={() => { ctx.filterGre(content.greId!); onClose(); }}><Filter size={14} />Filtrar a página</button>}<button className="icon-btn" onClick={onClose} aria-label="Fechar detalhe"><X size={18} /></button></div></header>
      <div className="drawer-body">
        <p className="what">{content.what}</p>
        {content.use && <p className="use"><b>Para agir:</b> {content.use}</p>}
        {content.summary.length > 0 && <dl className="summary">{content.summary.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
        <div className="list-head"><h3>{content.listTitle}<span>{int(content.rows.length)}</span></h3>
          <div className="list-tools"><label className="search"><Search size={14} /><input id="busca-detalhe" placeholder="Buscar nome, CNPJ, município ou situação" value={query} onChange={event => setQuery(event.target.value)} /></label><button className="ghost" onClick={copy} disabled={!visible.length}><Copy size={14} />Copiar lista</button></div>
          {copied && <p className="copied" role="status">{copied}</p>}
        </div>
        <ol className="list">{visible.slice(0, limit).map(row => <li key={row.key} className={open === row.key ? 'is-open' : ''}>
          <button onClick={() => setOpen(previous => previous === row.key ? null : row.key)} aria-expanded={open === row.key}><span className="who"><b>{row.title}</b><small>{row.subtitle}</small></span><span className="amount"><b>{row.value}</b><small>{row.note}</small></span></button>
          {open === row.key && (row.companies ? <ul className="mini-list">{row.companies.map(id => <li key={id}>{companyName(ctx, id)}</li>)}</ul> : row.companyId && <CompanyCard ctx={ctx} companyId={row.companyId} />)}
        </li>)}</ol>
        {visible.length > limit && <button className="ghost more" onClick={() => setLimit(value => value + 100)}>Mostrar mais ({int(visible.length - limit)} restantes)</button>}
        {!visible.length && <p className="empty">Nada nesta seleção.</p>}
      </div>
    </aside>
  </div>;
}

const companyName = (ctx: Ctx, id: string) => { const company = ctx.dataset.companies.find(row => row.id === id); return company ? company.tradeName || company.name : id; };

function CompanyCard({ ctx, companyId }: { ctx: Ctx; companyId: string }) {
  const { dataset, model, f } = ctx;
  const company = dataset.companies.find(row => row.id === companyId);
  const places = dataset.establishments.filter(row => row.companyId === companyId), main = places.find(row => row.branch === 'Matriz') ?? places[0];
  const fact = model.companyFacts.find(row => row.companyId === companyId);
  const active = model.metadata.activeCompanyIds.includes(companyId), ever = dataset.registrations.some(row => row.companyId === companyId);
  const withRt = model.metrics.rtCoverage.companyIds.includes(companyId), rtGap = f.alvos.some(row => row.tipo === 'rt' && !row.regularizedAt && row.companyId === companyId);
  const acoes = f.acoes.filter(row => row.companyId === companyId);
  const contracts = dataset.contracts.filter(row => row.companyId === companyId);
  const city = dataset.cities.find(row => row.id === main?.cityId)?.name ?? '—', gre = short(dataset.gres.find(row => row.id === main?.greId)?.name ?? '—');
  const facts: [string, string][] = [
    ['Razão social', company?.name ?? '—'], ['Porte · câmara', `${company?.size ?? '—'} · ${camaraDaEmpresa(dataset).get(companyId) ?? '—'}`],
    ['Local', `${city} · ${gre}`], ['Situação na Receita', main?.rfbStatus ?? '—'],
    ['Registro no CREA-SP', active ? 'Ativo' : ever ? 'Inativo' : 'Nunca registrada'], ['Responsável técnico', withRt ? 'Identificado' : rtGap ? 'Baixado sem substituto' : active ? 'Sem vínculo no cadastro' : '—'],
    ['ARTs no período', int(fact?.artCount ?? 0)], ['Saldo vencido', money(fact?.overdue ?? 0)],
    ['Contratos públicos', contracts.length ? `${contracts.length} · ${brl(contracts.reduce((sum, row) => sum + row.value, 0))}` : 'Nenhum'],
  ];
  return <div className="company"><dl className="facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {acoes.length > 0 && <><h4>Fiscalização</h4><ul className="timeline">{acoes.map(row => <li key={row.id}><b>{data(row.date)}</b> {tipoLabel[row.tipo]} · {row.origem}{row.auto ? ` · auto ${data(row.auto.date)} (${money(row.auto.valor)}, ${row.auto.status.toLowerCase()})` : ''}{row.regularizedAt ? ` · regularizada em ${data(row.regularizedAt)} (${row.resolucao?.toLowerCase()})` : ' · pendente'}</li>)}</ul></>}
  </div>;
}

function build(ctx: Ctx, detail: Detail): Content {
  const { dataset, resumo, f, greId, janela } = ctx;
  const companies = new Map(dataset.companies.map(row => [row.id, row])), places = new Map(dataset.establishments.map(row => [row.id, row]));
  const cities = new Map(dataset.cities.map(row => [row.id, row.name]));
  const acoesById = new Map(f.acoes.map(row => [row.id, row]));
  const name = (companyId: string) => companies.get(companyId)?.tradeName || companies.get(companyId)?.name || companyId;
  const where = (establishmentId: string) => { const place = places.get(establishmentId); return `${place?.cnpj ?? ''} · ${cities.get(place?.cityId ?? '') ?? '—'}`; };
  const scopeLabel = `${greId ? short(dataset.gres.find(row => row.id === greId)?.name ?? '') : 'Todas as regionais'}${ctx.camara ? ` · ${ctx.camara}` : ''} · ${data(janela.start)} a ${data(janela.end)}`;
  const alvoRow = (alvo: Alvo): Row => { const acao = alvo.acaoId ? acoesById.get(alvo.acaoId) : undefined, age = days(alvo.since, f.anchor);
    return { key: alvo.id, companyId: alvo.companyId, title: name(alvo.companyId), subtitle: where(alvo.establishmentId), value: alvo.regularizedAt ? `regularizado ${data(alvo.regularizedAt)}` : `irregular desde ${alvo.since.slice(5, 7)}/${alvo.since.slice(0, 4)}`, note: `${tipoLabel[alvo.tipo]} · ${acao ? `${acao.origem.toLowerCase()} em ${data(acao.date)}, ${statusAuto(acao)}` : 'sem ação'}`, sortValue: alvo.regularizedAt ? -1 : age }; };
  const acaoRow = (acao: Acao, value: string, sortValue: number): Row => ({ key: acao.id, companyId: acao.companyId, title: name(acao.companyId), subtitle: where(acao.establishmentId), value, note: `${tipoLabel[acao.tipo]} · ${acao.origem} · ${statusAuto(acao)}`, sortValue });
  const sorted = (rows: Row[]) => rows.sort((a, b) => b.sortValue - a.sortValue);

  switch (detail.kind) {
    case 'alvos': {
      const rows = (detail.tipo ? resumo.abertos[detail.tipo] : [...resumo.abertos.registro, ...resumo.abertos.rt, ...resumo.abertos.art]);
      return { eyebrow: scopeLabel, title: detail.tipo ? `Irregularidades em aberto · ${tipoLabel[detail.tipo]}` : 'Irregularidades em aberto', what: 'Irregularidades identificadas e ainda não resolvidas no corte: CNPJ de engenharia ativo na Receita sem registro no CREA-SP; empresa registrada cujo RT deu baixa sem substituto em 30 dias; obra ou serviço público contratado (PNCP) sem ART em 60 dias.',
        use: 'Priorize os que estão há mais tempo sem nenhuma ação e os de contrato público, que têm prova documental.',
        summary: [['Falta de registro', int(resumo.abertos.registro.length)], ['RT baixado', int(resumo.abertos.rt.length)], ['Obra pública sem ART', int(resumo.abertos.art.length)], ['Já com ação fiscal', pct(rows.filter(row => row.acaoId).length / Math.max(1, rows.length) * 100)]],
        rows: rows.map(alvoRow).sort((a, b) => Number(b.note.endsWith('sem ação')) - Number(a.note.endsWith('sem ação')) || b.sortValue - a.sortValue), listTitle: 'Empresas, sem ação fiscal e mais antigas primeiro' };
    }
    case 'acoes': return { eyebrow: scopeLabel, title: 'Ações de fiscalização no período', what: 'Notificações e vistorias a empresas no período, por tipo de irregularidade e origem da informação que levou à ação.', summary: [['Ações', int(resumo.acoes.length)], ['Viraram auto', pct(resumo.acoes.filter(row => row.auto).length / Math.max(1, resumo.acoes.length) * 100)], ['Já regularizadas', pct(resumo.taxa ?? 0)]],
      rows: sorted(resumo.acoes.map(acao => acaoRow(acao, data(acao.date), Date.parse(acao.date)))), listTitle: 'Ações, mais recentes primeiro' };
    case 'autos': case 'mes': {
      const rows = detail.kind === 'mes' ? f.acoes.filter(row => (!greId || row.greId === greId) && row.auto?.date.startsWith(detail.month)) : resumo.autos;
      return { eyebrow: detail.kind === 'mes' ? `${scopeLabel.split(' · ')[0]} · ${detail.month.split('-').reverse().join('/')}` : scopeLabel, title: detail.kind === 'mes' ? 'Autos de infração do mês' : 'Autos de infração no período', what: 'Autos lavrados quando a empresa não regularizou no prazo da notificação. Valor da multa demonstrativo.',
        summary: [['Autos', int(rows.length)], ['Multas aplicadas', brl(rows.reduce((sum, row) => sum + row.auto!.valor, 0))], ['Pagas', pct(rows.filter(row => row.auto!.status === 'Paga').length / Math.max(1, rows.length) * 100)]],
        rows: sorted(rows.map(acao => acaoRow(acao, money(acao.auto!.valor), acao.auto!.valor))), listTitle: 'Autos, maior multa primeiro' };
    }
    case 'multas': {
      const statuses: StatusMulta[] = ['Paga', 'Em prazo de defesa', 'Em julgamento', 'Dívida ativa', 'Cancelada'];
      const rows = detail.status ? resumo.multas[detail.status].acoes : resumo.autos;
      return { eyebrow: scopeLabel, title: detail.status ? `Multas · ${detail.status.toLowerCase()}` : 'Multas dos autos do período', what: 'Para onde foi o valor das multas aplicadas no período: pagas, ainda em prazo de defesa, em julgamento, inscritas em dívida ativa ou canceladas.', use: 'Multas em dívida ativa exigem cobrança judicial; em julgamento, acompanhar prazos das câmaras.',
        summary: statuses.map(status => [status, brl(resumo.multas[status].valor)] as [string, string]), rows: sorted(rows.map(acao => acaoRow(acao, money(acao.auto!.valor), acao.auto!.valor))), listTitle: 'Autos, maior multa primeiro' };
    }
    case 'regularizacoes': return { eyebrow: scopeLabel, title: 'Regularizações após ação', what: 'Empresas que resolveram a irregularidade depois de uma ação do CREA-SP no período: obtiveram registro, indicaram RT, recolheram ART ou deram baixa do registro.', summary: [['Regularizações', int(resumo.regularizacoes.length)], ['Mediana', resumo.medianaDias === null ? '—' : `${int(resumo.medianaDias)} dias`], ['Com auto antes', pct(resumo.regularizacoes.filter(row => row.auto).length / Math.max(1, resumo.regularizacoes.length) * 100)]],
      rows: sorted(resumo.regularizacoes.map(acao => ({ ...acaoRow(acao, `${int(days(acao.date, acao.regularizedAt!))} dias`, days(acao.date, acao.regularizedAt!)), note: `${acao.resolucao ?? ''} · ${tipoLabel[acao.tipo]} · ${acao.auto ? 'após auto' : 'na notificação'}` }))), listTitle: 'Regularizações, mais demoradas primeiro' };
    case 'situacao': {
      const item = resumo.situacao.find(row => row.tipo === detail.tipo)!;
      return { eyebrow: scopeLabel, title: `${tipoLabel[detail.tipo]} · ${detail.segmento.toLowerCase()}`, what: 'Irregularidades em aberto no corte e as regularizadas no período após ação fiscal, conforme o ponto do processo em que estão.', summary: segmentos.map(segment => [segment, int(item.partes[segment].length)] as [string, string]),
        rows: sorted(item.partes[detail.segmento].map(alvoRow)), listTitle: 'Empresas, mais antigas primeiro' };
    }
    case 'origem': {
      const rows = f.acoes.filter(row => (!greId || row.greId === greId) && row.origem === detail.origem && row.date >= `${janela.months[0]}-01`);
      const curve = resumo.curvas.find(row => row.origem === detail.origem);
      return { eyebrow: `${scopeLabel.split(' · ')[0]} · últimos 24 meses`, title: `Ações com origem em ${detail.origem.toLowerCase()}`, what: 'De onde veio a informação que levou à ação, e se a empresa se regularizou depois.', use: 'Origens com regularização mais alta e rápida merecem mais investimento (equipe, convênios de dados).',
        summary: [['Ações', int(rows.length)], ['Regularizadas', pct(rows.filter(row => row.regularizedAt).length / Math.max(1, rows.length) * 100)], ['Mediana', curve?.mediana == null ? '—' : `${int(curve.mediana)} dias`]],
        rows: rows.map(acao => acaoRow(acao, acao.regularizedAt ? `${int(days(acao.date, acao.regularizedAt))} dias` : 'pendente', acao.regularizedAt ? days(acao.date, acao.regularizedAt) : Infinity)).sort((a, b) => b.sortValue - a.sortValue), listTitle: 'Ações, pendentes primeiro' };
    }
    case 'gre': {
      const gre = ctx.regionais.find(row => row.id === detail.id)!;
      const rows = f.alvos.filter(row => row.greId === detail.id && !row.regularizedAt);
      return { eyebrow: `Regional · ${data(janela.start)} a ${data(janela.end)}`, title: gre.name, greId: detail.id, what: 'Resumo da regional: problema (empresas sem registro), resposta (ações e autos) e resultado (regularizações), com o mercado de engenharia medido pela RAIS/CAGED.',
        summary: [['CNPJs sem registro', `${int(gre.semRegistro)} · ${gre.pctSemRegistro === null ? '—' : pct(gre.pctSemRegistro)}`], ['Ações no período', `${int(gre.acoes)} · ${gre.acoesPor100 === null ? '—' : int(gre.acoesPor100)}/100 irregulares`], ['Autos · multas', `${int(gre.autos)} · ${brl(gre.aplicada)}`], ['Regularizadas', gre.taxa === null ? '—' : pct(gre.taxa)], ['Empregos técnicos (RAIS)', `${int(gre.empregoTecnico)} · ${gre.empregoAnterior ? `${gre.empregoTecnico >= gre.empregoAnterior ? '+' : ''}${pct((gre.empregoTecnico / gre.empregoAnterior - 1) * 100, 1)} em 12 meses` : ''}`], ['Empresas ativas', int(gre.ativas)]],
        rows: sorted(rows.map(alvoRow)), listTitle: 'Irregularidades em aberto na regional' };
    }
    case 'empresas': {
      const facts = new Map(ctx.model.companyFacts.map(row => [row.companyId, row]));
      return { eyebrow: detail.eyebrow ?? scopeLabel, title: detail.title, what: detail.what, use: detail.use, summary: [],
        rows: sorted(detail.ids.map(id => { const fact = facts.get(id), main = dataset.establishments.find(row => row.companyId === id && row.branch === 'Matriz') ?? dataset.establishments.find(row => row.companyId === id);
          return { key: id, companyId: id, title: name(id), subtitle: `${companies.get(id)?.rootCnpj ?? ''} · ${cities.get(main?.cityId ?? '') ?? '—'}`, value: (fact?.overdue ?? 0) > 0 ? `deve ${money(fact!.overdue)}` : 'em dia', note: `${companies.get(id)?.size ?? ''} · ${camaraDaEmpresa(dataset).get(id) ?? ''}`, sortValue: fact?.overdue ?? 0 }; })), listTitle: 'Empresas, maior saldo vencido primeiro' };
    }
    case 'cnpjs': {
      const anchorOpened = (id: string) => places.get(id)?.openedAt ?? '';
      const alvoBy = new Map(f.alvos.filter(row => row.tipo === 'registro' && !row.regularizedAt).map(row => [row.establishmentId, row]));
      return { eyebrow: detail.eyebrow ?? scopeLabel, title: detail.title, what: detail.what, use: detail.use, summary: [],
        rows: sorted(detail.ids.map(id => { const place = places.get(id), alvo = alvoBy.get(id), acao = alvo?.acaoId ? acoesById.get(alvo.acaoId) : undefined;
          return { key: id, companyId: place?.companyId, title: name(place?.companyId ?? ''), subtitle: where(id), value: `aberta ${data(anchorOpened(id))}`, note: `${place?.cnaeMain ?? ''} · ${acao ? `${statusAuto(acao)} em ${data(acao.date)}` : alvo ? 'sem ação' : 'registro ativo'}`, sortValue: Date.parse(anchorOpened(id)) }; })), listTitle: 'CNPJs, abertura mais recente primeiro' };
    }
    case 'linhas': return { eyebrow: detail.eyebrow ?? scopeLabel, title: detail.title, what: detail.what, use: detail.use, summary: detail.summary ?? [], rows: [...detail.rows].sort((a, b) => b.sortValue - a.sortValue), listTitle: detail.listTitle };
    case 'profissionais': {
      const anchor = f.anchor, active = new Set(ctx.model.metadata.activeCompanyIds);
      const links = dataset.technicalLinks.filter(row => active.has(row.companyId) && row.startDate <= anchor && (!row.endDate || row.endDate > anchor));
      return { eyebrow: scopeLabel, title: `Profissionais responsáveis por ${detail.empresas === 5 ? '5 ou mais' : detail.empresas} empresa${detail.empresas > 1 ? 's' : ''}`, what: 'Responsáveis técnicos com vínculo ativo em várias empresas ao mesmo tempo.', use: 'Acima de 3 empresas, verificar compatibilidade de jornada, atribuições e limites normativos antes de manter o vínculo.', summary: [],
        rows: detail.ids.map(id => { const professional = dataset.professionals.find(row => row.id === id), mine = [...new Set(links.filter(row => row.professionalId === id).map(row => row.companyId))];
          return { key: id, title: professional?.name ?? id, subtitle: `${professional?.registration ?? ''} · ${professional?.modality ?? ''}`, value: `${mine.length} empresas`, note: mine.slice(0, 3).map(name).join(', ') + (mine.length > 3 ? '…' : ''), sortValue: mine.length, companies: mine }; }).sort((a, b) => b.sortValue - a.sortValue), listTitle: 'Profissionais' };
    }
  }
}
