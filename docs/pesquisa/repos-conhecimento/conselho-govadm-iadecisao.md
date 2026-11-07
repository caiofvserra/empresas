# Achados: conselho (QUEDA), extracao-govadm e iadecisao

Leitura feita em 07/11/2026, só leitura, sem rede e sem rodar código dos repositórios. Os caminhos citados são relativos a `<repo>/`. Nenhum nome de pessoa ou CPF foi copiado: onde os repositórios trazem nomes (fixtures, PDFs anonimizados, textos de sessão), o relatório descreve só o campo.

## Resumo em cinco pontos

1. **conselho (QUEDA)** tem um coletor completo, pronto para rodar, para a API pública de Transparência do Crea-SP (Implanta), o PNCP, os cadastros de sanção da CGU, o TCU e as fichas de CNPJ. Tem 21 frentes de análise e cerca de 180 achados possíveis. O repositório **não traz dado coletado**: `data/` e `output/` estão no `.gitignore`. Os únicos números reais são os que o README e os comentários do código citam das rodadas 10 a 19 (agosto e setembro de 2026).
2. Para o **Financeiro**, o QUEDA é a peça central: diárias, locomoção e jetons pela conta contábil, a despesa (natureza × função), orçamento × execução, receita, fornecedores e pessoal. O repositório empresas **já** tem os agregados reais de despesa e de diárias de 2013 a 2026 (`public/data/engineer-statistics/conta-do-conselho.json`), tirados da mesma API, e também uma camada demonstrativa com a taxonomia do QUEDA.
3. **extracao-govadm** automatiza o Relatório de Processos do GOV ADM (sistema interno) nas 9 câmaras. Ele entrega uma planilha limpa de 13 colunas e os indicadores BI_SUPCOL (REQ.02.xx), por contagem determinística. O repositório não traz planilha real. A única validação real citada: 919 processos ativos na CEEC.
4. **iadecisao** extrai, dos PDFs de sessão do Votenet/SEI, uma linha por decisão com 59 colunas: 25 por regex, 21 calculadas, 12 pela LLM e 1 mista. Ele soma o acervo mês a mês e gera até 16 abas de indicadores. Ele traz **dado real anonimizado**: a sessão 2138 da CEEC (24 decisões, 16/07/2026), com a saída de exemplo e o painel de demonstração gerados dela.
5. O cruzamento de maior valor para a **Gestão do Conselho** liga três fontes. O GOV ADM mostra o estoque e a fase por câmara e por responsável. O Votenet, pelo iadecisao, mostra o desfecho, o artigo, a multa e a votação. O Implanta, pelo QUEDA, mostra o rol de mandatários e os jetons e diárias de conselheiro. O painel atual do empresas (página Câmaras e plenário) é **demonstrativo** e foi desenhado justamente para esses campos.

---

## 1. conselho — QUEDA (triagem de dados abertos)

### 1.1 O que é

O QUEDA é uma ferramenta de auditoria cidadã em Python (pandas e requests; `networkx` e Ollama são opcionais). Ela cruza as APIs públicas e gera `output/report.html`, com o CSV de evidência de cada achado. Cada rodada fica versionada em `output/rodadas/<data_hora>/` (`README.md` linhas 22-60). Ela roda à mão ou pelo Colab (`notebooks/queda_colab.ipynb`, 6 células e nenhuma saída gravada). O cache fica no Google Drive. Não há agendamento: a frequência é a da rodada manual. O exercício em curso tem checkpoint de 12 h, e a recusa de exercício encerrado vale 30 dias (`README.md` linhas 89-96 e 224-239).

O próprio README avisa: "Todo achado é indício, não prova" (`README.md` linha 8).

**Natureza do dado:**
- Há só **código coletor**. Não há dado real no repositório (`.gitignore`: `data/` e `output/`).
- Os números reais aparecem só como texto, nos comentários de correção de bug e no README.
- O `selftest.py` (138 KB) usa fixtures fictícias.
- A camada de IA é local (Ollama, `qwen2.5:7b-instruct` por padrão). Ela não gera número: só enquadra o resíduo da taxonomia, lê atas e escreve o resumo (`README.md` linhas 333-372).

### 1.2 Endpoints usados

#### Portal da Transparência do Crea-SP (Implanta)

- **Host:** `https://crea-sp.implanta.net.br`.
- **Prefixos:** `/portalTransparencia/api/v1.0` e `/transparencia/api/v1.0`. Os dois foram medidos como espelhos: Empenhos de 2025 devolveu os mesmos 12.575 itens nos dois (`src/queda/config.py` linhas 40-64).
- **Formato do período:** `MM/AAAA`.
- **Piso de sondagem:** 2010 (`ANO_PISO`). Com `--desde auto`, a sondagem recua até a API devolver dois anos vazios seguidos.
- **Janela de liberação por endpoint**, medida na rodada 13: o portal responde HTTP 400 com a frase "fora do período de liberação configurado" antes dessas datas (`README.md` linhas 107-130).
- **Fonte dos dados:** `src/queda/clients.py` linhas 727-746 (`ENDPOINTS_IMPLANTA_USADOS`) e `src/queda/pipeline.py` linhas 792-1190.

