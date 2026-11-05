import { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Chart } from './chart';
import type { Tokens } from './chart';
import { comparacoes } from './evolucao';
import type { Comparacao, Evolucao } from './evolucao';
import { mes, pct } from './ui';

/**
 * Seção do painel lateral aberta por um cartão: três comparações e o gráfico dos últimos 12 meses ao lado dos mesmos meses um ano
 * antes. No fluxo, barras com o número e uma linha para o ano anterior (o mesmo desenho do bloco de ARTs por mês); no estoque e na
 * taxa, duas linhas, porque barras de um estoque ficam todas da mesma altura e não mostram a mudança.
 */
export default function EvolucaoMensal({ serie, tokens }: { serie: Evolucao; tokens: Tokens }) {
  const itens = useMemo(() => comparacoes(serie), [serie]);
  const option = useMemo(() => opcao(serie, tokens), [serie, tokens]);
  return <section className="evolucao" aria-label="Evolução mês a mês">
    <h3>{serie.nome ? `${serie.nome}, mês a mês` : 'Evolução mês a mês'}</h3>
    <div className="evolucao-comp">{itens.map(item => <Comparativo key={item.titulo} item={item} serie={serie} />)}</div>
    <div className="evolucao-chart"><Chart option={option} tokens={tokens} label="Últimos 12 meses comparados com os mesmos meses um ano antes" /></div>
  </section>;
}

function Comparativo({ item, serie }: { item: Comparacao; serie: Evolucao }) {
  const { variacao } = item, fmt = serie.fmt;
  const zero = variacao !== null && Math.abs(variacao) < 0.05;
  const texto = variacao === null || !Number.isFinite(variacao) ? 'sem base' : zero ? (item.kind === 'pp' ? '0 p.p.' : '0%') : item.kind === 'pp' ? `${variacao > 0 ? '+' : ''}${variacao.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p.` : `${variacao > 0 ? '+' : ''}${pct(variacao, Math.abs(variacao) < 10 ? 1 : 0)}`;
  const good = variacao === null ? null : (serie.goodUp ?? true) ? variacao >= 0 : variacao <= 0, Icon = variacao === null || Math.abs(variacao) < 0.05 ? Minus : variacao > 0 ? ArrowUpRight : ArrowDownRight;
  return <div className="evolucao-item">
    <span>{item.titulo}</span>
    <b className={good === null ? 'is-none' : good ? 'is-good' : 'is-bad'}><Icon size={14} />{texto}</b>
    <small>{item.agora === null ? '—' : fmt(item.agora)} em {item.quando}<br />{item.antes === null ? '—' : fmt(item.antes)} em {item.contra}</small>
  </div>;
}

function opcao(serie: Evolucao, tokens: Tokens) {
  const n = serie.meses.length, meses = serie.meses.slice(n - 12), agora = serie.valores.slice(n - 12), antes = serie.valores.slice(n - 24, n - 12);
  const curto = serie.curto ?? serie.fmt, fluxo = serie.tipo === 'fluxo';
  const maximo = Math.max(1, ...agora.map(value => value ?? 0));
  const tooltip = { trigger: 'axis', axisPointer: { type: fluxo ? 'shadow' : 'line' }, formatter: (items: any[]) => { const index = items[0].dataIndex, a = agora[index], b = antes[index];
    return `<b>${mes(meses[index])}</b><br/>${a === null ? '—' : serie.fmt(a)}<br/><span style="opacity:.8">${b === null ? '—' : serie.fmt(b)} no mesmo mês um ano antes</span>`; } };
  const legend = { top: 0, left: 0, itemWidth: 12, itemHeight: 8, itemGap: 12, textStyle: { color: tokens.muted, fontSize: 10.5 } };
  const xAxis = { type: 'category', data: meses.map(mes), boundaryGap: fluxo, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } };
  const yAxis = { type: 'value', scale: !fluxo, splitNumber: 3, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 10, formatter: (value: number) => serie.fmt(value) } };
  const anterior = { name: 'Mesmo mês um ano antes', type: 'line', data: antes, symbol: 'circle', symbolSize: 5, z: 3, lineStyle: { color: tokens.accent, width: 2, ...(fluxo ? {} : { type: 'dashed' }) }, itemStyle: { color: tokens.accent } };
  if (fluxo) return { grid: { top: 26, right: 6, bottom: 2, left: 4, containLabel: true }, legend, tooltip, xAxis, yAxis,
    series: [
      // Número dentro da barra quando ela é alta; em cima quando é baixa, para continuar legível.
      { name: `Últimos 12 meses${serie.unidade ? `, ${serie.unidade}` : ''}`, type: 'bar', barWidth: '58%', itemStyle: { color: tokens.blue, borderRadius: [3, 3, 0, 0] },
        data: agora.map(value => ({ value, label: { show: value !== null, position: (value ?? 0) / maximo > 0.22 ? 'insideTop' : 'top', color: (value ?? 0) / maximo > 0.22 ? '#FFFFFF' : tokens.ink, fontSize: 9.5, fontWeight: 700, formatter: () => value === null ? '' : curto(value) } })) },
      anterior] };
  return { grid: { top: 26, right: 14, bottom: 2, left: 4, containLabel: true }, legend, tooltip, xAxis, yAxis,
    series: [
      { name: 'Últimos 12 meses', type: 'line', data: agora, symbol: 'circle', symbolSize: 6, z: 4, lineStyle: { color: tokens.blue, width: 2.5 }, itemStyle: { color: tokens.blue },
        label: { show: true, position: 'top', color: tokens.ink, fontSize: 9.5, fontWeight: 700, formatter: (params: any) => params.value === null ? '' : curto(params.value) } },
      anterior] };
}
