import type { Dataset } from './types';
import { addDays, between, chance, share, sum, weighted } from './hash';
import { municipiosSp } from './municipios';
import type { Municipio } from './municipios';
import type { Entidades, Modalidade, Organizacao } from './entidades';
import type { ModeloProfissionais, Profissional } from './profissionais';
import { adimplenteEm, situacaoEm } from './profissionais';
import type { InstitutionalServiceRequest } from './institutional';
import { mainEstablishments } from '../gestao-v14/metrics';
import type { Conselho, FonteReceita } from './conselho';
import { fontesReceita } from './conselho';

/**
 * Painel de Gestão do Conselho (06/11/2026): camadas que os painéis anteriores não tinham.
 *
 * - Processos nas câmaras especializadas e recursos ao plenário: entrada, relator, pauta, julgamento, decisão e, nos autos de
 *   infração, a data do fato e o prazo de prescrição de cinco anos (Lei 9.873/1999, art. 1º). Camada DEMONSTRATIVA; em produção,
 *   vem do sistema de processos do Crea-SP (SQL Server ou Db2).
 * - Composição do plenário por câmara, a partir das cadeiras das entidades e instituições de ensino, comparada com a parte dos
 *   profissionais ativos de cada modalidade.
 * - Carteira de dívida: anuidades de profissionais em atraso e boletos de empresas vencidos, com a idade, o piso de execução
 *   judicial (cinco vezes a anuidade de pessoa física, Lei 12.514/2011, art. 8º, com a redação da Lei 14.195/2021) e a prescrição
 *   de cinco anos (Código Tributário Nacional, art. 174).
 * - Distância de cada município até a unidade de atendimento mais próxima (as UGIs da tabela oficial e a sede na capital).
 *
 * Nenhuma regra aqui conclui irregularidade: os blocos mostram estoques, prazos e composições, e o (i) de cada um diz o limite.
 */

const DAY = 86400000;
const diasEntre = (de: string, ate: string) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / DAY);
const mesesAte = (inicio: string, anchor: string) => { const out: string[] = []; const d = new Date(`${inicio.slice(0, 7)}-01T00:00:00Z`); while (`${d.toISOString().slice(0, 7)}-01` <= anchor) { out.push(d.toISOString().slice(0, 7)); d.setUTCMonth(d.getUTCMonth() + 1); } return out; };
const fimDoMes = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);
export const mediana = (values: number[]) => { if (!values.length) return null; const s = [...values].sort((a, b) => a - b), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/* ---------- Câmaras e modalidades ---------- */
/** As nove câmaras, com os nomes do sistema do Conselho (mesma lista de `camaras` em painel/analise.ts). */
export type CamaraConselho = 'Civil' | 'Elétrica' | 'Mecânica e Metalúrgica' | 'Segurança do Trabalho' | 'Agronomia' | 'Química' | 'Ambiental e Sanitária' | 'Agrimensura' | 'Geologia e Minas';
export const camarasConselho: CamaraConselho[] = ['Civil', 'Elétrica', 'Mecânica e Metalúrgica', 'Segurança do Trabalho', 'Agronomia', 'Química', 'Ambiental e Sanitária', 'Agrimensura', 'Geologia e Minas'];
/** Modalidade do profissional que cada câmara julga. A Ambiental e Sanitária não tem modalidade própria no cenário (os engenheiros ambientais estão na Civil). */
export const modalidadeDaCamara: Record<CamaraConselho, Modalidade | null> = { Civil: 'Civil', Elétrica: 'Elétrica', 'Mecânica e Metalúrgica': 'Mecânica e metalúrgica', 'Segurança do Trabalho': 'Segurança do trabalho', Agronomia: 'Agronomia', Química: 'Química', 'Ambiental e Sanitária': null, Agrimensura: 'Agrimensura', 'Geologia e Minas': 'Geologia e minas' };
const camaraDaModalidade = new Map(Object.entries(modalidadeDaCamara).filter(([, mod]) => mod).map(([camara, mod]) => [mod as Modalidade, camara as CamaraConselho]));

/* ---------- Processos nas câmaras e no plenário ---------- */
export type TipoProcesso = 'Auto de infração' | 'Registro e atribuição' | 'Acervo técnico' | 'Ética profissional';
export const tiposProcesso: TipoProcesso[] = ['Auto de infração', 'Registro e atribuição', 'Acervo técnico', 'Ética profissional'];
export type Decisao = 'Auto mantido' | 'Multa reduzida' | 'Auto anulado' | 'Arquivado pela prescrição' | 'Deferido' | 'Indeferido' | 'Arquivado';
export interface Processo {
  id: string; camara: CamaraConselho; tipo: TipoProcesso; greId: string; cityId: string; companyId?: string;
  entrada: string; relatorEm: string; pautaEm: string; julgadoEm: string; decisao: Decisao;
  /** Só autos de infração: data do fato, prazo de prescrição (cinco anos do fato) e valor da multa. */
  fatoEm?: string; prescreveEm?: string; multa?: number;
  /** Recurso ao plenário, quando a parte recorre da decisão da câmara. */
  recursoEm?: string; plenarioEm?: string; decisaoPlenario?: 'Decisão mantida' | 'Decisão reformada';
  /**
   * Marcos do GovAdm e do Votenet (07/11/2026, guia do processo de infração da SUPCOL): a abertura (no auto, o recurso ao auto), o
   * cadastro manual no Votenet depois do recebimento na câmara, o relato em revisão e assinado, e os desvios que não encerram o
   * processo (pedido de vista, diligência, impedimento do relator). `ia` diz que o relator acionou a IA para gerar o relato.
   */
  aberturaEm: string; cadastroEm: string; revisaoEm: string; assinadoEm: string; ia: boolean; vista: boolean; diligencia: boolean; impedimento: boolean;
}
/** A IA de relato no Votenet chegou em julho de 2025 no cenário; o relator decide se a aciona. */
export const INICIO_IA = '2025-07-01';
/** Processos que entram por mês em cada câmara (a Civil é a maior, como no Crea-SP). */
const entradaMensal: Record<CamaraConselho, number> = { Civil: 22, Elétrica: 8, 'Mecânica e Metalúrgica': 6, 'Segurança do Trabalho': 4, Agronomia: 5, Química: 3, 'Ambiental e Sanitária': 2, Agrimensura: 2, 'Geologia e Minas': 1.5 };
export const INICIO_PROCESSOS = '2020-01-01';
/** Sigla de cada câmara no número do processo. As três primeiras letras não servem: Agronomia e Agrimensura dariam o mesmo número. */
const siglaCamara: Record<CamaraConselho, string> = { Civil: 'CIV', Elétrica: 'ELE', 'Mecânica e Metalúrgica': 'MEC', 'Segurança do Trabalho': 'SEG', Agronomia: 'AGR', Química: 'QUI', 'Ambiental e Sanitária': 'AMB', Agrimensura: 'AGM', 'Geologia e Minas': 'GEO' };

function sorteioMunicipio(lista: Municipio[]) {
  const pesos = lista.map(row => Math.pow(Math.max(5000, row.populacao), 0.9)), total = sum(pesos), acumulado: number[] = [];
  let soma = 0; for (const peso of pesos) { soma += peso / total; acumulado.push(soma); }
  return (key: string) => { const u = chance(key); let lo = 0, hi = acumulado.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (acumulado[mid] < u) lo = mid + 1; else hi = mid; } return lista[lo]; };
}

