import type { Dataset } from './types';
import { municipiosSp } from './municipios';
import { defaultFilters } from './types';
import { datasetAt, fiscalizacaoAt } from './tempo';
import { buildProfissionais, resumoProfissionais } from './profissionais';
import type { ModeloProfissionais } from './profissionais';
import { buildConselho } from './conselho';
import type { Conselho } from './conselho';
import { buildCarteira, modalidadeDaCamara, quadroDivida } from './gestao';
import { execucaoDoAno } from './financeiro';
import { fin, mesDaData, mesesAte, receitaDoMes } from '../financeiro/dados';
import type { CamaraConselho, Carteira, QuadroDivida } from './gestao';
import { alertaNoStatus, buildColegiado, quadroColegiado } from './colegiado';
import type { BaseColegiado, QuadroColegiado } from './colegiado';
import { selectEnterpriseScope } from '../enterprise-v10/filters';
import { buildEnterpriseModel } from '../enterprise-v10/model';
import type { EnterpriseModel } from '../enterprise-v10/types';
import type { Scope } from './engine';
import { buildFiscalizacao } from '../painel/fiscalizacao';
import type { Fiscalizacao } from '../painel/fiscalizacao';
import { camaraDaEmpresa, janela, resumoFiscal } from '../painel/analise';
import { artsPeriodo } from '../cockpit/medidas';
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
export type IndicadorId = 'mercado' | 'empresas' | 'rt' | 'artsEmpresas' | 'profissionais' | 'novos' | 'anuidadePf' | 'artsProfissionais' | 'regularizacao' | 'acoes' | 'autos' | 'multas'
  | 'receita' | 'divida' | 'perto' | 'execucao' | 'atendimento' | 'solicitacoes' | 'atrasadas' | 'pendentes' | 'vermelho' | 'prescricao' | 'votados';
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
  /**
   * Se as partes se somam: a regional é a soma dos municípios e o estado é a soma das regionais. As contagens de empresas não se
   * somam, porque a empresa com estabelecimentos em mais de um lugar conta em cada um deles, como no painel de Empresas.
   */
  soma: boolean;
  /** Se o painel do assunto separa o número por câmara (pela empresa, pela modalidade do profissional ou pelo colegiado do processo). */
  camara: boolean;
  meta?: keyof Metas;
  /** O número do painel no resumo: um por painel. */
  principal?: boolean;
}
type Def = Omit<Indicador, 'soma' | 'camara'> & Partial<Pick<Indicador, 'soma' | 'camara'>>;
const def = (row: Def): Indicador => ({ soma: true, camara: row.lugar === 'municipio', ...row });
export const INDICADORES: Indicador[] = [
  def({ id: 'mercado', painel: 'empresas', nome: 'Parte do mercado registrada', unidade: 'taxa', tipo: 'estoque', sobeBom: true, lugar: 'municipio', meta: 'cobertura', principal: true }),
  def({ id: 'empresas', painel: 'empresas', nome: 'Empresas registradas', unidade: 'contagem', tipo: 'estoque', sobeBom: true, lugar: 'regional', soma: false, camara: true }),
  def({ id: 'rt', painel: 'empresas', nome: 'Empresas com responsável técnico', unidade: 'taxa', tipo: 'estoque', sobeBom: true, lugar: 'regional', soma: false, camara: true, meta: 'rt' }),
  def({ id: 'artsEmpresas', painel: 'empresas', nome: 'ARTs de empresas', unidade: 'contagem', tipo: 'fluxo', sobeBom: true, lugar: 'regional', soma: false, camara: true }),
  def({ id: 'profissionais', painel: 'profissionais', nome: 'Profissionais com registro ativo', unidade: 'contagem', tipo: 'estoque', sobeBom: true, lugar: 'municipio', principal: true }),
  def({ id: 'novos', painel: 'profissionais', nome: 'Registros novos', unidade: 'contagem', tipo: 'fluxo', sobeBom: true, lugar: 'municipio' }),
  def({ id: 'anuidadePf', painel: 'profissionais', nome: 'Profissionais com a anuidade em dia', unidade: 'taxa', tipo: 'estoque', sobeBom: true, lugar: 'municipio', meta: 'adimplencia' }),
  def({ id: 'artsProfissionais', painel: 'profissionais', nome: 'ARTs de profissionais', unidade: 'contagem', tipo: 'fluxo', sobeBom: true, lugar: 'municipio' }),
  def({ id: 'regularizacao', painel: 'fiscalizacao', nome: 'Ações que terminaram em regularização', unidade: 'taxa', tipo: 'fluxo', sobeBom: true, lugar: 'municipio', meta: 'regularizacao', principal: true }),
  def({ id: 'acoes', painel: 'fiscalizacao', nome: 'Ações de fiscalização', unidade: 'contagem', tipo: 'fluxo', sobeBom: true, lugar: 'municipio' }),
  def({ id: 'autos', painel: 'fiscalizacao', nome: 'Autos de infração', unidade: 'contagem', tipo: 'fluxo', sobeBom: false, lugar: 'municipio' }),
  def({ id: 'multas', painel: 'fiscalizacao', nome: 'Multas aplicadas', unidade: 'reais', tipo: 'fluxo', sobeBom: false, lugar: 'municipio' }),
  def({ id: 'receita', painel: 'financeiro', nome: 'Receita do Conselho', unidade: 'reais', tipo: 'fluxo', sobeBom: true, lugar: 'estado', principal: true }),
  def({ id: 'divida', painel: 'financeiro', nome: 'Anuidades vencidas', unidade: 'reais', tipo: 'estoque', sobeBom: false, lugar: 'municipio', camara: false }),
  def({ id: 'perto', painel: 'financeiro', nome: 'Dívida perto de prescrever', unidade: 'reais', tipo: 'estoque', sobeBom: false, lugar: 'municipio', camara: false }),
  def({ id: 'execucao', painel: 'financeiro', nome: 'Orçamento de despesa executado no ano', unidade: 'taxa', tipo: 'fluxo', sobeBom: true, lugar: 'estado' }),
  def({ id: 'atendimento', painel: 'atendimento', nome: 'Solicitações resolvidas no prazo', unidade: 'taxa', tipo: 'fluxo', sobeBom: true, lugar: 'regional', meta: 'atendimento', principal: true }),
  def({ id: 'solicitacoes', painel: 'atendimento', nome: 'Solicitações de atendimento', unidade: 'contagem', tipo: 'fluxo', sobeBom: true, lugar: 'regional' }),
  def({ id: 'atrasadas', painel: 'atendimento', nome: 'Solicitações em aberto com o prazo vencido', unidade: 'contagem', tipo: 'estoque', sobeBom: false, lugar: 'regional' }),
  def({ id: 'pendentes', painel: 'conselho', nome: 'Processos esperando voto', unidade: 'contagem', tipo: 'estoque', sobeBom: false, lugar: 'municipio', principal: true }),
  def({ id: 'vermelho', painel: 'conselho', nome: 'Processos em alerta vermelho', unidade: 'contagem', tipo: 'estoque', sobeBom: false, lugar: 'municipio' }),
  def({ id: 'prescricao', painel: 'conselho', nome: 'Autos perto da prescrição', unidade: 'contagem', tipo: 'estoque', sobeBom: false, lugar: 'municipio' }),
  def({ id: 'votados', painel: 'conselho', nome: 'Processos votados', unidade: 'contagem', tipo: 'fluxo', sobeBom: true, lugar: 'municipio' }),
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
  /** O recorte e o modelo de empresas do estado ("SP") e de cada regional, como o painel de Empresas monta com o filtro de regional. */
  empresas: Map<string, { scope: Scope; modelo: EnterpriseModel }>;
  /** A câmara de cada empresa, pela atividade da matriz (a mesma do filtro de câmara dos painéis). */
  camaraDe: Map<string, string>;
}
const porBase = new WeakMap<Dataset, { carteira: Carteira; colegiado: BaseColegiado; fiscalizacao: Fiscalizacao; profissionais: ModeloProfissionais; camaraDe: Map<string, string> }>();
/** O que não depende da data (a carteira de títulos, as tramitações, a fiscalização inteira e a câmara das empresas), montado uma vez por base. */
function daBase(dataset: Dataset) {
  let value = porBase.get(dataset);
  if (!value) { const profissionais = buildProfissionais(dataset); value = { profissionais, carteira: buildCarteira(dataset, profissionais), colegiado: buildColegiado(dataset), fiscalizacao: buildFiscalizacao(dataset), camaraDe: camaraDaEmpresa(dataset) }; porBase.set(dataset, value); }
  return value;
}
/** Monta as bases da foto na data (a base lida como estava nela) e no período. Leva cerca de dois segundos. */
export function insumosPresidencia(dataset: Dataset, anchor: string, periodo: number): InsumosPresidencia {
  const view = datasetAt(dataset, anchor), base = daBase(dataset);
  const empresas = new Map([ESTADO, ...dataset.gres.map(gre => gre.id)].map(lugar => { const scope = selectEnterpriseScope(view, { ...defaultFilters, period: periodo, greIds: lugar === ESTADO ? [] : [lugar] }); return [lugar, { scope, modelo: buildEnterpriseModel(scope) }]; }));
  const atendimento = new Map(dataset.gres.map(gre => [gre.id, estruturaDe(view, gre.id, periodo).atendimento]));
  return { view, periodo, modelo: empresas.get(ESTADO)!.modelo, profissionais: buildProfissionais(view), f: fiscalizacaoAt(base.fiscalizacao, anchor), conselho: buildConselho(view), carteira: base.carteira, colegiado: base.colegiado, atendimento, empresas, camaraDe: base.camaraDe };
}

