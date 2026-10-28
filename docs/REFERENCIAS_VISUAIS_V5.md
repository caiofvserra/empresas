# Referências visuais verificadas — revisão 5 do relatório CREA-SP

Pesquisa realizada em 10 de outubro de 2026. O objetivo é produzir páginas de relatório para PC: os dados permanecem visíveis no mesmo canvas, as seleções cruzam os gráficos e a leitura vai do universo ao comportamento, à relação entre fontes e à interpretação. As referências abaixo foram acessadas; não se trata de uma lista de ferramentas presumidamente instaladas.

## O que foi efetivamente consultado

| Referência | Material lido ou visto | Aplicação no CREA-SP |
| --- | --- | --- |
| [Power-BI-Design-Files, de Sajjad Ahmadi](https://github.com/Dashboard-Design/Power-BI-Design-Files) | README, licença MIT, árvore de arquivos e screenshots de **IT Support Performance**, **GeoSales**, **Ecommerce Conversion** e **Awesome Chocolates — Performance**. Existem PBIX correspondentes, que não foram executados. | Canvas completo; indicadores com referência temporal; gráfico combinado em destaque; mapas associados a rankings; tabelas com barras, variações e medidas relacionadas na mesma linha. |
| [Amostras Microsoft](https://github.com/microsoft/powerbi-desktop-samples) | Árvore do repositório, incluindo `2026 Power BI Samples Revamp`, e README do esquema de temas. | Utilizar recursos de relatório e um tema JSON validável, em lugar de controles que dependam de um site administrativo. |
| [Deneb](https://github.com/deneb-viz/deneb) e [documentação](https://deneb-viz.github.io/) | Descrição do visual, integração Power BI e documentação de seleção cruzada. | Especificações Vega/Vega-Lite são uma opção para gráficos compostos que ultrapassem os recursos nativos. O protótipo conserva ECharts; Deneb é uma opção de migração, não uma nova dependência React. |
| [DataViz-Vega, de Andrzej Leszkiewicz](https://github.com/avatorl/DataViz-Vega) | `column-line-dynamical/README.md`, `small-multiple-combined/README.md` e JSON, `ibcs-three-tier-chart/README.md` e imagem. | Comparar valor absoluto, variação absoluta e variação relativa; usar tempo alinhado e composição de marcas em uma visualização. |
| [DaxLib.SVG](https://github.com/EvaluationContext/daxlib.svg) | README: primitivas, escalas, cores, composição de SVG e exemplos PBIP. | Barras de progresso, sparklines e matrizes com visualização embutida são possibilidades na versão Power BI. Não exige importar essa biblioteca para a aplicação. |
| [SVG-PowerBI, de David Eldersveld](https://github.com/deldersveld/SVG-PowerBI) | README e árvore: arquivos de ícones Open Iconic. | Referência de uso de SVG; esse repositório específico não contém uma biblioteca pronta de gráficos premium. Não foi usado para sustentar afirmações sobre cartões compostos. |
| [Power BI Theme Generator](https://themes.powerbi.tips/) | Página pública de apresentação do gerador de temas JSON. | Recurso de autoria de tema, sem vínculo automático com a consistência dos dados ou a arquitetura analítica. |

A referência de múltiplos gráficos combinados de DataViz-Vega está marcada **DRAFT** e contém um aviso explícito para verificar a posição da linha no eixo Y. Seu código não deve ser copiado como implementação validada. O exemplo de três níveis afirma não ser certificado nem endossado pelo IBCS. Nenhum código externo foi executado e nenhuma biblioteca foi instalada nesta pesquisa.

As imagens estão em `/workspace/references/design-v5/`: `it-support.png`, `geo-sales.png`, `ecommerce.png`, `performance.png` e `ibcs-image.png`. São material de inspeção e inspiração; não compõem os gráficos ou os dados do produto. README e licença da galeria foram guardados no mesmo diretório.

## Diretrizes Microsoft diretamente aplicáveis

A [orientação de composição](https://learn.microsoft.com/en-us/power-bi/create-reports/service-dashboards-design-tips) recomenda contar a história em uma tela, evitar barras de rolagem, posicionar o nível mais agregado no alto à esquerda e mostrar detalhe no sentido da leitura. Também recomenda consistência de eixos e cores, alerta contra gráficos 3D e desaconselha variar o tipo de gráfico apenas por variedade.

O [gráfico combinado](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-combo-chart) une linha e colunas no mesmo eixo X, permite um ou dois eixos Y e participa do destaque e filtro cruzados. Isso permite analisar, por exemplo, novas inscrições e baixas junto do estoque cadastral, ou valor contratado junto da quantidade de contratos. Cada eixo precisa declarar sua unidade. Emprego e registros podem ser comparados por índice base 100 quando se deseja confrontar a evolução de universos de tamanho diferente.

O [card atual](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-card) aceita múltiplas medidas, referências e composição de elementos. A documentação recomenda o agrupamento de medidas no mesmo visual para reduzir a carga de visuais e consultas. A opção **Fit to space** favorece a faixa de KPIs; dimensões fixas mal ajustadas podem criar rolagem interna.

Os [small multiples](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-small-multiples) permitem comparação repetida com uma gramática comum. A grade pode ir até 6×6, mas elementos que excedem a grade introduzem rolagem. Para este relatório, limitar a seleção explícita de categorias e mostrar um agregado “Demais” evita esconder parte importante do conjunto abaixo da página.

Os [temas de relatório](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-report-themes) e o [esquema JSON oficial](https://github.com/microsoft/powerbi-desktop-samples/tree/main/Report%20Theme%20JSON%20Schema) permitem padronizar cores, fontes e visuais. O arquivo de esquema deve corresponder à versão de Desktop usada pelo CREA-SP; o nome “premium” descreve a qualidade da apresentação, não determina uma licença Microsoft específica.

## Composição proposta para o PC

Seis páginas fixas, acessíveis por um navegador de páginas compacto: **Visão geral, Empresas, Profissionais, Mercado e emprego, Contratações e Fiscalização**. Não há uma lista suspensa de subpáginas. Uma segmentação pode selecionar período ou medida; ela não troca toda a arquitetura da página. Não há botões para tratar, encaminhar ou concluir casos dentro do relatório.

Cada página apresenta:

1. Identificação CREA-SP e contexto do recorte, em uma faixa discreta.
2. Segmentações sincronizadas e uma linha curta de filtros ativos.
3. Cinco indicadores compactos, com unidade, competência e referência temporal quando calculável.
4. Seis visuais em duas linhas, com pesos diferentes conforme a pergunta. Um gráfico combinado ocupa o espaço mais importante.
5. Uma faixa de leitura interpretativa, calculada a partir do recorte e vinculada às evidências visuais.

A sequência de análise é **01 Universo → 02 Evolução → 03 Cruzamentos → 04 Leitura do recorte**. Essa ordem orienta posição, títulos e relações; não cria outra fileira de abas. O leitor vê o conjunto antes de abrir o detalhe. O drillthrough empresarial ou profissional só é necessário depois de encontrar um comportamento que merece investigação.

### Referência de espaço a 1366×768

| Zona | Altura de referência |
| --- | ---: |
| Identidade e informação de atualização | 46 px |
| Navegador das seis páginas | 34 px |
| Segmentações e recorte ativo | 48 px |
| Título e pergunta analítica | 38 px |
| Faixa dos cinco KPIs | 76 px |
| Duas linhas de visuais, com intervalo | 456 px |
| Leitura do recorte e metadados finais | 54 px |
| Margens e separações restantes | 16 px |
| **Total** | **768 px** |

O layout deve ser medido no viewport real, incluindo fonte, padding, legendas e títulos. Essas alturas são um orçamento, não uma ordem para comprimir todos os textos. Em 1920×1080 o mesmo canvas recebe mais área para plotagem e rótulos; não adiciona novos elementos nem deixa um grande vazio ao final.

Usar grade de 12 colunas. Uma opção é `5 + 4 + 3` na primeira linha e `4 + 4 + 4` na segunda, com painéis de mínimo 300 px de largura no viewport de referência. Dimensões e títulos longos devem ter versões curtas no eixo e descrição completa no tooltip. Mostrar seis a oito categorias quando elas forem rankings; declarar “Top 6” e manter o restante no total e nas seleções. Não utilizar tabelas longas como principal estrutura da página.

A tipografia de referência é Inter no protótipo e Segoe UI como alternativa nativa: título 22–26 px; métrica 28–34 px; título de visual 12–14 px; eixo e legenda 11–12 px; fonte 10–11 px. Textos longos de fórmula ficam no tooltip do indicador. A informação essencial não pode depender apenas de hover. Controles e legendas precisam de foco visível e equivalente textual acessível.

## Direção visual institucional

Manter a paleta solicitada: azul-800 `#0E1732`, azul-700 `#15265C`, azul-500 `#3662E2`, azul-claro `#6077B6`, amarelo `#FFB001`, preto e neutros. Cabeçalho azul-800; área analítica em neutro claro; superfícies brancas; sombras discretas e divisórias leves. Azul forte indica a medida principal ou seleção. Tons secundários representam comparadores. Amarelo pode marcar um destaque analítico ou ação primária; não colore simultaneamente muitos elementos.

A aparência contemporânea vem da proporção, alinhamento, hierarquia tipográfica, dados relacionados e contraste útil. Evitar fundo com efeito decorativo, gradientes chamativos, cartões com ícone repetido, mapa 3D, barras com volume, excesso de donuts e múltiplos botões dentro dos painéis. Uma matriz com barras e valores no mesmo alinhamento pode comunicar mais que três gráficos pequenos separados.

O painel deve comunicar seu recorte: categorias não selecionadas ficam atenuadas, as selecionadas preservam contraste, todos os visuais pertinentes recalculam os denominadores e a faixa final descreve o conjunto que está sendo visto. Uma cor não pode ter significados incompatíveis entre páginas.

## Perguntas e cruzamentos por página

Os seis visuais são uma composição de perguntas; a implementação deve usar apenas medidas sustentadas pelas bases carregadas. Não acrescentar gráficos com números sem origem para preencher a grade.

| Página | Leitura integrada e tipos de visual recomendados |
| --- | --- |
| Visão geral | **Universo:** cadastro, profissionais, produção e mercado com denominadores explícitos. **Evolução:** colunas de entradas/saídas + linha do estoque. **Cruzamentos:** cobertura por CNAE em barras sobrepostas; mapa territorial de recorte; dispersão evolução do emprego × evolução cadastral; composição de ART/CAO por setor; matriz regional com empresas, vínculos, produção e emprego agregado. |
| Empresas | **Universo:** empresa distinta, estabelecimento e registro separados. **Evolução:** movimentação + estoque no combinado. **Cruzamentos:** adimplência e valores em aberto na mesma composição; CNAE × porte; registros ativos × empresas com vínculo RT; ARTs × CAOs por atividade; matriz de GRE com cobertura e qualidade cadastral. Nenhuma ação de cobrança ou tratativa. |
| Profissionais | **Universo:** pessoas, vínculos e autoria declarada separados. **Evolução:** ingressos e estoque; diplomados por ano/área como série externa com competência explícita. **Cruzamentos:** Sankey modalidade → setor empresarial por vínculos RT; matriz modalidade × atividade ART; distribuição territorial; histograma de empresas por profissional; comparação agregada de formação e ocupações técnicas por dimensões disponíveis. Sociedade confirmada é uma relação diferente de RT. |
| Mercado e emprego | **Universo:** estabelecimentos externos com os CNAEs selecionados. **Evolução:** admissões/desligamentos + saldo; estoque de emprego e estoque cadastral em índices base 100. **Cruzamentos:** cobertura × concentração municipal; CNAE × CBO; matrizes com empresas/emprego/cobertura; distribuição por porte; formação regional quando o arquivo externo contém a dimensão geográfica necessária. |
| Contratações | **Universo:** contratos e fornecedores distintos, com chave de contrato preservada. **Evolução:** valor contratado + quantidade de contratos. **Cruzamentos:** categorias × setores; participação de fornecedores por GRE; concentração de valores por fornecedor; recência contratual e produção ART/CAO da empresa no mesmo período, sem inferir que uma ART pertence a um contrato; matriz regional com valor, contratos, empresas e cobertura cadastral. |
| Fiscalização | **Universo:** conjuntos e resultados registrados, sem tratar casos no BI. **Evolução:** análises concluídas + prazo mediano; transições efetivamente registradas em Sankey. **Cruzamentos:** distribuição de resultados por GRE/CNAE; qualidade e ausência de correspondência por universo definido; objetos de contratação e classificação demonstrativa; mapa de concentração dos conjuntos. Pontuação é prioridade de verificação, não confirmação de infração. |

Quando todos os seis visuais não forem justificáveis por uma página, um painel pode reunir duas medidas no mesmo gráfico ou uma matriz curta em vez de adicionar outra visualização independente. O objetivo é cobrir o raciocínio completo na página, não maximizar a contagem de gráficos.

## Regras para que os dados deixem de parecer pulverizados

- Definir claramente a granularidade antes do desenho. Empresa, estabelecimento, registro, profissional, vínculo, contrato, ART, CAO e diplomado agregado não são unidades intercambiáveis.
- Empregar município/IBGE, CNAE, CBO, ano e GRE como dimensões compartilhadas quando a fonte realmente as oferece. Fonte nacional sem UF não pode ser filtrada como dado paulista.
- Comparar séries apenas nos períodos disponíveis em ambas as fontes. Uma série real de diplomados até 2024 deve informar a competência; o filtro 2026 não deve inventar diplomados desse ano.
- Usar CNPJ determinístico para ligações empresariais e identidade validada para ligações profissionais. QSA sugerido por nome fica identificado como sugestão; não integra um total de profissionais confirmado.
- Não converter vínculo RT em autoria de ART. Autoria exige relação explícita na fonte. CAO pertence à pessoa jurídica; CAT é acervo profissional e requer fonte própria.
- Não ligar RAIS/CAGED/INEP agregados a CNPJs ou pessoas específicos. Um cruzamento visual territorial pode comparar duas agregações sem fabricar uma relação individual.
- Integrar os gráficos pelo mesmo recorte, pela seleção cruzada e pelo mesmo período, além da união no modelo. A legenda de fonte e unidade deve permanecer visível.
- A leitura interpretativa deve citar medida, recorte e referência: “GRE X reúne Y% das empresas e Z% das ARTs do recorte”. Evitar afirmações causais e diagnósticos legais que os dados não comprovam.

## Correspondência com o Power BI

| Componente | Recurso e cuidados |
| --- | --- |
| Seis páginas fixas | Navegador de páginas. Não replicar o seletor de 34 perspectivas da versão anterior. |
| Faixa de cinco métricas | Card multicard com referências, Fit to space e medidas DAX. |
| Colunas + linha | Combinado nativo; declarar eixo primário, secundário e unidade. |
| Matriz de medidas relacionadas | Matriz nativa, barras de dados e formatação condicional; SVG opcional. |
| Dispersão | Visual nativo, ponto por município/GRE e tamanho pela terceira medida explicitada. |
| Comparadores alinhados e pequenos múltiplos | Visuais nativos ou Deneb quando a composição requer camadas. |
| Sankey | Visual personalizado homologado; alternativa nativa: matriz origem × destino e barras. |
| Leitura calculada do recorte | Medida textual/tooltip com regras transparentes; pode usar narrativa inteligente validada. |
| Ficha detalhada | Página oculta de drillthrough com retorno, preservando os filtros. |
| Classificação e conciliação | ETL/regras versionadas antes do modelo; o relatório explica resultados e limitações. Sem alterar casos ou cadastros. |

No [Deneb, a seleção cruzada](https://deneb-viz.github.io/docs/interactivity-selection) precisa ser habilitada, exige marcas resolvíveis ao dataset e fornece o campo `__selected__`. Agregações e transformações alteram o contexto de linha; seleção com milhares de pontos pode atingir limites e prejudicar desempenho. O desenho deve prever a granularidade da seleção, além da aparência do gráfico.

## Verificação visual da entrega

1. Medir seis páginas em 1920×1080 e 1366×768: nenhuma rolagem no canvas principal.
2. Verificar que as seis páginas, KPIs, gráficos e leitura do recorte estão visíveis no primeiro enquadramento.
3. Não encontrar seletor de subpágina, fluxo de encaminhamento ou formulário de tratativa.
4. Selecionar território/CNAE e verificar atualização conjunta dos visuais com mesma granularidade.
5. Confirmar os valores do gráfico combinado nos fatos que o originam, incluindo denominadores e calendário.
6. Verificar competência e abrangência das bases externas reais, inclusive diplomados, em cada visual.
7. Confirmar que totais não visíveis em rankings continuam reconciliados com o universo.
8. Testar textos, contraste, foco e tooltip em tamanhos reais, sem reduzir o zoom do navegador para forçar o encaixe.

Esta pesquisa oferece padrões verificáveis e uma direção de composição. Ela não torna o protótipo um `.pbix`, não valida obrigações legais por CNAE e não afirma que bibliotecas externas foram integradas ou que os PBIX públicos foram executados.

## Versões das referências GitHub

| Repositório | Commit observado |
| --- | --- |
| Dashboard-Design/Power-BI-Design-Files | [3c56a12f6481](https://github.com/Dashboard-Design/Power-BI-Design-Files/commit/3c56a12f6481d24acdf6c01442a496d020f76e55) |
| deneb-viz/deneb | [ed7c7f2662ca](https://github.com/deneb-viz/deneb/commit/ed7c7f2662caf670a9df064079a1ba9a35ac3419) |
| avatorl/DataViz-Vega | [6b2434fe63b3](https://github.com/avatorl/DataViz-Vega/commit/6b2434fe63b341e42c3961a6f475170549acc9ba) |
| microsoft/powerbi-desktop-samples | [8e99b1233173](https://github.com/microsoft/powerbi-desktop-samples/commit/8e99b1233173025a9ddcb5d8e5edfc119f2dfbb1) |
| EvaluationContext/daxlib.svg | [7740816119ed](https://github.com/EvaluationContext/daxlib.svg/commit/7740816119edb0039c6db11ffeb7b7d63fc1cc55) |

As versões foram registradas para tornar a pesquisa reproduzível. Documentação Microsoft e sites públicos foram lidos nas URLs citadas na data da pesquisa.
