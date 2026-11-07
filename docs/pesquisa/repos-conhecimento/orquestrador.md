# orquestradorfiscaliza: inventário para os painéis do Crea-SP

Repositório lido: `orquestradorfiscaliza`, ramo `claude/project-thread-howjz2`, commit `6d1aab0`. Tem 50 commits. O ramo remoto `claude/orquestrador-fiscal-governo-r33l7e` aponta para o mesmo commit. Li o código (`src/`), os catálogos (`fontes/`, `base_legal/`), os documentos (`docs/`) e as fixtures de teste. Nada foi executado, nada foi alterado.

## 1. O que é, em uma frase, e o achado principal

É um sistema Python local (AGPL-3.0) que coleta portais de transparência e bases oficiais, roda 27 "frentes" de detecção de irregularidade, tenta refutar cada indício e monta representação e pedido de LAI para um humano protocolar (`README.md`).

O dado mais importante para este projeto: **o órgão-alvo configurado é o próprio Crea-SP**. Em `fontes/orgaos.json` o Crea-SP tem `papel: "alvo"`, com CNPJ candidato 60.985.017/0001-77 e host Implanta `crea-sp`. Confea, Mútua, Crea-RJ, Crea-MG e Crea-PR são `relacionado`. Os outros 23 Creas são `benchmark`. Quase tudo o que o repositório faz é auditoria externa das contas do Crea-SP, vista de fora, com dado público. Serve primeiro ao painel **Financeiro** (a fazer) e à parte de controle interno. Para a malha fina dos contratos de terceiros, o que se aproveita é o **método** (leitura de documentos do PNCP atrás de ART/CREA), e não a cobertura atual.

**Estado do dado:** o repositório **não traz nenhum resultado salvo**. A pasta de dados fica fora do repo (`ORQ_DATA_DIR`). `.gitignore` exclui `dados/`, `*.db` e `output/`. Os únicos arquivos com dado são catálogos (fontes, órgãos, dispositivos legais) e fixtures sintéticas (`tests/fixtures/staged.py`, linha 1: "dados sinteticos ... inventados"). O que existe são **coletores prontos para rodar**, sem credencial. Os números de "rodada real" do Crea-SP aparecem só em comentários do código (seção 8).

**Credenciais:** o sistema foi feito para não usar chave (`.env.exemplo`: "o sistema não usa chave de API"). As fontes que exigem cadastro ficam desligadas por padrão: API do Portal da Transparência/CGU, INLABS, Brasil.IO, ONR e Fala.BR para pedido de LAI. O DataJud usa a chave pública da wiki do CNJ, que muda de tempos em tempos; a tarefa humana `decidir_configuracao datajud_apikey` cuida disso.

**Ritmo:** o maestro abre uma rodada por dia por órgão, na cadeia `sondar -> coletar -> analisar -> grafo -> cacar -> perguntar -> relatar` (`docs/operacao.md` §3). Outras rotinas:
- verificador: a cada 12 h;
- preparador de representação e redator de LAI: a cada 6 h;
- descobridor: toda semana;
- fiscal da lei: a cada 180 dias (`config.py`, `CONFIG_PADRAO`).

Teto de 1.500 requisições por host por dia, repartido por papel. A coleta fica com 70% (`coleta/orcamento.py`).

---

## 2. Coletores e fontes

O catálogo `fontes/catalogo.json` tem 56 fontes, cada uma com selo de confiança:
- `verificado`: já usado com sucesso;
- `citado`: visto em documentação;
- `a_conferir`: caminho deduzido.

Abaixo, as que têm cliente em `coleta/clients.py`, `coleta/pncp_docs.py` ou `coleta/judiciario.py`, e depois as de leitura humana.

### 2.1 Com coletor automático