const cacheProcessos = new WeakMap<Dataset, Processo[]>();
/** Todos os processos de 2020 até a data de corte do cenário; o que aconteceu depois da data de referência é descartado na leitura. */
export function buildProcessos(dataset: Dataset): Processo[] {
  const saved = cacheProcessos.get(dataset); if (saved) return saved;
  const anchor = dataset.snapshotDate, municipios = municipiosSp(dataset), sorteia = sorteioMunicipio(municipios), empresas = dataset.companies;
  const out: Processo[] = [];
  for (const month of mesesAte(INICIO_PROCESSOS, anchor)) for (const camara of camarasConselho) {
    const n = Math.round(entradaMensal[camara] * (0.8 + chance(`pc:n:${month}:${camara}`) * 0.4) * (month.endsWith('-01') ? 0.6 : 1));
    for (let index = 0; index < n; index++) {
      const key = `pc:${month}:${camara}:${index}`, tipo = weighted<TipoProcesso>(`${key}:t`, tiposProcesso, [55, 28, 12, 5]);
      const entrada = addDays(`${month}-01`, between(`${key}:d`, 0, 27)), lugar = sorteia(`${key}:m`);
      const relatorEm = addDays(entrada, between(`${key}:r`, 3, 75)), cadastroEm = addDays(entrada, Math.floor(diasEntre(entrada, relatorEm) * chance(`${key}:cad`) * 0.7));
      // Relatoria: a maior parte em até um ano; uma cauda longa passa de dois anos, sem chegar aos três da prescrição intercorrente
      // (Lei 9.873/1999, art. 1º, § 1º), e alguns autos chegam aos cinco anos do fato. Com a IA, o relato sai em cerca de 30% menos tempo.
      const ia = relatorEm >= INICIO_IA && chance(`${key}:ia`) < 0.45;
      const faixa = weighted(`${key}:f`, [0, 1, 2, 3], [48, 31, 13, 8]), bruta = [between(`${key}:f0`, 25, 120), between(`${key}:f1`, 121, 365), between(`${key}:f2`, 366, 730), between(`${key}:f3`, 731, 1070)][faixa];
      const relatoria = ia ? Math.max(20, Math.round(bruta * 0.7)) : bruta, assinadoEm = addDays(relatorEm, relatoria - between(`${key}:as`, 3, Math.min(20, relatoria - 10)));
      const revisaoEm = addDays(assinadoEm, -between(`${key}:rv`, 2, Math.max(2, Math.min(15, diasEntre(relatorEm, assinadoEm) - 5))));
      // Pedido de vista e diligência não encerram o processo: ele volta à pauta numa sessão seguinte.
      const vista = chance(`${key}:vista`) < 0.1, diligencia = !vista && chance(`${key}:dil`) < 0.06, impedimento = chance(`${key}:imp`) < 0.04;
      const pautaEm = addDays(relatorEm, relatoria), julgadoPrevisto = addDays(pautaEm, between(`${key}:j`, 0, 40) + (vista ? between(`${key}:vd`, 25, 35) : 0) + (diligencia ? between(`${key}:dd`, 45, 150) : 0));
      const companyId = (tipo === 'Auto de infração' && chance(`${key}:pj`) < 0.7) || (tipo === 'Registro e atribuição' && chance(`${key}:pj`) < 0.5) ? empresas[Math.floor(chance(`${key}:e`) * empresas.length)].id : undefined;
      const processo: Processo = { id: `PC-${month.replace('-', '')}-${siglaCamara[camara]}-${String(index + 1).padStart(3, '0')}`, camara, tipo, greId: lugar.greId, cityId: lugar.id, ...(companyId ? { companyId } : {}),
        entrada, relatorEm, pautaEm, julgadoEm: julgadoPrevisto, decisao: 'Deferido', aberturaEm: addDays(entrada, -between(`${key}:ab`, 10, 90)), cadastroEm, revisaoEm, assinadoEm, ia, vista, diligencia, impedimento };
      if (tipo === 'Auto de infração') {
        const fatoEm = addDays(entrada, -(chance(`${key}:fv`) < 0.8 ? between(`${key}:fato`, 30, 540) : between(`${key}:fato`, 541, 1200))), prescreveEm = addDays(fatoEm, 1826);
        processo.fatoEm = fatoEm; processo.prescreveEm = prescreveEm; processo.multa = Math.round(between(`${key}:v`, 1800, 9000) / 10) * 10;
        if (julgadoPrevisto > prescreveEm) { processo.julgadoEm = prescreveEm; processo.pautaEm = processo.pautaEm > prescreveEm ? prescreveEm : processo.pautaEm; processo.decisao = 'Arquivado pela prescrição'; }
        else processo.decisao = weighted<Decisao>(`${key}:dec`, ['Auto mantido', 'Multa reduzida', 'Auto anulado'], [62, 19, 19]);
      } else processo.decisao = weighted<Decisao>(`${key}:dec`, ['Deferido', 'Indeferido', 'Arquivado'], [74, 20, 6]);
      if ((processo.decisao === 'Auto mantido' || processo.decisao === 'Multa reduzida' || processo.decisao === 'Indeferido') && chance(`${key}:rec`) < 0.28) {
        processo.recursoEm = addDays(processo.julgadoEm, between(`${key}:rd`, 10, 60));
        processo.plenarioEm = addDays(processo.recursoEm, chance(`${key}:pd`) < 0.7 ? between(`${key}:p1`, 60, 240) : between(`${key}:p2`, 241, 700));
        processo.decisaoPlenario = chance(`${key}:pl`) < 0.78 ? 'Decisão mantida' : 'Decisão reformada';
      }
      out.push(processo);
    }
  }
  cacheProcessos.set(dataset, out); return out;
}

