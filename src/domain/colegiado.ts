import type { Dataset } from './types';
import { addDays, between, chance, share, sum, weighted } from './hash';
import { INICIO_IA, buildProcessos, camarasConselho, mediana, modalidadeDaCamara, plenario, sessoesNoMes } from './gestao';
import type { CamaraConselho, LinhaPlenario, Processo } from './gestao';
import { buildEntidades } from './entidades';
import type { Canal, Entidades } from './entidades';
import { buildConselho } from './conselho';
import { membrosDoPlenario, membrosEm, servidores } from './pessoas-conselho';
import type { Membro, Servidor } from './pessoas-conselho';
import { situacaoEm } from './profissionais';
import type { ModeloProfissionais } from './profissionais';

/**
 * Painel de Gestão do Conselho, só do colegiado (07/11/2026): conselheiros, câmaras, Plenário e processos.
 *
 * O caminho do processo segue o guia da SUPCOL (processo de infração no Crea-SP): o GovAdm guarda a abertura, o recebimento na
 * câmara, os prazos e o trânsito em julgado; o Votenet guarda a tramitação na câmara (distribuído ao relator, em revisão, assinado,
 * pautado, pedido de vista, impedimento, diligência e votado). Quem está com o processo em cada status é o relator, outro
 * conselheiro (no pedido de vista) ou um funcionário da assessoria da câmara.
 *
 * Camada DEMONSTRATIVA: os nomes são fictícios. Em produção: o Relatório de Processos do GovAdm (responsável, cargo e fase), o
 * Votenet (status, relato, pauta e votação), os PDFs das decisões, as atas do Plenário e a composição publicada pelo Conselho.
 */

export type Colegiado = CamaraConselho | 'Plenário';
export const colegiados: Colegiado[] = ['Plenário', ...camarasConselho];
export const nomeColegiado = (colegiado: Colegiado) => colegiado === 'Plenário' ? 'Plenário' : `Câmara ${colegiado}`;

export type StatusVotenet = 'Aguardando distribuição' | 'Distribuído ao relator' | 'Em revisão' | 'Assinado' | 'Pautado' | 'Pedido de vista' | 'Impedimento' | 'Diligência' | 'Votado';
/** Os status de quem ainda não foi votado, na ordem do caminho. "Aguardando distribuição" é o processo recebido e cadastrado, sem relator. */
export const statusPendentes: StatusVotenet[] = ['Aguardando distribuição', 'Distribuído ao relator', 'Em revisão', 'Assinado', 'Pautado', 'Pedido de vista', 'Diligência', 'Impedimento'];
export interface Evento { status: StatusVotenet; desde: string; com: string }
/** Quem pode estar com um processo: um conselheiro (relator ou quem pediu vista) ou um funcionário da assessoria da câmara. */
export interface Pessoa { id: string; nome: string; papel: 'Conselheiro' | 'Funcionário'; detalhe: string }

/** A passagem de um processo por um colegiado: a câmara (1ª instância) ou, no recurso, o Plenário (2ª instância). */
export interface Tramitacao {
  id: string; processo: Processo; colegiado: Colegiado; instancia: 'Câmara' | 'Plenário';
  entrada: string; votadoEm: string; relator: string; eventos: Evento[];
  /** Distribuição que valeu (depois do impedimento, a segunda) e relato assinado: o tempo de relato vai de uma à outra. */
  distribuidoEm: string; assinadoEm: string; ia: boolean;
}

export type Desfecho = 'Multa' | 'Multa reduzida' | 'Multa em dobro' | 'Suspensão do exercício' | 'Arquivamento' | 'Arquivamento pela prescrição';
export const desfechos: Desfecho[] = ['Multa', 'Multa reduzida', 'Multa em dobro', 'Suspensão do exercício', 'Arquivamento', 'Arquivamento pela prescrição'];
export type Alinea = 'a' | 'b' | 'c' | 'd' | 'e';
export const alineas: Alinea[] = ['a', 'b', 'c', 'd', 'e'];
/** As infrações do art. 73 da Lei 5.194/66 (redação da Lei 6.619/78), em palavras. */
export const infracaoDaAlinea: Record<Alinea, string> = {
  a: 'Outras infrações à lei (alínea a)', b: 'Falta de registro do profissional (alínea b)', c: 'Falta de registro da empresa (alínea c)',
  d: 'Exercício ilegal por pessoa física (alínea d)', e: 'Exercício ilegal por empresa (alínea e)',
};
/** O que aconteceu com um auto de infração depois da câmara: a penalidade, o recurso, o trânsito em julgado e a cobrança. */
export interface Desdobramento {
  processo: Processo; desfecho: Desfecho; alinea: Alinea; reincidente: boolean;
  /** Multa da decisão da câmara (zero no arquivamento) e a que vale depois do Plenário (zero se ele reformou a decisão). */
  multaCamara: number; multaFinal: number;
  confeaEm?: string; confeaDecisaoEm?: string; transitoEm?: string; pagoEm?: string;
}

export interface Sessao { id: string; colegiado: Colegiado; data: string; membros: string[]; presentes: string[] }
/** Deliberação do Plenário que aprova dinheiro para uma organização (convênio, contrato ou patrocínio), lida das atas. */
export interface Deliberacao { id: string; data: string; canal: Canal; orgId: string; organizacao: string; valor: number; objeto: string; proponente: string; conflito: boolean }

export interface BaseColegiado {
  entidades: Entidades; membros: Membro[]; pessoas: Map<string, Pessoa>; assessores: Map<Colegiado, Servidor[]>;
  tramitacoes: Tramitacao[]; desdobramentos: Desdobramento[]; sessoes: Sessao[]; deliberacoes: Deliberacao[];
}