| Fonte (id no catálogo) | Endereço | O que traz / campos usados | Credencial | Estado |
|---|---|---|---|---|
| **Portal da Transparência do Crea-SP, API Implanta** (`implanta-crea-sp`) | `https://crea-sp.implanta.net.br/portalTransparencia/api/v1.0` (e o prefixo alternativo `/transparencia/api/v1.0`) | 16 endpoints (ver abaixo). Janelas anuais com checkpoint. Sondagem retroativa até 2010, que para após 2 anos vazios | nenhuma | `verificado` |
| Portal do Confea, Implanta (`implanta-confea`) | `confea-br.implanta.net.br` | Empenhos, Pagamentos, Contratos, ContratosAditivos, Convenios, AtasColegiados | nenhuma | `a_conferir` |
| Implanta dos 23 Creas de benchmark (`stage_benchmark_creas`) | `crea-XX.implanta.net.br` | Só `ComparativoDespesa`, nos 3 últimos exercícios | nenhuma | desligado por padrão (`benchmark_ativo=0`) |
| Dados abertos do Crea-SP, candidatos (`orgaos.json` extras) | `transparencia.creasp.org.br/service-api` e mais 5 candidatos | `quadro-colaboradores`, `mandatarios`, `indenizacoes` | nenhuma | não confirmado: o descobridor testa os candidatos |
| **PNCP, API de consulta** (`pncp-consulta`) | `https://pncp.gov.br/api/consulta/v1/contratos`, `/v1/contratacoes/publicacao`, `/v1/instrumentoscobranca/inclusao` | Contratos por `cnpjOrgao`, em janela **mensal**, desde 2021. Contratações por modalidade (4, 6, 8, 9 e 12) desde 2023. Notas fiscais (instrumentos de cobrança) do órgão-alvo | nenhuma | `verificado` |
| **PNCP, API principal** (`pncp-api`) | `https://pncp.gov.br/api/pncp/v1/orgaos/{cnpj}`, `/unidades`, `/compras/{ano}/{seq}/arquivos` | Confere CNPJ, razão social e UF do órgão. Lista e baixa os PDFs de cada compra | nenhuma | `verificado` |
| **Leitor de documentos do PNCP** (`coleta/pncp_docs.py`) | idem, mais download dos arquivos | Até 3 documentos por contratação, na ordem TR, Projeto Básico, ETP, Projeto Executivo, Anteprojeto, Edital, Minuta, Contrato, Termo Aditivo (`TIPOS_RELEVANTES_ENGENHARIA`). Extração em cascata PyMuPDF, pdfplumber, Tesseract (OCR de até 8 páginas a 200 dpi). Marca 8 categorias de rito de engenharia (seção 3.1) | nenhuma | pronto. Roda 20 contratações por rodada (`agentes/pesquisador.py:33`) |
| **CEIS e CNEP, CGU** (`cgu-ceis`, `cgu-cnep`) | `portaldatransparencia.gov.br/download-de-dados/ceis/{AAAAMMDD}` (ZIP diário; recua até 10 dias) | documento, nome, categoria, início, fim, órgão sancionador, esfera, UF, fundamento. Calcula `efeito_nacional` para inidoneidade e proibição de contratar | nenhuma | `verificado` |
| **BrasilAPI e Minha Receita, CNPJ** (`brasilapi-cnpj`, `minhareceita`) | `brasilapi.com.br/api/cnpj/v1/{cnpj}`, `minhareceita.org/{cnpj}` | razão social, situação cadastral, abertura, CNAE, município/UF, porte, QSA (CPF mascarado), natureza jurídica. Consulta só fornecedores acima de R$ 50 mil, no máximo 150 CNPJs | nenhuma | `verificado` |
| Querido Diário (`querido-diario`) | `api.queridodiario.ok.org.br/cities`, `/gazettes` | menções em diários municipais | nenhuma | cliente de cidades e gazetas pronto. A busca por CNPJ chamada pelo pesquisador (`querido_diario_buscar`) **não existe**: o `hasattr` devolve vazio |
| DataJud, CNJ (`datajud`) | `api-publica.datajud.cnj.jus.br/api_publica_{trf3,trt2,trt15,tjsp,stj}/_search` | metadados de processo pelo número CNJ. Não traz nome das partes | chave pública | `citado` |
| DJEN / Comunica, CNJ (`djen-comunica`) | `comunicaapi.pje.jus.br/api/v1/comunicacao` | publicações por tribunal e mês, filtradas localmente pelo nome, sigla e CNPJ do Crea-SP. Extrai números CNJ | nenhuma | `citado`. O parâmetro de nome de parte falta e precisa de captura humana |
| TCU, acórdãos (`tcu-acordaos`) | `dados-abertos.apps.tcu.gov.br/api/acordao/recupera-acordaos` | fatias sequenciais; o filtro de texto (Crea-SP/Confea) é feito localmente | nenhuma | `citado` |
| BCB SGS (IGP-M 189, IPCA 433) e IBGE localidades | `api.bcb.gov.br`, `servicodados.ibge.gov.br` | índices para o reajuste de aluguel e para deflacionar; códigos de município | nenhuma | `citado` |
| Planalto e LexML | `planalto.gov.br/ccivil_03`, `lexml.gov.br/busca/SRU` | texto oficial das normas, para conferir os dispositivos por hash | nenhuma | `citado` (`legal/oficial.py`) |
| CKAN: dados.gov.br e dados.sp.gov.br | `/api/3/action/package_search` | descoberta de conjuntos de dados | nenhuma | `a_conferir` |

**Os 16 endpoints Implanta do Crea-SP** e o que cada etapa grava (`coleta/pipeline.py:545-935`; formatos de parâmetro em `coleta/clients.py:43-62`):

- `Empenhos`: VALOR, VALOR_PAGO, VALOR_ANULADO, DATA_EMPENHO, número do empenho e conta.
- `Pagamentos`: CPF_CNPJ (CPF vem mascarado), NOME_RAZAO_SOCIAL, VALOR, VALOR_LIQUIDO, DATA_PAGAMENTO. O sistema calcula PF/PJ.
- `Contratos`, por vigência: NUMERO_CONTRATO, CONTRATADA (CNPJ extraído do texto), VALOR, DATA_INICIO_VIGENCIA, DATA_FINAL_VIGENCIA, NUMERO_LICITACAO, OBJETO.
- **`ContratosAditivos`**: NUMERO_CONTRATO, VALOR, DATA_PUBLICACAO.
- `Licitacoes`.
- `Convenios`: VALOR_TOTAL.
- `ComparativoDespesa`: VALOR_ORCADO, REALIZADO_EXERCICIO.
- **`DespesasCentroCusto`**: VALOR_JAN a VALOR_DEZ, ORCAMENTO, SALDO e o nome do centro de custo. É o único eixo mensal e o único que diz qual unidade gastou.
- `DemonstrativoEmpenhosPagamentos`: orçado, empenhado, liquidado e pago.
- `PlanoDeContas`.
- `ProcessosComprasServicos`: itens com quantidade, valor unitário e melhor cotação.
- `AtasColegiados`.
- `BalancoOrcamentario`: dotações, receitas realizadas, despesas empenhadas, liquidadas e pagas.
- `ComparativoReceita`.
- `QuadrosPessoas`: nome, vínculo, cargo, lotação, remuneração.
- `Conselheiros` (rol de mandatários): nome, cargo, entidade, posse, fim previsto, domínio do e-mail. O e-mail em si é descartado.

A coleta também sonda 7 nomes para diárias (`DiariasDeslocamentos`, `Diarias`, `PassagensAereas` etc.). A observação do catálogo diz que o favorecido vem truncado em alguns endpoints e que não há endpoint judicial: pagamento judicial é garimpado pela conta contábil.

