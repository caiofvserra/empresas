import type { Pagina, Visual } from '../pbir';
import { CARTOES } from './modelo';
import { MES, cabecalho as cabecalhoComum, campoColuna, campoMedida, cartoes as cartoesComuns, caixa, lugar } from '../layout';
import type { Filtro } from '../layout';

/*
 * As cinco páginas do painel de Gestão do Conselho (07/11/2026) no relatório PBIR, na grade comum de `layout.ts`: Colegiado,
 * Processos, Conselheiros, Decisões e Representação, com os mesmos cartões do painel. O gráfico de dispersão da carga e do tempo de
 * relato vira uma tabela com cada conselheiro; o caminho do processo, barras com um marco em cada uma. Os nomes de quem está com o
 * processo, de quem recebeu diária e de quem propôs o repasse aparecem nas tabelas.
 */
const FILTROS: Filtro[] = [
  { nome: 'Regional', campo: campoColuna('Regionais', 'GRE') }, { nome: 'Município', campo: campoColuna('Municípios', 'Município') },
  { nome: 'Colegiado', campo: campoColuna('Colegiados', 'Nome'), unica: true },
  { nome: 'Data de referência', campo: campoColuna('Datas de referência', 'Rótulo'), unica: true }, { nome: 'Período (meses)', campo: campoColuna('Período', 'Meses'), modo: 'Single' },
];
const cabecalho = (pagina: string, titulo: string): Visual[] => cabecalhoComum(pagina, titulo, FILTROS);
const cartoes = (pagina: keyof typeof CARTOES): Visual[] => cartoesComuns(pagina, CARTOES[pagina]);
const FILA = (coluna: string) => campoColuna('Foto da fila', coluna), TRAMITACAO = (coluna: string) => campoColuna('Tramitações', coluna), AUTOS = (coluna: string) => campoColuna('Autos', coluna);
const NOME = campoColuna('Pessoas', 'Nome'), CAMARA = campoColuna('Foto das câmaras', 'Câmara');

