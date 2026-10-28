# Indicadores empresariais — V11 / CREA-SP

Este catálogo reúne **17 indicadores empresariais**, com nomes curtos e perguntas auxiliares. O nome identifica a medida; a pergunta ajuda a interpretar o resultado. Todos se referem à atuação do **CREA-SP em São Paulo** e a relações verificáveis com empresas. Profissionais entram quando há vínculo técnico relevante; emprego é contexto agregado do mercado.

**Estado da entrega:** os números do protótipo são fictícios e reproduzíveis. Os exemplos deste documento são didáticos e não representam dados reais nem os resultados calculados na tela. SQL Server e IBM Db2 são as origens internas informadas pelo usuário; views, campos, credenciais e rotinas ainda precisam de homologação. Fontes externas são propostas de ingestão automatizada ou parceria autorizada, não conexões já ativadas. As frequências e áreas validadoras abaixo são propostas de governança, não designações oficiais de responsabilidade.

## Como avaliar a utilidade

Um indicador deve apoiar uma decisão, preservar sua unidade de contagem e permitir chegar ao conjunto de registros que o explica. Não há utilidade em uma taxa sem denominador, um total sem competência ou uma suposta ausência criada pela falta de integração. Crescimento cadastral, atividade documentada e recursos recuperados podem sustentar comunicação institucional verificável; por si, não provam efeito causal da gestão.

A leitura principal combina **presença empresarial → cobertura técnica → atividade observada → inteligência digital → sustentabilidade financeira**. A mesma página pode mostrar as medidas essenciais e trocar o detalhamento contextual por seleção, sem transformar cada indicador em uma aba. A decisão sobre aprofundamento deve seguir o dado selecionado, mantendo território, CNAE, porte e período visíveis.

## Dicionário dos indicadores

### 01. Base empresarial vigente

**Pergunta de apoio:** Como evolui a base de empresas com registro vigente?

**Resumo:** Estoque de pessoas jurídicas distintas com registro vigente e mudança reconciliada entre entradas, reativações e saídas. Um novo registro ou filial não cria automaticamente uma nova empresa-raiz.

**Decisão apoiada:** Distinguir expansão, reposição de saídas e concentração territorial/setorial da carteira.

**Como calcular:** Empresas-raiz com ao menos um registro vigente no corte; saldo = estoque final − estoque inicial. Entradas/saídas contam transições do estado empresarial, sem duplicar vários registros simultâneos.

**Unidade e denominador:** Empresas e variação (%)

**Fontes e vínculo de dados:** Cadastro empresarial SQL Server/Db2 via gateway; Histórico de registros/vistos e movimentações

**Exemplo:** Exemplo didático: 4.000 empresas iniciais + 800 entradas − 300 saídas = 4.500 finais; as 800 entradas não devem ocultar as 300 saídas.

**Atualização proposta:** Diária, após carga interna validada; comparação mensal/trimestral/anual com o mesmo corte.

**Validação necessária:** Gestão do cadastro e inteligência de dados: homologar identidade empresarial, vigência, reativação e reconciliação estoque–fluxo.

**Limites de interpretação:** Empresa-raiz, estabelecimento, registro e visto têm unidades diferentes. Saneamento de duplicidade não é crescimento. Histórico real exige fatos datados, não retroprojeção de snapshot.

### 02. Retenção cadastral

**Pergunta de apoio:** As empresas da coorte inicial com situação cadastral na Receita ativa permanecem no cadastro?

**Resumo:** Retenção da coorte de empresas com registro vigente na abertura, condicionada à situação ativa na fotografia cadastral da Receita disponível ao corte. A fonte fiscal da demonstração não reconstrói uma história completa da atividade econômica.

**Decisão apoiada:** Investigar saída cadastral entre empresas com situação cadastral ativa na Receita, distinguindo-a da redução do universo externo.

**Como calcular:** Empresas da coorte inicial com algum estabelecimento RFB ativo na fotografia disponível e registro vigente ao fim / empresas da coorte inicial com algum estabelecimento RFB ativo nessa fotografia × 100.

**Unidade e denominador:** % de empresas da coorte elegível

