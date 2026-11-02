import type { Art, Dataset } from './types';
import { buildEntidades } from './entidades';
import type { Modalidade } from './entidades';
import { modalidades } from './entidades';
import { addDays, between, chance, dateBetween, share, sum, toDay, weighted } from './hash';

/**
 * V20 · Profissionais com a mesma profundidade de Empresas. Camada DEMONSTRATIVA: 4.800 pessoas fictícias, sem CPF, com registro,
 * modalidade, nível, situação ao longo do tempo, domicílio, formação (IES do cenário) e autoria das ARTs do cenário.
 * Os 600 primeiros são os responsáveis técnicos já existentes na base de empresas. Em produção: cadastro profissional do Crea-SP,
 * ARTs (autor), anuidades PF e, em agregado por CBO e município, Novo CAGED e RAIS.
 */
export type Nivel = 'Engenheiro' | 'Tecnólogo' | 'Técnico';
export const niveis: Nivel[] = ['Engenheiro', 'Tecnólogo', 'Técnico'];
export type Genero = 'Feminino' | 'Masculino';
export type SituacaoProfissional = 'Ativo' | 'Interrompido' | 'Cancelado';
export const situacoesProfissional: SituacaoProfissional[] = ['Ativo', 'Interrompido', 'Cancelado'];
export interface Profissional {
  id: string; nome: string; modalidade: Modalidade; nivel: Nivel; genero: Genero; nascimento: number;
  registroEm: string; canceladoEm?: string; interrupcoes: { inicio: string; fim?: string }[];
  greId: string; cityId: string; iesId: string; anoConclusao: number;
  /** Anuidade PF em dia desde o registro, exceto a partir desta data (demonstrativo). */
  inadimplenteDesde?: string;
}
export interface ModeloProfissionais { profissionais: Profissional[]; autoria: Map<string, string>; porId: Map<string, Profissional>; anchor: string }

export const modalidadeAntiga: Record<string, Modalidade> = { Civil: 'Civil', Elétrica: 'Elétrica', Mecânica: 'Mecânica e metalúrgica', Agronomia: 'Agronomia', 'Segurança do trabalho': 'Segurança do trabalho' };
const pesosModalidade = [46, 20, 19, 4, 5, 2, 1, 3];
const femininos = ['Ana', 'Camila', 'Elisa', 'Gabriela', 'Isabela', 'Larissa', 'Natália', 'Paula', 'Sofia', 'Vitória'];
const masculinos = ['Bruno', 'Daniel', 'Felipe', 'Hugo', 'João', 'Marcos', 'Otávio', 'Rafael', 'Tiago', 'William'];
const sobrenomes = ['Almeida', 'Barros', 'Costa', 'Duarte', 'Esteves', 'Ferraz', 'Gomes', 'Lima', 'Moraes', 'Nunes', 'Oliveira', 'Pereira', 'Queiroz', 'Ramos', 'Souza', 'Teixeira'];

