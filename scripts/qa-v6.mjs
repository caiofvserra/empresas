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
import { buildCoworkAnalysis, buildInstitutionalModel, buildInstitutionalPrograms, buildInstitutionalServiceAnalysis, institutionalParticipantIds, selectInstitutionalScope, summarizeInstitutional } from '../src/domain/institutional.ts';
import { exportInstitutionalCsv } from '../src/domain/institutional-export.ts';
import management from '../src/domain/creasp-management-public.json' with { type: 'json' };
import { buildProfessionalProduction, buildPublishedFormationRegistrationComparison } from '../src/report/ProfessionalsReport.tsx';
import education from '../src/domain/external-education.json' with { type: 'json' };
import userData from '../src/domain/user-engineer-statistics.json' with { type: 'json' };
import pncp from '../src/domain/pncp-public-aggregate.json' with { type: 'json' };

const output = process.env.QA_OUTPUT || resolve('test-results/browser-v6');
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
  ['overview', 'Presidência e resultados'], ['companies', 'Empresas'], ['professionals', 'Profissionais e formação'],
  ['market', 'Mercado e emprego'], ['contracts', 'Contratações'], ['inspection', 'Fiscalização'],
];
const baseScope = selectScope(dataset, defaultFilters), baseMetrics = summarize(baseScope);
const basePeople = selectProfessionalScope(baseScope), basePeopleMetrics = summarizeProfessionals(basePeople);
const institutionalModel = buildInstitutionalModel(dataset);
const baseInstitutional = selectInstitutionalScope(baseScope), baseInstitutionalMetrics = summarizeInstitutional(baseInstitutional);
const percentage = value => value === null ? '—' : `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const money = cents => `R$ ${(cents / 100).toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })}`;
const institutionTerritories = scope => {
  const professionals = basePeople.profiles;
  const totalBudget = scope.budgetEntries.reduce((sum, row) => sum + row.executedCents, 0);
  const allParticipants = new Set(scope.participation.filter(row => row.attended && row.professionalId).map(row => row.professionalId));
  return dataset.gres.map(gre => {
    const budgetCents = scope.budgetEntries.filter(row => row.greId === gre.id).reduce((sum, row) => sum + row.executedCents, 0);
    const domesticPeople = professionals.filter(profile => scope.baselineProfessionalIds.has(profile.id) && dataset.cities.find(city => city.id === profile.cityId)?.greId === gre.id).length;
    const activityIds = new Set(scope.activities.filter(activity => activity.greId === gre.id).map(activity => activity.id));
    const participants = new Set(scope.participation.filter(row => row.attended && row.professionalId && activityIds.has(row.activityId)).map(row => row.professionalId)).size;
    return { greId: gre.id, professionals: domesticPeople, budgetCents, participants,
      budgetShare: totalBudget ? budgetCents / totalBudget : null,
      professionalShare: scope.baselineProfessionalIds.size ? domesticPeople / scope.baselineProfessionalIds.size : null,
      participantShare: allParticipants.size ? participants / allParticipants.size : null };
  }).filter(row => row.professionals || row.budgetCents || row.participants);
};
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

await test('Six fixed report pages expose five KPIs and institutional scorecard plus analytical visuals', async () => {
  await prepare(); assert.deepEqual(await page.locator('.r5-pages button').allTextContents(), reports.map(row => row[1]));
  for (const [id, title] of reports) {
    await nav(id); await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    assert.equal(await page.locator('.r5-kpi').count(), 5); assert.equal(await page.locator('.r5-grid > .r5-panel').count(), 6);
    assert.equal(await page.locator('main .p-chart-canvas svg').count(), id === 'overview' ? 5 : 6);
    assert.equal(await page.locator('main input:not([type="checkbox"])').count(), 0);
    assert.equal(await page.locator('main').getByRole('button', { name: /Classificar|Encaminhar|Tratar|Concluir caso|Distribuir/ }).count(), 0);
    assert.equal(await page.locator('#company-list,.p-drawer,.p-domain-tabs').count(), 0);
    const labels = await page.locator('.r5-app select').evaluateAll(rows => rows.map(row => row.getAttribute('aria-label')));
    assert.deepEqual(labels, ['Perfil demonstrativo', 'Período interno']);
    for (const panel of await page.locator('.r5-panel').all()) {
      assert((await panel.locator('.r5-panel-source').getAttribute('title')).length > 25, 'every visual requires full provenance');
      if (await panel.locator('.p-chart-canvas').count()) assert((await panel.locator('.p-chart-canvas').getAttribute('aria-label')).length > 20);
      else assert.equal(await panel.locator('.r6-published').count(), 1, 'non-chart panel must convey observed published facts');
    }
    if (id === 'overview') {
      await expect(page.getByRole('button', { name: 'Filtrar Programa', exact: true })).toBeVisible();
      assert.equal(await page.getByRole('button', { name: 'Filtrar CNAE', exact: true }).count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Filtrar Porte', exact: true }).count(), 0);
    }
  }
});

await test('Every analytical page fits 1920×1080 and 1366×768 with readable, non-overlapping panel bounds', async () => {
  await clear();
  for (const [width, height] of [[1920, 1080], [1366, 768]]) {
    await page.setViewportSize({ width, height });
    for (const [id] of reports) {
      await nav(id); await page.waitForTimeout(800);
      const layout = await page.evaluate(() => {
        const rect = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right }; };
        return { page: document.querySelector('.r5-app').dataset.page, viewport: { width: innerWidth, height: innerHeight },
          scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight,
          report: rect(document.querySelector('.r5-report')), nav: rect(document.querySelector('.r5-pages')),
          panels: [...document.querySelectorAll('.r5-panel')].map(e => ({ id: e.dataset.panel, ...rect(e),
            chart: e.querySelector('.p-chart-canvas') ? rect(e.querySelector('.p-chart-canvas')) : null,
            content: rect(e.querySelector('.r5-panel-content')), source: rect(e.querySelector('.r5-panel-source')),
            publishedRows: [...e.querySelectorAll('.r6-publishedRow')].map(row => ({ ...rect(row), scrollHeight: row.scrollHeight, clientHeight: row.clientHeight })) })) };
      });
      layouts.push(layout); assert.equal(layout.scrollWidth, width, id); assert.equal(layout.scrollHeight, height, id);
      assert.equal(layout.panels.length, 6);
      for (const panel of layout.panels) {
        assert(panel.x >= 0 && panel.right <= width + 1 && panel.y >= 0 && panel.bottom <= layout.nav.y, panel.id);
        if (panel.chart) {
          assert(panel.chart.height >= 100 && panel.chart.y + panel.chart.height <= panel.source.y + 1, `${panel.id}: chart/source overlap`);
          const info = await chart(panel.id); charts.push({ page: id, viewport: { width, height }, panel: panel.id, host: info.bounds, instance: info.instance });
          assert(Math.abs(info.instance.width - info.bounds.width) < 2, `${panel.id}: ECharts width must track its host`);
          assert(Math.abs(info.instance.height - info.bounds.height) < 2, `${panel.id}: ECharts height must track its host`);
        }
        for (const row of panel.publishedRows) {
          assert(row.bottom <= panel.source.y + 2, `${panel.id}: scorecard row outside panel`);
          assert(row.scrollHeight <= row.clientHeight + 2, `${panel.id}: scorecard text clipped`);
        }
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

await test('All report domains remain accessible on a narrow screen without horizontal document overflow', async () => {
  await clear(); await page.setViewportSize({ width: 430, height: 932 });
  for (const [id] of reports) {
    await nav(id); await page.waitForTimeout(500);
    const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      height: innerHeight, scrollHeight: document.documentElement.scrollHeight,
      panels: [...document.querySelectorAll('.r5-panel')].map(row => { const rect = row.getBoundingClientRect(); return { id: row.dataset.panel, left: rect.left, right: rect.right, width: rect.width, height: rect.height }; }) }));
    assert.equal(dimensions.scrollWidth, dimensions.width, id);
    assert.equal(dimensions.panels.length, 6);
    dimensions.panels.forEach(row => assert(row.left >= 0 && row.right <= dimensions.width + 1 && row.width > 100 && row.height > 100, row.id));
    await page.screenshot({ path: `${output}/${id}-430.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1920, height: 1080 }); await page.evaluate(() => scrollTo(0, 0));
});

