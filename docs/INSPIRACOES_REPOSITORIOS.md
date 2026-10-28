> **Arquivo histórico — substituído pela diretriz V7.** O conteúdo abaixo preserva decisões e evidências das versões anteriores; não descreve as fontes ativas do BI. A V7 exclui fatos capturados manualmente de sites, PDFs e snapshots dessas medidas. Em produção, o relatório deve consumir SQL Server/DB2 pelo gateway ou APIs homologadas, com rotina automática de ingestão; arquivos oficiais podem alimentar o banco por ETL homologado. Consulte [ATUALIZACAO_AUTOMATICA_V7.md](ATUALIZACAO_AUTOMATICA_V7.md). A integração institucional ainda precisa ser configurada e validada.

# Inspirações dos repositórios e arquitetura do BI

Revisão V5 de 10/10/2026. Foram relidos os endereços atualizados pelo usuário. O protótipo combina fatos internos fictícios com agregados públicos identificados, preservando fontes e competências distintas. Nenhum notebook externo foi executado nem um modelo treinado foi importado para o navegador. A documentação detalhada está em [REPOSITORIOS_USUARIO_V5.md](REPOSITORIOS_USUARIO_V5.md) e [REPOSITORIOS_DADOS_V5.md](REPOSITORIOS_DADOS_V5.md).

## O que foi possível ler

