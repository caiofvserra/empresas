import { integer, isoDate, nonempty, object, requestJson } from './http.ts';
import type { HttpOptions } from './http.ts';

export const PNCP_ENDPOINT = 'https://pncp.gov.br/api/consulta/v1/contratos';
export type PncpContract = {
  id: string; uf: 'SP'; municipalityId: string; municipalityName: string;
  categoryId: number; categoryName: string; publishedAt: string; updatedAt: string | null;
  supplierType: string | null; supplierIdentifier: string | null; supplierName: string | null;
  contractObject: string; contractValue: number | null; contractValueSource: 'valorGlobal' | 'valorInicial' | null;
};
export type PncpBatch = {
  schemaVersion: 'pncp-api-1.0'; sourceId: 'pncp'; status: 'observed'; fixture: false; uf: 'SP';
  endpoint: string; fetchedAt: string; periodStart: string; periodEnd: string;
  dateRole: string; geographyRole: string;
  pages: number; advertisedBrazilRows: number; downloadedBrazilRows: number; duplicateKeys: number;
  categoryIds: number[]; records: PncpContract[]; limitations: string[];
};
function nullableText(value: unknown): string | null { return value == null ? null : nonempty(value, 'optional text'); }

function valueOf(row: Record<string, unknown>): Pick<PncpContract, 'contractValue' | 'contractValueSource'> {
  const column = row.valorGlobal == null ? (row.valorInicial == null ? null : 'valorInicial') : 'valorGlobal';
  if (column === null) return { contractValue: null, contractValueSource: null };
  const value = row[column];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('Invalid PNCP contract value.');
  return { contractValue: value, contractValueSource: column };
}

function timestamp(value: unknown, field: string): string {
  const text = nonempty(value, field);
  // PNCP timestamps may be timezone-naive. Preserve, do not invent a zone.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(text) || Number.isNaN(Date.parse(text))) throw new Error(`Invalid PNCP ${field}.`);
  isoDate(text.slice(0, 10), field);
  return text;
}

