import { brl, data, int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { nomeEmpresa } from '../cockpit/ui';
import { municipioPorId } from '../domain/municipios';
import { alertaNoStatus, dias, nomeColegiado, prescricaoDe } from '../domain/colegiado';
import type { Deliberacao, Desdobramento, Pendente, QuadroColegiado, Tramitacao } from '../domain/colegiado';
import type { Membro } from '../domain/pessoas-conselho';
import { g } from '../gestao/comum';

/**
 * Peças comuns das cinco páginas do painel de Gestão do Conselho (07/11/2026). Toda lista abre com o nome de quem está com o
 * processo, o relator, o conselheiro ou a organização; o alerta da fila segue a regra do Caio (amarelo de 90 a 120 dias no status,
 * vermelho acima de 120, e o total acende acima de um ano).
 */
export const q = (ctx: CockpitCtx): QuadroColegiado => g(ctx).colegiado!;
export const nomeDe = (ctx: CockpitCtx, id: string) => q(ctx).pessoas.get(id)?.nome ?? id;
export const decimal = (value: number, digits = 1) => value.toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: digits });
export const diasOu = (value: number | null) => value === null ? '—' : `${int(value)} dias`;
/** Variação em pontos percentuais, para taxas. */
export const pontos = (now: number | null, before: number | null) => now === null || before === null ? null : now - before;
const alertaTexto = { vermelho: 'alerta vermelho', amarelo: 'alerta amarelo' } as const;

/** Lista de processos pendentes: tipo, colegiado e status, com quem está, há quantos dias no status e no total, e a prescrição dos autos. */
export function abrirPendentes(ctx: CockpitCtx, title: string, rows: Pendente[], what: string, use?: string) {
  if (!rows.length) return;
  const cidades = municipioPorId(ctx.dataset), anchor = ctx.anchor;
  ctx.open({ kind: 'linhas', title, what, use, listTitle: 'Processos, há mais tempo no status primeiro',
    summary: [['Processos', int(rows.length)], ['Em alerta vermelho', int(rows.filter(row => alertaNoStatus(row.diasNoStatus) === 'vermelho').length)], ['Há mais de 1 ano no total', int(rows.filter(row => row.diasTotais > 365).length)]],
    rows: rows.map(row => { const p = row.t.processo, alerta = alertaNoStatus(row.diasNoStatus), prescricao = prescricaoDe(row), pessoa = q(ctx).pessoas.get(row.evento.com);
      return { key: row.t.id, ...(p.companyId ? { companyId: p.companyId } : {}), title: `${p.tipo} · ${nomeColegiado(row.t.colegiado)}`,
        subtitle: `${row.evento.status} com ${pessoa?.nome ?? row.evento.com} (${pessoa?.papel === 'Funcionário' ? 'funcionário' : 'conselheiro'}) · ${p.companyId ? `${nomeEmpresa(ctx, p.companyId)} · ` : ''}${cidades.get(p.cityId)?.nome ?? ''}`,
        value: `${int(row.diasNoStatus)} dias no status${alerta ? ` · ${alertaTexto[alerta]}` : ''}`,
        note: `${int(row.diasTotais)} dias desde a entrada${row.diasTotais > 365 ? ' (mais de 1 ano)' : ''}${prescricao && dias(anchor, prescricao.em) <= 365 ? ` · prescreve em ${data(prescricao.em)} (${prescricao.motivo})` : ''} · ${row.t.id}`, sortValue: -row.diasNoStatus }; }) });
}

/** Lista de processos votados ou recebidos: colegiado, relator, quando entrou e quando foi votado. */
export function abrirTramitacoes(ctx: CockpitCtx, title: string, rows: Tramitacao[], what: string, use?: string) {
  if (!rows.length) return;
  const cidades = municipioPorId(ctx.dataset), anchor = ctx.anchor;
  ctx.open({ kind: 'linhas', title, what, use, listTitle: 'Processos, mais recentes primeiro', summary: [['Processos', int(rows.length)], ['Autos de infração', int(rows.filter(t => t.processo.tipo === 'Auto de infração').length)], ['Relatados com IA', int(rows.filter(t => t.ia).length)]],
    rows: rows.map(t => { const p = t.processo, votado = t.votadoEm <= anchor;
      return { key: t.id, ...(p.companyId ? { companyId: p.companyId } : {}), title: `${p.tipo} · ${nomeColegiado(t.colegiado)}`, subtitle: `relator ${nomeDe(ctx, t.relator)} · ${p.companyId ? `${nomeEmpresa(ctx, p.companyId)} · ` : ''}${cidades.get(p.cityId)?.nome ?? ''}`,
        value: votado ? `votado em ${data(t.votadoEm)}, ${int(dias(t.entrada, t.votadoEm))} dias depois da entrada` : `entrou em ${data(t.entrada)}`,
        note: `relato em ${int(dias(t.distribuidoEm, t.assinadoEm))} dias${t.ia ? ' com IA' : ''} · ${t.id}`, sortValue: -Date.parse(votado ? t.votadoEm : t.entrada) }; }) });
}

