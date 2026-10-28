# Catálogo de indicadores previstos — painel de empresas CREA-SP (V18)

Lista para validação antes de montar o BI. São oito abas, cada uma dedicada a um assunto. A Visão geral mostra todos os assuntos com o mesmo peso.

## Como ler

- **Prioridade:**
  - **E** = essencial;
  - **I** = importante;
  - **C** = complementar (candidato a corte).
- **Fonte:** primeiro, a fonte em produção; depois do "·", o dado usado no protótipo:
  - **real**: dado público versionado;
  - **demo**: cenário demonstrativo;
  - **demo derivado**: fato gerado a partir do cenário, como ações e autos.
- **Filtros de todas as abas:** regional (GRE), câmara especializada (pela atividade principal) e período (3, 6 ou 12 meses).
  - A comparação é sempre com a mesma janela um ano antes.
  - Atendimento e estrutura não usam o filtro de câmara.
  - Dados públicos são estaduais ou nacionais.
- **Unidades:** empresa = CNPJ raiz; estabelecimento = CNPJ completo. A GRE da empresa é a GRE da matriz.
- **Mapa:** o território de cada GRE é pintado pelos seus municípios (malha IBGE de 645 municípios). Não há bolhas.
- **Clique:** todo número, barra ou regional abre um painel lateral com:
  - definição;
  - como agir;
  - lista de empresas com busca, ficha e cópia para planilha.
- **Metas:** parâmetros ajustáveis no painel, não oficiais. Cobertura 65%, adimplência 60%, recuperação 30%, regularização 50%, atendimento no prazo 80%.

## 1. Visão geral

Um cartão por assunto, o mapa das regionais e o quadro comparativo.

| ID | Indicador | Cálculo | Objetivo | Fonte | Forma gráfica | P |
|---|---|---|---|---|---|---|
| VG-01 | Empresas registradas | Empresas com registro ativo no corte; variação sobre o início do período | Tamanho e evolução da base | Cadastro PJ · demo | Cartão + sparkline 24 meses | E |
| VG-02 | Cobertura do mercado | CNPJs ativos na Receita com CNAE de engenharia e registro ativo ÷ total desses CNPJs | Quanto do mercado formal está registrado | Receita (CNPJ) × cadastro · demo | Cartão + barra de meta | E |
| VG-03 | Autos de infração lavrados | Autos no período; variação anual; ações fiscalizatórias e regularizações no subtítulo | Intensidade da fiscalização | Sistema de fiscalização · demo derivado | Cartão + sparkline | E |
| VG-04 | Arrecadação de empresas | Anuidades + multas recebidas no período; variação anual | Receita vinda de pessoa jurídica | Financeiro · demo | Cartão + sparkline | E |
| VG-05 | Saldo vencido de empresas | Valor vencido e não pago no corte; % de empresas inadimplentes | Risco de receita e tamanho da cobrança | Financeiro · demo | Cartão + sparkline | E |
| VG-06 | ARTs de empresas | ARTs registradas no período; variação anual; % de empresas com RT | Atividade técnica declarada | Sistema de ART · demo | Cartão + sparkline | I |
| VG-07 | Empresas com indício de irregularidade | Empresas com ao menos um indício da aba Malha fina; % já com ação fiscal | Tamanho do problema conhecido por cruzamento de bases | Aba 4 · demo | Cartão + barra segmentada | I |
| VG-08 | Atendimento no prazo | Solicitações resolvidas em até 14 dias ÷ (resolvidas + abertas com prazo vencido) | Qualidade do serviço | Atendimento · demo | Cartão + barra de meta | I |
| VG-09 | Mapa das regionais | Indicador escolhido por GRE: empresas, cobertura, sem registro, autos, arrecadação, inadimplência, ARTs, indícios, empregos técnicos | Onde cada assunto está melhor ou pior | Várias · demo | Coroplético por GRE (municípios) + ranking ao lado | E |
| VG-10 | Quadro das regionais | Por GRE: empresas, tendência 24 meses, variação, cobertura, sem registro, autos, % regularizado, arrecadação, inadimplência | Comparar regionais lado a lado | Várias · demo | Tabela com barras, sparkline, setas vs. meta e cor por intensidade | E |
| VG-11 | Leitura do período | Frases geradas com as maiores variações e destaques de cada assunto | Resumo pronto para reunião | Calculado | Lista de destaques + faixa rolante no topo | I |

## 2. Cadastro

