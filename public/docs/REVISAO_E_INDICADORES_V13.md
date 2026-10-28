# Revisão e indicadores empresariais — V13 / CREA-SP

A V13 mantém 17 medidas estratégicas, agora com **nomes que identificam CREA-SP, Receita ou PNCP**, origem visível e unidade de contagem explícita. A pergunta é apenas um apoio à leitura da definição. “Registro vigente” se refere ao cadastro do CREA-SP; “CNPJ ativo” se refere à situação cadastral na Receita. Um estado não substitui o outro.

**Os números do protótipo são fictícios e reproduzíveis.** Exemplos abaixo são didáticos e não são os valores calculados na tela. SQL Server e IBM Db2 são as origens internas informadas; conexões, views, credenciais e rotinas ainda precisam de homologação. APIs, arquivos oficiais e parcerias são caminhos de integração propostos, não fontes institucionais já conectadas. Frequências e responsáveis são propostas de governança.

## O painel está completo?

Os 17 indicadores compõem um núcleo útil de presença empresarial, vínculo técnico, atividade documentada, inteligência digital e sustentabilidade financeira. A revisão identificou três informações primordiais que precisavam aparecer com mais clareza. Elas entram como **leituras dos gráficos existentes**, sem acrescentar outra faixa de indicadores ou cinco abas:

1. **Universo empresarial no CREA-SP.** Distinguir empresas com registro vigente, empresas apenas com histórico de registro e empresas sem histórico identificado. Mostrar separadamente empresas-raiz, estabelecimentos e registros. Uma empresa pode ter várias filiais e vários registros: essas contagens não são somáveis.
2. **Conciliação CREA-SP × Receita.** Distribuir os CNPJs com registro CREA vigente pelas situações cadastrais da Receita, incluindo baixada, suspensa e inapta. Complementar com a decomposição do universo externo entre registro CREA vigente, apenas histórico e nunca identificado. O cruzamento serve para validar cadastro, sem concluir infração.
3. **Produção documental e acervo empresarial.** Relacionar quantidades de ARTs/CAOs com empresas distintas. A emissão de CAO é um evento ligado à pessoa jurídica e não se confunde com CAT profissional. Revogação atual deve ser informada separadamente; sem a data de revogação não se reconstrói retrospectivamente um estoque mensal válido.

Não acrescentei um índice agregado de “desempenho da gestão”, de “irregularidade” ou de “impacto econômico”: misturar esses fatos em um score esconderia critérios e não provaria causalidade. Tampouco um CNAE, um contrato publicado ou um vínculo não localizado comprova sozinho obrigação ou infração.

### Exemplos do cenário demonstrativo para validar as leituras

- **Universo:** 3.000 empresas = 1.908 com registro CREA vigente + 663 com histórico sem vigência + 429 sem histórico identificado. O cenário contém 3.600 estabelecimentos; empresa, estabelecimento e registro mantêm suas próprias contagens.
- **Receita × CREA:** entre 2.157 estabelecimentos com registro CREA vigente, a situação na Receita é ativa em 1.863, baixada em 173, suspensa em 63 e inapta em 58. Trata-se de amostra demonstrativa, não de diagnóstico real do CREA-SP.
- **Universo externo elegível:** 3.110 CNPJs = 1.863 com registro CREA vigente + 799 com histórico sem vigência + 448 nunca identificados. É outro denominador, diferente dos 2.157 CNPJs CREA vigentes acima.
- **Acervo:** na janela demonstrativa de 12 meses há 3.238 ARTs vinculadas a 2.014 empresas e 402 eventos de emissão de CAO. Dessas 402 CAOs, 52 têm situação atual revogada. As 52 não são apagadas da série histórica de emissão; a fonte não informa quando foram revogadas.

Esses valores servem à reconciliação do cenário padrão. Filtros e janelas diferentes recalculam seus conjuntos; não usar estes exemplos como constantes de tela ou números oficiais.

## Como ler o canvas

A tela preserva os oito indicadores essenciais, seis gráficos e nove medidas complementares. Nos gráficos, a frase inferior descreve **o que está contado ou comparado**, em linguagem direta. Fonte completa, cálculo, competência, limites e unidade ficam na ajuda “Como ler”. As alternâncias de Universo, Receita e CAO aprofundam o mesmo recorte e mantêm os filtros.

A referência visual fornecida pelo usuário orienta a V13: primária `#082D74`, escura `#01224D`, amarela `#FABD07`, terciária `#3182CE`, superfície `#F8F8F8`, branco e texto `#1A202C`/`#3B4453`; Lato para UI e Raleway para títulos. Texto sobre amarelo usa cor escura. Contrastes devem ser medidos nos pares realmente renderizados; não se presume aprovação AA por mera adoção da paleta.