await test('Published CREA-SP 2025 deliveries preserve lower bounds and distinct counting units', async () => {
  await prepare(); const published = page.locator('.r6-published');
  assert.deepEqual(await published.locator('strong').allTextContents(), ['32', '>30 mil', '>5 mil', '37']);
  await expect(published).toContainText('Coworks + 2 Espaços CreaLab'); await expect(published).toContainText('>6 mil usuários reportados');
  assert.equal(await published.locator('.r6-publishedRow').count(), 4);
  const links = await published.getByRole('link').evaluateAll(rows => rows.map(row => row.href));
  assert.equal(links.length, 4); assert(links.every(link => link.startsWith(management.metadata.sourceUrl + '#page=')));
  assert.equal(await published.getByRole('img').count(), 0, 'different units must not form a fabricated funnel');
  const source = await page.locator('[data-panel="institutional-published"] .r5-panel-source').getAttribute('title');
  assert(source.includes('2025') && source.includes('publicado') && source.includes('não auditado'));
});

await test('Institutional indicators reconcile participants, identification, utilization and mature-service denominators', async () => {
  await prepare(); const metrics = baseInstitutionalMetrics;
  await expect(kpi('institutionalParticipants')).toHaveText(num(metrics.distinctParticipants));
  await expect(kpi('institutionalExecution')).toHaveText(money(metrics.executedCents));
  await expect(kpi('institutionalIdentification')).toHaveText(percentage(metrics.participationTraceability));
  await expect(kpi('institutionalCowork')).toHaveText(percentage(metrics.coworkOccupancy));
  await expect(kpi('institutionalServiceSla')).toHaveText(percentage(metrics.matureServiceOnTimeRate));
  assert(metrics.attendances > metrics.distinctParticipants, 'repeated presences must remain occurrences');
  assert.equal(metrics.identifiedAttendances + metrics.unidentifiedAttendances, metrics.attendances);
  assert.equal(metrics.repeatAttendances, metrics.identifiedAttendances - metrics.distinctParticipants);
  const services = buildInstitutionalServiceAnalysis(baseInstitutional), rendered = await chart('institutional-services');
  assert.deepEqual(rendered.series.map(row => row.type), ['bar', 'bar', 'line']);
  assert.deepEqual(rendered.series[0].data, services.map(row => row.requests));
  assert.deepEqual(rendered.series[1].data, services.map(row => row.resolved));
  assert.deepEqual(rendered.series[2].data, services.map(row => row.onTimeRate === null ? null : row.onTimeRate * 100));
  assert.equal(rendered.series[0].data.reduce((sum, value) => sum + value, 0), metrics.serviceRequests);
});

