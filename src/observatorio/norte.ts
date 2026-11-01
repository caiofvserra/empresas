import type { Scope } from '../domain/engine';
import type { Dataset, Establishment } from '../domain/types';
import type { EnterpriseModel } from '../enterprise-v10/types';
import { mainEstablishments, median } from '../gestao-v14/metrics';
import { janela } from '../painel/analise';
import type { Acao, Alvo, Fiscalizacao, Origem, Tipo } from '../painel/fiscalizacao';

/**
 * V19 · os quatro indicadores-norte do plano do programa Inteligência Estratégica Crea-SP (antes Prumo e Observatório Crea-SP, revisão 2), calculados sobre o cenário demonstrativo.
 * Cada função segue a ficha do plano: fórmula, data de referência e leitura. Nenhuma conclui infração ou efeito causal.
 */
const DAY = 86400000;
const toDay = (date: string) => Math.floor(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / DAY);
const days = (from: string, to: string) => toDay(to) - toDay(from);
const inside = (date: string | undefined, start: string, end: string) => Boolean(date && date >= start && date <= end);
const share = (part: number, whole: number) => whole > 0 ? part / whole * 100 : null;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/* ---------- 1 · Cobertura cadastral estimada ---------- */
/** Classe da lista CNAE do Crea-SP (rev. mar/2025): “Sim” = registro obrigatório; “Passível” = passível de obrigação, depende de análise. */
export type ClasseCnae = 'Sim' | 'Passível';
export const classesCnae: ClasseCnae[] = ['Sim', 'Passível'];
/** Correspondência do CNPJ completo com o cadastro do Crea-SP no corte. “Sem correspondência” não quer dizer irregular. */
export type Correspondencia = 'Registro ou visto vigente' | 'Só histórico' | 'Sem correspondência';
export const correspondencias: Correspondencia[] = ['Registro ou visto vigente', 'Só histórico', 'Sem correspondência'];

/**
 * Classe pela atividade principal, que é a declaração mais próxima da atividade básica (critério de registro da Lei 6.839/80).
 * O CNAE secundário só decide quando o principal não está na lista; aí, “Sim” se algum secundário for “Sim”.
 * O universo (denominador) continua sendo principal ou secundário da lista, como na ficha.
 */
export function classeDoEstabelecimento(dataset: Dataset, place: Establishment): ClasseCnae | null {
  const classes = classesCache.get(dataset) ?? new Map(dataset.cnaes.map(row => [row.code, row.classification]));
  classesCache.set(dataset, classes);
  const principal = classes.get(place.cnaeMain);
  if (principal === 'Relacionado') return 'Sim';
  if (principal === 'Depende de análise') return 'Passível';
  const secundarias = place.cnaeSecondary.map(code => classes.get(code));
  return secundarias.includes('Relacionado') ? 'Sim' : secundarias.includes('Depende de análise') ? 'Passível' : null;
}
const classesCache = new WeakMap<Dataset, Map<string, string>>();