**Fontes e vínculo de dados:** Histórico de registro empresarial; Receita Federal/CNPJ por ingestão automatizada ou integração autorizada

**Exemplo:** Exemplo didático: das 4.000 empresas iniciais, 3.800 aparecem ativas na fotografia cadastral da Receita mais recente e 3.700 permanecem com registro: retenção condicional de 97,4%.

**Atualização proposta:** Diária para o cadastro; fotografia RFB na competência disponível, explícita no indicador.

**Validação necessária:** Gestão do cadastro: validar coorte inicial e situação cadastral RFB; não tratar situação ativa como regularidade tributária.

**Limites de interpretação:** Situação ativa na Receita não prova exercício de atividade técnica. O filtro usa a fotografia RFB disponível ao corte, não o histórico cadastral da Receita inexistente. Mudanças de pessoa jurídica exigem conciliação.

### 03. Cobertura cadastral

**Pergunta de apoio:** Quanto do universo de estabelecimentos externos tem registro exato vigente?

**Resumo:** Presença cadastral no universo externo definido por CNPJ completo, situação cadastral na Receita e CNAEs selecionados. O numerador exige registro exato vigente; uma correspondência antiga ou de outra filial não o satisfaz.

**Decisão apoiada:** Escolher territórios e setores para ampliar a conciliação de informações, orientar empresas e estudar a abrangência institucional.

**Como calcular:** Estabelecimentos elegíveis com registro exato vigente no corte / estabelecimentos externos elegíveis distintos × 100. Decompor em nunca localizado, identificado sem vigência e vigente.

**Unidade e denominador:** % de estabelecimentos elegíveis

**Fontes e vínculo de dados:** Receita Federal/CNPJ por ETL oficial ou integração autorizada; Cadastro e vigência de estabelecimentos CREA; Classificação CNAE fornecida pelo usuário

**Exemplo:** Exemplo didático: de 10.000 CNPJs completos elegíveis, 4.500 têm registro exato vigente: 45%. Os demais devem ser separados entre nunca identificados e identificados sem vigência.

**Atualização proposta:** A cada competência oficial CNPJ e carga interna conciliada; Conecta conforme autorização e quotas.

**Validação necessária:** Cadastro e área técnica competente: homologar universo CNAE, correspondência exata e alcance de registro/visto por estabelecimento.

**Limites de interpretação:** CNAE relacionado ou dependente de análise não comprova obrigação. O universo é de estabelecimentos, não empresas-raiz; a matriz não cobre automaticamente a filial. Somente raiz não é correspondência exata.

### 04. Novos CNPJs sem correspondência

**Pergunta de apoio:** Quais novos estabelecimentos ainda não têm registro exato identificado?

**Resumo:** Aberturas recentes de estabelecimentos externos elegíveis sem qualquer registro exato identificado até o corte, para estudar orientação e conciliação mais próximas do início da atividade.

**Decisão apoiada:** Definir parcerias e estudos setoriais a partir das novas aberturas e de sua localização, sem confundir filial nova com nova pessoa jurídica.

**Como calcular:** Contar CNPJs completos elegíveis abertos na janela e sem registro exato identificado até o corte. Um registro histórico inativo já identificado não entra neste conjunto.

**Unidade e denominador:** Estabelecimentos (CNPJ completo)

**Fontes e vínculo de dados:** Abertura, situação, CNAEs e município do CNPJ; Histórico de registros por estabelecimento

**Exemplo:** Exemplo didático: 1.100 CNPJs elegíveis abertos em 24 meses ainda não têm registro exato identificado; a concentração em instalações elétricas e três municípios orienta um estudo específico.

**Atualização proposta:** Por competência oficial de CNPJ, com data de abertura e histórico interno atualizado.

**Validação necessária:** Cadastro e inteligência de dados: distinguir abertura de filial, primeira identificação e registro histórico inativo.

**Limites de interpretação:** Abertura não prova início efetivo de atividade sujeita ao CREA. A métrica conta estabelecimentos; a ficha empresarial deduplica suas raízes e pode mostrar menos empresas que CNPJs.

### 05. Cobertura de RT

**Pergunta de apoio:** Quantas empresas vigentes têm RT identificado no corte?

