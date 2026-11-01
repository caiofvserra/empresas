import type { Ponte, Receita, ResumoFiscal } from '../painel/analise';
import type { Malha } from './cruzamentos';
import type { Coorte } from '../observatorio/norte';
import type { Estrutura } from './estrutura';
import type { LinhaGre } from './medidas';
import type { ResumoProfissionais } from '../domain/profissionais';
import type { QuadroFormacao } from '../domain/formacao';
import type { QuadroConselho } from '../domain/conselho';
import type { ResultadoFt } from '../painel/forcas';

/** V20 · leitura do período: frases curtas com o destaque de cada assunto, recalculadas a cada filtro e data de referência. */
export type PageId = 'presidencia' | 'cadastro' | 'profissionais' | 'formacao' | 'fiscalizacao' | 'malha' | 'receita' | 'entidades' | 'controle' | 'atendimento' | 'metodo';
export const pageIds: PageId[] = ['presidencia', 'cadastro', 'profissionais', 'formacao', 'fiscalizacao', 'malha', 'receita', 'entidades', 'controle', 'atendimento', 'metodo'];
export interface Metas { cobertura: number; rt: number; adimplencia: number; recuperacao: number; regularizacao: number; atendimento: number }
export const metasPadrao: Metas = { cobertura: 65, rt: 40, adimplencia: 60, recuperacao: 30, regularizacao: 50, atendimento: 80 };
export interface Insight { tone: 'good' | 'bad' | 'neutral'; strong: string; text: string; page: PageId }
export interface LeituraInput {
  metas: Metas; ponte: Ponte; cobertura: number | null; rt: number | null; resumo: ResumoFiscal; rec: Receita; saldo: number; inadimplencia: number | null;
  linhas: LinhaGre[]; malha: Malha; arts: { atual: number; antes: number }; cao: number | null; estrutura: Estrutura | null;
  conversao?: Coorte | null; tempo?: { mediana: number | null; abertos: number } | null;
  profissionais?: ResumoProfissionais | null; formacao?: QuadroFormacao | null; conselho?: QuadroConselho | null; forcas?: ResultadoFt[] | null;
}

const int = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const pct = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;
const brl = (value: number) => `R$ ${value.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })}`;
const change = (now: number, before: number | null) => before ? (now - before) / before * 100 : null;
const vs = (value: number | null) => value === null ? 'sem base no ano anterior' : `${value >= 0 ? '+' : ''}${pct(value)} sobre o ano anterior`;

