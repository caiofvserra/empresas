import type { Contract, Dataset } from './types';
import { between, chance, dateBetween, pick, share, sum, weighted } from './hash';

/**
 * V21 · Camadas das frentes do mapa de relações que têm fonte pública de coleta automática: rede societária de sócios PJ (QSA aberto
 * da Receita Federal), obras públicas com execução (Obrasgov e CIPI) e instalações e investimentos com agente identificado por CNPJ
 * (ANEEL SIGA, ANP, ANM e BNDES). Camada DEMONSTRATIVA, derivada do mesmo cenário determinístico; em produção, os dados abertos de cada
 * órgão, com a chave CNPJ exata e a data de cada fato. Tudo é lido na data de referência da base recebida.
 */

/* ---------- QSA aberto: sócios pessoa jurídica ---------- */
export interface SocioPj {
  id: string; empresaId: string;
  /** Sócio PJ que também está no universo do painel (chave CNPJ exata), ou `null` quando é um CNPJ de fora do universo. */
  socioCompanyId: string | null; socioCnpj: string; socioNome: string;
  /** O sócio tem CNAE da lista do Crea-SP (apresenta-se ao mercado como atividade técnica). */
  cnaeLista: boolean; participacao: number; desde: string;
}
export interface Sociedades { socios: SocioPj[]; anchor: string }
const nomesExternos = ['Participações', 'Holding', 'Empreendimentos', 'Administração e Participações', 'Investimentos', 'Engenharia e Participações', 'Construções e Participações', 'Serviços Técnicos'];
const cnpjFicticio = (key: string) => { const base = String(between(key, 10000000, 99999999)); return `${base.slice(0, 2)}.${base.slice(2, 5)}.${base.slice(5, 8)}/0001-${String(between(`${key}:dv`, 0, 99)).padStart(2, '0')}`; };

const cacheSoc = new WeakMap<Dataset, Sociedades>();
export function buildSociedades(dataset: Dataset): Sociedades {
  const saved = cacheSoc.get(dataset); if (saved) return saved;
  const anchor = dataset.snapshotDate, companies = dataset.companies, socios: SocioPj[] = [];
  companies.forEach((company, index) => {
    if (chance(`qsa:${company.id}`) >= 0.16) return;
    const quantos = chance(`qsa:${company.id}:n`) < 0.8 ? 1 : 2;
    for (let n = 0; n < quantos; n++) {
      const key = `qsa:${company.id}:${n}`, interno = chance(`${key}:int`) < 0.5;
      const desde = dateBetween(`${key}:desde`, '2012-01-01', '2026-06-30');
      if (desde > anchor) continue;
      if (interno) {
        const other = companies[(index * 37 + n * 11 + between(`${key}:o`, 1, 400)) % companies.length];
        if (other.id === company.id) continue;
        socios.push({ id: `${key}`, empresaId: company.id, socioCompanyId: other.id, socioCnpj: other.rootCnpj, socioNome: other.name, cnaeLista: true, participacao: between(`${key}:p`, 10, 95), desde });
      } else {
        const cnaeLista = chance(`${key}:cnae`) < 0.45;
        socios.push({ id: `${key}`, empresaId: company.id, socioCompanyId: null, socioCnpj: cnpjFicticio(key), socioNome: `${pick(`${key}:nome`, nomesExternos)} ${String(between(`${key}:num`, 1, 999)).padStart(3, '0')} (demonstrativo)`, cnaeLista, participacao: between(`${key}:p`, 5, 90), desde });
      }
    }
  });
  const value = { socios, anchor }; cacheSoc.set(dataset, value); return value;
}

