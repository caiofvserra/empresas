import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { dataset } from '../src/domain/dataset.ts';
import { defaultFilters } from '../src/domain/types.ts';
import { exportCsv, selectScope, summarize } from '../src/domain/engine.ts';
import { exportProfessionalCsv, selectProfessionalScope, summarizeProfessionals } from '../src/domain/professionals.ts';
import { buildInstitutionalPrograms, selectInstitutionalScope } from '../src/domain/institutional.ts';
import { exportInstitutionalRecordsCsv } from '../src/report/InstitutionalRecords.tsx';
import { buildExecutiveEvolution, buildExecutiveProduction, buildExecutiveProfessionalFlow } from '../src/report/executive-analysis-v7.ts';
import { buildRegisteredFormation } from '../src/report/ProfessionalsReport.tsx';
const output = process.env.QA_OUTPUT || resolve('test-results/browser-v7');
const baseURL = process.env.QA_URL || 'http://127.0.0.1:5174/';
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
  ['overview', 'Presidência e resultados'], ['companies', 'Empresas'], ['professionals', 'Profissionais e formação'],
  ['market', 'Mercado e emprego'], ['contracts', 'Contratações'], ['inspection', 'Fiscalização'],
];
const baseScope = selectScope(dataset, defaultFilters), baseMetrics = summarize(baseScope);
const base = baseScope;
const basePeople = selectProfessionalScope(baseScope), basePeopleMetrics = summarizeProfessionals(basePeople);
const baseInstitutional = selectInstitutionalScope(baseScope);
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
    const box = menu.locator('.p-select-options > label').filter({ has: page.getByText(value, { exact: true }) }).getByRole('checkbox');
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
const readKpis = () => page.locator('.r5-kpi').evaluateAll(rows => Object.fromEntries(rows.map(row => [row.dataset.metric, row.querySelector('strong')?.textContent])));
await test('Six fixed BI pages have five connected KPIs and six purposeful charts, with no operational form', async () => {
  await prepare(); assert.deepEqual(await page.locator('.r5-pages button').allTextContents(), reports.map(row => row[1]));
  for (const [id, title] of reports) {
    await nav(id); await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    assert.equal(await page.locator('.r5-kpi').count(), 5);
    assert.equal(await page.locator('.r5-grid > .r5-panel').count(), 6);
    assert.equal(await page.locator('main .p-chart-canvas svg').count(), 6);
    assert.equal(await page.locator('main input:not([type="checkbox"]),main textarea').count(), 0);
    assert.equal(await page.locator('main').getByRole('button', { name: /Classificar|Encaminhar|Tratar|Concluir caso|Distribuir/ }).count(), 0);
    assert.equal(await page.locator('main .r6-published,.r5-public-kpi').count(), 0);
    for (const panel of await page.locator('.r5-panel').all()) {
      assert((await panel.locator('.r5-panel-source').getAttribute('title')).length > 25);
      assert((await panel.locator('.p-chart-canvas').getAttribute('aria-label')).length > 20);
    }
  }
});