/** All Brazil pages are reconciled before keeping the SP/categories partition. */
export async function fetchPncpBatch(options: HttpOptions & {
  periodStart: string; periodEnd: string; pageSize?: number; maxPages?: number;
  categoryIds?: number[]; now?: () => Date;
}): Promise<PncpBatch> {
  const start = isoDate(options.periodStart, 'periodStart');
  const end = isoDate(options.periodEnd, 'periodEnd');
  if (start > end) throw new Error('PNCP periodStart must not exceed periodEnd.');
  const pageSize = integer(options.pageSize ?? 500, 'pageSize', 10);
  if (pageSize > 500) throw new Error('PNCP pageSize exceeds official limit 500.');
  const maxPages = integer(options.maxPages ?? 10_000, 'maxPages', 1);
  if ((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000 > 365) throw new Error('Split PNCP collection into windows of at most 366 days.');
  const categoryIds = [...new Set(options.categoryIds ?? [7, 8, 9])].sort((a, b) => a - b);
  if (!categoryIds.length) throw new Error('At least one PNCP category is required.');
  categoryIds.forEach(id => integer(id, 'categoryId', 1));
  const unique = new Map<string, Record<string, unknown>>();
  const selected = new Map<string, PncpContract>();
  let expectedRows: number | null = null;
  let totalPages = 1, downloaded = 0, duplicateKeys = 0, completedPages = 0;
  for (let page = 1; page <= totalPages; page++) {
    const url = new URL(PNCP_ENDPOINT);
    url.search = new URLSearchParams({ dataInicial: start.replaceAll('-', ''), dataFinal: end.replaceAll('-', ''), pagina: String(page), tamanhoPagina: String(pageSize) }).toString();
    const raw = await requestJson(url, { ...options, allowNoContent: true });
    if (raw === undefined) {
      if (page !== 1) throw new Error('Empty PNCP response after pagination started.');
      expectedRows = 0;
      completedPages = 1;
      break;
    }
    const payload = object(raw, 'PNCP page');
    const advertised = integer(payload.totalRegistros, 'totalRegistros');
    const pages = integer(payload.totalPaginas, 'totalPaginas');
    integer(payload.paginasRestantes, 'paginasRestantes');
    if (integer(payload.numeroPagina, 'numeroPagina', 1) !== page) throw new Error('PNCP returned the wrong page.');
    if (!Array.isArray(payload.data)) throw new Error('Invalid PNCP data array.');
    if (expectedRows === null) {
      expectedRows = advertised;
      totalPages = Math.max(1, pages);
      if (pages > maxPages) throw new Error('PNCP page safety limit exceeded.');
      if (advertised === 0 && pages > 1) throw new Error('Inconsistent PNCP empty page count.');
      if (advertised > 0 && pages !== Math.ceil(advertised / pageSize)) throw new Error('Inconsistent PNCP page count.');
    } else if (advertised !== expectedRows || Math.max(1, pages) !== totalPages) throw new Error('PNCP pagination changed during collection; rerun this batch.');
    if (payload.paginasRestantes !== Math.max(0, totalPages - page)) throw new Error('PNCP remaining-page count is inconsistent.');
    const expectedOnPage = Math.min(pageSize, Math.max(0, advertised - (page - 1) * pageSize));
    if (payload.data.length !== expectedOnPage) throw new Error('Incomplete PNCP page; watermark will not advance.');
    completedPages++;
    for (const value of payload.data) {
      downloaded++;
      const row = object(value, 'PNCP contract');
      const id = nonempty(row.numeroControlePNCP, 'numeroControlePNCP');
      const previous = unique.get(id);
      if (previous) {
        duplicateKeys++;
        if (JSON.stringify(previous) !== JSON.stringify(row)) throw new Error('Conflicting PNCP duplicate contract.');
        continue;
      }
      unique.set(id, row);
      const unit = object(row.unidadeOrgao, 'unidadeOrgao');
      const uf = nonempty(unit.ufSigla, 'ufSigla');
      const category = object(row.categoriaProcesso, 'categoriaProcesso');
      const categoryId = integer(category.id, 'categoryId', 1);
      const publishedAt = timestamp(row.dataPublicacaoPncp, 'dataPublicacaoPncp');
      if (publishedAt.slice(0, 10) < start || publishedAt.slice(0, 10) > end) throw new Error('PNCP contract outside requested publication window.');
      if (uf !== 'SP' || !categoryIds.includes(categoryId)) continue;
      const municipalityId = nonempty(unit.codigoIbge, 'codigoIbge');
      if (!/^35\d{5}$/.test(municipalityId)) throw new Error('PNCP SP municipality must have an SP IBGE identifier.');
      selected.set(id, {
        id, uf: 'SP', municipalityId, municipalityName: nonempty(unit.municipioNome, 'municipioNome'),
        categoryId, categoryName: nonempty(category.nome, 'category name'), publishedAt,
        updatedAt: row.dataAtualizacao == null ? null : timestamp(row.dataAtualizacao, 'dataAtualizacao'),
        supplierType: nullableText(row.tipoPessoa), supplierIdentifier: nullableText(row.niFornecedor),
        supplierName: nullableText(row.nomeRazaoSocialFornecedor), contractObject: nonempty(row.objetoContrato, 'objetoContrato'),
        ...valueOf(row),
      });
    }
  }
  if (downloaded !== expectedRows) throw new Error('PNCP row count did not reconcile.');
  if (duplicateKeys > 0) throw new Error('PNCP duplicate keys invalidate complete publication coverage; rerun this batch.');
  return {
    schemaVersion: 'pncp-api-1.0', sourceId: 'pncp', status: 'observed', fixture: false, uf: 'SP',
    endpoint: PNCP_ENDPOINT, fetchedAt: (options.now ?? (() => new Date()))().toISOString(),
    periodStart: start, periodEnd: end, dateRole: 'Data de publicação no PNCP',
    geographyRole: 'Município da unidade contratante; não da obra nem do fornecedor',
    pages: completedPages, advertisedBrazilRows: expectedRows ?? 0, downloadedBrazilRows: downloaded, duplicateKeys,
    categoryIds, records: [...selected.values()].sort((a, b) => a.id.localeCompare(b.id)),
    limitations: ['Categoria de serviços gerais não comprova objeto de engenharia ou obrigação de registro.', 'Atualizações de publicação antiga exigem recomposição histórica: watermark de publicação não é CDC de alterações.', 'Dados reais não podem ser ligados automaticamente a CNPJs fictícios.', 'Timestamps sem fuso são preservados como publicados; não foi inferido UTC.'],
  };
}
