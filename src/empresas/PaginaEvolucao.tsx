import { useMemo } from 'react';
import { int, pct } from '../painel/ui';
import { primeirosRegistros } from '../domain/empresas';
import type { CockpitCtx } from '../cockpit/contexto';
import { entradasSaidas, primeirasEntradas } from '../cockpit/medidas';
import { Bloco, Indicador } from '../cockpit/ui';
import { Dinamica, EntradasSaidas, RegistrosCalor, Ritmo, exportarDinamica, exportarEntradasSaidas, exportarRegistrosCalor, exportarRitmo, useRitmo } from './blocos';

/** Painel de Empresas, página 2: economia, aberturas na Receita e registros no Crea-SP lado a lado, e quem entra e sai da base. */
export default function PaginaEvolucao({ ctx }: { ctx: CockpitCtx }) {
  const r = useRitmo(ctx), a = ctx.mercado.aberturas, p12 = ctx.mercado.permanencia.find(row => row.mesesAtras === 12), nMeses = ctx.janela.months.length;
  const meses = useMemo(() => entradasSaidas(ctx.history, ctx.f).filter(row => row.month >= ctx.janela.start.slice(0, 7) && row.month <= ctx.janela.end.slice(0, 7)), [ctx.history, ctx.f, ctx.janela]);
  const entradas = meses.flatMap(row => [...row.viaFiscalizacao, ...row.demais]), saidas = meses.flatMap(row => row.saidas), viaFiscal = meses.flatMap(row => row.viaFiscalizacao);
  // Entradas pela primeira vez e retornos (05/11/2026): o cartão conta as duas, e o calor de novos registros só o primeiro registro.
  const origem = useMemo(() => primeirasEntradas(meses, primeirosRegistros(ctx.dataset)), [meses, ctx.dataset]);
  const sinal = (value: number | null) => value === null ? null : value;
  return <div className="ck-grid ck-grid-evolucao">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores da evolução das empresas">
      <Indicador ficha="k-entradas" ctx={ctx} label="Empresas que entraram na base" value={int(entradas.length)} sub={`${int(origem.primeiras.length)} pela primeira vez, ${int(origem.retornos.length)} retornos; ${int(viaFiscal.length)} após fiscalização`}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas que entraram na base no período', what: 'Empresas que passaram a ter registro ativo no período escolhido no alto da tela, pela primeira vez ou de volta depois de uma baixa ou um cancelamento.', ids: entradas })} />
      <Indicador ficha="k-saidas" ctx={ctx} label="Empresas que saíram da base" value={int(saidas.length)} sub={`saldo de ${entradas.length - saidas.length >= 0 ? '+' : ''}${int(entradas.length - saidas.length)} no período`}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Empresas que saíram da base no período', what: 'Empresas cujo registro deixou de estar ativo no período (baixa ou cancelamento).', ids: saidas })} />
      <Indicador ficha="k-aberturas" ctx={ctx} label={`Empresas de engenharia abertas em ${nMeses} meses`} value={int(a.total)} sub={`${a.total ? pct(a.comRegistro / a.total * 100) : '—'} delas já se registraram`}
        onOpen={() => ctx.open({ kind: 'cnpjs', title: `Abertas na Receita nos últimos ${nMeses} meses`, what: `Estabelecimentos com atividade da lista do Crea-SP abertos nos ${nMeses} meses anteriores à data escolhida.`, ids: a.ids })} />
      <Indicador ficha="k-permanencia" ctx={ctx} label="Continuam registradas depois de 12 meses" value={p12?.taxa == null ? '—' : pct(p12.taxa, 1)} sub={p12 ? `${int(p12.permanecem.length)} de ${int(p12.coorte.length)} empresas` : ''} />
      <Indicador ficha="k-emprego" ctx={ctx} label="Emprego formal em engenharia" value={int(r.pontos.at(-1)?.emprego ?? 0)} variacao={{ value: sinal(r.variacao.emprego), label: `em ${nMeses} meses` }} sub="empregados com carteira no último mês" />
    </section>
    <Bloco ctx={ctx} id="ec" area="ec" title="Economia, empresas abertas e registros" question="Quatro séries que começam em 100 no primeiro mês, para comparar o ritmo de cada uma: o emprego formal em engenharia, o crédito a empresas de engenharia, as empresas de engenharia abertas na Receita e as que se registraram no Crea-SP. A série das abertas termina no último mês com arquivo da Receita. Clique num mês para ver as empresas que se registraram nos 12 meses até ele." help="Se os registros sobem menos que as aberturas, o mercado cresce mais depressa que o cadastro. A linha tracejada (crédito) depende de acordo com o Banco Central. Com um município escolhido, o emprego é o da regional dele, porque sai em totais por regional." exportar={exportarRitmo(ctx, r)}><Ritmo ctx={ctx} r={r} /></Bloco>
    <Bloco ctx={ctx} id="hm" area="hm" title="Novos registros por câmara e trimestre" question={`Cada linha é uma câmara, e cada coluna, um trimestre dos ${nMeses} meses da janela. O número é quantas empresas fizeram o primeiro registro no Crea-SP naquele trimestre. A cor compara cada câmara com ela mesma: o trimestre mais forte da linha fica mais escuro.`} help={`Clique numa célula para ver as empresas daquele trimestre e daquela câmara; a gaveta permite filtrar a página inteira pela câmara. A câmara vem da atividade principal da empresa. O total embaixo do nome é dos ${nMeses} meses.`} exportar={exportarRegistrosCalor(ctx)}><RegistrosCalor ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="es" area="es" title="Entradas e saídas, mês a mês" question="Acima da linha do zero estão os registros novos de cada mês, com destaque para os que vieram depois de uma ação de fiscalização. Abaixo estão as baixas. A linha mostra o total de empresas registradas, e a faixa sombreada é o período escolhido no alto da tela." exportar={exportarEntradasSaidas(ctx)}><EntradasSaidas ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ab" area="ab" title="Abertas na Receita e permanência" question={`À esquerda, os estabelecimentos com atividade de engenharia abertos na Receita nos últimos ${nMeses} meses e quantos já se registraram. À direita, das empresas registradas há 3, 6 e 12 meses, quantas continuam registradas.`} help="Cada linha da direita acompanha as empresas que estavam registradas naquela data; quem entrou depois não conta. As aberturas vêm do arquivo mensal da Receita, que chega com algumas semanas de atraso: o último mês antes da data escolhida pode faltar, e o gráfico termina no último mês com arquivo." exportar={exportarDinamica(ctx)}><Dinamica ctx={ctx} /></Bloco>
  </div>;
}
