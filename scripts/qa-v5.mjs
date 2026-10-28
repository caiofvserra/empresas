import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { dataset } from '../src/domain/dataset.ts';
import { defaultFilters } from '../src/domain/types.ts';
import { exportCsv, makeSeries, selectScope, summarize, windowBounds } from '../src/domain/engine.ts';
import { buildProfessionalHistogram, exportProfessionalCsv, groupProfessionals, selectProfessionalScope, summarizeProfessionals } from '../src/domain/professionals.ts';
import { integratedCompanyFlow, joinedCompanyRegions } from '../src/report/OverviewReport.tsx';
import { buildProfessionalProduction, buildPublishedFormationRegistrationComparison } from '../src/report/ProfessionalsReport.tsx';
import education from '../src/domain/external-education.json' with { type: 'json' };
import userData from '../src/domain/user-engineer-statistics.json' with { type: 'json' };
import pncp from '../src/domain/pncp-public-aggregate.json' with { type: 'json' };

const output = process.env.QA_OUTPUT || resolve('test-results/browser-v5');
const baseURL = process.env.QA_URL || 'http://127.0.0.1:5173/';
const testFilter = process.env.QA_FILTER ? new RegExp(process.env.QA_FILTER, 'i') : null;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
await context.addInitScript(() => performance.setResourceTimingBufferSize(5000));
const page = await context.newPage();
page.setDefaultTimeout(12000);
const errors = [], httpFailures = [], results = [], layouts = [], charts = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('response', response => { if (response.status() >= 400) httpFailures.push({ url: response.url(), status: response.status() }); });
const reports = [
  ['overview', 'Visão integrada'], ['companies', 'Empresas'], ['professionals', 'Profissionais e formação'],
  ['market', 'Mercado e emprego'], ['contracts', 'Contratações'], ['inspection', 'Fiscalização'],
];
const baseScope = selectScope(dataset, defaultFilters), baseMetrics = summarize(baseScope);
const basePeople = selectProfessionalScope(baseScope), basePeopleMetrics = summarizeProfessionals(basePeople);
const num = value => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const parseNumber = value => Number(value.replace(/[^\d-]/g, ''));
const currentFilters = () => JSON.parse(new URL(page.url()).searchParams.get('f'));
const kpi = id => page.locator(`[data-metric="${id}"] strong`);
const settle = async () => { await expect(page.locator('.r5-stage')).toHaveAttribute('aria-busy', 'false'); await page.waitForTimeout(250); };
const chartReady = async () => {
  for (const host of await page.locator('main .p-chart-canvas').all()) {
    await host.locator('svg').waitFor(); await expect(host).toHaveAttribute('aria-busy', 'false');
  }
};
const closeDialogs = async () => { for (let i = 0; i < 5 && await page.getByRole('dialog').count(); i++) await page.keyboard.press('Escape'); };
const nav = async id => {
  await page.locator('.r5-pages').getByRole('button', { name: reports.find(row => row[0] === id)[1], exact: true }).click();
  await expect(page.locator('.r5-app')).toHaveAttribute('data-page', id); await settle(); await chartReady();
};
const clear = async () => {
  await closeDialogs(); await page.getByLabel('Perfil demonstrativo', { exact: true }).selectOption('admin');
  await page.getByRole('button', { name: 'Limpar todas as segmentações', exact: true }).click();
  await settle(); await expect.poll(currentFilters).toEqual(defaultFilters);
};
const prepare = async (id = 'overview') => { await clear(); await nav(id); };
const select = async (label, values) => {
  await page.getByRole('button', { name: `Filtrar ${label}`, exact: true }).click();
  const menu = page.locator('.p-multiselect-menu').filter({ has: page.getByLabel(`Pesquisar ${label}`, { exact: true }) });
  for (const value of values) {
    await menu.getByLabel(`Pesquisar ${label}`, { exact: true }).fill(value);
    const box = menu.getByRole('checkbox', { name: value, exact: true });
    if (!await box.isChecked()) await box.click(); await expect(box).toBeChecked(); await settle();
  }
  await menu.getByRole('button', { name: 'Aplicar seleção' }).click(); await settle();
};
const records = async () => { await page.getByRole('button', { name: 'Ver dados que sustentam o recorte', exact: true }).click(); await page.getByRole('dialog', { name: 'Dados que sustentam o recorte', exact: true }).waitFor(); };
const recordCount = async () => parseNumber(await page.locator('#company-list .p-count').textContent());
const assertScopeCount = async expected => {
  const analyticalPage = await page.locator('.r5-app').getAttribute('data-page');
  if (analyticalPage === 'professionals') await nav('companies');
  await records(); await expect.poll(recordCount).toBe(expected); await closeDialogs();
  if (analyticalPage === 'professionals') await nav('professionals');
};
const test = async (name, action) => {
  if (testFilter && !testFilter.test(name)) return;
  const started = Date.now();
  try { await closeDialogs(); await action(); results.push({ name, status: 'passed', milliseconds: Date.now() - started }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, status: 'failed', message: error.message, milliseconds: Date.now() - started }); console.error(`FAIL ${name}: ${error.message}`); await page.screenshot({ path: `${output}/failure-${results.length}.png` }).catch(() => {}); }
  await writeFile(`${output}/progress.json`, JSON.stringify({ at: new Date().toISOString(), results, errors, httpFailures }, null, 2));
};
const chartHost = id => page.locator(`[data-panel="${id}"] .p-chart-canvas`);