const cache = new WeakMap<Dataset, ModeloProfissionais>();
export function buildProfissionais(dataset: Dataset): ModeloProfissionais {
  const saved = cache.get(dataset); if (saved) return saved;
  const anchor = dataset.snapshotDate, ies = buildEntidades(dataset).organizacoes.filter(row => row.grupo === 'IES');
  const cities = dataset.cities, cityWeights = cities.map(city => city.name === 'São Paulo' ? 12 : city.name === 'Campinas' ? 5 : ['Ribeirão Preto', 'Sorocaba', 'São José dos Campos', 'Santos', 'Guarulhos', 'Santo André'].includes(city.name) ? 3 : 1);
  const linksBy = new Map<string, string>();
  for (const link of dataset.technicalLinks) if (!linksBy.has(link.professionalId) || link.startDate < linksBy.get(link.professionalId)!) linksBy.set(link.professionalId, link.startDate);
  const profissionais: Profissional[] = [];
  for (let index = 0; index < 4800; index++) {
    const base = dataset.professionals[index], key = base ? base.id : `PRO-${String(index + 1).padStart(5, '0')}`;
    // Participação feminina perto da observada no Sistema Confea/Crea (cerca de um quinto dos registrados); o nome segue o gênero sorteado.
    const genero: Genero = chance(`${key}:genero`) < 0.22 ? 'Feminino' : 'Masculino', nomes = genero === 'Feminino' ? femininos : masculinos;
    const primeiro = nomes[between(`${key}:nome`, 0, nomes.length - 1)];
    const modalidade = base ? modalidadeAntiga[base.modality] ?? 'Civil' : weighted(`${key}:mod`, modalidades, pesosModalidade);
    const nivel = weighted<Nivel>(`${key}:nivel`, niveis, [74, 9, 17]);
    // Registro: mais recentes pesam mais (base cresce); quem é RT registrou antes do primeiro vínculo.
    const anoProposto = 2026 - Math.floor(Math.pow(chance(`${key}:ano`), 1.6) * 45);
    const limite = linksBy.get(key), ano = limite ? Math.min(anoProposto, Number(limite.slice(0, 4)) - 1) : anoProposto;
    const registroEm = dateBetween(`${key}:reg`, `${ano}-01-01`, ano >= 2026 ? anchor : `${ano}-12-31`);
    const nascimento = ano - between(`${key}:idade`, nivel === 'Técnico' ? 19 : 23, 34);
    const interrupcoes: Profissional['interrupcoes'] = [];
    let canceladoEm: string | undefined;
    const idadeRegistro = toDay(anchor) - toDay(registroEm);
    if (idadeRegistro > 400 && chance(`${key}:int`) < 0.22) {
      const inicio = dateBetween(`${key}:int-ini`, addDays(registroEm, 365), addDays(anchor, -30));
      const volta = chance(`${key}:int-fim`) < 0.45 ? dateBetween(`${key}:int-volta`, addDays(inicio, 90), addDays(anchor, 1)) : undefined;
      interrupcoes.push(volta && volta <= anchor ? { inicio, fim: volta } : { inicio });
    }
    if (idadeRegistro > 1000 && chance(`${key}:canc`) < 0.11) canceladoEm = dateBetween(`${key}:canc-em`, addDays(registroEm, 900), anchor);
    const cityIndex = weighted(`${key}:city`, cities.map((_, position) => position), cityWeights), city = cities[cityIndex];
    const candidatas = ies.filter(row => row.modalidades.includes(modalidade)), escola = candidatas.length ? candidatas[between(`${key}:ies`, 0, candidatas.length - 1)] : ies[0];
    profissionais.push({ id: key, nome: base?.name ?? `${primeiro} ${sobrenomes[between(`${key}:sob`, 0, sobrenomes.length - 1)]} ${String(index + 1).padStart(4, '0')}`, modalidade, nivel, genero, nascimento,
      registroEm, ...(canceladoEm ? { canceladoEm } : {}), interrupcoes, greId: city.greId, cityId: city.id, iesId: escola.id, anoConclusao: ano - between(`${key}:conc`, 0, 3),
      ...(chance(`${key}:inad`) < 0.14 ? { inadimplenteDesde: dateBetween(`${key}:inad-em`, addDays(registroEm, 365), anchor) } : {}) });
  }
  const porId = new Map(profissionais.map(row => [row.id, row]));
  // Autoria das ARTs: RT vigente da empresa na mesma modalidade quando houver; senão, profissional ativo da modalidade na mesma regional.
  const links = new Map<string, Dataset['technicalLinks']>();
  for (const link of dataset.technicalLinks) links.set(link.companyId, [...(links.get(link.companyId) ?? []), link]);
  const porModalidade = new Map<Modalidade, Profissional[]>();
  for (const row of profissionais) porModalidade.set(row.modalidade, [...(porModalidade.get(row.modalidade) ?? []), row]);
  const autoria = new Map<string, string>();
  for (const art of dataset.arts) {
    const modalidade = modalidadeAntiga[art.modality] ?? 'Civil';
    const rts = (links.get(art.companyId) ?? []).filter(link => (modalidadeAntiga[link.modality] ?? 'Civil') === modalidade && link.startDate <= art.date && (!link.endDate || link.endDate > art.date));
    if (rts.length) { autoria.set(art.id, rts[between(`autor:${art.id}`, 0, rts.length - 1)].professionalId); continue; }
    const pool = (porModalidade.get(modalidade) ?? profissionais).filter(row => row.registroEm <= art.date && (!row.canceladoEm || row.canceladoEm > art.date));
    if (pool.length) autoria.set(art.id, pool[between(`autor:${art.id}`, 0, pool.length - 1)].id);
  }
  const value = { profissionais, autoria, porId, anchor };
  cache.set(dataset, value); return value;
}

