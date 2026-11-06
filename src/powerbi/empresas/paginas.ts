import type { Campo, Pagina, Visual } from '../pbir';
import { BLOCOS_PARCERIA, COORTES, comMarca, medidaDoBloco } from './dados';
import { CARTOES, comparacaoDe, detalheDe, indiceDe } from './modelo';

/*
 * As quatro páginas do painel de Empresas no relatório PBIR, em 1280 × 720 (o tamanho padrão do Power BI, que escala para
 * Full HD): título e filtros no alto, os cinco cartões e os gráficos. Cada cartão mostra o número, a comparação e a linha de
 * apoio, como no painel. Só o mapa por município, que não tem visual nativo, vira uma caixa "A montar" com o passo a passo.
 */
const campoMedida = (medida: string, rotulo?: string): Campo => ({ medida, ...(rotulo ? { rotulo } : {}) });
const campoColuna = (tabela: string, coluna: string): Campo => ({ coluna: [tabela, coluna] });
const LARGURA = 1280, ALTURA = 720, MARGEM = 16, VAO = 8, TOPO = 68, ALTURA_CARTAO = 84, CORPO = TOPO + ALTURA_CARTAO + VAO;
export const TAMANHO_DA_PAGINA = { largura: LARGURA, altura: ALTURA };

function cabecalho(pagina: string, titulo: string): Visual[] {
  // Lista suspensa nos recortes; a data de referência aceita uma só escolha e o período é o controle deslizante do parâmetro.
  const filtros: { nome: string; campo: Campo; unica?: boolean; modo?: 'Single' }[] = [
    { nome: 'Regional', campo: campoColuna('Regionais', 'GRE') }, { nome: 'Município', campo: campoColuna('Municípios', 'Município') }, { nome: 'Câmara', campo: campoColuna('Empresas', 'Câmara') },
    { nome: 'Porte', campo: campoColuna('Empresas', 'Porte') }, { nome: 'Situação na Receita', campo: campoColuna('Empresas', 'Situação na Receita') },
    { nome: 'Data de referência', campo: campoColuna('Datas de referência', 'Rótulo'), unica: true }, { nome: 'Período (meses)', campo: campoColuna('Período', 'Meses'), modo: 'Single' },
  ];
  const inicio = 336, largura = Math.floor((LARGURA - MARGEM - inicio - VAO * (filtros.length - 1)) / filtros.length);
  return [
    { id: `${pagina}-titulo`, tipo: 'textbox', x: MARGEM, y: 8, w: 312, h: 52, texto: titulo },
    ...filtros.map(({ nome, campo, unica, modo }, i): Visual => ({ id: `${pagina}-filtro-${i + 1}`, tipo: 'slicer', x: inicio + i * (largura + VAO), y: 8, w: largura, h: 52, titulo: nome,
      papeis: { Values: [campo] }, segmentacao: { grupo: `filtro-${i + 1}`, unica, modo } })),
  ];
}

/** Os cinco cartões da página: o título é o nome do cartão; embaixo do número, a comparação e a linha de apoio. */
function cartoes(pagina: keyof typeof CARTOES): Visual[] {
  const lista = CARTOES[pagina], largura = (LARGURA - 2 * MARGEM - VAO * (lista.length - 1)) / lista.length;
  return lista.map(({ nome, comparacao, detalhe }, i) => ({ id: `${pagina}-cartao-${i + 1}`, tipo: 'multiRowCard', x: Math.round(MARGEM + i * (largura + VAO)), y: TOPO, w: Math.round(largura), h: ALTURA_CARTAO, titulo: nome,
    papeis: { Values: [campoMedida(nome), ...(comparacao ? [campoMedida(comparacaoDe(nome))] : []), ...(detalhe ? [campoMedida(detalheDe(nome))] : [])] } }));
}

/** Lugar de um bloco na grade: coluna, linha, colunas e linhas ocupadas. */
type Lugar = { coluna: number; linha: number; colunas: number; linhas: number };
/** Grade do corpo: colunas e linhas em frações da área abaixo de `topo` (os cartões, por padrão). */
function caixa({ coluna, linha, colunas, linhas }: Lugar, totalColunas = 12, totalLinhas = 2, topo = CORPO) {
  const largura = (LARGURA - 2 * MARGEM - VAO * (totalColunas - 1)) / totalColunas, altura = (ALTURA - MARGEM - topo - VAO * (totalLinhas - 1)) / totalLinhas;
  return { x: Math.round(MARGEM + coluna * (largura + VAO)), y: Math.round(topo + linha * (altura + VAO)), w: Math.round(colunas * largura + (colunas - 1) * VAO), h: Math.round(linhas * altura + (linhas - 1) * VAO) };
}
const lugar = (coluna: number, linha: number, colunas: number, linhas = 1): Lugar => ({ coluna, linha, colunas, linhas });
const MES = campoColuna('Calendário', 'Rótulo');

