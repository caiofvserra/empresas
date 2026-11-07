# Painel de Empresas

Primeiro painel separado do painel geral, de 01/11/2026. Abre em `/empresas.html` no site e em `entrega/painel-empresas-creasp.html` sem servidor. Desde 07/11/2026, o painel geral deu lugar ao painel da Presidência ([PRESIDENCIA.md](PRESIDENCIA.md)), que abre em `/` e tem os atalhos para os outros painéis no menu lateral. O de Empresas não tem o caminho de volta, porque é entregue sozinho (pedido de 03/11/2026).

## Por que separar e como dividir

O painel único ficou pesado e não permite regras de acesso diferentes para cada público. A recomendação é dividir por público e por regra de acesso, e não uma aba por painel, porque várias abas leem os mesmos dados e servem às mesmas pessoas:

| Painel | Conteúdo | Quem acessa |
|---|---|---|
| Empresas (pronto) | Registro e mercado, evolução, responsáveis técnicos e ARTs, sócios, instalações e empregados | Superintendências e regionais; cada regional vê só a sua |
| Fiscalização e malha fina (pronto, ver [FISCALIZACAO.md](FISCALIZACAO.md)) | Ações, autos, forças-tarefas, contratos públicos, obras e a lista de indícios | SUPFIS e regionais, com a lista nominal só para quem fiscaliza |
| Profissionais e formação (pronto, ver [PROFISSIONAIS.md](PROFISSIONAIS.md)) | Profissionais, formação e registro, emprego e salário em totais, perícias | Superintendências; regionais veem só a sua |
| Gestão do Conselho | Receita e cobrança, controle interno, entidades e instituições de ensino, atendimento | Presidência e superintendências administrativas; diárias e pessoal com acesso restrito |
| Presidência | Só os indicadores principais e um resumo de cada painel, sem listas nominais | Presidência e diretoria |

No Power BI, cada painel tem o seu modelo de dados e a sua atualização, o que deixa cada arquivo leve. As tabelas comuns (calendário, município e regional, CNAE e câmara) vêm de um fluxo de dados único, para que os filtros funcionem igual em todos. A restrição por regional é uma regra de segurança por linha em cada modelo. O painel da Presidência lê os modelos dos outros e é feito por último. A aba Método vira um documento de apoio; a ficha (i) continua em cada bloco.

Ordem seguida: Empresas, depois Profissionais e formação e depois Fiscalização e malha fina (03/11/2026, a pedido do Caio). Faltam Gestão do Conselho e, por fim, Presidência.

## O que o painel de Empresas tem

Desde 01/11/2026 (segundo retorno do Caio) cada página cabe numa tela de computador Full HD (1920×1080), sem rolagem, com blocos de larguras diferentes. O bloco mostra só o título e o gráfico; a explicação de leitura foi para o (i). Os gráficos variam de tipo para não ficar tudo em barras.

