import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { int, mes, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import type { Exportavel } from '../cockpit/ui';
import { municipiosSp } from '../domain/municipios';
import catalogo from '../domain/cnae-catalog.json';
import mercadoJson from '../domain/receita-mercado-sp.json';
import { mesesAte, mesesDoArquivo, portes, quadroReceita, situacoesReceita, somaMeses, ultimoMesCompleto } from '../domain/receita-mercado';
import type { MercadoReceita, Porte, QuadroReceita } from '../domain/receita-mercado';
import { compacto, eixoCategoria, eixoValor, legenda } from '../gestao/comum';
import { corDoTexto } from '../cockpit/formatos';
import type { Medida } from '../gestao/comum';

/**
 * Blocos da página CNPJ do painel de Empresas (07/11/2026): o mercado de engenharia nos dados abertos do CNPJ da Receita, com dado
 * real. São números agregados por município; nenhum nome nem CNPJ entra no painel. O cruzamento estabelecimento a estabelecimento
 * com o cadastro do Crea-SP é feito na base interna (integrations/sql/receita-x-cadastro.sql), não aqui.
 */
export const mercadoReceita = mercadoJson as unknown as MercadoReceita;
const nomeCnae = new Map((catalogo as { code: string; label: string }[]).map(row => [row.code, row.label]));
/** Meses dos gráficos e dos cartões: o período do alto da tela, contado até o último mês completo do arquivo da Receita (no máximo 35, o que o arquivo guarda). */
export const mesesReceita = (ctx: CockpitCtx) => Math.min(mesesDoArquivo(mercadoReceita).length - 1, Math.max(1, ctx.period));
export const ultimoMesReceita = ultimoMesCompleto(mercadoReceita);
export function useQuadroReceita(ctx: CockpitCtx, meses = mesesReceita(ctx)): QuadroReceita {
  return useMemo(() => quadroReceita(mercadoReceita, municipiosSp(ctx.dataset), { greId: ctx.greId, cityId: ctx.cidadeId, meses }), [ctx.dataset, ctx.greId, ctx.cidadeId, meses]);
}

/* ---------- Mapa ---------- */
export type MetricaCnpj = 'ativos' | 'aberturas' | 'baixas';
export const metricasCnpj: Record<MetricaCnpj, string> = { ativos: 'Estabelecimentos ativos', aberturas: 'Abertos no período', baixas: 'Baixados no período' };
/** O mapa mostra sempre o estado inteiro: a regional e o município do alto da tela só aproximam a imagem. */
/** Posições, nas séries do arquivo, dos meses do período escolhido. */
const posicoesDoPeriodo = (ctx: CockpitCtx) => { const doArquivo = mesesDoArquivo(mercadoReceita); return mesesAte(ultimoMesCompleto(mercadoReceita), mesesReceita(ctx)).map(mes => doArquivo.indexOf(mes)).filter(i => i >= 0); };
export function medidaCnpj(ctx: CockpitCtx, metrica: MetricaCnpj): Medida {
  const posicoes = posicoesDoPeriodo(ctx), cidade = new Map<string, number | null>(), gre = new Map<string, number | null>();
  const valor = (id: string) => { const row = mercadoReceita.municipios[id]; if (!row) return 0;
    if (metrica === 'ativos') return row.sim + row.passivel;
    return somaMeses(metrica === 'aberturas' ? row.aberturas : row.baixas, posicoes); };
  for (const m of municipiosSp(ctx.dataset)) { const v = valor(m.id); cidade.set(m.id, v); gre.set(m.greId, (gre.get(m.greId) ?? 0) + v); }
  return { label: metricasCnpj[metrica], curto: metrica === 'ativos' ? 'Ativos' : metrica === 'aberturas' ? 'Abertos' : 'Baixados', fmt: int, cidade, gre,
    dica: id => { const row = mercadoReceita.municipios[id]; return row ? `${int(row.sim)} de registro obrigatório e ${int(row.passivel)} a analisar` : 'nenhum estabelecimento com atividade da lista'; } };
}
export const exportarMapaCnpj = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Código do IBGE', 'Município', 'GRE', 'Ativos de registro obrigatório', 'Ativos a analisar', `Abertos em ${mesesReceita(ctx)} meses`, `Baixados em ${mesesReceita(ctx)} meses`],
  linhas: () => { const posicoes = posicoesDoPeriodo(ctx), soma = (serie: number[]) => somaMeses(serie, posicoes);
    return municipiosSp(ctx.dataset).map(m => { const row = mercadoReceita.municipios[m.id]; return [m.id, m.nome, m.greId.replace('GRE', 'GRE '), row?.sim ?? 0, row?.passivel ?? 0, row ? soma(row.aberturas) : 0, row ? soma(row.baixas) : 0]; }); } });

