# Painel de Atendimento

Painel temático de 07/11/2026. Abre em `/atendimento.html` no site e em `entrega/painel-atendimento-creasp.html` sem servidor. Veio do painel de Gestão do Conselho, que passou a ser só do colegiado (decisão do Caio em 07/11/2026), e foi refeito no mesmo dia a partir do painel de protocolos que o Crea-SP já usa (a tela está em `referencias/paineis-antigos/` nos arquivos do projeto). O código fica em `src/atendimento/`, e a regra, em `src/domain/atendimento.ts`.

Os filtros no alto são regional, município, tipo de serviço, unidade de atendimento, período e data de referência. A regional e o município são os de quem pediu. Segue as regras de tela dos outros painéis: cada página cabe numa tela Full HD (1920×1080) e em 1366×768 sem rolagem, os blocos têm larguras diferentes, e a explicação fica no (i).

## A regra

- Cada protocolo é um pedido de um serviço da Carta de Serviços (o subtipo), com um prazo em dias úteis. O prazo conta só enquanto o protocolo está com o Crea-SP: o tempo em exigência, com o solicitante, não entra. Em exigência, o solicitante tem 30 dias corridos para responder.
- O caminho do protocolo é uma lista de status com a data e o colaborador. Os status se juntam nas cinco situações do painel antigo: aberto, exigência, sem pagamento, cancelado e fechado.
- Como no painel antigo, as páginas contam os protocolos abertos no período, cada um com a situação na data escolhida. "Fechados no prazo" é a parte dos fechados que fecharam dentro do prazo do serviço; a meta padrão é 80%.
- Dias úteis tiram sábado, domingo, os feriados nacionais (com o 20 de novembro) e a Sexta-feira Santa.
- Os protocolos saem da base inteira e são lidos na data: o protocolo aberto antes da data existe nela, ainda que o registro que ele pede só entre no cadastro depois.

## As páginas

- **Protocolos.** Fechados no prazo (com a meta), abertos no período, tempo típico até fechar, em andamento, em exigência e sem pagamento. Situação contra o prazo em cada status. Protocolos por mês pela situação, com o mesmo mês um ano antes. Cada serviço contra o seu prazo (tabela). Os motivos de exigência mais comuns.
- **Equipe e território.** Na fila e fora do prazo, fechados por colaborador, sem atribuição, a maior fila de uma pessoa (com o nome), profissionais a mais de 50 km da unidade e ocupação dos coworkings. Com quem estão os protocolos, pelo nome. Os 645 municípios no mapa (protocolos, por 1.000 profissionais, fechados no prazo ou distância). Fechados no prazo por regional e trimestre. Canal pela distância até a unidade. Uso dos coworkings mês a mês.
- **Demanda.** Previsão dos próximos três meses (o mesmo mês um ano antes, corrigido pela tendência dos 12 meses), empresas novas na Receita que pediram registro, formados do ano anterior já registrados (INEP), protocolos de ART por 1.000 ARTs e pedidos de informação (LAI) com a ouvidoria.

## Pacote Power BI

O painel tem pacote Power BI em `entrega/powerbi/atendimento/`, que abre pelo `Atendimento.pbip`, com as três páginas. O mapa dos 645 municípios, as cores pela meta e o tamanho das listas montam-se no Desktop, com o passo no LEIA-ME do pacote. Ver [POWERBI.md](POWERBI.md).
