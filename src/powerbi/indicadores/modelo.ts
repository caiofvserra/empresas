import type { Medida, Modelo, Tabela } from '../modelo';
import { FORMATO, PASTA_PARAMETRO, cartao, inteiro, medida, medidasDosCartoes, sinal, texto } from '../comum';
import type { Cartao } from '../comum';
import { emPorcentagem, indicadorPorCodigo, indicadoresDoCrea, metasPmf, nomeCurtoIndicador, referencias2021 } from '../../domain/sistema-confea';

/*
 * Modelo do painel de Indicadores do Sistema no Power BI (10/11/2026). As métricas e os indicadores ficam em tabelas longas, por
 * exercício, nível (Conselho ou Regional) e regional; as medidas leem o exercício escolhido e, com uma regional escolhida, a linha
 * da regional quando a métrica ou o indicador se divide por regional; senão, a do Conselho inteiro, como o painel em HTML.
 *
 * O exercício: a segmentação usa a tabela Exercícios; os gráficos e tabelas "em cada exercício" usam a tabela Exercícios da série,
 * solta das outras, para a escolha do alto não apagar os outros anos. Sem escolha, vale o último exercício completo.
 */
const PASTA = { apoio: 'Apoio', registro: 'Registro', fiscalizacao: 'Fiscalização', julgamento: 'Julgamento', suporte: 'Suporte e Liderança', entrega: 'Entrega ao Confea', indicadores: 'Indicadores' } as const;
const dec = (nome: string, extra: { formato?: string; oculta?: boolean } = {}) => ({ nome, tipo: 'double' as const, formato: extra.formato ?? '#,##0.##', oculta: extra.oculta });

