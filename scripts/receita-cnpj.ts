/**
 * Coletor dos dados abertos do CNPJ da Receita Federal para o painel de Empresas (07/11/2026).
 *
 *   node --import tsx scripts/receita-cnpj.ts --pasta var/receita/2026-10 --competencia 2026-10 [--baixar] [--desde 2023-11]
 *
 * Com --baixar, lê a lista de arquivos do mês no compartilhamento público da Receita e baixa os que faltam para a pasta.
 * Depois lê Estabelecimentos, Empresas e Sócios direto dos zip (sem descompactar no disco) e grava:
 *   - src/domain/receita-mercado-sp.json: a contagem por município do IBGE que o painel lê (só números, nenhum nome);
 *   - <pasta>/staging/: a situação de todos os estabelecimentos paulistas, os que têm atividade da lista, as empresas deles e os sócios, para a carga
 *     de staging do Crea-SP e o cruzamento com o cadastro (integrations/sql/receita-x-cadastro.sql). Fica fora do Git.
 */
import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import type { WriteStream } from 'node:fs';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { basicosAtivos, campos, catalogoCnae, colunasStaging, contar, fecharContagem, lerEstabelecimento, lerSocio, ligarMunicipios, nomeNormalizado, novaContagem, remendador } from './integrations/receita.ts';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** Compartilhamento público da Receita (Nextcloud): o token do link é o usuário do WebDAV, sem senha. */
export const RECEITA_WEBDAV = 'https://arquivos.receitafederal.gov.br/public.php/webdav';
const TOKEN = 'YggdBLfdninEJX9';
const autorizacao = `Basic ${Buffer.from(`${TOKEN}:`).toString('base64')}`;

async function listar(competencia: string): Promise<{ nome: string; bytes: number }[]> {
  const resposta = await fetch(`${RECEITA_WEBDAV}/${competencia}/`, { method: 'PROPFIND', headers: { Authorization: autorizacao, Depth: '1' } });
  if (!resposta.ok) throw new Error(`A Receita não listou ${competencia}: HTTP ${resposta.status}`);
  const xml = await resposta.text();
  return [...xml.matchAll(/<d:href>[^<]*\/([^/<]+\.zip)<\/d:href>[\s\S]*?<d:getcontentlength>(\d+)<\/d:getcontentlength>/g)].map(m => ({ nome: m[1], bytes: Number(m[2]) }));
}

async function baixar(competencia: string, pasta: string, nomes: RegExp) {
  for (const arquivo of (await listar(competencia)).filter(row => nomes.test(row.nome))) {
    const destino = join(pasta, arquivo.nome);
    for (let tentativa = 1; ; tentativa++) {
      const tamanho = existsSync(destino) ? statSync(destino).size : 0;
      if (tamanho === arquivo.bytes) break;
      try {
        const resposta = await fetch(`${RECEITA_WEBDAV}/${competencia}/${arquivo.nome}`, { headers: { Authorization: autorizacao, ...(tamanho ? { Range: `bytes=${tamanho}-` } : {}) } });
        if (!resposta.ok || !resposta.body) throw new Error(`HTTP ${resposta.status}`);
        await pipeline(Readable.fromWeb(resposta.body as never), createWriteStream(destino, { flags: tamanho && resposta.status === 206 ? 'a' : 'w' }));
      } catch (erro) {
        if (tentativa >= 6) throw new Error(`Falhou o download de ${arquivo.nome}: ${(erro as Error).message}`);
        await new Promise(ok => setTimeout(ok, 2 ** tentativa * 1000));
      }
    }
    console.log(`baixado ${arquivo.nome}`);
  }
}

