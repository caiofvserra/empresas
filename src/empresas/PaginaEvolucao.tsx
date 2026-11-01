import { useMemo } from 'react';
import { int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { entradasSaidas } from '../cockpit/medidas';
import { Bloco, Indicador } from '../cockpit/ui';
import { Dinamica, EntradasSaidas, Ritmo, useRitmo } from './blocos';

/** Painel de Empresas, página 2: economia, aberturas na Receita e registros no Crea-SP lado a lado, e quem entra e sai da base. */
export default function PaginaEvolucao({ ctx }: { ctx: CockpitCtx }) {
  const r = useRitmo(ctx), a = ctx.mercado.aberturas, p12 = ctx.mercado.permanencia.find(row => row.mesesAtras === 12);
  const meses = useMemo(() => entradasSaidas(ctx.history, ctx.f).filter(row => row.month >= ctx.janela.start.slice(0, 7) && row.month <= ctx.janela.end.slice(0, 7)), [ctx.history, ctx.f, ctx.janela]);
  const entradas = meses.flatMap(row => [...row.viaFiscalizacao, ...row.demais]), saidas = meses.flatMap(row => row.saidas), viaFiscal = meses.flatMap(row => row.viaFiscalizacao);
  const sinal = (value: number | null) => value === null ? null : value;
  return <div className="ck-grid ck-grid-evolucao">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores da evolução das empresas">
      <Indicador ficha="k-entradas" ctx={ctx} label="Empresas que entraram na base" value={int(entradas.length)} sub={`${int(viaFiscal.length)} depois de uma ação da fiscalização`}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas que entraram na base no período', what: 'Empresas que passaram a ter registro ativo no período escolhido no alto da tela.', ids: entradas })} />
      <Indicador ficha="k-saidas" ctx={ctx} label="Empresas que saíram da base" value={int(saidas.length)} sub={`saldo de ${entradas.length - saidas.length >= 0 ? '+' : ''}${int(entradas.length - saidas.length)} no período`}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas que saíram da base no período', what: 'Empresas cujo registro deixou de estar ativo no período (baixa ou cancelamento).', ids: saidas })} />
      <Indicador ficha="k-aberturas" ctx={ctx} label="Empresas de engenharia abertas em 24 meses" value={int(a.total)} sub={`${a.total ? pct(a.comRegistro / a.total * 100) : '—'} delas já se registraram`}
        onOpen={() => ctx.open({ kind: 'cnpjs', title: 'Abertas na Receita nos últimos 24 meses', what: 'Estabelecimentos com atividade da lista do Crea-SP abertos nos 24 meses anteriores à data escolhida.', ids: a.ids })} />
      <Indicador ficha="k-permanencia" ctx={ctx} label="Continuam registradas depois de 12 meses" value={p12?.taxa == null ? '—' : pct(p12.taxa, 1)} sub={p12 ? `${int(p12.permanecem.length)} de ${int(p12.coorte.length)} empresas` : ''} />
      <Indicador ficha="k-emprego" ctx={ctx} label="Emprego formal em engenharia" value={int(r.pontos.at(-1)?.emprego ?? 0)} variacao={{ value: sinal(r.variacao.emprego), label: 'em 24 meses' }} sub="empregados com carteira no último mês" />
    </section>
    <Bloco ctx={ctx} id="ec" area="ec" title="Economia, empresas abertas e registros no Crea-SP" question="Cinco séries que começam em 100 no primeiro mês, para comparar o ritmo de cada uma: o emprego formal em engenharia, o PIB dos municípios, o crédito a empresas de engenharia, as empresas de engenharia abertas na Receita e as que se registraram no Crea-SP. Clique num mês para ver as empresas que se registraram nos 12 meses até ele."><Ritmo ctx={ctx} r={r} /></Bloco>
    <Bloco ctx={ctx} id="es" area="es" title="Empresas que entraram e saíram, mês a mês" question="Acima da linha do zero estão os registros novos de cada mês, com destaque para os que vieram depois de uma ação de fiscalização. Abaixo estão as baixas. A linha mostra o total de empresas registradas."><EntradasSaidas ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ab" area="ab" title="Empresas abertas e empresas que continuam registradas" question="À esquerda, os estabelecimentos com atividade de engenharia abertos na Receita nos últimos 24 meses e quantos já se registraram. À direita, das empresas registradas há 3, 6 e 12 meses, quantas continuam registradas."><Dinamica ctx={ctx} /></Bloco>
  </div>;
}
