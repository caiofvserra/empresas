import type { Dataset } from './types';
import type { Scope } from './engine';
import type { EnterpriseModel } from '../enterprise-v10/types';
import { between, chance, sum } from './hash';
import { buildEmpregoCbo, cbos } from './profissionais';
import { creditoCidade, pibCidade } from './parcerias';
import { classeDoEstabelecimento } from '../observatorio/norte';

/**
 * Painel de Empresas (01/11/2026): medidas que só esse painel usa. Tudo lido na data de referência da base recebida e no recorte
 * dos filtros do alto da tela (regional e câmara), que valem para todas as páginas.
 */

/* ---------- Economia, empresas abertas e registros no Crea-SP ---------- */
export interface PontoRitmo {
  month: string;
  /** Empregados com carteira em ocupações de engenharia no fim do mês (Novo CAGED e RAIS, em totais). */
  emprego: number;
  /** Estabelecimentos com atividade da lista abertos na Receita nos 12 meses até o mês. */
  aberturas12: number;
  /** Empresas que fizeram o primeiro registro no Crea-SP nos 12 meses até o mês. */
  registros12: number;
  /** Saldo de crédito a empresas das atividades da lista (Banco Central, em totais; depende de acordo). */
  credito: number;
  /** PIB dos municípios no ano do mês (IBGE, anual). */
  pib: number;
}
export interface Ritmo { pontos: PontoRitmo[]; indice: Record<'emprego' | 'aberturas12' | 'registros12' | 'credito' | 'pib', number[]>; variacao: Record<'emprego' | 'aberturas12' | 'registros12' | 'credito' | 'pib', number | null> }
const somaMovel = (values: number[], index: number) => sum(values.slice(Math.max(0, index - 11), index + 1));
/**
 * Uma linha por mês nos últimos `meses` meses até a data de referência. Aberturas e registros são somas de 12 meses, para tirar o
 * efeito de mês a mês; emprego e crédito são o estoque do fim do mês; o PIB é o do ano. O índice divide cada série pelo primeiro mês
 * mostrado (= 100), para comparar o ritmo de séries com unidades diferentes.
 */
export function ritmoEconomico(view: Dataset, greId: string | null, companyIds: Set<string> | null, meses = 24, cityId: string | null = null): Ritmo {
  const months = view.months.filter(month => month <= view.snapshotDate.slice(0, 7));
  const cidades = view.cities.filter(row => (!greId || row.greId === greId) && (!cityId || row.id === cityId));
  const cidadeDe = new Map(view.establishments.map(row => [row.id, row.cityId]));
  const dentro = (companyId: string, gre: string, city?: string) => (!greId || gre === greId) && (!cityId || city === cityId) && (!companyIds || companyIds.has(companyId));
  const abertas = new Map<string, number>(), registros = new Map<string, number>(), primeira = new Map<string, { data: string; gre: string; city: string }>();
  const places = new Map(view.establishments.map(row => [row.id, row]));
  for (const place of view.establishments) if (dentro(place.companyId, place.greId, place.cityId) && classeDoEstabelecimento(view, place) !== null) abertas.set(place.openedAt.slice(0, 7), (abertas.get(place.openedAt.slice(0, 7)) ?? 0) + 1);
  for (const row of view.registrations) { const atual = primeira.get(row.companyId); if (!atual || row.startedAt < atual.data) primeira.set(row.companyId, { data: row.startedAt, gre: places.get(row.establishmentId)?.greId ?? '', city: cidadeDe.get(row.establishmentId) ?? '' }); }
  for (const [companyId, row] of primeira) if (dentro(companyId, row.gre, row.city)) registros.set(row.data.slice(0, 7), (registros.get(row.data.slice(0, 7)) ?? 0) + 1);
  // O emprego formal sai em totais por regional: com um município escolhido, a série é a da regional dele.
  const greEmprego = greId ?? (cityId ? view.cities.find(row => row.id === cityId)?.greId ?? null : null);
  const engenharia = new Set(cbos.filter(row => row.engenharia).map(row => row.cbo)), emprego = new Map<string, number>();
  for (const row of buildEmpregoCbo(view)) if (engenharia.has(row.cbo) && (!greEmprego || row.greId === greEmprego)) emprego.set(row.month, (emprego.get(row.month) ?? 0) + row.estoque);
  const serieAbertas = months.map(month => abertas.get(month) ?? 0), serieRegistros = months.map(month => registros.get(month) ?? 0);
  const credito0 = sum(cidades.map(row => creditoCidade(row.id).saldo)), pib0 = sum(cidades.map(row => pibCidade(row.id)));
  const ultimoAno = Number(months.at(-1)?.slice(0, 4) ?? 0);
  const pibAno = (ano: number) => pib0 * Array.from({ length: Math.max(0, ultimoAno - ano) }, (_, k) => 1 + (between(`pib:sp:${cityId ?? greId ?? 'todas'}:${ultimoAno - k}`, 4, 32) - 10) / 1000).reduce((acc, f) => acc / f, 1);
  const inicio = Math.max(11, months.length - meses);
  const pontos = months.slice(inicio).map((month, k) => {
    const index = inicio + k, passo = index / Math.max(1, months.length - 1);
    return { month, emprego: emprego.get(month) ?? 0, aberturas12: somaMovel(serieAbertas, index), registros12: somaMovel(serieRegistros, index),
      credito: Math.round(credito0 * (0.86 + 0.14 * passo) * (0.985 + chance(`credito:${cityId ?? greId ?? 'todas'}:${month}`) * 0.03)), pib: Math.round(pibAno(Number(month.slice(0, 4)))) };
  });
  const chaves = ['emprego', 'aberturas12', 'registros12', 'credito', 'pib'] as const;
  const indice = Object.fromEntries(chaves.map(key => { const base = pontos[0]?.[key] || 1; return [key, pontos.map(row => Math.round(row[key] / base * 1000) / 10)]; })) as Ritmo['indice'];
  const variacao = Object.fromEntries(chaves.map(key => { const first = pontos[0]?.[key], last = pontos.at(-1)?.[key]; return [key, first && last !== undefined ? (last - first) / first * 100 : null]; })) as Ritmo['variacao'];
  return { pontos, indice, variacao };
}

