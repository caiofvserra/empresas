# Revisão de arquitetura — CREA-SP, dados internos e fontes externas

Planejamento de 29/10/2026. Não é implementação nem certificação de acesso. Base: leitura do modelo atual V18, serviços e organograma anexados, evidências de consultas das frentes de pesquisa. O catálogo final de fontes deve registrar o nível de verificação de cada acesso; esta revisão define como relacioná-las sem produzir conclusões artificiais.

## Decisão central

A próxima plataforma deve ter um núcleo empresarial e territorial temporal, e fatos independentes por domínio. Não se deve formar uma tabela única que junte CNPJ, sócio, empregado, aluno, ART, contrato e município: isso multiplica valores e cria vínculos não observados. O modelo semântico Power BI continua em estrelas e pontes controladas; o grafo serve para exploração de relações documentadas e sugestões separadas.

A pergunta estratégica é: **que atividade técnica ocorre em São Paulo, por quais empresas, com que vínculos técnicos e presença no cadastro do CREA-SP, e onde falta informação para verificar essa presença?** O domicílio do fornecedor é somente uma das geografias dessa análise.

## Escopo São Paulo: três universos distintos

| Universo | Inclusão correta | Exemplos e limite |
|---|---|---|
| Desenvolvimento empresarial paulista | Estabelecimento da Receita localizado em SP, com vigência/snapshot e CNAE selecionados | Empresa com sede em Campinas e filial no Paraná continua sendo uma raiz, mas seus estabelecimentos pertencem a territórios diferentes. |
| Atividade técnica executada em SP | Local de obra/serviço, instalação ou empreendimento em SP, mesmo com fornecedor domiciliado fora do estado | Fornecedor de MG executa manutenção elétrica em Santos; é relevante ao CREA-SP, conforme requisitos aplicáveis, sem ser “empresa paulista”. |
| Atividade de empresas paulistas fora de SP | Fornecedor com estabelecimento em SP e local de execução em outra UF | Empresa de São Paulo contratada para ponte no Acre; informa expansão do mercado paulista, mas não é automaticamente atividade de fiscalização territorial do CREA-SP. |

“Órgão contratante localizado em SP”, “unidade de compra em SP”, “fornecedor em SP” e “obra em SP” não são filtros intercambiáveis. Registrar separadamente `municipio_orgao`, `municipio_unidade_compra`, `municipio_fornecedor`, `municipio_execucao`, `municipio_estabelecimento_crea` e `municipio_registro_profissional`. Se a API só informar o primeiro, o título deve dizer exatamente isso.

Criar dimensão/papel `geografia_disponivel` com valores: execução confirmada, instalação confirmada, órgão/unidade, fornecedor, indeterminada. A geografia não informada permanece nula; não preencher execução com domicílio para pintar o mapa. Contratos com execução em vários municípios usam ponte contrato–local e, sem valores por local, contagem distinta ou indicação multiterritorial, nunca divisão financeira igual inventada.

## Entidades canônicas e identidades

