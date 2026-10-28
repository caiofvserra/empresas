# Catálogo da planilha Confea — V8

A planilha enviada pelo usuário foi importada como **catálogo de regras, definições e evidências do arquivo**, não como fonte de números atualizados. O painel deve calcular as medidas a partir de SQL Server e DB2 via gateway ou de API oficial homologada. Nenhum número preenchido ou resultado em cache do XLSX recebe o status de dado ativo.

## Identificação e rastreabilidade

- Arquivo apresentado: `PL 2260 2023_PL 0926 2025_ANUAL_Relação Dados e Indicadores Resultados Sistema - AJUSTE INDICADOR 53 (2).xlsx`.
- Tamanho: 525.198 bytes.
- SHA-256: `6b1a27334e33467680397dcbc71bb9bf612739027cccc6c16573acb3e5ec60ae`.
- Regras normalizadas: [src/domain/confea-catalog-v8.json](../src/domain/confea-catalog-v8.json).
- Projeção para a interface: [src/domain/confea-ui-v8.json](../src/domain/confea-ui-v8.json), sem células brutas ou números históricos.
- Importador reproduzível: [scripts/import-confea-indicators.py](../scripts/import-confea-indicators.py).
- Dependência de importação: Python + `openpyxl`, sem alteração do arquivo recebido.

```sh
python scripts/import-confea-indicators.py --source /caminho/planilha.xlsx
```

A importação conserva as quatro abas, todas as 3.887 células preenchidas, 96 fórmulas, resultados em cache, endereços, formatos numéricos, destaques de cor, texto tachado, proteção, filtros, visibilidade e intervalos mesclados. O tema original também é preservado. Valores de fórmulas não são recalculados pelo importador. Somente as expressões simples de sequência de código `=A(linha anterior)+1` são resolvidas para identificar os indicadores 36 a 44; a expressão original permanece disponível.

| Aba | Conteúdo importado | Uso |
|---|---:|---|
| INSTRUÇÃO | 32 células preenchidas | Recortes, preenchimento, anual/mensal, tratamento de ausência |
| Dados - Crea | 186 métricas: códigos 1–183 e 37-A/37-B/37-C | Regras para apuração do CREA-SP |
| Dados - Confea | 95 métricas | Dependências de competência nacional/terceira instância |
| Indicadores RG | 53 indicadores | Fórmulas, objetivo, unidade, responsabilidade e exigências indicadas no arquivo |

São 42 indicadores de responsabilidade CREA, nove exclusivamente Confea e dois mistos. Um indicador nacional ou misto não pode ser calculado apenas com a parcela paulista, nem exibido como total do CREA-SP. A presença da fórmula no catálogo não demonstra que o dado necessário já está conectado.

## Periodicidade e ausência de informação

`INSTRUÇÃO!C4` exige consolidação anual das métricas existentes apresentada ao Confea em **1º de abril de cada exercício**. `C6` menciona a primeira apresentação das novas métricas em **01/04/2026**. `C7` informa que as linhas destacadas em amarelo/verde são o consolidado anual de métricas coletadas mensalmente e exige reconciliação do mensal com o anual. Essas regras de reporte não determinam automaticamente a frequência técnica de atualização do gateway.

`INSTRUÇÃO!C17` orienta deixar **vazio**, sem preencher zero, quando a métrica não é conhecida. Por isso todas as entradas normalizadas têm `numericValue: null`. Métricas ativas não conectadas têm `sourceConnectionRequired: true` e `status: source_connection_required`. A regra excluída 37-C mantém `status: retired`. Nenhum valor histórico preenchido migra para esse campo.

Indicadores percentuais usam, nas fórmulas Excel, a razão decimal e o formato percentual da célula. Não multiplicar duas vezes por 100 ao migrar para DAX. Na aba de métricas, “Número Inteiro” e “Número com decimal” são **formatos de preenchimento**, não uma definição suficiente da unidade de contagem; verificar conceito, orientação e grão antes de mapear a view.

## Exigência de reporte e publicação

Na planilha, **140 métricas CREA** estão marcadas “Obrigatória” na coluna M, “Apresentação no Relatório de Gestão”; **69 métricas CREA** possuem categoria na coluna N, “Dados definidos DN-TCU 216/2025”. Todos os 53 indicadores possuem “Obrigatória” nas colunas I e J, respectivamente “Apresentação nos respectivos Relatórios de Gestão” e “Apresentação no Caderno de Resultados do Sistema”. O arquivo cita PL-2260/2023, PL-0926/2025, Acórdão 1925/2019 e DN-TCU 216/2025.

