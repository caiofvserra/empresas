# Painel de Empresas

Primeiro painel separado do painel geral, de 01/11/2026. Abre em `/empresas.html` no site e em `entrega/painel-empresas-creasp.html` sem servidor. O painel geral continua em `/` e em `entrega/painel-gestao-creasp.html`, agora sem a aba Empresas. O painel geral tem um botão no menu lateral que leva ao de Empresas; o de Empresas não tem o caminho de volta, porque é entregue sozinho (pedido de 03/11/2026).

## Por que separar e como dividir

O painel único ficou pesado e não permite regras de acesso diferentes para cada público. A recomendação é dividir por público e por regra de acesso, e não uma aba por painel, porque várias abas leem os mesmos dados e servem às mesmas pessoas:

| Painel | Conteúdo | Quem acessa |
|---|---|---|
| Empresas (pronto) | Registro e mercado, evolução, responsáveis técnicos e ARTs, sócios, instalações e empregados | Superintendências e regionais; cada regional vê só a sua |
| Fiscalização e malha fina | Ações, autos, forças-tarefas, contratos públicos, obras e a lista de indícios | SUPFIS e regionais, com a lista nominal só para quem fiscaliza |
| Profissionais e formação | Profissionais, formação e registro, emprego e salário em totais, perícias | Superintendências; regionais veem só a sua |
| Gestão do Conselho | Receita e cobrança, controle interno, entidades e instituições de ensino, atendimento | Presidência e superintendências administrativas; diárias e pessoal com acesso restrito |
| Presidência | Só os indicadores principais e um resumo de cada painel, sem listas nominais | Presidência e diretoria |

No Power BI, cada painel tem o seu modelo de dados e a sua atualização, o que deixa cada arquivo leve. As tabelas comuns (calendário, município e regional, CNAE e câmara) vêm de um fluxo de dados único, para que os filtros funcionem igual em todos. A restrição por regional é uma regra de segurança por linha em cada modelo. O painel da Presidência lê os modelos dos outros e é feito por último. A aba Método vira um documento de apoio; a ficha (i) continua em cada bloco.

Ordem sugerida: Empresas, Fiscalização e malha fina, Profissionais e formação, Gestão do Conselho e, por fim, Presidência.

## O que o painel de Empresas tem

Desde 01/11/2026 (segundo retorno do Caio) cada página cabe numa tela de computador Full HD (1920×1080), sem rolagem, com blocos de larguras diferentes. O bloco mostra só o título e o gráfico; a explicação de leitura foi para o (i). Os gráficos variam de tipo para não ficar tudo em barras.

- **Registro e mercado.** Cinco indicadores (empresas registradas, parte do mercado registrada, atividade obrigatória sem nenhum registro, anuidade em dia e cadastro incompleto). Mapa do estado com o limite de cada município, pintado pela regional no indicador escolhido (parte do mercado registrada, CNPJs sem registro, empresas registradas, variação, RT, anuidade atrasada, ARTs ou empregos técnicos), com a lista das regionais em ordem ao lado. Mapa de árvore do mercado por câmara e atividade (CNAE), colorido pela parte registrada. Anel com a situação do registro por dentro e a anuidade por fora. Receita comparada com o cadastro. Funil do mercado à ART. Registradas por câmara e porte. Matriz de calor do tempo de registro cruzado com o capital social.
- **Evolução.** Entradas, saídas, aberturas na Receita, permanência e emprego formal. Economia (emprego formal, PIB e crédito "!") comparada com as empresas abertas na Receita e as que se registraram no Crea-SP, com o primeiro mês igual a 100. Calor dos novos registros por câmara e mês. Entradas e saídas mês a mês. Aberturas na Receita com a permanência das registradas.
- **RT e ART.** Responsável técnico, RT que saiu sem substituto, ARTs, valor declarado e registradas sem ART. ARTs mês a mês com o mesmo mês do ano anterior, ARTs por modalidade a cada 100 profissionais ativos da mesma modalidade, com a média, responsáveis técnicos e barras de 100% com a parte das registradas sem ART em cada câmara.
- **Vínculos.** Nome com "engenharia" e diretoria ("!", novo), sócios que são profissionais ("!"), usinas, postos, minas e financiamentos, empregados técnicos por empresa ("!"), credenciadas no DETRAN-SP e no INMETRO ("!") e engenharia incluída no contrato social pela Junta Comercial ("!").

Regional, município, câmara, período (3, 6, 12 ou 24 meses) e data de referência ficam numa única linha no alto da tela e valem para todas as páginas. Escolher um município leva o painel inteiro para ele e aproxima o mapa. O emprego formal sai em totais por regional, por isso, com um município escolhido, a série de emprego é a da regional dele. Clicar num elemento abre as empresas daquele elemento; nenhum clique abre o resumo genérico da regional. A barra de destaques que passava rolando no alto da tela saiu dos dois painéis.

