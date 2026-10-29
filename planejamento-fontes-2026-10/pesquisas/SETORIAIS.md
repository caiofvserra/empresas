# Fontes setoriais e territoriais para o CREA-SP

Pesquisa em 29/10/2026. Escopo: oportunidades de extração rotineira; nenhuma fonte foi integrada ao BI nesta etapa. **API de catálogo não equivale a API dos dados.** A disponibilidade de uma consulta na tela não prova autorização ou estabilidade para coleta em massa. O estado de São Paulo é o recorte territorial; sede da empresa e localização da instalação/obra devem ser dimensões diferentes.

## Recomendação

As oportunidades mais fortes são **ANEEL (empreendimento + agentes), ANP (revendas/instalações), BNDES (operações/projetos), MAPA/SIPEAGRO (estabelecimentos) e GeoSampa (obras/licenças na capital)**. Essas bases acrescentam uma evidência de atividade ou investimento ao simples CNAE. Para CETESB e DETRAN-SP, é mais apropriado planejar **parceria e acesso estruturado**, sem construir rotina baseada em consulta de tela. INPI/BADEPI e SINISA acrescentam contexto econômico e tecnológico; não são listas automáticas de obrigados ao registro.

Priorização proposta: P1 = piloto de alto valor e acesso suficientemente claro; P2 = próxima onda ou homologação de acesso/esquema; P3 = contexto ou estudo; parceria = acesso precisa ser negociado. Não representa avaliação oficial das competências dos órgãos.

## Catálogo resumido

