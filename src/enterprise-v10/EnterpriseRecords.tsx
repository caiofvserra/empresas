import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpDown, ArrowUpRight, ChevronLeft, ChevronRight, Columns3, Search, X } from 'lucide-react';
import type { Scope } from '../domain/engine';
import { downloadCsv } from './download';
import type { EnterpriseModel } from './types';
import { enterpriseRecords, exportEnterpriseCsv, normalizedCnpj, normalizedText } from './export';

interface Props {
  scope: Scope; model: EnterpriseModel; financialAllowed: boolean; canExport: boolean;
  onCompany: (id: string) => void; onSelect: (ids: string[], label: string) => void;
}
type SortKey = 'name' | 'artCount' | 'overdue';
const count = (value: number) => value.toLocaleString('pt-BR');
const money = (value: number | null) => value === null ? 'Sem dado' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function EnterpriseRecords({ scope, model, financialAllowed, canExport, onCompany, onSelect }: Props) {
  const [query, setQuery] = useState(''), [page, setPage] = useState(1), [selection, setSelection] = useState<string[]>([]);
  const [sort, setSort] = useState<{ key: SortKey; direction: 1 | -1 }>({ key: 'name', direction: 1 });
  const [columnPicker, setColumnPicker] = useState(false), [columns, setColumns] = useState(['territory', 'status', 'activity', 'finance']);
  const rows = useMemo(() => enterpriseRecords(scope, model), [scope, model]);
  const filtered = useMemo(() => {
    const text = normalizedText(query.trim()), cnpj = normalizedCnpj(query.trim());
    return rows.filter(row => !text || normalizedText(`${row.name} ${row.tradeName} ${row.cities.join(' ')} ${row.cnaes.join(' ')}`).includes(text)
      || !!cnpj && (normalizedCnpj(row.rootCnpj).includes(cnpj) || row.cnpjs.some(value => normalizedCnpj(value).includes(cnpj))))
      .sort((a, b) => {
        const left = a[sort.key], right = b[sort.key];
        return (typeof left === 'number' && typeof right === 'number' ? left - right : String(left ?? '').localeCompare(String(right ?? ''), 'pt-BR')) * sort.direction || a.id.localeCompare(b.id);
      });
  }, [rows, query, sort]);
  useEffect(() => { setPage(1); setSelection([]); }, [scope, query]);
  const pageSize = 10, pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const selected = new Set(selection);
  const order = (key: SortKey) => { setSort(previous => ({ key, direction: previous.key === key ? previous.direction === 1 ? -1 : 1 : 1 })); setPage(1); };
  const toggle = (id: string) => setSelection(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);
  const exportRows = () => {
    const ids = filtered.filter(row => !selection.length || selected.has(row.id)).map(row => row.id);
    downloadCsv(exportEnterpriseCsv(scope, model, { financial: financialAllowed, export: canExport }, ids), 'crea-sp-empresas-do-recorte.csv');
  };
  return <section className="e10-records" id="enterprise-records">
    <div className="e10-table-tools"><div><h3>Empresas do recorte <span className="e10-record-count">{count(filtered.length)}</span></h3><p>Uma linha por raiz de CNPJ. Indicadores de estabelecimentos ou contratos possuem outra unidade de contagem.</p></div>
      <div className="e10-records-actions"><label className="e10-records-search"><Search size={15}/><input aria-label="Pesquisar empresas do recorte" placeholder="Razão social ou CNPJ" value={query} onChange={event => setQuery(event.target.value)}/>{query && <button aria-label="Limpar pesquisa de empresas" onClick={() => setQuery('')}><X size={14}/></button>}</label>
        <button className="e10-iconbutton" aria-label="Selecionar colunas das empresas" aria-expanded={columnPicker} onClick={() => setColumnPicker(value => !value)}><Columns3 size={17}/></button>
        <button className="e10-iconbutton" aria-label="Exportar empresas da tabela CSV" disabled={!canExport} onClick={exportRows}><ArrowDownToLine size={17}/></button>
      </div>
    </div>
    {columnPicker && <div className="e10-column-picker">{[['territory', 'Território e CNAE'], ['status', 'Cadastro e RT'], ['activity', 'ARTs empresariais'], ...(financialAllowed ? [['finance', 'Recebimentos e vencidos']] : [])].map(([id, label]) => <label key={id}><input type="checkbox" checked={columns.includes(id)} onChange={() => setColumns(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id])}/>{label}</label>)}</div>}
    {!!selection.length && <div className="e10-selection-strip"><span>{count(selection.length)} empresas selecionadas</span><button className="e10-secondary" onClick={() => onSelect(filtered.filter(row => selected.has(row.id)).map(row => row.id), 'Seleção de empresas na tabela')}>Analisar seleção <ArrowUpRight size={13}/></button><button onClick={() => setSelection([])}>Limpar seleção</button></div>}
    <div className="e10-table-scroll"><table className="e10-table"><thead><tr>
      <th><input aria-label="Selecionar empresas desta página" type="checkbox" checked={visible.length > 0 && visible.every(row => selected.has(row.id))} onChange={event => setSelection(previous => event.target.checked ? [...new Set([...previous, ...visible.map(row => row.id)])] : previous.filter(id => !visible.some(row => row.id === id)))}/></th>
      <th><button aria-label="Ordenar empresas por nome" onClick={() => order('name')}>Empresa / CNPJ <ArrowUpDown size={12}/></button></th>
      {columns.includes('territory') && <th>Território / CNAE</th>}{columns.includes('status') && <th>Cadastro / RT</th>}
      {columns.includes('activity') && <th><button aria-label="Ordenar empresas por ARTs" onClick={() => order('artCount')}>ARTs <ArrowUpDown size={12}/></button></th>}
      {columns.includes('finance') && financialAllowed && <th><button aria-label="Ordenar empresas por valor vencido" onClick={() => order('overdue')}>Recebido / vencido <ArrowUpDown size={12}/></button></th>}<th>Detalhe</th>
    </tr></thead><tbody>{visible.map(row => <tr key={row.id} data-company-id={row.id}>
      <td><input aria-label={`Selecionar empresa ${row.name}`} type="checkbox" checked={selected.has(row.id)} onChange={() => toggle(row.id)}/></td>
      <td><button className="e10-company-link" onClick={() => onCompany(row.id)}>{row.name}</button><small>Raiz {row.rootCnpj} · {row.size}</small><small>{row.cnpjs.join(' · ') || 'CNPJ não informado no recorte'}</small></td>
      {columns.includes('territory') && <td>{row.cities.join(' · ')}<small>{row.cnaes.join(' · ')}</small></td>}
      {columns.includes('status') && <td>{row.active === null ? 'Sem informação' : row.active ? 'Registro vigente' : 'Sem vigência identificada'}<small>{row.withRt === null ? 'RT sem informação' : row.withRt ? 'RT vigente identificado' : 'Sem RT vigente identificado'}</small></td>}
      {columns.includes('activity') && <td>{row.artCount === null ? 'Sem dado' : count(row.artCount)}<small>Eventos na janela</small></td>}
      {columns.includes('finance') && financialAllowed && <td>{money(row.receipts)}<small>Vencido: {money(row.overdue)}</small></td>}
      <td><button className="e10-iconbutton" aria-label={`Abrir ficha de ${row.name}`} onClick={() => onCompany(row.id)}><ArrowUpRight size={16}/></button></td>
    </tr>)}</tbody></table>
    {!filtered.length && <div className="e10-records-empty"><Search size={25}/><h3>Nenhuma empresa neste recorte</h3><p>A pesquisa atua apenas sobre as empresas do subconjunto atual.</p>{query && <button className="e10-secondary" onClick={() => setQuery('')}>Limpar pesquisa</button>}</div>}</div>
    <div className="e10-pagination"><span>{filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} de {count(filtered.length)} empresas</span><div><button className="e10-iconbutton" aria-label="Página anterior de empresas" disabled={page === 1} onClick={() => setPage(value => value - 1)}><ChevronLeft size={16}/></button><span>{page} / {pageCount}</span><button className="e10-iconbutton" aria-label="Próxima página de empresas" disabled={page >= pageCount} onClick={() => setPage(value => value + 1)}><ChevronRight size={16}/></button></div></div>
  </section>;
}
