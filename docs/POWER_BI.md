# Implementação no Microsoft Power BI — V9 / CREA-SP

O protótipo especifica **sete páginas fixas para PC**. As seis páginas de análise utilizam KPIs e seis painéis simultâneos; a sétima é a prévia privada de Transparência, com catálogo e base normativa. A visão executiva relaciona cadastro ativo, continuidade RT, autoria identificada de ART, produção, recebimentos PJ e contexto econômico. Fiscalização digital seleciona conjuntos de evidências por cruzamento de bases. Tabelas e fichas são drillthrough de leitura, sem tratativas.

O escopo é **CREA-SP / Estado de São Paulo**. O React é uma especificação funcional, não um `.pbix` nem uma conexão institucional. Os dados atuais são fictícios; snapshots de sites/PDFs não são fontes ativas. A transição exige fontes homologadas, ETL, modelo semântico, DAX, interações, segurança e validação no ambiente do CREA-SP.

## Arquitetura confirmada: SQL Server + Db2 + gateway

```text
SQL Server institucional ─ views analíticas ─┐
                                            ├─ gateway ─ modelo semântico Import ─ relatório
IBM Db2 institucional ─── views analíticas ──┘

API PNCP / ETLs oficiais ─ lote validado ─ staging SQL Server ou Db2 ─ views analíticas
```

Power Query usa **`Sql.Database` e `DB2.Database` diretamente**. Não se exige uma API intermediária para os bancos. Mapear servidor/database/schema/views de cada domínio, as chaves e os campos de alteração; o código não presume nomes reais de tabelas do CREA-SP. Para origens privadas, configurar **on-premises data gateway em modo padrão**, conexão/data source de cada banco, credencial de serviço somente de leitura e associação do modelo às conexões autorizadas.

A máquina/cluster do gateway precisa alcançar os dois bancos, confiar nos certificados e usar provider/driver compatível com a configuração escolhida do conector Db2. Confirmar requisitos na versão do Power BI/gateway empregada; não instalar drivers por suposição. Definir administrador, redundância, janelas de manutenção, política de credenciais e monitoramento. Não colocar login/senha em M, Git, JSON público ou browser.

Templates entregues em `integrations/power-query/SQL_SERVER_EMPRESA.pq`, `DB2_EMPRESA.pq`, `SQL_SERVER_MOVIMENTO_INCREMENTAL.pq`, `DB2_MOVIMENTO_INCREMENTAL.pq` e `integrations/sql/` são **contratos de referência sem credenciais**. Dimensão empresarial usa carga completa; movimentos usam data de evento imutável. Adaptá-los às views reais e validar tipos, privilégios, volume e folding. Nenhum template prova que o gateway esteja configurado ou que o refresh tenha sido executado.

## Ingestão e refresh são etapas diferentes

A rotina externa `scripts/refresh-sources.ts` consulta a API PNCP por páginas, publica lote validado fora de `public/` e mantém estado de ingestão. O exemplo é desabilitado; exige configuração privada e ativação. Executar com Node.js 24 e `NODE_USE_ENV_PROXY=1` quando houver proxy de saída. Orquestração, retenção e carga no staging são configuradas no ambiente institucional. O modelo Power BI deve ser atualizado **depois** da carga validada; não confundir sucesso HTTP da API com atualização de banco ou sucesso do refresh semântico.

Receita/CNPJ, RAIS, Novo CAGED e INEP exigem ETL dos conjuntos oficiais ou acesso autorizado para staging. Não se inventa API pública nominal de CNPJ, trabalhador ou diplomado. Formação anual pode ser automatizada por verificação de nova edição, download autorizado, validação e carga em banco; o relatório consome o banco, não números copiados de páginas. Fonte sem lote homologado permanece pendente na implantação, sem substituir ausência por zero. O template `PNCP_BATCH_FILE.pq` é uma alternativa técnica para inspecionar o lote por um caminho de rede acessível ao gateway; a arquitetura de produção adotada permanece API → staging SQL Server/Db2 → conector nativo. O arquivo não é fonte manual de resultados nem uma conexão institucional ativada.

