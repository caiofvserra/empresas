import type { Medida, Modelo, Tabela } from '../modelo';
import { COM_DATA, COM_PERIODO, FORMATO, MESES_NA_BASE, PASTA_PARAMETRO, cartao, data, filtrosExtras, inicioDe, inteiro, medida, medidasDeApoio, medidasDosCartoes, n, noMes, parte, reais, sinal, texto } from '../comum';
import type { Cartao } from '../comum';

/*
 * Modelo do painel de Gestão do Conselho no Power BI (refeito em 07/11/2026 com o colegiado): as tabelas de `dados.ts`, as relações
 * do esquema estrela e as medidas DAX dos cartões e gráficos das cinco páginas, em pastas com o nome de cada página. Os estoques
 * (a fila do Votenet, as cadeiras e os profissionais de cada câmara, os conselheiros em exercício) leem a data escolhida; os fluxos
 * (votados, relatos, sessões, autos, repasses, deliberações) somam o período (ADR 0002). `tests/powerbi-conselho.test.ts`
 * reproduz estas regras sobre os CSV e confere com `quadroColegiado`, a função das páginas.
 *
 * O colegiado escolhido chega aos processos pela relação com as tramitações. Nos conselheiros, nas diárias, nos autos, nas câmaras,
 * nos repasses e nas deliberações, a medida lê a escolha (`VAR c`): no Plenário estão todos os conselheiros e só os autos que
 * chegaram a ele em recurso. A regional e o município chegam aos processos e aos autos pelo lugar do processo.
 */
const PASTA = { apoio: 'Apoio', colegiado: 'Colegiado', processos: 'Processos', conselheiros: 'Conselheiros', decisoes: 'Decisões', representacao: 'Representação' } as const;

