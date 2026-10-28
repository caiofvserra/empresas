> **Arquivo histórico — substituído pela diretriz V7.** O conteúdo abaixo preserva decisões e evidências das versões anteriores; não descreve as fontes ativas do BI. A V7 exclui fatos capturados manualmente de sites, PDFs e snapshots dessas medidas. Em produção, o relatório deve consumir SQL Server/DB2 pelo gateway ou APIs homologadas, com rotina automática de ingestão; arquivos oficiais podem alimentar o banco por ETL homologado. Consulte [ATUALIZACAO_AUTOMATICA_V7.md](ATUALIZACAO_AUTOMATICA_V7.md). A integração institucional ainda precisa ser configurada e validada.

# Arquitetura analítica CREA-SP — V5

A V5 organiza o protótipo como **relatório analítico para computador**, com seis páginas fixas, cinco indicadores de destaque e seis visuais simultâneos por página. A navegação temática fica visível no rodapé; não existe um seletor de subpáginas analíticas ocultas. Filtros e seleção de registros sustentam a investigação do conjunto de dados. Alterar processos, encaminhar casos, emitir autos ou executar tratativas não faz parte do relatório.

O cenário interno é fictício, reproduzível pela semente `20260930`, com competência em 30/09/2026. **O fluxo principal é paulista:** formação presencial em São Paulo, profissionais ativos do recorte CREA-SP, novos registros CREA-SP e contratos publicados por unidades contratantes de SP. Cada fonte pública tem competência e origem próprias. Agregados nacionais preservados no acervo são referências externas identificadas, sem substituir dados de São Paulo. A aplicação React demonstra a experiência; o modelo, as medidas e os recursos precisam ser reproduzidos e validados no Power BI. A entrega não é um `.pbix` nem uma conversão automática.

## Seis páginas com sequência de leitura

| Página | Pergunta principal | Seis análises simultâneas |
| --- | --- | --- |
| Visão integrada | Como cadastro, produção técnica e atividade econômica se conectam? | Evolução combinada de movimentos/estoque; mapa municipal; composição por CNAE principal; fluxo Cadastro → RT → ART; dispersão regional emprego/cadastro; matriz de empresas com fatos relacionados por GRE. |
| Empresas | Como evoluem cadastro, acervo e situação financeira? | Movimentos/estoque cadastral; porte/situação; concentração regional e débito; ART/CAO no tempo; envelhecimento financeiro, ou composição RT para perfil sem acesso financeiro; qualidade cadastral. |
| Profissionais e formação | Qual é o cenário de formação paulista e como a base profissional se liga às empresas? | Ingressantes/concluintes/matrículas SP; modalidades e RT do cadastro fictício; formação presencial SP × novos registros CREA-SP, 2019–2022; relações RT/QSA por modalidade/atividade; ARTs/autores declarados; distribuição das empresas vinculadas por pessoa. |
| Mercado e emprego | Onde se concentram as atividades e como emprego acompanha cadastro? | Admissões/desligamentos/saldo; composição setorial; contexto por CBO com recorte de fonte explícito; crescimento de emprego e base registrada por município; matriz de cobertura CNAE/município; concentração/cobertura com tamanho da bolha por emprego. |
| Contratações | Como se distribuem recursos, fornecedores e produção técnica? | Valor/volume dos contratos internos fictícios; concentração por fornecedor; composição categórica PNCP real; fornecedor/cadastro/RT/ART na ficção; matriz territorial PNCP real; escala contratual/acervo por CNAE interno. |
| Fiscalização | O que históricos, resultados e evidências revelam sobre o conjunto analisado? | Passagens históricas e situação atual; volume/taxa de conclusão por GRE; resultados das conclusões; entradas/conclusões/tempo no mês; contexto econômico/correspondência por CNAE; porte/fatores explicáveis de verificação. |

Os gráficos combinados usam medidas originadas do mesmo livro de fatos, no mesmo eixo temporal, com unidade e escala explícitas. Matrizes, mapa, treemaps, barras, dispersões e fluxos têm funções diferentes: localizar, decompor, comparar, relacionar e selecionar. Uma visualização não é acrescentada apenas para ocupar espaço. O canvas prioriza a leitura simultânea no PC; o detalhamento de registros é contextual e pode possuir sua própria rolagem.

## Fluxo de investigação

