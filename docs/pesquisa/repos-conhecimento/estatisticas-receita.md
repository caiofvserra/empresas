# Achados: engineer-statistics, receita-socios-eng e pncp-engineering-activity

Leitura feita em 07/11/2026, só leitura, sem rodar servidor, script de coleta ou `git` que altere nada. Onde cito número, cito o arquivo de onde ele sai. Nenhum nome de pessoa ou CPF foi copiado; os campos estão descritos.

## Resumo em uma página

- **engineer-statistics** é um site de jornalismo de dados (Next.js 16, App Router, entrega da disciplina PJI240, publicado em `caiofvserra.github.io/engineer-statistics` segundo `lib/site.ts:17`). Tese: "não falta engenheiro, falta emprego que pague o piso da Lei 4.950-A/66". Tem **dois coletores reais** (Confea SIC e IBGE), **cinco chamadas ao vivo no navegador** (IBGE, BCB, Banco Mundial) e **um bruto real e grande**: a captura completa do SIC do Confea de 30/08/2026 (1,9 MB, 4.738 linhas por Crea × título × gênero). Tudo o mais (RAIS, Novo CAGED, INEP, Censo, salários por CBO) é **número transcrito à mão de fontes secundárias** (Portal Salário, Buscador NCM, notícias, PDFs de entidades), com URL e selo por item. **Não há coletor de RAIS, CAGED nem INEP.**
- O dado de maior valor para o Crea-SP: **Crea-SP tem 346.824 profissionais ativos, 77,8% dos 445.546 registros, 16,1% mulheres e 752,6 ativos por 100 mil habitantes** (SIC, 30/08/2026). Também: a série de registros novos do Crea-SP 2010–2022 e os agregados do Portal da Transparência do Crea-SP (receita e despesa 2013–2026), estes num dataset removido do site mas guardado no histórico do Git.
- **receita-socios-eng** é só código: um pipeline PySpark de 6 arquivos que lê Empresas, Estabelecimentos e Sócios do CNPJ aberto da Receita, filtra estabelecimentos pelo CNAE principal ou secundário numa lista Excel ("Sim" ou "Passível de obrigação") e junta os sócios. Não traz dado, não traz a planilha, não baixa os arquivos, não tem teste. Serve de base para "mercado registrável", "CNPJs sem registro" e "sócios profissionais" do painel de Empresas, mas precisa de ajustes (filtro de UF e de situação cadastral, CPF mascarado na saída, sem multiplicar sócios por filial).
- **pncp-engineering-activity** está vazio de verdade: um único commit órfão com árvore vazia. No GitHub, um ramo que não veio para a cópia local guarda um gerador de planilha do "Portfólio de Inovação CREA-SP" (23 projetos). Nunca houve código de PNCP.
- O repo **empresas** já copia 8 JSON do engineer-statistics para `public/data/engineer-statistics/` e os usa no cockpit da Presidência e em dois indicadores; a lista de CBOs do painel de Profissionais repete a classificação do engineer-statistics. Não há coletor da Receita no empresas: o catálogo de integrações marca `rfb-cnpj` como `blocked-unconfigured`.

---

## 1. engineer-statistics (`engineer-statistics`)

### 1.1 O que é

Site "Onde estão os engenheiros?" (`README.md`). Tem páginas temáticas (`app/sobra`, `app/diplomas`, `app/rotulo`, `app/piso`, `app/mapa`, `app/neoindustrial`, `app/outro-lado`, `app/propostas`), mais `/metodologia` e `/fontes`. Regra do projeto: nenhum número sem fonte, URL, ano e selo (`verificado`, `verificado-pelo-usuario`, `citado`, `estimativa`). O validador `scripts/validar-dados.ts` reprova o build se faltar algo. O `AGENTS.md` avisa que é uma versão do Next.js com mudanças; o servidor não foi rodado.

Persistência: um Supabase (Postgres) com dois esquemas. O `public` (`supabase/migrations/20260830T0001_schema.sql`, `...0002_rls.sql`, `20260831T0001_tese_v2.sql`) espelha os JSON para a API própria. O `dados` (`supabase/migrations/20260924T0001_dados.sql`, carga em `supabase/carga-dados/000.sql` a `024.sql`) é uma base analítica: 864 observações, 807 fatos, 154 métricas, 143 fontes, 159 cálculos próprios, com views `v_uf_painel`, `v_ocupacao_painel`, `v_serie`, `v_rastreio_fontes` (`docs/banco-dados.md`). Leitura pública, escrita só com `service_role`. O README fala em 136 fontes, mas `data/fontes.json` tem 143 entradas: o README está desatualizado.

### 1.2 Coletores e chamadas a fontes

