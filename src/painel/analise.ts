import type { Scope } from '../domain/engine';
import type { Dataset } from '../domain/types';
import type { EnterpriseModel } from '../enterprise-v10/types';
import { median, stockBridge } from '../gestao-v14/metrics';
import type { Acao, Alvo, Fiscalizacao, Origem, StatusMulta, Tipo } from './fiscalizacao';
import { origens } from './fiscalizacao';

/** V17 · análise da atividade do CREA-SP sobre empresas: fiscalizar, autuar, multar, obrigar registro e o efeito na base e na receita. */
const DAY = 86400000;
const toDay = (date: string) => Math.floor(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / DAY);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const share = (part: number, whole: number) => whole > 0 ? part / whole * 100 : null;
const change = (now: number, before: number) => before > 0 ? (now - before) / before * 100 : null;
export const tipos: Tipo[] = ['registro', 'rt', 'art'];

/* ---------- Janela do período e a mesma janela um ano antes ---------- */
export interface Janela { start: string; end: string; prevStart: string; prevEnd: string; months: string[] }
const shiftMonths = (date: string, months: number) => { const [year, month, dayOfMonth] = date.split('-').map(Number); const value = new Date(Date.UTC(year, month - 1 + months, 1)); const last = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate(); value.setUTCDate(Math.min(dayOfMonth, last)); return value.toISOString().slice(0, 10); };
export function janela(anchor: string, period: number): Janela {
  const start = `${shiftMonths(anchor, -(period - 1)).slice(0, 7)}-01`;
  const months = Array.from({ length: 24 }, (_, index) => shiftMonths(`${anchor.slice(0, 7)}-01`, index - 23).slice(0, 7));
  return { start, end: anchor, prevStart: shiftMonths(start, -12), prevEnd: shiftMonths(anchor, -12), months };
}
const inside = (date: string | undefined, start: string, end: string) => Boolean(date && date >= start && date <= end);