**PNCP do Crea-SP e dos relacionados:** `stage_pncp` (`pipeline.py:823`) baixa os contratos do Crea-SP (alvo) e de Confea, Mútua, Crea-RJ, Crea-MG e Crea-PR (relacionados), mês a mês. Campos: fornecedor_ni, nome, objeto, valorGlobal, **valorAcumulado**, assinatura, vigência, número de controle do contrato e da compra, categoria do processo. Também baixa as notas fiscais do alvo (emitente, valor, data).

**Função pronta e sem uso:** `pncp_contratos_por_periodo(ini, fim, uf=...)` (`clients.py:549`) baixa os contratos de **todos** os órgãos numa janela e filtra a UF em memória. Nenhum código a chama. Ela é a porta natural para varrer os contratos de prefeituras de SP.

### 2.2 De leitura humana ou tarefa humana, sem coletor

- Portal do Crea-SP: licitações e alienação de imóveis.
- Normativos do Confea.
- Compras.gov dados abertos.
- CEPIM e CEAF (formato a conferir).
- TCU inidôneos, e-Aud CGU, MPF Aptus.
- Fala.BR, mais os dados abertos de pedidos LAI: mostram o que já foi perguntado ao Crea-SP e como ele respondeu.
- DOU: consulta, mais INLABS com cadastro.
- TSE dados abertos.
- Receita: arquivos mensais de CNPJ e consulta com CAPTCHA.
- PJe TRF-3, TRT-2, TRT-15, e-SAJ TJSP (todos com CAPTCHA, por tarefa `consultar_processo_captcha`).
- CJF precatórios, Transparência do CNJ, ONR (matrícula de imóvel, paga), GeoSampa (valor venal), FipeZap.
- **TCE-SP Audesp** e Transparência SP: o catálogo diz literalmente "Conselhos federais não estão sob a jurisdição do TCE-SP". Entram só como expansão futura para entes municipais e estaduais.

Câmara, Senado e IBGE-SIDRA servem só de contexto.

**Não há Obrasgov** em lugar nenhum do repositório (grep sem resultado).

---

## 3. Detectores (27 frentes em `src/orquestrador/analise/checks/`)

As frentes rodam na ordem de `checks/__init__.py:23`. Todas leem o `staged` do órgão-alvo, isto é, as contas do Crea-SP. Os limiares globais estão em `src/orquestrador/config.py:278-342`:

- Limite de dispensa por exercício: R$ 8.000 até 2017; R$ 17.600 de 2018 a 2020; R$ 50.000 em 2021 e 2022; R$ 59.906,02 a partir de 2023.
- Fracionamento: janela de 90 dias.
- Aditivo: limite de 25%, para contratos de pelo menos R$ 50 mil.
- Empresa recente: menos de 180 dias.
- Diárias e jetons: teto de diária R$ 900; máximo de 100 diárias por ano; 12 jetons por mês; 1 por dia. O próprio `config.py:326-333` declara esses quatro como **assumidos**, sem norma lida.
- Anos eleitorais do Crea: 2011, 2014, 2017, 2020, 2023 e 2026, também assumidos.
- Marco 8.666/14.133 em 30/12/2023 (`marco_lei_14133`).

O mapa de cada achado para o tipo de indício e os dispositivos candidatos está em `base_legal/mapa_checks.json`, com 21 tipos e cerca de 160 entradas.

### 3.1 O que importa para Fiscalização e malha fina

**Rito de engenharia** (`checks/rito_engenharia.py` + `coleta/pncp_docs.py:77-140`). É a frente mais próxima de "contrato público de engenharia sem ART".
- **O que testa:** em cada contratação publicada no PNCP, lê TR, Projeto Básico, Edital, Contrato e Aditivo e procura 8 categorias de marcador.
  - 5 específicas: "ART" em caixa alta, que não confunde com "art."; CREA, sem casar "CREAS" da assistência social; engenheiro responsável; obra ou serviço de engenharia; Lei 14.133, art. 6º, XII e XXI.
  - 3 genéricas: atestado de capacidade técnica ou responsável técnico; projeto básico ou executivo; ABNT NBR.
- **Regra (limiar):** 2 ou mais marcadores, sendo pelo menos 1 específico, significa rito presente (`rito_engenharia.py:57-58`). Objeto com cara de engenharia (regex de obra, reforma, elétrica, hidráulica, climatização etc.) sem o rito gera `rito-obra-sem-marcadores`: gravidade alta com 3 ou mais contratações, média abaixo disso.
- **Outros achados:** `rito-sem-documento-no-pncp` (média, opacidade). PDF ilegível sai da estatística e vira tarefa humana.
- **Base legal:** Lei 6.496/1977, art. 1º; Lei 5.194/1966, art. 13; Lei 14.133, art. 6º, XXI; Res. Confea 1.025/2009 (`mapa_checks.json`, prefixo `rito-`).
- **Calibração:** o docstring registra que um TR de limpeza com o texto padrão marcava 4 categorias genéricas e nenhuma específica.
- **Alcance de hoje:** só as contratações em que o **Crea-SP** (e os relacionados) é o contratante.

**Aditivos**, em `checks/contratos.py`.
- `contratos-aditivos-limite` (alta, `:450`): acréscimo de valor acumulado acima de 25% em contrato de pelo menos R$ 50 mil, fora prorrogação pura. Base: Lei 8.666, art. 65, §1º e Lei 14.133, art. 125 (25%; 50% em reforma).
- `contratos-aditivo-indeterminado` (média): aditivo com valor idêntico ao do contrato fica fora, por ambiguidade.
- `contratos-prorrogacoes` (info). Base: art. 107 da 14.133 e art. 57, II da 8.666.
- `contratos-pncp-acumulado` (média, `:766`): no PNCP, `valorAcumulado` maior que `valorGlobal` × 1,25.
- Os quatro se aplicam aos contratos do Crea-SP.