export const paginasEmpresas: Pagina[] = [
  { id: 'registro', nome: 'Registro e mercado', visuais: [
    ...cabecalho('registro', 'Registro e mercado'),
    ...cartoes('registro'),
    { id: 'registro-mapa', tipo: 'textbox', ...caixa(lugar(0, 0, 4)), titulo: 'Mapa por município',
      texto: 'A montar no Power BI Desktop. Use o Mapa de formas com o mapa dos 645 municípios que vem no pacote, pintado pela parte do mercado que está registrada. O passo a passo está no LEIA-ME.' },
    { id: 'registro-arvore', tipo: 'treemap', ...caixa(lugar(4, 0, 5)), titulo: 'Mercado por câmara e atividade',
      papeis: { Group: [campoColuna('Estabelecimentos', 'Câmara da atividade')], Details: [campoColuna('Estabelecimentos', 'Atividade da lista')], Values: [campoMedida('Estabelecimentos no mercado')] } },
    { id: 'registro-anuidade', tipo: 'donutChart', ...caixa(lugar(9, 0, 3)), titulo: 'Registro e anuidade',
      papeis: { Y: [campoMedida('Registradas sem anuidade vencida', 'Em dia'), campoMedida('Registradas com anuidade vencida', 'Com anuidade vencida')] } },
    { id: 'registro-receita', tipo: 'hundredPercentStackedBarChart', ...caixa(lugar(0, 1, 3)), titulo: 'Receita comparada com o cadastro',
      papeis: { Category: [campoColuna('Estabelecimentos', 'Classe')], Y: [campoMedida('Estabelecimentos do mercado com registro', 'Com registro'), campoMedida('Estabelecimentos do mercado só com histórico', 'Só histórico'),
        campoMedida('Estabelecimentos do mercado sem registro', 'Nunca apareceu')] } },
    // O funil do painel (Sankey): o mercado, a situação no cadastro, o RT das registradas e a ART no período.
    { id: 'registro-funil', tipo: 'clusteredBarChart', ...caixa(lugar(3, 1, 3)), titulo: 'Do mercado à ART', papeis: { Y: [
      campoMedida('Empresas do mercado', 'Universo de engenharia'), campoMedida('Mercado: registro ativo', 'Registro ativo'), campoMedida('Mercado: registro inativo', 'Registro inativo'),
      campoMedida('Mercado: nunca registrada', 'Nunca registrada'), campoMedida('Registradas com RT', 'Com RT'), campoMedida('Registradas sem RT identificado', 'Sem RT identificado'),
      campoMedida('Registradas com ART no período', 'Com ART no período'), campoMedida('Registradas sem ART no período', 'Sem ART no período')] } },
    { id: 'registro-porte', tipo: 'hundredPercentStackedBarChart', ...caixa(lugar(6, 1, 3)), titulo: 'Registradas por câmara e porte',
      papeis: { Category: [campoColuna('Empresas', 'Câmara')], Series: [campoColuna('Empresas', 'Porte')], Y: [campoMedida('Empresas registradas')] } },
    { id: 'registro-capital', tipo: 'pivotTable', ...caixa(lugar(9, 1, 3)), titulo: 'Tempo de registro e capital social',
      papeis: { Rows: [campoColuna('Foto das empresas', 'Tempo de registro')], Columns: [campoColuna('Empresas', 'Capital social')], Values: [campoMedida('Registradas no tempo e no capital', 'Empresas')] } },
  ] },
  { id: 'evolucao', nome: 'Evolução', visuais: [
    ...cabecalho('evolucao', 'Evolução das empresas'),
    ...cartoes('evolucao'),
    { id: 'evolucao-economia', tipo: 'lineChart', ...caixa(lugar(0, 0, 6)), titulo: comMarca.titulo('Economia, empresas abertas e registros'), papeis: { Category: [MES], Y: [
      campoMedida(indiceDe('Emprego formal no mês'), 'Emprego formal'), campoMedida(indiceDe(comMarca.medida('Crédito a empresas de engenharia no mês')), 'Crédito a empresas de engenharia !'),
      campoMedida(indiceDe('Abertas na Receita em 12 meses'), 'Abertas na Receita em 12 meses'), campoMedida(indiceDe('Registradas no Crea-SP em 12 meses'), 'Registros no Crea-SP em 12 meses')] } },
    { id: 'evolucao-calor', tipo: 'pivotTable', ...caixa(lugar(6, 0, 6)), titulo: 'Novos registros por câmara e trimestre',
      papeis: { Rows: [campoColuna('Empresas', 'Câmara')], Columns: [campoColuna('Calendário', 'Trimestre')], Values: [campoMedida('Primeiros registros no mês', 'Primeiros registros')] } },
    { id: 'evolucao-mensal', tipo: 'lineClusteredColumnComboChart', ...caixa(lugar(0, 1, 6)), titulo: 'Entradas e saídas, mês a mês',
      papeis: { Category: [MES], Y: [campoMedida('Entradas no mês', 'Entradas'), campoMedida('Saídas no mês', 'Saídas')], Y2: [campoMedida('Registradas no fim do mês', 'Registradas no fim do mês')] } },
    { id: 'evolucao-abertas', tipo: 'columnChart', ...caixa(lugar(6, 1, 3)), titulo: 'Abertas na Receita, mês a mês',
      papeis: { Category: [MES], Y: [campoMedida('Abertas no mês já registradas', 'Já registradas'), campoMedida('Abertas no mês sem registro', 'Sem registro')] } },
    { id: 'evolucao-permanencia', tipo: 'clusteredBarChart', ...caixa(lugar(9, 1, 3)), titulo: 'Continuam registradas depois de',
      papeis: { Y: COORTES.map(meses => campoMedida(`Continuam registradas depois de ${meses} meses`, `${meses} meses`)) } },
  ] },
  { id: 'rt-art', nome: 'RT e ART', visuais: [
    ...cabecalho('rt-art', 'Responsáveis técnicos e ARTs'),
    ...cartoes('rt-art'),
    { id: 'rt-art-quadro', tipo: 'clusteredBarChart', ...caixa(lugar(0, 0, 6)), titulo: 'Responsáveis técnicos', papeis: { Y: [campoMedida('Registradas com RT', 'Com RT'),
      campoMedida('RT que saiu sem substituto', 'RT saiu sem substituto'), campoMedida('Sem vínculo de RT carregado', 'Sem vínculo carregado'),
      campoMedida('RT com registro profissional cancelado ou interrompido', 'Com RT de registro cancelado ou interrompido')] } },
    { id: 'rt-art-modalidade', tipo: 'clusteredBarChart', ...caixa(lugar(6, 0, 6)), titulo: 'ARTs por modalidade, a cada 100 profissionais',
      papeis: { Category: [campoColuna('Modalidades', 'Rótulo')], Y: [campoMedida('ARTs a cada 100 profissionais ativos', 'ARTs a cada 100 profissionais')] } },
    { id: 'rt-art-mensal', tipo: 'lineChart', ...caixa(lugar(0, 1, 7)), titulo: 'ARTs mês a mês',
      papeis: { Category: [MES], Y: [campoMedida('ARTs no mês', 'ARTs'), campoMedida('ARTs no mesmo mês do ano anterior', 'Um ano antes')] } },
    { id: 'rt-art-camara', tipo: 'hundredPercentStackedBarChart', ...caixa(lugar(7, 1, 5)), titulo: 'Registradas sem ART, por câmara',
      papeis: { Category: [campoColuna('Empresas', 'Câmara')], Y: [campoMedida('Registradas sem ART no período', 'Sem ART'), campoMedida('Registradas com ART no período', 'Com ART')] } },
  ] },
  { id: 'vinculos', nome: 'Vínculos', visuais: [
    ...cabecalho('vinculos', 'Sócios, instalações e empregados'),
    // Sem cartões nesta página: os seis blocos ocupam a área toda abaixo dos filtros, três por linha.
    ...BLOCOS_PARCERIA.map((bloco, i): Visual => ({ id: `vinculos-${bloco.id}`, tipo: 'clusteredBarChart', ...caixa(lugar((i % 3) * 4, Math.floor(i / 3), 4), 12, 2, TOPO),
      titulo: bloco.acordos.length ? comMarca.titulo(bloco.bloco) : bloco.bloco,
      papeis: { Category: [campoColuna('Parcerias', 'Grupo')], Series: [campoColuna('Parcerias', 'Série')], Y: [campoMedida(medidaDoBloco(bloco))] } })),
  ] },
];
