# Achados: TCC do PNCP (pncp-engineering-analytics e engineering-analytics-pncp)

Leitura feita em 07/11/2026, só leitura, nas cópias locais. Caminhos relativos à raiz de cada repositório. `final.ipynb` abaixo é `notebook/subenquadramento_pncp_final.ipynb` (dev) = `subenquadramento_pncp_final.ipynb` (cópia limpa); os dois arquivos são idênticos byte a byte (`cmp`), então as linhas citadas valem para os dois.

## 0. Qual é o mais recente e qual foi o do TCC

- **Mais recente: `pncp-engineering-analytics`, ramo `x/claude/identify-engineering-underclassification-nImeQ`, último commit de 12/09/2026** ("Enxuga a conclusao para tres itens por coluna"). Os 20 arquivos que esse ramo muda em relação ao `main` (01/09) são os decks da apresentação (`docs/apresentacao/TCC__PNCP__Caio_Serra_dez.pptx`, `_video.pptx`, `adapta_deck_mba.py`, `gera_deck_dez.py`), o caderno enxuto (`notebook/subenquadramento_pncp_simples.*`, `monta_caderno_simples.py`) e a remoção de quatro scripts soltos da raiz (`pncp_analise (1).py`, `pncp_camada2 (1).py`, `pncp_camada3.py`, `pncp_coleta.py`) e da planilha duplicada `cnaes_crea (1).xlsx`. Não há rodada nova: os números continuam os da rodada de 31/07/2026.
- **Usado no TCC (versão publicada): `caiofvserra/engineering-analytics-pncp`**, 4 commits em 01/09/2026, com o README "Resultados da execução publicada" (`README.md:66-71`) e o caderno de entrega idêntico ao do dev. O `sistema/`, os decks, o relatório Word e os testes só existem no dev. O `empresas` já cita essa cópia limpa como origem do agregado PNCP de um dia (`src/domain/pncp-public-aggregate.json:7-8`, commit `88ba127`, que é o último da cópia limpa).
- Na prática: a cópia limpa é a vitrine do método; o dev é onde estão as provas (números da rodada, figuras, sistema operacional, histórico). Para o projeto empresas, o que se reaproveita vem do dev.

## 1. Repositório `pncp-engineering-analytics` (desenvolvimento)

### 1.1 O que é