export function leitura(input: LeituraInput): Insight[] {
  const { metas, ponte, resumo, rec, malha, estrutura } = input, out: Insight[] = [];
  const net = ponte.final - ponte.abertura, entradas = ponte.espontaneas.length + ponte.viaFiscalizacao.length + ponte.retornos.length;
  out.push({ tone: net >= 0 ? 'good' : 'bad', strong: `${net >= 0 ? '+' : ''}${int(net)} empresas`, text: `na base no período: ${int(ponte.espontaneas.length)} entradas espontâneas, ${int(ponte.viaFiscalizacao.length)} após fiscalização e ${int(ponte.retornos.length)} retornos, contra ${int(ponte.saidas.length)} saídas.`, page: 'cadastro' });
  const autos = change(resumo.autos.length, resumo.autosPrev);
  out.push({ tone: 'neutral', strong: `${int(resumo.autos.length)} autos de infração`, text: `em ${int(resumo.acoes.length)} ações fiscalizatórias (${vs(autos)}); ${int(resumo.regularizacoes.length)} empresas se regularizaram após a ação.`, page: 'fiscalizacao' });
  if (entradas) out.push({ tone: 'good', strong: `${int(ponte.viaFiscalizacao.length)} registros`, text: `obtidos pela fiscalização, ${pct(ponte.viaFiscalizacao.length / entradas * 100)} das entradas na base no período.`, page: 'fiscalizacao' });
  const receita = rec.totalAntes === null ? null : change(rec.total, rec.totalAntes);
  out.push({ tone: receita === null || receita >= 0 ? 'good' : 'bad', strong: brl(rec.total), text: `arrecadados de empresas (${vs(receita)}); ${brl(rec.multas)} vieram de multas.`, page: 'receita' });
  if (input.inadimplencia !== null) out.push({ tone: input.inadimplencia > 100 - metas.adimplencia ? 'bad' : 'good', strong: brl(input.saldo), text: `vencidos; ${pct(input.inadimplencia)} das empresas cobradas estão inadimplentes (meta de adimplência: ${metas.adimplencia}%).`, page: 'receita' });
  if (input.cobertura !== null) out.push({ tone: input.cobertura >= metas.cobertura ? 'good' : 'bad', strong: pct(input.cobertura), text: `dos CNPJs com CNAE da lista têm registro ou visto vigente, ${Math.abs(input.cobertura - metas.cobertura).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p. ${input.cobertura >= metas.cobertura ? 'acima' : 'abaixo'} da meta de ${metas.cobertura}%.`, page: 'cadastro' });
  const lacuna = [...input.linhas].sort((a, b) => b.semRegistro - a.semRegistro)[0];
  if (lacuna?.semRegistro) out.push({ tone: 'neutral', strong: lacuna.curto, text: `concentra mais CNPJs de engenharia sem registro localizado: ${int(lacuna.semRegistro)} (sem correspondência não quer dizer irregular).`, page: 'presidencia' });
  if (input.conversao?.taxa != null) out.push({ tone: input.conversao.taxa >= metas.regularizacao ? 'good' : 'bad', strong: pct(input.conversao.taxa), text: `das ações de ${input.conversao.trimestre.replace('-', ' ')} terminaram em regularização em até 180 dias (associação no tempo, não causa).`, page: 'fiscalizacao' });
  if (input.tempo?.mediana != null) out.push({ tone: 'neutral', strong: `${int(input.tempo.mediana)} dias`, text: `é a mediana entre a entrada do indício e a primeira ação; ${int(input.tempo.abertos)} indícios do período seguem sem ação.`, page: 'fiscalizacao' });
  const ft = input.forcas?.filter(row => row.fechada && row.diferenca !== null).at(-1);
  if (ft) out.push({ tone: ft.diferenca! >= 0 ? 'good' : 'bad', strong: `${ft.diferenca! >= 0 ? '+' : ''}${ft.diferenca!.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} p.p.`, text: `de regularização em 180 dias na força-tarefa ${ft.ft.id} (${int(ft.grupo.acoes.length)} ações) contra as demais ações do mesmo tipo e período (${int(ft.comparacao.acoes.length)}).`, page: 'fiscalizacao' });
  if (malha.empresas.length) out.push({ tone: 'neutral', strong: `${int(malha.confirmadas.length)} empresas`, text: `com indício confirmado por chave ou documento, de ${int(malha.empresas.length)} com algum indício para análise; ${pct(malha.comAcao.length / malha.empresas.length * 100)} já tiveram ação fiscal.`, page: 'malha' });
  const semRegistro = malha.contratos.filter(row => row.situacao === 'Sem registro na data');
  if (semRegistro.length) out.push({ tone: 'bad', strong: brl(semRegistro.reduce((total, row) => total + row.valor, 0)), text: `em ${int(semRegistro.length)} contratos públicos técnicos com fornecedor sem registro na data do contrato.`, page: 'malha' });
  const semVinculo = malha.contratosComChave.filter(row => row.vinculo === 'Não identificado').length;
  if (malha.contratosComChave.length) out.push({ tone: 'neutral', strong: `${int(semVinculo)} contratos`, text: `sem ART identificada, de ${int(malha.contratosComChave.length)} com chave para a busca: prioridade para verificar, não infração.`, page: 'malha' });
  out.push({ tone: input.arts.antes && input.arts.atual < input.arts.antes ? 'bad' : 'good', strong: `${int(input.arts.atual)} ARTs`, text: `de empresas no período (${vs(change(input.arts.atual, input.arts.antes))}); ${input.rt === null ? '—' : pct(input.rt)} das empresas registradas têm RT.`, page: 'cadastro' });
  if (input.cao !== null) out.push({ tone: input.cao <= 60 ? 'good' : 'bad', strong: `${int(input.cao)} dias`, text: 'é o prazo mediano da certidão de acervo operacional, do pedido à emissão.', page: 'cadastro' });
  const p = input.profissionais;
  if (p) {
    out.push({ tone: p.novos.length >= p.novosAntes ? 'good' : 'bad', strong: `${int(p.novos.length)} registros profissionais novos`, text: `no período (${vs(change(p.novos.length, p.novosAntes))}); ${int(p.cancelamentos.length)} cancelamentos e ${int(p.interrupcoes)} interrupções.`, page: 'profissionais' });
    if (p.taxaAdimplencia !== null) out.push({ tone: p.taxaAdimplencia >= metas.adimplencia ? 'good' : 'bad', strong: pct(p.taxaAdimplencia), text: `dos profissionais ativos estão com a anuidade em dia (${int(p.inadimplentes.length)} inadimplentes).`, page: 'profissionais' });
  }
  const coorte = input.formacao?.coortes.filter(row => row.fechada24).at(-1);
  if (coorte?.taxaRegistro24 != null) out.push({ tone: 'neutral', strong: pct(coorte.taxaRegistro24), text: `dos concluintes de ${coorte.ano} registraram-se no Crea-SP em até 24 meses (${int(coorte.registradosEm24.length)} de ${int(coorte.concluintes)}).`, page: 'formacao' });
  const c = input.conselho;
  if (c?.fimMeioAtual.taxaFim != null) out.push({ tone: 'neutral', strong: pct(c.fimMeioAtual.taxaFim), text: `da despesa dos últimos 12 meses foi em atividades-fim (fiscalização, atendimento e institucional); ${brl(c.fimMeioAtual.meio)} em atividades-meio.`, page: 'controle' });
  const taxa = estrutura?.atendimento.taxaNoPrazo ?? null;
  if (taxa !== null) out.push({ tone: taxa >= metas.atendimento ? 'good' : 'bad', strong: pct(taxa), text: `das solicitações de atendimento resolvidas em até 14 dias (meta: ${metas.atendimento}%).`, page: 'atendimento' });
  return out;
}