| Coletor | Fonte e endpoint | Chave | Granularidade | Período | Sem credencial? | Situação |
|---|---|---|---|---|---|---|
| `scripts/fetch-confea.mjs` | Confea SIC, `https://relatorio.confea.org.br`, 5 POST JSON: `/Profissional/RegistrosPorAno/Buscar`, `/ProfissionaisDecada/Buscar`, `/ProfissionaisPorGenero/Buscar`, `/SituacaoRegistro/Buscar`, `/RegistrosPorGrupo/Buscar` (corpo `{filtro:{CREA:null,Pagina:1,Tamanho:100}}`, cabeçalho `X-Requested-With`) | nenhuma | por Crea (27 + linha "TOTAL:"); `RegistrosPorGrupo` por Crea × grupo × modalidade × nível × título × gênero | estoque na data da captura; registros novos por ano 1937–2026 (Brasil); por Crea 2010–2022 | Sim. Os endpoints não têm CORS, por isso rodam em Node ou no console do próprio site (`docs/como-coletar-confea.md`) | Pronto. Grava o bruto em `docs/research/assets/confea-sic-<data>.json`. O SIC ignora a paginação e devolve tudo |
| `scripts/derivar-confea.mjs` | o bruto acima e o do IBGE | — | — | — | offline | Deriva 7 JSON de `data/`. Tira a linha "TOTAL:", traduz Crea para código IBGE e marca 2026 como parcial. Aborta se a soma das 27 UFs não bater com o total |
| `scripts/fetch-ibge.mjs` | IBGE Agregados v3, tabela 6579, variável 9324, `N3[all]`, 2025 (população estimada); SIDRA `t/2984` | nenhuma | UF | 2025; Censo 2000 | Sim | População coletada (`docs/research/assets/ibge-6579-populacao-uf-2025.json`). SIDRA 2984 **vazia**: `data/snapshots/sidra-2984.json` tem `data: []`. A URL do script (`c11832/all`) não é a que os metadados indicam (`v/1644`, `c86/0`, `c12402/108952,108953`, em `docs/research/assets/ibge-2984-metadados-notas.md`) |
| `lib/live/ibge.ts`, `lib/live/sidra.ts` | IBGE Malhas v3 (GeoJSON UF), 6579, SIDRA 2984 (pede `p/2010`, mas a tabela é do Censo 2000) | nenhuma | UF | — | Sim, no navegador, timeout de 4 s, cai para o JSON local | Ao vivo, com fallback |
| `lib/live/bcb.ts` | BCB SGS 1619 (salário mínimo), último valor | nenhuma | Brasil | mensal | Sim | Ao vivo, com fallback (R$ 1.621, `data/pisos.json`) |
| `lib/live/banco-mundial.ts` | Banco Mundial `GB.XPD.RSDV.GD.ZS` (P&D em % do PIB) para BRA, KOR, CHN, USA, DEU | nenhuma | país | anual | Sim | Ao vivo, com fallback |
| `scripts/etl/load-supabase.ts`, `scripts/etl/dados/*.ts` | `data/*.json` | `SUPABASE_SERVICE_ROLE_KEY` para gravar | — | — | Gera SQL offline; gravar exige chave | Carga do banco, não é coleta |
| Portal da Transparência do Crea-SP | API pública em `https://crea-sp.implanta.net.br/portaltransparencia/#publico/inicio` (`data/fontes.json`, id `crea-sp-transparencia`), endpoints Pagamentos, Empenhos, DespesasCentroCusto, ComparativoDespesa, ComparativoReceita, BalancoOrcamentario, plano de contas | nenhuma ("sem pedido e sem cadastro") | lançamento, conta, centro de custo | 2011/2013–2026, última coleta 08/09/2026 | Sim | **O coletor não está no repositório**. O commit `0aed33a` fala de uma "ferramenta de apuração" à parte, e `docs/banco-dados.md` diz que a base bruta (pagamentos com favorecido) ficou fora de propósito. Ficaram só os agregados |

Não há coletor de RAIS, Novo CAGED, INEP nem Censo 2022. `docs/research/apis-tecnicas.md` descarta para o navegador: CAGED/PDET (sem API, microdados por FTP), Base dos Dados (exige GCP) e dados.gov.br (exige token). `docs/research/mercado-rais.md` traz um SQL de referência para o BigQuery da Base dos Dados (estoque e mediana por UF das famílias 2142–2149, mais 2122 e 2140-05), mas ele **nunca foi rodado**: não existe `data/engenheiros-uf.json`.

O ambiente de desenvolvimento do projeto bloqueava a rede externa. Por isso quase todos os números de RAIS, CAGED e INEP têm selo `citado` (resumo do buscador, sem abrir a fonte primária), como dizem as notas de `docs/research/*.md` e `docs/research/pendencias/*.md`.

### 1.3 Bases salvas no repositório

**Dado real primário (coletado de API):**

| Arquivo | Linhas | Período | Colunas |
|---|---|---|---|
| `docs/research/assets/confea-sic-2026-08-30.json` (1,9 MB, bruto verbatim) | registrosPorAno 90; profissionaisDecada 28; profissionaisGenero 28; situacaoRegistro 28; registrosPorGrupo 4.738 (340 do Crea-SP, 301 títulos distintos no país) | captura de 30/08/2026 18:45 UTC; anos 1937–2026; por Crea 2010–2022 (2023–2025 vêm nulos) | `Ano, Profissionais`; `CREA, Ano_2010…Ano_2025, Total`; `Crea, Masculino, Feminino, Total`; `Crea, Ativos, Cancelados, Interrompidos, Suspensos, Outros, Total`; `Crea, Grupo, Modalidade, Nivel, Titulo, Genero, Total` |
| `data/confea-uf.json` | 27 | 30/08/2026 | `ufCodigo, crea, valor` (ativos) |
| `data/confea-situacao-uf.json` | 27 + Brasil | 30/08/2026 | `ativos, interrompidos, cancelados, suspensos, outros, total, percentualAtivos` |
| `data/confea-genero.json` | 27 + Brasil | 30/08/2026 | `masculino, feminino, total, percentualFeminino` |
| `data/confea-engenharia-uf.json` | 27 | 30/08/2026 | títulos do grupo Engenharia por UF |
| `data/confea-modalidades.json` | 3 grupos, 6 modalidades, 4 níveis, 15 títulos | 30/08/2026 | `id, rotulo, valor, percentual` (só Brasil) |
| `data/confea-registros-ano.json` | série nacional (90 pontos) e Crea-SP (13 pontos) | 1937–2026 parcial; SP 2010–2022 | `periodo, valor` e anotações de quebra de série |
| `data/populacao-uf.json` e `docs/research/assets/ibge-6579-populacao-uf-2025.json` | 27 | 2025 | `ufCodigo, valor` |
| `docs/research/assets/br_states_simplified.json`, `public/data/br-states.geojson` | 27 feições | — | geometria das UFs |

