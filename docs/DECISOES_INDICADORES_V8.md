# CREA-SP — indicadores que sustentam decisões, versão 8

## Critério de seleção

Um indicador executivo só entra quando identifica uma decisão, possui unidade e denominador verificáveis, tem relacionamento real com outros fatos e permite investigar os registros que o originaram. A quantidade de palestras, coworkings ou publicações não foi usada para definir a visão executiva. A crítica à comunicação institucional serviu como contexto, sem gerar conclusões sobre favorecimento ou qualidade da gestão.

A tela agora parte da base técnica paulista e conecta **cadastro → vínculo técnico → autoria e produção → recebimentos → contexto econômico**. Fiscalização digital permanece no seu domínio próprio. A visão executiva não mede produtividade de fiscais nem exibe tarefas operacionais.

Os números atuais derivam exclusivamente da base relacional demonstrativa, com semente fixa. A carga de produção está prevista em **SQL Server e DB2 através do gateway**, com views homologadas, mais APIs e cargas estruturadas autorizadas. Não há números transcritos de prints, sites ou PDFs nos indicadores desta tela.

## Seis perguntas da visão executiva

| Pergunta | Decisão apoiada | Medida e unidade | Relação e caminho de investigação | Limites |
|---|---|---|---|---|
| A base cresce ou perde registros? | Identificar mudança persistente na base, distinguir abertura de perda ou reativação e avaliar sua concentração territorial/por atividade. | Entradas = novos registros + reativações; saídas = baixas + cancelamentos; saldo = entradas − saídas; linha = estoque de **registros** ativos por competência. | Livro de movimentos → registro → estabelecimento → empresa; clique na entrada/saída abre apenas as empresas daquele tipo de evento. Clique no estoque abre empresas com registro ativo no mês selecionado. | Registro não é pessoa nem CNPJ raiz. Vistos e registros novos não equivalem automaticamente a novas empresas. A janela anterior usa a mesma coorte selecionada. |
| A base ativa mantém vínculo técnico? | Identificar lacunas de vínculo/dados que justificam validação cadastral e conhecer a continuidade técnica da base registrada. | **Empresas distintas com ao menos um registro ativo**, particionadas entre com e sem RT vigente na data de corte. | Empresa → registro ativo → vínculo técnico com vigência; barras por GRE, clique no segmento seleciona exclusivamente a interseção daquela GRE/situação. | Não é irregularidade automática. Vários registros, estabelecimentos e profissionais não multiplicam uma empresa. RT vigente não presume autoria de ART. |
| Quem tem autoria técnica observada? | Conhecer a parcela do cadastro profissional ativo com produção observada na fonte e identificar grupos para estudar relacionamento e qualidade da informação. | Pessoas com cadastro **ativo** → com/sem autoria expressa de ART na janela; taxa = autores ativos distintos / pessoas ativas distintas. | Pessoa → ponte explícita de autoria → ART, com modalidade e domicílio profissional; clique preserva os IDs das pessoas selecionadas. | Sem ART observada não significa desemprego, inatividade ou infração. Modalidade é um campo único na demonstração; no modelo real com múltiplos títulos/modalidades, categorias sobrepostas não podem ser somadas como pessoas. |
| A produção cresce com mais profissionais? | Distinguir aumento do volume de ART de ampliação ou concentração da participação profissional. | Coluna = ARTs mensais; linha = **autores distintos mensais**; total da janela recalculado como DISTINCT. | ART → ponte de autoria explícita → profissional. Clique no volume abre empresas relacionadas; clique na linha abre os autores efetivos daquele mês. | Não somar autores distintos mensais para obter o distinto anual. ART sem autor disponível permanece no volume e tem ausência identificada. A fonte demonstrativa não distingue ART inicial/complementar/substituição nem obra/serviço/cargo e função. |
| Quanto entra e quanto é recuperado? | Entender o fluxo efetivo de caixa do universo empresarial e a participação da recuperação de obrigações. | Recebimentos pela **data de pagamento**, não pela competência de vencimento. Colunas empilhadas: recuperação + demais recebimentos = total recebido. | Obrigação empresarial → pagamento com data e valor → registro/empresa; clique identifica empresas pagantes. | Recuperação é subconjunto do recebido. Saldo vencido é estoque separado, não soma com recebimentos. Não representa toda a arrecadação do CREA-SP. Valor de obra/serviço de ART não é receita do conselho. |
| Onde economia e base ativa divergem? | Identificar territórios onde a dinâmica do emprego formal e a evolução da base empresarial registrada merecem análise mais aprofundada do contexto. | X = crescimento do estoque de emprego; Y = crescimento de empresas distintas com registro ativo; bolha = estoque final de empregos; ambos na mesma GRE e nos mesmos fins de mês. | Dimensões município → GRE e competência; a empresa recebe uma única alocação territorial; emprego permanece agregado por município/CNAE/CBO. Clique segmenta a GRE. | Associação territorial não prova causalidade, identifica trabalhadores ou estabelece obrigação de registro. Bases iniciais zero não geram taxa artificial. Filtros que existem só no cadastro empresarial tornam a comparação indisponível para evitar universos incompatíveis. |

## Denominadores e alocação territorial

