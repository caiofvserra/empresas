import type { ReportIndicatorDefinition } from './public-indicators';

const competence = 'Cenário demonstrativo CREA-SP: corte em 30/09/2026; fluxos na janela selecionada e maturação avaliada nesse corte.';
const source = 'Modelo relacional institucional demonstrativo local; integração prevista com tabelas de programas, presenças, orçamento, reservas e serviços do CREA-SP. Nenhuma conexão institucional foi configurada; custos, participantes e resultados são fictícios.';
const ruleVersion = 'resultados-institucionais-demo-7.0';
const owners = {
  programs: 'SUPCOR e unidade responsável pelo programa, com validação da UDE: responsáveis propostos, a homologar pelo CREA-SP.',
  financial: 'SUPADF e unidade responsável pelo programa, com controle interno: responsáveis propostos, a homologar pelo CREA-SP.',
  infrastructure: 'Unidade responsável pelo CreaLab e SUPADF: responsáveis propostos, a homologar pelo CREA-SP.',
  planning: 'Presidência/GABI e UDE, com as áreas responsáveis: responsáveis propostos, a homologar pelo CREA-SP.',
  service: 'Unidade responsável pelo serviço cadastral ou orientação, com validação da UDE: responsáveis propostos, a homologar pelo CREA-SP.',
};

type Definition = Pick<ReportIndicatorDefinition, 'id' | 'name' | 'concept' | 'formula' | 'unit' | 'limitations'>
  & Partial<Pick<ReportIndicatorDefinition, 'owner' | 'periodicity'>>;

const demo = (definition: Definition): ReportIndicatorDefinition => ({
  source, competence, ruleVersion, periodicity: 'Cenário demonstrativo fixo; atualização mensal proposta via banco/API institucional, ainda não configurada.',
  owner: owners.programs, ...definition,
});

