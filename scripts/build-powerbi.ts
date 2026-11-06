// Gera o pacote Power BI de cada painel em entrega/powerbi/<painel>/ (ver docs/POWERBI.md e a ADR 0001).
// A pasta é apagada e escrita de novo, para não sobrar arquivo de uma versão anterior.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { dataset } from '../src/domain/dataset';
import { pacotePowerBi } from '../src/powerbi/pacote';

const destino = join(import.meta.dirname, '../entrega/powerbi/empresas');
rmSync(destino, { recursive: true, force: true });
const arquivos = pacotePowerBi('empresas', dataset);
for (const [caminho, texto] of arquivos) { const alvo = join(destino, caminho); mkdirSync(dirname(alvo), { recursive: true }); writeFileSync(alvo, texto, 'utf8'); }
console.log(`${arquivos.size} arquivos em ${destino}`);
