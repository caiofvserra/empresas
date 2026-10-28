# Fontes, contratos e rastreabilidade — V8

O relatório destina-se ao **CREA-SP e ao Estado de São Paulo**. Na versão de produção, entram medidas derivadas de **SQL Server, Db2 ou APIs homologadas com rotina de atualização**. As conexões institucionais previstas são os conectores nativos do Power BI para SQL Server e IBM Db2, pelo **on-premises data gateway**. Uma API intermediária não é requisito para acessar esses bancos no Power BI.

**Estado desta entrega:** os dados internos exibidos continuam fictícios e reproduzíveis; servidores, databases, schemas/views e credenciais do CREA-SP não foram disponibilizados; a configuração do gateway institucional não foi validada nesta entrega. O coletor PNCP pode ser executado por configuração, mas a presença do código não comprova um agendamento de produção. O relatório não usa totais transcritos de notícias/PDFs nem snapshots de sites como medidas atuais. A competência do fato, a última carga válida e o refresh do modelo são datas diferentes.

Planilha de CNAEs, organograma e malha municipal são **referências de classificação, arquitetura e geografia**. Não fornecem resultados de desempenho. Em produção, o catálogo CNAE e a associação município–GRE devem estar em tabelas versionadas de referência, homologadas e consumidas junto aos fatos. Normas podem fundamentar definições; um PDF normativo não é fonte de contagem de empresas, profissionais, autos ou resultados.

## Fontes elegíveis para produção

| Fonte | Caminho de ingestão/consumo | Grão e cuidado principal | Estado |
| --- | --- | --- | --- |
| SQL Server institucional | Views analíticas de leitura; conector `Sql.Database`; gateway | Empresa, estabelecimento, registro, eventos, documentos e relações com chaves próprias | Origem confirmada pelo usuário; conexão institucional não configurada |
| IBM Db2 institucional | Views analíticas de leitura; conector `DB2.Database`; gateway | Mesmo contrato conformado de dimensões/fatos; chaves e tipos homologados | Origem confirmada pelo usuário; conexão institucional não configurada |
| PNCP | API oficial → coletor paginado → lote validado → staging SQL Server/Db2 → modelo | Contrato publicado; fornecedor e unidade contratante têm papéis distintos | Coletor fornecido; agendamento e carga de staging pendentes |
| Receita Federal/CNPJ | ETL recorrente de dados oficiais → staging de banco | Raiz de empresa, CNPJ completo, principal/secundários e QSA | ETL institucional pendente; não se presume API nominal pública irrestrita |
| RAIS / Novo CAGED | ETL dos arquivos oficiais/acesso autorizado → banco agregado | Estoque anual e fluxos mensais separados; município × CNAE × CBO | Rotina oficial pendente; sem vínculo nominal inventado com cadastro CREA |
| INEP / Censo da Educação Superior | ETL oficial por edição → banco agregado | Ano × CINE × local de oferta × modalidade, conforme publicação | Rotina oficial pendente; análise de formação/diplomados preservada no desenho |
| IBGE | API oficial e geometria territorial versionada → referência em banco | Código municipal e tabela estatística com competência própria | Referência geográfica disponível; rotina estatística depende de homologação |
| CNAE / GRE | Tabelas de referência SQL Server/Db2 com revisão aprovada | Classificação e vigência territorial | Originais recebidos; mapa completo município–GRE ainda não homologado |

Não decidir por suposição em qual banco cada domínio reside. A área de dados deve mapear as views reais e o responsável: cadastro, profissionais, RT, ART, CAO, financeiro, fiscalização, colegiados, atendimento e programas podem ser distribuídos entre as duas origens. Dimensões conformadas e chaves estáveis unem o modelo; não se conecta um fato ao outro só porque ambos possuem nome de empresa.

Fluxo, conectores, incremental, auditoria e aceite: [ATUALIZACAO_AUTOMATICA_V7.md](ATUALIZACAO_AUTOMATICA_V7.md). Templates sem credenciais: `integrations/power-query/SQL_SERVER_EMPRESA.pq`, `DB2_EMPRESA.pq` e `integrations/sql/`. O catálogo de capacidade e impedimentos fica em `src/integrations/catalog.ts`; ele não afirma que as fontes estejam conectadas.

