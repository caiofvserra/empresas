import type { Scope } from '../domain/engine';
import type { EnterpriseModel } from '../enterprise-v10/types';
import type { Bridge, DebtRow, FlowNode, Flow, Forecast, GreRow, Insight, Kpi, Targets } from './metrics';
import type { MacroSeries, PublicContext, Sourced } from './public-data';
import type { Palette } from './widgets';

export type PageId = 'executive' | 'territory' | 'portfolio' | 'operations' | 'public';
export interface CockpitContext {
  theme: Palette; scope: Scope; historyScope: Scope; model: EnterpriseModel; history: EnterpriseModel;
  kpis: Kpi[]; bridge: Bridge; flow: { nodes: FlowNode[]; links: Flow[] }; forecast: Forecast; gres: GreRow[]; debt: DebtRow[];
  insights: Insight[]; targets: Targets; financialAllowed: boolean; period: number;
  publicData: PublicContext | null; macro: Sourced<MacroSeries[]> | null; population: Sourced<{ year: string; value: number }> | null;
  select: (ids: string[], label: string) => void; openCompany: (id: string) => void;
  dimension: (key: 'greIds' | 'cityIds' | 'cnaeCodes', ids: string[]) => void;
  focus: string | null; toggleFocus: (id: string) => void;
}