| Endpoint | Parâmetros | Campos que o código lê | Período servido / situação |
|---|---|---|---|
| `Empenhos` | `referenciaInicio/Termino` | `NUMERO`, `VALOR`, `VALOR_PAGO`, `VALOR_ANULADO`, `DATA_EMPENHO` (alternativas: `DATA_LIQUIDACAO`, `DATA_NOTA_FISCAL`), conta e favorecido | 12.575 itens em 2025; série anual com sondagem |
| `Pagamentos` | `referenciaInicio/Termino` | `VALOR`, `VALOR_LIQUIDO`, `DATA_PAGAMENTO`, `CPF_CNPJ` (CPF parcial, mascarado), `NOME_RAZAO_SOCIAL`, `CONTA_EMPENHO` / `NOME_CONTA`, `NUMERO_EMPENHO`, `NUMERO_PAGAMENTO`, `HISTORICO`. Derivados: `TIPO_PESSOA`, `FAVORECIDO_NORM`, `FAVORECIDO_CNPJ` | Base das diárias, dos fornecedores e da forense. R$ 4,29 bi pagos na série (`checks/fornecedores.py` linha 598) |
| `Contratos` | `vigenciaInicio/Termino` | `NUMERO_CONTRATO`, `VALOR`, `DATA_INICIO_VIGENCIA`, `DATA_FINAL_VIGENCIA`, `CONTRATADA` (texto "CNPJ - razão"; o código separa `CONTRATADA_CNPJ` e `CONTRATADA_NOME`), `NUMERO_LICITACAO` | Desde 2011. Guarda a 1ª ocorrência (valor original) |
| `ContratosAditivos` | `vigenciaInicio/Termino` | `NUMERO_CONTRATO`, `VALOR`, `DATA_PUBLICACAO` | Desde 2011 |
| `Licitacoes` | sondagem de formatos | — | 200 com lista vazia em 2024 e 2025; 400 em 2026; 404 com outros formatos. Dataset vazio |
| `Convenios` | `referencia*` | `VALOR_TOTAL` e a entidade | Série anual |
| `ComparativoDespesa` | `referencia*` | `VALOR_ORCADO`, `REALIZADO_EXERCICIO`, `TOTAL_EXERCICIO` por conta | Desde 2011 |
| `DespesasCentroCusto` | `referencia*` | `NOME_CENTRO_CUSTO`, conta, `VALOR_JAN` a `VALOR_DEZ`, `VALOR_TOTAL`, `ORCAMENTO`, `SALDO` | **Só desde 2021**. É o único eixo mensal e o único que mostra a unidade |
| `DemonstrativoEmpenhosPagamentos` | `referencia*` | Árvore `DETALHES` achatada: `ORCADO`, `EMPENHADOEXERCICIO`, `LIQUIDADO_EXERCICIO`, `PAGO_EXERCICIO`, `SALDO_ORCAMENTARIO` | Série anual |
| `PlanoDeContas` | `exercicio` | `Codigo`, `Nome`, `Analiticas` (hierarquia) | Só o exercício mais recente que responder |
| `ProcessosComprasServicos` | `referencia*` | `NUMERO_PROCESSO`, `SITUACAO_ATUAL`, `UNIDADE_REQUISITANTE`, `VALOR_TOTAL_PROCESSO`, `OBJETO`, `JUSTIFICATIVA` e `ITENS` (quantidade, valor unitário, melhor cotação) | Sem checkpoint, porque a lista vem aninhada |
| `AtasColegiados` | sondagem de formatos | Texto da deliberação, para a LLM | **Vazio** em todas as rodadas |
| `BalancoOrcamentario` | `referencia*` | `DOTACOES`, `DOTACOES_ATUALIZADAS`, `RECEITAS_REALIZADAS`, `DESPESAS_EMPENHADAS`, `DESPESAS_LIQUIDADAS`, `DESPESAS_PAGAS` | Desde 2012 |
| `ComparativoReceita` | `referencia*` | `VALOR_ORCADO`, `REALIZADO_EXERCICIO`, `TOTAL_EXERCICIO` por conta de receita | Desde 2011 |
| `QuadrosPessoas` | nenhum | Nome, vínculo, cargo, lotação, remuneração mensal | **200 com zero itens** nos dois prefixos (04/09/2026). Também aceita entrada manual por `data/manual/quadro_pessoal.json` |
| `Conselheiros` ("Rol de Mandatários") | nenhum | Nome, cargo, entidade, `dataPosse`, `dataPrevistaFim`, `dataExoneracao`, CPF mascarado e e-mail (o código guarda só o domínio) | **200 com zero itens** pela API. O rol real entrou à mão: o comentário fala em "e-mail pessoal de 2.455 pessoas" (`pipeline.py` linhas 1150-1156) |
| Endpoint de diárias | só por `QUEDA_DIARIAS_ENDPOINTS` | `valorBrutoPagamento`, `nomeFavorecidoPagamento` | Os 7 nomes tentados deram 404. Nenhum nome está confirmado |

**Conferido no repositório empresas:** o Swagger real do Implanta está guardado em `planejamento-fontes-2026-10/contratos/implanta-contrato-extraido.json`. Ele lista 30 operações GET. **Nenhuma delas é de diárias.** Isso confirma que diária, locomoção e jeton só aparecem como contas contábeis dentro de `Pagamentos`, `Empenhos` e `DespesasCentroCusto`.

O mesmo Swagger mostra três coisas que o QUEDA ainda não usa ou usa errado:
- `AtasColegiados` usa `dataInicio`/`dataTermino` em `DD/MM/AAAA`. O QUEDA sonda variantes e vem vazio.
- `Licitacoes` usa `referencia*` e aceita `numeroLicitacao`.
- Há endpoints não usados: `PlanosCargosSalarios`, `EstatisticaAnualSolicitacoes` (útil ao painel de Atendimento), `BalancoFinanceiro`, `FluxoCaixa`, `ExecucaoFinanceira`, `MovimentacoesFinanceiras`, `RelacaoAquisicoes`, `BensMoveis`, `BensImoveis` e `Balancete`.

#### PNCP

- **Hosts:** `https://pncp.gov.br/api/consulta` e `/api/pncp`.
- **Órgão-alvo:** CNPJ conferido em tempo de execução entre dois candidatos (`config.py` linhas 336-338).
- **Órgãos relacionados:** Confea, Mútua, Crea-RJ, Crea-MG e Crea-PR (`config.py` linhas 350-361).

| Caminho | Parâmetros | Campos projetados (`pipeline.py` linhas 1214-1330) | Período |
|---|---|---|---|
| `/v1/contratos` | `dataInicial`, `dataFinal`, `cnpjOrgao`, `tamanhoPagina=500`, por mês | `numeroControlePNCP`, `niFornecedor`, `nomeRazaoSocialFornecedor`, `objetoContrato`, `valorInicial`, `valorGlobal`, `valorAcumulado`, `dataAssinatura`, vigência, `dataPublicacaoPncp`, `tipoContrato`, `numeroControlePncpCompra`, `numeroControlePncpAta`, `processo` | 2021 em diante. 145 contratos do Crea-SP (README linha 319) |
| `/v1/atas` | `cnpj` (confirmado na rodada 11) | `numeroControlePNCPAta`, número e ano da ata, compra, vigência, objeto, `cancelado` | 138 linhas viraram 8 atas depois da dedupe (README linha 331) |
| `/v1/instrumentoscobranca/inclusao` | janela de no máximo 30 dias | Número da nota, `niEmitente`, nome do emitente, `valorNotaFiscal`, `dataEmissao`, contrato ligado | 2021 em diante. Vazio até a rodada 12, por causa do erro 422 da janela anual |
| `/v1/contratacoes/publicacao` | `cnpj` e `codigoModalidadeContratacao` (4, 6, 8, 9 e 12), por mês | `numeroControlePNCP`, `anoCompra` e a modalidade | 2023 em diante (`LICITACOES_PNCP_DESDE`) |

#### Outras fontes

- **CGU:** CEIS, CNEP e CEPIM em ZIP diário (`portaldatransparencia.gov.br/download-de-dados/{ceis|cnep|cepim}/{data}`). Se o dia não tiver arquivo, o código recua até 10 dias. Lê documento, nome, categoria, início e fim, órgão sancionador, esfera, fundamentação e abrangência (`config.py` linhas 128-146; `clients.py` linhas 1121-1310).
- **TCU:**
  - inidôneos, inabilitados e contas irregulares, por caminhos candidatos ainda não verificados (`config.py` linhas 161-192);
  - acórdãos em `dados-abertos.apps.tcu.gov.br/api/acordao/recupera-acordaos`, só por paginação: 40 blocos de 500 por rodada, com filtro local pelo nome e CNPJ do conselho e dos fornecedores;
  - catálogo de certidões da APF.