**Contratos fora do PNCP**, também em `contratos.py`.
- `contratos-ausentes-pncp` (média, `:697`): contrato do portal Implanta firmado a partir de 30/12/2023 (`:682`) sem correspondente no PNCP. O casamento é por CNPJ com 14 dígitos (zfill); por nome, se faltar CNPJ. Base: Lei 14.133, arts. 94, 174 e 54.
- `contratos-fora-do-pncp-convivencia`: contexto, para 2021 a 2023.
- `contratos-so-no-pncp` (baixa): está no PNCP e não no portal próprio. Base: LAI, art. 8º.
- `contratos-vinculo-certame-ausente` (alta): mais de 95% dos contratos sem número de licitação.
- `contratos-sem-licitacao`.

**Fornecedores** (`checks/fornecedores.py`), pela ficha da Receita.
- `fornecedores-sancionados`: cruzamento com CEIS e CNEP. Base: Lei 8.666, art. 87, IV; Lei 14.133, arts. 156, IV e 14; Lei 12.846, art. 19, IV.
- `fornecedores-empresa-recente`: menos de 180 dias.
- `fornecedores-situacao-irregular`.
- `fornecedores-cnae-x-objeto`: CNAE incompatível com o objeto, para contratos de pelo menos R$ 50 mil; inclui o grupo CONSTRUCAO/ENGENHARIA.
- Geografia e porte.

**Não existe nenhum detector de "empresa contratada sem registro no Crea-SP".** Esse cruzamento exige a base interna de registro, que o repositório não tem.

### 3.2 O que importa para Financeiro: o próprio Crea-SP

| Frente | O que testa (achados principais) | Limiar | Base legal citada |
|---|---|---|---|
| `finalistica` | despesa-meio × despesa-fim por centro de custo e conta; "R$ X na máquina para cada R$ 1 na atividade-fim" | razão > 4 dá média, mas só se a atividade-fim for ≥ 5% da despesa | CF art. 37 (contexto) |
| `superintendencias` | quanto fica na estrutura central e quanto chega às UGIs; `super-fiscalizacao-efetiva`; `super-verba-supera-salario`; `super-unidade-sem-fiscalizacao` | fiscalização < 15% dá alta; unidade com < 5% em fiscalização | CF art. 37 |
| `receita` | composição da receita (anuidade por segmento, ART, multas de fiscalização das Leis 5.194 e 6.496, dívida ativa, serviços); **`receita-cobertura-por-art`**: centavos de fiscalização por R$ de ART, com CAGR; multa × anuidade | série de pelo menos 4 anos | contexto |
| `orcamento` | dotação × execução; estouro de conta; retorno da anuidade; verbas sobre a receita | estouro > 50% em conta ≥ R$ 200 mil | Lei 4.320, arts. 58 e 60 |
| `plano` | plano de contas oficial × execução; famílias mal cobertas | família ≥ R$ 5 mi com ≥ 40% não classificada | LAI, art. 8º |
| `opacidade` | favorecido agregado ("DIVERSOS FUNCIONARIOS" etc.), decomposto pela conta | — | LAI, arts. 7º e 8º |
| `diarias` | diárias, quilometragem, jetons por PF; limite mensal; acúmulo diário; político × quadro; PJ de viagem | 100 por ano, 12 jetons por mês, 1 por dia (assumidos) | "RES-CONFEA-DIARIAS" (número não identificado); CF art. 37 |
| `pessoal` | salário do quadro + indenizações por pessoa ("renda invisível") | — | idem |
| `sazonalidade` | concentração em dezembro e verba em lote, por centro de custo | dezembro ≥ 25%; < 6 meses efetivos; piso R$ 100 mil | Lei 4.320, arts. 60 e 63 |
| `empenhos` | art. 60 da Lei 4.320 (pagamento sem empenho); pago > empenhado; fracionamento; anulações; concentração e HHI; fornecedores cativos | dispensa por ano; 90 dias; cruzamento só vale com ≥ 50% de casamento | Lei 4.320, arts. 58, 60 e 62; Lei 14.133, arts. 29 e 75; Lei 8.666, arts. 23, §5º e 24, II |
| `contratos` (execução) | pago × contratado por fornecedor; pagamento após a vigência; contrato não executado; valor implausível | razão ≥ 2,0 ou ≤ 0,5; casamento por nome ≥ 25% | Lei 4.320, arts. 62 e 63; Lei 14.133, arts. 105 e 125 |
| `casos` | "entidade da casa" (entidade criada em torno do conselho); **obras, construção e sede** do próprio Crea-SP; contratos excepcionais; PF prestadora | obra > R$ 20 mi dá média | Lei 14.133, arts. 6º, XII e 9º, §1º; Lei 6.496, art. 1º |
| `imoveis` | locações: locador recente, mesmo locador com vários imóveis, endereço do locador igual ao do imóvel, reajuste acima do IGP-M/IPCA, pago × contratado, uso de "dispensa" depois de 30/12/2023 (devia ser inexigibilidade, art. 74, V) | divergência 15%; +30% sobre a referência; 1,5× a mediana interna; reajuste +2 p.p.; 60/120 meses | Lei 14.133, arts. 74, V e §5º, 51 e 92, §3º; Lei 8.245, art. 3º; Lei 8.666, art. 24, X |
| `judicial` | pagamentos por conta judicial; precatório citado (anomalia, pelo Tema 877); concentração; acordo em janela de posse; pico em ano eleitoral; escritório nos dois lados; homônimo de mandatário | top-5 ≥ 60%; um favorecido ≥ 25%; 3 exercícios; razão ano eleitoral 1,5; 180 dias | Lei 14.133, art. 74, III; Lei 9.469, art. 1º; STF Tema 877; CF art. 109, I; Lei 8.429, art. 10 |
| `forense` | Benford de 1 e 2 dígitos; bunching logo abaixo do limite de dispensa; dezembro; estornos; valores redondos e repetidos | mínimo 5 por estrato | Lei 14.133, art. 75 |
| `temporal` | pagamento com "cadência de relógio" sem contrato; rajada datada (Kleinberg) | 24 meses, ≥ 12 pagamentos, regularidade 0,75; rajada ≥ 8 eventos | Lei 14.133, arts. 95 e 72 |
| `blocos`, `estrutura`, `rede`, `identidade` | blocos densos favorecido × conta × mês com nulo de permutação (39 embaralhamentos, α 0,05); coocorrência validada; sócios compartilhados; sócio homônimo de conselheiro ou funcionário; fornecedores comuns a Confea, Mútua e Creas; convênios em ciclo eleitoral; casamento probabilístico Fellegi-Sunter (limiar 6 bits) | mínimo 12 processos; grau 8 | Lei 14.133, arts. 9º, §1º e 14; Lei 12.529, art. 36, §3º, I; Decreto 6.170, art. 2º |
| `precos` | preço unitário acima de 2× a mediana do item; efeito-fornecedor por mínimos quadrados | ≥ 3 cotações; ≥ 4 observações | Lei 14.133, art. 23 |
| `atas` | modelo local extrai das atas a decisão, o beneficiário e o valor, e cruza com os pagamentos; conflito | até 200 atas | Lei 9.784, arts. 18 e 20; Lei 14.133, art. 9º, III |
| `representacao` | dinheiro do conselho para as entidades de classe que indicam conselheiros; duplo canal (convênio + contrato); assento × recurso; mandato sem termo | — | Lei 14.133, art. 9º, III; Lei 9.784, art. 18 |
| `benchmark` | despesa por profissional ativo e participação das verbas, entre Creas | ≥ 5 pares | contexto |
| `diagnostico` | por que cada fonte veio vazia (403, 404, 400, 5xx ou 200 vazio); só "200 vazio" vira achado de transparência | — | LAI, arts. 7º e 8º, §3º |

