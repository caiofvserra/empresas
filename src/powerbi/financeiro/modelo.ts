import type { Medida, Modelo, Tabela } from '../modelo';
import { COM_DATA, COM_PERIODO, FORMATO, MESES_NA_BASE, PASTA_PARAMETRO, cartao, data, filtrosExtras, inteiro, medida, medidasDeApoio, medidasDosCartoes, n, noMes, parte, reais, sinal, texto } from '../comum';
import type { Cartao } from '../comum';
import ativosUf from '../../../public/data/engineer-statistics/confea-uf.json';

/*
 * Modelo do painel Financeiro no Power BI (07/11/2026): as tabelas de `dados.ts`, as relações do esquema estrela e as medidas DAX
 * dos cartões e gráficos das quatro páginas (Arrecadação, Receita, Dívida e cobrança, Orçamento e despesa), em pastas com o nome
 * de cada página. A receita, a despesa, o orçamento, as diárias, os fornecedores e os contratos são reais e do estado inteiro: a
 * regional e o município não os mudam. A arrecadação segue o recorte pelo peso de cada município em cada tipo de receita
 * (`Parte do recorte`, a `parteDoRecorte` do painel); a dívida e a adimplência, pelo município do devedor. Estoques (dívida,
 * adimplência, contratos vigentes) leem a foto da data escolhida; fluxos somam o período (ADR 0002).
 * `tests/powerbi-financeiro.test.ts` reproduz estas regras sobre os CSV e confere com as funções das páginas.
 */
const PASTA = { apoio: 'Apoio', arrecadacao: 'Arrecadação', receita: 'Receita', divida: 'Dívida e cobrança', orcamento: 'Orçamento e despesa' } as const;
/** Profissionais ativos em SP no Confea, para a receita e a despesa por profissional ativo, como o painel. */
export const ATIVOS_SP = ativosUf.data.valores.find(row => row.ufCodigo === '35')!.valor;

