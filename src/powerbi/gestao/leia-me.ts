/*
 * As seções do LEIA-ME dos pacotes que saem do modelo comum (Financeiro e Atendimento): o que vem pronto e o que falta
 * montar no Power BI Desktop. Os trechos que valem para os dois ficam no alto.
 */
const FILTROS = 'Os filtros no alto (regional, município, data de referência e período) ficam sincronizados entre as páginas, com o tema do Crea-SP. Os gráficos saem com rótulos de dados e legenda, para ler sem passar o mouse.';
const CARTOES = 'Em cada cartão, como no painel: o número, a comparação (com um ano antes, ou com os 12 meses anteriores na despesa e nas diárias) e a linha de apoio.';
export const PERIODO = 'O período é um parâmetro do tipo "Intervalo numérico", de 1 a 36 meses, com controle deslizante.';
export const FOTOS = 'Na base real, a carga precisa gravar a foto todo fim de mês sem reescrever as anteriores.';
const MAPA = (indicador: string) => `insira o visual Mapa de formas no lugar do bloco "A montar"; em Formatar > Configurações do mapa > Mapa personalizado, carregue \`mapas/sp-municipios.json\`; ponha Municípios[Município] em Local e ${indicador} em Saturação de cor.`;
export const VISUAIS = 'Os arquivos seguem os schemas oficiais da Microsoft, mas os nomes internos dos campos de alguns visuais (cartão, barras, linha, tabela) não são documentados. Se um visual abrir vazio, arraste de novo a medida para ele e salve: o Desktop corrige o arquivo.';

export const LEIA_ME_FINANCEIRO = `## O que vem pronto

- O modelo em esquema estrela: regionais, municípios, calendário, datas de referência e período; a foto de cada fim de mês da dívida de anuidade; e os fatos com data: receita, despesa, diárias por pessoa, empenhos, contratos e títulos de anuidade.
- As medidas dos cartões e dos gráficos, em pastas com o nome de cada página, cada uma com a descrição de como é calculada.
- As duas páginas (Receita e Orçamento e despesa). ${FILTROS}
- ${CARTOES}
- Os gastos com nome: a tabela de diárias por beneficiário (nome, categoria, cargo, lotação, valor, diárias, meses e quilômetros), os fornecedores pela razão social com os empenhos de cada um e o pessoal por função com cada servidor. No cenário, os nomes são fictícios.
- ${PERIODO} A despesa, as diárias e os fornecedores usam sempre os 12 meses até a data, como no painel.

A dívida vem da foto da data escolhida; a receita e a despesa são somadas no período. ${FOTOS}

As regras: o piso de execução é cinco vezes a anuidade de pessoa física (Lei 12.514/2011, art. 8º); a anuidade vencida prescreve em cinco anos (Código Tributário Nacional, art. 174), e "perto de prescrever" é a vencida há mais de quatro anos.

## O que falta montar no Desktop

O mapa da dívida de anuidade por município: ${MAPA('a medida "Anuidades vencidas"')}

A ordem das tabelas: na de diárias por beneficiário, clique no título da coluna Valor para pôr quem mais recebeu no alto; na matriz de fornecedores, clique no título Empenhado. Cada fornecedor abre (+) nos empenhos dos 12 meses, com o contrato, e cada função do pessoal abre na lista dos servidores, pelo nome. Para ver só os maiores, use o filtro N superior do visual.

Ficam só no painel em HTML: as curvas de quanto se recebe depois do vencimento e a despesa publicada por profissional ativo (dados reais da Transparência).

O pessoal não tem GRE na tabela: a lotação é o nome da GRE ou "Sede". Com uma regional escolhida, as medidas de pessoal contam só quem está lotado nela.

${VISUAIS}

`;

export const LEIA_ME_ATENDIMENTO = `## O que vem pronto

- O modelo em esquema estrela: regionais, municípios (com a unidade de atendimento mais próxima e a distância), calendário, datas de referência e período; a foto de cada fim de mês dos profissionais ativos; e os fatos com data: solicitações de atendimento e uso dos coworkings.
- As medidas dos cartões e dos gráficos, cada uma com a descrição de como é calculada.
- A página de Atendimento. ${FILTROS}
- ${CARTOES}
- ${PERIODO}

Os profissionais ativos vêm da foto da data escolhida; as solicitações e o uso dos coworkings são somados no período. ${FOTOS}

## O que falta montar no Desktop

O mapa da distância até a unidade por município: ${MAPA('a coluna Municípios[Distância até a unidade (km)]')}

${VISUAIS}

`;
