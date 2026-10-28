# CREA-SP — crítica e seleção estratégica dos indicadores empresariais V10

Análise de 26/10/2026, para a circunscrição paulista. O foco é a empresa, seus estabelecimentos, registros, relações técnicas, documentos, obrigações e inserção econômica. A informação sobre profissionais só participa quando explica uma relação empresarial comprovada.

Esta seleção reúne **17 indicadores estratégicos**, organizados por decisões. Os exemplos são ilustrações conceituais fictícias para uma janela de 24 meses, de 01/10/2024 a 30/09/2026; não são valores reais do CREA-SP nem os números calculados pelo protótipo. A implementação deve sempre calcular os valores a partir dos fatos relacionados e mostrar o corte efetivamente disponível.

## O que a crítica muda

O problema da versão anterior ultrapassa o desenho: um conjunto de gráficos coerentes não garante que eles respondam às decisões mais importantes. O cadastro precisa ser relacionado à presença econômica, o vínculo técnico à continuidade empresarial, a demanda pública à identidade e vigência dos fornecedores, e o financeiro à carteira efetivamente recebível. A representação institucional precisa demonstrar alcance e resultados observados, com limites claros de atribuição.

| Informação da versão anterior | Tratamento nesta seleção | Motivo |
|---|---|---|
| Total bruto de registros | Contexto e reconciliação, sem equivaler ao número de empresas | Registros, vistos, estabelecimentos e CNPJs-raiz não são unidades intercambiáveis |
| Profissionais ativos, autores, modalidades e diplomados isolados | Retirar da navegação principal empresarial | Não explicam diretamente a situação das empresas; conservar somente relações técnicas relevantes na investigação |
| Volume bruto de ARTs/CAOs | Aprofundamento, associado a empresas distintas, finalidade e período | Mais documentos podem resultar de substituições, complementações ou concentração; não comprovam maior atividade econômica nem valor produzido pelo conselho |
| CNAE sem correspondência cadastral | Manter como universo definido de investigação | CNAE indica atividade declarada; não estabelece sozinho obrigação de registro |
| Crescimento de emprego e crescimento cadastral | Contexto territorial, com universos e cortes próprios | Correlação não identifica empregados por CNPJ nem atribui crescimento ao CREA |
| Quantidade de ações, autos, visitas, palestras e eventos | Não usar como manchetes estratégicas deste painel | Produção administrativa não demonstra automaticamente mudança empresarial ou valor público |
| Pontuação sintética de prioridade/risco | Substituir por conjuntos explícitos de evidências | Pesos arbitrários ocultam critérios e podem transformar ausência de informação em suspeita de infração |
| Valores de contratos/ARTs | Separar de receita do conselho e de execução econômica | Contratado, declarado, executado, pago e recebido pelo CREA são fatos diferentes |
| Inadimplência | Manter no domínio financeiro, com denominador próprio | Dívida não comprova exercício irregular de atividade profissional |
| Qualidade e atualização dos dados | Qualificador transversal e governança | Não é resultado político da gestão; revela a confiança e a cobertura de cada conclusão |
| Catálogo normativo Confea inteiro | Referência e reporte, fora da navegação principal empresarial | A finalidade e o recorte dos indicadores de prestação de contas diferem da seleção de decisões empresariais |

O conselho precisa demonstrar presença, vínculo técnico, utilidade e sustentabilidade. Para dirigentes e representantes institucionais, é legítimo mostrar quais segmentos e regiões são alcançados e quais transições foram observadas. A associação temporal, sozinha, não sustenta atribuir ao conselho empregos, investimentos, receita de empresas, prevenção de acidentes ou contratos conquistados.

## Como ler os indicadores

- **Empresa:** pessoa jurídica contada por identidade/raiz CNPJ, sem somar suas filiais como empresas adicionais. Quando a análise é de estabelecimento, o CNPJ completo é a unidade declarada.
- **Território:** endereço da empresa, do estabelecimento, do órgão contratante e da execução têm papéis diferentes. Não usar um como substituto silencioso do outro.
- **Vigência:** reconstruída por fatos e intervalos na data adequada. Na medida de fornecedores PNCP, a referência implementada é a data da publicação técnica mais recente de cada CNPJ na janela; não é execução, assinatura ou situação atual.
- **Janelas:** o painel oferece 3, 6, 12 e 24 meses; os exemplos deste documento usam 24 meses. As coortes externas usam o fechamento imediatamente anterior à janela como observação de partida. Não retroprojetar um snapshot como histórico real.
- **Ausência:** dado desconhecido continua nulo, com cobertura informada. Ausência de correspondência não equivale a ausência de obrigação cumprida, de vínculo ou de documento.
- **Atualização:** origem, competência, última carga válida e cobertura são exibidas. O build do aplicativo não é data de atualização do banco institucional.

