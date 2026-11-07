import type { Dataset } from './types';
import { municipiosSp } from './municipios';
import { defaultFilters } from './types';
import { datasetAt, fiscalizacaoAt } from './tempo';
import { buildProfissionais, resumoProfissionais } from './profissionais';
import type { ModeloProfissionais } from './profissionais';
import { buildConselho } from './conselho';
import type { Conselho } from './conselho';
import { buildCarteira, mesesAteData, quadroDivida, receitaMensal } from './gestao';
import type { Carteira, QuadroDivida } from './gestao';
import { alertaNoStatus, buildColegiado, quadroColegiado } from './colegiado';
import type { BaseColegiado, QuadroColegiado } from './colegiado';
import { selectEnterpriseScope } from '../enterprise-v10/filters';
import { buildEnterpriseModel } from '../enterprise-v10/model';
import type { EnterpriseModel } from '../enterprise-v10/types';
import { buildFiscalizacao } from '../painel/fiscalizacao';
import type { Fiscalizacao } from '../painel/fiscalizacao';
import { janela, resumoFiscal } from '../painel/analise';
import { estruturaDe } from '../cockpit/estrutura';
import type { Atendimento } from '../cockpit/estrutura';
import type { Metas } from '../cockpit/leitura';

/**
 * Painel da Presidência (07/11/2026): a foto dos indicadores de todos os painéis numa data de referência. Cada número sai das mesmas
 * funções que os painéis de cada assunto usam nos seus cartões (o teste confere), e é guardado em partes (numerador e denominador)
 * por município, por regional ou só no estado, conforme o lugar que o painel do assunto conhece. Assim a regional é a soma dos
 * seus municípios, o estado é a soma das regionais e a taxa sai da soma das partes, no HTML e no Power BI.
 */
export type PainelResumo = 'empresas' | 'profissionais' | 'fiscalizacao' | 'financeiro' | 'atendimento' | 'conselho';
export const paineisResumo: PainelResumo[] = ['empresas', 'profissionais', 'fiscalizacao', 'financeiro', 'atendimento', 'conselho'];
export type IndicadorId = 'mercado' | 'profissionais' | 'anuidadePf' | 'acoes' | 'regularizacao' | 'receita' | 'divida' | 'perto' | 'atendimento' | 'solicitacoes' | 'pendentes' | 'vermelho' | 'prescricao';
export interface Indicador {
  id: IndicadorId; painel: PainelResumo; nome: string;
  /** Taxa (numerador sobre denominador, em %), contagem ou valor em reais. */
  unidade: 'taxa' | 'contagem' | 'reais';
  /** Estoque (situação na data) ou fluxo (soma no período), como no glossário. */
  tipo: 'estoque' | 'fluxo';
  /** Se o número maior é o melhor (pinta a variação de verde). */
  sobeBom: boolean;
  /** O menor lugar que o painel do assunto conhece: o município, a regional ou só o estado. */
  lugar: 'municipio' | 'regional' | 'estado';
  meta?: keyof Metas;
  /** O número do painel no resumo: um por painel. */
  principal?: boolean;
}
export const INDICADORES: Indicador[] = [
  { id: 'mercado', painel: 'empresas', nome: 'Parte do mercado registrada', unidade: 'taxa', tipo: 'estoque', sobeBom: true, lugar: 'municipio', meta: 'cobertura', principal: true },
  { id: 'profissionais', painel: 'profissionais', nome: 'Profissionais com registro ativo', unidade: 'contagem', tipo: 'estoque', sobeBom: true, lugar: 'municipio', principal: true },
  { id: 'anuidadePf', painel: 'profissionais', nome: 'Profissionais com a anuidade em dia', unidade: 'taxa', tipo: 'estoque', sobeBom: true, lugar: 'municipio', meta: 'adimplencia' },
  { id: 'regularizacao', painel: 'fiscalizacao', nome: 'Ações que terminaram em regularização', unidade: 'taxa', tipo: 'fluxo', sobeBom: true, lugar: 'municipio', meta: 'regularizacao', principal: true },
  { id: 'acoes', painel: 'fiscalizacao', nome: 'Ações de fiscalização', unidade: 'contagem', tipo: 'fluxo', sobeBom: true, lugar: 'municipio' },
  { id: 'receita', painel: 'financeiro', nome: 'Receita do Conselho', unidade: 'reais', tipo: 'fluxo', sobeBom: true, lugar: 'estado', principal: true },
  { id: 'divida', painel: 'financeiro', nome: 'Anuidades vencidas', unidade: 'reais', tipo: 'estoque', sobeBom: false, lugar: 'municipio' },
  { id: 'perto', painel: 'financeiro', nome: 'Dívida perto de prescrever', unidade: 'reais', tipo: 'estoque', sobeBom: false, lugar: 'municipio' },
  { id: 'atendimento', painel: 'atendimento', nome: 'Solicitações resolvidas no prazo', unidade: 'taxa', tipo: 'fluxo', sobeBom: true, lugar: 'regional', meta: 'atendimento', principal: true },
  { id: 'solicitacoes', painel: 'atendimento', nome: 'Solicitações de atendimento', unidade: 'contagem', tipo: 'fluxo', sobeBom: true, lugar: 'regional' },
  { id: 'pendentes', painel: 'conselho', nome: 'Processos esperando voto', unidade: 'contagem', tipo: 'estoque', sobeBom: false, lugar: 'municipio', principal: true },
  { id: 'vermelho', painel: 'conselho', nome: 'Processos em alerta vermelho', unidade: 'contagem', tipo: 'estoque', sobeBom: false, lugar: 'municipio' },
  { id: 'prescricao', painel: 'conselho', nome: 'Autos perto da prescrição', unidade: 'contagem', tipo: 'estoque', sobeBom: false, lugar: 'municipio' },
];
export const indicador = (id: IndicadorId) => INDICADORES.find(row => row.id === id)!;