await test('Combined program budget and reach chart uses program costs and distinct participants, without summing repeated people', async () => {
  await prepare(); const rows = buildInstitutionalPrograms(baseInstitutional).filter(row => ['formacao', 'orientacao'].includes(row.programId));
  const rendered = await chart('institutional-programs');
  assert.deepEqual(rendered.series.map(row => row.type), ['bar', 'bar', 'line']);
  assert.deepEqual(rendered.series[0].data, rows.map(row => row.plannedCents / 100));
  assert.deepEqual(rendered.series[1].data, rows.map(row => row.executedCents / 100));
  assert.deepEqual(rendered.series[2].data, rows.map(row => row.distinctParticipants));
  assert.equal(rendered.yAxes.length, 2); assert.deepEqual(rendered.yAxes.map(row => row.name), ['BRL', 'Pessoas']);
  assert(rendered.tooltipExample.includes('pessoas identificadas distintas'));
});

await test('Institutional comparison uses observed previous-window budget and mature service rates, preserving null beyond its history', async () => {
  await prepare(); await page.getByRole('checkbox', { name: 'Comparar', exact: true }).check(); await settle();
  const previousAnchor = windowBounds(defaultFilters.period, baseScope.anchor).previousEnd;
  const priorScope = selectInstitutionalScope({ ...baseScope, anchor: previousAnchor });
  const programs = buildInstitutionalPrograms(priorScope).filter(row => ['formacao', 'orientacao'].includes(row.programId));
  const programSeries = (await chart('institutional-programs')).series.find(row => row.name === 'Gasto · janela anterior');
  assert(programSeries); assert.deepEqual(programSeries.data, programs.map(row => row.executedCents / 100));
  const services = buildInstitutionalServiceAnalysis(priorScope);
  const previousService = (await chart('institutional-services')).series.find(row => row.name.includes('anterior'));
  assert(previousService, 'the comparison control must actually alter service analysis');
  assert.deepEqual(previousService.data, services.map(row => row.onTimeRate === null ? null : row.onTimeRate * 100));
  const published = await page.locator('.r6-published').innerText();
  await page.getByLabel('Período interno').selectOption('36'); await settle();
  for (const panel of ['institutional-programs', 'institutional-services']) {
    const prior = (await chart(panel)).series.find(row => row.name.includes('anterior'));
    assert(prior && prior.data.length > 0, panel); assert(prior.data.every(value => value === null), `${panel}: unavailable prior history must not become zero`);
  }
  assert.equal(await page.locator('.r6-published').innerText(), published);
});

