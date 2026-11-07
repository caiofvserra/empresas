import { FOTOS, PERIODO, VISUAIS } from '../gestao/leia-me';

/** De onde vêm os números do pacote Financeiro: parte real, parte do cenário. Entra no alto do LEIA-ME, no lugar da frase padrão. */
export const ORIGEM_FINANCEIRO = (capturadoEm: string) => `A receita, a despesa, o orçamento, as diárias pelo nome, os fornecedores e os contratos são REAIS, da Transparência do Crea-SP (coletados em ${capturadoEm.split('-').reverse().join('/')}, do estado inteiro). A divisão da arrecadação pelos dias e pelos municípios, a dívida de anuidade, os protestos e a adimplência vêm do cenário de demonstração: em produção, saem do CreaNet.`;

const MAPA = (indicador: string) => `insira o visual Mapa de formas no lugar do bloco "A montar"; em Formatar > Configurações do mapa > Mapa personalizado, carregue \`mapas/sp-municipios.json\`; ponha Municípios[Município] em Local e ${indicador} em Saturação de cor.`;

export const LEIA_ME_FINANCEIRO = `## O que vem pronto

- O modelo em esquema estrela: regionais, municípios, calendário (desde 2013), dias, tipos de receita, grupos de despesa, datas de referência e período; a receita, a despesa, o orçamento, a meta, as diárias por pessoa, os pagamentos a fornecedores e os contratos (reais); a arrecadação de cada dia útil, o peso de cada município, os títulos de anuidade e as fotos de cada fim de mês da dívida e da adimplência (cenário).
- As medidas dos cartões e dos gráficos, em pastas com o nome de cada página, cada uma com a descrição de como é calculada.
- As quatro páginas (Arrecadação, Receita, Dívida e cobrança, Orçamento e despesa). Os filtros no alto (regional, município, data de referência e período) ficam sincronizados entre as páginas, com o tema do Crea-SP. Os gráficos saem com rótulos de dados e legenda, para ler sem passar o mouse.
- Em cada cartão, como no painel: o número, a comparação com um ano antes (quando o painel tem) e a linha de apoio.
- Os gastos com nome: quem recebeu diárias, jetons e deslocamento (nome, categoria, valor, pagamentos e meses) e os fornecedores pela razão social, como a Transparência publica. O CPF não vem no pacote.
- ${PERIODO}

A meta de arrecadação de cada mês é a receita orçada reformulada do ano dividida no ritmo do ano anterior, tipo a tipo, até a TI informar a meta oficial (troque a tabela Metas pela oficial, com as mesmas colunas).

A regional e o município mudam a arrecadação (pelo peso de cada município em cada tipo de receita), a dívida e a adimplência. A receita, a despesa, o orçamento, as diárias, os fornecedores e os contratos são do estado inteiro e não mudam com eles.

A dívida e a adimplência vêm da foto da data escolhida; a receita, a despesa, as diárias e os pagamentos são somados no período. ${FOTOS}

As regras: o piso de execução é cinco vezes a anuidade de pessoa física (Lei 12.514/2011, art. 8º); a anuidade vencida prescreve em cinco anos (Código Tributário Nacional, art. 174), e "perto de prescrever" é a vencida há mais de quatro anos. Vai a protesto o devedor acima do piso com anuidade vencida há um ano ou mais.

## O que falta montar no Desktop

Os mapas por município: na Arrecadação, ${MAPA('a medida "Arrecadado no ano por município"')} Na Dívida e cobrança, faça o mesmo com a medida "Anuidades vencidas".

As duas matrizes de calor: no calendário do mês e na receita de cada mês, ano a ano, use Formatar > Elementos da célula > Cor da tela de fundo, com escala de cores.

A ordem das tabelas: na de diárias e na de fornecedores, clique no título da coluna Valor (ou Pago) para pôr o maior no alto. Para ver só os maiores, use o filtro N superior do visual.

Ficam só no painel em HTML: as curvas de quanto se recebe depois do vencimento e a adimplência das empresas.

${VISUAIS}

`;
