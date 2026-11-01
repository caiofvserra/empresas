# Painel de Empresas

Primeiro painel separado do painel geral, de 01/11/2026. Abre em `/empresas.html` no site e em `entrega/painel-empresas-creasp.html` sem servidor. O painel geral continua em `/` e em `entrega/painel-gestao-creasp.html`, agora sem a aba Empresas; um botão no menu lateral leva de um painel ao outro.

## Por que separar e como dividir

O painel único ficou pesado e não permite regras de acesso diferentes para cada público. A recomendação é dividir por público e por regra de acesso, e não uma aba por painel, porque várias abas leem os mesmos dados e servem às mesmas pessoas:

| Painel | Conteúdo | Quem acessa |
|---|---|---|
| Empresas (pronto) | Mercado e registro, evolução, responsáveis técnicos e ARTs, sócios, instalações e empregados | Superintendências e regionais; cada regional vê só a sua |
| Fiscalização e malha fina | Ações, autos, forças-tarefas, contratos públicos, obras e a lista de indícios | SUPFIS e regionais, com a lista nominal só para quem fiscaliza |
| Profissionais e formação | Profissionais, formação e registro, emprego e salário em totais, perícias | Superintendências; regionais veem só a sua |
| Gestão do Conselho | Receita e cobrança, controle interno, entidades e instituições de ensino, atendimento | Presidência e superintendências administrativas; diárias e pessoal com acesso restrito |
| Presidência | Só os indicadores principais e um resumo de cada painel, sem listas nominais | Presidência e diretoria |

No Power BI, cada painel tem o seu modelo de dados e a sua atualização, o que deixa cada arquivo leve. As tabelas comuns (calendário, município e regional, CNAE e câmara) vêm de um fluxo de dados único, para que os filtros funcionem igual em todos. A restrição por regional é uma regra de segurança por linha em cada modelo. O painel da Presidência lê os modelos dos outros e é feito por último. A aba Método vira um documento de apoio; a ficha (i) continua em cada bloco.

Ordem sugerida: Empresas, Fiscalização e malha fina, Profissionais e formação, Gestão do Conselho e, por fim, Presidência.

## O que o painel de Empresas tem

- **Mercado e registro.** Empresas registradas, parte do mercado registrada, atividade obrigatória sem nenhum registro, anuidade em dia e cadastro incompleto. Três contagens, Receita comparada com o cadastro, registro obrigatório em cada regional, situação do registro e da anuidade, mercado de cada câmara (novo desenho), atividades com mais estabelecimentos sem registro (novo), do mercado à ART, câmara e porte, tempo desde o primeiro registro (novo) e capital social (novo).
- **Evolução.** Entradas, saídas, aberturas na Receita, permanência e emprego formal. O gráfico que compara a economia (emprego formal, PIB e crédito "!") com as empresas de engenharia abertas na Receita e as que se registraram no Crea-SP, com o primeiro mês igual a 100. Entradas e saídas mês a mês e aberturas com permanência.
- **RT e ART.** Responsável técnico, RT que saiu sem substituto, ARTs, valor declarado e registradas sem ART. Responsáveis técnicos das empresas, ARTs por modalidade, ARTs mês a mês (novo) e empresas sem ART por câmara.
- **Vínculos.** Sócios empresas e sócios pessoas físicas ("!") lado a lado, usinas, postos, minas e financiamentos, empregados técnicos por empresa ("!", veio da aba Profissionais), empresas credenciadas no DETRAN-SP e no INMETRO ("!", novo) e empresas que passaram a ter engenharia no contrato social pela Junta Comercial ("!", novo).

Regional, câmara, período (3, 6, 12 ou 24 meses) e data de referência ficam no alto da tela e valem para todas as páginas. Clicar numa barra, faixa ou ponto abre as empresas daquele item; nenhum clique abre o resumo genérico da regional.

## O que saiu e por quê

| Saiu | Motivo |
|---|---|
| Prazo de concessão do registro | Pedido da gestão |
| Empresas registradas por regional nos últimos 24 meses | Os filtros de regional e de período fazem esse papel |
| Prazo da certidão de acervo operacional | Pedido da gestão; a medida continua calculável para um painel de atendimento |
| Responsável técnico e quitação por regional | Misturava dois assuntos; RT ficou na página RT e ART e a quitação no cartão e na rosca de anuidade |
| Densidade de empresas por habitante | Leitura difícil |
| Riqueza, crédito e registro por regional | Sem interesse; o PIB e o crédito foram para o gráfico de economia, aberturas e registros |
| Como a base mudou no período (ponte) | Depende de classificar cada entrada e retorno, dado que o cadastro pode não ter |
| Gráfico de colunas com larguras diferentes por câmara | Substituído por barras deitadas, mais fáceis de ler |
| ARTs por regional e mês | Mesmo caso do gráfico de 24 meses: a regional é filtro |
| A palavra "dono" e a linha "Responsável" das fichas | Não fazia sentido no painel; saiu também do plano e da documentação |

## Comparação com o antigo painel de empresas

| No painel antigo | Aqui |
|---|---|
| Total de registros e total de empresas, ativos e inativos | Três contagens e situação do registro |
| Adimplentes e inadimplentes | Cartão e rosca de anuidade |
| Empresas com RT inativo e registro ativo | RT que saiu sem substituto e empresas sem RT |
| Registros ativos por câmara | Mercado de cada câmara, com o que falta registrar |
| Registros ativos por CNAE | Atividades com mais estabelecimentos sem registro |
| Distribuição por GRE ("sigla não localizada") | Filtro de regional, registro obrigatório por regional e o cartão de cadastro incompleto |
| Registros por faixa de capital | Capital social das empresas registradas (novo) |
| Tempo de registros ativos em anos | Há quanto tempo as empresas estão registradas (novo) |

## Verificação

```bash
npm test               # inclui tests/empresas.test.ts
npm run build          # site com os dois painéis
npm run build:painel   # entrega/painel-gestao-creasp.html e entrega/painel-empresas-creasp.html
```
