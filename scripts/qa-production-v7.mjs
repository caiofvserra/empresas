import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { dataset } from '../src/domain/dataset.ts';
import { defaultFilters } from '../src/domain/types.ts';
import { exportCsv, selectScope, summarize } from '../src/domain/engine.ts';
import { exportProfessionalCsv, selectProfessionalScope, summarizeProfessionals } from '../src/domain/professionals.ts';

const output = process.env.QA_OUTPUT || resolve('test-results/production-v7');
const baseURL = process.env.QA_URL || 'http://127.0.0.1:4173/';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [], httpFailures = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('response', response => { if (response.status() >= 400) httpFailures.push({ url: response.url(), status: response.status() }); });
const pages = [['overview', 'Presidência e resultados'], ['companies', 'Empresas'], ['professionals', 'Profissionais e formação'], ['market', 'Mercado e emprego'], ['contracts', 'Contratações'], ['inspection', 'Fiscalização']];
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
  await nav('Empresas');
  assert.equal(await page.locator('[data-metric="registeredCompanies"] strong').textContent(), summarize(scope).registeredCompanies.toLocaleString('pt-BR'));
  await page.getByLabel('Selecionar Empresas no CREA', { exact: true }).click();
  await page.getByLabel('Ver dados que sustentam o recorte', { exact: true }).click();
  await page.locator('#company-list .p-company-link').first().click();
  await page.getByLabel('Detalhes da empresa', { exact: true }).waitFor(); await page.keyboard.press('Escape');
  checks.push({ name: 'Production company KPI → analytical subset → company drillthrough' });
  await clear(); await nav('Empresas');
  assert.equal(await download(() => page.getByLabel('Exportar dados do recorte', { exact: true }).click()), exportCsv(scope, { financial: true, export: true }));
  await nav('Presidência e resultados');
  const professionals = selectProfessionalScope(scope);
  const professionalMetrics = summarizeProfessionals(professionals);
  const metrics = summarize(scope);
  assert.equal(await page.locator('[data-metric="registeredCompanies"] strong').textContent(), metrics.registeredCompanies.toLocaleString('pt-BR'));
  assert.equal(await page.locator('[data-metric="activeProfessionals"] strong').textContent(), professionalMetrics.activeProfessionals.toLocaleString('pt-BR'));
  assert.equal(await page.locator('[data-metric="arts"] strong').textContent(), metrics.arts.toLocaleString('pt-BR'));
  assert.equal(await download(() => page.getByLabel('Exportar dados do recorte', { exact: true }).click()), exportCsv(scope, { financial: true, export: true }));
  assert.equal(await page.locator('.r6-publishedRow,.r5-public-kpi').count(), 0);
  checks.push({ name: 'Compiled executive source-grain KPIs and corporate CSV reconcile without frozen website/PDF claims' });
  await page.getByLabel('Selecionar Profissionais ativos', { exact: true }).click();
  await page.getByLabel('Ver dados que sustentam o recorte', { exact: true }).click();
  assert.equal(await page.locator('#professional-list .p-count').textContent(), professionalMetrics.activeProfessionals.toLocaleString('pt-BR'));
  await page.locator('#professional-list .p-company-link').first().click();
  await page.getByLabel('Fechar ficha do profissional', { exact: true }).waitFor(); await page.keyboard.press('Escape');
  checks.push({ name: 'Compiled executive person KPI → exact professional subset → professional drillthrough' });
  await clear();
  await nav('Profissionais e formação');
  const degreePeople = new Set(professionals.model.education.filter(row => row.level === 'Graduação' && professionals.profileIds.has(row.professionalId)).map(row => row.professionalId));
  assert.equal(await page.locator('[data-metric="registeredGraduates"] strong').textContent(), degreePeople.size.toLocaleString('pt-BR'));
  assert.equal(await download(() => page.getByLabel('Exportar dados do recorte', { exact: true }).click()), exportProfessionalCsv(selectProfessionalScope(scope), true));
  checks.push({ name: 'Compiled application exports actual company and professional source rows' });
  await nav('Presidência e resultados');
  await page.getByLabel('Fontes e metodologia', { exact: true }).click();
  const sourceDialog = page.getByRole('dialog', { name: 'Transparência da análise', exact: true }); await sourceDialog.waitFor();
  for (const id of ['creasp-sql-server', 'creasp-db2']) {
    await expect(sourceDialog.locator(`[data-source-id="${id}"]`)).toContainText('via gateway');
    await expect(sourceDialog.locator(`[data-source-id="${id}"]`)).toContainText('Não configurada');
  }
  await page.keyboard.press('Escape');
  checks.push({ name: 'Production source catalog presents SQL Server and Db2 gateway connections as unconfigured' });
  await page.locator('[data-panel="institutional-programs"]').getByRole('button', { name: 'Dados ↗', exact: true }).click();
  await page.getByRole('dialog', { name: 'Programas e serviços — dados do recorte', exact: true }).waitFor();
  assert.equal(await page.locator('#institutional-list').getByRole('tab').count(), 3); await page.keyboard.press('Escape');
  checks.push({ name: 'Program resources drill into read-only institutional source records' });
  await page.getByLabel('Perfil demonstrativo', { exact: true }).selectOption('viewer');
  await expect(page.getByLabel('Exportar dados do recorte', { exact: true })).toBeDisabled();
  await nav('Empresas'); await expect(page.locator('[data-metric="compliance"] strong')).toHaveText('Restrito');
  await nav('Fiscalização'); assert.equal(await page.locator('main input:not([type="checkbox"]), main textarea').count(), 0);
  checks.push({ name: 'Viewer monetary/export restrictions and read-only inspection survive compilation' });
  const docs = ['ATUALIZACAO_AUTOMATICA_V7', 'SOURCES', 'NORMAS', 'MODELO_DADOS', 'POWER_BI', 'DESIGN_POWER_BI', 'REFERENCIAS_DRIVE_V5', 'REFERENCIAS_VISUAIS_V5'];
  for (const doc of docs) { const response = await context.request.get(new URL(`docs/${doc}.md`, baseURL).href); assert.equal(response.status(), 200); assert((await response.text()).startsWith('# '), `${doc} must serve Markdown, not the app fallback`); }
  checks.push({ name: 'Automated-source, design and Power BI documents serve actual Markdown', documents: docs });
  assert.equal(errors.length, 0, JSON.stringify(errors)); assert.equal(httpFailures.length, 0, JSON.stringify(httpFailures));
  checks.push({ name: 'No JavaScript, console or HTTP errors' });
  const report = { passed: checks.length, failed: 0, desktopCanvases: 12, responsiveCanvases: 18, checks, errors, httpFailures };
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify({ passed: report.passed, desktopCanvases: 12, responsiveCanvases: 18, errors, httpFailures }));
} finally { await browser.close(); }