---

## 4. A etapa de "derrubar o achado" (falsos positivos)

Fica em `analise/verificacao.py` e `agentes/verificador.py`. Todo indício alto ou médio passa por testes de refutação antes de chegar a um humano ou a um dossiê.

**Testes gerais, para todos** (`verificacao.py:874`):
- duplicidade, só com identificador repetido;
- dígito verificador do CNPJ, que pega erro do portal;
- reconferência de até 3 linhas na base staged;
- cobertura;
- persistência entre rodadas;
- origem do dado.

**Testes específicos** (`:875-909`):

| Achado | Testes |
|---|---|
| fracionamento | transferência legal ou folha excluída, exercício no limite, estorno, contrato formal vigente, sensibilidade ao limiar |
| aditivo | sensibilidade |
| pago acima do contratado | implausibilidade |
| sancionado | assinatura × sanção: contratou antes e pagou durante a sanção baixa de "contratou impedido" para "pagou durante" |
| empresa recente e situação irregular | recoleta da ficha sem cache |
| homônimos | força do nome, medida pela frequência na própria base; dígitos visíveis do CPF |
| rede | mercado estreito ("três empreiteiras que são as únicas habilitadas" não é conluio), hub de mercado (contador ou coworking), poder do teste, nulo de configuração |
| pagamento sem contrato | instrumento que ampara: rebusca por CNPJ, nome, aditivo e PNCP |
| rajada | rajada de calendário (todo dezembro é rotina) |

**Veredito:** basta um `refuta` para o indício ficar `refutado`, com o motivo gravado e sem apagar nada. Se algum teste pede humano, fica `aguardando_humano`. Se algum é inconclusivo, fica `inconclusivo`. Só com todos sem refutação fica `verificado`.

**Cobertura** abaixo de 25% (`COBERTURA_MINIMA_DOSSIE`, `:38`) não refuta, mas impede dossiê sem revisão humana. Os testes que vão à rede são pulados quando um teste local já refutou.

**Casos compostos** (`analise/casos_compostos.py` + `regras_casos.json`): somam peso quando dois indícios caem no mesmo CNPJ.
- R3: sancionado nacional recebendo durante a sanção, peso 5.
- R4: fornecedor do sistema com aditivo acima do limite, peso 2.

Regras gerais: score mínimo 6, todos os componentes verificados, e um componente refutado derruba o caso.

**Lacuna para a malha fina:** `rito-obra-sem-marcadores` **não tem teste de refutação específico**, só os gerais. A frente se defende de outra forma: tira o PDF ilegível da estatística, separa genéricos de específicos e pede o processo administrativo em vez de acusar.

---

## 5. Base legal conferida

`base_legal/dispositivos.json` tem 88 dispositivos, cada um com trecho literal, resumo, URL e vigência:
- CF: arts. 37, 70, 71, 100 e 109;
- LAI e Decreto 7.724;
- Leis 14.133, 8.666 (com fim de vigência em 29/12/2023), 4.320, 5.194, 6.496, 8.429, 8.443, 9.469, 9.784, 12.529, 12.846 e 13.709 (LGPD);
- Decreto 6.170;
- Res. Confea 1.025/2009;
- "Res. Confea de diárias" (número não identificado);
- STF Tema 877 e STJ Súmula 66.

**Os 88 estão `a_conferir`.** O dossiê só transcreve dispositivo `conferido_auto` ou `verificado` (`dossies/fundamentacao.py`). Até o operador rodar `python main.py legal conferir --gravar`, que baixa o Planalto e confere o trecho por hash, nenhum artigo sai citado.