await test('Program multi-selection changes all compatible institutional indicators and keeps the official annual scorecard fixed', async () => {
  await prepare(); const original = await page.locator('.r6-published').innerText();
  await select('Programa', ['Formação e eventos']);
  const scoped = selectInstitutionalScope(baseScope, { programIds: ['formacao'] }), metrics = summarizeInstitutional(scoped);
  await expect(kpi('institutionalParticipants')).toHaveText(num(metrics.distinctParticipants));
  await expect(kpi('institutionalExecution')).toHaveText(money(metrics.executedCents));
  await expect(kpi('institutionalCowork')).toHaveText('Sem capacidade');
  assert.equal((await chart('institutional-programs')).xLabels.length, 1);
  assert.equal(await page.locator('[data-panel="institutional-coworks"] .p-chart-canvas').count(), 0);
  assert.equal(await page.locator('.r6-published').innerText(), original);
  await select('Programa', ['Orientação técnica']);
  const union = summarizeInstitutional(selectInstitutionalScope(baseScope, { programIds: ['formacao', 'orientacao'] }));
  await expect(kpi('institutionalParticipants')).toHaveText(num(union.distinctParticipants));
  await expect(kpi('institutionalExecution')).toHaveText(money(union.executedCents));
  assert.equal((await chart('institutional-programs')).xLabels.length, 2);
  await clear(); await expect(kpi('institutionalParticipants')).toHaveText(num(baseInstitutionalMetrics.distinctParticipants));
});

await test('Institutional program selection persists in its own URL state across reload and browser navigation', async () => {
  await prepare(); await select('Programa', ['Formação e eventos']);
  const expected = summarizeInstitutional(selectInstitutionalScope(baseScope, { programIds: ['formacao'] }));
  const state = JSON.parse(new URL(page.url()).searchParams.get('i'));
  assert.deepEqual(state.programIds, ['formacao']);
  await page.reload({ waitUntil: 'networkidle' }); await settle(); await chartReady();
  await expect(kpi('institutionalExecution')).toHaveText(money(expected.executedCents));
  await expect(kpi('institutionalParticipants')).toHaveText(num(expected.distinctParticipants));
  await expect(page.getByRole('button', { name: 'Filtrar Programa', exact: true })).toContainText('Formação e eventos');
  await nav('companies'); await page.goBack(); await expect(page.locator('.r5-app')).toHaveAttribute('data-page', 'overview'); await settle();
  await expect(kpi('institutionalParticipants')).toHaveText(num(expected.distinctParticipants));
  await clear(); await expect(kpi('institutionalParticipants')).toHaveText(num(baseInstitutionalMetrics.distinctParticipants));
  const restored = JSON.parse(new URL(page.url()).searchParams.get('i') || '{}');
  assert(!restored.programIds?.length);
});

await test('Selecting an actual program budget column synchronizes the institutional program cohort', async () => {
  await prepare(); const rows = buildInstitutionalPrograms(baseInstitutional).filter(row => ['formacao', 'orientacao'].includes(row.programId));
  const selected = await chart('institutional-programs', 'bar', 0, 1); const row = rows[selected.dataIndex];
  const expected = summarizeInstitutional(selectInstitutionalScope(baseScope, { programIds: [row.programId] }));
  await expect(kpi('institutionalExecution')).toHaveText(money(expected.executedCents));
  await expect(kpi('institutionalParticipants')).toHaveText(num(expected.distinctParticipants));
  assert.equal((await chart('institutional-programs')).xLabels.length, 1);
  await clear(); await expect(kpi('institutionalExecution')).toHaveText(money(baseInstitutionalMetrics.executedCents));
});

await test('Cowork chart conserves total desk-hour capacity and filters an actual offering municipality', async () => {
  await prepare(); const rows = buildCoworkAnalysis(baseInstitutional), rendered = await chart('institutional-coworks');
  assert.deepEqual(rendered.series[0].data, rows.map(row => row.usedDeskHours));
  assert.deepEqual(rendered.series[1].data, rows.map(row => row.availableDeskHours - row.usedDeskHours));
  assert.equal(rendered.series[0].data.reduce((sum, value) => sum + value, 0), baseInstitutionalMetrics.coworkUsedDeskHours);
  assert.equal(rendered.series.flatMap(row => row.data).reduce((sum, value) => sum + value, 0), baseInstitutionalMetrics.coworkAvailableDeskHours);
  const selected = await chart('institutional-coworks', 'bar', 0); const cityId = rows[selected.dataIndex].cityId;
  await expect.poll(() => currentFilters().cityIds).toEqual([cityId]);
  const metrics = summarizeInstitutional(selectInstitutionalScope(selectScope(dataset, { ...defaultFilters, cityIds: [cityId] })));
  await expect(kpi('institutionalCowork')).toHaveText(percentage(metrics.coworkOccupancy));
  await expect(kpi('institutionalExecution')).toHaveText(money(metrics.executedCents));
});

