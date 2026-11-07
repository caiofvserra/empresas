# Painel de Gestão do Conselho

Quarto painel temático, de 06/11/2026, refeito em 07/11/2026. Abre em `/conselho.html` no site e em `entrega/painel-conselho-creasp.html` sem servidor.

O painel é só do colegiado: conselheiros, câmaras, Plenário e processos. Receita e Orçamento estão no [painel Financeiro](FINANCEIRO.md), e Atendimento tem [painel próprio](ATENDIMENTO.md). A versão de 07/11/2026 parte de duas fontes:

- as telas do painel de conselho que o Crea-SP começou e não usou: relator, fase, dias na fase, terços do mandato e posse dos processos;
- o fluxo real do processo de infração na SUPCOL. O GovAdm guarda a abertura, o recebimento, os prazos e o trânsito em julgado. O Votenet guarda a tramitação no colegiado. Os marcos do Confea são o tempo da abertura à decisão e os pendentes de exercícios anteriores.

Segue as regras de tela dos outros painéis. Cada página cabe numa tela Full HD (1920×1080) sem rolagem, e os blocos têm larguras diferentes. O bloco mostra só o título e o gráfico, e a explicação fica no (i). Quem está com um processo, quem relatou, quem recebeu diária e quem propôs um repasse aparecem com o nome; a lista completa abre ao clicar.

## Filtros

Os filtros do alto são a regional, o município, o colegiado (o Plenário ou uma das nove câmaras), o período e a data de referência.

- O colegiado recorta os processos e os conselheiros.
- A regional e o município recortam só os processos, pelo lugar do processo. O conselheiro representa uma modalidade, e não uma regional.
- Com o Plenário escolhido, os processos são os recursos, e as decisões são as dos autos que chegaram a ele.

## O que cada página tem

- **Colegiado.** Seis cartões:
  - conselheiros em exercício;
  - processos esperando voto;
  - processos por conselheiro;
  - votados no período;
  - tempo da abertura à decisão;
  - pendentes de exercícios anteriores.

  Blocos:
  - com quem estão os processos: as dez pessoas com mais processos, conselheiros e funcionários, pelo alerta, e a lista de todas ao clicar;
  - o status do Votenet;
  - os terços do mandato por entidade e escola;
  - pautados e votados por mês contra um ano antes;
  - o caminho do recebimento à multa paga.
- **Processos.** Cartões:
  - processos em alerta vermelho;
  - processos há mais de um ano no colegiado;
  - autos perto da prescrição;
  - processos parados há mais de dois anos;
  - tempo do GovAdm ao Votenet.

  Blocos:
  - a fila nominal, do mais parado ao menos, com o alerta;
  - o mapa de calor de status por dias no status;
  - os autos perto da prescrição por relator;
  - o tempo entre o recebimento no GovAdm e o cadastro no Votenet.
- **Conselheiros.** Cartões:
  - presença nas sessões;
  - tempo de relato;
  - relato com IA contra sem IA;
  - pedidos de vista;
  - diárias dos conselheiros.

  Blocos:
  - cada conselheiro pela carga e pelo tempo de relato;
  - a menor presença;
  - as diárias por nome;
  - o relato com e sem IA por trimestre;
  - vista, impedimento e diligência por colegiado.
- **Decisões.** Cartões:
  - autos votados nas câmaras;
  - multas aplicadas;
  - autos arquivados;
  - recursos esperando o Plenário;
  - decisões reformadas pelo Plenário.

  Blocos:
  - o desfecho por câmara: multa, reduzida, em dobro, suspensão ou arquivamento;
  - as multas por alínea do art. 73;
  - o que o Plenário mantém ou reforma;
  - o que aconteceu com as multas de cada ano: paga, em cobrança, em recurso ou anulada.
- **Representação.** Cartões:
  - cadeiras ocupadas;
  - conselheiras;
  - repasses a quem tem cadeira;
  - deliberações de repasse;
  - deliberações propostas pela própria organização.

  Blocos:
  - cadeiras contra profissionais de cada câmara;
  - mulheres no Conselho e no registro;
  - organizações com cadeira e o que receberam;
  - as deliberações das atas.

## Pacote Power BI

O painel tem pacote Power BI em `entrega/powerbi/conselho/`, que abre pelo `Conselho.pbip`, com as cinco páginas e os mesmos cartões. Os CSV saem da mesma base das páginas, e o teste confere os números com o painel, sem recorte e com o colegiado e a regional escolhidos. O que muda no Power BI:

- o gráfico de dispersão da carga e do tempo de relato vira uma tabela com os processos e a presença de cada conselheiro;
- as dez pessoas com mais processos e os dez com menor presença se escolhem com o filtro N superior do visual, como diz o LEIA-ME.

Ver [POWERBI.md](POWERBI.md).

## Regras usadas

