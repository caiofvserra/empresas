import type { Coluna, Medida } from './modelo';

/*
 * Peças comuns aos modelos dos painéis no Power BI: tipos de coluna, formatos, a data e o período escolhidos, as medidas mês a
 * mês e os cartões (o número, a comparação com um ano antes e a linha de apoio). Cada painel monta o seu modelo em
 * `src/powerbi/<painel>/modelo.ts` com estas peças, para que a mesma regra se escreva igual em todos (ADR 0001 e 0002).
 */

/* ---------- Colunas ---------- */
export const texto = (nome: string, extra: Partial<Coluna> = {}): Coluna => ({ nome, tipo: 'string', ...extra });
export const inteiro = (nome: string, extra: Partial<Coluna> = {}): Coluna => ({ nome, tipo: 'int64', formato: '0', ...extra });
export const data = (nome: string, extra: Partial<Coluna> = {}): Coluna => ({ nome, tipo: 'dateTime', formato: 'dd/mm/yyyy', ...extra });
export const sinal = (nome: string): Coluna => ({ nome, tipo: 'int64', formato: '0', oculta: true });
export const reais = (nome: string, extra: Partial<Coluna> = {}): Coluna => ({ nome, tipo: 'double', formato: 'R$ #,##0', oculta: true, ...extra });

export const PASTA_PARAMETRO = 'Pasta dos dados';
/** Meses do cenário de demonstração, o limite do período. */
export const MESES_NA_BASE = 36;
export const FORMATO = { inteiro: '#,##0', parte: '0.0%', reais: 'R$ #,##0', variacao: '+0.0%;-0.0%;0.0%', pontos: '+0.0;-0.0;0.0', indice: '0.0', texto: '' } as const;
export const medida = (pasta: string, nome: string, dax: string, formato: string, descricao: string): Medida => ({ nome, dax, formato, pasta, descricao });

/* ---------- Data, período e meses do gráfico ---------- */
export const COM_DATA = 'VAR d = [Data escolhida]';
export const COM_PERIODO = `${COM_DATA}\nVAR inicio = [Início do período]`;
export const filtrosExtras = (filtros: string[]) => filtros.map(filtro => `, ${filtro}`).join('');
/** Primeiro dia do mês que começa um período de `n` meses terminado na data `d`. */
export const inicioDe = (n: string) => `DATE(YEAR(d), MONTH(d) - ${n} + 1, 1)`;
/** Meses do gráfico: 24, ou o período quando passa de 24 (`mesesDaJanela` do painel). */
export const MESES_DO_GRAFICO = 'MAX(24, [Meses do período])';
export const DENTRO_DO_GRAFICO = "KEEPFILTERS('Calendário'[Mês] >= inicio && 'Calendário'[Mês] <= d)";
/**
 * Medida mês a mês para o eixo do calendário: só os meses do gráfico. O filtro entra mês a mês, então o trimestre da tabela de
 * calor soma só os meses do gráfico e os outros ficam em branco.
 */
export const noMes = (expressao: string) =>
  `${COM_DATA}\nVAR mes = MAX('Calendário'[Mês])\nVAR inicio = ${inicioDe(MESES_DO_GRAFICO)}\nVAR meses = CALCULATE(COUNTROWS('Calendário'), ${DENTRO_DO_GRAFICO})\nRETURN IF(meses > 0, CALCULATE(${expressao}, ${DENTRO_DO_GRAFICO}))`;

/** As três medidas de apoio que todo painel usa: a data escolhida, o período e o primeiro dia do período. */
export const medidasDeApoio = (pasta: string): Medida[] => [
  medida(pasta, 'Data escolhida', "IF(ISFILTERED('Datas das fotos'[Data]), MAX('Datas das fotos'[Data]), MAX('Datas de referência'[Data]))", 'dd/mm/yyyy', 'Devolve a data de referência escolhida; sem escolha, a mais recente. As medidas de variação trocam a data pela de um ano antes.'),
  medida(pasta, 'Meses do período', "SELECTEDVALUE('Período'[Meses], 12)", '0', 'Devolve o período escolhido, em meses; sem escolha, 12.'),
  medida(pasta, 'Início do período', `${COM_DATA}\nRETURN ${inicioDe('[Meses do período]')}`, 'dd/mm/yyyy', 'Devolve o primeiro dia do primeiro mês do período: o período termina na data escolhida e começa no primeiro dia do mês, como no painel.'),
];

