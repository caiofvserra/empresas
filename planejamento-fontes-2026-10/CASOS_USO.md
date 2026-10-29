# Casos de uso e indicadores estratégicos para o CREA-SP

Planejamento de 29/10/2026, consolidado a partir dos catálogos de fontes, da análise do modelo V18 e dos 13 anexos. **Todos os exemplos numéricos abaixo são sintéticos. Nenhum resultado representa medição real do CREA-SP.** Não há implementação de conector ou reconstrução do painel nesta etapa.

A proposta contém **34 casos de uso**, não 34 cartões numa tela. Cada caso pode produzir uma medida principal e decomposições compatíveis. O núcleo sugerido para a primeira visão é base empresarial, cobertura cadastral, saldo, RT, atividade ART, demanda pública técnica, rastreabilidade contrato–ART e sustentabilidade financeira. Cobertura de fontes e qualidade precisam acompanhar esses números. Os demais casos entram por mudança de medida, dimensão, seleção cruzada e aprofundamento, preservando o fluxo de análise.

**Critério de utilidade:** o indicador deve orientar uma decisão do conselho, ter universo observável e unidade definida, permitir explicar o que mudou e abrir o conjunto correspondente. Não foram incluídos índices compostos sem fundamento, metas de número de autos, rankings de fiscais, nem volume de eventos promocionais como substituto de resultado institucional.

**Prioridades:** P1 = primeiro núcleo após homologação de acesso e semântica; P2 = expansão após fundações; Parceria = depende de acesso/cooperação autorizados. A prioridade não significa que a API ou o schema interno já estejam prontos. Nas fontes, IDs como `JC02`, `SET01`, `LAB01` e `RFB-CNPJ` remetem aos catálogos desta pasta. `CREA-*` é dado interno a mapear, não endpoint público confirmado.

**Fluxo estratégico recomendado:** universo empresarial → mudança/atividade relevante → decomposição territorial/setorial → evidência externa e presença técnica → conjunto de empresas/empreendimentos → documentação de origem. Formação, emprego e economia entram por contexto agregado; vínculo individual só quando efetivamente observado e autorizado.


## Presença e desenvolvimento empresarial

### UC01 — Base empresarial CREA-SP

**Resumo:** Empresas distintas e estabelecimentos com registro ou visto vigente, acompanhados do universo histórico. É o denominador institucional principal.

**Decisão:** Dimensionar a presença do conselho e distinguir ampliação real da base de mera emissão adicional de registros.

**Exemplo:** Exemplo sintético: 12.000 raízes com pelo menos um registro vigente correspondem a 14.500 estabelecimentos e 16.200 registros; nenhum desses totais é sinônimo do outro.

**Cálculo ou regra:** COUNT DISTINCT raiz CNPJ com ao menos um episódio de registro/visto vigente no corte. Exibir separadamente COUNT DISTINCT CNPJ completo e COUNT DISTINCT registro. Inativos = raízes com histórico até o corte e nenhum episódio vigente; nunca registradas ficam fora do universo histórico.

**Grão e unidade:** Raiz CNPJ, estabelecimento e episódio de registro em medidas distintas; estoque.

**Referência temporal:** Corte mensal e mesma data no ano anterior; não classificar passado pelo status atual.

**Fontes:** CREA-registro; CREA-estabelecimento

**Dados internos necessários:** CNPJ completo/raiz; tipo registro/visto; datas de início/fim; eventos e situação

**Limitações:** Critério de registro por estabelecimento precisa ser homologado. Registros duplicados ou sobrepostos não aumentam empresas distintas.

**Acesso e viabilidade:** Banco interno SQL Server/Db2 pelo gateway; esquema e históricos ainda não acessados.

**Prioridade:** P1

**Gestão interessada:** Presidência/Gabinete; cadastro; SUPFIS; planejamento

**Visualização BI:** Cartão com três unidades e árvore de decomposição ativo/histórico; série de estoque.

### UC02 — Cobertura cadastral estimada

**Resumo:** Correspondência do CREA-SP no universo de estabelecimentos da Receita com atividades selecionadas e situação elegível.

**Decisão:** Escolher setores e territórios com lacunas de correspondência que merecem estudo e melhorar o planejamento digital.

**Exemplo:** Exemplo sintético: Em 20.000 CNPJs ativos selecionados, 11.000 têm correspondência vigente no CREA: 55%. Dos demais, 3.000 têm histórico antigo e 6.000 não foram localizados.

**Cálculo ou regra:** 100 × CNPJs completos elegíveis com correspondência exata e registro/visto vigente no corte ÷ todos CNPJs completos elegíveis no snapshot RFB selecionado. Particionar vigente/histórico sem vigência/sem correspondência. Regras de CNAE principal/secundário e classes Sim/Passível explícitas.

**Grão e unidade:** CNPJ completo, não raiz; razão percentual de estoques de universos compatíveis.

**Referência temporal:** Competência do snapshot RFB e corte CREA identificados; sem snapshot antigo não afirmar cobertura histórica.

**Fontes:** RFB-CNPJ; IBGE-CNAE; CREA-lista-CNAE-mar2025; CREA-registro

**Dados internos necessários:** Registro/visto com vigência; chave CNPJ validada; tabela municipal/GRE com versão

**Limitações:** CNAE não comprova atividade efetiva ou obrigação. Receita ativa não comprova funcionamento. Não apresentar não localizado como irregular. Mesmo CNPJ pode ter vários CNAEs sem duplicar denominador.

**Acesso e viabilidade:** CNPJ oficial em arquivos mensais: layout verificado, descarga atual a homologar. Cadastro CREA interno.

**Prioridade:** P1

**Gestão interessada:** Presidência/Gabinete; SUPFIS; cadastro; câmaras técnicas

**Visualização BI:** Funil de conciliação, mapa de cobertura com tamanho do universo e matriz CNAE×GRE.

### UC03 — Saldo empresarial no CREA-SP

**Resumo:** Entradas e saídas de empresas distintas na base vigente, reconciliadas com o estoque inicial e final.

**Decisão:** Distinguir crescimento da presença institucional de reativação, baixa e multiplicação de registros.

**Exemplo:** Exemplo sintético: A base passa de 10.000 a 10.180 raízes: 310 entradas e 130 saídas; 80 das entradas são reativações.

**Cálculo ou regra:** Entrada = transição da raiz de zero para pelo menos um registro vigente; saída = transição de pelo menos um para zero. Saldo = entradas−saídas e deve reconciliar estoque final−inicial, com ajustes cadastrais identificados. Eventos múltiplos da mesma raiz contam cada transição, não como novos CNPJs.

**Grão e unidade:** Transição empresarial; fluxo no período e estoque em corte.

**Referência temporal:** Mês/trimestre/12 meses, mesma janela anterior e conciliação início/fim.

**Fontes:** CREA-registro; CREA-movimentacao

**Dados internos necessários:** Episódios históricos de todos os registros da raiz; data de efeito e lançamento; tipo e motivo de movimento

**Limitações:** Baixa de uma filial não é saída da empresa se outra permanecer vigente. Retificações e cargas tardias precisam ser exibidas como ajustes.

**Acesso e viabilidade:** Interno; depende de histórico temporal reconstruível.

**Prioridade:** P1

**Gestão interessada:** Presidência/Gabinete; cadastro; planejamento

**Visualização BI:** Gráfico combinado de entradas/saídas em colunas e estoque em linha; waterfall do saldo.

### UC04 — Permanência empresarial no CREA-SP

**Resumo:** Acompanhamento de uma coorte real de empresas registradas no início para verificar continuidade cadastral.

**Decisão:** Identificar perda persistente de vínculo institucional por setor, porte ou território e orientar relacionamento.

**Exemplo:** Exemplo sintético: Das 2.000 raízes vigentes em janeiro, 1.860 continuam vigentes em dezembro: permanência de 93%.

**Cálculo ou regra:** 100 × raízes da coorte inicial com algum registro/visto vigente no corte final ÷ todas raízes elegíveis da coorte inicial. Exibir falecimento econômico/baixa RFB em grupo separado quando houver histórico de situação disponível, sem retirar retrospectivamente empresas do denominador.

**Grão e unidade:** Coorte fixa de raízes; percentual de permanência, não taxa de novos registros.

**Referência temporal:** Coortes anuais ou trimestrais, acompanhamento de 3/6/12 meses.

