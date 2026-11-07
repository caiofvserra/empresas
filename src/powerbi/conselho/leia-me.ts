import { FOTOS, PERIODO, VISUAIS } from '../gestao/leia-me';

/* As seções do LEIA-ME do pacote do painel de Gestão do Conselho: o que vem pronto e o que falta montar no Power BI Desktop. */
export const LEIA_ME_CONSELHO = `## O que vem pronto

- O modelo em esquema estrela: regionais, municípios, colegiados (o Plenário e as nove câmaras), pessoas, calendário, datas de referência e período; as fotos de cada fim de mês (a fila do Votenet e as cadeiras e os profissionais de cada câmara); e os fatos com data: tramitações, idas à pauta e desvios, mandatos, presenças nas sessões, diárias dos conselheiros, autos de infração, pagamentos às organizações e deliberações de repasse.
- As medidas dos cartões e dos gráficos, em pastas com o nome de cada página, cada uma com a descrição de como é calculada.
- As cinco páginas (Colegiado, Processos, Conselheiros, Decisões e Representação). Os filtros no alto (regional, município, colegiado, data de referência e período) ficam sincronizados entre elas, com o tema do Crea-SP. Os gráficos saem com rótulos de dados e legenda, para ler sem passar o mouse.
- Em cada cartão, como no painel: o número, a comparação com um ano antes (quando o painel tem) e a linha de apoio.
- Os nomes: com quem está cada processo, o relator dos autos perto da prescrição, quem recebeu diária e quem propôs cada repasse. No cenário, os nomes são fictícios.
- ${PERIODO} As diárias e os repasses usam sempre os 12 meses até a data, como no painel.

O colegiado escolhido recorta os processos e os conselheiros; a regional e o município recortam só os processos, pelo lugar do processo, porque o conselheiro representa uma modalidade, e não uma regional. Com o Plenário escolhido, os processos são os recursos, estão todos os conselheiros e as decisões são as dos autos que chegaram a ele.

A fila, os conselheiros em exercício e as cadeiras vêm da data escolhida; os votados, os relatos, as sessões, os autos e as deliberações são somados no período. ${FOTOS}

As regras: o alerta é amarelo de 90 a 120 dias no mesmo status do Votenet e vermelho acima de 120. O auto de infração prescreve cinco anos depois do fato (Lei 9.873/1999, art. 1º) ou com três anos parado no mesmo status (a intercorrente, art. 1º, § 1º), o que vier primeiro; no Plenário, só corre a intercorrente. A multa vem em dobro na reincidência (Lei 5.194/66, art. 73, parágrafo único).

## O que falta montar no Desktop

A ordem e o tamanho das listas: no gráfico "Com quem estão os processos" e no "Menor presença nas sessões", use o filtro N superior do visual (as dez pessoas com mais processos; os dez conselheiros com menor presença, em ordem crescente). Na tabela da fila, clique no título "Dias no status" para pôr o mais parado no alto; na de diárias, no título "Valor".

As cores do alerta: no gráfico "Com quem estão os processos", em Formatar > Colunas, pinte Vermelho, Amarelo e Sem alerta. Na matriz "Há quanto tempo estão no status", em Formatar > Elementos da célula, ligue a Cor da tela de fundo e escolha a escala de cor.

O gráfico da carga e do tempo de relato de cada conselheiro, que no painel é de dispersão, vem como tabela, com os processos e a presença de cada um. O tempo de relato de cada conselheiro fica só no painel em HTML; no pacote, ele aparece no cartão e no gráfico por trimestre.

${VISUAIS}

`;