/** Situação do registro profissional em D; null se ainda não registrado. */
export function situacaoEm(row: Profissional, anchor: string): SituacaoProfissional | null {
  if (row.registroEm > anchor) return null;
  if (row.canceladoEm && row.canceladoEm <= anchor) return 'Cancelado';
  return row.interrupcoes.some(item => item.inicio <= anchor && (!item.fim || item.fim > anchor)) ? 'Interrompido' : 'Ativo';
}
export const adimplenteEm = (row: Profissional, anchor: string) => !row.inadimplenteDesde || row.inadimplenteDesde > anchor;
export const idadeEm = (row: Profissional, anchor: string) => Number(anchor.slice(0, 4)) - row.nascimento;
export const faixasIdade = ['até 29', '30 a 39', '40 a 49', '50 a 59', '60 ou mais'];
export const faixaIdade = (idade: number) => idade < 30 ? faixasIdade[0] : idade < 40 ? faixasIdade[1] : idade < 50 ? faixasIdade[2] : idade < 60 ? faixasIdade[3] : faixasIdade[4];

export interface Grupo { nome: string; ids: string[]; antes: number }
export interface ResumoProfissionais {
  registrados: Profissional[]; ativos: Profissional[]; interrompidos: Profissional[]; cancelados: Profissional[];
  novos: Profissional[]; novosAntes: number; cancelamentos: Profissional[]; cancelamentosAntes: number; interrupcoes: number;
  inadimplentes: Profissional[]; taxaAdimplencia: number | null;
  porModalidade: Grupo[]; porNivel: Grupo[]; porGre: Grupo[]; porIdade: Grupo[]; porGenero: Grupo[];
  mulheres: number | null; idadeMediana: number | null;
  /** ARTs do período por autor: distribuição e concentração. */
  arts: Art[]; autores: number; artsAntes: number; faixasArt: { nome: string; ids: string[] }[]; top: { id: string; nome: string; arts: number; empresas: number }[];
  artsPorModalidade: { modalidade: Modalidade; arts: number; ativos: number; porCem: number | null }[];
  cargaRt: { nome: string; ids: string[] }[]; rtAtivos: number;
  mensal: { month: string; novos: number; cancelamentos: number; arts: number }[];
}
const inside = (date: string | undefined, start: string, end: string) => Boolean(date && date >= start && date <= end);
const shift = (date: string, months: number) => { const d = new Date(`${date}T00:00:00Z`); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1)).toISOString().slice(0, 10); };

