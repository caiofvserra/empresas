import type { Scope } from '../domain/engine';
import type { Art, Dataset } from '../domain/types';
import type { EnterpriseModel } from '../enterprise-v10/types';
import { greScorecard, mainEstablishments, median, quantile } from '../gestao-v14/metrics';
import type { Acao, Fiscalizacao, StatusMulta } from '../painel/fiscalizacao';
import { camaraDaEmpresa, camaras, devedoras, distribuicaoGre, janela } from '../painel/analise';
import type { Camara, Regional, ResumoFiscal } from '../painel/analise';
import type { Malha } from './cruzamentos';

/** V18 · medidas de cadastro, responsabilidade técnica, fiscalização e regionais usadas pelo cockpit. */
const DAY = 86400000;
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`)) / DAY);
const inside = (date: string, start: string, end: string) => date >= start && date <= end;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const share = (part: number, whole: number) => whole > 0 ? part / whole * 100 : null;
const short = (name: string) => name.split('·')[1]?.trim() ?? name;

/* ---------- Cadastro ---------- */
export interface MesBase { month: string; base: number; viaFiscalizacao: string[]; demais: string[]; saidas: string[] }
/** Entradas do mês separadas entre as que vieram após ação de fiscalização de registro e as demais (espontâneas e retornos). */
export function entradasSaidas(history: EnterpriseModel, f: Fiscalizacao): MesBase[] {
  const induzidas = new Map<string, Set<string>>();
  for (const row of f.acoes) if (row.tipo === 'registro' && row.regularizedAt) { const month = row.regularizedAt.slice(0, 7); induzidas.set(month, (induzidas.get(month) ?? new Set()).add(row.companyId)); }
  return history.monthly.map(row => { const set = induzidas.get(row.month);
    return { month: row.month, base: row.base, viaFiscalizacao: row.enteredIds.filter(id => set?.has(id)), demais: row.enteredIds.filter(id => !set?.has(id)), saidas: row.exitedIds }; });
}
export const portes = ['Microempresa', 'Pequena empresa', 'Média empresa', 'Grande empresa'];
export function camaraPorte(dataset: Dataset, model: EnterpriseModel) {
  const camara = camaraDaEmpresa(dataset), size = new Map(dataset.companies.map(row => [row.id, row.size as string]));
  return camaras.map(name => ({ camara: name, portes: portes.map(porte => ({ porte, ids: model.metadata.activeCompanyIds.filter(id => camara.get(id) === name && size.get(id) === porte) })) }))
    .filter(row => row.portes.some(item => item.ids.length));
}
export function pagamento(model: EnterpriseModel) {
  const debtors = devedoras(model), ativas = model.metadata.activeCompanyIds;
  return { emDia: ativas.filter(id => !debtors.has(id)), inadimplentes: ativas.filter(id => debtors.has(id)) };
}
export interface Faixa { nome: string; ids: string[]; dias: number[] }
/** Prazo entre o pedido e o início do registro, para registros concedidos no período. */
export function prazoRegistro(scope: Scope, period: number) {
  const w = janela(scope.anchor, period);
  const rows = scope.dataset.registrations.filter(row => scope.companyIds.has(row.companyId) && row.type === 'Registro' && inside(row.startedAt, w.start, w.end) && row.requestedAt <= row.startedAt);
  const limites: [string, number][] = [['até 5', 5], ['6 a 10', 10], ['11 a 15', 15], ['16 a 20', 20], ['21 a 30', 30], ['mais de 30', Infinity]];
  const faixas: Faixa[] = limites.map(([nome]) => ({ nome, ids: [], dias: [] }));
  const dias = rows.map(row => { const value = daysBetween(row.requestedAt, row.startedAt), index = limites.findIndex(([, max]) => value <= max); faixas[index].ids.push(row.companyId); faixas[index].dias.push(value); return value; });
  return { total: rows.length, mediana: median(dias), p90: quantile(dias, 0.9), faixas };
}

/* ---------- Responsabilidade técnica e ART ---------- */
export function artsPeriodo(scope: Scope, period: number) {
  const w = janela(scope.anchor, period), mine = scope.dataset.arts.filter(row => scope.companyIds.has(row.companyId) && row.date <= scope.anchor);
  const atual = mine.filter(row => inside(row.date, w.start, w.end)), antes = mine.filter(row => inside(row.date, w.prevStart, w.prevEnd));
  return { atual, antes: antes.length, valor: sum(atual.map(row => row.value)), valorAntes: sum(antes.map(row => row.value)), mensal: w.months.map(month => mine.filter(row => row.date.startsWith(month)).length), months: w.months };
}
export function artPorModalidade(arts: Art[]) {
  const groups = new Map<string, Art[]>();
  for (const row of arts) groups.set(row.modality, [...(groups.get(row.modality) ?? []), row]);
  return [...groups].map(([modalidade, rows]) => ({ modalidade, quantidade: rows.length, valor: sum(rows.map(row => row.value)), ids: [...new Set(rows.map(row => row.companyId))] })).sort((a, b) => b.quantidade - a.quantidade);
}
/** ARTs de empresas por regional (GRE da matriz) e mês, nos últimos 12 meses. */
export function artRegionalMes(dataset: Dataset, arts: Art[], anchor: string) {
  const main = mainEstablishments(dataset), months = janela(anchor, 12).months.slice(-12);
  const gres = dataset.gres.filter(gre => arts.some(row => main.get(row.companyId)?.greId === gre.id));
  const cells: [number, number, number][] = [];
  gres.forEach((gre, y) => months.forEach((month, x) => cells.push([x, y, arts.filter(row => row.date.startsWith(month) && main.get(row.companyId)?.greId === gre.id).length])));
  return { months, gres: gres.map(row => ({ id: row.id, name: row.name })), cells };
}
export function artPorCamara(dataset: Dataset, model: EnterpriseModel) {
  const camara = camaraDaEmpresa(dataset), facts = new Map(model.companyFacts.map(row => [row.companyId, row]));
  return camaras.map(name => { const ativas = model.metadata.activeCompanyIds.filter(id => camara.get(id) === name);
    return { camara: name as Camara, ativas, semArt: ativas.filter(id => !facts.get(id)?.artCount) }; }).filter(row => row.ativas.length);
}

/* ---------- Fiscalização: caminho das ações do período (rito da Res. Confea 1.008/2004) ---------- */
export const destinoAuto: Record<StatusMulta, string> = { Paga: 'Multa paga', 'Em prazo de defesa': 'Em prazo de defesa', 'Em julgamento': 'Em julgamento', 'Dívida ativa': 'Inscrita em dívida ativa', Cancelada: 'Auto cancelado' };
export interface NoCaminho { name: string; value: number; acoes: Acao[] }
export function caminhoAcoes(resumo: ResumoFiscal): { nodes: NoCaminho[]; links: { source: string; target: string; value: number; acoes: Acao[] }[] } {
  const raiz = 'Ações fiscalizatórias', auto = 'Auto de infração lavrado', groups = new Map<string, Acao[]>();
  const put = (key: string, acao: Acao) => groups.set(key, [...(groups.get(key) ?? []), acao]);
  for (const acao of resumo.acoes) {
    if (acao.auto) { put(auto, acao); put(destinoAuto[acao.auto.status], acao); }
    else put(acao.regularizedAt ? 'Regularizada após notificação' : 'Notificada, sem desfecho', acao);
  }
  const nodes: NoCaminho[] = [{ name: raiz, value: resumo.acoes.length, acoes: resumo.acoes }], links: { source: string; target: string; value: number; acoes: Acao[] }[] = [];
  for (const name of ['Regularizada após notificação', auto, 'Notificada, sem desfecho']) { const acoes = groups.get(name) ?? []; if (acoes.length) { nodes.push({ name, value: acoes.length, acoes }); links.push({ source: raiz, target: name, value: acoes.length, acoes }); } }
  for (const name of Object.values(destinoAuto)) { const acoes = groups.get(name) ?? []; if (acoes.length) { nodes.push({ name, value: acoes.length, acoes }); links.push({ source: auto, target: name, value: acoes.length, acoes }); } }
  return { nodes, links };
}

/* ---------- Regionais: uma linha por GRE com todos os assuntos ---------- */
export interface LinhaGre {
  id: string; name: string; curto: string; base: number; spark: number[]; crescimento: number | null;
  cobertura: number | null; rt: number | null; empregoVar: number | null; empregoTecnico: number;
  semRegistro: number; semRegistroIds: string[]; pctSemRegistro: number | null;
  ativas: string[]; devedoras: string[]; inadimplencia: number | null; saldoVencido: number; arrecadacao: number;
  acoes: number; autos: number; multas: number; regularizadas: number | null; arts: number; indicios: string[];
}
/** Usa o modelo de todas as regionais (recorte de câmara e período), para comparar regionais mesmo com uma GRE selecionada. */
export function linhasGre(model: EnterpriseModel, history: EnterpriseModel, scope: Scope, regionais: Regional[], period: number, malha: Malha, arts: Art[]): LinhaGre[] {
  const main = mainEstablishments(scope.dataset), gre = (companyId: string) => main.get(companyId)?.greId;
  const dist = new Map(distribuicaoGre(scope, model).map(row => [row.id, row])), fiscal = new Map(regionais.map(row => [row.id, row]));
  return greScorecard(model, history, scope).map(row => {
    const d = dist.get(row.id), r = fiscal.get(row.id), ativas = d ? [...d.emDia, ...d.inadimplentes] : [];
    const before = row.spark.length > period ? row.spark[row.spark.length - 1 - period] : null, last = row.spark.at(-1) ?? 0;
    return { id: row.id, name: row.name, curto: short(row.name), base: row.base, spark: row.spark, crescimento: before ? (last - before) / before * 100 : null,
      cobertura: row.coverage, rt: row.rtCoverage, empregoVar: row.jobGrowth, empregoTecnico: r?.empregoTecnico ?? 0,
      semRegistro: r?.semRegistro ?? d?.semRegistro.length ?? 0, semRegistroIds: d?.semRegistro ?? [], pctSemRegistro: r?.pctSemRegistro ?? null,
      ativas, devedoras: d?.inadimplentes ?? [], inadimplencia: share(d?.inadimplentes.length ?? 0, ativas.length), saldoVencido: row.overdue, arrecadacao: row.receipts,
      acoes: r?.acoes ?? 0, autos: r?.autos ?? 0, multas: r?.aplicada ?? 0, regularizadas: r?.taxa ?? null,
      arts: arts.filter(art => gre(art.companyId) === row.id).length, indicios: malha.empresas.filter(id => gre(id) === row.id) };
  });
}