1. **Começar na Visão integrada.** Comparar evolução, composição e distribuição; a matriz e o fluxo mostram quais empresas participam de cada fato, sem confundir eventos com pessoas jurídicas.
2. **Selecionar um território, atividade ou subconjunto.** Cliques em gráficos produzem filtros de dimensão ou conjuntos explícitos de empresas/profissionais. Indicadores e visuais pertinentes recalculam a interseção, preservando o contexto na navegação.
3. **Continuar na página temática.** O mesmo recorte empresarial é aprofundado por cadastro, acervo, mercado, contratações ou histórico de fiscalização. Fontes agregadas externas só recebem filtros compatíveis com seu grão.
4. **Ver os registros do recorte.** A tabela pesquisável permite ordenação, paginação, seleção de colunas e exportação autorizada. Uma contagem agregada pode ser rastreada ao conjunto que a originou.
5. **Abrir a ficha contextual.** Consultar uma empresa e suas relações sem transformar o BI em sistema de manutenção cadastral. Dados públicos agregados nacionais/estaduais não são apresentados como atributos dessa empresa.
6. **Consultar definição e origem.** Tooltips, fontes dos visuais e dicionário mostram fórmula, unidade, competência, periodicidade, limitações, versão da regra e área funcional proposta para validação.

Seleção múltipla usa OR dentro de cada dimensão e AND entre dimensões. Filtros persistem no navegador e na URL. Limpar um subconjunto preserva os filtros globais; limpar filtros recupera o universo. A comparação temporal usa janelas com duração correspondente e dados observados, sem estimar anos públicos ausentes ou reatribuir fatos a outras competências.

## União dos dados internos

Empresa é pessoa jurídica pela raiz do CNPJ; estabelecimento é unidade pelo CNPJ completo. Registros e eventos são fatos administrativos próprios. Empresa → RT → profissional, Empresa → ART e Empresa → CAO compartilham chaves explícitas. A ponte CAO/ART impede repetir a ART ao contar referências em várias certidões. A matriz integrada mede presença do fato por empresa; uma empresa pode participar de várias colunas, portanto a soma das colunas não é o total de empresas distintas.

Distribuições aditivas atribuem uma categoria por empresa, usando a matriz visível ou primeiro estabelecimento visível quando necessário. CNAEs secundários participam de filtros sem multiplicar o cadastro mestre. ART e CAO não são eventos intercambiáveis; CAO é acervo da pessoa jurídica, enquanto CAT pertence ao profissional. Adimplência agrega obrigações da empresa e usa denominador financeiro elegível; dívida é estoque, recuperação é fluxo, valor de ART não é arrecadação.

## Profissionais, identidade e vínculo

- **Pessoa → vínculo RT → empresa → intervalo de vigência:** contar pessoas distintas, vínculos e empresas em medidas separadas. Um profissional pode possuir vários vínculos e residir em município diferente das empresas vinculadas. Sem filtro empresarial, profissionais sem empresa permanecem no universo.
- **Pessoa → participação societária → empresa:** QSA é relação distinta de RT e emprego. Somente uma identidade demonstrativa confirmada entra nos cruzamentos; sugestão por nome ou CPF público mascarado não confirma a pessoa, não produz fusão e não vira vínculo técnico.
- **Pessoa → autoria expressa de ART:** a produção profissional depende da ponte de autoria declarada, não é inferida da coincidência com RT vigente. Uma ART pode ter relação empresarial sem autor profissional disponível no recorte.
- **Formação individual fictícia:** os 720 registros declarados do cenário não são microdados INEP. Educação pública não recebe ProfissionalID e não prova qual curso a pessoa fictícia concluiu.

Filtros empresariais atravessam relações RT ou QSA confirmado para formar o subconjunto profissional. Domicílio profissional permanece um papel territorial próprio. Obrigações financeiras da empresa não são atribuídas ao sócio, autor de ART ou responsável técnico.

## Fontes públicas e dimensões compatíveis

| Família de fatos | Grão disponível | Contexto compatível e restrições |
| --- | --- | --- |
| Formação presencial SP | Ano/UF/CINE; em 2024 município IBGE da oferta/CINE. | Município pode selecionar o local da oferta. GRE fictícia, CNAE, porte, empresa, período interno e profissional não filtram conclusões. Não há coorte nominal ou conversão em registro. |
| Comparação principal paulista | Formação SP/ano, presencial Engenharias e Agronomia; novos registros CREA-SP/ano, todas as profissões do Sistema. | Quatro pares observados em 2019–2022. A série de registros SP termina em 2022; 2023/2024 permanecem ausentes e ficam fora da comparação. Local de oferta e cadastro profissional não identificam a mesma população; o visual permanece estadual, sem conversão ou filtro municipal/GRE. |
| Registro profissional CREA-SP | UF = SP/data, no agregado público Confea SIC. | Estoque de todas as profissões do Sistema, distinto de títulos, vínculos RT e cadastros empresariais. Recorte estadual não responde a município/GRE/CNAE/CNPJ fictício. |
| Referências externas do projeto publicado | Formação BR/ano/recorte, situação profissional UF/data, Brasil/CBO/janela. | Acervo nacional preservado com sua definição, sem tratá-lo como estatística paulista. Engenharia estrita, CINE 07 amplo e todas as profissões do Sistema são universos distintos. Remuneração média de movimentações e saldo não identificam pessoas, empresas ou todo o estoque; não aplicar território/empresa fictícios. |
| PNCP observado | Publicação de 01/09/2025/município da unidade contratante/categoria. | Seleção territorial/categórica onde disponível; não aplicar CNAE, porte, GRE fictícia, profissional ou CNPJ. Não é uma série mensal. Serviços não determina engenharia ou obrigação CREA. |
| Emprego agregado interno demonstrativo | Município/CNAE/CBO/mês. | Compartilha dimensões de atividade, território e tempo; não contém EmpresaID ou ProfissionalID. Filtros exclusivos de empresas não se tornam emprego dessas empresas. |

