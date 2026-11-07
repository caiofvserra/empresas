# Painel de Gestão do Conselho

Quarto painel temático, de 06/11/2026. Abre em `/conselho.html` no site e em `entrega/painel-conselho-creasp.html` sem servidor. As abas Receita, Controle interno, Entidades e Atendimento saíram do painel geral e vieram para cá, refeitas em cinco páginas. O painel geral não vai continuar: cada tema vira um painel próprio, e Presidência e Método esperam o deles.

O painel é para a administração e para o Conselho: plenário, câmaras especializadas e diretoria. Ele cruza a contabilidade e os processos do Conselho com dados públicos (Receita Federal, Censo da Educação Superior, IBGE, profissionais ativos do Confea e a despesa publicada na Transparência).

Segue as regras de tela dos outros painéis. Cada página cabe numa tela Full HD (1920×1080) sem rolagem, e os blocos têm larguras diferentes. O bloco mostra só o título e o gráfico; a explicação fica no (i). Regional, município, câmara, período e data de referência ficam numa linha no alto da tela. A busca e o "Mais filtros" não aparecem, porque não há empresa a procurar.

## O que cada página tem

- **Receita.** Receita do Conselho em 12 meses, anuidades vencidas, parte abaixo do piso de execução, anuidades perto de prescrever e quanto da dívida foi recebido. Receita por mês e origem, com a variação contra o mesmo mês do ano anterior. Previsto e realizado acumulados no ano. Anuidades vencidas por idade, abaixo e acima do piso. Cascata do que entrou e saiu da dívida no período. Quanto se recebe depois do vencimento, por safra. Dívida das empresas pela situação do CNPJ na Receita Federal. Mapa dos 645 municípios com a dívida, os devedores ou a parte em atraso.
- **Orçamento e despesa.** Despesa em 12 meses, execução do orçamento do ano, parte em atividades-fim, diárias e contratos vigentes. Execução acumulada mês a mês contra o ano anterior. Atividade-fim e atividade-meio por ano. Despesa por natureza, orçado e realizado. Sede, regionais e despesa de fiscalização por GRE. Diárias por categoria e as dez pessoas que mais receberam. Contratos que terminam nos próximos 12 meses. Os oito maiores fornecedores, pelo nome. Pessoal por função. Despesa publicada por profissional ativo, com dados reais.
- **Câmaras e plenário.** Processos em julgamento, julgados no período, tempo até o julgamento, autos perto da prescrição e recursos esperando o plenário. Estoque de cada câmara por fase, com quantos processos por sessão. Entradas e julgados por mês, com a linha do estoque. Mapa de calor da idade dos processos. Autos que prescrevem em 12 meses e o valor das multas. Decisões das câmaras nos autos. Cadeiras de cada câmara no plenário contra a parte dos profissionais daquela modalidade.
- **Entidades e escolas.** Organizações registradas, cadeiras no plenário, repasses e instrumentos vigentes. Cadeiras por natureza. Repasses por ano, por natureza ou por canal. Cada escola pelos formados e pela parte que se registrou em até 24 meses (Censo da Educação Superior com o cadastro). Tabela de cada organização.
- **Atendimento.** Prazo de resposta, solicitações, tempo de resposta, profissionais que moram a mais de 50 km de uma unidade e uso dos coworkings. Mapa da distância até a unidade mais próxima em cada município. Solicitações por assunto e situação. Canal do atendimento pela distância. Solicitações por mês. Uso dos coworkings.

## Pacote Power BI

O painel tem pacote Power BI em `entrega/powerbi/conselho/`, que abre pelo `Conselho.pbip`: as cinco páginas, os cartões com a comparação e a linha de apoio, os gráficos e os gastos com nome (a tabela de diárias por beneficiário, os fornecedores e o pessoal por função). Os mapas por município montam-se no Desktop, com o passo no LEIA-ME do pacote. Ver [POWERBI.md](POWERBI.md).

## Gastos com nome

A pedido do Caio, os gastos mostram quem recebe. Na tela ficam os maiores, e a lista inteira abre ao clicar.

| Bloco | Na tela | Ao clicar |
|---|---|---|
| Diárias por beneficiário | Faixa das quatro categorias e as dez pessoas que mais receberam | Cada pessoa da categoria, com cargo, lotação, número de diárias, meses com diária e quilômetros |
| Maiores fornecedores | Os oito maiores pela razão social, com o empenhado e o pago | Os empenhos do fornecedor em 12 meses e o contrato de cada um |
| Pessoal por função | Totais de efetivos, comissionados e custo mensal | Cada servidor da função, ou do quadro inteiro, com cargo, vínculo, lotação e custo do posto |

As listas também saem pelo botão de exportar do bloco. No cenário, os nomes são fictícios e sempre diferentes entre servidores e conselheiros. As diárias de cada pessoa somam exatamente o total da categoria. Em produção, os dados vêm da Transparência do Crea-SP, que já publica nome, cargo, lotação e valor.

## Regras usadas

- O **piso de execução** é cinco vezes a anuidade de pessoa física (Lei 12.514/2011, art. 8º). Em 2026, ele é de R$ 3.585.
- A **prescrição do auto** ocorre cinco anos depois do fato (Lei 9.873/1999, art. 1º).
- A **anuidade vencida** prescreve em cinco anos (Código Tributário Nacional, art. 174).
- Estoques (processos em julgamento, dívida, recursos) não têm acumulado do ano. Fluxos (receita, despesa, diárias, julgados) têm.

## O que foi conferido no cenário

| Ponto | O que havia | O que foi feito |
|---|---|---|
| Mapa da dívida | Só 442 municípios tinham profissionais devedores, e o mapa ficava cinza | O indicador padrão passou a ser o valor vencido de profissionais e empresas, que cobre os 645 municípios |
| Custo por ação de fiscalização | Dava R$ 1,4 milhão por ação, porque as ações do cenário são uma amostra | O custo por ação saiu da tela, e a ficha explica por quê |
| Despesa das GREs | Cada linha de despesa caía inteira numa GRE sorteada | 28% ficam na sede, e o resto se divide entre as GREs pelo porte dos municípios |
| Autos perto da prescrição | Só sete autos | O fato passou a ocorrer de 30 a 720 dias antes da entrada. Agora são 21 autos, e 14 prescreveram no período |
| Diárias por pessoa | O mapa de árvore deixava as quatro maiores pessoas pequenas demais para o nome caber | Virou uma faixa de categorias e um ranking das dez pessoas |