**Fontes:** CREA-registro; RFB-CNPJ

**Dados internos necessários:** Episódios de registro/visto; datas de saída/reativação; motivo registrado

**Limitações:** Não atribuir causalidade a ação da gestão. Cadastro vigente não prova atividade econômica; baixa RFB atual não informa data passada sem histórico.

**Acesso e viabilidade:** Interno; enriquecimento RFB condicionado a snapshots.

**Prioridade:** P1

**Gestão interessada:** Presidência/Gabinete; cadastro; relacionamento empresarial

**Visualização BI:** Curvas de coorte por setor/GRE e barras de motivos observados.

### UC05 — Dinamismo empresarial técnico em SP

**Resumo:** Abertura e mudanças observadas de estabelecimentos paulistas em atividades selecionadas, independentemente de registro no CREA.

**Decisão:** Antecipar regiões e segmentos de expansão ou retração para orientar presença institucional e parcerias.

**Exemplo:** Exemplo sintético: Em Campinas, foram abertos 180 estabelecimentos de atividades selecionadas no trimestre; 60 já têm correspondência vigente e 120 ainda não.

**Cálculo ou regra:** COUNT DISTINCT CNPJ completo com data de abertura na janela, UF=SP e regra CNAE versionada; exibir aberturas, baixas quando data disponível e alterações entre snapshots efetivamente coletados em séries separadas. Correspondência CREA é uma decomposição, não filtro que elimina o mercado externo.

**Grão e unidade:** Estabelecimento paulista; fluxos de abertura e alterações observadas, não empresas novas distintas por raiz.

**Referência temporal:** Mês/trimestre de abertura e competência da fotografia; comparar janelas iguais e alertar atraso.

**Fontes:** RFB-CNPJ; SP-JUCESP; CREA-registro

**Dados internos necessários:** CNPJ e vigências para decomposição; território/GRE

**Limitações:** JUCESP é complemento agregado/documental e não substitui universo CNPJ; atualização cadastral não significa início real de operação. Evitar usar porte Demais como grande empresa.

**Acesso e viabilidade:** RFB em lote mensal; JUCESP P2 com carga ainda não homologada.

**Prioridade:** P1

**Gestão interessada:** Presidência/Gabinete; planejamento; SUPFIS; relacionamento

**Visualização BI:** Combo aberturas/ingressos CREA sem igualar universos; mapa e small multiples setoriais.

### UC06 — Consistência cadastral empresarial

**Resumo:** Divergências verificáveis entre fontes e campos que impedem o cruzamento confiável.

**Decisão:** Priorizar saneamento do cadastro, reduzir falso não localizado e mostrar o limite de confiança das análises.

**Exemplo:** Exemplo sintético: De 8.000 estabelecimentos vigentes, 240 têm divergência de município e 60 têm último snapshot RFB baixado; os grupos podem se sobrepor.

**Cálculo ou regra:** Por regra: COUNT DISTINCT CNPJ elegível com erro/divergência ÷ CNPJs em que os campos foram efetivamente comparáveis. Exibir contagem e cobertura comparável. Regras distintas: identificador inválido, duplicidade indevida, município divergente, CNAE ausente, RFB baixado com CREA vigente. Não somar regras como empresas distintas.

**Grão e unidade:** Estabelecimento e evento de qualidade por regra; percentual e contagem.

**Referência temporal:** Última carga comparável e histórico de resolução; datas CREA/RFB explícitas.

**Fontes:** CREA-cadastro; RFB-CNPJ; IBGE-GEO

**Dados internos necessários:** Identificador original; endereço/município; CNAEs; datas de atualização; log de correções

**Limitações:** Diferença pode resultar de defasagem, regra territorial ou alteração legítima. Ausência de valor e divergência são situações diferentes. Não chamar qualidade de irregularidade.

**Acesso e viabilidade:** Interno e arquivos abertos; validação de cada regra necessária.

**Prioridade:** P1

**Gestão interessada:** SUPTEC/EDAD; cadastro; SUPFIS; UDE/planejamento

**Visualização BI:** Matriz de qualidade com denominadores, Pareto de causas e série de cobertura das fontes.

### UC07 — Redes societárias empresariais

**Resumo:** Exploração de empresas relacionadas por participação societária ou administração documentada, preservando papel e tempo.

**Decisão:** Entender grupos empresariais e reorganizações que afetam a leitura da base e consolidar relacionamentos empresariais.

**Exemplo:** Exemplo sintético: Uma pessoa jurídica identificada por CNPJ participa de quatro empresas de atividades técnicas; duas possuem registro vigente. A relação não prova que compartilhem RT.

**Cálculo ou regra:** Rede de arestas QSA empresa-raiz→sócio PJ por CNPJ exato e qualificação; contar empresas distintas por componente/participante e decompor presença CREA. Para pessoa física com CPF mascarado/nome, manter candidato sem fusão automática; nenhuma contagem confirmada baseada só em similaridade.

**Grão e unidade:** Aresta societária documentada e raiz empresarial distinta; análise de rede, sem índice de risco.

**Referência temporal:** Snapshot mensal; entrada societária quando informada, saída somente observada/fornecida.

**Fontes:** RFB-QSA; RFB-CONECTA; CREA-cadastro

**Dados internos necessários:** Identificadores de sócios quando autorizados; histórico de alterações; CNPJ canônico

**Limitações:** Sócio não é RT nem empregado. Mesmo nome/CPF parcial não identifica pessoa. Relação não prova controle final, favorecimento ou infração.

**Acesso e viabilidade:** QSA público mensal com limites de identificação; confirmação nominal integral apenas por canal autorizado.

**Prioridade:** P2

**Gestão interessada:** Presidência/Gabinete; cadastro; relacionamento; SUPFIS

**Visualização BI:** Grafo de subgrupo limitado com papéis/fontes e tabela de empresas; fora do total executivo principal.

## Presença técnica e acervo

### UC08 — Cobertura de responsabilidade técnica

**Resumo:** Empresas com registro vigente e ao menos um vínculo técnico vigente identificado no mesmo corte.

**Decisão:** Localizar lacunas documentais por atividade e orientar verificação das condições de exercício empresarial.

**Exemplo:** Exemplo sintético: Das 5.000 raízes com registro vigente, 4.600 têm ao menos um RT vigente identificado: 92%.

**Cálculo ou regra:** 100 × raízes com registro/visto vigente e vínculo RT vigente identificado ÷ raízes com registro/visto vigente. Quando registro e escopo são por estabelecimento, calcular também no estabelecimento com regra própria, sem transferir automaticamente RT de filial.

**Grão e unidade:** Raiz ou estabelecimento explicitamente escolhido; vínculo e profissional distintos em medidas separadas.

**Referência temporal:** Corte mensal; validade do vínculo e do registro na mesma data.

**Fontes:** CREA-registro; CREA-vinculo-tecnico; CREA-profissional

**Dados internos necessários:** Profissional/RNP; empresa/estabelecimento; tipo e escopo; início/fim; situação e atribuição

**Limitações:** Sem RT identificado pode ser falta de integração ou baixa recente, não infração comprovada. Número de vínculos não é número de pessoas.

**Acesso e viabilidade:** Interno, após conciliação de episódios e escopos.

**Prioridade:** P1

**Gestão interessada:** SUPFIS; cadastro; câmaras técnicas; Presidência/Gabinete

**Visualização BI:** Barra de cobertura e heatmap modalidade×atividade; drillthrough de lacunas.

### UC09 — Continuidade da responsabilidade técnica

**Resumo:** Dias em que empresas registradas mantiveram vínculo técnico identificado, incluindo lacunas transitórias entre trocas.

**Decisão:** Distinguir um estoque satisfatório no último dia de interrupções recorrentes ao longo do ano.

**Exemplo:** Exemplo sintético: Uma empresa ficou registrada por 365 dias e teve RT identificado em 350: continuidade documental de 95,9%; os 15 dias faltantes ficam visíveis.

**Cálculo ou regra:** 100 × soma de empresa-dias com registro vigente e ao menos um RT vigente no escopo ÷ soma de empresa-dias com registro vigente. Unir intervalos sobrepostos antes de contar; mostrar distribuição de dias sem cobertura e trocas por empresa.

**Grão e unidade:** Empresa-dia; razão de exposição temporal, vínculos unidos.