A vigência é regra dura: `legal/indice.py` usa `config.marco_lei_14133`, e um fato de 2019 nunca recebe a 14.133. A própria agenda de auditoria (`docs/agenda_auditoria.md`) registra o defeito "o marco usa o exercício do indício, não a data do contrato". Os itens da agenda que constam como fechados não incluem esse.

**Competência** (`base_legal/competencia.json`, `legal/competencia.py`):
- Esfera federal: destino padrão TCU, CGU/Fala.BR e ouvidoria do órgão.
- Por tipo: conflito e autocontratação vão para MPF; conluio para TCU, MPF e CADE.
- **Nunca** TCE-SP nem MP-SP para autarquia federal.
- Esferas estadual e municipal: TCE-SP e MP-SP.

A esfera e a natureza jurídica são lidas do CNPJ do órgão na Receita (`legal/natureza.py`). Todos os canais estão `a_conferir`: URL e limites são confirmados pelo operador no primeiro uso.

---

## 6. Modelos de representação e de LAI

**Representação ou aditamento, 12 seções fixas** (`dossies/secoes.py:100-160`):
1. denunciante (em branco: o sistema não guarda);
2. órgão e período dos fatos;
3. síntese (única seção que o modelo local pode redigir);
4. fatos;
5. evidências e proveniência (SHA-256, origem por base, commit do programa);
6. fundamentação (só dispositivo conferido e vigente);
7. verificações realizadas;
8. pedidos (pedido padrão por tipo, de `competencia.json` `pedidos_por_tipo`);
9. órgão competente e alternativas;
10. anexos;
11. ressalvas (indício, homonímia, cobertura, método);
12. LGPD.

Regras de entrada e de texto:
- Só entra indício `verificado`.
- Sai um documento por tipo e por destinatário.
- Fato já protocolado vira aditamento com o delta (`dossies/denuncia.py`).
- Palavras proibidas: fraude, desvio, ilegalidade, crime, culpa (`dossies/textos.py`).
- Anexos: CPF mascarado e reconferido, `manifesto.json` com sha256, zip no limite do canal (`dossies/pacote.py`).
- Captura datada da página do portal pelo Chromium, pela mesma porta da coleta (`dossies/captura.py`).

**Pedido de LAI, 6 seções** (`secoes.py:356-390`):
1. órgão e canal;
2. assunto (até 100 caracteres);
3. pedido;
4. forma de entrega (CSV ou JSON com dicionário; parte não restrita; resposta negativa expressa);
5. fundamento;
6. observações (sem motivação, art. 10, §3º).

É um tema por pedido (Decreto 7.724, arts. 12 e 13). O texto das perguntas vem de gabarito, sem modelo de linguagem (`agentes/questionador.py`). As perguntas nascem de quatro fontes: dataset que respondeu "200 vazio", fonte bloqueada 3 vezes, tarefa dispensada, e indício cuja verificação depende de documento do órgão.

`COMO_PEDIR` (`questionador.py:39-57`) traz o texto de pedido de 16 bases do Crea-SP. Exemplos:
- "relação de termos aditivos, com contrato de origem, objeto do aditamento, valor acrescido e novo prazo";
- "relação de diárias, jetons e indenizações pagas, por beneficiário";
- "despesa executada por centro de custo".

**Recurso, 5 seções** (`secoes.py:400+`), com prazos contados em `dossies/prazos.py`: 20 dias, mais 10 com justificativa, e 10 dias para recurso, pela Lei 9.784, art. 66, com feriados de `base_legal/feriados.json`.

**Reentrada** (`dossies/reentrada.py`): o CSV que chega por resposta à LAI vira `datasets(origem='lai')` e é reanalisado.

---

## 7. Resultados salvos

Não há. Nenhum CSV, banco, relatório ou dossiê está versionado. Em `git ls-files` só aparecem código, JSON de catálogo, documentos, o notebook do Colab e `assets/chart.umd.js`.

`tests/fixtures/staged.py` é sintético, assim como o `selftest`. Os dados de "profissionais ativos" por Crea em `fontes/orgaos.json` são o único número externo armazenado (seção 8).

---

## 8. Números concretos que o repositório traz

Nenhum destes vem de arquivo de dado. São números **citados em comentários de código sobre uma "rodada real" do Crea-SP**, do projeto de origem que o repositório chama de "QUEDA"/`src/queda`; o empresas o cita como repositório `conselho`. Servem como ordem de grandeza e hipótese a reconferir, não como dado publicável:

- **Favorecido agregado:** o maior favorecido dos pagamentos do Crea-SP é o rótulo "DIVERSOS FUNCIONARIOS", com **R$ 1,33 bilhão** (`checks/opacidade.py`, docstring).
- **Contratos sem certame informado:** **965 de 965** contratos do portal sem número de licitação, e o dataset de licitações voltou vazio (`checks/contratos.py:534`).
- **Aditivo ambíguo:** em **59 de 79** aditivos, **R$ 417,8 mi de R$ 464,6 mi**, o valor era igual ao do contrato. Isso levou a separar o caso como ambíguo (`contratos.py:395-396`).
- **Valor implausível:** contrato publicado com **R$ 345.011.843,00 para 180 dias** (`contratos.py:74-76`).
- **Meio × fim:** "**R$ 14,9 na máquina para cada R$ 1 na atividade-fim**", com a ressalva de que a atividade-fim identificada era só 1,35% da despesa (`checks/finalistica.py:123-130`).
- **Verbas:** **R$ 178,6 mi** de verbas na comparação político × quadro (`checks/diarias.py:182`); quilometragem de **R$ 87,7 mi** na série (`analise/taxonomia.py:80`).
- **Receita:** anuidade reclassificada de 10% para **46% da receita** (cerca de R$ 1,55 bi); "Multas Leis 5.194/66 e 6.496/77 PJ" com **R$ 33,3 mi**; **R$ 1,74 bi em 432 contas** de receita não classificadas na primeira versão (`checks/receita.py:38-66, 171-172`).
- **Território:** no Crea-SP a unidade de campo é a UGI. A primeira versão classificava a "Unidade de Finanças" (R$ 330 mi) como território (`checks/superintendencias.py:36-42`).
- **Profissionais ativos (Confea/SIC, 30/08/2026):** Crea-SP **346.824**, Crea-MG 161.214, Crea-RJ 119.957, Crea-PR 76.749, e os demais Creas (`fontes/orgaos.json`). **Atenção:** Confea e Mútua estão com 23.530, o mesmo número do Crea-DF, o que parece cópia por engano.

