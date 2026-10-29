# Catálogo mestre de possibilidades de dados — CREA-SP

Pesquisa em 29/10/2026. **104 entradas canônicas**, resultantes de105 fichas pesquisadas nos cinco estudos: fontes, subconjuntos, catálogos, parcerias e reuso. **Não são104 APIs independentes nem104 integrações homologadas.** `SP-JUCESP` descrevia a mesma camada em duas fichas; foi unificado, preservando ambas integralmente em`origens` e nos arquivos de auditoria com105 linhas.

JUCESP: prioridade canônica P2 para implantação enquanto oCSV não estiver homologado; a prioridade P1 da descoberta representa relevância estratégica. Nenhuma prioridade, evidência, nome ou URL original foi descartada. `familia_id` identifica provedor/ecossistema quando possível; não transforma famílias ou produtos em contagem de APIs independentes.

Classificações de evidência: **documentação** inclui metadados/catálogos; **contrato** é especificação ou esquema sem amostra de fatos; **amostra de dados** confirma apenas o recorte testado; **parceria** depende de habilitação/finalidade; **lead** ainda requer qualificação. O campo literal de evidência mantém as ressalvas originais.

Campos ausentes permanecem “não informado”. Listas e objetos não foram achatados no JSON. Acesso e periodicidade devem ser homologados antes de produção. RAIS/CAGED abertos não criam vínculo nominal com empresasCREA.

[Planilha Excel](inventarios/catalogo-fontes.xlsx) · [JSON](inventarios/catalogo-fontes.json) · [CSV](inventarios/catalogo-fontes.csv) · [Auditoria105 fichas](inventarios/origens-auditoria.json) · [ResumoHTTP](evidencias/evidencias-http-resumo.json)

**Tipo registro:** catalogo: 4; fonte: 56; parceria: 11; reuso: 1; subconjunto: 32.

**Classe acesso:** API autenticada: 4; API/serviço aberto documentado: 31; arquivos/serviços abertos documentados: 37; catálogo API + arquivos: 3; catálogo/descoberta: 4; consulta/arquivo a homologar: 12; fonte interna a mapear: 1; parceria ou habilitação: 11; reuso de código/dados: 1.

**Classificacao evidencia:** amostra de dados: 23; contrato: 8; documentação: 51; lead: 10; parceria: 11; reuso: 1.

## Agenda regulatória (3)

### LEG-CAMARA — Proposições e tramitação federal

**Tipo:** fonte · **Prioridade:** P2 · **Evidência predominante:** amostra de dados · **Família:** LEG-CAMARA.

- **Órgão:** Câmara dos Deputados
- **Documentação:** https://dadosabertos.camara.leg.br/swagger/api.html
- **Endpoint ou recurso informado:** https://dadosabertos.camara.leg.br/api/v2/proposicoes?ano=2026&keywords=engenharia&itens=3
- **Acesso:** API pública e arquivos diários
- **Periodicidade:** Consulta proposta diária com sobreposição e paginação
- **Grão:** Proposição; tramitação; tema; evento; documento
- **Chaves:** ID/URI proposição; apensação; data; assunto
- **Uso possível no CREA-SP:** Radar de mudanças em atribuições, registro, ART, contratação, infraestrutura, formação e exercício profissional com efeito potencial em SP.
- **Limites:** GET200 e OpenAPI200. Buscar também temas e tramitação de proposições antigas; filtro anoapresentação sozinho perde alterações recentes. Palavra engenharia não cobre todo o assunto nem prova relevância. AutorSP não é escopo de validade de lei federal.
- **Evidência literal:** Amostra JSON200; contrato atual200
- **Verificado em:** 2026-10-29
- **Origem:** empresas-economia-legislativo.json
- **Chave da ficha:** LEG-CAMARA

### LEG-SENADO — Processos legislativos e agenda do Senado

**Tipo:** fonte · **Prioridade:** P2 · **Evidência predominante:** amostra de dados · **Família:** LEG-SENADO.

- **Órgão:** Senado Federal / Congresso Nacional
- **Documentação:** https://legis.senado.leg.br/dadosabertos/api-docs/swagger-ui/index.html
- **Endpoint ou recurso informado:** https://legis.senado.leg.br/dadosabertos/v3/api-docs
- **Acesso:** API pública sem autenticação
- **Periodicidade:** Eventos; coleta proposta diária com sobreposição
- **Grão:** Processo/matéria; tramitação; prazo; relatoria; documento
- **Chaves:** ID processo; número/ano/tipo; relações com Câmara; data
- **Uso possível no CREA-SP:** Monitorar pauta, emendas e tramitação de assuntos técnicos e empresariais; ligar o mesmo processo entre Casas.
- **Limites:** OpenAPI200 v4.1.3.108 e recurso de tipos200. Preferir /processo atual e observar deprecated/Deprecation/Sunset. Mais10req/s podem429; coleta com jitter/backoff. Proposta não é norma aprovada; classificação temática é auxílio, validada pela área institucional.
- **Evidência literal:** Contrato200 e recursoJSON200; pesquisa temática ainda não homologada
- **Verificado em:** 2026-10-29
- **Origem:** empresas-economia-legislativo.json
- **Chave da ficha:** LEG-SENADO

### LEG-ALESP — Proposituras e tramitação paulista

**Tipo:** fonte · **Prioridade:** P2 · **Evidência predominante:** amostra de dados · **Família:** LEG-ALESP.

- **Órgão:** ALESP
- **Documentação:** https://ckan.al.sp.gov.br/group/processo-legislativo/dataset/tramitacao
- **Endpoint ou recurso informado:** https://www3.al.sp.gov.br/repositorio/dados-abertos/output/xml/tramitacao-atual.xml
- **Acesso:** Arquivos XML públicos; catálogo CKAN
- **Periodicidade:** Rotina proposta diária com hash e snapshot
- **Grão:** Tramitação×processo×data
- **Chaves:** idProcesso; idTramitacao; data; chave propositura
- **Uso possível no CREA-SP:** Radar específico de SP: licenciamento, infraestrutura, segurança, habitação, obras e concessões com impacto empresarial.
- **Limites:** XML20020,9MB, nomes idTramitacao/idProcesso/descricao/data/nrOrdem. Aviso oficial informa mudança de elementos16/10/2026; parser precisa versionamento. Catálogo CKAN503 nesta sessão. Não presumir que XML é API paginada nem que todo documento está no arquivo.
- **Evidência literal:** ArquivoXML200 e estrutura inspecionada
- **Verificado em:** 2026-10-29
- **Origem:** empresas-economia-legislativo.json
- **Chave da ficha:** LEG-ALESP

## Agronomia e agroindústria (1)

### SET20 — MAPA SIPEAGRO

**Tipo:** fonte · **Prioridade:** P1/P2 · **Evidência predominante:** documentação · **Família:** MAPA.

- **Órgão:** MAPA
- **Documentação:** https://dados.agricultura.gov.br/dataset/sipeagro
- **Endpoint ou recurso informado:** https://dados.agricultura.gov.br/api/3/action/package_show?id=sipeagro
- **Acesso:** Arquivos abertos CSV
- **Periodicidade:** Semanal; página25/10/2026
- **Grão:** estabelecimento/produto/registro conforme recurso
- **Chaves:** Registro do estabelecimento/atividade/local; CNPJ e RT dependem do recurso
- **Uso possível no CREA-SP:** Agroindústrias fertilizantes/alimentos/aviação agrícola versus CREA
- **Limites:** Produtos não são fábricas; CNPJ e RT dependem do recurso; outrascompetências
- **Evidência literal:** Página oficial lida; API local 503
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET20
- **Atributos complementares preservados:** {"coleta_proposta": "Semanal", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}

## Ambiente e indústria (3)

### SET13 — IBAMA CTF/APP e RAPP

**Tipo:** fonte · **Prioridade:** P2 · **Evidência predominante:** documentação · **Família:** IBAMA.

- **Órgão:** IBAMA
- **Documentação:** https://www.gov.br/ibama/pt-br/servicos/cadastros/ctf/ctf-app/ctf-app
- **Endpoint ou recurso informado:** https://dadosabertos.ibama.gov.br/
- **Acesso:** Arquivos abertos documentados; GET 403
- **Periodicidade:** Conforme recurso; RAPP anual
- **Grão:** pessoa jurídica/atividade/formulário RAPP/ano
- **Chaves:** Identificação PJ/atividade/município/ano conforme recurso
- **Uso possível no CREA-SP:** Atividades industriais efetivamente declaradas versus CREA/ART
- **Limites:** CTF não é licença; formulários têm universos próprios e repetem empresa
- **Evidência literal:** Documentação oficial; API local 403
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET13
- **Atributos complementares preservados:** {"coleta_proposta": "Mensal catálogo; anual declarações", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}

### SET14 — CETESB licenciamento ambiental

**Tipo:** parceria · **Prioridade:** Parceria prioritária · **Evidência predominante:** parceria · **Família:** CETESB.

- **Órgão:** CETESB
- **Documentação:** https://licenciamento.cetesb.sp.gov.br/
- **Endpoint ou recurso informado:** https://sistemasinter01.cetesb.sp.gov.br/licenciamento/princ.php
- **Acesso:** Parceria; consulta pública não equivale a bulk
- **Periodicidade:** A negociar
- **Grão:** processo/licença/estabelecimento/vigência
- **Chaves:** CNPJ/estabelecimento/processo/licença/atividade/vigência
- **Uso possível no CREA-SP:** Novas licenças/ampliações industriais em SP versus CREA/RT/ART
- **Limites:** Titular não identifica consultoriaRT; catálogo SP semresultado não prova ausência
- **Evidência literal:** Consulta oficialCNPJ; API/bulk não confirmada
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET14
- **Atributos complementares preservados:** {"coleta_proposta": "Semanal proposta", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}

### SP-LIC-IND — Licenças ambientais industriais da capital

**Tipo:** subconjunto · **Prioridade:** P1 · **Evidência predominante:** amostra de dados · **Família:** SVMA-CAPITAL.

- **Órgão:** SVMA / Prefeitura deSãoPaulo
- **Documentação:** https://dados.prefeitura.sp.gov.br/dataset/licenca-ambiental-industrial
- **Endpoint ou recurso informado:** https://dados.prefeitura.sp.gov.br/dataset/16ba3296-b1c4-47e0-8a4f-880f84e99694/resource/dd5c35da-7e35-4c43-a88f-598d4887d8d3/download/licenca_ambiental_industrial_cgm_escazu_v2.csv
- **Acesso:** CSV/XLSX/GPKG públicos; dicionário separado
- **Periodicidade:** Anual declarada; notas atualizadas 22/06/2026
- **Grão:** Licença/empreendimento industrial egeometria
- **Chaves:** ["número licença", "órgão licenciador", "atividade", "sigla/tipo", "data emissão", "validade", "link documento"]
- **Uso possível no CREA-SP:** Indústria licenciada × cadastro PJ/ART de serviçosambientais e demanda territorial
- **Limites:** CentróideSQLnão élocalização precisa daobra; tipos licença distintos; renovação podeprorrogarvigência. Dados municipais não cobremCETESB do estado. CSV atual inspecionado tem 9 colunas e não contém CNPJ nem identificadorRT: não ligar nominalmente à empresa sem fonte complementar.
- **Evidência literal:** package_show 200 JSON14 recursos; CSV de fatos recente separado dosdicionários; notasmetadados lidas; CSV de fatos GET200679638 bytes header 9 colunas confirmado
- **Verificado em:** 2026-10-29
- **Origem:** fontes-catalogos-normalizadas.json
- **Chave da ficha:** SP-LIC-IND
- **Atributos complementares preservados:** {"ultima_competencia": "2026-06-22"}

## Ambiente e infraestrutura (1)

### SP-LIC-NAOIND — Licenças ambientais nãoindustriais da capital

**Tipo:** subconjunto · **Prioridade:** P1 · **Evidência predominante:** amostra de dados · **Família:** SVMA-CAPITAL.

- **Órgão:** SVMA / Prefeitura deSãoPaulo
- **Documentação:** https://dados.prefeitura.sp.gov.br/dataset/licencas-ambientais-nao-industriais
- **Endpoint ou recurso informado:** https://dados.prefeitura.sp.gov.br/dataset/31721078-d9c2-4b6e-ab49-c6b7d8a8a079/resource/195dfeaa-2934-4b6c-bf42-beddb1d80430/download/licenca_ambiental_nao_industrial_cgm_escazu_v2.csv
- **Acesso:** CSV/XLSX/GPKG públicos; dicionário separado
- **Periodicidade:** Anual declarada; notas atualizadas 22/06/2026
- **Grão:** Licença/áreadiretamenteafetadadoempreendimento
- **Chaves:** ["número licença", "órgão", "atividade/tipo", "data emissão", "validade", "código primeira licença", "código licença anterior", "links"]
- **Uso possível no CREA-SP:** Demanda de estudos/serviçosambientais e empreendimentos × ART explicitamente identificadas
- **Limites:** A fonte avisaque algunsempreendimentos podem não ter sidoexecutados. Abrangência defere licençasnãoindustriais, não todaobra. CSV atual inspecionado tem 11 colunas, sem CNPJ nemRT; suas chaves ligam licenças entre si, não profissionais.
- **Evidência literal:** package_show 200 JSON14 recursos; notas/datas/recursosatuais verificadas; CSV de fatos GET200103335 bytes header 11 colunas confirmado
- **Verificado em:** 2026-10-29
- **Origem:** fontes-catalogos-normalizadas.json
- **Chave da ficha:** SP-LIC-NAOIND
- **Atributos complementares preservados:** {"ultima_competencia": "2026-06-22"}

## Combustíveis (2)

### SET04 — ANP revendedores de combustíveis e GLP

**Tipo:** fonte · **Prioridade:** P1 · **Evidência predominante:** amostra de dados · **Família:** ANP.

- **Órgão:** ANP
- **Documentação:** https://www.gov.br/anp/pt-br/centrais-de-conteudo/paineis-dinamicos-da-anp/paineis-dinamicos-do-abastecimento/api-revendedores-manual-usuario.pdf
- **Endpoint ou recurso informado:** https://revendedoresapi.anp.gov.br/v1/glp?uf=SP&municipio=SAO%20PAULO&numeropagina=1
- **Acesso:** API aberta
- **Periodicidade:** SLA não publicado no material lido
- **Grão:** revenda/autorização; produto por posto conforme rota
- **Chaves:** CNPJ/autorização/endereço/coordenadas/tancagem conforme modalidade
- **Uso possível no CREA-SP:** Novas instalações e armazenamento versus CREA/RT/ART
- **Limites:** Paginar numeropagina; posto identifica operador; interdiçãoANP não é irregularidadeCREA
- **Evidência literal:** GET dados 200 JSON e OpenAPI200
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET04
- **Atributos complementares preservados:** {"coleta_proposta": "Semanal com snapshot", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}

### SET05 — ANP tancagem/instalações e agentes

**Tipo:** subconjunto · **Prioridade:** P1/P2 · **Evidência predominante:** documentação · **Família:** ANP.

- **Órgão:** ANP
- **Documentação:** https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/tancagem-do-abastecimento-nacional-de-combustiveis
- **Endpoint ou recurso informado:** https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/arquivos-tancagem-do-abastecimento-nacional-de-combustiveis
- **Acesso:** Arquivos abertos CSV
- **Periodicidade:** Mensal
- **Grão:** instalação/capacidade/produto/operador
- **Chaves:** CNPJ do operador + instalação/local/capacidade; não contratado da obra
- **Uso possível no CREA-SP:** Mercado de engenharia industrial e mudanças nas instalações de SP
- **Limites:** Operador não é executora; múltiplos tanques/produtos por instalação
- **Evidência literal:** Documentação/dicionário oficial
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET05
- **Atributos complementares preservados:** {"coleta_proposta": "Mensal", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}

## Contratações e infraestrutura (3)

### SP-DER-CONTRATOS — Contratos DER-SP

**Tipo:** subconjunto · **Prioridade:** P1 · **Evidência predominante:** documentação · **Família:** DER-SP.

- **Órgão:** DER-SP
- **Documentação:** https://dadosabertos.sp.gov.br/dataset/contratos-der-sp
- **Endpoint ou recurso informado:** https://dersp.der.sp.gov.br/WebSite/Arquivos/DadosAbertos/Administracao/Contratos/Contratos.xlsx
- **Acesso:** ArquivoXLSX oficial descoberto noCKAN; download de conteúdo não executado aqui
- **Periodicidade:** Periodicidade não confirmada; monitorar arquivo e competência
- **Grão:** Contrato de órgão estadual
- **Chaves:** ["número contrato", "contratado/CNPJa confirmar", "datas eobjetoa confirmar"]
- **Uso possível no CREA-SP:** Identificar carteira rodoviária paulista e fornecedores; conciliarPNCPevitar duplicata; cruzarARTporchavedocumental
- **Limites:** PainelPowerBI não é canal de extração selecionado; oXLSXé o recurso. Valor contratado não é pago; contratado não é subcontratado.
- **Evidência literal:** MetadadoCKAN GET200; recursoXLSX explícito; metadado modificado em 03/09/2026
- **Verificado em:** 2026-10-29
- **Origem:** fontes-catalogos-normalizadas.json
- **Chave da ficha:** SP-DER-CONTRATOS
- **Atributos complementares preservados:** {"ultima_competencia": null}