## Fichas dos 17 indicadores

### 01. Empresas com registro CREA-SP

**Pergunta de apoio:** Quantas empresas têm registro vigente no CREA-SP e como essa base evolui?

**Resumo:** Estoque de pessoas jurídicas distintas com registro vigente no CREA-SP, com mudança reconciliada entre entradas, reativações e saídas do cadastro do conselho. Um novo registro ou filial não cria automaticamente uma nova empresa-raiz.

**Decisão apoiada:** Distinguir expansão, reposição de saídas e concentração territorial/setorial da carteira.

**Origem visível:** CREA-SP

**Como calcular:** Empresas-raiz com ao menos um registro vigente no corte; saldo = estoque final − estoque inicial. Entradas/saídas contam transições do estado empresarial, sem duplicar vários registros simultâneos.

**Unidade e denominador:** Empresas e variação (%)

**Rótulo da contagem:** empresas distintas

**Fontes e vínculo de dados:** Cadastro empresarial SQL Server/Db2 via gateway; Histórico de registros/vistos e movimentações

**Exemplo didático:** Exemplo didático: 4.000 empresas iniciais + 800 entradas − 300 saídas = 4.500 finais; as 800 entradas não devem ocultar as 300 saídas.

**Atualização proposta:** Diária, após carga interna validada; comparação mensal/trimestral/anual com o mesmo corte.

**Validação necessária:** Gestão do cadastro e inteligência de dados: homologar identidade empresarial, vigência, reativação e reconciliação estoque–fluxo.

**Limites de interpretação:** Empresa-raiz, estabelecimento, registro e visto têm unidades diferentes. Saneamento de duplicidade não é crescimento. Histórico real exige fatos datados, não retroprojeção de snapshot.

### 02. Permanência no CREA-SP

**Pergunta de apoio:** As empresas da base inicial que aparecem ativas na Receita permanecem com registro no CREA-SP?

**Resumo:** Permanência no CREA-SP das empresas com registro vigente no conselho na abertura, condicionada à situação cadastral ativa na fotografia da Receita disponível ao corte. Situação cadastral na Receita e vigência de registro no CREA-SP são estados diferentes.

**Decisão apoiada:** Investigar saída cadastral entre empresas com situação cadastral ativa na Receita, distinguindo-a da redução do universo externo.

**Origem visível:** Receita × CREA-SP

**Como calcular:** Empresas da coorte inicial com algum estabelecimento RFB ativo na fotografia disponível e registro vigente ao fim / empresas da coorte inicial com algum estabelecimento RFB ativo nessa fotografia × 100.

**Unidade e denominador:** % de empresas da coorte elegível

**Rótulo da contagem:** empresas da base inicial

**Fontes e vínculo de dados:** Histórico de registro empresarial; Receita Federal/CNPJ por ingestão automatizada ou integração autorizada

**Exemplo didático:** Exemplo didático: das 4.000 empresas iniciais, 3.800 aparecem ativas na fotografia cadastral da Receita mais recente e 3.700 permanecem com registro: retenção condicional de 97,4%.

**Atualização proposta:** Diária para o cadastro; fotografia RFB na competência disponível, explícita no indicador.

**Validação necessária:** Gestão do cadastro: validar coorte inicial e situação cadastral RFB; não tratar situação ativa como regularidade tributária.

**Limites de interpretação:** Situação ativa na Receita não prova exercício de atividade técnica. O filtro usa a fotografia RFB disponível ao corte, não o histórico cadastral da Receita inexistente. Mudanças de pessoa jurídica exigem conciliação.

### 03. Cobertura de registro CREA-SP

**Pergunta de apoio:** Qual parcela dos CNPJs elegíveis da Receita tem registro exato vigente no CREA-SP?

**Resumo:** Proporção dos estabelecimentos do universo externo da Receita que têm correspondência exata e registro vigente no CREA-SP. O universo externo depende de CNPJ completo, situação cadastral na Receita e CNAEs selecionados; registro antigo ou de outra filial não satisfaz o numerador.

**Decisão apoiada:** Escolher territórios e setores para ampliar a conciliação de informações, orientar empresas e estudar a abrangência institucional.

**Origem visível:** Receita × CREA-SP

**Como calcular:** Estabelecimentos elegíveis com registro exato vigente no corte / estabelecimentos externos elegíveis distintos × 100. Decompor em nunca localizado, identificado sem vigência e vigente.

**Unidade e denominador:** % de estabelecimentos elegíveis

**Rótulo da contagem:** CNPJs completos

**Fontes e vínculo de dados:** Receita Federal/CNPJ por ETL oficial ou integração autorizada; Cadastro e vigência de estabelecimentos CREA; Classificação CNAE fornecida pelo usuário