## Planilha de CNAEs

| Propriedade | Valor confirmado |
| --- | --- |
| Arquivo recebido | `1-cnaes-crea.xlsx` |
| Planilha | `Planilha1` |
| Colunas originais | `SUBCLASSE`, `DESCRIÇÃO`, `OBRIGAÇÃO DE REGISTRO` |
| Linhas | 703, incluindo um cabeçalho; 702 registros de dados |
| Códigos distintos | 702 |
| Códigos inválidos, duplicados ou linhas vazias | Nenhum encontrado |
| Fórmulas nas células de dados | Nenhuma encontrada |
| Metadados de criação/modificação | 22/04/2026, 11:47:01 / 11:47:36, sem fuso declarado |
| Autor nas propriedades do arquivo | GUILHERME ORIGO FULOP |
| Catálogo importado | [`src/domain/cnae-catalog.json`](../src/domain/cnae-catalog.json) |

O nome nas propriedades do XLSX identifica um metadado de autoria. Não estabelece quem é o responsável institucional pela validação da regra, pelo indicador ou pela carga de dados. O arquivo não fornece fundamento normativo ou data de vigência para cada classificação.

### Preservação e classificação analítica

Todas as linhas de dados e as três colunas foram preservadas. Cada item registra o código normalizado `####-#/##`, a descrição, a classificação analítica, o marcador original, a planilha e o número da linha de origem. O objeto `fields` mantém os textos originais das três colunas, incluindo a diferença entre `Sim` e `sim`.

| Marcador original | Quantidade | Rótulo analítico do produto |
| --- | ---: | --- |
| `Sim` | 623 | Relacionado |
| `sim` | 15 | Relacionado |
| `Passível de obrigação` | 64 | Depende de análise |
| Total | 702 | 638 Relacionado + 64 Depende de análise |

Não há linhas com a classificação analítica “Não classificado” no arquivo recebido. Esse rótulo serve para códigos não encontrados ou valores futuros ainda não reconhecidos; não foi criado um conjunto fictício de linhas para preencher essa categoria.

“Relacionado” é a apresentação analítica do marcador `Sim/sim`. Ela não determina automaticamente que um CNPJ é obrigado a registro ou está irregular. A aplicação real exige validação regulatória e análise da atividade efetivamente exercida. Ausência de código na planilha não comprova irrelevância da atividade.

### Amostra estratificada verificável

| Linha em `Planilha1` | Código | Descrição original | Marcador original | Rótulo |
| ---: | --- | --- | --- | --- |
| 2 | 1012-1/01 | Abate de aves | Sim | Relacionado |
| 29 | 7119-7/02 | Atividades de estudos geológicos | sim | Relacionado |
| 6 | 7739-0/02 | Aluguel de equipamentos científicos, médicos e hospitalares, sem operador | Passível de obrigação | Depende de análise |

As 702 atividades não representam 702 empresas. A importação não consulta a Receita Federal, não altera uma situação cadastral real e não valida correspondência de CNPJ no CREA.

SHA-256 do XLSX recebido:

```text
f088c90f07cbaeeed204ac5b064dcc6b0ba00ff423f41dd6a6785e73abae57bc
```

SHA-256 do catálogo JSON gerado:

```text
4ba30624ff9dfb26321bfc2ac2fae52c3730c5c215f784ae74af68e65e4299d0
```

Os hashes permitem verificar integridade das versões registradas. Eles não certificam a autenticidade institucional nem a validade normativa das classificações.

## Organograma de março de 2026

| Propriedade | Valor confirmado |
| --- | --- |
| Arquivo recebido | `2-ORGANOGRAMA-MARCO-2026-2.pdf` |
| Identificação na capa, página 1 | Estrutura Organizacional — Organograma MARÇO/2026 |
| Páginas | 41 |
| Título nas propriedades do PDF | Microsoft PowerPoint - Organograma MARÇO 2026 - estrutura GABI |
| Criação e modificação nas propriedades | 16/03/2026, 13:42:30 UTC |
| Nomes de titulares ou responsáveis individuais | Não identificados no documento |

