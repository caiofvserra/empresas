> **Arquivo histórico — substituído pela diretriz V7.** O conteúdo abaixo preserva decisões e evidências das versões anteriores; não descreve as fontes ativas do BI. A V7 exclui fatos capturados manualmente de sites, PDFs e snapshots dessas medidas. Em produção, o relatório deve consumir SQL Server/DB2 pelo gateway ou APIs homologadas, com rotina automática de ingestão; arquivos oficiais podem alimentar o banco por ETL homologado. Consulte [ATUALIZACAO_AUTOMATICA_V7.md](ATUALIZACAO_AUTOMATICA_V7.md). A integração institucional ainda precisa ser configurada e validada.

# Dados disponíveis nos repositórios: contratos e contexto empresarial

Verificação em 10/10/2026. Foram usados o conector GitHub autenticado e leituras locais dos arquivos clonados. Nenhum notebook ou programa externo foi executado. As extrações da API são código próprio de leitura e agregação, sem alterar repositórios ou fontes.

## Resultado efetivo da leitura

| Repositório e referência solicitada | Acesso verificado | Dados materialmente disponíveis |
|---|---|---|
| `caiofvserra/engineering-analytics-pncp`, `main` | Acessível; commit `88ba1277ea17b779f2c692d99e0520c76fabd752` | Duas dimensões XLSX, notebook sem saídas armazenadas e seis resultados agregados publicados no README |
| `caiofvserra/queda`, `claude/crea-sp-audit-tool-m9nw7t` | O conector autenticado responde `Not Found` em metadados e busca de branch | Não foi possível inventariar arquivos nem verificar dados pré-baixados. A resposta não permite distinguir repositório privado sem permissão, removido ou renomeado. |

A árvore completa do PNCP contém exatamente `GRE.xlsx`, `cnaes_crea.xlsx`, `README.md` e `subenquadramento_pncp_final.ipynb`. O notebook possui 60 células e zero células com saídas armazenadas. Os arquivos `contratos.parquet`, `veredito_llm.csv`, `rito.csv`, `lista_crea.csv/.xlsx` e os modelos/checkpoints são **saídas descritas pelo código**, mas não estão versionados nesta árvore. O notebook usa diretórios locais ou Google Drive e não publica um endereço para esses artefatos. Não há base granular disponível no repositório para recuperar contratos, documentos ou desfechos da execução publicada.

Fonte da árvore: <https://api.github.com/repos/caiofvserra/engineering-analytics-pncp/git/trees/main?recursive=1>.

## Dados do estudo que podem ser aproveitados

O arquivo de referência `pncp-study-published-aggregate.json` transcreve seis medidas explicitamente publicadas no README, com commit, hash e limites:

| Medida publicada pelo autor | Quantidade |
|---|---:|
| Contratos coletados | 126.465 |
| Rotulados como serviços gerais | 117.882 |
| Acima do limiar do estudo | 31.805 |
| Confirmados como engenharia no estudo | 11.922 |
| Sem evidência de rito localizada ao fim do estudo | 525 |
| Rótulo divergente com evidência de rito localizada | 9.841 |

Esses resultados são uma referência analítica publicada pelo autor. Não são estatísticas oficiais do CREA-SP, não foram recalculados nesta aplicação e não pertencem à base sintética. O README não informa limites temporais exatos da execução; o código configura tentativas de coleta de 2024 a 2026, o que não comprova cobertura completa desses anos.

Os seis marcos não são uma partição mutuamente exclusiva. Não somar os desfechos, não inferir o subconjunto de cada um, nem desenhar um Sankey que alegue reconciliação sem a base granular. A ausência de evidência localizada nos documentos publicados não prova ausência de ART/RT nem infração. Esses totais não respondem a segmentações por município, empresa, CNAE, GRE ou mês.

Fonte: <https://github.com/caiofvserra/engineering-analytics-pncp/blob/88ba1277ea17b779f2c692d99e0520c76fabd752/README.md>.

## Dimensões reutilizáveis e ressalvas

- `cnaes_crea.xlsx`: 702 atividades; preservar a marcação original de relacionadas e passíveis de obrigação conforme análise. O CNAE isoladamente não comprova obrigação de registro.
- `GRE.xlsx`: 662 linhas e 16 gerências, com nomes/duplicatas e oito linhas `XXXXXXX`; diverge das 14 GREs do organograma de março de 2026 utilizado no protótipo. Não substituir a dimensão vigente sem conciliar competência e abrangência territorial. Para bases públicas, o código municipal IBGE é a chave territorial preferencial; GRE é atributo de um mapeamento versionado.

## Recorte público real extraído da API PNCP

Para disponibilizar informação real mesmo sem os arquivos de execução do repositório, foi realizada uma extração própria, somente leitura, na API oficial:

<https://pncp.gov.br/api/consulta/v1/contratos?dataInicial=20250901&dataFinal=20250901&pagina=1&tamanhoPagina=500>.

O arquivo `pncp-public-aggregate-2025-09-01.json` contém somente agregados e metadados. São publicações de **01/09/2025**, observadas na consulta de **10/10/2026**, com São Paulo definido pelo município da unidade do órgão contratante e categorias publicadas 7 (Obras), 8 (Serviços) e 9 (Serviços de Engenharia).

