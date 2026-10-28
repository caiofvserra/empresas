import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { dataset } from '../src/domain/dataset.ts';
import { defaultFilters } from '../src/domain/types.ts';
import { exportCsv, selectScope } from '../src/domain/engine.ts';
import { buildExecutiveCompanyContinuity } from '../src/report/executive-decisions-v8.ts';
import { buildDigitalInspection, exportDigitalInspectionCsv } from '../src/domain/digital-inspection.ts';
import { exportTransparencyCsv, selectTransparencyRows } from '../src/domain/transparency.ts';

// Works against development or compiled preview. Inspect rendered geometry and real
// pointer interactions, with no dependence on ECharts' private development modules.
const output = process.env.QA_OUTPUT || resolve('test-results/visual-v9');
const baseURL = process.env.QA_URL || 'http://127.0.0.1:4173/';
const filter = process.env.QA_FILTER ? new RegExp(process.env.QA_FILTER, 'i') : null;
const reports = [['overview', 'Presidência e resultados'], ['companies', 'Empresas'], ['professionals', 'Profissionais e formação'], ['market', 'Mercado e emprego'], ['contracts', 'Contratações'], ['inspection', 'Fiscalização digital'], ['transparency', 'Transparência']];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
const page = await context.newPage(); page.setDefaultTimeout(12000);
const results = [], layouts = [], paints = [], errors = [], httpFailures = [];
page.on('pageerror', error => errors.push(error.stack ?? error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('response', response => { if (response.status() >= 400) httpFailures.push({ url: response.url(), status: response.status() }); });
const num = value => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const kpi = id => page.locator(`[data-metric="${id}"] strong`);
const settle = async () => { await expect(page.locator('.r5-stage')).toHaveAttribute('aria-busy', 'false'); await page.waitForTimeout(230); };
const ready = async () => {
  if (await page.locator('.r5-app').getAttribute('data-page') === 'transparency') await page.locator('[data-report="transparency"]').waitFor();
  for (const host of await page.locator('main .p-chart-canvas').all()) { await host.locator('svg').waitFor(); await expect(host).toHaveAttribute('aria-busy', 'false'); }
};
const close = async () => { for (let n = 0; n < 6 && await page.getByRole('dialog').count(); n++) await page.keyboard.press('Escape'); };
const nav = async id => { await page.locator('.r5-pages').getByRole('button', { name: reports.find(row => row[0] === id)[1], exact: true }).click(); await expect(page.locator('.r5-app')).toHaveAttribute('data-page', id); await settle(); await ready(); };
const clear = async () => { await close(); await page.getByLabel('Perfil demonstrativo', { exact: true }).selectOption('admin'); if (await page.locator('.r5-app').getAttribute('data-page') === 'transparency') await nav('overview'); await page.getByLabel('Limpar todas as segmentações', { exact: true }).click(); await settle(); await ready(); };
const download = async trigger => { const event = page.waitForEvent('download'); await trigger(); const result = await event; return readFile(await result.path(), 'utf8'); };
const filters = () => JSON.parse(new URL(page.url()).searchParams.get('f'));
const test = async (name, action) => {
  if (filter && !filter.test(name)) return;
  const began = Date.now();
  try { await page.setViewportSize({ width: 1920, height: 1080 }); await page.evaluate(() => scrollTo(0, 0)); await close(); await action(); results.push({ name, status: 'passed', milliseconds: Date.now() - began }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, status: 'failed', message: error.message, milliseconds: Date.now() - began }); console.error(`FAIL ${name}: ${error.message}`); await page.screenshot({ path: `${output}/failure-${results.length}.png` }).catch(() => {}); }
  await writeFile(`${output}/progress.json`, JSON.stringify({ results, errors, httpFailures }, null, 2));
};
const geometry = () => page.evaluate(() => {
  const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
  const nav = rect(document.querySelector('.r5-pages'));
  return { page: document.querySelector('.r5-app').dataset.page, width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight, nav,
    kpis: [...document.querySelectorAll('.r5-kpi')].map(element => ({ id: element.dataset.metric, ...rect(element), number: rect(element.querySelector('strong')) })),
    panels: [...document.querySelectorAll('.r5-panel')].map(element => ({ id: element.dataset.panel, ...rect(element), chart: rect(element.querySelector('.p-chart-canvas')), source: rect(element.querySelector('.r5-panel-source')), heading: rect(element.querySelector('h2')) })),
    catalogContent: [...document.querySelectorAll('[data-catalog-id] button,[data-catalog-id] small,[data-catalog-id] span')].map(rect),
    catalogFooter: document.querySelector('.r8-catalog > footer') ? rect(document.querySelector('.r8-catalog > footer')) : null,
    transparency: document.querySelector('[data-report="transparency"]') ? rect(document.querySelector('[data-report="transparency"]')) : null,
  };
});
const paintEvidence = () => page.evaluate(() => {
  const read = element => { const css = getComputedStyle(element); return { text: element.textContent.trim().slice(0, 90), color: css.color, backgroundColor: css.backgroundColor, backgroundImage: css.backgroundImage, fontSize: css.fontSize, fontWeight: css.fontWeight }; };
  return { page: document.querySelector('.r5-app').dataset.page, header: read(document.querySelector('.r5-top')), heading: read(document.querySelector('.r5-heading')), kpis: [...document.querySelectorAll('.r5-kpi')].map(read),
    panels: [...document.querySelectorAll('.r5-panel')].map(element => ({ id: element.dataset.panel, ...read(element), title: read(element.querySelector('h2')) })),
    chartFills: [...new Set([...document.querySelectorAll('main .p-chart-canvas svg [fill]')].map(element => element.getAttribute('fill')).filter(value => value && value !== 'none'))],
    gradients: [...document.querySelectorAll('main .p-chart-canvas svg linearGradient')].map(element => ({ id: element.id, stops: [...element.querySelectorAll('stop')].map(stop => ({ offset: stop.getAttribute('offset'), color: stop.getAttribute('stop-color') })) })),
    decorationLayers: [...document.querySelectorAll('[aria-hidden="true"]')].filter(element => ['svg', 'DIV'].includes(element.tagName)).length,
  };
});
// Accessibility checks use actual resolved text/background colours, including all
// gradient stops underneath a text node. Decorative SVG paint is recorded visually.
const contrastEvidence = () => page.evaluate(() => {
  const rgba = text => { const values = text.match(/[\d.]+/g)?.map(Number); return values?.length >= 3 ? [...values.slice(0, 3), values[3] ?? 1] : null; };
  const compose = (fg, bg) => fg.slice(0, 3).map((channel, index) => channel * fg[3] + bg[index] * (1 - fg[3]));
  const lum = color => color.slice(0, 3).map(channel => channel / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((total, channel, index) => total + channel * [.2126, .7152, .0722][index], 0);
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05);
  const background = element => {
    const textRect = element.getBoundingClientRect(); const ancestors = []; for (let node = element; node; node = node.parentElement) ancestors.unshift(node);
    let backgrounds = [[255, 255, 255]];
    for (const ancestor of ancestors) { const css = getComputedStyle(ancestor), base = rgba(css.backgroundColor); if (base && base[3]) backgrounds = backgrounds.map(row => compose(base, row));
      const layers = []; let depth = 0, start = 0;
      for (let index = 0; index < css.backgroundImage.length; index++) { const character = css.backgroundImage[index]; if (character === '(') depth++; else if (character === ')') depth--; else if (character === ',' && depth === 0) { layers.push(css.backgroundImage.slice(start, index)); start = index + 1; } }
      layers.push(css.backgroundImage.slice(start));
      for (const layer of layers.reverse()) {
        const matches = [...layer.matchAll(/(rgba?\([^)]+\))(?:\s+(-?[\d.]+)%)?/g)];
        let stops = matches.map(row => rgba(row[1])).filter(Boolean);
        if (layer.trim().startsWith('linear-gradient') && matches.length >= 2) {
          const positioned = matches.map((row, index) => ({ color: rgba(row[1]), position: row[2] === undefined ? index * 100 / (matches.length - 1) : Number(row[2]) }));
          const at = position => {
            if (position <= positioned[0].position) return positioned[0].color;
            if (position >= positioned.at(-1).position) return positioned.at(-1).color;
            for (let index = 1; index < positioned.length; index++) if (position <= positioned[index].position) { const left = positioned[index - 1], right = positioned[index], share = (position - left.position) / (right.position - left.position); return left.color.map((channel, channelIndex) => channel + (right.color[channelIndex] - channel) * share); }
          };
          // Sample the portion actually underneath this text. A parent KPI strip
          // spans five metrics; its brightest stop is not beneath every number.
          let low = 0, high = 100;
          if (!/rgba?\([^)]+\)\s+-?[\d.]+px/.test(layer)) {
            const angle = Number(/^\s*linear-gradient\(\s*(-?[\d.]+)deg/.exec(layer)?.[1] ?? 180) * Math.PI / 180;
            const box = ancestor.getBoundingClientRect(), dx = Math.sin(angle), dy = -Math.cos(angle), length = Math.abs(box.width * dx) + Math.abs(box.height * dy);
            if (length > 0) {
              const xs = [Math.max(box.left, textRect.left), Math.min(box.right, textRect.right)], ys = [Math.max(box.top, textRect.top), Math.min(box.bottom, textRect.bottom)];
              const positions = xs.flatMap(x => ys.map(y => 50 + ((x - box.left - box.width / 2) * dx + (y - box.top - box.height / 2) * dy) / length * 100));
              low = Math.max(0, Math.min(...positions)); high = Math.min(100, Math.max(...positions));
            }
          }
          stops = [at(low), ...positioned.filter(row => row.position >= low && row.position <= high).map(row => row.color), at(high)];
        }
        if (stops.length) { const uniqueStops = [...new Map(stops.map(stop => [stop.join(','), stop])).values()]; const composited = uniqueStops.flatMap(stop => backgrounds.map(row => compose(stop, row))); backgrounds = [...new Map(composited.map(row => [row.map(channel => channel.toFixed(3)).join(','), row])).values()]; }
      }
    }
    return backgrounds;
  };
  return [...document.querySelectorAll('.r5-heading h1,.r5-brand strong,.r5-kpi strong,.r5-panel h2,.r5-pages button[aria-current="page"],.r8-policy h2,.r8-catalog h2')].map(element => {
    const css = getComputedStyle(element), fg = rgba(css.color), size = parseFloat(css.fontSize), large = size >= 24 || size >= 18.66 && Number(css.fontWeight) >= 700;
    const backgrounds = background(element); return { text: element.textContent.trim(), color: css.color, fontSize: size, large, minimumContrast: Math.min(...backgrounds.map(bg => ratio(compose(fg, bg), bg))), backgroundSamples: backgrounds.length, backgrounds: backgrounds.slice(0, 6) };
  });
});

