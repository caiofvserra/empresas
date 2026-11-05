import { int, pct, brl } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador } from '../cockpit/ui';
import { useSeriesFiscalizacao } from './series';
import { ConversaoTrimestre, DiasRegularizar, EsperaTipo, ForcasTarefas, ReceitaMes } from './blocos';

const change = (now: number, before: number) => before > 0 ? (now - before) / before * 100 : null;

/** Painel de Fiscalização, página 2: quantas ações terminam em regularização, em quantos dias, quanto o indício espera e o resultado das forças-tarefas. */
export default function PaginaResultado({ ctx }: { ctx: CockpitCtx }) {
  const { resumo, tokens, metas, norte } = ctx, series = useSeriesFiscalizacao(ctx), c = norte.conversao, r = norte.receita, t = norte.tempo;
  const fechadas = ctx.forcas.filter(row => row.fechada && row.diferenca !== null), acima = fechadas.filter(row => row.diferenca! > 0);
  const completas = c.coortes.filter(row => row.completa);
  return <div className="ck-grid ck-grid-fs-resultado">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores do resultado da fiscalização">
      <Indicador destaque ficha="k-regularizacoes" ctx={ctx} label="Regularizações depois de uma ação" serie={series.regularizacoes} value={int(resumo.regularizacoes.length)} variacao={{ value: change(resumo.regularizacoes.length, resumo.regularizacoesPrev) }} spark={resumo.mensal.map(row => row.regularizacoes)} cor={tokens.good} meta={{ atual: resumo.taxa, alvo: metas.regularizacao }}
        sub={`${resumo.taxa === null ? '—' : pct(resumo.taxa)} das ações do período; a meta é ${metas.regularizacao}%`} onOpen={() => ctx.open({ kind: 'regularizacoes' })} />
      <Indicador ficha="k-conversao" ctx={ctx} label="Regularizaram em até 180 dias" value={c.atual?.taxa == null ? '—' : pct(c.atual.taxa)} variacao={{ value: c.atual?.taxa != null && c.anterior?.taxa != null ? c.atual.taxa - c.anterior.taxa : null, kind: 'pp', label: 'em relação ao trimestre anterior' }}
        spark={completas.map(row => row.taxa ?? 0)} cor={tokens.good} sub={c.atual ? `ações do ${c.atual.trimestre.slice(-1)}º trimestre de ${c.atual.trimestre.slice(0, 4)}, o último que já fechou` : 'nenhum trimestre fechado ainda'} />
      <Indicador ficha="k-tempo" ctx={ctx} label="Dias até a primeira ação" value={t.mediana === null ? '—' : int(t.mediana)} sub={`no caso típico; ${int(t.abertos)} indícios do período ainda esperam`} />
      <Indicador ficha="k-receita" ctx={ctx} label="Recebido depois de uma ação" value={brl(r.total)} variacao={{ value: change(r.total, r.totalAntes) }} spark={r.mensal.map(row => row.valor)} cor={tokens.good} sub={`${brl(r.multas)} em multas e ${brl(r.anuidades)} em anuidades`} />
      <Indicador ficha="k-forcas" ctx={ctx} label="Forças-tarefas acima da comparação" value={`${int(acima.length)} de ${int(fechadas.length)}`} sub={`${int(ctx.forcas.length - fechadas.length)} ainda sem os 180 dias para fechar`} />
    </section>
    <Bloco ctx={ctx} id="cv" area="cv" title="Ações que regularizaram em até 180 dias, por trimestre" question="Para as ações iniciadas em cada trimestre, quantas terminaram em regularização (registro, responsável técnico, ART ou baixa) em até 180 dias. O número em cima é a parte que regularizou." help="As barras claras são trimestres que ainda não completaram 180 dias e por isso não entram na comparação. A regularização pode ter acontecido por outros motivos além da ação. Clique numa barra para ver as ações."><ConversaoTrimestre ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ft" area="ft" title="Forças-tarefas e ações parecidas fora delas" question="Para cada força-tarefa, a parte das ações que regularizou em 180 dias (ponto azul) e a mesma parte nas ações do mesmo tipo e época feitas fora dela, no estado (ponto cinza). O ponto azul vazio é força-tarefa que ainda não completou 180 dias." help="A comparação mostra o que aconteceu, mas não prova que a força-tarefa causou o resultado, porque ela escolhe os alvos. A lista de forças-tarefas é de exemplo; em produção virá da superintendência de fiscalização. Clique num ponto para ver as ações."><ForcasTarefas ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="bx" area="bx" title="Dias da ação até a regularização" question="Nas ações dos últimos 24 meses que já regularizaram, quantos dias se passaram da ação até a regularização, por origem da ação. A caixa vai do primeiro ao terceiro quartil, o traço dentro dela é a mediana, e as hastes vão até os casos mais distantes sem contar os extremos." help="O número em negrito é a mediana. Ao lado, o intervalo em que está a metade do meio dos casos. As ações que ainda não regularizaram não entram nesta conta; a parte delas está embaixo do nome. Clique numa caixa para ver as ações."><DiasRegularizar ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ta" area="ta" title="Dias do indício até a primeira ação" question="Nos indícios que surgiram no período e já tiveram ação, quantos dias se passaram até a primeira ação, por tipo de indício. Embaixo do nome, a parte que ainda espera." help={`A mediana do cartão (${t.mediana === null ? 'sem valor' : `${int(t.mediana)} dias`}) conta também os indícios ainda sem ação, pelo método de Kaplan-Meier, por isso pode ser maior que a mediana das caixas. Clique numa caixa para ver os indícios que esperam.`}><EsperaTipo ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="rc" area="rc" title="Recebido depois de uma ação, mês a mês" question="Anuidades e multas pagas, em cada mês do período, por empresas que tiveram uma ação de fiscalização nascida de um indício até um ano antes." help="A empresa poderia ter pago mesmo sem a ação, por isso o valor é um teto, e não um ganho líquido. Clique numa barra para ver as empresas."><ReceitaMes ctx={ctx} /></Bloco>
  </div>;
}
