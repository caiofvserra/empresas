import type { Coluna, Medida, Modelo, Tabela } from '../modelo';

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

const tabelas: Tabela[] = [
  { nome: 'Regionais', arquivo: 'regionais.csv', descricao: 'As 16 gerências regionais do Crea-SP.', colunas: [texto('GRE', { ordenarPor: 'Ordem' }), inteiro('Ordem', { oculta: true })] },
  { nome: 'Municípios', arquivo: 'municipios.csv', descricao: 'Os 645 municípios de SP e a GRE de cada um, pela tabela oficial.', colunas: [texto('Código IBGE'), texto('Município'), texto('GRE')] },
  { nome: 'Empresas', arquivo: 'empresas.csv', descricao: 'Uma linha por empresa (raiz do CNPJ). Câmara pela atividade principal da matriz; município, porte e situação na Receita também da matriz.',
    colunas: [texto('Empresa'), texto('Raiz do CNPJ'), texto('Razão social'), texto('Porte'), texto('Câmara'), texto('Situação na Receita'), texto('Código IBGE', { oculta: true }), sinal('Só visto (sede fora de SP)')] },
  { nome: 'Estabelecimentos', arquivo: 'estabelecimentos.csv', descricao: 'Uma linha por CNPJ completo. A atividade da lista é a principal, ou a primeira secundária quando a principal não está na lista do Crea-SP.',
    colunas: [texto('Estabelecimento'), texto('Empresa', { oculta: true }), texto('CNPJ'), texto('Matriz ou filial'), texto('Código IBGE', { oculta: true }), texto('Atividade principal'), texto('Atividade da lista'), texto('Câmara da atividade'), texto('Classe'), data('Aberto em'), texto('Situação na Receita')] },
  { nome: 'Calendário', arquivo: 'calendario.csv', descricao: 'Um mês por linha, para os gráficos mês a mês.', colunas: [data('Mês', { formato: 'mmm/yy' }), texto('Rótulo', { ordenarPor: 'Mês' }), texto('Trimestre'), inteiro('Ano'), inteiro('Ordem', { oculta: true })] },
  { nome: 'Datas de referência', arquivo: 'datas-referencia.csv', descricao: 'Os fins de mês em que a base pode ser lida. Sem relação com as outras tabelas: a escolha vale para todas as medidas.', colunas: [data('Data'), texto('Rótulo', { ordenarPor: 'Data' })] },
  { nome: 'Período', arquivo: 'periodo.csv', descricao: 'Número de meses somados nos fluxos, contados para trás a partir da data de referência (parâmetro de intervalo numérico).', colunas: [inteiro('Meses')] },
  { nome: 'Foto das empresas', arquivo: 'foto-empresas.csv', oculta: true, descricao: 'Situação de cada empresa no último dia de cada mês, calculada pelas regras do painel. Uma linha por empresa registrada naquele dia ou 12 meses antes.',
    colunas: [data('Data'), data('Mês'), texto('Empresa'), ...['Registrada', 'Anuidade vencida', 'Com RT', 'RT saiu sem substituto', 'Sem vínculo de RT', 'RT cancelado ou interrompido', 'Cadastro incompleto', 'Registrada 12 meses antes', 'Continua registrada'].map(sinal), inteiro('Estabelecimentos registrados', { oculta: true }), inteiro('Vistos', { oculta: true })] },
  { nome: 'Foto dos estabelecimentos', arquivo: 'foto-estabelecimentos.csv', oculta: true, descricao: 'Estabelecimentos com atividade da lista abertos até o último dia de cada mês: se estão no mercado (ativos na Receita) e a situação no cadastro naquele dia.',
    colunas: [data('Data'), texto('Estabelecimento'), sinal('No mercado'), texto('Situação no cadastro'), sinal('Registro ativo')] },
  { nome: 'Entradas e saídas', arquivo: 'entradas-saidas.csv', oculta: true, descricao: 'Empresas que passaram a ter registro ativo (entrada) ou deixaram de ter (saída), por mês.', colunas: [texto('Empresa'), data('Mês'), texto('Movimento'), sinal('Primeira vez'), sinal('Após fiscalização')] },
  { nome: 'ARTs', arquivo: 'arts.csv', oculta: true, descricao: 'ARTs registradas por empresas.', colunas: [texto('ART'), texto('Empresa'), data('Data'), data('Mês'), { nome: 'Valor', tipo: 'double', formato: 'R$ #,##0', oculta: true }, texto('Modalidade')] },
  { nome: 'Emprego formal', arquivo: 'emprego.csv', oculta: true, descricao: 'Empregados com carteira em ocupações de engenharia no fim de cada mês, por regional (RAIS e Novo CAGED em totais).', colunas: [data('Mês'), texto('GRE'), inteiro('Empregados', { oculta: true })] },
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
const movimento = (tipo: string, ...filtros: string[]) => `${periodo}\nRETURN CALCULATE(COUNTROWS('Entradas e saídas'), 'Entradas e saídas'[Movimento] = "${tipo}", 'Entradas e saídas'[Mês] >= inicio, 'Entradas e saídas'[Mês] <= d${filtros.map(row => `, ${row}`).join('')}) + 0`;
/** Um ano antes: a mesma medida lida no fim do mesmo mês do ano anterior. */
const umAnoAntes = (sinalNome: string) => `VAR antes = EOMONTH([Data escolhida], -12)\nRETURN CALCULATE(SUM('Foto das empresas'[${sinalNome}]), 'Foto das empresas'[Data] = antes)`;
/** Medida mês a mês para o eixo do calendário: só os meses da janela do gráfico (24 meses, ou o período quando passa de 24). */
const noMes = (expressao: string) => `${D}\nVAR mes = MAX('Calendário'[Mês])\nVAR n = MAX(24, [Meses do período])\nVAR inicio = DATE(YEAR(d), MONTH(d) - n + 1, 1)\nRETURN IF(mes >= inicio && mes <= d, ${expressao})`;

const m = (pasta: string, nome: string, dax: string, formato: string, descricao: string): Medida => ({ nome, dax, formato, pasta, descricao });
const R = 'Registro e mercado', E = 'Evolução', T = 'RT e ART', V = 'Vínculos', A = 'Apoio';
const INT = '#,##0', PCT = '0.0%', REAIS = '"R$" #,##0', VAR_PCT = '+0.0%;-0.0%;0.0%', PP = '+0.0" p.p.";-0.0" p.p.";0.0" p.p."';

const medidas: Medida[] = [
  // Apoio: data, período e metas.
  m(A, 'Data escolhida', "MAX('Datas de referência'[Data])", 'dd/mm/yyyy', 'A data de referência escolhida; sem escolha, a mais recente.'),
  m(A, 'Meses do período', "SELECTEDVALUE('Período'[Meses], 12)", '0', 'O período escolhido, em meses; 12 quando nada está escolhido.'),
  m(A, 'Início do período', `${D}\nRETURN DATE(YEAR(d), MONTH(d) - [Meses do período] + 1, 1)`, 'dd/mm/yyyy', 'Primeiro dia do primeiro mês do período: o período termina na data escolhida e começa no primeiro dia do mês, como no painel.'),
  m(A, 'Meta de cobertura', '0.65', PCT, 'Meta padrão da parte do mercado registrada (65%), a mesma do painel.'),
  m(A, 'Meta de RT', '0.95', PCT, 'Meta padrão de empresas registradas com responsável técnico (95%): o RT é condição do registro (Lei 5.194/66, art. 8º, parágrafo único).'),
  m(A, 'Rótulo do recorte', `"Data de referência: " & FORMAT([Data escolhida], "dd/mm/yyyy") & " · período de " & [Meses do período] & " meses"`, '', 'Texto para o rodapé das páginas.'),

  // Registro e mercado.
  m(R, 'Empresas registradas', foto('Registrada'), INT, 'Empresas, contadas pela raiz do CNPJ, com ao menos um registro ou visto ativo na data escolhida.'),
  m(R, 'Empresas registradas há um ano', umAnoAntes('Registrada'), INT, 'Empresas registradas no fim do mesmo mês do ano anterior.'),
  m(R, 'Variação das registradas em um ano', "DIVIDE([Empresas registradas] - [Empresas registradas há um ano], [Empresas registradas há um ano])", VAR_PCT, 'Variação contra o mesmo mês do ano anterior.'),
  m(R, 'Estabelecimentos registrados', foto('Estabelecimentos registrados'), INT, 'CNPJs completos com registro ou visto vigente na data escolhida.'),
  m(R, 'Vistos de empresas de fora de SP', foto('Vistos'), INT, 'Vistos vigentes de empresas registradas em outro Crea.'),
  m(R, 'Estabelecimentos no mercado', estab(NO_MERCADO), INT, 'Estabelecimentos ativos na Receita com atividade da lista do Crea-SP, abertos até a data escolhida.'),
  m(R, 'Estabelecimentos do mercado com registro', estab(NO_MERCADO, VIGENTE), INT, 'Estabelecimentos do mercado com registro ou visto vigente na data escolhida.'),
  m(R, 'Estabelecimentos do mercado só com histórico', estab(NO_MERCADO, "'Foto dos estabelecimentos'[Situação no cadastro] = \"Só teve registro no passado\""), INT, 'Estabelecimentos do mercado que já tiveram registro, mas não o têm na data escolhida.'),
  m(R, 'Estabelecimentos do mercado sem registro', estab(NO_MERCADO, "'Foto dos estabelecimentos'[Situação no cadastro] = \"Nunca apareceu no cadastro\""), INT, 'Estabelecimentos do mercado que nunca apareceram no cadastro até a data escolhida.'),
  m(R, 'Parte do mercado que está registrada', 'DIVIDE([Estabelecimentos do mercado com registro], [Estabelecimentos no mercado])', PCT, 'Parte dos estabelecimentos do mercado com registro ou visto vigente na data escolhida. Atividade da lista não prova obrigação de registro.'),
  m(R, 'Distância da meta de cobertura', '([Parte do mercado que está registrada] - [Meta de cobertura]) * 100', PP, 'Diferença, em pontos percentuais, entre a parte do mercado registrada e a meta.'),
  m(R, 'Parte registrada nas atividades de registro obrigatório', `DIVIDE(CALCULATE([Estabelecimentos do mercado com registro], ${OBRIGATORIO}), CALCULATE([Estabelecimentos no mercado], ${OBRIGATORIO}))`, PCT, 'A mesma parte, só nas atividades de registro obrigatório.'),
  m(R, 'Atividade obrigatória e nenhum registro', `CALCULATE([Estabelecimentos do mercado sem registro], ${OBRIGATORIO})`, INT, 'Estabelecimentos ativos na Receita com atividade de registro obrigatório que nunca tiveram registro ou visto no Crea-SP. Não estar no cadastro não quer dizer irregular.'),
  m(R, 'Registradas com anuidade vencida', registradasCom('Anuidade vencida'), INT, 'Empresas registradas com anuidade vencida e não paga na data escolhida.'),
  m(R, 'Registradas sem anuidade vencida', '[Empresas registradas] - [Registradas com anuidade vencida]', INT, 'Empresas registradas sem anuidade vencida na data escolhida.'),
  m(R, 'Registradas em dia com a anuidade', 'DIVIDE([Empresas registradas] - [Registradas com anuidade vencida], [Empresas registradas])', PCT, 'Parte das empresas registradas sem anuidade vencida na data escolhida.'),
  m(R, 'Registradas com cadastro incompleto', registradasCom('Cadastro incompleto'), INT, 'Empresas registradas com pendência aberta no cadastro (atividade não informada, regional não identificada, município diferente do da Receita, CNPJ baixado).'),

  // Evolução.
  m(E, 'Empresas que entraram na base', movimento('Entrada'), INT, 'Empresas que passaram a ter registro ativo no período, pela primeira vez ou de volta depois de uma baixa ou um cancelamento.'),
  m(E, 'Entraram pela primeira vez', movimento('Entrada', "'Entradas e saídas'[Primeira vez] = 1"), INT, 'Entradas do período em que o primeiro registro da empresa é do próprio mês.'),
  m(E, 'Retornos', '[Empresas que entraram na base] - [Entraram pela primeira vez]', INT, 'Entradas de empresas que já tinham tido registro.'),
  m(E, 'Entradas após fiscalização', movimento('Entrada', "'Entradas e saídas'[Após fiscalização] = 1"), INT, 'Entradas no mesmo mês em que uma ação de fiscalização de registro da empresa foi regularizada.'),
  m(E, 'Empresas que saíram da base', movimento('Saída'), INT, 'Empresas cujo registro deixou de estar ativo no período (baixa ou cancelamento).'),
  m(E, 'Saldo de empresas no período', '[Empresas que entraram na base] - [Empresas que saíram da base]', '+#,##0;-#,##0;0', 'Entradas menos saídas no período.'),
  m(E, 'Empresas de engenharia abertas no período', `${periodo}\nRETURN CALCULATE(COUNTROWS('Estabelecimentos'), 'Estabelecimentos'[Classe] <> "", 'Estabelecimentos'[Aberto em] >= inicio, 'Estabelecimentos'[Aberto em] <= d) + 0`, INT, 'Estabelecimentos com atividade da lista do Crea-SP abertos na Receita no período. O arquivo da Receita chega com atraso: o último mês pode faltar.'),
  m(E, 'Abertas no período que já se registraram', `${periodo}\nRETURN CALCULATE(COUNTROWS('Foto dos estabelecimentos'), 'Foto dos estabelecimentos'[Data] = d, 'Foto dos estabelecimentos'[Registro ativo] = 1, 'Estabelecimentos'[Aberto em] >= inicio, 'Estabelecimentos'[Aberto em] <= d) + 0`, INT, 'Das abertas no período, as que têm registro ativo na data escolhida.'),
  m(E, 'Parte das abertas que já se registrou', 'DIVIDE([Abertas no período que já se registraram], [Empresas de engenharia abertas no período])', PCT, 'Parte das abertas no período que já se registrou.'),
  m(E, 'Registradas 12 meses antes', foto('Registrada 12 meses antes'), INT, 'Empresas registradas 12 meses antes da data escolhida (a coorte da permanência).'),
  m(E, 'Continuam registradas depois de 12 meses', 'DIVIDE([Registradas 12 meses antes que continuam], [Registradas 12 meses antes])', PCT, 'Das empresas registradas 12 meses antes da data escolhida, a parte que continua registrada. Quem entrou depois não conta.'),
  m(E, 'Registradas 12 meses antes que continuam', foto('Continua registrada'), INT, 'Das registradas 12 meses antes, as que continuam registradas na data escolhida.'),
  m(E, 'Emprego formal em engenharia', `${D}\nRETURN CALCULATE(SUM('Emprego formal'[Empregados]), 'Emprego formal'[Mês] = DATE(YEAR(d), MONTH(d), 1))`, INT, 'Empregados com carteira em ocupações de engenharia no mês da data escolhida. Sai em totais por regional.'),
  m(E, 'Entradas no mês', noMes("CALCULATE(COUNTROWS('Entradas e saídas'), 'Entradas e saídas'[Movimento] = \"Entrada\") + 0"), INT, 'Entradas de cada mês, nos meses do gráfico.'),
  m(E, 'Entradas no mês após fiscalização', noMes("CALCULATE(COUNTROWS('Entradas e saídas'), 'Entradas e saídas'[Movimento] = \"Entrada\", 'Entradas e saídas'[Após fiscalização] = 1) + 0"), INT, 'Entradas de cada mês que vieram depois de uma ação de fiscalização.'),
  m(E, 'Primeiros registros no mês', noMes("CALCULATE(COUNTROWS('Entradas e saídas'), 'Entradas e saídas'[Movimento] = \"Entrada\", 'Entradas e saídas'[Primeira vez] = 1) + 0"), INT, 'Empresas que fizeram o primeiro registro no Crea-SP em cada mês (ou trimestre), nos meses do gráfico.'),
  m(E, 'Saídas no mês', noMes("CALCULATE(COUNTROWS('Entradas e saídas'), 'Entradas e saídas'[Movimento] = \"Saída\") + 0"), INT, 'Saídas de cada mês, nos meses do gráfico.'),
  m(E, 'Registradas no fim do mês', noMes("SUM('Foto das empresas'[Registrada])"), INT, 'Empresas registradas no último dia de cada mês (só nos meses com foto).'),

  // RT e ART.
  m(T, 'Empresas com responsável técnico', 'DIVIDE([Registradas com RT], [Empresas registradas])', PCT, 'Parte das empresas registradas com responsável técnico de vínculo vigente na data escolhida.'),
  m(T, 'Distância da meta de RT', '([Empresas com responsável técnico] - [Meta de RT]) * 100', PP, 'Diferença, em pontos percentuais, entre a parte com RT e a meta.'),
  m(T, 'Registradas sem RT vigente', '[Empresas registradas] - [Registradas com RT]', INT, 'Empresas registradas sem responsável técnico de vínculo vigente: o RT saiu sem substituto ou nenhum vínculo foi carregado.'),
  m(T, 'Registradas com RT', registradasCom('Com RT'), INT, 'Empresas registradas com responsável técnico de vínculo vigente.'),
  m(T, 'RT que saiu sem substituto', registradasCom('RT saiu sem substituto'), INT, 'Empresas registradas cujo último responsável técnico saiu há mais de 30 dias, sem outro no lugar.'),
  m(T, 'Sem vínculo de RT carregado', registradasCom('Sem vínculo de RT'), INT, 'Empresas registradas sem RT e sem vínculo carregado no cadastro.'),
  m(T, 'RT com registro cancelado ou interrompido', registradasCom('RT cancelado ou interrompido'), INT, 'Empresas com RT cujo profissional está com registro cancelado ou interrompido na data escolhida.'),
  m(T, 'ARTs de empresas', `${periodo}\nRETURN CALCULATE(COUNTROWS('ARTs'), 'ARTs'[Data] >= inicio, 'ARTs'[Data] <= d) + 0`, INT, 'ARTs registradas por empresas no período.'),
  m(T, 'ARTs um ano antes', `${UM_ANO_ANTES}\nRETURN CALCULATE(COUNTROWS('ARTs'), 'ARTs'[Data] >= inicio, 'ARTs'[Data] <= fim) + 0`, INT, 'ARTs no mesmo período um ano antes (início e fim recuados 12 meses).'),
  m(T, 'Variação das ARTs', 'DIVIDE([ARTs de empresas] - [ARTs um ano antes], [ARTs um ano antes])', VAR_PCT, 'Variação contra o mesmo período do ano anterior.'),
  m(T, 'Valor declarado em ART', `${periodo}\nRETURN CALCULATE(SUM('ARTs'[Valor]), 'ARTs'[Data] >= inicio, 'ARTs'[Data] <= d) + 0`, REAIS, 'Soma do valor de contrato declarado nas ARTs do período.'),
  m(T, 'Valor em ART um ano antes', `${UM_ANO_ANTES}\nRETURN CALCULATE(SUM('ARTs'[Valor]), 'ARTs'[Data] >= inicio, 'ARTs'[Data] <= fim) + 0`, REAIS, 'Valor declarado no mesmo período um ano antes.'),
  m(T, 'Variação do valor em ART', 'DIVIDE([Valor declarado em ART] - [Valor em ART um ano antes], [Valor em ART um ano antes])', VAR_PCT, 'Variação contra o mesmo período do ano anterior.'),
  m(T, 'Registradas com ART no período', `${periodo}\nVAR registradas = CALCULATETABLE(VALUES('Foto das empresas'[Empresa]), 'Foto das empresas'[Data] = d, 'Foto das empresas'[Registrada] = 1)\nVAR comArt = CALCULATETABLE(VALUES('ARTs'[Empresa]), 'ARTs'[Data] >= inicio, 'ARTs'[Data] <= d)\nRETURN COUNTROWS(INTERSECT(registradas, comArt)) + 0`, INT, 'Empresas registradas na data escolhida com ao menos uma ART no período.'),
  m(T, 'Registradas sem ART no período', '[Empresas registradas] - [Registradas com ART no período]', INT, 'Empresas registradas e nenhuma ART registrada no período.'),
  m(T, 'Registradas sem nenhuma ART', 'DIVIDE([Registradas sem ART no período], [Empresas registradas])', PCT, 'Parte das empresas registradas sem nenhuma ART no período.'),
  m(T, 'ARTs no mês', noMes("CALCULATE(COUNTROWS('ARTs')) + 0"), INT, 'ARTs registradas em cada mês, nos meses do gráfico.'),
  m(T, 'ARTs no mesmo mês do ano anterior', noMes("CALCULATE(COUNTROWS('ARTs'), REMOVEFILTERS('Calendário'), 'ARTs'[Mês] = EDATE(mes, -12)) + 0"), INT, 'ARTs no mesmo mês um ano antes, para comparar.'),

  // Vínculos ("!": dependem de acordo).
  ...([['Sócios que são profissionais', 'Receita Federal (CPF completo dos sócios)'], ['Nome com engenharia e diretoria', 'Receita Federal (CPF completo dos sócios)'], ['Usinas, postos, minas e financiamentos', ''], ['Empregados técnicos por empresa', 'Ministério do Trabalho (RAIS identificada)'], ['Credenciadas no DETRAN-SP e no INMETRO', 'DETRAN-SP e INMETRO'], ['Engenharia incluída no contrato social', 'Junta Comercial (JUCESP)']] as const)
    .map(([bloco, acordo]) => m(V, `${acordo ? '! ' : ''}${bloco}`, `CALCULATE(SUM('Parcerias'[Valor]), 'Parcerias'[Bloco] = "${bloco}")`, INT,
      acordo ? `Demonstração: depende de acordo com ${acordo}. Números do cenário na data de hoje; não mudam com a data de referência nem com os filtros.` : 'Fontes abertas (ANEEL, ANP, ANM, BNDES) ligadas pelo CNPJ. Números do cenário na data de hoje.')),
];

export const modeloEmpresas: Modelo = {
  nome: 'Empresas',
  parametros: [{ nome: PASTA_PARAMETRO, valor: 'C:\\CREA-SP\\powerbi\\empresas\\dados\\', descricao: 'Pasta onde estão os CSV do pacote (termina com \\). Troque em Transformar dados > Editar parâmetros e clique em Atualizar.' }],
  tabelas: [...tabelas, { nome: 'Medidas', descricao: 'Medidas do painel de Empresas, em pastas por página.', colunas: [{ nome: 'Medidas', tipo: 'string', oculta: true }], medidas }],
  relacoes: [
    { de: ['Municípios', 'GRE'], para: ['Regionais', 'GRE'] },
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