**Resumo:** Cobertura técnica observada da base empresarial vigente, vinculando empresa, profissional e período de vigência.

**Decisão apoiada:** Investigar ausência de vínculos na integração e a distribuição da cobertura por atividade, porte e território.

**Como calcular:** Empresas-raiz com registro vigente e ao menos um vínculo RT vigente identificado / empresas-raiz com registro vigente × 100.

**Unidade e denominador:** % de empresas vigentes

**Fontes e vínculo de dados:** Cadastro empresarial; Vínculos RT com profissional, modalidade, início e fim no banco interno

**Exemplo:** Exemplo didático: 4.100 de 4.500 empresas vigentes têm RT identificado: cobertura observada de 91,1%. As outras 400 precisam de validação de fonte e vigência.

**Atualização proposta:** Diária, após cargas de registros e vínculos técnicos reconciliadas.

**Validação necessária:** Área técnica competente: confirmar vigência, atribuição e abrangência do vínculo; cadastro valida identidade empresarial/profissional.

**Limites de interpretação:** Não identificado não equivale a ausência real de RT ou infração. Profissionais distintos, vínculos e empresas não podem ser somados como uma mesma unidade.

### 06. Continuidade de RT

**Pergunta de apoio:** A cobertura de RT permanece durante a vigência empresarial?

**Resumo:** Interseção diária entre períodos de registro vigente e de RT, distinguindo continuidade de uma fotografia da situação atual.

**Decisão apoiada:** Distinguir lacunas históricas já resolvidas de ausência ainda observada e orientar validação da continuidade técnica.

**Como calcular:** Dias-empresa com registro vigente e ao menos um RT vigente / dias-empresa com registro vigente, dentro da janela histórica qualificada, × 100. Sobreposições de vínculos não duplicam dias.

**Unidade e denominador:** % de dias-empresa registrados

**Fontes e vínculo de dados:** Intervalos históricos de registros; Intervalos históricos de vínculos RT

**Exemplo:** Exemplo didático: uma empresa passa 20 de 730 dias registrados sem RT identificado; a troca entre dois RTs sem intervalo não gera lacuna.

**Atualização proposta:** Diária ou mensal, com reprocessamento de intervalos alterados retroativamente.

**Validação necessária:** Área técnica competente: homologar início/fim dos intervalos e qualidade histórica; não presumir prazo de tolerância legal.

**Limites de interpretação:** Na ficção o histórico é qualificado desde o primeiro registro da empresa; esse marco demonstrativo não certifica cobertura histórica real. Lacuna de fonte não é ausência real e não existe prazo tolerado presumido.

### 07. Atividade empresarial com ART

**Pergunta de apoio:** Quantas empresas têm atividade ART observada no período?

**Resumo:** Distribuição da atividade ART observada entre empresas que tiveram registro vigente em algum dia da janela, incluindo as que já saíram da base antes do corte. Evita selecionar somente as sobreviventes.

**Decisão apoiada:** Identificar ampliação ou concentração da participação empresarial na produção documental e aprofundar o perfil dos vínculos.

**Como calcular:** Empresas-raiz com ao menos um dia de registro vigente e ao menos uma ART vinculada na janela / empresas-raiz com ao menos um dia de registro vigente na mesma janela × 100.

**Unidade e denominador:** % de empresas com vigência em algum dia da janela

**Fontes e vínculo de dados:** ART e ponte empresarial declarada; Cadastro empresarial vigente

**Exemplo:** Exemplo didático: 2.800 de 4.800 empresas com algum dia de vigência na janela têm ART vinculada: 58,3%, ainda que somente 4.500 sigam vigentes ao fim. O distinto da janela não é soma de distintos mensais.

**Atualização proposta:** Diária para documentos; consolidação por competência, incluindo cancelamentos/retificações homologados.

**Validação necessária:** Área de ART/acervo e cadastro: validar ponte empresarial explícita, elegibilidade documental e população com vigência em algum dia da janela.

**Limites de interpretação:** A participação usa a coorte de todo o período. A partição RT × ART da base vigente no corte é outro aprofundamento, com denominador próprio. A fonte demonstra vínculo empresarial, não execução/autoria; a taxa não testa vigência na data de cada ART. Documentos não são faturamento ou obras concluídas.

