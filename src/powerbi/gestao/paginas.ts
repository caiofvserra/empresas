import type { Pagina, Visual } from '../pbir';
import { CARTOES } from './modelo';
import { MES, cabecalho as cabecalhoComum, campoColuna, campoMedida, cartoes as cartoesComuns, caixa, lugar } from '../layout';
import type { Filtro } from '../layout';

/*
 * As três páginas dos painéis Financeiro (Receita e Orçamento) e Atendimento no relatório PBIR, na grade comum de `layout.ts`. Os
 * mapas por município, que não têm visual nativo, viram caixas "A montar" com o passo a passo. Ficam só no painel em HTML: as
 * curvas de recebimento por safra e a despesa publicada por profissional ativo (dados reais de outro arquivo).
 */
const FILTROS: Filtro[] = [
  { nome: 'Regional', campo: campoColuna('Regionais', 'GRE') }, { nome: 'Município', campo: campoColuna('Municípios', 'Município') },
  { nome: 'Data de referência', campo: campoColuna('Datas de referência', 'Rótulo'), unica: true }, { nome: 'Período (meses)', campo: campoColuna('Período', 'Meses'), modo: 'Single' },
];
const cabecalho = (pagina: string, titulo: string): Visual[] => cabecalhoComum(pagina, titulo, FILTROS);
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
  { id: 'atendimento', nome: 'Atendimento', visuais: [
    ...cabecalho('atendimento', 'Atendimento'),
    ...cartoes('atendimento'),
    aMontar('atendimento-mapa', lugar(0, 0, 4), 'Distância até a unidade mais próxima', 'Use o Mapa de formas com o mapa dos 645 municípios que vem no pacote, pintado pela distância até a unidade.'),
    { id: 'atendimento-assunto', tipo: 'barChart', ...caixa(lugar(4, 0, 4)), titulo: 'Solicitações por assunto e situação', papeis: { Category: [campoColuna('Solicitações', 'Assunto')], Y: [
      campoMedida('Resolvidas no prazo', 'Resolvidas no prazo'), campoMedida('Resolvidas com atraso', 'Resolvidas com atraso'), campoMedida('Abertas com prazo vencido', 'Abertas com prazo vencido'), campoMedida('Abertas no prazo', 'Abertas no prazo')] } },
    { id: 'atendimento-canal', tipo: 'hundredPercentStackedBarChart', ...caixa(lugar(8, 0, 4)), titulo: 'Canal do atendimento pela distância',
      papeis: { Category: [campoColuna('Solicitações', 'Distância do solicitante')], Series: [campoColuna('Solicitações', 'Canal')], Y: [campoMedida('Solicitações de atendimento', 'Solicitações')] } },
    { id: 'atendimento-mensal', tipo: 'columnChart', ...caixa(lugar(0, 1, 7)), titulo: 'Solicitações por mês', papeis: { Category: [MES], Y: [campoMedida('Solicitações no mês', 'Solicitações')] } },
    { id: 'atendimento-coworking', tipo: 'clusteredBarChart', ...caixa(lugar(7, 1, 5)), titulo: 'Uso dos coworkings',
      papeis: { Category: [campoColuna('Coworkings', 'Unidade')], Y: [campoMedida('Ocupação dos coworkings', 'Ocupação')] } },
  ] },
];
