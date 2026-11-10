import type { Pagina, Visual } from '../pbir';
import { CARTOES, anteriorDaPagina, indicadorDaPagina, medidaDoIndicador, metricaDaPagina } from './modelo';
import { cabecalho as cabecalhoComum, campoColuna, campoMedida, cartoes as cartoesComuns, caixa, lugar } from '../layout';
import type { Filtro } from '../layout';

/*
 * As cinco páginas do painel de Indicadores do Sistema (10/11/2026) no relatório PBIR, na grade comum de `layout.ts`: Registro,
 * Fiscalização, Julgamento, Suporte e Liderança e Entrega ao Confea, com os mesmos cartões do HTML. A lista de métricas de cada
 * subprograma vira uma tabela com o código, o nome da planilha, o exercício escolhido e o anterior. O mapa das ações por município
 * fica para montar no Desktop (LEIA-ME).
 */
const FILTROS: Filtro[] = [
  { nome: 'Regional', campo: campoColuna('Regionais', 'GRE') },
  { nome: 'Exercício', campo: campoColuna('Exercícios', 'Rótulo'), unica: true },
];
const cabecalho = (pagina: string, titulo: string): Visual[] => cabecalhoComum(pagina, titulo, FILTROS);
const cartoes = (pagina: keyof typeof CARTOES): Visual[] => cartoesComuns(pagina, CARTOES[pagina]);
const GRE = campoColuna('Regionais', 'GRE'), EXERCICIO = campoColuna('Exercícios da série', 'Rótulo'), CURTO = campoColuna('Métricas', 'Nome curto');
const ind = (codigo: number, rotulo?: string) => campoMedida(medidaDoIndicador(codigo), rotulo);
/** A lista das métricas do subprograma: o código, o nome da planilha, o exercício escolhido e o anterior. */
const lista = (pagina: 'registro' | 'fiscalizacao' | 'julgamento' | 'suporte', titulo: string, onde: ReturnType<typeof lugar>): Visual => ({ id: `${pagina}-metricas`, tipo: 'tableEx', ...caixa(onde), titulo,
  papeis: { Values: [campoColuna('Métricas', 'Rótulo'), campoColuna('Métricas', 'Nome'), campoMedida(metricaDaPagina(pagina), 'Exercício'), campoMedida(anteriorDaPagina(pagina), 'Anterior')] } });
/** Os indicadores do subprograma em cada exercício, com a referência do Sistema em 2021. */
const emCadaExercicio = (pagina: 'registro' | 'fiscalizacao' | 'julgamento' | 'suporte', titulo: string, onde: ReturnType<typeof lugar>): Visual => ({ id: `${pagina}-exercicios`, tipo: 'pivotTable', ...caixa(onde), titulo,
  papeis: { Rows: [campoColuna('Indicadores', 'Rótulo'), campoColuna('Indicadores', 'Nome curto')], Columns: [EXERCICIO], Values: [campoMedida(indicadorDaPagina(pagina), 'Indicador')] } });