### 08. Emprego setorial

**Pergunta de apoio:** Como evolui o emprego nos mercados em que as empresas atuam?

**Resumo:** Variação do estoque formal agregado dos territórios e CNAEs selecionados, como contexto econômico da carteira empresarial.

**Decisão apoiada:** Dimensionar crescimento/retração setorial e avaliar presença institucional em mercados economicamente relevantes.

**Como calcular:** (Estoque agregado do último mês / estoque agregado do primeiro mês disponível na janela − 1) × 100; base inicial zero retorna ausência de taxa. Admissões/desligamentos são fluxos e estoques mensais não são somados.

**Unidade e denominador:** % de variação do estoque agregado

**Fontes e vínculo de dados:** Novo CAGED/RAIS em carga oficial homologada; Dimensões município, CNAE, CBO e competência

**Exemplo:** Exemplo didático: o estoque setorial passa de 200 mil para 220 mil vínculos: +10%. É contexto do mercado, não prova de 20 mil empregos criados pelo CREA.

**Atualização proposta:** Novo CAGED mensal e RAIS anual, nas respectivas competências; reprocessar revisões oficiais.

**Validação necessária:** Inteligência de dados: validar recortes publicados, método do estoque, compatibilidade entre edições e revisão com o produtor.

**Limites de interpretação:** Emprego agregado não identifica trabalhador ou CNPJ. Filtros nominais de empresa, porte ou subconjunto empresarial tornam essa comparação indisponível quando não existem na fonte. Os cortes mensais inicial/final devem ser informados.

### 09. Demanda pública técnica

**Pergunta de apoio:** Onde se concentra a demanda pública por serviços técnicos?

**Resumo:** Valor e composição das publicações de contratações com objetos potencialmente técnicos, usando categorias e identidade do fornecedor.

**Decisão apoiada:** Identificar segmentos, órgãos e territórios para intercâmbio de dados e conhecer mercados relevantes para a carteira empresarial.

**Como calcular:** Somar o valor dos contratos técnicos únicos publicados na janela, com regra textual explícita de classificação; manter contratos, fornecedores e valores em unidades separadas.

**Unidade e denominador:** R$ contratados/publicados

**Fontes e vínculo de dados:** PNCP/API e identificadores de contratação/fornecedor; Classificação textual versionada; Convênios para execução contratual quando disponíveis

**Exemplo:** Exemplo didático: mil contratações potencialmente técnicas somam R$ 2 bilhões, concentradas em saneamento e manutenção elétrica; isso dimensiona demanda publicada.

**Atualização proposta:** API PNCP diariamente, com paginação, revisões e contrato/versionamento homologados.

**Validação necessária:** Inteligência de dados e área técnica competente: validar objetos, unicidade, conceito de valor e distinção entre sede e execução.

**Limites de interpretação:** Na demonstração a data contratual representa publicação. Valor publicado/contratado não é pagamento ou obra entregue. Território do fornecedor não comprova local de execução; aditivos/cancelamentos precisam de tratamento produtivo próprio.

### 10. Cobertura de fornecedores

**Pergunta de apoio:** Os fornecedores tinham registro vigente na última publicação observada?

**Resumo:** Presença de registro exato vigente por CNPJ completo de fornecedor, verificada na data da publicação técnica mais recente daquele fornecedor dentro da janela.

**Decisão apoiada:** Conectar demanda pública e vigência cadastral com uma data explícita, selecionando conjuntos para conciliação e verificação.

**Como calcular:** Fornecedores distintos por CNPJ completo com registro exato vigente na sua publicação técnica mais recente selecionada / fornecedores distintos por CNPJ completo no universo técnico selecionado × 100.

**Unidade e denominador:** % de fornecedores (CNPJ completo)

**Fontes e vínculo de dados:** PNCP/fornecedor e data de publicação; CNPJ do estabelecimento; Histórico de registro/visto

**Exemplo:** Exemplo didático: entre 500 CNPJs fornecedores, 300 têm registro vigente na sua última publicação técnica observada: 60%. Isso não informa vigência de cada contrato anterior nem da execução.