const tabelas: Tabela[] = [
  // Dimensões.
  { nome: 'Regionais', arquivo: 'regionais.csv', descricao: 'Tem uma linha para cada uma das 16 gerências regionais do Crea-SP.', colunas: [texto('GRE', { ordenarPor: 'Ordem' }), inteiro('Ordem', { oculta: true })] },
  { nome: 'Municípios', arquivo: 'municipios.csv', descricao: 'Tem os 645 municípios de SP e a GRE de cada um pela tabela oficial. A regional e o município recortam só os processos (e os autos, que são processos), pelo lugar do processo.',
    colunas: [texto('Código IBGE'), texto('Município'), texto('GRE')] },
  { nome: 'Colegiados', arquivo: 'colegiados.csv', descricao: 'Tem o Plenário e as nove câmaras especializadas, com os nomes do sistema do Conselho. Escolha um por vez.',
    colunas: [texto('Colegiado', { oculta: true }), texto('Nome', { ordenarPor: 'Ordem' }), inteiro('Ordem', { oculta: true })] },
  { nome: 'Calendário', arquivo: 'calendario.csv', descricao: 'Tem um mês por linha, de 2020 até 12 meses depois de hoje, para o gráfico mês a mês. Não se liga às outras tabelas: as medidas leem o mês do eixo.',
    colunas: [data('Mês', { formato: 'mmm/yy' }), texto('Rótulo', { ordenarPor: 'Mês' }), inteiro('Ano'), inteiro('Mês do ano', { oculta: true }), texto('Nome do mês', { ordenarPor: 'Mês do ano' }), inteiro('Ordem', { oculta: true })] },
  { nome: 'Datas de referência', arquivo: 'datas-referencia.csv', descricao: 'Tem os fins de mês em que a base pode ser lida, e hoje. Não se liga às outras tabelas: a escolha vale para todas as medidas.', colunas: [data('Data'), texto('Rótulo', { ordenarPor: 'Data' })] },
  { nome: 'Datas das fotos', arquivo: 'datas-das-fotos.csv', oculta: true, descricao: 'Tem todas as datas com foto, inclusive os meses antes da primeira data de referência. As medidas de variação a usam para ler o mesmo indicador um ano antes.', colunas: [data('Data')] },
  { nome: 'Período', calculada: `GENERATESERIES(1, ${MESES_NA_BASE}, 1)`, descricao: 'Guarda o número de meses somados nos fluxos, contados para trás a partir da data de referência. No Power BI Desktop, é um parâmetro do tipo "Intervalo numérico", de 1 a 36 meses.', colunas: [inteiro('Meses', { origem: '[Value]', parametro: true })] },
  { nome: 'Pessoas', arquivo: 'pessoas.csv', descricao: 'Tem quem pode estar com um processo: os conselheiros (com a câmara e a organização que indicou) e os funcionários da assessoria de cada colegiado. Os nomes do cenário são fictícios.',
    colunas: [texto('Pessoa', { oculta: true }), texto('Nome'), texto('Papel'), texto('Detalhe')] },

  // Processos.
  { nome: 'Tramitações', arquivo: 'tramitacoes.csv', descricao: 'Guarda cada passagem de um processo por um colegiado: a câmara (1ª instância) ou o Plenário, no recurso. Tem as datas do GovAdm (abertura, recebimento, recurso) e do Votenet (relato, voto), o relator e o tempo até o cadastro no Votenet.',
    colunas: [texto('Tramitação', { oculta: true }), texto('Processo'), texto('Colegiado', { oculta: true }), texto('Instância'), texto('Câmara de origem'), texto('Tipo'), texto('Código IBGE', { oculta: true }), data('Entrada'), data('Mês de entrada', { oculta: true }),
      data('Entrada do processo', { oculta: true }), data('Julgado na câmara em', { oculta: true }), data('Recurso em', { oculta: true }), data('Plenário em', { oculta: true }), data('Votado em'), data('Mês do voto', { oculta: true }), texto('Relator'),
      inteiro('Dias da abertura ao voto', { oculta: true }), data('Assinado em', { oculta: true }), inteiro('Dias de relato', { oculta: true }), sinal('Relato com IA'), sinal('Distribuído depois da IA'), texto('Trimestre do relato'),
      inteiro('Dias até o Votenet', { oculta: true }), texto('Tempo até o Votenet', { ordenarPor: 'Ordem do tempo até o Votenet' }), inteiro('Ordem do tempo até o Votenet', { oculta: true }), texto('Decisão do Plenário')] },
  { nome: 'Foto da fila', arquivo: 'foto-fila.csv', descricao: 'Guarda, no último dia de cada mês, cada processo esperando voto: o status do Votenet, com quem está, há quantos dias, o alerta (amarelo de 90 a 120 dias no status, vermelho acima de 120) e, nos autos de infração, se prescreve em até 12 meses.',
    colunas: [data('Data', { oculta: true }), texto('Tramitação', { oculta: true }), texto('Status', { ordenarPor: 'Ordem do status' }), inteiro('Ordem do status', { oculta: true }), texto('Pessoa', { oculta: true }), inteiro('Dias no status', { oculta: true }),
      texto('Tempo no status', { ordenarPor: 'Ordem do tempo' }), inteiro('Ordem do tempo', { oculta: true }), texto('Alerta', { ordenarPor: 'Ordem do alerta' }), inteiro('Ordem do alerta', { oculta: true }), inteiro('Dias desde a entrada', { oculta: true }),
      sinal('Mais de um ano'), sinal('De exercício anterior'), sinal('Perto da prescrição'), texto('Prazo da prescrição', { ordenarPor: 'Ordem do prazo' }), inteiro('Ordem do prazo', { oculta: true }), sinal('Pela intercorrente'), sinal('Parado há mais de dois anos'), reais('Multa')] },
  { nome: 'Eventos', arquivo: 'eventos.csv', oculta: true, descricao: 'Guarda cada ida à pauta e cada desvio do Votenet (pedido de vista, impedimento, diligência), com a data e a pessoa.', colunas: [texto('Tramitação'), texto('Status'), data('Desde'), data('Mês'), texto('Pessoa')] },

  // Conselheiros.
  { nome: 'Conselheiros', arquivo: 'conselheiros.csv', descricao: 'Guarda cada mandato de cada cadeira: três anos, de janeiro a dezembro, com um terço renovado por ano. O reeleito aparece num mandato novo com a mesma pessoa. Está em exercício quem tem mandato em curso, de organização já registrada.',
    colunas: [texto('Mandato', { oculta: true }), texto('Pessoa', { oculta: true }), texto('Nome'), texto('Gênero'), texto('Câmara'), texto('Organização', { oculta: true }), texto('Sigla'), texto('Natureza'), texto('Terço'), data('Início'), data('Fim'), data('Organização registrada em', { oculta: true })] },
  { nome: 'Presenças', arquivo: 'presencas.csv', oculta: true, descricao: 'Guarda, em cada sessão ordinária, cada conselheiro do colegiado e se esteve presente (pela ata).', colunas: [texto('Sessão'), data('Data'), texto('Colegiado'), texto('Pessoa'), sinal('Presente')] },
  { nome: 'Diárias', arquivo: 'diarias.csv', oculta: true, descricao: 'Guarda as diárias pagas a cada conselheiro em cada mês, pela contabilidade.', colunas: [data('Mês'), texto('Pessoa'), inteiro('Diárias'), reais('Valor')] },

  // Decisões.
  { nome: 'Autos', arquivo: 'autos.csv', descricao: 'Guarda cada auto de infração votado na câmara: o desfecho, a infração (alínea do art. 73 da Lei 5.194/66), a multa da câmara e a que vale depois do Plenário, e as datas do recurso ao Plenário e ao Confea, do trânsito em julgado e do pagamento.',
    colunas: [texto('Processo'), texto('Câmara'), texto('Código IBGE', { oculta: true }), data('Julgado em'), inteiro('Ano da decisão'), texto('Desfecho', { ordenarPor: 'Ordem do desfecho' }), inteiro('Ordem do desfecho', { oculta: true }), texto('Infração'), sinal('Reincidente'),
      reais('Multa da câmara'), reais('Multa final'), data('Recurso ao Plenário em', { oculta: true }), data('Plenário em', { oculta: true }), data('Recurso ao Confea em', { oculta: true }), data('Trânsito em julgado', { oculta: true }), data('Pago em', { oculta: true })] },

  // Representação.
  { nome: 'Foto das câmaras', arquivo: 'foto-camaras.csv', descricao: 'Guarda, no último dia de cada mês, as cadeiras de cada câmara no Plenário e os profissionais ativos (e as profissionais ativas) da modalidade que ela julga.',
    colunas: [data('Data', { oculta: true }), texto('Câmara'), inteiro('Cadeiras', { oculta: true }), inteiro('Profissionais ativos', { oculta: true }), inteiro('Profissionais ativas', { oculta: true })] },
  { nome: 'Organizações', arquivo: 'organizacoes.csv', descricao: 'Tem as entidades de classe e as instituições de ensino registradas no Crea-SP.', colunas: [texto('Organização', { oculta: true }), texto('Sigla'), texto('Nome'), texto('Natureza')] },
  { nome: 'Pagamentos dos repasses', arquivo: 'pagamentos-repasses.csv', descricao: 'Guarda cada pagamento de convênio, contrato ou patrocínio às organizações, com o canal e o início do instrumento.',
    colunas: [texto('Repasse', { oculta: true }), texto('Organização', { oculta: true }), texto('Canal'), data('Início do repasse', { oculta: true }), data('Data', { oculta: true }), reais('Valor')] },
  { nome: 'Deliberações', arquivo: 'deliberacoes.csv', descricao: 'Guarda cada deliberação de repasse aprovada pelo Plenário, pela ata: a organização, o valor, o objeto, quem propôs e se quem propôs foi indicado pela própria organização.',
    colunas: [texto('Deliberação', { oculta: true }), data('Data'), texto('Canal'), texto('Organização', { oculta: true }), texto('Nome da organização'), reais('Valor'), texto('Objeto'), texto('Proposta por'), sinal('Proposta pela própria organização'), texto('Quem propôs é da organização')] },
];

