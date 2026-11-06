# Pesquisa: gerar projetos PBIP (TMDL + PBIR) a partir de TypeScript

Data da pesquisa: 2026-11-06. Escopo: o que um gerador Node/TypeScript (sem Windows e sem Power BI Desktop para testar) precisa emitir para que o Power BI Desktop abra, por painel, um projeto PBIP com modelo semântico em TMDL (tabelas carregando CSV via Power Query), medidas DAX, tema JSON e páginas de relatório em PBIR.

Fontes usadas: só fontes primárias da Microsoft. São elas: a documentação em learn.microsoft.com, os JSON Schemas oficiais em `github.com/microsoft/json-schemas` e `github.com/microsoft/powerbi-desktop-samples`, e os repositórios de código aberto da própria Microsoft (`microsoft/fabric-cicd`, `microsoft/semantic-link-labs`). Esses repositórios servem de exemplo de arquivo real gerado pelo Desktop. Quando uma afirmação vem só de um repositório de código e não da documentação, isso está dito. Itens marcados **[NÃO CONFIRMADO]** não foram encontrados em fonte primária.

## Resumo

1. PBIP e PBIR são **GA**. PBIR é o formato padrão de relatório desde 2026, e nenhuma opção de preview é necessária para abrir um projeto PBIR. Fonte: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-external-editing e https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-report
2. Os arquivos mínimos são estes:
   - `<Nome>.Report/definition.pbir`
   - `<Nome>.Report/definition/` com `version.json`, `report.json` e `pages/<pagina>/page.json`
   - `<Nome>.SemanticModel/definition.pbism`
   - `<Nome>.SemanticModel/definition/` com `database.tmdl`, `model.tmdl` e `tables/*.tmdl`

   O `.pbip`, o `.platform`, o `diagramLayout.json`, o `pages.json` e a pasta `visuals/` são opcionais.
3. Versões atuais dos schemas:

   | Arquivo | Schema |
   |---|---|
   | `definition.pbir` | `definitionProperties/2.0.0` (`version` "4.0") |
   | `definition.pbism` | `definitionProperties/1.0.0` (`version` "4.0" ou maior) |
   | `.pbip` | `pbipProperties/1.0.0` |
   | `.platform` | `platformProperties/2.1.0` |
   | `report.json` | `report/3.3.0` |
   | `page.json` | `page/2.1.0` |
   | `pages.json` | `pagesMetadata/1.1.0` |
   | `visual.json` | `visualContainer/2.13.0` |
   | `version.json` | `versionMetadata/1.0.0` |

   O tema mais recente é `reportThemeSchema-2.159.json` (out/2026).
4. Os arquivos devem ser **UTF-8 sem BOM**. O Desktop grava com fim de linha CRLF. O TMDL usa indentação por TAB, e a indentação errada gera erro de parsing.
5. O `lineageTag` **não é obrigatório**. Se for usado, precisa ser único no escopo, e qualquer string serve. Recomenda-se GUID determinístico.
6. Sem `cache.abf`, o Desktop abre o modelo completo **sem dados**. O usuário precisa clicar em Atualizar.
7. Os nomes dos *data roles* dos visuais (`Category`, `Y`, `Values` etc.) **não são documentados oficialmente**. Só estão confirmados por exemplos da Microsoft para `barChart`, `clusteredColumnChart`, `tableEx`, `slicer`, `pivotTable` e `multiRowCard`. Para os outros visuais (card, donut, treemap, linha, shape map), veja a seção 3.6.
8. O Shape Map virou GA em junho/2026. O `visualType` é `shapeMap`. A estrutura exata do mapa TopoJSON customizado dentro do `visual.json` está **[NÃO CONFIRMADA]**.

---

## 1. Layout de pastas PBIP

### 1.1 Estrutura

```text
Empresas/
├── Empresas.pbip                      (opcional: atalho)
├── .gitignore                         (opcional)
├── Empresas.Report/
│   ├── definition.pbir                (obrigatório)
│   ├── .platform                      (opcional; só para Fabric Git)
│   ├── StaticResources/
│   │   ├── SharedResources/BaseThemes/<tema-base>.json   (ver 3.7)
│   │   └── RegisteredResources/<tema>.json, <imagens>    (opcional)
│   └── definition/                    (obrigatório em PBIR)
│       ├── version.json               (obrigatório)
│       ├── report.json                (obrigatório)
│       └── pages/
│           ├── pages.json             (opcional)
│           └── <pagina>/
│               ├── page.json          (obrigatório)
│               └── visuals/<visual>/visual.json   (opcional)
└── Empresas.SemanticModel/
    ├── definition.pbism               (obrigatório)
    ├── .platform                      (opcional)
    ├── diagramLayout.json             (opcional; não editável externamente)
    └── definition/                    (obrigatório em TMDL)
        ├── database.tmdl
        ├── model.tmdl
        ├── expressions.tmdl
        ├── relationships.tmdl
        ├── tables/<Tabela>.tmdl
        ├── roles/<Role>.tmdl
        └── cultures/<cultura>.tmdl
```

A obrigatoriedade de cada item vem destas fontes:

- **Relatório.** O `definition.pbir` é obrigatório. O `report.json` na raiz do relatório só é obrigatório no formato PBIR-Legacy. A pasta `definition\` é obrigatória no formato PBIR. Os demais itens são opcionais. Fonte: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-report
- **Pasta `definition/` do PBIR.**
  - Obrigatórios: `pages\`, uma pasta por página, `page.json`, `version.json`, `report.json` e o `visual.json` de cada visual que existir.
  - Opcionais: `visuals\`, `pages.json`, `bookmarks\` e `reportExtensions.json`.

  Fonte: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-report
- **Modelo semântico.** O `definition.pbism` é sempre obrigatório. A pasta `definition\` é obrigatória em TMDL, e o `model.bim` é obrigatório em TMSL. Fonte: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-dataset
- **Exclusividade de formato.** TMDL (`definition/`) e TMSL (`model.bim`) são mutuamente exclusivos. O `diagramLayout.json` tem `Required: false`, e TMDL é o formato padrão. Fonte: https://learn.microsoft.com/en-us/rest/api/fabric/articles/item-management/definitions/semantic-model-definition
- **Relatório: exclusividade e StaticResources.** PBIR (`definition/`) e PBIR-Legacy (`report.json`) também são mutuamente exclusivos. `StaticResources/` e `semanticModelDiagramLayout.json` são opcionais. Fonte: https://learn.microsoft.com/en-us/rest/api/fabric/articles/item-management/definitions/report-definition
- **O `.pbip` é opcional.** É só um atalho, e o projeto também abre pelo `definition.pbir`. Fonte: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-overview (FAQ). O schema também diz: "This file is optional". Fonte: https://github.com/microsoft/json-schemas/blob/main/fabric/pbip/pbipProperties/1.0.0/schema.json
- **Arquivos de schema não documentado.** A edição externa não é suportada nestes arquivos, então o gerador **não deve emiti-los**:
  - no relatório: `report.json` (Legacy), `mobileState.json` e `semanticModelDiagramLayout.json`;
  - no modelo: `diagramLayout.json`.

  Fonte: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-overview
- **Nome das pastas.** O padrão é `{display name}.{public facing type}`, por exemplo `Empresas.SemanticModel` e `Empresas.Report`. Fonte: https://learn.microsoft.com/en-us/fabric/cicd/git-integration/source-code-format
- **`.gitignore` padrão.** Fonte: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-overview

```text
**/.pbi/localSettings.json
**/.pbi/cache.abf
```

### 1.2 `Empresas.pbip`

O schema exige `$schema`, `version` e `artifacts[].report.path`. O path é relativo e usa `/` como separador. Fonte: https://github.com/microsoft/json-schemas/blob/main/fabric/pbip/pbipProperties/1.0.0/schema.json

Nenhuma página do Learn traz um exemplo completo deste arquivo. O exemplo abaixo foi montado a partir do schema. O valor `"1.0"` de `version` está **[NÃO CONFIRMADO]**, porque o schema só diz "string".

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json",
  "version": "1.0",
  "artifacts": [
    { "report": { "path": "Empresas.Report" } }
  ],
  "settings": { "enableAutoRecovery": true }
}
```