export interface GrupoSocietario { id: string; empresas: string[]; registradas: number; externos: number; externosEngenharia: number }
export interface QuadroSociedades {
  socios: SocioPj[]; empresasComSocioPj: string[]; sociosInternos: number; sociosExternos: number;
  /** Sócios PJ de fora do universo com CNAE da lista: apresentam-se como atividade técnica e não têm registro localizado (contexto). */
  externosEngenharia: SocioPj[]; investidasRegistradasComSocioEngenhariaSemRegistro: string[];
  grupos: GrupoSocietario[]; gruposMultiplos: number; maiorGrupo: number;
}
/** Lê o QSA na data de referência da base recebida e dentro do recorte (regional e, se houver, subconjunto de empresas). */
export function quadroSociedades(soc: Sociedades, dataset: Dataset, companyIds: Set<string> | null, greId: string | null): QuadroSociedades {
  const anchor = dataset.snapshotDate, greDe = new Map<string, string>();
  for (const row of dataset.establishments) if (row.branch === 'Matriz') greDe.set(row.companyId, row.greId);
  const dentro = (id: string) => (!companyIds || companyIds.has(id)) && (!greId || greDe.get(id) === greId);
  const registrada = new Set(dataset.registrations.filter(row => row.status === 'Ativo' && row.startedAt <= anchor).map(row => row.companyId));
  const socios = soc.socios.filter(row => row.desde <= anchor && dentro(row.empresaId));
  const empresasComSocioPj = [...new Set(socios.map(row => row.empresaId))];
  const externosEngenharia = socios.filter(row => row.socioCompanyId === null && row.cnaeLista);
  const investidas = [...new Set(externosEngenharia.filter(row => registrada.has(row.empresaId)).map(row => row.empresaId))];
  // Grupos: componentes conexos das ligações investida–sócio interno (chave CNPJ exata nos dois lados).
  const pai = new Map<string, string>(), find = (id: string): string => { const p = pai.get(id) ?? id; if (p === id) return id; const root = find(p); pai.set(id, root); return root; };
  const une = (a: string, b: string) => { const ra = find(a), rb = find(b); if (ra !== rb) pai.set(ra, rb); };
  const internos = soc.socios.filter(row => row.desde <= anchor && row.socioCompanyId !== null);
  for (const row of internos) une(row.empresaId, row.socioCompanyId!);
  const membros = new Map<string, Set<string>>();
  for (const row of internos) { const root = find(row.empresaId); const set = membros.get(root) ?? new Set<string>(); set.add(row.empresaId); set.add(row.socioCompanyId!); membros.set(root, set); }
  const externosPorEmpresa = new Map<string, SocioPj[]>();
  for (const row of soc.socios) if (row.desde <= anchor && row.socioCompanyId === null) externosPorEmpresa.set(row.empresaId, [...(externosPorEmpresa.get(row.empresaId) ?? []), row]);
  const grupos: GrupoSocietario[] = [...membros.values()].filter(set => [...set].some(dentro)).map(set => { const empresas = [...set].sort(); const ext = empresas.flatMap(id => externosPorEmpresa.get(id) ?? []);
    return { id: empresas[0], empresas, registradas: empresas.filter(id => registrada.has(id)).length, externos: ext.length, externosEngenharia: ext.filter(row => row.cnaeLista).length }; })
    .sort((a, b) => b.empresas.length - a.empresas.length || a.id.localeCompare(b.id));
  return { socios, empresasComSocioPj, sociosInternos: socios.filter(row => row.socioCompanyId !== null).length, sociosExternos: socios.filter(row => row.socioCompanyId === null).length,
    externosEngenharia, investidasRegistradasComSocioEngenhariaSemRegistro: investidas, grupos, gruposMultiplos: grupos.filter(row => row.empresas.length >= 3).length, maiorGrupo: grupos[0]?.empresas.length ?? 0 };
}

