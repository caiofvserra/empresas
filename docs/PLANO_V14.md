# Plano V14 — Cockpit de gestão empresarial CREA-SP

## 1. Diagnóstico da V13

| Ponto | Situação na V13 | Efeito para a gestão |
|---|---|---|
| Foco | 17 medidas técnicas com nomes longos e denominadores próprios | Responde "como contar", mas pouco "onde agir" e "quanto está em jogo" |
| Layout | Canvas único: faixa de 8 cards + grade 3×2 + faixa de 9 cards | Densidade alta, sem hierarquia; tudo tem o mesmo peso visual |
| Cards | Valor estático, sem tendência, meta ou comparação com período anterior | O gestor não sabe se o número melhorou ou piorou |
| Gráficos | Barras, linha, treemap, bolhas e matriz convencionais | Sem previsão, ponte de variação, funil, árvore de decomposição ou pequenos múltiplos |
| Dados internos não usados | Fiscalização (900 casos com histórico de etapas), CAO (prazo de emissão), qualidade cadastral (695 eventos), modalidades de ART, valores de ART | Operação e SLA invisíveis |
| Dados públicos reais já no repositório e não usados | Confea SIC (ativos/situação por UF, registros por ano, modalidades), IBGE população UF, Portal da Transparência CREA-SP, Relatório de Gestão 2025, PNCP agregado SP | Nenhum contexto real ao lado do demonstrativo |
| APIs públicas | Apenas documentadas | Nenhuma consulta ao vivo |

## 2. Princípios mantidos

- Dados internos continuam **demonstrativos** e rotulados como tal; dados públicos reais recebem selo "Dado público real" com fonte e data.
- Sem score opaco de irregularidade: priorização usa critérios explícitos e visíveis (eixos do gráfico), nunca uma nota única.
- Mesmos filtros, perfis (Administração / regional / Consulta), restrição financeira, exportação CSV e ficha empresarial da V13.
- Identidade CREA: `#082D74`, `#01224D`, `#FABD07`, `#3182CE`, superfície `#F8F8F8`, Lato + Raleway locais.
- A V13 permanece acessível em `?v=13`.

## 3. Tendências Power BI aplicadas

| Tendência (Power BI 2025–2026) | Aplicação na V14 |
|---|---|
| Navegador de páginas em trilho lateral | Trilho à esquerda com 5 páginas temáticas |
| Novo visual de cartão (sparkline, rótulo de referência, variação) | Cards KPI com mini-série, delta vs. período anterior e meta |
| Narrativa inteligente / resumo Copilot | "Leitura do período": texto gerado a partir dos dados do recorte |
| Detecção de anomalias e previsão em gráficos de linha | Projeção de 6 meses com faixa de confiança (Holt linear) e marcação de meses fora de ±2σ |
| Árvore de decomposição | Saldo vencido decomposto por GRE → porte → CNAE, expansível por clique |
| Segmentações em botão e resumo de filtros | Chips de porte e janela; pílulas dos filtros ativos removíveis |
| Matriz com formatação condicional (barras, ícones, sparklines) | Scorecard das 14 GREs |
| Pequenos múltiplos | Evolução da base nas 14 GREs, mesma escala |
| Layout "bento" e modo escuro | Grade bento com tamanhos por importância; alternância claro/escuro |

## 4. Páginas e conteúdo

1. **Visão executiva** — 5 KPIs (empresas vigentes, cobertura, arrecadação PJ, inadimplência, potencial de arrecadação), leitura do período, ponte do estoque (waterfall), funil de conformidade (Sankey Receita → CREA → RT → ART), previsão da base, scorecard por GRE.
2. **Território** — mapa municipal com métrica alternável (cobertura, CNPJs sem registro, saldo vencido), quadrante GRE (cobertura × crescimento do emprego), pequenos múltiplos por GRE.
3. **Carteira e arrecadação** — árvore de decomposição do saldo vencido, aging da dívida, recebimentos mês a mês com comparação ao mesmo mês do ano anterior, recuperação da dívida inicial (medidor), matriz de prioridade (saldo vencido × ausência de RT) com seleção de empresas.
4. **Operação** — funil e tempo de ciclo da fiscalização, backlog por idade, prazo de emissão de CAO (distribuição e mediana), ARTs por mês × GRE (mapa de calor), pendências de qualidade cadastral.
5. **Contexto público** — dados reais: profissionais ativos por 100 mil habitantes (Confea SIC × IBGE), taxa de registros ativos por UF com SP destacado, registros novos CREA-SP por ano, modalidades de engenharia, despesa do CREA-SP (Portal da Transparência), resultados do Relatório de Gestão 2025, PNCP agregado SP. APIs consultadas ao vivo no navegador: BCB SGS (IPCA, INCC, Selic) e IBGE (população SP), com retorno ao snapshot local ou estado "indisponível" sem inventar valor.

## 5. Arquitetura

- `src/gestao-v14/metrics.ts` — funções puras sobre `Scope` + `EnterpriseModel`: KPIs com série, ponte do estoque, funil, previsão/anomalias, scorecard GRE, árvore de decomposição, aging, YoY, fiscalização, CAO, qualidade, narrativa.
- `src/gestao-v14/public-data.ts` — leitura dos JSONs públicos e clientes ao vivo (timeout, fallback, selo de origem).
- `src/gestao-v14/Cockpit.tsx` + `pages/*.tsx` + `components/*.tsx` + `cockpit.css`.
- Registro ECharts ampliado (Pie, Gauge, Boxplot, MarkLine/MarkArea/MarkPoint, DataZoom).
- Testes `tests/gestao-v14.test.ts` (reconciliação da ponte, funil monotônico, previsão, decomposição soma o total, narrativa).

## 6. Verificação

`npm test`, `npm run build`, capturas Playwright das 5 páginas em 1920×1080 e 1366×768, nos modos claro e escuro, sem erro de console.