/* ---------- Cartões ---------- */
/** Como o cartão se compara: estoque e fluxo variam em %, taxa em pontos percentuais (`variacaoAnual` do painel). */
export type Serie = 'estoque' | 'fluxo' | 'taxa';
export const VARIACAO: Record<Serie, { formato: string; unidade: string; calculo: string; descricao: string }> = {
  estoque: { formato: FORMATO.variacao, unidade: '', calculo: 'IF(antes > 0, DIVIDE(agora - antes, antes))', descricao: 'Compara o cartão com o fim do mesmo mês um ano antes.' },
  fluxo: { formato: FORMATO.variacao, unidade: '', calculo: 'IF(antes > 0, DIVIDE(agora - antes, antes))', descricao: 'Compara o cartão com o mesmo número de meses terminados no fim do mesmo mês um ano antes.' },
  taxa: { formato: FORMATO.pontos, unidade: ' p.p.', calculo: 'IF(NOT ISBLANK(agora) && NOT ISBLANK(antes), (agora - antes) * 100)', descricao: 'Mostra, em pontos percentuais, quanto o cartão mudou desde o fim do mesmo mês um ano antes.' },
};
/**
 * A comparação embaixo do número, como no painel: contra um ano antes (a regra geral), contra a meta (parte registrada e RT) ou
 * nos meses do gráfico (emprego). `medida` aponta para a medida numérica; `frase` completa o número formatado.
 */
export type Comparacao = { serie: Serie; medida?: string; frase?: string };
export interface Cartao { nome: string; pasta: string; comparacao?: Comparacao; detalhe?: string }
/** Nome da medida de variação de um cartão contra um ano antes. */
export const variacaoDe = (nome: string) => `Variação em um ano: ${nome}`;
/** Nomes das medidas de texto que o cartão mostra embaixo do número. */
export const comparacaoDe = (nome: string) => `Comparação: ${nome}`;
export const detalheDe = (nome: string) => `Detalhe: ${nome}`;
export const n = (expressao: string) => `FORMAT(${expressao}, "#,##0")`;
export const parte = (expressao: string) => `FORMAT(${expressao}, "0.0%")`;
export const cartao = (pasta: string) => (nome: string, comparacao?: Comparacao, detalhe?: string): Cartao => ({ nome, pasta, comparacao, detalhe });

/**
 * A mesma medida lida com a data trocada pelo fim do mesmo mês um ano antes (a tabela oculta Datas das fotos tem essas datas).
 * No fluxo, o período continua com o mesmo número de meses. A data entra numa variável antes do CALCULATE, que muda o contexto.
 */
const variacaoEmUmAno = (nome: string, serie: Serie) =>
  ['VAR alvo = EOMONTH([Data escolhida], -12)', `VAR agora = [${nome}]`, `VAR antes = CALCULATE([${nome}], 'Datas das fotos'[Data] = alvo)`, `RETURN ${VARIACAO[serie].calculo}`].join('\n');
/** A frase da comparação: o número com sinal e o que ele compara ("em relação a um ano antes", à meta ou nos meses do gráfico). */
function fraseDaComparacao({ nome }: Cartao, { serie, medida: outra, frase }: Comparacao) {
  const { formato, unidade } = VARIACAO[serie];
  return `VAR v = [${outra ?? variacaoDe(nome)}]\nRETURN IF(ISBLANK(v), "sem comparação", FORMAT(v, "${formato}") & ${frase ?? `"${unidade} em relação a um ano antes"`})`;
}
/** As medidas de variação, comparação e detalhe de todos os cartões de um painel. */
export function medidasDosCartoes(cartoes: Record<string, Cartao[]>): Medida[] {
  return Object.values(cartoes).flat().flatMap((c: Cartao) => [
    ...(c.comparacao && !c.comparacao.medida ? [medida(c.pasta, variacaoDe(c.nome), variacaoEmUmAno(c.nome, c.comparacao.serie), VARIACAO[c.comparacao.serie].formato, VARIACAO[c.comparacao.serie].descricao)] : []),
    ...(c.comparacao ? [medida(c.pasta, comparacaoDe(c.nome), fraseDaComparacao(c, c.comparacao), FORMATO.texto, 'Escreve a comparação que o cartão mostra embaixo do número.')] : []),
    ...(c.detalhe ? [medida(c.pasta, detalheDe(c.nome), c.detalhe, FORMATO.texto, 'Escreve a linha de apoio que o cartão mostra embaixo da comparação, como no painel.')] : []),
  ]);
}
