import type { Dataset, Establishment } from './types';
import { between, chance, weighted } from './hash';
import { canaisAtendimento, distanciaUnidade } from './gestao';
import type { Canal } from './gestao';
import { municipiosSp } from './municipios';
import type { Municipio } from './municipios';
import { buildProfissionais } from './profissionais';
import { buildConselho } from './conselho';
import { buildFormacao } from './formacao';
import { classeDoEstabelecimento } from '../observatorio/norte';
import { servidores } from './pessoas-conselho';
import type { Servidor } from './pessoas-conselho';

/**
 * Painel de Atendimento (07/11/2026): os protocolos de serviço do Crea-SP, a partir do painel de protocolos que o Conselho já usa
 * (Power BI com os totais por situação, dentro e fora do prazo, tipo e subtipo de serviço, protocolos por GRE, os colaboradores com
 * mais protocolos e a mediana do prazo mês a mês).
 *
 * Regras do prazo (decisão do grilling de 07/11/2026):
 * - Cada serviço tem o seu prazo em dias úteis, como na Carta de Serviços e no CreaNet (cancelamento e baixa de ART em 10 dias
 *   úteis, regularização em 20). Os prazos ficam em `servicos`, um ponto único para trocar.
 * - O relógio corre só quando o protocolo está com o Crea-SP. Para em exigência (com o solicitante) e aguardando pagamento.
 * - Em exigência, o solicitante tem 30 dias corridos para responder; depois disso o protocolo está fora do prazo.
 * - Os status são os do painel antigo, agrupados nas cinco situações dele: aberto, exigência, sem pagamento, cancelado e fechado.
 */

/* ---------- Dias úteis ---------- */
const DIA = 86400000;
const diaDe = (data: string) => Math.floor(Date.parse(`${data}T00:00:00Z`) / DIA);
const dataDe = (dia: number) => new Date(dia * DIA).toISOString().slice(0, 10);
/** Dias corridos entre duas datas (o fim menos o início). */
export const diasCorridos = (de: string, ate: string) => diaDe(ate) - diaDe(de);
/** Feriados nacionais fixos (Lei 662/1949, Lei 6.802/1980 e Lei 14.759/2023, que fez do 20 de novembro feriado nacional). */
const FIXOS = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'];
const pascoa = new Map<number, number>();
/** Sexta-feira da Paixão: dois dias antes do domingo de Páscoa (cálculo de Meeus para o calendário gregoriano). */
function paixao(ano: number) {
  let dia = pascoa.get(ano);
  if (dia === undefined) {
    const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31), diaDoMes = ((h + l - 7 * m + 114) % 31) + 1;
    dia = diaDe(`${ano}-${String(mes).padStart(2, '0')}-${String(diaDoMes).padStart(2, '0')}`) - 2; pascoa.set(ano, dia);
  }
  return dia;
}
const util = (dia: number) => {
  const semana = (dia + 4) % 7; // 1º/01/1970 foi uma quinta-feira
  if (semana === 0 || semana === 6) return false;
  const data = dataDe(dia);
  return !FIXOS.includes(data.slice(5)) && dia !== paixao(Number(data.slice(0, 4)));
};
/** Dias úteis do dia seguinte a `de` até `ate`, inclusive: sem sábado, domingo e feriado nacional. Zero se `ate` não passa de `de`. */
export function diasUteis(de: string, ate: string): number {
  let n = 0; for (let dia = diaDe(de) + 1, fim = diaDe(ate); dia <= fim; dia++) if (util(dia)) n++;
  return n;
}

/* ---------- Serviços, status e situações ---------- */
export type TipoServico = 'Registro de profissional' | 'Registro de empresa' | 'Serviços de ART' | 'Certidões' | 'Anuidade e taxas' | 'Orientação' | 'Instituição de ensino';
export const tiposServico: TipoServico[] = ['Registro de profissional', 'Registro de empresa', 'Serviços de ART', 'Certidões', 'Anuidade e taxas', 'Orientação', 'Instituição de ensino'];
export type Status = 'Aguardando pagamento' | 'Aguardando análise' | 'Em análise' | 'Exigência' | 'Exigência atendida' | 'Enviada à câmara'
  | 'Deferida' | 'Indeferida' | 'Cancelada' | 'Finalizada sem resposta à exigência' | 'Finalizada com pendência';
/** Os status na ordem do caminho: os abertos primeiro, depois os que fecham o protocolo. */
export const statusProtocolo: Status[] = ['Aguardando pagamento', 'Aguardando análise', 'Em análise', 'Exigência', 'Exigência atendida', 'Enviada à câmara',
  'Deferida', 'Indeferida', 'Finalizada sem resposta à exigência', 'Finalizada com pendência', 'Cancelada'];
export type Situacao = 'Aberto' | 'Exigência' | 'Sem pagamento' | 'Cancelado' | 'Fechado';
export const situacoes: Situacao[] = ['Aberto', 'Exigência', 'Sem pagamento', 'Cancelado', 'Fechado'];
export const situacaoDoStatus: Record<Status, Situacao> = {
  'Aguardando pagamento': 'Sem pagamento', 'Aguardando análise': 'Aberto', 'Em análise': 'Aberto', 'Exigência': 'Exigência', 'Exigência atendida': 'Aberto', 'Enviada à câmara': 'Aberto',
  Deferida: 'Fechado', Indeferida: 'Fechado', Cancelada: 'Cancelado', 'Finalizada sem resposta à exigência': 'Fechado', 'Finalizada com pendência': 'Fechado',
};
/** Status em que o protocolo está com o Crea-SP e o relógio do prazo corre. */
const COM_O_CREA = new Set<Status>(['Aguardando análise', 'Em análise', 'Exigência atendida', 'Enviada à câmara']);
/** Dias corridos que o solicitante tem para responder a uma exigência. */
export const PRAZO_EXIGENCIA = 30;

export type Solicitante = 'Profissional' | 'Empresa' | 'Instituição de ensino';
export interface Evento { status: Status; desde: string; com: string | null }
export interface Protocolo {
  id: string; numero: string; subtipo: string; tipo: TipoServico;
  /** Prazo do serviço, em dias úteis com o Crea-SP; taxa do serviço em reais (zero quando não há). */
  prazo: number; taxa: number;
  solicitante: Solicitante; profissionalId?: string; companyId?: string;
  /** Município de quem pediu (onde mora ou tem sede), a GRE dele pela tabela oficial e a unidade de atendimento mais próxima. */
  cityId: string; greId: string; unidade: string; canal: Canal;
  abertoEm: string; eventos: Evento[]; motivoExigencia?: string;
}

/** O último status do protocolo até a data (inclusive), ou nulo antes da abertura. */
export function statusEm(p: Protocolo, data: string): Evento | null {
  let atual: Evento | null = null;
  for (const e of p.eventos) { if (e.desde > data) break; atual = e; }
  return atual;
}
export const situacaoEm = (p: Protocolo, data: string): Situacao | null => { const e = statusEm(p, data); return e ? situacaoDoStatus[e.status] : null; };
/** Data em que o protocolo fechou (deferido, indeferido, finalizado ou cancelado), se já fechou até a data. */
export function fechadoEm(p: Protocolo, data: string): string | null {
  const e = statusEm(p, data); return e && (situacaoDoStatus[e.status] === 'Fechado' || situacaoDoStatus[e.status] === 'Cancelado') ? e.desde : null;
}

