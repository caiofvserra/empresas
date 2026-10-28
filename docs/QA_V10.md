# Validação do novo painel empresarial CREA-SP V10

Validação concluída sobre a distribuição compilada V10. O escopo é o CREA-SP / Estado de São Paulo, com cinco páginas e 17 indicadores relacionados a empresas. A reconstrução altera a arquitetura de informação e as medidas ativas; não reutiliza os resultados visuais de V8/V9 como prova de execução desta versão.

## Verificações executadas

- Reconciliação dos indicadores, filtros, coortes temporais e integridade referencial: testes da camada `enterprise-v10`.
- Dez canvases de PC: cinco páginas em 1920×1080 e 1366×768, sem rolagem do documento, sobreposição ou corte dos indicadores.
- Quinze canvases adicionais: cinco páginas em 1024×768, 768×1024 e 390×844, sem overflow horizontal.
- Navegação, catálogo dos 17 indicadores, filtros persistentes, seleção real em gráfico, detalhamento empresarial e CSV conciliado com os registros do mesmo modelo.
- Pesquisa por CNPJ, ordenação, paginação, estado vazio, perfis demonstrativos, teclado, explicações e restrições de exportação.
- Ausência de erros JavaScript, console e HTTP na versão compilada.

Os dados do protótipo são sintéticos. SQL Server e Db2 via gateway dependem de configuração institucional; APIs e parcerias propostas não serão apresentadas como conexões ativas. A entrega é uma especificação funcional React para posterior implementação no Microsoft Power BI, sem arquivo `.pbix` ou conversão automática.

## Resultados

| Verificação | Resultado | Evidência no pacote |
| --- | --- | --- |
| Modelo e regressões | 194 testes aprovados, incluindo 29 testes novos de indicadores empresariais, CSV e filtros | `validation/unit-v10.log` |
| Navegação e fluxo analítico | 13 cenários aprovados; nenhum erro JavaScript, console ou HTTP | `validation/browser/report.json` |
| PC | Dez canvases: cinco páginas em 1366×768 e 1920×1080 sem rolagem ou sobreposição | Capturas em `validation/browser/` |
| Responsividade | Quinze canvases adicionais em 1024×768, 768×1024 e 390×844 sem overflow horizontal | Relatório e capturas |
| Build/TypeScript | Aprovados; 2.190 módulos | `npm run build` |
| Tema Power BI | Válido no schema oficial Microsoft 2.157; importação no Desktop não executada | `integrations/powerbi-theme-creasp-v10.validation.json` |

Os 194 testes incluem regressões dos modelos anteriores preservados no repositório. A camada empresarial ativa acrescenta 20 testes analíticos, seis de exportação e três de seleção. Não se trata de 194 testes de um arquivo PBIX.

Os cenários do navegador verificam os 17 indicadores no catálogo, filtros persistentes, seleção real de uma barra de RT, subconjunto reconciliado, CSV exato, ficha empresarial, ordenação numérica, paginação, pesquisa CNPJ, estado vazio, coortes temporais, acessibilidade por teclado e restrições demonstrativas de consulta. As medidas e seus denominadores foram conferidos no modelo; exemplos do catálogo são identificados como didáticos.

A inspeção visual da versão compilada conferiu Direção estratégica, Inteligência digital e Resultados e recursos em 1366×768. O Sankey da coorte externa representa dois desfechos paralelos que reconciliam com o universo observado; não é uma sequência de etapas. O mapa preserva a proporção da malha paulista. Títulos dos eixos foram reposicionados dentro da área gráfica. Esses ajustes antecederam a execução final dos 13 cenários.

A exportação `npm run data:enterprise` gera 17 métricas com numeradores/denominadores, catálogo, séries, territórios, fatos empresariais e evidências demonstrativas pelo mesmo modelo utilizado no navegador. Não é uma coleta nem uma promoção de dados reais.

## Reprodução

```bash
npm ci
npm run build
npm run preview -- --port 4173
QA_URL=http://127.0.0.1:4173/ node --import tsx scripts/qa-enterprise-v10.mjs
```

`QA_OUTPUT`, `QA_FILTER` e `CHROMIUM_PATH` permitem escolher o destino, reexecutar cenários selecionados e indicar o Chromium. A suíte usa ponteiros e DOM reais, sem dispatch sintético ou consulta a módulos privados ECharts.
