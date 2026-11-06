import type { Coluna, Medida, Modelo, Tabela } from '../modelo';
import { BLOCOS_PARCERIA, medidaDoBloco } from './dados';

/*
 * Modelo do painel de Empresas no Power BI: as tabelas de `dados.ts`, as relações do esquema estrela e as medidas DAX
 * dos cartões e gráficos, em pastas com o nome de cada página. Estoques e taxas leem a foto da data escolhida; fluxos
 * somam os fatos do período (ADR 0002). `tests/powerbi-empresas.test.ts` reproduz estas regras sobre os CSV e confere
 * com os números do protótipo.
 */
const texto = (nome: string, extra: Partial<Coluna> = {}): Coluna => ({ nome, tipo: 'string', ...extra });
const inteiro = (nome: string, extra: Partial<Coluna> = {}): Coluna => ({ nome, tipo: 'int64', formato: '0', ...extra });
const data = (nome: string, extra: Partial<Coluna> = {}): Coluna => ({ nome, tipo: 'dateTime', formato: 'dd/mm/yyyy', ...extra });
const sinal = (nome: string): Coluna => ({ nome, tipo: 'int64', formato: '0', oculta: true });

export const PASTA_PARAMETRO = 'Pasta dos dados';
/** Meses do cenário de demonstração, o limite do período. */
const MESES_NA_BASE = 36;