**Atualização proposta:** Diária após conciliar PNCP e histórico de registro; referência na última publicação selecionada de cada fornecedor.

**Validação necessária:** Cadastro e área técnica competente: validar fornecedor por CNPJ completo, data da publicação, jurisdição e papel contratual.

**Limites de interpretação:** A referência é publicação mais recente por fornecedor, não assinatura, execução ou situação atual. Registro de matriz/raiz não confirma outra filial. Classificação de objeto, jurisdição e papéis contratuais precisam de validação.

### 11. Rastreabilidade contrato–ART

**Pergunta de apoio:** Quais contratos têm vínculo documental explícito com ART?

**Resumo:** Parcela do portfólio técnico selecionado com uma ponte documental confirmada contrato–ART; representa rastreabilidade disponível na fonte.

**Decisão apoiada:** Avaliar a rastreabilidade do portfólio e pactuar campos e intercâmbios necessários para sua ampliação.

**Como calcular:** Contratos técnicos selecionados com ao menos uma ponte documental explícita contrato–ART / todos os contratos técnicos selecionados na janela × 100.

**Unidade e denominador:** % de contratos técnicos

**Fontes e vínculo de dados:** ART e referência contratual interna; PNCP e contrato identificado; Ponte documental por convênio ou camada curada homologada

**Exemplo:** Exemplo didático: 190 de 1.000 contratos têm ponte explícita: 19% do portfólio com rastreabilidade disponível. Os outros 810 são contratos sem ponte na fonte, não contratos comprovadamente sem ART.

**Atualização proposta:** Após cargas de contratos, ARTs e pontes documentais autorizadas; meta diária quando as fontes permitirem.

**Validação necessária:** Área de ART/acervo e cedente do contrato: homologar referência documental e abrangência; ausência de ponte não comprova ausência de ART.

**Limites de interpretação:** A ponte demonstrativa é documento fictício explícito, não uma inferência real por CNPJ/texto. ART da mesma empresa não comprova ART do contrato. Sem ponte não equivale a falta de ART, infração, execução ou universo já analisado.

### 12. Evidências convergentes

**Pergunta de apoio:** Quais empresas reúnem contrato técnico e CNPJ sem vigência exata?

**Resumo:** Conjunto de empresas com estabelecimento elegível na Receita/CNAE, sem registro exato vigente no corte, que aparece como fornecedor de contrato técnico publicado na janela. O conjunto reúne fatos verificáveis do mesmo estabelecimento.

**Decisão apoiada:** Selecionar estudos e verificações digitais rastreáveis, sem criar score de culpa ou uma fila operacional de autuação.

**Como calcular:** Contar empresas-raiz distintas com ao menos um estabelecimento RFB ativo e CNAE elegível, sem registro exato vigente no corte, e com contrato técnico publicado na janela associado àquele estabelecimento.

**Unidade e denominador:** Empresas-raiz com evidências

**Fontes e vínculo de dados:** Receita Federal/CNPJ e CNAEs; Cadastro e vigência de registros por CNPJ completo; PNCP/objeto, estabelecimento fornecedor e publicação

**Exemplo:** Exemplo didático: de 5.500 CNPJs sem registro vigente, um subconjunto de 120 empresas também apresenta objeto técnico e identidade comprovada; o interesse está na combinação explicável.

**Atualização proposta:** A cada conciliação válida de CNPJ, registro e PNCP; explicitar as três competências.

**Validação necessária:** Área técnica competente e inteligência de dados: revisar a regra booleana, o mesmo estabelecimento e a atividade efetiva antes de qualquer conclusão.

**Limites de interpretação:** A regra implementada cruza CNAE elegível, falta de vigência exata no corte e contrato técnico do mesmo estabelecimento na janela. Não mede RT, divergência territorial, probabilidade de infração ou vigência durante execução. CAGED agregado não é evidência individual por CNPJ.

### 13. Adimplência empresarial

**Pergunta de apoio:** Qual é a adimplência das empresas com obrigações elegíveis?

**Resumo:** Cumprimento financeiro no universo de empresas que possuem obrigações exigíveis integrantes do denominador, separado da regularidade técnica.

