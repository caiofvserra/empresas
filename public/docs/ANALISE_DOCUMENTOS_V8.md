# Leitura dos BIs existentes e escolha dos indicadores — V8

Os dois PDFs e cinco imagens enviados pelo usuário foram examinados por extração de texto e inspeção visual em 13/10/2026. Eles são evidência dos **campos e análises já apresentados** pelo CREA-SP. Não comprovam o esquema físico, a fórmula DAX, a abrangência dos filtros ou a rotina das fontes. Nenhum número transcrito desses anexos deve alimentar as medidas ativas. A implementação de produção continua baseada em views homologadas de SQL Server/IBM Db2 via gateway e em APIs ou staging de fontes externas com atualização auditável.

## 1. Evidências examinadas

| Referência | Arquivo | Conteúdo observado | Limite da evidência |
| --- | --- | --- | --- |
| P1, página física 1 | `Microsoft Power BI.PDF` | Arrecadação, metas, comparações mensal/acumulada, protestos, empresas e profissionais; referências a INET e SISCONT | O PDF tem uma página física; “1 de 2” é o navegador do relatório, não uma segunda página recebida |
| P2, página física 1 | `Microsoft Power BI(1).PDF` | Cadastro profissional, pagamento, sexo, faixas etárias, tipo de registro, grupo/câmara, território, ART e CAT | Não contém a definição das medidas nem vínculo nominal de emprego |
| I1 | `79968.jpg` | Protocolos de atendimento: estados, prazo, tipo/subtipo, área/GRE, colaborador, mês e mediana de SLA | Datas de filtro, atualização e série não explicam por si o contexto de cada visual |
| I2 | `79969.jpg` | Acervo: protocolos de CAT/CAO, estados, prazos, unidade/GRE, mês | Protocolo de pedido não equivale a certidão emitida; CAT e CAO têm titulares diferentes |
| I3 | `79970.jpg` | Resumo municipal de profissionais, empresas, RT, ART e dados demográficos | Ano selecionado e cortes dos vários sistemas precisam ser homologados |
| I4 | `79971.jpg` | Arrecadação/meta/protestos, semelhante a P1 | Não é evidência de disponibilidade de caixa, custo de programa ou resultado de fiscalização |
| I5 | `79967.jpg` | Base empresarial/profissional, vistos, adimplência, modalidades, ART inicial e autores; unidades organizacionais; seleção de indicador altera a série mensal | Quantidades por modalidade podem incluir a mesma pessoa em mais de uma categoria |

Hashes SHA-256 preservam a identidade das evidências:

```text
P1 318aba487c1de51166c9c8e52af2275c73a7a72ef0ce59b3321f4122091e7293
P2 631727c9542ff530e04a668a8dda935cd8d20e4464fadbff1b4f69c5b03e150b
I1 db213b068c77600f9d2fae949566add470ccf6a97a4873dd97c229ac52ce27ac
I2 a59febb884596953b984581c5e464c4075d8aad76f3e7dfea530b042326eabce
I3 d6186576451a66632702b4c22b8f1b158f225744abe7c3fe1ae082deebbd46da
I4 6c2463a542e44958771b5ab55fece4d587e48f5cb9af12067ad271905dd1c9c1
I5 7547522e8805170422e2dd6d9075cead1a57701d45c4b9554b6ef0944d148060
```

## 2. Campos observados e grãos a preservar

“Observado” significa que o campo aparece em um visual ou filtro. Não significa acesso confirmado ao banco, disponibilidade de histórico ou chave validada.

