import type { Dataset } from './types';
import { share } from './hash';
import { adimplenteEm, idadeEm, noRecorte, rtDoVinculo, situacaoEm } from './profissionais';
import type { FiltroProfissional, ModeloProfissionais } from './profissionais';
import { ultimosMeses } from './painel-profissionais';
import type { Acao } from '../painel/fiscalizacao';

/**
 * Séries mensais dos cartões que abrem a evolução mês a mês (05/11/2026). Cada série termina no mês da data escolhida no alto da
 * tela e o último valor é o mesmo do cartão. Estoques e taxas são lidos no último dia de cada mês; fluxos contam o que aconteceu
 * no mês. São 24 meses, ou mais quando o período escolhido passa de 12 meses, para comparar com um ano antes.
 */
export const mesesDaSerie = (period: number) => Math.max(24, period + 12);
const fimDoMes = (month: string, anchor: string) => { const [year, mon] = month.split('-').map(Number), last = new Date(Date.UTC(year, mon, 0)).toISOString().slice(0, 10); return last < anchor ? last : anchor; };

export interface SeriesRegistro { meses: string[]; ativos: number[]; fora: number[]; adimplencia: (number | null)[]; mulheres: (number | null)[]; sessenta: (number | null)[]; rts: number[]; rt4: number[] }
/** Profissionais: ativos, interrompidos ou cancelados, anuidade em dia, mulheres e 60 anos ou mais entre os ativos, responsáveis técnicos e os que respondem por 4 empresas ou mais, no fim de cada mês. */
export function seriesRegistro(modelo: ModeloProfissionais, dataset: Dataset, greId: string | null, filtro: FiltroProfissional, n = 24): SeriesRegistro {
  const anchor = dataset.snapshotDate, meses = ultimosMeses(anchor, n), fins = meses.map(month => fimDoMes(month, anchor));
  const mine = modelo.profissionais.filter(row => noRecorte(row, greId, filtro));
  // A parte das mulheres ignora o filtro de gênero, como no cartão (com "Mulheres" escolhido daria sempre 100%).
  const semGenero = filtro.genero ? modelo.profissionais.filter(row => noRecorte(row, greId, { ...filtro, genero: null })) : mine;
  const out: SeriesRegistro = { meses, ativos: [], fora: [], adimplencia: [], mulheres: [], sessenta: [], rts: [], rt4: [] };
  for (const fim of fins) {
    let ativos = 0, fora = 0, emDia = 0, sessenta = 0;
    for (const row of mine) { const situacao = situacaoEm(row, fim); if (situacao === 'Ativo') { ativos++; if (adimplenteEm(row, fim)) emDia++; if (idadeEm(row, fim) >= 60) sessenta++; } else if (situacao) fora++; }
    let base = 0, mulheres = 0;
    for (const row of semGenero) if (situacaoEm(row, fim) === 'Ativo') { base++; if (row.genero === 'Feminino') mulheres++; }
    const rts = new Map<string, number>();
    for (const link of dataset.technicalLinks) if (link.startDate <= fim && (!link.endDate || link.endDate > fim)) { const id = rtDoVinculo(modelo, link); if (noRecorte(modelo.porId.get(id), greId, filtro)) rts.set(id, (rts.get(id) ?? 0) + 1); }
    out.ativos.push(ativos); out.fora.push(fora); out.adimplencia.push(share(emDia, ativos)); out.mulheres.push(share(mulheres, base)); out.sessenta.push(share(sessenta, ativos)); out.rts.push(rts.size); out.rt4.push([...rts.values()].filter(n => n >= 4).length);
  }
  return out;
}

export interface SeriesFiscalizacao { meses: string[]; acoes: number[]; autos: number[]; multas: number[]; recebidas: number[]; regularizacoes: number[] }
/** Fiscalização: ações, autos, valor das multas aplicadas e das recebidas (pela data do pagamento) e regularizações em cada mês, pelas mesmas datas dos cartões. */
export function seriesFiscalizacao(acoes: Acao[], anchor: string, greId: string | null, n = 24): SeriesFiscalizacao {
  const meses = ultimosMeses(anchor, n), indice = new Map(meses.map((month, index) => [month, index]));
  const out: SeriesFiscalizacao = { meses, acoes: meses.map(() => 0), autos: meses.map(() => 0), multas: meses.map(() => 0), recebidas: meses.map(() => 0), regularizacoes: meses.map(() => 0) };
  const em = (date: string | undefined) => date && date <= anchor ? indice.get(date.slice(0, 7)) : undefined;
  for (const row of acoes) {
    if (greId && row.greId !== greId) continue;
    const a = em(row.date), b = em(row.auto?.date), c = em(row.regularizedAt), d = em(row.auto?.paidAt);
    if (a !== undefined) out.acoes[a]++;
    if (b !== undefined) { out.autos[b]++; out.multas[b] += row.auto!.valor; }
    if (c !== undefined) out.regularizacoes[c]++;
    if (d !== undefined) out.recebidas[d] += row.auto!.valor;
  }
  return out;
}