As referências abaixo usam a paginação física do PDF, com a capa como página 1. A edição documenta unidades, funções, siglas e ligações hierárquicas; não nomeia responsáveis por indicador, regra regulatória ou carga de dados. Não se infere vigência posterior a março de 2026.

### Estruturas centrais verificadas

| Página | Estrutura apresentada no PDF |
| ---: | --- |
| 2 | PRES, Assessorias, SECEX, GABI, AUDI, OUVI, GENG, GPP e cinco superintendências. |
| 3 | GABI: Unidade de Inteligência de Dados e Informações Estratégicas — UDE; Equipe de Procedimentos, Padronização e Desburocratização — EPD. |
| 4 | GENG: USM e UAS. |
| 5 | GPP: UAPE e Equipe de Serviços de Acervo Técnico e Operacional, Protocolo e Arquivo — EAPA. |
| 6 | SECEX apresenta GEI, GEX, GCS, GAJ, DPO/LGPD e Consultor Jurídico; Equipe de Dívida Ativa ligada à GAJ. |
| 7 | SUPTEC: GIT e GDEP; GIT com UINFRA/EIT, GDEP com EDAD. |
| 8 | SUPCOR: GCE, GEV e GER; GCE com EDC/ECE, GEV com EL/EPE, GER com EQSC/EAPEIE. |
| 9 | SUPADF: GPFP, GGP e GGC; GPFP com UFC/UP/URI/UCP, UFC com ATC, GGP com UDGP, GGC com UGC/UCL/UFAT. |
| 10 | SUPCOL: GCOL, com UPL e UCECT. |
| 11 | SUPFIS: 14 Gerências Regionais — GREs e GPF; GPF com UPF e UPI. |

Na página 2, as superintendências são denominadas Administrativa-Financeira (SUPADF), dos Colegiados (SUPCOL), de Fiscalização (SUPFIS), de Tecnologia e Inovação (SUPTEC), de Comunicação e Relacionamento (SUPCOR). A página 10 usa a variante “de Colegiados”.

A UDE está vinculada ao GABI na página 3; não deve ser descrita como unidade da SUPTEC. A equipe EAPA é apresentada no GPP na página 5. Esses vínculos de organograma não equivalem a uma atribuição formal de propriedade de todos os dados dos respectivos temas.

### Gerências regionais e UGIs

A página 12 lista 14 GREs. As páginas 13–19 apresentam suas UGIs; o total de 40 UGIs abaixo é uma contagem das caixas do documento, não um total impresso pelo PDF.

| GRE | Regional | UGIs apresentadas | Página das UGIs |
| --- | --- | --- | ---: |
| 1 | Araçatuba | Presidente Prudente; Araçatuba; Adamantina | 13 |
| 2 | Campinas | Campinas; Jundiaí | 13 |
| 3 | Ribeirão Preto | Ribeirão Preto; Barretos; Franca | 14 |
| 4 | Piracicaba | Americana; Piracicaba; Rio Claro | 14 |
| 5 | Capital | Osasco; Barueri; Leste; Norte/Centro; Oeste/Sul | 15 |
| 6 | São José dos Campos | São José dos Campos; Taubaté | 15 |
| 7 | Santos | Santos; Praia Grande | 16 |
| 8 | Bauru | Bauru; Marília; Assis | 16 |
| 9 | São José do Rio Preto | São José do Rio Preto; Votuporanga; Catanduva | 17 |
| 10 | Araraquara | Araraquara; São Carlos | 17 |
| 11 | Sorocaba | Sorocaba; Botucatu; Itapeva | 18 |
| 12 | Mogi Guaçu | Mogi Guaçu; São João da Boa Vista; São José do Rio Pardo | 18 |
| 13 | Guarulhos | Guarulhos; Bragança Paulista; Mogi das Cruzes | 19 |
| 14 | Santo André | Santo André; São Bernardo do Campo; Diadema | 19 e 41 |

