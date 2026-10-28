import { reportIndicators as historicalDefinitions } from './public-indicators';
import type { ReportIndicatorDefinition } from './public-indicators';
import { decisionIndicators, transparencyIndicators } from './decision-indicators-v8';

/** Historical web/PDF snapshots are provenance archives, never active measures. */
export const excludedIndicatorIds = new Set([
  'publicProfessionalsSp', 'publicGraduates', 'pncpPublicCount', 'pncpPublicValue',
  'publishedFormationRegistration', 'publishedSalary', 'publicSummary',
  'priority', 'highPriorityCases', 'forwardedCases', 'completedCases', 'caseDaysMean',
  'caseCount', 'caseCompanies', 'caseCompleted', 'newCases',
]);
const definition = (id: string, name: string, concept: string, formula: string, unit: string, limitations: string): ReportIndicatorDefinition => ({
  id, name, concept, formula, unit, limitations,
  source: 'Cadastro profissional/contratos relacional demonstrativo; produção prevista por views SQL Server ou Db2 via gateway, conforme sistema de origem.',
  competence: '30/09/2026 · cenário demonstrativo; formação usa o ano de conclusão declarado, não a janela de ARTs.',
  periodicity: 'Atualização de produção proposta diária pelo gateway; nenhuma conexão institucional ativa no protótipo.',
  owner: 'CREA-SP · área responsável pela entidade de origem e governança do dado; homologação a designar.',
  ruleVersion: 'report-v7-1.0',
});
const currentDefinitions = [
  definition('registeredGraduates', 'Diplomados com graduação declarada no cadastro', 'Pessoas distintas do cadastro selecionado com ao menos uma graduação declarada.', 'DISTINCTCOUNT(Educacao.professionalId WHERE level = Graduação AND professionalId no recorte profissional).', 'profissional com graduação declarada', 'Não estima todos os diplomados paulistas nem inclui pessoas ausentes do cadastro. Domicílio profissional difere do município de oferta do curso. Dado demonstrativo; não deriva de transcrição INEP.'),
  definition('registeredDegreeEvents', 'Graduações declaradas por ano de conclusão', 'Eventos de graduação registrados para os profissionais selecionados, pelo ano declarado de conclusão.', 'COUNT(Educacao.id WHERE level = Graduação), agrupado por completedYear; exibir pessoas distintas separadamente.', 'conclusão de curso declarada', 'Uma pessoa pode ter múltiplas formações. Formação externa agregada não é ligada nominalmente à pessoa. O cenário não mede estoque completo de diplomas SP.'),
  definition('registeredFormationLag', 'Intervalo entre graduação declarada e primeiro registro', 'Diferença em anos-calendário entre a primeira graduação declarada e o primeiro registro cadastral da mesma pessoa.', 'YEAR(registeredAt) − MIN(completedYear WHERE level = Graduação), por professionalId, em faixas sem somar intervalos.', 'ano-calendário aproximado', 'Apenas pessoas com os dois fatos. Anos não medem duração exata em dias; não é conversão dos egressos estaduais nem indicador de desemprego.'),
  definition('contractSuppliers', 'Fornecedores distintos no período', 'Empresas distintas relacionadas aos contratos selecionados.', 'DISTINCTCOUNT(Contrato.companyId), no recorte temporal e territorial demonstrativo.', 'empresa fornecedora', 'Na produção, preservar o identificador original do fornecedor e conciliar com CNPJ completo/raiz antes da associação ao cadastro. Pessoa física ou fornecedor estrangeiro não deve ser forçado a CNPJ fictício.'),
];
const activeLegacy = historicalDefinitions.filter(row => !excludedIndicatorIds.has(row.id) && !row.id.startsWith('creasp-2025-'));
const overrides = new Map(currentDefinitions.map(row => [row.id, row]));
export const reportIndicators: ReportIndicatorDefinition[] = [
  ...activeLegacy.map(row => overrides.get(row.id) ?? row),
  ...currentDefinitions.filter(row => !activeLegacy.some(existing => existing.id === row.id)),
  ...decisionIndicators, ...transparencyIndicators,
];