const DIA = 86400000;
export const dias = (de: string, ate: string) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / DIA);
const mesesAte = (inicio: string, fim: string) => { const out: string[] = [], d = new Date(`${inicio.slice(0, 7)}-01T00:00:00Z`); while (d.toISOString().slice(0, 7) <= fim.slice(0, 7)) { out.push(d.toISOString().slice(0, 7)); d.setUTCMonth(d.getUTCMonth() + 1); } return out; };

const cache = new WeakMap<Dataset, BaseColegiado>();
/** O colegiado do cenário inteiro, de 2020 à data de corte; a leitura numa data descarta o que veio depois dela. */
export function buildColegiado(dataset: Dataset): BaseColegiado {
  const saved = cache.get(dataset); if (saved) return saved;
  const entidades = buildEntidades(dataset), membros = membrosDoPlenario(entidades), corte = dataset.snapshotDate;
  const orgDe = new Map(entidades.organizacoes.map(org => [org.id, org]));
  const pessoas = new Map<string, Pessoa>();
  for (const m of membros) pessoas.set(m.id, { id: m.id, nome: m.nome, papel: 'Conselheiro', detalhe: `${nomeColegiado(m.camara)}, indicado por ${orgDe.get(m.orgId)?.nome ?? m.sigla}` });
  // A assessoria de cada colegiado: analistas e assistentes do quadro institucional, três no Plenário e na Civil e dois nas demais.
  const quadro = servidores(buildConselho(dataset), dataset).filter(s => s.funcao === 'Institucional' && s.vinculo === 'Efetivo'), assessores = new Map<Colegiado, Servidor[]>();
  let proximo = 0;
  for (const colegiado of colegiados) {
    const n = colegiado === 'Plenário' || colegiado === 'Civil' ? 3 : 2, equipe = Array.from({ length: n }, () => quadro[proximo++ % quadro.length]);
    assessores.set(colegiado, equipe);
    for (const s of equipe) pessoas.set(s.id, { id: s.id, nome: s.nome, papel: 'Funcionário', detalhe: `${s.cargo}, assessoria do ${nomeColegiado(colegiado)}` });
  }
  const assessor = (colegiado: Colegiado, key: string) => { const equipe = assessores.get(colegiado)!; return equipe[Math.floor(chance(key) * equipe.length)].id; };
  // Quem está no colegiado em cada data, com cache por data (o sorteio do relator pesa o ritmo de cada um).
  const naData = new Map<string, Membro[]>();
  const membrosNa = (data: string) => { let rows = naData.get(data); if (!rows) { rows = membrosEm(entidades, data); naData.set(data, rows); } return rows; };
  const sorteia = (rows: Membro[], key: string, exceto?: string) => {
    const opcoes = rows.filter(m => m.id !== exceto); if (!opcoes.length) return exceto ?? rows[0]?.id ?? '';
    const total = sum(opcoes.map(m => m.ritmo)); let alvo = chance(key) * total;
    for (const m of opcoes) { alvo -= m.ritmo; if (alvo <= 0) return m.id; }
    return opcoes.at(-1)!.id;
  };
  const fimDoMandato = (id: string, data: string) => membros.find(m => m.id === id && m.inicio <= data && m.fim >= data)?.fim;
  const doColegiado = (colegiado: Colegiado, data: string) => { const rows = membrosNa(data); return colegiado === 'Plenário' ? rows : rows.filter(m => m.camara === colegiado); };

  const tramitacoes: Tramitacao[] = [];
  for (const p of buildProcessos(dataset)) {
    const key = `tram:${p.id}`, ev: Evento[] = [], ass = assessor(p.camara, `${key}:ass`);
    let relator = sorteia(doColegiado(p.camara, p.relatorEm), `${key}:rel`), distribuidoEm = p.relatorEm;
    ev.push({ status: 'Aguardando distribuição', desde: p.entrada, com: ass }, { status: 'Distribuído ao relator', desde: p.relatorEm, com: relator });
    const impedidoEm = addDays(p.relatorEm, between(`${key}:imp`, 4, 15));
    if (p.impedimento && dias(impedidoEm, p.revisaoEm) > 10) {
      distribuidoEm = addDays(impedidoEm, between(`${key}:imp2`, 2, 7));
      ev.push({ status: 'Impedimento', desde: impedidoEm, com: ass });
      relator = sorteia(doColegiado(p.camara, distribuidoEm), `${key}:rel2`, relator);
      ev.push({ status: 'Distribuído ao relator', desde: distribuidoEm, com: relator });
    }
    // Fim do mandato antes do relato: o processo vai a outro conselheiro da câmara no primeiro dia do mandato seguinte.
    for (let fim = fimDoMandato(relator, distribuidoEm); fim && fim < p.revisaoEm && fim < p.julgadoEm; fim = fimDoMandato(relator, distribuidoEm)) {
      distribuidoEm = addDays(fim, 1); relator = sorteia(doColegiado(p.camara, distribuidoEm), `${key}:rel:${distribuidoEm}`, relator);
      ev.push({ status: 'Distribuído ao relator', desde: distribuidoEm, com: relator });
    }
    ev.push({ status: 'Em revisão', desde: p.revisaoEm, com: relator }, { status: 'Assinado', desde: p.assinadoEm, com: ass }, { status: 'Pautado', desde: p.pautaEm, com: ass });
    if (p.vista) { const em = addDays(p.pautaEm, between(`${key}:v`, 1, 10)); ev.push({ status: 'Pedido de vista', desde: em, com: sorteia(doColegiado(p.camara, em), `${key}:vc`, relator) }, { status: 'Pautado', desde: addDays(em, between(`${key}:vp`, 14, 21)), com: ass }); }
    if (p.diligencia) { const em = addDays(p.pautaEm, between(`${key}:d`, 1, 10)); ev.push({ status: 'Diligência', desde: em, com: ass }, { status: 'Pautado', desde: addDays(p.julgadoEm, -between(`${key}:dp`, 5, Math.max(5, Math.min(20, dias(em, p.julgadoEm) - 5)))), com: ass }); }
    // Autos que chegam à prescrição saem antes da pauta: os marcos depois do arquivamento caem.
    const caminho = ev.filter(e => e.desde < p.julgadoEm).sort((a, b) => a.desde.localeCompare(b.desde));
    caminho.push({ status: 'Votado', desde: p.julgadoEm, com: relator });
    tramitacoes.push({ id: p.id, processo: p, colegiado: p.camara, instancia: 'Câmara', entrada: p.entrada, votadoEm: p.julgadoEm, relator, eventos: caminho, distribuidoEm, assinadoEm: p.assinadoEm < p.julgadoEm ? p.assinadoEm : p.julgadoEm, ia: p.ia });
    if (p.recursoEm && p.plenarioEm) {
      // No recurso, o Plenário distribui a outro conselheiro e segue o mesmo caminho, em frações do tempo até a votação.
      const janela = dias(p.recursoEm, p.plenarioEm), em = (fracao: number) => addDays(p.recursoEm!, Math.round(janela * fracao)), assP = assessor('Plenário', `${key}:assp`);
      let relatorP = sorteia(doColegiado('Plenário', em(0.15)), `${key}:relp`, relator), distribuidoP = em(0.15);
      const evP: Evento[] = [{ status: 'Aguardando distribuição', desde: p.recursoEm, com: assP }, { status: 'Distribuído ao relator', desde: distribuidoP, com: relatorP }];
      for (let fim = fimDoMandato(relatorP, distribuidoP); fim && fim < em(0.6); fim = fimDoMandato(relatorP, distribuidoP)) {
        distribuidoP = addDays(fim, 1); relatorP = sorteia(doColegiado('Plenário', distribuidoP), `${key}:relp:${distribuidoP}`, relatorP);
        evP.push({ status: 'Distribuído ao relator', desde: distribuidoP, com: relatorP });
      }
      evP.push({ status: 'Em revisão', desde: em(0.6), com: relatorP }, { status: 'Assinado', desde: em(0.75), com: assP }, { status: 'Pautado', desde: em(0.9), com: assP }, { status: 'Votado', desde: p.plenarioEm, com: relatorP });
      tramitacoes.push({ id: `${p.id}-R`, processo: p, colegiado: 'Plenário', instancia: 'Plenário', entrada: p.recursoEm, votadoEm: p.plenarioEm, relator: relatorP, distribuidoEm: distribuidoP, assinadoEm: em(0.75), ia: distribuidoP >= INICIO_IA && chance(`${key}:iap`) < 0.45, eventos: evP });
    }
  }

  // Autos de infração: penalidade, reincidência (a mesma empresa já punida antes), recurso ao Confea, trânsito em julgado e pagamento.
  const autos = buildProcessos(dataset).filter(p => p.tipo === 'Auto de infração').sort((a, b) => a.julgadoEm.localeCompare(b.julgadoEm));
  const punidaEm = new Map<string, string>(), desdobramentos: Desdobramento[] = [];
  for (const p of autos) {
    const key = `desd:${p.id}`, pj = Boolean(p.companyId), multa = p.multa ?? 0;
    const reincidente = Boolean(p.companyId && punidaEm.has(p.companyId) && punidaEm.get(p.companyId)! < p.entrada);
    const alinea = pj ? weighted<Alinea>(`${key}:al`, ['c', 'e', 'a'], [60, 30, 10]) : weighted<Alinea>(`${key}:al`, ['b', 'd', 'a'], [50, 40, 10]);
    const desfecho: Desfecho = p.decisao === 'Arquivado pela prescrição' ? 'Arquivamento pela prescrição' : p.decisao === 'Auto anulado' ? 'Arquivamento' : p.decisao === 'Multa reduzida' ? 'Multa reduzida'
      : reincidente ? 'Multa em dobro' : !pj && chance(`${key}:susp`) < 0.03 ? 'Suspensão do exercício' : 'Multa';
    const multaCamara = desfecho === 'Multa' || desfecho === 'Suspensão do exercício' ? multa : desfecho === 'Multa reduzida' ? Math.round(multa * 0.5) : desfecho === 'Multa em dobro' ? multa * 2 : 0;
    if (multaCamara > 0 && p.companyId) punidaEm.set(p.companyId, p.julgadoEm);
    const d: Desdobramento = { processo: p, desfecho, alinea, reincidente, multaCamara, multaFinal: p.decisaoPlenario === 'Decisão reformada' ? 0 : multaCamara };
    if (p.decisaoPlenario === 'Decisão mantida' && chance(`${key}:cf`) < 0.15) { d.confeaEm = addDays(p.plenarioEm!, between(`${key}:cfe`, 20, 55)); d.confeaDecisaoEm = addDays(d.confeaEm, between(`${key}:cfd`, 150, 600)); }
    d.transitoEm = !p.recursoEm ? addDays(p.julgadoEm, between(`${key}:tj`, 75, 110)) : d.confeaDecisaoEm ? addDays(d.confeaDecisaoEm, between(`${key}:tjc`, 20, 45)) : addDays(p.plenarioEm!, between(`${key}:tjp`, 75, 110));
    if (d.multaFinal > 0 && chance(`${key}:pg`) < 0.55) d.pagoEm = addDays(d.transitoEm, between(`${key}:pgd`, 5, 200));
    desdobramentos.push(d);
  }

  // Sessões ordinárias: o Plenário uma por mês, as câmaras pelo calendário do cenário; sem sessão em janeiro.
  const sessoes: Sessao[] = [];
  for (const month of mesesAte('2020-01', corte)) for (const colegiado of colegiados) {
    const n = colegiado === 'Plenário' ? (month.endsWith('-01') ? 0 : 1) : sessoesNoMes(colegiado, month);
    for (let index = 0; index < n; index++) {
      const id = `SES-${month}-${colegiado}-${index + 1}`, data = `${month}-${String(index === 0 ? 6 + between(`${id}:d`, 0, 8) : 20 + between(`${id}:d`, 0, 6)).padStart(2, '0')}`;
      if (data > corte) continue;
      const rows = doColegiado(colegiado, data);
      sessoes.push({ id, colegiado, data, membros: rows.map(m => m.id), presentes: rows.filter(m => chance(`${id}:${m.id}`) < m.assiduidade).map(m => m.id) });
    }
  }

  // Cada convênio, contrato e patrocínio com uma organização passou pelo Plenário na sessão anterior ao início.
  const plenarias = sessoes.filter(s => s.colegiado === 'Plenário');
  const deliberacoes: Deliberacao[] = [];
  for (const r of entidades.repasses) {
    const sessao = [...plenarias].reverse().find(s => s.data < r.inicio); if (!sessao || dias(sessao.data, r.inicio) > 120) continue;
    const rows = membrosNa(sessao.data), daOrg = rows.filter(m => m.orgId === r.orgId), key = `delib:${r.id}`;
    const proponente = daOrg.length && chance(`${key}:p`) < 0.3 ? daOrg[Math.floor(chance(`${key}:po`) * daOrg.length)].id : sorteia(rows, `${key}:pr`);
    deliberacoes.push({ id: `DEL-${r.id}`, data: sessao.data, canal: r.canal, orgId: r.orgId, organizacao: orgDe.get(r.orgId)?.nome ?? r.orgId, valor: r.valor, objeto: r.objeto, proponente,
      conflito: membros.some(m => m.id === proponente && m.orgId === r.orgId) });
  }

  const base = { entidades, membros, pessoas, assessores, tramitacoes, desdobramentos, sessoes, deliberacoes };
  cache.set(dataset, base); return base;
}

