import type { Medida, Modelo, Tabela } from '../modelo';
import { COM_DATA, COM_PERIODO, FORMATO, MESES_NA_BASE, PASTA_PARAMETRO, cartao, data, inteiro, medida, medidasDeApoio, medidasDosCartoes, n, noMes, parte, reais, sinal, texto, variacaoDe } from '../comum';
import type { Cartao } from '../comum';

/*
 * Modelo do painel de Gestão do Conselho no Power BI: as tabelas de `dados.ts`, as relações do esquema estrela e as medidas DAX
 * dos cartões e gráficos das cinco páginas, em pastas com o nome de cada página. Estoques (dívida, processos em julgamento,
 * recursos, plenário, profissionais ativos) leem a foto da data escolhida; fluxos (receita, despesa, diárias, julgados,
 * repasses, solicitações) somam os fatos do período (ADR 0002). `tests/powerbi-conselho.test.ts` reproduz estas regras sobre os
 * CSV e confere com os números do protótipo.
 */
const PASTA = { apoio: 'Apoio', receita: 'Receita', orcamento: 'Orçamento e despesa', camaras: 'Câmaras e plenário', entidades: 'Entidades e escolas', atendimento: 'Atendimento' } as const;

const tabelas: Tabela[] = [
  // Dimensões.
  { nome: 'Regionais', arquivo: 'regionais.csv', descricao: 'Tem uma linha para cada uma das 16 gerências regionais do Crea-SP.', colunas: [texto('GRE', { ordenarPor: 'Ordem' }), inteiro('Ordem', { oculta: true })] },
  { nome: 'Municípios', arquivo: 'municipios.csv', descricao: 'Tem os 645 municípios de SP, a GRE de cada um pela tabela oficial e a unidade de atendimento mais próxima, com a distância em linha reta.',
    colunas: [texto('Código IBGE'), texto('Município'), texto('GRE'), texto('Unidade mais próxima'), inteiro('Distância até a unidade (km)', { formato: '#,##0' })] },
  { nome: 'Câmaras', arquivo: 'camaras.csv', descricao: 'Tem as nove câmaras especializadas do Crea-SP, com os nomes do sistema do Conselho.', colunas: [texto('Câmara', { ordenarPor: 'Ordem' }), inteiro('Ordem', { oculta: true })] },
  { nome: 'Calendário', arquivo: 'calendario.csv', descricao: 'Tem um mês por linha, de 2020 até 12 meses depois de hoje (para os contratos que terminam), para os gráficos mês a mês e ano a ano.',
    colunas: [data('Mês', { formato: 'mmm/yy' }), texto('Rótulo', { ordenarPor: 'Mês' }), inteiro('Ano'), inteiro('Mês do ano', { oculta: true }), texto('Nome do mês', { ordenarPor: 'Mês do ano' }), inteiro('Ordem', { oculta: true })] },
  { nome: 'Datas de referência', arquivo: 'datas-referencia.csv', descricao: 'Tem os fins de mês em que a base pode ser lida, e hoje. Não se liga às outras tabelas: a escolha vale para todas as medidas.', colunas: [data('Data'), texto('Rótulo', { ordenarPor: 'Data' })] },
  { nome: 'Datas das fotos', arquivo: 'datas-das-fotos.csv', oculta: true, descricao: 'Tem todas as datas com foto, inclusive os meses antes da primeira data de referência. As medidas de variação a usam para ler o mesmo indicador um ano antes.', colunas: [data('Data')] },
  { nome: 'Período', calculada: `GENERATESERIES(1, ${MESES_NA_BASE}, 1)`, descricao: 'Guarda o número de meses somados nos fluxos, contados para trás a partir da data de referência. No Power BI Desktop, é um parâmetro do tipo "Intervalo numérico", de 1 a 36 meses.', colunas: [inteiro('Meses', { origem: '[Value]', parametro: true })] },

  // Receita e despesa.
  { nome: 'Receitas', arquivo: 'receitas.csv', descricao: 'Guarda a receita prevista e a realizada de cada mês, por origem. A receita do Conselho é do estado inteiro: não muda com a regional.',
    colunas: [data('Mês', { oculta: true }), texto('Origem'), reais('Prevista'), reais('Realizada')] },
  { nome: 'Despesas', arquivo: 'despesas.csv', descricao: 'Guarda a despesa orçada e a realizada de cada mês, por natureza e função. A despesa da sede fica sem GRE; a das regionais leva a GRE em que foi lançada.',
    colunas: [data('Mês', { oculta: true }), texto('Natureza'), texto('Função'), texto('Atividade'), texto('GRE', { oculta: true }), reais('Orçado'), reais('Realizado')] },
  { nome: 'Pessoas', arquivo: 'pessoas.csv', descricao: 'Tem os servidores (um por posto, com cargo, vínculo, lotação e custo mensal) e os conselheiros (um por cadeira, com a organização que indicou). Os nomes do cenário são fictícios.',
    colunas: [texto('Pessoa', { oculta: true }), texto('Nome'), texto('Tipo'), texto('Cargo'), texto('Função'), texto('Vínculo'), texto('Lotação'), reais('Custo mensal'), texto('Indicado por')] },
  { nome: 'Diárias', arquivo: 'diarias.csv', descricao: 'Guarda as diárias pagas a cada pessoa em cada mês, com a categoria e a GRE do lançamento. As diárias de cada pessoa somam o total de cada categoria.',
    colunas: [data('Mês', { oculta: true }), texto('Pessoa', { oculta: true }), texto('Categoria'), texto('GRE', { oculta: true }), inteiro('Diárias', { oculta: true }), reais('Valor'), inteiro('Quilômetros', { oculta: true })] },
  { nome: 'Fornecedores', arquivo: 'fornecedores.csv', descricao: 'Tem os fornecedores do Conselho, pela razão social. No cenário, os nomes são fictícios e terminam com "(demonstrativo)".', colunas: [texto('Fornecedor', { oculta: true }), texto('Nome'), texto('Objeto'), texto('Natureza')] },
  { nome: 'Empenhos', arquivo: 'empenhos.csv', oculta: true, descricao: 'Guarda cada empenho, com o mês, o fornecedor, o valor empenhado, o pago e o contrato.', colunas: [texto('Empenho'), data('Mês'), texto('Fornecedor'), reais('Valor'), reais('Pago'), texto('Contrato')] },
  { nome: 'Contratos', arquivo: 'contratos.csv', descricao: 'Tem os contratos do Conselho, com a vigência, o valor e os aditivos.',
    colunas: [texto('Contrato'), texto('Fornecedor', { oculta: true }), texto('Nome do fornecedor'), texto('Objeto'), texto('Modalidade'), data('Início'), data('Fim'), reais('Valor'), inteiro('Aditivos', { oculta: true })] },

  // Dívida de anuidade.
  { nome: 'Títulos', arquivo: 'titulos.csv', oculta: true, descricao: 'Guarda cada anuidade de profissional e cada boleto de empresa vencidos até hoje, com a data e os dias até o pagamento.',
    colunas: [texto('Título'), texto('Devedor'), texto('Tipo de devedor'), texto('Código IBGE'), data('Vencimento'), reais('Valor'), data('Pago em'), inteiro('Dias até o pagamento')] },
  { nome: 'Foto da dívida', arquivo: 'foto-divida.csv', descricao: 'Guarda a dívida de anuidade no último dia de cada mês: uma linha por devedor e idade da anuidade, com o valor vencido e não pago, se o devedor está acima do piso de execução, a parte perto de prescrever e, nas empresas, a situação do CNPJ na Receita Federal.',
    colunas: [data('Data', { oculta: true }), texto('Devedor', { oculta: true }), texto('Tipo de devedor'), texto('Código IBGE', { oculta: true }), texto('Idade da anuidade', { ordenarPor: 'Ordem da idade' }), inteiro('Ordem da idade', { oculta: true }),
      reais('Valor'), sinal('Acima do piso'), reais('Perto de prescrever'), texto('Situação do CNPJ')] },

  // Câmaras e plenário.
  { nome: 'Processos', arquivo: 'processos.csv', descricao: 'Guarda cada processo das câmaras: entrada, julgamento, decisão e, nos autos de infração, a multa e a data da prescrição (cinco anos do fato, Lei 9.873/1999, art. 1º).',
    colunas: [texto('Processo'), texto('Câmara', { oculta: true }), texto('Tipo'), texto('Código IBGE', { oculta: true }), data('Entrada'), data('Mês de entrada', { oculta: true }), data('Julgado em'), data('Mês do julgamento', { oculta: true }),
      inteiro('Dias até o julgamento', { oculta: true }), texto('Decisão'), reais('Multa'), data('Prescreve em')] },
  { nome: 'Foto dos processos', arquivo: 'foto-processos.csv', descricao: 'Guarda, no último dia de cada mês, os processos em julgamento (com a fase, o tempo de espera e o prazo da prescrição) e os que têm recurso esperando o plenário.',
    colunas: [data('Data', { oculta: true }), texto('Processo', { oculta: true }), texto('Fase'), texto('Tempo em julgamento', { ordenarPor: 'Ordem do tempo' }), inteiro('Ordem do tempo', { oculta: true }), texto('Prazo da prescrição', { ordenarPor: 'Ordem do prazo' }), inteiro('Ordem do prazo', { oculta: true }),
      sinal('Prescreve em até 12 meses'), sinal('Recurso esperando o plenário')] },
  { nome: 'Foto do plenário', arquivo: 'foto-plenario.csv', oculta: true, descricao: 'Guarda, no último dia de cada mês, as cadeiras de cada câmara no plenário e os profissionais ativos da modalidade que ela julga.', colunas: [data('Data'), texto('Câmara'), inteiro('Cadeiras'), inteiro('Profissionais ativos')] },
  { nome: 'Profissionais ativos', arquivo: 'profissionais-ativos.csv', oculta: true, descricao: 'Conta os profissionais com registro ativo no último dia de cada mês, por município onde moram.', colunas: [data('Data'), texto('Código IBGE'), inteiro('Ativos')] },

  // Entidades e escolas.
  { nome: 'Organizações', arquivo: 'organizacoes.csv', descricao: 'Tem as entidades de classe e as instituições de ensino registradas no Crea-SP, com a natureza, o município e as cadeiras no plenário.',
    colunas: [texto('Organização', { oculta: true }), texto('Sigla'), texto('Nome'), texto('Natureza'), texto('Tipo'), texto('Código IBGE', { oculta: true }), data('Registrada em'), inteiro('Cadeiras', { oculta: true }), { nome: 'Ensino a distância', tipo: 'double', formato: '0%', oculta: true }] },
  { nome: 'Repasses', arquivo: 'repasses.csv', descricao: 'Guarda os convênios, contratos e patrocínios com as organizações, com a vigência e o valor.', colunas: [texto('Repasse', { oculta: true }), texto('Organização', { oculta: true }), texto('Canal'), texto('Objeto'), data('Início'), data('Fim'), reais('Valor')] },
  { nome: 'Pagamentos dos repasses', arquivo: 'pagamentos-repasses.csv', oculta: true, descricao: 'Guarda cada pagamento de um repasse, com a data.', colunas: [texto('Repasse'), texto('Organização'), data('Data'), data('Mês'), reais('Valor')] },

  // Atendimento.
  { nome: 'Solicitações', arquivo: 'solicitacoes.csv', descricao: 'Guarda cada solicitação de atendimento: a unidade que atendeu (pelo município), o município de quem pediu, o prazo, a resolução, o assunto, o canal e a distância de quem pediu até a unidade mais próxima.',
    colunas: [texto('Solicitação', { oculta: true }), texto('Código IBGE', { oculta: true }), texto('Município do solicitante', { oculta: true }), data('Aberta em'), data('Mês', { oculta: true }), data('Prazo'), data('Resolvida em'), inteiro('Dias até resolver', { oculta: true }),
      texto('Assunto'), texto('Solicitante'), texto('Canal'), texto('Distância do solicitante', { ordenarPor: 'Ordem da distância' }), inteiro('Ordem da distância', { oculta: true })] },
  { nome: 'Coworkings', arquivo: 'coworkings.csv', descricao: 'Tem as unidades de coworking do Crea-SP, pelo município, com o número de mesas.', colunas: [texto('Unidade'), texto('Código IBGE', { oculta: true }), inteiro('Mesas', { oculta: true })] },
  { nome: 'Meses dos coworkings', arquivo: 'coworkings-meses.csv', oculta: true, descricao: 'Guarda, por unidade e mês, as horas de mesa disponíveis, as usadas e o custo.', colunas: [texto('Unidade'), data('Mês'), inteiro('Horas disponíveis'), inteiro('Horas usadas'), reais('Custo')] },
  { nome: 'Usuários dos coworkings', arquivo: 'coworkings-usuarios.csv', oculta: true, descricao: 'Guarda os profissionais que usaram cada unidade em cada mês.', colunas: [texto('Unidade'), data('Mês'), texto('Profissional')] },
];