Cada fonte registra competência, cobertura, última tentativa, último sucesso, lote/watermark, linhas e rejeições. Falha preserva último lote válido e expõe atraso. A data do build React não é data de atualização dos sistemas do CREA-SP. Procedimentos completos: [ATUALIZACAO_AUTOMATICA_V7.md](ATUALIZACAO_AUTOMATICA_V7.md).

## Import, agendamento e incremental

A proposta inicial é **Import com atualização agendada**, sobre views/tabelas analíticas. Frequência depende de disponibilidade e uso de cada fonte; “diário” é proposta, não rotina institucional comprovada. Alinhar a janela à conclusão das cargas e monitorar falha tanto do gateway quanto do modelo.

Para fatos volumosos com data adequada e query folding confirmado, usar `RangeStart`/`RangeEnd` (DateTime), limite inicial inclusivo e final exclusivo. Homologar janela de retenção, releitura de alterações tardias e detecção de mudanças. Testar que o filtro chegue ao banco e que as partições sejam corretas no serviço. Apenas aplicar filtro local em M não garante incremental eficiente.

Particionar preferencialmente pela data de evento/competência adequada ao fato, com política de revisão e coluna de alteração separada quando necessário. Usar data de alteração como partição sem política de remoção da versão anterior pode duplicar uma linha que mudou de partição. Dimensões pequenas e mutáveis podem receber refresh completo; dimensões históricas exigem SCD/vigência e snapshots consistentes. Views de exemplo não são uma política pronta para todas as tabelas.

Incremental não reconstrói eventos que a origem não conserva. Tombstones, cancelamentos, encerramentos e pagamentos tardios precisam de contrato. No Db2, confirmar capacidade de folding com provider/view/transformações reais; se não funcionar, corrigir extração upstream ou adotar outra estratégia comprovada. DirectQuery só deve ser avaliado com necessidade de latência, suporte do conector e desempenho/security testados; não elimina ETL ou atraso na fonte.

## Modelo estrela compartilhado

[MODELO_DADOS.md](MODELO_DADOS.md) define dimensões de empresa/estabelecimento, profissional, registro, município/GRE, CNAE, tempo, CBO e demais classificações. A fonte de identidade inclui `SourceSystem` e chave original; não unir IDs de bancos diferentes por igualdade numérica ou nome.

Fatos de registro/evento, RT, ART/autoria, CAO/ponte ART, obrigações/pagamentos, contratos e emprego agregado mantêm seu grão. Pontes tratam muitos-para-muitos; dimensões filtram fatos em sentido único. Emprego e formação públicos ligam-se a território/tempo/atividade, não ao CPF/CNPJ privado. Calendário de evento, vencimento, pagamento, emissão e snapshot são papéis distintos.

Conciliação e sinais digitais são fatos upstream de regra/evidência versionada, sem score arbitrário de infração. O grão de cada linha conserva IDs dos fatos utilizados, competência, lote e limite da inferência. Processos/autos/decisões permanecem no histórico de origem e na prestação de contas.

Catálogos V8 descrevem campos, definições e normas. `confea-catalog-v8.json` conserva proveniência integral; `confea-ui-v8.json` contém metadados compactos, sem valores históricos. `available-fields-v8.json` evidencia 128 contratos vistos nos anexos. Estes arquivos não substituem vistas/fatos de dados homologados.

## Páginas e recursos visuais