/* ---------- Visão 1 · Fiscalização ---------- */
export type Segmento = 'Regularizado após auto' | 'Regularizado na notificação' | 'Autuado, sem regularizar' | 'Notificado, sem regularizar' | 'Sem ação';
export const segmentos: Segmento[] = ['Regularizado após auto', 'Regularizado na notificação', 'Autuado, sem regularizar', 'Notificado, sem regularizar', 'Sem ação'];
export interface ResumoFiscal {
  acoes: Acao[]; acoesPrev: number; autos: Acao[]; autosPrev: number; aplicada: number; aplicadaPrev: number; recebida: number; pagaCoorte: number | null;
  regularizacoes: Acao[]; regularizacoesPrev: number; taxa: number | null; medianaDias: number | null;
  abertos: Record<Tipo, Alvo[]>; abertosComAcao: number;
  mensal: { month: string; acoes: number; autos: Record<Tipo, number>; regularizacoes: number }[];
  situacao: { tipo: Tipo; total: number; partes: Record<Segmento, Alvo[]> }[];
  curvas: { origem: Origem; n: number; pontos: [number, number][]; mediana: number | null; final: number | null }[];
  multas: Record<StatusMulta, { valor: number; acoes: Acao[] }>;
}
export function resumoFiscal(f: Fiscalizacao, greId: string | null, period: number): ResumoFiscal {
  const w = janela(f.anchor, period), anchorDay = toDay(f.anchor);
  const acoes = f.acoes.filter(row => !greId || row.greId === greId), alvos = f.alvos.filter(row => !greId || row.greId === greId);
  const byId = new Map(acoes.map(row => [row.id, row]));
  const atual = acoes.filter(row => inside(row.date, w.start, w.end));
  const autos = acoes.filter(row => inside(row.auto?.date, w.start, w.end));
  const regularizacoes = acoes.filter(row => inside(row.regularizedAt, w.start, w.end));
  const abertos = Object.fromEntries(tipos.map(tipo => [tipo, alvos.filter(row => row.tipo === tipo && !row.regularizedAt)])) as Record<Tipo, Alvo[]>;
  const abertosTodos = tipos.flatMap(tipo => abertos[tipo]);
  const aplicada = sum(autos.map(row => row.auto!.valor));
  const mensal = w.months.map(month => ({ month, acoes: acoes.filter(row => row.date.startsWith(month)).length,
    autos: Object.fromEntries(tipos.map(tipo => [tipo, acoes.filter(row => row.tipo === tipo && row.auto?.date.startsWith(month)).length])) as Record<Tipo, number>,
    regularizacoes: acoes.filter(row => row.regularizedAt?.startsWith(month)).length }));
  const situacao = tipos.map(tipo => {
    const universo = alvos.filter(row => row.tipo === tipo && (!row.regularizedAt || inside(row.regularizedAt, w.start, w.end) && row.acaoId));
    const partes = Object.fromEntries(segmentos.map(segment => [segment, [] as Alvo[]])) as Record<Segmento, Alvo[]>;
    for (const alvo of universo) {
      const acao = alvo.acaoId ? byId.get(alvo.acaoId) : undefined;
      const segment: Segmento = alvo.regularizedAt ? (acao?.auto ? 'Regularizado após auto' : 'Regularizado na notificação') : !acao ? 'Sem ação' : acao.auto ? 'Autuado, sem regularizar' : 'Notificado, sem regularizar';
      partes[segment].push(alvo);
    }
    return { tipo, total: universo.length, partes };
  });
  // Curva acumulada de regularização (Kaplan-Meier): ações ainda pendentes contam como censuradas na idade atual (últimos 24 meses).
  const recentes = acoes.filter(row => row.date >= `${w.months[0]}-01`);
  const curvas = origens.map(origem => {
    const rows = recentes.filter(row => row.origem === origem);
    const lag = (row: Acao) => row.regularizedAt ? toDay(row.regularizedAt) - toDay(row.date) : Infinity;
    const pontos = regularizacaoAcumulada(rows.map(row => ({ tempo: row.regularizedAt ? lag(row) : anchorDay - toDay(row.date), evento: Boolean(row.regularizedAt) })));
    return { origem, n: rows.length, pontos, mediana: median(rows.filter(row => row.regularizedAt).map(lag)), final: pontos.at(-1)?.[1] ?? null };
  }).filter(row => row.n >= 8);
  const statuses: StatusMulta[] = ['Paga', 'Em prazo de defesa', 'Em julgamento', 'Dívida ativa', 'Cancelada'];
  const multas = Object.fromEntries(statuses.map(status => { const rows = autos.filter(row => row.auto!.status === status); return [status, { valor: sum(rows.map(row => row.auto!.valor)), acoes: rows }]; })) as ResumoFiscal['multas'];
  return {
    acoes: atual, acoesPrev: acoes.filter(row => inside(row.date, w.prevStart, w.prevEnd)).length,
    autos, autosPrev: acoes.filter(row => inside(row.auto?.date, w.prevStart, w.prevEnd)).length,
    aplicada, aplicadaPrev: sum(acoes.filter(row => inside(row.auto?.date, w.prevStart, w.prevEnd)).map(row => row.auto!.valor)),
    recebida: sum(acoes.filter(row => inside(row.auto?.paidAt, w.start, w.end)).map(row => row.auto!.valor)),
    pagaCoorte: share(sum(autos.filter(row => row.auto!.status === 'Paga').map(row => row.auto!.valor)), aplicada),
    regularizacoes, regularizacoesPrev: acoes.filter(row => inside(row.regularizedAt, w.prevStart, w.prevEnd)).length,
    taxa: share(atual.filter(row => row.regularizedAt).length, atual.length),
    medianaDias: median(regularizacoes.map(row => toDay(row.regularizedAt!) - toDay(row.date))),
    abertos, abertosComAcao: abertosTodos.filter(row => row.acaoId).length, mensal, situacao, curvas, multas,
  };
}
export const variacao = change;
/** Estimador de Kaplan-Meier: % acumulado de regularizados até cada dia (passo de 15 dias, enquanto houver ao menos 8 em risco). */
export function regularizacaoAcumulada(casos: { tempo: number; evento: boolean }[], limite = 360, passo = 15): [number, number][] {
  const ordered = [...casos].sort((a, b) => a.tempo - b.tempo);
  const pontos: [number, number][] = [];
  let survival = 1, index = 0;
  for (let day = 0; day <= limite; day += passo) {
    while (index < ordered.length && ordered[index].tempo <= day) {
      const tempo = ordered[index].tempo, atRisk = ordered.length - index;
      let events = 0, count = 0;
      while (index + count < ordered.length && ordered[index + count].tempo === tempo) { if (ordered[index + count].evento) events++; count++; }
      survival *= 1 - events / atRisk; index += count;
    }
    if (ordered.length - index < 8 && day > 0) break;
    pontos.push([day, (1 - survival) * 100]);
  }
  return pontos;
}

