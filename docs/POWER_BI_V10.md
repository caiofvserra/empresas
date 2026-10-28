# Implementação empresarial no Power BI — V10 / CREA-SP

A aplicação React V10 é uma **especificação funcional**, com dados fictícios, para um relatório Microsoft Power BI em tela de PC. Não há conversão automática para `.pbix`, nem validação de um relatório Desktop executado nesta entrega. Reproduzir modelo, medidas, relacionamentos, interações e segurança requer implementação e homologação próprias.

## Cinco páginas e um percurso de decisão

| Página ativa | Pergunta e leitura | Recursos Power BI previstos |
| --- | --- | --- |
| Direção estratégica | Base empresarial vigente, cobertura de mercado, cobertura RT e participação ART; evolução, presença e relações | Cards, gráfico combinado, barras, dispersão e tooltips |
| Presença e mercado | Retenção da coorte, aberturas externas não identificadas e distribuição por território/CNAE | Mapa municipal, barras empilhadas, matriz/heatmap, parâmetros de métrica |
| Vínculo técnico | Cobertura no corte, continuidade em dias-empresa e atividade documental empresarial | Cards, séries combinadas, partições RT × ART, barras de lacunas |
| Inteligência digital | Demanda pública, registro do fornecedor na publicação, ponte documental contrato–ART e sinais convergentes | Funil/fluxo, treemap, matriz e barras com drillthrough |
| Resultados e recursos | Adimplência PJ, recebimentos, dívida vencida e recuperação de uma coorte fixa; ingresso posterior à observação externa como resultado observado | Cards, gráficos combinados, waterfall/barras e quadro de coorte |

Cada página apresenta **quatro KPIs e quatro análises**, com filtros sincronizados e aprofundamento em empresas. O catálogo dos 17 indicadores explica decisão, fórmula e limite; nem todos precisam ocupar um card simultaneamente. A documentação de análise crítica e o modelo são os contratos ativos, não a antiga navegação V4–V9.

Canvas de referência: **1366×768 e 1920×1080**, sem rolagem da página analítica. Em Power BI, definir tamanho/proporção e testar o modo de ajuste no navegador; a página React usa layout responsivo e não garante reprodução pixel a pixel em qualquer dimensão. Fichas e tabelas React correspondem a páginas de drillthrough e visuais de tabela, não a tratativas administrativas.

## Fontes e camada curada

O usuário informou **SQL Server e IBM Db2 com gateway**. Mapear quais domínios residem em cada banco, nomes físicos, chaves, grãos e responsáveis. Não decidir essa distribuição por suposição. APIs externas e arquivos oficiais devem alimentar landing/staging validado e tabelas curadas; o browser não é coletor nem ponte de credenciais.

Fluxo recomendado:

1. Ler views institucionais com identidade de serviço somente leitura; coletar APIs/arquivos/convênios conforme autorização, calendário e contratos.
2. Validar layout, completude, território, papéis, chaves e reconciliação. Preservar lote, competência, vigência, origem e cobertura.
3. Gerar dimensões conformadas, fatos/eventos e baselines. Materializar intervalos e dias-empresa quando isso melhorar desempenho.
4. Promover atomicamente um lote válido; falhas mantêm a versão anterior e sinalizam atraso.
5. Atualizar o modelo semântico e registrar separadamente o sucesso do refresh. Sucesso de download não prova promoção ou refresh.

Os templates em `integrations/power-query/` e `integrations/sql/` são propostas históricas de leitura, sem credenciais nem schema real confirmado. A rotina PNCP existente em `scripts/refresh-sources.ts` é configurável, mas o exemplo vem **desabilitado** e não ativa agendamento, staging ou gateway por si só. [FONTES_EMPRESARIAIS_V10.md](FONTES_EMPRESARIAIS_V10.md) distingue APIs confirmadas, arquivos a homologar e convênios ainda propostos.

## Conectores nativos e gateway