| ID | Indicador | Cálculo | Objetivo | Fonte | Forma gráfica | P |
|---|---|---|---|---|---|---|
| CAD-01 | Situação do registro | Empresas do universo de engenharia: ativa, inativa (já registrada), nunca registrada; à parte, vistos de outro CREA | Retrato da base, como no painel de profissionais | Cadastro × Receita · demo | Rosca | E |
| CAD-02 | Situação de pagamento | Empresas ativas em dia × inadimplentes | Saúde financeira da base | Financeiro · demo | Rosca | E |
| CAD-03 | Empresas por câmara e porte | Empresas ativas por câmara e por porte (Receita) | Composição da base | Cadastro × Receita · demo | Barras empilhadas | I |
| CAD-04 | Mercado por câmara | CNPJs de engenharia ativos por câmara, em 4 situações: registrado em dia; registrado inadimplente; sem registro, com ação; sem registro, sem ação | Onde está o mercado fora do CREA | Receita × cadastro × fiscalização · demo | Mekko (largura = tamanho do mercado) | E |
| CAD-05 | Entradas e saídas por mês | Entradas (espontâneas e após fiscalização) e saídas (baixa e cancelamento) por mês; linha do estoque | Ritmo de crescimento e de evasão | Cadastro · demo | Barras divergentes + linha, 24 meses | E |
| CAD-06 | Ponte da base | Abertura + espontâneas + após fiscalização + retornos − saídas = final | Explicar a variação do período | Cadastro × fiscalização · demo | Cascata | I |
| CAD-07 | Funil de conformidade | Universo → registro ativo → com RT → com ART no período | Onde a conformidade se perde | Cadastro, RT e ART · demo | Sankey | I |
| CAD-08 | Prazo de concessão do registro | Dias entre o pedido e o início do registro; mediana e P90 | Agilidade para a empresa se regularizar | Cadastro · demo | Histograma | I |
| CAD-09 | Base por regional | Empresas ativas por GRE, mês a mês | Tendência regional | Cadastro · demo | Pequenos múltiplos, 24 meses | C |

## 3. Fiscalização

Rito da Resolução Confea nº 1.008/2004: ação fiscalizatória → notificação → auto de infração → defesa e julgamento → multa paga ou dívida ativa. A regularização pode ocorrer em qualquer etapa.

| ID | Indicador | Cálculo | Objetivo | Fonte | Forma gráfica | P |
|---|---|---|---|---|---|---|
| FIS-01 | Ações fiscalizatórias | Vistorias, diligências e notificações a empresas no período; variação anual; média mensal; % por origem | Produção da fiscalização | Sistema de fiscalização · demo derivado | Cartão + sparkline | E |
| FIS-02 | Autos de infração lavrados | Autos por infração: falta de registro (art. 59 da Lei 5.194/66), falta de RT (art. 6º, e), falta de ART (Lei 6.496/77); % das ações que geraram auto | Atuação punitiva por tipo | Idem · demo derivado | Cartão + barra por tipo | E |
| FIS-03 | Multas aplicadas | Soma dos autos do período, por destino: paga, prazo de defesa, em julgamento, dívida ativa, cancelada | Resultado financeiro e o que exige cobrança | Fiscalização × financeiro · demo derivado | Cartão + barra segmentada | E |
| FIS-04 | Multas recebidas | Valor de multas pago no período | Efetividade da cobrança das multas | Financeiro · demo derivado | Cartão | I |
| FIS-05 | Regularizações após ação | Empresas que regularizaram após a ação (registro, RT, ART ou baixa); % das ações; mediana de dias; na notificação × após o auto | Efetividade: o objetivo final é a conformidade | Fiscalização × cadastro · demo derivado | Cartão + sparkline | E |
| FIS-06 | Registros obtidos pela fiscalização | Empresas que obtiveram registro após ação; % dos novos registros do período | Quanto a fiscalização traz para a base | Idem · demo derivado | Cartão | E |
| FIS-07 | Caminho da ação fiscalizatória | Ações → notificação atendida, auto lavrado ou em prazo; autos → paga, defesa, julgamento, dívida ativa ou cancelada | Onde o processo trava | Idem · demo derivado | Sankey | E |
| FIS-08 | Mapa de prioridade | Por GRE, três pares cruzados em tercis: sem registro × ações; ações × regularização; emprego técnico (RAIS) × novos registros | Onde reforçar equipe ou mudar a abordagem | Fiscalização × Receita × RAIS · demo | Mapa bivariado 3×3 por GRE + lista | E |
| FIS-09 | Ações, autos e regularizações por mês | Série mensal; autos por tipo | Ritmo e sazonalidade | Idem · demo derivado | Barras + empilhado + linha, 24 meses | I |
| FIS-10 | Tempo até regularizar, por origem | % acumulado de ações regularizadas por dias desde a ação (Kaplan-Meier), por origem: Receita, PNCP, denúncia, rotina de campo, cadastro | Qual fonte de informação converte mais e mais rápido | Idem · demo derivado | Curvas em degrau | I |
| FIS-11 | Irregularidades tratadas | Por tipo: regularizada após auto, regularizada na notificação, autuada sem regularizar, notificada sem regularizar, sem ação fiscal | Quanto do problema conhecido já foi alcançado | Idem · demo derivado | Barras 100% | I |
| FIS-12 | Autos por regional e mês | Autos por GRE nos últimos 12 meses | Constância da atuação regional | Idem · demo derivado | Mapa de calor | C |