/* ---------- Por regional: base do mapa bivariado ---------- */
export interface Regional {
  id: string; name: string; elegiveis: number; semRegistro: number; pctSemRegistro: number | null;
  alvos: number; acoes: number; acoesPor100: number | null; taxa: number | null; autos: number; aplicada: number;
  empregoTecnico: number; empregoAnterior: number; ativas: number; empregoPorEmpresa: number | null; novosRegistros: number; registrosPorMilEmpregos: number | null;
}
export function porRegional(dataset: Dataset, f: Fiscalizacao, model: EnterpriseModel, period: number, filtro: { empresa?: (companyId: string) => boolean; cnae?: (code: string) => boolean } = {}): Regional[] {
  const w = janela(f.anchor, period), establishments = new Map(dataset.establishments.map(row => [row.id, row]));
  const cities = new Map(dataset.cities.map(row => [row.id, row.greId]));
  const active = new Set(model.metadata.activeEligibleEstablishmentIds);
  const eligible = model.metadata.eligibleEstablishmentIds.map(id => establishments.get(id)).filter(Boolean) as Dataset['establishments'];
  const lastMonth = f.anchor.slice(0, 7), before = w.months[w.months.length - 13];
  const technical = new Set(dataset.cbos.filter(row => row.technical).map(row => row.code));
  const firstRegistration = new Map<string, string>();
  for (const row of dataset.registrations) { const previous = firstRegistration.get(row.establishmentId); if (!previous || row.startedAt < previous) firstRegistration.set(row.establishmentId, row.startedAt); }
  const representative = new Map<string, string>();
  for (const row of dataset.establishments) if (!representative.has(row.companyId) || row.branch === 'Matriz') representative.set(row.companyId, row.greId);
  return dataset.gres.map(gre => {
    const mine = eligible.filter(row => row.greId === gre.id), semRegistro = mine.filter(row => !active.has(row.id)).length;
    const alvos = f.alvos.filter(row => row.greId === gre.id && (!row.regularizedAt || inside(row.regularizedAt, w.start, w.end)));
    const acoes = f.acoes.filter(row => row.greId === gre.id && inside(row.date, w.start, w.end));
    const autos = f.acoes.filter(row => row.greId === gre.id && inside(row.auto?.date, w.start, w.end));
    const emprego = (month: string) => sum(dataset.employment.filter(row => row.month === month && technical.has(row.cbo) && cities.get(row.cityId) === gre.id && (!filtro.cnae || filtro.cnae(row.cnae))).map(row => row.stock));
    const empregoTecnico = emprego(lastMonth), empregoAnterior = emprego(before);
    const ativas = model.metadata.activeCompanyIds.filter(id => representative.get(id) === gre.id).length;
    const novosRegistros = dataset.establishments.filter(row => row.greId === gre.id && (!filtro.empresa || filtro.empresa(row.companyId)) && inside(firstRegistration.get(row.id), w.start, w.end)).length;
    return { id: gre.id, name: gre.name, elegiveis: mine.length, semRegistro, pctSemRegistro: share(semRegistro, mine.length),
      alvos: alvos.length, acoes: acoes.length, acoesPor100: share(acoes.length, alvos.length), taxa: share(acoes.filter(row => row.regularizedAt).length, acoes.length),
      autos: autos.length, aplicada: sum(autos.map(row => row.auto!.valor)),
      empregoTecnico, empregoAnterior, ativas, empregoPorEmpresa: ativas ? empregoTecnico / ativas : null, novosRegistros,
      registrosPorMilEmpregos: empregoTecnico ? novosRegistros / empregoTecnico * 1000 : null };
  });
}

