import { useMemo } from 'react';
import { municipioPorId } from '../domain/municipios';
import { variacaoPlana } from '../cockpit/formatos';
import { brl, int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import type { PageId } from '../cockpit/leitura';
import { INDICADORES, indicador, recortar, valorDe, variacao } from '../domain/presidencia';
import type { Indicador, IndicadorId, PainelResumo, Valores } from '../domain/presidencia';

/**
 * Peças comuns das páginas do painel da Presidência (07/11/2026). Todo número sai da foto dos indicadores (src/domain/presidencia.ts),
 * a mesma conta dos cartões de cada painel, no recorte escolhido no alto da tela: o estado, uma regional ou um município.
 */
export const nomePainel: Record<PainelResumo, string> = { empresas: 'Empresas', profissionais: 'Profissionais', fiscalizacao: 'Fiscalização', financeiro: 'Financeiro', atendimento: 'Atendimento', conselho: 'Gestão do Conselho' };
/** A página do painel do assunto que mostra o indicador: clicar no número abre essa página, com os mesmos filtros. */
export const destino: Record<IndicadorId, PageId> = {
  mercado: 'mercado', empresas: 'mercado', rt: 'rt', artsEmpresas: 'rt',
  profissionais: 'profissionais', novos: 'fluxo', anuidadePf: 'profissionais', artsProfissionais: 'atuacao',
  regularizacao: 'resultado', acoes: 'fiscalizacao', autos: 'fiscalizacao', multas: 'fiscalizacao',
  receita: 'receita', divida: 'receita', perto: 'receita', execucao: 'orcamento',
  atendimento: 'protocolos', solicitacoes: 'protocolos', atrasadas: 'equipe',
  pendentes: 'colegiado', vermelho: 'processos', prescricao: 'processos', votados: 'colegiado',
};
/** O número no formato do indicador: taxa com uma casa, contagem inteira, reais compactos. */
export function formato(ind: Indicador, value: number | null) {
  if (value === null) return '—';
  return ind.unidade === 'taxa' ? pct(value, 1) : ind.unidade === 'reais' ? brl(value) : int(value);
}
/** A variação escrita: pontos percentuais nas taxas e % no resto. */
export const variacaoTexto = (ind: Indicador, value: number | null) => value === null ? 'sem base' : ind.unidade === 'taxa'
  ? `${value > 0 ? '+' : ''}${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p.` : `${value > 0 ? '+' : ''}${pct(value)}`;
/** Se a variação é boa (verde), ruim (vermelha) ou nula. */
export const sentido = (ind: Indicador, value: number | null): 'good' | 'bad' | 'flat' => value === null || variacaoPlana(value, ind.unidade === 'taxa' ? 'pp' : 'pct') ? 'flat' : (value > 0) === ind.sobeBom ? 'good' : 'bad';

export interface Leitura {
  /** Os valores no recorte na data escolhida e um ano antes (nulos enquanto a foto não foi calculada). */
  atual: Valores | null; antes: Valores | null;
  /** Os valores no recorte nos 13 dias, do mais antigo à data. */
  serie: (Valores | null)[]; datas: string[]; completo: boolean;
  valor: (id: IndicadorId) => number | null; antesDe: (id: IndicadorId) => number | null; variacao: (id: IndicadorId) => number | null;
  /** A série de um indicador (nulo onde a foto ainda não existe). */
  linha: (id: IndicadorId) => (number | null)[];
}
/** Os números da Presidência no recorte do alto da tela. */
export function useLeitura(ctx: CockpitCtx): Leitura {
  const p = ctx.presidencia, recorte = useMemo(() => ({ greId: ctx.greId, cityId: ctx.cidadeId, camara: ctx.camara }), [ctx.greId, ctx.cidadeId, ctx.camara]);
  const fotos = p?.fotos ?? [];
  const serie = useMemo(() => fotos.map(foto => foto ? recortar(foto, ctx.dataset, recorte) : null), [fotos.map(foto => foto?.data ?? '').join('|'), p?.atual?.periodo, recorte, ctx.dataset]); // eslint-disable-line react-hooks/exhaustive-deps
  const atual = serie.at(-1) ?? null, antes = serie[0] ?? null;
  const valor = (id: IndicadorId) => atual ? valorDe(indicador(id), atual[id]) : null;
  const antesDe = (id: IndicadorId) => antes ? valorDe(indicador(id), antes[id]) : null;
  return { atual, antes, serie, datas: p?.datas ?? [], completo: Boolean(p?.completo), valor, antesDe,
    variacao: id => atual && antes ? variacao(indicador(id), atual[id], antes[id]) : null,
    linha: id => serie.map(v => v ? valorDe(indicador(id), v[id]) : null) };
}
export const principais = INDICADORES.filter(row => row.principal);
/** O recorte escrito: "no estado", "na GRE 2" ou "em Campinas", com a câmara quando escolhida. */
export function ondeTexto(ctx: CockpitCtx) {
  const camara = ctx.camara ? `, câmara ${ctx.camara}` : '';
  return `${lugarTexto(ctx)}${camara}`;
}
function lugarTexto(ctx: CockpitCtx) {
  if (ctx.cidadeId) return `em ${municipioNome(ctx, ctx.cidadeId)}`;
  if (ctx.greId) return `na ${ctx.dataset.gres.find(row => row.id === ctx.greId)?.name ?? ctx.greId}`;
  return 'no estado';
}
export const municipioNome = (ctx: CockpitCtx, id: string) => municipioPorId(ctx.dataset).get(id)?.nome ?? id;
export const nomeGre = (ctx: CockpitCtx, id: string) => ctx.dataset.gres.find(row => row.id === id)?.name ?? id;
/** Mistura duas cores "#RRGGBB" (t de 0 a 1): a cor das células dos mapas de calor, que precisa ser conhecida para escolher o texto. */
export function misturar(a: string, b: string, t: number) {
  const hex = (cor: string) => { const m = cor.trim().match(/^#([0-9a-f]{6})$/i); return m ? [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)) : null; };
  const x = hex(a), y = hex(b); if (!x || !y) return t < 0.5 ? a : b;
  return `#${x.map((c, i) => Math.round(c + (y[i] - c) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, '0')).join('')}`;
}
/** Valor de taxa com poucos casos fica de fora do mapa: abaixo deste denominador, o município aparece como "poucos dados". */
export const MINIMO_TAXA = 5;
/**
 * Por que o número não segue todo o recorte: as contagens de empresas não descem ao município, a receita e o orçamento são do
 * Conselho inteiro, e a dívida e os protocolos de atendimento não têm câmara. Nulo quando o número segue o recorte inteiro.
 */
export function ressalva(ctx: CockpitCtx, ind: Indicador) {
  if (ind.lugar === 'estado' && (ctx.greId || ctx.cidadeId || ctx.camara)) return 'do Conselho inteiro';
  if (ind.lugar === 'regional' && ctx.cidadeId) return 'da regional';
  if (!ind.camara && ctx.camara) return 'sem câmara';
  return null;
}