---

## 9. O que o repositório empresas já tem (para não repetir)

Busca em `src`, `docs` e `scripts`:

- **PNCP:** já existe coletor TypeScript (`scripts/integrations/pncp.ts`).
  - Usa `/v1/contratos`, filtra SP e categorias 7, 8 e 9, e confere a paginação.
  - Há um agregado real em `src/domain/pncp-public-aggregate.json`: 1 dia (01/09/2025), 6.241 contratos no Brasil, 1.430 em SP, 341 nas categorias selecionadas.
  - O painel de Fiscalização (`src/fiscalizacao/PaginaContratos.tsx`, `PaginaObras.tsx`, `docs/FISCALIZACAO.md`) já tem: contratos técnicos com e sem ART encontrada, cruzando contrato com a ART interna; fornecedor sem registro na data; PCA; obras do Obrasgov sem ART de fiscalização ligadas pelo CIPI. Tudo isso em **cenário demonstrativo**.
- **Obrasgov e TCE-SP:** aparecem só como fonte catalogada ou parceria (`src/observatorio/fontes.json`; o TCE-SP é parceria para "quanto já foi pago"). No orquestrador não há Obrasgov, e o TCE-SP é só leitura humana.
- **Implanta do Crea-SP:** o empresas já tem o desenho, mas **só em camada demonstrativa**.
  - `src/domain/conselho.ts:6-10` (V20 "controle interno") cita DespesasCentroCusto, BalancoOrcamentario, ComparativoDespesa e Receita, Empenhos, Pagamentos, Contratos, ContratosAditivos, Licitacoes e QuadrosPessoas.
  - `src/domain/pessoas-conselho.ts` e `entidades.ts` citam QuadrosPessoas, Diarias e Convenios.
  - Aditivo aparece só como contagem "com aditivo" em contratos sintéticos (`conselho.ts:28, 137`; `blocos-orcamento.tsx:152`).
- **Malha fina:** existe como página de regras sobre empresas (registro, CNAE, ART por profissional), sem leitura de documento.
- **Sem equivalente no empresas** (grep sem resultado em `src`):
  - leitura de edital, TR e contrato do PNCP atrás de ART/CREA;
  - teste de aditivo acima de 25% ou `valorAcumulado` maior que `valorGlobal`;
  - comparação portal próprio × PNCP;
  - sanções CEIS/CNEP aplicadas, que estão só catalogadas;
  - Benford, fracionamento, dispensa;
  - refutação de indício;
  - base legal com vigência;
  - modelos de representação e LAI;
  - DJEN e DataJud aplicados (só catalogados).

**O que é novo de fato:**
1. O coletor Implanta **real** e completo do Crea-SP, com checkpoint e diagnóstico do porquê de cada vazio. Ele substitui o demonstrativo do empresas.
2. O leitor de documentos do PNCP com regra de rito de engenharia.
3. Os detectores de aditivo, PNCP × portal, fracionamento e sanção.
4. A camada de refutação.
5. Os gabaritos de LAI ao próprio Crea-SP.

---

## 10. Quadro por painel

