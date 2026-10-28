# Identidade e acessibilidade do canvas empresarial — V13

A aplicação usa as cores, famílias tipográficas e papéis informados pelo usuário. A origem é a transcrição fornecida de outro sistema CREA; não houve leitura de um arquivo Figma nem validação da biblioteca original. A referência foi reaproveitada para um relatório de inteligência empresarial do CREA-SP.

## Fonte única de tokens

`src/enterprise-v11/design-tokens.css` contém cores, papéis, tipografia, espaçamento, sombras e camadas. O canvas é claro (`surface=#F8F8F8`), os gráficos usam superfície branca e o cabeçalho/faixa principal usam azul CREA. O amarelo destaca valores e a ação principal, sempre com texto escuro quando é fundo.

| Família | Pure | Light | Dark | Lighter |
|---|---|---|---|---|
| Primary | #082D74 | #163E8C | #01224D | — |
| Secondary | #FABD07 | #FFD148 | #E0AB0C | #FFFEDB |
| Tertiary | #3182CE | #639CE0 | #246FB5 | #D4EDFF |

A rampa gray-100..900, as três variantes de Info, Success, Warning e Danger e os neutros preto/branco também estão declarados. Status não deve ser aplicado como conclusão automática de infração. Um universo sem correspondência não recebe aparência de condenação.

Papéis principais: `surface` gray-100, `surface-raised` branco, `text` gray-900, `text-muted` gray-700 e `border` gray-300. Gray-600 não é usado para texto normal em superfície clara.

## Contraste

Razões recalculadas pela luminância relativa sRGB, sem arredondamento intermediário:

| Par | Razão |
|---|---:|
| Texto #1A202C / superfície #F8F8F8 | 15,37:1 |
| Texto secundário #3B4453 / superfície #F8F8F8 | 9,25:1 |
| Branco / azul primário #082D74 | 12,82:1 |
| Branco / azul escuro #01224D | 15,70:1 |
| Texto escuro #1A202C / amarelo #FABD07 | 9,59:1 |
| Branco / success-dark #007061 | 6,02:1 |
| Branco / danger-dark #A81919 | 7,45:1 |
| Branco / info-dark #113F63 | 10,97:1 |
| Branco / amarelo #FABD07 — não usar para texto normal | 1,70:1 |
| Gray-600 / superfície — não usar para texto normal | 3,78:1 |

Isso valida os pares declarados, não substitui a inspeção de todos os estados, áreas de gráfico, tooltips e gráficos personalizados no Power BI. Cores puras de status não herdam automaticamente a aprovação de suas variantes dark.

## Fontes locais

A aplicação não depende de chamada ao Google Fonts em execução. `public/fonts/` contém:

- `Lato-Regular.woff`, peso 400.
- `Lato-Bold.woff`, peso 700.
- `Raleway-Variable.woff`, eixo `wght` de 100 a 900.
- Licenças `OFL-Lato.txt` e `OFL-Raleway.txt`.
- `manifest.json`, com fontes oficiais de obtenção, hashes e tamanhos.

Os binários vêm do repositório oficial Google Fonts e foram reduzidos com FontTools a Latin e Latin Extended, marcas combinantes, sinais e moedas usados pela interface. O contêiner entregue é WOFF, com `font-display: swap`; a família variável preserva o eixo de peso. Lato não pressupõe arquivo 600: só existem os pesos locais 400 e 700. A pilha mono é de sistema, não uma fonte atribuída ao Figma.

| Uso | Família | Escala |
|---|---|---|
| Título principal | Raleway 700 | 24 px; 28 px em tela ampla |
| Títulos de gráfico | Raleway 700 | 14–18 px, adaptação de densidade BI |
| Texto explicativo e definições | Lato 400 | 14 px |
| Legenda de leitura sob gráfico | Lato 400 | 12 px, até duas linhas previstas |
| Controles/labels compactos | Lato 400/700 | 11–12 px na resolução de PC |
| Valores | Lato 700 | 22–36 px conforme importância/resolução |

Identificações curtas de origem usam 10 px na resolução compacta; o nome do indicador continua em 11 px e a legenda de leitura em 12 px. As adaptações compactas são derivadas para o canvas; não são apresentadas como estilos extraídos do Figma. Os nomes mantêm instituição e unidade claras. Notas técnicas de origem ficam na definição/ajuda, em vez de uma linha minúscula truncada.

## Espaçamento e elevação

Os tokens nomeados usam 8, 16, 24 e 32 px. Ajustes de 4 px ou menores servem a ícones, separadores e alinhamento interno do BI. A sombra de referência é `0 0 10px rgba(0,0,0,.16)`, com `sm` e `lg` derivados. O canvas usa `sm` para não competir com a informação.

Os valores de radius e camadas do outro sistema não foram enviados. Foram explicitamente derivados para este protótipo: radius 4/8/12/16/full; camadas base, gráfico, dropdown, overlay, drawer e notice. Não se afirma que reproduzem os valores legados F1.01.

## Reprodução no Power BI

`integrations/powerbi-theme-creasp-v13.json`, também disponível em `public/themes`, transfere a paleta clara e classes tipográficas. O tema passou na validação do schema oficial Microsoft `reportThemeSchema-2.157.json`, sem erros; a importação no Desktop não foi testada. O tema não converte CSS, filtros, modelo ou medidas. Fontes customizadas exigem teste no Desktop, no Service e nos clientes institucionais; servir fontes pela aplicação React não as embute automaticamente no Power BI. Homologar uma alternativa nativa caso o ambiente não disponibilize Lato/Raleway.

A dimensão da página e os estados de alternância/ampliação continuam a ser definidos por layouts, parâmetros e bookmarks. Legendas de leitura, unidades e tooltips de definição devem permanecer legíveis no ajuste à página de 1366×768 e 1920×1080.
