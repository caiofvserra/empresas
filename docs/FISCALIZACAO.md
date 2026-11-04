# Painel de Fiscalização e malha fina

Terceiro painel separado do painel geral, de 03/11/2026. Abre em `/fiscalizacao.html` no site e em `entrega/painel-fiscalizacao-creasp.html` sem servidor. As abas Fiscalização e Malha fina saíram do painel geral e vieram para cá, divididas em cinco páginas. O painel geral ganhou um atalho para ele no menu lateral; o painel de Fiscalização não tem o caminho de volta, porque é entregue sozinho, como os de Empresas e de Profissionais.

Segue as mesmas regras de tela dos outros painéis temáticos: cada página cabe numa tela Full HD (1920×1080) sem rolagem, os blocos têm larguras diferentes, o bloco mostra só o título e o gráfico e a explicação de leitura fica no (i). Os gráficos variam de tipo. Regional, município, câmara, período (3, 6, 12 ou 24 meses) e data de referência ficam numa linha só, no alto da tela, e valem para todas as páginas. Clicar num elemento abre a lista das ações, das empresas, dos contratos ou das obras daquele elemento, e nunca o resumo da regional.

O filtro de município vale para as ações, os indícios, a malha fina, os contratos e as obras. O mapa, as forças-tarefas e a comparação das regionais continuam olhando o estado inteiro, porque comparam uma regional com as outras; o filtro só aproxima o mapa.

## O que cada página tem

- **Ações.** Ações de fiscalização, autos de infração, multas aplicadas, multas recebidas e registros que vieram da fiscalização. Mapa do estado com o limite de cada município, pintado pela regional no indicador escolhido (ações, ações a cada 100 estabelecimentos de engenharia, autos, parte já regularizada, indícios sem ação, dias até a primeira ação, multas em dívida ativa), com a lista das regionais ao lado. Ações, autos e regularizações dos últimos 24 meses, com o número de cada mês. O que aconteceu com as ações de cada tipo de caso, em barras de 100%. De onde vieram as ações e a parte que já regularizou. Anel com o valor das multas pela situação na data escolhida.
- **Resultado.** Regularizações depois de uma ação (contra a meta), parte que regularizou em até 180 dias no último trimestre fechado, dias até a primeira ação, receita recebida depois de uma ação e forças-tarefas acima da comparação. Regularização em 180 dias por trimestre, com os trimestres em curso marcados. Cada força-tarefa contra as ações parecidas fora dela (dois pontos ligados). Boxplot dos dias da ação até a regularização, por origem. Boxplot dos dias do indício até a primeira ação, por tipo. Receita depois de uma ação, mês a mês.
- **Malha fina.** Empresas com algum indício, com indício confirmado, com dois ou mais, já com ação e ainda sem ação. Empresas por regra, com a confiança da ligação escrita ao lado do nome e o "!" nas regras que dependem de acordo. Atividade de engenharia sem registro por câmara. A malha fina refeita mês a mês nos 12 meses anteriores. Registro ativo de empresa fechada na Receita, com o valor vencido. Histograma de ARTs por profissional, com o limite da regra marcado. Empresas que fecham e abrem no lugar. Nome de engenharia sem registro.
- **Contratos.** Contratos públicos técnicos, parte em que a ART cita o contrato, contratos sem ART encontrada, valor com fornecedor sem registro na data e parte já paga ("!"). Contratos por categoria e pela ART encontrada. Anel do valor pela situação do fornecedor no dia do contrato. Lista dos maiores contratos sem ART. Os dez maiores fornecedores. Planos de contratação por etapa. Contratado, empenhado, liquidado e pago ("!").
- **Obras.** Obras públicas, obras que começaram sem ART de fiscalização, obras privadas com ART encontrada ("!"), executoras de obra privada sem ART ("!") e licenças de obra sem ART ligada ("!"). Obras públicas por regional e pela ART de fiscalização. Anel da situação das obras. Lista das maiores obras sem ART de fiscalização. Funil das obras privadas até a ART ("!"). Papel do responsável pela obra privada ("!"). Alvarás e licenças por órgão ("!").

## Parcerias e plano B

Três grupos de blocos dependem de acordo e levam o "!". O plano B de cada um aparece na ficha (i):

