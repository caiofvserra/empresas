import { useMemo } from 'react';
import { ReportChartV9 as ReportChart } from './chart-design-v9';
import { isActiveLink, windowBounds } from '../domain/engine';
import type { Scope } from '../domain/engine';
import { combinedOption, compact, currency, distinct, matrixOption, num, palette, percent, ReportPanel, treemapReportOption } from './primitives';
import type { ReportProps } from './primitives';

const sum = <T,>(rows: T[], value: (row: T) => number) => rows.reduce((total, row) => total + value(row), 0);
const shortMonth = (month: string) => `${month.slice(5, 7)}/${month.slice(2, 4)}`;

/** All views use explicit supplier, establishment, RT and ART keys from the same relational scope.
 * Contract objects and supplier activity do not establish an automatic duty to register. */
export function buildContractAnalysis(scope: Scope) {
  const companyById = new Map(scope.companies.map(row => [row.id, row]));
  const establishmentById = new Map(scope.dataset.establishments.map(row => [row.id, row]));
  const mainByCompany = new Map(scope.dataset.establishments.filter(row => row.branch === 'Matriz').map(row => [row.companyId, row]));
  const activeLinks = scope.technicalLinks.filter(row => isActiveLink(row, scope.anchor));
  const rtCompanies = new Set(activeLinks.map(row => row.companyId));
  const artCompanies = new Set(scope.arts.map(row => row.companyId));
  const registered = new Set(scope.registrations.map(row => row.companyId));
  const { start, end } = windowBounds(scope.filters.period, scope.anchor);
  const months = scope.dataset.months.filter(month => month >= start.slice(0, 7) && month <= end.slice(0, 7));
  const monthly = months.map(month => {
    const rows = scope.contracts.filter(row => row.date.slice(0, 7) === month);
    const previousMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 - scope.filters.period, 1)).toISOString().slice(0, 7);
    const previousRows = scope.dataset.contracts.filter(row => scope.establishmentIds.has(row.establishmentId) && row.date.slice(0, 7) === previousMonth);
    return { month, rows, value: sum(rows, row => row.value), count: rows.length, previousMonth, previousRows, previousValue: sum(previousRows, row => row.value) };
  });
  const suppliers = distinct(scope.contracts.map(row => row.companyId)).map(id => {
    const rows = scope.contracts.filter(row => row.companyId === id);
    return { id, label: companyById.get(id)?.tradeName ?? companyById.get(id)?.name ?? id, value: sum(rows, row => row.value), count: rows.length };
  }).sort((a, b) => b.value - a.value);
  const totalValue = sum(suppliers, row => row.value);
  let cumulative = 0;
  const pareto = suppliers.slice(0, 8).map(row => { cumulative += row.value; return { ...row, cumulative: totalValue ? cumulative / totalValue * 100 : 0 }; });
  const regions = scope.dataset.gres.map(gre => {
    const rows = scope.contracts.filter(row => establishmentById.get(row.establishmentId)?.greId === gre.id);
    const ids = distinct(rows.map(row => row.companyId));
    return { id: gre.id, label: gre.name.replace('GRE ', ''), ids, suppliers: ids.length, registered: ids.filter(id => registered.has(id)).length, rt: ids.filter(id => rtCompanies.has(id)).length, art: ids.filter(id => artCompanies.has(id)).length, value: sum(rows, row => row.value) };
  }).filter(row => row.suppliers > 0).sort((a, b) => b.value - a.value);
  const cnaes = distinct(suppliers.map(row => mainByCompany.get(row.id)?.cnaeMain).filter((code): code is string => Boolean(code))).map(code => {
    const ids = suppliers.filter(row => mainByCompany.get(row.id)?.cnaeMain === code).map(row => row.id);
    const rows = scope.contracts.filter(row => ids.includes(row.companyId));
    const arts = scope.arts.filter(row => ids.includes(row.companyId));
    return { code, ids, supplierCount: ids.length, value: sum(rows, row => row.value), arts: arts.length, rt: ids.filter(id => rtCompanies.has(id)).length };
  }).sort((a, b) => b.value - a.value);
  const categories = distinct(scope.contracts.map(row => row.category)).map(id => {
    const rows = scope.contracts.filter(row => row.category === id);
    return { id, name: id, value: sum(rows, row => row.value), count: rows.length,
      companyIds: distinct(rows.map(row => row.companyId)) };
  }).sort((a, b) => b.value - a.value);
  const municipalities = distinct(scope.contracts.map(row => establishmentById.get(row.establishmentId)!.cityId)).map(id => {
    const rows = scope.contracts.filter(row => establishmentById.get(row.establishmentId)?.cityId === id);
    return { id, name: scope.dataset.cities.find(city => city.id === id)!.name,
      value: sum(rows, row => row.value), count: rows.length };
  }).sort((a, b) => b.value - a.value);
  const cells = municipalities.flatMap((city, y) => categories.map((category, x) => {
    const rows = scope.contracts.filter(row => establishmentById.get(row.establishmentId)?.cityId === city.id && row.category === category.id);
    return { cityId: city.id, category: category.id, amount: sum(rows, row => row.value),
      companyIds: distinct(rows.map(row => row.companyId)), contractIds: rows.map(row => row.id),
      value: [x, y, rows.length] as [number, number, number] };
  }));
  return { monthly, suppliers, pareto, totalValue, regions, cnaes, categories, municipalities, cells, rtCompanies, artCompanies };
}