const tabelas: Tabela[] = [
  // Dimensões.
  { nome: 'Regionais', arquivo: 'regionais.csv', descricao: 'Tem uma linha para cada uma das 16 gerências regionais do Crea-SP.', colunas: [texto('GRE', { ordenarPor: 'Ordem' }), inteiro('Ordem', { oculta: true })] },
  { nome: 'Municípios', arquivo: 'municipios.csv', descricao: 'Tem os 645 municípios de SP e a GRE de cada um pela tabela oficial. A regional e o município recortam a arrecadação (pelo peso do município), a dívida e a adimplência; a receita, a despesa e o orçamento são do estado inteiro.',
    colunas: [texto('Código IBGE'), texto('Município'), texto('GRE')] },
  { nome: 'Calendário', arquivo: 'calendario.csv', descricao: 'Tem um mês por linha, de 2013 (o primeiro ano da Transparência) até 12 meses depois de hoje, para os gráficos mês a mês e ano a ano e os contratos que terminam.',
    colunas: [data('Mês', { formato: 'mmm/yy' }), texto('Rótulo', { ordenarPor: 'Mês' }), inteiro('Ano'), inteiro('Mês do ano', { oculta: true }), texto('Nome do mês', { ordenarPor: 'Mês do ano' }), inteiro('Ordem', { oculta: true })] },
  { nome: 'Dias', arquivo: 'dias.csv', descricao: 'Tem cada dia dos meses com arrecadação diária, com a semana do mês, o dia da semana e se é dia útil (sem fins de semana e feriados nacionais, de SP e móveis).',
    colunas: [data('Dia'), data('Mês', { oculta: true }), inteiro('Dia do mês'), inteiro('Semana do mês'), texto('Dia da semana', { ordenarPor: 'Ordem do dia da semana' }), inteiro('Ordem do dia da semana', { oculta: true }), sinal('Útil')] },
  { nome: 'Datas de referência', arquivo: 'datas-referencia.csv', descricao: 'Tem os fins de mês em que a base pode ser lida, e hoje. Não se liga às outras tabelas: a escolha vale para todas as medidas.', colunas: [data('Data'), texto('Rótulo', { ordenarPor: 'Data' })] },
  { nome: 'Datas das fotos', arquivo: 'datas-das-fotos.csv', oculta: true, descricao: 'Tem todas as datas com foto, inclusive os meses antes da primeira data de referência. As medidas de variação a usam para ler o mesmo indicador um ano antes.', colunas: [data('Data')] },
  { nome: 'Período', calculada: `GENERATESERIES(1, ${MESES_NA_BASE}, 1)`, descricao: 'Guarda o número de meses somados nos fluxos, contados para trás a partir da data de referência. No Power BI Desktop, é um parâmetro do tipo "Intervalo numérico", de 1 a 36 meses.', colunas: [inteiro('Meses', { origem: '[Value]', parametro: true })] },
  { nome: 'Tipos de receita', arquivo: 'tipos-receita.csv', descricao: 'Tem os cinco tipos de receita do painel: anuidades, ART, dívida ativa, multas e serviços e outras.', colunas: [texto('Tipo', { ordenarPor: 'Ordem' }), inteiro('Ordem', { oculta: true })] },
  { nome: 'Grupos de despesa', arquivo: 'grupos-despesa.csv', descricao: 'Tem os dez grupos de despesa do painel, pela conta contábil.', colunas: [texto('Grupo', { ordenarPor: 'Ordem' }), inteiro('Ordem', { oculta: true })] },

  // Reais, da Transparência do Crea-SP.
  { nome: 'Receitas', arquivo: 'receitas.csv', descricao: 'Guarda a receita realizada de cada mês desde 2013, por tipo, da Transparência do Crea-SP (dado real, do estado inteiro).', colunas: [data('Mês', { oculta: true }), texto('Tipo', { oculta: true }), reais('Valor')] },
  { nome: 'Despesas', arquivo: 'despesas.csv', descricao: 'Guarda a despesa empenhada de cada mês desde 2013, por grupo, da Transparência do Crea-SP (dado real, do estado inteiro).', colunas: [data('Mês', { oculta: true }), texto('Grupo', { oculta: true }), reais('Valor')] },
  { nome: 'Orçamento', arquivo: 'orcamento.csv', oculta: true, descricao: 'Guarda o orçamento de cada ano, inicial e reformulado (atual), da receita por tipo e da despesa por grupo (dado real).',
    colunas: [inteiro('Ano'), texto('Natureza'), texto('Grupo'), reais('Inicial'), reais('Atual')] },
  { nome: 'Metas', arquivo: 'metas.csv', oculta: true, descricao: 'Guarda a meta de arrecadação de cada mês por tipo: a receita orçada reformulada do ano dividida no ritmo do ano anterior, até a TI informar a meta oficial.',
    colunas: [data('Mês'), texto('Tipo'), reais('Meta')] },
  { nome: 'Pessoas', arquivo: 'pessoas.csv', descricao: 'Tem quem recebeu diária, jeton ou deslocamento nos últimos 37 meses, pelo nome publicado nos pagamentos da Transparência, com a categoria (conselheiro, empregado, inspetor, colaborador, jeton). O CPF não é gravado.',
    colunas: [texto('Pessoa', { oculta: true }), texto('Nome'), texto('Categoria')] },
  { nome: 'Diárias', arquivo: 'diarias.csv', oculta: true, descricao: 'Guarda o valor pago a cada pessoa em cada mês e o número de pagamentos.', colunas: [data('Mês'), texto('Pessoa'), reais('Valor'), inteiro('Pagamentos')] },
  { nome: 'Fornecedores', arquivo: 'fornecedores.csv', descricao: 'Tem as 150 empresas que mais receberam do Crea-SP nos últimos 37 meses (sem a folha e a cota-parte), pela razão social e o CNPJ, com o objeto mais frequente.', colunas: [texto('Fornecedor', { oculta: true }), texto('Nome'), texto('CNPJ'), texto('Objeto')] },
  { nome: 'Pagamentos', arquivo: 'pagamentos.csv', oculta: true, descricao: 'Guarda o pago a cada fornecedor em cada mês.', colunas: [data('Mês'), texto('Fornecedor'), reais('Valor')] },
  { nome: 'Contratos', arquivo: 'contratos.csv', descricao: 'Tem os contratos do Crea-SP publicados na Transparência, com a contratada, o CNPJ, o valor e a vigência.',
    colunas: [texto('Contrato'), texto('Contratada'), texto('CNPJ'), reais('Valor'), data('Início'), data('Fim')] },

  // Demonstrativas, do cenário.
  { nome: 'Arrecadação', arquivo: 'arrecadacao.csv', oculta: true, descricao: 'Guarda a receita de cada dia útil por tipo. O total de cada mês é o real; a divisão pelos dias é demonstrativa (em produção, a baixa dos boletos no CreaNet).', colunas: [data('Dia'), texto('Tipo'), reais('Valor')] },
  { nome: 'Pesos', arquivo: 'pesos.csv', oculta: true, descricao: 'Guarda o peso de cada município em cada tipo de receita, para dividir a arrecadação do estado pelo recorte (demonstrativo: anuidade pelos ativos, ART pelos estabelecimentos e um terço dos ativos, dívida ativa pelo vencido, multa pelas ações de fiscalização). O peso vem em milésimos, inteiro, para o CSV não arredondar os municípios pequenos; só a razão entre os pesos conta.',
    colunas: [texto('Código IBGE'), texto('Tipo'), inteiro('Peso', { oculta: true })] },
  { nome: 'Títulos', arquivo: 'titulos.csv', oculta: true, descricao: 'Guarda cada anuidade de profissional e cada boleto de empresa vencidos até hoje, com a data e os dias até o pagamento.',
    colunas: [texto('Título'), texto('Devedor'), texto('Tipo de devedor'), texto('Código IBGE'), data('Vencimento'), reais('Valor'), data('Pago em'), inteiro('Dias até o pagamento')] },
  { nome: 'Foto da dívida', arquivo: 'foto-divida.csv', descricao: 'Guarda a dívida de anuidade no último dia de cada mês: uma linha por devedor e idade da anuidade, com o valor vencido e não pago, se o devedor está acima do piso de execução, a parte perto de prescrever, a situação do CNPJ das empresas e se o devedor pode ir a protesto.',
    colunas: [data('Data', { oculta: true }), texto('Devedor', { oculta: true }), texto('Tipo de devedor'), texto('Código IBGE', { oculta: true }), texto('Idade da anuidade', { ordenarPor: 'Ordem da idade' }), inteiro('Ordem da idade', { oculta: true }),
      reais('Valor'), sinal('Acima do piso'), reais('Perto de prescrever'), texto('Situação do CNPJ'), sinal('Protestável')] },
  { nome: 'Categorias de protesto', arquivo: 'categorias-protesto.csv', descricao: 'Tem as categorias do que vai a protesto e quanto cada uma soma sobre a anuidade protestável, em milionésimos (1.000.000 é uma vez a anuidade; demonstrativo, até a TI ligar os protestos do CreaNet).',
    colunas: [texto('Categoria', { ordenarPor: 'Ordem' }), inteiro('Fator por milhão', { oculta: true }), inteiro('Ordem', { oculta: true })] },
  { nome: 'Foto da adimplência', arquivo: 'foto-adimplencia.csv', oculta: true, descricao: 'Conta, no último dia de cada mês, os profissionais ativos e os com anuidade em atraso, por município onde moram.', colunas: [data('Data'), texto('Código IBGE'), inteiro('Ativos'), inteiro('Em atraso')] },
];

/* ---------- Pedaços de DAX ---------- */
const rs = (expressao: string) => `FORMAT(${expressao}, "R$ #,##0")`;
const filtros = (lista: string[]) => filtrosExtras(lista.map(filtro => `KEEPFILTERS(${filtro})`));
/** O primeiro dia do mês da data escolhida. */
const COM_MES = `${COM_DATA}\nVAR mes = DATE(YEAR(d), MONTH(d), 1)`;
/**
 * A arrecadação do recorte: cada tipo de receita vezes a parte do recorte no peso daquele tipo (`arrecadadoNoMes` do painel). A
 * expressão roda com o tipo do laço; as variáveis de data vêm de fora.
 */