### SP-DER-OBRAS — Obras DER-SP

**Tipo:** subconjunto · **Prioridade:** P1 · **Evidência predominante:** documentação · **Família:** DER-SP.

- **Órgão:** DER-SP
- **Documentação:** https://dadosabertos.sp.gov.br/dataset/obras-der-sp
- **Endpoint ou recurso informado:** https://dersp.der.sp.gov.br/WebSite/Arquivos/DadosAbertos/Obras/ObrasEstaduais/Obras.xlsx
- **Acesso:** ArquivoXLSX oficial descoberto noCKAN; conteúdo não executado aqui
- **Periodicidade:** Periodicidade a confirmar; monitorar competência do arquivo
- **Grão:** Obra/trecho; validar schema
- **Chaves:** ["identificador obra", "contrato", "município/trecho", "empresa quando publicado"]
- **Uso possível no CREA-SP:** Carteira de obras rodoviárias × responsáveis/ARTefetivamentevinculados × expansãoeconômica
- **Limites:** Não somar contratos eobras; empresa/ARTsomente comchaveou evidênciaexplícita.
- **Evidência literal:** MetadadoCKAN GET200; recursoXLSX explícito; metadado modificado em 13/08/2026
- **Verificado em:** 2026-10-29
- **Origem:** fontes-catalogos-normalizadas.json
- **Chave da ficha:** SP-DER-OBRAS
- **Atributos complementares preservados:** {"ultima_competencia": null}

### SP-SIURB — Controle de obras SIURB

**Tipo:** subconjunto · **Prioridade:** P1 · **Evidência predominante:** documentação · **Família:** SIURB-CAPITAL.

- **Órgão:** SIURB / Prefeitura deSãoPaulo
- **Documentação:** https://dados.prefeitura.sp.gov.br/dataset/controle-de-obras-siurb
- **Endpoint ou recurso informado:** https://dados.prefeitura.sp.gov.br/dataset/49a40a52-68c0-45c1-92d8-ccc35a525467/resource/5596c5a0-4c33-4859-b522-a228b4ccbdc8/download/completo-obras-controle-de-obras.xlsx
- **Acesso:** XLSX/ODS públicos com dicionário; arquivos não executados neste subestudo
- **Periodicidade:** Periodicidade a confirmar no recurso; metadado modificado em 21/07/2026
- **Grão:** Obra/contrato municipal; schema a validar
- **Chaves:** ["obra/contrato", "localização", "contratado quando divulgado"]
- **Uso possível no CREA-SP:** Relacionar obrasmunicipais com PNCP/TCE e ART sem dupla contagem
- **Limites:** Recorteórgão/capital; identificarunidadefinanceira e datesantesdesomar.
- **Evidência literal:** CKANbusca 200 JSON com recursosXLSX/ODS/dicionário explícitos
- **Verificado em:** 2026-10-29
- **Origem:** fontes-catalogos-normalizadas.json
- **Chave da ficha:** SP-SIURB
- **Atributos complementares preservados:** {"ultima_competencia": null}

## Contratações públicas (5)

### JC01 — PNCP — contratações/publicação/atualizações/PCA

**Tipo:** fonte · **Prioridade:** P0 · **Evidência predominante:** amostra de dados · **Família:** PNCP.

- **Órgão:** MGI/Comitê PNCP
- **Documentação:** https://pncp.gov.br/api/consulta/swagger-ui/index.html
- **Endpoint ou recurso informado:** https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao
- **Acesso:** API pública
- **Periodicidade:** eventos publicados/atualizados; coleta diária proposta
- **Grão:** contratação ou item PCA
- **Chaves:** controle PNCP; CNPJ órgão; unidade; IBGE; modalidade; datas
- **Uso possível no CREA-SP:** mapa de demanda/pipeline e classificação por objeto
- **Limites:** UF da unidade compradora não é UF da execução; estimado/homologado/contratado são estágios diferentes
- **Evidência literal:** OpenAPI GET200; contratações SP GET200 com 10 registros
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC01
- **Atributos complementares preservados:** {"acesso": "sem token nas consultas testadas"}

### JC02 — PNCP — contratos/empenhos e atualização global

**Tipo:** subconjunto · **Prioridade:** P0 · **Evidência predominante:** amostra de dados · **Família:** PNCP.

- **Órgão:** MGI/Comitê PNCP
- **Documentação:** https://pncp.gov.br/api/consulta/v3/api-docs
- **Endpoint ou recurso informado:** https://pncp.gov.br/api/consulta/v1/contratos/atualizacao
- **Acesso:** API pública
- **Periodicidade:** publicação/atualização; captura incremental diária proposta
- **Grão:** contrato/empenho publicado e versões
- **Chaves:** controle PNCP contrato/compra; CNPJ fornecedor/subcontratado; CIPI; vigência
- **Uso possível no CREA-SP:** fornecedor↔CREA; projeto↔contrato↔ART quando vínculo comprovado
- **Limites:** CIPI pode faltar; não somar valores inicial/global/acumulado; esta rota não possui filtroUF
- **Evidência literal:** rotas contratos e atualização GET200 com 10 registros cada
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC02
- **Atributos complementares preservados:** {"acesso": "sem token nas consultas testadas"}

### JC03 — Compras.gov — itens, resultados, contratos e legado

**Tipo:** fonte · **Prioridade:** P0 · **Evidência predominante:** contrato · **Família:** COMPRAS-GOV.

- **Órgão:** MGI
- **Documentação:** https://dadosabertos.compras.gov.br/swagger-ui/index.html
- **Endpoint ou recurso informado:** https://dadosabertos.compras.gov.br/modulo-contratacoes/1_consultarContratacoes_PNCP_14133
- **Acesso:** API pública
- **Periodicidade:** variável por módulo; coleta diária proposta
- **Grão:** compra/item/resultado/contrato
- **Chaves:** controle PNCP; órgão/UASG; fornecedor; item; CATMAT/CATSER
- **Uso possível no CREA-SP:** enriquecimento técnico do objeto e histórico federal
- **Limites:** cobertura SIASG/Compras não é todo PNCP; deduplicar contrato por identificadores
- **Evidência literal:** OpenAPI GET200; teste filtroSP GET200 vazio
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC03
- **Atributos complementares preservados:** {"acesso": "consultas públicas; módulos restritos do mesmo Swagger não implicam liberação"}

### JC04 — Compras.gov — fornecedores públicos

**Tipo:** subconjunto · **Prioridade:** P1 · **Evidência predominante:** amostra de dados · **Família:** COMPRAS-GOV.

- **Órgão:** MGI/SICAF
- **Documentação:** https://dadosabertos.compras.gov.br/v3/api-docs
- **Endpoint ou recurso informado:** https://dadosabertos.compras.gov.br/modulo-fornecedor/1_consultarFornecedor?ativo=true&codigoCnae=7112000&pagina=1&tamanhoPagina=10
- **Acesso:** API pública parcial
- **Periodicidade:** atualização cadastral; coleta semanal proposta
- **Grão:** fornecedor cadastrado
- **Chaves:** CNPJ/CPF quando permitido; CNAE; porte; natureza
- **Uso possível no CREA-SP:** fornecedores técnicos↔estabelecimento↔CREA
- **Limites:** cadastro ativo no método não equivale ReceitaAtiva/CREAAtivo; não é universo empresarial completo
- **Evidência literal:** GET200 com dados CNAE7112000
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC04
- **Atributos complementares preservados:** {"acesso": "GET sem token testado; acervo privado SICAF separado"}

### JC05 — CATSER/CATMAT — classificação de serviços/materiais

**Tipo:** subconjunto · **Prioridade:** P0 · **Evidência predominante:** amostra de dados · **Família:** COMPRAS-GOV.

- **Órgão:** MGI
- **Documentação:** https://dadosabertos.compras.gov.br/swagger-ui/index.html
- **Endpoint ou recurso informado:** https://dadosabertos.compras.gov.br/modulo-servico/6_consultarItemServico?pagina=1&tamanhoPagina=10
- **Acesso:** API pública
- **Periodicidade:** quando catálogo é alterado; coleta semanal/mensal proposta
- **Grão:** código de serviço e hierarquia
- **Chaves:** serviço; seção/divisão/grupo/classe/subclasse; CPC
- **Uso possível no CREA-SP:** dicionário objeto→atividade técnica validado pelas câmaras
- **Limites:** serviço/material e engenharia não são equivalentes; classificador requer validação
- **Evidência literal:** GET200 10itens com dataHoraAtualizacao
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC05
- **Atributos complementares preservados:** {"acesso": "sem token no teste"}

## Controle e contratação SP (5)

### JC06 — TCE-SP — despesas municipais

**Tipo:** fonte · **Prioridade:** P1 · **Evidência predominante:** amostra de dados · **Família:** TCE-SP.

- **Órgão:** TCESP/AUDESP
- **Documentação:** https://transparencia.tce.sp.gov.br/apis
- **Endpoint ou recurso informado:** https://transparencia.tce.sp.gov.br/api/json/despesas/balsamo/2026/1
- **Acesso:** API pública JSON/XML
- **Periodicidade:** eventos por mês; arquivos correlatos declarados semanais
- **Grão:** evento de despesa por órgão/empenho/data
- **Chaves:** CNPJ fornecedor; órgão; empenho; município slug; data; evento
- **Uso possível no CREA-SP:** pagamentos/execução contábil e fornecedores ligados a ajustes
- **Limites:** capital fora; CPF parcial; evento não tem objeto técnico; não somar empenhado+liquidado+pago
- **Evidência literal:** GET200 com 1446eventos jan2026; municípios644
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC06
- **Atributos complementares preservados:** {"acesso": "aberto"}

### JC07 — TCE-SP — licitações e ajustes Fase IV em arquivos

**Tipo:** subconjunto · **Prioridade:** P1 · **Evidência predominante:** documentação · **Família:** TCE-SP.

- **Órgão:** TCESP/AUDESP
- **Documentação:** https://transparencia.tce.sp.gov.br/conjunto-de-dados
- **Endpoint ou recurso informado:** https://transparencia.tce.sp.gov.br/sites/default/files/conjunto-dados/licitacoes-contratos/ajustes-2025-1o-semestre.zip
- **Acesso:** arquivos CSV/ZIP/SQL
- **Periodicidade:** ESPORÁDICA declarada; referência mensal; ajustes2025 publicados14/08/2026
- **Grão:** licitação/participante/item/ajuste conforme arquivo
- **Chaves:** CNPJ contratado; número/ano contrato/licitação; órgão/município; datas
- **Uso possível no CREA-SP:** histórico públicoSP e dedupe/ponte com eventos despesa
- **Limites:** informado pelos órgãos; presença no TCE não é análise/aprovação individual; defasagem relevante
- **Evidência literal:** catálogo e layout oficiais lidos; não baixada carga integral
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC07
- **Atributos complementares preservados:** {"acesso": "download público"}

### JC08 — AUDESP — APIs de prestação e consulta de documentos prestados

**Tipo:** fonte · **Prioridade:** Parceria · **Evidência predominante:** contrato · **Família:** TCE-SP.

- **Órgão:** TCESP
- **Documentação:** https://audesp.tce.sp.gov.br/api/
- **Endpoint ou recurso informado:** https://audesp.tce.sp.gov.br/api/audesp.yaml
- **Acesso:** API autenticada de prestação
- **Periodicidade:** conforme remessas/regras; transição2026
- **Grão:** documento de prestação e protocolo
- **Chaves:** documento/protocolo; órgão; licitação/ajuste
- **Uso possível no CREA-SP:** futuro acordo de extrato oficial com TCE
- **Limites:** não API aberta genérica de contratos; legado de engenharia permanece até término
- **Evidência literal:** Swagger/YAML GET200; autenticação/Bearer explícitos
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC08
- **Atributos complementares preservados:** {"acesso": "credencial Portal Sistemas+Bearer; cooperação para leitura agregada"}

### JC09 — TCE-SP — obras paralisadas/atrasadas

**Tipo:** fonte · **Prioridade:** P2 · **Evidência predominante:** lead · **Família:** TCE-SP.

- **Órgão:** TCESP
- **Documentação:** https://www.tce.sp.gov.br/paineldeobras
- **Endpoint ou recurso informado:** https://www.tce.sp.gov.br/informacoes-sobre-obras-paralisadas-e-ou-atrasadas
- **Acesso:** painel/arquivos; API estável não confirmada
- **Periodicidade:** declarativa; calendário a confirmar por produto
- **Grão:** obra e situação declarada
- **Chaves:** obra/contrato/contratante; município; empresa quando disponível
- **Uso possível no CREA-SP:** contexto territorial e técnico de obras/RT/ART
- **Limites:** paralisação não atribui culpa ao fornecedor/RT; não usar números de notícias como cargaBI
- **Evidência literal:** documentação pública; não validado endpoint de dados estável
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC09
- **Atributos complementares preservados:** {"acesso": "painel público; negociar arquivo/API oficial recorrente"}

### JC10 — TCM-SP/Prefeitura — complemento capital

**Tipo:** fonte · **Prioridade:** P2 · **Evidência predominante:** lead · **Família:** TCM-PREFEITURA-SP.

- **Órgão:** TCMSP/PMSP
- **Documentação:** https://portal.tcm.sp.gov.br/Pagina/78382
- **Endpoint ou recurso informado:** https://obrasabertas.prefeitura.sp.gov.br/
- **Acesso:** APIs/arquivos por produto a homologar
- **Periodicidade:** variável; não validado SLA
- **Grão:** contratação/obra municipal conforme base
- **Chaves:** contrato; CNPJ; localização; órgão; IDobra
- **Uso possível no CREA-SP:** suprir lacuna territorial capital com fontes municipais/PNCP
- **Limites:** página licitações do tribunal pode refletir contratações próprias, não todos fiscalizados
- **Evidência literal:** portais oficiais consultados; sem extração de dados homologada
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC10
- **Atributos complementares preservados:** {"acesso": "canais públicos; contrato recorrente específico pendente"}

## Controle e contratação federal (1)

### JC16 — Portal Transparência — contratos/despesas/convênios

**Tipo:** fonte · **Prioridade:** P1 · **Evidência predominante:** documentação · **Família:** CGU-TRANSPARENCIA.

- **Órgão:** CGU
- **Documentação:** https://portaldatransparencia.gov.br/api-de-dados
- **Endpoint ou recurso informado:** https://api.portaldatransparencia.gov.br/
- **Acesso:** API com token e arquivos
- **Periodicidade:** específica de cada sistema origem
- **Grão:** contrato/evento despesa/convênio
- **Chaves:** CNPJ; órgão; contrato; documento; datas
- **Uso possível no CREA-SP:** contexto financeiro federal e triangulação contratos
- **Limites:** cobertura federal; competência, etapa contábil e dedupe necessários
- **Evidência literal:** documentado; consulta CEIS semtoken401; sem consultaautenticada
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC16
- **Atributos complementares preservados:** {"acesso": "token via gov.br; arquivos para conjuntos disponíveis"}

## Controle externo (2)

### JC18 — TCU — acórdãos/normas/certidões

**Tipo:** fonte · **Prioridade:** P2 · **Evidência predominante:** amostra de dados · **Família:** TCU.

- **Órgão:** TCU
- **Documentação:** https://sites.tcu.gov.br/dados-abertos/webservices-tcu/
- **Endpoint ou recurso informado:** https://dados-abertos.apps.tcu.gov.br/api/acordao/recupera-acordaos?inicio=0&quantidade=1
- **Acesso:** webservices públicos
- **Periodicidade:** conforme publicação; rotina proposta semanal
- **Grão:** acórdão/norma/certidão
- **Chaves:** idacórdão; processo; CNPJ na consultaconsolidada
- **Uso possível no CREA-SP:** contexto técnico-normativo e documentos de controle
- **Limites:** não atribuir achado por homônimo/CNPJ sem relação documental específica
- **Evidência literal:** GET200 acórdãoamostra e tiposcertidões
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC18
- **Atributos complementares preservados:** {"acesso": "público nos testes acórdão/tiposcertidão"}

### JC19 — TCU Fiscobras — obras fiscalizadas