Essas marcas são evidência explícita **do que a planilha exige reportar**, não uma declaração autônoma de que todo microdado possa ser publicado. O catálogo registra `legalPublicationIndependentlyVerified: false`: a verificação jurídica dos atos oficiais está documentada separadamente. Também registra `containsPermissionToPublishPersonalData: false`. Uma futura página de transparência precisa usar medidas agregadas homologadas, competência fechada, origem, fórmula e data de atualização; sem nomes, CNPJs individualizados com débitos, dados pessoais ou campos protegidos.

Separar três decisões:

1. **Reporte Confea:** reproduzir definição e fórmula da planilha homologada, com suas dependências completas.
2. **Transparência:** expor apenas agregados com fundamento confirmado e política de publicação aprovada; uma obrigação de Relatório de Gestão não implica publicar o banco operacional.
3. **BI de decisão:** selecionar medidas capazes de responder uma pergunta de gestão, sem transformar a lista normativa em dezenas de cartões.

## Ajuste do indicador 53

| Evidência exata | Conteúdo e implicação |
|---|---|
| Indicadores RG!C57 | “Taxa orçamentária disponibilizada para o custeio e investimento na fiscalização” |
| Indicadores RG!G57 | `='Dados - Crea'!J190/'Dados - Crea'!J189` |
| Dados - Crea!A190 / E190 | Código **183 (novo)**: orçamento CREA aprovado destinado ao Subprograma Fiscalização |
| Dados - Crea!A189 / E189 | Código **182 (novo)**: orçamento CREA aprovado para o exercício |
| Indicadores RG!M57 | “Fórmula ajustada com os dados 189 e 190 (novo)” |
| Indicadores RG!L57 | Meta de aumentar em 10%, acima da inflação, o valor disponibilizado até dezembro de 2027 |

A fórmula ajustada mede a **participação do orçamento aprovado destinada à fiscalização no exercício**. Os números 189/190 da nota são endereços de linha; os códigos das métricas são 182/183. O numerador não é despesa executada. O denominador não é receita arrecadada. A fórmula isolada não mede crescimento real acima da inflação nem comprova atingimento da meta descrita na observação. Essa avaliação requer orçamento do período-base, série comparável e deflator homologado, em uma medida separada.

## Divergências preservadas para homologação

| Ocorrência | Evidência | Tratamento |
|---|---|---|
| Indicador 35: denominadores diferentes | Indicadores RG!E39 usa multas não pagas do exercício anterior; G39 divide por J156, o exercício atual | Conservar texto e fórmula. Homologar antes de calcular; sem correção silenciosa |
| Faixa de novas métricas incompleta na instrução | INSTRUÇÃO!C6 menciona 162–182; Dados - Crea!A190 inclui 183 | Importar também 183 e registrar diferença |
| 37-C excluída | Dados - Crea!A44 e P44 | Manter somente para auditoria; não somar ao universo fiscalizado |
| Observação do indicador 44 aponta aba diferente | Indicadores RG!G48 referencia Dados - Confea!J71; L48 menciona Dados-Crea | Usar dependência efetiva apenas após homologação; registrar a redação conflitante |
| Competência de números preenchidos não homologada | Células da coluna J e resultados em cache | Evidência histórica isolada, nunca uma atualização automática |

## Indicadores úteis e lugar adequado no BI

| Grupo | Indicadores | Pergunta que respondem | Limite de interpretação |
|---|---|---|---|
| Universo cadastral | 1, 2 | A base ativa mudou entre encerramentos de exercício? | Estoque ativo, fluxo de novos registros e quantidade de pessoas/estabelecimentos são medidas diferentes |
| Vínculos técnicos | 3 | Quantos profissionais compõem QT/RT por empresa? | Média não informa quantas empresas estão sem RT; requer medida de cobertura adicional |
| Atividade formal/acervo | 4–7 | Qual parcela registrou ART e qual foi a concentração documental/acervo? | ART não mede emprego/renda; CAT é do profissional e CAO da pessoa jurídica |
| Regularidade financeira | 8–10, 35 | Quem está em débito e como evolui o estoque de obrigações não pagas? | Pessoas inadimplentes não equivalem ao número de anuidades/multas; indicador35 pendente de homologação |
| Fiscalização e julgamento normativos | 11–48 | Quais os resultados/requisitos da prestação de contas? | Alocar na transparência/reporte. Não usar para avaliar uma fila operacional de fiscalização digital |
| Prazo de registro/acervo | 49 | Quanto do universo anual julgado está dentro de 30 dias? | Respeitar universo PF/PJ/CAT/CAO; não comparar prazo inventado de protocolo com esta fórmula |
| Universos externos fiscalizáveis | 50–52 | Qual a cobertura documentada de saneamento, Conab e usinas ANEEL >5000kW? | Confirmar recorte SP, identificador, competência, atividade/atribuição e registro de visita/ação; sem inferência automática de infração |
| Destinação orçamentária | 53 | Qual parcela do orçamento aprovado foi destinada à fiscalização? | Não mede execução, produtividade ou aumento real acima da inflação |

