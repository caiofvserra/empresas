# Validação analítica CREA-SP V8 — decisões, fiscalização digital e transparência

> A apresentação atual é V9. Este documento conserva a validação analítica da V8, cujas regras e dados permanecem iguais. A verificação da revisão visual e das interações no build V9 está em [QA_V9.md](QA_V9.md).

Verificação concluída em 13/10/2026. O escopo é o CREA-SP / Estado de São Paulo, com sete páginas de análise em canvas de PC. Prints, PDFs e planilha fornecidos pelo usuário definem campos, regras e evidências; seus totais históricos não alimentam indicadores atuais. SQL Server e IBM Db2 via gateway permanecem sem conexão institucional configurada.

## Resultados

| Verificação | Resultado | Evidência no pacote de entrega |
| --- | --- | --- |
| Modelo, cálculos, filtros, integridade e integrações | 165 testes distintos aprovados | `validation/unit-v8.log` |
| Dicionário ativo após retirada das definições antigas | Quatro testes de gestão reexecutados e aprovados | `validation/unit-v8-management.log` |
| Navegação, seleção de subconjuntos, fichas e exportações | 39 cenários aprovados; zero erros JS/console/HTTP | `validation/browser/report.json` |
| Distribuição compilada | 44 verificações aprovadas: 35 canvases e nove verificações funcionais; zero erros JS/console/HTTP | `validation/production/report.json` |
| PC | Sete páginas em 1920×1080 e 1366×768: 14 canvases sem rolagem do documento | Screenshots em `validation/production/` |
| Responsividade | 21 vistas adicionais sem overflow horizontal | Relatórios de geometria |
| Gráficos | 72 instâncias ECharts inspecionadas nos canvases de PC; menor altura de gráfico de 150 px na versão compilada | Relatório de navegador e produção |
| TypeScript/build | Aprovados; Vite 6.4.4, 2.217 módulos | `npm run build` |
| Importação da planilha Confea | 3.887 células, 96 fórmulas, 281 métricas e 53 indicadores preservados; três JSONs reproduzidos byte a byte | `validation/confea-import-report.json` |

Os quatro testes reexecutados pertencem aos 165 testes distintos; não representam um total de 169. A suíte completa antecedeu a limpeza do dicionário ativo, e o conjunto afetado foi reexecutado depois dela. Os arquivos de aplicação usados na validação de navegador e produção estavam congelados; ajustes posteriores se limitaram a espera de carregamento e premissas do harness.

O relatório final de navegador consolida a execução inicial de 38 cenários com cinco verificações direcionadas, incluindo um novo cenário de seleção da linha de autores ART. Foram corrigidas três premissas de teste: medir conteúdo informativo visível em vez do padding vazio da tabela, escolher um ponto real da coluna afastado da linha sobreposta e consultar o aviso no local correto da ficha. Os hashes dos relatórios de origem estão em `provenance`. A produção foi verificada após o harness aguardar o carregamento intencional do catálogo lazy. Não se trata de um `.pbix` testado.

## O que foi conferido