/* ---------- Atividades (CNAE) com mais estabelecimentos sem registro ---------- */
export interface LinhaCnae { code: string; label: string; classe: 'Sim' | 'Passível'; registrados: string[]; semRegistro: string[]; total: number; cobertura: number | null }
/** CNAE que põe o estabelecimento na lista: o principal, se estiver na lista; senão, o primeiro secundário que estiver. */
export function cnaesDoMercado(scope: Scope, model: EnterpriseModel, limite = 12): LinhaCnae[] {
  const view = scope.dataset, cnaes = new Map(view.cnaes.map(row => [row.code, row])), places = new Map(scope.establishments.map(row => [row.id, row]));
  const ativos = new Set(model.metadata.activeEligibleEstablishmentIds), rows = new Map<string, LinhaCnae>();
  for (const id of model.metadata.eligibleEstablishmentIds) {
    const place = places.get(id); if (!place) continue;
    const classe = classeDoEstabelecimento(view, place); if (!classe) continue;
    const listado = (code: string) => { const c = cnaes.get(code); return c && c.classification !== 'Não classificado'; };
    const code = listado(place.cnaeMain) ? place.cnaeMain : place.cnaeSecondary.find(listado) ?? place.cnaeMain;
    const row = rows.get(code) ?? { code, label: cnaes.get(code)?.label ?? code, classe, registrados: [], semRegistro: [], total: 0, cobertura: null };
    (ativos.has(id) ? row.registrados : row.semRegistro).push(id); row.total++; rows.set(code, row);
  }
  return [...rows.values()].map(row => ({ ...row, cobertura: row.total ? row.registrados.length / row.total * 100 : null }))
    .sort((a, b) => b.semRegistro.length - a.semRegistro.length || b.total - a.total).slice(0, limite);
}

/* ---------- Há quanto tempo as empresas estão registradas ---------- */
export const faixasAntiguidade = ['menos de 1 ano', '1 a 2 anos', '2 a 5 anos', '5 a 10 anos', '10 anos ou mais'];
/** Empresas com registro ativo pela data do primeiro registro no Crea-SP, contada até a data de referência. */
export function antiguidadeRegistro(scope: Scope, model: EnterpriseModel) {
  const anchor = Date.parse(`${scope.dataset.snapshotDate}T00:00:00Z`), primeira = new Map<string, string>();
  for (const row of scope.dataset.registrations) { const atual = primeira.get(row.companyId); if (!atual || row.startedAt < atual) primeira.set(row.companyId, row.startedAt); }
  const faixas = faixasAntiguidade.map(nome => ({ nome, ids: [] as string[] }));
  const anos: number[] = [];
  for (const id of model.metadata.activeCompanyIds) {
    const inicio = primeira.get(id); if (!inicio) continue;
    const idade = (anchor - Date.parse(`${inicio}T00:00:00Z`)) / (365.25 * 86400000); anos.push(idade);
    faixas[idade < 1 ? 0 : idade < 2 ? 1 : idade < 5 ? 2 : idade < 10 ? 3 : 4].ids.push(id);
  }
  anos.sort((a, b) => a - b);
  return { faixas, mediana: anos.length ? anos[Math.floor(anos.length / 2)] : null };
}

