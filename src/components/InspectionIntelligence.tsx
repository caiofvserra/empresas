import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, CircleHelp, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Scope } from '../domain/engine';
import { classifyContract } from '../domain/engine';
import type { Classification, Contract, InspectionCase } from '../domain/types';
import Chart from './Chart';

export interface InspectionIntelligenceProps {
  scope: Scope;
  onSubset: (ids: string[], label: string, reason: string) => void;
  onCompany: (id: string) => void;
  onInfo: (id: string) => void;
}

interface FlowNode {
  name: string;
  depth: number;
  companyIds: string[];
  recordIds: string[];
  itemStyle: { color: string };
  label?: { position: string; align: string; width: number; fontSize: number };
}
interface FlowLink {
  source: string;
  target: string;
  value: number;
  companyIds: string[];
  recordIds: string[];
}
export interface InspectionFlow {
  nodes: FlowNode[];
  links: FlowLink[];
  includedCount: number;
  excludedCaseIds: string[];
}
export type ClassifiedContract = Contract & { prediction: Classification };

const stages: InspectionCase['status'][] = ['Identificada', 'Validação cadastral', 'Análise técnica', 'Encaminhada', 'Concluída'];
const stageLabels = ['Identificação', 'Validação', 'Análise técnica', 'Encaminhamento', 'Conclusão'];
const terminalLabels = ['Aguardam validação', 'Em validação', 'Em análise', 'Encaminhados', 'Concluídos'];
const colors = ['#3662E2', '#6077B6', '#15265C', '#395386', '#0E1732'];
const num = (value: number) => value.toLocaleString('pt-BR');
const date = (value: string) => value.slice(0, 10).split('-').reverse().join('/');
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
const unique = (values: string[]) => [...new Set(values)];

/** A case traverses only transitions actually present in its dated history.
 * Each reached stage drains into its next stage or one current-state exit.
 * Reversals are surfaced separately rather than fabricating an acyclic history. */
export function buildInspectionFlow(cases: InspectionCase[], anchor: string): InspectionFlow {
  const nodeRecords = new Map<string, { depth: number; color: string; companyIds: Set<string>; recordIds: Set<string> }>();
  const edgeRecords = new Map<string, { source: string; target: string; companyIds: Set<string>; recordIds: Set<string> }>();
  const excludedCaseIds: string[] = [];
  let includedCount = 0;
  const addNode = (name: string, depth: number, color: string, row: InspectionCase) => {
    const entry = nodeRecords.get(name) ?? { depth, color, companyIds: new Set<string>(), recordIds: new Set<string>() };
    entry.companyIds.add(row.companyId); entry.recordIds.add(row.id); nodeRecords.set(name, entry);
  };
  const addEdge = (source: string, target: string, row: InspectionCase) => {
    const key = `${source}\u0000${target}`;
    const entry = edgeRecords.get(key) ?? { source, target, companyIds: new Set<string>(), recordIds: new Set<string>() };
    entry.companyIds.add(row.companyId); entry.recordIds.add(row.id); edgeRecords.set(key, entry);
  };
  for (const row of cases) {
    const history = row.history.filter(entry => entry.date <= anchor).sort((a, b) => a.date.localeCompare(b.date));
    const path = history.map(entry => stages.indexOf(entry.status)).filter((value, index, values) => index === 0 || value !== values[index - 1]);
    if (!path.length || path[0] !== 0 || path.some((value, index) => value < 0 || (index > 0 && value <= path[index - 1]))) {
      excludedCaseIds.push(row.id); continue;
    }
    includedCount += 1;
    path.forEach((index, position) => {
      addNode(stageLabels[index], index, colors[index], row);
      if (position > 0) addEdge(stageLabels[path[position - 1]], stageLabels[index], row);
    });
    const last = path.at(-1)!;
    addNode(terminalLabels[last], 5, colors[last], row);
    addEdge(stageLabels[last], terminalLabels[last], row);
  }
  return {
    nodes: [...nodeRecords].map(([name, entry]) => ({ name, depth: entry.depth, companyIds: [...entry.companyIds], recordIds: [...entry.recordIds], itemStyle: { color: entry.color }, ...(entry.depth < 5 ? { label: { position: 'top', align: 'center', width: 76, fontSize: 11 } } : {}) })),
    links: [...edgeRecords.values()].map(entry => ({ source: entry.source, target: entry.target, value: entry.recordIds.size, companyIds: [...entry.companyIds], recordIds: [...entry.recordIds] })),
    includedCount, excludedCaseIds,
  };
}

