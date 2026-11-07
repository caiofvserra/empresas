import { useMemo } from 'react';
import { brl, int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador, Selo } from '../cockpit/ui';
import type { Evolucao } from '../painel/evolucao';
import { fonteConfea, ufs } from '../cockpit/publico';
import { Historico, Mensal, OrcadoRealizado, Sazonalidade, exportarHistorico, exportarMensal, exportarOrcado, exportarSazonalidade } from './blocos-receita';
import { fonteReal, mesDaData, mesesAte, receitaDoMes } from './dados';
import './financeiro.css';

/**
 * Painel Financeiro, página 2 (07/11/2026): de onde vem o dinheiro do Conselho, com a receita REAL publicada na Transparência do
 * Crea-SP, mês a mês desde 2013. É do estado inteiro: a regional e o município do alto da tela não mudam esta página.
 */
export default function PaginaReceita({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, period } = ctx, mes = mesDaData(ctx.anchor), meses = mesesAte(mes, period), antes = meses.map(m => `${Number(m.slice(0, 4)) - 1}${m.slice(4)}`);
  const soma = (lista: string[], tipo?: string) => lista.reduce((s, m) => s + receitaDoMes(m, tipo), 0), variacao = (a: number, b: number) => b ? (a / b - 1) * 100 : null;
  const total = soma(meses), totalAntes = soma(antes), art = soma(meses, 'ART'), anuidades = soma(meses, 'Anuidades'), anuidadesAntes = soma(antes, 'Anuidades');
  const divida = soma(meses, 'Dívida ativa'), dividaAntes = soma(antes, 'Dívida ativa'), artAntes = soma(antes, 'ART');
  const sp = ufs.find(row => row.uf === 'SP'), por12 = soma(mesesAte(mes, 12));
  const serie = (tipo?: string) => { const lista = mesesAte(mes, 36); return { tipo: 'fluxo', meses: lista, valores: lista.map(m => receitaDoMes(m, tipo)), fmt: brl, curto: (value: number) => (value / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 0 }), unidade: 'em R$ milhões' } as Evolucao; };
  const series = useMemo(() => ({ total: serie(), anuidades: serie('Anuidades'), divida: serie('Dívida ativa'), art: serie('ART') }), [mes]); // eslint-disable-line react-hooks/exhaustive-deps
  const selo = <Selo data={fonteReal.data} />;
  return <div className="ck-grid fin-grid-receita">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores da receita">
      <Indicador destaque ficha="k-receita" ctx={ctx} label={`Receita em ${period} meses`} serie={series.total} value={brl(total)} variacao={{ value: variacao(total, totalAntes), label: 'em relação aos mesmos meses um ano antes' }} spark={series.total.valores.slice(-12) as number[]} cor={tokens.accent}
        sub="dado real da Transparência, do estado inteiro" />
      <Indicador ficha="k-art" ctx={ctx} label="Parte da ART na receita" serie={series.art} value={total ? pct(art / total * 100) : '—'} variacao={{ value: total && totalAntes ? (art / total - artAntes / totalAntes) * 100 : null, kind: 'pp', label: 'em relação aos mesmos meses um ano antes' }} sub={`${brl(art)} de taxas de ART em ${period} meses`} />
      <Indicador ficha="k-anuidades" ctx={ctx} label="Anuidades" serie={series.anuidades} value={brl(anuidades)} variacao={{ value: variacao(anuidades, anuidadesAntes), label: 'em relação aos mesmos meses um ano antes' }} sub="de profissionais e empresas, do ano e de anos anteriores" />
      <Indicador ficha="k-divida-ativa" ctx={ctx} label="Recebido da dívida ativa" serie={series.divida} value={brl(divida)} variacao={{ value: variacao(divida, dividaAntes), label: 'em relação aos mesmos meses um ano antes' }} sub={`${total ? pct(divida / total * 100) : '—'} da receita do período`} />
      <Indicador ficha="k-por-ativo" ctx={ctx} label="Receita por profissional ativo" value={sp?.ativos ? `R$ ${int(por12 / sp.ativos)}` : '—'} sub={sp ? `receita de 12 meses dividida pelos ${int(sp.ativos)} ativos de SP no Confea em ${fonteConfea.data.split('-').reverse().join('/')}` : ''} />
    </section>
    <Bloco ctx={ctx} id="hi" area="hi" title="Receita de cada ano desde 2013" badge={selo} exportar={exportarHistorico(mes)}><Historico ctx={ctx} mes={mes} /></Bloco>
    <Bloco ctx={ctx} id="sz" area="sz" title="Receita de cada mês, ano a ano" badge={selo} exportar={exportarSazonalidade(mes)}><Sazonalidade ctx={ctx} mes={mes} /></Bloco>
    <Bloco ctx={ctx} id="rm" area="rm" title={`Receita mês a mês nos últimos ${Math.max(period, 12)} meses`} badge={selo} exportar={exportarMensal(mes, Math.max(period, 12))}><Mensal ctx={ctx} mes={mes} n={Math.max(period, 12)} /></Bloco>
    <Bloco ctx={ctx} id="or" area="or" title={`Orçado e realizado em ${mes.slice(0, 4)}`} badge={selo} exportar={exportarOrcado(mes)}><OrcadoRealizado ctx={ctx} mes={mes} /></Bloco>
  </div>;
}
