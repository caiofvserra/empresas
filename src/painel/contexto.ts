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
  /** Filtra a página inteira pelo recorte de um item do detalhe (regional, município ou câmara), como o filtro cruzado do Power BI (05/11/2026). */
  filtrar: (recorte: Recorte) => void;
}
/** Recorte que um item do gráfico carrega para a gaveta poder filtrar a página por ele. */
export interface Recorte { gre?: string; cidade?: string; camara?: string }
export type Detail =
  | { kind: 'alvos'; tipo?: Tipo }
  | { kind: 'acoes' } | { kind: 'autos' } | { kind: 'regularizacoes' }
  | { kind: 'multas'; status?: StatusMulta }
  | { kind: 'situacao'; tipo: Tipo; segmento: Segmento }
  | { kind: 'mes'; month: string }
  | { kind: 'origem'; origem: Origem }
  | { kind: 'gre'; id: string }
  | { kind: 'empresas'; title: string; what: string; use?: string; ids: string[]; eyebrow?: string; recorte?: Recorte }
  | { kind: 'cnpjs'; title: string; what: string; use?: string; ids: string[]; eyebrow?: string; segmento?: SegmentoMercado; recorte?: Recorte }
  | { kind: 'profissionais'; empresas: number; ids: string[] }
  | { kind: 'linhas'; title: string; what: string; use?: string; eyebrow?: string; listTitle: string; summary?: [string, string][]; recorte?: Recorte; rows: { key: string; companyId?: string; title: string; subtitle: string; value: string; note: string; sortValue: number }[] };
