# Pacote Power BI

Os painéis deste repositório são protótipos; o destino é o Power BI. Para cada painel, `npm run build:powerbi` gera em `entrega/powerbi/<painel>/` uma pasta que o Power BI Desktop abre pelo `.pbip`: modelo em TMDL, medidas DAX, relatório PBIR com as páginas e o tema, e os CSV do cenário de demonstração. Por que assim: [ADR 0001](adr/0001-pacote-power-bi-gerado-do-cenario.md) e [ADR 0002](adr/0002-foto-mensal-para-estoques.md). Formatos e fontes da Microsoft: [pesquisa](pesquisa/powerbi-pbip.md). Hoje só o painel de Empresas tem pacote.

## Onde mora cada parte

| Arquivo | O que tem |
|---|---|
| `src/powerbi/pacote.ts` | A entrada: `pacotePowerBi(painel, dataset)` devolve todos os arquivos do pacote |
| `src/powerbi/tmdl.ts`, `pbir.ts`, `tema.ts`, `csv.ts` | Os formatos, iguais para todos os painéis |
| `src/powerbi/empresas/dados.ts` | As tabelas do cenário: dimensões, fotos de cada fim de mês e fatos com data; a lista dos blocos da página Vínculos |
| `src/powerbi/empresas/modelo.ts` | Colunas, relações e medidas DAX, em pastas por página; `CARTOES`, os cinco cartões de cada página com o tipo (estoque, fluxo, taxa) |
| `src/powerbi/empresas/paginas.ts` | Posição e campos de cada visual nas quatro páginas |
| `tests/powerbi-empresas.test.ts` | Schemas oficiais, referências e os cartões conferidos com o painel |
| `tests/fixtures/powerbi-schemas/` | Schemas oficiais baixados por `scripts/powerbi/baixar-schemas.mjs` |

## Quando o protótipo muda

Toda mudança num cartão ou gráfico do painel de Empresas leva a mudança ao pacote no mesmo PR:

1. Estoque ou taxa (situação num dia): a regra entra como coluna 0/1 da foto em `dados.ts`, calculada pelas funções do protótipo, e a medida só conta linhas da foto. Fluxo (soma no período): o fato com data entra em `dados.ts`, e a medida soma entre `[Início do período]` e `[Data escolhida]`.
2. A medida tem o nome do cartão, a pasta da página e uma descrição em português corrido, como a ficha (i). Bloco que depende de acordo leva "!" no nome da medida e no título do visual.
3. Cartão novo entra em `CARTOES` com o tipo: a medida "Variação em um ano: <cartão>" sai sozinha (em %, ou em pontos percentuais na taxa) e a página o monta com a variação embaixo. Sem tipo, o cartão fica sem variação, como o cadastro incompleto.
4. O cartão novo entra no par `cartoesDoPacote` e `cartoesDoPainel` do teste: o primeiro reproduz a regra da medida DAX sobre os CSV, e o segundo lê o número das funções do protótipo. Os dois precisam dar o mesmo número.
5. Rode `npm test` e `npm run build:powerbi` e faça o commit do pacote gerado.

## Cuidados

- O DAX não roda fora do Power BI. A única conferência das medidas é o espelho do teste, então o espelho e o DAX precisam dizer a mesma regra, linha a linha.
- Os nomes dos papéis dos visuais (`Category`, `Y`, `Values`, `Group`...) não têm documentação oficial; os usados vêm de arquivos salvos pelo Desktop. Quando o Caio confirmar no Desktop, a lista em `pbir.ts` vira fato.
- A variação dos cartões é contra um ano antes, como o painel faz, e não contra o período imediatamente anterior. A medida genérica troca a data pelo fim do mesmo mês um ano antes pela tabela oculta "Datas das fotos" (`[Data escolhida]` lê essa tabela quando ela está filtrada). As ARTs e o valor em ART seguem a regra própria do painel: início e fim recuados 12 meses, com `EDATE`.
- Ainda sem confirmação no Desktop: o `extendedProperty ParameterMetadata` que marca a tabela Período como parâmetro de intervalo numérico, e o modo `Single` (controle deslizante) da segmentação do período. Os dois vêm de arquivos salvos pelo Desktop, não da documentação.
- Pasta de página ou de visual só com `[A-Za-z0-9_-]`; fora disso o Desktop ignora a pasta sem avisar.
