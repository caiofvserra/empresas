> **Arquivo histórico — substituído pela diretriz V7.** O conteúdo abaixo preserva decisões e evidências das versões anteriores; não descreve as fontes ativas do BI. A V7 exclui fatos capturados manualmente de sites, PDFs e snapshots dessas medidas. Em produção, o relatório deve consumir SQL Server/DB2 pelo gateway ou APIs homologadas, com rotina automática de ingestão; arquivos oficiais podem alimentar o banco por ETL homologado. Consulte [ATUALIZACAO_AUTOMATICA_V7.md](ATUALIZACAO_AUTOMATICA_V7.md). A integração institucional ainda precisa ser configurada e validada.

# Resultados institucionais do CREA-SP — especificação para Power BI, V6

Esta revisão acrescenta à visão executiva perguntas sobre **acesso, uso dos recursos, rastreabilidade e resultados dos serviços oferecidos aos profissionais de São Paulo**. Permite distinguir quantidade divulgada, público identificado, capacidade utilizada e resultado acompanhado. Não há medida que atribua favorecimento, superestimação ou efeito causal à administração: essas hipóteses exigem documentos e investigação próprios.

A pesquisa institucional está em [INTELIGENCIA_GESTAO_CREA_SP_V6.md](INTELIGENCIA_GESTAO_CREA_SP_V6.md). As regras executáveis estão em [`institutional.ts`](../src/domain/institutional.ts), e o dicionário em [`institutional-indicators.ts`](../src/domain/institutional-indicators.ts). São propostas analíticas para validação; o protótipo React não produz um arquivo PBIX automaticamente.

## Informação para decidir

| Pergunta de gestão | Informação a comparar no mesmo recorte | Decisão que os dados podem apoiar |
| --- | --- | --- |
| A oferta alcança profissionais ou concentra recorrências? | Inscrições, presenças, profissionais identificados distintos, presenças sem identificação e participação territorial. | Conferir rastreabilidade; examinar público, calendário e critérios de acesso; ampliar oferta onde há necessidade documentada. |
| O gasto acompanha a entrega efetiva? | Planejado e executado por programa/território/mês; presença identificada; custo por participante com denominador declarado. | Rever custo e desenho da oferta, depois de validar identificação, composição dos custos e demanda. |
| Coworkings são utilizados? | Capacidade de posições-hora, utilização registrada, usuários distintos e custo por hora utilizada. | Adequar horários, capacidade e localização com estudo de demanda; contar unidades abertas separadamente do uso. |
| Há evidência de aplicação depois da formação? | Acompanhamentos maduros após 90 dias, respondidos, não respondidos e categorias autodeclaradas. | Melhorar o seguimento e o conteúdo; verificar barreiras e buscar evidências adicionais de aplicação. |
| O serviço cadastral/orientação atende em prazo consistente? | Coorte de solicitações, pendências, maturação, resoluções no prazo e fora do prazo. | Identificar gargalos e necessidade de capacidade; não excluir a fila da avaliação do prazo. |
| O gasto se distribui em relação ao cadastro? | Parcela do gasto no local da oferta × parcela do cadastro pelo domicílio, com mobilidade e público atendido explícitos. | Examinar a distribuição e as necessidades; diferença isolada não demonstra privilégio. |

Essas perguntas complementam os domínios já existentes. As análises de casos, autos, prioridades e resultados fiscalizatórios continuam em **Fiscalização**. Não há uma página por superintendência nem ações para tratar solicitações no BI.

## Áreas e validação

O organograma de março de 2026 enviado pelo usuário identifica SUPADF — Administrativa-Financeira; SUPCOL — dos Colegiados; SUPFIS — Fiscalização; SUPTEC — Tecnologia e Inovação; SUPCOR — Comunicação e Relacionamento. A UDE — Unidade de Inteligência de Dados e Informações Estratégicas consta no GABI. A estrutura está registrada em [SOURCES.md](SOURCES.md).

O dicionário sugere validação conjunta do gestor do programa, área financeira, área de serviço e UDE conforme o indicador. Essas indicações **não são atribuições formais já designadas**, metas aprovadas ou validação institucional das fórmulas. Os responsáveis e a vigência da estrutura precisam ser homologados pelo CREA-SP antes da implantação.

## Dois conjuntos de evidências separados