const tabelas: Tabela[] = [
  { nome: 'Regionais', arquivo: 'regionais.csv', descricao: 'As 16 gerências regionais do Crea-SP.', colunas: [texto('GRE', { ordenarPor: 'Ordem' }), inteiro('Ordem', { oculta: true })] },
  { nome: 'Municípios', arquivo: 'municipios.csv', descricao: 'Os 645 municípios de SP e a GRE de cada um, pela tabela oficial.', colunas: [texto('Código IBGE'), texto('Município'), texto('GRE')] },
  { nome: 'Empresas', arquivo: 'empresas.csv', descricao: 'Uma linha por empresa (raiz do CNPJ). Câmara pela atividade principal da matriz; município, porte e situação na Receita também da matriz.',
    colunas: [texto('Empresa'), texto('Raiz do CNPJ'), texto('Razão social'), texto('Porte'), texto('Câmara'), texto('Situação na Receita'), texto('Código IBGE', { oculta: true }), sinal('Só visto (sede fora de SP)')] },
  { nome: 'Estabelecimentos', arquivo: 'estabelecimentos.csv', descricao: 'Uma linha por CNPJ completo. A atividade da lista é a principal, ou a primeira secundária quando a principal não está na lista do Crea-SP.',
    colunas: [texto('Estabelecimento'), texto('Empresa', { oculta: true }), texto('CNPJ'), texto('Matriz ou filial'), texto('Código IBGE', { oculta: true }), texto('Atividade principal'), texto('Atividade da lista'), texto('Câmara da atividade'), texto('Classe'), data('Aberto em'), texto('Situação na Receita')] },
  { nome: 'Calendário', arquivo: 'calendario.csv', descricao: 'Um mês por linha, para os gráficos mês a mês.', colunas: [data('Mês', { formato: 'mmm/yy' }), texto('Rótulo', { ordenarPor: 'Mês' }), texto('Trimestre'), inteiro('Ano'), inteiro('Ordem', { oculta: true })] },
  { nome: 'Datas de referência', arquivo: 'datas-referencia.csv', descricao: 'Os fins de mês em que a base pode ser lida, e hoje. Sem relação com as outras tabelas: a escolha vale para todas as medidas.', colunas: [data('Data'), texto('Rótulo', { ordenarPor: 'Data' })] },
  { nome: 'Datas das fotos', arquivo: 'datas-das-fotos.csv', oculta: true, descricao: 'Todas as datas com foto, inclusive os 12 meses antes da primeira data de referência. As medidas de variação a usam para ler o mesmo indicador um ano antes.', colunas: [data('Data')] },
  { nome: 'Período', calculada: `GENERATESERIES(1, ${MESES_NA_BASE}, 1)`, descricao: 'Número de meses somados nos fluxos, contados para trás a partir da data de referência. É um parâmetro de intervalo numérico, de 1 a 36 meses.', colunas: [inteiro('Meses', { origem: '[Value]', parametro: true })] },
  { nome: 'Foto das empresas', arquivo: 'foto-empresas.csv', oculta: true, descricao: 'Situação de cada empresa no último dia de cada mês, calculada pelas regras do painel. Uma linha por empresa registrada naquele dia ou 12 meses antes.',
    colunas: [data('Data'), data('Mês'), texto('Empresa'), ...['Registrada', 'Anuidade vencida', 'Com RT', 'RT saiu sem substituto', 'Sem vínculo de RT', 'RT cancelado ou interrompido', 'Cadastro incompleto', 'Registrada 12 meses antes', 'Continua registrada'].map(sinal), inteiro('Estabelecimentos registrados', { oculta: true }), inteiro('Vistos', { oculta: true })] },
  { nome: 'Foto dos estabelecimentos', arquivo: 'foto-estabelecimentos.csv', oculta: true, descricao: 'Estabelecimentos com atividade da lista abertos até o último dia de cada mês: se estão no mercado (ativos na Receita) e a situação no cadastro naquele dia.',
    colunas: [data('Data'), texto('Estabelecimento'), sinal('No mercado'), texto('Situação no cadastro'), sinal('Registro ativo')] },
  { nome: 'Entradas e saídas', arquivo: 'entradas-saidas.csv', oculta: true, descricao: 'Empresas que passaram a ter registro ativo (entrada) ou deixaram de ter (saída), por mês.', colunas: [texto('Empresa'), data('Mês'), texto('Movimento'), sinal('Primeira vez'), sinal('Após fiscalização')] },
  { nome: 'ARTs', arquivo: 'arts.csv', oculta: true, descricao: 'ARTs registradas por empresas.', colunas: [texto('ART'), texto('Empresa'), data('Data'), data('Mês'), { nome: 'Valor', tipo: 'double', formato: 'R$ #,##0', oculta: true }, texto('Modalidade')] },
  { nome: 'Emprego formal', arquivo: 'emprego.csv', oculta: true, descricao: 'Empregados com carteira em ocupações de engenharia no fim de cada mês, por regional, pela RAIS (Relação Anual de Informações Sociais) e pelo Novo CAGED (Cadastro Geral de Empregados e Desempregados).', colunas: [data('Mês'), texto('GRE'), inteiro('Empregados', { oculta: true })] },
  { nome: 'Parcerias', arquivo: 'parcerias.csv', descricao: 'Demonstração dos blocos que dependem de acordo ("!"), na data de hoje do cenário. Não muda com a data de referência nem com os filtros.',
    colunas: [texto('Bloco'), texto('Grupo'), texto('Série'), { nome: 'Valor', tipo: 'double', formato: '#,##0', oculta: true }, inteiro('Ordem', { oculta: true })] },
];