**Agregados reais do Portal da Transparência do Crea-SP, sem o coletor:**

- `data/conta-do-conselho.json`: 12 itens de 2013–2026. Despesa de 2013 e de 2025, subgrupos (serviços de terceiros PJ, remuneração, diárias, locomoção) e diárias e locomoção por conta (conselheiros, funcionários, inspetores, jeton). Traz também a lista do que não foi possível apurar: passagens e hospedagem zeradas, endpoints QuadrosPessoas e Conselheiros vazios, centro de custo só a partir de 2021.
- O dataset maior, `data/orgao-maquina.json`, foi **removido** no commit `f51b71e` ("Remover a aba do portal do conselho"). Pode ser lido com `git show f51b71e^:data/orgao-maquina.json`. São 43,9 KB em 11 blocos: cobertura da base (528.871 pagamentos, 130.485 empenhos, 11.175 linhas por centro de custo, 5.048 de comparativo de despesa, 3.323 de comparativo de receita, 939 de balanço, 26.819 contas); despesa e receita realizadas por exercício de 2013 a 2026; 8 maiores contas de receita; subgrupos de despesa; remuneração, diárias e serviços de terceiros conta a conta; empenhos e anulações por exercício; 10 maiores centros de custo de 2025; e o que não se apurou.

**Transcrito à mão de fontes secundárias (real, mas sem coleta reproduzível):**

| Arquivo | Itens | Período | Origem | Uso |
|---|---|---|---|---|
| `data/cargos-analista.json` | 12 CBOs, 4 médias ponderadas, 2 razões de par, escada de 4 degraus, 3 linhas de piso | 12 meses até ago/2026 | Portal Salário (salario.com.br, sobre o Novo CAGED, só CLT), uma URL por CBO | colunas `cbo, ocupacao, familiaCbo, ehEngenharia, salarioMensal, jornadaSemanal, movimentacoes, pisoSeAplica, percentualPisoVivo8h, percentualPisoCongelado, multiploSalarioMinimo, identidadeProfissionalPropria` |
| `data/salarios-carreiras.json` | 5 CBOs (engenheiro civil, médico, analista de sistemas, advogado, administrador) | 12 meses até ago/2026 | Portal Salário | `cbo, salarioMensal, jornadaSemanal, movimentacoes` |
| `data/caged-saldos.json` | saldo do país 2023–2025; saldo de 3 CBOs; 4 denominadores (admissões, desligamentos, movimentações, estoque RAIS 2024 da 2142-05) | 2023–2026 | MTE (país) e Buscador NCM ou Portal Salário (CBO) | — |
| `data/pisos.json` | 3 leituras do piso, salário mínimo, mediana de admissão, marcos | 1966–2026 | Lei, STF, Crea-SP, SEESP, Buscador NCM | — |
| `data/formacao-concluintes.json` | 2 séries (estrito: 2010, 2014, 2018, 2019, 2022, 2023; CINE 07: 2018, 2024) | 2010–2024 | INEP via SEESP, IQC, LGI-USP (todas `citado`) | — |
| `data/formacao-cards.json`, `data/ead-expansao.json` | 5 cards; 13 indicadores, ingressos, vagas e marcos | 2012–2025 | INEP, Semesp, Confea, Abenge, imprensa | — |
| `data/funil-bases.json`, `data/reguas-fora-da-area.json`, `data/apagao-evidencias.json` | 10 degraus; 5 réguas; 10 referências | 2010–2026 | Censo 2022 (por imprensa), IPEA, CNI, Confea/Quaest, SIC | — |
| `data/fiscalizacao-piso.json` | 35 itens (funil do Confea Valoriza, Res. 397/1995, casos dos Creas, competência do auditor-fiscal) | 1966–2026 | Confea, Creas, TST, TRF-4 | — |
| `data/contratacao-formas.json`, `data/analista-juridico.json`, `data/fila-concursos.json`, `data/ciclos-governo.json`, `data/contrapontos.json`, `data/internacional.json`, `data/demanda-estrutural.json`, `data/fomento-produtivo.json` | 5, 6, 3, 5 períodos e 21 marcos, 12, 5, 6, 8 | 1995–2026 | Dieese, TST, STF, Cesgranrio, OCDE, MCTI, MDIC, Sebrae | — |
| `data/fontes.json` | 143 fontes | — | `id, nome, url, anoRef, confianca, coletadoEm, observacao` | — |

Nenhuma base é fictícia. As de RAIS, CAGED e INEP são reproduções secundárias, de alcance nacional, sem recorte de SP, salvo onde indicado.

### 1.4 Números-chave e de onde saem

Sistema Confea/Crea (SIC, 30/08/2026, selo `verificado-pelo-usuario`):

