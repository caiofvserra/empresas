import { useEffect, useMemo, useState } from 'react';
import { Copy, Search, X } from 'lucide-react';
import type { Scope } from '../domain/engine';
import type { Establishment } from '../domain/types';
import type { EnterpriseModel } from '../enterprise-v10/types';
import { actionList, brl, caseStages, debtAging, gapByCnae, money } from './metrics';
import type { ActionRow, AreaRow, IndicatorId, PanelData } from './metrics';
import { Chart } from './chart';
import type { Tokens } from './chart';
import { info, monthLabel, pct, short } from './definitions';

/** Painel lateral: definição, uso, distribuição e lista de empresas para agir. */
export interface Detail { id: IndicatorId; area?: { level: 'gre' | 'city'; id: string; name: string } }
export default function DetailPanel({ detail, scope, model, history, data, tokens, onClose }: { detail: Detail; scope: Scope; model: EnterpriseModel; history: EnterpriseModel; data: PanelData; tokens: Tokens; onClose: () => void }) {
  const meta = info[detail.id];
  const [query, setQuery] = useState(''), [open, setOpen] = useState<string | null>(null), [limit, setLimit] = useState(40), [copied, setCopied] = useState('');
  const filter = useMemo(() => detail.area ? (row: Establishment) => detail.area!.level === 'gre' ? row.greId === detail.area!.id : row.cityId === detail.area!.id : undefined, [detail]);
  const list = useMemo(() => actionList(detail.id, scope, model, filter), [detail, scope, model]); // eslint-disable-line react-hooks/exhaustive-deps
  const visible = list.filter(row => !query || `${row.name} ${row.cnpj} ${row.city}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  useEffect(() => { setOpen(null); setLimit(40); setQuery(''); }, [detail]);
  const copy = async () => {
    const csv = ['Empresa;CNPJ;Município;GRE;Valor;Observação', ...visible.map(row => [row.name, row.cnpj, row.city, row.gre, row.valueLabel, row.note].map(value => `"${String(value).replace(/"/g, '""')}"`).join(';'))].join('\n');
    try { await navigator.clipboard.writeText(csv); setCopied(`${visible.length} linhas copiadas. Cole numa planilha.`); } catch { setCopied('Não foi possível copiar neste navegador.'); }
  };
  const area = detail.area ? (detail.area.level === 'gre' ? data.areas : data.cities).find(row => row.id === detail.area!.id) : data.total;
  return <div className="drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="drawer" role="dialog" aria-modal="true" aria-label={meta.label}>
      <header><div><span className="eyebrow">{detail.area ? `${detail.area.level === 'gre' ? 'Regional' : 'Município'} · ${detail.area.name}` : 'Todo o recorte'}</span><h2>{meta.label}</h2></div><button className="icon" onClick={onClose} aria-label="Fechar detalhe"><X size={18} /></button></header>
      <div className="drawer-body">
        <p className="what">{meta.what}</p>
        <p className="todo"><b>Uso:</b> {meta.action}</p>
        {area && <AreaSummary id={detail.id} row={area} />}
        <div className="mini"><DetailChart id={detail.id} scope={scope} model={model} history={history} data={data} tokens={tokens} filter={filter} /></div>
        <div className="list-head"><h3>{meta.list}<span>{list.length.toLocaleString('pt-BR')}</span></h3>
          <div className="list-tools"><label className="search"><Search size={14} /><input id="busca-lista" placeholder="Buscar empresa, CNPJ ou município" value={query} onChange={event => setQuery(event.target.value)} /></label><button className="ghost" onClick={copy} disabled={!visible.length}><Copy size={14} />Copiar lista</button></div>
          {copied && <p className="copied" role="status">{copied}</p>}
        </div>
        <ol className="list">{visible.slice(0, limit).map(row => <li key={`${row.companyId}-${row.cnpj}`} className={open === row.cnpj ? 'is-open' : ''}>
          <button onClick={() => setOpen(previous => previous === row.cnpj ? null : row.cnpj)} aria-expanded={open === row.cnpj}><span className="who"><b>{row.name}</b><small>{row.cnpj} · {row.city}</small></span><span className="amount"><b>{row.valueLabel}</b><small>{row.note}</small></span></button>
          {open === row.cnpj && <CompanyFacts row={row} scope={scope} model={model} />}
        </li>)}</ol>
        {visible.length > limit && <button className="ghost more" onClick={() => setLimit(value => value + 60)}>Mostrar mais ({(visible.length - limit).toLocaleString('pt-BR')} restantes)</button>}
        {!visible.length && <p className="empty">Nenhuma empresa nesta seleção.</p>}
      </div>
    </aside>
  </div>;
}

