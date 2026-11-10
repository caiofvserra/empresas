// Gera os painéis em HTML único e autocontido: entrega/painel-presidencia-creasp.html (Presidência), entrega/painel-empresas-creasp.html (Empresas)
// entrega/painel-profissionais-creasp.html (Profissionais), entrega/painel-fiscalizacao-creasp.html (Fiscalização e malha fina), entrega/painel-financeiro-creasp.html
// (Financeiro), entrega/painel-atendimento-creasp.html (Atendimento), entrega/painel-conselho-creasp.html (Gestão do Conselho) e entrega/painel-indicadores-creasp.html (Indicadores do Sistema). Com --artifact <arquivo>, grava também a versão do painel de Empresas sem o
// esqueleto <html>/<head>/<body>, usada para publicar como página.
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
gerar('vite.presidencia.config.ts', 'dist-presidencia', 'presidencia.html', 'entrega/painel-presidencia-creasp.html');
const empresas = gerar('vite.empresas.config.ts', 'dist-empresas', 'empresas.html', 'entrega/painel-empresas-creasp.html');
gerar('vite.profissionais.config.ts', 'dist-profissionais', 'profissionais.html', 'entrega/painel-profissionais-creasp.html');
gerar('vite.fiscalizacao.config.ts', 'dist-fiscalizacao', 'fiscalizacao.html', 'entrega/painel-fiscalizacao-creasp.html');
gerar('vite.financeiro.config.ts', 'dist-financeiro', 'financeiro.html', 'entrega/painel-financeiro-creasp.html');
gerar('vite.atendimento.config.ts', 'dist-atendimento', 'atendimento.html', 'entrega/painel-atendimento-creasp.html');
gerar('vite.conselho.config.ts', 'dist-conselho', 'conselho.html', 'entrega/painel-conselho-creasp.html');
gerar('vite.indicadores.config.ts', 'dist-indicadores', 'indicadores.html', 'entrega/painel-indicadores-creasp.html');
const index = process.argv.indexOf('--artifact');
if (index > 0) {
  const body = empresas.replace(/<!doctype html>/i, '').replace(/<\/?html[^>]*>/gi, '').replace(/<\/?head>/gi, '').replace(/<\/?body>/gi, '')
    .replace(/<meta charset="UTF-8"\s*\/?>/i, '').replace(/<meta name="viewport"[^>]*>/i, '<meta name="claude:viewport-fit-sides" content="cover">');
  writeFileSync(process.argv[index + 1], body.trim());
}