/** Tudo lido em D (dataset.snapshotDate da base lida); período de `period` meses até D e o mesmo período um ano antes. */
export function resumoProfissionais(modelo: ModeloProfissionais, dataset: Dataset, greId: string | null, period: number): ResumoProfissionais {
  const anchor = dataset.snapshotDate, start = shift(anchor, -(period - 1)), prevEnd = shift(anchor, -12), prevStart = shift(start, -12);
  const prevEndDay = addDays(shift(prevEnd, 1), -1);
  const mine = modelo.profissionais.filter(row => !greId || row.greId === greId);
  const registrados = mine.filter(row => row.registroEm <= anchor);
  const com = (situacao: SituacaoProfissional) => registrados.filter(row => situacaoEm(row, anchor) === situacao);
  const ativos = com('Ativo'), interrompidos = com('Interrompido'), cancelados = com('Cancelado');
  const grupo = (nome: string, filtro: (row: Profissional) => boolean, antes: (row: Profissional) => boolean): Grupo => ({ nome, ids: ativos.filter(filtro).map(row => row.id), antes: mine.filter(row => row.registroEm <= prevEndDay && situacaoEm(row, prevEndDay) === 'Ativo' && antes(row)).length });
  const gres = new Map(dataset.gres.map(row => [row.id, row.name]));
  const arts = dataset.arts.filter(row => inside(row.date, start, anchor)).filter(row => { const autor = modelo.autoria.get(row.id); return autor && (!greId || modelo.porId.get(autor)?.greId === greId); });
  const artsAntes = dataset.arts.filter(row => inside(row.date, prevStart, prevEndDay)).filter(row => { const autor = modelo.autoria.get(row.id); return autor && (!greId || modelo.porId.get(autor)?.greId === greId); }).length;
  const porAutor = new Map<string, Art[]>();
  for (const art of arts) { const autor = modelo.autoria.get(art.id)!; porAutor.set(autor, [...(porAutor.get(autor) ?? []), art]); }
  const faixas: [string, number, number][] = [['nenhuma', 0, 0], ['1 a 2', 1, 2], ['3 a 10', 3, 10], ['11 a 30', 11, 30], ['mais de 30', 31, Infinity]];
  const faixasArt = faixas.map(([nome, min, max]) => ({ nome, ids: ativos.filter(row => { const n = porAutor.get(row.id)?.length ?? 0; return n >= min && n <= max; }).map(row => row.id) }));
  const top = [...porAutor].map(([id, rows]) => ({ id, nome: modelo.porId.get(id)?.nome ?? id, arts: rows.length, empresas: new Set(rows.map(row => row.companyId)).size })).sort((a, b) => b.arts - a.arts).slice(0, 8);
  const vinculos = dataset.technicalLinks.filter(row => row.startDate <= anchor && (!row.endDate || row.endDate > anchor));
  const porRt = new Map<string, number>();
  for (const link of vinculos) if (!greId || modelo.porId.get(link.professionalId)?.greId === greId) porRt.set(link.professionalId, (porRt.get(link.professionalId) ?? 0) + 1);
  const cargas: [string, number, number][] = [['1 empresa', 1, 1], ['2 empresas', 2, 2], ['3 empresas', 3, 3], ['4 ou mais', 4, Infinity]];
  const idades = ativos.map(row => idadeEm(row, anchor)).sort((a, b) => a - b);
  const months = Array.from({ length: period }, (_, index) => shift(start, index).slice(0, 7));
  return { registrados, ativos, interrompidos, cancelados,
    novos: mine.filter(row => inside(row.registroEm, start, anchor)), novosAntes: mine.filter(row => inside(row.registroEm, prevStart, prevEndDay)).length,
    cancelamentos: mine.filter(row => inside(row.canceladoEm, start, anchor)), cancelamentosAntes: mine.filter(row => inside(row.canceladoEm, prevStart, prevEndDay)).length,
    interrupcoes: mine.filter(row => row.interrupcoes.some(item => inside(item.inicio, start, anchor))).length,
    inadimplentes: ativos.filter(row => !adimplenteEm(row, anchor)), taxaAdimplencia: share(ativos.filter(row => adimplenteEm(row, anchor)).length, ativos.length),
    porModalidade: modalidades.map(name => grupo(name, row => row.modalidade === name, row => row.modalidade === name)).filter(row => row.ids.length),
    porNivel: niveis.map(name => grupo(name, row => row.nivel === name, row => row.nivel === name)),
    porGre: dataset.gres.map(gre => grupo(gres.get(gre.id)!, row => row.greId === gre.id, row => row.greId === gre.id)).filter(row => row.ids.length),
    porIdade: faixasIdade.map(name => grupo(name, row => faixaIdade(idadeEm(row, anchor)) === name, row => faixaIdade(idadeEm(row, prevEndDay)) === name)),
    porGenero: (['Feminino', 'Masculino'] as Genero[]).map(name => grupo(name, row => row.genero === name, row => row.genero === name)),
    mulheres: share(ativos.filter(row => row.genero === 'Feminino').length, ativos.length), idadeMediana: idades.length ? idades[Math.floor(idades.length / 2)] : null,
    arts, autores: porAutor.size, artsAntes, faixasArt, top,
    artsPorModalidade: modalidades.map(modalidade => { const ids = ativos.filter(row => row.modalidade === modalidade), n = arts.filter(row => modelo.porId.get(modelo.autoria.get(row.id)!)?.modalidade === modalidade).length; return { modalidade, arts: n, ativos: ids.length, porCem: ids.length ? n / ids.length * 100 : null }; }).filter(row => row.ativos),
    cargaRt: cargas.map(([nome, min, max]) => ({ nome, ids: [...porRt].filter(([, n]) => n >= min && n <= max).map(([id]) => id) })), rtAtivos: porRt.size,
    mensal: months.map(month => ({ month, novos: mine.filter(row => row.registroEm.startsWith(month)).length, cancelamentos: mine.filter(row => row.canceladoEm?.startsWith(month)).length, arts: arts.filter(row => row.date.startsWith(month)).length })) };
}