/** One contract creates one category-to-suggestion edge. No document or ART
 * evidence is inferred from a lexical result or an internal registration. */
export function buildContractClassificationFlow(rows: ClassifiedContract[]): { nodes: FlowNode[]; links: FlowLink[] } {
  const nodeRecords = new Map<string, { depth: number; companyIds: Set<string>; recordIds: Set<string>; color: string }>();
  const edgeRecords = new Map<string, { source: string; target: string; companyIds: Set<string>; recordIds: Set<string> }>();
  for (const row of rows) {
    const source = `Publicada · ${row.category}`;
    const target = row.prediction.engineering ? `Sugestão · ${row.prediction.label}` : 'Sugestão · Evidência textual insuficiente';
    for (const [name, depth, color] of [[source, 0, '#6077B6'], [target, 1, row.prediction.engineering ? '#3662E2' : '#15265C']] as const) {
      const entry = nodeRecords.get(name) ?? { depth, color, companyIds: new Set<string>(), recordIds: new Set<string>() };
      entry.companyIds.add(row.companyId); entry.recordIds.add(row.id); nodeRecords.set(name, entry);
    }
    const key = `${source}\u0000${target}`;
    const entry = edgeRecords.get(key) ?? { source, target, companyIds: new Set<string>(), recordIds: new Set<string>() };
    entry.companyIds.add(row.companyId); entry.recordIds.add(row.id); edgeRecords.set(key, entry);
  }
  return {
    nodes: [...nodeRecords].map(([name, entry]) => ({ name, depth: entry.depth, companyIds: [...entry.companyIds], recordIds: [...entry.recordIds], itemStyle: { color: entry.color } })),
    links: [...edgeRecords.values()].map(entry => ({ source: entry.source, target: entry.target, value: entry.recordIds.size, companyIds: [...entry.companyIds], recordIds: [...entry.recordIds] })),
  };
}

function flowOption(flow: { nodes: FlowNode[]; links: FlowLink[] }, unit: string): Record<string, unknown> {
  return {
    tooltip: { trigger: 'item', formatter: (params: { data: FlowNode | FlowLink; dataType: string }) => {
      const row = params.data;
      const label = 'source' in row ? `${row.source} → ${row.target}` : row.name;
      return `${label}<br/>${num(row.recordIds.length)} ${unit} · ${num(row.companyIds.length)} empresas distintas`;
    } },
    series: [{
      type: 'sankey', left: unit === 'casos' ? 40 : 12, right: 150, top: unit === 'casos' ? 58 : 18, bottom: 18, nodeWidth: 12, nodeGap: 18,
      draggable: false, layoutIterations: 0, emphasis: { focus: 'adjacency' },
      data: flow.nodes, links: flow.links,
      label: { color: '#0E1732', fontSize: 11, width: 142, overflow: 'break', formatter: (params: { data: FlowNode }) => `${params.data.name}\n${num(params.data.recordIds.length)}` },
      lineStyle: { color: 'source', opacity: 0.23, curveness: 0.5 },
    }],
  };
}

function Panel({ title, subtitle, info, onInfo, children }: { title: string; subtitle: string; info: string; onInfo: (id: string) => void; children: ReactNode }) {
  return <section className="p-panel">
    <header className="p-panel-header"><div><h2 className="p-panel-title">{title}</h2><p className="p-panel-subtitle">{subtitle}</p></div><button className="p-iconbutton" aria-label={`Definição: ${title}`} onClick={() => onInfo(info)}><CircleHelp size={15} /></button></header>
    <div className="p-panel-body">{children}</div>
  </section>;
}

