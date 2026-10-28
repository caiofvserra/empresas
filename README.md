# CREA-SP · Cockpit de gestão empresarial — V14

Protótipo funcional **React + TypeScript + Vite** que especifica um relatório Microsoft Power BI para a gestão das **empresas e relações empresariais do CREA-SP**. A V14 reorganiza o painel em um **cockpit de 5 páginas** voltado à decisão: onde a base cresce ou recua, quanto está em jogo em arrecadação e dívida, onde agir primeiro e como a operação (fiscalização, CAO, ART, cadastro) responde. Também traz **dados públicos reais** (Confea, IBGE, PNCP, Banco Central, Portal da Transparência e Relatório de Gestão 2025 do CREA-SP).

**Dados internos são demonstrativos; dados públicos são reais e exibem fonte e data de captura.** Não há `.pbix` nem conexão institucional validada. Plano e diagnóstico: [PLANO_V14.md](docs/PLANO_V14.md). Reprodução no Power BI: [POWER_BI_V14.md](docs/POWER_BI_V14.md). A V13 continua acessível em `?v=13`.

## Páginas do cockpit

| Página | Conteúdo |
|---|---|
| 1 · Visão executiva | Cartões com sparkline, variação e meta; projeção da base (Holt, faixa de 95%, anomalias); ponte do estoque; narrativa automática; funil de conformidade (Sankey); scorecard das GREs com formatação condicional |
| 2 · Território | Mapa municipal com métrica alternável e ranking; quadrante cobertura × emprego das GREs; pequenos múltiplos por GRE |
| 3 · Carteira e arrecadação | Árvore de decomposição do saldo vencido; recuperação e aging; arrecadação ano contra ano; matriz de prioridade (saldo vencido × dias sem RT) |
| 4 · Operação | Funil e tempo entre etapas da fiscalização; backlog por idade; prazo de emissão de CAO; ARTs mês × GRE; qualidade cadastral |
| 5 · Contexto público | Densidade profissional por UF, permanência do registro, registros novos por ano, modalidades, PNCP SP, despesa do CREA-SP; BCB (IPCA, INCC, Selic) e IBGE consultados ao vivo no navegador |

Interações: clique em qualquer barra, nó, célula ou ponto aplica uma **seleção cruzada** a todas as páginas; filtros globais (GRE, município, CNAE, porte em botões, janela, pesquisa) aparecem como pílulas removíveis; **modo foco** em cada visual; tema **claro/escuro**; **metas** ajustáveis (parâmetros what-if); teclas 1–5 trocam de página; exportação CSV, tabela de empresas e ficha empresarial herdadas da V13. Perfis demonstrativos: Administração, GRE2 regional e Consulta (sem financeiro).

Código: `src/gestao-v14/metrics.ts` (medidas puras e testadas), `public-data.ts` (snapshots reais e APIs ao vivo com retorno explícito), `Cockpit.tsx`, páginas e `cockpit.css`. Testes: `tests/gestao-v14.test.ts`.

---

# Histórico — V13

## Executar e verificar

Node.js 20+ para a aplicação; o coletor com proxy nativo exige Node.js 24.

```bash
npm ci
npm run dev
```

Para verificar o código e servir o build:

```bash
npm test
npm run build
npm run preview -- --port 4173
npm run test:production
```

`test:browser`, `test:production` e `test:visual` usam `scripts/qa-enterprise-v13.mjs`. `QA_URL`, `QA_OUTPUT`, `QA_FILTER` e `CHROMIUM_PATH` configuram destino e navegador. `test:enterprise` verifica o núcleo empresarial; `npm test` inclui os testes dos aprofundamentos V13. Resultados efetivamente obtidos ficam em [QA_V13.md](docs/QA_V13.md). Teste React não comprova refresh institucional, segurança do Power BI ou execução de um `.pbix`.

## Uma tela com leituras relacionadas