| Domínio | Campos observados | Grão analítico correto | Complementos exigidos da view real |
| --- | --- | --- | --- |
| Protocolo de serviço — I1/I2 | Data de abertura, unidade, GRE, tipo/subtipo, status, status completo, colaborador, SLA, mês | Um protocolo; estados e atribuições como eventos datados | Chave estável; pessoa jurídica/física solicitante; abertura, conclusão e transições; calendário/prazo; pausas; resultado; regra de pagamento; autoria da atribuição |
| Cadastro profissional — P2/I3/I5 | Ativo/inativo; registro definitivo/provisório/temporário; visto definitivo/provisório; grupo/câmara; nível superior/médio-técnico; sexo; faixa etária; cidade/GRE | Pessoa, registro/visto e título são três grãos distintos | Identificador interno protegido; chaves de registro/título; vigências; status histórico; domicílio com vigência; escolaridade; nascimento apenas onde autorizado |
| Cadastro empresarial — I3/I4/I5 | Registros, ativos/inativos, novos, vistos ativos, município/GRE, adimplência | Empresa distinta, estabelecimento e registro/visto separados | Raiz/CNPJ completo; identificador de registro; matriz/filial; início/fim; motivo; município e regra territorial com vigência |
| Responsabilidade técnica — I3/I5 | RT ativo/inativo; profissionais no quadro técnico | Vínculo empresa–profissional com vigência; pessoas e empresas contadas distintamente | ID do vínculo, empresa/estabelecimento, profissional, modalidade/atribuição, início/fim, natureza do vínculo |
| ART — I3/I5/P2 | Quantidade total, inicial, obra/serviço, cargo/função, profissionais emissores, mês | Documento ART; autoria e empresa executora como relações explícitas | ID/número, tipo inicial/complementar/substituição, finalidade, situação e eventos, autor, contratante/executor, objeto técnico, local da obra, datas de registro e execução, valor declarado quando disponível |
| CAT/CAO — I2/P2 | Pedido de CAT/CAO, subtipo, estado, prazo; quantidade de CAT | Certidão e solicitação separadas; CAT da pessoa física, CAO da pessoa jurídica | Chave de certidão, titular, chave de protocolo, emissão/revogação, ponte com ART, atividade, datas e motivo de pendência |
| Financeiro — P1/I4 | Meta, recebido, anuidade/ART/dívidas/outros, categoria/tipo/subtipo, origem, lançamento, dia/mês/ano, protestos, pagamento | Obrigação, recebimento e protesto são fatos distintos; meta em sua granularidade aprovada | ID da obrigação/pagamento/protesto; titular PF/PJ; vencimento; data de recebimento/estorno; saldo no corte; parcelamento; natureza; conta/centro de custo; competência e regime contábil; meta versionada |
| Território e estrutura — P2/I3/I5 | Cidade, GRE, unidade, inspetoria/posto/escritório, população, área urbanizada, PIB, renda per capita, fomento/TCV | Município × competência da estatística; unidade com vigência própria | Código IBGE, edição/unidade/escala da estatística, papel territorial e histórico município–GRE, contrato/contabilização de fomento se incorporado |
| Carga das fontes — P1/P2/I1/I2/I4 | Última atualização e referências INET/SISCONT | Lote de origem e atualização do modelo são duas etapas | Último sucesso por origem, competência coberta, lote, completude, rejeições e regra; data da tela não substitui competência |

O arquivo [`available-fields-v8.json`](../src/domain/available-fields-v8.json) descreve os contratos propostos sem incluir números das evidências.

## 3. Reconciliações e ambiguidades que precisam de validação

Os exemplos abaixo são testes de leitura das evidências, **não diagnósticos de erro do CREA-SP**. Medidas com escopos ou filtros diferentes podem legitimamente divergir. Não transportar a fórmula presumida para o novo BI.

