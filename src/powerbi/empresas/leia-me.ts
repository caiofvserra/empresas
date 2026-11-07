/** As seções do LEIA-ME do pacote de Empresas: o que vem pronto e o que falta montar no Power BI Desktop. */
export const LEIA_ME_EMPRESAS = `## O que vem pronto

- O modelo em esquema estrela: regionais, municípios, empresas, estabelecimentos, modalidades, calendário, datas de referência e período; as fotos de cada fim de mês (empresas, estabelecimentos e pendências do cadastro); entradas e saídas, ARTs, profissionais ativos e emprego formal; e os blocos que dependem de acordo, em demonstração.
- As medidas dos cartões e dos gráficos, em pastas com o nome de cada página, cada uma com a descrição de como é calculada.
- As quatro páginas (Registro e mercado, Evolução, RT e ART, Vínculos), com os filtros no alto sincronizados entre elas e o tema do Crea-SP. Os gráficos saem com rótulos de dados e legenda, para ler sem passar o mouse.
- Em cada cartão, como no painel: o número, a comparação (com um ano antes; com a meta, na parte registrada e no RT; com o primeiro mês do gráfico, no emprego) e a linha de apoio.
- O funil "Do mercado à ART", a matriz de tempo de registro e capital social, o gráfico de economia com as quatro séries em índice (o primeiro mês igual a 100), as abertas na Receita mês a mês, a permanência de 3, 6 e 12 meses e as ARTs por modalidade a cada 100 profissionais.
- O período é um parâmetro do tipo "Intervalo numérico", de 1 a 36 meses, com controle deslizante. O painel em HTML tem atalhos de 3, 6, 12 e 24 meses; no Power BI, eles podem virar indicadores (bookmarks) com botões, montados no Desktop.

Os estoques e as taxas (registradas, em dia, com RT) vêm da foto da data escolhida; os fluxos (entradas, saídas, ARTs, aberturas) são somados no período. Na base real, a carga precisa gravar a foto todo fim de mês sem reescrever as anteriores.

Tudo o que depende de acordo leva "!" no título e no nome da medida, e a descrição da medida diz com quem é o acordo e qual é o plano B. Os números desses blocos são do cenário e não mudam com os filtros.

## O que falta montar no Desktop

O mapa por município: insira o visual Mapa de formas no lugar do bloco "A montar"; em Formatar > Configurações do mapa > Mapa personalizado, carregue \`mapas/sp-municipios.json\`; ponha Municípios[Município] em Local e a medida "Parte do mercado que está registrada" em Saturação de cor.

A escala de cor das duas matrizes (novos registros por trimestre; tempo de registro e capital social): em Formatar > Elementos da célula, ligue a Cor da tela de fundo e escolha a escala de cor. Os números já aparecem nas células.

Os filtros de regional, município e câmara chegam aos estabelecimentos do mercado pela empresa: valem o município e a câmara da matriz, e não os do próprio estabelecimento (ver a ADR 0002 do repositório).

Os arquivos seguem os schemas oficiais da Microsoft, mas os nomes internos dos campos de alguns visuais (cartão, rosca, mapa de árvore, linha) não são documentados. Se um visual abrir vazio, arraste de novo a medida para ele e salve: o Desktop corrige o arquivo.

`;
