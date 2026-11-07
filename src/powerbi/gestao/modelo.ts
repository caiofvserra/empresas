import type { Medida, Modelo, Tabela } from '../modelo';
import { COM_DATA, COM_PERIODO, FORMATO, MESES_NA_BASE, PASTA_PARAMETRO, data, filtrosExtras, inteiro, medida, medidasDeApoio, medidasDosCartoes, reais, texto } from '../comum';
import type { Cartao } from '../comum';
import { CARTOES_ATENDIMENTO, PASTA_ATENDIMENTO, medidasAtendimento, relacoesAtendimento, tabelasAtendimento } from './atendimento';

/*
 * Modelo do painel de Atendimento no Power BI (o Financeiro tem modelo próprio em `src/powerbi/financeiro/` desde 07/11/2026): as
 * tabelas de `dados.ts`, as relações do esquema estrela e as medidas DAX dos cartões e gráficos das três páginas (os protocolos
 * em `atendimento.ts`). Os protocolos e os profissionais ativos leem a foto da data escolhida; o uso dos coworkings soma os fatos do
 * período (ADR 0002). `tests/powerbi-atendimento.test.ts` e `powerbi-gestao.test.ts` reproduzem estas regras sobre os CSV e conferem
 * com os números do protótipo.
 */
const PASTA = { apoio: 'Apoio', equipe: PASTA_ATENDIMENTO.equipe } as const;

const tabelas: Tabela[] = [
  // Dimensões.
  { nome: 'Regionais', arquivo: 'regionais.csv', descricao: 'Tem uma linha para cada uma das 16 gerências regionais do Crea-SP.', colunas: [texto('GRE', { ordenarPor: 'Ordem' }), inteiro('Ordem', { oculta: true })] },
  { nome: 'Municípios', arquivo: 'municipios.csv', descricao: 'Tem os 645 municípios de SP, a GRE de cada um pela tabela oficial e a unidade de atendimento mais próxima, com a distância em linha reta.',
    colunas: [texto('Código IBGE'), texto('Município'), texto('GRE'), texto('Unidade mais próxima'), inteiro('Distância até a unidade (km)', { formato: '#,##0' })] },
  { nome: 'Calendário', arquivo: 'calendario.csv', descricao: 'Tem um mês por linha, de 2020 até 12 meses depois de hoje, para os gráficos mês a mês.',
    colunas: [data('Mês', { formato: 'mmm/yy' }), texto('Rótulo', { ordenarPor: 'Mês' }), inteiro('Ano'), inteiro('Mês do ano', { oculta: true }), texto('Nome do mês', { ordenarPor: 'Mês do ano' }), inteiro('Ordem', { oculta: true })] },
  { nome: 'Datas de referência', arquivo: 'datas-referencia.csv', descricao: 'Tem os fins de mês em que a base pode ser lida, e hoje. Não se liga às outras tabelas: a escolha vale para todas as medidas.', colunas: [data('Data'), texto('Rótulo', { ordenarPor: 'Data' })] },
  { nome: 'Datas das fotos', arquivo: 'datas-das-fotos.csv', oculta: true, descricao: 'Tem todas as datas com foto, inclusive os meses antes da primeira data de referência. As medidas de variação a usam para ler o mesmo indicador um ano antes.', colunas: [data('Data')] },
  { nome: 'Período', calculada: `GENERATESERIES(1, ${MESES_NA_BASE}, 1)`, descricao: 'Guarda o número de meses somados nos fluxos, contados para trás a partir da data de referência. No Power BI Desktop, é um parâmetro do tipo "Intervalo numérico", de 1 a 36 meses.', colunas: [inteiro('Meses', { origem: '[Value]', parametro: true })] },

  { nome: 'Profissionais ativos', arquivo: 'profissionais-ativos.csv', oculta: true, descricao: 'Conta os profissionais com registro ativo no último dia de cada mês, por município onde moram.', colunas: [data('Data'), texto('Código IBGE'), inteiro('Ativos')] },

  // Atendimento: os protocolos (em atendimento.ts) e os coworkings.
  ...tabelasAtendimento,
  { nome: 'Coworkings', arquivo: 'coworkings.csv', descricao: 'Tem as unidades de coworking do Crea-SP, pelo município, com o número de mesas. Os filtros chegam pela GRE, como no painel.', colunas: [texto('Unidade'), texto('Código IBGE', { oculta: true }), texto('GRE', { oculta: true }), inteiro('Mesas', { oculta: true })] },
  { nome: 'Meses dos coworkings', arquivo: 'coworkings-meses.csv', oculta: true, descricao: 'Guarda, por unidade e mês, as horas de mesa disponíveis, as usadas e o custo.', colunas: [texto('Unidade'), data('Mês'), inteiro('Horas disponíveis'), inteiro('Horas usadas'), reais('Custo')] },
  { nome: 'Usuários dos coworkings', arquivo: 'coworkings-usuarios.csv', oculta: true, descricao: 'Guarda os profissionais que usaram cada unidade em cada mês.', colunas: [texto('Unidade'), data('Mês'), texto('Profissional')] },
];

