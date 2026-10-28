# Painel de empresas no CREA-SP — V17

Duas telas de PC (1920×1080; em 1366×768 há rolagem curta), com assunto próprio cada uma. O detalhe abre num painel lateral ao clicar em qualquer número, barra, segmento, mês, curva ou regional, sempre com a lista de empresas para agir (busca, ficha da empresa e cópia para planilha).

O eixo é a **atividade do CREA-SP sobre empresas**: identificar quem deveria estar regular, fiscalizar, autuar, multar e obrigar o registro, e o efeito disso na base e na receita. Cruzamentos entram quando ajudam a decidir: Receita Federal (CNPJ, CNAE, situação cadastral), RAIS/CAGED (empregos em ocupações de engenharia), PNCP (contratos públicos) e o quadro técnico (vínculos de responsável técnico).

Filtros globais: **regional (GRE)**, **câmara** (pela atividade principal da empresa) e **período** (3, 6 ou 12 meses, sempre comparado à mesma janela um ano antes).

## Tela 1 · Fiscalização

**Cadeia da fiscalização** (cinco etapas, da esquerda para a direita):

| Etapa | Número | Para que serve |
|---|---|---|
| 1 · Detectar | Alvos em aberto por tipo (falta de registro, RT baixado sem substituto, obra pública sem ART) e % já com ação | Tamanho do estoque de irregularidade e quanto dele já foi alcançado |
| 2 · Fiscalizar | Ações no período, variação anual, série de 24 meses | Produtividade da fiscalização |
| 3 · Autuar | Autos de infração, variação, % das ações que viraram auto | Atividade punitiva |
| 4 · Multar | Multas aplicadas, destino do valor (pagas, prazo, julgamento, dívida ativa, canceladas), recebido no período | Resultado financeiro e o que precisa de cobrança |
| 5 · Regularizar | Regularizações após ação, % das ações regularizadas, mediana de dias | Efetividade: o objetivo final é a conformidade |

**Mapa bivariado por regional.** O território de cada GRE é pintado pelos seus municípios. A cor cruza duas medidas em tercis (3×3), e o **vermelho sempre significa problema alto e resposta baixa**. São três pares:
- **Problema × ação:** % dos CNPJs de engenharia sem registro × ações por 100 alvos. Responde onde reforçar a equipe.
- **Ação × resultado:** ações por 100 alvos × % das ações regularizadas. Responde onde rever a abordagem.
- **Mercado × registro:** empregos técnicos RAIS/CAGED por empresa registrada × novos registros por 1.000 empregos. Mostra onde há sub-registro provável.

A lista ao lado ordena as regionais e destaca no mapa as que estão na célula escolhida. O território é aproximado pelos municípios-sede da amostra; em produção, usar a tabela oficial município → GRE, a mesma do painel de profissionais.

**Situação dos alvos.** Para cada tipo, uma barra mostra em que ponto estão os alvos:
- regularizado após auto;
- regularizado na notificação;
- autuado sem regularizar;
- notificado sem regularizar;
- sem ação.

Responde quanto de cada problema já foi tratado.

**Ações, autos e regularizações por mês.** As ações aparecem como barra clara; dentro dela, os autos empilhados por tipo; a linha mostra as regularizações. Mostra o ritmo e a sazonalidade da fiscalização.

**Tempo até regularizar, por origem da ação.** Curvas acumuladas (Kaplan-Meier: ações pendentes contam como censuradas) para:
- cruzamento com a Receita;
- contrato público (PNCP);
- denúncia;
- rotina de campo;
- cadastro do CREA.

Mostra qual fonte de informação converte mais e mais rápido, o que orienta investir em convênios e cruzamentos de dados.

## Tela 2 · Cadastro e receita

| Número | Para que serve |
|---|---|
| Empresas registradas, variação, inativas e com visto de outro estado | Estoque da base, como no painel de profissionais |
| Novos registros e % após ação de fiscalização | Quanto da entrada na base é "obrigada" pela fiscalização |
| Cobertura do mercado (CNPJs de engenharia ativos na Receita com registro) | Tamanho do mercado ainda fora |
| Inadimplência | Saúde da carteira |
| Arrecadação de empresas (anuidades + multas) e variação anual | Receita |
| Cadastro a sanear: registros ativos de CNPJ baixado, inapto ou suspenso na Receita | Base inflada e cobrança provavelmente perdida |

Gráficos da tela:
- **Mercado por câmara** (colunas de largura proporcional): a largura é o número de CNPJs de engenharia na câmara; a altura se divide em registrado em dia, registrado inadimplente, sem registro com ação e sem registro sem ação.
- **Empresas por regional:** registradas em dia, inadimplentes e CNPJs sem registro.
- **Entradas e saídas da base:** abertura + espontâneas + após fiscalização + retornos − saídas = final.
- **Arrecadação mês a mês:** anuidades e multas, contra o total do ano anterior.
- **Quadro técnico:**
  - RT baixado sem substituto (alvo de fiscalização);
  - empresas sem vínculo de RT carregado, tratado como falha de carga a conferir;
  - distribuição de empresas por responsável técnico, com destaque acima de 3.

## O que não está na tela, e por quê

- **Fiscalizações em aberto (fila de casos):** é estoque interno de processo, não resultado da atividade. A cadeia mede ações, autos, multas e regularizações.
- **Projeção da base:** descartada por ser pouco precisa para decisão.
- **Indicadores técnicos da V13 e contexto público nacional:** permanência condicional, continuidade de RT em dias-empresa, valor PNCP, dados Confea/IBGE/Banco Central. São bons para estudo, sem ação direta. Continuam na V14 (app principal).

## Dados

- **Cadastro, financeiro, quadro técnico, contratos e emprego:** vêm do cenário demonstrativo do projeto.
- **Ações, autos, multas e regularizações:** a camada `src/painel/fiscalizacao.ts` deriva esses fatos, por sorteio determinístico, de eventos que já existem no cadastro:
  - primeiro registro de um estabelecimento com CNAE de engenharia;
  - baixa de RT sem substituto em 30 dias;
  - contrato público técnico sem ART em 60 dias.
- **Valores de multa:** ilustrativos.
- **Produção:** a fonte é o sistema de fiscalização do CREA-SP.

Testes: `tests/fiscalizacao.test.ts` e `tests/painel.test.ts`. Para regerar o arquivo: `npm run build:painel` → `entrega/painel-gestao-creasp.html`, um arquivo único (código, fontes e malha municipal embutidos) que abre no navegador sem servidor nem internet.