/** Distinct people, participation occurrences, spending and mature follow-ups retain separate grains. */
const demonstratedIndicators: ReportIndicatorDefinition[] = [
  demo({
    id: 'institutionalActivities', name: 'Atividades institucionais no período',
    concept: 'Atividades ofertadas no território e no período, distinguindo formação, orientação, plantão cadastral e utilização mensal de coworking.',
    formula: 'COUNT(activities.id) no InstitutionalScope; formação/orientação é um subconjunto identificado por participationMode = attendance.',
    unit: 'atividade registrada',
    limitations: 'Um registro mensal de uso de coworking é uma atividade do modelo, não uma palestra. Volume de atividades não mede público único ou benefício. Coorte profissional restringe às atividades representadas pelas participações observadas.',
  }),
  demo({
    id: 'institutionalRegistrations', name: 'Inscrições em formação e orientação',
    concept: 'Ocorrências de inscrição em atividades de formação/orientação, com identificação disponível ou ausente.',
    formula: 'COUNT(participation.id), incluindo attended = false e professionalId ausente; inscrições identificadas e sem identificação reconciliam com o total.',
    unit: 'inscrição, pessoa × atividade quando identificada',
    limitations: 'A mesma pessoa pode inscrever-se em várias atividades. Não chamar o total de pessoas, nem somar a usuários de coworking como público único. Ausência de identidade não cria um profissional fictício adicional.',
  }),
  demo({
    id: 'institutionalAttendances', name: 'Presenças registradas',
    concept: 'Ocorrências de comparecimento em formação/orientação, incluindo presenças cuja identidade não está disponível.',
    formula: 'COUNT(participation.id WHERE attended = true); identificadas + sem identificação = presenças totais.',
    unit: 'presença em atividade',
    limitations: 'Repetições entre atividades são legítimas. Presença não é conclusão, certificação, aprendizado comprovado ou contratação. O cenário não usa visualizações de vídeo para estimar pessoas.',
  }),
  demo({
    id: 'institutionalParticipants', name: 'Participantes identificados distintos',
    concept: 'Profissionais com presença registrada e identificador demonstrativo validado em formação/orientação no recorte.',
    formula: 'DISTINCTCOUNT(participation.professionalId WHERE attended = true AND professionalId informado); deduplicar no período completo, sem somar os distintos mensais.',
    unit: 'profissional identificado distinto',
    limitations: 'A identidade referencia os 600 profissionais fictícios existentes. A participação sem identificador permanece fora dos distintos e é exibida separadamente. Não é estimativa do total de público único; não inclui automaticamente usuários de coworking ou solicitações de serviço.',
  }),
  demo({
    id: 'institutionalIdentification', name: 'Cobertura de identificação das presenças',
    concept: 'Parcela das ocorrências de presença que permitem rastreamento a um profissional identificado.',
    formula: 'COUNT(presenças com professionalId) / COUNT(presenças totais); null quando não há presenças.',
    unit: 'proporção de ocorrências de presença',
    limitations: 'É qualidade de identificação, não taxa de registro no CREA, de conclusão ou de benefício. Um mesmo identificador pode aparecer em várias presenças. Validar identidade requer protocolo institucional próprio em produção.',
  }),
  demo({
    id: 'institutionalRepeatAttendances', name: 'Presenças identificadas além da primeira',
    concept: 'Ocorrências adicionais de presença depois da primeira observada de cada profissional no recorte.',
    formula: 'COUNT(presenças identificadas) − DISTINCTCOUNT(professionalId nas presenças).',
    unit: 'ocorrência adicional de presença',
    limitations: 'Não é quantidade de pessoas que repetiram, duplicação indevida ou prova de favorecimento. Cursos continuados podem gerar recorrência legítima; contexto de seleção e oferta deve ser examinado separadamente.',
  }),
  demo({
    id: 'institutionalAttendanceRate', name: 'Comparecimento entre inscrições',
    concept: 'Proporção de inscrições com presença observada nas atividades do recorte.',
    formula: 'COUNT(participation WHERE attended = true) / COUNT(participation); null quando não há inscrições.',
    unit: 'proporção de inscrições',
    limitations: 'Indicador por inscrição, não por pessoa distinta. Não medir conclusão de curso, certificação ou efetividade por esta taxa. Para dados reais, cancelamentos e lista de espera exigem regras próprias versionadas.',
  }),
  demo({
    id: 'institutionalPlannedBudget', name: 'Orçamento planejado dos programas',
    concept: 'Valor planejado no grão programa × município da oferta × mês.',
    formula: 'SUM(budgetEntries.plannedCents) / 100.', unit: 'R$ planejados', owner: owners.financial,
    limitations: 'Plano e gasto executado são medidas do mesmo grão, não despesas para somar. É uma programação fictícia; não representa LOA, dotação, empenho ou estágio contábil oficial. Selecionar pessoas/atividades preserva o orçamento integral do território/programa/período.',
  }),
  demo({
    id: 'institutionalExecution', name: 'Gasto executado dos programas',
    concept: 'Despesa demonstrativa integral no território e período, separada entre custo das atividades e demais custos do programa.',
    formula: 'SUM(budgetEntries.executedCents) / 100; executedCents = activityCostCents + otherExecutedCents em cada linha.',
    unit: 'R$ de gasto demonstrativo', owner: owners.financial,
    limitations: 'Não corresponde a valores reais, despesas auditadas, pagamentos a fornecedores ou indício de sobrepreço. Não somar novamente os custos das atividades ao total. Coorte de pessoas/atividades não rateia despesa nominal.',
  }),
  demo({
    id: 'institutionalExecutionRate', name: 'Execução sobre o planejamento',
    concept: 'Relação entre execução e planejamento do mesmo conjunto de linhas orçamentárias.',
    formula: 'SUM(executedCents) / SUM(plannedCents); null quando planejamento = 0.',
    unit: 'proporção orçamentária', owner: owners.financial,
    limitations: 'Pode exceder 100% no cenário. Uma execução alta não prova eficiência ou benefício. Não confundir programação demonstrativa com limites orçamentários oficiais, nem calcular média simples das taxas municipais.',
  }),
  demo({
    id: 'institutionalParticipantCost', name: 'Custo por participante identificado',
    concept: 'Custo integral de formação/orientação dividido pelos profissionais identificados distintos com presença no mesmo território/programa/período.',
    formula: 'SUM(executedCents dos programas participationMode = attendance) / DISTINCTCOUNT(professionalId com presença); na exibição em R$, dividir por 100. null sem participantes ou sob seleção de pessoas/atividades.',
    unit: 'R$ por profissional identificado distinto', owner: owners.financial,
    limitations: 'Inclui custos de atividades com identidade incompleta e demais custos desses programas; por isso não equivale a custo por todo o público. Não é gasto individual, retorno financeiro ou impacto causal. O orçamento não é rateado por beneficiário; a razão fica indisponível em drillthrough de coorte.',
  }),
  demo({
    id: 'institutionalUnknownIdentityCost', name: 'Custo direto de ações com identidade incompleta',
    concept: 'Soma do custo direto das atividades que possuem ao menos uma inscrição sem identificador, contando cada atividade uma vez.',
    formula: 'SUM(allActivities.costCents WHERE activityId possui participation.professionalId ausente) / 100.',
    unit: 'R$ de custo direto das atividades', owner: owners.financial,
    limitations: 'Sinaliza uma limitação de rastreabilidade; não quantifica gasto desperdiçado ou custo de pessoas não identificadas. Não inclui automaticamente todos os demais custos do programa. Inscrição sem identidade pode não ter virado presença.',
  }),
  demo({
    id: 'institutionalFollowupEligible', name: 'Acompanhamentos elegíveis após 90 dias',
    concept: 'Ocorrências de acompanhamento de presença identificada cuja data de maturação de 90 dias já foi alcançada no corte.',
    formula: 'COUNT(followups.id WHERE dueAt <= data de referência); dueAt = data da atividade + 90 dias. Acompanhamentos ainda imaturos ficam separados.',
    unit: 'acompanhamento pessoa × atividade', periodicity: 'Mensal, após maturação de 90 dias.',
    limitations: 'Uma pessoa pode ter vários acompanhamentos. Não contar os ainda imaturos como ausência de resposta ou fracasso. O prazo de 90 dias é uma regra demonstrativa proposta, não norma do CREA-SP.',
  }),
  demo({
    id: 'institutionalFollowupResponses', name: 'Acompanhamentos elegíveis respondidos',
    concept: 'Acompanhamentos maduros com resposta registrada até a competência.',
    formula: 'COUNT(followups.id WHERE dueAt <= corte AND responded = true AND respondedAt <= corte).',
    unit: 'resposta pessoa × atividade', periodicity: 'Mensal, após maturação de 90 dias.',
    limitations: 'Respostas são autodeclaradas e não equivalem a emprego, remuneração, ART ou mudança observada em fonte externa. Não somar acompanhamentos como pessoas distintas; ausência de resposta não informa resultado.',
  }),
  demo({
    id: 'institutionalFollowupResponseRate', name: 'Taxa de resposta do acompanhamento',
    concept: 'Proporção de acompanhamentos maduros respondidos, com não resposta explicitada no denominador.',
    formula: 'respondedFollowups / eligibleFollowups; null se não houver acompanhamentos maduros.',
    unit: 'proporção de acompanhamentos', periodicity: 'Mensal, após maturação de 90 dias.',
    limitations: 'Taxa por ocorrência de acompanhamento, não por pessoa distinta. Não resposta pode ser seletiva; a opinião dos respondentes não representa necessariamente o conjunto de participantes.',
  }),
  demo({
    id: 'institutionalFollowupDistinctRespondents', name: 'Profissionais respondentes distintos',
    concept: 'Pessoas identificadas distintas que responderam a pelo menos um acompanhamento maduro no corte.',
    formula: 'DISTINCTCOUNT(followups.professionalId WHERE dueAt <= corte AND responded = true AND respondedAt <= corte).',
    unit: 'profissional respondente distinto', periodicity: 'Mensal, após maturação de 90 dias.',
    limitations: 'Não é denominador da distribuição de resultados por acompanhamento. Uma pessoa pode dar respostas diferentes para atividades diferentes; não reduzi-las a um único resultado sem regra adicional.',
  }),
  demo({
    id: 'institutionalFollowup', name: 'Aplicação profissional relatada após 90 dias',
    concept: 'Respostas autodeclaradas que relatam aplicação profissional do conteúdo, entre acompanhamentos maduros respondidos.',
    formula: 'COUNT(respostas elegíveis com outcome = Aplicação profissional relatada) / respondedFollowups; Aprendizado relatado + Sem mudança relatada + Aplicação relatada = respondedFollowups. null sem respostas.',
    unit: 'ocorrência relatada / proporção de respostas', periodicity: 'Mensal, após maturação de 90 dias.',
    limitations: 'Não resposta, seleção do público e autoavaliação limitam a interpretação. Não comprova recolocação, ganho salarial, renda, qualidade técnica ou efeito causado pelo programa. Não há grupo de comparação nem contrafactual no protótipo.',
  }),
  demo({
    id: 'institutionalCoworkCapacity', name: 'Capacidade disponível dos coworkings',
    concept: 'Horas de posições de trabalho disponibilizadas nos horários de abertura demonstrativos das unidades.',
    formula: 'SUM(coworkMonths.availableDeskHours) por unidade × mês; no cenário = posições × 160 horas mensais.',
    unit: 'hora de posição de trabalho disponível', owner: owners.infrastructure,
    limitations: 'Uma unidade física não é uma medida de utilização. Capacidade exige calendário real de abertura, bloqueios e manutenção em produção. Não confundir hora de posição com hora-pessoa de formação ou hora de conteúdo.',
  }),
  demo({
    id: 'institutionalCoworkUsedHours', name: 'Horas de uso registradas nos coworkings',
    concept: 'Horas efetivamente utilizadas no livro demonstrativo de uso, sem multiplicar o mesmo registro por relações externas.',
    formula: 'SUM(allCoworkUsage.usedDeskHours); uso da coorte = SUM(coworkUsage.usedDeskHours), exibido com rótulo próprio.',
    unit: 'hora de posição de trabalho utilizada', owner: owners.infrastructure,
    limitations: 'Utilização não comprova produtividade ou benefício profissional. A ocupação institucional usa o uso total observado, mesmo sob seleção de pessoas; o uso da coorte é uma medida separada e não reduz a capacidade.',
  }),
  demo({
    id: 'institutionalCoworkUsers', name: 'Usuários identificados distintos dos coworkings',
    concept: 'Profissionais identificados com ao menos um registro de uso de coworking no período.',
    formula: 'DISTINCTCOUNT(allCoworkUsage.professionalId); em coorte, DISTINCTCOUNT(coworkUsage.professionalId) com rótulo de coorte.',
    unit: 'profissional usuário distinto', owner: owners.infrastructure,
    limitations: 'Não somar distintos de meses ou unidades para produzir o total de usuários. Uma pessoa pode usar várias unidades e participar de formação; a união requer as chaves, não soma de totais.',
  }),
  demo({
    id: 'institutionalCowork', name: 'Ocupação observada dos coworkings',
    concept: 'Parte da capacidade de posições de trabalho efetivamente utilizada no recorte institucional.',
    formula: 'SUM(allCoworkUsage.usedDeskHours) / SUM(coworkMonths.availableDeskHours); null sem capacidade disponível.',
    unit: 'proporção de horas de posições disponíveis', owner: owners.infrastructure,
    limitations: 'Calcular a razão das somas, sem média simples das taxas das unidades. Capacidade e uso institucional permanecem integrais sob seleção de participantes/atividades. Baixa ou alta ocupação não prova, isoladamente, desperdício ou benefício.',
  }),
  demo({
    id: 'institutionalCoworkCost', name: 'Gasto executado dos coworkings',
    concept: 'Despesa integral demonstrativa do programa coworkings no território e período.',
    formula: 'SUM(budgetEntries.executedCents WHERE programId = coworkings) / 100.',
    unit: 'R$ de gasto demonstrativo', owner: owners.financial,
    limitations: 'Inclui custo direto das atividades mensais e demais custos do programa. Não somar novamente coworkMonths.executedCents ao orçamento. Não identifica contratos reais nem prova sobrepreço.',
  }),
  demo({
    id: 'institutionalCoworkCostPerUsedHour', name: 'Custo por hora utilizada de coworking',
    concept: 'Custo integral dos coworkings dividido pelas horas totais de utilização registradas no mesmo recorte institucional.',
    formula: 'SUM(budgetEntries.executedCents WHERE programId = coworkings) / SUM(allCoworkUsage.usedDeskHours) / 100; null sem uso.',
    unit: 'R$ por hora de posição utilizada', owner: owners.financial,
    limitations: 'Razão institucional, não cobrança individual ou retorno. A coorte não rateia custos; denominador usa todo o uso registrado. Comparar unidades exige considerar preços, horário, acessibilidade, demanda e oferta equivalentes.',
  }),
  demo({
    id: 'institutionalTerritory', name: 'Distribuição territorial do gasto e do cadastro',
    concept: 'Comparação descritiva da parcela de gasto pelo local da oferta e da parcela de profissionais pelo domicílio no cadastro fictício.',
    formula: 'Gasto do município / gasto do recorte; profissionais domiciliados no município e registrados até o corte / profissionais domiciliados no recorte e registrados até o corte.',
    unit: 'proporções de universos territoriais diferentes', owner: owners.planning,
    limitations: 'Local da oferta e domicílio não são o mesmo papel geográfico. Divergência não demonstra favoritismo ou injustiça; mobilidade, público atendido, demanda, acessibilidade e alcance precisam ser avaliados. GRE é associação demonstrativa a homologar.',
  }),
  demo({
    id: 'institutionalReach', name: 'Alcance identificado no cadastro domiciliado',
    concept: 'Parcela dos profissionais fictícios domiciliados no território que possuem presença identificada em formação/orientação no recorte.',
    formula: 'COUNT(interseção de distinctParticipants com baselineProfessionalIds) / COUNT(baselineProfessionalIds); baseline = registrados até o corte, pelo domicílio. null sem cadastro de referência.',
    unit: 'proporção de profissionais do cadastro de referência', owner: owners.planning,
    limitations: 'Visitantes de outros municípios não entram no numerador do alcance local, embora contem como participantes da oferta. Cadastro é demonstrativo com 600 pessoas; não representa cobertura real de engenheiros de SP. Alcance não comprova benefício nem equidade de acesso.',
  }),
  demo({
    id: 'institutionalServiceDemand', name: 'Solicitações de serviço criadas no período',
    concept: 'Demandas demonstrativas de cadastro/orientação criadas no local e janela selecionados, originadas por profissional ou empresa.',
    formula: 'COUNT(serviceRequests.id WHERE createdAt no período); userType identifica Profissional ou Empresa, sem fundir as duas identidades.',
    unit: 'solicitação', owner: owners.service,
    limitations: 'Uma pessoa ou empresa pode criar várias solicitações. Não é quantidade de usuários únicos, solução técnica ou fiscalização. O BI analisa registros; não abre, trata ou encaminha pedidos.',
  }),
  demo({
    id: 'institutionalServicePending', name: 'Solicitações ainda não resolvidas no corte',
    concept: 'Solicitações criadas na janela cuja resolução não está registrada até a data de referência.',
    formula: 'serviceRequests − resolvedServiceRequests; resolvida exige resolvedAt <= corte.',
    unit: 'solicitação pendente da coorte de criação', owner: owners.service,
    limitations: 'A coorte de criação não inclui demandas anteriores à janela, portanto não é o estoque de toda a fila. Mostrar idade e maturação: pedidos recentes não devem ser classificados como atrasados só por estarem abertos.',
  }),
  demo({
    id: 'institutionalService', name: 'Prazo observado de resolução de serviços',
    concept: 'Tempo final de resolução das solicitações criadas no período e resolvidas até o corte.',
    formula: 'AVERAGE e MEDIAN(resolvedAt − createdAt em dias), apenas onde resolvedAt <= corte; null sem resoluções.',
    unit: 'dias corridos por solicitação resolvida', owner: owners.service,
    limitations: 'Pendentes não têm duração final e ficam em medidas separadas. Analisar só resolvidas favorece casos rápidos; combinar média/mediana com pendências, maturação e atendimento no prazo. Sem operação de tratativa no BI.',
  }),
  demo({
    id: 'institutionalServiceMatured', name: 'Solicitações com janela de prazo completa',
    concept: 'Demandas que já tiveram toda a janela de 14 dias demonstrativos disponível até o corte, independentemente de terem sido resolvidas.',
    formula: 'COUNT(serviceRequests WHERE createdAt + targetDays <= corte); targetDays = 14 no cenário. Maduras + imaturas = solicitações da coorte.',
    unit: 'solicitação madura', owner: owners.service,
    limitations: '14 dias é um alvo analítico demonstrativo, não SLA publicado ou prazo normativo CREA-SP. Demandas recentes ficam fora da comparação madura; a política real deve definir categoria, suspensões, dias úteis e marcos de contagem.',
  }),
  demo({
    id: 'institutionalServiceLatePending', name: 'Pendências da coorte madura',
    concept: 'Solicitações que alcançaram o prazo demonstrativo e permanecem sem resolução até o corte.',
    formula: 'COUNT(serviceRequests WHERE createdAt + targetDays <= corte AND (resolvedAt ausente OR resolvedAt > corte)).',
    unit: 'solicitação pendente madura', owner: owners.service,
    limitations: 'Inclui a data-limite alcançada, não apenas idade estritamente maior que 14. Não equivale a descumprimento de prazo legal; alvo fictício, sem pausas ou regras de dias úteis. Estoque limitado à coorte criada na janela.',
  }),
  demo({
    id: 'institutionalServiceSla', name: 'Resolução no prazo da coorte madura',
    concept: 'Parcela das demandas maduras resolvidas em até 14 dias no cenário, preservando as pendências maduras no denominador.',
    formula: 'onTimeMatureServiceRequests / matureServiceRequests; onTime = resolvedAt <= corte e resolvedAt − createdAt <= targetDays; null sem demandas maduras. No prazo + resolvidas fora do prazo + pendentes maduras = maduras.',
    unit: 'proporção de solicitações maduras', owner: owners.service,
    limitations: 'O alvo de 14 dias é demonstrativo e não comprova cumprimento de norma. Não dividir apenas pelas resolvidas, pois excluiria pendências. Categorias precisam de prazos e complexidade homologados antes da comparação institucional.',
  }),
];

/** Active measures derive from relational facts; manually transcribed publications are excluded. */
export const institutionalIndicators: ReportIndicatorDefinition[] = demonstratedIndicators;
