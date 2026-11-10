import planilha from './confea-planilha.json';
import management from './creasp-management-public.json';
import type { Dataset } from './types';
import { municipiosSp } from './municipios';
import { chance } from './hash';
import { diasUteis } from './atendimento';

/**
 * Painel de Indicadores do Sistema (10/11/2026): as 161 métricas que o Crea-SP manda ao Confea na planilha "Relação de Dados e
 * Indicadores de Resultados do Sistema" (Anexo IV da PL-2260/2023) e os 35 indicadores que o Confea calcula com elas, por
 * subprograma. O painel é do Crea-SP: serve para conferir os números antes do envio, acompanhar o exercício em curso e ver onde o
 * Crea-SP fica em relação ao Sistema. Análise dos documentos em docs/pesquisa/confea-prestacao-contas/.
 *
 * Os números são de um cenário de demonstração, menos os quatro publicados no Sumário Executivo do Relatório de Gestão 2025 do
 * Crea-SP (novos profissionais, novas empresas, ARTs, ações de fiscalização e autos), que entram exatos no exercício de 2025 e
 * levam o selo Real. O cenário planta de propósito duas conferências que não fecham (60 e 98 em 2025) e três métricas vazias, para mostrar o que a
 * página Entrega ao Confea aponta antes do envio.
 */

/* ---------- A planilha ---------- */
export type Subprograma = 'Registro' | 'Fiscalização' | 'Julgamento' | 'Liderança' | 'Suporte';
export const subprogramas: Subprograma[] = ['Registro', 'Fiscalização', 'Julgamento', 'Suporte', 'Liderança'];
export interface Metrica { codigo: number; subprograma: Subprograma; tema: string; nome: string; recorte: 'fim' | 'exercicio' | 'publicacao'; formato: 'inteiro' | 'decimal'; definicao: string; orientacao: string; indicadores: number[] }
export interface IndicadorConfea { codigo: number; subprograma: string; nome: string; objetivo: string; formula: string; medida: string; responsavel: string; observacao: string }
export const metricas = planilha.metricas as Metrica[];
export const indicadoresConfea = planilha.indicadores as IndicadorConfea[];
export const metricaPorCodigo = new Map(metricas.map(m => [m.codigo, m]));
export const indicadorPorCodigo = new Map(indicadoresConfea.map(i => [i.codigo, i]));
export const TOTAL_METRICAS = metricas.length;

/** Indicadores da 3ª instância: os processos julgados no Confea. O Crea-SP não tem esses números; o painel mostra só a referência do Sistema. */
export const DA_TERCEIRA_INSTANCIA = [23, 24, 25, 32, 33, 34];
/** Métricas em reais (as despesas do subprograma Suporte); as outras são contagens, menos os tempos médios, em dias. */
export const emReais = (codigo: number) => codigo >= 150;
export const emDias = (codigo: number) => [55, 73, 82, 93, 111, 121].includes(codigo);

/** Nome curto de cada indicador, para os cartões e as tabelas; o nome oficial fica no (i) e no painel lateral. */
export const nomeCurtoIndicador: Record<number, string> = {
  1: 'Crescimento dos profissionais', 2: 'Crescimento das empresas', 3: 'Quadro técnico por empresa', 4: 'Profissionais que registram ART', 5: 'ARTs por profissional',
  6: 'Profissionais com CAT', 7: 'CATs com atestado por profissional', 8: 'Inadimplência dos profissionais', 9: 'Inadimplência das empresas', 10: 'Crescimento das anuidades não pagas',
  11: 'Agentes fiscais no quadro', 12: 'Índice de autuação', 13: 'Fiscalizações por fiscal por dia', 14: 'Municípios fiscalizados', 15: 'Denúncias apuradas', 16: 'Despesa com fiscalização',
  17: 'Eficiência na 1ª instância: infração', 18: 'Eficiência na 1ª instância: conduta', 19: 'Eficiência na 1ª instância: ética',
  20: 'Eficiência na 2ª instância: infração', 21: 'Eficiência na 2ª instância: conduta', 22: 'Eficiência na 2ª instância: ética',
  23: 'Eficiência na 3ª instância: infração', 24: 'Eficiência na 3ª instância: conduta', 25: 'Eficiência na 3ª instância: ética',
  26: 'Eficácia na 1ª instância: infração', 27: 'Eficácia na 1ª instância: conduta', 28: 'Eficácia na 1ª instância: ética',
  29: 'Eficácia na 2ª instância: infração', 30: 'Eficácia na 2ª instância: conduta', 31: 'Eficácia na 2ª instância: ética',
  32: 'Eficácia na 3ª instância: infração', 33: 'Eficácia na 3ª instância: conduta', 34: 'Eficácia na 3ª instância: ética', 35: 'Crescimento das multas não pagas',
};

/* ---------- Referências do Sistema (Caderno de Resultados 2021 do Confea) ---------- */
/** Média simples entre os Creas em 2021 e, quando o caderno traz, a do Sudeste. Referência, não meta. */
export const referencias2021: Record<number, { brasil: number; sudeste?: number }> = {
  1: { brasil: 8, sudeste: -3 }, 3: { brasil: 1.32, sudeste: 1.48 }, 4: { brasil: 33 }, 5: { brasil: 9.85 }, 8: { brasil: 35, sudeste: 28 }, 9: { brasil: 40, sudeste: 44 },
  11: { brasil: 17, sudeste: 16 }, 12: { brasil: 21, sudeste: 32 }, 13: { brasil: 3.19, sudeste: 4.27 }, 14: { brasil: 97, sudeste: 100 }, 15: { brasil: 82, sudeste: 87 },
  16: { brasil: 15 }, 17: { brasil: 51 }, 20: { brasil: 64 }, 23: { brasil: 87 }, 32: { brasil: 75 },
};
/** As notas do Caderno de 2021 que citam o Crea-SP: o que não foi mandado ou foi descartado, e as métricas de cada caso. */
export const notasCaderno2021: { nota: number; assunto: string; houve: string; metricas: number[]; indicadores: number[] }[] = [
  { nota: 23, assunto: 'Capacitação dos agentes fiscais; seguro, calibração e manutenção de equipamentos', houve: 'Não mandou', metricas: [156, 157], indicadores: [16] },
  { nota: 24, assunto: 'Parte da despesa corrente gasta com fiscalização', houve: 'Descartado por erro de conta', metricas: [150, 153, 155, 156, 157, 158, 159, 160, 161], indicadores: [16] },
  { nota: 31, assunto: 'Denúncias por conduta incompatível julgadas na 1ª instância', houve: 'Não mandou', metricas: [53, 74, 75], indicadores: [18] },
  { nota: 33, assunto: 'Eficiência do julgamento na 1ª instância, nos três tipos de processo', houve: 'Descartado por erro de conta ou incoerência', metricas: [56, 57, 58, 74, 75, 83, 84], indicadores: [17, 18, 19] },
  { nota: 36, assunto: 'Denúncias por conduta incompatível na 2ª instância', houve: 'Não mandou', metricas: [112, 113, 114], indicadores: [21] },
  { nota: 38, assunto: 'Eficiência do julgamento na 2ª instância, nos três tipos de processo', houve: 'Descartado por erro de conta', metricas: [94, 95, 96, 112, 113, 114, 122, 123, 124], indicadores: [20, 21, 22] },
];
/** Metas do Plano de Melhoria da Fiscalização (PMF 2025-2027) que o Relatório de Gestão 2024 do Confea cita. */
export const metasPmf = {
  acoes: { codigo: '2.3', texto: 'Aumentar em 12% as ações de fiscalização até 2027', base: 2024, alvo: 12 },
  julgamento: { codigo: '5.1', texto: 'Julgar 90% dos processos de infração em até 180 dias', dias: 180, alvo: 90 },
  etica: { codigo: '5.2', texto: 'Julgar os processos éticos em até 360 dias', dias: 360, alvo: 90 },
  registro: { codigo: '5.3', texto: 'Concluir o registro em até 30 dias', dias: 30, alvo: 90 },
};

