import { useMemo } from 'react';
import { brl, int } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador } from '../cockpit/ui';
import type { Evolucao } from '../painel/evolucao';
import { abrirProcessos, change, g } from './comum';
import { Decisoes, EstoqueFase, IdadeCalor, Plenario, Prescricao, Ritmo, exportarDecisoes, exportarEstoque, exportarIdade, exportarPlenario, exportarPrescricao, exportarRitmo } from './blocos-camaras';

/** Painel de Gestão do Conselho, página 3: o trabalho das câmaras especializadas e a composição do plenário. */
export default function PaginaCamaras({ ctx }: { ctx: CockpitCtx }) {
  const gest = g(ctx), q = gest.camaras, { tokens } = ctx;
  const series = useMemo(() => {
    const ultimos = q.mensal.slice(-gest.meses.length), meses = ultimos.map(row => row.month);
    return { estoque: { tipo: 'estoque', meses, valores: ultimos.map(row => row.estoque), fmt: int, goodUp: false } as Evolucao, julgados: { tipo: 'fluxo', meses, valores: ultimos.map(row => row.julgados), fmt: int } as Evolucao,
      recursos: { tipo: 'estoque', meses, valores: ultimos.map(row => row.recursos), fmt: int, goodUp: false } as Evolucao };
  }, [q, gest.meses]);
  const multas = q.emRisco.reduce((n, row) => n + (row.multa ?? 0), 0);
  const ordem = <T extends { entrada: string }>(rows: T[]) => [...rows].sort((a, b) => a.entrada.localeCompare(b.entrada));
  return <div className="ck-grid ck-grid-cs-camaras">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores das câmaras e do plenário">
      <Indicador destaque ficha="k-estoque" ctx={ctx} label="Processos em julgamento" serie={series.estoque} value={int(q.estoque.length)} variacao={{ value: q.mensal.length > 12 ? change(q.estoque.length, q.mensal.at(-13)!.estoque) : null, goodUp: false, label: 'em relação ao mesmo mês do ano anterior' }} spark={q.mensal.slice(-12).map(row => row.estoque)} cor={tokens.accent}
        sub={`${int(q.entradas)} entraram no período`} onOpen={() => abrirProcessos(ctx, 'Processos em julgamento', ordem(q.estoque), 'Processos que já entraram nas câmaras e ainda não foram julgados, na data escolhida.')} />
      <Indicador ficha="k-julgados" ctx={ctx} label="Julgados no período" serie={series.julgados} value={int(q.julgados.length)} variacao={{ value: change(q.julgados.length, q.julgadosAntes) }}
        sub={`contra ${int(q.entradas)} que entraram`} onOpen={() => abrirProcessos(ctx, 'Processos julgados no período', ordem(q.julgados), 'Processos julgados pelas câmaras no período escolhido.')} />
      <Indicador ficha="k-tempo" ctx={ctx} label="Tempo até o julgamento" value={q.medianaDias === null ? '—' : `${int(q.medianaDias)} dias`} variacao={{ value: q.medianaDias === null || q.medianaDiasAntes === null ? null : change(q.medianaDias, q.medianaDiasAntes), goodUp: false }} sub="tempo típico (mediana) dos julgados no período" />
      <Indicador ficha="k-prescricao" ctx={ctx} label="Autos perto da prescrição" value={int(q.emRisco.length)} sub={`${brl(multas)} em multas prescrevem em até 12 meses, e ${int(q.prescritos.length)} autos já prescreveram no período`}
        onOpen={() => abrirProcessos(ctx, 'Autos perto da prescrição', [...q.emRisco].sort((a, b) => a.prescreveEm!.localeCompare(b.prescreveEm!)), 'Autos de infração sem julgamento que completam cinco anos do fato em até 12 meses (Lei 9.873/1999, art. 1º).', 'Paute primeiro os que prescrevem antes.')} />
      <Indicador ficha="k-recursos" ctx={ctx} label="Recursos esperando o plenário" serie={series.recursos} value={int(q.recursos.length)} variacao={{ value: change(q.recursos.length, q.recursosAntes), goodUp: false, label: 'em relação ao mesmo mês do ano anterior' }} spark={q.mensal.slice(-12).map(row => row.recursos)} cor={tokens.blue}
        sub="decisões das câmaras levadas ao plenário" onOpen={() => abrirProcessos(ctx, 'Recursos esperando o plenário', ordem(q.recursos), 'Processos em que a parte recorreu da decisão da câmara e o plenário ainda não julgou.')} />
    </section>
    <Bloco ctx={ctx} id="es" area="es" title="Em julgamento em cada câmara" exportar={exportarEstoque(ctx)}><EstoqueFase ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="rt" area="rt" title="Entraram e foram julgados por mês" exportar={exportarRitmo(ctx)}><Ritmo ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="id" area="id" title="Há quanto tempo esperam julgamento" exportar={exportarIdade(ctx)}><IdadeCalor ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="pz" area="pz" title="Autos que prescrevem em 12 meses" exportar={exportarPrescricao(ctx)}><Prescricao ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="de" area="de" title="O que as câmaras decidiram nos autos" exportar={exportarDecisoes(ctx)}><Decisoes ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="pl" area="pl" title="Plenário e profissionais de cada câmara" exportar={exportarPlenario(ctx)}><Plenario ctx={ctx} /></Bloco>
  </div>;
}
