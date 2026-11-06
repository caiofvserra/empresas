// Baixa os JSON Schemas oficiais do PBIP/PBIR (github.com/microsoft/json-schemas) e o schema de tema
// (github.com/microsoft/powerbi-desktop-samples) para tests/fixtures/powerbi-schemas/, seguindo os $ref relativos.
// Os testes validam o pacote Power BI contra esses arquivos sem acesso à rede. Rodar só para atualizar as versões.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const RAIZ = 'https://raw.githubusercontent.com/microsoft/json-schemas/main/';
const SITE = 'https://developer.microsoft.com/json-schemas/';
const DESTINO = join(import.meta.dirname, '../../tests/fixtures/powerbi-schemas');
const iniciais = [
  'fabric/pbip/pbipProperties/1.0.0/schema.json',
  'fabric/item/report/definitionProperties/2.0.0/schema.json',
  'fabric/item/semanticModel/definitionProperties/1.0.0/schema.json',
  'fabric/item/report/definition/report/3.3.0/schema.json',
  'fabric/item/report/definition/page/2.1.0/schema.json',
  'fabric/item/report/definition/pagesMetadata/1.1.0/schema.json',
  'fabric/item/report/definition/versionMetadata/1.0.0/schema.json',
  'fabric/item/report/definition/visualContainer/2.13.0/schema.json',
];
const vistos = new Set();
async function baixar(caminho) {
  if (vistos.has(caminho)) return; vistos.add(caminho);
  const resposta = await fetch(RAIZ + caminho); if (!resposta.ok) throw new Error(`${resposta.status} ${caminho}`);
  const texto = await resposta.text(), arquivo = join(DESTINO, caminho);
  mkdirSync(dirname(arquivo), { recursive: true }); writeFileSync(arquivo, texto);
  for (const [, ref] of texto.matchAll(/"\$ref"\s*:\s*"([^"#]+)(?:#[^"]*)?"/g)) {
    const alvo = ref.startsWith(SITE) ? ref.slice(SITE.length) : new URL(ref, RAIZ + caminho).href.slice(RAIZ.length);
    await baixar(alvo);
  }
}
for (const caminho of iniciais) await baixar(caminho);
const tema = await fetch('https://raw.githubusercontent.com/microsoft/powerbi-desktop-samples/main/Report%20Theme%20JSON%20Schema/reportThemeSchema-2.159.json');
if (!tema.ok) throw new Error(`${tema.status} tema`);
mkdirSync(join(DESTINO, 'tema'), { recursive: true }); writeFileSync(join(DESTINO, 'tema/reportThemeSchema-2.159.json'), await tema.text());
console.log(`${vistos.size} schemas e o tema em ${DESTINO}`);
