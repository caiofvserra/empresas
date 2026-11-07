/**
 * Relatório de Processos do GovAdm, uma cópia por dia (07/11/2026): o que o painel de Gestão do Conselho precisa para contar os
 * dias que cada processo está na fase atual do GovAdm. O relatório só mostra a fase de hoje; guardando a cópia de cada dia, a
 * mudança de fase aparece de um dia para o outro, e o período na fase ganha data de início.
 *
 * A cópia vem do repositório extracao-govadm (`python main.py diario`), que baixa o relatório das nove câmaras e grava
 * `saida/relatorio_processos_AAAAMMDD_HHMM_limpo.csv`. Funções puras: a leitura dos arquivos fica em scripts/govadm-diario.ts.
 * O histórico tem o nome do responsável e fica fora do Git; o quadro por câmara e fase só tem números.
 */
import { normalizar, registros } from './csv-ponto-e-virgula.ts';

/** O que o histórico guarda de cada processo numa cópia: onde está, em que fase e com quem. */
export interface SituacaoGovadm { lotacao: string; fase: string; responsavel: string; cargo: string }
export interface LinhaGovadm extends SituacaoGovadm { processo: string }
/** Um período de um processo numa fase e numa lotação. `ate` vazio é o período atual; `saiu` marca o fim por sumiço do relatório. */
export interface PeriodoNaFase extends SituacaoGovadm { desde: string; ate: string | null; desdeConhecido: boolean; saiu?: boolean }
/** As cópias registradas (data e lotações que vieram em cada uma) e os períodos de cada processo. */
export interface HistoricoGovadm { copias: { data: string; lotacoes: string[] }[]; processos: Record<string, PeriodoNaFase[]> }

/** Nomes que o GovAdm já usou para cada coluna, como no extracao-govadm (extracao/metricas.py). O cargo pode faltar. */
const colunas = { processo: ['Nº do Processo', 'N° do Processo', 'Numero do Processo'], lotacao: ['Lotação Atual'], responsavel: ['Responsável', 'Responsável Atual'], fase: ['Fase', 'Fase Atual'], cargo: ['Cargo'] } as const;
const obrigatorias: (keyof typeof colunas)[] = ['processo', 'lotacao', 'responsavel', 'fase'];
/** Fase de processo arquivado: sai da contagem, como no extracao-govadm. "Desarquivado" não é arquivado. */
const arquivado = (fase: string) => /(^|[^a-z])arquivad[oa]s?($|[^a-z])/.test(normalizar(fase));
/** Dias acima dos quais o processo conta como parado no quadro por câmara e fase. */
export const DIAS_PARADO = 90;

/** Lê o CSV limpo (";", com ou sem BOM) pelo nome das colunas. Linha sem número de processo e processo arquivado ficam de fora. */
export function lerRelatorio(texto: string): LinhaGovadm[] {
  const [primeira = [], ...linhas] = registros(texto.replace(/^﻿/, '')), cabecalho = primeira.map(normalizar);
  const indice = Object.fromEntries(Object.entries(colunas).map(([campo, nomes]) => [campo, cabecalho.findIndex(c => nomes.some(n => normalizar(n) === c))])) as Record<keyof typeof colunas, number>;
  const faltam = obrigatorias.filter(campo => indice[campo] < 0).map(campo => colunas[campo][0]);
  if (faltam.length) throw new Error(`O relatório do GovAdm não tem as colunas ${faltam.join(', ')}. Cabeçalho lido: ${primeira.join(';')}`);
  const saida: LinhaGovadm[] = [];
  for (const campos of linhas) {
    const valor = (campo: keyof typeof colunas) => (indice[campo] < 0 ? '' : campos[indice[campo]] ?? '').trim();
    if (!valor('processo') || arquivado(valor('fase'))) continue;
    saida.push({ processo: valor('processo'), lotacao: valor('lotacao'), fase: valor('fase'), responsavel: valor('responsavel'), cargo: valor('cargo') });
  }
  return saida;
}

