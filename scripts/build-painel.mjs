// Gera o painel (V20) em um único HTML autocontido: entrega/painel-gestao-creasp.html.
// Com --artifact <arquivo>, grava também a versão sem o esqueleto <html>/<head>/<body>, usada para publicar como página.
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

execSync('npx vite build -c vite.painel.config.ts', { stdio: 'inherit' });
const html = readFileSync('dist-painel/painel.html', 'utf8');
mkdirSync('entrega', { recursive: true });
writeFileSync('entrega/painel-gestao-creasp.html', html);
const index = process.argv.indexOf('--artifact');
if (index > 0) {
  const body = html.replace(/<!doctype html>/i, '').replace(/<\/?html[^>]*>/gi, '').replace(/<\/?head>/gi, '').replace(/<\/?body>/gi, '')
    .replace(/<meta charset="UTF-8"\s*\/?>/i, '').replace(/<meta name="viewport"[^>]*>/i, '<meta name="claude:viewport-fit-sides" content="cover">');
  writeFileSync(process.argv[index + 1], body.trim());
}
console.log(`entrega/painel-gestao-creasp.html: ${(html.length / 1024 / 1024).toFixed(2)} MB`);
