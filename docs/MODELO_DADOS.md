# Modelo de dados — V8 / CREA-SP

O modelo une **SQL Server e IBM Db2 por dimensões conformadas**, com leitura nativa via gateway no Power BI. Fontes externas homologadas chegam por API/ETL ao staging analítico. A definição das views e a escolha do banco de cada domínio dependem do inventário institucional; não foram inferidas a partir da interface.

A aplicação React usa **fixtures relacionais com semente fixa**, sem acesso a bancos privados. Nenhum total de PDF/notícia/site nem snapshot histórico externo constitui medida corrente da V8. Os lotes reais só entram no modelo de produção após extração completa, validação e publicação. Fonte elegível/configurável não significa fonte conectada ou refresh ativo.

## Dimensões e identidade

| Dimensão | Chave e função |
| --- | --- |
| Empresa | Identificador institucional e raiz CNPJ; pessoa jurídica distinta, sem confundir filiais ou grupo econômico |
| Estabelecimento | Identificador e CNPJ completo; empresa, matriz/filial, situação Receita e localização |
| Profissional | Identidade interna; situação, ingresso e domicílio, sem equivalência nominal com trabalhador de base agregada |
| Registro | Identificador administrativo próprio, entidade associada e circunscrição; não é uma empresa distinta |
| Município / GRE | Código IBGE e associação territorial com início/fim de vigência; papéis de estabelecimento, domicílio, oferta e contratante separados |
| CNAE | Principal/secundário em ponte; classificação original da planilha, versão e vigência |
| Modalidade / título | Classificação profissional; pessoa pode possuir vários títulos |
| CBO / CINE | Ocupação e classificação educacional; não equivalem automaticamente a CNAE, título ou atribuição |
| Porte / natureza jurídica | Perfil cadastral com corte ou vigência quando disponível |
| Órgão contratante | Identidade do comprador; fornecedor e local da obra são papéis diferentes |
| Calendário / competência | Datas de eventos, meses e anos de fontes agregadas; não usar data de consulta como competência |
| Regra de conciliação / evidência | Critério versionado, conjunto de fatos identificados e limitações da fiscalização digital |
| Fonte / lote / regra | Sistema, lote validado, data de carga, versão da fórmula, cobertura e responsável |

A mesma numeração interna em SQL Server e Db2 não prova a mesma entidade. Preservar `SourceSystem` e chave original, gerar chave analítica estável e usar correspondência homologada. CNPJ completo é chave determinística de estabelecimento; raiz consolida a pessoa jurídica. Nomes normalizados e CPF mascarado geram sugestão de revisão, sem fusão automática. Alterações de chave, migrações e exclusões precisam de contrato explícito.

Os 702 CNAEs do arquivo recebido preservam descrição e marcador original: 638 relacionados e 64 que dependem de análise. A classificação não decide sozinha obrigatoriedade de registro. GRE tem tabela territorial própria: os nomes do organograma não fornecem o mapa completo dos 645 municípios.

## Fatos e pontes

| Tabela analítica proposta | Grão | Relações principais |
| --- | --- | --- |
| FatoRegistroSnapshot | Registro × corte | Empresa/estabelecimento, situação observada e data de corte |
| FatoMovimentoCadastral | Evento datado de registro | Registro, empresa e tipo: entrada, baixa, reativação ou cancelamento |
| FatoProfissionalSnapshot | Profissional × corte | Situação e domicílio no corte; histórico depende de fonte própria |
| FatoFormacaoDeclarada | Declaração/título de formação por pessoa | Profissional, curso, modalidade, ano de conclusão e evidência cadastral |
| FatoVinculoRT | Vínculo empresa–profissional com vigência | Empresa, profissional, modalidade e início/fim |
| PonteEmpresaQSA | Participação societária com vigência/evidência | Empresa e pessoa; identidade confirmada/sugerida separadas |
| FatoART / PonteARTAutor | Documento ART / autor expresso por documento | Empresa, profissional comprovado, tipo, datas e estado; RT não presume autoria |
| FatoCAO / PonteCAO_ART | Certidão operacional / ART relacionada | Pessoa jurídica titular, solicitação, emissão e estado; não é CAT |
| FatoObrigacao / FatoPagamento | Parcela/obrigação / pagamento ou estorno datado | Empresa, registro, competência, vencimento, exigibilidade e caixa |
| FatoCaso / FatoEtapa / FatoResultado | Caso / passagem datada / decisão documentada | Prestação de contas e histórico de ficha; não compõem avaliação de fiscais na página digital |
| FatoConciliacaoCadastral | Linha de origem × lote × regra | CNPJ completo, raiz candidata, registro/visto, resultado determinístico ou sugestão |
| FatoSinalDigital / PonteSinalEvidencia | Sinal de regra × empresa / fato utilizado | Critério, data de corte, IDs dos fatos, origem e limitação; não auto ou penalidade |
| FatoQualidade | Evento de divergência com estado | Entidade, fonte, tipo e abertura/resolução |
| FatoContrato | Contrato pela chave publicada/institucional | Fornecedor, órgão, objeto, datas e valor; ART precisa de vínculo contratual expresso |
| FatoEmpregoAgregado | Mês × município × CNAE × CBO, conforme fonte | Tempo/território/atividade/ocupação; **sem EmpresaID ou ProfissionalID** |
| FatoEducacaoAgregada | Ano × CINE × município de oferta × modalidade, conforme edição | Tempo/oferta/área; **sem identidade individual CREA** |