| Página | Recursos e contexto |
| --- | --- |
| Presidência e resultados | Fluxo/estoque cadastral; empresas ativas e vigência RT; profissionais ativos e autoria ART identificada; ART/autores mensais; pagamentos PJ e recuperação/saldo vencido; crescimento cadastro ativo/emprego por território compatível |
| Empresas | Evolução, porte/situação, distribuição regional, ART/CAO, financeiro e qualidade; alternativas não financeiras por perfil |
| Profissionais e formação | Formação declarada/RT, modalidades, intervalo graduação–registro, vínculos RT/QSA, ART/autores e concentração de empresas por profissional |
| Mercado e emprego | Fluxos mensais, mapa de estoque, CBO, crescimento territorial/cadastro, cobertura CNAE–município e concentração/cobertura |
| Contratações | Valor/volume, Pareto, objetos, fornecedor/cadastro/RT/ART e território do fornecedor; vínculo ART–contrato deve ser expresso |
| Fiscalização digital | Conciliação CNPJ, classificação CNAE, objetos PNCP, vigência RT, contexto agregado CAGED/RAIS e conjuntos de evidências |
| Transparência — prévia privada | Catálogo regional pesquisável, bases normativas, prazos e estados de fonte; 44 indicadores regionais e 185 regras de dados CREA ativas, sem valores atuais conectados |

Usar navegador de sete páginas, Cards, combinados nativos, matriz com formatação condicional, barras, treemap, scatter e drillthrough. Sankey temático exige visual homologado ou alternativa de matriz/barras. Deneb é opcional quando recursos nativos não comportam a leitura, sujeito a seleção, acessibilidade e permissão. Mapas dependem de solução aprovada.

O canvas referencia 1366×768 e 1920×1080 sem rolagem. No Power BI, definir tamanho e ajuste à página; adaptação do React não cria automaticamente relatórios separados. Fichas/tabelas são páginas ocultas de drillthrough com retorno. A prévia de Transparência não habilita publicação pública nem exige copiar listas extensas de regras para o canvas.

Tema: [CREA-SP.theme.json](CREA-SP.theme.json). Composição: [DESIGN_POWER_BI.md](DESIGN_POWER_BI.md).

## Medidas: referências DAX

Os exemplos assumem tabelas normalizadas e nomes propostos, com chaves/grão homologados. Não foram executados em `.pbix`; demonstram a regra de contagem. Uma medida de produção sem fonte/cobertura válida deve retornar **BLANK e estado de fonte**, não zero.

```dax
Empresas Ativas =
CALCULATE (
    DISTINCTCOUNT ( FatoRegistroSnapshot[EmpresaID] ),
    KEEPFILTERS ( FatoRegistroSnapshot[Situacao] = "Ativo" )
)

Profissionais Ativos =
CALCULATE (
    DISTINCTCOUNT ( FatoProfissionalSnapshot[ProfissionalID] ),
    KEEPFILTERS ( FatoProfissionalSnapshot[Situacao] = "Ativo" )
)

ARTs = DISTINCTCOUNT ( FatoART[ARTID] )

Autores ART Identificados =
DISTINCTCOUNTNOBLANK ( PonteARTAutor[ProfissionalID] )

Saldo Emprego =
SUM ( FatoEmpregoAgregado[Admissoes] )
- SUM ( FatoEmpregoAgregado[Desligamentos] )

Recebimentos PJ = SUM ( FatoPagamentoPJ[ValorRecebido] )

Recuperado PJ =
CALCULATE (
    [Recebimentos PJ],
    KEEPFILTERS ( FatoPagamentoPJ[Recuperacao] = TRUE () )
)

Recebimentos Ordinarios PJ = [Recebimentos PJ] - [Recuperado PJ]

Participacao Orcamentaria Fiscalizacao =
DIVIDE ( [Orcamento Aprovado Fiscalizacao], [Orcamento Aprovado Total] )
```

Snapshots exigem **um corte**, não soma temporal de registros ativos. Empresas com RT são a interseção de empresas ativas no corte com empresas de vínculo vigente no mesmo corte. Profissionais com autoria identificada são a interseção de profissionais ativos com a ponte de autores no período. A inexistência de autoria não é ausência de trabalho: exibir cobertura de identificação entre ARTs observadas e distinguir `BLANK` de zero.

