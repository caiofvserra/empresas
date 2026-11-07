# Pacote Power BI do painel de Gestão do Conselho

Gerado a partir do protótipo em HTML (repositório caiofvserra/empresas, `npm run build:powerbi`), com o cenário de demonstração até 30/09/2026. Os números são fictícios e servem para conferir o modelo e as telas, não o Crea-SP.

## Como abrir

1. Copie a pasta inteira para o computador com o Power BI Desktop (versão de 2026 ou mais nova).
2. Abra `Conselho.pbip`. O relatório abre sem dados.
3. Em Página Inicial > Transformar dados > Editar parâmetros, troque "Pasta dos dados" pelo caminho da pasta `dados` deste pacote, terminando com \\ (por exemplo `C:\\CREA-SP\\powerbi\\conselho\\dados\\`).
4. Clique em Atualizar.

## O que vem pronto

- O modelo em esquema estrela: regionais, municípios, colegiados (o Plenário e as nove câmaras), pessoas, calendário, datas de referência e período; as fotos de cada fim de mês (a fila do Votenet e as cadeiras e os profissionais de cada câmara); e os fatos com data: tramitações, idas à pauta e desvios, mandatos, presenças nas sessões, diárias dos conselheiros, autos de infração, pagamentos às organizações e deliberações de repasse.
- As medidas dos cartões e dos gráficos, em pastas com o nome de cada página, cada uma com a descrição de como é calculada.
- As cinco páginas (Colegiado, Processos, Conselheiros, Decisões e Representação). Os filtros no alto (regional, município, colegiado, data de referência e período) ficam sincronizados entre elas, com o tema do Crea-SP. Os gráficos saem com rótulos de dados e legenda, para ler sem passar o mouse.
- Em cada cartão, como no painel: o número, a comparação com um ano antes (quando o painel tem) e a linha de apoio.
- Os nomes: com quem está cada processo, o relator dos autos perto da prescrição, quem recebeu diária e quem propôs cada repasse. No cenário, os nomes são fictícios.
- O período é um parâmetro do tipo "Intervalo numérico", de 1 a 36 meses, com controle deslizante. As diárias e os repasses usam sempre os 12 meses até a data, como no painel.

O colegiado escolhido recorta os processos e os conselheiros; a regional e o município recortam só os processos (e os autos, que também são processos), pelo lugar do processo, porque o conselheiro representa uma modalidade, e não uma regional. Com o Plenário escolhido, os processos são os recursos, estão todos os conselheiros e as decisões são as dos autos que chegaram a ele.

A fila, os conselheiros em exercício e as cadeiras vêm da data escolhida; os votados, os relatos, as sessões, os autos e as deliberações são somados no período. Na base real, a carga precisa gravar a foto todo fim de mês sem reescrever as anteriores.

As regras: o alerta é amarelo de 90 a 120 dias no mesmo status do Votenet e vermelho acima de 120. O auto de infração prescreve cinco anos depois do fato (Lei 9.873/1999, art. 1º) ou com três anos parado no mesmo status (a intercorrente, art. 1º, § 1º), o que vier primeiro; no Plenário, só corre a intercorrente. A multa vem em dobro na reincidência (Lei 5.194/66, art. 73, parágrafo único).

## O que falta montar no Desktop

A ordem e o tamanho das listas: no gráfico "Com quem estão os processos" e no "Menor presença nas sessões", use o filtro N superior do visual (as dez pessoas com mais processos; os dez conselheiros com menor presença, em ordem crescente). Na tabela da fila, clique no título "Dias no status" para pôr o mais parado no alto; na de diárias, no título "Valor".

As cores do alerta: no gráfico "Com quem estão os processos", em Formatar > Colunas, pinte Vermelho, Amarelo e Sem alerta. Na matriz "Há quanto tempo estão no status", em Formatar > Elementos da célula, ligue a Cor da tela de fundo e escolha a escala de cor.

O gráfico da carga e do tempo de relato de cada conselheiro, que no painel é de dispersão, vem como tabela, com os processos e a presença de cada um. O tempo de relato de cada conselheiro fica só no painel em HTML; no pacote, ele aparece no cartão e no gráfico por trimestre.

Os arquivos seguem os schemas oficiais da Microsoft, mas os nomes internos dos campos de alguns visuais (cartão, barras, linha, tabela) não são documentados. Se um visual abrir vazio, arraste de novo a medida para ele e salve: o Desktop corrige o arquivo.

## Trocar pela base real

Troque a origem de cada tabela (Transformar dados) do CSV para a consulta da base do Crea-SP, mantendo os nomes das colunas. As medidas e as páginas continuam as mesmas.