| Dimensão/entidade | Chave e histórico | Cuidados |
|---|---|---|
| Empresa | ID interno analítico e raiz CNPJ, mantendo identificadores de origem | Uma raiz, várias filiais, vários registros, sem somar a empresa em cada filial no total distinto. Não chamar estabelecimento de empresa. |
| Estabelecimento | CNPJ completo como string, vigência e versões do cadastro | Suportar CNPJ alfanumérico, zeros e dígitos verificadores; não converter para número ou remover letras. Cadastro antigo não é prova da situação passada. |
| Pessoa/profissional | ID protegido; registro regional/RNP; tabela de equivalências confirmadas | CPF integral apenas onde autorizado; CPF parcial e nome não permitem match definitivo. Um profissional pode ter títulos, vínculos e registros diversos. |
| Identidade de origem | Fonte, ID de origem, ID canônico, método, revisão e vigência | Não fundir entidades por igualdade de nome. Manter conflitos e versões do match. |
| Atividade econômica | CNAE por versão; classificação CREA com validade | CNAE principal e secundário em ponte estabelecimento–CNAE. Relação com profissão/modalidade é N:N, e não obrigação jurídica automática. |
| Formação | Código IES, curso, local de oferta, CINE e ano | Curso não é pessoa. EAD/curso-sede/polo precisam regra geográfica própria. |
| Ocupação | CBO por versão, grupos técnicos validados | Ocupação declarada não prova diploma, atribuição, registro ou salário devido. |
| Território | Código IBGE como string, malha e vigência, UF, município, regional CREA | Alterações de GRE e municípios devem ser preservadas; território atual não reescreve o histórico sem aviso. |
| Órgão/unidade | ID oficial e CNPJ de cada unidade | Órgão, unidade gestora, unidade compradora e contratante podem diferir. |
| Contratação/contrato/item | Identificador oficial por sistema, exercício/sequência, item e versão | Não unir PNCP e Compras.gov somente por objeto/valor; ponte determinística de referências oficiais. |
| Obra/instalação/empreendimento | ID setorial, órgão regulador e geometrias; CNO quando disponível por acordo | CNPJ operador, concessionária, proprietário, responsável tributário CNO e executora são papéis diferentes. |
| Processo judicial/perícia | Número CNJ, tribunal, evento/ato, especialidade observada | Processo com assunto de construção não comprova perícia nem necessidade de engenheiro. |
| Fonte/regra | Responsável, licença, rota, competência, atualização, regra vigente | IDs e documentação de origem precisam chegar ao detalhe de cada indicador. |

## Fatos propostos e seus grãos

| Fato | Uma linha representa | Datas e medidas |
|---|---|---|
| Vigência de registro empresarial | Um episódio de registro/visto em estabelecimento | Solicitação, concessão, início, interrupção/baixa, reativação. Saldo de estoque distinto reconstruído por eventos. |
| Movimentação cadastral | Um evento de cadastro | Data de ocorrência e registro no sistema; tipo; motivo e origem. |
| Snapshot da Receita | Uma versão de estabelecimento por competência de carga | Situação, CNAEs, endereço, porte, capital e natureza jurídica. Só inferir mudança entre snapshots efetivamente coletados. |
| QSA | Relação pessoa/entidade–empresa, qualificação, versão e fonte | Data de entrada quando disponível; término apenas se observado/fornecido; CPF parcial protegido e não usado como identidade única. |
| Vínculo técnico | Um episódio profissional–empresa, papel/escopo | Início/fim, modalidade, carga e atribuições quando disponíveis; profissionais distintos ≠ vínculos. |
| ART e eventos | Um documento ART e eventos datados separados | Registro, substituição/complementação, baixa, cancelamento, atividade e quantidades. Valor de contrato ≠ receita do CREA. |
| CAO/CAT e eventos | Uma solicitação/certidão, com tipo e titular corretos | Solicitação, exigência, emissão, cancelamento/revogação; CAO PJ e CAT profissional separadas. |
| Contratação pública | Um aviso/procedimento, item/resultado e contrato em fatos próprios | Publicação, assinatura, vigência, execução, aditivo, pagamento quando observado. Não somar valores das etapas como se fossem gastos diferentes. |
| Pagamento público | Um pagamento/liquidação/empenho com tipo separado | Datas fiscais, estorno, fornecedor/beneficiário e referências; valor contratado não vira pago. |
| Obra/instalação | Um empreendimento e seus eventos/snapshots | Licenciamento, início, marcos, paralisação, entrega, operador; contratos associados só por evidência. |
| Título e recebimento CREA | Um título e uma movimentação financeira em fatos separados | Vencimento, competência, pagamento parcial, estorno, inscrição, abatimento; saldo por corte, recuperação por coorte inicial. |
| Evidência/observação digital | Uma ocorrência de regra sobre entidade/atividade em data e fonte | Dados utilizados, regra/versão, resultado, validade, revisão, descarte; hipótese não é infração. |
| Fiscalização/processo | Um ato real e sua relação ao caso | Notificação, auto, defesa, julgamento, recurso, decisão, cancelamento; separar lavratura de multa exigível ou recebida. |
| Emprego agregado | Município × CNAE × CBO × competência e demais categorias divulgadas | RAIS estoque/remuneração anual; CAGED admissões/desligamentos/saldo mensal. Nenhum ID de empresa ou pessoa inventado. |
| Educação agregada | Curso/local/IES × CINE × ano × modalidade | Matrículas, ingressantes, concluintes e vagas; não somar matrículas anuais como pessoas distintas. |
| Indicador econômico | Território × série/classificação × competência | PIB/VAB/população/SINAPI etc., com deflator/base/período. Contexto, sem atribuição causal ao Conselho. |
| Perícia observada | Um cadastro, nomeação, pagamento ou ato de perícia, distinguindo o tipo | Especialidade, tribunal, localização, pessoa/empresa somente se identificada com acesso autorizado. |
| Legislativo | Uma proposição, tramitação ou texto/versão | Autoria, assunto, comissão, status, data; tags engenharia são classificação temática revisável. |

