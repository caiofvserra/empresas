import type { Medida, Relacao, Tabela } from '../modelo';
import { COM_DATA, COM_PERIODO, FORMATO, cartao, data, inteiro, medida, n, parte, reais, sinal, texto } from '../comum';
import { SEM_ATRIBUICAO } from './dados-atendimento';

/*
 * O Atendimento no modelo comum (07/11/2026): as tabelas dos protocolos, as relações e as medidas DAX das três páginas
 * (Protocolos, Equipe e território, Demanda). Os protocolos são lidos na foto da data escolhida (ADR 0002): a situação, o prazo e
 * com quem está mudam com a data, e a foto de cada fim de mês guarda a leitura daquele dia. Quase todo cartão conta os protocolos
 * abertos no período, como o painel antigo (`doPeriodo`). A demanda de fora (aberturas, ARTs, formatura) olha só o lugar: o tipo de
 * serviço e a unidade escolhidos não entram, como no painel. `tests/powerbi-atendimento.test.ts` reproduz estas regras sobre os
 * CSV e confere com `quadroAtendimento` e `demandaAtendimento`.
 */
export const PASTA_ATENDIMENTO = { protocolos: 'Protocolos', equipe: 'Equipe e território', demanda: 'Demanda' } as const;

export const tabelasAtendimento: Tabela[] = [
  { nome: 'Protocolos', arquivo: 'protocolos.csv', descricao: 'Guarda cada protocolo de atendimento: o serviço (subtipo da Carta de Serviços) e o tipo, o prazo em dias úteis com o Crea-SP, a taxa, o município de quem pediu (a regional vem dele, pela tabela oficial), a unidade mais próxima, o canal e o motivo da exigência, quando houve.',
    colunas: [texto('Protocolo'), texto('Serviço'), texto('Tipo'), inteiro('Prazo do serviço', { formato: '0" dias úteis"' }), reais('Taxa'), texto('Solicitante'), texto('Código IBGE', { oculta: true }),
      texto('Unidade'), texto('Canal'), data('Aberto em'), data('Mês', { oculta: true }), texto('Trimestre', { ordenarPor: 'Ordem do trimestre' }), inteiro('Ordem do trimestre', { oculta: true }), texto('Motivo da exigência'),
      texto('Distância do solicitante', { ordenarPor: 'Ordem da distância' }), inteiro('Ordem da distância', { oculta: true }), sinal('Serviço de ART'), sinal('Pedido de registro de profissional')] },
  { nome: 'Foto dos protocolos', arquivo: 'foto-protocolos.csv', descricao: 'Guarda, no último dia de cada mês, cada protocolo aberto nos 36 meses até ele, lido nesse dia: o status, a situação (as cinco do painel antigo), se está dentro ou fora do prazo, com quem está, os dias úteis com o Crea-SP, os dias corridos com o solicitante e o dia em que fechou.',
    colunas: [data('Data', { oculta: true }), texto('Protocolo', { oculta: true }), texto('Status', { ordenarPor: 'Ordem do status' }), inteiro('Ordem do status', { oculta: true }), texto('Situação', { ordenarPor: 'Ordem da situação' }),
      inteiro('Ordem da situação', { oculta: true }), texto('Prazo', { ordenarPor: 'Ordem do prazo' }), inteiro('Ordem do prazo', { oculta: true }), texto('Pessoa', { oculta: true }), sinal('Atribuído'),
      inteiro('Dias com o Crea-SP', { oculta: true }), inteiro('Dias com o solicitante', { oculta: true }), data('Fechado em', { oculta: true }), inteiro('Dias úteis no status', { oculta: true }), sinal('Já teve exigência')] },
  { nome: 'Colaboradores', arquivo: 'colaboradores.csv', descricao: `Tem o quadro de atendimento, com o cargo e a lotação (quem está na sede atende pela capital, na GRE 5), e a linha "Sem atribuição" (chave ${SEM_ATRIBUICAO}) para o protocolo que ninguém pegou. Os nomes do cenário são fictícios.`,
    colunas: [texto('Pessoa', { oculta: true }), texto('Nome'), texto('Cargo'), texto('Lotação'), texto('GRE', { oculta: true }), sinal('No quadro')] },
  { nome: 'Aberturas na Receita', arquivo: 'aberturas-receita.csv', oculta: true, descricao: 'Guarda cada estabelecimento com atividade de engenharia aberto na Receita Federal, com o primeiro pedido de registro da empresa no Crea-SP entre 30 dias antes e 180 dias depois da abertura.',
    colunas: [texto('Estabelecimento'), texto('Código IBGE'), data('Aberta em'), data('Mês'), data('Pediu registro em')] },
  { nome: 'ARTs por mês', arquivo: 'arts-por-mes.csv', oculta: true, descricao: 'Conta as ARTs registradas em cada mês, pelo município da matriz da empresa.', colunas: [data('Mês'), texto('Código IBGE'), inteiro('ARTs')] },
  { nome: 'Concluintes', arquivo: 'concluintes.csv', oculta: true, descricao: 'Conta os concluintes de engenharia, agronomia e geociências de cada instituição de ensino em cada ano (Censo da Educação Superior, INEP), pelo município da instituição.',
    colunas: [inteiro('Ano'), texto('Instituição'), texto('Código IBGE'), inteiro('Concluintes')] },
  { nome: 'Formados registrados', arquivo: 'formados-registrados.csv', oculta: true, descricao: 'Guarda os profissionais registrados no Crea-SP com o ano em que concluíram o curso, pelo município da instituição de ensino declarada.',
    colunas: [texto('Profissional'), texto('Código IBGE'), inteiro('Ano de conclusão'), data('Registro em')] },
  { nome: 'Ouvidoria e informação', arquivo: 'ouvidoria-e-informacao.csv', descricao: 'Guarda, em cada data com foto, os pedidos de acesso à informação (LAI) e as manifestações da ouvidoria de cada um dos cinco anos até ela; o ano da data vai até ela. É o Crea-SP inteiro, sem regional (demonstrativo).',
    colunas: [data('Data', { oculta: true }), inteiro('Ano'), texto('Tipo', { ordenarPor: 'Ordem do tipo' }), inteiro('Ordem do tipo', { oculta: true }), inteiro('Quantidade', { oculta: true }), inteiro('Respondidos no prazo', { oculta: true }), inteiro('Recursos', { oculta: true })] },
];