/** Sessões ordinárias por mês: a Civil se reúne duas vezes, as demais uma; em janeiro não há sessão. */
export const sessoesNoMes = (camara: CamaraConselho, month: string) => month.endsWith('-01') ? 0 : camara === 'Civil' ? 2 : 1;

export interface RecorteGestao { greId: string | null; cityId: string | null; camara: string | null }
const noRecorte = (row: { greId: string; cityId: string }, r: RecorteGestao) => (!r.greId || row.greId === r.greId) && (!r.cityId || row.cityId === r.cityId);

/* ---------- Plenário: cadeiras por câmara e base de profissionais ---------- */
/** A câmara da cadeira `index` de uma organização: as cadeiras se dividem, uma a uma, entre as modalidades que ela representa (entidades) ou os cursos que oferece (IES); uma parte das organizações com mais de uma cadeira cede a última à câmara Ambiental e Sanitária. */
export function camaraDaCadeira(org: Organizacao, index: number): CamaraConselho {
  const destinos = org.modalidades.map(mod => camaraDaModalidade.get(mod)).filter((camara): camara is CamaraConselho => Boolean(camara));
  const ambiental = org.cadeiras >= 2 && chance(`amb:${org.id}`) < 0.35;
  return ambiental && index === org.cadeiras - 1 ? 'Ambiental e Sanitária' : destinos[(index + Math.floor(chance(`cad:${org.id}`) * destinos.length)) % Math.max(1, destinos.length)] ?? 'Civil';
}
export interface LinhaPlenario { camara: CamaraConselho; cadeiras: number; parteCadeiras: number | null; profissionais: number; parteProfissionais: number | null; organizacoes: string[] }
/** As cadeiras de cada organização se dividem, uma a uma, entre as modalidades que ela representa (entidades) ou os cursos que oferece (IES); uma parte das organizações com mais de uma cadeira cede a última à câmara Ambiental e Sanitária. Os profissionais são os ativos na data. */
export function plenario(entidades: Entidades, modelo: ModeloProfissionais, anchor: string): LinhaPlenario[] {
  const cadeiras = new Map<CamaraConselho, { n: number; orgs: string[] }>();
  const soma = (camara: CamaraConselho, sigla: string) => { const item = cadeiras.get(camara) ?? { n: 0, orgs: [] }; item.n += 1; if (!item.orgs.includes(sigla)) item.orgs.push(sigla); cadeiras.set(camara, item); };
  for (const org of entidades.organizacoes.filter(row => row.registradaEm <= anchor && row.cadeiras > 0))
    for (let index = 0; index < org.cadeiras; index++) soma(camaraDaCadeira(org, index), org.sigla);
  const ativos = modelo.profissionais.filter(row => situacaoEm(row, anchor) === 'Ativo');
  const porModalidade = new Map<Modalidade, number>(); for (const row of ativos) porModalidade.set(row.modalidade, (porModalidade.get(row.modalidade) ?? 0) + 1);
  const totalCadeiras = sum([...cadeiras.values()].map(row => row.n)), totalProfissionais = ativos.length;
  return camarasConselho.map(camara => { const mod = modalidadeDaCamara[camara], n = cadeiras.get(camara)?.n ?? 0, prof = mod ? porModalidade.get(mod) ?? 0 : 0;
    return { camara, cadeiras: n, parteCadeiras: share(n, totalCadeiras), profissionais: prof, parteProfissionais: mod ? share(prof, totalProfissionais) : null, organizacoes: cadeiras.get(camara)?.orgs ?? [] }; });
}

