import type { Art, Dataset } from './types';
import { buildEntidades } from './entidades';
import type { Modalidade } from './entidades';
import { modalidades } from './entidades';
import { pesosNivel, titulosDe } from './titulos';
import { municipiosSp } from './municipios';
import { addDays, between, chance, dateBetween, share, sum, toDay, weighted } from './hash';

/**
 * V20 · Profissionais com a mesma profundidade de Empresas. Camada DEMONSTRATIVA: 4.800 pessoas fictícias, sem CPF, com registro,
 * modalidade, nível, situação ao longo do tempo, domicílio, formação (IES do cenário) e autoria das ARTs do cenário.
 * Os 1.600 primeiros são os responsáveis técnicos já existentes na base de empresas. Em produção: cadastro profissional do Crea-SP,
 * ARTs (autor), anuidades PF e, em agregado por CBO e município, Novo CAGED e RAIS.
 */
export type Nivel = 'Engenheiro' | 'Tecnólogo' | 'Técnico';
export const niveis: Nivel[] = ['Engenheiro', 'Tecnólogo', 'Técnico'];
export type Genero = 'Feminino' | 'Masculino';
export type SituacaoProfissional = 'Ativo' | 'Interrompido' | 'Cancelado';
export const situacoesProfissional: SituacaoProfissional[] = ['Ativo', 'Interrompido', 'Cancelado'];
export interface Profissional {
  id: string; nome: string; modalidade: Modalidade; nivel: Nivel;
  /** Código do título profissional no catálogo do Confea (ver titulos.ts). */
  titulo: string; genero: Genero; nascimento: number;
  registroEm: string; canceladoEm?: string; interrupcoes: { inicio: string; fim?: string }[];
  greId: string; cityId: string; iesId: string; anoConclusao: number;
  /** Anuidade PF em dia desde o registro, exceto a partir desta data (demonstrativo). */
  inadimplenteDesde?: string;
}
export interface ModeloProfissionais { profissionais: Profissional[]; autoria: Map<string, string>; porId: Map<string, Profissional>; anchor: string;
  /** Vínculo de RT (id) para o profissional do cenário que responde por ele. */
  rtDe: Map<string, string> }
/** Profissional que responde pelo vínculo de RT no cenário de Profissionais. */
export const rtDoVinculo = (modelo: ModeloProfissionais, link: { id: string; professionalId: string }) => modelo.rtDe.get(link.id) ?? link.professionalId;

export const modalidadeAntiga: Record<string, Modalidade> = { Civil: 'Civil', Elétrica: 'Elétrica', Mecânica: 'Mecânica e metalúrgica', Agronomia: 'Agronomia', 'Segurança do trabalho': 'Segurança do trabalho', Química: 'Química', 'Geologia e minas': 'Geologia e minas', Agrimensura: 'Agrimensura' };
const pesosModalidade = [46, 20, 19, 4, 5, 2, 1, 3];
const femininos = ['Ana', 'Camila', 'Elisa', 'Gabriela', 'Isabela', 'Larissa', 'Natália', 'Paula', 'Sofia', 'Vitória'];
const masculinos = ['Bruno', 'Daniel', 'Felipe', 'Hugo', 'João', 'Marcos', 'Otávio', 'Rafael', 'Tiago', 'William'];
const sobrenomes = ['Almeida', 'Barros', 'Costa', 'Duarte', 'Esteves', 'Ferraz', 'Gomes', 'Lima', 'Moraes', 'Nunes', 'Oliveira', 'Pereira', 'Queiroz', 'Ramos', 'Souza', 'Teixeira'];

