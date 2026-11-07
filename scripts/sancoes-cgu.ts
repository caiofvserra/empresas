/**
 * Coletor das sanções da CGU (CEIS e CNEP) para o cruzamento com as empresas registradas no Crea-SP (07/11/2026).
 *
 *   node --import tsx scripts/sancoes-cgu.ts [--data AAAA-MM-DD] [--destino var/sancoes]
 *
 * Baixa o ZIP do dia de cada cadastro no Portal da Transparência, sem credencial. O arquivo do dia sai no fim da tarde: sem
 * ele, o coletor recua um dia por vez, até dez. Grava em var/sancoes, fora do Git (tem nome de empresa e número de processo):
 *   - sancoes-pj.csv: as sanções contra pessoa jurídica dos dois cadastros, para a carga de stg.cgu_sancao e o cruzamento
 *     de integrations/sql/sancoes-x-cadastro.sql;
 *   - os ZIP baixados, para conferir depois o que entrou.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csv } from '../src/powerbi/csv.ts';
import { colunasStagingSancoes, lerSancoes, linhaStaging, vigentes } from './integrations/sancoes.ts';
import type { CadastroCgu, SancaoPj } from './integrations/sancoes.ts';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PORTAL_CGU = 'https://portaldatransparencia.gov.br/download-de-dados';
const RECUO_DIAS = 10;
const compacta = (dia: string) => dia.replaceAll('-', '');
/** Grava num arquivo temporário e troca de nome: uma queda no meio não deixa arquivo pela metade. */
const gravar = (arquivo: string, conteudo: string | Buffer) => { writeFileSync(`${arquivo}.tmp`, conteudo); renameSync(`${arquivo}.tmp`, arquivo); };
/** Hoje no horário de Brasília: depois das 21h, o dia em UTC já é o seguinte. */
const hojeEmBrasilia = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const diaAntes = (dia: string) => new Date(Date.parse(`${dia}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

/** O ZIP mais recente do cadastro até a data. O portal responde 403 ou uma página quando o arquivo do dia ainda não saiu. */
async function baixar(cadastro: CadastroCgu, data: string, destino: string): Promise<{ dia: string; zip: string }> {
  for (let dia = data, recuo = 0; recuo <= RECUO_DIAS; recuo++, dia = diaAntes(dia)) {
    const zip = join(destino, `${compacta(dia)}_${cadastro}.zip`);
    if (existsSync(zip)) return { dia, zip };
    const resposta = await fetch(`${PORTAL_CGU}/${cadastro.toLowerCase()}/${compacta(dia)}`);
    const corpo = resposta.ok ? Buffer.from(await resposta.arrayBuffer()) : null;
    if (!corpo || corpo.subarray(0, 2).toString('latin1') !== 'PK') continue;
    gravar(zip, corpo);
    return { dia, zip };
  }
  throw new Error(`O Portal da Transparência não tem ${cadastro} em ${data} nem nos ${RECUO_DIAS} dias anteriores.`);
}

/** O CSV de dentro do ZIP, em Latin-1, como a CGU publica. */
function lerZip(zip: string) {
  const unzip = spawnSync('unzip', ['-p', zip, '*.csv'], { maxBuffer: 512 * 1024 * 1024 });
  if (unzip.status !== 0) throw new Error(`unzip ${zip} terminou com ${unzip.status}: ${unzip.stderr.toString()}`);
  return unzip.stdout.toString('latin1');
}

export async function coletar({ data, destino }: { data: string; destino: string }) {
  mkdirSync(destino, { recursive: true });
  const linhas: string[][] = [], todas: SancaoPj[] = [], arquivos: Record<string, string> = {};
  for (const cadastro of ['CEIS', 'CNEP'] as const) {
    const { dia, zip } = await baixar(cadastro, data, destino), sancoes = lerSancoes(lerZip(zip));
    if (!sancoes.length) throw new Error(`O ${cadastro} de ${dia} veio sem nenhuma sanção contra empresa: arquivo incompleto ou cabeçalho novo.`);
    arquivos[cadastro] = dia; todas.push(...sancoes);
    for (const s of sancoes) linhas.push(linhaStaging(dia, s));
    console.log(`${cadastro} de ${dia}: ${sancoes.length} sanções contra empresas`);
  }
  const arquivo = join(destino, colunasStagingSancoes.arquivo);
  gravar(arquivo, csv([...colunasStagingSancoes.colunas], linhas));
  const emVigor = vigentes(todas, data), impedem = emVigor.filter(s => s.impedeContratar);
  const resumo = {
    arquivos, data, sancoes: todas.length, emVigor: emVigor.length,
    empresasQueNaoPodemContratar: new Set(impedem.map(s => s.cnpjBasico)).size,
    empresasEmTodasAsEsferas: new Set(impedem.filter(s => s.alcance === 'Todas as esferas').map(s => s.cnpjBasico)).size,
    empresasNoCnep: new Set(emVigor.filter(s => s.cadastro === 'CNEP').map(s => s.cnpjBasico)).size,
  };
  console.log(JSON.stringify(resumo));
  return resumo;
}

async function main(args: string[]) {
  const flag = (nome: string) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : undefined; };
  const data = flag('--data') ?? hojeEmBrasilia();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error('Uso: [--data AAAA-MM-DD] [--destino pasta]');
  await coletar({ data, destino: resolve(flag('--destino') ?? join(RAIZ, 'var/sancoes')) });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).catch(erro => { console.error(erro.message); process.exitCode = 1; });
