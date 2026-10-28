import { useMemo } from 'react';
import { ReportChartV9 as ReportChart } from './chart-design-v9';
import { Info } from 'lucide-react';
import { buildDigitalInspection, digitalMatchLabels } from '../domain/digital-inspection';
import type { DigitalInspectionAnalysis, DigitalInspectionCompany, DigitalMatch } from '../domain/digital-inspection';
import { combinedOption, compact, currency, distinct, horizontalOption, matrixOption, num, percent, ReportPanel } from './primitives';
import type { ReportProps } from './primitives';

export function buildDigitalMatchingFlow(view: DigitalInspectionAnalysis) {
  const nodes: { name: string; ids: string[]; depth: number; itemStyle: { color: string } }[] = [];
  const links: { source: string; target: string; value: number; companyIds: string[] }[] = [];
  const add = (name: string, rows: DigitalInspectionCompany[], depth: number, color: string) => {
    if (rows.length) nodes.push({ name, ids: rows.map(row => row.companyId), depth, itemStyle: { color } });
  };
  const link = (source: string, target: string, rows: DigitalInspectionCompany[]) => {
    if (rows.length) links.push({ source, target, value: rows.length, companyIds: rows.map(row => row.companyId) });
  };
  const exact = view.companies.filter(row => row.match.startsWith('exact'));
  const root = view.companies.filter(row => row.match === 'root-suggestion');
  const none = view.companies.filter(row => row.match === 'none');
  const active = exact.filter(row => row.match === 'exact-active');
  const inactive = exact.filter(row => row.match === 'exact-inactive');
  const rt = active.filter(row => row.activeRtIds.length);
  const withoutRt = active.filter(row => !row.activeRtIds.length);
  add('RFB ativa + CNAE', view.companies, 0, '#FFB001');
  add('CNPJ exato', exact, 1, '#3662E2'); add('Somente raiz', root, 1, '#A4B5DA'); add('Não localizado', none, 1, '#BFC9DE');
  add('Registro vigente', active, 2, '#3662E2'); add('Sem vigência', inactive, 2, '#6077B6');
  add('RT identificado', rt, 3, '#15265C'); add('RT não identificado', withoutRt, 3, '#A4B5DA');
  link('RFB ativa + CNAE', 'CNPJ exato', exact); link('RFB ativa + CNAE', 'Somente raiz', root); link('RFB ativa + CNAE', 'Não localizado', none);
  link('CNPJ exato', 'Registro vigente', active); link('CNPJ exato', 'Sem vigência', inactive);
  link('Registro vigente', 'RT identificado', rt); link('Registro vigente', 'RT não identificado', withoutRt);
  return { nodes, links, total: view.companies.length };
}

/** Read-only digital evidence. No departmental productivity, arbitrary scoring,
 * process operations or inferred worker-to-CNPJ relationships. */