/* ---------- Carteira de dívida: profissionais e empresas ---------- */
/** Anuidade de pessoa física de nível superior no cenário, por ano (demonstrativa, reajustada todo ano). */
export const anuidadePf = (ano: number) => Math.round(520 * Math.pow(1.055, Math.max(0, ano - 2020)));
/** Piso para a execução judicial: cinco vezes a anuidade de pessoa física do ano (Lei 12.514/2011, art. 8º, redação da Lei 14.195/2021). */
export const pisoExecucao = (ano: number) => 5 * anuidadePf(ano);
export type Devedor = 'Profissional' | 'Empresa';
export interface Titulo { id: string; devedor: Devedor; pessoaId: string; greId: string; cityId: string; vencimento: string; valor: number; pagoEm?: string }
export interface Carteira { titulos: Titulo[] }
const cacheCarteira = new WeakMap<Dataset, Carteira>();
/** Títulos de anuidade: os boletos de empresas do cenário e, para os profissionais com anuidade em atraso, um título por ano a partir do atraso (vence em 31 de março). */
export function buildCarteira(dataset: Dataset, modelo: ModeloProfissionais): Carteira {
  const saved = cacheCarteira.get(dataset); if (saved) return saved;
  const main = mainEstablishments(dataset), titulos: Titulo[] = [];
  for (const row of dataset.invoices) { const place = main.get(row.companyId); if (!place) continue;
    titulos.push({ id: row.id, devedor: 'Empresa', pessoaId: row.companyId, greId: place.greId, cityId: place.cityId, vencimento: row.dueDate, valor: row.amount, ...(row.paymentDate ? { pagoEm: row.paymentDate } : {}) }); }
  const anoCorte = Number(dataset.snapshotDate.slice(0, 4));
  for (const p of modelo.profissionais) {
    if (!p.inadimplenteDesde) continue;
    const primeiro = Number(p.inadimplenteDesde.slice(0, 4)) + (p.inadimplenteDesde.slice(5) > '03-31' ? 1 : 0);
    for (let ano = primeiro; ano <= anoCorte; ano++) {
      const vencimento = `${ano}-03-31`; if (p.canceladoEm && p.canceladoEm < vencimento) break;
      titulos.push({ id: `PF-${p.id}-${ano}`, devedor: 'Profissional', pessoaId: p.id, greId: p.greId, cityId: p.cityId, vencimento, valor: anuidadePf(ano) });
    }
  }
  const value = { titulos }; cacheCarteira.set(dataset, value); return value;
}
/** Título vencido e não pago na data, ainda não prescrito. */
export const vencidoEm = (t: Titulo, d: string) => t.vencimento < d && (!t.pagoEm || t.pagoEm > d) && diasEntre(t.vencimento, d) <= 1826;
export const prescritoEm = (t: Titulo, d: string) => t.vencimento < d && (!t.pagoEm || t.pagoEm > d) && diasEntre(t.vencimento, d) > 1826;
export const faixasIdadeDivida = ['até 1 ano', '1 a 2 anos', '2 a 3 anos', '3 a 4 anos', '4 a 5 anos'];
export const faixaIdadeDivida = (dias: number) => Math.min(4, Math.floor(dias / 365.25));
export interface DevedorLinha { pessoaId: string; devedor: Devedor; greId: string; cityId: string; valor: number; titulos: Titulo[]; maisAntigo: string; acimaDoPiso: boolean }
export interface QuadroDivida {
  devedores: DevedorLinha[]; total: number; totalAntes: number; pf: number; pj: number;
  /** Por faixa de idade do título: valor abaixo e acima do piso de execução (pela soma do devedor). */
  idade: { faixa: string; abaixo: number; acima: number; pf: number; pj: number; pessoas: Set<string> }[];
  abaixoDoPiso: number; piso: number; pertoDePrescrever: number; pertoIds: string[];
  cascata: { inicio: number; novos: number; recebidos: number; prescritos: number; fim: number };
  /** Curvas de recuperação dos boletos de empresas vencidos em cada semestre: parte do valor paga até k meses depois do vencimento. */
  coortes: { nome: string; valor: number; curva: (number | null)[] }[];
  mensal: { month: string; valor: number }[];
}
export function quadroDivida(carteira: Carteira, anchor: string, r: RecorteGestao, start: string, prevEnd: string, meses: string[]): QuadroDivida {
  const mine = carteira.titulos.filter(t => noRecorte(t, r));
  const abertos = mine.filter(t => vencidoEm(t, anchor)), porPessoa = new Map<string, Titulo[]>();
  for (const t of abertos) porPessoa.set(`${t.devedor}:${t.pessoaId}`, [...(porPessoa.get(`${t.devedor}:${t.pessoaId}`) ?? []), t]);
  const piso = pisoExecucao(Number(anchor.slice(0, 4)));
  const devedores: DevedorLinha[] = [...porPessoa.values()].map(titulos => { const valor = sum(titulos.map(t => t.valor)), t0 = titulos[0];
    return { pessoaId: t0.pessoaId, devedor: t0.devedor, greId: t0.greId, cityId: t0.cityId, valor, titulos, maisAntigo: titulos.map(t => t.vencimento).sort()[0], acimaDoPiso: valor >= piso }; }).sort((a, b) => b.valor - a.valor);
  const acima = new Set(devedores.filter(row => row.acimaDoPiso).map(row => `${row.devedor}:${row.pessoaId}`));
  const idade = faixasIdadeDivida.map(faixa => ({ faixa, abaixo: 0, acima: 0, pf: 0, pj: 0, pessoas: new Set<string>() }));
  for (const t of abertos) { const item = idade[faixaIdadeDivida(diasEntre(t.vencimento, anchor))], chave = `${t.devedor}:${t.pessoaId}`;
    if (acima.has(chave)) item.acima += t.valor; else item.abaixo += t.valor; if (t.devedor === 'Profissional') item.pf += t.valor; else item.pj += t.valor; item.pessoas.add(chave); }
  const total = sum(abertos.map(t => t.valor)), inicio = sum(mine.filter(t => vencidoEm(t, addDays(start, -1))).map(t => t.valor));
  const novos = sum(mine.filter(t => t.vencimento >= addDays(start, -1) && t.vencimento < anchor && (!t.pagoEm || t.pagoEm > t.vencimento)).map(t => t.valor));
  const recebidos = sum(mine.filter(t => t.pagoEm && t.pagoEm > t.vencimento && t.pagoEm >= start && t.pagoEm <= anchor && diasEntre(t.vencimento, t.pagoEm) <= 1826).map(t => t.valor));
  const prescritos = sum(mine.filter(t => prescritoEm(t, anchor) && !prescritoEm(t, addDays(start, -1))).map(t => t.valor));
  const perto = devedores.filter(row => row.titulos.some(t => diasEntre(t.vencimento, anchor) > 1461));
  // Coortes: boletos de empresas vencidos e não pagos no vencimento, agrupados pelo semestre do vencimento.
  const vencidosPj = mine.filter(t => t.devedor === 'Empresa' && t.vencimento < anchor && (!t.pagoEm || t.pagoEm > t.vencimento));
  const semestre = (date: string) => `${date.slice(0, 4)}-${Number(date.slice(5, 7)) <= 6 ? 1 : 2}`;
  const fimDe = (grupo: string) => grupo.endsWith('1') ? `${grupo.slice(0, 4)}-06-30` : `${grupo.slice(0, 4)}-12-31`;
  const grupos = [...new Set(vencidosPj.map(t => semestre(t.vencimento)))].filter(grupo => fimDe(grupo) <= anchor).sort().slice(-4);
  const coortes = grupos.map(grupo => { const rows = vencidosPj.filter(t => semestre(t.vencimento) === grupo), valor = sum(rows.map(t => t.valor)), fimGrupo = fimDe(grupo);
    const curva = Array.from({ length: 25 }, (_, k) => { if (addDays(fimGrupo, Math.round(k * 30.44)) > anchor) return null;
      return share(sum(rows.filter(t => t.pagoEm && t.pagoEm <= anchor && diasEntre(t.vencimento, t.pagoEm) <= k * 30.44).map(t => t.valor)), valor); });
    return { nome: `${grupo.endsWith('1') ? '1º' : '2º'} semestre de ${grupo.slice(0, 4)}`, valor, curva }; });
  return { devedores, total, totalAntes: sum(mine.filter(t => vencidoEm(t, prevEnd)).map(t => t.valor)), pf: sum(abertos.filter(t => t.devedor === 'Profissional').map(t => t.valor)), pj: sum(abertos.filter(t => t.devedor === 'Empresa').map(t => t.valor)),
    idade, abaixoDoPiso: sum(devedores.filter(row => !row.acimaDoPiso).map(row => row.valor)), piso, pertoDePrescrever: sum(perto.flatMap(row => row.titulos.filter(t => diasEntre(t.vencimento, anchor) > 1461)).map(t => t.valor)), pertoIds: perto.map(row => row.pessoaId),
    cascata: { inicio, novos, recebidos, prescritos, fim: total }, coortes,
    mensal: meses.map(month => { const fim = fimDoMes(month) > anchor ? anchor : fimDoMes(month); return { month, valor: sum(mine.filter(t => vencidoEm(t, fim)).map(t => t.valor)) }; }) };
}
/** Profissionais ativos e em atraso por município, para o mapa da receita. */
export function adimplenciaPorMunicipio(modelo: ModeloProfissionais, anchor: string): Map<string, { ativos: Profissional[]; atraso: Profissional[] }> {
  const out = new Map<string, { ativos: Profissional[]; atraso: Profissional[] }>();
  for (const p of modelo.profissionais) { if (situacaoEm(p, anchor) !== 'Ativo') continue; const item = out.get(p.cityId) ?? { ativos: [], atraso: [] }; item.ativos.push(p); if (!adimplenteEm(p, anchor)) item.atraso.push(p); out.set(p.cityId, item); }
  return out;
}