/** O status da tramitação na data: nulo antes da entrada e depois da votação. */
export function statusEm(t: Tramitacao, data: string): Evento | null {
  if (t.entrada > data || t.votadoEm <= data) return null;
  let atual: Evento | null = null;
  for (const e of t.eventos) { if (e.desde > data) break; atual = e; }
  return atual;
}

/* ---------- Leitura na data, com o recorte ---------- */
export interface RecorteColegiado { colegiado: Colegiado | null; greId: string | null; cityId: string | null }
export interface Pendente { t: Tramitacao; evento: Evento; diasNoStatus: number; diasTotais: number }
export const faixasNoStatus = ['até 30 dias', '31 a 90 dias', '91 a 120 dias', '121 dias a 1 ano', 'mais de 1 ano'];
export const faixaNoStatus = (n: number) => n <= 30 ? 0 : n <= 90 ? 1 : n <= 120 ? 2 : n <= 365 ? 3 : 4;
/** O alerta da fila (decisão do Caio, 07/11/2026): amarelo de 90 a 120 dias no status, vermelho acima de 120; o total acende acima de um ano. */
export const alertaNoStatus = (n: number): 'vermelho' | 'amarelo' | null => n > 120 ? 'vermelho' : n >= 90 ? 'amarelo' : null;
export const faixasCadastro = ['no mesmo dia', '1 a 3 dias', '4 a 7 dias', '8 a 15 dias', '16 a 30 dias', 'mais de 30 dias'];
export const faixaCadastro = (n: number) => n <= 0 ? 0 : n <= 3 ? 1 : n <= 7 ? 2 : n <= 15 ? 3 : n <= 30 ? 4 : 5;
export const faixasPrescricaoRelator = ['até 3 meses', '3 a 6 meses', '6 a 12 meses'];
/**
 * Quando o auto de infração pendente prescreve: cinco anos do fato (Lei 9.873/1999, art. 1º) ou três anos parado no mesmo status,
 * a prescrição intercorrente (art. 1º, § 1º), o que vier primeiro. Nulo nos processos que não são autos.
 */