/** Linhas de todos os arquivos de um zip da Receita, em Latin-1, sem descompactar no disco, com os registros quebrados remendados. */
async function* linhas(zip: string): AsyncGenerator<string> {
  const unzip = spawn('unzip', ['-p', zip], { stdio: ['ignore', 'pipe', 'inherit'] });
  unzip.stdout.setEncoding('latin1');
  const fim = new Promise<void>((ok, falha) => unzip.on('close', code => code === 0 ? ok() : falha(new Error(`unzip ${zip} terminou com ${code}`))));
  const passo = remendador();
  for await (const linha of createInterface({ input: unzip.stdout, crlfDelay: Infinity })) { const inteira = linha && passo(linha); if (inteira) yield inteira; }
  await fim;
}
/** Os dez zip de um tipo (Estabelecimentos0 a 9...). Falta de um deles para a coleta: contagem parcial seria pior que nenhuma. */
function zips(pasta: string, prefixo: string) {
  const todos = Array.from({ length: 10 }, (_, i) => join(pasta, `${prefixo}${i}.zip`)), faltam = todos.filter(zip => !existsSync(zip));
  if (faltam.length) throw new Error(`Faltam arquivos da Receita em ${pasta}: ${faltam.map(zip => zip.slice(pasta.length + 1)).join(', ')}. Rode de novo com --baixar.`);
  return todos;
}
const csv = (valores: (string | number | null)[]) => valores.map(v => v === null ? '' : /[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v)).join(';');
/** Grava uma linha e espera o disco quando o buffer enche, para milhões de linhas não ficarem na memória. */
async function gravar(saida: WriteStream, valores: (string | number | null)[]) { if (!saida.write(`${csv(valores)}\n`)) await once(saida, 'drain'); }
const fechar = (saida: WriteStream) => new Promise<void>(ok => saida.end(ok));

