import type { Dataset } from './types';
import type { ContratoPublico } from '../painel/analise';
import { between, chance, dateBetween, pick, share, sum, toDate, toDay, weighted } from './hash';
import { classeDoEstabelecimento } from '../observatorio/norte';

/**
 * V21 · Medidas de mercado e de dinâmica da base que o levantamento de 29/10 propôs (CASOS_USO.md) e ainda não estavam no painel, todas
 * com fonte de coleta automática: concentração do mercado público técnico (UC34, PNCP), demanda técnica planejada nos planos anuais de
 * contratação (UC33, PNCP · PCA), densidade empresarial por regional (UC31, CNPJ × população IBGE), aberturas de estabelecimentos na
 * Receita (UC05, CNPJ mensal) e permanência de uma coorte de empresas registradas (UC04, base interna). A camada do PCA e a população
 * por município são DEMONSTRATIVAS, derivadas do mesmo cenário determinístico; em produção, o endpoint de PCA do PNCP e a tabela 6579
 * do SIDRA. Tudo é lido na data de referência da base recebida.
 */

/* ---------- UC34 · concentração do mercado público técnico ---------- */
export interface Fornecedor { companyId: string; valor: number; contratos: number; participacao: number; registradaEmTodos: boolean }
export interface Concentracao {
  fornecedores: Fornecedor[]; total: number; n: number; contratos: number;
  /** Participação dos cinco maiores fornecedores (raiz do CNPJ) no valor contratado, em %. */
  top5: number | null;
  /** Índice de Herfindahl-Hirschman: soma dos quadrados das participações em %, de 0 a 10.000. */
  hhi: number | null;
  /** Parte do valor contratado com fornecedor registrado ou com visto na data do contrato, em %. */
  valorRegistrado: number | null;
  porCategoria: { categoria: string; total: number; n: number; top5: number | null; hhi: number | null }[];
}
function concentrar(contratos: ContratoPublico[]) {
  const porEmpresa = new Map<string, { valor: number; contratos: number; registrada: boolean }>();
  for (const row of contratos) { const atual = porEmpresa.get(row.companyId) ?? { valor: 0, contratos: 0, registrada: true }; atual.valor += row.valor; atual.contratos += 1; atual.registrada = atual.registrada && row.registrada; porEmpresa.set(row.companyId, atual); }
  const total = sum(contratos.map(row => row.valor));
  const fornecedores: Fornecedor[] = [...porEmpresa].map(([companyId, row]) => ({ companyId, valor: row.valor, contratos: row.contratos, participacao: total ? row.valor / total * 100 : 0, registradaEmTodos: row.registrada }))
    .sort((a, b) => b.valor - a.valor || a.companyId.localeCompare(b.companyId));
  const top5 = total ? sum(fornecedores.slice(0, 5).map(row => row.participacao)) : null;
  const hhi = total ? Math.round(sum(fornecedores.map(row => row.participacao ** 2))) : null;
  return { fornecedores, total, n: fornecedores.length, top5, hhi };
}
/** Carteira técnica do período, deduplicada por contrato, com a participação de cada fornecedor (raiz do CNPJ). */
export function concentracaoMercado(contratos: ContratoPublico[]): Concentracao {
  const base = concentrar(contratos), categorias = [...new Set(contratos.map(row => row.categoria))].sort();
  const valorRegistrado = base.total ? sum(contratos.filter(row => row.registrada).map(row => row.valor)) / base.total * 100 : null;
  return { ...base, contratos: contratos.length, valorRegistrado,
    porCategoria: categorias.map(categoria => { const parte = concentrar(contratos.filter(row => row.categoria === categoria)); return { categoria, total: parte.total, n: parte.n, top5: parte.top5, hhi: parte.hhi }; }) };
}

