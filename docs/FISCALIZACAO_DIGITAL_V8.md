# Fiscalização digital — CREA-SP / V8

A página é uma análise de evidências cadastrais e econômicas. Não mede produtividade da equipe, prazo de processos, quantidade de autos ou resultado de tratativas. Não altera protocolos e não calcula pontuação ou probabilidade de infração.

## Pergunta e caminho analítico

Quais estabelecimentos ativos, com atividades potencialmente relacionadas ao Sistema, precisam de conciliação ou verificação adicional a partir de fontes atualizáveis?

**RFB/CNPJ ativo → CNAE principal e secundários → CNPJ completo CREA → vigência do registro → vínculo RT → indícios no objeto PNCP → recorte territorial e econômico → evidências com referências → ficha empresarial.**

1. O Sankey conserva empresas distintas: CNPJ exato, somente raiz e não localizado são categorias mutuamente exclusivas. O ramo exato se desdobra em vigência e, para vigentes, vínculo RT.
2. A análise territorial combina universo RFB, correspondência exata, sugestões por raiz e percentual. Empresa com filiais pode estar em várias GREs: totais regionais não são aditivos. Uma matriz registrada em outra GRE não é contada como CNPJ exato da filial local.
3. A matriz CNAE × evidência inclui a classificação original da planilha e atividades secundárias. CNAEs e evidências podem se sobrepor; células não se somam para obter empresas únicas.
4. O treemap PNCP mede o valor de contratos com termos técnicos, por situação cadastral do fornecedor na competência. Valor contratado não é valor executado, pago ou de obra concluída.
5. A dispersão municipal compara saldo agregado de empregos setoriais com correspondência cadastral; bolha representa estoque no último mês. Não identifica trabalhador ou vínculo de emprego de um CNPJ.
6. As combinações mostram grupos sem sobreposição: objeto técnico + sem registro vigente, vigente + RT não identificado, só raiz sem objeto técnico, inativo sem objeto técnico, não localizado sem objeto técnico e vigente com RT identificado. Não expressam ranking de culpabilidade.

Cada clique seleciona IDs empresariais do conjunto correspondente. Município, GRE e CNAE também aplicam dimensões compatíveis. O botão de evidências abre a relação somente para leitura: busca, regra, ordenação, paginação, exportação autorizada e ficha.

## Grãos e identidade

- Origem RFB: uma linha de estabelecimento; chave CNPJ completo. Duplicidades excedentes são deduplicadas e preservadas como eventos de qualidade; linhas inválidas não criam empresas adicionais.
- Dimensão empresa: entidade jurídica / raiz CNPJ; uma empresa pode ter vários estabelecimentos.
- Correspondência determinística: CNPJ público completo comparado com o CNPJ do estabelecimento efetivamente referenciado pelo registro CREA. Registro de outra filial é apenas candidato pela raiz.
- Empresa no universo: ao menos um estabelecimento público ativo, aberto até a competência, com CNPJ validado e CNAE classificado `Relacionado` ou `Depende de análise`.
- Estado da empresa no recorte: ao menos um registro correspondente vigente; se há correspondência exata sem vigência, categoria distinta. Correspondência por raiz não aumenta cobertura exata.
- Percentual territorial: empresas com CNPJ exato de estabelecimento daquele território / empresas elegíveis daquele território. Não comprova cobertura de obrigação legal.
- Registro vigente: iniciado até o corte e último evento `Novo registro` ou `Reativação`; `Baixa` e `Cancelamento` encerram a vigência. Datas de início/fim são alternativa quando histórico não está disponível. O snapshot não reconstitui automaticamente situação na data de execução contratual.
- RT vigente: vínculo da empresa com início até o corte e fim ausente ou posterior ao corte. Conta-se vínculo; não se confunde com profissional distinto.
- Evidência: uma linha empresa × regra. Pode haver múltiplas regras para a mesma empresa. DIG-00 mantém empresas elegíveis sem combinação nas regras exibidas.
- Emprego: município × CNAE × CBO × mês. Não existe relacionamento empregado → CNPJ individual neste modelo. Filtros de empresa, porte e situação cadastral não reduzem o emprego agregado.

A validação numérica CNPJ do protótipo atende a identidade numérica dos dados sintéticos fornecidos. A camada curada de produção deve versionar a regra oficial da Receita para CNPJ numérico e alfanumérico antes de homologar a integração.

## Regras explicáveis