## 1. Como evolui a base de empresas com registro vigente?

**O que é.** Mostra o estoque de empresas distintas com registro vigente e a contribuição das entradas e saídas para sua mudança. A apresentação deve distinguir primeira entrada da empresa, reativação e encerramento do último registro vigente; a abertura de um segundo estabelecimento não cria uma nova empresa no total de CNPJs-raiz.

**Como medir.** Estoque final = estoque inicial + empresas que passaram de sem vigência para com vigência − empresas que passaram de com vigência para sem vigência. Movimentos que não alteram esse estado não alteram o estoque empresarial. A taxa de crescimento usa o estoque inicial, quando positivo. Unidade: empresas e percentual de variação.

**Decisão e exemplo.** Se a base passa de 4.000 para 4.500 empresas, com 750 primeiras entradas, 50 reativações e 300 saídas, a gestão distingue expansão de reposição e investiga em quais CNAEs/municípios cada movimento ocorreu. Não basta comemorar as 800 entradas e esconder as 300 saídas.

**Fontes e limites.** Histórico cadastral, registros/vistos e estabelecimentos nos bancos internos via gateway. A unidade de concessão precisa ser homologada: um registro novo não significa automaticamente primeira entrada de uma pessoa jurídica. Mudanças de classificação e saneamento de duplicidades devem aparecer separadamente de crescimento.

## 2. As empresas da coorte inicial com situação cadastral na Receita ativa permanecem no cadastro?

**O que é.** Acompanha uma coorte empresarial com registro vigente no início da janela, condicionada à situação ativa na fotografia da Receita disponível ao corte. A mesma coorte inicial permanece identificável; a condição cadastral na Receita usa a informação disponível, sem inventar um histórico de encerramentos econômicos.

**Como medir.** Empresas-raiz da coorte inicial com algum estabelecimento cadastralmente ativo na Receita na fotografia disponível e registro vigente ao fim / empresas-raiz da coorte inicial com algum estabelecimento cadastralmente ativo na Receita nessa fotografia. Situação fiscal, saídas cadastrais e reativações ficam distintas. Unidade: empresas e percentual de retenção condicional.

**Decisão e exemplo.** De 4.000 empresas iniciais, 3.800 aparecem ativas na fotografia cadastral da Receita mais recente e 3.700 permanecem com registro vigente: 97,4% de retenção condicional. As 100 sem vigência justificam examinar mudanças de atividade, território, exigibilidade ou relacionamento; a situação cadastral na Receita das outras 200 não permite, sozinha, datar quando encerraram atividade.

**Fontes e limites.** Histórico interno e fotografia oficial de CNPJ. A fonte da demonstração qualifica a situação RFB mais recente disponível, sem histórico cadastral da Receita completo; situação ativa não prova exercício de atividade técnica. Mudança de pessoa jurídica, incorporação e migração de raiz exigem tratamento próprio.

## 3. Quanto do universo de estabelecimentos externos tem registro exato vigente?

**O que é.** Dimensiona a presença do conselho em um conjunto explicitamente selecionado de estabelecimentos ativos da Receita com atividades relacionadas ou dependentes de análise. É uma estimativa de correspondência e vigência, não a taxa de cumprimento de uma obrigação legal presumida.

**Como medir.** Estabelecimentos elegíveis com registro exato vigente / estabelecimentos externos elegíveis distintos, por CNPJ completo. O funil separa nunca identificado, identificado sem vigência e registro exato vigente. Somente raiz é uma sugestão, não entra no numerador. Uma matriz não cobre automaticamente o CNPJ de sua filial.

**Decisão e exemplo.** Em 10.000 estabelecimentos de CNAEs selecionados, 4.500 têm registro exato vigente: 45%. Uma região com 20% e crescimento do universo externo pode justificar parceria de dados e estudo técnico setorial. Os demais CNPJs devem ser decompostos entre nunca identificados e identificados sem vigência; não são automaticamente irregulares.

**Fontes e limites.** Cadastro CREA, ingestão automatizada da base oficial de CNPJ e classificação CNAE fornecida pelo usuário, preservando seus rótulos. Não presumir API pública completa da Receita: pode ser ETL dos arquivos oficiais ou integração autorizada. Publicar também a cobertura de conciliação e a competência de cada fonte.

## 4. Quais novos estabelecimentos ainda não têm registro exato identificado?

**O que é.** Identifica aberturas recentes de estabelecimentos do universo externo selecionado sem qualquer registro exato identificado até o corte. O corte por tempo desde abertura mostra uma oportunidade de orientação, conciliação e verificação inicial.