export type Particao = Record<Correspondencia, string[]>;
const vazia = (): Particao => ({ 'Registro ou visto vigente': [], 'Só histórico': [], 'Sem correspondência': [] });
export interface CoberturaGre { id: string; name: string; total: number; sim: Particao; passivel: Particao; taxaSim: number | null }
export interface Cobertura {
  /** CNPJs completos elegíveis (Receita ativa, CNAE da lista), por classe e correspondência. */
  porClasse: Record<ClasseCnae, Particao>;
  total: number; vigentes: number; taxa: number | null; taxaSim: number | null; taxaPassivel: number | null;
  porGre: CoberturaGre[];
  /** Competência do arquivo da Receita e corte do cadastro: no cenário, o mesmo dia. */
  competenciaReceita: string; corteCadastro: string;
}
export function cobertura(scope: Scope, model: EnterpriseModel): Cobertura {
  const places = new Map(scope.dataset.establishments.map(row => [row.id, row]));
  const vigente = new Set(model.metadata.activeEligibleEstablishmentIds), historico = new Set(model.metadata.inactiveMatchedEstablishmentIds);
  const porClasse: Record<ClasseCnae, Particao> = { Sim: vazia(), Passível: vazia() };
  const gres = new Map(scope.dataset.gres.map(row => [row.id, { id: row.id, name: row.name, total: 0, sim: vazia(), passivel: vazia(), taxaSim: null as number | null }]));
  for (const id of model.metadata.eligibleEstablishmentIds) {
    const place = places.get(id); if (!place) continue;
    const classe = classeDoEstabelecimento(scope.dataset, place) ?? 'Passível';
    const situacao: Correspondencia = vigente.has(id) ? 'Registro ou visto vigente' : historico.has(id) ? 'Só histórico' : 'Sem correspondência';
    porClasse[classe][situacao].push(id);
    const gre = gres.get(place.greId);
    if (gre) { gre.total++; (classe === 'Sim' ? gre.sim : gre.passivel)[situacao].push(id); }
  }
  const total = model.metadata.eligibleEstablishmentIds.length, vigentes = vigente.size;
  const taxaDe = (part: Particao) => share(part['Registro ou visto vigente'].length, sum(correspondencias.map(item => part[item].length)));
  return { porClasse, total, vigentes, taxa: share(vigentes, total), taxaSim: taxaDe(porClasse.Sim), taxaPassivel: taxaDe(porClasse.Passível),
    porGre: [...gres.values()].filter(row => row.total).map(row => ({ ...row, taxaSim: taxaDe(row.sim) })),
    competenciaReceita: scope.anchor, corteCadastro: scope.anchor };
}

/** UC01 · três contagens que nunca se somam como sinônimos: empresa-raiz, estabelecimento (CNPJ completo) e registro. */
export interface Contagens { raizes: number; estabelecimentos: number; registros: number; vistos: number; raizesHistorico: number }
export function contagens(scope: Scope, model: EnterpriseModel): Contagens {
  const anchor = scope.anchor;
  const vigentes = scope.registrations.filter(row => row.startedAt <= anchor && (!row.ceasedAt || row.ceasedAt > anchor) && row.status === 'Ativo');
  const comHistorico = new Set(scope.registrations.filter(row => row.startedAt <= anchor).map(row => row.companyId));
  const ativas = new Set(model.metadata.activeCompanyIds);
  return { raizes: ativas.size, estabelecimentos: new Set(vigentes.map(row => row.establishmentId)).size, registros: vigentes.length,
    vistos: vigentes.filter(row => row.type === 'Visto').length, raizesHistorico: [...comHistorico].filter(id => !ativas.has(id)).length };
}

/* ---------- 2 · Conversão da fiscalização (coorte trimestral, 180 dias) ---------- */
export const PRAZO_CONVERSAO = 180;
export interface Coorte { trimestre: string; inicio: string; fim: string; acoes: Acao[]; convertidas: Acao[]; taxa: number | null; completa: boolean }
const trimestreDe = (date: string) => `${date.slice(0, 4)}-T${Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1}`;
const limitesTrimestre = (id: string) => { const year = Number(id.slice(0, 4)), q = Number(id.slice(-1)), m = (q - 1) * 3;
  return { inicio: new Date(Date.UTC(year, m, 1)).toISOString().slice(0, 10), fim: new Date(Date.UTC(year, m + 3, 0)).toISOString().slice(0, 10) }; };