export const relacoesAtendimento: Relacao[] = [
  // O protocolo chega à regional pelo município de quem pediu; a foto chega ao protocolo e a quem está com ele.
  { de: ['Protocolos', 'Código IBGE'], para: ['Municípios', 'Código IBGE'] },
  { de: ['Protocolos', 'Mês'], para: ['Calendário', 'Mês'] },
  { de: ['Foto dos protocolos', 'Protocolo'], para: ['Protocolos', 'Protocolo'] },
  { de: ['Foto dos protocolos', 'Pessoa'], para: ['Colaboradores', 'Pessoa'] },
  { de: ['Aberturas na Receita', 'Código IBGE'], para: ['Municípios', 'Código IBGE'] },
  { de: ['Aberturas na Receita', 'Mês'], para: ['Calendário', 'Mês'] },
  { de: ['ARTs por mês', 'Código IBGE'], para: ['Municípios', 'Código IBGE'] },
  { de: ['ARTs por mês', 'Mês'], para: ['Calendário', 'Mês'] },
  { de: ['Concluintes', 'Código IBGE'], para: ['Municípios', 'Código IBGE'] },
  { de: ['Formados registrados', 'Código IBGE'], para: ['Municípios', 'Código IBGE'] },
];

/* ---------- Pedaços de DAX ---------- */
const FOTO = "'Foto dos protocolos'";
const ANDAMENTO = `${FOTO}[Situação] IN {"Aberto", "Exigência"}`, FECHADO = `${FOTO}[Situação] = "Fechado"`, FORA = `${FOTO}[Prazo] = "Fora do prazo"`, ATRIBUIDO = `${FOTO}[Atribuído] = 1`;
/** Os protocolos abertos no período, lidos na foto da data escolhida, com os filtros extras de cada medida. */
const doPeriodo = (expressao: string, ...extra: string[]) =>
  `${COM_PERIODO}\nRETURN CALCULATE(${expressao}, REMOVEFILTERS('Calendário'), ${FOTO}[Data] = d, 'Protocolos'[Aberto em] >= inicio, 'Protocolos'[Aberto em] <= d${extra.map(filtro => `, KEEPFILTERS(${filtro})`).join('')})`;