await test('Territorial scatter uses offering costs against domicile shares and updates GRE by rendered geometry', async () => {
  await prepare(); const rows = institutionTerritories(baseInstitutional), rendered = await chart('institutional-territory');
  assert.deepEqual(rendered.series.map(row => row.type), ['line', 'scatter']);
  assert.deepEqual(rendered.series[1].data.map(row => row.value), rows.filter(row => row.professionalShare !== null && row.budgetShare !== null).map(row => [row.professionalShare * 100, row.budgetShare * 100, row.participants]));
  const selected = await chart('institutional-territory', 'scatter', 'isolated', 1), greId = selected.data[selected.dataIndex].greId;
  await expect.poll(() => currentFilters().greIds).toEqual([greId]);
  const expected = summarizeInstitutional(selectInstitutionalScope(selectScope(dataset, { ...defaultFilters, greIds: [greId] })));
  await expect(kpi('institutionalParticipants')).toHaveText(num(expected.distinctParticipants));
  await expect(kpi('institutionalExecution')).toHaveText(money(expected.executedCents));
  assert(rendered.tooltipExample === null || !rendered.tooltipExample.includes('favorecido'));
});

await test('Follow-up uses one mature cohort and selecting respondents never allocates budget or cowork capacity to people', async () => {
  await prepare(); const eligible = baseInstitutional.followups.filter(row => row.dueAt <= baseScope.anchor);
  const respondents = eligible.filter(row => row.responded && row.respondedAt <= baseScope.anchor);
  const applications = respondents.filter(row => row.outcome === 'Aplicação profissional relatada');
  const rendered = await chart('institutional-followup'); assert.deepEqual(rendered.data.map(row => row.value), [eligible.length, respondents.length, applications.length]);
  assert(rendered.tooltipExample.includes('autodeclarada') && rendered.tooltipExample.includes('não comprova emprego'));
  const people = [...new Set(respondents.map(row => row.professionalId))];
  const selected = summarizeInstitutional(selectInstitutionalScope(baseScope, { professionalIds: people }));
  assert.equal(selected.costPerIdentifiedParticipantCents, null, 'a selected person cohort has no allocated-cost denominator');
  await chart('institutional-followup', 'bar', 1); await expect(page.getByLabel('Limpar seleção de profissionais')).toBeVisible();
  await expect(kpi('institutionalParticipants')).toHaveText(num(selected.distinctParticipants));
  await expect(kpi('institutionalExecution')).toHaveText(money(baseInstitutionalMetrics.executedCents));
  await expect(kpi('institutionalCowork')).toHaveText(percentage(baseInstitutionalMetrics.coworkOccupancy));
  const programs = await chart('institutional-programs'); assert(programs.tooltipExample.includes('não é custo desta coorte'));
  await page.getByLabel('Limpar seleção de profissionais').click(); await settle();
  await expect(kpi('institutionalParticipants')).toHaveText(num(baseInstitutionalMetrics.distinctParticipants));
});

await test('Institutional geography and time operate on demonstrative facts while the official 2025 scorecard remains statewide', async () => {
  await prepare(); const published = await page.locator('.r6-published').innerText();
  await select('Município', ['Campinas']); await page.getByLabel('Período interno').selectOption('3'); await settle();
  const cityId = dataset.cities.find(city => city.name === 'Campinas').id;
  const metrics = summarizeInstitutional(selectInstitutionalScope(selectScope(dataset, { ...defaultFilters, cityIds: [cityId], period: 3 })));
  await expect(kpi('institutionalExecution')).toHaveText(money(metrics.executedCents));
  await expect(kpi('institutionalParticipants')).toHaveText(num(metrics.distinctParticipants));
  assert.equal(await page.locator('.r6-published').innerText(), published);
  await page.getByLabel('Perfil demonstrativo').selectOption('regional'); await settle();
  const regional = summarizeInstitutional(selectInstitutionalScope(selectScope(dataset, { ...currentFilters(), greIds: ['GRE2'] })));
  await expect(kpi('institutionalParticipants')).toHaveText(num(regional.distinctParticipants));
  await expect(kpi('institutionalExecution')).toHaveText('Restrito');
  assert.equal(await page.locator('.r6-published').innerText(), published);
});