const tabelas: Tabela[] = [
  { nome: 'Regionais', arquivo: 'regionais.csv', descricao: 'Tem uma linha para cada uma das 16 gerências regionais. Não se liga às métricas: as medidas leem a regional escolhida.',
    colunas: [texto('GRE', { ordenarPor: 'Ordem' }), inteiro('Ordem', { oculta: true })] },
  { nome: 'Municípios', arquivo: 'municipios.csv', descricao: 'Tem os 645 municípios de SP e a GRE de cada um pela tabela oficial, para o mapa das ações de fiscalização.',
    colunas: [texto('Código IBGE'), texto('Município'), texto('GRE')] },
  { nome: 'Exercícios', arquivo: 'exercicios.csv', descricao: 'Tem os exercícios desde 2022; o do ano da data vai até ela (asterisco no rótulo). É a tabela da segmentação "Exercício". Traz também as metas 5.1 a 5.3 do PMF, que vêm de fora da planilha (GovAdm e atendimento), do Conselho inteiro, em %.',
    colunas: [inteiro('Ano', { oculta: true }), texto('Rótulo', { ordenarPor: 'Ano' }), sinal('Parcial'), sinal('Padrão'),
      dec('Infrações julgadas em 180 dias', { oculta: true }), dec('Éticos julgados em 360 dias', { oculta: true }), dec('Registro em 30 dias', { oculta: true })] },
  { nome: 'Exercícios da série', arquivo: 'exercicios-da-serie.csv', descricao: 'Os mesmos exercícios, para o eixo dos gráficos e as colunas das tabelas "em cada exercício". Não se liga às outras tabelas.',
    colunas: [inteiro('Ano', { oculta: true }), texto('Rótulo', { ordenarPor: 'Ano' })] },
  { nome: 'Métricas', arquivo: 'metricas.csv', descricao: 'Tem as 161 métricas que o Crea-SP manda ao Confea: código, nome da planilha, nome curto (para os gráficos), subprograma, tema, período (somada no exercício ou em 31/12), se divide por regional, a definição e a orientação do Confea.',
    colunas: [inteiro('Código'), texto('Rótulo', { ordenarPor: 'Código' }), texto('Nome'), texto('Nome curto'), texto('Subprograma', { ordenarPor: 'Ordem do subprograma' }), inteiro('Ordem do subprograma', { oculta: true }),
      texto('Tema'), texto('Período'), sinal('Por regional'), texto('Definição'), texto('Orientação')] },
  { nome: 'Indicadores', arquivo: 'indicadores.csv', descricao: 'Tem os 29 indicadores que o Confea calcula com as métricas do Crea-SP (os seis da 3ª instância são do Confea e ficam de fora): nome curto, nome oficial, objetivo, fórmula, unidade e a referência do Sistema e do Sudeste em 2021 (Caderno de Resultados), em %, nas taxas.',
    colunas: [inteiro('Indicador'), texto('Rótulo', { ordenarPor: 'Indicador' }), texto('Nome curto', { ordenarPor: 'Indicador' }), texto('Nome'), texto('Subprograma', { ordenarPor: 'Ordem do subprograma' }), inteiro('Ordem do subprograma', { oculta: true }),
      texto('Objetivo'), texto('Fórmula'), texto('Unidade'), sinal('Por regional'), dec('Sistema em 2021', { oculta: true }), dec('Sudeste em 2021', { oculta: true })] },
  { nome: 'Valores', arquivo: 'valores.csv', oculta: true, descricao: 'Guarda o valor de cada métrica em cada exercício: o do Conselho inteiro (nível Conselho, o que vai para o Confea) e o de cada regional (nível Regional, só nas métricas que se dividem por regional). Valor vazio é métrica sem valor, que não é zero. Real marca o número do Sumário Executivo 2025.',
    colunas: [inteiro('Ano'), texto('Nível'), texto('GRE'), inteiro('Código'), dec('Valor'), sinal('Real')] },
  { nome: 'Valores dos indicadores', arquivo: 'valores-indicadores.csv', oculta: true, descricao: 'Guarda cada indicador já calculado pela fórmula da planilha, em cada exercício, do Conselho inteiro e de cada regional (só nos indicadores cujas métricas se dividem por regional). As taxas em %. Sai é 0 quando falta métrica; Faltam lista quais.',
    colunas: [inteiro('Ano'), texto('Nível'), texto('GRE'), inteiro('Indicador'), dec('Valor'), sinal('Sai'), texto('Faltam')] },
  { nome: 'Situação das métricas', arquivo: 'situacao-metricas.csv', oculta: true, descricao: 'Guarda a situação de cada métrica em cada exercício: preenchida, vazia ou que não fecha com a soma das partes.',
    colunas: [inteiro('Ano'), inteiro('Código'), texto('Situação')] },
  { nome: 'Conferências', arquivo: 'conferencias.csv', descricao: 'Tem as conferências antes do envio em cada exercício: as 17 somas da planilha (o total menos a soma das partes tem de dar zero) e as coerências que o Confea usa para descartar um número.',
    colunas: [inteiro('Ano', { oculta: true }), texto('Tipo'), texto('Conferência', { ordenarPor: 'Ordem' }), texto('Métricas'), texto('Situação'), dec('Diferença', { oculta: true }), inteiro('Ordem', { oculta: true })] },
  { nome: 'Ações nos municípios', arquivo: 'acoes-municipios.csv', oculta: true, descricao: 'Guarda as ações e os autos de fiscalização de cada município em cada exercício. A soma dá as métricas 37 e 38; os municípios com ação dão a 33.',
    colunas: [inteiro('Ano'), texto('Código IBGE'), inteiro('Ações'), inteiro('Autos')] },
  { nome: 'Calendário de entregas', arquivo: 'calendario-entregas.csv', descricao: 'Tem as próximas entregas ao Confea a partir da data do pacote: os demonstrativos mensais, o portal trimestral e o processo de contas anual (PL-2260/2023).',
    colunas: [{ nome: 'Data', tipo: 'dateTime', formato: 'dd/mm/yyyy' }, texto('Ritmo'), texto('Entrega'), texto('Consequência')] },
];

