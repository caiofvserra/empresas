import pncp from '../domain/pncp-public-aggregate.json';
import management from '../domain/creasp-management-public.json';

/** Dados públicos REAIS: snapshots versionados no repositório e consultas ao vivo com retorno explícito ao snapshot. */
export type Freshness = 'ao vivo' | 'snapshot' | 'indisponível';
export interface Sourced<T> { data: T | null; freshness: Freshness; source: string; url: string; capturedAt: string; note?: string }

const base = '/data/engineer-statistics/';
async function snapshot<T>(file: string): Promise<T> {
  const response = await fetch(`${base}${file}`);
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}
async function live<T>(url: string, timeout = 6000): Promise<T> {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json() as T;
  } finally { clearTimeout(timer); }
}

interface UfValue { ufCodigo: string; crea?: string; valor?: number; ativos?: number; total?: number; percentualAtivos?: number }
interface Meta { meta: { atualizadoEm: string; snapshot?: { consultaUrl: string; capturadoEm: string } } }
export interface UfRow { uf: string; crea: string; active: number; population: number; per100k: number; activeShare: number | null }
export interface PublicContext {
  ufs: Sourced<UfRow[]>;
  spDecade: Sourced<{ year: string; sp: number | null; br: number | null }[]>;
  modalities: Sourced<{ name: string; value: number; share: number }[]>;
  spending: Sourced<{ label: string; value: number }[]>;
  management: Sourced<{ id: string; label: string; display: string; unit: string; domain: string }[]>;
  pncp: Sourced<{ municipalities: { name: string; value: number; count: number }[]; categories: { name: string; value: number; count: number }[]; period: string }>;
}

const UF = ['RO', 'AC', 'AM', 'RR', 'PA', 'AP', 'TO', 'MA', 'PI', 'CE', 'RN', 'PB', 'PE', 'AL', 'SE', 'BA', 'MG', 'ES', 'RJ', 'SP', 'PR', 'SC', 'RS', 'MS', 'MT', 'GO', 'DF'];
const UF_CODE = ['11', '12', '13', '14', '15', '16', '17', '21', '22', '23', '24', '25', '26', '27', '28', '29', '31', '32', '33', '35', '41', '42', '43', '50', '51', '52', '53'];
export const ufSigla = (code: string) => UF[UF_CODE.indexOf(code)] ?? code;

export async function loadPublicContext(): Promise<PublicContext> {
  const settle = async <T>(work: () => Promise<Sourced<T>>, source: string, url: string): Promise<Sourced<T>> => {
    try { return await work(); } catch (error) { return { data: null, freshness: 'indisponível', source, url, capturedAt: '', note: error instanceof Error ? error.message : 'Falha de leitura' }; }
  };
  const ufs = settle<UfRow[]>(async () => {
    const [actives, situation, population] = await Promise.all([
      snapshot<Meta & { data: { valores: UfValue[] } }>('confea-uf.json'),
      snapshot<Meta & { data: { valores: UfValue[] } }>('confea-situacao-uf.json'),
      snapshot<Meta & { data: { valores: UfValue[] } }>('populacao-uf.json'),
    ]);
    const share = new Map(situation.data.valores.map(row => [row.ufCodigo, row.percentualAtivos ?? null]));
    const people = new Map(population.data.valores.map(row => [row.ufCodigo, row.valor ?? 0]));
    return { data: actives.data.valores.map(row => {
      const residents = people.get(row.ufCodigo) ?? 0, active = row.valor ?? 0;
      return { uf: ufSigla(row.ufCodigo), crea: row.crea ?? '', active, population: residents, per100k: residents ? active / residents * 100000 : 0, activeShare: share.get(row.ufCodigo) ?? null };
    }), freshness: 'snapshot', source: 'Confea SIC × IBGE (agregado 6579)', url: actives.meta.snapshot?.consultaUrl ?? '', capturedAt: actives.meta.snapshot?.capturadoEm ?? actives.meta.atualizadoEm };
  }, 'Confea SIC × IBGE', 'https://relatorio.confea.org.br');
  const spDecade = settle(async () => {
    const file = await snapshot<Meta & { data: { series: { id: string; valores: { periodo: string; valor: number }[] }[] } }>('confea-registros-ano.json');
    const sp = file.data.series.find(row => row.id === 'crea-sp-decada'), br = file.data.series.find(row => row.id === 'nacional');
    if (!sp || !br) throw new Error('Série CREA-SP ausente');
    const spByYear = new Map(sp.valores.map(row => [row.periodo, row.valor]));
    const years = br.valores.filter(row => /^\d{4}$/.test(row.periodo) && row.periodo >= '2010');
    return { data: years.map(row => ({ year: row.periodo, sp: spByYear.get(row.periodo) ?? null, br: row.valor })), freshness: 'snapshot' as const, source: 'Confea SIC · registros profissionais novos por ano', url: file.meta.snapshot?.consultaUrl ?? '', capturedAt: file.meta.snapshot?.capturadoEm ?? file.meta.atualizadoEm, note: '2026 parcial excluído; série CREA-SP publicada só até 2022.' };
  }, 'Confea SIC', 'https://relatorio.confea.org.br');
  const modalities = settle(async () => {
    const file = await snapshot<Meta & { data: { porModalidadeEngenharia: { rotulo: string; valor: number; percentual: number }[] } }>('confea-modalidades.json');
    return { data: file.data.porModalidadeEngenharia.map(row => ({ name: row.rotulo, value: row.valor, share: row.percentual })), freshness: 'snapshot' as const, source: 'Confea SIC · títulos ativos de engenharia (Brasil)', url: file.meta.snapshot?.consultaUrl ?? '', capturedAt: file.meta.snapshot?.capturadoEm ?? file.meta.atualizadoEm };
  }, 'Confea SIC', 'https://relatorio.confea.org.br');
  const spending = settle(async () => {
    const file = await snapshot<Meta & { data: { itens: { id: string; rotulo: string; valor: number; bloco: string }[] } }>('conta-do-conselho.json');
    return { data: file.data.itens.filter(row => row.bloco === 'subgrupos' || row.bloco === 'execucao').map(row => ({ label: row.rotulo, value: row.valor })), freshness: 'snapshot' as const, source: 'Portal da Transparência CREA-SP', url: 'https://transparencia.creasp.org.br', capturedAt: file.meta.atualizadoEm };
  }, 'Portal da Transparência CREA-SP', 'https://transparencia.creasp.org.br');
  const managementFacts: Sourced<PublicContext['management']['data'] & object> = { data: management.facts.map(row => ({ id: row.id, label: row.label, display: row.displayValue, unit: row.unit, domain: row.domain })), freshness: 'snapshot', source: management.metadata.sourceTitle, url: management.metadata.sourceUrl, capturedAt: management.metadata.retrievedAt };
  const municipalities = new Map<string, { value: number; count: number }>(), categories = new Map<string, { value: number; count: number }>();
  for (const row of pncp.rows) {
    const city = municipalities.get(row.municipalityName) ?? { value: 0, count: 0 }; city.value += row.contractValue ?? 0; city.count += row.contractCount; municipalities.set(row.municipalityName, city);
    const category = categories.get(row.categoryName) ?? { value: 0, count: 0 }; category.value += row.contractValue ?? 0; category.count += row.contractCount; categories.set(row.categoryName, category);
  }
  const pncpData: PublicContext['pncp'] = { data: { municipalities: [...municipalities].map(([name, item]) => ({ name, ...item })).sort((a, b) => b.value - a.value), categories: [...categories].map(([name, item]) => ({ name, ...item })).sort((a, b) => b.value - a.value), period: pncp.metadata.periodStart }, freshness: 'snapshot', source: 'PNCP — API pública de contratos (SP, obras/serviços)', url: pncp.metadata.source, capturedAt: pncp.metadata.extractedAt.slice(0, 10) };
  const [a, b, c, d] = await Promise.all([ufs, spDecade, modalities, spending]);
  return { ufs: a, spDecade: b, modalities: c, spending: d, management: managementFacts, pncp: pncpData };
}

