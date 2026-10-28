# Validação do painel empresarial V11

## Resultado executado

O build compilado foi validado em Chromium, com navegação por DOM, teclado e ponteiro reais. A suíte terminou com **15 cenários aprovados, zero falhas e zero erros JavaScript, de console ou de respostas HTTP**. Foram verificadas duas resoluções de PC e três resoluções menores. A validação não recorre a instâncias privadas do ECharts nem a eventos de gráfico disparados artificialmente.

O conjunto de testes de dados e regras também terminou com **194 testes aprovados, zero falhas**. Esse conjunto inclui reconciliação, integridade referencial, filtros, cálculos, identidade CNPJ, grãos empresariais, vigências, coortes financeiras e exportação.

O relatório de navegador foi concluído em **27/10/2026 às 17h49, horário de São Paulo** (`2026-10-27T20:49:44.162Z`). Os 15 cenários totalizaram 41,46 segundos. O build TypeScript/Vite passou com 2.191 módulos transformados. O tema V11 foi validado com zero erros contra o schema oficial Microsoft `reportThemeSchema-2.157.json`; a importação no Power BI Desktop não foi testada, conforme o registro `integrations/powerbi-theme-creasp-v11.validation.json`.

## Escopo da interface

- Uma única tela com 17 indicadores identificados por nomes curtos: oito essenciais e nove complementares; seis áreas gráficas; ausência das cinco páginas da versão anterior.
- Canvas completo em **1920 × 1080** e **1366 × 768**, sem rolagem do documento, corte dos valores ou sobreposição entre painéis. As áreas gráficas têm pelo menos 100 px de altura útil nas resoluções verificadas.
- Em **1024 × 768**, **768 × 1024** e **390 × 844**, os 17 indicadores e seis painéis permanecem no documento sem transbordamento horizontal. A adaptação permite rolagem vertical nessas larguras.
- Seleção da base vigente por empresa-raiz, abertura do conjunto de empresas e da ficha individual; CSV comparado integralmente com a saída esperada do mesmo modelo e subconjunto.
- Seleção múltipla de GREs com recálculo, persistência após recarga e correspondência entre filtro, valor exibido e CSV.
- Todas as alternativas de leitura dos seis painéis foram acionadas. O gráfico de trajetória foi ampliado na própria tela e restaurado por Escape.
- Um clique real na primeira barra de continuidade técnica selecionou exatamente a coorte representada; exportação e tabela foram confrontadas com seus identificadores empresariais.
- Pesquisa por CNPJ, ordenação numérica, paginação, ausência de resultados e pesquisa global exercitadas com registros do modelo relacional.
- Os 17 verbetes foram conferidos contra o catálogo: nome, pergunta auxiliar, resumo, fórmula, decisão, exemplo, fontes, unidade, periodicidade proposta, validação responsável e limitações. A busca no catálogo também foi verificada.
- A seleção de evidências convergentes resolve o conjunto empresarial esperado sem apresentar veredito de infração.
- A janela de três meses altera eventos e exportações; o estoque vigente permanece coerente com a mesma data de corte.
- A origem demonstrativa, as conexões SQL Server/Db2 ainda não configuradas, o gateway previsto e as parcerias condicionais aparecem na documentação acessível pelo painel.
- Abertura da ajuda pelo teclado, fechamento por Escape e devolução de foco; o perfil Consulta oculta os quatro valores financeiros internos e bloqueia exportação tanto no cabeçalho quanto na tabela.

## Comandos e evidências

```bash
npm test
npm run build
QA_URL=http://127.0.0.1:4173 QA_OUTPUT=/workspace/scratch/enterprise-v11-final npm run test:browser
```

Os resultados locais da execução ficam em:

- `/workspace/scratch/unit-v11.log`: 194 testes aprovados; duração registrada de 27,48 segundos.
- `/workspace/scratch/browser-v11.log`: execução dos 15 cenários de navegador.
- `/workspace/scratch/enterprise-v11-final/report.json`: resultados detalhados, geometrias, cores observadas e listas de erros vazias.
- `/workspace/scratch/enterprise-v11-final/panorama-1920.png` e `panorama-1366.png`: capturas do canvas de PC.
- `/workspace/scratch/enterprise-v11-final/panorama-1024.png`, `panorama-768.png` e `panorama-390.png`: capturas completas dos tamanhos menores.

O screenshot compilado em 1366 × 768 também foi inspecionado visualmente: os 17 valores e seis painéis permanecem visíveis, com composição escura consistente e sem corte aparente.

## Limites da validação

Os dados ativos são fictícios e reproduzíveis. Esses testes validam o protótipo e suas regras; não certificam bases reais nem substituem homologação contábil, cadastral ou técnica do CREA-SP. SQL Server, Db2, gateway e integrações externas institucionais não foram conectados. Os perfis locais demonstram restrições da interface; a implantação real exige autenticação, RLS/OLS e autorização de exportação na camada de dados.

Não foi criado nem validado um arquivo `.pbix`, nem executado o Power BI Desktop. A publicação do Site continua restrita conforme a configuração existente e não constitui publicação institucional de dados.
