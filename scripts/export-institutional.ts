import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { dataset } from '../src/domain/dataset';
import { buildInstitutionalModel } from '../src/domain/institutional';
import type { InstitutionalModel } from '../src/domain/institutional';

export function institutionalCsvCell(value: unknown): string {
  const raw = value === undefined || value === null ? '' : String(value);
  // Preserve numeric negatives; protect text entered into spreadsheet cells.
  const safe = typeof value === 'string' && /^[\s]*[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function institutionalExportTables(model: InstitutionalModel) {
  return [
    { name: 'programas', rows: model.programs, grain: 'Um programa demonstrativo', primaryKey: 'id' },
    { name: 'atividades', rows: model.activities, grain: 'Uma atividade em um local/data', primaryKey: 'id' },
    { name: 'participacoes', rows: model.participation, grain: 'Uma inscrição em uma atividade; professionalId pode estar ausente', primaryKey: 'id' },
    { name: 'orcamento', rows: model.budgetEntries, grain: 'Programa × município × mês; plano e executado não se somam como despesa', primaryKey: 'id' },
    { name: 'unidades_cowork', rows: model.coworkUnits, grain: 'Uma unidade demonstrativa', primaryKey: 'id' },
    { name: 'capacidade_cowork', rows: model.coworkMonths, grain: 'Unidade × mês; horas de posição de trabalho disponíveis', primaryKey: 'id' },
    { name: 'uso_cowork', rows: model.coworkUsage, grain: 'Unidade-mês × profissional; horas observadas de uso', primaryKey: 'id' },
    { name: 'acompanhamento', rows: model.followups, grain: 'Atividade × profissional com presença identificada; maturação de 90 dias', primaryKey: 'id' },
    { name: 'solicitacoes_servico', rows: model.serviceRequests, grain: 'Uma solicitação de cadastro/orientação; uma identidade empresarial OU profissional', primaryKey: 'id' },
  ];
}

export function exportInstitutional(output: string, model = buildInstitutionalModel(dataset)) {
  mkdirSync(output, { recursive: true });
  const tables = institutionalExportTables(model).map(table => {
    const rows = table.rows as unknown as Record<string, unknown>[];
    const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
    const contents = '\uFEFF' + [columns.map(institutionalCsvCell).join(';'),
      ...rows.map(row => columns.map(column => institutionalCsvCell(row[column])).join(';'))].join('\r\n') + '\r\n';
    const file = `${table.name}.csv`;
    writeFileSync(resolve(output, file), contents, 'utf8');
    return { file, rows: rows.length, columns, grain: table.grain, primaryKey: table.primaryKey,
      sha256: createHash('sha256').update(contents).digest('hex') };
  });
  const manifest = { ...model.metadata, applicationVersion: '6.0.0', delimiter: ';', encoding: 'UTF-8 BOM',
    dateFormat: 'ISO 8601', decimalCulture: 'en-US', budgetValues: 'Centavos inteiros; dividir por 100 apenas nas medidas de BRL.',
    relatedDimensions: ['data-demo/municipios.csv', 'data-demo/gres.csv', 'data-demo/profissionais.csv', 'data-demo/empresas.csv'], tables };
  writeFileSync(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  writeFileSync(resolve(output, 'README.md'), `# Resultados institucionais — base demonstrativa CREA-SP\n\nTodas as nove tabelas são fictícias, reproduzíveis com semente ${model.metadata.seedLabel}; não representam a gestão atual, seus beneficiários ou seus gastos. Referência: ${model.metadata.snapshotDate}.\n\nCSV UTF-8 com BOM, separador ponto e vírgula e datas ISO. Importar IDs como texto; manter centavos inteiros nas colunas orçamentárias e dividir por 100 nas medidas em reais. Plano e execução são grandezas diferentes.\n\nUse municípios, GREs, profissionais e empresas de \`data-demo\` como dimensões compartilhadas. Município institucional representa local de oferta; domicílio profissional é outra dimensão. Participação sem professionalId deve permanecer sem identidade; não criar beneficiário único fictício.\n\nOrçamento tem grão programa × município × mês, e capacidade tem grão unidade × mês. Não repartir esses fatos por pessoa ao fazer drillthrough. Atividade/participação e capacidade/uso exigem relacionamentos separados para evitar duplicar despesas.\n\nAcompanhamento após 90 dias mede resposta autodeclarada: os não respondentes não têm resultado imputado; aplicação relatada não prova efeito causal ou colocação no mercado. A meta de atendimento de 14 dias é um cenário demonstrativo, não um prazo normativo do CREA-SP.\n\nAs contagens, grãos e hashes SHA-256 de cada CSV estão em manifest.json. Reproduzir: \`node --import tsx scripts/export-institutional.ts\`.\n`, 'utf8');
  return { output, tables: tables.length, rows: tables.reduce((total, table) => total + table.rows, 0), synthetic: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(JSON.stringify(exportInstitutional(resolve(process.argv[2] ?? 'data-institucional'))));
}
