import type { Pagina, Visual } from '../pbir';
import { CARTOES, medidaDe, serieDe } from './modelo';
import { TOPO, cabecalho as cabecalhoComum, campoColuna, campoMedida, cartoes as cartoesComuns, caixa, lugar } from '../layout';
import type { Filtro, Lugar } from '../layout';
import type { IndicadorId } from '../../domain/presidencia';

/*
 * As quatro páginas do painel da Presidência (07/11/2026) no relatório PBIR, na grade comum de `layout.ts`: Resumo, Regionais,
 * Riscos e No país. O quadro de cada painel do HTML vira a tabela "Os números de cada painel", com o número, a variação em um ano e a
 * meta; as séries de 13 meses viram gráficos de linha; o mapa por município fica para montar no Desktop (LEIA-ME). Na página No país,
 * só dados públicos reais, e os filtros do alto não mudam nada.
 */
const FILTROS: Filtro[] = [
  { nome: 'Regional', campo: campoColuna('Regionais', 'GRE') }, { nome: 'Município', campo: campoColuna('Municípios', 'Município') },
  { nome: 'Câmara', campo: campoColuna('Câmaras', 'Câmara'), unica: true },
  { nome: 'Data de referência', campo: campoColuna('Datas de referência', 'Rótulo'), unica: true },
];
const cabecalho = (pagina: string, titulo: string, filtros = FILTROS): Visual[] => cabecalhoComum(pagina, titulo, filtros);
const cartoes = (pagina: keyof typeof CARTOES): Visual[] => cartoesComuns(pagina, CARTOES[pagina]);
/** Sem cartões, os blocos começam logo abaixo do título e dos filtros. */
const semCartoes = (onde: Lugar) => caixa(onde, 12, 2, TOPO);
const MES = campoColuna('Meses da série', 'Rótulo'), GRE = campoColuna('Regionais', 'GRE');
const ind = (id: IndicadorId, rotulo?: string) => campoMedida(medidaDe(id), rotulo);
const serie = (id: IndicadorId, rotulo?: string) => campoMedida(serieDe(id), rotulo);