/* ---------- Obrasgov e CIPI: obras públicas com execução ---------- */
export type SituacaoObra = 'Não iniciada' | 'Em execução' | 'Paralisada' | 'Concluída';
export const situacoesObra: SituacaoObra[] = ['Não iniciada', 'Em execução', 'Paralisada', 'Concluída'];
export type PonteObra = 'CIPI no contrato' | 'Candidata (objeto, local e período)' | 'Não identificada';
export const pontesObra: PonteObra[] = ['CIPI no contrato', 'Candidata (objeto, local e período)', 'Não identificada'];
export interface Obra {
  id: string; cipi: string; contractId: string; companyId: string; establishmentId: string; buyerId: string; cityId: string; greId: string;
  objeto: string; valor: number; inicio: string; fim?: string; situacao: SituacaoObra; executado: number; ponte: PonteObra;
  /** ART de fiscalização de obra pública (lei de licitações exige responsável pela fiscalização) localizada na base de ARTs. */
  artFiscalizacao: boolean;
}
export interface Obras { obras: Obra[]; anchor: string }
const cacheObras = new WeakMap<Dataset, Obras>();
/** Uma obra por contrato de categoria "Obras": CIPI, situação de execução e ponte com o contrato do PNCP. */
export function buildObras(dataset: Dataset): Obras {
  const saved = cacheObras.get(dataset); if (saved) return saved;
  const anchor = dataset.snapshotDate, est = new Map(dataset.establishments.map(row => [row.id, row]));
  const obras: Obra[] = dataset.contracts.filter(row => row.category === 'Obras' && row.date <= anchor).map((contract: Contract) => {
    const key = `obra:${contract.id}`, place = est.get(contract.establishmentId)!;
    const inicio = dateBetween(`${key}:ini`, contract.date, contract.date.slice(0, 7) + '-28'), meses = between(`${key}:dur`, 4, 20);
    const fimPrevisto = new Date(Date.UTC(Number(inicio.slice(0, 4)), Number(inicio.slice(5, 7)) - 1 + meses, Number(inicio.slice(8, 10)))).toISOString().slice(0, 10);
    const andamento = Math.max(0, Math.min(1, (Date.parse(anchor) - Date.parse(inicio)) / (Date.parse(fimPrevisto) - Date.parse(inicio))));
    let situacao: SituacaoObra = inicio > anchor ? 'Não iniciada' : andamento >= 1 ? 'Concluída' : 'Em execução';
    if (situacao === 'Em execução' && chance(`${key}:par`) < 0.12) situacao = 'Paralisada';
    if (situacao === 'Não iniciada' && chance(`${key}:nao`) < 0.5) situacao = 'Em execução';
    const executado = situacao === 'Concluída' ? 100 : situacao === 'Não iniciada' ? 0 : Math.round(andamento * 100 * (situacao === 'Paralisada' ? 0.6 : 1));
    return { id: `OB-${contract.id}`, cipi: `CIPI-${String(between(`${key}:cipi`, 100000, 999999))}`, contractId: contract.id, companyId: contract.companyId, establishmentId: contract.establishmentId, buyerId: contract.buyerId,
      cityId: place.cityId, greId: place.greId, objeto: contract.object, valor: contract.value, inicio, ...(situacao === 'Concluída' ? { fim: fimPrevisto } : {}), situacao, executado,
      ponte: weighted<PonteObra>(`${key}:ponte`, pontesObra, [5, 2.5, 2.5]), artFiscalizacao: chance(`fisc:${contract.id}`) < 0.55 };
  });
  const value = { obras, anchor }; cacheObras.set(dataset, value); return value;
}
export interface QuadroObras {
  obras: Obra[]; iniciadas: Obra[]; semArtFiscalizacao: Obra[]; porSituacao: { situacao: SituacaoObra; n: number; valor: number }[]; porPonte: { ponte: PonteObra; n: number }[];
  porGre: { greId: string; obras: number; emExecucao: number; semArt: number; valor: number }[]; valorTotal: number; taxaSemArt: number | null;
}
export function quadroObras(layer: Obras, dataset: Dataset, companyIds: Set<string> | null, greId: string | null): QuadroObras {
  const anchor = dataset.snapshotDate;
  const obras = layer.obras.filter(row => row.inicio <= anchor || row.situacao === 'Não iniciada').filter(row => (!companyIds || companyIds.has(row.companyId)) && (!greId || row.greId === greId));
  const iniciadas = obras.filter(row => row.situacao !== 'Não iniciada'), semArt = iniciadas.filter(row => !row.artFiscalizacao);
  const gres = [...new Set(obras.map(row => row.greId))];
  return { obras, iniciadas, semArtFiscalizacao: semArt,
    porSituacao: situacoesObra.map(situacao => { const rows = obras.filter(row => row.situacao === situacao); return { situacao, n: rows.length, valor: sum(rows.map(row => row.valor)) }; }),
    porPonte: pontesObra.map(ponte => ({ ponte, n: obras.filter(row => row.ponte === ponte).length })),
    porGre: gres.map(id => { const rows = obras.filter(row => row.greId === id); return { greId: id, obras: rows.length, emExecucao: rows.filter(row => row.situacao === 'Em execução').length, semArt: rows.filter(row => row.situacao !== 'Não iniciada' && !row.artFiscalizacao).length, valor: sum(rows.map(row => row.valor)) }; }).sort((a, b) => b.obras - a.obras),
    valorTotal: sum(obras.map(row => row.valor)), taxaSemArt: share(semArt.length, iniciadas.length) };
}