- **Alerta da fila (decisão do Caio, 07/11/2026).** É amarelo de 90 a 120 dias no mesmo status do Votenet e vermelho acima de 120. Os dias desde a entrada acendem acima de um ano.
- **Prescrição do auto.** O prazo é de cinco anos do fato (Lei 9.873/1999, art. 1º). Com o processo parado três anos no mesmo status, vale a prescrição intercorrente (art. 1º, § 1º). Conta a que vier primeiro. A decisão da câmara interrompe a de cinco anos, e no Plenário só corre a intercorrente.
- **Multa em dobro.** Vale na reincidência: a empresa já tinha multa aplicada antes da entrada do auto (Lei 5.194/66, art. 73, parágrafo único).
- **Fim do mandato.** O processo vai a outro conselheiro do mesmo colegiado no primeiro dia do mandato seguinte.
- **Estoque e fluxo.** Processos esperando voto, recursos e pendentes são estoques e não têm acumulado do ano. Votados, multas e deliberações são fluxos.

## Fontes em produção

O GovAdm entrega:

- o Relatório de Processos, com o responsável, o cargo e a fase;
- a abertura, o recebimento, os prazos e o trânsito em julgado.

O Votenet entrega:

- o status, o relator, o relato, a pauta e o voto;
- os PDFs das decisões, com a penalidade, a alínea e a multa.

As outras fontes são:

- a composição publicada pelo Conselho;
- as atas das sessões, com a presença e as deliberações;
- a contabilidade, com as diárias, os repasses e o pagamento das multas.

A API de transparência ainda não publica conselheiros nem atas. Até lá, o jeton pago serve de aproximação da presença.

### Cópia diária do relatório do GovAdm (07/11/2026)

O Relatório de Processos do GovAdm mostra só a fase de hoje. Para saber há quantos dias cada processo está na fase, é preciso guardar uma cópia por dia e ver quando a fase mudou. Isso é feito em dois passos, todos os dias, na máquina que já roda o extracao-govadm:

```bat
.venv\Scripts\python main.py diario
node --import tsx C:\caminho\empresas\scripts\govadm-diario.ts --pasta C:\caminho\extracao-govadm\saida
```

O primeiro passo baixa o relatório das nove câmaras e grava `saida\relatorio_processos_AAAAMMDD_HHMM_limpo.csv`. O segundo lê as cópias de dias que ainda não entraram no histórico e grava em `var/govadm`, fora do Git:

- `historico.json`: os períodos de cada processo em cada fase e lotação, com o início e o fim de cada um, e as lotações que vieram em cada cópia;
- `dias-na-fase.csv`: cada processo na fase atual, com os dias, o responsável e o cargo, para a base interna e o Power BI;
- `fases-AAAA-MM-DD.csv`: o quadro do dia por câmara e fase, com o número de processos, a mediana de dias, quantos passam de 90 dias e quantos têm início desconhecido. Só números.

Regras (`scripts/integrations/govadm.ts`, com teste):

- O período começa no dia da cópia em que a fase ou a lotação mudou. Trocar só o responsável não reinicia a contagem.
- Na primeira cópia, ninguém sabe desde quando o processo está na fase: os dias contam a partir dela e o período fica marcado como "início desconhecido", o que quer dizer "pelo menos esses dias". A marca some à medida que os processos mudam de fase.
- Processo que sai do relatório (arquivado ou fora das câmaras) fecha o período no dia da cópia. Se a câmara dele faltou na extração, nada fecha: o processo segue na fase, e o script avisa quais câmaras faltaram. Processo que some numa cópia e volta igual na seguinte não perde os dias.
- Os arquivados ficam de fora, como no extracao-govadm.
- Cada dia entra uma vez, com o último arquivo do dia. Cópia de um dia anterior à última registrada é ignorada, com aviso: o histórico só anda para a frente. Sem cópia num dia (feriado, falha), a mudança entra no dia seguinte, com um dia de imprecisão.
- O histórico é gravado a cada dia lido, e um arquivo com problema não desfaz os dias anteriores.
- As 17 fases do GovAdm ficam como vêm. Juntar em quatro fatias (Manifestação, Pauta, Em Posse, P/ Análise) é decisão da SUPCOL, pendente no `config.toml` do extracao-govadm.

O painel ainda não tem bloco de dias na fase: o cenário demonstrativo do Conselho só tem o status do Votenet. O bloco entra quando a base interna receber `dias-na-fase.csv`, depois de duas conferências: se o número do processo no GovAdm é o mesmo do SEI, e as siglas das câmaras nas duas fontes (CEEAS e CAGE aparecem de jeitos diferentes).

## O que foi conferido no cenário

| Ponto | O que havia | O que foi feito |
|---|---|---|
| Relatoria | Uma cauda de até 1.900 dias deixava 34 processos parados há mais de três anos, já prescritos pela intercorrente | A cauda vai até 1.070 dias. Ficam 15 processos parados há mais de dois anos, perto da intercorrente |
| Autos perto da prescrição | Com a cauda menor, só 6 autos | O fato passa a ocorrer até 540 dias antes da entrada em 80% dos autos e até 1.200 dias nos outros 20%. Agora 17 autos prescrevem em até 12 meses |
| Relator com mandato vencido | Processos ficavam com quem já tinha saído do Conselho | O processo é redistribuído no fim do mandato |
| Conselheiras | Metade dos conselheiros eram mulheres | Cerca de 17%, abaixo dos 23% do registro |