As dimensões filtram fatos em sentido único. Evitar tabelas achatadas que multipliquem ART, orçamento, dívida ou contrato ao juntar vários RTs, CNAEs e participações. Pontes geram conjuntos distintos de IDs; propagação entre pessoas/empresas é explícita e validada. Uma filial selecionada pode trazer fatos da pessoa jurídica: isso deve ser declarado, sem atribuir todo o saldo exclusivamente à filial.

## População fictícia reproduzível

Semente `20260930`, corte em 30/09/2026 e geração em `src/domain/dataset.ts`. As medidas/filtros estão em `engine.ts`, as relações profissionais em `professionals.ts` e os combinados executivos em `src/report/executive-decisions-v8.ts`.

| Entidade | Volume demonstrativo | Unidade |
| --- | ---: | --- |
| Empresas | 3.000 | Raízes empresariais distintas |
| Estabelecimentos | 3.600 | CNPJs completos |
| Registros | 4.500 | Registros/vistos administrativos |
| Profissionais | 600 | Pessoas fictícias, incluindo sem empresa |
| Formação declarada | 720 | Declarações por profissional; não microdados INEP |
| QSA | 210 | Participações com classes de identidade |
| Autoria expressa de ART | 271 | Relações autor–ART da ficção |
| Vínculos RT | 1.500 | Relações com intervalo de vigência |
| ARTs / CAOs | 7.000 / 800 | Documentos e solicitações/certidões próprias |
| Obrigações financeiras | 3.500 | Parcelas com datas e estados |
| Casos / contratos | 900 / 1.200 | Grãos distintos |
| Emprego agregado | 51.840 | Município × CNAE × CBO × mês |
| Staging de conciliação | 3.780 | Linhas de origem com erros/duplicações rastreáveis |

Eventos cadastrais e de qualidade são derivados de registros/evidências. A amostra usa 24 municípios, 14 GREs, cinco modalidades e cinco CBOs. A geometria oficial é de 645 municípios; os demais não têm observações demonstrativas, sem preencher zero estatístico real.

`src/domain/institutional.ts` é **legado demonstrativo V6/V7**, fora da página executiva V8. Compartilha as identidades fictícias existentes, com semente `20260930+v6` e cobertura outubro/2024–setembro/2026. O sufixo da semente mantém a reprodução do dataset; não habilita fatos históricos excluídos. Os nove CSVs institucionais somam 20.979 linhas: quatro programas, 384 atividades, 7.946 participações, 2.304 orçamentos, seis unidades, 144 capacidades mensais, 2.678 usos, 6.433 acompanhamentos e 1.080 solicitações.

## Regras das análises executivas

As seis perguntas da página Presidência e resultados são calculadas em `src/report/executive-decisions-v8.ts`:

1. **Cadastro: fluxo × estoque.** Eventos datados alimentam entradas/saídas e o livro de registros ativos no corte mensal. Empresa, registro e evento são contagens próprias; a coorte selecionada não vira censo retrospectivo completo.
2. **Continuidade técnica empresarial.** Denominador de **empresas distintas com registro ativo**; numerador com ao menos um RT cuja vigência cobre o corte. Sem RT identificado é lacuna para verificação, não irregularidade declarada. A distribuição GRE aloca cada raiz a uma sede visível (ou filial representativa por ID), sem duplicar empresa em vários territórios.
3. **Atividade profissional observada.** Denominador de **profissionais ativos**; autoria exige ponte documental explícita, não vínculo RT presumido. Mostrar cobertura de identificação entre ARTs observadas. A ficção tem cobertura parcial; ausência de autoria identificada não mede desemprego, desvalorização ou ausência de atuação.
4. **Produção técnica mensal.** ARTs pela data do documento e autores distintos pela ponte expressa, em eixos próprios. Autores mensais não são somáveis como pessoas únicas anuais. Registros sem autoria identificada permanecem ARTs, com lacuna de qualidade visível.
5. **Recebimentos empresariais.** Fluxo por data de pagamento, com **recuperado como subconjunto** do recebido. Recebimento ordinário + recuperado = recebimento total. Saldo vencido é estoque na data e exige obrigação/exigibilidade, não outra parcela de receita. A base PJ selecionada não corresponde a toda a arrecadação do CREA-SP.
6. **Cadastro × economia regional.** Empresas ativas e estoque de emprego agregado usam os mesmos territórios/competências inicial e final e seus próprios denominadores. Seleção nominal/porte/situação que reduz só o cadastro **bloqueia a comparação**; preserva a série agregada sem inventar empregados de cada empresa. Crescimento zero de população inicial produz resultado ausente, não taxa infinita.

Formação declarada descreve registrados com campo disponível; não estima concluintes paulistas, estoque de diplomados ou taxa de ingresso de egressos. Ano da graduação → primeiro registro é descritivo, com controle de datas incompatíveis. Programas, coworkings e SLA legados não integram essas seis perguntas V8.

## Filtros, papéis e cobertura

OR dentro de uma dimensão, AND entre dimensões. CNAEs secundários participam da seleção sem duplicar empresas. Composição exclusiva pode usar atividade principal, distinguindo-a da seleção multivalorada. Seleção de categoria produz IDs de subconjunto preservados na tabela/ficha.

Empresa usa município do estabelecimento; profissional usa domicílio; educação usa local de oferta; PNCP distingue unidade contratante, fornecedor e obra. O cenário contratual usa município do fornecedor, explicitamente. GRE e geografia somente propagam a fontes de cobertura/papel homologados.

Emprego agregado não responde a CNPJ, porte ou profissional nominal. Educação agregada não responde a nome/CPF. Estoques não são somados no tempo como pessoas distintas. Dados sem observação ficam nulos; ausência é diferente de zero medido.

O comparativo executivo econômico usa `scope.employmentScopeLimited` para bloquear conjuntos incompatíveis. A seleção municipal/GRE deve alcançar cadastro e emprego no mesmo papel; classificação CNAE pode cruzar fontes compatíveis, sem transformar um CBO em atribuição profissional.

Na Transparência, ano, subprograma, tipo de catálogo e pesquisa selecionam **regras**. Filtros de empresas/pessoas não alteram um orçamento aprovado institucional ou criam resultado anual a partir de catálogo sem valores. O catálogo registra 44 indicadores regionais (42 CREA + dois com dependência federal), nove exclusivamente federais excluídos e 185 regras de dados CREA ativas entre 186 preservadas.

O conjunto institucional legado conserva seus grãos de pessoa, atividade, orçamento e capacidade; não é parte da navegação principal V8. Suas regras de coorte/alocação continuam documentadas no histórico, sem reaparecer como medida executiva.

## Reconciliação e qualidade

- Registros = ativos + inativos + cancelados; empresas registradas = com algum registro ativo + sem registro ativo.
- Saldo cadastral = novos + reativações − baixas − cancelamentos; estoque segue o mesmo livro de eventos.
- Universo selecionado = correspondidos + sem correspondência; ausência no cadastro não prova obrigação ou infração.
- Saldo de emprego = admissões − desligamentos; estoque usa a última competência, sem soma mensal.
- Adimplência usa empresas com obrigação vencendo até o corte como denominador; parcela futura não cria inadimplência. Em aberto inclui a vencer; vencido é subconjunto exigível conforme regra homologada.
- Pagamento futuro não reduz saldo no corte; componentes de custo direto já incluídos no orçamento não são somados novamente.
- Pessoas com várias participações, títulos, vínculos ou filiais não são duplicações indevidas. Chave de fato repetida sem revisão legítima é erro.
- Foreign keys de RT, ART, CAO, contrato e serviço referenciam entidades existentes; ponte CAO–ART preserva titularidade.

