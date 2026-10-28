import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpDown, ArrowUpRight, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { downloadCsv } from '../components/CompanyTable';
import { exportProfessionalCsv } from '../domain/professionals';
import type { ProfessionalScope, ProfessionalStatus } from '../domain/professionals';

export interface ProfessionalRecordsProps {
  scope: ProfessionalScope;
  onProfessional: (id: string) => void;
  canExport: boolean;
}

type SortColumn = 'name' | 'registration' | 'modality' | 'city' | 'status' | 'links' | 'arts';
const PAGE_SIZE = 20;
const number = (value: number) => value.toLocaleString('pt-BR');
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();

/** Read-only drillthrough over declared professional facts, preserving the current report scope. */
export default function ProfessionalRecords({ scope, onProfessional, canExport }: ProfessionalRecordsProps) {
  const [query, setQuery] = useState('');
  const [modality, setModality] = useState('');
  const [cityId, setCityId] = useState('');
  const [status, setStatus] = useState<ProfessionalStatus | ''>('');
  const [sort, setSort] = useState<SortColumn>('name');
  const [descending, setDescending] = useState(false);
  const [page, setPage] = useState(1);
  const [exportError, setExportError] = useState('');

  const cityById = useMemo(() => new Map(scope.dataset.cities.map(city => [city.id, city])), [scope.dataset]);
  const modalities = useMemo(() => [...new Set(scope.profiles.map(profile => profile.modality))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [scope.profiles]);
  const cities = useMemo(() => [...new Set(scope.profiles.map(profile => profile.cityId))]
    .map(id => ({ id, name: cityById.get(id)?.name ?? id })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), [scope.profiles, cityById]);
  const statuses = useMemo(() => [...new Set(scope.profiles.map(profile => profile.status))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [scope.profiles]);

  const rows = useMemo(() => {
    const linkCounts = new Map<string, number>();
    const artIds = new Map<string, Set<string>>();
    for (const link of scope.activeLinks) linkCounts.set(link.professionalId, (linkCounts.get(link.professionalId) ?? 0) + 1);
    for (const attribution of scope.artAttributions) {
      const ids = artIds.get(attribution.professionalId) ?? new Set<string>();
      ids.add(attribution.artId);
      artIds.set(attribution.professionalId, ids);
    }
    const search = normalize(query);
    return scope.profiles.filter(profile => (!modality || profile.modality === modality)
      && (!cityId || profile.cityId === cityId)
      && (!status || profile.status === status)
      && (!search || normalize(`${profile.name} ${profile.registration} ${profile.modality} ${cityById.get(profile.cityId)?.name ?? profile.cityId} ${profile.status}`).includes(search)))
      .map(profile => ({ profile, name: profile.name, registration: profile.registration, modality: profile.modality,
        city: cityById.get(profile.cityId)?.name ?? profile.cityId, status: profile.status,
        links: linkCounts.get(profile.id) ?? 0, arts: artIds.get(profile.id)?.size ?? 0 }))
      .sort((a, b) => {
        const left = a[sort], right = b[sort];
        const difference = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), 'pt-BR', { numeric: true });
        return (descending ? -difference : difference) || a.profile.id.localeCompare(b.profile.id);
      });
  }, [scope, query, modality, cityId, status, sort, descending, cityById]);

  useEffect(() => { setPage(1); }, [scope, query, modality, cityId, status, sort, descending]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const localFilters = Boolean(query || modality || cityId || status);
  const clearLocalFilters = () => { setQuery(''); setModality(''); setCityId(''); setStatus(''); setPage(1); };
  const order = (column: SortColumn) => {
    if (sort === column) setDescending(value => !value);
    else { setSort(column); setDescending(column === 'links' || column === 'arts'); }
  };
  const sortedHeader = (column: SortColumn, label: string) => <th aria-sort={sort === column ? descending ? 'descending' : 'ascending' : 'none'}><button onClick={() => order(column)} aria-label={`Ordenar por ${label.toLocaleLowerCase('pt-BR')}`}>{label}<ArrowUpDown size={12} /></button></th>;
  const exportRows = () => {
    try {
      const profiles = rows.map(row => row.profile);
      const filteredScope = { ...scope, profiles, profileIds: new Set(profiles.map(profile => profile.id)) };
      downloadCsv(exportProfessionalCsv(filteredScope, canExport), 'crea-sp-profissionais-demonstrativos.csv');
      setExportError('');
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Não foi possível exportar os profissionais do recorte.');
    }
  };

  return <section className="p-table-panel" id="professional-list" aria-label="Profissionais do recorte demonstrativo">
    <div className="p-table-tools">
      <div><h2>Profissionais do recorte <span className="p-count">{number(rows.length)}</span></h2><p>Uma linha por pessoa fictícia · domicílio cadastral · dados demonstrativos, sem identificação individual por RAIS ou CAGED.</p></div>
      <div className="p-controls">
        <label className="p-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nome, registro ou município" aria-label="Pesquisar profissionais do recorte" />{query && <button aria-label="Limpar pesquisa de profissionais" onClick={() => setQuery('')}><X size={14} /></button>}</label>
        <select value={modality} onChange={event => setModality(event.target.value)} aria-label="Filtrar modalidade profissional"><option value="">Todas as modalidades</option>{modalities.map(value => <option key={value}>{value}</option>)}</select>
        <select value={cityId} onChange={event => setCityId(event.target.value)} aria-label="Filtrar domicílio profissional"><option value="">Todos os domicílios</option>{cities.map(city => <option key={city.id} value={city.id}>{city.name}</option>)}</select>
        <select value={status} onChange={event => setStatus(event.target.value as ProfessionalStatus | '')} aria-label="Filtrar situação profissional"><option value="">Todas as situações</option>{statuses.map(value => <option key={value}>{value}</option>)}</select>
        {localFilters && <button className="p-iconbutton" aria-label="Limpar filtros da tabela de profissionais" title="Limpar filtros desta tabela" onClick={clearLocalFilters}><X size={17} /></button>}
        <button className="p-iconbutton" disabled={!canExport || !rows.length} aria-label="Exportar profissionais CSV" title={!canExport ? 'Perfil de consulta não permite exportação' : 'Exportar todas as pessoas filtradas, na ordem exibida'} onClick={exportRows}><ArrowDownToLine size={17} /></button>
      </div>
    </div>
    {exportError && <p className="p-error" role="alert">{exportError}</p>}
    <div className="p-table-scroll"><table className="p-table">
      <thead><tr>{sortedHeader('name', 'Profissional')}{sortedHeader('registration', 'Registro CREA')}{sortedHeader('modality', 'Modalidade')}{sortedHeader('city', 'Domicílio cadastral')}{sortedHeader('status', 'Situação')}{sortedHeader('links', 'Vínculos RT vigentes')}{sortedHeader('arts', 'ARTs com autoria')}<th>Ficha</th></tr></thead>
      <tbody>{visible.map(row => <tr key={row.profile.id}>
        <td><button className="p-company-link" onClick={() => onProfessional(row.profile.id)}>{row.name}</button><small>{row.profile.title}</small></td><td>{row.registration}</td><td>{row.modality}</td><td>{row.city}</td>
        <td><span className={`p-badge ${row.status === 'Ativo' ? 'active' : 'inactive'}`}>{row.status}</span></td><td>{number(row.links)}</td><td>{number(row.arts)}</td>
        <td><button className="p-iconbutton" aria-label={`Abrir ficha de ${row.name}`} onClick={() => onProfessional(row.profile.id)}><ArrowUpRight size={17} /></button></td>
      </tr>)}</tbody>
    </table>{!rows.length && <div className="p-empty"><Search size={25} /><h3>Nenhum profissional neste recorte</h3><p>{localFilters ? 'Ajuste a pesquisa e os filtros desta tabela.' : 'A seleção do relatório não contém profissionais. Ajuste o recorte no painel.'}</p>{localFilters && <button onClick={clearLocalFilters}>Limpar busca e filtros da tabela</button>}</div>}</div>
    <div className="p-pagination"><span>{rows.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, rows.length)} de {number(rows.length)} profissionais · {PAGE_SIZE} por página</span><div><button aria-label="Página anterior de profissionais" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></button><span>Página {currentPage} de {pages}</span><button aria-label="Próxima página de profissionais" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></button></div></div>
    <p className="p-source">Vínculos RT são relações vigentes na competência {scope.companyScope.anchor.split('-').reverse().join('/')}. ARTs distintas no período de {scope.companyScope.filters.period} meses usam uma ponte própria de autoria declarada; o vínculo RT isolado não comprova autoria. Fonte: cadastro e relações sintéticos · semente {scope.dataset.seed}.</p>
  </section>;
}