### 1.3 `Empresas.Report/definition.pbir`

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definitionProperties/2.0.0/schema.json",
  "version": "4.0",
  "datasetReference": {
    "byPath": { "path": "../Empresas.SemanticModel" }
  }
}
```

- O `byPath` é relativo e usa `/`. Caminho absoluto não é suportado. Com `version` 4.0 ou maior, o relatório pode ser PBIR (pasta `definition\`). Com 1.0, só PBIR-Legacy é aceito. Fonte: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-report
- O schema 2.0.0 exige `$schema`, `version` e `datasetReference`. Fonte: https://github.com/microsoft/json-schemas/blob/main/fabric/item/report/definitionProperties/2.0.0/schema.json
- Não existe versão 2.1.0 nem 3.0.0 do `definitionProperties` de relatório no repositório (verificado em 2026-11-06).
- Na prévia de recarga externa, o Desktop não aceita edição externa do `definition.pbir`. O gerador deve escrevê-lo uma vez e não alterá-lo com o projeto aberto. Fonte: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-external-editing

### 1.4 `Empresas.SemanticModel/definition.pbism`

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/semanticModel/definitionProperties/1.0.0/schema.json",
  "version": "4.0",
  "settings": {}
}
```

- Com `version` 1.0, o modelo tem de estar em `model.bim` (TMSL). Com "4.0 or above", TMDL é permitido. Fonte: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-dataset
- A documentação de definição do Fabric usa `"version": "5.0"` e `"settings": { "qnaEnabled": false }`. Fonte: https://learn.microsoft.com/en-us/rest/api/fabric/articles/item-management/definitions/semantic-model-definition
- O schema exige `$schema` e `version`. Fonte: https://github.com/microsoft/json-schemas/blob/main/fabric/item/semanticModel/definitionProperties/1.0.0/schema.json
- Um exemplo real da Microsoft usa `"version": "4.0"` sem `$schema`. Fonte: https://github.com/microsoft/fabric-cicd/blob/main/sample/workspace/ABC.SemanticModel/definition.pbism

### 1.5 `.platform` (opcional)

Só a integração Git do Fabric usa este arquivo. O `logicalId` é um GUID único por item no workspace. Se o gerador copiar um item, precisa trocar o `logicalId`. Fonte: https://learn.microsoft.com/en-us/fabric/cicd/git-integration/source-code-format

O schema 2.1.0 só acrescenta `sensitivityLabelId`. Fontes: https://github.com/microsoft/json-schemas/blob/main/fabric/gitIntegration/platformProperties/2.1.0/schema.json e https://github.com/microsoft/fabric-cicd/blob/main/sample/workspace/ABC.Report/.platform

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json",
  "metadata": { "type": "Report", "displayName": "Empresas" },
  "config": { "version": "2.0", "logicalId": "40db346f-1c24-8aa6-48c7-a3aec4199351" }
}
```

O `type` é `SemanticModel` na pasta do modelo e `Report` na pasta do relatório.

---

## 2. TMDL

### 2.1 Regras de sintaxe

Todas as regras desta subseção vêm de https://learn.microsoft.com/en-us/analysis-services/tmdl/tmdl-overview.

- **Organização dos arquivos.**
  - Arquivos de raiz: `database`, `model`, `relationships`, `expressions`, `datasources` e `functions`.
  - Pastas com um arquivo por objeto: `tables/`, `roles/`, `cultures/` e `perspectives/`.
  - Colunas, medidas e partições ficam dentro do arquivo da tabela.
- **Indentação.** Use um TAB por nível. São três níveis: declaração, propriedades e expressão multilinha. Os filhos diretos de `model` (table, expression, role, relationship...) ficam sem indentação. A citação literal: "Not following these indention rules generates a parsing error".
- **Expressões multilinha.** Ficam um nível mais fundo que as propriedades do objeto pai. Linhas em branco à direita são removidas. Para preservar o texto literal, delimite com três crases (```` ``` ````) logo após o `=`.
- **Nomes com caracteres especiais.** Nomes com `.`, `=`, `:`, `'` ou espaço vão entre aspas simples, e uma aspa simples interna vira `''`.
- **Formas abreviadas.** Uma propriedade booleana pode aparecer só pelo nome (ex.: `isHidden`). O `/// texto` vira a descrição do objeto. O `ref table X` define a ordem das tabelas.
- **Caixa.** A escrita usa camelCase, e a leitura não diferencia maiúsculas de minúsculas.
- **Ordem do `ref`.** Um objeto citado por `ref` sem arquivo correspondente é ignorado. Um arquivo que existe sem `ref` é anexado ao fim da coleção. Por isso o `model.tmdl` não precisa listar as tabelas, mas listá-las fixa a ordem.

Os valores de enum aparecem em camelCase no TMDL (por exemplo, `dataType: int64`, `summarizeBy: none`), segundo a regra de casing acima:

- **`dataType`:** `string`, `int64`, `double`, `dateTime`, `decimal`, `boolean`, `binary`. Fonte: https://learn.microsoft.com/en-us/dotnet/api/microsoft.analysisservices.tabular.datatype
- **`summarizeBy`:** `default`, `none`, `sum`, `min`, `max`, `count`, `average`, `distinctCount`. Fonte: https://learn.microsoft.com/en-us/dotnet/api/microsoft.analysisservices.tabular.aggregatefunction
- **`crossFilteringBehavior`:** `oneDirection`, `bothDirections`, `automatic`. Fontes: https://learn.microsoft.com/en-us/dotnet/api/microsoft.analysisservices.tabular.crossfilteringbehavior e https://learn.microsoft.com/en-us/analysis-services/tmsl/relationships-object-tmsl
- **`fromCardinality` / `toCardinality`:** `none`, `one`, `many`. Fonte: https://learn.microsoft.com/en-us/analysis-services/tmsl/relationships-object-tmsl. Os valores padrão não são informados na página.

### 2.2 `database.tmdl`

```tmdl
database
	compatibilityLevel: 1567
```

Fontes:

- O exemplo da documentação TMDL usa `compatibilityLevel: 1567`. Fonte: https://learn.microsoft.com/en-us/analysis-services/tmdl/tmdl-overview
- O exemplo real do `fabric-cicd` usa `database` sem nome e `1550`. Fonte: https://github.com/microsoft/fabric-cicd/blob/main/sample/workspace/ABC.SemanticModel/definition/database.tmdl
- O TMSL de exemplo do Fabric usa `1702`. Fonte: https://learn.microsoft.com/en-us/rest/api/fabric/articles/item-management/definitions/semantic-model-definition
- A página oficial de níveis só lista 1700, 1600 e 1500 como suportados pelo Power BI Premium. Fonte: https://learn.microsoft.com/en-us/analysis-services/tabular-models/compatibility-level-for-tabular-models-in-analysis-services