TCC do MBA em IA e Big Data (ICMC/USP). Pergunta: entre os contratos do PNCP de SP que o próprio órgão publicou como "serviços gerais" (categoria 8), quais são obra ou serviço de engenharia (categorias 7 e 9) sem o rito de engenharia (ART, projeto básico, responsável técnico). O valor do contrato fica fora de todas as saídas por decisão do autor (`CLAUDE.md:12-23`). Produto: lista de contratos para o Crea-SP conferir no PNCP, com link (`CLAUDE.md:22-23`). A cópia local do `main` é rasa (1 commit visível, merge do PR #10 em 31/08/2026); o ramo tem 60 commits visíveis.

Fonte do método e dos números: `CLAUDE.md` (atualizado em ago/2026) e `docs/apresentacao/relatorio_vivo_atual.md`, que o próprio `CLAUDE.md:91,152` declara "fonte da verdade para todo número". `notebook/CONTEXTO_PROJETO.md` é handoff de julho com números da rodada anterior (550 casos, qwen2.5:32b, limiar 0,30) e está desatualizado (`CLAUDE.md:186-198`).

### 1.2 Período e volume coletado

- Fonte primária: API pública de consulta do PNCP, `https://pncp.gov.br/api/consulta/v1/contratos`, mês a mês, 500 registros por página, até 1.000 páginas por mês, categorias 7, 8 e 9, filtro de UF=SP feito em Python depois do download (`final.ipynb:731-745`; `pncp/config.py:25-30`). Coleta retomável por mês, em parquet.
- Período: jan/2024 até a data da coleta. `CLAUDE.md:101-104` diz coleta de 9 a 19/05/2026, cobrindo jan/2024 a ~19/05/2026, com resíduo de 2023 e nenhum mês truncado. O deck mais recente diz "jan/2024 a mai/2026" (slides 10 e 12 do `TCC__PNCP__Caio_Serra_dez.pptx`, no ramo). O relatório Word `docs/relatorio/SERRA_Caio_relatorio_final.docx` (Etapa 1) diz "até a data da coleta, em julho de 2026". Divergência não resolvida no repositório; o `CLAUDE.md` é o mais explícito.
- Volume: parquet da coleta com 129.742 contratos (engenharia 4.722, geral 121.056, obras 3.964). Depois de descartar objetos com 20 caracteres ou menos, a base de trabalho tem **126.465 contratos: 117.882 gerais (93,2%), 4.667 engenharia, 3.916 obras** (`relatorio_vivo_atual.md:5-6, 252-254`).
- Campos guardados por contrato: número de controle do contrato e da compra, categoria, objeto e informação complementar, valores, data de publicação, UF, município e razão social do órgão, CNPJ/CPF e nome do fornecedor (`final.ipynb`, célula 8, função `_aplanar`). O fornecedor é coletado, mas não vai para a lista final (ver 1.5).

### 1.3 Método em uma linha por etapa (13 etapas, 4 fases)

`CLAUDE.md:95-148`; deck `dez`, slide 11.
1. Coleta (acima). 2. Pré-processamento: chave de texto sem acento e pontuação e chave de grupo sem dígitos, para julgar cópias uma vez e não vazar quase-duplicatas na validação. 3. Embeddings `BAAI/bge-m3`, 1.024 dimensões, 192 tokens. 4. Triagem PU: K-Means k=8 sobre os 8.583 positivos declarados; candidato = 30% de maior similaridade máxima aos 8 protótipos (corte 0,680), 35.365 candidatos e 82.517 negativos fracos. 5. Clusters descritivos (k=6, silhueta 0,050). 6. Oito classificadores, ensemble dos 3 melhores, calibração. 7. Pontuação `prob × (0,5 + 0,5 × percentil da similaridade)`. 8. Rotulação manual pelo engenheiro (195 de validação + 95 reservados). 9. Limiar por `StratifiedGroupKFold(5)`, critério F1. 10. Revisão por LLM local `gemma3:27b` (Ollama, temperatura 0,2, JSON com classe, confiança, porte, motivo; rubrica de 10 regras). 11. Realimentação: 10.000 vereditos da LLM com confiança ≥ 0,6 voltam ao treino com peso 2 (humano 3). 12. Verificação do rito nos documentos (12 marcadores, OCR) e conferência do CNAE do contratado. 13. Consolidação e entrega (CSV/XLSX, mapa, banco de precedentes, pacote de reuso).

### 1.4 Números do resultado final (rodada de 31/07/2026)

Todos de `docs/apresentacao/relatorio_vivo_atual.md`, salvo indicação.

| Medida | Valor | Linha |
|---|---|---|
| Base de trabalho | 126.465 (117.882 gerais) | 5-6 |
| Candidatos da triagem PU | 35.365 (corte 0,680), 82.517 negativos | 11-14 |
| Melhor classificador isolado | MLP, F1 macro 0,939 sobre rótulos fracos (concordância interna, não acerto) | 64-76 |
| Limiar após rotulação manual | 0,08 (CV agrupada): precisão 83,9%, recall 85,2%, F1 0,846 | 93 |
| Suspeitos acima de 0,08 | 31.805 | 94 |
| Conjunto reservado, limiar 0,08 (n=95) | precisão 65,9%, recall 93,1%, F1 0,771; ROC-AUC 0,950, PR-AUC 0,881 | 83-88 |
| Revisados pela LLM | 31.603 → 11.738 confirmados (37%); +184 decididos pelo rótulo do engenheiro = **11.922 confirmados** | 132-134 |
| Limiar após realimentação | 0,45 (suspeitos 31.805 → 11.610) | 142 |
| Reservado com modelo realimentado | precisão 78,8% (IC95 62–89%), recall 89,7% (IC95 74–96%), F1 0,839; recall populacional 72,4% (Horvitz-Thompson); ROC-AUC 0,947, PR-AUC 0,883 | 143-148 |
| Estimativa de casos de engenharia entre os gerais | ~12.636 (após realimentação); ~23.604 antes | 87, 147 |
| Baseline lexical (TF-IDF + logística) | F1 0,727 contra 0,771 do pipeline no reservado | 121-124 |
| Documentos | 7.383 PDFs baixados, 2.471 lidos por OCR | 153 |
| **Desfechos do rito (11.922)** | **525 subenquadramento real**, 596 rito parcial, 274 revisão de pequeno porte (596+274 = 870 "casos em aberto"), 9.841 rotulação incorreta com processo ok, 677 PDF ilegível, 7 sem compra, 2 sem documento | 154-159; figura `docs/metodologia/figs_rodada/11_rito.png` |
| Segunda leitura (dupla checagem) | 857 casos, 332 em aberto | deck `dez`, slide 17 |
| Banco de precedentes | 16.773 casos decididos com embeddings | 182 |

Funil: 126.465 → 117.882 gerais → 31.805 acima do limiar → 11.922 confirmados → 525 sem evidência de rito, ou 0,45% dos gerais (`relatorio_vivo_atual.md:158`; deck `dez`, slide 19).

### 1.5 Distribuição dos 525 casos

- **Por município** (deck `dez`, slide 20): Mococa 111 (21,1%), Lençóis Paulista 74 (14,1%), os dois somados 185 (35,2%). O gráfico `docs/metodologia/figs_rodada/12_consolidado.png` (painel superior direito, leitura do gráfico, números não escritos) mostra a seguir São Paulo (~32), Santa Fé do Sul (~19), Peruíbe (~17), Itu (~15), Tarumã (~12), Sertãozinho (~11), Botucatu (~10), Araçatuba e Registro (~9), Leme (~8). Divergência interna: `docs/apresentacao/gera_slides_resultados.py:378` diz "183 dos 525"; `CLAUDE.md:184`, `docs/relatorio/corrige_relatorio_v8.py:190` e o deck dizem 185.
- **Por órgão** (mesmo PNG, painel superior esquerdo, leitura do gráfico): Município de Mococa (~111), Município de Lençóis Paulista (~72), Município de Santa Fé do Sul (~19), Município de Peruíbe (~16), Secretaria da Segurança Pública do Estado (~12), Município de Tarumã (~12), Unesp (~12), Município de Itu (~11), Município de Registro (~9), um serviço autônomo de água e esgoto (~7), Município de Valinhos (~7), Município de Sertãozinho (~6). A concentração é de órgão, não de região: o Word diz que "o esforço rende mais concentrado em poucos órgãos contratantes" (`corrige_relatorio_v8.py:194-202`).
- **Por GRE**: o repositório **não traz contagem por GRE**. O mapa `docs/metodologia/figs_rodada/12_mapa_sp.png` pinta os municípios com contorno e número das 16 GREs. Cruzando os municípios do gráfico com `GRE.xlsx` (feito nesta leitura, não está no repo): Mococa e Leme estão na GRE12 (Mogi Guaçu), Lençóis Paulista e Botucatu na GRE08 (Bauru), Santa Fé do Sul na GRE09, Peruíbe e Registro na GRE07 (Santos), Itu e Valinhos na GRE02, Tarumã na GRE16, Sertãozinho na GRE03, Araçatuba na GRE01, São Paulo na GRE05. Ordem de grandeza: GRE12 ≥ ~119 e GRE08 ≥ ~84 casos. Para ter o número certo é preciso a lista de 525 linhas, que está no Google Drive do autor.
- **Por tipo de engenharia mais próximo** (protótipo, mesmo PNG): "engenharia, topografia, imóvel" ~195; "construção, adequação, manutenção" ~152; "obra, projeto" ~126; "rua, obra, local" ~33; os demais abaixo de 10. O slide do ramo diz "o tipo mais frequente não é obra nova: é engenharia, topografia e adequação de imóvel" (`gera_slides_resultados.py:378-380`).
- **Por objeto** (deck `dez`, slide 20): 297 textos distintos em 525 contratos. Os que mais se repetem: serviço de mão de obra mecânica (61), material e mão de obra (36), instalação de equipamentos (25), avaliação de imóveis (25), manutenção e conservação de bens imóveis (9), instalações diversas (9), podas e supressão de árvores (8), sistema de alarme (5), divisórias (4), laudos técnicos (3). Aparecem também ar-condicionado, AVCB, drywall, pintura predial, regularização fundiária, mapa municipal. Há objetos que sugerem falso positivo (por exemplo "utilidade pública - energia elétrica", 3, e contratação da concessionária de distribuição, 2), o que reforça que a lista é para conferência e não para autuação.
- **Por CNAE do contratado** (Etapa 12, fecho): dos 525, 493 têm CNPJ e **32 têm CPF** (pessoa física). Pela lista do Crea-SP, dos 493: 363 obrigatórios (73,6%), 117 passíveis, 13 não sujeitos; **130 (26,4%) com contratado cuja atividade não obriga registro**, contra 5,5% nos de rito presente (`relatorio_vivo_atual.md:237-243`; deck `dez`, slide 18). Pelo CNAE de engenharia (prefixos 41, 42, 43, 711, 7120): 282 com algum CNAE de engenharia, 211 sem nenhum, 32 sem consulta; sem CNAE de engenharia são 40,2% dos 525 contra 11,3% dos de rito regular (`relatorio_vivo_atual.md:272-279`). O slide do ramo resume a fila sob a premissa do Crea-SP: 363 dos 525 já estariam no cadastro, sobram 162 para revisão humana, 101 deles em Mococa e Lençóis Paulista (`gera_slides_resultados.py:429-431`).
- **CNAE na base inteira** (universo diferente: 124.518 contratos com CNPJ do parquet cru, `relatorio_vivo_atual.md:250-259`): 36.452 fornecedores consultados na Receita; 18.001 com atividade de registro obrigatório e 9.244 "passível" pela lista. Entre os gerais, 29,2% têm algum CNAE de engenharia e 9,3% como atividade principal (10.740 contratos). Desses 10.740, 4.376 não chegaram à fila do classificador: é o tamanho do sinal que o CNAE acrescentaria sozinho (`relatorio_vivo_atual.md:191-221, 261-266`). Entre os declarados engenharia/obras, 177 têm contratado sem nenhum CNAE compatível (`:221`).

### 1.6 Os 12 marcadores do rito e a regra

Definidos em `final.ipynb:3896` em diante (célula 47, `MARCADORES`), aplicados com `re.IGNORECASE` sobre o texto extraído (PyMuPDF; OCR Tesseract de até 8 páginas a 200 dpi quando o texto tem menos de 300 caracteres, `final.ipynb:3949`; até 5 documentos por contrato, `:3866`; documentos da compra, com recurso aos anexos do contrato).

| Marcador | O que procura |
|---|---|
| ART | "anotação de responsabilidade técnica" ou a sigla `\bART\b` |
| CREA | `CREA` seguido de até 2 caracteres, "Conselho Regional de Engenharia" |
| ENGENHEIRO_RESP | "engenheiro(a) responsável", "responsável técnico" |
| ATESTADO_CAP_TEC | "atestado de capacidade técnica" |
| PROJETO_BASICO | projeto básico, projeto executivo, memorial descritivo |
| OBRA_SERV_ENG | obra de engenharia, serviço(s) de engenharia |
| ABNT_NORMA | ABNT NBR número |
| LEI_14133_ENG | art. 6º, XII ou XX/XXI |
| PLANILHA_ORCAMENTARIA | planilha orçamentária, orçamento sintético/analítico, composição de custos, BDI, SINAPI, SICRO |
| CRONOGRAMA_FIS_FIN | cronograma físico-financeiro |
| CADERNO_ENCARGOS | caderno de encargos, memorial de cálculo |
| EXECUCAO_OBRA | alvará de construção, habite-se, diário de obra, as built |

Regra de decisão (`final.ipynb:4552` e célula 48 no extrato): **2 ou mais marcadores = processo ok, decidido antes da LLM**. Com 0 ou 1, vale a LLM sobre janelas de texto ao redor dos termos: "sim" vira processo ok, "parcial" vira rito parcial, LLM muda vira rito parcial; "não" com porte pequeno vira revisão de pequeno porte; "não" com porte relevante passa por uma segunda leitura cética que precisa confirmar a ausência, senão vira rito parcial. Só "não" confirmado vira `subenquadramento_real`. Resultado de uma compra é propagado aos contratos da mesma compra, reaplicando o porte de cada contrato.

O pacote `pncp/_marcadores.py:62-104` tem uma versão anterior com 8 categorias (sem as 4 últimas) e score 0 a 9; não é a que gerou os números.

### 1.7 O que o repositório guarda de dado

- **Não há resultado tabular salvo no repo.** Nenhum CSV, parquet, joblib de resultado (o `.gitignore` exclui `dados/`). A lista de 525 linhas (`12_LISTA_CREA_subenquadramentos.csv/.xlsx`), o consolidado, o veredito da LLM, o rito, o cache de CNAE e o pacote de reuso ficam no Google Drive do autor, pasta `PNCP_TCC/` (`CLAUDE.md:37-38`; `final.ipynb:168-175`). O caderno está **sem saídas gravadas** (nenhuma célula com output no `.ipynb`).
- **Há números agregados reais**: `docs/apresentacao/relatorio_vivo_atual.md` (saída real da rodada final), as 18 figuras de `docs/metodologia/figs_rodada/` (com números escritos em `11_rito.png`, `11b_funil.png`, `08_curva_limiar.png`; barras sem rótulo em `12_consolidado.png`; mapa em `12_mapa_sp.png`), os decks `.pptx` e os relatórios Word (`docs/relatorio/SERRA_Caio_relatorio_final.docx` de 04/08/2026 traz o método em 14 etapas, o relatório vivo como anexo e a conclusão ainda em modelo; `SERRA_Caio_relatorio_v6_discussao.docx` traz a seção 4.5 Discussão escrita).
- **Planilha real**: `cnaes_crea (1).xlsx` (igual à `cnaes_crea.xlsx` da cópia limpa; removida no ramo).
- Colunas da lista para o Crea (`final.ipynb:5068`): item, controle PNCP, link do contrato, link do processo, município, UF, órgão, objeto, tipo de engenharia provável, probabilidade, motivo da LLM, marcadores, documentos analisados, parecer da dupla checagem. **Não tem o CNPJ/CPF do contratado**, embora o parquet o tenha (`niFornecedor`). Para cruzar com ART e registro do Crea-SP, o CNPJ precisa ser recolocado a partir do parquet pelo número de controle.

### 1.8 O `sistema/` (backend e frontend)

"Monitor de Subenquadramento de Engenharia" (`sistema/README.md`), produto operacional independente do caderno, **com dado de demonstração** quando não há arquivo de importação.
- Backend FastAPI + SQLite (`sistema/backend/main.py`, `db.py`): tabelas `contratos`, `triagem`, `rito`, `config`, `eventos` (`db.py:21-47`). Endpoints de estatística, ranking, fila de triagem, veredito da LLM, fila e análise de rito, veredito do rito pelo revisor, treino, ingestão manual, configuração e histórico (`main.py:44-150`).
- Classificador próprio mais leve que o do TCC: TF-IDF + regressão logística calibrada, em CPU (`classifier.py`; README, "Desenho"). Limiar padrão 0,6 (`config.py:33`). Re-treino a partir da triagem humana (`learning.py`).
- Ingestão contínua do PNCP pelo `/v1/contratos`, a cada 30 dias por padrão, UF configurável (`pipeline.py:117-148`; `scheduler.py:26-27`; `config.py:40`).
- Rito: resolve a compra, baixa até 3 documentos, procura 9 marcadores próprios (ART/CREA juntos, responsável técnico, projeto básico, planilha, BDI, SINAPI/SICRO, cronograma, ABNT, atestado), **sem regra automática**: quem decide "rito seguido" ou "subenquadramento real" é o revisor (`rito.py:21-36, 131-158`). LLM opcional (Ollama).
- Frontend estático: Painel, Ranking, Triagem, Rito, Modelo e IA, Configuração, Histórico (`sistema/frontend/index.html`, `app.js`).
- Dados de demonstração inventados (`pipeline.py:11-34`, `rito.py:40-66`). Não conversa com CreaNet nem com base de ART.

### 1.9 Fundamentos legais (`notebook/fundamentos_legais.md`)

Resumo de referência; o código usa um digesto condensado (`CTX_LEGIS`). Lei 5.194/1966 (arts. 7º, 13 e 55); Lei 6.496/1977, art. 1º (todo contrato de engenharia sujeito à ART, "sem exceção por valor ou porte"), arts. 2º e 3º; Res. Confea 1.025/2009 (tipos de ART: obra/serviço, múltipla, cargo/função; números de artigo "a conferir"); Lei 14.133/2021, art. 6º, XII (obra) e XXI (serviço de engenharia, comum e especial), com o ponto-chave de que o serviço comum de engenharia continua exigindo rito; Lei 12.378/2010 (RRT/CAU não conta como rito do Crea); atribuições por modalidade (Res. 218/1973 arts. 1º, 4º, 6º, 7º, 10, 11, 12, 18, 21; Res. 1.156/2019 art. 2º; Lei 4.076/1962 art. 6º para sondagem e geotecnia; Res. 1.073/2016). Nota final: porte "pequeno" é priorização, não dispensa de ART (`fundamentos_legais.md:170-174`). O próprio arquivo pede conferência das transcrições nas fontes oficiais (`:5-8`).

### 1.10 Limitações declaradas

- Ausência de marcador no documento publicado não prova ausência de ART: a anotação pode existir e não estar no PNCP (Word final, Etapa 12; README da cópia limpa `:75-77`; deck do ramo, `adapta_deck_mba.py:757-761`).
- A LLM só julgou o que passou do limiar; a realimentação corrige falsos positivos do topo e não recupera falsos negativos da cauda (`relatorio_vivo_atual.md:149`).
- Positivos declarados não são amostra aleatória dos positivos verdadeiros (hipótese de Elkan e Noto assumida de forma aproximada); se o subenquadramento for seletivo por tipo de serviço, o viés passa ao modelo (Word final, Etapa 4).
- 677 PDFs ilegíveis mesmo com OCR ficaram como indeterminados.
- O CNAE diz da empresa, não do objeto nem da modalidade (`v6_discussao`, 4.5; deck `adapta_deck_mba.py:759`).
- Um único anotador; um estado e um período (README da cópia limpa `:77-80`).
- Pequenas variações de contagem entre máquinas por ponto flutuante em CPU; os números vêm de uma execução (Word final, 3.5).
- A lista "não acusa ninguém": é ordem de prioridade (README `:82`).

### 1.11 Ponto fraco que o TCC não declara: marcadores genéricos e a sigla ART

O orquestradorfiscaliza mediu e corrigiu três defeitos que estão presentes nos 12 marcadores do TCC (comparação na seção 4):
- `\bART\b` com `IGNORECASE` acende em "art. 75" (abreviação de artigo), que aparece em quase todo termo de referência (`orquestradorfiscaliza/src/orquestrador/coleta/pncp_docs.py:79-93`).
- `CREA` seguido de até dois caracteres acende em "CREAS" (centro de assistência social) (`pncp_docs.py:94-97`).
- `XX(?:I+)?` acende em XX, XXII e XXIII do art. 6º; o XXIII (termo de referência) abre quase todo TR (`pncp_docs.py:112-124`). O caderno enxuto do ramo usa `art\.?\s*6[ºo].{0,40}(XII|XXI)`, que também casa XXIII.
- "Responsável técnico", atestado, projeto básico e ABNT são moldura de habilitação de qualquer contratação; limpeza predial marcou 4 categorias no teste do orquestrador (`rito_engenharia.py:11-17`).

Como a regra do TCC é "2 marcadores quaisquer = processo ok", esses defeitos empurram casos para `rotulacao_incorreta_processo_ok` (9.841) e tiram casos da lista de 525. A direção do erro é a de **subestimar** a lista. Isso não foi medido; dá para medir relendo o cache de PDFs (Drive) com a regra do orquestrador (2 marcadores com pelo menos 1 específico, sigla ART em caixa alta). É o primeiro trabalho antes de usar os 9.841 como "rito presente" em qualquer painel.

### 1.12 Divergências internas a registrar

| Ponto | Fonte A | Fonte B |
|---|---|---|
| Fim da coleta | maio/2026 (`CLAUDE.md:101-104`; deck `dez`) | julho/2026 (Word final, Etapa 1) |
| Número de etapas | 13 (`CLAUDE.md`, caderno, decks, README limpo) | 14, com CNAE como Etapa 13 (Word final de 04/08) |
| Mococa + Lençóis | 185 (deck, `CLAUDE.md:184`) | 183 (`gera_slides_resultados.py:378`) |
| Nome do caderno | `subenquadramento_pncp_final.ipynb` (arquivo na cópia limpa) | README manda abrir `subenquadramento_pncp.ipynb` e lista saídas `lista_crea.csv`, `rito.csv` (nomes do caderno enxuto do ramo); o caderno final grava `12_LISTA_CREA_subenquadramentos.csv`, `11_analise_rito.csv` |
| Atividade do contratado | 130 de 493 (26,4%) | `CLAUDE.md:159-163` pede "a reconferir" com a célula 11.2b |

## 2. Repositório `engineering-analytics-pncp` (cópia limpa)

- `README.md`: método em 4 fases e 13 etapas, entradas (API do PNCP sem chave, `cnaes_crea.xlsx`, `GRE.xlsx`), saídas, resultado publicado (126.465 → 117.882 → 31.805 → 11.922 → 525; 9.841 com rótulo errado e rito presente) e limitações. Recomenda Colab com A100 ou L4 (gemma3:27b não cabe numa T4).
- `subenquadramento_pncp_final.ipynb`: idêntico ao do dev, 60 células, sem saídas.

### 2.1 `cnaes_crea.xlsx` (lista de CNAEs sujeitos a registro)

- Conteúdo: aba única, 702 subclasses CNAE (7 dígitos, sem duplicata), colunas SUBCLASSE, DESCRIÇÃO, OBRIGAÇÃO DE REGISTRO. 638 "Sim" (623 "Sim" e 15 "sim") e 64 "Passível de obrigação". Divisões mais frequentes: 01 agricultura (82), 10 alimentos (55), 33 manutenção e instalação de máquinas (39), 28 máquinas (32), 20 química (30), 43 serviços especializados de construção (28). Cobre todas as modalidades do Sistema Confea/Crea, não só construção. O Word chama de "lista do CONFEA", o caderno e o README de "divulgada pelo Crea-SP".
- Uso no TCC: "Sim" = obrigatório; "passível" só quando nenhum CNAE do contratado é obrigatório; casa 7 dígitos ou o prefixo de 5; falha de consulta nunca vira "não" (`final.ipynb:4649` em diante, `_lista_crea`, `_obrigacao_crea`, `_consulta_cnpj`). Consulta à Receita por `api.opencnpj.org` e `brasilapi.com.br`, 80 por minuto, com cache (`final.ipynb:4655`).
- **Comparação com `empresas/src/domain/cnae-catalog.json`: é a mesma planilha.** 702 códigos nos dois, nenhum só de um lado, nenhuma diferença de classificação; o JSON guarda `sourceSheet: Planilha1`, a linha de origem e os mesmos três campos, e renomeia "Sim" para "Relacionado" (638) e "Passível" para "Depende de análise" (64). Nada a importar.

### 2.2 `GRE.xlsx` (municípios por Gerência Regional)

- Conteúdo: 662 linhas, colunas GERÊNCIA REGIONAL e Município, 16 GREs (GRE01 Araçatuba a GRE16 Marília). A capital vem fatiada em 5 zonas sob GRE05; há 8 linhas com o nome mascarado como "XXXXXXX" (7 na GRE05, 1 na GRE07), 3 municípios repetidos (Campinas, Piracicaba, São José dos Campos), uma linha "ATUALIZAÇÕES:" vazia no fim, "Arabela" na GRE15 (não é município do IBGE) e falta Ouro Verde. O caderno corrige à mão São Paulo → GRE05, Ouro Verde → GRE15 e Florínia/Florínea → GRE16 (`final.ipynb:5439`; `CONTEXTO_PROJETO.md:207-221`).
- **Comparação com `empresas/src/domain/gre-municipios.json`**: o JSON é uma tabela mais rica (código IBGE → número da GRE e UGI, 645 municípios, de outra planilha oficial "GRE UGI UNIDADE Município", `empresas/docs/PROFISSIONAIS.md:27`). Casando pelo nome (feito nesta leitura): 644 municípios iguais, **nenhuma GRE diferente**; a única diferença é Arabela/Ouro Verde, que o JSON já resolve. Nada a importar; o `empresas` já está melhor.

## 3. Comparação com o que o `empresas` já tem (PNCP e malha fina)

- **Coletor PNCP**: `empresas/scripts/integrations/pncp.ts` usa o mesmo endpoint `/v1/contratos`, categorias 7, 8 e 9, filtro SP, com checagens de paginação mais rígidas que as do TCC (janela máxima de 366 dias, página incompleta não avança). Hoje há só um agregado real de um dia (01/09/2025: 341 contratos de SP nas três categorias, 329 de serviços, 92 linhas por município e categoria), sem CNAE, sem documentos e sem conclusão (`src/domain/pncp-public-aggregate.json`, limitações na linha de metadados).
- **Malha fina**: as regras de `empresas/src/cockpit/cruzamentos.ts` que tocam o PNCP são "contrato técnico com fornecedor sem registro na data" (`:43`), "contrato técnico sem ART identificada" (`:58`) e "obra pública sem ART de fiscalização" (`:61`). A classificação de objeto em `src/domain/digital-inspection.ts:75-88` é por lista de termos (TXT-01 a TXT-05). **Não existe regra de "serviço geral com objeto de engenharia" nem leitura de documentos** no `empresas`. O painel de Fiscalização é demonstrativo (`docs/FISCALIZACAO.md:28`).
- O que o TCC acrescenta e o `empresas` não tem: (a) um classificador de objeto treinado e validado (precisão 78,8%, recall 89,7% no reservado), muito melhor que lista de termos; (b) a verificação documental do rito; (c) a separação "rótulo errado, rito presente" (9.841) de "sem evidência de rito" (525); (d) o recorte por órgão contratante; (e) o banco de 16.773 precedentes para julgar contrato novo por semelhança.

## 4. Comparação com o leitor de documentos do orquestradorfiscaliza

| Aspecto | TCC (`final.ipynb`, célula 47-48) | orquestrador (`coleta/pncp_docs.py`, `analise/checks/rito_engenharia.py`) |
|---|---|---|
| Marcadores | 12 categorias | 8 categorias (as 8 primeiras do TCC), divididas em 5 específicas (ART, CREA, engenheiro responsável, obra/serviço de engenharia, art. 6º XII/XXI) e 3 genéricas (habilitação técnica, projeto básico, ABNT) (`pncp_docs.py:138-140`) |
| Regra | 2 ou mais quaisquer = processo ok | 2 ou mais **com pelo menos 1 específico** = rito presente (`rito_engenharia.py:57-58, 141`) |
| Sigla ART | `\bART\b` com IGNORECASE (acende em "art.") | só caixa alta e recusa "ART." seguido de número |
| CREA | casa CREAS | exige separador antes da UF |
| Art. 6º | casa XX, XXII, XXIII | só XII e XXI |
| "Responsável técnico" | específico (ENGENHEIRO_RESP) | genérico (habilitação) |
| Planilha, BDI, SINAPI, cronograma, caderno de encargos, diário de obra, alvará, habite-se | marcadores próprios | não tem |
| Quem decide com 0-1 marcador | LLM + segunda leitura cética + porte | sem LLM: "objeto com cara de engenharia" por regex e "rito ausente" vira indício |
| Ilegível | indeterminado, fora da lista | fora da estatística, vira tarefa humana |
| Extração | PyMuPDF + Tesseract, 8 páginas, até 5 documentos | PyMuPDF, pdfplumber, Tesseract, 8 páginas, até 3 documentos |
| Escala | 11.922 contratos de todos os órgãos de SP | 20 contratações por rodada, só do Crea-SP e relacionados (achados anteriores, `achados/orquestrador.md:44, 78`) |

Síntese para o projeto: usar a **regra e as expressões do orquestrador** (mais seguras contra falso "rito presente") e **acrescentar os 4 marcadores de obra do TCC como genéricos** (planilha orçamentária/BDI/SINAPI, cronograma físico-financeiro, caderno de encargos, diário de obra/alvará/habite-se). Usar a **triagem do TCC** (embeddings + classificador + LLM) para decidir quais contratos de serviço geral vão à leitura, porque o regex de objeto do orquestrador é largo e o TCC mediu o próprio erro.

## 5. Quadro por painel

| Painel | Item | Origem | Natureza no repo | Como entra |
|---|---|---|---|---|
| **Fiscalização e malha fina** | Regra nova "Serviço geral com objeto de engenharia sem rito" (candidato) | PNCP `/v1/contratos` + documentos da compra (`/api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{seq}/arquivos`) | código coletor e classificador prontos (caderno); resultado só agregado | Cartão "contratos de serviço geral com objeto de engenharia", "sem evidência de rito", "com rito no processo"; lista com link do contrato e do processo; ficha (i) com os marcadores achados e o parecer da segunda leitura |
| Fiscalização e malha fina | Funil 117.882 → 31.805 → 11.922 → 525 (+870 em aberto) | rodada de 31/07/2026 | dado real agregado (`relatorio_vivo_atual.md`) | Funil e anel de desfechos; serve de linha de base e de prova de conceito |
| Fiscalização e malha fina | Concentração por órgão e município (Mococa 111, Lençóis Paulista 74) | idem | dado real agregado (deck, PNG) | Ranking de órgãos contratantes para orientação: o próprio TCC diz que o esforço rende mais em poucos órgãos. Primeiro ato sugerido: ofício de orientação ao órgão, não auto |
| Fiscalização e malha fina | Mapa por GRE | `GRE.xlsx` / `gre-municipios.json` | o `empresas` já tem o mapa e a tabela | Pintar a regional pela contagem de casos; falta a lista de 525 para contar |
| Fiscalização e malha fina | Contratado sem atividade de registro obrigatório (130 de 493) e pessoa física executando (32) | Receita (opencnpj/BrasilAPI) + lista do Crea-SP | dado real agregado; coletor pronto | Indício combinado com "atividade obrigatória sem registro" (`cnaeSim`); PF executando engenharia vai para "exercício ilegal" e pede consulta ao registro de profissional |
| Fiscalização e malha fina | Sinal CNAE independente: 4.376 gerais com CNAE principal de engenharia que o classificador não levou à fila | idem | dado real agregado | Segunda fila de leitura, para cobrir a cauda que a LLM não viu |
| Fiscalização e malha fina | Banco de precedentes (16.773) e pacote de reuso | rodada | no Drive, não no repo | Motor de rotina mensal: julgar contrato novo pelo mais parecido já decidido; entra na tela como "casos parecidos" |
| **Empresas** | Contratados do PNCP sem CNAE de engenharia ou sem registro | PNCP + Receita + cadastro de PJ | exige cadastro interno | Ligar o CNPJ do fornecedor (está no parquet, não na lista) ao registro de PJ e ao RT; reforça "contrato técnico com fornecedor sem registro" |
| Empresas | Mercado público de engenharia oculto em "serviços gerais" | PNCP | código pronto | Volume de contratos de engenharia por órgão e por fornecedor que não aparecem na categoria de engenharia; sem valor, como no TCC, ou com valor se o painel decidir |
| **Presidência** | Três números: ~12.600 contratos de engenharia estimados entre os gerais, 9.841 com rótulo errado e rito presente, 525 sem evidência de rito | rodada de 31/07/2026 | dado real agregado | Destaque executivo e pauta institucional com TCE-SP e órgãos (correção do enquadramento na publicação) |
| Presidência / Conselho | Base legal da tese | `fundamentos_legais.md` | texto de referência | Ficha (i) da regra e argumento para a câmara |
| Profissionais | Pessoa física contratada para engenharia (32 casos) | PNCP (CPF do fornecedor) | dado real agregado | Cruzar com o registro de profissional; o CPF não deve aparecer no painel |

## 6. O que é dado real e o que exige base interna

**Real e público, já apurado (agregado, no repo):** volumes da coleta, desfechos, métricas, distribuição por município e órgão (figura), objetos mais frequentes, taxas de CNAE. **Real, mas fora do repo:** a lista de 525 linhas, o consolidado com os 870 em aberto, o cache de PDFs e de CNPJ, o banco de precedentes, o pacote de reuso (Google Drive `PNCP_TCC/`). Precisa ser pedido ao autor ou regerado. **Real e público, sem depender de ninguém:** a API do PNCP e as APIs públicas de CNPJ; o caderno roda do zero numa pasta vazia com Ollama e GPU (Word final, 3.5). **Planilhas reais:** `cnaes_crea.xlsx` e `GRE.xlsx`, ambas já presentes no `empresas` em versão igual ou melhor. **Demonstrativo:** o `sistema/` sem arquivo de importação.

**Exige base interna do Crea-SP (CreaNet):**
- "Sem evidência de rito no PNCP" só vira "sem ART" quando se cruza o CNPJ da contratada (e o número do contrato, quando citado na ART) com a base de ART. É o que separa falta de publicação de falta de ART, a limitação número um do próprio TCC. Esse cruzamento é a regra `contratoSemVinculo` do `empresas` (`cruzamentos.ts:58`) aplicada à lista do TCC.
- Registro de PJ e de RT na data do contrato, para o fornecedor dos 525 e dos 4.376.
- Registro de profissional, para os 32 contratos com CPF.
- Histórico de ações de fiscalização, para não repetir caso já notificado e para medir o resultado.

## 7. Próximos passos sugeridos

1. Pedir ao autor (ou regerar) a `12_LISTA_CREA_subenquadramentos.csv`, o `12_subenquadramento_consolidado.csv` e o `11_analise_rito.csv`, e reanexar o CNPJ do fornecedor pelo número de controle.
2. Reler os textos dos 11.922 com a regra do orquestrador (2 marcadores, 1 específico, sigla ART em caixa alta) e medir quantos dos 9.841 "rito presente" mudam de lado.
3. Cruzar a lista com ART e registro do CreaNet; publicar no painel só o que sobrar como candidato, com o processo administrativo como verificação.
4. Rodar a triagem mês a mês sobre os contratos novos, usando o pacote de reuso ou o `sistema/` com o classificador do TCC, e não o TF-IDF de demonstração.
