import type { Scope } from './engine';
import type { Invoice, Registration } from './types';
import type { EnterpriseModel } from '../enterprise-v10/types';
import type { Cobertura } from '../observatorio/norte';
import { share } from './hash';
import { mainEstablishments } from '../gestao-v14/metrics';

/**
 * Séries mês a mês dos cartões do painel de Empresas que ainda não tinham evolução (05/11/2026, pedido do Caio: "registradas,
 * inadimplência etc."). Os meses são os do modelo histórico (`history.monthly`), que já traz quem estava registrada no fim de cada
 * mês; o resto é lido na base do recorte, no último dia de cada mês, pelas mesmas regras dos cartões. O último valor de cada série é
 * o valor do cartão (ver tests/evolucao.test.ts).
 *
 * Fluxos (ARTs, valor em ART): o que aconteceu no mês. Estoques (sem registro, RT que saiu) e taxas (parte registrada, anuidade em
 * dia, com RT, sem ART, permanência): a situação no último dia do mês. A Receita só tem a fotografia de hoje: a parte registrada e
 * os sem registro usam os estabelecimentos de hoje, contados a partir do mês em que abriram.
 */
export interface SeriesEmpresas {
  meses: string[];
  /** Parte dos estabelecimentos ativos na Receita com atividade da lista que tinha registro ou visto vigente no fim do mês (%). */
  cobertura: (number | null)[];
  /** Estabelecimentos de atividade obrigatória, já abertos, que nunca tinham aparecido no cadastro até o fim do mês. */
  semRegistro: number[];
  /** Parte das registradas sem anuidade vencida no fim do mês (%) e quantas estavam com anuidade vencida. */
  adimplencia: (number | null)[]; inadimplentes: number[];
  /** Parte das registradas com responsável técnico de vínculo vigente no fim do mês (%). */
  comRt: (number | null)[];
  /** Registradas cujo último responsável técnico saiu há mais de 30 dias, sem outro no lugar, no fim do mês. */
  rtBaixado: number[];
  /** ARTs de empresas do recorte registradas no mês e o valor de contrato declarado nelas. */
  arts: number[]; valorArt: number[];
  /** Parte das registradas no fim do mês sem nenhuma ART nos `period` meses até ele (%). */
  semArt: (number | null)[];
  /** Das registradas 12 meses antes do fim do mês, a parte que continuava registrada (%). */
  permanencia: (number | null)[];
}