/* ---------- Pedaços de DAX ---------- */
const rs = (expressao: string) => `FORMAT(${expressao}, "R$ #,##0")`;
/** Os 12 meses terminados no mês da data escolhida, como a despesa, as diárias e os fornecedores do painel (sem o período). */
const COM_DOZE_MESES = `${COM_DATA}\nVAR inicio = DATE(YEAR(d), MONTH(d) - 11, 1)`;
const filtros = (lista: string[]) => lista.map(filtro => `, ${filtro}`).join('');
/** Soma uma coluna de um fato com mês nos 12 meses até a data, com filtros a mais. */
const nos12Meses = (tabela: string, coluna: string, ...extra: string[]) => `${COM_DOZE_MESES}\nRETURN CALCULATE(SUM('${tabela}'[${coluna}]), REMOVEFILTERS('Calendário'), '${tabela}'[Mês] >= inicio, '${tabela}'[Mês] <= d${filtros(extra)}) + 0`;
/** Soma uma coluna de um fato com mês no período escolhido. */
const noPeriodo = (tabela: string, coluna: string, expressao = `SUM('${tabela}'[${coluna}])`, ...extra: string[]) => `${COM_PERIODO}\nRETURN CALCULATE(${expressao}, REMOVEFILTERS('Calendário'), '${tabela}'[${coluna}] >= inicio, '${tabela}'[${coluna}] <= d${filtros(extra)})`;
/**
 * Acumulado de janeiro até o mês do eixo (Calendário[Nome do mês]), no ano da data escolhida ou no anterior. No ano da data, para
 * no mês dela, como a curva do painel.
 */