## 4. Malha fina (indícios por cruzamento de bases)

Cada indício gera uma lista de empresas para fiscalizar ou sanear.

| ID | Indicador | Cálculo | Objetivo | Fonte | Forma gráfica | P |
|---|---|---|---|---|---|---|
| MF-01 | Empresas com indício | Empresas com ao menos um indício abaixo; % já com ação fiscal; empresas com vários indícios | Priorizar quem acumula indícios e ainda não teve ação | Calculado · demo | Barras por indício com a parte já fiscalizada | E |
| MF-02 | CNAE de engenharia sem registro | CNPJ ativo na Receita com CNAE de engenharia e sem registro ativo (art. 59 da Lei 5.194/66) | Base da fiscalização de registro | Receita (dados abertos do CNPJ) × cadastro · demo | Barras por câmara e porte + lista | E |
| MF-03 | Registro ativo com CNPJ inativo | Registro ativo no CREA de CNPJ baixado, inapto ou suspenso na Receita | Sanear o cadastro; anuidade provavelmente incobrável | Receita × cadastro · demo | Cartão + barras por situação | I |
| MF-04 | Nome de engenharia sem diretoria registrada | Empresa com "engenharia" ou "agronomia" na razão social em que a maioria dos administradores não tem registro ativo (art. 5º da Lei 5.194/66) | Exigir adequação do nome ou da diretoria | QSA da Receita (nome + CPF parcial) × cadastro de profissionais · demo | Barra 100% (maioria ativa, metade ou menos, nenhum) + lista | I |
| MF-05 | Engenheiro abaixo do piso | Vínculos em CBO de engenheiro ou agrônomo com salário abaixo do piso da jornada (Lei 4.950-A/66). Piso exigível: 6 h = R$ 7.272; 8 h = R$ 10.302 (congelado pelo STF, ADPFs 53, 149 e 171, 2022). Leitura Confea: 8,5 SM = R$ 13.778,50. Conta empresas com ao menos um vínculo abaixo | Ação de valorização: orientar a empresa e encaminhar ao MTE/MPT | RAIS identificada ou eSocial (exige acordo com o MTE; o dado público não traz CNPJ) · demo | Histograma salário ÷ piso + lista de empresas | I |
| MF-06 | Empresa sem registro que emprega engenheiros | Empresa sem registro ativo com vínculo em CBO de engenheiro | Forte indício de atividade de engenharia sem registro | RAIS identificada × cadastro · demo | Cartão + barras por câmara | I |
| MF-07 | Engenheiro empregado sem registro ativo | Vínculo em CBO de engenheiro cujo CPF não tem registro ativo | Indício de exercício ilegal | RAIS identificada × cadastro de profissionais · demo | Cartão + lista | C |
| MF-08 | Contratos públicos por situação do fornecedor | Contratos de obras e serviços de engenharia, por situação do fornecedor na data: sem registro; registrado com anuidade vencida (não obteria a certidão de registro e quitação); sem ART em 60 dias; regular. Em valor e quantidade | Fiscalizar contratos com prova documental e cobrar | PNCP × cadastro × financeiro × ART · demo | Barras empilhadas por categoria (R$) + lista | E |
| MF-09 | Cobertura × emprego técnico | Por GRE: cobertura (eixo x) × variação do emprego em ocupações de engenharia (eixo y); tamanho = empresas | Onde o mercado cresce e o registro não acompanha | CAGED/RAIS × cadastro · demo | Quadrante (dispersão) | I |

## 5. Responsabilidade técnica, ART e certidões

