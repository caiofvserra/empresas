import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { dataset } from '../src/domain/dataset.ts';
import { defaultFilters } from '../src/domain/types.ts';
import { selectEnterpriseScope } from '../src/enterprise-v10/filters.ts';
import { buildEnterpriseModel } from '../src/enterprise-v10/model.ts';
import { enterpriseIndicators } from '../src/enterprise-v10/catalog.ts';
import { exportEnterpriseCsv } from '../src/enterprise-v10/export.ts';

// Validate the compiled enterprise report through rendered UI and real pointers.
// No private ECharts instance lookup, synthetic chart dispatch, or website data.
const output = process.env.QA_OUTPUT || resolve('test-results/enterprise-v10');
const baseURL = process.env.QA_URL || 'http://127.0.0.1:4173/';
const filter = process.env.QA_FILTER ? new RegExp(process.env.QA_FILTER, 'i') : null;
const pages = [
  ['strategy', 'Direção estratégica'], ['presence', 'Presença e mercado'],
  ['technical', 'Vínculos e atividade'], ['intelligence', 'Inteligência digital'],
  ['resources', 'Resultados e recursos'],
];
const labels = {
  catalog: 'Catálogo dos 17 indicadores', sources: 'Fontes e limitações',
  export: 'Exportar recorte empresarial CSV', reset: 'Limpar todos os filtros',
  records: 'Ver empresas deste recorte', profile: 'Perfil de acesso demonstrativo',
  period: 'Janela de análise',
};
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
const page = await context.newPage(); page.setDefaultTimeout(14000);
const results = [], layouts = [], chartPaints = [], errors = [], httpFailures = [];
page.on('pageerror', error => errors.push(error.stack ?? error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('response', response => { if (response.status() >= 400) httpFailures.push({ url: response.url(), status: response.status() }); });
const num = value => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const kpi = id => page.locator(`.e10-kpi[data-metric="${id}"] strong`);
const ready = async () => {
  await expect(page.locator('.e10-app')).toBeVisible();
  await expect(page.locator('.e10-stage')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('main .e10-panel')).toHaveCount(4);
  await expect.poll(async () => (await page.locator('.e10-chart-state[role="status"]').allTextContents()).filter(text => /Preparando|Carregando/i.test(text)).length).toBe(0);
  for (const host of await page.locator('main .p-chart-canvas').all()) {
    await host.locator('svg').waitFor(); await expect(host).toHaveAttribute('aria-busy', 'false');
  }
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
};
const settle = async () => { await ready(); await page.waitForTimeout(250); };
const close = async () => { for (let n = 0; n < 5 && await page.getByRole('dialog').count(); n++) await page.keyboard.press('Escape'); };
const nav = async id => {
  await page.locator('.e10-nav').getByRole('button', { name: new RegExp(pages.find(row => row[0] === id)[1] + '$') }).click();
  await expect(page.locator('.e10-app')).toHaveAttribute('data-page', id); await settle();
};
const clear = async () => {
  await close(); await page.getByLabel(labels.profile, { exact: true }).selectOption('admin');
  await page.getByLabel(labels.reset, { exact: true }).click(); await settle();
};
const download = async trigger => { const event = page.waitForEvent('download'); await trigger(); const result = await event; return readFile(await result.path(), 'utf8'); };
const scopeFor = (filters = {}, ids) => selectEnterpriseScope(dataset, { ...defaultFilters, ...filters }, ids);
const defaultScope = scopeFor(), defaultModel = buildEnterpriseModel(defaultScope);
const expectedCsv = (scope, ids, financial = true) => exportEnterpriseCsv(scope, buildEnterpriseModel(scope), { financial, export: true }, ids);
const test = async (name, action) => {
  if (filter && !filter.test(name)) return;
  const started = Date.now();
  try { await page.setViewportSize({ width: 1920, height: 1080 }); await page.evaluate(() => scrollTo(0, 0)); await close(); await action(); results.push({ name, status: 'passed', milliseconds: Date.now() - started }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, status: 'failed', message: error.message, milliseconds: Date.now() - started }); console.error(`FAIL ${name}: ${error.message}`); await page.screenshot({ path: `${output}/failure-${results.length}.png` }).catch(() => {}); }
  await writeFile(`${output}/progress.json`, JSON.stringify({ results, errors, httpFailures }, null, 2));
};
const geometry = () => page.evaluate(() => {
  const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
  return {
    page: document.querySelector('.e10-app').dataset.page, width: innerWidth, height: innerHeight,
    documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight,
    nav: rect(document.querySelector('.e10-nav')),
    kpis: [...document.querySelectorAll('.e10-kpi')].map(element => ({ id: element.dataset.metric, ...rect(element), number: rect(element.querySelector('strong')) })),
    panels: [...document.querySelectorAll('.e10-panel')].map(element => ({ id: element.dataset.panel, ...rect(element), chart: element.querySelector('.p-chart-canvas') ? rect(element.querySelector('.p-chart-canvas')) : null,
      source: element.querySelector('.e10-source') ? rect(element.querySelector('.e10-source')) : null, heading: rect(element.querySelector('h2')) })),
  };
});
const paints = () => page.evaluate(() => ({
  page: document.querySelector('.e10-app').dataset.page,
  gradients: [...document.querySelectorAll('main .p-chart-canvas svg linearGradient')].map(element => ({ id: element.id, stops: [...element.querySelectorAll('stop')].map(stop => ({ offset: stop.getAttribute('offset'), color: stop.getAttribute('stop-color') })) })),
  fills: [...new Set([...document.querySelectorAll('main .p-chart-canvas svg [fill]')].map(element => element.getAttribute('fill')).filter(Boolean))],
  headings: [...document.querySelectorAll('.e10-panel h2')].map(element => ({ text: element.textContent, color: getComputedStyle(element).color, fontSize: getComputedStyle(element).fontSize })),
}));
const visibleTechnicalRows = model => [...model.rtRows].sort((a, b) => (b.withRt + b.withoutRt) - (a.withRt + a.withoutRt) || a.name.localeCompare(b.name)).slice(0, 8);

try {
  await page.goto(baseURL, { waitUntil: 'networkidle' }); await ready(); await clear();
  await test('Five enterprise decision pages replace the previous mixed-domain navigation', async () => {
    const navNames = await page.locator('.e10-nav button').allTextContents();
    assert.equal(navNames.length, 5);
    for (const [, label] of pages) assert(navNames.some(name => name.includes(label)), label);
    for (const [id, title] of pages) {
      await nav(id); await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
      assert.equal(await page.locator('main .e10-kpi').count(), 4);
      assert.equal(await page.locator('main .e10-panel').count(), 4);
      const ids = await page.locator('main .e10-kpi').evaluateAll(elements => elements.map(element => element.dataset.metric));
      assert(ids.every(id => enterpriseIndicators.some(definition => definition.id === id)));
    }
    assert(!navNames.some(name => /formação|profissionais|financeiro isolado|transparência/i.test(name)));
    assert.equal(await page.getByRole('button', { name: /Publicar|Distribuir casos|Encaminhar caso|Concluir análise/i }).count(), 0);
    assert(/demonstra/i.test(await page.locator('.e10-app').innerText()));
  });
  await test('Ten PC canvases fit 1920×1080 and 1366×768 without scrolling, clipped indicators or overlapping plots', async () => {
    await clear();
    for (const [width, height] of [[1920, 1080], [1366, 768]]) {
      await page.setViewportSize({ width, height });
      for (const [id] of pages) {
        await nav(id); const row = await geometry(); layouts.push(row);
        assert(row.documentWidth <= width + 1, `${id}: horizontal overflow at ${width}`);
        assert(row.documentHeight <= height + 1, `${id}: document scrolling at ${width}`);
        assert(row.kpis.every(item => item.x >= 0 && item.right <= width + 1 && item.number.right <= item.right + 1 && item.number.bottom <= item.bottom + 1), `${id}: clipped KPI`);
        for (const panel of row.panels) {
          assert(panel.x >= 0 && panel.right <= width + 1 && panel.y >= 0 && panel.bottom <= row.nav.y + 1, `${panel.id}: panel clipped`);
          assert(panel.heading.bottom <= (panel.chart?.y ?? panel.bottom) + 1, `${panel.id}: title overlaps plot`);
          if (panel.chart) { assert(panel.chart.height >= 100, `${panel.id}: compressed chart`); if (panel.source) assert(panel.chart.bottom <= panel.source.y + 1, `${panel.id}: source overlaps plot`); }
        }
        for (let i = 0; i < row.panels.length; i++) for (let j = i + 1; j < row.panels.length; j++) {
          const a = row.panels[i], b = row.panels[j];
          assert(Math.min(a.right, b.right) - Math.max(a.x, b.x) <= 1 || Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) <= 1, `${id}: overlapping panels`);
        }
        chartPaints.push({ width, height, ...await paints() });
        await page.screenshot({ path: `${output}/${id}-${width}.png` });
      }
    }
  });
  await test('Fifteen narrower canvases preserve the viewport width and the complete thematic navigation', async () => {
    await clear();
    for (const [width, height] of [[1024, 768], [768, 1024], [390, 844]]) {
      await page.setViewportSize({ width, height });
      for (const [id] of pages) {
        await nav(id); const row = await geometry(); layouts.push(row);
        assert(row.documentWidth <= width + 1, `${id}: horizontal overflow at ${width}`);
        assert.equal(await page.locator('.e10-nav button').count(), 5);
        if (width === 390) await page.screenshot({ path: `${output}/${id}-390.png`, fullPage: true });
      }
    }
  });
  await test('The active-company headline reconciles company roots and opens the exact active cohort', async () => {
    await clear(); await nav('strategy'); await expect(kpi('base')).toHaveText(num(defaultModel.metrics.base.value));
    await page.locator('[data-metric="base"] .e10-kpi-value').click(); await settle();
    await page.getByLabel(labels.records, { exact: true }).click();
    await expect(page.locator('#enterprise-records .e10-record-count')).toContainText(num(defaultModel.metrics.base.companyIds.length));
    const ids = defaultModel.metrics.base.companyIds, scoped = scopeFor({}, ids);
    await close(); assert.equal(await download(() => page.getByLabel(labels.export, { exact: true }).click()), expectedCsv(scoped));
  });
  await test('Multiple GRE filters alter the company model and persist across navigation and reload', async () => {
    await clear(); await nav('strategy'); await page.getByLabel('Filtrar GRE', { exact: true }).click();
    const menu = page.getByLabel('Opções de GRE', { exact: true });
    for (const id of ['GRE2', 'GRE5']) {
      const label = menu.locator('label').filter({ hasText: dataset.gres.find(row => row.id === id).name });
      await label.locator('input[type="checkbox"]').click(); await settle(); await expect(label.locator('input')).toBeChecked();
    }
    await menu.getByRole('button', { name: /Aplicar seleção/ }).click();
    const expected = buildEnterpriseModel(scopeFor({ greIds: ['GRE2', 'GRE5'] }));
    await expect(kpi('base')).toHaveText(num(expected.metrics.base.value));
    await nav('presence'); await page.reload({ waitUntil: 'networkidle' }); await settle();
    assert.deepEqual(JSON.parse(new URL(page.url()).searchParams.get('f')).greIds, ['GRE2', 'GRE5']);
    await nav('strategy'); await expect(kpi('base')).toHaveText(num(expected.metrics.base.value));
  });
  await test('An actual RT bar selects its displayed company cohort, exports exact records and opens the company ficha', async () => {
    await clear(); await nav('technical');
    const row = visibleTechnicalRows(defaultModel)[0], ids = row.withRtIds;
    assert(ids.length > 0);
    const host = page.locator('[data-panel="e10-technical-rt"] .p-chart-canvas');
    const target = await host.locator('svg path').evaluateAll(elements => elements.map(element => {
      const box = element.getBoundingClientRect(), fill = element.getAttribute('fill') || '';
      return { fill, x: box.x, y: box.y, width: box.width, height: box.height };
    }).filter(row => row.fill.startsWith('url(') && row.width >= 15 && row.height >= 7 && row.height <= 35).sort((a, b) => Math.round(a.y * 10) - Math.round(b.y * 10) || a.x - b.x)[0]);
    assert(target, 'A rendered horizontal gradient bar must be available');
    await page.mouse.click(target.x + target.width * .25, target.y + target.height * .5); await settle();
    const scoped = scopeFor({}, ids);
    assert.equal(await download(() => page.getByLabel(labels.export, { exact: true }).click()), expectedCsv(scoped));
    await page.getByLabel(labels.records, { exact: true }).click();
    await expect(page.locator('#enterprise-records .e10-record-count')).toContainText(num(ids.length));
    await page.locator('#enterprise-records .e10-company-link').first().click();
    const drawer = page.getByRole('dialog', { name: 'Ficha empresarial', exact: true }); await drawer.waitFor();
    const text = await drawer.innerText(); assert(/CNPJ/i.test(text) && /ART|RT|técnic/i.test(text));
    await page.getByLabel('Fechar ficha empresarial', { exact: true }).click();
  });
  await test('Company CNPJ search, numeric sorting, pagination and an empty table use the same records', async () => {
    await clear(); await nav('strategy'); await page.getByLabel(labels.records, { exact: true }).click();
    const records = page.locator('#enterprise-records');
    await expect(records.locator('.e10-record-count')).toContainText(num(defaultScope.companies.length));
    await page.getByLabel('Ordenar empresas por ARTs', { exact: true }).click();
    const firstPageIds = await records.locator('tbody tr').evaluateAll(elements => elements.map(element => element.dataset.companyId));
    const artValues = await records.locator('tbody tr td:nth-child(5)').evaluateAll(elements => elements.map(element => Number(element.childNodes[0].textContent.replace(/\./g, ''))));
    assert.deepEqual(artValues, [...artValues].sort((a, b) => a - b));
    await page.getByLabel('Próxima página de empresas', { exact: true }).click();
    const nextPageIds = await records.locator('tbody tr').evaluateAll(elements => elements.map(element => element.dataset.companyId));
    assert(!nextPageIds.some(id => firstPageIds.includes(id)));
    await page.getByLabel('Página anterior de empresas', { exact: true }).click();
    assert.deepEqual(await records.locator('tbody tr').evaluateAll(elements => elements.map(element => element.dataset.companyId)), firstPageIds);
    const company = defaultScope.companies[0], establishment = defaultScope.establishments.find(row => row.companyId === company.id);
    await page.getByLabel('Pesquisar empresas do recorte', { exact: true }).fill(establishment.cnpj);
    await expect(records.locator('.e10-record-count')).toContainText('1');
    await expect(records.locator('.e10-company-link')).toHaveText(company.name);
    assert.equal(await download(() => page.getByLabel('Exportar empresas da tabela CSV', { exact: true }).click()), expectedCsv(defaultScope, [company.id]));
    await page.getByLabel('Pesquisar empresas do recorte', { exact: true }).fill('00000000000000');
    await expect(records.locator('.e10-company-link')).toHaveCount(0);
    assert(/Nenhuma empresa/i.test(await records.innerText()));
  });
  await test('The catalog explains all 17 indicators with decisions, formulae, examples, sources and limitations', async () => {
    await clear(); await page.getByLabel(labels.catalog, { exact: true }).click();
    const dialog = page.getByRole('dialog', { name: labels.catalog, exact: true });
    await expect(dialog.locator('.e10-definition')).toHaveCount(17);
    for (const definition of enterpriseIndicators) {
      const entry = dialog.locator(`[data-indicator="${definition.id}"]`);
      await expect(entry.getByRole('heading', { name: definition.name, exact: true })).toHaveCount(1);
      const text = await entry.innerText();
      for (const field of ['meaning', 'formula', 'decision', 'example', 'limits']) assert(text.includes(definition[field]), `${definition.id}: missing ${field}`);
      for (const source of definition.sources) assert(text.includes(source), `${definition.id}: missing source`);
    }
    const search = dialog.locator('input[type="search"],input').first(); await search.fill(enterpriseIndicators.find(row => row.id === 'contractTrace').name);
    await expect(dialog.locator('.e10-definition')).toHaveCount(1); await expect(dialog.locator('.e10-definition')).toHaveAttribute('data-indicator', 'contractTrace');
  });
  await test('Digital convergence resolves the exact company subset without classifying it as an infraction', async () => {
    await clear(); await nav('intelligence');
    const metric = defaultModel.metrics.convergentEvidence;
    assert(metric.companyIds.length > 0);
    await page.locator('[data-metric="convergentEvidence"] .e10-kpi-value').click(); await settle();
    assert.equal(await download(() => page.getByLabel(labels.export, { exact: true }).click()), expectedCsv(scopeFor({}, metric.companyIds)));
    await page.getByLabel(labels.records, { exact: true }).click();
    await expect(page.locator('#enterprise-records .e10-record-count')).toContainText(num(metric.companyIds.length));
    await page.locator('#enterprise-records .e10-company-link').first().click();
    const drawer = page.getByRole('dialog', { name: 'Ficha empresarial', exact: true }); await drawer.waitFor();
    assert(!/probabilidade de infração|pontuação de risco/i.test(await drawer.innerText()));
  });
  await test('A three-month analysis uses its own event window while the active stock remains a snapshot', async () => {
    await clear(); await nav('resources'); await page.getByLabel(labels.period, { exact: true }).selectOption('3'); await settle();
    const scoped = scopeFor({ period: 3 }), model = buildEnterpriseModel(scoped);
    assert.equal(model.monthly.length, 3);
    assert.equal(await download(() => page.getByLabel(labels.export, { exact: true }).click()), expectedCsv(scoped));
    await nav('strategy'); await expect(kpi('base')).toHaveText(num(model.metrics.base.value));
    assert.equal(model.metrics.base.value, defaultModel.metrics.base.value);
    assert.notEqual(model.metrics.receipts.value, defaultModel.metrics.receipts.value);
  });
  await test('Source governance is explicit about synthetic facts, unconfigured SQL Server and Db2, and conditional partnerships', async () => {
    await clear(); await page.getByLabel(labels.sources, { exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Fontes, dados e limitações', exact: true });
    const text = await dialog.innerText();
    assert(/SQL Server/.test(text) && /Db2|DB2/.test(text) && /gateway/i.test(text));
    assert(/demonstra|fictíci|sintétic/i.test(text));
    assert(/não conectad|não configurad|sem conexão|pendente/i.test(text));
    assert(/parceria|convênio/i.test(text));
    assert.equal(await dialog.getByRole('button', { name: /Publicar|Conectar agora|Executar carga/i }).count(), 0);
  });
  await test('Keyboard help, Escape and viewer restrictions preserve usable and truthful read-only access', async () => {
    await clear(); await nav('strategy');
    const help = page.locator('[data-metric="base"] .e10-kpi-label button'); await help.focus(); await page.keyboard.press('Enter');
    const definition = page.getByRole('dialog', { name: 'Definição do indicador', exact: true }); await definition.waitFor();
    await expect(definition).toContainText(enterpriseIndicators.find(row => row.id === 'base').formula);
    await page.keyboard.press('Escape'); await expect(definition).toHaveCount(0);
    await page.getByLabel('Filtrar GRE', { exact: true }).focus(); await page.keyboard.press('Enter'); await page.getByLabel('Opções de GRE', { exact: true }).waitFor();
    await page.keyboard.press('Escape'); await expect(page.getByLabel('Filtrar GRE', { exact: true })).toBeFocused();
    await page.getByLabel(labels.profile, { exact: true }).selectOption('viewer'); await settle(); await nav('resources');
    for (const id of ['compliance', 'receipts', 'overdue', 'recovery']) await expect(kpi(id)).toHaveText('Restrito');
    await expect(page.getByLabel(labels.export, { exact: true })).toBeDisabled();
    await page.getByLabel(labels.records, { exact: true }).click(); await expect(page.getByLabel('Exportar empresas da tabela CSV', { exact: true })).toBeDisabled();
  });
  await test('No JavaScript, console or HTTP errors occur across the new enterprise analytical flow', async () => {
    assert.equal(errors.length, 0, JSON.stringify(errors)); assert.equal(httpFailures.length, 0, JSON.stringify(httpFailures));
  });
} finally {
  const report = { suite: 'enterprise-v10', at: new Date().toISOString(), baseURL,
    passed: results.filter(row => row.status === 'passed').length, failed: results.filter(row => row.status === 'failed').length,
    desktopCanvases: layouts.filter(row => row.width >= 1100).length, responsiveCanvases: layouts.filter(row => row.width < 1100).length,
    results, layouts, chartPaints, errors, httpFailures };
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, failed: report.failed, desktopCanvases: report.desktopCanvases, responsiveCanvases: report.responsiveCanvases, errors, httpFailures }));
  await browser.close();
  if (report.failed) process.exitCode = 1;
}
