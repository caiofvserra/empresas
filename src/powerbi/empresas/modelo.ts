import type { Coluna, Medida, Modelo, Tabela } from '../modelo';
import { COM_DATA, COM_PERIODO, FORMATO, MESES_DO_GRAFICO, MESES_NA_BASE, PASTA_PARAMETRO, cartao, data, filtrosExtras, inicioDe, inteiro, medida, medidasDeApoio, medidasDosCartoes, n, noMes, parte, sinal, texto, variacaoDe } from '../comum';
import type { Cartao } from '../comum';
import { BLOCOS_PARCERIA, COLUNAS_FOTO_EMPRESAS, COORTES, comMarca, fichaDoAcordo, medidaDoBloco, situacoesNoFunil } from './dados';

/*
 * Modelo do painel de Empresas no Power BI: as tabelas de `dados.ts`, as relações do esquema estrela e as medidas DAX
 * dos cartões e gráficos, em pastas com o nome de cada página. Estoques e taxas leem a foto da data escolhida; fluxos
 * somam os fatos do período (ADR 0002). `tests/powerbi-empresas.test.ts` reproduz estas regras sobre os CSV e confere
 * com os números do protótipo.
 */
const colunaDaFoto = ({ nome, tipo }: typeof COLUNAS_FOTO_EMPRESAS[number]): Coluna =>
  tipo === 'sinal' ? sinal(nome) : tipo === 'inteiro' ? inteiro(nome, { oculta: true }) : texto(nome, nome === 'Tempo de registro' ? { ordenarPor: 'Ordem do tempo de registro' } : {});

export { PASTA_PARAMETRO };
const ACORDO_DO_CREDITO = fichaDoAcordo(['bcb']);

const tabelas: Tabela[] = [
  { nome: 'Regionais', arquivo: 'regionais.csv', descricao: 'Tem uma linha para cada uma das 16 gerências regionais do Crea-SP.', colunas: [texto('GRE', { ordenarPor: 'Ordem' }), inteiro('Ordem', { oculta: true })] },
  { nome: 'Municípios', arquivo: 'municipios.csv', descricao: 'Tem os 645 municípios de SP e a GRE de cada um, pela tabela oficial.', colunas: [texto('Código IBGE'), texto('Município'), texto('GRE')] },
  { nome: 'Empresas', arquivo: 'empresas.csv', descricao: 'Tem uma linha por empresa (raiz do CNPJ). A câmara vem da atividade principal da matriz; o município, o porte e a situação na Receita também vêm da matriz.',
    colunas: [texto('Empresa'), texto('Raiz do CNPJ'), texto('Razão social'), texto('Porte'), texto('Câmara'), texto('Situação na Receita'), texto('Código IBGE', { oculta: true }), sinal('Só visto (sede fora de SP)'),
      data('Primeiro registro', { oculta: true }), texto('Capital social', { ordenarPor: 'Ordem do capital social' }), inteiro('Ordem do capital social', { oculta: true })] },
  { nome: 'Estabelecimentos', arquivo: 'estabelecimentos.csv', descricao: 'Tem uma linha por CNPJ completo. A atividade da lista é a principal, ou a primeira secundária quando a principal não está na lista do Crea-SP.',
    colunas: [texto('Estabelecimento'), texto('Empresa', { oculta: true }), texto('CNPJ'), texto('Matriz ou filial'), texto('Código IBGE', { oculta: true }), texto('Atividade principal'), texto('Atividade da lista'), texto('Câmara da atividade'), texto('Classe'), data('Aberto em'), data('Mês de abertura', { oculta: true }), texto('Situação na Receita')] },
  { nome: 'Modalidades', arquivo: 'modalidades.csv', descricao: 'Liga as ARTs aos profissionais ativos da mesma modalidade.', colunas: [texto('Modalidade', { oculta: true }), texto('Rótulo')] },
  { nome: 'Calendário', arquivo: 'calendario.csv', descricao: 'Tem um mês por linha, para os gráficos mês a mês.', colunas: [data('Mês', { formato: 'mmm/yy' }), texto('Rótulo', { ordenarPor: 'Mês' }), texto('Trimestre'), inteiro('Ano'), inteiro('Ordem', { oculta: true })] },
  { nome: 'Datas de referência', arquivo: 'datas-referencia.csv', descricao: 'Tem os fins de mês em que a base pode ser lida, e hoje. Não se liga às outras tabelas: a escolha vale para todas as medidas.', colunas: [data('Data'), texto('Rótulo', { ordenarPor: 'Data' })] },
  { nome: 'Datas das fotos', arquivo: 'datas-das-fotos.csv', oculta: true, descricao: 'Tem todas as datas com foto, inclusive os 12 meses antes da primeira data de referência. As medidas de variação a usam para ler o mesmo indicador um ano antes.', colunas: [data('Data')] },
  { nome: 'Período', calculada: `GENERATESERIES(1, ${MESES_NA_BASE}, 1)`, descricao: 'Guarda o número de meses somados nos fluxos, contados para trás a partir da data de referência. No Power BI Desktop, é um parâmetro do tipo "Intervalo numérico", de 1 a 36 meses.', colunas: [inteiro('Meses', { origem: '[Value]', parametro: true })] },
  { nome: 'Foto das empresas', arquivo: 'foto-empresas.csv', oculta: true, descricao: 'Guarda a situação de cada empresa no último dia de cada mês, calculada pelas regras do painel. Tem uma linha por empresa registrada naquele dia, registrada nos meses das coortes ou com estabelecimento no mercado.',
    colunas: [data('Data'), data('Mês'), texto('Empresa'), ...COLUNAS_FOTO_EMPRESAS.map(colunaDaFoto)] },
  { nome: 'Foto dos estabelecimentos', arquivo: 'foto-estabelecimentos.csv', oculta: true, descricao: 'Guarda os estabelecimentos com atividade da lista abertos até o último dia de cada mês: se estão no mercado (ativos na Receita) e a situação no cadastro naquele dia.',
    colunas: [data('Data'), texto('Estabelecimento'), sinal('No mercado'), texto('Situação no cadastro'), sinal('Registro ativo')] },
  { nome: 'Pendências do cadastro', arquivo: 'pendencias.csv', oculta: true, descricao: 'Guarda as pendências abertas no cadastro de cada empresa registrada, no último dia de cada mês.', colunas: [data('Data'), texto('Empresa'), texto('Pendência')] },
  { nome: 'Profissionais ativos', arquivo: 'profissionais-ativos.csv', oculta: true, descricao: 'Conta os profissionais com registro ativo em cada data de referência, por município e modalidade, como o painel de Profissionais.', colunas: [data('Data'), texto('Código IBGE'), texto('Modalidade'), inteiro('Ativos', { oculta: true })] },
  { nome: 'Entradas e saídas', arquivo: 'entradas-saidas.csv', oculta: true, descricao: 'Guarda as empresas que passaram a ter registro ativo (entrada) ou deixaram de ter (saída), por mês.', colunas: [texto('Empresa'), data('Mês'), texto('Tipo'), sinal('Primeira vez'), sinal('Após fiscalização')] },
  { nome: 'ARTs', arquivo: 'arts.csv', oculta: true, descricao: 'Guarda as ARTs registradas por empresas.', colunas: [texto('ART'), texto('Empresa'), data('Data'), data('Mês'), { nome: 'Valor', tipo: 'double', formato: 'R$ #,##0', oculta: true }, texto('Modalidade')] },
  { nome: 'Emprego formal', arquivo: 'emprego.csv', oculta: true, descricao: 'Conta os empregados com carteira em ocupações de engenharia no fim de cada mês, por regional, pela RAIS (Relação Anual de Informações Sociais) e pelo Novo CAGED (Cadastro Geral de Empregados e Desempregados).', colunas: [data('Mês'), texto('GRE'), inteiro('Empregados', { oculta: true })] },
  { nome: 'Crédito', arquivo: 'credito.csv', oculta: true, descricao: `Guarda o saldo de crédito a empresas de engenharia no fim de cada mês, por regional. ${ACORDO_DO_CREDITO}`, colunas: [data('Mês'), texto('GRE'), { nome: 'Saldo', tipo: 'double', formato: 'R$ #,##0', oculta: true }] },
  { nome: 'Parcerias', arquivo: 'parcerias.csv', descricao: 'Guarda a demonstração dos blocos que dependem de acordo ("!"), na data de hoje do cenário. Os números não mudam com a data de referência nem com os filtros.',
    colunas: [texto('Bloco'), texto('Grupo'), texto('Série'), { nome: 'Valor', tipo: 'double', formato: '#,##0', oculta: true }, inteiro('Ordem', { oculta: true })] },
];

