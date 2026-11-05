import { useMemo } from 'react';
import { quadroTecnico } from '../painel/analise';
import { brl, int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { artPorCamara } from '../cockpit/medidas';
import { Bloco, Indicador } from '../cockpit/ui';
import { ArtModalidade, ArtsMes, QuadroRt, SemArt, exportaArtModalidade, exportaArtsMes, exportaQuadroRt, exportaSemArt } from './blocos';

const change = (now: number, before: number) => before > 0 ? (now - before) / before * 100 : null;

/** Painel de Empresas, página 3: responsáveis técnicos das empresas registradas e as ARTs que elas registram. */
export default function PaginaRt({ ctx }: { ctx: CockpitCtx }) {
  const { model, scope, tokens, arts, metas } = ctx;
  const qt = useMemo(() => quadroTecnico(scope, model, ctx.f, ctx.profissionais.modelo), [scope, model, ctx.f, ctx.profissionais.modelo]), rt = model.metrics.rtCoverage.value, ativas = model.metadata.activeCompanyIds;
  const semArt = useMemo(() => artPorCamara(ctx.dataset, model), [ctx.dataset, model]), semArtIds = semArt.flatMap(row => row.semArt), comAtivas = semArt.reduce((total, row) => total + row.ativas.length, 0);
  // Só as empresas ativas na data contam no complemento do KPI de ARTs, para fechar com o KPI "sem ART" e com as barras por câmara (05/11/2026); `arts.atual` inclui empresas que deixaram o registro no período.
  const ativasComArt = useMemo(() => { const set = new Set(ativas); return [...new Set(arts.atual.filter(row => set.has(row.companyId)).map(row => row.companyId))]; }, [arts, ativas]);
  const semRt = ativas.length - qt.comRt.length;
  return <div className="ck-grid ck-grid-rt">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores de responsabilidade técnica e ART">
      <Indicador destaque ficha="k-rt" ctx={ctx} label="Empresas com responsável técnico" value={rt === null ? '—' : pct(rt)} meta={{ atual: rt, alvo: metas.rt }} variacao={{ value: rt === null ? null : rt - metas.rt, kind: 'pp', label: `em relação à meta de ${metas.rt}%` }} sub={`${int(semRt)} sem RT vigente, de ${int(ativas.length)} registradas`}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas registradas sem responsável técnico', what: 'Empresas com registro ativo sem responsável técnico de vínculo vigente: o RT saiu sem substituto ou nenhum vínculo foi carregado.', use: 'Notifique as que perderam o RT; confira o cadastro das que não têm nenhum vínculo.', ids: [...qt.rtBaixado, ...qt.semVinculo] })} />
      <Indicador ficha="k-rt-baixado" ctx={ctx} label="RT que saiu sem substituto" value={int(qt.rtBaixado.length)} sub="empresas sem novo responsável técnico 30 dias depois da saída"
        onOpen={() => ctx.open({ kind: 'empresas', title: 'RT que saiu sem substituto', what: 'Empresas com registro ativo cujo último responsável técnico saiu há mais de 30 dias, sem outro no lugar.', ids: qt.rtBaixado })} />
      <Indicador ficha="k-arts" ctx={ctx} label="ARTs de empresas" value={int(arts.atual.length)} variacao={{ value: change(arts.atual.length, arts.antes) }} spark={arts.mensal} cor={tokens.blue} sub={`${int(ativasComArt.length)} empresas registradas com ART no período`}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas registradas com ART no período', what: 'Empresas com registro ativo na data escolhida e ao menos uma ART registrada no período.', ids: ativasComArt })} />
      <Indicador ficha="k-valor-art" ctx={ctx} label="Valor declarado em ART" value={brl(arts.valor)} variacao={{ value: change(arts.valor, arts.valorAntes) }} sub="soma do valor de contrato das ARTs" />
      <Indicador ficha="k-sem-art" ctx={ctx} label="Registradas sem nenhuma ART" value={pct(semArtIds.length / Math.max(1, comAtivas) * 100)} sub={`${int(semArtIds.length)} empresas registradas sem ART no período`}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas registradas sem ART no período', what: 'Empresas com registro ativo e nenhuma ART registrada no período.', use: 'Verifique se a empresa está em atividade; se estiver, oriente sobre a obrigação de ART (Lei 6.496/77).', ids: semArtIds })} />
    </section>
    <Bloco ctx={ctx} id="qt" area="qt" title="Responsáveis técnicos" question="Quantas empresas registradas têm responsável técnico, quantas têm RT com registro profissional cancelado ou interrompido e quantas empresas cada profissional assume." help="À esquerda, a barra divide as registradas entre as que têm RT, as que perderam o RT sem substituto e as sem vínculo carregado, com a parte de cada uma. A linha de baixo conta, entre as com RT, aquelas cujo profissional está cancelado ou interrompido: é o caso mais claro de irregularidade da aba. À direita, quantas empresas cada profissional assume: em vermelho, os que respondem por mais de três, o que pede conferência de tempo e área de atuação compatíveis, conforme a norma vigente." exportar={exportaQuadroRt(ctx)}><QuadroRt ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="am" area="am" title="ARTs por modalidade, a cada 100 profissionais" question="Quantas ARTs de empresas cada modalidade registrou no período a cada 100 profissionais ativos da mesma modalidade. Assim a comparação não depende do tamanho de cada modalidade. A linha tracejada é a média." help="Azul fica acima da média; cinza, abaixo. Clique numa barra para ver as empresas." exportar={exportaArtModalidade(ctx)}><ArtModalidade ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ar" area="ar" title="ARTs mês a mês" question={`ARTs registradas por empresas em cada um dos últimos ${ctx.janela.months.length} meses, com a linha do mesmo mês um ano antes. Uma queda pode ser menos atividade ou menos ARTs registradas.`} exportar={exportaArtsMes(ctx)}><ArtsMes ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="sa" area="sa" title="Registradas sem ART, por câmara" question="Cada barra é uma câmara e soma 100% das empresas registradas nela: a parte laranja não registrou nenhuma ART no período. O número ao lado do nome é o total de registradas." help="Pode ser atividade sem ART ou empresa parada. Clique numa parte da barra para ver as empresas; na gaveta dá para filtrar a página pela câmara." exportar={exportaSemArt(ctx)}><SemArt ctx={ctx} /></Bloco>
  </div>;
}
