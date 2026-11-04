# Painel de Profissionais

Segundo painel separado do painel geral, de 03/11/2026. Abre em `/profissionais.html` no site e em `entrega/painel-profissionais-creasp.html` sem servidor. As abas Profissionais e Formação saíram do painel geral e vieram para cá, junto com o emprego e o salário em totais e as perícias judiciais. O painel geral tem atalhos no menu lateral para os de Empresas e de Profissionais; os dois temáticos não têm o caminho de volta, porque são entregues sozinhos (pedido de 03/11/2026).

Segue as mesmas regras de tela do painel de Empresas: cada página cabe numa tela Full HD (1920×1080) sem rolagem, os blocos têm larguras diferentes, o bloco mostra só o título e o gráfico e a explicação de leitura fica no (i). Os gráficos variam de tipo. Regional, município, modalidade, gênero, período (3, 6, 12 ou 24 meses) e data de referência ficam numa linha só, no alto da tela, e valem para todas as páginas. No lugar do filtro de câmara, que serve às empresas, este painel tem o filtro de modalidade. A regional aparece como GRE pelo número (GRE 1 a GRE 14), sem nome de cidade. Clicar num elemento abre a lista dos profissionais daquele elemento.

## O que cada página tem

- **Registro.** Cinco indicadores: profissionais com registro ativo, registro interrompido ou cancelado, anuidade em dia (contra a meta), mulheres entre os ativos e ativos com 60 anos ou mais. Mapa do estado com o limite de cada município, cada um pintado pelo próprio valor no indicador escolhido (ativos, variação em um ano, registros novos, anuidade atrasada, mulheres, 60 anos ou mais, ARTs a cada 100 ativos, ativos sem ART, responsáveis técnicos), com as GREs e o valor de cada uma só na lista ao lado. Município com menos de 10 ativos fica sem valor nas partes e taxas. Mapa de árvore por modalidade, cada uma dividida pelos títulos principais (até dois com ao menos 15% dos ativos) e os demais juntos, e Segurança do Trabalho dividida em engenheiro, tecnólogo e técnico (as demais modalidades têm só graduação plena), com a variação em um ano escrita em cada retângulo; clicar num nível ou numa modalidade abre os títulos profissionais dela em barras, com o número e a variação, e clicar num título abre os profissionais. Anel com os registrados em quatro situações (ativo em dia, ativo com anuidade atrasada, interrompido, cancelado). Idade e gênero. Idade em cada modalidade, com a porcentagem em cada célula.
- **Evolução.** Registros novos, voltas, interrupções, cancelamentos e saldo do período (ativos no fim menos ativos no começo). Entradas e saídas mês a mês com o saldo. Ponte dos ativos: quantos eram no começo do período, quem entrou, quem saiu e quantos são agora. Registros novos por modalidade, no período e um ano antes. Quantos continuam ativos, por ano de registro.
- **ART e RT.** ARTs do período, ativos que registraram ART, ARTs a cada 100 ativos, responsáveis técnicos e responsáveis por quatro empresas ou mais. ARTs a cada 100 ativos por modalidade, com a média escrita. ARTs dos últimos 12 meses com o mesmo mês um ano antes. Quantas ARTs cada profissional registra, com a lista dos que mais registraram. Empresas por responsável técnico. Parte dos ativos que registrou ART, por idade e modalidade.
- **Formação.** Formados do último ano acompanhado por inteiro, registro em até 24 meses, ART no último ano e permanência dois anos depois. Formados e quantos se registram, por ano de formatura (os anos que ainda não fecharam 24 meses vêm marcados "em curso"). Registro por instituição de ensino, com a média e a cor da natureza. Formados e registrados, por modalidade. Formados presenciais e a distância, com a parte a distância escrita. Registro em 24 meses cruzando o tipo de instituição (pública ou privada) com o canal (presencial ou a distância); grupo com menos de 50 formados fica sem barra. Turmas das instituições parceiras em até 12 e 24 meses ("!").
- **Trabalho.** Empregos com carteira em ocupações de engenharia, saldo de contratações, salário típico, ocupações com salário típico abaixo do piso e nomeações de peritos ("!"). Emprego mês a mês com admissões e desligamentos. Empregos por ocupação, com o analista de sistemas e o técnico em construção civil como comparação. Salário de cada ocupação em caixas (a metade do meio dos empregos, com hastes de 10% a 90% e a mediana), contra o piso exigível e a leitura do Confea, os dois para 8 horas, com a parte dos empregos abaixo do piso. Saldo de contratações em um ano por regional, com o peso no estoque. Perícias judiciais por especialidade e situação do perito ("!"). Funil da ART das perícias ("!").

Emprego e salário vêm em totais por município e ocupação (Novo CAGED e RAIS públicos), por isso não apontam empresa nem profissional e não provam descumprimento do piso. Com um município escolhido, a série de emprego é a da regional dele.

## Gênero e título profissional (04/11/2026)