/* ---------- Pedaços de DAX ---------- */
/** Soma uma coluna da foto das empresas na data escolhida. */
const somaDaFoto = (coluna: string) => `${COM_DATA}\nRETURN CALCULATE(SUM('Foto das empresas'[${coluna}]), 'Foto das empresas'[Data] = d)`;
/** Conta as empresas da foto na data escolhida com os filtros dados. */
const contaNaFoto = (...filtros: string[]) => `${COM_DATA}\nRETURN CALCULATE(COUNTROWS('Foto das empresas'), 'Foto das empresas'[Data] = d${filtrosExtras(filtros)})`;
const naFoto = (coluna: string) => `'Foto das empresas'[${coluna}] = 1`;
const registradasCom = (coluna: string) => contaNaFoto(naFoto('Registrada'), naFoto(coluna));
const contaEstabelecimentos = (...filtros: string[]) => `${COM_DATA}\nRETURN CALCULATE(COUNTROWS('Foto dos estabelecimentos'), 'Foto dos estabelecimentos'[Data] = d${filtrosExtras(filtros)})`;
const NO_MERCADO = "'Foto dos estabelecimentos'[No mercado] = 1", VIGENTE = "'Foto dos estabelecimentos'[Situação no cadastro] = \"Com registro ou visto\"", OBRIGATORIO = "'Estabelecimentos'[Classe] = \"Registro obrigatório\"";
/** O mesmo período um ano antes: início e fim recuados 12 meses (EDATE leva o dia 31 ao último dia do mês, como o painel). */
const UM_ANO_ANTES = 'VAR inicio = EDATE([Início do período], -12)\nVAR fim = EDATE([Data escolhida], -12)';
/** Entradas ou saídas contadas no contexto, com filtros a mais. */
const contaMovimento = (tipo: 'Entrada' | 'Saída', ...filtros: string[]) => `CALCULATE(COUNTROWS('Entradas e saídas'), 'Entradas e saídas'[Tipo] = "${tipo}"${filtrosExtras(filtros)}) + 0`;
const movimentoNoPeriodo = (tipo: 'Entrada' | 'Saída', ...filtros: string[]) => `${COM_PERIODO}\nRETURN ${contaMovimento(tipo, "'Entradas e saídas'[Mês] >= inicio", "'Entradas e saídas'[Mês] <= d", ...filtros)}`;
/** ARTs ou valor em ART entre `inicio` e `fim`. */
const nasArts = (expressao: string, fim: string) => `CALCULATE(${expressao}, 'ARTs'[Data] >= inicio, 'ARTs'[Data] <= ${fim}) + 0`;
/**
 * Primeiro mês do gráfico de economia (`ritmoEconomico`): os meses do gráfico, mas nunca antes do 12º mês da base, porque as
 * séries de 12 meses precisam dos 11 anteriores.
 */
