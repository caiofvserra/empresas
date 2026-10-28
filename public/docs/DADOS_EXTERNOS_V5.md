> **Arquivo histórico — substituído pela diretriz V7.** O conteúdo abaixo preserva decisões e evidências das versões anteriores; não descreve as fontes ativas do BI. A V7 exclui fatos capturados manualmente de sites, PDFs e snapshots dessas medidas. Em produção, o relatório deve consumir SQL Server/DB2 pelo gateway ou APIs homologadas, com rotina automática de ingestão; arquivos oficiais podem alimentar o banco por ETL homologado. Consulte [ATUALIZACAO_AUTOMATICA_V7.md](ATUALIZACAO_AUTOMATICA_V7.md). A integração institucional ainda precisa ser configurada e validada.

# Educação superior e diplomados — dados reais incorporados na V5

A V5 acrescenta uma base externa real de formação em **Engenharias e Agronomia presenciais no Estado de São Paulo**, com a série 2019–2024 e o detalhamento territorial de 2024. A base interna do CREA, as empresas, os profissionais, os vínculos e as ARTs continuam demonstrativos. Essas naturezas devem permanecer identificadas na apresentação.

O universo principal do relatório é **CREA-SP / São Paulo**. Os dados públicos de situação e novos registros profissionais também usam o recorte SP, embora a origem do SIC seja Confea. Dados Brasil e demais UFs são preservados como referências arquivadas/exportadas, sem substituir os indicadores paulistas.

O conjunto externo é de **concluintes por curso e ano**, não de pessoas distintas nem de diplomas nominais. Não contém CPF e não permite ligar um concluinte a um cadastro CREA, empresa ou trabalhador específico.

## Origem e acesso aos repositórios do usuário

Em 10/10/2026, o acesso foi novamente verificado pela conexão GitHub autenticada e pelos endereços públicos. As tentativas iniciais desta revisão ainda retornaram 404; os novos links e a verificação seguinte permitiram aproveitar os dados publicados do projeto do usuário e ler dois repositórios antes indisponíveis.