/** Dias úteis em que o protocolo esteve com o Crea-SP, da abertura até a data (ou até fechar). */
export function tempoComCrea(p: Protocolo, data: string): number {
  let n = 0;
  p.eventos.forEach((e, i) => {
    if (e.desde > data || !COM_O_CREA.has(e.status)) return;
    const fim = p.eventos[i + 1]?.desde, ate = fim && fim < data ? fim : data;
    n += diasUteis(e.desde, ate);
  });
  return n;
}
/** Dias corridos em que o protocolo esteve com o solicitante (em exigência), até a data. */
export function tempoComSolicitante(p: Protocolo, data: string): number {
  let n = 0;
  p.eventos.forEach((e, i) => {
    if (e.desde > data || e.status !== 'Exigência') return;
    const fim = p.eventos[i + 1]?.desde, ate = fim && fim < data ? fim : data;
    n += Math.max(0, diasCorridos(e.desde, ate));
  });
  return n;
}

export type Prazo = 'Dentro do prazo' | 'Fora do prazo';
/**
 * Dentro ou fora do prazo na data. Aberto ou fechado: o tempo com o Crea-SP contra o prazo do serviço. Em exigência: os dias
 * corridos desde a exigência contra os 30 para responder. Sem pagamento ou cancelado: sem prazo (nulo).
 */
export function prazoEm(p: Protocolo, data: string): Prazo | null {
  const e = statusEm(p, data); if (!e) return null;
  const situacao = situacaoDoStatus[e.status];
  if (situacao === 'Sem pagamento' || situacao === 'Cancelado') return null;
  if (situacao === 'Exigência') return diasCorridos(e.desde, data) <= PRAZO_EXIGENCIA ? 'Dentro do prazo' : 'Fora do prazo';
  return tempoComCrea(p, data) <= p.prazo ? 'Dentro do prazo' : 'Fora do prazo';
}

/* ---------- O catálogo de serviços: o ponto único dos prazos e das taxas ---------- */
/**
 * Um serviço (subtipo) da Carta de Serviços: o tipo do painel antigo, o prazo em dias úteis, a taxa (demonstrativa, menos a da
 * regularização de ART, que é a da tela do CreaNet), a chance de exigência e de ir à câmara e quantos protocolos por mês o cenário
 * sorteia além dos que nascem do cadastro (registros, interrupções, cancelamentos, CAT).
 */
export interface Servico { subtipo: string; tipo: TipoServico; prazo: number; taxa: number; exigencia: number; camara: number; porMes: number; solicitante: Solicitante }
const servico = (tipo: TipoServico, subtipo: string, prazo: number, taxa: number, exigencia: number, porMes: number, solicitante: Solicitante = 'Profissional', camara = 0): Servico =>
  ({ tipo, subtipo, prazo, taxa, exigencia, camara, porMes, solicitante });
export const servicos: Servico[] = [
  servico('Registro de profissional', 'Registro com diploma', 15, 262, 0.3, 3),
  servico('Registro de profissional', 'Registro com atestado (provisório)', 15, 262, 0.35, 1),
  servico('Registro de profissional', 'Visto de profissional', 10, 130, 0.2, 3),
  servico('Registro de profissional', 'Conversão de registro provisório', 10, 0, 0.25, 2),
  servico('Registro de profissional', 'Reativação de registro', 10, 0, 0.15, 0),
  servico('Registro de profissional', 'Interrupção de registro', 10, 0, 0.1, 0),
  servico('Registro de profissional', 'Cancelamento de registro', 10, 0, 0.08, 0),
  servico('Registro de profissional', 'Segunda via da carteira', 10, 80, 0.05, 6),
  servico('Registro de empresa', 'Registro de empresa', 20, 360, 0.4, 0, 'Empresa', 0.12),
  servico('Registro de empresa', 'Visto de empresa', 10, 180, 0.25, 0, 'Empresa'),
  servico('Registro de empresa', 'Alteração de registro de empresa', 15, 120, 0.3, 10, 'Empresa'),
  servico('Registro de empresa', 'Interrupção de registro de empresa', 10, 0, 0.12, 0, 'Empresa'),
  servico('Registro de empresa', 'Reativação de registro de empresa', 10, 0, 0.15, 0, 'Empresa'),
  servico('Serviços de ART', 'Certidão de Acervo Técnico', 15, 120, 0.25, 0, 'Empresa'),
  servico('Serviços de ART', 'Regularização de ART', 20, 405.52, 0.35, 6, 'Profissional', 0.1),
  servico('Serviços de ART', 'Baixa de ART por terceiros', 10, 0, 0.2, 3),
  servico('Serviços de ART', 'Cancelamento de ART', 10, 0, 0.15, 8),
  servico('Certidões', 'Certidão de registro e quitação', 5, 0, 0.05, 14),
  servico('Anuidade e taxas', 'Reembolso de taxa', 20, 0, 0.2, 12),
  servico('Anuidade e taxas', 'Desconto de anuidade', 10, 0, 0.15, 9),
  servico('Orientação', 'Informação sobre atribuições', 5, 0, 0.02, 12),
  servico('Orientação', 'Orientação sobre ART', 5, 0, 0.02, 14),
  servico('Instituição de ensino', 'Cadastro de curso', 30, 0, 0.5, 0.6, 'Instituição de ensino', 0.6),
];
export const servicoDe = new Map(servicos.map(s => [s.subtipo, s]));
/** Motivos de exigência do cenário, por tipo de serviço (em produção, o texto da exigência no protocolo). */
export const motivosExigencia: Record<TipoServico, string[]> = {
  'Registro de profissional': ['Falta o diploma ou o certificado', 'Falta o histórico escolar', 'Documento ilegível', 'Comprovante de endereço vencido', 'Atribuição pedida incompatível com o curso'],
  'Registro de empresa': ['Contrato social desatualizado', 'Falta a ART de cargo e função do responsável técnico', 'Objeto social sem atividade de engenharia', 'Documento ilegível'],
  'Serviços de ART': ['Dados da ART diferentes do contrato', 'Falta o atestado do contratante', 'Falta o comprovante da obra concluída', 'Documento ilegível'],
  Certidões: ['Anuidade em aberto'], 'Anuidade e taxas': ['Falta o comprovante de pagamento', 'Dados bancários incompletos'],
  Orientação: ['Pergunta incompleta'], 'Instituição de ensino': ['Falta o projeto pedagógico do curso', 'Falta a matriz curricular'],
};

/* ---------- O cenário: protocolos de 36 meses ---------- */
export interface Colaborador { id: string; nome: string; cargo: string; greId: string | null }
export interface BaseAtendimento { protocolos: Protocolo[]; colaboradores: Map<string, Colaborador> }

