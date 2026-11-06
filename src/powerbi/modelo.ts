/**
 * Descrição de um modelo do Power BI independente do formato do arquivo: tabelas lidas de CSV, colunas, medidas DAX,
 * relações e parâmetros. `tmdl.ts` transforma isto nos arquivos TMDL do projeto PBIP (ver docs/pesquisa/powerbi-pbip.md).
 */
export type TipoColuna = 'string' | 'int64' | 'double' | 'dateTime' | 'boolean';

export interface Coluna {
  nome: string; tipo: TipoColuna;
  /** Formato do Power BI, como `#,##0` ou `dd/mm/yyyy`. */
  formato?: string;
  oculta?: boolean;
  /** Soma por padrão quando a coluna entra num visual; sem isto, a coluna não é agregada. */
  somar?: boolean;
  descricao?: string;
  /** Coluna da mesma tabela que define a ordem desta (por exemplo, o nome do mês ordenado pelo número). */
  ordenarPor?: string;
}

export interface Medida {
  nome: string; dax: string; formato?: string;
  /** Pasta de exibição no painel de campos; no pacote, o nome da página do painel. */
  pasta?: string;
  descricao?: string;
}

export interface Tabela {
  nome: string; descricao?: string;
  /** Nome do CSV, na pasta do parâmetro. Uma tabela sem arquivo só guarda medidas. */
  arquivo?: string;
  colunas: Coluna[]; medidas?: Medida[]; oculta?: boolean;
}

/** Relação de muitos (`de`) para um (`para`), como [tabela, coluna]. */
export interface Relacao { de: [string, string]; para: [string, string]; ambasDirecoes?: boolean; inativa?: boolean }

export interface Parametro { nome: string; valor: string; descricao?: string }

export interface Modelo { nome: string; tabelas: Tabela[]; relacoes: Relacao[]; parametros: Parametro[] }
