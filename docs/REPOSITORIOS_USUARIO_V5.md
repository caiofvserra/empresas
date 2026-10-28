> **Arquivo histórico — substituído pela diretriz V7.** O conteúdo abaixo preserva decisões e evidências das versões anteriores; não descreve as fontes ativas do BI. A V7 exclui fatos capturados manualmente de sites, PDFs e snapshots dessas medidas. Em produção, o relatório deve consumir SQL Server/DB2 pelo gateway ou APIs homologadas, com rotina automática de ingestão; arquivos oficiais podem alimentar o banco por ETL homologado. Consulte [ATUALIZACAO_AUTOMATICA_V7.md](ATUALIZACAO_AUTOMATICA_V7.md). A integração institucional ainda precisa ser configurada e validada.

# Dados e arquitetura dos projetos do usuário — revisão V5

Revisão de acesso em 10/10/2026. Os arquivos públicos indicados foram lidos e os dados publicados foram efetivamente importados, sem executar aplicações, notebooks ou scripts externos. Os fatos internos de empresas, profissionais, RT, ART, CAO, financeiro e fiscalização permanecem demonstrativos; os agregados públicos abaixo têm outra origem e competência.

## Acessos confirmados

| Projeto enviado | Conteúdo efetivamente acessado | Uso e limite |
| --- | --- | --- |
| [engineer-statistics publicado](https://caiofvserra.github.io/engineer-statistics/) | Páginas `diplomas`, `mapa`, `sobra`, `rotulo`, `fontes` e `metodologia`; 29 envelopes JSON canônicos disponibilizados em `/dados/`. Snapshot publicado: 19/09/2026. | Fonte dos novos agregados públicos de formação, diplomados, registro profissional e contexto do trabalho. O repositório GitHub/branch enviado continuou retornando 404; isso não impede ler os dados públicos do projeto publicado. |
| [receita-socios-eng — main](https://github.com/caiofvserra/receita-socios-eng/tree/main) | Commit [`d98735df4af8da7566902bd0524cf9a1d4210df2`](https://github.com/caiofvserra/receita-socios-eng/commit/d98735df4af8da7566902bd0524cf9a1d4210df2). README, loaders, schemas oficiais, filtros de CNAE principal/secundário e joins. | Pipeline Spark útil à ingestão Receita/CNPJ/QSA. Há código, mas nenhum arquivo de dados CNPJ ou resultado Parquet/CSV no repositório. Não foi executado para aparentar possuir dados que não estão ali. |
| [conselho — branch claude/crea-sp-audit-tool-m9nw7t](https://github.com/caiofvserra/conselho/tree/claude%2Fcrea-sp-audit-tool-m9nw7t) | Commit [`3fbfa93dc38d2b3e7e272a2cf7a5251726c1f813`](https://github.com/caiofvserra/conselho/commit/3fbfa93dc38d2b3e7e272a2cf7a5251726c1f813). README, `findings.py`, `analytics.py` e verificações finalística, receita e benchmark. Substitui a referência anterior `queda`. | Inspiração para medidas com denominador explícito, séries anuais, natureza × função, orçamento × execução e cobertura documental. `data/` e `output/` são ignorados pelo Git e não constam da árvore acessível; não importamos achados de uma execução não disponível. |
| [engineering-analytics-pncp — main](https://github.com/caiofvserra/engineering-analytics-pncp/tree/main) | Leitura anterior documentada em [INSPIRACOES_REPOSITORIOS.md](INSPIRACOES_REPOSITORIOS.md), commit `88ba1277ea17b779f2c692d99e0520c76fabd752`. | Preserva distinção entre categoria publicada, objeto, classificação e evidência documental; não produz conclusões automáticas de obrigação de registro. |

O relato de indisponibilidade das versões anteriores descrevia aquela tentativa. Esta revisão confirmou acesso ao `receita-socios-eng`, ao novo `conselho` e aos dados públicos do `engineer-statistics`.

## Dados do engineer-statistics incorporados

O arquivo normalizado é [user-engineer-statistics.json](../src/domain/user-engineer-statistics.json). Os 29 envelopes originais, sem alterações, são preservados em `public/data/engineer-statistics/`. O manifesto dentro de `metadata.files` registra URL pública original, download local, tamanho e SHA-256 de cada arquivo. O normalizador `scripts/import-user-engineer-statistics.py` reproduz a transformação a partir desses envelopes.

| Coleção normalizada | Grão / competência | Conteúdo |
| --- | --- | --- |
| `graduateAnnual` | Brasil × ano × recorte; fluxo, pessoas/ano. | Oito observações. Engenharia estrita: 41.291 (2010), 67.205 (2014), 128.871 (2018), 126.932 (2019), 97.672 (2022) e 95.607 (2023). CINE 07 amplo: 163.311 (2018) e 110.596 (2024), em série separada. |
| `annualRegistrations` | Brasil ou CREA-SP × ano; fluxo, registros/ano. | 90 pontos nacionais, 1937–2026, e 13 CREA-SP, 2010–2022. Nacional 2025: 65.245; 2026: 46.650 **parciais até 30/08/2026**. CREA-SP 2022: 14.917. |
| `registrations` | 27 UFs e total Brasil; estoque em 30/08/2026, todas as profissões do Sistema. | Brasil: 1.217.708 ativos, 1.674.263 registros históricos. São Paulo: 346.824 ativos, 445.546 registros históricos; 86.413 interrompidos, 3.890 cancelados, 94 suspensos e 8.325 outras situações. Inclui população IBGE 2025 separada por competência. |
| `engineeringTitles` | UF × grupo Engenharia; estoque de **títulos**, 30/08/2026. | 27 UFs. Brasil: 1.070.469 títulos; SP: 332.663. Um profissional pode ter mais de um título. |
| `stockBenchmarks` | Brasil × universo × ano; estoques não aninhados. | Diplomados CINE 07: **2,37 milhões**, Censo 2022, reprodução citada de fonte secundária. Ocupados na ocupação engenheiro: 505 mil, Censo 2022. Engenheiros registrados ativos: 931.838, estudo CONTECC com referência 2020, histórico. |
| `modalityTitles` | Brasil × modalidade Engenharia; títulos em 30/08/2026. | Seis modalidades que reconciliam com 1.070.469 títulos de engenharia; a série não representa seis grupos de pessoas distintas. |
| `salaryOccupations` | Brasil × CBO × janela publicada; média de movimentações CLT. | 12 ocupações, salário médio, jornada e volume de movimentações. Mantém URL e fonte por CBO; não calcula remuneração individual ou infração. |
| `employmentBalances` | Brasil × três CBOs selecionadas × janela; saldo de vínculos. | Engenharia civil −812 (jul/2025–jun/2026), elétrica −152 e produção −71 (janelas de 12 meses referenciadas em ago/2026). Amostra parcial, sem extrapolação para toda a engenharia. |

As fontes e os rótulos de confiança (`citado`, `verificado`, `verificado-pelo-usuario`, `estimativa`) são conservados do catálogo do projeto de origem. **Reproduzir fielmente o JSON publicado não equivale a verificar novamente cada microdado em sua fonte primária.** A validação do protótipo conferiu integridade, unicidade, aritmética e fidelidade aos envelopes; a homologação das fontes continua documentada.

## Como reunir formação, registro e trabalho sem inventar uma conversão

Concluintes anuais, novos registros anuais e estoque de profissionais respondem a perguntas diferentes. As séries podem compartilhar dimensão de tempo e contexto territorial compatível, mas não se tornam fases de um mesmo fluxo individual. Engenharia estrita ≠ CINE 07 amplo ≠ todas as profissões do Sistema. CNPJ, RT e ART são relações internas explícitas; esses identificadores não existem nos agregados públicos.

Um gráfico combinado de formação e entrada no Sistema é uma **comparação de evolução**: colunas para concluintes no recorte declarado e linha para novos registros, com legendas completas. Não subtrair para chamar o resultado de “diplomados sem registro”, nem dividir para divulgar “taxa de registro de egressos”. Coortes, defasagens, profissão e área de formação não estão conciliadas. Nenhum ano sem fonte é interpolado ou preenchido com zero. O ponto parcial de 2026 é marcado e excluído da comparação com anos fechados.

Os dois estoques do Censo 2022 — diploma em área ampla e ocupação engenheiro — não têm conjuntos aninhados. Sua aproximação visual deve mostrar comparações e definições lado a lado, sem etapas decrescentes que aparentem rastrear as mesmas pessoas. O número exato de 2.371.066 permanece no arquivo canônico para auditabilidade; a apresentação segue a regra da fonte de mostrar **2,37 milhões** enquanto não houver validação da tabela primária.

A formação presencial de São Paulo em [external-education.json](../src/domain/external-education.json) foi extraída de outra reprodução pública auditada de microdados INEP: 2019–2024, cursos cujos rótulos CINE iniciam com Engenharia mais Agronomia, local de oferta presencial. Ela possui outro universo, geografia e recorte. Não substituir o Brasil estrito por essa soma, nem fazer o total nacional responder a um município/GRE. Cada visual declara quais filtros são compatíveis com seu grão.

## O que o pipeline Receita/QSA acrescenta ao modelo

`filters.py` identifica CNAE principal e secundário normalizado, combina as correspondências e agrega a lista de CNAEs relevantes por CNPJ completo. `joins.py` une empresa, estabelecimento e sócio pela raiz `cnpj_basico`, classificando o participante como PF/PJ/outros. Essa estratégia orienta uma ingestão escalável para o modelo Power BI: Empresa → Estabelecimento → ponte Estabelecimento/CNAE; Empresa → Participação societária → Participante.

O resultado do código é achatado por estabelecimento × sócio. Contar as linhas desse resultado como empresas multiplicaria o universo. A adaptação deve preservar fatos e pontes separados, contar empresas pela raiz e estabelecimentos pelo CNPJ completo, e manter as classificações da planilha, inclusive **“Passível de obrigação”**. Embora o loader conserve esse indicador, a saída mínima de `joins.py` não o exporta; ele deve ser recuperado da dimensão CNAE no modelo, sem converter toda elegibilidade em obrigação.

O repositório não relaciona QSA com profissionais CREA. CPF parcialmente mascarado e nome de sócio não criam identidade determinística. Participação societária também não equivale a responsabilidade técnica, autoria de ART ou vínculo de emprego. Os vínculos societários demonstrativos continuam identificados como sintéticos até que exista uma chave autorizada e auditável em dados reais.

## O que o conselho acrescenta à arquitetura analítica

O modelo de achado `Finding` exige contexto: série anual, unidade, fontes, cobertura/denominador, fundamentação e forma de verificação. Erro de coleta é categoria da ferramenta e não é contado como irregularidade do conselho. Isso orienta medidas e tooltips que diferenciam dado disponível, ausente e não coletado.

A matriz **natureza da despesa × função/centro de custo** evita confundir “gasto com pessoal” com “gasto com pessoal na fiscalização”. A decomposição **orçado → empenhado → liquidado → pago** mantém fases de execução distintas. As classificações por nome do centro de custo são heurísticas cuja cobertura precisa ficar visível; não são classificações oficiais simplesmente porque o valor provém de uma API pública.

O projeto trata prestação de contas institucional, não a situação cadastral de empresas fiscalizadas. Não incorporamos sua interface operacional de triagem ao BI. Seus métodos ajudam a desenhar informação comparável, com denominadores e séries, enquanto tratativas, alterações de processos e emissão de autos continuam fora da superfície do relatório.

## Validação e destino no Power BI

Os testes `tests/user-engineer-statistics.test.ts` verificam fidelidade de todos os pontos de formação/registro aos envelopes, reconciliação dos 27 estados com o total Brasil, situações cadastrais, títulos/modalidades, grãos, ausência de joins individuais artificiais, unicidade, registro das fontes e SHA-256 dos 29 downloads.

No modelo semântico, usar fatos externos próprios: Formação anual, Novo registro anual, Situação profissional por UF/data, Títulos por UF/data e Mercado por CBO/janela. Dimensões compartilhadas só onde o código e a competência estiverem disponíveis. Nenhuma dessas tabelas recebe EmpresaID/ProfissionalID. Relações unidirecionais e medidas com unidade e denominador explícito evitam que o contexto de uma ficha empresarial altere indevidamente o universo de diplomados do Brasil.

## Exportação pública para o Power BI

`node --import tsx scripts/export-public-sources.ts` produz `data-publica/`, separado de `data-demo/`: **nove CSVs com 1.055 linhas** de fatos públicos. São educação estadual anual (6), educação CINE × ano (240), educação município × CINE 2024 (563), PNCP município × categoria (92), formação Brasil × recorte × ano (8), novos registros Brasil/CREA-SP × ano (103), situação profissional por UF/total Brasil (28), salários por CBO (12) e saldo de emprego por CBO (3).

Os CSVs usam UTF-8 com BOM, ponto e vírgula, CRLF e proteção de texto contra fórmulas de planilha. Valores numéricos negativos permanecem números. O manifesto registra chaves, grão, unidades, competências, origem, limites, hashes e `seed: null`. No Power Query, preservar códigos IBGE/CINE/CBO como texto e converter números com cultura `en-US`, porque o decimal é ponto. A linha BR da situação profissional é total de controle e deve ser excluída antes de somar UFs.

Os totais educacionais de todos os anos conciliam entre estado e CINE; em 2024, também entre municípios × CINE e estado: **19.859 concluintes, 33.890 ingressantes e 119.749 matrículas presenciais** no recorte declarado. O PNCP exportado concilia 341 contratos nas 92 células, publicados em 01/09/2025, com valor agregado de R$ 103.211.057,28. Fornecedores distintos por célula não são aditivos. Os testes `tests/public-source-export.test.ts` verificam essas reconciliações, unicidade, origem, hashes, formato, valores negativos e ausência de identificadores artificiais.

## Foco territorial da interface atual

O relatório é do **CREA-SP e de São Paulo**. O estoque mostrado usa UF = SP no SIC publicado; o combinado principal compara formação presencial paulista e novos registros CREA-SP somente nos anos comuns de 2019 a 2022. As séries nacionais e demais UFs são preservadas nos arquivos e exportações como referências, sem substituir o universo paulista. A referência salarial Brasil é o único contexto nacional exibido, explicitamente sem estimativa SP.