O pagamento usa **data de pagamento**. Recuperado é parte do recebido, não receita adicional. Saldo vencido exige snapshot/reconstrução no corte, abatendo apenas pagamentos ocorridos até ele e respeitando exigibilidade. Recebimentos PJ dessa base não são toda a receita institucional. Um gráfico pode combinar fluxo e estoque com eixos/legenda próprios, sem soma entre eles.

O indicador 53 usa **dados CREA#183 / CREA#182**, ambos de orçamento **aprovado** no mesmo exercício/unidade. A medida acima retorna fração formatada como `%`; não multiplicar novamente por 100 se houver formato percentual. Não usar gasto realizado como substituto. A razão não prova crescimento real acima da inflação. Denominador ausente/zero retorna BLANK; parcela maior que total deve falhar na validação. Indicador 35 permanece sem valor calculado enquanto a inconsistência entre descrição e dependências da planilha não for homologada.

A comparação econômica tem dois estoques iniciais próprios, mesma competência e território. Crescimento sem base inicial válida retorna BLANK. A medida de comparabilidade deve bloquear comparação quando porte, situação ou coorte nominal reduz apenas o cadastro. Não inventar emprego atribuível às empresas selecionadas.

CAO emitida é fluxo pela emissão, independentemente de status posterior. ARTs vinculadas à CAO podem ter outra competência; ponte de certidão preserva o documento relacionado fora da janela de emissão. Autores mensais e estoque de emprego não são somáveis como pessoas distintas anuais.

Adimplência empresarial usa empresas com obrigação vencendo até o corte e regra de exigibilidade homologada. Não multiplicar saldo por estabelecimento, RT ou CNAE. Valores legais de Transparência são alimentados por vistas de fechamento; marcações da planilha e valores estáticos dos anexos não entram nestas medidas.

## Interações, comparação e drillthrough

Segmentações de território/período/classificações sincronizam domínios compatíveis. Configurar **Edit interactions** pelo grão e papel: estabelecimento, domicílio profissional, unidade contratante, fornecedor e obra não são geografia intercambiável.

Seleção de profissional produz conjuntos por RT, QSA confirmado ou autoria expressa, distinguindo essas relações. RAIS/CAGED agregados não respondem a CPF/CNPJ ou porte. Na visão executiva, a comparação empresa–emprego é bloqueada ao tornar os universos incompatíveis. A série agregada preservada deve explicar seu escopo.

A fiscalização digital seleciona IDs de empresas e fatos de evidência por regra, com fonte, corte, justificativa e limite. CNPJ exato é diferente de raiz candidata; objeto técnico demonstrativo não é obrigação comprovada; ausência de ligação contratual ART significa indisponibilidade da ponte, não falta de documento. O BI não executa análise processual, auto, distribuição ou conclusão.

Comparação temporal mantém janela/coorte, unidade e cobertura. Mês parcial usa corte compatível; evolução de todo o universo histórico precisa de snapshots, não apenas retrofiltragem da população atual. Bookmarks de exibição preservam filtros; drillthrough mantém contexto e retorno. URL/localStorage/drawers React são especificação funcional, sem conversão automática para recursos Power BI.

Transparência possui filtros de ano/subprograma/tipo de regra/pesquisa, separando 42 indicadores CREA, dois de dependência federal e nove federais excluídos. Não sincronizar coorte nominal ou CNAE com orçamento institucional para produzir uma atribuição inexistente.

## Governança, Presidência e superintendências

A Presidência relaciona mudança cadastral, continuidade de RT nas empresas ativas, autoria técnica efetivamente identificada, recebimentos PJ e contexto econômico. Perguntas compatíveis substituem correlações entre populações diferentes. Ausência de RT/ART não demonstra desemprego; dados fictícios não demonstram desempenho de uma gestão.

SUPFIS usa a área **Fiscalização digital** para cruzamentos e evidências. Os volumes de ações/autos/processos que integram prestação de contas ficam na página **Transparência**, sem transformar a área digital em avaliação dos fiscais. SUPCOL utiliza eventos/decisões recebidos da fonte; SUPADF homologa saldos, pagamentos e orçamento; SUPCOR contribui para definições do público/serviço nas fontes; SUPTEC acompanha conectividade e qualidade. A UDE é vinculada ao GABI conforme organograma. São usos/validações propostos, não atribuições oficiais presumidas.