- Continuidade técnica usa somente empresas com registro ativo. O antigo denominador de todas as empresas historicamente registradas não responde à pergunta sobre a base ativa.
- A unidade empresa corresponde ao CNPJ raiz/modelo de empresa. Uma empresa pode possuir diversos estabelecimentos, registros e vínculos.
- Cada empresa recebe uma GRE pela matriz **visível no recorte**; quando só filiais são visíveis, usa-se a primeira filial por ID estável. A alocação representa a empresa neste recorte, não a localização de todas as suas atividades. Os grupos menores são reunidos em “Demais GREs”, preservando o total.
- O território do profissional é seu domicílio cadastral. Esse papel difere do território do estabelecimento e do local da obra/serviço. Um profissional domiciliado em uma GRE pode produzir ART relacionada a uma empresa de outra GRE.
- A modalidade no cadastro demonstrativo é única por profissional. A versão real deve estabelecer uma categoria principal homologada para uma composição exclusiva, ou usar modalidade apenas como segmentação de um DISTINCT, informando a sobreposição entre títulos.
- A cobertura de autoria identificada é mostrada no subtítulo e tooltip do painel: ARTs com autor na ponte / todas as ARTs disponíveis daquela fonte. Cobertura incompleta pode ocultar participação; o indicador representa apenas autoria observada, não taxa real de atuação profissional.
- Autoria é uma ponte declarada de ART, nunca inferida de sociedade, RT ou emprego agregado. A demonstração identifica a ponte como sintética; a integração real exige autoria expressa na fonte.
- A análise do contexto econômico usa estoques de emprego e empresas ativas reconstruídos nos mesmos fins de mês. Não soma estoques mensais. Admissões e desligamentos são fluxos separados na página de mercado.

## Financeiro e comparação de períodos

As somas monetárias são feitas em centavos inteiros. Recebimentos exigem valor positivo e data de pagamento observada. Pagamentos antecipados podem entrar no caixa mesmo com vencimento futuro. Pagamentos futuros não entram no caixa atual e não reduzem o vencido antes da sua data. Obrigações sem data de pagamento não têm seu recebimento imputado a um mês.

Recuperação é uma classificação da fonte financeira: só entram pagamentos marcados como recuperados. Não inferir recuperação apenas porque um vencimento foi ultrapassado. Recebido e recuperado não são somados como totais independentes.

Para uma competência atual parcial, produção e caixa comparam a mesma quantidade de dias corridos da competência anterior equivalente, limitada ao fim do mês. O quadro de produção não apresenta valor de ART como faturamento. O quadro de recebimentos não inventa categorias contábeis, metas ou receita geral não presentes no modelo.

A restrição de perfil oculta gráficos financeiros, tooltips, valores e exportações correspondentes. A demonstração de perfil no navegador não substitui RLS, permissões de banco ou acesso do Power BI Service.

## Uso pela Presidência e áreas

- Presidência/Diretoria: mudança da base técnica, participação observada dos profissionais, caixa empresarial e contexto econômico territorial; nenhum KPI de publicidade substitui essas evidências.
- Área cadastral/colegiados: investigar eventos de entrada/saída, diferenças entre registros e pessoas/empresas e ausência de vínculos disponíveis. CAO e CAT mantêm seus próprios fatos, sem fusão artificial com ART.
- Administrativa-Financeira: conciliar recebimentos por data e recuperar carteira com estoque vencido separado; expandir para plano de contas e metas apenas com fatos e orçamento homologados.
- Comunicação/relacionamento: usar a distribuição dos profissionais ativos e a participação técnica observada como contexto para relacionamento; ausência de autoria não autoriza classificar alguém como desempregado.
- Tecnologia/dados: garantir vigências, integridade referencial, chaves de autoria, competências compatíveis e logs de atualização das views e APIs.
- Fiscalização: sinais digitais de CNAE/Receita, PNCP e fontes compatíveis de emprego são analisados em página própria, com motivo, evidência e limites. Avaliar o desempenho do serviço de fiscalização não é a finalidade deste BI.

## Contratos para futura carga

A carga real precisa preservar a chave da pessoa, CNPJ completo/raiz, estabelecimento, registro/visto e competências. São necessários eventos históricos de status para reconstruir estoque; vínculos com início/fim; ART com autoria declarada; pagamentos com data/valor e identificador de recuperação; e fatos de emprego agregados na granularidade publicada.

Campos de tipo/finalidade de ART vistos nos anexos entram no contrato de dados, não são inventados na demonstração. Modalidades multivaloradas exigem ponte de habilitações e regras de contagem. Metas e conta contábil exigem fatos próprios. Uma view que oferece apenas snapshot não deve ser apresentada como histórico reconciliado.

## Recursos Power BI previstos

- Evolução e produção: gráficos combinados de colunas/linha com eixos e medidas explícitos.
- Continuidade e engajamento: barras empilhadas, medidas de contagem distinta e parâmetros de agrupamento.
- Recebimentos: colunas empilhadas por classificação financeira, medidas de caixa e comparação com corte equivalente.
- Economia: dispersão com medidas de estoque inicial/final por GRE, calendário comum e condições para universos comparáveis.
- Segmentos e autores: drillthrough para tabela de registros ou pessoas e respectiva ficha.
- Fontes/limites: tooltips de relatório, dicionário de medidas e data da última carga do gateway/API.

## Validação

`tests/executive-decisions-v8.test.ts` cobre exclusividade da base ativa, alocação territorial determinística, autoria explícita, distinto mensal versus anual, pagamentos por data, recuperação como subconjunto, pagamento antecipado/parcial/futuro, corte equivalente de comparação, reconstrução histórica de estoque, incompatibilidade de universos agregados e recortes vazios.
