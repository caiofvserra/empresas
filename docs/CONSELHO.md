# Painel de Gestão do Conselho

Quarto painel temático, de 06/11/2026. Abre em `/conselho.html` no site e em `entrega/painel-conselho-creasp.html` sem servidor.

Em 07/11/2026 o Caio decidiu que o painel é só do colegiado: conselheiros, câmaras, Plenário e processos. Receita e Orçamento foram para o [painel Financeiro](FINANCEIRO.md), e Atendimento ganhou [painel próprio](ATENDIMENTO.md). O painel está sendo reconstruído a partir das telas do painel de conselho que o Crea-SP começou e não usou, e do fluxo real do processo de infração (GovAdm e Votenet). Até lá, ficam as duas páginas abaixo.

Segue as regras de tela dos outros painéis. Cada página cabe numa tela Full HD (1920×1080) sem rolagem, e os blocos têm larguras diferentes. O bloco mostra só o título e o gráfico; a explicação fica no (i).

## O que cada página tem

- **Câmaras e plenário.** Processos em julgamento, julgados no período, tempo até o julgamento, autos perto da prescrição e recursos esperando o plenário. Estoque de cada câmara por fase, com quantos processos por sessão. Entradas e julgados por mês, com a linha do estoque. Mapa de calor da idade dos processos. Autos que prescrevem em 12 meses e o valor das multas. Decisões das câmaras nos autos. Cadeiras de cada câmara no plenário contra a parte dos profissionais daquela modalidade.
- **Entidades e escolas.** Organizações registradas, cadeiras no plenário, repasses e instrumentos vigentes. Cadeiras por natureza. Repasses por ano, por natureza ou por canal. Cada escola pelos formados e pela parte que se registrou em até 24 meses (Censo da Educação Superior com o cadastro). Tabela de cada organização.

## Pacote Power BI

O painel tem pacote Power BI em `entrega/powerbi/conselho/`, que abre pelo `Conselho.pbip`: as duas páginas, os cartões com a comparação e a linha de apoio e os gráficos. Ver [POWERBI.md](POWERBI.md).

## Regras usadas

- A **prescrição do auto** ocorre cinco anos depois do fato (Lei 9.873/1999, art. 1º).
- Processos em julgamento e recursos são estoques e não têm acumulado do ano. Os julgados são fluxo e têm.

## O que foi conferido no cenário

| Ponto | O que havia | O que foi feito |
|---|---|---|
| Autos perto da prescrição | Só sete autos | O fato passou a ocorrer de 30 a 720 dias antes da entrada. Agora são 21 autos, e 14 prescreveram no período |