**Como medir.** CNPJs completos externos abertos dentro da janela, ativos no corte, com CNAEs selecionados e sem qualquer registro exato identificado até o corte. Um registro histórico inativo já identificado não entra nesse conjunto. Detalhar faixas desde abertura e distinguir filial de nova raiz. Unidade: estabelecimentos.

**Decisão e exemplo.** De 1.800 CNPJs elegíveis abertos nos 24 meses, 700 já têm algum registro exato identificado e 1.100 ainda não. A concentração desses 1.100 em instalações elétricas e três municípios orienta um estudo setorial específico. A ficha deduplica empresas-raiz e pode mostrar menos empresas que estabelecimentos.

**Fontes e limites.** CNPJ, CNAEs, localização, abertura e identidade cadastral. Abertura não demonstra início efetivo de atividade sujeita ao conselho. O resultado deve oferecer a lista que sustenta a contagem, com evidências e exclusões auditáveis.

## 5. Quantas empresas vigentes têm RT identificado no corte?

**O que é.** Relaciona a base empresarial vigente ao quadro técnico observado no corte. Revela a presença técnica identificada nas fontes integradas e a parcela que necessita de validação de vigência ou dados.

**Como medir.** Empresas com ao menos um vínculo RT vigente identificado / empresas com registro vigente. Mostrar número de profissionais e de vínculos separadamente, sem somá-los como empresas. Unidade: empresas e percentual de cobertura.

**Decisão e exemplo.** Das 4.500 empresas vigentes, 4.100 possuem RT identificado e 400 não: 91,1% de cobertura observada. A distribuição por atividade e estabelecimento ajuda a distinguir atualização pendente, fim recente de vínculo e necessidade de verificação.

**Fontes e limites.** Empresa, registro e vínculo técnico com início/fim, modalidade e referência de origem. “Não identificado” não equivale a ausência real de RT, infração ou impossibilidade técnica. A cobertura da integração deve acompanhar a medida.

## 6. A cobertura de RT permanece durante a vigência empresarial?

**O que é.** Examina a interseção dos intervalos de registro empresarial vigente com os intervalos de RT, para identificar períodos sem cobertura técnica observada. Trocar o responsável não é um problema quando a cobertura permanece contínua.

**Como medir.** Dias-empresa com registro vigente e ao menos um RT vigente / dias-empresa com registro vigente, dentro da janela e da cobertura histórica da fonte. Mostrar empresas com alguma lacuna e faixas da duração observada; sobreposições de dois RTs não duplicam dias cobertos.

**Decisão e exemplo.** Entre 3.700 empresas presentes durante toda a janela, 300 tiveram alguma lacuna; 200 já voltaram a apresentar cobertura e 100 continuam sem vínculo no corte. Isso diferencia necessidade histórica de saneamento de uma situação ainda atual.

**Fontes e limites.** Intervalos históricos de registros e RTs. Na ficção, o primeiro registro da empresa é o marco de qualificação histórica; isso não certifica a completude real da fonte desde aquela data. Sem histórico suficiente em produção, exibir a fotografia do indicador 5; não fabricar dias sem cobertura nem um prazo legal tolerado. Sobreposições de registros ou RTs não multiplicam dias-empresa.

## 7. Quantas empresas têm atividade ART observada no período?

**O que é.** Mede a participação com ART observada entre as empresas que tiveram registro vigente em algum dia da janela. Inclui aquelas que saíram antes do corte; evita selecionar apenas as sobreviventes. O aumento bruto de documentos não é expansão econômica nem benefício causado pelo CREA.

**Como medir.** Empresas-raiz com ao menos um dia de registro vigente e ao menos uma ART vinculada na janela / empresas-raiz com ao menos um dia de registro vigente na mesma janela. O numerador da janela é distinto e não a soma de distintos mensais. A partição RT × ART das empresas vigentes **no corte** é um aprofundamento diferente, com outro denominador, que não deve ser confundido com esta taxa.

**Decisão e exemplo.** A coorte de todo o período possui 4.800 empresas com algum dia de vigência, ainda que 4.500 sigam vigentes no fim. Se 2.800 das 4.800 têm ART observada, a participação é 58,3%. Se o volume documental cresce enquanto as empresas participantes diminuem, a atividade observada está mais concentrada; a leitura não pode excluir as que saíram da base.

**Fontes e limites.** ART, ponte empresarial declarada e período. A fonte demonstra vínculo empresarial, não execução/autoria. A taxa não testa se cada ART coincide com um dia de vigência; compara observação de ART e presença cadastral dentro da mesma janela. ART não é faturamento, obra concluída, contrato executado, emprego ou segurança. Tipos/complementações/substituições exigem classificação própria antes de contar obras.

## 8. Como evolui o emprego nos mercados em que as empresas atuam?

