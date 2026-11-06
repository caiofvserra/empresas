import type { Campo, Pagina, Visual } from '../pbir';

/*
 * As quatro páginas do painel de Empresas no relatório PBIR, em 1280 × 720 (o tamanho padrão do Power BI, que escala para
 * Full HD): título e filtros no alto, os cinco cartões e os gráficos. O bloco do protótipo que não tem visual nativo vira
 * uma caixa de texto "A montar" com o que falta e o caminho no Desktop.
 */
const med = (medida: string): Campo => ({ medida }), col = (tabela: string, coluna: string): Campo => ({ coluna: [tabela, coluna] });
const L = 1280, M = 16, G = 8, TOPO = 68, ALTURA_CARTAO = 84, CORPO = TOPO + ALTURA_CARTAO + G;

function cabecalho(pagina: string, titulo: string): Visual[] {
  const filtros: [string, Campo, boolean][] = [
    ['Regional', col('Regionais', 'GRE'), false], ['Município', col('Municípios', 'Município'), false], ['Câmara', col('Empresas', 'Câmara'), false],
    ['Porte', col('Empresas', 'Porte'), false], ['Situação na Receita', col('Empresas', 'Situação na Receita'), false],
    ['Data de referência', col('Datas de referência', 'Rótulo'), true], ['Período (meses)', col('Período', 'Meses'), true],
  ];
  const x0 = 336, largura = Math.floor((L - M - x0 - G * (filtros.length - 1)) / filtros.length);
  return [
    { id: `${pagina}-titulo`, tipo: 'textbox', x: M, y: 8, w: 312, h: 52, texto: titulo },
    ...filtros.map(([nome, campo, unica], i): Visual => ({ id: `${pagina}-filtro-${i + 1}`, tipo: 'slicer', x: x0 + i * (largura + G), y: 8, w: largura, h: 52, titulo: nome,
      papeis: { Values: [campo] }, segmentacao: { grupo: `filtro-${i + 1}`, unica } })),
  ];
}

function cartoes(pagina: string, medidas: string[]): Visual[] {
  const largura = (L - 2 * M - G * (medidas.length - 1)) / medidas.length;
  return medidas.map((medida, i) => ({ id: `${pagina}-cartao-${i + 1}`, tipo: 'card', x: Math.round(M + i * (largura + G)), y: TOPO, w: Math.round(largura), h: ALTURA_CARTAO, papeis: { Values: [med(medida)] } }));
}

/** Grade do corpo: colunas e linhas em frações da área abaixo dos cartões. */
function caixa(coluna: number, linha: number, colunas: number, linhas: number, totalColunas = 12, totalLinhas = 2) {
  const largura = (L - 2 * M - G * (totalColunas - 1)) / totalColunas, altura = (720 - M - CORPO - G * (totalLinhas - 1)) / totalLinhas;
  return { x: Math.round(M + coluna * (largura + G)), y: Math.round(CORPO + linha * (altura + G)), w: Math.round(colunas * largura + (colunas - 1) * G), h: Math.round(linhas * altura + (linhas - 1) * G) };
}

const aMontar = (id: string, titulo: string, falta: string, onde: [number, number, number, number]): Visual =>
  ({ id, tipo: 'textbox', ...caixa(...onde), titulo, texto: `A montar no Power BI Desktop. ${falta}` });