/* ---------- Medidas ---------- */
const D = "VAR d = [Data escolhida]";
const foto = (filtro: string) => `${D}\nRETURN CALCULATE(SUM('Foto das empresas'[${filtro}]), 'Foto das empresas'[Data] = d)`;
const registradasCom = (sinalNome: string) => `${D}\nRETURN CALCULATE(COUNTROWS('Foto das empresas'), 'Foto das empresas'[Data] = d, 'Foto das empresas'[Registrada] = 1, 'Foto das empresas'[${sinalNome}] = 1)`;
const estab = (...filtros: string[]) => `${D}\nRETURN CALCULATE(COUNTROWS('Foto dos estabelecimentos'), 'Foto dos estabelecimentos'[Data] = d${filtros.map(row => `, ${row}`).join('')})`;
const NO_MERCADO = "'Foto dos estabelecimentos'[No mercado] = 1", VIGENTE = "'Foto dos estabelecimentos'[Situação no cadastro] = \"Com registro ou visto\"", OBRIGATORIO = "'Estabelecimentos'[Classe] = \"Registro obrigatório\"";
const periodo = `${D}\nVAR inicio = [Início do período]`;
/** O mesmo período um ano antes: início e fim recuados 12 meses (EDATE leva o dia 31 ao último dia do mês, como o painel). */
const UM_ANO_ANTES = 'VAR inicio = EDATE([Início do período], -12)\nVAR fim = EDATE([Data escolhida], -12)';
/** Entradas ou saídas contadas no contexto, com filtros a mais. */
const contaMovimento = (tipo: 'Entrada' | 'Saída', ...filtros: string[]) => `CALCULATE(COUNTROWS('Entradas e saídas'), 'Entradas e saídas'[Movimento] = "${tipo}"${filtros.map(row => `, ${row}`).join('')}) + 0`;
const movimento = (tipo: 'Entrada' | 'Saída', ...filtros: string[]) => `${periodo}\nRETURN ${contaMovimento(tipo, "'Entradas e saídas'[Mês] >= inicio", "'Entradas e saídas'[Mês] <= d", ...filtros)}`;
/** Primeiro dia do mês que começa um período de `n` meses terminado na data `d`. */
const inicioDe = (n: string) => `DATE(YEAR(d), MONTH(d) - ${n} + 1, 1)`;
/**
 * Medida mês a mês para o eixo do calendário: só os meses do gráfico (24 meses, ou o período quando passa de 24). O filtro
 * entra mês a mês, então o trimestre da tabela de calor soma só os meses do gráfico e os outros ficam em branco.
 */
const noMes = (expressao: string) => {
  const dentro = "KEEPFILTERS('Calendário'[Mês] >= inicio && 'Calendário'[Mês] <= d)";
  return `${D}\nVAR mes = MAX('Calendário'[Mês])\nVAR inicio = ${inicioDe('MAX(24, [Meses do período])')}\nVAR meses = CALCULATE(COUNTROWS('Calendário'), ${dentro})\nRETURN IF(meses > 0, CALCULATE(${expressao}, ${dentro}))`;
};

const m = (pasta: string, nome: string, dax: string, formato: string, descricao: string): Medida => ({ nome, dax, formato, pasta, descricao });
const R = 'Registro e mercado', E = 'Evolução', T = 'RT e ART', V = 'Vínculos', A = 'Apoio';
const INT = '#,##0', PCT = '0.0%', REAIS = 'R$ #,##0', VAR_PCT = '+0.0%;-0.0%;0.0%', PP = '+0.0;-0.0;0.0';

/**
 * Os cinco cartões de cada página, com o tipo do indicador: estoque e fluxo variam em %, taxa em pontos percentuais
 * (`variacaoAnual` do painel). Sem tipo, o cartão não mostra variação, como no painel. `paginas.ts` monta os cartões daqui.
 */