const somaDias = (data: string, n: number) => dataDe(diaDe(data) + n);
type Trecho = { status: Status; dias: number; com: string | null };
/**
 * O caminho de um protocolo em trechos de dias corridos: pagamento (quando há taxa), espera pela distribuição, análise, exigência
 * (com resposta ou sem), câmara e o fecho. `carga` é a pressão da regional no mês e `ritmo` o do colaborador; `final` força o fecho
 * dos que nascem do cadastro (deferido no dia do registro).
 */
function trechos(key: string, s: Servico, quem: string, carga: number, ritmo: number, final?: Status, semDeferir = false): { trechos: Trecho[]; motivo?: string } {
  const out: Trecho[] = [];
  if (s.taxa > 0 && !final) {
    if (chance(`${key}:sp`) < 0.13) { out.push({ status: 'Aguardando pagamento', dias: between(`${key}:spd`, 45, 75), com: null }, { status: 'Cancelada', dias: 0, com: null }); return { trechos: out }; }
    out.push({ status: 'Aguardando pagamento', dias: between(`${key}:pg`, 0, 9), com: null });
  } else if (s.taxa > 0) out.push({ status: 'Aguardando pagamento', dias: between(`${key}:pg`, 0, 4), com: null });
  // Distribuição: quase sempre em poucos dias; uma parte fica esquecida sem atribuição.
  const esquecido = chance(`${key}:esq`) < 0.035;
  out.push({ status: 'Aguardando análise', dias: esquecido ? between(`${key}:esqd`, 20, 80) : Math.round(between(`${key}:es`, 0, 5) * carga), com: null });
  const analise = (sufixo: string, fator: number) => Math.max(1, Math.round(between(`${key}:${sufixo}`, 1, Math.ceil(s.prazo * fator)) * carga * ritmo));
  out.push({ status: 'Em análise', dias: analise('an', 1.05), com: quem });
  let motivo: string | undefined;
  if (chance(`${key}:ex`) < s.exigencia) {
    const motivos = motivosExigencia[s.tipo]; motivo = motivos[Math.floor(chance(`${key}:mo`) * motivos.length)];
    const resposta = Math.round(2 + 40 * Math.pow(chance(`${key}:rs`), 1.6));
    if (resposta > PRAZO_EXIGENCIA && !final && chance(`${key}:fs`) < 0.65) { out.push({ status: 'Exigência', dias: PRAZO_EXIGENCIA + between(`${key}:fsd`, 1, 10), com: quem }, { status: 'Finalizada sem resposta à exigência', dias: 0, com: quem }); return { trechos: out, motivo }; }
    out.push({ status: 'Exigência', dias: resposta, com: quem }, { status: 'Exigência atendida', dias: analise('an2', 0.4), com: quem });
  }
  if (chance(`${key}:cm`) < s.camara) out.push({ status: 'Enviada à câmara', dias: between(`${key}:cmd`, 7, 35), com: null });
  const fecho = final ?? (semDeferir ? weighted<Status>(`${key}:fim`, ['Indeferida', 'Cancelada', 'Finalizada com pendência'], [0.45, 0.4, 0.15])
    : weighted<Status>(`${key}:fim`, ['Deferida', 'Indeferida', 'Finalizada com pendência', 'Cancelada'], [0.88, 0.05, 0.03, 0.04]));
  out.push({ status: fecho, dias: 0, com: fecho === 'Cancelada' ? null : quem });
  return { trechos: out, motivo };
}
/** Os trechos viram eventos a partir da abertura; com `ate`, a duração é ajustada para o fecho cair nessa data. */
function eventosDe(abertoEm: string, lista: Trecho[], ate?: string): Evento[] {
  const total = lista.reduce((n, t) => n + t.dias, 0), alvo = ate ? Math.max(0, diasCorridos(abertoEm, ate)) : total;
  let decorrido = 0, desde = abertoEm; const out: Evento[] = [];
  for (const t of lista) {
    out.push({ status: t.status, desde, com: t.com });
    decorrido += t.dias; desde = somaDias(abertoEm, total ? Math.round(decorrido / total * alvo) : alvo);
  }
  return out;
}

const cacheBase = new WeakMap<Dataset, BaseAtendimento>();
/**
 * Os protocolos do cenário, do primeiro mês da base até a data de corte, com o caminho completo (a leitura numa data descarta o que
 * veio depois). Nascem do cadastro: o registro de cada profissional (deferido no dia do registro), as interrupções, as reativações e
 * os cancelamentos; o pedido de registro e o visto de cada empresa (abertos no dia do pedido e deferidos no início do registro), as
 * interrupções e reativações de empresa; e cada certidão de acervo técnico (CAT), emitida no dia da certidão. Os demais serviços são
 * sorteados todo mês entre os profissionais ativos e as empresas, com mais pedidos de registro depois das formaturas.
 *
 * Camada DEMONSTRATIVA: em produção, o protocolo do CreaNet (tipo, subtipo, status, datas e colaborador) e o quadro de pessoal.
 */
