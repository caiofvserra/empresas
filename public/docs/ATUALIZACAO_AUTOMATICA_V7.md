# Fontes e atualização automática — CREA-SP / V8 (caminho canônico mantido)

## Critério de entrada no relatório

O BI deve consumir dados obtidos diretamente de **bancos de dados homologados ou APIs**, com uma rotina de atualização, responsável e contrato de fonte definidos. Publicações em páginas, PDFs, notícias e JSONs mantidos manualmente não constituem essa rotina. Os números do relatório de gestão do CREA-SP e os snapshots históricos de sites/repositórios foram retirados das medidas visíveis desta revisão. As referências podem permanecer no histórico técnico, sem se tornarem fatos atuais do BI.

A fala sobre a orientação da Presidência é contexto para escolher boas perguntas. Não é uma base factual para afirmar superestimação, favorecimento ou desempenho. A V8 reúne mudança cadastral, continuidade RT na base ativa, autoria técnica realmente identificada, produção, recebimentos PJ e contexto econômico. Populações, cortes e unidades precisam ser comparáveis; programas/coworkings/SLA legados não compõem a página executiva.

**Origens internas confirmadas pelo usuário:** SQL Server e IBM Db2, com gateway. O Power BI utiliza seus conectores nativos (`Sql.Database` e `DB2.Database`); uma API intermediária não é requisito. O gateway dá acesso às origens privadas, mas não substitui modelagem, ETL ou homologação das views.

**Situação da entrega:** protótipo React com dados fictícios, coletor PNCP configurável e templates de conexão. Servidores, schemas/views reais e credenciais não foram fornecidos; esta entrega não valida a configuração do gateway institucional nem ativa seu agendamento. Código de coleta e origem elegível não comprovam conexão/rotina de produção. Não apresentar “atualização automática ativa” a partir da data de build da aplicação.

## Matriz de fontes e rotinas propostas

| Fonte | Origem autorizada para produção | Grão preservado | Rotina prevista | Estado nesta entrega |
| --- | --- | --- | --- | --- |
| Cadastro CREA-SP | Views de leitura SQL Server/Db2; conectores nativos via gateway | Empresa, estabelecimento, registro e evento cadastral | Incremental diário por chave/alteração; reconciliação periódica do estoque | Acesso não fornecido; demonstração relacional |
| Profissionais, títulos e RT | Views SQL Server/Db2 com identificadores e vigências; gateway | Pessoa, título e vínculo empresa–profissional | Diário; alterações e encerramentos com vigência | Acesso não fornecido; demonstração |
| ART e CAO | Views SQL Server/Db2 de registros e certidões; gateway | Documento, evento e ponte CAO–ART; autoria explícita | Diário por alteração, com histórico de revogação/cancelamento | Acesso não fornecido; demonstração |
| Financeiro e compras CREA-SP | Views SQL Server/Db2 contábeis e de contratos; gateway | Obrigação, pagamento, estágio contábil, contrato e centro de custo | Diário; reconciliação com fechamento contábil | Acesso não fornecido; demonstração; sem conexão homologada nesta entrega |
| Fiscalização digital | Views de cadastro/RT + staging Receita/PNCP e emprego agregado; gateway | Regra × empresa × fatos de evidência, com corte/lote e correspondência CNPJ | Após lotes homologados; versionar critérios e conservar origem | Demonstração; não calcula infração ou score arbitrário |
| Prestação de contas / colegiados | Views SQL Server/Db2 processuais e contábeis; gateway | Ação, auto, processo, decisão, sanção e gasto em fatos distintos | Fechamento e cortes homologados; histórico e retificações | Acesso não fornecido; catálogo sem números atuais |
| Atendimento e programas — legado de desenho | Views SQL Server/Db2 de serviço/participação, se homologadas | Solicitação, presença, pessoa identificada, capacidade e uso | Definir somente se o domínio for adotado em produção | Acesso não fornecido; fora da visão executiva V8 |
| PNCP | `https://pncp.gov.br/api/consulta/v1/contratos` | Contrato pela chave publicada; órgão, fornecedor e datas como papéis distintos | Coleta diária paginada; janela sobreposta e revisão periódica | Coletor oficial configurável; agendamento e carga de staging não ativos nesta entrega |
| Receita Federal/CNPJ | Banco de staging alimentado pelo conjunto oficial de dados abertos | Raiz de empresa, CNPJ completo de estabelecimento e QSA | Verificação de nova competência e carga em banco; revisão mensal proposta | ETL/carga em banco pendentes; sem supor API nominal pública irrestrita |
| RAIS | Banco agregado alimentado por publicação oficial ou acesso autorizado | Ano × município × CNAE × CBO, conforme edição e disponibilidade | Verificação de nova edição anual; reprocessar revisões | ETL pendente; sem acesso nominal de trabalhadores |
| Novo CAGED | Banco agregado alimentado por arquivos/API oficial, se homologada | Mês × município × CNAE × CBO, conforme conjunto | Verificação mensal; reprocessar competências revisadas | ETL pendente; dados de sites secundários excluídos |
| INEP / Censo da Educação Superior | Banco agregado após ETL dos arquivos oficiais de cada edição | Ano × instituição/curso/CINE × município de oferta × modalidade, conforme fonte | Verificação de nova publicação anual; validar esquema e carga | ETL oficial em banco pendente; não há API contínua confirmada nesta entrega |
| IBGE | API oficial de códigos/estatísticas homologadas; geometria versionada no banco | Município IBGE e série/tabela estatística própria | Cadastro territorial versionado; periodicidade da série | Geometria/códigos usados como referência; rotina estatística ainda pendente |
| CNAE e GRE | Tabelas de referência do banco, homologadas e versionadas pelas áreas | Código/classificação e município–GRE com início/fim de vigência | Carga após aprovação de revisão; controle de versão | Arquivos do usuário preservados; vínculo territorial completo não homologado |