/** Pares do mapa bivariado: X mede o problema, Y a resposta. Vermelho = problema alto e resposta baixa. */
export type ParId = 'problema' | 'resultado' | 'mercado';
export const pares: Record<ParId, { label: string; pergunta: string; x: string; y: string; getX: (row: Regional) => number | null; getY: (row: Regional) => number | null; fx: (value: number) => string; fy: (value: number) => string; critico: string; leitura: string }> = {
  problema: { label: 'Sem registro × fiscalização', pergunta: 'Onde a fiscalização está aquém das empresas sem registro?', x: '% dos CNPJs de engenharia sem registro', y: 'ações fiscalizatórias por 100 irregularidades', getX: row => row.pctSemRegistro, getY: row => row.acoesPor100, fx: value => `${value.toFixed(0)}%`, fy: value => value.toFixed(0), critico: 'Muitas sem registro, pouca fiscalização', leitura: 'Vermelho: alta proporção de empresas sem registro e poucas ações fiscalizatórias. Candidatas a reforço de equipe ou força-tarefa.' },
  resultado: { label: 'Fiscalização × regularização', pergunta: 'Onde a fiscalização age e as empresas não se regularizam?', x: 'ações fiscalizatórias por 100 irregularidades', y: '% das ações já regularizadas', getX: row => row.acoesPor100, getY: row => row.taxa, fx: value => value.toFixed(0), fy: value => `${value.toFixed(0)}%`, critico: 'Muita ação, pouca regularização', leitura: 'Vermelho: muitas ações e pouca regularização. Rever prazos de notificação, a autuação e a cobrança das multas.' },
  mercado: { label: 'Emprego técnico × registro', pergunta: 'Onde o mercado de engenharia emprega muito e registra pouco?', x: 'empregos técnicos (RAIS/CAGED) por empresa registrada', y: 'novos registros por 1.000 empregos técnicos', getX: row => row.empregoPorEmpresa, getY: row => row.registrosPorMilEmpregos, fx: value => value.toFixed(0), fy: value => value.toFixed(1), critico: 'Mercado grande, pouco registro novo', leitura: 'Vermelho: muitos empregos em ocupações de engenharia para poucas empresas registradas, e o registro não acompanha. Provável sub-registro.' },
};
/** Classe 0..2 por tercil entre as regionais com valor. */
export function tercil(values: (number | null)[]): (value: number | null) => number | null {
  const sorted = values.filter((value): value is number => value !== null).sort((a, b) => a - b);
  if (!sorted.length) return () => null;
  const cut1 = sorted[Math.floor(sorted.length / 3)], cut2 = sorted[Math.floor(sorted.length * 2 / 3)];
  return value => value === null ? null : value < cut1 ? 0 : value < cut2 ? 1 : 2;
}

