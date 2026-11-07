/*
 * As seções do LEIA-ME do pacote que sai do modelo comum (Atendimento): o que vem pronto e o que falta montar no Power BI
 * Desktop. Os trechos no alto valem também para o Financeiro (`src/powerbi/financeiro/leia-me.ts`).
 */
const FILTROS = 'Os filtros no alto (regional, município, data de referência e período) ficam sincronizados entre as páginas, com o tema do Crea-SP. Os gráficos saem com rótulos de dados e legenda, para ler sem passar o mouse.';
const CARTOES = 'Em cada cartão, como no painel: o número, a comparação com um ano antes e a linha de apoio.';
export const PERIODO = 'O período é um parâmetro do tipo "Intervalo numérico", de 1 a 36 meses, com controle deslizante.';
export const FOTOS = 'Na base real, a carga precisa gravar a foto todo fim de mês sem reescrever as anteriores.';
const MAPA = (indicador: string) => `insira o visual Mapa de formas no lugar do bloco "A montar"; em Formatar > Configurações do mapa > Mapa personalizado, carregue \`mapas/sp-municipios.json\`; ponha Municípios[Município] em Local e ${indicador} em Saturação de cor.`;
export const VISUAIS = 'Os arquivos seguem os schemas oficiais da Microsoft, mas os nomes internos dos campos de alguns visuais (cartão, barras, linha, tabela) não são documentados. Se um visual abrir vazio, arraste de novo a medida para ele e salve: o Desktop corrige o arquivo.';

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
