import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { dataset } from '../src/domain/dataset.ts';
import { defaultFilters } from '../src/domain/types.ts';
import { exportCsv, selectScope, summarize } from '../src/domain/engine.ts';
import { exportProfessionalCsv, selectProfessionalScope, summarizeProfessionals } from '../src/domain/professionals.ts';
import { buildExecutiveEvolution } from '../src/report/executive-analysis-v7.ts';
import { buildExecutiveCompanyContinuity, buildExecutiveProfessionalEngagement, buildExecutiveArtProduction, buildExecutiveCorporateReceipts, buildExecutiveRegionalEconomy } from '../src/report/executive-decisions-v8.ts';
import { buildDigitalInspection, exportDigitalInspectionCsv, isValidDigitalCnpj } from '../src/domain/digital-inspection.ts';
import { buildDigitalMatchingFlow } from '../src/report/InspectionReport.tsx';
import { reportIndicators } from '../src/domain/report-indicators.ts';
import { selectTransparencyRows, exportTransparencyCsv } from '../src/domain/transparency.ts';
import { buildRegisteredFormation } from '../src/report/ProfessionalsReport.tsx';
const output = process.env.QA_OUTPUT || resolve('test-results/browser-v8');
const baseURL = process.env.QA_URL || 'http://127.0.0.1:5174/';
const testFilter = process.env.QA_FILTER ? new RegExp(process.env.QA_FILTER, 'i') : null;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
await context.addInitScript(() => performance.setResourceTimingBufferSize(5000));
const page = await context.newPage();
page.setDefaultTimeout(12000);
const errors = [], httpFailures = [], results = [], layouts = [], charts = [];
page.on('pageerror', error => errors.push(error.stack ?? error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('response', response => { if (response.status() >= 400) httpFailures.push({ url: response.url(), status: response.status() }); });
const reports = [
  ['overview', 'Presidência e resultados'], ['companies', 'Empresas'], ['professionals', 'Profissionais e formação'],
  ['market', 'Mercado e emprego'], ['contracts', 'Contratações'], ['inspection', 'Fiscalização digital'], ['transparency', 'Transparência'],
];
const baseScope = selectScope(dataset, defaultFilters), baseMetrics = summarize(baseScope);
const base = baseScope;
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
  if (id === 'transparency') await page.locator('[data-report="transparency"]').waitFor();
};
const clear = async () => {
  await closeDialogs(); await page.getByLabel('Perfil demonstrativo', { exact: true }).selectOption('admin');
  if (await page.locator('.r5-app').getAttribute('data-page') === 'transparency') await nav('overview');
  await page.getByRole('button', { name: 'Limpar todas as segmentações', exact: true }).click();
  await settle(); await expect.poll(currentFilters).toEqual(defaultFilters);
};
const prepare = async (id = 'overview') => { await clear(); await nav(id); };
const select = async (label, values) => {
  await page.getByRole('button', { name: `Filtrar ${label}`, exact: true }).click();
  const menu = page.locator('.p-multiselect-menu').filter({ has: page.getByLabel(`Pesquisar ${label}`, { exact: true }) });
  for (const value of values) {
    await menu.getByLabel(`Pesquisar ${label}`, { exact: true }).fill(value);
    const box = menu.locator('.p-select-options > label').filter({ has: page.getByText(value, { exact: true }) }).getByRole('checkbox');
    if (!await box.isChecked()) await box.click(); await expect(box).toBeChecked(); await settle();
  }
  await menu.getByRole('button', { name: 'Aplicar seleção' }).click(); await settle();
};
const records = async () => { const inspection = await page.locator('.r5-app').getAttribute('data-page') === 'inspection'; await page.getByRole('button', { name: 'Ver dados que sustentam o recorte', exact: true }).click(); await page.getByRole('dialog', { name: inspection ? 'Evidências da fiscalização digital' : 'Dados que sustentam o recorte', exact: true }).waitFor(); };
const recordCount = async () => { if (await page.locator('#digital-evidence-list').count()) return parseNumber((await page.locator('#digital-evidence-list .p-table-tools p').first().textContent()).match(/^([\d.]+) empresas distintas/)[1]); return parseNumber(await page.locator('#company-list .p-count').textContent()); };
const assertScopeCount = async expected => {
  const analyticalPage = await page.locator('.r5-app').getAttribute('data-page');
  if (analyticalPage === 'professionals') await nav('companies');
  await records(); await expect.poll(recordCount).toBe(expected); await closeDialogs();
  if (analyticalPage === 'professionals') await nav('professionals');
};
const test = async (name, action) => {
  if (testFilter && !testFilter.test(name)) return;
  const started = Date.now();
  try { await page.setViewportSize({ width: 1920, height: 1080 }); await page.evaluate(() => scrollTo(0, 0)); await closeDialogs(); await action(); results.push({ name, status: 'passed', milliseconds: Date.now() - started }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, status: 'failed', message: error.message, milliseconds: Date.now() - started }); console.error(`FAIL ${name}: ${error.message}`); await page.screenshot({ path: `${output}/failure-${results.length}.png` }).catch(() => {}); }
  await writeFile(`${output}/progress.json`, JSON.stringify({ at: new Date().toISOString(), results, errors, httpFailures }, null, 2));
};
const chartHost = id => page.locator(`[data-panel="${id}"] .p-chart-canvas`);

