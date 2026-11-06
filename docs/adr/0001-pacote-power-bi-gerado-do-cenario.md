# O pacote Power BI é gerado por código, a partir do mesmo cenário do protótipo

Os painéis são protótipos em HTML e serão implementados no Power BI, que não importa HTML. Decidimos (06/11/2026, pedido do Caio) gerar por código, para cada painel, um pacote Power BI: tabelas do cenário de demonstração em esquema estrela (CSV), medidas DAX e o modelo em TMDL dentro de um projeto PBIP, e o tema JSON. O pacote é gerado do mesmo cenário e das mesmas regras dos cartões, e um teste confere que as regras das medidas, reproduzidas sobre os CSV, dão os números dos cartões do protótipo (sem filtros, em cinco combinações de data e período), para o Power BI não divergir do que foi aprovado na tela.

## Considered Options

- **Refazer o painel à mão no Power BI Desktop, olhando o HTML.** Rejeitado: cada número teria de ser reconferido à mão, e as regras de estoque, fluxo e data de referência se perdem na tradução.
- **Entregar só o `.pbix`.** Rejeitado: é binário, não se gera fora do Windows, não se revisa no Git.
- **Visual HTML dentro do Power BI.** Rejeitado: não filtra com o resto do relatório e não respeita a regra de segurança por linha.

## Consequences

- O protótipo deve usar só blocos que têm visual equivalente no Power BI; o que não tiver vira Deneb (Vega-Lite) ou é redesenhado.
- Quando a base real chegar, troca-se a origem das tabelas (o parâmetro da pasta dos CSV vira a conexão com o banco); as medidas e o modelo ficam.
- O formato PBIP e o TMDL mudam de versão com o Power BI Desktop; o gerador acompanha (ver `docs/pesquisa/powerbi-pbip.md`).
