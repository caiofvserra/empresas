# Pacote Power BI do painel de Indicadores do Sistema

Gerado a partir do protótipo em HTML (repositório caiofvserra/empresas, `npm run build:powerbi`), com o cenário de demonstração até 30/09/2026. Os números são fictícios e servem para conferir o modelo e as telas, não o Crea-SP.

## Como abrir

1. Copie a pasta inteira para o computador com o Power BI Desktop (versão de 2026 ou mais nova).
2. Abra `Indicadores.pbip`. O relatório abre sem dados.
3. Em Página Inicial > Transformar dados > Editar parâmetros, troque "Pasta dos dados" pelo caminho da pasta `dados` deste pacote, terminando com \\ (por exemplo `C:\\CREA-SP\\powerbi\\indicadores\\dados\\`).
4. Clique em Atualizar.

## O que vem pronto

- O modelo: regionais, municípios, exercícios (desde 2022; o do ano em curso vai até a data do pacote), as 161 métricas que o Crea-SP manda ao Confea e os 29 indicadores que o Confea calcula com elas, com o código da planilha, a definição, a fórmula e a referência do Sistema em 2021 (Caderno de Resultados); o valor de cada métrica e de cada indicador em cada exercício, do Conselho inteiro e de cada regional; a situação de cada métrica, as conferências antes do envio, as ações e os autos de cada município e o calendário de entregas ao Confea.
- Uma medida por indicador, com o formato da unidade (taxa em %, média com duas casas), e a diferença para o exercício anterior. As medidas [Valor da métrica] e [Valor do indicador] servem a qualquer tabela que tenha o código na linha.
- As cinco páginas (Registro, Fiscalização, Julgamento, Suporte e Liderança, Entrega ao Confea). Os filtros no alto (regional e exercício) ficam sincronizados entre as páginas, com o tema do Crea-SP. Os gráficos saem com rótulos de dados e legenda, para ler sem passar o mouse.
- Em cada cartão, como no painel: o número, a diferença para o exercício anterior e a referência do Sistema em 2021 (ou as métricas que faltam para o indicador sair).

Como cada número segue o recorte: o Confea recebe só o Conselho inteiro, e a regional é recorte interno do Crea-SP. Com uma regional escolhida, a métrica que se divide por regional (profissionais, empresas, ARTs, ações, autos, anuidades, quadro da fiscalização) mostra a regional; a que não se divide (julgamento, despesa, liderança) fica do Conselho inteiro. O indicador segue a regional quando todas as métricas dele se dividem. A página Entrega ao Confea é sempre do Conselho inteiro: a planilha vai inteira.

Sem exercício escolhido, vale o último completo. Os gráficos e tabelas "em cada exercício" mostram todos os anos, qualquer que seja a escolha do alto.

Os números são do cenário de demonstração, menos os publicados no Sumário Executivo 2025 do Crea-SP (registros novos, ARTs, ações e autos de fiscalização em 2025), marcados na coluna Real da tabela Valores. O cenário planta de propósito duas conferências que não fecham e três métricas vazias, para mostrar o que a página Entrega ao Confea aponta.

As metas do PMF (Plano de Melhoria da Fiscalização 2025-2027 do Confea): ações +12% até 2027 sobre 2024 (meta 2.3); 90% das infrações julgadas em até 180 dias (5.1); éticos em até 360 dias (5.2); registro em até 30 dias (5.3). As três últimas vêm de fora da planilha (GovAdm e atendimento) e estão nas colunas ocultas da tabela Exercícios.

## O que falta montar no Desktop

O mapa das ações por município da página Fiscalização: insira o visual Mapa de formas; em Formatar > Configurações do mapa > Mapa personalizado, carregue `mapas/sp-municipios.json`; ponha Municípios[Município] em Local e a medida "Ações no município" em Saturação de cor.

As cores das tabelas: no HTML, a conferência que não fecha e a métrica vazia ficam marcadas em vermelho. Em Formatar > Elementos da célula, ligue a Cor da fonte pela medida "Situação da conferência".

As notas do Caderno de 2021 sobre o Crea-SP (o que não foi mandado ou foi descartado, e como está hoje) ficam só no painel em HTML.

Os arquivos seguem os schemas oficiais da Microsoft, mas os nomes internos dos campos de alguns visuais (cartão, barras, linha, tabela) não são documentados. Se um visual abrir vazio, arraste de novo a medida para ele e salve: o Desktop corrige o arquivo.

## Trocar pela base real

Troque a origem de cada tabela (Transformar dados) do CSV para a consulta da base do Crea-SP, mantendo os nomes das colunas. As medidas e as páginas continuam as mesmas.