const contar = (...extra: string[]) => `${doPeriodo(`COUNTROWS(${FOTO})`, ...extra)} + 0`;
/** A demanda olha só o lugar, como no painel: o tipo de serviço, o serviço e a unidade escolhidos saem do filtro. */
const SO_O_LUGAR = "REMOVEFILTERS('Protocolos'[Tipo], 'Protocolos'[Serviço], 'Protocolos'[Unidade])";
const M0 = 'VAR m0 = DATE(YEAR(d), MONTH(d), 1)';
/** Mês a mês, nos meses do eixo que caem na janela: `meses` meses até o mês da data (o painel mostra 12 a 24, ou 24). */
const naJanela = (meses: string, expressao: string) =>
  `${COM_DATA}\nVAR mes = MAX('Calendário'[Mês])\nVAR inicio = DATE(YEAR(d), MONTH(d) - ${meses} + 1, 1)\nRETURN IF(mes >= inicio && mes <= d, ${expressao})`;
const MESES_DO_MENSAL = 'MIN(24, MAX(12, [Meses do período]))';
const contarProtocolos = (...extra: string[]) => `CALCULATE(COUNTROWS('Protocolos'), ${SO_O_LUGAR}, 'Protocolos'[Aberto em] <= d${extra.map(filtro => `, ${filtro}`).join('')}) + 0`;
const doze = (tabela: string) => `'${tabela}'[Mês] >= EDATE(m0, -11), '${tabela}'[Mês] <= m0`;

/* ---------- Cartões ---------- */
const [nosProtocolos, naEquipe, naDemanda] = [cartao(PASTA_ATENDIMENTO.protocolos), cartao(PASTA_ATENDIMENTO.equipe), cartao(PASTA_ATENDIMENTO.demanda)];
export const CARTOES_ATENDIMENTO = {
  protocolos: [
    nosProtocolos('Fechados no prazo', { serie: 'taxa' }, `${n('[Fechados]')} & " fechados; a meta é " & FORMAT([Meta de fechados no prazo], "0%")`),
    nosProtocolos('Abertos no período', { serie: 'fluxo' }, `${parte('DIVIDE([Fechados], [Abertos no período])')} & " já fechados"`),
    nosProtocolos('Tempo típico até fechar', { serie: 'fluxo' }, '"mediana dos fechados, em dias úteis com o Crea-SP"'),
    nosProtocolos('Em andamento', { serie: 'estoque' }, `${n('[Em andamento fora do prazo]')} & " já passaram do prazo"`),
    nosProtocolos('Em exigência', undefined, `${n('[Exigências vencidas]')} & " passaram dos 30 dias; " & ${n('[Finalizados sem resposta]')} & " finalizados sem resposta"`),
    nosProtocolos('Sem pagamento', undefined, `FORMAT([Taxas sem pagamento], "R$ #,##0") & " em taxas; " & ${n('[Cancelados]')} & " cancelados"`),
  ],
  equipe: [
    naEquipe('Na fila e fora do prazo', undefined, `"de " & ${n('[Na fila]')} & " na fila de " & ${n('[Colaboradores com protocolos]')} & " colaboradores; " & ${n('[Colaboradores no quadro]')} & " no quadro"`),
    naEquipe('Fechados por colaborador', undefined, '"nos últimos 12 meses"'),
    naEquipe('Sem atribuição', undefined, `${n('[Sem atribuição há mais de 5 dias úteis]')} & " esperam há mais de 5 dias úteis"`),
    naEquipe('Maior fila de uma pessoa', undefined, [
      'VAR quem = TOPN(1, VALUES(\'Colaboradores\'[Pessoa]), [Na fila], DESC, [Na fila e fora do prazo], DESC, [Abertos no período], DESC, CALCULATE(MAX(\'Colaboradores\'[Nome])), ASC)',
      `RETURN IF(ISBLANK([Maior fila de uma pessoa]), "nenhum protocolo com colaborador", ${n("CALCULATE([Na fila e fora do prazo], quem)")} & " fora do prazo, com " & CALCULATE(MAX('Colaboradores'[Nome]), quem))`].join('\n')),
    naEquipe('A mais de 50 km da unidade', undefined, `${n('[Ativos a mais de 50 km]')} & " de " & ${n('[Profissionais ativos]')} & " profissionais ativos"`),
    naEquipe('Ocupação dos coworkings', { serie: 'taxa' }, `${n('[Unidades de coworking]')} & " unidades com " & ${n('[Usuários dos coworkings]')} & " usuários, a " & FORMAT(DIVIDE([Custo dos coworkings no período], [Horas usadas no período]), "R$ #,##0.00") & " por hora usada"`),
  ],
  demanda: [
    naDemanda('Previstos nos próximos 3 meses', undefined, [COM_DATA, M0, `RETURN "de " & FORMAT(EDATE(m0, 1), "mmm/yy") & " a " & FORMAT(EDATE(m0, 3), "mmm/yy") & IF([Colaboradores no quadro] > 0, ", cerca de " & ${n('DIVIDE([Previstos nos próximos 3 meses], [Colaboradores no quadro])')} & " por colaborador", "")`].join('\n')),
    naDemanda('Empresas novas que pediram registro', undefined, `${n('[Aberturas que pediram registro]')} & " das " & ${n('[Aberturas da coorte]')} & " aberturas de engenharia na Receita, em até 180 dias"`),
    naDemanda('Formados do ano anterior já registrados', undefined, `${n('[Formados registrados do ano anterior]')} & " dos " & ${n('[Concluintes do ano anterior]')} & " concluintes de " & (YEAR([Data escolhida]) - 1) & " (INEP) no recorte"`),
    naDemanda('Protocolos de ART por 1.000 ARTs', { serie: 'fluxo', frase: '" em relação aos 12 meses anteriores"' }, '"baixa, cancelamento e regularização, em 12 meses"'),
    naDemanda('Pedidos de informação no ano', undefined, `${parte('DIVIDE([Pedidos de informação respondidos no prazo], [Pedidos de informação no ano])')} & " respondidos no prazo; " & ${n('[Recursos dos pedidos de informação]')} & " recursos em " & YEAR([Data escolhida])`),
  ],
};