await test('All twelve desktop canvases fit 1920×1080 and 1366×768 without document scrolling or overlapping panels', async () => {
  await clear();
  for (const [width, height] of [[1920, 1080], [1366, 768]]) {
    await page.setViewportSize({ width, height });
    for (const [id] of reports) {
      await nav(id); await page.waitForTimeout(500);
      const geometry = await page.evaluate(() => {
        const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right }; };
        return { page: document.querySelector('.r5-app').dataset.page, width: innerWidth, height: innerHeight,
          documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight,
          nav: rect(document.querySelector('.r5-pages')),
          panels: [...document.querySelectorAll('.r5-panel')].map(element => ({ id: element.dataset.panel, ...rect(element),
            chart: rect(element.querySelector('.p-chart-canvas')), source: rect(element.querySelector('.r5-panel-source')) })) };
      });
      layouts.push(geometry); assert(geometry.documentWidth <= width + 1, id); assert(geometry.documentHeight <= height + 1, id);
      for (const panel of geometry.panels) {
        assert(panel.x >= 0 && panel.right <= width + 1 && panel.y >= 0 && panel.bottom <= geometry.nav.y + 1, panel.id);
        assert(panel.chart.height >= 100 && panel.chart.bottom <= panel.source.y + 1, `${panel.id}: chart overlaps provenance`);
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

await test('All eighteen narrower views have no horizontal overflow', async () => {
  await clear();
  for (const [width, height] of [[1024, 768], [768, 1024], [390, 844]]) {
    await page.setViewportSize({ width, height });
    for (const [id] of reports) {
      await nav(id); await page.waitForTimeout(200);
      const geometry = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth, height: innerHeight, documentHeight: document.documentElement.scrollHeight }));
      assert(geometry.documentWidth <= width + 1, `${id}: ${width}`); layouts.push({ page: id, ...geometry });
      if (width === 390) await page.screenshot({ path: `${output}/${id}-390.png` });
    }
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
});

await test('Active report shows demonstrative relational measures instead of frozen website/PDF claims', async () => {
  await prepare();
  const forbidden = /30\s*(?:mil|\.000)\s*espectadores|37\s*cowork|5\s*(?:mil|\.000)\s*certificados|32\s*cursos|19\.859\s*concluintes|201\s*mil\s*autos/i;
  for (const [id] of reports) { await nav(id); assert(!forbidden.test(await page.locator('main').innerText()), id); }
  assert((await page.locator('.r5-data-badge').innerText()).includes('FONTES NÃO CONECTADAS'));
  await expect(page.locator('.r5-footer')).toContainText('SQL Server e DB2 via gateway');
});

await test('Source catalog honestly shows SQL Server and Db2 via gateway with no active connection or refresh', async () => {
  await prepare(); await page.getByLabel('Fontes e metodologia', { exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Transparência da análise', exact: true }); await dialog.waitFor();
  await expect(dialog).toContainText('Não conectado'); await expect(dialog).toContainText('Nenhum banco interno do CREA-SP foi conectado');
  for (const id of ['creasp-sql-server', 'creasp-db2']) {
    const source = dialog.locator(`[data-source-id="${id}"]`); await expect(source).toContainText('via gateway');
    await expect(source).toContainText('Não configurada'); await expect(source).toContainText('Última carga válida: nenhuma');
  }
  assert.equal(await dialog.locator('[data-source-id]').count(), 6);
  await dialog.getByRole('button', { name: 'Dicionário de indicadores', exact: true }).click();
  const names = await dialog.locator('.p-formula h3').allTextContents(); assert.equal(names.length, new Set(names).size);
  assert(!names.some(name => /Espectadores.*2025|Cowork.*publicad|Cursos.*publicad/i.test(name)));
  await closeDialogs();
});

await test('Executive five KPIs exactly reconcile with eligible source grains', async () => {
  await prepare(); const values = await readKpis();
  assert.equal(values.registeredCompanies, num(baseMetrics.registeredCompanies));
  assert.equal(values.activeProfessionals, num(basePeopleMetrics.activeProfessionals));
  assert.equal(values.arts, num(baseMetrics.arts));
  assert.equal(values.compliance, `${baseMetrics.compliance.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);
  assert.equal(values.employmentBalance, num(baseMetrics.employmentBalance));
  await page.getByLabel('Período interno', { exact: true }).selectOption('3'); await settle();
  const selected = summarize(selectScope(dataset, { ...defaultFilters, period: 3 }));
  assert.equal(await kpi('arts').textContent(), num(selected.arts));
  assert.equal(await kpi('employmentBalance').textContent(), num(selected.employmentBalance));
});

await test('Executive evolution columns and stock line reconcile before actual bar-to-company drillthrough', async () => {
  await prepare(); const expected = buildExecutiveEvolution(base); const info = await chart('executive-evolution');
  assert.deepEqual(info.series.map(row => row.type), ['bar', 'bar', 'line']);
  assert.deepEqual(info.series[0].data, expected.map(row => row.newRegistrations + row.reactivations));
  assert.deepEqual(info.series[1].data, expected.map(row => row.closures + row.cancellations));
  assert.deepEqual(info.series[2].data, expected.map(row => row.base));
  const clicked = await chart('executive-evolution', 'bar'); const ids = expected[clicked.dataIndex].companyIds;
  await expect(page.getByLabel('Limpar seleção de empresas', { exact: true })).toContainText(num(ids.length));
  await records(); await expect.poll(recordCount).toBe(ids.length);
  await page.locator('#company-list .p-company-link').first().click(); await page.getByLabel('Detalhes da empresa', { exact: true }).waitFor();
  assert.equal(await page.locator('.p-drawer input,.p-drawer textarea').count(), 0); await closeDialogs();
});

await test('Executive Sankey conserves people and actual node click opens the exact professional cohort', async () => {
  await prepare(); const flow = buildExecutiveProfessionalFlow(base); const info = await chart('executive-professionals');
  assert.equal(info.type, 'sankey'); assert.deepEqual(info.links.map(row => ({ source: row.source, target: row.target, value: row.value })), flow.links);
  const index = info.data.findIndex(row => row.name === 'RT vigente'); assert(index >= 0);
  const node = flow.nodes.find(row => row.name === 'RT vigente');
  await chart('executive-professionals', 'item', index);
  await expect(page.getByLabel('Limpar seleção de profissionais', { exact: true })).toContainText(num(node.ids.length));
  await records(); await expect(page.locator('#professional-list .p-count')).toHaveText(num(node.ids.length));
  const firstName = await page.locator('#professional-list .p-company-link').first().textContent();
  await page.locator('#professional-list .p-company-link').first().click();
  const drawer = page.getByRole('dialog', { name: firstName, exact: true }); await drawer.waitFor();
  await drawer.getByRole('tab', { name: 'Relações', exact: true }).click();
  await drawer.getByRole('tab', { name: 'Produção', exact: true }).click(); await expect(drawer).toContainText('autoria declarada');
  await closeDialogs();
});

await test('Executive ART/CAO combination retains own axes and selects source companies from a real ART bar', async () => {
  await prepare(); const expected = buildExecutiveProduction(base); const info = await chart('executive-production');
  assert.deepEqual(info.series.map(row => row.type), ['bar', 'line']); assert.equal(info.yAxes.length, 2);
  assert.deepEqual(info.series[0].data, expected.map(row => row.arts)); assert.deepEqual(info.series[1].data, expected.map(row => row.caos));
  const picked = await chart('executive-production', 'bar'); const ids = expected[picked.dataIndex].artCompanyIds;
  await records(); await expect.poll(recordCount).toBe(ids.length); await closeDialogs();
  assert.equal((await download(() => page.getByLabel('Exportar dados do recorte', { exact: true }).click())).text,
    exportCsv(selectScope(dataset, defaultFilters, ids), { financial: true, export: true }));
});

await test('Executive territorial scatter point updates synchronized GRE segmentation', async () => {
  await prepare(); const info = await chart('executive-economy'); assert.equal(info.type, 'scatter'); assert(info.data.length > 1);
  const picked = await chart('executive-economy', 'scatter', 'isolated'); const id = picked.data[picked.dataIndex].greId;
  await expect.poll(() => currentFilters().greIds).toEqual([id]);
  const expected = summarize(selectScope(dataset, { ...defaultFilters, greIds: [id] }));
  assert.equal(await kpi('registeredCompanies').textContent(), num(expected.registeredCompanies));
});

await test('Comparison adds real previous-window series and hides them when deselected', async () => {
  await prepare(); await page.getByRole('checkbox', { name: 'Comparar', exact: true }).check(); await settle();
  const evolution = await chart('executive-evolution'), production = await chart('executive-production');
  assert.deepEqual(evolution.series.at(-1).data, buildExecutiveEvolution(base).map(row => row.previousNew));
  assert.deepEqual(production.series.at(-1).data, buildExecutiveProduction(base).map(row => row.previousArts));
  assert((await chart('institutional-programs')).series.some(row => row.name.includes('anterior')));
  await page.getByRole('checkbox', { name: 'Comparar', exact: true }).uncheck(); await settle();
  assert.equal((await chart('executive-evolution')).series.length, 3); assert.equal((await chart('executive-production')).series.length, 2);
});

await test('Program context selection affects program facts and preserves company, ART and employment measures', async () => {
  await prepare(); const before = await readKpis(); const evolution = await chart('executive-evolution');
  const info = await chart('institutional-programs'); const programs = buildInstitutionalPrograms(baseInstitutional).filter(row => ['formacao', 'orientacao'].includes(row.programId));
  assert.deepEqual(info.series[0].data, programs.map(row => row.plannedCents / 100));
  assert.deepEqual(info.series[1].data, programs.map(row => row.executedCents / 100));
  assert.deepEqual(info.series[2].data, programs.map(row => row.distinctParticipants));
  await chart('institutional-programs', 'bar'); await expect(page.getByLabel('Limpar seleção institucional', { exact: true })).toBeVisible();
  const options = JSON.parse(new URL(page.url()).searchParams.get('i')); assert.deepEqual(options.programIds, [programs[0].programId]);
  assert.deepEqual(await readKpis(), before); assert.deepEqual((await chart('executive-evolution')).series, evolution.series);
  assert.equal((await chart('institutional-programs')).xLabels.length, 1);
  await page.reload({ waitUntil: 'networkidle' }); await settle(); await chartReady();
  assert.deepEqual(JSON.parse(new URL(page.url()).searchParams.get('i')).programIds, [programs[0].programId]);
  await page.getByLabel('Limpar seleção institucional', { exact: true }).click(); await settle();
  assert.equal((await chart('institutional-programs')).xLabels.length, 2);
});

await test('Service-category selection uses its own denominator and preserves the other connected domains', async () => {
  await prepare(); const before = await readKpis(); const program = await chart('institutional-programs'); const info = await chart('institutional-services');
  assert.deepEqual(info.series.map(row => row.type), ['bar', 'bar', 'line']); assert(info.tooltipExample.includes('14 dias')); assert(info.tooltipExample.includes('madura'));
  await chart('institutional-services', 'bar'); assert.deepEqual(await readKpis(), before);
  assert.deepEqual((await chart('institutional-programs')).series, program.series);
  assert.equal((await chart('institutional-services')).xLabels.length, 1);
});

await test('Programs and services expose read-only source records, search, sorting, pagination and exact CSV export', async () => {
  await prepare(); await page.locator('[data-panel="institutional-programs"]').getByRole('button', { name: 'Dados ↗', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Programas e serviços — dados do recorte', exact: true }); await dialog.waitFor();
  const tabs = await dialog.getByRole('tab').allTextContents(); assert.equal(tabs.length, 3);
  assert.equal(await dialog.locator('textarea,input:not([aria-label="Pesquisar registros da avaliação institucional"])').count(), 0);
  const csv = await download(() => dialog.getByLabel('Exportar registros institucionais CSV', { exact: true }).click());
  assert.equal(csv.text, exportInstitutionalRecordsCsv(baseInstitutional, { canExport: true, financialAllowed: true }, 'activities', '', { column: 'date', descending: true }));
  await dialog.getByLabel('Próxima página de registros institucionais', { exact: true }).click(); await expect(dialog.locator('.p-pagination')).toContainText('Página 2');
  await dialog.getByLabel('Pesquisar registros da avaliação institucional', { exact: true }).fill('ZZZ-NAO-EXISTE'); await expect(dialog).toContainText('Nenhum registro deste tipo no recorte');
  await dialog.getByLabel('Limpar pesquisa institucional', { exact: true }).click();
  await dialog.getByRole('tab').last().click(); await expect(dialog).toContainText('Uma linha por solicitação'); await closeDialogs();
  await page.locator('[data-panel="institutional-services"]').getByRole('button', { name: 'Dados ↗', exact: true }).click(); await dialog.waitFor(); await closeDialogs();
});

await test('Diplomados no cadastro counts declared graduation people and its cohort bars resolve to the exact records', async () => {
  await prepare('professionals'); const degrees = new Set(basePeople.model.education.filter(row => row.level === 'Graduação' && basePeople.profileIds.has(row.professionalId)).map(row => row.professionalId));
  assert.equal(await kpi('registeredGraduates').textContent(), num(degrees.size));
  const expected = buildRegisteredFormation(basePeople); const info = await chart('professionals-education');
  assert.deepEqual(info.series[0].data, expected.map(row => row.graduates)); assert.deepEqual(info.series[1].data, expected.map(row => row.withRt));
  const picked = await chart('professionals-education', 'bar'); const peopleIds = expected[picked.dataIndex].professionalIds;
  await records(); await expect(page.locator('#professional-list .p-count')).toHaveText(num(peopleIds.length)); await closeDialogs();
  assert.equal((await download(() => page.getByLabel('Exportar dados do recorte', { exact: true }).click())).text,
    exportProfessionalCsv(selectProfessionalScope(base, { professionalIds: peopleIds }), true));
});

await test('Company and professional default exports exactly match their relational source records', async () => {
  await prepare('companies'); assert.equal((await download(() => page.getByLabel('Exportar dados do recorte', { exact: true }).click())).text, exportCsv(base, { financial: true, export: true }));
  await nav('overview'); assert.equal((await download(() => page.getByLabel('Exportar dados do recorte', { exact: true }).click())).text, exportCsv(base, { financial: true, export: true }));
  await nav('professionals'); assert.equal((await download(() => page.getByLabel('Exportar dados do recorte', { exact: true }).click())).text, exportProfessionalCsv(basePeople, true));
});

await test('Viewer restrictions cover corporate finance, CSV and institutional resource values', async () => {
  await prepare(); await page.getByLabel('Perfil demonstrativo', { exact: true }).selectOption('viewer'); await settle();
  await expect(kpi('compliance')).toHaveText('Restrito'); await expect(page.getByLabel('Exportar dados do recorte', { exact: true })).toBeDisabled();
  const programs = await chart('institutional-programs'); assert.deepEqual(programs.series.map(row => row.name), ['Inscrições', 'Presenças', 'Pessoas únicas']);
  assert(!programs.tooltipExample.includes('R$'));
  await page.locator('[data-panel="institutional-programs"]').getByRole('button', { name: 'Dados ↗', exact: true }).click();
  await expect(page.getByLabel('Exportar registros institucionais CSV', { exact: true })).toBeDisabled();
  assert(!await page.locator('#institutional-list').getByRole('columnheader', { name: /Custo/ }).count()); await closeDialogs();
  await nav('companies'); await expect(kpi('compliance')).toHaveText('Restrito');
  await nav('professionals'); await records(); await expect(page.getByLabel('Exportar profissionais CSV', { exact: true })).toBeDisabled(); await closeDialogs();
});

await test('Municipal employment map keeps aggregate stock when the company universe is narrowed', async () => {
  await prepare('market'); const before = await chart('market-employment-map'); assert.equal(before.type, 'map'); assert.equal(before.mapRegionCount, 645);
  const observed = before.data.filter(row => Number.isFinite(row.value));
  assert.equal(observed.reduce((sum, row) => sum + row.value, 0), baseMetrics.employees);
  await select('Porte', ['Grande empresa']); const narrowed = await chart('market-employment-map');
  assert.deepEqual(narrowed.data.filter(row => Number.isFinite(row.value)), observed);
  assert.equal(await kpi('employees').textContent(), num(baseMetrics.employees));
});

await test('Global multiple GRE choices persist across page navigation and reload', async () => {
  await prepare('companies'); const labels = dataset.gres.slice(0, 2).map(row => row.name);
  await select('GRE', labels); const ids = dataset.gres.slice(0, 2).map(row => row.id);
  await expect.poll(() => currentFilters().greIds).toEqual(ids); await nav('overview');
  assert.equal(await kpi('registeredCompanies').textContent(), num(summarize(selectScope(dataset, { ...defaultFilters, greIds: ids })).registeredCompanies));
  await page.reload({ waitUntil: 'networkidle' }); await settle(); await chartReady(); await expect.poll(() => currentFilters().greIds).toEqual(ids);
  await clear();
});

await test('No JavaScript, console or HTTP errors occurred', async () => { assert.equal(errors.length, 0, JSON.stringify(errors)); assert.equal(httpFailures.length, 0, JSON.stringify(httpFailures)); });

const report = { suite: 'browser-v7', at: new Date().toISOString(), baseURL, passed: results.filter(row => row.status === 'passed').length,
  failed: results.filter(row => row.status === 'failed').length, desktopCanvases: layouts.filter(row => row.width >= 1100).length,
  responsiveCanvases: layouts.filter(row => row.width < 1100).length, echartsInstances: charts.length, results, layouts, charts, errors, httpFailures };
await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2)); await browser.close();
console.log(JSON.stringify({ passed: report.passed, failed: report.failed, desktopCanvases: report.desktopCanvases, responsiveCanvases: report.responsiveCanvases, errors: errors.length, httpFailures: httpFailures.length }));
process.exitCode = report.failed ? 1 : 0;