| ID | Fonte e recorte | Modalidade / evidência | Periodicidade publicada ou condição | Chave e cruzamento | Prioridade |
|---|---|---|---|---|---|
| SET01 | ANEEL SIGA + agentes de geração | CKAN, CSV/XML e DataStore JSON; GET de dados 200 | SIGA mensal/diária; agentes mensal | CodCEG/IdeNucleoCEG ligam usina a NumCPFCNPJ do agente; depois CNPJ ao CREA | P1 |
| SET02 | ANEEL MMGD empreendimentos | ZIP/Parquet atual + dicionário; catálogo GET 200 | Diária | UF/município/tipo/potência; identificadores do titular precisam ser validados na edição vigente | P1 contexto/P2 identidade |
| SET03 | ANEEL pedidos de conexão MMGD | ZIP/Parquet por macrorregião; catálogo GET 200 | Mensal | Município/distribuidora/data/situação; é demanda de conexão, não ART ou instalador | P2 |
| SET04 | ANP revendedores de combustíveis e GLP | REST OpenAPI; GET amostral SP200 | Snapshot operacional; SLA de atualização a homologar | CNPJ/autorização/endereço/coordenadas/tancagem conforme modalidade | P1 |
| SET05 | ANP tancagem/instalações e agentes | CSV + dicionário oficial | Mensal no metadado de tancagem | CNPJ do operador + instalação/local/capacidade; não contratado da obra | P1/P2 |
| SET06 | ANATEL estações licenciadas e dispensadas | CSV publicado e glossário; documentação confirmada; arquivo não amostrado | Homologar metadado por recurso | CNPJ/CPF do prestador, estação/Fistel, município/coordenadas | P2 |
| SET07 | ANATEL prestadoras e VSAT em bloco | CSV/documentação oficial | VSAT coleta semestral; outros recursos a validar | CNPJ do prestador + UF/município, não empresa instaladora | P2 |
| SET08 | ANTT RNTRC transportadores | Catálogo CSV documentado; requisição local devolveu HTML “Request Rejected” com HTTP 200 | Validar metadado; boletim agregado mensal não prova frequência do arquivo nominal | CNPJ PJ; CPF anonimizado segundo dicionário; RNTRC/UF/município | P2, pertinência limitada |
| SET09 | ANTT investimentos rodoviários e projetos ferroviários | CSV/JSON + dicionários documentados; não homologado GET | Conforme conjunto; não assumir atualização diária | Concessionária/rodovia/projeto/período; CNPJ de executora pode faltar | P2 contexto |
| SET10 | SENATRAN instituições técnicas licenciadas (ITL) | CKAN JSON metadados 200; arquivos JSON anuais 2022–2024 | Anual; catálogo editado 2026 mas recurso mais recente listado 2024 | Identificação/endereço/UF da ITL; confirmar CNPJ no arquivo antes de relacionamento | P2 com alerta recência |
| SET11 | SENATRAN frota/RENAVAM estatístico | Arquivos CSV/XLSX de estatísticas; não consulta nominal de proprietários | Conforme arquivo, frequentemente mensal | Município/UF/tipo de veículo/data | P3 |
| SET12 | DETRAN-SP empresas reguladas/credenciadas | Portal oficial/serviços/edital; API bulk pública não identificada | A negociar | CNPJ+categoria+vigência+RT, se disponibilizados por acordo | Parceria prioritária |
| SET13 | IBAMA CTF/APP e RAPP | Catálogo CSV/JSON documentado; API local 403 | Validar por recurso, declarações RAPP anuais | Identificação PJ/atividade/município/ano conforme recurso | P2 |
| SET14 | CETESB licenciamento ambiental | Consulta pública por CNPJ; API aberta/bulk não confirmada | A negociar | CNPJ/estabelecimento/processo/licença/atividade/vigência | Parceria prioritária |
| SET15 | ANA dados geográficos, outorgas, SNISB | Portal geográfico oficial e arquivos/serviços por camada | Variável | Coordenadas/município/outorga/barragem; CNPJ não presumido | P2 |
| SET16 | ANA HidroWebService | API REST documentada, cadastro e autorização exigidos | Conforme estações/série; janelas por rota | Estação/data/bacia/coordenadas, ligação territorial | P3/contexto e projeto específico |
| SET17 | Ministério das Cidades SINISA/SNIS | Planilhas anuais + glossários oficiais | Anual; SINISA 2025 refere-se a 2024 | Município/prestador/ano; validar CNPJ por tabela | P2 |
| SET18 | ANM SIGMINE/SCM | ZIP/KMZ estadual; diretório oficial atualizado 29/10/2026 | Snapshots recorrentes; data do arquivo verificada, SLA a homologar | Processo/titular/poligonal/município; SIGMINE não garante CNPJ | P2 |
| SET19 | ANM SIGBM | Portal/dados abertos documentados; índice local 403 | Atualização pelo empreendedor e fiscalização; versão pública permite consulta atual | Barragem/empreendedor/município/classificação; validar identificador nominal | P2 |
| SET20 | MAPA SIPEAGRO | CSV por segmentos; página oficial aberta; API local 503 | Semanal no catálogo, atualizado 25/10/2026 | Registro do estabelecimento/atividade/local; CNPJ e RT dependem do recurso | P1/P2 |
| SET21 | INMETRO acreditação CADORG/RBC/RBLE | Consultas oficiais; API/bulk não confirmada | Situação e escopo vigentes, consultar recurso atual | Organização/escopo/acreditação/local; validar CNPJ estruturado | Parceria/P2 |
| SET22 | BNDES operações de financiamento | CSV + DataStore JSON; GET dados 200 | Mensal no catálogo | CNPJ cliente+contrato+município IBGE+CNAE+projeto+datas+valores | P1 |
| SET23 | FINEP financiamentos | Central de planilhas documentada; link atual consultado 404 | Carta de serviços descreve semanal; disponibilidade atual precisa ser restabelecida | Projeto/instituição/CNPJ se presente/UF/data/valor | P2, bloqueio de descoberta |
| SET24 | CNPq fomento à pesquisa e CT&I | Plano/base aberta e mapa documentados; extração não homologada | Conforme base | Instituição/área/projeto/UF/período; vínculo com CNPJ deve ser validado | P3 |
| SET25 | INPI BADEPI | Microdados anuais para download, não API confirmada | Anual; versão 12.0, 2000–2025 | Processo/IPC/titular/território conforme tabela; CNPJ pode ser restrito/ausente | P2 |
| SET26 | SEADE PIB e indicadores municipais | CKAN/arquivos XLSX; catálogo estadual GET 200 | PIB mensal/trimestral/anual; municipal anual e série separada | Código municipal/ano/setor | P1 contexto |
| SET27 | GeoSampa licenciamento/obras | WFS 2.0.0 GET 200 com GeoJSON, catálogo de camadas | Por camada; campo dt_atualizacao/dt_carga | Geometria,SQL/processo/CNAE/razão social conforme camada; **não CNPJ na amostra** | P1 piloto capital |