- **Registro e mercado.** Cinco indicadores (empresas registradas, parte do mercado registrada, atividade obrigatória sem nenhum registro, anuidade em dia e cadastro incompleto). Mapa por município: cada município é pintado pelo próprio valor no indicador escolhido (parte do mercado registrada, CNPJs sem registro, empresas registradas, variação, RT, anuidade atrasada, ARTs ou empregos técnicos), e a lista ao lado traz as GREs em ordem. Mapa de árvore do mercado por câmara e atividade (CNAE), colorido pela parte registrada comparada com a meta de cobertura. Anel com a situação do registro por dentro (com rótulo em cada fatia) e a anuidade por fora. Receita comparada com o cadastro, em barras de 100% (todas as atividades, registro obrigatório e registro a analisar), com as registradas pela situação do CNPJ na Receita (ativa, baixada, suspensa, inapta) embaixo. Funil do mercado à ART, com as etapas depois do registro em parte das registradas. Registradas por câmara e porte em barras de 100%. Matriz de calor do tempo de registro cruzado com o capital social.
- **Evolução.** Entradas (pela primeira vez e retornos), saídas, aberturas na Receita, permanência e emprego formal. Economia (emprego formal e crédito "!") comparada com as empresas abertas na Receita e as que se registraram no Crea-SP, com o primeiro mês igual a 100; a série das abertas termina no último mês com arquivo da Receita. Calor dos novos registros por câmara e mês. Entradas e saídas mês a mês. Aberturas na Receita com a permanência das registradas.
- **RT e ART.** Responsável técnico, RT que saiu sem substituto, ARTs, valor declarado e registradas sem ART. ARTs mês a mês com o mesmo mês do ano anterior, ARTs por modalidade a cada 100 profissionais ativos da mesma modalidade, com a média, responsáveis técnicos e barras de 100% com a parte das registradas sem ART em cada câmara.
- **Vínculos.** Nome com "engenharia" e diretoria ("!", novo), sócios que são profissionais ("!"), usinas, postos, minas e financiamentos, empregados técnicos por empresa ("!"), credenciadas no DETRAN-SP e no INMETRO ("!") e engenharia incluída no contrato social pela Junta Comercial ("!").
- **CNPJ (07/11/2026, dado real).** O mercado de engenharia nos dados abertos do CNPJ da Receita, sem nada do cenário demonstrativo. Cinco indicadores (ativos com atividade de registro obrigatório, ativos com atividade a analisar, abertos, baixados e saldo do período), mapa por município (ativos, abertos ou baixados), as atividades da lista com mais estabelecimentos, a situação na Receita e o porte, e abertos e baixados mês a mês. Os números são agregados por município; nenhum nome nem CNPJ entra no painel. Veja "Dados abertos do CNPJ" abaixo.

Regional, município, câmara, período (3, 6, 12 ou 24 meses, ou qualquer número de meses digitado no campo "outro", até o início do histórico) e data de referência ficam numa única linha no alto da tela e valem para todas as páginas. O botão "Mais" abre o porte da empresa e a situação do CNPJ na Receita (05/11/2026). Os filtros em uso aparecem no rodapé, cada um com o seu "x", e ficam no endereço da página, para um link levar à mesma tela. Escolher um município leva o painel inteiro para ele e aproxima o mapa. O emprego formal sai em totais por regional, por isso, com um município escolhido, a série de emprego é a da regional dele. Clicar num elemento abre as empresas daquele elemento; nenhum clique abre o resumo genérico da regional. A barra de destaques que passava rolando no alto da tela saiu dos dois painéis.

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
- O atalho "Geral" saiu da barra lateral do painel de Empresas, porque ele é entregue sozinho. O painel da Presidência tem o atalho para Empresas.
- Revisão de leitura (pedido do Caio: "verifique se a leitura e entendimento humano realmente está eficaz"). O mapa de calor de novos registros passou de 24 meses para oito trimestres, com o número em cada célula e a cor comparando cada câmara com ela mesma; antes, fora a civil, as linhas ficavam todas na mesma cor e nada se lia sem passar o mouse. "Receita comparada com o cadastro" trocou “Sim” e “Passível” por "Registro obrigatório" e "Registro a analisar". No mapa de árvore, a parte registrada vem antes do nome da câmara, para não sumir nos retângulos pequenos. O histograma de responsáveis técnicos ganhou título que explica o eixo e o vermelho. No tema escuro, as aberturas sem registro ganharam cor visível, e o tema salvo passa a entrar antes da primeira leitura das cores dos gráficos.
- Mapa de árvore com regra de divisão (pedido do Caio em 04/11/2026). Cada estabelecimento conta uma vez, na atividade que o enquadra: a principal, ou a primeira secundária da lista quando a principal não está nela. Assim as partes somam o mercado da câmara. O tamanho é o número desses estabelecimentos, e a porcentagem, a parte com registro. Quem tem a atividade só como secundária aparece na dica ("outros N têm esta atividade como secundária"), sem contar duas vezes. Em cada câmara, as atividades menores que juntas somam até 10% dela ficam em "Outras atividades", em cinza e sempre por último. As nove câmaras aparecem sempre, mesmo sem estabelecimento. No bloco pequeno, cada câmara mostra com nome cerca de uma atividade a cada 7% do mercado (no mínimo duas), e o resto vai para "Outras"; ampliado, aparecem todas as que passam da regra dos 10%. No cenário de demonstração só 22 atividades têm estabelecimentos, então "Outras" quase não aparece; com a lista real de cerca de 700 CNAEs, a regra passa a agir.
- O mapa das regionais virou "Mapa por município" (pedido do Caio em 04/11/2026: "regional é GRE"). A cor é do município, no próprio valor dele, em cinco faixas; a lista ao lado traz as GREs, e passar o mouse numa GRE acende os municípios dela. Município com menos de duas empresas ou estabelecimentos na base de uma porcentagem fica cinza ("poucos dados"). As faixas são por quantil e aguentam empates: o zero vira faixa própria quando há zeros.
- Dados nos 645 municípios (pedido do Caio em 04/11/2026). O cenário de demonstração espalha os estabelecimentos por todos os municípios do estado: cada um recebe pelo menos dois, e o resto é sorteado pela população. A GRE de cada município vem da tabela oficial (16 GREs). O filtro de município lista os 645 em todos os painéis. Marília entrou como cidade-sede (GRE 16). O emprego formal do cenário continua por cidade-sede; no mapa, o estoque técnico de cada GRE é repartido entre os municípios dela pela população. Em municípios pequenos as porcentagens oscilam muito (0, 50 ou 100%), e a dica mostra a base.

