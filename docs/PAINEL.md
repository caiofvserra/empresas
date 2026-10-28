# Painel de gestão de empresas — página única (V16)

Uma tela de PC (1920×1080 e 1366×768), sem abas. A V16 junta o visual da V14 (previsão, funil em fluxo, mapa interativo, comparação ano a ano) com a curadoria da V15 (só indicadores que levam a uma decisão). O detalhe abre num painel lateral ao clicar, com a lista de empresas para agir.

## Organização: três grupos lado a lado

Cada grupo abre com seus números e segue com os gráficos do mesmo assunto. A ordem e o tamanho seguem o peso da decisão.

| Grupo | Números | Gráficos | Por que está aqui |
|---|---|---|---|
| **Receita** (à esquerda, maior) | Arrecadação de empresas e variação contra o ano anterior; saldo vencido e % de empresas em atraso; dívida antiga recuperada contra a meta | Arrecadação mês a mês (barras) contra os mesmos meses do ano anterior (linha), com a variação sobre cada barra; dívida por idade | Receita de anuidades PJ é a primeira preocupação da administração. A idade da dívida diz o que ainda é recuperável |
| **Base e conformidade** | Empresas registradas e variação; CNPJs sem registro e potencial em anuidades; empresas sem RT | Base de empresas em 24 meses com projeção de 6 meses; funil "empresas de engenharia → registradas → com RT" | Mostra quantas empresas temos, quantas deveriam estar registradas e quantas cumprem a exigência de RT, no mesmo desenho |
| **Onde agir** | Fiscalizações em aberto e % há mais de 1 ano; prazo mediano de CAO | Mapa de atuação com quatro lentes e ranking das regionais | Junta no território os problemas dos outros grupos e a fila de fiscalização |

## Mapa de atuação: quatro lentes com a mesma regra

Em todas as lentes, **tamanho da bolha = quantidade do problema** e **cor = proporção do problema** (verde menor, vermelho maior). Assim, bolha grande e vermelha sempre quer dizer "muito e intenso".

| Lente | Tamanho | Cor | Lista ao clicar |
|---|---|---|---|
| Registro | CNPJs de engenharia sem registro | % sem registro | CNPJs sem registro |
| Inadimplência | Saldo vencido | % das empresas em atraso | Maiores devedores |
| Responsável técnico | Empresas sem RT | % das ativas sem RT | Empresas sem RT |
| Fiscalização | Casos em aberto | % há mais de 1 ano | Casos mais antigos |

O ranking abaixo do mapa ordena as regionais pela quantidade do problema e pinta de vermelho as que têm proporção acima da média. Clicar no nome filtra a página pela regional; clicar na barra abre a lista de empresas.

## O que ficou de fora e por quê

- Permanência condicional, continuidade de RT em dias-empresa, ingresso observado: medidas técnicas que não mudam a ação.
- Emprego RAIS/CAGED, valores PNCP, fornecedores públicos, vínculo contrato–ART: contexto de mercado, sem ação direta.
- Dados públicos nacionais (Confea, IBGE, Banco Central): comparação, não gestão. Continuam na V14 (app principal, `npm run dev`).
- Qualidade cadastral e ARTs por mês: interessam à equipe de cadastro, não à administração.

## Cuidados de leitura

- Valores internos são demonstrativos. A alta de arrecadação contra o ano anterior (+173%) e a parcela sem RT (74%) vêm do gerador de dados, que concentra cobranças em 2026; com dados reais esses números mudam.
- "CNPJs sem registro" conta estabelecimentos; os demais indicadores contam empresas (CNPJ raiz). CNAE não prova obrigação de registro: confirmar a atividade antes de autuar.
- O mapa mostra só os 24 municípios da amostra demonstrativa; em produção, os 645.

## Acesso

`entrega/painel-gestao-creasp.html` é um arquivo único (código, fontes e malha municipal embutidos): abre no navegador, sem servidor nem internet. Para regerar: `npm run build:painel`.
