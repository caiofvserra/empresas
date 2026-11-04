import { int } from '../painel/ui';
import { ativosNoInicio } from '../domain/painel-profissionais';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador } from '../cockpit/ui';
import { EntradasSaidasMes, NovosModalidade, PermanenciaAno, PonteAtivos, abrirProfissionais, filtroDe, porIds, useFluxo } from './blocos';

const change = (now: number, before: number) => before > 0 ? (now - before) / before * 100 : null;

/** Painel de Profissionais, página 2: quem entra, interrompe, volta e cancela o registro, e quantos de cada ano continuam ativos. */
export default function PaginaFluxo({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, janela } = ctx, p = ctx.profissionais.resumo, meses = useFluxo(ctx);
  const doPeriodo = meses.filter(row => row.month >= janela.start.slice(0, 7) && row.month <= janela.end.slice(0, 7));
  const junta = (campo: 'novos' | 'cancelamentos' | 'interrupcoes' | 'reativacoes') => doPeriodo.flatMap(row => row[campo]);
  const novos = junta('novos'), cancelamentos = junta('cancelamentos'), interrupcoes = junta('interrupcoes'), reativacoes = junta('reativacoes');
  const inicio = ativosNoInicio(ctx.profissionais.modelo, ctx.dataset, ctx.period, ctx.greId, filtroDe(ctx)), saldo = p.ativos.length - inicio.ativos.length;
  return <div className="ck-grid ck-grid-pf-fluxo">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores de entradas e saídas">
      <Indicador destaque ficha="k-novos" ctx={ctx} label="Registros novos" value={int(novos.length)} variacao={{ value: change(p.novos.length, p.novosAntes) }} spark={doPeriodo.map(row => row.novos.length)} cor={tokens.blue} sub={`${int(Math.round(novos.length / Math.max(1, doPeriodo.length)))} por mês no período`}
        onOpen={() => abrirProfissionais(ctx, 'Registros novos no período', porIds(ctx, novos), 'Profissionais que fizeram o registro no período escolhido.')} />
      <Indicador ficha="k-reativacoes" ctx={ctx} label="Voltaram depois de interromper" value={int(reativacoes.length)} spark={doPeriodo.map(row => row.reativacoes.length)} cor={tokens.heat[1]} sub="interrupções que terminaram no período"
        onOpen={() => abrirProfissionais(ctx, 'Voltaram depois de uma interrupção', porIds(ctx, reativacoes), 'Profissionais cuja interrupção do registro terminou no período.')} />
      <Indicador ficha="k-interrupcoes" ctx={ctx} label="Interromperam o registro" value={int(interrupcoes.length)} spark={doPeriodo.map(row => row.interrupcoes.length)} cor={tokens.warn} sub="podem voltar quando quiserem"
        onOpen={() => abrirProfissionais(ctx, 'Interromperam o registro no período', porIds(ctx, interrupcoes), 'Profissionais que pediram a interrupção do registro no período.')} />
      <Indicador ficha="k-cancelamentos" ctx={ctx} label="Cancelaram o registro" value={int(cancelamentos.length)} variacao={{ value: change(p.cancelamentos.length, p.cancelamentosAntes), goodUp: false }} spark={doPeriodo.map(row => row.cancelamentos.length)} cor={tokens.bad} sub="em relação ao mesmo período um ano antes"
        onOpen={() => abrirProfissionais(ctx, 'Cancelaram o registro no período', porIds(ctx, cancelamentos), 'Profissionais com registro cancelado no período.')} />
      <Indicador ficha="k-saldo" ctx={ctx} label="Saldo do período" value={`${saldo >= 0 ? '+' : ''}${int(saldo)}`} sub={`de ${int(inicio.ativos.length)} para ${int(p.ativos.length)} ativos`} />
    </section>
    <Bloco ctx={ctx} id="me" area="me" title="Entradas e saídas mês a mês" question="Nos últimos 24 meses, para cima os registros novos e os que voltaram de uma interrupção; para baixo os que interromperam e os que cancelaram. A linha é o saldo, e a faixa clara marca o período escolhido." help="Clique numa barra para ver os profissionais daquele mês."><EntradasSaidasMes ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="sk" area="sk" title="Como a base de ativos mudou no período" question="Quantos estavam ativos no começo do período, quantos entraram (registros novos e quem voltou), quantos saíram (interromperam ou cancelaram) e quantos estão ativos na data escolhida." help="Compara a situação de cada pessoa no começo e no fim do período. Quem interrompeu e voltou dentro do período não aparece, por isso “voltaram” e “interromperam” podem ser menores que nos cartões, que contam cada evento. O saldo é o mesmo do cartão. Clique numa barra para ver os profissionais."><PonteAtivos ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="hm" area="hm" title="Registros novos por modalidade" question="Registros novos de cada modalidade no período escolhido (azul) e no mesmo período um ano antes (cinza). O número ao lado é o total do período e a variação."><NovosModalidade ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="pa" area="pa" title="Quantos continuam ativos, por ano do registro" question="Para cada ano de registro, quantos profissionais se registraram e quantos continuam ativos na data escolhida. A linha é a parte que continua ativa." help="É normal a parte ativa cair nos anos mais antigos, com aposentadorias e mudanças de carreira. Uma queda forte num ano recente pede atenção."><PermanenciaAno ctx={ctx} /></Bloco>
  </div>;
}
