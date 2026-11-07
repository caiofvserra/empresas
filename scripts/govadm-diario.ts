/**
 * Cópia diária do Relatório de Processos do GovAdm para o painel de Gestão do Conselho (07/11/2026).
 *
 *   node --import tsx scripts/govadm-diario.ts --pasta <saida do extracao-govadm> [--historico var/govadm/historico.json] [--destino var/govadm]
 *
 * Roda logo depois do `python main.py diario` do extracao-govadm. Lê os `relatorio_processos_AAAAMMDD_HHMM_limpo.csv` da pasta
 * de dias que ainda não entraram no histórico, um por dia (o último do dia), em ordem de data, e grava:
 *   - o histórico de passagens por fase de cada processo (JSON);
 *   - dias-na-fase.csv: cada processo na fase atual, com os dias e o responsável, para a base interna e o Power BI;
 *   - fases-AAAA-MM-DD.csv: o quadro por câmara e fase do dia, só com números.
 * Um dia já registrado não muda mais, e um dia anterior ao último registrado é ignorado com aviso.
 * Tudo fica em var/govadm, fora do Git: o relatório tem nome de interessado e de responsável.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csv } from '../src/powerbi/csv.ts';
import { dataDoArquivo, diasNaFase, historicoVazio, lerRelatorio, lotacoesQueFaltaram, quadroFases, registrarCopia } from './integrations/govadm.ts';
import type { HistoricoGovadm } from './integrations/govadm.ts';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** Grava num arquivo temporário e troca de nome: uma queda no meio da gravação não corrompe o histórico. */
const gravar = (arquivo: string, texto: string) => { writeFileSync(`${arquivo}.tmp`, texto); renameSync(`${arquivo}.tmp`, arquivo); };
/** CSV com BOM, para o Excel no Windows ler "Lotação" e "Manifestação" sem estragar os acentos; o Power Query lê igual. */
const comBom = (texto: string) => `\uFEFF${texto}`;

export function copiar({ pasta, historico: arquivoHistorico, destino }: { pasta: string; historico: string; destino: string }) {
  let historico: HistoricoGovadm = existsSync(arquivoHistorico) ? JSON.parse(readFileSync(arquivoHistorico, 'utf8')) : historicoVazio();
  // Um arquivo por dia: o nome ordena pela hora, então vale o último de cada data. Depois de registrado, o dia não muda mais.
  const porDia = new Map<string, string>();
  for (const nome of readdirSync(pasta).filter(n => /^relatorio_processos_.*_limpo\.csv$/.test(n)).sort()) { const data = dataDoArquivo(nome); if (data) porDia.set(data, nome); }
  const registradas = new Set(historico.copias.map(c => c.data)), ultima = historico.copias.at(-1)?.data ?? '';
  const atrasadas = [...porDia.keys()].filter(data => data < ultima && !registradas.has(data));
  if (atrasadas.length) console.warn(`Ignoradas, por serem de antes da última cópia (${ultima}): ${atrasadas.join(', ')}. O histórico só anda para a frente.`);
  const novos = [...porDia].filter(([data]) => data > ultima).sort((a, b) => a[0].localeCompare(b[0]));
  if (!novos.length) { console.log(`Nenhuma cópia nova em ${pasta} depois de ${ultima || 'nenhuma'}.`); return historico; }
  mkdirSync(destino, { recursive: true }); mkdirSync(dirname(arquivoHistorico), { recursive: true });
  for (const [data, nome] of novos) {
    const linhas = lerRelatorio(readFileSync(join(pasta, nome), 'utf8')), faltaram = lotacoesQueFaltaram(historico, linhas);
    if (faltaram.length) console.warn(`${data}: faltaram ${faltaram.join(', ')} na extração; os processos delas seguem na fase de antes.`);
    historico = registrarCopia(historico, data, linhas);
    gravar(arquivoHistorico, JSON.stringify(historico)); // a cada dia: um arquivo ruim adiante não desfaz os dias já lidos
    console.log(`${data}: ${linhas.length} processos (${nome})`);
  }
  const dataDaUltimaCopia = historico.copias.at(-1)!.data, atuais = diasNaFase(historico, dataDaUltimaCopia);
  gravar(join(destino, 'dias-na-fase.csv'), comBom(csv(['data', 'processo', 'lotacao', 'fase', 'responsavel', 'cargo', 'desde', 'dias', 'desde_conhecido'],
    atuais.map(r => [dataDaUltimaCopia, r.processo, r.lotacao, r.fase, r.responsavel, r.cargo, r.desde, r.dias, r.desdeConhecido]))));
  gravar(join(destino, `fases-${dataDaUltimaCopia}.csv`), comBom(csv(['data', 'lotacao', 'fase', 'processos', 'mediana_dias', 'parados', 'desde_desconhecido'],
    quadroFases(historico, dataDaUltimaCopia).map(r => [dataDaUltimaCopia, r.lotacao, r.fase, r.processos, r.medianaDias, r.parados, r.desdeDesconhecido]))));
  console.log(JSON.stringify({ copias: historico.copias.length, de: historico.copias[0].data, ate: dataDaUltimaCopia, processosNaFase: atuais.length, desdeDesconhecido: atuais.filter(r => !r.desdeConhecido).length }));
  return historico;
}
function main(args: string[]) {
  const flag = (nome: string) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : undefined; };
  const pasta = flag('--pasta');
  if (!pasta) throw new Error('Uso: --pasta <saida do extracao-govadm> [--historico arquivo.json] [--destino pasta]');
  copiar({ pasta: resolve(pasta), historico: resolve(flag('--historico') ?? join(RAIZ, 'var/govadm/historico.json')), destino: resolve(flag('--destino') ?? join(RAIZ, 'var/govadm')) });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { try { main(process.argv.slice(2)); } catch (erro) { console.error((erro as Error).message); process.exitCode = 1; } }