Configurar conexões `Sql.Database` e `DB2.Database` no **on-premises data gateway em modo padrão**, com acesso de rede, TLS, credenciais de serviço e responsáveis. Testar família/versão Db2, provider/implementação do conector e drivers de 64 bits quando exigidos pela configuração empregada. Não colocar segredos em M, JSON público, Git ou React.

Adotar inicialmente **Import com refresh agendado** nas views curadas. Definir janela de atualização conforme calendário e capacidade dos produtores. DirectQuery só deve ser escolhido com requisito de latência e desempenho comprovados; ele não corrige a defasagem da origem ou substitui ETL.

Incremental exige folding validado nas consultas/conectores reais. Usar `RangeStart` inclusivo e `RangeEnd` exclusivo sobre data apropriada; mudanças de partição, retificações e exclusões precisam de política que remova/substitua a versão anterior. Sem CDC/data de alteração confiáveis, usar snapshots ou recomposição controlada em vez de declarar um incremental fictício. Para PNCP, publicação não é CDC de toda revisão antiga.

## Modelo semântico e relações

Separar dimensões Empresa, Estabelecimento, CNAE, Município/GRE, Tempo e Modalidade e fatos de Registro/Movimento, Vínculo RT, ART, CAO, Contrato/Termo, Documento Contrato–ART, Observação Externa, Obrigação/Pagamento PJ e Emprego Agregado. Pontes têm grão, origem e vigência próprios. Detalhes: [MODELO_EMPRESARIAL_V10.md](MODELO_EMPRESARIAL_V10.md).

Emprego liga-se a tempo/território/CNAE/CBO, **não à empresa**. Evitar relações bidirecionais gerais para forçar o filtro de CNAE/estabelecimento até fatos financeiros por raiz; elas podem multiplicar valores ou criar caminhos ambíguos. Projetar medidas para transferir o conjunto de empresas selecionadas quando o fato só possui `EmpresaId`.

Exemplo conceitual de transferência de filtro, a adaptar ao modelo real:

```dax
Recebido PJ no recorte :=
VAR EmpresasDoRecorte = VALUES(DimEstabelecimento[EmpresaId])
RETURN
    CALCULATE(
        SUM(FatoPagamentoPJ[ValorRecebido]),
        TREATAS(EmpresasDoRecorte, DimEmpresa[EmpresaId])
    )
```

O exemplo pressupõe que a data de pagamento seja a relação temporal apropriada e que o conjunto de estabelecimentos reflita o contexto autorizado. Não significa recebimento atribuído fisicamente à filial selecionada. Chaves, nomes, relações e política de filtro devem ser homologados.

## Contratos de medida essenciais

| Medida | Regra a preservar |
| --- | --- |
| Base empresarial | Raízes distintas com ao menos um intervalo de registro vigente; saldo reconcilia com transições empresariais, não soma de registros/filiais |
| Retenção | Coorte inicial fixa; a variante demonstrada condiciona a fotografia RFB ativa disponível no corte final e deixa esse limite explícito |
| Cobertura externa | Distintos CNPJs completos elegíveis com registro exato vigente / distintos CNPJs completos elegíveis; raiz candidata não entra como exata |
| RT no corte | Raízes empresariais vigentes com vínculo técnico identificado / raízes vigentes, sem somar profissionais como empresas |
| Continuidade RT | Soma de dias-empresa cobertos / soma de dias-empresa registrados em histórico qualificado; unir intervalos antes de calcular |
| Participação ART | Empresas com algum dia de registro na janela e ART empresarial expressa / todas as empresas com algum dia de registro na janela; não selecionar apenas sobreviventes |
| Emprego contextual | Estoque final / estoque inicial − 1, com dois meses comparáveis; filtros nominais/porte/situação não podem reduzir apenas o cadastro e manter uma correlação artificial |
| Fornecedor com registro | CNPJ completo do fornecedor e vigência na publicação de referência definida; publicação não é execução |
| Rastreabilidade contratual | Contrato com ponte documental expressa conhecida no corte; ART qualquer da mesma empresa não basta |
| Recebido PJ | Fluxo por data efetiva de pagamento; valores de ART e PNCP não são receita CREA |
| Vencido | Estoque líquido no corte; saldos mensais não são somados |
| Recuperação | Pagamento elegível da mesma coorte vencida e aberta no baseline / saldo dessa coorte; recuperação integra recebimento |
| Ingresso após observação | Baseline externo datado e primeiro registro posterior; sequência temporal não prova impacto causal de uma gestão |

