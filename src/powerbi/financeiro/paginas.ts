import type { Pagina, Visual } from '../pbir';
import { CARTOES } from './modelo';
import { MES, cabecalho as cabecalhoComum, campoColuna, campoMedida, cartoes as cartoesComuns, caixa, lugar } from '../layout';
import type { Filtro, Lugar } from '../layout';

/*
 * As quatro páginas do painel Financeiro (07/11/2026) no relatório PBIR, na grade comum de `layout.ts`: Arrecadação, Receita,
 * Dívida e cobrança, Orçamento e despesa, com os mesmos cartões do painel. Os mapas por município, que não têm visual nativo, viram
 * caixas "A montar" com o passo a passo. O calendário do mês vira uma matriz (semana nas linhas, dia da semana nas colunas) e a
 * receita de cada mês de cada ano, outra (ano nas linhas, mês nas colunas). Ficam só no painel em HTML: as curvas de quanto se
 * recebe depois do vencimento e a adimplência das empresas.
 */
const FILTROS: Filtro[] = [
  { nome: 'Regional', campo: campoColuna('Regionais', 'GRE') }, { nome: 'Município', campo: campoColuna('Municípios', 'Município') },
  { nome: 'Data de referência', campo: campoColuna('Datas de referência', 'Rótulo'), unica: true }, { nome: 'Período (meses)', campo: campoColuna('Período', 'Meses'), modo: 'Single' },
];
const cabecalho = (pagina: string, titulo: string): Visual[] => cabecalhoComum(pagina, titulo, FILTROS);
const cartoes = (pagina: keyof typeof CARTOES): Visual[] => cartoesComuns(pagina, CARTOES[pagina]);
const NOME_DO_MES = campoColuna('Calendário', 'Nome do mês'), ANO = campoColuna('Calendário', 'Ano'), TIPO = campoColuna('Tipos de receita', 'Tipo');
const aMontar = (id: string, l: Lugar, titulo: string, texto: string): Visual => ({ id, tipo: 'textbox', ...caixa(l), titulo, texto: `A montar no Power BI Desktop. ${texto} O passo a passo está no LEIA-ME.` });