/** Ações iniciadas no trimestre com regularização (registro, RT, ART ou baixa) em até 180 dias ÷ ações iniciadas no trimestre. Coorte pela data da ação. */
export function conversao(f: Fiscalizacao, greId: string | null, quantos = 8): { coortes: Coorte[]; atual: Coorte | null; anterior: Coorte | null } {
  const acoes = f.acoes.filter(row => !greId || row.greId === greId), anchorDay = toDay(f.anchor);
  const ids = [...new Set(acoes.map(row => trimestreDe(row.date)))].sort().slice(-quantos);
  const coortes = ids.map(id => {
    const { inicio, fim } = limitesTrimestre(id), rows = acoes.filter(row => trimestreDe(row.date) === id);
    // Uma regularização só conta se aconteceu até o corte; a coorte só é completa quando a última ação já teve 180 dias.
    const convertidas = rows.filter(row => row.regularizedAt && row.regularizedAt <= f.anchor && days(row.date, row.regularizedAt) <= PRAZO_CONVERSAO);
    return { trimestre: id, inicio, fim, acoes: rows, convertidas, taxa: share(convertidas.length, rows.length), completa: toDay(fim) + PRAZO_CONVERSAO <= anchorDay };
  });
  const completas = coortes.filter(row => row.completa && row.acoes.length);
  return { coortes, atual: completas.at(-1) ?? null, anterior: completas.at(-5) ?? completas.at(-2) ?? null };
}

/* ---------- 3 · Receita atribuível ---------- */
/** Origens que nascem de um indício por cruzamento de bases (o “indício do programa”). Denúncia e rotina de campo ficam fora. */
export const origensIndicio: Origem[] = ['Cruzamento Receita (CNAE)', 'Contrato público (PNCP)', 'Cadastro CREA'];
export const PRAZO_ATRIBUICAO = 365;
export interface Pagamento { companyId: string; acaoId: string; origem: Origem; data: string; valor: number; tipo: 'Anuidade' | 'Multa' }
export interface ReceitaAtribuivel { pagamentos: Pagamento[]; total: number; totalAntes: number; anuidades: number; multas: number; porOrigem: { origem: Origem; valor: number; empresas: number }[]; casos: number; mensal: { month: string; valor: number }[] }
/**
 * Anuidades e multas efetivamente recebidas (data do pagamento) de empresas com caso aberto a partir de indício, em até 12 meses da abertura.
 * Cada pagamento é atribuído uma única vez, ao caso mais antigo que o cobre. Taxas de ART e estornos não existem no cenário.
 */
export function receitaAtribuivel(dataset: Dataset, f: Fiscalizacao, greId: string | null, period: number): ReceitaAtribuivel {
  const w = janela(f.anchor, period);
  const casos = f.acoes.filter(row => origensIndicio.includes(row.origem) && (!greId || row.greId === greId)).sort((a, b) => a.date.localeCompare(b.date));
  const porEmpresa = new Map<string, Acao[]>();
  for (const row of casos) porEmpresa.set(row.companyId, [...(porEmpresa.get(row.companyId) ?? []), row]);
  const caso = (companyId: string, date: string) => (porEmpresa.get(companyId) ?? []).find(row => row.date <= date && days(row.date, date) <= PRAZO_ATRIBUICAO);
  const todos: Pagamento[] = [];
  for (const row of dataset.invoices) {
    if (!row.paymentDate || row.paidAmount <= 0 || row.paymentDate > f.anchor) continue;
    const acao = caso(row.companyId, row.paymentDate); if (!acao) continue;
    todos.push({ companyId: row.companyId, acaoId: acao.id, origem: acao.origem, data: row.paymentDate, valor: row.paidAmount, tipo: 'Anuidade' });
  }
  for (const acao of casos) if (acao.auto?.paidAt && acao.auto.paidAt <= f.anchor && days(acao.date, acao.auto.paidAt) <= PRAZO_ATRIBUICAO)
    todos.push({ companyId: acao.companyId, acaoId: acao.id, origem: acao.origem, data: acao.auto.paidAt, valor: acao.auto.valor, tipo: 'Multa' });
  const pagamentos = todos.filter(row => inside(row.data, w.start, w.end));
  const antes = todos.filter(row => inside(row.data, w.prevStart, w.prevEnd));
  return { pagamentos, total: sum(pagamentos.map(row => row.valor)), totalAntes: sum(antes.map(row => row.valor)),
    anuidades: sum(pagamentos.filter(row => row.tipo === 'Anuidade').map(row => row.valor)), multas: sum(pagamentos.filter(row => row.tipo === 'Multa').map(row => row.valor)),
    porOrigem: origensIndicio.map(origem => { const rows = pagamentos.filter(row => row.origem === origem); return { origem, valor: sum(rows.map(row => row.valor)), empresas: new Set(rows.map(row => row.companyId)).size }; }),
    casos: new Set(pagamentos.map(row => row.acaoId)).size,
    mensal: w.months.filter(month => `${month}-01` >= `${w.start.slice(0, 7)}-01`).map(month => ({ month, valor: sum(pagamentos.filter(row => row.data.startsWith(month)).map(row => row.valor)) })) };
}