type Cartao = { nome: string; tipo?: 'estoque' | 'fluxo' | 'taxa'; variacaoPropria?: boolean; pasta: string };
const cartao = (pasta: string) => (nome: string, tipo?: Cartao['tipo'], variacaoPropria = false): Cartao => ({ nome, tipo, variacaoPropria, pasta });
const [cr, ce, ct] = [cartao(R), cartao(E), cartao(T)];
export const CARTOES = {
  registro: [cr('Empresas registradas', 'estoque'), cr('Parte do mercado que está registrada', 'taxa'), cr('Atividade obrigatória e nenhum registro', 'estoque'), cr('Registradas em dia com a anuidade', 'taxa'), cr('Registradas com cadastro incompleto')],
  evolucao: [ce('Empresas que entraram na base', 'fluxo'), ce('Empresas que saíram da base', 'fluxo'), ce('Empresas de engenharia abertas no período', 'fluxo'), ce('Continuam registradas depois de 12 meses', 'taxa'), ce('Emprego formal em engenharia', 'estoque')],
  'rt-art': [ct('Empresas com responsável técnico', 'taxa'), ct('RT que saiu sem substituto', 'estoque'), ct('ARTs de empresas', 'fluxo', true), ct('Valor declarado em ART', 'fluxo', true), ct('Registradas sem nenhuma ART', 'taxa')],
} satisfies Record<string, Cartao[]>;
/** Nome da medida de variação de um cartão. */
export const variacaoDe = (nome: string) => `Variação em um ano: ${nome}`;
/** Rótulo da variação embaixo do número do cartão. */
export const rotuloDaVariacao = (tipo: Cartao['tipo']) => tipo === 'taxa' ? 'pontos percentuais em relação a um ano antes' : 'em relação a um ano antes';
/**
 * A mesma medida lida com a data trocada pelo fim do mesmo mês um ano antes (a tabela oculta Datas das fotos tem essas datas).
 * No fluxo, o período continua com o mesmo número de meses. A data entra numa variável antes do CALCULATE, que muda o contexto.
 */
const variacaoGenerica = (nome: string, tipo: NonNullable<Cartao['tipo']>) => [
  'VAR alvo = EOMONTH([Data escolhida], -12)', `VAR agora = [${nome}]`, `VAR antes = CALCULATE([${nome}], 'Datas das fotos'[Data] = alvo)`,
  tipo === 'taxa' ? 'RETURN IF(NOT ISBLANK(agora) && NOT ISBLANK(antes), (agora - antes) * 100)' : 'RETURN IF(antes > 0, DIVIDE(agora - antes, antes))',
].join('\n');

