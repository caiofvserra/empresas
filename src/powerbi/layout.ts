import type { Campo, Visual } from './pbir';
import { comparacaoDe, detalheDe } from './comum';
import type { Cartao } from './comum';

/*
 * Grade comum das páginas dos painéis no relatório PBIR, em 1280 × 720 (o tamanho padrão do Power BI, que escala para Full HD):
 * título e filtros no alto, os cartões e os gráficos numa grade de 12 colunas. Cada cartão mostra o número, a comparação e a
 * linha de apoio, como no painel.
 */
export const campoMedida = (medida: string, rotulo?: string): Campo => ({ medida, ...(rotulo ? { rotulo } : {}) });
export const campoColuna = (tabela: string, coluna: string): Campo => ({ coluna: [tabela, coluna] });
const LARGURA = 1280, ALTURA = 720, MARGEM = 16, VAO = 8, ALTURA_CARTAO = 84;
export const TOPO = 68, CORPO = TOPO + ALTURA_CARTAO + VAO;
export const TAMANHO_DA_PAGINA = { largura: LARGURA, altura: ALTURA };
/** Um filtro do alto da página: lista suspensa (com uma só escolha quando `unica`) ou o controle deslizante do período. */
export interface Filtro { nome: string; campo: Campo; unica?: boolean; modo?: 'Single' }

export function cabecalho(pagina: string, titulo: string, filtros: Filtro[]): Visual[] {
  const inicio = 336, largura = Math.floor((LARGURA - MARGEM - inicio - VAO * (filtros.length - 1)) / filtros.length);
  return [
    { id: `${pagina}-titulo`, tipo: 'textbox', x: MARGEM, y: 8, w: 312, h: 52, texto: titulo },
    ...filtros.map(({ nome, campo, unica, modo }, i): Visual => ({ id: `${pagina}-filtro-${i + 1}`, tipo: 'slicer', x: inicio + i * (largura + VAO), y: 8, w: largura, h: 52, titulo: nome,
      papeis: { Values: [campo] }, segmentacao: { grupo: `filtro-${i + 1}`, unica, modo } })),
  ];
}

/** Os cartões da página: o título é o nome do cartão; embaixo do número, a comparação e a linha de apoio. */
export function cartoes(pagina: string, lista: Cartao[]): Visual[] {
  const largura = (LARGURA - 2 * MARGEM - VAO * (lista.length - 1)) / lista.length;
  return lista.map(({ nome, comparacao, detalhe }, i) => ({ id: `${pagina}-cartao-${i + 1}`, tipo: 'multiRowCard', x: Math.round(MARGEM + i * (largura + VAO)), y: TOPO, w: Math.round(largura), h: ALTURA_CARTAO, titulo: nome,
    papeis: { Values: [campoMedida(nome), ...(comparacao ? [campoMedida(comparacaoDe(nome))] : []), ...(detalhe ? [campoMedida(detalheDe(nome))] : [])] } }));
}

/** Lugar de um bloco na grade: coluna, linha, colunas e linhas ocupadas. */
export type Lugar = { coluna: number; linha: number; colunas: number; linhas: number };
/** Grade do corpo: colunas e linhas em frações da área abaixo de `topo` (os cartões, por padrão). */
export function caixa({ coluna, linha, colunas, linhas }: Lugar, totalColunas = 12, totalLinhas = 2, topo = CORPO) {
  const largura = (LARGURA - 2 * MARGEM - VAO * (totalColunas - 1)) / totalColunas, altura = (ALTURA - MARGEM - topo - VAO * (totalLinhas - 1)) / totalLinhas;
  return { x: Math.round(MARGEM + coluna * (largura + VAO)), y: Math.round(topo + linha * (altura + VAO)), w: Math.round(colunas * largura + (colunas - 1) * VAO), h: Math.round(linhas * altura + (linhas - 1) * VAO) };
}
export const lugar = (coluna: number, linha: number, colunas: number, linhas = 1): Lugar => ({ coluna, linha, colunas, linhas });
export const MES = campoColuna('Calendário', 'Rótulo');