const acumulado = (tabela: string, coluna: string, anoAnterior: boolean) => [COM_DATA, "VAR m = MAX('Calendário'[Mês do ano])", `VAR ano = YEAR(d)${anoAnterior ? ' - 1' : ''}`,
  `RETURN IF(${anoAnterior ? 'TRUE()' : 'm <= MONTH(d)'}, CALCULATE(SUM('${tabela}'[${coluna}]), REMOVEFILTERS('Calendário'), '${tabela}'[Mês] >= DATE(ano, 1, 1), '${tabela}'[Mês] <= DATE(ano, m, 1)) + 0)`].join('\n');
/** Soma uma coluna de uma foto na data escolhida, com filtros a mais (KEEPFILTERS, para não apagar a série do gráfico). */
const naFoto = (tabela: string, expressao: string, ...extra: string[]) => `${COM_DATA}\nRETURN CALCULATE(${expressao}, REMOVEFILTERS('Calendário'), '${tabela}'[Data] = d${extra.map(filtro => `, KEEPFILTERS(${filtro})`).join('')})`;
const DIVIDA = (...extra: string[]) => naFoto('Foto da dívida', "SUM('Foto da dívida'[Valor])", ...extra);
const PROCESSOS = (...extra: string[]) => naFoto('Foto dos processos', "COUNTROWS('Foto dos processos')", ...extra);
const EM_JULGAMENTO = "'Foto dos processos'[Fase] <> \"\"";

/* ---------- Dívida: início, novos, recebidos e prescritos no período (a cascata do painel) ---------- */
/** Título vencido e não pago num dia `x`, ainda não prescrito (`vencidoEm`): venceu antes de `x`, há até 1.826 dias, e não foi pago até `x`. */
const vencidosEm = (x: string) => `CALCULATE(SUM('Títulos'[Valor]), 'Títulos'[Vencimento] < ${x}, 'Títulos'[Vencimento] >= ${x} - 1826, ISBLANK('Títulos'[Pago em]) || 'Títulos'[Pago em] > ${x}) + 0`;

/* ---------- Atendimento: a situação de cada solicitação na data (`situacaoPedido`) ---------- */
const RESOLVIDA = "NOT ISBLANK('Solicitações'[Resolvida em]) && 'Solicitações'[Resolvida em] <= d";
const situacao = (condicao: string) => `${COM_PERIODO}\nRETURN COUNTROWS(FILTER(CALCULATETABLE('Solicitações', REMOVEFILTERS('Calendário'), 'Solicitações'[Aberta em] >= inicio, 'Solicitações'[Aberta em] <= d), ${condicao})) + 0`;

/* ---------- Pessoal: a lotação é o nome da GRE ou "Sede"; com regional escolhida, conta só quem está lotado nela ---------- */
const doPessoal = (expressao: string, ...extra: string[]) => `IF(ISCROSSFILTERED('Regionais'), CALCULATE(${expressao}, 'Pessoas'[Tipo] = "Servidor"${filtros(extra)}, TREATAS(VALUES('Regionais'[GRE]), 'Pessoas'[Lotação])), CALCULATE(${expressao}, 'Pessoas'[Tipo] = "Servidor"${filtros(extra)}))`;

/* ---------- Entidades: só as organizações registradas até a data ---------- */
const REGISTRADA = "'Organizações'[Registrada em] <= d";
/** Repasses pagos entre `de` (exclusive) e `ate` (inclusive), dos repasses que começaram até a data. */
const pagosEntre = (de: string, ate: string) => `${COM_DATA}\nRETURN CALCULATE(SUM('Pagamentos dos repasses'[Valor]), REMOVEFILTERS('Calendário'), 'Pagamentos dos repasses'[Data] > ${de}, 'Pagamentos dos repasses'[Data] <= ${ate}, 'Repasses'[Início] <= d, ${REGISTRADA}) + 0`;

/* ---------- Cartões ---------- */
const [naReceita, noOrcamento, nasCamaras, nasEntidades, noAtendimento] = [cartao(PASTA.receita), cartao(PASTA.orcamento), cartao(PASTA.camaras), cartao(PASTA.entidades), cartao(PASTA.atendimento)];
const DOZE_ANTERIORES = '" em relação aos 12 meses anteriores"';
const porNatureza = (medidaBase: string, prefixo: string) => ['Entidade de classe', 'IES pública', 'IES privada']
  .map(natureza => `${n(`CALCULATE(${medidaBase}, 'Organizações'[Natureza] = "${natureza}")`)} & "${prefixo}${natureza.replace('Entidade', 'entidade')}"`).join(' & ", " & ');
