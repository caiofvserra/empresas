/**
 * Relatório de Processos do GovAdm, uma foto por dia (07/11/2026): o que o painel de Gestão do Conselho precisa para contar os
 * dias que cada processo está na fase atual. O relatório só mostra a fase de hoje; guardando a foto de cada dia, a mudança de fase
 * aparece de um dia para o outro, e a passagem pela fase ganha data de início.
 *
 * A foto vem do repositório extracao-govadm (`python main.py diario`), que baixa o relatório das nove câmaras e grava
 * `saida/relatorio_processos_AAAAMMDD_HHMM_limpo.csv`. Funções puras: a leitura dos arquivos fica em scripts/govadm-diario.ts.
 * O histórico tem o nome do responsável e fica fora do Git; o quadro por câmara e fase só tem números.
 */

export interface LinhaGovadm { processo: string; categoria: string; assunto: string; lotacao: string; responsavel: string; cargo: string; fase: string; data: string | null }
/** Uma passagem de um processo por uma fase numa lotação. `ate` vazio é a passagem atual. */
export interface Passagem { fase: string; lotacao: string; responsavel: string; cargo: string; desde: string; ate: string | null; desdeConhecido: boolean }
export interface HistoricoGovadm { fotos: string[]; processos: Record<string, Passagem[]> }

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
/** Nomes que o GovAdm já usou para cada coluna, como no extracao-govadm (extracao/metricas.py). */
const colunas = {
  processo: ['Nº do Processo', 'N° do Processo', 'Numero do Processo'], categoria: ['Categoria'], assunto: ['Assunto'], lotacao: ['Lotação Atual'],
  responsavel: ['Responsável', 'Responsável Atual'], cargo: ['Cargo'], fase: ['Fase', 'Fase Atual'], data: ['Data'],
} as const;
/** Fase de processo arquivado: sai da contagem, como no extracao-govadm. */
const ARQUIVADO = 'arquivado';