Frequência diária ou mensal é **proposta de arquitetura**, não frequência comprovada dos sistemas do CREA-SP. Cada dono de dado deve confirmar permissões, endpoint/view, periodicidade, retenção e capacidade operacional. É possível automatizar a importação de arquivos oficiais para banco sem transformar um download periódico em uma “API INEP”. O relatório consome o banco resultante; a cadeia de ingestão também precisa ser auditável.

## Contrato mínimo de cada fonte

Registrar `SourceId`, domínio, proprietário confirmado, origem técnica, tipo de conexão, método de autenticação, grão, chave estável, competência, cobertura territorial, campos de alteração, política de exclusão, frequência, fuso, versionamento e permissões. Campos do estado de carga: última tentativa, último sucesso, lote publicado, watermark confirmado, linhas recebidas/publicadas/rejeitadas, cobertura e erro sanitizado.

Um indicador habilitado em produção exige: origem DB/API homologada; rotina ativa; última carga válida; fórmula/grão homologados; cobertura compatível; controle de acesso e validação de reconciliação. Ausência desses requisitos permanece explícita como **demonstração**, **integração pendente**, **carga atrasada** ou **fonte indisponível**. Data da consulta não substitui competência do fato.

## Fluxo de ingestão e publicação

1. O orquestrador lê o contrato e o watermark do último lote publicado. Usa credenciais somente no backend/cofre e uma identidade de leitura com menor privilégio. O browser React e arquivos `.pbix` distribuídos não recebem tokens de integração.
2. A extração grava um lote imutável na área de entrada. DB usa views/CDC ou `updated_at` comprovado; API usa base URL fixa, parâmetros, paginação e limites oficiais. Arquivos anuais têm edição, hash e versão. Não avançar o watermark durante paginação incompleta.
3. Staging normaliza chaves e tipos, conserva o original rastreável, rejeita esquema inesperado e separa erros. Deduplicar pela chave do fato, preservando eventos legítimos e revisões. Uma pessoa com múltiplos títulos ou uma empresa com filiais não vira duplicidade indevida.
4. Validar chaves estrangeiras, totais, competências, proporções, valores e cobertura. Um lote completo deve satisfazer critérios definidos para sua fonte; não publicar uma resposta HTTP vazia como um estoque real igual a zero.
5. Transformar e publicar dimensões/fatos em uma transação ou troca atômica de partição. Atualizar o watermark somente após commit e validação. Preservar o **último lote válido** quando houver falha; exibir seu corte e o atraso no relatório.
6. Atualizar o modelo semântico Power BI após a carga do banco. Registrar a relação entre lote de origem, processamento e refresh do modelo. Carga DB e refresh Power BI são etapas diferentes; sucesso de uma não comprova o outro.