const noRecorte = (expressao: string) => `SUMX(VALUES('Tipos de receita'[Tipo]), CALCULATE(${expressao}) * [Parte do recorte])`;
const arrecadado = (de: string, ate: string) => noRecorte(`SUM('Arrecadação'[Valor]), REMOVEFILTERS('Dias'), 'Arrecadação'[Dia] >= ${de}, 'Arrecadação'[Dia] <= ${ate}`);
const receitaReal = (de: string, ate: string, ...extra: string[]) => `CALCULATE(SUM('Receitas'[Valor]), REMOVEFILTERS('Calendário'), 'Receitas'[Mês] >= ${de}, 'Receitas'[Mês] <= ${ate}${filtros(extra)})`;
const despesaReal = (de: string, ate: string, ...extra: string[]) => `CALCULATE(SUM('Despesas'[Valor]), REMOVEFILTERS('Calendário'), 'Despesas'[Mês] >= ${de}, 'Despesas'[Mês] <= ${ate}${filtros(extra)})`;
/** Os meses de um período terminado no mês da data. */
const PERIODO = `${COM_PERIODO}\nVAR fim = DATE(YEAR(d), MONTH(d), 1)`;
/** O mês do eixo de "Nome do mês" (1 a 12) no ano da data, ou no anterior. */
const MES_DO_EIXO = "VAR m = MAX('Calendário'[Mês do ano])";
const naFoto = (tabela: string, expressao: string, ...extra: string[]) => `${COM_DATA}\nRETURN CALCULATE(${expressao}, REMOVEFILTERS('Calendário'), '${tabela}'[Data] = d${extra.map(filtro => `, KEEPFILTERS(${filtro})`).join('')})`;
const DIVIDA = (...extra: string[]) => naFoto('Foto da dívida', "SUM('Foto da dívida'[Valor])", ...extra);
/** Título vencido e não pago num dia `x`, ainda não prescrito (`vencidoEm`): venceu antes de `x`, há até 1.826 dias, e não foi pago até `x`. */
const vencidosEm = (x: string) => `CALCULATE(SUM('Títulos'[Valor]), 'Títulos'[Vencimento] < ${x}, 'Títulos'[Vencimento] >= ${x} - 1826, ISBLANK('Títulos'[Pago em]) || 'Títulos'[Pago em] > ${x}) + 0`;
/** O orçamento reformulado do ano de uma natureza, no grupo ou tipo do eixo (pelo nome, sem relação). */
const orcado = (natureza: string, eixo: string, ano = 'YEAR(d)') => `${COM_DATA}\nRETURN CALCULATE(SUM('Orçamento'[Atual]), 'Orçamento'[Natureza] = "${natureza}", 'Orçamento'[Ano] = ${ano}, TREATAS(VALUES(${eixo}), 'Orçamento'[Grupo])) + 0`;
/** Acumulado de janeiro até o mês do eixo, no ano da data (até o mês dela) ou no anterior (o ano inteiro). */
const acumulado = (real: (de: string, ate: string) => string, anoAnterior: boolean) => [COM_DATA, MES_DO_EIXO, `VAR ano = YEAR(d)${anoAnterior ? ' - 1' : ''}`,
  `RETURN IF(${anoAnterior ? 'TRUE()' : 'm <= MONTH(d)'}, ${real('DATE(ano, 1, 1)', 'DATE(ano, m, 1)')} + 0)`].join('\n');
/** Um valor de cada ano do eixo (Calendário[Ano]), até o mês da data no ano dela. */
const doAno = (real: (de: string, ate: string) => string) => [COM_DATA, "VAR ano = MAX('Calendário'[Ano])", 'RETURN IF(ano <= YEAR(d), ' + real('DATE(ano, 1, 1)', 'MIN(DATE(ano, 12, 1), DATE(YEAR(d), MONTH(d), 1))') + ' + 0)'].join('\n');
/** Os dias úteis do mês da data, até um dia e depois dele. */
const uteis = (condicao: string) => `${COM_MES}\nRETURN CALCULATE(COUNTROWS('Dias'), REMOVEFILTERS('Dias'), 'Dias'[Mês] = mes, 'Dias'[Útil] = 1${condicao ? `, ${condicao}` : ''}) + 0`;

/* ---------- Cartões ---------- */
const [naArrecadacao, naReceita, naDivida, noOrcamento] = [cartao(PASTA.arrecadacao), cartao(PASTA.receita), cartao(PASTA.divida), cartao(PASTA.orcamento)];
/** Os cartões de cada página, com a comparação e a linha de apoio do painel. `paginas.ts` monta os cartões daqui. */
export const CARTOES = {
  arrecadacao: [
    naArrecadacao('Arrecadado no mês', { serie: 'fluxo' }, `${parte('DIVIDE([Arrecadado no mês], [Meta do mês])')} & " da meta do mês, de " & ${rs('[Meta do mês]')}`),
    naArrecadacao('Falta para a meta do mês', undefined, `IF([Falta para a meta do mês] > 0, ${n('[Dias úteis que faltam]')} & " de " & ${n('[Dias úteis do mês]')} & " dias úteis ainda pela frente", "meta batida: " & ${rs('[Arrecadado no mês] - [Meta do mês]')} & " acima")`),
    naArrecadacao('Média diária necessária', undefined, `"até agora, " & ${rs('DIVIDE([Arrecadado no mês], [Dias úteis passados])')} & " por dia útil"`),
    naArrecadacao('Arrecadado no ano', { serie: 'fluxo' }, `${parte('DIVIDE([Arrecadado no ano], [Meta até o mês])')} & " da meta até o mês; " & ${parte('DIVIDE([Arrecadado no ano], [Meta do ano])')} & " da meta do ano"`),
    naArrecadacao('Projeção do mês', undefined, `IF([Dias úteis que faltam] = 0, "mês fechado em " & ${parte('DIVIDE([Arrecadado no mês], [Meta do mês])')} & " da meta", "no ritmo dos dias úteis já passados: " & ${parte('DIVIDE([Projeção do mês], [Meta do mês])')} & " da meta")`),
  ],
  receita: [
    naReceita('Receita no período', { serie: 'fluxo' }, '"dado real da Transparência, do estado inteiro"'),
    naReceita('Parte da ART na receita', { serie: 'taxa' }, `${rs('[Receita de ART no período]')} & " de taxas de ART no período"`),
    naReceita('Anuidades no período', { serie: 'fluxo' }, '"de profissionais e empresas, do ano e de anos anteriores"'),
    naReceita('Dívida ativa recebida no período', { serie: 'fluxo' }, `${parte('DIVIDE([Dívida ativa recebida no período], [Receita no período])')} & " da receita do período"`),
    naReceita('Receita por profissional ativo', undefined, `"receita de 12 meses dividida pelos " & ${n('[Profissionais ativos em SP]')} & " ativos de SP no Confea"`),
  ],
  divida: [
    naDivida('Anuidades vencidas', { serie: 'estoque' }, `${n('[Devedores de anuidade]')} & " devedores: " & ${rs('[Anuidades vencidas de profissionais]')} & " de profissionais e " & ${rs('[Anuidades vencidas de empresas]')} & " de empresas"`),
    naDivida('Abaixo do piso de execução', undefined, `${rs('[Vencidas abaixo do piso]')} & " de devedores que somam menos de " & ${rs('[Piso de execução]')} & ", cobrados só fora da Justiça"`),
    naDivida('Perto de prescrever', undefined, `"anuidades vencidas há mais de quatro anos, de " & ${n('[Devedores perto de prescrever]')} & " devedores"`),
    naDivida('Recebido da dívida', undefined, `${rs('[Recebido da dívida no período]')} & " recebidos no período, de " & ${rs('[Dívida no início do período] + [Novos vencimentos no período]')} & " vencidos"`),
    naDivida('Profissionais em dia', undefined, `${n('[Profissionais em atraso]')} & " dos " & ${n('[Profissionais ativos]')} & " ativos com anuidade atrasada"`),
  ],
  orcamento: [
    noOrcamento('Despesa no período', { serie: 'fluxo' }, '"empenhada, dado real do estado inteiro"'),
    noOrcamento('Execução do orçamento no ano', undefined, `${rs('[Despesa realizada no ano]')} & " de " & ${rs('[Despesa orçada no ano]')} & "; até o mês passaram " & FORMAT(MONTH([Data escolhida]) / 12, "0%") & " do ano"`),
    noOrcamento('Receita menos despesa no período', { serie: 'fluxo' }, `${rs('[Receita no período]')} & " de receita e " & ${rs('[Despesa no período]')} & " de despesa"`),
    noOrcamento('Diárias e deslocamento no período', { serie: 'fluxo' }, `${n('[Pessoas com diária no período]')} & " pessoas com diária; " & ${rs('[Diárias de conselheiros no período]')} & " a conselheiros"`),
    noOrcamento('Contratos vigentes', undefined, `${rs('[Valor dos contratos vigentes]')} & "; " & ${n('[Contratos que terminam em 90 dias]')} & " terminam em 90 dias"`),
  ],
} satisfies Record<string, Cartao[]>;