| Repositório solicitado | Verificação realizada nesta revisão | Resultado |
|---|---|---|
| [engineer-statistics publicado](https://caiofvserra.github.io/engineer-statistics/) | GitHub Pages: páginas de diplomas, mapa, fontes e metodologia; 29 JSONs canônicos em `/dados/` | Dados publicados acessíveis e importados em `user-engineer-statistics.json`; código do repositório/branch enviado permanece restrito nesta sessão. |
| [receita-socios-eng](https://github.com/caiofvserra/receita-socios-eng/tree/main) | Árvore e código em `main`, commit `d98735df4af8da7566902bd0524cf9a1d4210df2` | Acessível; pipeline Receita/CNPJ/QSA inspecionado. Não há dataset de saída na árvore. |
| [conselho](https://github.com/caiofvserra/conselho/tree/claude%2Fcrea-sp-audit-tool-m9nw7t) | README, modelo de achados e análises, commit `3fbfa93dc38d2b3e7e272a2cf7a5251726c1f813` | Acessível; substitui `queda`. Dados de execução e relatórios são ignorados no Git, não importados. |

O acesso ao código de engineer-statistics permanece distinto do acesso aos seus dados publicados: foram efetivamente baixados e incorporados 29 envelopes JSON canônicos, com URL, competência e SHA-256. Formação Brasil, estoque de diplomados, séries de registros e situação profissional não substituem o recorte paulista descrito neste documento. O registro completo dos projetos está em [REPOSITORIOS_USUARIO_V5.md](REPOSITORIOS_USUARIO_V5.md).

A fonte governamental original foi identificada nas páginas oficiais de [microdados do Censo da Educação Superior](https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/censo-da-educacao-superior) e [sinopses estatísticas](https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/sinopses-estatisticas/educacao-superior). As tentativas de baixar as sinopses 2022, 2023 e 2024 e os microdados de 2024 retornaram **HTTP 503**. Nenhum arquivo bruto dessas tentativas foi utilizado.

## Reprodução pública inspecionada

Os agregados incorporados foram obtidos no repositório público [Observatório Nacional da Educação Superior](https://github.com/esidiao/observatorio-educacao-superior/tree/188e182414c460737f13ca3bc019eeeaf14589df), de Edson Sidião de Souza Júnior, fixado no commit:

`188e182414c460737f13ca3bc019eeeaf14589df`

O README e os arquivos `etl/baixar_censo.py`, `etl/serie.py`, `etl/ingestao.py` e `etl/consolidar.py` foram inspecionados. **Nenhum código desse repositório foi executado ou incorporado à aplicação.** O procedimento local lê os JSONs agregados, mantém os fatos numéricos necessários e registra a origem e a impressão SHA-256 de cada arquivo.

O código inspecionado identifica a origem dos arquivos no INEP, lê as variáveis `NU_ANO_CENSO`, `SG_UF`, `CO_MUNICIPIO`, `NO_CINE_ROTULO`, `TP_MODALIDADE_ENSINO`, `QT_ING`, `QT_MAT` e `QT_CONC`, compara o rótulo CINE de forma exata e agrega as observações presenciais. As séries não fabricam observações para rótulos inexistentes em uma edição.

Foram utilizados 134 arquivos de dados, entre o catálogo e os recortes por curso disponíveis nos arquivos:

- `data/cursos/<slug>/serie.json`: agregados anuais por UF.
- `data/cursos/<slug>/nacional.json`: metadados e recorte estadual de 2024.
- `data/cursos/<slug>/municipios/SP.json`: agregados municipais presenciais de 2024.

A lista exata de URLs imutáveis, SHA-256 e verificações é publicada em [DADOS_EXTERNOS_V5.manifest.json](DADOS_EXTERNOS_V5.manifest.json). O repositório de reprodução não declara uma licença geral. Foram reaproveitados fatos estatísticos, com atribuição, e não seu código, layout ou texto editorial.

A etiqueta de fonte apropriada na interface é **“INEP • reprodução pública auditada”**. Evitar a afirmação de que houve nova extração direta dos microdados governamentais nesta sessão.

## Recorte, grão e fórmula

| Item | Definição |
|---|---|
| Território | UF `SP`; município do local de oferta presencial pelo código IBGE |
| Modalidade | `TP_MODALIDADE_ENSINO = 1` — presencial |
| Formação | Rótulos CINE cujo nome inicia com `Engenharia`, acrescidos de `Agronomia` |
| Catálogo | 47 códigos explicitamente relacionados em `selectedFields` |
| Concluintes | Soma de `QT_CONC` por ano, UF, modalidade e rótulo CINE |
| Ingressantes | Soma de `QT_ING` no mesmo recorte |
| Matrículas | Soma de `QT_MAT` no mesmo recorte |
| Variação anual | `(valor do ano / valor do ano anterior − 1) × 100` |
| Unidade de contagem | Ocorrências de alunos por curso e ano; não pessoas distintas |
| Série temporal | 2019–2024; ano de 2024 para municípios |

Os 47 rótulos do catálogo não têm observações paulistas em todos os anos. Há 41 rótulos observados em 2019, 40 em 2020–2022, 39 em 2023 e 40 em 2024. Os rótulos sem observação são mantidos como ausência, sem gerar zeros artificiais. A aplicação informa o recorte da série e não apresenta o catálogo como uma listagem definitiva das profissões ou das atribuições do Sistema Confea/Crea.

Engenharia de software está incluída no recorte educacional pelo nome do rótulo CINE. Isso **não determina atribuições nem obrigação de registro**. Uma correspondência oficial CINE ↔ título profissional ↔ modalidade CREA deve ser validada pelo Conselho antes de produzir indicadores por modalidade profissional.

## Valores incorporados

| Ano | Concluintes | Ingressantes | Matrículas | Rótulos CINE observados em SP |
|---:|---:|---:|---:|---:|
| 2019 | 36.637 | 54.985 | 206.702 | 41 |
| 2020 | 33.561 | 47.799 | 177.089 | 40 |
| 2021 | 29.168 | 35.582 | 149.389 | 40 |
| 2022 | 26.407 | 36.517 | 131.605 | 40 |
| 2023 | 22.434 | 33.980 | 118.649 | 39 |
| 2024 | 19.859 | 33.890 | 119.749 | 40 |

O detalhamento de 2024 contém **40 rótulos CINE**, **118 municípios** com observação presencial e **563 combinações município × CINE**. A série por curso contém 240 observações CINE × ano em SP.

## Validação independente com fonte governamental

A [Fundação Seade publica uma base oficial de matrículas do Censo da Educação Superior](https://repositorio.seade.gov.br/dataset/educacao-do-ensino-superior), com os anos 2019–2024, código IBGE, rótulo CINE, instituição, modalidade, sexo, grau e rede. O [catálogo Dados Abertos SP](https://dadosabertos.sp.gov.br/dataset/ensino-superior) informa licença CC-BY-4.0.

Foram baixados e lidos os arquivos `matriculas_inep.csv`, `cine_inep.csv`, os respectivos dicionários e o anexo metodológico de 2026. O CSV de matrículas tem 72.668.191 bytes. O anexo confirma que o território representa o local de oferta e define matrícula como registro formal em curso no ano de referência.

A comparação usa o mesmo recorte em ambos os conjuntos: código CINE, ano, município paulista (`cod_ibge` iniciado em `35`) e modalidade `Presencial`.

**As 240 comparações de matrículas por CINE × ano reconciliaram exatamente com o arquivo governamental, sem divergência.** Por exemplo, Engenharia Civil presencial em SP reconcilia em todos os anos: 62.876, 49.754, 38.071, 30.573, 25.494 e 21.484 matrículas, respectivamente, de 2019 a 2024.

Também reconciliam, em 2024, o agregado estadual, a soma dos cursos e a soma dos municípios:

| Medida | Estadual | Soma dos cursos | Soma dos municípios |
|---|---:|---:|---:|
| Concluintes | 19.859 | 19.859 | 19.859 |
| Ingressantes | 33.890 | 33.890 | 33.890 |
| Matrículas | 119.749 | 119.749 | 119.749 |

**Limite da validação:** o CSV Seade contém matrículas, e não concluintes ou ingressantes. Portanto, a validação independente governamental cobre as matrículas. Concluintes e ingressantes têm método inspecionado, valores reproduzidos de fonte identificada e reconciliação interna, mas sua nova conferência direta com o arquivo bruto do INEP permanece pendente por indisponibilidade do serviço. O manifesto registra essa distinção.

## Uso analítico no relatório e no Power BI

O gráfico combinado pode mostrar ingressantes e concluintes como colunas e matrículas como linha no eixo secundário, no mesmo território, período e recorte de formação. O tooltip deve distinguir **fluxos anuais** de **estoque anual**.

A proximidade ou distância das curvas ajuda a descrever tendências de oferta e formação. Ela não mede evasão: os ingressantes e concluintes de um mesmo ano não são a mesma coorte. A conclusão de curso não comprova exercício profissional ou registro no CREA.

Para o modelo Power BI:

- `FatoEducacaoAnual`: ano × UF × modalidade × código CINE, com concluintes, ingressantes e matrículas.
- `FatoEducacaoMunicipal`: ano de 2024 × município IBGE × modalidade × código CINE.
- Dimensões compartilháveis: tempo anual, município e formação CINE.
- A dimensão profissional CREA e a formação CINE têm papéis distintos. Uma ponte de equivalência curricular não deve ser inventada.
- GRE pode ser aplicada apenas com tabela territorial oficial. A demonstração de empresas contém 24 municípios; os 118 municípios reais da formação não devem receber GRE aleatória ou cobertura sintética.
- Os filtros de empresa, CNPJ, porte, situação financeira e CNAE não devem filtrar os concluintes como se fossem vínculos nominais.
- O período de formação é independente do recorte demonstrativo interno de 2026. Não atribuir concluintes de 2024 a meses de 2026.
- Pode-se comparar distribuições territoriais agregadas em visualizações claramente identificadas, mantendo as competências e naturezas de fonte visíveis. Não calcular taxa de registro de diplomados reais usando o cadastro fictício CREA.

## Arquivos entregues

`src/domain/external-education.json` contém os metadados, as seis observações anuais estaduais, os campos por curso e município, a lista de rótulos selecionados e as limitações.

`docs/DADOS_EXTERNOS_V5.manifest.json` contém a impressão SHA-256 do resultado, as 134 URLs de reprodução fixadas no commit, a impressão do CSV Seade e as 240 comparações. As cópias locais das fontes utilizadas permanecem no diretório de referências do ambiente de trabalho; elas não são necessárias para executar a aplicação.

## Fontes que convivem no relatório

`user-engineer-statistics.json` incorpora os dados públicos publicados pelo usuário. O relatório principal usa os **novos registros CREA-SP** e a **situação profissional SP no SIC**, com 346.824 ativos em 30/08/2026. Os 29 originais ficam em `public/data/engineer-statistics/`. Engenharia estrita nacional, CINE 07 ampla, outras UFs e saldos CAGED nacionais permanecem arquivados/exportados para referência ou comparação futura. O estoque de **2,37 milhões de diplomados CINE 07 no Brasil, Censo 2022**, mantém a ressalva de fonte secundária: não é uma estimativa paulista. Nenhum desses conjuntos forma uma coorte individual com a educação paulista ou o cadastro fictício CREA.

`pncp-public-aggregate.json` registra outro conjunto real: 341 contratos paulistas agregados em 92 células município do órgão × categoria, publicados em **01/09/2025**. É um recorte de um dia; não uma série anual nem estoque vigente. A origem é a API oficial PNCP, com manifesto próprio. Não houve ligação desses contratos aos CNPJs fictícios.

A página **Profissionais e formação** reúne formação paulista em combinado de ingressantes/concluintes/matrículas, confronto **formação SP × novos registros CREA-SP** e relações técnicas internas demonstrativas. O confronto estadual usa quatro anos observados nas duas fontes: **2019–2022**. Os novos registros SP são 18.245, 15.603, 16.966 e 14.917, respectivamente. Não há novos registros SP publicados em 2023/2024 nessa fonte, portanto esses anos ficam fora do confronto e não recebem zero. Como registros de todas as profissões CREA-SP e conclusões de Engenharias/Agronomia têm universos diferentes, não se calcula conversão de diplomados nem se infere exercício profissional.

**Mercado e emprego** mantém uma referência externa pública por CBO com rótulo **“Referência salarial · Brasil (não SP)”**, sem apresentá-la como salário paulista. **Contratações** apresenta categoria e território do PNCP paulista real junto de gráficos internos claramente identificados. Competências e dimensões territoriais de cada fonte permanecem distintas.

`npm run data:public` gera nove CSVs separados em `data-publica/`, totalizando **1.055 linhas**, com manifesto e `seed: null`. As três exportações educacionais são agregações da mesma população: estadual/ano (6), CINE/ano (240), município/CINE 2024 (563). Usar o nível apropriado e os demais como controle; não concatenar para somar a mesma formação repetidamente. O pacote público não é unido nem somado aos 29 CSVs demonstrativos em `data-demo/`.
