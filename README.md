# Inteligência Estratégica Crea-SP

Protótipo dos painéis do programa **Inteligência Estratégica Crea-SP**, conduzido pela EDAD, unidade de dados da SUPTEC (o programa chamou-se Prumo e, antes, Observatório Crea-SP). Desde 01/11/2026 o painel único está sendo dividido por público e regra de acesso. O primeiro painel separado é o de **Empresas**, descrito em [docs/EMPRESAS.md](docs/EMPRESAS.md), junto com a recomendação de divisão dos demais. O segundo, de 03/11/2026, é o de **Profissionais**, descrito em [docs/PROFISSIONAIS.md](docs/PROFISSIONAIS.md). O terceiro, também de 03/11/2026, é o de **Fiscalização e malha fina**, descrito em [docs/FISCALIZACAO.md](docs/FISCALIZACAO.md). O quarto, de 06/11/2026, é o de **Gestão do Conselho** (receita e dívida, orçamento e despesa com nome de quem recebe, câmaras e plenário, entidades e escolas, atendimento), descrito em [docs/CONSELHO.md](docs/CONSELHO.md). O painel geral não vai continuar: os temas que restam nele (Presidência e Método) vão virar painéis próprios; o que mudou nele está em [docs/V22.md](docs/V22.md) e [docs/V21.md](docs/V21.md). Blocos e regras marcados com "!" dependem de parceria: mostram o que um acordo permitiria medir e ficam demonstrativos até ele existir. Os dados internos são demonstrativos; os dados públicos são reais e mostram fonte e data. Não há conexão institucional validada. Os painéis de Empresas e de Gestão do Conselho já têm pacote Power BI (projeto PBIP com modelo, medidas, páginas, tema e os dados de demonstração), descrito em [docs/POWERBI.md](docs/POWERBI.md).

## O que está aqui