const INICIO_DA_ECONOMIA = `VAR inicio = MAX(${inicioDe(MESES_DO_GRAFICO)}, CALCULATE(MIN('Calendário'[Mês]), REMOVEFILTERS('Calendário'), 'Calendário'[Ordem] = 12))`;
/** Último mês com arquivo da Receita na data escolhida: a abertura mais recente até ela (`ultimoMesReceita`). */
const ULTIMO_MES_DA_RECEITA = "VAR receita = CALCULATE(MAX('Estabelecimentos'[Mês de abertura]), REMOVEFILTERS(), 'Estabelecimentos'[Aberto em] <= d)";

const PASTA = { apoio: 'Apoio', registro: 'Registro e mercado', evolucao: 'Evolução', rtArt: 'RT e ART', vinculos: 'Vínculos' } as const;

/* ---------- Cartões ---------- */
export { comparacaoDe, detalheDe } from '../comum';
const [noRegistro, naEvolucao, noRtArt] = [cartao(PASTA.registro), cartao(PASTA.evolucao), cartao(PASTA.rtArt)];
const META = (medidaDaMeta: string) => `" p.p. em relação à meta de " & FORMAT(${medidaDaMeta}, "0%")`;
/** Os cinco cartões de cada página, com a comparação e a linha de apoio do painel. `paginas.ts` monta os cartões daqui. */
export const CARTOES = {
  registro: [
    noRegistro('Empresas registradas', { serie: 'estoque' }, `${n('[Estabelecimentos registrados]')} & " estabelecimentos, " & ${n('[Vistos de empresas de fora de SP]')} & " vistos de empresas de fora de SP"`),
    noRegistro('Parte do mercado que está registrada', { serie: 'taxa', medida: 'Distância da meta da parte registrada', frase: META('[Meta da parte do mercado registrada]') },
      `"nas atividades de registro obrigatório, " & ${parte('[Parte registrada nas atividades de registro obrigatório]')}`),
    noRegistro('Atividade obrigatória e nenhum registro', { serie: 'estoque' }, '"estabelecimentos que nunca apareceram no cadastro"'),
    noRegistro('Registradas em dia com a anuidade', { serie: 'taxa' }, `${n('[Registradas com anuidade vencida]')} & " empresas registradas com anuidade vencida"`),
    noRegistro('Registradas com cadastro incompleto', undefined, '[Pendência mais comum]'),
  ],
  evolucao: [
    naEvolucao('Empresas que entraram na base', { serie: 'fluxo' }, `${n('[Entraram pela primeira vez]')} & " pela primeira vez, " & ${n('[Retornos]')} & " retornos; " & ${n('[Entradas após fiscalização]')} & " após fiscalização"`),
    naEvolucao('Empresas que saíram da base', { serie: 'fluxo' }, `"saldo de " & FORMAT([Entradas menos saídas no período], "+#,##0;-#,##0;0") & " no período"`),
    naEvolucao('Empresas de engenharia abertas no período', { serie: 'fluxo' }, `${parte('[Parte das abertas que já se registrou]')} & " delas já se registraram"`),
    naEvolucao('Continuam registradas depois de 12 meses', { serie: 'taxa' }, `${n('[Registradas 12 meses antes que continuam]')} & " de " & ${n('[Registradas 12 meses antes]')} & " empresas"`),
    naEvolucao('Emprego formal em engenharia', { serie: 'estoque', medida: 'Variação do emprego nos meses do gráfico', frase: '" em " & [Meses no gráfico da economia] & " meses"' }, '"empregados com carteira no último mês"'),
  ],
  'rt-art': [
    noRtArt('Empresas com responsável técnico', { serie: 'taxa', medida: 'Distância da meta de RT', frase: META('[Meta de RT]') },
      `${n('[Registradas sem RT vigente]')} & " sem RT vigente, de " & ${n('[Empresas registradas]')} & " registradas"`),
    noRtArt('RT que saiu sem substituto', { serie: 'estoque' }, '"empresas sem novo responsável técnico 30 dias depois da saída"'),
    noRtArt('ARTs de empresas', { serie: 'fluxo', medida: variacaoDe('ARTs de empresas') }, `${n('[Registradas com ART no período]')} & " empresas registradas com ART no período"`),
    noRtArt('Valor declarado em ART', { serie: 'fluxo', medida: variacaoDe('Valor declarado em ART') }, '"soma do valor de contrato das ARTs"'),
    noRtArt('Registradas sem nenhuma ART', { serie: 'taxa' }, `${n('[Registradas sem ART no período]')} & " empresas registradas sem ART no período"`),
  ],
} satisfies Record<string, Cartao[]>;

