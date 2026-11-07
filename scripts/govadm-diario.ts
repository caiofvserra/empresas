/**
 * Cópia diária do Relatório de Processos do GovAdm para o painel de Gestão do Conselho (07/11/2026).
 *
 *   node --import tsx scripts/govadm-diario.ts --pasta <saida do extracao-govadm> [--historico var/govadm/historico.json] [--destino var/govadm]
 *
 * Roda logo depois do `python main.py diario` do extracao-govadm. Lê os `relatorio_processos_AAAAMMDD_HHMM_limpo.csv` da pasta
 * que ainda não entraram no histórico, um por dia (o mais recente do dia), em ordem de data, e grava:
 *   - o histórico de passagens por fase de cada processo (JSON);
 *   - dias-na-fase.csv: cada processo na fase atual, com os dias e o responsável, para a base interna e o Power BI;
 *   - fases-AAAA-MM-DD.csv: o quadro por câmara e fase do dia, só com números.
 * Tudo fica em var/govadm, fora do Git: o relatório tem nome de interessado e de responsável.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dataDoArquivo, diasNaFase, historicoVazio, lerRelatorio, quadroFases, registrarFoto } from './integrations/govadm.ts';
import type { HistoricoGovadm } from './integrations/govadm.ts';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const csv = (linhas: (string | number | boolean)[][]) => linhas.map(l => l.map(v => /[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v)).join(';')).join('\n') + '\n';

export function copiar({ pasta, historico: arquivoHistorico, destino }: { pasta: string; historico: string; destino: string }) {
  let historico: HistoricoGovadm = existsSync(arquivoHistorico) ? JSON.parse(readFileSync(arquivoHistorico, 'utf8')) : historicoVazio();
  // Um arquivo por dia: o nome ordena pela hora, então o último de cada data é o mais recente.
  const porDia = new Map<string, string>();
  for (const nome of readdirSync(pasta).filter(n => /^relatorio_processos_.*_limpo\.csv$/.test(n)).sort()) { const data = dataDoArquivo(nome); if (data) porDia.set(data, nome); }
  const ultima = historico.fotos.at(-1) ?? '', novos = [...porDia].filter(([data]) => data > ultima).sort((a, b) => a[0].localeCompare(b[0]));
  if (!novos.length) { console.log(`Nenhuma foto nova em ${pasta} depois de ${ultima || 'nenhuma'}.`); return historico; }
  for (const [data, nome] of novos) {
    const linhas = lerRelatorio(readFileSync(join(pasta, nome), 'utf8'));
    historico = registrarFoto(historico, data, linhas);
    console.log(`${data}: ${linhas.length} processos (${nome})`);
  }
  const hoje = historico.fotos.at(-1)!;
  mkdirSync(destino, { recursive: true }); mkdirSync(dirname(arquivoHistorico), { recursive: true });
  writeFileSync(arquivoHistorico, JSON.stringify(historico));
  const atuais = diasNaFase(historico, hoje);
  writeFileSync(join(destino, 'dias-na-fase.csv'), csv([['data', 'processo', 'lotacao', 'fase', 'responsavel', 'cargo', 'desde', 'dias', 'desde_conhecido'],
    ...atuais.map(r => [hoje, r.processo, r.lotacao, r.fase, r.responsavel, r.cargo, r.desde, r.dias, r.desdeConhecido ? 1 : 0])]));
  writeFileSync(join(destino, `fases-${hoje}.csv`), csv([['data', 'lotacao', 'fase', 'processos', 'mediana_dias', 'acima_90_dias', 'desde_desconhecido'],
    ...quadroFases(historico, hoje).map(r => [hoje, r.lotacao, r.fase, r.processos, r.medianaDias, r.acima90, r.desdeDesconhecido])]));
  console.log(JSON.stringify({ fotos: historico.fotos.length, de: historico.fotos[0], ate: hoje, processosNaFase: atuais.length, desdeDesconhecido: atuais.filter(r => !r.desdeConhecido).length }));
  return historico;
}

function main(args: string[]) {
  const flag = (nome: string) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : undefined; };
  const pasta = flag('--pasta');
  if (!pasta) throw new Error('Uso: --pasta <saida do extracao-govadm> [--historico arquivo.json] [--destino pasta]');
  copiar({ pasta: resolve(pasta), historico: resolve(flag('--historico') ?? join(RAIZ, 'var/govadm/historico.json')), destino: resolve(flag('--destino') ?? join(RAIZ, 'var/govadm')) });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { try { main(process.argv.slice(2)); } catch (erro) { console.error((erro as Error).message); process.exitCode = 1; } }