/* ---------- Pedaços de DAX ---------- */
const dias = '#,##0" dias"';
const rs = (expressao: string) => `FORMAT(${expressao}, "R$ #,##0")`;
const extras = (lista: string[]) => filtrosExtras(lista.map(filtro => `KEEPFILTERS(${filtro})`));
/** O colegiado escolhido (vazio sem escolha). */
const COM_COLEGIADO = "VAR c = SELECTEDVALUE('Colegiados'[Colegiado])";
/** A fila do Votenet na data escolhida. */
const naFila = (expressao: string, ...extra: string[]) => `${COM_DATA}\nRETURN CALCULATE(${expressao}, 'Foto da fila'[Data] = d${extras(extra)})`;
const FILA = (...extra: string[]) => `${naFila("COUNTROWS('Foto da fila')", ...extra)} + 0`;
/** Uma coluna de data de um fato dentro do período escolhido. */
const noPeriodo = (tabela: string, quando: string, expressao: string, ...extra: string[]) => `${COM_PERIODO}\nRETURN CALCULATE(${expressao}, '${tabela}'[${quando}] >= inicio, '${tabela}'[${quando}] <= d${extras(extra)})`;
const contar = (tabela: string, quando: string, ...extra: string[]) => `${noPeriodo(tabela, quando, `COUNTROWS('${tabela}')`, ...extra)} + 0`;
/** Os conselheiros em exercício na data, do colegiado escolhido (no Plenário, todos). */
const NO_MANDATO = "'Conselheiros'[Início] <= d, 'Conselheiros'[Fim] >= d, 'Conselheiros'[Organização registrada em] <= d, KEEPFILTERS(ISBLANK(c) || c = \"Plenário\" || 'Conselheiros'[Câmara] = c)";
const membros = (expressao: string, ...extra: string[]) => `${COM_DATA}\n${COM_COLEGIADO}\nRETURN CALCULATE(${expressao}, ${NO_MANDATO}${extras(extra)})`;
const ORGANIZACOES_COM_CADEIRA = `VAR orgs = CALCULATETABLE(VALUES('Conselheiros'[Organização]), ${NO_MANDATO})`;
/** Os autos do recorte: os da câmara escolhida ou, no Plenário, os que chegaram a ele em recurso até a data. */
const AUTOS_DO_COLEGIADO = "KEEPFILTERS(FILTER(ALL('Autos'[Câmara], 'Autos'[Recurso ao Plenário em]), ISBLANK(c) || 'Autos'[Câmara] = c || (c = \"Plenário\" && NOT ISBLANK('Autos'[Recurso ao Plenário em]) && 'Autos'[Recurso ao Plenário em] <= d)))";
const autos = (expressao: string, ...extra: string[]) => `${COM_PERIODO}\n${COM_COLEGIADO}\nRETURN CALCULATE(${expressao}, 'Autos'[Julgado em] >= inicio, 'Autos'[Julgado em] <= d, ${AUTOS_DO_COLEGIADO}${extras(extra)})`;
/** Um marco dos autos do recorte no período (recurso ao Confea, trânsito, pagamento): o caminho do processo. */
const marcoDosAutos = (quando: string) => `${COM_PERIODO}\n${COM_COLEGIADO}\nRETURN CALCULATE(COUNTROWS('Autos'), 'Autos'[${quando}] >= inicio, 'Autos'[${quando}] <= d, ${AUTOS_DO_COLEGIADO}) + 0`;
/** Um marco do processo no período, contando cada processo uma vez, dos que já chegaram ao colegiado na data. */
const marcoDoProcesso = (quando: string) => `${COM_PERIODO}\nRETURN CALCULATE(DISTINCTCOUNT('Tramitações'[Processo]), 'Tramitações'[Entrada] <= d, 'Tramitações'[${quando}] >= inicio, 'Tramitações'[${quando}] <= d) + 0`;
/** O destino de cada multa na data: anulada no recurso, paga, em cobrança (transitou) ou ainda em recurso. */
const ANULADA = "'Autos'[Multa final] = 0 && NOT ISBLANK('Autos'[Plenário em]) && 'Autos'[Plenário em] <= d";
const PAGA = "NOT ISBLANK('Autos'[Pago em]) && 'Autos'[Pago em] <= d";
const TRANSITOU = "NOT ISBLANK('Autos'[Trânsito em julgado]) && 'Autos'[Trânsito em julgado] <= d";
const destino = (condicao: string) => [COM_DATA, COM_COLEGIADO,
  `RETURN SUMX(FILTER(CALCULATETABLE('Autos', 'Autos'[Julgado em] <= d, 'Autos'[Ano da decisão] >= YEAR(d) - 3, 'Autos'[Multa da câmara] > 0, ${AUTOS_DO_COLEGIADO}), ${condicao}), 'Autos'[Multa da câmara])`].join('\n');
/** As diárias pagas nos 12 meses até a data aos conselheiros em exercício nela, do colegiado escolhido. */
const diariasDosConselheiros = (expressao: string) => `${COM_DATA}\n${COM_COLEGIADO}\nVAR quem = CALCULATETABLE(VALUES('Conselheiros'[Pessoa]), ${NO_MANDATO})\nRETURN CALCULATE(${expressao}, 'Diárias'[Mês] >= ${inicioDe('12')}, 'Diárias'[Mês] <= d, KEEPFILTERS('Diárias'[Pessoa] IN quem))`;
/** Os pagamentos dos 365 dias até a data às organizações com cadeira no colegiado escolhido. */
const repassesComCadeira = (expressao: string) => `${COM_DATA}\n${COM_COLEGIADO}\n${ORGANIZACOES_COM_CADEIRA}\nRETURN CALCULATE(${expressao}, 'Pagamentos dos repasses'[Data] > d - 365, 'Pagamentos dos repasses'[Data] <= d, 'Pagamentos dos repasses'[Início do repasse] <= d, KEEPFILTERS('Pagamentos dos repasses'[Organização] IN orgs))`;
/** As deliberações do período: no Plenário, todas; numa câmara, as de organizações com cadeira nela. */
const deliberacoes = (expressao: string, ...extra: string[]) => `${COM_PERIODO}\n${COM_COLEGIADO}\n${ORGANIZACOES_COM_CADEIRA}\nRETURN CALCULATE(${expressao}, 'Deliberações'[Data] >= inicio, 'Deliberações'[Data] <= d, KEEPFILTERS(ISBLANK(c) || c = "Plenário" || 'Deliberações'[Organização] IN orgs)${extras(extra)})`;
/** As cadeiras e os profissionais de cada câmara na data, só da câmara escolhida. */
const daCamara = (coluna: string) => `${COM_DATA}\n${COM_COLEGIADO}\nRETURN CALCULATE(SUM('Foto das câmaras'[${coluna}]), 'Foto das câmaras'[Data] = d, KEEPFILTERS(ISBLANK(c) || c = "Plenário" || 'Foto das câmaras'[Câmara] = c))`;
const pct = (parteDe: string, todo: string) => `IF(${todo} > 0, ${parte(`DIVIDE(${parteDe}, ${todo})`)}, "—")`;
const diasOu = (expressao: string) => `IF(ISBLANK(${expressao}), "—", FORMAT(${expressao}, "#,##0") & " dias")`;