/* ---------- UC33 · demanda técnica planejada (planos anuais de contratação) ---------- */
export type EtapaPca = 'Planejado' | 'Contratação publicada' | 'Contrato identificado';
export const etapasPca: EtapaPca[] = ['Planejado', 'Contratação publicada', 'Contrato identificado'];
export const categoriasTecnicas = ['Obras', 'Serviços técnicos', 'Manutenção', 'Consultoria'];
export interface ItemPca { id: string; buyerId: string; exercicio: number; categoria: string; descricao: string; valorEstimado: number; trimestre: number; etapa: EtapaPca; atualizadoEm: string }
export interface DemandaPlanejada { itens: ItemPca[]; anchor: string }
const descricoes: Record<string, string[]> = {
  Obras: ['Reforma de unidade escolar', 'Pavimentação e drenagem', 'Construção de UBS', 'Ampliação de rede de esgoto', 'Recapeamento de vias'],
  'Serviços técnicos': ['Projeto executivo de edificação', 'Laudo estrutural de pontes', 'Levantamento topográfico', 'Projeto de prevenção contra incêndio'],
  Manutenção: ['Manutenção elétrica predial', 'Manutenção de elevadores', 'Manutenção de iluminação pública', 'Manutenção de climatização'],
  Consultoria: ['Plano diretor de drenagem', 'Estudo de viabilidade de saneamento', 'Consultoria em eficiência energética'],
};
const cachePca = new WeakMap<Dataset, DemandaPlanejada>();
/** Itens técnicos dos planos de contratação do exercício corrente e do seguinte, com a etapa de materialização em D. */
export function buildDemandaPlanejada(dataset: Dataset): DemandaPlanejada {
  const saved = cachePca.get(dataset); if (saved) return saved;
  const anchor = dataset.snapshotDate, ano = Number(anchor.slice(0, 4)), itens: ItemPca[] = [];
  for (const buyer of dataset.buyers) for (const exercicio of [ano, ano + 1]) {
    const n = between(`pca:${buyer.id}:${exercicio}`, 2, 6);
    for (let index = 0; index < n; index += 1) {
      const key = `pca:${buyer.id}:${exercicio}:${index}`, categoria = pick(`${key}:cat`, categoriasTecnicas);
      const etapa = exercicio === ano ? weighted<EtapaPca>(`${key}:etapa`, etapasPca, [5.5, 2.5, 2]) : weighted<EtapaPca>(`${key}:etapa`, etapasPca, [9, 1, 0]);
      itens.push({ id: key, buyerId: buyer.id, exercicio, categoria, descricao: pick(`${key}:desc`, descricoes[categoria]), valorEstimado: between(`${key}:valor`, 8, 600) * 10_000,
        trimestre: between(`${key}:tri`, 1, 4), etapa, atualizadoEm: dateBetween(`${key}:upd`, toDate(toDay(anchor) - 180), anchor) });
    }
  }
  const layer = { itens, anchor }; cachePca.set(dataset, layer); return layer;
}
export interface QuadroDemanda {
  itens: ItemPca[]; total: number; semMaterializacao: number;
  porEtapa: { etapa: EtapaPca; n: number; valor: number }[];
  porCategoria: { categoria: string; n: number; valor: number; porEtapa: Record<EtapaPca, number> }[];
  porExercicio: { exercicio: number; n: number; valor: number; planejado: number }[];
}
export function quadroDemanda(layer: DemandaPlanejada): QuadroDemanda {
  const itens = layer.itens, total = sum(itens.map(row => row.valorEstimado));
  return { itens, total, semMaterializacao: sum(itens.filter(row => row.etapa === 'Planejado').map(row => row.valorEstimado)),
    porEtapa: etapasPca.map(etapa => { const rows = itens.filter(row => row.etapa === etapa); return { etapa, n: rows.length, valor: sum(rows.map(row => row.valorEstimado)) }; }),
    porCategoria: categoriasTecnicas.map(categoria => { const rows = itens.filter(row => row.categoria === categoria); return { categoria, n: rows.length, valor: sum(rows.map(row => row.valorEstimado)),
      porEtapa: Object.fromEntries(etapasPca.map(etapa => [etapa, sum(rows.filter(row => row.etapa === etapa).map(row => row.valorEstimado))])) as Record<EtapaPca, number> }; }),
    porExercicio: [...new Set(itens.map(row => row.exercicio))].sort().map(exercicio => { const rows = itens.filter(row => row.exercicio === exercicio); return { exercicio, n: rows.length, valor: sum(rows.map(row => row.valorEstimado)), planejado: sum(rows.filter(row => row.etapa === 'Planejado').map(row => row.valorEstimado)) }; }) };
}

