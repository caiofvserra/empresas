import { useMemo } from 'react';
import { ReportChartV9 as ReportChart } from './chart-design-v9';
import { group, selectScope } from '../domain/engine';
import type { Scope } from '../domain/engine';
import MunicipalMap from '../components/MunicipalMap';
import type { ReportProps } from './primitives';
import { combinedOption, compact, distinct, matrixOption, num, palette, percent, ReportPanel } from './primitives';

const sum = <T,>(rows: T[], get: (row: T) => number) => rows.reduce((total, row) => total + get(row), 0);
const monthEnd = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);
const change = (first: number, last: number) => first ? (last - first) / first * 100 : null;

/** Geography originates in aggregate employment, never in the companies surviving a size/CNPJ filter. */
export function buildEmploymentMapRows(scope: Scope) {
  const month = distinct(scope.employment.map(row => row.month)).sort().at(-1);
  const rows = scope.employment.filter(row => row.month === month);
  return distinct(rows.map(row => row.cityId)).map(id => ({ id, label: scope.dataset.cities.find(city => city.id === id)!.name,
    employment: sum(rows.filter(row => row.cityId === id), row => row.stock) }));
}

/** Stock is a last-month snapshot; admissions and dismissals are flows over the selected period. */
export function buildEmploymentOccupationRows(scope: Scope) {
  const lastMonth = distinct(scope.employment.map(row => row.month)).sort().at(-1);
  return scope.dataset.cbos.map(cbo => {
    const facts = scope.employment.filter(row => row.cbo === cbo.code);
    const admissions = sum(facts, row => row.admissions);
    const dismissals = sum(facts, row => row.dismissals);
    return { ...cbo, lastMonth, stock: sum(facts.filter(row => row.month === lastMonth), row => row.stock),
      admissions, dismissals, balance: admissions - dismissals };
  }).filter(row => row.stock || row.admissions || row.dismissals).sort((a, b) => b.stock - a.stock);
}

/** A company contributes once, through its matrix principal CNAE, to this composition. */
export function buildPrincipalCompanySectors(scope: Scope) {
  const matrices = new Map(scope.dataset.establishments.filter(row => row.branch === 'Matriz').map(row => [row.companyId, row]));
  const cnaes = new Map(scope.dataset.cnaes.map(row => [row.code, row]));
  const buckets = new Map<string, string[]>();
  for (const company of scope.companies) {
    const code = matrices.get(company.id)?.cnaeMain ?? 'Não informado';
    buckets.set(code, [...(buckets.get(code) ?? []), company.id]);
  }
  return [...buckets].map(([id, companyIds]) => ({ id, label: cnaes.get(id)?.label ?? id, companyIds, value: companyIds.length })).sort((a, b) => b.value - a.value);
}

/** Territorial growth compares month-end snapshots and never attributes public jobs to CNPJs. */
export function buildMarketMunicipalGrowth(scope: Scope) {
  const months = distinct(scope.employment.map(row => row.month)).sort();
  const firstMonth = months[0]; const lastMonth = months.at(-1);
  if (!firstMonth || !lastMonth) return [];
  const compatible = selectScope(scope.dataset, { ...scope.filters, sizes: [], rfbStatuses: [], registrationStatuses: [], search: '' });
  const establishments = compatible.establishments.filter(row => !scope.filters.cnaeCodes.length || scope.filters.cnaeCodes.includes(row.cnaeMain));
  const establishmentsById = new Map(establishments.map(row => [row.id, row]));
  const registrations = scope.dataset.registrations.filter(row => establishmentsById.has(row.establishmentId));
  const registrationById = new Map(registrations.map(row => [row.id, row]));
  const movements = scope.dataset.movements.filter(row => registrationById.has(row.registrationId)).sort((a, b) => a.date.localeCompare(b.date));
  const companiesAt = (cutoff: string, cityId: string) => {
    const states = new Map<string, boolean>();
    for (const movement of movements) if (movement.date <= cutoff) states.set(movement.registrationId, movement.type === 'Novo registro' || movement.type === 'Reativação');
    return new Set(registrations.filter(row => states.get(row.id) && establishmentsById.get(row.establishmentId)?.cityId === cityId).map(row => row.companyId)).size;
  };
  return scope.dataset.cities.filter(city => scope.employment.some(row => row.cityId === city.id)).map(city => {
    const facts = scope.employment.filter(row => row.cityId === city.id);
    const first = sum(facts.filter(row => row.month === firstMonth), row => row.stock);
    const last = sum(facts.filter(row => row.month === lastMonth), row => row.stock);
    const companyFirst = companiesAt(monthEnd(firstMonth), city.id); const companyLast = companiesAt(monthEnd(lastMonth), city.id);
    return { id: city.id, label: city.name, firstMonth, lastMonth, employmentFirst: first, employmentLast: last,
      employmentChange: change(first, last), companyFirst, companyLast, companyChange: change(companyFirst, companyLast) };
  }).sort((a, b) => (b.employmentChange ?? -Infinity) - (a.employmentChange ?? -Infinity));
}