export const paginasFinanceiro: Pagina[] = [
  { id: 'arrecadacao', nome: 'Arrecadação', visuais: [
    ...cabecalho('arrecadacao', 'Arrecadação e meta'),
    ...cartoes('arrecadacao'),
    { id: 'arrecadacao-dia', tipo: 'lineClusteredColumnComboChart', ...caixa(lugar(0, 0, 5)), titulo: 'O mês da data, dia a dia',
      papeis: { Category: [campoColuna('Dias', 'Dia do mês')], Y: [campoMedida('Arrecadado no dia', 'No dia')], Y2: [campoMedida('Arrecadado acumulado no mês', 'Acumulado'), campoMedida('Meta acumulada no mês', 'Meta acumulada')] } },
    { id: 'arrecadacao-meta', tipo: 'lineClusteredColumnComboChart', ...caixa(lugar(5, 0, 4)), titulo: 'Meta e realizado no ano',
      papeis: { Category: [NOME_DO_MES], Y: [campoMedida('Arrecadado em cada mês do ano', 'Realizado')], Y2: [campoMedida('Meta de cada mês do ano', 'Meta'), campoMedida('Arrecadado no mesmo mês do ano anterior', 'Um ano antes')] } },
    aMontar('arrecadacao-mapa', lugar(9, 0, 3, 2), 'Arrecadação por município', 'Use o Mapa de formas com o mapa dos 645 municípios que vem no pacote, pintado pela medida "Arrecadado no ano por município".'),
    // Matriz: a semana do mês nas linhas e o dia da semana nas colunas; formate os valores com escala de cores.
    { id: 'arrecadacao-calendario', tipo: 'pivotTable', ...caixa(lugar(0, 1, 4)), titulo: 'Calendário do mês',
      papeis: { Rows: [campoColuna('Dias', 'Semana do mês')], Columns: [campoColuna('Dias', 'Dia da semana')], Values: [campoMedida('Arrecadado no dia do calendário', 'Arrecadado')] } },
    { id: 'arrecadacao-tipos', tipo: 'pivotTable', ...caixa(lugar(4, 1, 5)), titulo: 'Cada tipo, este ano e o anterior', papeis: { Rows: [TIPO], Values: [
      campoMedida('Tipo no mês do ano anterior', 'No mês, um ano antes'), campoMedida('Tipo no mês', 'No mês'), campoMedida('Variação no mês', 'Variação'),
      campoMedida('Tipo no ano anterior', 'No ano, um ano antes'), campoMedida('Tipo no ano', 'No ano'), campoMedida('Variação no ano', 'Variação no ano')] } },
  ] },
  { id: 'receita', nome: 'Receita', visuais: [
    ...cabecalho('receita', 'De onde vem a receita'),
    ...cartoes('receita'),
    { id: 'receita-anos', tipo: 'columnChart', ...caixa(lugar(0, 0, 5)), titulo: 'Receita de cada ano desde 2013', papeis: { Category: [ANO], Series: [TIPO], Y: [campoMedida('Receita no ano', 'Receita')] } },
    // Matriz: o ano nas linhas e o mês nas colunas; formate os valores com escala de cores para ver o desenho de cada ano.
    { id: 'receita-sazonalidade', tipo: 'pivotTable', ...caixa(lugar(5, 0, 7)), titulo: 'Receita de cada mês, ano a ano', papeis: { Rows: [ANO], Columns: [NOME_DO_MES], Values: [campoMedida('Receita de cada mês', 'Receita')] } },
    { id: 'receita-mensal', tipo: 'columnChart', ...caixa(lugar(0, 1, 7)), titulo: 'Receita mês a mês', papeis: { Category: [MES], Series: [TIPO], Y: [campoMedida('Receita no mês', 'Receita')] } },
    { id: 'receita-orcado', tipo: 'clusteredBarChart', ...caixa(lugar(7, 1, 5)), titulo: 'Orçado e realizado no ano',
      papeis: { Category: [TIPO], Y: [campoMedida('Receita orçada no ano', 'Orçado'), campoMedida('Receita realizada no ano', 'Realizado até o mês')] } },
  ] },
  { id: 'divida', nome: 'Dívida e cobrança', visuais: [
    ...cabecalho('divida', 'Dívida e cobrança'),
    ...cartoes('divida'),
    aMontar('divida-mapa', lugar(0, 0, 4, 2), 'Dívida de anuidade por município', 'Use o Mapa de formas com o mapa dos 645 municípios que vem no pacote, pintado pela medida "Anuidades vencidas".'),
    { id: 'divida-idade', tipo: 'barChart', ...caixa(lugar(4, 0, 4)), titulo: 'Anuidades vencidas por idade',
      papeis: { Category: [campoColuna('Foto da dívida', 'Idade da anuidade')], Y: [campoMedida('Vencidas abaixo do piso', 'Abaixo do piso'), campoMedida('Vencidas acima do piso', 'Acima do piso')] } },
    { id: 'divida-cascata', tipo: 'clusteredBarChart', ...caixa(lugar(8, 0, 4)), titulo: 'Entrou e saiu da dívida no período', papeis: { Y: [
      campoMedida('Dívida no início do período', 'No início'), campoMedida('Novos vencimentos no período', 'Venceu'), campoMedida('Recebido da dívida no período', 'Recebido'),
      campoMedida('Prescrito no período', 'Prescreveu'), campoMedida('Anuidades vencidas', 'Na data')] } },
    { id: 'divida-protestos', tipo: 'barChart', ...caixa(lugar(4, 1, 3)), titulo: 'Protestos por categoria', papeis: { Category: [campoColuna('Categorias de protesto', 'Categoria')], Y: [campoMedida('Protestado', 'Protestado')] } },
    { id: 'divida-em-dia', tipo: 'multiRowCard', ...caixa(lugar(7, 1, 2)), titulo: 'Profissionais em dia', papeis: { Values: [campoMedida('Profissionais ativos', 'Ativos'), campoMedida('Profissionais em atraso', 'Em atraso'), campoMedida('Profissionais em dia', 'Em dia')] } },
    { id: 'divida-cnpj', tipo: 'clusteredBarChart', ...caixa(lugar(9, 1, 3)), titulo: 'Dívida das empresas e o CNPJ na Receita',
      papeis: { Category: [campoColuna('Foto da dívida', 'Situação do CNPJ')], Y: [campoMedida('Anuidades vencidas de empresas', 'Vencido')] } },
  ] },
  { id: 'orcamento', nome: 'Orçamento e despesa', visuais: [
    ...cabecalho('orcamento', 'Orçamento e despesa'),
    ...cartoes('orcamento'),
    { id: 'orcamento-execucao', tipo: 'lineClusteredColumnComboChart', ...caixa(lugar(0, 0, 4)), titulo: 'Execução do orçamento no ano',
      papeis: { Category: [NOME_DO_MES], Y: [campoMedida('Despesa realizada acumulada no ano', 'Realizado')], Y2: [campoMedida('Ritmo do orçado', 'Ritmo do orçado'), campoMedida('Despesa realizada acumulada no ano anterior', 'Ano anterior')] } },
    { id: 'orcamento-grupos', tipo: 'clusteredBarChart', ...caixa(lugar(4, 0, 4)), titulo: 'Em que o Conselho gasta',
      papeis: { Category: [campoColuna('Grupos de despesa', 'Grupo')], Y: [campoMedida('Orçado do grupo no ano', 'Orçado do ano'), campoMedida('Realizado do grupo no ano', 'Realizado até o mês')] } },
    { id: 'orcamento-resultado', tipo: 'lineClusteredColumnComboChart', ...caixa(lugar(8, 0, 4)), titulo: 'Receita, despesa e resultado desde 2013',
      papeis: { Category: [ANO], Y: [campoMedida('Resultado no ano', 'Resultado')], Y2: [campoMedida('Receita no ano', 'Receita'), campoMedida('Despesa no ano', 'Despesa')] } },
    // Os gastos com nome: quem recebeu diárias e os fornecedores, pela Transparência. Clique no título Valor para pôr o maior no alto.
    { id: 'orcamento-diarias', tipo: 'tableEx', ...caixa(lugar(0, 1, 4)), titulo: 'Quem recebe diárias', papeis: { Values: [campoColuna('Pessoas', 'Nome'), campoColuna('Pessoas', 'Categoria'),
      campoMedida('Diárias no período', 'Valor'), campoMedida('Pagamentos de diária no período', 'Pagamentos'), campoMedida('Meses com diária', 'Meses')] } },
    { id: 'orcamento-fornecedores', tipo: 'tableEx', ...caixa(lugar(4, 1, 4)), titulo: 'Maiores fornecedores', papeis: { Values: [campoColuna('Fornecedores', 'Nome'), campoColuna('Fornecedores', 'Objeto'), campoMedida('Pago no período', 'Pago')] } },
    { id: 'orcamento-contratos', tipo: 'columnChart', ...caixa(lugar(8, 1, 2)), titulo: 'Contratos a vencer', papeis: { Category: [MES], Y: [campoMedida('Contratos que terminam no mês', 'Contratos')] } },
    { id: 'orcamento-por-ativo', tipo: 'multiRowCard', ...caixa(lugar(10, 1, 2)), titulo: 'Por profissional ativo',
      papeis: { Values: [campoMedida('Despesa por profissional ativo', 'Despesa por ativo'), campoMedida('Receita por profissional ativo no ano fechado', 'Receita por ativo')] } },
  ] },
];