/* ---------- A leitura do exercício e da regional ---------- */
const ANO = 'VAR ano = [Exercício escolhido]';
/**
 * Soma uma tabela longa (Valores ou Valores dos indicadores) no exercício `ano`: a linha da regional escolhida, quando existe;
 * senão, a do Conselho inteiro (a métrica ou o indicador que não se divide por regional fica do Conselho, como no HTML).
 */
const lerLonga = (tabela: string, filtros: string[], ano = 'ano') => {
  const f = filtros.map(x => `${x}, `).join('');
  return `VAR gre = SELECTEDVALUE('Regionais'[GRE])
VAR regional = IF(NOT ISBLANK(gre), CALCULATE(SUM('${tabela}'[Valor]), ${f}'${tabela}'[Ano] = ${ano}, '${tabela}'[Nível] = "Regional", '${tabela}'[GRE] = gre))
VAR conselho = CALCULATE(SUM('${tabela}'[Valor]), ${f}'${tabela}'[Ano] = ${ano}, '${tabela}'[Nível] = "Conselho")
RETURN IF(NOT ISBLANK(regional), regional, conselho)`;
};
const daMetrica = (codigo: number, ano = 'ano') => lerLonga('Valores', [`'Valores'[Código] = ${codigo}`], ano);
/** Um indicador no exercício: as taxas saem do CSV em % e a medida divide por 100, para o formato 0,0%. */
const doIndicador = (codigo: number, ano = 'ano') => {
  const leitura = lerLonga('Valores dos indicadores', [`'Valores dos indicadores'[Indicador] = ${codigo}`], ano);
  return emPorcentagem(codigo) ? leitura.replace(/RETURN (.*)$/, 'RETURN DIVIDE($1, 100)') : leitura;
};
const formatoDe = (codigo: number) => emPorcentagem(codigo) ? FORMATO.parte : '0.00';
/** Nome da medida de cada indicador: o nome curto do painel ("Índice de autuação"). */
export const medidaDoIndicador = (codigo: number) => nomeCurtoIndicador[codigo];
/** A medida de uma métrica: o nome curto que o painel usa nos blocos. */
const METRICAS_COM_MEDIDA: [number, string, string][] = [
  [3, 'Profissionais de nível superior ativos', PASTA.registro], [8, 'Técnicos de Segurança do Trabalho ativos', PASTA.registro], [21, 'Empresas ativas', PASTA.registro], [25, 'ARTs registradas', PASTA.registro],
  [37, 'Ações de fiscalização', PASTA.fiscalizacao], [38, 'Autos de infração', PASTA.fiscalizacao], [142, 'Agentes fiscais', PASTA.suporte], [149, 'Multas não pagas', PASTA.suporte], [150, 'Despesa corrente empenhada', PASTA.suporte],
  [56, 'Pendentes de anos anteriores na 1ª instância', PASTA.julgamento], [57, 'Recebidos na 1ª instância', PASTA.julgamento], [58, 'Julgados na 1ª instância', PASTA.julgamento],
  [94, 'Pendentes de anos anteriores na 2ª instância', PASTA.julgamento], [95, 'Recebidos na 2ª instância', PASTA.julgamento], [96, 'Julgados na 2ª instância', PASTA.julgamento],
];
/** Os subprogramas de cada página, para a lista de métricas e a tabela dos indicadores em cada exercício. */
export const SUBPROGRAMAS_DA_PAGINA = { registro: ['Registro'], fiscalizacao: ['Fiscalização'], julgamento: ['Julgamento'], suporte: ['Suporte', 'Liderança'] } as const;
export const metricaDaPagina = (pagina: keyof typeof SUBPROGRAMAS_DA_PAGINA) => `Métrica: ${PASTA[pagina]}`;
export const anteriorDaPagina = (pagina: keyof typeof SUBPROGRAMAS_DA_PAGINA) => `No exercício anterior: ${PASTA[pagina]}`;
export const indicadorDaPagina = (pagina: keyof typeof SUBPROGRAMAS_DA_PAGINA) => `Indicador: ${PASTA[pagina]}`;
const naLista = (subs: readonly string[]) => `SELECTEDVALUE('Métricas'[Subprograma]) IN {${subs.map(x => `"${x}"`).join(', ')}}`;
/** Soma a métrica do contexto só nos códigos dados (o eixo do gráfico é o nome curto; os motivos repetem o nome nas duas instâncias). */
const nosCodigos = (codigos: number[]) => `CALCULATE([Valor da métrica], KEEPFILTERS('Métricas'[Código] IN {${codigos.join(', ')}}))`;
const faixa = (de: number, ate: number) => Array.from({ length: ate - de + 1 }, (_, i) => de + i);

