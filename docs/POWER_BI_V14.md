# Cockpit de gestão V14 — reprodução no Power BI

O protótipo React (`src/gestao-v14/`) especifica o relatório. Cada visual abaixo tem equivalente nativo no Power BI Desktop (versões de 2025–2026) ou um visual certificado. Valores internos continuam **demonstrativos**; os dados públicos da página 5 são reais e trazem a data de captura.

## Estrutura do relatório

| Elemento | Power BI |
|---|---|
| Trilho lateral com 5 páginas | Navegador de páginas (Inserir › Botões › Navegador › Página), orientação vertical, em grupo fixo à esquerda em todas as páginas |
| Pílulas de filtros ativos | Botão com texto dinâmico (medida `SELECTEDVALUE`/`CONCATENATEX`) ou resumo do painel de filtros "On-object" |
| Porte e janela como botões | Segmentação de dados em **botão** (button slicer) com seleção única/múltipla |
| Metas (meta de cobertura, RT, adimplência, recuperação) | Parâmetros numéricos (*what-if*) em painel ocultável por bookmark |
| Tema claro/escuro | Dois temas JSON + bookmark que troca imagens de fundo; ou páginas duplicadas com tema escuro |
| Modo foco | "Modo foco" nativo do visual |
| Tecla 1–5 | Sem equivalente; usar o navegador de páginas |
| Narrativa "Leitura do período" | Visual **Narrativa** (Copilot / Smart narrative) com valores dinâmicos |
| Ticker de destaques | Mesma narrativa em faixa estreita, ou cartão com texto da medida |

## Página 1 · Visão executiva

| Visual React | Visual Power BI | Medidas |
|---|---|---|
| 5 cartões com sparkline, variação e meta | **Novo visual de cartão** (Card visual 2024+): valor, rótulo de referência, sparkline mensal, imagem de status | `Empresas vigentes`, `Cobertura`, `Recebido`, `Saldo vencido`, `Potencial anual`; variação via `DATEADD`/`PARALLELPERIOD` |
| Base vigente e projeção | Gráfico de linhas com **Previsão** (painel Análise › Previsão, 6 meses, 95%) e **Detecção de anomalias** | `Empresas vigentes` por mês de corte |
| Ponte do estoque | **Gráfico de cascata** com categorias Abertura/Novas/Retornos/Saídas/Final | Abertura, novas (sem registro antes da janela), retornos, saídas |
| Funil de conformidade | Visual certificado *Sankey* (AppSource) ou funil + matriz | Universo → vigente/só histórico/nunca → RT → ART |
| Scorecard das GREs | **Matriz** com barras de dados, ícones (meta), sparklines por linha e cor de fundo por regra | Por GRE da matriz |

## Página 2 · Território

| Visual React | Power BI |
|---|---|
| Mapa municipal com métrica alternável | **Mapa de formas** (TopoJSON de municípios SP) ou Azure Maps; métrica alternável com **parâmetro de campo** |
| Ranking ao lado do mapa | Gráfico de barras Top N com o mesmo parâmetro de campo |
| Quadrante cobertura × emprego | Gráfico de dispersão com linhas de média (painel Análise) e cores por regra de quadrante |
| Pequenos múltiplos por GRE | Gráfico de área com **Pequenos múltiplos**; eixo Y compartilhado ou independente (opção do visual) |

## Página 3 · Carteira e arrecadação

| Visual React | Power BI |
|---|---|
| Árvore de decomposição | **Árvore de decomposição** nativa: GRE da matriz, Porte, Faixa de atraso, Divisão CNAE, Situação do RT; habilitar "divisões de IA" (valor alto) |
| Medidor de recuperação | **Medidor** com valor de destino = parâmetro de meta |
| Aging | Barras horizontais com formatação condicional |
| Ano contra ano | Colunas + linha, com rótulos da diferença via **cálculo visual** (`PREVIOUS`/`OFFSET`) |
| Matriz de prioridade | Dispersão com eixo X logarítmico, linhas de referência (mediana e 50%) e legenda por quadrante; *drill-through* para a ficha |

## Página 4 · Operação

| Visual React | Power BI |
|---|---|
| Faixa de 6 indicadores | Novo cartão com várias referências (multi-card) |
| Funil da fiscalização | **Funil** |
| Tempo entre etapas | Barras empilhadas (P25 transparente + IQR) com marcador de mediana, ou visual Deneb/Vega-Lite |
| Backlog por idade | Barras empilhadas 100% ou absolutas por etapa |
| Prazo de CAO | Histograma (colunas por faixa) com cores condicionais ≤90 dias |
| ARTs mês × GRE | **Matriz** com formatação de fundo (mapa de calor) |
| Qualidade cadastral | Barras empilhadas abertas × resolvidas |

## Página 5 · Contexto público (dados reais)

| Fonte | Conexão sugerida | Atualização |
|---|---|---|
| Confea SIC (ativos, situação, registros por ano, modalidades) | Web.Contents nos endpoints do relatório Confea; snapshot em `public/data/engineer-statistics/` | Mensal |
| IBGE agregado 6579 | `https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-1/variaveis/9324?localidades=N3[35]` | Anual |
| Banco Central SGS | `https://api.bcb.gov.br/dados/serie/bcdata.sgs.{433,192,432}/dados/ultimos/13?formato=json` | Mensal |
| PNCP | `https://pncp.gov.br/api/consulta/v1/contratos` (ver `integrations/power-query/PNCP_BATCH_FILE.pq`) | Diária |
| Portal da Transparência CREA-SP | API do portal; snapshot `conta-do-conselho.json` | Mensal |
| Relatório de Gestão 2025 | Tabela manual a partir do PDF oficial (`src/domain/creasp-management-public.json`) | Anual |

APIs públicas sem credencial funcionam no serviço com conexão anônima; marcar privacidade "Público". Se uma API falhar, manter a última carga válida e exibir a data — nunca preencher com estimativa.

## Regras herdadas da V13

Empresa-raiz, estabelecimento e registro continuam unidades distintas; RT não identificado não significa ausência real; CNAE não determina obrigação; emprego permanece agregado; a matriz de prioridade usa critérios visíveis e não é score de irregularidade. RLS/OLS por GRE e perfil financeiro substituem os perfis simulados do protótipo.
