# Pacote Power BI do painel de Atendimento

Gerado a partir do protótipo em HTML (repositório caiofvserra/empresas, `npm run build:powerbi`), com o cenário de demonstração até 30/09/2026. Os números são fictícios e servem para conferir o modelo e as telas, não o Crea-SP.

## Como abrir

1. Copie a pasta inteira para o computador com o Power BI Desktop (versão de 2026 ou mais nova).
2. Abra `Atendimento.pbip`. O relatório abre sem dados.
3. Em Página Inicial > Transformar dados > Editar parâmetros, troque "Pasta dos dados" pelo caminho da pasta `dados` deste pacote, terminando com \\ (por exemplo `C:\\CREA-SP\\powerbi\\atendimento\\dados\\`).
4. Clique em Atualizar.

## O que vem pronto

- O modelo em esquema estrela: regionais, municípios (com a unidade de atendimento mais próxima e a distância), calendário, datas de referência e período; os protocolos (o serviço, o prazo em dias úteis, a taxa, o município de quem pediu, a unidade, o canal); a foto de cada fim de mês dos protocolos (status, situação, dentro ou fora do prazo, com quem está, dias úteis com o Crea-SP) e dos profissionais ativos; o quadro de atendimento; e a demanda de fora: aberturas de engenharia na Receita, ARTs registradas, concluintes do INEP, formados que se registraram, pedidos de informação e ouvidoria, e o uso dos coworkings.
- As medidas dos cartões e dos gráficos, em pastas com o nome de cada página, cada uma com a descrição de como é calculada.
- As três páginas (Protocolos, Equipe e território, Demanda). Os filtros no alto (regional, município, tipo de serviço, unidade, data de referência e período) ficam sincronizados entre as páginas, com o tema do Crea-SP. Os gráficos saem com rótulos de dados e legenda, para ler sem passar o mouse.
- Em cada cartão, como no painel: o número, a comparação com um ano antes e a linha de apoio.
- O nome de cada colaborador, com a fila dele, e a linha "Sem atribuição". No cenário, os nomes são fictícios.
- O período é um parâmetro do tipo "Intervalo numérico", de 1 a 36 meses, com controle deslizante.

Como no painel antigo, os cartões contam os protocolos abertos no período, cada um com a situação na data escolhida (a foto dela). O prazo é o de cada serviço, em dias úteis, contado só enquanto o protocolo está com o Crea-SP; em exigência, o solicitante tem 30 dias corridos para responder. A regional e o município são os de quem pediu. O tipo de serviço e a unidade recortam os protocolos; a demanda de fora (aberturas, ARTs, formatura) e os fechados por colaborador olham só o lugar. Os pedidos de informação e a ouvidoria são do Crea-SP inteiro. Na base real, a carga precisa gravar a foto todo fim de mês sem reescrever as anteriores.

## O que falta montar no Desktop

O mapa dos 645 municípios: insira o visual Mapa de formas no lugar do bloco "A montar"; em Formatar > Configurações do mapa > Mapa personalizado, carregue `mapas/sp-municipios.json`; ponha Municípios[Município] em Local e a medida "Abertos no período" (ou "Fechados no prazo") em Saturação de cor.

A ordem e o tamanho das listas: no gráfico "Com quem estão os protocolos" e no "Por que há exigência", use o filtro N superior do visual (as 16 pessoas e os 6 motivos com mais protocolos). Na tabela dos serviços, clique no título "Protocolos" para pôr o mais pedido no alto.

As cores pela meta: na matriz "Fechados no prazo, por regional e trimestre" e na coluna "No prazo" da tabela dos serviços, em Formatar > Elementos da célula, ligue a Cor da tela de fundo por regras: 80% ou mais em verde, de 65% a 80% em laranja, abaixo de 65% em vermelho. No gráfico de previsão, pinte a série "Previstos" com o mesmo tom, mais claro.

Ficam só no painel em HTML: a lista das aberturas na Receita que não pediram registro, com o nome da empresa, e a ocupação de cada coworking mês a mês (no pacote, a ocupação do período por unidade).

Os arquivos seguem os schemas oficiais da Microsoft, mas os nomes internos dos campos de alguns visuais (cartão, barras, linha, tabela) não são documentados. Se um visual abrir vazio, arraste de novo a medida para ele e salve: o Desktop corrige o arquivo.

## Trocar pela base real

Troque a origem de cada tabela (Transformar dados) do CSV para a consulta da base do Crea-SP, mantendo os nomes das colunas. As medidas e as páginas continuam as mesmas.