**Referência temporal:** Janela móvel de 12 meses; cortes alternativos de 3/6 meses.

**Fontes:** CREA-registro; CREA-vinculo-tecnico

**Dados internos necessários:** Intervalos completos de registros e vínculos; data de efeito; escopo

**Limitações:** Não aplicar prazo de tolerância inventado. Intervalos incompletos reduzem cobertura histórica e precisam ser identificados. Não mede dedicação efetiva do profissional.

**Acesso e viabilidade:** Interno; requer histórico de vínculos consistente.

**Prioridade:** P1

**Gestão interessada:** SUPFIS; cadastro; câmaras técnicas

**Visualização BI:** Linha de continuidade e distribuição de dias descobertos; timeline de vínculos no detalhe.

### UC10 — Atividade técnica empresarial registrada

**Resumo:** Empresas com ART vinculada explicitamente, por atividade, território de execução e período.

**Decisão:** Entender onde ocorre produção técnica documentada e como evolui a participação das empresas da base.

**Exemplo:** Exemplo sintético: Das 4.000 raízes com registro em algum momento do ano, 2.500 possuem ART de atividade vinculada: 62,5%; uma empresa pode atuar em várias modalidades.

**Cálculo ou regra:** Universo U = raízes com registro/visto vigente em pelo menos um dia da janela, incluindo as que saíram antes do corte final. Numerador = COUNT DISTINCT das raízes na interseção U ∩ raízes com ART elegível na janela e empresa contratada explicitamente informada. Taxa = 100 × numerador ÷ COUNT DISTINCT U; se U vazio, sem taxa. Separar ART obra/serviço, múltipla e cargo/função; usar itens quando a medida for serviços, sem chamar documentos de obras distintas. A contagem geral de empresas com ART fora de U, quando exibida, é medida separada e não entra nesse numerador.

**Grão e unidade:** Empresa distinta, documento ART e item de atividade em medidas separadas.

**Referência temporal:** Evento de registro no período; vigência histórica empresarial; local de execução separado da sede.

**Fontes:** CREA-ART; CREA-registro; CREA-vinculo-tecnico

**Dados internos necessários:** Empresa contratada; autor; tipo/situação/forma ART; datas; atividades; local; ARTs vinculadas

**Limitações:** Nenhuma ART localizada não prova inatividade. Valor de ART não equivale faturamento; complementares e contratos globais podem duplicar valores. ART sem empresa não é artificialmente atribuída.

**Acesso e viabilidade:** Interno; regra de documentos válidos, substituições e itens a homologar.

**Prioridade:** P1

**Gestão interessada:** Presidência/Gabinete; SUPFIS; câmaras técnicas; planejamento

**Visualização BI:** Combo empresas com ART/documentos ao longo do tempo e treemap de atividade com unidades claras.

### UC11 — Acervo operacional empresarial

**Resumo:** Empresas que obtiveram CAO e composição do acervo por atividades e ARTs relacionadas.

**Decisão:** Conhecer a formalização da capacidade operacional e orientar serviços/relacionamento em setores com demanda pública.

**Exemplo:** Exemplo sintético: Foram emitidas 400 CAOs para 280 empresas no ano; no corte, 390 certidões permanecem válidas. Os dois números respondem a questões diferentes.

**Cálculo ou regra:** Emissão = COUNT DISTINCT CAO com data de emissão na janela; empresas = COUNT DISTINCT titular PJ; acervo documentado = ARTs explicitamente relacionadas. Estoque válido no corte exige eventos de perda de validade; nunca apagar emissão histórica por revogação posterior.

**Grão e unidade:** CAO, empresa titular e ART relacionada separadamente; fluxo e estoque.

**Referência temporal:** Emissões mensais/anuais e corte de validade identificado.

**Fontes:** CREA-CAO; CREA-CAO-ART; CREA-ART

**Dados internos necessários:** Titular PJ; solicitação/emissão; situação/eventos; ARTs relacionadas; atividade; autenticação

**Limitações:** CAO não é CAT profissional; ausência de CAO não comprova incapacidade nem irregularidade. Validade histórica depende de eventos não presentes em simples status atual.

**Acesso e viabilidade:** Interno; formulários documentados, completude do banco a mapear.

**Prioridade:** P1

**Gestão interessada:** GPP/EAPA ou área de acervo competente; câmaras técnicas; relacionamento; Presidência/Gabinete

**Visualização BI:** Colunas de emissões e linha de empresas distintas, composição por atividade e tooltip de validade.

## Demanda pública e investimentos

### UC12 — Demanda pública por serviços técnicos

**Resumo:** Contratos públicos de escopo técnico selecionado, com valores contratados e papéis geográficos explicitamente definidos.

**Decisão:** Mostrar mercados públicos relevantes e orientar planejamento por modalidade, região e órgão comprador.

**Exemplo:** Exemplo sintético: Uma carteira de 120 contratos técnicos soma R$ 90 milhões contratados; R$ 55 milhões têm execução em SP confirmada e o restante apenas órgão paulista identificado.

**Cálculo ou regra:** COUNT DISTINCT contrato oficial e SUM valor contratado da versão vigente por contrato. Classificar itens/objetos com dicionário validado e revisão. Não somar aviso, adjudicação, contrato, aditivo e pagamento como valores independentes da mesma compra. Exibir cobertura de local de execução.

**Grão e unidade:** Contrato/item oficial; R$ contratado, não pago nem receita do fornecedor.

**Referência temporal:** Assinatura/publicação no período separadas; atualização por versão; referência monetária nominal ou deflacionada.

**Fontes:** JC01; JC02; JC03; JC05; JC07; JC10

**Dados internos necessários:** Cadastro e taxonomia de atividades para cruzamentos; correspondências oficiais e regras de classificação

**Limitações:** Unidade de compra em SP não comprova execução no estado. Texto classificado é sugestão técnica, não obrigação de registro. Cobertura temporal varia por sistema.

**Acesso e viabilidade:** PNCP e Compras com APIs documentadas/testadas; arquivos TCE por lote; capital exige complemento TCM-SP.

**Prioridade:** P1

**Gestão interessada:** Presidência/Gabinete; planejamento; SUPFIS; câmaras técnicas

**Visualização BI:** Combo contratos/valor por mês, matriz modalidade×órgão e mapa com papel territorial selecionado.

### UC13 — Cobertura dos fornecedores técnicos

**Resumo:** Presença de registro/visto entre fornecedores identificados em contratações técnicas de interesse territorial do CREA-SP.

**Decisão:** Investigar subconjuntos contratados com lacuna de correspondência e distinguir fornecedores paulistas de executores de fora.

**Exemplo:** Exemplo sintético: De 300 fornecedores de contratos com execução paulista confirmada, 240 têm registro/visto vigente na referência selecionada: 80%.

**Cálculo ou regra:** 100 × CNPJs fornecedores completos elegíveis com correspondência vigente ÷ CNPJs fornecedores completos elegíveis. Selecionar uma referência por fornecedor (por exemplo, última assinatura na janela) ou calcular no grão fornecedor–contrato; não misturar os denominadores. Exibir histórico/sem correspondência.

**Grão e unidade:** Fornecedor CNPJ completo ou fornecedor–contrato, medida identificada.

**Referência temporal:** Vigência na assinatura/execução quando reconstruível; caso contrário último snapshot explicitamente rotulado.

**Fontes:** JC02; JC03; JC04; CREA-registro; RFB-CNPJ

**Dados internos necessários:** CNPJ validado; registro/visto e vigência; cobertura territorial dos atos

**Limitações:** Fornecedor contratado pode não ser executora de todas atividades. Necessidade de visto/registro depende da atividade e circunscrição. Ausência de match exige revisão.

**Acesso e viabilidade:** Público com APIs mais cadastro interno; histórico de registro é condição para leitura retrospectiva.

**Prioridade:** P1

**Gestão interessada:** SUPFIS; câmaras técnicas; Presidência/Gabinete

**Visualização BI:** Funil contrato→fornecedor→correspondência e ranking por modalidade/território.

### UC14 — Rastreabilidade entre contrato e ART

**Resumo:** Contratos técnicos com ponte documental validada para uma ou mais ARTs do escopo correspondente.

**Decisão:** Direcionar fiscalização digital à falta de conciliação documental e melhorar integração com contratantes públicos.

