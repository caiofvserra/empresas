import type { Dataset } from '../domain/types';
import { buildInstitutionalModel } from '../domain/institutional';
import type { InstitutionalModel, InstitutionalProgramId, InstitutionalServiceRequest } from '../domain/institutional';
import { median } from '../gestao-v14/metrics';
import { janela } from '../painel/analise';

/** V18 · atendimento, estrutura física, capacitação e orçamento do Conselho (modelo institucional demonstrativo), por regional e período. */
const DAY = 86400000;
const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
const inside = (date: string, start: string, end: string) => date >= start && date <= end;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const share = (part: number, whole: number) => whole > 0 ? part / whole * 100 : null;

/* ---------- Solicitações de atendimento (prazo de referência de 14 dias) ---------- */
export type SituacaoPedido = 'Resolvido no prazo' | 'Resolvido com atraso' | 'Em aberto, prazo vencido' | 'Em aberto, no prazo';
export const situacoesPedido: SituacaoPedido[] = ['Resolvido no prazo', 'Resolvido com atraso', 'Em aberto, prazo vencido', 'Em aberto, no prazo'];
export type Assunto = InstitutionalServiceRequest['category'];
export const assuntos: Assunto[] = ['Atualização cadastral', 'Esclarecimento de registro', 'Orientação sobre ART', 'Informação sobre atribuições'];
/** Situação do pedido na data de corte: resolvido (no prazo ou não) ou em aberto (prazo vencido ou não). */
export function situacaoPedido(row: InstitutionalServiceRequest, corte: string): SituacaoPedido {
  const prazo = addDays(row.createdAt, row.targetDays);
  if (row.resolvedAt && row.resolvedAt <= corte) return row.resolvedAt <= prazo ? 'Resolvido no prazo' : 'Resolvido com atraso';
  return prazo < corte ? 'Em aberto, prazo vencido' : 'Em aberto, no prazo';
}
const vazio = () => Object.fromEntries(situacoesPedido.map(item => [item, [] as InstitutionalServiceRequest[]])) as Record<SituacaoPedido, InstitutionalServiceRequest[]>;
const taxaNoPrazo = (partes: Record<SituacaoPedido, InstitutionalServiceRequest[]>) => share(partes['Resolvido no prazo'].length, partes['Resolvido no prazo'].length + partes['Resolvido com atraso'].length + partes['Em aberto, prazo vencido'].length);
export interface Atendimento {
  pedidos: InstitutionalServiceRequest[]; totalAntes: number; empresas: number;
  partes: Record<SituacaoPedido, InstitutionalServiceRequest[]>; taxaNoPrazo: number | null; taxaNoPrazoAntes: number | null; medianaDias: number | null;
  porAssunto: { assunto: Assunto; total: number; empresas: number; partes: Record<SituacaoPedido, InstitutionalServiceRequest[]> }[];
}
function atendimento(model: InstitutionalModel, greId: string | null, period: number, anchor: string): Atendimento {
  const w = janela(anchor, period), mine = model.serviceRequests.filter(row => !greId || row.greId === greId);
  const pedidos = mine.filter(row => inside(row.createdAt, w.start, w.end)), antes = mine.filter(row => inside(row.createdAt, w.prevStart, w.prevEnd));
  const partes = vazio(), partesAntes = vazio();
  for (const row of pedidos) partes[situacaoPedido(row, anchor)].push(row);
  for (const row of antes) partesAntes[situacaoPedido(row, w.prevEnd)].push(row);
  const resolvidos = pedidos.filter(row => row.resolvedAt && row.resolvedAt <= anchor);
  return { pedidos, totalAntes: antes.length, empresas: pedidos.filter(row => row.userType === 'Empresa').length, partes, taxaNoPrazo: taxaNoPrazo(partes), taxaNoPrazoAntes: taxaNoPrazo(partesAntes),
    medianaDias: median(resolvidos.map(row => daysBetween(row.createdAt, row.resolvedAt!))),
    porAssunto: assuntos.map(assunto => { const rows = pedidos.filter(row => row.category === assunto), own = vazio(); for (const row of rows) own[situacaoPedido(row, anchor)].push(row);
      return { assunto, total: rows.length, empresas: rows.filter(row => row.userType === 'Empresa').length, partes: own }; }) };
}

