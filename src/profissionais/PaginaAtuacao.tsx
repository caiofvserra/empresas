import { int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador } from '../cockpit/ui';
import { ArtIdade, ArtsMes, ArtsModalidade, CargaRt, Concentracao, abrirProfissionais, porIds } from './blocos';

const change = (now: number, before: number) => before > 0 ? (now - before) / before * 100 : null;

/** Painel de Profissionais, página 3: quem registra ART, em que modalidade e idade, e quantas empresas cada responsável técnico assume. */
export default function PaginaAtuacao({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, p = ctx.profissionais.resumo, autores = new Set(p.arts.map(art => ctx.profissionais.modelo.autoria.get(art.id)));
  const comArt = p.ativos.filter(row => autores.has(row.id)), semArt = p.ativos.filter(row => !autores.has(row.id)), quatro = p.cargaRt[3]?.ids ?? [];
  return <div className="ck-grid ck-grid-pf-atuacao">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores de ART e responsabilidade técnica">
      <Indicador destaque ficha="k-arts" ctx={ctx} label="ARTs registradas no período" value={int(p.arts.length)} variacao={{ value: change(p.arts.length, p.artsAntes) }} spark={p.mensal.map(row => row.arts)} cor={tokens.accent} sub={`por ${int(p.autores)} profissionais diferentes`} />
      <Indicador ficha="k-autores" ctx={ctx} label="Ativos que registraram ART" value={p.ativos.length ? pct(comArt.length / p.ativos.length * 100) : '—'} sub={`${int(semArt.length)} ativos sem nenhuma ART no período`}
        onOpen={() => abrirProfissionais(ctx, 'Ativos sem ART no período', semArt, 'Profissionais ativos que não registraram nenhuma ART como autor no período.', 'Pode ser trabalho sem ART (ensino, setor público, empregado) ou atividade parada. Não é indício sozinho.')} />
      <Indicador ficha="k-media" ctx={ctx} label="ARTs a cada 100 ativos" value={p.ativos.length ? (p.arts.length / p.ativos.length * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '—'} sub="no período escolhido, em todas as modalidades" />
      <Indicador ficha="k-rt" ctx={ctx} label="Responsáveis técnicos" value={int(p.rtAtivos)} sub={`${p.ativos.length ? pct(p.rtAtivos / p.ativos.length * 100) : '—'} dos ativos respondem por alguma empresa`}
        onOpen={() => abrirProfissionais(ctx, 'Responsáveis técnicos', porIds(ctx, p.cargaRt.flatMap(row => row.ids)), 'Profissionais com vínculo de responsável técnico vigente em pelo menos uma empresa.')} />
      <Indicador ficha="k-rt4" ctx={ctx} label="Responsáveis por 4 empresas ou mais" value={int(quatro.length)} sub="vale conferir tempo e área de atuação"
        onOpen={() => abrirProfissionais(ctx, 'Responsáveis técnicos de 4 empresas ou mais', porIds(ctx, quatro), 'Profissionais com vínculo de responsável técnico vigente em quatro empresas ou mais.', 'Verificar se há tempo e área de atuação compatíveis antes de qualquer tratativa.')} />
    </section>
    <Bloco ctx={ctx} id="am" area="am" title="ARTs a cada 100 ativos, por modalidade" question="Quantas ARTs os profissionais de cada modalidade registraram no período a cada 100 ativos da mesma modalidade. Assim a comparação não depende do tamanho da modalidade. A linha tracejada é a média." help="Azul fica acima da média; cinza, abaixo. Clique numa barra para ver os ativos daquela modalidade sem ART."><ArtsModalidade ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mm" area="mm" title="ARTs por mês, comparadas com um ano antes" question="ARTs registradas em cada um dos últimos 12 meses (barras) e no mesmo mês um ano antes (linha). Barra acima da linha: mais ARTs que um ano antes."><ArtsMes ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="fa" area="fa" title="Quantas ARTs cada profissional registra" question="Os ativos agrupados pelo número de ARTs que registraram no período, e os que mais registraram." help="Volume alto, sozinho, não é indício. A regra que aponta volume fora do normal fica no painel de Fiscalização, página Malha fina."><Concentracao ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="cr" area="cr" title="Empresas por responsável técnico" question="Os responsáveis técnicos pelo número de empresas que assumem hoje. Em vermelho, os que respondem por quatro ou mais." help="Acima de três empresas, vale conferir se há tempo e área de atuação compatíveis, conforme a norma vigente."><CargaRt ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ia" area="ia" title="Parte dos ativos que registrou ART, por idade" question="A parte dos ativos de cada modalidade e faixa de idade que registrou ao menos uma ART no período. Quanto mais escura a célula, maior a parte." help="Modalidades sem nenhuma ART no período ficam de fora."><ArtIdade ctx={ctx} /></Bloco>
  </div>;
}
