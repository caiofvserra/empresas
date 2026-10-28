import type { Scope } from '../domain/engine';
import type { Dataset } from '../domain/types';
import type { EnterpriseModel } from '../enterprise-v10/types';
import type { Janela, Regional, ResumoFiscal, Segmento, SegmentoMercado } from './analise';
import type { Tokens } from './chart';
import type { Fiscalizacao, Origem, StatusMulta, Tipo } from './fiscalizacao';

/** Estado calculado compartilhado pelas duas visões e pelo painel de detalhe. */
export interface Ctx {
  dataset: Dataset; f: Fiscalizacao; scope: Scope; model: EnterpriseModel; history: EnterpriseModel;
  period: number; greId: string | null; camara: string | null; janela: Janela;
  resumo: ResumoFiscal; regionais: Regional[]; tokens: Tokens;
  open: (detail: Detail) => void; filterGre: (id: string) => void;
}
export type Detail =
  | { kind: 'alvos'; tipo?: Tipo }
  | { kind: 'acoes' } | { kind: 'autos' } | { kind: 'regularizacoes' }
  | { kind: 'multas'; status?: StatusMulta }
  | { kind: 'situacao'; tipo: Tipo; segmento: Segmento }
  | { kind: 'mes'; month: string }
  | { kind: 'origem'; origem: Origem }
  | { kind: 'gre'; id: string }
  | { kind: 'empresas'; title: string; what: string; use?: string; ids: string[]; eyebrow?: string }
  | { kind: 'cnpjs'; title: string; what: string; use?: string; ids: string[]; eyebrow?: string; segmento?: SegmentoMercado }
  | { kind: 'profissionais'; empresas: number; ids: string[] };