/** Numerador e denominador. Contagens e valores só usam o numerador (o denominador fica zero). */
export interface Parcela { n: number; d: number }
export type Valores = Record<IndicadorId, Parcela>;
const zero = (): Parcela => ({ n: 0, d: 0 });
const vazios = (): Valores => Object.fromEntries(INDICADORES.map(row => [row.id, zero()])) as Valores;

/** O número que o cartão mostra: a taxa em %, ou nulo sem denominador; a contagem e o valor, o próprio numerador. */
export const valorDe = (ind: Indicador, p: Parcela): number | null => ind.unidade === 'taxa' ? (p.d > 0 ? p.n / p.d * 100 : null) : p.n;
/** A variação contra um ano antes: em pontos percentuais nas taxas e em % nas contagens e nos valores. */
export function variacao(ind: Indicador, agora: Parcela, antes: Parcela): number | null {
  const a = valorDe(ind, agora), b = valorDe(ind, antes);
  if (a === null || b === null) return null;
  return ind.unidade === 'taxa' ? a - b : b ? (a - b) / b * 100 : null;
}

/** As bases que a foto lê numa data: as mesmas que os painéis de cada assunto montam. */
export interface InsumosPresidencia {
  view: Dataset; periodo: number; modelo: EnterpriseModel; profissionais: ModeloProfissionais; f: Fiscalizacao;
  conselho: Conselho; carteira: Carteira; colegiado: BaseColegiado; atendimento: Map<string, Atendimento>;
}
const porBase = new WeakMap<Dataset, { carteira: Carteira; colegiado: BaseColegiado; fiscalizacao: Fiscalizacao; profissionais: ModeloProfissionais }>();
/** O que não depende da data (a carteira de títulos, as tramitações e a fiscalização inteiras), montado uma vez por base. */
function daBase(dataset: Dataset) {
  let value = porBase.get(dataset);
  if (!value) { const profissionais = buildProfissionais(dataset); value = { profissionais, carteira: buildCarteira(dataset, profissionais), colegiado: buildColegiado(dataset), fiscalizacao: buildFiscalizacao(dataset) }; porBase.set(dataset, value); }
  return value;
}
/** Monta as bases da foto na data (a base lida como estava nela) e no período. Leva cerca de dois segundos. */
export function insumosPresidencia(dataset: Dataset, anchor: string, periodo: number): InsumosPresidencia {
  const view = datasetAt(dataset, anchor), base = daBase(dataset);
  const modelo = buildEnterpriseModel(selectEnterpriseScope(view, { ...defaultFilters, period: periodo }));
  const atendimento = new Map(dataset.gres.map(gre => [gre.id, estruturaDe(view, gre.id, periodo).atendimento]));
  return { view, periodo, modelo, profissionais: buildProfissionais(view), f: fiscalizacaoAt(base.fiscalizacao, anchor), conselho: buildConselho(view), carteira: base.carteira, colegiado: base.colegiado, atendimento };
}