**Tipo:** subconjunto · **Prioridade:** P2 · **Evidência predominante:** lead · **Família:** TCU.

- **Órgão:** TCU
- **Documentação:** https://portal.tcu.gov.br/publicacoes-institucionais/relatorio-de-fiscalizacao/fiscobras
- **Endpoint ou recurso informado:** https://paineis.tcu.gov.br/
- **Acesso:** relatórios/painel; API específica não confirmada
- **Periodicidade:** relatório periódico; outrascargas a confirmar
- **Grão:** fiscalização/empreendimento/achado quando publicado
- **Chaves:** processoTCU; empreendimento; contrato; território quando presentes
- **Uso possível no CREA-SP:** riscos/temas de infraestrutura emSP e priorização contextual
- **Limites:** Fiscobras não universo completo; obrascontratadaspeloTCU não são obrasfiscalizadas
- **Evidência literal:** fonte oficial mostra relatório2026/painel; sem endpointAPI comprovado
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC19
- **Atributos complementares preservados:** {"acesso": "público documental; acordo para extrato estruturado"}

## Crédito e investimento (4)

### BCB-SCR — Crédito e inadimplência setorial agregados

**Tipo:** fonte · **Prioridade:** P2 · **Evidência predominante:** documentação · **Família:** BCB.

- **Órgão:** Banco Central
- **Documentação:** https://dadosabertos.bcb.gov.br/dataset/scr_data
- **Endpoint ou recurso informado:** https://www.bcb.gov.br/pda/desig/scrdata_{ANO}.zip
- **Acesso:** Arquivos ZIP/CSV oficiais; API de catálogo
- **Periodicidade:** Mensal; versão2 para competências recentes
- **Grão:** Mês×UF×CNAE/porte/modalidade e demais cortes disponíveis, sujeitos a sigilo
- **Chaves:** UF; CNAE em nível publicado; competência; modalidade
- **Uso possível no CREA-SP:** Condições de crédito dos setores paulistas; acompanhar associação com aberturas/fechamentos e inadimplência CREA em agregado.
- **Limites:** Catálogo e resource_show200; HEAD2026ZIP200, conteúdo não baixado. Não há dívida bancária individual por CNPJ. Respeitar supressão e quebra entre versões; dívida bancária não é inadimplência CREA. Validar no dicionário o papel territorial da UF (tomador/estabelecimento ou outro critério publicado); não inferir local de aplicação do recurso, execução da obra ou sede CREA.
- **Evidência literal:** Metadados200; existência ZIP via HEAD200; sem amostra financeira
- **Verificado em:** 2026-10-29
- **Origem:** empresas-economia-legislativo.json
- **Chave da ficha:** BCB-SCR

### BCB-SGS — Juros, inflação e ciclo de investimento

**Tipo:** fonte · **Prioridade:** P2 · **Evidência predominante:** amostra de dados · **Família:** BCB.

- **Órgão:** Banco Central
- **Documentação:** https://dadosabertos.bcb.gov.br/dataset/432-taxa-de-juros---meta-selic-definida-pelo-copom
- **Endpoint ou recurso informado:** https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados?formato=json&dataInicial=01/10/2026&dataFinal=20/10/2026
- **Acesso:** API pública JSON/CSV
- **Periodicidade:** Diária/mensal conforme série
- **Grão:** Série×data
- **Chaves:** Código SGS; data; unidade
- **Uso possível no CREA-SP:** Cenário de juros e financiamento como contexto econômico para demanda de engenharia.
- **Limites:** GET20020 observações. Série432 é meta Selic nacional, não financiamento recebido por empresa SP. Séries diárias exigem data e janela máxima10 anos por requisição segundo catálogo.
- **Evidência literal:** Amostra JSON200; catálogo oficial
- **Verificado em:** 2026-10-29
- **Origem:** empresas-economia-legislativo.json
- **Chave da ficha:** BCB-SGS

### BCB-ESTBAN — Crédito bancário por município

**Tipo:** fonte · **Prioridade:** P3 · **Evidência predominante:** documentação · **Família:** BCB.

- **Órgão:** Banco Central
- **Documentação:** https://www.bcb.gov.br/estatisticas/estatisticabancariamunicipios
- **Endpoint ou recurso informado:** https://www.bcb.gov.br/estatisticas/estatisticabancariamunicipios
- **Acesso:** Arquivos oficiais; homologar caminho estável de download
- **Periodicidade:** Mensal, com defasagem de publicação
- **Grão:** Município×mês×rubrica bancária
- **Chaves:** Código município ESTBAN; CODMUN_IBGE quando publicado; competência
- **Uso possível no CREA-SP:** Contexto do crédito territorial e concentração bancária associado à dinâmica empresarial.
- **Limites:** Página200 shellJS; arquivo não baixado. Domicílio da agência não coincide necessariamente com tomador ou aplicação da obra. Não identifica crédito da engenharia ou de CNPJ específico.
- **Evidência literal:** Documentação oficial; sem amostra de arquivo
- **Verificado em:** 2026-10-29
- **Origem:** empresas-economia-legislativo.json
- **Chave da ficha:** BCB-ESTBAN

### BCB-IMOB — Financiamento e mercado imobiliário

**Tipo:** fonte · **Prioridade:** P3 · **Evidência predominante:** amostra de dados · **Família:** BCB.

- **Órgão:** Banco Central
- **Documentação:** https://olinda.bcb.gov.br/olinda/servico/MercadoImobiliario/versao/v1/documentacao
- **Endpoint ou recurso informado:** https://olinda.bcb.gov.br/olinda/servico/MercadoImobiliario/versao/v1/odata/mercadoimobiliario?$top=1&$format=json
- **Acesso:** API pública OData
- **Periodicidade:** Conforme série; coleta proposta mensal
- **Grão:** Série/informação×data
- **Chaves:** Data; Info; unidade conforme metadados
- **Uso possível no CREA-SP:** Indicador antecedente/contextual de demanda na construção e serviços técnicos.
- **Limites:** GET200 inspecionado Data/Info/Valor. Não assumir recorte municipal/SP em toda série; selecionar apenas a abrangência documentada. Não permite vínculo com mutuário ou empresa.
- **Evidência literal:** Amostra OData200; catálogo200
- **Verificado em:** 2026-10-29
- **Origem:** empresas-economia-legislativo.json
- **Chave da ficha:** BCB-IMOB

## Demanda detrabalho (1)

### LAB07 — SINE, Emprega Brasil e PAT-SP — vagas

**Tipo:** parceria · **Prioridade:** P3 · **Evidência predominante:** parceria · **Família:** MTE-SINE-PAT.

- **Órgão:** MTE/estadoemunicípiosparceiros
- **Documentação:** https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/sistema-nacional-de-emprego-sine/portal-emprega-brasil
- **Endpoint ou recurso informado:** https://servicos.mte.gov.br/
- **Acesso:** Serviço autenticado; API aberta não confirmada
- **Periodicidade:** Dinâmica, conforme serviço ou acordo
- **Grão:** não informado
- **Chaves:** CBO; município; data; empregador somente se autorizado
- **Uso possível no CREA-SP:** Demanda declarada por competências e vagas agregadas com cobertura conhecida
- **Limites:** Não foi confirmada API pública estável. Serviço autenticado não é API aberta. Vagas SINE não representam todo o mercado.
- **Evidência literal:** Documentação oficial verificada; nenhum contrato público de API confirmado.
- **Verificado em:** 2026-10-29
- **Origem:** formacao-trabalho.json
- **Chave da ficha:** LAB07
- **Atributos complementares preservados:** {"notes": "Ver relatório formacao-trabalho.md e evidências para detalhes."}

## Descoberta e governança (4)

### CAT-DG — Portal Brasileiro de Dados Abertos / catálogo nacional

**Tipo:** catalogo · **Prioridade:** P0 · **Evidência predominante:** contrato · **Família:** CAT-DG.

- **Órgão:** CGU / MGI
- **Documentação:** https://dados.gov.br/swagger-ui/index.html
- **Endpoint ou recurso informado:** https://dados.gov.br/dados/api/publico/conjuntos-dados
- **Acesso:** API REST com chave-api-dados-abertos declarada no OpenAPI; GET sem chave retornou 401; portal entrou em manutenção
- **Periodicidade:** Conforme publicador; planejar checagem diária e coleta de metadados semanal
- **Grão:** Conjunto e recurso; não registros de empresas
- **Chaves:** ["idConjunto", "idRecurso", "idOrganizacao"]
- **Uso possível no CREA-SP:** Descobrir arquivos e APIs e monitorar mudanças, licença, dicionário, atualização e descontinuação
- **Limites:** Não é API de todos os fatos nacionais. pagina obrigatório, tamanho de página/índice inicial não definidos no schema; 200 com HTML de manutenção não é dado. Sem varredura integral autenticada nesta pesquisa.
- **Evidência literal:** OpenAPI3.1 GET20063 KB baixado; retorno 401 e manutenção documentados em evidencias-catalogo
- **Verificado em:** 2026-10-29
- **Origem:** fontes-catalogos-normalizadas.json
- **Chave da ficha:** CAT-DG
- **Atributos complementares preservados:** {"ultima_competencia": null}

### CAT-CHELFO — Chelfo / índice independente de APIs

**Tipo:** catalogo · **Prioridade:** P1 · **Evidência predominante:** documentação · **Família:** CAT-CHELFO.

- **Órgão:** Curadoria ChelfoIA / pesquisa Manus AI
- **Documentação:** https://www.chelfoapi.com/
- **Endpoint ou recurso informado:** https://www.chelfoapi.com/
- **Acesso:** Página pública com catálogo embutido; não API oficial fornecedora de fatos
- **Periodicidade:** Snapshot de 03/09/2026; atualização recorrente não garantida
- **Grão:** Registro de catálogo
- **Chaves:** ["id local", "URL documentação"]
- **Uso possível no CREA-SP:** Descobrir publicadores oficiais a serem validados
- **Limites:** 959 linhas não são 959 APIs distintas testadas.845 URLsdistintas,20 registrosSP,duplicidades,acessosdescritosinconsistentes. Condições do órgão prevalecem. Não coletar fatos doBIa partir do índice.
- **Evidência literal:** GET200 com HTML; matriz 959 extraída e contada; qualificação independente de fonte; snapshot integral apenas para trabalho
- **Verificado em:** 2026-10-29
- **Origem:** fontes-catalogos-normalizadas.json
- **Chave da ficha:** CAT-CHELFO
- **Atributos complementares preservados:** {"ultima_competencia": "2026-09-03"}

### CAT-SP — Catálogo Dados Abertos do Estado de SP

**Tipo:** catalogo · **Prioridade:** P0 · **Evidência predominante:** documentação · **Família:** CAT-SP.

- **Órgão:** CGE-SP / publicadores estaduais
- **Documentação:** https://dadosabertos.sp.gov.br/manual
- **Endpoint ou recurso informado:** https://dadosabertos.sp.gov.br/api/3/action/package_search
- **Acesso:** GET público CKAN comprovado sem token; escrita e recursos podem exigir autorização
- **Periodicidade:** Metadados conforme órgão; planejar checagem semanal
- **Grão:** Conjunto/recurso
- **Chaves:** ["id pacote", "id recurso", "organization"]
- **Uso possível no CREA-SP:** Descobrir JUCESP, DER, ARTESP, SEADE, Detran e outras bases paulistas
- **Limites:** 452 conjuntos no snapshot. Contagem não mede completude ou qualidade; formato pode ser etiqueta incorreta; verificar resource e hash.
- **Evidência literal:** GET200 JSON válido com success=true;12 consultas dirigidas comrows 5 emsp-query-summary.json
- **Verificado em:** 2026-10-29
- **Origem:** fontes-catalogos-normalizadas.json
- **Chave da ficha:** CAT-SP
- **Atributos complementares preservados:** {"ultima_competencia": null}

### CAT-CAPITAL — Catálogo Dados Abertos da Cidade de São Paulo

**Tipo:** catalogo · **Prioridade:** P0 · **Evidência predominante:** documentação · **Família:** CAT-CAPITAL.

- **Órgão:** Prefeitura de São Paulo / CGM
- **Documentação:** https://dados.prefeitura.sp.gov.br/
- **Endpoint ou recurso informado:** https://dados.prefeitura.sp.gov.br/api/3/action/package_search
- **Acesso:** GET público CKAN comprovado sem token
- **Periodicidade:** Conforme publicador; planejar checagem semanal
- **Grão:** Conjunto/recurso municipal
- **Chaves:** ["id pacote", "id recurso", "organization"]
- **Uso possível no CREA-SP:** Piloto municipal de licenciamento, obras e evidência territorial
- **Limites:** 489 conjuntos no snapshot; não representa 645 municípios; entradas recentes podem ser basesdescontinuadas ou sódicionários.
- **Evidência literal:** GET200 JSON válido com success=true;4 consultas dirigidas comrows 5 e 6 detalhes entreestado/capital
- **Verificado em:** 2026-10-29
- **Origem:** fontes-catalogos-normalizadas.json
- **Chave da ficha:** CAT-CAPITAL
- **Atributos complementares preservados:** {"ultima_competencia": null}

## Dicionários (2)

### EDU03 — CINE Brasil

**Tipo:** fonte · **Prioridade:** P1 · **Evidência predominante:** amostra de dados · **Família:** INEP.

- **Órgão:** Inep
- **Documentação:** https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/cine-brasil
- **Endpoint ou recurso informado:** https://repositorio.seade.gov.br/dataset/cb99a06d-7b66-4e58-bd3f-2a7e52fa8607/resource/b6abe70a-3cff-41a7-935f-23892d1c02b8/download/cine_inep.csv
- **Acesso:** Dicionário versionado; CSV auxiliar Seade
- **Periodicidade:** Por revisão da classificação
- **Grão:** não informado
- **Chaves:** Código CINE detalhado; rótulo; vigência
- **Uso possível no CREA-SP:** Definir universo de cursos e ponte analítica com modalidades e competências demandadas
- **Limites:** CINE não determina atribuição profissional. Relações CINE↔CBO↔CNAE são muitos para muitos e exigem validação.
- **Evidência literal:** Página Inep GET200; CSV Seade completo GET200,13412 bytes.
- **Verificado em:** 2026-10-29
- **Origem:** formacao-trabalho.json
- **Chave da ficha:** EDU03
- **Atributos complementares preservados:** {"notes": "Ver relatório formacao-trabalho.md e evidências para detalhes."}

### LAB05 — CBO e Quadro Brasileiro de Qualificações

**Tipo:** fonte · **Prioridade:** P1 · **Evidência predominante:** amostra de dados · **Família:** MTE-PDET-CBO.

- **Órgão:** Ministério do Trabalho e Emprego
- **Documentação:** https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo/servicos/downloads/downloads
- **Endpoint ou recurso informado:** https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo/servicos/downloads/cbo2002-ocupacao.csv
- **Acesso:** CSV/ZIP públicos
- **Periodicidade:** Por revisão; checagem proposta mensal
- **Grão:** não informado
- **Chaves:** Código CBO6; família4; sinônimos; vigência
- **Uso possível no CREA-SP:** Selecionar ocupações de engenharia e correlatas; classificar competências para análises agregadas
- **Limites:** CBO declarada não comprova diploma, registro ou atribuição. Analista não equivale automaticamente a engenheiro desviado.
- **Evidência literal:** CSV oficial completo GET200,108256 bytes; cabeçalho CODIGO;TITULO.
- **Verificado em:** 2026-10-29
- **Origem:** formacao-trabalho.json
- **Chave da ficha:** LAB05
- **Atributos complementares preservados:** {"notes": "Ver relatório formacao-trabalho.md e evidências para detalhes."}

## Economia paulista (1)

### SET26 — SEADE PIB e indicadores municipais

**Tipo:** fonte · **Prioridade:** P1 contexto · **Evidência predominante:** documentação · **Família:** SEADE.

- **Órgão:** SEADE
- **Documentação:** https://dadosabertos.sp.gov.br/dataset/pib
- **Endpoint ou recurso informado:** https://repositorio.seade.gov.br/dataset/pib-municipal-a-partir-2022
- **Acesso:** Arquivos abertos; catálogosCKAN
- **Periodicidade:** Mensal/trimestral/anual conforme série
- **Grão:** município/ano/setor; agregado estadual/período
- **Chaves:** Código municipal/ano/setor
- **Uso possível no CREA-SP:** Densidade técnica versusbase econômica regional; normalizar rankings
- **Limites:** Séries municipais2002–2021 e 2022+ podem ter ruptura; recurso XLSXpode serHTML
- **Evidência literal:** GET catálogo SP200; recurso aponta páginaSEADE
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET26
- **Atributos complementares preservados:** {"coleta_proposta": "Conforme série", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}

