# Referências normativas e decisões de modelagem

Pesquisa em fontes oficiais realizada em **9 de outubro de 2026**. Este documento distingue conteúdo normativo consultado de recomendações para o modelo. **Na V7, o BI é somente de leitura:** normas são referências de definição, não fontes de contagem de resultados. Fatos e eventos virão de SQL Server/Db2 via gateway ou APIs/ETLs homologados; a demonstração não consulta cadastros oficiais, emite documentos, determina obrigação individual de registro ou caracteriza infrações. As regras de integração da V7 foram retiradas do repositório em 29/10/2026 e continuam no histórico do Git; o desenho atual de fontes está em [observatorio/](../observatorio/README.md) e em [planejamento-fontes-2026-10/](../planejamento-fontes-2026-10/README.md).

## Normas consultadas e alterações identificadas

| Fonte oficial | Conteúdo relevante verificado | Situação observada na consulta |
| --- | --- | --- |
| [Lei nº 5.194/1966 — Planalto](https://www.planalto.gov.br/ccivil_03/leis/l5194.htm) | Arts. 6º e 8º: exercício profissional, atribuições e participação efetiva. Arts. 58–61: registro, visto, empresas e seções técnicas. Arts. 71–74: penalidades. | Texto federal com notas e redações históricas. O título ainda menciona arquitetura; a própria página remete à Lei nº 12.378/2010. Não usar o título histórico para ampliar automaticamente a competência atual do CREA. |
| [Lei nº 6.839/1980 — Planalto](https://www.planalto.gov.br/ccivil_03/leis/l6839.htm) | Art. 1º: registro e anotação dos profissionais em razão da atividade básica ou dos serviços prestados a terceiros. | Não foi identificada indicação de revogação na página consultada. CNAE é evidência cadastral auxiliar; a conclusão individual depende de atividade e enquadramento. |
| [Lei nº 6.496/1977 — Planalto](https://www.planalto.gov.br/ccivil_03/leis/l6496.htm) | Arts. 1º–3º: ART, responsabilidade pelo empreendimento e consequências da falta da anotação. | Base legal da ART; não equivale à comprovação automática de execução ou à emissão de certidão de acervo. |
| [Resolução Confea nº 1.121/2019 — versão compilada](https://normativos.confea.org.br/Ementas/Visualizar?id=68720) | Arts. 2º–3º: registro e obrigatoriedade; 9º–12: documentos, atualização e atribuições; 14–15: visto; 16–23: RT, quadro técnico e ART; 24–33: interrupção, cancelamento e débitos. | A compilação indica alterações pelas Resoluções nº 1.165 e nº 1.167/2026. Revogou, entre outras, a Resolução nº 336/1989. Usar a compilação atual, mantendo a versão aplicável ao fato histórico. |
| [Resolução Confea nº 1.165/2026](https://normativos.confea.org.br/Ementas/Visualizar?id=83319) | Inclui requisitos específicos de declaração da instituição de ensino e vínculo do RT para Empresa Júnior nos arts. 9º e 16 da Resolução nº 1.121. | Prevê entrada em vigor na publicação; alteração incorporada à compilação consultada. |
| [Resolução Confea nº 1.167/2026](https://normativos.confea.org.br/Ementas/Visualizar?id=83556) | Substitui o art. 32: cancelamento por encerramento ou inatividade comprovados, preservando débitos; exige notificação, prazo de 30 dias e decisão da câmara competente. | Prevê entrada em vigor na publicação; alteração incorporada à compilação consultada. A redação anterior de cancelamento por dois anos sem anuidade aparece tachada. |
| [Resolução Confea nº 1.008/2004 — texto compilado](https://normativos.confea.org.br/Ementas/Visualizar?id=548) | Arts. 2º–6º: evidências e fiscalização; 9º–14: auto e processo; 15–33: julgamento e recursos; 43–51: aspectos processuais e nulidades. | Foi identificada a alteração pela Resolução nº 1.047/2013. Não foi identificada revogação integral nas fontes consultadas; esta pesquisa não substitui conferência normativa institucional. |
| [Resolução Confea nº 1.047/2013](https://normativos.confea.org.br/Ementas/Visualizar?id=52209) | Revoga arts. 7º, 8º e inciso VIII do art. 47 da nº 1.008; atribui a lavratura do auto ao agente fiscal no art. 9º. | A notificação prévia dos dispositivos revogados não deve ser implementada como etapa obrigatória universal. Notificações efetivamente existentes continuam sendo eventos documentados. |
| [Resolução Confea nº 1.137/2023 — versão compilada](https://normativos.confea.org.br/Ementas/Visualizar?id=76099) | ART e seus estados; arts. 41–44: cargo/função; 45–52: acervo técnico-profissional e CAT; 46 e 53–57: acervo operacional e CAO; 58–65: atestados. | Revogou a Resolução nº 1.025/2009; indica alteração pela nº 1.160/2025. A ART de cargo/função não dispensa ART de obra/serviço. |
| [Resolução Confea nº 1.160/2025](https://normativos.confea.org.br/Ementas/Visualizar?id=83001) | Altera ART múltipla, complementar e de substituição, relações em subcontratação, duplicidade, requerimento de CAT e tabelas auxiliares; substitui anexos da nº 1.137. | Prevê vigência 90 dias após publicação. A compilação já apresenta as alterações. O portal consultado não exibe a data de publicação deste ato; conferir o DOU para parametrizar a data exata de vigência, sem assumir que a assinatura equivale à publicação. |

**Ponto para validação jurídica:** o texto da Lei nº 5.194/1966 ainda apresenta a previsão de dois anos do art. 64, enquanto a Resolução nº 1.167/2026 altera o procedimento de pessoas jurídicas. O painel não resolve essa questão por conta própria: exibe a situação e os eventos recebidos da fonte oficial, sem cancelar registros a partir de débitos. A mudança está também descrita em [notícia oficial do Confea sobre cancelamento de empresas](https://www.confea.org.br/confea-aprova-novas-regras-para-cancelamento-de-registro-de-empresas).

## Recomendações para o modelo de dados

As recomendações abaixo são decisões de projeto sujeitas à validação dos responsáveis do CREA-SP; não são novas obrigações legais.

| Entidade | Unidade e campos recomendados | Efeito nos indicadores |
| --- | --- | --- |
| Empresa | Identificador interno e raiz CNPJ para consolidação analítica; natureza jurídica, objeto social e fonte. | Contar empresas distintas sem somar matriz e filiais como empresas independentes. Não confundir grupo econômico com pessoa jurídica. |
| Estabelecimento | CNPJ completo, matriz/filial, município, situação Receita e histórico. | Contar estabelecimentos e distribuição territorial; a situação Receita permanece separada da situação no CREA. |
| Registro ou visto CREA | Identificador próprio, Crea/circunscrição, tipo, pessoa jurídica associada, situação, início/fim, restrições, requerimento e decisão. | Contar registros distintos, empresas correspondidas e estabelecimentos cobertos com fórmulas diferentes. Um registro não equivale necessariamente a uma linha empresarial ou a um estabelecimento. |
| Vínculo técnico | Identificador, profissional, pessoa jurídica, função RT/quadro técnico, ART cargo/função, início/fim, atribuições, situação e evidência. | Relação de muitos para muitos. Medir empresas com ao menos um vínculo vigente, profissionais distintos e quantidade de vínculos sem dupla contagem. |
| Atividade/ART | Identificador, profissional, contratante e empresa executora, contrato, local, datas, tipo, forma, participação, estado, baixa e relações com outras ARTs. | Separar quantidade de documentos de atividades e contratos; uma ART complementar ou múltipla não deve inflar automaticamente obras ou contratos distintos. |
| CAT | Profissional titular, número, emissão, autenticidade, ARTs, atestado e ressalvas. | Acervo do profissional; relações com uma empresa são contextuais e históricas, sem transferir a titularidade. |
| CAO | Pessoa jurídica titular, número, emissão, autenticidade, ARTs, responsáveis históricos e ressalvas. | Acervo operacional empresarial; preservar ARTs relacionadas mesmo fora do período de emissão selecionado. |
| Fiscalização e processo | Ocorrência, ação, relatório, evidência, agente, auto, processo, decisões, defesa, recurso, comunicação e respectivos tempos. | Ações, autos, processos e decisões são contagens distintas. Registrar resultados e andamento, evitando somar fases como novas autuações. |
| Lançamento e pagamento | Obrigação/parcela, competência, vencimento, valor original, pagamentos e estornos, saldo, cancelamento, parcelamento e suspensão de exigibilidade, quando disponíveis. | Competência do lançamento, caixa do pagamento e saldo na data de referência são medidas diferentes. |

O art. 3º, § 1º, II da Resolução nº 1.121 prevê condições específicas para filial em outra unidade da Federação. Portanto, o protótipo não atribui um novo registro obrigatório a cada CNPJ de filial paulista. A vinculação registro–estabelecimento precisa vir do cadastro e dos critérios institucionais validados.

### Vínculos e vigência

As Resoluções nº 1.121, arts. 16–21, admitem pluralidade de RTs e participação do profissional em mais de uma pessoa jurídica. A [orientação atual do CREA-SP sobre exclusividade](https://www.creasp.org.br/faq/o-responsavel-tecnico-precisa-trabalhar-exclusivamente-na-empresa/) também exige atuação compatível e verificável. Não criar um limite automático de empresas por profissional.

No modelo proposto, vínculo vigente exige intervalo que cubra a data de referência e situação compatível na fonte. A condição profissional isolada não determina a vigência do vínculo. A concentração de vínculos é sinal de análise; participação efetiva, horários, atribuições, localização e documentos exigem avaliação técnica humana.

### Triagem, auto e penalidade

A Resolução nº 1.008 diferencia apuração, lavratura, julgamento e recursos. O art. 10 define o auto como ato que instaura o processo; os arts. 17, 23 e 30 preveem decisões fundamentadas. Os recursos podem afetar a exigibilidade, conforme a fase. O [serviço oficial de defesa de auto do CREA-SP](https://www.creasp.org.br/servico/defesa-de-auto-de-infracao-3/) orienta o acompanhamento dos atos recebidos.

O modelo preserva o histórico recebido dos sistemas de origem: **sinal analítico, validação documental, análise, encaminhamento e resultado documentado**, quando esses eventos existirem. Não é uma sequência processual obrigatória, e o BI não executa triagem, encaminhamento, auto ou penalidade. O agente fiscal competente responde pela lavratura; câmaras e instâncias competentes respondem pelas decisões. Usuário, data, justificativa, evidências e versão da regra devem vir da auditoria dos sistemas de origem, não de operações realizadas no relatório.

Score, CNAE, ausência de correspondência, número de vínculos, contrato classificado por texto e débito não constituem, isoladamente, juízo de irregularidade. Reincidência não será inferida contando ocorrências; depende dos antecedentes e critérios processuais validados.

### Financeiro: aberto e vencido

Como regra demonstrativa de cálculo, **saldo em aberto** é o saldo não liquidado e não cancelado na data de referência. **Vencido não quitado** é seu subconjunto com vencimento anterior à data de referência. Se a fonte não fornecer vencimento, mostrar “não informado” e excluir da classificação de atraso. Não inventar vencimentos a partir da competência.

Parcelas futuras, pagas parcialmente, renegociadas ou com exigibilidade suspensa precisam de estados separados. A equipe financeira valida quando usar o rótulo “inadimplência”, quais parcelas são exigíveis e como tratar pagamentos/estornos. Interrupção e cancelamento não eliminam automaticamente débitos, conforme arts. 26 e 31 da Resolução nº 1.121. O painel não altera a situação cadastral a partir de um saldo.

### CAT, CAO e autenticidade

A [explicação oficial do CREA-SP](https://www.creasp.org.br/faq/a-cao-comprova-o-acervo-do-profissional/) distingue CAO empresarial e CAT profissional. A Resolução nº 1.137 prevê consulta de autenticidade e validade de ambas; o [serviço de validação de certidões do CREA-SP](https://www.creasp.org.br/servico/validacao-de-certidoes-3/) é a referência operacional.

Exibir documento existente na fonte com titular, emissão, estado e ressalvas; não concluir que uma coleção de ARTs produz uma certidão válida. A regra sintética que gera CAOs a partir de ARTs baixadas é apenas uma escolha de dados fictícios e não reproduz todos os requisitos de emissão. A simulação não cria certidões oficiais, chaves de validação reais ou prova de habilitação em licitação.

## Responsáveis e manutenção

| Responsável humano | Validação necessária |
| --- | --- |
| Cadastro | Identidades, correspondências, cobertura matriz/filial, registro/visto, estados e histórico. |
| Área técnica e câmaras | Atribuições, vínculos, restrições, participação efetiva e leitura de acervo. |
| Fiscalização | Critérios de triagem, evidências, encaminhamento e eventos efetivamente registrados. |
| Jurídico | Versão aplicável ao fato, alterações, competência, procedimento, prazos e efeitos das decisões. |
| Financeiro | Vencimentos, pagamentos, saldo, parcelamento, exigibilidade e critérios de atraso. |
| Dados/BI | Chaves, granularidade, origem, fórmulas, reconciliação e auditoria. |

Manter catálogo de fontes com URL, órgão, norma/versão, artigos usados, data de consulta e datas de vigência confirmadas. Regras demonstrativas recebem identificador, fórmula, motivo, versão e responsável, sem rótulo de regra oficial. Antes de integrar dados reais, os responsáveis validam o dicionário e os indicadores. Preservar o histórico de fatos e regras, permitindo reproduzir a análise na data selecionada sem aplicar automaticamente uma norma nova a eventos antigos.