/* ---------- Cartões ---------- */
const variacaoDoIndicador = (codigo: number) => `Em relação ao exercício anterior: ${medidaDoIndicador(codigo)}`;
const referencia = (codigo: number) => { const ref = referencias2021[codigo]; if (!ref) return null; const f = (v: number) => emPorcentagem(codigo) ? `${v.toFixed(1).replace('.', ',')}%` : v.toFixed(2).replace('.', ',');
  return `Sistema em 2021: ${f(ref.brasil)}${ref.sudeste !== undefined ? `; Sudeste: ${f(ref.sudeste)}` : ''}`; };
/** O cartão de um indicador, como no painel: o valor, a diferença para o exercício anterior e a referência de 2021 (ou as métricas que faltam). */
const cartaoDoIndicador = (pasta: string, codigo: number): Cartao => cartao(pasta)(medidaDoIndicador(codigo),
  { serie: emPorcentagem(codigo) ? 'taxa' : 'estoque', medida: variacaoDoIndicador(codigo), frase: emPorcentagem(codigo) ? '" p.p. em relação ao exercício anterior"' : '" em relação ao exercício anterior"' },
  `${ANO}\nVAR falta = CALCULATE(SELECTEDVALUE('Valores dos indicadores'[Faltam]), 'Valores dos indicadores'[Ano] = ano, 'Valores dos indicadores'[Nível] = "Conselho", 'Valores dos indicadores'[Indicador] = ${codigo})
RETURN IF(falta <> "", "Faltam as métricas " & falta, "${referencia(codigo) ?? indicadorPorCodigo.get(codigo)!.subprograma}")`);
const daMeta = (coluna: string) => `${ANO}\nRETURN IF(ISBLANK(SELECTEDVALUE('Regionais'[GRE])), DIVIDE(CALCULATE(MAX('Exercícios'[${coluna}]), ALL('Exercícios'), 'Exercícios'[Ano] = ano), 100))`;

