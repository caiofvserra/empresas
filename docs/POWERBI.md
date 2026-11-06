# Pacote Power BI

Os painéis deste repositório são protótipos; o destino é o Power BI. Para cada painel, `npm run build:powerbi` gera em `entrega/powerbi/<painel>/` uma pasta que o Power BI Desktop abre pelo `.pbip`: modelo em TMDL, medidas DAX, relatório PBIR com as páginas e o tema, e os CSV do cenário de demonstração. Por que assim: [ADR 0001](adr/0001-pacote-power-bi-gerado-do-cenario.md) e [ADR 0002](adr/0002-foto-mensal-para-estoques.md). Formatos e fontes da Microsoft: [pesquisa](pesquisa/powerbi-pbip.md). Hoje só o painel de Empresas tem pacote; com um caminho no argumento (`npm run build:powerbi -- <arquivo.zip>`), o script grava também o zip, com os nomes em UTF-8.

## Onde mora cada parte

| Arquivo | O que tem |
|---|---|
| `src/powerbi/pacote.ts` | A entrada: `pacotePowerBi(painel, dataset)` devolve todos os arquivos do pacote; `PAINEIS` liga cada painel ao seu modelo, páginas e dados |
| `src/powerbi/tmdl.ts`, `pbir.ts`, `tema.ts`, `csv.ts` | Os formatos, iguais para todos os painéis |
| `src/powerbi/empresas/dados.ts` | As tabelas do cenário: dimensões, fotos de cada fim de mês e fatos com data; `COLUNAS_FOTO_EMPRESAS`, as colunas da foto; os blocos da página Vínculos com os acordos de que dependem |
| `src/powerbi/empresas/modelo.ts` | Colunas, relações e medidas DAX, em pastas por página; `CARTOES`, os cinco cartões de cada página com a comparação e a linha de apoio |
| `src/powerbi/empresas/paginas.ts` | Posição e campos de cada visual nas quatro páginas |
| `tests/powerbi-empresas.test.ts` | Schemas oficiais, referências, os cartões, a variação em um ano e os gráficos conferidos com o painel |
| `tests/fixtures/powerbi-schemas/` | Schemas oficiais baixados por `scripts/powerbi/baixar-schemas.mjs` |

## Quando o protótipo muda

Toda mudança num cartão ou gráfico do painel de Empresas leva a mudança ao pacote no mesmo PR:

1. Estoque ou taxa (situação num dia): a regra entra como coluna da foto em `COLUNAS_FOTO_EMPRESAS` e no laço de `dadosEmpresas`, calculada pelas funções do protótipo, e a medida só conta linhas da foto. Fluxo (soma no período): o fato com data entra em `dados.ts`, e a medida soma entre `[Início do período]` e `[Data escolhida]`.
2. A medida tem o nome do cartão, a pasta da página e uma descrição que começa por um verbo, como a ficha (i). Bloco que depende de acordo leva "!" no nome da medida e no título do visual (`comMarca`), e a descrição sai de `fichaDoAcordo`, com o acordo e o plano B de `parcerias.ts`.
3. Cartão novo entra em `CARTOES` com a comparação e a linha de apoio do painel. Com `serie` e sem `medida`, a medida "Variação em um ano: <cartão>" sai sozinha (em %, ou em pontos percentuais na taxa); `medida` aponta para outra comparação (a meta, os meses do gráfico). As medidas de texto "Comparação: <cartão>" e "Detalhe: <cartão>" são as linhas do cartão de várias linhas.
4. O cartão novo entra no par `cartoesDoPacote` e `cartoesDoPainel` do teste, e a variação em `COMPARADOS`: o primeiro reproduz a regra da medida DAX sobre os CSV, e o segundo lê o número das funções do protótipo. Os dois precisam dar o mesmo número. Gráfico novo ganha o seu teste contra a função do protótipo, como o funil, a matriz de capital e a economia.
5. Rode `npm test` e `npm run build:powerbi` e faça o commit do pacote gerado.

## Cuidados

- O DAX não roda fora do Power BI. A única conferência das medidas é o espelho do teste, então o espelho e o DAX precisam dizer a mesma regra, linha a linha.
- Os nomes dos papéis dos visuais (`Category`, `Y`, `Values`, `Group`...) não têm documentação oficial; os usados vêm de arquivos salvos pelo Desktop. Quando o Caio confirmar no Desktop, a lista em `pbir.ts` vira fato.
- A variação dos cartões é contra um ano antes, como o painel faz, e não contra o período imediatamente anterior. A medida genérica troca a data pelo fim do mesmo mês um ano antes pela tabela oculta "Datas das fotos" (`[Data escolhida]` lê essa tabela quando ela está filtrada). As ARTs e o valor em ART seguem a regra própria do painel: início e fim recuados 12 meses, com `EDATE`.
- Ainda sem confirmação no Desktop: o `extendedProperty ParameterMetadata` que marca a tabela Período como parâmetro de intervalo numérico, e o modo `Single` (controle deslizante) da segmentação do período. Os dois vêm de arquivos salvos pelo Desktop, não da documentação.
- Pasta de página ou de visual só com `[A-Za-z0-9_-]`; fora disso o Desktop ignora a pasta sem avisar.
- Os gráficos saem com rótulos de dados e legenda (`GRAFICOS` em `pbir.ts`). A escala de cor das matrizes é formatação condicional, que se liga no Desktop (passo no LEIA-ME).
- O "RT que saiu sem substituto" e a permanência ficam fora do teste da variação em um ano: a série mês a mês do painel recalcula os meses passados com a base de hoje, e a foto guarda o que o cartão mostrava em cada mês. No protótipo, a variação desses dois cartões pode diferir da do Power BI; vale a do Power BI.
- No protótipo, o gráfico de economia só segue a câmara quando ela é escolhida (`useRitmo`); no Power BI, ele segue todos os filtros da tabela Empresas. As abertas na Receita seguem o recorte pela matriz, como os estabelecimentos do mercado.
