---
target_identity: "file:/home/user/empresas/profissionais.html"
target_fingerprint: "sha256:4eb5d6ba60e05e05d1007b305ecfaf49d1c4368e135dd8ed0d2a48c44c7d58e2"
target_path: /home/user/empresas/profissionais.html
timestamp: 2026-11-07T02-55-56Z
slug: profissionais-html
---
# Crítica de design do painel de Profissionais

Método: dois agentes separados, com a skill impeccable (`critique`). O agente A fez a revisão de design no navegador, testando o recorte vazio, o filtro de gênero, o teclado e a gaveta. O agente B rodou o detector automático e mediu a tela. As capturas foram feitas em 1920×1080 e 1366×768, nos temas claro e escuro. O painel já tinha recebido as correções comuns do PR #35: o anel de foco, o Esc, a gaveta, o "0%" neutro e a fonte mínima de 11px no CSS.

## Nota de saúde do design: 25 de 40 (aceitável)

| # | Heurística | Nota | Problema principal |
|---|---|---|---|
| 1 | O sistema mostra o que está acontecendo | 3 | As páginas Trabalho e Formação ignoram o período escolhido, sem avisar. |
| 2 | Linguagem do usuário | 2 | Aparecem códigos como "UE-TAU2" e textos herdados do Empresas ("busca uma empresa", "CNPJ"). |
| 3 | Controle e saída | 3 | O botão Voltar do navegador sai do painel. |
| 4 | Consistência | 2 | Os cartões e os gráficos da mesma página dão números diferentes para a mesma coisa. |
| 5 | Prevenção de erros | 2 | Os filtros levam a um recorte vazio sem aviso. |
| 6 | Reconhecer em vez de lembrar | 3 | As caixas de salário e a dispersão só se leem passando o mouse. |
| 7 | Atalhos | 3 | Há a tecla /, a exportação e o ampliar. |
| 8 | Estética e economia | 3 | O mapa de árvore tem mais de 30 células e sobra espaço abaixo do mapa. |
| 9 | Recuperação de erros | 1 | O recorte vazio desenha gráficos falsos. |
| 10 | Ajuda | 3 | As fichas (i) estão completas e trazem o plano B. |

## O que está bom

- As 5 páginas cabem em 1920×1080, sem rolagem, e não há erro no console.
- A gaveta prende o foco, o Esc devolve o foco e todo controle tem nome acessível.
- O filtro de gênero vale em todas as páginas, inclusive em Trabalho.
- Os blocos "!" trazem o que fazer se o acordo não sair.

## Problemas

**P0. O recorte vazio desenha gráficos falsos.** "Situação e anuidade" mostra quatro fatias iguais com 0%, "ART das perícias" mostra três retângulos com 0 e "Empresas por responsável técnico" mostra trilhos cheios. Os eixos repetem marcas ("1, 1, 1, 0, 0, 0") e a página Formação fica em branco. Correção: o aviso do Empresas, "Nenhum profissional neste recorte".

**P1**
1. **Números que não batem.** Na Evolução, os cartões dizem que 126 voltaram, 105 interromperam e 58 cancelaram, e a cascata diz +83, −67 e −54. Em ART e RT, o texto fala de 1.830 profissionais, e as barras somam 1.634.
2. **A lista de GRE do mapa ignora o recorte.** Com zero profissionais no rodapé, ela ainda mostra a GRE 5 com 16.
3. **Texto pequeno nos gráficos.** De 42% a 65% dos textos ficam abaixo de 11px. A maior parte está nos gráficos, a 9 e 10,5px.
4. **Gráficos sem número.**
   - Entradas e saídas mês a mês, Quantos continuam ativos, Emprego com carteira mês a mês e Formados e quantos se registram.
   - Salário por ocupação: a mediana só aparece passando o mouse.
5. **Contraste dos rótulos dentro das barras.**
   - Branco sobre azul-claro, com razão de 1,7:1, em Formados e registrados e no funil das perícias.
   - Branco sobre verde-menta no tema escuro, com 1,8:1.
   - Branco sobre laranja no calor de Atuação, de 2,4:1 a 3,4:1.
6. **Códigos e textos herdados.** Aparecem "UE-TAU2" e "FP-SAN", e nomes com número ("Otávio Moraes 1751"). O rodapé diz "A tecla / busca uma empresa" e a busca pede "nome, CNPJ, município".
7. **Legendas que faltam.**
   - Os anos 2024 e 2025 em cinza em Formados e quantos se registram.
   - As barras cinza de Empregos por ocupação.
   - Os dois azuis de ARTs a cada 100 ativos.

**P2**
1. **Textos cortados.** Os títulos de Formação, as células do mapa de árvore e a legenda do mapa de árvore, que vaza do bloco em 1366.
2. **Grade repetida.** Trabalho usa 5/4/3 nas duas linhas, e a segunda linha da Evolução é 6/6.
3. **Período fixo sem aviso.** Trabalho mostra 12 meses quando o seletor está em 3.
4. **Espaço mal usado.** Sobram cerca de 200px vazios abaixo do mapa. "Registro em 24 meses" usa um bloco grande para três barras.
5. **Em 1366, rótulos que colidem.** Os eixos do calor de idade e das caixas de salário se sobrepõem.
6. **Formatos misturados.** "0.8%" sai com ponto, "-32%" usa hífen e "−67" usa o sinal de menos.
7. **Títulos sem h2.** O título da página é h1 e os blocos são h3.

**Menores.** "Saldo do período +0" e "a idade típica é — anos". As faixas do mapa têm buraco ("10 a 48" e depois "53 a 1.004"). A Evolução mistura "em relação ao ano anterior" com "a um ano antes".

## Falsos positivos do detector

O traço à esquerda das fichas de parceria e de plano B é intencional. A sombra é a da ficha que se abre.
