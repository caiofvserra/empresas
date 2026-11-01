import type { IndicatorDefinition } from './types';
import { professionalIndicators } from './professionals';

/** Definitions are proposed analytical rules, not official CREA-SP measures. */
type Entry = [id: string, name: string, formula: string, unit?: string, limitation?: string];
const registry: Entry[] = [
  ['companies', 'Empresas distintas', 'DISTINCTCOUNT(Empresa.id) no universo filtrado', 'empresa (raiz CNPJ)', 'Inclui empresas externas; não equivale a estabelecimentos nem registros.'],
  ['establishments', 'Estabelecimentos', 'COUNT(Estabelecimento.id) no universo filtrado', 'estabelecimento (CNPJ completo)'],
  ['registrations', 'Registros empresariais', 'COUNT(Registro.id) no universo filtrado', 'registro', 'Uma empresa pode ter múltiplos registros; inclui registro e visto conforme classificação da base.'],
  ['activeRegistrations', 'Registros ativos', 'COUNT(Registro.id WHERE status = Ativo)', 'registro'],
  ['inactiveRegistrations', 'Registros inativos', 'COUNT(Registro.id WHERE status = Inativo)', 'registro'],
  ['cancelledRegistrations', 'Registros cancelados', 'COUNT(Registro.id WHERE status = Cancelado)', 'registro'],
  ['registeredCompanies', 'Empresas localizadas no CREA', 'DISTINCTCOUNT(Registro.empresaId), independentemente do status', 'empresa'],
  ['activeCompanies', 'Empresas com registro ativo', 'DISTINCTCOUNT(Registro.empresaId WHERE ao menos um registro está ativo)', 'empresa'],
  ['inactiveCompanies', 'Empresas sem registro ativo', 'Empresas localizadas − empresas com ao menos um registro ativo', 'empresa', 'Inclui empresas com somente registros inativos ou cancelados. Categorias mutuamente exclusivas no universo de empresas localizadas.'],
  ['notMatched', 'Empresas sem correspondência', 'Empresas distintas − empresas localizadas no cadastro CREA', 'empresa', 'Ausência de correspondência não é evidência de irregularidade nem de obrigação de registro.'],
  ['coverage', 'Cobertura cadastral estimada', '100 × empresas localizadas / empresas distintas do universo selecionado', '%', 'O denominador deve ser explicitamente definido por CNAE, situação e localização. CNAE não determina obrigação automática.'],
  ['new30', 'Novos registros em 30 dias', 'COUNT(Movimentação WHERE tipo = Novo registro AND data nos últimos 30 dias até a competência)', 'movimentação de registro'],
  ['closed30', 'Baixas e cancelamentos em 30 dias', 'COUNT(Movimentação WHERE tipo IN (Baixa, Cancelamento) AND data nos últimos 30 dias)', 'movimentação de registro'],
  ['net30', 'Saldo cadastral em 30 dias', 'Novos registros + reativações − baixas − cancelamentos nos últimos 30 dias', 'registro'],
  ['newRegistrations', 'Novos registros no período', 'COUNT(Movimentação WHERE tipo = Novo registro AND data no período)', 'movimentação de registro'],
  ['closures', 'Baixas no período', 'COUNT(Movimentação WHERE tipo = Baixa AND data no período)', 'movimentação de registro'],
  ['reactivations', 'Reativações no período', 'COUNT(Movimentação WHERE tipo = Reativação AND data no período)', 'movimentação de registro'],
  ['cancellations', 'Cancelamentos no período', 'COUNT(Movimentação WHERE tipo = Cancelamento AND data no período)', 'movimentação de registro'],
  ['net', 'Saldo líquido cadastral', 'Novos registros + reativações − baixas − cancelamentos', 'registro', 'Saldo de registros ativos, não de empresas distintas.'],
  ['registrationDaysMean', 'Tempo médio para registro', 'AVERAGE(início do registro − solicitação), para registros iniciados no período', 'dias corridos'],
  ['registrationDaysMedian', 'Tempo mediano para registro', 'MEDIAN(início do registro − solicitação), para registros iniciados no período', 'dias corridos'],
  ['tenureMonths', 'Tempo médio de permanência', 'AVERAGE(MIN(encerramento, competência) − início) / 30,4375', 'meses aproximados', 'Inclui histórico encerrado e registros vigentes.'],
  ['multiEstablishmentCompanies', 'Empresas com múltiplos estabelecimentos', 'COUNT(Empresa.id WHERE COUNT(Estabelecimento.id no escopo) > 1)', 'empresa', 'Conta estabelecimentos visíveis nos filtros, não necessariamente todos os estabelecimentos da empresa.'],
  ['reactivatedCompanies', 'Empresas com histórico de reativação', 'DISTINCTCOUNT(empresaId nas movimentações de Reativação)', 'empresa'],
  ['externalCompanies', 'Empresas do universo externo', 'COUNT(Empresa.id WHERE externalOnly = true)', 'empresa'],
];
const technical: Entry[] = [
  ['withRt', 'Empresas com RTS vigente', 'Empresas localizadas com ao menos um vínculo iniciado até a competência e não encerrado na competência', 'empresa'],
  ['withoutRt', 'Empresas sem RTS vigente identificado', 'Empresas localizadas − empresas localizadas com vínculo técnico vigente', 'empresa', 'Ausência de vínculo identificado exige confirmação cadastral e análise técnica; não caracteriza automaticamente infração.'],
  ['multiRt', 'Empresas com múltiplos RTS', 'COUNT(Empresa.id com mais de um vínculo técnico vigente)', 'empresa'],
  ['activeLinks', 'Vínculos técnicos ativos', 'COUNT(Vínculo.id WHERE início ≤ competência AND (fim ausente OR fim > competência))', 'vínculo técnico'],
  ['distinctProfessionals', 'Profissionais distintos vinculados', 'DISTINCTCOUNT(Vínculo.profissionalId nos vínculos vigentes)', 'profissional', 'Um profissional pode aparecer em vários vínculos; não somar por empresa como total de pessoas.'],
  ['newLinks', 'Novos vínculos técnicos', 'COUNT(Vínculo.id WHERE início no período)', 'vínculo técnico'],
  ['closedLinks', 'Encerramentos de vínculos', 'COUNT(Vínculo.id WHERE fim no período)', 'vínculo técnico'],
  ['rtChanges', 'Trocas identificadas no período', 'COUNT(Vínculo iniciado no período com vínculo anterior da mesma empresa, de profissional distinto, encerrado estritamente antes do início)', 'vínculo iniciado', 'Sinal histórico derivado da sequência de vínculos. Não comprova substituição formal de RTS nem estabelece continuidade entre modalidades.'],
  ['linkDaysMean', 'Tempo médio de vigência atual', 'AVERAGE(competência − início) dos vínculos vigentes', 'dias corridos'],
  ['arts', 'ARTs registradas no período', 'COUNT(ART.id WHERE data no período)', 'ART', 'ART e CAO são entidades distintas; valor de ART não representa receita do CREA-SP.'],
  ['artValue', 'Valor declarado em ARTs', 'SUM(ART.valor WHERE data no período)', 'R$', 'Valores demonstrativos do objeto da ART; não confundir com arrecadação.'],
];
const cao: Entry[] = [
  ['caoRequested', 'CAOs solicitadas', 'COUNT(CAO.id WHERE data de solicitação no período)', 'CAO solicitada'],
  ['caoIssued', 'CAOs emitidas', 'COUNT(CAO.id WHERE data de emissão no período), incluindo emissões posteriormente revogadas', 'evento de emissão de CAO', 'Fluxo histórico de emissão preservado mesmo após revogação; não equivale ao estoque de certidões válidas.'],
  ['caoRevoked', 'CAOs com status revogado', 'COUNT(CAO.id WHERE status atual = Revogada)', 'CAO', 'Estoque de revogações na competência; não remove o evento histórico de emissão.'],
  ['caoIssuedRevoked', 'Emissões do período hoje revogadas', 'COUNT(CAO.id WHERE emissão no período AND status atual = Revogada)', 'evento de emissão de CAO', 'Subconjunto das emissões na janela, diferente do estoque total de revogações na competência.'],
  ['caoAnalysis', 'CAOs em análise', 'COUNT(CAO.id WHERE status atual = Em análise)', 'CAO', 'Estoque de processos na competência; independe do período de emissão.'],
  ['caoPending', 'CAOs pendentes', 'COUNT(CAO.id WHERE status atual IN (Solicitada, Pendente))', 'CAO'],
  ['caoDaysMean', 'Tempo médio de emissão de CAO', 'AVERAGE(emissão − solicitação) das CAOs emitidas no período', 'dias corridos'],
  ['caoDaysMedian', 'Tempo mediano de emissão de CAO', 'MEDIAN(emissão − solicitação) das CAOs emitidas no período', 'dias corridos'],
  ['caoCompanies', 'Empresas com CAO emitida', 'DISTINCTCOUNT(CAO.empresaId WHERE emissão no período)', 'empresa', 'Inclui o histórico de emissões revogadas; consultar a situação atual da certidão.'],
  ['artReferences', 'ARTs relacionadas às CAOs', 'DISTINCTCOUNT(ART.id na ponte CAO_ART para CAOs emitidas no período)', 'ART', 'Uma ART pode relacionar-se a mais de uma CAO; contagem distinta impede duplicidade.'],
];
const financial: Entry[] = [
  ['financeUniverse', 'Empresas com obrigações financeiras', 'DISTINCTCOUNT(Fatura.empresaId com registro CREA e vencimento ≤ competência)', 'empresa', 'Denominador explícito da taxa de adimplência; empresas sem obrigações vencidas até a competência ficam fora deste indicador.'],
  ['compliantCompanies', 'Empresas adimplentes', 'Universo financeiro − empresas com qualquer saldo vencido positivo', 'empresa', 'Agrega obrigações de todos os registros da empresa selecionada.'],
  ['delinquentCompanies', 'Empresas inadimplentes', 'DISTINCTCOUNT(Fatura.empresaId com registro CREA, vencimento < competência e saldo > 0)', 'empresa', 'Adimplência pertence à empresa, não a uma linha de registro ou estabelecimento.'],
  ['compliance', 'Taxa de adimplência', '100 × empresas adimplentes / empresas com obrigações vencidas até a competência', '%', 'Não usa o universo externo como denominador; resultado vazio é apresentado sem inferir adimplência universal.'],
  ['openAmount', 'Valor total em aberto', 'SUM(MAX(valor − valor pago até a competência, 0))', 'R$', 'Snapshot de todas as obrigações das empresas filtradas, incluindo valores ainda não vencidos.'],
  ['overdueAmount', 'Valor vencido', 'SUM(saldo positivo WHERE vencimento < competência AND empresa possui registro)', 'R$', 'Snapshot na competência, não fluxo de vencimentos exclusivamente do período selecionado.'],
  ['recoveredAmount', 'Valor recuperado no período', 'SUM(valor pago WHERE recuperado = true AND data do pagamento no período)', 'R$', 'Recuperação demonstrativa identifica pagamento de débito previamente vencido.'],
  ['installments', 'Empresas com parcelamento em aberto', 'DISTINCTCOUNT(Fatura.empresaId WHERE parcelamento = true AND saldo > 0)', 'empresa'],
  ['delayDaysMean', 'Tempo médio de atraso', 'AVERAGE(competência − vencimento) das obrigações com saldo vencido positivo', 'dias corridos', 'Média por obrigação, sem ponderação monetária.'],
];
const inspection: Entry[] = [
  ['caseCount', 'Casos na fila de triagem e análise', 'COUNT(Caso.id WHERE status atual diferente de Concluída)', 'caso', 'Estoque de casos abertos; uma empresa pode ter vários casos.'],
  ['highPriorityCases', 'Casos com prioridade elevada', 'COUNT(Caso.id aberto WHERE pontuação demonstrativa ≥ 65)', 'caso', 'Pontuação de priorização, não probabilidade de infração; fatores e histórico são acessíveis.'],
  ['forwardedCases', 'Casos encaminhados', 'COUNT(Caso.id WHERE status atual = Encaminhada)', 'caso'],
  ['completedCases', 'Casos concluídos no período', 'COUNT(Caso.id WHERE status = Concluída AND conclusão no período)', 'caso'],
  ['caseDaysMean', 'Tempo médio de análise', 'AVERAGE(conclusão − identificação) dos casos concluídos no período', 'dias corridos'],
  ['priority', 'Prioridade de verificação', 'CLAMP(20 CNAE + 25 ausência CREA + 8/15 porte + 8 abertura recente + 18 contrato técnico + até 12 divergências − 10 conclusão anterior, 0, 100)', 'pontos de 0 a 100', 'Regras demonstrativas v1.0, sem modelo treinado. Não determina irregularidade nem obriga autuação.'],
];
const employment: Entry[] = [
  ['employees', 'Estoque de empregos formais', 'SUM(Emprego.estoque) no último mês disponível do universo territorial e CNAE selecionado', 'vínculo formal agregado', 'Dados agregados por município × CNAE × CBO × mês; nunca relacionados diretamente a um CNPJ ou profissional do CREA.'],
  ['technicalEmployees', 'Empregos em ocupações técnicas', 'SUM(Emprego.estoque WHERE CBO.técnica = true) no último mês disponível', 'vínculo formal agregado', 'Ocupação declarada não comprova formação, atribuição ou registro profissional.'],
  ['admissions', 'Admissões no período', 'SUM(Emprego.admissões) nos meses selecionados', 'admissão agregada', 'Fluxo, não estoque de profissionais.'],
  ['dismissals', 'Desligamentos no período', 'SUM(Emprego.desligamentos) nos meses selecionados', 'desligamento agregado'],
  ['employmentBalance', 'Saldo de empregos formais', 'SUM(admissões) − SUM(desligamentos) no período', 'vínculo formal agregado', 'Compara períodos com igual número de meses; filtros empresariais não se aplicam a esta fonte agregada.'],
];
const contracts: Entry[] = [
  ['contractSuppliers', 'Fornecedores distintos', 'DISTINCTCOUNT(Contratação.empresaId WHERE data no período)', 'empresa fornecedora', 'Conta cada fornecedor uma vez no período; não equivale ao número de contratos.'],
  ['contractCount', 'Contratações identificadas', 'COUNT(Contratação.id WHERE data no período)', 'contratação', 'Cobertura limitada às bases e instrumentos publicados.'],
  ['contractValue', 'Valor agregado contratado', 'SUM(Contratação.valor WHERE data no período)', 'R$', 'Valor contratado não implica execução, faturamento ou receita efetivamente recebida.'],
  ['engineeringContracts', 'Objetos potencialmente técnicos', 'COUNT(Contratação.id com termo reconhecido pelo classificador demonstrativo)', 'contratação', 'Regras textuais sem modelo treinado; exige leitura do objeto completo e validação técnica.'],
  ['contractMissingCompanies', 'Fornecedores sem correspondência CREA', 'DISTINCTCOUNT(Contratação.empresaId sem registro empresarial localizado no escopo)', 'empresa', 'Ausência de correspondência não determina obrigação nem irregularidade.'],
  ['classification', 'Classificação de objetos contratuais', 'Dicionário textual: engenharia elétrica, civil, mecânica, ambiental/saneamento e serviços técnicos', 'categoria sugerida', 'Índice de confiança demonstra força da regra; não é probabilidade estatística calibrada nem conclusão jurídica.'],
];
const quality: Entry[] = [
  ['anomaly', 'Mudança incomum demonstrativa', 'z = (valor mensal − média dos 6 meses anteriores) / desvio-padrão populacional dos mesmos 6 meses; sinalizar |z| ≥ 2 com volume mínimo', 'desvios-padrão', 'Detecção estatística demonstrativa, sem modelo treinado, correção sazonal ou conclusão causal. Base constante não gera escore artificial; exige validação humana.'],
  ['qualityEvents', 'Eventos de qualidade abertos', 'COUNT(EventoQualidade.id WHERE resolvido = false)', 'evento', 'Um estabelecimento pode ter mais de um evento; não equivale a empresas com problemas.'],
  ['qualityScore', 'Índice de qualidade cadastral', '100 × (1 − estabelecimentos com ao menos um evento aberto / estabelecimentos filtrados)', '%', 'Índice analítico proposto, não métrica oficial do CREA-SP.'],
  ['exactMatch', 'Correspondência determinística', 'CNPJ completo de 14 dígitos igual e único entre as bases', 'estabelecimento', 'Duplicidade, raiz coincidente e semelhança textual são encaminhadas à revisão; nenhuma mesclagem automática.'],
  ['rootMatch', 'Correspondência por raiz', 'Primeiros 8 dígitos do CNPJ coincidem, sem igualdade do CNPJ completo', 'sugestão por empresa', 'Não confirma o estabelecimento, vínculo cadastral ou status ativo.'],
  ['fuzzyMatch', 'Sugestão de conciliação aproximada', 'Jaccard dos termos de razão social × 70 + município × 15 + CNAE × 15; similaridade ≥ 0,55 e índice ≥ 65', 'sugestão de revisão', 'Índice demonstrativo, sem probabilidade calibrada; não integra automaticamente registros.'],
];