await test('CNAE, company size and company subset do not falsely filter institutional budgets or audience', async () => {
  await prepare('market'); await select('Porte', ['Grande empresa']);
  const code = dataset.cnaes.find(row => dataset.establishments.some(establishment => establishment.cnaeMain === row.code))?.code ?? dataset.cnaes[0].code;
  const cnae = dataset.cnaes.find(row => row.code === code);
  await select('CNAE', [`${cnae.code} · ${cnae.label}`]); await nav('overview');
  await expect(kpi('institutionalExecution')).toHaveText(money(baseInstitutionalMetrics.executedCents));
  await expect(kpi('institutionalParticipants')).toHaveText(num(baseInstitutionalMetrics.distinctParticipants));
  const metrics = summarizeInstitutional(selectInstitutionalScope(selectScope(dataset, currentFilters())));
  assert.equal(metrics.executedCents, baseInstitutionalMetrics.executedCents);
  assert.equal(await page.getByRole('heading', { name: 'Nenhuma empresa neste recorte' }).count(), 0);
});

await test('Institutional viewer hides financial indicators and every program and cowork tooltip amount', async () => {
  await prepare(); await page.getByLabel('Perfil demonstrativo').selectOption('viewer'); await settle();
  await expect(kpi('institutionalExecution')).toHaveText('Restrito'); await expect(page.getByLabel('Exportar dados do recorte')).toBeDisabled();
  const programs = await chart('institutional-programs'), coworkers = await chart('institutional-coworks'), territories = await chart('institutional-territory');
  assert.deepEqual(programs.series.map(row => row.name), ['Inscrições', 'Presenças', 'Pessoas únicas']);
  for (const info of [programs, coworkers, territories]) assert(!info.tooltipExample || !/R\$|Plano:|gasto:|Custo por hora/i.test(info.tooltipExample), 'a restricted tooltip must not expose BRL amounts');
  assert.equal(programs.yAxes[0].name, 'Ocorrências'); assert(territories.yAxes[0].name.includes('Público'));
});

await test('Institutional drillthrough separates activities, follow-ups and service requests with real search and pagination', async () => {
  await prepare(); await records();
  const table = page.locator('#institutional-list');
  const count = async () => parseNumber(await table.locator('.p-count').textContent());
  assert.deepEqual(await table.getByRole('tablist', { name: 'Unidades de contagem da avaliação' }).getByRole('tab').allTextContents(), ['Atividades', 'Acompanhamentos', 'Solicitações']);
  await expect.poll(count).toBe(baseInstitutional.activities.length); assert.equal(await table.locator('tbody tr').count(), 20);
  const first = await table.locator('tbody tr').first().textContent();
  await page.getByLabel('Próxima página de registros institucionais').click();
  assert.notEqual(await table.locator('tbody tr').first().textContent(), first);
  const activity = baseInstitutional.activities.find(row => row.programId === 'formacao');
  await page.getByLabel('Pesquisar registros da avaliação institucional').fill(activity.id); await expect.poll(count).toBe(1);
  const csv = await download(() => page.getByLabel('Exportar registros institucionais CSV').click());
  const rows = parseCSV(csv.text); assert.equal(rows.length - 1, 1); assert(rows[1].includes(activity.id));
  assert(rows[0].includes('Custo da ação')); assert(!rows[0].some(header => /orçamento total|gasto territorial|executado/i.test(header)));
  assert.equal(Number(rows[1][rows[0].indexOf('Custo da ação')]), activity.costCents / 100);
  await page.getByLabel('Limpar pesquisa institucional').click(); await expect.poll(count).toBe(baseInstitutional.activities.length);
  await table.getByRole('tab', { name: 'Acompanhamentos', exact: true }).click(); await expect.poll(count).toBe(baseInstitutional.followups.length);
  const followupCsv = await download(() => page.getByLabel('Exportar registros institucionais CSV').click());
  assert.equal(parseCSV(followupCsv.text).length - 1, baseInstitutional.followups.length);
  await table.getByRole('tab', { name: 'Solicitações', exact: true }).click(); await expect.poll(count).toBe(baseInstitutional.serviceRequests.length);
  assert.equal(await table.getByRole('button', { name: /Encaminhar|Concluir|Atualizar status|Distribuir|Classificar/ }).count(), 0);
  await page.getByLabel('Pesquisar registros da avaliação institucional').fill('INSTITUCIONAL-INEXISTENTE-99999');
  await expect(page.getByRole('heading', { name: 'Nenhum registro deste tipo no recorte' })).toBeVisible();
  await table.getByRole('button', { name: 'Limpar pesquisa', exact: true }).click(); await expect.poll(count).toBe(baseInstitutional.serviceRequests.length);
});