**Exemplo didático:** Exemplo didático: de 10.000 CNPJs completos elegíveis, 4.500 têm registro exato vigente: 45%. Os demais devem ser separados entre nunca identificados e identificados sem vigência.

**Atualização proposta:** A cada competência oficial CNPJ e carga interna conciliada; Conecta conforme autorização e quotas.

**Validação necessária:** Cadastro e área técnica competente: homologar universo CNAE, correspondência exata e alcance de registro/visto por estabelecimento.

**Limites de interpretação:** CNAE relacionado ou dependente de análise não comprova obrigação. O universo é de estabelecimentos, não empresas-raiz; a matriz não cobre automaticamente a filial. Somente raiz não é correspondência exata.

### 04. Novos CNPJs sem registro CREA

**Pergunta de apoio:** Quais CNPJs recém-abertos na Receita ainda não têm registro exato identificado no CREA-SP?

**Resumo:** Estabelecimentos recentemente abertos na Receita, pertencentes ao universo externo selecionado, sem qualquer registro exato identificado no histórico do CREA-SP até o corte. A leitura ajuda a estudar orientação e conciliação próximas ao início da atividade.

**Decisão apoiada:** Definir parcerias e estudos setoriais a partir das novas aberturas e de sua localização, sem confundir filial nova com nova pessoa jurídica.

**Origem visível:** Receita × CREA-SP

**Como calcular:** Contar CNPJs completos elegíveis abertos na janela e sem registro exato identificado até o corte. Um registro histórico inativo já identificado não entra neste conjunto.

**Unidade e denominador:** Estabelecimentos (CNPJ completo)

**Rótulo da contagem:** CNPJs abertos na Receita

**Fontes e vínculo de dados:** Abertura, situação, CNAEs e município do CNPJ; Histórico de registros por estabelecimento

**Exemplo didático:** Exemplo didático: 1.100 CNPJs elegíveis abertos em 24 meses ainda não têm registro exato identificado; a concentração em instalações elétricas e três municípios orienta um estudo específico.

**Atualização proposta:** Por competência oficial de CNPJ, com data de abertura e histórico interno atualizado.

**Validação necessária:** Cadastro e inteligência de dados: distinguir abertura de filial, primeira identificação e registro histórico inativo.

**Limites de interpretação:** Abertura não prova início efetivo de atividade sujeita ao CREA. A métrica conta estabelecimentos; a ficha empresarial deduplica suas raízes e pode mostrar menos empresas que CNPJs.

### 05. Empresas com RT no CREA-SP

**Pergunta de apoio:** Qual parcela das empresas com registro CREA-SP vigente tem responsável técnico identificado?

**Resumo:** Proporção de empresas com registro vigente no CREA-SP que possuem ao menos um vínculo de responsável técnico vigente identificado no cadastro do conselho. Relaciona empresa, profissional e período de vigência.

**Decisão apoiada:** Investigar ausência de vínculos na integração e a distribuição da cobertura por atividade, porte e território.

**Origem visível:** CREA-SP

**Como calcular:** Empresas-raiz com registro vigente e ao menos um vínculo RT vigente identificado / empresas-raiz com registro vigente × 100.

**Unidade e denominador:** % de empresas vigentes

**Rótulo da contagem:** empresas com registro CREA

**Fontes e vínculo de dados:** Cadastro empresarial; Vínculos RT com profissional, modalidade, início e fim no banco interno

**Exemplo didático:** Exemplo didático: 4.100 de 4.500 empresas vigentes têm RT identificado: cobertura observada de 91,1%. As outras 400 precisam de validação de fonte e vigência.

**Atualização proposta:** Diária, após cargas de registros e vínculos técnicos reconciliadas.

**Validação necessária:** Área técnica competente: confirmar vigência, atribuição e abrangência do vínculo; cadastro valida identidade empresarial/profissional.

**Limites de interpretação:** Não identificado não equivale a ausência real de RT ou infração. Profissionais distintos, vínculos e empresas não podem ser somados como uma mesma unidade.

### 06. Continuidade de RT no CREA-SP

**Pergunta de apoio:** A empresa manteve RT identificado durante sua vigência no CREA-SP?

**Resumo:** Continuidade do responsável técnico identificado no CREA-SP durante os dias em que a empresa manteve registro vigente no conselho. A interseção dos intervalos históricos distingue continuidade de uma fotografia da situação atual.

**Decisão apoiada:** Distinguir lacunas históricas já resolvidas de ausência ainda observada e orientar validação da continuidade técnica.

**Origem visível:** CREA-SP