/* ---------- Capital social declarado à Receita ---------- */
export const faixasCapital = ['até R$ 50 mil', 'R$ 50 mil a 200 mil', 'R$ 200 mil a 1 milhão', 'R$ 1 a 5 milhões', 'acima de R$ 5 milhões'];
const limitesPorte: Record<string, [number, number]> = { Microempresa: [5_000, 180_000], 'Pequena empresa': [60_000, 1_500_000], 'Média empresa': [400_000, 8_000_000], 'Grande empresa': [3_000_000, 90_000_000] };
/** Capital social da empresa no cadastro aberto do CNPJ. No cenário, sorteado de forma estável dentro do porte declarado. */
export const capitalSocial = (companyId: string, porte: string) => { const [min, max] = limitesPorte[porte] ?? limitesPorte.Microempresa; return Math.round(min * (max / min) ** chance(`capital:${companyId}`) / 1000) * 1000; };
export function porCapital(scope: Scope, model: EnterpriseModel) {
  const portes = new Map(scope.dataset.companies.map(row => [row.id, row.size as string]));
  const faixas = faixasCapital.map(nome => ({ nome, ids: [] as string[] }));
  for (const id of model.metadata.activeCompanyIds) {
    const valor = capitalSocial(id, portes.get(id) ?? 'Microempresa');
    faixas[valor <= 50_000 ? 0 : valor <= 200_000 ? 1 : valor <= 1_000_000 ? 2 : valor <= 5_000_000 ? 3 : 4].ids.push(id);
  }
  return faixas;
}

/* ---------- ARTs de empresas mês a mês ---------- */
/** ARTs de empresas por mês nos últimos 24 meses até a data de referência, com o mesmo mês do ano anterior para comparar. */
export function artsMensais(scope: Scope) {
  const months = scope.dataset.months.filter(month => month <= scope.dataset.snapshotDate.slice(0, 7));
  const porMes = new Map<string, { n: number; empresas: Set<string> }>();
  for (const row of scope.arts) { if (row.date > scope.dataset.snapshotDate) continue; const month = row.date.slice(0, 7), item = porMes.get(month) ?? { n: 0, empresas: new Set() }; item.n++; item.empresas.add(row.companyId); porMes.set(month, item); }
  return months.slice(-24).map(month => { const anterior = `${Number(month.slice(0, 4)) - 1}${month.slice(4)}`;
    return { month, n: porMes.get(month)?.n ?? 0, anoAnterior: porMes.has(anterior) ? porMes.get(anterior)!.n : null, empresas: [...(porMes.get(month)?.empresas ?? [])] }; });
}

/* ---------- Qualidade do cadastro das empresas registradas ---------- */
/** Empresas registradas com pendência aberta no cadastro (sem CNAE, regional não identificada, município divergente e outras). */
export function cadastroIncompleto(scope: Scope, model: EnterpriseModel) {
  const ativas = new Set(model.metadata.activeCompanyIds), porTipo = new Map<string, Set<string>>();
  for (const row of scope.qualityEvents) if (!row.resolved && row.date <= scope.dataset.snapshotDate && ativas.has(row.companyId)) porTipo.set(row.type, (porTipo.get(row.type) ?? new Set()).add(row.companyId));
  const ids = [...new Set([...porTipo.values()].flatMap(set => [...set]))];
  return { ids, porTipo: [...porTipo].map(([tipo, set]) => ({ tipo, n: set.size })).sort((a, b) => b.n - a.n) };
}

/* ---------- Território: regionais ou municípios, pela parte do mercado que está registrada ---------- */
export interface LinhaTerritorio { id: string; nome: string; greId: string; total: number; registrados: string[]; historico: string[]; semRegistro: string[]; taxa: number | null }
/**
 * Estabelecimentos ativos na Receita com atividade da lista, por município (sempre) e por regional. O mapa usa os municípios; a
 * regional é a soma dos seus municípios. A classe (registro obrigatório ou dependente de análise) não separa as linhas aqui.
 */
