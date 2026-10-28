import { useMemo } from 'react';
import type { Scope } from '../domain/engine';
import { group, inWindow, isActiveLink, makeSeries } from '../domain/engine';
import { buildCrossBaseRows } from '../domain/cross-base';
import MunicipalMap from '../components/MunicipalMap';
import { ReportChart, ReportPanel, combinedOption, distinct, matrixOption, num, percent, treemapReportOption } from './primitives';
import type { ReportProps } from './primitives';

/** Each company traverses exactly one RT branch and one production branch. */
export function integratedCompanyFlow(scope: Scope) {
  const registered = new Set(scope.registrations.map(row => row.companyId));
  const rt = new Set(scope.technicalLinks.filter(row => isActiveLink(row, scope.anchor)).map(row => row.companyId));
  const art = new Set(scope.arts.map(row => row.companyId));
  const groups = [
    { name: 'RT vigente', ids: [...registered].filter(id => rt.has(id)) },
    { name: 'Demais vínculos', ids: [...registered].filter(id => !rt.has(id)) },
  ];
  const nodes = [{ name: 'Cadastro CREA', ids: [...registered] }, ...groups];
  const links: { source: string; target: string; value: number }[] = [];
  for (const item of groups) {
    if (!item.ids.length) continue;
    links.push({ source: 'Cadastro CREA', target: item.name, value: item.ids.length });
    for (const production of [true, false]) {
      const ids = item.ids.filter(id => art.has(id) === production);
      if (!ids.length) continue;
      const name = `${production ? 'ART no período' : 'Outras empresas'} · ${item.name === 'RT vigente' ? 'RT' : 'demais'}`;
      nodes.push({ name, ids });
      links.push({ source: item.name, target: name, value: ids.length });
    }
  }
  return { nodes: nodes.filter(row => row.ids.length), links, total: registered.size };
}

/** One territorial assignment per company; linked facts keep their own counting units. */
export function joinedCompanyRegions(scope: Scope) {
  const registered = new Set(scope.registrations.map(row => row.companyId));
  const rt = new Set(scope.technicalLinks.filter(row => isActiveLink(row, scope.anchor)).map(row => row.companyId));
  const arts = new Set(scope.arts.map(row => row.companyId));
  const caos = new Set(scope.caos.filter(row => inWindow(row.issuedAt, scope.filters.period, scope.anchor)).map(row => row.companyId));
  const contracts = new Set(scope.contracts.map(row => row.companyId));
  const dims = [registered, rt, arts, caos, contracts];
  const assignments = new Map<string, string>();
  for (const company of scope.companies) {
    const branches = scope.establishments.filter(row => row.companyId === company.id);
    const establishment = branches.find(row => row.branch === 'Matriz') ?? branches[0];
    if (establishment) assignments.set(company.id, establishment.greId);
  }
  return scope.dataset.gres.map(gre => {
    const ids = [...assignments].filter(([, id]) => id === gre.id).map(([id]) => id);
    return { id: gre.id, label: gre.name.replace(/^GRE\s*\d+\s*[-–·]?\s*/, ''), companyIds: ids, dimensions: dims.map(set => ids.filter(id => set.has(id))) };
  }).filter(row => row.companyIds.length).sort((a, b) => b.companyIds.length - a.companyIds.length);
}