**Como calcular:** Dias-empresa com registro vigente e ao menos um RT vigente / dias-empresa com registro vigente, dentro da janela histórica qualificada, × 100. Sobreposições de vínculos não duplicam dias.

**Unidade e denominador:** % de dias-empresa registrados

**Rótulo da contagem:** dias-empresa

**Fontes e vínculo de dados:** Intervalos históricos de registros; Intervalos históricos de vínculos RT

**Exemplo didático:** Exemplo didático: uma empresa passa 20 de 730 dias registrados sem RT identificado; a troca entre dois RTs sem intervalo não gera lacuna.

**Atualização proposta:** Diária ou mensal, com reprocessamento de intervalos alterados retroativamente.

**Validação necessária:** Área técnica competente: homologar início/fim dos intervalos e qualidade histórica; não presumir prazo de tolerância legal.

**Limites de interpretação:** Na ficção o histórico é qualificado desde o primeiro registro da empresa; esse marco demonstrativo não certifica cobertura histórica real. Lacuna de fonte não é ausência real e não existe prazo tolerado presumido.

### 07. Empresas com ART no CREA-SP

**Pergunta de apoio:** Qual parcela das empresas com vigência no CREA-SP na janela tem ART vinculada no período?

**Resumo:** Participação de empresas com ART vinculada no CREA-SP entre aquelas que tiveram registro vigente no conselho em algum dia da janela, incluindo as que já saíram antes do corte. Evita selecionar somente as sobreviventes.

**Decisão apoiada:** Identificar ampliação ou concentração da participação empresarial na produção documental e aprofundar o perfil dos vínculos.

**Origem visível:** CREA-SP

**Como calcular:** Empresas-raiz com ao menos um dia de registro vigente e ao menos uma ART vinculada na janela / empresas-raiz com ao menos um dia de registro vigente na mesma janela × 100.

**Unidade e denominador:** % de empresas com vigência em algum dia da janela

**Rótulo da contagem:** empresas registradas no período

**Fontes e vínculo de dados:** ART e ponte empresarial declarada; Cadastro empresarial vigente

**Exemplo didático:** Exemplo didático: 2.800 de 4.800 empresas com algum dia de vigência na janela têm ART vinculada: 58,3%, ainda que somente 4.500 sigam vigentes ao fim. O distinto da janela não é soma de distintos mensais.

**Atualização proposta:** Diária para documentos; consolidação por competência, incluindo cancelamentos/retificações homologados.

**Validação necessária:** Área de ART/acervo e cadastro: validar ponte empresarial explícita, elegibilidade documental e população com vigência em algum dia da janela.

**Limites de interpretação:** A participação usa a coorte de todo o período. A partição RT × ART da base vigente no corte é outro aprofundamento, com denominador próprio. A fonte demonstra vínculo empresarial, não execução/autoria; a taxa não testa vigência na data de cada ART. Documentos não são faturamento ou obras concluídas.

### 08. Emprego formal no setor

**Pergunta de apoio:** Como evolui o emprego nos mercados em que as empresas atuam?

**Resumo:** Variação do estoque formal agregado dos territórios e CNAEs selecionados, como contexto econômico da carteira empresarial.

**Decisão apoiada:** Dimensionar crescimento/retração setorial e avaliar presença institucional em mercados economicamente relevantes.

**Origem visível:** RAIS / CAGED

**Como calcular:** (Estoque agregado do último mês / estoque agregado do primeiro mês disponível na janela − 1) × 100; base inicial zero retorna ausência de taxa. Admissões/desligamentos são fluxos e estoques mensais não são somados.

**Unidade e denominador:** % de variação do estoque agregado

**Rótulo da contagem:** empregos agregados

**Fontes e vínculo de dados:** Novo CAGED/RAIS em carga oficial homologada; Dimensões município, CNAE, CBO e competência

**Exemplo didático:** Exemplo didático: o estoque setorial passa de 200 mil para 220 mil vínculos: +10%. É contexto do mercado, não prova de 20 mil empregos criados pelo CREA.

**Atualização proposta:** Novo CAGED mensal e RAIS anual, nas respectivas competências; reprocessar revisões oficiais.

**Validação necessária:** Inteligência de dados: validar recortes publicados, método do estoque, compatibilidade entre edições e revisão com o produtor.

**Limites de interpretação:** Emprego agregado não identifica trabalhador ou CNPJ. Filtros nominais de empresa, porte ou subconjunto empresarial tornam essa comparação indisponível quando não existem na fonte. Os cortes mensais inicial/final devem ser informados.

### 09. Valor técnico publicado no PNCP

**Pergunta de apoio:** Onde se concentra a demanda pública por serviços técnicos?