/**
 * A foto: para cada indicador, as partes por lugar e câmara, na chave "lugar|câmara". O lugar é o código do município, o da regional
 * ou "SP" para o estado; a câmara fica vazia quando o painel do assunto não separa o número por câmara.
 */
export interface FotoPresidencia {
  data: string; periodo: number; partes: Record<IndicadorId, Map<string, Parcela>>;
  /** As leituras dos painéis que a página de riscos detalha (dívida e fila do colegiado no estado). */
  divida: QuadroDivida; colegiado: QuadroColegiado;
}
export const ESTADO = 'SP';
const chave = (lugar: string, camara = '') => `${lugar}|${camara}`;
export const lugarDaChave = (key: string) => key.slice(0, key.indexOf('|'));
export const camaraDaChave = (key: string) => key.slice(key.indexOf('|') + 1);
/** A câmara do profissional, pela modalidade: a câmara Ambiental e Sanitária não tem modalidade própria no registro. */
const camaraDaModalidade = new Map(Object.entries(modalidadeDaCamara).filter(([, mod]) => mod).map(([camara, mod]) => [mod as string, camara as CamaraConselho]));
export function fotoPresidencia(ins: InsumosPresidencia): FotoPresidencia {
  const { view, periodo, camaraDe } = ins, anchor = view.snapshotDate, w = janela(anchor, periodo);
  const partes = Object.fromEntries(INDICADORES.map(row => [row.id, new Map<string, Parcela>()])) as Record<IndicadorId, Map<string, Parcela>>;
  const somar = (id: IndicadorId, lugar: string, camara: string | undefined, n: number, d = 0) => { const key = chave(lugar, camara ?? ''), p = partes[id].get(key) ?? zero(); p.n += n; p.d += d; partes[id].set(key, p); };
  const estabelecimentos = new Map(view.establishments.map(row => [row.id, row]));

  // Empresas: estabelecimentos com atividade da lista, e os que têm registro ou visto vigente (a cobertura da página Registro), pelo município.
  const vigente = new Set(ins.modelo.metadata.activeEligibleEstablishmentIds);
  for (const id of ins.modelo.metadata.eligibleEstablishmentIds) { const place = estabelecimentos.get(id); if (place) somar('mercado', place.cityId, camaraDe.get(place.companyId), vigente.has(id) ? 1 : 0, 1); }
  // Empresas registradas, com RT e ARTs: o modelo do estado e o de cada regional, porque a empresa conta em cada lugar onde tem estabelecimento.
  for (const [lugar, { scope, modelo }] of ins.empresas) {
    const comRt = new Set(modelo.metrics.rtCoverage.companyIds);
    for (const id of modelo.metadata.activeCompanyIds) { somar('empresas', lugar, camaraDe.get(id), 1); somar('rt', lugar, camaraDe.get(id), comRt.has(id) ? 1 : 0, 1); }
    for (const art of artsPeriodo(scope, periodo).atual) somar('artsEmpresas', lugar, camaraDe.get(art.companyId), 1);
  }

  // Profissionais: os ativos na data, pelo município onde moram e pela câmara da modalidade; os registros novos, a anuidade em dia e as ARTs.
  const p = resumoProfissionais(ins.profissionais, view, null, periodo), inadimplentes = new Set(p.inadimplentes.map(row => row.id));
  for (const row of p.ativos) { const camara = camaraDaModalidade.get(row.modalidade); somar('profissionais', row.cityId, camara, 1); somar('anuidadePf', row.cityId, camara, inadimplentes.has(row.id) ? 0 : 1, 1); }
  for (const row of p.novos) somar('novos', row.cityId, camaraDaModalidade.get(row.modalidade), 1);
  for (const art of p.arts) { const autor = ins.profissionais.porId.get(ins.profissionais.autoria.get(art.id)!); if (autor) somar('artsProfissionais', autor.cityId, camaraDaModalidade.get(autor.modalidade), 1); }

  // Fiscalização: as ações do período, as que já terminaram em regularização, os autos e as multas, pela câmara da empresa.
  const rf = resumoFiscal(ins.f, null, periodo);
  for (const row of rf.acoes) { const camara = camaraDe.get(row.companyId); somar('acoes', row.cityId, camara, 1); somar('regularizacao', row.cityId, camara, row.regularizedAt ? 1 : 0, 1); }
  for (const row of rf.autos) { const camara = camaraDe.get(row.companyId); somar('autos', row.cityId, camara, 1); somar('multas', row.cityId, camara, row.auto!.valor); }

  // Financeiro: a receita e o orçamento são os reais da Transparência, do Conselho inteiro, como nas páginas Receita e Orçamento do
  // painel Financeiro (até o último mês que a Transparência fechou); as anuidades vencidas e as perto de prescrever, pelo município do devedor.
  const mesReal = mesDaData(anchor), ano = execucaoDoAno(fin, 'despesa', mesReal);
  somar('receita', ESTADO, '', mesesAte(mesReal, periodo).reduce((n, m) => n + receitaDoMes(m), 0));
  if (ano.orcado) somar('execucao', ESTADO, '', ano.realizado, ano.orcado);
  const divida = quadroDivida(ins.carteira, anchor, { greId: null, cityId: null, camara: null }, w.start, w.prevEnd, []);
  const pertoIds = new Set(divida.pertoIds);
  for (const devedor of divida.devedores) for (const t of devedor.titulos) {
    somar('divida', t.cityId, '', t.valor);
    if (pertoIds.has(devedor.pessoaId) && (Date.parse(anchor) - Date.parse(t.vencimento)) / 86400000 > 1461) somar('perto', t.cityId, '', t.valor);
  }

  // Atendimento: o painel conhece a regional, e não o município nem a câmara.
  for (const [greId, a] of ins.atendimento) {
    const ok = a.partes['Resolvido no prazo'].length, fora = a.partes['Resolvido com atraso'].length + a.partes['Em aberto, prazo vencido'].length;
    somar('atendimento', greId, '', ok, ok + fora); somar('solicitacoes', greId, '', a.pedidos.length); somar('atrasadas', greId, '', a.partes['Em aberto, prazo vencido'].length);
  }

  // Conselho: a fila do colegiado inteiro, pelo lugar do processo e pelo colegiado onde ele está (a câmara ou o Plenário).
  const colegiado = quadroColegiado(ins.colegiado, ins.profissionais, anchor, w.start, w.prevStart, w.prevEnd, { colegiado: null, greId: null, cityId: null });
  for (const row of colegiado.pendentes) { somar('pendentes', row.t.processo.cityId, row.t.colegiado, 1); if (alertaNoStatus(row.diasNoStatus) === 'vermelho') somar('vermelho', row.t.processo.cityId, row.t.colegiado, 1); }
  for (const row of colegiado.pertoDePrescrever) somar('prescricao', row.t.processo.cityId, row.t.colegiado, 1);
  for (const t of colegiado.votados) somar('votados', t.processo.cityId, t.colegiado, 1);

  return { data: anchor, periodo, partes, divida, colegiado };
}

