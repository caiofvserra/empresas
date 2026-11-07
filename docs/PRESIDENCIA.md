# Painel da Presidência

Visão executiva, de 07/11/2026. Substituiu o painel geral. Abre em `/` e em `/presidencia.html` no site, e em `entrega/painel-presidencia-creasp.html` sem servidor. O pacote Power BI está em `entrega/powerbi/presidencia/`.

O painel resume os seis painéis temáticos: Empresas, Profissionais, Fiscalização, Financeiro, Atendimento e Gestão do Conselho. Cada número é o mesmo que o painel de origem mostra no mesmo recorte. O teste `tests/presidencia.test.ts` confere essa igualdade no estado, numa regional, num município e com uma câmara. Clicar num número abre o painel de origem na página certa, com os mesmos filtros.

Decisões do Caio em 07/11/2026:

- o estudo do PNCP (TCC) não entra neste painel nem em nenhum outro;
- o Método não é painel e virou o documento [METODO.md](METODO.md);
- o Resumo traz mais de um número por painel;
- o filtro de câmara entra.

Segue as regras de tela dos outros painéis. Cada página cabe numa tela Full HD (1920×1080) sem rolagem, e também em 1366×768. Os blocos têm larguras diferentes. Todo gráfico se lê sem passar o mouse, e o (i) de cada bloco explica o cálculo.

## Filtros

Os filtros do alto são a regional, o município, a câmara, o período e a data de referência.

- Os indicadores que o painel de origem conhece por município somam os municípios do recorte.
- As contagens de empresas, que o painel de Empresas só conhece por regional, seguem a regional do município escolhido.
- Os protocolos de atendimento seguem o município de quem pediu, como no painel de Atendimento.
- A receita, o orçamento e os contratos são os reais da Transparência, do Conselho inteiro, como no painel Financeiro.
- A câmara só vale para os indicadores que o painel de origem divide por câmara:
  - nas empresas e na fiscalização, pela câmara da empresa;
  - nos profissionais, pela modalidade;
  - nos processos, pelo colegiado.
- A dívida de anuidades e os protocolos de atendimento ficam do Conselho inteiro com qualquer câmara, e o bloco avisa.

## O que cada página tem

- **Resumo.** Um quadro para cada painel. Cada quadro tem:
  - o número principal, com a variação em um ano e a meta;
  - a linha dos 13 meses até a data;
  - os outros números do painel, cada um com a variação.

  Os números de cada painel:

  | Painel | Principal | Outros |
  |---|---|---|
  | Empresas | parte do mercado registrada (meta 65%) | empresas registradas; empresas com responsável técnico (meta 95%); ARTs de empresas |
  | Profissionais | profissionais com registro ativo | registros novos; anuidade em dia (meta 60%); ARTs de profissionais |
  | Fiscalização | ações que terminaram em regularização (meta 50%) | ações de fiscalização; autos de infração; multas aplicadas |
  | Financeiro | receita do Conselho | anuidades vencidas; dívida perto de prescrever; orçamento de despesa executado no ano |
  | Atendimento | protocolos fechados no prazo (meta 80%) | protocolos abertos; protocolos na fila e fora do prazo |
  | Gestão do Conselho | processos esperando voto | processos em alerta vermelho; autos perto da prescrição; processos votados |

  Embaixo, três blocos:
  - as regionais contra a meta, em cada taxa com meta;
  - os destaques do período;
  - os quatro indicadores do programa.
- **Regionais.** Seis cartões:
  - quantas regionais estão na meta de mercado;
  - a regional com mais processos esperando voto;
  - a regional com mais anuidades vencidas;
  - a regional com menos protocolos fechados no prazo;
  - a regional com menos regularização;
  - a regional com a maior alta de profissionais.

  Blocos:
  - o mapa por município, com o indicador à escolha;
  - o quadro com cada regional em todos os assuntos, verde na meta e vermelho fora dela;
  - o que mudou em um ano em cada regional.
- **Riscos.** Cartões:
  - dívida perto de prescrever;
  - autos perto da prescrição;
  - processos em alerta vermelho;
  - protocolos na fila e fora do prazo;
  - execução do orçamento do ano (real, da Transparência);
  - contratos que terminam em 90 dias (reais, da Transparência).

  Blocos:
  - o que vence em cada um dos próximos 12 meses;
  - os 12 prazos mais próximos, com o nome;
  - a dívida perto de prescrever por regional;
  - a fila de cada colegiado pelo tempo no status;
  - a receita e a despesa do ano contra o orçado (reais, da Transparência).
- **No país.** Só dados públicos reais, com o selo "Real":
  - o Crea-SP ao lado dos outros Creas (Confea e IBGE);
  - a receita e a despesa publicadas desde 2013;
  - as maiores contas de receita;
  - os registros novos por ano.

  Os filtros do alto não mudam esta página.

## Como os números são calculados

A foto (`src/domain/presidencia.ts`) lê a base como estava em cada data e guarda cada indicador em partes: o numerador e o denominador. As partes ficam pelo lugar que o painel de origem conhece (município, regional ou estado) e pela câmara. A regional é a soma dos seus municípios, e a taxa sai da soma das partes. As contagens de empresas não se somam entre lugares, porque a empresa com estabelecimentos em mais de um lugar conta em cada um, como no painel de Empresas. Por isso elas são calculadas para o estado e para cada regional.

O painel calcula 13 fotos: a data escolhida e o fim de cada um dos 12 meses anteriores. Cada uma leva de dois a quatro segundos. A da data e a de um ano antes vêm primeiro, e as outras aparecem aos poucos.

## Power BI

O pacote tem as mesmas quatro páginas e lê a mesma foto, gravada em `foto.csv`. As medidas [Numerador] e [Denominador] leem a foto com a regra de `recortar`. O teste `tests/powerbi-presidencia.test.ts` confere a leitura com o HTML em dez recortes.

A foto usa o período padrão de 12 meses. O mapa por município e a lista nominal de prazos ficam no HTML; o LEIA-ME do pacote diz como montar o mapa no Desktop.

```bash
npm run build:painel   # entrega/painel-presidencia-creasp.html e os outros painéis
npm run build:powerbi  # entrega/powerbi/presidencia/ e os outros pacotes
npm run docs:metodo    # docs/METODO.md
```
