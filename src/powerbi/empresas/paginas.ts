import type { Campo, Pagina, Visual } from '../pbir';
import { BLOCOS_PARCERIA, medidaDoBloco } from './dados';
import { CARTOES, rotuloDaVariacao, variacaoDe } from './modelo';

/*
 * As quatro páginas do painel de Empresas no relatório PBIR, em 1280 × 720 (o tamanho padrão do Power BI, que escala para
 * Full HD): título e filtros no alto, os cinco cartões (o número e, embaixo, a variação em um ano) e os gráficos. O bloco do protótipo que não tem visual nativo vira
 * uma caixa de texto "A montar" com o que falta e o caminho no Desktop.
 */
const med = (medida: string): Campo => ({ medida }), col = (tabela: string, coluna: string): Campo => ({ coluna: [tabela, coluna] });
const L = 1280, A = 720, M = 16, G = 8, TOPO = 68, ALTURA_CARTAO = 84, CORPO = TOPO + ALTURA_CARTAO + G;
export const TAMANHO_DA_PAGINA = { largura: L, altura: A };

function cabecalho(pagina: string, titulo: string): Visual[] {
  // Lista suspensa nos recortes; a data de referência aceita uma só escolha e o período é o controle deslizante do parâmetro.
  const filtros: { nome: string; campo: Campo; unica?: boolean; modo?: 'Single' }[] = [
    { nome: 'Regional', campo: col('Regionais', 'GRE') }, { nome: 'Município', campo: col('Municípios', 'Município') }, { nome: 'Câmara', campo: col('Empresas', 'Câmara') },
    { nome: 'Porte', campo: col('Empresas', 'Porte') }, { nome: 'Situação na Receita', campo: col('Empresas', 'Situação na Receita') },
    { nome: 'Data de referência', campo: col('Datas de referência', 'Rótulo'), unica: true }, { nome: 'Período (meses)', campo: col('Período', 'Meses'), modo: 'Single' },
  ];
  const x0 = 336, largura = Math.floor((L - M - x0 - G * (filtros.length - 1)) / filtros.length);
  return [
    { id: `${pagina}-titulo`, tipo: 'textbox', x: M, y: 8, w: 312, h: 52, texto: titulo },
    ...filtros.map(({ nome, campo, unica, modo }, i): Visual => ({ id: `${pagina}-filtro-${i + 1}`, tipo: 'slicer', x: x0 + i * (largura + G), y: 8, w: largura, h: 52, titulo: nome,
      papeis: { Values: [campo] }, segmentacao: { grupo: `filtro-${i + 1}`, unica, modo } })),
  ];
}

/** Os cinco cartões da página: cartão de várias linhas com o número e, quando o painel mostra, a variação em um ano. */
function cartoes(pagina: keyof typeof CARTOES): Visual[] {
  const lista = CARTOES[pagina], largura = (L - 2 * M - G * (lista.length - 1)) / lista.length;
  return lista.map(({ nome, tipo }, i) => ({ id: `${pagina}-cartao-${i + 1}`, tipo: 'multiRowCard', x: Math.round(M + i * (largura + G)), y: TOPO, w: Math.round(largura), h: ALTURA_CARTAO,
    papeis: { Values: [med(nome), ...(tipo ? [{ ...med(variacaoDe(nome)), rotulo: rotuloDaVariacao(tipo) }] : [])] } }));
}

/** Lugar de um bloco na grade: coluna, linha, colunas e linhas ocupadas. */
type Lugar = { coluna: number; linha: number; colunas: number; linhas: number };
/** Grade do corpo: colunas e linhas em frações da área abaixo de `topo` (os cartões, por padrão). */
function caixa({ coluna, linha, colunas, linhas }: Lugar, totalColunas = 12, totalLinhas = 2, topo = CORPO) {
  const largura = (L - 2 * M - G * (totalColunas - 1)) / totalColunas, altura = (A - M - topo - G * (totalLinhas - 1)) / totalLinhas;
  return { x: Math.round(M + coluna * (largura + G)), y: Math.round(topo + linha * (altura + G)), w: Math.round(colunas * largura + (colunas - 1) * G), h: Math.round(linhas * altura + (linhas - 1) * G) };
}
const em = (coluna: number, linha: number, colunas: number, linhas = 1): Lugar => ({ coluna, linha, colunas, linhas });

const aMontar = (id: string, titulo: string, falta: string, lugar: Lugar): Visual =>
  ({ id, tipo: 'textbox', ...caixa(lugar), titulo, texto: `A montar no Power BI Desktop. ${falta}` });