const concepts: Record<string, string> = {
  companies: 'Pessoas jurídicas distintas identificadas pela raiz do CNPJ no universo interno e externo selecionado.',
  establishments: 'Unidades locais de pessoas jurídicas, distinguindo matriz e filiais pelo CNPJ completo.',
  registrations: 'Identificadores administrativos distintos de registro ou visto; uma pessoa jurídica pode possuir vários no histórico.',
  registeredCompanies: 'Pessoas jurídicas com ao menos um registro empresarial localizado no recorte, inclusive registros encerrados.',
  activeCompanies: 'Pessoas jurídicas com ao menos um registro ativo na data de corte e nos filtros selecionados.',
  inactiveCompanies: 'Empresas localizadas que não possuem registro ativo no recorte. Complementa a categoria de empresas ativas.',
  notMatched: 'Pessoas jurídicas do universo externo selecionado para as quais não foi localizado registro no cadastro demonstrativo.',
  coverage: 'Proporção de empresas com correspondência cadastral dentro do universo econômico selecionado, sem concluir obrigação jurídica.',
  net: 'Variação líquida de registros ativos produzida pelos eventos cadastrais no intervalo, incluindo reativações e cancelamentos.',
  net30: 'Variação líquida de registros ativos no intervalo fixo de 30 dias que termina na competência.',
  withRt: 'Empresas localizadas com pelo menos um vínculo de responsabilidade técnica vigente na competência.',
  withoutRt: 'Empresas localizadas sem vínculo vigente identificado. Constitui um conjunto para confirmação na fonte interna.',
  multiRt: 'Empresas com mais de um vínculo técnico vigente, inclusive modalidades diferentes, sem presumir limite regulatório.',
  activeLinks: 'Relações vigentes entre empresa e profissional. Um profissional distinto pode participar de várias relações.',
  distinctProfessionals: 'Pessoas distintas que participam de vínculos técnicos vigentes no recorte.',
  caoIssued: 'Eventos de emissão de certidão do acervo operacional da pessoa jurídica ocorridos no período, preservados após eventual revogação.',
  caoRequested: 'Solicitações de certidão do acervo operacional iniciadas no período, independentemente da situação atual do processo.',
  caoRevoked: 'Certidões com situação atual revogada no estoque do recorte. A revogação não elimina sua emissão histórica.',
  artReferences: 'ARTs distintas relacionadas às certidões emitidas no intervalo; a ponte evita repetir uma ART em várias CAOs.',
  financeUniverse: 'Empresas cadastradas com pelo menos uma obrigação vencendo até a competência; denominador da adimplência.',
  compliantCompanies: 'Empresas elegíveis para a taxa financeira que não possuem saldo vencido positivo na competência.',
  delinquentCompanies: 'Empresas com alguma obrigação anterior ao corte ainda não integralmente liquidada, reunindo seus registros.',
  compliance: 'Participação de empresas sem saldo vencido entre as empresas elegíveis para análise financeira.',
  openAmount: 'Saldo residual das obrigações até o corte, incluindo vencimentos futuros e pagamentos já efetivados.',
  overdueAmount: 'Parcela do saldo residual cujo vencimento é anterior à competência, após deduzir pagamentos até o corte.',
  recoveredAmount: 'Pagamentos no período identificados no cenário como recuperação de débitos previamente vencidos.',
  priority: 'Pontuação explicável para ordenar verificações humanas, sem estimar probabilidade comprovada de infração.',
  employees: 'Estoque agregado de vínculos formais na última competência do recorte territorial, de atividade e de ocupação.',
  technicalEmployees: 'Parte do estoque agregado declarada em ocupações CBO técnicas; não identifica profissionais registrados no CREA.',
  admissions: 'Entradas de vínculos formais nos meses selecionados, agregadas por município, CNAE e ocupação.',
  dismissals: 'Saídas de vínculos formais nos meses selecionados, agregadas nas dimensões disponíveis.',
  employmentBalance: 'Diferença entre admissões e desligamentos que reconcilia a variação do estoque agregado no período.',
  contractValue: 'Soma dos valores publicados dos contratos selecionados; não representa pagamento ou execução financeira.',
  classification: 'Categoria sugerida pelo reconhecimento determinístico de termos nos objetos contratuais, com justificativa para revisão.',
  anomaly: 'Desvio de uma observação mensal em relação à média e dispersão dos seis meses anteriores, sujeito à validação humana.',
  qualityScore: 'Proporção de estabelecimentos sem evento de qualidade pendente; um índice analítico demonstrativo.',
  exactMatch: 'Correspondência única por CNPJ completo entre a linha de origem e o cadastro mestre.',
  rootMatch: 'Coincidência da raiz do CNPJ sem confirmação do estabelecimento; resultado encaminhado à revisão.',
  fuzzyMatch: 'Sugestão de correspondência baseada em nome normalizado, município e atividade, sem mesclagem automática.',
};
const stockIds = new Set(['companies','establishments','registrations','activeRegistrations','inactiveRegistrations','cancelledRegistrations','registeredCompanies','activeCompanies','inactiveCompanies','notMatched','coverage','tenureMonths','multiEstablishmentCompanies','reactivatedCompanies','externalCompanies','withRt','withoutRt','multiRt','activeLinks','distinctProfessionals','linkDaysMean','caoRevoked','caoAnalysis','caoPending','financeUniverse','compliantCompanies','delinquentCompanies','compliance','openAmount','overdueAmount','installments','delayDaysMean','caseCount','highPriorityCases','forwardedCases','employees','technicalEmployees','qualityEvents','qualityScore']);
const ruleIds = new Set(['priority','classification','anomaly','exactMatch','rootMatch','fuzzyMatch']);
const make = (entries: Entry[], source: string, owner: string, _snapshot = false): IndicatorDefinition[] => entries.map(([id, name, formula, unit = 'empresa', limitations = 'Base fictícia relacional com semente fixa. Regras analíticas propostas, sujeitas à validação institucional.']) => ({ id, name,
  concept: concepts[id] ?? `Mede ${name.toLocaleLowerCase('pt-BR')} no conjunto selecionado, usando ${unit} como unidade de análise.`,
  formula, unit, source,
  periodicity: ruleIds.has(id) ? 'Recalculada a cada recorte; regra versionada 1.0.0' : stockIds.has(id) ? 'Estoque na competência; atualização proposta mensal' : ['new30','closed30','net30'].includes(id) ? 'Janela fixa de 30 dias até a competência' : 'Fluxo no período selecionado; agregação mensal, trimestral ou anual',
  limitations: `${limitations} Dados demonstrativos; não utilizar para decisões reais.`, owner: `${owner} · área funcional sugerida; validação a designar pelo CREA-SP` }));

