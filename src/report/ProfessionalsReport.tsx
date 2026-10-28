import { useMemo } from 'react';
import { ReportChartV9 as ReportChart } from './chart-design-v9';
import { windowBounds } from '../domain/engine';
import { buildProfessionalHistogram, groupProfessionals, selectProfessionalScope } from '../domain/professionals';
import type { ProfessionalScope } from '../domain/professionals';
import education from '../domain/external-education.json';
import userStatistics from '../domain/user-engineer-statistics.json';
import type { ReportProps } from './primitives';
import { combinedOption, distinct, horizontalOption, num, palette, ReportPanel } from './primitives';

export interface EnterpriseConnection {
  source: string; target: string; value: number; relation: 'RT vigente' | 'Sociedade confirmada'; cnae: string;
  professionalIds: string[]; companyIds: string[];
}

/** QSA and RT are independent explicit bridges; neither establishes an employment relationship. */
export function buildProfessionalEnterpriseConnections(scope: ProfessionalScope) {
  const profiles = new Map(scope.profiles.map(row => [row.id, row]));
  const matrices = new Map(scope.dataset.establishments.filter(row => row.branch === 'Matriz').map(row => [row.companyId, row]));
  const raw = [
    ...scope.activeLinks.map(row => ({ ...row, relation: 'RT vigente' as const })),
    ...scope.qsaConfirmed.filter(row => row.professionalId).map(row => ({ ...row, professionalId: row.professionalId!, relation: 'Sociedade confirmada' as const })),
  ];
  const counts = new Map<string, number>();
  for (const row of raw) { const cnae = matrices.get(row.companyId)?.cnaeMain ?? 'Não informado'; counts.set(cnae, (counts.get(cnae) ?? 0) + 1); }
  const selectedCnaes = new Set([...counts].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([code]) => code));
  const links = new Map<string, EnterpriseConnection>();
  for (const row of raw) {
    const profile = profiles.get(row.professionalId); if (!profile) continue;
    const originalCnae = matrices.get(row.companyId)?.cnaeMain ?? 'Não informado';
    const cnae = selectedCnaes.has(originalCnae) ? originalCnae : 'Demais atividades';
    const target = `${row.relation === 'RT vigente' ? 'RT' : 'QSA'} · ${cnae}`;
    const key = `${profile.modality}:${target}`;
    const connection = links.get(key) ?? { source: profile.modality, target, cnae, relation: row.relation, value: 0, professionalIds: [], companyIds: [] };
    connection.value++; connection.professionalIds.push(profile.id); connection.companyIds.push(row.companyId); links.set(key, connection);
  }
  return [...links.values()].map(row => ({ ...row, professionalIds: distinct(row.professionalIds), companyIds: distinct(row.companyIds) }));
}

export function buildProfessionalCohortMatrix(scope: ProfessionalScope) {
  const modalities = distinct(scope.profiles.map(row => row.modality)).sort();
  const years = distinct(scope.profiles.map(row => row.registeredAt.slice(0, 4))).sort();
  const recent = years.slice(-7); const older = years.filter(year => !recent.includes(year));
  const columns = [...(older.length ? [`Até ${older.at(-1)}`] : []), ...recent];
  const cells = modalities.flatMap((modality, y) => columns.map((year, x) => {
    const professionalIds = scope.profiles.filter(row => row.modality === modality && (year.startsWith('Até') ? older.includes(row.registeredAt.slice(0, 4)) : row.registeredAt.startsWith(year))).map(row => row.id);
    return { modality, year, professionalIds, value: [x, y, professionalIds.length] as [number, number, number] };
  }));
  return { modalities, years: columns, cells };
}

/** Monthly production originates only from the declared author–ART bridge, including zero months. */
export function buildProfessionalProduction(scope: ProfessionalScope) {
  const bounds = windowBounds(scope.companyScope.filters.period, scope.companyScope.anchor);
  const first = new Date(`${bounds.start}T00:00:00Z`);
  return Array.from({ length: Math.max(1, Math.floor(scope.companyScope.filters.period || 12)) }, (_, offset) => {
    const month = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + offset, 1)).toISOString().slice(0, 7);
    const arts = scope.arts.filter(row => row.date.startsWith(month));
    const artIds = new Set(arts.map(row => row.id));
    const authors = scope.artAttributions.filter(row => artIds.has(row.artId));
    return { month, arts: artIds.size, authors: new Set(authors.map(row => row.professionalId)).size,
      professionalIds: distinct(authors.map(row => row.professionalId)), companyIds: distinct(arts.map(row => row.companyId)) };
  });
}