## Emprego e remuneração (5)

### LAB01 — RAIS não identificada

**Tipo:** fonte · **Prioridade:** P1 · **Evidência predominante:** documentação · **Família:** MTE-PDET-CBO.

- **Órgão:** MTE/PDET
- **Documentação:** https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/estatisticas-trabalho/microdados-rais-e-caged
- **Endpoint ou recurso informado:** ftp://ftp.mtps.gov.br/pdet/microdados/RAIS/
- **Acesso:** ArquivosTXT comprimidos emFTP público
- **Periodicidade:** Anual; layouts e séries podem mudar
- **Grão:** não informado
- **Chaves:** Ano; município; CNAE; CBO; características dos vínculos
- **Uso possível no CREA-SP:** Estoque formal, remuneração e distribuição de ocupações técnicas
- **Limites:** Vínculo não é profissional distinto. Não presumir CNPJ/CPF aberto. Remuneração anual não é salário de admissão.
- **Evidência literal:** Documentação oficial verificada; transporte FTP não executado.
- **Verificado em:** 2026-10-29
- **Origem:** formacao-trabalho.json
- **Chave da ficha:** LAB01
- **Atributos complementares preservados:** {"notes": "Ver relatório formacao-trabalho.md e evidências para detalhes."}

### LAB02 — Novo CAGED não identificado

**Tipo:** subconjunto · **Prioridade:** P1 · **Evidência predominante:** documentação · **Família:** MTE-PDET-CBO.

- **Órgão:** MTE/PDET
- **Documentação:** https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/estatisticas-trabalho/microdados-rais-e-caged
- **Endpoint ou recurso informado:** ftp://ftp.mtps.gov.br/pdet/microdados/NOVO%20CAGED/
- **Acesso:** ArquivosTXT/7z públicos viaFTP
- **Periodicidade:** Mensal, com ajustes e declarações fora do prazo
- **Grão:** não informado
- **Chaves:** Competência; município; CNAE; CBO; salário; tipo de movimentação
- **Uso possível no CREA-SP:** Admissões, desligamentos, saldo e salário de admissão em engenharia e setores relacionados
- **Limites:** Fluxo não é estoque. Salário de admissão não é remuneração de todos nem prova de infração de piso. Reprocessar ajustes.
- **Evidência literal:** Documentação confirma TXT UTF8 delimitado; transporte FTP não executado.
- **Verificado em:** 2026-10-29
- **Origem:** formacao-trabalho.json
- **Chave da ficha:** LAB02
- **Atributos complementares preservados:** {"notes": "Ver relatório formacao-trabalho.md e evidências para detalhes."}

### LAB03 — Emprego formal por ocupações em SP

**Tipo:** subconjunto · **Prioridade:** P1 · **Evidência predominante:** documentação · **Família:** SEADE.

- **Órgão:** Fundação Seade, com fonte MTE
- **Documentação:** https://repositorio.seade.gov.br/dataset/emprego-formal-ocupacoes
- **Endpoint ou recurso informado:** https://repositorio.seade.gov.br/dataset/af336846-0b47-4f5f-bcc3-ac42795784ab/resource/78c089ac-5411-4106-bc9a-2e30b9df3792/download/boletim_trimestral.zip
- **Acesso:** API CKAN de catálogo + ZIP/CSV HTTPS
- **Periodicidade:** Publicação trimestral; conteúdo com competências mensais
- **Grão:** não informado
- **Chaves:** competencia; municipio6; subclasseCNAE7; cbo2002ocupacao6
- **Uso possível no CREA-SP:** Demanda formal por CBO×CNAE×município; comparar à atividade empresarial CREA
- **Limites:** Código municipal6 requer ponte IBGE7. CNPJ ausente do dicionário. Licença do catálogo não preenchida; salário exige metodologia/ponderação.
- **Evidência literal:** CKAN200; dicionário CSV200; ZIP de dados não baixado.
- **Verificado em:** 2026-10-29
- **Origem:** formacao-trabalho.json
- **Chave da ficha:** LAB03
- **Atributos complementares preservados:** {"notes": "Ver relatório formacao-trabalho.md e evidências para detalhes."}

### LAB04 — Emprego e salário por setor em SP

**Tipo:** subconjunto · **Prioridade:** P1 · **Evidência predominante:** documentação · **Família:** SEADE.

- **Órgão:** Fundação Seade, com fonte MTE
- **Documentação:** https://repositorio.seade.gov.br/dataset/emprego-rais-e-arquivos-auxiliares
- **Endpoint ou recurso informado:** https://repositorio.seade.gov.br/dataset/a6a99b6a-9339-476e-9d88-38bf5b4ff034/resource/9fde18ee-0272-441d-9fc1-da167259484b/download/vinculos.7z
- **Acesso:** API CKAN de catálogo +7z/CSV HTTPS
- **Periodicidade:** Anual; catálogo distingue série nova2022–2025 e antiga2012–2021
- **Grão:** não informado
- **Chaves:** Ano; município; setor; porte e escolaridade conforme dicionário
- **Uso possível no CREA-SP:** Contexto de estoque e remuneração setorial para expansão ou retração do ecossistema CREA
- **Limites:** Validar disponibilidade de CBO detalhado e quebra de série. Sem vínculo nominal com empresa CREA presumido.
- **Evidência literal:** Catálogo CKAN200; recursos7z identificados, conteúdo não baixado.
- **Verificado em:** 2026-10-29
- **Origem:** formacao-trabalho.json
- **Chave da ficha:** LAB04
- **Atributos complementares preservados:** {"notes": "Ver relatório formacao-trabalho.md e evidências para detalhes."}

### LAB06 — PNAD Contínua — ocupação e rendimento

**Tipo:** fonte · **Prioridade:** P2 · **Evidência predominante:** documentação · **Família:** IBGE.

- **Órgão:** IBGE
- **Documentação:** https://www.ibge.gov.br/estatisticas/sociais/trabalho/9173-pesquisa-nacional-por-amostra-de-domicilios-continua-trimestral.html
- **Endpoint ou recurso informado:** https://servicodados.ibge.gov.br/api/v3/agregados/4099/periodos/-1/variaveis/4099?localidades=N3%5B35%5D
- **Acesso:** API Agregados/SIDRA e microdados amostrais ZIP
- **Periodicidade:** Trimestral ou anual conforme produto
- **Grão:** não informado
- **Chaves:** UF; território publicado; período; ocupação COD; atividade CNAE Domiciliar
- **Uso possível no CREA-SP:** Informalidade, conta própria e contexto de trabalho no estado de SP
- **Limites:** Amostra exige pesos, desenho e erros. Não prometer precisão município×engenharia. COD não é CBO. Sem pareamento nominal com CREA.
- **Evidência literal:** API Agregados503 nos testes; índice HTTPS de microdados IBGE200.
- **Verificado em:** 2026-10-29
- **Origem:** formacao-trabalho.json
- **Chave da ficha:** LAB06
- **Atributos complementares preservados:** {"notes": "Ver relatório formacao-trabalho.md e evidências para detalhes."}

## Empresas e sociedade (5)

### RFB-CNPJ — CNPJ: empresas, estabelecimentos, CNAEs e Simples

**Tipo:** fonte · **Prioridade:** P1 · **Evidência predominante:** documentação · **Família:** RFB.

- **Órgão:** Receita Federal
- **Documentação:** https://www.gov.br/receitafederal/dados/cnpj-metadados.pdf
- **Endpoint ou recurso informado:** https://arquivos.receitafederal.gov.br/
- **Acesso:** Arquivos oficiais abertos; canal atual exige homologação de descarga
- **Periodicidade:** Mensal; guardar cada fotografia
- **Grão:** Empresa-raiz; estabelecimento; opção tributária; CNAE principal/secundário
- **Chaves:** CNPJ completo e raiz em texto; CNAE; município RFB/TOM com de-para IBGE
- **Uso possível no CREA-SP:** Base paulista elegível; abertura e alteração de atividade; sobrevivência observada; correspondência com registro/visto CREA.
- **Limites:** Layout e página pública de arquivos200; URL antiga /dados/cnpj/dados_abertos_cnpj/404. Não homologada descarga do lote atual nesta pesquisa. Situação ativa não prova exercício efetivo, obrigação CREA, solvência ou regularidade fiscal. Porte Demais não equivale a grande porte; MEI é opção, não porte. Identificadores alfanuméricos devem ser preservados.
- **Evidência literal:** Layout PDF200 e raiz pública200; arquivos da competência não baixados
- **Verificado em:** 2026-10-29
- **Origem:** empresas-economia-legislativo.json
- **Chave da ficha:** RFB-CNPJ

### RFB-QSA — Quadro de sócios e administradores

**Tipo:** subconjunto · **Prioridade:** P1 · **Evidência predominante:** documentação · **Família:** RFB.

- **Órgão:** Receita Federal
- **Documentação:** https://www.gov.br/receitafederal/dados/cnpj-metadados.pdf
- **Endpoint ou recurso informado:** https://arquivos.receitafederal.gov.br/
- **Acesso:** Arquivos abertos do CNPJ
- **Periodicidade:** Mensal; a data de entrada não substitui histórico de saída
- **Grão:** Vínculo declarado sócio/administrador–empresa-raiz
- **Chaves:** CNPJ básico; CNPJ sócio PJ; CPF PF mascarado; qualificação; data de entrada
- **Uso possível no CREA-SP:** Rede societária PJ; mudanças observadas; participação de profissional apenas com identidade confirmada por fonte autorizada.
- **Limites:** QSA não é toda a diretoria nem comprova controle final. Nome+CPF mascarado não identifica profissional com segurança. Não reconstruir CPF, acusar favorecimento ou atribuir irregularidade por relação societária.
- **Evidência literal:** Layout oficial PDF200; registros QSA não coletados
- **Verificado em:** 2026-10-29
- **Origem:** empresas-economia-legislativo.json
- **Chave da ficha:** RFB-QSA

### RFB-CONECTA — Consulta cadastral e QSA autorizados

**Tipo:** parceria · **Prioridade:** P1 · **Evidência predominante:** parceria · **Família:** RFB.

- **Órgão:** RFB / Conecta gov.br / Serpro
- **Documentação:** https://www.gov.br/conecta/catalogo/apis/consulta-cnpj
- **Endpoint ou recurso informado:** https://apigateway.conectagov.estaleiro.serpro.gov.br/api-cnpj-qsa
- **Acesso:** API com adesão, aprovação e credenciais; não API anônima
- **Periodicidade:** Consulta transacional; cadência e cota dependem do acordo
- **Grão:** Resposta cadastral por CNPJ solicitado
- **Chaves:** CNPJ completo; dados conforme serviço autorizado
- **Uso possível no CREA-SP:** Validar divergências e sugestões prioritárias sem consultar toda a base a cada atualização.
- **Limites:** Elegibilidade e escopo do CREA-SP precisam confirmação institucional. Catálogo exibe documentação antiga; homologar versão e CNPJ alfanumérico. Não foi usada credencial ou executada consulta nominal.
- **Evidência literal:** Catálogo oficial200; serviço autenticado apenas documentado
- **Verificado em:** 2026-10-29
- **Origem:** empresas-economia-legislativo.json
- **Chave da ficha:** RFB-CONECTA

### SP-JUCESP — Constituições de empresas na JUCESP

**Tipo:** fonte · **Prioridade:** P2 · **Evidência predominante:** documentação · **Família:** JUCESP.

- **Órgão:** JUCESP / Portal de Dados Abertos SP
- **Documentação:** https://dadosabertos.sp.gov.br/dataset/registro-de-empresas-2026
- **Endpoint ou recurso informado:** ["https://dadosabertos.sp.gov.br/api/3/action/package_search?fq=organization:jucesp&rows=10", "https://dadosabertos.sp.gov.br/api/3/action/package_show?id=registro-de-empresas-2026"]
- **Acesso:** API de catálogo e CSVs oficiais
- **Periodicidade:** Arquivos mensais; catálogo2026 tinha janeiro–junho
- **Grão:** Constituição por período/localização/atividade/natureza/enquadramento conforme arquivo
- **Chaves:** Município; atividade; período; confirmar se CNPJ existe no arquivo antes de ligação nominal
- **Uso possível no CREA-SP:** Pulso de constituições empresariais paulista e comparação com inscrições no CREA por território/atividade.
- **Limites:** empresas-economia-legislativo.json: Não é todo o CNPJ estadual e não substitui RFB. API de catálogo200 com dois conjuntos(2025/2026), mas CSVjunho503 nesta sessão; grão/colunas precisam homologação. Último recurso no catálogo não prova data efetiva da fonte. | fontes-catalogos-normalizadas.json: Somente 6 recursos de janeiro a junho de 2026 no snapshot; não assumirQSA, encerramento, universo ativo ouCNPJ completo sem dicionário. Falha download na pesquisa pode sertransitória.
- **Evidência literal:** empresas-economia-legislativo.json: Metadados200; descarga CSV503; nenhum CNPJ presumido | fontes-catalogos-normalizadas.json: CKANpackage_show 200 JSON; recursos/descrição oficiais preservados; último mês encontradojunho; download CSV de janeiro de 2026 retornou 503; não foi confirmadoheader
- **Verificado em:** 2026-10-29
- **Origem:** ["empresas-economia-legislativo.json", "fontes-catalogos-normalizadas.json"]
- **Chave da ficha:** SP-JUCESP
- **Sobreposição:** Uma única camada JUCESP, pesquisada por busca e detalheCKAN. Prioridade canônica P2 para implantação: corpo CSV sem homologação. PrioridadeP1 do catálogo de descoberta expressa relevância estratégica; as duas prioridades, URLs, nomes, evidências e demais campos originais estão preservados em origens e na auditoria de105 linhas.
- **Nomes originais:** ["Constituições de empresas na JUCESP", "Constituições de empresas JUCESP2026"]
- **Origem preservada:** empresas-economia-legislativo.json; prioridadeP2; documentaçãohttps://dadosabertos.sp.gov.br/dataset/registro-de-empresas-2026; endpointhttps://dadosabertos.sp.gov.br/api/3/action/package_search?fq=organization:jucesp&rows=10.
- **Origem preservada:** fontes-catalogos-normalizadas.json; prioridadeP1; documentaçãohttps://dadosabertos.sp.gov.br/dataset/registro-de-empresas-2026; endpointhttps://dadosabertos.sp.gov.br/api/3/action/package_show?id=registro-de-empresas-2026.

### IBGE-CNAE — Classificação econômica CNAE

**Tipo:** fonte · **Prioridade:** P0 · **Evidência predominante:** documentação · **Família:** IBGE.

- **Órgão:** IBGE / CONCLA
- **Documentação:** https://servicodados.ibge.gov.br/api/docs/cnae
- **Endpoint ou recurso informado:** https://servicodados.ibge.gov.br/api/v2/cnae/subclasses/7112000
- **Acesso:** API pública e tabelas oficiais
- **Periodicidade:** Por revisão da classificação; coleta proposta mensal
- **Grão:** Seção/divisão/grupo/classe/subclasse
- **Chaves:** CNAE e versão
- **Uso possível no CREA-SP:** Hierarquia dos setores; bridge com lista CREA e atividades ART sem inferir atribuição automática.
- **Limites:** GET503 nesta sessão. Lista CREA anexa tem classe própria e não pode ser substituída por seção CNAE. Não há correspondência1:1 entre CNAE,CBO,CINE e modalidade CREA.
- **Evidência literal:** API documentada; dado não homologado nesta sessão
- **Verificado em:** 2026-10-29
- **Origem:** empresas-economia-legislativo.json
- **Chave da ficha:** IBGE-CNAE

## Energia (3)

### SET01 — ANEEL SIGA + agentes de geração

**Tipo:** fonte · **Prioridade:** P1 · **Evidência predominante:** amostra de dados · **Família:** ANEEL.

- **Órgão:** ANEEL
- **Documentação:** https://dadosabertos.aneel.gov.br/dataset/siga-sistema-de-informacoes-de-geracao-da-aneel
- **Endpoint ou recurso informado:** https://dadosabertos.aneel.gov.br/api/3/action/datastore_search?resource_id=11ec447d-698d-4ab8-977f-b424d5deee6a&limit=1
- **Acesso:** API aberta e arquivos abertos
- **Periodicidade:** Diária SIGA e mensal agentes
- **Grão:** empreendimento; participação do agente
- **Chaves:** CodCEG/IdeNucleoCEG ligam usina a NumCPFCNPJ do agente; depois CNPJ ao CREA
- **Uso possível no CREA-SP:** Cobertura cadastral/técnica dos titulares de geração; ponte CEG com agente CNPJ
- **Limites:** SIGA não tem CNPJ; juntar agentes por CEG; usina e empresa não são mesmo grão
- **Evidência literal:** GET de dados 200 JSON; dois esquemas confirmados
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET01
- **Atributos complementares preservados:** {"coleta_proposta": "Diária", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}