export default function ContractsReport({ scope, comparison, onDimension, onSubset }: ReportProps) {
  const view = useMemo(() => buildContractAnalysis(scope), [scope]);
  const regions = view.regions.slice(0, 8);
  const cnaes = view.cnaes.slice(0, 16);
  const municipalities = view.municipalities.slice(0, 6);
  const cells = view.cells.filter(row => municipalities.some(city => city.id === row.cityId));
  const selectCompanies = (ids: string[], label: string, reason: string) => onSubset(distinct(ids), label, reason);
  const sourceDemo = `Contratos demonstrativos · competência ${scope.anchor} · rotina prevista: API → camada curada; cadastro/RT/ART via SQL Server ou DB2 + gateway. Fontes de produção ainda não conectadas.`;
  const paretoOption = combinedOption(view.pareto.map(row => row.label), [
    { name: 'Valor contratado', type: 'bar', data: view.pareto.map(row => row.value), color: '#3662E2' },
    { name: '% acumulado do valor total', type: 'line', data: view.pareto.map(row => row.cumulative), axis: 1, color: '#FFB001' },
  ], ['R$', '%']);
  paretoOption.tooltip = { trigger: 'axis', confine: true, formatter: (params: any[]) => {
    const row = view.pareto[params[0]?.dataIndex];
    return row ? `${row.label}<br/>${currency(row.value)} · ${num(row.count)} contratos<br/>Acumulado: ${percent(row.cumulative)} do valor de todos os fornecedores` : '';
  } };
  paretoOption.yAxis = [
    { type: 'value', name: 'R$', splitNumber: 3, axisLabel: { fontSize: 10, formatter: compact }, splitLine: { lineStyle: { color: '#EEF1F7' } } },
    { type: 'value', name: '%', min: 0, max: 100, splitNumber: 2, axisLabel: { fontSize: 10, formatter: '{value}%' }, splitLine: { show: false } },
  ];

  const categoryOption = treemapReportOption(view.categories, 'Valor contratado (R$)');
  (categoryOption.series as Record<string, unknown>[])[0].color = ['#3662E2', '#15265C', '#254AAD', '#395386', '#0E1732'];
  categoryOption.tooltip = { confine: true, formatter: (params: any) => {
    const row = view.categories.find(category => category.id === params.data?.id);
    return row ? `${row.name}<br/>${currency(row.value)} · ${num(row.count)} contratos<br/>${num(row.companyIds.length)} fornecedores distintos<br/>Seleção investiga os fornecedores da categoria; outros contratos desses fornecedores permanecem no recorte.` : '';
  } };

  return <div className="r5-grid">
    <ReportPanel id="contracts-evolution" step="01" title="Demanda pública: valor e volume" subtitle={`${num(scope.contracts.length)} contratos · ${num(view.suppliers.length)} fornecedores · ${currency(view.totalValue)}`} source={sourceDemo} wide>
      <ReportChart label="Evolução mensal combinada do valor contratado e da quantidade de contratos demonstrativos" option={combinedOption(view.monthly.map(row => shortMonth(row.month)), [
        { name: 'Valor contratado', type: 'bar', data: view.monthly.map(row => row.value), color: '#3662E2' },
        { name: 'Quantidade de contratos', type: 'line', data: view.monthly.map(row => row.count), axis: 1, color: '#FFB001' },
        ...(comparison ? [{ name: 'Valor · janela anterior', type: 'line' as const, data: view.monthly.map(row => row.previousMonth < scope.dataset.months[0] ? null : row.previousValue), color: '#15265C', dashed: true }] : []),
      ], ['R$', 'Contratos'])} onPick={params => {
        const row = view.monthly[params.dataIndex];
        if (!row) return;
        const previous = params.seriesName === 'Valor · janela anterior';
        selectCompanies((previous ? row.previousRows : row.rows).map(contract => contract.companyId), `Fornecedores · ${shortMonth(previous ? row.previousMonth : row.month)}`, 'Empresas fornecedoras dos contratos do mês selecionado. Outros fatos dessas empresas permanecem relacionados no período global.');
      }} />
    </ReportPanel>

    <ReportPanel id="contracts-concentration" step="02" title="Quem concentra o valor?" subtitle={`8 maiores fornecedores · participação sobre ${currency(view.totalValue)}`} source={sourceDemo}>
      <ReportChart label="Pareto combinado dos oito maiores fornecedores e sua participação acumulada no valor total" option={paretoOption} onPick={params => { const row = view.pareto[params.dataIndex]; if (row) selectCompanies([row.id], row.label, 'Fornecedor selecionado pelo valor contratado. RT, ART e demais fatos usam a chave empresarial explícita.'); }} />
    </ReportPanel>

    <ReportPanel id="contracts-objects" step="03" title="Que demanda movimenta o mercado?" subtitle="Área proporcional ao valor dos contratos, por categoria de objeto." source={`${sourceDemo} Categorias demonstrativas; classificação do objeto exige validação e não conclui obrigação de registro.`}>
      <ReportChart label="Treemap do valor contratado por categoria de objeto na base relacional demonstrativa" option={categoryOption} onPick={params => {
        const row = view.categories.find(category => category.id === params.data?.id);
        if (row) selectCompanies(row.companyIds, `Fornecedores · ${row.name}`, 'Empresas fornecedoras da categoria de objeto selecionada. A seleção acompanha empresas; demais contratos e fatos delas continuam relacionados no período global.');
      }} />
    </ReportPanel>

    <ReportPanel id="contracts-technical-relations" step="04" title="Fornecedor → cadastro → produção técnica" subtitle="Empresas distintas por GRE do estabelecimento contratado · categorias podem se sobrepor" source={`${sourceDemo} · RT vigente na competência; ART registrada no período`} wide>
      <ReportChart label="Gráfico combinado de fornecedores, empresas com registro, responsável técnico vigente e ART por região" option={combinedOption(regions.map(row => row.label), [
        { name: 'Fornecedores', type: 'bar', data: regions.map(row => row.suppliers), color: '#A4B5DA' },
        { name: 'Com registro CREA', type: 'bar', data: regions.map(row => row.registered), color: '#3662E2' },
        { name: 'Com RT vigente', type: 'line', data: regions.map(row => row.rt), color: '#15265C' },
        { name: 'Com ART no período', type: 'line', data: regions.map(row => row.art), color: '#FFB001' },
      ], ['Empresas'])} onPick={params => { const row = regions[params.dataIndex]; if (row) onDimension('greIds', [row.id]); }} />
    </ReportPanel>

    <ReportPanel id="contracts-territorial-matrix" step="05" title="Onde a demanda encontra fornecedores?" subtitle="Município do estabelecimento fornecedor × categoria · 6 maiores valores." source={`${sourceDemo} Município é do fornecedor contratado, não localização da obra ou sede do órgão; cada contrato ocupa uma célula.`}>
      <ReportChart label="Matriz de contratos por município do estabelecimento fornecedor e categoria de objeto, dados demonstrativos" option={{ ...matrixOption(view.categories.map(row => row.name), municipalities.map(row => row.name), cells.map(row => row.value), 'Contratos'),
        tooltip: { confine: true, formatter: (params: any) => {
          const row = cells.find(cell => cell.value[0] === params.value[0] && cell.value[1] === params.value[1]);
          const city = row && municipalities.find(item => item.id === row.cityId);
          return row ? `${city?.name} · ${row.category}<br/>${num(row.contractIds.length)} contratos · ${currency(row.amount)}<br/>${num(row.companyIds.length)} fornecedores distintos` : '';
        } } }} onPick={params => {
        const row = cells.find(cell => cell.value[0] === params.value?.[0] && cell.value[1] === params.value?.[1]);
        if (!row) return;
        onDimension('cityIds', [row.cityId]);
        selectCompanies(row.companyIds, `Fornecedores · ${row.category}`, 'Empresas dos contratos da célula município do estabelecimento fornecedor × categoria. Outros contratos dessas empresas no município e período continuam relacionados.');
      }} />
    </ReportPanel>

    <ReportPanel id="contracts-cnae-production" step="06" title="Escala contratual × acervo empresarial" subtitle="CNAE principal da matriz · tamanho: fornecedores · cor: proporção com RT vigente" source={`${sourceDemo} · vínculo descritivo; ARTs não são atribuídas ao contrato público`}>
      <ReportChart label="Dispersão do valor contratado e das ARTs das empresas por CNAE principal com tamanho representando fornecedores" option={{
        tooltip: { confine: true, formatter: (params: any) => {
          const row = cnaes[params.dataIndex];
          return row ? `${row.code}<br/>${num(row.supplierCount)} fornecedores · ${currency(row.value)}<br/>${num(row.arts)} ARTs das empresas no período<br/>${num(row.rt)} fornecedores com RT vigente<br/>Não demonstra que essas ARTs pertençam aos contratos.` : '';
        } },
        grid: { top: 25, bottom: 38, left: 8, right: 12, containLabel: true },
        xAxis: { type: 'value', name: 'Valor contratado (R$)', nameLocation: 'middle', nameGap: 25, nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 10, formatter: compact }, splitLine: { lineStyle: { color: '#EEF1F7' } } },
        yAxis: { type: 'value', name: 'ARTs das empresas', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 10, formatter: compact }, splitLine: { lineStyle: { color: '#EEF1F7' } } },
        series: [{ type: 'scatter', data: cnaes.map(row => ({ name: row.code, value: [row.value, row.arts, row.supplierCount], itemStyle: { color: row.rt / Math.max(1, row.supplierCount) >= .5 ? palette[0] : palette[2], opacity: .8 } })), symbolSize: (values: number[]) => Math.max(8, Math.min(32, Math.sqrt(values[2]) * 5)), emphasis: { label: { show: true, formatter: '{b}', position: 'top', fontSize: 10 } } }],
      }} onPick={params => { const row = cnaes[params.dataIndex]; if (row) { onDimension('cnaeCodes', [row.code]); selectCompanies(row.ids, `Fornecedores · CNAE ${row.code}`, 'Empresas fornecedoras com este CNAE principal na matriz; ARTs relacionadas pertencem às empresas e não foram atribuídas ao contrato público.'); } }} />
    </ReportPanel>
  </div>;
}