/* ---------- Medidas ---------- */
const diasUteis = '#,##0.#" dias úteis"';
const P = PASTA_ATENDIMENTO.protocolos, E = PASTA_ATENDIMENTO.equipe, D = PASTA_ATENDIMENTO.demanda;
export const medidasAtendimento = (apoio: string): Medida[] => [
  medida(apoio, 'Meta de fechados no prazo', '0.8', FORMATO.parte, 'Guarda a meta padrão de protocolos fechados dentro do prazo do serviço, 80%, a mesma do painel.'),

  // Protocolos.
  medida(P, 'Abertos no período', contar(), FORMATO.inteiro, 'Conta os protocolos abertos no período, como o painel antigo, cada um com a situação na data escolhida.'),
  medida(P, 'Fechados', contar(FECHADO), FORMATO.inteiro, 'Conta os protocolos do período fechados (deferidos, indeferidos ou finalizados) até a data escolhida. O cancelado não entra.'),
  medida(P, 'Fechados dentro do prazo', contar(FECHADO, `${FOTO}[Prazo] = "Dentro do prazo"`), FORMATO.inteiro, 'Conta os protocolos do período fechados com até o prazo do serviço em dias úteis com o Crea-SP.'),
  medida(P, 'Fechados no prazo', 'DIVIDE([Fechados dentro do prazo], [Fechados])', FORMATO.parte, 'Mostra a parte dos protocolos fechados que fecharam dentro do prazo do serviço, contado em dias úteis só enquanto o protocolo estava com o Crea-SP.'),
  medida(P, 'Tempo típico até fechar', doPeriodo(`MEDIAN(${FOTO}[Dias com o Crea-SP])`, FECHADO), diasUteis, 'Mostra a mediana dos dias úteis com o Crea-SP dos protocolos do período fechados até a data escolhida. O tempo com o solicitante, em exigência, não conta.'),
  medida(P, 'Em andamento', contar(ANDAMENTO), FORMATO.inteiro, 'Conta os protocolos do período em aberto ou em exigência na data escolhida.'),
  medida(P, 'Em andamento fora do prazo', contar(ANDAMENTO, FORA), FORMATO.inteiro, 'Conta os protocolos em andamento que já passaram do prazo: em aberto, pelos dias úteis com o Crea-SP; em exigência, pelos 30 dias para responder.'),
  medida(P, 'Em exigência', contar(`${FOTO}[Situação] = "Exigência"`), FORMATO.inteiro, 'Conta os protocolos do período esperando o solicitante responder a uma exigência.'),
  medida(P, 'Exigências vencidas', contar(`${FOTO}[Situação] = "Exigência"`, FORA), FORMATO.inteiro, 'Conta os protocolos em exigência há mais de 30 dias corridos.'),
  medida(P, 'Finalizados sem resposta', contar(`${FOTO}[Status] = "Finalizada sem resposta à exigência"`), FORMATO.inteiro, 'Conta os protocolos do período finalizados porque o solicitante não respondeu à exigência.'),
  medida(P, 'Sem pagamento', contar(`${FOTO}[Situação] = "Sem pagamento"`), FORMATO.inteiro, 'Conta os protocolos do período parados esperando o pagamento da taxa.'),
  medida(P, 'Taxas sem pagamento', `${doPeriodo(`SUMX(${FOTO}, RELATED('Protocolos'[Taxa]))`, `${FOTO}[Situação] = "Sem pagamento"`)} + 0`, FORMATO.reais, 'Soma as taxas dos protocolos parados sem pagamento.'),
  medida(P, 'Cancelados', contar(`${FOTO}[Situação] = "Cancelado"`), FORMATO.inteiro, 'Conta os protocolos do período cancelados até a data escolhida.'),
  medida(P, 'Dias com o solicitante', doPeriodo(`AVERAGE(${FOTO}[Dias com o solicitante])`, `${FOTO}[Dias com o solicitante] > 0`, `'Protocolos'[Motivo da exigência] <> ""`), '#,##0" dias"',
    'Mostra a média dos dias corridos em exigência, com o solicitante, dos protocolos do período que tiveram exigência.'),
  medida(P, 'Com exigência', contar(`${FOTO}[Já teve exigência] = 1`, `'Protocolos'[Motivo da exigência] <> ""`), FORMATO.inteiro, 'Conta os protocolos do período que tiveram exigência até a data escolhida, pelo motivo.'),
  medida(P, 'Abertos no mês', naJanela(MESES_DO_MENSAL, `CALCULATE(COUNTROWS(${FOTO}), ${FOTO}[Data] = d) + 0`), FORMATO.inteiro,
    'Conta os protocolos abertos em cada mês, pela situação na data escolhida, nos meses do gráfico: 12, ou o período quando passa disso, até 24.'),
  medida(P, 'Abertos no mesmo mês um ano antes', naJanela(MESES_DO_MENSAL, "CALCULATE(COUNTROWS('Protocolos'), REMOVEFILTERS('Calendário'), 'Protocolos'[Mês] = EDATE(mes, -12)) + 0"), FORMATO.inteiro,
    'Conta os protocolos abertos no mesmo mês um ano antes, para a linha tracejada do gráfico mês a mês.'),

  // Equipe e território.
  medida(E, 'Na fila', contar(ANDAMENTO, ATRIBUIDO), FORMATO.inteiro, 'Conta os protocolos do período em andamento que estão com um colaborador.'),
  medida(E, 'Na fila e fora do prazo', contar(ANDAMENTO, ATRIBUIDO, FORA), FORMATO.inteiro, 'Conta os protocolos em andamento com um colaborador que já passaram do prazo.'),
  medida(E, 'Colaboradores com protocolos', `${doPeriodo(`DISTINCTCOUNT(${FOTO}[Pessoa])`, ATRIBUIDO)} + 0`, FORMATO.inteiro, 'Conta os colaboradores com algum protocolo do período no último status.'),
  medida(E, 'Colaboradores no quadro', "IF(ISCROSSFILTERED('Regionais'), CALCULATE(COUNTROWS('Colaboradores'), 'Colaboradores'[No quadro] = 1, TREATAS(VALUES('Regionais'[GRE]), 'Colaboradores'[GRE])), CALCULATE(COUNTROWS('Colaboradores'), 'Colaboradores'[No quadro] = 1)) + 0", FORMATO.inteiro,
    'Conta o quadro de atendimento do recorte, pela lotação. Quem está na sede conta na GRE 5. O município escolhido leva à regional dele.'),
  medida(E, 'Fechados nos 12 meses', [COM_DATA, `RETURN CALCULATE(COUNTROWS(${FOTO}), REMOVEFILTERS('Calendário'), ${SO_O_LUGAR}, ${FOTO}[Data] = d, NOT ISBLANK(${FOTO}[Fechado em]), ${FOTO}[Fechado em] >= DATE(YEAR(d), MONTH(d) - 11, 1), ${FOTO}[Fechado em] <= d) + 0`].join('\n'), FORMATO.inteiro,
    'Conta os protocolos do lugar que fecharam ou foram cancelados nos 12 meses até a data escolhida, abertos em qualquer data.'),
  medida(E, 'Fechados por colaborador', 'DIVIDE([Fechados nos 12 meses], 12 * [Colaboradores no quadro])', '#,##0.0" por mês"', 'Divide os fechados nos 12 meses pelos 12 meses e pelo quadro de atendimento do recorte.'),
  medida(E, 'Sem atribuição', contar(`${FOTO}[Situação] IN {"Aberto", "Sem pagamento"}`, `${FOTO}[Atribuído] = 0`), FORMATO.inteiro, 'Conta os protocolos do período em aberto ou sem pagamento que nenhum colaborador pegou.'),
  medida(E, 'Sem atribuição há mais de 5 dias úteis', contar(`${FOTO}[Situação] IN {"Aberto", "Sem pagamento"}`, `${FOTO}[Atribuído] = 0`, `${FOTO}[Dias úteis no status] > 5`), FORMATO.inteiro,
    'Conta os protocolos sem atribuição parados no mesmo status há mais de 5 dias úteis.'),
  medida(E, 'Maior fila de uma pessoa', "IF([Colaboradores com protocolos] > 0, MAXX(VALUES('Colaboradores'[Pessoa]), [Na fila]))", FORMATO.inteiro, 'Mostra a maior fila (protocolos em andamento) de um colaborador. O nome está na linha de apoio.'),
  medida(E, 'Fechados no prazo nos meses do gráfico', [COM_DATA, `VAR inicio = DATE(YEAR(d), MONTH(d) - ${MESES_DO_MENSAL} + 1, 1)`,
    `VAR fechados = CALCULATE(COUNTROWS(${FOTO}), REMOVEFILTERS('Calendário'), ${FOTO}[Data] = d, 'Protocolos'[Aberto em] >= inicio, 'Protocolos'[Aberto em] <= d, ${FECHADO})`,
    `RETURN DIVIDE(CALCULATE(COUNTROWS(${FOTO}), REMOVEFILTERS('Calendário'), ${FOTO}[Data] = d, 'Protocolos'[Aberto em] >= inicio, 'Protocolos'[Aberto em] <= d, ${FECHADO}, ${FOTO}[Prazo] = "Dentro do prazo"), fechados)`].join('\n'), FORMATO.parte,
    'Mostra a parte dos fechados que fecharam no prazo, pelo trimestre de abertura, nos meses do gráfico mês a mês (12 a 24).'),

  // Demanda.
  medida(D, 'Tendência dos protocolos', [COM_DATA, M0, `VAR ultimos = ${contarProtocolos("REMOVEFILTERS('Calendário')", doze('Protocolos'))}`,
    `VAR anteriores = ${contarProtocolos("REMOVEFILTERS('Calendário')", "'Protocolos'[Mês] >= EDATE(m0, -23)", "'Protocolos'[Mês] <= EDATE(m0, -12)")}`, 'RETURN IF(anteriores > 0, DIVIDE(ultimos, anteriores), 1)'].join('\n'), '0.00',
    'Divide os protocolos abertos nos 12 meses até a data pelos dos 12 meses anteriores. Corrige a previsão.'),
  medida(D, 'Previstos nos próximos 3 meses', [COM_DATA, M0, 'VAR t = [Tendência dos protocolos]',
    ...[1, 2, 3].map(i => `VAR mes${i} = ROUND((${contarProtocolos("REMOVEFILTERS('Calendário')", `'Protocolos'[Mês] = EDATE(m0, ${i - 12})`)}) * t, 0)`), 'RETURN mes1 + mes2 + mes3'].join('\n'), FORMATO.inteiro,
    'Soma, nos três meses depois do mês da data, os protocolos abertos no mesmo mês um ano antes, vezes a tendência dos 12 meses.'),
  medida(D, 'Protocolos por mês', naJanela('24', contarProtocolos()), FORMATO.inteiro, 'Conta os protocolos abertos em cada mês nos 24 meses até a data, só pelo lugar.'),
  medida(D, 'Previstos por mês', [COM_DATA, "VAR mes = MAX('Calendário'[Mês])", M0, `RETURN IF(mes > m0 && mes <= EDATE(m0, 3), ROUND((${contarProtocolos("REMOVEFILTERS('Calendário')", "'Protocolos'[Mês] = EDATE(mes, -12)")}) * [Tendência dos protocolos], 0))`].join('\n'), FORMATO.inteiro,
    'Prevê os três meses depois do mês da data: o mesmo mês um ano antes, vezes a tendência dos 12 meses.'),
  medida(D, 'Aberturas de engenharia na Receita', naJanela('24', "CALCULATE(COUNTROWS('Aberturas na Receita'), 'Aberturas na Receita'[Aberta em] <= d)"), FORMATO.inteiro,
    'Conta os estabelecimentos com atividade de engenharia abertos na Receita em cada mês. O mês depois do último arquivo da Receita fica vazio.'),
  medida(D, 'Pedidos de registro de empresa', naJanela('24', contarProtocolos("'Protocolos'[Serviço] = \"Registro de empresa\"")), FORMATO.inteiro, 'Conta os pedidos de registro de empresa abertos em cada mês.'),
  medida(D, 'Aberturas da coorte', [COM_DATA, "RETURN CALCULATE(COUNTROWS('Aberturas na Receita'), REMOVEFILTERS('Calendário'), 'Aberturas na Receita'[Aberta em] >= DATE(YEAR(d), MONTH(d) - 17, 1), 'Aberturas na Receita'[Aberta em] < DATE(YEAR(d), MONTH(d) - 5, 1)) + 0"].join('\n'), FORMATO.inteiro,
    'Conta as aberturas de engenharia na Receita de 18 a 6 meses antes da data: as que já tiveram 180 dias para pedir registro.'),
  medida(D, 'Aberturas que pediram registro', [COM_DATA, "RETURN CALCULATE(COUNTROWS('Aberturas na Receita'), REMOVEFILTERS('Calendário'), 'Aberturas na Receita'[Aberta em] >= DATE(YEAR(d), MONTH(d) - 17, 1), 'Aberturas na Receita'[Aberta em] < DATE(YEAR(d), MONTH(d) - 5, 1), NOT ISBLANK('Aberturas na Receita'[Pediu registro em]), 'Aberturas na Receita'[Pediu registro em] <= d) + 0"].join('\n'), FORMATO.inteiro,
    'Conta as aberturas da coorte cuja empresa pediu registro no Crea-SP entre 30 dias antes e 180 dias depois da abertura, até a data.'),
  medida(D, 'Empresas novas que pediram registro', 'DIVIDE([Aberturas que pediram registro], [Aberturas da coorte])', FORMATO.parte, 'Mostra a parte das aberturas de engenharia na Receita cuja empresa pediu registro em até 180 dias.'),
  medida(D, 'Pedidos de registro de profissional', naJanela('24', contarProtocolos("'Protocolos'[Pedido de registro de profissional] = 1")), FORMATO.inteiro, 'Conta os pedidos de registro de profissional (com diploma ou com atestado) abertos em cada mês.'),
  medida(D, 'Concluintes do ano anterior', [COM_DATA, "RETURN CALCULATE(SUM('Concluintes'[Concluintes]), 'Concluintes'[Ano] = YEAR(d) - 1) + 0"].join('\n'), FORMATO.inteiro, 'Soma os concluintes do INEP no ano anterior ao da data, pelas instituições do recorte.'),
  medida(D, 'Formados registrados do ano anterior', [COM_DATA, "RETURN CALCULATE(COUNTROWS('Formados registrados'), 'Formados registrados'[Ano de conclusão] = YEAR(d) - 1, 'Formados registrados'[Registro em] <= d) + 0"].join('\n'), FORMATO.inteiro,
    'Conta os profissionais que concluíram o curso no ano anterior ao da data e já se registraram até ela.'),
  medida(D, 'Formados do ano anterior já registrados', 'DIVIDE([Formados registrados do ano anterior], [Concluintes do ano anterior])', FORMATO.parte, 'Mostra a parte dos concluintes do ano anterior que já se registrou no Crea-SP.'),
  medida(D, 'Protocolos de ART no mês', naJanela('24', contarProtocolos("'Protocolos'[Serviço de ART] = 1")), FORMATO.inteiro, 'Conta os protocolos de baixa de ART por terceiros, cancelamento e regularização de ART abertos em cada mês.'),
  medida(D, 'ARTs registradas no mês', naJanela('24', "SUM('ARTs por mês'[ARTs]) + 0"), FORMATO.inteiro, 'Soma as ARTs registradas em cada mês, pelo município da matriz da empresa.'),
  medida(D, 'Protocolos de ART por 1.000 ARTs no mês', 'DIVIDE([Protocolos de ART no mês], [ARTs registradas no mês]) * 1000', '#,##0.0', 'Divide os protocolos de ART pelas ARTs registradas no mês, por 1.000.'),
  medida(D, 'Protocolos de ART por 1.000 ARTs', [COM_DATA, M0, `VAR protocolos = ${contarProtocolos("REMOVEFILTERS('Calendário')", "'Protocolos'[Serviço de ART] = 1", doze('Protocolos'))}`,
    `VAR arts = CALCULATE(SUM('ARTs por mês'[ARTs]), REMOVEFILTERS('Calendário'), ${doze('ARTs por mês')})`, 'RETURN DIVIDE(protocolos, arts) * 1000'].join('\n'), '#,##0.0',
    'Divide os protocolos de ART dos 12 meses até a data pelas ARTs registradas nos mesmos meses, por 1.000.'),
  medida(D, 'Pedidos de informação no ano', [COM_DATA, "RETURN CALCULATE(SUM('Ouvidoria e informação'[Quantidade]), 'Ouvidoria e informação'[Data] = d, 'Ouvidoria e informação'[Ano] = YEAR(d), 'Ouvidoria e informação'[Tipo] = \"Pedido de informação\")"].join('\n'), FORMATO.inteiro,
    'Conta os pedidos de acesso à informação (LAI) do ano da data até ela. É o Crea-SP inteiro: a regional não muda este número.'),
  medida(D, 'Pedidos de informação respondidos no prazo', [COM_DATA, "RETURN CALCULATE(SUM('Ouvidoria e informação'[Respondidos no prazo]), 'Ouvidoria e informação'[Data] = d, 'Ouvidoria e informação'[Ano] = YEAR(d))"].join('\n'), FORMATO.inteiro,
    'Conta os pedidos de informação do ano respondidos no prazo da lei (20 dias, prorrogáveis por 10).'),
  medida(D, 'Recursos dos pedidos de informação', [COM_DATA, "RETURN CALCULATE(SUM('Ouvidoria e informação'[Recursos]), 'Ouvidoria e informação'[Data] = d, 'Ouvidoria e informação'[Ano] = YEAR(d)) + 0"].join('\n'), FORMATO.inteiro, 'Conta os recursos aos pedidos de informação do ano.'),
  medida(D, 'Manifestações e pedidos', [COM_DATA, "RETURN CALCULATE(SUM('Ouvidoria e informação'[Quantidade]), 'Ouvidoria e informação'[Data] = d)"].join('\n'), FORMATO.inteiro,
    'Conta, em cada um dos cinco anos até a data, os pedidos de informação e as manifestações da ouvidoria por tipo.'),
];
