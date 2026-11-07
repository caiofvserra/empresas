import type { Pagina, Visual } from '../pbir';
import { CARTOES } from './modelo';
import { MES, cabecalho as cabecalhoComum, campoColuna, campoMedida, cartoes as cartoesComuns, caixa, lugar } from '../layout';
import type { Filtro } from '../layout';

/*
 * As páginas dos painéis Financeiro (Receita e Orçamento) e Atendimento (Protocolos, Equipe e território, Demanda) no relatório PBIR, na grade comum de `layout.ts`. Os
 * mapas por município, que não têm visual nativo, viram caixas "A montar" com o passo a passo. Ficam só no painel em HTML: as
 * curvas de recebimento por safra e a despesa publicada por profissional ativo (dados reais de outro arquivo).
 */
const FILTROS: Filtro[] = [
  { nome: 'Regional', campo: campoColuna('Regionais', 'GRE') }, { nome: 'Município', campo: campoColuna('Municípios', 'Município') },
  { nome: 'Data de referência', campo: campoColuna('Datas de referência', 'Rótulo'), unica: true }, { nome: 'Período (meses)', campo: campoColuna('Período', 'Meses'), modo: 'Single' },
];
const cabecalho = (pagina: string, titulo: string): Visual[] => cabecalhoComum(pagina, titulo, FILTROS);
/** No Atendimento, como no painel, o tipo de serviço e a unidade de atendimento também filtram (os protocolos; a demanda de fora, não). */
const FILTROS_ATENDIMENTO: Filtro[] = [...FILTROS.slice(0, 2), { nome: 'Tipo de serviço', campo: campoColuna('Protocolos', 'Tipo') }, { nome: 'Unidade', campo: campoColuna('Protocolos', 'Unidade') }, ...FILTROS.slice(2)];
const cabecalhoAtendimento = (pagina: string, titulo: string): Visual[] => cabecalhoComum(pagina, titulo, FILTROS_ATENDIMENTO);
const FOTO = (coluna: string) => campoColuna('Foto dos protocolos', coluna), PROTOCOLO = (coluna: string) => campoColuna('Protocolos', coluna);
const cartoes = (pagina: keyof typeof CARTOES): Visual[] => cartoesComuns(pagina, CARTOES[pagina]);
const NOME_DO_MES = campoColuna('Calendário', 'Nome do mês');
const aMontar = (id: string, l: ReturnType<typeof lugar>, titulo: string, texto: string): Visual => ({ id, tipo: 'textbox', ...caixa(l), titulo, texto: `A montar no Power BI Desktop. ${texto} O passo a passo está no LEIA-ME.` });