export function territorio(scope: Scope, model: EnterpriseModel) {
  const view = scope.dataset, places = new Map(view.establishments.map(row => [row.id, row])), cidades = new Map(view.cities.map(row => [row.id, row]));
  const vigente = new Set(model.metadata.activeEligibleEstablishmentIds), historico = new Set(model.metadata.inactiveMatchedEstablishmentIds);
  const porCidade = new Map<string, LinhaTerritorio>(), porGre = new Map<string, LinhaTerritorio>();
  const linha = (map: Map<string, LinhaTerritorio>, id: string, nome: string, greId: string) => { let row = map.get(id); if (!row) { row = { id, nome, greId, total: 0, registrados: [], historico: [], semRegistro: [], taxa: null }; map.set(id, row); } return row; };
  for (const id of model.metadata.eligibleEstablishmentIds) {
    const place = places.get(id); if (!place) continue;
    const cidade = cidades.get(place.cityId), gre = view.gres.find(row => row.id === place.greId);
    for (const row of [linha(porCidade, place.cityId, cidade?.name ?? place.cityId, place.greId), linha(porGre, place.greId, gre?.name ?? place.greId, place.greId)]) {
      row.total++; (vigente.has(id) ? row.registrados : historico.has(id) ? row.historico : row.semRegistro).push(id);
    }
  }
  const fecha = (rows: LinhaTerritorio[]) => rows.map(row => ({ ...row, taxa: row.total ? row.registrados.length / row.total * 100 : null })).sort((a, b) => b.total - a.total);
  return { cidades: fecha([...porCidade.values()]), gres: fecha([...porGre.values()]) };
}

/* ---------- Mercado por câmara e atividade, para o mapa de árvore ---------- */
export interface RamoMercado { camara: string; total: number; registrados: number; atividades: LinhaCnae[] }
/** As atividades da lista agrupadas pela câmara: o tamanho de cada retângulo é o número de estabelecimentos, e a cor, a parte registrada. */
export function mercadoEmArvore(scope: Scope, model: EnterpriseModel, camaraDoCnae: Record<string, string>): RamoMercado[] {
  const ramos = new Map<string, RamoMercado>();
  for (const row of cnaesDoMercado(scope, model, Number.MAX_SAFE_INTEGER)) {
    const camara = camaraDoCnae[row.code] ?? 'Sem câmara definida', ramo = ramos.get(camara) ?? { camara, total: 0, registrados: 0, atividades: [] };
    ramo.total += row.total; ramo.registrados += row.registrados.length; ramo.atividades.push(row); ramos.set(camara, ramo);
  }
  return [...ramos.values()].sort((a, b) => b.total - a.total);
}

/* ---------- Tempo de registro cruzado com o capital social ---------- */
/** Matriz das empresas registradas: linhas pelo tempo desde o primeiro registro, colunas pela faixa de capital social. */
export function idadeCapital(scope: Scope, model: EnterpriseModel) {
  const a = antiguidadeRegistro(scope, model), faixaIdade = new Map<string, number>();
  a.faixas.forEach((row, index) => row.ids.forEach(id => faixaIdade.set(id, index)));
  const capital = porCapital(scope, model), celulas: { idade: number; capital: number; ids: string[] }[] = [];
  capital.forEach((col, c) => faixasAntiguidade.forEach((_, i) => celulas.push({ idade: i, capital: c, ids: col.ids.filter(id => faixaIdade.get(id) === i) })));
  return { celulas, mediana: a.mediana, idade: a.faixas, capital };
}

/* ---------- Novos registros por câmara e mês ---------- */
/** Empresas que fizeram o primeiro registro no Crea-SP em cada mês dos últimos 24, pela câmara da atividade principal. */
export function registrosPorCamara(scope: Scope, camaraDe: Map<string, string>, meses = 24) {
  const view = scope.dataset, months = view.months.filter(month => month <= view.snapshotDate.slice(0, 7)).slice(-meses), primeira = new Map<string, string>();
  for (const row of view.registrations) { const atual = primeira.get(row.companyId); if (!atual || row.startedAt < atual) primeira.set(row.companyId, row.startedAt); }
  const camaras = new Map<string, Map<string, string[]>>();
  for (const [id, inicio] of primeira) {
    const month = inicio.slice(0, 7); if (!scope.companyIds.has(id) || !months.includes(month)) continue;
    const camara = camaraDe.get(id) ?? 'Sem câmara definida', linha = camaras.get(camara) ?? new Map<string, string[]>();
    linha.set(month, [...(linha.get(month) ?? []), id]); camaras.set(camara, linha);
  }
  const linhas = [...camaras].map(([camara, porMes]) => ({ camara, total: sum([...porMes.values()].map(ids => ids.length)), porMes })).sort((a, b) => b.total - a.total);
  return { months, linhas };
}
