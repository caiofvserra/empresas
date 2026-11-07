import { FOTOS, VISUAIS } from '../gestao/leia-me';

/* As seções do LEIA-ME do pacote do painel da Presidência: o que vem pronto e o que falta montar no Power BI Desktop. */
export const LEIA_ME_PRESIDENCIA = `## O que vem pronto

- O modelo: regionais, municípios, câmaras, indicadores, datas de referência e meses da série; a foto de cada fim de mês com os indicadores dos seis painéis (Empresas, Profissionais, Fiscalização, Financeiro, Atendimento e Gestão do Conselho), em partes, pelo lugar e pela câmara; e os dados públicos reais da página No país (Confea, IBGE e Portal da Transparência).
- Uma medida por indicador, com o formato da unidade, e a série de 13 meses de cada um. As medidas [Numerador] e [Denominador] leem a foto com a mesma regra do painel em HTML.
- As quatro páginas (Resumo, Regionais, Riscos e No país). Os filtros no alto (regional, município, câmara e data de referência) ficam sincronizados entre as páginas, com o tema do Crea-SP. Os gráficos saem com rótulos de dados e legenda, para ler sem passar o mouse.
- Em cada cartão, como no painel: o número, a comparação com um ano antes e a linha de apoio (a meta, quando o indicador tem).

Como cada número segue o recorte: os indicadores que o painel de origem conhece por município somam os municípios; os que ele só conhece por regional (atendimento e as contagens de empresas) seguem a regional do município escolhido; a receita e o orçamento são do Conselho inteiro. A câmara só vale para os indicadores que o painel de origem divide por câmara; a dívida de anuidades e o atendimento ficam do Conselho inteiro com qualquer câmara.

Os fluxos (ARTs, registros novos, ações, autos, multas, receita, solicitações e processos votados) somam os 12 meses até a data, o período padrão do painel. ${FOTOS}

As metas são as padrão do painel (parte do mercado registrada 65%, empresas com responsável técnico 95%, anuidade em dia 60%, regularização 50% e atendimento no prazo 80%). Para trocar, edite a coluna Meta da tabela Indicadores.

## O que falta montar no Desktop

O mapa por município da página Regionais: insira o visual Mapa de formas; em Formatar > Configurações do mapa > Mapa personalizado, carregue \`mapas/sp-municipios.json\`; ponha Municípios[Município] em Local e a medida do indicador que quiser (por exemplo "Parte do mercado registrada") em Saturação de cor.

As cores da tabela "Cada regional em cada indicador": em Formatar > Elementos da célula, ligue a Cor da tela de fundo. No HTML, as taxas com meta ficam verdes na meta e vermelhas fora dela.

A página O que vence primeiro do HTML (a lista nominal de prazos e o calendário de 12 meses) fica só no painel em HTML: os prazos vêm das bases de cada painel temático, que têm o seu próprio pacote.

${VISUAIS}

`;