## Incremental, revisões e histórico

O par `(dataAlteracao, chave)` evita perder linhas quando várias mudanças compartilham o mesmo timestamp. O timezone e a resolução do campo devem ser conhecidos. Aplicar janela de releitura para atualizações tardias e um upsert idempotente; guardar tombstones/encerramentos quando a fonte os expuser. Sem campo de alteração ou CDC confiável, adotar snapshot completo comparável e detectar diferenças, sem inventar incremental.

Eventos históricos de registro, pagamento, vínculo e processo não podem ser reconstruídos somente do status atual. Manter livro de eventos e snapshots datados onde necessários. Para emprego e educação, uma revisão de competência substitui a versão publicada daquela partição, preservando a anterior para auditoria; nunca empilhar versões como fatos adicionais.

No PNCP, registrar páginas recebidas, total anunciado quando disponível, chave publicada e janela coberta. Tratar 429 e falhas transitórias com retry limitado/backoff, sem avançar o lote; mudança de esquema gera falha explícita. Contratos retificados exigem janela sobreposta e revisão histórica. O recorte SP identifica o município da unidade contratante quando essa é a chave observada; não representa automaticamente local da obra ou domicílio do fornecedor.

## Power BI Service

Usar **Import com refresh agendado** como proposta inicial sobre views/tabelas analíticas SQL Server e Db2. Associar as duas conexões nativas ao **on-premises data gateway em modo padrão**, com identidade de serviço de leitura, responsável, cluster e credenciais configurados no serviço. Não colocar segredos no projeto. Templates de empresa usam carga completa; `SQL_SERVER_MOVIMENTO_INCREMENTAL.pq` e `DB2_MOVIMENTO_INCREMENTAL.pq` usam data de evento imutável para o intervalo. Nomes de views em `integrations/power-query/` e `integrations/sql/` são contratos propostos, sem origens reais nem conectividade certificada. Confirmar rede, provider/driver Db2 e TLS no gateway.

A API PNCP é coletada upstream para staging homologado SQL Server ou Db2; não exige que o Power BI acesse o browser React. Uma ponte API interna seria adaptação opcional para outras aplicações, não requisito para os conectores SQL/Db2. A rotina de staging e o refresh semântico permanecem etapas distintas.

Quando houver volume e origem que suporte query folding comprovado nas views/conector/provider reais, usar incremental com parâmetros `RangeStart`/`RangeEnd`, fronteira inicial inclusiva e final exclusiva, retenção e detecção de alterações homologadas. Validar folding e as partições no serviço. Arquivos anuais já carregados no banco recebem partições por edição/competência. DirectQuery não elimina atraso de fonte nem substitui ETL, segurança ou reconciliação; avaliá-lo somente com necessidade de latência e desempenho comprovados.

RLS/OLS e permissões do workspace/modelo protegem dados pessoais, financeiros e territoriais. Perfis do protótipo são demonstrações de apresentação, não segurança de produção. Configurar restrições de exportação, políticas de acesso, auditoria e disponibilidade do gateway. O relatório permanece de leitura; correções cadastrais e tratativas são feitas nos sistemas de origem.

## Rotina executável e estado de conexão

```bash
node --import tsx scripts/refresh-sources.ts --config integrations/refresh-sources.example.json
```

