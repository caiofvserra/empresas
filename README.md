# CREA-SP · Inteligência empresarial

Protótipo do painel de empresas do CREA-SP (**V18**, oito abas) e o planejamento do **Observatório Crea-SP**. Os dados internos do painel são demonstrativos; os dados públicos são reais e mostram fonte e data. Não há `.pbix` nem conexão institucional validada.

## O que está aqui

| Pasta ou arquivo | Conteúdo |
|---|---|
| `src/cockpit/` | Painel V18: Visão geral, Cadastro, Fiscalização, Malha fina, Resp. técnica, Receita, Atendimento e Contexto. Abre em `/` e em `/painel.html` |
| `src/painel/`, `src/gestao-v14/` (medidas e widgets), `src/enterprise-v10/` (modelo e filtros), `src/domain/` | Módulos que o V18 reaproveita das versões anteriores |
| `docs/PAINEL.md`, `docs/INDICADORES_V18.md` e `.xlsx` | Como o painel funciona e o catálogo dos 78 indicadores |
| `docs/DESIGN_SYSTEM_V13.md`, `docs/NORMAS.md` | Identidade visual e base normativa ainda em uso |
| `entrega/painel-gestao-creasp.html` | V18 em um único HTML, para abrir sem servidor |
| `observatorio/` | Plano do Observatório (revisão 2), atlas de 98 fontes públicas e catálogo unificado em CSV e XLSX |
| `planejamento-fontes-2026-10/` | Levantamento de 29/10/2026: 104 entradas de fontes, 34 casos de uso com fórmula, arquitetura e revisão crítica do V18. Retrato datado; as instruções de abertura dele são anteriores a esta limpeza |
| `scripts/refresh-sources.ts`, `scripts/integrations/`, `src/integrations/catalog.ts` | Coletor PNCP com histórico, cobertura e testes; ponto de partida dos conectores da Etapa 3 |
| `integrations/power-query/`, `integrations/powerbi-theme-creasp-v13.json` | Consultas de exemplo para SQL Server e Db2 via gateway e o tema Power BI |
| `public/data/engineer-statistics/`, `archives/data-publica-v6/` | Somente os arquivos públicos que o V18 lê na aba Contexto |

## Executar e verificar

Node.js 20 ou mais novo.

```bash
npm ci
npm run dev            # abre o V18 em http://localhost:5173/
npm test               # testes de domínio, painel, fiscalização e coletor
npm run build          # TypeScript e build do site
npm run build:painel   # gera entrega/painel-gestao-creasp.html
npm run sources:refresh -- --config integrations/refresh-sources.example.json
```

A configuração do coletor vem **desabilitada**. Ela não configura servidor, gateway, agendamento nem refresh do Power BI. Não coloque credenciais no código, no Git ou em JSON público.

## Regras que valem para qualquer indicador

- Empresa-raiz, estabelecimento (CNPJ completo) e registro são três contagens diferentes. CNPJ é texto, com zeros e letras.
- CNAE da lista do CREA-SP define o universo de análise; não prova obrigação nem infração.
- Contrato e ART só se ligam por referência documental. ART da mesma empresa em data próxima é candidata para revisão, não vínculo confirmado.
- A situação no CREA-SP é lida na data do fato, não na data de hoje.
- Emprego, salário e formação públicos ficam em agregado (município, CNAE, CBO, curso); não se ligam a um CNPJ ou CPF.
- Município do órgão, do fornecedor e da execução são campos diferentes.

As regras completas estão no [plano do Observatório](observatorio/plano-observatorio-crea-sp.html) e em [ARQUITETURA.md](planejamento-fontes-2026-10/ARQUITETURA.md). As 12 lacunas do V18 que precisam de decisão antes de usar dados reais estão em [REVISAO_REPOSITORIO.md](planejamento-fontes-2026-10/REVISAO_REPOSITORIO.md).

## Histórico

As versões V4 a V14 (páginas, relatórios, exportadores, dados demonstrativos, temas e documentação de cada versão) foram retiradas em 29/10/2026 porque o V18 as substituiu. Todas continuam no histórico do Git: o último commit com elas é `884eee9`.