**Resumo:** Valor e composição das publicações de contratações com objetos potencialmente técnicos, usando categorias e identidade do fornecedor.

**Decisão apoiada:** Identificar segmentos, órgãos e territórios para intercâmbio de dados e conhecer mercados relevantes para a carteira empresarial.

**Origem visível:** PNCP

**Como calcular:** Somar o valor dos contratos técnicos únicos publicados na janela, com regra textual explícita de classificação; manter contratos, fornecedores e valores em unidades separadas.

**Unidade e denominador:** R$ contratados/publicados

**Rótulo da contagem:** R$ publicados em contratos

**Fontes e vínculo de dados:** PNCP/API e identificadores de contratação/fornecedor; Classificação textual versionada; Convênios para execução contratual quando disponíveis

**Exemplo didático:** Exemplo didático: mil contratações potencialmente técnicas somam R$ 2 bilhões, concentradas em saneamento e manutenção elétrica; isso dimensiona demanda publicada.

**Atualização proposta:** API PNCP diariamente, com paginação, revisões e contrato/versionamento homologados.

**Validação necessária:** Inteligência de dados e área técnica competente: validar objetos, unicidade, conceito de valor e distinção entre sede e execução.

**Limites de interpretação:** Na demonstração a data contratual representa publicação. Valor publicado/contratado não é pagamento ou obra entregue. Território do fornecedor não comprova local de execução; aditivos/cancelamentos precisam de tratamento produtivo próprio.

### 10. Fornecedores PNCP com CREA

**Pergunta de apoio:** Os fornecedores do PNCP tinham registro vigente no CREA-SP na última publicação selecionada?

**Resumo:** Proporção de CNPJs fornecedores do PNCP com registro exato vigente no CREA-SP na data da publicação técnica mais recente de cada fornecedor dentro da janela. A situação atual no CREA-SP ou na Receita não substitui a verificação nessa data.

**Decisão apoiada:** Conectar demanda pública e vigência cadastral com uma data explícita, selecionando conjuntos para conciliação e verificação.

**Origem visível:** PNCP × CREA-SP

**Como calcular:** Fornecedores distintos por CNPJ completo com registro exato vigente na sua publicação técnica mais recente selecionada / fornecedores distintos por CNPJ completo no universo técnico selecionado × 100.

**Unidade e denominador:** % de fornecedores (CNPJ completo)

**Rótulo da contagem:** CNPJs fornecedores

**Fontes e vínculo de dados:** PNCP/fornecedor e data de publicação; CNPJ do estabelecimento; Histórico de registro/visto

**Exemplo didático:** Exemplo didático: entre 500 CNPJs fornecedores, 300 têm registro vigente na sua última publicação técnica observada: 60%. Isso não informa vigência de cada contrato anterior nem da execução.

**Atualização proposta:** Diária após conciliar PNCP e histórico de registro; referência na última publicação selecionada de cada fornecedor.

**Validação necessária:** Cadastro e área técnica competente: validar fornecedor por CNPJ completo, data da publicação, jurisdição e papel contratual.

**Limites de interpretação:** A referência é publicação mais recente por fornecedor, não assinatura, execução ou situação atual. Registro de matriz/raiz não confirma outra filial. Classificação de objeto, jurisdição e papéis contratuais precisam de validação.

### 11. Contratos PNCP ligados a ART

**Pergunta de apoio:** Quais contratos técnicos do PNCP possuem referência documental explícita a ART no CREA-SP?

**Resumo:** Parcela dos contratos técnicos selecionados do PNCP com referência documental confirmada a uma ART no CREA-SP. Mede rastreabilidade disponível, sem presumir que a simples existência de ART da empresa se refira àquele contrato.

**Decisão apoiada:** Avaliar a rastreabilidade do portfólio e pactuar campos e intercâmbios necessários para sua ampliação.

**Origem visível:** PNCP × CREA-SP

**Como calcular:** Contratos técnicos selecionados com ao menos uma ponte documental explícita contrato–ART / todos os contratos técnicos selecionados na janela × 100.

**Unidade e denominador:** % de contratos técnicos

**Rótulo da contagem:** contratos técnicos

**Fontes e vínculo de dados:** ART e referência contratual interna; PNCP e contrato identificado; Ponte documental por convênio ou camada curada homologada

**Exemplo didático:** Exemplo didático: 190 de 1.000 contratos têm ponte explícita: 19% do portfólio com rastreabilidade disponível. Os outros 810 são contratos sem ponte na fonte, não contratos comprovadamente sem ART.

**Atualização proposta:** Após cargas de contratos, ARTs e pontes documentais autorizadas; meta diária quando as fontes permitirem.

**Validação necessária:** Área de ART/acervo e cedente do contrato: homologar referência documental e abrangência; ausência de ponte não comprova ausência de ART.