**Decisão apoiada:** Planejar relacionamento e sustentabilidade financeira por porte, atividade e território, com denominador explícito.

**Como calcular:** Empresas-raiz com títulos de valor não negativo e vencimento até o corte, sem saldo vencido positivo / empresas-raiz com títulos nessas condições × 100. Título que vence no próprio corte ainda não é atraso.

**Unidade e denominador:** % de empresas com obrigações elegíveis

**Fontes e vínculo de dados:** Títulos empresariais, vencimentos e pagamentos; Estados de exigibilidade homologados no financeiro

**Exemplo:** Exemplo didático: 3.400 de 4.000 empresas com obrigações elegíveis estão adimplentes: 85%. Dividir pelo total de empresas cadastradas responderia a outra pergunta.

**Atualização proposta:** Diária após conciliação financeira, respeitando vencimentos, compensações e ajustes.

**Validação necessária:** Financeiro e cadastro: homologar exigibilidade, parcelamentos, contestações, identidade PJ e denominador de empresas elegíveis.

**Limites de interpretação:** O universo financeiro é o dos títulos observados com vencimento até o corte, não toda a base vigente. Dívida não comprova infração técnica. Exigibilidade legal, parcelamento, contestação e prescrição precisam de homologação; produção deve restringir microdados e exportações.

### 14. Recebimentos de PJ

**Pergunta de apoio:** Quanto foi efetivamente recebido de pessoas jurídicas?

**Resumo:** Fluxo de caixa empresarial efetivamente recebido na janela por data de pagamento, com recuperação identificada como parte desse total.

**Decisão apoiada:** Planejar sustentabilidade e explicar a composição dos recursos empresariais efetivamente recebidos.

**Como calcular:** Somar pagamentos elegíveis vinculados à pessoa jurídica pela data efetiva de pagamento, sem duplicar recuperação, estornos ou repasses.

**Unidade e denominador:** R$ recebidos

**Fontes e vínculo de dados:** Pagamento–título–empresa no financeiro SQL Server/Db2; Plano de contas e estornos quando disponíveis

**Exemplo:** Exemplo didático: R$ 24 milhões de recebimentos, dos quais R$ 3 milhões vêm da coorte vencida anterior; a recuperação não transforma o total em R$ 27 milhões.

**Atualização proposta:** Diária após conciliação dos pagamentos; contabilização por data efetiva, com fechamento de competência.

**Validação necessária:** Financeiro/contabilidade: reconciliar caixa, vínculo pagamento–título–empresa, estornos e classificação de pessoa jurídica.

**Limites de interpretação:** Não representa a receita geral do CREA-SP. Valor de ART/PNCP não é receita do conselho. Pagamento de pessoa física não vira receita PJ por associação indireta a uma empresa.

### 15. Dívida empresarial vencida

**Pergunta de apoio:** Quanto da dívida empresarial está vencido e há quanto tempo?

**Resumo:** Estoque financeiro vencido na data de corte, distribuído por faixa de atraso e concentração empresarial.

**Decisão apoiada:** Distinguir dívida antiga concentrada de atraso recente pulverizado e planejar relacionamento/provisão.

**Como calcular:** Somar saldo exigível vencido líquido de pagamentos/ajustes válidos até o corte; faixas de atraso reconciliam com o total. Contar devedores distintos separadamente.

**Unidade e denominador:** R$ vencidos no corte

**Fontes e vínculo de dados:** Títulos, saldo, vencimentos, pagamentos e ajustes; Identidade empresarial e exigibilidade

**Exemplo:** Exemplo didático: R$ 9 milhões vencidos em 600 empresas exigem leituras diferentes quando concentrados em títulos antigos ou em atrasos recentes.

**Atualização proposta:** Diária no corte financeiro; reconstrução histórica apenas com eventos/saldos confiáveis.

**Validação necessária:** Financeiro e área jurídica competente: validar saldo exigível, pagamentos, ajustes, parcelamentos, prescrição e uso permitido de dados nominais.

**Limites de interpretação:** Estoque não é fluxo recebido. Sem eventos produtivos de ajuste/exigibilidade, a demonstração não certifica cobrança legal. Não expor dívida nominal em versão pública nem inventar previsão de perda.