## Ajustes de 05/11/2026

Revisão de leitura das abas "Registro e mercado" e "Evolução das empresas", com a exportação em CSV em todos os blocos com dados tabulares e o filtro cruzado (a gaveta oferece "Filtrar a página por…" ao clicar num município, numa GRE ou numa câmara).

| Bloco ou cartão | O que havia | O que foi feito |
|---|---|---|
| Anel "Registro e anuidade" | A coroa de dentro não tinha rótulo, e a fatia "Sem cobrança no período" era sempre zero (em dia e em atraso já somam as registradas) | O anel fica (o Caio gostou dele); a coroa de dentro ganhou nome e parte do total em cada fatia, e a fatia vazia saiu do código e da ficha |
| "Receita comparada com o cadastro" | Barras absolutas, 80% do bloco vazio, sem a linha que fecha com o cartão | Barras de 100% com o total à direita e a linha "Todas as atividades" (a mesma conta do cartão "Parte do mercado que está registrada") acima de "Registro obrigatório" e "Registro a analisar". Embaixo, no mesmo bloco, as registradas pela situação do CNPJ da matriz na Receita (ativa, baixada, suspensa, inapta), com contagem e porcentagem; clique abre a lista; a ficha explica as duas partes e sugere a ação (registrada com CNPJ baixado ou inapto é cadastro inflado e anuidade incobrável) |
| Funil "Do mercado à ART" | "Com RT" e "Com ART" mostravam a parte do universo (parecia baixo) | Mostram a parte das registradas; a primeira etapa continua com a parte do universo |
| "Registradas por câmara e porte" | Barras absolutas, a civil esmagava as outras | Barras de 100% por câmara com o total à direita, como em "Registradas sem ART, por câmara" |
| Cartão "Empresas registradas" | "2.643 estabelecimentos e 2.643 registros e vistos" parecia erro | "N estabelecimentos · N vistos de empresas de fora de SP" |
| Cartão "Registradas com cadastro incompleto" | Rótulo bruto do tipo de pendência ("CREA ativo / CNPJ baixado") | Dicionário de nomes legíveis (`nomePendencia` em `src/domain/types.ts`): "212 com registro ativo e CNPJ baixado na Receita" |
| Fichas | A do mapa dizia que o município recebia a cor da regional; a do cartão "Atividade obrigatória e nenhum registro" não explicava a diferença para o funil | Reescritas: cor do próprio município em cinco faixas por quantil, cinza com menos de 2 na base; o cartão conta estabelecimentos só das atividades obrigatórias e o funil conta empresas de todas as atividades |
| Mapa de árvore | A rampa de cor ia do mínimo ao máximo do recorte, e o mesmo 70% mudava de cor conforme o filtro | Três faixas ancoradas na meta de cobertura (abaixo da meta em laranja, da meta até 15 pontos acima em azul, acima disso em azul-escuro) e uma legenda de três pontos no rodapé |
| "Economia, empresas abertas e registros" | "Abertas na Receita" caía no último mês porque set/26 não tem arquivo da Receita; o PIB anual era uma linha reta de −0%; crédito (laranja tracejado) e registradas (amarelo) quase iguais; emprego em cinza fino sumia | A série das abertas termina no último mês com arquivo (`ultimoMesReceita`); o PIB saiu do gráfico e da lista (fica na ficha); crédito em roxo e emprego na cor do texto. Os gráficos de 24 meses passam a usar `janela.months`, e os textos dizem "em N meses" |
| "Abertas na Receita e permanência" | set/26 aparecia como barra zero | O eixo termina no último mês com arquivo; a ficha diz que o arquivo chega com atraso e o último mês pode faltar |
| Cartão "Empresas que entraram na base" | Somava primeiros registros e retornos sem dizer | "N pela primeira vez, N retornos; N após fiscalização"; a ficha explica o retorno e por que o calor de novos registros dá outro número |