- Brasil: 1.217.708 profissionais ativos; 72,7% ativos de 1.674.263 registros; 20,3% mulheres (`data/confea-situacao-uf.json`, `data/confea-genero.json`).
- **Crea-SP: 346.824 ativos (28,5% do país), 86.413 interrompidos, 3.890 cancelados, 445.546 registros no total, 77,8% ativos, 16,1% mulheres (55.694)**. Com a população de 2025 (46.081.801), dá 752,6 ativos por 100 mil habitantes (cálculo meu, com `data/confea-uf.json` e `data/populacao-uf.json`).
- Títulos: 1.373.447 no país contra 1.217.708 pessoas, porque um profissional pode ter mais de um título. Grupo Engenharia: 1.070.469. Civil: 548.302 (`data/confea-modalidades.json`). No Crea-SP: 388.645 títulos, sendo 332.663 do grupo Engenharia (`data/confea-engenharia-uf.json`). Por modalidade, somando o bruto (cálculo meu): civil 150.438, mecânica e metalúrgica 82.767, eletricista 80.089, especiais 29.763, agronomia 26.219, química 13.590.
- Registros novos no Brasil: pico de 101.509 em 2013, 65.245 em 2025 (−35,7%), 46.650 em 2026 até agosto. **No Crea-SP: 20.480 em 2010, 22.107 em 2017, 14.917 em 2022**; 317.684 de 2010 a 2022 (`data/confea-registros-ano.json` e o bruto).
- A "duplicidade de 2×" nos dados por Crea não existe: era a linha "TOTAL:" somada às 27 UFs (`docs/research/confea-sic-analise.md`).

Piso e salário (`data/pisos.json`, `data/cargos-analista.json`):

- Piso de 8 h: R$ 10.302 com a base congelada pelo STF em 03/03/2022 (o único exigível); R$ 13.778,50 na leitura do Confea (8,5 × R$ 1.621); R$ 14.589 na leitura sindical (9 SM).
- Mediana de admissão do engenheiro civil (2142-05): R$ 10.360, de jul/2025 a jun/2026 (Buscador NCM).
- Salário médio CLT por CBO e quanto paga do piso congelado: engenheiro de software 2122-15 R$ 14.443 (140,2%); controle e automação 2021-10 R$ 11.988 (116,4%); engenheiro civil 2142-05 R$ 9.734 (94,5%); engenheiro civil de transportes e trânsito 2142-70, o "analista de projetos viários", R$ 5.847 (56,8%).
- O resultado do ato do "preço do rótulo": 60,1% (2142-70 sobre 2142-05) e 50,0% (analista de sistemas de automação sobre engenheiro de controle e automação).

Emprego (`data/caged-saldos.json`):

- Saldo do Novo CAGED no país: +1.454.124 (2023), +1.693.673 (2024), +1.279.498 (2025).
- Saldo em 12 meses: engenheiro civil −812 (13.332 admissões, 14.144 desligamentos); eletricista −152; produção −71.
- Estoque RAIS 2024 da 2142-05: 60.895 vínculos.

Formação e "fora da área":

- Concluintes de engenharia, recorte estrito: 128.871 (2018), 95.607 (2023). Área CINE 07: 110.596 (2024) (`data/formacao-concluintes.json`).
- Censo 2022: 2.371.066 diplomados na área, 505 mil ocupados como engenheiros, ou seja 21,3% (`data/reguas-fora-da-area.json`).
- Evasão acumulada 68,74% (coorte 2012→2019).
- Ingressantes de 2023: 55% a distância (`data/ead-expansao.json`).

Fiscalização do piso (`data/fiscalizacao-piso.json`):

- Confea Valoriza: 563 denúncias, 275 processos e 199 ações em 25 UFs (2025–2026).
- **Crea-SP: 130 concursos públicos notificados em um ano**, e parceria com a Superintendência Regional do Trabalho.
- Um único auto de infração por piso contra empregador localizado (HCPA, 2015).
- 1.900 auditores-fiscais do trabalho em atividade.

Finanças do Crea-SP (Portal da Transparência, coleta de 08/09/2026, `data/conta-do-conselho.json` e `orgao-maquina.json` do histórico):

- Despesa ("SUB-TOTAL DAS DESPESAS"): R$ 165,8 mi em 2013, R$ 474,3 mi em 2024, R$ 465,5 mi em 2025.
- Receita ("SUB-TOTAL DAS RECEITAS"): R$ 183,6 mi em 2013, R$ 506,7 mi em 2024, R$ 578,6 mi em 2025.
- **Maiores contas de receita de 2013 a 2026: ART R$ 1,673 bi (34,81%)**; anuidade de nível superior R$ 1,051 bi (21,87%); dívida ativa de anuidade PF R$ 290,0 mi (6,03%); anuidade PF do exercício R$ 216,5 mi; dívida ativa de anuidade PJ R$ 156,6 mi (3,26%).
- Diárias e locomoção de conselheiros: R$ 73,1 mi e R$ 58,2 mi; jeton: R$ 10,3 mi (2013–2026).
- O commit `0aed33a` traz uma classificação própria por finalidade para 2021–2026 (R$ 3,80 bi): fiscalização 1,42%, administração 78,37%. É **classificação do autor**, não do portal, e saiu do site.

### 1.5 Métodos