**[NÃO CONFIRMADO]** Qual é o nível mínimo e o recomendado para o Desktop de 2026. A sugestão é 1567, o valor usado pela documentação TMDL. O Desktop pode elevar o nível ao salvar.

### 2.3 `model.tmdl`

```tmdl
model Model
	culture: pt-BR
	defaultPowerBIDataSourceVersion: powerBI_V3
	sourceQueryCulture: pt-BR
	dataAccessOptions
		legacyRedirects
		returnErrorValuesAsNull

annotation __PBI_TimeIntelligenceEnabled = 0

ref table Empresas
ref table Municipios
```

Fontes:

- A estrutura é a mesma do exemplo real, que usa `culture: en-US`, `__PBI_TimeIntelligenceEnabled = 1`, `ref table` e `ref cultureInfo en-US`. Fonte: https://github.com/microsoft/fabric-cicd/blob/main/sample/workspace/ABC.SemanticModel/definition/model.tmdl
- O `culture` e o `sourceQueryCulture` aparecem no TMSL de exemplo. Fonte: https://learn.microsoft.com/en-us/rest/api/fabric/articles/item-management/definitions/semantic-model-definition
- Datas: se o *Auto date/time* estiver ligado e o gerador criar colunas datetime fora do Desktop, a tabela local de datas não é gerada. Fonte: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-overview

**[NÃO CONFIRMADO]** Que `__PBI_TimeIntelligenceEnabled = 0` desliga o Auto date/time. O nome da anotação vem só do exemplo real.

### 2.4 Cultura pt-BR (`cultures/pt-BR.tmdl`, opcional)

Formato copiado do arquivo `en-US.tmdl` real, trocando o idioma. Fonte: https://github.com/microsoft/fabric-cicd/blob/main/sample/workspace/ABC.SemanticModel/definition/cultures/en-US.tmdl

```tmdl
cultureInfo pt-BR

	linguisticMetadata =
			{
			  "Version": "1.0.0",
			  "Language": "pt-BR"
			}
		contentType: json
```

**[NÃO CONFIRMADO]** Que a pasta `cultures/` possa faltar sem efeito colateral. A regra de `ref` sugere que sim, e a sugestão é omiti-la e definir só `culture: pt-BR` no `model.tmdl`.

### 2.5 Parâmetro de pasta (`expressions.tmdl`)

Sintaxe oficial do parâmetro. Fonte: https://learn.microsoft.com/en-us/analysis-services/tmdl/tmdl-overview

```tmdl
expression Server = "localhost" meta [IsParameterQuery=true, Type="Text", IsParameterQueryRequired=true]
```

Adaptado para a pasta dos CSVs:

```tmdl
expression PastaDados = "C:\CREA-SP\dados\empresas\" meta [IsParameterQuery=true, Type="Text", IsParameterQueryRequired=true]
	lineageTag: 7d1b2c3e-0000-4000-8000-000000000001
```

O `lineageTag` é opcional (ver 2.10). Um M de string não escapa `\`. As aspas duplas internas viram `""`.

**[NÃO CONFIRMADO]** Que o Desktop exija as anotações `PBI_ResultType = Text` ou `PBI_NavigationStepName` nas expressões. Elas aparecem em arquivos gerados pelo Desktop, mas nenhuma documentação as exige.

### 2.6 Tabela com colunas, medidas e partição M (`tables/Empresas.tmdl`)

O exemplo segue o formato serializado pelo Desktop:

- partição a 1 TAB;
- `source =` a 2 TABs;
- corpo do M a 4 TABs.

Fonte: https://github.com/microsoft/fabric-cicd/blob/main/sample/workspace/ABC.SemanticModel/definition/tables/Table.tmdl

As medidas multilinha seguem a documentação: declaração a 1 TAB, expressão a 3 TABs e propriedades (`formatString`) a 2 TABs. Fontes: https://learn.microsoft.com/en-us/analysis-services/tmdl/tmdl-overview e https://learn.microsoft.com/en-us/rest/api/fabric/articles/item-management/definitions/semantic-model-definition

```tmdl
/// Cadastro de empresas registradas no CREA-SP
table Empresas
	lineageTag: 3f0c1a52-0000-4000-8000-000000000010

	measure 'Total de Empresas' = COUNTROWS('Empresas')
		formatString: #,##0
		lineageTag: 3f0c1a52-0000-4000-8000-000000000011

	measure '% Ativas' =
			DIVIDE(
				CALCULATE(COUNTROWS('Empresas'), 'Empresas'[situacao] = "Ativa"),
				COUNTROWS('Empresas')
			)
		formatString: 0.0%
		displayFolder: Indicadores
		lineageTag: 3f0c1a52-0000-4000-8000-000000000012

	column cnpj
		dataType: string
		isKey
		summarizeBy: none
		sourceColumn: cnpj
		lineageTag: 3f0c1a52-0000-4000-8000-000000000013

	column situacao
		dataType: string
		summarizeBy: none
		sourceColumn: situacao
		lineageTag: 3f0c1a52-0000-4000-8000-000000000014

	column cod_ibge
		dataType: int64
		formatString: 0
		summarizeBy: none
		sourceColumn: cod_ibge
		lineageTag: 3f0c1a52-0000-4000-8000-000000000015

	column capital_social
		dataType: double
		formatString: #,##0.00
		summarizeBy: sum
		sourceColumn: capital_social
		lineageTag: 3f0c1a52-0000-4000-8000-000000000016

	column data_registro
		dataType: dateTime
		summarizeBy: none
		sourceColumn: data_registro
		lineageTag: 3f0c1a52-0000-4000-8000-000000000017

	partition Empresas = m
		mode: import
		source =
				let
				    Fonte = Csv.Document(File.Contents(PastaDados & "empresas.csv"), [Delimiter = ";", Encoding = 65001, QuoteStyle = QuoteStyle.Csv]),
				    Cabecalhos = Table.PromoteHeaders(Fonte, [PromoteAllScalars = true]),
				    Tipos = Table.TransformColumnTypes(Cabecalhos, {{"cnpj", type text}, {"situacao", type text}, {"cod_ibge", Int64.Type}, {"capital_social", type number}, {"data_registro", type date}}, "pt-BR")
				in
				    Tipos
```

Detalhes do M:

- **`Csv.Document`.** Aceita um record de opções com `Delimiter`, `Columns`, `Encoding` (padrão 65001 = UTF-8), `CsvStyle`, `QuoteStyle` e `ExtraValues`. O exemplo oficial promove o cabeçalho com `Table.PromoteHeaders(Csv.Document(csv))`. Fonte: https://learn.microsoft.com/en-us/powerquery-m/csv-document
- **`Table.PromoteHeaders`.** Aceita `[PromoteAllScalars = true, Culture = ...]`. Fonte: https://learn.microsoft.com/en-us/powerquery-m/table-promoteheaders
- **`Table.TransformColumnTypes`.** O 3º argumento é a cultura (ex.: `"pt-BR"`, ou o record `[Culture=..., MissingField=MissingField.UseNull]`). Isso importa para números com vírgula decimal e datas dd/mm/aaaa. Se uma coluna listada não existir, ocorre erro, a menos que se use `MissingField`. Fonte: https://learn.microsoft.com/en-us/powerquery-m/table-transformcolumntypes
- **`File.Contents`.** A assinatura é `File.Contents(path as text, optional options) as binary`. Fonte: https://learn.microsoft.com/en-us/powerquery-m/file-contents
- **Expressões com espaços em branco ambíguos.** Use o delimitador de três crases se a expressão tiver espaços finais ou linhas em branco com espaços. Fonte: https://learn.microsoft.com/en-us/analysis-services/tmdl/tmdl-overview

````tmdl
	measure Medida1 = ```
			VAR x = TODAY()
			RETURN x
			```
````

### 2.7 `relationships.tmdl`

Formato real. Fonte: https://github.com/microsoft/fabric-cicd/blob/main/sample/workspace/ABC.SemanticModel/definition/relationships.tmdl

```tmdl
relationship AutoDetected_981379f6-d1c0-48e8-a4d4-cf3718d1fc57
	crossFilteringBehavior: bothDirections
	fromCardinality: one
	fromColumn: Table.Column2
	toColumn: Table_2.Column1