/** Os cartões de cada página, com a comparação e a linha de apoio do painel. `paginas.ts` monta os cartões daqui. */
export const CARTOES = {
  receita: [
    naReceita('Receita do Conselho', { serie: 'fluxo' }, '"em " & [Meses do período] & " meses, de anuidades, ARTs, multas e outras origens"'),
    naReceita('Anuidades vencidas', { serie: 'estoque' }, `${n('[Devedores de anuidade]')} & " devedores: " & ${rs('[Anuidades vencidas de profissionais]')} & " de profissionais e " & ${rs('[Anuidades vencidas de empresas]')} & " de empresas"`),
    naReceita('Abaixo do piso de execução', undefined, `${rs('[Vencidas abaixo do piso]')} & " de devedores que somam menos de " & ${rs('[Piso de execução]')} & ", cobrados só fora da Justiça"`),
    naReceita('Perto de prescrever', undefined, `"anuidades vencidas há mais de quatro anos, de " & ${n('[Devedores perto de prescrever]')} & " devedores"`),
    naReceita('Recebido da dívida', undefined, `${rs('[Recebido da dívida no período]')} & " recebidos no período, de " & ${rs('[Dívida no início do período] + [Novos vencimentos no período]')} & " vencidos"`),
  ],
  orcamento: [
    noOrcamento('Despesa em 12 meses', { serie: 'fluxo', frase: DOZE_ANTERIORES }, 'IF(ISCROSSFILTERED(\'Regionais\'), "só a despesa lançada na regional escolhida", "sede e regionais")'),
    noOrcamento('Execução do orçamento no ano', undefined, `${rs('[Despesa realizada no ano]')} & " realizados de " & ${rs('[Despesa orçada no ano]')} & " orçados até o mês da data"`),
    noOrcamento('Em atividades-fim', undefined, `${rs('[Despesa em atividades-fim em 12 meses]')} & " em fiscalização, atendimento e ações institucionais"`),
    noOrcamento('Diárias e passagens', { serie: 'fluxo', frase: DOZE_ANTERIORES }, `${n('[Diárias pagas em 12 meses]')} & " diárias em 12 meses"`),
    noOrcamento('Contratos vigentes', undefined, `${rs('[Valor dos contratos vigentes]')} & "; " & ${n('[Contratos que terminam em 90 dias]')} & " terminam em 90 dias"`),
  ],
  camaras: [
    nasCamaras('Processos em julgamento', { serie: 'estoque' }, `${n('[Processos que entraram no período]')} & " entraram no período"`),
    nasCamaras('Julgados no período', { serie: 'fluxo' }, `"contra " & ${n('[Processos que entraram no período]')} & " que entraram"`),
    nasCamaras('Tempo até o julgamento', { serie: 'fluxo' }, '"tempo típico (mediana) dos julgados no período"'),
    nasCamaras('Autos perto da prescrição', undefined, `${rs('[Multas dos autos perto da prescrição]')} & " em multas prescrevem em até 12 meses, e " & ${n('[Autos prescritos no período]')} & " autos já prescreveram no período"`),
    nasCamaras('Recursos esperando o plenário', { serie: 'estoque' }, '"decisões das câmaras levadas ao plenário"'),
  ],
  entidades: [
    nasEntidades('Organizações registradas', undefined, porNatureza('[Organizações registradas]', ' ')),
    nasEntidades('Cadeiras no plenário', undefined, porNatureza('[Cadeiras no plenário]', ' de ')),
    nasEntidades('Repasses em 12 meses', { serie: 'fluxo', medida: variacaoDe('Repasses em 12 meses'), frase: DOZE_ANTERIORES },
      `${COM_DATA}\nRETURN ${['Convênio', 'Contrato', 'Patrocínio'].map(canal => `${rs(`CALCULATE([Repassado no ano], REMOVEFILTERS('Calendário'), 'Calendário'[Ano] = YEAR(d), 'Repasses'[Canal] = "${canal}")`)} & " ${canal.toLowerCase()}s"`).join(' & ", " & ')} & " no ano corrente"`),
    nasEntidades('Instrumentos vigentes', undefined, `"convênios, contratos e patrocínios em vigor, com " & ${n('[Organizações com instrumento vigente]')} & " organizações"`),
  ],
  atendimento: [
    noAtendimento('Solicitações resolvidas no prazo', { serie: 'taxa' }, '"em até 14 dias; a meta é " & FORMAT([Meta de resolução no prazo], "0%")'),
    noAtendimento('Solicitações de atendimento', { serie: 'fluxo' }, `${parte('DIVIDE([Solicitações de empresas], [Solicitações de atendimento])')} & " vindas de empresas"`),
    noAtendimento('Tempo de resolução', undefined, `"tempo típico (mediana); " & ${n('[Abertas com prazo vencido]')} & " pedidos abertos já passaram do prazo"`),
    noAtendimento('Moram a mais de 50 km de uma unidade', undefined, `${n('[Ativos a mais de 50 km]')} & " dos " & ${n('[Profissionais ativos]')} & " profissionais ativos do recorte, em linha reta"`),
    noAtendimento('Ocupação dos coworkings', { serie: 'taxa' }, `${n('[Unidades de coworking]')} & " unidades com " & ${n('[Usuários dos coworkings]')} & " usuários, a " & FORMAT(DIVIDE([Custo dos coworkings no período], [Horas usadas no período]), "R$ #,##0.00") & " por hora usada"`),
  ],
} satisfies Record<string, Cartao[]>;