export const CARTOES: Record<'registro' | 'fiscalizacao' | 'julgamento' | 'suporte' | 'entrega', Cartao[]> = {
  registro: [1, 2, 3, 4, 5, 6, 7].map(c => cartaoDoIndicador(PASTA.registro, c)),
  fiscalizacao: [...[12, 13, 14, 15, 11].map(c => cartaoDoIndicador(PASTA.fiscalizacao, c)),
    cartao(PASTA.fiscalizacao)('Ações contra 2024', undefined, `"meta ${metasPmf.acoes.codigo} do PMF: +${metasPmf.acoes.alvo}% até 2027; só em exercício completo e do Conselho inteiro"`)],
  julgamento: [...[17, 20, 26, 29].map(c => cartaoDoIndicador(PASTA.julgamento, c)),
    cartao(PASTA.julgamento)('Infrações julgadas em até 180 dias', undefined, `"meta ${metasPmf.julgamento.codigo} do PMF: ${metasPmf.julgamento.alvo}%; do Conselho inteiro"`),
    cartao(PASTA.julgamento)('Éticos julgados em até 360 dias', undefined, `"meta ${metasPmf.etica.codigo} do PMF: ${metasPmf.etica.alvo}%; do Conselho inteiro"`)],
  suporte: [16, 8, 9, 10, 35, 11].map(c => cartaoDoIndicador(PASTA.suporte, c)),
  entrega: [
    cartao(PASTA.entrega)('Métricas preenchidas', undefined, `FORMAT([Métricas vazias], "0") & " vazias e " & FORMAT([Métricas que não fecham], "0") & " que não fecham, de 161"`),
    cartao(PASTA.entrega)('Conferências que não fecham', undefined, `"de " & FORMAT([Conferências do exercício], "0") & " conferências"`),
    cartao(PASTA.entrega)('Indicadores que saem', undefined, `"de ${indicadoresDoCrea.length}; os seis da 3ª instância são do Confea"`),
    cartao(PASTA.entrega)('Processo de contas', undefined, '"peça III: esta planilha preenchida"'),
    cartao(PASTA.entrega)('Próxima entrega', undefined, `VAR d = MIN('Calendário de entregas'[Data])\nRETURN CALCULATE(SELECTEDVALUE('Calendário de entregas'[Ritmo]), 'Calendário de entregas'[Data] = d)`),
  ],
};