export function buildAtendimento(dataset: Dataset): BaseAtendimento {
  const saved = cacheBase.get(dataset); if (saved) return saved;
  const inicio = `${dataset.months[0]}-01`, corte = dataset.snapshotDate;
  const municipios = municipiosSp(dataset), municipioDe = new Map(municipios.map(m => [m.id, m])), distancia = distanciaUnidade(dataset);
  const profissionais = buildProfissionais(dataset).profissionais;
  const matriz = new Map<string, Establishment>(); for (const e of dataset.establishments) if (e.branch === 'Matriz' || !matriz.has(e.companyId)) matriz.set(e.companyId, e);
  // O quadro de atendimento: em cada regional, os servidores lotados nela; na capital, também os da sede.
  const quadro = servidores(buildConselho(dataset), dataset).filter(s => s.funcao === 'Atendimento');
  const colaboradores = new Map(quadro.map(s => [s.id, { id: s.id, nome: s.nome, cargo: s.cargo, greId: s.greId }]));
  const equipeDe = new Map<string, Servidor[]>();
  for (const gre of dataset.gres) { const proprios = quadro.filter(s => s.greId === gre.id), sede = quadro.filter(s => s.greId === null); equipeDe.set(gre.id, proprios.length ? (gre.id === 'GRE5' ? [...proprios, ...sede] : proprios) : sede); }
  const ritmoDe = (id: string) => 0.6 + chance(`ritmo:${id}`) * 1.1;
  // Pressão da regional: umas atendem mais devagar que outras, e o começo do ano pesa mais (renovação e formaturas).
  const cargaDe = (greId: string, data: string) => (0.75 + chance(`carga:${greId}`) * 0.7) * ([1, 2, 3].includes(Number(data.slice(5, 7))) ? 1.15 : 1);
  const protocolos: Protocolo[] = [];
  const novo = (key: string, subtipo: string, abertoEm: string, cityId: string, quem: { profissionalId?: string; companyId?: string; solicitante?: Solicitante }, fecho?: { em: string; status: Status } | { status?: Status; semDeferir?: boolean }) => {
    const s = servicoDe.get(subtipo)!, m = municipioDe.get(cityId) ?? municipios[0], equipe = equipeDe.get(m.greId) ?? [];
    const colaborador = equipe.length ? equipe[Math.floor(chance(`${key}:col`) * equipe.length)] : null;
    const forcado = fecho && 'status' in fecho ? fecho.status : undefined, em = fecho && 'em' in fecho ? fecho.em : undefined;
    const { trechos: lista, motivo } = trechos(key, s, colaborador?.id ?? '', cargaDe(m.greId, abertoEm), colaborador ? ritmoDe(colaborador.id) : 1, forcado, Boolean(fecho && 'semDeferir' in fecho && fecho.semDeferir));
    const km = distancia.get(m.id)?.km ?? 0, aDistancia = Math.min(0.5, (diaDe(abertoEm) - diaDe(inicio)) / 365 * 0.08);
    const presencial = Math.max(0.05, 0.42 - km * 0.0035 - aDistancia);
    protocolos.push({ id: key, numero: '', subtipo, tipo: s.tipo, prazo: s.prazo, taxa: s.taxa, solicitante: quem.solicitante ?? s.solicitante, ...(quem.profissionalId ? { profissionalId: quem.profissionalId } : {}), ...(quem.companyId ? { companyId: quem.companyId } : {}),
      cityId: m.id, greId: m.greId, unidade: distancia.get(m.id)?.unidade ?? '', canal: weighted<Canal>(`${key}:canal`, canaisAtendimento, [presencial, 0.18, 0.7 - presencial, 0.12]),
      abertoEm, eventos: eventosDe(abertoEm, lista, em), ...(motivo ? { motivoExigencia: motivo } : {}) });
  };
  const antesDe = (key: string, data: string, s: Servico) => somaDias(data, -between(key, 5, Math.round(s.prazo * 2.2)));
  /** A abertura pode cair antes do primeiro mês da base: o protocolo existe, só o período de leitura começa depois. */
  const naJanela = (data?: string) => Boolean(data && data >= inicio && data <= corte);

  // Do cadastro de profissionais.
  for (const p of profissionais) {
    if (naJanela(p.registroEm)) { const sub = chance(`reg:${p.id}`) < 0.75 ? 'Registro com diploma' : 'Registro com atestado (provisório)', key = `PRT-REG-${p.id}`;
      // O caminho é sorteado antes, para a abertura cair antes do registro na medida certa.
      const ab = antesDe(`${key}:ab`, p.registroEm, servicoDe.get(sub)!); novo(key, sub, ab, p.cityId, { profissionalId: p.id }, { em: p.registroEm, status: 'Deferida' }); }
    for (const [i, it] of p.interrupcoes.entries()) {
      if (naJanela(it.inicio)) { const key = `PRT-INT-${p.id}-${i}`, ab = antesDe(`${key}:ab`, it.inicio, servicoDe.get('Interrupção de registro')!); novo(key, 'Interrupção de registro', ab, p.cityId, { profissionalId: p.id }, { em: it.inicio, status: 'Deferida' }); }
      if (naJanela(it.fim)) { const key = `PRT-REA-${p.id}-${i}`, ab = antesDe(`${key}:ab`, it.fim!, servicoDe.get('Reativação de registro')!); novo(key, 'Reativação de registro', ab, p.cityId, { profissionalId: p.id }, { em: it.fim!, status: 'Deferida' }); }
    }
    if (naJanela(p.canceladoEm)) { const key = `PRT-CAN-${p.id}`, ab = antesDe(`${key}:ab`, p.canceladoEm!, servicoDe.get('Cancelamento de registro')!); novo(key, 'Cancelamento de registro', ab, p.cityId, { profissionalId: p.id }, { em: p.canceladoEm!, status: 'Deferida' }); }
  }
  // Do cadastro de empresas: pedidos de registro e visto, interrupções e reativações, e as certidões de acervo técnico.
  for (const r of dataset.registrations) if (naJanela(r.requestedAt)) {
    const e = dataset.establishments.find(row => row.id === r.establishmentId) ?? matriz.get(r.companyId);
    novo(`PRT-EMP-${r.id}`, r.type === 'Visto' ? 'Visto de empresa' : 'Registro de empresa', r.requestedAt, e?.cityId ?? municipios[0].id, { companyId: r.companyId }, { em: r.startedAt, status: 'Deferida' });
  }
  for (const mv of dataset.movements) if (naJanela(mv.date) && (mv.type === 'Baixa' || mv.type === 'Reativação')) {
    const sub = mv.type === 'Baixa' ? 'Interrupção de registro de empresa' : 'Reativação de registro de empresa', key = `PRT-MOV-${mv.id}`, ab = antesDe(`${key}:ab`, mv.date, servicoDe.get(sub)!);
    novo(key, sub, ab, (dataset.establishments.find(row => row.id === mv.establishmentId) ?? matriz.get(mv.companyId))?.cityId ?? municipios[0].id, { companyId: mv.companyId }, { em: mv.date, status: 'Deferida' });
  }
  for (const c of dataset.caos) if (naJanela(c.requestedAt)) {
    const emitida = c.issuedAt && c.issuedAt <= corte ? c.issuedAt : null;
    novo(`PRT-CAT-${c.id}`, 'Certidão de Acervo Técnico', c.requestedAt, matriz.get(c.companyId)?.cityId ?? municipios[0].id, { companyId: c.companyId },
      emitida ? { em: emitida, status: 'Deferida' } : c.status === 'Revogada' ? { status: 'Indeferida' } : { em: somaDias(corte, between(`cat:${c.id}`, 5, 40)), status: 'Deferida' });
  }
  // Os que nascem do cadastro só aparecem quando o cadastro muda (o registro, a interrupção), e isso ainda não aconteceu para quem
  // pediu nas últimas semanas. Cada um desses serviços ganha, nos 60 dias antes do corte, os protocolos que faltam para o ritmo dos
  // 12 meses anteriores, todos em andamento na data de corte (fecham depois dela).
  const empresas = [...matriz.values()], sorteiaCidade = sorteioPorPopulacao(municipios), janelaFinal = somaDias(corte, -60);
  const doCadastro = new Map<string, Protocolo[]>(); for (const p of protocolos) doCadastro.set(p.subtipo, [...(doCadastro.get(p.subtipo) ?? []), p]);
  for (const [subtipo, lista] of doCadastro) {
    const s = servicoDe.get(subtipo)!, ritmo = lista.filter(p => p.abertoEm > somaDias(janelaFinal, -365) && p.abertoEm <= janelaFinal).length / 365;
    for (let fatia = 0; fatia < 4; fatia++) {
      const de = somaDias(janelaFinal, fatia * 15), ate = somaDias(de, 15), falta = Math.round(ritmo * 15 - lista.filter(p => p.abertoEm > de && p.abertoEm <= ate).length);
      for (let i = 0; i < falta; i++) {
        const key = `PRT-AND-${subtipo}-${fatia}-${i}`, abertoEm = somaDias(de, between(`${key}:d`, 1, 15)), fecho = { em: somaDias(corte, between(`${key}:f`, 3, s.prazo * 2)), status: 'Deferida' as Status };
        if (s.solicitante === 'Empresa') { const e = empresas[Math.floor(chance(`${key}:e`) * empresas.length)]; novo(key, subtipo, abertoEm, e.cityId, { companyId: e.companyId }, fecho); }
        else if (subtipo.startsWith('Registro com')) novo(key, subtipo, abertoEm, sorteiaCidade(`${key}:m`).id, {}, fecho);
        else { const ativos = profissionais.filter(p => p.registroEm <= abertoEm && !p.canceladoEm), p = ativos[Math.floor(chance(`${key}:p`) * ativos.length)]; if (p) novo(key, subtipo, abertoEm, p.cityId, { profissionalId: p.id }, fecho); }
      }
    }
  }
  // Os demais serviços, sorteados todo mês: profissionais ativos, empresas registradas e pedidos de registro que não viraram registro.
  for (const mes of dataset.months) {
    const ativos = profissionais.filter(p => p.registroEm <= `${mes}-28` && (!p.canceladoEm || p.canceladoEm > `${mes}-01`));
    const formatura = [1, 2, 3, 7, 8].includes(Number(mes.slice(5, 7))) ? 1.6 : 1;
    for (const s of servicos) {
      const n = Math.round(s.porMes * (0.75 + chance(`n:${mes}:${s.subtipo}`) * 0.5) * (s.tipo === 'Registro de profissional' ? formatura : 1) + (chance(`n2:${mes}:${s.subtipo}`) < s.porMes % 1 ? 1 : 0) - s.porMes % 1);
      for (let i = 0; i < n; i++) {
        const key = `PRT-${mes}-${s.subtipo}-${i}`, abertoEm = `${mes}-${String(between(`${key}:d`, 1, 28)).padStart(2, '0')}`; if (abertoEm > corte) continue;
        if (s.subtipo.startsWith('Registro com')) { novo(key, s.subtipo, abertoEm, sorteiaCidade(`${key}:m`).id, {}, { semDeferir: true }); continue; }
        if (s.solicitante === 'Empresa') { const e = empresas[Math.floor(chance(`${key}:e`) * empresas.length)]; novo(key, s.subtipo, abertoEm, e.cityId, { companyId: e.companyId }); continue; }
        if (s.solicitante === 'Instituição de ensino') { novo(key, s.subtipo, abertoEm, sorteiaCidade(`${key}:m`).id, {}); continue; }
        const p = ativos[Math.floor(chance(`${key}:p`) * ativos.length)]; if (p) novo(key, s.subtipo, abertoEm, p.cityId, { profissionalId: p.id });
      }
    }
  }
  // Piso de dois protocolos por município nos 36 meses (regra dos cenários desde 04/11/2026): orientações de quem mora lá.
  const porCidade = new Map<string, number>(); for (const p of protocolos) porCidade.set(p.cityId, (porCidade.get(p.cityId) ?? 0) + 1);
  for (const m of municipios) for (let i = porCidade.get(m.id) ?? 0; i < 2; i++) {
    const key = `PRT-PISO-${m.id}-${i}`, mes = dataset.months[Math.floor(chance(`${key}:mes`) * (dataset.months.length - 1))];
    const daqui = profissionais.find(p => p.cityId === m.id);
    novo(key, i ? 'Orientação sobre ART' : 'Informação sobre atribuições', `${mes}-${String(between(`${key}:d`, 1, 28)).padStart(2, '0')}`, m.id, daqui ? { profissionalId: daqui.id } : {});
  }
  // Número do protocolo: ano e sequência pela data de abertura, como no CreaNet.
  protocolos.sort((a, b) => a.abertoEm.localeCompare(b.abertoEm) || a.id.localeCompare(b.id));
  const seq = new Map<string, number>();
  for (const p of protocolos) { const ano = p.abertoEm.slice(0, 4), n = (seq.get(ano) ?? 0) + 1; seq.set(ano, n); p.numero = `${ano}/${String(n).padStart(6, '0')}`; }
  const value = { protocolos, colaboradores }; cacheBase.set(dataset, value); return value;
}
function sorteioPorPopulacao(lista: Municipio[]) {
  const pesos = lista.map(row => Math.pow(Math.max(5000, row.populacao), 0.9)), total = pesos.reduce((a, b) => a + b, 0), acumulado: number[] = [];
  let soma = 0; for (const peso of pesos) { soma += peso / total; acumulado.push(soma); }
  return (key: string) => { const u = chance(key); let lo = 0, hi = acumulado.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (acumulado[mid] < u) lo = mid + 1; else hi = mid; } return lista[lo]; };
}