/* ---------- Medidas ---------- */
const dias = '#,##0" dias"';
const medidas: Medida[] = [
  // Apoio: data, período, piso e meta.
  ...medidasDeApoio(PASTA.apoio),
  medida(PASTA.apoio, 'Piso de execução', `${COM_DATA}\nRETURN 5 * ROUND(520 * POWER(1.055, MAX(0, YEAR(d) - 2020)), 0)`, FORMATO.reais,
    'Cinco vezes a anuidade de pessoa física do ano da data escolhida (Lei 12.514/2011, art. 8º, com a redação da Lei 14.195/2021). Abaixo dele, o Conselho não pode executar a dívida na Justiça. A anuidade do cenário é demonstrativa.'),
  medida(PASTA.apoio, 'Meta de resolução no prazo', '0.8', FORMATO.parte, 'A meta padrão de solicitações resolvidas no prazo é 80%, a mesma do painel.'),

  // Receita.
  medida(PASTA.receita, 'Receita do Conselho', `${noPeriodo('Receitas', 'Mês', "SUM('Receitas'[Realizada])")} + 0`, FORMATO.reais, 'Soma a receita realizada no período, de anuidades, ARTs, multas e outras origens.'),
  medida(PASTA.receita, 'Receita no mês', noMes("SUM('Receitas'[Realizada])"), FORMATO.reais, 'Soma a receita realizada em cada mês, nos meses do gráfico.'),
  medida(PASTA.receita, 'Receita no mesmo mês do ano anterior', noMes("CALCULATE(SUM('Receitas'[Realizada]), REMOVEFILTERS('Calendário'), 'Receitas'[Mês] = EDATE(mes, -12))"), FORMATO.reais, 'Soma a receita realizada no mesmo mês um ano antes, para comparar.'),
  medida(PASTA.receita, 'Receita prevista acumulada no ano', acumulado('Receitas', 'Prevista', false), FORMATO.reais, 'Soma a receita prevista de janeiro até cada mês do ano da data escolhida, até o mês dela.'),
  medida(PASTA.receita, 'Receita realizada acumulada no ano', acumulado('Receitas', 'Realizada', false), FORMATO.reais, 'Soma a receita realizada de janeiro até cada mês do ano da data escolhida, até o mês dela.'),
  medida(PASTA.receita, 'Receita realizada acumulada no ano anterior', acumulado('Receitas', 'Realizada', true), FORMATO.reais, 'Soma a receita realizada de janeiro até cada mês do ano anterior ao da data escolhida.'),
  medida(PASTA.receita, 'Anuidades vencidas', DIVIDA(), FORMATO.reais, 'Soma as anuidades de profissionais e os boletos de empresas vencidos e não pagos na data escolhida, até cinco anos depois do vencimento (depois disso, prescrevem).'),
  medida(PASTA.receita, 'Devedores de anuidade', naFoto('Foto da dívida', "DISTINCTCOUNT('Foto da dívida'[Devedor])"), FORMATO.inteiro, 'Conta os profissionais e as empresas com anuidade vencida e não paga na data escolhida.'),
  medida(PASTA.receita, 'Anuidades vencidas de profissionais', DIVIDA("'Foto da dívida'[Tipo de devedor] = \"Profissional\""), FORMATO.reais, 'Soma as anuidades vencidas de profissionais na data escolhida.'),
  medida(PASTA.receita, 'Anuidades vencidas de empresas', DIVIDA("'Foto da dívida'[Tipo de devedor] = \"Empresa\""), FORMATO.reais, 'Soma os boletos vencidos de empresas na data escolhida. Com a situação do CNPJ na Receita Federal, mostra quanto é de empresa baixada ou inapta, com pouca chance de ser recebido.'),
  medida(PASTA.receita, 'Vencidas abaixo do piso', DIVIDA("'Foto da dívida'[Acima do piso] = 0"), FORMATO.reais, 'Soma a dívida dos devedores que, somando todas as anuidades vencidas, ficam abaixo do piso de execução.'),
  medida(PASTA.receita, 'Vencidas acima do piso', DIVIDA("'Foto da dívida'[Acima do piso] = 1"), FORMATO.reais, 'Soma a dívida dos devedores que somam o piso de execução ou mais.'),
  medida(PASTA.receita, 'Abaixo do piso de execução', 'DIVIDE([Vencidas abaixo do piso], [Anuidades vencidas])', FORMATO.parte, 'Mostra a parte da dívida que é de devedores abaixo do piso de execução: só pode ser cobrada fora da Justiça.'),
  medida(PASTA.receita, 'Perto de prescrever', naFoto('Foto da dívida', "SUM('Foto da dívida'[Perto de prescrever])"), FORMATO.reais, 'Soma as anuidades vencidas há mais de quatro anos na data escolhida: prescrevem em menos de um ano (Código Tributário Nacional, art. 174).'),
  medida(PASTA.receita, 'Devedores perto de prescrever', naFoto('Foto da dívida', "DISTINCTCOUNT('Foto da dívida'[Devedor])", "'Foto da dívida'[Perto de prescrever] > 0"), FORMATO.inteiro, 'Conta os devedores com ao menos uma anuidade vencida há mais de quatro anos.'),
  medida(PASTA.receita, 'Dívida no início do período', `${COM_PERIODO}\nVAR x = inicio - 1\nRETURN ${vencidosEm('x')}`, FORMATO.reais, 'Soma a dívida vencida e não paga no dia anterior ao início do período.'),
  medida(PASTA.receita, 'Novos vencimentos no período', `${COM_PERIODO}\nRETURN CALCULATE(SUM('Títulos'[Valor]), 'Títulos'[Vencimento] >= inicio - 1, 'Títulos'[Vencimento] < d, FILTER('Títulos', ISBLANK('Títulos'[Pago em]) || 'Títulos'[Pago em] > 'Títulos'[Vencimento])) + 0`, FORMATO.reais,
    'Soma as anuidades e os boletos que venceram no período sem ser pagos no vencimento.'),
  medida(PASTA.receita, 'Recebido da dívida no período', `${COM_PERIODO}\nRETURN CALCULATE(SUM('Títulos'[Valor]), 'Títulos'[Pago em] >= inicio, 'Títulos'[Pago em] <= d, 'Títulos'[Dias até o pagamento] > 0, 'Títulos'[Dias até o pagamento] <= 1826) + 0`, FORMATO.reais,
    'Soma o que foi pago no período depois do vencimento, antes da prescrição.'),
  medida(PASTA.receita, 'Prescrito no período', `${COM_PERIODO}\nRETURN CALCULATE(SUM('Títulos'[Valor]), 'Títulos'[Vencimento] >= inicio - 1 - 1826, 'Títulos'[Vencimento] < d - 1826, ISBLANK('Títulos'[Pago em]) || 'Títulos'[Pago em] > d) + 0`, FORMATO.reais,
    'Soma a dívida que completou cinco anos do vencimento no período sem ser paga: prescreveu.'),
  medida(PASTA.receita, 'Recebido da dívida', 'DIVIDE([Recebido da dívida no período], [Dívida no início do período] + [Novos vencimentos no período])', FORMATO.parte, 'Mostra quanto do que estava vencido no início do período, mais o que venceu nele, foi recebido no período.'),

  // Orçamento e despesa.
  medida(PASTA.orcamento, 'Despesa em 12 meses', nos12Meses('Despesas', 'Realizado'), FORMATO.reais, 'Soma a despesa realizada nos 12 meses até o mês da data escolhida. Com uma regional escolhida, só a despesa lançada nela, sem a sede.'),
  medida(PASTA.orcamento, 'Orçado em 12 meses', nos12Meses('Despesas', 'Orçado'), FORMATO.reais, 'Soma a despesa orçada nos 12 meses até o mês da data escolhida.'),
  medida(PASTA.orcamento, 'Despesa em atividades-fim em 12 meses', nos12Meses('Despesas', 'Realizado', "'Despesas'[Atividade] = \"Atividade-fim\""), FORMATO.reais, 'Soma a despesa de fiscalização, atendimento e ações institucionais nos 12 meses.'),
  medida(PASTA.orcamento, 'Em atividades-fim', 'DIVIDE([Despesa em atividades-fim em 12 meses], [Despesa em 12 meses])', FORMATO.parte, 'Mostra a parte da despesa dos 12 meses que foi para as atividades-fim: fiscalização, atendimento e ações institucionais.'),
  medida(PASTA.orcamento, 'Despesa de fiscalização em 12 meses', nos12Meses('Despesas', 'Realizado', "'Despesas'[Função] = \"Fiscalização\"", "'Despesas'[GRE] <> \"\""), FORMATO.reais, 'Soma a despesa de fiscalização lançada em cada GRE nos 12 meses (sem a sede).'),
  medida(PASTA.orcamento, 'Despesa realizada', `${COM_DATA}\nRETURN CALCULATE(SUM('Despesas'[Realizado]), 'Despesas'[Mês] <= d)`, FORMATO.reais, 'Soma a despesa realizada até a data escolhida, no mês ou ano do gráfico.'),
  medida(PASTA.orcamento, 'Despesa realizada no ano', `${COM_DATA}\nRETURN CALCULATE(SUM('Despesas'[Realizado]), REMOVEFILTERS('Calendário'), 'Despesas'[Mês] >= DATE(YEAR(d), 1, 1), 'Despesas'[Mês] <= d) + 0`, FORMATO.reais, 'Soma a despesa realizada de janeiro até o mês da data escolhida.'),
  medida(PASTA.orcamento, 'Despesa orçada no ano', `${COM_DATA}\nRETURN CALCULATE(SUM('Despesas'[Orçado]), REMOVEFILTERS('Calendário'), 'Despesas'[Mês] >= DATE(YEAR(d), 1, 1), 'Despesas'[Mês] <= d) + 0`, FORMATO.reais, 'Soma a despesa orçada de janeiro até o mês da data escolhida.'),
  medida(PASTA.orcamento, 'Execução do orçamento no ano', 'DIVIDE([Despesa realizada no ano], [Despesa orçada no ano])', FORMATO.parte, 'Mostra quanto da despesa orçada de janeiro até o mês da data escolhida foi realizada.'),
  medida(PASTA.orcamento, 'Despesa orçada acumulada no ano', acumulado('Despesas', 'Orçado', false), FORMATO.reais, 'Soma a despesa orçada de janeiro até cada mês do ano da data escolhida, até o mês dela.'),
  medida(PASTA.orcamento, 'Despesa realizada acumulada no ano', acumulado('Despesas', 'Realizado', false), FORMATO.reais, 'Soma a despesa realizada de janeiro até cada mês do ano da data escolhida, até o mês dela.'),
  medida(PASTA.orcamento, 'Despesa realizada acumulada no ano anterior', acumulado('Despesas', 'Realizado', true), FORMATO.reais, 'Soma a despesa realizada de janeiro até cada mês do ano anterior ao da data escolhida.'),
  medida(PASTA.orcamento, 'Diárias e passagens', nos12Meses('Diárias', 'Valor'), FORMATO.reais, 'Soma o valor das diárias pagas nos 12 meses até o mês da data escolhida. Com uma regional escolhida, só as lançadas nela.'),
  medida(PASTA.orcamento, 'Diárias pagas em 12 meses', nos12Meses('Diárias', 'Diárias'), FORMATO.inteiro, 'Conta as diárias pagas nos 12 meses.'),
  medida(PASTA.orcamento, 'Quilômetros em 12 meses', nos12Meses('Diárias', 'Quilômetros'), FORMATO.inteiro, 'Soma os quilômetros rodados nas viagens com diária nos 12 meses.'),
  medida(PASTA.orcamento, 'Meses com diária', `${COM_DOZE_MESES}\nRETURN CALCULATE(DISTINCTCOUNT('Diárias'[Mês]), REMOVEFILTERS('Calendário'), 'Diárias'[Mês] >= inicio, 'Diárias'[Mês] <= d)`, '0', 'Conta os meses dos 12 em que a pessoa recebeu diária.'),
  medida(PASTA.orcamento, 'Contratos vigentes', `${COM_DATA}\nRETURN CALCULATE(COUNTROWS('Contratos'), 'Contratos'[Início] <= d, 'Contratos'[Fim] >= d) + 0`, FORMATO.inteiro, 'Conta os contratos em vigor na data escolhida.'),
  medida(PASTA.orcamento, 'Valor dos contratos vigentes', `${COM_DATA}\nRETURN CALCULATE(SUM('Contratos'[Valor]), 'Contratos'[Início] <= d, 'Contratos'[Fim] >= d) + 0`, FORMATO.reais, 'Soma o valor dos contratos em vigor na data escolhida.'),
  medida(PASTA.orcamento, 'Contratos que terminam em 90 dias', `${COM_DATA}\nRETURN CALCULATE(COUNTROWS('Contratos'), 'Contratos'[Início] <= d, 'Contratos'[Fim] >= d, 'Contratos'[Fim] <= d + 90) + 0`, FORMATO.inteiro, 'Conta os contratos vigentes que terminam nos 90 dias seguintes à data escolhida.'),
  medida(PASTA.orcamento, 'Contratos que terminam no mês', [COM_DATA, "VAR mes = MAX('Calendário'[Mês])", 'VAR primeiro = DATE(YEAR(d), MONTH(d), 1)',
    "RETURN IF(mes >= primeiro && mes <= EDATE(primeiro, 11), CALCULATE(COUNTROWS('Contratos'), 'Contratos'[Início] <= d, 'Contratos'[Fim] >= d, 'Contratos'[Fim] >= mes, 'Contratos'[Fim] <= EOMONTH(mes, 0)) + 0)"].join('\n'), FORMATO.inteiro,
    'Conta os contratos vigentes na data escolhida que terminam em cada um dos 12 meses seguintes, a começar pelo mês dela.'),
  medida(PASTA.orcamento, 'Empenhado em 12 meses', nos12Meses('Empenhos', 'Valor'), FORMATO.reais, 'Soma o valor empenhado nos 12 meses até o mês da data escolhida.'),
  medida(PASTA.orcamento, 'Pago em 12 meses', nos12Meses('Empenhos', 'Pago'), FORMATO.reais, 'Soma o valor pago dos empenhos dos 12 meses.'),
  medida(PASTA.orcamento, 'Servidores efetivos', doPessoal("COUNTROWS('Pessoas')", "'Pessoas'[Vínculo] = \"Efetivo\""), FORMATO.inteiro, 'Conta os servidores efetivos. Com uma regional escolhida, só os lotados nela.'),
  medida(PASTA.orcamento, 'Servidores comissionados', doPessoal("COUNTROWS('Pessoas')", "'Pessoas'[Vínculo] = \"Comissionado\""), FORMATO.inteiro, 'Conta os servidores comissionados. Com uma regional escolhida, só os lotados nela.'),
  medida(PASTA.orcamento, 'Custo mensal do pessoal', doPessoal("SUM('Pessoas'[Custo mensal])"), FORMATO.reais, 'Soma o custo mensal dos postos (salário e encargos). Com uma regional escolhida, só os lotados nela.'),

  // Câmaras e plenário.
  medida(PASTA.camaras, 'Processos em julgamento', PROCESSOS(EM_JULGAMENTO), FORMATO.inteiro, 'Conta os processos que já entraram nas câmaras e ainda não foram julgados na data escolhida.'),
  medida(PASTA.camaras, 'Processos que entraram no período', `${noPeriodo('Processos', 'Entrada', "COUNTROWS('Processos')")} + 0`, FORMATO.inteiro, 'Conta os processos que entraram nas câmaras no período.'),
  medida(PASTA.camaras, 'Julgados no período', `${noPeriodo('Processos', 'Julgado em', "COUNTROWS('Processos')")} + 0`, FORMATO.inteiro, 'Conta os processos julgados pelas câmaras no período.'),
  medida(PASTA.camaras, 'Autos julgados no período', noPeriodo('Processos', 'Julgado em', "COUNTROWS('Processos')", "KEEPFILTERS('Processos'[Tipo] = \"Auto de infração\")"), FORMATO.inteiro, 'Conta os autos de infração julgados no período, pela decisão da câmara.'),
  medida(PASTA.camaras, 'Tempo até o julgamento', noPeriodo('Processos', 'Julgado em', "MEDIAN('Processos'[Dias até o julgamento])"), dias, 'Mostra o tempo típico (a mediana), em dias, da entrada ao julgamento dos processos julgados no período.'),
  medida(PASTA.camaras, 'Autos perto da prescrição', PROCESSOS("'Foto dos processos'[Prescreve em até 12 meses] = 1"), FORMATO.inteiro, 'Conta os autos de infração sem julgamento que completam cinco anos do fato em até 12 meses (Lei 9.873/1999, art. 1º).'),
  medida(PASTA.camaras, 'Multas dos autos perto da prescrição', `${COM_DATA}\nRETURN SUMX(CALCULATETABLE('Foto dos processos', REMOVEFILTERS('Calendário'), 'Foto dos processos'[Data] = d, 'Foto dos processos'[Prescreve em até 12 meses] = 1), RELATED('Processos'[Multa])) + 0`, FORMATO.reais,
    'Soma o valor das multas dos autos que prescrevem em até 12 meses.'),
  medida(PASTA.camaras, 'Autos prescritos no período', `CALCULATE([Julgados no período], 'Processos'[Decisão] = "Arquivado pela prescrição")`, FORMATO.inteiro, 'Conta os autos arquivados pela prescrição no período.'),
  medida(PASTA.camaras, 'Recursos esperando o plenário', PROCESSOS("'Foto dos processos'[Recurso esperando o plenário] = 1"), FORMATO.inteiro, 'Conta os processos em que a parte recorreu da decisão da câmara e o plenário ainda não julgou, na data escolhida.'),
  medida(PASTA.camaras, 'Entraram no mês', noMes("COUNTROWS('Processos') + 0"), FORMATO.inteiro, 'Conta os processos que entraram em cada mês, nos meses do gráfico.'),
  medida(PASTA.camaras, 'Julgados no mês', noMes("CALCULATE(COUNTROWS('Processos'), USERELATIONSHIP('Processos'[Mês do julgamento], 'Calendário'[Mês])) + 0"), FORMATO.inteiro, 'Conta os processos julgados em cada mês, nos meses do gráfico.'),
  medida(PASTA.camaras, 'Em julgamento no fim do mês', noMes("CALCULATE(COUNTROWS('Foto dos processos'), REMOVEFILTERS('Calendário'), 'Foto dos processos'[Data] = MIN(EOMONTH(mes, 0), d), 'Foto dos processos'[Fase] <> \"\")"), FORMATO.inteiro,
    'Conta os processos em julgamento no último dia de cada mês (no mês da data escolhida, nela).'),
  medida(PASTA.camaras, 'Cadeiras da câmara', naFoto('Foto do plenário', "SUM('Foto do plenário'[Cadeiras])"), FORMATO.inteiro, 'Conta as cadeiras de cada câmara no plenário na data escolhida, pelas modalidades das entidades e escolas que as indicam.'),
  medida(PASTA.camaras, 'Parte das cadeiras', "DIVIDE([Cadeiras da câmara], CALCULATE([Cadeiras da câmara], REMOVEFILTERS('Câmaras')))", FORMATO.parte, 'Mostra a parte das cadeiras do plenário que é de cada câmara.'),
  medida(PASTA.camaras, 'Parte dos profissionais ativos', `${COM_DATA}\nVAR camara = CALCULATE(SUM('Foto do plenário'[Profissionais ativos]), 'Foto do plenário'[Data] = d)\nVAR todas = CALCULATE(SUM('Foto do plenário'[Profissionais ativos]), 'Foto do plenário'[Data] = d, REMOVEFILTERS('Câmaras'))\nRETURN DIVIDE(camara, todas)`, FORMATO.parte,
    'Mostra a parte dos profissionais ativos que é da modalidade que cada câmara julga. A Ambiental e Sanitária não tem modalidade própria no cenário.'),

  // Entidades e escolas.
  medida(PASTA.entidades, 'Organizações registradas', `${COM_DATA}\nRETURN CALCULATE(COUNTROWS('Organizações'), ${REGISTRADA}) + 0`, FORMATO.inteiro, 'Conta as entidades de classe e as instituições de ensino registradas até a data escolhida.'),
  medida(PASTA.entidades, 'Cadeiras no plenário', `${COM_DATA}\nRETURN CALCULATE(SUM('Organizações'[Cadeiras]), ${REGISTRADA}) + 0`, FORMATO.inteiro, 'Soma as cadeiras no plenário das organizações registradas até a data escolhida.'),
  medida(PASTA.entidades, 'Repasses em 12 meses', pagosEntre('d - 365', 'd'), FORMATO.reais, 'Soma os pagamentos de convênios, contratos e patrocínios às organizações nos 365 dias até a data escolhida.'),
  medida(PASTA.entidades, 'Repasses nos 12 meses anteriores', pagosEntre('d - 730', 'd - 365'), FORMATO.reais, 'Soma os pagamentos às organizações nos 365 dias anteriores, para comparar.'),
  medida(PASTA.entidades, variacaoDe('Repasses em 12 meses'), 'DIVIDE([Repasses em 12 meses] - [Repasses nos 12 meses anteriores], [Repasses nos 12 meses anteriores])', FORMATO.variacao, 'Compara os repasses dos 12 meses com os dos 12 meses anteriores, como o cartão do painel.'),
  medida(PASTA.entidades, 'Repassado no ano', `${COM_DATA}\nRETURN CALCULATE(SUM('Pagamentos dos repasses'[Valor]), 'Pagamentos dos repasses'[Data] <= d, ${REGISTRADA})`, FORMATO.reais, 'Soma os pagamentos às organizações registradas, no ano do gráfico, até a data escolhida.'),
  medida(PASTA.entidades, 'Repassado até a data', `${COM_DATA}\nRETURN CALCULATE(SUM('Pagamentos dos repasses'[Valor]), REMOVEFILTERS('Calendário'), 'Pagamentos dos repasses'[Data] <= d, 'Repasses'[Início] <= d, ${REGISTRADA})`, FORMATO.reais, 'Soma tudo o que foi pago à organização até a data escolhida.'),
  medida(PASTA.entidades, 'Instrumentos vigentes', `${COM_DATA}\nRETURN CALCULATE(COUNTROWS('Repasses'), 'Repasses'[Início] <= d, 'Repasses'[Fim] >= d, ${REGISTRADA}) + 0`, FORMATO.inteiro, 'Conta os convênios, contratos e patrocínios em vigor na data escolhida.'),
  medida(PASTA.entidades, 'Organizações com instrumento vigente', `${COM_DATA}\nRETURN CALCULATE(DISTINCTCOUNT('Repasses'[Organização]), 'Repasses'[Início] <= d, 'Repasses'[Fim] >= d, ${REGISTRADA}) + 0`, FORMATO.inteiro, 'Conta as organizações com ao menos um instrumento em vigor.'),

  // Atendimento.
  medida(PASTA.atendimento, 'Solicitações de atendimento', `${noPeriodo('Solicitações', 'Aberta em', "COUNTROWS('Solicitações')")} + 0`, FORMATO.inteiro, 'Conta as solicitações abertas no período.'),
  medida(PASTA.atendimento, 'Solicitações de empresas', "CALCULATE([Solicitações de atendimento], 'Solicitações'[Solicitante] = \"Empresa\")", FORMATO.inteiro, 'Conta as solicitações do período feitas por empresas.'),
  medida(PASTA.atendimento, 'Resolvidas no prazo', situacao(`${RESOLVIDA} && 'Solicitações'[Resolvida em] <= 'Solicitações'[Prazo]`), FORMATO.inteiro, 'Conta as solicitações do período resolvidas até a data escolhida, dentro do prazo.'),
  medida(PASTA.atendimento, 'Resolvidas com atraso', situacao(`${RESOLVIDA} && 'Solicitações'[Resolvida em] > 'Solicitações'[Prazo]`), FORMATO.inteiro, 'Conta as solicitações do período resolvidas depois do prazo.'),
  medida(PASTA.atendimento, 'Abertas com prazo vencido', situacao(`NOT (${RESOLVIDA}) && 'Solicitações'[Prazo] < d`), FORMATO.inteiro, 'Conta as solicitações do período ainda abertas na data escolhida, com o prazo já vencido.'),
  medida(PASTA.atendimento, 'Abertas no prazo', situacao(`NOT (${RESOLVIDA}) && 'Solicitações'[Prazo] >= d`), FORMATO.inteiro, 'Conta as solicitações do período ainda abertas, dentro do prazo.'),
  medida(PASTA.atendimento, 'Solicitações resolvidas no prazo', 'DIVIDE([Resolvidas no prazo], [Resolvidas no prazo] + [Resolvidas com atraso] + [Abertas com prazo vencido])', FORMATO.parte,
    'Mostra a parte das solicitações do período resolvidas no prazo, entre as resolvidas e as que já passaram do prazo. As abertas ainda no prazo ficam de fora.'),
  medida(PASTA.atendimento, 'Tempo de resolução', noPeriodo('Solicitações', 'Aberta em', "MEDIAN('Solicitações'[Dias até resolver])", "'Solicitações'[Resolvida em] <= d"), dias, 'Mostra o tempo típico (a mediana), em dias, da abertura à resolução das solicitações do período resolvidas até a data escolhida.'),
  medida(PASTA.atendimento, 'Solicitações no mês', noMes("COUNTROWS('Solicitações') + 0"), FORMATO.inteiro, 'Conta as solicitações abertas em cada mês, nos meses do gráfico.'),
  medida(PASTA.atendimento, 'Profissionais ativos', naFoto('Profissionais ativos', "SUM('Profissionais ativos'[Ativos])"), FORMATO.inteiro, 'Conta os profissionais com registro ativo na data escolhida, pelo município onde moram.'),
  medida(PASTA.atendimento, 'Ativos a mais de 50 km', "CALCULATE([Profissionais ativos], 'Municípios'[Distância até a unidade (km)] > 50)", FORMATO.inteiro, 'Conta os profissionais ativos que moram a mais de 50 km, em linha reta, da unidade de atendimento mais próxima.'),
  medida(PASTA.atendimento, 'Moram a mais de 50 km de uma unidade', 'DIVIDE([Ativos a mais de 50 km], [Profissionais ativos])', FORMATO.parte, 'Mostra a parte dos profissionais ativos que moram a mais de 50 km, em linha reta, da unidade mais próxima. Pela estrada, a distância costuma ser de 20% a 40% maior.'),
  medida(PASTA.atendimento, 'Horas disponíveis no período', `${noPeriodo('Meses dos coworkings', 'Mês', "SUM('Meses dos coworkings'[Horas disponíveis])")} + 0`, FORMATO.inteiro, 'Soma as horas de mesa disponíveis nos coworkings no período.'),
  medida(PASTA.atendimento, 'Horas usadas no período', `${noPeriodo('Meses dos coworkings', 'Mês', "SUM('Meses dos coworkings'[Horas usadas])")} + 0`, FORMATO.inteiro, 'Soma as horas de mesa usadas nos coworkings no período.'),
  medida(PASTA.atendimento, 'Custo dos coworkings no período', `${noPeriodo('Meses dos coworkings', 'Mês', "SUM('Meses dos coworkings'[Custo])")} + 0`, FORMATO.reais, 'Soma o custo dos coworkings no período.'),
  medida(PASTA.atendimento, 'Ocupação dos coworkings', 'DIVIDE([Horas usadas no período], [Horas disponíveis no período])', FORMATO.parte, 'Mostra a parte das horas de mesa disponíveis no período que foi usada.'),
  medida(PASTA.atendimento, 'Usuários dos coworkings', `${noPeriodo('Usuários dos coworkings', 'Mês', "DISTINCTCOUNT('Usuários dos coworkings'[Profissional])")} + 0`, FORMATO.inteiro, 'Conta os profissionais que usaram os coworkings no período.'),
  medida(PASTA.atendimento, 'Unidades de coworking', "COUNTROWS('Coworkings') + 0", FORMATO.inteiro, 'Conta as unidades de coworking no recorte.'),

  ...medidasDosCartoes(CARTOES),
];