/** Read the actual rendered ECharts series and click its geometry, not a fabricated event. */
const chart = async (panelId, mode = 'read', index = 0, seriesIndex = 0) => {
  const host = chartHost(panelId); await host.locator('svg').waitFor(); await page.waitForTimeout(220);
  const info = await host.evaluate(async (el, { mode, index, seriesIndex }) => {
    const urls = performance.getEntriesByType('resource').map(row => row.name);
    const url = urls.find(name => name.includes('/deps/echarts_core.js')) || urls.find(name => name.includes('/deps/echarts.js'));
    if (!url) throw new Error('ECharts module URL not found; this suite targets the development server');
    const echarts = await import(url), instance = echarts.getInstanceByDom(el);
    if (!instance) throw new Error('ECharts instance missing');
    const option = instance.getOption(), series = option.series[seriesIndex];
    let point, dataIndex = index;
    if (mode === 'bar') {
      if (!Number(series.data[dataIndex]?.value ?? series.data[dataIndex])) dataIndex = series.data.findIndex(row => Number(row?.value ?? row) > 0);
      const graphic = instance.getModel().getSeriesByIndex(seriesIndex).getData().getItemGraphicEl(dataIndex);
      if (!graphic) throw new Error('Bar graphic missing');
      const box = graphic.getBoundingRect(); point = graphic.transformCoordToGlobal(box.x + box.width / 2, box.y + box.height / 2);
    }
    if (mode === 'map') {
      const region = instance.getModel().getSeriesByIndex(seriesIndex).coordinateSystem.getRegion(index);
      if (!region) throw new Error(`Municipal region missing: ${index}`);
      point = instance.convertToPixel({ seriesIndex }, region.getCenter());
    }
    if (mode === 'heatmap') {
      if (!series.data[dataIndex]?.[2]) dataIndex = series.data.findIndex(row => row[2] > 0);
      point = instance.convertToPixel({ seriesIndex }, series.data[dataIndex].slice(0, 2));
    }
    if (mode === 'scatter') { const value = series.data[dataIndex]?.value ?? series.data[dataIndex]; point = instance.convertToPixel({ seriesIndex }, value.slice(0, 2)); }
    if (mode === 'item') {
      const graphic = instance.getModel().getSeriesByIndex(seriesIndex).getData().getItemGraphicEl(dataIndex);
      if (!graphic) throw new Error('Chart item graphic missing');
      const box = graphic.getBoundingRect(); point = graphic.transformCoordToGlobal(box.x + box.width / 2, box.y + box.height / 2);
    }
    const rect = el.getBoundingClientRect();
    return { type: series.type, data: series.data, links: series.links,
      series: option.series.map(row => ({ name: row.name, type: row.type, data: row.data, links: row.links })),
      xLabels: option.xAxis?.[0]?.data, yLabels: option.yAxis?.[0]?.data,
      point: point ? { x: rect.x + point[0], y: rect.y + point[1] } : null, dataIndex,
      bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      instance: { width: instance.getWidth(), height: instance.getHeight() },
    };
  }, { mode, index, seriesIndex });
  if (info.point) { assert(info.point.x >= info.bounds.x && info.point.x <= info.bounds.x + info.bounds.width, 'chart coordinate outside host'); await page.mouse.click(info.point.x, info.point.y); await settle(); }
  return info;
};
const parseCSV = text => text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean).map(line => {
  const cells = []; let cell = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { if (quoted && line[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (line[i] === ';' && !quoted) { cells.push(cell); cell = ''; } else cell += line[i];
  }
  cells.push(cell); return cells;
});
const download = async trigger => { const event = page.waitForEvent('download'); await trigger(); const file = await event; return { filename: file.suggestedFilename(), text: await readFile(await file.path(), 'utf8') }; };

await page.goto(baseURL, { waitUntil: 'networkidle' }); await page.locator('.r5-app').waitFor();

await test('Six fixed report pages expose five KPIs and six simultaneous visuals without perspective selectors', async () => {
  await prepare(); assert.deepEqual(await page.locator('.r5-pages button').allTextContents(), reports.map(row => row[1]));
  for (const [id, title] of reports) {
    await nav(id); await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    assert.equal(await page.locator('.r5-kpi').count(), 5); assert.equal(await page.locator('.r5-grid > .r5-panel').count(), 6);
    assert.equal(await page.locator('main .p-chart-canvas svg').count(), 6);
    assert.deepEqual(await page.locator('.r5-app select').evaluateAll(rows => rows.map(row => row.getAttribute('aria-label'))), ['Perfil demonstrativo', 'Período interno']);
    assert.equal(await page.locator('main input:not([type="checkbox"])').count(), 0);
    assert.equal(await page.locator('main').getByRole('button', { name: /Classificar|Encaminhar|Tratar|Concluir caso|Distribuir/ }).count(), 0);
    assert.equal(await page.locator('#company-list,.p-drawer,.p-domain-tabs').count(), 0);
    if (id !== 'inspection') assert.equal(await page.locator('main').getByRole('img', { name: /prioridade|casos de fiscalização/i }).count(), 0);
    for (const panel of await page.locator('.r5-panel').all()) {
      assert((await panel.locator('.r5-panel-source').getAttribute('title')).length > 25, 'every visual requires full provenance');
      const label = await panel.locator('.p-chart-canvas').getAttribute('aria-label'); assert(label.length > 20);
    }
  }
});
await test('All six pages fit PC canvases at 1920×1080 and 1366×768 without scroll, overlap or clipped panels', async () => {
  await clear();
  for (const [width, height] of [[1920, 1080], [1366, 768]]) {
    await page.setViewportSize({ width, height });
    for (const [id] of reports) {
      await nav(id); await page.waitForTimeout(1000);
      const layout = await page.evaluate(() => {
        const rect = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right }; };
        return { page: document.querySelector('.r5-app').dataset.page, viewport: { width: innerWidth, height: innerHeight },
          scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight,
          report: rect(document.querySelector('.r5-report')), nav: rect(document.querySelector('.r5-pages')),
          panels: [...document.querySelectorAll('.r5-panel')].map(e => ({ id: e.dataset.panel, ...rect(e), chart: rect(e.querySelector('.p-chart-canvas')), source: rect(e.querySelector('.r5-panel-source')) })) };
      });
      layouts.push(layout); assert.equal(layout.scrollWidth, width, id); assert.equal(layout.scrollHeight, height, id);
      assert.equal(layout.panels.length, 6);
      for (const panel of layout.panels) {
        assert(panel.x >= 0 && panel.right <= width + 1 && panel.y >= 0 && panel.bottom <= layout.nav.y, panel.id);
        assert(panel.chart.height >= 100 && panel.chart.y + panel.chart.height <= panel.source.y + 1, `${panel.id}: chart/source overlap`);
        const info = await chart(panel.id); charts.push({ page: id, viewport: { width, height }, panel: panel.id, host: info.bounds, instance: info.instance });
        assert(Math.abs(info.instance.width - info.bounds.width) < 2, `${panel.id}: ECharts width must track its host`);
        assert(Math.abs(info.instance.height - info.bounds.height) < 2, `${panel.id}: ECharts height must track its host`);
      }
      for (let a = 0; a < layout.panels.length; a++) for (let b = a + 1; b < layout.panels.length; b++) {
        const first = layout.panels[a], second = layout.panels[b];
        const overlapX = Math.min(first.right, second.right) - Math.max(first.x, second.x), overlapY = Math.min(first.bottom, second.bottom) - Math.max(first.y, second.y);
        assert(overlapX <= 0 || overlapY <= 0, `${id}: overlapping panels`);
      }
      await page.screenshot({ path: `${output}/${id}-${width}.png` });
    }
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
});
await test('Real combined registration series reconciles with movements and its previous window', async () => {
  await prepare(); await expect(kpi('registeredCompanies')).toHaveText(num(baseMetrics.registeredCompanies));
  const info = await chart('overview-evolution'), series = makeSeries(baseScope);
  assert.deepEqual(info.series.map(row => row.type), ['bar', 'bar', 'line']);
  assert.deepEqual(info.series[0].data, series.map(row => row.newRegistrations));
  assert.deepEqual(info.series[1].data, series.map(row => row.closures + row.cancellations));
  assert.deepEqual(info.series[2].data, series.map(row => row.base));
  await page.getByRole('checkbox', { name: 'Comparar', exact: true }).check(); await settle();
  const previous = (await chart('overview-evolution')).series.find(row => row.name === 'Novos · janela anterior');
  const registrationIds = new Set(baseScope.registrations.map(row => row.id));
  const historic = dataset.movements.filter(row => registrationIds.has(row.registrationId));
  assert.deepEqual(previous.data, series.map(row => { const start = new Date(`${row.date}T00:00:00Z`); start.setUTCMonth(start.getUTCMonth() - defaultFilters.period); const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1); return historic.filter(row => row.type === 'Novo registro' && row.date >= start.toISOString().slice(0, 10) && row.date < end.toISOString().slice(0, 10)).length; }));
});
await test('Municipal selections union and intersect size, persisting across all six pages and reload', async () => {
  await prepare('market'); await select('Município', ['Campinas', 'São Paulo']); await select('Porte', ['Grande empresa']);
  const cityIds = dataset.cities.filter(row => ['Campinas', 'São Paulo'].includes(row.name)).map(row => row.id);
  const expected = selectScope(dataset, { ...defaultFilters, cityIds, sizes: ['Grande empresa'] });
  assert(expected.companies.length > 0 && expected.companies.length < baseScope.companies.length);
  for (const [id] of reports) { await nav(id); await assertScopeCount(expected.companies.length); assert.deepEqual([...currentFilters().cityIds].sort(), [...cityIds].sort()); assert.deepEqual(currentFilters().sizes, ['Grande empresa']); }
  await page.reload({ waitUntil: 'networkidle' }); await expect(page.locator('.r5-app')).toHaveAttribute('data-page', 'inspection'); await assertScopeCount(expected.companies.length);
});
await test('Clicking an IBGE municipal polygon filters all compatible sources', async () => {
  await prepare(); await chart('overview-map', 'map', 'Campinas');
  const cityId = dataset.cities.find(row => row.name === 'Campinas').id;
  await expect.poll(() => currentFilters().cityIds).toEqual([cityId]);
  const scope = selectScope(dataset, { ...defaultFilters, cityIds: [cityId] });
  await expect(kpi('registeredCompanies')).toHaveText(num(summarize(scope).registeredCompanies)); await assertScopeCount(scope.companies.length);
});
await test('Clicking an actual timeline column investigates its originating companies', async () => {
  await prepare(); const selected = await chart('overview-evolution', 'bar');
  const series = makeSeries(baseScope), row = series[selected.dataIndex];
  const ids = [...new Set(baseScope.movements.filter(item => item.date.startsWith(row.date.slice(0, 7))).map(item => item.companyId))];
  await expect(page.getByLabel('Limpar seleção de empresas')).toBeVisible();
  await assertScopeCount(ids.length); await nav('companies'); await assertScopeCount(ids.length);
  await page.getByLabel('Limpar seleção de empresas').click(); await settle(); await assertScopeCount(baseScope.companies.length);
});
await test('The integrated Sankey conserves the CREA cohort and selects actual RT companies', async () => {
  await prepare(); const flow = integratedCompanyFlow(baseScope), info = await chart('overview-relations');
  assert.equal(info.type, 'sankey'); assert.deepEqual(info.links.map(row => [row.source, row.target, row.value]), flow.links.map(row => [row.source, row.target, row.value]));
  const index = info.data.findIndex(row => row.name === 'RT vigente'); assert(index >= 0); await chart('overview-relations', 'item', index);
  await assertScopeCount(flow.nodes.find(row => row.name === 'RT vigente').ids.length);
  const selectedScope = selectScope(dataset, defaultFilters, flow.nodes.find(row => row.name === 'RT vigente').ids);
  await expect(kpi('activeLinks')).toHaveText(num(summarize(selectedScope).activeLinks));
});
await test('CNAE treemap selection changes the global shared dimension', async () => {
  await prepare(); const info = await chart('overview-sectors'); const index = info.data.findIndex(row => row.id !== 'others');
  const cnae = info.data[index].id; await chart('overview-sectors', 'item', index);
  await expect.poll(() => currentFilters().cnaeCodes).toEqual([cnae]); await assertScopeCount(selectScope(dataset, { ...defaultFilters, cnaeCodes: [cnae] }).companies.length);
});
await test('The cross-source matrix selects the same companies sharing a regional fact', async () => {
  await prepare(); const rows = joinedCompanyRegions(baseScope).slice(0, 6); const selected = await chart('overview-cross-matrix', 'heatmap');
  const [x, y] = selected.data[selected.dataIndex]; await assertScopeCount(rows[y].dimensions[x].length);
  await nav('contracts'); await assertScopeCount(rows[y].dimensions[x].length);
});
await test('Coverage heatmap synchronizes both municipality and CNAE', async () => {
  await prepare('market'); await chart('market-coverage', 'heatmap'); const filters = currentFilters();
  assert.equal(filters.cityIds.length, 1); assert.equal(filters.cnaeCodes.length, 1); await assertScopeCount(selectScope(dataset, filters).companies.length);
});
await test('Municipal concentration scatter cross-filters an actual municipality while retaining size', async () => {
  await prepare('market'); await select('Porte', ['Grande empresa']);
  const info = await chart('market-concentration'); const seriesIndex = info.series.findIndex(row => row.data.length);
  const selected = await chart('market-concentration', 'scatter', 0, seriesIndex); const cityId = selected.data[selected.dataIndex].cityId;
  await expect.poll(() => currentFilters().cityIds).toEqual([cityId]); assert.deepEqual(currentFilters().sizes, ['Grande empresa']);
  await assertScopeCount(selectScope(dataset, { ...defaultFilters, cityIds: [cityId], sizes: ['Grande empresa'] }).companies.length);
});
await test('Public professional stock, graduates and historical source comparison retain their real populations', async () => {
  await prepare('professionals'); await expect(kpi('publicProfessionalsSp')).toHaveText('346.824'); await expect(kpi('publicGraduates')).toHaveText('19.859');
  await expect(page.locator('[data-metric="publicProfessionalsSp"] .r5-kpi-label')).toContainText('Profissionais ativos · CREA-SP');
  await expect(kpi('professionals')).toHaveText('600'); await expect(kpi('withActiveLinks')).toHaveText('240'); await expect(kpi('linkedArts')).toHaveText('183');
  const formation = await chart('professionals-education');
  assert.deepEqual(formation.xLabels, education.annual.map(row => String(row.year)));
  assert.deepEqual(formation.series[0].data, education.annual.map(row => row.entrants)); assert.deepEqual(formation.series[1].data, education.annual.map(row => row.graduates)); assert.deepEqual(formation.series[2].data, education.annual.map(row => row.enrolled));
  const published = await chart('professionals-public-comparison'), comparison = buildPublishedFormationRegistrationComparison();
  assert.deepEqual(published.series[0].data, comparison.map(row => row.graduates)); assert.deepEqual(published.series[1].data, comparison.map(row => row.registrations));
  assert.deepEqual(published.xLabels, ['2019', '2020', '2021', '2022']);
  assert.deepEqual(published.series[0].data, education.annual.filter(row => [2019, 2020, 2021, 2022].includes(row.year)).map(row => row.graduates));
  assert.deepEqual(published.series[1].data, [18245, 15603, 16966, 14917]);
  const source = await page.locator('[data-panel="professionals-public-comparison"] .r5-panel-source').getAttribute('title');
  assert(source.includes('em SP') && source.includes('CREA-SP')); assert(!source.includes('Brasil'));
  await expect(page.locator('[data-panel="professionals-public-comparison"] .r5-panel-header p')).toContainText('São Paulo · 2019–2022');
  for (const [width, height] of [[1920, 1080], [1366, 768]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(1000); await chartReady();
    const layout = await page.evaluate(() => ({ page: document.querySelector('.r5-app').dataset.page, viewport: { width: innerWidth, height: innerHeight }, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight,
      panels: [...document.querySelectorAll('.r5-panel')].map(element => { const rect = element.getBoundingClientRect(); return { id: element.dataset.panel, x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom }; }) }));
    layouts.push(layout); assert.equal(layout.scrollWidth, width); assert.equal(layout.scrollHeight, height);
    layout.panels.forEach(panel => assert(panel.x >= 0 && panel.right <= width && panel.y >= 0 && panel.bottom < height, panel.id));
    await page.screenshot({ path: `${output}/professionals-${width}.png` });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
});
await test('Synthetic business filters never alter published CREA-SP professional and statewide formation aggregates', async () => {
  await prepare('professionals'); const before = await chart('professionals-education'), published = await chart('professionals-public-comparison');
  await select('Porte', ['Grande empresa']); await expect(kpi('publicProfessionalsSp')).toHaveText('346.824'); await expect(kpi('publicGraduates')).toHaveText('19.859');
  assert.deepEqual((await chart('professionals-education')).series.map(row => row.data), before.series.map(row => row.data));
  assert.deepEqual((await chart('professionals-public-comparison')).series.map(row => row.data), published.series.map(row => row.data));
  assert(summarizeProfessionals(selectProfessionalScope(selectScope(dataset, { ...defaultFilters, sizes: ['Grande empresa'] }))).professionals < 600);
});
await test('Municipality filters real course offering in 2024 and synthetic domicile without nominal joins', async () => {
  await prepare('professionals'); await select('Município', ['Campinas']); const city = dataset.cities.find(row => row.name === 'Campinas');
  const expected = education.cities.filter(row => row.ibgeCode === city.ibgeCode).reduce((total, row) => total + row.graduates, 0);
  await expect(kpi('publicGraduates')).toHaveText(num(expected)); await expect(kpi('publicProfessionalsSp')).toHaveText('346.824');
  const scope = selectScope(dataset, { ...defaultFilters, cityIds: [city.id] }); await expect(kpi('professionals')).toHaveText(num(summarizeProfessionals(selectProfessionalScope(scope)).professionals));
  const info = await chart('professionals-education'); assert.deepEqual(info.xLabels, ['2024']); assert.deepEqual(info.series[1].data, [expected]);
});
await test('Clicking the professional modality chart selects people and leaves public facts unchanged', async () => {
  await prepare('professionals'); const selected = await chart('professionals-profile', 'bar'); const modalities = groupProfessionals(basePeople, 'modality');
  await expect(kpi('professionals')).toHaveText(num(modalities[selected.dataIndex].professionals));
  await expect(page.getByLabel('Limpar seleção de profissionais')).toBeVisible(); await expect(kpi('publicGraduates')).toHaveText('19.859');
  await page.getByLabel('Limpar seleção de profissionais').click(); await settle(); await expect(kpi('professionals')).toHaveText('600');
});
await test('Professional RT and QSA Sankey excludes name suggestions and preserves explicit relation totals', async () => {
  await prepare('professionals'); const info = await chart('professionals-connections');
  assert.equal(info.links.filter(row => row.relation === 'RT vigente').reduce((total, row) => total + row.value, 0), basePeople.activeLinks.length);
  assert.equal(info.links.filter(row => row.relation === 'Sociedade confirmada').reduce((total, row) => total + row.value, 0), basePeople.qsaConfirmed.length);
  const index = info.data.findIndex(row => row.name.startsWith('QSA')); assert(index >= 0);
  const chosen = info.data[index].name, matching = info.links.filter(row => row.target === chosen);
  const companyIds = [...new Set(matching.flatMap(row => row.companyIds))], professionalIds = [...new Set(matching.flatMap(row => row.professionalIds))];
  await chart('professionals-connections', 'item', index); await assertScopeCount(companyIds.length);
  const expected = selectProfessionalScope(selectScope(dataset, defaultFilters, companyIds), { companySubset: companyIds, professionalIds });
  await expect(kpi('professionals')).toHaveText(num(summarizeProfessionals(expected).professionals));
});
await test('Professional monthly production and comparison originate in the declared author bridge', async () => {
  await prepare('professionals'); const expected = buildProfessionalProduction(basePeople), info = await chart('professionals-production');
  assert.deepEqual(info.series[0].data, expected.map(row => row.arts)); assert.deepEqual(info.series[1].data, expected.map(row => row.authors));
  assert.equal(info.series[0].data.reduce((total, value) => total + value, 0), basePeopleMetrics.linkedArts);
  await page.getByRole('checkbox', { name: 'Comparar', exact: true }).check(); await settle(); const previous = (await chart('professionals-production')).series.find(row => row.name === 'ARTs, período anterior');
  const bounds = windowBounds(defaultFilters.period, baseScope.anchor), priorScope = selectProfessionalScope({ ...baseScope, anchor: bounds.previousEnd });
  assert.deepEqual(previous.data, buildProfessionalProduction(priorScope).map(row => row.arts));
});
await test('Zero-link histogram includes the full professional population and filters unlinked people', async () => {
  await prepare('professionals'); const expected = buildProfessionalHistogram(basePeople), info = await chart('professionals-concentration');
  assert.deepEqual(info.data, expected.map(row => row.professionals)); assert.equal(info.data.reduce((total, row) => total + row, 0), 600);
  await chart('professionals-concentration', 'bar', 0); await expect(kpi('professionals')).toHaveText(num(expected[0].professionals)); await expect(kpi('withActiveLinks')).toHaveText('0');
});
await test('Professional drillthrough provides actual population search, filters, pagination and safe CSV exports', async () => {
  await prepare('professionals');
  const headerExport = await download(() => page.getByLabel('Exportar dados do recorte').click());
  assert.equal(headerExport.text, exportProfessionalCsv(basePeople, true)); assert.equal(parseCSV(headerExport.text).length - 1, 600);
  await records(); const count = async () => parseNumber(await page.locator('#professional-list .p-count').textContent());
  await expect.poll(count).toBe(600); assert.equal(await page.locator('#professional-list tbody tr').count(), 20);
  const first = await page.locator('#professional-list .p-company-link').first().textContent();
  await page.getByLabel('Próxima página de profissionais').click(); assert.notEqual(await page.locator('#professional-list .p-company-link').first().textContent(), first);
  await page.getByLabel('Pesquisar profissionais do recorte').fill(basePeople.profiles[0].registration); await expect.poll(count).toBe(1);
  await page.getByLabel('Limpar pesquisa de profissionais').click(); await expect.poll(count).toBe(600);
  await page.getByLabel('Filtrar situação profissional').selectOption('Ativo'); await expect.poll(count).toBe(basePeopleMetrics.activeProfessionals);
  const filteredExport = await download(() => page.getByLabel('Exportar profissionais CSV').click()); assert.equal(parseCSV(filteredExport.text).length - 1, basePeopleMetrics.activeProfessionals);
  await page.getByLabel('Limpar filtros da tabela de profissionais').click(); await expect.poll(count).toBe(600);
  await page.getByLabel('Pesquisar profissionais do recorte').fill('INEXISTENTE-999'); await expect(page.getByRole('heading', { name: 'Nenhum profissional neste recorte' })).toBeVisible();
  await page.getByRole('button', { name: 'Limpar busca e filtros da tabela', exact: true }).click(); await expect.poll(count).toBe(600);
  await closeDialogs(); await page.getByLabel('Perfil demonstrativo').selectOption('viewer'); await settle(); await records(); await expect(page.getByLabel('Exportar profissionais CSV')).toBeDisabled();
});
await test('Professional profile shows separate RT, society and declared authorship, then drills to a linked company', async () => {
  await prepare('professionals'); const authorId = basePeople.artAttributions[0].professionalId, author = basePeople.profiles.find(row => row.id === authorId);
  await records(); await page.getByLabel('Pesquisar profissionais do recorte').fill(author.registration);
  await expect(page.locator('#professional-list .p-company-link')).toHaveCount(1); await page.locator('#professional-list .p-company-link').click();
  await page.getByRole('dialog', { name: author.name, exact: true }).waitFor();
  assert.deepEqual(await page.getByRole('tablist', { name: 'Informações do profissional' }).getByRole('tab').allTextContents(), ['Perfil', 'Relações', 'Produção']);
  await page.getByRole('tab', { name: 'Produção', exact: true }).click(); await expect(page.getByRole('tabpanel')).toContainText('ARTs com autoria declarada');
  await expect(page.getByRole('tabpanel')).toContainText('CAO corresponde ao acervo da pessoa jurídica');
  await page.getByRole('tab', { name: 'Relações', exact: true }).click(); await expect(page.getByRole('tabpanel')).toContainText('Participação societária confirmada');
  await page.getByRole('tabpanel').locator('.p-company-link').first().click(); await page.getByLabel('Detalhes da empresa').waitFor();
  assert.equal(await page.getByLabel('Detalhes da empresa').locator('option[value="inspection"]').count(), 0);
  await closeDialogs(); await expect(page.locator('.r5-app')).toHaveAttribute('data-page', 'professionals');
});
await test('PNCP public contracts remain observed data with a pinned publication window and no fake CNPJ join', async () => {
  await prepare('contracts'); await expect(kpi('pncpPublicCount')).toHaveText('341');
  const actualTotal = pncp.rows.reduce((total, row) => total + row.contractValue, 0); assert.equal(actualTotal, 103211057.28);
  const info = await chart('contracts-public-categories'); assert.equal(info.data.reduce((total, row) => total + row.value, 0), 341);
  assert((await page.locator('[data-panel="contracts-public-categories"] .r5-panel-source').getAttribute('title')).includes('01/09/2025'));
  await select('Porte', ['Grande empresa']); await expect(kpi('pncpPublicCount')).toHaveText('341'); assert.equal((await chart('contracts-public-categories')).data.reduce((total, row) => total + row.value, 0), 341);
  assert((await page.locator('.r5-insight p').getAttribute('title')).includes('sem associar contratos reais a CNPJs fictícios'));
});
await test('Real PNCP category cross-selection updates its municipal matrix and clears independently', async () => {
  await prepare('contracts'); const before = await chart('contracts-public-categories'); await chart('contracts-public-categories', 'item', 0);
  const selected = await chart('contracts-public-categories'); assert.equal(selected.data.length, 1); assert.equal(selected.data[0].id, before.data[0].id);
  await expect(kpi('pncpPublicCount')).toHaveText(num(selected.data[0].value));
  const selectedValue = pncp.rows.filter(row => String(row.categoryId) === String(selected.data[0].id)).reduce((total, row) => total + row.contractValue, 0);
  await expect(kpi('pncpPublicValue')).toHaveText(`R$ ${selectedValue.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })}`);
  await expect(page.locator('.r5-insight p')).toContainText(`${num(selected.data[0].value)} contratos`);
  const matrix = await chart('contracts-public-territory'); assert.equal(matrix.xLabels.length, 1);
  await page.getByRole('button', { name: 'Limpar seleção PNCP' }).click(); await settle(); assert.equal((await chart('contracts-public-categories')).data.length, before.data.length); await expect(kpi('pncpPublicCount')).toHaveText('341');
  assert.deepEqual(currentFilters(), defaultFilters);
});
await test('Company drillthrough opens seven perspectives outside Fiscalização and eight inside it', async () => {
  await prepare('companies'); await records(); await page.locator('#company-list .p-company-link').first().click();
  await page.getByRole('dialog').waitFor(); const selector = page.getByLabel('Detalhes da empresa');
  assert.equal(await selector.locator('option').count(), 7); assert.equal(await selector.locator('option[value="inspection"]').count(), 0);
  await selector.selectOption('financial'); await expect(page.getByRole('region', { name: 'Financeiro', exact: true })).toBeVisible();
  await closeDialogs(); await nav('inspection'); await records(); await page.locator('#company-list .p-company-link').first().click();
  await page.getByLabel('Detalhes da empresa').waitFor(); assert.equal(await page.getByLabel('Detalhes da empresa').locator('option').count(), 8);
  await page.getByLabel('Detalhes da empresa').selectOption('inspection'); await closeDialogs();
  await nav('overview'); await records(); await page.locator('#company-list .p-company-link').first().click(); await page.getByLabel('Detalhes da empresa').waitFor();
  assert.equal(await page.getByLabel('Detalhes da empresa').inputValue(), 'registry'); assert.equal(errors.length, 0, JSON.stringify(errors));
});
await test('Details table provides real search, pagination, sort and selection instead of an operational workflow', async () => {
  await prepare('companies'); await records(); assert.equal(await recordCount(), 3000);
  const first = await page.locator('#company-list .p-company-link').first().textContent(); await page.getByLabel('Próxima página').click();
  assert.notEqual(await page.locator('#company-list .p-company-link').first().textContent(), first);
  await page.getByLabel('Pesquisar empresas').fill(first); await expect.poll(recordCount).toBe(1);
  await page.getByLabel('Limpar pesquisa').click(); await expect.poll(recordCount).toBe(3000);
  await page.getByRole('button', { name: 'Empresa / raiz CNPJ' }).click(); assert.notEqual(await page.locator('#company-list .p-company-link').first().textContent(), first);
});
await test('CSV export matches the filtered source rows and financial permission boundary', async () => {
  await prepare('companies'); await select('Município', ['Campinas']); const expected = selectScope(dataset, currentFilters());
  const admin = await download(() => page.getByLabel('Exportar dados do recorte').click());
  assert.equal(admin.text, exportCsv(expected, { financial: true, export: true })); assert.equal(parseCSV(admin.text).length - 1, expected.establishments.length);
  await page.getByLabel('Perfil demonstrativo').selectOption('regional'); await settle();
  const regionalScope = selectScope(dataset, { ...currentFilters(), greIds: ['GRE2'] });
  const regional = await download(() => page.getByLabel('Exportar dados do recorte').click()); assert.equal(regional.text, exportCsv(regionalScope, { financial: false, export: true }));
  assert(!parseCSV(regional.text)[0].some(header => /saldo|débito|vencido/i.test(header)));
});
await test('Viewer export is blocked and financial values remain restricted in the report and company drillthrough', async () => {
  await prepare('companies'); await page.getByLabel('Perfil demonstrativo').selectOption('viewer'); await settle();
  await expect(page.getByLabel('Exportar dados do recorte')).toBeDisabled(); await expect(kpi('compliance')).toHaveText('Restrito');
  await records(); await expect(page.getByLabel('Exportar tabela CSV')).toBeDisabled(); await page.locator('#company-list .p-company-link').first().click();
  await page.getByLabel('Detalhes da empresa').selectOption('financial'); await expect(page.getByRole('region', { name: 'Financeiro', exact: true })).toContainText('Acesso financeiro restrito');
});
await test('Empty global search remains a meaningful analytical empty state and resets correctly', async () => {
  await prepare('companies'); await page.getByLabel('Mais segmentações').click(); await page.getByLabel('Pesquisar empresa ou CNPJ').fill('SEM-EMPRESA-999999-INEXISTENTE');
  await page.getByRole('button', { name: 'Voltar ao relatório', exact: true }).click(); await settle(); await expect(kpi('registeredCompanies')).toHaveText('0');
  await records(); await expect(page.getByRole('heading', { name: 'Nenhuma empresa neste recorte' })).toBeVisible(); await closeDialogs();
  await page.getByLabel('Limpar todas as segmentações').click(); await settle(); await expect(kpi('registeredCompanies')).toHaveText(num(baseMetrics.registeredCompanies));
});
await test('Historical inspection combines outcome, rate and duration without process actions', async () => {
  await prepare('inspection'); const regional = await chart('inspection-regional-results'), temporal = await chart('inspection-time-comparison');
  assert.deepEqual(regional.series.map(row => row.type), ['bar', 'bar', 'line']);
  assert.deepEqual(temporal.series.map(row => row.type), ['bar', 'bar', 'line']);
  assert.equal(temporal.series[0].data.reduce((total, row) => total + row, 0), baseScope.cases.filter(row => row.createdAt >= windowBounds(12).start).length);
  assert.equal(await page.locator('main').getByRole('button', { name: /Classificar|Encaminhar|Concluir|Tratar/ }).count(), 0);
  await chart('inspection-context-matrix', 'heatmap'); await expect(page.getByLabel('Limpar seleção de empresas')).toBeVisible();
  await records(); assert(await recordCount() > 0);
});
await test('All 29 original published project files remain downloadable and match their provenance hashes', async () => {
  await prepare(); const files = userData.metadata.downloadedFiles ?? userData.metadata.files ?? userData.metadata.rawFiles;
  assert(Array.isArray(files), 'published raw file provenance list is required'); assert.equal(files.length, 29);
  const statuses = await Promise.all(files.map(async file => {
    const response = await context.request.get(new URL(file.localDownloadUrl, baseURL).href); assert.equal(response.status(), 200, file.file);
    const data = await response.body(); assert.equal(data.length, file.bytes, file.file); assert.equal(createHash('sha256').update(data).digest('hex'), file.sha256, file.file); JSON.parse(data.toString('utf8')); return { file: file.file, status: response.status() };
  }));
  assert.equal(statuses.length, 29);
});
await test('Metadata and indicator dictionary remain accessible from the report', async () => {
  await prepare(); await page.getByLabel('Fontes e metodologia').click(); await page.getByRole('dialog', { name: 'Transparência da análise' }).waitFor();
  assert((await page.getByRole('dialog').innerText()).includes('2026-09-30'));
  const docLinks = await page.getByRole('dialog').getByRole('link').evaluateAll(rows => rows.map(row => row.getAttribute('href')));
  assert(docLinks.includes('/docs/POWER_BI.md')); assert(docLinks.includes('/docs/SOURCES.md')); assert(docLinks.includes('/docs/NORMAS.md'));
  await closeDialogs(); await page.getByLabel('Dicionário de indicadores', { exact: true }).click(); await page.getByLabel('Pesquisar dicionário de indicadores').fill('vínculos'); assert(await page.locator('.p-formula').count() > 0);
});
await test('Navigation history restores the exact analytical page', async () => {
  await prepare(); await nav('companies'); await nav('professionals'); await page.goBack(); await expect(page.locator('.r5-app')).toHaveAttribute('data-page', 'companies'); await page.goForward(); await expect(page.locator('.r5-app')).toHaveAttribute('data-page', 'professionals');
});
await test('Unavailable comparison history remains null at 36 months while observed 12-month windows retain their real facts', async () => {
  await prepare('professionals'); await page.getByLabel('Período interno').selectOption('36'); await settle();
  await page.getByRole('checkbox', { name: 'Comparar', exact: true }).check(); await settle();
  const comparisons = [
    ['professionals', 'professionals-production', 'ARTs, período anterior'],
    ['contracts', 'contracts-evolution', 'Valor · janela anterior'],
    ['inspection', 'inspection-time-comparison', 'Conclusões · janela anterior'],
  ];
  for (const [id, panel, name] of comparisons) {
    await nav(id); const series = (await chart(panel)).series.find(row => row.name === name);
    assert(series, `${name}: comparison series is required`); assert.equal(series.data.length, 36);
    assert(series.data.every(value => value === null), `${name}: unobserved history must not become a synthetic zero`);
  }
  await page.getByLabel('Período interno').selectOption('12'); await settle();
  const { start } = windowBounds(12, baseScope.anchor);
  const first = new Date(`${start}T00:00:00Z`);
  const previousMonths = Array.from({ length: 12 }, (_, index) => new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() - 12 + index, 1)).toISOString().slice(0, 7));
  const bounds = windowBounds(12, baseScope.anchor);
  const previousProfessionalScope = selectProfessionalScope({ ...baseScope, anchor: bounds.previousEnd });
  const expected = {
    professionals: buildProfessionalProduction(previousProfessionalScope).map(row => row.arts),
    contracts: previousMonths.map(month => dataset.contracts.filter(row => baseScope.establishmentIds.has(row.establishmentId) && row.date.startsWith(month)).reduce((total, row) => total + row.value, 0)),
    inspection: previousMonths.map(month => dataset.cases.filter(row => baseScope.establishmentIds.has(row.establishmentId) && row.completedAt?.startsWith(month)).length),
  };
  for (const [id, panel, name] of comparisons) {
    await nav(id); const series = (await chart(panel)).series.find(row => row.name === name);
    assert.equal(series.data.length, 12); assert(series.data.every(value => typeof value === 'number'));
    assert.deepEqual(series.data, expected[id]); assert(series.data.some(value => value > 0), `${name}: comparison must contain observed source facts`);
  }
});

const summary = { at: new Date().toISOString(), baseURL, filter: process.env.QA_FILTER || null, passed: results.filter(row => row.status === 'passed').length, failed: results.filter(row => row.status === 'failed').length, results, layouts, charts, errors, httpFailures };
await writeFile(`${output}/report.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ passed: summary.passed, failed: summary.failed, layouts: layouts.length, errors, httpFailures }, null, 2));
await browser.close();
process.exitCode = summary.failed || errors.length || httpFailures.length ? 1 : 0;