## Análise detalhada das oportunidades principais

### SET01 — ANEEL: empresas responsáveis por empreendimentos de geração

Fontes: [SIGA](https://dadosabertos.aneel.gov.br/dataset/siga-sistema-de-informacoes-de-geracao-da-aneel), [Agentes de geração](https://dadosabertos.aneel.gov.br/dataset/agentes-de-geracao-de-energia-eletrica). As requisições reais confirmaram uma distinção decisiva: o recurso SIGA consultado **não contém CNPJ em seu esquema**. Contém `CodCEG`, `IdeNucleoCEG`, `SigUFPrincipal`, fase, fonte, potência, coordenadas, municípios e datas. O recurso de agentes contém `NumCPFCNPJ`, nome do agente, `CodCEG` e `PctParticipacao`.

Modelo proposto: Empreendimento–CEG → participação do agente → pessoa jurídica/CNPJ → estabelecimento/registro CREA → vínculos técnicos/ART por período. Não juntar pela razão social nem presumir um proprietário por usina. Preservar percentuais e múltiplos proprietários; não somar a potência integral uma vez por agente. A UF principal da usina não substitui o conjunto de municípios atingidos.

Indicador útil: **Empreendimentos de geração em SP com titular identificado no CREA-SP**, segmentando fase construção/operacional, fonte e potência. Outra análise: empreendimentos que passam à construção sem vínculo documental localizado no recorte ART pesquisado. É evidência de necessidade de análise e qualidade da conciliação, não prova de ausência de obrigação cumprida.

GET de dados executados sem credenciais:

- `https://dadosabertos.aneel.gov.br/api/3/action/datastore_search?resource_id=11ec447d-698d-4ab8-977f-b424d5deee6a&limit=1`
- `https://dadosabertos.aneel.gov.br/api/3/action/datastore_search?resource_id=20ef769f-a072-489d-9df4-c834529f8a78&limit=1`

Resultado 200, JSON válido,25.045 linhas SIGA e 25.554 linhas agentes no momento do teste. Contagens nacionais de diagnóstico, não indicadores de São Paulo nem garantia de completude. Para produção, paginar, registrar competência, deduplicar CEG e realizar filtros territoriais conforme esquema.

### SET02/03 — ANEEL: expansão da geração distribuída

Fontes: [Empreendimentos MMGD](https://dadosabertos.aneel.gov.br/dataset/relacao-de-empreendimentos-de-geracao-distribuida), [Pedidos de conexões MMGD](https://dadosabertos.aneel.gov.br/dataset/atendimento-mmgd-mini-e-micro-geracao-distribuida). O catálogo atual disponibiliza **ZIP e Parquet**, incluindo recursos técnicos por tipo de geração; não planejar o pipeline sobre URLs de antigos CSV encontrados em tutoriais. Frequências publicadas: empreendimentos diária; pedidos mensal. Houve migração SISGD→MMGD em 2025, com interrupção temporária indicada na página oficial de geração: requer checagem de ruptura da série.

Uso: capacidade instalada e novas conexões por município, comparação com ARTs de sistemas fotovoltaicos e empresas/RTs com atribuição pertinente. **Titular da unidade consumidora não é instalador**, distribuidora não é executora, potência não é faturamento. Somente cruzar nominalmente a pessoa que o dado de fato identifica. A aproximação territorial/temporal entre nova conexão e ART é sinal probabilístico, não ponte documental de obra confirmada.

### SET04/05 — ANP: instalações e revendas com atividade técnica concreta

Fontes: [API e painel de revenda](https://www.gov.br/anp/pt-br/centrais-de-conteudo/paineis-dinamicos-da-anp/paineis-dinamicos-do-abastecimento/painel-dinamico-de-relatorio-de-revenda), [Manual oficial](https://www.gov.br/anp/pt-br/centrais-de-conteudo/paineis-dinamicos-da-anp/paineis-dinamicos-do-abastecimento/api-revendedores-manual-usuario.pdf), [Swagger](https://revendedoresapi.anp.gov.br/swagger/index.html), [Tancagem](https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/tancagem-do-abastecimento-nacional-de-combustiveis).

O OpenAPI retornou 200 e expõe `/v1/combustivel` e `/v1/glp`; parâmetros `cnpj`, `uf`, `municipio`, `numeropagina`. GET 200 com `uf=SP&municipio=SAO%20PAULO&numeropagina=1` confirmado, dados de CNPJ/autorização/publicação/endereço/distribuidora/classe/status. Manual declara até 5.000 registros por página. Os postos incluem informações de tancagem/produtos/coordenadas quando disponíveis. Projetar extração paginada com controle do envelope `searchPageFilter`, não supor primeira página completa.

Indicador: **Instalações autorizadas em SP com cobertura cadastral e técnica localizada no CREA-SP**. Exemplo de recorte útil: novas autorizações ou aumento de armazenamento, em vez de reapresentar o cadastro inteiro a cada mês. Tancagem pode apontar demanda por mecânica, química, civil e segurança conforme atividade/atribuições; nem toda revenda implica automaticamente o mesmo regime de registro. Autorização ANP, registro CREA, ART e licença ambiental são atos diferentes. Interdição ANP não equivale a infração perante o CREA.

Para plantas de armazenamento/refino e distribuidores, o dado identifica operador/titular. O contratado do projeto/manutenção precisa vir de outra evidência, como contrato/ART explícitos. Conservar identificação da instalação e data; um CNPJ pode operar várias instalações e uma instalação pode mudar de operador.

### SET06/07 — ANATEL: estações, outorgas e prestadores

Fontes: [Dados abertos](https://www.gov.br/anatel/pt-br/dados/dados-abertos), [Glossário de estações](https://www.anatel.gov.br/dadosabertos/PDA/Outorga/EstacoesLicenciadas/Glossario_e_Metadados.pdf), [VSAT](https://www.gov.br/anatel/pt-br/assuntos/noticias/anatel-publica-dados-abertos-sobre-estacoes-terrenas-em-bloco), [Prestadoras com dispensa](https://www.gov.br/anatel/pt-br/assuntos/noticias/anatel-disponibiliza-nova-base-de-dados).

Documentação comprova identificador do prestador, município e características/local da estação em conjuntos específicos. CPF de pessoa natural é anonimizado em recursos publicados, e CNPJ PJ tem papel diferente. Homologar recursos/edição atual e licença antes da rotina; o arquivo não foi amostrado nesta pesquisa.

Indicadores: **Estações implantadas/licenciadas em SP por modalidade e cobertura de evidências técnicas**, e **prestadoras de telecomunicações por município versus presença no CREA-SP**. Não inferir a executora a partir do prestador ou tower company. Compartilhamento de infraestrutura exige distinguir estação, torre, licença e instalação física; contagem de estações não equivale à contagem de obras/ARTs.

### SET08/09 — ANTT: uso seletivo

Fontes: [RNTRC](https://dados.antt.gov.br/dataset/rntrc), [Dicionário RNTRC](https://dados.antt.gov.br/en/dataset/b4a055d1-97a2-46f1-9461-cb17fbc6b6b3/resource/644f044e-9c9d-4a12-b741-da65c00e67a9/download/dicionario_dados_rntrc.pdf), [Investimentos](https://dados.antt.gov.br/dataset/investimentos), [Portal do desenvolvedor](https://portaldodesenvolvedor.antt.gov.br/).

RNTRC identifica transportadores, categoria e território; dicionário prevê CPF anonimizado e CNPJ PJ. Não é uma lista de empresas de engenharia: priorizar operadores especializados/atividades técnicas apenas quando houver evidência adicional pertinente. Frota de caminhões e transportador ativo não provam serviço sujeito ao CREA. O portal do desenvolvedor atende integrações com concessionárias/parceiros; não presumir acesso anônimo a todas as APIs.

Investimentos rodoviários e projetos autorizados ferroviários são melhores para mapear demanda e corredores de obras, desde que separem valor planejado, autorizado e realizado. O nome da concessionária não prova o CNPJ da empreiteira. Para localizar executora, buscar ponte contrato/PNCP ou parceria.

Teste técnico: `api/3/action/package_search?q=rntrc&rows=5` devolveuHTTP 200 comHTML de rejeição, nãoJSON; consulta de página também apresentou rejeição/time-out. Marcar como **documentado, acesso de dados não homologado**, não “API 200 operacional”.

### SET10/11/12/21 — SENATRAN, DETRAN-SP e INMETRO: engenharia veicular

Fontes: [Catálogo ITL](https://dados.transportes.gov.br/dataset/instituicoes-tecnicas-licenciadas), [Portal regulados DETRAN-SP](https://credenciados.detran.sp.gov.br/agentes-regulados), [Desmontagem DETRAN-SP](https://credenciados.detran.sp.gov.br/classe-desmontagem), [Editais](https://credenciados.detran.sp.gov.br/editais-de-credenciamento), [Organismos acreditados INMETRO](https://www.gov.br/inmetro/pt-br/assuntos/acreditacao-reconhecimento-bpl/organismos-acreditados), [CADORG](https://www.gov.br/inmetro/pt-br/centrais-de-conteudo/sistemas/cadorg/cadastro-de-organismos-acreditados).

O catálogo ITL retornouJSON200, periodicidade anual e recursos2022,2023,2024, embora o metadado tenha edição de2026. **Data de edição do catálogo não é competência dos registros.** O piloto deve verificar se existe base nominal atual antes de chamar a lista histórica de “ITLs vigentes”.

DETRAN-SP publica categorias como empresas de desmontagem, reciclagem, vistoria, regravaçãoVIN, estampagem e auditoria. A página de desmontagem explicita RT com registro no CREA conforme edital 5/2024. Essa é oportunidade de parceria mais diretamente aderente que frota genérica. A página de credenciamento não é API: solicitar ao DETRAN arquivo/API de CNPJ, categoria, estabelecimento, vigência, situação e identificador de RT, com base legal e campos autorizados. **ECV de identificação veicular não deve ser tratada como equivalente a ITL de inspeção de segurança veicular.** Validar também cada categoria sob a norma aplicável; exigência de uma categoria não se transfere às demais.

INMETRO oferece organismos de inspeção e laboratórios acreditados com escopos. Uma organização pode ter escopos parcialmente suspensos/cancelados; status do certificado isolado não basta. Planejar conector ou parceria para escopo/vigência/CNPJ/local, sem inventar endpointREST.

Indicador: **Cobertura técnica dos estabelecimentos regulados de engenharia veicular em SP**. Cruzar CNPJ exato e vigência de credenciamento com registro CREA e vínculo RT; quando houver dados de emissões de certificados/laudos, preservar sujeito/objeto/data e não equiparar total de certificados a total de ARTs.

Frota SENATRAN/DETRAN é contexto agregado para mercado de manutenção/inspeção, sem permitir identificar proprietário PJ de cada veículo. Acesso nominal RENAVAM/Renach não é uma API pública anônima.

### SET13/14 — IBAMA e CETESB: indústria e ambiente

Fontes: [CTF/APP](https://www.gov.br/ibama/pt-br/servicos/cadastros/ctf/ctf-app/ctf-app), [Catálogo IBAMA](https://dadosabertos.ibama.gov.br/), [Unidade poluidora](https://dadosabertos.ibama.gov.br/dataset/unidade-poluidora), [Consulta CETESB](https://sistemasinter01.cetesb.sp.gov.br/licenciamento/princ.php), [Portal licenciamento](https://licenciamento.cetesb.sp.gov.br/).

CTF/APP e declarações RAPP permitem recortes de atividade declarada, instalação, município e período para indústria, resíduos, emissões e outros temas. O CTF não é licença e não substitui registro CREA. RecursosRAPP correspondem a formulários e universos específicos: uma empresa pode repetir por ano, categoria, atividade e formulário. Evitar somar linhas como empresas distintas. API IBAMA retornou403 nesta sessão; documentação de recursosCSV/JSON encontrada, pipeline precisa homologação.

CETESB: há consulta por CNPJ/processo, mas não foi confirmada API aberta ou exportação massiva autorizada. Busca no CKAN estadual porCETESB retornou0; **isso não prova inexistência de dados na instituição**. Melhor parceria para novas licenças, renovações/alterações, CNPJ do estabelecimento, atividade CNAE e local. Priorizar eventos de instalação/ampliação e relacionar documentos técnicos quando permitidos. Licença emitida ao empreendedor não identifica automaticamente consultoria ou RT.

Indicador: **Novos empreendimentos licenciados em SP e sua presença técnica no CREA-SP**, com comparação temporal e territorial; a inexistência de ART localizada é lacuna de conciliação até validação.

### SET15/16/17/19 — Água, saneamento e barragens

Fontes: [Portal ANA](https://dadosabertos.ana.gov.br/), [Dados abertos ANA](https://www.gov.br/ana/pt-br/acesso-a-informacao/dados-abertos), [ManualHidroWebService](https://www.gov.br/ana/pt-br/assuntos/monitoramento-e-eventos-criticos/monitoramento-hidrologico/orientacoes-manuais/manuais/manual-hidrowebservice_publica.pdf), [SINISA 2025](https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento/sinisa/resultados-sinisa/resultados-sinisa-2025), [ANM bases](https://www.gov.br/anm/pt-br/acesso-a-informacao/dados-abertos/bases-de-dados), [SIGBM público](https://www.gov.br/anm/pt-br/assuntos/acesso-a-sistemas/sistema-integrado-de-gestao-de-barragens-de-mineracao-sigbm-versao-publica).

ANA dispõe camadas territoriais/outorgas/SNISB; homologar serviço ArcGIS/arquivo por camada e as informações pessoais efetivamente abertas. HidroWebService éAPI documentada, porém exige cadastro e autorização; manual orienta solicitação, não foi enviado nenhum contato ou pedido em nome do usuário. Chave estação+tempo é ambiental, não empresarial. Séries hidrológicas ajudam a contextualizar projetos de barragens, drenagem e segurança hídrica, mas têm prioridade menor que dados empresariais diretos.

SINISA está sob o **Ministério das Cidades**, não assumir que todos os indicadores de saneamento sejam uma API ANA. SINISA 2025 tem referência 2024 e planilhas/glossários nos cinco módulos: gestão municipal, água, esgoto, resíduos e águas pluviais. Comparar cobertura de serviço/investimento/carteira de obras com empresas/ARTs municipais; não tratar déficit de saneamento como demanda contratada ou atribuir todo investimento ao CREA.

SIGBM fornece barragens e classificações; não confundir classificação de risco e dano potencial associado com autuação ou infração. Histórico de mudança de empreendedor, RT e declaração de estabilidade pode precisar de acordo/campos restritos. GET dos índicesSCM/SIGBM foi403; portais públicos estão documentados, mas nenhum acesso privilegiado foi obtido.

### SET18 — ANM: mineração territorial e atividades técnicas

Fontes: [Diretório SIGMINE](https://dadosabertos.anm.gov.br/SIGMINE/PROCESSOS_MINERARIOS/), [Bases de dados](https://www.gov.br/anm/pt-br/acesso-a-informacao/dados-abertos/bases-de-dados), [Mudança de endereços](https://www.gov.br/anm/pt-br/assuntos/noticias/mudanca-no-endereco-dos-dados-abertos-da-agencia).

O diretório oficial exibia `SP.zip`(9873319 bytes) e `SP.kmz`(11101889 bytes), com datas29/10/2026. Usar domínio novo `dadosabertos.anm.gov.br`; não fixar o antigo `app.anm.gov.br/dadosabertos` como única origem. Geometrias, processo e fase permitem localizar lavra/pesquisa e evolução territorial. **Processo minerário não é estabelecimento nem empresa; área requerida não é atividade de lavra em execução.** O SIGMINE pode trazer titular por nome sem CNPJ. Identificação determinística requer cadastro mineiro/identificador estruturado válido; razão social só gera sugestão para revisão.

Indicador: **Processos minerários em SP com atividade técnica e vínculos identificados no CREA-SP**, separado por fase, município e empreendedor com correspondência validada.

### SET20 — MAPA: indústria agropecuária e agronomia empresarial

Fonte: [SIPEAGRO](https://dados.agricultura.gov.br/dataset/sipeagro). A página oficial confirmaCSV de fertilizantes, qualidade vegetal, alimentação animal, vinhos/bebidas, produtos veterinários, aviação agrícola etc., com frequência semanal e atualização 25/10/2026. O catálogoAPI local devolveu503; a página foi lida no navegador de pesquisa. Não presumir que todos os recursos tenham CNPJ+RT ou mesmo a mesma granularidade (produto vs estabelecimento vs autorização).

Indicador: **Estabelecimentos agroindustriais em SP e sua cobertura técnica no CREA-SP**. Fertilizantes, armazenagem, aviação agrícola e processos industriais são recortes de interesse, conforme atribuições de agronomia/engenharias e limites de competência. Comparar registro MAPA vigente e CNPJ do estabelecimento, e só depois vínculo técnico CREA; produtos registrados não são contagem de fábricas. Respeitar competências de outros conselhos profissionais.

### SET22/23/24/25 — Investimentos e inovação

Fontes: [BNDES operações](https://dadosabertos.bndes.gov.br/dataset/operacoes-financiamento), [FINEP carta de serviços](https://www.finep.gov.br/carta-servicos), [CNPq dados](https://www.gov.br/cnpq/pt-br/acesso-a-informacao/dados-abertos/consulta-de-dados), [INPIBADEPI](https://www.gov.br/inpi/pt-br/inpi-data/dados-e-series-temporais/badepi), [INPIroadmap](https://www.gov.br/inpi/pt-br/projetos-estrategicos/portal-de-servicos).

BNDES é uma das fontes mais concretas: GET 200 do DataStore (`resource_id=6 f56b78c-510 f-44 b6-8274-78 a5b7e931f4&limit=1`),23896 registros nacionais no momento da consulta, comcampos `cnpj`, `descricao_do_projeto`, `municipio_codigo`, `subsetor_cnae_codigo`, `numero_do_contrato`, `data_da_contratacao`, `valor_contratado_reais`, `valor_desembolsado_reais`, `situacao_do_contrato`. Atualização mensal no catálogo. Indicador: **Investimento financiado em setores de engenharia em SP e presença das empresas no CREA-SP**. Cliente/tomador não é fornecedor/empreiteiro. Financiamento contratado não é execução integral, e desembolso não é faturamento da engenharia. Verificar se UF/município é local do investimento ou endereço do cliente conforme modalidade; não comparar cegamente todos os contratos.

FINEP: carta de serviços descreve planilhas semanais de operações desde 2002; a central de downloads encontrada retornou404 nesta sessão. Classificar como oportunidade documentada, **extração ainda não homologada**, encontrar URLvigente e dicionário antes do piloto. CNPq: dados de fomento/projetos por área/instituição são contexto de inovação; não assumirAPI individual Lattes ou compartilhar currículos como vínculo trabalhista.

INPI: BADEPI 12.0 publicada com 2000–2025, atualização anual e limitações LGPD. Processo/IPC/território/titular podem indicar empresas inovadoras e vocação tecnológica regional. No roadmap consultado, a API JSON/XMLST.96 consta emversão 3 como previsão para3º trimestre de 2026, não foi confirmado endpoint operacional. **Não apresentar a API INPI como pronta só porque aparece no roadmap.** Para cruzar com CNPJ, validar campos efetivamente liberados na tabela; depósito de patente não significa exercício profissional nem produto aprovado/comercializado. Indicador: **Atividade tecnológica empresarial em SP por campo técnico**, com titularPJ e correspondência comprovada quando possível; sem CNPJ, permanecer agregado ou usar candidatos para revisão.

### SET26/27 — SEADE e GeoSampa

Fontes: [CatálogoPIBSP](https://dadosabertos.sp.gov.br/dataset/pib), [RepositórioSEADE](https://repositorio.seade.gov.br/), [PIB municipal 2022+](https://repositorio.seade.gov.br/dataset/pib-municipal-a-partir-2022), [GeoSampa oficial](https://novogeosampa.prefeitura.sp.gov.br/), [Tutorial institucional](https://geoinfo-smdu.github.io/tutorial-geosampa-internet-2.0/), [Inovação de downloads](https://prefeitura.sp.gov.br/web/licenciamento/w/geosampa-ganha-novas-ferramentas-para-agilizar-acesso-a-dados-da-plataforma).

SEADE oferece PIB anual/regional/trimestral/mensal e municipal, com séries municipais separadas 2002–2021 e 2022+. Levar em conta metodologia/revisões antes de encadear. O catálogo estadual pode apontar a **página do dataset** do SEADE como “recurso XLSX”: o conector precisa resolver o arquivo real no órgão, não tentar interpretar HTML como Excel. Valor adicionado, população, emprego e estabelecimentos são dimensões para **intensidade de atividade técnica por base econômica municipal**, evitando ranking absoluto que sempre privilegie a capital. Não inferir causalidade da gestão do CREA a partir do PIB.

GeoSampa é **só município de São Paulo**, não todo o estado. O WFS 2.0.0 respondeu 200 XML em GetCapabilities e GeoJSON 200 em GetFeature. Duas camadas foram amostradas:

- `geoportal:controle_uso_via_publica_geoinfra`:1902 feições no teste; propriedades `tx_tipo_obra`, `tx_status_obra`, `nm_permissionaria`, `dt_carga` e identificadores. Não havia CNPJ na amostra/esquema de propriedades.
- `geoportal:licenca_industrial`:2618 feições no teste; classificação, seis campos CNAE, processo, datas de emissão/validade, razão social, endereço, SQL e áreas. Não havia CNPJ nas propriedades retornadas.

A camada de licença industrial é municipal, não deve ser rotulada “base CETESB”. Geoinfra identifica permissionária, não necessariamente executora. O tutorial cita integração SLC-e para alvarás, mas a camada WFS de todos os alvarás não foi identificada na amostra de GetCapabilities; não prometer CNPJ/RT de todos os alvarás sem examinar outra exportação/acordo. Endereço/SQL/geometria podem construir vínculo territorial com ART, sujeito a normalização, duplicidade, mudança de parcela e validação humana.

Indicador: **Obras e licenças na capital com evidência técnica relacionada**, distinguindo correspondência documental de proximidade territorial. Piloto particularmente útil por ser pequeno, concreto e verificável; ampliação para645municípios exige catalogar cada origem ou parceria estadual, sem extrapolar GeoSampa.

## Rotina proposta para estas fontes

1. Resolver catálogo/recurso vigente, formato real, licença e competência. Registrar hash e dicionário da edição.
2. Ingerir em camada bruta com snapshot, URL, data de captura e data de referência; consultas autênticas de API apenas GET e sem upload de dados internos.
3. Padronizar CNPJ como string e contemplar CNPJ alfanumérico; município por IBGE de 7 dígitos, datas e unidades. Separar identificação de PJ e PF; aplicar mascaramento quando previsto.
4. Modelar instalação/empreendimento/credenciamento/projeto como entidades próprias; criar pontes com empresa e períodos. Proibir relacionamento direto de todo evento setorial com ART apenaspor CNPJ.
5. Reconciliar exato CNPJ/identificador de empreendimento primeiro; usar nome/endereço/geografia somente como sugestão versionada e revisável.
6. Publicar indicadores no Power BI com denominador/unidade/recorte SP eárea responsável pela validação. Para os casos sem identificador, apresentar contexto agregado.
7. Usar coleta agendada externa para arquivos grandes/Parquet/ZIP e DataStore paginado; carregar SQL Server/Db2/modelo curado via Gateway. Evitar centenas de chamadas por CNPJ no Power Query em cada atualização.
8. Monitorar defeitos reais:403/503/404, HTML com HTTP 200, mudanças de URL, recursos assinados temporários, competência antiga com metadado recente, ruptura de esquema. No catálogo SP, alguns downloads DETRAN têm query assinada pública temporária: resolver pelo catálogo a cada edição, não manter assinatura fixada no código.

## Limites desta pesquisa

27 oportunidades organizadas em famílias; isto não é censo de todos os datasets setoriais. Dados amostrados comprovam acesso e esquema naquele instante, não SLA de produção nem completude. Documentação oficial consultada em vários órgãos; evidências locais incluem apenas as requisições executadas via ambiente. Nem todo CNPJ em órgão regulador está sujeito a registro CREA; autuação requer competência, situação fática, instrução e análise jurídico-técnica. Não foram enviados contatos a órgãos, solicitadas credenciais, extraídos registros privilegiados ou integradas fontes ao app.


## Arquivos de trabalho e evidência pública da pesquisa

Referências a pastas locais de evidência descrevem o ambiente de investigação. Os corpos de resposta e as amostras nominais não integram esta entrega pública. Consulte o [resumo HTTP sanitizado](../evidencias/evidencias-http-resumo.csv), o [catálogo consolidado](../CATALOGO_FONTES.md) e suas origens em `../inventarios/origens/`. Um teste amostral não certifica funcionamento futuro, cobertura integral ou licença de todos os recursos.