**Exemplo:** Exemplo sintético: Dos 200 contratos elegíveis com dados suficientes, 130 têm ponte validada para ART: 65%; outros 30 são candidatos ainda não confirmados.

**Cálculo ou regra:** 100 × contratos elegíveis com ponte confirmada contrato–ART ÷ contratos elegíveis com dados mínimos de conciliação. Publicar também contratos sem dados mínimos ÷ carteira técnica. Confirmar órgão, nº contrato/processo, partes, escopo, local e período; candidatos aproximados ficam fora do numerador.

**Grão e unidade:** Contrato distinto; ponte N:M com ART, por escopo/atividade.

**Referência temporal:** Referência do contrato e janela de execução; datas de observação e validação da ponte.

**Fontes:** JC02; JC03; JC24; CREA-ART

**Dados internos necessários:** Número contrato/processo na ART; partes CNPJ; atividade/local/período; rede ART; histórico de validação

**Limitações:** Mesmo CNPJ não prova cobertura de contrato. Não encontrado não é inexistência de ART; modelos antigos podem carecer de chave. ARTs de subcontratação/complementares requerem rede.

**Acesso e viabilidade:** P1 para extração pública e mapeamento interno; homologação da ponte e campo local necessária.

**Prioridade:** P1

**Gestão interessada:** SUPFIS; câmaras técnicas; SUPTEC/EDAD; órgãos parceiros

**Visualização BI:** Matriz de rastreabilidade por modalidade e Sankey com confirmado/candidato/sem dados, sem somar fluxos incompatíveis.

### UC15 — Carteira de infraestrutura em SP

**Resumo:** Projetos e obras do CIPI/Obrasgov com localização, estágio, execução e relações contratuais disponíveis.

**Decisão:** Antecipar demanda técnica e contextualizar presença de empresas/ARTs em investimentos concretos.

**Exemplo:** Exemplo sintético: Uma carteira observada de 80 empreendimentos contém 20 em execução e 8 paralisados; 45 possuem referência contratual utilizável.

**Cálculo ou regra:** COUNT DISTINCT ID CIPI/projeto por fase e data do evento/snapshot; agregar valor planejado, contratado e executado em medidas independentes. Cobertura documental = projetos elegíveis com empresa/contrato/ART confirmados ÷ projetos com dados mínimos; sem dados em grupo separado.

**Grão e unidade:** Empreendimento/projeto CIPI distinto; contratos e medições em fatos separados.

**Referência temporal:** Snapshot da carteira e evolução de eventos; preservar revisões e estágios.

**Fontes:** JC11; JC12; JC13; JC14; JC15; CREA-ART

**Dados internos necessários:** Pontes obra–contrato–ART; empresa/contratante; atividades e datas

**Limitações:** Obra financiada/planejada não é executada. Paralisação não prova falha do RT nem irregularidade da empresa. Geografia/projeto multicidade pode impedir rateio financeiro por município.

**Acesso e viabilidade:** Obrasgov com dados e geometrias testados; módulos Transferegov documentados, integrações específicas ainda a homologar.

**Prioridade:** P1

**Gestão interessada:** Presidência/Gabinete; planejamento; SUPFIS; câmaras técnicas

**Visualização BI:** Mapa de carteira e combo estágio/execução; drillthrough empreendimento→contrato→ART.

### UC16 — Obras do CNO com vínculo técnico identificado

**Resumo:** Conciliação de obras cadastradas no CNO com empreendimento, empresa e ART, somente mediante acesso autorizado.

**Decisão:** Ampliar a observação de obras privadas e comparar presença documental com universo identificável.

**Exemplo:** Exemplo sintético: Em um extrato autorizado de 500 obras paulistas com dados mínimos, 320 têm vínculo técnico confirmado; responsável tributário não é assumido como construtora.

**Cálculo ou regra:** 100 × CNOs elegíveis com ponte validada para ART/empresa executora ÷ CNOs elegíveis com dados mínimos. Contar CNO distinto, sem multiplicar por responsável, contrato ou ART. Filtrar SP pelo local da obra, não pelo responsável.

**Grão e unidade:** Obra CNO distinta; papéis proprietário/responsável tributário/executora preservados.

**Referência temporal:** Cadastro/situação e execução na mesma referência; eventos históricos se fornecidos.

**Fontes:** RFB-CNO; CREA-ART; CREA-registro

**Dados internos necessários:** Código CNO/obra quando registrado; local; contrato; partes e papéis; ARTs e vigências

**Limitações:** CNO não é cadastro público aberto nesta pesquisa. Responsável não identifica necessariamente executora. Falta de ponte não comprova ausência de ART.

**Acesso e viabilidade:** Parceria/Conecta com autorização jurídica e técnica; esquema documentado, dados não acessados.

**Prioridade:** Parceria

**Gestão interessada:** SUPFIS; câmaras técnicas; SUPTEC/EDAD; RFB parceira

**Visualização BI:** Funil de cobertura da conciliação e mapa de obras com detalhamento de papéis.

## Evidência territorial e setorial

### UC17 — Atividade licenciada com presença técnica

**Resumo:** Licenças e empreendimentos identificáveis em fontes ambientais/municipais com relações empresariais e técnicas documentadas.

**Decisão:** Priorizar setores e locais com atividade concreta observada para análise digital e cooperação com licenciadores.

**Exemplo:** Exemplo sintético: Um parceiro fornece 200 licenças industriais com titular CNPJ e vigência; 150 têm titular conciliado ao CREA, mas só 60 identificam executora ou RT de projeto.

**Cálculo ou regra:** Contar licença/processo/empreendimento e titular CNPJ em medidas separadas. Taxa por papel = entidades elegíveis com correspondência confirmada no papel ÷ entidades com identificador suficiente naquele papel. ART ligada exige ponte de processo/obra, não mera titularidade.

**Grão e unidade:** Licença/empreendimento; pessoa por papel; CNPJ quando disponível.

**Referência temporal:** Emissão, vigência, fase e data da carga separadas; não tratar licença expirada como atividade atual.

**Fontes:** SET14; SET27; SET13; SET15; CREA-ART; CREA-registro

**Dados internos necessários:** Empresa/local; chave processo/obra; responsável e escopo; ART e vigência

**Limitações:** CETESB é parceria/consulta, não API aberta comprovada. CTF não é licença. GeoSampa testado não mostrou CNPJ nas camadas amostradas e cobre apenas capital. Titular não equivale a consultoria/executora.

**Acesso e viabilidade:** P2 piloto em camadas abertas com identificadores; parceria prioritária CETESB e prefeituras para carga estruturada.

**Prioridade:** Parceria

**Gestão interessada:** SUPFIS; câmaras técnicas; planejamento; órgãos licenciadores

**Visualização BI:** Mapa com fase/licença e matriz papel→presença documental; filtro fonte/cobertura.

### UC18 — Presença técnica em setores regulados

**Resumo:** Empresas e instalações de energia, combustíveis, telecomunicações e outras atividades com identificadores oficiais.

**Decisão:** Organizar verificações por atividade efetivamente autorizada e mapear expansão setorial relevante.

**Exemplo:** Exemplo sintético: Em 100 usinas com agentes identificados por CNPJ, 75 operadores são conciliados ao cadastro; a obra de implantação requer ponte própria para identificar a executora.

**Cálculo ou regra:** Por regulador e categoria: COUNT DISTINCT instalação/ato e CNPJs por papel; cobertura = CNPJs elegíveis conciliados ÷ CNPJs elegíveis identificáveis. Na ANEEL ligar usina→agente por CEG e só então CNPJ→CREA. Não somar contagens de instalações como empresas.

**Grão e unidade:** Instalação, agente/operador e ato regulatório em fatos separados.

**Referência temporal:** Competência, situação da autorização e data de operação; comparar expansões em snapshots compatíveis.

**Fontes:** SET01; SET04; SET05; SET06; SET07; SET10; SET12; SET18; SET20; SET21; CREA-registro; CREA-ART

**Dados internos necessários:** CNPJ canônico; vínculo técnico; escopo/modalidade; referência de instalação/obra quando houver

**Limitações:** Operador, titular e instalador são diferentes. Transportadora RNTRC não é engenharia por definição. DETRAN/INMETRO/ANM exigem validação de identificador e escopo; ECV não equivale a ITL.

**Acesso e viabilidade:** P1 piloto ANEEL/ANP com GET testado; demais P2 ou parceria, com recência explicitada.

