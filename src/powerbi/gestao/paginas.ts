import type { Pagina, Visual } from '../pbir';
import { CARTOES } from './modelo';
import { MES, cabecalho as cabecalhoComum, campoColuna, campoMedida, cartoes as cartoesComuns, caixa, lugar } from '../layout';
import type { Filtro } from '../layout';

/*
 * As três páginas do painel de Atendimento (Protocolos, Equipe e território, Demanda) no relatório PBIR, na grade comum de
 * `layout.ts` (o Financeiro tem modelo próprio em `src/powerbi/financeiro/` desde 07/11/2026). O mapa por município, que não tem
 * visual nativo, vira uma caixa "A montar" com o passo a passo.
 */
/** Como no painel, o tipo de serviço e a unidade de atendimento também filtram (os protocolos; a demanda de fora, não). */
const FILTROS: Filtro[] = [
  { nome: 'Regional', campo: campoColuna('Regionais', 'GRE') }, { nome: 'Município', campo: campoColuna('Municípios', 'Município') },
  { nome: 'Tipo de serviço', campo: campoColuna('Protocolos', 'Tipo') }, { nome: 'Unidade', campo: campoColuna('Protocolos', 'Unidade') },
  { nome: 'Data de referência', campo: campoColuna('Datas de referência', 'Rótulo'), unica: true }, { nome: 'Período (meses)', campo: campoColuna('Período', 'Meses'), modo: 'Single' },
];
const cabecalho = (pagina: string, titulo: string): Visual[] => cabecalhoComum(pagina, titulo, FILTROS);
const FOTO = (coluna: string) => campoColuna('Foto dos protocolos', coluna), PROTOCOLO = (coluna: string) => campoColuna('Protocolos', coluna);
const cartoes = (pagina: keyof typeof CARTOES): Visual[] => cartoesComuns(pagina, CARTOES[pagina]);
const aMontar = (id: string, l: ReturnType<typeof lugar>, titulo: string, texto: string): Visual => ({ id, tipo: 'textbox', ...caixa(l), titulo, texto: `A montar no Power BI Desktop. ${texto} O passo a passo está no LEIA-ME.` });

