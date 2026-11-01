import management from '../domain/creasp-management-public.json';
import despesa from '../../public/data/engineer-statistics/conta-do-conselho.json';
import ativosUf from '../../public/data/engineer-statistics/confea-uf.json';
import situacaoUf from '../../public/data/engineer-statistics/confea-situacao-uf.json';
import generoUf from '../../public/data/engineer-statistics/confea-genero.json';
import populacaoUf from '../../public/data/engineer-statistics/populacao-uf.json';
import pisos from '../../public/data/engineer-statistics/pisos.json';
import registrosAno from '../../public/data/engineer-statistics/confea-registros-ano.json';
import formacaoCsv from '../../archives/data-publica-v6/educacao_sp_cine_ano.csv?raw';

/** Dados públicos REAIS versionados no repositório (sem consulta de rede), com fonte e data de captura. O Portal Salário (coleta pontual, fonte secundária) saiu na V20. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []; let field = '', row: string[] = [], quoted = false;
  const input = text.replace(/^﻿/, '');
  for (let index = 0; index < input.length; index++) {
    const character = input[index];
    if (quoted) { if (character === '"' && input[index + 1] === '"') { field += '"'; index++; } else if (character === '"') quoted = false; else field += character; continue; }
    if (character === '"') quoted = true;
    else if (character === ';') { row.push(field); field = ''; }
    else if (character === '\n' || character === '\r') { if (character === '\r' && input[index + 1] === '\n') index++; row.push(field); field = ''; if (row.some(value => value !== '')) rows.push(row); row = []; }
    else field += character;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.map(values => Object.fromEntries(head.map((key, index) => [key, values[index] ?? ''])));
}

const UF = ['RO', 'AC', 'AM', 'RR', 'PA', 'AP', 'TO', 'MA', 'PI', 'CE', 'RN', 'PB', 'PE', 'AL', 'SE', 'BA', 'MG', 'ES', 'RJ', 'SP', 'PR', 'SC', 'RS', 'MS', 'MT', 'GO', 'DF'];
const UF_CODE = ['11', '12', '13', '14', '15', '16', '17', '21', '22', '23', '24', '25', '26', '27', '28', '29', '31', '32', '33', '35', '41', '42', '43', '50', '51', '52', '53'];
export interface Fonte { nome: string; url: string; data: string }

export const resultados2025 = { fonte: { nome: management.metadata.sourceTitle, url: management.metadata.sourceUrl, data: management.metadata.retrievedAt } as Fonte,
  itens: management.facts.map(row => ({ id: row.id, label: row.label, display: row.displayValue, value: row.value, domain: row.domain })) };

export const despesaPublicada = { fonte: { nome: 'Portal da Transparência do CREA-SP', url: 'https://transparencia.creasp.org.br', data: despesa.meta.atualizadoEm } as Fonte,
  exercicios: despesa.data.itens.filter(row => row.bloco === 'execucao').map(row => ({ ano: row.ano, valor: row.valor })),
  subgrupos: despesa.data.itens.filter(row => row.bloco === 'subgrupos').map(row => ({ label: row.rotulo.toLocaleLowerCase('pt-BR').replace(/^./, character => character.toUpperCase()), valor: row.valor })),
  periodo: despesa.data.periodo };

export interface UfRow { uf: string; ativos: number; populacao: number; por100mil: number; pctAtivos: number | null; pctMulheres: number | null }
const population = new Map(populacaoUf.data.valores.map(row => [row.ufCodigo, row.valor]));
const situation = new Map(situacaoUf.data.valores.map(row => [row.ufCodigo, row.percentualAtivos]));
const gender = new Map(generoUf.data.valores.map(row => [row.ufCodigo, row.percentualFeminino]));
export const ufs: UfRow[] = ativosUf.data.valores.map(row => { const residents = population.get(row.ufCodigo) ?? 0;
  return { uf: UF[UF_CODE.indexOf(row.ufCodigo)] ?? row.ufCodigo, ativos: row.valor, populacao: residents, por100mil: residents ? row.valor / residents * 100000 : 0, pctAtivos: situation.get(row.ufCodigo) ?? null, pctMulheres: gender.get(row.ufCodigo) ?? null }; });
export const fonteConfea: Fonte = { nome: 'Confea SIC × IBGE (agregado 6579)', url: ativosUf.meta.snapshot.consultaUrl, data: ativosUf.meta.snapshot.capturadoEm };
export const brasil = { ativos: ufs.reduce((sum, row) => sum + row.ativos, 0), populacao: ufs.reduce((sum, row) => sum + row.populacao, 0), pctMulheres: generoUf.data.brasil ? generoUf.data.brasil.percentualFeminino : null };

const nacional = registrosAno.data.series.find(row => row.id === 'nacional')!, sp = registrosAno.data.series.find(row => row.id === 'crea-sp-decada')!;
export const registrosNovos = { fonte: { nome: 'Confea SIC · registros profissionais novos por ano', url: registrosAno.meta.snapshot.consultaUrl, data: registrosAno.meta.snapshot.capturadoEm } as Fonte,
  serie: nacional.valores.filter(row => /^\d{4}$/.test(row.periodo) && row.periodo >= '2010').map(row => ({ ano: row.periodo, brasil: row.valor, sp: sp.valores.find(item => item.periodo === row.periodo)?.valor ?? null })) };

/** Piso da Lei 4.950-A/66 na leitura do Confea (8,5 salários mínimos vigentes, jornada de 8 h). */
const leitura = pisos.data.leituras.find(row => row.id === 'confea-8_5sm')!;
export const piso = { valor8h: leitura.valorJornada8h ?? 0, salarioMinimo: pisos.data.salarioMinimoFallback.valor, referencia: leitura.ano, fonte: { nome: 'Lei 4.950-A/66 · leitura Confea (8,5 SM)', url: 'https://www.planalto.gov.br/ccivil_03/leis/l4950a.htm', data: pisos.meta.atualizadoEm } as Fonte };
/** Piso da Lei 4.950-A/66 com a base congelada pelo STF (ADPFs 53, 149 e 171) e na leitura Confea. Leitura descritiva e agregada: a regra por jornada ainda precisa ser versionada e validada pela GAJ. */
const stf = pisos.data.leituras.find(row => row.id === 'stf-congelado') as { baseCongeladaValor?: number; valorJornada8h?: number } | undefined;
export const pisoLegal = { base: stf?.baseCongeladaValor ?? 1212, exigivel8h: stf?.valorJornada8h ?? 10302, confea8h: leitura.valorJornada8h ?? 13778.5 };
/** Concluintes de cursos presenciais de engenharia em SP (Censo da Educação Superior/INEP), por curso e ano. */
const formacao = parseCsv(formacaoCsv).map(row => ({ code: row.code, curso: row.name, ano: row.year, concluintes: Number(row.graduates), ingressantes: Number(row.entrants) }));
const anos = [...new Set(formacao.map(row => row.ano))].sort();
export const formacaoSp = { fonte: { nome: 'INEP · Censo da Educação Superior (presencial, SP)', url: 'https://www.gov.br/inep', data: '2026-10-10' } as Fonte, anos,
  total: anos.map(ano => ({ ano, concluintes: formacao.filter(row => row.ano === ano).reduce((sum, row) => sum + row.concluintes, 0), ingressantes: formacao.filter(row => row.ano === ano).reduce((sum, row) => sum + row.ingressantes, 0) })),
  cursos: [...new Set(formacao.map(row => row.curso))].map(curso => ({ curso, serie: anos.map(ano => formacao.find(row => row.curso === curso && row.ano === ano)?.concluintes ?? 0) })).sort((a, b) => b.serie.at(-1)! - a.serie.at(-1)!) };
/** Mediana das admissões de engenheiro civil (Novo CAGED), referência para o piso. */
const admissao = (pisos.data.admissao as { id: string; rotulo: string; valor: number | null; ano: string }[]).find(row => row.id === 'mediana-eng-civil');
export const medianaAdmissaoCivil = admissao?.valor ? { valor: admissao.valor, periodo: admissao.ano } : null;