const medidas: Medida[] = [
  medida(PASTA.apoio, 'Exercício escolhido', `IF(HASONEVALUE('Exercícios da série'[Ano]), VALUES('Exercícios da série'[Ano]),
  IF(HASONEVALUE('Exercícios'[Ano]), VALUES('Exercícios'[Ano]), CALCULATE(MAX('Exercícios'[Ano]), ALL('Exercícios'), 'Exercícios'[Padrão] = 1)))`, '0',
  'Devolve o exercício do eixo (nos gráficos e tabelas em cada exercício), senão o escolhido no alto; sem escolha, o último exercício completo.'),
  medida(PASTA.apoio, 'Valor da métrica', `${ANO}\n${lerLonga('Valores', [])}`, FORMATO.inteiro, 'Soma as métricas do contexto no exercício: a linha da regional escolhida quando a métrica se divide por regional; senão, a do Conselho inteiro. Vazio é métrica sem valor.'),
  medida(PASTA.apoio, 'Valor da métrica no exercício anterior', `${ANO}\n${lerLonga('Valores', [], 'ano - 1')}`, FORMATO.inteiro, 'Soma as mesmas métricas no exercício anterior.'),
  medida(PASTA.apoio, 'Valor do indicador', `${ANO}\nVAR v = ${lerLonga('Valores dos indicadores', []).replace(/\n/g, '\n  ')}\nRETURN IF(ISBLANK(v), BLANK(), IF(SELECTEDVALUE('Indicadores'[Unidade]) = "%", FORMAT(v / 100, "0.0%"), FORMAT(v, "0.00")))`,
    FORMATO.texto, 'Escreve o indicador do contexto no exercício, com o formato da unidade (taxa em %, média com duas casas). Com uma regional, segue a regional quando o indicador se divide por regional.'),

  // Um por indicador, com o formato da unidade, e a diferença para o exercício anterior (em p.p. nas taxas, em % nas médias).
  ...indicadoresDoCrea.flatMap(c => [
    medida(PASTA.indicadores, medidaDoIndicador(c), `${ANO}\n${doIndicador(c)}`, formatoDe(c), `Lê o indicador ${c} da planilha do Confea, já calculado no CSV pela fórmula: ${indicadorPorCodigo.get(c)!.formula}. Com uma regional, segue a regional quando todas as métricas dele se dividem por regional.`),
    medida(PASTA.indicadores, variacaoDoIndicador(c), `${ANO}\nVAR agora = [${medidaDoIndicador(c)}]\nVAR antes = ${doIndicador(c, 'ano - 1').replace(/\n/g, '\n  ')}\nRETURN IF(NOT ISBLANK(agora) && NOT ISBLANK(antes), ${emPorcentagem(c) ? '(agora - antes) * 100' : 'DIVIDE(agora - antes, antes)'})`,
      emPorcentagem(c) ? FORMATO.pontos : FORMATO.variacao, emPorcentagem(c) ? 'Mostra, em pontos percentuais, a diferença para o exercício anterior.' : 'Mostra a variação, em %, sobre o exercício anterior.'),
  ]),
  ...METRICAS_COM_MEDIDA.map(([c, nome, pasta]) => medida(pasta, nome, `${ANO}\n${daMetrica(c)}`, c >= 150 ? FORMATO.reais : FORMATO.inteiro, `Lê a métrica ${c} da planilha no exercício escolhido.`)),

  // Listas e tabelas de cada página.
  ...(Object.keys(SUBPROGRAMAS_DA_PAGINA) as (keyof typeof SUBPROGRAMAS_DA_PAGINA)[]).flatMap(p => [
    medida(PASTA[p], metricaDaPagina(p), `IF(${naLista(SUBPROGRAMAS_DA_PAGINA[p])}, [Valor da métrica])`, FORMATO.inteiro, `Lê a métrica da linha no exercício escolhido, só nas do subprograma (${SUBPROGRAMAS_DA_PAGINA[p].join(' e ')}).`),
    medida(PASTA[p], anteriorDaPagina(p), `IF(${naLista(SUBPROGRAMAS_DA_PAGINA[p])}, [Valor da métrica no exercício anterior])`, FORMATO.inteiro, 'Lê a mesma métrica no exercício anterior.'),
    medida(PASTA[p], indicadorDaPagina(p), `IF(SELECTEDVALUE('Indicadores'[Subprograma]) IN {${SUBPROGRAMAS_DA_PAGINA[p].map(x => `"${x}"`).join(', ')}}, [Valor do indicador])`, FORMATO.texto, 'Escreve o indicador da linha, só nos do subprograma.'),
  ]),
  medida(PASTA.registro, 'Profissionais ativos', '[Profissionais de nível superior ativos] + [Técnicos de Segurança do Trabalho ativos]', FORMATO.inteiro, 'Soma os profissionais de nível superior (métrica 3) e os técnicos de nível médio (métrica 8), que no Crea são só os de Segurança do Trabalho.'),
  medida(PASTA.registro, 'Profissionais na modalidade', nosCodigos(faixa(11, 18)), FORMATO.inteiro, 'Soma as métricas 11 a 18: profissionais ativos em cada modalidade (os técnicos de Segurança do Trabalho na Especial).'),
  medida(PASTA.fiscalizacao, 'Autos na capitulação', nosCodigos(faixa(39, 50)), FORMATO.inteiro, 'Soma as métricas 39 a 50: os autos de infração do exercício por capitulação.'),
  medida(PASTA.fiscalizacao, 'Ações no município', `${ANO}\nRETURN CALCULATE(SUM('Ações nos municípios'[Ações]), 'Ações nos municípios'[Ano] = ano)`, FORMATO.inteiro, 'Soma as ações de fiscalização de cada município no exercício, para o mapa (a soma dá a métrica 37).'),
  medida(PASTA.fiscalizacao, 'Ações contra 2024', `${ANO}
VAR parcial = CALCULATE(MAX('Exercícios'[Parcial]), ALL('Exercícios'), 'Exercícios'[Ano] = ano)
VAR agora = CALCULATE(SUM('Valores'[Valor]), 'Valores'[Código] = 37, 'Valores'[Ano] = ano, 'Valores'[Nível] = "Conselho")
VAR base = CALCULATE(SUM('Valores'[Valor]), 'Valores'[Código] = 37, 'Valores'[Ano] = ${metasPmf.acoes.base}, 'Valores'[Nível] = "Conselho")
RETURN IF(ISBLANK(SELECTEDVALUE('Regionais'[GRE])) && parcial = 0 && ano > ${metasPmf.acoes.base} && base > 0, DIVIDE(agora, base) - 1)`, FORMATO.variacao,
    `Divide as ações do exercício (métrica 37) pelas de ${metasPmf.acoes.base}, menos 1 (meta ${metasPmf.acoes.codigo} do PMF). Só em exercício completo depois de ${metasPmf.acoes.base} e do Conselho inteiro.`),
  medida(PASTA.julgamento, 'Infrações julgadas em até 180 dias', daMeta('Infrações julgadas em 180 dias'), FORMATO.parte, `Lê a parte dos processos de infração julgados em até 180 dias (meta ${metasPmf.julgamento.codigo} do PMF; GovAdm, fora da planilha). Do Conselho inteiro.`),
  medida(PASTA.julgamento, 'Éticos julgados em até 360 dias', daMeta('Éticos julgados em 360 dias'), FORMATO.parte, `Lê a parte dos processos éticos julgados em até 360 dias (meta ${metasPmf.etica.codigo} do PMF; GovAdm, fora da planilha). Do Conselho inteiro.`),
  medida(PASTA.julgamento, 'Ficam para o próximo na 1ª instância', 'MAX(0, [Pendentes de anos anteriores na 1ª instância] + [Recebidos na 1ª instância] - [Julgados na 1ª instância])', FORMATO.inteiro, 'Soma pendentes e recebidos e tira os julgados na 1ª instância (métricas 56, 57 e 58).'),
  medida(PASTA.julgamento, 'Ficam para o próximo na 2ª instância', 'MAX(0, [Pendentes de anos anteriores na 2ª instância] + [Recebidos na 2ª instância] - [Julgados na 2ª instância])', FORMATO.inteiro, 'Soma pendentes e recebidos e tira os julgados na 2ª instância (métricas 94, 95 e 96).'),
  medida(PASTA.julgamento, 'Sem êxito na 1ª instância', nosCodigos(faixa(67, 72)), FORMATO.inteiro, 'Soma as métricas 67 a 72: decisões da 1ª instância arquivadas sem êxito, por motivo.'),
  medida(PASTA.julgamento, 'Sem êxito na 2ª instância', nosCodigos(faixa(105, 110)), FORMATO.inteiro, 'Soma as métricas 105 a 110: decisões da 2ª instância arquivadas sem êxito, por motivo.'),
  medida(PASTA.suporte, 'Despesa na conta', nosCodigos([153, 155, 156, 157, 158, 159, 160, 161]), FORMATO.reais, 'Soma as contas da despesa com fiscalização (indicador 16). Conta vazia fica em branco: sem ela, o indicador 16 não sai.'),
  medida(PASTA.suporte, 'Anuidades não pagas', `${ANO}\nVAR p = ${daMetrica(145).replace(/\n/g, '\n  ')}\nVAR e = ${daMetrica(147).replace(/\n/g, '\n  ')}\nRETURN p + e`, FORMATO.inteiro, 'Soma as métricas 145 e 147: anuidades de profissionais e de empresas não pagas em 31/12.'),

  // Entrega ao Confea: sempre do Conselho inteiro.
  ...(['Preenchida', 'Vazia', 'Não fecha'] as const).map(st => medida(PASTA.entrega, { Preenchida: 'Métricas preenchidas', Vazia: 'Métricas vazias', 'Não fecha': 'Métricas que não fecham' }[st],
    `${ANO}\nRETURN CALCULATE(COUNTROWS('Situação das métricas'), 'Situação das métricas'[Ano] = ano, 'Situação das métricas'[Situação] = "${st}") + 0`, '0', `Conta as métricas do exercício na situação "${st}", do Conselho inteiro.`)),
  medida(PASTA.entrega, 'Situação da métrica', `${ANO}\nVAR st = CALCULATE(SELECTEDVALUE('Situação das métricas'[Situação]), 'Situação das métricas'[Ano] = ano)\nRETURN IF(st <> "Preenchida", st)`, FORMATO.texto, 'Escreve "Vazia" ou "Não fecha" na métrica da linha; a preenchida fica em branco e sai da tabela.'),
  medida(PASTA.entrega, 'Conferências do exercício', `${ANO}\nRETURN CALCULATE(COUNTROWS('Conferências'), 'Conferências'[Ano] = ano)`, '0', 'Conta as conferências do exercício.'),
  medida(PASTA.entrega, 'Conferências que não fecham', `${ANO}\nRETURN CALCULATE(COUNTROWS('Conferências'), 'Conferências'[Ano] = ano, 'Conferências'[Situação] = "Não fecha") + 0`, '0', 'Conta as conferências do exercício em que o total não bate com a soma das partes.'),
  medida(PASTA.entrega, 'Situação da conferência', `${ANO}\nRETURN CALCULATE(SELECTEDVALUE('Conferências'[Situação]), 'Conferências'[Ano] = ano)`, FORMATO.texto, 'Escreve a situação da conferência da linha no exercício: fecha, não fecha ou falta métrica.'),
  medida(PASTA.entrega, 'Diferença da conferência', `${ANO}\nRETURN CALCULATE(SUM('Conferências'[Diferença]), 'Conferências'[Ano] = ano)`, '+#,##0;-#,##0;0', 'Mostra o total menos a soma das partes, na conferência da linha; zero quando fecha.'),
  medida(PASTA.entrega, 'Indicadores que saem', `${ANO}\nRETURN CALCULATE(COUNTROWS('Valores dos indicadores'), 'Valores dos indicadores'[Ano] = ano, 'Valores dos indicadores'[Nível] = "Conselho", 'Valores dos indicadores'[Sai] = 1) + 0`, '0',
    'Conta os indicadores do Crea-SP que o Confea consegue calcular no exercício (sem métrica vazia), do Conselho inteiro.'),
  medida(PASTA.entrega, 'Processo de contas', `FORMAT(CALCULATE(MIN('Calendário de entregas'[Data]), CONTAINSSTRING('Calendário de entregas'[Entrega], "Processo de prestação de contas")), "dd/mm/yyyy")`, FORMATO.texto,
    'Escreve a data de entrega do próximo processo de prestação de contas ao Confea (1º de abril), que leva esta planilha como peça III.'),
  medida(PASTA.entrega, 'Próxima entrega', `FORMAT(MIN('Calendário de entregas'[Data]), "dd/mm/yyyy")`, FORMATO.texto, 'Escreve a data da próxima entrega ao Confea a partir da data do pacote.'),
];