export const modeloConselho: Modelo = {
  nome: 'Conselho',
  parametros: [{ nome: PASTA_PARAMETRO, valor: 'C:\\CREA-SP\\powerbi\\conselho\\dados\\', descricao: 'Pasta onde estão os CSV do pacote (termina com \\). Troque em Transformar dados > Editar parâmetros e clique em Atualizar.' }],
  tabelas: [...tabelas, { nome: 'Medidas', descricao: 'Guarda as medidas do painel de Gestão do Conselho, em pastas por página.', colunas: [{ nome: 'Medidas', tipo: 'string', oculta: true }], medidas }],
  relacoes: [
    // Nos dois sentidos: escolher um município leva a despesa, as diárias e o pessoal à regional dele.
    { de: ['Municípios', 'GRE'], para: ['Regionais', 'GRE'], ambasDirecoes: true },
    { de: ['Receitas', 'Mês'], para: ['Calendário', 'Mês'] },
    { de: ['Despesas', 'Mês'], para: ['Calendário', 'Mês'] },
    { de: ['Despesas', 'GRE'], para: ['Regionais', 'GRE'] },
    { de: ['Diárias', 'Mês'], para: ['Calendário', 'Mês'] },
    { de: ['Diárias', 'GRE'], para: ['Regionais', 'GRE'] },
    { de: ['Diárias', 'Pessoa'], para: ['Pessoas', 'Pessoa'] },
    { de: ['Empenhos', 'Fornecedor'], para: ['Fornecedores', 'Fornecedor'] },
    { de: ['Empenhos', 'Mês'], para: ['Calendário', 'Mês'] },
    { de: ['Contratos', 'Fornecedor'], para: ['Fornecedores', 'Fornecedor'] },
    { de: ['Títulos', 'Código IBGE'], para: ['Municípios', 'Código IBGE'] },
    { de: ['Foto da dívida', 'Código IBGE'], para: ['Municípios', 'Código IBGE'] },
    { de: ['Processos', 'Câmara'], para: ['Câmaras', 'Câmara'] },
    { de: ['Processos', 'Código IBGE'], para: ['Municípios', 'Código IBGE'] },
    { de: ['Processos', 'Mês de entrada'], para: ['Calendário', 'Mês'] },
    // Inativa: os julgados por mês a ligam com USERELATIONSHIP.
    { de: ['Processos', 'Mês do julgamento'], para: ['Calendário', 'Mês'], inativa: true },
    { de: ['Foto dos processos', 'Processo'], para: ['Processos', 'Processo'] },
    { de: ['Foto do plenário', 'Câmara'], para: ['Câmaras', 'Câmara'] },
    { de: ['Profissionais ativos', 'Código IBGE'], para: ['Municípios', 'Código IBGE'] },
    { de: ['Organizações', 'Código IBGE'], para: ['Municípios', 'Código IBGE'] },
    { de: ['Repasses', 'Organização'], para: ['Organizações', 'Organização'] },
    { de: ['Pagamentos dos repasses', 'Repasse'], para: ['Repasses', 'Repasse'] },
    { de: ['Pagamentos dos repasses', 'Mês'], para: ['Calendário', 'Mês'] },
    { de: ['Solicitações', 'Código IBGE'], para: ['Municípios', 'Código IBGE'] },
    { de: ['Solicitações', 'Mês'], para: ['Calendário', 'Mês'] },
    { de: ['Coworkings', 'Código IBGE'], para: ['Municípios', 'Código IBGE'] },
    { de: ['Meses dos coworkings', 'Unidade'], para: ['Coworkings', 'Unidade'] },
    { de: ['Meses dos coworkings', 'Mês'], para: ['Calendário', 'Mês'] },
    { de: ['Usuários dos coworkings', 'Unidade'], para: ['Coworkings', 'Unidade'] },
    { de: ['Usuários dos coworkings', 'Mês'], para: ['Calendário', 'Mês'] },
  ],
};
