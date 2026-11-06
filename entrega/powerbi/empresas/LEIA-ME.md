# Pacote Power BI do painel de Empresas

Gerado a partir do protótipo em HTML (repositório caiofvserra/empresas, `npm run build:powerbi`), com o cenário de demonstração até 30/09/2026. Os números são fictícios e servem para conferir o modelo e as telas, não o Crea-SP.

## Como abrir

1. Copie a pasta inteira para o computador com o Power BI Desktop (versão de 2026 ou mais nova).
2. Abra `Empresas.pbip`. O relatório abre sem dados.
3. Em Página Inicial > Transformar dados > Editar parâmetros, troque "Pasta dos dados" pelo caminho da pasta `dados` deste pacote, terminando com \\ (por exemplo `C:\\CREA-SP\\powerbi\\empresas\\dados\\`).
4. Clique em Atualizar.

## O que vem pronto

- O modelo em esquema estrela: regionais, municípios, empresas, estabelecimentos, calendário, datas de referência e período; as fotos de cada fim de mês (empresas e estabelecimentos); entradas e saídas, ARTs e emprego formal; e os blocos que dependem de acordo, em demonstração.
- As medidas dos cartões e dos gráficos, em pastas com o nome de cada página, cada uma com a descrição de como é calculada.
- As quatro páginas (Registro e mercado, Evolução, RT e ART, Vínculos), com os filtros no alto sincronizados entre elas e o tema do Crea-SP.
- Em cada cartão, o número e, embaixo, a variação em relação a um ano antes (em %, ou em pontos percentuais quando o cartão é uma parte).
- O período é um parâmetro de intervalo numérico, de 1 a 36 meses, com controle deslizante. O painel em HTML tem atalhos de 3, 6, 12 e 24 meses; no Power BI, eles podem virar indicadores (bookmarks) com botões, montados no Desktop.

Os estoques e as taxas (registradas, em dia, com RT) vêm da foto da data escolhida; os fluxos (entradas, saídas, ARTs, aberturas) são somados no período. Na base real, a carga precisa gravar a foto todo fim de mês sem reescrever as anteriores.

## O que falta montar no Desktop

Os blocos marcados "A montar" na tela dizem o que falta.

Para o mapa por município: insira o visual Mapa de formas no lugar do bloco; em Formatar > Configurações do mapa > Mapa personalizado, carregue `mapas/sp-municipios.json`; ponha Municípios[Município] em Local e a medida "Parte do mercado que está registrada" em Saturação de cor.

Os filtros de regional, município e câmara chegam aos estabelecimentos do mercado pela empresa: valem o município e a câmara da matriz, e não os do próprio estabelecimento (ver a ADR 0002 do repositório).

Os arquivos seguem os schemas oficiais da Microsoft, mas os nomes internos dos campos de alguns visuais (cartão, rosca, mapa de árvore, linha) não são documentados. Se um visual abrir vazio, arraste de novo a medida para ele e salve: o Desktop corrige o arquivo.

## Trocar pela base real

Troque a origem de cada tabela (Transformar dados) do CSV para a consulta da base do Crea-SP, mantendo os nomes das colunas. As medidas e as páginas continuam as mesmas.