/* ---------- Dados reais (Sumário Executivo 2025 do Crea-SP) ---------- */
const fato = (id: string) => management.facts.find(row => row.id === id)!;
export const fonteSumario = { nome: management.metadata.sourceTitle, url: management.metadata.sourceUrl, data: management.metadata.retrievedAt };
export const ANO_REAL = management.metadata.referenceYear;
/** Métrica da planilha com o número publicado no Sumário de 2025. `soma`: o real é a soma de duas métricas (novos profissionais de nível superior e médio). */
export const reais: Record<number, { valor: number; texto: string; aproximado?: boolean; soma?: number[] }> = {
  2: { valor: fato('creasp-2025-new-professional-registrations').value, texto: 'Real na soma das métricas 2 e 7', soma: [2, 7] },
  7: { valor: fato('creasp-2025-new-professional-registrations').value, texto: 'Real na soma das métricas 2 e 7', soma: [2, 7] },
  20: { valor: fato('creasp-2025-new-company-registrations').value, texto: 'Real' },
  25: { valor: fato('creasp-2025-arts').value, texto: 'Real' },
  37: { valor: fato('creasp-2025-inspection-actions').value, texto: 'Real' },
  38: { valor: fato('creasp-2025-infraction-notices').value, texto: 'Real, aproximado ("cerca de 201 mil")', aproximado: true },
};

/* ---------- O cenário ---------- */
/** Métricas que se dividem por regional: registro, fiscalização, quadro de pessoal e anuidades e multas não pagas. As outras são do Conselho inteiro. */
const REGIONAIS = new Set([...range(1, 33), ...range(35, 52), ...range(140, 149)]);
export const porRegional = (codigo: number) => REGIONAIS.has(codigo) || codigo === 34;
function range(de: number, ate: number) { return Array.from({ length: ate - de + 1 }, (_, i) => de + i); }
/** O primeiro exercício do painel e o primeiro do cenário (um a mais, para o "exercício anterior" de 2022). */
export const PRIMEIRO_EXERCICIO = 2022;
const ANO_BASE = 2025;
/** Vazias de propósito: tempo de tramitação da conduta incompatível na 2ª instância, capacitação dos fiscais e equipamentos (nota 23 do Caderno de 2021). */
export const VAZIAS_DO_CENARIO = [111, 156, 157];

type Valores = Map<number, number | null>;
const r = (v: number) => Math.round(v);
/** Ruído pequeno e estável por métrica e ano, para os anos não serem uma reta. */
const ruido = (chave: string, amplitude = 0.015) => 1 + (chance(chave) - 0.5) * 2 * amplitude;
/** Divide `total` em partes inteiras pelos pesos, sem perder unidade (maior resto). */
function dividir(total: number, pesos: number[]): number[] {
  const soma = pesos.reduce((a, b) => a + b, 0) || 1, brutos = pesos.map(p => total * p / soma), base = brutos.map(Math.floor);
  let falta = total - base.reduce((a, b) => a + b, 0);
  const ordem = brutos.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; falta > 0 && k < ordem.length; k++, falta--) base[ordem[k][1]]++;
  return base;
}

/** Valor de 2025 e crescimento por ano de cada grandeza que gera as métricas. */
const BASE = {
  profSuperior: [318_400, 0.021], visSuperior: [21_300, 0.01], tecnicos: [14_900, 0.03], visTecnicos: [600, 0.0],
  empresas: [121_500, 0.038], visEmpresas: [2_900, 0.02], arts: [fato('creasp-2025-arts').value, 0.045], cats: [56_000, 0.03], profCat: [23_900, 0.03],
  acoes: [fato('creasp-2025-inspection-actions').value, 0.05], autos: [201_000, 0.04], denuncias: [8_900, 0.03],
  recebidos1: [38_600, 0.04], recebidos2: [4_300, 0.05], empregados: [1_712, 0.01], fiscais: [312, 0.02],
  anuidadesProf: [281_000, 0.045], anuidadesEmp: [74_200, 0.035], multas: [171_500, 0.055], despesa: [398_600_000, 0.06],
} as const;
const grandeza = (nome: keyof typeof BASE, ano: number) => { const [v, g] = BASE[nome]; return v * (1 + g) ** (ano - ANO_BASE) * (ano === ANO_BASE ? 1 : ruido(`${nome}|${ano}`)); };
/** Parte de cada capitulação nos autos (métricas 39 a 50): o art. 1º da Lei 6.496/77 (falta de ART) e o art. 59 (empresa sem registro) somam 60%. */
const CAPITULACOES = [14, 2, 1, 0.5, 0.5, 8, 9, 1.5, 22, 1, 38, 2.5];
/**
 * Parte de cada modalidade nos profissionais de nível superior ativos (métricas 11 a 18). Os técnicos de nível médio no Crea são só os
 * de Segurança do Trabalho: entram todos na Especial (métrica 18).
 */
