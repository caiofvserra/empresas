import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { dataset } from '../src/domain/dataset.ts';
import { defaultFilters } from '../src/domain/types.ts';
import { exportCsv, selectScope } from '../src/domain/engine.ts';
import { exportProfessionalCsv, selectProfessionalScope, summarizeProfessionals } from '../src/domain/professionals.ts';
import { buildExecutiveCompanyContinuity, buildExecutiveProfessionalEngagement, buildExecutiveCorporateReceipts } from '../src/report/executive-decisions-v8.ts';
import { buildDigitalInspection, exportDigitalInspectionCsv } from '../src/domain/digital-inspection.ts';
import { selectTransparencyRows, exportTransparencyCsv } from '../src/domain/transparency.ts';

const output = process.env.QA_OUTPUT || resolve('test-results/production-v8');
const baseURL = process.env.QA_URL || 'http://127.0.0.1:4173/';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
const page = await context.newPage(); page.setDefaultTimeout(12000);
const errors = [], httpFailures = [], checks = [];
page.on('pageerror', error => errors.push(error.stack ?? error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('response', response => { if (response.status() >= 400) httpFailures.push({ url: response.url(), status: response.status() }); });
const pages = [['overview', 'Presidência e resultados'], ['companies', 'Empresas'], ['professionals', 'Profissionais e formação'], ['market', 'Mercado e emprego'], ['contracts', 'Contratações'], ['inspection', 'Fiscalização digital'], ['transparency', 'Transparência']];
const settle = async () => { await expect(page.locator('.r5-stage')).toHaveAttribute('aria-busy', 'false'); await page.waitForTimeout(200); };
const ready = async () => { for (const host of await page.locator('main .p-chart-canvas').all()) { await host.locator('svg').waitFor(); await expect(host).toHaveAttribute('aria-busy', 'false'); } };
const nav = async id => { await page.locator('.r5-pages').getByRole('button', { name: pages.find(row => row[0] === id)[1], exact: true }).click(); await expect(page.locator('.r5-app')).toHaveAttribute('data-page', id); await settle(); await ready(); if (id === 'transparency') await page.locator('[data-report="transparency"]').waitFor(); };
const close = async () => { for (let index = 0; index < 5 && await page.getByRole('dialog').count(); index++) await page.keyboard.press('Escape'); };
const clear = async () => { await close(); await page.getByLabel('Perfil demonstrativo', { exact: true }).selectOption('admin'); if (await page.locator('.r5-app').getAttribute('data-page') === 'transparency') await nav('overview'); await page.getByLabel('Limpar todas as segmentações', { exact: true }).click(); await settle(); };
const download = async action => { const pending = page.waitForEvent('download'); await action(); const result = await pending; return readFile(await result.path(), 'utf8'); };
const num = value => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const money = value => `R$ ${value.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })}`;
const kpi = id => page.locator(`[data-metric="${id}"] strong`);

try {
  await page.goto(baseURL, { waitUntil: 'networkidle' }); await ready(); await clear();
  assert.deepEqual(await page.locator('.r5-pages button').allTextContents(), pages.map(row => row[1]));
  for (const [width, height] of [[1920, 1080], [1366, 768], [1024, 768], [768, 1024], [390, 844]]) {
    await page.setViewportSize({ width, height });
    for (const [id] of pages) {
      await nav(id);
      const geometry = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight,
        navTop: document.querySelector('.r5-pages').getBoundingClientRect().top,
        panels: [...document.querySelectorAll('.r5-panel')].map(element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }),
        chartHeights: [...document.querySelectorAll('main .p-chart-canvas')].map(element => element.getBoundingClientRect().height),
      }));
      assert(geometry.documentWidth <= width + 1, `${id} has horizontal overflow at ${width}`);
      assert.equal(await page.locator('main .r5-kpi').count(), 5);
      if (id === 'transparency') {
        assert.equal(geometry.chartHeights.length, 0);
        assert.equal(await page.locator('[data-catalog-id]').count(), 4);
        if (width >= 1100) {
          const informative = await page.locator('[data-catalog-id]').last().locator('button,small,span').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().bottom)), catalogFooter = await page.locator('.r8-catalog > footer').boundingBox();
          assert(catalogFooter && informative.every(bottom => bottom <= catalogFooter.y + 1), 'Catalog last-row informative content must be visible without internal scrolling');
          const bounds = await page.locator('[data-report="transparency"]').boundingBox();
          assert(bounds && bounds.y + bounds.height <= geometry.navTop + 2);
        }
      } else {
        assert.equal(geometry.panels.length, 6); assert.equal(geometry.chartHeights.length, 6);
        if (width >= 1100) {
          assert(geometry.panels.every(panel => panel.y >= 0 && panel.y + panel.height <= geometry.navTop + 1));
          assert(geometry.chartHeights.every(value => value >= 100), `${id} has compressed charts at ${width}`);
        }
      }
      if (width >= 1100) {
        assert(geometry.documentHeight <= height + 1, `${id} requires document scrolling at ${width}`);
        await page.screenshot({ path: `${output}/${id}-${width}.png` });
      }
      checks.push({ name: `${id} ${width}×${height}`, geometry });
    }
  }
  await page.setViewportSize({ width: 1920, height: 1080 }); await clear(); await nav('overview');
  const scope = selectScope(dataset, defaultFilters), professionals = selectProfessionalScope(scope);
  const continuity = buildExecutiveCompanyContinuity(scope), engagement = buildExecutiveProfessionalEngagement(scope), receipts = buildExecutiveCorporateReceipts(scope);
  assert.equal(await kpi('activeCompanies').textContent(), num(continuity.total));
  assert.equal(await kpi('activeProfessionals').textContent(), num(summarizeProfessionals(professionals).activeProfessionals));
  assert.equal(await kpi('activeArtAuthorsObserved').textContent(), num(engagement.withArtIds.length));
  assert.equal(await kpi('corporateReceipts').textContent(), money(receipts.receivedAmount));
  assert.equal(await kpi('activeCompaniesWithoutRt').textContent(), num(continuity.withoutRtIds.length));
  checks.push({ name: 'Compiled executive five KPIs reconcile active roots, people, observed ART authors and payment-date receipts' });
  await page.getByLabel('Selecionar Empresas ativas', { exact: true }).click();
  await page.getByLabel('Ver dados que sustentam o recorte', { exact: true }).click();
  await expect(page.locator('#company-list .p-count')).toHaveText(num(continuity.total));
  await page.locator('#company-list .p-company-link').first().click();
  const chooser = page.getByLabel('Detalhes da empresa', { exact: true }); await chooser.waitFor();
  assert.equal(await chooser.locator('option[value="inspection"]').count(), 0);
  await close();
  checks.push({ name: 'Compiled active-company KPI → exact company subset → read-only ficha, without inspection outside Fiscalization' });
  await clear(); await nav('overview');
  assert.equal(await download(() => page.getByLabel('Exportar dados do recorte', { exact: true }).click()), exportCsv(scope, { financial: true, export: true }));
  await page.getByLabel('Selecionar Profissionais ativos', { exact: true }).click();
  await page.getByLabel('Ver dados que sustentam o recorte', { exact: true }).click();
  await expect(page.locator('#professional-list .p-count')).toHaveText(num(summarizeProfessionals(professionals).activeProfessionals));
  await page.locator('#professional-list .p-company-link').first().click(); await page.getByLabel('Fechar ficha do profissional', { exact: true }).waitFor(); await close();
  await clear(); await nav('professionals');
  assert.equal(await download(() => page.getByLabel('Exportar dados do recorte', { exact: true }).click()), exportProfessionalCsv(professionals, true));
  checks.push({ name: 'Compiled company/professional exports match source records and person KPI resolves to an actual individual' });
  await clear(); await nav('inspection');
  assert(!/Casos concluídos|Casos no histórico|SLA|Prioridade elevada|Pontuação/i.test(await page.locator('main').innerText()));
  assert.equal(await page.locator('main input:not([type="checkbox"]), main textarea').count(), 0);
  await page.getByLabel('Abrir evidências da fiscalização digital', { exact: true }).first().click();
  const evidence = page.locator('#digital-evidence-list'); await evidence.waitFor();
  const digital = buildDigitalInspection(scope), evidenceCount = digital.companies.reduce((total, row) => total + Math.max(1, row.signals.length), 0);
  await expect(evidence.locator('.p-count')).toHaveText(num(evidenceCount));
  assert.equal(await download(() => evidence.getByLabel('Exportar evidências digitais CSV', { exact: true }).click()), exportDigitalInspectionCsv(scope, true));
  await evidence.getByLabel('Filtrar regra da fiscalização digital', { exact: true }).selectOption('DIG-04');
  const signals = digital.evidenceRows.filter(row => row.ruleId === 'DIG-04');
  assert.equal(await download(() => evidence.getByLabel('Exportar evidências digitais CSV', { exact: true }).click()), exportDigitalInspectionCsv(scope, true, [...new Set(signals.map(row => row.companyId))], 'DIG-04', signals.map(row => row.id)));
  await evidence.locator('.p-company-link').first().click(); await page.getByLabel('Detalhes da empresa', { exact: true }).selectOption('inspection');
  await expect(page.locator('[data-inspection-evidence="company"]')).toContainText('Correspondência e cobertura das fontes');
  await expect(page.locator('.p-drawer-callout')).toContainText('Evidências para fiscalização digital'); await close();
  checks.push({ name: 'Compiled digital evidence → filtered source-rule CSV → company evidence, with no productivity scoring or inferred contract ART' });
  await clear(); await nav('transparency');
  const catalog = selectTransparencyRows();
  await expect(page.locator('[data-catalog-count]')).toContainText(`${catalog.length} regras`);
  assert.equal(await download(() => page.getByLabel('Exportar catálogo filtrado CSV', { exact: true }).click()), exportTransparencyCsv(catalog, true));
  assert.equal(await page.getByRole('button', { name: /Publicar|Liberar|Compartilhar publicamente/i }).count(), 0);
  await expect(page.locator('[data-panel="transparency-readiness"]')).toContainText('apenas dos conselhos federais');
  await page.getByLabel('Pesquisar catálogo Confea', { exact: true }).fill(catalog.find(row => row.code === '53').title);
  await page.locator('[data-catalog-id="confea-indicator:53"] .r8-row-link').click();
  const detail = page.getByRole('dialog', { name: /^Indicador\/dado 53 —/ }); await detail.waitFor();
  await expect(detail).toContainText('crea:183'); await expect(detail).toContainText('crea:182'); await expect(detail).toContainText('Não mede por si'); await close();
  checks.push({ name: 'Compiled regional catalog keeps current values pending and explains corrected budget-share formula with no public release' });
  await nav('overview'); await page.getByLabel('Fontes e metodologia', { exact: true }).click();
  const sourceDialog = page.getByRole('dialog', { name: 'Transparência da análise', exact: true }); await sourceDialog.waitFor();
  for (const id of ['creasp-sql-server', 'creasp-db2']) {
    await expect(sourceDialog.locator(`[data-source-id="${id}"]`)).toContainText('via gateway');
    await expect(sourceDialog.locator(`[data-source-id="${id}"]`)).toContainText('Não configurada');
    await expect(sourceDialog.locator(`[data-source-id="${id}"]`)).toContainText('Última carga válida: nenhuma');
  }
  await close(); checks.push({ name: 'Compiled SQL Server and Db2 gateway source states remain unconfigured, without a invented refresh timestamp' });
  await page.getByLabel('Perfil demonstrativo', { exact: true }).selectOption('viewer'); await settle();
  await expect(kpi('corporateReceipts')).toHaveText('Restrito'); await expect(page.getByLabel('Exportar dados do recorte', { exact: true })).toBeDisabled();
  await nav('inspection'); await page.getByLabel('Abrir evidências da fiscalização digital', { exact: true }).first().click(); await expect(page.getByLabel('Exportar evidências digitais CSV', { exact: true })).toBeDisabled(); await close();
  await nav('transparency'); await expect(page.getByLabel('Exportar catálogo filtrado CSV', { exact: true })).toBeDisabled();
  checks.push({ name: 'Viewer financial, corporate, evidence and catalog restrictions survive production compilation' });
  const docs = ['ATUALIZACAO_AUTOMATICA_V7', 'SOURCES', 'MODELO_DADOS', 'POWER_BI', 'ANALISE_DOCUMENTOS_V8', 'PLANILHA_CONFEA_V8', 'TRANSPARENCIA_NORMAS_V8'];
  for (const doc of docs) { const response = await context.request.get(new URL(`docs/${doc}.md`, baseURL).href); assert.equal(response.status(), 200); assert((await response.text()).startsWith('# '), `${doc} must serve Markdown, not the SPA fallback`); }
  checks.push({ name: 'V8 analytic, source, catalog, legal and Power BI documents serve actual Markdown', documents: docs });
  assert.equal(errors.length, 0, JSON.stringify(errors)); assert.equal(httpFailures.length, 0, JSON.stringify(httpFailures));
  checks.push({ name: 'No JavaScript, console or HTTP errors' });
  const report = { suite: 'production-v8', at: new Date().toISOString(), passed: checks.length, failed: 0, desktopCanvases: 14, responsiveCanvases: 21, checks, errors, httpFailures };
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify({ passed: report.passed, desktopCanvases: 14, responsiveCanvases: 21, errors, httpFailures }));
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png` }).catch(() => {});
  await writeFile(`${output}/report.json`, JSON.stringify({ suite: 'production-v8', at: new Date().toISOString(), passed: checks.length, failed: 1, failure: error.message, checks, errors, httpFailures }, null, 2));
  throw error;
} finally { await browser.close(); }