**Limites de interpretação:** A ponte demonstrativa é documento fictício explícito, não uma inferência real por CNPJ/texto. ART da mesma empresa não comprova ART do contrato. Sem ponte não equivale a falta de ART, infração, execução ou universo já analisado.

### 12. Empresas para análise digital

**Pergunta de apoio:** Quais empresas combinam contrato técnico no PNCP e CNPJ sem registro exato vigente no CREA-SP?

**Resumo:** Empresas com estabelecimento elegível na Receita/CNAE, sem registro exato vigente no CREA-SP no corte, que também aparece como fornecedor de contrato técnico publicado no PNCP na janela. A combinação usa fatos verificáveis do mesmo estabelecimento e orienta verificação humana.

**Decisão apoiada:** Selecionar estudos e verificações digitais rastreáveis, sem criar score de culpa ou uma fila operacional de autuação.

**Origem visível:** Receita / PNCP × CREA-SP

**Como calcular:** Contar empresas-raiz distintas com ao menos um estabelecimento RFB ativo e CNAE elegível, sem registro exato vigente no corte, e com contrato técnico publicado na janela associado àquele estabelecimento.

**Unidade e denominador:** Empresas-raiz com evidências

**Rótulo da contagem:** empresas distintas

**Fontes e vínculo de dados:** Receita Federal/CNPJ e CNAEs; Cadastro e vigência de registros por CNPJ completo; PNCP/objeto, estabelecimento fornecedor e publicação

**Exemplo didático:** Exemplo didático: de 5.500 CNPJs sem registro vigente, um subconjunto de 120 empresas também apresenta objeto técnico e identidade comprovada; o interesse está na combinação explicável.

**Atualização proposta:** A cada conciliação válida de CNPJ, registro e PNCP; explicitar as três competências.

**Validação necessária:** Área técnica competente e inteligência de dados: revisar a regra booleana, o mesmo estabelecimento e a atividade efetiva antes de qualquer conclusão.

**Limites de interpretação:** A regra implementada cruza CNAE elegível, falta de vigência exata no corte e contrato técnico do mesmo estabelecimento na janela. Não mede RT, divergência territorial, probabilidade de infração ou vigência durante execução. CAGED agregado não é evidência individual por CNPJ.

### 13. Adimplência PJ no CREA-SP

**Pergunta de apoio:** Qual é a adimplência das empresas com obrigações financeiras elegíveis perante o CREA-SP?

**Resumo:** Cumprimento das obrigações financeiras empresariais perante o CREA-SP entre empresas com títulos elegíveis. Não é situação cadastral na Receita nem comprovação de regularidade técnica.

**Decisão apoiada:** Planejar relacionamento e sustentabilidade financeira por porte, atividade e território, com denominador explícito.

**Origem visível:** Financeiro CREA-SP

**Como calcular:** Empresas-raiz com títulos de valor não negativo e vencimento até o corte, sem saldo vencido positivo / empresas-raiz com títulos nessas condições × 100. Título que vence no próprio corte ainda não é atraso.

**Unidade e denominador:** % de empresas com obrigações elegíveis

**Rótulo da contagem:** empresas com títulos elegíveis

**Fontes e vínculo de dados:** Títulos empresariais, vencimentos e pagamentos; Estados de exigibilidade homologados no financeiro

**Exemplo didático:** Exemplo didático: 3.400 de 4.000 empresas com obrigações elegíveis estão adimplentes: 85%. Dividir pelo total de empresas cadastradas responderia a outra pergunta.

**Atualização proposta:** Diária após conciliação financeira, respeitando vencimentos, compensações e ajustes.

**Validação necessária:** Financeiro e cadastro: homologar exigibilidade, parcelamentos, contestações, identidade PJ e denominador de empresas elegíveis.

**Limites de interpretação:** O universo financeiro é o dos títulos observados com vencimento até o corte, não toda a base vigente. Dívida não comprova infração técnica. Exigibilidade legal, parcelamento, contestação e prescrição precisam de homologação; produção deve restringir microdados e exportações.

### 14. Recebimentos de PJ no CREA-SP

**Pergunta de apoio:** Quanto o CREA-SP efetivamente recebeu de pessoas jurídicas na janela?

**Resumo:** Fluxo de caixa do CREA-SP efetivamente recebido de pessoas jurídicas na janela, pela data de pagamento. Recursos recuperados da carteira vencida integram esse total, sem nova soma.

**Decisão apoiada:** Planejar sustentabilidade e explicar a composição dos recursos empresariais efetivamente recebidos.

**Origem visível:** Financeiro CREA-SP