/* ---------- 4 · Tempo até agir ---------- */
export interface Espera { alvo: Alvo; dias: number; agiu: boolean }
export interface TempoGrupo { id: string; nome: string; n: number; agidos: number; abertos: number; mediana: number | null }
export interface TempoAteAgir { esperas: Espera[]; mediana: number | null; medianaAgidos: number | null; abertos: number; porGre: TempoGrupo[]; porTipo: TempoGrupo[] }
/** Mediana de Kaplan-Meier: indícios ainda sem ação entram como abertos (censurados no corte), nunca como zero. */
export function medianaKm(esperas: { dias: number; agiu: boolean }[]): number | null {
  const ordered = [...esperas].sort((a, b) => a.dias - b.dias);
  let sobrevida = 1, index = 0;
  while (index < ordered.length) {
    const tempo = ordered[index].dias, emRisco = ordered.length - index;
    let eventos = 0, count = 0;
    while (index + count < ordered.length && ordered[index + count].dias === tempo) { if (ordered[index + count].agiu) eventos++; count++; }
    sobrevida *= 1 - eventos / emRisco; index += count;
    if (sobrevida <= 0.5) return tempo;
  }
  return null;
}
/**
 * Dias entre a entrada do indício na base e a primeira ação fiscal registrada sobre ele, para indícios que entraram no período.
 * Indício regularizado sem ação sai do risco na data da regularização.
 */
export function tempoAteAgir(dataset: Dataset, f: Fiscalizacao, greId: string | null, period: number, tipoLabel: Record<Tipo, string>): TempoAteAgir {
  const w = janela(f.anchor, period), acoes = new Map(f.acoes.map(row => [row.id, row]));
  const esperas: Espera[] = f.alvos.filter(row => (!greId || row.greId === greId) && inside(row.since, w.start, w.end)).map(alvo => {
    const acao = alvo.acaoId ? acoes.get(alvo.acaoId) : undefined;
    if (acao && acao.date <= f.anchor) return { alvo, dias: Math.max(0, days(alvo.since, acao.date)), agiu: true };
    const fim = alvo.regularizedAt && alvo.regularizedAt <= f.anchor ? alvo.regularizedAt : f.anchor;
    return { alvo, dias: Math.max(0, days(alvo.since, fim)), agiu: false };
  });
  const grupo = (id: string, nome: string, rows: Espera[]): TempoGrupo => ({ id, nome, n: rows.length, agidos: rows.filter(row => row.agiu).length, abertos: rows.filter(row => !row.agiu).length, mediana: medianaKm(rows) });
  const tipos = [...new Set(esperas.map(row => row.alvo.tipo))];
  return { esperas, mediana: medianaKm(esperas), medianaAgidos: median(esperas.filter(row => row.agiu).map(row => row.dias)), abertos: esperas.filter(row => !row.agiu).length,
    porGre: dataset.gres.map(gre => grupo(gre.id, gre.name, esperas.filter(row => row.alvo.greId === gre.id))).filter(row => row.n),
    porTipo: tipos.map(tipo => grupo(tipo, tipoLabel[tipo], esperas.filter(row => row.alvo.tipo === tipo))) };
}