const medidas: Medida[] = [
  // Apoio: data, período e metas.
  m(A, 'Data escolhida', "IF(ISFILTERED('Datas das fotos'[Data]), MAX('Datas das fotos'[Data]), MAX('Datas de referência'[Data]))", 'dd/mm/yyyy', 'A data de referência escolhida; sem escolha, a mais recente. As medidas de variação trocam a data pela de um ano antes.'),
  m(A, 'Meses do período', "SELECTEDVALUE('Período'[Meses], 12)", '0', 'O período escolhido, em meses; 12 quando nada está escolhido.'),
  m(A, 'Início do período', `${D}\nRETURN ${inicioDe('[Meses do período]')}`, 'dd/mm/yyyy', 'Primeiro dia do primeiro mês do período: o período termina na data escolhida e começa no primeiro dia do mês, como no painel.'),
  m(A, 'Meta da parte do mercado registrada', '0.65', PCT, 'A meta padrão da parte do mercado registrada é 65%, a mesma do painel.'),
  m(A, 'Meta de RT', '0.95', PCT, 'A meta padrão de empresas registradas com responsável técnico é 95%, porque o RT é condição do registro (Lei 5.194/66, art. 8º, parágrafo único).'),

  // Registro e mercado.
  m(R, 'Empresas registradas', foto('Registrada'), INT, 'Empresas, contadas pela raiz do CNPJ, com ao menos um registro ou visto ativo na data escolhida.'),
  m(R, 'Estabelecimentos registrados', foto('Estabelecimentos registrados'), INT, 'CNPJs completos com registro ou visto vigente na data escolhida.'),
  m(R, 'Vistos de empresas de fora de SP', foto('Vistos'), INT, 'Vistos vigentes de empresas registradas em outro Crea.'),
  m(R, 'Estabelecimentos no mercado', estab(NO_MERCADO), INT, 'Estabelecimentos ativos na Receita com atividade da lista do Crea-SP, abertos até a data escolhida.'),
  m(R, 'Estabelecimentos do mercado com registro', estab(NO_MERCADO, VIGENTE), INT, 'Estabelecimentos do mercado com registro ou visto vigente na data escolhida.'),
  m(R, 'Estabelecimentos do mercado só com histórico', estab(NO_MERCADO, "'Foto dos estabelecimentos'[Situação no cadastro] = \"Só teve registro no passado\""), INT, 'Estabelecimentos do mercado que já tiveram registro, mas não o têm na data escolhida.'),
  m(R, 'Estabelecimentos do mercado sem registro', estab(NO_MERCADO, "'Foto dos estabelecimentos'[Situação no cadastro] = \"Nunca apareceu no cadastro\""), INT, 'Estabelecimentos do mercado que nunca apareceram no cadastro até a data escolhida.'),
  m(R, 'Parte do mercado que está registrada', 'DIVIDE([Estabelecimentos do mercado com registro], [Estabelecimentos no mercado])', PCT, 'Parte dos estabelecimentos do mercado com registro ou visto vigente na data escolhida. Atividade da lista não prova obrigação de registro.'),
  m(R, 'Distância da meta da parte registrada', '([Parte do mercado que está registrada] - [Meta da parte do mercado registrada]) * 100', PP, 'Mostra, em pontos percentuais, quanto a parte do mercado registrada está acima ou abaixo da meta.'),
  m(R, 'Parte registrada nas atividades de registro obrigatório', `DIVIDE(CALCULATE([Estabelecimentos do mercado com registro], ${OBRIGATORIO}), CALCULATE([Estabelecimentos no mercado], ${OBRIGATORIO}))`, PCT, 'Mostra a mesma parte, só nas atividades de registro obrigatório.'),
  m(R, 'Atividade obrigatória e nenhum registro', `CALCULATE([Estabelecimentos do mercado sem registro], ${OBRIGATORIO})`, INT, 'Estabelecimentos ativos na Receita com atividade de registro obrigatório que nunca tiveram registro ou visto no Crea-SP. Não estar no cadastro não quer dizer irregular.'),
  m(R, 'Registradas com anuidade vencida', registradasCom('Anuidade vencida'), INT, 'Empresas registradas com anuidade vencida e não paga na data escolhida.'),
  m(R, 'Registradas sem anuidade vencida', '[Empresas registradas] - [Registradas com anuidade vencida]', INT, 'Empresas registradas sem anuidade vencida na data escolhida.'),
  m(R, 'Registradas em dia com a anuidade', 'DIVIDE([Empresas registradas] - [Registradas com anuidade vencida], [Empresas registradas])', PCT, 'Parte das empresas registradas sem anuidade vencida na data escolhida.'),
  m(R, 'Registradas com cadastro incompleto', registradasCom('Cadastro incompleto'), INT, 'Empresas registradas com pendência aberta no cadastro (atividade não informada, regional não identificada, município diferente do da Receita, CNPJ baixado).'),

  // Evolução.
  m(E, 'Empresas que entraram na base', movimento('Entrada'), INT, 'Empresas que passaram a ter registro ativo no período, pela primeira vez ou de volta depois de uma baixa ou um cancelamento.'),
  m(E, 'Entraram pela primeira vez', movimento('Entrada', "'Entradas e saídas'[Primeira vez] = 1"), INT, 'Entradas do período em que o primeiro registro da empresa é do próprio mês.'),
  m(E, 'Retornos', '[Empresas que entraram na base] - [Entraram pela primeira vez]', INT, 'Conta as entradas de empresas que já tinham tido registro.'),
  m(E, 'Entradas após fiscalização', movimento('Entrada', "'Entradas e saídas'[Após fiscalização] = 1"), INT, 'Entradas no mesmo mês em que uma ação de fiscalização de registro da empresa foi regularizada.'),
  m(E, 'Empresas que saíram da base', movimento('Saída'), INT, 'Empresas cujo registro deixou de estar ativo no período (baixa ou cancelamento).'),
  m(E, 'Saldo de empresas no período', '[Empresas que entraram na base] - [Empresas que saíram da base]', '+#,##0;-#,##0;0', 'Mostra quantas empresas entraram a mais do que saíram no período.'),
  m(E, 'Empresas de engenharia abertas no período', `${periodo}\nRETURN CALCULATE(COUNTROWS('Estabelecimentos'), 'Estabelecimentos'[Classe] <> "", 'Estabelecimentos'[Aberto em] >= inicio, 'Estabelecimentos'[Aberto em] <= d) + 0`, INT, 'Estabelecimentos com atividade da lista do Crea-SP abertos na Receita no período. O arquivo da Receita chega com atraso: o último mês pode faltar.'),
  m(E, 'Abertas no período que já se registraram', `${periodo}\nRETURN CALCULATE(COUNTROWS('Foto dos estabelecimentos'), 'Foto dos estabelecimentos'[Data] = d, 'Foto dos estabelecimentos'[Registro ativo] = 1, 'Estabelecimentos'[Aberto em] >= inicio, 'Estabelecimentos'[Aberto em] <= d) + 0`, INT, 'Conta as abertas no período que têm registro ativo na data escolhida.'),
  m(E, 'Parte das abertas que já se registrou', 'DIVIDE([Abertas no período que já se registraram], [Empresas de engenharia abertas no período])', PCT, 'Mostra a parte das abertas no período que já se registrou.'),
  m(E, 'Registradas 12 meses antes', foto('Registrada 12 meses antes'), INT, 'Conta as empresas que estavam registradas 12 meses antes da data escolhida; é a base da permanência.'),
  m(E, 'Continuam registradas depois de 12 meses', 'DIVIDE([Registradas 12 meses antes que continuam], [Registradas 12 meses antes])', PCT, 'Das empresas registradas 12 meses antes da data escolhida, a parte que continua registrada. Quem entrou depois não conta.'),
  m(E, 'Registradas 12 meses antes que continuam', foto('Continua registrada'), INT, 'Conta as registradas 12 meses antes que continuam registradas na data escolhida.'),
  m(E, 'Emprego formal em engenharia', `${D}\nRETURN CALCULATE(SUM('Emprego formal'[Empregados]), 'Emprego formal'[Mês] = DATE(YEAR(d), MONTH(d), 1))`, INT, 'Conta os empregados com carteira em ocupações de engenharia no mês da data escolhida. A fonte, a RAIS (Relação Anual de Informações Sociais) com o Novo CAGED (Cadastro Geral de Empregados e Desempregados), sai em totais por regional.'),
  m(E, 'Entradas no mês', noMes(contaMovimento('Entrada')), INT, 'Conta as entradas de cada mês, nos meses do gráfico.'),
  m(E, 'Entradas no mês após fiscalização', noMes(contaMovimento('Entrada', "'Entradas e saídas'[Após fiscalização] = 1")), INT, 'Conta as entradas de cada mês que vieram depois de uma ação de fiscalização.'),
  m(E, 'Primeiros registros no mês', noMes(contaMovimento('Entrada', "'Entradas e saídas'[Primeira vez] = 1")), INT, 'Conta as empresas que fizeram o primeiro registro no Crea-SP em cada mês (ou trimestre), nos meses do gráfico.'),
  m(E, 'Saídas no mês', noMes(contaMovimento('Saída')), INT, 'Conta as saídas de cada mês, nos meses do gráfico.'),
  m(E, 'Registradas no fim do mês', noMes("SUM('Foto das empresas'[Registrada])"), INT, 'Conta as empresas registradas no último dia de cada mês, só nos meses com foto.'),

  // RT e ART.
  m(T, 'Empresas com responsável técnico', 'DIVIDE([Registradas com RT], [Empresas registradas])', PCT, 'Parte das empresas registradas com responsável técnico de vínculo vigente na data escolhida.'),
  m(T, 'Distância da meta de RT', '([Empresas com responsável técnico] - [Meta de RT]) * 100', PP, 'Mostra, em pontos percentuais, quanto a parte com RT está acima ou abaixo da meta.'),
  m(T, 'Registradas sem RT vigente', '[Empresas registradas] - [Registradas com RT]', INT, 'Empresas registradas sem responsável técnico de vínculo vigente: o RT saiu sem substituto ou nenhum vínculo foi carregado.'),
  m(T, 'Registradas com RT', registradasCom('Com RT'), INT, 'Empresas registradas com responsável técnico de vínculo vigente.'),
  m(T, 'RT que saiu sem substituto', registradasCom('RT saiu sem substituto'), INT, 'Empresas registradas cujo último responsável técnico saiu há mais de 30 dias, sem outro no lugar.'),
  m(T, 'Sem vínculo de RT carregado', registradasCom('Sem vínculo de RT'), INT, 'Conta as empresas registradas que não têm RT nem vínculo carregado no cadastro.'),
  m(T, 'RT com registro cancelado ou interrompido', registradasCom('RT cancelado ou interrompido'), INT, 'Empresas com RT cujo profissional está com registro cancelado ou interrompido na data escolhida.'),
  m(T, 'ARTs de empresas', `${periodo}\nRETURN CALCULATE(COUNTROWS('ARTs'), 'ARTs'[Data] >= inicio, 'ARTs'[Data] <= d) + 0`, INT, 'Conta as ARTs registradas por empresas no período.'),
  m(T, 'ARTs um ano antes', `${UM_ANO_ANTES}\nRETURN CALCULATE(COUNTROWS('ARTs'), 'ARTs'[Data] >= inicio, 'ARTs'[Data] <= fim) + 0`, INT, 'Conta as ARTs do mesmo período um ano antes, com início e fim recuados 12 meses.'),
  m(T, variacaoDe('ARTs de empresas'), 'DIVIDE([ARTs de empresas] - [ARTs um ano antes], [ARTs um ano antes])', VAR_PCT, 'Compara as ARTs do período com as do mesmo período um ano antes, como o cartão do painel.'),
  m(T, 'Valor declarado em ART', `${periodo}\nRETURN CALCULATE(SUM('ARTs'[Valor]), 'ARTs'[Data] >= inicio, 'ARTs'[Data] <= d) + 0`, REAIS, 'Soma o valor de contrato declarado nas ARTs do período.'),
  m(T, 'Valor em ART um ano antes', `${UM_ANO_ANTES}\nRETURN CALCULATE(SUM('ARTs'[Valor]), 'ARTs'[Data] >= inicio, 'ARTs'[Data] <= fim) + 0`, REAIS, 'Soma o valor declarado nas ARTs do mesmo período um ano antes.'),
  m(T, variacaoDe('Valor declarado em ART'), 'DIVIDE([Valor declarado em ART] - [Valor em ART um ano antes], [Valor em ART um ano antes])', VAR_PCT, 'Compara o valor declarado no período com o do mesmo período um ano antes, como o cartão do painel.'),
  m(T, 'Registradas com ART no período', `${periodo}\nVAR registradas = CALCULATETABLE(VALUES('Foto das empresas'[Empresa]), 'Foto das empresas'[Data] = d, 'Foto das empresas'[Registrada] = 1)\nVAR comArt = CALCULATETABLE(VALUES('ARTs'[Empresa]), 'ARTs'[Data] >= inicio, 'ARTs'[Data] <= d)\nRETURN COUNTROWS(INTERSECT(registradas, comArt)) + 0`, INT, 'Empresas registradas na data escolhida com ao menos uma ART no período.'),
  m(T, 'Registradas sem ART no período', '[Empresas registradas] - [Registradas com ART no período]', INT, 'Conta as empresas registradas que não registraram nenhuma ART no período.'),
  m(T, 'Registradas sem nenhuma ART', 'DIVIDE([Registradas sem ART no período], [Empresas registradas])', PCT, 'Parte das empresas registradas sem nenhuma ART no período.'),
  m(T, 'ARTs no mês', noMes("CALCULATE(COUNTROWS('ARTs')) + 0"), INT, 'Conta as ARTs registradas em cada mês, nos meses do gráfico.'),
  m(T, 'ARTs no mesmo mês do ano anterior', noMes("CALCULATE(COUNTROWS('ARTs'), REMOVEFILTERS('Calendário'), 'ARTs'[Mês] = EDATE(mes, -12)) + 0"), INT, 'Conta as ARTs do mesmo mês um ano antes, para comparar.'),

  // Vínculos ("!": dependem de acordo).
  ...BLOCOS_PARCERIA.map(bloco => m(V, medidaDoBloco(bloco), `CALCULATE(SUM('Parcerias'[Valor]), 'Parcerias'[Bloco] = "${bloco.bloco}")`, INT,
    bloco.acordo ? `Demonstração: o bloco depende de acordo com ${bloco.acordo}. Os números são do cenário na data de hoje e não mudam com a data de referência nem com os filtros.`
      : 'Liga pelo CNPJ as fontes abertas da ANEEL (Agência Nacional de Energia Elétrica), da ANP (Agência Nacional do Petróleo), da ANM (Agência Nacional de Mineração) e do BNDES. Os números são do cenário na data de hoje.')),

  // A variação de cada cartão contra um ano antes, como o painel mostra embaixo do número.
  ...Object.values(CARTOES).flat().filter(cartao => cartao.tipo && !cartao.variacaoPropria).map(({ nome, tipo, pasta }) => m(pasta, variacaoDe(nome), variacaoGenerica(nome, tipo!), tipo === 'taxa' ? PP : VAR_PCT,
    tipo === 'taxa' ? `Mostra, em pontos percentuais, quanto o cartão mudou desde o fim do mesmo mês um ano antes.`
      : tipo === 'fluxo' ? 'Compara o cartão com o mesmo número de meses terminados no fim do mesmo mês um ano antes.' : 'Compara o cartão com o fim do mesmo mês um ano antes.')),
];