**Como calcular:** Somar pagamentos elegíveis vinculados à pessoa jurídica pela data efetiva de pagamento, sem duplicar recuperação, estornos ou repasses.

**Unidade e denominador:** R$ recebidos

**Rótulo da contagem:** R$ recebidos

**Fontes e vínculo de dados:** Pagamento–título–empresa no financeiro SQL Server/Db2; Plano de contas e estornos quando disponíveis

**Exemplo didático:** Exemplo didático: R$ 24 milhões de recebimentos, dos quais R$ 3 milhões vêm da coorte vencida anterior; a recuperação não transforma o total em R$ 27 milhões.

**Atualização proposta:** Diária após conciliação dos pagamentos; contabilização por data efetiva, com fechamento de competência.

**Validação necessária:** Financeiro/contabilidade: reconciliar caixa, vínculo pagamento–título–empresa, estornos e classificação de pessoa jurídica.

**Limites de interpretação:** Não representa a receita geral do CREA-SP. Valor de ART/PNCP não é receita do conselho. Pagamento de pessoa física não vira receita PJ por associação indireta a uma empresa.

### 15. Dívida PJ vencida no CREA-SP

**Pergunta de apoio:** Quanto as empresas devem ao CREA-SP em títulos vencidos e há quanto tempo?

**Resumo:** Estoque de obrigações empresariais vencidas perante o CREA-SP na data de corte, com faixas de atraso e concentração empresarial. Não representa dívida tributária na Receita Federal.

**Decisão apoiada:** Distinguir dívida antiga concentrada de atraso recente pulverizado e planejar relacionamento/provisão.

**Origem visível:** Financeiro CREA-SP

**Como calcular:** Somar saldo exigível vencido líquido de pagamentos/ajustes válidos até o corte; faixas de atraso reconciliam com o total. Contar devedores distintos separadamente.

**Unidade e denominador:** R$ vencidos no corte

**Rótulo da contagem:** R$ vencidos no corte

**Fontes e vínculo de dados:** Títulos, saldo, vencimentos, pagamentos e ajustes; Identidade empresarial e exigibilidade

**Exemplo didático:** Exemplo didático: R$ 9 milhões vencidos em 600 empresas exigem leituras diferentes quando concentrados em títulos antigos ou em atrasos recentes.

**Atualização proposta:** Diária no corte financeiro; reconstrução histórica apenas com eventos/saldos confiáveis.

**Validação necessária:** Financeiro e área jurídica competente: validar saldo exigível, pagamentos, ajustes, parcelamentos, prescrição e uso permitido de dados nominais.

**Limites de interpretação:** Estoque não é fluxo recebido. Sem eventos produtivos de ajuste/exigibilidade, a demonstração não certifica cobrança legal. Não expor dívida nominal em versão pública nem inventar previsão de perda.

### 16. Recuperação da dívida inicial

**Pergunta de apoio:** Quanto o CREA-SP recebeu da dívida empresarial vencida que já existia na abertura?

**Resumo:** Recebimento efetivo pelo CREA-SP sobre uma carteira fixa de títulos empresariais vencidos na abertura da janela. Distingue entrada de caixa de baixa contábil ou cancelamento.

**Decisão apoiada:** Comparar coortes e segmentos com denominadores equivalentes e demonstrar recuperação observada de recursos.

**Origem visível:** Financeiro CREA-SP

**Como calcular:** Pagamentos na janela aplicados a títulos vencidos com saldo reconstruível na abertura / saldo inicial reconstruível dessa mesma coorte × 100. Baixas sem caixa não entram no numerador.

**Unidade e denominador:** % do saldo vencido de abertura

**Rótulo da contagem:** R$ da carteira inicial

**Fontes e vínculo de dados:** Saldo histórico de abertura por título; Ponte pagamento–título e datas efetivas

**Exemplo didático:** Exemplo didático: R$ 3 milhões pagos sobre uma coorte inicial de R$ 12 milhões significam 25% de recuperação; cancelar R$ 1 milhão não eleva esse recebimento.

**Atualização proposta:** Diária para pagamentos; coorte de abertura fixa e comparação em janelas de maturação equivalentes.

**Validação necessária:** Financeiro/contabilidade: reconciliar saldo inicial e pagamentos da mesma coorte; excluir baixa sem caixa e tratar histórico incompleto.

**Limites de interpretação:** Recuperação é subconjunto dos recebimentos. Pagamentos sem data ficam fora do fluxo e da reconstrução histórica da coorte; isso exige qualificar a cobertura em produção. Sem saldo inicial e vínculo pagamento–título, a taxa não é calculável. Atribuição a uma ação exige avaliação adicional.

### 17. Ingresso de CNPJs no CREA-SP