/* ---------- Atividades com mais estabelecimentos ---------- */
const NO_BLOCO = 12;
export const exportarAtividadesCnpj = (q: QuadroReceita): Exportavel => ({ cabecalho: ['Atividade', 'CNAE', 'Estabelecimentos ativos'], linhas: () => {
  const linhas: (string | number)[][] = q.atividades.map(row => [nomeCnae.get(row.cnae) ?? row.cnae, row.cnae, row.n]), resto = q.sim + q.passivel - q.atividades.reduce((n, row) => n + row.n, 0);
  return resto > 0 ? [...linhas, ['Outras atividades da lista (fora das 20 maiores do município)', '', resto]] : linhas; } });
export function AtividadesCnpj({ ctx, q }: { ctx: CockpitCtx; q: QuadroReceita }) {
  const { tokens } = ctx, total = q.sim + q.passivel, rows = q.atividades.slice(0, NO_BLOCO);
  // O resto é o total menos as atividades mostradas: no município, o arquivo traz só as 20 maiores, e a soma da cauda ficaria curta.
  const resto = Math.max(0, total - rows.reduce((n, row) => n + row.n, 0));
  const linhas = useMemo(() => [...rows.map(row => ({ nome: nomeCnae.get(row.cnae) ?? 'Atividade sem nome na lista', n: row.n, outra: false })), ...(resto ? [{ nome: 'Outras atividades da lista', n: resto, outra: true }] : [])], [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const option = useMemo(() => ({
    grid: { top: 2, right: 92, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = linhas[items[0].dataIndex]; return `<b>${row.nome}</b><br/>${int(row.n)} estabelecimentos ativos, ${pct(row.n / Math.max(1, total) * 100, 1)} do recorte`; } },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', inverse: true, data: linhas.map(row => row.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11, width: 230, overflow: 'truncate' } },
    series: [{ type: 'bar', barMaxWidth: 34, data: linhas.map(row => ({ value: row.n, itemStyle: { color: row.outra ? tokens.muted : tokens.blue, borderRadius: [0, 4, 4, 0] } })), showBackground: true, backgroundStyle: { color: tokens.soft, borderRadius: 4 },
      label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, formatter: (params: any) => `${int(linhas[params.dataIndex].n)} · ${pct(linhas[params.dataIndex].n / Math.max(1, total) * 100)}` } }],
  }), [linhas, tokens, total]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Atividades da lista do Crea-SP com mais estabelecimentos ativos na Receita" />;
}

/* ---------- Abertos e baixados mês a mês ---------- */
export const exportarMesesCnpj = (q: QuadroReceita): Exportavel => ({ cabecalho: ['Mês', 'Abertos', 'Baixados', 'Saldo'], linhas: () => q.meses.map(row => [mes(row.mes), row.aberturas, row.baixas, row.aberturas - row.baixas]) });
export function MesesCnpj({ ctx, q }: { ctx: CockpitCtx; q: QuadroReceita }) {
  const { tokens } = ctx, rows = q.meses, poucos = rows.length <= 12;
  const option = useMemo(() => ({
    grid: { top: 30, right: 6, bottom: 2, left: 4, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex], saldo = row.aberturas - row.baixas; return `<b>${mes(row.mes)}</b><br/>Abertos: ${int(row.aberturas)}<br/>Baixados: ${int(row.baixas)}<br/>Saldo: <b>${saldo >= 0 ? '+' : ''}${int(saldo)}</b>`; } },
    xAxis: eixoCategoria(tokens, rows.map(row => mes(row.mes))), yAxis: eixoValor(tokens),
    series: [
      { name: 'Abertos', type: 'bar', stack: 'm', barMaxWidth: 34, data: rows.map(row => row.aberturas), itemStyle: { color: tokens.blue, borderRadius: [3, 3, 0, 0] }, label: { show: poucos, position: 'top', color: tokens.ink, fontSize: 11, formatter: (p: any) => compacto(p.value) } },
      { name: 'Baixados', type: 'bar', stack: 'm', barMaxWidth: 34, data: rows.map(row => -row.baixas), itemStyle: { color: tokens.accent, borderRadius: [0, 0, 3, 3] }, label: { show: poucos, position: 'bottom', color: tokens.ink, fontSize: 11, formatter: (p: any) => compacto(-p.value) } },
      { name: 'Saldo', type: 'line', data: rows.map(row => row.aberturas - row.baixas), symbol: 'circle', symbolSize: 5, lineStyle: { color: tokens.ink, width: 1.6 }, itemStyle: { color: tokens.ink } },
    ],
  }), [rows, tokens, poucos]);
  return <Chart option={option} tokens={tokens} label="Estabelecimentos com atividade da lista abertos e baixados na Receita, mês a mês" />;
}

