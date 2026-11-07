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

## Dados

**Cenário de demonstração**:
A base fictícia e determinística que alimenta o protótipo e o pacote Power BI até a base real chegar.
_Avoid_: mock, dados de teste, fake

**Parceria ("!")**:
Fonte que depende de acordo com outro órgão. O bloco que a usa entra demonstrativo e com o marcador "!", e tem um plano B sem acordo.
_Avoid_: convênio (quando ainda não existe), fonte externa

## Gestão do Conselho

**Processo**:
Um pedido ou auto que uma câmara especializada julga: auto de infração, registro e atribuição, acervo técnico ou ética. Entra, recebe relator, vai à pauta e é julgado.
_Avoid_: caso, protocolo (quando se fala da câmara), pendência

**Estoque de processos**:
Os processos que entraram e ainda não foram julgados na data de referência. É estoque, nunca tem acumulado do ano.
_Avoid_: fila, passivo, backlog

**Recurso ao plenário**:
Pedido da parte para o plenário rever a decisão de uma câmara.
_Avoid_: apelação, segunda instância

**Prescrição do auto**:
O fim do prazo de cinco anos, contados do fato, para o Conselho punir a infração (Lei 9.873/1999). O auto que chega a esse prazo sem julgamento é arquivado.
_Avoid_: caducidade, perda de prazo

**Cadeira**:
Um lugar no plenário, ocupado por um conselheiro indicado por uma entidade de classe ou instituição de ensino registrada.
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

**Unidade de atendimento**:
A sede de uma regional (GRE) ou a sede do Crea-SP na capital, onde o profissional e a empresa são atendidos pessoalmente.
_Avoid_: posto, agência, inspetoria