```

Adaptado para o painel de empresas. O lado "from" é o lado muitos e o "to" é a dimensão, como no exemplo `fromColumn: Sales.'Product Key'` / `toColumn: Product.'Product Key'`. Fonte: https://learn.microsoft.com/en-us/analysis-services/tmdl/tmdl-overview

```tmdl
relationship 5b7e0c1d-0000-4000-8000-000000000100
	fromColumn: Empresas.cod_ibge
	toColumn: Municipios.cod_ibge
```

O nome do relacionamento pode ser um GUID. `crossFilteringBehavior` omitido assume o padrão do TOM, e esse padrão **[NÃO CONFIRMADO]** não aparece na página de referência.

### 2.8 Row-level security (`roles/<Role>.tmdl`)

Fonte: https://learn.microsoft.com/en-us/analysis-services/tmdl/tmdl-overview

```tmdl
role Role_Store1
    modelPermission: read

    tablePermission Store = 'Store'[Store Code] IN {1,10,20,30}
```

Adaptado com um filtro estático e um dinâmico:

```tmdl
role 'Regional Campinas'
	modelPermission: read

	tablePermission Empresas = 'Empresas'[regional] = "Campinas"
```

```tmdl
role 'Por usuario'
	modelPermission: read

	tablePermission Acesso = 'Acesso'[email] = USERPRINCIPALNAME()
```

Os membros de uma role não podem ser lidos nem gravados pela Fabric REST API. A atribuição é feita no serviço. Fonte: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-overview

**[NÃO CONFIRMADO]** Uma página oficial com exemplo TMDL de RLS dinâmica com `USERPRINCIPALNAME()`. O exemplo acima é uma adaptação.

### 2.9 Sem `cache.abf`

"Power BI Desktop can open a project without a cache.abf file. In that case, it opens the report connected to a model with its entire definition but without data." Fonte: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-dataset

Na prática, o usuário abre o projeto, ajusta o parâmetro `PastaDados` e clica em Atualizar.

### 2.10 `lineageTag`

- Não é obrigatório: "Power BI Desktop typically assigns a GUID for each semantic model object requiring lineage, but such assignment is not mandatory." Fonte: https://learn.microsoft.com/en-us/analysis-services/tom/lineage-tags-for-power-bi-semantic-models
- Pode ser qualquer string, mas deve ser único no escopo: duas tabelas do mesmo modelo não podem ter o mesmo valor. Fonte: a mesma página.
- Sem o tag, o Power BI usa o nome do objeto. Isso faz perder customizações quando o objeto é renomeado. Fonte: a mesma página.

**Recomendação:** gerar um GUID determinístico (UUID v5 sobre `painel/tabela/coluna`). Assim a regeneração não produz diff.

---

## 3. Formato de relatório PBIR

### 3.1 Status e configuração

- "PBIR is generally available and is the default report format." Ao salvar, um relatório PBIR-Legacy é convertido para PBIR automaticamente. Para manter PBIR-Legacy, a página recomenda usar um Desktop anterior a setembro/2026. Fonte: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-report
- "Power BI Desktop projects (PBIP) and Power BI enhanced report format (PBIR) are generally available." Só a *detecção e recarga de mudanças externas* está em preview. Essa função exige o Desktop de agosto/2026 ou posterior e a opção **File > Options and settings > Options > Preview features > "Detect and reload external PBIP changes"**. Fonte: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-external-editing
- Para **abrir** um projeto gerado, nenhuma opção de preview é necessária.

**[NÃO CONFIRMADO]** O nome da opção de preview que versões antigas do Desktop exigiam para PBIR e TMDL. Não foi encontrado em página atual.

### 3.2 Regras de nomes

Fonte de todas as regras: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-report

- Nomes de página, visual e bookmark devem conter só "word characters (letters, digits, underscores) or hyphens".
- Uma pasta fora dessa regra é **ignorada silenciosamente**, porque o Desktop a trata como arquivo privado do usuário.
- O padrão do Desktop é um identificador de 20 caracteres (ex.: `90c2e07d8e84e7d5c026`).
- O nome da pasta pode ser amigável, por exemplo `visao-geral`.

A propriedade `name` de `page.json` e de `visual.json` tem `maxLength: 50`. Fontes: https://github.com/microsoft/json-schemas/blob/main/fabric/item/report/definition/page/2.1.0/schema.json e https://github.com/microsoft/json-schemas/blob/main/fabric/item/report/definition/visualContainer/2.13.0/schema.json

### 3.3 `definition/version.json`

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/versionMetadata/1.0.0/schema.json",
  "version": "2.0.0"
}
```

O schema exige `$schema` e `version`, com o padrão `major.minor.0`. Fonte: https://github.com/microsoft/json-schemas/blob/main/fabric/item/report/definition/versionMetadata/1.0.0/schema.json

O valor `"2.0.0"` vem de um template PBIR da Microsoft. Fonte: https://github.com/microsoft/semantic-link-labs/blob/main/src/sempy_labs/report/_bpareporttemplate/definition/version.json

**[NÃO CONFIRMADO]** Na documentação do Learn, o valor exato que o Desktop de 2026 grava.

### 3.4 `definition/report.json` (mínimo, com tema customizado)

O schema `report/3.3.0` exige só `$schema` e `themeCollection`. Fonte: https://github.com/microsoft/json-schemas/blob/main/fabric/item/report/definition/report/3.3.0/schema.json

Cada tema em `themeCollection.baseTheme` e em `themeCollection.customTheme` exige três campos:

- `name`;
- `reportVersionAtImport`, que a partir da versão 3.0.0 é um objeto `{visual, report, page}`;
- `type`, que vale `SharedResources` ou `RegisteredResources`.