### SET02 — ANEEL MMGD empreendimentos

**Tipo:** subconjunto · **Prioridade:** P1 contexto/P2 identidade · **Evidência predominante:** documentação · **Família:** ANEEL.

- **Órgão:** ANEEL
- **Documentação:** https://dadosabertos.aneel.gov.br/dataset/relacao-de-empreendimentos-de-geracao-distribuida
- **Endpoint ou recurso informado:** https://dadosabertos.aneel.gov.br/api/3/action/package_show?id=relacao-de-empreendimentos-de-geracao-distribuida
- **Acesso:** Arquivos abertos ZIP/Parquet
- **Periodicidade:** Diária
- **Grão:** unidade de micro/minigeração
- **Chaves:** UF/município/tipo/potência; identificadores do titular precisam ser validados na edição vigente
- **Uso possível no CREA-SP:** Expansão fotovoltaica municipal versus ARTs/empresas por modalidade
- **Limites:** Titular da unidade não é instalador; validar campo identificador na edição atual
- **Evidência literal:** GET catálogo200; arquivo não amostrado
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET02
- **Atributos complementares preservados:** {"coleta_proposta": "Diária", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}

### SET03 — ANEEL pedidos de conexão MMGD

**Tipo:** subconjunto · **Prioridade:** P2 · **Evidência predominante:** documentação · **Família:** ANEEL.

- **Órgão:** ANEEL
- **Documentação:** https://dadosabertos.aneel.gov.br/dataset/atendimento-mmgd-mini-e-micro-geracao-distribuida
- **Endpoint ou recurso informado:** https://dadosabertos.aneel.gov.br/api/3/action/package_show?id=atendimento-mmgd-mini-e-micro-geracao-distribuida
- **Acesso:** Arquivos abertos ZIP/Parquet
- **Periodicidade:** Mensal
- **Grão:** pedido de conexão
- **Chaves:** Município/distribuidora/data/situação; é demanda de conexão, não ART ou instalador
- **Uso possível no CREA-SP:** Demanda de conexões e carteira potencial por território
- **Limites:** Pedidos não são instalações concluídas, ARTs ou contratos de instaladores
- **Evidência literal:** GET catálogo200; arquivo não amostrado
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET03
- **Atributos complementares preservados:** {"coleta_proposta": "Mensal após competência", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}

## Engenharia veicular (3)

### SET10 — SENATRAN instituições técnicas licenciadas (ITL)

**Tipo:** fonte · **Prioridade:** P2 com alerta recência · **Evidência predominante:** documentação · **Família:** SENATRAN.

- **Órgão:** SENATRAN
- **Documentação:** https://dados.transportes.gov.br/dataset/instituicoes-tecnicas-licenciadas
- **Endpoint ou recurso informado:** https://dados.transportes.gov.br/api/3/action/package_show?id=instituicoes-tecnicas-licenciadas
- **Acesso:** Arquivos abertos JSON
- **Periodicidade:** Anual; últimos recursos listados 2022–2024
- **Grão:** instituição técnica licenciada
- **Chaves:** Identificação/endereço/UF da ITL; confirmar CNPJ no arquivo antes de relacionamento
- **Uso possível no CREA-SP:** ITLs em SP versus cadastro e RT
- **Limites:** Metadado2026 não significa registros2026; confirmar CNPJ e vigência no recurso
- **Evidência literal:** GET catálogo200; competência2024 é mais recente listada
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET10
- **Atributos complementares preservados:** {"coleta_proposta": "Anual; confirmar fonte atual antes do piloto", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}

### SET11 — SENATRAN frota/RENAVAM estatístico

**Tipo:** subconjunto · **Prioridade:** P3 · **Evidência predominante:** documentação · **Família:** SENATRAN.

- **Órgão:** SENATRAN
- **Documentação:** https://dados.transportes.gov.br/group/transito
- **Endpoint ou recurso informado:** https://dados.transportes.gov.br/
- **Acesso:** Arquivos abertos agregados
- **Periodicidade:** Conforme arquivo
- **Grão:** município/tipo de veículo/competência
- **Chaves:** Município/UF/tipo de veículo/data
- **Uso possível no CREA-SP:** Contexto da demanda regional por inspeção/manutenção
- **Limites:** Não permite lista de veículos/proprietáriosPJ; frota não comprova atividade técnica
- **Evidência literal:** Documentação de catálogo
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET11
- **Atributos complementares preservados:** {"coleta_proposta": "Mensal proposta", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}

### SET12 — DETRAN-SP empresas reguladas/credenciadas

**Tipo:** parceria · **Prioridade:** Parceria prioritária · **Evidência predominante:** parceria · **Família:** DETRAN-SP.

- **Órgão:** DETRAN-SP
- **Documentação:** https://credenciados.detran.sp.gov.br/agentes-regulados
- **Endpoint ou recurso informado:** https://credenciados.detran.sp.gov.br/classe-desmontagem
- **Acesso:** Parceria; API pública bulk não confirmada
- **Periodicidade:** A negociar
- **Grão:** estabelecimento/credenciamento/categoria/vigência
- **Chaves:** CNPJ+categoria+vigência+RT, se disponibilizados por acordo
- **Uso possível no CREA-SP:** Desmontagem/reciclagem/inspeção: CNPJ e RT vigentes versus CREA
- **Limites:** ECV não é ITL; exigir regra específica por categoria; página não éAPI
- **Evidência literal:** Portal e editais oficiais; endpoint não identificado
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET12
- **Atributos complementares preservados:** {"coleta_proposta": "Semanal/diária conforme acordo", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}

## Formação (5)

### EDU01 — Censo da Educação Superior

**Tipo:** fonte · **Prioridade:** P1 · **Evidência predominante:** documentação · **Família:** INEP.

- **Órgão:** Inep
- **Documentação:** https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/censo-da-educacao-superior
- **Endpoint ou recurso informado:** https://download.inep.gov.br/microdados/microdados_censo_da_educacao_superior_2024.zip
- **Acesso:** Arquivo ZIP anual; não API nominal
- **Periodicidade:** Anual, com retificações
- **Grão:** não informado
- **Chaves:** Ano; código IES; código curso; CINE; município da oferta; modalidade
- **Uso possível no CREA-SP:** Matrículas, ingressantes e concluintes de cursos selecionados em SP; comparação agregada com novos registros e vínculos RT
- **Limites:** Matrícula não é pessoa distinta; concluintes não representam estoque profissional; CINE 07 não equivale ao universo CREA. Sem identificação individual pública presumida.
- **Evidência literal:** Documentação verificada; ZIP HEAD503 e tentativa web502; conteúdo não processado.
- **Verificado em:** 2026-10-29
- **Origem:** formacao-trabalho.json
- **Chave da ficha:** EDU01
- **Atributos complementares preservados:** {"notes": "Ver relatório formacao-trabalho.md e evidências para detalhes."}

### EDU02 — Trajetória e fluxo da educação superior

**Tipo:** subconjunto · **Prioridade:** P2 · **Evidência predominante:** documentação · **Família:** INEP.

- **Órgão:** Inep
- **Documentação:** https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/indicadores-educacionais/indicadores-de-trajetoria-da-educacao-superior
- **Endpoint ou recurso informado:** https://download.inep.gov.br/informacoes_estatisticas/indicadores_educacionais/indicadores_trajetoria_es_2015_2024.zip
- **Acesso:** ZIP/planilhas de indicadores agregados
- **Periodicidade:** Anual e por coorte
- **Grão:** não informado
- **Chaves:** Coorte; ano de acompanhamento; IES; curso conforme edição
- **Uso possível no CREA-SP:** Conclusão, desistência e permanência nos cursos; sustentabilidade da formação regional
- **Limites:** Não calcular evasão por 1−concluintes/ingressantes do mesmo ano. Fluxo anual e trajetória acumulada têm denominadores distintos.
- **Evidência literal:** Páginas oficiais GET200; link ZIP identificado, arquivo não baixado.
- **Verificado em:** 2026-10-29
- **Origem:** formacao-trabalho.json
- **Chave da ficha:** EDU02
- **Atributos complementares preservados:** {"notes": "Ver relatório formacao-trabalho.md e evidências para detalhes."}

### EDU04 — Educação superior em São Paulo

**Tipo:** fonte · **Prioridade:** P1 · **Evidência predominante:** amostra de dados · **Família:** SEADE.

- **Órgão:** Fundação Seade com fonteInep
- **Documentação:** https://repositorio.seade.gov.br/dataset/educacao-do-ensino-superior
- **Endpoint ou recurso informado:** https://repositorio.seade.gov.br/api/3/action/package_show?id=educacao-do-ensino-superior
- **Acesso:** API CKAN de catálogo + CSV HTTPS
- **Periodicidade:** Anual conforme Censo; monitorar retificações
- **Grão:** não informado
- **Chaves:** nu_ano_censo; co_ies; cod_ibge7; co_cine_rotulo; modalidade; grau; sexo
- **Uso possível no CREA-SP:** Matrículas por curso/área, instituição e município; tabelas IES/CINE auxiliares
- **Limites:** CSV de matrículas não contém concluintes. Metadata_modified não é competência. Localização EaD exige nota. Licença não preenchida no catálogo.
- **Evidência literal:** CKAN GET200; seis CSV GET200. Matrículas lido parcialmente; demais completos.
- **Verificado em:** 2026-10-29
- **Origem:** formacao-trabalho.json
- **Chave da ficha:** EDU04
- **Atributos complementares preservados:** {"notes": "Ver relatório formacao-trabalho.md e evidências para detalhes."}

### EDU05 — Cadastro de cursos e instituições e-MEC

**Tipo:** fonte · **Prioridade:** P2 · **Evidência predominante:** lead · **Família:** MEC-EMEC.

- **Órgão:** MEC
- **Documentação:** https://www.gov.br/mec/pt-br/politica-regulacao-supervisao-educacao-superior/cadastro-nacional-de-cursos-e-ies
- **Endpoint ou recurso informado:** https://dadosabertos.mec.gov.br/indicadores-sobre-ensino-superior/item/183-cursos-de-graduacao-do-brasil
- **Acesso:** Cadastro público; exportaçãoCSV histórica; API pública estável não confirmada
- **Periodicidade:** Cadastro contínuo; periodicidade da exportação não confirmada
- **Grão:** não informado
- **Chaves:** Código IES; código curso; município IBGE; modalidade; grau
- **Uso possível no CREA-SP:** Situação regulatória e vagas autorizadas; qualificar dimensão de cursos
- **Limites:** API pública estável não confirmada. CSV encontrado em caminho2022 pode estar defasado; cadastro MEC não substitui homologação CREA.
- **Evidência literal:** Documentação localizada; página e CSV retornaram403.
- **Verificado em:** 2026-10-29
- **Origem:** formacao-trabalho.json
- **Chave da ficha:** EDU05
- **Atributos complementares preservados:** {"notes": "Ver relatório formacao-trabalho.md e evidências para detalhes."}

### EDU06 — Conceito Enade, CPC, IGC e IDD

**Tipo:** subconjunto · **Prioridade:** P2 · **Evidência predominante:** documentação · **Família:** INEP.

- **Órgão:** Inep
- **Documentação:** https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/indicadores-educacionais/indicadores-de-qualidade-da-educacao-superior
- **Endpoint ou recurso informado:** https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/indicadores-educacionais/indicadores-de-qualidade-da-educacao-superior
- **Acesso:** Planilhas por edição e área de avaliação
- **Periodicidade:** Por ciclo e publicação
- **Grão:** não informado
- **Chaves:** Ano; área avaliada; IES; curso conforme indicador
- **Uso possível no CREA-SP:** Contextualizar heterogeneidade da formação em áreas e regiões estratégicas
- **Limites:** Não mede competência individual nem atribuição. Sem conceito não é nota zero; comparar a mesma área e ciclo.
- **Evidência literal:** Página oficial GET200; arquivos por edição não baixados.
- **Verificado em:** 2026-10-29
- **Origem:** formacao-trabalho.json
- **Chave da ficha:** EDU06
- **Atributos complementares preservados:** {"notes": "Ver relatório formacao-trabalho.md e evidências para detalhes."}

## Formação e inovação (1)

### EDU07 — Discentes e titulados de pós-graduação

**Tipo:** subconjunto · **Prioridade:** P2 · **Evidência predominante:** contrato · **Família:** CAPES.

- **Órgão:** CAPES
- **Documentação:** https://dadosabertos.capes.gov.br/dataset/2021-a-2024-discentes-da-pos-graduacao-stricto-sensu-do-brasil
- **Endpoint ou recurso informado:** https://dadosabertos.capes.gov.br/api/3/action/datastore_search?resource_id=8afca354-18d5-4b6c-9158-2695fb26ad86&limit=0
- **Acesso:** API CKAN DataStore + CSV
- **Periodicidade:** Anual, com retificações
- **Grão:** não informado
- **Chaves:** AN_BASE; CD_ENTIDADE_EMEC; CD_PROGRAMA_IES; SG_UF_PROGRAMA; área; grau; situação
- **Uso possível no CREA-SP:** Polos de mestrado/doutorado em Engenharias e especialização territorial em SP
- **Limites:** Programa em SP não prova residência ou trabalho em SP. Publicação não autoriza qualquer uso nominal. Projetar apenas campos agregados necessários.
- **Evidência literal:** CKAN200; DataStore limit0 GET200 success:true,38 campos; nenhum registro pessoal solicitado.
- **Verificado em:** 2026-10-29
- **Origem:** formacao-trabalho.json
- **Chave da ficha:** EDU07
- **Atributos complementares preservados:** {"notes": "Ver relatório formacao-trabalho.md e evidências para detalhes."}

## Inspeção e metrologia (1)

### SET21 — INMETRO acreditação CADORG/RBC/RBLE

**Tipo:** parceria · **Prioridade:** Parceria/P2 · **Evidência predominante:** parceria · **Família:** INMETRO.

- **Órgão:** INMETRO
- **Documentação:** https://www.gov.br/inmetro/pt-br/assuntos/acreditacao-reconhecimento-bpl/organismos-acreditados
- **Endpoint ou recurso informado:** https://www.gov.br/inmetro/pt-br/centrais-de-conteudo/sistemas/cadorg/cadastro-de-organismos-acreditados
- **Acesso:** Consulta pública; parceria/arquivo a homologar
- **Periodicidade:** Situação atual; exportação a negociar
- **Grão:** organismo/acreditação/escopo/vigência
- **Chaves:** Organização/escopo/acreditação/local; validar CNPJ estruturado
- **Uso possível no CREA-SP:** Inspeção/laboratórios e escopos técnicos versus CREA
- **Limites:** Escopo pode serparcialmente cancelado; certificado não basta; CNPJvalidar
- **Evidência literal:** Página oficial; API não confirmada
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET21
- **Atributos complementares preservados:** {"coleta_proposta": "Semanal proposta", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}

## Investimento e inovação (4)

### SET22 — BNDES operações de financiamento

**Tipo:** fonte · **Prioridade:** P1 · **Evidência predominante:** amostra de dados · **Família:** BNDES.

- **Órgão:** BNDES
- **Documentação:** https://dadosabertos.bndes.gov.br/dataset/operacoes-financiamento
- **Endpoint ou recurso informado:** https://dadosabertos.bndes.gov.br/api/3/action/datastore_search?resource_id=6f56b78c-510f-44b6-8274-78a5b7e931f4&limit=1
- **Acesso:** API abertaDataStore eCSV
- **Periodicidade:** Mensal
- **Grão:** operação de financiamento/cliente/contrato
- **Chaves:** CNPJ cliente+contrato+município IBGE+CNAE+projeto+datas+valores
- **Uso possível no CREA-SP:** Investimentos financiados emsetores técnicos e presença de empresasCREA
- **Limites:** Tomador não é fornecedor; contratado/desembolsado diferentes; geografia pode serdocliente
- **Evidência literal:** GET dados 200JSON; esquema CNPJprojetoIBGEconfirmado
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET22
- **Atributos complementares preservados:** {"coleta_proposta": "Mensal", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}

### SET23 — FINEP financiamentos

**Tipo:** fonte · **Prioridade:** P2, bloqueio de descoberta · **Evidência predominante:** lead · **Família:** FINEP.