**Prioridade:** P1

**Gestão interessada:** SUPFIS; câmaras técnicas; Presidência/Gabinete; planejamento

**Visualização BI:** Matriz regulador×modalidade com contagem de agentes e mapa de instalações; seleção do papel.

## Demanda pública e investimentos

### UC19 — Investimentos empresariais financiados

**Resumo:** Operações BNDES por setor, projeto e território disponível, relacionadas ao tomador empresarial.

**Decisão:** Identificar polos e segmentos com investimento que podem ampliar demanda por serviços técnicos.

**Exemplo:** Exemplo sintético: Uma carteira de R$ 200 milhões contratados inclui R$ 80 milhões desembolsados em operações de empresas industriais; isso não representa receita das prestadoras de engenharia.

**Cálculo ou regra:** COUNT DISTINCT operação e SUM contratado ou desembolsado conforme medida selecionada, após deduplicação por ID/versão. Decompor tomadores CNPJ por presença CREA; distinguir município do cliente do local do projeto quando houver. Não criar ligação ao fornecedor da obra sem documento.

**Grão e unidade:** Operação de financiamento e tomador CNPJ; R$ contratado/desembolsado separados.

**Referência temporal:** Data de contratação e desembolso; competência da carteira e correções.

**Fontes:** SET22; SET23; RFB-CNPJ; CREA-registro

**Dados internos necessários:** Correspondência CNPJ; registro por vigência; eventual ponte projeto/ART

**Limitações:** Tomador não é executora. Operação pode financiar máquinas/capital de giro, não obra. Fonte FINEP ainda tem descoberta de recurso pendente. Usar escopo técnico/classificação revisada.

**Acesso e viabilidade:** BNDES dados JSON testados; FINEP P2 após resolver recurso oficial.

**Prioridade:** P2

**Gestão interessada:** Presidência/Gabinete; planejamento; SUPFIS; relacionamento

**Visualização BI:** Linha de contratado/desembolsado e dispersão setor×município com papel geográfico.

## Fiscalização digital

### UC20 — Evidências convergentes de atividade

**Resumo:** Empresas/estabelecimentos em que uma combinação de observações datadas sustenta uma verificação digital, sem presumir independência estatística entre fontes.

**Decisão:** Concentrar análise em evidência verificável, reduzindo listas extensas geradas apenas por CNAE.

**Exemplo:** Exemplo sintético: Um estabelecimento ativo tem contrato público de manutenção elétrica com execução em SP e nenhuma correspondência vigente localizada; o caso entra para revisão, sem rótulo de infração.

**Cálculo ou regra:** Regra booleana AND versionada: CNPJ exato da entidade E atividade técnica observada em fonte externa E pertinência territorial confirmada E ausência de correspondência vigente ou divergência cadastral documentada na data disponível. Cruzamentos adicionais podem formar subconjuntos mais específicos, sem atribuir probabilidade à combinação. COUNT DISTINCT estabelecimento e raízes separadamente; nenhum escore de risco arbitrário. Deduplicar o mesmo evento/documento reproduzido por PNCP, TCE ou outro espelho, sem multiplicar evidências.

**Grão e unidade:** Observação datada por regra/fonte/entidade; estabelecimento e empresa distintos.

**Referência temporal:** Janela da atividade, validade da evidência e data da consulta; expirar observações conforme regra documentada.

**Fontes:** JC02; SET01; SET04; RFB-CNPJ; CREA-registro; CREA-ART; CREA-evidencia

**Dados internos necessários:** Histórico de registro e vínculos; regras de conciliação; status de confirmação/descarte; dados utilizados

**Limitações:** Fontes repetindo a mesma publicação, inclusive PNCP e espelho TCE, não representam eventos ou evidências adicionais. Combinação de observações não comprova independência probabilística nem infração. Ausência de correspondência não comprova descumprimento da obrigação aplicável. Não contar fila/tramitação/produtividade fiscal como resultado estratégico.

**Acesso e viabilidade:** P1 em fontes já verificadas e cadastro interno; regras e universo precisam de validação técnica.

**Prioridade:** P1

**Gestão interessada:** SUPFIS; câmaras técnicas; SUPTEC/EDAD; UDE/planejamento

**Visualização BI:** Matriz tipo de evidência×atividade e grafo documental limitado; seleção abre conjunto, não fluxo de tratativa.

## Sustentabilidade e serviços empresariais

### UC21 — Adimplência empresarial no CREA-SP

**Resumo:** Empresas com obrigações vencidas elegíveis e ausência de saldo vencido exigível no corte.

**Decisão:** Dimensionar sustentabilidade da base e orientar relacionamento/cobrança por segmento com denominador claro.

**Exemplo:** Exemplo sintético: De 4.000 empresas com obrigações exigíveis vencidas até o corte, 3.200 não têm saldo vencido: adimplência de 80%.

**Cálculo ou regra:** 100 × raízes elegíveis sem saldo vencido exigível positivo ÷ raízes com ao menos uma obrigação elegível vencida até o corte. Somar títulos por empresa antes de classificar; identificar suspensão/impugnação e critérios do parcelamento. Mostrar empresas sem obrigação no corte separadas.

**Grão e unidade:** Empresa distinta e saldo por título em centavos; estoque no corte.

**Referência temporal:** Corte mensal, competência da obrigação e vencimento separados.

**Fontes:** CREA-titulo-financeiro; CREA-pagamento; CREA-registro

**Dados internos necessários:** Devedor empresa; natureza título; principal/encargos; vencimento; pagamento/estorno; situação jurídica; parcelamento

**Limitações:** Adimplência da empresa não é adimplência de um registro específico. Multa suspensa por recurso não deve ser tratada como dívida exigível sem regra jurídica. Não usar pagamentos a fornecedores do portal de transparência.

**Acesso e viabilidade:** Interno restrito; perfis, regras jurídicas e RLS/OLS de produção.

**Prioridade:** P1

**Gestão interessada:** SUPADF/financeiro; Presidência/Gabinete; relacionamento; jurídico competente

**Visualização BI:** Linha de adimplência e matriz GRE×porte/CNAE com universo e valor vencido separados.

### UC22 — Recebimentos empresariais do CREA-SP

**Resumo:** Entradas efetivas de caixa provenientes de pessoas jurídicas por natureza, separando fluxo de estoque a receber.

**Decisão:** Entender a composição financeira ligada às empresas e sustentar planejamento de receita com evidência.

**Exemplo:** Exemplo sintético: No mês entraram R$ 5 milhões de PJ, sendo R$ 3 milhões de anuidades, R$ 1,5 milhão de serviços/ART atribuídos corretamente e R$ 0,5 milhão de outras naturezas.

**Cálculo ou regra:** SUM recebimentos alocados a devedor PJ no período de pagamento − estornos correspondentes, por natureza. Recuperação de títulos antigos é subconjunto desses recebimentos; não somar novamente. Regras para ART paga pela empresa em nome de profissional explícitas.

**Grão e unidade:** Movimentação de caixa/alocação por título; R$ em centavos.

**Referência temporal:** Data de pagamento/compensação e competência do título em eixos separados; comparação real requer deflator.

**Fontes:** CREA-pagamento; CREA-titulo-financeiro; IBGE-IPCA

**Dados internos necessários:** Devedor/pagador e beneficiário; alocação ao título; natureza; data; valor; estornos

**Limitações:** Valor emitido, vencido, parcelado e recebido não são equivalentes. Identidade do pagador não deve substituir automaticamente titular da obrigação. Receita nominal crescida por reajuste não prova expansão real.

**Acesso e viabilidade:** Interno restrito; conciliação bancária/contábil antes da publicação agregada.

**Prioridade:** P1

**Gestão interessada:** SUPADF/financeiro; Presidência/Gabinete; planejamento

**Visualização BI:** Colunas empilhadas por natureza e linha comparativa; recuperação destacada como subconjunto.

### UC23 — Recuperação da dívida empresarial

**Resumo:** Parcela do saldo vencido de uma carteira fixa inicial efetivamente recuperada em caixa, sem incluir encargos gerados depois da abertura na taxa.

**Decisão:** Avaliar potencial financeiro recuperável e comparar coortes/estratégias sem confundir novas dívidas com recuperação.

