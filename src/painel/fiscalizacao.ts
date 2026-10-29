import type { Dataset, Establishment } from '../domain/types';
import { classifyDigitalObject } from '../domain/digital-inspection';
import { isValidEnterpriseCnpj } from '../enterprise-v10/data';
import { mainEstablishments } from '../gestao-v14/metrics';

/**
 * Camada DEMONSTRATIVA de fiscalização de empresas: ações, autos de infração, multas e regularizações.
 * O cenário-base não traz esses fatos; eles são derivados, com sorteio determinístico por chave, dos eventos
 * que já existem (primeiro registro do estabelecimento, baixa de RT sem substituto, contrato público sem ART).
 * Em produção, a fonte é o sistema de fiscalização do CREA-SP. Valores de multa são ilustrativos.
 */
export type Tipo = 'registro' | 'rt' | 'art';
export type Origem = 'Cruzamento Receita (CNAE)' | 'Contrato público (PNCP)' | 'Denúncia' | 'Rotina de campo' | 'Cadastro CREA';
export type StatusMulta = 'Em prazo de defesa' | 'Em julgamento' | 'Paga' | 'Dívida ativa' | 'Cancelada';
export interface Auto { id: string; date: string; valor: number; status: StatusMulta; paidAt?: string }
export type Resolucao = 'Registro obtido' | 'RT indicado' | 'Baixa do registro' | 'ART recolhida';
export interface Acao { id: string; tipo: Tipo; origem: Origem; date: string; establishmentId: string; companyId: string; greId: string; cityId: string; regularizedAt?: string; resolucao?: Resolucao; auto?: Auto; contractId?: string }
/** Alvo = irregularidade identificada. Aberto quando não há regularização até o corte. */
export interface Alvo { id: string; tipo: Tipo; establishmentId: string; companyId: string; greId: string; cityId: string; since: string; regularizedAt?: string; resolucao?: Resolucao; acaoId?: string }
export interface Fiscalizacao { acoes: Acao[]; alvos: Alvo[]; start: string; anchor: string }

export const tipoLabel: Record<Tipo, string> = { registro: 'Falta de registro', rt: 'RT baixado sem substituto', art: 'Obra pública sem ART' };
export const origens: Origem[] = ['Cruzamento Receita (CNAE)', 'Contrato público (PNCP)', 'Denúncia', 'Rotina de campo', 'Cadastro CREA'];
const technicalCategories = new Set(['Obras', 'Serviços técnicos', 'Manutenção', 'Consultoria']);
const baseFine: Record<Tipo, number> = { registro: 4200, rt: 3100, art: 1600 };
const sizeFactor: Record<string, number> = { Microempresa: 0.7, 'Pequena empresa': 0.85, 'Média empresa': 1, 'Grande empresa': 1.6 };

const DAY = 86400000;
const toDay = (date: string) => Math.floor(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / DAY);
const toDate = (day: number) => new Date(day * DAY).toISOString().slice(0, 10);
/** Sorteio estável por chave (FNV-1a + mistura), independente da ordem de iteração. */
export function chance(key: string): number {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index++) { hash ^= key.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  hash ^= hash >>> 15; hash = Math.imul(hash, 0x2c1b3c6d); hash ^= hash >>> 12; hash = Math.imul(hash, 0x297a2d39); hash ^= hash >>> 15;
  return (hash >>> 0) / 4294967296;
}
const between = (key: string, min: number, max: number) => min + Math.floor(chance(key) * (max - min + 1));

