---
target_identity: "file:/home/user/empresas/fiscalizacao.html"
target_fingerprint: "sha256:d67f10c081debee5d37b2ddd03123e18afef34d5f1e20aec9e9d00eb1200006d"
target_path: /home/user/empresas/fiscalizacao.html
timestamp: 2026-11-07T03-27-34Z
slug: fiscalizacao-html
---
# Crítica de design do painel de Fiscalização e malha fina

Método: dois agentes separados, com a skill impeccable (`critique`). O agente A fez a revisão de design no navegador. Ele testou o recorte vazio (GRE 14, Química e 3 meses), a gaveta, o Esc, o Tab e a largura de 1366 px. O agente B rodou o detector automático e mediu a tela. As capturas foram feitas em 1920×1080 e 1366×768, nos temas claro e escuro. O painel já tinha as correções comuns dos PRs #35 e #37 no CSS (anel de foco, Esc, gaveta, "0%" neutro, fonte mínima de 11px fora dos gráficos).

## Nota de saúde do design: 22 de 40 (aceitável)

| # | Heurística | Nota | Problema principal |
|---|---|---|---|
| 1 | O sistema mostra o que está acontecendo | 2 | No recorte vazio, a maior parte dos blocos fica em branco sem aviso. |
| 2 | Linguagem do usuário | 2 | Aparecem códigos (FT-01) e termos técnicos ("candidato", "contexto"), e o CNPJ sai sem máscara na gaveta. |
| 3 | Controle e saída | 3 | O Esc, o foco preso na gaveta e o x dos filtros funcionam. |
| 4 | Consistência | 2 | O laranja tem quatro sentidos, e o trimestre sai por extenso. |
| 5 | Prevenção de erros | 1 | Os números do cartão não batem com os do gráfico ao lado. No vazio, a página tranquiliza sem base. |
| 6 | Reconhecer em vez de lembrar | 2 | As linhas não têm valores escritos, e várias cores não têm legenda. |
| 7 | Atalhos | 3 | Há o seletor do mapa, o clique para detalhar, o CSV e a tecla /. |
| 8 | Estética e economia | 3 | A tela é compacta, mas há vazios no mapa, em "Nome de engenharia" e na rosca do fornecedor. |
| 9 | Recuperação de erros | 1 | Nenhum bloco usa o aviso de recorte vazio. |
| 10 | Ajuda | 3 | O (i) traz as limitações, o rito e o plano B das parcerias. |

## O que está bom

- As 5 páginas cabem em 1920×1080 e em 1366×768, sem rolagem, e não há erro no console.
- A gaveta prende o foco, o Esc devolve o foco e todo controle tem nome acessível. Os 27 gráficos têm nome acessível.
- As fichas com "!" trazem o que fazer se o acordo não sair e a ressalva de que a ação pode não ter sido a causa.
- Fora dos gráficos, todo texto passa de 4,5:1 nos dois temas.

## Problemas

**P0**
1. **O recorte vazio desenha gráficos falsos.** Aparecem 24 barras zeradas, roscas cinza com "R$ 0", gráficos só com a legenda e um quadrado laranja gigante em "Empresas apontadas por cada regra". Correção: o aviso comum, como no Empresas e no Profissionais.
2. **Mensagem enganosa no vazio.** Com zero contratos, a lista diz "Todos os contratos do recorte têm ART encontrada ou provável". O mesmo acontece com as obras.
3. **Variação sem sentido com o filtro de câmara.** Na malha fina, o cartão mostra 0 e "+50% em relação a um ano antes", porque o histórico ignora a câmara.

**P1**
1. **Números que não batem.**
   - O cartão de 180 dias diz "em relação ao trimestre anterior", mas compara com o mesmo trimestre do ano anterior.
   - "Dias até a primeira ação 111" contra medianas de 35 a 59 nas caixas, porque o cartão conta os que ainda esperam.
   - "Regularizações 158" ao lado de "43% das ações", que são 118 ações.
   - "Obras privadas sem ART 116" conta empresas, e não obras.
   - O contratado do Tribunal de Contas (R$ 1,1 bi) aparece ao lado do contratado de todos os contratos (R$ 1,2 bi).
2. **Cores sem legenda.**
   - O laranja de "Quem ganha os contratos técnicos" não tem legenda.
   - Há uma cor por barra, sem sentido, em "Registro ativo de empresa fechada", "O que os órgãos planejam", "Quanto já foi pago" e "Obras privadas e a ART".
   - Em "ARTs por profissional", a pergunta promete laranja, mas o "6 ou mais" sai azul.
   - Em "Empresa que fecha e outra que abre", a legenda mostra uma série que não existe.
3. **Texto pequeno nos gráficos.** De 31% a 58% dos textos ficam abaixo de 11px, entre 9 e 10,5px.
4. **Contraste dos rótulos dentro das barras.**
   - No escuro, 66 rótulos ficam abaixo de 3:1 em 6 blocos, por exemplo branco sobre verde-menta (1,8:1).
   - No claro, branco sobre âmbar dá 2,7:1, e o "candidato" em âmbar sobre branco também dá 2,7:1.
5. **Gráficos que exigem passar o mouse.**
   - As linhas de autos e de regularizações não têm valores.
   - As pontas de "A malha fina mês a mês" se sobrepõem.
6. **Códigos e "·" no texto visível.** Aparecem "FT-01, de abr/25 a jun/25 · 38 ações · fechada", "787 · 53% sem ação" e "R$ 161,3 mil · 33%". Na gaveta, "Rotina de campo · notificada".
7. **Em 1366 px.**
   - Os nomes Baixada, Inapta e Suspensa somem.
   - A legenda da malha mês a mês cobre o eixo.
   - Os rótulos das roscas e 10 títulos de bloco saem cortados.

**P2**
1. **Faixas do mapa que se sobrepõem.** Aparecem "4 a 8" e "8", e no vazio a legenda mostra "0 | 0 | 0 | 0 a 2".
2. **Trimestre por extenso.** Sai "4º trimestre 2024", e não "4º tri/24".
3. **Filtro ignorado sem aviso.** "O que os órgãos planejam" não segue o filtro e não avisa.
4. **Rodapé fora de contexto.** O rodapé mostra "276 ações" também em Contratos e em Obras.
5. **A malha mês a mês demora.** Fica cerca de 8 s em "Calculando".

**Menores**
- Aparece "1 profissionais passaram de 6 ARTs", quando o profissional tem exatamente 6.
- A gaveta diz "Registro não localizado", e o gráfico diz "Falta de registro".

## Falsos positivos do detector

- A sombra é a da ficha que se abre.
- O h4 é o título da ficha dentro do `<details>` fechado.
- O contraste do menu lateral foi lido sobre um fundo transparente.
- O detector não lê TSX, então o resultado vazio no código não vale como limpo.
