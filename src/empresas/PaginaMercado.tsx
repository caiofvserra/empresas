import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { complianceFlow } from '../gestao-v14/metrics';
import { int, pct } from '../painel/ui';
import { cadastroIncompleto } from '../domain/empresas';
import type { CockpitCtx } from '../cockpit/contexto';
import { pagamento } from '../cockpit/medidas';
import { Bloco, Indicador } from '../cockpit/ui';
import { ArvoreMercado, CamaraPorte, Conciliacao, Funil, IdadeCapital, MapaMercado, Situacoes, metricasMapa } from './blocos';
import type { MetricaMapa } from './blocos';

/** Painel de Empresas, página 1: o tamanho do mercado de engenharia, quanto dele está registrado e em que atividades estão as que faltam. */
export default function PaginaMercado({ ctx }: { ctx: CockpitCtx }) {
  const { model, scope, metas } = ctx, c = ctx.norte.cobertura, n = ctx.norte.contagens;
  const flow = useMemo(() => complianceFlow(model, scope), [model, scope]);
  const pay = pagamento(model), ativas = model.metadata.activeCompanyIds, incompleto = useMemo(() => cadastroIncompleto(scope, model), [scope, model]);
  const semRegistro = c.porClasse.Sim['Sem correspondência'];
  const [metrica, setMetrica] = useState<MetricaMapa>('cobertura');
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
    <Bloco ctx={ctx} id="mp" area="mp" title="Mapa das regionais" question="Cada município aparece com o seu limite e é pintado pela regional a que pertence, no indicador escolhido. As cores dividem as regionais em cinco faixas, e a lista ao lado as põe em ordem." help="Passe o mouse num município para ver também os números dele. Clique num município ou numa regional da lista para ver as empresas ou os CNPJs daquela regional. Escolha uma regional ou um município no alto da tela para aproximar o mapa."
      actions={<label className="ck-select is-compact"><span className="sr-only">Indicador do mapa</span><select value={metrica} onChange={event => setMetrica(event.target.value as MetricaMapa)}>{(Object.keys(metricasMapa) as MetricaMapa[]).map(id => <option key={id} value={id}>{metricasMapa[id].label}</option>)}</select><ChevronDown size={14} /></label>}><MapaMercado ctx={ctx} metrica={metrica} /></Bloco>
    <Bloco ctx={ctx} id="tm" area="tm" title="Mercado por câmara e atividade" question="Cada retângulo grande é uma câmara, e os de dentro são as atividades (CNAE) da lista do Crea-SP. O tamanho é o número de estabelecimentos, e a cor, a parte registrada: vermelho é pouco registrado, azul é muito." help="Clique numa atividade para ver os CNPJs sem registro dela. Não estar no cadastro não quer dizer irregular."><ArvoreMercado ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="reg" area="reg" title="Registro e anuidade" question="Por dentro, as empresas com atividade de engenharia pela situação do registro. Por fora, as registradas pela situação da anuidade."><Situacoes ctx={ctx} flow={flow} /></Bloco>
    <Bloco ctx={ctx} id="cv" area="cv" title="Receita comparada com o cadastro" question="Estabelecimentos ativos na Receita com atividade da lista do Crea-SP, separados entre os que têm registro, os que só tiveram registro no passado e os que nunca apareceram no cadastro." help="“Sim” reúne as atividades em que o registro é obrigatório; “Passível” reúne as que dependem de análise. O número ao lado da barra é a parte registrada."><Conciliacao ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="sk" area="sk" title="Do mercado à ART" question="Quantas empresas com atividade de engenharia têm registro, quantas destas têm responsável técnico e quantas registraram alguma ART no período. Clique numa faixa para ver as empresas."><Funil ctx={ctx} flow={flow} /></Bloco>
    <Bloco ctx={ctx} id="cp" area="cp" title="Registradas por câmara e porte" question="A câmara vem da atividade principal da empresa, e o porte é o declarado à Receita Federal."><CamaraPorte ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ic" area="ic" title="Tempo de registro e capital social" question="As empresas registradas pelo tempo desde o primeiro registro no Crea-SP (linhas) e pela faixa do capital social declarado à Receita (colunas). Quanto mais escura a célula, mais empresas." help="Muitas empresas novas pedem acompanhamento da anuidade e do responsável técnico. O capital é declarado na abertura e nem sempre é atualizado."><IdadeCapital ctx={ctx} /></Bloco>
  </div>;
}
