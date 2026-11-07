import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { brl, int, mes, money, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import type { Exportavel } from '../cockpit/ui';
import { fontesReceita } from '../domain/conselho';
import { municipiosSp } from '../domain/municipios';
import { dividaPorSituacao, faixaIdadeDivida, vencidoEm } from '../domain/gestao';
import { abrirDevedores, compacto, eixoCategoria, eixoValor, g, legenda, ultimoIndice } from '../gestao/comum';
import type { Medida } from '../gestao/comum';

/** Blocos da página Receita e dívida do painel de Gestão do Conselho (06/11/2026). */
const nomesMes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const diasDesde = (de: string, ate: string) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86400000);

/* ---------- Arrecadação mês a mês por origem, com o total do mesmo mês um ano antes ---------- */
const ultimos12 = (ctx: CockpitCtx) => g(ctx).receitaMensal.slice(-12);
export const exportarArrecadacao = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Mês', ...fontesReceita, 'Total', 'Total um ano antes'], linhas: () => ultimos12(ctx).map(row => [mes(row.month), ...fontesReceita.map(f => Math.round(row.porFonte[f])), Math.round(row.total), row.antes === null ? null : Math.round(row.antes)]) });
export function Arrecadacao({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = ultimos12(ctx), cores = [tokens.blue, tokens.brand, tokens.accent, tokens.bad, tokens.heat[1]];
  const option = useMemo(() => ({
    grid: { top: 34, right: 6, bottom: 2, left: 4, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${mes(row.month)}</b><br/>${fontesReceita.map(f => `${f}: ${money(row.porFonte[f])}`).join('<br/>')}<br/>Total: <b>${money(row.total)}</b>${row.antes ? `<br/>Um ano antes: ${money(row.antes)}` : ''}`; } },
    xAxis: eixoCategoria(tokens, rows.map(row => mes(row.month))), yAxis: eixoValor(tokens),
    series: [...fontesReceita.map((fonte, index) => ({ name: fonte, type: 'bar', stack: 'r', barWidth: '58%', data: rows.map(row => row.porFonte[fonte]), itemStyle: { color: cores[index], borderRadius: index === fontesReceita.length - 1 ? [3, 3, 0, 0] : 0 },
      ...(index === fontesReceita.length - 1 ? { label: { show: true, position: 'top', fontSize: 9.5, formatter: (params: any) => { const row = rows[params.dataIndex]; if (!row.antes) return `{n|${compacto(row.total)}}`; const d = (row.total / row.antes - 1) * 100; return `{n|${compacto(row.total)}}\n{${d >= 0 ? 'g' : 'r'}|${d >= 0 ? '▲' : '▼'}${Math.abs(d).toFixed(0)}%}`; },
        rich: { n: { color: tokens.ink, fontWeight: 700, fontSize: 9.5 }, g: { color: tokens.good, fontWeight: 700, fontSize: 9 }, r: { color: tokens.bad, fontWeight: 700, fontSize: 9 } } } } : {}) })),
      { name: 'Total um ano antes', type: 'line', data: rows.map(row => row.antes), symbol: 'circle', symbolSize: 4, lineStyle: { color: tokens.ink, width: 1.4, type: [4, 4] }, itemStyle: { color: tokens.ink } }],
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Receita do Conselho por mês e origem, com o mesmo mês um ano antes" />;
}

/* ---------- Previsto e realizado acumulados no ano ---------- */
export const exportarPrevisto = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Mês', 'Previsto acumulado', 'Realizado acumulado', 'Realizado acumulado no ano anterior'], linhas: () => g(ctx).receitaAcumulada.map(row => [nomesMes[row.mes - 1], row.previsto, row.realizado, row.realizadoAntes]) });
export function PrevistoRealizado({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = g(ctx).receitaAcumulada, ano = ctx.anchor.slice(0, 4), ultimo = rows.filter(row => row.realizado !== null).at(-1);
  const option = useMemo(() => {
    const fim = (serie: (number | null)[], cor: string, nome: string) => ({ data: serie.map((value, index) => index === ultimoIndice(serie) ? { value, label: { show: true, position: 'right', color: cor, fontWeight: 700, fontSize: 10, formatter: () => `${nome} ${compacto(value!)}` } } : value) });
    return {
      grid: { top: 26, right: 88, bottom: 2, left: 4, containLabel: true }, legend: legenda(tokens),
      tooltip: { trigger: 'axis', formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>Janeiro a ${nomesMes[row.mes - 1]}</b><br/>${row.realizado === null ? '' : `Realizado em ${ano}: ${money(row.realizado)} (${pct(row.realizado / Math.max(1, row.previsto!) * 100)} do previsto)<br/>`}${row.previsto === null ? '' : `Previsto: ${money(row.previsto)}<br/>`}Realizado em ${Number(ano) - 1}: ${money(row.realizadoAntes)}`; } },
      xAxis: eixoCategoria(tokens, nomesMes, { boundaryGap: false }), yAxis: eixoValor(tokens),
      series: [
        { name: `Previsto ${ano}`, type: 'line', ...fim(rows.map(row => row.previsto), tokens.muted, 'previsto'), symbol: 'none', lineStyle: { color: tokens.muted, width: 1.5, type: [5, 4] } },
        { name: `Realizado ${ano}`, type: 'line', ...fim(rows.map(row => row.realizado), tokens.brand, 'realizado'), symbol: 'circle', symbolSize: 5, lineStyle: { color: tokens.brand, width: 2.6 }, itemStyle: { color: tokens.brand }, areaStyle: { color: tokens.brand, opacity: 0.08 } },
        { name: `Realizado ${Number(ano) - 1}`, type: 'line', data: rows.map(row => row.realizadoAntes), symbol: 'none', lineStyle: { color: tokens.accent, width: 1.5 } },
      ],
    };
  }, [rows, tokens, ano]);
  return <div className="cs-com-nota">
    <Chart option={option} tokens={tokens} label="Receita prevista e realizada acumulada no ano" />
    {ultimo && ultimo.previsto ? <p className="cs-nota"><b>{pct(ultimo.realizado! / ultimo.previsto * 100)}</b> do previsto até {nomesMes[ultimo.mes - 1]}</p> : null}
  </div>;
}