const cache = new WeakMap<Dataset, ModeloProfissionais>();
export function buildProfissionais(dataset: Dataset): ModeloProfissionais {
  const saved = cache.get(dataset); if (saved) return saved;
  const anchor = dataset.snapshotDate, ies = buildEntidades(dataset).organizacoes.filter(row => row.grupo === 'IES');
  // Município do endereço entre os 645 do estado, pelo porte de cada um (04/11/2026); antes, só as 24 cidades-sede da amostra.
  const cities = municipiosSp(dataset), cityWeights = cities.map(city => city.populacao);
  const TOTAL = 4800, chave = (index: number) => dataset.professionals[index]?.id ?? `PRO-${String(index + 1).padStart(5, '0')}`;
  const modalidadeDe = (index: number): Modalidade => { const base = dataset.professionals[index]; return base ? modalidadeAntiga[base.modality] ?? 'Civil' : weighted(`${chave(index)}:mod`, modalidades, pesosModalidade); };
  // Quem responde por cada vínculo de RT (03/11/2026). A base de demonstração liga 2.400 vínculos a só 1.600 profissionais, e quase
  // todo RT parecia responder por duas empresas. Aqui, os 150 primeiros profissionais da base continuam com vários vínculos; os demais
  // vínculos vão para profissionais distintos da mesma modalidade, e a maioria dos RTs responde por uma empresa só, como no registro real.
  const indiceBase = new Map(dataset.professionals.map((row, index) => [row.id, index]));
  const livres = new Map<Modalidade, number[]>();
  for (let index = 150; index < TOTAL; index++) { const modalidade = modalidadeDe(index); livres.set(modalidade, [...(livres.get(modalidade) ?? []), index]); }
  const rtDe = new Map<string, string>();
  for (const link of dataset.technicalLinks) {
    if ((indiceBase.get(link.professionalId) ?? 0) < 150) continue;
    const pool = livres.get(modalidadeAntiga[link.modality] ?? 'Civil') ?? [];
    if (pool.length) rtDe.set(link.id, chave(pool[between(`rt:${link.id}`, 0, pool.length - 1)]));
  }
  const rtId = (link: { id: string; professionalId: string }) => rtDe.get(link.id) ?? link.professionalId;
  const linksBy = new Map<string, string>();
  for (const link of dataset.technicalLinks) { const id = rtId(link); if (!linksBy.has(id) || link.startDate < linksBy.get(id)!) linksBy.set(id, link.startDate); }
  const profissionais: Profissional[] = [];
  for (let index = 0; index < TOTAL; index++) {
    const base = dataset.professionals[index], key = base ? base.id : `PRO-${String(index + 1).padStart(5, '0')}`;
    // Participação feminina perto da observada no Sistema Confea/Crea (cerca de um quinto dos registrados); o nome segue o gênero sorteado.
    const genero: Genero = chance(`${key}:genero`) < 0.22 ? 'Feminino' : 'Masculino', nomes = genero === 'Feminino' ? femininos : masculinos;
    const primeiro = nomes[between(`${key}:nome`, 0, nomes.length - 1)];
    const modalidade = modalidadeDe(index);
    // Nível e título profissional (04/11/2026): técnico só o de Segurança do Trabalho, o único de nível técnico que ficou no Crea
    // depois da Lei nº 13.639/2018; antes, 17% dos registrados de todas as modalidades eram técnicos. O título segue o catálogo do Confea.
    const [nivelOpcoes, nivelPesos] = pesosNivel(modalidade), nivel = weighted<Nivel>(`${key}:nivel`, nivelOpcoes, nivelPesos);
    const opcoes = titulosDe(modalidade, nivel), titulo = weighted(`${key}:titulo`, opcoes, opcoes.map(row => row.peso)).codigo;
    // Registro: os registros novos crescem devagar, cerca de 3% ao ano, ao longo de 45 anos (a base cresce sem saltos). Antes de
    // 03/11/2026 o sorteio concentrava registros no ano corrente e os registros novos pareciam dobrar em um ano. Quem é RT
    // registrou antes do primeiro vínculo.
    const taxa = 0.03, anosAtras = -Math.log(1 - chance(`${key}:ano`) * (1 - Math.exp(-taxa * 45))) / taxa;
    const proposto = addDays(anchor, -Math.round(anosAtras * 365.25));
    const limite = linksBy.get(key), ano = limite && proposto >= `${limite.slice(0, 4)}-01-01` ? Number(limite.slice(0, 4)) - 1 - between(`${key}:recuo`, 0, 12) : Number(proposto.slice(0, 4));
    const registroEm = limite && ano < Number(proposto.slice(0, 4)) ? dateBetween(`${key}:reg`, `${ano}-01-01`, `${ano}-12-31`) : proposto;
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
    profissionais.push({ id: key, nome: base?.name ?? `${primeiro} ${sobrenomes[between(`${key}:sob`, 0, sobrenomes.length - 1)]} ${String(index + 1).padStart(4, '0')}`, modalidade, nivel, titulo, genero, nascimento,
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
    if (rts.length) { autoria.set(art.id, rtId(rts[between(`autor:${art.id}`, 0, rts.length - 1)])); continue; }
    const pool = (porModalidade.get(modalidade) ?? profissionais).filter(row => row.registroEm <= art.date && (!row.canceladoEm || row.canceladoEm > art.date));
    if (pool.length) autoria.set(art.id, pool[between(`autor:${art.id}`, 0, pool.length - 1)].id);
  }
  const value = { profissionais, autoria, porId, anchor, rtDe };
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

/** Recorte do painel de Profissionais: município do endereço, modalidade e gênero (desde 04/11/2026), além da regional. */
export interface FiltroProfissional { cityId?: string | null; modalidade?: string | null; genero?: Genero | null }
/** O profissional está no recorte (regional, município, modalidade e gênero escolhidos no alto da tela)? */
export const noRecorte = (row: Profissional | undefined, greId: string | null, filtro: FiltroProfissional = {}) => Boolean(row && (!greId || row.greId === greId) && (!filtro.cityId || row.cityId === filtro.cityId) && (!filtro.modalidade || row.modalidade === filtro.modalidade) && (!filtro.genero || row.genero === filtro.genero));

/** Tudo lido em D (dataset.snapshotDate da base lida); período de `period` meses até D e o mesmo período um ano antes. */
export function resumoProfissionais(modelo: ModeloProfissionais, dataset: Dataset, greId: string | null, period: number, filtro: FiltroProfissional = {}): ResumoProfissionais {
  const anchor = dataset.snapshotDate, start = shift(anchor, -(period - 1)), prevEnd = shift(anchor, -12), prevStart = shift(start, -12);
  const prevEndDay = addDays(shift(prevEnd, 1), -1);
  const dentro = (row: Profissional | undefined) => noRecorte(row, greId, filtro);
  const mine = modelo.profissionais.filter(dentro);
  const registrados = mine.filter(row => row.registroEm <= anchor);
  const com = (situacao: SituacaoProfissional) => registrados.filter(row => situacaoEm(row, anchor) === situacao);
  const ativos = com('Ativo'), interrompidos = com('Interrompido'), cancelados = com('Cancelado');
  const grupo = (nome: string, filtro: (row: Profissional) => boolean, antes: (row: Profissional) => boolean): Grupo => ({ nome, ids: ativos.filter(filtro).map(row => row.id), antes: mine.filter(row => row.registroEm <= prevEndDay && situacaoEm(row, prevEndDay) === 'Ativo' && antes(row)).length });
  const gres = new Map(dataset.gres.map(row => [row.id, row.name]));
  const arts = dataset.arts.filter(row => inside(row.date, start, anchor)).filter(row => { const autor = modelo.autoria.get(row.id); return autor && dentro(modelo.porId.get(autor)); });
  const artsAntes = dataset.arts.filter(row => inside(row.date, prevStart, prevEndDay)).filter(row => { const autor = modelo.autoria.get(row.id); return autor && dentro(modelo.porId.get(autor)); }).length;
  const porAutor = new Map<string, Art[]>();
  for (const art of arts) { const autor = modelo.autoria.get(art.id)!; porAutor.set(autor, [...(porAutor.get(autor) ?? []), art]); }
  const faixas: [string, number, number][] = [['nenhuma ART', 0, 0], ['1 ART', 1, 1], ['2 ARTs', 2, 2], ['3 ARTs', 3, 3], ['4 ou mais', 4, Infinity]];
  const faixasArt = faixas.map(([nome, min, max]) => ({ nome, ids: ativos.filter(row => { const n = porAutor.get(row.id)?.length ?? 0; return n >= min && n <= max; }).map(row => row.id) }));
  const top = [...porAutor].map(([id, rows]) => ({ id, nome: modelo.porId.get(id)?.nome ?? id, arts: rows.length, empresas: new Set(rows.map(row => row.companyId)).size })).sort((a, b) => b.arts - a.arts).slice(0, 8);
  const vinculos = dataset.technicalLinks.filter(row => row.startDate <= anchor && (!row.endDate || row.endDate > anchor));
  const porRt = new Map<string, number>();
  for (const link of vinculos) { const id = rtDoVinculo(modelo, link); if (dentro(modelo.porId.get(id))) porRt.set(id, (porRt.get(id) ?? 0) + 1); }
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
export interface CboInfo { cbo: string; label: string; engenharia: boolean; rotuloAnalista: boolean; piso: boolean; base: number;
  /** Tamanho relativo da ocupação no emprego formal (o engenheiro civil é a maior) e modalidade do Crea-SP a que ela corresponde. */
  peso: number; modalidade?: Modalidade;
  /** Parte das mulheres nos empregos da ocupação, em %. Em produção vem do campo sexo dos microdados da RAIS e do Novo CAGED. */
  mulheres: number }
/** Rótulos oficiais da CBO; medianas de referência fictícias, calibradas para a ordem de grandeza observada em fontes públicas. */
export const cbos: CboInfo[] = [
  { cbo: '2142-05', label: 'Engenheiro civil', engenharia: true, rotuloAnalista: false, piso: true, base: 9700, peso: 3, modalidade: 'Civil', mulheres: 22 },
  { cbo: '2143-05', label: 'Engenheiro eletricista', engenharia: true, rotuloAnalista: false, piso: true, base: 10900, peso: 1.6, modalidade: 'Elétrica', mulheres: 11 },
  { cbo: '2144-05', label: 'Engenheiro mecânico', engenharia: true, rotuloAnalista: false, piso: true, base: 10400, peso: 1.5, modalidade: 'Mecânica e metalúrgica', mulheres: 9 },
  { cbo: '2145-05', label: 'Engenheiro químico', engenharia: true, rotuloAnalista: false, piso: true, base: 10100, peso: 0.6, modalidade: 'Química', mulheres: 38 },
  { cbo: '2221-10', label: 'Engenheiro agrônomo', engenharia: true, rotuloAnalista: false, piso: true, base: 7900, peso: 0.8, modalidade: 'Agronomia', mulheres: 27 },
  { cbo: '2149-15', label: 'Engenheiro de segurança do trabalho', engenharia: true, rotuloAnalista: false, piso: true, base: 9300, peso: 0.9, modalidade: 'Segurança do trabalho', mulheres: 21 },
  { cbo: '2021-10', label: 'Engenheiro de controle e automação', engenharia: true, rotuloAnalista: false, piso: true, base: 11900, peso: 0.6, modalidade: 'Elétrica', mulheres: 12 },
  { cbo: '2142-70', label: 'Eng. civil · transportes e trânsito (“analista de projetos viários”)', engenharia: true, rotuloAnalista: true, piso: true, base: 5800, peso: 0.3, modalidade: 'Civil', mulheres: 31 },
  { cbo: '2124-05', label: 'Analista de desenvolvimento de sistemas', engenharia: false, rotuloAnalista: true, piso: false, base: 8400, peso: 3.5, mulheres: 19 },
  { cbo: '3121-05', label: 'Técnico em construção civil', engenharia: false, rotuloAnalista: false, piso: false, base: 4300, peso: 2.2, mulheres: 14 },
];
export interface EmpregoCbo { cbo: string; greId: string; month: string; estoque: number; admissoes: number; desligamentos: number; salarioMediano: number }
const empregoCache = new WeakMap<Dataset, EmpregoCbo[]>();
export function buildEmpregoCbo(dataset: Dataset): EmpregoCbo[] {
  const saved = empregoCache.get(dataset); if (saved) return saved;
  const rows: EmpregoCbo[] = [];
  for (const info of cbos) for (const gre of dataset.gres) {
    const peso = gre.id === 'GRE5' ? 9 : ['GRE2', 'GRE13', 'GRE14'].includes(gre.id) ? 3 : 1;
    let estoque = Math.round(between(`emp:${info.cbo}:${gre.id}`, 60, 140) * peso * info.peso);
    dataset.months.forEach((month, index) => {
      // Desligamentos acompanham as admissões (03/11/2026): sorteados à parte, o saldo oscilava mais de 1% do estoque por mês e o
      // emprego parecia subir e cair em ondas. Agora a rotatividade fica entre 1,2% e 2% ao mês e o estoque cresce devagar, perto de 2% ao ano.
      const admissoes = between(`emp:${info.cbo}:${gre.id}:${month}:a`, Math.floor(estoque * 0.012), Math.ceil(estoque * 0.02));
      const desligamentos = Math.round(admissoes * between(`emp:${info.cbo}:${gre.id}:${month}:d`, info.rotuloAnalista ? 72 : 80, info.rotuloAnalista ? 96 : 100) / 100);
      estoque = Math.max(10, estoque + admissoes - desligamentos);
      const salarioMediano = Math.round(info.base * (1 + index * 0.0035) * (gre.id === 'GRE5' ? 1.08 : 0.97) * (0.96 + chance(`emp:${info.cbo}:${gre.id}:${month}:s`) * 0.08) / 10) * 10;
      rows.push({ cbo: info.cbo, greId: gre.id, month, estoque, admissoes, desligamentos, salarioMediano });
    });
  }
  empregoCache.set(dataset, rows); return rows;
}
/** Distribuição do salário de uma ocupação: os pontos de 10%, 25%, 50% (mediana), 75% e 90% e a parte dos empregos abaixo de um valor.
 * Em produção vem dos microdados públicos da RAIS e do Novo CAGED (cada vínculo com CBO e remuneração, sem identificar a pessoa).
 * No cenário, a forma é log-normal em torno da mediana, com dispersão própria de cada ocupação. */
export interface FaixaSalarial { p10: number; p25: number; p50: number; p75: number; p90: number; dispersao: number }
const normalAcumulada = (z: number) => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
export const parteAbaixo = (faixa: FaixaSalarial, valor: number) => faixa.p50 > 0 ? normalAcumulada(Math.log(valor / faixa.p50) / faixa.dispersao) * 100 : null;
export interface RemuneracaoCbo extends CboInfo { estoque: number; saldo: number; salario: number; mes: string; faixa: FaixaSalarial }
/**
 * Emprego e salário de um gênero (filtro do alto da tela, 04/11/2026). O cenário guarda os totais da ocupação; aqui a parte de cada
 * gênero sai da parte das mulheres na ocupação, e o salário típico delas fica cerca de 12% abaixo do dos homens na mesma ocupação,
 * a ordem de grandeza da diferença que a RAIS mostra nas engenharias. Em produção, os dois saem direto dos microdados, que trazem o sexo.
 */
export function fatorGenero(info: CboInfo, genero: Genero | null | undefined) {
  if (!genero) return { quantidade: 1, salario: 1 };
  const f = info.mulheres / 100, homens = 1 / (f * 0.88 + (1 - f));
  return genero === 'Feminino' ? { quantidade: f, salario: 0.88 * homens } : { quantidade: 1 - f, salario: homens };
}
/** Último mês disponível até D, por CBO: estoque, saldo dos 12 meses e salário mediano ponderado pelo estoque das regionais. */
export function remuneracaoPorCbo(emprego: EmpregoCbo[], anchor: string, greId: string | null, genero: Genero | null = null): RemuneracaoCbo[] {
  const mes = anchor.slice(0, 7), mine = emprego.filter(row => row.month <= mes && (!greId || row.greId === greId));
  const ultimo = mine.reduce((latest, row) => row.month > latest ? row.month : latest, '');
  const inicio = shift(`${ultimo}-01`, -11).slice(0, 7);
  return cbos.map(info => { const rows = mine.filter(row => row.cbo === info.cbo && row.month === ultimo), total = sum(rows.map(row => row.estoque)), fator = fatorGenero(info, genero);
    const estoque = Math.round(total * fator.quantidade), salario = total ? Math.round(sum(rows.map(row => row.salarioMediano * row.estoque)) / total * fator.salario / 10) * 10 : 0;
    // Dispersão: técnicos e analistas variam menos entre si; engenharias de controle, elétrica e civil (obra e projeto) variam mais.
    const dispersao = (info.rotuloAnalista ? 0.36 : info.engenharia ? 0.34 : 0.28) + between(`faixa:${info.cbo}`, 0, 8) / 100;
    const ponto = (z: number) => Math.round(salario * Math.exp(dispersao * z) / 10) * 10;
    return { ...info, estoque, saldo: Math.round(sum(mine.filter(row => row.cbo === info.cbo && row.month >= inicio && row.month <= ultimo).map(row => row.admissoes - row.desligamentos)) * fator.quantidade), salario, mes: ultimo,
      faixa: { p10: ponto(-1.2816), p25: ponto(-0.6745), p50: salario, p75: ponto(0.6745), p90: ponto(1.2816), dispersao } }; });
}