/** Read the actual rendered ECharts series and click its geometry, not a fabricated event. */
const chart = async (panelId, mode = 'read', index = 0, seriesIndex = 0) => {
  const host = chartHost(panelId); await host.locator('svg').waitFor(); await host.scrollIntoViewIfNeeded(); await page.waitForTimeout(220);
  const info = await host.evaluate(async (el, { mode, index, seriesIndex }) => {
    const urls = performance.getEntriesByType('resource').map(row => row.name);
    const url = urls.find(name => name.includes('/deps/echarts_core.js')) || urls.find(name => name.includes('/deps/echarts.js'));
    if (!url) throw new Error('ECharts module URL not found; this suite targets the development server');
    const echarts = await import(url), instance = echarts.getInstanceByDom(el);
    if (!instance) throw new Error('ECharts instance missing');
    const option = instance.getOption(), series = option.series[seriesIndex];
    if (mode !== 'read') {
      window.__creaQaObservedClick = null;
      const observe = params => { window.__creaQaObservedClick = { dataIndex: params.dataIndex, seriesIndex: params.seriesIndex, seriesName: params.seriesName, seriesType: params.seriesType, dataType: params.dataType, name: params.name }; instance.off('click', observe); };
      instance.on('click', observe);
    }
    const datum = series.data[0];
    let tooltipExample = null;
    if (typeof option.tooltip?.[0]?.formatter === 'function') {
      try { tooltipExample = option.tooltip[0].formatter(option.tooltip[0].trigger === 'axis' ? [{ dataIndex: 0, seriesIndex, data: datum, value: datum?.value ?? datum }] : { dataIndex: 0, seriesIndex, data: datum, value: datum?.value ?? datum, seriesType: series.type }); } catch {}
    }
    let point, dataIndex = index;
    if (mode === 'bar') {
      if (!Number(series.data[dataIndex]?.value ?? series.data[dataIndex])) dataIndex = series.data.findIndex(row => Number(row?.value ?? row) > 0);
      const graphic = instance.getModel().getSeriesByIndex(seriesIndex).getData().getItemGraphicEl(dataIndex);
      if (!graphic) throw new Error('Bar graphic missing');
      const box = graphic.getBoundingRect(); point = graphic.transformCoordToGlobal(box.x + box.width * .2, box.y + box.height * .8);
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
    if (mode === 'scatter') {
      if (index === 'isolated') {
        const points = series.data.map(row => instance.convertToPixel({ seriesIndex }, (row?.value ?? row).slice(0, 2)));
        dataIndex = points.map((candidate, candidateIndex) => ({ index: candidateIndex,
          distance: Math.min(...points.filter((_, otherIndex) => otherIndex !== candidateIndex).map(other => Math.hypot(candidate[0] - other[0], candidate[1] - other[1]))) }))
          .sort((left, right) => right.distance - left.distance)[0].index;
      }
      const value = series.data[dataIndex]?.value ?? series.data[dataIndex]; point = instance.convertToPixel({ seriesIndex }, value.slice(0, 2));
    }
    if (mode === 'item') {
      const graphic = instance.getModel().getSeriesByIndex(seriesIndex).getData().getItemGraphicEl(dataIndex);
      if (!graphic) throw new Error('Chart item graphic missing');
      const box = graphic.getBoundingRect(); point = graphic.transformCoordToGlobal(box.x + box.width / 2, box.y + box.height / 2);
    }
    const rect = el.getBoundingClientRect();
    return { type: series.type, data: series.data, links: series.links, tooltipExample,
      mapRegionCount: series.type === 'map' ? instance.getModel().getSeriesByIndex(seriesIndex).coordinateSystem.regions.length : null,
      series: option.series.map(row => ({ name: row.name, type: row.type, data: row.data, links: row.links })),
      xLabels: option.xAxis?.[0]?.data, yLabels: option.yAxis?.[0]?.data,
      point: point ? { x: rect.x + point[0], y: rect.y + point[1] } : null, dataIndex,
      yAxes: option.yAxis?.map(row => ({ type: row.type, name: row.name })),
      bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      instance: { width: instance.getWidth(), height: instance.getHeight() },
    };
  }, { mode, index, seriesIndex });
  if (info.point) { assert(info.point.x >= info.bounds.x && info.point.x <= info.bounds.x + info.bounds.width, 'chart coordinate outside host'); await page.mouse.click(info.point.x, info.point.y);
    await expect.poll(() => page.evaluate(() => window.__creaQaObservedClick)).not.toBeNull();
    info.clicked = await page.evaluate(() => window.__creaQaObservedClick);
    if (mode === 'bar') { assert.equal(info.clicked.seriesType, 'bar', 'The real pointer must hit the intended bar, not an overlapping line'); assert.equal(info.clicked.seriesIndex, seriesIndex); assert.equal(info.clicked.dataIndex, info.dataIndex); }
    await settle(); }
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
const readKpis = () => page.locator('.r5-kpi').evaluateAll(rows => Object.fromEntries(rows.map(row => [row.dataset.metric, row.querySelector('strong')?.textContent])));
await test('Seven fixed BI pages use data-grain decisions and read-only analytical interactions', async () => {
  await prepare(); assert.deepEqual(await page.locator('.r5-pages button').allTextContents(), reports.map(row => row[1]));
  for (const [id, title] of reports) {
    await nav(id); await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    if (id !== 'transparency') {
      assert.equal(await page.locator('.r5-kpi').count(), 5);
      assert.equal(await page.locator('.r5-grid > .r5-panel').count(), 6);
      assert.equal(await page.locator('main .p-chart-canvas svg').count(), 6);
      for (const panel of await page.locator('.r5-panel').all()) {
        assert((await panel.locator('.r5-panel-source').getAttribute('title')).length > 25);
        assert((await panel.locator('.p-chart-canvas').getAttribute('aria-label')).length > 20);
      }
    }
    assert.equal(await page.locator('main').getByRole('button', { name: /Classificar|Encaminhar|Tratar|Concluir caso|Distribuir|Publicar/ }).count(), 0);
    assert.equal(await page.locator('main .r6-published,.r5-public-kpi').count(), 0);
  }
});

await test('Fourteen PC report canvases fit 1920×1080 and 1366×768 without document scrolling', async () => {
  await clear();
  for (const [width, height] of [[1920, 1080], [1366, 768]]) {
    await page.setViewportSize({ width, height });
    for (const [id] of reports) {
      await nav(id); await page.waitForTimeout(450);
      const geometry = await page.evaluate(() => {
        const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right }; };
        return { page: document.querySelector('.r5-app').dataset.page, width: innerWidth, height: innerHeight,
          documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight,
          nav: rect(document.querySelector('.r5-pages')),
          catalogRows: [...document.querySelectorAll('[data-catalog-id]')].map(element => rect(element)),
          catalogContent: [...document.querySelectorAll('[data-catalog-id] button,[data-catalog-id] small,[data-catalog-id] span')].map(element => rect(element)),
          catalogFooter: document.querySelector('.r8-catalog > footer') ? rect(document.querySelector('.r8-catalog > footer')) : null,
          panels: [...document.querySelectorAll('.r5-panel')].map(element => ({ id: element.dataset.panel, ...rect(element),
            chart: rect(element.querySelector('.p-chart-canvas')), source: rect(element.querySelector('.r5-panel-source')) })) };
      });
      layouts.push(geometry);
      if (id === 'transparency') assert(geometry.catalogContent.every(row => row.bottom <= geometry.catalogFooter.y + 1), 'Catalog pagination must not hide any informative content in its last row');
      assert(geometry.documentWidth <= width + 1, `${id}: horizontal`); assert(geometry.documentHeight <= height + 1, `${id}: vertical`);
      for (const panel of geometry.panels) {
        assert(panel.x >= 0 && panel.right <= width + 1 && panel.y >= 0 && panel.bottom <= geometry.nav.y + 1, panel.id);
        assert(panel.chart.height >= 100 && panel.chart.bottom <= panel.source.y + 1, `${panel.id}: chart/provenance`);
        const info = await chart(panel.id); charts.push({ page: id, width, height, panel: panel.id, type: info.type, instance: info.instance });
        assert(Math.abs(info.instance.width - info.bounds.width) < 2); assert(Math.abs(info.instance.height - info.bounds.height) < 2);
      }
      for (let a = 0; a < geometry.panels.length; a++) for (let b = a + 1; b < geometry.panels.length; b++) {
        const first = geometry.panels[a], second = geometry.panels[b];
        assert(Math.min(first.right, second.right) - Math.max(first.x, second.x) <= 0 || Math.min(first.bottom, second.bottom) - Math.max(first.y, second.y) <= 0, `${id}: panels overlap`);
      }
      await page.screenshot({ path: `${output}/${id}-${width}.png` });
    }
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
});

await test('Twenty-one narrower report canvases have no horizontal overflow', async () => {
  await clear();
  for (const [width, height] of [[1024, 768], [768, 1024], [390, 844]]) {
    await page.setViewportSize({ width, height });
    for (const [id] of reports) {
      await nav(id); await page.waitForTimeout(180);
      const geometry = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth, height: innerHeight, documentHeight: document.documentElement.scrollHeight }));
      assert(geometry.documentWidth <= width + 1, `${id}: ${width}`); layouts.push({ page: id, ...geometry });
      if (width === 390) await page.screenshot({ path: `${output}/${id}-390.png` });
    }
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
});