export const paginasEmpresas: Pagina[] = [
  { id: 'registro', nome: 'Registro e mercado', visuais: [
    ...cabecalho('registro', 'Registro e mercado'),
    ...cartoes('registro'),
    aMontar('registro-mapa', 'Mapa por município', 'Use o Mapa de formas com o mapa dos 645 municípios que vem no pacote, pintado pela parte do mercado que está registrada. O passo a passo está no LEIA-ME.', em(0, 0, 4)),
    { id: 'registro-arvore', tipo: 'treemap', ...caixa(em(4, 0, 5)), titulo: 'Mercado por câmara e atividade',
      papeis: { Group: [col('Estabelecimentos', 'Câmara da atividade')], Details: [col('Estabelecimentos', 'Atividade da lista')], Values: [med('Estabelecimentos no mercado')] } },
    { id: 'registro-anuidade', tipo: 'donutChart', ...caixa(em(9, 0, 3)), titulo: 'Registro e anuidade', papeis: { Y: [med('Registradas sem anuidade vencida'), med('Registradas com anuidade vencida')] } },
    { id: 'registro-receita', tipo: 'hundredPercentStackedBarChart', ...caixa(em(0, 1, 4)), titulo: 'Receita comparada com o cadastro',
      papeis: { Category: [col('Estabelecimentos', 'Classe')], Y: [med('Estabelecimentos do mercado com registro'), med('Estabelecimentos do mercado só com histórico'), med('Estabelecimentos do mercado sem registro')] } },
    { id: 'registro-funil', tipo: 'clusteredBarChart', ...caixa(em(4, 1, 3)), titulo: 'Do registro à ART', papeis: { Y: [med('Empresas registradas'), med('Registradas com RT'), med('Registradas com ART no período')] } },
    { id: 'registro-porte', tipo: 'hundredPercentStackedBarChart', ...caixa(em(7, 1, 3)), titulo: 'Registradas por câmara e porte',
      papeis: { Category: [col('Empresas', 'Câmara')], Series: [col('Empresas', 'Porte')], Y: [med('Empresas registradas')] } },
    aMontar('registro-capital', 'Tempo de registro e capital social', 'Matriz com o tempo desde o primeiro registro nas linhas e a faixa do capital social nas colunas. Falta levar as duas faixas para a tabela Empresas.', em(10, 1, 2)),
  ] },
  { id: 'evolucao', nome: 'Evolução', visuais: [
    ...cabecalho('evolucao', 'Evolução das empresas'),
    ...cartoes('evolucao'),
    aMontar('evolucao-economia', 'Economia, empresas abertas e registros !', 'Quatro séries com o primeiro mês igual a 100: emprego formal, crédito para obras, abertas na Receita e registros. O crédito vem do Banco Central e depende de acordo; falta a tabela de demonstração dele.', em(0, 0, 6)),
    { id: 'evolucao-calor', tipo: 'pivotTable', ...caixa(em(6, 0, 6)), titulo: 'Novos registros por câmara e trimestre',
      papeis: { Rows: [col('Empresas', 'Câmara')], Columns: [col('Calendário', 'Trimestre')], Values: [med('Primeiros registros no mês')] } },
    { id: 'evolucao-mensal', tipo: 'lineClusteredColumnComboChart', ...caixa(em(0, 1, 8)), titulo: 'Entradas e saídas, mês a mês',
      papeis: { Category: [col('Calendário', 'Rótulo')], Y: [med('Entradas no mês'), med('Saídas no mês')], Y2: [med('Registradas no fim do mês')] } },
    aMontar('evolucao-permanencia', 'Abertas na Receita e permanência', 'Aberturas por mês com a parte que já se registrou, e a permanência de quem estava registrado há 3, 6 e 12 meses. Os cartões já trazem o total do período e a permanência de 12 meses.', em(8, 1, 4)),
  ] },
  { id: 'rt-art', nome: 'RT e ART', visuais: [
    ...cabecalho('rt-art', 'Responsáveis técnicos e ARTs'),
    ...cartoes('rt-art'),
    { id: 'rt-art-quadro', tipo: 'hundredPercentStackedBarChart', ...caixa(em(0, 0, 6)), titulo: 'Responsáveis técnicos',
      papeis: { Y: [med('Registradas com RT'), med('RT que saiu sem substituto'), med('Sem vínculo de RT carregado')] } },
    aMontar('rt-art-modalidade', 'ARTs por modalidade, a cada 100 profissionais', 'Falta a foto dos profissionais ativos por modalidade, que vem do painel de Profissionais.', em(6, 0, 6)),
    { id: 'rt-art-mensal', tipo: 'lineChart', ...caixa(em(0, 1, 7)), titulo: 'ARTs mês a mês', papeis: { Category: [col('Calendário', 'Rótulo')], Y: [med('ARTs no mês'), med('ARTs no mesmo mês do ano anterior')] } },
    { id: 'rt-art-camara', tipo: 'hundredPercentStackedBarChart', ...caixa(em(7, 1, 5)), titulo: 'Registradas sem ART, por câmara',
      papeis: { Category: [col('Empresas', 'Câmara')], Y: [med('Registradas sem ART no período'), med('Registradas com ART no período')] } },
  ] },
  { id: 'vinculos', nome: 'Vínculos', visuais: [
    ...cabecalho('vinculos', 'Sócios, instalações e empregados'),
    // Sem cartões nesta página: os seis blocos ocupam a área toda abaixo dos filtros, três por linha.
    ...BLOCOS_PARCERIA.map((bloco, i): Visual => ({ id: `vinculos-${bloco.id}`, tipo: 'clusteredBarChart', ...caixa(em((i % 3) * 4, Math.floor(i / 3), 4), 12, 2, TOPO),
      titulo: bloco.acordo ? `${bloco.bloco} !` : bloco.bloco, papeis: { Category: [col('Parcerias', 'Grupo')], Series: [col('Parcerias', 'Série')], Y: [med(medidaDoBloco(bloco))] } })),
  ] },
];