/* ---------- Cartões ---------- */
const [doColegiado, dosProcessos, dosConselheiros, dasDecisoes, daRepresentacao] = [cartao(PASTA.colegiado), cartao(PASTA.processos), cartao(PASTA.conselheiros), cartao(PASTA.decisoes), cartao(PASTA.representacao)];
const MAIOR = `VAR t = TOPN(1, ADDCOLUMNS(CALCULATETABLE(VALUES('Pessoas'[Nome]), 'Pessoas'[Papel] = "Conselheiro"), "N", [Processos na fila]), [N], DESC, 'Pessoas'[Nome], ASC)
RETURN IF(MAXX(t, [N]) > 0, "o maior: " & MAXX(t, 'Pessoas'[Nome]) & ", com " & ${n('MAXX(t, [N])')}, "nenhum processo com conselheiro")`;
/** Os cartões de cada página, com a comparação e a linha de apoio do painel. `paginas.ts` monta os cartões daqui. */
export const CARTOES = {
  colegiado: [
    doColegiado('Conselheiros em exercício', undefined, `"indicados por " & ${n('[Entidades com cadeira]')} & " entidades de classe e " & ${n('[Escolas com cadeira]')} & " escolas"`),
    doColegiado('Processos esperando voto', { serie: 'estoque' }, `${n('[Aguardando distribuição]')} & " ainda aguardam distribuição"`),
    doColegiado('Processos por conselheiro', undefined, MAIOR),
    doColegiado('Votados no período', { serie: 'fluxo' }, `${n('[Votados no Plenário no período]')} & " deles no Plenário, em recurso"`),
    doColegiado('Da abertura à decisão', { serie: 'fluxo' }, '"mediana dos votados na câmara, da abertura no GovAdm"'),
    doColegiado('De exercícios anteriores', undefined, `${COM_DATA}\nRETURN ${pct('[De exercícios anteriores]', '[Processos esperando voto]')} & " dos pendentes entraram antes de " & YEAR(d)`),
  ],
  processos: [
    dosProcessos('Em alerta vermelho', undefined, `"mais de 120 dias no mesmo status, e " & ${n('[Em alerta amarelo]')} & " em amarelo (90 a 120)"`),
    dosProcessos('Há mais de 1 ano no colegiado', undefined, `${pct('[Há mais de 1 ano no colegiado]', '[Processos esperando voto]')} & " dos que esperam voto"`),
    dosProcessos('Autos perto da prescrição', undefined, `${rs('[Multas dos autos perto da prescrição]')} & " em multas; " & ${n('[Perto da prescrição pela intercorrente]')} & " por três anos parados"`),
    dosProcessos('Parados há mais de 2 anos', undefined, '"no mesmo status; com 3 anos, o auto prescreve"'),
    dosProcessos('Do GovAdm ao Votenet', undefined, `"mediana; " & ${pct('[Cadastrados no Votenet depois de 15 dias]', '[Cadastrados no Votenet]')} & " levaram mais de 15 dias"`),
  ],
  conselheiros: [
    dosConselheiros('Presença nas sessões', { serie: 'taxa' }, `${n('[Sessões no período]')} & " sessões ordinárias no período"`),
    dosConselheiros('Tempo de relato', { serie: 'fluxo' }, '"mediana, da distribuição ao relato assinado"'),
    dosConselheiros('Relato com IA', undefined, `"sem IA: " & ${diasOu('[Relato sem IA]')} & "; " & ${pct('[Relatos com IA]', '[Relatos com IA] + [Relatos sem IA]')} & " dos relatos usaram IA"`),
    dosConselheiros('Pedidos de vista', { serie: 'fluxo' }, '"processos que saíram da pauta para outro conselheiro ler"'),
    dosConselheiros('Diárias dos conselheiros', undefined, `VAR k = [Conselheiros com diária]\nRETURN ${n('k')} & IF(k = 1, " conselheiro recebeu", " conselheiros receberam") & " em 12 meses"`),
  ],
  decisoes: [
    dasDecisoes('Autos votados nas câmaras', undefined, `${n('[Autos de reincidentes]')} & " de reincidentes, com a multa em dobro"`),
    dasDecisoes('Multas aplicadas', { serie: 'fluxo' }, '"na decisão da câmara, antes do recurso"'),
    dasDecisoes('Autos arquivados', undefined, `"dos votados; " & ${n('[Autos arquivados pela prescrição]')} & " pela prescrição"`),
    dasDecisoes('Recursos esperando o Plenário', { serie: 'estoque' }, '"decisões das câmaras levadas ao Plenário"'),
    dasDecisoes('Reformadas pelo Plenário', undefined, `"dos " & ${n('[Recursos votados pelo Plenário]')} & " recursos votados no período"`),
  ],
  representacao: [
    daRepresentacao('Cadeiras ocupadas', undefined, `"por " & ${n('[Organizações com cadeira]')} & " organizações: " & ${n('[Entidades com cadeira]')} & " entidades e " & ${n('[Escolas com cadeira]')} & " escolas"`),
    daRepresentacao('Conselheiras', undefined, `${n('[Conselheiras em exercício]')} & " mulheres; no registro, elas são " & ${parte('[Mulheres no registro]')}`),
    daRepresentacao('Repasses a quem tem cadeira', undefined, `"em 12 meses, a " & ${n('[Organizações com cadeira que receberam]')} & " das " & ${n('[Organizações com cadeira]')} & " organizações"`),
    daRepresentacao('Deliberações de repasse', { serie: 'fluxo' }, `${rs('[Valor das deliberações]')} & " aprovados pelo Plenário no período"`),
    daRepresentacao('Propostos pela própria organização', undefined, '"o conselheiro propôs repasse à organização que o indicou"'),
  ],
} satisfies Record<string, Cartao[]>;

