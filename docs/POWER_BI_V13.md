# Canvas empresarial integrado no Power BI — V13 / CREA-SP

A V13 especifica **uma página analítica empresarial para PC**, com 17 indicadores que compartilham filtros, dimensões e regras. Os nomes identificam o estado e a origem: CREA-SP, Receita, PNCP e emprego agregado. As três leituras adicionais — Universo, Receita e CAO — aprofundam os gráficos existentes, sem outra página principal. O React usa dados fictícios; não contém `.pbix`, conversão automática ou execução comprovada no Desktop.

## Composição e interpretação

Usar inicialmente uma página **16:9**, como 1920×1080, e homologar “ajustar à página” nas telas institucionais. O React tem referências em 1366×768 e 1920×1080; isso não garante reprodução automática pixel a pixel no Service ou sob qualquer zoom.

| Região | Conteúdo | Recurso previsto |
| --- | --- | --- |
| Cabeçalho | Identidade, competência e ajuda | Texto, formas, SVG e botões |
| Segmentações | GRE, município, CNAE, porte e janela | Segmentações compactas sincronizadas |
| Faixa superior | Oito medidas essenciais | Cards com origem e unidade/razão explícita |
| Centro | Seis análises em três colunas × duas linhas | Combinados, barras, matriz, mapa, treemap e dispersão |
| Faixa inferior | Nove medidas complementares | Cards compactos, sem nomes em forma de pergunta |
| Rodapé do gráfico | Frase que explica o que é contado/comparado | Texto dinâmico ou subtítulo legível |
| Ajuda contextual | Universo, fonte, cálculo e limites | Ajuda do visual e tooltip de página |
| Aprofundamento empresarial | Conjunto de empresas e documentos | Tabela e drillthrough com retorno |

Não usar “registro ativo” sem explicitar que se trata do CREA-SP. CNPJ ativo na Receita não é vigência no conselho, regularidade tributária ou prova de atividade técnica. Empresas, estabelecimentos, registros, contratos, dias-empresa e dinheiro não formam um único funil somável.

As [fichas V13](REVISAO_E_INDICADORES_V13.md) contêm conceito, pergunta auxiliar, decisão, fórmula, unidade/denominador, origem, fontes, exemplo, atualização proposta, validador e limites.

## Seis análises e três aprofundamentos

| Painel | Leituras previstas | Recurso Power BI |
| --- | --- | --- |
| Registros no CREA-SP | Entradas/saídas/estoque; ARTs/empresas; Universo CREA | Combinado, barras de composição, parâmetro/bookmark |
| Receita × CREA-SP | GRE, mapa municipal, CNAE e situação na Receita | Colunas/linha, mapa, barras e matriz |
| Vínculo e acervo | RT × ART; continuidade; emissões CAO/empresas | Matriz formatada, barras e combinado |
| PNCP × CREA-SP | Valores, fornecedores e referências contrato–ART | Treemap e barras por grão |
| Financeiro PJ no CREA | Recebido, atraso e recuperação da dívida inicial | Colunas empilhadas e barras de coorte fixa |
| Mercado × presença CREA | Emprego agregado e ingresso cadastral observado | Dispersão e desfechos de uma coorte externa |

**Universo:** particionar empresas com registro CREA vigente, apenas histórico sem vigência e sem histórico identificado. Contagens de estabelecimentos e registros aparecem separadamente, sem somá-las às empresas.

**Receita:** juntar por CNPJ completo a vigência CREA no corte e a situação cadastral Receita disponível. Uma leitura pergunta pela situação Receita dos CNPJs CREA vigentes; outra parte do universo externo elegível e distingue CREA vigente, apenas histórico e nunca identificado. Os denominadores são diferentes. Divergência cadastral exige validação, não conclusão automática de infração.

**CAO:** contar eventos de emissão por `issuedAt`, com empresas distintas no mês e no período. CAO com situação atual revogada continua tendo um evento histórico de emissão. Sem `revokedAt`, não construir um estoque válido mensal retroativo. CAO pertence à pessoa jurídica; CAT profissional não a substitui. ARTs e CAOs devem manter fatos e contagens separados.

A leitura territorial inicial mostra os maiores universos, com total e demais regiões acessíveis pelo filtro. Município sem observação não recebe zero. CNAEs principais/secundários podem sobrepor estabelecimentos. Ingresso posterior e sem ingresso são **desfechos paralelos** da mesma coorte, não etapas sucessivas; barra empilhada é alternativa nativa a um Sankey que exija visual homologado.

## Interatividade com recursos do Power BI

