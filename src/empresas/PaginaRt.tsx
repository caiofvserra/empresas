import { useMemo } from 'react';
import { quadroTecnico } from '../painel/analise';
import { Quadro } from '../painel/VisaoCadastro';
import { brl, int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { artPorCamara } from '../cockpit/medidas';
import { Bloco, Indicador } from '../cockpit/ui';
import { ArtModalidade, ArtsMes, SemArt } from './blocos';

const change = (now: number, before: number) => before > 0 ? (now - before) / before * 100 : null;

/** Painel de Empresas, página 3: responsáveis técnicos das empresas registradas e as ARTs que elas registram. */
export default function PaginaRt({ ctx }: { ctx: CockpitCtx }) {
  const { model, scope, tokens, arts, metas } = ctx;
  const qt = useMemo(() => quadroTecnico(scope, model, ctx.f), [scope, model, ctx.f]), rt = model.metrics.rtCoverage.value, ativas = model.metadata.activeCompanyIds;
  const semArt = useMemo(() => artPorCamara(ctx.dataset, model), [ctx.dataset, model]), semArtIds = semArt.flatMap(row => row.semArt), comAtivas = semArt.reduce((total, row) => total + row.ativas.length, 0);
  return <div className="ck-grid ck-grid-rt">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores de responsabilidade técnica e ART">
      <Indicador destaque ficha="k-rt" ctx={ctx} label="Empresas com responsável técnico" value={rt === null ? '—' : pct(rt)} meta={{ atual: rt, alvo: metas.rt }} variacao={{ value: rt === null ? null : rt - metas.rt, kind: 'pp', label: `em relação à meta de ${metas.rt}%` }} sub={`${int(qt.comRt.length)} de ${int(ativas.length)} empresas registradas`}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas registradas sem responsável técnico', what: 'Empresas com registro ativo sem responsável técnico de vínculo vigente: o RT saiu sem substituto ou nenhum vínculo foi carregado.', use: 'Notifique as que perderam o RT; confira o cadastro das que não têm nenhum vínculo.', ids: [...qt.rtBaixado, ...qt.semVinculo] })} />
      <Indicador ficha="k-rt-baixado" ctx={ctx} label="RT que saiu sem substituto" value={int(qt.rtBaixado.length)} sub="empresas sem novo responsável técnico 30 dias depois da saída"
        onOpen={() => ctx.open({ kind: 'empresas', title: 'RT que saiu sem substituto', what: 'Empresas com registro ativo cujo último responsável técnico saiu há mais de 30 dias, sem outro no lugar.', ids: qt.rtBaixado })} />
      <Indicador ficha="k-arts" ctx={ctx} label="ARTs de empresas" value={int(arts.atual.length)} variacao={{ value: change(arts.atual.length, arts.antes) }} spark={arts.mensal} cor={tokens.blue} sub={`${int(new Set(arts.atual.map(row => row.companyId)).size)} empresas com ART no período`}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas com ART no período', what: 'Empresas com ao menos uma ART registrada no período.', ids: [...new Set(arts.atual.map(row => row.companyId))] })} />
      <Indicador ficha="k-valor-art" ctx={ctx} label="Valor declarado em ART" value={brl(arts.valor)} variacao={{ value: change(arts.valor, arts.valorAntes) }} sub="soma do valor de contrato das ARTs" />
      <Indicador ficha="k-sem-art" ctx={ctx} label="Registradas sem nenhuma ART" value={pct(semArtIds.length / Math.max(1, comAtivas) * 100)} sub={`${int(semArtIds.length)} empresas registradas sem ART no período`}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas registradas sem ART no período', what: 'Empresas com registro ativo e nenhuma ART registrada no período.', use: 'Verifique se a empresa está em atividade; se estiver, oriente sobre a obrigação de ART (Lei 6.496/77).', ids: semArtIds })} />
    </section>
    <Bloco ctx={ctx} id="qt" area="qt" title="Responsáveis técnicos" question="Quantas empresas registradas têm responsável técnico e quantas empresas cada profissional assume." help="Quando um profissional responde por mais de três empresas, vale conferir se há tempo e área de atuação compatíveis, conforme o limite da norma vigente."><Quadro ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="am" area="am" title="ARTs por modalidade" question="Cada pétala é uma modalidade, e o tamanho dela é o número de ARTs registradas no período. Clique numa pétala para ver as empresas."><ArtModalidade ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ar" area="ar" title="ARTs mês a mês" question="ARTs registradas por empresas em cada um dos últimos 24 meses, com a linha do mesmo mês um ano antes. Uma queda pode ser menos atividade ou menos ARTs registradas."><ArtsMes ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="sa" area="sa" title="Registradas sem ART, por câmara" question="Cada anel é uma câmara, e o arco mostra a parte das empresas registradas que não registrou nenhuma ART no período." help="Pode ser atividade sem ART ou empresa parada. Clique num anel para ver as empresas."><SemArt ctx={ctx} /></Bloco>
  </div>;
}
