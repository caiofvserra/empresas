# Contratações, obras, controle externo e perícias — oportunidades para o CREA-SP

Pesquisa e verificações em **29/10/2026**. Escopo: planejamento de integração recorrente, sem alteração da aplicação e sem credenciais de terceiros. Os acessos aqui testados são amostras, não certificação da cobertura integral ou da estabilidade dos serviços. APIs e campos descritos abaixo foram separados de consultas HTML e de integrações que dependem de parceria.

## O que tem maior valor

1. **PNCP + Obrasgov + dados internos de registro/RT/ART** é o cruzamento mais promissor: além de CNPJ do fornecedor, o contrato pode trazer identificador CIPI, permitindo relacionar empreendimento, contratação, fornecedor, território e documento técnico. A presença de uma empresa em duas bases, sozinha, não vincula uma ART àquele contrato.
2. **TCE-SP/AUDESP** acrescenta histórico de ajustes/licitações e eventos contábeis municipais. É preciso separar as APIs públicas de transparência das APIs autenticadas de prestação de contas pelos jurisdicionados.
3. **Perícias de engenharia** merecem trilha própria de parceria com TJSP, JFSP/TRF3 e TRT2/TRT15. Há consultas públicas úteis, inclusive nomeações no AJ-JT, mas não foi confirmada uma API aberta nacional que entregue categoria, perito, processo, laudo e pagamento de todas as perícias.
4. **Uma oportunidade interna nova nos anexos** é começar pela ART que declara dados do processo judicial, e não tentar deduzir a necessidade de engenheiro pelo assunto processual. O novo formulário pode fornecer uma ponte documental; a existência e a completude desses campos em SQL Server/Db2 ainda precisam ser mapeadas.

## 1. PNCP — prioridade P0