**O que é.** Reúne a evolução de estabelecimentos do universo externo e o emprego formal agregado dos mesmos territórios e atividades selecionadas. Ajuda a dimensionar contexto, expansão e retração da demanda empresarial.

**Como medir.** Na métrica implementada, (estoque de emprego do último mês / estoque do primeiro mês disponível na janela − 1) × 100. O zero inicial não produz uma taxa artificial. A evolução empresarial acompanha como contexto; admissões e desligamentos são fluxos separados. Os fechamentos mensais inicial/final e os municípios/CNAEs precisam ser explícitos. Não se calcula “empregos das empresas registradas” com fonte disponível só de forma agregada.

**Decisão e exemplo.** Entre o primeiro e o último estoque mensal disponível no recorte de 24 meses, o setor selecionado passa de 200 mil para 220 mil vínculos: +10%. O conselho pode demonstrar a relevância econômica do segmento e avaliar sua presença nesse mercado, sem dizer que criou os 20 mil empregos. O fluxo de admissões/desligamentos exige seus próprios cortes para reconciliar estoques.

**Fontes e limites.** CNPJ, Novo CAGED, RAIS, IBGE e convênios pertinentes. CAGED setorial não identifica automaticamente ocupações habilitadas, trabalhadores registrados no CREA ou a relação nominal com cada empresa. Filtros de porte, empresa ou situação que não existem na fonte agregada não reduzem artificialmente o emprego.

## 9. Onde se concentra a demanda pública por serviços técnicos?

**O que é.** Mostra o volume e a composição das contratações públicas com objetos potencialmente técnicos: categorias, órgãos, valores e locais identificáveis de execução. A pergunta é onde há demanda econômica relevante e qual parcela chega à carteira empresarial observada.

**Como medir.** Valor de contratações técnicas únicas publicadas na janela, com classificação textual versionada e fornecedores identificados. Na ficção, o campo de data representa publicação. Produção deve homologar aditivos, cancelamentos, consórcios e duplicações. Valor inicial, vigente, executado e pago são fatos separados e não se somam como investimento adicional.

**Decisão e exemplo.** Mil contratações técnicas somam R$ 2 bilhões no recorte, com concentração em saneamento e manutenção elétrica. A gestão pode pactuar intercâmbio de informações com os órgãos contratantes e demonstrar a relevância desses mercados, preservando o local de execução quando disponível.

**Fontes e limites.** PNCP/API e portais oficiais integrados por rotina; convênios com órgãos contratantes para execução e fiscalização contratual. Classificação textual precisa de regras/versionamento e revisão. Município do fornecedor ou do órgão não substitui o município da obra. Valor contratado não prova desembolso nem obra entregue.

## 10. Os fornecedores tinham registro vigente na última publicação observada?

**O que é.** Concilia a identidade dos fornecedores de objetos técnicos com o cadastro e a vigência do CREA, expondo correspondências comprovadas, situações históricas e lacunas de conciliação.

**Como medir.** Fornecedores distintos por CNPJ completo com registro exato vigente na data da sua publicação técnica mais recente dentro da janela / fornecedores distintos por CNPJ completo do universo técnico selecionado. A escolha da última publicação é uma regra demonstrativa explícita, não um teste de todos os contratos históricos. Mostrar contratos, valores e empresas-raiz como unidades próprias; somente raiz é sugestão.

**Decisão e exemplo.** Entre 500 CNPJs fornecedores, 300 têm registro exato vigente na sua última publicação técnica observada: 60%. Os demais podem conter situações históricas, outra jurisdição, consórcios ou ausência na integração. A composição é informação estratégica; não é uma lista automática de infratores.

**Fontes e limites.** Fornecedor/CNPJ, objeto e data de publicação do PNCP, registro/visto histórico e cobertura territorial. O indicador não representa assinatura, execução, situação atual ou vigência de todas as publicações anteriores. A jurisdição e os papéis de consorciadas/subcontratadas precisam de validação; o município do fornecedor não substitui o da obra.

## 11. Quais contratos têm vínculo documental explícito com ART?

**O que é.** Mede a existência de uma ponte comprovada entre um contrato técnico e a ART correspondente, quando esse relacionamento é relevante e está disponível. É uma medida condicional de rastreabilidade da informação.

**Como medir.** Contratos técnicos selecionados com ao menos uma ponte documental explícita contrato–ART / **todos os contratos técnicos selecionados na janela**. É a parcela do portfólio com rastreabilidade disponível, não uma taxa de conformidade de contratos previamente analisados. Número do contrato, órgão, CNPJ, objeto, local e datas apoiam a conciliação; sugestões sem chave confirmada permanecem separadas.