- **Órgão:** FINEP
- **Documentação:** https://www.finep.gov.br/carta-servicos
- **Endpoint ou recurso informado:** https://www.finep.gov.br/transparencia-finep/paineis-e-downloads/central-de-downloads
- **Acesso:** Arquivos documentados;URLvigente a redescobrir
- **Periodicidade:** Semanal na carta de serviços
- **Grão:** operação/projeto/instituição
- **Chaves:** Projeto/instituição/CNPJ se presente/UF/data/valor
- **Uso possível no CREA-SP:** Empresas e projetos inovadores em SP versus CREA
- **Limites:** Não assumirAPI ouCNPJ nominal liberado; resolver link atual
- **Evidência literal:** Documentação de existência; centralGET 404
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET23
- **Atributos complementares preservados:** {"coleta_proposta": "Semanal após homologação", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}

### SET24 — CNPq fomento à pesquisa e CT&I

**Tipo:** fonte · **Prioridade:** P3 · **Evidência predominante:** documentação · **Família:** CNPQ.

- **Órgão:** CNPq
- **Documentação:** https://www.gov.br/cnpq/pt-br/acesso-a-informacao/dados-abertos/consulta-de-dados
- **Endpoint ou recurso informado:** https://www.gov.br/cnpq/pt-br/acesso-a-informacao/bolsas-e-auxilios/mapa-de-fomento-em-ciencia-tecnologia-e-inovacao
- **Acesso:** Bases abertas/portal documentados; extração a homologar
- **Periodicidade:** Conforme conjunto
- **Grão:** projeto/instituição/área/período
- **Chaves:** Instituição/área/projeto/UF/período; vínculo com CNPJ deve ser validado
- **Uso possível no CREA-SP:** Vocações tecnológicas e cooperação institucional regional
- **Limites:** Lattes não prova vínculo empregatício; CPF/CNPJ e API não presumidos
- **Evidência literal:** Documentação oficial
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET24
- **Atributos complementares preservados:** {"coleta_proposta": "Mensal/anual proposta", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}

### SET25 — INPI BADEPI

**Tipo:** fonte · **Prioridade:** P2 · **Evidência predominante:** documentação · **Família:** INPI.

- **Órgão:** INPI
- **Documentação:** https://www.gov.br/inpi/pt-br/inpi-data/dados-e-series-temporais/badepi
- **Endpoint ou recurso informado:** https://www.gov.br/inpi/pt-br/projetos-estrategicos/portal-de-servicos
- **Acesso:** Arquivos abertosBADEPI; API éprevisão não homologada
- **Periodicidade:** Anual; v12.0 2000–2025
- **Grão:** processo PI/titular/IPC/ano
- **Chaves:** Processo/IPC/titular/território conforme tabela; CNPJ pode ser restrito/ausente
- **Uso possível no CREA-SP:** Atividade tecnológica empresarial e campos técnicos em SP
- **Limites:** CNPJ pode estar ausente/restritoLGPD; depósito não éengenhariaprovada
- **Evidência literal:** Página oficialBADEPI e roadmap lidos
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET25
- **Atributos complementares preservados:** {"coleta_proposta": "Anual", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}

## Mineração (1)

### SET18 — ANM SIGMINE/SCM

**Tipo:** fonte · **Prioridade:** P2 · **Evidência predominante:** documentação · **Família:** ANM.

- **Órgão:** ANM
- **Documentação:** https://www.gov.br/anm/pt-br/acesso-a-informacao/dados-abertos/bases-de-dados
- **Endpoint ou recurso informado:** https://dadosabertos.anm.gov.br/SIGMINE/PROCESSOS_MINERARIOS/SP.zip
- **Acesso:** Arquivos abertos ZIP/KMZ
- **Periodicidade:** Snapshot recorrente; arquivo29/10/2026
- **Grão:** processo minerário/poligonal/fase
- **Chaves:** Processo/titular/poligonal/município; SIGMINE não garante CNPJ
- **Uso possível no CREA-SP:** Atividade minerária por fase em SP versus empresas/ART
- **Limites:** SIGMINE não garante CNPJ; requerimento não é lavra ativa; nome só candidato
- **Evidência literal:** Diretório oficial lido; pacoteSP listado
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET18
- **Atributos complementares preservados:** {"coleta_proposta": "Semanal proposta", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}

## Mineração e barragens (1)

### SET19 — ANM SIGBM

**Tipo:** subconjunto · **Prioridade:** P2 · **Evidência predominante:** documentação · **Família:** ANM.

- **Órgão:** ANM
- **Documentação:** https://www.gov.br/anm/pt-br/assuntos/acesso-a-sistemas/sistema-integrado-de-gestao-de-barragens-de-mineracao-sigbm-versao-publica
- **Endpoint ou recurso informado:** https://dadosabertos.anm.gov.br/SIGBM/
- **Acesso:** Dados abertos documentados; GET 403
- **Periodicidade:** Atualizada pelo empreendedor; homologar exportação
- **Grão:** barragem/empreendedor/classificação/data
- **Chaves:** Barragem/empreendedor/município/classificação; validar identificador nominal
- **Uso possível no CREA-SP:** Estruturas e empreendedores versus evidência de RT/ART
- **Limites:** Risco/dano potencial não são infração;RT nominal pode precisar parceria
- **Evidência literal:** Portal oficial; índiceGET 403
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET19
- **Atributos complementares preservados:** {"coleta_proposta": "Semanal proposta", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}

## Obras e investimentos (5)

### JC11 — Obrasgov — projetos, contratos, geometria e execução

**Tipo:** fonte · **Prioridade:** P0 · **Evidência predominante:** amostra de dados · **Família:** OBRASGOV.

- **Órgão:** MGI
- **Documentação:** https://api-publica.obrasgov.gestao.gov.br/obras/docs
- **Endpoint ou recurso informado:** https://api-publica.obrasgov.gestao.gov.br/obras/projeto-investimento?uf_principal=SP&pagina=1&tamanho_da_pagina=1
- **Acesso:** API pública nova2026
- **Periodicidade:** carga data-atualizacao; coleta diária/semanal proposta
- **Grão:** projeto; contrato; geometria; execução; empenho
- **Chaves:** id_projeto_investimento/CIPI; id_contrato; CNPJfornecedor; IBGE; datas
- **Uso possível no CREA-SP:** ponte forte projeto↔contrato↔CNPJ↔CREA↔ART
- **Limites:** projeto não é obraativa; amostra contrato/execução vazios; UFprincipal não basta p projetosmultiterritório
- **Evidência literal:** OpenAPI+SP+geometria+contrato+execução GET200; atualização29/10/2026
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC11
- **Atributos complementares preservados:** {"acesso": "sem token nos testes"}

### JC12 — Transferegov — Discricionárias e Legais

**Tipo:** subconjunto · **Prioridade:** P1 · **Evidência predominante:** contrato · **Família:** TRANSFEREGOV.

- **Órgão:** MGI
- **Documentação:** https://api-publica.transferegov.gestao.gov.br/
- **Endpoint ou recurso informado:** https://api-publica.transferegov.gestao.gov.br/discricionarias/openapi.json
- **Acesso:** API pública e CSV novos
- **Periodicidade:** data-atualizacao; cadência por carga
- **Grão:** programa/proposta/meta/proponente/PAC conforme versão
- **Chaves:** proposta; proponente; CNPJente; município; instrumento quando houver
- **Uso possível no CREA-SP:** pipeline investimento e transferências→projetosSP
- **Limites:** beneficiário público não é fornecedor; não confundir intenção/repasse/execução
- **Evidência literal:** OpenAPI GET200 com13rotas; dadosmódulo não amostrados
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC12
- **Atributos complementares preservados:** {"acesso": "OpenAPI público sem token"}

### JC13 — Transferegov — Transferências Especiais

**Tipo:** subconjunto · **Prioridade:** P1 · **Evidência predominante:** contrato · **Família:** TRANSFEREGOV.

- **Órgão:** MGI
- **Documentação:** https://api-publica.transferegov.gestao.gov.br/
- **Endpoint ou recurso informado:** https://api-publica.transferegov.gestao.gov.br/especiais/openapi.json
- **Acesso:** API pública nova2026
- **Periodicidade:** data-atualizacao; cadência por carga
- **Grão:** planoação/plano trabalho/meta/empenho/documento financeiro
- **Chaves:** plano; beneficiárioCNPJ; emenda; documento; território
- **Uso possível no CREA-SP:** demanda regional potencial e rastreamento de recursos
- **Limites:** não atribuir causalidade a político; pagamentos/metas não são automaticamente engenharia
- **Evidência literal:** OpenAPI GET200 com24rotas; dados não amostrados
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC13
- **Atributos complementares preservados:** {"acesso": "OpenAPI público sem token"}

### JC14 — Transferegov — Parcerias

**Tipo:** subconjunto · **Prioridade:** P2 · **Evidência predominante:** contrato · **Família:** TRANSFEREGOV.

- **Órgão:** MGI
- **Documentação:** https://api-publica.transferegov.gestao.gov.br/
- **Endpoint ou recurso informado:** https://api-publica.transferegov.gestao.gov.br/parcerias/openapi.json
- **Acesso:** API pública
- **Periodicidade:** data-atualizacao; cadência por carga
- **Grão:** programa/proposta/parceria/meta/documento financeiro
- **Chaves:** proposta/parceria; beneficiário; emenda; documento
- **Uso possível no CREA-SP:** demanda e atores de projetos técnicos emSP
- **Limites:** objeto e partes precisam classificação; não ligar ente beneficiário a fornecedor sem documento
- **Evidência literal:** OpenAPI GET200 com18rotas; dados não amostrados
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC14
- **Atributos complementares preservados:** {"acesso": "OpenAPI público sem token"}

### JC15 — Transferegov — Fundo a Fundo

**Tipo:** subconjunto · **Prioridade:** P2 · **Evidência predominante:** contrato · **Família:** TRANSFEREGOV.

- **Órgão:** MGI
- **Documentação:** https://api-publica.transferegov.gestao.gov.br/
- **Endpoint ou recurso informado:** https://api-publica.transferegov.gestao.gov.br/fundoafundo/openapi.json
- **Acesso:** API pública
- **Periodicidade:** data-atualizacao; cadência por carga
- **Grão:** programa/planoação/meta/empenho/relatório
- **Chaves:** programa/plano; ente; meta; documento financeiro
- **Uso possível no CREA-SP:** recursos e infraestrutura setorial emSP
- **Limites:** não é exclusivamente obras/engenharia; não publicar dados bancários desnecessários
- **Evidência literal:** OpenAPI GET200 com21rotas; dados não amostrados
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC15
- **Atributos complementares preservados:** {"acesso": "OpenAPI público sem token"}

## Obras e licenciamento (3)

### RFB-CNO — Cadastro Nacional de Obras compartilhado

**Tipo:** parceria · **Prioridade:** P1-acordo · **Evidência predominante:** parceria · **Família:** RFB.

- **Órgão:** RFB / Serpro
- **Documentação:** https://bcadastros.serpro.gov.br/documentacao/cadastro_cno/
- **Endpoint ou recurso informado:** Não homologado: depende do canal autorizado; URL de referência é documentação, não endpoint de dados.
- **Acesso:** Compartilhamento autorizado/contratação; não base aberta comprovada
- **Periodicidade:** Replicação/consulta conforme instrumento; coleta proposta diária
- **Grão:** Obra CNO, responsável com papel e vigência; áreas
- **Chaves:** CNO; ART/RRT quando preenchidos; CPF/CNPJ responsável; CIB; cadastro imobiliário; código TOM
- **Uso possível no CREA-SP:** Obra–ART–endereço–empresa; obras iniciadas sem vínculo documental identificado; conciliação alvará/habite-se.
- **Limites:** Documentação200 comprova campos, não autorização nem preenchimento real. Responsável tributário, dono, construtora e RT têm papéis diferentes. ART pode estar vazia; código municipal não é IBGE. Acesso ao dado precisa avaliação de finalidade e instrumento. Preservar número ART original com conselho/UF, formato e método de validação. Campo antigo de documento com14posições não comprova adaptação alfanumérica. Fim da responsabilidade não foi confirmado no schema.
- **Evidência literal:** Esquema oficial200, dados não acessados
- **Verificado em:** 2026-10-29
- **Origem:** empresas-economia-legislativo.json
- **Chave da ficha:** RFB-CNO

### SP-AD — Aprova Digital / licenciamento de empreendimentos na capital

**Tipo:** subconjunto · **Prioridade:** P1 · **Evidência predominante:** amostra de dados · **Família:** SMUL-CAPITAL.

- **Órgão:** SMUL / Prefeitura deSãoPaulo
- **Documentação:** https://dados.prefeitura.sp.gov.br/dataset/ad
- **Endpoint ou recurso informado:** https://dados.prefeitura.sp.gov.br/api/3/action/package_show?id=ad
- **Acesso:** CSV/XLSXpublicados por semestre; dicionários eLEIAME
- **Periodicidade:** Semestral declarado
- **Grão:** Solicitação/processo deparcelamento,edificação,usoeocupação do solo
- **Chaves:** ["processo", "protocolo", "processo_vinculado", "data_autuacao", "SQL", "endereços", "subprefeitura", "categoria/uso", "áreas e quantidades físicas"]
- **Uso possível no CREA-SP:** Mapear fluxo deempreendimentos × ARTdeprojeto/execução e empresas porlocal/data; priorizar análise digital por evidências
- **Limites:** Solicitação não é aprovação nem obraexecutada. Recurso 2026 rotuladoCSV aponta para XLSX:detectarconteúdo real. Cobertura sócapital. Não assumirCPF/RTpublicado semlerlayout. Cabeçalho 2026 efetivamente examinado não contém CNPJ,CPF, registro CREA ouRT. nomeInteressado não é chave determinística. ArquivoXLSX contém 1925 linhascomcabeçalho,27 campos.
- **Evidência literal:** package_show 200 JSON; downloadXLSX2026 S1 GET200 MIMEeassinatura ZIP válidos; cabeçalho 27 campos analisado; última publicação 20/08/2026
- **Verificado em:** 2026-10-29
- **Origem:** fontes-catalogos-normalizadas.json
- **Chave da ficha:** SP-AD
- **Atributos complementares preservados:** {"ultima_competencia": "2026-S1"}

### SP-ALVARAS-HIST — Aprovação de alvarás / basehistórica descontinuada

**Tipo:** subconjunto · **Prioridade:** P3 · **Evidência predominante:** documentação · **Família:** SMUL-CAPITAL.

- **Órgão:** SMUL / Prefeitura deSãoPaulo
- **Documentação:** https://dados.prefeitura.sp.gov.br/dataset/aprovacao-de-alvaras
- **Endpoint ou recurso informado:** https://dados.prefeitura.sp.gov.br/api/3/action/package_show?id=aprovacao-de-alvaras
- **Acesso:** Arquivoshistóricos abertos; não selecionar como feed operacional
- **Periodicidade:** DESCONTINUADA conforme descrição oficial
- **Grão:** Evento deaprovaçãohistórico
- **Chaves:** ["processo", "data", "localização conforme arquivo"]
- **Uso possível no CREA-SP:** Sériehistórica seestritamentenecessária; substituirporfonteatualpararotina
- **Limites:** Metadados de 2026 não significamdados de 2026. Não prometerautomaçãoatual de basehistórica. Notastextuais têm cronologiainterna a validar.
- **Evidência literal:** package_show 200 JSON34 recursos; descriçãoexplicitamentedescontinuada
- **Verificado em:** 2026-10-29
- **Origem:** fontes-catalogos-normalizadas.json
- **Chave da ficha:** SP-ALVARAS-HIST
- **Atributos complementares preservados:** {"ultima_competencia": "até2018nosrecursosinspecionados"}

## Obras e licenças na capital (1)

### SET27 — GeoSampa licenciamento/obras

**Tipo:** fonte · **Prioridade:** P1 piloto capital · **Evidência predominante:** amostra de dados · **Família:** GEOSAMPA.

- **Órgão:** Prefeitura de São Paulo/SMUL/GeoSampa
- **Documentação:** https://geoinfo-smdu.github.io/tutorial-geosampa-internet-2.0/
- **Endpoint ou recurso informado:** https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs?service=WFS&request=GetCapabilities
- **Acesso:** API abertaWFS/GeoJSON e arquivos
- **Periodicidade:** Porcamada;dt_carga/dt_atualizacao
- **Grão:** feição/obra/licença/SQL/processo
- **Chaves:** Geometria,SQL/processo/CNAE/razão social conforme camada; **não CNPJ na amostra**
- **Uso possível no CREA-SP:** Obras urbanas e licenças versusART porprojeto/local e empresa quandovalidada
- **Limites:** Sócapital; não CNPJnasduas camadasamostradas; permissionária nãoexecutora;licença municipalnãoCETESB
- **Evidência literal:** GETCapabilities200XML;duasGetFeature200GeoJSON
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET27
- **Atributos complementares preservados:** {"coleta_proposta": "Semanalproposta", "cobertura_sp": "Somente município de São Paulo; não extrapolar estado", "detalhe_markdown": "setoriais.md"}

