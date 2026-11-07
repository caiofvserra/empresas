import type { Medida, Modelo, Tabela } from '../modelo';
import { COM_DATA, FORMATO, PASTA_PARAMETRO, cartao, data, inteiro, medida, medidasDosCartoes, n, sinal, texto } from '../comum';
import type { Cartao, Comparacao } from '../comum';
import { INDICADORES, indicador } from '../../domain/presidencia';
import type { Indicador, IndicadorId } from '../../domain/presidencia';

/*
 * Modelo do painel da Presidência no Power BI (07/11/2026). A tabela Foto guarda, no último dia de cada mês, cada indicador dos seis
 * painéis em partes (numerador e denominador) pelo lugar e pela câmara, como o HTML guarda. Duas medidas leem a foto do jeito que
 * `recortar` lê no HTML (o teste confere linha a linha): [Numerador] e [Denominador]. Cada indicador tem a sua medida, com o formato
 * da unidade, e as páginas usam essas medidas nos cartões, nas séries de 13 meses e nos gráficos por regional e por câmara.
 *
 * O jeito de ler depende do indicador (coluna Leitura da tabela Indicadores):
 * - Município: soma os municípios do recorte (a regional e o município chegam pela relação com os municípios).
 * - Regional: soma as regionais; com um município escolhido, vale a regional dele.
 * - Estado e regional: sem filtro, a linha do estado; com regional ou município, a linha da regional (as empresas não se somam).
 * - Estado: sempre a linha do estado (receita e orçamento).
 * A câmara escolhida só vale para os indicadores que o painel de origem divide por câmara.
 */
const PASTA = { apoio: 'Apoio', indicadores: 'Indicadores', series: 'Séries de 13 meses', resumo: 'Resumo', riscos: 'Riscos', pais: 'No país' } as const;

