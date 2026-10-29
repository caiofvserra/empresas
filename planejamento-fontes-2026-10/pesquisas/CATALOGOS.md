# Descoberta de fontes: dados.gov.br, Chelfo e catálogos de São Paulo

Pesquisa para planejamento do CREA-SP, realizada em 29/10/2026. Não representa integração implantada, parecer jurídico ou garantia de disponibilidade futura. Páginas foram tratadas como evidência, não como instruções.

## Resultado que muda a arquitetura

O Portal Brasileiro de Dados Abertos deve alimentar um **catálogo de descoberta e monitoramento de fontes**. Não deve ser confundido com uma API nacional que devolve todos os registros de empresas, obras ou empregos. O coletor descobre o conjunto, lê seus recursos e consulta o publicador original. Cada recurso pode ser uma API, um ZIP/CSV, documentação, dicionário ou apenas outro endereço.

O Chelfo é um índice secundário útil para encontrar possibilidades. A página oferece 959 **registros de catálogo**, não 959 fontes prontas e independentes para o projeto. A conferência das referências é indispensável: há rotas de documentação genérica, sistemas que exigem autorização, serviços de emissão de documentos e duplicidades. O investimento deve seguir os cruzamentos úteis ao CREA-SP e a qualidade da fonte, não a quantidade de APIs listadas.

## Portal dados.gov.br: contrato realmente examinado