### 16. Recuperação da carteira inicial

**Pergunta de apoio:** Quanto foi recuperado da carteira vencida no início?

**Resumo:** Recebimento efetivo sobre uma coorte fixa de títulos vencidos na abertura da janela, evitando confundir redução contábil com ingresso de caixa.

**Decisão apoiada:** Comparar coortes e segmentos com denominadores equivalentes e demonstrar recuperação observada de recursos.

**Como calcular:** Pagamentos na janela aplicados a títulos vencidos com saldo reconstruível na abertura / saldo inicial reconstruível dessa mesma coorte × 100. Baixas sem caixa não entram no numerador.

**Unidade e denominador:** % do saldo vencido de abertura

**Fontes e vínculo de dados:** Saldo histórico de abertura por título; Ponte pagamento–título e datas efetivas

**Exemplo:** Exemplo didático: R$ 3 milhões pagos sobre uma coorte inicial de R$ 12 milhões significam 25% de recuperação; cancelar R$ 1 milhão não eleva esse recebimento.

**Atualização proposta:** Diária para pagamentos; coorte de abertura fixa e comparação em janelas de maturação equivalentes.

**Validação necessária:** Financeiro/contabilidade: reconciliar saldo inicial e pagamentos da mesma coorte; excluir baixa sem caixa e tratar histórico incompleto.

**Limites de interpretação:** Recuperação é subconjunto dos recebimentos. Pagamentos sem data ficam fora do fluxo e da reconstrução histórica da coorte; isso exige qualificar a cobertura em produção. Sem saldo inicial e vínculo pagamento–título, a taxa não é calculável. Atribuição a uma ação exige avaliação adicional.

### 17. Ingresso cadastral observado

**Pergunta de apoio:** Quais CNPJs da coorte externa tiveram ingresso cadastral observado?

**Resumo:** Transição documental de estabelecimentos observados sem registro exato em snapshot externo anterior à janela para um primeiro registro posterior, sem presumir permanência ou causa institucional.

**Decisão apoiada:** Demonstrar mudanças cadastrais verificáveis em um universo previamente identificado, preservando a situação inicial e os fatos posteriores.

**Como calcular:** CNPJs completos da coorte externa pré-janela cujo primeiro registro exato ocorreu após a observação e até o corte / CNPJs completos dessa coorte fixa × 100.

**Unidade e denominador:** % de estabelecimentos da coorte externa

**Fontes e vínculo de dados:** Snapshot externo longitudinal com competência e IDs próprios; Primeiro registro exato por estabelecimento; Histórico cadastral posterior

**Exemplo:** Exemplo didático: de 600 CNPJs observados sem registro, 180 ingressam posteriormente: 30%. Parte pode já estar sem vigência no fim; a entrada observada não é regularização atual nem efeito comprovado da gestão.

**Atualização proposta:** Por fotografia externa preservada e carga interna; acompanhar a mesma coorte em marcos temporais definidos.

**Validação necessária:** Cadastro e inteligência de dados: homologar identidade, observação prévia, primeiro ingresso e maturação da coorte; gestão valida qualquer alegação de resultado.

**Limites de interpretação:** A ficção usa snapshots reproduzíveis anteriores às janelas de 3/6/12/24 meses. Conta estabelecimentos; uma filial nova não é necessariamente nova empresa-raiz. Ingresso pode estar encerrado no corte. Sem intervenção documentada e avaliação, não atribuir causalidade à gestão.

## Fontes automáticas e relações que precisam existir