Fontes: o schema acima e o CHANGELOG em https://github.com/microsoft/json-schemas/blob/main/fabric/item/report/definition/report/CHANGELOG.md

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/report/3.3.0/schema.json",
  "themeCollection": {
    "baseTheme": {
      "name": "CY24SU06",
      "reportVersionAtImport": { "visual": "2.13.0", "report": "3.3.0", "page": "2.1.0" },
      "type": "SharedResources"
    },
    "customTheme": {
      "name": "CreaSP.json",
      "reportVersionAtImport": { "visual": "2.13.0", "report": "3.3.0", "page": "2.1.0" },
      "type": "RegisteredResources"
    }
  },
  "resourcePackages": [
    {
      "name": "SharedResources",
      "type": "SharedResources",
      "items": [
        { "name": "CY24SU06", "path": "BaseThemes/CY24SU06.json", "type": "BaseTheme" }
      ]
    },
    {
      "name": "RegisteredResources",
      "type": "RegisteredResources",
      "items": [
        { "name": "CreaSP.json", "path": "CreaSP.json", "type": "CustomTheme" },
        { "name": "fundo_empresas.png", "path": "fundo_empresas.png", "type": "Image" }
      ]
    }
  ],
  "settings": {
    "useStylableVisualContainerHeader": true,
    "defaultDrillFilterOtherVisuals": true,
    "useEnhancedTooltips": true
  }
}
```

Fontes do exemplo:

- **Exemplo oficial.** Traz `baseTheme` `CY25SU12` com `reportVersionAtImport` em objeto e `resourcePackages` com `SharedResources/BaseThemes/...` e `RegisteredResources` (item `Image`). Fonte: https://learn.microsoft.com/en-us/rest/api/fabric/articles/item-management/definitions/report-definition
- **Enums de tipo de item.** `Image`, `ShapeMap`, `CustomTheme`, `BaseTheme` e outros. Fonte: https://github.com/microsoft/json-schemas/blob/main/fabric/item/report/definition/report/3.3.0/schema.json
- **Tema customizado.** O arquivo fica em `StaticResources/RegisteredResources/<nome>.json`. O `customTheme` usa `name` = nome do arquivo e `type` = `RegisteredResources`. O item correspondente em `resourcePackages` tem `type` = `CustomTheme`. Essa forma vem do código Microsoft `set_theme`, não da documentação. Fonte: https://github.com/microsoft/semantic-link-labs/blob/main/src/sempy_labs/report/_reportwrapper.py
- **Registro obrigatório.** "Every resource file must have a corresponding entry in the report.json file." Os arquivos de RegisteredResources podem ser editados externamente, e o Desktop recarrega após reiniciar. Fonte: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-report

**[NÃO CONFIRMADO]** Se o arquivo do tema base (`StaticResources/SharedResources/BaseThemes/CY24SU06.json`) precisa existir no disco. Os exemplos da Microsoft o incluem: o template do semantic-link-labs traz `CY24SU06.json`, sob licença MIT. A recomendação é copiar esse arquivo para o gerador, ou gerar o projeto base uma vez num Desktop real e reaproveitar o arquivo.

**[NÃO CONFIRMADO]** Quais valores de `reportVersionAtImport` o Desktop considera válidos. O exemplo oficial usa `visual 2.5.0`, `report 3.1.0` e `page 2.3.0`.

### 3.5 `pages/pages.json` e `pages/<pagina>/page.json`

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/pagesMetadata/1.1.0/schema.json",
  "pageOrder": ["visao-geral", "municipios"],
  "activePageName": "visao-geral"
}
```

Fonte: https://github.com/microsoft/json-schemas/blob/main/fabric/item/report/definition/pagesMetadata/1.1.0/schema.json

- O schema exige só `$schema`.
- A versão 1.1.0 acrescenta `landingPageName`.
- Páginas fora de `pageOrder` são ordenadas por nome de exibição.
- Um `activePageName` inválido é erro *não bloqueante*, corrigido automaticamente. Fonte: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-report

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.1.0/schema.json",
  "name": "visao-geral",
  "displayName": "Visão geral",
  "displayOption": "FitToPage",
  "height": 720,
  "width": 1280
}
```

- O schema exige `$schema`, `name`, `displayName` e `displayOption`. `height` e `width` são obrigatórios, exceto com `DeprecatedDynamic`.
- Valores de `displayOption`: `FitToPage`, `FitToWidth` e `ActualSize`. `ActualSizeTopLeft` e `DeprecatedDynamic` estão obsoletos.

Fontes: https://github.com/microsoft/json-schemas/blob/main/fabric/item/report/definition/page/2.1.0/schema.json e o exemplo de página em https://learn.microsoft.com/en-us/rest/api/fabric/articles/item-management/definitions/report-definition

**Uma página sem visuais é válida.** A pasta `visuals\` tem "Required: No", enquanto `pages\`, a pasta da página e o `page.json` são obrigatórios. Fonte: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-report

**[NÃO CONFIRMADO]** Se um relatório com zero páginas abre. Pela tabela, pelo menos uma pasta de página é esperada.

### 3.6 `visuals/<visual>/visual.json`

O `visualContainer/2.13.0` exige `$schema`, `name` e `position` (com `x`, `y`, `height` e `width`). O objeto `visual` exige `visualType`. O `query` exige `queryState`. Cada role tem `projections[]`, e cada projeção exige `field` e `queryRef`. Fontes:

- https://github.com/microsoft/json-schemas/blob/main/fabric/item/report/definition/visualContainer/2.13.0/schema.json
- https://github.com/microsoft/json-schemas/blob/main/fabric/item/report/definition/visualConfiguration/2.8.0/schema-embedded.json

O `field` é um `QueryExpressionContainer` com três formas:

- `Column` = `{ Expression: { SourceRef: { Entity } }, Property }`;
- `Measure`, com a mesma forma;
- `Aggregation` = `{ Expression, Function }`, com `Function`: 0 = Sum, 1 = Average, 2 = DistinctCount, 3 = Min, 4 = Max, 5 = Count, 6 = Median.

Fonte: https://github.com/microsoft/json-schemas/blob/main/fabric/item/report/definition/semanticQuery/1.4.0/schema.json

Os nomes de `visualType` embutidos são estes: `card`, `cardVisual`, `clusteredBarChart`, `clusteredColumnChart`, `barChart`, `donutChart`, `pieChart`, `treemap`, `lineChart`, `tableEx`, `pivotTable`, `slicer`, `listSlicer`, `textSlicer`, `advancedSlicerVisual`, `multiRowCard`, `kpi`, `gauge`, `shapeMap`, `azureMap`, `filledMap`, `map`, `textbox`, `image`, `shape` etc. Fontes: as chaves de `visualStyles` em https://github.com/microsoft/powerbi-desktop-samples/blob/main/Report%20Theme%20JSON%20Schema/reportThemeSchema-2.159.json e a lista em https://learn.microsoft.com/en-us/javascript/api/overview/powerbi/create-add-visual

**Os nomes dos data roles não têm tabela oficial.** A página de data fields manda consultar `getCapabilities()` em tempo de execução. Fonte: https://learn.microsoft.com/en-us/javascript/api/overview/powerbi/data-fields

| visualType | Roles | Status |
|---|---|---|
| `barChart` | `Category`, `Series`, `Y` | Confirmado: https://learn.microsoft.com/en-us/rest/api/fabric/articles/item-management/definitions/report-definition |
| `clusteredColumnChart` | `Category`, `Series`, `Y` | Confirmado em template Microsoft: https://github.com/microsoft/semantic-link-labs/tree/main/src/sempy_labs/report/_bpareporttemplate |
| `tableEx` | `Values` | Confirmado no mesmo template |
| `slicer` | `Values` | Confirmado no mesmo template |
| `pivotTable` | `Rows`, `Values` (e `Columns`) | `Rows` e `Values` confirmados no template; `Columns` **[NÃO CONFIRMADO]** |
| `multiRowCard` | `Values` | Confirmado no template |
| `clusteredBarChart` | `Category`, `Series`, `Y` | **[NÃO CONFIRMADO]**; provável, por analogia com `barChart` e `clusteredColumnChart` |
| `card` | `Values` | **[NÃO CONFIRMADO]** |
| `cardVisual` (card novo, GA em out/2025) | `Data` | **[NÃO CONFIRMADO]** |
| `donutChart` / `pieChart` | `Category`, `Y` | **[NÃO CONFIRMADO]** |
| `treemap` | `Group`, `Values` | **[NÃO CONFIRMADO]** |
| `lineChart` | `Category`, `Y`, `Series` | **[NÃO CONFIRMADO]** |
| `shapeMap` | Location / Legend / Color saturation na interface | Nomes internos **[NÃO CONFIRMADOS]** |

**Recomendação para os não confirmados:** criar cada tipo de visual uma vez num Desktop real, salvar como PBIP e copiar o `visual.json` como template do gerador. Nas páginas do Learn, um `visual.json` inválido pelo schema é erro bloqueante. Já um role com nome errado não tem comportamento documentado.

Exemplos (`$schema` atual, `position` obrigatório):

**Card (legado), role não confirmado:**

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.13.0/schema.json",
  "name": "kpiTotalEmpresas",
  "position": { "x": 16, "y": 16, "z": 0, "width": 280, "height": 120, "tabOrder": 0 },
  "visual": {
    "visualType": "card",
    "query": {
      "queryState": {
        "Values": {
          "projections": [
            {
              "field": { "Measure": { "Expression": { "SourceRef": { "Entity": "Empresas" } }, "Property": "Total de Empresas" } },
              "queryRef": "Empresas.Total de Empresas"
            }
          ]
        }
      }
    },
    "drillFilterOtherVisuals": true
  }
}
```

