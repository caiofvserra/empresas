# Composição analítica de PC — Power BI / V9

O desenho é um **relatório analítico com sete páginas fixas**. Seis páginas apresentam KPIs e seis painéis simultâneos; Transparência apresenta catálogo e fundamentos em prévia privada. A primeira página seleciona seis perguntas para a Presidência; as seguintes aprofundam empresas, profissionais/formação, mercado/emprego, contratações e **fiscalização digital por cruzamento de fontes**. Fichas e tabelas são aprofundamentos de leitura, sem operações administrativas.

A identidade e a circunscrição são **CREA-SP / Estado de São Paulo**. Nenhum quadro com totais de sites/PDFs ocupa a página. A V9 altera a identidade visual, preservando os universos, as fórmulas e os cruzamentos homologáveis da V8. Medidas de produção devem nascer de SQL Server/Db2 via gateway ou API/ETL homologado, com rotina e estado de carga. O protótipo usa demonstração relacional explícita; não simula fonte conectada pela data de build.

## Referências de apresentação

As [22 imagens acessíveis do Drive enviado](https://drive.google.com/drive/folders/1jM5rv6P0mD3YU9hiMIyF1aLlXeBH8C4l) orientaram canvas 16:9, faixa compacta de KPIs, combinados amplos, rankings e matrizes na mesma tela. Performance Analysis/IT Support orientaram leitura conjunta; Fluxo de Caixa/QuickBooks orientaram medidas relacionadas em vez de páginas isoladas. Inventário: [REFERENCIAS_DRIVE_V5.md](REFERENCIAS_DRIVE_V5.md).

| Referência consultada | Uso |
| --- | --- |
| [Power-BI-Design-Files](https://github.com/Dashboard-Design/Power-BI-Design-Files) | Proporção, alinhamento e complementação de séries/rankings; screenshots inspecionados, sem execução dos PBIXs |
| [Amostras Microsoft](https://github.com/microsoft/powerbi-desktop-samples) | Navegação, estrutura de tema e recursos de relatório |
| [Deneb](https://deneb-viz.github.io/) | Possível composição avançada no Power BI, sujeita a homologação; não dependência React |
| [DataViz-Vega](https://github.com/avatorl/DataViz-Vega) | Medidas relacionadas, variações e camadas alinhadas; exemplos não tratados como código validado |
| [DaxLib.SVG](https://github.com/EvaluationContext/daxlib.svg) | Opção futura de barras/sparklines em matrizes |
| [Orientação Microsoft para composição](https://learn.microsoft.com/en-us/power-bi/create-reports/service-dashboards-design-tips) | História em uma tela, hierarquia, legibilidade e seleção de gráficos com finalidade |

Os dois PDFs e cinco JPGs adicionais da V8 evidenciam nomes de campos e recortes existentes, com 128 contratos em `available-fields-v8.json`. Foram aproveitados apenas os conceitos que sustentam perguntas úteis; nenhum total dos prints virou medida corrente. Imagens e repos de inspiração não fornecem os números do relatório. [REFERENCIAS_VISUAIS_V5.md](REFERENCIAS_VISUAIS_V5.md) conserva o levantamento visual; documentos de dados antigos marcados como históricos não definem as fontes ativas.

## Canvas e hierarquia

As referências são **1366×768 e 1920×1080**, com KPIs/visuais na página aberta sem rolagem. As seis páginas analíticas usam duas linhas: uma área ampla e duas complementares por linha. As áreas amplas acomodam série ou cruzamento; áreas menores explicam continuidade, composição e território. Em telas menores, permitir rolagem para manter legibilidade; detalhes têm rolagem própria.

Cabeçalho compacto, pergunta da página, segmentações, métricas, gráficos, leitura do recorte e sete abas temáticas inferiores formam a hierarquia. Não há lista suspensa de subpáginas, sidebar larga, banner ou botões de tratativa. A sétima aba não introduz gráficos decorativos: catálogo pesquisável e painel de fundamentos demonstram a preparação da informação pública.

Na Presidência, a sequência é **Cadastro → Continuidade RT / Autoria observada → Produção mensal → Recebimentos PJ / Contexto econômico**. O usuário percebe mudança da base, verifica relações técnicas realmente identificadas, observa produção e examina recebimentos/economia no mesmo corte. Programas, coworkings e SLA de versões anteriores não compõem essa leitura.

Filtros aparentes devem corresponder a fontes e grãos compatíveis. A seleção nominal, porte ou situação bloqueia comparação cadastro–emprego quando reduz apenas um universo. A lacuna de autoria aparece junto ao gráfico; não usar “profissionais sem ART” como sinônimo de desempregados. Em Transparência, filtros do catálogo não calculam valores a partir dos anexos.

## Paleta e tipografia

| Token | Uso |
| --- | --- |
| `#0E1732` — azul-800 | Base do cabeçalho e navegação, contraste da faixa de indicadores e do painel normativo |
| `#15265C` — azul-700 | Degradês de estrutura, títulos claros/escuros e contorno das séries douradas |
| `#3662E2` — azul-500 | Séries principais, degradês nos painéis amplos, filtros e foco |
| `#6077B6` — azul-claro | Comparações, séries relacionadas e desenho técnico de fundo |
| `#FFB001` — amarelo | Navegação ativa, números de destaque, séries de contraste, marcas técnicas e ações principais; texto escuro sobre fundo amarelo |
| `#000000` e neutros | Texto quando necessário, superfícies, eixos e separação |

Inter com alternativa Segoe UI; números tabulares, título, pergunta, eixo, legenda e fonte têm níveis próprios. A faixa de indicadores é contínua e azul, com variações de profundidade e números dourados nos destaques. Os painéis amplos têm títulos sobre degradê azul; análises complementares conservam títulos claros, e recebimentos usa uma camada clara dourada. Essa alternância estabelece um percurso visual dentro do mesmo canvas.

A engrenagem foi desenhada em SVG para a identidade do relatório, com um motivo de construção técnica/compasso e linhas de cota no fundo do título. É uma ilustração original, não uma reprodução nem substituição do selo oficial do conselho. A marca de fundo não captura o ponteiro, não entra na leitura acessível e desaparece em telas menores. Não há rotação contínua de engrenagens ou animação de números.

Os gráficos mantêm áreas de plotagem claras. Colunas usam degradês discretos no sentido do valor, linhas de destaque usam marcadores dourados com traço azul escuro e fluxos Sankey combinam as cores de origem/destino. A cor não cria novo indicador: valores, chaves, denominadores, eixos e seleção cruzada continuam os mesmos. Legendas e rótulos explicam as séries; não usar 3D ou novos gráficos sem pergunta analítica.

A página de Transparência recebe uma faixa normativa escura, prazos dourados, catálogo claro e aviso privado em amarelo claro. A diferenciação comunica regra, fonte e preparo para publicação; nenhum destaque simula fonte conectada. O tema de importação `integrations/powerbi-theme-creasp-v9.json` mantém os tokens institucionais; o arquivo anterior [CREA-SP.theme.json](CREA-SP.theme.json) continua como referência. Formas, fundos e SVGs podem reproduzir a direção visual no Power BI. A importação precisa ser homologada no Desktop; o JSON, sozinho, não reproduz todos os degradês CSS/ECharts.

## Composição por página

| Página | Análises e função |
| --- | --- |
| **Presidência e resultados** | Entradas/saídas + estoque cadastral; empresas ativas com/sem RT por GRE; profissionais ativos com/sem autoria identificada por modalidade; ARTs + autores mensais; recebimentos PJ ordinários/recuperados + saldo vencido; dispersão crescimento empresas ativas × emprego com cortes compatíveis. |
| **Empresas** | Movimento/estoque; porte/situação; cadastro/débitos por GRE; ART/CAO; saldo/empresas por atraso; qualidade. O mesmo conjunto empresarial explica cadastro, documentos e finanças; perfis sem acesso recebem alternativas não financeiras. |
| **Profissionais e formação** | Formação declarada + RT; modalidades; intervalo graduação–registro; conexões RT/QSA expressas; ART/autores; concentração de empresas vinculadas por pessoa. Descreve registrados com informações disponíveis, não todos os diplomados paulistas. |
| **Mercado e emprego** | Admissões/desligamentos + saldo; mapa do último estoque; CBO; crescimentos municipais; cobertura CNAE × município; concentração/cobertura com bolha de emprego. Não atribui trabalhadores a pessoas/CNPJs. |
| **Contratações** | Valor/volume; Pareto; objetos/categorias; fornecedor/cadastro/RT/ART por GRE; município do fornecedor × categoria; valor × ART por CNAE. Sem pressupor ART pertencente ao contrato. |
| **Fiscalização digital** | Fluxo CNPJ → vigência → RT; cobertura por GRE; CNAE × evidência; objetos PNCP técnicos × situação cadastral; emprego municipal × cobertura; combinações exclusivas de sinais. Selecionar conjunto e abrir origem/critério/limite, sem score arbitrário ou julgamento automático. |
| **Transparência — prévia privada** | Fundamentos e prazos; oito grupos regionais para consolidação federal; catálogo pesquisável com 44 indicadores regionais e dados solicitados; ficha de fórmula/dependências; ressalvas e fonte não conectada. Sem números históricos reapresentados ou botão de publicar. |

## Gráficos combinados e unidades

Linha/coluna compartilham eixo X e corte. Eixo secundário distingue unidades: eventos/estoque, ARTs/autores, contratos/BRL ou saldo de emprego/percentual. Comparação temporal não recebe zero para períodos sem cobertura. Não incluir linha sem pergunta adicional.

Recebimento ordinário + recuperado forma o total recebido PJ; recuperação não é uma terceira receita aditiva. Saldo vencido é estoque e possui eixo/legenda próprios. A medida não representa toda a arrecadação do CREA-SP. Autores mensais não são somados como pessoas anuais distintas.

Barras de continuidade contam empresas **ativas distintas**; barras de autoria contam profissionais **ativos distintos**, com cobertura dos documentos identificados. Sankey temático pode contar relações RT/QSA e conter várias relações da mesma pessoa. O fluxo digital conta a passagem de empresas por classes cadastrais exclusivas; não é fluxo de tratativas/avaliação dos agentes.

Células CNAE × evidência podem sobrepor empresas; tooltip declara essa unidade. O painel de combinações usa categorias sem sobreposição para reconciliar o total. CNPJ completo, raiz sugerida e ausência de correspondência têm cores/rótulos próprios.

Mapa tem 645 geometrias, com 24 municípios observados na ficção. Cinza significa ausência de observação, não zero real. Emprego agregado preserva sua população; comparação incompatível é explicitamente bloqueada. Dispersões informam população, janela, tamanho e cor.

Composição CNAE principal pode ser exclusiva; seleção principal/secundários é multivalorada. Pareto mantém o valor de todo o recorte no denominador mesmo exibindo fornecedores maiores. Distintos por células/territórios sobrepostos não são somáveis como total estadual.

## Relações e limites da leitura

Compartilhar dimensões/cortes não significa achatar empresa, estabelecimento, registro, profissional, RT, ART, certidão e emprego em uma tabela. Município do estabelecimento, domicílio, oferta e fornecedor/órgão/obra são papéis distintos; o cenário contratual usa **município do fornecedor**, sem transferir automaticamente esse rótulo para a unidade contratante do PNCP.

Formação declarada vem do cadastro fictício. INEP público exige ETL oficial por edição; concluintes de curso não são estoque de diplomados distintos. CINE/CBO/CNAE/modalidade são classificações diferentes, sem funil individual criado a partir de agregados incompatíveis.

Objetos PNCP recebem classificação demonstrativa por termos/regras explicados. Empresa com contrato potencialmente técnico e correspondência ausente integra um conjunto de verificação, sem afirmação de infração. ART do fornecedor não prova ART específica do contrato. Emprego regional é contexto econômico, sem identificação individual.

Transparência distingue marcação da planilha, norma conferida e futura publicação. Indicador 53 é participação do orçamento **aprovado**, não gasto/incremento real; indicador 35 conserva ressalva e nenhum valor calculado. O catálogo tem valores atuais nulos até conexão. Gastos públicos do conselho diferem de dívidas particulares e evidências nominais de fiscalização.

O conjunto institucional V6/V7 de programas/capacidade/serviço permanece legado técnico, fora da leitura executiva atual.

## Correspondência Power BI

| Recurso React | Implementação prevista |
| --- | --- |
| Sete páginas fixas | Page navigator; seis análises + Transparência privada |
| Cinco indicadores | Cards/medidas DAX e tooltips de definição |
| Segmentações e seleção cruzada | Slicers sincronizados + Edit interactions por grão/papel |
| Combinados | Linha/coluna nativa, eixos explícitos |
| Matriz/heatmap | Matriz com formatação condicional e barras de dados |
| Treemap/scatter/Pareto/histograma | Nativos e medidas; Deneb somente quando necessário |
| Sankey temático/fluxo de conciliação | Visual homologado ou matriz/barras de relações/categorias |
| Mapa | Solução geográfica aprovada e códigos IBGE |
| Leitura dinâmica | Medida textual transparente, sem simular modelo treinado/Copilot |
| Tabela/ficha | Página oculta de drillthrough com retorno e contexto preservado |
| Catálogo/normas | Tabela/matriz e tooltips de fórmula; metadados separados de números |
| Status de carga | Dimensão Fonte/Lote e medidas de competência/último sucesso/atraso |

O modal/drawer é apresentação React; não uma promessa de popup idêntico no Power BI. Processamento/classificação/conciliação produz fatos/evidências upstream versionados, sem executar correções dentro do relatório. [POWER_BI.md](POWER_BI.md) detalha gateway, modelo, DAX e segurança.

## Aceite visual

Verificar as sete páginas nas duas resoluções de PC, simultaneidade dos KPIs/visuais analíticos e legibilidade do catálogo, ausência de rolagem/cortes, altura útil, legendas/eixos, contraste, foco/teclado, seleções, estado vazio e recuperação. Detalhe não pode ocultar a origem do recorte. Ausência de rolagem não substitui legibilidade nem consistência matemática. A revisão visual é validada em [QA_V9.md](QA_V9.md); [QA.md](QA.md) conserva a validação do modelo e das interações anteriores. A inspeção visual acompanha a geometria, o contraste calculado dos títulos/números e cliques reais de seleção; não é uma avaliação apenas de classes CSS.
