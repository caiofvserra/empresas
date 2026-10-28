import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { dataset } from '../src/domain/dataset.ts';
import { defaultFilters } from '../src/domain/types.ts';
import { reportDomains } from '../src/domain/report-architecture.ts';
import { classifyContract, makeSeries, previousWindow, selectScope, summarize, windowBounds } from '../src/domain/engine.ts';
import { buildCrossBaseRows } from '../src/domain/cross-base.ts';
import { buildProfessionalModel, selectProfessionalScope, summarizeProfessionals } from '../src/domain/professionals.ts';

const output = process.env.QA_OUTPUT || resolve('test-results/browser-v4');
const baseURL = process.env.QA_URL || 'http://127.0.0.1:5173/';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
await context.addInitScript(() => performance.setResourceTimingBufferSize(5000));
const page = await context.newPage();
page.setDefaultTimeout(12000);
const errors = [], httpFailures = [], results = [], perspectivesChecked = [], layouts = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('response', response => { if (response.status() >= 400) httpFailures.push({ url: response.url(), status: response.status() }); });
const baseScope = selectScope(dataset, defaultFilters);
const baseMetrics = summarize(baseScope);
const professionalModel = buildProfessionalModel(dataset);
const baseProfessionalScope = selectProfessionalScope(baseScope);
const baseProfessionalMetrics = summarizeProfessionals(baseProfessionalScope);
const format = value => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const parseNumber = value => Number(value.replace(/[^\d-]/g, ''));
const currentFilters = () => JSON.parse(new URL(page.url()).searchParams.get('f'));
const count = async () => parseNumber(await page.locator('.p-scope-count').textContent());
const tableCount = async () => parseNumber(await page.locator('#company-list .p-count').textContent());
const professionalCount = async () => parseNumber(await page.locator('#professional-list .p-count').textContent());
const visibleKpi = async id => { const elements = page.locator(`[data-metric="${id}"] .p-kpi-value`); for (const el of await elements.all()) if (await el.isVisible()) return (await el.textContent()).trim(); throw new Error(`Visible KPI missing: ${id}`); };
const equalCount = async (expected, message) => expect.poll(count, { message }).toBe(expected);
const equalProfessionalCount = async expected => expect.poll(professionalCount).toBe(expected);
const settle = async () => { await page.locator('.p-loading').filter({ hasText: 'Atualizando indicadores' }).waitFor({ state: 'hidden' }); await page.waitForTimeout(180); };
const chartReady = async () => { for (const host of await page.locator('main .p-chart-canvas').all()) if (await host.isVisible()) { await host.locator('svg').waitFor(); await expect(host).toHaveAttribute('aria-busy', 'false'); } };
const nav = async title => { await page.locator('.p-page-rail').getByRole('button', { name: title, exact: true }).click(); await expect(page.getByRole('heading', { level: 1 })).toHaveText(title); await settle(); };
const perspective = async value => { await page.getByLabel('Análise do domínio', { exact: true }).selectOption(value); await settle(); await expect(page.locator('.platform')).toHaveAttribute('data-page', value.split(':')[0]); await expect(page.locator('.platform')).toHaveAttribute('data-view', value.split(':')[1]); await chartReady(); };
const closeDialogs = async () => { for (let i = 0; i < 5 && await page.getByRole('dialog').count(); i++) await page.keyboard.press('Escape'); };
const clear = async () => { await closeDialogs(); await page.getByLabel('Perfil demonstrativo', { exact: true }).selectOption('admin'); await page.getByLabel('Comparar período anterior', { exact: true }).uncheck(); await page.getByRole('button', { name: 'Limpar todos os filtros', exact: true }).click(); await settle(); await expect.poll(currentFilters).toEqual(defaultFilters); };
const prepare = async (domain = 'Visão geral', lens) => { await closeDialogs(); await nav('Visão geral'); await clear(); await perspective('overview:panorama'); if (domain !== 'Visão geral') await nav(domain); if (lens) await perspective(lens); };
const explore = async () => { await page.getByRole('button', { name: 'Explorar recorte', exact: true }).click(); await page.getByRole('dialog', { name: 'Explorar recorte', exact: true }).waitFor(); await page.locator('#company-list').waitFor(); };
const exploreProfessionals = async () => { await page.getByRole('button', { name: 'Explorar profissionais', exact: true }).click(); await page.getByRole('dialog', { name: 'Explorar profissionais', exact: true }).waitFor(); };
const select = async (label, values) => {
  await page.getByRole('button', { name: `Filtrar ${label}`, exact: true }).click();
  const menu = page.locator('.p-multiselect-menu').filter({ has: page.getByLabel(`Pesquisar ${label}`, { exact: true }) });
  for (const value of values) { const checkbox = menu.getByRole('checkbox', { name: value, exact: true }); if (!await checkbox.isChecked()) await checkbox.click(); await expect(checkbox).toBeChecked(); await settle(); }
  await menu.getByRole('button', { name: 'Aplicar seleção' }).click(); await settle();
};
const test = async (name, action) => {
  const started = Date.now();
  try { await closeDialogs(); await action(); results.push({ name, status: 'passed', milliseconds: Date.now() - started }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, status: 'failed', message: error.message, milliseconds: Date.now() - started }); console.error(`FAIL ${name}: ${error.message}`); if (errors.length) console.error(`Runtime errors: ${JSON.stringify(errors)}`); await page.screenshot({ path: `${output}/failure-${results.length}.png` }).catch(() => {}); }
};
function parseCSV(text) {
  return text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean).map(line => {
    const cells = []; let cell = '', quoted = false;
    for (let index = 0; index < line.length; index++) { if (line[index] === '"') { if (quoted && line[index + 1] === '"') { cell += '"'; index++; } else quoted = !quoted; } else if (line[index] === ';' && !quoted) { cells.push(cell); cell = ''; } else cell += line[index]; }
    cells.push(cell); return cells;
  });
}
const download = async trigger => { const event = page.waitForEvent('download'); await trigger(); const file = await event; return { filename: file.suggestedFilename(), rows: parseCSV(await readFile(await file.path(), 'utf8')) }; };
const chart = async (label, mode = 'read', index = 0) => {
  const host = page.getByRole('img', { name: label, exact: true });
  await host.scrollIntoViewIfNeeded(); await host.locator('svg').waitFor(); await page.waitForTimeout(220);
  const info = await host.evaluate(async (el, { mode, index }) => {
    const url = performance.getEntriesByType('resource').map(row => row.name).find(name => name.includes('/deps/echarts_core.js')) || performance.getEntriesByType('resource').map(row => row.name).find(name => name.includes('/deps/echarts.js'));
    if (!url) throw new Error('ECharts module URL not found');
    const echarts = await import(url); const instance = echarts.getInstanceByDom(el);
    if (!instance) throw new Error('ECharts instance missing');
    const option = instance.getOption(), series = option.series[0];
    let point, dataIndex = index;
    if (mode === 'bar') { if (!series.data[dataIndex] || !Number(series.data[dataIndex]?.value ?? series.data[dataIndex])) dataIndex = series.data.findIndex(row => Number(row?.value ?? row) > 0); point = instance.convertToPixel({ seriesIndex: 0 }, [Number(series.data[dataIndex]?.value ?? series.data[dataIndex]) / 2, dataIndex]); }
    if (mode === 'map') { const region = instance.getModel().getSeriesByIndex(0).coordinateSystem.getRegion(index); if (!region) throw new Error(`Municipal region missing: ${index}`); point = instance.convertToPixel({ seriesIndex: 0 }, region.getCenter()); }
    if (mode === 'heatmap') { if (!series.data[dataIndex]?.[2]) dataIndex = series.data.findIndex(row => row[2] > 0); point = instance.convertToPixel({ seriesIndex: 0 }, series.data[dataIndex].slice(0, 2)); }
    if (mode === 'scatter') { const value = series.data[dataIndex]?.value ?? series.data[dataIndex]; point = instance.convertToPixel({ seriesIndex: 0 }, value.slice(0, 2)); }
    if (mode === 'item') { const graphic = instance.getModel().getSeriesByIndex(0).getData().getItemGraphicEl(dataIndex); if (!graphic) throw new Error('Chart item graphic missing'); const box = graphic.getBoundingRect(); point = graphic.transformCoordToGlobal(box.x + box.width / 2, box.y + box.height / 2); }
    const rect = el.getBoundingClientRect();
    return { type: series.type, data: series.data, links: series.links, series: option.series.map(row => ({ name: row.name, type: row.type, data: row.data, links: row.links })), labels: option.xAxis?.[0]?.data ?? option.yAxis?.[0]?.data, point: point ? { x: rect.x + point[0], y: rect.y + point[1] } : null, dataIndex };
  }, { mode, index });
  if (info.point) { await page.mouse.click(info.point.x, info.point.y); await settle(); }
  return info;
};

