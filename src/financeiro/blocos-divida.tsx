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

/** Blocos da página Dívida e cobrança do painel Financeiro (vieram da página Receita e dívida do antigo painel de Gestão, 06/11/2026). */
const nomesMes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const diasDesde = (de: string, ate: string) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86400000);

/* ---------- Dívida por idade, abaixo e acima do piso de execução ---------- */
export const exportarIdadeDivida = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Vencida há', 'Abaixo do piso (R$)', 'Acima do piso (R$)', 'Profissionais (R$)', 'Empresas (R$)', 'Devedores'], linhas: () => g(ctx).divida.idade.map(row => [row.faixa, Math.round(row.abaixo), Math.round(row.acima), Math.round(row.pf), Math.round(row.pj), row.pessoas.size]) });
export function IdadeDivida({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, d = g(ctx).divida, rows = d.idade;
  const option = useMemo(() => ({
    grid: { top: 24, right: 70, bottom: 2, left: 2, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>Vencida há ${row.faixa}</b><br/>Abaixo do piso: ${money(row.abaixo)}<br/>Acima do piso: ${money(row.acima)}<br/>Profissionais ${money(row.pf)} · empresas ${money(row.pj)}<br/>${int(row.pessoas.size)} devedores`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.faixa), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [
      { name: `Abaixo do piso (${brl(d.piso)})`, type: 'bar', stack: 'i', barWidth: 14, data: rows.map(row => row.abaixo), itemStyle: { color: tokens.heat[1] } },
      { name: 'Acima do piso', type: 'bar', stack: 'i', data: rows.map(row => row.acima), itemStyle: { color: tokens.brand, borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (params: any) => brl(rows[params.dataIndex].abaixo + rows[params.dataIndex].acima) } },
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
    xAxis: eixoCategoria(tokens, etapas.map(e => e.nome), { axisLabel: { color: tokens.ink, fontSize: 11, interval: 0 } }), yAxis: eixoValor(tokens),
    series: [{ type: 'bar', stack: 'c', silent: true, data: etapas.map(e => e.base), itemStyle: { color: 'transparent' } },
      { type: 'bar', stack: 'c', barWidth: '58%', data: etapas.map((e, index) => ({ value: e.valor, itemStyle: { color: e.cor, borderRadius: 3 }, label: { show: true, position: 'top', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: () => `${index === 1 ? '+' : index === 2 || index === 3 ? '−' : ''}${brl(e.valor)}` } })) }],
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
    xAxis: eixoCategoria(tokens, Array.from({ length: 25 }, (_, k) => String(k)), { boundaryGap: false, name: 'meses depois do vencimento', nameLocation: 'middle', nameGap: 20, nameTextStyle: { color: tokens.muted, fontSize: 11 }, axisLabel: { color: tokens.muted, fontSize: 11, interval: 5 } }),
    yAxis: eixoValor(tokens, { max: 100, axisLabel: { color: tokens.muted, fontSize: 11, formatter: '{value}%' } }),
    series: q.map((row, index) => ({ name: row.nome, type: 'line', smooth: 0.2, symbol: 'none', lineStyle: { color: cores[index], width: index === q.length - 1 ? 2.6 : 1.6 }, itemStyle: { color: cores[index] },
      data: row.curva, endLabel: { show: true, color: cores[index], fontSize: 11, fontWeight: 700, formatter: (params: any) => pct(params.value) } })),
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
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => `CNPJ ${row.situacao.toLowerCase()}\n${int(row.empresas.length)} empresas`), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11, lineHeight: 15 } },
    series: [{ type: 'bar', barWidth: 14, data: rows.map(row => ({ value: row.valor, itemStyle: { color: cores[row.situacao], borderRadius: [0, 4, 4, 0] } })), showBackground: true, backgroundStyle: { color: tokens.soft, borderRadius: 4 },
      label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, formatter: (params: any) => { const row = rows[params.dataIndex]; return `${brl(row.valor)} · ${pct(row.valor / Math.max(1, total) * 100)}`; } } }],
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

/* ---------- Protestos por categoria ---------- */
/**
 * Valor levado a protesto por categoria, no recorte. A anuidade protestada é a dos devedores acima do piso com título vencido há
 * mais de um ano; as outras categorias seguem a proporção que o painel de arrecadação em uso no Crea-SP mostra para elas
 * (parcelamento, multa, honorários e os acréscimos do auto de infração). DEMONSTRATIVO: em produção, vem do sistema de cobrança.
 */
export function protestos(ctx: CockpitCtx) {
  const d = g(ctx).divida, umAno = new Date(`${ctx.anchor}T00:00:00Z`); umAno.setUTCFullYear(umAno.getUTCFullYear() - 1);
  const limite = umAno.toISOString().slice(0, 10), alvo = d.devedores.filter(row => row.acimaDoPiso && row.maisAntigo <= limite);
  const anuidade = alvo.reduce((s, row) => s + row.valor, 0);
  const rows = [{ nome: 'Parcelamento em atraso', valor: anuidade * 1.66 }, { nome: 'Anuidade', valor: anuidade }, { nome: 'Multa', valor: anuidade * 0.45 }, { nome: 'Honorários advocatícios', valor: anuidade * 0.31 },
    { nome: 'Multa de auto de infração', valor: anuidade * 0.00035 }, { nome: 'Juros e correção de auto de infração', valor: anuidade * 0.000005 }];
  return { rows, total: rows.reduce((s, row) => s + row.valor, 0), devedores: alvo };
}
export const exportarProtestos = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Categoria', 'Valor protestado (R$)'], linhas: () => protestos(ctx).rows.map(row => [row.nome, Math.round(row.valor)]) });
export function Protestos({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, p = useMemo(() => protestos(ctx), [ctx.gestao, ctx.anchor]); // eslint-disable-line react-hooks/exhaustive-deps
  const option = useMemo(() => ({
    grid: { top: 4, right: 96, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = p.rows[items[0].dataIndex]; return `<b>${row.nome}</b><br/>${money(row.valor)} · ${pct(p.total ? row.valor / p.total * 100 : 0)} do protestado`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: p.rows.map(row => row.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [{ type: 'bar', barMaxWidth: 18, data: p.rows.map((row, index) => ({ value: row.valor, itemStyle: { color: index === 1 ? tokens.brand : tokens.blue, borderRadius: [0, 4, 4, 0] } })), showBackground: true, backgroundStyle: { color: tokens.soft, borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (params: any) => brl(p.rows[params.dataIndex].valor) } }],
  }), [p, tokens]);
  return <div className="cs-com-nota"><Chart option={option} tokens={tokens} label="Valor levado a protesto por categoria" onPick={params => { if (params.dataIndex === 1) abrirDevedores(ctx, 'Anuidades protestadas', p.devedores, 'Devedores acima do piso de execução com anuidade vencida há mais de um ano: os que vão a protesto.', 'O protesto interrompe a prescrição e costuma trazer o pagamento antes da execução judicial.'); }} />
    <p className="cs-nota"><b>{brl(p.total)}</b> protestados no recorte. Clique em Anuidade para ver os devedores.</p></div>;
}

/* ---------- Adimplência de profissionais e empresas ---------- */
export function adimplencia(ctx: CockpitCtx) {
  const r = ctx.profissionais.resumo, linhas = ctx.linhas.filter(row => !ctx.greId || row.id === ctx.greId);
  const ativas = linhas.reduce((s, row) => s + row.ativas.length, 0), devedoras = linhas.reduce((s, row) => s + row.devedoras.length, 0);
  return { profissionais: { registros: r.registrados.length, ativos: r.ativos.length, inadimplentes: r.inadimplentes.length }, empresas: { registros: ativas, ativos: ativas, inadimplentes: devedoras } };
}
export const exportarAdimplencia = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Quem', 'Registros', 'Ativos', 'Adimplentes', 'Inadimplentes', 'Inadimplentes (%)'], linhas: () => { const a = adimplencia(ctx);
  return ([['Profissionais', a.profissionais], ['Empresas', a.empresas]] as const).map(([nome, x]) => [nome, x.registros, x.ativos, x.ativos - x.inadimplentes, x.inadimplentes, x.ativos ? Math.round(x.inadimplentes / x.ativos * 1000) / 10 : null]); } });
export function Adimplencia({ ctx }: { ctx: CockpitCtx }) {
  const a = adimplencia(ctx), d = g(ctx).divida;
  const coluna = (nome: string, x: { registros: number; ativos: number; inadimplentes: number }, abrir: () => void, nota: string) => { const taxa = x.ativos ? x.inadimplentes / x.ativos * 100 : 0;
    return <div className="fin-adim">
      <h4>{nome}</h4>
      <dl><div><dt>Registros</dt><dd>{int(x.registros)}</dd></div><div><dt>Ativos</dt><dd>{int(x.ativos)}</dd></div><div><dt>Adimplentes</dt><dd>{int(x.ativos - x.inadimplentes)}</dd></div>
        <div className="is-ruim"><dt>Inadimplentes</dt><dd><button className="fin-link" onClick={abrir}>{int(x.inadimplentes)}</button></dd></div></dl>
      <span className="fin-adim-barra" role="img" aria-label={`${pct(taxa)} dos ativos inadimplentes`}><span style={{ width: `${100 - taxa}%` }} /></span>
      <p><b>{pct(taxa, 1)}</b> {nota}</p></div>; };
  return <div className="fin-adim-par">
    {coluna('Profissionais', a.profissionais, () => abrirDevedores(ctx, 'Profissionais com anuidade vencida', d.devedores.filter(row => row.devedor === 'Profissional'), 'Profissionais com anuidade vencida e não paga na data.'), 'dos ativos com anuidade atrasada')}
    {coluna('Empresas', a.empresas, () => abrirDevedores(ctx, 'Empresas com anuidade vencida', d.devedores.filter(row => row.devedor === 'Empresa'), 'Empresas com anuidade vencida e não paga na data.'), 'das registradas com anuidade vencida')}
  </div>;
}