export default function InspectionReport({ scope, onDimension, onSubset, onInfo }: ReportProps) {
  const view = useMemo(() => buildDigitalInspection(scope), [scope]);
  const flow = useMemo(() => buildDigitalMatchingFlow(view), [view]);
  const regional = view.regions.slice(0, 8);
  const cnaes = view.cnaes.slice(0, 7);
  const choose = (ids: string[], label: string, criteria: string) => onSubset(distinct(ids), label, `${criteria} Universo: RFB ativa e CNAE principal/secundário selecionado, na competência ${scope.anchor}. Evidência para revisão; não conclui obrigação ou infração.`);
  const info = <button className="r5-icon" title="Abrir evidências, critérios e IDs da origem" aria-label="Abrir evidências da fiscalização digital" onClick={() => onInfo('digital-evidence')}><Info size={17} /></button>;
  const flowOption: Record<string, unknown> = {
    tooltip: { confine: true, formatter: (params: any) => {
      const data = params.data; const ids = data.companyIds ?? data.ids ?? [];
      return `${data.source ? `${data.source} → ${data.target}` : data.name}<br/>${num(ids.length)} empresas distintas<br/>CNPJ completo confirma identidade; raiz é somente sugestão.<br/>Vigência e RT observados na competência; não são decisão jurídica.`;
    } },
    series: [{ type: 'sankey', data: flow.nodes, links: flow.links, draggable: false, layoutIterations: 0,
      left: 18, right: 123, top: 32, bottom: 7, nodeWidth: 8, nodeGap: 20,
      label: { color: '#253859', fontSize: 10, lineHeight: 13, width: 116, overflow: 'truncate', formatter: (params: any) => `${params.data.name}\n${num(params.data.ids.length)}` },
      emphasis: { focus: 'adjacency' }, lineStyle: { color: 'source', opacity: .27, curveness: .42 },
    }],
  };
  const regionalOption = combinedOption(regional.map(row => row.label.replace('GRE ', '')), [
    { name: 'CNPJ exato', type: 'bar', stack: 'match', color: '#3662E2', data: regional.map(row => row.exactActiveIds.length + row.exactInactiveIds.length) },
    { name: 'Somente raiz', type: 'bar', stack: 'match', color: '#A4B5DA', data: regional.map(row => row.rootSuggestionIds.length) },
    { name: 'Não localizado', type: 'bar', stack: 'match', color: '#CCD5E7', data: regional.map(row => row.noCorrespondenceIds.length) },
    { name: '% correspondência exata', type: 'line', axis: 1, color: '#FFB001', data: regional.map(row => row.coverage) },
  ], ['Empresas', '%']);
  regionalOption.yAxis = [
    { type: 'value', name: 'Empresas', splitNumber: 3, axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { color: '#EEF1F7' } } },
    { type: 'value', name: '%', min: 0, max: 100, splitNumber: 2, axisLabel: { fontSize: 10, formatter: '{value}%' }, splitLine: { show: false } },
  ];
  regionalOption.tooltip = { trigger: 'axis', confine: true, formatter: (params: any[]) => {
    const row = regional[params[0]?.dataIndex];
    return row ? `${row.label}<br/>${num(row.companyIds.length)} empresas no universo territorial<br/>${num(row.exactActiveIds.length + row.exactInactiveIds.length)} com CNPJ exato · ${num(row.rootSuggestionIds.length)} somente raiz<br/>${num(row.noCorrespondenceIds.length)} não localizadas · correspondência ${percent(row.coverage ?? 0)}<br/>Empresa pode ter estabelecimentos em mais de uma GRE; não somar regiões.<br/>Correspondência não equivale a vigência ou cobertura de obrigação.` : '';
  } };
  const columns = [
    { label: 'Não localizado', criterion: (row: DigitalInspectionCompany) => row.match === 'none', rule: 'DIG-01' },
    { label: 'Só raiz', criterion: (row: DigitalInspectionCompany) => row.match === 'root-suggestion', rule: 'DIG-02' },
    { label: 'Objeto + sem vigência', criterion: (row: DigitalInspectionCompany) => row.signals.some(signal => signal.ruleId === 'DIG-04'), rule: 'DIG-04' },
    { label: 'Vigente + sem RT', criterion: (row: DigitalInspectionCompany) => row.signals.some(signal => signal.ruleId === 'DIG-05'), rule: 'DIG-05' },
  ];
  const cells = cnaes.flatMap((cnae, y) => columns.map((column, x) => ({ x, y, code: cnae.code, rule: column.rule,
    ids: view.companies.filter(row => row.cnaeCodes.includes(cnae.code) && column.criterion(row)).map(row => row.companyId) })));
  const heatOption = matrixOption(columns.map(row => row.label), cnaes.map(row => row.code), cells.map(row => [row.x, row.y, row.ids.length]), 'Empresas com a evidência');
  heatOption.tooltip = { confine: true, formatter: (params: any) => {
    const row = cells.find(cell => cell.x === params.value?.[0] && cell.y === params.value?.[1]); const cnae = row && cnaes.find(item => item.code === row.code);
    return row ? `${row.code} · ${cnae?.label}<br/>${columns[row.x].label}: ${num(row.ids.length)} empresas<br/>Regra ${row.rule}; principal e secundários preservados.<br/>Uma empresa pode ocupar vários CNAEs e evidências; células não são aditivas.<br/>Clique para consultar o conjunto exato e os critérios.` : '';
  } };
  const eligibleIds = new Set(view.companies.map(row => row.companyId));
  const companyById = new Map(view.companies.map(row => [row.companyId, row]));
  const technicalContracts = view.contracts.filter(row => row.classification.engineering && eligibleIds.has(row.contract.companyId));
  const contractGroups = ['exact-active', 'exact-inactive', 'root-suggestion', 'none'].map(match => {
    const records = technicalContracts.filter(row => companyById.get(row.contract.companyId)?.match === match);
    return { id: match, name: digitalMatchLabels[match as DigitalMatch], records, value: records.reduce((total, row) => total + row.contract.value, 0), ids: distinct(records.map(row => row.contract.companyId)) };
  }).filter(row => row.records.length);
  const contractOption: Record<string, unknown> = {
    tooltip: { confine: true, formatter: (params: any) => {
      const row = contractGroups.find(group => group.id === params.data?.id);
      return row ? `${row.name}<br/>${currency(row.value)} · ${num(row.records.length)} contratos · ${num(row.ids.length)} fornecedores<br/>Texto contém: ${distinct(row.records.flatMap(record => record.classification.terms)).join(', ')}<br/>Dicionário textual demonstrativo, sem IA treinada.<br/>Cadastro observado na competência. Vínculo contrato↔ART não disponível.` : '';
    } },
    series: [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, left: 0, right: 0, top: 0, bottom: 0,
      data: contractGroups.map(row => ({ id: row.id, name: row.name, value: row.value })),
      label: { color: '#fff', fontSize: 11, lineHeight: 15, overflow: 'truncate', formatter: (params: any) => {
        const names: Record<string, string> = { 'exact-active': 'CNPJ exato\nRegistro vigente', 'exact-inactive': 'CNPJ exato\nSem vigência', 'root-suggestion': 'Somente raiz\nRevisar', none: 'Não localizado' };
        return `${names[params.data.id] ?? params.name}\n${currency(params.value)}`;
      } },
      itemStyle: { borderWidth: 3, borderColor: '#fff' }, color: ['#3662E2', '#15265C', '#395386', '#4A63A2'],
    }],
  };
  const context = view.employmentContext.filter(row => row.coverage !== null);
  const cityById = new Map(context.map(row => [row.cityId, row]));
  const scatterOption: Record<string, unknown> = {
    tooltip: { confine: true, formatter: (params: any) => {
      const row = cityById.get(params.data?.id);
      return row ? `${row.name} · ${row.greId}<br/>Saldo setorial no período: ${num(row.balance)} empregos<br/>Estoque no mês ${row.lastMonth}: ${num(row.stock)}<br/>${num(row.eligible)} empresas RFB elegíveis · ${percent(row.coverage ?? 0)} correspondência exata<br/>Emprego agregado por município/CNAE/CBO; sem ligação trabalhador↔CNPJ.<br/>Filtros de empresa/porte não filtram emprego. Associação territorial, sem causalidade.` : '';
    } },
    grid: { top: 22, right: 12, left: 7, bottom: 35, containLabel: true },
    xAxis: { type: 'value', name: 'Saldo de empregos', nameLocation: 'middle', nameGap: 25, axisLabel: { fontSize: 10, formatter: compact }, splitLine: { lineStyle: { color: '#EEF1F7' } } },
    yAxis: { type: 'value', name: '% CNPJ exato', min: 0, max: 100, splitNumber: 2, axisLabel: { fontSize: 10, formatter: '{value}%' }, splitLine: { lineStyle: { color: '#EEF1F7' } } },
    series: view.regions.map((region, index) => ({ type: 'scatter', name: region.label,
      data: context.filter(row => row.greId === region.id).map(row => ({ id: row.cityId, name: row.name, value: [row.balance, row.coverage, row.stock] })),
      symbolSize: (value: number[]) => Math.max(9, Math.min(30, Math.sqrt(value[2]) / 14)),
      itemStyle: { color: ['#3662E2', '#15265C', '#6077B6', '#9FB3D9', '#203873', '#4A69B7', '#7D95C8', '#0E1732', '#294998', '#4164A4', '#547EBC', '#668BCF', '#95A8CC', '#B0BCD3'][index % 14], opacity: .8 },
      emphasis: { label: { show: true, position: 'top', formatter: '{b}', fontSize: 10 } },
    })),
  };
  const intersections = [
    { name: 'Objeto técnico + sem vigente', predicate: (row: DigitalInspectionCompany) => row.signals.some(signal => signal.ruleId === 'DIG-04'), rule: 'DIG-04' },
    { name: 'Vigente + RT não identificado', predicate: (row: DigitalInspectionCompany) => row.match === 'exact-active' && !row.activeRtIds.length, rule: 'DIG-05' },
    { name: 'Só raiz · sem objeto técnico', predicate: (row: DigitalInspectionCompany) => row.match === 'root-suggestion' && !row.technicalContractIds.length, rule: 'DIG-02' },
    { name: 'Inativo · sem objeto técnico', predicate: (row: DigitalInspectionCompany) => row.match === 'exact-inactive' && !row.technicalContractIds.length, rule: 'DIG-03' },
    { name: 'Não localizado · sem objeto', predicate: (row: DigitalInspectionCompany) => row.match === 'none' && !row.technicalContractIds.length, rule: 'DIG-01' },
    { name: 'Vigente + RT identificado', predicate: (row: DigitalInspectionCompany) => row.match === 'exact-active' && Boolean(row.activeRtIds.length), rule: 'Sem ausência cadastral nas regras exibidas' },
  ].map(row => ({ ...row, ids: view.companies.filter(row.predicate).map(company => company.companyId) }));
  const intersectionOption = horizontalOption(intersections.map(row => row.name), intersections.map(row => row.ids.length), 'Empresas distintas', '#6077B6');
  intersectionOption.tooltip = { trigger: 'axis', confine: true, formatter: (params: any[]) => {
    const row = intersections[params[0]?.dataIndex];
    return row ? `${row.name}<br/>${num(row.ids.length)} empresas · ${row.rule}<br/>Grupos mutuamente exclusivos neste universo; não é pontuação.<br/>RT identificado não confirma regularidade ou autoria das ARTs.<br/>Regras e dados de origem disponíveis em Evidências.` : '';
  } };
  intersectionOption.yAxis = { type: 'category', inverse: true, data: intersections.map(row => row.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { fontSize: 10, width: 134, overflow: 'truncate' } };

  return <div className="r5-grid">
    <ReportPanel id="digital-matching-flow" step="01" title="O que está identificado no cadastro?" subtitle={`${num(view.metrics.eligibleCompanies)} empresas · ${num(view.metrics.eligibleEstablishments)} estabelecimentos RFB ativos · identidade → vigência → RT`} source={view.source} wide action={info}>
      {flow.total ? <ReportChart label="Sankey de conciliação digital por CNPJ exato, raiz, vigência do registro e vínculo RT" option={flowOption} onPick={params => {
        const data = params.data; const ids = data?.companyIds ?? data?.ids;
        if (ids) choose(ids, data.source ? `${data.source} → ${data.target}` : data.name, `Conciliação determinística selecionada: ${data.source ? `${data.source} → ${data.target}` : data.name}. Raiz não confirma correspondência do estabelecimento.`);
      }} /> : <div className="r5-empty">Nenhum estabelecimento RFB ativo com CNAE selecionado e CNPJ válido neste recorte.</div>}
    </ReportPanel>
    <ReportPanel id="digital-territorial-coverage" step="02" title="Onde investigar a cobertura cadastral?" subtitle="Empresas elegíveis por GRE · linha: CNPJ exato ÷ universo territorial" source={`${view.source} Empresa com filiais pode ocupar mais de uma GRE.`}>
      <ReportChart label="Gráfico combinado de universo RFB, CNPJ exato, sugestão por raiz e cobertura territorial" option={regionalOption} onPick={params => {
        const row = regional[params.dataIndex]; if (!row) return;
        const ids = params.seriesName === 'Não localizado' ? row.noCorrespondenceIds : params.seriesName === 'Somente raiz' ? row.rootSuggestionIds : params.seriesName === 'CNPJ exato' ? [...row.exactActiveIds, ...row.exactInactiveIds] : row.companyIds;
        onDimension('greIds', [row.id]); choose(ids, `${row.label} · ${params.seriesName}`, `Estabelecimentos RFB na GRE ${row.label}; conjunto empresarial da série ${params.seriesName}.`);
      }} />
    </ReportPanel>
    <ReportPanel id="digital-cnae-evidence" step="03" title="Que atividades concentram os indícios?" subtitle="7 maiores universos CNAE × evidência · principal e secundários · células sobrepostas" source={`${view.source} CNAE relacionado ou depende de análise preserva a classificação da planilha.`} action={info}>
      <ReportChart label="Heatmap de CNAEs principais e secundários e evidências de conciliação digital" option={heatOption} onPick={params => {
        const cell = cells.find(row => row.x === params.value?.[0] && row.y === params.value?.[1]);
        if (cell) { onDimension('cnaeCodes', [cell.code]); choose(cell.ids, `${cell.code} · ${columns[cell.x].label}`, `CNAE principal ou secundário ${cell.code} e critério ${cell.rule}.`); }
      }} />
    </ReportPanel>
    <ReportPanel id="digital-public-contracts" step="04" title="A demanda pública encontra registro vigente?" subtitle={`${num(technicalContracts.length)} objetos com termos técnicos · área: valor contratado · situação na competência`} source={`${view.source} Classificação textual demonstrativa; não existe ponte contrato↔ART neste modelo.`} wide>
      {technicalContracts.length ? <ReportChart label="Treemap do valor de contratos com indícios textuais técnicos por correspondência e vigência no CREA" option={contractOption} onPick={params => {
        const row = contractGroups.find(group => group.id === params.data?.id);
        if (row) choose(row.ids, `Objeto técnico · ${row.name}`, `Fornecedores dos contratos com termos do dicionário demonstrativo e estado ${row.name} na competência. Contrato não está associado a ART individual.`);
      }} /> : <div className="r5-empty">Nenhum objeto com indício textual técnico entre as empresas elegíveis no período.</div>}
    </ReportPanel>
    <ReportPanel id="digital-employment-context" step="05" title="O contexto econômico acompanha a cobertura?" subtitle="Municípios de SP · saldo setorial × CNPJ exato · bolha: estoque no último mês" source={`${view.source} CAGED/RAIS agregados; nunca identificam trabalhadores ou empresas individuais.`}>
      {context.length ? <ReportChart label="Dispersão municipal entre saldo agregado de empregos setoriais e correspondência cadastral de empresas" option={scatterOption} onPick={params => {
        const row = cityById.get(params.data?.id);
        if (row) { onDimension('cityIds', [row.cityId]); choose(row.companyIds, `${row.name} · contexto e cobertura`, `Empresas elegíveis no município ${row.name}; o saldo de ${num(row.balance)} empregos é agregado por município/CNAE/CBO e não atribuído às empresas selecionadas.`); }
      }} /> : <div className="r5-empty">Sem município com emprego agregado e universo empresarial comparável. Nenhum emprego é atribuído a CNPJ.</div>}
    </ReportPanel>
    <ReportPanel id="digital-evidence-combinations" step="06" title="Quais combinações merecem revisão?" subtitle="Grupos sem sobreposição · indício convergente não é probabilidade de infração" source={`${view.source} Critérios versionados DIG-01 a DIG-06, com dados e limitações acessíveis.`} action={info}>
      <ReportChart label="Barras horizontais de combinações mutuamente exclusivas de evidências cadastrais e contratuais" option={intersectionOption} onPick={params => {
        const row = intersections[params.dataIndex]; if (row) choose(row.ids, row.name, `${row.rule}: combinação selecionada sem pesos arbitrários ou conclusão jurídica.`);
      }} />
    </ReportPanel>
  </div>;
}
