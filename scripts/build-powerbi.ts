// Gera o pacote Power BI de cada painel em entrega/powerbi/<painel>/ (ver docs/POWERBI.md e a ADR 0001).
// A pasta é apagada e escrita de novo, para não sobrar arquivo de uma versão anterior. Com um caminho no argumento
// (`npm run build:powerbi -- <arquivo.zip>`), grava também o zip do pacote, com os nomes dos arquivos em UTF-8.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';
import { dataset } from '../src/domain/dataset';
import { pacotePowerBi } from '../src/powerbi/pacote';

const destino = join(import.meta.dirname, '../entrega/powerbi/empresas');
rmSync(destino, { recursive: true, force: true });
const arquivos = pacotePowerBi('empresas', dataset);
for (const [caminho, texto] of arquivos) { const alvo = join(destino, caminho); mkdirSync(dirname(alvo), { recursive: true }); writeFileSync(alvo, texto, 'utf8'); }
console.log(`${arquivos.size} arquivos em ${destino}`);

const zip = process.argv[2];
if (zip) {
  const alvo = resolve(zip);
  mkdirSync(dirname(alvo), { recursive: true });
  writeFileSync(alvo, zipar([...arquivos].map(([caminho, texto]) => [`empresas/${caminho}`, Buffer.from(texto, 'utf8')])));
  console.log(`zip em ${alvo}`);
}

/**
 * Zip mínimo (deflate, sem pastas vazias). O bit 11 (0x800) marca os nomes em UTF-8: sem ele, o Windows mostra
 * "Período" e "Vínculos" com letras trocadas.
 */
function zipar(entradas: [string, Buffer][]): Buffer {
  // DATA_DOS: 01/01/1980, a primeira data do formato, para o zip sair igual a cada execução.
  const UTF8 = 0x800, DEFLATE = 8, DATA_DOS = (1 << 5) | 1, locais: Buffer[] = [], centrais: Buffer[] = [];
  let posicao = 0;
  for (const [caminho, dados] of entradas) {
    const nome = Buffer.from(caminho, 'utf8'), comprimido = deflateRawSync(dados), crc = crc32(dados);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(UTF8, 6); local.writeUInt16LE(DEFLATE, 8);
    local.writeUInt16LE(DATA_DOS, 12); local.writeUInt32LE(crc, 14); local.writeUInt32LE(comprimido.length, 18); local.writeUInt32LE(dados.length, 22);
    local.writeUInt16LE(nome.length, 26); local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(UTF8, 8); central.writeUInt16LE(DEFLATE, 10);
    central.writeUInt16LE(DATA_DOS, 14); central.writeUInt32LE(crc, 16); central.writeUInt32LE(comprimido.length, 20); central.writeUInt32LE(dados.length, 24);
    central.writeUInt16LE(nome.length, 28); central.writeUInt32LE(posicao, 42);
    locais.push(local, nome, comprimido); centrais.push(central, nome);
    posicao += local.length + nome.length + comprimido.length;
  }
  const tamanhoCentral = centrais.reduce((soma, parte) => soma + parte.length, 0), fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0); fim.writeUInt16LE(entradas.length, 8); fim.writeUInt16LE(entradas.length, 10);
  fim.writeUInt32LE(tamanhoCentral, 12); fim.writeUInt32LE(posicao, 16);
  return Buffer.concat([...locais, ...centrais, fim]);
}
