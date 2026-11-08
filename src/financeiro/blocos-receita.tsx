import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { brl, mes as rotuloMes, money, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import type { Exportavel } from '../cockpit/ui';
import { corDoTexto } from '../cockpit/formatos';
import { execucaoDoAno, tiposReceita } from '../domain/financeiro';
import { compacto, eixoCategoria, eixoValor, legenda } from '../gestao/comum';
import { coresTipo } from './blocos-arrecadacao';
import { anosReais, fin, mesesAte, nomesMes, nomesMesLongo, receitaDoMes } from './dados';

/** Blocos da página Receita do painel Financeiro (07/11/2026), todos com a receita real publicada na Transparência, do estado inteiro. */
const somaAno = (ano: string, tipo?: string, ate = 12) => Array.from({ length: ate }, (_, i) => receitaDoMes(`${ano}-${String(i + 1).padStart(2, '0')}`, tipo)).reduce((a, b) => a + b, 0);

/* ---------- Receita de cada ano desde 2013, por origem, e a parte da ART ---------- */
export const exportarHistorico = (mes: string): Exportavel => ({ cabecalho: ['Ano', ...tiposReceita.map(t => `${t} (R$)`), 'Total (R$)', 'Parte da ART (%)'], linhas: () => anosReais.filter(ano => ano <= mes.slice(0, 4)).map(ano => {
  const ate = ano === mes.slice(0, 4) ? Number(mes.slice(5, 7)) : 12, valores = tiposReceita.map(t => somaAno(ano, t, ate)), total = valores.reduce((a, b) => a + b, 0);
  return [ano === mes.slice(0, 4) && ate < 12 ? `${ano} (até ${nomesMes[ate - 1]})` : ano, ...valores.map(Math.round), Math.round(total), total ? Math.round(valores[1] / total * 1000) / 10 : null]; }) });
export function Historico({ ctx, mes }: { ctx: CockpitCtx; mes: string }) {
  const { tokens } = ctx, cores = coresTipo(tokens);
  const option = useMemo(() => {
    const anoAtual = mes.slice(0, 4), ate = Number(mes.slice(5, 7)), anos = anosReais.filter(ano => ano <= anoAtual);
    const rotulo = (ano: string) => ano === anoAtual && ate < 12 ? `${ano.slice(2)}*` : ano.slice(2);
    const linhas = anos.map(ano => { const n = ano === anoAtual ? ate : 12, valores = tiposReceita.map(t => somaAno(ano, t, n)), total = valores.reduce((a, b) => a + b, 0); return { ano, valores, total, art: total ? valores[1] / total * 100 : 0, n }; });
    return {
      grid: { top: 30, right: 34, bottom: 2, left: 4, containLabel: true }, legend: legenda(tokens),
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = linhas[items[0].dataIndex]; return `<b>${row.ano}${row.n < 12 ? ` (janeiro a ${nomesMesLongo[row.n - 1]})` : ''}</b><br/>${tiposReceita.map((t, i) => `${t}: ${money(row.valores[i])}`).join('<br/>')}<br/>Total: <b>${money(row.total)}</b><br/>Parte da ART: ${pct(row.art)}`; } },
      xAxis: eixoCategoria(tokens, anos.map(rotulo)), yAxis: [eixoValor(tokens), { type: 'value', min: 0, max: 60, interval: 20, splitLine: { show: false }, axisLabel: { color: tokens.muted, fontSize: 11, formatter: '{value}%' } }],
      series: [...tiposReceita.map((tipo, index) => ({ name: tipo, type: 'bar', stack: 'h', barMaxWidth: 34, itemStyle: { color: cores[tipo] }, data: linhas.map(row => ({ value: row.valores[index], itemStyle: { color: cores[tipo], opacity: row.n < 12 ? 0.55 : 1 } })),
        ...(index === tiposReceita.length - 1 ? { label: { show: true, position: 'top', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (params: any) => compacto(linhas[params.dataIndex].total / 1e6) } } : {}) })),
        { name: 'Parte da ART (%)', type: 'line', yAxisIndex: 1, data: linhas.map(row => Math.round(row.art * 10) / 10), symbol: 'circle', symbolSize: 4, lineStyle: { color: tokens.ink, width: 1.4, type: [4, 3] }, itemStyle: { color: tokens.ink },
          endLabel: { show: true, color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (params: any) => pct(params.value) } }],
    };
  }, [mes, tokens, cores]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="cs-com-nota"><Chart option={option} tokens={tokens} label="Receita de cada ano desde 2013, por origem, com a parte da ART" />
    <p className="cs-nota">Em R$ milhões por ano. O ano com * vai até o mês da data.</p></div>;
}

