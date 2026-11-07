/**
 * Relatório PBIR (a pasta `<Nome>.Report/` do PBIP): páginas, visuais ligados às medidas e colunas do modelo e o tema
 * embutido. Versões de schema e estrutura em docs/pesquisa/powerbi-pbip.md, seção 3; os testes validam cada arquivo contra
 * os schemas oficiais. Os nomes dos papéis dos visuais (Category, Y, Values...) não têm tabela oficial: conferir uma vez no
 * Power BI Desktop (seção "Pendências" da pesquisa).
 */
/** Campo de um visual; `rotulo` troca o nome que o visual mostra (o displayName da projeção). */
export type Campo = ({ medida: string } | { coluna: [string, string] }) & { rotulo?: string };

export type TipoVisual = 'card' | 'multiRowCard' | 'slicer' | 'textbox' | 'barChart' | 'clusteredBarChart' | 'hundredPercentStackedBarChart' | 'clusteredColumnChart' | 'columnChart' | 'lineChart'
  | 'lineClusteredColumnComboChart' | 'lineStackedColumnComboChart' | 'donutChart' | 'treemap' | 'pivotTable' | 'tableEx';
/** Gráficos: saem com rótulos de dados e legenda no alto, porque todo gráfico do painel se lê sem passar o mouse. */
const GRAFICOS = new Set<TipoVisual>(['barChart', 'clusteredBarChart', 'hundredPercentStackedBarChart', 'clusteredColumnChart', 'columnChart', 'lineChart', 'lineClusteredColumnComboChart', 'lineStackedColumnComboChart', 'donutChart', 'treemap']);

export interface Visual {
  /** Nome da pasta do visual: só [A-Za-z0-9_-], até 50 caracteres. */
  id: string; tipo: TipoVisual;
  x: number; y: number; w: number; h: number;
  titulo?: string;
  /** Campos por papel do visual (Category, Series, Y, Y2, Values, Group, Details, Rows, Columns). */
  papeis?: Record<string, Campo[]>;
  /** Texto de uma caixa de texto; parágrafos separados por linha em branco. */
  texto?: string;
  /**
   * Segmentação sincronizada entre as páginas pelo grupo: lista suspensa (com uma só escolha quando `unica`) ou, no modo
   * `Single`, o controle deslizante de valor único de um parâmetro de intervalo numérico.
   */
  segmentacao?: { grupo: string; unica?: boolean; modo?: 'Dropdown' | 'Single' };
}

export interface Pagina { id: string; nome: string; visuais: Visual[] }

export interface Relatorio {
  nome: string; modelo: string;
  /** Tema JSON do relatório, gravado em StaticResources/RegisteredResources. */
  tema: { arquivo: string; conteudo: object };
  paginas: Pagina[]; largura: number; altura: number;
}

const SCHEMA = 'https://developer.microsoft.com/json-schemas/fabric/';
const versoes = { visual: '2.13.0', report: '3.3.0', page: '2.1.0' };
const json = (valor: object) => `${JSON.stringify(valor, null, 2)}\n`;
const literal = (valor: string | number | boolean) => ({ expr: { Literal: { Value: typeof valor === 'string' ? `'${valor.replaceAll("'", "''")}'` : typeof valor === 'number' ? `${valor}D` : String(valor) } } });