/* ---------- ANEEL, ANP, ANM e BNDES: instalações e investimentos com agente identificado ---------- */
export type FonteInstalacao = 'ANEEL' | 'ANP' | 'ANM' | 'BNDES';
export const fontesInstalacao: FonteInstalacao[] = ['ANEEL', 'ANP', 'ANM', 'BNDES'];
const tiposPorFonte: Record<FonteInstalacao, string[]> = {
  ANEEL: ['Usina fotovoltaica', 'Usina eólica', 'Pequena central hidrelétrica', 'Usina termelétrica', 'Geração distribuída (agregado)'],
  ANP: ['Posto revendedor', 'Base de distribuição', 'Transportador-revendedor-retalhista', 'Unidade de produção de biocombustível'],
  ANM: ['Lavra', 'Pesquisa mineral', 'Licenciamento mineral', 'Lavra garimpeira'],
  BNDES: ['Financiamento direto', 'Financiamento indireto', 'Projeto de infraestrutura'],
};
const unidadePorFonte: Record<FonteInstalacao, string> = { ANEEL: 'MW', ANP: 'm³/dia', ANM: 'ha', BNDES: 'R$' };
export interface Instalacao {
  id: string; fonte: FonteInstalacao; tipo: string; cityId: string; greId: string;
  /** Agente identificado por CNPJ: empresa do universo do painel ou CNPJ de fora. */
  companyId: string | null; agenteNome: string; agenteCnpj: string; valor: number; unidade: string; desde: string;
}
export interface Instalacoes { instalacoes: Instalacao[]; anchor: string }
const cacheInst = new WeakMap<Dataset, Instalacoes>();
export function buildInstalacoes(dataset: Dataset): Instalacoes {
  const saved = cacheInst.get(dataset); if (saved) return saved;
  const anchor = dataset.snapshotDate, cities = dataset.cities, companies = dataset.companies, instalacoes: Instalacao[] = [];
  const quantidades: Record<FonteInstalacao, number> = { ANEEL: 140, ANP: 220, ANM: 90, BNDES: 110 };
  for (const fonte of fontesInstalacao) for (let index = 0; index < quantidades[fonte]; index++) {
    const key = `inst:${fonte}:${index}`, desde = dateBetween(`${key}:desde`, '2016-01-01', '2026-09-30');
    if (desde > anchor) continue;
    const city = cities[(index * 13 + fonte.length) % cities.length], interno = chance(`${key}:int`) < 0.35;
    const company = interno ? companies[between(`${key}:c`, 0, companies.length - 1)] : null;
    const valor = fonte === 'ANEEL' ? between(`${key}:v`, 1, 400) : fonte === 'ANP' ? between(`${key}:v`, 20, 900) : fonte === 'ANM' ? between(`${key}:v`, 10, 2000) : between(`${key}:v`, 500000, 80000000);
    instalacoes.push({ id: `${fonte}-${String(index + 1).padStart(4, '0')}`, fonte, tipo: pick(`${key}:tipo`, tiposPorFonte[fonte]), cityId: city.id, greId: city.greId, companyId: company?.id ?? null,
      agenteNome: company?.name ?? `${pick(`${key}:nome`, nomesExternos)} ${String(between(`${key}:num`, 1, 999)).padStart(3, '0')} (demonstrativo)`, agenteCnpj: company?.rootCnpj ?? cnpjFicticio(key), valor, unidade: unidadePorFonte[fonte], desde });
  }
  const value = { instalacoes, anchor }; cacheInst.set(dataset, value); return value;
}
export interface QuadroInstalacoes {
  instalacoes: Instalacao[]; porFonte: { fonte: FonteInstalacao; n: number; valor: number; unidade: string; agentesNoUniverso: number; agentesRegistrados: number }[];
  porGre: { greId: string; n: number; porFonte: Record<FonteInstalacao, number> }[]; novas12: number; novasAntes: number;
}
export function quadroInstalacoes(layer: Instalacoes, dataset: Dataset, greId: string | null): QuadroInstalacoes {
  const anchor = dataset.snapshotDate, ano = new Date(Date.parse(`${anchor}T00:00:00Z`) - 365 * 86400000).toISOString().slice(0, 10), antes = new Date(Date.parse(`${ano}T00:00:00Z`) - 365 * 86400000).toISOString().slice(0, 10);
  const registrada = new Set(dataset.registrations.filter(row => row.status === 'Ativo' && row.startedAt <= anchor).map(row => row.companyId));
  const instalacoes = layer.instalacoes.filter(row => row.desde <= anchor && (!greId || row.greId === greId));
  const gres = [...new Set(instalacoes.map(row => row.greId))];
  return { instalacoes,
    porFonte: fontesInstalacao.map(fonte => { const rows = instalacoes.filter(row => row.fonte === fonte); return { fonte, n: rows.length, valor: sum(rows.map(row => row.valor)), unidade: unidadePorFonte[fonte], agentesNoUniverso: rows.filter(row => row.companyId).length, agentesRegistrados: rows.filter(row => row.companyId && registrada.has(row.companyId)).length }; }),
    porGre: gres.map(id => { const rows = instalacoes.filter(row => row.greId === id); return { greId: id, n: rows.length, porFonte: Object.fromEntries(fontesInstalacao.map(fonte => [fonte, rows.filter(row => row.fonte === fonte).length])) as Record<FonteInstalacao, number> }; }).sort((a, b) => b.n - a.n),
    novas12: instalacoes.filter(row => row.desde > ano).length, novasAntes: instalacoes.filter(row => row.desde > antes && row.desde <= ano).length };
}