export const paginasIndicadores: Pagina[] = [
  { id: 'registro', nome: 'Registro', visuais: [
    ...cabecalho('registro', 'Registro'),
    ...cartoes('registro'),
    emCadaExercicio('registro', 'Os indicadores do Registro em cada exercício', lugar(0, 0, 7)),
    { id: 'registro-modalidades', tipo: 'barChart', ...caixa(lugar(7, 0, 5)), titulo: 'Profissionais ativos por modalidade', papeis: { Category: [CURTO], Y: [campoMedida('Profissionais na modalidade', 'Profissionais')] } },
    { id: 'registro-regionais', tipo: 'pivotTable', ...caixa(lugar(0, 1, 7)), titulo: 'O registro em cada regional',
      papeis: { Rows: [GRE], Values: [campoMedida('Profissionais de nível superior ativos', 'Profissionais'), ind(1, 'Crescimento'), campoMedida('Empresas ativas', 'Empresas'), ind(2, 'Crescimento'), ind(4, 'Registram ART'), ind(5, 'ARTs por profissional')] } },
    lista('registro', 'As 30 métricas do Registro', lugar(7, 1, 5)),
  ] },
  { id: 'fiscalizacao', nome: 'Fiscalização', visuais: [
    ...cabecalho('fiscalizacao', 'Fiscalização'),
    ...cartoes('fiscalizacao'),
    { id: 'fiscalizacao-regionais', tipo: 'barChart', ...caixa(lugar(0, 0, 4, 2)), titulo: 'Ações de fiscalização em cada regional', papeis: { Category: [GRE], Y: [campoMedida('Ações de fiscalização', 'Ações')] } },
    { id: 'fiscalizacao-capitulacoes', tipo: 'barChart', ...caixa(lugar(4, 0, 4)), titulo: 'Autos por capitulação da Lei 5.194/1966', papeis: { Category: [CURTO], Y: [campoMedida('Autos na capitulação', 'Autos')] } },
    { id: 'fiscalizacao-exercicios', tipo: 'lineClusteredColumnComboChart', ...caixa(lugar(4, 1, 4)), titulo: 'Ações e autos em cada exercício',
      papeis: { Category: [EXERCICIO], Y: [campoMedida('Ações de fiscalização', 'Ações'), campoMedida('Autos de infração', 'Autos')], Y2: [ind(12, 'Índice de autuação')] } },
    lista('fiscalizacao', 'As 24 métricas da Fiscalização', lugar(8, 0, 4, 2)),
  ] },
  { id: 'julgamento', nome: 'Julgamento', visuais: [
    ...cabecalho('julgamento', 'Julgamento'),
    ...cartoes('julgamento'),
    emCadaExercicio('julgamento', 'Eficiência e eficácia em cada exercício', lugar(0, 0, 7)),
    { id: 'julgamento-fila', tipo: 'clusteredBarChart', ...caixa(lugar(7, 0, 5)), titulo: 'A fila de processos de infração em cada exercício',
      papeis: { Category: [EXERCICIO], Y: [campoMedida('Julgados na 1ª instância', 'Julgados na 1ª'), campoMedida('Ficam para o próximo na 1ª instância', 'Ficam na 1ª'), campoMedida('Julgados na 2ª instância', 'Julgados na 2ª'), campoMedida('Ficam para o próximo na 2ª instância', 'Ficam na 2ª')] } },
    { id: 'julgamento-sem-exito', tipo: 'clusteredBarChart', ...caixa(lugar(0, 1, 5)), titulo: 'Por que a autuação não teve êxito',
      papeis: { Category: [CURTO], Y: [campoMedida('Sem êxito na 1ª instância', '1ª instância'), campoMedida('Sem êxito na 2ª instância', '2ª instância')] } },
    lista('julgamento', 'As 80 métricas do Julgamento', lugar(5, 1, 7)),
  ] },
  { id: 'suporte', nome: 'Suporte e Liderança', visuais: [
    ...cabecalho('suporte', 'Suporte e Liderança'),
    ...cartoes('suporte'),
    { id: 'suporte-custo', tipo: 'barChart', ...caixa(lugar(0, 0, 6)), titulo: 'Quanto custa a fiscalização, conta a conta', papeis: { Category: [CURTO], Y: [campoMedida('Despesa na conta', 'Despesa')] } },
    { id: 'suporte-regionais', tipo: 'pivotTable', ...caixa(lugar(6, 0, 6)), titulo: 'Inadimplência e quadro em cada regional',
      papeis: { Rows: [GRE], Values: [ind(8, 'Inadimplência prof.'), ind(9, 'Inadimplência emp.'), campoMedida('Anuidades não pagas'), campoMedida('Multas não pagas'), campoMedida('Agentes fiscais'), ind(13, 'Fiscalizações por dia')] } },
    emCadaExercicio('suporte', 'Os indicadores de Suporte e Liderança em cada exercício', lugar(0, 1, 5)),
    lista('suporte', 'As 27 métricas de Suporte e Liderança', lugar(5, 1, 7)),
  ] },
  { id: 'entrega', nome: 'Entrega ao Confea', visuais: [
    ...cabecalho('entrega', 'Entrega ao Confea'),
    ...cartoes('entrega'),
    { id: 'entrega-subprogramas', tipo: 'clusteredBarChart', ...caixa(lugar(0, 0, 4)), titulo: 'As 161 métricas por subprograma',
      papeis: { Category: [campoColuna('Métricas', 'Subprograma')], Y: [campoMedida('Métricas preenchidas', 'Preenchidas'), campoMedida('Métricas que não fecham', 'Não fecham'), campoMedida('Métricas vazias', 'Vazias')] } },
    { id: 'entrega-fora', tipo: 'tableEx', ...caixa(lugar(0, 1, 4)), titulo: 'As métricas vazias e as que não fecham',
      papeis: { Values: [campoColuna('Métricas', 'Rótulo'), campoColuna('Métricas', 'Nome'), campoMedida('Situação da métrica', 'Situação')] } },
    { id: 'entrega-conferencias', tipo: 'tableEx', ...caixa(lugar(4, 0, 4, 2)), titulo: 'Conferências antes do envio',
      papeis: { Values: [campoColuna('Conferências', 'Tipo'), campoColuna('Conferências', 'Conferência'), campoMedida('Situação da conferência', 'Situação'), campoMedida('Diferença da conferência', 'Diferença')] } },
    { id: 'entrega-calendario', tipo: 'tableEx', ...caixa(lugar(8, 0, 4, 2)), titulo: 'O calendário de entregas',
      papeis: { Values: [campoColuna('Calendário de entregas', 'Data'), campoColuna('Calendário de entregas', 'Ritmo'), campoColuna('Calendário de entregas', 'Entrega')] } },
  ] },
];