**Exemplo:** Exemplo sintético: Uma carteira inicial vencida de R$ 10 milhões gerou R$ 1,35 milhão de caixa líquido: R$ 1,2 milhão alocado ao saldo inicial e R$ 150 mil a encargos posteriores. A recuperação do saldo inicial é 12%; R$ 300 mil cancelados sem caixa não são recuperação.

**Cálculo ou regra:** Fixar, para cada título i da coorte inicial, o saldo exigível inicial S_i e seus componentes (principal e encargos já integrantes desse saldo). Numerador = soma, por título, da parcela efetivamente recebida e alocada a esses componentes iniciais, líquida dos estornos correspondentes, limitada entre zero e S_i. Taxa = 100 × numerador ÷ soma de S_i; se saldo inicial zero, sem taxa. Juros/encargos posteriores à abertura ficam fora do numerador e são exibidos como caixa adicional, junto do caixa total líquido da coorte, sem chamar esse total de taxa de recuperação do saldo inicial. Exibir baixas sem caixa, novas inadimplências e saldo final separadamente; não trocar a carteira durante a comparação.

**Grão e unidade:** Título da coorte inicial e empresa devedora; R$ e taxa de recuperação.

**Referência temporal:** Coorte na data inicial, acompanhamento mensal/trimestral/12 meses.

**Fontes:** CREA-titulo-financeiro; CREA-pagamento

**Dados internos necessários:** Saldo histórico inicial; identificador do título; alocações de pagamentos; encargos/abatimentos; estornos; status jurídico

**Limitações:** Parcelamento assinado não é caixa recuperado. Caixa total com encargos posteriores pode exceder o saldo inicial; por isso não serve de numerador dessa taxa. É necessário identificar a alocação aos componentes iniciais e os estornos; sem essa abertura, publicar caixa e saldo em separado, sem taxa homologada. Valores em discussão/suspensos precisam categoria distinta. Não somar saldos de meses sucessivos.

**Acesso e viabilidade:** Interno restrito; exige reconstrução histórica de saldo e alocação.

**Prioridade:** P1

**Gestão interessada:** SUPADF/financeiro; jurídico competente; Presidência/Gabinete

**Visualização BI:** Curvas de recuperação por coorte e waterfall do saldo com baixas sem caixa separadas.

### UC24 — Prazo dos serviços empresariais

**Resumo:** Tempo e previsibilidade de serviços que habilitam ou documentam a atuação empresarial: registro, alteração, RT e CAO.

**Decisão:** Identificar gargalos de experiência da empresa e priorizar integração/desburocratização com impacto institucional.

**Exemplo:** Exemplo sintético: Em registros empresariais concluídos no mês, mediana de 8 dias e P90 de 20; pedidos ainda abertos têm idade própria e não desaparecem da análise.

**Cálculo ou regra:** Mediana e P90 de conclusão−abertura para pedidos concluídos por serviço; taxa no prazo = concluídos dentro do prazo definido ÷ concluídos com prazo aplicável. Exibir idade/percentil dos abertos e volume de exigências separadamente; tempo suspenso só descontado se regra e eventos forem confiáveis.

**Grão e unidade:** Pedido/protocolo por serviço e objeto empresarial; dias, não empresas distintas.

**Referência temporal:** Coorte de abertura e coorte de conclusão com rótulos distintos; mensal.

**Fontes:** CREA-protocolo; CREA-registro; CREA-vinculo-tecnico; CREA-CAO

**Dados internos necessários:** Abertura/conclusão; serviço/subtipo; exigência/suspensão; prazo normativo; objeto/empresa

**Limitações:** Complexidade e pendência documental afetam prazos; não comparar serviços heterogêneos nem rankings individuais de colaboradores. Não é avaliação da produtividade da fiscalização.

**Acesso e viabilidade:** Interno; dicionário de estados e eventos necessário.

**Prioridade:** P1

**Gestão interessada:** cadastro/atendimento; GPP/EAPA ou área competente; SUPTEC/EDAD; Presidência/Gabinete

**Visualização BI:** Combo volume/mediana/P90 por serviço e faixas de idade do estoque aberto.

## Contexto econômico e formação

### UC25 — Emprego técnico formal em SP

**Resumo:** Estoque e movimentação de empregos em ocupações e atividades relacionadas à engenharia, em agregações oficiais.

**Decisão:** Identificar mudanças setoriais/territoriais relevantes ao mercado das empresas e confrontá-las com evolução cadastral agregada.

**Exemplo:** Exemplo sintético: Um município apresenta saldo de 300 empregos técnicos em 12 meses e crescimento de 5% das empresas registradas; as séries se relacionam territorialmente, sem identificar empregadores.

**Cálculo ou regra:** Estoque = soma de vínculos RAIS na data de referência e recorte CBO/CNAE validado. Fluxo CAGED = admissões−desligamentos na janela, com revisões. Não obter estoque atual somando saldo ao RAIS sem compatibilizar metodologia. Crescimentos CREA e emprego ficam em eixos separados.

**Grão e unidade:** Município×CNAE×CBO×competência, apenas cruzamentos divulgados; vínculos, não pessoas distintas.

**Referência temporal:** RAIS anual e CAGED mensal com competências e cobertura separadas.

**Fontes:** LAB01; LAB02; LAB03; LAB04; LAB05; CREA-registro

**Dados internos necessários:** Somente agregados por território/CNAE/período para comparação

**Limitações:** CBO declarado não prova formação/registro. Dados abertos não são vínculo nominal CNPJ/CPF. Vínculos ≠ empregados distintos; abertura pode ter sigilo e revisões.

**Acesso e viabilidade:** Arquivos oficiais não identificados e produtos agregados SP; não depende de acessar profissionais individualizados.

**Prioridade:** P1

**Gestão interessada:** Presidência/Gabinete; planejamento; câmaras técnicas; relacionamento

**Visualização BI:** Combo admissões/desligamentos/saldo, matriz CNAE×CBO e dispersão crescimento emprego×base CREA.

### UC26 — Remuneração técnica real

**Resumo:** Nível e distribuição de remuneração/salários de ocupações selecionadas, com valores reais e universo explícito.

**Decisão:** Compreender atratividade e transformação do mercado técnico sem fazer acusação individual a empresas.

**Exemplo:** Exemplo sintético: A remuneração mediana real de uma CBO cai 4% em três anos no recorte paulista; o resultado não identifica quem paga abaixo de um piso.

**Cálculo ou regra:** Calcular média ponderada/mediana conforme microdados e variável oficial disponíveis, por CBO/CNAE/local/período. RAIS remuneração de vínculos e CAGED salário de admissão em medidas separadas. Deflacionar valores monetários pelo IPCA para base explicitada; não somar ou promediar médias sem pesos.

**Grão e unidade:** Vínculo/ocupação em agregação; R$ reais de base e distribuição, nunca pessoa ou empresa inferida.

**Referência temporal:** RAIS anual; CAGED mensal; média da janela e mês-base do deflator explícitos.

**Fontes:** LAB01; LAB02; LAB03; LAB05; LAB06; IBGE-IPCA

**Dados internos necessários:** Nenhum dado nominal necessário; dicionário de recortes técnicos validado

**Limitações:** Salário de admissão ≠ remuneração total; jornada, vínculo, senioridade e composição afetam comparação. Não concluir descumprimento de piso a partir de média/CBO.

**Acesso e viabilidade:** Público agregado/não identificado; validação das variáveis e cobertura.

**Prioridade:** P1

**Gestão interessada:** Presidência/Gabinete; câmaras técnicas; planejamento

**Visualização BI:** Linha real com faixas/boxplot quando amostra permitir e decomposição por ocupação/região.

### UC27 — Formação em engenharia em SP

**Resumo:** Oferta de cursos, matrículas, ingressantes e concluintes em áreas compatíveis, sem identificação nominal pública.

**Decisão:** Planejar parcerias com IES e comparar oferta de formação com mudanças do mercado de trabalho empresarial.

**Exemplo:** Exemplo sintético: Uma área reúne 12.000 matrículas e 2.000 concluintes em cursos presenciais de SP; ingressantes daquele ano não são denominador da taxa de conclusão da mesma turma.

**Cálculo ou regra:** Contagens oficiais por curso/IES/CINE/local/ano. Usar concluintes, matrículas e ingressantes como medidas distintas. Taxa de conclusão/evadidos somente em coortes do produto de trajetória compatível, não concluintes÷ingressantes do mesmo ano.

