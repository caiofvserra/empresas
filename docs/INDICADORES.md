# Painel de Indicadores do Sistema

Painel de 10/11/2026. Mostra os números que o Crea-SP manda ao Confea na planilha de dados e indicadores, divididos pelos subprogramas da planilha. Os outros painéis acompanham a operação mês a mês. Este mostra o fechamento do exercício com a régua do Confea e confere a planilha antes do envio. É do Crea-SP, não do Confea.

Abre em `/indicadores.html` no site e em `entrega/painel-indicadores-creasp.html` sem servidor. O pacote Power BI está em `entrega/powerbi/indicadores/`. A análise dos documentos do Confea que deu origem ao painel está em [pesquisa/confea-prestacao-contas/](pesquisa/confea-prestacao-contas/README.md).

## Filtros

- **Exercício.** Os exercícios completos desde 2022 e o do ano da data de referência, parcial até ela (com asterisco). Sem escolha, vale o último completo. Os fluxos somam o exercício; os estoques são os de 31/12 (no exercício em curso, os da data).
- **Regional.** É recorte interno: o Confea só recebe o Conselho inteiro. Com uma regional, a métrica que se divide por regional mostra a regional; a que não se divide (julgamento, despesa, liderança) fica do Conselho inteiro e leva o aviso. O indicador segue a regional quando todas as métricas dele se dividem.
- **Data de referência.** Muda o exercício em curso e o calendário de entregas.

O período (3, 6, 12, 24 meses) e a busca dos outros painéis não entram aqui: a planilha é anual.

## O que cada página tem

Cada número leva o código da planilha numa etiqueta: M para métrica, I para indicador e PMF para meta do Plano de Melhoria da Fiscalização. Clicar abre a fórmula e as métricas no painel lateral.

| Página | Cartões | Blocos |
|---|---|---|
| Registro | Indicadores 1 a 7 | Os indicadores em cada exercício, com a referência do Sistema em 2021 e a meta 5.3; profissionais por modalidade; o registro em cada regional; as 30 métricas |
| Fiscalização | Indicadores 12, 13, 14, 15, 11 e a meta 2.3 | Ações em cada município (mapa dos 645, com os que ficaram sem ação); autos por capitulação; ações e autos em cada exercício contra a meta 2.3; as 24 métricas |
| Julgamento | Indicadores 17, 20, 26, 29 e as metas 5.1 e 5.2 | Eficiência e eficácia por tipo de processo e instância (a 3ª é do Confea, só a referência); a fila de cada instância; os motivos sem êxito; as 80 métricas |
| Suporte e Liderança | Indicadores 16, 8, 9, 10, 35 e 11 | O custo da fiscalização conta a conta; inadimplência e quadro em cada regional; pessoas e representação; as 27 métricas |
| Entrega ao Confea | Métricas preenchidas, conferências que não fecham, indicadores que saem, próxima entrega, processo de contas | As 161 métricas por subprograma e situação; as 17 somas e as coerências antes do envio; o calendário de entregas (PL-2260/2023); o que o Caderno de 2021 apontou sobre o Crea-SP e como está hoje |

## De onde vêm os números

O domínio fica em `src/domain/sistema-confea.ts`, e a planilha do Confea em `src/domain/confea-planilha.json`, gerada por `scripts/confea/csv-para-json.py` a partir dos CSV da pesquisa.

- **Reais**: os números publicados no Sumário Executivo 2025 do Crea-SP (registros novos, ARTs, ações e autos de fiscalização em 2025), com o selo Real.
- **Cenário de demonstração**: todo o resto. Os técnicos de nível médio são só os de Segurança do Trabalho e entram na modalidade Especial. A fila de cada instância passa de um exercício para o outro: os pendentes de anos anteriores são o que ficou do exercício anterior. O cenário vem com crescimento anual e ruído estável. As regionais repartem o Conselho pela população, sem perder unidade. As métricas da mesma família (estoque do ano anterior, estoque atual, visto, inadimplentes) usam o mesmo peso, para o crescimento de cada regional ficar perto do estado. O cenário planta de propósito duas conferências que não fecham (métricas 60 e 98 em 2025, os transitados em julgado das duas instâncias) e três métricas vazias (111, 156 e 157), para a página Entrega ao Confea ter o que apontar.

Em produção, cada métrica sai da base interna que os outros painéis já usam: cadastro, ART e CAT, fiscalização, GovAdm e Implanta.

## Cor

A5+40 (#203B88) no canto e no cabeçalho, com o menu em degradê até o Azul 500, item ativo e sobrancelha em amarelo. Escolhida pelo Caio em 12/11/2026 na folha da paleta do CreaOne (ver [PALETA_CREAONE.md](PALETA_CREAONE.md)).

## Testes

- `tests/indicadores.test.ts`: a planilha (161 métricas, 35 indicadores, 29 do Crea), os exercícios de cada data, as fórmulas, os números reais e as conferências plantadas, e as regionais que somam o Conselho.
- `tests/powerbi-indicadores.test.ts`: o pacote Power BI contra `quadroSistema`, no Conselho e numa regional.
- `tests/v20.test.ts` e `tests/menu.test.ts`: as fichas (i) de todos os blocos e o painel no menu do site.