## Sócios engenheiros: o que a lei pede

A Lei 5.194/66 não exige que os sócios sejam engenheiros para a empresa se registrar. O que ela exige é a participação efetiva de um profissional habilitado, o responsável técnico (art. 8º, parágrafo único, e art. 59). A composição da sociedade só importa para o nome:

- "Engenheiro", "arquiteto" ou "engenheiro-agrônomo" no nome só cabem quando a pessoa jurídica é composta **exclusivamente** de profissionais com esses títulos (art. 4º).
- "Engenharia", "arquitetura" ou "agronomia" no nome só cabem quando a diretoria é composta, **na maioria**, de profissionais registrados (art. 5º).
- O registro só é concedido se o nome condiz com a finalidade e com a qualificação de quem compõe a empresa (art. 59, § 1º).

O bloco "Nome com engenharia e diretoria", na página Vínculos, aplica o art. 5º às 250 empresas do cenário com "engenharia" no nome. Ele depende do CPF completo dos sócios, que só a Receita fornece por acordo, por isso leva o "!" e é demonstrativo. As Resoluções 1.002/2002 (código de ética) e 1.160/2025 (anexos de ART e CAT) não tratam da composição societária.

## Plano B para cada acordo

Nenhum acordo é certo. Por isso cada parceria tem um caminho que não depende de convênio, com dados públicos ou pedidos pela Lei de Acesso à Informação. O plano B é mais fraco (mais trabalho manual, menos cobertura, casos para conferir em vez de casos prontos), mas mantém o bloco útil. O texto aparece na ficha (i) de cada bloco com "!" e numa coluna da tabela de parcerias na página Método.

| Parceria | Se o acordo não sair |
|---|---|
| TCE-SP (e TCM-SP, na capital) | Ler os lotes de despesa que o próprio Tribunal publica no portal, todo mês, e ligar ao contrato do PNCP pelo número e pelo CNPJ. Perde-se só a regularidade garantida da entrega. |
| Prefeituras (começando por São Paulo) | Usar os alvarás que as prefeituras já publicam em dados abertos e ligar pelo endereço da obra ao endereço das ARTs do Crea-SP. Sem CNPJ, a ligação fica como candidata e não entra nas contagens confirmadas. |
| Corpo de Bombeiros | Consultar a página pública do Corpo de Bombeiros só para as empresas que a malha fina já selecionou, em lotes pequenos, e pedir listas pela Lei de Acesso à Informação. Perde-se a visão de todo o estado. |
| Receita Federal e Serpro (Cadastro Nacional de Obras) | Ficar com as obras públicas do PNCP e do Obrasgov, que já são automáticas, e com os alvarás abertos das prefeituras. Perdem-se as obras privadas que não pedem alvará público. |
| CETESB (e IBAMA e ANA, quando trouxerem CNPJ) | Coletar as licenças que a CETESB publica no portal de consulta, pelo nome e pelo município do empreendimento, como ligação candidata. Perde-se a ligação exata pelo CNPJ. |
| TJSP (e os tribunais do trabalho e o federal da região) | Ler as nomeações de peritos publicadas no Diário da Justiça Eletrônico, pelo nome e pelo número de registro citado. Perde-se o valor dos honorários e parte das nomeações sem registro citado. |
| Receita Federal (CPF completo dos sócios) | O quadro de sócios aberto da Receita mostra o nome completo e seis dígitos do CPF. Comparar nome e dígitos com o cadastro de profissionais, que tem o CPF completo, identifica quase todos os sócios profissionais. Os poucos casos ambíguos ficam como candidatos. |
| Junta Comercial do Estado de São Paulo (JUCESP) | Comparar a atividade (CNAE) de cada empresa no arquivo mensal da Receita com a do mês anterior. A inclusão de engenharia aparece com a data aproximada do mês, sem o texto do objeto social. |
| DETRAN-SP | Coletar as listas de empresas credenciadas que o DETRAN-SP publica no site, por atividade e município, e ligar pelo CNPJ ou pela razão social. Perde-se a validade de cada credenciamento quando a lista não a traz. |
| INMETRO | Coletar as listas públicas de laboratórios e organismos acreditados que o INMETRO mantém no site, com o CNPJ e o escopo. Este é o caso em que o acordo menos faz falta. |
| Instituições de ensino parceiras | Comparar o número de formados por curso e instituição do Censo da Educação Superior com os registros novos do Crea-SP pela instituição que o profissional declara no pedido de registro. Perde-se o acompanhamento pessoa a pessoa. |
| Ministério do Trabalho (RAIS identificada e eSocial) | Continuar com o emprego formal em totais por município e ocupação (RAIS e Novo CAGED públicos). Por empresa, não há substituto: o bloco sai do demonstrativo e fica só a leitura regional. |
| Banco Central (crédito em totais) | Usar a estatística bancária por município (ESTBAN) e o painel de crédito por atividade e estado (SCR.data), ambos públicos e mensais. Perde-se o cruzamento de município com atividade ao mesmo tempo. |