**Grão e unidade:** Curso/local de oferta×CINE×ano; matrículas ou pessoas conforme variável oficial, não profissionais registrados.

**Referência temporal:** Censo anual; defasagem de publicação e atualização dos cadastros de curso.

**Fontes:** EDU01; EDU02; EDU03; EDU04; EDU05; EDU07

**Dados internos necessários:** Cadastro interno IES/curso para pontes institucionais; equivalências de curso/modalidade validadas

**Limitações:** CINE não é automaticamente modalidade/atribuição CREA. Sede IES/EAD/polo exigem geografia própria. INEP público não oferece lista nominal de diplomados para match CPF.

**Acesso e viabilidade:** Arquivos públicos e produtos agregados; e-MEC exportação/API corrente a homologar. CAPES é complemento de pós-graduação.

**Prioridade:** P1

**Gestão interessada:** Presidência/Gabinete; área educacional/IES; câmaras técnicas; planejamento

**Visualização BI:** Sankey de fluxos oficiais quando compatíveis, séries e matriz formação×mercado agregada.

### UC28 — Ingresso dos concluintes no CREA-SP

**Resumo:** Conversão observada de coortes autorizadas de diplomados de IES parceiras em primeiro registro profissional.

**Decisão:** Identificar atraso ou perda de conexão com novos profissionais e orientar relacionamento baseado em cobertura conhecida.

**Exemplo:** Exemplo sintético: Dos 500 diplomados de uma coorte de IES parceiras, 350 têm primeiro registro observado até 12 meses: 70%, válido apenas para essa coorte.

**Cálculo ou regra:** 100 × pessoas da coorte nominal autorizada com primeiro registro até t meses após conclusão ÷ diplomados elegíveis da mesma coorte. Excluir registros anteriores da definição de primeiro ingresso ou classificá-los à parte. Exibir cobertura das IES participantes e coortes com tempo de observação completo.

**Grão e unidade:** Pessoa da coorte protegida; percentual e tempo até ingresso, agregado na apresentação.

**Referência temporal:** Conclusão por turma e acompanhamento de 3/6/12 meses; censura para coortes recentes.

**Fontes:** CREA-lista-formandos; PART02; CREA-profissional; EDU01

**Dados internos necessários:** Lista autorizada nome/CPF/curso/data; primeiro registro; identidade confirmada; base legal e finalidade

**Limitações:** Não extrapolar a todas IES de SP nem usar comparação INEP×CREA agregada como conversão individual. Não ligar diploma a empresa sem vínculo posterior documentado.

**Acesso e viabilidade:** Parceria/dado interno restrito; serviço de envio de formandos documentado, extração e uso precisam autorização.

**Prioridade:** Parceria

**Gestão interessada:** Presidência/Gabinete; área educacional/IES; relacionamento; câmaras técnicas

**Visualização BI:** Curva de coorte de ingresso e barras de tempo; sem nomes/CPF no painel público.

## Perícias e agenda regulatória

### UC29 — Demanda pericial de engenharia

**Resumo:** Nomeações/serviços periciais observados por profissão/especialidade validadas e território judicial.

**Decisão:** Dimensionar demanda técnica, lacunas territoriais de especialistas e oportunidades de cooperação com tribunais.

**Exemplo:** Exemplo sintético: Um extrato autorizado contém 400 nomeações em especialidades validadas no ano; 80 processos tiveram mais de uma nomeação, portanto processos não são o mesmo total.

**Cálculo ou regra:** COUNT DISTINCT ato de nomeação ou ID do serviço por categoria efetivamente observada e validada. Separar profissionais cadastrados, nomeações, perícias entregues e pagamentos. Valores de nomeação/honorários arbitrados não se somam como pagamentos efetuados.

**Grão e unidade:** Ato de nomeação/serviço pericial; profissão/especialidade e unidade judicial.

**Referência temporal:** Data da nomeação/entrega/pagamento em medidas diferentes; recorte SP por tribunal/unidade e local do objeto quando disponível.

**Fontes:** JC21; JC22; JC23; JC20; JC24

**Dados internos necessários:** Cadastro protegido de profissional e atribuições para validação; ART com processo quando existente

**Limitações:** Classe ou assunto DataJud não prova necessidade de engenheiro. Cadastro de perito não prova nomeação. APIs nominais abertas não foram comprovadas; cobertura distinta entre tribunais.

**Acesso e viabilidade:** Parceria TJSP/TRT2/TRT15/TRF3/CJF ou extrato institucional regular autorizado; páginas/exportações públicas precisam homologação.

**Prioridade:** Parceria

**Gestão interessada:** Presidência/Gabinete; câmaras técnicas; SUPFIS; tribunais parceiros

**Visualização BI:** Matriz especialidade×comarca e série de nomeações; indicadores separados de cadastro/pagamento.

### UC30 — Rastreabilidade pericial de ART

**Resumo:** Nomeações elegíveis com ligação confirmada a ART de perícia/processo, preservando escopo e identidade.

**Decisão:** Planejar fiscalização digital e intercâmbio com o Judiciário com base na documentação efetivamente rastreável.

**Exemplo:** Exemplo sintético: de 100 nomeações elegíveis, 20 não têm chave suficiente e 80 são comparáveis. Destas, 65 têm ponte confirmada de processo/órgão/profissional para ART e 15 aguardam verificação. Rastreabilidade no universo comparável = 65 ÷ 80 = 81,25%; cobertura de chaves = 80 ÷ 100 = 80%.

**Cálculo ou regra:** Rastreabilidade = 100 × nomeações elegíveis com ponte confirmada para ART compatível ÷ nomeações elegíveis com dados mínimos comparáveis. Cobertura de chaves = 100 × nomeações com dados mínimos comparáveis ÷ total de nomeações elegíveis. Manter universo sem chave e candidatos separados; se denominador zero, sem taxa. Número CNJ, órgão, profissional confirmado, período e atividade sustentam o vínculo; ART múltipla exige item por processo.

**Grão e unidade:** Nomeação/serviço distinto e ponte com ART; profissional/empresa apenas quando explicitamente relacionado.

**Referência temporal:** Janela do serviço e data de registro; validar eventos posteriores/complementares.

**Fontes:** JC21; JC22; JC23; JC24; CREA-ART; CREA-profissional

**Dados internos necessários:** Campo processo/destinatário; modelo A.1/B.1 quando implementado; autor/atribuição; empresa contratada opcional; datas

**Limitações:** Modelo normativo não prova implementação/completude no banco. Não ausência de match = ausência de ART; nem toda perícia tem pessoa jurídica contratada. Honorários declarados não são pagamentos judiciais.

**Acesso e viabilidade:** Parceria judicial e mapeamento interno; não viável só com DataJud público.

**Prioridade:** Parceria

**Gestão interessada:** SUPFIS; câmaras técnicas; SUPTEC/EDAD; tribunais parceiros

**Visualização BI:** Funil de rastreabilidade e grafo processo→nomeação→profissional/empresa→ART.

## Contexto econômico e formação

### UC31 — Densidade empresarial e desenvolvimento regional

**Resumo:** Concentração de estabelecimentos técnicos em relação à população e estrutura econômica regional, mantendo medidas separadas.

**Decisão:** Contextualizar presença territorial e direcionar análise a regiões em transformação, evitando rankings por volume absoluto.

**Exemplo:** Exemplo sintético: Uma região tem 30 estabelecimentos selecionados por 10 mil habitantes e outra 12; comparar também cobertura CREA, VAB setorial e atualização das fontes.

**Cálculo ou regra:** Densidade = 10.000 × estabelecimentos RFB elegíveis no território ÷ população oficial no ano de referência. Exibir PIB/VAB e sua variação em séries próprias, com preços e bases explícitos; não combinar em índice arbitrário nem projetar automaticamente número esperado de registros.

**Grão e unidade:** Município/GRE com agregação oficial; estabelecimentos por 10 mil habitantes e medidas econômicas separadas.

**Referência temporal:** Anos/competências alinhados quando possível; defasagens visíveis, GRE com vigência.

**Fontes:** RFB-CNPJ; IBGE-POP; IBGE-PIB; IBGE-CEMPRE; SET26; CREA-registro

**Dados internos necessários:** Tabela oficial município–GRE; base de empresas para cobertura comparativa