/* ---------- Medidas ---------- */
const medidas: Medida[] = [
  // Apoio: data, período, piso, ativos e a parte do recorte.
  ...medidasDeApoio(PASTA.apoio),
  medida(PASTA.apoio, 'Piso de execução', `${COM_DATA}\nRETURN 5 * ROUND(520 * POWER(1.055, MAX(0, YEAR(d) - 2020)), 0)`, FORMATO.reais,
    'Calcula cinco vezes a anuidade de pessoa física do ano da data escolhida (Lei 12.514/2011, art. 8º, com a redação da Lei 14.195/2021). Abaixo dele, o Conselho não pode executar a dívida na Justiça. A anuidade do cenário é demonstrativa.'),
  medida(PASTA.apoio, 'Profissionais ativos em SP', String(ATIVOS_SP), FORMATO.inteiro, 'Guarda os profissionais ativos de SP no Confea, na data da coleta, para a receita e a despesa por profissional ativo.'),
  medida(PASTA.apoio, 'Parte do recorte', "VAR total = CALCULATE(SUM('Pesos'[Peso]), REMOVEFILTERS('Municípios'), REMOVEFILTERS('Regionais'))\nRETURN IF(ISCROSSFILTERED('Municípios'), DIVIDE(SUM('Pesos'[Peso]), total), 1)", FORMATO.parte,
    'Mostra a parte do recorte (regional ou município) no peso do estado, no tipo de receita do contexto; sem recorte, 100%. A arrecadação do recorte é a do estado vezes esta parte, tipo a tipo.'),

  // Arrecadação.
  medida(PASTA.arrecadacao, 'Arrecadado no mês', `${COM_MES}\nRETURN ${arrecadado('mes', 'd')}`, FORMATO.reais, 'Soma a arrecadação do recorte do primeiro dia do mês até a data escolhida.'),
  medida(PASTA.arrecadacao, 'Meta do mês', `${COM_MES}\nRETURN ${noRecorte("SUM('Metas'[Meta]), 'Metas'[Mês] = mes")}`, FORMATO.reais, 'Mostra a meta do mês da data, tipo a tipo, vezes a parte do recorte.'),
  medida(PASTA.arrecadacao, 'Falta para a meta do mês', 'MAX(0, [Meta do mês] - [Arrecadado no mês])', FORMATO.reais, 'Mostra quanto falta para a meta do mês; zero quando a meta foi batida.'),
  medida(PASTA.arrecadacao, 'Dias úteis do mês', uteis(''), FORMATO.inteiro, 'Conta os dias úteis do mês da data.'),
  medida(PASTA.arrecadacao, 'Dias úteis passados', uteis("'Dias'[Dia] <= d"), FORMATO.inteiro, 'Conta os dias úteis do mês até a data escolhida.'),
  medida(PASTA.arrecadacao, 'Dias úteis que faltam', '[Dias úteis do mês] - [Dias úteis passados]', FORMATO.inteiro, 'Conta os dias úteis do mês depois da data escolhida.'),
  medida(PASTA.arrecadacao, 'Média diária necessária', 'IF([Dias úteis que faltam] > 0 && [Falta para a meta do mês] > 0, DIVIDE([Falta para a meta do mês], [Dias úteis que faltam]))', FORMATO.reais,
    'Divide o que falta para a meta pelos dias úteis que faltam no mês. Em branco quando a meta foi batida ou o mês fechou.'),
  medida(PASTA.arrecadacao, 'Projeção do mês', 'DIVIDE([Arrecadado no mês], [Dias úteis passados]) * [Dias úteis do mês]', FORMATO.reais, 'Repete a média dos dias úteis já passados até o fim do mês.'),
  medida(PASTA.arrecadacao, 'Arrecadado no ano', `${COM_DATA}\nRETURN ${arrecadado('DATE(YEAR(d), 1, 1)', 'd')}`, FORMATO.reais, 'Soma a arrecadação do recorte de 1º de janeiro até a data escolhida.'),
  medida(PASTA.arrecadacao, 'Meta até o mês', `${COM_MES}\nRETURN ${noRecorte("SUM('Metas'[Meta]), 'Metas'[Mês] >= DATE(YEAR(d), 1, 1), 'Metas'[Mês] <= mes")}`, FORMATO.reais, 'Soma a meta de janeiro até o mês da data, no recorte.'),
  medida(PASTA.arrecadacao, 'Meta do ano', `${COM_DATA}\nRETURN ${noRecorte("SUM('Metas'[Meta]), YEAR('Metas'[Mês]) = YEAR(d)")}`, FORMATO.reais, 'Soma a meta dos 12 meses do ano da data, no recorte.'),
  // Dia a dia: o eixo é Dias[Dia do mês]; cada medida lê o dia do eixo no mês da data.
  medida(PASTA.arrecadacao, 'Arrecadado no dia', `${COM_DATA}\nVAR dia = DATE(YEAR(d), MONTH(d), MAX('Dias'[Dia do mês]))\nRETURN IF(dia <= d && MONTH(dia) = MONTH(d), ${arrecadado('dia', 'dia')})`, FORMATO.reais, 'Soma a arrecadação do recorte em cada dia do mês da data, até ela.'),
  medida(PASTA.arrecadacao, 'Arrecadado acumulado no mês', `${COM_MES}\nVAR dia = DATE(YEAR(d), MONTH(d), MAX('Dias'[Dia do mês]))\nRETURN IF(dia <= d && MONTH(dia) = MONTH(d), ${arrecadado('mes', 'dia')})`, FORMATO.reais, 'Soma a arrecadação do recorte do primeiro dia do mês até cada dia, até a data.'),
  medida(PASTA.arrecadacao, 'Meta acumulada no mês', `${COM_MES}\nVAR dia = DATE(YEAR(d), MONTH(d), MAX('Dias'[Dia do mês]))\nVAR ate = CALCULATE(COUNTROWS('Dias'), REMOVEFILTERS('Dias'), 'Dias'[Mês] = mes, 'Dias'[Útil] = 1, 'Dias'[Dia] <= dia)\nRETURN IF(MONTH(dia) = MONTH(d), DIVIDE([Meta do mês] * ate, [Dias úteis do mês]))`, FORMATO.reais,
    'Divide a meta do mês igualmente pelos dias úteis e acumula até cada dia, a linha tracejada do painel.'),
  // Calendário: matriz com a semana do mês nas linhas e o dia da semana nas colunas.
  medida(PASTA.arrecadacao, 'Arrecadado no dia do calendário', `${COM_MES}\nVAR dia = CALCULATE(MAX('Dias'[Dia]), KEEPFILTERS('Dias'[Mês] = mes))\nRETURN IF(NOT ISBLANK(dia) && dia <= d, ${arrecadado('dia', 'dia')})`, FORMATO.reais,
    'Soma a arrecadação do recorte em cada dia do mês da data, para a matriz do calendário (semana nas linhas, dia da semana nas colunas).'),
  // Meta e realizado mês a mês (eixo Calendário[Nome do mês]).
  medida(PASTA.arrecadacao, 'Arrecadado em cada mês do ano', [COM_DATA, MES_DO_EIXO, 'VAR inicio = DATE(YEAR(d), m, 1)', `RETURN IF(m <= MONTH(d), ${noRecorte("SUM('Receitas'[Valor]), REMOVEFILTERS('Calendário'), 'Receitas'[Mês] = inicio")})`].join('\n'), FORMATO.reais,
    'Soma a arrecadação do recorte em cada mês do ano da data, até o mês dela.'),
  medida(PASTA.arrecadacao, 'Meta de cada mês do ano', [COM_DATA, MES_DO_EIXO, 'VAR inicio = DATE(YEAR(d), m, 1)', `RETURN ${noRecorte("SUM('Metas'[Meta]), REMOVEFILTERS('Calendário'), 'Metas'[Mês] = inicio")}`].join('\n'), FORMATO.reais, 'Mostra a meta de cada mês do ano da data, no recorte.'),
  medida(PASTA.arrecadacao, 'Arrecadado no mesmo mês do ano anterior', [COM_DATA, MES_DO_EIXO, 'VAR inicio = DATE(YEAR(d) - 1, m, 1)', `RETURN ${noRecorte("SUM('Receitas'[Valor]), REMOVEFILTERS('Calendário'), 'Receitas'[Mês] = inicio")}`].join('\n'), FORMATO.reais,
    'Soma a arrecadação do recorte em cada mês do ano anterior ao da data.'),
  // Cada tipo no mês e no acumulado do ano, contra o ano anterior (matriz com Tipos de receita nas linhas).
  medida(PASTA.arrecadacao, 'Tipo no mês', `${COM_MES}\nRETURN ${noRecorte(`SUM('Receitas'[Valor]), REMOVEFILTERS('Calendário'), 'Receitas'[Mês] = mes`)}`, FORMATO.reais, 'Soma a arrecadação do recorte no mês da data, por tipo.'),
  medida(PASTA.arrecadacao, 'Tipo no mês do ano anterior', `${COM_MES}\nRETURN ${noRecorte(`SUM('Receitas'[Valor]), REMOVEFILTERS('Calendário'), 'Receitas'[Mês] = EDATE(mes, -12)`)}`, FORMATO.reais, 'Soma a arrecadação do recorte no mesmo mês do ano anterior, por tipo.'),
  medida(PASTA.arrecadacao, 'Variação no mês', 'IF([Tipo no mês do ano anterior] > 0, DIVIDE([Tipo no mês], [Tipo no mês do ano anterior]) - 1)', FORMATO.variacao, 'Compara o mês da data com o mesmo mês do ano anterior.'),
  medida(PASTA.arrecadacao, 'Tipo no ano', `${COM_MES}\nRETURN ${noRecorte(`SUM('Receitas'[Valor]), REMOVEFILTERS('Calendário'), 'Receitas'[Mês] >= DATE(YEAR(d), 1, 1), 'Receitas'[Mês] <= mes`)}`, FORMATO.reais, 'Soma a arrecadação do recorte de janeiro até o mês da data, por tipo.'),
  medida(PASTA.arrecadacao, 'Tipo no ano anterior', `${COM_MES}\nRETURN ${noRecorte(`SUM('Receitas'[Valor]), REMOVEFILTERS('Calendário'), 'Receitas'[Mês] >= DATE(YEAR(d) - 1, 1, 1), 'Receitas'[Mês] <= EDATE(mes, -12)`)}`, FORMATO.reais, 'Soma a arrecadação do recorte de janeiro até o mesmo mês do ano anterior, por tipo.'),
  medida(PASTA.arrecadacao, 'Variação no ano', 'IF([Tipo no ano anterior] > 0, DIVIDE([Tipo no ano], [Tipo no ano anterior]) - 1)', FORMATO.variacao, 'Compara o acumulado do ano com o mesmo intervalo do ano anterior.'),
  medida(PASTA.arrecadacao, 'Arrecadado no ano por município', `${COM_DATA}\nRETURN ${arrecadado('DATE(YEAR(d), 1, 1)', 'd')}`, FORMATO.reais, 'Soma a arrecadação de 1º de janeiro até a data em cada município, para o mapa.'),

  // Receita (real, do estado inteiro).
  medida(PASTA.receita, 'Receita no período', `${PERIODO}\nRETURN ${receitaReal('inicio', 'fim')} + 0`, FORMATO.reais, 'Soma a receita realizada nos meses do período, terminados no mês da data.'),
  medida(PASTA.receita, 'Receita de ART no período', `${PERIODO}\nRETURN ${receitaReal('inicio', 'fim', "'Receitas'[Tipo] = \"ART\"")} + 0`, FORMATO.reais, 'Soma as taxas de ART recebidas no período.'),
  medida(PASTA.receita, 'Parte da ART na receita', 'DIVIDE([Receita de ART no período], [Receita no período])', FORMATO.parte, 'Mostra a parte da receita do período que veio das taxas de ART.'),
  medida(PASTA.receita, 'Anuidades no período', `${PERIODO}\nRETURN ${receitaReal('inicio', 'fim', "'Receitas'[Tipo] = \"Anuidades\"")} + 0`, FORMATO.reais, 'Soma as anuidades recebidas no período, do ano e de anos anteriores.'),
  medida(PASTA.receita, 'Dívida ativa recebida no período', `${PERIODO}\nRETURN ${receitaReal('inicio', 'fim', "'Receitas'[Tipo] = \"Dívida ativa\"")} + 0`, FORMATO.reais, 'Soma o recebido da dívida ativa no período.'),
  medida(PASTA.receita, 'Receita em 12 meses', `${COM_DATA}\nVAR fim = DATE(YEAR(d), MONTH(d), 1)\nRETURN ${receitaReal('EDATE(fim, -11)', 'fim')} + 0`, FORMATO.reais, 'Soma a receita dos 12 meses terminados no mês da data.'),
  medida(PASTA.receita, 'Receita por profissional ativo', 'DIVIDE([Receita em 12 meses], [Profissionais ativos em SP])', FORMATO.reais, 'Divide a receita de 12 meses pelos profissionais ativos de SP no Confea.'),
  medida(PASTA.receita, 'Receita no ano', doAno((de, ate) => receitaReal(de, ate)), FORMATO.reais, 'Soma a receita de cada ano do eixo, até o mês da data no ano dela.'),
  medida(PASTA.receita, 'Receita de ART no ano', doAno((de, ate) => receitaReal(de, ate, "'Receitas'[Tipo] = \"ART\"")), FORMATO.reais, 'Soma as taxas de ART de cada ano do eixo, até o mês da data no ano dela.'),
  medida(PASTA.receita, 'Parte da ART no ano', 'DIVIDE([Receita de ART no ano], [Receita no ano])', FORMATO.parte, 'Mostra a parte da ART na receita de cada ano do eixo.'),
  medida(PASTA.receita, 'Receita no mês', noMes("SUM('Receitas'[Valor])"), FORMATO.reais, 'Soma a receita realizada em cada mês, nos meses do gráfico.'),
  medida(PASTA.receita, 'Receita de cada mês', `${COM_DATA}\nVAR mes = MAX('Calendário'[Mês])\nRETURN IF(HASONEVALUE('Calendário'[Mês]) && mes <= d, SUM('Receitas'[Valor]))`, FORMATO.reais, 'Soma a receita realizada de cada mês de cada ano, até o mês da data, para a matriz de ano por mês.'),
  medida(PASTA.receita, 'Receita orçada no ano', orcado('Receita', "'Tipos de receita'[Tipo]"), FORMATO.reais, 'Soma a receita orçada para o ano da data, com as reformulações, por tipo.'),
  medida(PASTA.receita, 'Receita realizada no ano', `${COM_MES}\nRETURN CALCULATE(SUM('Receitas'[Valor]), REMOVEFILTERS('Calendário'), 'Receitas'[Mês] >= DATE(YEAR(d), 1, 1), 'Receitas'[Mês] <= mes) + 0`, FORMATO.reais, 'Soma a receita realizada de janeiro até o mês da data, por tipo.'),

  // Dívida e cobrança (cenário, pelo município do devedor).
  medida(PASTA.divida, 'Anuidades vencidas', DIVIDA(), FORMATO.reais, 'Soma as anuidades de profissionais e os boletos de empresas vencidos e não pagos na data escolhida, até cinco anos depois do vencimento (depois disso, prescrevem).'),
  medida(PASTA.divida, 'Devedores de anuidade', naFoto('Foto da dívida', "DISTINCTCOUNT('Foto da dívida'[Devedor])"), FORMATO.inteiro, 'Conta os profissionais e as empresas com anuidade vencida e não paga na data escolhida.'),
  medida(PASTA.divida, 'Anuidades vencidas de profissionais', DIVIDA("'Foto da dívida'[Tipo de devedor] = \"Profissional\""), FORMATO.reais, 'Soma as anuidades vencidas de profissionais na data escolhida.'),
  medida(PASTA.divida, 'Anuidades vencidas de empresas', DIVIDA("'Foto da dívida'[Tipo de devedor] = \"Empresa\""), FORMATO.reais, 'Soma os boletos vencidos de empresas na data escolhida. Com a situação do CNPJ na Receita Federal, mostra quanto é de empresa baixada ou inapta, com pouca chance de pagar.'),
  medida(PASTA.divida, 'Vencidas abaixo do piso', DIVIDA("'Foto da dívida'[Acima do piso] = 0"), FORMATO.reais, 'Soma a dívida dos devedores que, somando todas as anuidades vencidas, ficam abaixo do piso de execução.'),
  medida(PASTA.divida, 'Vencidas acima do piso', DIVIDA("'Foto da dívida'[Acima do piso] = 1"), FORMATO.reais, 'Soma a dívida dos devedores que somam o piso de execução ou mais.'),
  medida(PASTA.divida, 'Abaixo do piso de execução', 'DIVIDE([Vencidas abaixo do piso], [Anuidades vencidas])', FORMATO.parte, 'Mostra a parte da dívida que é de devedores abaixo do piso de execução: só pode ser cobrada fora da Justiça.'),
  medida(PASTA.divida, 'Perto de prescrever', naFoto('Foto da dívida', "SUM('Foto da dívida'[Perto de prescrever])"), FORMATO.reais, 'Soma as anuidades vencidas há mais de quatro anos na data escolhida: prescrevem em menos de um ano (Código Tributário Nacional, art. 174).'),
  medida(PASTA.divida, 'Devedores perto de prescrever', naFoto('Foto da dívida', "DISTINCTCOUNT('Foto da dívida'[Devedor])", "'Foto da dívida'[Perto de prescrever] > 0"), FORMATO.inteiro, 'Conta os devedores com ao menos uma anuidade vencida há mais de quatro anos.'),
  medida(PASTA.divida, 'Dívida no início do período', `${COM_PERIODO}\nVAR x = inicio - 1\nRETURN ${vencidosEm('x')}`, FORMATO.reais, 'Soma a dívida vencida e não paga no dia anterior ao início do período.'),
  medida(PASTA.divida, 'Novos vencimentos no período', `${COM_PERIODO}\nRETURN CALCULATE(SUM('Títulos'[Valor]), 'Títulos'[Vencimento] >= inicio - 1, 'Títulos'[Vencimento] < d, FILTER('Títulos', ISBLANK('Títulos'[Pago em]) || 'Títulos'[Pago em] > 'Títulos'[Vencimento])) + 0`, FORMATO.reais,
    'Soma as anuidades e os boletos que venceram no período sem ser pagos no vencimento.'),
  medida(PASTA.divida, 'Recebido da dívida no período', `${COM_PERIODO}\nRETURN CALCULATE(SUM('Títulos'[Valor]), 'Títulos'[Pago em] >= inicio, 'Títulos'[Pago em] <= d, 'Títulos'[Dias até o pagamento] > 0, 'Títulos'[Dias até o pagamento] <= 1826) + 0`, FORMATO.reais,
    'Soma o que foi pago no período depois do vencimento, antes da prescrição.'),
  medida(PASTA.divida, 'Prescrito no período', `${COM_PERIODO}\nRETURN CALCULATE(SUM('Títulos'[Valor]), 'Títulos'[Vencimento] >= inicio - 1 - 1826, 'Títulos'[Vencimento] < d - 1826, ISBLANK('Títulos'[Pago em]) || 'Títulos'[Pago em] > d) + 0`, FORMATO.reais,
    'Soma a dívida que completou cinco anos do vencimento no período sem ser paga: prescreveu.'),
  medida(PASTA.divida, 'Recebido da dívida', 'DIVIDE([Recebido da dívida no período], [Dívida no início do período] + [Novos vencimentos no período])', FORMATO.parte, 'Mostra quanto do que estava vencido no início do período, mais o que venceu nele, foi recebido no período.'),
  medida(PASTA.divida, 'Anuidade protestável', DIVIDA("'Foto da dívida'[Protestável] = 1"), FORMATO.reais, 'Soma a dívida dos devedores acima do piso com anuidade vencida há um ano ou mais: a que pode ir a protesto.'),
  medida(PASTA.divida, 'Protestado', "SUMX(VALUES('Categorias de protesto'[Categoria]), CALCULATE(MAX('Categorias de protesto'[Fator por milhão]))) / 1000000 * [Anuidade protestável]", FORMATO.reais, 'Mostra o valor protestado em cada categoria: a anuidade protestável vezes o fator da categoria (demonstrativo).'),
  medida(PASTA.divida, 'Profissionais ativos', naFoto('Foto da adimplência', "SUM('Foto da adimplência'[Ativos])"), FORMATO.inteiro, 'Conta os profissionais com registro ativo na data escolhida, pelo município onde moram.'),
  medida(PASTA.divida, 'Profissionais em atraso', naFoto('Foto da adimplência', "SUM('Foto da adimplência'[Em atraso])"), FORMATO.inteiro, 'Conta os profissionais ativos com anuidade em atraso na data escolhida.'),
  medida(PASTA.divida, 'Profissionais em dia', 'DIVIDE([Profissionais ativos] - [Profissionais em atraso], [Profissionais ativos])', FORMATO.parte, 'Mostra a parte dos profissionais ativos sem anuidade em atraso na data escolhida.'),

  // Orçamento e despesa (real, do estado inteiro).
  medida(PASTA.orcamento, 'Despesa no período', `${PERIODO}\nRETURN ${despesaReal('inicio', 'fim')} + 0`, FORMATO.reais, 'Soma a despesa empenhada nos meses do período, terminados no mês da data.'),
  medida(PASTA.orcamento, 'Despesa realizada no ano', `${COM_MES}\nRETURN ${despesaReal('DATE(YEAR(d), 1, 1)', 'mes')} + 0`, FORMATO.reais, 'Soma a despesa empenhada de janeiro até o mês da data.'),
  medida(PASTA.orcamento, 'Despesa orçada no ano', `${COM_DATA}\nRETURN CALCULATE(SUM('Orçamento'[Atual]), 'Orçamento'[Natureza] = "Despesa", 'Orçamento'[Ano] = YEAR(d)) + 0`, FORMATO.reais, 'Soma a despesa orçada para o ano da data, com as reformulações.'),
  medida(PASTA.orcamento, 'Execução do orçamento no ano', 'DIVIDE([Despesa realizada no ano], [Despesa orçada no ano])', FORMATO.parte, 'Mostra quanto do orçamento de despesa do ano já foi empenhado até o mês da data.'),
  medida(PASTA.orcamento, 'Receita menos despesa no período', '[Receita no período] - [Despesa no período]', FORMATO.reais, 'Subtrai a despesa empenhada da receita realizada no período.'),
  medida(PASTA.orcamento, 'Diárias e deslocamento no período', `${PERIODO}\nRETURN ${despesaReal('inicio', 'fim', "'Despesas'[Grupo] = \"Diárias e deslocamento\"")} + 0`, FORMATO.reais, 'Soma a despesa de diárias, passagens e deslocamento empenhada no período.'),
  medida(PASTA.orcamento, 'Diárias no período', `${PERIODO}\nRETURN CALCULATE(SUM('Diárias'[Valor]), 'Diárias'[Mês] >= inicio, 'Diárias'[Mês] <= fim) + 0`, FORMATO.reais, 'Soma o pago a cada pessoa em diárias, jetons e deslocamento no período, pelos pagamentos da Transparência.'),
  medida(PASTA.orcamento, 'Pagamentos de diária no período', `${PERIODO}\nRETURN CALCULATE(SUM('Diárias'[Pagamentos]), 'Diárias'[Mês] >= inicio, 'Diárias'[Mês] <= fim) + 0`, FORMATO.inteiro, 'Conta os pagamentos de diária, jeton e deslocamento no período.'),
  medida(PASTA.orcamento, 'Meses com diária', `${PERIODO}\nRETURN CALCULATE(DISTINCTCOUNT('Diárias'[Mês]), 'Diárias'[Mês] >= inicio, 'Diárias'[Mês] <= fim) + 0`, FORMATO.inteiro, 'Conta os meses do período em que a pessoa recebeu.'),
  medida(PASTA.orcamento, 'Pessoas com diária no período', `${PERIODO}\nRETURN CALCULATE(DISTINCTCOUNT('Diárias'[Pessoa]), 'Diárias'[Mês] >= inicio, 'Diárias'[Mês] <= fim, 'Diárias'[Valor] > 0) + 0`, FORMATO.inteiro, 'Conta as pessoas que receberam diária, jeton ou deslocamento no período.'),
  medida(PASTA.orcamento, 'Diárias de conselheiros no período', `CALCULATE([Diárias no período], 'Pessoas'[Categoria] IN {"Conselheiros", "Jetons"})`, FORMATO.reais, 'Soma o pago a conselheiros (diárias e jetons) no período.'),
  medida(PASTA.orcamento, 'Pago no período', `${PERIODO}\nRETURN CALCULATE(SUM('Pagamentos'[Valor]), 'Pagamentos'[Mês] >= inicio, 'Pagamentos'[Mês] <= fim) + 0`, FORMATO.reais, 'Soma o pago a cada fornecedor no período.'),
  medida(PASTA.orcamento, 'Contratos vigentes', `${COM_DATA}\nRETURN CALCULATE(COUNTROWS('Contratos'), 'Contratos'[Início] <= d, 'Contratos'[Fim] > d) + 0`, FORMATO.inteiro, 'Conta os contratos em vigor na data escolhida.'),
  medida(PASTA.orcamento, 'Valor dos contratos vigentes', `${COM_DATA}\nRETURN CALCULATE(SUM('Contratos'[Valor]), 'Contratos'[Início] <= d, 'Contratos'[Fim] > d) + 0`, FORMATO.reais, 'Soma o valor dos contratos em vigor na data escolhida.'),
  medida(PASTA.orcamento, 'Contratos que terminam em 90 dias', `${COM_DATA}\nRETURN CALCULATE(COUNTROWS('Contratos'), 'Contratos'[Início] <= d, 'Contratos'[Fim] > d, 'Contratos'[Fim] <= EDATE(d, 3)) + 0`, FORMATO.inteiro, 'Conta os contratos vigentes que terminam nos três meses seguintes à data escolhida.'),
  medida(PASTA.orcamento, 'Contratos que terminam no mês', [COM_DATA, "VAR mes = MAX('Calendário'[Mês])", 'VAR primeiro = DATE(YEAR(d), MONTH(d), 1)',
    "RETURN IF(mes >= primeiro && mes <= EDATE(primeiro, 11), CALCULATE(COUNTROWS('Contratos'), 'Contratos'[Início] <= d, 'Contratos'[Fim] > d, 'Contratos'[Fim] >= mes, 'Contratos'[Fim] <= EOMONTH(mes, 0)) + 0)"].join('\n'), FORMATO.inteiro,
    'Conta os contratos vigentes na data escolhida que terminam em cada um dos 12 meses seguintes, a começar pelo mês dela.'),
  medida(PASTA.orcamento, 'Despesa realizada acumulada no ano', acumulado((de, ate) => despesaReal(de, ate), false), FORMATO.reais, 'Soma a despesa empenhada de janeiro até cada mês do ano da data, até o mês dela.'),
  medida(PASTA.orcamento, 'Despesa realizada acumulada no ano anterior', acumulado((de, ate) => despesaReal(de, ate), true), FORMATO.reais, 'Soma a despesa empenhada de janeiro até cada mês do ano anterior ao da data.'),
  medida(PASTA.orcamento, 'Ritmo do orçado', `${MES_DO_EIXO}\nRETURN [Despesa orçada no ano] * m / 12`, FORMATO.reais, 'Divide o orçamento de despesa do ano em doze partes iguais e acumula até cada mês, a linha tracejada do painel.'),
  medida(PASTA.orcamento, 'Orçado do grupo no ano', orcado('Despesa', "'Grupos de despesa'[Grupo]"), FORMATO.reais, 'Soma a despesa orçada para o ano da data, com as reformulações, por grupo.'),
  medida(PASTA.orcamento, 'Realizado do grupo no ano', `${COM_MES}\nRETURN CALCULATE(SUM('Despesas'[Valor]), REMOVEFILTERS('Calendário'), 'Despesas'[Mês] >= DATE(YEAR(d), 1, 1), 'Despesas'[Mês] <= mes) + 0`, FORMATO.reais, 'Soma a despesa empenhada de janeiro até o mês da data, por grupo.'),
  medida(PASTA.orcamento, 'Despesa no ano', doAno((de, ate) => despesaReal(de, ate)), FORMATO.reais, 'Soma a despesa de cada ano do eixo, até o mês da data no ano dela.'),
  medida(PASTA.orcamento, 'Resultado no ano', '[Receita no ano] - [Despesa no ano]', FORMATO.reais, 'Subtrai a despesa da receita de cada ano do eixo.'),
  medida(PASTA.orcamento, 'Despesa por profissional ativo', `${COM_DATA}\nVAR ano = YEAR(d) - 1\nRETURN DIVIDE(${despesaReal('DATE(ano, 1, 1)', 'DATE(ano, 12, 1)')}, [Profissionais ativos em SP])`, FORMATO.reais, 'Divide a despesa do último ano fechado pelos profissionais ativos de SP no Confea.'),
  medida(PASTA.orcamento, 'Receita por profissional ativo no ano fechado', `${COM_DATA}\nVAR ano = YEAR(d) - 1\nRETURN DIVIDE(${receitaReal('DATE(ano, 1, 1)', 'DATE(ano, 12, 1)')}, [Profissionais ativos em SP])`, FORMATO.reais, 'Divide a receita do último ano fechado pelos profissionais ativos de SP no Confea.'),

  ...medidasDosCartoes(CARTOES),
];