/* ---------- Medidas ---------- */
const P = PASTA;
const medidas: Medida[] = [
  ...medidasDeApoio(P.apoio),

  // Colegiado.
  medida(P.colegiado, 'Conselheiros no terço', membros("COUNTROWS('Conselheiros')"), FORMATO.inteiro, 'Conta os conselheiros em exercício na data escolhida (mandato em curso, de organização já registrada), do colegiado escolhido; no Plenário, todos. Sem o + 0, para o gráfico dos terços mostrar só os terços em curso.'),
  medida(P.colegiado, 'Conselheiros em exercício', '[Conselheiros no terço] + 0', FORMATO.inteiro, 'Conta os conselheiros em exercício na data escolhida, do colegiado escolhido; no Plenário, todos. O conselheiro representa uma modalidade, e não uma regional: a regional e o município não mudam este número.'),
  medida(P.colegiado, 'Entidades com cadeira', `${membros("DISTINCTCOUNT('Conselheiros'[Organização])", "'Conselheiros'[Natureza] = \"Entidade de classe\"")} + 0`, FORMATO.inteiro, 'Conta as entidades de classe que indicaram os conselheiros em exercício.'),
  medida(P.colegiado, 'Escolas com cadeira', `${membros("DISTINCTCOUNT('Conselheiros'[Organização])", "'Conselheiros'[Natureza] = \"Instituição de ensino\"")} + 0`, FORMATO.inteiro, 'Conta as instituições de ensino que indicaram os conselheiros em exercício.'),
  medida(P.colegiado, 'Processos na fila', naFila("COUNTROWS('Foto da fila')"), FORMATO.inteiro, 'Conta os processos esperando voto na data escolhida, para os gráficos (sem o + 0, a pessoa ou o status sem processo some do gráfico).'),
  medida(P.colegiado, 'Processos esperando voto', '[Processos na fila] + 0', FORMATO.inteiro, 'Conta os processos que já entraram no colegiado e ainda não foram votados na data escolhida, em qualquer status do Votenet. É um estoque: não tem acumulado do ano.'),
  medida(P.colegiado, 'Aguardando distribuição', FILA("'Foto da fila'[Status] = \"Aguardando distribuição\""), FORMATO.inteiro, 'Conta os processos esperando voto que ainda não foram distribuídos a um relator.'),
  medida(P.colegiado, 'Processos por conselheiro', "DIVIDE(CALCULATE([Processos esperando voto], 'Pessoas'[Papel] = \"Conselheiro\"), [Conselheiros em exercício])", '0.0', 'Divide os processos esperando voto que estão com um conselheiro (relator ou pedido de vista) pelos conselheiros em exercício. Os que estão com a assessoria ficam de fora.'),
  medida(P.colegiado, 'Votados no período', contar('Tramitações', 'Votado em'), FORMATO.inteiro, 'Conta os processos votados no período, nas câmaras e no Plenário. Um processo que foi ao Plenário conta duas vezes: uma em cada colegiado.'),
  medida(P.colegiado, 'Votados no Plenário no período', contar('Tramitações', 'Votado em', "'Tramitações'[Instância] = \"Plenário\""), FORMATO.inteiro, 'Conta os recursos votados pelo Plenário no período.'),
  medida(P.colegiado, 'Da abertura à decisão', noPeriodo('Tramitações', 'Votado em', "MEDIAN('Tramitações'[Dias da abertura ao voto])"), dias, 'Mostra o tempo típico (a mediana), em dias, da abertura no GovAdm ao voto da câmara, nos processos votados nas câmaras no período. É o marco do Confea para a 1ª instância.'),
  medida(P.colegiado, 'De exercícios anteriores', FILA("'Foto da fila'[De exercício anterior] = 1"), FORMATO.inteiro, 'Conta os processos esperando voto que entraram no colegiado antes de 1º de janeiro do ano da data escolhida: os pendentes de exercícios anteriores, marco do Confea.'),
  medida(P.colegiado, 'Pautados no mês', noMes("CALCULATE(COUNTROWS('Eventos'), 'Eventos'[Status] = \"Pautado\", 'Eventos'[Mês] = mes, 'Eventos'[Desde] <= d) + 0"), FORMATO.inteiro, 'Conta as idas à pauta em cada mês, nos meses do gráfico. Um processo pautado de novo depois de uma vista conta outra vez.'),
  medida(P.colegiado, 'Votados no mês', noMes("CALCULATE(COUNTROWS('Tramitações'), 'Tramitações'[Mês do voto] = mes, 'Tramitações'[Votado em] <= d) + 0"), FORMATO.inteiro, 'Conta os processos votados em cada mês, nos meses do gráfico.'),
  medida(P.colegiado, 'Votados no mesmo mês do ano anterior', noMes("CALCULATE(COUNTROWS('Tramitações'), 'Tramitações'[Mês do voto] = EDATE(mes, -12)) + 0"), FORMATO.inteiro, 'Conta os processos votados no mesmo mês um ano antes, para comparar.'),
  medida(P.colegiado, 'Caminho: recebidos nas câmaras', marcoDoProcesso('Entrada do processo'), FORMATO.inteiro, 'Conta os processos recebidos nas câmaras no período (o recebimento no GovAdm).'),
  medida(P.colegiado, 'Caminho: votados nas câmaras', marcoDoProcesso('Julgado na câmara em'), FORMATO.inteiro, 'Conta os processos votados pelas câmaras no período.'),
  medida(P.colegiado, 'Caminho: recursos ao Plenário', marcoDoProcesso('Recurso em'), FORMATO.inteiro, 'Conta os recursos ao Plenário apresentados no período.'),
  medida(P.colegiado, 'Caminho: votados no Plenário', marcoDoProcesso('Plenário em'), FORMATO.inteiro, 'Conta os recursos votados pelo Plenário no período.'),
  medida(P.colegiado, 'Caminho: recursos ao Confea', marcoDosAutos('Recurso ao Confea em'), FORMATO.inteiro, 'Conta os autos com recurso ao Confea no período.'),
  medida(P.colegiado, 'Caminho: transitados em julgado', marcoDosAutos('Trânsito em julgado'), FORMATO.inteiro, 'Conta os autos que transitaram em julgado no período: a multa passa a ser cobrada.'),
  medida(P.colegiado, 'Caminho: multas pagas', marcoDosAutos('Pago em'), FORMATO.inteiro, 'Conta os autos com a multa paga no período.'),

  // Processos.
  medida(P.processos, 'Em alerta vermelho', FILA("'Foto da fila'[Alerta] = \"Vermelho\""), FORMATO.inteiro, 'Conta os processos há mais de 120 dias no mesmo status do Votenet na data escolhida (decisão do Caio, 07/11/2026).'),
  medida(P.processos, 'Em alerta amarelo', FILA("'Foto da fila'[Alerta] = \"Amarelo\""), FORMATO.inteiro, 'Conta os processos de 90 a 120 dias no mesmo status do Votenet.'),
  medida(P.processos, 'Há mais de 1 ano no colegiado', FILA("'Foto da fila'[Mais de um ano] = 1"), FORMATO.inteiro, 'Conta os processos esperando voto que entraram no colegiado há mais de um ano.'),
  medida(P.processos, 'Perto da prescrição', naFila("COUNTROWS('Foto da fila')", "'Foto da fila'[Perto da prescrição] = 1"), FORMATO.inteiro, 'Conta os autos perto da prescrição, para o gráfico por relator.'),
  medida(P.processos, 'Autos perto da prescrição', '[Perto da prescrição] + 0', FORMATO.inteiro,
    'Conta os autos de infração esperando voto que prescrevem em até 12 meses: cinco anos do fato (Lei 9.873/1999, art. 1º) ou três anos parados no mesmo status (a intercorrente, art. 1º, § 1º), o que vier primeiro. No Plenário, só corre a intercorrente.'),
  medida(P.processos, 'Multas dos autos perto da prescrição', `${naFila("SUM('Foto da fila'[Multa])", "'Foto da fila'[Perto da prescrição] = 1")} + 0`, FORMATO.reais, 'Soma as multas dos autos que prescrevem em até 12 meses.'),
  medida(P.processos, 'Perto da prescrição pela intercorrente', FILA("'Foto da fila'[Pela intercorrente] = 1"), FORMATO.inteiro, 'Conta os autos que prescrevem em até 12 meses por estarem parados há quase três anos no mesmo status.'),
  medida(P.processos, 'Parados há mais de 2 anos', FILA("'Foto da fila'[Parado há mais de dois anos] = 1"), FORMATO.inteiro, 'Conta os processos há mais de dois anos no mesmo status: com três, o auto prescreve pela intercorrente.'),
  medida(P.processos, 'Dias no status', naFila("MAX('Foto da fila'[Dias no status])"), FORMATO.inteiro, 'Mostra há quantos dias o processo está no status do Votenet, na data escolhida.'),
  medida(P.processos, 'Dias desde a entrada', naFila("MAX('Foto da fila'[Dias desde a entrada])"), FORMATO.inteiro, 'Mostra há quantos dias o processo entrou no colegiado, na data escolhida.'),
  medida(P.processos, 'Cadastrados no Votenet', noPeriodo('Tramitações', 'Entrada', "COUNTROWS('Tramitações')", "'Tramitações'[Instância] = \"Câmara\""), FORMATO.inteiro, 'Conta os processos recebidos nas câmaras no período, que a assessoria cadastra à mão no Votenet.'),
  medida(P.processos, 'Cadastrados no Votenet depois de 15 dias', `${noPeriodo('Tramitações', 'Entrada', "COUNTROWS('Tramitações')", "'Tramitações'[Instância] = \"Câmara\"", "'Tramitações'[Dias até o Votenet] > 15")} + 0`, FORMATO.inteiro, 'Conta os recebidos no período que levaram mais de 15 dias até o cadastro no Votenet.'),
  medida(P.processos, 'Do GovAdm ao Votenet', noPeriodo('Tramitações', 'Entrada', "MEDIAN('Tramitações'[Dias até o Votenet])", "'Tramitações'[Instância] = \"Câmara\""), dias, 'Mostra o tempo típico (a mediana), em dias, entre o recebimento na câmara pelo GovAdm e o cadastro no Votenet, nos processos recebidos no período.'),

  // Conselheiros.
  medida(P.conselheiros, 'Sessões no período', `${noPeriodo('Presenças', 'Data', "DISTINCTCOUNT('Presenças'[Sessão])")} + 0`, FORMATO.inteiro, 'Conta as sessões ordinárias do colegiado escolhido no período.'),
  medida(P.conselheiros, 'Presença nas sessões', `${COM_PERIODO}\nVAR presentes = CALCULATE(SUM('Presenças'[Presente]), 'Presenças'[Data] >= inicio, 'Presenças'[Data] <= d)\nVAR lugares = CALCULATE(COUNTROWS('Presenças'), 'Presenças'[Data] >= inicio, 'Presenças'[Data] <= d)\nRETURN DIVIDE(presentes, lugares)`, FORMATO.parte,
    'Divide as presenças pelos lugares nas sessões ordinárias do período (cada conselheiro do colegiado em cada sessão), pela ata. Na base real, até a API de transparência publicar as atas, o jeton pago aproxima a presença.'),
  medida(P.conselheiros, 'Tempo de relato', noPeriodo('Tramitações', 'Assinado em', "MEDIAN('Tramitações'[Dias de relato])"), dias, 'Mostra o tempo típico (a mediana), em dias, da distribuição ao relator ao relato assinado, nos relatos assinados no período antes do voto.'),
  medida(P.conselheiros, 'Relato com IA', noPeriodo('Tramitações', 'Assinado em', "MEDIAN('Tramitações'[Dias de relato])", "'Tramitações'[Relato com IA] = 1"), dias, 'Mostra o tempo típico de relato dos relatos feitos com a IA no período.'),
  medida(P.conselheiros, 'Relato sem IA', noPeriodo('Tramitações', 'Assinado em', "MEDIAN('Tramitações'[Dias de relato])", "'Tramitações'[Relato com IA] = 0", "'Tramitações'[Distribuído depois da IA] = 1"), dias, 'Mostra o tempo típico de relato dos relatos sem IA, só dos processos distribuídos depois que a IA chegou (julho de 2025), para comparar.'),
  medida(P.conselheiros, 'Relatos com IA', `${noPeriodo('Tramitações', 'Assinado em', "COUNT('Tramitações'[Dias de relato])", "'Tramitações'[Relato com IA] = 1")} + 0`, FORMATO.inteiro, 'Conta os relatos feitos com a IA no período.'),
  medida(P.conselheiros, 'Relatos sem IA', `${noPeriodo('Tramitações', 'Assinado em', "COUNT('Tramitações'[Dias de relato])", "'Tramitações'[Relato com IA] = 0", "'Tramitações'[Distribuído depois da IA] = 1")} + 0`, FORMATO.inteiro, 'Conta os relatos sem IA no período, dos processos distribuídos depois que a IA chegou.'),
  medida(P.conselheiros, 'Relato com IA no trimestre', `${COM_DATA}\nRETURN CALCULATE(MEDIAN('Tramitações'[Dias de relato]), 'Tramitações'[Assinado em] <= d, 'Tramitações'[Relato com IA] = 1, 'Tramitações'[Distribuído depois da IA] = 1)`, dias, 'Mostra o tempo típico de relato com IA em cada trimestre do eixo, até a data escolhida.'),
  medida(P.conselheiros, 'Relato sem IA no trimestre', `${COM_DATA}\nRETURN CALCULATE(MEDIAN('Tramitações'[Dias de relato]), 'Tramitações'[Assinado em] <= d, 'Tramitações'[Relato com IA] = 0, 'Tramitações'[Distribuído depois da IA] = 1)`, dias, 'Mostra o tempo típico de relato sem IA em cada trimestre do eixo, dos processos distribuídos depois que a IA chegou.'),
  medida(P.conselheiros, 'Pedidos de vista', `${noPeriodo('Eventos', 'Desde', "DISTINCTCOUNT('Eventos'[Tramitação])", "'Eventos'[Status] = \"Pedido de vista\"")} + 0`, FORMATO.inteiro, 'Conta os processos com pedido de vista no período: saíram da pauta para outro conselheiro ler.'),
  medida(P.conselheiros, 'Impedimentos', `${noPeriodo('Eventos', 'Desde', "DISTINCTCOUNT('Eventos'[Tramitação])", "'Eventos'[Status] = \"Impedimento\"")} + 0`, FORMATO.inteiro, 'Conta os processos em que o relator se declarou impedido no período: o processo volta à distribuição.'),
  medida(P.conselheiros, 'Diligências', `${noPeriodo('Eventos', 'Desde', "DISTINCTCOUNT('Eventos'[Tramitação])", "'Eventos'[Status] = \"Diligência\"")} + 0`, FORMATO.inteiro, 'Conta os processos que saíram em diligência no período, para buscar informação antes do voto.'),
  medida(P.conselheiros, 'Processos com o conselheiro', "CALCULATE([Processos na fila], 'Pessoas'[Papel] = \"Conselheiro\")", FORMATO.inteiro, 'Conta os processos esperando voto que estão com cada conselheiro na data escolhida, como relator ou no pedido de vista.'),
  medida(P.conselheiros, 'Valor das diárias de conselheiros', diariasDosConselheiros("SUM('Diárias'[Valor])"), FORMATO.reais, 'Soma as diárias pagas nos 12 meses até a data a cada conselheiro em exercício nela, do colegiado escolhido.'),
  medida(P.conselheiros, 'Diárias dos conselheiros', '[Valor das diárias de conselheiros] + 0', FORMATO.reais, 'Soma as diárias pagas nos 12 meses até a data aos conselheiros em exercício nela, do colegiado escolhido. Quem recebeu aparece pelo nome na tabela.'),
  medida(P.conselheiros, 'Diárias de conselheiros em 12 meses', diariasDosConselheiros("SUM('Diárias'[Diárias])"), FORMATO.inteiro, 'Conta as diárias pagas a cada conselheiro nos 12 meses.'),
  medida(P.conselheiros, 'Meses com diária de conselheiro', diariasDosConselheiros("DISTINCTCOUNT('Diárias'[Mês])"), '0', 'Conta os meses dos 12 em que o conselheiro recebeu diária.'),
  medida(P.conselheiros, 'Conselheiros com diária', `${diariasDosConselheiros("DISTINCTCOUNT('Diárias'[Pessoa])")} + 0`, FORMATO.inteiro, 'Conta os conselheiros em exercício que receberam diária nos 12 meses.'),

  // Decisões.
  medida(P.decisoes, 'Autos votados', autos("COUNTROWS('Autos')"), FORMATO.inteiro, 'Conta os autos de infração votados pelas câmaras no período, para os gráficos.'),
  medida(P.decisoes, 'Autos votados nas câmaras', '[Autos votados] + 0', FORMATO.inteiro, 'Conta os autos de infração votados pelas câmaras no período. Com o Plenário escolhido, só os autos que chegaram a ele em recurso.'),
  medida(P.decisoes, 'Autos de reincidentes', `${autos("COUNTROWS('Autos')", "'Autos'[Reincidente] = 1")} + 0`, FORMATO.inteiro, 'Conta os autos votados de empresas ou profissionais que já tinham multa antes: a multa vem em dobro (Lei 5.194/66, art. 73, parágrafo único).'),
  medida(P.decisoes, 'Multas aplicadas', `${autos("SUM('Autos'[Multa da câmara])")} + 0`, FORMATO.reais, 'Soma as multas da decisão das câmaras no período, antes do recurso. É um fluxo.'),
  medida(P.decisoes, 'Autos arquivados pela prescrição', `${autos("COUNTROWS('Autos')", "'Autos'[Desfecho] = \"Arquivamento pela prescrição\"")} + 0`, FORMATO.inteiro, 'Conta os autos arquivados porque prescreveram.'),
  medida(P.decisoes, 'Autos arquivados no período', `${autos("COUNTROWS('Autos')", "'Autos'[Desfecho] IN {\"Arquivamento\", \"Arquivamento pela prescrição\"}")} + 0`, FORMATO.inteiro, 'Conta os autos votados no período que a câmara arquivou, inclusive pela prescrição.'),
  medida(P.decisoes, 'Autos arquivados', 'DIVIDE([Autos arquivados no período], [Autos votados])', FORMATO.parte, 'Mostra a parte dos autos votados no período que a câmara arquivou, inclusive pela prescrição.'),
  medida(P.decisoes, 'Recursos esperando o Plenário', FILA("'Tramitações'[Instância] = \"Plenário\""), FORMATO.inteiro, 'Conta os recursos que já chegaram ao Plenário e ainda não foram votados na data escolhida. É um estoque.'),
  medida(P.decisoes, 'Recursos votados pelo Plenário', contar('Tramitações', 'Votado em', "'Tramitações'[Instância] = \"Plenário\""), FORMATO.inteiro, 'Conta os recursos votados pelo Plenário no período.'),
  medida(P.decisoes, 'Recursos reformados pelo Plenário', contar('Tramitações', 'Votado em', "'Tramitações'[Instância] = \"Plenário\"", "'Tramitações'[Decisão do Plenário] = \"Decisão reformada\""), FORMATO.inteiro, 'Conta os recursos votados pelo Plenário no período em que ele reformou a decisão da câmara.'),
  medida(P.decisoes, 'Reformadas pelo Plenário', 'DIVIDE([Recursos reformados pelo Plenário], [Recursos votados pelo Plenário])', FORMATO.parte, 'Mostra a parte dos recursos votados pelo Plenário no período em que ele reformou a decisão da câmara.'),
  medida(P.decisoes, 'Recursos votados no Plenário por câmara', `${COM_PERIODO}\n${COM_COLEGIADO}\nRETURN CALCULATE(COUNTROWS('Tramitações'), REMOVEFILTERS('Colegiados'), 'Tramitações'[Instância] = "Plenário", 'Tramitações'[Votado em] >= inicio, 'Tramitações'[Votado em] <= d, KEEPFILTERS(ISBLANK(c) || c = "Plenário" || 'Tramitações'[Câmara de origem] = c))`, FORMATO.inteiro,
    'Conta os recursos votados pelo Plenário no período, pela câmara de onde vieram. Com uma câmara escolhida, só os dela.'),
  medida(P.decisoes, 'Multa paga', destino(`NOT (${ANULADA}) && ${PAGA}`), FORMATO.reais, 'Soma, pelo ano da decisão da câmara (os quatro últimos), as multas já pagas na data escolhida.'),
  medida(P.decisoes, 'Multa em cobrança', destino(`NOT (${ANULADA}) && NOT (${PAGA}) && ${TRANSITOU}`), FORMATO.reais, 'Soma, pelo ano da decisão, as multas que transitaram em julgado e ainda não foram pagas.'),
  medida(P.decisoes, 'Multa em recurso', destino(`NOT (${ANULADA}) && NOT (${PAGA}) && NOT (${TRANSITOU})`), FORMATO.reais, 'Soma, pelo ano da decisão, as multas ainda em recurso (no Plenário ou no Confea).'),
  medida(P.decisoes, 'Multa anulada no recurso', destino(ANULADA), FORMATO.reais, 'Soma, pelo ano da decisão, as multas que o Plenário anulou ao reformar a decisão da câmara.'),

  // Representação.
  medida(P.representacao, 'Cadeiras ocupadas', '[Conselheiros em exercício]', FORMATO.inteiro, 'Conta as cadeiras com conselheiro em exercício na data escolhida, do colegiado escolhido.'),
  medida(P.representacao, 'Organizações com cadeira', `${membros("DISTINCTCOUNT('Conselheiros'[Organização])")} + 0`, FORMATO.inteiro, 'Conta as organizações que indicaram os conselheiros em exercício.'),
  medida(P.representacao, 'Conselheiras em exercício', `${membros("COUNTROWS('Conselheiros')", "'Conselheiros'[Gênero] = \"Feminino\"")} + 0`, FORMATO.inteiro, 'Conta as mulheres entre os conselheiros em exercício.'),
  medida(P.representacao, 'Conselheiras', 'DIVIDE([Conselheiras em exercício], [Conselheiros em exercício])', FORMATO.parte, 'Mostra a parte de mulheres entre os conselheiros em exercício.'),
  medida(P.representacao, 'Mulheres entre os conselheiros', "VAR camaras = VALUES('Foto das câmaras'[Câmara])\nRETURN DIVIDE(CALCULATE([Conselheiras em exercício], TREATAS(camaras, 'Conselheiros'[Câmara])), CALCULATE([Conselheiros em exercício], TREATAS(camaras, 'Conselheiros'[Câmara])))", FORMATO.parte,
    'Mostra a parte de mulheres entre os conselheiros em exercício de cada câmara do eixo.'),
  medida(P.representacao, 'Profissionais ativos da câmara', daCamara('Profissionais ativos'), FORMATO.inteiro, 'Conta os profissionais ativos da modalidade que cada câmara julga, na data escolhida; com uma câmara escolhida, só os dela.'),
  medida(P.representacao, 'Profissionais ativas da câmara', daCamara('Profissionais ativas'), FORMATO.inteiro, 'Conta as mulheres entre os profissionais ativos da modalidade que cada câmara julga.'),
  medida(P.representacao, 'Mulheres no registro', 'DIVIDE([Profissionais ativas da câmara], [Profissionais ativos da câmara])', FORMATO.parte,
    'Mostra a parte de mulheres entre os profissionais ativos das modalidades que as câmaras do recorte julgam, na data escolhida. A Ambiental e Sanitária não tem modalidade própria no cenário.'),
  medida(P.representacao, 'Cadeiras da câmara', daCamara('Cadeiras'), FORMATO.inteiro, 'Conta as cadeiras de cada câmara no Plenário na data escolhida, pelas modalidades das entidades e escolas que as indicam.'),
  medida(P.representacao, 'Parte das cadeiras', `${COM_DATA}\nRETURN DIVIDE([Cadeiras da câmara], CALCULATE(SUM('Foto das câmaras'[Cadeiras]), 'Foto das câmaras'[Data] = d, REMOVEFILTERS('Foto das câmaras'[Câmara])))`, FORMATO.parte, 'Mostra a parte das cadeiras do Plenário que é de cada câmara.'),
  medida(P.representacao, 'Parte dos profissionais ativos', `${COM_DATA}\nRETURN DIVIDE([Profissionais ativos da câmara], CALCULATE(SUM('Foto das câmaras'[Profissionais ativos]), 'Foto das câmaras'[Data] = d, REMOVEFILTERS('Foto das câmaras'[Câmara])))`, FORMATO.parte,
    'Mostra a parte dos profissionais ativos que é da modalidade que cada câmara julga.'),
  medida(P.representacao, 'Repassado em 12 meses a quem tem cadeira', repassesComCadeira("SUM('Pagamentos dos repasses'[Valor])"), FORMATO.reais, 'Soma os pagamentos dos 365 dias até a data às organizações com cadeira no colegiado escolhido, por convênio, contrato ou patrocínio.'),
  medida(P.representacao, 'Repasses a quem tem cadeira', '[Repassado em 12 meses a quem tem cadeira] + 0', FORMATO.reais, 'Soma o que as organizações com cadeira no colegiado escolhido receberam do Conselho nos 365 dias até a data.'),
  medida(P.representacao, 'Organizações com cadeira que receberam', `${repassesComCadeira("DISTINCTCOUNT('Pagamentos dos repasses'[Organização])")} + 0`, FORMATO.inteiro, 'Conta as organizações com cadeira que receberam algum pagamento nos 365 dias.'),
  medida(P.representacao, 'Valor das deliberações', `${deliberacoes("SUM('Deliberações'[Valor])")}`, FORMATO.reais, 'Soma o valor das deliberações de repasse aprovadas pelo Plenário no período; na tabela, o valor de cada uma.'),
  medida(P.representacao, 'Deliberações de repasse', `${deliberacoes("COUNTROWS('Deliberações')")} + 0`, FORMATO.inteiro, 'Conta as deliberações de repasse aprovadas pelo Plenário no período, pelas atas. Com uma câmara escolhida, as de organizações com cadeira nela.'),
  medida(P.representacao, 'Propostos pela própria organização', `${deliberacoes("COUNTROWS('Deliberações')", "'Deliberações'[Proposta pela própria organização] = 1")} + 0`, FORMATO.inteiro, 'Conta as deliberações em que quem propôs o repasse é conselheiro indicado pela organização que recebe.'),

  ...medidasDosCartoes(CARTOES),
];