A fiscalização **digital** prioritária não se resume aos indicadores de produção existentes. Deve ligar CNPJ/CNAE, fornecedores e objetos PNCP, contratos/obras e ART, quadro técnico/RT e divergências cadastrais com evidência por entidade e competência. CAGED/RAIS são agregados de emprego por município/CNAE/CBO; usados como contexto territorial de oportunidade, não como prova de vínculo ou infração por CNPJ. O catálogo classifica os indicadores normativos de produção/julgamento como `accountability_only` para preservar esse foco.

## Contrato de integração automática

Não há esquema real ou credenciais de SQL Server/DB2 neste arquivo. `sourceRoute.physicalMappingStatus: requires_schema_homologation` não é uma conexão concluída. Para cada métrica:

1. Identificar o domínio, a view física e sua chave/grão, conservando `temporalCut`, `definition` e `orientation` do catálogo.
2. Mapear código e competência do fechamento anual/mensal para valores obtidos por SQL Server/DB2 via gateway. Universos externos dependem de base/API oficial e recorte São Paulo comprovados.
3. Versionar o mapeamento, responsável pela validação, fórmula homologada e divergências. O “Responsável” da planilha é CREA/Confea, não uma superintendência automaticamente designada.
4. Reconciliar métricas de estoque em 31/12 com movimentos e distinguir registro, visto, pessoa distinta, ART inicial/todas ARTs, CAT/CAO, processo e decisão/instância.
5. Executar integridade referencial, ausência de duplicidade indevida, nulos, unicidade da competência, denominador zero e numerador compatível com o denominador antes de publicar.
6. Alimentar uma camada semântica aprovada; atualizar via gateway/agendamento e guardar histórico de carga/competência. Ausência de conexão deve ser visível, sem substituição por números da planilha.

O catálogo inclui todas as dependências por endereço, código e rótulo. Uma fórmula com dependência não disponível permanece nula. Para medidas 46 e 48, isso inclui dependências nacionais; não preencher o restante com zero.

## Verificação da importação

O importador valida 281 IDs de métricas únicos, sequência completa 1–53 dos indicadores, todas as referências diretas das fórmulas resolvidas e a fórmula ajustada do indicador53 com códigos183/182. A verificação executada compara as 3.887 células preenchidas com o XLSX e confirma que todas as 334 entradas normalizadas têm valor ativo nulo. A importação gera o catálogo integral, a projeção de interface e `confea-summary-v8.json`, resumo separado para não antecipar o carregamento do catálogo na página executiva. A reexecução reproduz os três arquivos.

| Verificação executada | Resultado |
|---|---|
| Células originais preservadas exatamente | 3.887 / 3.887 |
| Fórmulas preservadas | 96 |
| Identificadores de métricas únicos | 281 / 281 |
| Sequência de indicadores completa | 1–53 |
| Dependências diretas de fórmulas resolvidas | Todas |
| Números históricos na projeção de interface | Nenhum |
| Valores numéricos ativos | 0 |
| Reexecução determinística | Hash igual para os três JSONs |
| Projeção de interface | 519.925 bytes; SHA-256 `8e5f4386e487579d9adeeb6230731f5a3af5501e11473e039534693968884fa3` |

As evidências completas ficam em `workbookEvidence`. Para a interface, usar `confea-ui-v8.json`: 186 métricas CREA e todos os 53 indicadores, endereços de evidência, instruções e ressalvas; nenhuma chave `workbookEvidence` ou `cachedValue`. Não embutir valores históricos do catálogo integral em gráficos nem apresentá-los como dados conectados.
