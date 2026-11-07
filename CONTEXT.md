# Inteligência Estratégica Crea-SP

Painéis de dados estratégicos do Crea-SP, prototipados aqui e implementados depois no Power BI. Este arquivo é só o glossário: os nomes que valem no código, nos textos e nas conversas.

## Painéis e telas

**Painel**:
Conjunto de páginas para um público e uma regra de acesso (Empresas, Profissionais e formação, Fiscalização e malha fina, Financeiro, Atendimento, Gestão do Conselho, Presidência). O de Gestão do Conselho é só do colegiado: conselheiros, câmaras, Plenário e processos. No Power BI, cada painel é um relatório com o seu próprio modelo.
_Avoid_: dashboard, aba, relatório (quando se fala do protótipo)

**Página**:
Uma tela de um painel, que cabe num monitor Full HD sem rolagem.
_Avoid_: aba, tela, guia

**Bloco**:
Unidade visual de uma página, com título, gráfico e ficha (i).
_Avoid_: widget, visual, card

**Cartão**:
Bloco que mostra um único número, uma comparação embaixo dele e uma linha de apoio. A comparação é contra o mesmo mês do ano anterior; a parte do mercado registrada e o RT comparam com a meta, e o emprego formal com o primeiro mês do gráfico.
_Avoid_: KPI, indicador (quando se fala do bloco)

**Ficha (i)**:
Texto de apoio de um bloco: como o número é calculado e o cuidado de leitura.
_Avoid_: tooltip, legenda, nota

**Pacote Power BI**:
O conjunto de arquivos que leva um painel do protótipo para o Power BI: tabelas, medidas, tema e projeto. Existe um por painel.
_Avoid_: exportação, pbix, template

## Filtros e tempo

**Recorte**:
A combinação de filtros em uso (regional, município, câmara, porte, situação na Receita) que vale para todas as páginas.
_Avoid_: filtro (quando se fala do conjunto), escopo, seleção

**Data de referência**:
O dia em que a base é lida, como ela estava naquele dia.
_Avoid_: D, snapshot, data base

**Período**:
Número de meses, contados para trás a partir da data de referência, em que os fluxos são somados.
_Avoid_: janela, intervalo

**Estoque**:
Indicador que é a situação num dia (registradas, RT que saiu sem substituto, sem registro). Nunca tem acumulado do ano.
_Avoid_: saldo, total

**Fluxo**:
Indicador que soma o que aconteceu num intervalo (entradas, saídas, ARTs, valor em ART). Só ele tem acumulado do ano.
_Avoid_: movimento, volume

**Foto**:
A situação de cada empresa (ou estabelecimento) no último dia de um mês, gravada uma vez e nunca reescrita. Estoques e taxas do pacote Power BI são contados nela.
_Avoid_: snapshot, retrato

**Índice (primeiro mês = 100)**:
Uma série dividida pelo seu primeiro mês no gráfico, vezes 100, para comparar o ritmo de séries com unidades diferentes (emprego, crédito, aberturas, registros).
_Avoid_: taxa, número-índice

**Taxa**:
Parte de um estoque sobre outro, lida no mesmo dia (parte do mercado registrada, anuidade em dia, com RT).
_Avoid_: índice, percentual, cobertura (no texto visível)

## Cadastro

**Empresa**:
A pessoa jurídica identificada pela raiz do CNPJ (oito primeiros dígitos).
_Avoid_: empresa-raiz no texto visível, CNPJ, cliente

**Estabelecimento**:
Uma unidade da empresa, identificada pelo CNPJ completo (matriz ou filial).
_Avoid_: unidade, filial (quando inclui a matriz)

**Registro**:
Inscrição de uma empresa com sede em São Paulo no Crea-SP.
_Avoid_: cadastro, inscrição

**Visto**:
Autorização para uma empresa registrada em outro Crea atuar em São Paulo.
_Avoid_: registro secundário

**Mercado**:
Os estabelecimentos ativos na Receita cuja atividade (CNAE) está na lista do Crea-SP.
_Avoid_: universo, população

**Responsável técnico (RT)**:
Profissional habilitado com vínculo vigente que responde tecnicamente pela empresa.
_Avoid_: técnico responsável, RT ativo

**Regional (GRE)**:
Uma das 16 gerências regionais do Crea-SP. O município pertence a ela pela tabela oficial, escrita "GRE N".
_Avoid_: UGI, regional com nome de cidade

**Câmara**:
Uma das nove câmaras especializadas do Crea-SP, com o nome do sistema do Conselho. A câmara de uma empresa é estimada pela atividade principal.
_Avoid_: modalidade (quando se fala da empresa)

**Empresa sancionada**:
Empresa com sanção em vigor no CEIS ou no CNEP da CGU, pela raiz do CNPJ. A sanção que impede contratar (impedimento, inidoneidade, suspensão de licitar) tem um alcance: todas as esferas, a esfera do órgão que puniu ou só o órgão.
_Avoid_: inidônea (quando a sanção é outra), empresa punida, lista suja

## Dados

**Cenário de demonstração**:
A base fictícia e determinística que alimenta o protótipo e o pacote Power BI até a base real chegar.
_Avoid_: mock, dados de teste, fake

**Parceria ("!")**:
Fonte que depende de acordo com outro órgão. O bloco que a usa entra demonstrativo e com o marcador "!", e tem um plano B sem acordo.
_Avoid_: convênio (quando ainda não existe), fonte externa

## Gestão do Conselho

**Colegiado**:
Quem vota os processos: o Plenário ou uma das nove câmaras especializadas. É o filtro do alto do painel de Gestão do Conselho.
_Avoid_: órgão julgador, instância (quando se fala de quem vota)

