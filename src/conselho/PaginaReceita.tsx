import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { brl, int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador } from '../cockpit/ui';
import type { Evolucao } from '../painel/evolucao';
import { municipioPorId } from '../domain/municipios';
import { abrirDevedores, g } from './comum';
import { Arrecadacao, Cascata, Coortes, IdadeDivida, PrevistoRealizado, SituacaoCnpj, exportarArrecadacao, exportarCascata, exportarCoortes, exportarIdadeDivida, exportarPrevisto, exportarSituacaoCnpj, medidaReceita, metricasReceita } from './blocos-receita';
import type { MetricaReceita } from './blocos-receita';
import { MapaMunicipios } from './comum';

/** Painel de Gestão do Conselho, página 1: quanto o Conselho arrecada, quanto está vencido, o que pode ir à Justiça e o que está perto de prescrever. */
export default function PaginaReceita({ ctx }: { ctx: CockpitCtx }) {
  const gest = g(ctx), d = gest.divida, { tokens, period } = ctx, [metrica, setMetrica] = useState<MetricaReceita>('divida');
  const meses = gest.meses, periodo = gest.receitaMensal.slice(-period), arrecadado = periodo.reduce((n, row) => n + row.total, 0);
  const antes = periodo.every(row => row.antes !== null) ? periodo.reduce((n, row) => n + row.antes!, 0) : null;
  const series = useMemo(() => {
    const mil = (value: number) => (value / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    return { arrecadacao: { tipo: 'fluxo', meses, valores: gest.receitaMensal.map(row => row.total), fmt: brl, curto: mil, unidade: 'em R$ milhões' } as Evolucao,
      divida: { tipo: 'estoque', meses, valores: d.mensal.map(row => row.valor), fmt: brl, curto: (value: number) => (value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 }), unidade: 'em R$ mil', goodUp: false } as Evolucao };
  }, [gest, meses, d]);
  const recuperacao = d.cascata.inicio + d.cascata.novos > 0 ? d.cascata.recebidos / (d.cascata.inicio + d.cascata.novos) * 100 : null;
  const perto = d.devedores.filter(row => d.pertoIds.includes(row.pessoaId));
  const medida = useMemo(() => medidaReceita(ctx, metrica), [ctx.gestao, ctx.dataset, ctx.anchor, metrica]); // eslint-disable-line react-hooks/exhaustive-deps
  const cidades = municipioPorId(ctx.dataset), nomeGre = new Map(ctx.dataset.gres.map(row => [row.id, row.name]));
  const abrirLocal = (titulo: string, filtro: (row: typeof d.devedores[number]) => boolean) => abrirDevedores(ctx, titulo, d.devedores.filter(filtro), 'Profissionais e empresas com anuidade vencida e não paga na data escolhida.', 'Com o filtro de regional ou município no alto da tela, a lista mostra só o recorte.');
  return <div className="ck-grid ck-grid-cs-receita">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores de receita e dívida">
      <Indicador destaque ficha="k-arrecadacao" ctx={ctx} label="Receita do Conselho" serie={series.arrecadacao} value={brl(arrecadado)} variacao={{ value: antes ? (arrecadado - antes) / antes * 100 : null }} spark={gest.receitaMensal.slice(-12).map(row => row.total)} cor={tokens.accent}
        sub={`em ${period} meses, de anuidades, ARTs, multas e outras origens`} />
      <Indicador ficha="k-divida" ctx={ctx} label="Anuidades vencidas" serie={series.divida} value={brl(d.total)} spark={d.mensal.slice(-12).map(row => row.valor)} cor={tokens.bad}
        sub={`${brl(d.pf)} de profissionais e ${brl(d.pj)} de empresas · ${int(d.devedores.length)} devedores`} onOpen={() => abrirLocal('Devedores de anuidade', () => true)} />
      <Indicador ficha="k-piso" ctx={ctx} label="Abaixo do piso de execução" value={d.total ? pct(d.abaixoDoPiso / d.total * 100) : '—'}
        sub={`${brl(d.abaixoDoPiso)} de devedores que somam menos de ${brl(d.piso)}, cobrados só fora da Justiça`} onOpen={() => abrirLocal('Devedores abaixo do piso de execução', row => !row.acimaDoPiso)} />
      <Indicador ficha="k-prescricao" ctx={ctx} label="Perto de prescrever" value={brl(d.pertoDePrescrever)} sub={`anuidades vencidas há mais de quatro anos, de ${int(perto.length)} devedores`}
        onOpen={() => abrirDevedores(ctx, 'Anuidades perto de prescrever', perto, 'Devedores com ao menos uma anuidade vencida há mais de quatro anos: ela prescreve em menos de um ano (Código Tributário Nacional, art. 174).', 'Priorize os que estão acima do piso: a inscrição em dívida ativa e a execução interrompem a prescrição.')} />
      <Indicador ficha="k-recuperacao" ctx={ctx} label="Recebido da dívida" value={recuperacao === null ? '—' : pct(recuperacao)} sub={`${brl(d.cascata.recebidos)} recebidos no período, de ${brl(d.cascata.inicio + d.cascata.novos)} vencidos`} />
    </section>
    <Bloco ctx={ctx} id="ra" area="ra" title="Receita por mês e origem" exportar={exportarArrecadacao(ctx)}><Arrecadacao ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="pr" area="pr" title="Previsto e realizado no ano" exportar={exportarPrevisto(ctx)}><PrevistoRealizado ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="di" area="di" title="Anuidades vencidas por idade" exportar={exportarIdadeDivida(ctx)}><IdadeDivida ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ca" area="ca" title="Entrou e saiu da dívida no período" exportar={exportarCascata(ctx)}><Cascata ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="co" area="co" title="Quanto se recebe depois do vencimento" exportar={exportarCoortes(ctx)}><Coortes ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="cn" area="cn" title="Dívida das empresas e o CNPJ na Receita" exportar={exportarSituacaoCnpj(ctx)}><SituacaoCnpj ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mp" area="mp" title="Dívida de anuidade por município"
      exportar={{ cabecalho: ['Município', 'GRE', medida.label], linhas: () => [...medida.cidade].map(([id, value]) => [cidades.get(id)?.nome ?? id, nomeGre.get(cidades.get(id)?.greId ?? '') ?? '', value === null ? null : Math.round(value * 10) / 10]) }}
      actions={<label className="ck-select is-compact"><span className="sr-only">Indicador do mapa</span><select value={metrica} onChange={event => setMetrica(event.target.value as MetricaReceita)}>{(Object.keys(metricasReceita) as MetricaReceita[]).map(id => <option key={id} value={id}>{metricasReceita[id]}</option>)}</select><ChevronDown size={14} /></label>}>
      <MapaMunicipios ctx={ctx} medida={medida} onCidade={cityId => ctx.filtrar({ cidade: cityId })} onGre={greId => ctx.filtrar({ gre: greId })} />
    </Bloco>
  </div>;
}