export function prescricaoDe(row: Pendente): { em: string; motivo: 'cinco anos do fato' | 'três anos parado' } | null {
  const p = row.t.processo; if (p.tipo !== 'Auto de infração' || !p.prescreveEm) return null;
  const parado = addDays(row.evento.desde, 1095), quinquenal = row.t.instancia === 'Câmara' ? p.prescreveEm : null;
  return quinquenal && quinquenal <= parado ? { em: quinquenal, motivo: 'cinco anos do fato' } : { em: parado, motivo: 'três anos parado' };
}
export const etapasDoCaminho = ['Recebidos nas câmaras', 'Votados nas câmaras', 'Recursos ao Plenário', 'Votados no Plenário', 'Recursos ao Confea', 'Transitados em julgado', 'Multas pagas'];
export type Desvio = 'Pedido de vista' | 'Impedimento' | 'Diligência';
export const desvios: Desvio[] = ['Pedido de vista', 'Impedimento', 'Diligência'];
export type DestinoMulta = 'Paga' | 'Em cobrança' | 'Em recurso' | 'Anulada no recurso';
export const destinosMulta: DestinoMulta[] = ['Paga', 'Em cobrança', 'Em recurso', 'Anulada no recurso'];

export interface LinhaConselheiro { membro: Membro; carga: Pendente[]; relatos: Tramitacao[]; tempoRelato: number | null; sessoes: number; presencas: number; presenca: number | null; vistas: number }
export interface QuadroColegiado {
  recorte: RecorteColegiado; pessoas: Map<string, Pessoa>;
  /* Colegiado */
  membros: Membro[]; organizacoes: { entidades: number; escolas: number };
  tercos: { terco: string; entidades: Membro[]; escolas: Membro[] }[];
  pendentes: Pendente[]; pendentesAntes: number; porStatus: Record<StatusVotenet, Pendente[]>;
  posse: { pessoa: Pessoa; pendentes: Pendente[] }[];
  mensal: { month: string; pautados: number; votados: number; votadosAntes: number; pendentes: number }[];
  votados: Tramitacao[]; votadosAntes: number; tempoDecisao: number | null; tempoDecisaoAntes: number | null; deExerciciosAnteriores: Pendente[];
  caminho: { etapa: string; total: number }[];
  /* Processos */
  calor: Pendente[][][]; pertoDePrescrever: Pendente[]; parados: Pendente[];
  prescricaoPorRelator: { pessoa: Pessoa; faixas: Pendente[][]; multas: number }[];
  cadastro: Tramitacao[][]; cadastroMediana: number | null;
  /* Conselheiros */
  conselheiros: LinhaConselheiro[]; sessoes: number; presenca: number | null; presencaAntes: number | null;
  tempoRelato: number | null; tempoRelatoAntes: number | null; comIa: Tramitacao[]; semIa: Tramitacao[]; tempoComIa: number | null; tempoSemIa: number | null;
  iaTrimestral: { trimestre: string; comIa: number | null; semIa: number | null; parteIa: number | null }[];
  desvios: { colegiado: Colegiado; porTipo: Record<Desvio, Tramitacao[]> }[]; vistas: number; vistasAntes: number;
  /* Decisões */
  autosVotados: Desdobramento[]; multasAplicadas: number; multasAntes: number; arquivados: number | null;
  recursos: Tramitacao[]; recursosAntes: number; reformadas: number | null; votadosPlenario: Tramitacao[];
  desfechoPorCamara: { camara: CamaraConselho; porDesfecho: Record<Desfecho, Desdobramento[]> }[];
  porAlinea: { alinea: Alinea; autos: Desdobramento[]; valor: number }[];
  plenarioPorCamara: { camara: CamaraConselho; mantidas: Tramitacao[]; reformadas: Tramitacao[] }[];
  multasPorAno: { ano: string; porDestino: Record<DestinoMulta, Desdobramento[]>; valor: Record<DestinoMulta, number> }[];
  /* Representação */
  plenario: LinhaPlenario[];
  mulheres: { camara: CamaraConselho; conselheiras: number; conselheiros: number; parteConselho: number | null; parteRegistro: number | null }[];
  parteMulheres: number | null; parteMulheresRegistro: number | null;
  organizacoesComCadeira: { orgId: string; nome: string; sigla: string; natureza: string; cadeiras: number; membros: Membro[]; repassado: number; porCanal: Record<Canal, number> }[];
  deliberacoes: Deliberacao[]; deliberacoesAntes: number; conflitos: Deliberacao[];
}