/* ---------- Economia, abertas e registros (índice 100) ---------- */
/** Cada série do gráfico de economia no mês do eixo: o valor do mês e o índice com o primeiro mês do gráfico igual a 100. */
const SERIES_DA_ECONOMIA = [
  { nome: 'Emprego formal no mês', valor: "SUM('Emprego formal'[Empregados])", descricao: 'Soma os empregados com carteira em engenharia no fim de cada mês.', receita: false },
  { nome: comMarca.medida('Crédito a empresas de engenharia no mês'), valor: "SUM('Crédito'[Saldo])", descricao: `Soma o saldo de crédito a empresas de engenharia no fim de cada mês. ${ACORDO_DO_CREDITO}`, receita: false },
  { nome: 'Abertas na Receita em 12 meses', valor: "CALCULATE(COUNTROWS('Estabelecimentos'), REMOVEFILTERS('Calendário'), 'Estabelecimentos'[Classe] <> \"\", 'Estabelecimentos'[Mês de abertura] >= EDATE(m, -11), 'Estabelecimentos'[Mês de abertura] <= m) + 0",
    descricao: 'Conta os estabelecimentos com atividade da lista abertos na Receita nos 12 meses até cada mês. A série termina no último mês com arquivo da Receita.', receita: true },
  { nome: 'Registradas no Crea-SP em 12 meses', valor: "CALCULATE(COUNTROWS('Empresas'), 'Empresas'[Primeiro registro] >= EDATE(m, -11), 'Empresas'[Primeiro registro] <= EOMONTH(m, 0)) + 0",
    descricao: 'Conta as empresas que fizeram o primeiro registro no Crea-SP nos 12 meses até cada mês.', receita: false },
] as const;
/** Nome da medida de índice de uma série; o "!" do acordo vai para o fim. */
export const indiceDe = (nome: string) => `Índice: ${nome.replace(/^! /, '')}${nome.startsWith('!') ? ' !' : ''}`;
function medidasDaEconomia(): Medida[] {
  const noGrafico = (valor: string, receita: boolean) => [COM_DATA, INICIO_DA_ECONOMIA, ULTIMO_MES_DA_RECEITA, "VAR m = MAX('Calendário'[Mês])",
    `RETURN IF(m >= inicio && m <= d${receita ? ' && m <= receita' : ''}, ${valor})`].join('\n');
  return SERIES_DA_ECONOMIA.flatMap(({ nome, valor, descricao, receita }) => [
    medida(PASTA.evolucao, nome, noGrafico(valor, receita), FORMATO.inteiro, descricao),
    medida(PASTA.evolucao, indiceDe(nome), [COM_DATA, INICIO_DA_ECONOMIA, `VAR agora = [${nome}]`, `VAR base = CALCULATE([${nome}], REMOVEFILTERS('Calendário'), 'Calendário'[Mês] = inicio)`,
      'RETURN IF(NOT ISBLANK(agora) && base > 0, ROUND(agora / base * 100, 1))'].join('\n'), FORMATO.indice, `Mostra a série com o primeiro mês do gráfico igual a 100, para comparar o ritmo de séries com unidades diferentes.`),
  ]);
}

