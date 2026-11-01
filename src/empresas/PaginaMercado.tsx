import { useMemo } from 'react';
import { complianceFlow } from '../gestao-v14/metrics';
import { int, pct } from '../painel/ui';
import { cadastroIncompleto } from '../domain/empresas';
import type { CockpitCtx } from '../cockpit/contexto';
import { pagamento } from '../cockpit/medidas';
import { Bloco, Indicador } from '../cockpit/ui';
import { Antiguidade, CamaraPorte, Capital, CnaeMercado, CoberturaGre, Conciliacao, Contagens, Funil, MercadoCamara, Situacoes } from './blocos';

/** Painel de Empresas, página 1: o tamanho do mercado de engenharia, quanto dele está registrado e em que atividades estão as que faltam. */
export default function PaginaMercado({ ctx }: { ctx: CockpitCtx }) {
  const { model, scope, metas } = ctx, c = ctx.norte.cobertura, n = ctx.norte.contagens;
  const flow = useMemo(() => complianceFlow(model, scope), [model, scope]);
  const pay = pagamento(model), ativas = model.metadata.activeCompanyIds, incompleto = useMemo(() => cadastroIncompleto(scope, model), [scope, model]);
  const semRegistro = c.porClasse.Sim['Sem correspondência'];
  return <div className="ck-grid ck-grid-mercado">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores do mercado e do registro">
      <Indicador ficha="k-empresas" ctx={ctx} label="Empresas registradas" value={int(n.raizes)} sub={`${int(n.estabelecimentos)} estabelecimentos e ${int(n.registros)} registros e vistos`}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas registradas', what: 'Empresas, contadas pela raiz do CNPJ, com ao menos um registro ou visto ativo na data escolhida.', ids: ativas })} />
      <Indicador destaque ficha="k-cobertura" ctx={ctx} label="Parte do mercado que está registrada" value={c.taxa === null ? '—' : pct(c.taxa, 1)} meta={{ atual: c.taxa, alvo: metas.cobertura }} variacao={{ value: c.taxa === null ? null : c.taxa - metas.cobertura, kind: 'pp', label: `em relação à meta de ${metas.cobertura}%` }}
        sub={`nas atividades de registro obrigatório, ${c.taxaSim === null ? '—' : pct(c.taxaSim, 1)}`} />
      <Indicador ficha="k-sem-registro" ctx={ctx} label="Atividade obrigatória e nenhum registro" value={int(semRegistro.length)} sub="estabelecimentos que nunca apareceram no cadastro"
        onOpen={() => ctx.open({ kind: 'cnpjs', title: 'Atividade de registro obrigatório e nenhum registro', what: 'Estabelecimentos ativos na Receita com atividade de registro obrigatório (“Sim”) que nunca tiveram registro ou visto no Crea-SP.', use: 'Não estar no cadastro não quer dizer irregular. Confirme a atividade antes de orientar ou notificar.', ids: semRegistro })} />
      <Indicador ficha="k-quitacao" ctx={ctx} label="Registradas em dia com a anuidade" value={pct(pay.emDia.length / Math.max(1, ativas.length) * 100)} sub={`${int(pay.inadimplentes.length)} empresas registradas com anuidade vencida`}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas registradas com anuidade vencida', what: 'Empresas registradas com anuidade vencida na data escolhida. Sem quitação, elas não conseguem a certidão de registro e quitação exigida em licitações.', ids: pay.inadimplentes })} />
      <Indicador ficha="k-cadastro" ctx={ctx} label="Registradas com cadastro incompleto" value={int(incompleto.ids.length)} sub={incompleto.porTipo[0] ? `a pendência mais comum: ${incompleto.porTipo[0].tipo}` : 'nenhuma pendência aberta'}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas registradas com cadastro incompleto', what: 'Empresas registradas com pendência aberta no cadastro, como atividade não informada, regional não identificada ou município diferente do da Receita.', use: 'Corrigir o cadastro antes de usar a empresa em qualquer contagem por câmara, atividade ou regional.', ids: incompleto.ids })} />
    </section>
    <Bloco ctx={ctx} id="tc" area="tc" title="Empresas, estabelecimentos e registros" question="Três números que medem coisas diferentes e não devem ser somados: empresas (pela raiz do CNPJ), estabelecimentos (cada CNPJ completo) e registros ativos no Crea-SP." help="Uma empresa pode ter vários estabelecimentos, e cada estabelecimento pode ter mais de um registro ou visto. Empresas inativas são as que já tiveram registro e hoje não têm nenhum."><Contagens ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="cv" area="cv" title="Receita Federal comparada com o cadastro do Crea-SP" question="Estabelecimentos ativos na Receita com atividade (CNAE) da lista do Crea-SP, separados entre os que têm registro, os que só tiveram registro no passado e os que nunca apareceram no cadastro." help="“Sim” reúne as atividades em que o registro é obrigatório; “Passível” reúne as que dependem de análise. Não encontrar a empresa no cadastro não quer dizer que ela esteja irregular, porque o CNAE não prova a atividade."><Conciliacao ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="cg" area="cg" title="Registro obrigatório em cada regional" question="Em cada regional, a parte dos estabelecimentos com atividade de registro obrigatório que está registrada, que só tem registro antigo e que nunca foi encontrada no cadastro. Clique numa faixa para ver os CNPJs."><CoberturaGre ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="reg" area="reg" title="Situação do registro e da anuidade" question="À esquerda, as empresas com atividade de engenharia pela situação do registro no Crea-SP. À direita, as registradas que estão em dia ou atrasadas com a anuidade."><Situacoes ctx={ctx} flow={flow} /></Bloco>
    <Bloco ctx={ctx} id="mc" area="mc" title="Mercado de cada câmara" question="Cada barra é o número de estabelecimentos com atividade da câmara. As cores dizem quantos estão registrados e em dia, registrados com atraso, sem registro mas já procurados pela fiscalização, e sem registro nem ação. Clique numa faixa para ver os CNPJs."><MercadoCamara ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="cn" area="cn" title="Atividades com mais estabelecimentos sem registro" question="As doze atividades (CNAE) da lista do Crea-SP com mais estabelecimentos ativos na Receita e sem registro. O número ao lado da barra é a parte da atividade que já está registrada."><CnaeMercado ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="sk" area="sk" title="Do mercado à ART" question="Quantas empresas com atividade de engenharia têm registro, quantas destas têm responsável técnico e quantas registraram alguma ART no período. Clique numa faixa para ver as empresas."><Funil ctx={ctx} flow={flow} /></Bloco>
    <Bloco ctx={ctx} id="cp" area="cp" title="Empresas registradas por câmara e porte" question="A câmara vem da atividade principal da empresa, e o porte é o declarado à Receita Federal."><CamaraPorte ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="an" area="an" title="Há quanto tempo as empresas estão registradas" question="Empresas registradas pelo tempo desde o primeiro registro no Crea-SP. Muitas empresas com menos de um ano pedem acompanhamento da anuidade e do responsável técnico."><Antiguidade ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="kc" area="kc" title="Capital social das empresas registradas" question="Empresas registradas pela faixa do capital social declarado à Receita Federal. Ajuda a ler o porte real da base, além do porte declarado."><Capital ctx={ctx} /></Bloco>
  </div>;
}