export default function OverviewReport({ scope, comparison, onDimension, onSubset }: ReportProps) {
  const series = useMemo(() => makeSeries(scope), [scope]);
  const flow = useMemo(() => integratedCompanyFlow(scope), [scope]);
  const regions = useMemo(() => joinedCompanyRegions(scope), [scope]);
  const cross = useMemo(() => buildCrossBaseRows(scope), [scope]);
  const cityGroups = useMemo(() => group(scope, 'city'), [scope]);
  const activities = new Map<string, string[]>();
  for (const company of scope.companies) {
    const establishments = scope.establishments.filter(row => row.companyId === company.id);
    const main = establishments.find(row => row.branch === 'Matriz') ?? establishments[0];
    if (main) activities.set(main.cnaeMain, [...(activities.get(main.cnaeMain) ?? []), company.id]);
  }
  const sectorRows = [...activities].sort((a, b) => b[1].length - a[1].length);
  const shownSectors = sectorRows.slice(0, 6).map(([id, ids]) => ({ id, name: id, value: ids.length }));
  const remaining = distinct(sectorRows.slice(6).flatMap(([, ids]) => ids));
  if (remaining.length) shownSectors.push({ id: 'others', name: 'Outros CNAEs', value: remaining.length });
  const registrationIds = new Set(scope.registrations.map(row => row.id));
  const historic = scope.dataset.movements.filter(row => registrationIds.has(row.registrationId));
  const previousRows = comparison ? series.map(row => {
    const start = new Date(`${row.date}T00:00:00Z`); start.setUTCMonth(start.getUTCMonth() - scope.filters.period);
    const next = new Date(start); next.setUTCMonth(next.getUTCMonth() + 1);
    return historic.filter(movement => movement.type === 'Novo registro' && movement.date >= start.toISOString().slice(0, 10) && movement.date < next.toISOString().slice(0, 10)).length;
  }) : [];
  const evolution = combinedOption(series.map(row => row.label), [
    { name: 'Novos registros', type: 'bar', data: series.map(row => row.newRegistrations), color: '#3662E2' },
    { name: 'Baixas + cancelamentos', type: 'bar', data: series.map(row => row.closures + row.cancellations), color: '#A4B5DA' },
    { name: 'Base ativa', type: 'line', axis: 1, data: series.map(row => row.base), color: '#15265C' },
    ...(comparison ? [{ name: 'Novos · janela anterior', type: 'line' as const, data: previousRows, color: '#6077B6', dashed: true }] : []),
  ], ['Movimentos', 'Registros ativos']);
  const flowOption = { tooltip: { trigger: 'item', confine: true, formatter: (p: any) => p.dataType === 'edge' ? `${p.data.source} → ${p.data.target}<br/>${num(p.data.value)} empresas` : `${p.name}<br/>${num(flow.nodes.find(row => row.name === p.name)?.ids.length ?? 0)} empresas` }, series: [{ type: 'sankey', left: 5, right: 120, top: 8, bottom: 8, nodeWidth: 10, nodeGap: 13, layoutIterations: 32, emphasis: { focus: 'adjacency' }, label: { fontSize: 10, width: 130, overflow: 'break' }, lineStyle: { color: 'source', opacity: .20, curveness: .48 }, itemStyle: { borderWidth: 0 }, data: flow.nodes.map((row, index) => ({ name: row.name, itemStyle: { color: ['#15265C', '#3662E2', '#6077B6', '#15265C', '#A4B5DA', '#3662E2', '#A4B5DA'][index] } })), links: flow.links }] };
  const growth = { tooltip: { confine: true, formatter: (p: any) => `${p.name}<br/>Emprego agregado: ${percent(p.value[0])}<br/>Registros ativos: ${percent(p.value[1])}<br/>Empresas no recorte: ${num(p.value[2])}` }, grid: { top: 22, right: 10, bottom: 30, left: 4, containLabel: true }, xAxis: { type: 'value', name: 'Emprego %', nameLocation: 'middle', nameGap: 21, nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 10 }, splitNumber: 3, splitLine: { lineStyle: { color: '#EEF1F7' } } }, yAxis: { type: 'value', name: 'Cadastro %', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 10 }, splitNumber: 3, splitLine: { lineStyle: { color: '#EEF1F7' } } }, series: [{ type: 'scatter', symbolSize: (values: number[]) => Math.max(9, Math.min(28, Math.sqrt(values[2]) * 1.2)), itemStyle: { color: '#3662E2', opacity: .75 }, data: cross.filter(row => row.employmentChange !== null && row.registrationChange !== null).map(row => ({ id: row.id, name: row.label, value: [row.employmentChange, row.registrationChange, row.companies] })), markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: '#9DACC6', type: 'dashed' }, data: [{ xAxis: 0 }, { yAxis: 0 }] } }] };
  const selectedRegions = regions.slice(0, 6);
  const columns = ['Cadastro', 'RT', 'ART', 'CAO', 'Contrato'];
  const cells: [number, number, number][] = selectedRegions.flatMap((row, y) => row.dimensions.map((ids, x) => [x, y, ids.length] as [number, number, number]));
  return <div className="r5-grid">
    <ReportPanel id="overview-evolution" wide step="01" title="Como a base está evoluindo?" subtitle="Movimentos e estoque no mesmo eixo temporal" source="CREA simulado · colunas = eventos; linha = registros ativos · séries derivadas do livro de movimentos"><ReportChart option={evolution} label="Gráfico combinado de novos registros, baixas e estoque de registros ativos" onPick={p => { const row = series.find(item => item.label === p.name); if (row) onSubset(scope.movements.filter(item => item.date.startsWith(row.date.slice(0, 7))).map(item => item.companyId), `Movimentos · ${row.label}`, 'Empresas dos eventos do mês selecionado; filtros sincronizados.'); }} /></ReportPanel>
    <ReportPanel id="overview-map" step="02" title="Onde está a atividade?" subtitle="Empresas por município · São Paulo" source="Malha IBGE oficial · 24 municípios com amostra empresarial demonstrativa"><MunicipalMap groups={cityGroups} metric="companies" onCity={id => onDimension('cityIds', [id])} /></ReportPanel>
    <ReportPanel id="overview-sectors" step="02" title="Quais setores compõem a base?" subtitle="Uma atividade da matriz por empresa" source="CNPJ da empresa → CNAE principal da matriz visível; CNAE não determina obrigação de registro"><ReportChart option={treemapReportOption(shownSectors, 'Empresas distintas')} label="Treemap reconciliado de empresas por CNAE principal da matriz" onPick={p => { if (p.data?.id === 'others') onSubset(remaining, 'Outros CNAEs principais', 'Categorias fora dos seis maiores CNAEs da matriz.'); else if (p.data?.id) onDimension('cnaeCodes', [p.data.id]); }} /></ReportPanel>
    <ReportPanel id="overview-relations" wide step="03" title="Cadastro → vínculo técnico → produção" subtitle="Os mesmos CNPJs atravessam as três camadas" source="CREA simulado · unidade: empresa distinta em cada camada · presença de ART não atribui sua autoria ao RT"><ReportChart option={flowOption} label="Sankey integrado de empresas registradas, vínculos vigentes e ARTs no período" onPick={p => { const node = flow.nodes.find(row => row.name === p.name); if (node) onSubset(node.ids, node.name, 'Empresas ligadas por chaves internas de registro, vínculo e ART; não é fluxo de pessoas.'); }} /></ReportPanel>
    <ReportPanel id="overview-growth" step="03" title="Economia e cadastro convergem?" subtitle="Variação regional · empregos × registros" source="GRE demonstrativa · comparação dos mesmos fins de mês · emprego agregado não é vínculo com CNPJ"><ReportChart option={growth} label="Dispersão integrada do crescimento do emprego e dos registros por GRE" onPick={p => { if (p.data?.id) onDimension('greIds', [p.data.id]); }} /></ReportPanel>
    <ReportPanel id="overview-cross-matrix" step="04" title="Onde as fontes se encontram?" subtitle="Empresas com fatos relacionados · maiores GREs" source="Uma GRE por empresa, pela matriz visível · cada coluna mede presença de seu fato, não eventos"><ReportChart option={matrixOption(columns, selectedRegions.map(row => row.label), cells, 'Empresas')} label="Matriz de empresas compartilhadas entre cadastro, RT, ART, CAO e contratação por GRE" onPick={p => { const [x, y] = p.value; const row = selectedRegions[y]; if (row) onSubset(row.dimensions[x], `${columns[x]} · ${row.label}`, 'Interseção dos mesmos CNPJs com o fato e a região escolhidos.'); }} /></ReportPanel>
  </div>;
}