const tabelas: Tabela[] = [
  { nome: 'Regionais', arquivo: 'regionais.csv', descricao: 'Tem uma linha para cada uma das 16 gerências regionais do Crea-SP.', colunas: [texto('GRE', { ordenarPor: 'Ordem' }), inteiro('Ordem', { oculta: true })] },
  { nome: 'Municípios', arquivo: 'municipios.csv', descricao: 'Tem os 645 municípios de SP e a GRE de cada um pela tabela oficial. Com um município escolhido, os indicadores que o painel de origem só conhece por regional seguem a regional dele.',
    colunas: [texto('Código IBGE'), texto('Município'), texto('GRE')] },
  { nome: 'Câmaras', arquivo: 'camaras.csv', descricao: 'Tem as nove câmaras especializadas. Escolha uma por vez: as medidas leem a escolha e só a aplicam aos indicadores que o painel de origem divide por câmara.',
    colunas: [texto('Câmara', { ordenarPor: 'Ordem' }), inteiro('Ordem', { oculta: true })] },
  { nome: 'Indicadores', arquivo: 'indicadores.csv', descricao: 'Tem os indicadores dos seis painéis: o painel, a unidade (taxa, contagem ou reais), o jeito de ler a foto, se divide por câmara, a meta padrão do painel e se é o número principal do painel.',
    colunas: [texto('Indicador', { oculta: true }), texto('Nome', { ordenarPor: 'Ordem' }), texto('Painel', { ordenarPor: 'Ordem do painel' }), inteiro('Ordem do painel', { oculta: true }), texto('Unidade'), texto('Tipo'), texto('Leitura'),
      sinal('Divide por câmara'), sinal('Sobe é bom'), { nome: 'Meta', tipo: 'double', formato: '0%' }, sinal('Principal'), inteiro('Ordem', { oculta: true })] },
  { nome: 'Datas de referência', arquivo: 'datas-referencia.csv', descricao: 'Tem os 12 fins de mês antes de hoje e hoje. Não se liga às outras tabelas: a escolha vale para todas as medidas.', colunas: [data('Data'), texto('Rótulo', { ordenarPor: 'Data' })] },
  { nome: 'Datas das fotos', arquivo: 'datas-das-fotos.csv', oculta: true, descricao: 'Tem todas as datas com foto, 12 meses antes da primeira data de referência. As medidas de variação e as séries a usam para ler o indicador em outra data.', colunas: [data('Data')] },
  { nome: 'Meses da série', arquivo: 'meses-da-serie.csv', descricao: 'Tem um fim de mês por linha, para o eixo das séries de 13 meses. Não se liga às outras tabelas: as medidas leem o mês do eixo.',
    colunas: [data('Data', { oculta: true }), texto('Rótulo', { ordenarPor: 'Ordem' }), inteiro('Ordem', { oculta: true })] },
  { nome: 'Foto', arquivo: 'foto.csv', oculta: true, descricao: 'Guarda, no último dia de cada mês, cada indicador em partes (N é o numerador, D o denominador das taxas) pelo nível (município, regional ou estado), pela regional, pelo município e pela câmara. Os fluxos somam os 12 meses até a data.',
    colunas: [data('Data'), texto('Indicador'), texto('Nível'), texto('GRE'), texto('Código IBGE'), texto('Câmara'), { nome: 'N', tipo: 'double' }, { nome: 'D', tipo: 'double' }] },
  // No país: dados públicos reais.
  { nome: 'UFs', arquivo: 'ufs.csv', descricao: 'Tem as 27 unidades da federação: profissionais ativos (Confea SIC), população (IBGE), ativos por 100 mil habitantes, a parte ativa dos registros e a parte de mulheres. Dado real.',
    colunas: [texto('UF'), inteiro('Profissionais ativos', { formato: '#,##0' }), inteiro('População', { formato: '#,##0', oculta: true }), { nome: 'Por 100 mil habitantes', tipo: 'double', formato: '#,##0' },
      { nome: 'Ativos entre os registros (%)', tipo: 'double', formato: '0.0' }, { nome: 'Mulheres (%)', tipo: 'double', formato: '0.0' }] },
  { nome: 'País', arquivo: 'pais.csv', oculta: true, descricao: 'Tem o total do país: profissionais ativos, população e a parte de mulheres. Dado real.',
    colunas: [inteiro('Profissionais ativos'), inteiro('População'), { nome: 'Mulheres (%)', tipo: 'double' }] },
  { nome: 'Exercícios', arquivo: 'exercicios.csv', descricao: 'Tem a receita realizada, a despesa paga e a dotação de cada exercício desde 2013, do Portal da Transparência. O último exercício estava aberto na coleta. Dado real.',
    colunas: [inteiro('Ano'), { nome: 'Receita realizada', tipo: 'double', formato: 'R$ #,##0', oculta: true }, { nome: 'Despesa paga', tipo: 'double', formato: 'R$ #,##0', oculta: true }, { nome: 'Dotação', tipo: 'double', formato: 'R$ #,##0', oculta: true }, sinal('Encerrado')] },
  { nome: 'Contas de receita', arquivo: 'contas-de-receita.csv', descricao: 'Tem as oito maiores contas de receita de 2013 a hoje, com o valor e a parte de cada uma. Dado real.',
    colunas: [texto('Conta', { ordenarPor: 'Ordem' }), { nome: 'Valor', tipo: 'double', formato: 'R$ #,##0', oculta: true }, { nome: 'Parte (%)', tipo: 'double', formato: '0.0', oculta: true }, inteiro('Ordem', { oculta: true })] },
  { nome: 'Registros por ano', arquivo: 'registros-novos.csv', descricao: 'Tem os registros profissionais novos por ano no país e no Crea-SP, pelo SIC do Confea. O Crea-SP aparece separado até 2022. Dado real.',
    colunas: [inteiro('Ano'), inteiro('No país', { oculta: true }), inteiro('No Crea-SP', { oculta: true })] },
];

