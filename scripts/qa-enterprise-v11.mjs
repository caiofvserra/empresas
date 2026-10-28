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

// Exercise the built report with rendered DOM, keyboard and real pointer input.
// Cohorts and exports are checked against the relational business model; this
// suite never reaches into a private ECharts instance or dispatches chart events.
const output = process.env.QA_OUTPUT || resolve('test-results/enterprise-v11');
const baseURL = process.env.QA_URL || 'http://127.0.0.1:4173/';
const filter = process.env.QA_FILTER ? new RegExp(process.env.QA_FILTER, 'i') : null;
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
const kpi = id => page.locator(`.v11-metric[data-metric="${id}"] .v11-metric-value strong`);
const scopeFor = (filters = {}, ids) => selectEnterpriseScope(dataset, { ...defaultFilters, ...filters }, ids);
const defaultScope = scopeFor(), defaultModel = buildEnterpriseModel(defaultScope);
const expectedCsv = (scope, ids, financial = true) => exportEnterpriseCsv(scope, buildEnterpriseModel(scope), { financial, export: true }, ids);
const ready = async () => {
  await expect(page.locator('.v11-app')).toBeVisible();
  await expect(page.locator('.v11-main')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.v11-panel')).toHaveCount(6);
  await expect.poll(async () => (await page.locator('.v11-chart-state[role="status"]').allTextContents()).filter(text => /Preparando|Carregando/i.test(text)).length).toBe(0);
  for (const host of await page.locator('.v11-charts .p-chart-canvas:visible').all()) {
    await host.locator('svg').waitFor(); await expect(host).toHaveAttribute('aria-busy', 'false');
  }
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
};
const settle = async () => { await ready(); await page.waitForTimeout(250); };
const close = async () => { for (let n = 0; n < 5 && await page.getByRole('dialog').count(); n++) await page.keyboard.press('Escape'); };
const clear = async () => {
  await close(); await page.getByLabel(labels.profile, { exact: true }).selectOption('admin');
  await page.getByLabel(labels.reset, { exact: true }).click(); await settle();
};
const download = async trigger => { const event = page.waitForEvent('download'); await trigger(); const result = await event; return readFile(await result.path(), 'utf8'); };
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
    width: innerWidth, height: innerHeight,
    documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight,
    metrics: [...document.querySelectorAll('.v11-metric')].map(element => ({ id: element.dataset.metric, ...rect(element), number: rect(element.querySelector('.v11-metric-value strong')) })),
    panels: [...document.querySelectorAll('.v11-panel')].map(element => ({ id: element.dataset.chart, ...rect(element), chart: element.querySelector('.p-chart-canvas') ? rect(element.querySelector('.p-chart-canvas')) : null,
      source: element.querySelector('.v11-chart-source') ? rect(element.querySelector('.v11-chart-source')) : null, heading: rect(element.querySelector('h2')) })),
  };
});
const paints = () => page.evaluate(() => ({
  gradients: [...document.querySelectorAll('.v11-charts svg linearGradient')].map(element => ({ id: element.id, stops: [...element.querySelectorAll('stop')].map(stop => ({ offset: stop.getAttribute('offset'), color: stop.getAttribute('stop-color') })) })),
  fills: [...new Set([...document.querySelectorAll('.v11-charts svg [fill]')].map(element => element.getAttribute('fill')).filter(Boolean))],
  headings: [...document.querySelectorAll('.v11-panel h2')].map(element => ({ text: element.textContent, color: getComputedStyle(element).color, fontSize: getComputedStyle(element).fontSize })),
}));

