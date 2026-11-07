import { data, int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { nomeEmpresa } from '../cockpit/ui';
import { municipioPorId } from '../domain/municipios';
import type { Linha, LinhaColaborador, Protocolo, Situacao } from '../domain/atendimento';
import { g } from '../gestao/comum';

/**
 * Peças comuns das três páginas do painel de Atendimento (07/11/2026). Toda lista abre com o serviço, quem pediu, o status, com quem
 * está o protocolo e há quantos dias úteis ele está com o Crea-SP, contra o prazo do serviço.
 */
export const a = (ctx: CockpitCtx) => g(ctx).atendimento!;
export const decimal = (value: number, digits = 1) => value.toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: digits });
export const diasUteisTexto = (value: number | null) => value === null ? '—' : `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${value === 1 ? 'dia útil' : 'dias úteis'}`;
export const pctOu = (value: number | null, digits = 0) => value === null ? '—' : pct(value, digits);

/** As cinco situações do painel antigo, sempre com as mesmas cores. */
export const coresSituacao = (tokens: CockpitCtx['tokens']): Record<Situacao, string> => ({ Aberto: tokens.cat[0], 'Exigência': tokens.cat[1], 'Sem pagamento': tokens.cat[2], Cancelado: tokens.line, Fechado: tokens.cat[3] });

export const nomeColaborador = (ctx: CockpitCtx, id: string | null) => id ? a(ctx).base.colaboradores.get(id)?.nome ?? id : 'sem atribuição';
export function solicitanteDe(ctx: CockpitCtx, p: Protocolo) {
  if (p.companyId) return nomeEmpresa(ctx, p.companyId);
  if (p.profissionalId) return ctx.profissionais.modelo.porId.get(p.profissionalId)?.nome ?? 'Profissional';
  return p.solicitante;
}
const fora = (rows: Linha[]) => rows.filter(l => l.prazo === 'Fora do prazo').length;

/** Lista de protocolos no painel lateral, os que estão há mais dias úteis com o Crea-SP primeiro. */
export function abrirProtocolos(ctx: CockpitCtx, title: string, rows: Linha[], what: string, use?: string, eyebrow?: string) {
  if (!rows.length) return;
  const cidades = municipioPorId(ctx.dataset);
  ctx.open({ kind: 'linhas', title, eyebrow, what, use, listTitle: 'Protocolos, há mais dias com o Crea-SP primeiro',
    summary: [['Protocolos', int(rows.length)], ['Fora do prazo', int(fora(rows))], ['Sem atribuição', int(rows.filter(l => !l.com && l.situacao !== 'Fechado' && l.situacao !== 'Cancelado').length)]],
    rows: rows.map(l => ({ key: l.p.id, ...(l.p.companyId ? { companyId: l.p.companyId } : {}), title: l.p.subtipo,
      subtitle: `${solicitanteDe(ctx, l.p)}, ${cidades.get(l.p.cityId)?.nome ?? ''}; protocolo ${l.p.numero}, aberto em ${data(l.p.abertoEm)}`,
      value: l.fechadoEm ? `${l.status} em ${data(l.fechadoEm)}` : l.status,
      note: `${l.prazo ? `${l.prazo.toLowerCase()}: ` : ''}${diasUteisTexto(l.diasCrea)} com o Crea-SP, de ${l.p.prazo}${l.diasSolicitante ? `, e ${int(l.diasSolicitante)} dias corridos com o solicitante` : ''}; ${l.com ? `com ${nomeColaborador(ctx, l.com)}` : 'sem atribuição'}`,
      sortValue: -l.diasCrea })) });
}

/** Os protocolos de um colaborador: a fila dele primeiro, depois os que já fecharam. */
export function abrirColaborador(ctx: CockpitCtx, c: LinhaColaborador) {
  const nomeGre = ctx.dataset.gres.find(row => row.id === c.greId)?.name;
  abrirProtocolos(ctx, c.nome, c.linhas, `${c.cargo}, ${nomeGre ? `lotação na ${nomeGre}` : 'na sede'}. Protocolos abertos no período que estão com esta pessoa no último status: ${int(c.fila.length)} na fila (abertos e em exigência), ${int(c.filaFora.length)} deles fora do prazo, e ${int(c.fechados)} fechados.`,
    'Um número alto não é problema por si: compare com a fila e com o tempo típico das outras pessoas da mesma unidade.', 'Colaborador');
}