/* ---------- Visão 2 · Registro e receita ---------- */
export interface Ponte { abertura: number; espontaneas: string[]; viaFiscalizacao: string[]; retornos: string[]; saidas: string[]; final: number }
export function ponteBase(model: EnterpriseModel, scope: Scope, f: Fiscalizacao, period: number): Ponte {
  const w = janela(f.anchor, period), bridge = stockBridge(model, scope);
  const induced = new Set(f.acoes.filter(row => row.tipo === 'registro' && inside(row.regularizedAt, w.start, w.end)).map(row => row.companyId));
  return { abertura: bridge.opening, espontaneas: bridge.newcomerIds.filter(id => !induced.has(id)), viaFiscalizacao: [...bridge.newcomerIds, ...bridge.returningIds].filter(id => induced.has(id)),
    retornos: bridge.returningIds.filter(id => !induced.has(id)), saidas: bridge.exitIds, final: bridge.closing };
}
export interface Atividade { code: string; label: string; total: number; registrado: string[]; comAcao: string[]; semAcao: string[] }
export function mercadoPorAtividade(scope: Scope, model: EnterpriseModel, f: Fiscalizacao): Atividade[] {
  const establishments = new Map(scope.establishments.map(row => [row.id, row])), labels = new Map(scope.dataset.cnaes.map(row => [row.code, row.label]));
  const active = new Set(model.metadata.activeEligibleEstablishmentIds);
  const acted = new Set(f.alvos.filter(row => row.tipo === 'registro' && !row.regularizedAt && row.acaoId).map(row => row.establishmentId));
  const groups = new Map<string, Atividade>();
  for (const id of model.metadata.eligibleEstablishmentIds) {
    const place = establishments.get(id); if (!place) continue;
    const item = groups.get(place.cnaeMain) ?? { code: place.cnaeMain, label: (labels.get(place.cnaeMain) ?? place.cnaeMain).split(/[,(]/)[0].trim(), total: 0, registrado: [], comAcao: [], semAcao: [] };
    item.total++;
    (active.has(id) ? item.registrado : acted.has(id) ? item.comAcao : item.semAcao).push(id);
    groups.set(place.cnaeMain, item);
  }
  return [...groups.values()].sort((a, b) => (b.comAcao.length + b.semAcao.length) / b.total - (a.comAcao.length + a.semAcao.length) / a.total);
}
export interface QuadroTecnico { comRt: string[]; rtBaixado: string[]; semVinculo: string[]; distribuicao: { empresas: number; profissionais: string[] }[]; limite: number }
export function quadroTecnico(scope: Scope, model: EnterpriseModel, f: Fiscalizacao): QuadroTecnico {
  const anchor = scope.anchor, active = model.metadata.activeCompanyIds, activeSet = new Set(active);
  const withRt = new Set(model.metrics.rtCoverage.companyIds);
  const baixado = new Set(f.alvos.filter(row => row.tipo === 'rt' && !row.regularizedAt).map(row => row.companyId));
  const links = scope.dataset.technicalLinks.filter(row => activeSet.has(row.companyId) && row.startDate <= anchor && (!row.endDate || row.endDate > anchor));
  const perProfessional = new Map<string, Set<string>>();
  for (const row of links) perProfessional.set(row.professionalId, (perProfessional.get(row.professionalId) ?? new Set()).add(row.companyId));
  const buckets = new Map<number, string[]>();
  for (const [professional, companies] of perProfessional) { const key = Math.min(5, companies.size); buckets.set(key, [...(buckets.get(key) ?? []), professional]); }
  return { comRt: active.filter(id => withRt.has(id)), rtBaixado: active.filter(id => !withRt.has(id) && baixado.has(id)), semVinculo: active.filter(id => !withRt.has(id) && !baixado.has(id)),
    distribuicao: [1, 2, 3, 4, 5].map(empresas => ({ empresas, profissionais: buckets.get(empresas) ?? [] })), limite: 3 };
}
export interface Receita { mensal: { month: string; anuidades: number; multas: number; anuidadesAntes: number | null; multasAntes: number | null }[]; anuidades: number; multas: number; total: number; totalAntes: number | null }
export function receita(history: EnterpriseModel, f: Fiscalizacao, greId: string | null, period: number): Receita {
  const w = janela(f.anchor, period), acoes = f.acoes.filter(row => !greId || row.greId === greId);
  const multasMes = (month: string) => sum(acoes.filter(row => row.auto?.paidAt?.startsWith(month)).map(row => row.auto!.valor));
  const byMonth = new Map(history.monthly.map(row => [row.month, row.receipts]));
  const mensal = w.months.slice(-12).map((month, index) => { const before = w.months[index]; return { month, anuidades: byMonth.get(month) ?? 0, multas: multasMes(month), anuidadesAntes: byMonth.get(before) ?? null, multasAntes: multasMes(before) }; });
  const inWindow = (month: string, start: string, end: string) => `${month}-01` >= start.slice(0, 8) + '01' && month <= end.slice(0, 7);
  const anuidades = sum(history.monthly.filter(row => inWindow(row.month, w.start, w.end)).map(row => row.receipts));
  const anuidadesAntes = history.monthly.some(row => inWindow(row.month, w.prevStart, w.prevEnd)) ? sum(history.monthly.filter(row => inWindow(row.month, w.prevStart, w.prevEnd)).map(row => row.receipts)) : null;
  const multas = sum(acoes.filter(row => inside(row.auto?.paidAt, w.start, w.end)).map(row => row.auto!.valor));
  const multasAntes = sum(acoes.filter(row => inside(row.auto?.paidAt, w.prevStart, w.prevEnd)).map(row => row.auto!.valor));
  return { mensal, anuidades, multas, total: anuidades + multas, totalAntes: anuidadesAntes === null ? null : anuidadesAntes + multasAntes };
}
/** Registros ativos de CNPJ baixado, inapto ou suspenso na Receita: base inflada e cobrança provavelmente perdida. */
export function saneamento(scope: Scope, model: EnterpriseModel) {
  const establishments = new Map(scope.establishments.map(row => [row.id, row])), facts = new Map(model.companyFacts.map(row => [row.companyId, row]));
  const registros = scope.registrations.filter(row => row.status === 'Ativo' && (establishments.get(row.establishmentId)?.rfbStatus ?? 'Ativa') !== 'Ativa');
  const companies = [...new Set(registros.map(row => row.companyId))];
  return { registros, establishmentIds: [...new Set(registros.map(row => row.establishmentId))], companies, vencido: sum(companies.map(id => facts.get(id)?.overdue ?? 0)) };
}

/* ---------- Câmara especializada (pela atividade principal da empresa) ---------- */
export type Camara = 'Eng. Civil' | 'Eng. Elétrica' | 'Eng. Mec. e Metalúrgica' | 'Eng. Química';
export const camaras: Camara[] = ['Eng. Civil', 'Eng. Elétrica', 'Eng. Mec. e Metalúrgica', 'Eng. Química'];
/** Correspondência demonstrativa CNAE → câmara; em produção, a câmara vem do cadastro de registro da empresa. */
export const camaraPorCnae: Record<string, Camara> = {
  '7112-0/00': 'Eng. Civil', '4120-4/00': 'Eng. Civil', '4399-1/03': 'Eng. Civil', '4211-1/01': 'Eng. Civil', '4299-5/99': 'Eng. Civil', '4322-3/01': 'Eng. Civil', '7119-7/03': 'Eng. Civil',
  '4321-5/00': 'Eng. Elétrica', '4221-9/02': 'Eng. Elétrica', '3314-7/10': 'Eng. Mec. e Metalúrgica', '7739-0/02': 'Eng. Mec. e Metalúrgica', '7120-1/00': 'Eng. Química',
};
const camaraCache = new WeakMap<Dataset, Map<string, Camara>>();
export function camaraDaEmpresa(dataset: Dataset): Map<string, Camara> {
  const saved = camaraCache.get(dataset); if (saved) return saved;
  const main = new Map<string, Dataset['establishments'][number]>();
  for (const row of [...dataset.establishments].sort((a, b) => a.id.localeCompare(b.id))) { const previous = main.get(row.companyId); if (!previous || previous.branch !== 'Matriz' && row.branch === 'Matriz') main.set(row.companyId, row); }
  const result = new Map([...main].map(([companyId, row]) => [companyId, camaraPorCnae[row.cnaeMain] ?? 'Eng. Civil'] as [string, Camara]));
  camaraCache.set(dataset, result); return result;
}

/* ---------- Distribuição por regional e mercado por câmara (visão Cadastro e receita) ---------- */
export interface DistribuicaoGre { id: string; name: string; emDia: string[]; inadimplentes: string[]; semRegistro: string[] }
export function distribuicaoGre(scope: Scope, model: EnterpriseModel): DistribuicaoGre[] {
  const debtors = devedoras(model), establishments = new Map(scope.establishments.map(row => [row.id, row]));
  const active = new Set(model.metadata.activeEligibleEstablishmentIds);
  const representative = new Map<string, string>();
  for (const row of scope.establishments) if (!representative.has(row.companyId) || row.branch === 'Matriz') representative.set(row.companyId, row.greId);
  return scope.dataset.gres.map(gre => {
    const ativas = model.metadata.activeCompanyIds.filter(id => representative.get(id) === gre.id);
    const semRegistro = model.metadata.eligibleEstablishmentIds.filter(id => !active.has(id) && establishments.get(id)?.greId === gre.id);
    return { id: gre.id, name: gre.name, emDia: ativas.filter(id => !debtors.has(id)), inadimplentes: ativas.filter(id => debtors.has(id)), semRegistro };
  }).filter(row => row.emDia.length + row.inadimplentes.length + row.semRegistro.length > 0);
}
/** Empresas cobradas com algum saldo vencido no corte. */
export function devedoras(model: EnterpriseModel): Set<string> {
  const compliant = new Set(model.metrics.compliance.companyIds);
  return new Set((model.metrics.compliance.denominatorCompanyIds ?? []).filter(id => !compliant.has(id)));
}
export type SegmentoMercado = 'Registro ativo, em dia' | 'Registro ativo, inadimplente' | 'Sem registro, com ação' | 'Sem registro, sem ação';
export const segmentosMercado: SegmentoMercado[] = ['Registro ativo, em dia', 'Registro ativo, inadimplente', 'Sem registro, com ação', 'Sem registro, sem ação'];
export interface MercadoCamara { camara: Camara; total: number; partes: Record<SegmentoMercado, string[]> }
export function mercadoPorCamara(scope: Scope, model: EnterpriseModel, f: Fiscalizacao): MercadoCamara[] {
  const camara = camaraDaEmpresa(scope.dataset), establishments = new Map(scope.establishments.map(row => [row.id, row]));
  const active = new Set(model.metadata.activeEligibleEstablishmentIds), debtors = devedoras(model);
  const acted = new Set(f.alvos.filter(row => row.tipo === 'registro' && !row.regularizedAt && row.acaoId).map(row => row.establishmentId));
  const rows = new Map(camaras.map(name => [name, { camara: name, total: 0, partes: Object.fromEntries(segmentosMercado.map(segment => [segment, [] as string[]])) as Record<SegmentoMercado, string[]> }]));
  for (const id of model.metadata.eligibleEstablishmentIds) {
    const place = establishments.get(id); if (!place) continue;
    const item = rows.get(camara.get(place.companyId) ?? 'Eng. Civil')!; item.total++;
    const segment: SegmentoMercado = active.has(id) ? (debtors.has(place.companyId) ? 'Registro ativo, inadimplente' : 'Registro ativo, em dia') : acted.has(id) ? 'Sem registro, com ação' : 'Sem registro, sem ação';
    item.partes[segment].push(id);
  }
  return [...rows.values()].filter(row => row.total > 0).sort((a, b) => b.total - a.total);
}

/* ---------- Contratos públicos de engenharia (PNCP) pela situação do fornecedor na data do contrato ---------- */
export type SituacaoFornecedor = 'Sem registro na data' | 'Registrada, com anuidade vencida' | 'Registrada, sem ART em 60 dias' | 'Regular: registro, quitação e ART';
export const situacoesFornecedor: SituacaoFornecedor[] = ['Sem registro na data', 'Registrada, com anuidade vencida', 'Registrada, sem ART em 60 dias', 'Regular: registro, quitação e ART'];
export interface ContratoPublico { id: string; companyId: string; establishmentId: string; buyerId: string; categoria: string; objeto: string; valor: number; data: string; registrada: boolean; quitada: boolean; comArt: boolean; situacao: SituacaoFornecedor }
/** Primeira situação que se aplica, nesta ordem: sem registro, sem quitação de anuidade (impede a certidão de registro e quitação), sem ART. */
export function contratosPublicos(scope: Scope, period: number): ContratoPublico[] {
  const w = janela(scope.anchor, period), technical = new Set(['Obras', 'Serviços técnicos', 'Manutenção', 'Consultoria']);
  const registrations = new Map<string, Scope['registrations']>();
  for (const row of scope.dataset.registrations) registrations.set(row.establishmentId, [...(registrations.get(row.establishmentId) ?? []), row]);
  const arts = new Map<string, number[]>();
  for (const row of scope.dataset.arts) arts.set(row.companyId, [...(arts.get(row.companyId) ?? []), toDay(row.date)]);
  const invoices = new Map<string, Scope['invoices']>();
  for (const row of scope.dataset.invoices) invoices.set(row.companyId, [...(invoices.get(row.companyId) ?? []), row]);
  return scope.contracts.filter(row => technical.has(row.category) && inside(row.date, w.start, w.end)).map(row => {
    const day = toDay(row.date);
    const registrada = (registrations.get(row.establishmentId) ?? []).some(item => toDay(item.startedAt) <= day && (!item.ceasedAt || toDay(item.ceasedAt) > day));
    const quitada = !(invoices.get(row.companyId) ?? []).some(item => item.dueDate < row.date && item.amount > 0 && (!item.paymentDate || item.paymentDate > row.date));
    const comArt = (arts.get(row.companyId) ?? []).some(artDay => artDay >= day - 30 && artDay <= day + 60);
    const situacao: SituacaoFornecedor = !registrada ? 'Sem registro na data' : !quitada ? 'Registrada, com anuidade vencida' : !comArt ? 'Registrada, sem ART em 60 dias' : 'Regular: registro, quitação e ART';
    return { id: row.id, companyId: row.companyId, establishmentId: row.establishmentId, buyerId: row.buyerId, categoria: row.category, objeto: row.object, valor: row.value, data: row.date, registrada, quitada, comArt, situacao };
  });
}
/** Autos de infração por regional e mês (últimos 12 meses), para o mapa de calor. */
export function autosPorRegionalMes(dataset: Dataset, f: Fiscalizacao): { months: string[]; gres: { id: string; name: string }[]; cells: [number, number, number][] } {
  const months = janela(f.anchor, 12).months.slice(-12);
  const gres = dataset.gres.filter(gre => f.acoes.some(row => row.greId === gre.id && row.auto));
  const cells: [number, number, number][] = [];
  gres.forEach((gre, y) => months.forEach((month, x) => cells.push([x, y, f.acoes.filter(row => row.greId === gre.id && row.auto?.date.startsWith(month)).length])));
  return { months, gres: gres.map(row => ({ id: row.id, name: row.name })), cells };
}
