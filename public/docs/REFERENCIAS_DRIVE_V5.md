# Referências visuais fornecidas no Google Drive — revisão V5

Pasta pública: [Dash](https://drive.google.com/drive/folders/1jM5rv6P0mD3YU9hiMIyF1aLlXeBH8C4l). Consulta em 10/10/2026. O HTML da pasta permitiu identificar 22 arquivos; os 22 foram baixados pelos links públicos de download e confirmados como imagens. Não foram encontrados PDFs entre os arquivos listados. Não foi necessário acessar uma conta ou inferir o conteúdo de arquivos privados.

As imagens são referências de composição e escolha de gráficos. Elas não fornecem dados do CREA-SP nem evidência sobre o mercado de engenharia. Os arquivos originais ficam em `/workspace/references/drive-v5`, fora dos ativos publicados da aplicação; este documento conserva os links e a descrição do que foi observado.

## Referências que orientam a composição

| Referência observada | Padrão concreto | Aplicação ao relatório CREA-SP |
| --- | --- | --- |
| [Performance Analysis](https://drive.google.com/file/d/1AALojYyDLwJiWXZ1KlnwLw00pAdZH2Mi/view), 4006 × 2253 | Tela 16:9; seis KPIs alinhados; uma série temporal ampla; duas barras inferiores; matriz lateral com barra de valor e variação divergente | Faixa de indicadores, uma análise principal e painéis complementares visíveis ao mesmo tempo; comparação temporal com período recente destacado e ranking que combine magnitude e mudança |
| [IT Support](https://drive.google.com/file/d/1hOJXkPLFUHVNkJydyQOFthNX8o6WpZOG/view), 4006 × 2253 | Segmentações compactas no topo; combo colunas de volume + linha de tempo de resolução; rankings na segunda fileira; títulos com sequência de drill-down | Relacionar quantidade e taxa/tempo numa visualização; ordenar a leitura do panorama para a decomposição; aplicar filtros cruzados aos gráficos pertinentes |
| [Análise de Receita e Margem](https://drive.google.com/file/d/1UCIfObQ_CHuCYX4KMYbUltYp7HlVZkzo/view), 1240 × 698 | Canvas 16:9; navegação lateral estreita por ícones; três métricas com sparklines; matriz com barras nas células; barras agrupadas na parte inferior | Integrar números e histórico; usar matriz analítica no canvas em vez de depender de ficha cadastral; separar identidade institucional de conteúdo dos gráficos |
| [Fluxo de Caixa](https://drive.google.com/file/d/13EyuvVC6dyhVVpKrJZ02bx7WhRjxh8hO/view), 1242 × 698 | Cinco medidas na faixa superior; cascata mensal; matriz de composição com análise vertical e horizontal | Explicar contribuição positiva/negativa ao saldo cadastral ou financeiro; combinar variação e composição sem ocultar gráficos em outras perspectivas |
| [QuickBooks — P&L](https://drive.google.com/file/d/18hlSOuBEDkSLHOTZ9Z72FmGGfv7FHYw1/view), 1071 × 531 | Uma mesma página reúne séries, barras horizontais, matrizes com formatação condicional e combo de custos/resultado | Reconciliar tendência, distribuição e composição do mesmo conjunto; priorizar densidade analítica coerente, com títulos e unidades explícitos |
| [Visão Geral de Vendas](https://drive.google.com/file/d/1w3ZeRZB1HeVNLQ2TLkz9GeTVx_ihf7P3/view), 1024 × 574 | Quatro KPIs; gráfico combinado de colunas e linha; rankings paralelos; tabela de contribuição | Ver simultaneamente evolução da base, novos registros e baixas, cobertura por setor e território; os gráficos compartilham segmentações |
| [Google Charts — catálogo](https://drive.google.com/file/d/13O-s97fIsfsn1f3FPXqYG-PJu8vcJPSR/view) e [Dataviz Project](https://drive.google.com/file/d/1pLKw4i5wBi03NixNx8pQogKQ5cu6e6Aq/view) | Catálogo de combo, dispersão, histograma, treemap, matriz, Sankey, alluvial e mapa | Escolher cada visual pelo tipo de pergunta: evolução, relação, distribuição, composição ou vínculo. Um catálogo de tipos não substitui a explicação de seus denominadores |

## Direção de design extraída das imagens

1. Tela analítica com largura e altura aproveitadas, em formato próximo de 16:9. Em resoluções de PC suportadas, os indicadores e as duas fileiras de análises devem aparecer juntos, sem rolagem vertical do canvas.
2. Segmentações ficam no cabeçalho ou numa faixa pequena. Navegação temática tem poucas páginas fixas, sem lista de subpáginas e sem formulários de tratativa.
3. Uma faixa de quatro ou cinco KPIs contextualiza as análises; sparklines podem mostrar tendência quando derivadas da mesma base.
4. Um gráfico combinado é a entrada de leitura. As análises adjacentes explicam onde, em quais atividades e em quais segmentos ocorre a mudança.
5. Selecionar um território, segmento ou período altera todos os gráficos compatíveis e preserva a informação sobre a fonte e o universo.
6. Uma matriz ou ranking com barras, cor e variação amplia a informação comparável dentro da própria página. Detalhamento por registros existe como drillthrough de leitura.
7. Cores destacam categoria, evolução e seleção, mantendo a paleta CREA-SP. Os exemplos com gradientes, muitos ícones e cores vibrantes mostram possibilidades, mas não justificam efeitos decorativos que reduzam legibilidade.

## Seleção de gráficos para perguntas integradas

| Pergunta | Visual e informação conjunta | Cuidados |
| --- | --- | --- |
| A base empresarial cresce acompanhando a economia? | Colunas de entradas e saídas + linha da base; dispersão de crescimento do emprego × crescimento cadastral; matriz regional de cobertura | Estoque e fluxo possuem unidades e datas diferentes. Emprego permanece agregado por município/CNAE |
| A formação acompanha a inserção em ocupações técnicas? | Combo de diplomados e emprego ou remuneração em séries; barras por curso/ocupação; matriz territorial | Ano e UF compatíveis; diplomados não equivalem a profissionais registrados e CBO não comprova registro |
| Como os profissionais se conectam às empresas? | Sankey ou matriz de modalidade × atividade econômica; distribuição do número de vínculos; autoria de ART em série combinada | RT, sociedade e autoria são vínculos distintos; QSA nominal é sugestão; autoria requer chave expressa |
| Quais segmentos concentram contratação e arrecadação? | Combo valores × quantidade; treemap de categorias; ranking com participação e variação | Identificação de compra e contrato distinta; valores contratados não equivalem a pagos |
| O que explica o saldo do período? | Cascata de contribuições e matriz temporal | Componentes devem reconciliar matematicamente com o total e incluir categorias residuais |

## Inventário dos arquivos acessíveis

Todos os itens abaixo retornaram HTTP 200 e conteúdo de imagem no download. As dimensões foram obtidas do arquivo, sem pressupor a ferramenta utilizada para criar cada painel.

| Arquivo | Dimensões | Tamanho | Link público |
| --- | --- | --- | --- |
| 1_AVjAk-grlXhJ72RJ65QOKA.png | 1400 × 933 | 494,380 bytes | [Visualizar](https://drive.google.com/file/d/1zNYXz1uMpvGNKUWlLVxERv0utOn0KRYd/view) |
| 1_wn2.png | 1009 × 564 | 128,002 bytes | [Visualizar](https://drive.google.com/file/d/1Y7EqcdVjBv9eEKmsORwVqTYq2Oumxc2x/view) |
| 2_wn2.png | 1005 × 567 | 107,747 bytes | [Visualizar](https://drive.google.com/file/d/1lEw-uBDl8wCea-U-0L17w5gw1AajKcNi/view) |
| 2020-04-10-10_36_52-Curso-Express-de-Power-BI-Power-BI-Desktop-1024x574.png | 1024 × 574 | 243,723 bytes | [Visualizar](https://drive.google.com/file/d/1w3ZeRZB1HeVNLQ2TLkz9GeTVx_ihf7P3/view) |
| 88123482-14e0-417f-864b-be51804d8c10.webp | 1036 × 586 | 32,088 bytes | [Visualizar](https://drive.google.com/file/d/1utWj-wQToIYNL4WsIQzhwlGvCYrR_GfS/view) |
| Accounting-Power-BI-dashboard.png | 975 × 581 | 269,638 bytes | [Visualizar](https://drive.google.com/file/d/1i7OyT83l0y3AbojPIogi1gyqLYwEGFk7/view) |
| Data_vis_project_ferdio.jpg | 800 × 502 | 165,318 bytes | [Visualizar](https://drive.google.com/file/d/14MzEJtOdVAe1eo8t_VgJNFaWdtMDxLuc/view) |
| Dataviz_Project.png | 762 × 632 | 18,102 bytes | [Visualizar](https://drive.google.com/file/d/1pLKw4i5wBi03NixNx8pQogKQ5cu6e6Aq/view) |
| datawrapper-1392x665.png | 1392 × 665 | 235,528 bytes | [Visualizar](https://drive.google.com/file/d/1lfE452Eks1NikoZypux-vpe_Me7QnjTX/view) |
| google-charts-ferramenta-de-visualizacao-de-dados-1392x534.jpg | 1392 × 534 | 80,446 bytes | [Visualizar](https://drive.google.com/file/d/13O-s97fIsfsn1f3FPXqYG-PJu8vcJPSR/view) |
| google-looker-studio-ferramenta-de-visualizacao-de-dados-1387x780.png | 1387 × 780 | 313,635 bytes | [Visualizar](https://drive.google.com/file/d/1UhiXqka-mPL1V_xFJAROM3q_CgXff0iF/view) |
| image-260.png | 1240 × 698 | 195,140 bytes | [Visualizar](https://drive.google.com/file/d/1UCIfObQ_CHuCYX4KMYbUltYp7HlVZkzo/view) |
| image-261.png | 1242 × 698 | 147,411 bytes | [Visualizar](https://drive.google.com/file/d/13EyuvVC6dyhVVpKrJZ02bx7WhRjxh8hO/view) |
| images (16).jpeg | 738 × 415 | 58,969 bytes | [Visualizar](https://drive.google.com/file/d/1VG45gAUGLD7aaYAAehd4RJJS5EUur7io/view) |
| it-support.png | 4006 × 2253 | 436,177 bytes | [Visualizar](https://drive.google.com/file/d/1hOJXkPLFUHVNkJydyQOFthNX8o6WpZOG/view) |
| Logistica3-1024x569.png | 1024 × 569 | 448,114 bytes | [Visualizar](https://drive.google.com/file/d/1kFKvjKcTr_rbkPk6kwHDDSKSfaFhLHQc/view) |
| newnew-PL-quickbooks.png | 1071 × 531 | 331,850 bytes | [Visualizar](https://drive.google.com/file/d/18hlSOuBEDkSLHOTZ9Z72FmGGfv7FHYw1/view) |
| performance.png | 4006 × 2253 | 439,578 bytes | [Visualizar](https://drive.google.com/file/d/1AALojYyDLwJiWXZ1KlnwLw00pAdZH2Mi/view) |
| preferred-dataviz-by-business-people.png | 1000 × 576 | 103,250 bytes | [Visualizar](https://drive.google.com/file/d/1guhdH4z9xFjn0MI8Rkl1f9c-BIb2pDEK/view) |
| retail1.png | 1714 × 1294 | 592,037 bytes | [Visualizar](https://drive.google.com/file/d/1sJGg1gBoJgx4oKAoEzjE7HoEWKwBiUf2/view) |
| tableau-ferramenta-de-visualizacao-de-dados-1294x780.png | 1294 × 780 | 315,750 bytes | [Visualizar](https://drive.google.com/file/d/1A0B_XoKYntjys4Nnkm1SjbtK7tfeWra_/view) |
| zoomcall-1024x568.png | 1024 × 568 | 201,443 bytes | [Visualizar](https://drive.google.com/file/d/1G7QuxPUXAqgiHW2Z76w26KapU2tkHjTd/view) |

## Evidências e limites

`manifest.json` e `download-results.json` na pasta de referência registram ID, URL, tipo de conteúdo, tamanho, dimensões e SHA-256 de cada download. Quatro pranchas de contato permitiram inspecionar o conjunto; os painéis Performance Analysis, IT Support e Fluxo de Caixa também foram vistos individualmente.

As referências são imagens estáticas: não permitem validar medidas DAX, relações do modelo, comportamento de filtros, autoria, licenças de visuais ou desempenho. Suas cores não substituem a identidade oficial e seus números não foram incorporados à demonstração. A adaptação ao Power BI deve preferir gráficos nativos; Sankey e outros visuais personalizados exigem avaliação de disponibilidade, licença, acessibilidade e governança.
