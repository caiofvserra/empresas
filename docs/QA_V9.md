# Validação visual CREA-SP V9

Concluída em 13/10/2026 sobre a distribuição compilada V9, servida localmente em `4173`. A revisão modifica a apresentação, preservando o modelo relacional, os cortes, as fórmulas e as regras analíticas da V8. A circunscrição continua sendo o CREA-SP / Estado de São Paulo.

## Resultados

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| Navegação e interações após a revisão visual | 12 cenários aprovados; zero erros JavaScript, console ou HTTP | `validation/visual-v9/report.json` |
| Canvas de PC | Sete páginas em 1920×1080 e 1366×768: 14 vistas sem rolagem do documento, sobreposição ou recorte dos indicadores/painéis | Screenshots e geometria no relatório |
| Responsividade | 21 vistas em 1024×768, 768×1024 e 390×844 sem overflow horizontal | Relatório; screenshots de 390 px |
| Áreas dos gráficos | 72 áreas nos canvases de PC; menor altura útil de 138 px | Geometria dos painéis |
| Contraste de títulos, marca, navegação ativa e números | 94 textos medidos: mínimo de 4,40:1 para texto grande e 4,76:1 para texto normal | `validation/visual-v9/contrast.json` |
| TypeScript e distribuição | `npm run build` aprovado, 2.219 módulos | Build V9 |
| Tema Power BI | JSON válido contra o schema oficial Microsoft `reportThemeSchema-2.157.json`; zero erros | `validation/powerbi-theme-v9/report.json` |

A navegação pelas sete páginas constitui um cenário; as 35 vistas estão agrupadas em dois cenários de geometria. Os 12 cenários não são 35 testes adicionais. A suíte de 165 testes de domínio da V8 não foi repetida nesta revisão de apresentação; sua validação permanece em [QA.md](QA.md).

O relatório final consolida 11 cenários da execução completa e a reexecução direcionada de contraste. A premissa inicial do harness considerava o ponto azul mais claro de toda a faixa de cinco KPIs, embora esse ponto estivesse fora da área do texto “Prévia privada”. A correção projeta a caixa do texto sobre o degradê do seu ancestral, considera as cores efetivamente pintadas naquela área, compõe transparências e limita stops ao trecho visível. Nenhum estilo ou dado do produto foi alterado para resolver essa premissa. Os dois relatórios de origem e seus hashes SHA-256 são registrados em `provenance`; não houve nova repetição dos 35 canvases.

## Inspeção visual e preservação das interações

As imagens de Presidência, Fiscalização digital e Transparência foram inspecionadas em 1366×768. A faixa azul contínua de KPIs, os números dourados, a alternância de títulos escuros/claros e os degradês dos gráficos estabelecem hierarquia dentro de uma tela. A engrenagem/compasso e a malha de desenho técnico permanecem em áreas de identidade e fundo, sem ocultar dados nem capturar cliques. Transparência diferencia a base normativa escura do catálogo claro e conserva o aviso de prévia privada.

Foram verificadas as seguintes interações sobre o build compilado:

- A seleção de GRE altera o total de empresas ativas segundo o mesmo modelo e persiste ao navegar entre páginas.
- Um clique real em uma barra renderizada seleciona o subconjunto reconciliado; a tabela preserva a contagem e abre a ficha empresarial correspondente.
- O indicador de empresas ativas permite drillthrough e o CSV do recorte corresponde, célula a célula, à exportação produzida pelo domínio.
- Evidências digitais conservam critérios e IDs da origem; o filtro DIG-04 produz o CSV exato do conjunto e abre a evidência na ficha empresarial.
- Pesquisa, paginação e exportação do catálogo regional funcionam. O indicador 53 mantém as dependências 183/182 e a ressalva sobre orçamento aprovado.
- Teclado abre a definição do indicador e os filtros; Escape fecha os diálogos e devolve o foco do filtro.
- O perfil Consulta restringe recebimentos e exportações. Não existe botão de publicação pública ou tratativa operacional.

A indicação “DEMONSTRAÇÃO · FONTES NÃO CONECTADAS” permanece explícita. SQL Server e Db2 via gateway continuam sem configuração institucional. Os anexos e prints não foram transformados em totais correntes.

## Primeira aba da planilha

As orientações da aba **INSTRUÇÃO** continuam preservadas no catálogo importado da V8: C5 identifica as métricas amarelas relacionadas ao art. 3º da DN-TCU 216/2025; C7 solicita reconciliação dos consolidados anual/mensal e métricas íntegras para incorporação ao Relatório de Gestão do Confea; C11 relaciona os indicadores 45–53 aos planos estratégicos de 2025–2027; C17 determina manter vazio um valor desconhecido, sem preenchê-lo com zero. A distinção entre orientação da planilha, exigência regional e consolidação federal permanece em [TRANSPARENCIA_NORMAS_V8.md](TRANSPARENCIA_NORMAS_V8.md).

## Reprodução e limites

Após `npm ci` e `npm run build`, iniciar `npm run preview -- --port 4173` e executar:

```bash
QA_URL=http://127.0.0.1:4173/ node --import tsx scripts/qa-visual-v9.mjs
```

`QA_OUTPUT`, `QA_FILTER` e `CHROMIUM_PATH` permitem escolher o diretório, reexecutar um cenário e indicar o Chromium. O script também funciona contra o servidor de desenvolvimento. Lê geometria e pinturas reais, usa cliques reais e não depende de módulos privados ECharts do Vite.

A medição de contraste cobre os textos principais especificados, não representa certificação integral de acessibilidade. Telas menores podem ter rolagem vertical para conservar legibilidade. O tema foi validado contra o schema oficial, mas não importado no Power BI Desktop nesta execução. O protótipo React e seus degradês/SVGs continuam sendo uma referência de implementação; não há `.pbix` ou conversão automática de todos os recursos visuais.