function AreaSummary({ id, row }: { id: IndicatorId; row: AreaRow }) {
  const facts: [string, string][] = id === 'base' ? [['Ativas', row.active.toLocaleString('pt-BR')], ['Variação', row.growth === null ? '—' : `${row.growth >= 0 ? '+' : ''}${pct(row.growth)}`]]
    : id === 'receipts' ? [['Recebido', money(row.receipts)], ['Ano anterior', row.receiptsPrevious === null ? '—' : money(row.receiptsPrevious)]]
    : id === 'debt' ? [['Saldo vencido', money(row.overdue)], ['Empresas em atraso', `${row.debtors.toLocaleString('pt-BR')} de ${row.charged.toLocaleString('pt-BR')}`]]
    : id === 'gap' ? [['CNPJs sem registro', row.gap.toLocaleString('pt-BR')], ['Empresas ativas', row.active.toLocaleString('pt-BR')]]
    : id === 'noRt' ? [['Sem RT', row.noRt.toLocaleString('pt-BR')], ['% das ativas', row.noRtRate === null ? '—' : pct(row.noRtRate)]]
    : [['Em aberto', row.openCases.toLocaleString('pt-BR')], ['Há mais de 1 ano', row.oldCases.toLocaleString('pt-BR')]];
  return <dl className="summary">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function DetailChart({ id, scope, model, history, data, tokens, filter }: { id: IndicatorId; scope: Scope; model: EnterpriseModel; history: EnterpriseModel; data: PanelData; tokens: Tokens; filter?: (row: Establishment) => boolean }) {
  const option = useMemo(() => {
    const bars = (rows: { name: string; value: number }[], format: (value: number) => string, color: string, title: string) => ({
      title: { text: title, left: 0, top: 0, textStyle: { color: tokens.ink, fontSize: 12, fontWeight: 700, fontFamily: 'Lato, sans-serif' } },
      grid: { top: 26, right: 64, bottom: 2, left: 2, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `${items[0].name}<br/><b>${format(items[0].value)}</b>` },
      xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.name), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11, width: 170, overflow: 'truncate' } },
      series: [{ type: 'bar', barWidth: 12, data: rows.map(row => row.value), itemStyle: { color, borderRadius: 6 }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, formatter: (item: any) => format(item.value) }, showBackground: true, backgroundStyle: { color: tokens.soft, borderRadius: 6 } }],
    });
    if (id === 'base') return {
      title: { text: 'Empresas ativas · 24 meses', left: 0, top: 0, textStyle: { color: tokens.ink, fontSize: 12, fontWeight: 700, fontFamily: 'Lato, sans-serif' } },
      grid: { top: 30, right: 8, bottom: 2, left: 2, containLabel: true }, tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: history.monthly.map(row => `${monthLabel(row.month)}/${row.month.slice(2, 4)}`), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, interval: 5 } },
      yAxis: { type: 'value', scale: true, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
      series: [{ type: 'line', name: 'Empresas ativas', data: history.monthly.map(row => row.base), smooth: 0.3, showSymbol: false, lineStyle: { color: tokens.brand, width: 2.5 }, areaStyle: { color: tokens.soft } }],
    };
    if (id === 'receipts') return bars(data.areas.filter(row => row.receipts > 0).sort((a, b) => b.receipts - a.receipts).slice(0, 8).map(row => ({ name: short(row.name), value: row.receipts })), brl, tokens.accent, 'Arrecadação por regional');
    if (id === 'debt') return bars(debtAging(scope, filter), brl, tokens.bad, 'Saldo vencido por tempo de atraso');
    if (id === 'gap') return bars(gapByCnae(scope, model, filter), value => value.toLocaleString('pt-BR'), tokens.blue, 'CNPJs sem registro por atividade (CNAE principal)');
    if (id === 'noRt') return bars(data.areas.filter(row => row.noRtRate !== null).sort((a, b) => (b.noRtRate ?? 0) - (a.noRtRate ?? 0)).slice(0, 8).map(row => ({ name: short(row.name), value: row.noRtRate ?? 0 })), value => pct(value, 0), tokens.bad, '% de empresas ativas sem RT, por regional');
    return bars(caseStages(scope, filter).map(row => ({ name: `${row.name}${row.age === null ? '' : ` · ${Math.round(row.age)} d`}`, value: row.value })), value => value.toLocaleString('pt-BR'), tokens.blue, 'Casos abertos por etapa · idade mediana');
  }, [id, scope, model, history, data, tokens, filter]);
  return <Chart option={option} tokens={tokens} label="Gráfico de detalhe" />;
}

function CompanyFacts({ row, scope, model }: { row: ActionRow; scope: Scope; model: EnterpriseModel }) {
  const fact = model.companyFacts.find(item => item.companyId === row.companyId), company = scope.companies.find(item => item.id === row.companyId);
  const cases = scope.cases.filter(item => item.companyId === row.companyId), units = scope.establishments.filter(item => item.companyId === row.companyId);
  const facts: [string, string][] = [
    ['Razão social', company?.name ?? '—'], ['Porte', company?.size ?? '—'], ['Regional', row.gre], ['Estabelecimentos', String(units.length)],
    ['Registro da empresa (qualquer estabelecimento)', fact?.active ? 'Ativo' : 'Sem registro ativo'], ['Responsável técnico', fact?.withRt ? 'Identificado' : 'Não identificado'],
    ['ARTs no período', String(fact?.artCount ?? 0)], ['Saldo vencido', money(fact?.overdue ?? 0)], ['Pago no período', money(fact?.receipts ?? 0)],
    ['Fiscalizações', cases.length ? cases.map(item => item.status).join(', ') : 'Nenhuma'],
  ];
  return <dl className="facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
