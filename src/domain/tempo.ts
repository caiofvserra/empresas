import type { Dataset, Registration, RegistrationStatus } from './types';
import type { Acao, Alvo, Auto, Fiscalizacao, StatusMulta } from '../painel/fiscalizacao';

/**
 * V20 · data de referência: o painel "como estava em D". Cada fato guarda a sua data (início e fim), então basta
 * ler a base só com o que já existia em D. Nenhum valor é sobrescrito: a mesma base lida em datas diferentes dá
 * os números de cada dia. Em produção, é o papel do histórico (SCD2) e da tabela diária de indicadores do DW.
 */
const DAY = 86400000;
const toDay = (date: string) => Math.floor(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / DAY);

/** Situação do registro em D, reconstruída pelos movimentos até D (último evento decide). */
function registrationAt(row: Registration, movements: { date: string; type: string }[], anchor: string): Registration | null {
  if (row.startedAt > anchor) return null;
  const own = movements.filter(move => move.date <= anchor).sort((a, b) => a.date.localeCompare(b.date));
  const last = own.at(-1);
  const status: RegistrationStatus = !last || last.type === 'Novo registro' || last.type === 'Reativação' ? 'Ativo' : last.type === 'Baixa' ? 'Inativo' : 'Cancelado';
  const { ceasedAt: _ceased, ...rest } = row;
  return status === 'Ativo' ? { ...rest, status } : { ...rest, status, ceasedAt: last!.date };
}

const cache = new WeakMap<Dataset, Map<string, Dataset>>();
/** Base lida em D. D igual ao corte devolve a própria base. */
export function datasetAt(dataset: Dataset, anchor: string): Dataset {
  if (!anchor || anchor >= dataset.snapshotDate) return dataset;
  const saved = cache.get(dataset) ?? new Map<string, Dataset>();
  cache.set(dataset, saved);
  const hit = saved.get(anchor); if (hit) return hit;
  const upTo = <T>(rows: T[], date: (row: T) => string) => rows.filter(row => date(row) <= anchor);
  const movesByRegistration = new Map<string, Dataset['movements']>();
  for (const move of dataset.movements) movesByRegistration.set(move.registrationId, [...(movesByRegistration.get(move.registrationId) ?? []), move]);
  const registrations = dataset.registrations.map(row => registrationAt(row, movesByRegistration.get(row.id) ?? [], anchor)).filter((row): row is Registration => row !== null);
  const view: Dataset = {
    ...dataset,
    establishments: dataset.establishments.map(row => ({ ...row, updatedAt: row.updatedAt > anchor ? anchor : row.updatedAt })).filter(row => row.openedAt <= anchor),
    registrations,
    movements: upTo(dataset.movements, row => row.date),
    technicalLinks: upTo(dataset.technicalLinks, row => row.startDate).map(row => row.endDate && row.endDate > anchor ? (({ endDate: _end, ...rest }) => rest)(row) : row),
    arts: upTo(dataset.arts, row => row.date).map(row => row.endDate && row.endDate > anchor ? (({ endDate: _end, ...rest }) => ({ ...rest, status: 'Registrada' as const }))(row) : row),
    caos: upTo(dataset.caos, row => row.requestedAt).map(row => row.issuedAt && row.issuedAt > anchor ? (({ issuedAt: _issued, ...rest }) => ({ ...rest, status: 'Em análise' as const }))(row) : row),
    invoices: dataset.invoices.map(row => row.paymentDate && row.paymentDate > anchor ? (({ paymentDate: _paid, ...rest }) => ({ ...rest, paidAmount: 0, recovered: false }))(row) : row),
    cases: upTo(dataset.cases, row => row.createdAt).map(row => {
      const history = row.history.filter(step => step.date <= anchor), status = history.at(-1)?.status ?? row.status;
      const { completedAt: _done, notice, ...rest } = row;
      return { ...rest, status, history, ...(status === 'Concluída' ? { completedAt: history.at(-1)!.date } : {}), ...(notice && notice.date <= anchor ? { notice } : {}) };
    }),
    contracts: upTo(dataset.contracts, row => row.date),
    employment: dataset.employment.filter(row => `${row.month}-01` <= anchor),
    qualityEvents: dataset.qualityEvents.map(row => ({ ...row, date: row.date > anchor ? anchor : row.date })),
    publicRows: dataset.publicRows.map(row => ({ ...row, updatedAt: row.updatedAt > anchor ? anchor : row.updatedAt })),
    months: dataset.months.filter(month => `${month}-01` <= anchor),
    snapshotDate: anchor, updatedAt: anchor,
  };
  saved.set(anchor, view);
  return view;
}

/** Situação da multa em D: pagamento ou dívida ativa posteriores a D ainda não existiam. */
function autoAt(auto: Auto, anchor: string): Auto | undefined {
  if (auto.date > anchor) return undefined;
  const age = toDay(anchor) - toDay(auto.date);
  if (auto.paidAt && auto.paidAt <= anchor) return auto;
  const { paidAt: _paid, ...rest } = auto;
  const status: StatusMulta = age < 30 ? 'Em prazo de defesa' : auto.status === 'Cancelada' ? 'Cancelada' : age < 180 ? 'Em julgamento' : auto.status === 'Paga' ? 'Em julgamento' : 'Dívida ativa';
  return { ...rest, status };
}
const fiscalCache = new WeakMap<Fiscalizacao, Map<string, Fiscalizacao>>();
/** Camada de fiscalização lida em D: ações até D, regularizações e autos só se já tinham acontecido. */
export function fiscalizacaoAt(f: Fiscalizacao, anchor: string): Fiscalizacao {
  if (!anchor || anchor >= f.anchor) return f;
  const saved = fiscalCache.get(f) ?? new Map<string, Fiscalizacao>();
  fiscalCache.set(f, saved);
  const hit = saved.get(anchor); if (hit) return hit;
  const acoes: Acao[] = f.acoes.filter(row => row.date <= anchor).map(row => {
    const { regularizedAt, resolucao, auto, ...rest } = row;
    const keptAuto = auto ? autoAt(auto, anchor) : undefined;
    return { ...rest, ...(regularizedAt && regularizedAt <= anchor ? { regularizedAt, resolucao } : {}), ...(keptAuto ? { auto: keptAuto } : {}) };
  });
  const acaoIds = new Set(acoes.map(row => row.id));
  const alvos: Alvo[] = f.alvos.filter(row => row.since <= anchor).map(row => {
    const { regularizedAt, resolucao, acaoId, ...rest } = row;
    return { ...rest, ...(regularizedAt && regularizedAt <= anchor ? { regularizedAt, resolucao } : {}), ...(acaoId && acaoIds.has(acaoId) ? { acaoId } : {}) };
  });
  const view = { acoes, alvos, start: f.start, anchor };
  saved.set(anchor, view);
  return view;
}

/** Datas de referência oferecidas no seletor: últimos dias de mês entre o início da série e o corte. */
export function datasReferencia(dataset: Dataset, minimo = 12): string[] {
  const out: string[] = [];
  for (const month of dataset.months) {
    const [year, mon] = month.split('-').map(Number);
    const last = new Date(Date.UTC(year, mon, 0)).toISOString().slice(0, 10);
    if (last < dataset.snapshotDate) out.push(last);
  }
  return out.slice(minimo);
}