## Reavaliação de 02/11/2026

O Caio pediu para conferir se o painel está bom, condizente com os dados e com o objetivo (um painel de empresas para a administração do Crea-SP). O que foi conferido e o que mudou:

| Ponto | O que havia | O que foi feito |
|---|---|---|
| Nome da primeira aba | "Mercado", que soava como análise de mercado | Virou "Registro", com o título "Registro e mercado": a página responde quantas empresas estão registradas e quanto do mercado isso cobre |
| Responsável técnico | O cenário dava RT a só 26% das registradas, e 1.377 empresas apareciam "sem vínculo carregado". Na vida real quase toda empresa registrada tem RT, porque a lei exige | O cenário passou a ter vínculo de RT para a grande maioria das registradas (78% com RT vigente, 7% com RT que saiu sem substituto, 15% sem vínculo carregado), e há profissionais que respondem por 3 e 4 empresas |
| Evolução da base | Todos os registros começavam entre 2021 e 2026, então a base parecia triplicar em dois anos; as saídas saltavam de 5 para 150 por mês em 2026 | Três em cada quatro registros vêm de anos atrás (estoque), e o fluxo de entradas e saídas é parelho: cerca de 30 entradas e 15 saídas por mês, base crescendo perto de 10% ao ano |
| ARTs | A série parecia multiplicar por oito em dois meses, e o cartão dizia "+197% em relação ao ano anterior" | As ARTs se espalham pelos últimos 36 meses em proporção ao tamanho da base: cerca de 200 por mês, com variação anual de um dígito |
| Empresas abertas na Receita | As aberturas paravam em dezembro de 2025, e a série caía 63% | As aberturas seguem até agosto de 2026, com o atraso normal do arquivo da Receita |
| ARTs por modalidade | A modalidade da ART era sorteada por igual entre cinco, o que dava 310 ARTs por 100 profissionais de segurança do trabalho e 40 na civil | A modalidade da ART segue a distribuição dos profissionais (civil 45%, elétrica 20%, mecânica 20%, segurança 10%, agronomia 5%) |
| Anuidade | 41% das registradas com anuidade vencida | Perto de 30%, que é a ordem de grandeza conhecida |
| Nome com "engenharia" | Mais da metade das empresas com "engenharia" no nome não atendia ao art. 5º | Empresa com "engenharia" no nome tem chance maior de ter profissional entre os sócios; a parte que não atende caiu para cerca de 40%, ainda um número de demonstração |
| Texto dentro do bloco | O quadro de responsáveis técnicos trazia uma frase de leitura dentro do bloco | A frase foi para o (i), como nos demais blocos |
| Contagem de entradas e saídas | A contagem mensal do modelo contava a mesma empresa duas vezes quando dois estabelecimentos dela entravam no mesmo mês, e o gráfico contava uma | As duas contagens passaram a ser por empresa |

Conferências que bateram: o cartão de empresas registradas é o mesmo número do funil e do anel; a parte do mercado registrada do cartão é a mesma da conciliação ("Sim" e "Passível") e do mapa; "RT que saiu sem substituto" é o mesmo número no cartão e no quadro; "registradas sem ART" bate com o funil e com as barras por câmara; "continuam registradas depois de 12 meses" bate entre o cartão e a lista de permanência. Os dois números de "sem registro" na primeira página são contas diferentes de propósito: 362 são os estabelecimentos de atividade obrigatória que nunca apareceram no cadastro; 376 são todos os que nunca apareceram, inclusive os de atividade "passível"; a ficha (i) de cada um diz isso.

Quanto ao objetivo, o painel responde às perguntas que a administração faz sobre empresas: quantas estão registradas e quanto do mercado isso cobre, onde e em que atividades estão as que faltam, se as registradas têm responsável técnico e registram ART, se pagam a anuidade e se o cadastro está completo, como a base evolui e com quem as empresas se ligam. O que ele não traz de propósito: a receita em reais e o custo da fiscalização ficam no painel de gestão, e as ações de fiscalização detalhadas ficam no painel de fiscalização e malha fina. O cenário continua demonstrativo (selo no alto da tela): os números servem para mostrar a leitura, não o Crea-SP.

