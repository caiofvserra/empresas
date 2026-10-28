# Canvas empresarial integrado no Power BI — V11 / CREA-SP

A V11 especifica **uma página analítica empresarial para PC**. Seus 17 indicadores compartilham filtros, dimensões e regras. O React demonstra cálculos e interações com dados fictícios; não contém `.pbix`, conversão automática ou evidência de execução no Desktop.

## Composição da página

Definir inicialmente uma página **16:9**, por exemplo 1920×1080, e validar o ajuste à página na resolução institucional. O React tem composições de referência em 1366×768 e 1920×1080; isso não garante reprodução automática pixel a pixel no Service ou em qualquer zoom. Não criar página vertical longa para acomodar o conteúdo de PC.

| Região | Conteúdo | Recurso previsto |
| --- | --- | --- |
| Cabeçalho compacto | Identidade, nome, competência e ajuda | Texto, formas, imagem vetorial e botões |
| Segmentações | GRE, município, CNAE, porte e janela | Segmentações compactas e medidas temporais coerentes |
| Faixa superior | Oito indicadores essenciais | Cards com nomes curtos e tooltip de definição |
| Centro | Seis análises em três colunas × duas linhas | Combinados, barras, matriz, treemap e dispersão |
| Faixa inferior | Nove indicadores complementares | Cards compactos com unidade/razão explícita |
| Rodapé | Contexto do recorte e acesso às empresas | Medidas de texto e botão de drillthrough |

As oito essenciais são base vigente, cobertura cadastral, cobertura de RT, atividade com ART, evidências convergentes, demanda pública técnica, adimplência e recebimentos de PJ. As outras nove permanecem visíveis. Empresas, estabelecimentos, contratos, dias-empresa e dinheiro têm grãos diferentes: não formam uma soma ou funil único.

Perguntas auxiliares aparecem abaixo do nome na definição/tooltip, acompanhadas de conceito, exemplo didático, fonte, fórmula, unidade, denominador, atualização proposta, validador e limites. Ver [INDICADORES_EMPRESARIAIS_V11.md](INDICADORES_EMPRESARIAIS_V11.md).

## Seis análises, sem cinco abas

| Painel | Leituras | Recursos Power BI |
| --- | --- | --- |
| Evolução empresarial | Entradas, saídas e estoque; ARTs e empresas distintas | Combinado com escalas identificadas; parâmetro ou visuais alternados |
| Cobertura territorial | Maiores universos GRE; mapa municipal; ranking CNAE | Colunas empilhadas + linha; mapa homologado; barras não aditivas |
| Vínculo e atividade técnica | RT no corte × ART na janela; continuidade | Matriz com formatação condicional e barras |
| Contratações e evidências | Demanda por categoria; fornecedores; ponte contrato–ART | Treemap e barras com medidas distintas de CNPJ/contrato |
| Caixa e carteira empresarial | Recebimentos e recuperação incluída; atraso; carteira inicial | Colunas empilhadas e barras com coorte fixa |
| Mercado e ingresso cadastral | Emprego × base por GRE; dois desfechos de coorte externa | Dispersão e barras/fluxo com numerador e complemento |

A leitura territorial inicial usa os maiores universos, não todas as GREs simultaneamente. Tornar o ranking explícito e preservar o total e acesso às regiões pelo filtro. Município sem observação não recebe zero. CNAEs principais/secundários podem sobrepor estabelecimentos.

A coorte externa tem **dois desfechos paralelos**, ingresso posterior e sem ingresso, a partir do mesmo baseline. Não desenhá-los como etapas sequenciais. Sankey requer visual adicional homologado; barra empilhada oferece alternativa nativa simples.

## Alternância e ampliação na mesma página

Usar parâmetros de campo quando só muda a medida/dimensão, preservando o tipo de visual. Quando muda o tipo, agrupar visuais no painel de seleção e usar **bookmarks** para alternar visibilidade. Nos bookmarks de apresentação, desativar a captura de dados para não restaurar segmentações e desfazer o recorte.

A ampliação pode usar bookmarks que exibem um grupo ampliado e ocultam os demais, com retorno, ou modo de foco nativo após teste no Service. Não exige cinco páginas temáticas. CSS, ECharts e estado React não se convertem diretamente nesses recursos.