**Limitações:** População não mede necessidade de ART e PIB não identifica empresa/atividade individual. Série PIB mudou de metodologia/base; não encadear sem notas. Não atribuir crescimento econômico à gestão CREA.

**Acesso e viabilidade:** Público agregado; população testada e metadados econômicos conferidos, séries específicas ainda a homologar.

**Prioridade:** P2

**Gestão interessada:** Presidência/Gabinete; planejamento; SUPFIS; relacionamento regional

**Visualização BI:** Dispersão densidade×cobertura com tamanho populacional/VAB e pequenas séries comparáveis.

## Perícias e agenda regulatória

### UC32 — Agenda normativa da engenharia

**Resumo:** Proposições e mudanças de tramitação com possível impacto em atividades, empresas, formação e exercício profissional.

**Decisão:** Antecipar interlocução institucional, pareceres técnicos e posicionamento da gestão por temas concretos.

**Exemplo:** Exemplo sintético: Um projeto sobre manutenção predial avança para votação; o painel mostra texto, alteração, comissão e setores potencialmente afetados, sem afirmar que já criou obrigação.

**Cálculo ou regra:** Conjunto versionado de proposições selecionadas por vocabulário/assuntos e revisão técnica; contar proposições distintas e novos eventos relevantes no período. Classificação por tema e impacto proposto é revisável; nenhuma soma de impacto financeiro hipotético.

**Grão e unidade:** Proposição e evento de tramitação; não empresas nem resultados econômicos.

**Referência temporal:** Data do evento, versão de texto e situação atual; aprovação, sanção e vigência são marcos separados.

**Fontes:** LEG-CAMARA; LEG-SENADO; LEG-ALESP; CREA-normativos

**Dados internos necessários:** Vocabulário técnico validado; áreas/câmaras responsáveis; critérios de relevância e parecer quando existente

**Limitações:** Busca por engenharia pode omitir termos setoriais ou trazer ruído. Projeto não é norma vigente. Não coletar conteúdo social/notícias como medida oficial de atividade.

**Acesso e viabilidade:** APIs/arquivos legislativos documentados e amostrados; busca temática e classificação ainda a homologar.

**Prioridade:** P2

**Gestão interessada:** Presidência/Gabinete; relações institucionais; câmaras técnicas; jurídico competente

**Visualização BI:** Linha do tempo temática com seleção por estágio e detalhe do texto/alteração; área de apoio, não cartão central.

## Demanda pública e investimentos

### UC33 — Demanda técnica planejada

**Resumo:** Itens dos planos anuais de contratação classificados como serviços/obras técnicos e ainda não materializados em contratos identificados.

**Decisão:** Antecipar demanda pública por especialidade e calendário, sem tratar planejamento como gasto garantido.

**Exemplo:** Exemplo sintético: Um PCA contém R$ 50 milhões estimados para serviços técnicos no próximo ano; R$ 10 milhões já têm procedimento/contrato identificado e aparecem separados.

**Cálculo ou regra:** COUNT DISTINCT item PCA e SUM valor estimado de itens elegíveis por exercício/versão. Separar planejado sem materialização identificada, contratação publicada e contrato confirmado mediante chaves oficiais; não somar as etapas como demanda adicional.

**Grão e unidade:** Item de planejamento por órgão/unidade/exercício e versão; R$ estimado.

**Referência temporal:** Exercício planejado, data prevista e última atualização; acompanhar revisões.

**Fontes:** JC01; JC03; JC05

**Dados internos necessários:** Dicionário de atividades/modalidades; eventuais pontes de acompanhamento

**Limitações:** Item pode ser cancelado, revisado ou não executado. Órgão comprador não informa necessariamente local da obra. Classificação textual exige revisão.

**Acesso e viabilidade:** APIs públicas documentadas; endpoints e chaves do PCA específico precisam homologação antes de rotina.

**Prioridade:** P2

**Gestão interessada:** Presidência/Gabinete; planejamento; câmaras técnicas; relacionamento

**Visualização BI:** Calendário/heatmap de demanda por modalidade e gráfico de etapas com valores sem dupla contagem.

### UC34 — Concentração do mercado público técnico

**Resumo:** Distribuição do valor contratado entre fornecedores em um mercado definido, junto da participação de empresas locais e registradas.

**Decisão:** Entender dependência de poucos fornecedores e oportunidades de desenvolvimento empresarial por segmento/território.

**Exemplo:** Exemplo sintético: Em um recorte de contratos elétricos de R$ 100 milhões, os cinco maiores fornecedores concentram R$ 60 milhões; isso descreve estrutura de mercado e não favorecimento.

**Cálculo ou regra:** Participação Top N = valor contratado dos N maiores CNPJs fornecedores ÷ valor total da carteira técnica deduplicada. Opcional HHI = soma dos quadrados das participações, com escala e mercado definidos. Raiz e estabelecimento em alternativas explícitas; exibir número de fornecedores e cobertura de CNPJ/valor.

**Grão e unidade:** Fornecedor por CNPJ completo ou raiz e carteira de contratos homogênea; participação percentual.

**Referência temporal:** Janela de contratos comparável, valores nominais/reais definidos e mercado/território fixos.

**Fontes:** JC02; JC03; RFB-CNPJ; CREA-registro

**Dados internos necessários:** Correspondência cadastral por CNPJ/vigência; regra de consolidação empresarial

**Limitações:** Concentração não prova conluio, favorecimento ou irregularidade. Valor do contrato pode ser global/multiterritorial; consórcios exigem regra de papéis, não divisão financeira inventada.

**Acesso e viabilidade:** Público com APIs e deduplicação; interpretação técnica antes de uso institucional.

**Prioridade:** P2

**Gestão interessada:** Presidência/Gabinete; planejamento; relacionamento empresarial; câmaras técnicas

**Visualização BI:** Pareto de fornecedores com linha acumulada, participação por origem e distribuição de valores.

## Sequência de entrega proposta

1. **Fundação e núcleo empresarial:** UC01–UC06, UC08–UC10, UC21–UC24. Confirmar schema, histórico e definições. UC02 depende de homologar a carga CNPJ oficial corrente.
2. **Fiscalização digital e investimento público:** UC12–UC15, UC18 e UC20, começando por PNCP/Obrasgov/ANEEL/ANP e pontes explícitas. Nenhuma interface de tramitação/autuação é necessária para demonstrar a informação.
3. **Contexto e relacionamento:** UC25–UC27 e, depois, UC19/UC31/UC33/UC34. UC07 é exploração societária documentada. UC11 aprofunda atividade e acervo empresarial.
4. **Cooperações de maior valor:** UC16 (CNO), UC17 (CETESB/licenciadores), UC28 (IES/coortes), UC29–UC30 (tribunais/perícias), além de identificadores completos quando legalmente autorizados. Não substituir acordo por raspagem de formulário.
5. **Agenda normativa:** UC32 em uma área contextual de acompanhamento, sem confundir mudança de proposição com resultado econômico ou obrigação vigente.

A primeira tela deve combinar cerca de oito medidas estratégicas com seis áreas de análise, sem tentar apresentar todos os recortes simultaneamente. Os casos selecionados para o panorama e suas métricas precisam ser validados com a gestão; essa recomendação não fixa o layout da reconstrução futura.

## Critérios mínimos antes de transformar um caso em medida oficial

- Definir responsável pela validação, fórmula versionada, universo, denominador, unidade, geografia, competência, cobertura e limitações.
- Preservar empresa-raiz, estabelecimento, registro/visto, profissional e vínculo em grãos diferentes; dados agregados de trabalho/educação não recebem identidades inventadas.
- Garantir reconciliação de estoques/fluxos/coortes, integridade das pontes e exposição dos conjuntos sem informação suficiente.
- Separar situação no último snapshot de situação histórica comprovada; datas de evento, vigência e extração são distintas.
- Aprovada a política de acesso, apresentar ao público apenas os agregados e documentos efetivamente publicáveis. A classificação pública/privada é individual por dado e finalidade.

Referências e evidências técnicas estão nos catálogos `empresas-economia-legislativo.json`, `formacao-trabalho.json`, `justica-compras-catalogo.json`, `setoriais.json` e nos relatórios `contexto-anexos.md` e `revisao-arquitetura.md`. A lista CNAE e os modelos de ART são insumos documentais; não substituem validação do exercício efetivo e da competência profissional.