O exemplo está com `enabled: false`; executá-lo sem ajuste retorna `disabled`, sem coletar. Copiar para configuração privada, escolher armazenamento autorizado e habilitar a coleta. O CLI não agenda a rotina. O padrão são sete dias completos, com um dia de defasagem UTC; `--start YYYY-MM-DD --end YYYY-MM-DD` permite recomposição de até 366 dias por execução. `publicationWatermark` marca publicação coberta, não CDC nem cobertura anterior ao primeiro intervalo.

Usar Node.js 24 para o coletor. Com proxy de saída, executar `NODE_USE_ENV_PROXY=1 node --import tsx scripts/refresh-sources.ts --config <configuracao-privada.json>`; sem proxy, a variável não é necessária. Credenciais de banco/gateway não entram nessa configuração.

A saída padrão `var/source-ingestion/pncp/` fica fora de `public/`: `batches/` imutáveis, `status.json`, `runs.ndjson` e `current.json` com registros, cobertura e watermark publicados atomicamente. Estado `collected-not-promoted` indica que o modelo ainda não está conectado. Uma janela recoletada substitui seus registros, sem acumular duplicatas; bloqueio impede execuções concorrentes no mesmo diretório. Em falha, preservar `current.json` anterior.

Carregar o lote validado no staging SQL Server/Db2 e atualizar o modelo pelo orquestrador homologado. `PNCP_BATCH_FILE.pq` permite inspeção técnica alternativa por caminho de rede; não substitui a arquitetura de produção adotada nem sua homologação.

`src/integrations/catalog.ts` declara elegibilidade, conectores e impedimentos. SQL Server/Db2, RAIS/CAGED/CNPJ/INEP permanecem não configurados sem contratos/acesso reais; o coletor PNCP não configura sozinho o gateway. Fixtures nunca recebem estado conectado. Snapshots exportados antes estão em `archives/data-publica-v6/`, identificados como históricos/excluídos; `npm run data:archive` não os reintroduz no BI.

## Formação e diplomados: preservar a pergunta

A automação não remove a análise de formação paulista. O ETL oficial INEP deve produzir ingressantes, matrículas e concluintes por edição/CINE/território de oferta, com universo explicitado. **Conclusões de cursos não são estoque de pessoas diplomadas distintas**. Um estoque de diplomados exige outra fonte/conceito homologado, não soma acumulada dos concluintes anuais nem reprodução de referência nacional de um site.

O cruzamento com CREA-SP compara séries agregadas compatíveis e anos com observação. CINE, CBO, CNAE e modalidade CREA são dimensões distintas: qualquer ponte precisa de regra validada. Sem CPF e finalidade/autorização adequada, não criar funil individual diplomado → registrado → empregado. RAIS/CAGED agregados ligam-se às dimensões de tempo/território/atividade/ocupação, nunca artificialmente ao profissional ou CNPJ fictício.

## Testes e aceite da integração real

- Simular falha de página, timeout, 429, resposta vazia e esquema alterado: último lote válido e watermark devem ser preservados.
- Reexecutar o mesmo lote sem duplicar registros; testar empates de timestamp, alteração tardia e exclusão/encerramento.
- Reconciliar dimensões e fatos com controle da fonte; checar SP, chaves e competência antes do commit.
- Verificar que indicadores e exportações não consultam snapshots históricos excluídos nem agregados transcritos de PDFs.
- Confirmar chave e papel territorial de fornecedores/órgãos; nome aproximado não comprova identidade.
- Validar credenciais no backend, RLS/OLS, gateway, folding e refresh do serviço no ambiente institucional.

Esta entrega não certifica esses testes de integração institucional: faltam acesso e ambiente de produção. As verificações do protótipo estão em [QA.md](QA.md); os contratos e critérios acima tornam a futura implantação concreta e verificável.

## Contratos V8 e aceite manual de campos reais

Os dois PDFs, cinco JPGs e a planilha anual enviados são **evidência de campos e regras**, não uma ingestão de resultados. `available-fields-v8.json` descreve 128 contratos observados/propostos; `confea-catalog-v8.json` preserva proveniência e `confea-ui-v8.json` entrega metadados compactos à interface. Todos os valores atuais do catálogo permanecem nulos. `transparency-rules-v8.json` contém norma/dispositivo/alcance, sem feed numérico.