- **Fichas de CNPJ:** BrasilAPI e minhareceita. Sem teto de consultas, para quem recebeu mais de R$ 50 mil (`config.py` linhas 314-318 e 446-452).
- **Benchmark (opt-in):** `ComparativoDespesa` nos 27 hosts `crea-XX.implanta.net.br` e no `confea-br`, nos 3 últimos exercícios. O denominador são os profissionais ativos de cada UF (Confea/SIC, 30/08/2026, SP = 346.824), copiado do `engineer-statistics` (`config.py` linhas 263-296).

### 1.3 As análises (frentes)

A ordem segue as abas do relatório (`src/queda/checks/__init__.py` linha 18). Os limiares vêm de `config.py` linhas 455-525 e do topo de cada módulo.

| Frente (módulo) | O que calcula | Limiar / regra | Painel |
|---|---|---|---|
| Para onde vai o dinheiro (`finalistica`) | Taxonomia em dois eixos: natureza (conta) × função (centro de custo); razão meio/fim; matriz; verbas contra fiscalização | Classificação por regex em `taxonomia.py` | Financeiro (despesa) |
| O que a despesa diz que comprou (`objeto`) | Lê o histórico livre, dentro do universo do rótulo, para achar evento político ou institucional pago como fiscalização | O termo encontrado no histórico é conferido contra o nome do favorecido | Financeiro; Fiscalização (despesa de fiscalização) |
| Superintendências (`superintendencias`) | Quanto fica na sede e quanto chega ao território (direção, administração central, regionais, UGIs); composição da fiscalização (salário, verba, custeio); unidade sem gasto finalístico | Achado quando a verba supera o salário | Financeiro (sede × GRE); Fiscalização |
| Receita (`receita`) | Composição (anuidade, ART, multa, dívida ativa); cobertura de fiscalização por R$ de ART; multa × anuidade | Salto de mais de 5× entre anos é tratado como artefato | Financeiro (receita) |
| Orçamento (`orcamento`) | Orçado, empenhado, liquidado e pago; conta que estoura todo ano; diárias acima da dotação; retorno da anuidade | `ESTOURO_PCT=50`, `PISO_CONTA=R$ 200 mil` | Financeiro (meta × realizado) |
| Plano de contas (`plano`) | Cobertura da taxonomia contra o plano oficial; contas sem lançamento; execução fora do plano | Família com mais de R$ 5 mi e mais de 40% sem classificação | Financeiro (qualidade da classificação) |
| Opacidade (`opacidade`) | Rótulos agregadores ("DIVERSOS ...") decompostos pela conta | Regex de agregador | Financeiro (transparência) |
| Diárias e verbas a pessoas (`diarias`) | Classificação **só pela conta contábil**; estrutura política × quadro; série com CAGR real; top-10 por ano; quem fica no top por 5 anos ou mais; volume anual; verbas por mês e no mesmo dia; viagem comprada de PJ | `MAX_DIARIAS_ANO=100`; `MAX_JETONS_MES=12`; `MAX_JETONS_DIA=1`; CAGR acima de 10% vira alta; top-10 acima de 35% vira média | **Financeiro (diárias nominais)** e **Gestão do Conselho (gastos por conselheiro)** |
| Custo real por categoria (`pessoal`) | Salário do quadro mais a "renda invisível" das indenizações por pessoa; comissionado × efetivo, pelo vínculo (`COMISS`, `LIVRE`, `CONFIAN`) | Depende de `QuadrosPessoas`, que veio vazio | Financeiro (pessoal) |
| Sazonalidade (`sazonalidade`) | Dezembro por unidade e por conta; verba paga em lote; perfil mensal atípico; meses que não fecham com o total | Dezembro com 25% ou mais (3× o mês uniforme); 6 meses efetivos ou menos; pisos de R$ 100 mil e R$ 1 mi | Financeiro |
| Representação (`representacao`) | Composição do rol (conselheiros × inspetores); mandatos sem início ou fim; domínio do e-mail × favorecido; dinheiro por interesse (patronal, profissional, ensino); entidade que recebe por dois canais; assento × dinheiro | Sinal médio quando há mais de 4 inspetores por conselheiro | **Gestão do Conselho (conselheiros, representação)** |
| Casos concentrados (`casos`) | Entidade com o nome do próprio conselho; obra ou sede; contratos excepcionais; pessoa física prestadora | `PISO_ENTIDADE_CASA=R$ 10 mil` | Financeiro (fornecedores) |
| Empenhos (`empenhos`) | Art. 60 da Lei 4.320 (pagamento sem empenho, conferido pelo valor); HHI por ano; fornecedores cativos; **fracionamento**; anulações (empenho fantasma, dezembro); pago maior que empenhado | HHI acima de 0,15. Fracionamento: 3 ou mais pagamentos abaixo do limite de dispensa do ano, em 90 dias, somando acima do limite. Limites: R$ 8.000 (até 2017), R$ 17.600 (2018-20), R$ 50.000 (2021-22), R$ 59.906,02 (2023 em diante) | Financeiro; Fiscalização (contratos) |
| Contratos (`contratos`) | **Aditivos** acima do limite legal; prorrogações; pagamento depois da vigência; contratação direta; portal × PNCP contrato a contrato; nota emitida por terceiro; razão pago ÷ contratado | `ADITIVO_LIMITE_PCT=25`, piso de R$ 50 mil; razão acima de 2,0 ou abaixo de 0,5; casamento por nome em 25% ou mais | **Fiscalização (contratos)**; Financeiro |
| Rede de influência (`rede`) | Fornecedores compartilhados com Confea, Mútua e Creas; sócio homônimo de conselheiro ou funcionário; grupos econômicos (componente conexa fornecedor-sócio); intermediadores; convênios em ano eleitoral; rateio por valor redondo | Mais de 1 órgão; até 12 sócios no QSA; anos eleitorais 2011, 2014, 2017, 2020, 2023 e 2026 | Gestão do Conselho (conflito de interesse); Financeiro |
| Deliberações (`atas`) | A LLM extrai decisão, beneficiário e valor das atas e cruza com os pagamentos | Até 200 atas; desligada sem Ollama | Gestão do Conselho. **Sem dado**: `AtasColegiados` veio vazio |
| Forense (`forense`) | Benford de 1 e 2 dígitos (MAD de Nigrini); represamento abaixo do limite de dispensa; valores redondos; pares repetidos; dezembro; estornos | Faixas de MAD de Nigrini | Financeiro (alerta) |
| Fornecedores (`fornecedores`) | Situação na Receita × data do pagamento; empresa aberta menos de 180 dias antes do 1º pagamento; geografia × 645 municípios; porte (ME/EPP); CNAE × objeto; sancionados (CEIS, CNEP, CEPIM, TCU) com alcance e data do contrato; sócio condenado pelo TCU | Piso de R$ 50 mil; CNAE × objeto acima de R$ 50 mil; cobertura sempre publicada | **Financeiro (fornecedores)**; Fiscalização (contratos) |
| TCU (`tcu`) | Acórdãos que citam o conselho ou os fornecedores; ementa condenatória sobe para alta | Varredura parcial, que o relatório declara | Presidência; Financeiro |
| Comparação entre Creas (`benchmark`) | Despesa por profissional ativo; parcela de diárias, jetons e indenizações | Ranking só com 5 pares ou mais | Financeiro; Presidência |
| Diagnóstico (`diagnostico`) | Por que cada fonte veio vazia (403, 404, 400, 5xx ou 200 vazio); janela de liberação; análises desligadas | — | Método (metadado de qualidade) |