export function relatorioPbir(relatorio: Relatorio): Map<string, string> {
  const arquivos = new Map<string, string>();
  arquivos.set('definition.pbir', json({ $schema: `${SCHEMA}item/report/definitionProperties/2.0.0/schema.json`, version: '4.0', datasetReference: { byPath: { path: `../${relatorio.modelo}.SemanticModel` } } }));
  arquivos.set('definition/version.json', json({ $schema: `${SCHEMA}item/report/definition/versionMetadata/1.0.0/schema.json`, version: '2.0.0' }));
  arquivos.set(`StaticResources/RegisteredResources/${relatorio.tema.arquivo}`, json(relatorio.tema.conteudo));
  arquivos.set('definition/report.json', json({
    $schema: `${SCHEMA}item/report/definition/report/3.3.0/schema.json`,
    themeCollection: { customTheme: { name: relatorio.tema.arquivo, reportVersionAtImport: versoes, type: 'RegisteredResources' } },
    resourcePackages: [{ name: 'RegisteredResources', type: 'RegisteredResources', items: [{ name: relatorio.tema.arquivo, path: relatorio.tema.arquivo, type: 'CustomTheme' }] }],
    settings: { useStylableVisualContainerHeader: true, defaultDrillFilterOtherVisuals: true, useEnhancedTooltips: true },
  }));
  arquivos.set('definition/pages/pages.json', json({ $schema: `${SCHEMA}item/report/definition/pagesMetadata/1.1.0/schema.json`, pageOrder: relatorio.paginas.map(pagina => pagina.id), activePageName: relatorio.paginas[0].id }));
  for (const pagina of relatorio.paginas) {
    const base = `definition/pages/${pagina.id}`;
    arquivos.set(`${base}/page.json`, json({ $schema: `${SCHEMA}item/report/definition/page/2.1.0/schema.json`, name: pagina.id, displayName: pagina.nome, displayOption: 'FitToPage', height: relatorio.altura, width: relatorio.largura }));
    pagina.visuais.forEach((visual, ordem) => arquivos.set(`${base}/visuals/${visual.id}/visual.json`, json(conteiner(visual, ordem))));
  }
  return arquivos;
}

function campo(valor: Campo) {
  const rotulo = valor.rotulo ? { displayName: valor.rotulo } : {};
  if ('medida' in valor) return { field: { Measure: { Expression: { SourceRef: { Entity: 'Medidas' } }, Property: valor.medida } }, queryRef: `Medidas.${valor.medida}`, nativeQueryRef: valor.medida, ...rotulo };
  const [tabela, coluna] = valor.coluna;
  return { field: { Column: { Expression: { SourceRef: { Entity: tabela } }, Property: coluna } }, queryRef: `${tabela}.${coluna}`, nativeQueryRef: coluna, active: true, ...rotulo };
}

function conteiner(visual: Visual, ordem: number) {
  const corpo: Record<string, unknown> = { visualType: visual.tipo }, objetos: Record<string, unknown> = {};
  const mostrar = (valor: boolean, extra: Record<string, unknown> = {}) => [{ properties: { show: literal(valor), ...extra } }];
  if (visual.papeis) corpo.query = { queryState: Object.fromEntries(Object.entries(visual.papeis).map(([papel, campos]) => [papel, { projections: campos.map(campo) }])) };
  if (visual.tipo === 'textbox' && visual.texto) objetos.general = [{ properties: { paragraphs: visual.texto.split('\n\n').map((paragrafo, i) => ({ textRuns: [{ value: paragrafo, ...(i === 0 && visual.titulo === undefined ? { textStyle: { fontWeight: 'bold' } } : {}) }] })) } }];
  if (GRAFICOS.has(visual.tipo)) Object.assign(objetos, { labels: mostrar(true), legend: mostrar(true, { position: literal('Top') }) });
  // No cartão de várias linhas, o título do visual já diz o que é o número: some o nome de cada medida embaixo do valor.
  if (visual.tipo === 'multiRowCard') objetos.categoryLabels = mostrar(false);
  if (visual.segmentacao) {
    Object.assign(objetos, { data: [{ properties: { mode: literal(visual.segmentacao.modo ?? 'Dropdown') } }], ...(visual.segmentacao.unica ? { selection: [{ properties: { singleSelect: literal(true), strictSingleSelect: literal(true) } }] } : {}) });
    corpo.syncGroup = { groupName: visual.segmentacao.grupo, fieldChanges: true, filterChanges: true };
  }
  if (Object.keys(objetos).length) corpo.objects = objetos;
  if (visual.titulo !== undefined) corpo.visualContainerObjects = { title: [{ properties: { show: literal(true), text: literal(visual.titulo) } }] };
  if (visual.tipo !== 'textbox') corpo.drillFilterOtherVisuals = true;
  return { $schema: `${SCHEMA}item/report/definition/visualContainer/2.13.0/schema.json`, name: visual.id, position: { x: visual.x, y: visual.y, z: ordem * 1000, width: visual.w, height: visual.h, tabOrder: ordem * 1000 }, visual: corpo };
}