## Temporalidade obrigatória

Cada carga registra pelo menos: `competencia_origem`, `evento_em`, `vigencia_inicio/fim` quando existentes, `extraido_em`, `processado_em`, `fonte_id`, `versao_regra`, `qualidade` e `cobertura`.

Situação cadastral atual da Receita, registro ativo hoje ou QSA de um único mês não podem qualificar automaticamente contratos antigos. Para comparar contrato de março a cadastro de março, é preciso histórico com vigência ou snapshot daquele período. Na ausência, apresentar “situação no último snapshot disponível” e não “situação na assinatura”. Dados tardios e correções precisam reprocessar janela e preservar auditoria.

Separar estoque (empresas ativas no corte), fluxo (registros no período), evento documental (CAO emitida no período) e coorte (empresas observadas em janeiro e acompanhadas até dezembro). Revogação posterior não apaga emissão histórica; pagamento não apaga vencimento histórico. Cancelamento/estorno é evento, não exclusão silenciosa.

## Regras de relacionamento: o que pode e não pode atravessar o modelo

| Cruzamento | Relação permitida | Resultado correto | O que não concluir |
|---|---|---|---|
| Receita × CREA | CNPJ completo exato, com datas compatíveis; raiz como contexto separado | Registro vigente localizado, histórico localizado, sem correspondência no universo e data observados | “Irregular” apenas por CNAE ou ausência de match |
| PNCP/Compras/TCE × CREA | CNPJ fornecedor integral e data; referência oficial entre compras | Participação contratual e presença cadastral observada | Que empresa em outro estado tem obrigação em SP porque contratante fica em SP |
| Contrato × ART | Nº de contrato/processo/ART validado, CNPJ de partes, local e intervalo coerentes | Vínculo confirmado ou candidato de vínculo com evidência | Ausência de ART porque busca por nome/período não achou; qualquer ART da empresa prova cobertura do contrato |
| Obra/instalação × empresa | Papel explícito operador, executora, proprietário, concessionário | Rede de participação com papel e vigência | Que operador contratado realizou obra ou que autorização é ART |
| QSA × profissional | Identidade confirmada e qualificação societária; match nominal separado | Sociedade/administração identificada ou sugestão revisável | Que sócio é RT, empregado, diretor técnico ou responsável pela atividade |
| Vínculo interno RT × ART | Autor declarado da ART e vínculo com escopo/período | Produção técnica e participação profissional observadas | Que todo RT da empresa emitiu todas as ARTs dela |
| RAIS/CAGED abertos × empresas | Município/CNAE/CBO compatíveis, somente em agregação | Contexto de emprego setorial e crescimento territorial | Empresa individual emprega X engenheiros, paga Y ou viola piso |
| RAIS identificada/eSocial × profissional | Apenas em acordo autorizado, identificadores e período protegidos | Relação empregatícia observada e análise revisada | Disponibilidade pública ou dado identificável exportável sem controle |
| INEP × registros profissionais | Comparação agregada de fluxo por área/local/período, sem identidade | Oferta de formação e evolução do ingresso no CREA em paralelo | “Taxa de registro dos formados” individual ou evasão usando concluintes/ingressantes de mesmo ano |
| IES parceiras × CREA | Lista nominal autorizada, identidade e data de conclusão observadas | Coorte real de diplomados com registro posterior, defasagem e cobertura da parceria | Que cobertura amostral representa todas as IES de SP |
| Perícia × registro/ART | Nomeação/serviço identificado e identidade confirmada, conforme acesso | Demanda pericial observada por categoria e aderência documental revisável | Que assunto judicial de imóvel exige engenheiro ou que cadastro de perito significa nomeação |
| Projeto legislativo × engenharia | Texto/ementa classificada, assunto, órgão e tramitação | Agenda regulatória de interesse por setor | Efeito econômico realizado antes de aprovação/vigência |

