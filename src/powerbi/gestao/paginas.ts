import type { Pagina, Visual } from '../pbir';
import { CARTOES } from './modelo';
import { MES, cabecalho as cabecalhoComum, campoColuna, campoMedida, cartoes as cartoesComuns, caixa, lugar } from '../layout';
import type { Filtro } from '../layout';

/*
 * A página do painel de Atendimento no relatório PBIR, na grade comum de `layout.ts` (o Financeiro tem modelo próprio em
 * `src/powerbi/financeiro/` desde 07/11/2026). O mapa por município, que não tem visual nativo, vira uma caixa "A montar" com o
 * passo a passo.
 */
const FILTROS: Filtro[] = [
  { nome: 'Regional', campo: campoColuna('Regionais', 'GRE') }, { nome: 'Município', campo: campoColuna('Municípios', 'Município') },
  { nome: 'Data de referência', campo: campoColuna('Datas de referência', 'Rótulo'), unica: true }, { nome: 'Período (meses)', campo: campoColuna('Período', 'Meses'), modo: 'Single' },
];
const cabecalho = (pagina: string, titulo: string): Visual[] => cabecalhoComum(pagina, titulo, FILTROS);
const cartoes = (pagina: keyof typeof CARTOES): Visual[] => cartoesComuns(pagina, CARTOES[pagina]);
const aMontar = (id: string, l: ReturnType<typeof lugar>, titulo: string, texto: string): Visual => ({ id, tipo: 'textbox', ...caixa(l), titulo, texto: `A montar no Power BI Desktop. ${texto} O passo a passo está no LEIA-ME.` });

export const paginasGestao: Pagina[] = [
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