**Decisão e exemplo.** De 1.000 contratos técnicos selecionados, 190 têm ponte documental explícita: 19% do portfólio com rastreabilidade disponível. Os outros 810 não têm ponte nessa fonte; isso não demonstra inexistência da ART, infração ou análise técnica já concluída.

**Fontes e limites.** ART e campos contratuais internos; PNCP; dados por convênio com prefeituras, estado e órgãos contratantes. A V10 adiciona uma ponte documental **fictícia e explícita**, sem tratá-la como inferência real por CNPJ ou texto. Em produção, fonte de ponte desconhecida não recebe zero. ART da mesma empresa não comprova ART daquele contrato; obrigação e suficiência documental dependem de validação técnica/jurídica.

## 12. Quais empresas reúnem contrato técnico e CNPJ sem vigência exata?

**O que é.** Seleciona empresas que reúnem, no mesmo estabelecimento, CNPJ elegível na Receita/CNAE, registro exato vigente não identificado no corte e participação como fornecedor de contrato técnico publicado na janela. São fatos verificáveis que justificam análise; não uma nota de infração.

**Como medir.** Contar empresas-raiz distintas com ao menos um estabelecimento elegível que satisfaz as três condições: RFB/CNAE selecionado, ausência de registro exato vigente no corte e contrato técnico daquele estabelecimento na janela. Os IDs dos fatos permanecem investigáveis. A regra implementada não inclui ausência de RT nem divergência territorial; esses fatos têm leitura própria e podem fundamentar novas regras homologadas no futuro.

**Decisão e exemplo.** Há 5.500 empresas sem correspondência no universo externo, mas 120 também aparecem como fornecedores de objetos técnicos com chave comprovada. A gestão pode priorizar o estudo desse conjunto menor e explicar por que ele merece verificação, sem atribuir probabilidade fictícia de infração.

**Fontes e limites.** Cadastro, RFB, ART/RT e PNCP; convênios podem adicionar alvarás de obras, licenciamento ambiental, outorgas e dados de setores regulados. Cada origem exige competência, finalidade, publicidade/permissão e chave. CAGED agregado é contexto territorial; não é evidência individual de irregularidade de um CNPJ.

## 13. Qual é a adimplência das empresas com obrigações elegíveis?

**O que é.** Mede empresas sem saldo vencido entre as empresas com obrigações que compõem o denominador homologado. Separa situação financeira da situação do registro e da análise de obrigação profissional.

**Como medir.** Empresas-raiz com títulos observados de valor não negativo e vencimento até o corte, sem saldo vencido positivo / empresas-raiz com títulos nessas condições. Título com vencimento no próprio corte ainda não é atraso. Uma empresa com vários títulos entra uma vez; o denominador não se limita automaticamente à base vigente no corte. Exigibilidade legal e situações especiais precisam de homologação.

**Decisão e exemplo.** Das 4.500 empresas vigentes, 4.000 possuem obrigações elegíveis e 3.400 estão adimplentes: 85%. Dividir por 4.500 produziria outra medida e esconderia o universo financeiro real. A distribuição por porte, região e origem do débito orienta relacionamento e planejamento financeiro.

**Fontes e limites.** Obrigações, parcelas, vencimentos, pagamentos e estados financeiros no banco institucional. Não expor listas nominais de dívida na versão pública. Adimplência não equivale a regularidade técnica; inadimplência não comprova infração profissional.

## 14. Quanto foi efetivamente recebido de pessoas jurídicas?

**O que é.** Apresenta recebimentos empresariais pela data de pagamento e sua origem contábil, quando identificada: anuidades, taxas e outras naturezas aprovadas. A comparação separa a mudança de volume da mudança de preço/tabela quando houver informação suficiente.

**Como medir.** Soma dos pagamentos elegíveis vinculados à pessoa jurídica na janela, conciliados com o financeiro e sem duplicar repasses/cancelamentos/estornos. Recuperação de dívida é um subconjunto desse total, exibido como composição, não receita adicional. Unidade: reais recebidos.

**Decisão e exemplo.** Dos R$ 24 milhões recebidos da carteira empresarial nos 24 meses, R$ 3 milhões são pagamentos da coorte de dívida anterior e R$ 21 milhões têm outras origens. A gestão planeja sustentabilidade e explica sua composição, sem somar R$ 24 milhões + R$ 3 milhões.

**Fontes e limites.** Pagamento com data/valor, título e pessoa jurídica, plano de contas e estornos. Valor de obra de ART, valor contratado no PNCP e receita geral do CREA são universos diferentes. Uma ART paga por pessoa física não pode virar receita PJ apenas por estar associada a uma empresa.

## 15. Quanto da dívida empresarial está vencido e há quanto tempo?