export const paginasGestao: Pagina[] = [
  { id: 'receita', nome: 'Receita', visuais: [
    ...cabecalho('receita', 'Receita e dívida'),
    ...cartoes('receita'),
    { id: 'receita-mensal', tipo: 'columnChart', ...caixa(lugar(0, 0, 5)), titulo: 'Receita por mês e origem',
      papeis: { Category: [MES], Series: [campoColuna('Receitas', 'Origem')], Y: [campoMedida('Receita no mês', 'Receita')] } },
    { id: 'receita-ano', tipo: 'lineChart', ...caixa(lugar(5, 0, 4)), titulo: 'Previsto e realizado no ano', papeis: { Category: [NOME_DO_MES], Y: [
      campoMedida('Receita prevista acumulada no ano', 'Previsto'), campoMedida('Receita realizada acumulada no ano', 'Realizado'), campoMedida('Receita realizada acumulada no ano anterior', 'Realizado no ano anterior')] } },
    aMontar('receita-mapa', lugar(9, 0, 3), 'Dívida de anuidade por município', 'Use o Mapa de formas com o mapa dos 645 municípios que vem no pacote, pintado pelas anuidades vencidas.'),
    { id: 'receita-idade', tipo: 'barChart', ...caixa(lugar(0, 1, 4)), titulo: 'Anuidades vencidas por idade',
      papeis: { Category: [campoColuna('Foto da dívida', 'Idade da anuidade')], Y: [campoMedida('Vencidas abaixo do piso', 'Abaixo do piso'), campoMedida('Vencidas acima do piso', 'Acima do piso')] } },
    { id: 'receita-cascata', tipo: 'clusteredBarChart', ...caixa(lugar(4, 1, 4)), titulo: 'Entrou e saiu da dívida no período', papeis: { Y: [
      campoMedida('Dívida no início do período', 'No início'), campoMedida('Novos vencimentos no período', 'Venceu no período'), campoMedida('Recebido da dívida no período', 'Recebido'),
      campoMedida('Prescrito no período', 'Prescreveu'), campoMedida('Anuidades vencidas', 'No fim')] } },
    { id: 'receita-cnpj', tipo: 'clusteredBarChart', ...caixa(lugar(8, 1, 4)), titulo: 'Dívida das empresas e o CNPJ na Receita',
      papeis: { Category: [campoColuna('Foto da dívida', 'Situação do CNPJ')], Y: [campoMedida('Anuidades vencidas de empresas', 'Vencido')] } },
  ] },
  { id: 'orcamento', nome: 'Orçamento e despesa', visuais: [
    ...cabecalho('orcamento', 'Orçamento e despesa'),
    ...cartoes('orcamento'),
    { id: 'orcamento-ano', tipo: 'lineChart', ...caixa(lugar(0, 0, 3)), titulo: 'Execução do orçamento no ano', papeis: { Category: [NOME_DO_MES], Y: [
      campoMedida('Despesa orçada acumulada no ano', 'Orçado'), campoMedida('Despesa realizada acumulada no ano', 'Realizado'), campoMedida('Despesa realizada acumulada no ano anterior', 'Realizado no ano anterior')] } },
    { id: 'orcamento-fim-meio', tipo: 'columnChart', ...caixa(lugar(3, 0, 3)), titulo: 'Atividade-fim e atividade-meio',
      papeis: { Category: [campoColuna('Calendário', 'Ano')], Series: [campoColuna('Despesas', 'Atividade')], Y: [campoMedida('Despesa realizada', 'Despesa')] } },
    { id: 'orcamento-natureza', tipo: 'clusteredBarChart', ...caixa(lugar(6, 0, 3)), titulo: 'Despesa por natureza',
      papeis: { Category: [campoColuna('Despesas', 'Natureza')], Y: [campoMedida('Orçado em 12 meses', 'Orçado'), campoMedida('Despesa em 12 meses', 'Realizado')] } },
    { id: 'orcamento-gre', tipo: 'clusteredBarChart', ...caixa(lugar(9, 0, 3)), titulo: 'Despesa de fiscalização por GRE',
      papeis: { Category: [campoColuna('Regionais', 'GRE')], Y: [campoMedida('Despesa de fiscalização em 12 meses', 'Fiscalização')] } },
    // Os gastos com nome: quem recebeu as diárias e os fornecedores pela razão social.
    { id: 'orcamento-diarias', tipo: 'tableEx', ...caixa(lugar(0, 1, 4)), titulo: 'Diárias por beneficiário', papeis: { Values: [campoColuna('Pessoas', 'Nome'), campoColuna('Diárias', 'Categoria'), campoColuna('Pessoas', 'Cargo'),
      campoColuna('Pessoas', 'Lotação'), campoMedida('Diárias e passagens', 'Valor'), campoMedida('Diárias pagas em 12 meses', 'Diárias'), campoMedida('Meses com diária', 'Meses'), campoMedida('Quilômetros em 12 meses', 'Quilômetros')] } },
    // Matriz: cada fornecedor abre (+) nos empenhos dos 12 meses, com o contrato de cada um, como o detalhe do painel.
    { id: 'orcamento-fornecedores', tipo: 'pivotTable', ...caixa(lugar(4, 1, 3)), titulo: 'Maiores fornecedores',
      papeis: { Rows: [campoColuna('Fornecedores', 'Nome'), campoColuna('Empenhos', 'Empenho')], Values: [campoMedida('Empenhado em 12 meses', 'Empenhado'), campoMedida('Pago em 12 meses', 'Pago')] } },
    { id: 'orcamento-contratos', tipo: 'columnChart', ...caixa(lugar(7, 1, 3)), titulo: 'Contratos que terminam nos próximos 12 meses',
      papeis: { Category: [MES], Y: [campoMedida('Contratos que terminam no mês', 'Contratos')] } },
    // Cada função abre (+) na lista dos servidores dela, pelo nome, como o detalhe do painel.
    { id: 'orcamento-pessoal', tipo: 'pivotTable', ...caixa(lugar(10, 1, 2)), titulo: 'Pessoal por função',
      papeis: { Rows: [campoColuna('Pessoas', 'Função'), campoColuna('Pessoas', 'Nome')], Values: [campoMedida('Servidores efetivos', 'Efetivos'), campoMedida('Servidores comissionados', 'Comissionados'), campoMedida('Custo mensal do pessoal', 'Custo por mês')] } },
  ] },
  /* ---------- Atendimento: três páginas, com o tipo de serviço e a unidade no alto ---------- */
  { id: 'protocolos', nome: 'Protocolos', visuais: [
    ...cabecalhoAtendimento('protocolos', 'Protocolos'),
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
    ...cabecalhoAtendimento('equipe', 'Equipe e território'),
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
    ...cabecalhoAtendimento('demanda', 'Demanda'),
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
