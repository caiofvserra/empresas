import { brl, int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador } from '../cockpit/ui';
import { CnoFunil, CnoPapel, LicencasFonte, ObrasRegional, ObrasSemArt, SituacaoObras, abrirObras, obrasDoRecorte } from './blocos';

/** Painel de Fiscalização, página 5: obras públicas e a ART de fiscalização, obras privadas do cadastro da Receita e alvarás e licenças. */
export default function PaginaObras({ ctx }: { ctx: CockpitCtx }) {
  const obras = obrasDoRecorte(ctx), iniciadas = obras.filter(row => row.situacao !== 'Não iniciada'), semArt = iniciadas.filter(row => !row.artFiscalizacao);
  const cno = ctx.parcerias.cno, lic = ctx.parcerias.licencas, obrasLic = lic.licencas.filter(row => row.obra), semArtLic = obrasLic.filter(row => !row.artPonte);
  return <div className="ck-grid ck-grid-fs-obras">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores das obras">
      <Indicador destaque ficha="k-obras" ctx={ctx} label="Obras públicas" value={int(obras.length)} sub={`${brl(obras.reduce((total, row) => total + row.valor, 0))}; ${int(iniciadas.length)} já começaram`}
        onOpen={() => abrirObras(ctx, obras, 'Obras públicas do recorte')} />
      <Indicador ficha="k-semfiscal" ctx={ctx} label="Começaram sem ART de fiscalização" value={int(semArt.length)} sub={`${pct(semArt.length / Math.max(1, iniciadas.length) * 100)} das obras que já começaram`}
        onOpen={() => abrirObras(ctx, semArt, 'Obras sem ART de fiscalização')} />
      <Indicador ficha="k-cno" ctx={ctx} label="Obras privadas com ART encontrada" value={cno.cobertura === null ? '—' : pct(cno.cobertura)} sub={`${int(cno.comArtLocalizada.length)} de ${int(cno.comDadosMinimos.length)} obras com os dados mínimos`} />
      <Indicador ficha="k-cnosem" ctx={ctx} label="Obras privadas sem ART" value={int(cno.executorasSemArt.length)} sub="empresas executoras em obra ativa ou parada"
        onOpen={() => cno.executorasSemArt.length && ctx.open({ kind: 'empresas', title: 'Executoras de obra privada sem ART encontrada', what: 'Empresas que executam obra ativa ou paralisada do Cadastro Nacional de Obras sem ART encontrada.', use: 'Não encontrar a ART não prova que ela não exista. Oriente antes de notificar.', ids: cno.executorasSemArt })} />
      <Indicador ficha="k-licencas" ctx={ctx} label="Licenças de obra sem ART ligada" value={int(semArtLic.length)} sub={`de ${int(obrasLic.length)} alvarás e licenças de obra`} />
    </section>
    <Bloco ctx={ctx} id="ob" area="ob" title="Obras públicas por regional e a ART de fiscalização" question="Obras públicas do Obrasgov, pela regional onde a obra acontece: as que começaram com ART de fiscalização, as que começaram sem ela e as que ainda não começaram." help="A obra é ligada ao contrato do PNCP pelo código do projeto (CIPI). A ART de fiscalização pode ter sido registrada com outro número, por isso o primeiro passo é orientar o órgão. Clique numa parte para ver as obras."><ObrasRegional ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="os" area="os" title="Situação das obras públicas" question="As obras públicas do recorte pela situação na data escolhida: em execução, paralisada, concluída ou ainda não iniciada." help="A situação vem das datas de início, paralisação e conclusão informadas no Obrasgov. Clique numa fatia para ver as obras."><SituacaoObras ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ol" area="ol" title="Maiores obras sem ART de fiscalização" question="As obras públicas de maior valor que começaram sem ART de fiscalização encontrada." help="Oriente o órgão contratante antes de qualquer notificação. Clique numa obra para ver o detalhe."><ObrasSemArt ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="cn" area="cn" title="Obras privadas e a ART" question="Obras inscritas no Cadastro Nacional de Obras em São Paulo cujo responsável tem atividade de engenharia: quantas têm os dados mínimos, quantas informam o número da ART e em quantas essa ART foi encontrada." help="O responsável pela obra na Receita nem sempre é a construtora nem o responsável técnico. Não encontrar a ART não prova que ela não exista. Clique numa etapa para ver as obras."><CnoFunil ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="cp" area="cp" title="Quem responde pela obra privada" question="As obras privadas pelo papel do responsável inscrito na Receita (executa a obra, responde pelos tributos ou é a proprietária) e a parte desses responsáveis com registro no Crea-SP." help="O papel muda o que a ART deve cobrir. A proprietária da obra não precisa ter registro; quem executa precisa."><CnoPapel ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="li" area="li" title="Alvarás e licenças, e a ART da obra" question="Alvarás das prefeituras, autos de vistoria do Corpo de Bombeiros e licenças ambientais, por órgão: titulares com e sem registro no Crea-SP e, nas de obra, quantas têm ART ligada ao processo." help="Licença vencida não indica atividade atual. Quem tira a licença nem sempre projeta ou executa a obra, e a ART só se liga pelo número do processo. Clique numa barra para ver as licenças."><LicencasFonte ctx={ctx} /></Bloco>
  </div>;
}