await page.goto(baseURL, { waitUntil: 'networkidle' });
await page.getByRole('heading', { level: 1 }).waitFor();

await test('Overview presents exactly three KPIs and three broad linked visualizations', async () => {
  await prepare(); await chartReady(); await equalCount(dataset.companies.length);
  assert.equal(await page.locator('main .p-summary .p-kpi').count(), 3);
  assert.equal(await page.locator('.bi-executive-canvas > .p-panel').count(), 3);
  assert.equal(await page.locator('main .p-chart-canvas').count(), 3);
  assert.equal(await visibleKpi('registeredCompanies'), format(baseMetrics.registeredCompanies));
  assert.equal(await visibleKpi('activeCompanies'), format(baseMetrics.activeCompanies));
  assert.equal(await page.locator('.p-domain-tabs,.bi-insight-list,.p-metric-ribbon').count(), 0);
  assert.equal(await page.locator('#company-list').count(), 0);
});
await test('Six macrodomains and every grouped perspective render without runtime or chart errors', async () => {
  await prepare(); assert.deepEqual(await page.locator('.p-page-rail .p-nav-item').allTextContents(), reportDomains.map(row => row.title));
  for (const domain of reportDomains) {
    await nav(domain.title);
    const choices = await page.getByLabel('Análise do domínio').locator('option').evaluateAll(options => options.map(option => ({ value: option.value, title: option.textContent })));
    for (const choice of choices) {
      await perspective(choice.value); perspectivesChecked.push({ domain: domain.title, ...choice });
      assert.equal(await page.locator('.p-error').count(), 0, choice.value);
      assert((await page.locator('.p-demo').textContent()).includes('DEMONSTRAÇÃO'));
      assert.equal(await page.locator('.p-domain-tabs').count(), 0, choice.value);
      if (domain.id !== 'inspection') {
        const body = await page.locator('main').innerText();
        assert(!/Prioridade diagnóstica|Sinais para investigação|Sinais estratégicos do recorte|Empresas sem RTS vigente identificado|Fila de casos priorizados|Pontuação demonstrativa ≥/.test(body), choice.value);
      }
    }
  }
  assert(perspectivesChecked.length >= 30); assert.equal(errors.length, 0, JSON.stringify(errors));
});
await test('Multiselect unions cities and intersects size while preserving filters across all domains', async () => {
  await prepare('Empresas', 'registry:universo'); await select('Município', ['Campinas', 'São Paulo']);
  const cityIds = dataset.cities.filter(row => ['Campinas', 'São Paulo'].includes(row.name)).map(row => row.id);
  const cities = selectScope(dataset, { ...defaultFilters, cityIds }); await equalCount(cities.companies.length);
  await select('Porte', ['Grande empresa']); const expected = selectScope(dataset, { ...defaultFilters, cityIds, sizes: ['Grande empresa'] });
  assert(expected.companies.length > 0 && expected.companies.length < cities.companies.length); await equalCount(expected.companies.length);
  for (const domain of reportDomains) { await nav(domain.title); await equalCount(expected.companies.length); assert.deepEqual([...currentFilters().cityIds].sort(), [...cityIds].sort()); assert.deepEqual(currentFilters().sizes, ['Grande empresa']); }
  await page.reload({ waitUntil: 'networkidle' }); await equalCount(expected.companies.length); await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fiscalização');
});
await test('A selected company subset intersects new geography and persists through domain navigation', async () => {
  await prepare(); await page.locator('[data-metric="registeredCompanies"] .p-kpi-drill').click(); await settle();
  const ids = [...new Set(baseScope.registrations.map(row => row.companyId))]; await equalCount(ids.length);
  await select('Município', ['Campinas']); const cityId = dataset.cities.find(row => row.name === 'Campinas').id;
  const expected = selectScope(dataset, { ...defaultFilters, cityIds: [cityId] }, ids); await equalCount(expected.companies.length);
  for (const title of ['Empresas', 'Profissionais', 'Mercado e emprego', 'Contratações']) { await nav(title); await equalCount(expected.companies.length); assert.equal(await page.locator('.p-context').count(), 1); }
  await page.getByRole('button', { name: 'Limpar subconjunto', exact: true }).click(); await settle(); await equalCount(selectScope(dataset, { ...defaultFilters, cityIds: [cityId] }).companies.length);
});
await test('Clicking the official IBGE polygon applies a real municipality cross-filter', async () => {
  await prepare(); await chartReady(); const host = page.locator('.bi-executive-territory .p-chart-canvas');
  await chart(await host.getAttribute('aria-label'), 'map', 'Campinas');
  const cityId = dataset.cities.find(row => row.name === 'Campinas').id;
  await expect.poll(() => currentFilters().cityIds).toEqual([cityId]); await equalCount(selectScope(dataset, { ...defaultFilters, cityIds: [cityId] }).companies.length);
});
await test('Regional growth scatter filters GRE while retaining an existing size slicer', async () => {
  await prepare(); await select('Porte', ['Grande empresa']);
  const label = await page.locator('.bi-executive-growth .p-chart-canvas').getAttribute('aria-label'); const selected = await chart(label, 'scatter', 0);
  const greId = selected.data[selected.dataIndex].id; await expect.poll(() => currentFilters().greIds).toEqual([greId]); assert.deepEqual(currentFilters().sizes, ['Grande empresa']);
  await equalCount(selectScope(dataset, { ...defaultFilters, greIds: [greId], sizes: ['Grande empresa'] }).companies.length);
});
await test('CNAE-by-municipality heatmap selects both dimensions and changes the shared scope', async () => {
  await prepare('Mercado e emprego', 'market:matriz'); const label = await page.locator('main .p-chart-canvas').first().getAttribute('aria-label'); await chart(label, 'heatmap');
  const filters = currentFilters(); assert.equal(filters.cityIds.length, 1); assert.equal(filters.cnaeCodes.length, 1); await equalCount(selectScope(dataset, filters).companies.length);
});
await test('The real CNAE catalog retains all 702 classes and the original analysis-required distinction', async () => {
  await prepare('Mercado e emprego'); await page.getByRole('button', { name: 'Filtrar CNAE principal ou secundário' }).click();
  const menu = page.locator('.p-multiselect-menu'); assert((await menu.textContent()).includes('702 opções')); await menu.getByLabel('Pesquisar CNAE principal ou secundário').fill('Passível de obrigação');
  assert.equal(await menu.getByRole('checkbox').count(), 64); assert((await menu.textContent()).includes('Depende de análise')); await page.keyboard.press('Escape');
});
await test('Monthly, quarterly and annual series reconcile and period comparison changes the graph', async () => {
  await prepare('Visão geral', 'overview:movimentacao'); const label = 'Evolução de novos registros, baixas, saldo e base acumulada';
  for (const [name, grain] of [['Mensal', 'month'], ['Trimestral', 'quarter'], ['Anual', 'year']]) {
    await page.locator('[aria-label="Granularidade temporal"]').getByRole('button', { name }).click(); await settle(); const info = await chart(label);
    assert.equal(info.data.length, makeSeries(baseScope, 12, grain).length); assert.equal(info.data.reduce((sum, row) => sum + Number(row.value ?? row), 0), baseMetrics.newRegistrations);
  }
  await page.getByLabel('Comparar período anterior', { exact: true }).check(); await settle();
  const prior = (await chart(label)).series.find(row => row.name === 'Novos · janela anterior'); assert(prior);
  assert.deepEqual(prior.data, makeSeries({ ...baseScope, anchor: windowBounds(12).previousEnd }, 12, 'year').map(row => row.newRegistrations));
  await page.getByLabel('Comparar período anterior', { exact: true }).uncheck(); await page.locator('[aria-label="Granularidade temporal"]').getByRole('button', { name: 'Mensal' }).click();
});
await test('Cross-source comparison is descriptive and its regional detail table is closed by default', async () => {
  await prepare('Visão geral', 'overview:cruzamentos'); const details = page.locator('.bi-crossbase-details'); assert.equal(await details.getAttribute('open'), null);
  await details.locator('summary').click(); const rows = buildCrossBaseRows(baseScope); assert.equal(await page.locator('.bi-crossbase-table tbody tr').count(), rows.length);
  const headings = await page.locator('.bi-crossbase-table th[scope="col"]').allTextContents(); assert.deepEqual(headings, ['GRE', 'Empresas', 'Registradas', 'Empregos', 'Δ emprego', 'Δ registros ativos', 'Valor contratado']);
  for (const row of rows) { const tr = page.locator('.bi-crossbase-table tbody tr').filter({ has: page.getByRole('button', { name: row.label, exact: true }) }); const values = await tr.locator('td').allTextContents(); assert.equal(parseNumber(values[0]), row.companies); assert.equal(parseNumber(values[1]), row.registered); assert.equal(parseNumber(values[2]), row.employment); }
});
await test('Company exploration has working pagination, search, sorting and column selection', async () => {
  await prepare('Empresas'); await explore(); await expect.poll(tableCount).toBe(dataset.companies.length); const table = page.locator('#company-list');
  const first = await table.locator('.p-company-link').allTextContents(); await page.getByRole('button', { name: 'Próxima página', exact: true }).click(); const second = await table.locator('.p-company-link').allTextContents(); assert.notDeepEqual(first, second);
  await table.getByRole('button', { name: 'Empresa / raiz CNPJ', exact: true }).click(); assert.notDeepEqual(await table.locator('.p-company-link').allTextContents(), second);
  await table.getByRole('button', { name: 'Selecionar colunas', exact: true }).click(); await page.locator('.p-columns').getByRole('checkbox', { name: 'Porte', exact: true }).check(); assert.equal(await table.getByRole('columnheader', { name: 'Porte', exact: true }).count(), 1);
  const company = dataset.companies[0]; await page.getByLabel('Pesquisar empresas', { exact: true }).fill(company.name); await expect.poll(tableCount).toBe(1);
  await page.getByLabel('Pesquisar empresas', { exact: true }).fill('EMPRESA-DEMO-INEXISTENTE-000000'); await expect.poll(tableCount).toBe(0); assert((await table.textContent()).includes('Nenhuma empresa neste recorte'));
});
await test('Company CSV exports the selected records with valid CNPJ keys and consistent row counts', async () => {
  await prepare('Empresas'); await select('Município', ['Campinas']); const cityId = dataset.cities.find(row => row.name === 'Campinas').id; const expected = selectScope(dataset, { ...defaultFilters, cityIds: [cityId] });
  const exported = await download(() => page.getByRole('button', { name: 'Exportar recorte', exact: true }).click()); assert.equal(exported.rows.length - 1, expected.establishments.length); assert(exported.rows[0].includes('CNPJ'));
  await explore(); const company = expected.companies[0]; await page.getByLabel('Pesquisar empresas', { exact: true }).fill(company.name);
  const tableExport = await download(() => page.getByRole('button', { name: 'Exportar tabela CSV', exact: true }).click()); assert.equal(tableExport.rows.length - 1, expected.establishments.filter(row => row.companyId === company.id).length);
});
await test('Company detail perspectives remain complete and exclude inspection outside its domain', async () => {
  await prepare('Empresas'); await explore(); await page.locator('#company-list .p-company-link').first().click(); const detail = page.getByLabel('Detalhes da empresa', { exact: true });
  const choices = await detail.locator('option').evaluateAll(options => options.map(option => option.value)); assert.equal(choices.length, 7); assert(!choices.includes('inspection'));
  for (const value of choices) { await detail.selectOption(value); assert((await page.locator('.p-drawer-body').innerText()).trim().length > 0); assert.equal(await page.locator('.p-error').count(), 0); }
  assert.equal(await page.locator('.p-score').count(), 0); assert.equal(await page.getByRole('button', { name: 'Abrir em Fiscalização', exact: true }).count(), 1);
  await page.getByRole('button', { name: 'Abrir em Fiscalização', exact: true }).click(); await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fiscalização'); await expect(page.locator('.p-context')).toHaveCount(1);
  await explore(); await page.locator('#company-list .p-company-link').first().click(); await expect(page.getByLabel('Detalhes da empresa').locator('option[value="inspection"]')).toHaveCount(1);
  await page.getByLabel('Detalhes da empresa').selectOption('inspection'); assert((await page.locator('.p-drawer-body').innerText()).includes('Prioridade diagnóstica'));
  await page.getByRole('button', { name: 'Fechar ficha da empresa', exact: true }).click(); await nav('Empresas'); await explore(); await page.locator('#company-list .p-company-link').first().click(); await expect(page.getByLabel('Detalhes da empresa')).toHaveValue('registry'); assert.equal(await page.locator('.p-score').count(), 0); assert.equal(await page.getByLabel('Detalhes da empresa').locator('option[value="inspection"]').count(), 0);
});
await test('The professional domain uses an independent 600-person universe including unlinked people', async () => {
  await prepare('Profissionais', 'professionals:panorama'); assert.equal(await visibleKpi('professionals'), format(professionalModel.profiles.length)); assert.equal(await visibleKpi('activeProfessionals'), format(baseProfessionalMetrics.activeProfessionals));
  assert.equal(await visibleKpi('newProfessionals'), format(baseProfessionalMetrics.newProfessionals)); assert(baseProfessionalMetrics.withoutActiveLinks > 0); assert(baseProfessionalMetrics.activeProfessionals + baseProfessionalMetrics.interruptedProfessionals + baseProfessionalMetrics.cancelledProfessionals === baseProfessionalMetrics.professionals);
  assert.equal(await page.getByRole('button', { name: 'Explorar recorte', exact: true }).isVisible(), false); assert.equal(await page.getByRole('button', { name: 'Exportar recorte', exact: true }).isVisible(), false);
});
await test('Professional modality and status filters change counts using their own denominator', async () => {
  await prepare('Profissionais', 'professionals:panorama'); const modality = professionalModel.profiles[0].modality;
  await page.getByLabel('Filtrar modalidade profissional', { exact: true }).selectOption(modality); await settle(); let expected = selectProfessionalScope(baseScope, { modalities: [modality] }); assert.equal(await visibleKpi('professionals'), format(expected.profiles.length));
  await page.getByLabel('Filtrar situação profissional', { exact: true }).selectOption('Ativo'); await settle(); expected = selectProfessionalScope(baseScope, { modalities: [modality], statuses: ['Ativo'] }); assert.equal(await visibleKpi('professionals'), format(expected.profiles.length));
  assert.equal(await visibleKpi('activeProfessionals'), format(expected.profiles.length));
});
await test('Professional geography describes domicile while company filters traverse declared relations', async () => {
  await prepare('Profissionais', 'professionals:panorama'); await select('Município', ['Campinas']); const cityId = dataset.cities.find(row => row.name === 'Campinas').id;
  let companyScope = selectScope(dataset, { ...defaultFilters, cityIds: [cityId] }); let expected = selectProfessionalScope(companyScope); assert.equal(await visibleKpi('professionals'), format(expected.profiles.length)); assert(expected.profiles.every(row => row.cityId === cityId));
  await select('Porte', ['Grande empresa']); companyScope = selectScope(dataset, { ...defaultFilters, cityIds: [cityId], sizes: ['Grande empresa'] }); expected = selectProfessionalScope(companyScope); assert.equal(await visibleKpi('professionals'), format(expected.profiles.length)); assert(expected.companyRestricted);
});
await test('Professional exploration searches a real registry number and CSV exports exactly that person', async () => {
  await prepare('Profissionais', 'professionals:panorama'); await exploreProfessionals(); await equalProfessionalCount(baseProfessionalMetrics.professionals);
  const person = professionalModel.profiles[0]; await page.getByLabel('Pesquisar profissionais do recorte').fill(person.registration); await equalProfessionalCount(1);
  const exported = await download(() => page.locator('#professional-list').getByRole('button', { name: 'CSV', exact: true }).click()); assert.equal(exported.rows.length, 2); assert(exported.rows[1].some(cell => cell.includes(person.registration)));
  await page.getByLabel('Pesquisar profissionais do recorte').fill('REGISTRO-DEMO-INEXISTENTE'); await equalProfessionalCount(0); assert.equal(await page.locator('#professional-list').getByRole('button', { name: 'CSV', exact: true }).isDisabled(), true);
});
await test('Professional cohort heatmap selects its actual underlying person subset', async () => {
  await prepare('Profissionais', 'professionals:panorama'); const label = 'Matriz das coortes de entrada profissional no cadastro CREA por ano e modalidade'; const before = await visibleKpi('professionals'); await chart(label, 'heatmap');
  assert.equal(await page.locator('.p-professional-context').count(), 1); assert.notEqual(await visibleKpi('professionals'), before); await exploreProfessionals(); assert.equal(await professionalCount(), parseNumber(await visibleKpi('professionals')));
});
await test('Technical and societal Sankey relations use distinct facts and exclude nominal identity suggestions', async () => {
  await prepare('Profissionais', 'professionals:conexoes'); const rt = await chart('Fluxo de vínculos técnicos entre modalidades profissionais e atividades das empresas'); assert.equal(rt.type, 'sankey'); assert.equal(rt.links.reduce((sum, row) => sum + row.value, 0), baseProfessionalScope.activeLinks.length);
  await page.getByRole('button', { name: 'Sociedade confirmada', exact: true }).click(); await settle(); const qsa = await chart('Fluxo de relações societárias confirmadas entre modalidades e atividades empresariais');
  assert.equal(qsa.links.reduce((sum, row) => sum + row.value, 0), baseProfessionalScope.qsaConfirmed.length); assert(baseProfessionalScope.qsaSuggestions.length > 0); assert((await page.locator('.p-professional-analysis').innerText()).includes('sugestões por nome ficam fora da rede confirmada'));
});
await test('An actual Sankey activity node selects connected companies and professionals together', async () => {
  await prepare('Profissionais', 'professionals:conexoes'); const label = 'Fluxo de vínculos técnicos entre modalidades profissionais e atividades das empresas'; const info = await chart(label); const target = info.data.findIndex(row => /^\d{4}/.test(row.name)); assert(target >= 0); await chart(label, 'item', target);
  await expect(page.locator('.p-context')).toHaveCount(1); await expect(page.locator('.p-professional-context')).toHaveCount(1); assert(await count() > 0 && await count() < dataset.companies.length);
});
await test('Professional ART production counts declared authorship rather than assuming every RT authored an ART', async () => {
  await prepare('Profissionais', 'professionals:producao'); assert.equal(await visibleKpi('linkedArts'), format(baseProfessionalMetrics.linkedArts));
  const info = await chart('Evolução mensal de ARTs com autoria declarada e profissionais autores distintos'); const arts = info.series.find(row => row.name.includes('ART')); assert(arts); assert.equal(arts.data.reduce((sum, value) => sum + Number(value), 0), baseProfessionalMetrics.linkedArts);
  assert((await page.locator('.p-professional-analysis').innerText()).includes('CAT profissional exige sua própria fonte'));
});
await test('Professional drillthrough opens a related company without exposing inspection evidence', async () => {
  await prepare('Profissionais', 'professionals:panorama'); const person = baseProfessionalScope.profiles.find(profile => baseProfessionalScope.activeLinks.some(link => link.professionalId === profile.id)); assert(person);
  await exploreProfessionals(); await page.getByLabel('Pesquisar profissionais do recorte').fill(person.registration); await equalProfessionalCount(1); await page.locator('#professional-list .p-company-link').first().click();
  const drawer = page.locator('.p-professional-drawer'); await expect(drawer).toBeVisible(); await drawer.getByRole('tab', { name: 'Relações', exact: true }).click(); const companyButton = drawer.locator('button.p-company-link').first(); await expect(companyButton).toBeVisible(); await companyButton.click();
  await expect(page.locator('.p-drawer')).toBeVisible(); assert.equal(await page.getByLabel('Detalhes da empresa').locator('option[value="inspection"]').count(), 0);
});
await test('Public employment context changes the professional territorial chart and municipal selection', async () => {
  await prepare('Profissionais', 'professionals:panorama'); await page.getByLabel('Visualização do território profissional').selectOption('employment'); await settle();
  const label = 'Dispersão municipal de profissionais cadastrados e estoque agregado de empregos; não corresponde a vínculo de emprego individual';
  const info = await chart(label); assert.equal(info.type, 'scatter');
  for (const point of info.data) { const city = dataset.cities.find(row => row.name === point.name); assert(city); assert.equal(point.value[0], professionalModel.profiles.filter(profile => profile.cityId === city.id).length); const last = baseScope.employment.map(row => row.month).sort().at(-1); assert.equal(point.value[1], baseScope.employment.filter(row => row.cityId === city.id && row.month === last).reduce((sum, row) => sum + row.stock, 0)); }
  const clicked = await chart(label, 'scatter'); const city = dataset.cities.find(row => row.name === clicked.data[clicked.dataIndex].name); await expect.poll(() => currentFilters().cityIds).toEqual([city.id]);
  const expected = selectProfessionalScope(selectScope(dataset, { ...defaultFilters, cityIds: [city.id] })); assert.equal(await visibleKpi('professionals'), format(expected.profiles.length));
});
await test('Professional period comparison changes entry evidence and adds the actual prior ART series', async () => {
  await prepare('Profissionais', 'professionals:panorama'); await page.getByLabel('Comparar período anterior').check(); await settle(); const previousEntries = professionalModel.profiles.filter(row => previousWindow(row.registeredAt, 12, dataset.snapshotDate)).length; assert((await page.locator('[data-metric="newProfessionals"]').innerText()).includes(`${format(previousEntries)} na janela anterior`));
  await perspective('professionals:producao'); const info = await chart('Evolução mensal de ARTs com autoria declarada e profissionais autores distintos'); const prior = info.series.find(row => row.name === 'ARTs · janela anterior'); assert(prior);
  const expected = selectProfessionalScope({ ...baseScope, anchor: windowBounds(12).previousEnd }); assert.equal(prior.data.reduce((sum, value) => sum + Number(value), 0), expected.arts.length); await page.getByLabel('Comparar período anterior').uncheck();
});
await test('CBO selection filters public aggregated employment without filtering companies or individual professionals', async () => {
  await prepare('Mercado e emprego', 'employment:dinamica'); const code = dataset.cbos[0].code; await page.getByLabel('Selecionar ocupação CBO', { exact: true }).selectOption(code); await settle();
  await equalCount(dataset.companies.length); assert.deepEqual(currentFilters().cboCodes, [code]); assert.equal(await visibleKpi('employees'), format(summarize(selectScope(dataset, { ...defaultFilters, cboCodes: [code] })).employees));
  await nav('Profissionais'); await perspective('professionals:panorama'); assert.equal(await visibleKpi('professionals'), format(baseProfessionalMetrics.professionals));
});
await test('Fiscalization owns object classification, case trajectories and explainable recommendations', async () => {
  await prepare('Fiscalização', 'inspection:evidencias'); assert.equal((await chart('Sankey das transições históricas dos casos de fiscalização, com saídas para sua situação atual')).type, 'sankey');
  assert.equal((await chart('Sankey de categorias publicadas dos contratos e classificações textuais demonstrativas sugeridas')).type, 'sankey');
  await page.getByText('Experimentar as regras de classificação', { exact: true }).click(); const text = 'Manutenção preventiva e corretiva de instalações elétricas'; await page.getByLabel('Objeto da contratação', { exact: true }).fill(text); await page.getByRole('button', { name: 'Classificar objeto', exact: true }).click(); assert((await page.locator('.p-classifier [aria-live="polite"]').textContent()).includes(classifyContract(text).label));
  await page.getByLabel('Objeto da contratação', { exact: true }).fill('Fornecimento de papel e canetas'); await page.getByRole('button', { name: 'Classificar objeto', exact: true }).click(); assert((await page.locator('.p-classifier [aria-live="polite"]').textContent()).includes(classifyContract('Fornecimento de papel e canetas').label));
});
await test('Fiscalization case-phase selection reveals the precise company set behind its history', async () => {
  await prepare('Fiscalização', 'inspection:evidencias'); await page.getByLabel('Investigar fase atual dos casos').selectOption('Encaminhada'); await settle();
  const ids = [...new Set(baseScope.cases.filter(row => row.history.filter(entry => entry.date <= baseScope.anchor).at(-1)?.status === 'Encaminhada').map(row => row.companyId))]; await equalCount(ids.length); assert((await page.locator('.p-context').innerText()).includes('Encaminhada'));
});
await test('Viewer cannot export company or professional records and finance remains restricted', async () => {
  await prepare('Empresas', 'financial:adimplencia'); await page.getByLabel('Perfil demonstrativo').selectOption('viewer'); await expect(page.locator('.p-restricted')).toBeVisible();
  await perspective('registry:universo'); assert.equal(await page.getByRole('button', { name: 'Exportar recorte', exact: true }).isDisabled(), true); await explore(); assert.equal(await page.getByRole('button', { name: 'Exportar tabela CSV', exact: true }).isDisabled(), true); await page.keyboard.press('Escape');
  await nav('Profissionais'); await perspective('professionals:panorama'); await exploreProfessionals(); assert.equal(await page.locator('#professional-list').getByRole('button', { name: 'CSV', exact: true }).isDisabled(), true);
});
await test('Regional access locks the permitted GRE and hides financial company details', async () => {
  await prepare('Empresas', 'registry:universo'); await page.getByLabel('Perfil demonstrativo').selectOption('regional'); await settle(); await equalCount(selectScope(dataset, { ...defaultFilters, greIds: ['GRE2'] }).companies.length);
  await explore(); await page.locator('#company-list .p-company-link').first().click(); await page.getByLabel('Detalhes da empresa').selectOption('financial'); assert((await page.locator('.p-drawer-body').innerText()).includes('restrit'));
});
await test('Advanced global filters trap focus, restore it and correctly change the analytical scope', async () => {
  await prepare(); await page.getByRole('button', { name: 'Mais filtros', exact: true }).click(); const dialog = page.getByRole('dialog', { name: 'Filtros avançados', exact: true });
  const close = dialog.getByRole('button', { name: 'Fechar filtros avançados', exact: true }); await expect(close).toBeFocused(); await close.press('Shift+Tab'); await expect(dialog.getByRole('button', { name: 'Voltar à análise', exact: true })).toBeFocused();
  await select('Situação Receita', ['Ativa']); await dialog.getByRole('button', { name: 'Voltar à análise', exact: true }).click(); await settle(); await expect(page.getByRole('button', { name: 'Mais filtros', exact: true })).toBeFocused(); await equalCount(selectScope(dataset, { ...defaultFilters, rfbStatuses: ['Ativa'] }).companies.length);
});
await test('Global search supports complete CNPJ keys and recovers from a genuine empty state', async () => {
  await prepare(); const establishment = dataset.establishments[0]; await page.getByRole('button', { name: 'Mais filtros', exact: true }).click(); await page.getByLabel('Busca global por CNPJ ou razão social').fill(establishment.cnpj); await page.getByRole('button', { name: 'Voltar à análise', exact: true }).click(); await settle(); await equalCount(1);
  await page.getByRole('button', { name: 'Mais filtros', exact: true }).click(); await page.getByLabel('Busca global por CNPJ ou razão social').fill('CNPJ-SEM-CORRESPONDENCIA-XXXX'); await page.getByRole('button', { name: 'Voltar à análise', exact: true }).click(); await settle(); await equalCount(0); assert((await page.locator('.p-report-stage').innerText()).includes('O recorte não possui empresas'));
  await page.getByRole('button', { name: 'Limpar filtros e subconjunto', exact: true }).click(); await settle(); await equalCount(dataset.companies.length);
});
await test('Indicator definitions, source documentation and the audit history remain accessible', async () => {
  await prepare(); await page.getByRole('button', { name: 'Definição de Empresas localizadas no CREA', exact: true }).click(); const dialog = page.getByRole('dialog'); const formula = await dialog.locator('.p-formula').innerText();
  for (const label of ['Fórmula', 'Unidade de contagem', 'Fonte', 'Periodicidade', 'Limitações', 'Validação funcional']) assert(formula.includes(label));
  await dialog.getByRole('button', { name: 'Acesso e auditoria', exact: true }).click(); assert((await dialog.locator('.p-audit').innerText()).includes('Navegação temática'));
  await dialog.getByRole('button', { name: 'Fontes e processamento', exact: true }).click(); for (const link of await dialog.locator('.p-doclinks a').all()) { const href = await link.getAttribute('href'); const response = await context.request.get(new URL(href, baseURL).href); assert.equal(response.status(), 200, href); assert(!(await response.text()).includes('<div id="root">'), href); }
});
await test('Browser history restores domains and maintains their synchronized slicers', async () => {
  await prepare('Empresas'); await select('Município', ['Campinas']); const expected = await count(); await nav('Contratações'); await page.goBack(); await expect(page.getByRole('heading', { level: 1 })).toHaveText('Empresas'); await equalCount(expected); await page.goForward(); await expect(page.getByRole('heading', { level: 1 })).toHaveText('Contratações'); await equalCount(expected);
});
await test('Presentation mode enlarges the analytical canvas and restores its controls', async () => {
  await prepare(); await chartReady(); const initial = await page.locator('.p-report-stage').boundingBox(); await page.getByRole('button', { name: 'Modo apresentação', exact: true }).click(); await expect(page.locator('.bi-presentation')).toHaveCount(1); await page.waitForTimeout(350);
  const enlarged = await page.locator('.p-report-stage').boundingBox(); assert(enlarged.height > initial.height); assert.equal(await page.locator('.p-slicer-strip').isVisible(), false); await page.getByRole('button', { name: 'Sair do modo apresentação', exact: true }).click(); await expect(page.locator('.bi-presentation')).toHaveCount(0); assert.equal(await page.locator('.p-slicer-strip').isVisible(), true);
});
await test('Desktop panorama fits 1920 and 1366 screens, with no horizontal overflow in any domain', async () => {
  await prepare();
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }]) {
    await page.setViewportSize(viewport); await page.waitForTimeout(400); await page.evaluate(() => window.scrollTo(0, 0)); await chartReady();
    const dimensions = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight, footer: document.querySelector('.p-report-footer').getBoundingClientRect().bottom, titleFont: getComputedStyle(document.querySelector('.p-title')).fontSize, chartHeights: [...document.querySelectorAll('main .p-chart-canvas')].map(el => Math.round(el.getBoundingClientRect().height)) })); layouts.push({ viewport, page: 'overview', ...dimensions });
    assert(dimensions.scrollWidth <= dimensions.width + 1, JSON.stringify(dimensions)); assert(dimensions.documentHeight <= dimensions.height + 2, JSON.stringify(dimensions)); assert(dimensions.footer <= dimensions.height + 2, JSON.stringify(dimensions)); assert(parseFloat(dimensions.titleFont) >= 24); assert(dimensions.chartHeights.every(height => height >= 200), JSON.stringify(dimensions));
    await page.screenshot({ path: `${output}/overview-${viewport.width}.png` });
    for (const domain of reportDomains) { await nav(domain.title); if (domain.id === 'professionals') await perspective('professionals:panorama'); const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth })); assert(width.scroll <= width.viewport + 1, `${domain.title} ${JSON.stringify(width)}`); }
    await nav('Visão geral'); await perspective('overview:panorama');
  }
  await page.setViewportSize({ width: 1920, height: 1080 }); await nav('Profissionais'); await perspective('professionals:conexoes'); await page.screenshot({ path: `${output}/professionals-1920.png` });
});
await test('No browser execution, failed asset, duplicate-row or chart-loading error remains', async () => {
  await prepare(); await chartReady(); await explore(); const names = await page.locator('#company-list .p-company-link').allTextContents(); assert.equal(new Set(names).size, names.length); assert.equal(await page.locator('.p-error').count(), 0);
  assert.equal(errors.length, 0, JSON.stringify(errors)); assert.equal(httpFailures.length, 0, JSON.stringify(httpFailures));
});

const report = { at: new Date().toISOString(), url: baseURL, macrodomains: reportDomains.length, perspectives: perspectivesChecked.length, browser: 'Chromium', viewports: ['1920×1080', '1366×768'], passed: results.filter(row => row.status === 'passed').length, failed: results.filter(row => row.status === 'failed').length, results, perspectivesChecked, layouts, errors, httpFailures };
await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
await browser.close(); console.log(JSON.stringify({ passed: report.passed, failed: report.failed, errors, httpFailures, report: `${output}/report.json` }));
if (report.failed) process.exitCode = 1;