try {
  await page.goto(baseURL, { waitUntil: 'networkidle' }); await page.locator('.r5-app').waitFor(); await clear();
  await test('Seven analytical pages preserve report navigation and explicit demonstration status', async () => {
    assert.deepEqual(await page.locator('.r5-pages button').allTextContents(), reports.map(row => row[1]));
    for (const [id, title] of reports) { await nav(id); await expect(page.getByRole('heading', { level: 1 })).toHaveText(title); assert.equal(await page.locator('main .r5-kpi').count(), 5); if (id !== 'transparency') assert.equal(await page.locator('main .r5-panel').count(), 6); assert.equal(await page.getByRole('button', { name: /Publicar|Encaminhar|Concluir caso|Distribuir casos/i }).count(), 0); }
    await expect(page.locator('.r5-data-badge')).toContainText('FONTES NÃO CONECTADAS');
  });
  await test('Fourteen PC canvases show the complete report without scrolling or overlapping panels', async () => {
    await clear();
    for (const [width, height] of [[1920, 1080], [1366, 768]]) { await page.setViewportSize({ width, height }); for (const [id] of reports) {
      await nav(id); await page.waitForTimeout(400); const row = await geometry(); layouts.push(row);
      assert(row.documentWidth <= width + 1, `${id}: horizontal overflow at ${width}`); assert(row.documentHeight <= height + 1, `${id}: scrolling at ${width}`);
      assert(row.kpis.every(k => k.y >= 0 && k.right <= width + 1 && k.number.right <= k.right + 1 && k.number.bottom <= k.bottom + 1), `${id}: KPI clipped`);
      for (const panel of row.panels) { assert(panel.x >= 0 && panel.right <= width + 1 && panel.y >= 0 && panel.bottom <= row.nav.y + 1, `${id}/${panel.id}: panel clipped`); assert(panel.chart.height >= 100 && panel.chart.bottom <= panel.source.y + 1, `${id}/${panel.id}: chart/provenance compressed`); }
      for (let i = 0; i < row.panels.length; i++) for (let j = i + 1; j < row.panels.length; j++) { const a = row.panels[i], b = row.panels[j]; assert(Math.min(a.right, b.right) - Math.max(a.x, b.x) <= 0 || Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) <= 0, `${id}: panels overlap`); }
      if (id === 'transparency') { assert(row.catalogContent.every(content => content.bottom <= row.catalogFooter.y + 1), 'Catalog informative text is hidden by pagination'); assert(row.transparency.bottom <= row.nav.y + 1); }
      paints.push({ width, height, ...await paintEvidence() }); await page.screenshot({ path: `${output}/${id}-${width}.png` });
    } }
  });
  await test('Twenty-one responsive canvases keep every page within the viewport width', async () => {
    await clear();
    for (const [width, height] of [[1024, 768], [768, 1024], [390, 844]]) { await page.setViewportSize({ width, height }); for (const [id] of reports) { await nav(id); const row = await geometry(); layouts.push(row); assert(row.documentWidth <= width + 1, `${id}: horizontal overflow at ${width}`); if (width === 390) await page.screenshot({ path: `${output}/${id}-390.png`, fullPage: true }); } }
  });
  await test('Resolved heading and KPI text retains accessible contrast across painted surfaces', async () => {
    await clear(); const contrasts = [];
    for (const [id] of reports) { await nav(id); const evidence = await contrastEvidence(); contrasts.push({ page: id, text: evidence }); for (const row of evidence) assert(row.minimumContrast + .015 >= (row.large ? 3 : 4.5), `${id}: “${row.text}” contrast ${row.minimumContrast.toFixed(2)}`); }
    await writeFile(`${output}/contrast.json`, JSON.stringify(contrasts, null, 2));
  });
  await test('GRE segmentations change the model and survive page navigation', async () => {
    await clear(); await nav('overview'); const gre = dataset.gres.find(row => row.id === 'GRE2');
    await page.getByLabel('Filtrar GRE', { exact: true }).click(); const menu = page.getByLabel('Opções de GRE', { exact: true }); await menu.getByLabel('Pesquisar GRE', { exact: true }).fill(gre.name); const checkbox = menu.locator('.p-select-options > label').filter({ has: page.getByText(gre.name, { exact: true }) }).getByRole('checkbox'); await checkbox.click(); await settle(); await expect(checkbox).toBeChecked(); await menu.getByRole('button', { name: 'Aplicar seleção' }).click(); await settle();
    const expected = buildExecutiveCompanyContinuity(selectScope(dataset, { ...defaultFilters, greIds: ['GRE2'] })).total; await expect(kpi('activeCompanies')).toHaveText(num(expected)); assert.deepEqual(filters().greIds, ['GRE2']); await nav('companies'); assert.deepEqual(filters().greIds, ['GRE2']); await nav('overview'); await expect(kpi('activeCompanies')).toHaveText(num(expected)); await clear();
  });
  await test('A real painted bar selects a reconciled subset and opens its company ficha', async () => {
    await clear(); await nav('overview'); const host = page.locator('[data-panel="executive-continuity"] .p-chart-canvas');
    const targets = await host.locator('svg path[fill]').evaluateAll(elements => elements.map(element => { const box = element.getBoundingClientRect(); return { fill: element.getAttribute('fill'), x: box.x, y: box.y, width: box.width, height: box.height }; }).filter(row => row.fill && row.fill !== 'none' && row.width > 8 && row.height >= 9 && row.height <= 24).sort((a, b) => a.y - b.y || a.x - b.x));
    assert(targets.length, 'Rendered horizontal bar missing'); const target = targets[0]; await page.mouse.click(target.x + target.width * .25, target.y + target.height * .5); await settle();
    const selection = page.getByLabel('Limpar seleção de empresas', { exact: true }); await selection.waitFor(); const title = await selection.getAttribute('title'), model = buildExecutiveCompanyContinuity(selectScope(dataset, defaultFilters)); const first = model.rows[0]; assert(title.includes(first.label), title); const expected = title.startsWith('Com RT') ? first.withRtIds.length : first.withoutRtIds.length;
    await page.getByLabel('Ver dados que sustentam o recorte', { exact: true }).click(); await expect(page.locator('#company-list .p-count')).toHaveText(num(expected)); await page.locator('#company-list .p-company-link').first().click(); await page.getByLabel('Detalhes da empresa', { exact: true }).waitFor(); assert.equal(await page.getByLabel('Detalhes da empresa', { exact: true }).locator('option[value="inspection"]').count(), 0); await close();
  });
  await test('Corporate KPI drillthrough and the exact CSV export remain functional', async () => {
    await clear(); await nav('overview'); const scope = selectScope(dataset, defaultFilters), expected = buildExecutiveCompanyContinuity(scope).total;
    assert.equal(await download(() => page.getByLabel('Exportar dados do recorte', { exact: true }).click()), exportCsv(scope, { financial: true, export: true }));
    await page.getByLabel('Selecionar Empresas ativas', { exact: true }).click(); await page.getByLabel('Ver dados que sustentam o recorte', { exact: true }).click(); await expect(page.locator('#company-list .p-count')).toHaveText(num(expected)); await close();
  });
  await test('Digital evidence preserves criteria, source IDs, filtering and exact CSV', async () => {
    await clear(); await nav('inspection'); await page.getByLabel('Abrir evidências da fiscalização digital', { exact: true }).first().click(); const evidence = page.locator('#digital-evidence-list'); await evidence.waitFor(); await evidence.getByLabel('Filtrar regra da fiscalização digital', { exact: true }).selectOption('DIG-04');
    const scope = selectScope(dataset, defaultFilters), digital = buildDigitalInspection(scope), signals = digital.evidenceRows.filter(row => row.ruleId === 'DIG-04'); assert.equal(await download(() => evidence.getByLabel('Exportar evidências digitais CSV', { exact: true }).click()), exportDigitalInspectionCsv(scope, true, [...new Set(signals.map(row => row.companyId))], 'DIG-04', signals.map(row => row.id)));
    await evidence.locator('.p-company-link').first().click(); await page.getByLabel('Detalhes da empresa', { exact: true }).selectOption('inspection'); await expect(page.locator('[data-inspection-evidence="company"]')).toContainText('Correspondência e cobertura das fontes'); await close();
  });
  await test('Transparency catalog preserves private status and indicator 53 formula evidence', async () => {
    await clear(); await nav('transparency'); const rows = selectTransparencyRows(); await expect(page.locator('[data-catalog-count]')).toContainText(`${rows.length} regras`); assert.equal(await download(() => page.getByLabel('Exportar catálogo filtrado CSV', { exact: true }).click()), exportTransparencyCsv(rows, true));
    await page.getByLabel('Próxima página do catálogo', { exact: true }).click(); await expect(page.locator('.r8-catalog > footer')).toContainText('2 /'); await page.getByLabel('Pesquisar catálogo Confea', { exact: true }).fill(rows.find(row => row.code === '53').title); await page.locator('[data-catalog-id="confea-indicator:53"] .r8-row-link').click(); const detail = page.getByRole('dialog', { name: /^Indicador\/dado 53 —/ }); await detail.waitFor(); await expect(detail).toContainText('crea:183'); await expect(detail).toContainText('crea:182'); await expect(detail).toContainText('Não mede por si'); await close();
    await expect(page.locator('[data-metric="publicPreviewStatus"]')).toContainText('Prévia privada'); assert.equal(await page.getByRole('button', { name: /Publicar|Liberar|Compartilhar publicamente/i }).count(), 0);
  });
  await test('Keyboard focus and Escape preserve readable analytical help dialogs', async () => {
    await clear(); await nav('overview'); const button = page.getByLabel('Definição de Empresas ativas', { exact: true }); await button.focus(); await page.keyboard.press('Enter'); await page.getByRole('dialog').waitFor(); await expect(page.getByRole('dialog')).toContainText('Fórmula'); await page.keyboard.press('Escape'); assert.equal(await page.getByRole('dialog').count(), 0);
    const menuButton = page.getByLabel('Filtrar GRE', { exact: true }); await menuButton.focus(); await page.keyboard.press('Enter'); await page.getByLabel('Opções de GRE', { exact: true }).waitFor(); await page.keyboard.press('Escape'); await expect(menuButton).toBeFocused();
  });
  await test('Viewer restrictions still protect financial figures and exports', async () => {
    await clear(); await nav('overview'); await page.getByLabel('Perfil demonstrativo', { exact: true }).selectOption('viewer'); await settle(); await expect(kpi('corporateReceipts')).toHaveText('Restrito'); await expect(page.getByLabel('Exportar dados do recorte', { exact: true })).toBeDisabled(); await nav('transparency'); await expect(page.getByLabel('Exportar catálogo filtrado CSV', { exact: true })).toBeDisabled(); await clear();
  });
  await test('No JavaScript, console or HTTP errors occur during the visual revision', async () => { assert.equal(errors.length, 0, JSON.stringify(errors)); assert.equal(httpFailures.length, 0, JSON.stringify(httpFailures)); });
  const report = { suite: 'visual-v9', at: new Date().toISOString(), baseURL, passed: results.filter(row => row.status === 'passed').length, failed: results.filter(row => row.status === 'failed').length, desktopCanvases: layouts.filter(row => row.width >= 1100).length, responsiveCanvases: layouts.filter(row => row.width < 1100).length, results, layouts, paints, errors, httpFailures };
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify({ passed: report.passed, failed: report.failed, desktopCanvases: report.desktopCanvases, responsiveCanvases: report.responsiveCanvases, errors, httpFailures })); if (report.failed) process.exitCode = 1;
} finally { await browser.close(); }