**Pergunta de apoio:** Quais CNPJs previamente observados sem registro tiveram ingresso posterior no CREA-SP?

**Resumo:** Primeiro ingresso no cadastro do CREA-SP de estabelecimentos observados sem registro exato em fotografia externa anterior à janela. A transição documental não presume permanência no corte nem causa institucional.

**Decisão apoiada:** Demonstrar mudanças cadastrais verificáveis em um universo previamente identificado, preservando a situação inicial e os fatos posteriores.

**Origem visível:** Receita × CREA-SP

**Como calcular:** CNPJs completos da coorte externa pré-janela cujo primeiro registro exato ocorreu após a observação e até o corte / CNPJs completos dessa coorte fixa × 100.

**Unidade e denominador:** % de estabelecimentos da coorte externa

**Rótulo da contagem:** CNPJs da coorte inicial

**Fontes e vínculo de dados:** Snapshot externo longitudinal com competência e IDs próprios; Primeiro registro exato por estabelecimento; Histórico cadastral posterior

**Exemplo didático:** Exemplo didático: de 600 CNPJs observados sem registro, 180 ingressam posteriormente: 30%. Parte pode já estar sem vigência no fim; a entrada observada não é regularização atual nem efeito comprovado da gestão.

**Atualização proposta:** Por fotografia externa preservada e carga interna; acompanhar a mesma coorte em marcos temporais definidos.

**Validação necessária:** Cadastro e inteligência de dados: homologar identidade, observação prévia, primeiro ingresso e maturação da coorte; gestão valida qualquer alegação de resultado.

**Limites de interpretação:** A ficção usa snapshots reproduzíveis anteriores às janelas de 3/6/12/24 meses. Conta estabelecimentos; uma filial nova não é necessariamente nova empresa-raiz. Ingresso pode estar encerrado no corte. Sem intervenção documentada e avaliação, não atribuir causalidade à gestão.

## Implementação prevista no Power BI

O React continua sendo um protótipo funcional; não há conversão automática em `.pbix` nem importação no Desktop comprovada. A integração institucional deverá alimentar um modelo semântico com dimensões e fatos homologados, a partir de SQL Server/Db2 via gateway e fontes externas automatizadas/autorizadas.

| Necessidade da V13 | Recurso previsto no Power BI | Cuidado de implementação |
| --- | --- | --- |
| Alternar medida ou dimensão no mesmo gráfico | Parâmetros de campo | Recalcular o total no grão correto; não somar distintos mensais |
| Alternar tipos de visual e leituras Universo/Receita/CAO | Bookmarks e painel de seleção | Bookmarks de apresentação sem captura dos dados, para preservar o recorte |
| Explicar universo, fonte, fórmula e limitações | Tooltips de página e ajuda do visual | Uma tooltip explica o ponto selecionado, não certifica cobertura de uma fonte |
| Ampliar e restaurar o gráfico | Modo de foco ou bookmarks de grupos ampliados | Restaurar sem mudar segmentações e seleção |
| Abrir empresas e documentos de um subconjunto | Drillthrough e tabelas | Mostrar a mudança de unidade de CNPJ/documento para empresa-raiz distinta |
| Conciliação CREA × Receita | Matriz ou barras empilhadas | CNPJ completo e data; matriz ou raiz não confirma outra filial |
| ART e CAO | Combinado e medidas distintas | Eventos, empresas distintas e situação atual são conceitos separados |
| Perfis financeiros e exportação | RLS/OLS e permissões homologadas | Perfis locais do protótipo não constituem segurança produtiva |

Documentação primária: [parâmetros de campo](https://learn.microsoft.com/en-us/power-bi/create-reports/power-bi-field-parameters), [bookmarks](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-bookmarks), [tooltips de página](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-tooltips) e [drillthrough](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-drillthrough).

### O que ainda depende dos dados reais

- Confirmar as chaves e o histórico de cada registro, estabelecimento e vínculo técnico.
- Qualificar a vigência do registro no CREA-SP separadamente da situação cadastral na Receita.
- Homologar exigibilidade, parcelamentos, pagamentos, estornos e datas financeiras.
- Preservar snapshots externos por competência; uma fotografia atual não reconstrói a história anterior.
- Pactuar referências documentais contrato–ART e dados identificados de parceiros quando necessários.
- Registrar competência, última carga válida, cobertura territorial, falhas de atualização e versão das regras.
- Validar o modelo e os visuais com usuários de gestão e áreas técnicas antes de alegar resultado ou publicar dados institucionais.

A V13 amplia o entendimento do conjunto empresarial sem transformar a tela em sistema de tratativas. O percurso permanece: indicador → conjunto → distribuição → empresa/documento que sustenta a leitura.