export const modeloEmpresas: Modelo = {
  nome: 'Empresas',
  parametros: [{ nome: PASTA_PARAMETRO, valor: 'C:\\CREA-SP\\powerbi\\empresas\\dados\\', descricao: 'Pasta onde estão os CSV do pacote (termina com \\). Troque em Transformar dados > Editar parâmetros e clique em Atualizar.' }],
  tabelas: [...tabelas, { nome: 'Medidas', descricao: 'Medidas do painel de Empresas, em pastas por página.', colunas: [{ nome: 'Medidas', tipo: 'string', oculta: true }], medidas }],
  relacoes: [
    // Nos dois sentidos: escolher um município leva o emprego formal à regional dele, como no painel.
    { de: ['Municípios', 'GRE'], para: ['Regionais', 'GRE'], ambasDirecoes: true },
    { de: ['Empresas', 'Código IBGE'], para: ['Municípios', 'Código IBGE'] },
    { de: ['Estabelecimentos', 'Empresa'], para: ['Empresas', 'Empresa'] },
    { de: ['Foto das empresas', 'Empresa'], para: ['Empresas', 'Empresa'] },
    { de: ['Foto dos estabelecimentos', 'Estabelecimento'], para: ['Estabelecimentos', 'Estabelecimento'] },
    { de: ['Entradas e saídas', 'Empresa'], para: ['Empresas', 'Empresa'] },
    { de: ['Entradas e saídas', 'Mês'], para: ['Calendário', 'Mês'] },
    { de: ['ARTs', 'Empresa'], para: ['Empresas', 'Empresa'] },
    { de: ['ARTs', 'Mês'], para: ['Calendário', 'Mês'] },
    { de: ['Foto das empresas', 'Mês'], para: ['Calendário', 'Mês'] },
    { de: ['Emprego formal', 'GRE'], para: ['Regionais', 'GRE'] },
    { de: ['Emprego formal', 'Mês'], para: ['Calendário', 'Mês'] },
  ],
};
