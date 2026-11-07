# Painel Financeiro

Painel temático de 07/11/2026. Abre em `/financeiro.html` no site e em `entrega/painel-financeiro-creasp.html` sem servidor. As páginas Receita e Orçamento vieram do painel de Gestão do Conselho, que passou a ser só do colegiado (decisão do Caio em 07/11/2026). O código das páginas fica em `src/financeiro/`.

O painel é para a administração: quanto o Conselho arrecada, o que está vencido e como o orçamento é gasto. Ele cruza a contabilidade com dados públicos (Receita Federal, IBGE, profissionais ativos do Confea e a despesa publicada na Transparência). Os filtros no alto são regional, município, período e data de referência; não há filtro de câmara.

Segue as regras de tela dos outros painéis. Cada página cabe numa tela Full HD (1920×1080) sem rolagem, e os blocos têm larguras diferentes. O bloco mostra só o título e o gráfico; a explicação fica no (i).

Próximo passo: trazer os indicadores do painel de arrecadação que o Crea-SP já usa (meta contra realizado por mês e por tipo, quanto falta para a meta e a média diária necessária, o resumo por dia, os protestos e a adimplência de empresas e profissionais). As telas estão em `referencias/paineis-antigos/` nos arquivos do projeto.

## O que cada página tem

- **Receita.** Receita do Conselho em 12 meses, anuidades vencidas, parte abaixo do piso de execução, anuidades perto de prescrever e quanto da dívida foi recebido. Receita por mês e origem, com a variação contra o mesmo mês do ano anterior. Previsto e realizado acumulados no ano. Anuidades vencidas por idade, abaixo e acima do piso. Cascata do que entrou e saiu da dívida no período. Quanto se recebe depois do vencimento, por safra. Dívida das empresas pela situação do CNPJ na Receita Federal. Mapa dos 645 municípios com a dívida, os devedores ou a parte em atraso.
- **Orçamento e despesa.** Despesa em 12 meses, execução do orçamento do ano, parte em atividades-fim, diárias e contratos vigentes. Execução acumulada mês a mês contra o ano anterior. Atividade-fim e atividade-meio por ano. Despesa por natureza, orçado e realizado. Sede, regionais e despesa de fiscalização por GRE. Diárias por categoria e as dez pessoas que mais receberam. Contratos que terminam nos próximos 12 meses. Os oito maiores fornecedores, pelo nome. Pessoal por função. Despesa publicada por profissional ativo, com dados reais.

## Pacote Power BI

O painel tem pacote Power BI em `entrega/powerbi/financeiro/`, que abre pelo `Financeiro.pbip`: as duas páginas, os cartões com a comparação e a linha de apoio, os gráficos e os gastos com nome. O mapa por município monta-se no Desktop, com o passo no LEIA-ME do pacote. Ver [POWERBI.md](POWERBI.md).

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
- A **anuidade vencida** prescreve em cinco anos (Código Tributário Nacional, art. 174).
- A dívida é estoque e não tem acumulado do ano. Receita, despesa e diárias são fluxos e têm.

## O que foi conferido no cenário

| Ponto | O que havia | O que foi feito |
|---|---|---|
| Mapa da dívida | Só 442 municípios tinham profissionais devedores, e o mapa ficava cinza | O indicador padrão passou a ser o valor vencido de profissionais e empresas, que cobre os 645 municípios |
| Custo por ação de fiscalização | Dava R$ 1,4 milhão por ação, porque as ações do cenário são uma amostra | O custo por ação saiu da tela, e a ficha explica por quê |
| Despesa das GREs | Cada linha de despesa caía inteira numa GRE sorteada | 28% ficam na sede, e o resto se divide entre as GREs pelo porte dos municípios |
| Diárias por pessoa | O mapa de árvore deixava as quatro maiores pessoas pequenas demais para o nome caber | Virou uma faixa de categorias e um ranking das dez pessoas |
