import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { complianceFlow } from '../gestao-v14/metrics';
import { int, pct } from '../painel/ui';
import { cadastroIncompleto } from '../domain/empresas';
import { nomePendencia } from '../domain/types';
import type { QualityKind } from '../domain/types';
import type { CockpitCtx } from '../cockpit/contexto';
import { pagamento } from '../cockpit/medidas';
import { useSeriesEmpresas } from './series';
import { Bloco, Indicador, recorteVazio } from '../cockpit/ui';
import { ArvoreMercado, CamaraPorte, Conciliacao, Funil, IdadeCapital, MapaMercado, Situacoes, exportarArvore, exportarCamaraPorte, exportarConciliacao, exportarFunil, exportarIdadeCapital, exportarMapa, exportarSituacoes, metricasMapa } from './blocos';
import type { MetricaMapa } from './blocos';

/** Painel de Empresas, página 1: o tamanho do mercado de engenharia, quanto dele está registrado e em que atividades estão as que faltam. */
export default function PaginaMercado({ ctx }: { ctx: CockpitCtx }) {
  const vazio = recorteVazio(ctx);
  const { model, scope, metas } = ctx, series = useSeriesEmpresas(ctx), c = ctx.norte.cobertura, n = ctx.norte.contagens;
  const flow = useMemo(() => complianceFlow(model, scope), [model, scope]);
  const pay = pagamento(model), ativas = model.metadata.activeCompanyIds, incompleto = useMemo(() => cadastroIncompleto(scope, model), [scope, model]);
  const semRegistro = c.porClasse.Sim['Sem correspondência'];
  const [metrica, setMetrica] = useState<MetricaMapa>('cobertura');
  // A pendência mais comum em palavras (05/11/2026): antes aparecia o rótulo bruto do tipo ("CREA ativo / CNPJ baixado").
  const pendencia = incompleto.porTipo[0];
  return <div className="ck-grid ck-grid-mercado">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores do mercado e do registro">
      <Indicador ficha="k-empresas" ctx={ctx} label="Empresas registradas" serie={series.base} value={int(n.raizes)} sub={`${int(n.estabelecimentos)} estabelecimentos · ${int(n.vistos)} vistos de empresas de fora de SP`}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas registradas', what: 'Empresas, contadas pela raiz do CNPJ, com ao menos um registro ou visto ativo na data escolhida.', ids: ativas })} />
      <Indicador destaque ficha="k-cobertura" ctx={ctx} label="Parte do mercado que está registrada" serie={series.cobertura} value={c.taxa === null ? '—' : pct(c.taxa, 1)} meta={{ atual: c.taxa, alvo: metas.cobertura }} variacao={{ value: c.taxa === null ? null : c.taxa - metas.cobertura, kind: 'pp', label: `em relação à meta de ${metas.cobertura}%` }}
        sub={`nas atividades de registro obrigatório, ${c.taxaSim === null ? '—' : pct(c.taxaSim, 1)}`} />
      <Indicador ficha="k-sem-registro" ctx={ctx} label="Atividade obrigatória e nenhum registro" serie={series.semRegistro} value={int(semRegistro.length)} sub="estabelecimentos que nunca apareceram no cadastro"
        onOpen={() => ctx.open({ kind: 'cnpjs', title: 'Atividade de registro obrigatório e nenhum registro', what: 'Estabelecimentos ativos na Receita com atividade de registro obrigatório (“Sim”) que nunca tiveram registro ou visto no Crea-SP.', use: 'Não estar no cadastro não quer dizer irregular. Confirme a atividade antes de orientar ou notificar.', ids: semRegistro })} />
      <Indicador ficha="k-quitacao" ctx={ctx} label="Registradas em dia com a anuidade" serie={series.adimplencia} value={ativas.length ? pct(pay.emDia.length / ativas.length * 100) : '—'} sub={`${int(pay.inadimplentes.length)} empresas registradas com anuidade vencida`}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas registradas com anuidade vencida', what: 'Empresas registradas com anuidade vencida na data escolhida. Sem quitação, elas não conseguem a certidão de registro e quitação exigida em licitações.', ids: pay.inadimplentes })} />
      <Indicador ficha="k-cadastro" ctx={ctx} label="Registradas com cadastro incompleto" value={int(incompleto.ids.length)} sub={pendencia ? `${int(pendencia.n)} ${nomePendencia[pendencia.tipo as QualityKind] ?? pendencia.tipo}` : 'nenhuma pendência aberta'}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas registradas com cadastro incompleto', what: 'Empresas registradas com pendência aberta no cadastro, como atividade não informada, regional não identificada ou município diferente do da Receita.', use: 'Corrigir o cadastro antes de usar a empresa em qualquer contagem por câmara, atividade ou regional.', ids: incompleto.ids })} />
    </section>
    <Bloco ctx={ctx} id="mp" area="mp" title="Mapa por município" question="Cada município é pintado pelo próprio valor no indicador escolhido, em cinco faixas. Fica cinza o município com menos de 2 empresas ou estabelecimentos na base da porcentagem, porque ela não diria nada. A lista ao lado traz as GREs em ordem." help="Passe o mouse numa GRE da lista para acender os municípios dela. Clique num município para ver as empresas ou os CNPJs dele, ou numa GRE da lista para ver os da GRE; a gaveta permite filtrar a página inteira pelo município ou pela GRE. Escolha uma GRE ou um município no alto da tela para aproximar o mapa."
      exportar={exportarMapa(ctx, metrica)}
      actions={<label className="ck-select is-compact"><span className="sr-only">Indicador do mapa</span><select value={metrica} onChange={event => setMetrica(event.target.value as MetricaMapa)}>{(Object.keys(metricasMapa) as MetricaMapa[]).map(id => <option key={id} value={id}>{metricasMapa[id].label}</option>)}</select><ChevronDown size={14} /></label>}><MapaMercado ctx={ctx} metrica={metrica} /></Bloco>
    <Bloco ctx={ctx} vazio={vazio} id="tm" area="tm" title="Mercado por câmara e atividade" question={`Cada retângulo grande é uma câmara, e os de dentro são as atividades (CNAE) da lista do Crea-SP. Cada estabelecimento conta uma vez, na atividade que o enquadra: a principal, ou a secundária quando a principal não está na lista. O tamanho é o número desses estabelecimentos, e a porcentagem, a parte deles com registro. A cor compara essa parte com a meta de cobertura do painel (${metas.cobertura}%): laranja abaixo da meta, azul da meta até 15 pontos acima e azul-escuro acima disso, sempre as mesmas cores em qualquer filtro. As atividades menores de cada câmara, que juntas somam até 10% dela, ficam em Outras atividades (cinza). Pequeno, o bloco mostra menos atividades nas câmaras menores; ampliado, mostra todas as que passam da regra dos 10%.`} help="Clique numa atividade para ver os CNPJs sem registro dela. Não estar no cadastro não quer dizer irregular." exportar={exportarArvore(ctx)}><ArvoreMercado ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} vazio={vazio} id="reg" area="reg" title="Registro e anuidade" question="Por dentro, as empresas com atividade de engenharia pela situação do registro: ativo, inativo (já teve registro) ou nunca registrada. Por fora, as registradas pela situação da anuidade: em dia ou em atraso. Clique numa fatia para ver as empresas." exportar={exportarSituacoes(ctx, flow)}><Situacoes ctx={ctx} flow={flow} /></Bloco>
    <Bloco ctx={ctx} vazio={vazio} id="cv" area="cv" title="Receita comparada com o cadastro" question="Em cima, barras de 100% dos estabelecimentos ativos na Receita com atividade da lista do Crea-SP: os que têm registro, os que só tiveram registro no passado e os que nunca apareceram no cadastro, em todas as atividades (a mesma conta do cartão “Parte do mercado que está registrada”) e em cada classe, com o total à direita. Embaixo, as empresas registradas pela situação do CNPJ da matriz na Receita: ativa, baixada, suspensa ou inapta." help="Registro ativo com CNPJ baixado ou inapto é cadastro inflado e anuidade incobrável. Clique numa barra para ver os CNPJs ou as empresas." exportar={exportarConciliacao(ctx)}><Conciliacao ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} vazio={vazio} id="sk" area="sk" title="Do mercado à ART" question="Quantas empresas com atividade de engenharia têm registro e, destas, quantas têm responsável técnico e quantas registraram alguma ART no período. A primeira etapa mostra a parte do universo; as seguintes, a parte das registradas. Clique numa faixa para ver as empresas." exportar={exportarFunil(flow)}><Funil ctx={ctx} flow={flow} /></Bloco>
    <Bloco ctx={ctx} vazio={vazio} id="cp" area="cp" title="Registradas por câmara e porte" question="Barras de 100%: a parte de cada porte nas empresas registradas de cada câmara, com o total da câmara à direita. A câmara vem da atividade principal da empresa, e o porte é o declarado à Receita Federal." help="Clique numa barra para ver as empresas; a gaveta permite filtrar a página inteira pela câmara." exportar={exportarCamaraPorte(ctx)}><CamaraPorte ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} vazio={vazio} id="ic" area="ic" title="Tempo de registro e capital social" question="As empresas registradas pelo tempo desde o primeiro registro no Crea-SP (linhas) e pela faixa do capital social declarado à Receita (colunas). Quanto mais escura a célula, mais empresas." help="Muitas empresas novas pedem acompanhamento da anuidade e do responsável técnico. O capital é declarado na abertura e nem sempre é atualizado." exportar={exportarIdadeCapital(ctx)}><IdadeCapital ctx={ctx} /></Bloco>
  </div>;
}