Cenário (`src/domain/dataset.ts`): a empresa nova passa a se registrar entre 2 e 10 meses depois da abertura, e uma pequena parte não se registra, de modo que perto de 57% das abertas em 24 meses já estão registradas (antes, 81%, acima da cobertura do estoque); os retornos caíram de 39% para perto de 14% das entradas (reativação só em registros antigos e a empresa que já teve registro raramente volta nos últimos três anos); as filiais de matrizes recentes deixaram de se espremer em ago/26, e as aberturas por mês ficaram parelhas. A base de registradas cresce perto de 7% ao ano, a permanência em 12 meses fica perto de 94% e a cobertura do estoque perto de 69%, acima da meta de 65%. O total de registros continua em 4.500.

### Interatividade, período, exportação e outras funções

Pedido do Caio em 05/11/2026 ("verifique a interatividade", "3, 6, 12, 24, poderia ser possível ajustar manualmente", "acrescente botões de exportar", "outras funcionalidades?").

- **Período livre.** Ao lado dos quatro atalhos, o campo "outro" aceita qualquer número de meses, de 1 até o início do histórico (36 no cenário). Acima do limite, o período é cortado e o rodapé explica. Os gráficos mês a mês mostram 24 meses, ou o período inteiro quando ele passa de 24 (`mesesDaJanela` em `src/painel/analise.ts`). A comparação com o ano anterior fica "sem base" quando o período anterior cai antes do histórico, e o rodapé avisa. Foi escolhido o campo numérico, e não uma lista maior, uma barra ou botões de mais e menos, porque mostra o valor exato, cabe na linha do cabeçalho e, no Power BI, vira um parâmetro de "e se" ligado à mesma medida.
- **Mais filtros.** Porte da empresa e situação do CNPJ na Receita, que o motor já aceitava (`sizes` e `rfbStatuses`), num balão ao lado da câmara, para o cabeçalho continuar numa linha.
- **Filtro cruzado.** Clicar num item continua abrindo a lista de empresas (regra de 01/11/2026). Na gaveta, o botão "Filtrar a página por …" aplica o recorte daquele item (município, regional ou câmara) aos filtros do alto, como o filtro cruzado do Power BI. Os blocos passam `recorte` no detalhe que abrem.
- **Recorte visível.** O rodapé mostra os filtros em uso como etiquetas com "x" e conta as empresas com atividade de engenharia (o universo do funil), em vez das 3.000 empresas do cenário.
- **Endereço com filtros.** `#registro?gre=GRE5&cidade=3509502&camara=Civil&meses=24&data=2026-06-30&porte=Grande+empresa&situacao=Baixada`. Com município no endereço, a regional é a dele pela tabela oficial.
- **Exportar.** Cada bloco tem um menu (ícone de download, ao lado do (i)) com "Dados (CSV)" e "Imagem (PNG)". O CSV usa ponto e vírgula, aspas duplas e a marca de ordem de bytes, para o Excel em português abrir direto; o PNG sai do SVG que o ECharts desenha, em dobro de resolução, com o fundo do tema. A gaveta ganhou "Baixar CSV" ao lado de "Copiar lista". Tudo em `src/painel/exportar.ts`. No Power BI, as duas saídas são nativas.
- **Buscar empresa.** Botão no trilho (ou a tecla "/") abre a gaveta com todas as empresas do recorte e o campo de busca em foco; a ficha da empresa abre ao clicar.
- **Impressão.** O botão Imprimir saiu a pedido do Caio (05/11/2026); a impressão pelo navegador (Ctrl+P) continua saindo em paisagem, sem trilho, rodapé e botões.
- **Um só "!"** quando o bloco depende de dois acordos (DETRAN-SP e INMETRO); o título do marcador cita os dois.
- Avaliadas e deixadas para o Power BI: comparar duas GREs lado a lado (quebra a regra de uma tela), comentários por bloco (o serviço do Power BI tem os seus), alerta de meta por e-mail. Favoritar não faz sentido numa página que já cabe numa tela.