**O que é.** Dimensiona a exposição financeira observável da carteira e sua distribuição por antiguidade, região, porte e natureza. Ajuda a distinguir um estoque antigo concentrado de atrasos recentes pulverizados.

**Como medir.** Saldo exigível vencido na data de corte, líquido de pagamentos e ajustes válidos até aquela data; mostrar empresas distintas devedoras e faixas de atraso. Fluxos recebidos não são somados ao estoque. A soma das faixas deve reconciliar com o saldo total.

**Decisão e exemplo.** O saldo vencido é de R$ 9 milhões em 600 empresas. Se uma parte expressiva está em títulos antigos ou poucos devedores, a interpretação difere de um atraso recente disseminado; a estratégia de relacionamento e provisão pode mudar sem aumentar automaticamente a cobrança sobre todos.

**Fontes e limites.** Histórico de títulos, pagamentos, renegociações, ajustes e exigibilidade. Não usar um índice de risco com pesos inventados nem prever recebimento sem modelo validado. Acesso restrito e agregação pública aprovada são obrigatórios no desenho produtivo.

## 16. Quanto foi recuperado da carteira vencida no início?

**O que é.** Mede quanto foi efetivamente pago de uma coorte de títulos já vencidos no início do período. O denominador fixo evita apresentar como sucesso a redução de estoque causada por cancelamento, prescrição ou mudança de escopo.

**Como medir.** Pagamentos na janela aplicados aos títulos vencidos com saldo **reconstruível** na abertura / saldo reconstruível dessa mesma coorte no início. Pagamentos sem data ficam fora do fluxo e da reconstrução histórica; a cobertura precisa ser qualificada. Baixas sem ingresso de caixa não são recuperação. Unidade: reais e percentual recuperado.

**Decisão e exemplo.** Uma carteira inicial de R$ 12 milhões recebe R$ 3 milhões: recuperação de 25%. Se outro R$ 1 milhão é cancelado por saneamento, esse ajuste não transforma a recuperação em R$ 4 milhões. A informação permite comparar coortes, canais e segmentos com denominadores equivalentes.

**Fontes e limites.** Vinculação pagamento–título, saldo inicial e eventos posteriores no financeiro. Sem reconciliação da coorte, mostrar apenas recebimentos classificados como recuperação e identificar a limitação; não inventar a taxa. A efetividade de uma ação específica exige seu vínculo documentado e avaliação adicional.

## 17. Quais CNPJs da coorte externa tiveram ingresso cadastral observado?

**O que é.** Acompanha estabelecimentos observados sem registro exato em uma fonte externa anterior à janela e identifica o primeiro registro exato posterior à observação. A entrada pode já estar sem vigência no corte final. É uma transição documental observada, não regularização atual ou efeito comprovado da administração.

**Como medir.** CNPJs completos da coorte externa pré-janela cujo primeiro registro exato ocorreu depois da observação e até o corte / CNPJs completos dessa coorte fixa. A observação é do fechamento imediatamente anterior à janela selecionada de 3, 6, 12 ou 24 meses. A ficção preserva snapshot, competência e IDs reproduzíveis próprios. Uma filial pode ingressar sem que a empresa-raiz seja nova no cadastro. A ficha deduplica raízes e pode mostrar menos empresas que estabelecimentos.

**Decisão e exemplo.** De 600 CNPJs observados sem registro exato antes da janela, 180 apresentam primeiro registro posterior: 30% de ingresso cadastral observado. Os outros 420 não têm esse evento identificado até o corte. Parte dos 180 pode já estar sem vigência no final; a permanência e a situação atual precisam de leitura adicional. O recorte territorial/setorial conserva a coorte e seus fatos.

**Fontes e limites.** Snapshot externo de identificação e primeiro registro exato do estabelecimento, com eventos posteriores. A frase correta é “180 CNPJs da coorte tiveram ingresso cadastral observado após a identificação”. Não dizer que são 180 novas empresas-raiz, 180 empresas atualmente regulares ou um resultado causado pela gestão. Ação institucional exige identificador próprio e avaliação de atribuição; a sequência temporal sozinha não demonstra causa.

## O que a administração pode demonstrar com evidência

A mesma medida pode apoiar planejamento interno e prestação de contas agregada. O argumento institucional precisa usar o universo efetivamente medido, a competência e a fonte. Os exemplos abaixo descrevem formas válidas de comunicar **dados reais homologados**; os números fictícios deste protótipo não são material de divulgação institucional.