/* ---------- Dívida por idade, abaixo e acima do piso de execução ---------- */
export const exportarIdadeDivida = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Vencida há', 'Abaixo do piso (R$)', 'Acima do piso (R$)', 'Profissionais (R$)', 'Empresas (R$)', 'Devedores'], linhas: () => g(ctx).divida.idade.map(row => [row.faixa, Math.round(row.abaixo), Math.round(row.acima), Math.round(row.pf), Math.round(row.pj), row.pessoas.size]) });
export function IdadeDivida({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, d = g(ctx).divida, rows = d.idade;
  const option = useMemo(() => ({
    grid: { top: 24, right: 70, bottom: 2, left: 2, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>Vencida há ${row.faixa}</b><br/>Abaixo do piso: ${money(row.abaixo)}<br/>Acima do piso: ${money(row.acima)}<br/>Profissionais ${money(row.pf)} · empresas ${money(row.pj)}<br/>${int(row.pessoas.size)} devedores`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.faixa), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: [
      { name: `Abaixo do piso (${brl(d.piso)})`, type: 'bar', stack: 'i', barWidth: 14, data: rows.map(row => row.abaixo), itemStyle: { color: tokens.heat[1] } },
      { name: 'Acima do piso', type: 'bar', stack: 'i', data: rows.map(row => row.acima), itemStyle: { color: tokens.brand, borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, fontWeight: 700, formatter: (params: any) => brl(rows[params.dataIndex].abaixo + rows[params.dataIndex].acima) } },
    ],
  }), [rows, tokens, d.piso]);
  return <Chart option={option} tokens={tokens} label="Anuidades vencidas por idade, abaixo e acima do piso de execução" onPick={params => { const index = params.dataIndex as number, faixa = rows[index]; if (!faixa) return;
    abrirDevedores(ctx, `Anuidades vencidas há ${faixa.faixa}`, d.devedores.filter(row => row.titulos.some(t => faixaIdadeDivida(diasDesde(t.vencimento, ctx.anchor)) === index)), 'Profissionais e empresas com ao menos uma anuidade vencida nesta faixa de idade, na data escolhida.', 'Os títulos com mais de quatro anos prescrevem em menos de um ano. Acima do piso, a cobrança pode ir à Justiça.'); }} />;
}

/* ---------- Cascata: de onde veio e para onde foi a dívida no período ---------- */
export const exportarCascata = (ctx: CockpitCtx): Exportavel => { const c = g(ctx).divida.cascata; return { cabecalho: ['Etapa', 'Valor (R$)'], linhas: () => [['Vencido no início', Math.round(c.inicio)], ['Venceu no período', Math.round(c.novos)], ['Recebido', -Math.round(c.recebidos)], ['Prescreveu', -Math.round(c.prescritos)], ['Vencido na data', Math.round(c.fim)]] }; };
export function Cascata({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, c = g(ctx).divida.cascata;
  const etapas = [{ nome: 'No início', valor: c.inicio, base: 0, cor: tokens.heat[2] }, { nome: 'Venceu', valor: c.novos, base: c.inicio, cor: tokens.bad }, { nome: 'Recebido', valor: c.recebidos, base: c.inicio + c.novos - c.recebidos, cor: tokens.good },
    { nome: 'Prescreveu', valor: c.prescritos, base: c.fim, cor: tokens.warn }, { nome: 'Na data', valor: c.fim, base: 0, cor: tokens.brand }];
  const option = useMemo(() => ({
    grid: { top: 22, right: 4, bottom: 2, left: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const e = etapas[items[0].dataIndex]; return `<b>${e.nome}</b><br/>${money(e.valor)}`; } },
    xAxis: eixoCategoria(tokens, etapas.map(e => e.nome), { axisLabel: { color: tokens.ink, fontSize: 10.5, interval: 0 } }), yAxis: eixoValor(tokens),
    series: [{ type: 'bar', stack: 'c', silent: true, data: etapas.map(e => e.base), itemStyle: { color: 'transparent' } },
      { type: 'bar', stack: 'c', barWidth: '58%', data: etapas.map((e, index) => ({ value: e.valor, itemStyle: { color: e.cor, borderRadius: 3 }, label: { show: true, position: 'top', color: tokens.ink, fontSize: 10, fontWeight: 700, formatter: () => `${index === 1 ? '+' : index === 2 || index === 3 ? '−' : ''}${brl(e.valor)}` } })) }],
  }), [c, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Cascata da dívida de anuidades no período" />;
}

/* ---------- Curvas de recuperação por semestre de vencimento ---------- */
export const exportarCoortes = (ctx: CockpitCtx): Exportavel => { const q = g(ctx).divida.coortes; return { cabecalho: ['Meses depois do vencimento', ...q.map(row => `${row.nome} (%)`)], linhas: () => Array.from({ length: 25 }, (_, k) => [k, ...q.map(row => row.curva[k] === null ? null : Math.round(row.curva[k]! * 10) / 10)]) }; };
export function Coortes({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = g(ctx).divida.coortes, cores = [tokens.heat[1], tokens.heat[2], tokens.blue, tokens.brand];
  const option = useMemo(() => ({
    grid: { top: 26, right: 40, bottom: 18, left: 4, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', formatter: (items: any[]) => `<b>${items[0].dataIndex} meses depois do vencimento</b><br/>${items.filter(item => item.value !== null && item.value !== undefined).map(item => `${item.marker}${item.seriesName}: ${pct(item.value, 1)} recebido`).join('<br/>')}` },
    xAxis: eixoCategoria(tokens, Array.from({ length: 25 }, (_, k) => String(k)), { boundaryGap: false, name: 'meses depois do vencimento', nameLocation: 'middle', nameGap: 20, nameTextStyle: { color: tokens.muted, fontSize: 10 }, axisLabel: { color: tokens.muted, fontSize: 10, interval: 5 } }),
    yAxis: eixoValor(tokens, { max: 100, axisLabel: { color: tokens.muted, fontSize: 10, formatter: '{value}%' } }),
    series: q.map((row, index) => ({ name: row.nome, type: 'line', smooth: 0.2, symbol: 'none', lineStyle: { color: cores[index], width: index === q.length - 1 ? 2.6 : 1.6 }, itemStyle: { color: cores[index] },
      data: row.curva, endLabel: { show: true, color: cores[index], fontSize: 10, fontWeight: 700, formatter: (params: any) => pct(params.value) } })),
  }), [q, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Parte recebida dos boletos de empresas vencidos em cada semestre" />;
}

/* ---------- Dívida de empresas pela situação do CNPJ na Receita Federal ---------- */
const situacoes = (ctx: CockpitCtx) => dividaPorSituacao(ctx.dataset, g(ctx).divida.devedores);
export const exportarSituacaoCnpj = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Situação do CNPJ na Receita', 'Valor vencido (R$)', 'Empresas', 'Acima do piso'], linhas: () => situacoes(ctx).map(row => [row.situacao, Math.round(row.valor), row.empresas.length, row.acimaDoPiso]) });
export function SituacaoCnpj({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => situacoes(ctx), [ctx.gestao, ctx.dataset]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = rows.reduce((n, row) => n + row.valor, 0), cores: Record<string, string> = { Ativa: tokens.good, Suspensa: tokens.warn, Inapta: tokens.accent, Baixada: tokens.bad };
  const option = useMemo(() => ({
    grid: { top: 4, right: 110, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>CNPJ ${row.situacao.toLowerCase()}</b><br/>${money(row.valor)} · ${int(row.empresas.length)} empresas<br/>${int(row.acimaDoPiso)} acima do piso de execução`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => `CNPJ ${row.situacao.toLowerCase()}`), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: [{ type: 'bar', barWidth: 14, data: rows.map(row => ({ value: row.valor, itemStyle: { color: cores[row.situacao], borderRadius: [0, 4, 4, 0] } })), showBackground: true, backgroundStyle: { color: tokens.soft, borderRadius: 4 },
      label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (params: any) => { const row = rows[params.dataIndex]; return `${brl(row.valor)} · ${pct(row.valor / Math.max(1, total) * 100)} · ${int(row.empresas.length)} emp.`; } } }],
  }), [rows, tokens, total]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Dívida das empresas pela situação do CNPJ na Receita Federal" onPick={params => { const row = rows[params.dataIndex]; if (row?.empresas.length) ctx.open({ kind: 'empresas', title: `Devedoras com CNPJ ${row.situacao.toLowerCase()} na Receita`, what: 'Empresas com anuidade vencida no Crea-SP cujo CNPJ da matriz tem esta situação no cadastro da Receita Federal, na data escolhida.', use: row.situacao === 'Ativa' ? 'Cobre primeiro as de maior valor.' : 'CNPJ baixado ou inapto tem pouca chance de pagar: confira se o registro no Crea-SP ainda devia estar ativo.', ids: row.empresas }); }} />;
}

/* ---------- Mapa: anuidade atrasada de profissionais e dívida por município ---------- */
export type MetricaReceita = 'divida' | 'devedores' | 'atraso';
export const metricasReceita: Record<MetricaReceita, string> = { divida: 'Anuidades vencidas (R$)', devedores: 'Devedores de anuidade', atraso: 'Profissionais com anuidade atrasada' };
/** Na parte dos ativos em atraso, o município precisa de ao menos 5 profissionais ativos; abaixo disso, fica como poucos dados. */
const MINIMO = 5;
export function medidaReceita(ctx: CockpitCtx, metrica: MetricaReceita): Medida {
  const gest = g(ctx), cidades = municipiosSp(ctx.dataset), cidade = new Map<string, number | null>(), gre = new Map<string, number | null>();
  const valor = new Map<string, number>(), devedores = new Map<string, Set<string>>(), ativos = new Map<string, number>(), atraso = new Map<string, number>();
  const somar = (mapa: Map<string, number>, chave: string, n: number) => mapa.set(chave, (mapa.get(chave) ?? 0) + n);
  // O mapa é sempre do estado inteiro: a regional e o município do alto da tela só aproximam o mapa.
  for (const t of gest.carteira.titulos) if (vencidoEm(t, ctx.anchor)) { const quem = `${t.devedor}:${t.pessoaId}`; for (const chave of [t.cityId, `gre:${t.greId}`]) { somar(valor, chave, t.valor); devedores.set(chave, (devedores.get(chave) ?? new Set()).add(quem)); } }
  for (const row of cidades) { const item = gest.adimplencia.get(row.id); for (const chave of [row.id, `gre:${row.greId}`]) { somar(ativos, chave, item?.ativos.length ?? 0); somar(atraso, chave, item?.atraso.length ?? 0); } }
  const medir = (chave: string, minimo: number) => metrica === 'divida' ? valor.get(chave) ?? 0 : metrica === 'devedores' ? devedores.get(chave)?.size ?? 0 : (ativos.get(chave) ?? 0) < minimo ? null : (atraso.get(chave) ?? 0) / ativos.get(chave)! * 100;
  for (const row of cidades) cidade.set(row.id, medir(row.id, MINIMO));
  for (const row of ctx.dataset.gres) gre.set(row.id, medir(`gre:${row.id}`, 1));
  const fmt = metrica === 'atraso' ? (value: number) => pct(value) : metrica === 'divida' ? (value: number) => brl(value) : int;
  return { label: metricasReceita[metrica], curto: metrica === 'atraso' ? 'atrasada' : metrica === 'divida' ? 'vencido' : 'devedores', fmt, alerta: true, cidade, gre,
    dica: cityId => `${brl(valor.get(cityId) ?? 0)} vencidos de ${int(devedores.get(cityId)?.size ?? 0)} devedores · ${int(ativos.get(cityId) ?? 0)} profissionais ativos, ${int(atraso.get(cityId) ?? 0)} em atraso` };
}
