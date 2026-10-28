import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import education from '../src/domain/external-education.json';
import pncp from '../src/domain/pncp-public-aggregate.json';
import user from '../src/domain/user-engineer-statistics.json';
import management from '../src/domain/creasp-management-public.json';

type Row = Record<string, unknown>;
type TableDefinition = {
  name: string;
  rows: Row[];
  grain: string;
  keys: string[];
  reference: string;
  geography: string;
  measures: Record<string, string>;
  source: 'education' | 'pncp' | 'user' | 'management';
  limitations: string[];
};

// Numeric negatives are numbers, not spreadsheet formula text. Strings that
// begin with formula operators are escaped independently of CSV quoting.
export function publicCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Public CSV cannot export a non-finite number.');
    return `"${String(value)}"`;
  }
  const raw = String(value);
  const safe = /^[\s]*[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function exportPublicSources(outputDirectory = 'archives/data-publica-v6') {
  const output = resolve(outputDirectory);
  mkdirSync(output, { recursive: true });
  const sourceColumns = {
    uf: 'SP', modality: education.metadata.modality, modalityCode: education.metadata.modalityCode,
    sourceUrl: education.metadata.sourceUrl, sourceCommit: education.metadata.sourceCommit,
    extractedAt: education.metadata.extractedAt, scope: education.metadata.label,
  };
  const tables: TableDefinition[] = [
    {
      name: 'creasp_entregas_publicadas_2025', rows: management.facts.map(row => ({ ...row, sourceUrl: management.metadata.sourceUrl, sourceSha256: management.metadata.sourceSha256, sourceStatus: management.metadata.status })),
      grain: 'Indicador × exercício × UF; agregado publicado pelo CREA-SP, sem identidade nominal', keys: ['id', 'year', 'uf'],
      reference: 'Exercício 2025; leitura do sumário oficial em 11/10/2026', geography: 'Estado de São Paulo',
      measures: { value: 'valor transcrito: interpretar obrigatoriamente junto a valueKind', displayValue: 'precisão e limites publicados preservados', valueKind: 'exact, lowerBound, approximate ou reported; não é grau de auditoria' },
      source: 'management', limitations: management.metadata.limitations,
    },
    {
      name: 'educacao_sp_ano', rows: education.annual.map(row => ({ ...row, ...sourceColumns })),
      grain: 'UF × modalidade presencial × ano × recorte CINE declarado', keys: ['uf', 'modalityCode', 'year'],
      reference: '2019–2024, ano do Censo da Educação Superior', geography: education.metadata.geography,
      measures: { graduates: 'concluintes por curso/ano (fluxo)', entrants: 'ingressantes por curso/ano (fluxo)', enrolled: 'matrículas por curso/ano (estoque)', fieldCount: 'códigos CINE com observação no ano' },
      source: 'education', limitations: education.metadata.limitations,
    },
    {
      name: 'educacao_sp_cine_ano', rows: education.fieldAnnual.map(row => ({ ...row, ...sourceColumns })),
      grain: 'UF × modalidade presencial × código CINE × ano', keys: ['uf', 'modalityCode', 'code', 'year'],
      reference: '2019–2024; catálogo de campos observado na extração', geography: education.metadata.geography,
      measures: { graduates: 'concluintes por curso/ano (fluxo)', entrants: 'ingressantes por curso/ano (fluxo)', enrolled: 'matrículas por curso/ano (estoque)' },
      source: 'education', limitations: education.metadata.limitations,
    },
    {
      name: 'educacao_sp_municipio_cine_2024', rows: education.cityFields.map(row => ({ ...row, ...sourceColumns })),
      grain: 'Município IBGE da oferta presencial × código CINE × ano', keys: ['uf', 'modalityCode', 'ibgeCode', 'code', 'year'],
      reference: '2024; não é domicílio atual do diplomado', geography: education.metadata.geography,
      measures: { graduates: 'concluintes por curso/ano (fluxo)', entrants: 'ingressantes por curso/ano (fluxo)', enrolled: 'matrículas por curso/ano (estoque)' },
      source: 'education', limitations: education.metadata.limitations,
    },
    {
      name: 'pncp_sp_municipio_categoria', rows: pncp.rows.map(row => ({
        ...row, uf: 'SP', sourceUrl: pncp.metadata.source, extractedAt: pncp.metadata.extractedAt,
        dateRole: pncp.metadata.dateRole, geographyRole: pncp.metadata.geographyRole,
      })),
      grain: 'Data de publicação × município da unidade contratante × categoria publicada', keys: ['period', 'municipalityId', 'categoryId'],
      reference: `${pncp.metadata.periodStart} a ${pncp.metadata.periodEnd}; recorte de publicações, não contratos vigentes`,
      geography: pncp.metadata.geographyRole,
      measures: { contractCount: 'contratos distintos por célula', contractValue: 'valorGlobal, ou valorInicial quando ausente (R$)', contractsWithValue: 'contratos com valor disponível', supplierCountWithinCell: 'fornecedores distintos somente dentro da célula; não aditivo' },
      source: 'pncp', limitations: pncp.metadata.limitations,
    },
    {
      name: 'formacao_br_ano', rows: user.graduateAnnual,
      grain: 'Brasil × ano × recorte de formação', keys: ['uf', 'year', 'scope'],
      reference: '2010/2014/2018/2019/2022/2023 estrito; 2018/2024 CINE07 amplo; lacunas preservadas',
      geography: 'Brasil; não responde a município, GRE, CNPJ ou profissional individual',
      measures: { graduates: 'concluintes por ano (fluxo); engenharia estrita e CINE07 amplo são recortes distintos' },
      source: 'user', limitations: user.metadata.limitations,
    },
    {
      name: 'registros_profissionais_ano', rows: user.annualRegistrations,
      grain: 'Brasil ou CREA-SP × ano × universo de profissões do Sistema', keys: ['uf', 'year', 'scope'],
      reference: 'Brasil 1937–2026, 2026 parcial até 30/08/2026; CREA-SP 2010–2022',
      geography: 'Agregado nacional ou conselho estadual; não responde a dimensões abaixo da UF',
      measures: { registrations: 'novos registros no ano (fluxo), todas as profissões do Sistema; não coorte de egressos' },
      source: 'user', limitations: user.metadata.limitations,
    },
    {
      name: 'situacao_profissional_uf', rows: user.registrations,
      grain: 'UF ou total Brasil × situação em 30/08/2026', keys: ['uf', 'asOf', 'scope'],
      reference: 'SIC 30/08/2026; população estimada IBGE 2025 em competência própria',
      geography: '27 UFs + linha BR. Filtrar BR antes de somar as UFs; não somar a linha total com as estaduais.',
      measures: { professionals: 'profissionais ativos (estoque)', registeredTotal: 'registros históricos em todas as situações', interrupted: 'interrompidos', cancelled: 'cancelados', suspended: 'suspensos', other: 'outras situações', activeShare: 'ativos ÷ total ×100 (%)', population: 'população estimada por UF, referência2025' },
      source: 'user', limitations: [...user.metadata.limitations, 'A linha BR é total de controle, não uma 28ª UF; medidas de soma estadual devem excluí-la.'],
    },
    {
      name: 'salarios_cbo', rows: user.salaryOccupations,
      grain: 'Brasil × CBO × janela temporal do levantamento', keys: ['uf', 'cbo', 'period', 'scope'],
      reference: 'Janelas de 12 meses referenciadas em ago/2026; conforme a fonte de cada CBO',
      geography: 'Brasil; universo de movimentações CLT declaradas',
      measures: { averageMonthlySalary: 'média mensal em R$ da amostra de movimentações', weeklyHours: 'jornada semanal média publicada', movements: 'movimentações CLT no levantamento; não pessoas distintas' },
      source: 'user', limitations: user.metadata.limitations,
    },
    {
      name: 'emprego_saldo_cbo', rows: user.employmentBalances,
      grain: 'Brasil × CBO × janela temporal do levantamento', keys: ['uf', 'cbo', 'period', 'scope'],
      reference: 'Civil jul/2025–jun/2026; elétrica/produção 12 meses ref. ago/2026',
      geography: 'Brasil; três CBOs selecionadas, não todo o mercado de engenharia',
      measures: { balance: 'admissões menos desligamentos (fluxo de vínculos CLT); não estoque RAIS' },
      source: 'user', limitations: user.metadata.limitations,
    },
  ];

  const entries = tables.map(table => {
    const keys = new Set<string>();
    for (const row of table.rows) {
      const key = JSON.stringify(table.keys.map(column => row[column]));
      if (table.keys.some(column => row[column] == null)) throw new Error(`Missing key in ${table.name}: ${key}`);
      if (keys.has(key)) throw new Error(`Duplicate key in ${table.name}: ${key}`);
      keys.add(key);
    }
    const columns = [...new Set(table.rows.flatMap(row => Object.keys(row)))];
    const lines = [columns.map(publicCsvCell).join(';'), ...table.rows.map(row => columns.map(column => publicCsvCell(row[column])).join(';'))];
    const content = '\uFEFF' + lines.join('\r\n') + '\r\n';
    const filename = `${table.name}.csv`;
    writeFileSync(resolve(output, filename), content, 'utf8');
    return {
      name: table.name, file: filename, rows: table.rows.length, columns, grain: table.grain, keys: table.keys,
      reference: table.reference, geography: table.geography, measures: table.measures, source: table.source,
      limitations: table.limitations, sha256: createHash('sha256').update(content, 'utf8').digest('hex'),
    };
  });
  const manifest = {
    schemaVersion: 'public-sources-1.0', archiveOnly: true, activeReportSource: false, automaticRefresh: false, realPublicData: true, synthetic: false, seed: null,
    exportedAt: '2026-10-11', delimiter: ';', encoding: 'UTF-8 BOM', lineEndings: 'CRLF', numericCulture: 'en-US',
    formulaProtection: 'Formula-leading strings are prefixed with an apostrophe; numeric negative values retain their numeric type.',
    separation: 'Exports contain only public aggregates. No join or sum with the seeded demonstrative company/professional facts.',
    rows: entries.reduce((sum, table) => sum + table.rows, 0), tables: entries,
    provenance: { management: management.metadata, education: education.metadata, pncp: pncp.metadata, user: user.metadata },
  };
  writeFileSync(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  writeFileSync(resolve(output, 'README.md'), `# Arquivo histórico — fontes públicas agregadas\n\nExcluído dos indicadores e cargas atuais V7: snapshots sem rotina primária homologada. Preservado para rastreabilidade; não importar no modelo em produção.\n\n${entries.length} tabelas, ${manifest.rows} linhas de fatos públicos. Dados demonstrativos permanecem em data-demo e não são unidos a esta exportação.\n\nCSV: UTF-8 com BOM, delimitador ponto e vírgula, cabeçalho, CRLF. Números preservam decimal ponto; no Power Query aplique tipos numéricos com cultura en-US e mantenha códigos IBGE/CINE/CBO como texto. Leia manifest.json para chaves, grão, unidades, competências, origem, hashes e limitações.\n\nA tabela situacao_profissional_uf inclui 27 UFs e uma linha BR de controle: filtre BR antes de somar estados. A contagem supplierCountWithinCell do PNCP é distinta por célula e não pode ser somada como fornecedores distintos totais. Novos registros de 2026 são parciais. Concluintes, registros e estoque profissional têm recortes diferentes e não geram taxa de conversão de egressos.\n\nO município educacional identifica oferta presencial; o município PNCP identifica unidade contratante; nenhum dos dois identifica domicílio do profissional ou local da obra. Não há CPF/CNPJ/EmpresaID/ProfissionalID individuais nesta exportação.\n`, 'utf8');
  return { output, tables: entries.length, rows: manifest.rows, synthetic: false, seed: null };
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/export-public-sources.ts')) {
  console.log(JSON.stringify(exportPublicSources(process.argv[2])));
}