| Indicadores | Argumento institucional verificável | O que a evidência não autoriza afirmar |
|---|---|---|
| 1 — base e mudança | “A base de empresas distintas passou de X para Y, com entradas e saídas discriminadas.” | “A administração criou Y empresas” ou usar registros/vistos como pessoas jurídicas novas |
| 2 — retenção | “Na coorte inicial e na condição cadastral na Receita observada, X% continuam com registro vigente.” | Atribuir todas as saídas à insatisfação, evasão ou perda econômica |
| 3 e 4 — presença e aberturas | “Neste universo de CNAEs e CNPJs completos, X% têm registro exato vigente; estes segmentos concentram aberturas ainda não identificadas.” | Chamar o complemento de empresas irregulares ou cobertura legal universal |
| 5 e 6 — RT | “A fonte identifica RT vigente em X empresas e cobertura em Y% dos dias-empresa registrados na janela qualificada.” | “Evitamos acidentes”, “todas as obras são seguras” ou ausência comprovada de RT fora da fonte |
| 7 — ART empresarial | “X das empresas com vigência em algum dia da janela têm documentos ART vinculados identificados no período.” | Empregos criados, faturamento gerado, obras entregues ou qualidade técnica comprovada |
| 8 — contexto econômico | “Os setores e territórios acompanhados representam um mercado com este estoque e esta variação de emprego formal.” | “O CREA criou esses empregos” ou imputar todo o estoque às empresas registradas |
| 9 e 10 — demanda pública | “O portfólio observado soma este valor publicado, e X% dos CNPJs fornecedores apresentam registro vigente na publicação de referência.” | Investimento efetivamente pago, obra executada ou conformidade de todos os contratos do fornecedor |
| 11 — rastreabilidade | “Há ponte documental explícita com ART em X% deste portfólio técnico.” | Que os contratos restantes não têm ART ou estão irregulares |
| 12 — convergência | “Este conjunto combina CNPJ elegível sem vigência exata no corte e contrato técnico do mesmo estabelecimento na janela.” | Probabilidade de infração, culpabilidade, resultado de autuação |
| 13 — adimplência | “X% das empresas com obrigações elegíveis não apresentam saldo vencido no corte.” | Regularidade técnica ou melhoria causada por um dirigente, sem avaliação específica |
| 14 a 16 — recursos | “Foram recebidos R$ X da carteira PJ; R$ Y pertencem à recuperação de uma coorte fixa, com estoque e ajustes conciliados.” | Somar recuperação à receita total, equiparar valor de ART a arrecadação ou apresentar baixa contábil como caixa |
| 17 — transição observada | “X CNPJs de uma coorte externa fixada antes da janela tiveram primeiro registro posterior identificado.” | X novas empresas-raiz, regularidade atual ou “regularização causada pela gestão” |

Esses argumentos interessam à Presidência, à Diretoria e aos representantes institucionais porque tornam **abrangência, presença técnica, relevância econômica e sustentabilidade** examináveis. Para demonstrar efeito de uma política específica, acrescentar antes da execução: objetivo, público/coorte, data, ação identificada, indicador de resultado, regra de comparação e método de avaliação. Não escolher retrospectivamente apenas os casos favoráveis nem trocar denominadores para melhorar a narrativa.

## O que fica como aprofundamento e qualificador

- **Acervo operacional/CAO:** empresas que solicitaram/obtiveram CAO, ARTs de origem, atividades e evolução. Útil para conhecer capacidade documental e demanda; emissão não comprova contrato conquistado, qualidade da execução ou habilitação automática em toda licitação. CAT profissional permanece separada.
- **Tempo de registro e de CAO:** mediana/P90 por coorte e serviço homogêneo, quando houver marcos completos e regra para exigências/suspensões. É um indicador complementar de acesso ao serviço, sem misturar serviços ou avaliar produtividade individual.
- **Concentração de RT:** profissionais distintos, número de empresas e distribuição dos vínculos, com regras de atribuição e vigência. É contexto de dependência técnica; não comprova excesso ilegal de vínculos ou presença física insuficiente.
- **Qualidade da conciliação:** CNPJs válidos/duplicados, papéis de matriz/filial, CNAEs e municípios conciliados, vigências completas, cobertura da ponte contrato–ART e percentual de origem com competência conhecida.
- **Confiança temporal:** última carga válida, defasagem, fonte indisponível e janela histórica coberta. Dados desconhecidos não recebem zero e não se tornam suspeita empresarial.
- **Metas:** somente metas formalmente pactuadas, com versão, vigência e responsável. Não fabricar metas de autuação, arrecadação, registros .

## Cinco páginas para um novo painel empresarial