**Barras agrupadas.** A estrutura é igual à do exemplo oficial do `barChart`. O `visualType` `clusteredBarChart` aparece no schema de tema, e seus roles não estão confirmados:

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.13.0/schema.json",
  "name": "barrasPorModalidade",
  "position": { "x": 16, "y": 152, "z": 1, "width": 620, "height": 360, "tabOrder": 1 },
  "visual": {
    "visualType": "clusteredBarChart",
    "query": {
      "queryState": {
        "Category": {
          "projections": [
            {
              "field": { "Column": { "Expression": { "SourceRef": { "Entity": "Empresas" } }, "Property": "modalidade" } },
              "queryRef": "Empresas.modalidade",
              "active": true
            }
          ]
        },
        "Y": {
          "projections": [
            {
              "field": { "Measure": { "Expression": { "SourceRef": { "Entity": "Empresas" } }, "Property": "Total de Empresas" } },
              "queryRef": "Empresas.Total de Empresas"
            }
          ]
        }
      },
      "sortDefinition": {
        "sort": [
          {
            "field": { "Measure": { "Expression": { "SourceRef": { "Entity": "Empresas" } }, "Property": "Total de Empresas" } },
            "direction": "Descending"
          }
        ]
      }
    },
    "drillFilterOtherVisuals": true
  }
}
```

**Donut, treemap e linha.** Use o mesmo esqueleto, trocando `visualType` e as chaves de `queryState` (ver a tabela acima; não confirmados):

- donut: `"visualType": "donutChart"`, com `Category` (coluna) e `Y` (medida);
- treemap: `"visualType": "treemap"`, com `Group` (coluna) e `Values` (medida);
- linha: `"visualType": "lineChart"`, com `Category` (coluna de data/ano) e `Y` (medida).

**Tabela** (roles confirmados). A coluna sem agregação usa `Column`, e o valor agregado pode usar `Aggregation`:

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.13.0/schema.json",
  "name": "tabelaEmpresas",
  "position": { "x": 16, "y": 528, "z": 2, "width": 1248, "height": 176, "tabOrder": 2 },
  "visual": {
    "visualType": "tableEx",
    "query": {
      "queryState": {
        "Values": {
          "projections": [
            {
              "field": { "Column": { "Expression": { "SourceRef": { "Entity": "Empresas" } }, "Property": "cnpj" } },
              "queryRef": "Empresas.cnpj",
              "nativeQueryRef": "cnpj"
            },
            {
              "field": { "Aggregation": { "Expression": { "Column": { "Expression": { "SourceRef": { "Entity": "Empresas" } }, "Property": "capital_social" } }, "Function": 0 } },
              "queryRef": "Sum(Empresas.capital_social)",
              "nativeQueryRef": "Soma de capital_social"
            }
          ]
        }
      }
    },
    "drillFilterOtherVisuals": true
  }
}
```

**[NÃO CONFIRMADO]** Para agregações, o formato do `queryRef` (`Sum(Tabela.coluna)`). O schema só exige que o `queryRef` seja único por visual. Fonte: https://github.com/microsoft/json-schemas/blob/main/fabric/item/report/definition/visualConfiguration/2.8.0/schema-embedded.json