/* ---------- Atendimento: distância até a unidade e canal ---------- */
export interface Unidade { nome: string; cityId: string; centro: [number, number] }
/** Unidades de atendimento: a sede de cada UGI da tabela oficial e a sede do Crea-SP na capital. A UGI Leste fica na capital. */
export function unidadesAtendimento(dataset: Dataset): Unidade[] {
  const municipios = municipiosSp(dataset), porNome = new Map(municipios.map(row => [row.nome, row]));
  const nomes = [...new Set(municipios.map(row => row.ugi).filter((ugi): ugi is string => Boolean(ugi)).map(ugi => ugi.replace(/^UGI /, '')))].map(nome => nome === 'Leste' ? 'São Paulo' : nome);
  return [...new Set(['São Paulo', ...nomes])].map(nome => porNome.get(nome)).filter((row): row is Municipio => Boolean(row)).map(row => ({ nome: row.nome, cityId: row.id, centro: row.centro }));
}
const raio = 6371;
export const km = (a: [number, number], b: [number, number]) => { const rad = Math.PI / 180, dLat = (b[1] - a[1]) * rad, dLon = (b[0] - a[0]) * rad, h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2; return 2 * raio * Math.asin(Math.sqrt(h)); };
const cacheDistancia = new WeakMap<Dataset, Map<string, { km: number; unidade: string }>>();
/** Distância em linha reta (km) do centro de cada município até a unidade mais próxima. A estrada costuma ser 20% a 40% mais longa. */
export function distanciaUnidade(dataset: Dataset): Map<string, { km: number; unidade: string }> {
  const saved = cacheDistancia.get(dataset); if (saved) return saved;
  const unidades = unidadesAtendimento(dataset), out = new Map<string, { km: number; unidade: string }>();
  for (const row of municipiosSp(dataset)) { let melhor = { km: Infinity, unidade: '' }; for (const u of unidades) { const d = row.id === u.cityId ? 0 : km(row.centro, u.centro); if (d < melhor.km) melhor = { km: d, unidade: u.nome }; } out.set(row.id, { km: Math.round(melhor.km), unidade: melhor.unidade }); }
  cacheDistancia.set(dataset, out); return out;
}
export const faixasDistancia = ['na cidade da unidade', 'até 25 km', '25 a 50 km', '50 a 75 km', 'mais de 75 km'];
export const faixaDistancia = (quilometros: number) => quilometros === 0 ? 0 : quilometros <= 25 ? 1 : quilometros <= 50 ? 2 : quilometros <= 75 ? 3 : 4;
export type Canal = 'Presencial' | 'Telefone' | 'Portal e chat' | 'E-mail';
export const canaisAtendimento: Canal[] = ['Presencial', 'Telefone', 'Portal e chat', 'E-mail'];
/** Canal de cada solicitação (demonstrativo): quanto mais longe a unidade, menor a chance de o atendimento ser presencial. */
export function canalDe(row: InstitutionalServiceRequest, distancia: number): Canal {
  const presencial = Math.max(0.08, 0.42 - distancia * 0.0035);
  return weighted<Canal>(`canal:${row.id}`, canaisAtendimento, [presencial, 0.2, 0.68 - presencial, 0.12]);
}