/* ---------- Medidas ---------- */
const medidas: Medida[] = [
  // Apoio: data, período e metas.
  ...medidasDeApoio(PASTA.apoio),
  medida(PASTA.apoio, 'Meta da parte do mercado registrada', '0.65', FORMATO.parte, 'A meta padrão da parte do mercado registrada é 65%, a mesma do painel.'),
  medida(PASTA.apoio, 'Meta de RT', '0.95', FORMATO.parte, 'A meta padrão de empresas registradas com responsável técnico é 95%, porque o RT é condição do registro (Lei 5.194/66, art. 8º, parágrafo único).'),

  // Registro e mercado.
  medida(PASTA.registro, 'Empresas registradas', somaDaFoto('Registrada'), FORMATO.inteiro, 'Conta as empresas, pela raiz do CNPJ, com ao menos um registro ou visto ativo na data escolhida.'),
  medida(PASTA.registro, 'Estabelecimentos registrados', somaDaFoto('Estabelecimentos registrados'), FORMATO.inteiro, 'Conta os CNPJs completos com registro ou visto vigente na data escolhida.'),
  medida(PASTA.registro, 'Vistos de empresas de fora de SP', somaDaFoto('Vistos'), FORMATO.inteiro, 'Conta os vistos vigentes de empresas registradas em outro Crea.'),
  medida(PASTA.registro, 'Estabelecimentos no mercado', contaEstabelecimentos(NO_MERCADO), FORMATO.inteiro, 'Conta os estabelecimentos ativos na Receita com atividade da lista do Crea-SP, abertos até a data escolhida.'),
  medida(PASTA.registro, 'Estabelecimentos do mercado com registro', contaEstabelecimentos(NO_MERCADO, VIGENTE), FORMATO.inteiro, 'Conta os estabelecimentos do mercado com registro ou visto vigente na data escolhida.'),
  medida(PASTA.registro, 'Estabelecimentos do mercado só com histórico', contaEstabelecimentos(NO_MERCADO, "'Foto dos estabelecimentos'[Situação no cadastro] = \"Só teve registro no passado\""), FORMATO.inteiro, 'Conta os estabelecimentos do mercado que já tiveram registro, mas não o têm na data escolhida.'),
  medida(PASTA.registro, 'Estabelecimentos do mercado sem registro', contaEstabelecimentos(NO_MERCADO, "'Foto dos estabelecimentos'[Situação no cadastro] = \"Nunca apareceu no cadastro\""), FORMATO.inteiro, 'Conta os estabelecimentos do mercado que nunca apareceram no cadastro até a data escolhida.'),
  medida(PASTA.registro, 'Parte do mercado que está registrada', 'DIVIDE([Estabelecimentos do mercado com registro], [Estabelecimentos no mercado])', FORMATO.parte, 'Mostra a parte dos estabelecimentos do mercado com registro ou visto vigente na data escolhida. Atividade da lista não prova obrigação de registro.'),
  medida(PASTA.registro, 'Distância da meta da parte registrada', '([Parte do mercado que está registrada] - [Meta da parte do mercado registrada]) * 100', FORMATO.pontos, 'Mostra, em pontos percentuais, quanto a parte do mercado registrada está acima ou abaixo da meta.'),
  medida(PASTA.registro, 'Parte registrada nas atividades de registro obrigatório', `DIVIDE(CALCULATE([Estabelecimentos do mercado com registro], ${OBRIGATORIO}), CALCULATE([Estabelecimentos no mercado], ${OBRIGATORIO}))`, FORMATO.parte, 'Mostra a mesma parte, só nas atividades de registro obrigatório.'),
  medida(PASTA.registro, 'Atividade obrigatória e nenhum registro', `CALCULATE([Estabelecimentos do mercado sem registro], ${OBRIGATORIO})`, FORMATO.inteiro, 'Conta os estabelecimentos ativos na Receita com atividade de registro obrigatório que nunca tiveram registro ou visto no Crea-SP. Não estar no cadastro não quer dizer irregular.'),
  medida(PASTA.registro, 'Registradas com anuidade vencida', registradasCom('Anuidade vencida'), FORMATO.inteiro, 'Conta as empresas registradas com anuidade vencida e não paga na data escolhida.'),
  medida(PASTA.registro, 'Registradas sem anuidade vencida', '[Empresas registradas] - [Registradas com anuidade vencida]', FORMATO.inteiro, 'Conta as empresas registradas sem anuidade vencida na data escolhida.'),
  medida(PASTA.registro, 'Registradas em dia com a anuidade', 'DIVIDE([Registradas sem anuidade vencida], [Empresas registradas])', FORMATO.parte, 'Mostra a parte das empresas registradas sem anuidade vencida na data escolhida.'),
  medida(PASTA.registro, 'Registradas com cadastro incompleto', registradasCom('Cadastro incompleto'), FORMATO.inteiro, 'Conta as empresas registradas com pendência aberta no cadastro, como atividade não informada, regional não identificada, município diferente do da Receita ou CNPJ baixado.'),
  medida(PASTA.registro, 'Pendência mais comum', `${COM_DATA}\nVAR porTipo = CALCULATETABLE(ADDCOLUMNS(VALUES('Pendências do cadastro'[Pendência]), "Empresas com a pendência", CALCULATE(DISTINCTCOUNT('Pendências do cadastro'[Empresa]))), 'Pendências do cadastro'[Data] = d)\nVAR topo = TOPN(1, porTipo, [Empresas com a pendência], DESC, 'Pendências do cadastro'[Pendência], ASC)\nRETURN IF(COUNTROWS(topo) = 0, "nenhuma pendência aberta", FORMAT(MAXX(topo, [Empresas com a pendência]), "#,##0") & " " & MAXX(topo, 'Pendências do cadastro'[Pendência]))`,
    FORMATO.texto, 'Escreve a pendência aberta mais comum entre as registradas e quantas empresas a têm, como a linha de apoio do cartão.'),
  // Funil "Do mercado à ART" (complianceFlow do painel).
  medida(PASTA.registro, 'Empresas do mercado', contaNaFoto(naFoto('No mercado do funil')), FORMATO.inteiro, 'Conta as empresas registradas ou com estabelecimento de atividade da lista na Receita na data escolhida: o começo do funil.'),
  ...Object.values(situacoesNoFunil).map(situacao => medida(PASTA.registro, `Mercado: ${situacao.toLowerCase()}`, contaNaFoto(naFoto('No mercado do funil'), `'Foto das empresas'[Situação no funil] = "${situacao}"`), FORMATO.inteiro,
    `Conta as empresas do mercado com a situação "${situacao.toLowerCase()}" na data escolhida.`)),
  medida(PASTA.registro, 'Registradas sem RT identificado', '[Empresas registradas] - [Registradas com RT]', FORMATO.inteiro, 'Conta as empresas registradas sem responsável técnico de vínculo vigente, como a etapa do funil.'),
  medida(PASTA.registro, 'Registradas no tempo e no capital', contaNaFoto(naFoto('Registrada')), FORMATO.inteiro, 'Conta as empresas registradas em cada faixa de tempo desde o primeiro registro e de capital social; fica em branco quando a faixa não tem nenhuma.'),

  // Evolução.
  medida(PASTA.evolucao, 'Empresas que entraram na base', movimentoNoPeriodo('Entrada'), FORMATO.inteiro, 'Conta as empresas que passaram a ter registro ativo no período, pela primeira vez ou de volta depois de uma baixa ou um cancelamento.'),
  medida(PASTA.evolucao, 'Entraram pela primeira vez', movimentoNoPeriodo('Entrada', "'Entradas e saídas'[Primeira vez] = 1"), FORMATO.inteiro, 'Conta as entradas do período em que o primeiro registro da empresa é do próprio mês.'),
  medida(PASTA.evolucao, 'Retornos', '[Empresas que entraram na base] - [Entraram pela primeira vez]', FORMATO.inteiro, 'Conta as entradas de empresas que já tinham tido registro.'),
  medida(PASTA.evolucao, 'Entradas após fiscalização', movimentoNoPeriodo('Entrada', "'Entradas e saídas'[Após fiscalização] = 1"), FORMATO.inteiro, 'Conta as entradas no mesmo mês em que uma ação de fiscalização de registro da empresa foi regularizada.'),
  medida(PASTA.evolucao, 'Empresas que saíram da base', movimentoNoPeriodo('Saída'), FORMATO.inteiro, 'Conta as empresas cujo registro deixou de estar ativo no período, por baixa ou cancelamento.'),
  medida(PASTA.evolucao, 'Entradas menos saídas no período', '[Empresas que entraram na base] - [Empresas que saíram da base]', '+#,##0;-#,##0;0', 'Mostra quantas empresas entraram a mais do que saíram no período.'),
  medida(PASTA.evolucao, 'Empresas de engenharia abertas no período', `${COM_PERIODO}\nRETURN CALCULATE(COUNTROWS('Estabelecimentos'), 'Estabelecimentos'[Classe] <> "", 'Estabelecimentos'[Aberto em] >= inicio, 'Estabelecimentos'[Aberto em] <= d) + 0`, FORMATO.inteiro, 'Conta os estabelecimentos com atividade da lista do Crea-SP abertos na Receita no período. O arquivo da Receita chega com atraso: o último mês pode faltar.'),
  medida(PASTA.evolucao, 'Abertas no período que já se registraram', `${COM_PERIODO}\nRETURN CALCULATE(COUNTROWS('Foto dos estabelecimentos'), 'Foto dos estabelecimentos'[Data] = d, 'Foto dos estabelecimentos'[Registro ativo] = 1, 'Estabelecimentos'[Classe] <> "", 'Estabelecimentos'[Aberto em] >= inicio, 'Estabelecimentos'[Aberto em] <= d) + 0`, FORMATO.inteiro, 'Conta as abertas no período que têm registro ativo na data escolhida.'),
  medida(PASTA.evolucao, 'Parte das abertas que já se registrou', 'DIVIDE([Abertas no período que já se registraram], [Empresas de engenharia abertas no período])', FORMATO.parte, 'Mostra a parte das abertas no período que já se registrou.'),
  ...COORTES.flatMap(meses => [
    medida(PASTA.evolucao, `Registradas ${meses} meses antes`, somaDaFoto(`Registrada ${meses} meses antes`), FORMATO.inteiro, `Conta as empresas que estavam registradas ${meses} meses antes da data escolhida; é a base da permanência.`),
    medida(PASTA.evolucao, `Registradas ${meses} meses antes que continuam`, somaDaFoto(`Continua registrada desde ${meses} meses`), FORMATO.inteiro, `Conta as registradas ${meses} meses antes que continuam registradas na data escolhida.`),
    medida(PASTA.evolucao, `Continuam registradas depois de ${meses} meses`, `DIVIDE([Registradas ${meses} meses antes que continuam], [Registradas ${meses} meses antes])`, FORMATO.parte, `Mostra, das empresas registradas ${meses} meses antes da data escolhida, a parte que continua registrada. Quem entrou depois não conta.`),
  ]),
  medida(PASTA.evolucao, 'Emprego formal em engenharia', `${COM_DATA}\nRETURN CALCULATE(SUM('Emprego formal'[Empregados]), 'Emprego formal'[Mês] = DATE(YEAR(d), MONTH(d), 1))`, FORMATO.inteiro, 'Conta os empregados com carteira em ocupações de engenharia no mês da data escolhida. A fonte, a RAIS (Relação Anual de Informações Sociais) com o Novo CAGED (Cadastro Geral de Empregados e Desempregados), sai em totais por regional.'),
  ...medidasDaEconomia(),
  medida(PASTA.evolucao, 'Meses no gráfico da economia', `${COM_DATA}\n${INICIO_DA_ECONOMIA}\nRETURN DATEDIFF(inicio, DATE(YEAR(d), MONTH(d), 1), MONTH) + 1`, '0', 'Conta os meses do gráfico de economia, do primeiro ao mês da data escolhida.'),
  medida(PASTA.evolucao, 'Variação do emprego nos meses do gráfico', `${COM_DATA}\n${INICIO_DA_ECONOMIA}\nVAR primeiro = CALCULATE(SUM('Emprego formal'[Empregados]), 'Emprego formal'[Mês] = inicio)\nVAR ultimo = [Emprego formal em engenharia]\nRETURN IF(primeiro > 0, DIVIDE(ultimo - primeiro, primeiro))`,
    FORMATO.variacao, 'Compara o emprego formal do mês da data escolhida com o do primeiro mês do gráfico de economia, como o cartão do painel.'),
  medida(PASTA.evolucao, 'Abertas no mês já registradas', noMesDaReceita("CALCULATE(COUNTROWS('Foto dos estabelecimentos'), 'Foto dos estabelecimentos'[Data] = d, 'Foto dos estabelecimentos'[Registro ativo] = 1, 'Estabelecimentos'[Classe] <> \"\") + 0"), FORMATO.inteiro,
    'Conta os estabelecimentos com atividade da lista abertos em cada mês que já têm registro ou visto na data escolhida.'),
  medida(PASTA.evolucao, 'Abertas no mês sem registro', noMesDaReceita("CALCULATE(COUNTROWS('Estabelecimentos'), 'Estabelecimentos'[Classe] <> \"\") - CALCULATE(COUNTROWS('Foto dos estabelecimentos'), 'Foto dos estabelecimentos'[Data] = d, 'Foto dos estabelecimentos'[Registro ativo] = 1, 'Estabelecimentos'[Classe] <> \"\") + 0"), FORMATO.inteiro,
    'Conta os estabelecimentos com atividade da lista abertos em cada mês que não têm registro na data escolhida.'),
  medida(PASTA.evolucao, 'Entradas no mês', noMes(contaMovimento('Entrada')), FORMATO.inteiro, 'Conta as entradas de cada mês, nos meses do gráfico.'),
  medida(PASTA.evolucao, 'Primeiros registros no mês', noMes(contaMovimento('Entrada', "'Entradas e saídas'[Primeira vez] = 1")), FORMATO.inteiro, 'Conta as empresas que fizeram o primeiro registro no Crea-SP em cada mês (ou trimestre), nos meses do gráfico.'),
  medida(PASTA.evolucao, 'Saídas no mês', noMes(contaMovimento('Saída')), FORMATO.inteiro, 'Conta as saídas de cada mês, nos meses do gráfico.'),
  medida(PASTA.evolucao, 'Registradas no fim do mês', noMes("SUM('Foto das empresas'[Registrada])"), FORMATO.inteiro, 'Conta as empresas registradas no último dia de cada mês, só nos meses com foto.'),

  // RT e ART.
  medida(PASTA.rtArt, 'Empresas com responsável técnico', 'DIVIDE([Registradas com RT], [Empresas registradas])', FORMATO.parte, 'Mostra a parte das empresas registradas com responsável técnico de vínculo vigente na data escolhida.'),
  medida(PASTA.rtArt, 'Distância da meta de RT', '([Empresas com responsável técnico] - [Meta de RT]) * 100', FORMATO.pontos, 'Mostra, em pontos percentuais, quanto a parte com RT está acima ou abaixo da meta.'),
  medida(PASTA.rtArt, 'Registradas sem RT vigente', '[Empresas registradas] - [Registradas com RT]', FORMATO.inteiro, 'Conta as empresas registradas sem responsável técnico de vínculo vigente: o RT saiu sem substituto ou nenhum vínculo foi carregado.'),
  medida(PASTA.rtArt, 'Registradas com RT', registradasCom('Com RT'), FORMATO.inteiro, 'Conta as empresas registradas com responsável técnico de vínculo vigente.'),
  medida(PASTA.rtArt, 'RT que saiu sem substituto', registradasCom('RT saiu sem substituto'), FORMATO.inteiro, 'Conta as empresas registradas cujo último responsável técnico saiu há mais de 30 dias, sem outro no lugar.'),
  medida(PASTA.rtArt, 'Sem vínculo de RT carregado', registradasCom('Sem vínculo de RT'), FORMATO.inteiro, 'Conta as empresas registradas que não têm RT nem vínculo carregado no cadastro.'),
  medida(PASTA.rtArt, 'RT com registro profissional cancelado ou interrompido', registradasCom('RT cancelado ou interrompido'), FORMATO.inteiro, 'Conta, entre as registradas com RT, aquelas cujo profissional do vínculo vigente está com o registro cancelado ou interrompido na data escolhida.'),
  medida(PASTA.rtArt, 'ARTs de empresas', `${COM_PERIODO}\nRETURN ${nasArts("COUNTROWS('ARTs')", 'd')}`, FORMATO.inteiro, 'Conta as ARTs registradas por empresas no período.'),
  medida(PASTA.rtArt, 'ARTs um ano antes', `${UM_ANO_ANTES}\nRETURN ${nasArts("COUNTROWS('ARTs')", 'fim')}`, FORMATO.inteiro, 'Conta as ARTs do mesmo período um ano antes, com início e fim recuados 12 meses.'),
  medida(PASTA.rtArt, variacaoDe('ARTs de empresas'), 'DIVIDE([ARTs de empresas] - [ARTs um ano antes], [ARTs um ano antes])', FORMATO.variacao, 'Compara as ARTs do período com as do mesmo período um ano antes, como o cartão do painel.'),
  medida(PASTA.rtArt, 'Valor declarado em ART', `${COM_PERIODO}\nRETURN ${nasArts("SUM('ARTs'[Valor])", 'd')}`, FORMATO.reais, 'Soma o valor de contrato declarado nas ARTs do período.'),
  medida(PASTA.rtArt, 'Valor em ART um ano antes', `${UM_ANO_ANTES}\nRETURN ${nasArts("SUM('ARTs'[Valor])", 'fim')}`, FORMATO.reais, 'Soma o valor declarado nas ARTs do mesmo período um ano antes.'),
  medida(PASTA.rtArt, variacaoDe('Valor declarado em ART'), 'DIVIDE([Valor declarado em ART] - [Valor em ART um ano antes], [Valor em ART um ano antes])', FORMATO.variacao, 'Compara o valor declarado no período com o do mesmo período um ano antes, como o cartão do painel.'),
  medida(PASTA.rtArt, 'Registradas com ART no período', `${COM_PERIODO}\nVAR registradas = CALCULATETABLE(VALUES('Foto das empresas'[Empresa]), 'Foto das empresas'[Data] = d, 'Foto das empresas'[Registrada] = 1)\nVAR comArt = CALCULATETABLE(VALUES('ARTs'[Empresa]), 'ARTs'[Data] >= inicio, 'ARTs'[Data] <= d)\nRETURN COUNTROWS(INTERSECT(registradas, comArt)) + 0`, FORMATO.inteiro, 'Conta as empresas registradas na data escolhida com ao menos uma ART no período.'),
  medida(PASTA.rtArt, 'Registradas sem ART no período', '[Empresas registradas] - [Registradas com ART no período]', FORMATO.inteiro, 'Conta as empresas registradas que não registraram nenhuma ART no período.'),
  medida(PASTA.rtArt, 'Registradas sem nenhuma ART', 'DIVIDE([Registradas sem ART no período], [Empresas registradas])', FORMATO.parte, 'Mostra a parte das empresas registradas sem nenhuma ART no período.'),
  medida(PASTA.rtArt, 'ARTs a cada 100 profissionais ativos', `${COM_DATA}\nVAR arts = [ARTs de empresas]\nVAR ativos = CALCULATE(SUM('Profissionais ativos'[Ativos]), 'Profissionais ativos'[Data] = d)\nRETURN IF(arts > 0 && ativos > 0, arts / ativos * 100)`, '0.0',
    'Divide as ARTs de empresas do período pelos profissionais ativos da mesma modalidade na data escolhida, vezes 100. Os profissionais seguem a regional e o município escolhidos; a modalidade sem ART fica de fora.'),
  medida(PASTA.rtArt, 'ARTs no mês', noMes("CALCULATE(COUNTROWS('ARTs')) + 0"), FORMATO.inteiro, 'Conta as ARTs registradas em cada mês, nos meses do gráfico.'),
  medida(PASTA.rtArt, 'ARTs no mesmo mês do ano anterior', noMes("CALCULATE(COUNTROWS('ARTs'), REMOVEFILTERS('Calendário'), 'ARTs'[Mês] = EDATE(mes, -12)) + 0"), FORMATO.inteiro, 'Conta as ARTs do mesmo mês um ano antes, para comparar.'),

  // Vínculos ("!": dependem de acordo).
  ...BLOCOS_PARCERIA.map(bloco => medida(PASTA.vinculos, medidaDoBloco(bloco), `CALCULATE(SUM('Parcerias'[Valor]), 'Parcerias'[Bloco] = "${bloco.bloco}")`, FORMATO.inteiro,
    bloco.acordos.length ? fichaDoAcordo(bloco.acordos)
      : 'Liga pelo CNPJ as fontes abertas da ANEEL (Agência Nacional de Energia Elétrica), da ANP (Agência Nacional do Petróleo), da ANM (Agência Nacional de Mineração) e do BNDES (Banco Nacional de Desenvolvimento Econômico e Social). Os números são do cenário na data de hoje.')),

  ...medidasDosCartoes(CARTOES),
];