1. **Estratégia empresarial:** base/crescimento e retenção, presença no universo externo, RT, atividade técnica e caixa como síntese. Permite partir de uma mudança e abrir sua composição.
2. **Presença e mercado:** universo externo, novas empresas, distribuição municipal/GRE/CNAE e contexto econômico agregado. O mapa seleciona território e as tabelas preservam o grão de empresa/estabelecimento.
3. **Relações e atividade técnica:** cobertura/continuidade RT, atividade ART, acervo e, quando houver ponte explícita, contrato–ART. Profissionais aparecem somente nas relações empresariais relevantes.
4. **Inteligência digital:** demanda PNCP, fornecedores, correspondências e interseções de evidências verificáveis. Sem tratamento operacional ou produtividade de fiscais.
5. **Recursos e resultados:** adimplência, caixa, dívida, recuperação de coorte e transições empresariais documentadas. Transparência usa agregações aprovadas, sem expor dívida ou suspeitas nominais.

Cada página deve mostrar uma pergunta, uma sequência de análise e de quatro a seis visuais relacionados, em canvas de PC. O recorte deve continuar até a tabela e a ficha empresarial. Nenhum filtro pode fingir que um fato agregado ficou individualizado: um CNPJ/porte não deve reduzir emprego territorial, orçamento institucional ou fonte sem essa dimensão.

## Fontes, parcerias e ordem de implantação

| Camada | Fonte/rota proposta | Uso real e condição |
|---|---|---|
| Interna | SQL Server e IBM Db2 via on-premises gateway | Views de identidade, estabelecimentos, registro/visto, RT, ART/CAO, financeiro e eventos; homologar chaves, competências e regras antes de ativar medidas reais |
| Pública empresarial | Receita Federal/CNPJ por arquivos oficiais automatizados ou integração autorizada | Identidade, situação, abertura, porte, CNAEs e localização; não presumir API pública irrestrita de todo o cadastro |
| Pública contratual | PNCP/API e bases oficiais integradas | Contratação, fornecedor, objeto, valor e órgão; diferenciar licitação, resultado, contrato e aditivo |
| Pública econômica | Novo CAGED, RAIS e IBGE em cargas homologadas | Contexto agregado; acesso individualizado depende da fonte e de instrumento jurídico próprio |
| Parcerias territoriais | Municípios, estado, órgãos ambientais, reguladores, concessionárias e contratantes | Alvarás/obras, licenças, instalações e execução contratual, com finalidade, base legal, cobertura e identificador comprovados |
| Integração institucional | Convênios e instrumentos técnicos com órgãos competentes | Prever finalidade, atualização, correção, segurança, auditoria, retenção e limites de redistribuição; parceria não equivale a acesso já disponível |

A primeira implantação deve consolidar identidade, vigência, RT e financeiro, ligar RFB/PNCP e produzir universos comparáveis. Continuidade técnica, coortes de resultados, recuperação e ponte contratual precisam de fatos históricos próprios. O painel pode demonstrar essas relações com dados fictícios reproduzíveis, mas deve manter explícito que conexões, autorizações e homologações de produção ainda não foram efetuadas.

Não há razão para transformar todo campo conhecido em indicador. A medida entra na direção estratégica quando muda uma decisão; as demais informações servem para explicar, verificar ou limitar essa decisão.


## Correspondência com o catálogo implementado

O arquivo `src/enterprise-v10/catalog.ts` é o dicionário textual dos mesmos 17 indicadores. As unidades não são todas empresas: cobertura, novas aberturas e coorte de ingresso usam **estabelecimentos/CNPJ completo**; fornecedores usam **CNPJ completo na sua publicação mais recente**; RT e base usam **empresa-raiz**; continuidade usa **dias-empresa**; financeiro e contratos conservam seus fatos monetários próprios. A tabela/ficha pode deduplicar raízes sem alterar a unidade original da medida.

| Nº | ID no modelo | Unidade principal |
|---|---|---|
| 1 | `base` | Empresas e variação (%) |
| 2 | `retention` | % de empresas da coorte elegível |
| 3 | `coverage` | % de estabelecimentos elegíveis |
| 4 | `newMarket` | Estabelecimentos (CNPJ completo) |
| 5 | `rtCoverage` | % de empresas vigentes |
| 6 | `rtContinuity` | % de dias-empresa registrados |
| 7 | `corporateActivity` | % de empresas com vigência em algum dia da janela |
| 8 | `economicContext` | % de variação do estoque agregado |
| 9 | `publicDemand` | R$ contratados/publicados |
| 10 | `supplierCoverage` | % de fornecedores (CNPJ completo) |
| 11 | `contractTrace` | % de contratos técnicos |
| 12 | `convergentEvidence` | Empresas-raiz com evidências |
| 13 | `compliance` | % de empresas com obrigações elegíveis |
| 14 | `receipts` | R$ recebidos |
| 15 | `overdue` | R$ vencidos no corte |
| 16 | `recovery` | % do saldo vencido de abertura |
| 17 | `observedEntry` | % de estabelecimentos da coorte externa |