| Área | Leituras |
| --- | --- |
| Indicadores essenciais | Empresas com registro CREA-SP; cobertura de registro CREA-SP; empresas com RT/ART; análise digital; valor técnico PNCP; adimplência e recebimentos PJ |
| Registros no CREA-SP | Entradas, saídas e estoque; ARTs e empresas distintas; Universo com registro vigente, apenas histórico ou sem histórico identificado |
| Receita × CREA-SP | Cobertura por GRE; mapa municipal; CNAEs; situação cadastral na Receita dos CNPJs com registro CREA vigente |
| Vínculo e acervo | Matriz RT × ART; continuidade de RT; CAOs emitidas e empresas distintas por mês |
| PNCP × CREA-SP | Valores por categoria; fornecedores com registro CREA na publicação; contratos documentalmente ligados a ART |
| Financeiro PJ | Recebimentos, com recuperação incluída; saldo vencido por atraso; dívida inicial e recuperação da mesma carteira |
| Mercado × presença | Emprego agregado por GRE; ingresso cadastral de CNPJs previamente observados sem registro CREA |
| Complementares | Permanência no CREA; novos CNPJs sem registro; continuidade RT; emprego; fornecedores; vínculo contrato–ART; dívida; recuperação; ingresso CREA |

Cada gráfico pode ser ampliado **na mesma tela**, com retorno ao conjunto sem perder filtros. A frase inferior explica a leitura do gráfico. A ajuda **“Como ler”** detalha contagem, fonte, cálculo e limites; origem e infraestrutura não ficam comprimidas em uma linha minúscula. Filtros globais persistentes, seleção cruzada, pesquisa, catálogo, tabela ordenável/paginada, CSV e ficha empresarial permitem investigar o conjunto. A ficha é de leitura, sem tratativas administrativas.

Referências de PC: **1366×768 e 1920×1080**; em telas menores a composição permite rolagem para conservar legibilidade. O canvas usa a nova identidade informada: fundo claro `#F8F8F8`, gráficos brancos, primária `#082D74`, escura `#01224D`, amarelo `#FABD07` e terciária `#3182CE`. Texto sobre amarelo é escuro. A engrenagem é um motivo original, sem reproduzir o selo oficial.

## Completude e indicadores

A [revisão e fichas dos 17 indicadores](docs/REVISAO_E_INDICADORES_V13.md) documenta nome, resumo, pergunta auxiliar, decisão, origem, cálculo, unidade/denominador, fontes, exemplo, atualização proposta, validação e limites.

A revisão conservou o núcleo de 17 medidas e acrescentou **três aprofundamentos nos visuais existentes**:

- **Universo CREA:** empresas-raiz, estabelecimentos e registros separados; vigência atual, apenas histórico e ausência de histórico identificado.
- **Conciliação Receita × CREA:** situação cadastral Receita do CNPJ completo com registro CREA vigente, inclusive baixada/suspensa/inapta, sem concluir infração.
- **ART e CAO:** quantidade de documentos versus empresas distintas. Emissão histórica de CAO não é apagada por uma revogação atual; sem data de revogação, não se fabrica estoque válido de meses passados.

Os valores vêm de [model.ts](src/enterprise-v10/model.ts) e [analysis.ts](src/enterprise-v13/analysis.ts). O catálogo compartilhado em [catalog.ts](src/enterprise-v10/catalog.ts) mantém os mesmos IDs e fórmulas do núcleo, com nomes revisados, `origin` e `countLabel`.

Crescimento cadastral, contratação ou emprego não comprova isoladamente efeito da administração. CNAE ou texto contratual não determina obrigação ou infração. Profissionais entram por vínculos relevantes com empresas; emprego permanece agregado.

## Tipografia e identidade

[DESIGN_SYSTEM_V13.md](docs/DESIGN_SYSTEM_V13.md) documenta tokens, contrastes, espaçamento, sombras e adaptações compactas do BI. `src/enterprise-v11/design-tokens.css` concentra o contrato visual. As fontes são locais em `public/fonts/`: **Lato 400/700** e **Raleway variável 100–900**, em WOFF com `font-display: swap`, licenças OFL e manifesto de origem/hashes. Não há dependência de Google Fonts em execução.

O [tema Power BI V13](integrations/powerbi-theme-creasp-v13.json) transfere paleta e classes tipográficas. Passou no schema oficial Microsoft sem erros; importação no Desktop não foi testada. O tema não embute os WOFF do React no Power BI. Validar disponibilidade de Lato/Raleway em Desktop, Service e clientes institucionais, com alternativa nativa como Segoe UI se necessária.

## Dados e atualização

O cenário-base relaciona empresas, estabelecimentos, registros, vínculos técnicos, ARTs, CAOs, contratos, obrigações e pagamentos, com semente fixa. Pontes contrato–ART e observações históricas externas são fatos fictícios explícitos, não inferências para fabricar prova.

Fontes internas informadas: **SQL Server e IBM Db2 via on-premises data gateway**. Servidor, schemas/views e credenciais não foram fornecidos. APIs e arquivos oficiais deverão alimentar camada curada com competência, origem, lote, cobertura e última carga válida.

