/**
 * Sanções da CGU contra empresas (07/11/2026): o CEIS (inidôneas, suspensas e impedidas de contratar) e o CNEP (punidas pela
 * Lei Anticorrupção, Lei 12.846/2013), em ZIP diário e sem credencial no Portal da Transparência. O cruzamento com as empresas
 * registradas no Crea-SP roda na base interna (integrations/sql/sancoes-x-cadastro.sql). Funções puras: o download fica em
 * scripts/sancoes-cgu.ts. Só pessoa jurídica: CPF de sancionado não entra no staging.
 */
import { normalizar, registros } from './csv-ponto-e-virgula.ts';

/** Onde a sanção vale. "Sem informação" fica assim: a abrangência não se deduz da categoria, salvo a inidoneidade. */
export type AlcanceSancao = 'Todas as esferas' | 'Esfera do órgão' | 'Só o órgão' | 'Sem informação';
export interface SancaoPj {
  cadastro: 'CEIS' | 'CNEP'; codigo: string; cnpj: string; cnpjBasico: string; nome: string; processo: string;
  categoria: string; impedeContratar: boolean; alcance: AlcanceSancao;
  inicio: string; fim: string | null; orgao: string; ufOrgao: string; esfera: string; fundamentacao: string;
}

/** Começo do nome de cada coluna, sem acento: a CGU já mudou cabeçalho, e "ABRAGÊNCIA" está escrito assim no arquivo. */
const colunas = {
  cadastro: ['cadastro'], codigo: ['codigo da sancao'], tipo: ['tipo de pessoa'], documento: ['cpf ou cnpj'], nome: ['nome do sancionado'],
  processo: ['numero do processo'], categoria: ['categoria da sancao'], inicio: ['data inicio'], fim: ['data final'],
  abrangencia: ['abragencia', 'abrangencia'], orgao: ['orgao sancionador'], uf: ['uf orgao'], esfera: ['esfera orgao'], fundamentacao: ['fundamentacao'],
} as const;

/**
 * Impede contratar com a administração: impedimento ou proibição de contratar (Lei 14.133/2021, art. 156, III), inidoneidade
 * (art. 156, IV; Lei 8.666/1993, art. 87, IV) e a suspensão de licitar e contratar (Lei 8.666/1993, art. 87, III). A
 * suspensão ou interdição das atividades (Lei 12.846/2013, art. 19, II) é outra coisa e não entra.
 */
function impedeContratar(categoria: string) {
  const c = normalizar(categoria);
  return /impedimento|proibicao de contratar|inidoneidade/.test(c) || (c.startsWith('suspensao') && !c.includes('interdicao'));
}

/** A inidoneidade vale em toda a administração pública (Lei 14.133/2021, art. 156, § 5º). O resto segue a abrangência que o órgão informou. */
function alcance(categoria: string, abrangencia: string): AlcanceSancao {
  const a = normalizar(abrangencia);
  if (normalizar(categoria).includes('inidoneidade') || a.startsWith('todas as esferas')) return 'Todas as esferas';
  if (a.includes('esfera')) return 'Esfera do órgão';
  if (a.includes('orgao')) return 'Só o órgão';
  return 'Sem informação';
}

const data = (texto: string) => { const m = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
const esfera = (texto: string) => (texto ? texto[0].toUpperCase() + texto.slice(1).toLowerCase() : '');

/** Lê o CSV do CEIS ou do CNEP (";", entre aspas) pelo nome das colunas e devolve só as sanções contra pessoa jurídica. */
export function lerSancoes(texto: string): SancaoPj[] {
  const [primeira = [], ...linhas] = registros(texto.replace(/^﻿/, '')), cabecalho = primeira.map(normalizar);
  const indice = Object.fromEntries(Object.entries(colunas).map(([campo, trechos]) => [campo, cabecalho.findIndex(c => trechos.some(t => c.startsWith(t)))])) as Record<keyof typeof colunas, number>;
  if (indice.documento < 0) throw new Error(`O arquivo da CGU não tem a coluna CPF OU CNPJ DO SANCIONADO. Cabeçalho lido: ${primeira.join(';')}`);
  const saida: SancaoPj[] = [];
  for (const campos of linhas) {
    const valor = (campo: keyof typeof colunas) => (indice[campo] < 0 ? '' : campos[indice[campo]] ?? '').trim();
    const cnpj = valor('documento').replace(/\D/g, ''), cadastro = valor('cadastro').toUpperCase();
    if (cnpj.length !== 14 || (indice.tipo >= 0 && valor('tipo') !== 'J') || (cadastro !== 'CEIS' && cadastro !== 'CNEP')) continue;
    const categoria = valor('categoria');
    saida.push({
      cadastro, codigo: valor('codigo'), cnpj, cnpjBasico: cnpj.slice(0, 8), nome: valor('nome'), processo: valor('processo'),
      categoria, impedeContratar: impedeContratar(categoria), alcance: alcance(categoria, valor('abrangencia')),
      inicio: data(valor('inicio')) ?? '', fim: data(valor('fim')), orgao: valor('orgao'), ufOrgao: valor('uf'), esfera: esfera(valor('esfera')),
      fundamentacao: valor('fundamentacao'),
    });
  }
  return saida;
}

/** As sanções em vigor na data (AAAA-MM-DD): começaram até ela e não terminaram antes dela. Sem data final, seguem em vigor. */
export const vigentes = (sancoes: SancaoPj[], dia: string) => sancoes.filter(s => s.inicio && s.inicio <= dia && (s.fim === null || s.fim >= dia));

/** O CSV de staging que o coletor grava e o SQL do cruzamento lê. Valores em texto, datas em AAAA-MM-DD, vazio quando não há. */
export const colunasStagingSancoes = {
  arquivo: 'sancoes-pj.csv', tabela: 'stg.cgu_sancao',
  colunas: ['data_arquivo', 'cadastro', 'codigo', 'cnpj', 'cnpj_basico', 'nome', 'categoria', 'impede_contratar', 'alcance', 'inicio', 'fim', 'orgao', 'uf_orgao', 'esfera', 'processo', 'fundamentacao'],
} as const;

export const linhaStaging = (dataArquivo: string, s: SancaoPj) => [dataArquivo, s.cadastro, s.codigo, s.cnpj, s.cnpjBasico, s.nome, s.categoria,
  s.impedeContratar ? 'Sim' : 'Não', s.alcance, s.inicio, s.fim ?? '', s.orgao, s.ufOrgao, s.esfera, s.processo, s.fundamentacao];