## Camada de integração e auditoria

Views normalizadas em SQL Server/Db2 fornecem chaves, campos de alteração, corte e exclusão/encerramento. A ingestão externa publica somente lote completo validado no staging. Manter watermark após commit, última carga válida e versões de competências revisadas; jamais substituir falha por zeros. `SourceId`, `BatchId` e regra versionada devem acompanhar as medidas/exportações.

`npm run data:export` / `npm run data:institutional` exportam a ficção relacional. O coletor `scripts/refresh-sources.ts` produz lotes elegíveis em `var/source-ingestion/`; carga em staging e consumo semântico dependem de configuração. `npm run data:archive` mantém os snapshots apenas em `archives/data-publica-v6/`, fora do conjunto adotado. CNPJ, raiz e códigos são texto; datas ISO, UTF-8 com BOM e delimitador `;`. Transformações semânticas e conectores estão em [POWER_BI.md](POWER_BI.md); rotina, segurança e testes de integração em [ATUALIZACAO_AUTOMATICA_V7.md](ATUALIZACAO_AUTOMATICA_V7.md).

## Fiscalização digital: fatos de evidência, sem score arbitrário

`src/domain/digital-inspection.ts` gera seis leituras relacionadas: conciliação CNPJ, CNAE, objetos PNCP potencialmente técnicos, RT vigente, emprego regional e evidências convergentes. O motor conserva IDs, fonte, corte, critério e limitação.

- **CNPJ completo válido:** correspondência determinística por estabelecimento. Raiz coincidente é sugestão para revisar filial/registro/visto, não confirmação automática de cobertura.
- **CNAE:** principal/secundários preservam “Relacionado” e “Depende de análise” da planilha; nenhum marcador decide sozinho obrigação ou infração.
- **Objeto de contratação:** classificador demonstrativo por termos/regras; mostrar termos e justificativa, sem alegar modelo treinado. ART do fornecedor não é ART do contrato sem chave contratual explícita.
- **Vínculo técnico:** usar início/fim e situação no corte; empresa ativa sem RT identificado merece análise documental, sem juízo automático.
- **CAGED/RAIS:** contexto agregado de município/CNAE/competência; nenhum trabalhador é ligado artificialmente a profissional ou CNPJ.
- **Convergência:** contar empresas distintas por conjuntos de sinais; múltiplos sinais não são probabilidade de infração. Não somar barras sobrepostas como total de pessoas/empresas.

Caso, auto, julgamento e sanção são fatos de origem distintos, usados na ficha histórica e na prestação de contas. Não são métricas de produtividade na página Fiscalização digital.

## Catálogos V8, homologação e nulos

`available-fields-v8.json` contém 128 contratos extraídos de dois PDFs/cinco JPGs como evidência de campos. `confea-catalog-v8.json` preserva regras e proveniência integral da planilha; `confea-ui-v8.json` é sua versão compacta para interface. `transparency-rules-v8.json` registra dispositivos oficiais e seu alcance. Nenhum arquivo de regras alimenta valores históricos como números atuais.

O indicador 53 é orçamento aprovado de fiscalização **#183 / orçamento aprovado total #182**. Dado aprovado é distinto de gasto efetivo; a razão não comprova crescimento real acima da inflação. Indicador 35 mantém conflito de fórmula da fonte, sem valor calculado até homologação.

Aceite físico de fonte/medida: mapear `SourceSystem`, chave original, grão, view/schema, corte e competência, campos de alteração/exclusão, `BatchId`, cobertura, idade da carga e dono. Validar **nulo ≠ zero**, deduplicação legítima, reconciliação dos denominadores e datas. A fonte ausente não recebe estado conectado; o catálogo de Transparência permanece sem números atuais até a implantação real. A futura publicação usa payload/modelo próprio com campos aprovados, não o modelo privado com visuais ocultos.
