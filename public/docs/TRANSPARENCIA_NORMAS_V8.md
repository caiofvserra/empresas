# CREA-SP — transparência, Confea e obrigações verificadas

Revisão de fontes oficiais em **13 de outubro de 2026**. A página **Transparência** deste protótipo é uma **prévia privada**, destinada a preparar definições, fontes e agregados. Não foi autorizada a publicação pública dos dados internos nem alterada a audiência do projeto.

As normas e a planilha fornecida definem regras. **Não são fontes periódicas de valores do BI.** Os fatos ativos devem vir de SQL Server e DB2 via gateway ou API homologada. A pesquisa normativa não reintroduz números copiados de sites, notícias, PDFs ou células da planilha.

## O que foi confirmado

| Instrumento oficial | Conteúdo verificado | Alcance no projeto |
| --- | --- | --- |
| [IN-TCU nº 84/2020](https://pesquisa.apps.tcu.gov.br/redireciona/norma/NORMA-21437), arts. 8º–9º | Prestação de contas inclui objetivos, metas, indicadores, resultados, valor público, programas, transferências, execução financeira, licitações, remunerações, demonstrações contábeis, relato integrado e rol de responsáveis. | Base geral da transparência e prestação de contas. Um dashboard não substitui o relato integrado e seus documentos. O portal consultado indica **Vigente**. |
| [DN-TCU nº 198/2022](https://pesquisa.apps.tcu.gov.br/redireciona/norma/NORMA-21705), arts. 6º–7º | Informações estratégicas e de resultados atualizadas até 30 dias após o trimestre; informações de execução e outras categorias atualizadas em tempo real ou na ocorrência dos eventos. | Registrar competência, publicação e última atualização. Não prometer que refresh diário satisfaz todos os prazos de publicação. O portal indica **Vigente**. |
| [DN-TCU nº 216/2025](https://pesquisa.apps.tcu.gov.br/redireciona/norma/NORMA-36629), arts. 3º–7º | Regras específicas para conselhos profissionais; relatório federal agregado e regionalizado; prazos de publicação; quadros de informação em dados abertos; retenção mínima de cinco anos. | Fonte mais específica para este trabalho. Vigência observada desde **28/03/2025**; aplica-se ao exercício financeiro iniciado em **01/01/2025**. |
| [Portaria-SEGECEX nº 10/2025](https://pesquisa.apps.tcu.gov.br/redireciona/norma/NORMA-39548), arts. 2º–7º e anexos | Padroniza identificação, aspectos gerais e indenizações, formatos JSON/CSV e APIs. **Art. 7º: a API é requerida inicialmente apenas dos conselhos federais.** | Referência para arquitetura de integração. Não declarar que o CREA-SP já está diretamente obrigado aos três endpoints dessa portaria. Vigência observada desde **04/07/2025**; portal indica **Vigente**. |
| [PL-2260/2023 — Confea](https://normativos.confea.org.br/Ementas/Visualizar?id=77963), anexo, arts. 5º, 8º, 11 e 20 | Publicação de resultados e documentos, acompanhamento mensal e processo anual de prestação de contas do Sistema. | Distinguir envio ao Confea de publicação à sociedade. O texto consultado foi publicado no Boletim de Serviço Eletrônico em **21/12/2023**. |
| [PL-0926/2025 — Confea](https://normativos.confea.org.br/Ementas/Visualizar?id=81129), itens 1–3 | Complementa os dados do Sistema para atendimento da DN nº 216/2025; determina definir mecanismos de captura/sincronização e desenvolver BI; mantém envio de planilha enquanto captura API não estiver estabelecida. | Uma mesma camada semântica deve servir ao BI do CREA-SP e à consolidação federal. Publicação no Boletim de Serviço Eletrônico em **04/06/2025**. |
| [LAI, texto compilado](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm), art. 8º e art. 31 | Divulgação ativa e acesso automatizado em formatos abertos; proteção de informações pessoais relativas à intimidade, vida privada, honra e imagem. | Não publicar microdados internos indiscriminadamente. A transparência do gasto do conselho é diferente da dívida privada de seus inscritos. |
| [LAI, art. 8º-B](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm), incluído pela Lei nº 15.141/2025 | Conselhos devem divulgar, de forma nominal e individualizada, parcelas remuneratórias e indenizatórias dos empregados. | Obrigação específica de pagamentos públicos. Não autoriza, por extensão, divulgar CPF completo, dados bancários ou fichas privadas dos profissionais inscritos. |
| [Acórdão nº 96/2016-TCU-Plenário](https://pesquisa.apps.tcu.gov.br/doc/acordao-completo/96/2016/Plen%C3%A1rio), itens 9.1.1–9.1.2 | Conteúdos mínimos de transparência nos conselhos, incluindo programas, serviços, auditorias, transferências, remunerações, despesas, contratos e formatos abertos. | Contexto normativo confirmado no dispositivo integral, em [cópia oficial publicada pelo CREA-RS](https://www.crea-rs.org.br/transparencia/wp-content/uploads/2017/08/Ac%C3%B3rd%C3%A3o-96-2016-Plen%C3%A1rio-TCU_Avalia%C3%A7%C3%A3o-do-cumprimento-da-LAI.pdf), páginas 2–4. Não é uma determinação de publicar os 53 indicadores desta planilha. |

## Oito grupos de resultados da DN-TCU nº 216/2025

O **art. 3º dirige a obrigação de capítulo e tabela agregada ao conselho federal**. O parágrafo único exige informações agregadas e por conselho regional em tabela única. O CREA-SP fornece os dados regionais nos termos do encaminhamento determinado pela PL-0926/2025. Não se deve atribuir ao TCU uma fórmula individual que somente consta da planilha do Confea.

| Grupo do art. 3º | Informação solicitada | Unidade e cuidado de modelagem |
| --- | --- | --- |
| I | Profissionais e empresas com registro ativo | Contar pessoas/empresas segundo definição homologada, distinguindo registros e vistos; não somar modalidades sobrepostas. Definir se o dado é estoque na data de corte. |
| II | Fiscalizações realizadas, separando planos e denúncias | Contar ações de fiscalização e classificar sua origem. Uma empresa pode receber mais de uma ação. Não somar etapas do mesmo procedimento como ações novas. |
| III | Gasto efetivo da fiscalização e resultados | Separar orçamento aprovado, empenhado, liquidado e pago. Consolidar contas/rateios homologados, sem somar agentes fiscais com o total de empregados que já os inclui. |
| IV | Fiscalizados, distinguindo PF e PJ quando aplicável | Não substituir pessoas fiscalizadas por número de ações. Métricas 37-A/B/C da planilha podem contar ações, não indivíduos distintos. A equivalência necessita conciliação. |
| V | Autos de infração | Contar autos identificados; não tratar auto lavrado como sanção definitiva. Não derivar autos dos sinais de fiscalização digital. |
| VI | Denúncias ou notificações semelhantes recebidas | Separar recebimento, apuração e conclusão. Publicar agregados institucionais, sem nomes de denunciantes, denunciados ou conteúdo bruto. |
| VII | Processos instaurados e julgados, consolidando sanções | Manter processo, instância, decisão, recurso/trânsito e sanção em fatos próprios. Várias decisões não são automaticamente vários processos. |
| VIII | Indicadores, estatísticas e resultados de ações e projetos | Vincular objetivo, regra, responsável, fonte e resultado. A categoria ampla não confirma cada uma das 53 fórmulas como obrigação textual individual do TCU. |

Estes dados de prestação de contas ficam na página **Transparência**. A página **Fiscalização digital** tem outra pergunta: *quais subconjuntos merecem verificação documental a partir de CNAE, Receita, PNCP, vínculos/ARTs e contexto agregado de emprego?* Ela não é um painel de avaliação da produtividade dos agentes fiscais.

## Prazos que não podem ser confundidos

| Entrega | Destinatário ou publicação | Prazo verificado |
| --- | --- | --- |
| RG do CREA-SP | Sítio eletrônico oficial regional | **31 de março** do exercício seguinte — DN nº 216/2025, art. 4º, I. |
| RG consolidado federal | Sítio eletrônico oficial do Confea | **31 de maio** do exercício seguinte — art. 4º, II. |
| Processo anual de prestação de contas | Auditoria do Confea | **1º de abril** do exercício seguinte — PL-2260/2023, anexo, art. 20. |
| Envio mensal enquanto captura API não estiver estabelecida | Confea | **Dia 20 do mês seguinte**, conforme PL-0926/2025, item 3, que referencia o art. 11 da PL-2260/2023. |
| Metas e resultados estratégicos | Transparência durante o exercício | Até **30 dias após o trimestre**, além de mudanças relevantes — DN nº 198/2022, art. 6º, I. |
| Quadros de informação abertos | Sítios oficiais dos conselhos | Disponibilidade por **pelo menos cinco anos**, contados do encerramento do exercício — DN nº 216/2025, art. 6º. |
| Identificação e aspectos gerais da API padronizada | Inicialmente federais | Até **31 de março** do exercício seguinte — Portaria nº 10/2025, arts. 3º, § 1º, e 7º. |
| Indenizações da API padronizada | Inicialmente federais | Até o **último dia do mês seguinte ao pagamento** — arts. 3º, § 2º, e 7º. |

Prorrogações dependem dos procedimentos previstos em cada norma; não são presumidas pelo protótipo. A planilha anual do usuário também indica 1º de abril. Esse prazo de envio **não desloca automaticamente** o prazo público regional de 31 de março.

## O que a planilha comprova e o que não comprova

A planilha fornecida contém marcações de apresentação no relatório de gestão, de apresentação de resultados do Sistema e referências a demandas do TCU. O catálogo [confea-catalog-v8.json](../src/domain/confea-catalog-v8.json) preserva essas marcações, fórmulas, recortes temporais, unidades e dependências.

São três atributos distintos:

1. **Exigência no catálogo Confea:** a planilha marca o dado/indicador como obrigatório.
2. **Base normativa conferida:** a pesquisa encontrou o dispositivo e seu alcance, incluindo a distinção federal/regional.
3. **Publicação proposta:** o CREA-SP define o agregado, a documentação e o conjunto de dados apropriados ao destino público.

Nenhuma célula histórica preenchida virou número ativo da demonstração. Nenhuma marcação “DN-TCU” foi tratada, por si só, como autorização de exposição dos registros subjacentes. **Não foi confirmada uma determinação individual do TCU para cada um dos 53 indicadores.**

No **indicador 53**, a fórmula ajustada utiliza o orçamento aprovado destinado ao Subprograma Fiscalização (**CREA#183**) dividido pelo orçamento aprovado total do CREA (**CREA#182**), multiplicado por 100. É uma **participação orçamentária**. Não mede gasto efetivamente realizado nem demonstra, isoladamente, aumento real acima da inflação até 2027.

As fórmulas do catálogo que tenham conflito entre descrição e dependências da planilha devem continuar sinalizadas para homologação, sem escolher silenciosamente uma redação.

## Implementação prevista no Power BI e na integração

- **Modelo interno:** fatos completos de origem, gateway SQL Server/DB2, vistas somente de leitura, filtros de competência e perfis de acesso. A granularidade privada serve ao drillthrough e aos cruzamentos, sem operações de fiscalização no BI.
- **Página Transparência privada:** valores e séries regionais agregados, dicionário, competência, atualização e base normativa. Filtros de CNAE, empresa ou profissional não devem alterar indevidamente um orçamento institucional inteiro ou um total anual de prestação de contas.
- **Conjunto publicável separado:** somente tabelas e colunas homologadas. Ocultar abas, bloquear um botão ou aplicar RLS no modelo interno não equivale a retirar os dados privados de um artefato distribuído publicamente.
- **Publicação institucional posterior:** relatório público e arquivos/API nos destinos oficiais aprovados. Não ligar um gateway à internet nem colocar credenciais de banco no browser. A Portaria nº 10/2025 é referência técnica; sua exigência inicial de API é federal.

Os endpoints padronizados são `GET /transparencia/api/v1.0/identificacao`, `/aspectosgerais` e `/indenizacoes`, com JSON/CSV UTF-8. A portaria veda paginação e obstáculos de acesso aos conteúdos especificados; permite limitação de frequência justificada nos termos do art. 4º, § 7º. **Esse padrão não foi implantado ou anunciado como API oficial do CREA-SP neste protótipo.**

O gasto público próprio do conselho pode exigir beneficiário e objeto; o saldo de anuidade de um inscrito não tem a mesma finalidade jurídica. A eventual divulgação nominal obrigatória de remuneração/indenização deve seguir seu dispositivo específico e a política institucional de proteção dos demais campos. Esta página não disponibiliza CPF completo, dados bancários, lista privada de dívidas ou lista de suspeitos de infração.

## Evidência e limitações da revisão

As bases normativas em runtime ficam em [transparency-rules-v8.json](../src/domain/transparency-rules-v8.json): fontes, trechos, dispositivos, aplicabilidade, prazos, restrições e estado de implementação. Todos os números permanecem fora desse catálogo normativo.

Os textos integrais e a situação observada de IN nº 84/2020, DN nº 198/2022, DN nº 216/2025 e Portaria nº 10/2025 foram consultados no serviço público de pesquisa de normas do TCU. As decisões do Confea foram verificadas no portal normativo e nos PDFs oficiais integrais: [PL-2260/2023, 14 páginas](https://www.confea.org.br/midias/uploads-imce/Planejamento-Transpar%C3%AAncia/PL%202260%202023_Regulamento%20Presta%C3%A7%C3%A3o%20de%20Contas%20Sistema%20e%20Anexos%20I%2C%20II%2C%20III%20(0883110).pdf) e [PL-0926/2025, 5 páginas](https://www.confea.org.br/midias/uploads-imce/Documentos%20AUDI/PL%200926%202025_Atualiza%C3%A7%C3%A3o%20da%20Planilha%20Dados%20e%20Indicadores%20Final%C3%ADsticos%20.pdf).

A revisão verifica o fundamento para modelagem; **não declara conformidade institucional nem autoriza publicação**. Novos atos ou orientações do Confea/TCU devem gerar nova versão das regras. Vistas físicas, fórmulas, classificação contábil, cardinalidades, proteção de dados e atribuição institucional ainda exigem homologação pelos responsáveis do CREA-SP.