### 1.4 Números agregados que o repositório já registra

Todos vêm de rodadas reais do Implanta e do PNCP. Estão só no texto do código e do README, e não há arquivo de dados por trás deles. Vários aparecem no contexto de uma correção de bug, então use-os como ordem de grandeza.

| Número | O que é | Fonte |
|---|---|---|
| 12.575 | Empenhos do exercício 2025 | `config.py` linha 57; `README.md` linha 161 |
| R$ 4,29 bi | Total pago na série coletada | `checks/fornecedores.py` linha 598 |
| R$ 1,33 bi | Pagos ao rótulo agregado "DIVERSOS FUNCIONARIOS" (folha sem nome) | `checks/opacidade.py` linha 4; `utils.py` linha 138 |
| R$ 87,7 mi | Contas de "Locomoção de Conselheiros, Inspetores e Funcionários" na série | `taxonomia.py` linha 80 |
| R$ 178,6 mi | Verbas atribuídas à estrutura política (`diarias-politico-vs-quadro`) | `checks/diarias.py` linha 152 |
| R$ 256 mi | Diárias que um bug publicou como "sem beneficiário"; ao menos 97% delas trazem nome | `checks/opacidade.py` linha 44 |
| R$ 1,36 bi | Repasses a entidades; R$ 890 mi (65%) são Confea e Mútua, por obrigação legal | `checks/representacao.py` linhas 580-583 |
| R$ 41,5 mi | Maior beneficiária isolada fora do sistema: uma associação ligada ao próprio conselho | `checks/representacao.py` linha 81; `checks/casos.py` linha 27 |
| R$ 43 mi | Fiscalização medida pelo centro de custo em 3 exercícios. A conta contábil dava R$ 0 | `checks/finalistica.py` linhas 224-227 |
| R$ 14,9 por R$ 1 | Máquina × atividade-fim, numa rodada em que a atividade-fim identificada era só 1,35% da despesa | `findings.py` linhas 43-48 |
| 145 contratos; 8 atas | Contratos do Crea-SP no PNCP; atas depois da dedupe | `README.md` linhas 319 e 331 |
| R$ 36,7 mi / R$ 37 mi | Contratos "ausentes do PNCP" na rodada 10: 6 de 11 eram atas, e 2 (R$ 35,2 mi) têm ata de 2023 | `README.md` linha 536; `checks/contratos.py` linhas 821-830 |
| R$ 66,5 mi | Contratos dados como "ausentes" na rodada de 04/09 que **estavam** no PNCP (bug do zero à esquerda) | `pipeline.py` linhas 2373-2376 |
| R$ 239 mil | Pagamentos a sancionados; R$ 199 mil eram impedimento estadual, que não alcança o Crea-SP | `README.md` linhas 579-583 |
| ~800 empresas | Universo de fornecedores PJ; o teto antigo de 150 fichas cobria 82% do valor | `README.md` linhas 307-315 |
| 2.455 | Pessoas no rol de mandatários baixado à mão | `pipeline.py` linhas 1150-1156 |

**O repositório empresas já tem números reais da mesma API:** `public/data/engineer-statistics/conta-do-conselho.json`, coleta de 08/09/2026, série 2013-2026. Exemplos:
- despesa do exercício: R$ 165,8 mi em 2013 e R$ 465,5 mi em 2025;
- subgrupo "DIÁRIAS": R$ 160,4 mi;
- "DESPESA COM LOCOMOÇÃO": R$ 96,0 mi;
- "Diarias com Conselheiros": R$ 73,1 mi;
- "Locomoção de Conselheiros": R$ 58,2 mi;
- "Pagamento de Jeton": R$ 10,3 mi.

Esses números já alimentam o bloco "Despesa por profissional ativo" (`src/cockpit/publico.ts` linhas 35-38; `src/conselho/blocos-orcamento.tsx` linha 206).

### 1.5 O que o repositório empresas já usa (para não repetir)

- `src/domain/conselho.ts` linhas 5-10: uma camada **demonstrativa** mensal desde 2021 (despesa por natureza e função, diárias, pessoal, contratos, empenhos e fornecedores). Diz que, "em produção", os dados virão de `DespesasCentroCusto`, `BalancoOrcamentario`, `ComparativoDespesa`, `ComparativoReceita`, `Empenhos`, `Pagamentos`, `Contratos`, `ContratosAditivos`, `Licitacoes` e `QuadrosPessoas`. A taxonomia "segue o repositório conselho (QUEDA)".
- `src/domain/pessoas-conselho.ts` linha 11: diz que "QuadrosPessoas e Diarias ... já publicam nome, cargo, lotação e valor". **Isso não bate com as medições.** O QUEDA mediu `QuadrosPessoas` como 200 vazio, e o Swagger não tem endpoint de diárias. Diária nominal só sai de `Pagamentos`, pelo favorecido e pela conta, com o CPF parcial. A lotação e o cargo exigem o quadro, que hoje só entra por arquivo manual ou por sistema interno.
- `docs/CONSELHO.md`: a página "Orçamento e despesa", com diárias por pessoa, os 8 maiores fornecedores e o pessoal por função, está hoje no painel de Gestão do Conselho. Pela divisão do brief, ela deve ir para o **Financeiro**.
- `planejamento-fontes-2026-10/CONTEXTO_ANEXOS.md` linhas 66-79: o Swagger de 30 operações e o teste de 29/10/2026 (`Contratos` de 01/2025 devolveu 95 itens).
- O repositório empresas **não tem** nenhuma das frentes analíticas do QUEDA: fracionamento, aditivos, sanções, rede, forense, sazonalidade, cruzamento portal × PNCP. Elas são o ganho novo.

---

## 2. extracao-govadm — Relatório GOV ADM das 9 câmaras

### 2.1 O que é