## Parcerias (2)

### PART01 — RAIS/CAGED identificados por cooperação

**Tipo:** parceria · **Prioridade:** P2 condicionado · **Evidência predominante:** parceria · **Família:** MTE-PDET-CBO.

- **Órgão:** MTE
- **Documentação:** https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/estatisticas-trabalho/solicitar-bases-de-dados-identificados
- **Endpoint ou recurso informado:** https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/estatisticas-trabalho/solicitar-bases-de-dados-identificados
- **Acesso:** Acordo de cooperação e análise de finalidade; não API aberta
- **Periodicidade:** Conforme produto e acordo deferido
- **Grão:** não informado
- **Chaves:** CNPJ; CPF; CBO; período apenas se autorizados e fornecidos
- **Uso possível no CREA-SP:** Análises estatísticas de vínculos com finalidade expressamente deferida
- **Limites:** ACT não é automático nem licença geral para fiscalização. Exige finalidade, necessidade, sigilo, perfis e retenção.
- **Evidência literal:** Página oficial atualizada17/06/2026 verificada; Portaria Consolidada MTE1/2025 arts49–61 referenciada.
- **Verificado em:** 2026-10-29
- **Origem:** formacao-trabalho.json
- **Chave da ficha:** PART01
- **Atributos complementares preservados:** {"notes": "Ver relatório formacao-trabalho.md e evidências para detalhes."}

### PART02 — IES — conclusão prevista e diplomação por parceria

**Tipo:** parceria · **Prioridade:** P2 condicionado · **Evidência predominante:** parceria · **Família:** IES-PARCERIAS.

- **Órgão:** Instituições de ensino e CREA-SP; Sedap apenas como modalidade distinta de pesquisa
- **Documentação:** https://www.gov.br/inep/pt-br/areas-de-atuacao/gestao-do-conhecimento-e-estudos-educacionais/cibec/servico-de-acesso-a-dados-protegidos-sedap
- **Endpoint ou recurso informado:** não informado
- **Acesso:** Parceria a definir; nenhuma API nominal confirmada
- **Periodicidade:** Conforme acordo institucional
- **Grão:** não informado
- **Chaves:** IES; curso; coorte; data de conclusão; identificador apenas se autorizado
- **Uso possível no CREA-SP:** Formandos previstos e trajetória até registro CREA; preferir contagens agregadas
- **Limites:** Matrícula não significa provável concluinte. Projeção deve ser identificada. SEDAP é pesquisa institucional científica, não API operacional de prospecção.
- **Evidência literal:** SEDAP documentado; nenhuma interface de parceria nominal foi validada.
- **Verificado em:** 2026-10-29
- **Origem:** formacao-trabalho.json
- **Chave da ficha:** PART02
- **Atributos complementares preservados:** {"notes": "Ver relatório formacao-trabalho.md e evidências para detalhes."}

## Perícias e justiça (8)

### JC20 — CNJ DataJud público

**Tipo:** fonte · **Prioridade:** P1 · **Evidência predominante:** documentação · **Família:** CNJ.

- **Órgão:** CNJ/tribunais
- **Documentação:** https://datajud-wiki.cnj.jus.br/api-publica/
- **Endpoint ou recurso informado:** https://api-publica.datajud.cnj.jus.br/api_publica_tjsp/_search
- **Acesso:** API pública autenticada com chave pública
- **Periodicidade:** remessa tribunais; medir atraso; coleta periódica proposta
- **Grão:** metadados processo/grau/órgão/movimento
- **Chaves:** númeroCNJ; tribunal; órgão; TPU; datas
- **Uso possível no CREA-SP:** mapa de assuntos e movimentos potencialmente técnicos
- **Limites:** não contém tabela aberta laudo/perito/honoráriopago; assunto não comprova engenheiro; TRF3 incluiMS
- **Evidência literal:** documentadoCNJ; 401semchave; sem consultaautenticada
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC20
- **Atributos complementares preservados:** {"acesso": "chavepública vigenteCNJ; wiki403 noambiente; semchave401"}

### JC21 — TJSP Auxiliares da Justiça

**Tipo:** fonte · **Prioridade:** Parceria · **Evidência predominante:** lead · **Família:** TJSP.

- **Órgão:** TJSP
- **Documentação:** https://www.tjsp.jus.br/AuxiliaresDaJustica
- **Endpoint ou recurso informado:** https://www.tjsp.jus.br/auxiliaresjustica/auxiliarjustica/consultapublica
- **Acesso:** consultaHTML; API não confirmada
- **Periodicidade:** conforme cadastro/nomeação; rotina a negociar
- **Grão:** auxiliar com nomeação registrada; função/especialidade
- **Chaves:** nome/IDlocal; função/especialidade; processo em extrato negociado
- **Uso possível no CREA-SP:** coberturaprofissional e ART↔processo/nomeação
- **Limites:** só aparecem nomeados; ausência não comprova falta de cadastro; não certifica habilitação
- **Evidência literal:** páginaoficial e consultalidas; sem API/extraçãorecorrente
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC21
- **Atributos complementares preservados:** {"acesso": "consulta pública limitada; API/arquivo por acordo"}

### JC22 — AJ-JT/SIGEO TRT2 e TRT15 — nomeações/profissões

**Tipo:** subconjunto · **Prioridade:** Parceria · **Evidência predominante:** lead · **Família:** JUSTICA-TRABALHO.

- **Órgão:** CSJT/TRT2/TRT15
- **Documentação:** https://trt15.jus.br/servicos/honorarios-periciais
- **Endpoint ou recurso informado:** https://aj.sigeo.jt.jus.br/aj2/internetaberto/consultapublicanomeacoes.jsf
- **Acesso:** consultaHTML com exportação indicada; API não confirmada
- **Periodicidade:** cadastro/nomeação; a negociar
- **Grão:** nomeação e cadastroprofissional em canais separados
- **Chaves:** númeroprocesso; tribunal/unidade; nome; datas; situação; profissão/especialidade no cadastro
- **Uso possível no CREA-SP:** perícias engenharia por região; ART interna com processo; mercado especializado
- **Limites:** nomeação/serviço/pagamento distintos; coberturaAJnão total; nome não resolveCPF
- **Evidência literal:** HTML200 mas errosemântico na captura; grade/filtros/exportCSV visíveis; sem resultados exportados
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC22
- **Atributos complementares preservados:** {"acesso": "consulta pública; exportação/APIrecorrente por acordo recomendado"}

### JC23 — TRF3/JFSP CPTEC e AJG/CJF

**Tipo:** subconjunto · **Prioridade:** Parceria · **Evidência predominante:** lead · **Família:** JUSTICA-FEDERAL-TRF3.

- **Órgão:** TRF3/JFSP/CJF
- **Documentação:** https://www.trf3.jus.br/seju/assistencia-judiciaria-gratuita-ajg/
- **Endpoint ou recurso informado:** https://web.trf3.jus.br/ecptec/
- **Acesso:** sistema cadastral/financeiro; API aberta não confirmada
- **Periodicidade:** conforme eventos; rotina a negociar
- **Grão:** cadastro/nomeação/pagamento em sistemas internos
- **Chaves:** processo; profissional/órgão técnico; especialidade; data; unidade
- **Uso possível no CREA-SP:** demanda pericialSP e ART↔processo
- **Limites:** 3aRegiãoincluiMS; AJGnão total perícias; documentos/identificadores sob governança
- **Evidência literal:** documentaçãooficial lida; CPTEC503 na consulta
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC23
- **Atributos complementares preservados:** {"acesso": "cooperação/extrato; acesso profissional próprio não autoriza acervo geral"}

### JC24 — ART — dados do processo e destinatário judicial

**Tipo:** fonte · **Prioridade:** P0 · **Evidência predominante:** documentação · **Família:** CREA-SP-INTERNO.

- **Órgão:** CREA-SP/Confea
- **Documentação:** https://normativos.confea.org.br/Ementas/Visualizar?id=83001
- **Endpoint ou recurso informado:** não fornecido: mapear tabela/versão e gateway
- **Acesso:** fonte interna a mapear SQLServer/Db2
- **Periodicidade:** conforme eventos internos; incremental a definir
- **Grão:** ART e relação de processos ARTmúltipla
- **Chaves:** númeroART; númeroCNJ/referência; destinatárioCPF/CNPJ; profissional; empresa; datas
- **Uso possível no CREA-SP:** ponte documental ART→processo→nomeação e categoria
- **Limites:** honoráriodeclarado não pagamento; possibilidade de formulário não completude histórica
- **Evidência literal:** anexoRes1160modeloA.1p4–5 e B.1p9–11; não banco confirmado
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC24
- **Atributos complementares preservados:** {"acesso": "interno autorizado; schema e preenchimento ainda não confirmados"}

### JC25 — Codex consulta a dados judiciais públicos

**Tipo:** parceria · **Prioridade:** Parceria · **Evidência predominante:** parceria · **Família:** CNJ.

- **Órgão:** CNJ
- **Documentação:** https://atos.cnj.jus.br/atos/detalhar/5792
- **Endpoint ou recurso informado:** não identificado endpoint público sem habilitação
- **Acesso:** acesso institucional sob requisitos
- **Periodicidade:** a pactuar
- **Grão:** metadados e documentos processuais permitidos
- **Chaves:** processo/documento; identidade autorizada
- **Uso possível no CREA-SP:** possível pesquisa validada de peças públicas para engenharia
- **Limites:** não API pública irrestrita; separar sigilo/dadossensíveis/controleacesso
- **Evidência literal:** norma e apresentaçãoCNJ; não testado endpoint
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC25
- **Atributos complementares preservados:** {"acesso": "procedimentoinstitucional; sem acesso nesta pesquisa"}

### JC26 — Sisperjud

**Tipo:** parceria · **Prioridade:** Não priorizar · **Evidência predominante:** parceria · **Família:** CNJ.

- **Órgão:** CNJ
- **Documentação:** https://www.cnj.jus.br/tecnologia-da-informacao-e-comunicacao/justica-4-0/sisperjud/como-acessar/
- **Endpoint ou recurso informado:** sem endpoint aberto de extração confirmado
- **Acesso:** sistema e APIs de integração judiciária
- **Periodicidade:** conforme sistema
- **Grão:** perícias/laudos no escopo do sistema
- **Chaves:** processo/perícia sob acessojudicial
- **Uso possível no CREA-SP:** apenas acompanhar eventual expansão deescopo oficial
- **Limites:** não tratar como base aberta períciasengenharia
- **Evidência literal:** fontes CNJ/TRT2 descrevem períciasmédicas/acessojudicial
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC26
- **Atributos complementares preservados:** {"acesso": "restrito/integraçãotribunais"}

### JC27 — Sniper

**Tipo:** fonte · **Prioridade:** Excluir · **Evidência predominante:** lead · **Família:** CNJ.

- **Órgão:** CNJ
- **Documentação:** https://www.cnj.jus.br/tecnologia-da-informacao-e-comunicacao/justica-4-0/sniper/perguntas-frequentes/
- **Endpoint ou recurso informado:** nãoaplicável
- **Acesso:** sistema restrito, excluído de APIs públicas
- **Periodicidade:** nãoaplicável
- **Grão:** investigação patrimonial judicial
- **Chaves:** identificadores sob autorizaçãoJudiciário
- **Uso possível no CREA-SP:** não incluir como conector público
- **Limites:** não solicitar credencialemprestada; não é fonte aberta corporativa
- **Evidência literal:** FAQ oficial de acesso exclusivo
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC27
- **Atributos complementares preservados:** {"acesso": "magistrados/servidoresJudiciário; não acessoCREA"}

## Reuso (1)

### REUSE01 — engineer-statistics — ativos existentes

**Tipo:** reuso · **Prioridade:** P2 bootstrap · **Evidência predominante:** reuso · **Família:** REUSO-ENGINEER-STATISTICS.

- **Órgão:** Repositório do usuário; não é fonte pública oficial
- **Documentação:** https://github.com/caiofvserra/engineer-statistics/tree/claude/engineers-devaluation-site-mpp7iv
- **Endpoint ou recurso informado:** https://api.github.com/repos/caiofvserra/engineer-statistics/git/trees/claude%2Fengineers-devaluation-site-mpp7iv?recursive=1
- **Acesso:** GitHub JSON, SQL e scripts; reuso para preparação
- **Periodicidade:** Sem rotina oficial garantida para formação e salários
- **Grão:** não informado
- **Chaves:** fonteId; ano; UF; metadados; esquemas
- **Uso possível no CREA-SP:** Aproveitar catálogos, validação, estrutura de proveniência e snapshots para comparação/QA
- **Limites:** Séries de formação citam fontes secundárias; salários vêm de tabulações privadas; números nacionais e recortes distintos não devem migrar como dados oficiais SP atuais.
- **Evidência literal:** Árvore da branch200; sete arquivos200;143 fontes no registro.
- **Verificado em:** 2026-10-29
- **Origem:** formacao-trabalho.json
- **Chave da ficha:** REUSE01
- **Atributos complementares preservados:** {"notes": "Ver relatório formacao-trabalho.md e evidências para detalhes."}

## Sanções e contexto (1)

### JC17 — CEIS/CNEP

**Tipo:** subconjunto · **Prioridade:** P2 · **Evidência predominante:** documentação · **Família:** CGU-TRANSPARENCIA.

- **Órgão:** CGU+órgãos sancionadores
- **Documentação:** https://portaldatransparencia.gov.br/api-de-dados/cadastrar-email
- **Endpoint ou recurso informado:** https://api.portaldatransparencia.gov.br/api-de-dados/ceis?pagina=1
- **Acesso:** API token/arquivos públicos
- **Periodicidade:** conforme alimentação origem
- **Grão:** sanção e sancionado
- **Chaves:** CNPJ; tipo; órgão; regime; processo; datasvigência
- **Uso possível no CREA-SP:** contexto de sanções aplicáveis ao fornecedor
- **Limites:** não indicador automático irregularidadeCREA; regime/alcance/suspensões importam
- **Evidência literal:** GET401 sem chave; documentação oficial de token e arquivos
- **Verificado em:** 2026-10-29
- **Origem:** justica-compras-catalogo.json
- **Chave da ficha:** JC17
- **Atributos complementares preservados:** {"acesso": "API token; downloads públicos conforme catálogo"}

## Telecomunicações (2)

### SET06 — ANATEL estações licenciadas e dispensadas

**Tipo:** fonte · **Prioridade:** P2 · **Evidência predominante:** documentação · **Família:** ANATEL.

- **Órgão:** ANATEL
- **Documentação:** https://www.gov.br/anatel/pt-br/dados/dados-abertos
- **Endpoint ou recurso informado:** https://www.anatel.gov.br/dadosabertos/PDA/Outorga/EstacoesLicenciadas/Glossario_e_Metadados.pdf
- **Acesso:** Arquivos abertos documentados
- **Periodicidade:** Homologar por recurso
- **Grão:** estação/licença/prestador
- **Chaves:** CNPJ/CPF do prestador, estação/Fistel, município/coordenadas
- **Uso possível no CREA-SP:** Estações e titulares em SP versus presença técnica
- **Limites:** Estação/torre/obra não são equivalentes; CPF pode ser anonimizado
- **Evidência literal:** Documentação oficial; arquivo não amostrado
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET06
- **Atributos complementares preservados:** {"coleta_proposta": "Mensal proposta", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}

### SET07 — ANATEL prestadoras e VSAT em bloco

**Tipo:** subconjunto · **Prioridade:** P2 · **Evidência predominante:** documentação · **Família:** ANATEL.

- **Órgão:** ANATEL
- **Documentação:** https://www.gov.br/anatel/pt-br/assuntos/noticias/anatel-publica-dados-abertos-sobre-estacoes-terrenas-em-bloco
- **Endpoint ou recurso informado:** https://www.gov.br/anatel/pt-br/dados/dados-abertos
- **Acesso:** Arquivos abertos documentados
- **Periodicidade:** VSAT semestral; outros homologar
- **Grão:** prestador/outorga/estação VSAT
- **Chaves:** CNPJ do prestador + UF/município, não empresa instaladora
- **Uso possível no CREA-SP:** Cobertura regional de prestadores e estações versus CREA
- **Limites:** Prestador não identifica instalador; validar competência e situação da edição
- **Evidência literal:** Documentação oficial; arquivo não amostrado
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET07
- **Atributos complementares preservados:** {"coleta_proposta": "Semestral VSAT", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}

## Território e economia (9)

### IBGE-GEO — Municípios e regiões oficiais

**Tipo:** fonte · **Prioridade:** P0 · **Evidência predominante:** documentação · **Família:** IBGE.