export const modeloFinanceiro: Modelo = {
  nome: 'Financeiro',
  parametros: [{ nome: PASTA_PARAMETRO, valor: 'C:\\CREA-SP\\powerbi\\financeiro\\dados\\', descricao: 'Pasta onde estão os CSV do pacote (termina com \\). Troque em Transformar dados > Editar parâmetros e clique em Atualizar.' }],
  tabelas: [...tabelas, { nome: 'Medidas', descricao: 'Guarda as medidas do painel, em pastas por página.', colunas: [{ nome: 'Medidas', tipo: 'string', oculta: true }], medidas }],
  relacoes: [
    // Nos dois sentidos: escolher um município leva a parte do recorte e a dívida à regional dele.
    { de: ['Municípios', 'GRE'], para: ['Regionais', 'GRE'], ambasDirecoes: true },
    { de: ['Receitas', 'Mês'], para: ['Calendário', 'Mês'] },
    { de: ['Receitas', 'Tipo'], para: ['Tipos de receita', 'Tipo'] },
    { de: ['Despesas', 'Mês'], para: ['Calendário', 'Mês'] },
    { de: ['Despesas', 'Grupo'], para: ['Grupos de despesa', 'Grupo'] },
    { de: ['Metas', 'Tipo'], para: ['Tipos de receita', 'Tipo'] },
    { de: ['Arrecadação', 'Dia'], para: ['Dias', 'Dia'] },
    { de: ['Arrecadação', 'Tipo'], para: ['Tipos de receita', 'Tipo'] },
    { de: ['Pesos', 'Código IBGE'], para: ['Municípios', 'Código IBGE'] },
    { de: ['Pesos', 'Tipo'], para: ['Tipos de receita', 'Tipo'] },
    { de: ['Diárias', 'Pessoa'], para: ['Pessoas', 'Pessoa'] },
    { de: ['Pagamentos', 'Fornecedor'], para: ['Fornecedores', 'Fornecedor'] },
    { de: ['Títulos', 'Código IBGE'], para: ['Municípios', 'Código IBGE'] },
    { de: ['Foto da dívida', 'Código IBGE'], para: ['Municípios', 'Código IBGE'] },
    { de: ['Foto da adimplência', 'Código IBGE'], para: ['Municípios', 'Código IBGE'] },
  ],
};
