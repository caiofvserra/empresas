# Modelo empresarial — CREA-SP / V10

O modelo ativo foi reconstruído em `src/enterprise-v10/`. Seu centro é a **empresa e seus estabelecimentos**. Profissional aparece somente em relação técnica/documental empresarial; emprego permanece contexto agregado. Os catálogos e componentes V4–V9 são histórico de decisões e não definem as páginas ativas.

O cenário continua fictício, relacional e reproduzível, derivado de `src/domain/dataset.ts`. `src/enterprise-v10/data.ts` acrescenta evidências demonstrativas explícitas: observações externas datadas e pontes contrato–ART. Nenhum desses fatos representa captura de uma API ou uma integração institucional real.

## Entidades e grãos

| Entidade/fato | Uma linha significa | Relações e cautelas |
| --- | --- | --- |
| Empresa | Uma pessoa jurídica identificada por raiz de CNPJ | Pode ter vários estabelecimentos, registros, vínculos e documentos; raiz não substitui identificação exata da filial |
| Estabelecimento | Um CNPJ completo, matriz ou filial | Município, GRE, principal/secundários, abertura e situação RFB; normalizar como string |
| CNAE e ponte estabelecimento–CNAE | Uma atividade principal ou secundária relacionada ao estabelecimento | Preservar classificação e versão; grupos setoriais podem se sobrepor |
| Município / GRE | Um território e uma associação regional com vigência | Código IBGE é chave, não nome livre. A associação demonstrativa às GREs não é um mapa oficial homologado |
| Registro/visto e movimentação | Um registro e cada evento que abre/encerra sua vigência | Vários registros podem coexistir na empresa; contar registro não equivale a contar empresa |
| Profissional e vínculo RT | Uma pessoa identificada e cada relação técnica datada com empresa | Modalidade, início/fim e abrangência; vários vínculos não multiplicam o número de dias cobertos |
| ART e ponte empresarial | Um documento e sua vinculação expressa à empresa | Contagem documental não é número de obras concluídas, emprego, faturamento ou receita CREA |
| CAO e ARTs relacionadas | Uma certidão de acervo da pessoa jurídica e as referências documentais | CAO não é CAT profissional; não confundir protocolo/solicitação com emissão |
| Contrato público | Um contrato publicado, fornecedor e versão de valores/datas | Na demonstração o fato-base é simplificado. Produção exige contrato, termos, alterações, vigência e papéis geográficos próprios |
| Ponte contrato–ART | Uma referência documental identificada entre contrato e ART | Possui ID, empresa, data de registro e origem. Sem ponte disponível não se conclui ausência de ART |
| Observação externa histórica | Um estabelecimento observado em determinada competência, com evidência cadastral daquele corte | É baseline datada, não inferência feita apenas do cadastro RFB atual |
| Obrigação financeira / pagamento PJ | Um recebível e seus pagamentos | A ficção usa uma obrigação com valor e uma data de pagamento; produção deve separar múltiplos pagamentos, ajustes, parcelamentos e baixas |
| Emprego formal agregado | Município × CNAE × CBO × competência | Estoque e fluxos próprios; não há chave de empresa ou trabalhador no fato agregado |
| Controle da fonte | Uma execução/lote/competência e seu estado | Atualização do dado, processamento e refresh semântico são eventos diferentes |

## Regras de identidade e filtros

`selectEnterpriseScope` combina **OR dentro da dimensão e AND entre dimensões**. CNAE principal e secundário participam. Pesquisa por nome/CNPJ é um filtro de empresas; preserva letras e zeros e reúne seus estabelecimentos que satisfaçam os demais filtros. Seleção de subconjunto identifica raízes explícitas, mantendo os filtros globais.

`normalizeEnterpriseCnpj` remove pontuação/espaços e converte letras para maiúsculas, sem apagar caracteres alfabéticos. `isValidEnterpriseCnpj` verifica o formato numérico/alfanumérico e os dígitos pelo valor ASCII menos 48; os dois últimos caracteres são dígitos. A validade formal não certifica existência ou situação na Receita.

A conciliação exata usa o **CNPJ completo do estabelecimento efetivamente registrado**, consultado no índice de referência do dataset, antes da apresentação filtrada. Correspondência apenas por raiz é candidata para revisão. Um filtro de CNAE/município não pode fabricar uma ausência porque removeu um cadastro existente da busca.

Há duas consequências importantes dos filtros:

- ARTs, vínculos e finanças possuem chave empresarial na ficção. Uma filial selecionada pode trazer a empresa e seus fatos PJ; isso não representa recebimento, ART ou RT atribuídos exclusivamente àquela filial/local de execução. Em produção, a fonte deve declarar se o fato pertence à raiz, registro ou estabelecimento.
- Contratos possuem também estabelecimento no cenário e respeitam esse recorte. Emprego é filtrado por suas dimensões territoriais/atividade/tempo, sem ser reduzido artificialmente por uma lista nominal de CNPJs ou porte empresarial.

## Tempo, vigência e coortes

O corte é `dataset.snapshotDate`; a janela selecionada pode ter 3, 6, 12 ou 24 meses. O início é o primeiro dia do mês inicial e o baseline é o dia anterior. A competência demonstrativa não é a data de atualização de SQL Server, Db2 ou RFB.

Registros e RTs são intervalos **[início, fim)**: início inclusivo, fim exclusivo. Movimentações de novo registro/reativação e baixa/cancelamento determinam os intervalos. Intervalos sobrepostos ou contíguos da mesma empresa são unidos antes de contar vigência. Uma entrada é transição de não vigente para vigente; a inclusão de uma segunda filial enquanto a empresa continua vigente não cria uma nova entrada empresarial.

A continuidade RT intersecta a união dos intervalos empresariais com a união de seus vínculos. Usa **dias-empresa cobertos / dias-empresa registrados**, sem duplicar dias por vários RTs. Na ficção o histórico é qualificado; uma implantação real precisa informar o início da cobertura histórica confiável, evitando tratar ausência de dados como lacuna de RT.

A retenção compara a coorte vigente na abertura e condiciona seu denominador à fotografia RFB ativa disponível no corte final. **Não é uma reconstrução da situação econômica passada** nem prova de exercício atual de atividade técnica. Para outra definição longitudinal fiscal, a origem precisa fornecer snapshots/SCD e eventos próprios.

A participação ART considera empresas com algum dia de registro vigente na janela, inclusive as que saíram antes do corte. A partição RT × ART das empresas vigentes no final é um aprofundamento diferente. Não somar distintos mensais para obter distintos de toda a janela.

## Baseline externo e rastreabilidade contrato–ART

`buildEnterpriseEvidence` gera fatos fictícios estáveis para a demonstração:

- `ExternalObservation`: CNPJ completo, empresa, estabelecimento, data observada, situação RFB e estado de correspondência naquele baseline. O modelo seleciona as observações do corte anterior à janela e verifica primeiros registros posteriores. A medida conta estabelecimentos observados; a lista de investigação deduplica suas empresas-raiz.
- `ContractArtEvidence`: contrato, ART, empresa, data de registro da referência e origem. O modelo exige referências existentes, mesma empresa e evidência conhecida até o corte. Uma ART qualquer da mesma empresa não satisfaz a medida sem uma linha explícita da ponte.

Essas linhas são **documentos sintéticos da ficção**. O gerador seleciona relações coerentes do cenário; em produção ele não serve como regra para criar prova documental por coincidência de CNPJ, proximidade de datas ou termos. As tabelas devem ser produzidas upstream por fonte/homologação de negócio, mantendo origem e versão.

Ingresso posterior à observação externa é uma **transição observada**, não resultado causal da Presidência, fiscalização, campanha ou parceria. Para avaliar uma iniciativa concreta, obter também público-alvo, evento institucional, critérios de inclusão e marcos temporais. Coortes precisam de maturação; não selecionar somente os casos concluídos.

## Cobertura territorial e setorial

A cobertura externa deduplica CNPJ completo válido, RFB ativa no corte, abertura até o corte e presença de algum CNAE classificado como relacionado ou dependente de análise. Numerador: registro exato vigente. Separar “nunca identificado” de “identificado sem vigência”. Nenhuma categoria conclui obrigação de registro ou infração.

Para estabelecimentos, município/GRE são a localização daquele CNPJ. Para a distribuição **aditiva de empresas-raiz** por GRE, o cenário escolhe a matriz visível ou, se não estiver no recorte, o primeiro estabelecimento visível por ID. A regra é demonstrativa e deve ser declarada; não representa toda a distribuição física da empresa.

Um CNPJ pode ter vários CNAEs selecionados. Portanto, grupos por CNAE principal/secundários são **não aditivos**: uma empresa, estabelecimento ou valor contratual pode aparecer em mais de uma atividade. O total geral é recalculado a partir de chaves distintas, não obtido somando as barras dos setores.