/* ---------- A leitura da foto ---------- */
/**
 * O numerador ou o denominador do recorte, somado nos indicadores do contexto. Cada indicador escolhe o nível da foto pela coluna
 * Leitura; a regional vem do município escolhido (quando há) ou do filtro de regional; a câmara só vale onde o indicador divide.
 */
const leitura = (coluna: 'N' | 'D') => `${COM_DATA}
VAR cidade = ISFILTERED('Municípios')
VAR gre = IF(cidade, SELECTEDVALUE('Municípios'[GRE]), SELECTEDVALUE('Regionais'[GRE]))
VAR camara = SELECTEDVALUE('Câmaras'[Câmara])
RETURN SUMX(VALUES('Indicadores'[Indicador]),
  VAR forma = LOOKUPVALUE('Indicadores'[Leitura], 'Indicadores'[Indicador], 'Indicadores'[Indicador])
  VAR divide = LOOKUPVALUE('Indicadores'[Divide por câmara], 'Indicadores'[Indicador], 'Indicadores'[Indicador])
  VAR nivel = SWITCH(forma, "Município", "Município", "Regional", "Regional", "Estado e regional", IF(ISBLANK(gre), "Estado", "Regional"), "Estado")
  RETURN IF(nivel = "Município",
    CALCULATE(SUM('Foto'[${coluna}]), 'Foto'[Data] = d, 'Foto'[Nível] = "Município", KEEPFILTERS(divide = 0 || ISBLANK(camara) || 'Foto'[Câmara] = camara)),
    CALCULATE(SUM('Foto'[${coluna}]), 'Foto'[Data] = d, 'Foto'[Nível] = nivel, REMOVEFILTERS('Municípios'), REMOVEFILTERS('Regionais'),
      KEEPFILTERS(nivel = "Estado" || ISBLANK(gre) || 'Foto'[GRE] = gre), KEEPFILTERS(divide = 0 || ISBLANK(camara) || 'Foto'[Câmara] = camara))))`;

const formatoDe = (ind: Indicador) => ind.unidade === 'taxa' ? FORMATO.parte : ind.unidade === 'reais' ? FORMATO.reais : FORMATO.inteiro;
const unidadeTexto = (ind: Indicador) => ind.unidade === 'taxa' ? 'a taxa (numerador sobre denominador)' : ind.unidade === 'reais' ? 'o valor em reais' : 'a contagem';
/** O nome da medida de cada indicador é o nome do indicador; a série de 13 meses leva " no mês". */
export const medidaDe = (id: IndicadorId) => indicador(id).nome;
export const serieDe = (id: IndicadorId) => `${indicador(id).nome} no mês`;

const medidasIndicadores: Medida[] = INDICADORES.flatMap(ind => [
  medida(PASTA.indicadores, ind.nome, `CALCULATE([Valor do indicador], REMOVEFILTERS('Indicadores'), 'Indicadores'[Indicador] = "${ind.id}")`, formatoDe(ind),
    `Mostra ${unidadeTexto(ind)} do indicador "${ind.nome}" do painel de origem, no recorte e na data escolhidos, com a mesma regra do painel.`),
  medida(PASTA.series, `${ind.nome} no mês`, `VAR m = MAX('Meses da série'[Data])\n${COM_DATA}\nRETURN IF(m <= d && m > EOMONTH(d, -13), CALCULATE([${ind.nome}], 'Datas das fotos'[Data] = m))`, formatoDe(ind),
    'Lê o indicador no fim de cada mês do eixo, nos 13 meses até a data escolhida.'),
]);