const MODALIDADES = [1.8, 7.5, 47, 21, 1.2, 14, 3, 2];
/** Ritmo anual de cada modalidade: Segurança do Trabalho e Eletricista crescem mais; Agrimensura e Geologia e Minas, menos. */
const RITMO_MODALIDADE = [-0.012, 0.014, 0.022, 0.034, -0.006, 0.026, 0.004, 0.052];
/**
 * Motivos de arquivamento sem êxito: erro de capitulação, descrição insuficiente, excesso de exação, falta de motivo, prescrição, outros.
 * Na 2ª instância pesam mais a prescrição e a falta de motivação, menos o erro de capitulação.
 */
const SEM_EXITO = [34, 18, 3, 25, 8, 12], SEM_EXITO_2 = [22, 14, 4, 31, 17, 12];
/**
 * A fila de uma instância, ano a ano desde 2021: os pendentes de anos anteriores de um exercício são o que ficou do anterior
 * (pendentes mais recebidos menos julgados), como a planilha pede.
 */
function fila(nome: 'recebidos1' | 'recebidos2', pendentesEm2021: number, eficiencia: number, ano: number) {
  let pendentes = pendentesEm2021;
  for (let a = PRIMEIRO_EXERCICIO - 1; ; a++) {
    const recebidos = grandeza(nome, a), julgados = r((recebidos + pendentes) * eficiencia * ruido(`fila|${nome}|${a}`, 0.05));
    if (a === ano) return { pendentes, recebidos, julgados };
    pendentes = r(pendentes + recebidos - julgados);
  }
}

/** As 161 métricas do Conselho inteiro num exercício completo, pelo cenário. */
function cenarioDoAno(ano: number): Valores {
  const m: Valores = new Map(), put = (codigo: number, valor: number | null) => m.set(codigo, valor === null ? null : codigo >= 150 ? Math.round(valor * 100) / 100 : r(valor));
  const k = (c: number) => ruido(`m${c}|${ano}`, 0.04);
  // Registro
  const prof = (a: number) => r(grandeza('profSuperior', a)), tec = (a: number) => r(grandeza('tecnicos', a));
  put(1, prof(ano - 1)); put(3, prof(ano)); put(4, grandeza('visSuperior', ano)); put(5, prof(ano) * 0.26 * k(5));
  put(6, tec(ano - 1)); put(8, tec(ano)); put(9, grandeza('visTecnicos', ano)); put(10, tec(ano) * 0.33 * k(10));
  const novosTec = r(1_475 * ruido(`novos-tec|${ano}`, 0.05));
  put(7, novosTec); put(2, ano === ANO_REAL ? reais[2].valor - novosTec : r(24_100 * (1.03 ** (ano - ANO_BASE)) * ruido(`novos-sup|${ano}`, 0.04)));
  dividir(prof(ano), MODALIDADES.map((p, i) => p * (1 + RITMO_MODALIDADE[i]) ** (ano - ANO_BASE) * ruido(`mod${i}|${ano}`, 0.004))).forEach((v, i) => put(11 + i, v));
  put(18, m.get(18)! + tec(ano));
  const emp = (a: number) => r(grandeza('empresas', a));
  put(19, emp(ano - 1)); put(21, emp(ano)); put(22, grandeza('visEmpresas', ano)); put(23, emp(ano) * 0.31 * k(23));
  put(20, ano === ANO_REAL ? reais[20].valor : 26_800 * 1.035 ** (ano - ANO_BASE) * ruido(`novas-emp|${ano}`, 0.04));
  put(24, (emp(ano) + m.get(22)!) * 1.42 * k(24));
  const arts = ano === ANO_REAL ? reais[25].valor : grandeza('arts', ano);
  put(25, arts); put(26, arts * 0.86 * ruido(`m26|${ano}`, 0.01)); put(27, (prof(ano) + tec(ano) + m.get(4)! + m.get(9)!) * 0.41 * k(27));
  const cats = grandeza('cats', ano); put(28, cats * 0.254); put(29, cats * 0.746); put(30, grandeza('profCat', ano));
  // Fiscalização (os municípios fiscalizados vêm do sorteio por município, em `quadroSistema`)
  put(31, 180 + (ano - ANO_BASE) * 4); put(32, 160 + (ano - ANO_BASE) * 6); put(34, 645); put(35, 129); put(36, 41);
  const acoes = ano === ANO_REAL ? reais[37].valor : grandeza('acoes', ano), autos = ano === ANO_REAL ? reais[38].valor : grandeza('autos', ano);
  put(37, acoes); put(38, autos);
  dividir(r(autos), CAPITULACOES).forEach((v, i) => put(39 + i, v));
  const den = grandeza('denuncias', ano); put(51, den); put(52, den * 0.865 * ruido(`m52|${ano}`, 0.03)); put(53, 46 * k(53)); put(54, 210 * k(54));
  // Julgamento, 1ª instância (câmaras especializadas)
  const f1 = fila('recebidos1', 21_400, 0.52, ano);
  put(55, 312 * ruido(`t55|${ano}`, 0.06)); put(56, f1.pendentes); put(57, f1.recebidos); put(58, f1.julgados); put(59, 140 * k(59));
  julgados(m, 60, ano, 26_800 * 1.04 ** (ano - ANO_BASE), 0.817, [42, 51, 6, 1], 67, SEM_EXITO);
  // O total de transitados da 1ª instância não fecha com com êxito mais sem êxito em 2025 (conferência plantada).
  if (ano === ANO_BASE) m.set(60, m.get(60)! + 37);
  put(73, ano <= 2023 ? null : 420 * ruido(`t73|${ano}`, 0.08)); put(74, 38 * k(74)); put(75, 31 * k(75));
  const t76 = r(24 * k(76)), c77 = r(t76 * 0.25); put(76, t76); put(77, c77); put(78, t76 - c77); dividir(t76 - c77, [45, 20, 35]).forEach((v, i) => put(79 + i, v));
  put(82, 388 * ruido(`t82|${ano}`, 0.06)); put(83, 260 * k(83)); put(84, 170 * k(84));
  etica(m, 85, ano, 140 * k(85), 0.6);
  // 2ª instância (Plenário)
  const f2 = fila('recebidos2', 1_900, 0.64, ano);
  put(93, 205 * ruido(`t93|${ano}`, 0.06)); put(94, f2.pendentes); put(95, f2.recebidos); put(96, f2.julgados); put(97, 30 * k(97));
  julgados(m, 98, ano, 3_400 * 1.05 ** (ano - ANO_BASE), 0.78, [40, 54, 5, 1], 105, SEM_EXITO_2);
  // A soma dos resultados da 2ª instância não fecha com o total em 2025 (conferência plantada).
  if (ano === ANO_BASE) m.set(98, m.get(98)! + 12);
  put(111, 300); put(112, 9 * k(112)); put(113, 8 * k(113)); put(114, 10 * k(114));
  const t115 = r(7 * k(115)), c116 = r(t115 * 0.3); put(115, t115); put(116, c116); put(117, t115 - c116); dividir(t115 - c116, [45, 20, 35]).forEach((v, i) => put(118 + i, v));
  put(121, 240 * ruido(`t121|${ano}`, 0.06)); put(122, 70 * k(122)); put(123, 64 * k(123)); put(124, 72 * k(124));
  etica(m, 125, ano, 58 * k(125), 0.7);
  put(133, 38 * k(133)); put(134, 3);
  // Liderança
  put(135, 196); put(136, 108); put(137, 222); put(138, 86); put(139, 812 * k(139));
  // Suporte
  put(140, grandeza('empregados', ano)); put(141, m.get(140)! * 0.357); put(142, grandeza('fiscais', ano)); put(143, m.get(142)! * 1.46);
  put(144, grandeza('anuidadesProf', ano - 1)); put(145, grandeza('anuidadesProf', ano)); put(146, grandeza('anuidadesEmp', ano - 1)); put(147, grandeza('anuidadesEmp', ano));
  put(148, grandeza('multas', ano - 1)); put(149, grandeza('multas', ano));
  const desp = grandeza('despesa', ano), f = desp / BASE.despesa[0];
  put(150, desp); put(151, 9_800_000 * f); put(152, 2_100_000 * f); put(153, 6_400_000 * f * k(153)); put(154, 58_200_000 * f); put(155, 79_500_000 * f);
  put(156, 620_000 * f); put(157, 310_000 * f); put(158, 480_000 * f); put(159, 2_900_000 * f * k(159)); put(160, 7_600_000 * f * k(160)); put(161, 5_300_000 * f * k(161));
  for (const codigo of VAZIAS_DO_CENARIO) m.set(codigo, null);
  return m;
}
/** Decisões transitadas em julgado de infração à legislação: o total, com êxito (multas e suspensão) e sem êxito (seis motivos). */
function julgados(m: Valores, total: number, ano: number, valor: number, exito: number, partesExito: number[], primeiroMotivo: number, motivos: number[]) {
  const t = r(valor * ruido(`j${total}|${ano}`, 0.04)), e = r(t * exito * ruido(`x${total}|${ano}`, 0.02));
  m.set(total, t); m.set(total + 1, e); dividir(e, partesExito).forEach((v, i) => m.set(total + 2 + i, v));
  m.set(total + 6, t - e); dividir(t - e, motivos.map((p, i) => p * ruido(`motivo${primeiroMotivo + i}|${ano}`, 0.06))).forEach((v, i) => m.set(primeiroMotivo + i, v));
}
/** Decisões transitadas em julgado dos processos éticos: o total, com êxito (advertência e censura) e sem êxito (três motivos). */
function etica(m: Valores, total: number, ano: number, valor: number, exito: number) {
  const t = r(valor), e = r(t * exito * ruido(`x${total}|${ano}`, 0.04));
  m.set(total, t); m.set(total + 1, e); dividir(e, [72, 28]).forEach((v, i) => m.set(total + 2 + i, v));
  m.set(total + 4, t - e); dividir(t - e, [50, 15, 35]).forEach((v, i) => m.set(total + 5 + i, v));
}

