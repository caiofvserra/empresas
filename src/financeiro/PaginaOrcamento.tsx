import { useMemo } from 'react';
import { brl, int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador, Selo } from '../cockpit/ui';
import type { Evolucao } from '../painel/evolucao';
import { despesaPublicada } from '../cockpit/publico';
import { execucaoDoAno } from '../domain/financeiro';
import { Contratos, DespesaPorAtivo, Diarias, ExecucaoAno, Fornecedores, Grupos, Resultado, abrirCategoria, abrirContratos, exportarContratos, exportarDiarias, exportarExecucao, exportarFornecedores, exportarGrupos, exportarResultado } from './blocos-orcamento';
import { contratosQueTerminam, despesaDoMes, diariasNoPeriodo, fin, fonteReal, mesDaData, mesesAte, nomesMesLongo, receitaDoMes } from './dados';
import './financeiro.css';

/**
 * Painel Financeiro, página 4 (07/11/2026): como o orçamento do ano está sendo executado, em que o Conselho gasta, o resultado de
 * cada ano, quem recebe diárias, os maiores fornecedores e os contratos que terminam. Tudo REAL, da Transparência do Crea-SP, do
 * estado inteiro: a regional e o município do alto da tela não mudam esta página.
 */
export default function PaginaOrcamento({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, period } = ctx, mes = mesDaData(ctx.anchor), meses = useMemo(() => mesesAte(mes, period), [mes, period]), antes = meses.map(m => `${Number(m.slice(0, 4)) - 1}${m.slice(4)}`);
  const somaD = (lista: string[], grupo?: string) => lista.reduce((s, m) => s + despesaDoMes(m, grupo), 0), somaR = (lista: string[]) => lista.reduce((s, m) => s + receitaDoMes(m), 0);
  const variacao = (a: number, b: number) => b ? (a / b - 1) * 100 : null;
  const despesa = somaD(meses), despesaAntes = somaD(antes), receita = somaR(meses), resultado = receita - despesa, resultadoAntes = somaR(antes) - despesaAntes;
  const deslocamento = somaD(meses, 'Diárias e deslocamento'), deslocamentoAntes = somaD(antes, 'Diárias e deslocamento');
  const pessoas = useMemo(() => diariasNoPeriodo(fin, meses), [meses]), conselheiros = pessoas.filter(p => p.categoria === 'Conselheiros' || p.categoria === 'Jetons').reduce((s, p) => s + p.valor, 0);
  const e = execucaoDoAno(fin, 'despesa', mes), ate = Number(mes.slice(5, 7));
  const vigentes = fin.contratos.filter(row => row.inicio <= ctx.anchor && row.fim > ctx.anchor), em90 = contratosQueTerminam(fin, ctx.anchor, 3);
  const series = useMemo(() => { const lista = mesesAte(mes, 36), mi = (value: number) => (value / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
    return { despesa: { tipo: 'fluxo', meses: lista, valores: lista.map(m => despesaDoMes(m)), fmt: brl, curto: mi, unidade: 'em R$ milhões', goodUp: false } as Evolucao,
      resultado: { tipo: 'fluxo', meses: lista, valores: lista.map(m => receitaDoMes(m) - despesaDoMes(m)), fmt: brl, curto: mi, unidade: 'em R$ milhões' } as Evolucao,
      deslocamento: { tipo: 'fluxo', meses: lista, valores: lista.map(m => despesaDoMes(m, 'Diárias e deslocamento')), fmt: brl, curto: (value: number) => (value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 }), unidade: 'em R$ mil', goodUp: false } as Evolucao }; }, [mes]);
  const selo = <Selo data={fonteReal.data} />;
  return <div className="ck-grid fin-grid-orcamento">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores de orçamento e despesa">
      <Indicador destaque ficha="k-despesa" ctx={ctx} label={`Despesa em ${period} meses`} serie={series.despesa} value={brl(despesa)} variacao={{ value: variacao(despesa, despesaAntes), goodUp: false, label: 'em relação aos mesmos meses um ano antes' }} spark={series.despesa.valores.slice(-12) as number[]} cor={tokens.accent} sub="empenhada, dado real do estado inteiro" />
      <Indicador ficha="k-execucao" ctx={ctx} label={`Execução do orçamento de ${mes.slice(0, 4)}`} value={e.orcado ? pct(e.realizado / e.orcado * 100) : '—'} sub={`${brl(e.realizado)} de ${brl(e.orcado)}; até ${nomesMesLongo[ate - 1]} passaram ${pct(ate / 12 * 100)} do ano`} />
      <Indicador ficha="k-resultado" ctx={ctx} label={`Receita menos despesa em ${period} meses`} serie={series.resultado} value={brl(resultado)} variacao={{ value: resultadoAntes ? (resultado - resultadoAntes) / Math.abs(resultadoAntes) * 100 : null, label: 'em relação aos mesmos meses um ano antes' }} sub={`${brl(receita)} de receita e ${brl(despesa)} de despesa`} />
      <Indicador ficha="k-diarias" ctx={ctx} label="Diárias e deslocamento" serie={series.deslocamento} value={brl(deslocamento)} variacao={{ value: variacao(deslocamento, deslocamentoAntes), goodUp: false, label: 'em relação aos mesmos meses um ano antes' }}
        sub={`${int(pessoas.length)} pessoas com diária; ${brl(conselheiros)} a conselheiros`} onOpen={() => abrirCategoria(ctx, pessoas, null)} />
      <Indicador ficha="k-contratos" ctx={ctx} label="Contratos vigentes" value={int(vigentes.length)} sub={`${brl(vigentes.reduce((s, row) => s + row.valor, 0))}; ${int(em90.length)} terminam em 90 dias`} onOpen={() => abrirContratos(ctx, 'Contratos que terminam em 90 dias', em90)} />
    </section>
    <Bloco ctx={ctx} id="ex" area="ex" title={`Execução do orçamento em ${mes.slice(0, 4)}`} badge={selo} exportar={exportarExecucao(mes)}><ExecucaoAno ctx={ctx} mes={mes} /></Bloco>
    <Bloco ctx={ctx} id="gr" area="gr" title="Em que o Conselho gasta" badge={selo} exportar={exportarGrupos(mes)}><Grupos ctx={ctx} mes={mes} /></Bloco>
    <Bloco ctx={ctx} id="rd" area="rd" title="Receita, despesa e resultado desde 2013" badge={selo} exportar={exportarResultado(mes)}><Resultado ctx={ctx} mes={mes} /></Bloco>
    <Bloco ctx={ctx} id="dr" area="dr" title="Quem recebe diárias" badge={selo} exportar={exportarDiarias(meses)}><Diarias ctx={ctx} meses={meses} /></Bloco>
    <Bloco ctx={ctx} id="fo" area="fo" title="Maiores fornecedores" badge={selo} exportar={exportarFornecedores(meses)}><Fornecedores ctx={ctx} meses={meses} /></Bloco>
    <Bloco ctx={ctx} id="vc" area="vc" title="Contratos a vencer" badge={selo} exportar={exportarContratos(ctx.anchor)}><Contratos ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="bc" area="bc" title="Por profissional ativo" badge={<Selo data={despesaPublicada.fonte.data} />}
      exportar={{ cabecalho: ['Exercício', 'Despesa publicada (R$)'], linhas: () => despesaPublicada.exercicios.map(row => [row.ano, Math.round(row.valor)]) }}><DespesaPorAtivo ctx={ctx} /></Bloco>
  </div>;
}