**Processo**:
Um pedido ou auto que um colegiado vota: auto de infração, registro e atribuição, acervo técnico ou ética. Abre no GovAdm, é recebido na câmara, cadastrado no Votenet, distribuído a um relator, relatado, pautado e votado.
_Avoid_: caso, protocolo (quando se fala do colegiado), pendência

**Tramitação**:
A passagem de um processo por um colegiado: a da câmara e, se houver recurso, a do Plenário. Um processo com recurso tem duas.
_Avoid_: andamento, fase (quando se fala do colegiado inteiro)

**Status do Votenet**:
Onde a tramitação está: aguardando distribuição, distribuído ao relator, em revisão, assinado, pautado, pedido de vista, impedimento, diligência ou votado. Cada status está com uma pessoa: o relator, o conselheiro que pediu vista ou um funcionário da assessoria.
_Avoid_: fase do GovAdm (são listas diferentes), etapa

**Fase do GovAdm**:
Onde o processo está no GovAdm, como aparece no Relatório de Processos: são 17 fases (manifestação, emissão de parecer, relato, análise, designação e outras), que cobrem também o que acontece antes do Votenet e depois do voto. Não é o status do Votenet.
_Avoid_: status (quando se fala do GovAdm), etapa

**Cópia diária do GovAdm**:
O Relatório de Processos do GovAdm guardado uma vez por dia, para ver quando cada processo mudou de fase. Dela sai o período na fase: de quando o processo entrou na fase atual até hoje.
_Avoid_: foto (a foto é mensal e das empresas), snapshot

**Processo esperando voto**:
O processo que entrou num colegiado e ainda não foi votado na data. Juntos, formam a fila do colegiado, do mais parado ao menos. É estoque, nunca tem acumulado do ano.
_Avoid_: estoque de processos, passivo, backlog, processo em julgamento

**Alerta da fila**:
Amarelo quando o processo está de 90 a 120 dias no mesmo status; vermelho acima de 120. Os dias desde a entrada acendem acima de um ano.
_Avoid_: atraso, prazo vencido (não há prazo legal para o status)

**Recurso ao Plenário**:
Pedido da parte para o Plenário rever a decisão de uma câmara. O Plenário mantém ou reforma a decisão; depois dele, cabe recurso ao Confea.
_Avoid_: apelação, segunda instância

**Prescrição do auto**:
O fim do prazo para o Conselho punir a infração (Lei 9.873/1999): cinco anos do fato, ou três anos com o processo parado no mesmo status (a prescrição intercorrente), o que vier primeiro. A decisão da câmara interrompe a de cinco anos; no Plenário, só corre a intercorrente.
_Avoid_: caducidade, perda de prazo

**Terço**:
O grupo de conselheiros com o mesmo mandato de três anos. Um terço do Plenário se renova a cada ano; a recondução é um mandato novo.
_Avoid_: turma, mandato (quando se fala do grupo)

**Deliberação de repasse**:
A decisão do Plenário, registrada em ata, que aprova convênio, contrato ou patrocínio com uma organização. Quando quem propôs foi indicado pela organização que recebe, a deliberação fica marcada.
_Avoid_: aprovação, conflito de interesse (o painel não julga)

**Cadeira**:
Um lugar no Plenário, ocupado por um conselheiro indicado por uma entidade de classe ou instituição de ensino registrada.
_Avoid_: vaga, assento, voto

**Dívida**:
As anuidades vencidas e não pagas de profissionais e de empresas, ainda dentro do prazo de cobrança de cinco anos.
_Avoid_: inadimplência (quando se fala do valor), passivo, débito

**Piso de execução**:
O valor abaixo do qual o Conselho não pode cobrar a dívida na Justiça: cinco vezes a anuidade de pessoa física (Lei 12.514/2011, art. 8º). Abaixo dele, a cobrança é por acordo, protesto ou negativação.
_Avoid_: alçada, valor mínimo

**Atividade-fim**:
A despesa com fiscalização, atendimento e ações institucionais. O resto (direção e administração) é atividade-meio.
_Avoid_: finalística, área de negócio

**Protocolo**:
O pedido de um serviço ao Crea-SP (registro, certidão, ART, anuidade, orientação), com número, data de abertura e um caminho de status. É a unidade do painel de Atendimento.
_Avoid_: solicitação, chamado, ticket

**Serviço**:
O subtipo da Carta de Serviços que o protocolo pede (como "Registro com diploma" ou "Certidão de Acervo Técnico"), com o seu prazo em dias úteis e a sua taxa. Os serviços se juntam em tipos (registro de profissional, registro de empresa, serviços de ART, certidões, anuidade e taxas, orientação, instituição de ensino).
_Avoid_: assunto, categoria

**Situação do protocolo**:
Uma das cinco do painel antigo: aberto, exigência, sem pagamento, cancelado e fechado. Cada status do caminho cai numa delas.
_Avoid_: estado, fase

**Prazo do serviço**:
Os dias úteis que o Crea-SP tem para fechar o protocolo, contados só enquanto o protocolo está com ele. Dentro ou fora do prazo se lê na data escolhida.
_Avoid_: SLA, prazo de 14 dias

**Exigência**:
O pedido de documento ou correção que devolve o protocolo ao solicitante. Ele tem 30 dias corridos para responder; esse tempo não conta no prazo do serviço.
_Avoid_: pendência, diligência (que é do processo no colegiado)

**Sem atribuição**:
O protocolo aberto ou sem pagamento que nenhum colaborador pegou.
_Avoid_: órfão, na fila geral

**Unidade de atendimento**:
A sede de uma regional (GRE) ou a sede do Crea-SP na capital, onde o profissional e a empresa são atendidos pessoalmente.
_Avoid_: posto, agência, inspetoria