/* ---------- APIs públicas ao vivo (navegador) ---------- */
export interface MacroSeries { id: string; label: string; unit: string; points: { date: string; value: number }[] }
const SGS = [
  { code: 433, id: 'ipca', label: 'IPCA', unit: '% a.m.' },
  { code: 192, id: 'incc', label: 'INCC', unit: '% a.m.' },
  { code: 432, id: 'selic', label: 'Selic meta', unit: '% a.a.' },
];
/** Banco Central SGS: sem snapshot local — se a API falhar, o painel mostra "indisponível" em vez de inventar valores. */
export async function loadMacro(): Promise<Sourced<MacroSeries[]>> {
  const url = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.{código}/dados/ultimos/13?formato=json';
  try {
    const series = await Promise.all(SGS.map(async item => {
      const rows = await live<{ data: string; valor: string }[]>(url.replace('{código}', String(item.code)));
      return { id: item.id, label: item.label, unit: item.unit, points: rows.map(row => ({ date: row.data.split('/').reverse().join('-'), value: Number(row.valor) })).filter(row => Number.isFinite(row.value)) };
    }));
    return { data: series, freshness: 'ao vivo', source: 'Banco Central do Brasil · SGS', url: 'https://api.bcb.gov.br', capturedAt: new Date().toISOString().slice(0, 10) };
  } catch (error) {
    return { data: null, freshness: 'indisponível', source: 'Banco Central do Brasil · SGS', url: 'https://api.bcb.gov.br', capturedAt: '', note: error instanceof Error && error.name === 'AbortError' ? 'Tempo de resposta excedido' : 'API não respondeu neste navegador/rede' };
  }
}
/** IBGE agregado 6579: população de SP ao vivo, com retorno ao snapshot versionado. */
export async function loadSpPopulation(): Promise<Sourced<{ year: string; value: number }>> {
  const url = 'https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-1/variaveis/9324?localidades=N3[35]';
  try {
    const rows = await live<{ resultados: { series: { serie: Record<string, string> }[] }[] }[]>(url);
    const [year, value] = Object.entries(rows[0].resultados[0].series[0].serie)[0];
    return { data: { year, value: Number(value) }, freshness: 'ao vivo', source: 'IBGE · agregado 6579', url, capturedAt: new Date().toISOString().slice(0, 10) };
  } catch {
    try {
      const file = await snapshot<Meta & { data: { ano: string; valores: UfValue[] } }>('populacao-uf.json');
      return { data: { year: file.data.ano, value: file.data.valores.find(row => row.ufCodigo === '35')?.valor ?? 0 }, freshness: 'snapshot', source: 'IBGE · agregado 6579', url, capturedAt: file.meta.snapshot?.capturadoEm ?? file.meta.atualizadoEm };
    } catch { return { data: null, freshness: 'indisponível', source: 'IBGE · agregado 6579', url, capturedAt: '' }; }
  }
}