export const paginasGestao: Pagina[] = [
  { id: 'protocolos', nome: 'Protocolos', visuais: [
    ...cabecalho('protocolos', 'Protocolos'),
    ...cartoes('protocolos'),
    { id: 'protocolos-status', tipo: 'hundredPercentStackedBarChart', ...caixa(lugar(0, 0, 4, 2)), titulo: 'Situação contra o prazo, por status',
      papeis: { Category: [FOTO('Status')], Series: [FOTO('Prazo')], Y: [campoMedida('Abertos no período', 'Protocolos')] } },
    { id: 'protocolos-mensal', tipo: 'lineStackedColumnComboChart', ...caixa(lugar(4, 0, 8)), titulo: 'Protocolos por mês',
      papeis: { Category: [MES], Series: [FOTO('Situação')], Y: [campoMedida('Abertos no mês', 'Protocolos')], Y2: [campoMedida('Abertos no mesmo mês um ano antes', 'Um ano antes')] } },
    // Cada serviço contra o seu prazo; no Desktop, clique no título "Protocolos" para pôr o mais pedido no alto.
    { id: 'protocolos-servicos', tipo: 'tableEx', ...caixa(lugar(4, 1, 5)), titulo: 'Cada serviço contra o seu prazo', papeis: { Values: [PROTOCOLO('Serviço'), PROTOCOLO('Prazo do serviço'),
      campoMedida('Abertos no período', 'Protocolos'), campoMedida('Em andamento', 'Em andamento'), campoMedida('Em andamento fora do prazo', 'Fora do prazo'), campoMedida('Fechados no prazo', 'No prazo'),
      campoMedida('Tempo típico até fechar', 'Tempo típico'), campoMedida('Dias com o solicitante', 'Com o solicitante')] } },
    { id: 'protocolos-motivos', tipo: 'barChart', ...caixa(lugar(9, 1, 3)), titulo: 'Por que há exigência', papeis: { Category: [PROTOCOLO('Motivo da exigência')], Y: [campoMedida('Com exigência', 'Protocolos')] } },
  ] },
  { id: 'equipe', nome: 'Equipe e território', visuais: [
    ...cabecalho('equipe', 'Equipe e território'),
    ...cartoes('equipe'),
    // A linha "Sem atribuição" vem junto; no Desktop, o filtro N superior deixa as pessoas com mais protocolos.
    { id: 'equipe-colaboradores', tipo: 'barChart', ...caixa(lugar(0, 0, 4, 2)), titulo: 'Com quem estão os protocolos',
      papeis: { Category: [campoColuna('Colaboradores', 'Nome')], Series: [FOTO('Situação')], Y: [campoMedida('Abertos no período', 'Protocolos')] } },
    aMontar('equipe-mapa', lugar(4, 0, 4), 'Os 645 municípios', 'Use o Mapa de formas com o mapa dos 645 municípios que vem no pacote, pintado pelos protocolos abertos no período (ou pelos fechados no prazo).'),
    { id: 'equipe-calor', tipo: 'pivotTable', ...caixa(lugar(8, 0, 4)), titulo: 'Fechados no prazo, por regional e trimestre',
      papeis: { Rows: [campoColuna('Regionais', 'GRE')], Columns: [PROTOCOLO('Trimestre')], Values: [campoMedida('Fechados no prazo nos meses do gráfico', 'No prazo')] } },
    { id: 'equipe-canal', tipo: 'hundredPercentStackedBarChart', ...caixa(lugar(4, 1, 4)), titulo: 'Canal pela distância até a unidade',
      papeis: { Category: [PROTOCOLO('Distância do solicitante')], Series: [PROTOCOLO('Canal')], Y: [campoMedida('Abertos no período', 'Protocolos')] } },
    { id: 'equipe-coworking', tipo: 'clusteredBarChart', ...caixa(lugar(8, 1, 4)), titulo: 'Uso dos coworkings',
      papeis: { Category: [campoColuna('Coworkings', 'Unidade')], Y: [campoMedida('Ocupação dos coworkings', 'Ocupação')] } },
  ] },
  { id: 'demanda', nome: 'Demanda', visuais: [
    ...cabecalho('demanda', 'Demanda'),
    ...cartoes('demanda'),
    { id: 'demanda-previsao', tipo: 'columnChart', ...caixa(lugar(0, 0, 6, 2)), titulo: 'Protocolos por mês e os três meses seguintes',
      papeis: { Category: [MES], Y: [campoMedida('Protocolos por mês', 'Abertos'), campoMedida('Previstos por mês', 'Previstos')] } },
    { id: 'demanda-aberturas', tipo: 'clusteredColumnChart', ...caixa(lugar(6, 0, 3)), titulo: 'Aberturas na Receita e pedidos de registro de empresa',
      papeis: { Category: [MES], Y: [campoMedida('Aberturas de engenharia na Receita', 'Aberturas na Receita'), campoMedida('Pedidos de registro de empresa', 'Pedidos de registro')] } },
    { id: 'demanda-formatura', tipo: 'columnChart', ...caixa(lugar(9, 0, 3)), titulo: 'Pedidos de registro de profissional', papeis: { Category: [MES], Y: [campoMedida('Pedidos de registro de profissional', 'Pedidos')] } },
    { id: 'demanda-art', tipo: 'lineClusteredColumnComboChart', ...caixa(lugar(6, 1, 3)), titulo: 'Protocolos de ART por 1.000 ARTs registradas',
      papeis: { Category: [MES], Y: [campoMedida('Protocolos de ART no mês', 'Protocolos de ART')], Y2: [campoMedida('Protocolos de ART por 1.000 ARTs no mês', 'Por 1.000 ARTs')] } },
    { id: 'demanda-ouvidoria', tipo: 'clusteredColumnChart', ...caixa(lugar(9, 1, 3)), titulo: 'Pedidos de informação e ouvidoria, por ano',
      papeis: { Category: [campoColuna('Ouvidoria e informação', 'Ano')], Series: [campoColuna('Ouvidoria e informação', 'Tipo')], Y: [campoMedida('Manifestações e pedidos', 'Quantidade')] } },
  ] },
];
