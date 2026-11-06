# Inteligência Estratégica Crea-SP

Painéis de dados estratégicos do Crea-SP, prototipados aqui e implementados depois no Power BI. Este arquivo é só o glossário: os nomes que valem no código, nos textos e nas conversas.

## Painéis e telas

**Painel**:
Conjunto de páginas para um público e uma regra de acesso (Empresas, Profissionais e formação, Fiscalização e malha fina, Gestão do Conselho, Presidência). No Power BI, cada painel é um relatório com o seu próprio modelo.
_Avoid_: dashboard, aba, relatório (quando se fala do protótipo)

**Página**:
Uma tela de um painel, que cabe num monitor Full HD sem rolagem.
_Avoid_: aba, tela, guia

**Bloco**:
Unidade visual de uma página, com título, gráfico e ficha (i).
_Avoid_: widget, visual, card

**Cartão**:
Bloco que mostra um único número com a variação contra o mesmo mês do ano anterior.
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