/* ---------- Coworkings: capacidade, uso observado e custo ---------- */
export interface Unidade { id: string; nome: string; cityId: string; greId: string; mesas: number; disponiveis: number; usadas: number; ocupacao: number | null; usuarios: number; custo: number; custoHora: number | null }
export interface Coworking { unidades: Unidade[]; meses: string[]; celulas: [number, number, number | null][]; ocupacao: number | null; ocupacaoAntes: number | null; usadas: number; disponiveis: number; usuarios: number; custo: number }
function coworking(model: InstitutionalModel, dataset: Dataset, greId: string | null, period: number, anchor: string): Coworking {
  const w = janela(anchor, period), units = model.coworkUnits.filter(row => !greId || row.greId === greId);
  const cities = new Map(dataset.cities.map(row => [row.id, row.name]));
  const usage = new Map<string, { hours: number; people: string[] }>();
  for (const row of model.coworkUsage) { const item = usage.get(row.coworkMonthId) ?? { hours: 0, people: [] }; item.hours += row.usedDeskHours; item.people.push(row.professionalId); usage.set(row.coworkMonthId, item); }
  const monthIn = (month: string, start: string, end: string) => inside(`${month}-01`, `${start.slice(0, 7)}-01`, end);
  const measure = (unitIds: Set<string>, start: string, end: string) => {
    const months = model.coworkMonths.filter(row => unitIds.has(row.unitId) && monthIn(row.month, start, end));
    const disponiveis = sum(months.map(row => row.availableDeskHours)), usadas = sum(months.map(row => usage.get(row.id)?.hours ?? 0));
    return { months, disponiveis, usadas, usuarios: new Set(months.flatMap(row => usage.get(row.id)?.people ?? [])).size };
  };
  const unidades = units.map(unit => {
    const own = measure(new Set([unit.id]), w.start, w.end);
    const custo = sum(model.budgetEntries.filter(row => row.programId === 'coworkings' && row.cityId === unit.cityId && monthIn(row.month, w.start, w.end)).map(row => row.executedCents)) / 100;
    return { id: unit.id, nome: cities.get(unit.cityId) ?? unit.name, cityId: unit.cityId, greId: unit.greId, mesas: unit.desks, disponiveis: own.disponiveis, usadas: own.usadas, ocupacao: share(own.usadas, own.disponiveis), usuarios: own.usuarios, custo, custoHora: own.usadas ? custo / own.usadas : null };
  }).sort((a, b) => (b.ocupacao ?? -1) - (a.ocupacao ?? -1));
  const meses = w.months.slice(-12), ids = new Set(units.map(row => row.id)), total = measure(ids, w.start, w.end), antes = measure(ids, w.prevStart, w.prevEnd);
  const celulas: [number, number, number | null][] = [];
  unidades.forEach((unit, y) => meses.forEach((month, x) => { const row = model.coworkMonths.find(item => item.unitId === unit.id && item.month === month); celulas.push([x, y, row ? share(usage.get(row.id)?.hours ?? 0, row.availableDeskHours) : null]); }));
  return { unidades, meses, celulas, ocupacao: share(total.usadas, total.disponiveis), ocupacaoAntes: share(antes.usadas, antes.disponiveis), usadas: total.usadas, disponiveis: total.disponiveis, usuarios: total.usuarios, custo: sum(unidades.map(row => row.custo)) };
}

