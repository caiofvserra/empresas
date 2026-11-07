import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { brl, int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador } from '../cockpit/ui';
import type { Evolucao } from '../painel/evolucao';
import { municipioPorId } from '../domain/municipios';
import { MapaMunicipios, abrirDevedores, g } from '../gestao/comum';
import { Adimplencia, Cascata, Coortes, IdadeDivida, Protestos, SituacaoCnpj, adimplencia, exportarAdimplencia, exportarCascata, exportarCoortes, exportarIdadeDivida, exportarProtestos, exportarSituacaoCnpj, medidaReceita, metricasReceita } from './blocos-divida';
import type { MetricaReceita } from './blocos-divida';
import './financeiro.css';

/**
 * Painel Financeiro, página 3 (07/11/2026): o que está vencido com profissionais e empresas, o que pode ir à Justiça, o que vai a
 * protesto, o que está perto de prescrever e quem está em dia. Vem do CreaNet (no protótipo, o cenário de demonstração) e segue
 * a regional e o município do alto da tela.
 */
export default function PaginaDivida({ ctx }: { ctx: CockpitCtx }) {
  const gest = g(ctx), d = gest.divida, { tokens } = ctx, [metrica, setMetrica] = useState<MetricaReceita>('divida');
  const serie = useMemo(() => ({ tipo: 'estoque', meses: gest.meses, valores: d.mensal.map(row => row.valor), fmt: brl, curto: (value: number) => (value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 }), unidade: 'em R$ mil', goodUp: false } as Evolucao), [gest, d]);
  const recuperacao = d.cascata.inicio + d.cascata.novos > 0 ? d.cascata.recebidos / (d.cascata.inicio + d.cascata.novos) * 100 : null;
  const perto = d.devedores.filter(row => d.pertoIds.includes(row.pessoaId)), a = adimplencia(ctx).profissionais;
  const medida = useMemo(() => medidaReceita(ctx, metrica), [ctx.gestao, ctx.dataset, ctx.anchor, metrica]); // eslint-disable-line react-hooks/exhaustive-deps
  const cidades = municipioPorId(ctx.dataset), nomeGre = new Map(ctx.dataset.gres.map(row => [row.id, row.name]));
  const abrirLocal = (titulo: string, filtro: (row: typeof d.devedores[number]) => boolean) => abrirDevedores(ctx, titulo, d.devedores.filter(filtro), 'Profissionais e empresas com anuidade vencida e não paga na data escolhida.', 'Com o filtro de regional ou município no alto da tela, a lista mostra só o recorte.');
  return <div className="ck-grid fin-grid-divida">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores da dívida e da cobrança">
      <Indicador destaque ficha="k-divida" ctx={ctx} label="Anuidades vencidas" serie={serie} value={brl(d.total)} variacao={{ value: d.totalAntes ? (d.total - d.totalAntes) / d.totalAntes * 100 : null, goodUp: false, label: 'em relação ao mesmo mês do ano anterior' }} spark={d.mensal.slice(-12).map(row => row.valor)} cor={tokens.accent}
        sub={`${int(d.devedores.length)} devedores: ${brl(d.pf)} de profissionais e ${brl(d.pj)} de empresas`} onOpen={() => abrirLocal('Devedores de anuidade', () => true)} />
      <Indicador ficha="k-piso" ctx={ctx} label="Abaixo do piso de execução" value={d.total ? pct(d.abaixoDoPiso / d.total * 100) : '—'}
        sub={`${brl(d.abaixoDoPiso)} de devedores que somam menos de ${brl(d.piso)}, cobrados só fora da Justiça`} onOpen={() => abrirLocal('Devedores abaixo do piso de execução', row => !row.acimaDoPiso)} />
      <Indicador ficha="k-prescricao" ctx={ctx} label="Perto de prescrever" value={brl(d.pertoDePrescrever)} sub={`anuidades vencidas há mais de quatro anos, de ${int(perto.length)} devedores`}
        onOpen={() => abrirDevedores(ctx, 'Anuidades perto de prescrever', perto, 'Devedores com ao menos uma anuidade vencida há mais de quatro anos: ela prescreve em menos de um ano (Código Tributário Nacional, art. 174).', 'Priorize os que estão acima do piso: a inscrição em dívida ativa e a execução interrompem a prescrição.')} />
      <Indicador ficha="k-recuperacao" ctx={ctx} label="Recebido da dívida" value={recuperacao === null ? '—' : pct(recuperacao)} sub={`${brl(d.cascata.recebidos)} recebidos no período, de ${brl(d.cascata.inicio + d.cascata.novos)} vencidos`} />
      <Indicador ficha="k-adimplencia" ctx={ctx} label="Profissionais em dia" value={a.ativos ? pct((a.ativos - a.inadimplentes) / a.ativos * 100) : '—'} sub={`${int(a.inadimplentes)} dos ${int(a.ativos)} ativos com anuidade atrasada`} />
    </section>
    <Bloco ctx={ctx} id="mp" area="mp" title="Dívida de anuidade por município"
      exportar={{ cabecalho: ['Município', 'GRE', medida.label], linhas: () => [...medida.cidade].map(([id, value]) => [cidades.get(id)?.nome ?? id, nomeGre.get(cidades.get(id)?.greId ?? '') ?? '', value === null ? null : Math.round(value * 10) / 10]) }}
      actions={<label className="ck-select is-compact"><span className="sr-only">Indicador do mapa</span><select value={metrica} onChange={event => setMetrica(event.target.value as MetricaReceita)}>{(Object.keys(metricasReceita) as MetricaReceita[]).map(id => <option key={id} value={id}>{metricasReceita[id]}</option>)}</select><ChevronDown size={14} /></label>}>
      <MapaMunicipios ctx={ctx} medida={medida} onCidade={cityId => abrirLocal(`Devedores de ${cidades.get(cityId)?.nome ?? cityId}`, row => row.cityId === cityId)} onGre={greId => abrirLocal(`Devedores da ${nomeGre.get(greId) ?? greId}`, row => cidades.get(row.cityId)?.greId === greId)} />
    </Bloco>
    <Bloco ctx={ctx} id="di" area="di" title="Anuidades vencidas por idade" exportar={exportarIdadeDivida(ctx)}><IdadeDivida ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ca" area="ca" title="Entrou e saiu da dívida no período" exportar={exportarCascata(ctx)}><Cascata ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="co" area="co" title="Quanto se recebe depois do vencimento" exportar={exportarCoortes(ctx)}><Coortes ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="pt" area="pt" title="Protestos por categoria" exportar={exportarProtestos(ctx)}><Protestos ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ad" area="ad" title="Quem está em dia" exportar={exportarAdimplencia(ctx)}><Adimplencia ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="cn" area="cn" title="Dívida das empresas e o CNPJ na Receita" exportar={exportarSituacaoCnpj(ctx)}><SituacaoCnpj ctx={ctx} /></Bloco>
  </div>;
}