- **Classificação de cargos pela CBO.** Recorte "engenheiro núcleo": famílias 2142 a 2149 mais 2140-05, sem 2141 (arquitetos), com opção de somar 2122 (computação) e 2221 (agro) (`docs/research/mercado-rais.md`). Cada CBO de `data/cargos-analista.json` tem as marcas `ehEngenharia`, `pisoSeAplica` e `identidadeProfissionalPropria`. Os sinônimos oficiais da CBO entram como prova: o MTE lista "analista de projetos viários" como sinônimo da 2142-70. A escada de volume tira, degrau a degrau, quem tem conselho próprio (administrador), a família de TI, a carreira de concurso (APO) e o nível técnico, e escreve o critério na tela. Limite declarado: RAIS e CAGED registram escolaridade, não curso, por isso não se calcula "% de engenheiros contratados como analista"; publica-se o preço do rótulo, não o volume.
- **Taxa de registro, como proxy.** Concluintes por ano (INEP) contra registros novos por ano (SIC). O site declara que não é a mesma coorte (`docs/research/confea-crea.md`, nota 4) e que estoque nunca se divide por fluxo (`/metodologia#estoque-fluxo`). A taxa de registros ativos por Crea (ativos ÷ total) é a métrica de abertura do mapa e mede a evasão do registro (62,4% no PR a 81,5% no MS; `docs/desvios.md`, entrada 43).
- **Coorte.** Só aparece como dado citado: evasão de 68,74% na coorte 2012→2019 (Indicadores de Fluxo do INEP via Abenge) e 65,2% na coorte 2019–2023 da rede privada (Semesp). O repositório não calcula coorte própria.
- **Três leituras do piso.** Fatores de 6, 7,25 e 8,5 salários mínimos por jornada; base congelada em R$ 1.212; marca de descumprimento só contra a leitura congelada (`lib/calculos/piso.ts`, `data/pisos.json`).
- **Quatro, depois cinco, réguas de "fora da área".** IPEA estrita e ampla, CNI, Confea/Quaest e Censo 2022, cada uma com seu denominador; não se somam.
- **Mediana de admissão não é média de movimentações** (`/metodologia#dois-salarios`). Janelas móveis fixadas na data da coleta.
- **Selos e regras de ouro** executáveis no `scripts/validar-dados.ts`; a regra 6 exige o ano do valor em cada item.

### 1.6 O que o repo empresas já usa disto

- `public/data/engineer-statistics/` tem 8 JSON copiados: `confea-genero`, `confea-modalidades`, `confea-registros-ano`, `confea-situacao-uf`, `confea-uf`, `conta-do-conselho`, `pisos` e `populacao-uf`.
- `src/cockpit/publico.ts` importa 7 deles: ranking por UF (ativos por 100 mil habitantes, % de ativos, % de mulheres), série de registros novos Brasil × SP desde 2010, piso de 8 h (Confea e congelado) e despesa publicada. Cita como fonte `https://transparencia.creasp.org.br`, um endereço diferente do usado pelo engineer-statistics. `src/cockpit/PaginaPresidencia.tsx` também cita o Confea e o piso.
- `src/gestao-v14/public-data.ts` lê os snapshots em `/data/engineer-statistics/`, incluindo `confea-modalidades.json`.
- `src/domain/public-indicators.ts` define `publicProfessionalsSp` (346.824 ativos, "recorte CREA-SP no agregado do Confea SIC reproduzido pelo projeto do usuário") e `publishedSalary` (média por CBO "atribuída ao Portal Salário/Novo CAGED/MTE", nacional). Já `src/integrations/catalog.ts:70` põe `user-engineer-statistics.json` entre as fontes **excluídas** de fato automático ("snapshot… sem rotina primária integrada"), e o comentário de `publico.ts` diz que o Portal Salário saiu na V20.
- `src/domain/profissionais.ts:200-215` repete a lista de CBOs e as marcas `engenharia`, `rotuloAnalista` e `piso` do engineer-statistics (2142-05, 2142-70, 2021-10, 2124-05 e outras). As medianas são **fictícias**, calibradas na ordem de grandeza (2142-70 com base de R$ 5.800, contra os R$ 5.847 do Portal Salário). Os microdados de RAIS e CAGED são descritos como "em produção", mas não há coletor.
- Formação em SP: o empresas usa `archives/data-publica-v6/educacao_sp_cine_ano.csv` (concluintes presenciais por curso e ano, INEP), não o engineer-statistics, que só tem números nacionais.
- O que o empresas **não** usa e poderia usar: o bruto `registrosPorGrupo` do Crea-SP (título × gênero, como referência real para o mapa de árvore por modalidade); a série 2010–2022 do Crea-SP já está no cockpit. `cargos-analista` (preço do rótulo) e `fiscalizacao-piso` (Crea-SP com 130 concursos notificados, Res. 397/1995) estão como texto e lista de CBOs, não como dado. A receita do portal (ART 34,8% e dívida ativa) está no histórico do Git. A base analítica `dados` não é lida.

---

## 2. receita-socios-eng (`receita-socios-eng`)

### 2.1 O que é

