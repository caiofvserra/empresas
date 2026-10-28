# Validação do canvas empresarial — V13 / CREA-SP

A V13 revisa a identidade visual, distingue CREA-SP, Receita Federal e PNCP nos nomes/origens dos indicadores, substitui rodapés técnicos por explicações de leitura e acrescenta três aprofundamentos nos gráficos existentes: universo cadastral, conciliação Receita × CREA e emissões de CAO. A navegação continua em um canvas.

## Resultados efetivamente obtidos

- **205/205 testes unitários aprovados**, sem falhas; execução completa de aproximadamente 26,05 s.
- **20/20 cenários distintos de navegador aprovados**, contra o build compilado servido em `http://127.0.0.1:4173/`.
- **2 canvas de PC**: 1920×1080 e 1366×768, com os 17 indicadores e seis gráficos sem rolagem, sobreposição de nomes/valores ou corte de conteúdo.
- **3 larguras menores**: 1024, 768 e 390, sem transbordamento horizontal; rolagem vertical preserva legibilidade.
- **Zero erros JavaScript, console ou HTTP** no fluxo verificado.
- **Build TypeScript/Vite aprovado**, com 2.192 módulos. O aviso de tamanho dos bundles ECharts não impede o build.
- Fontes Lato/Raleway carregadas de arquivos locais, sem requisições a Google Fonts. Pesos e licenças conferidos no manifesto.
- Pares de texto aprovados calculados a partir do SSOT de tokens; a ação amarela real apresentou **9.59:1** de contraste com texto escuro, acima de AA para texto normal.
- Tema V13 validado contra o schema oficial Microsoft `reportThemeSchema-2.157.json`, sem erros. Importação no Desktop não testada.

Conclusão da execução de navegador: **28/10/2026 às 10:11 — America/Sao_Paulo**.

A primeira execução aprovou 19 cenários. O teste de Universo falhou porque sua expressão textual aceitava apenas “empresas”, enquanto a legenda correta diz “Cada empresa”. A expressão foi corrigida para aceitar singular/plural, sem alterar o produto, e somente esse cenário foi repetido com aprovação. O relatório inicial e a repetição foram preservados junto ao resultado consolidado.

## Verificações de interação

O roteiro `scripts/qa-enterprise-v13.mjs` utilizou DOM renderizado, teclado, downloads reais e cliques no SVG; não acessa instâncias privadas do ECharts nem dispara eventos internos artificiais.

1. Uma tela com 17 indicadores, origens explícitas e seis gráficos, sem cinco abas.
2. Canvas de PC com nomes, valores, origens e gráficos dentro de seus limites.
3. Composições menores sem perda horizontal de conteúdo.
4. Seleção da base empresarial com exportação do mesmo conjunto de raízes.
5. Seleção múltipla de GREs, recálculo, URL V13 e persistência após recarga.
6. Alternância de todas as leituras oferecidas pelos gráficos.
7. Ampliação/restauração no mesmo canvas e retorno via Escape.
8. Clique real em barra de continuidade de RT, comparado à coorte exata do modelo e ao CSV.
9. Pesquisa por CNPJ, ordenação numérica, paginação e estado sem resultados.
10. Catálogo de 17 definições completas, nomes diretos e perguntas auxiliares.
11. Seleção de evidências convergentes e ficha empresarial sem veredito de infração.
12. Mudança da janela para três meses, preservando estoque no corte e alterando os fluxos pertinentes.
13. Origens, conexões não configuradas e parcerias propostas explicitadas.
14. Ajuda por teclado, foco restaurado, Escape e restrições demonstrativas do perfil Consulta.
15. Rodapés de leitura com pelo menos 12px, texto visível sem reticências/corte, e ajuda com origem e limites.
16. Fontes self-hosted efetivamente carregadas e contraste da ação amarela medido no navegador.
17. Universo CREA: partição de empresas vigentes, histórico sem vigência e sem histórico, com clique/exportação correspondente.
18. Situação Receita entre CNPJs com CREA vigente, com detalhamento em empresas-raiz distintas.
19. Emissões históricas de CAO, preservando documentos atualmente revogados, com clique em coluna mensal e exportação das empresas correspondentes.
20. Ausência de erros de execução ou de recursos HTTP no fluxo integrado.

A imagem de 1366×768 foi inspecionada visualmente: os seis gráficos contêm dados visíveis, incluindo barras/linhas, matriz RT × ART, treemap e dispersão. A visualização inicial vazia observada durante HMR não ocorreu no build compilado após o estado de carregamento.

## Evidências

- `/workspace/scratch/enterprise-v13-final/report.json`: resultado consolidado, geometrias, cores/fontes observadas e detalhe da correção do teste.
- `report.initial.json` e `retry-universe/report.json`: execução inicial e repetição dirigida.
- `panorama-1920.png`, `panorama-1366.png`, `panorama-1024.png`, `panorama-768.png` e `panorama-390.png`.
- `/workspace/scratch/browser-v13.log` e `/workspace/scratch/browser-v13-universe-retry.log`.
- `tests/design-contrast-v13.test.ts`: três testes direcionados de pares de cor e arquivos de fontes.

## Limites

Todos os dados do protótipo permanecem fictícios. SQL Server, Db2, gateway, acessos institucionais e parcerias não estão configurados. A verificação dos pares declarados e de elementos selecionados **não constitui certificação universal WCAG**. Não foi realizado teste assistivo completo de leitor de tela ou importação de fontes/tema no Power BI Desktop.

Os testes do React não comprovam refresh, segurança RLS/OLS ou comportamento de um `.pbix`. A situação Receita é a fotografia disponível; sua divergência com o CREA não comprova infração. CAO é certidão empresarial: uma emissão permanece no histórico mesmo quando o status atual é revogado. Sem data de revogação, não se reconstrói validade passada mês a mês.
