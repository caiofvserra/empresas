// Gera os painéis em HTML único e autocontido: entrega/painel-gestao-creasp.html (geral) e entrega/painel-empresas-creasp.html (Empresas).
// Com --artifact <arquivo>, grava também a versão do painel de Empresas sem o esqueleto <html>/<head>/<body>, usada para publicar como página.
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

mkdirSync('entrega', { recursive: true });
const gerar = (config, dist, entrada, saida) => {
  execSync(`npx vite build -c ${config}`, { stdio: 'inherit' });
  const html = readFileSync(`${dist}/${entrada}`, 'utf8');
  writeFileSync(saida, html);
  console.log(`${saida}: ${(html.length / 1024 / 1024).toFixed(2)} MB`);
  return html;
};
gerar('vite.painel.config.ts', 'dist-painel', 'painel.html', 'entrega/painel-gestao-creasp.html');
const empresas = gerar('vite.empresas.config.ts', 'dist-empresas', 'empresas.html', 'entrega/painel-empresas-creasp.html');
const index = process.argv.indexOf('--artifact');
if (index > 0) {
  const body = empresas.replace(/<!doctype html>/i, '').replace(/<\/?html[^>]*>/gi, '').replace(/<\/?head>/gi, '').replace(/<\/?body>/gi, '')
    .replace(/<meta charset="UTF-8"\s*\/?>/i, '').replace(/<meta name="viewport"[^>]*>/i, '<meta name="claude:viewport-fit-sides" content="cover">');
  writeFileSync(process.argv[index + 1], body.trim());
}