export default function InspectionIntelligence({ scope, onSubset, onCompany, onInfo }: InspectionIntelligenceProps) {
  const [query, setQuery] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [sort, setSort] = useState('date');
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState('Contratação de manutenção preventiva e corretiva de instalações elétricas');
  const [classifiedText, setClassifiedText] = useState(draft);
  const prediction = useMemo(() => classifyContract(classifiedText), [classifiedText]);
  const companies = useMemo(() => new Map(scope.dataset.companies.map(row => [row.id, row])), [scope.dataset]);
  const buyers = useMemo(() => new Map(scope.dataset.buyers.map(row => [row.id, row])), [scope.dataset]);
  const classified = useMemo(() => scope.contracts.map(row => ({ ...row, prediction: classifyContract(row.object) })), [scope.contracts]);
  const caseFlow = useMemo(() => buildInspectionFlow(scope.cases, scope.anchor), [scope.cases, scope.anchor]);
  const classificationFlow = useMemo(() => buildContractClassificationFlow(classified), [classified]);
  const suggestions = useMemo(() => [...new Set(classified.map(row => row.prediction.label))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [classified]);
  const filtered = useMemo(() => classified.filter(row => (!suggestion || row.prediction.label === suggestion) && (!query.trim() || normalize(`${row.id} ${companies.get(row.companyId)?.name} ${row.object} ${row.category} ${buyers.get(row.buyerId)?.name}`).includes(normalize(query.trim())))).sort((a, b) => sort === 'score' ? b.prediction.confidence - a.prediction.confidence || a.id.localeCompare(b.id) : b.date.localeCompare(a.date) || a.id.localeCompare(b.id)), [classified, query, suggestion, sort, companies, buyers]);
  useEffect(() => setPage(1), [scope, query, suggestion, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const technical = classified.filter(row => row.prediction.engineering);
  const selectFlow = (params: { data?: FlowNode | FlowLink }, label: string, reason: string) => {
    const row = params.data;
    if (!row || !row.companyIds.length) return;
    const name = 'source' in row ? `${row.source} → ${row.target}` : row.name;
    onSubset(row.companyIds, `${label} · ${name}`, reason);
  };

  return <div className="p-inspection-intelligence">
    <div className="p-grid two">
      <Panel title="Percurso dos casos e situação atual" subtitle={`${num(caseFlow.includedCount)} casos até ${date(scope.anchor)}. Cada saída corresponde à última fase registrada.`} info="caseCount" onInfo={onInfo}>
        {caseFlow.includedCount > 0 ? <Chart option={flowOption(caseFlow, 'casos')} height={370} ariaLabel="Sankey das transições históricas dos casos de fiscalização, com saídas para sua situação atual" onPick={params => selectFlow(params, 'Histórico dos casos', 'Empresas dos casos que percorreram a fase ou transição selecionada. O fluxo conta casos, não empresas; cada caso tem uma única saída atual.')} summary="As fases contam passagens históricas. As saídas à direita são mutuamente exclusivas e reconciliam com o total de casos; não some as fases como casos distintos." /> : <p className="p-empty">Nenhum caso com histórico linear disponível no recorte.</p>}
        {caseFlow.excludedCaseIds.length > 0 && <p className="p-chart-summary">{num(caseFlow.excludedCaseIds.length)} casos com histórico incompleto ou retorno de fase ficam fora deste fluxo linear e permanecem na fila de casos.</p>}
        <label className="p-chart-summary">Investigar uma situação atual <select aria-label="Investigar fase atual dos casos" value="" onChange={event => { const index = stages.indexOf(event.target.value as InspectionCase['status']); if (index < 0) return; const selected = caseFlow.nodes.find(row => row.name === terminalLabels[index]); if (selected) onSubset(selected.companyIds, `Casos · ${stages[index]}`, 'Empresas dos casos cuja última fase histórica corresponde à situação selecionada.'); }}><option value="">Selecionar fase</option>{stages.map((value, index) => <option value={value} key={value} disabled={!caseFlow.nodes.some(row => row.name === terminalLabels[index])}>{value}</option>)}</select></label>
      </Panel>
      <Panel title="Categoria publicada × sugestão textual" subtitle={`${num(classified.length)} contratos no período; ${num(technical.length)} com termos potencialmente técnicos.`} info="classification" onInfo={onInfo}>
        {classified.length > 0 ? <Chart option={flowOption(classificationFlow, 'contratos')} height={370} ariaLabel="Sankey de categorias publicadas dos contratos e classificações textuais demonstrativas sugeridas" onPick={params => selectFlow(params, 'Classificação de objetos', 'Empresas fornecedoras dos contratos associados à categoria ou sugestão selecionada. Regras textuais demonstrativas; o recorte empresarial pode conter outros contratos da mesma empresa.')} summary="Cada contrato aparece uma vez na categoria de origem e uma vez na sugestão. A classificação original é preservada; o índice da regra não é probabilidade de infração." /> : <p className="p-empty">Nenhum contrato no período e território selecionados.</p>}
        <button className="p-secondary" disabled={!technical.length} onClick={() => onSubset(unique(technical.map(row => row.companyId)), 'Objetos com termos técnicos', 'Fornecedores de contratos com termos encontrados pelo dicionário demonstrativo. A recomendação requer validação humana e não determina obrigação de registro.')}>Investigar objetos com termos técnicos <ArrowUpRight size={13} /></button>
      </Panel>
    </div>

    <p className="p-chart-summary"><strong>Evidência disponível: texto do objeto.</strong> Esta demonstração não integrou documentos das compras, ARTs do processo ou revisão humana de cada classificação. Não infere ausência de ART ou responsável técnico. A chave local PNCP-DEMO identifica um contrato fictício; número de controle do contrato e número da compra são chaves separadas numa integração real.</p>

    <details className="p-panel" style={{ marginTop: 14 }}>
      <summary className="p-panel-header"><strong className="p-panel-title">Contratos, critérios e validação humana · {num(filtered.length)}</strong></summary>
      <div className="p-table-tools">
        <p>Leia os termos e a justificativa; ausência de termo não exclui atividade técnica.</p>
        <div className="p-controls"><label className="p-search"><Search size={15} /><input aria-label="Pesquisar evidências contratuais" placeholder="Objeto, fornecedor ou contrato" value={query} onChange={event => setQuery(event.target.value)} /></label><select aria-label="Filtrar sugestão textual" value={suggestion} onChange={event => setSuggestion(event.target.value)}><option value="">Todas as sugestões</option>{suggestions.map(value => <option value={value} key={value}>{value}</option>)}</select><select aria-label="Ordenar evidências contratuais" value={sort} onChange={event => setSort(event.target.value)}><option value="date">Mais recentes</option><option value="score">Maior índice da regra</option></select></div>
      </div>
      <div className="p-table-scroll"><table className="p-table"><thead><tr>{['Contrato / fornecedor', 'Objeto / órgão', 'Categoria publicada', 'Sugestão e critérios', 'Validação humana'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{filtered.slice((page - 1) * 8, page * 8).map(row => <tr key={row.id}>
        <td style={{ whiteSpace: 'normal' }}><button className="p-company-link" onClick={() => onCompany(row.companyId)}>{companies.get(row.companyId)?.name ?? row.companyId}</button><small>{row.id} · {date(row.date)}</small></td>
        <td style={{ whiteSpace: 'normal', maxWidth: 370 }}>{row.object}<small>{buyers.get(row.buyerId)?.name ?? row.buyerId}</small></td>
        <td>{row.category}</td>
        <td style={{ whiteSpace: 'normal', maxWidth: 350 }}>{row.prediction.label}<small>Índice da regra: {row.prediction.confidence}/100</small><details><summary>Explicar sugestão</summary><p>{row.prediction.explanation}</p><p>{row.prediction.method}</p><p>Termos: {row.prediction.terms.join(', ') || 'Nenhum termo reconhecido'}</p></details></td>
        <td>Pendente<small>Sugestão demonstrativa; revisão não registrada.</small></td>
      </tr>)}</tbody></table>{!filtered.length && <p className="p-empty">Nenhum contrato corresponde aos filtros da tabela.</p>}</div>
      <div className="p-pagination"><span>{num(filtered.length)} contratos · 8 por página</span><div><button aria-label="Página anterior das evidências" disabled={page === 1} onClick={() => setPage(value => value - 1)}><ChevronLeft size={15} /></button><span>{page} / {pages}</span><button aria-label="Próxima página das evidências" disabled={page >= pages} onClick={() => setPage(value => value + 1)}><ChevronRight size={15} /></button></div></div>
    </details>

    <details className="p-panel" style={{ marginTop: 14 }}>
      <summary className="p-panel-header"><strong className="p-panel-title">Experimentar as regras de classificação</strong></summary>
      <div className="p-panel-body"><div className="p-classifier"><label htmlFor="inspection-contract-object">Objeto da contratação</label><textarea id="inspection-contract-object" rows={3} value={draft} onChange={event => setDraft(event.target.value)} /><button className="p-primary" disabled={!draft.trim()} onClick={() => setClassifiedText(draft)}>Classificar objeto</button><div aria-live="polite"><h3>{prediction.label}</h3><span className="p-badge">Índice demonstrativo: {prediction.confidence}/100</span><p>{prediction.explanation}</p><small>{prediction.method}</small></div></div></div>
    </details>
  </div>;
}
