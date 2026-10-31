import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Ctx } from './contexto';
import { pares, segmentos, tercil, tipos, variacao } from './analise';
import type { ParId, Segmento } from './analise';
import type { Origem, StatusMulta, Tipo } from './fiscalizacao';
import { tipoLabel } from './fiscalizacao';
import { Chart, useSpMap } from './chart';
import { rotulosGre, territorioGre } from './territorio';
import { Card, Delta, Segments, Tile, brl, inkOn, int, mes, pct, short } from './ui';

/** Visão 1 · Fiscalização: do alvo identificado à regularização, com o território e a eficácia por origem. */
export const corTipo = (tokens: Ctx['tokens']): Record<Tipo, string> => ({ registro: tokens.blue, rt: tokens.cat[2], art: tokens.accent });
export const corSegmento = (tokens: Ctx['tokens']): Record<Segmento, string> => ({ 'Regularizado após auto': tokens.good, 'Regularizado na notificação': tokens.cat[4], 'Autuado, sem regularizar': tokens.bad, 'Notificado, sem regularizar': tokens.warn, 'Sem ação': tokens.heat[1] });
const corStatus = (tokens: Ctx['tokens']): Record<StatusMulta, string> => ({ Paga: tokens.good, 'Em prazo de defesa': tokens.heat[1], 'Em julgamento': tokens.warn, 'Dívida ativa': tokens.bad, Cancelada: tokens.line });
const corOrigem = (tokens: Ctx['tokens']): Record<Origem, string> => ({ 'Cruzamento Receita (CNAE)': tokens.blue, 'Contrato público (PNCP)': tokens.accent, Denúncia: tokens.cat[2], 'Rotina de campo': tokens.cat[3], 'Cadastro CREA': tokens.cat[4] });

export default function VisaoFiscalizacao({ ctx }: { ctx: Ctx }) {
  const { resumo, tokens } = ctx;
  const abertos = tipos.reduce((sum, tipo) => sum + resumo.abertos[tipo].length, 0);
  const mensal = resumo.mensal, colors = corTipo(tokens), status = corStatus(tokens);
  return <>
    <section className="chain" aria-label="Cadeia da fiscalização">
      <Card label="Irregularidades identificadas" value={int(abertos)} onOpen={() => ctx.open({ kind: 'alvos' })}
        extra={<Segments parts={tipos.map(tipo => ({ label: tipoLabel[tipo], value: resumo.abertos[tipo].length, color: colors[tipo] }))} />}
        sub={<>{tipos.map(tipo => <span key={tipo} className="legend-dot"><i style={{ background: colors[tipo] }} />{int(resumo.abertos[tipo].length)} {tipo === 'registro' ? 'sem registro' : tipo === 'rt' ? 'RT baixado' : 'obra sem ART'}</span>)}<br />{pct(resumo.abertosComAcao / Math.max(1, abertos) * 100)} já tiveram alguma ação</>} />
      <ChevronRight className="chain-arrow" aria-hidden="true" />
      <Card label="Ações fiscalizatórias" value={int(resumo.acoes.length)} delta={<Delta value={variacao(resumo.acoes.length, resumo.acoesPrev)} />} spark={mensal.map(row => row.acoes)} sparkColor={tokens.blue} sub={`${int(resumo.acoes.length / ctx.period)} por mês em média`} onOpen={() => ctx.open({ kind: 'acoes' })} />
      <ChevronRight className="chain-arrow" aria-hidden="true" />
      <Card label="Autos de infração lavrados" value={int(resumo.autos.length)} delta={<Delta value={variacao(resumo.autos.length, resumo.autosPrev)} />} spark={mensal.map(row => tipos.reduce((sum, tipo) => sum + row.autos[tipo], 0))} sparkColor={tokens.bad} sub={`${pct(resumo.acoes.filter(row => row.auto).length / Math.max(1, resumo.acoes.length) * 100)} das ações viraram auto`} onOpen={() => ctx.open({ kind: 'autos' })} />
      <ChevronRight className="chain-arrow" aria-hidden="true" />
      <Card label="Multas aplicadas" value={brl(resumo.aplicada)} delta={<Delta value={variacao(resumo.aplicada, resumo.aplicadaPrev)} />} onOpen={() => ctx.open({ kind: 'multas' })}
        extra={<Segments parts={(Object.keys(resumo.multas) as StatusMulta[]).map(key => ({ label: key, value: resumo.multas[key].valor, color: status[key], format: brl }))} />}
        sub={<>{brl(resumo.multas.Paga.valor)} pagas · {brl(resumo.multas['Dívida ativa'].valor)} em dívida ativa<br />{brl(resumo.recebida)} recebidos no período</>} />
      <ChevronRight className="chain-arrow" aria-hidden="true" />
      <Card label="Regularizações após ação fiscal" value={int(resumo.regularizacoes.length)} delta={<Delta value={variacao(resumo.regularizacoes.length, resumo.regularizacoesPrev)} />} spark={mensal.map(row => row.regularizacoes)} sparkColor={tokens.good} sub={`${resumo.taxa === null ? '—' : pct(resumo.taxa)} das ações do período · mediana de ${resumo.medianaDias === null ? '—' : int(resumo.medianaDias)} dias`} onOpen={() => ctx.open({ kind: 'regularizacoes' })} />
    </section>
    <div className="grid grid-fisc">
      <MapaBivariado ctx={ctx} />
      <Tile area="sit" title="Situação dos indícios" question="Quanto de cada tipo de indício já foi tratado: notificada, autuada, regularizada ou ainda sem ação fiscal.">
        <Situacao ctx={ctx} />
      </Tile>
      <Tile area="mes" title="Ações, autos e regularizações por mês" question="O ritmo da fiscalização se mantém? Barra clara: ações; dentro dela, autos por tipo; linha: regularizações.">
        <Mensal ctx={ctx} />
      </Tile>
      <Tile area="cur" title="Tempo até regularizar, por origem da ação" question="Qual fonte de informação leva mais empresas à regularização, e mais rápido?">
        <Curvas ctx={ctx} />
      </Tile>
    </div>
  </>;
}