| Painel | O que o orquestrador oferece | Como entra | Tipo de dado | Depende de |
|---|---|---|---|---|
| **Fiscalização e malha fina: contratos públicos de engenharia sem ART** | `pncp_docs.analisar_contrato` + regra 2 marcadores com ≥ 1 específico; `pncp_contratos_por_periodo(uf="SP")`, pronta e sem uso | **Alerta** "contrato com objeto de engenharia cujo processo publicado não cita ART/CREA/engenheiro responsável", lista com número de controle do PNCP e link do documento. **Indicador**: % de processos lidos com rito, % ilegíveis e % sem documento. **Cruzamento interno × externo**: o processo sem marcador × ART interna do CreaNet pelo CNPJ da contratada e pelo número do contrato. É a confirmação que o orquestrador não consegue fazer sozinho | só código coletor (sem dado) | reapontar de "contratos do Crea-SP" para "contratos de órgãos de SP"; base interna de ART |
| Fiscalização: obra pública sem responsável técnico | marcadores `ENGENHEIRO_RESPONSAVEL` e `ART`; leitura humana de PDF ilegível (`humano.ler_pdf_ilegivel` com o campo `tem_responsavel_tecnico`) | mesmo alerta, filtrado por objeto de obra (regex `_parece_engenharia`) | código | idem; não há Obrasgov |
| Fiscalização: empresa contratada sem registro no Crea-SP | nada pronto. Entrega o `fornecedor_ni` do PNCP e a ficha da Receita (CNAE, abertura, situação) | cruzamento CNPJ do fornecedor PNCP × cadastro de PJ do CreaNet; o CNAE de construção do `fornecedores-cnae-x-objeto` ajuda a priorizar | código | base interna |
| Fiscalização: aditivos | `contratos-aditivos-limite` (> 25%), `contratos-pncp-acumulado` (`valorAcumulado` > `valorGlobal` × 1,25), `eh_termo_aditivo` (documento tipo 14) | **alerta** de aditivo acima de 25% em obra pública. Para a fiscalização, aditivo de obra é **gatilho para checar ART complementar ou de aditivo**. Hoje roda sobre contratos do Crea-SP; aplicar a `valorAcumulado` dos contratos de SP é direto | código | — |
| Fiscalização: transparência dos órgãos | `rito-sem-documento-no-pncp`; `contratos-ausentes-pncp` | indicador de órgãos que publicam contrato sem documento (sem como conferir a ART) | código | — |
| **Empresas** | fichas da Receita (situação, abertura, CNAE, porte, município, QSA); CEIS e CNEP diários; rede de sócios e endereços com nulo; recém-criada; sancionada | alertas sobre empresa registrada no Crea-SP que está **sancionada** (CEIS/CNEP, efeito nacional), **inapta** ou recém-aberta e já contratando; grupos econômicos por sócio ou endereço comum | código; CEIS/CNEP sem credencial e diários | cruzar com o cadastro de PJ do CreaNet |
| **Financeiro (o próprio Crea-SP)** | os 16 endpoints Implanta e as frentes receita, orçamento, plano, finalística, superintendências, sazonalidade, empenhos, contratos, diárias, pessoal, imóveis, judicial, forense, opacidade e benchmark | **indicadores**: receita por fonte (anuidade por segmento, ART, multas das Leis 5.194/6.496, dívida ativa); orçado × realizado por conta; centro de custo central × UGI; % da despesa na fiscalização; centavos de fiscalização por R$ de ART (CAGR); dezembro; verbas × salário nas unidades de fiscalização. **Alertas**: pagamento sem empenho, fracionamento, aditivo > 25%, contrato pós-vigência, contrato não publicado no PNCP, favorecido agregado, locação com fundamento errado, precatório citado. **Benchmark** entre Creas por profissional ativo | código; dado público sem credencial | o dado interno (GovAdm/contabilidade) dá a versão nominal e exata; o externo mostra o que o público vê |
| Gestão do Conselho (colegiado) | `AtasColegiados` (extração por modelo local), `Conselheiros` (mandatários: entidade, posse, fim), `representacao` (repasses às entidades que indicam conselheiros), `atas-indicio-conflito` | cruzar o rol de mandatários e as entidades × convênios e contratos; mandato sem termo; decisão da ata × pagamento | código | Votenet tem o dado interno melhor; as atas públicas servem de checagem |
| Profissionais | `orgaos.json`: profissionais ativos por Crea (Confea/SIC 30/08/2026) | denominador de comparação nacional (Crea-SP 346.824) | dado real (um número por Crea) | — |
| Presidência / risco institucional | `diagnostico-porque-vazio` (o que o portal do Crea-SP não publica), Fala.BR dados abertos, TCU acórdãos, DJEN | **painel de exposição**: o que um auditor externo encontraria e pediria por LAI ao Crea-SP; a lista de bases vazias vira tarefa de transparência ativa | código | — |

## 11. Cruzamentos de alto valor (interno × externo)

1. **Processo do PNCP sem marcador de rito × ART interna.** A regra de marcadores dá o candidato. A base de ART do CreaNet, pelo CNPJ da contratada e pelo número do contrato ou da compra, dá a confirmação. O orquestrador sozinho só diz "o processo publicado não cita ART". Com a base interna, isso vira "contrato de engenharia sem ART registrada", que é exatamente o card "contratos sem ART encontrada" do empresas, hoje demonstrativo.
2. **`valorAcumulado` > `valorGlobal` no PNCP × ART de aditivo ou complementar.** Aditivo de valor ou prazo em obra deveria gerar ART complementar.
3. **CEIS/CNEP diários × cadastro de PJ do Crea-SP.** Mostra empresa registrada e sancionada com efeito nacional. Sem credencial, com atualização diária.
4. **Implanta público × contabilidade interna**, para Financeiro. Concilia o que o portal mostra com o GovAdm e responde aos achados de opacidade antes que um terceiro os faça. Exemplo: favorecido "DIVERSOS FUNCIONARIOS", e 965 de 965 contratos sem certame informado, se ainda for assim.
5. **Centavos de fiscalização por R$ de ART × ações e autos do painel de Fiscalização.** Mede cobertura por obra registrada.
6. **Benchmark por profissional ativo.** Despesa e verbas por profissional entre Creas, com fonte declarada.

## 12. Alertas e limites

- **Alcance das frentes.** Elas analisam as contas do Crea-SP como contratante. Usar o rito de engenharia na malha fina dos contratos de prefeituras exige reapontar a coleta para `pncp_contratos_por_periodo`. É preciso também reconsiderar o orçamento de 20 processos lidos por rodada e o teto de 1.500 requisições por host por dia.
- **Base legal ainda não citável.** Os 88 dispositivos estão `a_conferir`. Os canais de denúncia estão `a_conferir`. Os limiares de diária e jeton são assumidos (`config.py:326-333`).
- **Benchmark incompleto.** Ele exclui Crea-RJ, Crea-MG e Crea-PR, que têm papel `relacionado` e não `benchmark` (`pipeline.py:540-543`). O catálogo fala em "~28 hosts", mas só 23 entram.
- **Funções ausentes.** `pncp_contratos_por_fornecedor` e `querido_diario_buscar` não existem. A pesquisa "mesmo fornecedor em outros órgãos" devolve vazio em silêncio (`agentes/pesquisador.py`).
- **Ética e cuidado.** O sistema não cruza nome com magistrado. Homonímia nunca vira identidade. O CPF sai mascarado (`lgpd.py`). Isso deve ser mantido em qualquer reaproveitamento.
- **Coleta dentro do Crea-SP.** O sistema foi escrito para operador anônimo (User-Agent de navegador, Tor opcional; `docs/seguranca.md`). Dentro do Crea-SP, o próprio portal Implanta e a contabilidade são fonte primária. O caminho natural é usar os endpoints e campos mapeados aqui como especificação, com acesso institucional.