const DIA = 86_400_000;
const dia = (date: string) => Math.round(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / DIA);
const fimDoMes = (month: string, anchor: string) => { const [year, mon] = month.split('-').map(Number), last = new Date(Date.UTC(year, mon, 0)).toISOString().slice(0, 10); return last < anchor ? last : anchor; };
const mesesAntes = (date: string, meses: number) => { const d = new Date(`${date}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() - meses); return d.toISOString().slice(0, 10); };
const centavos = (value: number) => Math.round(value * 100);
const digitos = (text: string) => text.replace(/\D/g, '');
type Intervalo = [number, number];

/** Intervalos de vigência de um registro pelo livro de movimentos, como no modelo (`createIndex` em enterprise-v10/model.ts). */
function intervalosDe(registration: Registration, movimentos: Scope['movements']): Intervalo[] {
  if (!movimentos.length) return [[dia(registration.startedAt), registration.ceasedAt ? dia(registration.ceasedAt) : Infinity]];
  const out: Intervalo[] = []; let aberto: number | null = null;
  for (const event of movimentos) {
    const cut = dia(event.date);
    if (event.type === 'Novo registro' || event.type === 'Reativação') { if (aberto === null) aberto = cut; }
    else if (aberto !== null) { out.push([aberto, cut]); aberto = null; }
  }
  if (aberto !== null) out.push([aberto, Infinity]);
  return out;
}
const vigenteEm = (intervalos: Intervalo[] | undefined, cut: number) => Boolean(intervalos?.some(([a, b]) => a <= cut && cut < b));
/** Saldo vencido de um boleto no corte, como `balance` do modelo: pagamento sem data só conta no corte de hoje. */
function saldo(invoice: Invoice, corte: string, hoje: string): number {
  if (invoice.paidAmount > 0 && !invoice.paymentDate && corte !== hoje) return 0;
  const pago = invoice.paymentDate ? invoice.paymentDate <= corte ? centavos(invoice.paidAmount) : 0 : centavos(invoice.paidAmount);
  return Math.max(0, centavos(invoice.amount) - pago);
}

export function seriesEmpresas(scope: Scope, history: EnterpriseModel, cobertura: Cobertura, period: number): SeriesEmpresas {
  const { dataset } = scope, anchor = scope.anchor, meses = history.monthly.map(row => row.month), fins = meses.map(month => fimDoMes(month, anchor));
  const ativasEm = history.monthly.map(row => row.activeIds);
  const places = new Map(dataset.establishments.map(row => [row.id, row]));
  // Vigência de cada registro, por CNPJ do estabelecimento (a conciliação com a Receita) e por empresa (permanência).
  const livro = new Map<string, Scope['movements']>();
  for (const row of dataset.movements) livro.set(row.registrationId, [...(livro.get(row.registrationId) ?? []), row]);
  const porCnpj = new Map<string, { intervalos: Intervalo[]; inicio: string }[]>(), porEmpresa = new Map<string, Intervalo[]>();
  for (const registration of dataset.registrations) {
    const place = places.get(registration.establishmentId); if (!place) continue;
    const movimentos = (livro.get(registration.id) ?? []).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    const intervalos = intervalosDe(registration, movimentos), key = digitos(place.cnpj);
    porCnpj.set(key, [...(porCnpj.get(key) ?? []), { intervalos, inicio: registration.startedAt }]);
    if (scope.companyIds.has(registration.companyId)) porEmpresa.set(registration.companyId, [...(porEmpresa.get(registration.companyId) ?? []), ...intervalos]);
  }
  const universo = (Object.values(cobertura.porClasse) as Record<string, string[]>[]).flatMap(part => Object.values(part).flat()).map(id => places.get(id)!).filter(Boolean);
  const obrigatorios = Object.values(cobertura.porClasse.Sim).flat().map(id => places.get(id)!).filter(Boolean);
  const registroVigente = (cnpj: string, cut: number) => (porCnpj.get(digitos(cnpj)) ?? []).some(row => vigenteEm(row.intervalos, cut));
  const conhecido = (cnpj: string, fim: string) => (porCnpj.get(digitos(cnpj)) ?? []).some(row => row.inicio <= fim);
  const empresaVigente = (id: string, cut: number) => vigenteEm(porEmpresa.get(id), cut);
  // Anuidade: boletos já exigíveis e com saldo vencido no fim do mês, por empresa.
  const boletos = dataset.invoices.filter(row => scope.companyIds.has(row.companyId) && Number.isFinite(row.amount) && row.amount >= 0 && row.dueDate <= anchor);
  const porPagadora = new Map<string, Invoice[]>();
  for (const row of boletos) porPagadora.set(row.companyId, [...(porPagadora.get(row.companyId) ?? []), row]);
  const vencida = (id: string, fim: string) => (porPagadora.get(id) ?? []).some(row => row.dueDate < fim && saldo(row, fim, anchor) > 0);
  // Responsáveis técnicos: vínculo vigente no fim do mês; sem vínculo e com o último encerrado há mais de 30 dias é "RT que saiu".
  const vinculos = new Map<string, Scope['technicalLinks']>();
  for (const row of dataset.technicalLinks) if (scope.companyIds.has(row.companyId)) vinculos.set(row.companyId, [...(vinculos.get(row.companyId) ?? []), row]);
  const temRt = (id: string, fim: string) => (vinculos.get(id) ?? []).some(row => row.startDate <= fim && (!row.endDate || row.endDate > fim));
  // Como nos alvos da fiscalização, a saída conta a partir do início do histórico da base: um vínculo encerrado antes dele não gera alvo.
  const inicioHistorico = dia(`${dataset.months[0]}-01`);
  // O alvo nasce 30 dias depois da saída, se a empresa estava registrada e sem outro RT nesse dia, e some quando outro RT entra ou o registro é baixado.
  // A fiscalização olha os registros da matriz da empresa (mainEstablishments), e é com ela que o cartão fecha.
  const matriz = mainEstablishments(dataset), registrosDe = new Map<string, Registration[]>();
  for (const row of dataset.registrations) { const place = matriz.get(row.companyId); if (place && place.id === row.establishmentId) registrosDe.set(row.companyId, [...(registrosDe.get(row.companyId) ?? []), row]); }
  const rtSaiu = (id: string, cut: number) => { const links = vinculos.get(id) ?? [], registros = registrosDe.get(id) ?? [], fins = registros.map(row => row.ceasedAt ? dia(row.ceasedAt) : Infinity);
    return links.some(row => { if (!row.endDate) return false; const gap = dia(row.endDate) + 30;
      if (gap < inicioHistorico || gap > cut || !registros.some(reg => dia(reg.startedAt) <= gap && (!reg.ceasedAt || dia(reg.ceasedAt) > gap)) || links.some(other => other !== row && dia(other.startDate) <= gap && (!other.endDate || dia(other.endDate) > gap))) return false;
      return !links.some(other => dia(other.startDate) > gap && dia(other.startDate) <= cut) && !fins.some(b => b > gap && b <= cut); }); };
  // ARTs por mês e, por empresa, os meses com ART (para a parte sem ART nos `period` meses até cada mês).
  const indice = new Map(meses.map((month, index) => [month, index]));
  const arts = meses.map(() => 0), valorArt = meses.map(() => 0), mesesComArt = new Map<string, string[]>();
  for (const row of dataset.arts) {
    if (row.date > anchor || !scope.companyIds.has(row.companyId)) continue;
    const index = indice.get(row.date.slice(0, 7));
    if (index !== undefined) { arts[index]++; valorArt[index] += row.value; }
    mesesComArt.set(row.companyId, [...(mesesComArt.get(row.companyId) ?? []), row.date.slice(0, 7)]);
  }
  const inicioJanela = (month: string) => mesesAntes(`${month}-01`, period - 1).slice(0, 7);
  const comArtAte = (id: string, month: string) => { const inicio = inicioJanela(month); return (mesesComArt.get(id) ?? []).some(m => m >= inicio && m <= month); };

  const out: SeriesEmpresas = { meses, cobertura: [], semRegistro: [], adimplencia: [], inadimplentes: [], comRt: [], rtBaixado: [], arts, valorArt, semArt: [], permanencia: [] };
  meses.forEach((month, index) => {
    const fim = fins[index], cut = dia(fim), ativas = ativasEm[index];
    const abertos = universo.filter(place => place.openedAt <= fim);
    out.cobertura.push(share(abertos.filter(place => registroVigente(place.cnpj, cut)).length, abertos.length));
    out.semRegistro.push(obrigatorios.filter(place => place.openedAt <= fim && !conhecido(place.cnpj, fim)).length);
    const inadimplentes = ativas.filter(id => vencida(id, fim)).length;
    out.inadimplentes.push(inadimplentes); out.adimplencia.push(share(ativas.length - inadimplentes, ativas.length));
    const semRt = ativas.filter(id => !temRt(id, fim));
    out.comRt.push(share(ativas.length - semRt.length, ativas.length)); out.rtBaixado.push(semRt.filter(id => rtSaiu(id, cut)).length);
    out.semArt.push(share(ativas.filter(id => !comArtAte(id, month)).length, ativas.length));
    const antes = dia(mesesAntes(fim, 12)), coorte = [...scope.companyIds].filter(id => empresaVigente(id, antes));
    out.permanencia.push(share(coorte.filter(id => empresaVigente(id, cut)).length, coorte.length));
  });
  return out;
}