export const indicators: IndicatorDefinition[] = [
  ...professionalIndicators,
  ...make(registry, 'Cadastro CREA-SP + CNPJ/Receita Federal (integrações propostas)', 'Gestão do cadastro empresarial; apoio BI: EDAD/SUPTEC', true),
  ...make(technical, 'Cadastro CREA-SP + vínculos de RTS + ART (dados internos propostos)', 'CREA-SP · unidade responsável por registros, vínculos e ART'),
  ...make(cao, 'Processos de CAO + ART + cadastro empresarial (dados internos propostos)', 'GPP/EAPA · acervo operacional'),
  ...make(financial, 'Obrigações e pagamentos empresariais (dados internos propostos)', 'CREA-SP · unidade financeira e recuperação de crédito', true),
  ...make(inspection, 'Triagem e histórico de fiscalização (dados internos propostos)', 'SUPFIS e GREs · fiscalização e validação técnica', true),
  ...make(employment, 'RAIS + Novo CAGED + CBO (agregações públicas propostas)', 'CREA-SP · planejamento e análise econômica'),
  ...make(contracts, 'PNCP e outras bases públicas de contratações (integrações propostas)', 'CREA-SP · planejamento e fiscalização; validação de objetos técnicos'),
  ...make(quality, 'Conciliação de cadastro CREA-SP com CNPJ/Receita Federal', 'CREA-SP · governança e qualidade dos dados', true),
];
export const indicatorById = new Map(indicators.map(indicator => [indicator.id, indicator]));
export const ruleVersion = '1.0.0';
export function definitionFor(id: string): IndicatorDefinition | undefined { return indicatorById.get(id); }