/* ---------- Cartões ---------- */
const serie = (ind: Indicador): Comparacao => ({ serie: ind.unidade === 'taxa' ? 'taxa' : ind.tipo });
const doIndicador = (pasta: string, id: IndicadorId, detalhe: string): Cartao => cartao(pasta)(medidaDe(id), serie(indicador(id)), detalhe);
const META = (id: IndicadorId) => `"meta de " & FORMAT(CALCULATE(MAX('Indicadores'[Meta]), REMOVEFILTERS('Indicadores'), 'Indicadores'[Indicador] = "${id}"), "0%")`;
const ANO_FECHADO = "VAR ano = CALCULATE(MAX('Exercícios'[Ano]), 'Exercícios'[Encerrado] = 1)";
const noAno = (coluna: string, ano = 'ano') => `CALCULATE(SUM('Exercícios'[${coluna}]), 'Exercícios'[Ano] = ${ano})`;
const NO_SP = (coluna: string) => `CALCULATE(MAX('UFs'[${coluna}]), 'UFs'[UF] = "SP")`;
const rs = (expressao: string) => `FORMAT(${expressao}, "R$ #,##0")`;

/** Os cartões de cada página, como no painel: o número, a comparação com um ano antes e a linha de apoio. */
export const CARTOES = {
  resumo: [
    doIndicador(PASTA.resumo, 'mercado', META('mercado')),
    doIndicador(PASTA.resumo, 'profissionais', `${n('[Registros novos]')} & " registros novos em 12 meses"`),
    doIndicador(PASTA.resumo, 'regularizacao', META('regularizacao')),
    doIndicador(PASTA.resumo, 'receita', '"nos 12 meses até a data; não muda com regional nem câmara"'),
    doIndicador(PASTA.resumo, 'atendimento', META('atendimento')),
    doIndicador(PASTA.resumo, 'pendentes', `${n('[Processos em alerta vermelho]')} & " em alerta vermelho"`),
  ],
  riscos: [
    doIndicador(PASTA.riscos, 'perto', `"de " & ${rs('[Anuidades vencidas]')} & " de anuidades vencidas"`),
    doIndicador(PASTA.riscos, 'prescricao', '"prescrevem em até um ano sem voto"'),
    doIndicador(PASTA.riscos, 'vermelho', '"mais de 120 dias no mesmo status do Votenet"'),
    doIndicador(PASTA.riscos, 'atrasadas', `"de " & ${n('[Protocolos abertos]')} & " protocolos abertos em 12 meses"`),
    doIndicador(PASTA.riscos, 'execucao', '"despesa realizada sobre a prevista até o mês"'),
    doIndicador(PASTA.riscos, 'divida', '"de profissionais e empresas, na data"'),
  ],
  pais: [
    cartao(PASTA.pais)('Profissionais ativos no Crea-SP', undefined, `FORMAT(DIVIDE([Profissionais ativos no Crea-SP], SUM('País'[Profissionais ativos])), "0.0%") & " dos " & ${n("SUM('País'[Profissionais ativos])")} & " do país"`),
    cartao(PASTA.pais)('Profissionais por 100 mil habitantes no Crea-SP', undefined,
      `VAR v = [Profissionais por 100 mil habitantes no Crea-SP]\nRETURN COUNTROWS(FILTER(ALL('UFs'), 'UFs'[Por 100 mil habitantes] > v)) + 1 & "º entre as 27 unidades da federação; no país, " & ${n("DIVIDE(SUM('País'[Profissionais ativos]), SUM('País'[População])) * 100000")}`),
    cartao(PASTA.pais)('Mulheres entre os profissionais do Crea-SP', undefined, `"no país, " & FORMAT(MAX('País'[Mulheres (%)]) / 100, "0.0%")`),
    cartao(PASTA.pais)('Receita do último exercício fechado', { serie: 'fluxo', medida: 'Variação da receita contra o exercício anterior', frase: '" em relação ao exercício anterior"' },
      `${ANO_FECHADO}\nRETURN "em " & ano & "; despesa paga de " & ${rs(noAno('Despesa paga'))}`),
    cartao(PASTA.pais)('Receita que vem da ART', undefined, `${rs("CALCULATE(MAX('Contas de receita'[Valor]), 'Contas de receita'[Ordem] = 1)")} & " de 2013 a hoje, a maior conta de receita"`),
    cartao(PASTA.pais)('Despesa paga sobre a dotação', undefined, `${ANO_FECHADO}\nRETURN "em " & ano & "; dotação de " & ${rs(noAno('Dotação'))}`),
  ],
} satisfies Record<string, Cartao[]>;