## Ajustes de 03/11/2026

- O painel passou a ter as nove câmaras especializadas do Crea-SP, com os nomes do sistema do Conselho: Civil, Elétrica, Mecânica e Metalúrgica, Segurança do Trabalho, Agronomia, Química, Ambiental e Sanitária, Agrimensura e Geologia e Minas. Antes eram quatro. A câmara de cada empresa continua estimada pela atividade principal (`camaraPorCnae` em `src/painel/analise.ts`); o cenário ganhou dez atividades novas e um sorteio com peso, para a civil ficar com pouco mais da metade das empresas e as câmaras menores com poucos por cento cada. As ARTs e os profissionais do cenário ganharam as modalidades química, geologia e minas e agrimensura.
- O atalho "Geral" saiu da barra lateral do painel de Empresas, porque ele é entregue sozinho. O painel geral continua com o atalho para Empresas.
- Revisão de leitura (pedido do Caio: "verifique se a leitura e entendimento humano realmente está eficaz"). O mapa de calor de novos registros passou de 24 meses para oito trimestres, com o número em cada célula e a cor comparando cada câmara com ela mesma; antes, fora a civil, as linhas ficavam todas na mesma cor e nada se lia sem passar o mouse. "Receita comparada com o cadastro" trocou “Sim” e “Passível” por "Registro obrigatório" e "Registro a analisar". No mapa de árvore, a parte registrada vem antes do nome da câmara, para não sumir nos retângulos pequenos. O histograma de responsáveis técnicos ganhou título que explica o eixo e o vermelho. No tema escuro, as aberturas sem registro ganharam cor visível, e o tema salvo passa a entrar antes da primeira leitura das cores dos gráficos.

## O que saiu e por quê

| Saiu | Motivo |
|---|---|
| Prazo de concessão do registro | Pedido da gestão |
| Empresas registradas por regional nos últimos 24 meses | Os filtros de regional e de período fazem esse papel |
| Prazo da certidão de acervo operacional | Pedido da gestão; a medida continua calculável para um painel de atendimento |
| Responsável técnico e quitação por regional | Misturava dois assuntos; RT ficou na página RT e ART e a quitação no cartão e na rosca de anuidade |
| Densidade de empresas por habitante | Leitura difícil |
| Riqueza, crédito e registro por regional | Sem interesse; o PIB e o crédito foram para o gráfico de economia, aberturas e registros |
| Como a base mudou no período (ponte) | Depende de classificar cada entrada e retorno, dado que o cadastro pode não ter |
| Gráfico de colunas com larguras diferentes por câmara | Substituído por barras deitadas, mais fáceis de ler |
| ARTs por regional e mês | Mesmo caso do gráfico de 24 meses: a regional é filtro |
| A palavra "dono" e a linha "Responsável" das fichas | Não fazia sentido no painel; saiu também do plano e da documentação |
| Rede de empresas sócias (02/11/2026) | Trazia pouca informação nova: as sócias com atividade de engenharia e sem registro já aparecem pela atividade na Receita, no mapa, no mapa de árvore e na conciliação |
| Mapa de bolhas (02/11/2026) | Trocado pelo mapa com o limite dos municípios, como o da Presidência, com mais indicadores |
| Rosa das ARTs por modalidade (02/11/2026) | Não deixava comparar; agora são barras com as ARTs a cada 100 profissionais da modalidade |
| Barras em círculo das registradas sem ART (02/11/2026) | Difícil de comparar; agora são barras de 100% por câmara |
| Quadrado colorido nos atalhos ao lado dos gráficos (02/11/2026) | Parecia uma segunda legenda; o quadrado ficou só onde é legenda de verdade |

## Comparação com o antigo painel de empresas

| No painel antigo | Aqui |
|---|---|
| Total de registros e total de empresas, ativos e inativos | Três contagens e situação do registro |
| Adimplentes e inadimplentes | Cartão e rosca de anuidade |
| Empresas com RT inativo e registro ativo | RT que saiu sem substituto e empresas sem RT |
| Registros ativos por câmara | Mercado de cada câmara, com o que falta registrar |
| Registros ativos por CNAE | Atividades com mais estabelecimentos sem registro |
| Distribuição por GRE ("sigla não localizada") | Filtro de regional, registro obrigatório por regional e o cartão de cadastro incompleto |
| Registros por faixa de capital | Capital social das empresas registradas (novo) |
| Tempo de registros ativos em anos | Há quanto tempo as empresas estão registradas (novo) |

## Verificação

```bash
npm test               # inclui tests/empresas.test.ts
npm run build          # site com os dois painéis
npm run build:painel   # entrega/painel-gestao-creasp.html e entrega/painel-empresas-creasp.html
```