export async function coletar({ pasta, competencia, desde, saida }: { pasta: string; competencia: string; desde: string; saida: string }) {
  const catalogo = catalogoCnae(JSON.parse(readFileSync(join(RAIZ, 'src/domain/cnae-catalog.json'), 'utf8')));
  const geometria = JSON.parse(readFileSync(join(RAIZ, 'src/domain/sp-municipios.json'), 'utf8')) as { features: { properties: { codarea: string; name: string } }[] };
  const ibge = geometria.features.map(f => ({ id: f.properties.codarea, nome: f.properties.name }));
  const nomesRfb = new Map<string, string>();
  for await (const linha of linhas(join(pasta, 'Municipios.zip'))) { const [codigo, nome] = campos(linha); nomesRfb.set(codigo, nome); }
  // Município do IBGE de cada código paulista da Receita, ligado na primeira vez que o código aparece.
  const ibgeDe = new Map<string, string>(), semPar = new Set<string>();
  const municipioIbge = (rfb: string) => { if (!ibgeDe.has(rfb) && !semPar.has(rfb)) { const l = ligarMunicipios(nomesRfb, ibge, [rfb]); if (l.semPar.length) semPar.add(rfb); else ibgeDe.set(rfb, l.municipios.get(rfb)!); } return ibgeDe.get(rfb) ?? null; };
  const zipsEst = zips(pasta, 'Estabelecimentos'), zipsEmp = zips(pasta, 'Empresas'), zipsSoc = zips(pasta, 'Socios');

  // Staging para a base interna (integrations/sql/receita-x-cadastro.sql). Toda linha leva a competência do arquivo.
  const staging = join(pasta, 'staging'); mkdirSync(staging, { recursive: true });
  const est = createWriteStream(join(staging, 'estabelecimentos-sp.csv')), sit = createWriteStream(join(staging, 'situacao-sp.csv'));
  await gravar(est, [...colunasStaging['estabelecimentos-sp.csv'].colunas]);
  await gravar(sit, [...colunasStaging['situacao-sp.csv'].colunas]);
  const contagem = novaContagem({ desde }), daLista = new Set<string>();
  let lidas = 0, quebradas = 0;
  for (const zip of zipsEst) {
    for await (const linha of linhas(zip)) {
      lidas++;
      const e = lerEstabelecimento(linha);
      if (!e) { quebradas++; continue; }
      if (e.uf !== 'SP') continue;
      const ibgeId = municipioIbge(e.municipioRfb);
      // Todos os estabelecimentos paulistas, com ou sem atividade da lista: é a situação do CNPJ de quem tem registro no Crea-SP.
      await gravar(sit, [competencia, e.cnpj, e.situacao, e.dataSituacao, e.cnaePrincipal, ibgeId]);
      const enq = contar(contagem, e, catalogo);
      if (!enq) continue;
      daLista.add(e.basico);
      await gravar(est, [competencia, e.cnpj, e.basico, e.matriz ? 1 : 0, e.situacao, e.dataSituacao, e.inicio, enq.classe, enq.cnae, e.cnaePrincipal, e.municipioRfb, ibgeId]);
    }
    console.log(`lido ${zip} (${lidas.toLocaleString('pt-BR')} linhas no total)`);
  }
  await fechar(est); await fechar(sit);

  const ativos = basicosAtivos(contagem), porte = new Map<string, string>();
  const emp = createWriteStream(join(staging, 'empresas-sp.csv'));
  await gravar(emp, [...colunasStaging['empresas-sp.csv'].colunas]);
  for (const zip of zipsEmp) for await (const linha of linhas(zip)) {
    const c = campos(linha);
    if (c.length < 6 || !daLista.has(c[0])) continue;
    if (ativos.has(c[0])) porte.set(c[0], c[5]);
    await gravar(emp, [competencia, c[0], c[1], c[2], c[4], c[5]]);
  }
  await fechar(emp);

  // Sócios só das empresas paulistas com atividade da lista; o CPF fica mascarado como a Receita publica. O nome vai também
  // normalizado (sem acento, maiúsculo, espaços simples), a chave do casamento com o cadastro de profissionais.
  const soc = createWriteStream(join(staging, 'socios-sp.csv'));
  await gravar(soc, [...colunasStaging['socios-sp.csv'].colunas]);
  for (const zip of zipsSoc) for await (const linha of linhas(zip)) {
    const s = lerSocio(linha);
    if (s && daLista.has(s.basico)) await gravar(soc, [competencia, s.basico, s.tipo, s.nome, nomeNormalizado(s.nome), s.documento, s.qualificacao, s.entrada]);
  }
  await fechar(soc);

  // GRE de cada município pela tabela oficial do Crea-SP, a mesma do painel.
  const tabelaGre = JSON.parse(readFileSync(join(RAIZ, 'src/domain/gre-municipios.json'), 'utf8')) as Record<string, [number, string]>;
  const gres = new Map(Object.entries(tabelaGre).map(([id, [n]]) => [id, `GRE${n}`]));
  const mercado = fecharContagem(contagem, { competencia, municipios: ibgeDe, gres, porte, nomesRfb });
  writeFileSync(saida, `${JSON.stringify(mercado)}\n`);
  console.log(JSON.stringify({ competencia, linhasLidas: lidas, linhasQuebradas: quebradas, municipiosSp: ibgeDe.size + semPar.size, semPar: [...semPar].map(c => `${c} ${nomesRfb.get(c)}`), total: mercado.total }));
  return mercado;
}

async function main(args: string[]) {
  const flag = (nome: string) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : undefined; };
  const competencia = flag('--competencia'), pasta = flag('--pasta');
  if (!competencia || !/^\d{4}-\d{2}$/.test(competencia) || !pasta) throw new Error('Uso: --pasta <pasta> --competencia AAAA-MM [--baixar] [--desde AAAA-MM] [--saida arquivo.json]');
  const [ano, mes] = competencia.split('-').map(Number), inicio = new Date(Date.UTC(ano, mes - 1 - 35, 1));
  const desde = flag('--desde') ?? inicio.toISOString().slice(0, 7);
  mkdirSync(pasta, { recursive: true });
  if (args.includes('--baixar')) await baixar(competencia, pasta, /^(Estabelecimentos|Empresas|Socios)\d\.zip$|^Municipios\.zip$/);
  await coletar({ pasta: resolve(pasta), competencia, desde, saida: resolve(flag('--saida') ?? join(RAIZ, 'src/domain/receita-mercado-sp.json')) });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).catch(erro => { console.error(erro.message); process.exitCode = 1; });