| Núcleo | Fonte prevista | Relação indispensável | Cuidados |
| --- | --- | --- | --- |
| Cadastro e movimentação | Views homologadas de SQL Server/Db2 via gateway | Empresa-raiz → estabelecimento/CNPJ completo → registro/visto → eventos e intervalos | Identidade e vigência precisam ser preservadas. Raiz, filial, registro e visto não são contagens intercambiáveis. |
| Universo externo | Dados oficiais do CNPJ obtidos programaticamente ou Consulta CNPJ/Conecta com adesão autorizada | CNPJ completo; situação, CNAEs, abertura, município e competência | CNPJ é texto, inclusive alfanumérico. Preservar classificação CNAE original; CNAE não determina automaticamente obrigação. |
| Responsabilidade técnica | Views internas de vínculos | Profissional → vínculo → empresa/estabelecimento → vigência e atribuição | Um profissional pode ter vários vínculos; ausência na integração precisa de validação. |
| Atividade e acervo | Views internas de ART/CAO e pontes documentais | Documento → empresa; contrato → ART apenas quando houver referência explícita | ART não prova obra concluída. CAO é da pessoa jurídica; CAT é acervo profissional e não substitui CAO. |
| Mercado público | API PNCP e eventuais intercâmbios autorizados | Contrato e versão → fornecedor por CNPJ completo → publicação; execução em dimensão própria | Não somar versões/aditivos indevidamente. Órgão em SP, fornecedor em SP e execução em SP representam papéis diferentes. |
| Emprego | Cargas estatísticas oficiais Novo CAGED/RAIS | Município × CNAE × CBO × competência conforme disponibilidade | Agregados públicos não identificam trabalhador, profissional CREA ou empresa nominal. Convênio identificado é outro produto. |
| Financeiro PJ | Views de títulos/pagamentos, saldos e eventos | Empresa → obrigação → vencimento → pagamento efetivo/ajustes | Receita PJ, dívida, recuperação e valor de contratos são grandezas distintas. Dados nominais requerem acesso restrito. |
| Coortes externas | Snapshots históricos preservados e cadastro interno | Observação datada do CNPJ → primeiro registro posterior → seguimento | Situação atual da Receita não reconstitui seu passado. Sem linha de base não existe taxa longitudinal defensável. |

**Arquitetura proposta:** origens e APIs oficiais → landing/staging controlados → fatos e dimensões conformados → views analíticas → gateway → modelo semântico Power BI. Cada lote precisa registrar origem, competência, data do evento, última carga válida, qualidade, versão da regra e responsável. O browser não deve receber credenciais institucionais.

## O que não promover a indicador estratégico isolado

- **Número de filiais/registros como crescimento empresarial:** útil como detalhe de composição, mas pode inflar a expansão de empresas distintas.
- **ART, CAO e valor de contrato como resultado econômico realizado:** são documentos, acervo ou demanda contratada; não equivalem a faturamento, obra entregue ou arrecadação do conselho.
- **Score opaco de irregularidade:** o painel deve mostrar evidências e critérios verificáveis. Um cruzamento não substitui análise técnica e jurídica.
- **Volume de palestras, reuniões ou espaços inaugurados:** sem ligação documentada com a população empresarial e um resultado definido, mede atividade institucional, não resultado para as empresas.
- **Todos os profissionais ou diplomados do estado:** são importantes em outro produto, mas não integram esta análise empresarial sem relação pertinente e identificada.
- **Ausência de ART/RT/registro inferida de tabela incompleta:** medir qualidade e cobertura da fonte antes de interpretar ausência como fato.

## Uso institucional e comunicação de resultados

Uma comunicação defensável pode afirmar, com fonte e denominador, que a base vigente aumentou, que uma coorte empresarial se manteve, que a presença cadastral em determinado mercado cresceu, que houve maior continuidade de vínculos identificados ou que uma parcela fixa da dívida foi recebida. Precisa informar período, universo, exclusões e limitações.

Para afirmar que uma iniciativa da administração causou o resultado, registrar primeiro a iniciativa, seu público-alvo, marco inicial, exposição e acompanhamento, com desenho de avaliação apropriado. O ingresso após observação externa demonstra sequência temporal; não comprova regularização atual, efeito de fiscalização ou mérito causal da gestão.

## Documentação complementar

- [Fontes, canais de acesso e parcerias propostas](FONTES_EMPRESARIAIS_V10.md).
- [Modelo empresarial e relacionamentos](MODELO_EMPRESARIAL_V10.md).
- [Preparação para Power BI e gateway](POWER_BI_V10.md).

A V11 reorganiza a leitura e os nomes. Os 17 identificadores técnicos e seus cálculos permanecem compatíveis com o modelo validado da V10.
