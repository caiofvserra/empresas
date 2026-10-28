import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpDown, ArrowUpRight, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import type { Scope } from '../domain/engine';
import { buildDigitalInspection, digitalMatchLabels, exportDigitalInspectionCsv } from '../domain/digital-inspection';
import type { DigitalInspectionCompany, DigitalInspectionEvidence } from '../domain/digital-inspection';
import { downloadCsv } from '../components/CompanyTable';

export interface DigitalEvidenceRecordsProps {
  scope: Scope; canExport: boolean; onCompany: (id: string) => void;
  onSubset?: (ids: string[], label: string, reason: string) => void;
}
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
const number = (value: number) => value.toLocaleString('pt-BR');
const PAGE_SIZE = 15;
type Sort = 'company' | 'rule' | 'match';
interface RecordRow { company: DigitalInspectionCompany; signal?: DigitalInspectionEvidence; rule: string }

/** One row per company × evidence rule; baseline rows preserve eligible companies
 * without a signal. Reading and filtering do not create or change case records. */
export default function DigitalEvidenceRecords({ scope, canExport, onCompany, onSubset }: DigitalEvidenceRecordsProps) {
  const analysis = useMemo(() => buildDigitalInspection(scope), [scope]);
  const [query, setQuery] = useState(''); const [rule, setRule] = useState('');
  const [sort, setSort] = useState<Sort>('company'); const [descending, setDescending] = useState(false);
  const [page, setPage] = useState(1); const [exportError, setExportError] = useState('');
  const records = useMemo(() => analysis.companies.flatMap<RecordRow>(company => company.signals.length
    ? company.signals.map(signal => ({ company, signal, rule: signal.ruleId }))
    : [{ company, signal: undefined, rule: 'DIG-00' }]) as RecordRow[], [analysis]);
  const rules = useMemo(() => [...new Set(records.map(row => row.rule))].sort(), [records]);
  const rows = useMemo(() => {
    const search = normalize(query);
    return records.filter(row => (!rule || row.rule === rule) && (!search || normalize(`${row.company.name} ${row.company.tradeName} ${row.company.cnpjs.join(' ')} ${row.company.rootCnpj} ${row.rule} ${row.signal?.title ?? ''} ${row.signal?.criteria ?? ''}`).includes(search)))
      .sort((a, b) => {
        const left = sort === 'company' ? a.company.name : sort === 'match' ? digitalMatchLabels[a.company.match] : a.rule;
        const right = sort === 'company' ? b.company.name : sort === 'match' ? digitalMatchLabels[b.company.match] : b.rule;
        return (descending ? -1 : 1) * left.localeCompare(right, 'pt-BR') || a.company.companyId.localeCompare(b.company.companyId) || a.rule.localeCompare(b.rule);
      });
  }, [records, query, rule, sort, descending]);
  const companyIds = useMemo(() => [...new Set(rows.map(row => row.company.companyId))], [rows]);
  useEffect(() => { setPage(1); }, [scope, query, rule, sort, descending]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE)); const current = Math.min(page, pages);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const order = (column: Sort) => { if (sort === column) setDescending(value => !value); else { setSort(column); setDescending(false); } };
  const clear = () => { setQuery(''); setRule(''); setPage(1); };
  const header = (column: Sort, label: string) => <th aria-sort={sort === column ? descending ? 'descending' : 'ascending' : 'none'}><button onClick={() => order(column)}>{label}<ArrowUpDown size={12} /></button></th>;
  const exportRows = () => {
    try { downloadCsv(exportDigitalInspectionCsv(scope, canExport, companyIds, rule || undefined, rows.map(row => row.signal?.id ?? `DIG-00:${row.company.companyId}`)), 'crea-sp-evidencias-digitais-demonstrativas.csv'); setExportError(''); }
    catch (error) { setExportError(error instanceof Error ? error.message : 'Não foi possível exportar as evidências.'); }
  };
  return <section id="digital-evidence-list" className="p-table-panel" aria-label="Evidências de fiscalização digital do recorte">
    <div className="p-table-tools"><div><h2>Evidências do cruzamento <span className="p-count">{number(rows.length)}</span></h2><p>{number(companyIds.length)} empresas distintas · uma linha por empresa × regra · DIG-00 indica ausência de combinação nas regras exibidas.</p></div>
      <div className="p-controls"><label className="p-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} aria-label="Pesquisar evidências digitais" placeholder="CNPJ, empresa, critério ou regra" />{query && <button onClick={() => setQuery('')} aria-label="Limpar pesquisa de evidências digitais"><X size={14} /></button>}</label>
        <select aria-label="Filtrar regra da fiscalização digital" value={rule} onChange={event => setRule(event.target.value)}><option value="">Todas as regras</option>{rules.map(id => <option key={id}>{id}</option>)}</select>
        {(query || rule) && <button className="p-iconbutton" aria-label="Limpar filtros das evidências" onClick={clear}><X size={16} /></button>}
        {onSubset && <button className="p-iconbutton" aria-label="Investigar empresas das evidências filtradas" title="Selecionar as empresas destas evidências no relatório" disabled={!companyIds.length} onClick={() => onSubset(companyIds, rule ? `Empresas · ${rule}` : 'Empresas das evidências filtradas', `Seleção explícita de ${number(companyIds.length)} empresas nas evidências da fiscalização digital${rule ? `; regra ${rule}` : ''}. Cada evidência mantém critérios, origem e data; não equivale a infração.`)}><ArrowUpRight size={17} /></button>}
        <button className="p-iconbutton" disabled={!canExport || !rows.length} aria-label="Exportar evidências digitais CSV" title={canExport ? 'Exportar as evidências do filtro, com IDs e critérios' : 'Perfil de consulta não permite exportar evidências'} onClick={exportRows}><ArrowDownToLine size={17} /></button>
      </div></div>
    <p className="p-source">CNPJ completo é determinístico. Raiz é sugestão separada. Cadastro/RT estão na competência {analysis.asOf}; contratos estão no período {analysis.periodStart} a {analysis.asOf}. Emprego CAGED/RAIS permanece agregado por município/CNAE/CBO e não integra a ficha individual de evidências. Dados demonstrativos; gateway e APIs ainda não conectados.</p>
    {exportError && <p className="p-error" role="alert">{exportError}</p>}
    <div className="p-table-scroll"><table className="p-table"><thead><tr>{header('company', 'Empresa / CNPJs')}{header('match', 'Conciliação')}{header('rule', 'Regra / evidência')}<th>Critérios, origem e limites</th><th>Ficha</th></tr></thead>
      <tbody>{visible.map(row => <tr key={`${row.company.companyId}:${row.rule}`}><td><button className="p-company-link" onClick={() => onCompany(row.company.companyId)}>{row.company.name}</button><small>{row.company.cnpjs.join(' · ')}</small><small>CNAEs: {row.company.cnaeCodes.join(', ')}</small></td>
        <td>{digitalMatchLabels[row.company.match]}<small>{row.company.activeRegistrationIds.length} registros vigentes · {row.company.activeRtIds.length} vínculos RT vigentes</small></td>
        <td><span className="p-badge neutral">{row.rule}</span><small>{row.signal?.title ?? 'Sem combinação nas regras exibidas'}</small></td>
        <td><details><summary>Critérios e fontes</summary><p>{row.signal?.criteria ?? 'RFB ativa; CNAE relacionado ou depende de análise; CNPJ validado e deduplicado.'}</p><p><strong>Referências:</strong> {(row.signal?.factIds ?? row.company.sourceRowIds).join(' · ')}</p><p><strong>Fonte:</strong> {row.signal?.source ?? 'RFB/CNPJ ↔ cadastro CREA'} · corte {analysis.asOf}</p><p><strong>Limite:</strong> {row.signal?.limitation ?? 'Ausência de sinal não comprova regularidade; fontes completas e revisão humana necessárias.'}</p><p>{row.company.contractArtLink}. ART da empresa não comprova ART deste contrato. Classificação de objeto é dicionário textual demonstrativo.</p></details></td>
        <td><button className="p-iconbutton" aria-label={`Abrir ficha de ${row.company.name}`} onClick={() => onCompany(row.company.companyId)}><ArrowUpRight size={17} /></button></td>
      </tr>)}</tbody></table>{!rows.length && <div className="p-empty"><Search size={25} /><h3>Nenhuma evidência neste filtro</h3><p>Ajuste a busca ou as regras do recorte.</p>{(query || rule) && <button onClick={clear}>Limpar busca e regra</button>}</div>}</div>
    <div className="p-pagination"><span>{rows.length ? (current - 1) * PAGE_SIZE + 1 : 0}–{Math.min(current * PAGE_SIZE, rows.length)} de {number(rows.length)} evidências</span><div><button disabled={current === 1} aria-label="Página anterior de evidências digitais" onClick={() => setPage(current - 1)}><ChevronLeft size={16} /></button><span>Página {current} de {pages}</span><button disabled={current >= pages} aria-label="Próxima página de evidências digitais" onClick={() => setPage(current + 1)}><ChevronRight size={16} /></button></div></div>
    <p className="p-source">{analysis.source} · {number(analysis.metrics.invalidSourceRows)} linhas de CNPJ inválido excluídas da identidade e {number(analysis.metrics.duplicatedSourceRows)} linhas excedentes deduplicadas. Não aumentam o universo de empresas. Nenhuma pontuação ponderada ou probabilidade de infração é calculada.</p>
  </section>;
}