| ID | Evidência | Critérios / origem | Limite |
|---|---|---|---|
| DIG-01 | CNAE selecionado + cadastro não localizado | RFB ativa e CNAE relacionado/depende de análise; sem correspondência por CNPJ completo ou raiz | Ausência nas fontes consultadas não determina atividade sujeita ao conselho |
| DIG-02 | Mesma raiz, estabelecimento não confirmado | CNPJ completo não localizado; registro de outro estabelecimento da raiz | Sugestão de conciliação; não confirma abrangência do registro |
| DIG-03 | RFB ativa + registro sem vigência | Identidade exata e nenhum registro correspondente vigente na competência | Histórico inativo não comprova exercício atual de atividade |
| DIG-04 | Objeto técnico + registro vigente não identificado | CNAE elegível, termos explícitos no objeto PNCP do período e estado cadastral sem registro exato vigente no corte | Texto não prova execução, obrigação ou infração; situação observada no corte, não na data contratual |
| DIG-05 | Registro vigente + vínculo RT não identificado | Registro exato vigente e nenhum vínculo RT vigente da empresa na base integrada | Ausência na integração não equivale a ausência comprovada de RT |
| DIG-06 | Localização divergente | Evento de qualidade de município não resolvido para estabelecimento elegível | Pode refletir atualização ou mudança legítima; conciliar antes de interpretação territorial |

Cada registro contém ID da regra, critério, IDs dos fatos de origem, fonte, data de corte e limitação. Não existem pesos, percentuais de confiança ou modelo treinado. A classificação textual utiliza dicionário versionado TXT-01 a TXT-05; `operação e manutenção` sem termo específico permanece sem evidência suficiente, sem conclusão de que seja atividade não técnica.

**Contrato ↔ ART:** a relação contratual não existe no conjunto disponível. A existência de ART da mesma empresa não comprova ART daquele contrato, nem a ausência de ART empresarial no período comprova falta de ART contratual. A interface informa `Vínculo contratual ART não disponível`; nenhum indicador de contrato sem ART é calculado.

## Dados automáticos de produção

Todos os números desta página continuam demonstrativos, derivados do mesmo conjunto relacional de semente fixa. Não são dados reais conectados do CREA-SP. Nenhum número de notícia, site institucional, relatório PDF ou planilha histórica alimenta os valores analíticos.

O modelo produtivo deve receber:

- **SQL Server/DB2 via gateway:** cadastro/estabelecimento com CNPJ completo, registro e movimentação, vínculos técnicos e eventos de qualidade, por views homologadas de leitura. Dados incrementais usam chave de origem + carimbo de alteração, watermark persistente e atualização idempotente. Snapshot vigente e histórico devem ser conciliados.
- **Receita Federal:** ingestão automatizada dos arquivos oficiais de CNPJ (não presumir uma API pública completa inexistente), com competência, CNPJ, matriz/filial, situação, CNAEs e localização. Na demonstração, `PublicRow` preserva IDs de staging e a dimensão estabelecimento fornece situação e atividades secundárias.
- **PNCP API:** fornecedor/CNPJ, identificador único da contratação, objeto, data e valor; lote curado antes da conciliação. Filtro São Paulo pela dimensão geográfica apropriada. Município do fornecedor não identifica local da obra.
- **CAGED/RAIS:** ingestão periódica das bases publicadas ou fonte homologada disponível, com granularidade e restrições respeitadas. Publicação agregada não permite imputar empregados a empresas individualmente.

Antes de ativar indicadores reais: homologar views e campos, validar permissões do gateway, executar reconciliação e cobertura temporal, registrar atualização por fonte e sinalizar lacunas/defasagens. Não apresentar ausência de carga como zero ou irregularidade.

## Exportação e Power BI

`exportDigitalInspectionCsv(scope, canExport, companyIds?, ruleId?, evidenceIds?)` bloqueia perfil sem permissão e preserva somente as empresas/regras/evidências selecionadas. Exporta CNPJs, CNAEs, estado cadastral, IDs dos registros/RT/contratos, critério, origem, corte e limites. Protege células que poderiam ser interpretadas como fórmula em planilha.

Implementação prevista no Power BI: dimensões compartilhadas, tabela de conciliação por estabelecimento, fatos históricos, ponte empresa × evidência, matriz condicional, gráfico combinado territorial, dispersão municipal e drillthrough somente para leitura. Sankey e treemap podem exigir visual customizado aprovado ou equivalentes nativos. RLS e permissão de exportação devem ser efetivas no modelo publicado; os controles do protótipo apenas demonstram a experiência.