/* ---------- Situação na Receita e porte ---------- */
const nomePorte: Record<Porte, string> = { ME: 'Microempresa', EPP: 'Pequeno porte', Demais: 'Demais portes', 'Não informado': 'Não informado' };
export const exportarSituacaoPorte = (q: QuadroReceita): Exportavel => ({ cabecalho: ['Grupo', 'Categoria', 'Estabelecimentos'], linhas: () => [...situacoesReceita.map(s => ['Situação na Receita', s, q.situacao[s]]), ...portes.map(p => ['Porte da empresa (ativos)', p, q.porte[p]])] });
export function SituacaoPorte({ ctx, q }: { ctx: CockpitCtx; q: QuadroReceita }) {
  const { tokens } = ctx;
  const grupos = useMemo(() => [
    { nome: 'Situação', partes: situacoesReceita.map((s, i) => ({ nome: s, n: q.situacao[s], cor: [tokens.good, tokens.warn, tokens.accent, tokens.bad][i] })) },
    { nome: 'Porte (ativos)', partes: portes.map((p, i) => ({ nome: nomePorte[p], n: q.porte[p], cor: [tokens.heat[1], tokens.blue, tokens.brand, tokens.muted][i] })) },
  ], [q, tokens]);
  // Uma série por posição (a primeira situação e o primeiro porte, depois a segunda...), cada barra com as suas cores e nomes.
  const option = useMemo(() => ({
    grid: { top: 2, right: 8, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'item', formatter: (item: any) => { const g = grupos[item.dataIndex], p = g.partes[item.seriesIndex], total = g.partes.reduce((n, x) => n + x.n, 0); return `<b>${g.nome}: ${p.nome}</b><br/>${int(p.n)} estabelecimentos, ${pct(p.n / Math.max(1, total) * 100, 1)} do total`; } },
    xAxis: { type: 'value', max: 100, show: false },
    yAxis: { type: 'category', inverse: true, data: grupos.map(g => g.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [0, 1, 2, 3].map(i => ({ type: 'bar', stack: 's', barMaxWidth: 34,
      data: grupos.map(g => { const total = g.partes.reduce((n, x) => n + x.n, 0), p = g.partes[i], v = total ? p.n / total * 100 : 0;
        return { value: v, itemStyle: { color: p.cor }, label: { show: v >= 6, position: 'inside', fontSize: 11, color: corDoTexto(p.cor), formatter: () => v >= 30 ? `${p.nome} ${pct(v)}` : pct(v) } }; }) })),
  }), [grupos, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Estabelecimentos com atividade da lista pela situação na Receita e pelo porte da empresa" />;
}