try {
  await page.goto(baseURL, { waitUntil: 'networkidle' }); await ready(); await clear();
  await test('One integrated screen exposes all 17 named indicators and six analytical plots', async () => {
    await clear();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Panorama empresarial');
    assert.equal(await page.locator('.v11-metric').count(), 17);
    assert.equal(await page.locator('.v11-essentials .v11-metric').count(), 8);
    assert.equal(await page.locator('.v11-support .v11-metric').count(), 9);
    assert.equal(await page.locator('.v11-panel').count(), 6);
    assert.equal(await page.locator('.e10-nav').count(), 0);
    assert.equal(await page.getByRole('tab').count(), 0);
    const ids = await page.locator('.v11-metric').evaluateAll(elements => elements.map(element => element.dataset.metric));
    assert.deepEqual([...ids].sort(), enterpriseIndicators.map(row => row.id).sort());
    for (const row of enterpriseIndicators) { assert(!row.name.includes('?'), `${row.id}: title remains a question`); assert(row.name.length < 65, `${row.id}: title is not concise`); }
    assert(/demonstra/i.test(await page.locator('.v11-app').innerText()));
    assert.equal(await page.getByRole('button', { name: /Publicar|Distribuir casos|Encaminhar caso|Concluir análise/i }).count(), 0);
  });
  await test('Both PC canvases show all indicators and plots without scroll, clipping or overlap', async () => {
    await clear();
    for (const [width, height] of [[1920, 1080], [1366, 768]]) {
      await page.setViewportSize({ width, height }); await settle(); const row = await geometry(); layouts.push(row);
      assert(row.documentWidth <= width + 1, `Horizontal overflow at ${width}`);
      assert(row.documentHeight <= height + 1, `Document scrolling at ${width}`);
      assert(row.metrics.every(item => item.x >= 0 && item.right <= width + 1 && item.y >= 0 && item.bottom <= height + 1 && item.number.right <= item.right + 1 && item.number.bottom <= item.bottom + 1), `Clipped indicator at ${width}`);
      for (const panel of row.panels) {
        assert(panel.x >= 0 && panel.right <= width + 1 && panel.y >= 0 && panel.bottom <= height + 1, `${panel.id}: clipped panel at ${width}`);
        assert(panel.heading.bottom <= (panel.chart?.y ?? panel.bottom) + 1, `${panel.id}: title overlaps plot`);
        if (panel.chart) { assert(panel.chart.height >= 100, `${panel.id}: compressed chart`); if (panel.source) assert(panel.chart.bottom <= panel.source.y + 1, `${panel.id}: source overlaps plot`); }
      }
      for (let i = 0; i < row.panels.length; i++) for (let j = i + 1; j < row.panels.length; j++) {
        const a = row.panels[i], b = row.panels[j];
        assert(Math.min(a.right, b.right) - Math.max(a.x, b.x) <= 1 || Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) <= 1, 'Overlapping chart panels');
      }
      chartPaints.push({ width, height, ...await paints() });
      await page.screenshot({ path: `${output}/panorama-${width}.png` });
    }
  });
  await test('Tablet and mobile widths retain all content without horizontal overflow', async () => {
    await clear();
    for (const [width, height] of [[1024, 768], [768, 1024], [390, 844]]) {
      await page.setViewportSize({ width, height }); await settle(); const row = await geometry(); layouts.push(row);
      assert(row.documentWidth <= width + 1, `Horizontal overflow at ${width}`);
      assert.equal(row.metrics.length, 17); assert.equal(row.panels.length, 6);
      assert(row.metrics.every(item => item.x >= 0 && item.right <= width + 1 && item.number.right <= item.right + 1), `Metric horizontally clipped at ${width}`);
      await page.screenshot({ path: `${output}/panorama-${width}.png`, fullPage: true });
    }
  });
  await test('The base headline selects exact company roots and exports the same relational cohort', async () => {
    await clear(); await expect(kpi('base')).toHaveText(num(defaultModel.metrics.base.value));
    await page.locator('[data-metric="base"] .v11-metric-value').click(); await settle();
    const scoped = scopeFor({}, defaultModel.metrics.base.companyIds);
    assert.equal(await download(() => page.getByLabel(labels.export, { exact: true }).click()), expectedCsv(scoped));
    await page.getByLabel(labels.records, { exact: true }).click();
    await expect(page.locator('#enterprise-records .e10-record-count')).toContainText(num(scoped.companies.length));
    await page.locator('#enterprise-records .e10-company-link').first().click();
    const drawer = page.getByRole('dialog', { name: 'Ficha empresarial', exact: true }); await drawer.waitFor();
    assert(/CNPJ/i.test(await drawer.innerText()));
    await page.getByLabel('Fechar ficha empresarial', { exact: true }).click();
  });
  await test('Multiple GRE selections recalculate the integrated screen and persist after reload', async () => {
    await clear(); await page.getByLabel('Filtrar GRE', { exact: true }).click();
    const menu = page.getByLabel('Opções de GRE', { exact: true });
    for (const id of ['GRE2', 'GRE5']) {
      const label = menu.locator('label').filter({ hasText: dataset.gres.find(row => row.id === id).name });
      await label.locator('input[type="checkbox"]').click(); await settle(); await expect(label.locator('input')).toBeChecked();
    }
    await menu.getByRole('button', { name: /Aplicar seleção/ }).click();
    const expected = buildEnterpriseModel(scopeFor({ greIds: ['GRE2', 'GRE5'] }));
    await expect(kpi('base')).toHaveText(num(expected.metrics.base.value));
    await page.reload({ waitUntil: 'networkidle' }); await settle();
    assert.equal(new URL(page.url()).searchParams.get('v'), '11');
    assert.deepEqual(JSON.parse(new URL(page.url()).searchParams.get('f')).greIds, ['GRE2', 'GRE5']);
    await expect(kpi('base')).toHaveText(num(expected.metrics.base.value));
    assert.equal(await download(() => page.getByLabel(labels.export, { exact: true }).click()), expectedCsv(scopeFor({ greIds: ['GRE2', 'GRE5'] })));
  });
  await test('Chart metric switches keep one canvas and repaint all offered analytical views', async () => {
    await clear();
    const panels = page.locator('.v11-panel');
    for (let index = 0; index < await panels.count(); index++) {
      const panel = panels.nth(index), choices = panel.locator('.v11-chart-tools button[aria-pressed]');
      assert(await choices.count() >= 2, 'Each analytical panel needs a real alternative reading');
      for (let choice = 0; choice < await choices.count(); choice++) {
        const button = choices.nth(choice); await button.click(); await settle(); await expect(button).toHaveAttribute('aria-pressed', 'true');
        assert.equal(await page.locator('.v11-panel').count(), 6);
      }
      await choices.first().click(); await settle();
    }
  });
  await test('Chart expansion uses the same BI canvas and Escape restores the six-plot overview', async () => {
    await clear();
    const panel = page.locator('.v11-panel[data-chart="trajectory"]');
    const before = await panel.boundingBox();
    await page.getByLabel('Ampliar gráfico Evolução empresarial', { exact: true }).click(); await settle();
    await expect(page.locator('.v11-charts')).toHaveAttribute('data-focused', 'trajectory');
    const expanded = await panel.boundingBox(); assert(expanded.width > before.width * 1.5 && expanded.height > before.height * 1.5);
    await expect(page.getByLabel('Restaurar gráfico Evolução empresarial', { exact: true })).toBeVisible();
    assert.equal(await page.getByRole('heading', { level: 1 }).textContent(), 'Panorama empresarial');
    await page.keyboard.press('Escape'); await settle();
    await expect(page.locator('.v11-charts')).toHaveAttribute('data-focused', '');
    for (const item of await page.locator('.v11-panel').all()) await expect(item).toBeVisible();
  });
  await test('A real technical-continuity bar selects its exact displayed company cohort', async () => {
    await clear();
    await page.getByLabel('Vínculo técnico: Continuidade', { exact: true }).click(); await settle();
    const row = defaultModel.gapBuckets.find(item => item.count > 0); assert(row);
    const host = page.locator('.v11-panel[data-chart="technical"] .p-chart-canvas');
    const target = await host.locator('svg path').evaluateAll(elements => elements.map(element => {
      const box = element.getBoundingClientRect(), fill = element.getAttribute('fill') || '';
      return { fill, x: box.x, y: box.y, width: box.width, height: box.height };
    }).filter(item => item.fill.startsWith('url(') && item.width >= 15 && item.height >= 7 && item.height <= 35).sort((a, b) => Math.round(a.y * 10) - Math.round(b.y * 10) || a.x - b.x)[0]);
    assert(target, 'A rendered continuity gradient bar must exist');
    await page.mouse.click(target.x + target.width * .25, target.y + target.height * .5); await settle();
    assert.equal(await download(() => page.getByLabel(labels.export, { exact: true }).click()), expectedCsv(scopeFor({}, row.companyIds)));
    await page.getByLabel(labels.records, { exact: true }).click();
    await expect(page.locator('#enterprise-records .e10-record-count')).toContainText(num(row.companyIds.length));
  });
  await test('Company search, numeric sorting, pagination and empty state preserve the exact records', async () => {
    await clear(); await page.getByLabel(labels.records, { exact: true }).click();
    const records = page.locator('#enterprise-records');
    await expect(records.locator('.e10-record-count')).toContainText(num(defaultScope.companies.length));
    await page.getByLabel('Ordenar empresas por ARTs', { exact: true }).click();
    const firstPageIds = await records.locator('tbody tr').evaluateAll(elements => elements.map(element => element.dataset.companyId));
    const artValues = await records.locator('tbody tr td:nth-child(5)').evaluateAll(elements => elements.map(element => Number(element.childNodes[0].textContent.replace(/\./g, ''))));
    assert.deepEqual(artValues, [...artValues].sort((a, b) => a - b));
    await page.getByLabel('Próxima página de empresas', { exact: true }).click();
    const nextIds = await records.locator('tbody tr').evaluateAll(elements => elements.map(element => element.dataset.companyId));
    assert(!nextIds.some(id => firstPageIds.includes(id)));
    const company = defaultScope.companies[0], establishment = defaultScope.establishments.find(row => row.companyId === company.id);
    await page.getByLabel('Pesquisar empresas do recorte', { exact: true }).fill(establishment.cnpj);
    await expect(records.locator('.e10-company-link')).toHaveText(company.name);
    assert.equal(await download(() => page.getByLabel('Exportar empresas da tabela CSV', { exact: true }).click()), expectedCsv(defaultScope, [company.id]));
    await page.getByLabel('Pesquisar empresas do recorte', { exact: true }).fill('00000000000000');
    await expect(records.locator('.e10-company-link')).toHaveCount(0); assert(/Nenhuma empresa/i.test(await records.innerText()));
    await close(); await page.getByLabel('Pesquisar empresa ou CNPJ', { exact: true }).fill('00000000000000'); await settle();
    await expect(kpi('base')).toHaveText('0'); assert(/Nenhuma empresa/i.test(await page.locator('.v11-app').innerText()));
  });
  await test('The catalog gives 17 simple names, supporting questions and complete calculation/source examples', async () => {
    await clear(); await page.getByLabel(labels.catalog, { exact: true }).click();
    const dialog = page.getByRole('dialog', { name: labels.catalog, exact: true });
    await expect(dialog.locator('.e10-definition')).toHaveCount(17);
    for (const definition of enterpriseIndicators) {
      const entry = dialog.locator(`[data-indicator="${definition.id}"]`);
      await expect(entry.getByRole('heading', { name: definition.name, exact: true })).toHaveCount(1);
      const text = await entry.innerText();
      for (const field of ['meaning', 'formula', 'decision', 'example', 'limits', 'unit', 'question', 'periodicity', 'validation']) {
        assert.equal(typeof definition[field], 'string', `${definition.id}: dictionary missing ${field}`);
        assert(text.includes(definition[field]), `${definition.id}: rendered definition missing ${field}`);
      }
      for (const source of definition.sources) assert(text.includes(source), `${definition.id}: source missing`);
    }
    const search = dialog.locator('input').first(); await search.fill(enterpriseIndicators.find(row => row.id === 'contractTrace').name);
    await expect(dialog.locator('.e10-definition')).toHaveCount(1); await expect(dialog.locator('.e10-definition')).toHaveAttribute('data-indicator', 'contractTrace');
  });
  await test('Digital convergence investigates its exact company cohort without a verdict of infraction', async () => {
    await clear(); const metric = defaultModel.metrics.convergentEvidence; assert(metric.companyIds.length > 0);
    await page.locator('[data-metric="convergentEvidence"] .v11-metric-value').click(); await settle();
    assert.equal(await download(() => page.getByLabel(labels.export, { exact: true }).click()), expectedCsv(scopeFor({}, metric.companyIds)));
    await page.getByLabel(labels.records, { exact: true }).click();
    await expect(page.locator('#enterprise-records .e10-record-count')).toContainText(num(metric.companyIds.length));
    await page.locator('#enterprise-records .e10-company-link').first().click();
    const drawer = page.getByRole('dialog', { name: 'Ficha empresarial', exact: true }); await drawer.waitFor();
    assert(!/probabilidade de infração|pontuação de risco/i.test(await drawer.innerText()));
  });
  await test('Period comparison changes events while keeping the cut-date company stock consistent', async () => {
    await clear(); await page.getByLabel(labels.period, { exact: true }).selectOption('3'); await settle();
    const scoped = scopeFor({ period: 3 }), model = buildEnterpriseModel(scoped);
    assert.equal(model.monthly.length, 3); await expect(kpi('base')).toHaveText(num(model.metrics.base.value));
    assert.equal(model.metrics.base.value, defaultModel.metrics.base.value);
    assert.notEqual(model.metrics.receipts.value, defaultModel.metrics.receipts.value);
    assert.equal(await download(() => page.getByLabel(labels.export, { exact: true }).click()), expectedCsv(scoped));
  });
  await test('Source governance distinguishes synthetic data, unconfigured gateways and proposed partnerships', async () => {
    await clear(); await page.getByLabel(labels.sources, { exact: true }).click();
    const dialog = page.getByRole('dialog').filter({ hasText: /SQL Server/ }); await dialog.waitFor(); const text = await dialog.innerText();
    assert(/SQL Server/.test(text) && /Db2|DB2/.test(text) && /gateway/i.test(text));
    assert(/demonstra|fictíci|sintétic/i.test(text));
    assert(/não conectad|não configurad|sem conexão|pendente/i.test(text));
    assert(/parceria|convênio/i.test(text));
    assert.equal(await dialog.getByRole('button', { name: /Publicar|Conectar agora|Executar carga/i }).count(), 0);
  });
  await test('Keyboard help, Escape and viewer restrictions preserve accessible read-only analysis', async () => {
    await clear();
    const name = enterpriseIndicators.find(row => row.id === 'base').name;
    const help = page.getByLabel(`Definição de ${name}`, { exact: true }); await help.focus(); await page.keyboard.press('Enter');
    const definition = page.getByRole('dialog', { name: 'Definição do indicador', exact: true }); await definition.waitFor();
    await expect(definition).toContainText(enterpriseIndicators.find(row => row.id === 'base').formula);
    await page.keyboard.press('Escape'); await expect(definition).toHaveCount(0); await expect(help).toBeFocused();
    await page.getByLabel('Filtrar GRE', { exact: true }).focus(); await page.keyboard.press('Enter'); await page.getByLabel('Opções de GRE', { exact: true }).waitFor();
    await page.keyboard.press('Escape'); await expect(page.getByLabel('Filtrar GRE', { exact: true })).toBeFocused();
    await page.getByLabel(labels.profile, { exact: true }).selectOption('viewer'); await settle();
    for (const id of ['compliance', 'receipts', 'overdue', 'recovery']) await expect(kpi(id)).toHaveText('Restrito');
    await expect(page.getByLabel(labels.export, { exact: true })).toBeDisabled();
    await page.getByLabel(labels.records, { exact: true }).click(); await expect(page.getByLabel('Exportar empresas da tabela CSV', { exact: true })).toBeDisabled();
  });
  await test('No JavaScript, console or HTTP errors occur in the integrated analytical flow', async () => {
    assert.equal(errors.length, 0, JSON.stringify(errors)); assert.equal(httpFailures.length, 0, JSON.stringify(httpFailures));
  });
} finally {
  const report = { suite: 'enterprise-v11', at: new Date().toISOString(), baseURL,
    passed: results.filter(row => row.status === 'passed').length, failed: results.filter(row => row.status === 'failed').length,
    desktopCanvases: layouts.filter(row => row.width >= 1100).length, responsiveCanvases: layouts.filter(row => row.width < 1100).length,
    results, layouts, chartPaints, errors, httpFailures };
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, failed: report.failed, desktopCanvases: report.desktopCanvases, responsiveCanvases: report.responsiveCanvases, errors, httpFailures }));
  await browser.close();
  if (report.failed) process.exitCode = 1;
}