/** A foto: para cada indicador, as partes por lugar (o código do município, o da regional ou "SP" para o estado). */
export interface FotoPresidencia {
  data: string; periodo: number; partes: Record<IndicadorId, Map<string, Parcela>>;
  /** As leituras dos painéis que a página de riscos detalha (dívida e fila do colegiado no estado). */
  divida: QuadroDivida; colegiado: QuadroColegiado;
}
export const ESTADO = 'SP';
export function fotoPresidencia(ins: InsumosPresidencia): FotoPresidencia {
  const { view, periodo, modelo } = ins, anchor = view.snapshotDate, w = janela(anchor, periodo);
  const partes = Object.fromEntries(INDICADORES.map(row => [row.id, new Map<string, Parcela>()])) as Record<IndicadorId, Map<string, Parcela>>;
  const somar = (id: IndicadorId, lugar: string, n: number, d = 0) => { const p = partes[id].get(lugar) ?? zero(); p.n += n; p.d += d; partes[id].set(lugar, p); };
  const estabelecimentos = new Map(view.establishments.map(row => [row.id, row]));

  // Empresas: estabelecimentos com atividade da lista, e os que têm registro ou visto vigente (a cobertura da página Registro).
  const vigente = new Set(modelo.metadata.activeEligibleEstablishmentIds);
  for (const id of modelo.metadata.eligibleEstablishmentIds) { const place = estabelecimentos.get(id); if (place) somar('mercado', place.cityId, vigente.has(id) ? 1 : 0, 1); }

  // Profissionais: os ativos na data, pelo município onde moram, e os que estão com a anuidade em dia.
  const p = resumoProfissionais(ins.profissionais, view, null, periodo), inadimplentes = new Set(p.inadimplentes.map(row => row.id));
  for (const row of p.ativos) { somar('profissionais', row.cityId, 1); somar('anuidadePf', row.cityId, inadimplentes.has(row.id) ? 0 : 1, 1); }

  // Fiscalização: as ações do período e as que já terminaram em regularização.
  for (const row of resumoFiscal(ins.f, null, periodo).acoes) { somar('acoes', row.cityId, 1); somar('regularizacao', row.cityId, row.regularizedAt ? 1 : 0, 1); }

  // Financeiro: a receita do Conselho não tem lugar; as anuidades vencidas e as perto de prescrever, pelo município do devedor.
  somar('receita', ESTADO, receitaMensal(ins.conselho, mesesAteData(anchor, periodo)).reduce((n, row) => n + row.total, 0));
  const divida = quadroDivida(ins.carteira, anchor, { greId: null, cityId: null, camara: null }, w.start, w.prevEnd, []);
  const pertoIds = new Set(divida.pertoIds);
  for (const devedor of divida.devedores) for (const t of devedor.titulos) {
    somar('divida', t.cityId, t.valor);
    if (pertoIds.has(devedor.pessoaId) && (Date.parse(anchor) - Date.parse(t.vencimento)) / 86400000 > 1461) somar('perto', t.cityId, t.valor);
  }

  // Atendimento: o painel conhece a regional, e não o município.
  for (const [greId, a] of ins.atendimento) {
    const ok = a.partes['Resolvido no prazo'].length, fora = a.partes['Resolvido com atraso'].length + a.partes['Em aberto, prazo vencido'].length;
    somar('atendimento', greId, ok, ok + fora); somar('solicitacoes', greId, a.pedidos.length);
  }

  // Conselho: a fila do colegiado inteiro, pelo lugar do processo.
  const colegiado = quadroColegiado(ins.colegiado, ins.profissionais, anchor, w.start, w.prevStart, w.prevEnd, { colegiado: null, greId: null, cityId: null });
  for (const row of colegiado.pendentes) { somar('pendentes', row.t.processo.cityId, 1); if (alertaNoStatus(row.diasNoStatus) === 'vermelho') somar('vermelho', row.t.processo.cityId, 1); }
  for (const row of colegiado.pertoDePrescrever) somar('prescricao', row.t.processo.cityId, 1);

  return { data: anchor, periodo, partes, divida, colegiado };
}

export interface RecortePresidencia { greId: string | null; cityId: string | null }
/**
 * Os valores da foto num recorte: o município escolhido, a regional (a soma dos seus municípios) ou o estado. O indicador que só
 * conhece a regional segue a regional do município; o que só conhece o estado fica igual em qualquer recorte.
 */
export function recortar(foto: FotoPresidencia, dataset: Dataset, recorte: RecortePresidencia): Valores {
  const greDe = new Map(municipiosSp(dataset).map(row => [row.id, row.greId])), out = vazios();
  const greId = recorte.cityId ? greDe.get(recorte.cityId) ?? recorte.greId : recorte.greId;
  for (const ind of INDICADORES) for (const [lugar, p] of foto.partes[ind.id]) {
    const entra = ind.lugar === 'estado' ? true
      : ind.lugar === 'regional' ? !greId || lugar === greId
      : recorte.cityId ? lugar === recorte.cityId : !greId || greDe.get(lugar) === greId;
    if (entra) { out[ind.id].n += p.n; out[ind.id].d += p.d; }
  }
  return out;
}
/** Os valores de cada regional, para o mapa e o quadro das regionais. */
export const porRegionalDaFoto = (foto: FotoPresidencia, dataset: Dataset) => new Map(dataset.gres.map(gre => [gre.id, recortar(foto, dataset, { greId: gre.id, cityId: null })]));
