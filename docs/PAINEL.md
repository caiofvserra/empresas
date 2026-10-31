# Painel de empresas no CREA-SP — V18

> A V19 reorganizou as abas e acrescentou indicadores-norte, malha fina v1 e a aba Método. Este documento descreve a V18; as mudanças estão em [V19.md](V19.md).

Cockpit em oito abas, uma por assunto. A Visão geral dá a cada assunto o mesmo peso, com um cartão que abre a aba correspondente. O catálogo completo, com 78 indicadores, está em `docs/INDICADORES_V18.md` e `docs/INDICADORES_V18.xlsx`. Cada indicador traz nome, cálculo, objetivo, fonte, forma gráfica e prioridade.

## Padrões

- **Filtros comuns:** regional (GRE), câmara especializada (pela atividade principal) e período (3, 6 ou 12 meses).
  - A comparação é sempre com a mesma janela um ano antes.
  - Atendimento e estrutura não usam o filtro de câmara.
  - Os dados públicos são estaduais ou nacionais.
- **Clique:** qualquer número, barra, segmento, célula ou regional abre o painel lateral com:
  - definição;
  - como agir;
  - lista de empresas, com busca, ficha e cópia para planilha.
- **Visão geral:** os cartões abrem a aba do assunto.
- **Ampliar:** cada bloco pode ser ampliado para a tela inteira; Esc volta.
- **Teclas:** 1 a 8 trocam de aba.
- **Metas:** parâmetros ajustáveis no trilho (cobertura, RT, adimplência, recuperação, regularização, atendimento no prazo). Não são metas oficiais.
- **Mapas:** o território de cada GRE é pintado pelos seus municípios (malha IBGE de 645 municípios), sem bolhas.
- **Tema:** claro e escuro.
- **Telas:**
  - 1920×1080: a Visão geral e as abas de duas linhas cabem na tela;
  - Cadastro, Fiscalização e Malha fina têm uma terceira linha, com rolagem;
  - 1366×768 e celular: rolagem.

## Abas

1. **Visão geral:**
   - um cartão por assunto: empresas registradas, cobertura do mercado, autos de infração, arrecadação, saldo vencido, ARTs, empresas com indício e atendimento no prazo;
   - mapa das regionais com o indicador à escolha (dez opções);
   - quadro das regionais em todos os assuntos;
   - leitura do período, com frases recalculadas a cada filtro.
2. **Cadastro:**
   - situação do registro e do pagamento;
   - entradas e saídas por mês;
   - ponte da base;
   - mercado por câmara (Mekko);
   - funil de conformidade (Sankey);
   - empresas por câmara e porte;
   - prazo de concessão do registro;
   - base por regional em pequenos múltiplos.
3. **Fiscalização:**
   - cartões com os atos do rito (ação fiscalizatória, auto de infração, multa aplicada e recebida, regularização, registro obtido);
   - caminho das ações (Sankey) seguindo a Res. Confea 1.008/2004;
   - mapa bivariado de prioridade;
   - série mensal;
   - tempo até regularizar por origem (Kaplan-Meier);
   - irregularidades tratadas;
   - autos por regional e mês.
4. **Malha fina:** indícios por cruzamento de bases:
   - CNAE de engenharia sem registro (Receita);
   - contratos públicos sem registro, sem quitação da anuidade ou sem ART (PNCP);
   - nome de engenharia sem diretoria registrada (QSA, art. 5º da Lei 5.194/66);
   - engenheiro empregado abaixo do piso (RAIS identificada, Lei 4.950-A/66);
   - empresa sem registro que emprega engenheiros;
   - empregado como engenheiro sem registro ativo;
   - registro ativo com CNPJ inativo;
   - cobertura × emprego técnico por regional.
5. **Responsabilidade técnica, ART e certidões:**
   - empresas com RT e RT baixado sem substituto;
   - quadro técnico;
   - ARTs por regional e mês e por modalidade;
   - prazo da certidão de acervo operacional;
   - RT e aptidão à certidão de registro e quitação por regional;
   - empresas sem ART por câmara.
6. **Receita, cobrança e orçamento:**
   - arrecadação ano contra ano (anuidades e multas);
   - recuperação e idade do saldo vencido;
   - árvore de decomposição do saldo vencido;
   - orçamento dos programas, planejado × executado;
   - despesa publicada do Conselho (dado real).
7. **Atendimento e estrutura:**
   - solicitações por assunto e situação (prazo de referência de 14 dias);
   - ocupação dos coworkings por unidade e mês;
   - solicitações por mês;
   - funil da capacitação;
   - qualidade do cadastro.
8. **Contexto público (somente dados reais):**
   - resultados publicados de 2025;
   - remuneração de engenheiros × piso legal;
   - formação em engenharia em SP (INEP);
   - profissionais por 100 mil habitantes e participação feminina por UF (Confea × IBGE);
   - registros profissionais novos por ano.

## Fora do painel (decidido)

- Previsão da base.
- Fila de fiscalizações em aberto.
- Bolhas sobre o mapa.
- Títulos numerados de etapas.
- Score composto.

## Dados

- **Internos:** cenário demonstrativo do projeto.
- **Camadas derivadas, também demonstrativas:**
  - **fiscalização** (`src/painel/fiscalizacao.ts`): ações, autos, multas e regularizações;
  - **QSA e vínculos com salário** (`src/cockpit/cruzamentos.ts`);
  - **atendimento, coworking, capacitação e orçamento** (`src/cockpit/estrutura.ts`, sobre o modelo institucional).
- **Em produção:**
  - sistemas do CREA-SP;
  - dados abertos do CNPJ (situação, CNAE e QSA);
  - PNCP;
  - RAIS identificada ou eSocial, mediante acordo com o MTE, porque o dado público não traz CNPJ.
- **Dados públicos reais:** versionados em `src/cockpit/publico.ts`, com fonte e data de captura (selo "Real" em cada bloco).

Testes: `tests/cockpit.test.ts`, `tests/fiscalizacao.test.ts` e `tests/painel.test.ts`.

Para regerar: `npm run build:painel` → `entrega/painel-gestao-creasp.html`. É um arquivo único (código, fontes e malha municipal embutidos) que abre no navegador sem servidor nem internet.