const inside = (date: string | undefined, start: string, end: string) => Boolean(date && date >= start && date <= end);
const trimestre = (date: string) => `${date.slice(0, 4)}-T${Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1}`;
const vazioPor = <K extends string, V>(keys: readonly K[], fn: () => V) => Object.fromEntries(keys.map(k => [k, fn()])) as Record<K, V>;

/**
 * Tudo o que as cinco páginas mostram, na data `anchor` e no período [`start`, `anchor`] (comparado com [`prevStart`, `prevEnd`]).
 * O colegiado escolhido recorta processos, conselheiros e sessões; a regional e o município recortam só os processos (pelo lugar do
 * processo), porque o conselheiro não é de uma regional.
 */
export function quadroColegiado(base: BaseColegiado, modelo: ModeloProfissionais, anchor: string, start: string, prevStart: string, prevEnd: string, recorte: RecorteColegiado): QuadroColegiado {
  const { colegiado, greId, cityId } = recorte, anoAntes = addDays(anchor, -365);
  const doLugar = (p: Processo) => (!greId || p.greId === greId) && (!cityId || p.cityId === cityId);
  const tram = base.tramitacoes.filter(t => (!colegiado || t.colegiado === colegiado) && doLugar(t.processo));
  const pendentesEm = (data: string) => tram.flatMap(t => { const evento = statusEm(t, data); return evento ? [{ t, evento, diasNoStatus: dias(evento.desde, data), diasTotais: dias(t.entrada, data) }] : []; });
  const pendentes = pendentesEm(anchor).sort((a, b) => b.diasNoStatus - a.diasNoStatus || b.diasTotais - a.diasTotais);
  const membrosNa = (data: string) => membrosEm(base.entidades, data).filter(m => !colegiado || colegiado === 'Plenário' || m.camara === colegiado);
  const membros = membrosNa(anchor);
  const orgs = new Map(membros.map(m => [m.orgId, m.natureza]));
  const tercos = [...new Set(membros.map(m => m.terco))].sort().map(terco => ({ terco, entidades: membros.filter(m => m.terco === terco && m.natureza === 'Entidade de classe'), escolas: membros.filter(m => m.terco === terco && m.natureza === 'Instituição de ensino') }));
  const porStatus = vazioPor(statusPendentes as StatusVotenet[], () => [] as Pendente[]) as Record<StatusVotenet, Pendente[]>; porStatus.Votado = [];
  for (const row of pendentes) porStatus[row.evento.status].push(row);
  const porPessoa = new Map<string, Pendente[]>(); for (const row of pendentes) porPessoa.set(row.evento.com, [...(porPessoa.get(row.evento.com) ?? []), row]);
  const posse = [...porPessoa].map(([id, rows]) => ({ pessoa: base.pessoas.get(id)!, pendentes: rows })).filter(row => row.pessoa).sort((a, b) => b.pendentes.length - a.pendentes.length || a.pessoa.nome.localeCompare(b.pessoa.nome));
  // Mês a mês, nos 24 meses até a data: pautados (cada ida à pauta), votados, votados no mesmo mês do ano anterior e pendentes no fim do mês.
  const inicioSerie = new Date(`${anchor.slice(0, 7)}-01T00:00:00Z`); inicioSerie.setUTCMonth(inicioSerie.getUTCMonth() - 23);
  const mesesSerie = mesesAte(inicioSerie.toISOString().slice(0, 10), anchor);
  const pautasNoMes = new Map<string, number>(), votadosNoMes = new Map<string, number>();
  for (const t of tram) { for (const e of t.eventos) if (e.status === 'Pautado' && e.desde <= anchor) pautasNoMes.set(e.desde.slice(0, 7), (pautasNoMes.get(e.desde.slice(0, 7)) ?? 0) + 1); if (t.votadoEm <= anchor) votadosNoMes.set(t.votadoEm.slice(0, 7), (votadosNoMes.get(t.votadoEm.slice(0, 7)) ?? 0) + 1); }
  const mesAntes = (month: string) => `${Number(month.slice(0, 4)) - 1}${month.slice(4)}`;
  const fimDoMes = (month: string) => { const fim = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10); return fim > anchor ? anchor : fim; };
  const mensal = mesesSerie.map(month => ({ month, pautados: pautasNoMes.get(month) ?? 0, votados: votadosNoMes.get(month) ?? 0, votadosAntes: votadosNoMes.get(mesAntes(month)) ?? 0, pendentes: pendentesEm(fimDoMes(month)).length }));
  const votados = tram.filter(t => inside(t.votadoEm, start, anchor)), votadosAntes = tram.filter(t => inside(t.votadoEm, prevStart, prevEnd)).length;
  const decisao = (rows: Tramitacao[]) => mediana(rows.filter(t => t.instancia === 'Câmara').map(t => dias(t.processo.aberturaEm, t.votadoEm)));
  const deExerciciosAnteriores = pendentes.filter(row => row.t.entrada < `${anchor.slice(0, 4)}-01-01`);
  // O caminho do auto ao pagamento: quantos passaram por cada marco no período. Só os processos que já tinham chegado ao colegiado
  // na data: no Plenário, os autos com recurso até ela.
  const processosDoRecorte = [...new Map(tram.filter(t => t.entrada <= anchor).map(t => [t.processo.id, t.processo])).values()];
  const doRecorte = new Set(processosDoRecorte.map(p => p.id)), desd = base.desdobramentos.filter(d => doRecorte.has(d.processo.id));
  const caminho = [
    processosDoRecorte.filter(p => inside(p.entrada, start, anchor)).length,
    processosDoRecorte.filter(p => inside(p.julgadoEm, start, anchor)).length, processosDoRecorte.filter(p => inside(p.recursoEm, start, anchor)).length,
    processosDoRecorte.filter(p => inside(p.plenarioEm, start, anchor)).length, desd.filter(d => inside(d.confeaEm, start, anchor)).length,
    desd.filter(d => inside(d.transitoEm, start, anchor)).length, desd.filter(d => inside(d.pagoEm, start, anchor)).length,
  ].map((total, index) => ({ etapa: etapasDoCaminho[index], total }));

  /* Processos */
  const calor = statusPendentes.map(status => faixasNoStatus.map((_, faixa) => porStatus[status].filter(row => faixaNoStatus(row.diasNoStatus) === faixa)));
  const prescreve = (row: Pendente) => { const p = prescricaoDe(row); return p ? dias(anchor, p.em) / 30.44 : null; };
  const pertoDePrescrever = pendentes.filter(row => { const m = prescreve(row); return m !== null && m >= 0 && m <= 12; });
  const parados = pendentes.filter(row => row.diasNoStatus > 730);
  const porRelator = new Map<string, Pendente[]>(); for (const row of pertoDePrescrever) porRelator.set(row.t.relator, [...(porRelator.get(row.t.relator) ?? []), row]);
  const prescricaoPorRelator = [...porRelator].map(([id, rows]) => ({ pessoa: base.pessoas.get(id)!, faixas: [0, 1, 2].map(f => rows.filter(row => { const m = prescreve(row)!; return f === 0 ? m <= 3 : f === 1 ? m > 3 && m <= 6 : m > 6; })), multas: sum(rows.map(row => row.t.processo.multa ?? 0)) }))
    .filter(row => row.pessoa).sort((a, b) => b.multas - a.multas);
  const recebidos = tram.filter(t => t.instancia === 'Câmara' && inside(t.entrada, start, anchor));
  const cadastro = faixasCadastro.map((_, faixa) => recebidos.filter(t => faixaCadastro(dias(t.entrada, t.processo.cadastroEm)) === faixa));

  /* Conselheiros */
  const sessoes = base.sessoes.filter(s => !colegiado || s.colegiado === colegiado);
  const noPeriodo = sessoes.filter(s => inside(s.data, start, anchor)), antes = sessoes.filter(s => inside(s.data, prevStart, prevEnd));
  const taxa = (rows: Sessao[]) => share(sum(rows.map(s => s.presentes.length)), sum(rows.map(s => s.membros.length)));
  const relatos = (de: string, ate: string) => tram.filter(t => inside(t.assinadoEm, de, ate) && t.assinadoEm < t.votadoEm);
  const relatosPeriodo = relatos(start, anchor), tempo = (rows: Tramitacao[]) => mediana(rows.map(t => dias(t.distribuidoEm, t.assinadoEm)));
  const pedidosDeVista = (de: string, ate: string) => tram.filter(t => t.eventos.some(e => e.status === 'Pedido de vista' && inside(e.desde, de, ate)));
  const conselheiros: LinhaConselheiro[] = membros.map(membro => {
    const doMembro = noPeriodo.filter(s => s.membros.includes(membro.id)), presencas = doMembro.filter(s => s.presentes.includes(membro.id)).length, deles = relatosPeriodo.filter(t => t.relator === membro.id);
    return { membro, carga: pendentes.filter(row => row.t.relator === membro.id && row.evento.status !== 'Aguardando distribuição'), relatos: deles, tempoRelato: tempo(deles), sessoes: doMembro.length, presencas, presenca: share(presencas, doMembro.length),
      vistas: tram.filter(t => t.eventos.some(e => e.status === 'Pedido de vista' && e.com === membro.id && inside(e.desde, start, anchor))).length };
  }).sort((a, b) => b.carga.length - a.carga.length || a.membro.nome.localeCompare(b.membro.nome));
  const comIa = relatosPeriodo.filter(t => t.ia), semIa = relatosPeriodo.filter(t => !t.ia && t.distribuidoEm >= INICIO_IA);
  const trimestres = [...new Set(tram.filter(t => t.assinadoEm >= INICIO_IA && t.assinadoEm <= anchor && t.assinadoEm < t.votadoEm).map(t => trimestre(t.assinadoEm)))].sort();
  const iaTrimestral = trimestres.map(tri => { const rows = tram.filter(t => t.assinadoEm <= anchor && t.assinadoEm < t.votadoEm && trimestre(t.assinadoEm) === tri && t.distribuidoEm >= INICIO_IA), com = rows.filter(t => t.ia);
    return { trimestre: tri, comIa: tempo(com), semIa: tempo(rows.filter(t => !t.ia)), parteIa: share(com.length, rows.length) }; });
  const desviosRows = (colegiado ? [colegiado] : colegiados).map(c => ({ colegiado: c, porTipo: Object.fromEntries(desvios.map(d => [d, tram.filter(t => t.colegiado === c && t.eventos.some(e => e.status === d && inside(e.desde, start, anchor)))])) as Record<Desvio, Tramitacao[]> }));

  /* Decisões */
  const autosVotados = desd.filter(d => inside(d.processo.julgadoEm, start, anchor));
  const recursos = tram.filter(t => t.instancia === 'Plenário' && t.entrada <= anchor && t.votadoEm > anchor);
  const recursosAntes = tram.filter(t => t.instancia === 'Plenário' && t.entrada <= anoAntes && t.votadoEm > anoAntes).length;
  const votadosPlenario = tram.filter(t => t.instancia === 'Plenário' && inside(t.votadoEm, start, anchor));
  const camarasDoRecorte = colegiado && colegiado !== 'Plenário' ? [colegiado] : camarasConselho;
  const desfechoPorCamara = camarasDoRecorte.map(camara => ({ camara, porDesfecho: Object.fromEntries(desfechos.map(d => [d, autosVotados.filter(row => row.processo.camara === camara && row.desfecho === d)])) as Record<Desfecho, Desdobramento[]> }));
  const comMulta = autosVotados.filter(d => d.multaCamara > 0);
  const porAlinea = alineas.map(alinea => { const rows = comMulta.filter(d => d.alinea === alinea); return { alinea, autos: rows, valor: sum(rows.map(d => d.multaCamara)) }; });
  const plenarioDoRecorte = base.tramitacoes.filter(t => t.instancia === 'Plenário' && doLugar(t.processo) && inside(t.votadoEm, start, anchor));
  const plenarioPorCamara = camarasDoRecorte.map(camara => { const rows = plenarioDoRecorte.filter(t => t.processo.camara === camara); return { camara, mantidas: rows.filter(t => t.processo.decisaoPlenario === 'Decisão mantida'), reformadas: rows.filter(t => t.processo.decisaoPlenario === 'Decisão reformada') }; });
  const destino = (d: Desdobramento): DestinoMulta => d.multaFinal === 0 && d.processo.plenarioEm && d.processo.plenarioEm <= anchor ? 'Anulada no recurso' : d.pagoEm && d.pagoEm <= anchor ? 'Paga' : d.transitoEm && d.transitoEm <= anchor ? 'Em cobrança' : 'Em recurso';
  const anos = [0, 1, 2, 3].map(n => String(Number(anchor.slice(0, 4)) - 3 + n));
  const multasPorAno = anos.map(ano => { const rows = desd.filter(d => d.multaCamara > 0 && d.processo.julgadoEm.startsWith(ano) && d.processo.julgadoEm <= anchor);
    const porDestino = Object.fromEntries(destinosMulta.map(x => [x, rows.filter(d => destino(d) === x)])) as Record<DestinoMulta, Desdobramento[]>;
    return { ano, porDestino, valor: Object.fromEntries(destinosMulta.map(x => [x, sum(porDestino[x].map(d => d.multaCamara))])) as Record<DestinoMulta, number> }; });

  /* Representação */
  const linhasPlenario = plenario(base.entidades, modelo, anchor).filter(row => !colegiado || colegiado === 'Plenário' || row.camara === colegiado);
  const ativos = modelo.profissionais.filter(p => situacaoEm(p, anchor) === 'Ativo');
  const mulheres = camarasDoRecorte.map(camara => { const daCamara = membros.filter(m => m.camara === camara), mod = modalidadeDaCamara[camara], registro = mod ? ativos.filter(p => p.modalidade === mod) : [];
    return { camara, conselheiras: daCamara.filter(m => m.genero === 'Feminino').length, conselheiros: daCamara.length, parteConselho: share(daCamara.filter(m => m.genero === 'Feminino').length, daCamara.length),
      parteRegistro: mod ? share(registro.filter(p => p.genero === 'Feminino').length, registro.length) : null }; });
  const mods = new Set(camarasDoRecorte.map(c => modalidadeDaCamara[c]).filter(Boolean));
  const registroRecorte = ativos.filter(p => mods.has(p.modalidade));
  const pagos12 = new Map<string, Record<Canal, number>>();
  for (const r of base.entidades.repasses) for (const pg of r.pagamentos) if (pg.data > anoAntes && pg.data <= anchor && r.inicio <= anchor) {
    const atual = pagos12.get(r.orgId) ?? { Convênio: 0, Contrato: 0, Patrocínio: 0 }; atual[r.canal] += pg.valor; pagos12.set(r.orgId, atual);
  }
  const orgDe = new Map(base.entidades.organizacoes.map(org => [org.id, org]));
  const organizacoesComCadeira = [...new Set(membros.map(m => m.orgId))].map(orgId => { const org = orgDe.get(orgId)!, porCanal = pagos12.get(orgId) ?? { Convênio: 0, Contrato: 0, Patrocínio: 0 }, deles = membros.filter(m => m.orgId === orgId);
    return { orgId, nome: org.nome, sigla: org.sigla, natureza: org.grupo === 'IES' ? 'Instituição de ensino' : 'Entidade de classe', cadeiras: deles.length, membros: deles, repassado: sum(Object.values(porCanal)), porCanal }; })
    .sort((a, b) => b.repassado - a.repassado || b.cadeiras - a.cadeiras || a.nome.localeCompare(b.nome));
  const doRecorteOrg = (d: Deliberacao) => !colegiado || colegiado === 'Plenário' || membros.some(m => m.orgId === d.orgId);
  const deliberacoes = base.deliberacoes.filter(d => inside(d.data, start, anchor) && doRecorteOrg(d)).sort((a, b) => b.data.localeCompare(a.data));

  return {
    recorte, pessoas: base.pessoas, membros, organizacoes: { entidades: [...orgs.values()].filter(n => n === 'Entidade de classe').length, escolas: [...orgs.values()].filter(n => n === 'Instituição de ensino').length },
    tercos, pendentes, pendentesAntes: pendentesEm(anoAntes).length, porStatus, posse, mensal, votados, votadosAntes, tempoDecisao: decisao(votados), tempoDecisaoAntes: decisao(tram.filter(t => inside(t.votadoEm, prevStart, prevEnd))),
    deExerciciosAnteriores, caminho,
    calor, pertoDePrescrever, parados, prescricaoPorRelator, cadastro, cadastroMediana: mediana(recebidos.map(t => dias(t.entrada, t.processo.cadastroEm))),
    conselheiros, sessoes: noPeriodo.length, presenca: taxa(noPeriodo), presencaAntes: taxa(antes), tempoRelato: tempo(relatosPeriodo), tempoRelatoAntes: tempo(relatos(prevStart, prevEnd)), comIa, semIa, tempoComIa: tempo(comIa), tempoSemIa: tempo(semIa), iaTrimestral,
    desvios: desviosRows, vistas: pedidosDeVista(start, anchor).length, vistasAntes: pedidosDeVista(prevStart, prevEnd).length,
    autosVotados, multasAplicadas: sum(autosVotados.map(d => d.multaCamara)), multasAntes: sum(desd.filter(d => inside(d.processo.julgadoEm, prevStart, prevEnd)).map(d => d.multaCamara)),
    arquivados: share(autosVotados.filter(d => d.desfecho === 'Arquivamento' || d.desfecho === 'Arquivamento pela prescrição').length, autosVotados.length),
    recursos, recursosAntes, reformadas: share(votadosPlenario.filter(t => t.processo.decisaoPlenario === 'Decisão reformada').length, votadosPlenario.length), votadosPlenario,
    desfechoPorCamara, porAlinea, plenarioPorCamara, multasPorAno,
    plenario: linhasPlenario, mulheres, parteMulheres: share(membros.filter(m => m.genero === 'Feminino').length, membros.length), parteMulheresRegistro: share(registroRecorte.filter(p => p.genero === 'Feminino').length, registroRecorte.length),
    organizacoesComCadeira, deliberacoes, deliberacoesAntes: base.deliberacoes.filter(d => inside(d.data, prevStart, prevEnd) && doRecorteOrg(d)).length, conflitos: deliberacoes.filter(d => d.conflito),
  };
}