Localidade de órgão comprador, sede de fornecedor e local de execução são papéis distintos. A demonstração localiza o fornecedor pelo estabelecimento. Em produção, um órgão em SP não basta para afirmar que a obra ocorreu em SP; esse papel exige campo/evidência própria.

## Emprego e comparabilidade

O indicador econômico compara o estoque do primeiro e do último mês disponíveis na janela, com base inicial positiva e dois meses distintos. Admissões/desligamentos são fluxos; estoques mensais não são somados.

Uma seleção de empresas, pesquisa, porte ou situação que reduz apenas o cadastro bloqueia a taxa comparativa. Os fatos agregados continuam contextuais e não são atribuídos à coorte nominal. Crescimento empresarial regional e crescimento de emprego usam seus próprios estoques, com cortes mensais compatíveis; correlação não demonstra que o CREA criou empregos.

## Financeiro PJ em centavos

O modelo converte valores para **centavos inteiros antes da soma**. Recebimentos são fluxos por data de pagamento. Saldo vencido é estoque líquido de pagamentos identificados no corte; não somar os saldos de vários meses.

Adimplência usa empresas com obrigações já exigíveis observadas. Uma empresa sem obrigação observada não é declarada adimplente por falta de informação. Recuperação usa a **mesma coorte de obrigações vencidas e abertas no baseline**, limita pagamentos ao saldo inicial elegível e mantém o residual. Recuperação é parte dos recebimentos, não receita adicional.

Pagamentos sem data tornam a reconstrução histórica ambígua. Na produção, qualidade e cobertura de pagamentos devem ser controladas antes de habilitar a medida; não substituir ausência de data por pagamento zero. Renegociação, desconto, cancelamento e ajuste sem caixa exigem fatos e regras próprios.

## Contratos, fornecedores e evidências

Contratos da janela são deduplicados pela chave; objetos com indício técnico são classificados por dicionário demonstrativo explicável, sem modelo treinado ou confiança calibrada. A demanda pública é **valor nominal publicado de contratos únicos**; não é execução física, pagamento, receita do fornecedor ou do CREA.

Cobertura de fornecedores usa CNPJs completos e verifica o registro na data da publicação mais recente de cada fornecedor técnico na janela. Publicação não é data de execução. A vigência contratual real é um contrato de origem a acrescentar, não inferência desse retrato.

Os indícios convergentes combinam CNAE elegível, ausência de registro exato vigente no corte e contrato técnico no período. São critérios booleanos verificáveis, sem pontuação arbitrária ou declaração de irregularidade. A empresa pode possuir vários contratos e estabelecimentos; a contagem de empresas é distinta.

## Catálogo e rastreabilidade

`catalog.ts` define **17 indicadores**, cada qual com nome em frase, conceito, fórmula, unidade, decisão, exemplo didático, fontes e limites. `model.ts` produz números, numeradores, denominadores, chaves de empresas e fatos, recortes e avisos. Exemplos do catálogo não são números calculados do cenário.

Os gráficos usam o mesmo `EnterpriseModel` dos KPIs e exportações. Um indicador de estabelecimento, contrato, documento ou dias pode levar à **lista de empresas relacionadas**; seu total não precisa ser igual ao número de raízes dessa lista. A interface identifica essa unidade e conserva os denominadores na definição.

`export.ts` gera uma linha por empresa-raiz, com campos do recorte, início/fim da janela e permissões explícitas. Restringe colunas financeiras e exportação conforme o perfil demonstrativo; protege células CSV contra fórmulas. A segurança institucional real deve ser aplicada na origem/modelo/serviço, não apenas na interface.

## Proposta para o modelo semântico

Usar dimensões conformadas de empresa, estabelecimento, tempo, CNAE, município/GRE e modalidade, com pontes identificadas para atividades e documentos. Cada fato conserva seu grão. Snapshots de estabelecimento/registro e fatos de dias-empresa podem ser materializados upstream para desempenho e reprodutibilidade. Emprego permanece em uma estrela agregada ligada apenas às dimensões compatíveis.

Conexões, fontes e homologação: [FONTES_EMPRESARIAIS_V10.md](FONTES_EMPRESARIAIS_V10.md). Medidas e recursos Power BI: [POWER_BI_V10.md](POWER_BI_V10.md). A análise crítica explica por que estes indicadores foram selecionados em [CRITICA_E_INDICADORES_EMPRESARIAIS_V10.md](CRITICA_E_INDICADORES_EMPRESARIAIS_V10.md).