### Abas "Responsáveis técnicos e ARTs" e "Sócios, instalações e empregados"

- A meta padrão de responsável técnico passou de 40% para 95% (`metasPadrao.rt` em `src/cockpit/leitura.ts` e `defaultTargets.rtCoverage` em `src/gestao-v14/metrics.ts`). O RT é condição do registro (Lei 5.194/66, art. 8º, parágrafo único), então 40% fazia 78% parecer vitória com 501 empresas sem RT. O complemento do KPI agora diz quantas registradas estão sem RT vigente, e o clique continua abrindo essa lista.
- O complemento do KPI "ARTs de empresas" conta só as empresas ativas na data, para fechar com o KPI "sem ART" e com as barras por câmara; antes contava sobre o escopo inteiro, que inclui empresas que deixaram o registro no período.
- "ARTs mês a mês": a linha do mesmo mês do ano anterior passou a existir em todos os meses. `artsMensais` lê a base inteira (36 meses no cenário) no recorte de empresas do scope, e não só o período de 24 meses; os meses do gráfico seguem `janela.months`, e não uma constante.
- "Responsáveis técnicos" ganhou duas colunas: à esquerda a barra segmentada e a lista com a parte de cada situação ("1.760 · 78%"); à direita o histograma de empresas por RT. O cinza de "Sem vínculo carregado" passou a ser visível nos dois temas. Entrou a linha "RT com registro profissional cancelado ou interrompido", o caso mais claro de irregularidade da aba: `quadroTecnico` (em `src/painel/analise.ts`) recebe o modelo de profissionais e usa `situacaoEm` para contar, entre as empresas com RT, as que têm o profissional do vínculo vigente cancelado ou interrompido. O cenário já tinha esses casos (cerca de 400 empresas), então nada foi criado.
- "ARTs por modalidade" mostra as modalidades com a grafia das câmaras do Conselho ("Segurança do Trabalho", "Mecânica e Metalúrgica", "Geologia e Minas"), só no rótulo exibido; as chaves do domínio não mudaram.
- "Nome com engenharia e diretoria": o centro do anel diz "com engenharia ou agronomia no nome", porque a regra inclui "agronomia" e "engenheiro". A linha de baixo passou a "Das N sem maioria, registradas". No cenário, só cerca de 5% das empresas ficam sem sócio carregado (antes 30%), como no QSA da Receita, em que toda sociedade limitada tem ao menos um administrador.
- "Sócios que são profissionais" virou barras de 100% por qualificação: a porcentagem fica dentro da parte azul e a contagem na segunda linha do rótulo ("Sócio-administrador: 43%, 1.623 de 3.791 são profissionais", no cenário); a legenda diz "Outros sócios pessoa física". As linhas ao lado trazem a unidade (empresas ou sócios), e a de sócio que é RT da própria empresa ficou clicável, abrindo as empresas únicas. O bloco cedeu uma coluna da grade para "Usinas, postos, minas e financiamentos".
- "Usinas, postos, minas e financiamentos" mostra a barra em três tons (registradas no Crea-SP, com atividade de engenharia sem registro, CNPJ fora da lista) e o texto "N com atividade de engenharia · N registradas"; `quadroInstalacoes` passou a devolver as empresas registradas entre os agentes. A ficha deixou de prometer a comparação de 12 meses, que não estava na tela.
- "Empregados técnicos por empresa": legenda "Sem registro (atividade da lista)" no lugar do jargão "universo", e colunas mais largas.
- "Credenciadas no DETRAN-SP e no INMETRO": rótulos curtos, com o órgão como cabeçalho do grupo de atividades no próprio eixo, em vez de "(DETRAN-SP)" em cada linha.
- "Engenharia incluída no contrato social" virou barras empilhadas por desfecho (registradas depois do ato, já registradas antes, sem registro), que agora somam os 509 atos; antes a linha "Registradas depois" era subconjunto da barra e as já registradas não apareciam. O tipo do ato (abertura ou alteração) fica na dica e nas listas, todos os rótulos do eixo aparecem, e o último trimestre é marcado como "em curso": a ficha explica a censura à direita.
- Exportação: todos os blocos das duas abas oferecem "Dados (CSV)" no menu de exportação. Nos gráficos por câmara, o detalhe aberto por clique leva o recorte da câmara, e a gaveta oferece "Filtrar a página por" essa câmara.

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
npm run build:painel   # entrega/painel-presidencia-creasp.html, entrega/painel-empresas-creasp.html e os outros painéis
```

### Evolução mensal em todos os cartões e cenário (05/11/2026, segunda rodada)

Pedido do Caio: tirar o botão Imprimir, pensar em quais indicadores vale ver a evolução mensal e conferir o que não abria a gaveta.

- **Botão Imprimir** saiu do trilho. O Ctrl+P do navegador continua saindo em paisagem, sem trilho, rodapé e botões.
- **Evolução mês a mês em todos os cartões** das três abas com cartões, não só em registradas, entradas e saídas: parte do mercado registrada, atividade obrigatória sem registro, anuidade em dia, abertas na Receita, permanência após 12 meses, emprego formal, empresas com RT, RT que saiu sem substituto, ARTs, valor em ART e registradas sem ART. As séries ficam em `src/domain/series-empresas.ts` (lidas no último dia de cada mês, pelas mesmas regras dos cartões; o teste em `tests/evolucao.test.ts` confere que a série termina no valor do cartão) e em `src/empresas/series.ts`. A exceção é "cadastro incompleto": a pendência não tem data de resolução na base, então a série do passado seria só a das pendências ainda abertas hoje, e o cartão fica sem evolução.
- **Abertas na Receita** passa a contar o período escolhido no alto da tela, como os demais cartões (antes contava a janela de 24 meses do bloco). A série termina no último mês com arquivo da Receita, e as comparações são feitas nele.
- **Gaveta.** Todo cartão abre o painel lateral. Os que não têm lista (parte do mercado, emprego formal, valor em ART) abrem só com a evolução; "Continuam registradas depois de 12 meses" ganhou a lista das que saíram no primeiro ano. Nenhum bloco deixa de abrir a gaveta de propósito: todos os blocos das quatro abas têm clique.
- **Cenário.** Duas tendências irreais apareceram com as séries e foram corrigidas na base de demonstração: o RT entrava em qualquer ponto do histórico (a parte com RT "subia" de 59% para 81% em dois anos) e agora entra até seis meses depois do registro, com reposição de 20 dias a um ano depois da saída (o estoque de "RT que saiu" oscila em vez de só subir); e os boletos venciam até agosto, o que fazia a anuidade em dia "saltar" em setembro, e agora vencem até a data de hoje. A parte com RT passou de 81% para 90%, e as ações de fiscalização por RT caíram, porque a maioria das saídas é reposta.

## Dados abertos do CNPJ (07/11/2026)

As aberturas e baixas na Receita da página Evolução são dado real (07/11/2026). Elas ficaram uma tarde numa página CNPJ própria, que saiu porque repetia o que Registro e Evolução já mostram. O coletor `scripts/receita-cnpj.ts` lê o arquivo mensal da Receita e grava duas coisas:

1. `src/domain/receita-mercado-sp.json`, a contagem por município do IBGE que o painel lê: estabelecimentos ativos com atividade da lista (registro obrigatório e a analisar), por atividade, por porte, por situação, e as aberturas e baixas por mês dos 36 meses até a competência (o mês da competência sai pela metade, porque a Receita gera o arquivo nos primeiros dias dele, e fica fora dos gráficos). Atividades: todas no estado e em cada GRE, e as 20 maiores em cada município. Só números, cerca de 600 KB.
2. Na pasta indicada, `staging/`, quatro CSV para a base interna, todos com a competência na primeira coluna: a situação de todos os estabelecimentos paulistas, os que têm atividade da lista (com o município do IBGE), as empresas deles e os sócios (CPF mascarado como a Receita publica, e o nome normalizado para o casamento com o cadastro). Ficam fora do Git (`.gitignore`).

Na página Evolução, o dado real aparece em três lugares, todos no recorte de GRE e município, até o último mês completo do arquivo:

- o cartão dos abertos na Receita no período, com os baixados embaixo e a evolução dos 35 meses do arquivo;
- a série das abertas no gráfico de ritmo, em soma de 12 meses (o mês sem os 12 meses no arquivo fica vazio);
- o bloco de abertos e baixados mês a mês, com o saldo, ao lado da permanência no cadastro, que continua do cenário.

A Receita não se divide por câmara: com uma câmara escolhida, esses três continuam mostrando todas as atividades da lista. Saiu do HTML a parte das abertas que já se registrou, porque cruzaria o real com o cadastro fictício. No pacote Power BI, a medida continua: em produção, a tabela de estabelecimentos vem do staging da Receita e se cruza com o cadastro real.

Para atualizar, todo mês:

```bash
node --import tsx scripts/receita-cnpj.ts --pasta var/receita/2026-10 --competencia 2026-10 --baixar
```

O `--baixar` lê a lista do mês no compartilhamento público da Receita (arquivos.receitafederal.gov.br) e baixa só o que falta, retomando downloads interrompidos. São cerca de 7,5 GB por mês; os zip são lidos sem descompactar no disco.

Regras:

- O estabelecimento entra quando a atividade principal está na lista de CNAEs do Crea-SP; se não estiver, quando uma secundária está (primeiro as de registro obrigatório, depois as a analisar). Atividade "relacionada" na lista conta como registro obrigatório, e "depende de análise" como a analisar.
- Abertura é a data de início de atividade; baixa é a data da situação cadastral de quem está baixado (suspensos e inaptos não contam, porque podem voltar). A Receita guarda só a situação atual.
- Registro com quebra de linha dentro de um campo é remendado antes da leitura. Falta de qualquer um dos 30 zip de Estabelecimentos, Empresas e Sócios interrompe a coleta, para não gravar contagem parcial.
- O município da Receita tem código próprio. O coletor liga ao código do IBGE pelo nome, com os nomes antigos conhecidos (Embu, Moji Mirim e outros); o que sobrar sem par aparece no log e em `naoLocalizados` no JSON.

O cruzamento com o cadastro do Crea-SP fica na base interna, pelas consultas de `integrations/sql/receita-x-cadastro.sql`: estabelecimentos sem registro (registro obrigatório e, à parte, a analisar), parte do mercado registrada por município, registros por câmara, registradas com CNPJ baixado ou inapto, registradas fora da lista ou fora de SP, sócios que podem ser profissionais e sócio que é responsável técnico da própria empresa. A parte do mercado por câmara depende de uma tabela oficial que ligue cada atividade a uma câmara, que ainda não existe. No painel, o cadastro ainda é o cenário demonstrativo, e misturar o real com o fictício daria número sem sentido. A regra do sócio (nome igual e os seis dígitos visíveis do CPF iguais; com mais de um profissional no par, é homônimo) está em `scripts/integrations/receita.ts`, com teste.


## Empresas sancionadas: CEIS e CNEP (07/11/2026)

A CGU publica todo dia, sem credencial, dois cadastros de sanções: o CEIS, com as empresas inidôneas, suspensas ou impedidas de contratar com a administração, e o CNEP, com as punidas pela Lei Anticorrupção (Lei 12.846/2013). O coletor `scripts/sancoes-cgu.ts` baixa os dois e grava em `var/sancoes`, fora do Git, o `sancoes-pj.csv` para a base interna:

```bash
NODE_USE_ENV_PROXY=1 node --import tsx scripts/sancoes-cgu.ts --data 2026-11-07
```

O `NODE_USE_ENV_PROXY=1` só é preciso atrás de proxy. O arquivo do dia sai no fim da tarde: sem ele, o coletor usa o mais recente dos dez dias anteriores, e cada cadastro pode ficar com um dia diferente. Sem `--data`, vale o dia de hoje em Brasília. Ainda falta agendar a coleta diária na máquina da rede interna. No arquivo de 06/11/2026 havia 16.404 sanções contra empresas, no país inteiro: 9.193 empresas não podiam contratar com alguma parte da administração, 1.845 delas em todas as esferas, e 1.025 tinham sanção do CNEP em vigor.

Regras (`scripts/integrations/sancoes.ts`, com teste):

- Só entra pessoa jurídica. CPF de sancionado não vai para o staging.
- Impede contratar: impedimento ou proibição de contratar (Lei 14.133/2021, art. 156, III, e a proibição da Lei de Improbidade, Lei 8.429/1992, art. 12), inidoneidade (art. 156, IV, e Lei 8.666/1993, art. 87, IV) e suspensão de licitar (Lei 8.666/1993, art. 87, III). A suspensão ou interdição das atividades da Lei Anticorrupção não entra.
- Alcance: vale o que o órgão sancionador informou à CGU (todas as esferas, a esfera do órgão, a esfera e o poder do órgão, só o órgão ou outro órgão). Quando não informou, a inidoneidade vale em todas as esferas (Lei 14.133/2021, art. 156, § 5º), e as outras ficam "sem informação". O informado nunca é trocado pela regra da lei, porque a sanção pode vir de outra lei ou de decisão judicial.
- Em vigor na data: a sanção começou até ela e não terminou antes dela. Sem data final, segue em vigor.

O cruzamento fica na base interna, pelas consultas de `integrations/sql/sancoes-x-cadastro.sql`, pela raiz do CNPJ: empresas registradas com sanção que impede contratar, a contagem por câmara e alcance, as registradas no CNEP e os contratos de SP no PNCP com fornecedor sancionado em todas as esferas na data do contrato. O painel não ganhou página nova: o número entra num bloco das páginas que já existem quando o cadastro real chegar, porque cruzar a sanção real com o cadastro fictício não daria número com sentido.