/* ---------- Capacitação (formação e orientação técnica): da inscrição à aplicação relatada ---------- */
export interface Etapa { nome: string; valor: number; nota: string }
export interface Capacitacao { atividades: number; etapas: Etapa[]; participantes: number; custo: number; custoPorParticipante: number | null; taxaPresenca: number | null; taxaResposta: number | null; taxaAplicacao: number | null }
function capacitacao(model: InstitutionalModel, greId: string | null, period: number, anchor: string): Capacitacao {
  const w = janela(anchor, period), programas = new Set<InstitutionalProgramId>(['formacao', 'orientacao']);
  const atividades = model.activities.filter(row => programas.has(row.programId) && (!greId || row.greId === greId) && inside(row.date, w.start, w.end));
  const ids = new Set(atividades.map(row => row.id));
  const inscricoes = model.participation.filter(row => ids.has(row.activityId)), presencas = inscricoes.filter(row => row.attended), identificadas = presencas.filter(row => row.professionalId);
  const elegiveis = model.followups.filter(row => ids.has(row.activityId) && row.dueAt <= anchor), respostas = elegiveis.filter(row => row.responded && row.respondedAt! <= anchor);
  const aplicacao = respostas.filter(row => row.outcome === 'Aplicação profissional relatada');
  const participantes = new Set(identificadas.map(row => row.professionalId)).size;
  const custo = sum(model.budgetEntries.filter(row => programas.has(row.programId) && (!greId || row.greId === greId) && inside(`${row.month}-01`, `${w.start.slice(0, 7)}-01`, w.end)).map(row => row.executedCents)) / 100;
  return { atividades: atividades.length, participantes, custo, custoPorParticipante: participantes ? custo / participantes : null,
    taxaPresenca: share(presencas.length, inscricoes.length), taxaResposta: share(respostas.length, elegiveis.length), taxaAplicacao: share(aplicacao.length, respostas.length),
    etapas: [
      { nome: 'Inscrições', valor: inscricoes.length, nota: `${atividades.length} palestras, oficinas e orientações` },
      { nome: 'Presenças', valor: presencas.length, nota: 'compareceram à atividade' },
      { nome: 'Presenças identificadas', valor: identificadas.length, nota: 'com registro profissional informado' },
      { nome: 'Acompanhamento em 90 dias', valor: elegiveis.length, nota: 'presenças com prazo de retorno vencido' },
      { nome: 'Responderam', valor: respostas.length, nota: 'questionário de retorno' },
      { nome: 'Aplicação relatada', valor: aplicacao.length, nota: 'dizem ter aplicado no trabalho (autodeclarado)' },
    ] };
}

/* ---------- Orçamento dos programas: planejado × executado ---------- */
export interface Programa { id: InstitutionalProgramId; nome: string; planejado: number; executado: number; execucao: number | null }
export interface Orcamento { programas: Programa[]; planejado: number; executado: number; execucao: number | null; executadoAntes: number; mensal: { month: string; planejado: number; executado: number }[] }
function orcamento(model: InstitutionalModel, greId: string | null, period: number, anchor: string): Orcamento {
  const w = janela(anchor, period), mine = model.budgetEntries.filter(row => !greId || row.greId === greId);
  const within = (start: string, end: string) => mine.filter(row => inside(`${row.month}-01`, `${start.slice(0, 7)}-01`, end));
  const atual = within(w.start, w.end);
  const programas = model.programs.map(program => { const rows = atual.filter(row => row.programId === program.id), planejado = sum(rows.map(row => row.plannedCents)) / 100, executado = sum(rows.map(row => row.executedCents)) / 100;
    return { id: program.id, nome: program.name, planejado, executado, execucao: share(executado, planejado) }; }).sort((a, b) => b.executado - a.executado);
  const planejado = sum(programas.map(row => row.planejado)), executado = sum(programas.map(row => row.executado));
  const mensal = w.months.filter(month => `${month}-01` >= `${w.start.slice(0, 7)}-01`).map(month => { const rows = atual.filter(row => row.month === month); return { month, planejado: sum(rows.map(row => row.plannedCents)) / 100, executado: sum(rows.map(row => row.executedCents)) / 100 }; });
  return { programas, planejado, executado, execucao: share(executado, planejado), executadoAntes: sum(within(w.prevStart, w.prevEnd).map(row => row.executedCents)) / 100, mensal };
}

export interface Estrutura { atendimento: Atendimento; coworking: Coworking; capacitacao: Capacitacao; orcamento: Orcamento; nota: string }
const cache = new Map<string, Estrutura>();
/** O modelo institucional é calculado uma vez por cenário; os recortes por regional e período ficam em cache. */
export function estruturaDe(dataset: Dataset, greId: string | null, period: number): Estrutura {
  const key = `${greId ?? ''}|${period}`, saved = cache.get(key); if (saved) return saved;
  const model = buildInstitutionalModel(dataset), anchor = dataset.snapshotDate;
  const value = { atendimento: atendimento(model, greId, period, anchor), coworking: coworking(model, dataset, greId, period, anchor), capacitacao: capacitacao(model, greId, period, anchor), orcamento: orcamento(model, greId, period, anchor),
    nota: 'Modelo institucional demonstrativo: território = local de oferta da atividade, unidade ou atendimento. Câmara não se aplica.' };
  cache.set(key, value); return value;
}