export interface RecortePresidencia { greId: string | null; cityId: string | null; camara: string | null }
/**
 * Os valores da foto num recorte: o município escolhido, a regional (a soma dos seus municípios) ou o estado, e a câmara. O indicador
 * que só conhece a regional segue a regional do município; o que só conhece o estado fica igual em qualquer recorte; o que não separa
 * por câmara fica igual com qualquer câmara.
 */
export function recortar(foto: FotoPresidencia, dataset: Dataset, recorte: RecortePresidencia): Valores {
  const greDe = new Map(municipiosSp(dataset).map(row => [row.id, row.greId])), out = vazios();
  const greId = recorte.cityId ? greDe.get(recorte.cityId) ?? recorte.greId : recorte.greId;
  for (const ind of INDICADORES) for (const [key, p] of foto.partes[ind.id]) {
    const lugar = lugarDaChave(key);
    if (ind.camara && recorte.camara && camaraDaChave(key) !== recorte.camara) continue;
    const entra = ind.lugar === 'estado' ? true
      : ind.lugar === 'regional' ? (ind.soma ? !greId || lugar === greId : lugar === (greId ?? ESTADO))
      : recorte.cityId ? lugar === recorte.cityId : !greId || greDe.get(lugar) === greId;
    if (entra) { out[ind.id].n += p.n; out[ind.id].d += p.d; }
  }
  return out;
}
/** Os valores de cada regional, para o mapa e o quadro das regionais. */
export const porRegionalDaFoto = (foto: FotoPresidencia, dataset: Dataset, camara: string | null = null) => new Map(dataset.gres.map(gre => [gre.id, recortar(foto, dataset, { greId: gre.id, cityId: null, camara })]));
/** As partes de um indicador por lugar (município, regional ou "SP"), somadas as câmaras, ou só a câmara escolhida quando o indicador separa por câmara. */
export function porLugar(foto: FotoPresidencia, id: IndicadorId, camara: string | null = null) {
  const ind = indicador(id), out = new Map<string, Parcela>();
  for (const [key, p] of foto.partes[id]) {
    if (ind.camara && camara && camaraDaChave(key) !== camara) continue;
    const lugar = lugarDaChave(key), q = out.get(lugar) ?? zero(); q.n += p.n; q.d += p.d; out.set(lugar, q);
  }
  return out;
}