const dataIso = (valor: string) => { const m = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : /^\d{4}-\d{2}-\d{2}/.test(valor) ? valor.slice(0, 10) : null; };
/** Registros de um CSV com ";": campo entre aspas pode ter ponto e vírgula, aspas dobradas e quebra de linha (como grava o csv do Python). */
function registros(texto: string): string[][] {
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

/** Lê o CSV limpo (";", com ou sem BOM) pelo nome das colunas. Linha sem número de processo e processo arquivado ficam de fora. */
export function lerRelatorio(texto: string): LinhaGovadm[] {
  const [primeira = [], ...linhas] = registros(texto.replace(/^\uFEFF/, '')), cabecalho = primeira.map(normalizar);
  const indice = Object.fromEntries(Object.entries(colunas).map(([campo, nomes]) => [campo, cabecalho.findIndex(c => nomes.some(n => normalizar(n) === c))])) as Record<keyof typeof colunas, number>;
  const faltam = Object.entries(indice).filter(([, i]) => i < 0).map(([campo]) => colunas[campo as keyof typeof colunas][0]);
  if (faltam.length) throw new Error(`O relatório do GovAdm não tem as colunas ${faltam.join(', ')}. Cabeçalho lido: ${primeira.join(';')}`);
  const saida: LinhaGovadm[] = [];
  for (const c of linhas) {
    const v = (campo: keyof typeof colunas) => (c[indice[campo]] ?? '').trim();
    if (!v('processo') || normalizar(v('fase')).includes(ARQUIVADO)) continue;
    saida.push({ processo: v('processo'), categoria: v('categoria'), assunto: v('assunto'), lotacao: v('lotacao'), responsavel: v('responsavel'), cargo: v('cargo'), fase: v('fase'), data: dataIso(v('data')) });
  }
  return saida;
}

/** A data da foto, pelo nome do arquivo do extracao-govadm (relatorio_processos_AAAAMMDD_HHMM_limpo.csv). */
export const dataDoArquivo = (nome: string) => { const m = nome.match(/(\d{4})(\d{2})(\d{2})_\d{4}/); return m ? `${m[1]}-${m[2]}-${m[3]}` : null; };

export const historicoVazio = (): HistoricoGovadm => ({ fotos: [], processos: {} });

/**
 * Soma a foto de um dia ao histórico e devolve um histórico novo.
 * - Processo novo, ou que mudou de fase ou de lotação: abre uma passagem que começa no dia da foto. Na primeira foto, a data de
 *   início é desconhecida (o processo já estava na fase antes de a cópia diária começar), e a passagem fica marcada.
 * - Troca só do responsável, na mesma fase: a passagem continua, com o responsável novo. A contagem de dias não reinicia.
 * - Processo que sumiu do relatório (arquivado, ou saiu das câmaras): a passagem fecha no dia da foto.
 * Foto do mesmo dia da última é ignorada (o agendador pode rodar duas vezes); foto mais antiga é recusada.
 */
export function registrarFoto(historico: HistoricoGovadm, data: string, linhas: LinhaGovadm[]): HistoricoGovadm {
  const ultima = historico.fotos.at(-1);
  if (ultima === data) return historico;
  if (ultima && data < ultima) throw new Error(`A foto de ${data} é mais antiga que a última registrada (${ultima}).`);
  const primeira = historico.fotos.length === 0, processos: Record<string, Passagem[]> = {}, vistos = new Set<string>();
  for (const [id, passagens] of Object.entries(historico.processos)) processos[id] = passagens.map(p => ({ ...p }));
  for (const l of linhas) {
    if (vistos.has(l.processo)) continue;
    vistos.add(l.processo);
    const lista = processos[l.processo] ??= [], atual = lista.at(-1);
    if (atual && atual.ate === null && atual.fase === l.fase && atual.lotacao === l.lotacao) { atual.responsavel = l.responsavel; atual.cargo = l.cargo; continue; }
    if (atual && atual.ate === null) atual.ate = data;
    lista.push({ fase: l.fase, lotacao: l.lotacao, responsavel: l.responsavel, cargo: l.cargo, desde: data, ate: null, desdeConhecido: !primeira });
  }
  for (const [id, lista] of Object.entries(processos)) { const atual = lista.at(-1); if (!vistos.has(id) && atual && atual.ate === null) atual.ate = data; }
  return { fotos: [...historico.fotos, data], processos };
}

const dias = (de: string, ate: string) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);

/** Os processos em alguma fase na data, com os dias na fase atual. Com `desdeConhecido` falso, são pelo menos esses dias. */
export function diasNaFase(historico: HistoricoGovadm, data: string) {
  return Object.entries(historico.processos).flatMap(([processo, lista]) => {
    const atual = lista.at(-1);
    return atual && atual.ate === null ? [{ processo, lotacao: atual.lotacao, fase: atual.fase, responsavel: atual.responsavel, cargo: atual.cargo, desde: atual.desde, dias: dias(atual.desde, data), desdeConhecido: atual.desdeConhecido }] : [];
  }).sort((a, b) => a.lotacao.localeCompare(b.lotacao) || a.fase.localeCompare(b.fase) || a.processo.localeCompare(b.processo));
}

const mediana = (valores: number[]) => { const v = [...valores].sort((a, b) => a - b), m = v.length >> 1; return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2); };
/** Por lotação (câmara) e fase: quantos processos, a mediana de dias na fase, quantos passam de 90 dias e quantos têm início desconhecido. */
export function quadroFases(historico: HistoricoGovadm, data: string, limite = 90) {
  const grupos = new Map<string, ReturnType<typeof diasNaFase>>();
  for (const row of diasNaFase(historico, data)) { const chave = `${row.lotacao}\u0000${row.fase}`; grupos.set(chave, [...(grupos.get(chave) ?? []), row]); }
  return [...grupos.values()].map(rows => ({ lotacao: rows[0].lotacao, fase: rows[0].fase, processos: rows.length, medianaDias: mediana(rows.map(r => r.dias)),
    acima90: rows.filter(r => r.dias > limite).length, desdeDesconhecido: rows.filter(r => !r.desdeConhecido).length }));
}
