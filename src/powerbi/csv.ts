/** Valor de uma célula: texto, número, data ISO (aaaa-mm-dd), 0/1 ou vazio. */
export type Celula = string | number | boolean | null | undefined;

/**
 * CSV que o Power Query lê com `Csv.Document(..., [Delimiter = ";", Encoding = 65001])` e tipa com a cultura pt-BR:
 * ponto e vírgula, UTF-8 sem BOM, CRLF, decimal com vírgula e sem separador de milhar, verdadeiro/falso como 1/0.
 */
export function csv(cabecalho: string[], linhas: Celula[][]): string {
  return `${[cabecalho, ...linhas].map(linha => linha.map(celula).join(';')).join('\r\n')}\r\n`;
}

function celula(valor: Celula): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'boolean') return valor ? '1' : '0';
  if (typeof valor === 'number') return Number.isInteger(valor) ? String(valor) : String(Math.round(valor * 100) / 100).replace('.', ',');
  return /[;"\r\n]/.test(valor) ? `"${valor.replaceAll('"', '""')}"` : valor;
}