| ID | Indicador | Cálculo | Objetivo | Fonte | Forma gráfica | P |
|---|---|---|---|---|---|---|
| RT-01 | Empresas com RT | Empresas ativas com responsável técnico de vínculo vigente ÷ empresas ativas | Cumprimento do quadro técnico | Cadastro (vínculos de RT) · demo | Cartão + meta; barras por GRE | E |
| RT-02 | RT baixado sem substituto | Empresas ativas cuja baixa de RT não teve substituto em 30 dias | Lista para notificação | Idem · demo | Cartão + lista | E |
| RT-03 | Sem vínculo de RT carregado | Empresas ativas sem nenhum vínculo de RT no cadastro | Falha de carga a conferir | Idem · demo | Cartão | C |
| RT-04 | Concentração de responsabilidade técnica | Profissionais por número de empresas em que são RT; destaque acima de 3 | Verificar compatibilidade de tempo e área (conferir o limite na norma vigente) | Idem · demo | Barras (1, 2, 3, 4, 5+) + lista | I |
| RT-05 | ARTs de empresas | ARTs registradas no período; variação anual | Atividade técnica declarada | Sistema de ART · demo | Cartão + sparkline | E |
| RT-06 | Valor declarado em ART | Soma do valor de contrato das ARTs | Volume econômico da engenharia registrada | Idem · demo | Cartão | I |
| RT-07 | ARTs por modalidade | Quantidade e valor por modalidade | Perfil da atividade | Idem · demo | Barras | C |
| RT-08 | ARTs por regional e mês | Últimos 12 meses | Sazonalidade e quedas regionais | Idem · demo | Mapa de calor | I |
| RT-09 | Empresas sem ART no período | Empresas ativas sem nenhuma ART no período, por câmara | Atividade não declarada ou empresa parada | Cadastro × ART · demo | Barras por câmara | I |
| RT-10 | Certidão de acervo operacional (CAO) | Emitidas; prazo mediano e P90 do pedido à emissão; fila por situação (solicitada, em análise, pendente) e idade | Agilidade do serviço à empresa | Sistema de certidões · demo | Histograma de prazo + fila | E |
| RT-11 | Aptas à certidão de registro e quitação | Empresas ativas sem anuidade vencida ÷ empresas ativas | Quantas podem disputar licitação hoje | Cadastro × financeiro · demo | Cartão + barras por GRE | I |

## 6. Receita, cobrança e orçamento

| ID | Indicador | Cálculo | Objetivo | Fonte | Forma gráfica | P |
|---|---|---|---|---|---|---|
| REC-01 | Arrecadação de empresas | Anuidades + multas recebidas; variação anual | Receita de pessoa jurídica | Financeiro · demo | Cartão | E |
| REC-02 | Arrecadação mês a mês | Recebido por mês (anuidades e multas) contra o mesmo mês do ano anterior | Tendência e sazonalidade | Idem · demo | Barras empilhadas + linha do ano anterior, com ▲▼ | E |
| REC-03 | Saldo vencido | Valor vencido e não pago no corte; variação sobre o início do período | Estoque a cobrar | Idem · demo | Cartão + sparkline | E |
| REC-04 | Inadimplência | Empresas cobradas com saldo vencido ÷ empresas cobradas | Saúde da carteira | Idem · demo | Cartão + meta de adimplência | E |
| REC-05 | Idade do saldo vencido | Saldo por faixa: até 30, 31–90, 91–180, 181–365 e mais de 365 dias | Priorizar o que ainda é recuperável | Idem · demo | Barras horizontais | I |
| REC-06 | Recuperação da dívida | Recebido no período ÷ saldo vencido no início do período | Efetividade da cobrança | Idem · demo | Medidor com meta | I |
| REC-07 | Decomposição do saldo vencido | Saldo por regional → porte → faixa de atraso → CNAE → situação de RT | Achar onde a dívida se concentra | Idem · demo | Árvore de decomposição | I |
| REC-08 | Potencial anual de registro | CNPJs de engenharia sem registro × anuidade mediana | Dimensionar o ganho de receita da fiscalização de registro | Receita × financeiro · demo | Cartão | C |
| ORC-01 | Execução orçamentária | Executado ÷ planejado no período | Disciplina orçamentária | Orçamento · demo | Cartão + meta | I |
| ORC-02 | Planejado × executado por programa | Formação e eventos, coworkings, serviço cadastral, orientação técnica | Onde o orçamento sobra ou falta | Idem · demo | Barras tipo bala | I |
| ORC-03 | Despesa publicada do Conselho | Despesa dos exercícios de 2013 e 2025; composição por subgrupo, acumulada 2013–2026 | Escala e composição do gasto, como o público vê | Portal da Transparência do CREA-SP · real | Barras | C |

## 7. Atendimento e estrutura