- **Órgão:** IBGE
- **Documentação:** https://servicodados.ibge.gov.br/api/docs/localidades
- **Endpoint ou recurso informado:** https://servicodados.ibge.gov.br/api/v1/localidades/estados/35/municipios
- **Acesso:** API pública sem autenticação
- **Periodicidade:** Conforme revisões territoriais; coleta proposta mensal
- **Grão:** Município e divisão territorial
- **Chaves:** Código IBGE e versão territorial
- **Uso possível no CREA-SP:** Dimensão territorial comum; ligação de município a GRE por tabela interna versionada.
- **Limites:** GRE não é divisão IBGE. Serviço de localidades503 por timeout nesta execução; documentação oficial acessível. Não tornar indisponibilidade de carga igual a município inexistente.
- **Evidência literal:** Documentação oficial consultada; GET de dados503
- **Verificado em:** 2026-10-29
- **Origem:** empresas-economia-legislativo.json
- **Chave da ficha:** IBGE-GEO

### IBGE-POP — População residente e denominadores territoriais

**Tipo:** fonte · **Prioridade:** P1 · **Evidência predominante:** amostra de dados · **Família:** IBGE.

- **Órgão:** IBGE
- **Documentação:** https://sidra.ibge.gov.br/tabela/6579
- **Endpoint ou recurso informado:** https://apisidra.ibge.gov.br/values/t/6579/n3/35/v/9324/p/last?formato=json
- **Acesso:** API SIDRA e arquivos censitários
- **Periodicidade:** Estimativa anual; Censo por operação
- **Grão:** Território×ano; setores censitários conforme produto
- **Chaves:** IBGE; ano; variável; unidade
- **Uso possível no CREA-SP:** Escalas territoriais: empresas/ARTs por população; crescimento populacional como contexto da demanda de infraestrutura. Expansão física urbana exige outro produto geoespacial, não validado pelo GET de população.
- **Limites:** GET200 confirmou SP2026. Censo e estimativa são operações diferentes; população não estima demanda profissional individual nem obrigação empresarial. Denominador deve usar mesmo território e competência.
- **Evidência literal:** Amostra JSON200 com código35, variável9324 e ano2026
- **Verificado em:** 2026-10-29
- **Origem:** empresas-economia-legislativo.json
- **Chave da ficha:** IBGE-POP

### IBGE-PIB — PIB municipal e estrutura econômica

**Tipo:** fonte · **Prioridade:** P1 · **Evidência predominante:** documentação · **Família:** IBGE.

- **Órgão:** IBGE
- **Documentação:** https://www.ibge.gov.br/estatisticas/economicas/contas-nacionais/9088-produto-interno-bruto-dos-municipios.html
- **Endpoint ou recurso informado:** https://apisidra.ibge.gov.br/desctabapi.aspx?c=5938
- **Acesso:** API SIDRA / agregados e arquivos oficiais
- **Periodicidade:** Anual, com defasagem e revisões
- **Grão:** Município×ano×variável econômica
- **Chaves:** IBGE; ano; variável; unidade
- **Uso possível no CREA-SP:** Comparar peso econômico de territórios com atividade técnica, emprego e presença CREA; evitar ranking por volume bruto apenas.
- **Limites:** Metadados SIDRA200. Edição2022–2023 divulgada sem abertura setorial tradicional; não transportar valor adicionado setorial antigo para anos novos. Valores correntes não representam crescimento real sem tratamento.
- **Evidência literal:** Metadados200; página/notas oficiais consultadas
- **Verificado em:** 2026-10-29
- **Origem:** empresas-economia-legislativo.json
- **Chave da ficha:** IBGE-PIB

### IBGE-CEMPRE — Estrutura das empresas e unidades locais

**Tipo:** fonte · **Prioridade:** P1 · **Evidência predominante:** documentação · **Família:** IBGE.

- **Órgão:** IBGE
- **Documentação:** https://www.ibge.gov.br/estatisticas/economicas/servicos/9016-estatisticas-do-cadastro-central-de-empresas.html
- **Endpoint ou recurso informado:** https://apisidra.ibge.gov.br/desctabapi.aspx?c=9582
- **Acesso:** API SIDRA, tabelas agregadas
- **Periodicidade:** Anual
- **Grão:** Território×CNAE×ano×categoria conforme tabela
- **Chaves:** IBGE; CNAE em nível disponível; ano
- **Uso possível no CREA-SP:** Empresas/unidades locais/emprego/remuneração como benchmark independente do cadastro CREA e universo RFB.
- **Limites:** Metadados200. Há quebra metodológica em2022. Nem toda variável existe em município×subclasse. CEMPRE não é lista pública nominal para descobrir CNPJs ou somar ao universo RFB.
- **Evidência literal:** Metadados SIDRA200; notas oficiais consultadas
- **Verificado em:** 2026-10-29
- **Origem:** empresas-economia-legislativo.json
- **Chave da ficha:** IBGE-CEMPRE

### IBGE-DEMOEMP — Nascimento, morte e sobrevivência empresarial

**Tipo:** fonte · **Prioridade:** P2 · **Evidência predominante:** documentação · **Família:** IBGE.

- **Órgão:** IBGE
- **Documentação:** https://www.ibge.gov.br/estatisticas/economicas/servicos/22649-demografia-das-empresas-e-estatisticas-de-empreendedorismo.html
- **Endpoint ou recurso informado:** https://sidra.ibge.gov.br/
- **Acesso:** Tabelas e arquivos oficiais; validar tabela do recorte
- **Periodicidade:** Anual
- **Grão:** Coorte×ano×atividade×território conforme publicação
- **Chaves:** Ano/coorte; CNAE; UF/nível permitido
- **Uso possível no CREA-SP:** Separar retração econômica de perda de cobertura CREA; comparar renovação e sobrevivência em setores.
- **Limites:** A partir2022 o escopo passou a empresas/unidades empregadoras e há quebra de série; não comparar diretamente com todas as aberturas CNPJ. Não fornece identificação da empresa sobrevivente.
- **Evidência literal:** Documentação oficial; consulta de dados não executada
- **Verificado em:** 2026-10-29
- **Origem:** empresas-economia-legislativo.json
- **Chave da ficha:** IBGE-DEMOEMP

### IBGE-PAIC — Produção, emprego e custos da construção

**Tipo:** fonte · **Prioridade:** P2 · **Evidência predominante:** documentação · **Família:** IBGE.

- **Órgão:** IBGE
- **Documentação:** https://www.ibge.gov.br/estatisticas/economicas/industria/9018-pesquisa-anual-da-industria-da-construcao.html
- **Endpoint ou recurso informado:** https://apisidra.ibge.gov.br/desctabapi.aspx?c=10441
- **Acesso:** API SIDRA
- **Periodicidade:** Anual;2024 inicia nova disponibilização/tabelas
- **Grão:** UF/território×atividade×porte por pessoal ocupado×ano conforme tabela
- **Chaves:** UF35; CNAE; ano; faixa
- **Uso possível no CREA-SP:** Mercado real da construção, peso de obras públicas, trabalho e receita; comparar ARTs sem tratá-las como faturamento.
- **Limites:** Metadados200. Dados2024 publicados no SIDRA; validar série nova e cobertura. Porte por ocupados não é porte RFB. Produção não é soma do valor de contratos publicados nem de valores ART.
- **Evidência literal:** Metadados200; documentação oficial
- **Verificado em:** 2026-10-29
- **Origem:** empresas-economia-legislativo.json
- **Chave da ficha:** IBGE-PAIC

### IBGE-PAS — Mercado dos serviços técnicos

**Tipo:** fonte · **Prioridade:** P2 · **Evidência predominante:** documentação · **Família:** IBGE.

- **Órgão:** IBGE
- **Documentação:** https://www.ibge.gov.br/estatisticas/economicas/servicos/9028-pesquisa-anual-de-servicos.html
- **Endpoint ou recurso informado:** https://apisidra.ibge.gov.br/desctabapi.aspx?c=2634
- **Acesso:** API SIDRA
- **Periodicidade:** Anual
- **Grão:** Atividade×ano×nível territorial disponível
- **Chaves:** CNAE; ano; UF/território permitido
- **Uso possível no CREA-SP:** Contextualizar serviços de engenharia, arquitetura, ensaios e consultoria com receitas/custos/ocupação agregados.
- **Limites:** Tabela2634 metadados200; alguns detalhamentos são apenas Brasil. Não apresentar detalhamento nacional como SP nem arquitetura inteira como engenharia CREA. Não permite ligar receita nominal ao CNPJ.
- **Evidência literal:** Metadados200; descrição oficial
- **Verificado em:** 2026-10-29
- **Origem:** empresas-economia-legislativo.json
- **Chave da ficha:** IBGE-PAS

### IBGE-SINAPI — Custos regionais da construção

**Tipo:** fonte · **Prioridade:** P2 · **Evidência predominante:** documentação · **Família:** IBGE.

- **Órgão:** IBGE / Caixa
- **Documentação:** https://www.ibge.gov.br/estatisticas/economicas/precos-e-custos/9270-sistema-nacional-de-pesquisa-de-custos-e-indices-da-construcao-civil.html
- **Endpoint ou recurso informado:** https://apisidra.ibge.gov.br/desctabapi.aspx?c=2296
- **Acesso:** API SIDRA para índices; arquivos Caixa para composições
- **Periodicidade:** Mensal
- **Grão:** UF×mês×custo/índice; composições têm outro grão
- **Chaves:** UF35; competência; regime/desoneração; unidade
- **Uso possível no CREA-SP:** Contextualizar variação nominal dos projetos/obras e custos; comparar evolução de atividade com inflação setorial.
- **Limites:** Metadados200. Índice não é preço obrigatório de contrato ou prova de sobrepreço; objeto, quantidades, BDI, data e local precisam compatibilidade. Não usar SINAPI para deflacionar salários genericamente.
- **Evidência literal:** Metadados200; escopo documental
- **Verificado em:** 2026-10-29
- **Origem:** empresas-economia-legislativo.json
- **Chave da ficha:** IBGE-SINAPI

### IBGE-IPCA — Deflator de salários e valores monetários

**Tipo:** fonte · **Prioridade:** P1 · **Evidência predominante:** documentação · **Família:** IBGE.

- **Órgão:** IBGE
- **Documentação:** https://sidra.ibge.gov.br/tabela/1737
- **Endpoint ou recurso informado:** https://apisidra.ibge.gov.br/values/t/1737/n1/1/v/2266/p/last
- **Acesso:** API pública SIDRA
- **Periodicidade:** Mensal
- **Grão:** Índice×mês×área de abrangência
- **Chaves:** Competência; série; área; base
- **Uso possível no CREA-SP:** Apresentar salários e valores reais em uma base constante explicitada.
- **Limites:** Escolha metodológica deve ser explícita. IPCA geral é contexto; não substitui índice contratual aplicável. Endpoint documentado no SIDRA, não executado nesta rodada.
- **Evidência literal:** Documentação/tabela oficial; sem GET
- **Verificado em:** 2026-10-29
- **Origem:** empresas-economia-legislativo.json
- **Chave da ficha:** IBGE-IPCA

## Transportes (2)

### SET08 — ANTT RNTRC transportadores

**Tipo:** fonte · **Prioridade:** P2, pertinência limitada · **Evidência predominante:** lead · **Família:** ANTT.

- **Órgão:** ANTT
- **Documentação:** https://dados.antt.gov.br/dataset/rntrc
- **Endpoint ou recurso informado:** https://dados.antt.gov.br/api/3/action/package_search?q=rntrc&rows=5
- **Acesso:** Arquivos abertos documentados; acesso não homologado
- **Periodicidade:** Homologar recurso nominal
- **Grão:** transportador/RNTRC
- **Chaves:** CNPJ PJ; CPF anonimizado segundo dicionário; RNTRC/UF/município
- **Uso possível no CREA-SP:** Mercado logístico especializado quando relacionado a atividade técnica
- **Limites:** Transportador não é empresa de engenharia; CPF anonimizado; bloqueio técnico real
- **Evidência literal:** HTTP 200 HTML Request Rejected; não dadosJSON
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET08
- **Atributos complementares preservados:** {"coleta_proposta": "Mensal proposta", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}

### SET09 — ANTT investimentos rodoviários e projetos ferroviários

**Tipo:** fonte · **Prioridade:** P2 contexto · **Evidência predominante:** documentação · **Família:** ANTT.

- **Órgão:** ANTT
- **Documentação:** https://dados.antt.gov.br/dataset/investimentos
- **Endpoint ou recurso informado:** https://dados.antt.gov.br/dataset/a133da64-1e03-4832-909d-e1eb835eec2e/resource/a08292ac-41a6-4220-bfe2-35c7b3abfbf0/download/investimentos.csv
- **Acesso:** Arquivos abertos CSV/JSON
- **Periodicidade:** Conforme conjunto; homologar
- **Grão:** concessionária/rodovia/projeto/período
- **Chaves:** Concessionária/rodovia/projeto/período; CNPJ de executora pode faltar
- **Uso possível no CREA-SP:** Demanda de obras e investimento nos corredores que atendem SP
- **Limites:** Planejado/autorizado/realizado diferentes; executora CNPJ pode faltar
- **Evidência literal:** Documentação oficial
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET09
- **Atributos complementares preservados:** {"coleta_proposta": "Mensal/trimestral proposta", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}

## Água e saneamento (3)

### SET15 — ANA dados geográficos, outorgas, SNISB

**Tipo:** fonte · **Prioridade:** P2 · **Evidência predominante:** documentação · **Família:** ANA.

- **Órgão:** ANA
- **Documentação:** https://www.gov.br/ana/pt-br/acesso-a-informacao/dados-abertos
- **Endpoint ou recurso informado:** https://dadosabertos.ana.gov.br/
- **Acesso:** Arquivos/serviços geográficos; homologar recurso
- **Periodicidade:** Variável porcamada
- **Grão:** outorga/barragem/camada territorial
- **Chaves:** Coordenadas/município/outorga/barragem; CNPJ não presumido
- **Uso possível no CREA-SP:** Infraestrutura hídrica por município/bacia versus empresas/ART
- **Limites:** CNPJ não presumido; obra/projeto/instalação têm grãos próprios
- **Evidência literal:** Portal oficial; recurso específico não amostrado
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET15
- **Atributos complementares preservados:** {"coleta_proposta": "Mensal proposta", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}

### SET16 — ANA HidroWebService

**Tipo:** parceria · **Prioridade:** P3/contexto e projeto específico · **Evidência predominante:** parceria · **Família:** ANA.

- **Órgão:** ANA
- **Documentação:** https://www.gov.br/ana/pt-br/assuntos/monitoramento-e-eventos-criticos/monitoramento-hidrologico/orientacoes-manuais/manuais/manual-hidrowebservice_publica.pdf
- **Endpoint ou recurso informado:** https://www.ana.gov.br/hidrowebservice/swagger-ui/index.html
- **Acesso:** API autenticada mediante cadastro/autorização
- **Periodicidade:** Conforme série e estação
- **Grão:** estação/data/medição
- **Chaves:** Estação/data/bacia/coordenadas, ligação territorial
- **Uso possível no CREA-SP:** Contexto hidrológico para infraestrutura hídrica e drenagem
- **Limites:** Não liga CNPJ; janelas porrota; acesso precisa ser autorizado
- **Evidência literal:** Manual oficial; não requisitado acesso
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET16
- **Atributos complementares preservados:** {"coleta_proposta": "Diária quando projeto justificar", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}

### SET17 — Ministério das Cidades SINISA/SNIS

**Tipo:** fonte · **Prioridade:** P2 · **Evidência predominante:** documentação · **Família:** SINISA-SNIS.

- **Órgão:** Ministério das Cidades
- **Documentação:** https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento/sinisa/resultados-sinisa/resultados-sinisa-2025
- **Endpoint ou recurso informado:** https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento/sinisa/resultados-sinisa
- **Acesso:** Arquivos abertos planilhas
- **Periodicidade:** Anual; SINISA 2025 ref. 2024
- **Grão:** prestador/município/módulo/ano
- **Chaves:** Município/prestador/ano; validar CNPJ por tabela
- **Uso possível no CREA-SP:** Mercado e lacunas de saneamento versus atividade técnica e contratos
- **Limites:** Déficit não é obra contratada; prestador regional repete municípios;CNPJvalidar
- **Evidência literal:** Página oficial de planilhas/glossários lida
- **Verificado em:** 2026-10-29
- **Origem:** setoriais.json
- **Chave da ficha:** SET17
- **Atributos complementares preservados:** {"coleta_proposta": "Anual com revisão", "cobertura_sp": "Estadual filtrável por UF/município; sede versus local da instalação separados", "detalhe_markdown": "setoriais.md"}