await test('Attached dashboard totals and historical website claims never become live API indicators', async () => {
  await prepare();
  const forbidden = /30\s*(?:mil|\.000)\s*espectadores|37\s*cowork|5\s*(?:mil|\.000)\s*certificados|32\s*cursos|19\.859\s*concluintes|201\s*mil\s*autos|46\.389|411\.298|343\.967|2\.620\.844/i;
  for (const [id] of reports) { await nav(id); assert(!forbidden.test(await page.locator('main').innerText()), id); }
  assert((await page.locator('.r5-data-badge').innerText()).includes('FONTES NÃO CONECTADAS'));
  await expect(page.locator('.r5-footer')).toContainText('SQL Server e DB2 via gateway');
});

await test('SQL Server and Db2 gateway connections remain honestly unconfigured with no valid load', async () => {
  await prepare(); await page.getByLabel('Fontes e metodologia', { exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Transparência da análise', exact: true }); await dialog.waitFor();
  await expect(dialog).toContainText('Não conectado'); await expect(dialog).toContainText('Nenhum banco interno do CREA-SP foi conectado');
  for (const id of ['creasp-sql-server', 'creasp-db2']) {
    const source = dialog.locator(`[data-source-id="${id}"]`); await expect(source).toContainText('via gateway');
    await expect(source).toContainText('Não configurada'); await expect(source).toContainText('Última carga válida: nenhuma');
  }
  await dialog.getByRole('button', { name: 'Dicionário de indicadores', exact: true }).click();
  const names = await dialog.locator('.p-formula h3').allTextContents(); assert.equal(names.length, new Set(names).size);
  assert(!names.some(name => /Espectadores.*2025|Cowork.*publicad|Cursos.*publicad/i.test(name))); await closeDialogs();
});

await test('Presidency KPIs reconcile active CNPJ roots, active people, explicit ART authors and cash receipts', async () => {
  await prepare(); const values = await readKpis();
  const continuity = buildExecutiveCompanyContinuity(base), engagement = buildExecutiveProfessionalEngagement(base), receipts = buildExecutiveCorporateReceipts(base);
  assert.equal(values.activeCompanies, num(continuity.total));
  assert.equal(values.activeProfessionals, num(basePeopleMetrics.activeProfessionals));
  assert.equal(values.activeArtAuthorsObserved, num(engagement.withArtIds.length));
  assert.equal(values.corporateReceipts, `R$ ${receipts.receivedAmount.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })}`);
  assert.equal(values.activeCompaniesWithoutRt, num(continuity.withoutRtIds.length));
  await page.getByLabel('Período interno', { exact: true }).selectOption('3'); await settle();
  const short = selectScope(dataset, { ...defaultFilters, period: 3 });
  const shortEngagement = buildExecutiveProfessionalEngagement(short), shortReceipts = buildExecutiveCorporateReceipts(short);
  assert.equal(await kpi('activeArtAuthorsObserved').textContent(), num(shortEngagement.withArtIds.length));
  assert.equal(await kpi('corporateReceipts').textContent(), `R$ ${shortReceipts.receivedAmount.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })}`);
});

await test('Registration evolution preserves signed exits, historical stock and exact inbound drillthrough', async () => {
  await prepare(); const expected = buildExecutiveEvolution(base); const info = await chart('executive-evolution');
  assert.deepEqual(info.series.map(row => row.type), ['bar', 'bar', 'line']);
  assert.deepEqual(info.series[0].data, expected.map(row => row.newRegistrations + row.reactivations));
  assert.deepEqual(info.series[1].data, expected.map(row => -(row.closures + row.cancellations)));
  assert.deepEqual(info.series[2].data, expected.map(row => row.base));
  const picked = await chart('executive-evolution', 'bar');
  const ids = [...new Set(base.movements.filter(row => row.date.startsWith(expected[picked.dataIndex].date.slice(0, 7)) && ['Novo registro', 'Reativação'].includes(row.type)).map(row => row.companyId))];
  await expect(page.getByLabel('Limpar seleção de empresas', { exact: true })).toContainText(num(ids.length));
  await records(); await expect.poll(recordCount).toBe(ids.length);
  await page.locator('#company-list .p-company-link').first().click(); await page.getByLabel('Detalhes da empresa', { exact: true }).waitFor();
  assert.equal(await page.locator('.p-drawer input,.p-drawer textarea').count(), 0); await closeDialogs();
});

await test('Active-company RT partition counts each root once and real segment click selects only missing-RT companies', async () => {
  await prepare(); const expected = buildExecutiveCompanyContinuity(base), info = await chart('executive-continuity');
  assert.equal(info.series[0].data.reduce((a, b) => a + b, 0), expected.withRtIds.length);
  assert.equal(info.series[1].data.reduce((a, b) => a + b, 0), expected.withoutRtIds.length);
  const picked = await chart('executive-continuity', 'bar', 0, 1), label = picked.yLabels[picked.dataIndex];
  const selectedRows = label === 'Demais GREs' ? expected.rows.slice(5) : expected.rows.filter(row => row.label === label);
  const ids = selectedRows.flatMap(row => row.withoutRtIds); assert(ids.length > 0);
  await records(); await expect.poll(recordCount).toBe(ids.length); await closeDialogs();
  assert.equal((await download(() => page.getByLabel('Exportar dados do recorte', { exact: true }).click())).text,
    exportCsv(selectScope(dataset, defaultFilters, ids), { financial: true, export: true }));
});

await test('Active-person ART authorship partition never treats an RT link as authorship or absence as unemployment', async () => {
  await prepare(); const expected = buildExecutiveProfessionalEngagement(base), info = await chart('executive-engagement');
  assert.equal(info.series[0].data.reduce((a, b) => a + b, 0), expected.withArtIds.length);
  assert.equal(info.series[1].data.reduce((a, b) => a + b, 0), expected.withoutArtIds.length);
  assert(info.tooltipExample.includes('não significa desemprego')); assert(info.tooltipExample.includes('não presume autoria'));
  const picked = await chart('executive-engagement', 'bar', 0, 1), label = picked.yLabels[picked.dataIndex];
  const selectedRows = label === 'Demais modalidades' ? expected.rows.slice(5) : expected.rows.filter(row => row.label === label);
  const ids = selectedRows.flatMap(row => row.withoutArtIds); assert(ids.length > 0);
  await records(); await expect(page.locator('#professional-list .p-count')).toHaveText(num(ids.length));
  await page.locator('#professional-list .p-company-link').first().click();
  await page.getByLabel('Fechar ficha do profissional', { exact: true }).waitFor(); await closeDialogs();
});

await test('ART production combines events and distinct authors on separate axes from the explicit bridge', async () => {
  await prepare(); const expected = buildExecutiveArtProduction(base), info = await chart('executive-production');
  assert.deepEqual(info.series.map(row => row.type), ['bar', 'line']); assert.equal(info.yAxes.length, 2);
  assert.deepEqual(info.series[0].data, expected.rows.map(row => row.arts)); assert.deepEqual(info.series[1].data, expected.rows.map(row => row.authors));
  assert(info.tooltipExample.includes('não somar os distintos mensais'));
  const picked = await chart('executive-production', 'bar'), ids = expected.rows[picked.dataIndex].companyIds;
  await records(); await expect.poll(recordCount).toBe(ids.length); await closeDialogs();
  assert.equal((await download(() => page.getByLabel('Exportar dados do recorte', { exact: true }).click())).text,
    exportCsv(selectScope(dataset, defaultFilters, ids), { financial: true, export: true }));
});


await test('The ART production author line opens the exact explicitly attributed person cohort', async () => {
  await prepare(); const expected = buildExecutiveArtProduction(base);
  const picked = await chart('executive-production', 'item', 0, 1), ids = expected.rows[picked.dataIndex].authorIds;
  assert.equal(picked.clicked.seriesName, 'Autores distintos'); assert.equal(picked.clicked.seriesIndex, 1);
  assert(ids.length > 0); await records(); await expect(page.locator('#professional-list .p-count')).toHaveText(num(ids.length)); await closeDialogs();
  assert.equal((await download(() => page.getByLabel('Exportar dados do recorte', { exact: true }).click())).text,
    exportProfessionalCsv(selectProfessionalScope(base, { professionalIds: ids }), true));
});

await test('Cash receipts reconcile payment-date flows and recovered receipts remain a subset of the total', async () => {
  await prepare(); const expected = buildExecutiveCorporateReceipts(base), info = await chart('executive-receipts');
  assert.deepEqual(info.series.map(row => row.type), ['bar', 'bar']);
  assert.deepEqual(info.series[0].data, expected.rows.map(row => row.regularAmount));
  assert.deepEqual(info.series[1].data, expected.rows.map(row => row.recoveredAmount));
  assert(info.tooltipExample.includes('estoque, não somar')); assert(info.tooltipExample.includes('não receita do conselho'));
  const picked = await chart('executive-receipts', 'bar', 0, 1), ids = expected.rows[picked.dataIndex].recoveredCompanyIds;
  await records(); await expect.poll(recordCount).toBe(ids.length); await closeDialogs();
});

await test('Regional economy scatter uses common month-end cutoffs and synchronizes an actual GRE selection', async () => {
  await prepare(); const expected = buildExecutiveRegionalEconomy(base), info = await chart('executive-economy');
  assert.equal(info.type, 'scatter'); assert(info.data.length > 1);
  for (const datum of info.data) {
    const row = expected.rows.find(row => row.id === datum.greId); assert(row);
    assert.deepEqual(datum.value, [row.employmentChange, row.companyChange, row.employmentLast]);
  }
  const picked = await chart('executive-economy', 'scatter', 'isolated'), id = picked.data[picked.dataIndex].greId;
  await expect.poll(() => currentFilters().greIds).toEqual([id]);
  assert.equal(await kpi('activeCompanies').textContent(), num(buildExecutiveCompanyContinuity(selectScope(dataset, { ...defaultFilters, greIds: [id] })).total));
});

await test('Company-specific selection preserves aggregated employment and explains incompatible regional comparison', async () => {
  await prepare(); await page.getByLabel('Selecionar Empresas ativas', { exact: true }).click(); await settle();
  await expect(page.locator('[data-panel="executive-economy"]')).toContainText('Esses filtros não existem na fonte agregada de emprego');
  await nav('market'); const info = await chart('market-employment-map');
  assert.equal(info.type, 'map'); assert.equal(info.mapRegionCount, 645);
  assert.equal(info.data.filter(row => Number.isFinite(row.value)).reduce((total, row) => total + row.value, 0), baseMetrics.employees);
});

await test('Compare adds actual previous-window registration, ART and receipt series and removes them again', async () => {
  await prepare(); await page.getByRole('checkbox', { name: 'Comparar', exact: true }).check(); await settle();
  assert.deepEqual((await chart('executive-evolution')).series.at(-1).data, buildExecutiveEvolution(base).map(row => row.previousNew));
  assert.deepEqual((await chart('executive-production')).series.at(-1).data, buildExecutiveArtProduction(base).rows.map(row => row.previousArts));
  assert.deepEqual((await chart('executive-receipts')).series.at(-1).data, buildExecutiveCorporateReceipts(base).rows.map(row => row.previousReceivedAmount));
  await page.getByRole('checkbox', { name: 'Comparar', exact: true }).uncheck(); await settle();
  assert.equal((await chart('executive-evolution')).series.length, 3); assert.equal((await chart('executive-production')).series.length, 2); assert.equal((await chart('executive-receipts')).series.length, 2);
});

await test('Company and professional CSV exports exactly match their relational source records', async () => {
  await prepare('companies'); assert.equal((await download(() => page.getByLabel('Exportar dados do recorte', { exact: true }).click())).text, exportCsv(base, { financial: true, export: true }));
  await nav('overview'); assert.equal((await download(() => page.getByLabel('Exportar dados do recorte', { exact: true }).click())).text, exportCsv(base, { financial: true, export: true }));
  await nav('professionals'); assert.equal((await download(() => page.getByLabel('Exportar dados do recorte', { exact: true }).click())).text, exportProfessionalCsv(basePeople, true));
});

await test('Diploma cohorts count declared graduates once and real bars resolve to the exact professional records', async () => {
  await prepare('professionals'); const degreeIds = new Set(basePeople.model.education.filter(row => row.level === 'Graduação' && basePeople.profileIds.has(row.professionalId)).map(row => row.professionalId));
  assert.equal(await kpi('registeredGraduates').textContent(), num(degreeIds.size));
  const expected = buildRegisteredFormation(basePeople), info = await chart('professionals-education');
  assert.deepEqual(info.series[0].data, expected.map(row => row.graduates)); assert.deepEqual(info.series[1].data, expected.map(row => row.withRt));
  const picked = await chart('professionals-education', 'bar'), ids = expected[picked.dataIndex].professionalIds;
  await records(); await expect(page.locator('#professional-list .p-count')).toHaveText(num(ids.length)); await closeDialogs();
  assert.equal((await download(() => page.getByLabel('Exportar dados do recorte', { exact: true }).click())).text,
    exportProfessionalCsv(selectProfessionalScope(base, { professionalIds: ids }), true));
});

await test('Municipal SP employment map retains last-month stock under company-size filters', async () => {
  await prepare('market'); const before = await chart('market-employment-map'), observed = before.data.filter(row => Number.isFinite(row.value));
  assert.equal(observed.reduce((sum, row) => sum + row.value, 0), baseMetrics.employees);
  await select('Porte', ['Grande empresa']); const narrowed = await chart('market-employment-map');
  assert.deepEqual(narrowed.data.filter(row => Number.isFinite(row.value)), observed); assert.equal(await kpi('employees').textContent(), num(baseMetrics.employees));
});

await test('Multiple GRE filters persist across thematic navigation and reload', async () => {
  await prepare('companies'); const labels = dataset.gres.slice(0, 2).map(row => row.name), ids = dataset.gres.slice(0, 2).map(row => row.id);
  await select('GRE', labels); await expect.poll(() => currentFilters().greIds).toEqual(ids); await nav('overview');
  assert.equal(await kpi('activeCompanies').textContent(), num(buildExecutiveCompanyContinuity(selectScope(dataset, { ...defaultFilters, greIds: ids })).total));
  await page.reload({ waitUntil: 'networkidle' }); await settle(); await chartReady(); await expect.poll(() => currentFilters().greIds).toEqual(ids); await clear();
});

await test('Five digital inspection KPIs reconcile eligible roots and explicit Boolean evidence rules', async () => {
  await prepare('inspection'); const expected = buildDigitalInspection(base).metrics;
  const entries = { digitalEligible: expected.eligibleCompanies, digitalNoMatch: expected.noCorrespondence,
    digitalTechnicalSuppliers: expected.technicalContractSuppliers, digitalWithoutRt: expected.registeredWithoutRt,
    digitalConvergent: expected.convergentSignals };
  for (const [id, value] of Object.entries(entries)) assert.equal(await kpi(id).textContent(), num(value));
  await page.getByLabel('Selecionar Registradas sem RT identificado', { exact: true }).click(); await records();
  await expect.poll(recordCount).toBe(expected.registeredWithoutRt); await closeDialogs();
});

await test('Fiscalization is exclusively digital source crossing, with six distinct evidence visualizations and no operational assessment', async () => {
  await prepare('inspection');
  assert.deepEqual(await page.locator('.r5-panel').evaluateAll(rows => rows.map(row => row.dataset.panel)), [
    'digital-matching-flow', 'digital-territorial-coverage', 'digital-cnae-evidence', 'digital-public-contracts', 'digital-employment-context', 'digital-evidence-combinations',
  ]);
  const content = await page.locator('main').innerText();
  assert(!/Casos concluídos|Casos no histórico|Tempo médio de análise|SLA|Pontuação|Prioridade elevada|Eficiência da fiscalização|Colaboradores/i.test(content));
  assert.equal(await page.locator('main input:not([type="checkbox"]),main textarea').count(), 0);
  assert.equal((await chart('digital-matching-flow')).type, 'sankey');
  assert.equal((await chart('digital-territorial-coverage')).type, 'bar');
  assert.equal((await chart('digital-cnae-evidence')).type, 'heatmap');
  assert.equal((await chart('digital-public-contracts')).type, 'treemap');
  assert.equal((await chart('digital-employment-context')).type, 'scatter');
  assert.equal((await chart('digital-evidence-combinations')).type, 'bar');
});

await test('Digital CNPJ Sankey conserves eligible company identities and node click opens exact nonmatching companies', async () => {
  await prepare('inspection'); const expected = buildDigitalInspection(base), flow = buildDigitalMatchingFlow(expected), info = await chart('digital-matching-flow');
  assert.deepEqual(info.links.map(row => ({ source: row.source, target: row.target, value: row.value, companyIds: row.companyIds })), flow.links);
  const index = info.data.findIndex(row => row.name === 'Não localizado'); assert(index >= 0);
  const ids = expected.companies.filter(row => row.match === 'none').map(row => row.companyId);
  await chart('digital-matching-flow', 'item', index);
  await records(); await expect.poll(recordCount).toBe(ids.length); await closeDialogs();
  await page.getByLabel('Abrir evidências da fiscalização digital', { exact: true }).first().click();
  const evidence = page.locator('#digital-evidence-list'); await evidence.waitFor();
  assert.equal((await download(() => evidence.getByLabel('Exportar evidências digitais CSV', { exact: true }).click())).text,
    exportDigitalInspectionCsv(selectScope(dataset, defaultFilters, ids), true));
});

await test('Digital regional bar and exact-coverage line reconcile source companies without summing multi-GRE establishments', async () => {
  await prepare('inspection'); const expected = buildDigitalInspection(base).regions.slice(0, 8), info = await chart('digital-territorial-coverage');
  assert.deepEqual(info.series.map(row => row.type), ['bar', 'bar', 'bar', 'line']);
  assert.deepEqual(info.series[0].data, expected.map(row => row.exactActiveIds.length + row.exactInactiveIds.length));
  assert.deepEqual(info.series[1].data, expected.map(row => row.rootSuggestionIds.length));
  assert.deepEqual(info.series[2].data, expected.map(row => row.noCorrespondenceIds.length));
  assert.deepEqual(info.series[3].data, expected.map(row => row.coverage));
  assert(info.tooltipExample.includes('não somar regiões'));
  const picked = await chart('digital-territorial-coverage', 'bar', 0, 2), row = expected[picked.dataIndex];
  await expect.poll(() => currentFilters().greIds).toEqual([row.id]);
  await records(); await expect.poll(recordCount).toBe(row.noCorrespondenceIds.length); await closeDialogs();
});

await test('CNAE × evidence heatmap preserves principal/secondary classifications and exact nonadditive cell drillthrough', async () => {
  await prepare('inspection'); const expected = buildDigitalInspection(base), info = await chart('digital-cnae-evidence');
  assert.equal(info.type, 'heatmap'); const cnaes = expected.cnaes.slice(0, 7);
  const predicates = [row => row.match === 'none', row => row.match === 'root-suggestion', row => row.signals.some(signal => signal.ruleId === 'DIG-04'), row => row.signals.some(signal => signal.ruleId === 'DIG-05')];
  for (const [x, y, value] of info.data) assert.equal(value, expected.companies.filter(row => row.cnaeCodes.includes(cnaes[y].code) && predicates[x](row)).length);
  const picked = await chart('digital-cnae-evidence', 'heatmap'), [x, y] = picked.data[picked.dataIndex];
  const ids = expected.companies.filter(row => row.cnaeCodes.includes(cnaes[y].code) && predicates[x](row)).map(row => row.companyId);
  await expect.poll(() => currentFilters().cnaeCodes).toEqual([cnaes[y].code]); await records(); await expect.poll(recordCount).toBe(ids.length); await closeDialogs();
});

await test('PNCP technical-object treemap reconciles selected suppliers and never infers a missing contract ART', async () => {
  await prepare('inspection'); const expected = buildDigitalInspection(base), info = await chart('digital-public-contracts');
  const eligible = new Map(expected.companies.map(row => [row.companyId, row]));
  const technical = expected.contracts.filter(row => row.classification.engineering && eligible.has(row.contract.companyId));
  assert.equal(info.data.reduce((total, row) => total + row.value, 0), technical.reduce((total, row) => total + row.contract.value, 0));
  assert(info.tooltipExample.includes('sem IA treinada')); assert(info.tooltipExample.includes('Vínculo contrato↔ART não disponível'));
  const picked = await chart('digital-public-contracts', 'item'), match = picked.data[picked.dataIndex].id;
  const ids = [...new Set(technical.filter(row => eligible.get(row.contract.companyId).match === match).map(row => row.contract.companyId))];
  await records(); await expect.poll(recordCount).toBe(ids.length); await closeDialogs();
});

await test('CAGED municipal context uses period job flows and only the final stock snapshot, without a worker–CNPJ join', async () => {
  await prepare('inspection'); const expected = buildDigitalInspection(base), info = await chart('digital-employment-context');
  const data = info.series.flatMap(series => series.data); assert(data.length > 0);
  for (const datum of data) {
    const row = expected.employmentContext.find(row => row.cityId === datum.id); assert(row);
    assert.deepEqual(datum.value, [row.balance, row.coverage, row.stock]);
    assert.equal(row.balance, row.admissions - row.dismissals);
    const sourceFacts = base.employment.filter(fact => row.employmentFactIds.includes(fact.id));
    assert.equal(row.stock, sourceFacts.filter(fact => fact.month === row.lastMonth).reduce((total, fact) => total + fact.stock, 0));
  }
  await select('Porte', ['Grande empresa']); const narrowed = await chart('digital-employment-context');
  for (const datum of narrowed.series.flatMap(series => series.data)) {
    const original = data.find(row => row.id === datum.id); assert(original);
    assert.equal(datum.value[0], original.value[0]); assert.equal(datum.value[2], original.value[2]);
  }
  assert.equal(summarize(selectScope(dataset, { ...defaultFilters, sizes: ['Grande empresa'] })).employees, baseMetrics.employees);
});

await test('An actual CAGED-context municipality point applies territorial filters and selects eligible companies, not workers', async () => {
  await prepare('inspection'); const info = await chart('digital-employment-context'), seriesIndex = info.series.findIndex(row => row.data.length > 0);
  assert(seriesIndex >= 0); const picked = await chart('digital-employment-context', 'scatter', 0, seriesIndex), cityId = picked.data[picked.dataIndex].id;
  await expect.poll(() => currentFilters().cityIds).toEqual([cityId]);
  const expected = buildDigitalInspection(base).employmentContext.find(row => row.cityId === cityId);
  await records(); await expect.poll(recordCount).toBe(expected.companyIds.length); await closeDialogs();
});

await test('Digital evidence combinations form a disjoint whole-universe partition and real bar click selects its exact group', async () => {
  await prepare('inspection'); const expected = buildDigitalInspection(base), info = await chart('digital-evidence-combinations');
  assert.equal(info.data.reduce((a, b) => a + b, 0), expected.metrics.eligibleCompanies);
  assert(info.tooltipExample.includes('não é pontuação'));
  const picked = await chart('digital-evidence-combinations', 'bar'), label = picked.yLabels[picked.dataIndex];
  const predicates = {
    'Objeto técnico + sem vigente': row => row.signals.some(signal => signal.ruleId === 'DIG-04'),
    'Vigente + RT não identificado': row => row.match === 'exact-active' && !row.activeRtIds.length,
    'Só raiz · sem objeto técnico': row => row.match === 'root-suggestion' && !row.technicalContractIds.length,
    'Inativo · sem objeto técnico': row => row.match === 'exact-inactive' && !row.technicalContractIds.length,
    'Não localizado · sem objeto': row => row.match === 'none' && !row.technicalContractIds.length,
    'Vigente + RT identificado': row => row.match === 'exact-active' && Boolean(row.activeRtIds.length),
  };
  const ids = expected.companies.filter(predicates[label]).map(row => row.companyId);
  await records(); await expect.poll(recordCount).toBe(ids.length); await closeDialogs();
});

await test('Evidence records support source criteria, valid CNPJ, company drillthrough, sorting, rule search, pagination and exact CSV', async () => {
  await prepare('inspection'); await page.getByLabel('Abrir evidências da fiscalização digital', { exact: true }).first().click();
  const evidence = page.locator('#digital-evidence-list'); await evidence.waitFor();
  const expected = buildDigitalInspection(base), count = expected.companies.reduce((total, row) => total + Math.max(1, row.signals.length), 0);
  await expect(evidence.locator('.p-count')).toHaveText(num(count));
  assert.equal((await download(() => evidence.getByLabel('Exportar evidências digitais CSV', { exact: true }).click())).text, exportDigitalInspectionCsv(base, true));
  await evidence.getByRole('button', { name: 'Empresa / CNPJs', exact: true }).click();
  await expect(evidence.locator('.p-company-link').first()).toHaveText(expected.companies.at(-1).name);
  await expect(evidence.getByRole('columnheader', { name: 'Empresa / CNPJs', exact: true })).toHaveAttribute('aria-sort', 'descending');
  await evidence.getByRole('button', { name: 'Empresa / CNPJs', exact: true }).click();
  await evidence.getByLabel('Próxima página de evidências digitais', { exact: true }).click(); await expect(evidence.locator('.p-pagination')).toContainText('Página 2');
  await evidence.getByLabel('Filtrar regra da fiscalização digital', { exact: true }).selectOption('DIG-04');
  const signals = expected.evidenceRows.filter(row => row.ruleId === 'DIG-04');
  await expect(evidence.locator('.p-count')).toHaveText(num(signals.length));
  const filteredCsv = (await download(() => evidence.getByLabel('Exportar evidências digitais CSV', { exact: true }).click())).text;
  assert.equal(filteredCsv, exportDigitalInspectionCsv(base, true, [...new Set(signals.map(row => row.companyId))], 'DIG-04', signals.map(row => row.id)));
  const candidate = expected.companies.find(row => row.signals.some(signal => signal.ruleId === 'DIG-04'));
  await evidence.getByLabel('Pesquisar evidências digitais', { exact: true }).fill(candidate.cnpjs[0]);
  await expect(evidence.locator('.p-count')).toHaveText('1');
  assert(isValidDigitalCnpj(candidate.cnpjs[0]));
  await evidence.getByText('Critérios e fontes', { exact: true }).first().click(); await expect(evidence).toContainText('Referências:'); await expect(evidence).toContainText('Limite:');
  await expect(evidence).toContainText('ART da empresa não comprova ART deste contrato');
  await evidence.locator('.p-company-link').first().click(); await page.getByLabel('Detalhes da empresa', { exact: true }).waitFor();
  await page.getByLabel('Detalhes da empresa', { exact: true }).selectOption('inspection');
  const companyEvidence = page.locator('[data-inspection-evidence="company"]'); await expect(companyEvidence).toContainText('Correspondência e cobertura das fontes');
  await expect(page.locator('.p-drawer-callout')).toContainText('Evidências para fiscalização digital');
  assert(!/Pontuação|Prioridade diagnóstica|probabilidade.*\d|confiança.*\d/i.test(await companyEvidence.innerText()));
  await closeDialogs();
  await page.getByLabel('Abrir evidências da fiscalização digital', { exact: true }).first().click();
  await page.getByLabel('Pesquisar evidências digitais', { exact: true }).fill('ZZZ-NENHUMA-EVIDENCIA');
  await expect(page.locator('#digital-evidence-list')).toContainText('Nenhuma evidência neste filtro');
  await expect(page.getByLabel('Exportar evidências digitais CSV', { exact: true })).toBeDisabled(); await closeDialogs();
});

await test('Fiscal evidence stays in Fiscalization and outside-company drillthrough has no inspection tab', async () => {
  await prepare('companies'); await page.getByLabel('Selecionar Empresas no CREA', { exact: true }).click(); await records();
  await page.locator('#company-list .p-company-link').first().click(); const chooser = page.getByLabel('Detalhes da empresa', { exact: true }); await chooser.waitFor();
  assert.equal(await chooser.locator('option[value="inspection"]').count(), 0); assert.equal(await page.locator('[data-inspection-evidence="company"]').count(), 0);
  await closeDialogs();
  for (const [id] of reports.filter(([id]) => id !== 'inspection')) { await nav(id); assert.equal(await page.locator('main [data-panel^="digital-"]').count(), 0); }
});
await test('Transparency shows only the CREA-SP rule catalog, with pending current values and no public-release operation', async () => {
  await prepare('transparency');
  const expected = selectTransparencyRows();
  await expect(page.locator('[data-catalog-count]')).toContainText(`${expected.length} regras`);
  assert.equal(await page.locator('[data-catalog-id]').count(), 4);
  assert.deepEqual(await page.locator('[data-catalog-id]').evaluateAll(rows => rows.map(row => row.dataset.catalogId)), expected.slice(0, 4).map(row => row.id));
  await expect(page.locator('[data-panel="transparency-catalog"]')).toContainText('42 indicadores CREA + 2 de dependência federal');
  await expect(page.locator('[data-panel="transparency-catalog"]')).toContainText('9 exclusivamente Confea ficam fora');
  assert.equal(await page.locator('.r8-pending').count(), 4); assert((await page.locator('.r8-pending').allTextContents()).every(text => text === 'Fonte não conectada'));
  assert.equal(await page.getByRole('button', { name: /Publicar|Liberar|Compartilhar publicamente/i }).count(), 0);
  assert.equal((await download(() => page.getByLabel('Exportar catálogo filtrado CSV', { exact: true }).click())).text, exportTransparencyCsv(expected, true));
});

await test('Confea catalog search, mandatory filter, program selection, numeric sort, paging and CSV refer to identical rules', async () => {
  await prepare('transparency');
  const expected = selectTransparencyRows(); await page.getByLabel('Próxima página do catálogo', { exact: true }).click();
  assert.deepEqual(await page.locator('[data-catalog-id]').evaluateAll(rows => rows.map(row => row.dataset.catalogId)), expected.slice(4, 8).map(row => row.id));
  await page.getByLabel('Pesquisar catálogo Confea', { exact: true }).fill('fiscalização');
  await page.getByRole('checkbox', { name: 'RG obrigatório', exact: true }).check();
  const filtered = selectTransparencyRows({ search: 'fiscalização', mandatoryOnly: true }); assert(filtered.length > 0);
  await expect(page.locator('[data-catalog-count]')).toContainText(`${filtered.length} regras`);
  assert.equal((await download(() => page.getByLabel('Exportar catálogo filtrado CSV', { exact: true }).click())).text, exportTransparencyCsv(filtered, true));
  await page.getByLabel('Subprograma do catálogo', { exact: true }).selectOption(filtered[0].program);
  await page.getByLabel('Ordenar código do catálogo', { exact: true }).click();
  const sorted = selectTransparencyRows({ search: 'fiscalização', mandatoryOnly: true, program: filtered[0].program, descending: true });
  assert.deepEqual(await page.locator('[data-catalog-id]').evaluateAll(rows => rows.map(row => row.dataset.catalogId)), sorted.slice(0, 4).map(row => row.id));
  assert.equal((await download(() => page.getByLabel('Exportar catálogo filtrado CSV', { exact: true }).click())).text, exportTransparencyCsv(sorted, true));
  await page.getByLabel('Pesquisar catálogo Confea', { exact: true }).fill('NAO_EXISTE_REGRA_998877');
  await expect(page.locator('[data-report="transparency"]')).toContainText('Nenhuma regra neste recorte');
  await expect(page.getByLabel('Exportar catálogo filtrado CSV', { exact: true })).toBeDisabled();
});

await test('Indicator 53 explains approved fiscal budget 183 / total 182 and explicitly excludes a real-growth conclusion', async () => {
  await prepare('transparency'); const expected = selectTransparencyRows().find(row => row.code === '53'); assert(expected);
  await page.getByLabel('Pesquisar catálogo Confea', { exact: true }).fill(expected.title);
  await page.locator('[data-catalog-id="confea-indicator:53"] .r8-row-link').click();
  const detail = page.getByRole('dialog', { name: /^Indicador\/dado 53 —/ }); await detail.waitFor();
  await expect(detail).toContainText('crea:183'); await expect(detail).toContainText('crea:182');
  await expect(detail).toContainText('participação orçamentária'); await expect(detail).toContainText('Não mede por si');
  await expect(detail).toContainText('SQL Server ou Db2 via gateway'); await expect(detail).toContainText('Fonte não conectada');
  assert.equal(await detail.locator('input,textarea').count(), 0); await closeDialogs();
});

await test('Indicator 35 exposes the Excel/text denominator conflict rather than inventing a current answer', async () => {
  await prepare('transparency'); const expected = selectTransparencyRows().find(row => row.code === '35'); assert(expected);
  await page.getByLabel('Pesquisar catálogo Confea', { exact: true }).fill(expected.title);
  await page.locator('[data-catalog-id="confea-indicator:35"] .r8-row-link').click();
  const detail = page.getByRole('dialog', { name: /^Indicador\/dado 35 —/ }); await detail.waitFor();
  await expect(detail).toContainText('J156'); await expect(detail).toContainText('J155');
  await expect(detail).toContainText('nenhuma correção silenciosa'); await expect(detail).toContainText('Fonte não conectada'); await closeDialogs();
});

await test('Required source-data catalog excludes retired requirements and exports definitions with no workbook numeric values', async () => {
  await prepare('transparency'); await page.locator('.r8-catalog-modes').getByRole('button', { name: 'Dados solicitados', exact: true }).click();
  const expected = selectTransparencyRows({ mode: 'data' });
  await expect(page.locator('[data-catalog-count]')).toContainText(`${expected.length} regras`);
  assert.equal((await download(() => page.getByLabel('Exportar catálogo filtrado CSV', { exact: true }).click())).text, exportTransparencyCsv(expected, true));
  await page.getByLabel('Pesquisar catálogo Confea', { exact: true }).fill('37-C');
  await expect(page.locator('[data-report="transparency"]')).toContainText('Nenhuma regra neste recorte');
});

await test('Verified transparency norms distinguish regional DN216 deadlines, Confea submission and the federal API exception', async () => {
  await prepare('transparency'); await expect(page.locator('[data-panel="transparency-obligations"]')).toContainText('31 março');
  await expect(page.locator('[data-panel="transparency-obligations"]')).toContainText('1º abril');
  await expect(page.locator('[data-panel="transparency-readiness"]')).toContainText('apenas dos conselhos federais');
  await page.getByRole('button', { name: 'Ver normas, alcance e exceções', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Transparência — normas verificadas e alcance', exact: true }); await dialog.waitFor();
  await expect(dialog).toContainText('31/03'); await expect(dialog).toContainText('01/04');
  await expect(dialog).toContainText('apenas dos conselhos federais'); await expect(dialog).toContainText('não atribuída como obrigação atual do CREA-SP');
  assert(await dialog.getByRole('link', { name: 'Fonte oficial · art. 4º, I ↗', exact: true }).count() > 0);
  assert.equal(await dialog.getByRole('button', { name: /Publicar|Compartilhar|Autorizar/i }).count(), 0); await closeDialogs();
});

await test('Viewer restrictions cover money, corporate/person/evidence/catalog exports, without hiding descriptive evidence', async () => {
  await prepare(); await page.getByLabel('Perfil demonstrativo', { exact: true }).selectOption('viewer'); await settle();
  await expect(kpi('corporateReceipts')).toHaveText('Restrito');
  await expect(page.locator('[data-panel="executive-receipts"]')).toContainText('restritos ao perfil Administração');
  assert.equal(await page.locator('[data-panel="executive-receipts"] .p-chart-canvas').count(), 0);
  await expect(page.getByLabel('Exportar dados do recorte', { exact: true })).toBeDisabled();
  await nav('companies'); await expect(kpi('compliance')).toHaveText('Restrito');
  await nav('professionals'); await records(); await expect(page.getByLabel('Exportar profissionais CSV', { exact: true })).toBeDisabled(); await closeDialogs();
  await nav('inspection'); await page.getByLabel('Abrir evidências da fiscalização digital', { exact: true }).first().click();
  await expect(page.getByLabel('Exportar evidências digitais CSV', { exact: true })).toBeDisabled();
  await expect(page.locator('#digital-evidence-list')).toContainText('CNPJ completo é determinístico'); await closeDialogs();
  await nav('transparency'); await expect(page.getByLabel('Exportar catálogo filtrado CSV', { exact: true })).toBeDisabled();
  await page.getByLabel('Perfil demonstrativo', { exact: true }).selectOption('admin'); await settle();
});


await test('Every executive, digital and transparency KPI opens its own complete indicator definition', async () => {
  await prepare();
  for (const id of ['overview', 'inspection', 'transparency']) {
    await nav(id);
    const metrics = await page.locator('.r5-kpi').evaluateAll(rows => rows.map(row => row.dataset.metric));
    for (const metric of metrics) {
      const definition = reportIndicators.find(row => row.id === metric); assert(definition, `Missing definition for ${metric}`);
      await page.locator(`[data-metric="${metric}"]`).getByRole('button', { name: /^Definição de / }).click();
      const dialog = page.getByRole('dialog', { name: 'Transparência da análise', exact: true }); await dialog.waitFor();
      const row = dialog.locator('.p-formula').filter({ has: page.getByRole('heading', { name: definition.name, exact: true }) });
      await expect(row).toHaveCount(1);
      for (const term of ['Fórmula', 'Unidade de contagem', 'Fonte', 'Competência', 'Periodicidade', 'Limitações', 'Validação funcional', 'Versão da regra']) await expect(row.getByText(term, { exact: true })).toBeVisible();
      await closeDialogs();
    }
  }
});

await test('No JavaScript, console or HTTP errors occurred during V8 cross-source and transparency analysis', async () => { assert.equal(errors.length, 0, JSON.stringify(errors)); assert.equal(httpFailures.length, 0, JSON.stringify(httpFailures)); });

const report = { suite: 'browser-v8', at: new Date().toISOString(), baseURL, passed: results.filter(row => row.status === 'passed').length,
  failed: results.filter(row => row.status === 'failed').length, desktopCanvases: layouts.filter(row => row.width >= 1100).length,
  responsiveCanvases: layouts.filter(row => row.width < 1100).length, echartsInstances: charts.length, results, layouts, charts, errors, httpFailures };
await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2)); await browser.close();
console.log(JSON.stringify({ passed: report.passed, failed: report.failed, desktopCanvases: report.desktopCanvases, responsiveCanvases: report.responsiveCanvases, errors: errors.length, httpFailures: httpFailures.length }));
process.exitCode = report.failed ? 1 : 0;
