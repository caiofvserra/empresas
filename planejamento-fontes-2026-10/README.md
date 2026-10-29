# CREA-SP — plano de inteligência e integração de dados

**Pesquisa em 29/10/2026. Escopo: São Paulo. Entrega de planejamento, sem novos conectores em produção ou reformulação do painel.**

O maior avanço possível não é acrescentar mais gráficos à V18. É passar de uma comparação de cadastros para uma **rede verificável de empresas, atividades, empreendimentos, contratos, profissionais e documentos de responsabilidade técnica**, acompanhada de contexto econômico e de formação. Um conjunto externo só merece virar indicador quando estiver claro o que ele conta, com que periodicidade muda, que parte de SP cobre e qual ligação com o CREA pode ser sustentada.

## Situação do projeto e leitura crítica

A versão do Claude foi identificada pelas oito abas laterais — Visão geral, Cadastro, Fiscalização, Malha fina, Resp. técnica, Receita, Atendimento e Contexto. Estava em `claude/painel-unico-v15`, ainda sem integração. Foi incorporada à `main` pelo [merge 049d618](https://github.com/caiofvserra/empresas/commit/049d618bfe4dd634be90bd1edcaac9bac4631647), preservando o histórico. As duas builds passaram, assim como os 230 testes e a navegação pelas oito abas no navegador. A entrada dessa versão é `/painel.html`; a raiz continua na versão anterior. A hospedagem publicada não foi alterada nesta etapa.

A composição atual está mais próxima de um relatório de BI: navegação compacta, filtros comuns, matriz regional, mapa municipal, pequenas séries e aprofundamentos. Esse vocabulário pode ser preservado. Entretanto, a sofisticação visual não resolve cinco problemas de informação que precisam entrar no próximo desenho:

1. **ART do mesmo fornecedor perto da data do contrato não comprova que se refere àquele contrato.** Deve existir uma ponte documental, ou uma sugestão de correspondência claramente identificada e revisável.
2. **Emprego, salário e sócios simulados não se tornam evidência sobre uma empresa real.** RAIS/CAGED públicos, formação e contexto econômico precisam conservar o grão agregado permitido. A identificação individual dependerá de dados internos ou acordos específicos.
3. **CNAE selecionado e ausência de correspondência são critérios de busca.** Não constituem conclusão automática de obrigação, exercício irregular ou infração. A lista anexa deve conservar as classes e sua versão.
4. **Situação hoje não explica todo o passado.** Registro, visto, RT, contrato, licença, ART, certidão, nomeação e pagamento têm datas e ciclos diferentes. Cada medida precisa consultar a situação pertinente ao fato analisado.
5. **Fontes congeladas e números copiados de relatórios não atendem ao requisito de atualização rotineira.** Podem servir como comparação histórica ou teste; o futuro produto depende de banco, API, arquivo oficial ou parceria com contrato de dados definido.

Não alterei essas regras na interface agora, pois o pedido é planejar a próxima estrutura. O [relatório do repositório](REVISAO_REPOSITORIO.md) registra os pontos concretos, incluindo mapeamentos de CBO e regras salariais que exigem revisão antes de qualquer uso real.

## Como ler este compilado

O inventário reúne **104 entradas canônicas, derivadas de 105 fichas de pesquisa em cinco levantamentos**, com origens e sobreposições explicitadas. Inclui fontes, produtos de um mesmo órgão, catálogos, alternativas por parceria e uma referência de reuso. **Não significa 104 APIs independentes ou prontas.** A ficha de cada entrada registra origem, acesso, grão, chaves, atualização, uso e limites.

- [Catálogo completo de fontes](CATALOGO_FONTES.md), com documentação e rotas.
- [Planilha do catálogo](inventarios/catalogo-fontes.xlsx), [CSV](inventarios/catalogo-fontes.csv) e [JSON](inventarios/catalogo-fontes.json).
- [Roteiro para completar a varredura nacional](pesquisas/ROTEIRO_CATALOGO_NACIONAL.md).
- [Casos de uso e indicadores](CASOS_USO.md), com regras e exemplos sintéticos.
- [Mapa de relações](MAPA_RELACOES.md) e [arquitetura analítica](ARQUITETURA.md).
- [Validação e limites da entrega](VALIDACAO_E_LIMITES.md).
- [Contexto dos anexos](CONTEXTO_ANEXOS.md), com páginas e distinção entre evidência documental e campo a confirmar no banco.
- Pesquisa aprofundada: [catálogos e dados.gov.br](pesquisas/CATALOGOS.md), [formação e trabalho](pesquisas/FORMACAO_TRABALHO.md), [compras e Justiça](pesquisas/JUSTICA_COMPRAS.md), [setores regulados](pesquisas/SETORIAIS.md), [empresas, IBGE, crédito e Legislativo](pesquisas/EMPRESAS_ECONOMIA_LEGISLATIVO.md).

**Níveis de evidência:** uma amostra de dados válida confirma que determinada consulta funcionou nesta pesquisa. Um OpenAPI confirma o contrato descrito, sem garantir que todos os serviços respondam. Uma página institucional confirma uma oferta documentada, sem homologar extração. Parceria significa acesso a negociar. Uma pista de catálogo ainda precisa chegar à fonte primária. Nenhum desses níveis equivale a SLA, integração implementada ou cobertura integral.

## Possibilidades agrupadas e sua relevância

| Grupo | Fontes e formas de acesso | O que interessa ao CREA-SP | Ligação defensável e limite |
|---|---|---|---|
| **Empresas e estrutura societária** | RFB/CNPJ em arquivos; consulta Conecta autorizada; JUCESP e Seade | Renovação do universo empresarial, principal/secundário, filiais, mudanças cadastrais e rede de sócios PJ | CNPJ completo identifica estabelecimento; raiz consolida empresa. CPF mascarado do QSA não identifica um profissional com segurança |
| **Contratações e investimentos** | PNCP, Compras.gov.br, Obrasgov, Transferegov, BNDES | Quem recebe contratos técnicos, que empreendimentos existem, onde estão e quais documentos técnicos foram identificados | Contrato/compra/CIPI/CNPJ e pontes ART. Publicação, contratação, execução e pagamento são fatos distintos |
| **Contas e controle público** | TCE-SP/AUDESP público, TCU, CGU/Portal da Transparência | Pagamentos, fornecedores, obras acompanhadas e contexto documental de sanções ou decisões | API de despesa não é parecer do TCE; nem todo contrato é previamente analisado. Sanção externa não é infração no CREA |
| **Energia e combustíveis** | ANEEL SIGA, agentes, GD e RALIE; ANP revendedores | Implantação e operação de instalações, responsáveis empresariais identificáveis e demanda territorial técnica | No SIGA, CEG liga à tabela de agentes com CNPJ. Proprietário, investidor, operador e instalador são papéis diferentes |
| **Ambiente, água e saneamento** | IBAMA CTF/APP e AIDA; CETESB/DataGEO/SIGOR; ANA; SINISA e SpÁguas conforme disponibilidade | Atividade industrial, consultoria ambiental, licenças, outorgas, infraestrutura e déficit de serviço | Usar empreendimento/licença/outorga e território. Nem toda camada tem CNPJ ou identifica a empresa executora |
| **Mineração, indústria e agroindústria** | ANM SIGMINE, SIGBM e cadastros complementares; MAPA/SIPEAGRO; IBGE industrial | Instalações e atividades ligadas a geologia, minas, segurança, agronomia, química e produção | Processo minerário não prova operação; camada SIGMINE examinada não tem CNPJ. Exigir cadastro complementar para titular exato |
| **Transporte e inspeção veicular** | ANTT/RNTRC e concessões; ARTESP/DER; SENATRAN/ITL; DETRAN-SP | Empreendimentos, transportadores, instalações de inspeção e estabelecimentos credenciados | Frota é contexto; lista de credenciados/ITLs pode ter valor empresarial direto. Integração DETRAN/RT precisa parceria e dados atuais |
| **Obras e licenciamento municipal** | Aprova Digital, GeoSampa, SIURB, DER; CNO por compartilhamento autorizado; prefeituras | Novas obras, áreas, uso, localização, responsabilidade e documentação técnica identificada | Piloto da capital não cobre SP inteiro. Aprova Digital e CSVs ambientais examinados não têm CNPJ/RT; endereço ou nome geram candidato, não prova |
| **Formação e ingresso profissional** | INEP/CINE, fluxo escolar, e-MEC, Seade, CAPES; listas de IES recebidas pelo CREA | Oferta de cursos, matrículas, ingressantes, concluintes e ingresso posterior no conselho por coorte autorizada | INEP público não entrega cadastro nominal dos futuros engenheiros. Formando previsto é diferente de concluinte; curso em SP não prova residência ou trabalho em SP |
| **Emprego, salário e ocupação** | RAIS, Novo CAGED, CBO, Seade; PNAD e vagas/SINE conforme produto | Estoque, fluxo, remuneração real, jornada e mudanças da demanda por ocupação técnica | Dados públicos agregados não mostram qual salário uma empresa paga a um engenheiro específico. CBO não é habilitação ou registro CREA |
| **Perícias e demanda judicial** | DataJud, AJ-JT, cadastros dos tribunais; acordos TJSP/TRF3/TRT2/TRT15; ART judicial interna | Especialidades demandadas, nomeações, distribuição territorial e documentação de responsabilidade identificada | Assunto processual não comprova perícia nem necessidade de engenheiro. Ato de nomeação, identidade e especialidade são necessários |
| **Território, crédito e cenário econômico** | IBGE/SIDRA, Seade, BCB/SGS/SCR/mercado imobiliário/ESTBAN | Explicar diferenças regionais e conjuntura: população, empresas, produção, salários reais, custos e crédito | Relacionar por dimensões e tempo, sem inventar crédito, PIB ou emprego de uma empresa nominal |
| **Inovação e agenda regulatória** | INPI/BADEPI; programas de financiamento; Câmara, Senado e ALESP | Setores emergentes, inovação apoiada, projetos normativos que mudem exercício profissional e contratação | Pedido de patente não é concessão; roadmap de API não prova serviço operacional. Proposição não é norma aprovada |

### O que foi possível verificar no dados.gov.br e na Chelfo

A especificação OpenAPI do [dados.gov.br](https://dados.gov.br/swagger-ui/index.html#/) foi obtida e lida: a autenticação usa o cabeçalho `chave-api-dados-abertos`. Uma consulta sem chave retornou 401. Depois, páginas e buscas passaram a redirecionar para uma página oficial de manutenção. Por isso, **não seria correto afirmar uma varredura integral do catálogo nacional**. Foram examinados o contrato, buscas indexadas dirigidas, recursos dos órgãos e catálogos estaduais/municipais acessíveis. O roteiro de coleta completa, com paginação por organização e famílias de termos, está documentado em [CATALOGOS](pesquisas/CATALOGOS.md).

Na [Chelfo](https://www.chelfoapi.com/), foram lidos os registros estruturados para descoberta e conferência de destinos, com checagem independente nos publicadores. Há duplicidades e rótulos de acesso que não correspondem ao teste executado. Ela é útil como índice secundário; não será a origem dos indicadores nem comprovação de funcionamento das APIs.

### Achados que merecem prioridade

**PNCP + Obrasgov + CREA.** Há campos para ligar projeto CIPI, compra, contrato e fornecedor. A ponte pode chegar à ART quando houver referência documental correspondente. O campo CIPI estava vazio na amostra PNCP, e um projeto Obrasgov consultado não tinha todos os detalhes preenchidos; a próxima fase deve medir essa completude antes de publicar uma taxa de cobertura. [Documentação PNCP](https://pncp.gov.br/api/consulta/swagger-ui/index.html), [pesquisa e exemplos de campos](pesquisas/JUSTICA_COMPRAS.md).

**ANEEL e ANP.** A tabela de agentes de geração contém CNPJ e CEG, permitindo ligar empresa a usina sem usar nome como chave. A API da ANP respondeu com dados de revenda em SP. São conjuntos úteis para conhecer atividade e localização; o operador cadastrado não é automaticamente a empresa que executou o serviço de engenharia. [Dados ANEEL](https://dadosabertos.aneel.gov.br/), [OpenAPI ANP](https://revendedoresapi.anp.gov.br/swagger/index.html).

**CNO por acordo.** A documentação do Cadastro Compartilhado prevê CNO, papel do responsável, ART/RRT, CIB, cadastro imobiliário, área e datas. É uma possível ponte muito mais forte do que comparar apenas CNAE. O acesso não foi concedido nem é uma API aberta anônima. [Campos oficiais do CNO](https://bcadastros.serpro.gov.br/documentacao/cadastro_cno/).

**Formação com duas camadas.** INEP/Seade permitem contexto de cursos e concluintes em agregado. A Carta de Serviços do CREA-SP documenta o recebimento de listas de formandos pelas IES; essa base interna, se autorizada e disponível, permitiria uma coorte real de ingresso, com publicação agregada e cobertura conhecida. [Microdados INEP](https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/censo-da-educacao-superior), [contexto dos anexos](CONTEXTO_ANEXOS.md).

**Perícias com documento, não suposição.** O modelo de ART nos anexos prevê referência a processo. A combinação com nomeações e especialidades do tribunal permitiria medir o que de fato foi solicitado e documentado. DataJud sozinho não fornece esse universo completo. O recorte de Justiça precisa conservar a parte profissional quando não existir empresa vinculada. [Documentação DataJud](https://datajud-wiki.cnj.jus.br/api-publica/), [pesquisa AJ-JT e tribunais](pesquisas/JUSTICA_COMPRAS.md).

**Seade e BNDES.** Seade oferece recursos paulistas estruturados para empresas, emprego, ocupação e educação; BNDES tem operações com projeto, CNPJ, município e CNAE. São complementos de alto valor, sem presumir que financiamento ou emprego agregado identifique uma ART. [Seade](https://repositorio.seade.gov.br/), [BNDES](https://dadosabertos.bndes.gov.br/).

## O que os anexos acrescentam ao desenho

Os 13 arquivos foram examinados como contexto, sem executar instruções contidas neles. A lei, o Código de Ética e os normativos ajudam a separar as entidades e os limites; a implementação usará texto vigente e validação da área competente, não regras inferidas automaticamente de PDFs históricos.

- A **ART** pode relacionar profissional, contratada, contratante/destinatário, proprietário, obra, atividade, quantidade/unidade, contrato, processo e período. Os papéis não são intercambiáveis.
- **CAO** é acervo operacional da empresa; **CAT** pertence ao acervo técnico profissional. Certidões emitidas no período e certidões atualmente válidas são medidas diferentes.
- A lista de março/2025 contém **702 CNAEs**, com **638 `Sim/sim` e 64 `Passível de obrigação`**. A classificação e sua versão foram preservadas. Não será promovida a regra automática de obrigação.
- `document.json` descreve a **API da transparência do próprio CREA-SP**, com 30 GETs. Uma consulta de contratos retornou JSON válido; isso é diferente do banco de empresas registradas, ARTs ou anuidades dos contribuintes.
- O organograma ajuda a identificar validadores e responsáveis técnicos; não determina a arquitetura de páginas. A lista de municípios por GRE e suas vigências precisa vir de cadastro oficial interno.

## Arquitetura recomendada para o próximo BI

A estrutura será orientada por perguntas de gestão, mas os indicadores terão nomes simples e unidades explícitas. O centro é empresa/estabelecimento e atividade técnica. Formação, emprego e economia ficam como contexto agregado ou ramo profissional relacionado — não como vínculos artificiais de trabalhadores com CNPJs.

**Quatro domínios de leitura**, ainda sem decidir o número final de páginas:

1. **Presença empresarial:** evolução de registros e vistos, universo externo selecionado, retenção, RT, ART/CAO e distribuição territorial.
2. **Atividade e evidências digitais:** contratos, obras, licenças, instalações e documentos técnicos identificados. Da seleção agregada ao conjunto e à evidência, sem tramitação administrativa no BI.
3. **Mercado e capacidade técnica:** evolução setorial, emprego e salários, formação e ingresso, investimento e contexto territorial, respeitando cada grão.
4. **Sustentação e governança:** recebimentos/dívida empresarial, acesso a serviços, qualidade das ligações, cobertura e atualização das fontes. Transparência pública recebe um modelo agregado próprio.

O canvas principal poderá usar medidas e dimensões alternáveis, tooltips e drillthrough; a organização final deve ser validada após saber quais relações reais estão disponíveis. Gráficos combinados devem compartilhar tempo ou território compatível. Não se deve colocar séries de competências diferentes sob um único rótulo de “atualizado hoje”.

**Fluxo técnico proposto:** bancos SQL Server/Db2 em leitura + coletores externos autorizados → histórico bruto com manifesto de origem → normalização de identidades e papéis → modelo dimensional e pontes de evidência → medidas validadas → Power BI. O gateway liga o ambiente interno ao serviço Power BI; não substitui o agendador, as credenciais nem o armazenamento das cargas externas. Nenhuma API pública precisa ser chamada quando o usuário clica no gráfico.

Importação com atualização incremental é uma hipótese inicial; DirectQuery fica condicionado a necessidade de latência, carga e desempenho demonstrados. O grafo pode ser mantido como tabelas de arestas relacionais. Um banco de grafos separado não é requisito para essa primeira versão. [Modelo completo e regras de temporalidade](ARQUITETURA.md).

## Ordem proposta de trabalho

| Etapa | Conteúdo | Critério para avançar |
|---|---|---|
| **P0 — identidade e histórico** | Dicionário SQL Server/Db2, empresas/estabelecimentos, registro/visto, RT, ART e atividades, CAO, finanças; município/GRE; dimensões CNAE/CBO/CINE; contratos de acesso | Reconciliação das contagens, chaves e vigências; campos realmente preenchidos; responsáveis de validação designados |
| **P1 — núcleo de evidência pública** | RFB com descarga atual homologada, PNCP, Obrasgov, Seade/IBGE; piloto ANEEL/ANP e BNDES conforme retorno e completude | Cargas repetíveis, chaves verificadas, páginas completas, dados SP com papel territorial conhecido, indicador reproduzível |
| **P1 por acordo — iniciar negociação cedo** | CNO, nomeações judiciais, listas de IES, DETRAN/CETESB/prefeituras e eventuais bases laborais identificadas | Instrumento, finalidade, campos mínimos, periodicidade, segurança e autorização comprovados; não esperar assinatura para amadurecer o modelo público |
| **P2 — expansão setorial e contexto** | INEP/CAPES, RAIS/CAGED/CBO, licenças/outorgas/mineração/saneamento/transporte; TCE/CGU/TCU; Legislativo | Fonte primária e rotina sustentáveis; medidas com utilidade decisória maior que custo de manutenção |
| **P3 — cobertura e especialização** | Novos municípios, inovação, crédito territorial, fontes específicas e histórico ampliado | Avaliação de valor incremental e lacunas ainda relevantes; descartar duplicatas e fontes descontinuadas |

As prioridades indicam ordem e valor esperado, não prazo prometido. Não há estimativa responsável de cronograma ou custo sem volumetria interna, permissões, infraestrutura e acordos.

## Critérios para uma fonte ou indicador entrar no produto

Cada conjunto precisa de proprietário, documentação, meio de extração permitido, licença/termos, competência, granularidade, geografia, periodicidade efetiva e rotina de reconciliação. `metadata_modified` não é a data dos fatos. Recurso rotulado CSV pode ser XLSX; HTTP200 pode ser login ou manutenção; catálogo pode listar dados descontinuados.

Cada indicador precisa de conceito, unidade, fórmula, denominador, população elegível, data de referência, filtros que se aplicam, tratamento do desconhecido e responsável pela validação. A limitação da fonte fica acessível no tooltip. Falha de API preserva o último lote válido e sua defasagem; não transforma falta de atualização em zero.

Correspondência determinística, correspondência sugerida e contexto agregado devem ser separados. Taxas de vínculo documental precisam mostrar também quantos registros tinham chaves suficientes para serem pesquisados. Uma taxa baixa pode revelar ausência de preenchimento, e não ausência da atividade ou do documento.

O modelo de publicação pública será separado do modelo interno. Grafos pessoais, salários identificados, documentos de defesa e detalhes financeiros não serão exportados por padrão. RLS/OLS e permissões devem existir no serviço/dataset, não somente em botões da interface. O anexo de transparência não prova, por si só, obrigação do TCU de publicar qualquer novo indicador; a classificação de publicação deverá citar o dispositivo aplicável antes de virar requisito.

## Próxima decisão de projeto

Antes de redesenhar, selecionar os casos de uso prioritários e confrontá-los com o dicionário e uma amostra controlada dos bancos internos. Recomendo começar por três percursos completos: **mercado selecionado → correspondência cadastral → empresa**, **empreendimento/contrato → documentos técnicos identificados**, e **setor/território → emprego e formação → capacidade técnica observada**. Isso torna o conjunto de dados analisável e dá uma base concreta para decidir os visuais e a navegação.

Esta entrega encerra a pesquisa e o planejamento desta etapa. Os conectores, acordos e a nova estrutura do BI permanecem como trabalho futuro, explicitamente identificado.