Produção exige segurança de workspace/modelo, RLS territorial quando aplicável, OLS/permissões financeiras, identidade somente de leitura e restrição de exportação. Perfis React demonstram apresentação; não protegem o conteúdo entregue ao browser. Dados privados não devem ser publicados pela simples ocultação de visuais.

## Transparência pública futura: artefato separado

A página atual é **prévia privada**, sem botão de publicação ou mudança de audiência. [TRANSPARENCIA_NORMAS_V8.md](TRANSPARENCIA_NORMAS_V8.md) e `transparency-rules-v8.json` distinguem publicação regional, consolidação federal e solicitação Confea. RG regional: 31/3; processo ao Confea: 1º/4. DN-TCU 216/2025 estabelece oito grupos no capítulo federal e quadros abertos regionais. Portaria Segecex 10/2025 exige inicialmente sua API apenas dos federais.

Para eventual publicação, criar dataset/modelo público contendo somente agregados e campos homologados, com competência, fonte, regra, atualização e histórico de retificação. A obrigação de divulgar gasto público do conselho não autoriza publicar dívida particular ou sinais nominais de fiscalização. A obrigação nominal específica de remuneração/indenização segue seu próprio dispositivo e não autoriza outros dados privados.

Aceite automatizado do pacote público deve verificar esquema permitido, ausência de tabelas/colunas privadas, chaves pessoais desnecessárias, nomes de suspeitos/dívidas, números estáticos de anexos e ligações ao gateway privado. Validar o arquivo/distribuição completo: RLS, filtros e abas ocultas não retiram o dado de um artefato exportável. Publicação só ocorrerá depois de decisão institucional; o protótipo não a realiza.

Validar views, `SourceSystem`, chaves, grão, nulos/zeros, lote/competência/idade de fonte, totais, folding, partições, RLS/OLS, exportação e refresh após ETL no ambiente real. Testes do código estão em [QA.md](QA.md); eles não substituem esse aceite institucional.


## Identidade visual V9

O tema [powerbi-theme-creasp-v9.json](../integrations/powerbi-theme-creasp-v9.json) fornece a paleta, tipografia padrão compatível e cores básicas. Importar em **Exibição → Temas → Procurar temas** no Power BI Desktop e validar na versão utilizada. O arquivo foi validado, sem erros, contra o schema oficial Microsoft `reportThemeSchema-2.157.json`; a evidência está em `integrations/powerbi-theme-creasp-v9.validation.json`. A importação efetiva em um Desktop instalado no ambiente institucional ainda requer validação. O tema não contém dados ou credenciais. Na hospedagem privada, o mesmo arquivo está disponível em `/themes/powerbi-theme-creasp-v9.json`.

As cores de cada medida devem ser configuradas pela função: volume atual em royal, estoque/estrutura em navy, histórico ou informação ausente em azul acinzentado; amarelo pontual para universos e séries observadas, com contorno ou traço escuro em fundo branco. Não deixar a ordem automática das cores atribuir ao amarelo uma conclusão de irregularidade. Cards sobre faixa escura exigem configuração explícita de texto branco/amarelo; o tema base conserva texto escuro para visuais de superfície clara.

Os degradês e a malha técnica são especificação visual do protótipo. O JSON de tema não reproduz sozinho todas as superfícies CSS, tooltips ou gradientes ECharts. Reproduzir a composição com formas/fundos, títulos e cartões compatíveis; avaliar SVG/Deneb quando a função analítica justificar um visual adicional e a governança permitir. A engrenagem desenhada para o protótipo é um motivo original de engenharia, não substitui o selo oficial do CREA-SP. A reprodução de um recurso avançado depende de validar suporte, exportação e acessibilidade no Power BI.