/* ---------- Sazonalidade: cada mês de cada ano ---------- */
export const exportarSazonalidade = (mes: string): Exportavel => ({ cabecalho: ['Ano', ...nomesMes], linhas: () => anosReais.filter(ano => ano <= mes.slice(0, 4)).map(ano => [ano, ...nomesMes.map((_, i) => { const m = `${ano}-${String(i + 1).padStart(2, '0')}`; return m <= mes ? Math.round(receitaDoMes(m)) : null; })]) });
export function Sazonalidade({ ctx, mes }: { ctx: CockpitCtx; mes: string }) {
  const { tokens, dark } = ctx;
  const option = useMemo(() => {
    const anos = anosReais.filter(ano => ano <= mes.slice(0, 4)), dados: { value: [number, number, number]; itemStyle: { color: string }; label: { color: string } }[] = [];
    const cortes = [0.8, 0.95, 1.15, 1.5], cores = dark ? ['#15265C', '#24366E', '#3662E2', '#6077B6', '#AFBBDB'] : ['#ECEFF7', '#DFE4F2', '#6077B6', '#3662E2', '#15265C'];
    const mediaDoAno = new Map(anos.map(ano => { const doAno = nomesMes.map((_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`).filter(m => m <= mes); return [ano, doAno.reduce((s, m) => s + receitaDoMes(m), 0) / Math.max(1, doAno.length)]; }));
    anos.forEach((ano, y) => nomesMes.forEach((_, x) => { const m = `${ano}-${String(x + 1).padStart(2, '0')}`; if (m > mes) return; const v = receitaDoMes(m), razao = v / Math.max(1, mediaDoAno.get(ano)!), cor = cores[cortes.filter(c => razao > c).length];
      dados.push({ value: [x, y, v], itemStyle: { color: cor }, label: { color: corDoTexto(cor) } }); }));
    return {
      visualMap: { show: false, type: 'piecewise', dimension: 2, pieces: [{ min: -1e15, max: 1e15 }], inRange: { opacity: 1 } }, // o ECharts exige um visualMap no mapa de calor; a cor vem de cada célula
      grid: { top: 4, right: 4, bottom: 2, left: 4, containLabel: true },
      tooltip: { formatter: (params: any) => { const [x, y, v] = params.data.value; return `<b>${nomesMesLongo[x]} de ${anos[y]}</b><br/>${money(v)}<br/>${pct(v / Math.max(1, mediaDoAno.get(anos[y])!) * 100)} da média mensal de ${anos[y]}`; } },
      xAxis: { type: 'category', position: 'top', data: nomesMes, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.muted, fontSize: 11 } },
      yAxis: { type: 'category', inverse: true, data: anos, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
      series: [{ type: 'heatmap', data: dados, itemStyle: { borderColor: tokens.surface, borderWidth: 2, borderRadius: 3 },
        label: { show: true, fontSize: 11, formatter: (params: any) => (params.data.value[2] / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) } }],
    };
  }, [mes, tokens, dark]);
  return <div className="cs-com-nota"><Chart option={option} tokens={tokens} label="Receita de cada mês de cada ano desde 2013, em R$ milhões" />
    <p className="cs-nota">Em R$ milhões. A cor compara o mês com a média do próprio ano: mais escura, mês mais forte que a média.</p></div>;
}

/* ---------- Receita mês a mês, por origem, contra um ano antes ---------- */
export const exportarMensal = (mes: string, n: number): Exportavel => ({ cabecalho: ['Mês', ...tiposReceita.map(t => `${t} (R$)`), 'Total (R$)', 'Um ano antes (R$)'],
  linhas: () => mesesAte(mes, n).map(m => [rotuloMes(m), ...tiposReceita.map(t => Math.round(receitaDoMes(m, t))), Math.round(receitaDoMes(m)), Math.round(receitaDoMes(`${Number(m.slice(0, 4)) - 1}${m.slice(4)}`))]) });
export function Mensal({ ctx, mes, n }: { ctx: CockpitCtx; mes: string; n: number }) {
  const { tokens } = ctx, cores = coresTipo(tokens);
  const option = useMemo(() => {
    const meses = mesesAte(mes, n), antes = meses.map(m => receitaDoMes(`${Number(m.slice(0, 4)) - 1}${m.slice(4)}`));
    return {
      grid: { top: 30, right: 6, bottom: 2, left: 4, containLabel: true }, legend: legenda(tokens),
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const m = meses[items[0].dataIndex]; return `<b>${nomesMesLongo[Number(m.slice(5, 7)) - 1]} de ${m.slice(0, 4)}</b><br/>${tiposReceita.map(t => `${t}: ${money(receitaDoMes(m, t))}`).join('<br/>')}<br/>Total: <b>${money(receitaDoMes(m))}</b><br/>Um ano antes: ${money(antes[items[0].dataIndex])}`; } },
      xAxis: eixoCategoria(tokens, meses.map(rotuloMes)), yAxis: eixoValor(tokens),
      series: [...tiposReceita.map((tipo, index) => ({ name: tipo, type: 'bar', stack: 'm', barMaxWidth: 34, data: meses.map(m => receitaDoMes(m, tipo)), itemStyle: { color: cores[tipo] },
        ...(index === tiposReceita.length - 1 ? { label: { show: n <= 12, position: 'top', fontSize: 11, formatter: (params: any) => { const total = receitaDoMes(meses[params.dataIndex]), a = antes[params.dataIndex]; if (!a) return `{n|${compacto(total / 1e6)}}`; const d = (total / a - 1) * 100; return `{n|${compacto(total / 1e6)}}\n{${d >= 0 ? 'g' : 'r'}|${d >= 0 ? '▲' : '▼'}${Math.abs(d).toFixed(0)}%}`; },
          rich: { n: { color: tokens.ink, fontWeight: 700, fontSize: 11 }, g: { color: tokens.good, fontWeight: 700, fontSize: 11 }, r: { color: tokens.bad, fontWeight: 700, fontSize: 11 } } } } : {}) })),
        { name: 'Um ano antes', type: 'line', data: antes, symbol: 'circle', symbolSize: 3, lineStyle: { color: tokens.ink, width: 1.3, type: [4, 4] }, itemStyle: { color: tokens.ink } }],
    };
  }, [mes, n, tokens, cores]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Receita de cada mês por origem, com o mesmo mês um ano antes" />;
}

/* ---------- Orçado e realizado de cada origem no ano ---------- */
const linhasOrcado = (mes: string) => { const ano = mes.slice(0, 4), ate = Number(mes.slice(5, 7));
  return tiposReceita.map(tipo => { const orcado = fin.orcamento.find(row => row.ano === ano && row.tipo === 'receita' && row.grupo === tipo)?.atual ?? 0, realizado = somaAno(ano, tipo, ate);
    const inicial = fin.orcamento.find(row => row.ano === ano && row.tipo === 'receita' && row.grupo === tipo)?.inicial ?? 0; return { tipo, orcado, inicial, realizado }; }); };
export const exportarOrcado = (mes: string): Exportavel => ({ cabecalho: ['Origem', 'Orçado inicial (R$)', 'Orçado com reformulações (R$)', 'Realizado até o mês (R$)', '% do orçado'], linhas: () => linhasOrcado(mes).map(row => [row.tipo, Math.round(row.inicial), Math.round(row.orcado), Math.round(row.realizado), row.orcado ? Math.round(row.realizado / row.orcado * 1000) / 10 : null]) });
export function OrcadoRealizado({ ctx, mes }: { ctx: CockpitCtx; mes: string }) {
  const { tokens } = ctx, cores = coresTipo(tokens), rows = linhasOrcado(mes), ate = Number(mes.slice(5, 7)), esperado = ate / 12 * 100;
  const total = execucaoDoAno(fin, 'receita', mes);
  return <div className="fin-bullets">
    {rows.map(row => { const parte = row.orcado ? row.realizado / row.orcado * 100 : 0;
      return <div key={row.tipo} className="fin-bullet" title={`${row.tipo}: ${money(row.realizado)} de ${money(row.orcado)} orçados para ${mes.slice(0, 4)}`}>
        <span className="fin-bullet-nome"><i style={{ background: cores[row.tipo] }} />{row.tipo}</span>
        <span className="fin-bullet-trilho"><span style={{ width: `${Math.min(100, parte)}%`, background: cores[row.tipo] }} /><b style={{ left: `${esperado}%` }} /></span>
        <span className="fin-bullet-valor"><b>{pct(parte)}</b> de {brl(row.orcado)}</span></div>; })}
    <p className="cs-nota"><b>{total.orcado ? pct(total.realizado / total.orcado * 100) : '—'}</b> da receita orçada para {mes.slice(0, 4)} até {nomesMesLongo[ate - 1]}. O traço marca {pct(esperado)}, a parte do ano que passou.</p>
  </div>;
}