export const modeloConselho: Modelo = {
  nome: 'Conselho',
  parametros: [{ nome: PASTA_PARAMETRO, valor: 'C:\\CREA-SP\\powerbi\\conselho\\dados\\', descricao: 'Pasta onde estão os CSV do pacote (termina com \\). Troque em Transformar dados > Editar parâmetros e clique em Atualizar.' }],
  tabelas: [...tabelas, { nome: 'Medidas', descricao: 'Guarda as medidas do painel, em pastas por página.', colunas: [{ nome: 'Medidas', tipo: 'string', oculta: true }], medidas }],
  relacoes: [
    { de: ['Municípios', 'GRE'], para: ['Regionais', 'GRE'] },
    { de: ['Tramitações', 'Colegiado'], para: ['Colegiados', 'Colegiado'] },
    { de: ['Tramitações', 'Código IBGE'], para: ['Municípios', 'Código IBGE'] },
    { de: ['Foto da fila', 'Tramitação'], para: ['Tramitações', 'Tramitação'] },
    { de: ['Foto da fila', 'Pessoa'], para: ['Pessoas', 'Pessoa'] },
    { de: ['Eventos', 'Tramitação'], para: ['Tramitações', 'Tramitação'] },
    { de: ['Presenças', 'Colegiado'], para: ['Colegiados', 'Colegiado'] },
    { de: ['Presenças', 'Pessoa'], para: ['Pessoas', 'Pessoa'] },
    { de: ['Diárias', 'Pessoa'], para: ['Pessoas', 'Pessoa'] },
    { de: ['Autos', 'Código IBGE'], para: ['Municípios', 'Código IBGE'] },
    { de: ['Pagamentos dos repasses', 'Organização'], para: ['Organizações', 'Organização'] },
  ],
};