/** A data da cópia, pelo nome do arquivo do extracao-govadm (relatorio_processos_AAAAMMDD_HHMM_limpo.csv), ou null se não for uma data. */
export function dataDoArquivo(nome: string): string | null {
  const m = nome.match(/(\d{4})(\d{2})(\d{2})_\d{4}/);
  if (!m) return null;
  const data = `${m[1]}-${m[2]}-${m[3]}`, d = new Date(`${data}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === data ? data : null;
}

export const historicoVazio = (): HistoricoGovadm => ({ copias: [], processos: {} });
const mesmaFase = (a: SituacaoGovadm, b: SituacaoGovadm) => a.fase === b.fase && a.lotacao === b.lotacao;

/**
 * Soma a cópia de um dia ao histórico e devolve um histórico novo.
 * - Processo novo, ou que mudou de fase ou de lotação: abre um período que começa no dia da cópia. Na primeira cópia, a data de
 *   início é desconhecida (o processo já estava na fase antes de a cópia diária começar), e o período fica marcado.
 * - Troca só do responsável, na mesma fase: o período continua, com o responsável novo. A contagem de dias não reinicia.
 * - Processo que sumiu do relatório (arquivado, ou saiu das câmaras): o período fecha no dia da cópia, mas só se a lotação dele
 *   veio na cópia. Câmara que faltou na extração não fecha nada: o processo segue na fase até a próxima cópia completa.
 * - Processo que volta na cópia seguinte à do sumiço, na mesma fase e lotação: o período reabre, sem perder os dias.
 * - Processo repetido na mesma cópia: vale a linha igual ao período atual, se houver; senão, a primeira em ordem de lotação e fase.
 * Cópia do mesmo dia da última é ignorada (o agendador pode rodar duas vezes); cópia mais antiga é recusada.
 */
export function registrarCopia(historico: HistoricoGovadm, data: string, linhas: LinhaGovadm[]): HistoricoGovadm {
  const ultima = historico.copias.at(-1)?.data;
  if (ultima === data) return historico;
  if (ultima && data < ultima) throw new Error(`A cópia de ${data} é mais antiga que a última registrada (${ultima}).`);
  const primeira = historico.copias.length === 0, lotacoes = new Set(linhas.map(l => l.lotacao)), processos: Record<string, PeriodoNaFase[]> = {};
  for (const [id, periodos] of Object.entries(historico.processos)) processos[id] = periodos.map(p => ({ ...p }));
  const porProcesso = new Map<string, LinhaGovadm[]>();
  for (const l of linhas) porProcesso.set(l.processo, [...(porProcesso.get(l.processo) ?? []), l]);
  for (const [processo, repetidas] of porProcesso) {
    const lista = processos[processo] ??= [], atual = lista.at(-1);
    const ordenadas = [...repetidas].sort((a, b) => a.lotacao.localeCompare(b.lotacao) || a.fase.localeCompare(b.fase));
    const l = (atual && ordenadas.find(r => mesmaFase(r, atual))) ?? ordenadas[0];
    const situacao: SituacaoGovadm = { lotacao: l.lotacao, fase: l.fase, responsavel: l.responsavel, cargo: l.cargo };
    if (atual && mesmaFase(atual, l) && (atual.ate === null || (atual.saiu && atual.ate === ultima))) { Object.assign(atual, { responsavel: l.responsavel, cargo: l.cargo, ate: null }); delete atual.saiu; continue; }
    if (atual && atual.ate === null) atual.ate = data;
    lista.push({ ...situacao, desde: data, ate: null, desdeConhecido: !primeira });
  }
  for (const [id, lista] of Object.entries(processos)) {
    const atual = lista.at(-1);
    if (!porProcesso.has(id) && atual && atual.ate === null && lotacoes.has(atual.lotacao)) { atual.ate = data; atual.saiu = true; }
  }
  return { copias: [...historico.copias, { data, lotacoes: [...lotacoes].sort() }], processos };
}

/** Lotações que vieram na cópia anterior e faltaram nesta: sinal de extração incompleta. */
export function lotacoesQueFaltaram(historico: HistoricoGovadm, linhas: LinhaGovadm[]): string[] {
  const antes = historico.copias.at(-1)?.lotacoes ?? [], agora = new Set(linhas.map(l => l.lotacao));
  return antes.filter(l => !agora.has(l));
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
/** Por lotação (câmara) e fase: quantos processos, a mediana de dias na fase, quantos passam de DIAS_PARADO e quantos têm início desconhecido. */
export function quadroFases(historico: HistoricoGovadm, data: string) {
  const grupos = new Map<string, ReturnType<typeof diasNaFase>>();
  for (const linha of diasNaFase(historico, data)) { const chave = `${linha.lotacao}\u0000${linha.fase}`; grupos.set(chave, [...(grupos.get(chave) ?? []), linha]); }
  return [...grupos.values()].map(linhas => ({ lotacao: linhas[0].lotacao, fase: linhas[0].fase, processos: linhas.length, medianaDias: mediana(linhas.map(l => l.dias)),
    parados: linhas.filter(l => l.dias > DIAS_PARADO).length, desdeDesconhecido: linhas.filter(l => !l.desdeConhecido).length }));
}