Pipeline PySpark gerado em abril de 2026 (5 commits, PR #1 de um agente de código). Arquivos: `main.py`, `spark_session.py`, `cnaes_loader.py`, `cnpj_reader.py`, `filters.py`, `joins.py`, `README.md`, `requirements.txt` (pyspark 3.5.3, pandas 2.2.3, openpyxl 3.1.5). **Só código**: não traz dado, não traz a planilha de CNAEs nem amostra, e não tem teste nem CI.

### 2.2 Entradas

- `--excel-cnaes`: planilha `.xlsx` de que o pipeline lê as 3 primeiras colunas (CNAE subclasse, descrição, indicador). Não está no repositório.
- `--empresas-path`, `--estabelecimentos-path`, `--socios-path`: os CSV oficiais do CNPJ aberto da Receita (separador `;`, ISO-8859-1, sem cabeçalho), lidos com schema explícito (`cnpj_reader.py`):
  - Empresas: 7 colunas (`cnpj_basico, razao_social, natureza_juridica, qualificacao_responsavel, capital_social, porte_empresa, ente_federativo_responsavel`).
  - Estabelecimentos: 30 colunas (inclui `situacao_cadastral`, `data_inicio_atividade`, `cnae_fiscal_principal`, `cnae_fiscal_secundaria`, `uf`, `municipio`, endereço, telefone e e-mail).
  - Sócios: 11 colunas (`identificador_socio`, `nome_socio_razao_social`, `cpf_cnpj_socio`, `qualificacao_socio`, `data_entrada_sociedade`, `representante_legal`, `faixa_etaria` e outras).
- O pipeline **não baixa** os arquivos; supõe que já estão num storage (S3, HDFS, GCS ou disco). Não lê as tabelas de domínio da Receita (qualificações, municípios, naturezas, CNAEs) nem o arquivo do Simples/MEI.

### 2.3 Regra de elegibilidade de CNAE (`cnaes_loader.py`)

Uma linha é elegível quando a coluna 3, sem acento e em minúsculas, é `sim` ou `passivel de obrigacao` e o CNAE tem dígitos. O CNAE é reduzido a dígitos e sem repetição. Um estabelecimento entra quando o CNAE principal ou **qualquer** secundário (a lista separada por vírgula é quebrada e explodida) está na lista, num join com broadcast (`filters.py`). A saída junta os CNAEs que casaram em `cnaes_relevantes`, mas **não diz se veio do principal ou do secundário** nem se a marca era "Sim" ou "Passível".

O empresas já tem a mesma planilha: `src/domain/cnae-catalog.json` traz 702 subclasses com `SUBCLASSE`, `DESCRIÇÃO` e `OBRIGAÇÃO DE REGISTRO` (623 "Sim", 15 "sim", 64 "Passível de obrigação"), mapeadas para "Relacionado" (638) e "Depende de análise" (64). É exatamente o formato que o pipeline espera, e a normalização do pipeline aceita o "sim" em minúsculas.

### 2.4 Como liga os sócios (`joins.py`)

O join é **por `cnpj_basico`** (os 8 primeiros dígitos, a empresa), em dois passos: estabelecimentos filtrados `left join` Empresas (só a razão social), depois `left join` Sócios. O tipo do sócio sai de `identificador_socio`: 1 é PJ, 2 é PF, o resto é "OUTROS". A saída tem só 6 colunas: `cnpj, razao_social, cnaes_relevantes, nome_socio, tipo_socio, qualificacao_socio` (a qualificação em código). Escreve em Parquet ou CSV com `overwrite`, repartido por CNPJ. Usa cache, repartição por `cnpj_basico` e execução adaptativa (AQE).

Pontos a corrigir antes de usar no painel:

1. **Sem filtro de UF nem de situação cadastral.** Processa o Brasil inteiro e inclui CNPJs baixados, inaptos e suspensos.
2. **Sócio repetido por filial.** Como o sócio pertence à raiz, cada filial elegível repete todos os sócios: uma empresa com 10 filiais e 3 sócios gera 30 linhas.
3. **A saída perde campos que o painel usa**: UF, município (código da Receita, que precisa de tabela de conversão para o código do IBGE), situação, data de início, porte, natureza jurídica, `cpf_cnpj_socio` (o CPF mascarado), faixa etária e data de entrada na sociedade.
4. **Sem competência na saída.** O `overwrite` impede comparar o arquivo de um mês com o do anterior, que é o plano B da JUCESP no `docs/EMPRESAS.md:55`.
5. Empresas sem sócio ficam com sócio nulo, por causa do left join. Está correto, mas precisa ser tratado na contagem.

### 2.5 Como serve ao painel de Empresas

- **Mercado registrável.** Estabelecimentos ativos em SP com CNAE "Sim" (registro obrigatório) e, à parte, "Passível" (registro a analisar). É o denominador do cartão "parte do mercado registrada" e da conciliação "Receita comparada com o cadastro" (`docs/EMPRESAS.md:25,99`).
- **CNPJs sem registro.** O mercado registrável `anti-join` o cadastro de empresas registradas no Crea-SP (sistema interno, por CNPJ ou raiz) gera a lista de alerta para a Fiscalização e o mapa por município. O pipeline entrega o lado externo; o cruzamento com o cadastro interno não existe nele.
- **Sócios profissionais.** Sócios PF da lista ligados ao cadastro de profissionais (nome mais CPF) alimentam "sócios que são profissionais", "sócio que é RT da própria empresa" e "nome com engenharia e diretoria" (`docs/EMPRESAS.md:28,34-40,135`).
- **Evolução.** Com `data_inicio_atividade` e uma coluna de competência, o mesmo pipeline daria "aberturas na Receita" por mês e a "inclusão de engenharia no contrato social" (o CNAE elegível que aparece entre um mês e o seguinte).
- O empresas não tem coletor da Receita: `src/integrations/catalog.ts:57` registra `rfb-cnpj` como `blocked-unconfigured`. A primeira pendência listada lá é "Coletor de arquivos oficiais e validação de completude". O receita-socios-eng cobre a transformação, não a coleta.

### 2.6 O que exigiria o CPF completo

O CNPJ aberto publica o sócio PF com o nome completo e o CPF mascarado (6 dígitos centrais visíveis, `***NNNNNN**`). O `docs/EMPRESAS.md:54` registra isso como plano B. O formato da máscara é conhecimento geral: não foi conferido em arquivo deste repositório, que não traz dado.

- **Sem o CPF completo.** O Crea-SP tem o CPF completo dos profissionais. Basta gerar a máscara de cada um e casar pelo par (6 dígitos, nome normalizado). Isso identifica quase todos os sócios profissionais; os homônimos com os mesmos 6 dígitos ficam como candidatos. O pipeline já lê `cpf_cnpj_socio`, mas não o põe na saída.
- **Com o CPF completo**, que só a Receita (ou o Serpro) fornece por acordo, e que o `docs/EMPRESAS.md:40` diz depender de acordo:
  - ligação determinística, sem candidatos;
  - aplicação do art. 5º da Lei 5.194/66 às empresas com "engenharia" no nome, sem o rótulo "demonstrativo";
  - ligação segura do sócio com o RT, as ARTs e a situação do registro (por exemplo, sócio com registro cancelado ou suspenso numa empresa de engenharia);
  - rede de sócios entre empresas;
  - auditoria de identidade para atos com efeito jurídico. A máscara não serve de prova (`src/integrations/catalog.ts:62`: "CPF parcial ou nome de sócio não comprova identidade de profissional").
- LGPD: o README do pipeline pede finalidade, minimização e controle de acesso. O empresas já registra "Regras de finalidade, minimização e acesso ao QSA" como requisito pendente.

---

## 3. pncp-engineering-activity (`pncp-engineering-activity`)

- **Cópia local**: a pasta só tem `.git`. Há um único commit, `efe8584` (03/08/2026, "Remove material não relacionado a este repositório"), **sem pai e com árvore vazia** (`4b825dc…`). Os ramos locais `claude/project-thread-howjz2` e `claude/vibrant-allen-ktd2ww` apontam para ele. O clone não é raso (`git rev-parse --is-shallow-repository` = false). `git log --all --stat` não mostra arquivo nenhum.
- **No GitHub** (consulta só de leitura com `gh api`): a descrição do repositório é "Avaliação de serviços de engenharia no PNCP", criado em 01/06/2026. Existe um terceiro ramo, `claude/claude-md-docs-i6l4sr`, que não veio para a cópia local, com 3 commits de 12/06 a 26/07/2026: `build_dashboard.py` (470 linhas, openpyxl), `Portfolio_Inovacao_CREA_Dashboard_Estrategico.xlsx`, `.gitignore` e `CLAUDE.md`. É um gerador de planilha do **"Portfólio de Inovação CREA-SP"**: 23 projetos com nota de impacto, esforço, viabilidade e urgência, um score (`0,35·Impacto + 0,15·(6−Esforço) + 0,25·Viabilidade + 0,25·Urgência`), prioridade, matriz impacto × esforço e uma matriz BCG adaptada. Entre os projetos:
  - SUPFIS: esteira digital de autos de infração; cruzamento CNAE × ART × quadro societário; inteligência de laudos e ART; hub interinstitucional de dados fiscalizatórios;
  - Atendimento: bot omnichannel; painel de SLA da Carta de Serviços;
  - SUPCOL: publicação automatizada com anonimização; pesquisa de decisões plenárias; prazos e renovação do terço;
  - GGP: BI de RH;
  - PMO corporativo.
  O commit vazio removeu isso por ser "não relacionado".
- **Nunca houve código de PNCP neste repositório.** O coletor de PNCP do projeto está no empresas (`scripts/integrations/pncp.ts`).
- Os 23 projetos do portfólio servem de lista de iniciativas para a Presidência e confirmam a demanda pelo cruzamento CNAE × ART × QSA, que é o caso do receita-socios-eng. Não é dado.

---

## 4. Cruzamentos interno × externo de alto valor

1. **Receita (CNAE elegível, estabelecimento ativo em SP) × cadastro de empresas do Crea-SP** dá a lista de CNPJs sem registro e a parte do mercado registrada por município e câmara. Externo: receita-socios-eng com filtro de SP e situação ativa, e `src/domain/cnae-catalog.json`. Interno: cadastro de empresas. Serve a Empresas e à Fiscalização (alerta e lista de fiscalização). É o cruzamento de maior retorno e só depende do dado aberto, mensal.
2. **QSA da Receita × cadastro de profissionais (CPF completo do lado do Crea)** dá sócios profissionais, sócio que é RT e empresas com "engenharia" no nome sem profissional entre os sócios. Viável já com o CPF mascarado; o CPF completo depende de acordo com a Receita.
3. **Novo CAGED e RAIS por CBO e município × piso da Lei 4.950-A** dá a parte dos empregos abaixo do piso congelado por ocupação e regional, incluindo o rótulo de "analista" (2142-70 paga 56,8% do piso). Externo, público e agregado: microdados do PDET ou da Base dos Dados. O engineer-statistics não tem coletor; tem o recorte de CBOs, o SQL de referência e o método. Serve a Profissionais (Trabalho) e Fiscalização. Em nível de empresa, só com RAIS identificada ou eSocial por acordo com o MTE, que é a proposta 2 do engineer-statistics (`components/atos/AtoPropostas.tsx:146-185`) e está no `docs/EMPRESAS.md:59`.
4. **Confea SIC (27 Creas) × cadastro interno** dá referências externas para o Crea-SP: % de ativos (77,8% contra 72,7% no país), mulheres (16,1% contra 20,3%), ativos por 100 mil habitantes (752,6) e registros novos (SP com 14.917 em 2022, contra 20.480 em 2010). O bruto por título e gênero permite comparar a composição por modalidade do Crea-SP com a dos outros Creas. Serve a Profissionais e à Presidência. Frequência: o SIC é público e atualizado pelo Confea; a frequência diária é citada em `docs/research/confea-crea.md` e não foi confirmada.
5. **INEP (concluintes por curso e IES em SP) × registros novos do Crea-SP** dá a taxa de registro em 24 meses por instituição e canal. O engineer-statistics só tem números nacionais secundários e o método do proxy; o empresas já tem o CSV de SP. Serve a Profissionais (Formação) e Conselho (representação das IES).
6. **Portal da Transparência do Crea-SP × sistemas internos (arrecadação, GovAdm)**: receita realizada por exercício, peso da ART (34,8%), anuidades e dívida ativa PF e PJ. É a referência pública para conferir o "meta × realizado" do painel Financeiro, além da despesa, das diárias por tipo de beneficiário e do centro de custo a partir de 2021. Hoje só há agregados (`data/conta-do-conselho.json` e `orgao-maquina.json` no histórico); o coletor está fora do repositório.
7. **Concursos e editais abaixo do piso × fiscalização do Crea-SP**: 130 concursos notificados num ano (`data/fiscalizacao-piso.json`) e o funil do Confea Valoriza (563 denúncias, 275 processos e 199 ações no país). É linha de base para o indicador de fiscalização do piso. A Res. Confea 397/1995 dá a competência; o engineer-statistics não localizou caso de aplicação contra empregador privado.

---

## 5. Quadro por painel

| Painel | O que entra destes repositórios | Natureza e fonte | Acesso | Frequência | Já existe no empresas? |
|---|---|---|---|---|---|
| **Empresas** | Pipeline de CNAE elegível × estabelecimento × sócios (receita-socios-eng): mercado registrável, CNPJs sem registro, sócios profissionais, aberturas, inclusão de engenharia no CNAE | Só código, sobre o CNPJ aberto da Receita | Público, mais o cadastro interno; CPF completo por acordo | Mensal (arquivo da Receita) | Telas prontas com dado demonstrativo; catálogo de CNAE igual (`cnae-catalog.json`); sem coletor (`rfb-cnpj` bloqueado). O pipeline seria o motor |
| **Profissionais** | SIC: Crea-SP × Brasil (ativos, situação, gênero, títulos por modalidade, registros novos 2010–2022); classificação de CBOs e "preço do rótulo"; 3 leituras do piso; método da taxa de registro e evasão | SIC real (30/08/2026); CBO e salários secundários (Portal Salário, Buscador NCM); INEP citado | Público, sem chave | SIC sob demanda (coletor pronto); salários parados em ago/2026 | Usa `confea-*`, `pisos` e a lista de CBOs (com medianas fictícias); não usa o bruto por título nem `cargos-analista` como dado |
| **Fiscalização** | Lista de CNPJs sem registro (Receita); empregos abaixo do piso por CBO e município (CAGED e RAIS, a coletar); Res. 397/1995, funil do Confea Valoriza, 130 concursos notificados pelo Crea-SP, auditores-fiscais | Pipeline (código); `fiscalizacao-piso.json` (real, transcrito) | Público; RAIS identificada por acordo com o MTE | Mensal (Receita e CAGED); anual (RAIS) | Não consta o funil do piso; o PNCP vem do coletor próprio do empresas |
| **Gestão do Conselho** | Pouco: série de registros e modalidades como contexto para as câmaras; o portfólio do ramo removido do pncp (prazos do terço, decisões plenárias) | Real (SIC); lista de projetos (não é dado) | Público | — | O cockpit tem o contexto do Confea |
| **Financeiro** | Receita e despesa realizadas por exercício de 2013 a 2026, maiores contas de receita (ART 34,8%, anuidade, dívida ativa PF e PJ), subgrupos de despesa, diárias, locomoção e jeton por tipo de beneficiário, centro de custo 2021–2026, empenhos e anulações | Agregados reais do Portal da Transparência do Crea-SP (`conta-do-conselho.json`; `orgao-maquina.json` em `git show f51b71e^`); coletor ausente | API pública sem cadastro; os sistemas internos são a fonte primária | Coletas sucessivas, última em 08/09/2026 | O cockpit usa só `conta-do-conselho` (despesa); a receita e a dívida ativa do histórico não foram aproveitadas |
| **Atendimento** | Nada de dado. O portfólio removido cita painel de SLA da Carta de Serviços e bot omnichannel | Lista de projetos | — | — | — |
| **Presidência** | Comparação do Crea-SP com os 27 Creas (por 100 mil habitantes, % de ativos, % de mulheres); piso exigível × leitura do Confea; receita e despesa do portal; portfólio de 23 iniciativas com score e prioridade (GitHub, ramo `claude/claude-md-docs-i6l4sr`) | SIC real; portal real; portfólio é planilha de gestão | Público; o portfólio está num ramo do GitHub | SIC sob demanda | `src/cockpit/publico.ts` já mostra UF, registros, piso e despesa |

**Riscos e cuidados:**

- Os números do engineer-statistics são, na maioria, `citado`: reproduções secundárias, nacionais, com janela móvel fixada em ago/2026. O empresas já os exclui como fonte automática, e isso deve continuar.
- A SIDRA 2984 está vazia e é do Censo 2000, não de 2010.
- A série do Crea-SP no SIC termina em 2022.
- Títulos não são pessoas.
- No portal do Crea-SP, agregados de endpoints diferentes não se somam, e a classificação por finalidade é do autor do site, não do conselho.
