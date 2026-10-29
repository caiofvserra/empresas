# Roteiro de cobertura do catálogo nacional e seleção de fontes

**Planejamento para completar a varredura quando o portal estiver disponível e houver chave autorizada. Não foi executada uma coleta nacional completa.**

## Contrato lido

A especificação obtida do [Swagger dados.gov.br](https://dados.gov.br/swagger-ui/index.html#/) descreve OpenAPI3.1, servidor `https://dados.gov.br` e esquema global de API-key no cabeçalho `chave-api-dados-abertos`. A obtenção pelo titular ocorre no perfil consumidor/gestor ou tokens da organização, segundo a documentação. Esta pesquisa não gerou nem utilizou uma chave. O nome `publico` na rota não dispensou a exigência no teste realizado: retornou401; consultas posteriores chegaram à manutenção.

| Operação de leitura | Uso previsto |
|---|---|
| `GET /dados/api/publico/organizacao` | Descobrir organizações e seus identificadores; não inventar IDs a partir do nome |
| `GET /dados/api/publico/organizacao/{id}` | Conferir identidade do publicador |
| `GET /dados/api/publico/conjuntos-dados` | Listagem com `nomeConjuntoDados`, `dadosAbertos`, `isPrivado`, `idOrganizacao` e `pagina` obrigatória, conforme contrato |
| `GET /dados/api/publico/conjuntos-dados/{id}` | Ler metadados e recursos do conjunto |
| `GET /dados/api/temas`, `GET /dados/api/tags` | Enriquecer descoberta; tags têm parâmetro `nome` |
| `GET /dados/api/publico/conjuntos-dados/formatos` | Conferir formatos declarados; validar assinatura/MIME real depois |

Não se prescreve `rows`, tamanho da página ou base0/1 para a API nacional: esses detalhes precisam ser homologados no contrato/resposta atual. São parâmetros diferentes de CKAN, usado por alguns órgãos e pelos portais paulistas. Recursos do tipo documentação, dicionário ou link de API não devem ser tratados como arquivo de fatos.

## Famílias a pesquisar por organização e termos

Este é o roteiro proposto, não uma lista de consultas nacionais já executadas. As consultas efetivamente feitas estão no relatório CATALOGOS e no resumoHTTP. Termos sobrepostos serão deduplicados por ID do conjunto e recurso, mantendo a origem da descoberta.

| Família | Publicadores/canais prioritários | Termos e sinônimos | O que procurar nos recursos |
|---|---|---|---|
| Cadastro empresarial | RFB, MGI, JUCESP, Seade | CNPJ; estabelecimento; empresa; sócio; quadro societário; CNAE; Simples; MEI; abertura; baixa | Arquivo de cadastro, situação, vínculo societário e dicionário; competência e histórico |
| Trabalho e renda | MTE/PDET, Seade, IBGE | RAIS; CAGED; vínculo; ocupação; CBO; remuneração; salário; admissões; desligamentos; vagas | Grão permitido, anonimização, CNAE/CBO versionados, fluxo versus estoque |
| Formação | INEP, MEC, CAPES, IES | engenharia; agronomia; geologia; geografia; meteorologia; cursos; CINE; concluintes; ingressantes; matrícula; evasão; fluxo | Curso/IES/município/modalidade/ano; engenharia não é sinônimo automático de toda áreaCINE07 |
| Contratação | MGI/PNCP, Compras.gov.br, órgãos contratantes | licitação; contratação; contrato; fornecedor; subcontratado; engenharia; manutenção; projeto; consultoria | ID PNCP, CNPJ, objeto, situação, publicação, retificação, itens, valores e datas |
| Infraestrutura pública | Obrasgov, Transferegov, TCU, TCE-SP, DER, SIURB | obra; investimento; CIPI; execução; paralisada; convênio; contrato de repasse; medição | Geografia efetiva, projeto, contrato e fases financeiras, sem duplicar valores |
| Licenciamento e obras privadas | RFB/CNO, municípios, CETESB, Corpo de Bombeiros | alvará; habite-se; CNO; licença; edificação; ART; RRT; AVCB; CLCB; responsável | Identificador de obra/licença/processo, responsável com papel, local/datas; acesso institucional quando exigido |
| Energia elétrica | ANEEL, EPE, ONS | geração; CEG; usina; agente; GD; transmissão; distribuição; fiscalização; expansão | CEG e agente/CNPJ em recursos específicos; instalações e cronograma; indicador agregado separado |
| Petróleo, gás e combustíveis | ANP | revendedor; GLP; combustível; agente; autorização; instalação; biocombustível | CNPJ e instalação, data de autorização/situação, características técnicas e local |
| Ambiente e resíduos | IBAMA, CETESB, municípios | CTF; APP; AIDA; licença; empreendimento; resíduo; MTR; emissões; potencialmente poluidor | CNPJ quando publicado, atividade, licença, processo, datas; restrições de dados operacionais |
| Água e saneamento | ANA, Cidades/SINISA, SpÁguas, prestadores | outorga; CNARH; irrigação; barragem; abastecimento; esgoto; drenagem; resíduos; SNIS; SINISA | Usuário/prestador/instalação/município, série anual e transição metodológica |
| Mineração e segurança | ANM | processo minerário; SIGMINE; titular; CFEM; barragem; SIGBM | Processo, titular identificável, substância, fase, geometria; identificação empresarial em cadastro complementar |
| Transporte e logística | ANTT, SENATRAN, DETRAN-SP, ARTESP, DER, ANTAQ, ANAC | RNTRC; transportador; concessão; ferrovia; rodovia; ITL; CSV; inspeção; credenciado; porto; aeródromo | Pessoa jurídica/instalação/obra quando disponíveis; frota/operação como contexto de menor prioridade |
| Telecomunicações | Anatel | estação; outorga; licenciamento; prestadora; infraestrutura | Estação/entidade/serviço, local, datas; não confundir proprietário da estação e executora de engenharia |
| Agroindústria e alimentos | MAPA, IBGE | SIPEAGRO; fertilizante; defensivo; armazenagem; estabelecimento; inspeção; irrigação | Estabelecimento/CNPJ, tipo de atividade, geografia e responsável, conforme acesso |
| Indústria e metrologia | IBGE, INMETRO, IPEM-SP | indústria; instalação; laboratório; acreditado; calibração; ensaio; inspeção | Organismo/laboratório/CNPJ e escopo; PIA/PIM agregadas como contexto, não cadastro nominal |
| Ciência e inovação | INPI, BNDES, FINEP, FAPESP, CNPq | patente; desenho industrial; depositante; IPC; CPC; inovação; projeto apoiado; financiamento | Pedido/projeto e proponente identificado; evento depósito/concessão; API efetiva versus roadmap |
| Crédito e economia | BCB, IBGE, Seade | SCR; crédito; juros; ESTBAN; PIB; CEMPRE; demografia; PAIC; PAS; SINAPI; IPCA | Grão territorial/setorial, deflator, quebras metodológicas, sigilo estatístico |
| Justiça e perícia | CNJ, CSJT, TJSP, TRF3, TRT2, TRT15 | perícia; perito; auxiliar; especialidade; nomeação; honorário; pagamento; processo | Ato de nomeação e profissão confirmada; metadado processual não equivale a perícia ou laudo |
| Integridade documental | CGU, TCU, TCE-SP | CEIS; CNEP; inidôneo; inabilitado; apenado; decisão; certidão | CNPJ, sanção e vigência, processo e decisão; sem converter sanção em irregularidadeCREA |
| Agenda regulatória | Câmara, Senado, ALESP, portais oficiais de normas | exercício; profissão; atribuição; registro; ART; contratação; piso; responsabilidade; infraestrutura | ID da matéria, documentos e tramitação; vigência de norma e escopo geográfico |

ANT AQ/ANAC/EPE/ONS, Corpo de Bombeiros, FINEP/FAPESP/CNPq e IPEM aparecem aqui como **extensões para descoberta dirigida**, não como APIs adicionais homologadas no catálogo atual. A prioridade depende de identificadores, rotina e ganho sobre fontes já selecionadas.

## Critérios de classificação após a descoberta

1. Conferir o órgão de origem, condições de uso/licença e recurso. O catálogo nacional é metadado, não necessariamente o publicador operacional.
2. Ler dicionário e uma amostra mínima, preferindo contar campos/linhas a copiar registros pessoais. Determinar CNPJ, chave de empreendimento, geografia, datas e papéis efetivamente presentes.
3. Diferenciar API de consulta de dados, API de emissão, prestação de contas autenticada, consulta manual e arquivo em lote. Não tentar contornar login, CAPTCHA, manutenção ou limite.
4. Medir atualização dos fatos e última competência, não apenas data de edição do catálogo. Marcar descontinuado e sucessor quando houver.
5. Homologar paginação e retificações; registrar IDs e hash dos arquivos. Não contar várias versões/recursos do mesmo conjunto como novas APIs.
6. Promover ao núcleo somente se produzir caso de uso, chave e periodicidade defensáveis. Caso contrário, classificar contexto, parceria, histórico ou descarte justificado.

## Registro mínimo da rotina futura de descoberta

`consulta_id`, órgão e termos, instante da consulta, página, contador declarado, IDs obtidos, recursos analisados, URL final, HTTP, MIME/assinatura, schema/hash, licença, competência, amostra avaliada, motivo de inclusão/descarte, sucessor, fonte já equivalente e pendência.

Proposta de cadência: metadados semanalmente e checagem de links nas cargas; revisar temas/órgãos periodicamente com os validadores. Dados financeiros/processuais de terceiros só entram conforme publicidade e finalidade. Essa é uma especificação para a próxima fase, sem coletor agendado nesta entrega.


## Arquivos de trabalho e evidência pública da pesquisa

Referências a pastas locais de evidência descrevem o ambiente de investigação. Os corpos de resposta e as amostras nominais não integram esta entrega pública. Consulte o [resumo HTTP sanitizado](../evidencias/evidencias-http-resumo.csv), o [catálogo consolidado](../CATALOGO_FONTES.md) e suas origens em `../inventarios/origens/`. Um teste amostral não certifica funcionamento futuro, cobertura integral ou licença de todos os recursos.