1. **I1/I2 — estados de protocolo.** Em I1, aberto + exigência + cancelado + sem pagamento + fechado corresponde ao total mostrado. I2 também reconcilia. Isso sugere categorias exclusivas naquele corte, mas é necessário saber se “sem pagamento” é estado de processo, condição financeira ou regra de classificação prioritária. O histórico pode conter vários estados por protocolo; somar todos os eventos duplicaria pedidos.
2. **P2 — registro, pessoa e visto.** Total 885.708 = 388.435 ativos + 497.277 inativos. As seis categorias de tipo de registro também somam 885.708. Essa reconciliação não prova que cada linha seja uma pessoa distinta. Visto deve ser separado do primeiro registro, inclusive para “novos profissionais”.
3. **P2 — pagamento e sexo.** Adimplentes 260.440 + inadimplentes 127.995 = ativos 388.435. Os valores de sexo exibidos abaixo desses blocos somam outro universo: 529.046 + 109.483 = 638.529 e 211.291 + 35.888 = 247.179; os dois grupos somam 885.708. A view/fórmula deve declarar se o status ativo afeta todas as medidas. Não inferir composição demográfica da base ativa a partir dessas posições na tela.
4. **I3 — empresas e RT.** Adimplentes + inadimplentes empresariais exibidos excedem o total de empresas ativas. RT ativo/inativo tem grão de vínculo ou profissional a esclarecer. Não gerar taxa de cobertura RT dividindo qualquer um desses números pelo total empresarial sem identificar as entidades.
5. **I3 — tipos de ART.** Obra/serviço + cargo/função fica 4.454 abaixo do total exibido. Pode haver outros tipos, estado, corte ou filtro. Criar dimensão completa com categoria desconhecida explícita; não ajustar a base para forçar a soma dessas duas categorias.
6. **I5 — modalidades.** As modalidades não formam necessariamente uma partição da população profissional. Pessoa com mais de um título/modalidade pode aparecer várias vezes. A soma das barras não é “total de engenheiros”; percentuais relativos ao maior grupo não são participação no total. Câmara, grupo, modalidade e título não são dimensões intercambiáveis.
7. **P1/I4 — percentuais totais.** O Total exibido de −173,46% no comparativo mensal é compatível aritmeticamente com a soma dos percentuais das quatro categorias. Sob os mesmos valores mostrados, a razão dos totais seria aproximadamente −39,13%. No acumulado, a razão dos totais mostrados seria aproximadamente −9,85%, em vez da soma −83,68%. Confirmar o contexto DAX; no novo BI, recalcular taxa no total, nunca somar percentuais.
8. **P1/I4 — inadimplência PF/PJ.** O percentual 29,38% é repetido para ambos os blocos. Pelas contagens de ativos e inadimplentes ali mostradas, as razões seriam aproximadamente 44,16% PJ e 36,36% PF. Pode haver outro universo financeiro elegível. Exigir denominador explícito, mantendo PF/PJ separados; não assumir erro nem reproduzir 29,38%.
9. **P1 — meta anual, acumulada e futura.** Meta anual e soma de metas mensais observadas não têm o mesmo valor; meses futuros aparecem zerados. Confirmar versionamento e recorte. Mês parcial só deve ser comparado ao mesmo intervalo do ano anterior, com corte e calendário visíveis. Zero futuro não é observação financeira.
10. **P1/I4 — protestos e recebimentos.** Protesto em estoque, arrecadação do período e saldo exigível não são o mesmo fato. A data em que um valor foi protestado não equivale à data de recebimento. Parcelamento não prova pagamento; nova inscrição de protesto não é receita.
11. **P2 — idade, arquitetura e ausência.** Faixas até 125 anos, “Cidade Indefinida”, grupo/câmara em branco e registros de Arquitetura indicam necessidade de regras de histórico/cobertura e de qualidade. Não eliminar silenciosamente registros históricos nem interpretar idade extrema como pessoa real sem verificar datas e método de agrupamento. “CAT = 0” pode representar falta de relação ou cobertura, não ausência real de certidões.
12. **Datas da tela.** P1 mostra referências a cargas INET/SISCONT e atualização do dashboard diferentes entre si. Uma tela atualizada não comprova que suas origens estejam atualizadas. O BI precisa mostrar competência e última carga válida por fonte, especialmente nos cruzamentos.

## 4. Perguntas que justificam a visão executiva

Os anexos oferecem bastante informação de operação. O executivo deve selecionar a informação que modifica uma decisão, em vez de replicar todos os cards. As prioridades abaixo pressupõem fórmulas e views reais homologadas; nenhuma série sintética pode ser apresentada como fato do CREA-SP.