[FONTES_EMPRESARIAIS_V10.md](docs/FONTES_EMPRESARIAIS_V10.md) distingue API disponível, publicação automatizável e convênio proposto. PNCP tem API de consulta; Consulta CNPJ/Conecta depende de acesso autorizado. RAIS/CAGED públicos são agregados. Licenças municipais, referências documentais e dados identificados dependem de fontes e autorizações próprias. Notícias, prints ou PDFs não entram como medidas atuais.

```bash
npm run sources:refresh -- --config integrations/refresh-sources.example.json
```

A configuração está **desabilitada**. Esse comando não configura servidor, gateway, staging, agendamento ou refresh do Power BI. Não inserir credenciais no React, Git ou JSON público.

## Regras de análise e governança

- Empresa-raiz, estabelecimento/CNPJ e registro são unidades distintas. A matriz não confirma a vigência de outra filial.
- Vigência CREA é reconstruída por eventos datados; situação cadastral Receita é uma fotografia disponível, salvo história homologada.
- RT usa intervalos; sobreposições não duplicam dias. Não identificado não significa ausência real.
- A taxa ART usa empresas com algum dia de registro vigente na janela. A matriz RT × ART usa separadamente empresas vigentes no corte.
- CNAEs principais/secundários podem sobrepor estabelecimentos: barras não são somáveis.
- Contrato–ART exige referência documental explícita; ART genérica da empresa não confirma o contrato.
- CAO é acervo da pessoa jurídica; emissão histórica, situação atual e quantidade de empresas são medidas diferentes.
- Emprego liga-se a território/CNAE/CBO/competência, não a um CNPJ individual. Filtros incompatíveis bloqueiam a comparação.
- Financeiro usa centavos e pagamento efetivo. Recuperação integra o total recebido e usa dívida inicial fixa; saldo vencido é estoque.
- CNPJ é texto com zeros e letras. Sem denominador válido a taxa fica ausente.

O modelo permanece em [MODELO_EMPRESARIAL_V10.md](docs/MODELO_EMPRESARIAL_V10.md). A reprodução no Desktop/Service, campos/parâmetros, bookmarks, tooltips, fontes e RLS/OLS estão em [POWER_BI_V13.md](docs/POWER_BI_V13.md).

A publicação preserva a audiência definida no Sites. Perfis locais Administração, regional e Consulta simulam apresentação/exportação, sem constituir segurança produtiva. O relatório institucional exige permissões, RLS/OLS e governança homologadas. Documentos Confea/TCU recebidos continuam como referência; não tornam cada indicador proposto uma obrigação pública textual individual.

## Código e histórico

- `src/App.tsx`: monta o canvas integrado, com implementação visual em `src/enterprise-v11/` atualizada para V13.
- `src/enterprise-v11/IntegratedIntelligence.tsx`, `IntegratedCharts.tsx` e CSS: filtros, 17 medidas, seis visuais, ajuda e ampliação.
- `src/enterprise-v13/analysis.ts`: Universo, conciliação Receita × CREA e ART/CAO, com seus grãos e filtros.
- `src/enterprise-v10/`: núcleo relacional, catálogo revisado, exportação, tabela e ficha reutilizados.
- `integrations/`: contratos/exemplos de ingestão/gateway e temas; não são schemas institucionais confirmados.

V11, V10 e arquiteturas V4–V9 permanecem como histórico. As antigas cinco páginas não voltam à navegação ativa. Dados e exportadores anteriores não ativam integrações nem substituem a extração da versão atual.

## Extração e download

```bash
npm run data:enterprise
```

Gera `data-enterprise-v13/`, com catálogo, métricas e arquivos descritos no seu manifesto, a partir do mesmo modelo do painel. `empresas-raiz.csv` segue a exportação da interface. Os arquivos são demonstrativos e não substituem fatos de produção; CSVs numéricos gerais usam ponto decimal e o arquivo empresarial usa vírgula nos campos financeiros.

O pacote é disponibilizado no painel, em **Fontes e limitações**, e em [download direto V13](https://crea-sp-inteligencia-empresarial.equalpetal.chatgpt.site/downloads/crea-sp-bi-v13.zip), com código, dados e documentação. Os ZIPs de entrega excluem pastas de downloads para evitar pacotes recursivos. O [pacote V11](https://crea-sp-inteligencia-empresarial.equalpetal.chatgpt.site/downloads/crea-sp-bi-v11.zip) permanece como arquivo histórico.