- **Parâmetros de campo:** alternar medida/dimensão quando o tipo de visual permanece coerente. Ver [documentação Microsoft](https://learn.microsoft.com/en-us/power-bi/create-reports/power-bi-field-parameters).
- **Bookmarks e seleção:** alternar tipos de visual e exibir um grupo ampliado, com retorno. Desativar captura de dados nos bookmarks de apresentação, para preservar segmentações e recorte. Ver [bookmarks](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-bookmarks).
- **Tooltips de página e ajuda:** explicar ponto selecionado, universo, fonte, competência, fórmula e limites. A frase visível sob o gráfico continua simples; ela não deve virar uma lista de infraestrutura. Ver [tooltips](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-tooltips).
- **Drillthrough:** abrir empresas/documentos do subconjunto, preservando contexto e retorno. Explicitar quando o detalhamento passa de documentos/CNPJs para empresas-raiz distintas. Ver [drillthrough](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-drillthrough).

Configurar interações entre cada visual. Taxas precisam recalcular numerador e denominador no recorte compatível; um filtro nominal de empresa não pode ser aplicado somente à carteira enquanto um agregado público de emprego permanece como se tivesse o mesmo universo. Tabela e ficha são de leitura; o BI não encaminha casos, autua ou conclui tratativas.

CSS, estado React e ECharts não se convertem diretamente nesses recursos. Escolher a alternativa nativa sempre que ela preservar a análise com menor custo de manutenção.

## Modelo e contratos de cálculo

Preservar o modelo em [MODELO_EMPRESARIAL_V10.md](MODELO_EMPRESARIAL_V10.md): dimensões Empresa, Estabelecimento, CNAE, Município/GRE, Tempo e modalidade; fatos de Registro/Movimento, Vínculo RT, ART, CAO, Contrato/Termo, Documento Contrato–ART, Observação Externa, Obrigação/Pagamento PJ e Emprego Agregado.

| Regra | Consequência semântica |
| --- | --- |
| Empresa-raiz ≠ estabelecimento ≠ registro | Chaves/medidas distintas; matriz não confirma vigência da filial |
| Correspondência por CNPJ completo | Raiz/razão social candidata não entra como exata |
| CNAEs sobrepostos | Ponte de atividades e distinct count; total recalculado |
| Histórico por eventos/intervalos | Reconstruir vigência; não retroprojetar snapshot |
| RT sobreposto não duplica cobertura | Unir intervalos antes de contar dias-empresa |
| Atividade ART usa coorte da janela | Incluir empresa vigente em algum dia, mesmo que já tenha saído |
| Matriz RT × ART usa vigentes no corte | Explicitar universo diferente da taxa de atividade |
| Emissão CAO é evento; revogação atual é estado | Não apagar emissão histórica nem inventar data de revogação |
| Receita ativa ≠ registro CREA vigente | Manter origem, CNPJ completo e competência de cada estado |
| Contrato–ART requer documento | Ponte com origem/data/validade; ART genérica não basta |
| Emprego é agregado | Ligar tempo/território/CNAE/CBO; nunca diretamente a empresa |
| Recebimento é fluxo; dívida é estoque | Data efetiva de pagamento; saldo líquido no corte |
| Recuperação integra recebimento | Coorte fixa vencida/aberta no baseline, sem novas dívidas no denominador |

Retenção usa fotografia RFB disponível até haver histórico homologado. Cobertura de fornecedores usa CNPJ e vigência na última publicação técnica selecionada por fornecedor; publicação não é execução. Evidências convergentes são regra booleana explicável, não probabilidade de infração ou pontuação oficial. Ingresso posterior à observação não atribui causalidade à gestão.

Sem denominador válido, retornar `BLANK`. CNPJ é string com zeros e letras. Filtros nominais/porte não podem reduzir só a carteira empresarial enquanto o emprego público agregado permanece indevidamente como universo equivalente.

### DAX conceitual

```dax
Cobertura de registro CREA-SP % :=
DIVIDE([CNPJs elegíveis com registro exato vigente],
       [CNPJs externos elegíveis])

Continuidade de RT no CREA-SP % :=
DIVIDE(SUM(FatoDiaEmpresa[DiasCobertosRT]),
       SUM(FatoDiaEmpresa[DiasRegistrados]))

Recuperação da dívida inicial % :=
DIVIDE([Recebido da coorte vencida inicial],
       [Saldo vencido inicial da mesma coorte])
```

São exemplos sobre fatos qualificados upstream. Nomes físicos, relações e auxiliares são ilustrativos. DAX curto não substitui reconstrução de intervalos, validação de fonte ou conciliação documental.

Fatos por empresa devem receber o conjunto de raízes autorizado sem multiplicar valores por estabelecimentos. Avaliar `TREATAS` ou estratégia equivalente homologada; evitar bidirecionalidade geral para forçar propagação. Financeiro por raiz filtrado por estabelecimento não comprova que o pagamento pertence fisicamente à filial selecionada.

## Fontes, gateway e atualização

Fontes informadas: **SQL Server e IBM Db2 via on-premises data gateway**. Servidor, versão, schema, views, chaves, credenciais e acesso de rede não foram fornecidos. Não há gateway ou refresh institucional configurado.

Fluxo proposto:

1. Ler views homologadas com identidade somente leitura; coletar API, arquivo oficial ou convênio autorizado.
2. Validar layout, completude, chaves, território, vigência e reconciliação; preservar origem/lote/competência.
3. Materializar dimensões, fatos, baselines e intervalos em camada curada.
4. Promover lote válido atomicamente; falha preserva o último lote e indica atraso.
5. Atualizar modelo semântico e registrar resultado separadamente da coleta.

Configurar `Sql.Database` e `DB2.Database` no gateway padrão, validando família/versão Db2, provider e drivers de 64 bits exigidos pela configuração real. Começar com Import e refresh agendado. DirectQuery exige necessidade de latência e desempenho comprovados.

Incremental requer folding validado, `RangeStart` inclusivo/`RangeEnd` exclusivo e tratamento de revisões, exclusões e retificações. Sem CDC/data confiável de alteração, usar snapshots/recomposição. Publicação PNCP não equivale a CDC de revisões antigas.

[FONTES_EMPRESARIAIS_V10.md](FONTES_EMPRESARIAIS_V10.md) distingue API PNCP disponível, Consulta CNPJ/Conecta com acesso a negociar, emprego agregado e parcerias condicionadas. O exemplo `integrations/refresh-sources.example.json` permanece desabilitado. Coletor, gateway, staging, agendamento e refresh são etapas distintas. Não colocar segredos no browser, Git ou JSON público.

## Visual, fontes e acessibilidade

A V13 segue os tokens fornecidos pelo usuário: primária `#082D74`, light `#163E8C`, dark `#01224D`; secundária `#FABD07`/`#FFD148`/`#E0AB0C`/`#FFFEDB`; terciária `#3182CE`/`#639CE0`/`#246FB5`/`#D4EDFF`. Fundo `#F8F8F8`, gráficos brancos, texto `#1A202C`, texto secundário `#3B4453` e borda `#E2E8F0` separam conteúdo e hierarquia. Texto sobre amarelo é escuro. Status não deve transformar ausência de correspondência em aparência de condenação.

Lato 400/700 serve à UI e Raleway variável 100–900 aos títulos. O React hospeda WOFF e licenças OFL localmente; isso **não embute automaticamente fontes no `.pbix` ou no Service**. Validar instalação/disponibilidade de Lato/Raleway em cada destino, incluindo exportação PDF e clientes institucionais. Quando necessário, homologar uma alternativa nativa como Segoe UI. Não presumir que declarar `fontFace` no tema transfira os binários.

Espaçamentos nomeados seguem 8/16/24/32px; ajustes compactos e níveis tipográficos menores são derivações para o canvas, não estilos atribuídos ao Figma. A sombra de referência é `0 0 10px rgba(0,0,0,.16)`. Radius e camadas não fornecidos foram derivados e documentados. Ver [DESIGN_SYSTEM_V13.md](DESIGN_SYSTEM_V13.md).

O tema `integrations/powerbi-theme-creasp-v13.json`, também disponível em `/themes/powerbi-theme-creasp-v13.json`, passou sem erros no schema Microsoft `reportThemeSchema-2.157.json` (SHA-256 `c74fc80a1262a6127ddddea1722046eeaeb3fbb42789d6cae1f7c83e8f838c09`). A importação no Desktop **não foi testada**. O tema não contém modelo, medidas, layout, fontes binárias ou visuais. Homologar mapas e visuais personalizados quanto a acessibilidade, licença e exportação.

As razões dos pares de cor documentados não comprovam acessibilidade de todos os estados renderizados. Testar eixos, legendas, tooltip, foco de teclado, seleção, matriz, treemap e o ajuste real à página. A ajuda “Como ler” precisa ter alternativa acessível ao ponteiro; não depender exclusivamente de hover.

## Segurança e validação

Aplicar RLS por território/escopo e OLS/permissões adequadas a financeiro e dados pessoais. Perfis React simulam apresentação/CSV e não são segurança produtiva. Controlar exportação no modelo/workspace e auditar regras. Restrição de acesso não pode fabricar falsa ausência cadastral: conciliar em escopo autorizado e fornecer flags de consumo adequadas.

A publicação preserva a audiência configurada no Sites; uma versão institucional com dados reais exige autorização e seleção próprias. A referência TCU recebida não torna os 17 indicadores automaticamente métricas públicas obrigatórias.

Na homologação, conferir fonte, identidade, competência, numeradores, denominadores, estoque/fluxo, centavos e documentos. Testar filtros, coortes, revisões/exclusões, refresh, RLS/OLS, exportação e retorno do drillthrough. As três leituras V13 exigem reconciliar as partições, manter CNPJ completo e contar emissão CAO sem inventar a história de revogação.

A evidência do protótipo fica em [QA_V13.md](QA_V13.md). Não extrapolar testes React para afirmar conector pronto, disponibilidade de fontes customizadas, compatibilidade visual exata ou segurança homologada no Power BI. V11 permanece documentada como histórico em [POWER_BI_V11.md](POWER_BI_V11.md).