Configurar interações visual a visual. Taxa recalculada sobre subconjunto pode mudar de interpretação; a definição precisa expor seu denominador. Um contrato/CNPJ selecionado pode levar a tabela de **empresas-raiz distintas**, com a mudança de unidade clara.

A ficha empresarial corresponde a página auxiliar de **drillthrough**, com retorno ao recorte, não a aba administrativa. Tabela e ficha permanecem de leitura; nenhum encaminhamento, autuação ou conclusão de caso ocorre no relatório.

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
| Contrato–ART requer documento | Ponte com origem/data/validade; ART genérica não basta |
| Emprego é agregado | Ligar tempo/território/CNAE/CBO; nunca diretamente a empresa |
| Recebimento é fluxo; dívida é estoque | Data efetiva de pagamento; saldo líquido no corte |
| Recuperação integra recebimento | Coorte fixa vencida/aberta no baseline, sem novas dívidas no denominador |

Retenção usa fotografia RFB disponível até haver histórico homologado. Cobertura de fornecedores usa CNPJ e vigência na última publicação técnica selecionada por fornecedor; publicação não é execução. Evidências convergentes são regra booleana explicável, não probabilidade de infração ou pontuação oficial. Ingresso posterior à observação não atribui causalidade à gestão.

Sem denominador válido, retornar `BLANK`. CNPJ é string com zeros e letras. Filtros nominais/porte não podem reduzir só a carteira empresarial enquanto o emprego público agregado permanece indevidamente como universo equivalente.

### DAX conceitual

```dax
Cobertura cadastral % :=
DIVIDE([CNPJs elegíveis com registro exato vigente],
       [CNPJs externos elegíveis])

Continuidade de RT % :=
DIVIDE(SUM(FatoDiaEmpresa[DiasCobertosRT]),
       SUM(FatoDiaEmpresa[DiasRegistrados]))

Recuperação da carteira inicial % :=
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

## Visual, segurança e governança

Paleta: `#0E1732`, `#15265C`, `#3662E2`, `#6077B6`, `#FFB001`. Superfícies escuras e degradês pontuais devem conservar contraste de eixos, legendas, rótulos e foco. Amarelo marca hierarquia/seleção; nem toda medida é alerta. A engrenagem é motivo original, não selo oficial.

O tema `integrations/powerbi-theme-creasp-v11.json`, também disponível em `/themes/powerbi-theme-creasp-v11.json` na hospedagem, reproduz a base cromática escura. A validação registrada em `integrations/powerbi-theme-creasp-v11.validation.json` passou sem erros no schema oficial Microsoft `reportThemeSchema-2.157.json` (SHA-256 `c74fc80a1262a6127ddddea1722046eeaeb3fbb42789d6cae1f7c83e8f838c09`). A importação no Desktop **não foi testada**. Tema não contém medidas, canvas ou visuais; validar a reprodução na versão Desktop usada. Mapas e visuais personalizados exigem avaliação de licença, acessibilidade, exportação e política institucional.

Aplicar RLS por território/escopo e OLS/permissões adequadas a financeiro e dados pessoais. Perfis locais React simulam apresentação/CSV; não são segurança de produção. Controlar exportação no modelo/workspace e auditar regras. Restrição de acesso não pode criar falsa ausência cadastral: conciliar em escopo autorizado e fornecer flags adequadas ao consumidor.

A hospedagem permanece privada. Uma versão pública exige seleção/validação próprias. A referência TCU recebida não torna os 17 indicadores automaticamente métricas públicas obrigatórias.

## Homologação

Conferir numeradores/denominadores contra as fontes; reconciliar estoque/fluxo, centavos e integridade das pontes. Testar filtros, coortes, revisões/exclusões, refresh, RLS/OLS, exportação e retorno do drillthrough. Validar canvas nas telas de PC com o ajuste real do navegador.

A evidência do protótipo fica em [QA_V11.md](QA_V11.md). Não extrapolar testes React para afirmar compatibilidade visual exata, conector pronto ou segurança homologada no Power BI.
