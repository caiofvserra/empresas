import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { dataset } from '../src/domain/dataset.ts';
import { defaultFilters } from '../src/domain/types.ts';
import { selectScope, summarize, group, makeSeries, inWindow, isActiveLink, classifyContract, windowBounds } from '../src/domain/engine.ts';

const output = process.env.QA_OUTPUT || resolve('test-results/browser');
const baseURL = process.env.QA_URL || 'http://localhost:5173/';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
await context.addInitScript(() => performance.setResourceTimingBufferSize(5000));
const page = await context.newPage();
page.setDefaultTimeout(10000);
const errors = [], httpFailures = [], results = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('response', response => { if (response.status() >= 400) httpFailures.push({ url: response.url(), status: response.status() }); });
const baseScope = selectScope(dataset, defaultFilters), baseMetrics = summarize(baseScope);
const format = value => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const uniq = rows => [...new Set(rows)];
const parseNumber = value => Number(value.replace(/[^\d-]/g, ''));
const count = async () => parseNumber(await page.locator('.p-scope-count').textContent());
const tableCount = async () => parseNumber(await page.locator('#company-list .p-count').textContent());
const equalTableCount = async (expected, message) => { await expect.poll(tableCount, { timeout: 10000, message }).toBe(expected); };
const explore = async () => { await page.getByRole('button', { name: 'Explorar recorte', exact: true }).click(); await page.getByRole('dialog', { name: 'Explorar recorte', exact: true }).waitFor(); await page.locator('#company-list').waitFor(); };
const advanced = async () => { await page.getByRole('button', { name: 'Mais filtros', exact: true }).click(); await page.getByRole('dialog', { name: 'Filtros avançados', exact: true }).waitFor(); };
const returnToAnalysis = async () => { await page.getByRole('button', { name: 'Voltar à análise', exact: true }).click(); await page.getByRole('dialog', { name: 'Filtros avançados', exact: true }).waitFor({ state: 'hidden' }); await settle(); };
const equalCount = async (expected, message) => { await expect.poll(count, { timeout: 10000, message }).toBe(expected); };
const kpi = async id => (await page.locator(`[data-metric="${id}"] .p-kpi-value`).textContent()).trim();
const nav = async title => { await page.getByRole('button', { name: title, exact: true }).click(); await page.getByRole('heading', { level: 1, name: title, exact: true }).waitFor(); };
const tab = async title => { await page.locator('main > .p-domain-tabs').getByRole('button', { name: title, exact: true }).click(); await settle(); };
const clear = async () => { for (let i = 0; i < 3 && await page.getByRole('dialog').count(); i++) await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Limpar todos os filtros', exact: true }).click(); await settle(); await expect.poll(currentFilters).toEqual(defaultFilters); };
const settle = async () => { await page.locator('.p-loading').filter({ hasText: 'Atualizando indicadores' }).waitFor({ state: 'hidden' }); await page.waitForTimeout(250); };
const select = async (label, values) => {
  await page.getByRole('button', { name: `Filtrar ${label}`, exact: true }).click();
  const menu = page.locator('.p-multiselect-menu').filter({ has: page.getByLabel(`Pesquisar ${label}`, { exact: true }) });
  for (const value of values) { const checkbox = menu.getByRole('checkbox', { name: value, exact: true }); if (!await checkbox.isChecked()) await checkbox.click(); await expect(checkbox).toBeChecked(); await settle(); }
  await menu.getByRole('button', { name: 'Aplicar seleção' }).click();
};
const currentFilters = () => JSON.parse(new URL(page.url()).searchParams.get('f'));
const test = async (name, action) => {
  const started = Date.now();
  try { await page.keyboard.press('Escape'); await action(); results.push({ name, status: 'passed', milliseconds: Date.now() - started }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, status: 'failed', message: error.message, milliseconds: Date.now() - started }); console.error(`FAIL ${name}: ${error.message}`); await page.screenshot({ path: `${output}/failure-${results.length}.png` }).catch(() => {}); }
};
function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  return lines.map(line => { const cells = []; let cell = '', quoted = false; for (let i = 0; i < line.length; i++) { if (line[i] === '"') { if (quoted && line[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; } else if (line[i] === ';' && !quoted) { cells.push(cell); cell = ''; } else cell += line[i]; } cells.push(cell); return cells; });
}
const download = async trigger => { const event = page.waitForEvent('download'); await trigger(); const file = await event; return parseCSV(await readFile(await file.path(), 'utf8')); };
const chart = async (label, mode = 'read', index = 0) => {
  const host = page.getByRole('img', { name: label, exact: true });
  await host.scrollIntoViewIfNeeded(); await host.locator('svg').waitFor(); await page.waitForTimeout(250);
  const info = await host.evaluate(async (el, { mode, index }) => {
    const url = performance.getEntriesByType('resource').map(row => row.name).find(name => name.includes('/deps/echarts_core.js')) || performance.getEntriesByType('resource').map(row => row.name).find(name => name.includes('/deps/echarts.js'));
    if (!url) throw new Error('ECharts module URL not found');
    const echarts = await import(url); const instance = echarts.getInstanceByDom(el);
    if (!instance) throw new Error('ECharts instance missing');
    const option = instance.getOption(); const series = option.series[0];
    let point, dataIndex = index;
    if (mode === 'bar') { if (!series.data[dataIndex] || Number(series.data[dataIndex]?.value ?? series.data[dataIndex]) === 0) dataIndex = series.data.findIndex(row => Number(row?.value ?? row) > 0); const value = Number(series.data[dataIndex]?.value ?? series.data[dataIndex]); point = instance.convertToPixel({ seriesIndex: 0 }, [value / 2, dataIndex]); }
    if (mode === 'map') { const region = instance.getModel().getSeriesByIndex(0).coordinateSystem.getRegion(index); if (!region) throw new Error(`Municipal region missing: ${index}`); point = instance.convertToPixel({ seriesIndex: 0 }, region.getCenter()); }
    if (mode === 'heatmap') { if (!series.data[dataIndex]?.[2]) dataIndex = series.data.findIndex(row => row[2] > 0); point = instance.convertToPixel({ seriesIndex: 0 }, series.data[dataIndex].slice(0, 2)); }
    if (mode === 'scatter') { const value = series.data[dataIndex]?.value ?? series.data[dataIndex]; point = instance.convertToPixel({ seriesIndex: 0 }, value.slice(0, 2)); }
    const rect = el.getBoundingClientRect();
    return { type: series.type, data: series.data, series: option.series.map(row => ({ name: row.name, data: row.data })), labels: option.xAxis?.[0]?.data ?? option.yAxis?.[0]?.data, point: point ? { x: rect.x + point[0], y: rect.y + point[1] } : null, dataIndex };
  }, { mode, index });
  if (info.point) { await page.mouse.click(info.point.x, info.point.y); await settle(); }
  return info;
};

const pages = [
  ['Visão executiva', ['Panorama', 'Evolução cadastral', 'Território e cobertura', 'Cruzamento de bases', 'Composição da base', 'Alertas estratégicos']],
  ['Cadastro empresarial', ['Universo cadastral', 'Movimentação', 'Perfil empresarial', 'Qualidade cadastral']],
  ['CNAE e mercado potencial', ['Cobertura e conciliação', 'CNAE × município', 'Composição setorial', 'Concentração e emprego']],
  ['Fiscalização inteligente', ['Priorização', 'Fluxo operacional', 'Resultados']],
  ['Responsabilidade técnica', ['Vínculos e vigência', 'Modalidades', 'Entradas e encerramentos']],
  ['CAO e acervo operacional', ['Emissões', 'Tramitação', 'Empresas e acervo']],
  ['Financeiro empresarial', ['Adimplência', 'Débitos e atraso', 'Recuperação e parcelamento']],
  ['Emprego e ecossistema', ['Dinâmica do emprego', 'CNAE × CBO', 'Território e crescimento']],
  ['Contratações públicas', ['Panorama', 'Classificação explicável', 'Fornecedores e contratos']],
];
await page.goto(baseURL, { waitUntil: 'networkidle' });
await test('Baseline reconciles 3,000 companies, 3,600 establishments and 4,500 registration records', async () => {
  await clear(); await equalCount(dataset.companies.length);
  assert.equal(await kpi('registeredCompanies'), format(baseMetrics.registeredCompanies));
  assert.equal(await kpi('activeCompanies'), format(baseMetrics.activeCompanies));
  assert.equal(baseMetrics.activeRegistrations + baseMetrics.inactiveRegistrations + baseMetrics.cancelledRegistrations, baseMetrics.registrations);
  assert.equal(baseMetrics.activeCompanies + baseMetrics.inactiveCompanies, baseMetrics.registeredCompanies);
  await nav('Cadastro empresarial'); assert.equal(await kpi('companies'), '3.000'); assert.equal(await kpi('establishments'), '3.600'); assert.equal(await kpi('registrations'), '4.500');
  await nav('Visão executiva'); await page.screenshot({ path: `${output}/overview-1920.png` });
});
await test('All 9 pages and 32 analyses render related charts, tables and demonstration labels', async () => {
  await clear(); let analyses = 0;
  for (const [title, tabs] of pages) {
    await nav(title); await equalCount(dataset.companies.length, title);
    assert((await page.locator('.p-demo').textContent()).includes('DEMONSTRAÇÃO'));
    for (const name of tabs) {
      await tab(name); analyses++;
      assert.equal(await page.locator('main > .p-domain-tabs button[aria-current="page"]').textContent(), name);
      assert((await page.locator('.p-panel-title').count()) > 0, `${title}/${name}`);
      assert.equal(await page.locator('.p-error').count(), 0, `${title}/${name}`);
      assert.equal(await page.locator('#company-list').count(), 0, `Entity table should be contextual: ${title}/${name}`);
      assert.equal(await page.locator('main .p-chart-canvas[aria-busy="true"]').count(), 0, `${title}/${name}`);
      await equalCount(dataset.companies.length, `${title}/${name}`);
    }
  }
  assert.equal(analyses, 32); assert.equal(errors.length, 0, JSON.stringify(errors));
});
await test('Multiselect OR within municipality and AND across dimensions persists on all thematic pages', async () => {
  await clear(); await nav('Cadastro empresarial');
  await select('Município', ['Campinas', 'São Paulo']);
  const cityIds = dataset.cities.filter(row => ['Campinas', 'São Paulo'].includes(row.name)).map(row => row.id);
  const expectedCity = selectScope(dataset, { ...defaultFilters, cityIds }); await equalCount(expectedCity.companies.length);
  await select('Porte', ['Grande empresa']);
  const expected = selectScope(dataset, { ...defaultFilters, cityIds, sizes: ['Grande empresa'] });
  assert(expected.companies.length > 0 && expected.companies.length < expectedCity.companies.length); await equalCount(expected.companies.length);
  for (const [title] of pages) { await nav(title); await equalCount(expected.companies.length, title); assert.deepEqual(currentFilters().cityIds.sort(), cityIds.sort()); }
  await page.reload({ waitUntil: 'networkidle' }); await equalCount(expected.companies.length); assert.equal(await page.getByRole('heading', { level: 1 }).textContent(), 'Contratações públicas');
});
await test('Real 702-code CNAE catalog preserves related versus analysis-required classifications', async () => {
  await clear(); await nav('CNAE e mercado potencial');
  await page.getByRole('button', { name: 'Filtrar CNAE principal ou secundário' }).click();
  const menu = page.locator('.p-multiselect-menu'); assert((await menu.textContent()).includes('702 opções'));
  await menu.getByLabel('Pesquisar CNAE principal ou secundário').fill('Passível de obrigação');
  assert.equal(await menu.getByRole('checkbox').count(), 64); assert((await menu.textContent()).includes('Depende de análise'));
  await page.keyboard.press('Escape');
  const sampleCode = dataset.establishments.find(row => row.cnaeSecondary.length)?.cnaeSecondary[0]; const record = dataset.cnaes.find(row => row.code === sampleCode);
  await page.getByRole('button', { name: 'Filtrar CNAE principal ou secundário' }).click();
  await page.getByLabel('Pesquisar CNAE principal ou secundário').fill(sampleCode);
  await page.locator('.p-multiselect-menu').getByRole('checkbox').first().click(); await expect(page.locator('.p-multiselect-menu').getByRole('checkbox').first()).toBeChecked(); await page.locator('.p-multiselect-menu').getByRole('button', { name: 'Aplicar seleção' }).click(); await settle();
  await equalCount(selectScope(dataset, { ...defaultFilters, cnaeCodes: [sampleCode] }).companies.length); assert(currentFilters().cnaeCodes.includes(sampleCode)); assert(record);
});
await test('Movement windows change event counts without changing stock; monthly, quarterly and annual chart reconcile', async () => {
  await clear(); await nav('Cadastro empresarial'); await tab('Movimentação');
  const new12 = await kpi('newRegistrations'); await page.getByLabel('Período dos movimentos', { exact: true }).selectOption('3'); await settle();
  assert.equal(await kpi('companies'), '3.000'); assert.equal(await kpi('newRegistrations'), format(summarize(selectScope(dataset, { ...defaultFilters, period: 3 })).newRegistrations)); assert.notEqual(await kpi('newRegistrations'), new12);
  await clear(); await nav('Visão executiva'); await tab('Evolução cadastral');
  const label = 'Evolução de novos registros, baixas, saldo e base acumulada';
  for (const [name, grain, length] of [['Mensal', 'month', 12], ['Trimestral', 'quarter', 4], ['Anual', 'year', 2]]) {
    await page.locator('[aria-label="Granularidade temporal"]').getByRole('button', { name }).click();
    const info = await chart(label); assert.equal(info.data.length, length); assert.equal(info.data.reduce((sum, row) => sum + Number(row.value ?? row), 0), baseMetrics.newRegistrations); assert.equal(makeSeries(baseScope, 12, grain).length, length);
  }
  await page.getByLabel('Comparar período anterior', { exact: true }).check(); await settle(); assert((await page.locator('.p-comparison-panel').textContent()).includes('2024-10-01'));
  const compared = await chart(label), prior = compared.series.find(row => row.name === 'Novos · janela anterior'); assert(prior, 'Comparison must alter the chart'); const bounds = windowBounds(12); const expectedPrior = makeSeries({ ...baseScope, anchor: bounds.previousEnd }, 12, 'year').map(row => row.newRegistrations); assert.deepEqual(prior.data, expectedPrior); assert.equal(prior.data.reduce((sum, value) => sum + Number(value), 0), dataset.movements.filter(row => new Set(baseScope.registrations.map(reg => reg.id)).has(row.registrationId) && row.date >= bounds.previousStart && row.date <= bounds.previousEnd && row.type === 'Novo registro').length);
  await page.getByLabel('Comparar período anterior', { exact: true }).uncheck(); await settle(); assert.equal((await chart(label)).series.some(row => row.name === 'Novos · janela anterior'), false);
});
await test('Executive subset stays selected during municipal filtering and cross-page investigation', async () => {
  await clear(); await nav('Visão executiva');
  await page.getByRole('button', { name: 'Indicadores operacionais', exact: true }).click(); await page.locator('.p-metric-ribbon').getByRole('button', { name: /^Sem RTS identificado/ }).click(); await settle();
  const registered = new Set(baseScope.registrations.map(row => row.companyId)), linked = new Set(baseScope.technicalLinks.filter(row => isActiveLink(row)).map(row => row.companyId));
  const ids = [...registered].filter(id => !linked.has(id)); await equalCount(ids.length);
  const label = await page.locator('.p-context h2').textContent(); assert(label.includes('Sem RTS vigente identificado'));
  await select('Município', ['Campinas']); const cityId = dataset.cities.find(row => row.name === 'Campinas').id;
  const expected = selectScope(dataset, { ...defaultFilters, cityIds: [cityId] }, ids); await equalCount(expected.companies.length); assert.equal(await page.locator('.p-context').count(), 1);
  for (const title of ['Cadastro empresarial', 'CNAE e mercado potencial', 'Responsabilidade técnica', 'CAO e acervo operacional']) { await nav(title); await equalCount(expected.companies.length); }
  await page.getByRole('button', { name: 'Limpar subconjunto', exact: true }).click(); await settle(); await equalCount(selectScope(dataset, { ...defaultFilters, cityIds: [cityId] }).companies.length);
});
await test('Municipal map keyboard selection filters actual company set and geographic indicators', async () => {
  await clear(); await nav('Visão executiva'); await tab('Território e cobertura');
  const before = await kpi('registeredCompanies'); await page.locator('.p-map-options').getByRole('button', { name: /^Campinas/ }).click(); await settle();
  const id = dataset.cities.find(row => row.name === 'Campinas').id, expected = selectScope(dataset, { ...defaultFilters, cityIds: [id] });
  await equalCount(expected.companies.length); assert.equal(await kpi('registeredCompanies'), format(summarize(expected).registeredCompanies)); assert.notEqual(await kpi('registeredCompanies'), before); assert.deepEqual(currentFilters().cityIds, [id]);
  assert.equal(await page.getByRole('img', { name: /^Mapa coroplético/ }).locator('svg').count(), 1);
});
await test('Actual IBGE municipal polygon click creates a municipal cross-filter', async () => {
  await clear(); await nav('Visão executiva'); await tab('Território e cobertura');
  const label = await page.getByRole('img', { name: /^Mapa coroplético/ }).getAttribute('aria-label'); await chart(label, 'map', 'Campinas');
  const id = dataset.cities.find(row => row.name === 'Campinas').id; await expect.poll(() => currentFilters().cityIds).toEqual([id]); await equalCount(selectScope(dataset, { ...defaultFilters, cityIds: [id] }).companies.length);
});
await test('Actual SVG bar click drills GRE and persists selected dimension', async () => {
  await clear(); await nav('Visão executiva'); await tab('Território e cobertura');
  const info = await chart('Empresas sem correspondência por GRE', 'bar', 0);
  const expectedGre = group(baseScope, 'gre')[info.dataIndex]; assert.deepEqual(currentFilters().greIds, [expectedGre.id]);
  await equalCount(selectScope(dataset, { ...defaultFilters, greIds: [expectedGre.id] }).companies.length);
});
await test('Heatmap cell click applies CNAE and municipality together to all charts and table', async () => {
  await clear(); await nav('CNAE e mercado potencial'); await tab('CNAE × município');
  const host = page.locator('.p-chart-canvas').first(); const label = await host.getAttribute('aria-label');
  await chart(label, 'heatmap', 0); const filters = currentFilters(); assert.equal(filters.cityIds.length, 1); assert.equal(filters.cnaeCodes.length, 1);
  const expected = selectScope(dataset, { ...defaultFilters, cityIds: filters.cityIds, cnaeCodes: filters.cnaeCodes }); await equalCount(expected.companies.length);
});
await test('Municipal scatter point click creates an actual municipal cross-filter', async () => {
  await clear(); await nav('CNAE e mercado potencial'); await tab('Concentração e emprego');
  const label = await page.locator('.p-chart-canvas').first().getAttribute('aria-label'); await chart(label, 'scatter', 0); const filters = currentFilters(); assert.equal(filters.cityIds.length, 1);
  await equalCount(selectScope(dataset, { ...defaultFilters, cityIds: filters.cityIds }).companies.length);
});
await test('Table pagination, ordering, column selection and advanced branch filters operate on unique companies', async () => {
  await clear(); await nav('Cadastro empresarial'); await tab('Universo cadastral'); await explore();
  const table = page.locator('#company-list'); const first = await table.locator('.p-company-link').allTextContents(); assert.equal(first.length, 10);
  await table.getByRole('button', { name: 'Próxima página', exact: true }).click(); const second = await table.locator('.p-company-link').allTextContents(); assert(first.every(name => !second.includes(name))); assert((await table.locator('.p-pagination').textContent()).includes('Página 2 de 300'));
  await table.getByRole('button', { name: 'Empresa / raiz CNPJ', exact: true }).click(); assert.notDeepEqual(await table.locator('.p-company-link').allTextContents(), second);
  await page.getByRole('button', { name: 'Selecionar colunas', exact: true }).click(); await page.locator('.p-columns').getByRole('checkbox', { name: 'Porte', exact: true }).check(); assert.equal(await table.getByRole('columnheader', { name: 'Porte', exact: true }).count(), 1);
  await page.getByRole('button', { name: 'Filtros avançados da tabela', exact: true }).click(); await page.locator('.p-advanced').getByRole('combobox').selectOption('Filial');
  await equalTableCount(uniq(dataset.establishments.filter(row => row.branch === 'Filial').map(row => row.companyId)).length);
  await page.locator('.p-advanced').getByRole('checkbox').check(); const quality = new Set(dataset.qualityEvents.filter(row => !row.resolved).map(row => row.companyId)); await equalTableCount(uniq(dataset.establishments.filter(row => row.branch === 'Filial' && quality.has(row.companyId)).map(row => row.companyId)).length);
  await page.getByRole('button', { name: 'Limpar filtros da tabela', exact: true }).click(); await equalTableCount(3000); await page.keyboard.press('Escape'); await equalCount(3000);
});
await test('Global and table search find exact names and complete CNPJs, with working empty state', async () => {
  await clear(); await nav('Visão executiva'); const company = dataset.companies[0], est = dataset.establishments.find(row => row.companyId === company.id); await explore();
  await page.getByLabel('Pesquisar empresas', { exact: true }).fill(company.name); await equalTableCount(1); await equalCount(3000);
  await page.getByLabel('Pesquisar empresas', { exact: true }).fill(est.cnpj); await equalTableCount(1);
  await page.getByLabel('Pesquisar empresas', { exact: true }).fill('empresa inexistente qa'); await equalTableCount(0); assert.equal(await page.getByRole('heading', { name: 'Nenhuma empresa neste recorte', exact: true }).count(), 1);
  await page.getByRole('button', { name: 'Limpar pesquisa', exact: true }).click(); await equalTableCount(3000); await page.keyboard.press('Escape');
  await advanced(); await page.getByLabel('Busca global por CNPJ ou razão social', { exact: true }).fill(est.cnpj); await settle(); await returnToAnalysis(); await equalCount(1); assert.equal(await kpi('registeredCompanies'), format(summarize(selectScope(dataset, { ...defaultFilters, search: est.cnpj })).registeredCompanies));
  await advanced(); await page.getByLabel('Busca global por CNPJ ou razão social', { exact: true }).fill('inexistente qa'); await settle(); await returnToAnalysis(); assert.equal(await page.getByRole('heading', { name: 'O recorte não possui empresas', exact: true }).count(), 1); await clear();
});
await test('Manual multiselection investigates selected companies; CSV contains only selected establishments', async () => {
  await clear(); await nav('Cadastro empresarial'); await explore(); const table = page.locator('#company-list');
  const checks = table.locator('tbody input[type="checkbox"]'); const selectedNames = (await table.locator('.p-company-link').allTextContents()).slice(0, 2);
  await checks.nth(0).check(); await checks.nth(1).check();
  const rows = await download(() => page.getByRole('button', { name: 'Exportar tabela CSV', exact: true }).click()); const nameColumn = rows[0].indexOf('Razão social'); assert(rows.slice(1).every(row => selectedNames.includes(row[nameColumn]))); assert.equal(new Set(rows.slice(1).map(row => row[0])).size, 2);
  await page.getByRole('button', { name: 'Investigar seleção', exact: true }).click(); await settle(); await equalCount(2); assert.equal(await page.locator('.p-context').count(), 1);
});
await test('Company drawer contains 8 functional tabs, coherent ART/CAO evidence and focus restoration', async () => {
  await clear(); await nav('Cadastro empresarial'); const target = dataset.caos.find(row => inWindow(row.issuedAt, 12)); const company = dataset.companies.find(row => row.id === target.companyId);
  await explore(); await page.getByLabel('Pesquisar empresas', { exact: true }).fill(company.name); const trigger = page.locator('#company-list .p-company-link').first(); await trigger.click(); const dialog = page.getByRole('dialog'); await dialog.waitFor();
  assert.equal(await dialog.getByRole('tab').count(), 8); assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
  for (const name of ['Cadastro', 'Responsabilidade', 'ART & CAO', 'Financeiro', 'Fiscalização', 'Mercado', 'Contratações', 'Qualidade']) { await dialog.getByRole('tab', { name, exact: true }).click(); assert.equal(await dialog.getByRole('tab', { name, exact: true }).getAttribute('aria-selected'), 'true'); assert((await dialog.getByRole('tabpanel').textContent()).length > 100, name); }
  await dialog.getByRole('tab', { name: 'ART & CAO', exact: true }).click(); const text = await dialog.getByRole('tabpanel').textContent(); assert(text.includes(target.id)); for (const id of target.artIds) assert(text.includes(id), id); assert(text.includes('CAT'));
  await dialog.getByRole('tab', { name: 'ART & CAO', exact: true }).press('Home'); assert.equal(await dialog.getByRole('tab', { name: 'Cadastro', exact: true }).getAttribute('aria-selected'), 'true');
  await dialog.getByRole('tab', { name: 'Cadastro', exact: true }).press('End'); assert.equal(await dialog.getByRole('tab', { name: 'Qualidade', exact: true }).getAttribute('aria-selected'), 'true');
  await page.keyboard.press('Escape'); assert.equal(await page.getByRole('dialog').count(), 0); assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Explorar recorte'); assert.equal(await page.evaluate(() => document.body.style.overflow), '');
  assert.equal(await page.locator('#company-list').count(), 0);
});
await test('Company drillthrough navigates its full factual context while keeping global filters', async () => {
  await clear(); await nav('Cadastro empresarial'); await explore(); const trigger = page.locator('#company-list .p-company-link').first(); const companyName = await trigger.textContent(); await trigger.click(); const dialog = page.getByRole('dialog'); await dialog.getByRole('tab', { name: 'ART & CAO', exact: true }).click();
  await dialog.getByRole('button', { name: 'Analisar esta empresa no painel', exact: true }).click(); assert.equal(await page.getByRole('dialog').count(), 0); assert.equal(await page.getByRole('heading', { level: 1 }).textContent(), 'CAO e acervo operacional'); await equalCount(1); assert((await page.locator('.p-context').textContent()).includes(companyName));
});
await test('CAO indicators and company table equal underlying issuance events in period', async () => {
  await clear(); await nav('CAO e acervo operacional'); assert.equal(await kpi('caoIssued'), format(baseScope.caos.filter(row => inWindow(row.issuedAt, 12)).length));
  await page.locator('[data-metric="caoIssued"] .p-kpi-drill').click(); await settle(); const expected = uniq(baseScope.caos.filter(row => inWindow(row.issuedAt, 12)).map(row => row.companyId)); await equalCount(expected.length); await nav('Visão executiva'); await equalCount(expected.length);
});
await test('Employment stock is aggregated by geography/CNAE and does not manufacture CNPJ employment links', async () => {
  await clear(); await nav('Emprego e ecossistema'); const stock = await kpi('employees'), admissions = await kpi('admissions'); assert.equal(stock, format(baseMetrics.employees));
  await select('Porte', ['Grande empresa']); assert.equal(await kpi('employees'), stock); assert((await page.locator('.p-notice').allTextContents()).join(' ').includes('não identifica trabalhadores')); assert((await page.locator('.p-notice').allTextContents()).join(' ').includes('não é aplicada a esta fonte'));
  await page.getByLabel('Período dos movimentos', { exact: true }).selectOption('3'); await settle(); assert.equal(await kpi('employees'), stock); assert.notEqual(await kpi('admissions'), admissions);
  await select('Município', ['Campinas']); const id = dataset.cities.find(row => row.name === 'Campinas').id; assert.equal(await kpi('employees'), format(summarize(selectScope(dataset, { ...defaultFilters, sizes: ['Grande empresa'], period: 3, cityIds: [id] })).employees)); assert.notEqual(await kpi('employees'), stock);
});
await test('Inspection priority and phase drilldown expose factors and historical events without adjudication', async () => {
  await clear(); await nav('Fiscalização inteligente'); await tab('Priorização');
  await page.getByRole('button', { name: 'Abrir caso', exact: true }).first().click(); const dialog = page.getByRole('dialog'); await dialog.getByRole('tab', { name: 'Fiscalização', exact: true }).click(); const text = await dialog.getByRole('tabpanel').textContent(); assert(text.includes('Prioridade')); assert(text.includes('Histórico') || text.includes('histórico')); assert(text.includes('100'));
  await page.keyboard.press('Escape'); await tab('Fluxo operacional'); await chart('Fila e prioridade de verificação', 'bar', 0); assert.equal(await page.locator('.p-context').count(), 1); assert((await page.locator('.p-context').textContent()).includes('Fase'));
});
await test('Editable contract classifier executes rules and explains its demonstrative interpretation', async () => {
  await clear(); await nav('Contratações públicas'); await tab('Classificação explicável');
  const object = 'Contratação de serviços de manutenção preventiva de instalações elétricas'; await page.getByLabel('Objeto da contratação', { exact: true }).fill(object); await page.getByRole('button', { name: 'Classificar objeto', exact: true }).click(); const expected = classifyContract(object); assert((await page.locator('.p-classifier [aria-live="polite"]').textContent()).includes(expected.label));
  await page.getByLabel('Objeto da contratação', { exact: true }).fill('Fornecimento de canetas e papel'); await page.getByRole('button', { name: 'Classificar objeto', exact: true }).click(); assert((await page.locator('.p-classifier [aria-live="polite"]').textContent()).includes(classifyContract('Fornecimento de canetas e papel').label));
});
await test('CBO selection filters aggregated employment only and heatmap selects CNAE plus occupation', async () => {
  await clear(); await nav('Emprego e ecossistema'); await tab('Dinâmica do emprego'); const stock = await kpi('employees');
  const code = dataset.cbos[0].code; await page.getByLabel('Selecionar ocupação CBO', { exact: true }).selectOption(code); await settle();
  await expect.poll(() => currentFilters().cboCodes).toEqual([code]); await equalCount(3000); assert.equal(await kpi('employees'), format(summarize(selectScope(dataset, { ...defaultFilters, cboCodes: [code] })).employees)); assert.notEqual(await kpi('employees'), stock);
  await nav('CNAE e mercado potencial'); await equalCount(3000); assert.deepEqual(currentFilters().cboCodes, [code]);
  await clear(); await nav('Emprego e ecossistema'); await tab('CNAE × CBO'); await chart('Estoque agregado por CNAE e CBO', 'heatmap', 0);
  await expect.poll(() => currentFilters().cboCodes.length).toBe(1); await expect.poll(() => currentFilters().cnaeCodes.length).toBe(1); const filters = currentFilters(), expected = selectScope(dataset, { ...defaultFilters, cboCodes: filters.cboCodes, cnaeCodes: filters.cnaeCodes });
  await equalCount(expected.companies.length); assert.equal(await kpi('employees'), format(summarize(expected).employees));
});
await test('CNPJ reconciliation prioritizes exact identifiers and exposes the corresponding company for review', async () => {
  await clear(); await nav('CNAE e mercado potencial'); await tab('Cobertura e conciliação');
  assert.equal(await page.getByRole('button', { name: 'Comparar cadastros', exact: true }).isDisabled(), true);
  const estId = dataset.registrations[0].establishmentId, est = dataset.establishments.find(row => row.id === estId), company = dataset.companies.find(row => row.id === est.companyId);
  await page.getByLabel('CNPJ para conciliação', { exact: true }).fill(est.cnpj); await page.getByRole('button', { name: 'Comparar cadastros', exact: true }).click(); await expect(page.locator('.p-match-result > strong')).toHaveText('Exata');
  await page.getByRole('button', { name: 'Abrir empresa sugerida', exact: true }).click(); assert((await page.getByRole('dialog').getByRole('heading', { level: 2 }).textContent()).includes(company.name)); await page.keyboard.press('Escape'); await equalCount(3000);
  await page.getByLabel('CNPJ para conciliação', { exact: true }).fill('99999999000199'); await page.getByLabel('Razão social para conciliação', { exact: true }).fill('Empresa sem correspondência QA'); await page.getByRole('button', { name: 'Comparar cadastros', exact: true }).click(); await expect(page.locator('.p-match-result > strong')).toHaveText('Sem correspondência');
});
await test('Strategic quality alert opens precisely the unresolved evidence subset across domains', async () => {
  await clear(); await nav('Visão executiva'); await tab('Alertas estratégicos');
  await page.locator('.p-alert').filter({ has: page.getByText('Divergências cadastrais para validação', { exact: true }) }).click(); await settle(); const ids = uniq(baseScope.qualityEvents.filter(row => !row.resolved).map(row => row.companyId));
  await equalCount(ids.length); await nav('Cadastro empresarial'); await tab('Qualidade cadastral'); await equalCount(ids.length); assert((await page.locator('.p-context').textContent()).includes('Divergências cadastrais'));
});
await test('Thematic controls change inspection GRE, RT matrix, CAO territory, financial profile and contract geography', async () => {
  await clear(); await nav('Fiscalização inteligente'); await tab('Priorização'); await page.getByRole('group', { name: 'Distribuição dos casos' }).getByRole('button', { name: 'GRE', exact: true }).click();
  const inspection = await chart('Casos por GRE'); assert.equal(inspection.data.reduce((sum, row) => sum + row.value, 0), baseScope.cases.filter(row => row.status !== 'Concluída').length);
  await nav('Responsabilidade técnica'); await tab('Modalidades'); const beforeMatrix = await chart('Matriz de vínculos vigentes por empresa e modalidade'); await page.getByRole('group', { name: 'Nível da matriz de modalidades' }).getByRole('button', { name: 'Porte', exact: true }).click(); const afterMatrix = await chart('Empresas por modalidade profissional e porte'); assert.notDeepEqual(afterMatrix.data, beforeMatrix.data);
  await page.getByRole('group', { name: 'Nível da matriz de modalidades' }).getByRole('button', { name: 'Empresa', exact: true }).click(); await chart('Matriz de vínculos vigentes por empresa e modalidade', 'heatmap', 0); await equalCount(1);
  await clear(); await nav('CAO e acervo operacional'); await tab('Empresas e acervo'); const acervoLabel = 'Modalidades, municípios e segmentos do acervo operacional'; const initial = await chart(acervoLabel);
  await page.getByRole('group', { name: 'Distribuição do acervo' }).getByRole('button', { name: 'Município', exact: true }).click(); const municipalities = await chart(acervoLabel); assert.notDeepEqual(municipalities.labels, initial.labels); assert(municipalities.labels.every(label => dataset.cities.some(city => city.name === label)));
  await page.getByRole('group', { name: 'Distribuição do acervo' }).getByRole('button', { name: 'Segmento CNAE', exact: true }).click(); const sectors = await chart(acervoLabel); assert(sectors.labels.some(label => /\d{4}-\d\/\d{2}/.test(label))); assert.notDeepEqual(sectors.labels, municipalities.labels);
  await nav('Financeiro empresarial'); await tab('Débitos e atraso'); const debtLabel = 'Ranking regional e empresarial do saldo vencido'; await page.getByRole('group', { name: 'Distribuição dos débitos' }).getByRole('button', { name: 'Porte', exact: true }).click(); const debt = await chart(debtLabel); assert.equal(debt.data.length, 4); assert(Math.abs(debt.data.reduce((sum, row) => sum + row.value, 0) - baseMetrics.overdueAmount) < 0.01);
  await page.getByRole('group', { name: 'Distribuição dos débitos' }).getByRole('button', { name: 'CNAE', exact: true }).click(); const debtCnae = await chart(debtLabel); assert.notDeepEqual(debtCnae.labels, debt.labels);
  await nav('Contratações públicas'); await tab('Panorama'); await page.getByRole('group', { name: 'Distribuição das contratações' }).getByRole('button', { name: 'Município', exact: true }).click(); const contractLabel = 'Valor dos contratos por CNAE, município e categoria de objeto'; const contracts = await chart(contractLabel); assert(contracts.labels.every(label => dataset.cities.some(city => city.name === label)));
  const selected = await chart(contractLabel, 'bar', 0), city = dataset.cities.find(row => row.name === selected.labels[selected.dataIndex]); await expect.poll(() => currentFilters().cityIds).toEqual([city.id]); await equalCount(selectScope(dataset, { ...defaultFilters, cityIds: [city.id] }).companies.length);
});
await test('Header CSV reconciles establishments and explicit company financial denominators', async () => {
  await clear(); await nav('Visão executiva'); const rows = await download(() => page.getByRole('button', { name: 'Exportar recorte', exact: true }).click()); assert.equal(rows.length - 1, dataset.establishments.length); assert.equal(new Set(rows.slice(1).map(row => row[rows[0].indexOf('CNPJ')])).size, dataset.establishments.length); assert(rows[0].some(label => label.includes('não somar por estabelecimento')));
});
await test('Demo regional permissions restrict GRE2 and monetary exports; viewer forbids export and finance', async () => {
  await clear(); await page.getByLabel('Perfil demonstrativo', { exact: true }).selectOption('regional'); await settle(); const expected = selectScope(dataset, { ...defaultFilters, greIds: ['GRE2'] }); await equalCount(expected.companies.length);
  const csv = await download(() => page.getByRole('button', { name: 'Exportar recorte', exact: true }).click()); assert(!csv[0].some(label => label.includes('Vencido') || label.includes('Em aberto')));
  await nav('Financeiro empresarial'); assert.equal(await page.getByRole('heading', { name: 'Análise financeira restrita neste perfil', exact: true }).count(), 1); assert.equal(await page.locator('.p-summary').count(), 0);
  await explore(); await page.locator('#company-list .p-company-link').first().click(); const dialog = page.getByRole('dialog'); await dialog.getByRole('tab', { name: /^Financeiro/ }).click(); assert((await dialog.getByRole('tabpanel').textContent()).includes('restrit')); await page.keyboard.press('Escape');
  await page.getByLabel('Perfil demonstrativo', { exact: true }).selectOption('viewer'); assert.equal(await page.getByRole('button', { name: 'Exportar recorte', exact: true }).isDisabled(), true); await explore(); assert.equal(await page.getByRole('button', { name: 'Exportar tabela CSV', exact: true }).isDisabled(), true); await page.keyboard.press('Escape');
  await page.getByLabel('Perfil demonstrativo', { exact: true }).selectOption('admin'); await clear(); await equalCount(3000);
});
await test('Indicator dictionary provides formulas, units, sources, limitations and validator; governance has audit', async () => {
  await clear(); await nav('Visão executiva'); await page.getByRole('button', { name: 'Definição de Empresas localizadas no CREA', exact: true }).click(); const dialog = page.getByRole('dialog');
  assert.equal(await dialog.locator('.p-formula').count(), 1); const text = await dialog.locator('.p-formula').textContent(); for (const field of ['Fórmula', 'Unidade de contagem', 'Fonte', 'Periodicidade', 'Limitações', 'Validação funcional']) assert(text.includes(field));
  await dialog.getByRole('button', { name: 'Acesso e auditoria', exact: true }).click(); assert((await dialog.locator('.p-audit').textContent()).includes('Navegação temática')); assert((await dialog.textContent()).includes('não constitui autenticação, RLS'));
  await dialog.getByRole('button', { name: 'Fontes e processamento', exact: true }).click(); const sources = await dialog.textContent(); assert(sources.includes('702')); assert(sources.includes('645')); assert(sources.includes('14 GREs'));
  for (const link of await dialog.locator('.p-doclinks a').all()) { const href = await link.getAttribute('href'); const response = await context.request.get(new URL(href, baseURL).href); assert.equal(response.status(), 200, href); assert(!(await response.text()).includes('<div id="root">'), `Documentation missing: ${href}`); }
  await page.keyboard.press('Escape'); assert.equal(await page.getByRole('dialog').count(), 0);
});
await test('Executive canvas fits PC screens and presentation mode expands the analysis surface', async () => {
  await clear(); await nav('Visão executiva'); await tab('Panorama');
  const operational = page.getByRole('button', { name: 'Indicadores operacionais', exact: true }); if (await operational.getAttribute('aria-expanded') === 'true') await operational.click();
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }]) {
    await page.setViewportSize(viewport); await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
    const dimensions = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scroll: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight, footer: document.querySelector('.p-report-footer').getBoundingClientRect().bottom, font: getComputedStyle(document.querySelector('.p-title')).fontSize, stage: document.querySelector('.p-report-stage').getBoundingClientRect().height }));
    assert(dimensions.scroll <= dimensions.width + 1, JSON.stringify(dimensions)); assert(dimensions.footer <= dimensions.height + 1, JSON.stringify(dimensions)); assert(dimensions.documentHeight <= dimensions.height + 1, JSON.stringify(dimensions)); assert(parseFloat(dimensions.font) >= 24); assert.equal(await page.locator('#company-list').count(), 0);
    await page.screenshot({ path: `${output}/overview-${viewport.width}.png` });
    await page.getByRole('button', { name: 'Modo apresentação', exact: true }).click(); assert.equal(await page.locator('.platform.bi-presentation').count(), 1); await page.waitForTimeout(400);
    const presented = await page.evaluate(() => ({ width: document.querySelector('.p-report-stage').getBoundingClientRect().width, height: document.querySelector('.p-report-stage').getBoundingClientRect().height, scroll: document.documentElement.scrollWidth, viewport: innerWidth })); assert(presented.height > dimensions.stage, JSON.stringify({ dimensions, presented })); assert(presented.scroll <= presented.viewport + 1);
    await page.screenshot({ path: `${output}/presentation-${viewport.width}.png` }); await page.getByRole('button', { name: 'Sair do modo apresentação', exact: true }).click(); assert.equal(await page.locator('.platform.bi-presentation').count(), 0);
  }
});
await test('Aggregate coverage selection opens only the supporting company set on demand', async () => {
  await clear(); await nav('Visão executiva'); await tab('Panorama'); assert.equal(await page.locator('#company-list').count(), 0); assert.equal(await page.locator('.bi-overview .p-panel').count(), 5);
  const registered = new Set(baseScope.registrations.map(row => row.companyId)), ids = baseScope.companies.filter(row => !registered.has(row.id)).map(row => row.id);
  await page.getByRole('button', { name: `Selecionar ${format(ids.length)} empresas sem correspondência`, exact: true }).click(); await settle(); await equalCount(ids.length); assert.equal(await page.locator('#company-list').count(), 0);
  await explore(); await equalTableCount(ids.length); assert.equal(await page.getByRole('dialog', { name: 'Explorar recorte', exact: true }).count(), 1); await page.keyboard.press('Escape'); assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Explorar recorte');
  await clear(); await page.locator('[data-metric="compliance"] .p-kpi-drill').click(); await settle(); await equalCount(baseMetrics.compliantCompanies); assert.equal(await kpi('compliance'), '100%'); assert((await page.locator('.p-context').textContent()).includes('Empresas adimplentes no universo financeiro')); await explore(); await equalTableCount(baseMetrics.compliantCompanies); await page.keyboard.press('Escape');
});
await test('Explainable executive insight selects the precise RTS evidence subset and preserves slicers', async () => {
  await clear(); await nav('Visão executiva'); await tab('Panorama'); await select('Porte', ['Grande empresa']);
  const scope = selectScope(dataset, { ...defaultFilters, sizes: ['Grande empresa'] }), registered = new Set(scope.registrations.map(row => row.companyId)), linked = new Set(scope.technicalLinks.filter(row => isActiveLink(row)).map(row => row.companyId)), ids = [...registered].filter(id => !linked.has(id));
  const insight = page.locator('.bi-insight').filter({ has: page.getByText('Empresas localizadas sem RTS vigente identificado', { exact: true }) }); assert((await insight.getAttribute('title')).includes('vínculo')); assert((await insight.textContent()).includes(format(ids.length))); await insight.click(); await settle(); await equalCount(ids.length); assert.deepEqual(currentFilters().sizes, ['Grande empresa']);
  await nav('Responsabilidade técnica'); await equalCount(ids.length); assert.equal(await kpi('withoutRt'), format(ids.length));
});
await test('Regional cross-source matrix reconciles each unit and GRE scatter preserves existing slicers', async () => {
  await clear(); await nav('Visão executiva'); await tab('Cruzamento de bases'); await select('Porte', ['Grande empresa']);
  const scope = selectScope(dataset, { ...defaultFilters, sizes: ['Grande empresa'] }), gres = group(scope, 'gre'), months = [...new Set(scope.employment.map(row => row.month))].sort(), lastMonth = months.at(-1), cityGre = new Map(dataset.cities.map(row => [row.id, row.greId]));
  const table = page.locator('.bi-crossbase-table'); assert.equal(await table.locator('tbody tr').count(), dataset.gres.length);
  for (const row of gres) { const gre = dataset.gres.find(g => g.id === row.id), tr = table.locator('tbody tr').filter({ has: page.getByRole('button', { name: gre.name, exact: true }) }); const cells = await tr.locator('td').allTextContents(); assert.equal(parseNumber(cells[0]), row.companies); assert.equal(parseNumber(cells[1]), row.notMatched); assert.equal(parseNumber(cells[3]), scope.employment.filter(job => cityGre.get(job.cityId) === row.id && job.month === lastMonth).reduce((sum, job) => sum + job.stock, 0)); }
  const label = await page.getByRole('img', { name: /^Dispersão regional:/ }).getAttribute('aria-label'), selected = await chart(label, 'scatter', 0), greId = selected.data[selected.dataIndex].id;
  await expect.poll(() => currentFilters().greIds).toEqual([greId]); assert.deepEqual(currentFilters().sizes, ['Grande empresa']); await equalCount(selectScope(dataset, { ...defaultFilters, sizes: ['Grande empresa'], greIds: [greId] }).companies.length);
  await nav('CNAE e mercado potencial'); assert.deepEqual(currentFilters().greIds, [greId]); assert.deepEqual(currentFilters().sizes, ['Grande empresa']);
});
await test('Advanced synchronized filters trap focus, preserve nested Escape and update all domain totals', async () => {
  await clear(); await nav('Visão executiva'); await advanced(); const modal = page.getByRole('dialog', { name: 'Filtros avançados', exact: true }); assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
  const close = modal.getByRole('button', { name: 'Fechar filtros avançados', exact: true }); await expect(close).toBeFocused(); await close.press('Shift+Tab'); await expect(modal.getByRole('button', { name: 'Voltar à análise', exact: true })).toBeFocused(); await page.keyboard.press('Tab'); await expect(close).toBeFocused();
  await page.getByRole('button', { name: 'Filtrar Situação Receita', exact: true }).click(); await page.keyboard.press('Escape'); assert.equal(await modal.count(), 1); assert.equal(await page.locator('.p-multiselect-menu').count(), 0);
  await select('Situação Receita', ['Ativa']); await returnToAnalysis(); const expected = selectScope(dataset, { ...defaultFilters, rfbStatuses: ['Ativa'] }); await equalCount(expected.companies.length); assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Mais filtros');
  await nav('Cadastro empresarial'); await equalCount(expected.companies.length); assert.equal(await kpi('establishments'), format(expected.establishments.length)); await advanced(); await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Mais filtros', exact: true })).toBeFocused(); assert.equal(await page.evaluate(() => document.body.style.overflow), '');
});
await test('Browser navigation history restores thematic pages while retaining global filters', async () => {
  await clear(); await nav('Cadastro empresarial'); await select('Município', ['Campinas']); const before = await count(); await nav('CAO e acervo operacional'); await page.goBack(); await page.getByRole('heading', { level: 1, name: 'Cadastro empresarial', exact: true }).waitFor(); await equalCount(before); await page.goForward(); await page.getByRole('heading', { level: 1, name: 'CAO e acervo operacional', exact: true }).waitFor(); await equalCount(before);
});
await test('No runtime, HTTP, duplicate-row or chart-loading errors remain', async () => {
  assert.equal(errors.length, 0, JSON.stringify(errors)); assert.equal(httpFailures.length, 0, JSON.stringify(httpFailures)); await clear();
  await explore(); const names = await page.locator('#company-list .p-company-link').allTextContents(); assert.equal(new Set(names).size, names.length); assert.equal(await page.locator('.p-error').count(), 0);
});
const report = { at: new Date().toISOString(), url: baseURL, pages: 9, analyses: 32, browser: 'Chromium', viewports: ['1920×1080', '1366×768'], passed: results.filter(row => row.status === 'passed').length, failed: results.filter(row => row.status === 'failed').length, results, errors, httpFailures };
await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
await browser.close(); console.log(JSON.stringify({ passed: report.passed, failed: report.failed, errors, httpFailures, report: `${output}/report.json` }));
if (report.failed) process.exitCode = 1;