A dimensão município conecta códigos, não identidades: local da empresa, domicílio profissional, oferta de curso e unidade contratante são papéis distintos. CINE, CNAE, CBO e título/modalidade profissional não têm equivalência automática. A GRE interna usa associação demonstrativa; bases reais exigem um mapeamento territorial oficial e versionado. Relações de produção devem ser unidirecionais, sem caminho fato → fato que atribua dados agregados a uma ficha individual.

Na comparação de formação SP × novos registros CREA-SP, os pares são 36.637/18.245 em 2019, 33.561/15.603 em 2020, 29.168/16.966 em 2021 e 26.407/14.917 em 2022. A primeira medida conta conclusões presenciais de cursos ofertados em SP; a segunda, novos registros de todas as profissões no CREA-SP. Registro pode decorrer de formação em outra UF ou ano. Não dividir os valores para chamar o resultado de taxa de registro de egressos, nem subtrair para estimar diplomados sem registro.

Os dados públicos são reais observados ou reproduzidos de fonte identificada. Os 29 JSON do projeto do usuário preservam confiança atribuída ao autor, **sem nova auditoria primária de cada fonte citada**. A conferência oficial independente da formação SP cobre matrículas; concluintes e ingressantes possuem método inspecionado e reconciliação interna. Fontes, hashes, competências e limites estão em [SOURCES.md](SOURCES.md).

## Fiscalização: página exclusiva, somente leitura

O domínio concentra históricos, passagens, resultados, tempos, fatores de verificação e contexto econômico. Casos acumulados, empresas distintas e conclusões no período têm denominadores próprios. Conclusão de caso não implica autuação; ausência de correspondência ou vínculo identificado não implica infração. Eventos de auto, defesa e decisão permanecem conceitualmente separados.

O fluxo mostra passagens registradas e saída atual por caso, sem sugerir transições que não ocorreram. Regras de prioridade são demonstrativas, explicáveis e destinadas à validação humana; o relatório não executa encaminhamento, alteração de status, classificação operacional ou emissão de penalidades. Classificações textuais são regras determinísticas versionadas, sem alegar um modelo de IA treinado.

## Destino no Power BI e governança

Preparar tabelas internas em `data-demo/` e públicas em `data-publica/`, com manifestos separados. O segundo diretório exporta nove fatos CSV, 1.055 linhas e `seed: null`; controles estaduais/nacionais não devem ser somados aos detalhes. Dimensões, cardinalidades, unidade e regras temporais estão em [MODELO_DADOS.md](MODELO_DADOS.md); recursos, DAX e adaptação do relatório em [POWER_BI.md](POWER_BI.md).

As páginas temáticas correspondem ao navegador de páginas; filtros a segmentações sincronizadas; subconjuntos a seleção cruzada e drillthrough; ficha a página de detalhe; definições a tooltips de relatório. Perfis na interface são uma demonstração, não autenticação ou RLS. Dados internos reais exigem segurança no serviço, proteção financeira, recortes regionais validados e controle de exportação. Não usar publicação pública irrestrita para dados sensíveis.

A composição foi orientada pelos [painéis enviados no Drive](REFERENCIAS_DRIVE_V5.md) e por [referências de design Power BI](REFERENCIAS_VISUAIS_V5.md). Os dados e métodos acessados nos [projetos do usuário](REPOSITORIOS_USUARIO_V5.md), a [formação SP](DADOS_EXTERNOS_V5.md) e a [consulta PNCP](REPOSITORIOS_DADOS_V5.md) têm rastreabilidade própria. A V4 permanece arquivada em [ARQUITETURA_BI_V4.md](ARQUITETURA_BI_V4.md), identificada como histórica.
