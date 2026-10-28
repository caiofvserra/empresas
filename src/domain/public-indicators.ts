import { indicators } from './indicators';
import type { IndicatorDefinition } from './types';

export interface ReportIndicatorDefinition extends IndicatorDefinition {
  competence: string;
  ruleVersion: string;
}

const internalCompetence = '30/09/2026: estoques na competência; fluxos na janela de análise selecionada.';
const professionalOwner = 'CREA-SP · gestão do cadastro profissional e planejamento; área funcional sugerida, validação a designar';
const contractOwner = 'CREA-SP · análise de contratações e governança dos dados; área funcional sugerida, validação a designar';
const inspectionOwner = 'SUPFIS e GREs · fiscalização e validação técnica; área funcional sugerida, validação a designar';

/** V5 definitions describe the displayed measure, including source and filter grain. */
export const reportSpecificIndicators: ReportIndicatorDefinition[] = [
  {
    id: 'publicProfessionalsSp', name: 'Profissionais ativos · CREA-SP',
    concept: 'Estoque de profissionais ativos do recorte CREA-SP, identificado pela UF = SP no agregado público do Confea SIC reproduzido pelo projeto do usuário. Abrange todas as profissões do Sistema Confea/Crea.',
    formula: 'Profissionais ativos da linha UF = SP em user-engineer-statistics.registrations; não somar títulos profissionais nem registros históricos.',
    unit: 'profissional ativo no agregado de origem',
    source: 'Confea SIC — recorte CREA-SP/UF = SP, conforme agregado publicado em caiofvserra.github.io/engineer-statistics/ — confea-uf.json e confea-situacao-uf.json',
    periodicity: 'Snapshot público fixo; nova atualização depende de coleta e validação da fonte.',
    competence: 'Agosto/2026 · coleta do projeto de origem em 30/08/2026; reprodução em 10/10/2026.',
    limitations: '346.824 ativos no recorte publicado. Não é um total exclusivo de engenheiros nem de vínculos RT. Os rótulos de confiança pertencem ao projeto de origem: não houve nova auditoria primária do SIC. O agregado estadual não responde a filtros de município, GRE, CNAE, empresa fictícia ou período do cenário interno.',
    owner: professionalOwner, ruleVersion: 'public-indicators-1.0',
  },
  {
    id: 'publicGraduates', name: 'Concluintes / diplomados — presencial, São Paulo',
    concept: 'Conclusões anuais de cursos presenciais de Engenharias e Agronomia no estado ou nos municípios de oferta selecionados. “Diplomados” é uma leitura analítica da conclusão de curso, sem cadastro nominal de diplomas.',
    formula: 'SUM(QT_CONC), UF = SP, TP_MODALIDADE_ENSINO = 1, rótulos CINE selecionados; no KPI, ano = 2024 e filtro municipal pelo código IBGE do local de oferta.',
    unit: 'conclusão de curso por ano',
    source: 'Censo da Educação Superior/INEP — reprodução pública do Observatório Nacional da Educação Superior, commit 188e182414c460737f13ca3bc019eeeaf14589df',
    periodicity: 'Anual; série estadual 2019–2024, detalhamento municipal de 2024.',
    competence: 'Ano letivo de 2024; extração desta reprodução em 10/10/2026.',
    limitations: '19.859 conclusões em SP em 2024. Não são pessoas distintas, novas inscrições CREA ou uma mesma coorte de ingressantes. Somente presencial; município de oferta, não domicílio do concluinte. Filtros de GRE, CNAE, porte, empresa e período demonstrativo não são atribuídos a este agregado. Matrículas tiveram 240 comparações exatas com fonte oficial SEADE/INEP; concluintes foram conciliados internamente, sem nova verificação direta do arquivo governamental, que retornou HTTP 503. Seleção de CINE não determina obrigação ou atribuição profissional.',
    owner: professionalOwner, ruleVersion: 'educacao-inep-reproducao-auditada-v1',
  },
  {
    id: 'pncpPublicCount', name: 'Contratos PNCP observados — publicação de 01/09/2025',
    concept: 'Quantidade de contratos distintos publicados em um único dia no PNCP, em unidades contratantes de SP e nas categorias Obras, Serviços e Serviços de Engenharia.',
    formula: 'SUM(contractCount) nas células município do órgão × categoria; origem deduplicada pela chave do contrato PNCP, publicação = 01/09/2025, UF = SP, categorias 7, 8 e 9.',
    unit: 'contrato publicado', source: 'PNCP — API pública oficial /api/consulta/v1/contratos; 13 páginas completas consultadas em 10/10/2026.',
    periodicity: 'Recorte observado de um dia de publicações; sem série temporal real.',
    competence: 'Publicação de 01/09/2025; extração em 10/10/2026.',
    limitations: '341 contratos no universo antes do filtro municipal. A geografia é a unidade do órgão contratante, não fornecedor nem obra. Categoria Serviços não comprova atividade de engenharia. Não representa estoque vigente ou tendência mensal. Agregados reais não se ligam a CNPJs fictícios nem respondem a filtros de CNAE, porte, GRE ou período interno. Não houve confirmação cadastral CREA, autoria ART, vínculo RT ou obrigação de registro.',
    owner: contractOwner, ruleVersion: 'pncp-public-aggregate-1.0',
  },
  {
    id: 'pncpPublicValue', name: 'Valor PNCP observado — publicação de 01/09/2025',
    concept: 'Valor contratual agregado dos contratos do recorte público observado, preservando a regra de valor da API.',
    formula: 'SUM(contractValue) nas células município do órgão × categoria; por contrato, valorGlobal, ou valorInicial quando valorGlobal estiver ausente. Valor ausente permanece ausente.',
    unit: 'R$ de valor contratual', source: 'PNCP — API pública oficial /api/consulta/v1/contratos; agregado territorial e categórico observado.',
    periodicity: 'Recorte observado de um dia de publicações; sem inferência de execução financeira.',
    competence: 'Publicação de 01/09/2025; extração em 10/10/2026.',
    limitations: 'R$ 103.211.057,28 no universo antes do filtro municipal; nenhuma linha selecionada estava sem valor. Contratação não equivale a execução, faturamento ou pagamento. Mesmas limitações territoriais e cadastrais da quantidade PNCP; não somar aos contratos do cenário interno fictício.',
    owner: contractOwner, ruleVersion: 'pncp-public-aggregate-1.0',
  },
  {
    id: 'caseCount', name: 'Casos no histórico de fiscalização',
    concept: 'Todos os casos históricos disponíveis no recorte até a competência, incluindo abertos, encaminhados e concluídos.',
    formula: 'COUNT(Caso.id) em Scope.cases, após os filtros de empresa, estabelecimento e território; não excluir casos concluídos.',
    unit: 'caso histórico', source: 'Histórico de fiscalização interno demonstrativo', periodicity: 'Estoque histórico no corte de análise.',
    competence: internalCompetence,
    limitations: 'Uma empresa pode ter vários casos; este total não é uma fila de tarefas nem uma quantidade de empresas. Eventos, pontuações e resultados são fictícios, sem conclusão automática de infração.',
    owner: inspectionOwner, ruleVersion: 'report-v5-1.0',
  },
  {
    id: 'caseCompanies', name: 'Empresas presentes no histórico de análises',
    concept: 'Empresas distintas associadas aos casos históricos disponíveis no recorte.',
    formula: 'DISTINCTCOUNT(Caso.empresaId) em Scope.cases.',
    unit: 'empresa (raiz do CNPJ)', source: 'Histórico de fiscalização interno demonstrativo', periodicity: 'Estoque histórico no corte de análise.',
    competence: internalCompetence,
    limitations: 'Conta a empresa uma vez mesmo quando possui múltiplos casos. Inclui análises ainda abertas, sem afirmar conclusão técnica, autuação ou irregularidade. Dados demonstrativos.',
    owner: inspectionOwner, ruleVersion: 'report-v5-1.0',
  },
  {
    id: 'caseCompleted', name: 'Casos com situação concluída',
    concept: 'Casos históricos cuja situação no corte demonstrativo é Concluída.',
    formula: 'COUNT(Caso.id WHERE status atual = Concluída) em Scope.cases.',
    unit: 'caso concluído', source: 'Histórico de fiscalização interno demonstrativo', periodicity: 'Estoque de casos concluídos na competência.',
    competence: internalCompetence,
    limitations: 'Diferente do fluxo de conclusões ocorrido exclusivamente na janela selecionada. Conclusão do caso não demonstra infração, penalidade ou trânsito em julgado. Dados demonstrativos.',
    owner: inspectionOwner, ruleVersion: 'report-v5-1.0',
  },
  {
    id: 'newCases', name: 'Novos casos no período',
    concept: 'Casos cujo evento de criação pertence à janela de análise selecionada.',
    formula: 'COUNT(Caso.id WHERE createdAt no período selecionado), após os filtros do escopo.',
    unit: 'evento de criação de caso', source: 'Histórico de fiscalização interno demonstrativo', periodicity: 'Fluxo na janela; agregação mensal.',
    competence: internalCompetence,
    limitations: 'Um novo caso não é uma nova empresa nem uma autuação. As análises são históricas e somente leitura; dados fictícios.',
    owner: inspectionOwner, ruleVersion: 'report-v5-1.0',
  },
  {
    id: 'publishedFormationRegistration', name: 'Formação paulista e novos registros — CREA-SP',
    concept: 'Comparação estadual de dois fluxos anuais: conclusões de cursos presenciais de Engenharias e Agronomia ofertados em SP e novos registros CREA-SP de todas as profissões do Sistema. As populações são diferentes e não identificam as mesmas pessoas.',
    formula: 'Exibir graduates de external-education.annual (SP, presencial, Engenharias e Agronomia) e registrations de user-engineer-statistics.annualRegistrations WHERE UF = SP para o mesmo ano observado. Interseção disponível: 2019, 2020, 2021 e 2022. Excluir 2023/2024 da comparação porque os registros SP não foram disponibilizados; ausência não é zero.',
    unit: 'conclusão de curso / novo registro, em séries separadas',
    source: 'INEP — reprodução pública da formação presencial em SP, external-education.json; Confea SIC — novos registros CREA-SP publicados no projeto engineer-statistics do usuário, annualRegistrations com UF = SP.',
    periodicity: 'Anual; quatro pares observados, de 2019 a 2022. Série de formação SP disponível até 2024; série de registros CREA-SP publicada termina em 2022.',
    competence: 'Anos de 2019–2022 · formação e registro no mesmo ano de calendário, sem pressupor coorte comum; reprodução em 10/10/2026.',
    limitations: 'Cursos ofertados em SP não equivalem ao domicílio dos concluintes. Registro CREA-SP pode decorrer de formação em outro estado ou ano e inclui outras profissões. Não calcular taxa de registro de egressos, diferença como “diplomados sem registro”, retenção ou conversão nominal. São reproduções de fontes identificadas, sem nova auditoria primária do SIC; a conferência independente oficial da formação cobre matrículas, não concluintes. O visual comparativo permanece estadual: município, GRE, CNAE, porte, empresa e período interno não restringem esses quatro pares. Dados nacionais permanecem referências externas separadas, não substituem os pares paulistas.',
    owner: professionalOwner, ruleVersion: 'formation-registration-sp-1.0',
  },
  {
    id: 'publishedSalary', name: 'Remuneração média publicada por ocupação CBO',
    concept: 'Média remuneratória das movimentações CLT observadas na ocupação e na janela indicada pelo projeto público de origem.',
    formula: 'Exibir averageMonthlySalary por CBO, junto a weeklyHours, movements e competência; não somar médias nem interpretar como salário individual.',
    unit: 'R$ por mês, média de movimentações CLT',
    source: 'Projeto engineer-statistics do usuário; tabulações atribuídas ao Portal Salário/Novo CAGED/MTE.',
    periodicity: 'Janela móvel de 12 meses conforme referência de cada observação.',
    competence: '12 meses de referência em agosto/2026; reprodução em 10/10/2026.',
    limitations: 'Reprodução secundária sem nova auditoria dos microdados do MTE. Média de admissões/desligamentos, não do estoque de trabalhadores; ocupação declarada não confirma registro, formação ou atribuição profissional. O recorte é nacional e não muda com município, GRE, CNPJ fictício ou período interno.',
    owner: professionalOwner, ruleVersion: 'user-engineer-statistics-1.0',
  },
];

const reportOverrides = new Map(reportSpecificIndicators.map(indicator => [indicator.id, indicator]));
export const reportIndicators: ReportIndicatorDefinition[] = [
  ...indicators.map(indicator => reportOverrides.get(indicator.id) ?? {
    ...indicator,
    competence: internalCompetence,
    ruleVersion: 'regras-demo-1.0 · apresentação V5',
  }),
  ...reportSpecificIndicators.filter(indicator => !indicators.some(existing => existing.id === indicator.id)),
];