| Parceria | Blocos | Se o acordo não sair |
|---|---|---|
| TCE-SP e TCM-SP | Quanto dos contratos já foi pago; cartão "Já pago dos contratos" | O que está na ficha (i) da parceria do Tribunal de Contas |
| Receita Federal e Serpro (Cadastro Nacional de Obras) | Obras privadas e a ART, quem responde pela obra privada, dois cartões de obras privadas | Ficar com as obras públicas do PNCP e do Obrasgov, que já são automáticas, e com os alvarás abertos das prefeituras. Perdem-se as obras privadas que não pedem alvará público |
| Prefeituras, Corpo de Bombeiros e CETESB | Alvarás e licenças, e a ART da obra; cartão de licenças de obra sem ART | Usar os alvarás que as prefeituras já publicam em dados abertos e ligar pelo endereço da obra ao endereço das ARTs. Sem CNPJ, a ligação fica como candidata e fora das contagens confirmadas |

## O que foi conferido no cenário

O cenário é demonstrativo. Antes de entregar, cada página foi conferida no navegador em Full HD, nos temas claro e escuro, e o que parecia implausível foi tratado como defeito do cenário:

| Ponto | O que havia | O que foi feito |
|---|---|---|
| Ações por ano | Cada caso sorteava a própria data, e as ações pareciam crescer 40% ao ano | Os casos em aberto entram numa fila com capacidade de 8 a 12 ações por mês. As ações ficam parelhas (274 nos últimos 12 meses, 284 no ano anterior) e a espera cresce quando surgem mais casos |
| Forças-tarefas | Cada força-tarefa tinha de 4 a 11 ações, pouco para comparar | A força-tarefa de registro concentra até seis ações por mês na regional dela, e os registros logo depois dela têm chance maior de terem sido induzidos. As fechadas têm de 17 a 33 ações |
| Datas das forças-tarefas | Duas forças-tarefas caíam fora da série de ações | Campinas foi para outubro a dezembro de 2024, e São José dos Campos para janeiro a março de 2025 |
| Contratos sem ART | Mais da metade dos contratos técnicos não tinha ART, porque a data do contrato não tinha relação com as ARTs da empresa | Quatro em cinco contratos de empresa com ART têm a data perto de uma ART dela, e dois em cada três contratos com ART trazem o número do contrato. Ficaram 36% com ART que cita o contrato, 28% com ART provável e 35% sem ART encontrada |
| Fornecedor sem registro | Os contratos iam quase todos para empresas de fora da base | A maioria dos contratos vai para empresas registradas. O fornecedor sem registro na data ficou em 18% do valor |
| Espera até a primeira ação | Nos registros induzidos, o indício aparecia sempre 30 dias antes da ação, e o boxplot virava um traço | A espera varia de 15 a 150 dias. No caso típico, são 118 dias, contando os indícios ainda abertos |
| Responsável técnico que saiu | A notificação caía ao acaso nos 200 dias seguintes e quase nunca vinha antes da troca de RT | Quando a empresa indica outro RT, a notificação vem antes em três de cada quatro casos. A regularização desse tipo continua baixa (perto de 6%), porque no cenário a maioria das saídas de RT não tem substituto. A ficha (i) e o gráfico mostram isso |

## Leitura de cada gráfico

Todo gráfico se entende sem passar o mouse: o número que importa vai escrito. Os tempos aparecem em boxplot, com a mediana em negrito e o intervalo da metade do meio dos casos escrito ao lado, e não só em média. Nas pilhas de barras, cada parte mostra o próprio número e o total vai no fim. Nos anéis, cada fatia leva o valor e a parte. O histograma das ARTs marca em laranja as faixas acima do limite da regra. As forças-tarefas mostram o código, as datas e o número de ações embaixo do nome, porque duas delas têm o mesmo tema e a mesma regional.

## O que mudou no painel geral

O painel geral perdeu as abas Fiscalização e Malha fina. Os destaques da Presidência que levavam a elas agora abrem o painel de Fiscalização na página certa: Ações, Resultado, Malha fina ou Contratos. A aba Método continua com a tabela das regras da malha fina. O gráfico que comparava registro e emprego por regional saiu, porque é leitura de mercado e já tem lugar no painel de Empresas.
