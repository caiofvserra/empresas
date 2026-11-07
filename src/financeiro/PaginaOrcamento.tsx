import { useMemo } from 'react';
import { brl, int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador, Selo } from '../cockpit/ui';
import type { Evolucao } from '../painel/evolucao';
import { despesaPublicada } from '../cockpit/publico';
import { change, g } from '../gestao/comum';
import { DespesaPorAtivo, Diarias, ExecucaoAno, FimMeio, Fornecedores, Naturezas, Pessoal, SedeTerritorio, Vencimentos, exportarDiarias, exportarExecucao, exportarFimMeio, exportarFornecedores, exportarNaturezas, exportarPessoal, exportarSede, exportarVencimentos } from './blocos-orcamento';

/** Painel de Gestão do Conselho, página 2: como o orçamento do ano está sendo executado e em que o Conselho gasta. */
export default function PaginaOrcamento({ ctx }: { ctx: CockpitCtx }) {
  const c = ctx.conselho, gest = g(ctx), { tokens } = ctx;
  // Mesma conta da série do cartão: com uma regional escolhida, só a despesa lançada nela (sem a sede).
  const despesa = gest.despesaMensal.slice(-12).reduce((sum, value) => sum + value, 0), despesaAntes = gest.despesaMensal.slice(-24, -12).reduce((sum, value) => sum + value, 0);
  const diarias = c.diarias.reduce((sum, row) => sum + row.valor, 0), diariasAntes = c.diarias.reduce((sum, row) => sum + row.antes, 0);
  const ano = gest.despesaAcumulada.filter(row => row.realizado !== null).at(-1), execucao = ano?.previsto ? ano.realizado! / ano.previsto * 100 : null;
  const series = useMemo(() => {
    const mil = (value: number) => (value / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    return { despesa: { tipo: 'fluxo', meses: gest.meses, valores: gest.despesaMensal, fmt: brl, curto: mil, unidade: 'em R$ milhões', goodUp: false } as Evolucao,
      diarias: { tipo: 'fluxo', meses: gest.meses, valores: gest.diariasMensais, fmt: brl, curto: (value: number) => (value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 }), unidade: 'em R$ mil', goodUp: false } as Evolucao };
  }, [gest]);
  return <div className="ck-grid ck-grid-cs-orcamento">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores de orçamento e despesa">
      <Indicador destaque ficha="k-despesa" ctx={ctx} label="Despesa em 12 meses" serie={series.despesa} value={brl(despesa)} variacao={{ value: change(despesa, despesaAntes), goodUp: false, label: 'em relação aos 12 meses anteriores' }} spark={gest.despesaMensal.slice(-12)} cor={tokens.accent} sub={ctx.greId ? 'só a despesa lançada na regional escolhida' : 'sede e regionais'} />
      <Indicador ficha="k-execucao" ctx={ctx} label={`Execução do orçamento de ${ctx.anchor.slice(0, 4)}`} value={execucao === null ? '—' : pct(execucao)} sub={ano ? `${brl(ano.realizado!)} realizados de ${brl(ano.previsto!)} orçados até o mês da data` : ''} />
      <Indicador ficha="k-fim" ctx={ctx} label="Em atividades-fim" value={c.fimMeioAtual.taxaFim === null ? '—' : pct(c.fimMeioAtual.taxaFim)} sub={`${brl(c.fimMeioAtual.fim)} em fiscalização, atendimento e ações institucionais`} />
      <Indicador ficha="k-diarias" ctx={ctx} label="Diárias e passagens" serie={series.diarias} value={brl(diarias)} variacao={{ value: change(diarias, diariasAntes), goodUp: false, label: 'em relação aos 12 meses anteriores' }} spark={gest.diariasMensais.slice(-12)} cor={tokens.blue} sub={`${int(c.diarias.reduce((sum, row) => sum + row.quantidade, 0))} diárias em 12 meses`} />
      <Indicador ficha="k-contratos" ctx={ctx} label="Contratos vigentes" value={int(c.contratos.vigentes)} sub={`${brl(c.contratos.valorVigente)}; ${int(c.contratos.vencem90)} terminam em 90 dias`} />
    </section>
    <Bloco ctx={ctx} id="ex" area="ex" title="Execução do orçamento no ano" exportar={exportarExecucao(ctx)}><ExecucaoAno ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="fm" area="fm" title="Atividade-fim e atividade-meio" exportar={exportarFimMeio(ctx)}><FimMeio ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="na" area="na" title="Despesa por natureza" exportar={exportarNaturezas(ctx)}><Naturezas ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="st" area="st" title="Sede, regionais e fiscalização por GRE" exportar={exportarSede(ctx)}><SedeTerritorio ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="dr" area="dr" title="Diárias por beneficiário" exportar={exportarDiarias(ctx)}><Diarias ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="vc" area="vc" title="Contratos que terminam nos próximos 12 meses" exportar={exportarVencimentos(ctx)}><Vencimentos ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="fo" area="fo" title="Maiores fornecedores" exportar={exportarFornecedores(ctx)}><Fornecedores ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="pe" area="pe" title="Pessoal por função" exportar={exportarPessoal(ctx)}><Pessoal ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="bc" area="bc" title="Despesa por profissional ativo" badge={<Selo data={despesaPublicada.fonte.data} />}
      exportar={{ cabecalho: ['Exercício', 'Despesa publicada (R$)'], linhas: () => despesaPublicada.exercicios.map(row => [row.ano, Math.round(row.valor)]) }}><DespesaPorAtivo ctx={ctx} /></Bloco>
  </div>;
}