export const paginasConselho: Pagina[] = [
  { id: 'colegiado', nome: 'Colegiado', visuais: [
    ...cabecalho('colegiado', 'Colegiado'),
    ...cartoes('colegiado'),
    // Cada pessoa pelo alerta dos processos que estão com ela; no Desktop, o filtro N superior deixa as dez com mais processos.
    { id: 'colegiado-posse', tipo: 'barChart', ...caixa(lugar(0, 0, 4, 2)), titulo: 'Com quem estão os processos', papeis: { Category: [NOME], Series: [FILA('Alerta')], Y: [campoMedida('Processos na fila', 'Processos')] } },
    { id: 'colegiado-status', tipo: 'donutChart', ...caixa(lugar(4, 0, 3)), titulo: 'Em que status do Votenet', papeis: { Category: [FILA('Status')], Y: [campoMedida('Processos na fila', 'Processos')] } },
    { id: 'colegiado-tercos', tipo: 'clusteredBarChart', ...caixa(lugar(7, 0, 5)), titulo: 'Terços do mandato',
      papeis: { Category: [campoColuna('Conselheiros', 'Terço')], Series: [campoColuna('Conselheiros', 'Natureza')], Y: [campoMedida('Conselheiros no terço', 'Conselheiros')] } },
    { id: 'colegiado-mensal', tipo: 'lineClusteredColumnComboChart', ...caixa(lugar(4, 1, 5)), titulo: 'Pautados e votados por mês',
      papeis: { Category: [MES], Y: [campoMedida('Pautados no mês', 'Pautados'), campoMedida('Votados no mês', 'Votados')], Y2: [campoMedida('Votados no mesmo mês do ano anterior', 'Votados um ano antes')] } },
    { id: 'colegiado-caminho', tipo: 'clusteredBarChart', ...caixa(lugar(9, 1, 3)), titulo: 'O caminho do processo no período', papeis: { Y: [
      campoMedida('Caminho: recebidos nas câmaras', 'Recebidos nas câmaras'), campoMedida('Caminho: votados nas câmaras', 'Votados nas câmaras'), campoMedida('Caminho: recursos ao Plenário', 'Recursos ao Plenário'),
      campoMedida('Caminho: votados no Plenário', 'Votados no Plenário'), campoMedida('Caminho: recursos ao Confea', 'Recursos ao Confea'), campoMedida('Caminho: transitados em julgado', 'Transitados em julgado'), campoMedida('Caminho: multas pagas', 'Multas pagas')] } },
  ] },
  { id: 'processos', nome: 'Processos', visuais: [
    ...cabecalho('processos', 'Processos'),
    ...cartoes('processos'),
    // A fila com o nome de quem está com cada processo; no Desktop, clique no título "Dias no status" para pôr o mais parado no alto.
    { id: 'processos-fila', tipo: 'tableEx', ...caixa(lugar(0, 0, 6, 2)), titulo: 'A fila, do mais parado ao menos', papeis: { Values: [TRAMITACAO('Processo'), campoColuna('Colegiados', 'Nome'), FILA('Status'), NOME, FILA('Alerta'),
      campoMedida('Dias no status', 'Dias no status'), campoMedida('Dias desde a entrada', 'Dias desde a entrada')] } },
    { id: 'processos-calor', tipo: 'pivotTable', ...caixa(lugar(6, 0, 6)), titulo: 'Há quanto tempo estão no status', papeis: { Rows: [FILA('Status')], Columns: [FILA('Tempo no status')], Values: [campoMedida('Processos na fila', 'Processos')] } },
    { id: 'processos-prescricao', tipo: 'barChart', ...caixa(lugar(6, 1, 3)), titulo: 'Perto da prescrição, por relator', papeis: { Category: [TRAMITACAO('Relator')], Series: [FILA('Prazo da prescrição')], Y: [campoMedida('Perto da prescrição', 'Autos')] } },
    { id: 'processos-cadastro', tipo: 'columnChart', ...caixa(lugar(9, 1, 3)), titulo: 'Do GovAdm ao Votenet', papeis: { Category: [TRAMITACAO('Tempo até o Votenet')], Y: [campoMedida('Cadastrados no Votenet', 'Processos')] } },
  ] },
  { id: 'conselheiros', nome: 'Conselheiros', visuais: [
    ...cabecalho('conselheiros', 'Conselheiros'),
    ...cartoes('conselheiros'),
    { id: 'conselheiros-carga', tipo: 'tableEx', ...caixa(lugar(0, 0, 5, 2)), titulo: 'Carga e presença de cada conselheiro', papeis: { Values: [NOME, campoColuna('Pessoas', 'Detalhe'),
      campoMedida('Processos com o conselheiro', 'Processos com ele'), campoMedida('Presença nas sessões', 'Presença')] } },
    { id: 'conselheiros-presenca', tipo: 'barChart', ...caixa(lugar(5, 0, 3)), titulo: 'Menor presença nas sessões', papeis: { Category: [NOME], Y: [campoMedida('Presença nas sessões', 'Presença')] } },
    { id: 'conselheiros-diarias', tipo: 'tableEx', ...caixa(lugar(8, 0, 4)), titulo: 'Diárias por conselheiro', papeis: { Values: [NOME, campoColuna('Pessoas', 'Detalhe'),
      campoMedida('Diárias de conselheiros em 12 meses', 'Diárias'), campoMedida('Meses com diária de conselheiro', 'Meses'), campoMedida('Valor das diárias de conselheiros', 'Valor')] } },
    { id: 'conselheiros-ia', tipo: 'lineChart', ...caixa(lugar(5, 1, 4)), titulo: 'Relato com e sem IA, por trimestre',
      papeis: { Category: [TRAMITACAO('Trimestre do relato')], Y: [campoMedida('Relato com IA no trimestre', 'Com IA'), campoMedida('Relato sem IA no trimestre', 'Sem IA')] } },
    { id: 'conselheiros-desvios', tipo: 'clusteredBarChart', ...caixa(lugar(9, 1, 3)), titulo: 'Vista, impedimento e diligência',
      papeis: { Category: [campoColuna('Colegiados', 'Nome')], Y: [campoMedida('Pedidos de vista', 'Pedido de vista'), campoMedida('Impedimentos', 'Impedimento'), campoMedida('Diligências', 'Diligência')] } },
  ] },
  { id: 'decisoes', nome: 'Decisões', visuais: [
    ...cabecalho('decisoes', 'Decisões'),
    ...cartoes('decisoes'),
    { id: 'decisoes-desfecho', tipo: 'hundredPercentStackedBarChart', ...caixa(lugar(0, 0, 6)), titulo: 'O que as câmaras decidiram nos autos', papeis: { Category: [AUTOS('Câmara')], Series: [AUTOS('Desfecho')], Y: [campoMedida('Autos votados', 'Autos')] } },
    { id: 'decisoes-alineas', tipo: 'clusteredBarChart', ...caixa(lugar(6, 0, 6)), titulo: 'Multas por infração do art. 73', papeis: { Category: [AUTOS('Infração')], Y: [campoMedida('Multas aplicadas', 'Multas')] } },
    { id: 'decisoes-plenario', tipo: 'barChart', ...caixa(lugar(0, 1, 6)), titulo: 'O Plenário mantém ou reforma',
      papeis: { Category: [TRAMITACAO('Câmara de origem')], Series: [TRAMITACAO('Decisão do Plenário')], Y: [campoMedida('Recursos votados no Plenário por câmara', 'Recursos')] } },
    { id: 'decisoes-destino', tipo: 'columnChart', ...caixa(lugar(6, 1, 6)), titulo: 'O que aconteceu com as multas', papeis: { Category: [AUTOS('Ano da decisão')], Y: [
      campoMedida('Multa paga', 'Paga'), campoMedida('Multa em cobrança', 'Em cobrança'), campoMedida('Multa em recurso', 'Em recurso'), campoMedida('Multa anulada no recurso', 'Anulada no recurso')] } },
  ] },
  { id: 'representacao', nome: 'Representação', visuais: [
    ...cabecalho('representacao', 'Representação'),
    ...cartoes('representacao'),
    { id: 'representacao-cadeiras', tipo: 'clusteredBarChart', ...caixa(lugar(0, 0, 6)), titulo: 'Cadeiras e profissionais de cada câmara',
      papeis: { Category: [CAMARA], Y: [campoMedida('Parte das cadeiras', 'Cadeiras no Plenário'), campoMedida('Parte dos profissionais ativos', 'Profissionais ativos')] } },
    { id: 'representacao-mulheres', tipo: 'clusteredBarChart', ...caixa(lugar(6, 0, 6)), titulo: 'Mulheres no Conselho e no registro',
      papeis: { Category: [CAMARA], Y: [campoMedida('Mulheres entre os conselheiros', 'No Conselho'), campoMedida('Mulheres no registro', 'No registro')] } },
    { id: 'representacao-organizacoes', tipo: 'barChart', ...caixa(lugar(0, 1, 6)), titulo: 'Organizações com cadeira e o que receberam',
      papeis: { Category: [campoColuna('Organizações', 'Sigla')], Series: [campoColuna('Pagamentos dos repasses', 'Canal')], Y: [campoMedida('Repassado em 12 meses a quem tem cadeira', 'Recebido em 12 meses')] } },
    { id: 'representacao-deliberacoes', tipo: 'tableEx', ...caixa(lugar(6, 1, 6)), titulo: 'Deliberações das atas', papeis: { Values: [campoColuna('Deliberações', 'Data'), campoColuna('Deliberações', 'Nome da organização'), campoColuna('Deliberações', 'Canal'),
      campoColuna('Deliberações', 'Proposta por'), campoColuna('Deliberações', 'Quem propôs é da organização'), campoMedida('Valor das deliberações', 'Valor')] } },
  ] },
];
