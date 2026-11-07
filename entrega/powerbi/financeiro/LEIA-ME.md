# Pacote Power BI do painel Financeiro

Gerado a partir do protótipo em HTML (repositório caiofvserra/empresas, `npm run build:powerbi`), com o cenário de demonstração até 30/09/2026. Os números são fictícios e servem para conferir o modelo e as telas, não o Crea-SP.

## Como abrir

1. Copie a pasta inteira para o computador com o Power BI Desktop (versão de 2026 ou mais nova).
2. Abra `Financeiro.pbip`. O relatório abre sem dados.
3. Em Página Inicial > Transformar dados > Editar parâmetros, troque "Pasta dos dados" pelo caminho da pasta `dados` deste pacote, terminando com \\ (por exemplo `C:\\CREA-SP\\powerbi\\financeiro\\dados\\`).
4. Clique em Atualizar.

## O que vem pronto

- O modelo em esquema estrela: regionais, municípios, calendário, datas de referência e período; a foto de cada fim de mês da dívida de anuidade; e os fatos com data: receita, despesa, diárias por pessoa, empenhos, contratos e títulos de anuidade.
- As medidas dos cartões e dos gráficos, em pastas com o nome de cada página, cada uma com a descrição de como é calculada.
- As duas páginas (Receita e Orçamento e despesa). Os filtros no alto (regional, município, data de referência e período) ficam sincronizados entre as páginas, com o tema do Crea-SP. Os gráficos saem com rótulos de dados e legenda, para ler sem passar o mouse.
- Em cada cartão, como no painel: o número, a comparação (com um ano antes, ou com os 12 meses anteriores na despesa, nas diárias e nos repasses) e a linha de apoio.
- Os gastos com nome: a tabela de diárias por beneficiário (nome, categoria, cargo, lotação, valor, diárias, meses e quilômetros), os fornecedores pela razão social com os empenhos de cada um e o pessoal por função com cada servidor. No cenário, os nomes são fictícios.
- O período é um parâmetro do tipo "Intervalo numérico", de 1 a 36 meses, com controle deslizante. A despesa, as diárias e os fornecedores usam sempre os 12 meses até a data, como no painel.

A dívida vem da foto da data escolhida; a receita e a despesa são somadas no período. Na base real, a carga precisa gravar a foto todo fim de mês sem reescrever as anteriores.

As regras: o piso de execução é cinco vezes a anuidade de pessoa física (Lei 12.514/2011, art. 8º); a anuidade vencida prescreve em cinco anos (Código Tributário Nacional, art. 174), e "perto de prescrever" é a vencida há mais de quatro anos.

## O que falta montar no Desktop

O mapa da dívida de anuidade por município: insira o visual Mapa de formas no lugar do bloco "A montar"; em Formatar > Configurações do mapa > Mapa personalizado, carregue `mapas/sp-municipios.json`; ponha Municípios[Município] em Local e a medida "Anuidades vencidas" em Saturação de cor.

A ordem das tabelas: na de diárias por beneficiário, clique no título da coluna Valor para pôr quem mais recebeu no alto; na matriz de fornecedores, clique no título Empenhado. Cada fornecedor abre (+) nos empenhos dos 12 meses, com o contrato, e cada função do pessoal abre na lista dos servidores, pelo nome. Para ver só os maiores, use o filtro N superior do visual.

Ficam só no painel em HTML: as curvas de quanto se recebe depois do vencimento e a despesa publicada por profissional ativo (dados reais da Transparência).

O pessoal não tem GRE na tabela: a lotação é o nome da GRE ou "Sede". Com uma regional escolhida, as medidas de pessoal contam só quem está lotado nela.

Os arquivos seguem os schemas oficiais da Microsoft, mas os nomes internos dos campos de alguns visuais (cartão, barras, linha, tabela) não são documentados. Se um visual abrir vazio, arraste de novo a medida para ele e salve: o Desktop corrige o arquivo.

## Trocar pela base real

Troque a origem de cada tabela (Transformar dados) do CSV para a consulta da base do Crea-SP, mantendo os nomes das colunas. As medidas e as páginas continuam as mesmas.