/* ---------- Receita e despesa do Conselho mês a mês ---------- */
/** Meses de `n` meses terminando no mês da data (inclusive). */
export const mesesAteData = (anchor: string, n: number) => Array.from({ length: n }, (_, index) => { const d = new Date(`${anchor.slice(0, 7)}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() - (n - 1 - index)); return d.toISOString().slice(0, 7); });
const mesAntes = (month: string) => `${Number(month.slice(0, 4)) - 1}${month.slice(4)}`;
export interface ReceitaMensal { month: string; porFonte: Record<FonteReceita, number>; total: number; prevista: number; antes: number | null }
/** Receita realizada de cada mês por origem, com o total do mesmo mês um ano antes. A receita do Conselho é do estado inteiro: não muda com a regional. */
export function receitaMensal(conselho: Conselho, meses: string[]): ReceitaMensal[] {
  const porMes = new Map<string, { porFonte: Record<FonteReceita, number>; prevista: number }>();
  for (const row of conselho.receitas) { const item = porMes.get(row.month) ?? { porFonte: Object.fromEntries(fontesReceita.map(f => [f, 0])) as Record<FonteReceita, number>, prevista: 0 }; item.porFonte[row.fonte] += row.realizada; item.prevista += row.prevista; porMes.set(row.month, item); }
  const total = (month: string) => { const item = porMes.get(month); return item ? sum(Object.values(item.porFonte)) : null; };
  return meses.map(month => { const item = porMes.get(month); return { month, porFonte: item?.porFonte ?? Object.fromEntries(fontesReceita.map(f => [f, 0])) as Record<FonteReceita, number>, total: total(month) ?? 0, prevista: item?.prevista ?? 0, antes: total(mesAntes(month)) }; });
}
/** Previsto e realizado acumulados de janeiro até cada mês, no ano da data e no ano anterior (para a curva do ano). */
export interface Acumulado { mes: number; previsto: number | null; realizado: number | null; previstoAntes: number; realizadoAntes: number }
function acumular(linhas: { month: string; previsto: number; realizado: number }[], anchor: string): Acumulado[] {
  const ano = anchor.slice(0, 4), anterior = String(Number(ano) - 1), ultimo = Number(anchor.slice(5, 7));
  let p = 0, r = 0, pa = 0, ra = 0;
  return Array.from({ length: 12 }, (_, index) => { const m = String(index + 1).padStart(2, '0');
    for (const row of linhas) { if (row.month === `${ano}-${m}`) { p += row.previsto; r += row.realizado; } if (row.month === `${anterior}-${m}`) { pa += row.previsto; ra += row.realizado; } }
    return { mes: index + 1, previsto: index + 1 <= ultimo ? p : null, realizado: index + 1 <= ultimo ? r : null, previstoAntes: pa, realizadoAntes: ra }; });
}
export const receitaAcumulada = (conselho: Conselho, anchor: string) => acumular(conselho.receitas.filter(row => `${row.month}-01` <= anchor).map(row => ({ month: row.month, previsto: row.prevista, realizado: row.realizada })), anchor);
/** Despesa orçada e realizada acumulada no ano; com regional, só a parte da despesa lançada nela. */
export const despesaAcumulada = (conselho: Conselho, anchor: string, greId: string | null) => acumular(conselho.despesas.filter(row => `${row.month}-01` <= anchor && (!greId || row.greId === greId)).map(row => ({ month: row.month, previsto: row.orcado, realizado: row.realizado })), anchor);
/** Despesa realizada de cada mês, com regional quando escolhida. */
export const despesaMensal = (conselho: Conselho, meses: string[], greId: string | null) => { const porMes = new Map<string, number>(); for (const row of conselho.despesas) if (!greId || row.greId === greId) porMes.set(row.month, (porMes.get(row.month) ?? 0) + row.realizado); return meses.map(month => porMes.get(month) ?? 0); };
/** Diárias pagas em cada mês (valor), com regional quando escolhida. */
export const diariasMensais = (conselho: Conselho, meses: string[], greId: string | null) => { const porMes = new Map<string, number>(); for (const row of conselho.diarias) if (!greId || row.greId === greId) porMes.set(row.month, (porMes.get(row.month) ?? 0) + row.valor); return meses.map(month => porMes.get(month) ?? 0); };
/** Contratos vigentes que terminam em cada um dos próximos 12 meses. */
export function vencimentoContratos(conselho: Conselho, anchor: string) {
  const vigentes = conselho.contratos.filter(row => row.inicio <= anchor && row.fim >= anchor), proximos = mesesAteData(addDays(anchor, 335), 12);
  const fornecedor = new Map(conselho.fornecedores.map(row => [row.id, row.nome]));
  return proximos.map(month => { const rows = vigentes.filter(row => row.fim.startsWith(month)); return { month, n: rows.length, valor: sum(rows.map(row => row.valor)), contratos: rows.map(row => ({ ...row, fornecedor: fornecedor.get(row.fornecedorId) ?? row.fornecedorId })) }; });
}

/* ---------- Dívida de empresas pela situação do CNPJ na Receita Federal ---------- */
export type SituacaoCnpj = 'Ativa' | 'Suspensa' | 'Inapta' | 'Baixada';
export const situacoesCnpj: SituacaoCnpj[] = ['Ativa', 'Suspensa', 'Inapta', 'Baixada'];
/** Cruza as empresas devedoras com a situação do CNPJ da matriz na Receita: dívida de CNPJ baixado ou inapto tem pouca chance de ser recebida. */
export function dividaPorSituacao(dataset: Dataset, devedores: DevedorLinha[]) {
  const main = mainEstablishments(dataset);
  return situacoesCnpj.map(situacao => { const rows = devedores.filter(row => row.devedor === 'Empresa' && (main.get(row.pessoaId)?.rfbStatus ?? 'Ativa') === situacao);
    return { situacao, valor: sum(rows.map(row => row.valor)), empresas: rows.map(row => row.pessoaId), acimaDoPiso: rows.filter(row => row.acimaDoPiso).length }; });
}

/* ---------- Atendimento: canal pela distância e medidas por município ---------- */
/**
 * Município de quem pediu o atendimento (demonstrativo): o cenário guarda só a unidade que atendeu, então o solicitante é sorteado
 * entre os municípios da mesma regional, pelo tamanho da população. Em produção, vem do endereço do profissional ou da empresa.
 */
export function municipioDoSolicitante(dataset: Dataset) {
  const porGre = new Map<string, Municipio[]>(); for (const row of municipiosSp(dataset)) porGre.set(row.greId, [...(porGre.get(row.greId) ?? []), row]);
  const sorteios = new Map([...porGre].map(([greId, lista]) => [greId, sorteioMunicipio(lista)]));
  return (row: InstitutionalServiceRequest) => sorteios.get(row.greId)?.(`sol:${row.id}`).id ?? row.cityId;
}
export function canalPorDistancia(pedidos: InstitutionalServiceRequest[], distancia: Map<string, { km: number }>, origem: (row: InstitutionalServiceRequest) => string) {
  const linhas = faixasDistancia.map(faixa => ({ faixa, total: 0, porCanal: Object.fromEntries(canaisAtendimento.map(c => [c, 0])) as Record<Canal, number>, pedidos: [] as InstitutionalServiceRequest[] }));
  for (const row of pedidos) { const d = distancia.get(origem(row))?.km ?? 0, item = linhas[faixaDistancia(d)]; item.total += 1; item.porCanal[canalDe(row, d)] += 1; item.pedidos.push(row); }
  return linhas;
}