| Conjunto | Conteúdo e competência | Tratamento |
| --- | --- | --- |
| Publicação oficial CREA-SP | 13 agregados do Sumário Executivo — Relatório de Gestão 2025. Fonte pública, recorte estadual, exercício 2025. | Mostrar unidade, precisão, página e ressalva. São números declarados pelo Conselho, não auditoria dos registros de origem. |
| Modelo institucional demonstrativo | Oferta, inscrição/presença, orçamento, capacidade/uso, seguimento e solicitações; semente fixa da base interna, corte 30/09/2026. | Todos os custos, participantes e resultados são fictícios e ligados às entidades existentes. Não representam a gestão real. |

O [PDF oficial](https://www.creasp.org.br/wp-content/uploads/2026/03/sumario_executivo2025.pdf) foi lido em 11/10/2026. Tem 32 páginas físicas e SHA-256 `85b617205d8c1a9d4d2ae41330abf3cc3a29ebfce02997b56cdc4f3d4ee5ed4e`. A transcrição em [`creasp-management-public.json`](../src/domain/creasp-management-public.json) conserva fonte, página física, unidade, ano, `valueKind` e `displayValue`.

Para programas, a publicação informa **32 cursos**, **mais de 30 mil espectadores**, **600 horas de conteúdo**, **mais de 5 mil certificados**, **37 unidades CreaLab Coworking**, **dois Espaços CreaLab** e **mais de seis mil usuários**. Nas seções consultadas não foi informado o método de deduplicação. Espectadores, certificados e usuários não são uma mesma coorte de pessoas. Não calcular certificados/espectadores como taxa de conclusão, somar as duas categorias de espaços sob o rótulo de coworkings ou atribuir custos fictícios a esses agregados.

`value` de uma linha com `valueKind = lowerBound` conserva o número-base publicado; não é um total exato. Exibir `displayValue`, que preserva `>` ou aproximação. Não somar os 13 indicadores: seus grãos são distintos. A publicação anual estadual mantém seu recorte perante filtros de município, GRE, CNAE, porte, período interno ou pessoa fictícia. Números fiscalizatórios dessa fonte são contexto de Fiscalização, não medidas dos programas.

## Modelo semântico institucional

O modelo deriva dos mesmos 600 profissionais fictícios e dos municípios paulistas da base interna. Não cria CPF, identidades de beneficiários reais, relações pessoais com dirigentes ou cruzamentos nominais de emprego. Município de oferta, unidade de coworking, atendimento e domicílio profissional são **papéis territoriais próprios**. As associações com GRE permanecem demonstrativas e precisam de uma tabela oficial versionada.

| Entidade do código | Tabela proposta no Power BI | Grão / chaves e unidade |
| --- | --- | --- |
| `programs` | `DimPrograma` | ProgramaID; modo de participação distingue formação/orientação, coworking e serviço. |
| `activities` | `DimAtividade` e `FatoOferta` | AtividadeID, ProgramaID, data, município/GRE da oferta; custo direto em centavos e capacidade declarada. |
| `participation` | `FatoParticipacao` | ParticipaçãoID; uma inscrição por atividade × profissional quando a identidade é conhecida; ausência de ProfissionalID explícita; presença como atributo da ocorrência. |
| `budgetEntries` | `FatoOrcamentoPrograma` | ProgramaID × município da oferta × mês; planejado e executado, custo direto e demais custos, em centavos inteiros. |
| `coworkUnits` | `DimUnidadeCowork` | UnidadeID; município, posições, data de abertura. |
| `coworkMonths` | `FatoCapacidadeCowork` | UnidadeID × mês; UnidadeMesID, AtividadeID de referência e posições-hora disponíveis. |
| `coworkUsage` | `FatoUsoCowork` | UsoID, UnidadeMesID, ProfissionalID, posições-hora utilizadas; registro de utilização demonstrativo. |
| `followups` | `FatoSeguimento` | AcompanhamentoID; AtividadeID × ProfissionalID; data de elegibilidade após 90 dias, resposta/data e uma categoria de resultado por resposta. |
| `serviceRequests` | `FatoSolicitacaoServico` | SolicitaçãoID; criação, resolução, categoria, alvo demonstrativo de 14 dias e ProfissionalID **ou** EmpresaID conforme o tipo de solicitante. |
| `managementResults.facts` | `FatoResultadoPublicadoCREASP` | IndicadorID × exercício × UF; agregado público com unidade, precisão e página de origem; sem pessoa, empresa, evento ou processo nominal. |

Usar dimensões de programa, calendário/competência, território da oferta, unidade, profissional e tipo de serviço com relações 1:* e sentido único. Custos e participações são fatos paralelos; não criar uma tabela pessoa × atividade × orçamento que replique despesas. Capacidade e uso também são fatos paralelos: uma dimensão de unidade/mês pode conformar as chaves, sem relação fato → fato.

`activities.costCents` é a parcela direta incluída em `budgetEntries.activityCostCents`. `coworkMonths.executedCents` também está incluído na execução do programa. **Não somar novamente** esses valores ao orçamento. Por linha, `executedCents = activityCostCents + otherExecutedCents`. Planejado é comparação, não despesa adicional. Em produção, separar os estágios contábeis de empenho, liquidação e pagamento e registrar critérios de alocação; o cenário não alega reproduzir esses estágios.

Identificador ausente permanece em branco no fato de participação e fora do `DISTINCTCOUNT` de pessoas. Não substituir o branco por uma pessoa única genérica nem por um ID novo por ocorrência. Em dados reais, identidade precisa de chave pseudonimizada, base legal, critério de validação e controle de acesso.

## Filtros, coortes e investigação

| Contexto | Propagação válida |
| --- | --- |
| Período, programa, município/GRE da oferta | Oferta, participação, orçamento, uso/capacidade, seguimento da oferta e solicitações pertinentes. Regras de maturação usam a mesma data de corte. |
| Seleção de profissionais | Participações, uso **da coorte**, acompanhamentos e solicitações identificadas desses profissionais. Não converte custo fixo em gasto individual. |
| Seleção de atividades | Ocorrências e acompanhamentos das atividades; uso da coorte quando existir a chave explícita. Não rateia orçamento/capacidade integral. |
| CNAE, porte, situação empresarial, CBO, busca ou subconjunto de empresas | Não restringem o universo institucional. Não são dimensões disponíveis dos programas; o aviso de contexto expõe os filtros ignorados. |
| Cadastro profissional domiciliado | Referência territorial separada para alcance e parcela cadastral; não atribui domicílio pelo local da oferta. |
| Resultados publicados CREA-SP/2025 | Estado e exercício fixos; não recebem filtros nominais do cenário demonstrativo. |

No modelo executável, orçamento e capacidade mantêm o grão integral de território/programa/período mesmo quando uma pessoa ou atividade é selecionada. A ocupação institucional usa **todo o uso observado** desse recorte; uso da coorte é uma medida separada. O custo por participante fica `null` sob seleção de pessoas/atividades, pois não há regra de alocação nominal. No Power BI, reproduzir essas interações explicitamente; não deixar um clique reduzir silenciosamente só o denominador.

Uma opção é usar tabelas desconectadas `SelecaoProfissional` e `SelecaoAtividade` para drillthrough de coorte. Aplicar suas chaves com `TREATAS` apenas às medidas de coorte, preservando as medidas de orçamento/capacidade/uso institucional. Com relações ativas por identidade, as medidas integrais devem remover somente o filtro de coorte, mantendo programa, município e período. As relações e medidas precisam ser validadas com os mesmos casos de seleção do protótipo.

O fluxo é **programa/território → atividade ou público observado → profissionais identificados → evidências de participação/seguimento**, com retorno ao contexto original. Os detalhes são somente leitura. Selecionar participantes não autoriza chamar o grupo de pessoas beneficiadas; benefício requer definição e evidência própria.

## DAX de referência: identidade e custos

Os nomes abaixo são normalizados no Power Query. As datas e tipos precisam ser definidos; valores monetários são convertidos de centavos uma única vez. Os exemplos pressupõem dimensões conformadas, um corte selecionado em `DimCorte[Data]` e ausência de caminhos bidirecionais entre fatos. São referências a validar no PBIX.

```dax
Inscricoes = COALESCE ( COUNTROWS ( FatoParticipacao ), 0 )

Presencas =
CALCULATE (
    COALESCE ( COUNTROWS ( FatoParticipacao ), 0 ),
    KEEPFILTERS ( FatoParticipacao[Presente] = TRUE () )
)

Presencas Identificadas =
CALCULATE (
    [Presencas],
    KEEPFILTERS ( NOT ISBLANK ( FatoParticipacao[ProfissionalID] ) )
)

Participantes Identificados =
CALCULATE (
    COALESCE ( DISTINCTCOUNTNOBLANK ( FatoParticipacao[ProfissionalID] ), 0 ),
    KEEPFILTERS ( FatoParticipacao[Presente] = TRUE () )
)

Cobertura Identificacao = DIVIDE ( [Presencas Identificadas], [Presencas] )
Presencas Sem Identificacao = [Presencas] - [Presencas Identificadas]
Presencas Adicionais = [Presencas Identificadas] - [Participantes Identificados]
Comparecimento = DIVIDE ( [Presencas], [Inscricoes] )

Planejado R$ = DIVIDE ( COALESCE ( SUM ( FatoOrcamentoPrograma[PlanejadoCentavos] ), 0 ), 100 )
Executado R$ = DIVIDE ( COALESCE ( SUM ( FatoOrcamentoPrograma[ExecutadoCentavos] ), 0 ), 100 )
Execucao sobre Planejado = DIVIDE ( [Executado R$], [Planejado R$] )

Executado Formacao Orientacao R$ =
CALCULATE (
    [Executado R$],
    KEEPFILTERS ( DimPrograma[ModoParticipacao] = "attendance" )
)

Custo por Participante Identificado R$ =
VAR CoorteAtiva =
    ISFILTERED ( SelecaoProfissional[ProfissionalID] )
        || ISFILTERED ( SelecaoAtividade[AtividadeID] )
RETURN
    IF (
        CoorteAtiva,
        BLANK (),
        DIVIDE ( [Executado Formacao Orientacao R$], [Participantes Identificados] )
    )
```

Não somar distintos mensais para obter o distinto do ano. `Presencas Adicionais` conta ocorrências além da primeira, não pessoas recorrentes e não duplicidades indevidas. Custo por participante inclui o custo integral de formação/orientação e participantes identificados distintos do mesmo recorte; identificação incompleta altera a interpretação. Não substituir `BLANK()` por zero em razões sem denominador ou em custo de coorte.

Com seleções desconectadas, a medida de coorte aplica somente as chaves selecionadas. O exemplo abaixo preserva OR entre pessoas/atividades de cada seleção e AND entre as duas seleções. As demais medidas de coorte repetem o mesmo padrão em suas tabelas pertinentes, enquanto orçamento e capacidade permanecem integrais.

```dax
Presencas da Coorte =
VAR FiltraPessoa = ISFILTERED ( SelecaoProfissional[ProfissionalID] )
VAR FiltraAtividade = ISFILTERED ( SelecaoAtividade[AtividadeID] )
VAR Pessoas = VALUES ( SelecaoProfissional[ProfissionalID] )
VAR Atividades = VALUES ( SelecaoAtividade[AtividadeID] )
RETURN
    SWITCH (
        TRUE (),
        FiltraPessoa && FiltraAtividade,
            CALCULATE (
                [Presencas],
                KEEPFILTERS ( TREATAS ( Pessoas, FatoParticipacao[ProfissionalID] ) ),
                KEEPFILTERS ( TREATAS ( Atividades, FatoParticipacao[AtividadeID] ) )
            ),
        FiltraPessoa,
            CALCULATE (
                [Presencas],
                KEEPFILTERS ( TREATAS ( Pessoas, FatoParticipacao[ProfissionalID] ) )
            ),
        FiltraAtividade,
            CALCULATE (
                [Presencas],
                KEEPFILTERS ( TREATAS ( Atividades, FatoParticipacao[AtividadeID] ) )
            ),
        [Presencas]
    )
```

## DAX de referência: capacidade e seguimento

```dax
Posicoes Horas Disponiveis = COALESCE ( SUM ( FatoCapacidadeCowork[PosicoesHorasDisponiveis] ), 0 )
Posicoes Horas Usadas Institucional = COALESCE ( SUM ( FatoUsoCowork[PosicoesHorasUsadas] ), 0 )
Ocupacao Cowork =
DIVIDE ( [Posicoes Horas Usadas Institucional], [Posicoes Horas Disponiveis] )

Executado Cowork R$ =
CALCULATE (
    [Executado R$],
    KEEPFILTERS ( DimPrograma[ProgramaID] = "coworkings" )
)

Custo por Hora Utilizada R$ =
DIVIDE ( [Executado Cowork R$], [Posicoes Horas Usadas Institucional] )

Acompanhamentos Elegiveis =
VAR Corte = SELECTEDVALUE ( DimCorte[Data] )
RETURN
    IF (
        NOT ISBLANK ( Corte ),
        COALESCE (
            COUNTROWS ( FILTER ( FatoSeguimento, FatoSeguimento[DataElegibilidade] <= Corte ) ),
            0
        )
    )

Acompanhamentos Respondidos =
VAR Corte = SELECTEDVALUE ( DimCorte[Data] )
RETURN
    IF (
        NOT ISBLANK ( Corte ),
        COALESCE (
            COUNTROWS (
                FILTER (
                    FatoSeguimento,
                    FatoSeguimento[DataElegibilidade] <= Corte
                        && FatoSeguimento[Respondido] = TRUE ()
                        && NOT ISBLANK ( FatoSeguimento[DataResposta] )
                        && FatoSeguimento[DataResposta] <= Corte
                )
            ),
            0
        )
    )

Cobertura Seguimento = DIVIDE ( [Acompanhamentos Respondidos], [Acompanhamentos Elegiveis] )

Aplicacao Relatada =
CALCULATE (
    [Acompanhamentos Respondidos],
    KEEPFILTERS ( FatoSeguimento[Resultado] = "Aplicação profissional relatada" )
)

Aplicacao entre Respostas = DIVIDE ( [Aplicacao Relatada], [Acompanhamentos Respondidos] )
```

As duas medidas de posições-hora acima são institucionais e não recebem as tabelas desconectadas de coorte. Se forem usadas relações ativas por pessoa/atividade, essa independência deve ser reproduzida na medida de uso institucional antes de calcular ocupação. Calcular razão das somas, não média simples das ocupações das unidades. Unidade aberta, reserva, presença e uso são fatos distintos; o cenário gera uso, não uma base real de reservas/no-show.

Elegibilidade do seguimento depende de `data da atividade + 90 dias <= corte`; recalcular no corte, em vez de usar cegamente um booleano armazenado para outra data. O filtro de oferta segue a data da atividade; o evento de resposta tem outra data. Uma pessoa pode responder por várias atividades. A distribuição de resultados tem o grão **acompanhamento**, não pessoa. Aplicação, aprendizado e ausência de mudança reconciliam com as respostas; não resposta e acompanhamento imaturo ficam separados.

Não há medida de “emprego gerado” no modelo. Uma ART, contratação ou alteração cadastral posterior não pode ser atribuída ao programa apenas pela ordem das datas. Avaliação causal exigiria desenho, grupo comparável, condições anteriores e hipóteses próprias; acompanhamento autodeclarado é informação limitada de resultado observado.

## DAX de referência: prazo de serviços sem ocultar pendências

O cenário usa `PrazoAlvoDias = 14` em dias corridos. É **alvo demonstrativo**, não prazo normativo ou SLA oficial do CREA-SP. Solicitações criadas na janela formam a coorte; não representam toda a fila histórica anterior. Demanda madura alcança `DataCriacao + PrazoAlvoDias <= corte`, incluindo a data-limite no corte.

```dax
Solicitacoes = COALESCE ( COUNTROWS ( FatoSolicitacaoServico ), 0 )

Solicitacoes Maduras =
VAR Corte = SELECTEDVALUE ( DimCorte[Data] )
RETURN
    IF (
        NOT ISBLANK ( Corte ),
        COALESCE (
            COUNTROWS (
                FILTER (
                    FatoSolicitacaoServico,
                    FatoSolicitacaoServico[DataCriacao]
                        + FatoSolicitacaoServico[PrazoAlvoDias] <= Corte
                )
            ),
            0
        )
    )

Maduras Resolvidas no Prazo =
VAR Corte = SELECTEDVALUE ( DimCorte[Data] )
RETURN
    IF (
        NOT ISBLANK ( Corte ),
        COALESCE (
            COUNTROWS (
                FILTER (
                    FatoSolicitacaoServico,
                    FatoSolicitacaoServico[DataCriacao]
                        + FatoSolicitacaoServico[PrazoAlvoDias] <= Corte
                        && NOT ISBLANK ( FatoSolicitacaoServico[DataResolucao] )
                        && FatoSolicitacaoServico[DataResolucao] <= Corte
                        && FatoSolicitacaoServico[DataResolucao]
                            <= FatoSolicitacaoServico[DataCriacao]
                                + FatoSolicitacaoServico[PrazoAlvoDias]
                )
            ),
            0
        )
    )

Resolucao no Prazo Coorte Madura =
DIVIDE ( [Maduras Resolvidas no Prazo], [Solicitacoes Maduras] )
```

As demais classes são maduras resolvidas **depois** do alvo, com resolução até o corte, e maduras ainda abertas no corte. As três classes reconciliam com a coorte madura. As imaturas não entram como falha de prazo. Uma pendência na própria data-limite é identificada como pendência madura do corte, sem alegar que o prazo legal já foi violado.

Média e mediana de dias de resolução usam somente `DataResolucao <= corte`. Exibir também pendências e idade: tempo final dos casos rápidos não resume a fila. Em produção, definir marcos de contagem, dias úteis, suspensão, categoria e complexidade e versionar a política antes de apresentar cumprimento de prazo oficial.

## Alcance e distribuição territorial

O alcance identificado divide a **interseção** dos participantes com profissionais domiciliados no território pelo cadastro domiciliado e registrado até o corte. Participante visitante conta como atendido na oferta, mas não como parte do cadastro local. Não usar o estoque público Confea/2026 como denominador de uma coorte fictícia, nem o agregado anual CREA-SP/2025 como sua validação.

A comparação de parcela de gasto × parcela do cadastro conserva papéis distintos: gasto pelo local de oferta; cadastro pelo domicílio. Não é um índice oficial de equidade. Uma diferença pode refletir atendimento intermunicipal, demanda, infraestrutura ou decisões ainda não documentadas. Em produção, acrescentar elegibilidade, acessibilidade, demanda não atendida e critério de distribuição com histórico.

## Recursos visuais e governança

Manter seis painéis simultâneos na visão executiva PC: quadro de resultados publicados/limites; planejado × executado × público identificado por programa; capacidade/uso/custo dos coworkings; distribuição territorial de gasto/público × cadastro domiciliado; seguimento maduro/respostas/resultado; prazo e pendências de serviços. Presenças e cobertura de identidade aparecem nos indicadores, tooltips e detalhamento; o perfil sem acesso financeiro recebe inscrições/presenças/pessoas no combinado de programas. Usar combinação de colunas/linha, barras de composição e dispersão quando sua unidade e função forem claras. Comparação temporal recalcula janelas observadas; não estende artificialmente a série pública anual.

Segmentações sincronizadas representam território e período pertinentes; programas podem ser seleção local explícita. Tooltips mostram nome, conceito, fórmula, unidade, fonte, competência, periodicidade, limitações, versão e responsável proposto. Native cards, gráficos combinados, matrizes e drillthrough reproduzem as funções principais. Seleção e exportação são analíticas, sem manutenção de pedidos, penalidades ou decisões no canvas.

O perfil demonstrativo de leitor restringe a exibição financeira na interface, mas não é segurança real de dados. Em implantação, aplicar autenticação, RLS/OLS conforme a política, dados pessoais minimizados e exportação por perfil. Pessoas dos programas e respostas de seguimento exigem cuidados de LGPD e acesso a evidências apropriado. Publicar agregados estaduais não autoriza publicação irrestrita de dados internos.

## Validação para aceite

- Identificadas + sem identificação = inscrições e presenças correspondentes; pessoas distintas não excedem presenças identificadas.
- As mesmas pessoas repetidas entre atividades, meses ou unidades contam uma vez no total distinto; nenhuma identidade ausente é fabricada.
- Todas as chaves referenciam programa, atividade, unidade e profissional/empresa existentes; uso não excede capacidade no modelo.
- Execução = custo direto + demais custos; custos de atividade/cowork não são somados novamente ao orçamento.
- Seleções de pessoas/atividades não rateiam orçamento nem capacidade; custo por participante da coorte permanece ausente.
- Seguimento só usa maturação e resposta disponíveis até o corte; resultados reconciliam com respostas; ausência não é resultado negativo.
- Maduras + imaturas = solicitações; no prazo + fora do prazo + pendentes maduras = maduras; a taxa inclui pendências maduras no denominador.
- Domicílio, oferta e unidade têm papéis claros; filtros de empresa não inventam uma ligação aos serviços institucionais.
- Agregados públicos preservam limites/precisão e não recebem identidade ou custos fictícios; dados reais e cenário demonstrativo continuam separados.
- Sem alegação automática de infração, favorecimento, superestimação, benefício ou causalidade; conclusão depende do nível de evidência identificado.

As medidas e metas propostas precisam de validação conjunta dos donos dos dados antes do uso decisório. O relatório torna lacunas e denominadores visíveis para que a Presidência e as áreas possam solicitar a evidência necessária e examinar resultados comparáveis.