| Pergunta e decisão | Indicadores úteis e denominador | Relação legítima entre dados | Limite e encaminhamento analítico |
| --- | --- | --- | --- |
| A base profissional está acompanhando a atividade técnica observada em SP? Presidência e planejamento definem prioridades territoriais/temáticas | Profissionais ativos distintos no corte; autores distintos de ART no período; participação observada = autores ativos / profissionais ativos, com interseção explícita; ARTs iniciais separadas das complementares/substituições | Autoria da ART por chave declarada; município do profissional separado do local da obra | ART/RT não equivalem a emprego e não capturam toda a atividade profissional; investigar modalidade, região, tempo desde o registro e cobertura da fonte |
| A expansão cadastral empresarial acompanha o mercado e a continuidade técnica? Presidência/SUPTEC/SUPCOR selecionam segmentos para diagnóstico | Empresas distintas ativas; novos + reativações − baixas/cancelamentos; empresas ativas sem RT identificado / empresas ativas elegíveis com cobertura de vínculos | Registro/evento → empresa/estabelecimento; vínculo RT vigente no mesmo corte; série de emprego externa agregada em competência comparável | Ausência de RT identificado é uma pendência de análise de base; não comprova infração. Crescimento econômico agregado não identifica quais empresas contrataram |
| Quais segmentos/territórios justificam fiscalização digital? SUPFIS seleciona conjuntos com evidência revisável | CNPJs externos no universo selecionado; correspondência exata CREA; sem correspondência; fornecedores PNCP com objetos potencialmente técnicos; vínculos/coberturas com denominador homologado | CNPJ completo antes de raiz; CNAE principal/secundário com classificação; vigência cadastral no momento do fato; evidência PNCP versionada | CNAE ou classificação de objeto não cria obrigação automática. Detalhar a evidência; encaminhamentos ficam no sistema de origem |
| O risco financeiro é mudança real do universo ou apenas calendário/classificação? Presidência/SUPADF planejam receita e recuperação | Recebido líquido de estornos no período; meta do mesmo corte; saldo vencido exigível; titulares elegíveis inadimplentes / titulares com obrigação elegível; recuperação por coorte de obrigação | Obrigação → recebimento → titular PF/PJ; cortes/estágios contábeis coerentes; protesto como relação de cobrança | Não usar receita de multas ou número de autos como meta de êxito. Não dividir dívida empresarial por profissionais nem confundir arrecadação com benefício social |
| A produção de acervo está disponível e coerente com a produção técnica? SUPCOL e áreas responsáveis identificam barreiras documentais | CAOs emitidas por empresa; CATs por profissional; ARTs relacionadas; cobertura de vinculação; idade de pedidos maduros apenas como informação de serviço | Documento emitido → titular → ART; pedido separado da emissão e categoria | A demanda de acervo não representa todo o mercado. Protocolo fechado não é certidão emitida. SLA não vira avaliação de fiscalização |
| A informação é suficientemente completa para decidir? SUPTEC e donos dos dados priorizam integração | Competência, sucesso da carga, cobertura de CNPJ/autoria/vigência/território; registros com chave válida / universo recebido | Controle de lote de todas as fontes utilizadas por cada medida | Sem cobertura não interpretar ausência como zero, sem cadastro ou ausência de ART. Drillthrough de qualidade explica o motivo e a origem |

Distribuição de sexo, idade, tipo de unidade ou ranking de colaboradores só ganha espaço central quando responde a uma pergunta concreta de acesso, cobertura ou qualidade. Contagem de unidades organizacionais não mede alcance efetivo. Programas/palestras/coworkings não devem dominar o executivo sem bancos de participantes, uso, custo e objetivo comprovadamente disponíveis e homologados.

## 5. Fiscalização digital: relações que fazem sentido

O objetivo é localizar **evidências que justificam verificação técnica**, sem pontuar o desempenho dos fiscais e sem realizar tratativas dentro do relatório.

| Cruzamento | Chave/papel correto | Sinal para análise | O que não se pode concluir |
| --- | --- | --- | --- |
| CNPJ/RFB × CREA-SP | CNPJ completo do estabelecimento, raiz e cadastro com vigência | Estabelecimento com atividade selecionada sem correspondência; cadastro divergente/encerrado; vínculo ausente na base disponível | CNAE por si não comprova atividade efetiva ou obrigação; raiz correspondente não substitui registro válido do estabelecimento |
| PNCP × CNPJ/CREA/RT | Fornecedor CNPJ identificado; contrato/objeto/valor e datas; órgão, domicílio do fornecedor e local da execução separados | Fornecedor de objeto potencialmente técnico sem correspondência; vínculo não identificado no período compatível; objeto que requer revisão | Órgão contratante em SP não prova obra em SP; profissional com RT não prova autoria da ART; objeto classificado não determina obrigação |
| PNCP × ART | Contrato/obra/CNPJ/endereço/período somente quando presentes e validados | Ausência de correspondência sob cobertura suficiente; associação aproximada explicável para revisão | Não é possível exigir uma ART para todo contrato ou inferir omissão pela falta de chave direta; registro tardio/cobertura parcial precisam ser tratados |
| RAIS/Novo CAGED agregado × CNAE × município | Competência × código CNAE × IBGE × CBO, segundo a granularidade efetivamente disponibilizada | Setores/territórios com crescimento do emprego técnico e pequena movimentação cadastral; contexto para priorizar estudos | O agregado não informa qual CNPJ emprega engenheiros, quem é trabalhador, se há RT ou se alguém está empregado irregularmente. Cruzamento individual exige acesso autorizado e contrato próprio |
| QSA × profissionais | Identificador interno autorizado/confirmado; nome aproximado só como candidato | Relação societária confirmada para contexto de rede empresarial | Sócio não é responsável técnico; CPF público mascarado/nome não confirma identidade nem favorecimento |