O filtro de gênero (mulheres e homens, mulheres, homens) vale para tudo. Nos formados, o Censo da Educação Superior traz o sexo dos concluintes de cada curso. No emprego e no salário, os microdados da RAIS e do Novo CAGED trazem o sexo de cada vínculo; o cenário divide os totais de cada ocupação pela parte das mulheres nela e deixa o salário delas cerca de 12% abaixo do dos homens na mesma ocupação. Nas perícias, com o filtro ligado, só entram as nomeações com o perito localizado no cadastro. O cartão "Mulheres entre os ativos" ignora o filtro de gênero, que o deixaria sempre em 100% ou 0%.

O título profissional segue o Catálogo de Títulos Profissionais do Confea (junho de 2026), pelo código de sete dígitos (grupo, modalidade e nível nos três primeiros). O cenário sorteia o título entre os mais comuns de cada modalidade e nível (lista em `src/domain/titulos.ts`); em produção, o título vem do cadastro. Com isso, o cenário passou a ter técnico e tecnólogo só em Segurança do Trabalho, como no Crea-SP (correção do Caio em 04/11/2026): os técnicos industriais e agrícolas saíram para o CFT e o CFTA em 2018 (Lei nº 13.639/2018), e as demais modalidades têm só títulos de graduação plena (engenheiro, agrônomo, geólogo, geógrafo, meteorologista, agrimensor). Antes, 17% dos registrados de todas as modalidades apareciam como técnicos e todas tinham tecnólogos.

O mapa ficou na proporção real do estado nos três painéis temáticos e no geral: antes, o desenho esticava para encher o bloco.

## Municípios e GREs (04/11/2026)

A GRE de cada município vem da tabela oficial do Crea-SP ("GRE UGI UNIDADE Município", enviada pelo Caio), guardada em `src/domain/gre-municipios.json` pelo código do IBGE: 16 GREs e 645 municípios, com a UGI de cada um. A capital, dividida em zonas na planilha, fica inteira na GRE 5. A lista de municípios com GRE, UGI, população e centro fica em `src/domain/municipios.ts` (`municipiosSp`, `municipioPorId`, `populacaoMunicipio`), e o território de cada GRE no mapa (`src/painel/territorio.ts`) usa a mesma tabela. Antes, o cenário tinha 14 GREs com o nome da cidade-sede, e cada município ia para a sede mais próxima.

Os profissionais do cenário passaram a se espalhar pelos 645 municípios pelo porte de cada um: população aproximada do Censo 2022 para os maiores e um porte sorteado na faixa das cidades pequenas para os demais. Com 4.800 profissionais, 442 municípios têm ativos e 70 têm 10 ou mais; nos outros, as taxas aparecem como poucos dados. Em produção, o município vem do endereço do cadastro e a base inteira preenche o mapa.

## Parcerias e plano B

Dois blocos dependem de acordo e levam o "!". Cada um tem um caminho sem convênio, que aparece na ficha (i):

| Parceria | Bloco | Se o acordo não sair |
|---|---|---|
| TJSP (e os tribunais do trabalho e o federal da região) | Nomeações de peritos, perícias por especialidade, ART das perícias | Ler as nomeações publicadas no Diário da Justiça Eletrônico, pelo nome e pelo número de registro citado. Perde-se o valor dos honorários e parte das nomeações sem registro citado. |
| Instituições de ensino parceiras | Turmas das instituições parceiras, pessoa a pessoa | Comparar o número de formados por curso e instituição do Censo da Educação Superior com os registros novos pela instituição que o profissional declara no pedido. Perde-se o acompanhamento pessoa a pessoa. |

## O que foi conferido no cenário

O cenário é demonstrativo (selo no alto da tela). Antes de entregar, cada página foi conferida no navegador em Full HD, e o que parecia implausível foi tratado como defeito do cenário:

| Ponto | O que havia | O que foi feito |
|---|---|---|
| Registros novos | O sorteio concentrava registros no ano corrente, e os registros novos pareciam dobrar em um ano (+104%) | As datas de registro se espalham por 45 anos, com a base crescendo perto de 3% ao ano. Quem é responsável técnico registrou antes do primeiro vínculo |
| Ocupações | O engenheiro de transportes tinha mais empregos que o engenheiro civil | Cada ocupação tem um peso próximo do real; a civil é a maior das engenharias |
| Peritos | 38% dos peritos nomeados não tinham registro ativo | O perito vem dos ativos em 95% das nomeações, e 88% são identificados no cadastro |
| Atividade dos formados | As turmas de 2016 a 2019 apareciam com 0% de atividade, porque o cenário só tem 36 meses de ARTs | "Atua" passou a ser ter ao menos uma ART nos 12 meses antes da data escolhida |
| Empresas por RT | 62% dos responsáveis técnicos respondiam por duas empresas, porque a base liga 2.400 vínculos a só 1.600 profissionais | Os vínculos se espalham pelos profissionais da mesma modalidade: 72% respondem por uma empresa, 20% por duas, 6% por três e 2% por quatro ou mais |
| Faixas de ARTs | As faixas "11 a 30" e "mais de 30" ficavam vazias | As faixas passaram a ser nenhuma, 1, 2, 3 e 4 ou mais. O cenário tem menos ARTs por profissional que o registro real, e a ficha (i) diz isso |
| Emprego | Admissões e desligamentos sorteados à parte faziam o emprego subir e cair em ondas de mais de 1% ao mês | Os desligamentos acompanham as admissões; o emprego cresce devagar, perto de 2% ao ano |
| Mapa de árvore | A cor da variação positiva se confundia com a borda das modalidades | A escala vai do vermelho ao azul médio, sem o azul-marinho da borda |
| Técnicos e tecnólogos | 17% dos registrados de todas as modalidades eram técnicos, e todas as modalidades tinham tecnólogos | Técnico e tecnólogo só em Segurança do Trabalho (correção do Caio); as demais modalidades têm só graduação plena |
| Municípios | O cenário punha todos os profissionais em 24 cidades, e o mapa ficava quase todo cinza | Os profissionais se espalham pelos 645 municípios pela população; a capital fica com perto de um quarto |
| GREs | 14 GREs, com o município na sede mais próxima | 16 GREs pela tabela oficial do Crea-SP |
| Formadas | Dividir cada turma por gênero com arredondamento criava formadas que não existiam, e o registro delas caía para 9% | A turma se divide pela parte das mulheres entre os formados de cada modalidade; nenhum gênero fica com menos formados que registrados |

## Leitura de cada gráfico

O Caio pediu, no painel de Empresas, para verificar se cada gráfico se entende sem explicação. O critério foi aplicado aqui antes da entrega: a pessoa precisa saber, olhando só o gráfico, o que cada cor e cada tamanho querem dizer e qual é o número que importa. O que não passou foi trocado:

| Gráfico | Problema de leitura | Como ficou |
|---|---|---|
| Registros novos por modalidade e mês (calor) | Só cor, sem número; uma modalidade grande deixava as outras todas iguais | Barras por modalidade: o período escolhido ao lado do mesmo período um ano antes, com o número e a variação |
| Quem mudou de situação (fluxo) | As faixas cruzadas e os nomes "antes" e "agora" pediam explicação | Ponte: ativos no começo, mais registros novos e voltas, menos interrupções e cancelamentos, igual aos ativos de hoje; o saldo é o mesmo do cartão |
| Mapa de árvore por modalidade e nível | Duas leituras ao mesmo tempo (tamanho e cor da variação) e nenhuma legenda | Uma cor por nível, com legenda; a variação vai escrita |
| Anel de situação e anuidade | Dois anéis, o de dentro sem rótulo | Um anel só com quatro situações, todas rotuladas |
| ARTs mês a mês por modalidade | Cinco áreas empilhadas de azuis parecidos e uma linha que só aparecia no segundo ano | Barras dos últimos 12 meses com a linha do mesmo mês um ano antes; a divisão por modalidade fica no bloco ao lado |
| Formados que se registram, atuam e continuam | Duas barras, três linhas e dois eixos | Formados, registrados em 24 meses e a parte registrada; atuação e permanência ficam nos cartões |
| Turmas das instituições parceiras | Quatro barras por ano | Duas barras (até 12 e até 24 meses), com a porcentagem |
| Contratações por regional e ocupação (calor) | Quase todas as células perto de zero | Barras por regional com o saldo e o peso no estoque; o detalhe por ocupação fica no bloco de empregos por ocupação |
| Mapa das regionais | Cada município pintado com a cor da sua regional, e o valor da regional escrito sobre o mapa | Cada município com a própria cor; sobre o mapa, só o nome da GRE, e o valor dela na lista ao lado |
| Títulos dentro do mapa de árvore | Num mapa de árvore, os títulos pequenos ficavam ilegíveis ao lado do engenheiro civil, perto de 80% do grupo | Barras, um título por linha, do maior para o menor |

Depois da entrega, o Caio pediu mais dois ajustes (03/11/2026): o gráfico de canal e natureza, que mostrava quatro barras soltas, passou a cruzar as duas coisas; e o salário por ocupação deixou de ser só a mediana e virou caixas com a distribuição, porque a mediana sozinha esconde quantos ganham abaixo do piso. Em produção, a distribuição vem dos microdados públicos da RAIS e do Novo CAGED, um registro por vínculo sem identificar a pessoa.

Também ganharam legenda ou rótulo o que faltava: a média das ARTs por modalidade, o eixo e as cores do gráfico das instituições e a parte a distância dos formados.

## O que mudou no painel geral

O painel geral perdeu as abas Profissionais e Formação, que agora estão aqui. O texto que citava "a aba Profissionais" passou a citar o painel de Profissionais, página Trabalho.