| Pasta ou arquivo | Conteúdo |
|---|---|
| `src/presidencia/` | Painel da Presidência: Resumo (um quadro por painel), Regionais, Riscos e No país. Abre em `/presidencia.html`; substituiu o painel geral em 07/11/2026. Ver [docs/PRESIDENCIA.md](docs/PRESIDENCIA.md) |
| `src/empresas/` | Painel de Empresas: Registro, Evolução, RT e ART, Vínculos. Abre em `/empresas.html` |
| `src/profissionais/` | Painel de Profissionais: Registro, Evolução, ART e RT, Formação, Trabalho. Abre em `/profissionais.html` |
| `src/fiscalizacao/` | Painel de Fiscalização e malha fina: Ações, Resultado, Malha fina, Contratos, Obras. Abre em `/fiscalizacao.html` |
| `src/financeiro/` | Painel Financeiro: Arrecadação, Receita, Dívida e cobrança, Orçamento e despesa, com a receita, a despesa e os gastos reais da Transparência. Abre em `/financeiro.html` |
| `src/atendimento/` | Painel de Atendimento: prazos, canais, distância até a unidade e coworkings. Abre em `/atendimento.html` |
| `src/conselho/` | Painel de Colegiados (antes Gestão do Conselho), só do colegiado: Câmaras e plenário, Entidades e escolas (em reconstrução). Abre em `/conselho.html` |
| `src/indicadores/` | Painel de Indicadores do Sistema: as 161 métricas e os indicadores que o Crea-SP manda ao Confea, por subprograma (Registro, Fiscalização, Julgamento, Suporte e Liderança, Entrega ao Confea). Abre em `/indicadores.html`. Ver [docs/INDICADORES.md](docs/INDICADORES.md) |
| `src/gestao/` | Peças comuns aos painéis Financeiro, Atendimento e Conselho (mapa por município, listas ao clicar, estilo) |
| `src/menu/`, `index.html` | Menu inicial do site: lista os oito painéis (Colegiados é o painel de Gestão do Conselho) com as páginas de cada um. Em cada painel do site, o botão Voltar, no alto do menu lateral, traz de volta ao menu |
| `.github/workflows/pages.yml` | Publica o site no GitHub Pages a cada merge na main (https://caiofvserra.github.io/empresas/). Em Settings > Pages, a origem tem de ser "GitHub Actions" |
| `src/cockpit/` | A estrutura comum aos painéis: filtros, data de referência, fichas, painel lateral e o menu de cada painel |
| `docs/METODO.md` | O Método (frentes de dados, cruzamentos, casos de uso, regras da malha fina, fontes, IA, radar normativo e parcerias), que saiu do painel em 07/11/2026. Gerado por `npm run docs:metodo` |
| `src/observatorio/` | Indicadores-norte com fichas, histórico por data de referência, frentes e matriz de cruzamentos, decisão sobre as 12 lacunas do V18, casos de uso, radar normativo, gate de fontes, parcerias e atlas |
| `src/domain/` | Cenário determinístico e camadas: profissionais, formação, entidades, conselho, frentes (QSA PJ, Obrasgov, ANEEL/ANP/ANM/BNDES), mercado (concentração, PCA, densidade, aberturas, permanência) e parcerias (CNO, licenças e alvarás, perícias, TCE-SP, crédito e PIB, sócios PF, coorte nominal, vínculos por empresa) |
| `src/painel/`, `src/gestao-v14/` (medidas e widgets), `src/enterprise-v10/` (modelo e filtros) | Módulos que o painel reaproveita das versões anteriores |
| `docs/EMPRESAS.md`, `docs/PROFISSIONAIS.md`, `docs/FISCALIZACAO.md`, `docs/FINANCEIRO.md`, `docs/ATENDIMENTO.md`, `docs/CONSELHO.md`, `docs/V22.md`, `docs/V21.md`, `docs/DESIGN_SYSTEM_V13.md`, `docs/NORMAS.md` | Os painéis de Empresas, de Profissionais e de Fiscalização e a divisão recomendada, o que a V22 e a V21 acrescentam, identidade visual e base normativa |
| `entrega/painel-<painel>-creasp.html` | Painéis da Presidência, de Empresas, Profissionais, Fiscalização, Financeiro, Atendimento e Conselho, cada um em um único HTML, para abrir sem servidor na mesma pasta |
| `observatorio/` | Plano em etapas (revisão 2), atlas de 98 fontes públicas e catálogo unificado em CSV e XLSX, publicados com os nomes anteriores (Observatório, Prumo) |
| `planejamento-fontes-2026-10/` | Levantamento de 29/10/2026: 104 entradas de fontes, 34 casos de uso com fórmula, arquitetura, revisão independente e revisão crítica do V18. Retrato datado |
| `scripts/refresh-sources.ts`, `scripts/integrations/`, `src/integrations/catalog.ts` | Coletor PNCP com histórico, cobertura e testes; ponto de partida dos conectores |
| `src/powerbi/`, `entrega/powerbi/<painel>/` | Gerador dos pacotes Power BI e os pacotes dos painéis da Presidência, de Empresas, Financeiro, Atendimento, Colegiados e Indicadores do Sistema, que abrem no Power BI Desktop pelo `.pbip` de cada um (`npm run build:powerbi`, ver [docs/POWERBI.md](docs/POWERBI.md)) |
| `integrations/power-query/`, `integrations/powerbi-theme-creasp-v13.json` | Consultas de exemplo para SQL Server e Db2 via gateway e o tema Power BI |
| `public/data/engineer-statistics/`, `archives/data-publica-v6/` | Somente os arquivos públicos que o painel lê |

## Executar e verificar

Node.js 20 ou mais novo.

```bash
npm ci
npm run dev            # menu dos painéis em http://localhost:5173/; Presidência em http://localhost:5173/presidencia.html; Empresas, Profissionais e Fiscalização em empresas.html, profissionais.html e fiscalizacao.html; Financeiro, Atendimento e Conselho em financeiro.html, atendimento.html e conselho.html; Indicadores do Sistema em indicadores.html
npm test               # testes de domínio, painéis, fiscalização, V20, V21, V22, Empresas, Profissionais, Fiscalização e coletor
npm run build          # TypeScript e build do site
npm run build:painel   # gera os painéis em entrega/
npm run build:powerbi  # gera os pacotes Power BI em entrega/powerbi/<painel>/ (presidencia, empresas, financeiro, atendimento, conselho e indicadores)
npm run sources:refresh -- --config integrations/refresh-sources.example.json
```

A configuração do coletor vem **desabilitada**. Ela não configura servidor, gateway, agendamento nem refresh do Power BI. Não coloque credenciais no código, no Git ou em JSON público.

## Regras que valem para qualquer indicador

- Empresa-raiz, estabelecimento (CNPJ completo) e registro são três contagens diferentes. CNPJ é texto, com zeros e letras.
- CNAE da lista do Crea-SP define o universo de análise; não prova obrigação nem infração.
- Contrato e ART só se ligam por referência documental. ART da mesma empresa em data próxima é candidata para revisão, não vínculo confirmado.
- A situação no Crea-SP é lida na data do fato, não na data de hoje; a data de referência lê a base como estava em D e nunca sobrescreve valores.
- Emprego, salário e formação públicos ficam em agregado (município, CNAE, CBO, curso); não se ligam a um CNPJ ou CPF.
- Município do órgão, do fornecedor e da execução são campos diferentes.
- Só entram fontes com coleta automática periódica ou com acordo previsto; cada fonte nova passa pelo gate de sete passos antes do núcleo operacional. O que depende de acordo aparece marcado com "!" e demonstrativo até a parceria existir.

As regras completas estão no [plano](observatorio/plano-observatorio-crea-sp.html) e em [ARQUITETURA.md](planejamento-fontes-2026-10/ARQUITETURA.md). As 12 lacunas do V18 estão em [REVISAO_REPOSITORIO.md](planejamento-fontes-2026-10/REVISAO_REPOSITORIO.md); a decisão sobre cada uma está na aba Método do painel geral.

## Como escrever os textos do painel

Os textos do painel são lidos pela Presidência e pelas superintendências, por isso seguem um padrão único:

- Frases completas, com sujeito e verbo, uma ideia por frase. Nada de termos soltos ligados por "·", "×" ou "→".
- Sem códigos internos no texto visível (número de caso de uso, versão do painel, "D", "coorte", "universo", "ponte"). Em vez de "em D", escreva "na data escolhida".
- Siglas pouco conhecidas são explicadas na primeira vez. ART, RT, CNPJ, CNAE e regional podem ficar sem explicação.
- O título diz o assunto em palavras comuns; a pergunta diz o que o gráfico mostra e como ler; a ficha (i) diz como é calculado e o cuidado de leitura.
- Cada informação fica num lugar só.
- Clicar num elemento detalha aquele elemento (as empresas da barra, faixa ou ponto), nunca abre um resumo genérico.
- Regional, câmara, período e data são filtros do painel inteiro; não se repete o mesmo gráfico por regional ou por 24 meses.
- Cada página cabe numa tela de computador, sem rolagem, com blocos de larguras diferentes. O bloco mostra o título e o gráfico; a pergunta e o cuidado de leitura ficam no (i).
- Os tipos de gráfico variam (mapa com o limite dos municípios, mapa de árvore, calor, anel, fluxo, barras e linhas), sem sacrificar a comparação: nada de mapa de bolhas, rosa ou barras em círculo. Nada de faixa de texto rolando na tela.
- Quadrado colorido só onde é legenda. Atalho para uma lista de empresas ao lado do gráfico não leva quadrado.
- Todo bloco com "!" tem um plano B na ficha, para o caso de o acordo não sair.

## Histórico

As versões V4 a V14 foram retiradas em 29/10/2026 (último commit com elas: `884eee9`). As entregas V18 e V19, os catálogos de indicadores do V18 e as notas da V19 saíram em 01/11/2026 com a V21; tudo continua no histórico do Git.