| Categoria publicada | Contratos | Valor publicado |
|---|---:|---:|
| Serviços | 329 | R$ 95.658.733,33 |
| Obras | 8 | R$ 6.042.784,33 |
| Serviços de Engenharia | 4 | R$ 1.509.539,62 |
| Total do recorte | **341** | **R$ 103.211.057,28** |

A coleta completou todas as **13 páginas**, reconciliando os **6.241 registros** anunciados pela API para o Brasil; todos tinham chave de contrato e nenhuma chave estava duplicada. São Paulo tinha 1.430 contratos de todas as categorias; o recorte publicado acima selecionou 341. A agregação resulta em **92 células município × categoria**, abrangendo **85 municípios IBGE** de São Paulo. Todos os contratos selecionados tinham valor. Quantidades e valores das células reconciliam com o total selecionado.

Valor utiliza `valorGlobal`; somente se ausente utiliza `valorInicial`. Um valor ausente não seria interpretado como zero e teria cobertura informada, embora não tenha ocorrido neste recorte. Nomes, CNPJs, identificadores de pessoas e objetos individuais não saem da extração. `supplierCountWithinCell` é uma contagem distinta dentro de cada célula: não deve ser somada para obter fornecedores distintos de todo o universo.

O manifesto registra URL, data da consulta, competência, papel territorial, páginas, total bruto, chaves únicas, filtros, quantidade selecionada, cobertura dos valores e SHA-256 das respostas. Houve limitação temporária HTTP 429 na tentativa paralela inicial; a coleta final usou leitura sequencial, cache e espera indicada pelo serviço, sem contornar restrições.

**Uso no relatório:** distribuição por categoria e matriz município × categoria, podendo combinar quantidade e valor no mesmo visual. Não há série mensal legítima neste recorte de um dia. Ele não representa estoque de contratos vigentes nem tendência anual e não deve receber uma projeção temporal inventada. Serviços gerais não equivalem automaticamente a engenharia. Município do órgão não é o local da obra.

Essa fonte não pode ser somada à base sintética nem relacionada aos CNPJs fictícios. A classificação documental do estudo não foi executada nesta extração; portanto, não há score, evidência de ART, desfecho fiscal ou correspondência cadastral real nesses agregados.

## Como unir fontes e transformar dados em informação

O modelo compartilhado deve usar dimensões conformadas, conservando a granularidade de cada fato. O relatório aplica seleções e mostra relações; coleta, classificação, processamento e tratamento operacional ficam fora do relatório.

| Fonte/fato | Grão e chaves | Ligação válida | Pergunta analítica |
|---|---|---|---|
| Cadastro empresarial CREA e CNPJ Receita | Estabelecimento/CNPJ completo; empresa/raiz; competência | Correspondência determinística por CNPJ válido, com data e situação | Em quais municípios e atividades o universo econômico cresce e a cobertura varia? |
| Contratos PNCP | Contrato por `numeroControlePNCP`; compra por `numeroControlePncpCompra` | Fornecedor PJ por CNPJ; órgão por identificador próprio; município do órgão separado do fornecedor e da execução | Qual é a evolução do valor/quantidade publicados, composição econômica e participação da base registrada? |
| Classificação do objeto | Contrato + versão de processamento | Chave de contrato; não multiplicar valor ao juntar revisões | Como categorias publicadas e categorias analisadas se distribuem? |
| Documentos/evidências | Documento/compra/versão | Documento → compra/contrato com origem explícita | Em qual parte do universo analisado há evidência publicada, leitura incompleta ou informação ausente? |
| RAIS/Novo CAGED | Município × CNAE/CBO × competência | Dimensões geografia, atividade, ocupação e tempo | O dinamismo empresarial acompanha emprego e ocupações técnicas? |
| Diplomados/INEP | Curso/área × IES/local da oferta × ano | Dimensões área de formação, geografia da oferta e ano | Como oferta de formação, registros e emprego evoluem no território? |

Município do órgão contratante não é o local da obra. Domicílio profissional não é o município da empresa vinculada. Local de oferta do curso não é residência atual do diplomado. As comparações devem usar períodos compatíveis, nomes de eixos explícitos e denominadores definidos. Emprego agregado e diplomados não devem receber uma ligação artificial a CNPJ ou profissional individual.

Para uma página de Contratações com fluxo de análise, usar série combinada de quantidade e valor → distribuição por categoria e território → participação de fornecedores identificados na base CREA → painel de explicação do recorte. Em Fiscalização, a informação derivada pode mostrar classificação/evidência e resultados agregados de análises anteriores; não incluir botões de encaminhamento, alteração de status ou execução de tratamento no relatório.

## Correspondência com Power BI

- Coleta PNCP e preparação em Python/Power Query/lakehouse, com manifesto de competência e atualização.
- Dimensão de contrato separada de compra; tabela de fornecedores normalizada por CNPJ quando disponível.
- Categorias publicadas preservadas; classificações/revisões como fatos versionados separados.
- Medidas DAX de quantidade distinta de contratos e soma de valores no grão contratual.
- Colunas + linha em um gráfico combinado; matrizes com formatação condicional; barras por território/categoria; scatter econômico somente quando fontes têm granularidade/tempo compatíveis.
- Segmentações sincronizadas por dimensões conformadas e drillthrough de informação. Não executar fluxo de fiscalização dentro do relatório.
- Fontes públicas reais e dados sintéticos nunca devem ser somados ou apresentados como uma mesma população.