/** Cell denominator is distinct companies at municipality × principal CNAE. Cells are not additive. */
export function buildMarketCoverageCells(scope: Scope, cityIds: string[], cnaeCodes: string[]) {
  const registered = new Set(scope.registrations.map(row => row.companyId));
  return cityIds.flatMap((cityId, x) => cnaeCodes.map((cnae, y) => {
    const companyIds = distinct(scope.establishments.filter(row => row.cityId === cityId && row.cnaeMain === cnae).map(row => row.companyId));
    const matched = companyIds.filter(id => registered.has(id)).length;
    return { cityId, cnae, companyIds, matched, companies: companyIds.length, coverage: companyIds.length ? matched / companyIds.length * 100 : null, value: [x, y, companyIds.length ? Math.round(matched / companyIds.length * 100) : 0] as [number, number, number] };
  }));
}

export default function MarketReport({ scope, onDimension, onSubset, comparison }: ReportProps) {
  const facts = scope.employment;
  const months = useMemo(() => distinct(facts.map(row => row.month)).sort(), [facts]);
  const lastMonth = months.at(-1);
  const growth = useMemo(() => buildMarketMunicipalGrowth(scope), [scope]);
  const cities = useMemo(() => group(scope, 'city'), [scope]);
  const employmentMapRows = useMemo(() => buildEmploymentMapRows(scope), [scope]);
  const cityLookup = new Map(scope.dataset.cities.map(city => [city.id, city]));
  const cnaeLookup = new Map(scope.dataset.cnaes.map(row => [row.code, row]));
  const cityIds = cities.slice(0, 6).map(row => row.id);
  const heatCnaes = distinct(scope.establishments.map(row => row.cnaeMain)).map(code => ({ code, count: scope.establishments.filter(row => row.cnaeMain === code).length })).sort((a, b) => b.count - a.count).slice(0, 6).map(row => row.code);
  const cells = useMemo(() => buildMarketCoverageCells(scope, cityIds, heatCnaes), [scope, cityIds.join('|'), heatCnaes.join('|')]);
  const cboRows = useMemo(() => buildEmploymentOccupationRows(scope).slice(0, 6), [scope]);
  const occupationOption = combinedOption(cboRows.map(row => row.code), [
    { name: 'Estoque no último mês', type: 'bar', data: cboRows.map(row => row.stock), color: '#3662E2' },
    { name: 'Saldo no período', type: 'line', data: cboRows.map(row => row.balance), axis: 1, color: '#15265C' },
  ], ['Empregos', 'Saldo']);
  occupationOption.tooltip = { confine: true, trigger: 'axis', formatter: (params: any[]) => {
    const row = cboRows[params[0]?.dataIndex];
    return row ? `${row.label} · CBO ${row.code}<br/>Estoque em ${row.lastMonth}: ${num(row.stock)}<br/>Admissões no período: ${num(row.admissions)}<br/>Desligamentos no período: ${num(row.dismissals)}<br/>Saldo no período: ${num(row.balance)}<br/>${row.technical ? 'Ocupação técnica' : 'Demais ocupações'} · São Paulo · agregado demonstrativo` : '';
  } };
  const growthRows = growth.slice(0, 6);
  const companiesFirst = growth[0]?.firstMonth; const companiesLast = growth[0]?.lastMonth;
  const flowOption = combinedOption(months.map(month => `${month.slice(5)}/${month.slice(2, 4)}`), [
    { name: 'Admissões', type: 'bar', data: months.map(month => sum(facts.filter(row => row.month === month), row => row.admissions)), color: '#3662E2' },
    { name: 'Desligamentos', type: 'bar', data: months.map(month => sum(facts.filter(row => row.month === month), row => row.dismissals)), color: '#A4B5DA' },
    { name: 'Saldo', type: 'line', data: months.map(month => sum(facts.filter(row => row.month === month), row => row.admissions - row.dismissals)), axis: 1, color: '#0E1732' },
  ], ['Fluxos mensais', 'Saldo mensal']);
  if (comparison && months.length) {
    const before = new Date(Date.UTC(Number(months[0].slice(0, 4)), Number(months[0].slice(5, 7)) - 1 - months.length, 1));
    const previousMonths = months.map((_, index) => new Date(Date.UTC(before.getUTCFullYear(), before.getUTCMonth() + index, 1)).toISOString().slice(0, 7));
    const previous = scope.dataset.employment.filter(row => previousMonths.includes(row.month)
      && (!scope.filters.cityIds.length || scope.filters.cityIds.includes(row.cityId))
      && (!scope.filters.greIds.length || scope.filters.greIds.includes(cityLookup.get(row.cityId)?.greId ?? ''))
      && (!scope.filters.cnaeCodes.length || scope.filters.cnaeCodes.includes(row.cnae))
      && (!scope.filters.cboCodes.length || scope.filters.cboCodes.includes(row.cbo))
      && (!scope.filters.onlyRelated || ['Relacionado', 'Depende de análise'].includes(cnaeLookup.get(row.cnae)?.classification ?? '')));
    (flowOption.series as Record<string, unknown>[]).push({ name: 'Saldo anterior', type: 'line', yAxisIndex: 1,
      data: previousMonths.map(month => previous.some(row => row.month === month) ? sum(previous.filter(row => row.month === month), row => row.admissions - row.dismissals) : null),
      symbolSize: 3, itemStyle: { color: '#6077B6' }, lineStyle: { type: 'dashed', width: 2 } });
  }
  const companyScopeNote = scope.employmentScopeLimited ? 'Emprego responde a território/CNAE/CBO/período; recortes de empresas não identificam trabalhadores.' : 'Emprego agregado por município × CNAE × CBO; nenhum vínculo individual com empresa ou profissional.';
  const scatterOption = {
    tooltip: { confine: true, formatter: (p: any) => `${p.data.name}<br/>Empresas: ${num(p.value[0])}<br/>Cobertura: ${percent(p.value[1])}<br/>Empregos formais agregados: ${num(p.value[2])}` },
    grid: { top: 23, right: 12, bottom: 28, left: 0, containLabel: true },
    xAxis: { type: 'value', name: 'Empresas', nameLocation: 'middle', nameGap: 23, nameTextStyle: { fontSize: 10 }, splitNumber: 3, axisLabel: { fontSize: 10, formatter: (v: number) => compact(v) }, splitLine: { lineStyle: { color: '#EEF1F7' } } },
    yAxis: { type: 'value', name: 'Cobertura (%)', min: 0, max: 100, nameTextStyle: { fontSize: 10 }, splitNumber: 2, axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { color: '#EEF1F7' } } },
    series: scope.dataset.gres.map((gre, index) => ({ name: gre.name, type: 'scatter', symbolSize: (value: number[]) => Math.max(8, Math.min(28, Math.sqrt(value[2]) / 6)),
      itemStyle: { color: palette[index % palette.length], opacity: .76 }, emphasis: { label: { show: true, formatter: '{b}', position: 'top', fontSize: 10 } },
      data: cities.filter(row => cityLookup.get(row.id)?.greId === gre.id).map(row => ({ name: row.label, cityId: row.id, value: [row.companies, row.coverage, row.employment] })) })),
  };
  return <div className="r5-grid">
    <ReportPanel id="market-flows" step="01" wide title="O mercado está expandindo?" subtitle="Admissões e desligamentos em colunas; saldo em linha, no mesmo período." source={`RAIS/CAGED demonstrativos · ${months[0] ?? 'sem dados'} a ${lastMonth ?? 'sem dados'} · ${companyScopeNote}`}>
      <ReportChart option={flowOption} label="Admissões, desligamentos e saldo mensal do emprego formal" />
    </ReportPanel>
    <ReportPanel id="market-employment-map" step="02" title="Onde estão os empregos formais?" subtitle={`Estoque municipal · ${lastMonth ?? 'sem observação'} · São Paulo`} source={`Malha IBGE real · empregos demonstrativos no CNAE/CBO selecionado, incluindo ocupações não técnicas quando presentes · estoque do último mês, sem soma temporal. Porte/CNPJ/empresa não filtram trabalhadores agregados.`}>
      <MunicipalMap groups={employmentMapRows} metric="employment" onCity={id => onDimension('cityIds', [id])} />
    </ReportPanel>
    <ReportPanel id="market-occupations" step="03" title="Quais ocupações ganham espaço?" subtitle={`${cboRows.length} ocupações por estoque · empregos no último mês e saldo do período.`} source={`Fato de emprego agregado demonstrativo · competência ${lastMonth ?? 'sem dados'} · preparado para carga automática; origem real ainda não conectada. Não identifica trabalhadores, salário ou inscrição profissional.`}>
      <ReportChart option={occupationOption} label="Estoque final e saldo de empregos no período por CBO em São Paulo, dados demonstrativos" onPick={p => { const row = cboRows[p.dataIndex]; if (row) onDimension('cboCodes', [row.code]); }} />
    </ReportPanel>
    <ReportPanel id="market-regional-growth" step="04" wide title="Onde emprego e cadastro avançam juntos?" subtitle="Mesmos municípios e CNAE principal; crescimentos calculados sobre estoques iniciais próprios." source={`${companiesFirst ?? '—'} → ${companiesLast ?? '—'} · emprego agregado e empresas registradas distintas no fim do mês · filtros exclusivos de empresas não são atribuídos ao emprego.`}>
      <ReportChart option={combinedOption(growthRows.map(row => row.label), [
        { name: 'Emprego formal (%)', type: 'bar', data: growthRows.map(row => row.employmentChange), color: '#3662E2' },
        { name: 'Empresas com registro ativo (%)', type: 'line', data: growthRows.map(row => row.companyChange), color: '#15265C' },
      ], ['Variação (%)'])} label="Variação do emprego e de empresas com registro ativo por município" onPick={p => { const row = growthRows[p.dataIndex]; if (row) onDimension('cityIds', [row.id]); }} />
    </ReportPanel>
    <ReportPanel id="market-coverage" step="05" title="Como a cobertura varia?" subtitle="CNAE principal × município; célula = empresas localizadas / universo da célula." source="Receita/CREA demonstrativos · cobertura descritiva, sem conclusão de obrigação · branco sem universo; valores não são somáveis.">
      <ReportChart option={{ ...matrixOption(cityIds.map(id => cityLookup.get(id)?.name ?? id), heatCnaes, cells.filter(row => row.companies).map(row => row.value), 'Cobertura (%)'), visualMap: { show: false, min: 0, max: 100, inRange: { color: ['#F1F4FC', '#BACBEC', '#3662E2', '#15265C'] } }, tooltip: { confine: true, formatter: (p: any) => { const row = cells.find(row => row.value[0] === p.value[0] && row.value[1] === p.value[1]); return row ? `${cityLookup.get(row.cityId)?.name} · ${row.cnae}<br/>${cnaeLookup.get(row.cnae)?.label}<br/>Localizadas: ${num(row.matched)} / ${num(row.companies)}<br/>Cobertura: ${percent(row.coverage ?? 0)}` : ''; } } }} label="Matriz de cobertura cadastral por CNAE principal e município" onPick={p => { const row = cells.find(row => row.value[0] === p.value[0] && row.value[1] === p.value[1]); if (row) { onDimension('cityIds', [row.cityId]); onDimension('cnaeCodes', [row.cnae]); } }} />
    </ReportPanel>
    <ReportPanel id="market-concentration" step="06" title="Concentração × cobertura" subtitle="Cada bolha é um município; tamanho indica empregos formais; cor indica GRE." source={`Receita/CREA + emprego demonstrativos · estoque ${lastMonth ?? 'sem dados'} · município conecta as bases, não o CNPJ.`}>
      <ReportChart option={scatterOption} label="Dispersão entre quantidade de empresas, cobertura cadastral e estoque de empregos por município" onPick={p => { if (p.data?.cityId) onDimension('cityIds', [p.data.cityId]); }} />
    </ReportPanel>
  </div>;
}