## Grafo: relações devem carregar evidência

O armazenamento analítico principal não precisa de banco de grafos inicialmente. Produzir tabela de arestas reutilizável (`origem_tipo/id`, `destino_tipo/id`, `relacao`, `papel`, `vigencia`, `fonte`, `documento`, `metodo_match`, `status_revisao`, `observado_em`) é suficiente para planejar e validar relações. Se volume/consultas de caminhos exigirem, projetá-la para motor de grafo; Power BI recebe agregados e subgrafos limitados, não milhões de nós no cliente.

**Tipos de relações confirmáveis por documento:** estabelecimento pertence à raiz; registro refere estabelecimento; vínculo RT liga profissional–empresa; ART declara autor/contratada/contratante; contrato declara fornecedor; contrato referencia obra; CAO referencia ART; nomeação judicial identifica perito; instalação indica operador. São tipos propostos, não um grafo já construído. Somente registros com chave, evidência, papel e data validados recebem status confirmado; preservar sempre fonte, papel e tempo.

**Arestas candidatas:** nome normalizado parecido; endereço próximo; objeto contratual semelhante à descrição de ART; sócio com nome parecido a profissional; CNAE associado a atividade regulada. Tracejado/status distinto, fora de contagens de vínculos confirmados, com motivo para revisão. Escore de similaridade é propriedade técnica da busca, não probabilidade de irregularidade.

**Agregações contextuais:** município tem X empregos técnicos; curso tem Y concluintes; município tem PIB Z. Conectar ao nó município/atividade/período, nunca a pessoas/empresas individuais por conveniência visual.

**Duas trilhas recomendadas:**

1. Fonte → documento/registro → entidade → relação confirmada → indicador → conjunto investigável.
2. Fonte → observação incompleta → hipótese de cruzamento → revisão humana → vínculo confirmado/descartado.

A segunda trilha não deve contaminar silenciosamente a primeira. Não chamar empresa de “irregular” no grafo de descoberta.

## Priorização que entrega valor sem depender de acesso excepcional

### P0 — Fundamentos e primeiro conjunto confiável

1. Inventário interno SQL Server/Db2, dicionário real, chaves, datas e donos de registro, RT, ART, CAO e financeiro.
2. CNPJ oficial em carga mensal com snapshots, CNAEs Concla e tabela municipal IBGE; deduplicação e match exato por estabelecimento.
3. PNCP e fontes de compras com contratos/resultados/fornecedores, timestamps, valores e referências; estoque e fluxo separados.
4. Modelo territorial que inclua empresas de fora atuando em SP, sem usar município do comprador como execução.
5. Dicionário dos indicadores e catálogo de evidências com cobertura conhecida.

Resultado: mapa do universo empresarial, novas entradas e saídas, cobertura cadastral estimada por universo, empresas com atividade pública identificada e situação cadastral na data disponível, RT vigente e produção documental sem inferências de ausência.

### P1 — Contexto econômico e demanda técnica

6. CAGED e RAIS agregados, INEP, IBGE/SIDRA, Seade/indicadores estaduais que tenham rotina oficial; eixos independentes por competência.
7. Obras, transferências e cadastros setoriais com local confirmado, operador/beneficiário e papel; ANEEL, ANP, ANTT, ANM, ANA/ambiental conforme acessos confirmados.
8. TCE-SP e execução/fornecedores, quando contrato ou pagamento puder ser conciliado sem duplicar PNCP.
9. Reconciliação documental contrato–ART e CAO/atestado, inicialmente com alta precisão e revisão dos demais.

Resultado: identificar onde o mercado cresce, quais atividades demandam técnica, como a presença cadastral e vínculos acompanham a atividade e em quais documentos falta rastreabilidade.

### P2 — Parcerias que ampliam o observável

