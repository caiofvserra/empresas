import type { Modalidade } from './entidades';
import type { Nivel } from './profissionais';

/**
 * Títulos profissionais do Sistema Confea/Crea (pedido do Caio em 04/11/2026: abrir a visão até o título profissional).
 * Fonte: Catálogo de Títulos Profissionais do Confea, edição de junho de 2026, com o código de cada título (grupo, modalidade e
 * nível nos três primeiros dígitos; título e variante nos outros quatro). A lista abaixo traz os títulos mais comuns de cada
 * modalidade e nível, não o catálogo inteiro. O peso é a parte demonstrativa de cada título entre os registrados da mesma
 * modalidade e nível; em produção, o título vem do cadastro do profissional no Crea-SP.
 *
 * Técnico, no Crea, só o de Segurança do Trabalho: os técnicos industriais e agrícolas saíram para o CFT e o CFTA em 2018
 * (Lei nº 13.639/2018), e o catálogo do Confea só traz esse título de nível técnico.
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
  ...grupo('Civil', 'Tecnólogo', [
    ['112-01-00', 'Tecnólogo em Construção Civil', 34], ['112-01-06', 'Tecnólogo em Construção de Edifícios', 18], ['112-11-00', 'Tecnólogo em Gestão Ambiental', 16],
    ['112-01-01', 'Tecnólogo em Construção Civil - Edificações', 9], ['112-08-00', 'Tecnólogo em Controle de Obras', 7], ['112-04-00', 'Tecnólogo em Saneamento', 5],
    ['112-10-00', 'Tecnólogo em Processos Ambientais', 4], ['112-12-00', 'Tecnólogo em Gestão de Resíduos Sólidos', 3], ['112-02-00', 'Tecnólogo em Estradas', 2],
    ['112-15-00', 'Tecnólogo em Transporte Terrestre', 2],
  ]),
  ...grupo('Elétrica', 'Engenheiro', [
    ['121-08-00', 'Engenheiro Eletricista', 46], ['121-03-00', 'Engenheiro de Controle e Automação', 14], ['121-01-00', 'Engenheiro de Computação', 12],
    ['121-08-01', 'Engenheiro Eletricista - Eletrônica', 6], ['121-06-00', 'Engenheiro de Telecomunicações', 5], ['121-09-00', 'Engenheiro em Eletrônica', 4],
    ['121-08-02', 'Engenheiro Eletricista - Eletrotécnica', 4], ['121-13-00', 'Engenheiro de Energia', 3], ['121-04-02', 'Engenheiro de Operação - Eletrotécnica', 2],
    ['121-12-00', 'Engenheiro Biomédico', 2], ['121-14-00', 'Engenheiro de Software', 2],
  ]),
  ...grupo('Elétrica', 'Tecnólogo', [
    ['122-06-00', 'Tecnólogo em Eletrotécnica', 22], ['122-04-00', 'Tecnólogo em Eletrônica', 14], ['122-05-00', 'Tecnólogo em Eletrônica Industrial', 12],
    ['122-14-00', 'Tecnólogo em Redes de Computadores', 12], ['122-11-00', 'Tecnólogo em Telecomunicações', 10], ['122-09-00', 'Tecnólogo em Sistemas Elétricos', 9],
    ['122-07-00', 'Tecnólogo em Instrumentação e Controle', 7], ['122-17-00', 'Tecnólogo em Energias Renováveis', 6], ['122-18-00', 'Tecnólogo em Eletromecânica', 5],
    ['122-01-01', 'Tecnólogo em Automação e Manufatura Digital', 3],
  ]),
  ...grupo('Mecânica e metalúrgica', 'Engenheiro', [
    ['131-08-00', 'Engenheiro Mecânico', 44], ['131-06-00', 'Engenheiro de Produção', 26], ['131-15-00', 'Engenheiro Mecatrônico', 7],
    ['131-06-01', 'Engenheiro de Produção - Mecânica', 6], ['131-09-00', 'Engenheiro Metalurgista', 4], ['131-01-00', 'Engenheiro Aeronáutico', 3],
    ['131-05-05', 'Engenheiro de Operação - Mecânica', 3], ['131-13-00', 'Engenheiro Automotivo', 2], ['131-10-00', 'Engenheiro Naval', 1.5],
    ['131-14-00', 'Engenheiro Aeroespacial', 1.5], ['131-12-00', 'Engenheiro Acústico', 0.5],
  ]),
  ...grupo('Mecânica e metalúrgica', 'Tecnólogo', [
    ['132-08-00', 'Tecnólogo em Mecânica', 18], ['132-19-00', 'Tecnólogo em Gestão da Produção Industrial', 16], ['132-22-00', 'Tecnólogo em Manutenção Industrial', 13],
    ['132-18-00', 'Tecnólogo em Mecatrônica Industrial', 12], ['132-21-00', 'Tecnólogo em Gestão da Qualidade', 10], ['132-20-00', 'Tecnólogo em Fabricação Mecânica', 9],
    ['132-15-00', 'Tecnólogo em Soldagem', 6], ['132-24-00', 'Tecnólogo em Refrigeração e Climatização', 5], ['132-10-00', 'Tecnólogo em Metalurgia', 4],
    ['132-01-03', 'Tecnólogo em Manutenção de Aeronaves', 4], ['132-25-00', 'Tecnólogo em Sistemas Automotivos', 3],
  ]),
  ...grupo('Química', 'Engenheiro', [
    ['141-06-00', 'Engenheiro Químico', 46], ['141-01-00', 'Engenheiro de Alimentos', 20], ['141-02-00', 'Engenheiro de Materiais', 12],
    ['141-12-00', 'Engenheiro de Bioprocessos e Biotecnologia', 6], ['141-08-00', 'Engenheiro de Petróleo', 5], ['141-07-00', 'Engenheiro Têxtil', 4],
    ['141-04-02', 'Engenheiro de Produção - Química', 3], ['141-10-00', 'Engenheiro Bioquímico', 2], ['141-11-00', 'Engenheiro Nuclear', 1],
    ['141-09-00', 'Engenheiro de Plástico', 1],
  ]),
  ...grupo('Química', 'Tecnólogo', [
    ['142-11-00', 'Tecnólogo em Processos Químicos', 30], ['142-01-00', 'Tecnólogo em Alimentos', 22], ['142-06-00', 'Tecnólogo em Química', 14],
    ['142-09-00', 'Tecnólogo em Polímeros', 10], ['142-12-00', 'Tecnólogo em Biocombustíveis', 8], ['142-08-00', 'Tecnólogo em Petróleo e Gás', 6],
    ['142-04-00', 'Tecnólogo em Materiais', 5], ['142-07-00', 'Tecnólogo Têxtil', 5],
  ]),
  ...grupo('Agronomia', 'Engenheiro', [
    ['311-02-00', 'Engenheiro Agrônomo', 70], ['311-04-00', 'Engenheiro Florestal', 11], ['311-01-00', 'Engenheiro Agrícola', 9],
    ['311-06-00', 'Engenheiro Agroindustrial', 3], ['311-03-00', 'Engenheiro de Pesca', 2], ['311-05-00', 'Meteorologista', 2],
    ['311-09-00', 'Engenheiro de Agronegócios', 2], ['311-07-00', 'Engenheiro de Aquicultura', 1],
  ]),
  ...grupo('Agronomia', 'Tecnólogo', [
    ['312-29-00', 'Tecnólogo em Agronegócios', 26], ['312-30-00', 'Tecnólogo em Produção Sucroalcooleira', 15], ['312-05-00', 'Tecnólogo em Agropecuária', 14],
    ['312-22-00', 'Tecnólogo em Agroindústria', 10], ['312-28-00', 'Tecnólogo em Produção de Grãos', 8], ['312-15-00', 'Tecnólogo em Mecanização Agrícola', 7],
    ['312-01-00', 'Tecnólogo em Açúcar e Álcool', 6], ['312-23-00', 'Tecnólogo em Agroecologia', 5], ['312-27-00', 'Tecnólogo em Paisagismo e Jardinagem', 5],
    ['312-21-00', 'Tecnólogo em Irrigação e Drenagem', 4],
  ]),
  ...grupo('Geologia e minas', 'Engenheiro', [
    ['151-03-00', 'Geólogo', 48], ['151-01-00', 'Engenheiro de Minas', 30], ['151-02-00', 'Engenheiro Geólogo', 12],
    ['151-04-00', 'Engenheiro de Exploração e Produção de Petróleo', 7], ['151-05-00', 'Geofísico', 3],
  ]),
  ...grupo('Geologia e minas', 'Tecnólogo', [
    ['152-01-01', 'Tecnólogo em Mineração', 55], ['152-04-00', 'Tecnólogo em Geologia', 25], ['152-03-00', 'Tecnólogo em Rochas Ornamentais', 20],
  ]),
  ...grupo('Agrimensura', 'Engenheiro', [
    ['161-02-00', 'Engenheiro Agrimensor', 40], ['161-03-00', 'Engenheiro Cartógrafo', 20], ['161-09-00', 'Geógrafo', 20],
    ['161-01-00', 'Agrimensor', 10], ['161-08-00', 'Engenheiro Topógrafo', 6], ['161-07-00', 'Engenheiro Geógrafo', 4],
  ]),
  ...grupo('Agrimensura', 'Tecnólogo', [
    ['162-02-00', 'Tecnólogo em Geoprocessamento', 50], ['162-01-00', 'Tecnólogo em Topografia', 35], ['162-03-00', 'Tecnólogo em Agrimensura', 15],
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
  : [['Engenheiro', 'Tecnólogo'], [modalidade === 'Civil' || modalidade === 'Agronomia' ? 86 : 80, modalidade === 'Civil' || modalidade === 'Agronomia' ? 14 : 20]];