/** External geography is course offering, not residence. Municipal observations exist only in 2024. */
export function selectEducationForTerritory(scope: ProfessionalScope) {
  const filters = scope.companyScope.filters;
  const territorial = Boolean(filters.cityIds.length);
  if (!territorial) return { annual: education.annual, territorial: false, observation: true, description: 'São Paulo · série estadual 2019–2024' };
  const cities = scope.dataset.cities.filter(city => filters.cityIds.includes(city.id));
  const codes = new Set(cities.map(city => city.ibgeCode));
  const rows = education.cities.filter(row => codes.has(row.ibgeCode));
  return { annual: rows.length ? [{ year: 2024, graduates: rows.reduce((total, row) => total + row.graduates, 0),
    entrants: rows.reduce((total, row) => total + row.entrants, 0), enrolled: rows.reduce((total, row) => total + row.enrolled, 0), fieldCount: 0 }] : [],
    territorial: true, observation: Boolean(rows.length), description: `${cities.length === 1 ? cities[0].name : `${cities.length} municípios do recorte`} · oferta presencial 2024` };
}

/** São Paulo is the report territory. Compare observed statewide years, never people or cohorts. */
export function buildPublishedFormationRegistrationComparison() {
  return education.annual.flatMap(row => {
    const observed = userStatistics.annualRegistrations.find(item => item.uf === 'SP' && item.year === row.year && !item.partial);
    return observed ? [{ year: row.year, graduates: row.graduates, registrations: observed.registrations }] : [];
  });
}

/** Diplomas belong to registered people: this is not an estimate of every SP graduate. */
export function buildRegisteredFormation(scope: ProfessionalScope) {
  const profiles = new Map(scope.profiles.map(row => [row.id, row]));
  const degrees = scope.model.education.filter(row => row.level === 'Graduação' && profiles.has(row.professionalId));
  const activeIds = new Set(scope.activeLinks.map(row => row.professionalId));
  const years = [...new Set(degrees.map(row => row.completedYear))].sort((a, b) => a - b);
  const latest = years.at(-1);
  const displayed = latest === undefined ? [] : Array.from({ length: Math.min(8, latest - years[0] + 1) }, (_, index) => latest - Math.min(7, latest - years[0]) + index);
  return displayed.map(year => {
    const rows = degrees.filter(row => row.completedYear === year);
    const professionalIds = distinct(rows.map(row => row.professionalId));
    const withRt = professionalIds.filter(id => activeIds.has(id)).length;
    return { year, degrees: rows.length, graduates: professionalIds.length, withRt,
      rtRate: professionalIds.length ? withRt / professionalIds.length * 100 : null, professionalIds };
  });
}

/** Whole-year difference is all the source can support; people contribute once. */
export function buildRegisteredFormationLag(scope: ProfessionalScope) {
  const firstDegree = new Map<string, number>();
  for (const row of scope.model.education) if (row.level === 'Graduação' && scope.profileIds.has(row.professionalId))
    firstDegree.set(row.professionalId, Math.min(firstDegree.get(row.professionalId) ?? Infinity, row.completedYear));
  const withRt = new Set(scope.activeLinks.map(row => row.professionalId));
  return [{ label: 'Até 1 ano', min: 0, max: 1 }, { label: '2 anos', min: 2, max: 2 },
    { label: '3 anos', min: 3, max: 3 }, { label: '4 anos ou mais', min: 4, max: Infinity }].map(bucket => {
      const professionalIds = scope.profiles.filter(row => {
        const completedYear = firstDegree.get(row.id); if (completedYear === undefined) return false;
        const lag = Number(row.registeredAt.slice(0, 4)) - completedYear;
        return lag >= bucket.min && lag <= bucket.max;
      }).map(row => row.id);
      const currentRt = professionalIds.filter(id => withRt.has(id)).length;
      return { ...bucket, professionalIds, professionals: professionalIds.length, withRt: currentRt,
        rtRate: professionalIds.length ? currentRt / professionalIds.length * 100 : null };
    });
}