10. Emprego identificado autorizado (MTE/eSocial), sem prometer acesso, e regras de remuneração/jornada com validação jurídica.
11. IES parceiras para coorte de diplomados/formandos e cadastro de cursos/atribuições; população coberta explícita.
12. Tribunais para cadastro, nomeações, especialidades e pagamentos periciais, com acesso e governança específicos.
13. Órgãos estaduais/municipais para licenças, alvarás, inspeções, responsabilidade técnica e local de execução quando não aberto em API.
14. **CNO por compartilhamento autorizado/contratação**, conforme [documentação pública b-Cadastros/Serpro](https://bcadastros.serpro.gov.br/documentacao/cadastro_cno/): CNO, `niResponsavel` PF/PJ e `tipoResponsabilidade`, início da obra e da responsabilidade, `art`, `rrt`, `cib`, cadastro imobiliário, área/metragem. A documentação acessível não torna os dados uma API aberta. O campo `codigoMunicipio` usa código TOM, devendo passar por tabela de equivalência validada para IBGE. Planejar ponte CNO–ART/RRT–imóvel/alvará–empresa com papel explícito. Responsável tributário/dono da obra não equivale à executora ou ao profissional responsável técnico; registro de RRT deve respeitar domínio CAU, não virar ART CREA.

### P3 — Camada de acompanhamento institucional

15. Câmara/Senado para radar temático de proposições e mudanças normativas.
16. Indicadores Confea/TCU publicados apenas após definição oficial, validação, catálogo de dados e separação de dados internos; sem transformar esta obrigação em métrica de desempenho artificial.
17. Algoritmos de ligação e anomalia depois de histórico suficiente; revisão e avaliação de falso positivo por grupo/regra/fonte.

## Fluxos de análise recomendados para futura tela BI

- **Desenvolvimento empresarial:** empresas/estabelecimentos → dinâmica CNAE e territorial → emprego/formação como contexto separado → presença no CREA → composição RT/ART → detalhe documental.
- **Atividade técnica em SP:** obra/instalação/objeto de contrato → fornecedor local ou de fora → registro/visto na data disponível → RT/ART com relação confirmada → pendências de evidência para análise.
- **Mercado de trabalho e formação:** cursos/concluintes agregados → empregos CBO/CNAE e remuneração comparável → profissionais registrados/RT agregados → coortes nominais somente onde acordo existir.
- **Gestão do cadastro:** universo e qualidade → movimentação/tempo → vínculos e acervo → financeiro coerente com a mesma empresa → atividade econômica externa; cada salto preserva subconjunto e identifica grão.

## Contratos de ingestão e qualidade

Cada fonte deve ter: URL oficial e rota; licença/condições; autenticação e quota; endpoint efetivamente testado; paginação; limites; rotina e disponibilidade; cobertura geográfica/temporal; chave natural; coluna de atualização; exclusões; arquivo/hash bruto; repetição idempotente; janela de reprocessamento; alerta de schema; extração parcial marcada; custo; responsável e alternativa. “Catálogo com API” não significa que os recursos são API nem que o endpoint continua funcional. Arquivo ZIP/CSV oficial atualizado pode ser a melhor rotina automática.

Validar por camada: integridade/duplicidade; contagem e valor conciliados com fonte; cobertura de página/competência; percentuais de match exato, raiz, candidato e sem match; consistência temporal; campos geográficos disponíveis; dinheiro em centavos; e ausência de multiplicação por pontes N:N. Medida municipal/CNAE distinta pode ser não aditiva: total deve ser recalculado, não soma das linhas.

## Organização e governança alinhada ao organograma anexado

Planejamento sugerido, sem atribuir competências legais novas: UDE/Gabinete coordena o significado analítico; SUPTEC/EDAD opera engenharia de dados e modelo; SUPFIS valida interpretação das evidências técnicas; SUPADF valida títulos/recebimentos/competência; EAPA/GPP valida eventos de acervo; SUPCOR/atendimento valida experiência dos serviços e parcerias; jurídico/DPO verifica base de acesso e regras normativas; Auditoria revisa rastreabilidade e indicadores de prestação de contas. A responsabilidade final de cada indicador precisa ser acordada internamente.

SQL Server/Db2 via gateway devem entregar views e/ou camada de staging com serviço autorizado de leitura; gateway não substitui regras do modelo, qualidade ou segurança. Segregar área pública, analítica interna e identificável restrita. RLS por território e OLS para pessoal/financeiro devem existir no serviço/dataset, sem confiar em esconder cards no React.