A homologação manual do schema precede habilitação da medida. Para cada campo/view confirmar:

| Item de aceite | Evidência necessária |
| --- | --- |
| Sistema e nome físico | `SourceSystem`, servidor/database/schema/view e nome/tipo real; igualdade de IDs entre SQL Server/DB2 não prova identidade |
| Grão e chave | Uma linha por entidade/evento/corte declarado, chave estável e política de revisão/deduplicação |
| Semântica e unidade | Empresa ≠ estabelecimento ≠ registro; ação ≠ auto ≠ processo; ART ≠ autor; aprovado ≠ pago; fluxo ≠ estoque |
| Nulo e zero | Campo ausente/inexistente fica nulo; zero somente após observação válida. Nenhum preenchimento automático com zero por falha |
| Tempo e vigência | Competência, corte, data de evento/pagamento, timezone e intervalos de RT; alterações/exclusões/tardios documentados |
| Rastreabilidade | `SourceId`, `SourceSystem`, `BatchId`, regra/versão, última carga válida, última tentativa, cobertura e **idade/atraso da fonte** |
| Reconciliação | Contagem/valor de controle da origem; integridade referencial e reconciliação do denominador/população |
| Aceite de domínio | Responsável de dado e validador confirmados; campo visto no print ou nome de unidade no organograma não substitui aprovação |

A execução completa/paginada do coletor PNCP comprova apenas extração daquela janela. Até promoção homologada ao staging e refresh do modelo, o estado permanece `collected-not-promoted`. Nenhuma nova conexão institucional foi ativada na V8.

## Definições V8 que a rotina deve preservar

A visão executiva exige empresas/profissionais **ativos no corte** nos denominadores de continuidade RT/autoria; ponte expressa de autor ART e cobertura de identificação. Sem autor não significa desemprego. Pagamentos usam data de pagamento; recuperação é subconjunto de recebimento PJ e saldo vencido é estoque. Esta base não representa toda a arrecadação do CREA-SP.

O crescimento cadastro–emprego usa mesmo período/território e populações próprias. Seleção nominal, porte ou situação que reduza apenas cadastro deve bloquear comparabilidade; não criar emprego individual por estimativa. Fiscalização digital preserva CNPJ exato versus raiz candidata, classificação CNAE, termos/regras de objeto PNCP, vigência RT, fatos agregados de CAGED e IDs de evidências. Não derivar infração/sanção nem produtividade dos fiscais desses sinais.

O indicador 53 consome **CREA#183 / CREA#182**, orçamento aprovado fiscal/total do mesmo exercício. Não substituí-lo por gasto realizado ou interpretar como crescimento real acima da inflação. Indicador 35 conserva conflito de fórmula sem valor calculado até homologação. A página regional mostra 42 indicadores CREA + dois de dependência federal; nove exclusivamente federais são excluídos. Dados CREA: 186 preservados, 185 ativos após retirada de 37-C.

## Preparar transparência sem publicar os dados internos

A página Transparência é uma **prévia privada**, sem botão de publicação ou alteração de audiência. [TRANSPARENCIA_NORMAS_V8.md](TRANSPARENCIA_NORMAS_V8.md) verifica DN-TCU 216/2025, PL-2260/2023 e PL-0926/2025: RG regional até 31/3; processo anual ao Confea até 1º/4; contribuição regional para consolidação federal. Portaria Segecex 10/2025 exige sua API padronizada inicialmente apenas dos federais.

A cadeia pública futura deve gerar artefato próprio de dados homologados, com campos permitidos, grão, competência, atualização e retenção/retificações. Não exportar o modelo interno e depender de RLS, abas ocultas ou filtro para remover microdados. Aceite CI do payload público deve comparar schema/lista permitida e rejeitar tabelas privadas, dívidas particulares, sinais nominais de suspeita, identificadores pessoais desnecessários, segredos e números transcritos dos anexos. Publicação depende de decisão institucional posterior, não do sucesso do refresh.