A ferramenta automatiza, com Playwright (Python, e também um porte em C#/.NET 10), o roteiro manual "Relatório GOV ADM V2.1":
1. login em `https://creasp.govadm.com.br/login/`;
2. Tramitação de Processos > RELATÓRIOS > "Relatório de Processos" (`.../workflow/pagina/relatorio/relatorio_processo_completo.jsf`) e depois "Dashboard";
3. filtro **Lotação Atual** com as 9 câmaras;
4. Excel baixado, limpo e convertido nos indicadores do BI_SUPCOL (`README.md`; `config.toml` linhas 9-66).

**Fonte primária:** o GOV ADM, sistema interno de tramitação. Exige rede do Crea ou VPN e login de usuário (`COMECE-AQUI.md`, passo 4).

**Frequência:** diária, por `main.py diario` agendado no `schtasks` às 06:00 (`COMECE-AQUI.md` linhas 138-152).

**Natureza do dado:** só **código pronto para rodar**. `downloads/` e `saida/` têm apenas `.gitkeep`, e não há planilha real. Os mocks HTML (`testes/`, `csharp/tests/.../Falsa/govadm.html`) imitam a tela.

**Câmaras do filtro** (`config.toml` linhas 39-73):
- CEEAS (Ambiental e Sanitária);
- CEA (Agronomia);
- CEEC (Civil);
- CEEA (Agrimensura);
- CEEST (Segurança do Trabalho);
- CEEE (Elétrica);
- CEEMM (Mecânica e Metalúrgica);
- CEEQ (Química);
- CAGE (Geologia e Minas).

### 2.2 Filtros e telas

- **Filtro usado:** só "Lotação Atual", com as 9 siglas, casadas pela descrição exata (digitar "CEA" também traria CEAP, PCEA e outras).
- **Outros filtros da tela,** que existem mas não são usados: Lotação Origem, Cargo e Interessado (`README.md`, "O `+` certo entre vários").
- **Trava de segurança:** o script se recusa a gerar o relatório se faltar qualquer lotação.
- **Dashboard:** quadrantes "Pendentes de Recebimento", "Recebidos" e "Enviados" (`extracao/seletores.py` linhas 225-237). É preciso clicar numa fatia para habilitar "Gerar Excel" (passos 2.10 a 2.15). O conteúdo desse Excel não está descrito no repositório.

### 2.3 Colunas do Relatório de Processos

Cabeçalho com "os mesmos formatos da extração real" (`testes/testar_metricas.py` linhas 21-23):

`Nº do Processo` · `Categoria` · `Assunto` · `Lotação Atual` · `Responsável` · `Lotação Origem` · `Descrição` · `Interessado` · `Fase` · `Favorecidos` · `Data` · `Nível de Sigilo` · `Cargo`

O que se sabe de cada coluna:
- **Nº do Processo:** formato `NNNNNN/AAAA`. O ano de abertura sai dele (`metricas.py` linhas 89-92).
- **Categoria:** por exemplo `INFRAÇÃO INCIDÊNCIA - PF/PJ` (reincidência), `FISCALIZAÇÃO`, `ACERVO / ART`, `DISCIPLINAR`.
- **Assunto:** traz o artigo já como valor, por exemplo `ARTIGO 59º DA LEI 5.194/66` (209 dos 919 processos da amostra CEEC) ou `ARTIGO 1º DA LEI 6.496/77`.
- **Fase:** 17 fases. Na amostra CEEC: Manifestação 397, Emissão Parecer 148, Relato 133, Análise 110, Designação 76 e mais 12 menores, além de Arquivado (`config.toml` linhas 137-152).
- **Responsável:** quem está com o processo (relator ou servidor).
- **Data:** aceita também o rótulo "Data de Abertura" (`csharp/src/GovAdm.Planilhas/LeitorProcessos.cs` linha 35). **O significado exato não está confirmado.** Na amostra de teste, um processo de 2022 tem Data de 2026, então não parece ser a data de abertura.
- **Não existe** coluna de data de entrada na fase, de data do fato, de prazo, de valor de multa nem de relator designado separado do Responsável.

### 2.4 A planilha limpa

`ferramentas/limpar_planilha.py` reconstrói a planilha do zero. Ele tira a logo, as células mescladas e as colunas ocultas e vazias (que deslocariam "Fase" para a posição de "Cargo") e as linhas vazias.

Saída: `saida/<nome>_limpo.xlsx`, numa aba `dados`, com o cabeçalho congelado. Com `--csv`, sai também um `.csv` com `;` e UTF-8 com BOM.

`main.py metricas` gera `saida/indicadores_AAAAMMDD.xlsx` (`extracao/metricas.py` linhas 285-370) com:
- a aba `resumo` (Câmara, Requisito, Indicador, Valor, Observação);
- uma aba por distribuição (`<SIGLA>_REQ.02.0x`);
- a aba `<SIGLA>_REQ.02.07_painel`;
- a aba `nao_calculavel`.

### 2.5 Indicadores que ela permite (BI_SUPCOL, por câmara)

Fonte: `extracao/metricas.py` linhas 166-283; o porte C# está em `csharp/src/GovAdm.Planilhas/Indicadores.cs`.

| Requisito | Indicador | Como calcula |
|---|---|---|
| REQ.02.01 | Processos em trâmite | Conta as linhas, sem a fase Arquivado (o nº de arquivados excluídos vai ao lado) |
| REQ.02.02 | Lista dos processos | Números dos processos |
| REQ.02.05 | Por ano de abertura | Ano tirado do nº do processo, o que dá a **safra e a idade do estoque** |
| REQ.02.06 | Por assunto | Agrupa a coluna Assunto, o que dá a **distribuição por artigo** da Lei 5.194 ou da 6.496 |
| REQ.02.07 | Por fase e fatias do painel | 17 fases agrupadas em Manifestação, Pauta, Em Posse e P/ Análise. O mapa de fatias fica em `[indicadores_painel]` e é "a confirmar" com a área. Fase sem mapa é reportada à parte |
| REQ.02.08 | Reincidência | Categoria que contém "INCIDÊNCIA" |
| REQ.02.09 | Ranking por responsável | **Carga por relator ou servidor** |
| REQ.02.10 | Média por conselheiro | Total ÷ nº de conselheiros da câmara. O divisor vem do **Numéria** (`[conselheiros_por_camara]`, hoje vazio) |
| REQ.03.11 | Pautados por mês | Fase "Pauta" agrupada por mês da coluna Data |

**O que esta fonte não dá** (aba `nao_calculavel`, `metricas.py` linhas 64-73):
- REQ.01.01 a 01.06, os conselheiros: vêm do Numéria;
- REQ.02.03 e 02.04, entrada e saída: exigem o histórico de movimentação;
- REQ.03.05 a 03.10, datas de envio e recebimento para relato: vêm do Votenet;
- REQ.04.01 a 04.22, votos, relatos e decisões: vêm do Votenet.

**Resposta direta ao que foi perguntado:**
- **Processos por câmara, por fase e por relator:** sim.
- **Idade do estoque:** sim, por safra (ano do número do processo).
- **Dias na fase, prazos e prescrição:** **não**. Não há data de entrada na fase, nem data do fato, nem histórico. Uma alternativa seria tirar fotos diárias (o `diario` já roda todo dia) e medir quanto tempo o processo fica parado na mesma fase. Isso não está implementado.

Validação real: REQ.02.01 = **919** na amostra CEEC, igual ao número anotado na planilha BI_SUPCOL do Crea (`README.md`, seção Indicadores; `testes/testar_metricas.py` linha 7).

A LLM é opcional e está desligada (`backend = "nenhum"`). Envio para API externa fica bloqueado por `externo_autorizado = false` (`config.toml` linhas 102-120).

### 2.6 Ligação com o painel de Gestão do Conselho

A página "Câmaras e plenário" do empresas usa hoje dados **demonstrativos** (`src/domain/gestao.ts` linhas 14-18, 37-56 e 81-117). O modelo `Processo` dela tem: câmara, tipo, entrada, `relatorEm`, `pautaEm`, `julgadoEm`, decisão, data do fato e prescrição, recurso ao plenário, e as fases "Aguardando relator", "Com o relator" e "Pautado". O comentário diz que, em produção, os dados viriam "do sistema de processos do Crea-SP (SQL Server ou Db2)". Não há nenhuma menção a GOV ADM, Votenet ou iadecisao no código ou nos docs do empresas (grep sem resultado).

Como o GOV ADM alimentaria a página:
- **Estoque por câmara e fase:** REQ.02.01 e 02.07. As fases do empresas teriam de ser mapeadas a partir das 17 do GOV ADM. "Aguardando relator" corresponde a Designação; "Com o relator" a Relato ou Emissão Parecer; "Pautado" a Pauta. Manifestação e Análise são **fases que o empresas ainda não tem**.
- **Carga por responsável:** REQ.02.09, com o divisor de conselheiros do Numéria (REQ.02.10).
- **Mapa de calor de idade:** só por safra (ano do processo), e não em dias.
- **Autos perto da prescrição e tempo até o julgamento:** precisam de data do fato e do histórico. Isso fica no sistema interno de processos, fora do Relatório.
- **Assunto e artigo:** para a distribuição das infrações em estoque.
- **Siglas:** o GOV ADM usa CEEAS e CAGE, e as duas não constam da taxonomia do iadecisao (ver 3.2). A tabela de câmaras precisa unificar as siglas.

---

## 3. iadecisao — decisões de câmara (Votenet/SEI) com LLM local

### 3.1 O que é

A ferramenta lê lotes de PDFs de sessão de câmara especializada (layout do Votenet, com números SEI), separa as decisões por âncoras e grava uma linha por decisão. O trabalho é dividido assim:
- **regex** para tudo que é objetivo;
- **LLM aberta e local** (Ollama, vLLM ou servidor compatível com a API da OpenAI; padrão `gemma-4-26B-A4B-it`, com `gemma3:12b` no Ollama) só para o juízo, sob JSON Schema;
- **RAG BM25** sobre a Lei 5.194, desligado por padrão;
- **auditoria sem LLM** (`qa.py`): votos que somam, data coerente e artigo que existe na lei (`README.md` linhas 250-290).

Há três implementações: Python, arquivo único `.py` e C#/.NET 8. A paridade é testada: 76/76 páginas e 450/450 valores iguais. O modo `mensal` soma ao acervo `acervo/decisoes.jsonl` sem duplicar. A chave é câmara + número + ano da decisão, e um processo que volta à câmara conta cada passagem. Há também página no navegador (`servir`) e pasta monitorada (`vigiar`).

**Fonte primária:** os PDFs do Votenet/SEI, sistema interno. Alguém precisa exportar os PDFs: a ferramenta não baixa nada.

**Frequência:** mensal, por sessão.

**Natureza do dado:** código pronto **e** dado real anonimizado da sessão 2138:
- `exemplos/sessao_2138_completa_anonimizada.pdf` (76 páginas, 24 decisões, nº 7679 a 7702) e a amostra;
- `exemplos/saida_exemplo.xlsx`;
- `dotnet/testes/.../esperado/sessao_2138_*.json` e o texto extraído;
- o painel de demonstração `docs/painel_bi.html`, com os dados da sessão 2138.

### 3.2 Campos extraídos (59 colunas)

Fonte: `docs/ESQUEMA_COLUNAS.md`, gerado de `src/iadecisao/schema.py`.

- **Identificação:**
  - `id_decisao` (`{câmara}-{nº}-{ano}`), arquivo, páginas e hash;
  - `camara_sigla` e `camara_nome`, `numero_reuniao`, `tipo_reuniao`;
  - `numero_decisao`, `ano_decisao`, `mes_decisao`, `competencia` (AAAA-MM), `trimestre`;
  - `numero_processo` (formato SEI `26.000378/2026-62`) e `numeros_sei`.
- **Datas e lugar:** `data_decisao` e `municipio_sessao`. **Não há data de autuação nem do fato.** O tempo só sai pelo ano do processo ("Safra do processo").
- **Partes:** `interessado`, `pessoa_fisica_ou_juridica` (LLM) e `relator`. **O relator vem vazio:** "o layout do Votenet não traz este campo" (aba Cobertura do painel de demonstração).
- **Conteúdo:** `ementa`, `texto_dispositivo` (DECIDIU), `considerandos`, `texto_integral`.
- **Votação:** favoráveis, contrários, abstenções, impedimentos (este último vazio no layout), total e unanimidade.
- **Juízo (LLM):**
  - `tipo_processo` (20 tipos) e `subtipo`, `assunto_resumido`;
  - `resultado` (14 valores: deferido, indeferido, parcialmente_deferido, aprovado, reprovado, arquivado, convertido_em_diligencia, suspenso, prejudicado, homologado, referendado, nao_conhecido, outros);
  - `penalidade_aplicada`, `tipo_penalidade` (nenhuma, multa, advertência reservada, censura pública, suspensão, cancelamento de registro, interdição de obra, outros);
  - `valor_multa` (regex + LLM), `fundamentacao_resumo`, `ha_recurso`;
  - `instancia` (primeira, segunda, câmara, plenário, Confea, não se aplica), `area_tecnica`, `palavras_chave`.
- **Base legal:**
  - `artigos_lei_5194_citados` (regex);
  - `artigos_lei_5194_esperados` (o artigo típico de cada tipo, tirado da taxonomia);
  - `outras_normas_citadas`;
  - `divergencia_fundamentacao` (citado diferente do esperado).
- **Prazo e encaminhamento:** `prazo_mencionado`, `prazo_dias`, `orgao_encaminhado`.
- **Qualidade:** `confianca_extracao` (0 a 1), `requer_revisao_humana` (limiar 0,70), `campos_faltantes`, `modelo_llm`, `data_processamento`.

**Planilha de saída** `decisoes.xlsx`, com 5 abas: Decisões, Textos (ligada por hash), Alertas (QA), Resumo, Dicionário.

**Planilha de indicadores** `indicadores.xlsx`, com até 16 abas (`src/iadecisao/indicadores.py` linhas 277-730):
- Resumo; Por mês (com desfavoráveis, citam art. 59, pedem conferência); Por trimestre; Por câmara; Por assunto;
- Desfecho (4 leituras: desfavorável, parcialmente provido, favorável, administrativo);
- Artigos da Lei 5.194; Outras normas; Assunto por mês;
- Sessões (quórum, % unânimes); Votação;
- Multas (quantas, soma, média, maior, menor);
- Safra do processo (anos até a decisão);
- Processos que voltaram (passagens e meses entre elas);
- Conferência pendente; Cobertura dos campos.

Também saem `painel.html` e `mapa.html`.

### 3.3 Taxonomia jurídica

Fonte: `kb/taxonomia.yaml` (v1.0.0, 25/08/2026).

**20 tipos de processo, em 7 grupos:**
- **fiscalização:** auto de infração por exercício ilegal, empréstimo de nome, PJ sem registro, falta de ART, outros;
- **registro:** registro de PF, registro de PJ, responsável técnico, visto;
- **atribuições:** atribuições profissionais, acervo e CAT, anotação de ART;
- **financeiro:** anuidade e débitos;
- **disciplinar:** ética e disciplina, recurso;
- **administrativo:** interno, homologação e referendo, normativo e consulta, apoio a evento e moção;
- **fallback:** OUTROS.

Cada tipo traz gatilhos, contraindicações, artigos típicos da Lei 5.194 (por exemplo 6.a, 6.b, 6.c, 6.d, 13 e 73) com marca de confiança, outras normas (por exemplo Res. Confea 1.008/2004) e subtipos. Há também gatilhos de resultado e de penalidade.

**Câmaras da taxonomia:** CEEC (confirmada), CEEE, CEEMM, CEEQ, CEA, **CEGM**, CEEST e CEEA, as outras "a conferir". Comparado com o GOV ADM: **falta CEEAS e a sigla de Geologia diverge** (CEGM aqui, CAGE no GOV ADM). Sigla desconhecida não descarta a decisão; ela entra num relatório à parte.

**Base jurídica:** `kb/lei_5194_1966.md` (84 KB). Ela traz uma lista de "Pendências de verificação" de alto impacto: redação dos arts. 71, 73 e 46, tabela de multas do Confea e rito da Res. 1.008/2004 (seção 14, linhas 1026-1041). O planalto.gov.br estava bloqueado quando a base foi montada.

### 3.4 Resultados de exemplo (sessão 2138, CEEC, 16/07/2026, sem LLM)

Fonte: `docs/painel_bi.html`, constante `TABELAS`, gerada em 27/08/2026; também `dotnet/testes/.../esperado/sessao_2138_campos.json`.

- **24 decisões, 1 câmara, 1 sessão** ordinária (nº 2138).
- **Lei 5.194:** 10 das 24 decisões (41,7%) a citam. Por artigo: art. 59 em 8 (33,3%), art. 73 em 3, e um caso cada para os arts. 6, 7, 8, 34, 40, 60, 71 e 77.
- **Outras normas:** Regimento do Crea-SP em 10; Res. 1.008/2004 em 9; Lei 6.839/1980 em 5; Res. 1.144/2024 em 3.
- **Votação:** média de 228 favoráveis, 1 contrário e 8 abstenções; quórum de 237; nenhuma decisão unânime. O texto diz "Votaram favoravelmente 228 ... conselheiros". **Conferir** se esse quórum é da câmara ou se o layout repete a votação do plenário.
- **Multas:** 3 decisões com multa, soma de R$ 10.801,42, média de R$ 3.600,47 (de R$ 2.633,26 a R$ 5.445,44). O `exemplos/saida_exemplo.xlsx`, mais antigo e com 54 colunas, traz ainda R$ 218.000, R$ 144.000, R$ 48.000 e R$ 36.000 como "valor da multa". Isso sugere leitura errada de outros valores numa versão anterior. **Não use** esse arquivo como referência de multa.
- **Safra:** processos de 2021 (1), 2023 (2), 2024 (8), 2025 (6) e 2026 (7), o que dá de 0 a 5 anos até a decisão.
- **Qualidade:** 5 de 24 pedem conferência (20,8%). O interessado está preenchido em 79,2%. **Todas as colunas da LLM estão vazias** (tipo, resultado, penalidade, área), porque o lote rodou sem modelo. Por isso as abas Desfecho e Por assunto mostram "Não informado".

**Possível defeito, conferido só lendo o código e sem teste:** `familia_do_desfecho` (`indicadores.py` linhas 38-50 e 81-89) procura "parcialmente deferido" com espaço. O enum, porém, é `parcialmente_deferido`, com sublinhado. Por isso ele cairia em "Favorável" (casa com "deferido"). Valores como `nao_conhecido`, `reprovado` e `convertido_em_diligencia` caem em "Outros". Vale corrigir antes de publicar a taxa de provimento.

### 3.5 Indicadores que ele permite

- **Decisões por câmara, por mês e por trimestre;** sessões e quórum; % de unanimidade. Isso alimenta a **produtividade do colegiado**.
- **Desfecho por câmara e por tipo** (precisa da LLM): taxa de manutenção do auto, de anulação, de arquivamento (`resultado = arquivado`) e de diligência.
- **Por artigo da Lei 5.194** (regex, sem LLM): infração mais julgada, com a divergência entre o artigo citado e o esperado.
- **Multa:** soma, média, maior e menor por mês. Por câmara ou por artigo, é preciso cruzar as colunas no BI.
- **Tempo:** só "anos até a decisão" (safra do processo × data da decisão) e "meses entre passagens" de quem voltou à câmara. **Não dá a prescrição:** falta a data do fato.
- **Recurso e instância:** `ha_recurso` e `instancia`, para o funil câmara, plenário e Confea.
- **Relator: não.** O Votenet não traz o relator no PDF. A carga por relator precisa do GOV ADM (Responsável) ou dos REQ.04 do Votenet.

---

## 4. Cruzamentos interno × externo de alto valor

1. **Estoque → decisão → prescrição.** O GOV ADM traz o nº do processo, a fase, o responsável e o assunto. O iadecisao traz o nº do processo SEI e o desfecho. A **chave** é o número do processo, mas os formatos diferem: `005831/2025` no GOV ADM e `26.000378/2026-62` no SEI. **Confirmar se é o mesmo identificador** ou se existe uma tabela de correspondência. Com a data do fato vinda do sistema de processos, isso fecha a "parte prescrita" e o "tempo até o julgamento" da página Câmaras.
2. **Conselheiro: carga, presença e custo.** As peças:
   - rol de mandatários do Implanta (cargo, posse e fim de mandato; hoje só por arquivo manual);
   - responsável no GOV ADM (carga de relato);
   - jetons e diárias de conselheiro em `Pagamentos` (verbas por pessoa e por mês; mais de 12 jetons por mês ou mais de 1 por dia vira alerta);
   - Numéria (nº de conselheiros por câmara).

   O jeton é a **proxy de presença** que existe hoje, porque o Votenet (REQ.04) ainda não foi lido. Juntas, essas fontes dão o "gasto por conselheiro × processos relatados × sessões". O cruzamento é por **nome normalizado**: o CPF vem mascarado, então o risco de homônimo é real (`README.md` linhas 676-678).
3. **Representação × dinheiro.** O QUEDA (`representacao`, `rede`) cruza a entidade que indica o conselheiro com convênios e contratos, e o sócio homônimo de conselheiro com fornecedores. O valor é alto, mas exige o rol com a entidade, que a API não publica.
4. **Receita de multa × decisões.** A receita de multa (`ComparativoReceita`) pode ser comparada com a multa decidida pelas câmaras (iadecisao). Isso mede o quanto do que é aplicado é de fato arrecadado.
5. **Contratos do conselho × PNCP × sanções** (Fiscalização / Financeiro). O cruzamento contrato a contrato, a nota de terceiro, o aditivo acima de 25% e o sancionado com contrato posterior à sanção são novos para o empresas. A página Contratos públicos do empresas usa o PNCP agregado de **outros órgãos** (`src/domain/pncp-public-aggregate.json`), e não os contratos do próprio Crea-SP.

---

## 5. Quadro por painel

| Painel | O que entra | Fonte primária | Natureza no repositório | Acesso | Já existe no empresas? |
|---|---|---|---|---|---|
| **Financeiro**: diárias nominais | Diárias, locomoção e jetons por favorecido, pela conta contábil; top-10 por ano; quem persiste no top; volume anual acima de 100; mais de 12 por mês; acúmulo no mesmo dia; viagem comprada de PJ | Implanta `Pagamentos` (CPF parcial) | QUEDA: coletor + regras; números só citados | Público (WAF bloqueia rajada) | Bloco demonstrativo "Diárias por beneficiário" (hoje no Conselho); agregado real 2013-2026 em `conta-do-conselho.json` |
| **Financeiro**: despesa | Natureza × função; sede × território; orçado → empenhado → liquidado → pago; estouro de conta (50% ou mais); dezembro (25% ou mais); opacidade; plano de contas; despesa por profissional ativo e benchmark entre Creas | `DespesasCentroCusto` (desde 2021), `ComparativoDespesa`, `DemonstrativoEmpenhosPagamentos`, `BalancoOrcamentario`, `PlanoDeContas`; 27 Creas | QUEDA: coletor | Público | Camada demonstrativa + despesa real por profissional |
| **Financeiro**: receita | Composição (anuidade, ART, multa, dívida); cobertura de fiscalização por R$ de ART; multa × anuidade | `ComparativoReceita`, `BalancoOrcamentario` | QUEDA: coletor | Público | Página Receita (demonstrativa) |
| **Financeiro**: fornecedores | HHI acima de 0,15; cativos; fracionamento (limite do ano, 90 dias); empresa recente (menos de 180 dias); situação na Receita; porte; geografia; CNAE × objeto; CEIS/CNEP/CEPIM/TCU; grupos econômicos; Benford | `Pagamentos`, `Empenhos`, BrasilAPI, CGU, TCU | QUEDA: coletor | Público | Só "8 maiores fornecedores" (demonstrativo) |
| **Financeiro**: pessoal | Comissionado × efetivo; salário + renda invisível; série por conta | `QuadrosPessoas` (**vazio na API**) + `Pagamentos` | QUEDA: coletor; o quadro só por arquivo manual | Público, mas não publicado; alternativa: RH interno | "Pessoal por função" (demonstrativo) |
| **Gestão do Conselho**: processos | Estoque por câmara, fase (17 fases agrupadas em 4) e responsável; safra; assunto e artigo; reincidência; pautados por mês | GOV ADM | extracao-govadm: coletor diário; validado com 919 processos na CEEC | **Interno** (VPN e login) | Página Câmaras com modelo demonstrativo; sem GOV ADM |
| **Gestão do Conselho**: decisões | Decisões por câmara e mês; desfecho; artigo; multa; votação e quórum; voltas à câmara; anos até a decisão | PDFs do Votenet/SEI | iadecisao: coletor + **dado real anonimizado** (sessão 2138) | **Interno** (exportar os PDFs); LLM local | Bloco "Decisões das câmaras" demonstrativo |
| **Gestão do Conselho**: conselheiros | Rol (cargo, mandato, mandato sem termo); conselheiros × inspetores; média de processos por conselheiro (REQ.02.10); gasto por conselheiro (jeton, diária, locomoção); presença por proxy de jeton | Implanta `Conselheiros` (vazio na API; o rol de 2.455 pessoas entrou à mão) + `Pagamentos` + Numéria | QUEDA: coletor; GOV ADM: divisor | Público parcial + interno (Numéria, Votenet REQ.04) | Composição do plenário (demonstrativa) |
| **Gestão do Conselho**: representação | Entidades por interesse; repasse por grupo (sem Confea e Mútua, que são 65% de R$ 1,36 bi); duplo canal; assento × dinheiro; sócio homônimo; convênio em ano eleitoral | `Convenios`, `Pagamentos`, rol, fichas de CNPJ | QUEDA | Público | Página Entidades e escolas (demonstrativa) |
| **Fiscalização**: contratos | Aditivos acima de 25%; prorrogações; pagamento após a vigência; pago ÷ contratado (acima de 2 ou abaixo de 0,5); portal × PNCP; atas; modalidade de origem; nota de terceiro; sancionado | `Contratos` e `ContratosAditivos` (desde 2011), PNCP contratos, atas, cobranças e contratações | QUEDA: coletor; 145 contratos e 8 atas citados | Público | Contratos públicos de **outros** órgãos (PNCP agregado); contratos do Crea-SP só demonstrativos |
| **Fiscalização**: gasto na atividade-fim | Composição da fiscalização (salário, verba, custeio); unidade sem fiscalização; objeto político pago como fiscalização | `DespesasCentroCusto`, histórico de `Pagamentos` | QUEDA | Público | "Despesa de fiscalização por GRE" (demonstrativo) |
| **Presidência** | Acórdãos do TCU sobre o conselho; resumo dos achados de gravidade alta; benchmark | TCU, QUEDA | QUEDA | Público | Não |
| **Atendimento** (de quebra) | `EstatisticaAnualSolicitacoes` e `EstatisticaAcessoModulo` do Implanta, que nenhum repositório coleta | Implanta | Só no Swagger do empresas | Público | Não |

---

## 6. Pendências antes de ligar em produção

- **Implanta:**
  - colocar o formato do Swagger (`dataInicio`/`dataTermino` em `DD/MM/AAAA`) em `AtasColegiados`;
  - pedir ao Crea-SP, por e-SIC ou por acesso interno, o `QuadrosPessoas` e o `Conselheiros`, que vêm vazios;
  - corrigir em `src/domain/pessoas-conselho.ts` a afirmação de que existe um endpoint de diárias.
- **Siglas das câmaras:** unificar entre o GOV ADM (CEEAS, CAGE) e a taxonomia do iadecisao (CEGM, sem CEEAS).
- **Chave do processo:** confirmar se o número do GOV ADM (`NNNNNN/AAAA`) e o número SEI (`26.xxxxxx/AAAA-DD`) designam o mesmo processo.
- **Coluna "Data" do GOV ADM:** confirmar o significado.
- **Fatias do painel:** confirmar com a área o mapa das 17 fases nas 4 fatias.
- **iadecisao:**
  - ligar a LLM, porque sem ela o desfecho, o tipo e a penalidade ficam vazios;
  - corrigir `familia_do_desfecho`;
  - conferir o quórum de 237;
  - conferir os valores de multa contra a tabela do Confea.
- **Prescrição e tempo na fase:** nenhuma das três fontes traz a data do fato nem o histórico de fase. É preciso a base do sistema de processos ou fotos diárias do GOV ADM.