/** As medidas dos cartões, sem repetir o indicador 11, que aparece em duas páginas. */
const dosCartoes = [...new Map(medidasDosCartoes(CARTOES).map(m => [m.nome, m])).values()];

export const modeloIndicadores: Modelo = {
  nome: 'Indicadores',
  parametros: [{ nome: PASTA_PARAMETRO, valor: 'C:\\CREA-SP\\powerbi\\indicadores\\dados\\', descricao: 'Pasta onde estão os CSV do pacote (termina com \\). Troque em Transformar dados > Editar parâmetros e clique em Atualizar.' }],
  tabelas: [...tabelas, { nome: 'Medidas', descricao: 'Guarda as medidas do painel, em pastas por página.', colunas: [{ nome: 'Medidas', tipo: 'string', oculta: true }], medidas: [...medidas, ...dosCartoes] }],
  relacoes: [
    { de: ['Municípios', 'GRE'], para: ['Regionais', 'GRE'] },
    { de: ['Ações nos municípios', 'Código IBGE'], para: ['Municípios', 'Código IBGE'] },
    { de: ['Valores', 'Código'], para: ['Métricas', 'Código'] },
    { de: ['Situação das métricas', 'Código'], para: ['Métricas', 'Código'] },
    { de: ['Valores dos indicadores', 'Indicador'], para: ['Indicadores', 'Indicador'] },
  ],
};