Sem denominador válido, retornar **BLANK**, não zero. Ausência de data, ponte ou cobertura de fonte não pode virar ausência comprovada de RT, ART ou regularização. CNPJ deve ser string compatível com caracteres alfanuméricos e com validação versionada da Receita.

### DAX sobre fatos qualificados upstream

```dax
Cobertura externa % :=
DIVIDE([Estabelecimentos elegíveis com registro exato vigente],
       [Estabelecimentos externos elegíveis])

Continuidade RT % :=
DIVIDE(SUM(FatoDiaEmpresa[DiasCobertosRT]),
       SUM(FatoDiaEmpresa[DiasRegistrados]))

Recuperação da coorte % :=
DIVIDE([Recebido da coorte vencida inicial],
       [Saldo vencido inicial da mesma coorte])
```

Os numeradores/denominadores exigem fatos qualificados, baselines e regras acima. Fórmulas DAX curtas não substituem reconstrução de intervalos, cobertura histórica ou vínculo documental. Se fonte não permite reconstrução confiável, bloquear a medida correspondente.

## Interação e design

Segmentações sincronizadas por GRE, município, CNAE, porte e janela; seleção cruzada real; tooltip de definição com numerador, denominador, fonte e limite; botão de retorno de drillthrough; exportação do conjunto autorizado. Grupos por CNAE principal/secundários podem se sobrepor, por isso total geral deve ser recalculado por chaves distintas.

Manter a direção visual CREA-SP: navy, royal e azul-claro com amarelo pontual, degradês de superfície, motivo original de engrenagem e malha técnica. O tema V10 a ser entregue fornece a base cromática; validar seu schema e a importação na versão Desktop usada. O tema não contém o modelo, as medidas, os gráficos ou a aplicação React. Não presumir que CSS/ECharts se converta automaticamente em Power BI.

Gráficos combinados e barras/matrizes/mapas têm equivalentes nativos. Fluxos e composições avançadas podem requerer Deneb/SVG ou outro visual homologado; avaliar suporte à exportação, acessibilidade e política de visuais personalizados. A engenharia é referência gráfica, não uma imagem que encobre dados ou aparenta um selo oficial.

## Acesso, auditoria e publicação

Aplicar RLS por território/escopo autorizado e OLS/permissão específica para dados financeiros e pessoais. Controlar exportações e acesso ao workspace/modelo. Os perfis locais do protótipo alteram apresentação e exportação, mas **não são segurança de produção**: os dados estáticos são demonstrativos.

Construir a conciliação upstream em escopo autorizado e preservar flags de correspondência apropriadas ao consumidor. Um filtro de segurança não pode transformar um registro existente em uma falsa ausência apenas porque o detalhe está fora da região visível. A política deve prevenir tanto esse erro analítico quanto exposição de dados de outro escopo.

A hospedagem do protótipo permanece **privada**. Qualquer produto público futuro exige schema permitido, dados homologados, revisão de sigilo e decisão institucional específica; dívida particular nominal e indícios de fiscalização não são gastos públicos do conselho. As normas/planilhas anteriores continuam referências separadas, sem afirmar que todos os 17 indicadores sejam uma obrigação pública textual individual do TCU.

## Homologação e limites

Confirmar conectividade, drivers, chaves, grãos, território e vigências; reconciliar valores e denominadores com as origens; testar revisões/exclusões, folding e refresh; validar RLS/OLS e exportação; conferir renderização nas telas de PC e drillthrough. A evidência de testes desta entrega é registrada em [QA_V10.md](QA_V10.md), sem antecipar resultados de produção institucional.
