# Pacote Power BI do painel de Atendimento

Gerado a partir do protótipo em HTML (repositório caiofvserra/empresas, `npm run build:powerbi`), com o cenário de demonstração até 30/09/2026. Os números são fictícios e servem para conferir o modelo e as telas, não o Crea-SP.

## Como abrir

1. Copie a pasta inteira para o computador com o Power BI Desktop (versão de 2026 ou mais nova).
2. Abra `Atendimento.pbip`. O relatório abre sem dados.
3. Em Página Inicial > Transformar dados > Editar parâmetros, troque "Pasta dos dados" pelo caminho da pasta `dados` deste pacote, terminando com \\ (por exemplo `C:\\CREA-SP\\powerbi\\atendimento\\dados\\`).
4. Clique em Atualizar.

## O que vem pronto

- O modelo em esquema estrela: regionais, municípios (com a unidade de atendimento mais próxima e a distância), calendário, datas de referência e período; a foto de cada fim de mês dos profissionais ativos; e os fatos com data: solicitações de atendimento e uso dos coworkings.
- As medidas dos cartões e dos gráficos, cada uma com a descrição de como é calculada.
- A página de Atendimento. Os filtros no alto (regional, município, data de referência e período) ficam sincronizados entre as páginas, com o tema do Crea-SP. Os gráficos saem com rótulos de dados e legenda, para ler sem passar o mouse.
- Em cada cartão, como no painel: o número, a comparação (com um ano antes, ou com os 12 meses anteriores na despesa, nas diárias e nos repasses) e a linha de apoio.
- O período é um parâmetro do tipo "Intervalo numérico", de 1 a 36 meses, com controle deslizante.

Os profissionais ativos vêm da foto da data escolhida; as solicitações e o uso dos coworkings são somados no período. Na base real, a carga precisa gravar a foto todo fim de mês sem reescrever as anteriores.

## O que falta montar no Desktop

O mapa da distância até a unidade por município: insira o visual Mapa de formas no lugar do bloco "A montar"; em Formatar > Configurações do mapa > Mapa personalizado, carregue `mapas/sp-municipios.json`; ponha Municípios[Município] em Local e a coluna Municípios[Distância até a unidade (km)] em Saturação de cor.

Os arquivos seguem os schemas oficiais da Microsoft, mas os nomes internos dos campos de alguns visuais (cartão, barras, linha, tabela) não são documentados. Se um visual abrir vazio, arraste de novo a medida para ele e salve: o Desktop corrige o arquivo.

## Trocar pela base real

Troque a origem de cada tabela (Transformar dados) do CSV para a consulta da base do Crea-SP, mantendo os nomes das colunas. As medidas e as páginas continuam as mesmas.