/** Medida mês a mês das abertas na Receita: os meses do gráfico, até o último mês com arquivo da Receita. */
function noMesDaReceita(expressao: string) {
  return `${COM_DATA}\n${ULTIMO_MES_DA_RECEITA}\nVAR inicio = ${inicioDe(MESES_DO_GRAFICO)}\nVAR m = MAX('Calendário'[Mês])\nRETURN IF(m >= inicio && m <= d && m <= receita, ${expressao})`;
}

export const modeloEmpresas: Modelo = {
  nome: 'Empresas',
  parametros: [{ nome: PASTA_PARAMETRO, valor: 'C:\\CREA-SP\\powerbi\\empresas\\dados\\', descricao: 'Pasta onde estão os CSV do pacote (termina com \\). Troque em Transformar dados > Editar parâmetros e clique em Atualizar.' }],
  tabelas: [...tabelas, { nome: 'Medidas', descricao: 'Guarda as medidas do painel de Empresas, em pastas por página.', colunas: [{ nome: 'Medidas', tipo: 'string', oculta: true }], medidas }],
  relacoes: [
    // Nos dois sentidos: escolher um município leva o emprego formal e o crédito à regional dele, como no painel.
    { de: ['Municípios', 'GRE'], para: ['Regionais', 'GRE'], ambasDirecoes: true },
    { de: ['Empresas', 'Código IBGE'], para: ['Municípios', 'Código IBGE'] },
    { de: ['Estabelecimentos', 'Empresa'], para: ['Empresas', 'Empresa'] },
    { de: ['Estabelecimentos', 'Mês de abertura'], para: ['Calendário', 'Mês'] },
    { de: ['Foto das empresas', 'Empresa'], para: ['Empresas', 'Empresa'] },
    { de: ['Foto das empresas', 'Mês'], para: ['Calendário', 'Mês'] },
    { de: ['Foto dos estabelecimentos', 'Estabelecimento'], para: ['Estabelecimentos', 'Estabelecimento'] },
    { de: ['Pendências do cadastro', 'Empresa'], para: ['Empresas', 'Empresa'] },
    { de: ['Profissionais ativos', 'Código IBGE'], para: ['Municípios', 'Código IBGE'] },
    { de: ['Profissionais ativos', 'Modalidade'], para: ['Modalidades', 'Modalidade'] },
    { de: ['Entradas e saídas', 'Empresa'], para: ['Empresas', 'Empresa'] },
    { de: ['Entradas e saídas', 'Mês'], para: ['Calendário', 'Mês'] },
    { de: ['ARTs', 'Empresa'], para: ['Empresas', 'Empresa'] },
    { de: ['ARTs', 'Mês'], para: ['Calendário', 'Mês'] },
    { de: ['ARTs', 'Modalidade'], para: ['Modalidades', 'Modalidade'] },
    { de: ['Emprego formal', 'GRE'], para: ['Regionais', 'GRE'] },
    { de: ['Emprego formal', 'Mês'], para: ['Calendário', 'Mês'] },
    { de: ['Crédito', 'GRE'], para: ['Regionais', 'GRE'] },
    { de: ['Crédito', 'Mês'], para: ['Calendário', 'Mês'] },
  ],
};