/* ---------- Fichas (formato dos 34 casos de uso) ---------- */
export type NorteId = 'cobertura' | 'conversao' | 'receita' | 'tempo';
export interface Ficha { id: NorteId; nome: string; formula: string; unidade: string; grao: string; data: string; leitura: string; desconhecido: string; prototipo: string; caso: string }
export const fichas: Record<NorteId, Ficha> = {
  cobertura: { id: 'cobertura', nome: 'Quanto do mercado está registrado', caso: 'UC02',
    formula: 'Estabelecimentos ativos em SP com atividade principal ou secundária da lista do Crea-SP e com registro ou visto, divididos por todos esses estabelecimentos.',
    unidade: 'Porcentagem de estabelecimentos', grao: 'Cada estabelecimento conta uma vez, pelo CNPJ completo, e não pela raiz da empresa.', data: 'O arquivo da Receita e o cadastro do Crea-SP são do mesmo mês.',
    leitura: 'Dos estabelecimentos com atividade de engenharia na Receita, quantos têm registro ou visto no Crea-SP.',
    desconhecido: 'CNPJ inválido ou repetido fica fora da conta e aparece na qualidade do cadastro.',
    prototipo: 'Calculado sobre o cenário demonstrativo. A divisão entre “Sim” e “Passível” segue a lista de atividades de março de 2025.' },
  conversao: { id: 'conversao', nome: 'Quanto a fiscalização resolve', caso: 'Indicador principal 2 do plano',
    formula: 'Ações fiscais iniciadas no trimestre que terminaram em regularização (registro, troca de RT, ART ou baixa) em até 180 dias, divididas pelas ações iniciadas no trimestre.',
    unidade: 'Porcentagem de ações', grao: 'Cada ação fiscal conta uma vez.', data: 'As ações são agrupadas pelo trimestre em que começaram. Um trimestre só entra na comparação depois de completar 180 dias.',
    leitura: 'Das ações iniciadas em cada trimestre, quantas terminaram em regularização em até 180 dias.',
    desconhecido: 'O trimestre que ainda não completou 180 dias aparece no gráfico, mas fica fora da comparação.',
    prototipo: 'As ações e as regularizações vêm do cenário demonstrativo de fiscalização.' },
  receita: { id: 'receita', nome: 'Quanto entrou depois de um caso aberto', caso: 'Indicador principal 3 do plano',
    formula: 'Anuidades, ARTs e multas recebidas de empresas com caso aberto a partir de um indício do programa, em até 12 meses depois da abertura do caso.',
    unidade: 'Reais recebidos', grao: 'Cada pagamento conta uma vez.', data: 'Vale a data do pagamento, e não a do lançamento.',
    leitura: 'Anuidades e multas pagas nos 12 meses seguintes a um caso aberto por indício.',
    desconhecido: 'Pagamento sem data ou sem caso ligado não entra. Cada pagamento é contado uma só vez, no caso mais antigo.',
    prototipo: 'O cenário não tem taxa de ART nem estorno, por isso só entram anuidades e multas. Um caso por indício é uma ação que nasceu do cruzamento com a Receita, o PNCP ou o cadastro.' },
  tempo: { id: 'tempo', nome: 'Quanto tempo leva para agir', caso: 'Indicador principal 4 do plano',
    formula: 'Tempo típico (mediana), em dias, entre o momento em que o indício entra na base e a primeira ação fiscal sobre ele.',
    unidade: 'Dias, no caso típico (mediana)', grao: 'Cada indício conta uma vez.', data: 'Vale a data em que o indício entrou na base. O resultado pode ser separado por regional e por tipo de indício.',
    leitura: 'Quantos dias passam, no caso típico, entre o indício aparecer e a fiscalização agir.',
    desconhecido: 'O indício que se resolve sem ação sai da conta na data em que se resolveu.',
    prototipo: 'Os indícios e as ações vêm do cenário demonstrativo de fiscalização.' },
};

export const regionalDaEmpresa = (dataset: Dataset) => { const main = mainEstablishments(dataset); return (companyId: string) => main.get(companyId)?.greId; };