**Documentação:** [Swagger de consulta](https://pncp.gov.br/api/consulta/swagger-ui/index.html), [OpenAPI consultado](https://pncp.gov.br/api/consulta/v3/api-docs), [manuais oficiais](https://www.gov.br/pncp/pt-br/pncp/manuais). As consultas públicas testadas funcionaram sem token. Isso não se aplica às APIs de inclusão/manutenção utilizadas pelos sistemas que alimentam o portal.

**Entidades/rotas confirmadas no contrato OpenAPI:**

| Entidade | Caminho em `https://pncp.gov.br/api/consulta` | Uso |
|---|---|---|
| Contratações publicadas | `/v1/contratacoes/publicacao` | Demanda, objetos, modalidade, município/UF da unidade compradora e valores estimados/homologados |
| Contratações atualizadas | `/v1/contratacoes/atualizacao` | Reprocessar retificações e mudanças após a publicação |
| Contratos/empenhos | `/v1/contratos` | Fornecedor, objeto, vigência, valor e relação com a contratação |
| Contratos atualizados | `/v1/contratos/atualizacao` | Ingestão incremental por atualização global |
| Atas e atualizações | `/v1/atas`, `/v1/atas/atualizacao` | Potencial de fornecimento; ata não é gasto ou contratação efetiva |
| PCA e atualizações | `/v1/pca/`, `/v1/pca/atualizacao` | Pipeline de demanda planejada; intenção não é execução |
| Cobrança | `/v1/instrumentoscobranca/inclusao` | Complemento documental a investigar; não supor cobertura completa de pagamentos |

As rotas de contratos usam `dataInicial`, `dataFinal`, `pagina` e `tamanhoPagina` (limite de página 500 no esquema atual). **Não possuem filtro UF no contrato consultado**: ingerir as páginas necessárias e filtrar `unidadeOrgao.ufSigla` ou selecionar órgãos. As rotas de contratações aceitam `uf`, código IBGE e modalidade; a modalidade é obrigatória na publicação/atualização, exigindo iteração pelas modalidades pertinentes, não só pregão. O limite nessa rota é 50 por página.

**GETs executados:** contratos e atualização de contratos no dia 01/09/2026: HTTP 200, 10 registros por amostra; contratações com modalidade 6 e `uf=SP` na mesma data: HTTP 200 com 10 registros. As respostas contêm `data`, total de registros, total de páginas e página atual. Nenhum dado de produção foi integrado ao protótipo.

**Campos de contrato realmente presentes na amostra:** `numeroControlePNCP`, `numeroControlePncpCompra`, `niFornecedor`, `tipoPessoa`, `nomeRazaoSocialFornecedor`, `niFornecedorSubContratado`, `objetoContrato`, `valorInicial`, `valorGlobal`, `valorAcumulado`, datas de assinatura/vigência/publicação/atualização global, `identificadorCipi`, `urlCipi`, órgão e unidade. A presença no esquema/amostra não garante preenchimento em todos os contratos; CIPI estava nulo na primeira amostra.

**Indicadores possíveis:** valor de contratos técnicos publicados; fornecedores de objetos técnicos com registro CREA na data pertinente; distribuição territorial da demanda; concentração por contratante/fornecedor/categoria; evolução da demanda planejada versus publicada; rastreabilidade documental contrato–ART; contratos vigentes por segmento e vínculos RT correspondentes quando tecnicamente aplicável.

**Regras essenciais:**

- Três territórios diferentes: sede do fornecedor, município da unidade contratante e local de execução. `uf=SP` seleciona a unidade da contratação, não prova execução física em SP. Obra federal em SP pode ter contratante sediado em Brasília; empresa paulista pode prestar fora do estado.
- Licitação, adjudicação/homologação, contrato, empenho, liquidação e pagamento são estágios diferentes. Não somar seus valores como se fossem faturamento empresarial.
- Não somar `valorInicial + valorGlobal + valorAcumulado`; escolher a medida e sua data, tratando aditivos e retificações.
- Não somar PNCP e Compras.gov/TCE sem deduplicação documental. Usar controle PNCP quando presente, órgão, número/ano do instrumento e identificadores de origem; correspondência aproximada vira sugestão, não fusão automática.
- Ausência de ART identificada no extrato é **lacuna de correspondência**, não conclusão de falta de ART ou infração. Órgão, objeto, local, datas, papel do profissional e abrangência do documento precisam ser validados.

## 2. Compras.gov.br / SICAF / CATSER — prioridade P0/P1

**Fontes:** [portal oficial de dados abertos](https://www.gov.br/compras/pt-br/cidadao/portal-de-dados-abertos), [Swagger](https://dadosabertos.compras.gov.br/swagger-ui/index.html), [OpenAPI consultado](https://dadosabertos.compras.gov.br/v3/api-docs).

Módulos confirmados: contratações e resultados por item sob Lei 14.133; contratos e itens; fornecedores; CATSER/CATMAT; órgãos/UASG; compras legadas, pesquisa de preços, ARP e PGC. Isso permite enriquecer a classificação dos objetos, antes de recorrer a um classificador textual.

Exemplos documentados:

- `/modulo-fornecedor/1_consultarFornecedor?ativo=true&codigoCnae=7112000&pagina=1&tamanhoPagina=10` — **GET 200 com dados**, consulta sem credencial. `ativo` é obrigatório nesse método. Cadastro não é o universo de empresas brasileiras; é universo de fornecedores da plataforma. Não equivaler `ativo` no método à situação Receita ou CREA.
- `/modulo-servico/6_consultarItemServico?pagina=1&tamanhoPagina=10` — **GET 200 com 10 itens** e hierarquia seção/divisão/grupo/classe/subclasse/serviço/CPC/data de atualização.
- `/modulo-contratacoes/1_consultarContratacoes_PNCP_14133` — **GET 200 com conjunto vazio** para a janela/filtro de teste. Isso confirma acesso/estrutura, não cobertura de SP. A fonte cobre SIASG/Compras.gov e não substitui todo o PNCP.
- `/modulo-contratacoes/2_consultarItensContratacoes_PNCP_14133` e `/modulo-contratacoes/3_consultarResultadoItensContratacoes_PNCP_14133` — documentação confirma filtros de objeto, fornecedores e valores homologados; não foram consumidas amostras de dados desses dois métodos.

A API pública de fornecedores não dá autorização ao acervo completo de habilitação e documentação privada do SICAF. [O sistema SICAF](https://www.gov.br/compras/pt-br/acesso-a-informacao/perguntas-frequentes/sicaf-sistema/) possui acesso autenticado e regras próprias. Capacidades adicionais devem ser negociadas com MGI/Serpro.

**Valor para CREA:** mapa de serviços de engenharia contratados; fornecedores recém-entrantes em compras públicas; dicionário CATSER → atividade técnica, com validação pelas câmaras; comparação de especialização da base CREA com a composição da demanda pública. Item de material não implica serviço de engenharia e CNAE não basta para classificar objeto.

## 3. TCE-SP e AUDESP — três canais distintos

### 3.1 API pública de despesas municipais — P1, tecnicamente viável

[Documentação](https://transparencia.tce.sp.gov.br/apis). Rotas GET JSON/XML:

`https://transparencia.tce.sp.gov.br/api/json/municipios`

`https://transparencia.tce.sp.gov.br/api/json/despesas/{municipio}/{ano}/{mes}`

`https://transparencia.tce.sp.gov.br/api/json/receitas/{municipio}/{ano}/{mes}`

O teste de municípios retornou **644 municípios**, sem a capital. **Bálsamo janeiro/2026 retornou HTTP 200 e 1.446 eventos**; o exemplo janeiro/2015 retornou 1.342. A documentação ainda menciona exercícios 2014–2019, mostrando defasagem da página: o conector precisa verificar competência efetivamente retornada e cobertura de cada município/mês.

Campos confirmados: órgão, mês, evento (`empenhado`, `liquidado`, `pago`, reforços/anulações), número de empenho, identificação e nome do fornecedor, emissão e valor. O identificador PF é parcial; não serve para ligação determinística de pessoa. CNPJ PJ pode apoiar a conciliação. A lista usa slug municipal, exigindo ponte auditada ao código IBGE.

**Limite decisivo:** o endpoint de despesas não traz, nesses oito campos, objeto detalhado de engenharia nem número de ART. Usar a ponte documental com ajustes/licitações; não classificar todos os pagamentos a um fornecedor de CNAE técnico como serviço de engenharia. Somar apenas eventos da medida desejada e tratar sinais/anulações; não adicionar empenhado+liquidado+pago.

### 3.2 Arquivos de licitações e ajustes — P1 com defasagem explícita

[Conjuntos de dados oficiais](https://transparencia.tce.sp.gov.br/conjunto-de-dados), [layout](https://transparencia.tce.sp.gov.br/sites/default/files/conjunto-dados/licitacoes-contratos/layout-ajustes-licitacoes.pdf).

Arquivos de ajustes/licitações desde 2018; a página consultada oferece ajustes de 2025, atualizados em 14/08/2026. **Frequência declarada: esporádica**, apesar de unidade de referência mensal. Portanto é bom histórico complementar e potencial fonte de rotina condicionada à publicação, não promessa de monitoramento diário completo. Despesas/receitas em arquivos têm frequência declarada semanal. Não baixar arquivos de gigabytes diretamente em cada atualização do relatório Power BI: ETL intermediário, controle de checksum/última modificação e particionamento.

O layout de ajustes prevê CNPJ contratado, número/ano de contrato, objeto, datas e valor; licitações incluem participantes, habilitação, propostas e itens. Informações são declaradas pelos órgãos e podem conter erros. **O fato de constarem no TCE não significa que o tribunal analisou, validou ou aprovou cada contratação.**

### 3.3 Swagger AUDESP de prestação — parceria, não coleta aberta

[Swagger](https://audesp.tce.sp.gov.br/api/) e especificação `https://audesp.tce.sp.gov.br/api/audesp.yaml` responderam HTTP 200. O próprio contrato descreve ambiente de **prestação**; login usa credencial do Portal de Sistemas e chamadas requerem token Bearer. Consultas indicadas incluem a situação dos documentos prestados. Não é uma API pública genérica de todos os contratos fiscalizados.

Há uma transição relevante: [comunicado oficial de 08/10/2026](https://www.tce.sp.gov.br/6524-tcesp-estabelece-regras-para-nova-fase-iv-sistema-audesp-com-transmissao-dados-formato-json) anuncia novos marcos de remessa em 03/11/2026 e permanência de obras/serviços de engenharia já informados no legado até encerramento. Planejar coexistência e solicitar ao TCE-SP extração pública autorizada/dicionários/identificadores, sem presumir que enviar dados dá acesso ao conjunto nacional.

### 3.4 Obras e resultados de controle — P2/parceria

[Painel de obras](https://www.tce.sp.gov.br/paineldeobras), [orientação de atualização](https://www.tce.sp.gov.br/informacoes-sobre-obras-paralisadas-e-ou-atrasadas), [manual de apenados](https://tce.sp.gov.br/publicacoes/manual-sistema-apenados). Podem contextualizar obras paralisadas/atrasadas, natureza de achados, fornecedores e instrumentos. **Não foi comprovado um contrato público estável de API para o painel/decisões/apenados nesta pesquisa.** Solicitar arquivo ou API oficial por cooperação. Não integrar extração de tela como conector já pronto; não importar números de notícias no BI.

A capital requer fonte municipal própria e PNCP/Prefeitura, pois não integra os 644 municípios da API TCESP. Atenção: a página [Dados abertos de licitações do TCM-SP](https://portal.tcm.sp.gov.br/Pagina/78382) descreve o acesso PNCP, mas não demonstra, sozinha, um banco de todas as licitações auditadas na cidade: não confundir contratações do próprio tribunal com universo fiscalizado.

## 4. Obrasgov e Transferegov — prioridade P0/P1

**Usar ambiente novo:** [Obrasgov](https://api-publica.obrasgov.gestao.gov.br/), [Transferegov](https://api-publica.transferegov.gestao.gov.br/), [comunicado de migração de julho/2026](https://www.gov.br/transferegov/pt-br/comunicados/comunicados-gerais/2026/comunicado-no-23-2026-do-portal-do-transferegov.br). Não iniciar conector novo nos endereços antigos programados para desligamento em agosto/2026.

### Obrasgov

Documentação `https://api-publica.obrasgov.gestao.gov.br/obras/docs`; esquema `/obras/openapi.json` — **GET 200**. Rotas confirmadas:

| Rota em `/obras` | Chaves e informações | Cruzamento |
|---|---|---|
| `/projeto-investimento` | ID projeto, natureza/espécie intervenção, situação, UF, organização, datas, investimentos | Empreendimento como entidade própria |
| `/contrato` | ID projeto/contrato, CNPJ fornecedor, objeto, vigência, processo, valores e link transparência | Projeto ↔ fornecedor ↔ cadastro/RT/ART |
| `/geometria` | ID projeto/geometria, código IBGE, município/UF | Local de execução, inclusive projetos multiterritoriais |
| `/execucao-fisica` | ID projeto, percentual, datas, instrumento | Estágio físico, não só valor contratado |
| `/empenho` | ID projeto, UG, fonte, credor, valores contábeis | Financiamento, separando empenhado/liquidado/pago |
| `/historico-situacao-cancelada-paralisada` | ID projeto, data e justificativa | Histórico de paralisação; não responsabilização automática |
| `/estudo-viabilidade` | ID projeto, tipo de estudo | Pipeline de atividades técnicas |
| `/data-atualizacao` | Competência da carga | Controle de frescor |

Teste `/projeto-investimento?uf_principal=SP&pagina=1&tamanho_da_pagina=1`: **HTTP 200**, um projeto e metadado `total_items=20.817` naquele instante. Esse número **não é indicador de 20.817 obras em execução**: o universo inclui várias naturezas e situações, pode ter revisões e não equivale a empresas/contratos. A consulta de geometria desse projeto retornou uma linha; contrato e execução física retornaram zero. Demonstra por que completude precisa ser medida. `/data-atualizacao` retornou 29/10/2026 às 00:00. Página aceita 1–200 linhas. Ingestão proposta diária/semanal é decisão do projeto; não SLA publicado.

### Transferegov

OpenAPIs atuais de **Discricionárias, Especiais, Parcerias e Fundo a Fundo** responderam HTTP 200, respectivamente 13, 24, 18 e 21 rotas. Evidência de contrato disponível não equivale a amostra populada de cada módulo. TED aparece no portal, ainda não testado.

Propostas, planos de trabalho, metas, programas, proponentes/beneficiários, emendas, empenhos e documentos financeiros podem apontar demanda futura de engenharia e territorializar investimentos. Chaves são propostas/planos/instrumentos e CNPJs dos entes, que frequentemente são **beneficiários públicos**, não fornecedores executores. Só ligar empresa contratada quando contrato/pagamento o identificar expressamente. Evitar dupla contagem do mesmo projeto em PNCP, Obrasgov e Transferegov. A cadeia de emenda–transferência–obra é recurso para planejamento regional, não atribuição causal a um político.

## 5. CGU/Portal da Transparência, sanções e TCU

### Portal da Transparência — P1/P2

[API e catálogo](https://api.portaldatransparencia.gov.br/), [cadastro atual da chave](https://portaldatransparencia.gov.br/api-de-dados/cadastrar-email), [CEIS](https://portaldatransparencia.gov.br/entenda-a-gestao-publica/ceis), [CNEP em arquivo](https://portaldatransparencia.gov.br/download-de-dados/cnep).

API oferece contratos federais, licitações, despesas, convênios, CEIS/CNEP, entre outros. Exige token obtido no fluxo gov.br; teste de CEIS sem token retornou **HTTP 401**, comportamento esperado. Não reutilizamos chave de terceiros. Arquivos em massa são alternativa para conjuntos disponíveis; validar dicionário/competência/licença por conjunto. Atualizações dependem do sistema de origem, não há uma periodicidade única para tudo.

**Uso:** contexto de sanção vigente, histórico de contratação/pagamento federal e fornecedores. Não transformar sanção administrativa externa em irregularidade perante CREA; regime, abrangência, início/fim, suspensão e órgão sancionador devem estar visíveis. Não inferir que pessoa homônima é sócio/RT: CPF mascarado e nome são insuficientes para ligação nominal segura.

### TCU — P2 para contexto/documentos

[Webservices oficiais](https://sites.tcu.gov.br/dados-abertos/webservices-tcu/) documentam acórdãos, normativos, consulta consolidada PJ e sanções. **GET real** de uma amostra de acórdão e dos tipos de certidão retornou HTTP 200. Rotas úteis:

- `https://dados-abertos.apps.tcu.gov.br/api/acordao/recupera-acordaos?inicio=0&quantidade=1`
- `https://certidoes-apf.apps.tcu.gov.br/api/rest/publico/tipos-certidoes`
- Consulta PJ documentada: `/api/rest/publico/certidoes/{cnpj}?seEmitirPDF=false` — não testada com empresa nesta pesquisa.

[Fiscobras](https://portal.tcu.gov.br/publicacoes-institucionais/relatorio-de-fiscalizacao/fiscobras) oferece relatórios, painel e ligações para obras com indícios. **API aberta estruturada e estável específica do universo Fiscobras não foi confirmada**. Não usar o endpoint de “obras concluídas e em andamento do TCU”: ele se refere a obras contratadas pelo próprio tribunal, não a todas as obras fiscalizadas. A análise automatizada de acórdãos é possível como classificação documental sujeita a revisão, sem atribuir automaticamente um achado a todo contrato de uma empresa.

## 6. Perícias judiciais: o que é público e o que precisa ser negociado

### 6.1 DataJud — metadados públicos, P1 para dimensão da demanda

[Apresentação oficial](https://www.cnj.jus.br/api-publica/), [wiki](https://datajud-wiki.cnj.jus.br/api-publica/), [glossário](https://datajud-wiki.cnj.jus.br/api-publica/glossario/), [acesso](https://datajud-wiki.cnj.jus.br/api-publica/acesso/).

Há API pública por alias de tribunal (`api_publica_tjsp`, `api_publica_trf3`, `api_publica_trt2`, `api_publica_trt15`) e consultas Elasticsearch em `/_search`. Usa chave pública vigente divulgada pelo CNJ. A wiki retornou HTTP 403 neste ambiente; chamada sem chave ao alias TJSP retornou 401. Não foi executada consulta autenticada nem presumido acesso a peças processuais.

O glossário e a apresentação descrevem número CNJ, classe, assuntos, tribunal/grau, órgão julgador e movimentos com datas. São dados para **medir assuntos/processos/movimentos**, não uma tabela de perícias concluídas com profissional, modalidade, laudo e honorário pago.

**Análise válida:** processos por assuntos potencialmente relacionados a engenharia e ocorrências de movimentos periciais identificados nas TPU, após validar a semântica e cobertura de remessa. Uma contagem de assuntos como desapropriação, vício construtivo, insalubridade ou dano ambiental **não demonstra que um engenheiro foi necessário ou nomeado**. Especialidade não é derivada automaticamente da classe; um mesmo processo pode exigir mais de um profissional. A data da última remessa e distribuição de preenchimento devem acompanhar o indicador. TRF3 inclui SP **e MS**; filtrar órgãos/localidades paulistas com ponte oficial, não tratar toda a região como SP.

### 6.2 TJSP Auxiliares da Justiça — cadastro público condicionado à nomeação

[Descrição oficial](https://www.tjsp.jus.br/AuxiliaresDaJustica), [consulta pública correta](https://www.tjsp.jus.br/auxiliaresjustica/auxiliarjustica/consultapublica).

A própria página informa que os cadastrados estão inicialmente disponíveis às unidades judiciais e que a consulta pública só mostra nomes **já nomeados e indicados no sistema**. Portanto ausência na consulta não prova ausência de cadastro. A consulta oferece nome, função e especialidade; não foi encontrada documentação de API aberta ou arquivo recorrente abrangente. Cadastro no portal não é certificação de habilitação técnica pelo TJSP.

**Proposta de cooperação:** extrato periódico de nomeações/laudos por categoria e município/comarca, com identificador estável de nomeação e processo, profissão/modalidade, registro profissional quando disponível, pessoa/órgão técnico, datas e situação. Recebimento em API ou arquivo assinado; campos pessoais apenas na camada autorizada e agregados no BI executivo.

### 6.3 TRT2/TRT15, AJ-JT/SIGEO — oportunidade concreta de nomeações

[TRT15 peritos](https://trt15.jus.br/pje/peritos), [TRT15 honorários](https://trt15.jus.br/servicos/honorarios-periciais), [TRT2 peritos](https://ww2.trt2.jus.br/servicos/acesso-online/peritos/page).

O [cadastro público AJ-JT](https://aj.sigeo.jt.jus.br/aj2/internetaberto/profissionais.jsf) tem colunas nome/categoria/profissão/especialidade. A [consulta pública de nomeações](https://aj.sigeo.jt.jus.br/aj2/internetaberto/consultapublicanomeacoes.jsf) tem filtros tribunal, período, UF, município, unidade e situação; a grade indica processo, tribunal, unidade, profissional, data, valor e situação, além de exportação Excel/PDF/CSV/XML. **O HTML respondeu 200, mas a captura mostrou erro ao processar a página e nenhum resultado; não foi comprovada exportação preenchida nem API pública.** Não confundir HTTP 200 com sucesso semântico.

É um candidato forte a pedir **exportação recorrente/API oficial via CSJT/TRTs**, em vez de construir dependência de formulário JSF com estado de sessão. A remuneração custeada pelo orçamento da União não representa todas as perícias trabalhistas; nomeação, serviço prestado e pagamento são fatos separados. Classificação por “insalubridade e periculosidade” requer confirmar profissão/qualificação, não presumir engenheiro a partir da especialidade. Pagamentos individuais não são indicador de salário mensal da categoria.

### 6.4 TRF3/JFSP e AJG/CJF — cooperação

[TRF3 AJG](https://www.trf3.jus.br/seju/assistencia-judiciaria-gratuita-ajg/), [CJF AJG](https://www.cjf.jus.br/cjf/acesso-a-sistemas/ajg), [CPTEC/TRF3](https://web.trf3.jus.br/ecptec/).

A documentação descreve cadastro de profissionais/órgãos, nomeações e pagamentos no sistema nacional AJG. A página CPTEC retornou erro 503 pela ferramenta de consulta, não prova inexistência. Não se confirmou uma API aberta de nomeações categorizadas/ART do TRF3. Acordo com JFSP/CJF para extrato periódico é prioridade de descoberta. Recortar SP e distinguir a cobertura AJG da totalidade de perícias pagas pelas partes.

### 6.5 Codex, Sisperjud e Sniper — não são atalhos de dados abertos

- [Codex](https://www.cnj.jus.br/sistemas/plataforma-codex/codex-base-de-dados-processuais/) inclui conteúdos estruturados e não estruturados. A [norma de acesso a dados judiciais públicos](https://atos.cnj.jus.br/atos/detalhar/5792) prevê procedimento institucional e requisitos técnicos, não acesso aberto irrestrito. Avaliar viabilidade jurídica/técnica com CNJ; não incluir como conector liberado.
- [Sisperjud — acesso](https://www.cnj.jus.br/tecnologia-da-informacao-e-comunicacao/justica-4-0/sisperjud/como-acessar/) menciona integração aos sistemas dos tribunais, o que não equivale a API pública de extração. [Descrição TRT2](https://ww2.trt2.jus.br/noticias/noticias/noticia/novo-sistema-de-pericias-judiciais-entra-em-vigor) destaca perícias médicas; não usar como fonte genérica de perícias de engenharia.
- [Sniper — perguntas frequentes](https://www.cnj.jus.br/tecnologia-da-informacao-e-comunicacao/justica-4-0/sniper/perguntas-frequentes/) informa acesso exclusivo a magistrados/servidores do Judiciário. Excluir do plano de APIs públicas do CREA, não sugerir obter credenciais emprestadas ou contornar restrições.

### 6.6 Ponte ART–processo prevista nos anexos enviados

A Resolução Confea 1.160/2025 e seus anexos atualizam o modelo de ART e contemplam destinatário institucional/nomeação judicial. [Norma oficial](https://normativos.confea.org.br/Ementas/Visualizar?id=83001). No PDF fornecido, p.1 identifica “Dados do Processo”; modelo A.1 p.4–5 prevê destinatário CPF/CNPJ, número do processo/documento e honorário/valor; modelo B.1 p.9–11 prevê relação de processos. Isso é **possibilidade de campo normativo**, não confirmação de coluna, versão implantada ou preenchimento histórico no banco interno. Cabeçalhos legados/inconsistentes dos modelos exigem conferir versão de implantação.

Ponte proposta: **ART interna → número CNJ/referência + órgão destinatário → nomeação judicial → especialidade/profissional/órgão técnico**, preservando a granularidade da ART múltipla e as relações muitos-para-muitos. Honorário declarado na ART não é comprovante de pagamento pelo tribunal. Nomeação identificada e ART relacionada não demonstram sozinhas que todas as atribuições e exigências foram atendidas.

## 7. Indicadores candidatos e fórmulas iniciais

| Indicador | Cálculo/grão | Exemplo de utilidade e condição |
|---|---|---|
| **Contratações técnicas em SP** | Contratos distintos classificados/validados como escopo técnico; somar medida de valor selecionada na data de corte | Mapear demanda por modalidade e região; separar local da obra de sede do contratante |
| **Fornecedores técnicos com registro CREA-SP** | CNPJs fornecedores com registro compatível/vigente na referência ÷ CNPJs fornecedores técnicos elegíveis | Cobertura no mercado público; não condenar automaticamente os sem correspondência |
| **Rastreabilidade contrato–ART** | Contratos elegíveis com ponte documental validada para ART ÷ contratos elegíveis | Localizar lacunas de conciliação; CNPJ comum não é ponte suficiente |
| **Demanda futura de serviços técnicos** | Itens PCA/PGC classificados por ano esperado, agrupados sem duplicar contratações já materializadas | Orientar articulação de mercado e especialidades; orçamento planejado não é receita garantida |
| **Empreendimentos com presença técnica identificada** | Projetos CIPI em SP com fornecedor/ART explicitamente vinculados ÷ projetos elegíveis com dados suficientes | Explicitar cobertura do dado e demanda em saneamento, mobilidade e energia |
| **Obras paralisadas com vínculos técnicos vigentes** | Projetos paralisados datados, ligados a empresa/documentos internos na mesma referência | Contexto para fiscalização digital e orientação, sem atribuir causa ao profissional |
| **Nomeações periciais em engenharia** | Nomeações distintas por especialidade e profissão validadas; não processos/assuntos genéricos | Entender mercado de perícias por comarca; depende de extrato judicial autorizado/confiável |
| **Perícias com ART identificada** | Nomeações elegíveis com ponte por processo/órgão e escopo para ART ÷ nomeações elegíveis | Fiscalização digital orientada a evidência; reconhecer exceções e falhas de preenchimento |
| **Cobertura territorial de especialistas** | Profissionais/órgãos técnicos aptos por especialidade e território, com referência temporal | Parcerias para suprir áreas com poucas opções; cadastro não é garantia de disponibilidade |
| **Concentração de nomeações por especialidade** | Participações/HHI por profissional em universo definido e número mínimo de casos | Diagnóstico de estrutura do mercado; concentração não comprova favorecimento |
| **Prazo da atividade pericial** | Mediana nomeação→entrega para serviços concluídos; separar censura e cancelamento | Planejar oferta e gargalos; só se datas vierem do parceiro, não estimadas por movimento genérico |
| **Contexto de sanções de fornecedores** | Empresas/contratos com sanções externas aplicáveis e vigentes, por cadastro e data | Apoio a análise com inteiro teor, contraditório e alcance explícitos; não é regularidade CREA |

## 8. Modelo de relacionamento e implantação propostos

Dimensões compartilhadas: CNPJ completo e raiz como campos diferentes; município IBGE; órgão/unidade; tempo com papéis (publicação, assinatura, vigência, execução, pagamento); atividade técnica/modalidade; CATSER/CATMAT; especialidade judicial/profissão; profissional e empresa internas.

Fatos separados: contratação, resultado por item, contrato/alteração, projeto, evento de execução, evento contábil, nomeação, entrega de laudo, pagamento pericial, ART/vínculo técnico. Pontes versionadas: contrato–projeto, contrato–ART, ART–processo/nomeação, estabelecimento–registro e profissional–habilitação. Cada ponte tem origem, método, data de validação e grau de confiança; sugestões textuais ficam fora dos numeradores confirmados.

Para Power BI: aterrissagem em dados brutos + curadoria SQL; APIs públicas coletadas por serviço de integração agendado; SQL Server/Db2 interno via gateway; modelo estrela com pontes controladas, medidas por grão e RLS/OLS. Não transformar o relatório em cliente síncrono de dezenas de APIs. Atualização de fonte externa e atualização do relatório são relógios distintos.

**Sequência recomendada:** (1) prova de dados PNCP/Obrasgov + chaves internas, medindo completude; (2) CATSER e TCE despesas/ajustes como enriquecimento com dedupe; (3) acordo de dados de perícias e mapeamento ART judicial; (4) contexto CGU/TCU e expansão multissetorial. Homologar legalmente os universos e as regras; não construir pontuação de infração a partir de ausência cadastral.

## Evidências e limitações da pesquisa

Contratos OpenAPI e amostras estão em `justica-compras-evidencias/`, com `http-probes.json` e `http-probes2.json`. JSON/CSV resumidos de fontes em `justica-compras-catalogo.json` e `.csv`. A pesquisa não iniciou cadastro gov.br, não usou tokens particulares, não coletou laudos médicos/sigilosos nem executou extração integral de dados pessoais. Resultados HTTP não constituem SLA. Revalidar esquema, licença, termos e limites antes da implementação.


## Arquivos de trabalho e evidência pública da pesquisa

Referências a pastas locais de evidência descrevem o ambiente de investigação. Os corpos de resposta e as amostras nominais não integram esta entrega pública. Consulte o [resumo HTTP sanitizado](../evidencias/evidencias-http-resumo.csv), o [catálogo consolidado](../CATALOGO_FONTES.md) e suas origens em `../inventarios/origens/`. Um teste amostral não certifica funcionamento futuro, cobertura integral ou licença de todos os recursos.