A página 19 abrevia “São Bernardo”; a página 41 confirma “São Bernardo do Campo”. As páginas 20–41 detalham unidades operacionais e postos. O documento não fornece uma tabela de cobertura de todos os municípios de São Paulo e não contém a correspondência de CNPJs fictícios com GREs. Qualquer regra territorial adicional da demonstração precisa ser identificada como tal.

SHA-256 do PDF recebido:

```text
61ccf6725aed500cae9fbfad5448405835ab86da7b3c38e5aa694df94fc1594b
```

## Malha municipal — referência IBGE

O mapa utiliza 645 feições de São Paulo, com o código municipal `properties.codarea`. Os nomes foram unidos pelo identificador da API oficial de localidades. Fontes consultadas:

- [Malha estadual 35, subdividida por município](https://servicodados.ibge.gov.br/api/v3/malhas/estados/35?formato=application/vnd.geo%2Bjson&qualidade=minima&intrarregiao=municipio).
- [Municípios do Estado de São Paulo](https://servicodados.ibge.gov.br/api/v1/localidades/estados/35/municipios).

`src/domain/sp-municipios.json` conserva 645 códigos distintos e nenhum nome ausente na junção. SHA-256 do artefato transformado: `33394fb394b211e67d570aca6c244db7accf8ef2e019a73dcb6a46e3631265b5`. É hash do arquivo local, não certificação IBGE. O metadado não determina uma edição geográfica pela data da obtenção.

A amostra fictícia observa 24 municípios. Cinza significa ausência de observação na demonstração; não representa emprego, empresas ou cobertura real iguais a zero. Geometria oficial não homologa a associação demonstrativa com GRE.

## Snapshots excluídos das medidas ativas

| Artefato histórico | Motivo de exclusão |
| --- | --- |
| `creasp-management-public.json` | Totais transcritos de relatório de gestão PDF, sem extração primária recorrente |
| `external-education.json` | Reprodução de agregados em repositório externo, sem ETL oficial governamental integrado |
| `user-engineer-statistics.json` / envelopes publicados no site do usuário | Snapshot de dados e referências com origens heterogêneas, sem rotina primária conectada ao BI |
| `pncp-public-aggregate.json` | Recorte manual de um dia, substituível por lote do coletor oficial validado |

Esses arquivos e a documentação V5/V6 são rastreabilidade histórica, não prova de atualização automática, contrato de fonte homologado ou resultado corrente. Lotes externos elegíveis ficam em `var/source-ingestion/`; não há promoção automática ao modelo. Os CSVs históricos foram movidos para `archives/data-publica-v6/` e `npm run data:archive` só recria esse arquivo excluído. Não reapresentar snapshots como dados conectados. Código dos repositórios enviados pode inspirar ETL e classificação, sem dispensar origem oficial, permissão e validação.

A retirada dos snapshots não elimina as perguntas sobre **formação e diplomados paulistas**. Concluintes anuais são fluxos de cursos, não estoque de pessoas diplomadas distintas. O ETL INEP previsto alimenta formação por edição; estoque de diplomados precisa de fonte/conceito próprios. Não acumular concluintes nem usar uma referência nacional como estimativa de São Paulo.

## Evidência e limitações dos dados demonstrativos

O cenário `dataset.ts` contém 3.000 empresas, 3.600 estabelecimentos, 4.500 registros e 600 profissionais fictícios com semente fixa, além de fatos e pontes relacionados. `institutional.ts` conserva a ficção legada de inscrição, presença, orçamento, capacidade e solicitação; ela não compõe a visão executiva V8. Nenhum conjunto sustenta alegação sobre intenção, favorecimento ou desempenho de uma gestão.

As seis perguntas executivas usam registro/evento, empresa ativa/vínculo RT, profissional ativo/autoria expressa, ART/autor mensal, pagamento PJ/saldo e emprego agregado/território. A autoria tem cobertura parcial: o percentual de documentos com identificação é fonte de qualidade, não estimativa de emprego. Emprego agregado não é ligado a pessoa ou CNPJ.

A fonte de cada indicador deve registrar view/endpoint, `SourceSystem`, chave, grão, lote, competência, cobertura, fórmula, unidade, limites, dono e validador. Metadado de autoria, unidade no organograma e data de build não substituem homologação. [MODELO_DADOS.md](MODELO_DADOS.md) documenta relações e [POWER_BI.md](POWER_BI.md) documenta consumo e segurança.

As referências de apresentação continuam em [REFERENCIAS_DRIVE_V5.md](REFERENCIAS_DRIVE_V5.md) e [REFERENCIAS_VISUAIS_V5.md](REFERENCIAS_VISUAIS_V5.md). Nenhum valor dos seus painéis é incorporado como fato.

## Anexos V8: campos disponíveis e regras, sem carga de valores

Os dois PDFs `Microsoft Power BI.PDF` e `Microsoft Power BI(1).PDF` e os cinco JPGs `79967`–`79971` são **evidência de campos, conceitos e recortes existentes**. O inventário [available-fields-v8.json](../src/domain/available-fields-v8.json) descreve **128 contratos de campos**, com proveniência. [ANALISE_DOCUMENTOS_V8.md](ANALISE_DOCUMENTOS_V8.md) conserva a leitura documental. Contagens de protocolos, ARTs, ativos, pagamentos e metas nos prints não foram promovidas a medidas correntes.

A planilha `PL 2260 2023_PL 0926 2025_ANUAL_Relação Dados e Indicadores Resultados Sistema - AJUSTE INDICADOR 53 (2).xlsx` é um **catálogo de definições**. [confea-catalog-v8.json](../src/domain/confea-catalog-v8.json) preserva proveniência, fórmulas e dependências; [confea-ui-v8.json](../src/domain/confea-ui-v8.json) contém os metadados compactos para a UI. O catálogo completo é referência de implementação, não feed numérico. Há 186 dados CREA, com 37-C retirado e 185 regras ativas; 53 indicadores de origem, dos quais 42 são CREA, dois dependem do Confea e nove são exclusivamente federais. A página regional mostra 44 indicadores, todos sem valor atual conectado.

O indicador 53 usa **CREA#183 / CREA#182**: orçamento aprovado de fiscalização / orçamento aprovado total, formatado em %. Não confundir com gasto realizado ou crescimento real acima da inflação. O indicador 35 possui incompatibilidade de fórmula preservada como ressalva; não recebe cálculo silencioso.

## Bases normativas de transparência verificadas

[transparency-rules-v8.json](../src/domain/transparency-rules-v8.json) contém fontes oficiais, trechos, alcance regional/federal, prazos e restrições. A revisão completa está em [TRANSPARENCIA_NORMAS_V8.md](TRANSPARENCIA_NORMAS_V8.md).

- [DN-TCU nº 216/2025](https://pesquisa.apps.tcu.gov.br/redireciona/norma/NORMA-36629): oito grupos de resultados no capítulo federal, com tabela por regional; RG CREA até 31/3; quadros abertos e disponibilidade mínima de cinco anos.
- [PL-2260/2023](https://normativos.confea.org.br/Ementas/Visualizar?id=77963) e [PL-0926/2025](https://normativos.confea.org.br/Ementas/Visualizar?id=81129): prestação de contas e dados regionais, definição de captura/sincronização, BI e envio até implantação de captura por API. Processo anual ao Confea até 1º/4 é distinto de publicação em 31/3.
- [Portaria Segecex nº 10/2025](https://pesquisa.apps.tcu.gov.br/redireciona/norma/NORMA-39548): API padronizada é inicialmente exigida **apenas dos federais**, pelo art. 7º; não anunciar estes endpoints como obrigação já implantada do CREA-SP.
- [IN-TCU nº 84/2020](https://pesquisa.apps.tcu.gov.br/redireciona/norma/NORMA-21437), [DN nº 198/2022](https://pesquisa.apps.tcu.gov.br/redireciona/norma/NORMA-21705) e [LAI](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm): transparência, competências, atualização, prestação de contas e proteção de dados pessoais.

Uma referência “DN-TCU” na planilha não comprova exigência pública textual individual de cada fórmula. Normas não fornecem os números do relatório. A página Transparência permanece **prévia privada**, sem mudança de audiência. Dados publicáveis posteriores exigem artefato separado e homologação institucional; dívida particular e sinais nominais de fiscalização não são gastos públicos do conselho.