Um registro de evidência deve guardar `EvidenceId`, fornecedor/estabelecimento, fonte/lote, competência, chave de correspondência, método, regra versionada, força da evidência e limitações. A página analítica mostra os conjuntos e seus documentos, preserva filtros e permite ficha/drillthrough. Não inclui botões de autuar, atribuir tarefas, concluir casos ou alterar processos.

## 6. Extensões do modelo que os anexos justificam

O modelo demonstrativo atual possui empresa/estabelecimento/registro/visto, RT, ART, CAO, obrigações empresariais, contratos e emprego agregado. O anexo **não valida** campos ainda ausentes. Extensões devem começar pelo contrato da view; geração fictícia é uma demonstração separada e claramente identificada.

1. `DimProfissional` e `FatoRegistroProfissional`: pessoa distinta separada de registros/vistos, situação com vigência, tipos de registro e origem regional. Títulos/modalidades/câmaras em ponte multivalorada; não forçar uma modalidade exclusiva da pessoa.
2. `FatoART` e `PonteAutoriaART`: tipo documental, finalidade obra/serviço versus cargo/função, situação/evento, vínculo entre ART inicial e substituição/complemento, autoria explícita, contratante/executor/local da obra. RT vigente não deve ser utilizado para inferir autoria real.
3. `FatoCAT` e `PonteCATART`: titular profissional e documento emitido. Manter `FatoCAO` com titular empresarial e sua ponte própria. Pedido em `FatoProtocolo` não substitui o documento.
4. `FatoObrigacaoPF/PJ`, `FatoRecebimento`, `FatoProtesto` e `FatoMeta`: segregação de fatos/titulares, regras de estorno, saldos datados, regime contábil e metas versionadas. Não atribuir obrigações PJ a RTs/sócios nem inventar financeiramente a PF porque ela aparece no print.
5. `FatoProtocolo` e `FatoEventoProtocolo`: estados completos com datas, pausas/calendários e prazos por serviço. Fluxos operacionais permanecem nos sistemas administrativos. Rankings nominais de colaboradores não entram em publicação pública.
6. `FatoEvidenciaDigital`: relação determinística ou sugestão de correspondência, objeto classificado, compatibilidade temporal e motivo de revisão. Sem inferir trabalhador/CNPJ a partir de emprego agregado.
7. `FatoCargaFonte` e `DimRegra`: competência, sucesso e versão de cada lote/relação/medida. Fixar o papel territorial de cada dimensão e a vigência GRE; atualização da página não serve como timestamp de todas as origens.

## 7. Transparência: decisão separada

A planilha de indicadores do Confea é analisada no catálogo normativo V8. Requisitos de prestação de contas, remessa ao Confea e transparência pública não são automaticamente o mesmo conjunto. A página proposta de transparência deve mostrar apenas medidas agregadas cuja origem, fórmula, competência, validade legal e proteção de dados tenham sido homologadas. A presença de um indicador numa planilha não autoriza divulgação de CPF, dados financeiros nominais, processos, ranking de colaboradores ou sinais individuais de fiscalização digital.

Os anexos servem para definir um BI melhor; não constituem integração de produção nem justificam publicação irrestrita. A futura publicação deve ser um relatório/modelo com permissões e grãos próprios, separado da análise interna sensível.