export const paginasPresidencia: Pagina[] = [
  { id: 'resumo', nome: 'Resumo', visuais: [
    ...cabecalho('resumo', 'Resumo dos painéis'),
    ...cartoes('resumo'),
    { id: 'resumo-numeros', tipo: 'pivotTable', ...caixa(lugar(0, 0, 6, 2)), titulo: 'Os números de cada painel',
      papeis: { Rows: [campoColuna('Indicadores', 'Painel'), campoColuna('Indicadores', 'Nome')], Values: [campoMedida('Número'), campoMedida('Em um ano'), campoMedida('Meta do painel', 'Meta')] } },
    { id: 'resumo-taxas', tipo: 'lineChart', ...caixa(lugar(6, 0, 6)), titulo: 'As taxas com meta nos últimos 13 meses',
      papeis: { Category: [MES], Y: [serie('mercado', 'Mercado registrado'), serie('rt', 'Com responsável técnico'), serie('anuidadePf', 'Anuidade em dia'), serie('regularizacao', 'Regularização'), serie('atendimento', 'Atendimento no prazo')] } },
    { id: 'resumo-fila', tipo: 'lineChart', ...caixa(lugar(6, 1, 3)), titulo: 'Processos esperando voto', papeis: { Category: [MES], Y: [serie('pendentes', 'Esperando voto'), serie('vermelho', 'Em alerta vermelho')] } },
    { id: 'resumo-receita', tipo: 'lineChart', ...caixa(lugar(9, 1, 3)), titulo: 'Receita do Conselho em 12 meses', papeis: { Category: [MES], Y: [serie('receita', 'Receita')] } },
  ] },
  { id: 'regionais', nome: 'Regionais', visuais: [
    ...cabecalho('regionais', 'As regionais em todos os assuntos'),
    { id: 'regionais-quadro', tipo: 'pivotTable', ...semCartoes(lugar(0, 0, 8, 2)), titulo: 'Cada regional em cada indicador',
      papeis: { Rows: [GRE], Columns: [campoColuna('Indicadores', 'Nome')], Values: [campoMedida('Número')] } },
    { id: 'regionais-mercado', tipo: 'barChart', ...semCartoes(lugar(8, 0, 4)), titulo: 'Parte do mercado registrada', papeis: { Category: [GRE], Y: [ind('mercado', 'Mercado registrado')] } },
    { id: 'regionais-taxas', tipo: 'clusteredBarChart', ...semCartoes(lugar(8, 1, 4)), titulo: 'Regularização e atendimento no prazo',
      papeis: { Category: [GRE], Y: [ind('regularizacao', 'Regularização'), ind('atendimento', 'Atendimento no prazo')] } },
  ] },
  { id: 'riscos', nome: 'Riscos', visuais: [
    ...cabecalho('riscos', 'Riscos e prazos'),
    ...cartoes('riscos'),
    { id: 'riscos-divida', tipo: 'barChart', ...caixa(lugar(0, 0, 4, 2)), titulo: 'Dívida perto de prescrever em cada regional', papeis: { Category: [GRE], Y: [ind('perto', 'Perto de prescrever')] } },
    { id: 'riscos-processos', tipo: 'clusteredBarChart', ...caixa(lugar(4, 0, 4, 2)), titulo: 'Alerta vermelho e autos perto da prescrição',
      papeis: { Category: [GRE], Y: [ind('vermelho', 'Alerta vermelho'), ind('prescricao', 'Perto da prescrição')] } },
    { id: 'riscos-camaras', tipo: 'barChart', ...caixa(lugar(8, 0, 4)), titulo: 'Processos esperando voto em cada câmara', papeis: { Category: [campoColuna('Câmaras', 'Câmara')], Y: [ind('pendentes', 'Esperando voto')] } },
    { id: 'riscos-serie', tipo: 'lineChart', ...caixa(lugar(8, 1, 4)), titulo: 'Alerta vermelho e prescrição em 13 meses', papeis: { Category: [MES], Y: [serie('vermelho', 'Alerta vermelho'), serie('prescricao', 'Perto da prescrição')] } },
  ] },
  { id: 'pais', nome: 'No país', visuais: [
    ...cabecalho('pais', 'O Crea-SP no país (dados reais)', []),
    ...cartoes('pais'),
    { id: 'pais-ufs', tipo: 'barChart', ...caixa(lugar(0, 0, 3, 2)), titulo: 'Profissionais por 100 mil habitantes', papeis: { Category: [campoColuna('UFs', 'UF')], Y: [campoMedida('Profissionais por 100 mil habitantes', 'Por 100 mil')] } },
    { id: 'pais-tabela', tipo: 'tableEx', ...caixa(lugar(3, 0, 4)), titulo: 'Registro ativo e mulheres em cada estado',
      papeis: { Values: [campoColuna('UFs', 'UF'), campoColuna('UFs', 'Profissionais ativos'), campoColuna('UFs', 'Ativos entre os registros (%)'), campoColuna('UFs', 'Mulheres (%)')] } },
    { id: 'pais-contas', tipo: 'barChart', ...caixa(lugar(7, 0, 5)), titulo: 'De onde vem a receita, de 2013 a hoje', papeis: { Category: [campoColuna('Contas de receita', 'Conta')], Y: [campoMedida('Valor da conta de receita', 'Receita')] } },
    { id: 'pais-exercicios', tipo: 'lineClusteredColumnComboChart', ...caixa(lugar(3, 1, 5)), titulo: 'Receita e despesa publicadas desde 2013',
      papeis: { Category: [campoColuna('Exercícios', 'Ano')], Y: [campoMedida('Receita realizada no exercício', 'Receita realizada'), campoMedida('Despesa paga no exercício', 'Despesa paga')], Y2: [campoMedida('Dotação do exercício', 'Dotação')] } },
    { id: 'pais-registros', tipo: 'lineClusteredColumnComboChart', ...caixa(lugar(8, 1, 4)), titulo: 'Registros novos por ano',
      papeis: { Category: [campoColuna('Registros por ano', 'Ano')], Y: [campoMedida('Registros novos no país', 'No país'), campoMedida('Registros novos no Crea-SP', 'No Crea-SP')], Y2: [campoMedida('Parte do Crea-SP nos registros novos', 'Parte do Crea-SP')] } },
  ] },
];