/* ---------- Pedaços de DAX ---------- */
const filtros = (lista: string[]) => filtrosExtras(lista.map(filtro => `KEEPFILTERS(${filtro})`));
/** Calcula a expressão sobre as linhas do fato cuja coluna de data `quando` cai no período escolhido. */
const noPeriodo = (tabela: string, quando: string, expressao: string, ...extra: string[]) => `${COM_PERIODO}\nRETURN CALCULATE(${expressao}, REMOVEFILTERS('Calendário'), '${tabela}'[${quando}] >= inicio, '${tabela}'[${quando}] <= d${filtros(extra)})`;
/** Soma uma coluna de uma foto na data escolhida, com filtros a mais (KEEPFILTERS, para não apagar a série do gráfico). */
const naFoto = (tabela: string, expressao: string, ...extra: string[]) => `${COM_DATA}\nRETURN CALCULATE(${expressao}, REMOVEFILTERS('Calendário'), '${tabela}'[Data] = d${extra.map(filtro => `, KEEPFILTERS(${filtro})`).join('')})`;



/* ---------- Cartões ---------- */
/** Os cartões de cada página, com a comparação e a linha de apoio do painel. `paginas.ts` monta os cartões daqui. */
export const CARTOES = { ...CARTOES_ATENDIMENTO } satisfies Record<string, Cartao[]>;

/* ---------- Medidas ---------- */
const medidas: Medida[] = [
  // Apoio: data, período e meta.
  ...medidasDeApoio(PASTA.apoio),

  // Os protocolos (em atendimento.ts), os profissionais longe de uma unidade e os coworkings.
  ...medidasAtendimento(PASTA.apoio),
  medida(PASTA.equipe, 'Profissionais ativos', naFoto('Profissionais ativos', "SUM('Profissionais ativos'[Ativos])"), FORMATO.inteiro, 'Conta os profissionais com registro ativo na data escolhida, pelo município onde moram.'),
  medida(PASTA.equipe, 'Ativos a mais de 50 km', "CALCULATE([Profissionais ativos], 'Municípios'[Distância até a unidade (km)] > 50)", FORMATO.inteiro, 'Conta os profissionais ativos que moram a mais de 50 km, em linha reta, da unidade de atendimento mais próxima.'),
  medida(PASTA.equipe, 'A mais de 50 km da unidade', 'DIVIDE([Ativos a mais de 50 km], [Profissionais ativos])', FORMATO.parte, 'Mostra a parte dos profissionais ativos que moram a mais de 50 km, em linha reta, da unidade mais próxima. Pela estrada, a distância costuma ser de 20% a 40% maior.'),
  medida(PASTA.equipe, 'Horas disponíveis no período', `${noPeriodo('Meses dos coworkings', 'Mês', "SUM('Meses dos coworkings'[Horas disponíveis])")} + 0`, FORMATO.inteiro, 'Soma as horas de mesa disponíveis nos coworkings no período.'),
  medida(PASTA.equipe, 'Horas usadas no período', `${noPeriodo('Meses dos coworkings', 'Mês', "SUM('Meses dos coworkings'[Horas usadas])")} + 0`, FORMATO.inteiro, 'Soma as horas de mesa usadas nos coworkings no período.'),
  medida(PASTA.equipe, 'Custo dos coworkings no período', `${noPeriodo('Meses dos coworkings', 'Mês', "SUM('Meses dos coworkings'[Custo])")} + 0`, FORMATO.reais, 'Soma o custo dos coworkings no período.'),
  medida(PASTA.equipe, 'Ocupação dos coworkings', 'DIVIDE([Horas usadas no período], [Horas disponíveis no período])', FORMATO.parte, 'Mostra a parte das horas de mesa disponíveis no período que foi usada.'),
  medida(PASTA.equipe, 'Usuários dos coworkings', `${noPeriodo('Usuários dos coworkings', 'Mês', "DISTINCTCOUNT('Usuários dos coworkings'[Profissional])")} + 0`, FORMATO.inteiro, 'Conta os profissionais que usaram os coworkings no período.'),
  medida(PASTA.equipe, 'Unidades de coworking', "COUNTROWS('Coworkings') + 0", FORMATO.inteiro, 'Conta as unidades de coworking no recorte.'),

  ...medidasDosCartoes(CARTOES),
];

/** O modelo de origem do painel de Atendimento: o pacote leva o recorte das suas páginas (ver recorte.ts). */
export const modeloGestao: Modelo = {
  nome: 'Gestao',
  parametros: [{ nome: PASTA_PARAMETRO, valor: 'C:\\CREA-SP\\powerbi\\atendimento\\dados\\', descricao: 'Pasta onde estão os CSV do pacote (termina com \\). Troque em Transformar dados > Editar parâmetros e clique em Atualizar.' }],
  tabelas: [...tabelas, { nome: 'Medidas', descricao: 'Guarda as medidas do painel, em pastas por página.', colunas: [{ nome: 'Medidas', tipo: 'string', oculta: true }], medidas }],
  relacoes: [
    // Nos dois sentidos: escolher um município leva os coworkings e o quadro de atendimento à regional dele.
    { de: ['Municípios', 'GRE'], para: ['Regionais', 'GRE'], ambasDirecoes: true },
    { de: ['Profissionais ativos', 'Código IBGE'], para: ['Municípios', 'Código IBGE'] },
    ...relacoesAtendimento,
    // Os coworkings seguem a GRE, como no painel: o município escolhido leva à regional dele.
    { de: ['Coworkings', 'GRE'], para: ['Regionais', 'GRE'] },
    { de: ['Meses dos coworkings', 'Unidade'], para: ['Coworkings', 'Unidade'] },
    { de: ['Meses dos coworkings', 'Mês'], para: ['Calendário', 'Mês'] },
    { de: ['Usuários dos coworkings', 'Unidade'], para: ['Coworkings', 'Unidade'] },
    { de: ['Usuários dos coworkings', 'Mês'], para: ['Calendário', 'Mês'] },
  ],
};
