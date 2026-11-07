# Pacote Power BI do painel de Gestão do Conselho

Gerado a partir do protótipo em HTML (repositório caiofvserra/empresas, `npm run build:powerbi`), com o cenário de demonstração até 30/09/2026. Os números são fictícios e servem para conferir o modelo e as telas, não o Crea-SP.

## Como abrir

1. Copie a pasta inteira para o computador com o Power BI Desktop (versão de 2026 ou mais nova).
2. Abra `Conselho.pbip`. O relatório abre sem dados.
3. Em Página Inicial > Transformar dados > Editar parâmetros, troque "Pasta dos dados" pelo caminho da pasta `dados` deste pacote, terminando com \\ (por exemplo `C:\\CREA-SP\\powerbi\\conselho\\dados\\`).
4. Clique em Atualizar.

## O que vem pronto

- O modelo em esquema estrela: regionais, municípios, câmaras, calendário, datas de referência e período; as fotos de cada fim de mês (processos em julgamento e recursos, plenário e profissionais ativos); e os fatos com data: processos, organizações e repasses às entidades.
- As medidas dos cartões e dos gráficos, em pastas com o nome de cada página, cada uma com a descrição de como é calculada.
- As duas páginas (Câmaras e plenário, Entidades e escolas). Os filtros no alto (regional, município, câmara, data de referência e período) ficam sincronizados entre elas, com o tema do Crea-SP. Os gráficos saem com rótulos de dados e legenda, para ler sem passar o mouse.
- Em cada cartão, como no painel: o número, a comparação (com um ano antes, ou com os 12 meses anteriores na despesa, nas diárias e nos repasses) e a linha de apoio.
- O período é um parâmetro do tipo "Intervalo numérico", de 1 a 36 meses, com controle deslizante. Os repasses usam sempre os 12 meses até a data, como no painel.

Os estoques (processos em julgamento, recursos, cadeiras, profissionais ativos) vêm da foto da data escolhida; os julgados e os repasses são somados no período. Na base real, a carga precisa gravar a foto todo fim de mês sem reescrever as anteriores.

A regra: o auto de infração prescreve cinco anos depois do fato (Lei 9.873/1999, art. 1º).

## O que falta montar no Desktop

A escala de cor da matriz "Há quanto tempo esperam julgamento": em Formatar > Elementos da célula, ligue a Cor da tela de fundo e escolha a escala de cor. Os números já aparecem nas células.

Ficam só no painel em HTML: as escolas pelos formados e pelo registro (Censo da Educação Superior).

Os arquivos seguem os schemas oficiais da Microsoft, mas os nomes internos dos campos de alguns visuais (cartão, barras, linha, tabela) não são documentados. Se um visual abrir vazio, arraste de novo a medida para ele e salve: o Desktop corrige o arquivo.

## Trocar pela base real

Troque a origem de cada tabela (Transformar dados) do CSV para a consulta da base do Crea-SP, mantendo os nomes das colunas. As medidas e as páginas continuam as mesmas.
