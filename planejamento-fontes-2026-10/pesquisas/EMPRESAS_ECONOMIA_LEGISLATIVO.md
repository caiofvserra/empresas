# Empresas, economia, crédito e agenda regulatória

Pesquisa em 29/10/2026. Este capítulo complementa as fichas `RFB-*`, `SP-JUCESP`, `IBGE-*`, `BCB-*` e `LEG-*` do catálogo. Nenhuma fonte está conectada ao BI em produção.

## Empresas e sócios: a base de identidade

O [layout oficial dos dados abertos do CNPJ](https://www.gov.br/receitafederal/dados/cnpj-metadados.pdf) foi baixado e lido. Ele separa empresa por raiz, estabelecimentos, opção pelo Simples/MEI, sócios e tabelas auxiliares. Isso deve virar entidades distintas, e não uma grande tabela na qual cada sócio ou CNAE secundário repete a empresa nos totais. É necessário conservar as fotografias mensais para observar mudanças; uma carga atual isolada não reconstrói todo o histórico.

O download em lote precisa ser homologado no canal atual: a [raiz oficial de arquivos](https://arquivos.receitafederal.gov.br/) respondeu e redirecionou para uma área pública de arquivos; a URL antiga de diretório `/dados/cnpj/dados_abertos_cnpj/` respondeu404, e a antiga página informativa redirecionou para login. Não foi baixado um lote CNPJ atual nesta etapa. O plano não deve depender de uma URL histórica presumida, um mirror privado ou uma consulta individual por empresa para replicar milhões de registros.

O QSA ajuda a construir relações societárias declaradas, sobretudo entre pessoas jurídicas com CNPJ. O CPF público da pessoa física é mascarado conforme o layout. Não é seguro ligar o sócio ao profissional apenas por nome e CPF parcial, e não se deve reconstruir os dígitos ausentes. Qualificação societária não equivale a composição integral da diretoria, controle final ou beneficiário final. As regras de administração de empresas e atribuições profissionais precisam ser validadas pela área competente, não inferidas por grafo.

O [Conecta — Consulta CNPJ](https://www.gov.br/conecta/catalogo/apis/consulta-cnpj) documenta serviços cadastrais e QSA por acesso aprovado. Pode ser uma alternativa para validar mudanças ou casos selecionados, dependendo da elegibilidade do CREA-SP, do acordo e das cotas. O catálogo descreve acesso autenticado: não se comprovou uma API pública anônima de consulta nominal nem se executou uma consulta com credencial. Documentações antigas também precisam ser homologadas para o CNPJ alfanumérico. O identificador deve permanecer texto, preservando zeros e letras; não usar conversão numérica ou limpeza que descarte letras.

### JUCESP

Uma consulta real ao [CKAN paulista para JUCESP](https://dadosabertos.sp.gov.br/api/3/action/package_search?fq=organization:jucesp&rows=10) retornou dois conjuntos,2025 e2026. O conjunto2026 lista seis arquivos de constituição, janeiro a junho. Os CSVs testados retornaram503; portanto, não foi confirmado se há CNPJ no conteúdo nem o grão efetivo das linhas. O metadado descreve recortes por período, localização, atividade, natureza jurídica e enquadramento.

É um candidato para pulso de constituição empresarial e validação de tendências. Não substitui o universo RFB, não cobre automaticamente todas as naturezas jurídicas e não deve ser promovido a registro nominal até ler o arquivo e seu dicionário. O [Seade](https://repositorio.seade.gov.br/) oferece alternativas paulistas descritas no capítulo de formação/trabalho e no catálogo.

## IBGE: contexto comparável, sem ligação nominal artificial

O código IBGE é a dimensão territorial comum; GRE precisa de tabela interna oficial com vigência. Município do fornecedor, órgão contratante, obra, curso e residência têm papéis diferentes. O serviço de localidades e a API de agregados retornaram503 nesta execução; isso não prova inexistência ou mudança do serviço. A [documentação de localidades](https://servicodados.ibge.gov.br/api/docs/localidades) foi consultada. O caminho alternativo SIDRA respondeu para população e metadados de cinco tabelas.

| Produto | Utilidade e recorte | Evidência desta pesquisa | Precaução |
|---|---|---|---|
| População estimada, tabela6579 | Denominadores e mudança de escala municipal/estadual | JSON válido em consulta SP/último período, que retornou2026 | População não é expansão da área urbanizada; Censo e estimativa não são a mesma operação |
| PIB municipal, tabela5938 | Peso econômico territorial e distribuição de atividade | Metadados200; notas oficiais consultadas | Edição2022–2023 não traz a abertura setorial tradicional. Não preencher valores faltantes com composição antiga |
| CEMPRE, tabela9582 e outras conforme recorte | Empresas, unidades locais, pessoal ocupado e remunerações | Metadados200; documentação oficial | Quebra metodológica em2022; nem todo detalhamento é municipal. Não entrega lista pública nominal de CNPJs |
| Demografia das empresas | Nascimento, morte, sobrevivência e crescimento de empresas empregadoras | Documentação oficial | Mudança de escopo a partir2022; não usar como taxa de todas as aberturas RFB |
| PAIC, novas tabelas como10441 | Construção, produção, custos, receita e trabalho no nível permitido | Metadados200; documentação | Dados2024 passaram a ser disponibilizados pelo SIDRA; revisar continuidade. Porte por pessoal ocupado não é porte RFB |
| PAS, tabelas como2634 | Estrutura dos serviços técnicos/profissionais | Metadados200; documentação | Alguns detalhamentos são só Brasil; nem todo serviço profissional é engenharia nem todo detalhamento existe paraSP |
| SINAPI, tabela2296 e correlatas | Custos/índices da construção porUF/mês | Metadados200 | Não é preço obrigatório de contrato ou prova de sobrepreço; distinguir regime e composições |
| IPCA, tabela1737 | Salário real e comparação monetária a preços constantes | Tabela oficial identificada; GET não executado | Escolha do deflator e período-base precisam ser explícitas; não substitui índice previsto no contrato |

Documentação primária: [IBGE/CEMPRE](https://www.ibge.gov.br/estatisticas/economicas/servicos/9016-estatisticas-do-cadastro-central-de-empresas.html), [PIB municipal](https://www.ibge.gov.br/estatisticas/economicas/contas-nacionais/9088-produto-interno-bruto-dos-municipios.html), [PAIC](https://www.ibge.gov.br/estatisticas/economicas/industria/9018-pesquisa-anual-da-industria-da-construcao.html), [PAS](https://www.ibge.gov.br/estatisticas/economicas/servicos/9028-pesquisa-anual-de-servicos.html), [SIDRA](https://sidra.ibge.gov.br/).

Não se deve somar RFB+CEMPRE+JUCESP como se fossem populações distintas. Eles observam universos, eventos e momentos diferentes. A informação útil é o contraste explicado entre as medidas, não a soma dos cadastros.

## Banco Central: onde pode ajudar

O maior interesse é contexto de financiamento e condições setoriais, não dados de contas ou dívidas individuais de empresas. A [página SCR.data](https://www.bcb.gov.br/estabilidadefinanceira/scrdata) e seu [catálogo oficial](https://dadosabertos.bcb.gov.br/dataset/scr_data) descrevem dados agregados com dimensões deUF,CNAE,porte,modalidade e outras, sujeitos às combinações e proteções publicadas. É possível estudar o cenário do crédito dos setores paulistas junto das trajetórias de empresas e trabalho.

O catálogo e `resource_show` responderam200. O recurso versão2 indica arquivos anuais no padrão `https://www.bcb.gov.br/pda/desig/scrdata_{ANO}.zip`; HEAD do arquivo2026 respondeu200. O conteúdo não foi baixado. A existência do ZIP e dos metadados não confirma todas as combinações nem a continuidade com versão1. A inadimplência bancária agregada não se confunde com inadimplência de anuidade no CREA. O papel territorial da UF deve ser validado no dicionário do produto; não presumir local de execução da obra ou de aplicação do crédito.

A [API SGS](https://dadosabertos.bcb.gov.br/dataset/432-taxa-de-juros---meta-selic-definida-pelo-copom) respondeu JSON para uma janela de outubro/2026 da série432, meta Selic. É contexto nacional; não é taxa contratada por um CNPJ paulista. Consultas de séries diárias têm restrição documentada de período, com filtros obrigatórios e janela máxima de10 anos.

A [API OData do mercado imobiliário](https://olinda.bcb.gov.br/olinda/servico/MercadoImobiliario/versao/v1/documentacao) respondeu com `Data`, `Info` e `Valor` em uma amostra. A seleção de séries precisa verificar abrangência antes de apresentar um número comoSP. [ESTBAN](https://www.bcb.gov.br/estatisticas/estatisticabancariamunicipios) foi identificado como arquivo mensal de saldos por município, mas o download não foi homologado. Local da agência pode diferir do local do tomador e da aplicação do recurso.

**Ordem sugerida:** crédito setorial agregado se houver recorteSP compatível; juros apenas como contexto; mercado imobiliário em leituras específicas; ESTBAN com prioridade menor. IFData de instituições financeiras não é uma base de empresas de engenharia nem substitui esses produtos.

## Legislativo: radar de mudanças com efeito institucional

Os três níveis são relevantes: lei federal pode afetar todo o setor paulista, mesmo com autor de outro estado; ALESP trata matérias estaduais; atos municipais podem ser incorporados num piloto posterior. O radar deve acompanhar matéria, apensamentos, etapa, documentos e mudança observada — não um ranking de autores ou contagem de menções.

- [Câmara](https://dadosabertos.camara.leg.br/swagger/api.html): OpenAPI e consulta por `keywords=engenharia` responderam200. A rotina deve usar também temas, palavras relacionadas e tramitações de proposições antigas. Filtrar somente o ano de apresentação perde movimentação atual de projetos anteriores. Manter ID/URI e paginação; não confundir várias tramitações ou temas com várias proposições.
- [Senado](https://legis.senado.leg.br/dadosabertos/api-docs/swagger-ui/index.html): OpenAPI atual obtido em `/dadosabertos/v3/api-docs`, versão4.1.3.108. A API é pública; serviços antigos estão em descontinuação. Preferir os recursos atuais de processo e observar cabeçalhos `Deprecation`, `Sunset` e substituto. O contrato informa limitação de mais de10 requisições/s sujeitas a429 e pede evitar rajadas em horários arredondados. Um recurso de tipos foi consultado comJSON válido; busca temática completa não foi homologada.
- [ALESP](https://ckan.al.sp.gov.br/group/processo-legislativo/dataset/tramitacao): o XML de tramitação atual respondeu200,20,9MB, com `idProcesso`, `idTramitacao`, descrição, data e ordem. A página oficial informa mudança de elementos em16/10/2026. Parser versionado e verificação de schema são necessários; o CKAN respondeu503 nesta sessão. Um arquivo XML não implica suporte a paginação de API.

Famílias de assunto a validar: registro/atribuições/ART; formação e estágio; responsabilidade e segurança; contratação de serviços técnicos; obras e habitação; licenciamento; concessões/energia/saneamento; mineração/agroindústria; inovação e transformação produtiva; normas de trabalho e remuneração. Relevância pode ser sugerida por regras textuais ou modelo posteriormente homologado, sempre com texto de origem e revisão humana. Proposição em tramitação não é norma vigente.

## Oportunidades por compartilhamento que não devem ser vendidas como APIs abertas

O [Cadastro Compartilhado CNO](https://bcadastros.serpro.gov.br/documentacao/cadastro_cno/) prevê chaves de obra, ART/RRT e responsável com papel, além de território e área. É uma hipótese de parceria/contratação, sem dados acessados. Número de ART externo requer origem, formato e validação no conselho correto; fim da responsabilidade não foi confirmado no schema. Código municipal éTOM e precisa de-para.

A [documentação técnica da NFS-e](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual) separa emissão de contribuinte e compartilhamento/distribuição. A existência de uma API para emitir nota não permite consultar notas de serviços de terceiros. Qualquer uso de notas, CNO ou dados laborais identificados depende de finalidade, instrumento e escopo aprovados. Essas possibilidades ficam na trilha de negociação, sem metas numéricas ou conectores prometidos nesta fase.


## Arquivos de trabalho e evidência pública da pesquisa

Referências a pastas locais de evidência descrevem o ambiente de investigação. Os corpos de resposta e as amostras nominais não integram esta entrega pública. Consulte o [resumo HTTP sanitizado](../evidencias/evidencias-http-resumo.csv), o [catálogo consolidado](../CATALOGO_FONTES.md) e suas origens em `../inventarios/origens/`. Um teste amostral não certifica funcionamento futuro, cobertura integral ou licença de todos os recursos.