export const paginasEmpresas: Pagina[] = [
  { id: 'registro', nome: 'Registro e mercado', visuais: [
    ...cabecalho('registro', 'Registro e mercado'),
    ...cartoes('registro', ['Empresas registradas', 'Parte do mercado que está registrada', 'Atividade obrigatória e nenhum registro', 'Registradas em dia com a anuidade', 'Registradas com cadastro incompleto']),
    aMontar('registro-mapa', 'Mapa por município', 'Visual Mapa de formas (Shape Map) com o mapa personalizado mapas/sp-municipios.json (Formatar > Configurações do mapa > Mapa personalizado). Local: Municípios[Município]; saturação de cor: a medida do indicador escolhido, como Parte do mercado que está registrada.', [0, 0, 4, 1]),
    { id: 'registro-arvore', tipo: 'treemap', ...caixa(4, 0, 5, 1), titulo: 'Mercado por câmara e atividade',
      papeis: { Group: [col('Estabelecimentos', 'Câmara da atividade')], Details: [col('Estabelecimentos', 'Atividade da lista')], Values: [med('Estabelecimentos no mercado')] } },
    { id: 'registro-anuidade', tipo: 'donutChart', ...caixa(9, 0, 3, 1), titulo: 'Registradas pela anuidade', papeis: { Y: [med('Registradas sem anuidade vencida'), med('Registradas com anuidade vencida')] } },
    { id: 'registro-receita', tipo: 'hundredPercentStackedBarChart', ...caixa(0, 1, 4, 1), titulo: 'Receita comparada com o cadastro',
      papeis: { Category: [col('Estabelecimentos', 'Classe')], Y: [med('Estabelecimentos do mercado com registro'), med('Estabelecimentos do mercado só com histórico'), med('Estabelecimentos do mercado sem registro')] } },
    { id: 'registro-funil', tipo: 'clusteredBarChart', ...caixa(4, 1, 3, 1), titulo: 'Do registro à ART', papeis: { Y: [med('Empresas registradas'), med('Registradas com RT'), med('Registradas com ART no período')] } },
    { id: 'registro-porte', tipo: 'hundredPercentStackedBarChart', ...caixa(7, 1, 3, 1), titulo: 'Registradas por câmara e porte',
      papeis: { Category: [col('Empresas', 'Câmara')], Series: [col('Empresas', 'Porte')], Y: [med('Empresas registradas')] } },
    aMontar('registro-capital', 'Tempo de registro e capital social', 'Matriz com o tempo desde o primeiro registro nas linhas e a faixa do capital social nas colunas. Falta levar as duas faixas para a tabela Empresas.', [10, 1, 2, 1]),
  ] },
  { id: 'evolucao', nome: 'Evolução', visuais: [
    ...cabecalho('evolucao', 'Evolução das empresas'),
    ...cartoes('evolucao', ['Empresas que entraram na base', 'Empresas que saíram da base', 'Empresas de engenharia abertas no período', 'Continuam registradas depois de 12 meses', 'Emprego formal em engenharia']),
    aMontar('evolucao-economia', 'Economia, empresas abertas e registros', 'Quatro séries com o primeiro mês igual a 100 (emprego formal, crédito "!", abertas na Receita e registros). Falta a tabela do crédito do Banco Central, que depende de acordo.', [0, 0, 6, 1]),
    { id: 'evolucao-calor', tipo: 'pivotTable', ...caixa(6, 0, 6, 1), titulo: 'Novos registros por câmara e trimestre',
      papeis: { Rows: [col('Empresas', 'Câmara')], Columns: [col('Calendário', 'Trimestre')], Values: [med('Primeiros registros no mês')] } },
    { id: 'evolucao-mensal', tipo: 'lineClusteredColumnComboChart', ...caixa(0, 1, 8, 1), titulo: 'Entradas e saídas, mês a mês',
      papeis: { Category: [col('Calendário', 'Rótulo')], Y: [med('Entradas no mês'), med('Saídas no mês')], Y2: [med('Registradas no fim do mês')] } },
    aMontar('evolucao-permanencia', 'Abertas na Receita e permanência', 'Aberturas por mês com a parte que já se registrou, e a permanência de quem estava registrado há 3, 6 e 12 meses. Os cartões já trazem o total do período e a permanência de 12 meses.', [8, 1, 4, 1]),
  ] },
  { id: 'rt-art', nome: 'RT e ART', visuais: [
    ...cabecalho('rt-art', 'Responsáveis técnicos e ARTs'),
    ...cartoes('rt-art', ['Empresas com responsável técnico', 'RT que saiu sem substituto', 'ARTs de empresas', 'Valor declarado em ART', 'Registradas sem nenhuma ART']),
    { id: 'rt-art-quadro', tipo: 'hundredPercentStackedBarChart', ...caixa(0, 0, 6, 1), titulo: 'Responsáveis técnicos',
      papeis: { Y: [med('Registradas com RT'), med('RT que saiu sem substituto'), med('Sem vínculo de RT carregado')] } },
    aMontar('rt-art-modalidade', 'ARTs por modalidade, a cada 100 profissionais', 'Falta a foto dos profissionais ativos por modalidade, que vem do painel de Profissionais.', [6, 0, 6, 1]),
    { id: 'rt-art-mensal', tipo: 'lineChart', ...caixa(0, 1, 7, 1), titulo: 'ARTs mês a mês', papeis: { Category: [col('Calendário', 'Rótulo')], Y: [med('ARTs no mês'), med('ARTs no mesmo mês do ano anterior')] } },
    { id: 'rt-art-camara', tipo: 'hundredPercentStackedBarChart', ...caixa(7, 1, 5, 1), titulo: 'Registradas sem ART, por câmara',
      papeis: { Category: [col('Empresas', 'Câmara')], Y: [med('Registradas sem ART no período'), med('Registradas com ART no período')] } },
  ] },
  { id: 'vinculos', nome: 'Vínculos', visuais: [
    ...cabecalho('vinculos', 'Sócios, instalações e empregados'),
    ...([['socios', 'Sócios que são profissionais', '! Sócios que são profissionais'], ['nome', 'Nome com engenharia e diretoria', '! Nome com engenharia e diretoria'],
      ['instalacoes', 'Usinas, postos, minas e financiamentos', 'Usinas, postos, minas e financiamentos'], ['empregados', 'Empregados técnicos por empresa', '! Empregados técnicos por empresa'],
      ['credenciadas', 'Credenciadas no DETRAN-SP e no INMETRO', '! Credenciadas no DETRAN-SP e no INMETRO'], ['jucesp', 'Engenharia incluída no contrato social', '! Engenharia incluída no contrato social']] as const)
      .map(([id, titulo, medida], i): Visual => ({ id: `vinculos-${id}`, tipo: 'clusteredBarChart', ...caixa((i % 3) * 4, Math.floor(i / 3), 4, 1, 12, 2), y: Math.floor(i / 3) === 0 ? TOPO : Math.round(TOPO + (720 - M - TOPO - G) / 2 + G), h: Math.round((720 - M - TOPO - G) / 2),
        titulo: medida.startsWith('!') ? `${titulo} !` : titulo, papeis: { Category: [col('Parcerias', 'Grupo')], Series: [col('Parcerias', 'Série')], Y: [med(medida)] } })),
  ] },
];