/* ---------- UC31 · densidade empresarial por regional ---------- */
/** População demonstrativa do município (15 mil a 1,35 milhão), estável por município; em produção, IBGE · tabela 6579 (estimativa anual). */
export const populacaoCidade = (cityId: string) => Math.round(15_000 * Math.exp(chance(`pop:${cityId}`) * 4.5));
export interface DensidadeGre { greId: string; name: string; elegiveis: number; registradas: number; populacao: number; densidade: number | null; cobertura: number | null }
const cacheDensidade = new WeakMap<Dataset, DensidadeGre[]>();
/** Estabelecimentos elegíveis (Receita ativa, CNAE da lista) por 10 mil habitantes e cobertura cadastral, por GRE, lidos em D. */
export function densidadeRegional(view: Dataset): DensidadeGre[] {
  const saved = cacheDensidade.get(view); if (saved) return saved;
  const vigentes = new Set(view.registrations.filter(row => row.status === 'Ativo').map(row => row.establishmentId));
  const rows = view.gres.map(gre => {
    const cidades = view.cities.filter(row => row.greId === gre.id), populacao = sum(cidades.map(row => populacaoCidade(row.id)));
    const elegiveis = view.establishments.filter(row => row.greId === gre.id && row.rfbStatus === 'Ativa' && classeDoEstabelecimento(view, row) !== null);
    const registradas = elegiveis.filter(row => vigentes.has(row.id)).length;
    return { greId: gre.id, name: gre.name, elegiveis: elegiveis.length, registradas, populacao, densidade: populacao ? elegiveis.length / populacao * 10_000 : null, cobertura: share(registradas, elegiveis.length) };
  });
  cacheDensidade.set(view, rows); return rows;
}

/* ---------- UC05 · aberturas na Receita ---------- */
export interface Aberturas {
  meses: { month: string; aberturas: number; comRegistro: number }[]; total: number; comRegistro: number;
  porGre: { greId: string; aberturas: number; comRegistro: number }[];
  /** Estabelecimentos elegíveis baixados, inaptos ou suspensos na fotografia da Receita em D (sem data de baixa nos dados abertos do cenário). */
  foraDeAtividade: number; ids: string[];
}
/** Estabelecimentos com CNAE da lista abertos nos últimos `meses` meses antes de D, e quantos já têm registro ou visto vigente em D. */
export function aberturasRfb(view: Dataset, greId: string | null, meses = 12): Aberturas {
  const fim = view.snapshotDate, inicio = `${view.months[Math.max(0, view.months.length - meses)]}-01`;
  const vigentes = new Set(view.registrations.filter(row => row.status === 'Ativo').map(row => row.establishmentId));
  const elegiveis = view.establishments.filter(row => (!greId || row.greId === greId) && classeDoEstabelecimento(view, row) !== null);
  const abertos = elegiveis.filter(row => row.openedAt >= inicio && row.openedAt <= fim);
  const months = view.months.slice(-meses);
  return { meses: months.map(month => { const rows = abertos.filter(row => row.openedAt.slice(0, 7) === month); return { month, aberturas: rows.length, comRegistro: rows.filter(row => vigentes.has(row.id)).length }; }),
    total: abertos.length, comRegistro: abertos.filter(row => vigentes.has(row.id)).length,
    porGre: view.gres.map(gre => { const rows = abertos.filter(row => row.greId === gre.id); return { greId: gre.id, aberturas: rows.length, comRegistro: rows.filter(row => vigentes.has(row.id)).length }; }),
    foraDeAtividade: elegiveis.filter(row => row.rfbStatus !== 'Ativa').length, ids: abertos.map(row => row.id) };
}

/* ---------- UC04 · permanência de uma coorte de empresas registradas ---------- */
export interface Permanencia { mesesAtras: number; d0: string; coorte: string[]; permanecem: string[]; saidas: string[]; taxa: number | null }
const mesesAntes = (date: string, meses: number) => { const d = new Date(`${date}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() - meses); return d.toISOString().slice(0, 10); };
/** Raízes com registro ou visto vigente em D − `mesesAtras` meses que continuam vigentes em D. Coorte fixa: quem entrou depois não conta. */
export function permanenciaCoorte(view: Dataset, companyIds: Set<string> | null, mesesAtras: number): Permanencia {
  const d0 = mesesAntes(view.snapshotDate, mesesAtras);
  const ativaEm = (date: string) => new Set(view.registrations.filter(row => row.startedAt <= date && (!row.ceasedAt || row.ceasedAt > date)).map(row => row.companyId));
  const em0 = ativaEm(d0), emD = new Set(view.registrations.filter(row => row.status === 'Ativo').map(row => row.companyId));
  const coorte = [...em0].filter(id => !companyIds || companyIds.has(id)).sort();
  const permanecem = coorte.filter(id => emD.has(id)), saidas = coorte.filter(id => !emD.has(id));
  return { mesesAtras, d0, coorte, permanecem, saidas, taxa: share(permanecem.length, coorte.length) };
}