**Slicer.** A estrutura é copiada do template Microsoft. O `objects.data.mode` aceita `'Basic'` (lista), e `'Dropdown'` é **[NÃO CONFIRMADO]**. Fonte: https://github.com/microsoft/semantic-link-labs/tree/main/src/sempy_labs/report/_bpareporttemplate

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.13.0/schema.json",
  "name": "filtroRegional",
  "position": { "x": 1000, "y": 16, "z": 3, "width": 264, "height": 120, "tabOrder": 3 },
  "visual": {
    "visualType": "slicer",
    "query": {
      "queryState": {
        "Values": {
          "projections": [
            {
              "field": { "Column": { "Expression": { "SourceRef": { "Entity": "Empresas" } }, "Property": "regional" } },
              "queryRef": "Empresas.regional",
              "nativeQueryRef": "regional",
              "active": true
            }
          ]
        }
      }
    },
    "objects": {
      "data": [ { "properties": { "mode": { "expr": { "Literal": { "Value": "'Basic'" } } } } } ]
    },
    "drillFilterOtherVisuals": true
  }
}
```

Formatos de literal: string `'texto'`, inteiro `24L`, double `2.4D`, decimal `2.4M` e booleano `true`. Fonte: `QueryLiteralExpression` em https://github.com/microsoft/json-schemas/blob/main/fabric/item/report/definition/semanticQuery/1.4.0/schema.json

### 3.7 Tema embutido no relatório

O fluxo tem três passos:

1. Gravar `StaticResources/RegisteredResources/CreaSP.json`.
2. Registrar o arquivo em `report.json > resourcePackages[RegisteredResources].items` com `type: "CustomTheme"`.
3. Apontar `themeCollection.customTheme` para ele com `type: "RegisteredResources"`.

O exemplo completo está na seção 3.4. Fontes: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-report (seção RegisteredResources), https://learn.microsoft.com/en-us/rest/api/fabric/articles/item-management/definitions/report-definition e https://github.com/microsoft/semantic-link-labs/blob/main/src/sempy_labs/report/_reportwrapper.py

---

## 4. Tema JSON do relatório

- **Schema.** O arquivo é `reportThemeSchema-<versão Desktop>.json`, e o mais recente é `reportThemeSchema-2.159.json` (out/2026, exploration version 5.78). Fonte: https://github.com/microsoft/powerbi-desktop-samples/blob/main/Report%20Theme%20JSON%20Schema/README.md
- **Validação.** O Desktop valida o tema com o próprio schema (biblioteca Ajv) quando o tema é importado, e rejeita o tema se a validação falhar. Fonte: a mesma página.
- **Campo obrigatório.** Só `name` (`"required": ["name"]`). Fonte: https://github.com/microsoft/powerbi-desktop-samples/blob/main/Report%20Theme%20JSON%20Schema/reportThemeSchema-2.159.json
- **Campos principais.** Fonte: https://learn.microsoft.com/en-us/power-bi/create-reports/report-themes-create-custom
  - `dataColors`;
  - cores de sentimento: `good`, `neutral`, `bad`;
  - cores divergentes: `maximum`, `center`, `minimum`, `null`;
  - cores estruturais: `firstLevelElements` (= `foreground`), `secondLevelElements`, `thirdLevelElements`, `fourthLevelElements`, `background`, `secondaryBackground`, `tableAccent`;
  - `textClasses`, com as classes primárias `callout`, `title`, `header` e `label`;
  - `visualStyles`, no padrão `visualName > stylePreset ("*") > cardName > [ { propriedade: valor } ]`.
- **Cores em `visualStyles`.** Use `{ "solid": { "color": "#RRGGBB" } }`. Desde a versão 2.152, também aceita `{ "solid": { "color": "foreground" } }`. Fontes: https://learn.microsoft.com/en-us/power-bi/create-reports/report-themes-create-custom e https://github.com/microsoft/powerbi-desktop-samples/blob/main/Report%20Theme%20JSON%20Schema/README.md

Exemplo mínimo oficial com cores estruturais. Fonte: https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-report-themes

```json
{
  "name": "Valentine's Day",
  "dataColors": ["#990011", "#cc1144", "#ee7799", "#eebbcc", "#cc4477", "#cc5555", "#882222", "#A30E33"],
  "background": "#FFFFFF",
  "foreground": "#ee7799",
  "tableAccent": "#990011"
}
```

Exemplo adaptado para o CREA-SP. As cores são placeholders, a trocar pelos tokens do design system:

```json
{
  "$schema": "https://raw.githubusercontent.com/microsoft/powerbi-desktop-samples/main/Report%20Theme%20JSON%20Schema/reportThemeSchema-2.159.json",
  "name": "CREA-SP Empresas",
  "dataColors": ["#0B4F8A", "#2E86C1", "#F39C12", "#27AE60", "#8E44AD", "#C0392B", "#16A085", "#7F8C8D"],
  "good": "#27AE60",
  "neutral": "#F39C12",
  "bad": "#C0392B",
  "firstLevelElements": "#1F2933",
  "secondLevelElements": "#52606D",
  "thirdLevelElements": "#E4E7EB",
  "fourthLevelElements": "#9AA5B1",
  "background": "#FFFFFF",
  "secondaryBackground": "#CBD2D9",
  "tableAccent": "#0B4F8A",
  "textClasses": {
    "callout": { "fontSize": 32, "fontFace": "Segoe UI Semibold", "color": "#1F2933" },
    "title":   { "fontSize": 12, "fontFace": "Segoe UI Semibold", "color": "#1F2933" },
    "header":  { "fontSize": 12, "fontFace": "Segoe UI Semibold", "color": "#1F2933" },
    "label":   { "fontSize": 10, "fontFace": "Segoe UI", "color": "#52606D" }
  },
  "visualStyles": {
    "*": { "*": { "*": [ { "wordWrap": true } ] } },
    "page": { "*": { "background": [ { "color": { "solid": { "color": "#F5F7FA" } }, "transparency": 0 } ] } }
  }
}
```

O card `page > background` aceita `color`, `image` (`{name, url, scaling}`, com `scaling` igual a `Normal`, `Fit` ou `Fill`) e `transparency`. Fonte: `definitions.image` e `visualStyles.page` em https://github.com/microsoft/powerbi-desktop-samples/blob/main/Report%20Theme%20JSON%20Schema/reportThemeSchema-2.159.json

**[NÃO CONFIRMADO]** Que o `url` da imagem no tema aceite *data URI* base64.

Usar `"$schema"` como URL raw do repositório é a forma sugerida pelo README. A documentação mostra também um caminho local (`"reportThemeSchema.json"`). Fontes: https://github.com/microsoft/powerbi-desktop-samples/blob/main/Report%20Theme%20JSON%20Schema/README.md e https://learn.microsoft.com/en-us/power-bi/create-reports/report-themes-create-custom

---

## 5. Mapa dos municípios de SP, imagem de fundo e recursos

### 5.1 Shape Map

- **Status.** Entrou na lista de lançamentos de junho/2026 como "Shape Map GA". Fonte: https://github.com/microsoft/json-schemas/blob/main/fabric/item/report/README.md. A página do visual não fala mais em preview. Fonte: https://learn.microsoft.com/en-us/power-bi/visuals/desktop-shape-map
- **`visualType`:** `shapeMap`. Fontes: https://learn.microsoft.com/en-us/javascript/api/overview/powerbi/create-add-visual e o schema de tema 2.159.
- **Mapa customizado.**
  - Caminho na interface: Format visual > Map settings > Map type > **Custom map** > Add a map type.
  - Formatos aceitos: `.topojson` ou `.geojson`.
  - Alternativa: Type = **URL** (ou medida via *fx*) apontando para um TopoJSON/GeoJSON hospedado.
  - Limite: 1.500 pontos de dados. São Paulo tem 645 municípios, então cabe.
  - O "Color saturation" é necessário para a legenda funcionar.

  Fonte: https://learn.microsoft.com/en-us/power-bi/visuals/desktop-shape-map
- **Armazenamento no PBIR.** O enum `ResourcePackageItemType` inclui `"ShapeMap"`, o que indica um item em `RegisteredResources`. Fonte: https://github.com/microsoft/json-schemas/blob/main/fabric/item/report/definition/report/3.3.0/schema.json
  - O card `shape` do visual tem `datasourceType` (`url` | `file_upload`), `mapUrl` e `projectionEnum` (`albersUsa`, `equirectangular`, `mercator`, `orthographic`). Fonte: `visual-shapeMap` em https://github.com/microsoft/powerbi-desktop-samples/blob/main/Report%20Theme%20JSON%20Schema/reportThemeSchema-2.159.json

**[NÃO CONFIRMADO]** A forma exata do `visual.json` que referencia o TopoJSON enviado: o nome da propriedade em `objects.shape` e o uso de `ResourcePackageItem`. **[NÃO CONFIRMADO]** Os nomes internos dos roles (Location, Legend, Color saturation).

A recomendação é capturar o `visual.json` de um Shape Map real. A opção `datasourceType: "url"` + `mapUrl` evita embutir o arquivo, mas exige hospedar o TopoJSON por HTTPS.

### 5.2 Alternativa: Azure Maps

- **`visualType`:** `azureMap`. Fonte: o schema de tema 2.159.
- **Camada de referência.**
  - Formatos aceitos: GeoJSON, WKT, KML, SHP e CSV com WKT.
  - Limite: 30.000 feições.
  - Junção: os valores do campo Location são casados com a propriedade do arquivo que tiver mais correspondências.

  Fonte: https://learn.microsoft.com/en-us/azure/azure-maps/power-bi-visual-add-reference-layer
- **Configurações de tenant.** São três: "Enable the Azure Maps visual", "Data sent to Azure Maps can be processed outside your tenant's geographic region..." e a opção de subprocessadores. "The Azure Maps Power BI visual is currently only available in the United States and European Union regions" e não funciona fora dessas regiões sem a segunda opção. Isso afeta um tenant no Brasil. Fonte: https://learn.microsoft.com/en-us/azure/azure-maps/power-bi-visual-manage-access
- **Envio de dados.** Os valores de Location podem ser enviados ao Azure para geocodificação. Fonte: https://learn.microsoft.com/en-us/azure/azure-maps/power-bi-visual-get-started

### 5.3 Imagem de fundo da página via PBIR

O `page.json > objects` aceita dois cards:

- `background` (fundo da página);
- `outspace` (papel de parede, a área fora da página).

Os dois usam a definição `Background` com `color`, `image` e `transparency`. Fonte: https://github.com/microsoft/json-schemas/blob/main/fabric/item/report/definition/page/2.1.0/schema.json

O schema não tipa o valor de `image`. A estrutura abaixo vem do código Microsoft `set_page_wallpaper` (que grava em `objects.outspace`). Ali `PackageType: 1` é usado para RegisteredResources. Fonte: https://github.com/microsoft/semantic-link-labs/blob/main/src/sempy_labs/report/_reportwrapper.py

O `ResourcePackageItem` exige `PackageName`, `PackageType` (número) e `ItemName`. Fonte: https://github.com/microsoft/json-schemas/blob/main/fabric/item/report/definition/semanticQuery/1.4.0/schema.json

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.1.0/schema.json",
  "name": "visao-geral",
  "displayName": "Visão geral",
  "displayOption": "FitToPage",
  "height": 720,
  "width": 1280,
  "objects": {
    "background": [
      {
        "properties": {
          "image": {
            "image": {
              "name": { "expr": { "Literal": { "Value": "'fundo_empresas.png'" } } },
              "url": { "expr": { "ResourcePackageItem": { "PackageName": "RegisteredResources", "PackageType": 1, "ItemName": "fundo_empresas.png" } } },
              "scaling": { "expr": { "Literal": { "Value": "'Fit'" } } }
            }
          },
          "transparency": { "expr": { "Literal": { "Value": "0D" } } }
        }
      }
    ]
  }
}
```