const cache = new WeakMap<Dataset, Fiscalizacao>();
export function buildFiscalizacao(dataset: Dataset): Fiscalizacao {
  const saved = cache.get(dataset); if (saved) return saved;
  const anchor = dataset.snapshotDate, anchorDay = toDay(anchor), startDay = toDay(`${dataset.months[0]}-01`);
  const companies = new Map(dataset.companies.map(row => [row.id, row]));
  const cnaes = new Map(dataset.cnaes.map(row => [row.code, row]));
  const main = mainEstablishments(dataset);
  const registrations = new Map<string, Dataset['registrations']>();
  for (const row of dataset.registrations) registrations.set(row.establishmentId, [...(registrations.get(row.establishmentId) ?? []), row]);
  const activeAt = (establishmentId: string, day: number) => (registrations.get(establishmentId) ?? []).some(row => toDay(row.startedAt) <= day && (!row.ceasedAt || toDay(row.ceasedAt) > day));
  const activeNow = (establishmentId: string) => (registrations.get(establishmentId) ?? []).some(row => row.status === 'Ativo');
  const contractsBy = new Map<string, Dataset['contracts']>();
  for (const row of dataset.contracts) contractsBy.set(row.establishmentId, [...(contractsBy.get(row.establishmentId) ?? []), row]);
  const artsBy = new Map<string, number[]>();
  for (const row of dataset.arts) artsBy.set(row.companyId, [...(artsBy.get(row.companyId) ?? []), toDay(row.date)]);
  const acoes: Acao[] = [], alvos: Alvo[] = [];

  const fine = (tipo: Tipo, companyId: string, key: string) => Math.round(baseFine[tipo] * (sizeFactor[companies.get(companyId)?.size ?? ''] ?? 1) * (0.9 + chance(`valor:${key}`) * 0.2) / 10) * 10;
  /** Notificação na ação; auto lavrado se não regularizar no prazo (15 a 45 dias). */
  const act = (tipo: Tipo, origem: Origem, key: string, place: Establishment, actionDay: number, regularizedDay: number | null, autoChance: number, resolucao?: Resolucao, contractId?: string) => {
    const id = `ACAO-${tipo}-${key}`;
    const autoDay = actionDay + between(`autodia:${key}`, 15, 45);
    const autuado = autoDay <= anchorDay && (regularizedDay === null || regularizedDay > autoDay) && chance(`auto:${key}`) < autoChance;
    let auto: Auto | undefined;
    if (autuado) {
      const age = anchorDay - autoDay, roll = chance(`multa:${key}`);
      let status: StatusMulta, paidAt: string | undefined;
      if (age < 30) status = 'Em prazo de defesa';
      else if (roll < (regularizedDay === null ? 0.07 : 0.1)) status = 'Cancelada';
      else if (roll < (regularizedDay === null ? 0.32 : 0.8)) { const paid = autoDay + between(`pago:${key}`, 12, 110); if (paid <= anchorDay) { status = 'Paga'; paidAt = toDate(paid); } else status = 'Em julgamento'; }
      else status = age < 180 ? 'Em julgamento' : 'Dívida ativa';
      auto = { id: `AI-${tipo}-${key}`, date: toDate(autoDay), valor: fine(tipo, place.companyId, key), status, ...(paidAt ? { paidAt } : {}) };
    }
    const acao: Acao = { id, tipo, origem, date: toDate(actionDay), establishmentId: place.id, companyId: place.companyId, greId: place.greId, cityId: place.cityId, ...(regularizedDay !== null ? { regularizedAt: toDate(regularizedDay), resolucao } : {}), ...(auto ? { auto } : {}), ...(contractId ? { contractId } : {}) };
    acoes.push(acao); return acao;
  };

  /* 1. Falta de registro: CNPJ ativo na Receita, CNAE de engenharia. */
  for (const place of dataset.establishments) {
    const eligible = isValidEnterpriseCnpj(place.cnpj) && [place.cnaeMain, ...place.cnaeSecondary].some(code => ['Relacionado', 'Depende de análise'].includes(cnaes.get(code)?.classification ?? ''));
    if (!eligible) continue;
    const opened = Math.max(toDay(place.openedAt), startDay);
    const first = (registrations.get(place.id) ?? []).map(row => toDay(row.startedAt)).sort((a, b) => a - b)[0];
    const publicContract = (until: number) => (contractsBy.get(place.id) ?? []).some(row => technicalCategories.has(row.category) && toDay(row.date) <= until);
    const origem = (key: string, until: number): Origem => publicContract(until) ? 'Contrato público (PNCP)' : chance(`origem:${key}`) < 0.5 ? 'Cruzamento Receita (CNAE)' : chance(`origem2:${key}`) < 0.45 ? 'Denúncia' : 'Rotina de campo';
    // a) primeiro registro induzido por ação de fiscalização.
    if (first !== undefined && first >= startDay + 30 && first <= anchorDay && chance(`induzido:${place.id}`) < 0.34) {
      const actionDay = first - between(`antes:${place.id}`, 20, 160);
      if (actionDay >= opened) {
        const acao = act('registro', origem(place.id, actionDay), place.id, place, actionDay, first, 0.75, 'Registro obtido');
        alvos.push({ id: `ALVO-registro-${place.id}`, tipo: 'registro', establishmentId: place.id, companyId: place.companyId, greId: place.greId, cityId: place.cityId, since: toDate(Math.max(opened, actionDay - 30)), regularizedAt: toDate(first), resolucao: 'Registro obtido', acaoId: acao.id });
      }
    }
    // b) sem registro ativo hoje (nunca registrado ou registro inativo): alvo em aberto.
    if (place.rfbStatus === 'Ativa' && toDay(place.openedAt) <= anchorDay && !activeNow(place.id)) {
      const ceased = (registrations.get(place.id) ?? []).map(row => row.ceasedAt ? toDay(row.ceasedAt) : -Infinity).sort((a, b) => b - a)[0];
      const key = `${place.id}-aberto`, since = Math.max(toDay(place.openedAt), Number.isFinite(ceased) ? ceased : -Infinity);
      let acaoId: string | undefined;
      // Data sorteada uniformemente nos últimos dois anos; se cair antes de o alvo existir, ele ainda não foi alcançado.
      const actionDay = between(`dia:${key}`, Math.max(anchorDay - 730, startDay), anchorDay - 5);
      if (chance(`acao:${key}`) < 0.6 && actionDay >= since + 30) acaoId = act('registro', origem(key, actionDay), key, place, actionDay, null, 0.8).id;
      alvos.push({ id: `ALVO-registro-${key}`, tipo: 'registro', establishmentId: place.id, companyId: place.companyId, greId: place.greId, cityId: place.cityId, since: toDate(since), ...(acaoId ? { acaoId } : {}) });
    }
  }

  /* 2. RT baixado sem substituto em 30 dias, em empresa registrada. */
  const linksBy = new Map<string, Dataset['technicalLinks']>();
  for (const row of dataset.technicalLinks) linksBy.set(row.companyId, [...(linksBy.get(row.companyId) ?? []), row]);
  for (const [companyId, links] of linksBy) {
    const place = main.get(companyId); if (!place) continue;
    for (const link of links) {
      if (!link.endDate) continue;
      const gapStart = toDay(link.endDate) + 30;
      if (gapStart < startDay || gapStart > anchorDay) continue;
      const covered = (day: number) => links.some(other => other !== link && toDay(other.startDate) <= day && (!other.endDate || toDay(other.endDate) > day));
      if (covered(gapStart)) continue;
      const registered = (registrations.get(place.id) ?? []).some(row => toDay(row.startedAt) <= gapStart && (!row.ceasedAt || toDay(row.ceasedAt) > gapStart));
      if (!registered) continue;
      const replacement = links.filter(other => toDay(other.startDate) > gapStart).map(other => toDay(other.startDate)).sort((a, b) => a - b)[0];
      const closed = (registrations.get(place.id) ?? []).map(row => row.ceasedAt ? toDay(row.ceasedAt) : Infinity).filter(day => day > gapStart).sort((a, b) => a - b)[0];
      const options = [replacement, closed].filter((day): day is number => day !== undefined && day <= anchorDay);
      const regularized = options.length ? Math.min(...options) : null;
      const resolucao: Resolucao = regularized !== null && regularized === replacement ? 'RT indicado' : 'Baixa do registro';
      const key = link.id;
      let acaoId: string | undefined;
      const latest = regularized === null ? anchorDay - 5 : regularized - 5;
      if (latest > gapStart && chance(`rt:${key}`) < (regularized === null ? 0.55 : 0.6)) acaoId = act('rt', 'Cadastro CREA', key, place, between(`rtdia:${key}`, gapStart, Math.min(latest, gapStart + 200)), regularized, 0.65, resolucao).id;
      if (regularized === null || acaoId) alvos.push({ id: `ALVO-rt-${key}`, tipo: 'rt', establishmentId: place.id, companyId, greId: place.greId, cityId: place.cityId, since: toDate(gapStart), ...(regularized !== null ? { regularizedAt: toDate(regularized), resolucao } : {}), ...(acaoId ? { acaoId } : {}) });
    }
  }

  /* 3. Contrato público técnico de empresa registrada sem ART em até 60 dias. */
  const establishments = new Map(dataset.establishments.map(row => [row.id, row]));
  for (const contract of dataset.contracts) {
    if (!technicalCategories.has(contract.category) || !classifyDigitalObject(contract.object).engineering) continue;
    const place = establishments.get(contract.establishmentId); if (!place) continue;
    const day = toDay(contract.date), since = day + 60;
    if (since < startDay || since > anchorDay || !activeAt(place.id, day)) continue;
    const arts = artsBy.get(contract.companyId) ?? [];
    if (arts.some(artDay => artDay >= day - 30 && artDay <= since)) continue;
    const later = arts.filter(artDay => artDay > since && artDay <= since + 240 && artDay <= anchorDay).sort((a, b) => a - b)[0];
    const regularized = later ?? null, key = contract.id;
    let acaoId: string | undefined;
    const latest = regularized === null ? anchorDay - 5 : regularized - 5;
    if (latest > since && chance(`art:${key}`) < (regularized === null ? 0.45 : 0.55)) acaoId = act('art', chance(`artorigem:${key}`) < 0.7 ? 'Contrato público (PNCP)' : 'Rotina de campo', key, place, between(`artdia:${key}`, since, Math.min(latest, since + 150)), regularized, 0.5, 'ART recolhida', contract.id).id;
    if (regularized === null || acaoId) alvos.push({ id: `ALVO-art-${key}`, tipo: 'art', establishmentId: place.id, companyId: place.companyId, greId: place.greId, cityId: place.cityId, since: toDate(since), ...(regularized !== null ? { regularizedAt: toDate(regularized), resolucao: 'ART recolhida' as Resolucao } : {}), ...(acaoId ? { acaoId } : {}) });
  }

  const result: Fiscalizacao = { acoes: acoes.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)), alvos, start: toDate(startDay), anchor };
  cache.set(dataset, result); return result;
}
