/** Registros de um CSV com ";": campo entre aspas pode ter ponto e vírgula, aspas dobradas e quebra de linha. */
export function registros(texto: string): string[][] {
  const saida: string[][] = []; let campos: string[] = [], atual = '', aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) { if (c === '"' && texto[i + 1] === '"') { atual += '"'; i++; } else if (c === '"') aspas = false; else atual += c; continue; }
    if (c === '"') aspas = true;
    else if (c === ';') { campos.push(atual); atual = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && texto[i + 1] === '\n') i++; campos.push(atual); saida.push(campos); campos = []; atual = ''; }
    else atual += c;
  }
  if (atual || campos.length) { campos.push(atual); saida.push(campos); }
  return saida;
}

/** Sem acento, minúsculo e com espaços simples, para achar coluna pelo nome: "Nº" vira "no" e "Órgão" vira "orgao". */
export const normalizar = (texto: string) => texto.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
