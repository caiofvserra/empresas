import catalog from './confea-ui-v8.json';

export type TransparencyMode = 'indicators' | 'data';
export interface TransparencyRow {
  id: string; code: string; title: string; program: string; scope: string; unit: string;
  formula: string; objective: string; notes: string; mandatoryReport: boolean;
  workbookTcuMention: string | null; dependencies: string[]; evidence: string;
  numericValue: null; sourceStatus: 'connection-required'; reviewNotes: string[];
}
export interface TransparencyFilter { mode?: TransparencyMode; search?: string; program?: string; mandatoryOnly?: boolean; includeFederal?: boolean; descending?: boolean }
export const transparencySource = catalog.source;
export const transparencyAudit = catalog.auditNotes;
const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const reviewFor = (code: string, mode: TransparencyMode) => catalog.auditNotes.filter(note =>
  mode === 'indicators' && (code === '35' && note.id === 'indicator_35_denominator_mismatch'
    || code === '53' && ['indicator_53_amendment', 'indicator_53_not_real_growth'].includes(note.id)
    || code === '44' && note.id === 'indicator_44_wrong_observation')).map(note => note.message);

/** A rules catalog is not a data feed: imported historical values never become current measures. */
export function selectTransparencyRows(filters: TransparencyFilter = {}): TransparencyRow[] {
  const mode = filters.mode ?? 'indicators';
  const rows: TransparencyRow[] = mode === 'indicators' ? catalog.indicators.map(row => ({
    id: row.id, code: String(row.indicatorId), title: clean(row.label), program: clean(row.subprogram), scope: row.scope,
    unit: row.unit, formula: clean(row.formulaText), objective: clean(row.objective), notes: clean(row.notes),
    mandatoryReport: row.reportPresentation === 'Obrigatória', workbookTcuMention: row.tcuDemand === '-' ? null : clean(row.tcuDemand),
    dependencies: row.dependencies.map(dep => `${dep.metricKey} · ${dep.sheet}!${dep.cell}`),
    evidence: `${row.evidence.sheet}!${row.evidence.formulaCell}`, numericValue: null,
    sourceStatus: 'connection-required', reviewNotes: reviewFor(String(row.indicatorId), mode),
  })) : catalog.metrics.filter(row => row.catalogStatus === 'active_rule').map(row => ({
    id: row.id, code: row.code, title: clean(row.label), program: clean(row.subprogram), scope: row.scope,
    unit: row.unit, formula: clean(row.definition), objective: clean(row.temporalCut), notes: clean(row.orientation),
    mandatoryReport: row.reportPresentation === 'Obrigatória', workbookTcuMention: row.tcuDataCategory ? clean(row.tcuDataCategory) : null,
    dependencies: [], evidence: `${row.evidence.sheet}!${row.evidence.valueCell}`, numericValue: null,
    sourceStatus: 'connection-required', reviewNotes: [],
  }));
  const search = normalize(filters.search ?? '');
  return rows.filter(row => (filters.includeFederal || row.scope !== 'confea_national')
    && (!filters.program || row.program === filters.program)
    && (!filters.mandatoryOnly || row.mandatoryReport)
    && (!search || normalize(`${row.code} ${row.title} ${row.formula} ${row.notes} ${row.program}`).includes(search)))
    .sort((a, b) => (filters.descending ? -1 : 1) * a.code.localeCompare(b.code, 'pt-BR', { numeric: true }));
}

export function summarizeTransparency() {
  const regional = selectTransparencyRows();
  const data = selectTransparencyRows({ mode: 'data' });
  return { regionalIndicators: regional.length, directRegionalIndicators: regional.filter(row => row.scope === 'crea_sp').length,
    mixedIndicators: regional.filter(row => row.scope === 'mixed_requires_confea').length,
    federalIndicatorsExcluded: catalog.indicators.filter(row => row.scope === 'confea_national').length,
    regionalActiveDataRequirements: data.length, regionalDataRequirementsIncludingRetired: catalog.metrics.length,
    markedMandatoryReport: data.filter(row => row.mandatoryReport).length,
    workbookTcuMentioned: data.filter(row => row.workbookTcuMention).length,
    connectedSources: 0, calculatedCurrentValues: 0, publicReleaseApproved: false };
}

/** Formula 53 returns a fraction formatted as %, not a growth rate or actual spending. */
export function calculateFiscalBudgetShare(approvedFiscalBudget: number | null, approvedTotalBudget: number | null): number | null {
  if (approvedFiscalBudget === null || approvedTotalBudget === null || approvedTotalBudget === 0) return null;
  if (![approvedFiscalBudget, approvedTotalBudget].every(value => Number.isFinite(value) && value >= 0)) throw new Error('Orçamentos aprovados precisam ser valores finitos não negativos, na mesma unidade e exercício.');
  if (approvedFiscalBudget > approvedTotalBudget) throw new Error('Parcela de fiscalização maior que o total aprovado requer revisão da fonte.');
  return approvedFiscalBudget / approvedTotalBudget;
}
const csvCell = (value: string) => `"${(/^[\s]*[=+\-@\t\r]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`;
export function exportTransparencyCsv(rows: TransparencyRow[], canExport: boolean): string {
  if (!canExport) throw new Error('O perfil de consulta não permite exportação.');
  const header = ['Código', 'Nome', 'Subprograma', 'Escopo', 'Unidade', 'Fórmula/definição', 'Conceito/corte', 'Apresentação obrigatória no RG segundo planilha', 'Menção TCU na planilha; não confirmação individual', 'Dependências', 'Evidência', 'Estado da fonte', 'Valor atual', 'Ressalvas'];
  const values = rows.map(row => [row.code, row.title, row.program, row.scope, row.unit, row.formula, row.objective,
    row.mandatoryReport ? 'Sim' : 'Não', row.workbookTcuMention ?? '', row.dependencies.join(' | '), row.evidence,
    'Fonte não conectada', '', [row.notes, ...row.reviewNotes].filter(Boolean).join(' | ')]);
  return '\uFEFF' + [header, ...values].map(row => row.map(csvCell).join(';')).join('\r\n') + '\r\n';
}