A imagem vai para `StaticResources/RegisteredResources/fundo_empresas.png` e é registrada em `report.json` com `{ "name": "fundo_empresas.png", "path": "fundo_empresas.png", "type": "Image" }` (ver 3.4). Fontes: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-report e https://github.com/microsoft/semantic-link-labs/blob/main/src/sempy_labs/report/_reportwrapper.py

**[NÃO CONFIRMADO]** Na documentação do Learn, que o `PackageType` de RegisteredResources é 1 e que a mesma estrutura de imagem vale para `background` e para `outspace`. A fonte é só o código Microsoft citado.

---

## 6. RLS em TMDL

Ver a seção 2.8. Em resumo:

- cada role fica num arquivo `roles/<Nome>.tmdl`;
- a role declara `modelPermission: read`;
- cada filtro é uma linha `tablePermission <Tabela> = <expressão DAX booleana>`.

Fonte: https://learn.microsoft.com/en-us/analysis-services/tmdl/tmdl-overview

---

## 7. Armadilhas para o gerador

1. **Codificação: UTF-8 sem BOM.** Citação literal: "When editing PBIP files outside of Power BI Desktop, they should be saved using UTF-8 without BOM encoding." Fonte: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-overview
2. **Fim de linha.** "Power BI Desktop uses CRLF as end-of-line." Fonte: a mesma página. O exemplo real no GitHub está com LF, mas isso pode ser normalização do Git. Recomendação: emitir CRLF, igual ao Desktop. **[NÃO CONFIRMADO]** Que LF cause falha.
3. **Indentação TMDL com TAB.** Erro de indentação é erro de parsing. Nomes com espaço, ponto, `=` ou `:` vão entre aspas simples. Fonte: https://learn.microsoft.com/en-us/analysis-services/tmdl/tmdl-overview
4. **Formato único por item.** O relatório não pode ter `definition/` e `report.json` ao mesmo tempo. O modelo não pode ter `definition/` e `model.bim` ao mesmo tempo. Fontes: https://learn.microsoft.com/en-us/rest/api/fabric/articles/item-management/definitions/report-definition e https://learn.microsoft.com/en-us/rest/api/fabric/articles/item-management/definitions/semantic-model-definition
5. **Versões dos arquivos de definição.** O `definition.pbir` precisa ter `version` 4.0 ou maior para PBIR. O `definition.pbism` precisa ter 4.0 ou maior para TMDL. Fontes: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-report e https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-dataset
6. **Schema exato e campos obrigatórios.** Nos arquivos PBIR, o `$schema` tem valor `const` com a versão exata. Schema inválido ou campo obrigatório ausente é erro **bloqueante**. Recomendação: validar tudo com Ajv no CI contra os schemas do `json-schemas`. Fontes: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-report e os schemas citados.
7. **Nomes de pasta e objeto PBIR.** Use só `[A-Za-z0-9_-]` e no máximo 50 caracteres. Uma pasta fora da regra é ignorada sem erro. Fonte: seção 3.2.
8. **Caminhos.** O `byPath` é relativo e usa `/`. O caminho total no Windows deve ficar abaixo de 260 caracteres, por isso nomes de tabela longos são um problema. Fontes: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-report e https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-overview
9. **Recursos registrados.** Todo arquivo em `RegisteredResources` precisa de uma entrada em `report.json`. Fonte: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-report
10. **Arquivos que não devem ser gerados.** `diagramLayout.json`, `semanticModelDiagramLayout.json` e `mobileState.json` têm schema não documentado e não são editáveis externamente. Fonte: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-overview
11. **`lineageTag`.** É opcional, mas deve ser único por escopo, e um GUID determinístico é a melhor escolha. Fonte: seção 2.10.
12. **Dados no `visual.json`.** Filtros e seleções salvam valores de dados nos arquivos. Não gere filtros com dados sensíveis. Fonte: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-report
13. **`unappliedChanges.json`.** Se existir, ele sobrescreve edições externas de expressões. O gerador não deve criá-lo. Fonte: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-dataset
14. **Maiúsculas e minúsculas nos nomes de arquivo.** **[NÃO CONFIRMADO]** Nenhuma página fala em case-sensitivity. Use exatamente os nomes documentados: `definition.pbir`, `definition.pbism`, `version.json`, `report.json`, `pages.json`, `page.json`, `visual.json`, `database.tmdl`, `model.tmdl`, `relationships.tmdl`, `expressions.tmdl`, e as pastas `tables/`, `roles/`, `cultures/`, `pages/`, `visuals/`, `StaticResources/RegisteredResources/`.
15. **Abertura sem dados.** Sem `cache.abf`, o projeto abre sem dados, e o usuário deve clicar em Atualizar. Se o caminho do CSV não existir na máquina, a atualização falha, mas o projeto abre. Esse comportamento de falha é inferido e não documentado.
16. **Edição com o projeto aberto.** Salve no Desktop antes de editar fora dele. A recarga externa é preview e não recarrega o `definition.pbir`. Fonte: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-external-editing
17. **Versão do Desktop.** O PBIP não funciona no Desktop para Report Server. Fonte: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-overview

---

## Pendências (precisam de um Desktop real em Windows)

- Os nomes de role de `card`, `cardVisual`, `clusteredBarChart`, `donutChart`, `treemap`, `lineChart` e `shapeMap`.
- O `visual.json` do Shape Map com um TopoJSON enviado, e o registro `ShapeMap` em `resourcePackages`.
- Se `StaticResources/SharedResources/BaseThemes/<base>.json` é obrigatório no disco.
- O valor de `version` no `.pbip` e no `version.json` que o Desktop de 2026 grava.
- Se o Desktop aceita LF em vez de CRLF.
- O `compatibilityLevel` recomendado para o Desktop de 2026.

Procedimento sugerido:

1. Montar uma vez, à mão, um PBIP "gabarito" com um visual de cada tipo.
2. Salvar e copiar os JSON para `templates/` do gerador.
3. Validar os arquivos gerados com Ajv contra os schemas oficiais.
