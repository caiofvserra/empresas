# Painel Financeiro

Painel temático de 07/11/2026. Abre em `/financeiro.html` no site e em `entrega/painel-financeiro-creasp.html` sem servidor. O código das páginas fica em `src/financeiro/`, as regras de cálculo em `src/domain/financeiro.ts` e o pacote Power BI em `src/powerbi/financeiro/`.

O painel é para a administração e para o plenário: quanto o Conselho arrecada contra a meta, de onde vem a receita, o que está vencido e como o orçamento é gasto. É só financeiro: o colegiado fica no painel de Gestão do Conselho e o atendimento no painel de Atendimento (decisão do Caio em 07/11/2026). Os filtros no alto são regional, município, período e data de referência.

Segue as regras de tela dos outros painéis. Cada página cabe numa tela sem rolagem, em 1920×1080 e em 1366×768, no tema claro e no escuro. Os blocos têm larguras diferentes, os gráficos têm rótulos para ler sem passar o mouse e a explicação fica no (i).

## De onde vêm os números

As decisões do Caio em 07/11/2026: dado real onde a Transparência do Crea-SP publica; o cenário de demonstração só para o que é interno do CreaNet.

| Dado | Origem | Alcance |
|---|---|---|
| Receita por mês e tipo desde 2013, despesa por grupo, orçamento inicial e reformulado de cada ano | Real: Transparência do Crea-SP (`npm run coletar:financeiro`, arquivo `public/data/transparencia/financeiro-crea-sp.json`) | Estado inteiro |
| Diárias, jetons e deslocamento pelo nome de quem recebeu, pagamentos a fornecedores pela razão social e contratos com a vigência | Real, da mesma coleta. O CPF não é gravado | Estado inteiro |
| Divisão da arrecadação pelos dias úteis e pelos municípios | Cenário. Em produção, a baixa de cada boleto no CreaNet | Segue a regional e o município |
| Dívida de anuidade, protestos e adimplência | Cenário. Em produção, o CreaNet | Segue a regional e o município |

Os blocos reais dizem "estado inteiro" e não mudam com a regional ou o município. A arrecadação de um recorte é a do estado vezes a parte do recorte no peso de cada tipo de receita (`pesosDaArrecadacao`): anuidades pelos profissionais ativos, ART pelos estabelecimentos e por um terço dos ativos, dívida ativa pelo valor vencido, multas pelas ações de fiscalização, serviços como as anuidades. Todo município tem peso, para nenhum sumir do mapa.

A **meta** de cada mês é a receita orçada reformulada do ano, dividida no ritmo do ano anterior, tipo a tipo (`metaMensal`). Vale até a TI informar a meta oficial.

## O que cada página tem

- **Arrecadação.** Arrecadado no mês e no ano contra a meta, quanto falta, a média diária necessária nos dias úteis que restam e a projeção do mês no ritmo atual. O mês dia a dia, com o acumulado e a meta acumulada. Meta e realizado em cada mês do ano, com o mesmo mês do ano anterior. Calendário do mês, com a cor pelo arrecadado em cada dia. Cada tipo de receita no mês e no ano, contra o ano anterior. Mapa dos 645 municípios.
- **Receita.** Receita no período, parte da ART, anuidades, dívida ativa recebida e receita por profissional ativo. Receita de cada ano desde 2013, por tipo, com a parte da ART. Receita de cada mês, ano a ano, com a cor pela média do próprio ano. Receita mês a mês. Orçado e realizado no ano, tipo a tipo.
- **Dívida e cobrança.** Anuidades vencidas, parte abaixo do piso de execução, perto de prescrever, recebido da dívida e profissionais em dia. Mapa da dívida por município. Anuidades vencidas por idade, abaixo e acima do piso. O que entrou e saiu da dívida no período. Quanto se recebe depois do vencimento. Protestos por categoria. Quem está em dia, profissionais e empresas. Dívida das empresas pela situação do CNPJ na Receita Federal.
- **Orçamento e despesa.** Despesa no período, execução do orçamento do ano, receita menos despesa, diárias e deslocamento e contratos vigentes. Execução acumulada mês a mês contra o ritmo do orçado e o ano anterior. Em que o Conselho gasta, grupo a grupo, orçado e realizado. Receita, despesa e resultado desde 2013. Quem recebe diárias, pelo nome. Maiores fornecedores. Contratos a vencer. Despesa e receita por profissional ativo no último ano fechado.

## Gastos com nome

A pedido do Caio, os gastos mostram quem recebe, como a Transparência publica. Na tela ficam os maiores; a lista inteira abre ao clicar e sai pelo botão de exportar.

| Bloco | Na tela | Ao clicar |
|---|---|---|
| Quem recebe diárias | As pessoas que mais receberam no período, com a categoria | Cada mês com diária da pessoa, com o valor e o número de pagamentos |
| Maiores fornecedores | Os maiores pela razão social, com o objeto e o pago | O pago em cada mês do período |
| Contratos a vencer | Quantos contratos vigentes terminam em cada um dos 12 meses seguintes | Os contratos do mês, com o número, a contratada, o CNPJ e a vigência |

## Regras usadas

- O **piso de execução** é cinco vezes a anuidade de pessoa física (Lei 12.514/2011, art. 8º).
- A **anuidade vencida** prescreve em cinco anos (Código Tributário Nacional, art. 174). "Perto de prescrever" é a vencida há mais de quatro anos.
- Vai a **protesto** o devedor acima do piso com anuidade vencida há um ano ou mais. As outras categorias de protesto seguem a proporção do painel de arrecadação em uso no Crea-SP.
- A dívida e a adimplência são estoque: leem a foto da data e comparam com o mesmo mês do ano anterior. Receita, despesa e diárias são fluxos: somam o período e comparam com o mesmo período um ano antes.
- Os **dias úteis** descontam fins de semana e feriados nacionais, de São Paulo e móveis (`diasUteis`).

## Pacote Power BI

O painel tem pacote próprio em `entrega/powerbi/financeiro/`, que abre pelo `Financeiro.pbip`: as quatro páginas, os cartões com a comparação e a linha de apoio, os gráficos, as matrizes de calor e as tabelas com nome. O modelo leva a receita, a despesa, o orçamento, a meta, as diárias, os pagamentos e os contratos reais, e a arrecadação por dia, os pesos por município, os títulos e as fotos da dívida e da adimplência do cenário. Os mapas por município montam-se no Desktop, com o passo no LEIA-ME do pacote. Ficam só no HTML as curvas de quanto se recebe depois do vencimento e a adimplência das empresas. `tests/powerbi-financeiro.test.ts` refaz cada cartão a partir dos CSV pela regra da medida DAX e confere com o painel. Ver [POWERBI.md](POWERBI.md).