await test('Activity drillthrough selects its source records and keeps unallocated institutional budget fixed', async () => {
  await prepare(); await records();
  const activity = baseInstitutional.activities.find(row => row.programId === 'formacao');
  await page.getByLabel('Pesquisar registros da avaliação institucional').fill(activity.id);
  await page.locator('#institutional-list tbody .p-company-link').first().click(); await closeDialogs(); await settle();
  await expect(page.getByLabel('Limpar seleção institucional')).toBeVisible();
  const scoped = selectInstitutionalScope(baseScope, { activityIds: [activity.id] }), summary = summarizeInstitutional(scoped);
  assert.equal(summary.costPerIdentifiedParticipantCents, null);
  await expect(kpi('institutionalParticipants')).toHaveText(num(summary.distinctParticipants));
  await expect(kpi('institutionalExecution')).toHaveText(money(baseInstitutionalMetrics.executedCents));
  await records(); await expect(page.locator('#institutional-list .p-count')).toHaveText('1');
  await expect(page.locator('#institutional-list tbody')).toContainText(activity.id);
  await closeDialogs(); await page.getByLabel('Limpar seleção institucional').click(); await settle();
  await expect(kpi('institutionalParticipants')).toHaveText(num(baseInstitutionalMetrics.distinctParticipants));
});

await test('Institutional records lead to an identified participant profile and an explicitly related company', async () => {
  await prepare();
  const connectedPeople = new Set(basePeople.activeLinks.map(row => row.professionalId));
  const followup = baseInstitutional.followups.find(row => connectedPeople.has(row.professionalId));
  assert(followup, 'a follow-up must refer to a real demonstrative profile with a technical relation');
  const professional = basePeople.profiles.find(row => row.id === followup.professionalId);
  await records(); await page.getByRole('tab', { name: 'Acompanhamentos', exact: true }).click();
  await page.getByLabel('Pesquisar registros da avaliação institucional').fill(followup.id);
  await expect(page.locator('#institutional-list .p-count')).toHaveText('1');
  await page.locator('#institutional-list tbody .p-company-link').filter({ hasText: professional.name }).click();
  await page.getByRole('dialog', { name: professional.name, exact: true }).waitFor();
  await page.getByRole('tab', { name: 'Relações', exact: true }).click();
  const companyId = basePeople.activeLinks.find(row => row.professionalId === professional.id).companyId;
  const company = dataset.companies.find(row => row.id === companyId);
  await page.getByRole('tabpanel').getByRole('button', { name: company.name, exact: true }).first().click();
  await page.getByLabel('Detalhes da empresa').waitFor();
  assert.equal(await page.getByLabel('Detalhes da empresa').locator('option[value="inspection"]').count(), 0);
  await closeDialogs(); await expect(page.locator('.r5-app')).toHaveAttribute('data-page', 'overview');
});

await test('Advanced service category segmentation updates historical demand, SLA and corresponding read-only source requests', async () => {
  await prepare(); await page.getByLabel('Mais segmentações').click();
  await select('Categoria do serviço', ['Orientação sobre ART']);
  await page.getByRole('button', { name: 'Voltar ao relatório', exact: true }).click(); await settle();
  const scope = selectInstitutionalScope(baseScope, { serviceCategories: ['Orientação sobre ART'] });
  const summary = summarizeInstitutional(scope), rows = buildInstitutionalServiceAnalysis(scope), rendered = await chart('institutional-services');
  await expect(kpi('institutionalServiceSla')).toHaveText(percentage(summary.matureServiceOnTimeRate));
  assert.deepEqual(rendered.series[0].data, rows.map(row => row.requests));
  await expect(kpi('institutionalExecution')).toHaveText(money(baseInstitutionalMetrics.executedCents));
  await records(); await expect(page.locator('#institutional-list .p-count')).toHaveText(num(scope.serviceRequests.length));
  await expect(page.getByRole('tab', { name: 'Solicitações', exact: true })).toHaveAttribute('aria-selected', 'true');
  await closeDialogs(); await page.getByLabel('Limpar seleção institucional').click(); await settle();
  await expect(kpi('institutionalServiceSla')).toHaveText(percentage(baseInstitutionalMetrics.matureServiceOnTimeRate));
});

await test('Institutional header exports selected source rows and respects regional and viewer export permissions', async () => {
  await prepare(); await select('Programa', ['Formação e eventos']);
  const scope = selectInstitutionalScope(baseScope, { programIds: ['formacao'] });
  const exported = await download(() => page.getByLabel('Exportar dados do recorte').click());
  assert.equal(exported.text, exportInstitutionalCsv(scope, { export: true, financial: true }));
  assert.equal(parseCSV(exported.text).length - 1, scope.activities.length);
  await page.getByLabel('Perfil demonstrativo').selectOption('regional'); await settle();
  const regionalScope = selectInstitutionalScope(selectScope(dataset, { ...defaultFilters, greIds: ['GRE2'] }), { programIds: ['formacao'] });
  const regional = await download(() => page.getByLabel('Exportar dados do recorte').click());
  assert.equal(regional.text, exportInstitutionalCsv(regionalScope, { export: true, financial: false }));
  assert(!parseCSV(regional.text)[0].some(header => /custo|saldo|valor|BRL|R\$/i.test(header)));
  await records(); assert.equal(await page.locator('#institutional-list').getByRole('button', { name: 'Ordenar custo da ação' }).count(), 0);
  await closeDialogs(); await page.getByLabel('Perfil demonstrativo').selectOption('viewer'); await settle(); await records();
  await expect(page.getByLabel('Exportar registros institucionais CSV')).toBeDisabled();
});