- Empresas-raiz, estabelecimentos, registros, pessoas, vínculos, ARTs e CAOs preservam grãos e referências próprios. O dicionário ativo contém 98 definições completas e únicas.
- A visão executiva reconcilia entradas/saídas/estoque cadastral, partição de empresas ativas com/sem RT, pessoas ativas com autoria identificada, ARTs/autores distintos e recebimentos PJ por data de pagamento. Valores recuperados são subconjunto dos recebimentos.
- Autoria exige referência expressa na ponte profissional–ART. A cobertura demonstrativa de autoria é parcial e aparece na tela; ausência de referência não significa inatividade ou desemprego. Vínculo RT não presume autoria.
- Crescimento empresarial e emprego agregado usam cortes territoriais e temporais compatíveis. Filtros que reduzem apenas o universo empresarial bloqueiam a comparação entre os dois universos.
- Formação declarada mede coortes de diplomados cadastrados na demonstração; não representa todos os diplomados paulistas. CAGED/RAIS permanecem agregados por município/CNAE/CBO/competência, sem atribuição a um CNPJ ou trabalhador específico.
- A fiscalização digital usa regras explicáveis de CNPJ, CNAE principal/secundário, correspondência cadastral, vigência, RT e objetos PNCP. Não inclui pontuação ponderada, produtividade de fiscais, SLA operacional ou conclusão automática de infração.
- O Sankey conserva identidades; partições sem sobreposição reconciliam com o universo elegível. Cobertura territorial não presume que uma matriz cadastrada cubra automaticamente todas as filiais. Sugestão por raiz não equivale a correspondência exata por CNPJ completo.
- Objetos contratuais são categorizados por regras textuais demonstrativas, sem modelo treinado ou confiança estatística. Ausência de ponte contrato–ART no protótipo não demonstra inexistência da ART contratual na realidade.
- Cliques reais em colunas, linhas, nós, células e pontos selecionam os registros correspondentes. Pesquisa, ordenação, paginação, ficha e CSV permanecem no mesmo subconjunto.
- A página Transparência preserva 42 indicadores regionais e dois com dependência federal; nove exclusivamente Confea ficam fora do recorte paulista. Valores atuais permanecem ausentes por falta de conexão, nunca substituídos pelos números históricos da planilha.
- O indicador 53 preserva orçamento aprovado da fiscalização / orçamento aprovado total, códigos 183/182. A divergência texto–Excel do indicador 35 permanece explícita para homologação.
- Exigências verificadas diferenciam publicação regional, consolidação federal e reporte ao Confea. A marcação da planilha não foi tratada como prova jurídica individual de obrigação pública.
- O catálogo integral com valores históricos não é copiado para o build estático. Apenas regras e endereços de evidência são carregados pela interface; o catálogo extenso é carregado sob demanda.
- Perfis demonstrativos restringem informação financeira e exportações na experiência. A hospedagem mantém acesso privado; não há botão de liberação pública ou mudança de audiência.

## Reprodução

```bash
npm ci
npm test
npm run data:export
npm run build
```

Com desenvolvimento em `5174`, executar `npm run test:browser`. Com `npm run preview -- --port 4173`, executar `npm run test:production`. `QA_URL`, `QA_OUTPUT`, `QA_FILTER` e `CHROMIUM_PATH` configuram os scripts. A aplicação requer Node 20+; o coletor com proxy nativo requer Node 24 e `NODE_USE_ENV_PROXY=1` no ambiente apropriado. `npm run test:integrations` reexecuta os 12 testes de integrações já incluídos em `npm test`.

Para reproduzir a importação do anexo, executar `python scripts/import-confea-indicators.py --source CAMINHO.xlsx`; é necessário `openpyxl`. O importador preserva fórmulas, sem calcular valores atuais.

O exemplo `integrations/refresh-sources.example.json` vem desabilitado. Habilitar e agendar exige configuração institucional. Os templates M/SQL são propostas de leitura, não o schema real confirmado. O teste anterior da API PNCP permanece documentado em `ATUALIZACAO_AUTOMATICA_V7.md`: lote externo coletado, não promovido nem cruzado com empresas fictícias. Não foi apresentado como atualização corrente desta revisão.

## Limites da entrega

Dados internos e cruzamentos do protótipo são demonstrativos. Não há servidores, credenciais, views reais homologadas ou carga institucional validada. Gateway, drivers/conector Db2, query folding, política incremental, RLS/OLS e refresh do Power BI Service precisam ser validados no ambiente do CREA-SP. As regras públicas exigem homologação das fórmulas e dados antes de qualquer publicação institucional. A entrega contém React, código de carga, dados fictícios, contratos e documentação; não inclui `.pbix` nem IA treinada.
