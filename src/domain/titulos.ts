import type { Modalidade } from './entidades';
import type { Nivel } from './profissionais';

/**
 * Títulos profissionais do Sistema Confea/Crea (pedido do Caio em 04/11/2026: abrir a visão até o título profissional).
 * Fonte: Catálogo de Títulos Profissionais do Confea, edição de junho de 2026, com o código de cada título (grupo, modalidade e
 * nível nos três primeiros dígitos; título e variante nos outros quatro). A lista abaixo traz os títulos mais comuns de cada
 * modalidade e nível, não o catálogo inteiro. O peso é a parte demonstrativa de cada título entre os registrados da mesma
 * modalidade e nível; em produção, o título vem do cadastro do profissional no Crea-SP.
 *
 * Técnico e tecnólogo, no Crea-SP, só os de Segurança do Trabalho (correção do Caio em 04/11/2026): os técnicos industriais e
 * agrícolas saíram para o CFT e o CFTA em 2018 (Lei nº 13.639/2018). As demais modalidades têm só títulos de graduação plena
 * (engenheiro, agrônomo, geólogo, geógrafo, meteorologista, agrimensor).
 */
export interface TituloProfissional { codigo: string; titulo: string; modalidade: Modalidade; nivel: Nivel; peso: number }

type Linha = [codigo: string, titulo: string, peso: number];
const grupo = (modalidade: Modalidade, nivel: Nivel, linhas: Linha[]): TituloProfissional[] => linhas.map(([codigo, titulo, peso]) => ({ codigo, titulo, modalidade, nivel, peso }));

export const titulos: TituloProfissional[] = [
  ...grupo('Civil', 'Engenheiro', [
    ['111-02-00', 'Engenheiro Civil', 78], ['111-01-00', 'Engenheiro Ambiental', 7], ['111-09-00', 'Engenheiro Sanitarista e Ambiental', 3.5],
    ['111-01-03', 'Engenheiro Ambiental e Sanitarista', 2.5], ['111-11-01', 'Engenheiro de Produção - Civil', 2], ['111-04-01', 'Engenheiro de Operação - Construção Civil', 2],
    ['111-04-03', 'Engenheiro de Operação - Edificações', 1], ['111-14-00', 'Engenheiro de Transportes', 1], ['111-08-00', 'Engenheiro Sanitarista', 1],
    ['111-12-00', 'Engenheiro Hídrico', 0.6], ['111-16-00', 'Engenheiro Ferroviário e Metroviário', 0.5], ['111-10-00', 'Engenheiro de Infraestrutura Aeronáutica', 0.4],
    ['111-17-00', 'Engenheiro Urbanista', 0.3],
  ]),
  ...grupo('Elétrica', 'Engenheiro', [
    ['121-08-00', 'Engenheiro Eletricista', 46], ['121-03-00', 'Engenheiro de Controle e Automação', 14], ['121-01-00', 'Engenheiro de Computação', 12],
    ['121-08-01', 'Engenheiro Eletricista - Eletrônica', 6], ['121-06-00', 'Engenheiro de Telecomunicações', 5], ['121-09-00', 'Engenheiro em Eletrônica', 4],
    ['121-08-02', 'Engenheiro Eletricista - Eletrotécnica', 4], ['121-13-00', 'Engenheiro de Energia', 3], ['121-04-02', 'Engenheiro de Operação - Eletrotécnica', 2],
    ['121-12-00', 'Engenheiro Biomédico', 2], ['121-14-00', 'Engenheiro de Software', 2],
  ]),
  ...grupo('Mecânica e metalúrgica', 'Engenheiro', [
    ['131-08-00', 'Engenheiro Mecânico', 44], ['131-06-00', 'Engenheiro de Produção', 26], ['131-15-00', 'Engenheiro Mecatrônico', 7],
    ['131-06-01', 'Engenheiro de Produção - Mecânica', 6], ['131-09-00', 'Engenheiro Metalurgista', 4], ['131-01-00', 'Engenheiro Aeronáutico', 3],
    ['131-05-05', 'Engenheiro de Operação - Mecânica', 3], ['131-13-00', 'Engenheiro Automotivo', 2], ['131-10-00', 'Engenheiro Naval', 1.5],
    ['131-14-00', 'Engenheiro Aeroespacial', 1.5], ['131-12-00', 'Engenheiro Acústico', 0.5],
  ]),
  ...grupo('Química', 'Engenheiro', [
    ['141-06-00', 'Engenheiro Químico', 46], ['141-01-00', 'Engenheiro de Alimentos', 20], ['141-02-00', 'Engenheiro de Materiais', 12],
    ['141-12-00', 'Engenheiro de Bioprocessos e Biotecnologia', 6], ['141-08-00', 'Engenheiro de Petróleo', 5], ['141-07-00', 'Engenheiro Têxtil', 4],
    ['141-04-02', 'Engenheiro de Produção - Química', 3], ['141-10-00', 'Engenheiro Bioquímico', 2], ['141-11-00', 'Engenheiro Nuclear', 1],
    ['141-09-00', 'Engenheiro de Plástico', 1],
  ]),
  ...grupo('Agronomia', 'Engenheiro', [
    ['311-02-00', 'Engenheiro Agrônomo', 70], ['311-04-00', 'Engenheiro Florestal', 11], ['311-01-00', 'Engenheiro Agrícola', 9],
    ['311-06-00', 'Engenheiro Agroindustrial', 3], ['311-03-00', 'Engenheiro de Pesca', 2], ['311-05-00', 'Meteorologista', 2],
    ['311-09-00', 'Engenheiro de Agronegócios', 2], ['311-07-00', 'Engenheiro de Aquicultura', 1],
  ]),
  ...grupo('Geologia e minas', 'Engenheiro', [
    ['151-03-00', 'Geólogo', 48], ['151-01-00', 'Engenheiro de Minas', 30], ['151-02-00', 'Engenheiro Geólogo', 12],
    ['151-04-00', 'Engenheiro de Exploração e Produção de Petróleo', 7], ['151-05-00', 'Geofísico', 3],
  ]),
  ...grupo('Agrimensura', 'Engenheiro', [
    ['161-02-00', 'Engenheiro Agrimensor', 40], ['161-03-00', 'Engenheiro Cartógrafo', 20], ['161-09-00', 'Geógrafo', 20],
    ['161-01-00', 'Agrimensor', 10], ['161-08-00', 'Engenheiro Topógrafo', 6], ['161-07-00', 'Engenheiro Geógrafo', 4],
  ]),
  ...grupo('Segurança do trabalho', 'Engenheiro', [
    ['424-01-00', 'Engenheiro de Segurança do Trabalho', 96], ['421-02-00', 'Engenheiro de Saúde e Segurança', 4],
  ]),
  ...grupo('Segurança do trabalho', 'Tecnólogo', [['422-01-00', 'Tecnólogo de Segurança do Trabalho', 1]]),
  ...grupo('Segurança do trabalho', 'Técnico', [['423-01-00', 'Técnico de Segurança do Trabalho', 1]]),
];
export const tituloPorCodigo = new Map(titulos.map(row => [row.codigo, row]));
export const titulosDe = (modalidade: Modalidade, nivel: Nivel) => titulos.filter(row => row.modalidade === modalidade && row.nivel === nivel);
/** Níveis possíveis em cada modalidade, com o peso de cada um entre os registrados (demonstrativo). */
export const pesosNivel = (modalidade: Modalidade): [Nivel[], number[]] => modalidade === 'Segurança do trabalho'
  ? [['Engenheiro', 'Tecnólogo', 'Técnico'], [34, 4, 62]]
  : [['Engenheiro'], [100]];