await test('Institutional KPI explanations and source metadata distinguish declared public deliveries from synthetic outcomes', async () => {
  await prepare();
  const titles = await page.locator('.r5-kpi-label').allTextContents();
  for (const title of titles) {
    await page.getByLabel(`Definição de ${title}`, { exact: true }).click();
    await page.getByRole('dialog', { name: 'Transparência da análise' }).waitFor();
    assert(await page.locator('.p-formula').count() > 0, `${title}: indicator definition must provide a formula`);
    await closeDialogs();
  }
  await page.getByLabel('Fontes e metodologia').click(); await page.getByRole('dialog', { name: 'Transparência da análise' }).waitFor();
  const dialog = page.getByRole('dialog', { name: 'Transparência da análise' });
  await expect(dialog).toContainText('2025'); await expect(dialog).toContainText('CREA-SP');
  const hrefs = await dialog.getByRole('link').evaluateAll(rows => rows.map(row => row.getAttribute('href')));
  const metadata = JSON.parse(await dialog.locator('.p-source-json').textContent());
  assert.equal(metadata.creaspPublishedManagement2025.sourceUrl, management.metadata.sourceUrl);
  assert.equal(metadata.creaspPublishedManagement2025.sourceSha256, management.metadata.sourceSha256);
  assert.equal(metadata.institutionalDemonstration.synthetic, true);
  const local = hrefs.filter(href => href?.startsWith('/docs/'));
  const documents = await Promise.all(local.map(async href => {
    const response = await context.request.get(new URL(href, baseURL).href);
    return { href, status: response.status(), text: await response.text() };
  }));
  for (const document of documents) {
    assert.equal(document.status, 200, document.href);
    assert(document.text.trimStart().startsWith('#'), `${document.href}: a source document must serve Markdown instead of an SPA fallback`);
  }
});

await test('Statewide São Paulo municipal map reconciles aggregate employment and ignores nominal company size when showing jobs', async () => {
  await prepare('market');
  const map = page.locator('main .p-map .p-chart-canvas'); await expect(map).toHaveCount(1);
  const panel = await map.evaluate(element => element.closest('[data-panel]').dataset.panel);
  const observed = await chart(panel); assert.equal(observed.type, 'map'); assert.equal(observed.mapRegionCount, 645);
  const latest = baseScope.employment.map(row => row.month).sort().at(-1);
  const jobs = Object.fromEntries(dataset.cities.map(city => [city.name, baseScope.employment.filter(row => row.cityId === city.id && row.month === latest).reduce((sum, row) => sum + row.stock, 0)]).filter(([, value]) => value > 0));
  // ECharts expands map data to every polygon. Unsampled municipalities retain undefined values.
  const supplied = rows => rows.filter(row => Number.isFinite(row.value));
  assert.equal(supplied(observed.data).length, Object.keys(jobs).length);
  assert.deepEqual(Object.fromEntries(supplied(observed.data).map(row => [row.name, row.value])), jobs);
  assert.equal(supplied(observed.data).reduce((sum, row) => sum + row.value, 0), baseMetrics.employees);
  await select('Porte', ['Grande empresa']); await expect(kpi('employees')).toHaveText(num(baseMetrics.employees));
  assert.deepEqual(Object.fromEntries(supplied((await chart(panel)).data).map(row => [row.name, row.value])), jobs);
  await chart(panel, 'map', 'Campinas'); const cityId = dataset.cities.find(city => city.name === 'Campinas').id;
  await expect.poll(() => currentFilters().cityIds).toEqual([cityId]);
  await expect(kpi('employees')).toHaveText(num(jobs.Campinas));
  await assertScopeCount(selectScope(dataset, { ...defaultFilters, cityIds: [cityId], sizes: ['Grande empresa'] }).companies.length);
  await clear();
  for (const [width, height] of [[1920, 1080], [1366, 768]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(600); await chartReady();
    await page.screenshot({ path: `${output}/market-${width}.png` });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
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
  await nav('companies'); await records(); await page.locator('#company-list .p-company-link').first().click(); await page.getByLabel('Detalhes da empresa').waitFor();
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