/* ---------- Emprego formal agregado por CBO (Novo CAGED / RAIS, demonstrativo) ---------- */
export interface CboInfo { cbo: string; label: string; engenharia: boolean; rotuloAnalista: boolean; piso: boolean; base: number }
/** Rótulos oficiais da CBO; medianas de referência fictícias, calibradas para a ordem de grandeza observada em fontes públicas. */
export const cbos: CboInfo[] = [
  { cbo: '2142-05', label: 'Engenheiro civil', engenharia: true, rotuloAnalista: false, piso: true, base: 9700 },
  { cbo: '2143-05', label: 'Engenheiro eletricista', engenharia: true, rotuloAnalista: false, piso: true, base: 10900 },
  { cbo: '2144-05', label: 'Engenheiro mecânico', engenharia: true, rotuloAnalista: false, piso: true, base: 10400 },
  { cbo: '2145-05', label: 'Engenheiro químico', engenharia: true, rotuloAnalista: false, piso: true, base: 10100 },
  { cbo: '2221-10', label: 'Engenheiro agrônomo', engenharia: true, rotuloAnalista: false, piso: true, base: 7900 },
  { cbo: '2149-15', label: 'Engenheiro de segurança do trabalho', engenharia: true, rotuloAnalista: false, piso: true, base: 9300 },
  { cbo: '2021-10', label: 'Engenheiro de controle e automação', engenharia: true, rotuloAnalista: false, piso: true, base: 11900 },
  { cbo: '2142-70', label: 'Eng. civil · transportes e trânsito (“analista de projetos viários”)', engenharia: true, rotuloAnalista: true, piso: true, base: 5800 },
  { cbo: '2124-05', label: 'Analista de desenvolvimento de sistemas', engenharia: false, rotuloAnalista: true, piso: false, base: 8400 },
  { cbo: '3121-05', label: 'Técnico em construção civil', engenharia: false, rotuloAnalista: false, piso: false, base: 4300 },
];
export interface EmpregoCbo { cbo: string; greId: string; month: string; estoque: number; admissoes: number; desligamentos: number; salarioMediano: number }
const empregoCache = new WeakMap<Dataset, EmpregoCbo[]>();
export function buildEmpregoCbo(dataset: Dataset): EmpregoCbo[] {
  const saved = empregoCache.get(dataset); if (saved) return saved;
  const rows: EmpregoCbo[] = [];
  for (const info of cbos) for (const gre of dataset.gres) {
    const peso = gre.id === 'GRE5' ? 9 : ['GRE2', 'GRE13', 'GRE14'].includes(gre.id) ? 3 : 1;
    let estoque = between(`emp:${info.cbo}:${gre.id}`, 40, 220) * peso;
    dataset.months.forEach((month, index) => {
      const admissoes = between(`emp:${info.cbo}:${gre.id}:${month}:a`, 0, Math.ceil(estoque * (info.rotuloAnalista ? 0.045 : 0.03))), desligamentos = between(`emp:${info.cbo}:${gre.id}:${month}:d`, 0, Math.ceil(estoque * 0.03));
      estoque = Math.max(10, estoque + admissoes - desligamentos);
      const salarioMediano = Math.round(info.base * (1 + index * 0.0035) * (gre.id === 'GRE5' ? 1.08 : 0.97) * (0.96 + chance(`emp:${info.cbo}:${gre.id}:${month}:s`) * 0.08) / 10) * 10;
      rows.push({ cbo: info.cbo, greId: gre.id, month, estoque, admissoes, desligamentos, salarioMediano });
    });
  }
  empregoCache.set(dataset, rows); return rows;
}
export interface RemuneracaoCbo extends CboInfo { estoque: number; saldo: number; salario: number; mes: string }
/** Último mês disponível até D, por CBO: estoque, saldo dos 12 meses e salário mediano ponderado pelo estoque das regionais. */
export function remuneracaoPorCbo(emprego: EmpregoCbo[], anchor: string, greId: string | null): RemuneracaoCbo[] {
  const mes = anchor.slice(0, 7), mine = emprego.filter(row => row.month <= mes && (!greId || row.greId === greId));
  const ultimo = mine.reduce((latest, row) => row.month > latest ? row.month : latest, '');
  const inicio = shift(`${ultimo}-01`, -11).slice(0, 7);
  return cbos.map(info => { const rows = mine.filter(row => row.cbo === info.cbo && row.month === ultimo), estoque = sum(rows.map(row => row.estoque));
    return { ...info, estoque, saldo: sum(mine.filter(row => row.cbo === info.cbo && row.month >= inicio && row.month <= ultimo).map(row => row.admissoes - row.desligamentos)), salario: estoque ? Math.round(sum(rows.map(row => row.salarioMediano * row.estoque)) / estoque) : 0, mes: ultimo }; });
}