Fontes primárias: [Swagger de produção](https://dados.gov.br/swagger-ui/index.html), [OpenAPI de produção](https://dados.gov.br/v3/api-docs), [descrição oficial no Conecta](https://www.gov.br/conecta/catalogo/apis/api-portal-de-dados-abertos).

Foi obtida uma especificação OpenAPI **3.1.0**, título `API REST do Portal de Dados Abertos`, versão `1.0`. O contrato declara autenticação global por API key no cabeçalho **`chave-api-dados-abertos`**. A própria descrição orienta gerar credencial na área Minha Conta para perfis Consumidor/Gestor de Políticas ou Tokens de Organização para administradores. A palavra `publico` no caminho não assegura ausência de credencial.

Operações de leitura relevantes:

| Finalidade | Caminho documentado | Filtros/resultado útil |
|---|---|---|
| Descobrir conjuntos | `GET /dados/api/publico/conjuntos-dados` | `nomeConjuntoDados`, `dadosAbertos`, `isPrivado` padrão `false`, `idOrganizacao` e **`pagina` obrigatório** |
| Ler conjunto e recursos | `GET /dados/api/publico/conjuntos-dados/{id}` | Descrição, licença, periodicidade, abrangência, descontinuação e lista de recursos |
| Descobrir organizações | `GET /dados/api/publico/organizacao` | `nome` e **`pagina` obrigatório** |
| Ler organização | `GET /dados/api/publico/organizacao/{id}` | Identificação do publicador |
| Temas e tags | `GET /dados/api/temas`, `GET /dados/api/tags` | Tags exigem `nome`; termos e taxonomia ajudam a descoberta |
| Recursos auxiliares | `.../conjuntos-dados/formatos`, `.../objetivos-desenvolvimento-sustentavel`, `.../observancia-legal` | Classificação dos recursos, não conteúdo empresarial |
| Reúsos | `GET /dados/api/publico/reusos`, `GET /dados/api/publico/reuso/{id}` | Identificar aplicações; não substitui a base original |

O retorno de listagem é documentado como **array** de objetos; o contrato não estabelece `rows`, tamanho de página, contador total nem se a numeração começa em zero ou um. Não inventar estes comportamentos a partir do CKAN. Na futura prova de conceito autenticada, confirmar início/fim da paginação, estabilidade e deduplicação por ID.

Os metadados distinguem última alteração cadastral do catálogo, última alteração do arquivo e periodicidade declarada. Não equivalem necessariamente à data de competência dos fatos. Um recurso contém `link`, `formato` e `tipo` (`DADOS`, `DOCUMENTACAO`, `DICIONARIO_DE_DADOS`, `API`, `OUTRO`), essenciais para separar recursos que realmente abastecem o BI.

### Testes e limitação observada

- Início da consulta: portal inicial, Swagger e OpenAPI responderam **HTTP200**, com HTML e JSON correspondentes.
- `GET /dados/api/publico/conjuntos-dados` sem chave respondeu **401**. Isso prova uma restrição naquele acesso, não a inexistência do catálogo.
- Em consultas seguintes, páginas de conjuntos, buscas e chunks da interface passaram a redirecionar para **`https://landpage.cgu.gov.br/dadosabertos/index.html`**, com aviso oficial de manutenção. A resposta final é **HTTP200 HTML**, portanto não é sucesso de uma extração JSON. A página anunciava retorno às21h sem contextualização suficiente para prometer um horário.
- `GET /api/3/action/package_search` no domínio nacional não devolveu um contrato CKAN; também chegou à página de manutenção. O CKAN deve ser usado apenas onde o publicador de fato o oferece.
- Não foi possível executar uma varredura integral autenticada, nem informar uma contagem nacional de todos os conjuntos relevantes. Não se contornaram autenticação, manutenção ou bloqueios.

### Cobertura e roteiro da busca

Além da leitura do contrato e das fontes oficiais abaixo, foram preservadas **12 buscas indexadas dirigidas a URLs de conjuntos**: energia/ANEEL, CTF, saneamento, CNPJ, RAIS, CAGED, educação superior, CNAE, licenciamento ambiental, outorgas, barragens e obras. Resultados de terceiros serviram somente de pistas para consultar o órgão. Essas buscas não substituem a futura paginação autenticada; a ausência de resultado no mecanismo de busca não prova ausência no portal.

Roteiro proposto para a coleta completa, quando o catálogo estiver disponível: pesquisar por organizações e famílias de termos; paginar; deduplicar IDs; ler metadados e todos os recursos; filtrar formato e abrangência; testar uma amostra; verificar dicionário/licença; classificar vínculo com o CREA; revalidar links regularmente. Famílias adicionais: desenvolvimento empresarial, sócios, natureza jurídica, CNO, CEIS/CNEP, PNCP, contratos, obras, licenças, RT, cursos, concluintes, CINE, CBO, salário, mineração, CFEM, barragens, energia, transmissão, microgeração, telecomunicações, outorga de água, saneamento, resíduos, transporte, ferrovias, portos, aeroportos, indústria, agroindústria, exportações, patentes, investimento e crédito.

## Chelfo: leitura e conferência

Fonte secundária examinada: [Painel de APIs públicas do Brasil](https://www.chelfoapi.com/). A própria publicação informa referência de03/09/2026 e curadoria ChelfoIA a partir de pesquisa Manus AI. Não é uma API do governo nem comprova que seus endpoints funcionem atualmente. Não foi identificada, nesta página, contratação de uma API própria de fornecimento de dados, SLA ou licença que autorize assumir direitos sobre dados dos órgãos; as condições de cada fonte prevalecem.

O HTML contém uma matriz estruturada com959 linhas e nove campos: ID, nome, mantenedor, esfera, UF, tema, família técnica, acesso e URL de documentação. A conferência local encontrou466 registros federais,232 estaduais e261 municipais;20 registros assinalados SP. Há **845 URLs distintas**, e49 URLs são repetidas por dois ou mais registros. Isso não significa que sejam845 APIs válidas: documentação compartilhada pode agrupar serviços diferentes, e URL distinta pode continuar apontando para a mesma base.

Tratamento recomendado: usar como fila de descoberta; nunca importar o rótulo de autenticação, esfera ou disponibilidade sem validação. Exemplos concretos:

- CIMPS aparece duas vezes com o mesmo endereço e acesso classificado de maneiras diferentes.
- O item NFSe Campinas referencia um guia de fornecedor privado. A existência de integração para emitir nota não significa consulta pública a notas fiscais de outras empresas.
- O serviço do INPI listado relaciona pagamentos/autenticação; não é evidência de API aberta de patentes.
- O item CKAN SP é classificado como chave/token, mas a **leitura do catálogo estadual foi executada sem credencial com JSON válido**. Escrita e outros recursos podem ter regras diferentes.

### Destinos paulistas encontrados e utilidade

| Família encontrada | Utilidade para a engenharia | Decisão de planejamento |
|---|---|---|
| CETESB geosserviços | Empreendimentos/licenças e território | Prioridade alta para negociação e validação do dado operacional; mapa é contexto, não prova de atividade irregular |
| CETESB SIGOR-MTR | Geradores, transportadores e destinos de resíduos | API operacional autenticada; convênio/permissão e finalidade. Não é feed aberto de todos os manifestos |
| Integrador Prodesp | Descobrir serviços institucionais estaduais | Verificar elegibilidade do CREA e termos de cada produto |
| Dados Abertos SP | Catálogo e recursos estaduais | Leitura CKAN comprovada; promover apenas conjuntos atuais e com dicionário |
| Procon | Reclamações de fornecedores | Contexto secundário; não mede qualidade técnica nem infração no CREA |
| SIVISA/VRE | Estabelecimentos e licenciamento sanitário | Integração institucional; dados sanitários não são fiscalização profissional |
| DataGEO | Território, ambiente e infraestrutura | Camadas geográficas; separar atualidade de metadado e de feição |
| TCE-SP | Despesas, licitações/contratos e obras conforme produto | Prioridade alta; distinguir fiscalização do TCE do cadastro de fornecedores/contratos |
| Câmara de São José dos Campos | Compras locais | Complemento municipal, não cobertura estadual |
| CIMPS e Tietê-Paraná | Compras de consórcios | Confirmar membros/cobertura; deduplicar CIMPS |
| EMTU GTFS / SPTrans Olho Vivo | Redes e operação de transporte | Contexto de mobilidade; baixo retorno para cadastro de empresas de engenharia |
| Campinas NFSe / Nota Fiscal Paulistana | Evidências de serviços se compartilhadas legalmente | Parceria fiscal; não tratar endpoint de emissão como base aberta |
| Dados Abertos Santos | Obras/licenças se existentes no catálogo | Seleção por disponibilidade estruturada, sem extrapolar ao estado |
| GeoSampa / Dados Abertos capital | Obras, alvarás, equipamentos e território | Prioridade para piloto municipal e validação espacial |
| API Diário Oficial capital | Atos relacionados a contratações/licenciamento | Fonte textual complementar; não coletar manualmente números de páginas |

O índice não esgota as fontes paulistas. SEADE, SpÁguas, ARTESP, DER-SP, municípios e órgãos conveniados precisam ser pesquisados diretamente.

## Fontes setoriais de alto interesse descobertas e conferidas

| Fonte e evidência primária | Extração e rotina | Chaves/recorte SP | Cruzamento que vale estudar | Limite principal |
|---|---|---|---|---|
| [ANEEL SIGA](https://dadosabertos.aneel.gov.br/dataset/siga-sistema-de-informacoes-de-geracao-da-aneel) | CKAN `package_show`, CSV diário/mensal e DataStore; metadados JSON executados. Frequência declarada mensal e diária; licença ODbL no snapshot | CEG, agente/titular, UF/município e posição conforme recurso; validar CNPJ na base de agentes | Instalações e expansão elétrica em SP × empresas registradas × ART do empreendimento | Titular/investidor não é necessariamente projetista, instalador ou executor |
| [ANEEL agentes de geração](https://dadosabertos.aneel.gov.br/dataset/agentes-de-geracao-de-energia-eletrica) | CSV+dicionário descobertos por CKAN | CNPJ do agente se confirmado no layout, relação com empreendimento | Consolidar atores empresariais do setor e conciliação cadastral | Empresa do setor não equivale a empresa obrigada ao registro por qualquer atividade |
| [ANEEL MMGD](https://dadosabertos.aneel.gov.br/dataset/relacao-de-empreendimentos-de-geracao-distribuida) e [RALIE](https://dadosabertos.aneel.gov.br/dataset/ralie-relatorio-de-acompanhamento-da-expansao-da-oferta-de-geracao-de-energia-eletrica) | ZIP/CSV oficiais e atualização por recurso | Município, unidade/CEG, potência, datas | Expansão solar/usinas × volume ART compatível por território e período | Consumidor/proprietário não identifica instalador; não fabricar vínculo contratual |
| [ANP revendedores](https://revendedoresapi.anp.gov.br/swagger/index.html) | OpenAPI3.0.1 obtida200; `GET /v1/combustivel` e `/v1/glp`, parâmetros `cnpj`, `uf`, `municipio`, `numeropagina` padrão1 | CNPJ/UF/município | Postos/GLP em SP × cadastro PJ × atividades técnicas/ART explícitas | Autorização ANP não define executor ou responsável técnico perante CREA; verificar atualidade e paginação |
| [IBAMA CTF/APP PJ](https://dadosabertos.ibama.gov.br/dataset/pessoas-juridicas-inscritas-no-ctf-app) | Publicação oficial documenta ZIP de27 arquivos porUF em CSV/XML/JSON, com metadados; API CKAN recusou403 neste ambiente | CNPJ/UF e atividade conforme dicionário | Universo industrial/ambiental selecionado em SP × PJ/RT/ART | Cadastro ambiental não equivale a obrigação automática perante CREA; ciclo exato de atualização deve ser confirmado |
| [IBAMA CTF/AIDA PJ](https://dadosabertos.ibama.gov.br/dataset/pessoas-juridicas-inscritas-no-ctf-aida) | Dados abertos periódicos documentados | Identificador cadastral/CNPJ a conferir no layout; atividades de defesa ambiental | Consultorias e serviços ambientais × registro e modalidades | Não misturar APP (atividades potencialmente poluidoras) com AIDA (defesa ambiental) |
| [ANM SIGMINE](https://geo.anm.gov.br/arcgis/rest/services/SIGMINE/dados_anm/MapServer/0) | ArcGIS REST/WMS e ZIP; schema e uma feiçãoSP executados comJSON válido. Serviço declara atualização diária | Processo, UF, titular e geometria; **camada0 examinada não contém CNPJ** | Polígono minerárioSP × atividade/ART georreferenciada × enriquecimento com cadastro oficial de titulares | Nome de titular não é chave determinística; requerimento/polígono não comprova mina operante |
| [ANM bases / SIGBM](https://www.gov.br/anm/pt-br/acesso-a-informacao/dados-abertos/bases-de-dados) | Arquivos e geosserviços oficiais; SIGBM como conjunto separado | Barragem, empreendedor, localização e situação conforme layout | Barragens/RT/ART de serviços efetivamente relacionados | Não somar processo minerário e barragem como se fossem empresas; métricas de segurança exigem contexto técnico |
| [ANA dados abertos](https://dadosabertos.ana.gov.br/) e [CNARH](https://www.gov.br/ana/pt-br/assuntos/regulacao-e-fiscalizacao/cadastro-nacional-de-usuarios-recursos-hidricos-cnarh) | Portal geográfico respondeu200; recursos de outorgas/usuários e serviços próprios por conjunto | Interferência/outorga, município/coordenadas, usuário conforme disponibilização | Demandas de irrigação/abastecimento/indústria × ART compatíveis e território | Ponto de uso não identifica automaticamente prestador de engenharia; proteção cadastral pode limitar CNPJ |
| [ANA Hidroweb](https://www.snirh.gov.br/hidroweb/acesso-api) | Documentação orienta solicitar acesso à API à ANA | Estação/data, séries hidrológicas | Contexto de risco e planejamento de serviços em SP | Não é base empresarial e não mede demanda contratada; prioridade menor para núcleo PJ |
| [SINISA resultados2025](https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento/sinisa/resultados-sinisa/resultados-sinisa-2025) | Downloads oficiais anuais por módulos, ano de referência2024; não API pública confirmada | Município/prestador e ano | Déficit de saneamento × projetos/PNCP/ART × capacidade técnica regional | Déficit populacional não vira valor de mercado sem modelo; harmonizar quebra SNIS→SINISA |
| [Anatel dados abertos](https://www.gov.br/anatel/pt-br/dados/dados-abertos) | Arquivos estruturados de estações/outorgas e outros conjuntos; validar recurso originador; domínio de API hipotético bloqueado no ambiente não foi adotado | Estação, município, coordenadas, entidade/serviço conforme base | Expansão de infraestrutura de telecom × ART/localização e empresas | Indicadores econômicos podem ser apenas setoriais consolidados; estação não identifica empresa executora |
| [INPI dados abertos](https://www.gov.br/inpi/pt-br/acesso-a-informacao/dados-abertos) | Bases oficiais e RPI como pistas para rotina; API aberta de patente porCNPJ não confirmada aqui | Pedido, depositante, IPC/CPC, município se publicado | Inovação de empresas de SP registradas e setores tecnológicos | Depósito não equivale a concessão ou produto; nome aproximado exige revisão; não usar API de boletos como API de patentes |

Uma busca real no CKAN ANEEL com`q=geracao&rows=10` retornou contador22 e dez metadados. Um desses conjuntos aparece explicitamente como descontinuado. O pipeline precisa respeitar esse estado e não promover toda descoberta ao BI ativo.

## Catálogos paulistas: leitura pública demonstrada

Foram executadas consultas simples, sem credencial, a [CKAN estadual](https://dadosabertos.sp.gov.br/api/3/action/package_search?rows=1) e [CKAN da capital](https://dados.prefeitura.sp.gov.br/api/3/action/package_search?rows=1), ambas com JSON `success:true`. Os contadores retornados foram452 e489 conjuntos respectivamente. São contagens do catálogo naquele instante, não de fontes úteis ao CREA nem de municípios cobertos.

Também foi preparada e executada uma pesquisa amostral por12 termos no estado e4 na capital, com no máximo cinco conjuntos por consulta. Consultas, contagens, primeiros resultados e links de recursos ficam em `evidencias-catalogo/sp-query-summary.json`. Uma consulta sem resultado pode refletir a indexação, idioma ou termo, e não ausência do órgão. É necessário inspecionar o conteúdo dos recursos antes de selecionar um indicador.

## Regras para transformar essas fontes em informação

1. Separar identidade empresarial (raiz), estabelecimento (CNPJ completo), empreendimento (CEG/CNO/processo/outorga) e evento (registro/ART/publicação). Evita que várias instalações ou contratos virem várias empresas.
2. Preservar CNPJ como texto, inclusive o formato alfanumérico. Vincular por identificador exato e vigência; nome e endereço somente como sugestão revisável.
3. Modelo de evidências: `fonte → entidade externa → correspondência → fato interno`. Registrar método, qualidade, data de ocorrência, competência e data de ingestão. Ausência de correspondência pode refletir diferença temporal ou de granularidade.
4. Instalação regulada pode pertencer a um proprietário e ser projetada/executada por outro. Só uma chave/documento explícito pode ligar instalação, contrato e ART. Proximidade espacial ou mesmo CNPJ, isoladamente, não prova qual serviço foi coberto.
5. Criar agregados territoriais para demandas setoriais quando o prestador não é identificável. São bons para planejamento; não para autuação automática.
6. APIs de emissão, autenticação, pagamento ou interoperabilidade interna não são necessariamente APIs de leitura de dados públicos. O direito de acesso deve ser verificado por recurso.
7. Coletor deve validar Content-Type, schema e conteúdo semântico. `200` com manutenção, login ou `Request Rejected` é falha. Salvar último lote válido com aviso de defasagem; não zerar indicador por indisponibilidade.

## Evidências locais e rastreabilidade

- `evidencias-catalogo/dados-api-docs`: OpenAPI integral obtida na consulta.
- `dados-openapi-contract.json`: recorte de segurança, GETs e schemas de resposta.
- `page-0.html`, `page-1.html`, `page-2.html`: snapshots recebidos de portal/Swagger/Chelfo.
- `fonte-probe-6.json`: HTML da manutenção; extensão preservada pelo log não significa JSON.
- `fontes-http.json`, `more-http.json`: resultados e tipo de conteúdo; não esconderam falhas.
- `sp-query-summary.json` e arquivos deconsulta: amostra dos catálogos paulistas.
- `aneel-siga.json`, `fonte-probe-4.json`, `anm-sp-sample.json`, `anp-swagger.json`: contratos/metadados e amostras.
- `chelfo-catalogo-959.json/.csv`, `chelfo-sp-20.csv`: extração de trabalho para rastrear as pistas; **não é uma lista homologada de integrações ou fonte de fatos para o BI**.
- `buscas-portal-0.json` a`2.json`: termos e retornos das12 buscas indexadas.

Nenhum token foi gerado, solicitado por mensagem, embutido em código ou registrado. Não houve coleta em massa de dados pessoais, escrita em serviços públicos ou integração de produção.

## Resultados amostrais das buscas paulistas

Contagens de busca sobre metadados, com interseções entre termos; não somar estas linhas. Cinco primeiros conjuntos por consulta, exceto quando havia menos.

| Catálogo | Termo | Conjuntos retornados | Exemplos / avaliação |
|---|---|---:|---|
| estado | engenharia | 1 | Contratos - DER/SP |
| estado | empresas | 16 | Registro de Empresas 2025; Registro de Empresas 2026; Contratações 2026 |
| estado | JUCESP | 2 | Registro de Empresas 2026; Registro de Empresas 2025 |
| estado | CETESB | 0 | Sem correspondência nesta busca |
| estado | DETRAN | 20 | Exames Médicos e Psicológicos Realizados; Certificados Expedidos; Peritos Médicos e Psicólogos |
| estado | obras | 24 | OBRAS; Obras Emergenciais; Obras - DER/SP |
| estado | outorga | 0 | Sem correspondência nesta busca |
| estado | licitações | 13 | Licitações; LICITAÇÕES; LICITAÇÕES CULTURA |
| estado | resíduos | 1 | PPA 2024-2027 |
| estado | energia | 4 | Inventário das bases de dados do Estado de São Paulo; Geoseade; SAFI - SISTEMA DE APOIO À FISCALIZAÇÃO - CONTABILIDADE REGULATÓRIA |
| estado | emprego | 6 | Empregos - Quantitativo; Empregos Quantitativo de Empregos de empresas estatais; Trabalho |
| estado | educação | 49 | Educação básica; Concluintes da Educação Básica; Transferências Voluntárias 2025 - Deputados Estaduais |
| capital | alvará | 3 | Aprovação de alvarás; Sistema Aprova Digital (AD); Auditorias e Notas Técnicas - CGM |
| capital | licenciamento | 22 | Aprovação de alvarás; Licença Ambiental Industrial; Licenças Ambientais Não Industriais |
| capital | obras | 33 | Obras Emergenciais; Obras - Unidades Educacionais; controle de obras SIURB |
| capital | edificações | 2 | Cortiços no Município de São Paulo; Auditorias e Notas Técnicas - CGM |

Exemplos de descarte: a busca `educação` estadual traz educação básica e emendas, não um censo de formandos de engenharia; `licitações-de-obras` encontrou item HCFMUSP sem URL de recurso; alguns itens recentes de metadados apontam para arquivos antigos. Aprovação de alvará é evento administrativo, não obra concluída; contratos do DER são contratos, não necessariamente valores executados.

## Verificação adicional dos recursos paulistas selecionados

- **JUCESP2026:** pacote contém seis recursos mensais de janeiro a junho. O CSVjaneiro também retornou503 nesta verificação; não foi confirmado CNPJ, QSA ou schema do arquivo. Não contabilizar como coleta operacional validada.
- **Aprova Digital2026S1:** download200,274.379 bytes, MIMEdeXLSX e assinaturaZIPválidos; o catálogo rotula o recurso comoCSV, ilustrando a necessidade de validar o conteúdo real. A planilha contém27 campos e1.925 linhas incluindo cabeçalho. Foram confirmados processo, protocolo, processo vinculado, data de autuação, SQL, endereços, subprefeitura, zoneamento, uso, áreas, blocos, pavimentos e unidades residenciais. **Não há CNPJ, CPF, registroCREA ouRT no cabeçalho**. Há nome do interessado, insuficiente para identificação determinística. Usar processo/SQL/território e buscar ponte documental autorizada para ART.
- **Licenças industriais,CSVatual:** download200 e cabeçalho9 colunas: documento, número, órgão, atividade, sigla, tipo, emissão, validade e link. **SemCNPJ/RT nessa tabela**. É bom catálogo de evidências e demanda, mas não cruzamento empresarial automático poridentificador.
- **Licenças nãoindustriais,CSVatual:** download200 e11 colunas; acrescenta códigos de primeira licença e licença anterior, permitindo histórico de licenças. **SemCNPJ/RT no cabeçalho**.
- **Alvarás históricos:** descrição oficial marca descontinuação apesar da alteração de metadados em2026. Excluir do núcleo de atualização corrente; o AprovaDigital é uma alternativa atual e de objeto diferente, não substituição estatística perfeita.

Os testes salvaram metadados e cabeçalhos, sem replicar os registros nominais de interessados na documentação. Campos disponíveis podem mudar em futuras publicações.


## Arquivos de trabalho e evidência pública da pesquisa

Referências a pastas locais de evidência descrevem o ambiente de investigação. Os corpos de resposta e as amostras nominais não integram esta entrega pública. Consulte o [resumo HTTP sanitizado](../evidencias/evidencias-http-resumo.csv), o [catálogo consolidado](../CATALOGO_FONTES.md) e suas origens em `../inventarios/origens/`. Um teste amostral não certifica funcionamento futuro, cobertura integral ou licença de todos os recursos.