export default function ProfessionalsReport({ scope, companySubset, professionalIds, comparison, onProfessionals, onSubset }: ReportProps) {
  const selected = useMemo(() => selectProfessionalScope(scope, { companySubset, professionalIds }), [scope, companySubset, professionalIds]);
  const modalities = useMemo(() => groupProfessionals(selected, 'modality'), [selected]);
  const connections = useMemo(() => buildProfessionalEnterpriseConnections(selected), [selected]);
  const production = useMemo(() => buildProfessionalProduction(selected), [selected]);
  const histogram = useMemo(() => buildProfessionalHistogram(selected), [selected]);
  const authorsByModality = new Map(modalities.map(row => [row.id, new Set(selected.activeLinks.filter(link => row.professionalIds.includes(link.professionalId)).map(link => link.professionalId)).size]));
  const rtConnections = connections.filter(row => row.relation === 'RT vigente');
  const qsaConnections = connections.filter(row => row.relation === 'Sociedade confirmada');
  const nodes = distinct(connections.flatMap(row => [row.source, row.target])).map(name => ({ name,
    itemStyle: { color: name.startsWith('QSA') ? '#15265C' : name.startsWith('RT') ? '#3662E2' : palette[modalities.findIndex(row => row.id === name) % palette.length] ?? '#3662E2' } }));
  const professionalSource = `Cadastro profissional demonstrativo · competência ${scope.anchor} · território = domicílio; empresa atravessa RT/QSA confirmados.`;
  const formation = useMemo(() => buildRegisteredFormation(selected), [selected]);
  const formationLag = useMemo(() => buildRegisteredFormationLag(selected), [selected]);
  const educationSource = `Histórico de títulos + cadastro profissional demonstrativos · extração prevista: SQL Server ou DB2 + gateway; fonte de produção ainda não conectada. Diplomas declarados no cadastro, não total de diplomados paulistas. Território = domicílio atual, não instituição; conclusão disponível por ano.`;
  const productionOption = combinedOption(production.map(row => `${row.month.slice(5)}/${row.month.slice(2, 4)}`), [
    { name: 'ARTs com autoria', type: 'bar', data: production.map(row => row.arts), color: '#3662E2' },
    { name: 'Autores distintos', type: 'line', data: production.map(row => row.authors), axis: 1, color: '#FFB001' },
  ], ['ARTs', 'Profissionais']);
  if (comparison) {
    const bounds = windowBounds(scope.filters.period, scope.anchor);
    const previousScope = selectProfessionalScope({ ...scope, anchor: bounds.previousEnd }, { companySubset, professionalIds });
    const previous = buildProfessionalProduction(previousScope);
    (productionOption.series as Record<string, unknown>[]).push({ name: 'ARTs, período anterior', type: 'line', data: previous.map(row => row.month < scope.dataset.months[0] ? null : row.arts), yAxisIndex: 0, symbolSize: 3,
      itemStyle: { color: '#15265C' }, lineStyle: { type: 'dashed', width: 2 } });
  }
  const selectConnection = (p: any) => {
    if (p.dataType === 'edge') {
      const row = p.data as EnterpriseConnection;
      onProfessionals(row.professionalIds, `${row.source} · ${row.relation}`);
      onSubset(row.companyIds, `${row.relation} · ${row.cnae}`, 'Relações explícitas do recorte profissional. RT, sociedade e autoria são pontes diferentes; não representam trabalhadores RAIS/CAGED.');
      return;
    }
    const source = modalities.find(row => row.id === p.name);
    if (source) { onProfessionals(source.professionalIds, `Modalidade ${source.label}`); return; }
    const rows = connections.filter(row => row.target === p.name);
    if (rows.length) {
      onProfessionals(distinct(rows.flatMap(row => row.professionalIds)), p.name);
      onSubset(distinct(rows.flatMap(row => row.companyIds)), p.name, 'Empresas ligadas por vínculos RT ou participações societárias confirmadas, conforme o fluxo selecionado.');
    }
  };
  return <div className="r5-grid">
    <ReportPanel id="professionals-education" step="01" wide title="Formação declarada → vínculo técnico" subtitle="Coortes de diplomados do cadastro · pessoas em colunas e proporção com RT vigente em linha." source={educationSource}>
      <ReportChart option={combinedOption(formation.map(row => String(row.year)), [
        { name: 'Diplomados no cadastro', type: 'bar', data: formation.map(row => row.graduates), color: '#A4B5DA' },
        { name: 'Com RT vigente', type: 'bar', data: formation.map(row => row.withRt), color: '#3662E2' },
        { name: '% com RT vigente', type: 'line', data: formation.map(row => row.rtRate), axis: 1, color: '#FFB001' },
      ], ['Pessoas', '% com RT'])} label="Coortes de conclusão declarada dos profissionais cadastrados e vínculos técnicos vigentes, dados demonstrativos" onPick={p => { const row = formation[p.dataIndex]; if (row) onProfessionals(row.professionalIds, `Conclusão declarada · ${row.year}`); }} />
    </ReportPanel>
    <ReportPanel id="professionals-profile" step="02" title="Qual é a base profissional?" subtitle="Pessoas cadastradas e pessoas com pelo menos um RT vigente, por modalidade." source={`${professionalSource} O cadastro não representa diplomados nem empregos.`}>
      <ReportChart option={combinedOption(modalities.map(row => row.label), [
        { name: 'Profissionais distintos', type: 'bar', data: modalities.map(row => row.professionals), color: '#A4B5DA' },
        { name: 'Com RT vigente', type: 'line', data: modalities.map(row => authorsByModality.get(row.id) ?? 0), color: '#FFB001' },
      ], ['Pessoas'])} label="Profissionais cadastrados e com RT vigente por modalidade" onPick={p => { const row = modalities[p.dataIndex]; if (row) onProfessionals(row.professionalIds, `Modalidade ${row.label}`); }} />
    </ReportPanel>
    <ReportPanel id="professionals-registration-lag" step="03" title="Quanto tempo até o primeiro registro?" subtitle="Diferença entre anos de conclusão e ingresso; não é uma taxa de conversão dos diplomados de SP." source={`${educationSource} Considera a primeira graduação declarada por pessoa e o primeiro registro; RT vigente não comprova emprego ou renda.`}>
      <ReportChart option={combinedOption(formationLag.map(row => row.label), [
        { name: 'Profissionais', type: 'bar', data: formationLag.map(row => row.professionals), color: '#3662E2' },
        { name: '% com RT vigente', type: 'line', data: formationLag.map(row => row.rtRate), axis: 1, color: '#FFB001' },
      ], ['Pessoas', '% com RT'])} label="Defasagem anual entre diploma declarado e primeiro registro, com proporção de responsáveis técnicos vigentes" onPick={p => { const row = formationLag[p.dataIndex]; if (row) onProfessionals(row.professionalIds, `Diploma → registro · ${row.label}`); }} />
    </ReportPanel>
    <ReportPanel id="professionals-connections" step="04" wide title="Como se ligam às empresas?" subtitle={`${num(rtConnections.reduce((n, row) => n + row.value, 0))} vínculos RT vigentes e ${num(qsaConnections.reduce((n, row) => n + row.value, 0))} participações societárias confirmadas, por modalidade → atividade.`} source="RT e QSA demonstrativos · espessura conta relações, não pessoas únicas · CNAE principal da matriz · sugestões por nome ficam fora do fluxo.">
      <ReportChart option={{ tooltip: { confine: true, formatter: (p: any) => p.dataType === 'edge' ? `${p.data.source} → ${p.data.target}<br/>Relação: ${p.data.relation}<br/>Relações: ${num(p.data.value)}<br/>Pessoas distintas: ${num(p.data.professionalIds.length)}<br/>Empresas distintas: ${num(p.data.companyIds.length)}` : p.name }, series: [{ type: 'sankey', left: 8, right: 132, top: 5, bottom: 8,
        data: nodes, links: connections, nodeWidth: 9, nodeGap: 9, layoutIterations: 32,
        label: { fontSize: 10, color: '#566786', width: 124, overflow: 'truncate' },
        lineStyle: { color: 'source', opacity: .22, curveness: .52 }, emphasis: { focus: 'adjacency', lineStyle: { opacity: .62 } } }] }} label="Fluxos distintos de vínculos RT e sociedade confirmada entre modalidades profissionais e CNAEs empresariais" onPick={selectConnection} />
    </ReportPanel>
    <ReportPanel id="professionals-production" step="05" title="Que produção técnica está declarada?" subtitle="ARTs em colunas e autores distintos em linha, no período selecionado." source="ART + ponte de autoria demonstrativa expressa · autoria não é inferida pelo RT · CAO empresarial não é CAT profissional.">
      <ReportChart option={productionOption} label="Produção mensal de ARTs com autoria declarada e autores profissionais distintos" onPick={p => { const row = production[p.dataIndex]; if (row) { onProfessionals(row.professionalIds, `Autores de ART · ${row.month}`); onSubset(row.companyIds, `Empresas das ARTs · ${row.month}`, 'Empresas relacionadas às ARTs com autoria expressa neste mês; não equivale às empresas com vínculo RT vigente.'); } }} />
    </ReportPanel>
    <ReportPanel id="professionals-concentration" step="06" title="Como se distribuem os vínculos?" subtitle="Pessoas por quantidade de empresas com RT vigente; inclui zero vínculo." source={`${professionalSource} Uma pessoa é contada uma vez; sem vínculo não significa inatividade ou irregularidade.`}>
      <ReportChart option={horizontalOption(histogram.map(row => row.label), histogram.map(row => row.professionals), 'Profissionais')} label="Histograma de profissionais por quantidade de empresas com RT vigente, incluindo pessoas sem vínculo" onPick={p => { const row = histogram[p.dataIndex]; if (row) onProfessionals(row.professionalIds, row.label); }} />
    </ReportPanel>
  </div>;
}
