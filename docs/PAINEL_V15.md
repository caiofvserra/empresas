# Painel V15 — gestão de empresas em uma tela

Versão enxuta para a administração do CREA-SP: uma única página no tamanho de tela de PC (1920×1080 e 1366×768), sem abas. O detalhe abre num painel lateral ao clicar num indicador, numa célula da tabela ou num município, com a lista de empresas para agir.

## Indicadores mantidos (cada um leva a uma decisão)

| Indicador | Decisão que apoia | Lista ao clicar |
|---|---|---|
| Empresas com registro ativo e variação | A base cresce ou encolhe? Onde? | Empresas que saíram do registro no período |
| Arrecadação de empresas vs. mesmo período do ano anterior | A receita PJ melhora? Quais regionais caem? | Maiores pagadores |
| Saldo vencido e % de empresas em atraso | Quem cobrar primeiro | Maiores devedores, com dias de atraso |
| Empresas sem registro (CNPJs ativos com CNAE de engenharia) e potencial em anuidades | Onde fiscalizar e orientar o registro | CNPJs sem registro, mais recentes primeiro |
| Empresas sem responsável técnico | Quem notificar para indicar RT | Empresas ativas sem RT, há mais tempo primeiro |
| Fiscalizações em aberto e casos com mais de 1 ano | Onde a fila de fiscalização trava | Casos abertos, mais antigos primeiro |

A tabela "Onde agir" repete os seis por gerência regional; o mapa mostra a coluna escolhida por município; o gráfico de arrecadação compara 12 meses com o ano anterior.

## Retirados da tela principal

Permanência condicional, continuidade de RT em dias-empresa, emprego RAIS/CAGED, valor PNCP, fornecedores públicos, vínculo contrato–ART, ingresso observado, projeções e o contexto público nacional (Confea, IBGE, BCB). São úteis para estudo, mas não indicam uma ação direta da administração; continuam disponíveis nas versões V13/V14.

## Acesso

`entrega/painel-gestao-creasp.html` é um arquivo único (JS, CSS, fontes e malha municipal embutidos): basta abrir no navegador, sem servidor nem internet. Para regerar: `npm run build:painel`. Valores internos são demonstrativos.
