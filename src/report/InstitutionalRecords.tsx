import { useEffect, useId, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ArrowDownToLine, ArrowUpDown, ArrowUpRight, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { downloadCsv } from '../components/CompanyTable';
import { institutionalParticipantIds } from '../domain/institutional';
import type { InstitutionalScope } from '../domain/institutional';
import type { InstitutionalSelection } from './InstitutionalExecutiveReport';
import { currency, distinct, num } from './primitives';

export interface InstitutionalRecordsProps {
  scope: InstitutionalScope;
  canExport: boolean;
  financialAllowed: boolean;
  onSelection: (selection: InstitutionalSelection) => void;
  onProfessionals: (ids: string[], label: string) => void;
  onProfessional?: (id: string) => void;
}
export type InstitutionalRecordMode = 'activities' | 'followups' | 'services';
interface RecordRow {
  id: string;
  values: Record<string, string | number>;
  activityId?: string;
  professionalId?: string;
  professionalIds?: string[];
}
const PAGE_SIZE = 20;
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
const date = (value: string) => value.split('-').reverse().join('/');
const csvCell = (value: string | number) => {
  const text = typeof value === 'number' ? String(value) : /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${text.replace(/"/g, '""')}"`;
};
const modeLabels: Record<InstitutionalRecordMode, string> = { activities: 'Atividades', followups: 'Acompanhamentos', services: 'Solicitações' };
const recordOrder = (column: string, descending: boolean) => (a: RecordRow, b: RecordRow) => {
  const left = a.values[column] ?? a.id, right = b.values[column] ?? b.id;
  const difference = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), 'pt-BR', { numeric: true });
  return (descending ? -difference : difference) || a.id.localeCompare(b.id);
};

/** Every row retains its fact's counting unit; cowork usage is not passed off as event attendance. */
export function buildInstitutionalRecordRows(scope: InstitutionalScope, mode: InstitutionalRecordMode): RecordRow[] {
  const cityById = new Map(scope.dataset.cities.map(row => [row.id, row.name]));
  const greById = new Map(scope.dataset.gres.map(row => [row.id, row.name]));
  const programById = new Map(scope.model.programs.map(row => [row.id, row.name]));
  const personById = new Map(scope.dataset.professionals.map(row => [row.id, row]));
  const activityById = new Map(scope.model.activities.map(row => [row.id, row]));
  if (mode === 'followups') return scope.followups.map(row => {
    const activity = activityById.get(row.activityId)!;
    const responded = row.responded && row.respondedAt! <= scope.companyScope.anchor;
    return { id: row.id, activityId: row.activityId, professionalId: row.professionalId, values: {
      id: row.id, program: programById.get(activity.programId)!, date: row.dueAt,
      city: cityById.get(activity.cityId)!, gre: greById.get(activity.greId)!,
      person: personById.get(row.professionalId)?.name ?? row.professionalId,
      status: row.dueAt > scope.companyScope.anchor ? 'Ainda não elegível' : responded ? 'Respondido' : 'Sem resposta no corte',
      outcome: responded ? row.outcome! : 'Não observado',
      responseDate: responded ? row.respondedAt! : '', activityId: row.activityId,
    } };
  });
  if (mode === 'services') return scope.serviceRequests.map(row => {
    const resolved = Boolean(row.resolvedAt && row.resolvedAt <= scope.companyScope.anchor);
    const elapsed = Math.floor((Date.parse(resolved ? row.resolvedAt! : scope.companyScope.anchor) - Date.parse(row.createdAt)) / 86_400_000);
    const mature = Math.floor((Date.parse(scope.companyScope.anchor) - Date.parse(row.createdAt)) / 86_400_000) >= row.targetDays;
    return { id: row.id, professionalId: row.professionalId, values: {
      id: row.id, program: programById.get(row.programId)!, date: row.createdAt,
      city: cityById.get(row.cityId)!, gre: greById.get(row.greId)!, category: row.category,
      person: row.professionalId ? personById.get(row.professionalId)?.name ?? row.professionalId : scope.dataset.companies.find(company => company.id === row.companyId)?.name ?? 'Empresa demonstrativa',
      userType: row.userType, status: resolved ? 'Resolvida' : 'Em atendimento', elapsed,
      maturity: mature ? 'Madura para avaliação' : 'Ainda dentro da janela',
      targetDays: row.targetDays, resolutionDate: resolved ? row.resolvedAt! : '',
    } };
  });
  return scope.activities.map(activity => {
    const participation = scope.participation.filter(row => row.activityId === activity.id);
    const attended = participation.filter(row => row.attended);
    const coworkMonthIds = new Set(scope.coworkMonths.filter(row => row.activityId === activity.id).map(row => row.id));
    const usage = scope.coworkUsage.filter(row => coworkMonthIds.has(row.coworkMonthId));
    const cowork = activity.programId === 'coworkings';
    const people = institutionalParticipantIds(scope, [activity.id]);
    return { id: activity.id, activityId: activity.id, professionalIds: people, values: {
      id: activity.id, program: programById.get(activity.programId)!, date: activity.date,
      city: cityById.get(activity.cityId)!, gre: greById.get(activity.greId)!, kind: activity.kind,
      registrations: cowork ? 'Não se aplica' : participation.length,
      attendances: cowork ? 'Não se aplica' : attended.length,
      unidentified: cowork ? 'Não se aplica' : attended.filter(row => !row.professionalId).length,
      people: people.length, usedHours: cowork ? usage.reduce((sum, row) => sum + row.usedDeskHours, 0) : 'Não se aplica',
      cost: activity.costCents / 100,
    } };
  });
}

function columnsFor(mode: InstitutionalRecordMode, financialAllowed: boolean): [string, string][] {
  if (mode === 'followups') return [['program', 'Programa / chave'], ['date', 'Elegível em'], ['city', 'Local da ação'], ['person', 'Profissional'], ['status', 'Resposta no corte'], ['outcome', 'Resultado relatado']];
  if (mode === 'services') return [['category', 'Categoria / chave'], ['date', 'Criada em'], ['city', 'Local do atendimento'], ['person', 'Solicitante demonstrativo'], ['status', 'Situação no corte'], ['elapsed', 'Dias observados'], ['maturity', 'Coorte de avaliação']];
  return [['program', 'Programa / atividade'], ['date', 'Data'], ['city', 'Local da oferta'], ['registrations', 'Inscrições'], ['attendances', 'Presenças'], ['unidentified', 'Sem identidade'], ['people', 'Pessoas únicas'], ['usedHours', 'Horas de uso'], ...(financialAllowed ? [['cost', 'Custo da ação'] as [string, string]] : [])];
}

export function exportInstitutionalRecordsCsv(scope: InstitutionalScope, permissions: { canExport: boolean; financialAllowed: boolean }, mode: InstitutionalRecordMode = 'activities', query = '', ordering?: { column: string; descending: boolean }) {
  if (!permissions.canExport) throw new Error('Este perfil não permite exportação de registros.');
  const search = normalize(query);
  const rows = buildInstitutionalRecordRows(scope, mode).filter(row => !search || normalize(Object.values(row.values).join(' ')).includes(search));
  if (ordering) rows.sort(recordOrder(ordering.column, ordering.descending));
  const columns = [['id', 'Chave demonstrativa'] as [string, string], ...columnsFor(mode, permissions.financialAllowed), ['gre', 'GRE demonstrativa'] as [string, string],
    ...(mode === 'followups' ? [['activityId', 'Atividade'], ['responseDate', 'Data da resposta']] as [string, string][] : mode === 'services' ? [['targetDays', 'Meta demonstrativa em dias'], ['resolutionDate', 'Data da resolução']] as [string, string][] : [])];
  const lines = rows.map(row => [...columns.map(([key]) => row.values[key] ?? row.id), 'Dados inteiramente demonstrativos', scope.model.metadata.seed]);
  return '\uFEFF' + [[...columns.map(([, title]) => title), 'Origem', 'Semente'], ...lines].map(row => row.map(csvCell).join(';')).join('\r\n');
}

/** Read-only supporting records; selections refine analysis and never change institutional workflows. */
export default function InstitutionalRecords({ scope, canExport, financialAllowed, onSelection, onProfessionals, onProfessional }: InstitutionalRecordsProps) {
  const identity = useId();
  const [mode, setMode] = useState<InstitutionalRecordMode>(scope.options.serviceCategories?.length ? 'services' : 'activities');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('date');
  const [descending, setDescending] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const columns = columnsFor(mode, financialAllowed);
  const rows = useMemo(() => {
    const search = normalize(query);
    return buildInstitutionalRecordRows(scope, mode).filter(row => !search || normalize(Object.values(row.values).join(' ')).includes(search))
      .sort(recordOrder(sort, descending));
  }, [scope, mode, query, sort, descending]);
  useEffect(() => { setPage(1); }, [scope, mode, query, sort, descending]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const order = (key: string) => { if (sort === key) setDescending(value => !value); else { setSort(key); setDescending(false); } };
  const changeMode = (next: InstitutionalRecordMode) => { setMode(next); setSort('date'); setDescending(true); };
  const navigateModes = (event: KeyboardEvent<HTMLElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const keys = Object.keys(modeLabels) as InstitutionalRecordMode[];
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? keys.length - 1 : (keys.indexOf(mode) + (event.key === 'ArrowRight' ? 1 : -1) + keys.length) % keys.length;
    changeMode(keys[next]); document.getElementById(`${identity}-${keys[next]}`)?.focus();
  };
  const exportRows = () => {
    try { downloadCsv(exportInstitutionalRecordsCsv(scope, { canExport, financialAllowed }, mode, query, { column: sort, descending }), `crea-sp-resultados-${mode}-demonstrativos.csv`); setError(''); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível exportar este recorte.'); }
  };
  const cell = (row: RecordRow, key: string) => {
    const value = row.values[key] ?? '';
    if (key === 'program' || key === 'category') return <><button className="p-company-link" onClick={() => row.activityId ? onSelection({ activityIds: [row.activityId] }) : onSelection({ serviceCategories: [row.values.category as NonNullable<InstitutionalScope['options']['serviceCategories']>[number]] })}>{String(value)}</button><small>{row.id}</small>{mode === 'activities' && <small>{row.values.kind}</small>}</>;
    if (key === 'date') return date(String(value));
    if (key === 'city') return <>{value}<small>{row.values.gre}</small></>;
    if (key === 'people') return <button className="r6-recordButton" disabled={!row.professionalIds?.length} aria-label={`Investigar participantes de ${row.id}`} onClick={() => onProfessionals(row.professionalIds!, `Participantes identificados · ${row.id}`)}>{num(Number(value))}<ArrowUpRight size={12} /></button>;
    if (key === 'person' && row.professionalId && onProfessional) return <button className="p-company-link" onClick={() => onProfessional(row.professionalId!)}>{String(value)}</button>;
    if (key === 'cost') return currency(Number(value));
    if (key === 'status') return <span className={`p-badge ${String(value) === 'Resolvida' || String(value) === 'Respondido' ? 'active' : 'neutral'}`}>{value}</span>;
    return typeof value === 'number' ? num(value) : value;
  };

  return <section className="p-table-panel" id="institutional-list" aria-label="Registros demonstrativos que sustentam a avaliação institucional">
    <div className="p-table-tools"><div><h2>Dados da avaliação <span className="p-count">{num(rows.length)}</span></h2><p>{mode === 'activities' ? 'Uma linha por atividade; presenças e usuários de cowork têm unidades separadas.' : mode === 'followups' ? 'Uma linha por pessoa × atividade; janela de 90 dias e respostas observadas no corte.' : 'Uma linha por solicitação; meta demonstrativa de 14 dias, incluindo pendentes maduras.'}</p></div><div className="p-controls">
      <label className="p-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Programa, município ou chave" aria-label="Pesquisar registros da avaliação institucional" />{query && <button aria-label="Limpar pesquisa institucional" onClick={() => setQuery('')}><X size={14} /></button>}</label>
      <button className="p-iconbutton" aria-label="Exportar registros institucionais CSV" title={canExport ? 'Exportar todas as linhas da tabela filtrada' : 'Perfil de consulta não permite exportação'} disabled={!canExport || !rows.length} onClick={exportRows}><ArrowDownToLine size={17} /></button>
    </div></div>
    <nav className="r6-recordModes" role="tablist" aria-label="Unidades de contagem da avaliação" onKeyDown={navigateModes}>{(Object.keys(modeLabels) as InstitutionalRecordMode[]).map(key => <button key={key} id={`${identity}-${key}`} role="tab" aria-selected={mode === key} aria-controls={`${identity}-records`} tabIndex={mode === key ? 0 : -1} onClick={() => changeMode(key)} className={mode === key ? 'active' : ''}>{modeLabels[key]}</button>)}</nav>
    {error && <p className="p-error" role="alert">{error}</p>}
    <div className="p-table-scroll" role="tabpanel" id={`${identity}-records`} aria-labelledby={`${identity}-${mode}`}><table className="p-table"><thead><tr>{columns.map(([key, label]) => <th key={key} aria-sort={sort === key ? descending ? 'descending' : 'ascending' : 'none'}><button onClick={() => order(key)} aria-label={`Ordenar ${label.toLocaleLowerCase('pt-BR')}`}>{label}<ArrowUpDown size={12} /></button></th>)}</tr></thead><tbody>{visible.map(row => <tr key={row.id}>{columns.map(([key]) => <td key={key} className={['registrations', 'attendances', 'unidentified', 'people', 'usedHours', 'cost', 'elapsed'].includes(key) ? 'r6-numeric' : undefined}>{cell(row, key)}</td>)}</tr>)}</tbody></table>
      {!rows.length && <div className="p-empty"><Search size={25} /><h3>Nenhum registro deste tipo no recorte</h3><p>Ajuste o território ou programa no relatório{query ? ', ou limpe a pesquisa desta tabela' : ''}.</p>{query && <button onClick={() => setQuery('')}>Limpar pesquisa</button>}</div>}
    </div>
    <div className="p-pagination"><span>{rows.length ? (current - 1) * PAGE_SIZE + 1 : 0}–{Math.min(current * PAGE_SIZE, rows.length)} de {num(rows.length)} registros · {PAGE_SIZE} por página</span><div><button aria-label="Página anterior de registros institucionais" disabled={current === 1} onClick={() => setPage(current - 1)}><ChevronLeft size={16} /></button><span>Página {current} de {pages}</span><button aria-label="Próxima página de registros institucionais" disabled={current >= pages} onClick={() => setPage(current + 1)}><ChevronRight size={16} /></button></div></div>
    <p className="r6-recordsNote">Dados inteiramente fictícios · semente {scope.model.metadata.seed} · competência {date(scope.companyScope.anchor)}. {scope.scopeNote} Inscrições sem identificador não permitem deduplicar pessoas; repetição entre atividades é legítima. Custos da ação não são custos individuais; não constituem evidência sobre gastos, beneficiários ou desempenho da gestão real do CREA-SP.</p>
  </section>;
}