const medidas: Medida[] = [
  medida(PASTA.apoio, 'Data escolhida', "IF(ISFILTERED('Datas das fotos'[Data]), MAX('Datas das fotos'[Data]), MAX('Datas de referência'[Data]))", 'dd/mm/yyyy',
    'Devolve a data de referência escolhida; sem escolha, hoje. As medidas de variação e as séries trocam a data pela de outro mês.'),
  medida(PASTA.apoio, 'Numerador', leitura('N'), '#,##0.##', 'Soma o numerador da foto no recorte, com o jeito de ler de cada indicador (coluna Leitura) e a câmara só onde o indicador divide.'),
  medida(PASTA.apoio, 'Denominador', leitura('D'), '#,##0.##', 'Soma o denominador da foto no recorte, com a mesma regra do numerador. Só as taxas têm denominador.'),
  medida(PASTA.apoio, 'Valor do indicador', `VAR u = SELECTEDVALUE('Indicadores'[Unidade])\nRETURN IF(u = "taxa", DIVIDE([Numerador], [Denominador]), [Numerador])`, '#,##0.##',
    'Mostra o número do indicador do contexto: a taxa é o numerador sobre o denominador; a contagem e o valor são o numerador.'),
  medida(PASTA.apoio, 'Número', `VAR u = SELECTEDVALUE('Indicadores'[Unidade])\nVAR v = [Valor do indicador]\nRETURN IF(ISBLANK(v), BLANK(), SWITCH(u, "taxa", FORMAT(v, "0.0%"), "reais", FORMAT(v, "R$ #,##0"), FORMAT(v, "#,##0")))`, FORMATO.texto,
    'Escreve o número do indicador com o formato da unidade, para as tabelas que misturam indicadores.'),
  medida(PASTA.apoio, 'Em um ano', `VAR u = SELECTEDVALUE('Indicadores'[Unidade])\nVAR alvo = EOMONTH([Data escolhida], -12)\nVAR agora = [Valor do indicador]\nVAR antes = CALCULATE([Valor do indicador], 'Datas das fotos'[Data] = alvo)
RETURN IF(ISBLANK(agora) || ISBLANK(antes), BLANK(), IF(u = "taxa", FORMAT((agora - antes) * 100, "+0.0;-0.0;0.0") & " p.p.", IF(antes = 0, BLANK(), FORMAT(DIVIDE(agora - antes, antes), "+0%;-0%;0%"))))`, FORMATO.texto,
    'Escreve a variação contra o fim do mesmo mês um ano antes: em pontos percentuais nas taxas e em porcentagem nas contagens e nos valores.'),
  medida(PASTA.apoio, 'Meta do painel', `VAR m = SELECTEDVALUE('Indicadores'[Meta])\nRETURN IF(ISBLANK(m), BLANK(), FORMAT(m, "0%"))`, FORMATO.texto, 'Escreve a meta padrão do painel, nos indicadores que têm meta.'),
  ...medidasIndicadores,

  // No país.
  medida(PASTA.pais, 'Profissionais ativos no Crea-SP', NO_SP('Profissionais ativos'), FORMATO.inteiro, 'Conta os profissionais ativos no Crea-SP pelo SIC do Confea.'),
  medida(PASTA.pais, 'Profissionais por 100 mil habitantes no Crea-SP', NO_SP('Por 100 mil habitantes'), FORMATO.inteiro, 'Divide os ativos do Crea-SP pela população de SP (IBGE), vezes 100 mil.'),
  medida(PASTA.pais, 'Mulheres entre os profissionais do Crea-SP', `${NO_SP('Mulheres (%)')} / 100`, FORMATO.parte, 'Mostra a parte de mulheres entre os profissionais ativos do Crea-SP, pelo SIC.'),
  medida(PASTA.pais, 'Profissionais por 100 mil habitantes', "DIVIDE(SUM('UFs'[Profissionais ativos]), SUM('UFs'[População])) * 100000", FORMATO.inteiro, 'Divide os ativos de cada unidade da federação do eixo pela população, vezes 100 mil.'),
  medida(PASTA.pais, 'Receita do último exercício fechado', `${ANO_FECHADO}\nRETURN ${noAno('Receita realizada')}`, FORMATO.reais, 'Soma a receita realizada do último exercício encerrado, pelo Portal da Transparência.'),
  medida(PASTA.pais, 'Variação da receita contra o exercício anterior', `${ANO_FECHADO}\nVAR agora = ${noAno('Receita realizada')}\nVAR antes = ${noAno('Receita realizada', 'ano - 1')}\nRETURN IF(antes > 0, DIVIDE(agora - antes, antes))`, FORMATO.variacao,
    'Compara a receita do último exercício encerrado com a do anterior.'),
  medida(PASTA.pais, 'Receita que vem da ART', "CALCULATE(MAX('Contas de receita'[Parte (%)]), 'Contas de receita'[Ordem] = 1) / 100", FORMATO.parte, 'Mostra a parte da receita de 2013 a hoje que veio da conta de ART, a maior.'),
  medida(PASTA.pais, 'Despesa paga sobre a dotação', `${ANO_FECHADO}\nRETURN DIVIDE(${noAno('Despesa paga')}, ${noAno('Dotação')})`, FORMATO.parte, 'Divide a despesa paga pela dotação do último exercício encerrado.'),
  medida(PASTA.pais, 'Receita realizada no exercício', "SUM('Exercícios'[Receita realizada])", FORMATO.reais, 'Soma a receita realizada de cada exercício do eixo.'),
  medida(PASTA.pais, 'Despesa paga no exercício', "SUM('Exercícios'[Despesa paga])", FORMATO.reais, 'Soma a despesa paga de cada exercício do eixo.'),
  medida(PASTA.pais, 'Dotação do exercício', "SUM('Exercícios'[Dotação])", FORMATO.reais, 'Soma a dotação do orçamento de cada exercício do eixo.'),
  medida(PASTA.pais, 'Valor da conta de receita', "SUM('Contas de receita'[Valor])", FORMATO.reais, 'Soma a receita de cada conta do eixo, de 2013 a hoje.'),
  medida(PASTA.pais, 'Registros novos no país', "SUM('Registros por ano'[No país])", FORMATO.inteiro, 'Soma os registros profissionais novos no país em cada ano do eixo.'),
  medida(PASTA.pais, 'Registros novos no Crea-SP', "SUM('Registros por ano'[No Crea-SP])", FORMATO.inteiro, 'Soma os registros profissionais novos no Crea-SP em cada ano do eixo.'),
  medida(PASTA.pais, 'Parte do Crea-SP nos registros novos', 'DIVIDE([Registros novos no Crea-SP], [Registros novos no país])', FORMATO.parte, 'Divide os registros novos do Crea-SP pelos do país.'),

  ...medidasDosCartoes(CARTOES),
];

export const modeloPresidencia: Modelo = {
  nome: 'Presidencia',
  parametros: [{ nome: PASTA_PARAMETRO, valor: 'C:\\CREA-SP\\powerbi\\presidencia\\dados\\', descricao: 'Pasta onde estão os CSV do pacote (termina com \\). Troque em Transformar dados > Editar parâmetros e clique em Atualizar.' }],
  tabelas: [...tabelas, { nome: 'Medidas', descricao: 'Guarda as medidas do painel, em pastas por página.', colunas: [{ nome: 'Medidas', tipo: 'string', oculta: true }], medidas }],
  relacoes: [
    { de: ['Municípios', 'GRE'], para: ['Regionais', 'GRE'] },
    { de: ['Foto', 'Código IBGE'], para: ['Municípios', 'Código IBGE'] },
    { de: ['Foto', 'Indicador'], para: ['Indicadores', 'Indicador'] },
  ],
};
