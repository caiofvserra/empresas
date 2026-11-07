# Pacote Power BI

Os painéis deste repositório são protótipos; o destino é o Power BI. Para cada painel, `npm run build:powerbi` gera em `entrega/powerbi/<painel>/` uma pasta que o Power BI Desktop abre pelo `.pbip`: modelo em TMDL, medidas DAX, relatório PBIR com as páginas e o tema, e os CSV do cenário de demonstração. Por que assim: [ADR 0001](adr/0001-pacote-power-bi-gerado-do-cenario.md) e [ADR 0002](adr/0002-foto-mensal-para-estoques.md). Formatos e fontes da Microsoft: [pesquisa](pesquisa/powerbi-pbip.md). Hoje têm pacote os painéis de Empresas (`Empresas.pbip`, quatro páginas) e de Gestão do Conselho (`Conselho.pbip`, cinco páginas). Com um caminho no argumento (`npm run build:powerbi -- <arquivo.zip>`), o script grava também um zip com os pacotes de todos os painéis, cada um na sua pasta, com os nomes em UTF-8.

## Onde mora cada parte

| Arquivo | O que tem |
|---|---|
| `src/powerbi/pacote.ts` | A entrada: `pacotePowerBi(painel, dataset)` devolve todos os arquivos do pacote; `PAINEIS` liga cada painel ao seu modelo, páginas e dados |
| `src/powerbi/tmdl.ts`, `pbir.ts`, `tema.ts`, `csv.ts` | Os formatos, iguais para todos os painéis |
| `src/powerbi/comum.ts`, `layout.ts` | As peças comuns aos modelos (tipos de coluna, formatos, data e período escolhidos, medidas mês a mês, a máquina dos cartões com a variação em um ano) e a grade comum das páginas (título e filtros no alto, cartões, caixas de 12 colunas) |
| `src/powerbi/empresas/dados.ts` | As tabelas do cenário: dimensões, fotos de cada fim de mês e fatos com data; `COLUNAS_FOTO_EMPRESAS`, as colunas da foto; os blocos da página Vínculos com os acordos de que dependem |
| `src/powerbi/empresas/modelo.ts` | Colunas, relações e medidas DAX, em pastas por página; `CARTOES`, os cinco cartões de cada página com a comparação e a linha de apoio |
| `src/powerbi/empresas/paginas.ts`, `leia-me.ts` | Posição e campos de cada visual nas quatro páginas; as seções do LEIA-ME do pacote |
| `src/powerbi/conselho/` | O mesmo para o painel de Gestão do Conselho: `dados.ts` (receita, despesa, diárias por pessoa, pessoas, fornecedores, empenhos, contratos, títulos de anuidade e a foto da dívida, processos e a foto dos processos, plenário, entidades, repasses, solicitações e coworkings), `modelo.ts`, `paginas.ts` e `leia-me.ts` |
| `tests/powerbi-pacote.ts` | As conferências comuns: schemas oficiais, nomes de pasta, referências do DAX e dos visuais, chave única no lado "um" de cada relação, e a leitura dos CSV |
| `tests/powerbi-empresas.test.ts`, `powerbi-conselho.test.ts` | Cada pacote: as conferências comuns, os cartões refeitos dos CSV pela regra do DAX contra as funções do protótipo, a variação em um ano e os gráficos |
| `tests/fixtures/powerbi-schemas/` | Schemas oficiais baixados por `scripts/powerbi/baixar-schemas.mjs` |

## Quando o protótipo muda

Toda mudança num cartão ou gráfico de um painel com pacote leva a mudança ao pacote no mesmo PR. Os passos abaixo citam o painel de Empresas; no de Gestão do Conselho, os arquivos são os de `src/powerbi/conselho/` e o teste é `powerbi-conselho.test.ts`:

1. Estoque ou taxa (situação num dia): a regra entra como coluna da foto em `COLUNAS_FOTO_EMPRESAS` e no laço de `dadosEmpresas`, calculada pelas funções do protótipo, e a medida só conta linhas da foto. Fluxo (soma no período): o fato com data entra em `dados.ts`, e a medida soma entre `[Início do período]` e `[Data escolhida]`.
2. A medida tem o nome do cartão, a pasta da página e uma descrição que começa por um verbo, como a ficha (i). Bloco que depende de acordo leva "!" no nome da medida e no título do visual (`comMarca`), e a descrição sai de `fichaDoAcordo`, com o acordo e o plano B de `parcerias.ts`.
3. Cartão novo entra em `CARTOES` com a comparação e a linha de apoio do painel. Com `serie` e sem `medida`, a medida "Variação em um ano: <cartão>" sai sozinha (em %, ou em pontos percentuais na taxa); `medida` aponta para outra comparação (a meta, os meses do gráfico). As medidas de texto "Comparação: <cartão>" e "Detalhe: <cartão>" são as linhas do cartão de várias linhas.
4. O cartão novo entra no par `cartoesDoPacote` e `cartoesDoPainel` do teste, e a variação em `COMPARADOS` (no Conselho, na parte `antes` de `cartoesDoPainel`): o primeiro reproduz a regra da medida DAX sobre os CSV, e o segundo lê o número das funções do protótipo. Os dois precisam dar o mesmo número. Gráfico novo ganha o seu teste contra a função do protótipo, como o funil, a matriz de capital e a economia.
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
- No painel de Gestão do Conselho, a despesa, as diárias, os fornecedores e os repasses usam sempre os 12 meses até a data, e a comparação é com os 12 meses anteriores, como no protótipo; os outros fluxos seguem o período. Os repasses contam 365 dias para trás, e não meses.
- Ainda no Conselho, o pessoal não se liga às regionais (as diárias já se ligam a elas e às pessoas, e um segundo caminho deixaria o modelo ambíguo): as medidas de pessoal filtram a lotação pelo nome da GRE com `TREATAS`. Com uma regional escolhida, "Em atividades-fim", a despesa por natureza e o gráfico de atividade-fim e atividade-meio contam só a despesa lançada nela; o protótipo soma também a da sede (e o gráfico anual ignora a regional). Com uma câmara escolhida, o gráfico do plenário mostra só ela; o do protótipo mostra todas.
- Organizações, solicitações e coworkings se ligam às regionais, e não aos municípios, como o painel faz: escolher um município mostra os da regional dele.
- Os usuários dos coworkings só se conferem na data de hoje: o cenário sorteia de novo quem usou cada mesa a cada data lida, e as horas não mudam. Na base real, o uso é um fato.
- Ficam só no HTML: as curvas de recebimento por safra, a despesa publicada por profissional ativo (dados reais de outro arquivo) e as escolas pelo Censo da Educação Superior. Os dois mapas por município são caixas "A montar", com o passo no LEIA-ME.