| ID | Indicador | Cálculo | Objetivo | Fonte | Forma gráfica | P |
|---|---|---|---|---|---|---|
| ATD-01 | Solicitações de atendimento | Quantidade no período; variação anual; % vindas de empresas | Demanda | Atendimento · demo | Cartão | I |
| ATD-02 | Resolvidas no prazo | Resolvidas em até 14 dias ÷ (resolvidas + abertas com prazo vencido) | Qualidade do serviço | Idem · demo | Cartão + meta | E |
| ATD-03 | Tempo de resolução | Mediana de dias entre pedido e resolução | Qualidade do serviço | Idem · demo | Cartão | I |
| ATD-04 | Solicitações por assunto | Por assunto: no prazo, com atraso, aberta com prazo vencido, aberta no prazo; parte de empresas | Onde o atendimento atrasa | Idem · demo | Barras empilhadas | I |
| ATD-05 | Solicitações por mês | Quantidade e % no prazo por mês | Tendência | Idem · demo | Barras + linha | C |
| EST-01 | Ocupação dos coworkings | Horas usadas ÷ horas disponíveis | Uso da estrutura física | Controle de uso CreaLab · demo | Cartão | I |
| EST-02 | Ocupação por unidade e mês | Ocupação por unidade nos últimos 12 meses; usuários distintos; custo por hora usada | Ajustar a oferta de espaços | Idem + orçamento · demo | Mapa de calor + lista | I |
| EST-03 | Capacitação: da inscrição à aplicação | Inscrições → presenças → presenças identificadas → acompanhamento em 90 dias → respostas → aplicação relatada; custo por participante | Alcance e efeito relatado | Eventos e pesquisa de retorno · demo | Funil | C |
| EST-04 | Qualidade do cadastro | Pendências abertas × resolvidas por tipo: CNPJ inválido ou duplicado, sem CNAE, município divergente, GRE não identificada, CREA ativo com CNPJ baixado | Confiabilidade da base que alimenta o painel | Rotinas de qualidade · demo | Barras empilhadas | I |

## 8. Contexto público (somente dados reais)

| ID | Indicador | Cálculo | Objetivo | Fonte | Forma gráfica | P |
|---|---|---|---|---|---|---|
| PUB-01 | Resultados publicados em 2025 | Ações fiscalizatórias 409.757; autos ≈ 201 mil; novas empresas 26.862; novos profissionais 25.577; ARTs 1.899.583; processos 6.599; Capacita; CreaLab (37 unidades) | Números oficiais para discurso e referência de escala | Relatório de Gestão CREA-SP 2025 · real | Faixa de destaques | I |
| PUB-02 | Remuneração × piso legal | Salário médio CLT de ocupações de engenharia contra o piso exigível (R$ 10.302 em 8 h) e a leitura Confea (R$ 13.778,50); mediana de admissão do engenheiro civil: R$ 10.360 | Fundamentar a defesa do piso | CAGED (via portal salario.com.br), Lei 4.950-A/66, STF · real | Pirulito com linhas de referência | I |
| PUB-03 | Formação em engenharia em SP | Concluintes por ano, 2019–2024 (de 36,6 mil para 19,9 mil), e por curso | Antecipar a entrada de novos profissionais | INEP, Censo da Educação Superior · real | Barras + principais cursos | I |
| PUB-04 | Densidade profissional por UF | Profissionais ativos por 100 mil habitantes; SP × Brasil | Posição de SP no Sistema | Confea SIC × IBGE · real | Barras ordenadas, SP destacado | C |
| PUB-05 | Participação feminina | % de mulheres entre os profissionais: SP 16,1% × Brasil 20,3% | Pauta de diversidade | Confea SIC · real | Cartão + barras por UF | C |
| PUB-06 | Registros profissionais novos por ano | Série de SP e do Brasil | Tendência de entrada no Sistema | Confea SIC · real | Barras + linha | C |

## Fora do painel (já decidido)

- Previsão ou projeção da base.
- Fila de fiscalizações em aberto (estoque de processos).
- Bolhas sobre o mapa.
- Títulos numerados de etapas ("1 · Detectar…").
- Score composto de prioridade.

## A confirmar com as áreas

- Tabela oficial município → GRE e correspondência CNAE → câmara; hoje ambas são demonstrativas.
- Prazo de referência do atendimento; 14 dias é ilustrativo.
- Acesso à RAIS identificada ou ao eSocial (acordo com o MTE) e ao QSA completo, para MF-04 a MF-07.
- Leitura do piso a adotar no MF-05: valor exigível congelado pelo STF ou leitura Confea.
- Limite normativo vigente de empresas por responsável técnico (RT-04).