/* ---------- A leitura numa data, no período e no recorte ---------- */
export interface RecorteAtendimento { greId: string | null; cityId: string | null; tipo: TipoServico | null; unidade: string | null }
/** Um protocolo lido na data: o status e a situação, o prazo, com quem está, os dias úteis com o Crea-SP e a data em que fechou. */
export interface Linha { p: Protocolo; status: Status; situacao: Situacao; prazo: Prazo | null; com: string | null; diasCrea: number; diasSolicitante: number; fechadoEm: string | null }
export type Partes = Record<Situacao, Linha[]>;
const partesVazias = (): Partes => ({ Aberto: [], 'Exigência': [], 'Sem pagamento': [], Cancelado: [], Fechado: [] });
const repartir = (linhas: Linha[]) => { const out = partesVazias(); for (const l of linhas) out[l.situacao].push(l); return out; };
export const mediana = (values: number[]) => { if (!values.length) return null; const s = [...values].sort((a, b) => a - b), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
/** Fechados dentro do prazo, entre os fechados (o cancelado não entra). */
const noPrazoDe = (linhas: Linha[]) => { const fechados = linhas.filter(l => l.situacao === 'Fechado'); return fechados.length ? fechados.filter(l => l.prazo === 'Dentro do prazo').length / fechados.length * 100 : null; };
const medianaDe = (linhas: Linha[]) => mediana(linhas.filter(l => l.situacao === 'Fechado').map(l => l.diasCrea));
/** Abertos e em exigência: o que ainda depende de alguém. */
const pendente = (l: Linha) => l.situacao === 'Aberto' || l.situacao === 'Exigência';

export function ler(p: Protocolo, data: string): Linha | null {
  const e = statusEm(p, data); if (!e) return null;
  return { p, status: e.status, situacao: situacaoDoStatus[e.status], prazo: prazoEm(p, data), com: e.com, diasCrea: tempoComCrea(p, data), diasSolicitante: tempoComSolicitante(p, data), fechadoEm: fechadoEm(p, data) };
}
const mesesAte = (fim: string, n: number) => Array.from({ length: n }, (_, i) => { const d = new Date(`${fim.slice(0, 7)}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() - (n - 1 - i)); return d.toISOString().slice(0, 7); });
const umAnoAntes = (mes: string) => `${Number(mes.slice(0, 4)) - 1}${mes.slice(4)}`;
export const faixasEspera = ['até 2 dias úteis', '3 a 5', '6 a 10', '11 a 20', 'mais de 20'];
export const faixaEspera = (dias: number) => dias <= 2 ? 0 : dias <= 5 ? 1 : dias <= 10 ? 2 : dias <= 20 ? 3 : 4;

export interface LinhaColaborador { id: string; nome: string; cargo: string; greId: string | null; linhas: Linha[]; partes: Partes; fila: Linha[]; filaFora: Linha[]; fechados: number; mediana: number | null; noPrazo: number | null }
export interface QuadroAtendimento {
  inicio: string; anchor: string;
  /** Protocolos abertos no período, lidos na data; e os do mesmo período um ano antes, lidos no fim dele. */
  linhas: Linha[]; antes: Linha[]; porSituacao: Partes; antesPorSituacao: Partes;
  noPrazo: number | null; noPrazoAntes: number | null; mediana: number | null; medianaAntes: number | null;
  /** Cada status do caminho, com os protocolos dentro e fora do prazo (e os sem prazo: sem pagamento e cancelados). */
  porStatus: { status: Status; dentro: Linha[]; fora: Linha[]; sem: Linha[] }[];
  /** Os meses do gráfico (12, ou o período quando passa de 12, até 24), com o mesmo mês um ano antes lido na mesma data. */
  mensal: { mes: string; partes: Partes; total: number; antes: number; mediana: number | null; noPrazo: number | null; linhas: Linha[] }[];
  porTipo: { tipo: TipoServico; partes: Partes; total: number }[];
  porSubtipo: { servico: Servico; partes: Partes; total: number; dias: number[]; noPrazo: number | null; mediana: number | null; comSolicitante: number | null; exigencias: number; linhas: Linha[] }[];
  porGre: { greId: string; partes: Partes; total: number; noPrazo: number | null; linhas: Linha[] }[];
  colaboradores: LinhaColaborador[];
  /** Abertos e sem pagamento sem colaborador atribuído, na data, e a espera de cada um. */
  semAtribuicao: Linha[]; esperaSemAtribuicao: Linha[][];
  motivos: { motivo: string; tipo: TipoServico; linhas: Linha[] }[];
  /** Sem pagamento na data: o valor das taxas paradas. */
  valorSemPagamento: number;
  porUnidade: { unidade: string; linhas: Linha[]; noPrazo: number | null; mediana: number | null }[];
  porCanal: Record<Canal, Linha[]>; canalMensal: { mes: string; porCanal: Record<Canal, number> }[];
  /** Fechados no prazo por regional e trimestre de abertura (o calor da página Equipe); um mês tem poucos fechados por regional. */
  trimestres: string[]; calor: { greId: string; trimestres: { chave: string; fechados: number; noPrazo: number | null }[] }[];
  porMunicipio: Map<string, Linha[]>;
}

/**
 * A leitura das cinco páginas: os protocolos abertos no período (o painel antigo filtra pela data de abertura), cada um com a
 * situação na data escolhida. O recorte (regional, município, tipo de serviço e unidade) vale para todas as linhas.
 */
export function quadroAtendimento(base: BaseAtendimento, { anchor, period, recorte }: { anchor: string; period: number; recorte: RecorteAtendimento }): QuadroAtendimento {
  const mesesDoPeriodo = mesesAte(anchor, period), inicio = `${mesesDoPeriodo[0]}-01`, fimAntes = umAnoAntesDe(anchor), inicioAntes = `${umAnoAntes(mesesDoPeriodo[0])}-01`;
  const doRecorte = base.protocolos.filter(p => (!recorte.greId || p.greId === recorte.greId) && (!recorte.cityId || p.cityId === recorte.cityId) && (!recorte.tipo || p.tipo === recorte.tipo) && (!recorte.unidade || p.unidade === recorte.unidade));
  const entre = (de: string, ate: string, data: string) => doRecorte.filter(p => p.abertoEm >= de && p.abertoEm <= ate).map(p => ler(p, data)!).filter(Boolean);
  const linhas = entre(inicio, anchor, anchor), antes = entre(inicioAntes, fimAntes, fimAntes);
  const porSituacao = repartir(linhas);
  const porStatus = statusProtocolo.map(status => { const rows = linhas.filter(l => l.status === status); return { status, dentro: rows.filter(l => l.prazo === 'Dentro do prazo'), fora: rows.filter(l => l.prazo === 'Fora do prazo'), sem: rows.filter(l => l.prazo === null) }; });
  // O gráfico mês a mês: 12 meses, ou o período quando passa disso (até 24); o ano anterior lido na mesma data.
  const mesesGrafico = mesesAte(anchor, Math.min(24, Math.max(12, period))), inicioGrafico = `${mesesGrafico[0]}-01`;
  const doGrafico = inicioGrafico < inicio ? entre(inicioGrafico, anchor, anchor) : linhas;
  const anoAntes = entre(`${umAnoAntes(mesesGrafico[0])}-01`, umAnoAntesDe(anchor), anchor);
  const mensal = mesesGrafico.map(mes => { const rows = doGrafico.filter(l => l.p.abertoEm.startsWith(mes)), partes = repartir(rows);
    return { mes, partes, total: rows.length, antes: anoAntes.filter(l => l.p.abertoEm.startsWith(umAnoAntes(mes))).length, mediana: medianaDe(rows), noPrazo: noPrazoDe(rows), linhas: rows }; });
  const porTipo = tiposServico.map(tipo => { const rows = linhas.filter(l => l.p.tipo === tipo); return { tipo, partes: repartir(rows), total: rows.length }; });
  const porSubtipo = servicos.map(servico => { const rows = linhas.filter(l => l.p.subtipo === servico.subtipo), fechados = rows.filter(l => l.situacao === 'Fechado'), exig = rows.filter(l => l.p.motivoExigencia && l.diasSolicitante > 0);
    return { servico, partes: repartir(rows), total: rows.length, dias: fechados.map(l => l.diasCrea), noPrazo: noPrazoDe(rows), mediana: medianaDe(rows), comSolicitante: exig.length ? exig.reduce((n, l) => n + l.diasSolicitante, 0) / exig.length : null, exigencias: exig.length, linhas: rows }; });
  const gres = [...new Set(base.protocolos.map(p => p.greId))].sort((a, b) => Number(a.slice(3)) - Number(b.slice(3)));
  const porGre = gres.map(greId => { const rows = linhas.filter(l => l.p.greId === greId); return { greId, partes: repartir(rows), total: rows.length, noPrazo: noPrazoDe(rows), linhas: rows }; });
  // Colaboradores: quem está com o protocolo no último status lido (o painel antigo conta pelo colaborador atribuído).
  const porPessoa = new Map<string, Linha[]>(); for (const l of linhas) if (l.com) porPessoa.set(l.com, [...(porPessoa.get(l.com) ?? []), l]);
  const colaboradores = [...porPessoa].map(([id, rows]) => { const c = base.colaboradores.get(id), fila = rows.filter(pendente);
    return { id, nome: c?.nome ?? id, cargo: c?.cargo ?? '', greId: c?.greId ?? null, linhas: rows, partes: repartir(rows), fila, filaFora: fila.filter(l => l.prazo === 'Fora do prazo'), fechados: rows.filter(l => l.situacao === 'Fechado').length, mediana: medianaDe(rows), noPrazo: noPrazoDe(rows) }; })
    .sort((a, b) => b.linhas.length - a.linhas.length || a.nome.localeCompare(b.nome));
  const semAtribuicao = linhas.filter(l => !l.com && (l.situacao === 'Aberto' || l.situacao === 'Sem pagamento'));
  const esperaSemAtribuicao = faixasEspera.map(() => [] as Linha[]);
  for (const l of semAtribuicao) esperaSemAtribuicao[faixaEspera(diasUteis(statusEm(l.p, anchor)!.desde, anchor))].push(l);
  const motivosMap = new Map<string, { motivo: string; tipo: TipoServico; linhas: Linha[] }>();
  for (const l of linhas) if (l.p.motivoExigencia && l.p.eventos.some(e => e.status === 'Exigência' && e.desde <= anchor)) { const key = `${l.p.tipo}|${l.p.motivoExigencia}`, item = motivosMap.get(key) ?? { motivo: l.p.motivoExigencia, tipo: l.p.tipo, linhas: [] }; item.linhas.push(l); motivosMap.set(key, item); }
  const unidades = [...new Set(linhas.map(l => l.p.unidade))];
  const porUnidade = unidades.map(unidade => { const rows = linhas.filter(l => l.p.unidade === unidade); return { unidade, linhas: rows, noPrazo: noPrazoDe(rows), mediana: medianaDe(rows) }; }).sort((a, b) => b.linhas.length - a.linhas.length);
  const porCanal = Object.fromEntries(canaisAtendimento.map(c => [c, linhas.filter(l => l.p.canal === c)])) as Record<Canal, Linha[]>;
  const canalMensal = mensal.map(m => ({ mes: m.mes, porCanal: Object.fromEntries(canaisAtendimento.map(c => [c, m.linhas.filter(l => l.p.canal === c).length])) as Record<Canal, number> }));
  const trimestreDe = (mes: string) => `${mes.slice(0, 4)}-T${Math.ceil(Number(mes.slice(5, 7)) / 3)}`, trimestres = [...new Set(mesesGrafico.map(trimestreDe))];
  const calor = porGre.map(g => ({ greId: g.greId, trimestres: trimestres.map(chave => { const rows = doGrafico.filter(l => l.p.greId === g.greId && trimestreDe(l.p.abertoEm.slice(0, 7)) === chave);
    return { chave, fechados: rows.filter(l => l.situacao === 'Fechado').length, noPrazo: noPrazoDe(rows) }; }) }));
  const porMunicipio = new Map<string, Linha[]>(); for (const l of linhas) porMunicipio.set(l.p.cityId, [...(porMunicipio.get(l.p.cityId) ?? []), l]);
  return { inicio, anchor, linhas, antes, porSituacao, antesPorSituacao: repartir(antes), noPrazo: noPrazoDe(linhas), noPrazoAntes: noPrazoDe(antes), mediana: medianaDe(linhas), medianaAntes: medianaDe(antes),
    porStatus, mensal, porTipo, porSubtipo, porGre, colaboradores, semAtribuicao, esperaSemAtribuicao, motivos: [...motivosMap.values()].sort((a, b) => b.linhas.length - a.linhas.length),
    valorSemPagamento: porSituacao['Sem pagamento'].reduce((n, l) => n + l.p.taxa, 0), porUnidade, porCanal, canalMensal, trimestres, calor, porMunicipio };
}
/** A mesma data um ano antes; no fim do mês, o fim do mesmo mês (29 de fevereiro vira 28). */
function umAnoAntesDe(anchor: string) {
  const ano = Number(anchor.slice(0, 4)), mes = Number(anchor.slice(5, 7)), fimDoMes = (a: number) => new Date(Date.UTC(a, mes, 0)).toISOString().slice(0, 10);
  return anchor === fimDoMes(ano) ? fimDoMes(ano - 1) : `${ano - 1}${anchor.slice(4)}`;
}

/** Um mês da série dos cartões: abertos no mês, em andamento (abertos e em exigência) no último dia, e os fechados no mês. */
export interface MesAtendimento { mes: string; abertos: number; emAndamento: number; fechados: number; noPrazo: number | null; mediana: number | null }
/**
 * A série mês a mês dos cartões (24 meses até a data): o que abriu no mês é fluxo; o que estava em andamento no último dia do mês
 * (ou na data, no mês dela) é estoque; e os fechados no mês dão a parte no prazo e a mediana de dias úteis com o Crea-SP.
 */
export function serieMensal(base: BaseAtendimento, { anchor, recorte }: { anchor: string; recorte: RecorteAtendimento }): MesAtendimento[] {
  const doRecorte = base.protocolos.filter(p => (!recorte.greId || p.greId === recorte.greId) && (!recorte.cityId || p.cityId === recorte.cityId) && (!recorte.tipo || p.tipo === recorte.tipo) && (!recorte.unidade || p.unidade === recorte.unidade) && p.abertoEm <= anchor);
  return mesesAte(anchor, 24).map(mes => {
    const fim = mes === anchor.slice(0, 7) ? anchor : new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)).toISOString().slice(0, 10);
    // Só o status na data (barato); a leitura completa, com o prazo e os dias úteis, fica para os que fecharam no mês.
    let abertos = 0, emAndamento = 0; const fechadas: Linha[] = [];
    for (const p of doRecorte) { if (p.abertoEm > fim) continue; if (p.abertoEm.startsWith(mes)) abertos++;
      const e = statusEm(p, fim)!, situacao = situacaoDoStatus[e.status];
      if (situacao === 'Aberto' || situacao === 'Exigência') emAndamento++; else if (situacao === 'Fechado' && e.desde.startsWith(mes)) fechadas.push(ler(p, fim)!); }
    return { mes, abertos, emAndamento, fechados: fechadas.length, noPrazo: noPrazoDe(fechadas), mediana: medianaDe(fechadas) };
  });
}

/* ---------- Demanda: o que vem de fora e o que se espera ---------- */
export interface QuadroDemandaAtendimento {
  /** Aberturas de estabelecimentos com atividade de engenharia na Receita Federal e pedidos de registro de empresa, mês a mês. */
  aberturas: { mes: string; aberturas: number | null; pedidos: number }[];
  /** Das aberturas de 6 a 18 meses antes da data, quantas pediram registro no Crea-SP em até 180 dias. */
  conversaoAberturas: { aberturas: number; pediram: number; semPedido: string[] };
  /** Pedidos de registro de profissional mês a mês e os concluintes (INEP) de cada ano. */
  registros: { mes: string; pedidos: number }[]; formatura: { ano: number; concluintes: number; registrados: number };
  /** Os meses do gráfico e os três seguintes, previstos pelo mesmo mês do ano anterior corrigido pela tendência dos 12 meses. */
  previsao: { mes: string; total: number | null; previsto: number | null }[]; proximos: number; porColaborador: number | null;
  /** Protocolos de ART (baixa por terceiros, cancelamento e regularização) por 1.000 ARTs registradas, mês a mês. */
  art: { mes: string; protocolos: number; arts: number; porMil: number | null }[];
  /** Pedidos de acesso à informação (LAI) e manifestações da ouvidoria por ano (Portal da Transparência, Implanta). */
  lai: { ano: number; pedidos: number; noPrazo: number; recursos: number; ouvidoria: Record<TipoOuvidoria, number> }[];
}
export type TipoOuvidoria = 'Reclamação' | 'Solicitação' | 'Denúncia' | 'Sugestão' | 'Elogio';
export const tiposOuvidoria: TipoOuvidoria[] = ['Reclamação', 'Solicitação', 'Denúncia', 'Sugestão', 'Elogio'];
/** Os serviços de ART que o painel conta contra as ARTs registradas: baixa por terceiros, cancelamento e regularização. */
export const SERVICOS_ART = new Set(['Baixa de ART por terceiros', 'Cancelamento de ART', 'Regularização de ART']);

export function demandaAtendimento(dataset: Dataset, base: BaseAtendimento, { anchor, recorte, colaboradores }: { anchor: string; recorte: RecorteAtendimento; colaboradores: number }): QuadroDemandaAtendimento {
  const municipioDe = new Map(municipiosSp(dataset).map(m => [m.id, m])), noLugar = (cityId: string) => (!recorte.cityId || cityId === recorte.cityId) && (!recorte.greId || municipioDe.get(cityId)?.greId === recorte.greId);
  const meses = mesesAte(anchor, 24), ate = (data: string) => data <= anchor, protocolos = base.protocolos.filter(p => noLugar(p.cityId) && ate(p.abertoEm));
  const doMes = (mes: string, filtro: (p: Protocolo) => boolean) => protocolos.filter(p => p.abertoEm.startsWith(mes) && filtro(p)).length;
  const pedidoEmpresa = (p: Protocolo) => p.subtipo === 'Registro de empresa';
  const engenharia = dataset.establishments.filter(e => noLugar(e.cityId) && ate(e.openedAt) && classeDoEstabelecimento(dataset, e) !== null);
  // A Receita publica o cadastro com atraso: o mês depois do último arquivo fica vazio (nulo), e não zero.
  const ultimoArquivo = dataset.establishments.reduce((m, e) => e.openedAt > m && e.openedAt <= anchor ? e.openedAt : m, '').slice(0, 7);
  const aberturas = meses.map(mes => ({ mes, aberturas: mes > ultimoArquivo ? null : engenharia.filter(e => e.openedAt.startsWith(mes)).length, pedidos: doMes(mes, pedidoEmpresa) }));
  const pedidosPor = new Map<string, string[]>(); for (const p of base.protocolos) if (pedidoEmpresa(p) && p.companyId && ate(p.abertoEm)) pedidosPor.set(p.companyId, [...(pedidosPor.get(p.companyId) ?? []), p.abertoEm]);
  const coorte = engenharia.filter(e => e.openedAt >= `${mesesAte(anchor, 18)[0]}-01` && e.openedAt < `${mesesAte(anchor, 6)[0]}-01`);
  const pediu = (e: Establishment) => (pedidosPor.get(e.companyId) ?? []).some(d => d >= somaDias(e.openedAt, -30) && d <= somaDias(e.openedAt, 180));
  // Formatura: os concluintes do ano anterior ao da data (INEP) e quantos deles já têm registro no Crea-SP.
  // O lugar é o da instituição de ensino, dos dois lados: o Censo conta por instituição, e o registro guarda a instituição declarada.
  const formacao = buildFormacao(dataset), escolas = new Set(formacao.ies.filter(i => noLugar(i.cityId)).map(i => i.id)), ano = Number(anchor.slice(0, 4)) - 1;
  const concluintes = formacao.concluintes.filter(c => c.ano === ano && escolas.has(c.iesId)).reduce((n, c) => n + c.concluintes, 0);
  const registrados = buildProfissionais(dataset).profissionais.filter(p => p.anoConclusao === ano && p.registroEm <= anchor && escolas.has(p.iesId)).length;
  // Previsão: o mesmo mês um ano antes vezes a tendência (últimos 12 meses contra os 12 anteriores).
  const total = (mes: string) => doMes(mes, () => true), ultimos = mesesAte(anchor, 12).reduce((n, m) => n + total(m), 0), anteriores = mesesAte(umAnoAntesDe(anchor), 12).reduce((n, m) => n + total(m), 0);
  const tendencia = anteriores ? ultimos / anteriores : 1, seguintes = [1, 2, 3].map(i => { const d = new Date(`${anchor.slice(0, 7)}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + i); return d.toISOString().slice(0, 7); });
  // O mês da data ainda não acabou quando a data não é o último dia: a previsão começa nele.
  const previsao = [...meses.map(mes => ({ mes, total: total(mes), previsto: null as number | null })), ...seguintes.map(mes => ({ mes, total: null, previsto: Math.round(total(umAnoAntes(mes)) * tendencia) }))];
  const proximos = seguintes.reduce((n, mes) => n + Math.round(total(umAnoAntes(mes)) * tendencia), 0);
  const fechadosAno = protocolos.filter(p => { const f = fechadoEm(p, anchor); return f && f >= `${mesesAte(anchor, 12)[0]}-01`; }).length;
  const porColaborador = colaboradores ? fechadosAno / 12 / colaboradores : null;
  const matriz = new Map<string, string>(); for (const e of dataset.establishments) if (e.branch === 'Matriz' || !matriz.has(e.companyId)) matriz.set(e.companyId, e.cityId);
  const arts = dataset.arts.filter(a => ate(a.date) && noLugar(matriz.get(a.companyId) ?? ''));
  const art = meses.map(mes => { const n = doMes(mes, p => SERVICOS_ART.has(p.subtipo)), registradas = arts.filter(a => a.date.startsWith(mes)).length; return { mes, protocolos: n, arts: registradas, porMil: registradas ? n / registradas * 1000 : null }; });
  return { aberturas, conversaoAberturas: { aberturas: coorte.length, pediram: coorte.filter(pediu).length, semPedido: coorte.filter(e => !pediu(e)).map(e => e.id) },
    registros: meses.map(mes => ({ mes, pedidos: doMes(mes, p => p.subtipo.startsWith('Registro com')) })), formatura: { ano, concluintes, registrados },
    previsao, proximos, porColaborador, art, lai: pedidosDeInformacao(anchor) };
}
/** LAI e ouvidoria (demonstrativo): o Crea-SP inteiro, sem regional, nos cinco anos até o da data; o ano da data vai até ela. */
export function pedidosDeInformacao(anchor: string): QuadroDemandaAtendimento['lai'] {
  const anoFinal = Number(anchor.slice(0, 4)), fracao = (Number(anchor.slice(5, 7)) - 1 + Number(anchor.slice(8, 10)) / 31) / 12;
  return [anoFinal - 4, anoFinal - 3, anoFinal - 2, anoFinal - 1, anoFinal].map(a => { const parte = a === anoFinal ? fracao : 1, pedidos = Math.round((380 + 60 * (a - 2022) + between(`lai:${a}`, -40, 40)) * parte);
    return { ano: a, pedidos, noPrazo: Math.round(pedidos * (0.82 + chance(`lai:p:${a}`) * 0.14)), recursos: Math.round(pedidos * (0.04 + chance(`lai:r:${a}`) * 0.05)),
      ouvidoria: Object.fromEntries(tiposOuvidoria.map((t, i) => [t, Math.round([520, 310, 140, 60, 45][i] * (0.85 + chance(`ouv:${a}:${t}`) * 0.3) * parte)])) as Record<TipoOuvidoria, number> }; });
}
