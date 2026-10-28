import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { dataset } from '../src/domain/dataset.ts';
import { defaultFilters } from '../src/domain/types.ts';
import { exportCsv, selectScope, summarize } from '../src/domain/engine.ts';
import { exportProfessionalCsv, selectProfessionalScope } from '../src/domain/professionals.ts';

const output = process.env.QA_OUTPUT || resolve('test-results/production-v5');
const baseURL = process.env.QA_URL || 'http://127.0.0.1:4173/';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [], httpFailures = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('response', response => { if (response.status() >= 400) httpFailures.push({ url: response.url(), status: response.status() }); });
const pages = [['overview', 'Visão integrada'], ['companies', 'Empresas'], ['professionals', 'Profissionais e formação'], ['market', 'Mercado e emprego'], ['contracts', 'Contratações'], ['inspection', 'Fiscalização']];
const nav = async title => { await page.locator('.r5-pages').getByRole('button', { name: title, exact: true }).click(); await expect(page.locator('main .r5-panel')).toHaveCount(6); await page.waitForTimeout(500); };
const ready = async () => { for (const host of await page.locator('main .p-chart-canvas').all()) { await host.locator('svg').waitFor(); await expect(host).toHaveAttribute('aria-busy', 'false'); } };
const clear = async () => { await page.getByLabel('Perfil demonstrativo', { exact: true }).selectOption('admin'); await page.getByLabel('Limpar todas as segmentações', { exact: true }).click(); await page.waitForTimeout(300); };
const download = async action => { const pending = page.waitForEvent('download'); await action(); const result = await pending; return readFile(await result.path(), 'utf8'); };

try {
  await page.goto(baseURL, { waitUntil: 'networkidle' }); await ready(); await clear();
  for (const [width, height] of [[1920, 1080], [1366, 768], [1024, 768], [768, 1024], [390, 844]]) {
    await page.setViewportSize({ width, height });
    for (const [id, title] of pages) {
      await nav(title); await ready();
      const geometry = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight,
        panels: [...document.querySelectorAll('.r5-panel')].map(element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }),
        chartHeights: [...document.querySelectorAll('main .p-chart-canvas')].map(element => element.getBoundingClientRect().height),
      }));
      assert(geometry.documentWidth <= width + 1, `${id} has horizontal overflow at ${width}`);
      assert.equal(await page.locator('main .r5-kpi').count(), 5);
      assert.equal(geometry.panels.length, 6); assert.equal(geometry.chartHeights.length, 6);
      if (width >= 1100) {
        assert(geometry.documentHeight <= height + 2, `${id} requires scrolling at ${width}`);
        assert(geometry.panels.every(panel => panel.y >= 0 && panel.y + panel.height <= height - 30));
        assert(geometry.chartHeights.every(value => value >= 140), `${id} has compressed charts at ${width}`);
        await page.screenshot({ path: `${output}/${id}-${width}.png` });
      }
      checks.push({ name: `${id} ${width}×${height}`, geometry });
    }
  }
  await page.setViewportSize({ width: 1920, height: 1080 }); await clear();
  const scope = selectScope(dataset, defaultFilters);
  await nav('Visão integrada');
  assert.equal(await page.locator('[data-metric="registeredCompanies"] strong').textContent(), summarize(scope).registeredCompanies.toLocaleString('pt-BR'));
  await page.getByLabel('Selecionar Empresas ativas', { exact: true }).click();
  await page.getByLabel('Ver dados que sustentam o recorte', { exact: true }).click();
  await page.locator('#company-list .p-company-link').first().click();
  await page.getByLabel('Detalhes da empresa', { exact: true }).waitFor(); await page.keyboard.press('Escape');
  checks.push({ name: 'Production KPI → analytical subset → company drillthrough' });
  await clear(); await nav('Empresas');
  assert.equal(await download(() => page.getByLabel('Exportar dados do recorte', { exact: true }).click()), exportCsv(scope, { financial: true, export: true }));
  await nav('Profissionais e formação');
  assert.equal(await download(() => page.getByLabel('Exportar dados do recorte', { exact: true }).click()), exportProfessionalCsv(selectProfessionalScope(scope), true));
  checks.push({ name: 'Compiled application exports actual company and professional source rows' });
  await page.getByLabel('Perfil demonstrativo', { exact: true }).selectOption('viewer');
  await expect(page.getByLabel('Exportar dados do recorte', { exact: true })).toBeDisabled();
  await nav('Empresas'); await expect(page.locator('[data-metric="compliance"] strong')).toHaveText('Restrito');
  await nav('Fiscalização'); assert.equal(await page.locator('main input:not([type="checkbox"]), main textarea').count(), 0);
  checks.push({ name: 'Viewer monetary/export restrictions and read-only inspection survive compilation' });
  const docs = ['SOURCES', 'NORMAS', 'MODELO_DADOS', 'POWER_BI', 'DESIGN_POWER_BI', 'ARQUITETURA_BI_V5', 'INSPIRACOES_REPOSITORIOS', 'DADOS_EXTERNOS_V5', 'REPOSITORIOS_USUARIO_V5', 'REPOSITORIOS_DADOS_V5', 'REFERENCIAS_DRIVE_V5', 'REFERENCIAS_VISUAIS_V5'];
  for (const doc of docs) { const response = await context.request.get(new URL(`docs/${doc}.md`, baseURL).href); assert.equal(response.status(), 200); assert((await response.text()).startsWith('# '), `${doc} must serve Markdown, not the app fallback`); }
  checks.push({ name: 'Twelve source, design and Power BI documents available', documents: docs });
  assert.equal(errors.length, 0, JSON.stringify(errors)); assert.equal(httpFailures.length, 0, JSON.stringify(httpFailures));
  checks.push({ name: 'No JavaScript, console or HTTP errors' });
  const report = { passed: checks.length, failed: 0, desktopCanvases: 12, responsiveCanvases: 18, checks, errors, httpFailures };
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify({ passed: report.passed, desktopCanvases: 12, responsiveCanvases: 18, errors, httpFailures }));
} finally { await browser.close(); }