| Referência enviada | Acesso nesta sessão | Uso na revisão |
| --- | --- | --- |
| [engineering-analytics-pncp — main](https://github.com/caiofvserra/engineering-analytics-pncp/tree/main) | Lido no commit `88ba1277ea17b779f2c692d99e0520c76fabd752`, de 01/09/2026. | README, notebook `subenquadramento_pncp_final.ipynb`, estrutura de GRE.xlsx e cnaes_crea.xlsx. Inspiração para fluxo de investigação, explicabilidade, evidências e limites de inferência. |
| [conselho](https://github.com/caiofvserra/conselho) — substitui o antigo endereço queda | Lido no commit `3fbfa93dc38d2b3e7e272a2cf7a5251726c1f813`, branch `claude/crea-sp-audit-tool-m9nw7t`. | Referência institucional, governança e interpretação de evidências. Não fornece o cadastro interno real utilizado no protótipo. |
| [engineer-statistics publicado](https://caiofvserra.github.io/engineer-statistics/) | Site e 29 JSONs públicos acessíveis. O repositório da branch original permanece indisponível. | Dados publicados de formação, novos registros, profissionais ativos, títulos, remuneração e saldos por CBO efetivamente incorporados, com recortes preservados. |
| [receita-socios-eng — main](https://github.com/caiofvserra/receita-socios-eng/tree/main) | Lido no commit `d98735df4af8da7566902bd0524cf9a1d4210df2`: nove arquivos de código/documentação, sem conjuntos de dados. | Separação empresa/estabelecimento/raiz de CNPJ e participação societária. O QSA individual da demonstração permanece fictício; sugestões nominais não estabelecem identidade. |

As indisponibilidades registradas na V4 foram superadas para receita-socios-eng e para o novo endereço conselho. Os dados publicados de engineer-statistics foram obtidos pelo site, sem presumir acesso ao seu código privado. Os 29 envelopes originais, URLs e hashes estão preservados em `public/data/engineer-statistics/`. Rótulos de confiança dessas publicações são atribuídos ao projeto de origem, sem nova certificação das fontes primárias.

## O que a referência PNCP acrescenta

O [README](https://github.com/caiofvserra/engineering-analytics-pncp/blob/main/README.md) descreve um estudo que busca objetos de engenharia entre contratos publicados como serviços gerais. Seu pipeline separa coleta, classificação, revisão humana e verificação documental. Essa separação orientou a página de Fiscalização: categoria publicada, sugestão de classificação, força da regra, justificativa e validação são dados diferentes.

O [notebook](https://github.com/caiofvserra/engineering-analytics-pncp/blob/main/subenquadramento_pncp_final.ipynb) utiliza representações semânticas, modelos calibrados e revisão de documentos. A aplicação demonstra somente o processo de explicação e os fluxos analíticos; o classificador React usa um dicionário determinístico. O índice de 0 a 100 é força da regra, não probabilidade calibrada de engenharia ou infração. Os números de execução publicados no repositório não foram copiados como dados do protótipo.

Dois cuidados do estudo são preservados:

- O contrato e a compra de origem têm números de controle PNCP distintos. Edital, termo de referência e projeto podem estar nos documentos da compra. Não concluir ausência de documentação lendo apenas o objeto do contrato.
- Evidência não localizada no material publicado não comprova inexistência de ART ou responsável técnico. Documento ilegível, não integrado ou sem publicação é uma condição de disponibilidade da fonte, não uma conclusão jurídica.

O campo `PNCP-DEMO-*` da amostra é uma chave local fictícia. A versão atual não inventa número de controle de compra, URLs de processos oficiais, documentos baixados ou ARTs de contratação. A tabela informa que a revisão humana da sugestão textual está pendente; isso não altera o estado dos casos demonstrativos existentes no cadastro de fiscalização.

## Separação dos domínios

**Visão geral** apresenta tendências, estrutura, produção técnica, contexto econômico e relações entre universos. Não apresenta fila fiscal, prioridade, hipótese de infração ou conclusão de fiscalização.

**Empresas e profissionais** permite conhecer o cadastro, as modalidades, os vínculos e o acervo com unidades de contagem explícitas. Ausência de vínculo na fonte é uma característica da cobertura de dados e nunca uma acusação automática. Uma ligação de responsabilidade técnica exige uma linha de vínculo com empresa, profissional e vigência; uma ART exige sua relação explícita com o profissional. Não inferir autoria de toda ART a partir de qualquer RT da empresa.

**Mercado e contratações** apresenta quantidades, emprego agregado, compradores, fornecedores, categorias publicadas e valores. Identificar correspondência por CNPJ é uma conciliação descritiva. Pontuação, triagem, hipóteses de divergência de objetos e validação documental ficam exclusivamente em **Fiscalização**.

**Fiscalização** reúne transições históricas, volume regional, resultados, evolução das análises, contexto cadastral e fatores demonstrativos de prioridade. A V5 é somente leitura: não oferece fila operacional, encaminhamento, alteração de situação, lavratura de auto ou aplicação de penalidade.

## Empresas, profissionais e fontes externas

| Universo | Grão e relação válida | Relações que não se presumem |
| --- | --- | --- |
| Empresa | Raiz do CNPJ; um ou mais estabelecimentos. | Estabelecimento não é sinônimo de empresa distinta. |
| Cadastro profissional interno | Identificador profissional e registros com sua competência. | Registro profissional não equivale a emprego formal nem prova atuação mensal. |
| Vínculo de responsabilidade técnica | Vínculo, profissional, empresa e período de vigência. | Profissionais distintos não são contados como vínculos; vínculo não comprova participação em qualquer contrato. |
| ART e acervo | ART com relação autoral explicitamente disponível; CAO da pessoa jurídica e CAT do profissional, quando a fonte existir. | CAO não é CAT; profissional vinculado não é automaticamente autor de toda ART da empresa. |
| Quadro societário público proposto | Participação de sócio numa empresa, fonte e competência. | Sócio não é automaticamente RT. Nome ou CPF parcialmente mascarado não constitui correspondência individual determinística com o CREA. |
| RAIS / Novo CAGED | Competência, município, CNAE e CBO nas agregações disponíveis. | Não criar EmpresaID/ProfissionalID a partir de totais agregados. Ocupação não comprova formação, atribuição ou registro. |
| PNCP | Contrato, compra, fornecedor, órgão, categoria publicada e competência. | Município do órgão, município do fornecedor e local da obra são geografias diferentes; valor contratado não é receita ou valor executado. |

Na futura produção, relacionar pessoas por identificador autorizado e origem auditável. Sugestões aproximadas por nome são fatos de conciliação sujeitos a revisão; não fundem pessoas e não criam vínculos técnicos. Uma demonstração de relação societária deve permanecer fictícia e identificada como tal, até a fonte e as permissões serem validadas.

As propostas de fonte permanecem alinhadas à [Receita Federal/CNPJ](https://www.gov.br/receitafederal/pt-br/assuntos/cadastros/cnpj), à [RAIS](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/estatisticas-trabalho/rais), ao [Novo CAGED](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/estatisticas-trabalho/novo-caged) e à [CBO](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo). Estes links identificam fontes propostas; não significam que microdados individuais foram importados ou que o acesso foi autorizado. A matriz completa está em [FONTES_PROPOSTAS.md](FONTES_PROPOSTAS.md).

## Gráficos escolhidos e contagens

O fluxo de casos utiliza apenas transições efetivamente presentes no histórico até a data de referência. Cada caso termina numa única saída correspondente à última fase registrada. As saídas reconciliam com o total; as passagens intermediárias são cumulativas e não devem ser somadas como casos distintos. Histórico com retorno de fase não é convertido em um caminho progressivo fictício: o componente o identifica como fora do fluxo linear.

O classificador determinístico da base demonstrativa permanece uma regra explicável, sem modelo treinado. Na V5, não existe editor de classificação no relatório. O PNCP real exibe categoria publicada e município do órgão: não recebe classificação automática de obrigação de registro e não é ligado ao cadastro empresarial fictício.

A navegação principal agora possui seis páginas fixas, cada uma com seis visuais simultâneos. Seleções em gráficos aplicam o recorte compatível, e “Ver dados” abre registros somente para investigação. Fichas detalham relações expressamente disponíveis. Não exibimos UMAP ou grafo semântico como se embeddings tivessem sido calculados; as arestas do Sankey profissional provêm exclusivamente de RT e QSA confirmado demonstrativos.

## Atenção ao arquivo GRE do repositório

O GRE.xlsx lido no PNCP contém 662 linhas de dados e 16 gerências, com duplicatas de municípios e 8 linhas `XXXXXXX`. Inclui GRE 15 — Presidente Prudente e GRE 16 — Marília. Isso diverge das 14 GREs do organograma de março de 2026 enviado para o projeto. O notebook também aplica correções locais de nomes.

Essa planilha não substituiu a dimensão territorial do protótipo. Uma integração futura precisa conciliar competência, duplicatas, limites e regras com uma fonte territorial homologada. Geometria municipal do IBGE não valida automaticamente a associação administrativa de cada município à GRE. A planilha CNAE do repositório tem 702 registros e foi usada apenas como comparação estrutural; a classificação preservada no produto vem do arquivo enviado pelo usuário.

## Preparação para Power BI

Contratos, classificações, revisões e documentos devem permanecer separados no modelo. Um contrato pode ter várias revisões/documentos; somar valor pelas linhas da revisão multiplicaria indevidamente o contratado. Um filtro de resultado seleciona chaves distintas de contratos e depois aplica a medida sobre a tabela de contratos.

Sankey demanda visual customizado homologado ou uma alternativa com matriz/barras nativas. Histograma de pontuação pode usar faixas e colunas; marcadores documentais podem usar matriz com formatação condicional; mapa, tooltips e drillthrough preservam a exploração. OCR, treinamento, embeddings e processamento documental são serviços externos que produzem tabelas versionadas; não rodam como se fossem uma medida DAX.

Cada revisão futura guarda dado utilizado, fonte, competência, versão da regra/modelo, resultado, justificativa, disponibilidade documental e decisão humana. Normas e distinções jurídicas já pesquisadas permanecem em [NORMAS.md](NORMAS.md); a referência de pesquisa não substitui sua validação pelo CREA-SP.