/* ---------- Mapa bivariado: território das regionais, cor = problema × resposta ---------- */
const bivariada = [['#E8E8E8', '#E4ACAC', '#C85A5A'], ['#B0D5DF', '#AD9EA5', '#985356'], ['#64ACBE', '#627F8C', '#574249']];
const nivel = ['baixo', 'médio', 'alto'];
export function MapaBivariado({ ctx, area = 'map' }: { ctx: Ctx; area?: string }) {
  const [par, setPar] = useState<ParId>('problema');
  const [destaque, setDestaque] = useState<{ cell?: [number, number]; gre?: string } | null>(null);
  const centroids = useSpMap(), config = pares[par], { tokens } = ctx;
  const territorio = useMemo(() => centroids ? territorioGre(ctx.dataset, centroids) : null, [centroids, ctx.dataset]);
  const rotulos = useMemo(() => territorio && centroids ? rotulosGre(territorio, centroids) : null, [territorio, centroids]);
  const classes = useMemo(() => {
    const fx = tercil(ctx.regionais.map(config.getX)), fy = tercil(ctx.regionais.map(config.getY));
    return new Map(ctx.regionais.map(row => [row.id, { row, x: fx(config.getX(row)), y: fy(config.getY(row)) }]));
  }, [ctx.regionais, config]);
  const color = (x: number | null, y: number | null) => x === null || y === null ? tokens.line : bivariada[y][x];
  const ranking = [...classes.values()].filter(item => item.x !== null && item.y !== null).sort((a, b) => (b.x! - b.y!) - (a.x! - a.y!) || (config.getX(b.row) ?? 0) - (config.getX(a.row) ?? 0));
  const faded = (greId: string) => {
    if (destaque?.gre) return destaque.gre !== greId;
    if (destaque?.cell) { const item = classes.get(greId); return !item || item.x !== destaque.cell[0] || item.y !== destaque.cell[1]; }
    return Boolean(ctx.greId && ctx.greId !== greId);
  };
  const option = useMemo(() => {
    if (!territorio || !rotulos) return null;
    const tooltip = (greId: string) => { const item = classes.get(greId); if (!item) return ''; const x = config.getX(item.row), y = config.getY(item.row);
      return `<b>${item.row.name}</b><br/>${config.x}: <b>${x === null ? '—' : config.fx(x)}</b> (${item.x === null ? '—' : nivel[item.x]})<br/>${config.y}: <b>${y === null ? '—' : config.fy(y)}</b> (${item.y === null ? '—' : nivel[item.y]})<br/><span style="opacity:.75">clique para ver a regional</span>`; };
    return {
      tooltip: { trigger: 'item', formatter: (params: any) => params.componentType === 'geo' ? tooltip(territorio.get(params.name) ?? '') : tooltip(params.data?.greId ?? '') },
      geo: { map: 'spPainel', roam: true, scaleLimit: { min: 1, max: 5 }, left: 4, right: 4, top: 4, bottom: 4, selectedMode: false, tooltip: { show: true },
        itemStyle: { areaColor: tokens.soft, borderColor: tokens.surface, borderWidth: 0.35 }, emphasis: { disabled: true },
        regions: [...territorio].map(([name, greId]) => { const item = classes.get(greId), isFaded = faded(greId), selected = ctx.greId === greId;
          return { name, itemStyle: { areaColor: color(item?.x ?? null, item?.y ?? null), opacity: isFaded ? 0.28 : 1, borderColor: selected ? tokens.ink : tokens.surface, borderWidth: selected ? 0.8 : 0.35 } }; }) },
      series: [{ type: 'scatter', coordinateSystem: 'geo', symbolSize: 1, itemStyle: { color: 'transparent' }, silent: false,
        data: [...rotulos].map(([greId, at]) => ({ name: short(ctx.dataset.gres.find(row => row.id === greId)?.name ?? greId), greId, value: at })),
        label: { show: true, formatter: '{b}', color: '#1A202C', fontSize: 10.5, fontWeight: 700, textBorderColor: 'rgba(255,255,255,.85)', textBorderWidth: 2.5 }, labelLayout: { hideOverlap: true } }],
    };
  }, [territorio, rotulos, classes, config, tokens, destaque, ctx.greId]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (params: any) => { const greId = params.componentType === 'geo' ? territorio?.get(params.name) : params.data?.greId; if (greId) ctx.open({ kind: 'gre', id: greId }); };
  return <Tile area={area} title={config.pergunta} question={config.leitura} className="t-map"
    actions={<div className="seg" role="radiogroup" aria-label="Indicadores do mapa">{(Object.keys(pares) as ParId[]).map(id => <button key={id} role="radio" aria-checked={par === id} className={par === id ? 'on' : ''} onClick={() => setPar(id)}>{pares[id].label}</button>)}</div>}>
    <div className="map-layout">
      <div className="map-box">{option ? <Chart option={option} tokens={tokens} label={`Mapa das regionais: ${config.x} e ${config.y}`} onPick={pick} /> : <div className="loading">Carregando mapa…</div>}
        <p className="map-note">Território de cada GRE aproximado pelos municípios da amostra; em produção, usar a tabela oficial município → GRE.</p></div>
      <aside className="map-side">
        <div className="biv" onMouseLeave={() => setDestaque(null)}>
          <span className="biv-y">{config.y} ↑</span>
          <div className="biv-grid">{[2, 1, 0].map(y => [0, 1, 2].map(x => <button key={`${x}${y}`} className={x === 2 && y === 0 ? 'is-critical' : ''} style={{ background: bivariada[y][x] }} aria-label={`${config.x} ${nivel[x]}, ${config.y} ${nivel[y]}`} title={`${config.x}: ${nivel[x]} · ${config.y}: ${nivel[y]}`} onMouseEnter={() => setDestaque({ cell: [x, y] })} onFocus={() => setDestaque({ cell: [x, y] })} onClick={() => setDestaque({ cell: [x, y] })} />))}</div>
          <span className="biv-x">{config.x} →</span>
          <p className="biv-critical"><i style={{ background: bivariada[0][2] }} />{config.critico}</p>
        </div>
        <p className="gre-head"><span>Regional</span><span title={config.x}>X</span><span title={config.y}>Y</span></p>
        <ol className="gre-list" onMouseLeave={() => setDestaque(null)}>{ranking.map(item => <li key={item.row.id}>
          <button onClick={() => ctx.open({ kind: 'gre', id: item.row.id })} onMouseEnter={() => setDestaque({ gre: item.row.id })} onFocus={() => setDestaque({ gre: item.row.id })} className={ctx.greId === item.row.id ? 'is-selected' : ''}>
            <i style={{ background: color(item.x, item.y) }} /><span>{short(item.row.name)}</span><b>{config.getX(item.row) === null ? '—' : config.fx(config.getX(item.row)!)}</b><b>{config.getY(item.row) === null ? '—' : config.fy(config.getY(item.row)!)}</b>
          </button></li>)}</ol>
      </aside>
    </div>
  </Tile>;
}

/* ---------- Situação dos alvos por tipo ---------- */
export function Situacao({ ctx }: { ctx: Ctx }) {
  const colors = corSegmento(ctx.tokens);
  return <div className="situacao">
    <ul className="legend">{segmentos.map(segment => <li key={segment}><i style={{ background: colors[segment] }} />{segment}</li>)}</ul>
    {ctx.resumo.situacao.map(item => {
      const tratados = item.total - item.partes['Sem ação'].length, regularizados = item.partes['Regularizado após auto'].length + item.partes['Regularizado na notificação'].length;
      return <div className="sit-row" key={item.tipo}>
        <p className="sit-head"><b>{tipoLabel[item.tipo]}</b><span>{int(item.total)} empresas · {pct(tratados / Math.max(1, item.total) * 100)} com ação · {pct(regularizados / Math.max(1, item.total) * 100)} regularizados</span></p>
        <div className="sit-bar">{segmentos.map(segment => { const count = item.partes[segment].length, width = count / Math.max(1, item.total) * 100;
          return count > 0 && <button key={segment} style={{ width: `${width}%`, background: colors[segment], color: inkOn(colors[segment]) }} onClick={() => ctx.open({ kind: 'situacao', tipo: item.tipo, segmento: segment })} title={`${segment}: ${int(count)} (${pct(width)})`}>{width >= 7 && <span>{int(count)}</span>}</button>; })}</div>
      </div>;
    })}
    <p className="insight">{(() => { const worst = [...ctx.resumo.situacao].filter(item => item.total).sort((a, b) => b.partes['Sem ação'].length / b.total - a.partes['Sem ação'].length / a.total)[0];
      return worst ? <>Maior lacuna: <b>{pct(worst.partes['Sem ação'].length / worst.total * 100)}</b> dos indícios de {tipoLabel[worst.tipo].toLowerCase()} ainda sem ação fiscal.</> : null; })()}</p>
  </div>;
}

/* ---------- Série mensal ---------- */
export function Mensal({ ctx }: { ctx: Ctx }) {
  const { tokens, resumo, janela } = ctx, colors = corTipo(tokens), months = resumo.mensal;
  const option = useMemo(() => ({
    grid: { top: 28, right: 8, bottom: 2, left: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 12, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 11 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = months[items[0].dataIndex]; const autos = tipos.reduce((sum, tipo) => sum + row.autos[tipo], 0);
      return `<b>${mes(row.month)}</b><br/>Ações: ${int(row.acoes)}<br/>Autos: ${int(autos)} (${tipos.map(tipo => `${tipoLabel[tipo].split(' ')[0].toLowerCase()} ${row.autos[tipo]}`).join(', ')})<br/>Regularizações: ${int(row.regularizacoes)}<br/><span style="opacity:.75">clique para ver os autos do mês</span>`; } },
    xAxis: { type: 'category', data: months.map(row => mes(row.month)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, interval: 2 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
    series: [
      { name: 'Ações', type: 'bar', barWidth: '62%', barGap: '-100%', z: 1, data: months.map(row => row.acoes), itemStyle: { color: tokens.soft, borderColor: tokens.heat[1], borderWidth: 1, borderRadius: [4, 4, 0, 0] },
        markArea: { silent: true, itemStyle: { color: tokens.accent, opacity: 0.08 }, label: { show: true, position: 'insideTopRight', color: tokens.muted, fontSize: 10, formatter: 'período' }, data: [[{ xAxis: mes(janela.start.slice(0, 7)) }, { xAxis: mes(janela.end.slice(0, 7)) }]] } },
      ...tipos.map((tipo, index) => ({ name: `Autos: ${tipo === 'registro' ? 'falta de registro' : tipo === 'rt' ? 'RT baixado' : 'obra sem ART'}`, type: 'bar', stack: 'autos', barWidth: '62%', z: 2, data: months.map(row => row.autos[tipo]), itemStyle: { color: colors[tipo], borderRadius: index === tipos.length - 1 ? [3, 3, 0, 0] : 0 } })),
      { name: 'Regularizações', type: 'line', z: 3, data: months.map(row => row.regularizacoes), smooth: 0.3, symbol: 'circle', symbolSize: 5, lineStyle: { color: tokens.good, width: 2.5 }, itemStyle: { color: tokens.good } },
    ],
  }), [months, tokens, colors, janela]);
  return <Chart option={option} tokens={tokens} label="Ações, autos por tipo e regularizações por mês" onPick={params => { const row = months[params.dataIndex]; if (row) ctx.open({ kind: 'mes', month: row.month }); }} />;
}

/* ---------- Curvas de regularização por origem ---------- */
export function Curvas({ ctx }: { ctx: Ctx }) {
  const { tokens, resumo } = ctx, colors = corOrigem(tokens);
  const option = useMemo(() => ({
    grid: { top: 10, right: 12, bottom: 22, left: 4, containLabel: true },
    tooltip: { trigger: 'axis', formatter: (items: any[]) => `<b>Até ${items[0].axisValue} dias após a ação</b><br/>${items.map(item => `${item.marker}${item.seriesName}: ${pct(item.value[1])} regularizadas`).join('<br/>')}` },
    xAxis: { type: 'value', min: 0, max: 360, interval: 60, name: 'dias após a ação', nameLocation: 'middle', nameGap: 22, nameTextStyle: { color: tokens.muted, fontSize: 10 }, splitLine: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted } },
    yAxis: { type: 'value', min: 0, max: (value: { max: number }) => Math.min(100, Math.ceil(value.max / 10) * 10 + 10), splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: '{value}%' } },
    series: resumo.curvas.map(curve => ({ name: curve.origem, type: 'line', step: 'end', showSymbol: false, data: curve.pontos, lineStyle: { width: 2.5, color: colors[curve.origem] }, itemStyle: { color: colors[curve.origem] }, emphasis: { focus: 'series' } })),
  }), [resumo.curvas, tokens, colors]);
  const best = [...resumo.curvas].sort((a, b) => (b.final ?? 0) - (a.final ?? 0))[0];
  return <div className="curvas">
    <Chart option={option} tokens={tokens} label="Parcela de ações regularizadas por dias desde a ação, por origem" onPick={params => { const curve = resumo.curvas[params.seriesIndex]; if (curve) ctx.open({ kind: 'origem', origem: curve.origem }); }} />
    <ul className="origens">{[...resumo.curvas].sort((a, b) => (b.final ?? 0) - (a.final ?? 0)).map(curve => <li key={curve.origem}><button onClick={() => ctx.open({ kind: 'origem', origem: curve.origem })}>
      <i style={{ background: colors[curve.origem] }} /><span>{curve.origem}</span><b>{curve.final === null ? '—' : pct(curve.final)}</b><small>{int(curve.n)} ações · mediana {curve.mediana === null ? '—' : `${int(curve.mediana)} d`}</small></button></li>)}</ul>
    {best && (() => { const finals = resumo.curvas.map(curve => curve.final ?? 0), spread = Math.max(...finals) - Math.min(...finals);
      return <p className="insight">{spread < 8 ? <>Origens com resultado parecido: <b>{pct(Math.min(...finals))} a {pct(Math.max(...finals))}</b> regularizadas em até um ano. A diferença está no tempo: mediana de {int(Math.min(...resumo.curvas.map(curve => curve.mediana ?? Infinity)))} a {int(Math.max(...resumo.curvas.map(curve => curve.mediana ?? 0)))} dias.</> : <>Ações vindas de <b>{best.origem.toLowerCase()}</b> regularizam mais: {pct(best.final ?? 0)} em até um ano.</>}</p>; })()}
  </div>;
}