/** Lista de conselheiros: câmara, organização que indicou, terço do mandato e o número escolhido para a lista. */
export function abrirMembros(ctx: CockpitCtx, title: string, rows: Membro[], what: string, valor?: (m: Membro) => { value: string; sortValue: number }) {
  if (!rows.length) return;
  ctx.open({ kind: 'linhas', title, what, listTitle: 'Conselheiros', summary: [['Conselheiros', int(rows.length)], ['Conselheiras', int(rows.filter(m => m.genero === 'Feminino').length)], ['Organizações', int(new Set(rows.map(m => m.orgId)).size)]],
    rows: rows.map(m => { const v = valor?.(m); return { key: m.id, title: m.nome, subtitle: `${nomeColegiado(m.camara)} · indicado por ${m.sigla} (${m.natureza.toLowerCase()})`, value: v?.value ?? `mandato de ${m.terco}`, note: `${m.organizacao} · mandato de ${data(m.inicio)} a ${data(m.fim)}`, sortValue: v?.sortValue ?? 0 }; }) });
}

/** Lista de autos de infração depois da câmara: penalidade, alínea, multa e o que aconteceu com ela. */
export function abrirAutos(ctx: CockpitCtx, title: string, rows: Desdobramento[], what: string, use?: string) {
  if (!rows.length) return;
  const anchor = ctx.anchor;
  ctx.open({ kind: 'linhas', title, what, use, listTitle: 'Autos, maior multa primeiro', summary: [['Autos', int(rows.length)], ['Multas da câmara', brl(rows.reduce((n, d) => n + d.multaCamara, 0))], ['Reincidentes', int(rows.filter(d => d.reincidente).length)]],
    rows: rows.map(d => { const p = d.processo, tramitacao = `${p.decisaoPlenario && p.plenarioEm && p.plenarioEm <= anchor ? ` · Plenário: ${p.decisaoPlenario.toLowerCase()}` : ''}${d.confeaEm && d.confeaEm <= anchor ? ' · recurso ao Confea' : ''}`;
      return { key: p.id, ...(p.companyId ? { companyId: p.companyId } : {}), title: p.companyId ? nomeEmpresa(ctx, p.companyId) : `Auto de infração ${p.id}`, subtitle: `${d.desfecho} · alínea ${d.alinea} do art. 73 · câmara ${p.camara}${tramitacao}`,
        value: d.multaCamara ? brl(d.multaCamara) : 'sem multa', note: `${d.pagoEm && d.pagoEm <= anchor ? `paga em ${data(d.pagoEm)}` : d.transitoEm && d.transitoEm <= anchor ? `transitou em julgado em ${data(d.transitoEm)}` : 'em recurso ou no prazo'} · ${p.id}`, sortValue: -d.multaCamara }; }) });
}

/** Lista de deliberações das atas do Plenário: organização, canal, valor, quem propôs e se é da mesma organização. */
export function abrirDeliberacoes(ctx: CockpitCtx, title: string, rows: Deliberacao[], what: string, use?: string) {
  if (!rows.length) return;
  ctx.open({ kind: 'linhas', title, what, use, listTitle: 'Deliberações, mais recentes primeiro', summary: [['Deliberações', int(rows.length)], ['Valor aprovado', brl(rows.reduce((n, d) => n + d.valor, 0))], ['Propostas pela própria organização', int(rows.filter(d => d.conflito).length)]],
    rows: rows.map(d => ({ key: d.id, title: d.organizacao, subtitle: `${d.canal} · ${d.objeto} · proposto por ${nomeDe(ctx, d.proponente)}${d.conflito ? ', conselheiro da mesma organização' : ''}`, value: brl(d.valor), note: `sessão plenária de ${data(d.data)}`, sortValue: -Date.parse(d.data) })) });
}

/** Parte com uma casa, ou "—". */
export const parte = (value: number | null) => value === null ? '—' : pct(value, 1);