/* ---------- O exercício lido numa data ---------- */
export interface Exercicio { ano: number; inicio: string; fim: string; parcial: boolean; rotulo: string }
const MESES = ['jan.', 'fev.', 'mar.', 'abr.', 'maio', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
/** Os exercícios que dá para ler na data: os completos desde 2022 e o do ano da data, parcial até ela. */
export function exerciciosNaData(anchor: string): Exercicio[] {
  const anoData = Number(anchor.slice(0, 4)), out: Exercicio[] = [];
  for (let ano = PRIMEIRO_EXERCICIO; ano <= anoData; ano++) {
    const fimAno = `${ano}-12-31`, parcial = anchor < fimAno, fim = parcial ? anchor : fimAno;
    if (parcial && anchor.slice(5) === '01-01') continue;
    out.push({ ano, inicio: `${ano}-01-01`, fim, parcial, rotulo: parcial ? `${ano} até ${Number(anchor.slice(8, 10))} de ${MESES[Number(anchor.slice(5, 7)) - 1]}` : String(ano) });
  }
  return out;
}
/** O exercício que o painel abre: o último completo na data. */
export const exercicioPadrao = (anchor: string) => { const lista = exerciciosNaData(anchor); return (lista.filter(e => !e.parcial).at(-1) ?? lista.at(-1)!).ano; };
/** Parte do ano já passada na data (em dias), para os fluxos do exercício em curso. */
const parteDoAno = (ex: Exercicio) => ex.parcial ? (Date.parse(ex.fim) - Date.parse(`${ex.ano - 1}-12-31`)) / (Date.parse(`${ex.ano}-12-31`) - Date.parse(`${ex.ano - 1}-12-31`)) : 1;

const cache = new Map<string, Valores>();
function doAno(ano: number) { const chave = String(ano); let v = cache.get(chave); if (!v) { v = cenarioDoAno(ano); cache.set(chave, v); } return v; }
/**
 * As métricas do Conselho inteiro num exercício: completo, como o cenário; parcial, com os fluxos do ano proporcionais aos dias
 * passados e os estoques entre o fim do ano anterior e o fim do ano. As métricas do "exercício anterior" ficam as de 31/12 do ano anterior.
 */
export function metricasDoEstado(ex: Exercicio): Valores {
  const cheio = doAno(ex.ano); if (!ex.parcial) return cheio;
  const antes = doAno(ex.ano - 1), p = parteDoAno(ex), out: Valores = new Map();
  for (const m of metricas) {
    const v = cheio.get(m.codigo) ?? null, a = antes.get(m.codigo) ?? null;
    if (v === null) out.set(m.codigo, null);
    else if (emDias(m.codigo) || m.recorte === 'publicacao' || NO_INICIO_DO_EXERCICIO.has(m.codigo) || m.subprograma === 'Liderança' || [31, 32, 35, 36].includes(m.codigo)) out.set(m.codigo, v);
    else if (m.recorte === 'fim') out.set(m.codigo, a === null ? v : Math.round(a + (v - a) * p));
    else out.set(m.codigo, m.codigo >= 150 ? Math.round(v * p * 100) / 100 : Math.round(v * p));
  }
  // As somas continuam fechando como no ano cheio: refaz as partes pelo total já proporcional.
  for (const [total, partes] of SOMAS) { const t = out.get(total), base = partes.map(c => cheio.get(c) ?? 0), somaCheia = base.reduce((a, b) => a + b, 0), totalCheio = cheio.get(total) ?? 0;
    if (t === null || t === undefined || !somaCheia) continue; dividir(Math.round(t * somaCheia / (totalCheio || 1)), base).forEach((v, i) => out.set(partes[i], v)); }
  return out;
}

/* ---------- Regionais e municípios ---------- */
/** Peso de cada regional: a população dos seus municípios (IBGE), com um ruído estável por métrica, para as regionais não serem só proporcionais. */
function pesosDasRegionais(dataset: Dataset) {
  const pop = new Map<string, number>(); for (const mun of municipiosSp(dataset)) pop.set(mun.greId, (pop.get(mun.greId) ?? 0) + mun.populacao);
  return dataset.gres.map(g => ({ greId: g.id, pop: pop.get(g.id) ?? 1, municipios: municipiosSp(dataset).filter(mun => mun.greId === g.id).length }));
}
const FAMILIA_REGIONAL = new Map<number, string>([
  ...[1, 2, 3, 4, 5].map(c => [c, 'prof'] as const), ...[6, 7, 8, 9, 10].map(c => [c, 'tec'] as const), ...[19, 20, 21, 22, 23, 24].map(c => [c, 'emp'] as const),
  [144, 'anuidade-prof'], [145, 'anuidade-prof'], [146, 'anuidade-emp'], [147, 'anuidade-emp'], [148, 'multas'], [149, 'multas'],
]);
const ANTERIOR = new Set([1, 6, 19, 144, 146, 148]);
const ESTOQUE = new Set([3, 8, 21, 145, 147, 149]);
/** Estoques lidos no começo do exercício: no exercício em curso, valem inteiros desde 1º de janeiro (os do ano anterior e os pendentes de anos anteriores). */
const NO_INICIO_DO_EXERCICIO = new Set([...ANTERIOR, 56, 94]);
/** As métricas de cada regional: as que se dividem por regional repartem o valor do estado sem perder unidade; as outras ficam nulas. */
function metricasDasRegionais(dataset: Dataset, ex: Exercicio, estado: Valores, municipios: Map<string, { acoes: number; autos: number }>) {
  const gres = pesosDasRegionais(dataset), porGre = new Map(gres.map(g => [g.greId, new Map<number, number | null>()]));
  for (const m of metricas) {
    const total = estado.get(m.codigo) ?? null;
    if (!porRegional(m.codigo)) { for (const g of gres) porGre.get(g.greId)!.set(m.codigo, null); continue; }
    if (total === null) { for (const g of gres) porGre.get(g.greId)!.set(m.codigo, null); continue; }
    if (m.codigo === 34) { for (const g of gres) porGre.get(g.greId)!.set(34, g.municipios); continue; }
    // Métricas da mesma família (estoque do ano anterior, estoque atual, visto, inadimplentes) repartem pelo mesmo peso, para o crescimento
    // de cada regional ficar perto do crescimento do estado. O estoque do ano anterior usa o peso do ano anterior.
    const familia = FAMILIA_REGIONAL.get(m.codigo), chave = familia ?? String(m.codigo), ano = ANTERIOR.has(m.codigo) ? ex.ano - 1 : ex.ano;
    // Visto, inadimplentes e novos registros variam um pouco por regional em torno do estoque da família.
    const proprio = (greId: string) => familia && !ANTERIOR.has(m.codigo) && !ESTOQUE.has(m.codigo) ? ruido(`gre|${greId}|${m.codigo}`, 0.1) : 1;
    const pesos = gres.map(g => g.pop ** 0.92 * ruido(`gre|${g.greId}|${chave}`, 0.12) * ruido(`gre|${g.greId}|${chave}|${ano}`, 0.012) * proprio(g.greId));
    dividir(Math.round(total), pesos).forEach((v, i) => porGre.get(gres[i].greId)!.set(m.codigo, v));
  }
  // Ações, autos e municípios fiscalizados saem da soma dos municípios.
  const munGre = new Map(municipiosSp(dataset).map(mun => [mun.id, mun.greId]));
  for (const g of gres) { const daGre = porGre.get(g.greId)!; daGre.set(33, 0); daGre.set(37, 0); daGre.set(38, 0); }
  for (const [cityId, v] of municipios) { const daGre = porGre.get(munGre.get(cityId)!)!; daGre.set(37, daGre.get(37)! + v.acoes); daGre.set(38, daGre.get(38)! + v.autos); if (v.acoes > 0) daGre.set(33, daGre.get(33)! + 1); }
  // As capitulações seguem os autos de cada regional.
  for (const g of gres) { const daGre = porGre.get(g.greId)!, base = range(39, 50).map(c => estado.get(c) ?? 0); dividir(Math.round(daGre.get(38)! * base.reduce((a, b) => a + b, 0) / Math.max(1, estado.get(38) ?? 1)), base).forEach((v, i) => daGre.set(39 + i, v)); }
  return porGre;
}
/**
 * Ações e autos de cada um dos 645 municípios no exercício. Os grandes são fiscalizados todo ano; nos pequenos, a chance de ficar sem
 * ação no ano cresce com o tamanho menor (no cenário, de 5 a 15 municípios por ano).
 */
function acoesPorMunicipio(dataset: Dataset, ex: Exercicio, estado: Valores) {
  const muns = municipiosSp(dataset), fiscalizado = muns.map(mun => mun.populacao >= 8_000 || chance(`fisc|${mun.id}|${ex.ano}`) > (ex.parcial ? 0.16 : 0.07));
  const pesos = muns.map((mun, i) => fiscalizado[i] ? mun.populacao ** 0.85 * ruido(`acoes|${mun.id}|${ex.ano}`, 0.25) : 0);
  const acoes = dividir(Math.round(estado.get(37) ?? 0), pesos), taxa = (estado.get(38) ?? 0) / Math.max(1, estado.get(37) ?? 1);
  const autos = dividir(Math.round(estado.get(38) ?? 0), acoes.map((a, i) => a * taxa * ruido(`autos|${muns[i].id}|${ex.ano}`, 0.3)));
  return new Map(muns.map((mun, i) => [mun.id, { acoes: acoes[i], autos: autos[i] }]));
}

/* ---------- Indicadores ---------- */
export interface ValorIndicador { codigo: number; valor: number | null; falta: number[]; terceira: boolean }
const div = (a: number, b: number) => b ? a / b : null;
/** Fórmula de cada indicador do Crea, sobre as métricas (a fórmula oficial está em `indicadorPorCodigo`). As taxas saem em %. */
const FORMULAS: Record<number, { usa: number[]; calc: (v: (c: number) => number, ex: Exercicio) => number | null; pct?: boolean }> = {
  1: { usa: [1, 3, 6, 8], calc: v => div(v(3) + v(8) - v(1) - v(6), v(1) + v(6)), pct: true },
  2: { usa: [19, 21], calc: v => div(v(21) - v(19), v(19)), pct: true },
  3: { usa: [21, 22, 24], calc: v => div(v(24), v(21) + v(22)) },
  4: { usa: [3, 4, 8, 9, 27], calc: v => div(v(27), v(3) + v(8) + v(4) + v(9)), pct: true },
  5: { usa: [26, 27], calc: v => div(v(26), v(27)) },
  6: { usa: [27, 30], calc: v => div(v(30), v(27)), pct: true },
  7: { usa: [29, 30], calc: v => div(v(29), v(30)) },
  8: { usa: [3, 5, 8, 10], calc: v => div(v(5) + v(10), v(3) + v(8)), pct: true },
  9: { usa: [21, 23], calc: v => div(v(23), v(21)), pct: true },
  10: { usa: [144, 145, 146, 147], calc: v => div(v(145) + v(147) - v(144) - v(146), v(144) + v(146)), pct: true },
  11: { usa: [140, 142], calc: v => div(v(142), v(140)), pct: true },
  12: { usa: [37, 38], calc: v => div(v(38), v(37)), pct: true },
  13: { usa: [37, 142], calc: (v, ex) => div(v(37), v(142) * diasUteisDoExercicio(ex)) },
  14: { usa: [33, 34], calc: v => div(v(33), v(34)), pct: true },
  15: { usa: [51, 52], calc: v => div(v(52), v(51)), pct: true },
  16: { usa: [150, 153, 155, 156, 157, 158, 159, 160, 161], calc: v => div(v(153) + v(155) + v(156) + v(157) + v(158) + v(159) + v(160) + v(161), v(150)), pct: true },
  17: { usa: [56, 57, 58], calc: v => div(v(58), v(57) + v(56)), pct: true },
  18: { usa: [53, 74, 75], calc: v => div(v(75), v(53) + v(74)), pct: true },
  19: { usa: [54, 83, 84], calc: v => div(v(84), v(54) + v(83)), pct: true },
  20: { usa: [94, 95, 96], calc: v => div(v(96), v(95) + v(94)), pct: true },
  21: { usa: [112, 113, 114], calc: v => div(v(114), v(113) + v(112)), pct: true },
  22: { usa: [122, 123, 124], calc: v => div(v(124), v(123) + v(122)), pct: true },
  26: { usa: [60, 61], calc: v => div(v(61), v(60)), pct: true },
  27: { usa: [76, 77], calc: v => div(v(77), v(76)), pct: true },
  28: { usa: [85, 86], calc: v => div(v(86), v(85)), pct: true },
  29: { usa: [98, 99], calc: v => div(v(99), v(98)), pct: true },
  30: { usa: [115, 116], calc: v => div(v(116), v(115)), pct: true },
  31: { usa: [125, 126], calc: v => div(v(126), v(125)), pct: true },
  35: { usa: [148, 149], calc: v => div(v(149) - v(148), v(148)), pct: true },
};
export const metricasDoIndicador = (codigo: number) => FORMULAS[codigo]?.usa ?? [];
export const emPorcentagem = (codigo: number) => Boolean(FORMULAS[codigo]?.pct) || DA_TERCEIRA_INSTANCIA.includes(codigo);
/** Os 29 indicadores que o Crea-SP calcula com as suas métricas (os seis da 3ª instância são do Confea). */
export const indicadoresDoCrea = Object.keys(FORMULAS).map(Number);
/** Dias úteis do exercício até o fim (ou até a data, no exercício em curso), sem fins de semana e feriados nacionais. */
export const diasUteisDoExercicio = (ex: Exercicio) => diasUteis(`${ex.ano - 1}-12-31`, ex.fim);
export function calcularIndicadores(valores: Valores, ex: Exercicio): Map<number, ValorIndicador> {
  const out = new Map<number, ValorIndicador>();
  for (const ind of indicadoresConfea) {
    if (DA_TERCEIRA_INSTANCIA.includes(ind.codigo)) { out.set(ind.codigo, { codigo: ind.codigo, valor: null, falta: [], terceira: true }); continue; }
    const f = FORMULAS[ind.codigo], falta = f.usa.filter(c => valores.get(c) === null || valores.get(c) === undefined);
    const bruto = falta.length ? null : f.calc(c => valores.get(c)!, ex);
    out.set(ind.codigo, { codigo: ind.codigo, valor: bruto === null ? null : f.pct ? bruto * 100 : bruto, falta, terceira: false });
  }
  return out;
}

/* ---------- Conferências antes do envio ---------- */
/** As 17 fórmulas de verificação da planilha: o total menos a soma das partes tem de dar zero. */
export const SOMAS: [number, number[]][] = [
  [38, range(39, 50)], [60, [61, 66]], [61, range(62, 65)], [66, range(67, 72)], [76, [77, 78]], [78, range(79, 81)], [85, [86, 89]], [86, [87, 88]], [89, range(90, 92)],
  [98, [99, 104]], [99, range(100, 103)], [104, range(105, 110)], [115, [116, 117]], [117, range(118, 120)], [125, [126, 129]], [126, [127, 128]], [129, range(130, 132)],
];
/** Coerências que a planilha não escreve, mas que o Confea usa para descartar um número: parte maior que o todo, por exemplo. */
const COERENCIAS: { texto: string; usa: number[]; ok: (v: (c: number) => number) => boolean }[] = [
  // Quem tem título em mais de uma modalidade conta em cada uma (orientação da planilha): a soma pode passar dos ativos, nunca ficar abaixo.
  { texto: 'Profissionais por modalidade (11 a 18) somam ao menos os ativos de nível superior e médio (3 + 8)', usa: [3, 8, ...range(11, 18)], ok: v => range(11, 18).reduce((s, c) => s + v(c), 0) >= v(3) + v(8) },
  { texto: 'Quem registrou ART (27) não passa dos ativos com registro ou visto (3 + 4 + 8 + 9)', usa: [3, 4, 8, 9, 27], ok: v => v(27) <= v(3) + v(4) + v(8) + v(9) },
  { texto: 'Municípios fiscalizados (33) não passam dos municípios do estado (34)', usa: [33, 34], ok: v => v(33) <= v(34) },
  { texto: 'Denúncias apuradas (52) não passam das recebidas (51)', usa: [51, 52], ok: v => v(52) <= v(51) },
  { texto: 'Julgados na 1ª instância (58) não passam dos recebidos com os pendentes (56 + 57)', usa: [56, 57, 58], ok: v => v(58) <= v(56) + v(57) },
  { texto: 'Julgados na 2ª instância (96) não passam dos recebidos com os pendentes (94 + 95)', usa: [94, 95, 96], ok: v => v(96) <= v(94) + v(95) },
  { texto: 'Agentes fiscais (142) não passam dos lotados na fiscalização (143), nem estes do total de empregados (140)', usa: [140, 142, 143], ok: v => v(142) <= v(143) && v(143) <= v(140) },
  { texto: 'Salário dos agentes fiscais (154) cabe no salário dos lotados na fiscalização (155)', usa: [154, 155], ok: v => v(154) <= v(155) },
];
export type SituacaoMetrica = 'Preenchida' | 'Vazia' | 'Não fecha';
export interface Conferencia { tipo: 'soma' | 'coerencia'; texto: string; metricas: number[]; situacao: 'Fecha' | 'Não fecha' | 'Falta métrica'; diferenca: number | null }
/** Fila entre exercícios: os pendentes de anos anteriores (56, 94) são o que ficou do exercício anterior (pendentes + recebidos - julgados). */
const PASSIVO: [number, number, number, string][] = [[56, 57, 58, '1ª instância'], [94, 95, 96, '2ª instância']];
/** As conferências de um exercício. Com o exercício anterior completo, confere também o passivo que passa de um ano para o outro. */
export function conferir(valores: Valores, anterior: Valores | null = null): { conferencias: Conferencia[]; situacao: Map<number, SituacaoMetrica> } {
  const conferencias: Conferencia[] = [], situacao = new Map<number, SituacaoMetrica>(metricas.map(m => [m.codigo, valores.get(m.codigo) === null || valores.get(m.codigo) === undefined ? 'Vazia' : 'Preenchida']));
  const v = (c: number) => valores.get(c) ?? 0, faltam = (usa: number[]) => usa.some(c => valores.get(c) === null || valores.get(c) === undefined);
  for (const [total, partes] of SOMAS) {
    const usa = [total, ...partes], texto = `${total} = ${partes.length > 2 ? `soma de ${partes[0]} a ${partes.at(-1)}` : partes.join(' + ')}`;
    if (faltam(usa)) { conferencias.push({ tipo: 'soma', texto, metricas: usa, situacao: 'Falta métrica', diferenca: null }); continue; }
    const diferenca = v(total) - partes.reduce((s, c) => s + v(c), 0);
    conferencias.push({ tipo: 'soma', texto, metricas: usa, situacao: diferenca === 0 ? 'Fecha' : 'Não fecha', diferenca });
    if (diferenca !== 0) situacao.set(total, 'Não fecha');
  }
  for (const c of COERENCIAS) {
    if (faltam(c.usa)) { conferencias.push({ tipo: 'coerencia', texto: c.texto, metricas: c.usa, situacao: 'Falta métrica', diferenca: null }); continue; }
    const ok = c.ok(v); conferencias.push({ tipo: 'coerencia', texto: c.texto, metricas: c.usa, situacao: ok ? 'Fecha' : 'Não fecha', diferenca: null });
  }
  if (anterior) for (const [p, rc, j, instancia] of PASSIVO) {
    const texto = `Pendentes na ${instancia} (${p}) = o que ficou do exercício anterior (${p} + ${rc} - ${j})`, a = (c: number) => anterior.get(c);
    if (faltam([p]) || [p, rc, j].some(c => a(c) === null || a(c) === undefined)) { conferencias.push({ tipo: 'coerencia', texto, metricas: [p, rc, j], situacao: 'Falta métrica', diferenca: null }); continue; }
    const diferenca = v(p) - (a(p)! + a(rc)! - a(j)!);
    conferencias.push({ tipo: 'coerencia', texto, metricas: [p, rc, j], situacao: diferenca === 0 ? 'Fecha' : 'Não fecha', diferenca });
  }
  return { conferencias, situacao };
}

/* ---------- Calendário de entregas (PL-2260/2023) ---------- */
export interface Entrega { data: string; ritmo: 'Mensal' | 'Trimestral' | 'Anual'; o_que: string; consequencia: string }
const ultimoDia = (ano: number, mes: number) => new Date(Date.UTC(ano, mes, 0)).toISOString().slice(0, 10);
const mais = (data: string, dias: number) => new Date(Date.parse(`${data}T00:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
/** As próximas entregas ao Confea depois da data: os demonstrativos de cada mês até o dia 20, o portal a cada trimestre e o fechamento do ano. */
export function calendarioEntregas(anchor: string, quantas = 8): Entrega[] {
  const out: Entrega[] = [], ano = Number(anchor.slice(0, 4));
  for (let k = 0; k < 14; k++) {
    const d = new Date(Date.UTC(ano, Number(anchor.slice(5, 7)) - 1 + k, 20)).toISOString().slice(0, 10), referencia = new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 2, 1));
    out.push({ data: d, ritmo: 'Mensal', o_que: `Os sete demonstrativos contábeis de ${MESES[referencia.getUTCMonth()]} ${referencia.getUTCFullYear()} e a declaração do portal (Anexo III)`, consequencia: 'Sem os demonstrativos, o Crea-SP fica inadimplente com o Confea (art. 13, § 2º)' });
  }
  for (let a = ano; a <= ano + 1; a++) for (const t of [1, 2, 3, 4]) { const fim = ultimoDia(a, t * 3); out.push({ data: mais(fim, 30), ritmo: 'Trimestral', o_que: `Metas, indicadores e resultados do ${t}º trimestre de ${a} no portal Transparência e Prestação de Contas`, consequencia: 'Prazo do art. 8º; a data da última atualização fica no cabeçalho do portal' }); }
  for (let a = ano; a <= ano + 1; a++) {
    out.push({ data: `${a}-03-01`, ritmo: 'Anual', o_que: `Último dia para pedir prorrogação do processo de contas de ${a - 1}`, consequencia: 'Prorrogação de até 30 dias, só se pedida até aqui' });
    out.push({ data: `${a}-03-31`, ritmo: 'Anual', o_que: `Relatório de Gestão de ${a - 1} e demonstrações contábeis com notas explicativas`, consequencia: 'Base da auditoria do Confea' });
    out.push({ data: `${a}-04-01`, ritmo: 'Anual', o_que: `Processo de prestação de contas de ${a - 1}, com 16 peças; a peça III é esta planilha preenchida`, consequencia: 'Julgado pelo Plenário do Confea: regulares, com ressalva ou irregulares' });
  }
  return out.filter(e => e.data > anchor).sort((a, b) => a.data.localeCompare(b.data)).slice(0, quantas);
}

/* ---------- O quadro do painel ---------- */
/** Medidas que o painel acompanha ao lado da planilha, do GovAdm e do atendimento (fora das 161 métricas): as metas 5.1 a 5.3 do PMF. */
export interface MetasFora { julgados180: number; etica360: number; registro30: number }
export interface QuadroSistema {
  exercicios: Exercicio[]; exercicio: Exercicio; anterior: Exercicio | null; greId: string | null;
  /** Métricas do recorte: as da regional quando há regional e a métrica se divide por regional; senão, as do Conselho inteiro. */
  metricas: Map<number, number | null>; metricasAntes: Map<number, number | null>; estado: Map<number, number | null>;
  /** Verdadeiro quando o número mostrado é do Conselho inteiro, apesar da regional escolhida. */
  doEstado: (codigo: number) => boolean;
  indicadores: Map<number, ValorIndicador>; indicadoresAntes: Map<number, ValorIndicador> | null;
  /** Indicadores do Conselho inteiro em cada exercício (para a tabela por exercício e a série). */
  porExercicio: { exercicio: Exercicio; indicadores: Map<number, ValorIndicador>; metricas: Map<number, number | null> }[];
  regionais: { greId: string; metricas: Map<number, number | null>; indicadores: Map<number, ValorIndicador> }[];
  municipios: Map<string, { acoes: number; autos: number }>;
  conferencias: Conferencia[]; situacao: Map<number, SituacaoMetrica>;
  calendario: Entrega[]; fora: MetasFora;
  /** Verdadeiro quando o número da métrica é o publicado no Sumário de 2025 (Conselho inteiro, exercício de 2025). */
  real: (codigo: number) => boolean;
}
/** Os indicadores que dependem só de métricas regionais seguem a regional; os outros ficam do Conselho inteiro. */
export const indicadorRegional = (codigo: number) => metricasDoIndicador(codigo).length > 0 && metricasDoIndicador(codigo).every(porRegional);

export function quadroSistema(dataset: Dataset, anchor: string, ano: number, greId: string | null): QuadroSistema {
  const exercicios = exerciciosNaData(anchor), exercicio = exercicios.find(e => e.ano === ano) ?? exercicios.find(e => e.ano === exercicioPadrao(anchor))!;
  const anterior = exercicios.find(e => e.ano === exercicio.ano - 1) ?? null;
  const ler = (ex: Exercicio) => { const estado = metricasDoEstado(ex), municipios = acoesPorMunicipio(dataset, ex, estado), regionais = metricasDasRegionais(dataset, ex, estado, municipios);
    // O estado soma as regionais nas métricas que saem dos municípios.
    const estadoFinal = new Map(estado); for (const c of [33, 37, 38, ...range(39, 50)]) estadoFinal.set(c, [...regionais.values()].reduce((s, g) => s + (g.get(c) ?? 0), 0));
    return { estado: estadoFinal, municipios, regionais }; };
  const atual = ler(exercicio), antes = anterior ? ler(anterior) : null;
  const doRecorte = (lido: ReturnType<typeof ler>) => greId ? new Map(metricas.map(m => [m.codigo, porRegional(m.codigo) ? lido.regionais.get(greId)?.get(m.codigo) ?? null : lido.estado.get(m.codigo) ?? null])) : lido.estado;
  const metricasRecorte = doRecorte(atual), metricasAntes = antes ? doRecorte(antes) : new Map<number, number | null>();
  // Os indicadores do recorte: os regionais com a regional; os outros com o Conselho inteiro.
  const indicadores = (valores: Map<number, number | null>, estado: Map<number, number | null>, ex: Exercicio) => {
    const daRegional = calcularIndicadores(valores, ex), doConselho = calcularIndicadores(estado, ex);
    return new Map([...doConselho].map(([c, v]) => [c, greId && indicadorRegional(c) ? daRegional.get(c)! : v]));
  };
  const { conferencias, situacao } = conferir(atual.estado, antes && !anterior!.parcial && !exercicio.parcial ? antes.estado : null);
  const porExercicio = exercicios.map(ex => { const lido = ex.ano === exercicio.ano ? atual : ler(ex); return { exercicio: ex, indicadores: calcularIndicadores(lido.estado, ex), metricas: lido.estado }; });
  const f = (chave: string, base: number) => Math.round(base * ruido(`${chave}|${exercicio.ano}|${greId ?? ''}`, 0.05) * 10) / 10;
  return {
    exercicios, exercicio, anterior, greId, metricas: metricasRecorte, metricasAntes, estado: atual.estado,
    doEstado: codigo => Boolean(greId) && !porRegional(codigo),
    indicadores: indicadores(metricasRecorte, atual.estado, exercicio), indicadoresAntes: antes && anterior ? indicadores(metricasAntes, antes.estado, anterior) : null,
    porExercicio,
    regionais: dataset.gres.map(g => { const v = atual.regionais.get(g.id)!; return { greId: g.id, metricas: v, indicadores: calcularIndicadores(v, exercicio) }; }),
    municipios: atual.municipios, conferencias, situacao, calendario: calendarioEntregas(anchor),
    fora: { julgados180: f('j180', 61), etica360: f('e360', 48), registro30: f('r30', 84) },
    real: codigo => !greId && exercicio.ano === ANO_REAL && !exercicio.parcial && codigo in reais,
  };
}
