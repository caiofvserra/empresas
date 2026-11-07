import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { int, mes } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { municipiosSp } from '../domain/municipios';
import mercadoJson from '../domain/receita-mercado-sp.json';
import { mesesDoArquivo, quadroReceita, ultimoMesCompleto } from '../domain/receita-mercado';
import type { MercadoReceita, QuadroReceita } from '../domain/receita-mercado';
import { compacto, eixoCategoria, eixoValor, legenda } from '../gestao/comum';

/**
 * Dado real dos dados abertos do CNPJ da Receita no painel de Empresas (07/11/2026): as aberturas e baixas da página Evolução.
 * São números agregados por município; nenhum nome nem CNPJ entra no painel. O cruzamento estabelecimento a estabelecimento
 * com o cadastro do Crea-SP é feito na base interna (integrations/sql/receita-x-cadastro.sql), não aqui.
 */
export const mercadoReceita = mercadoJson as unknown as MercadoReceita;
/** Meses dos gráficos e dos cartões: o período do alto da tela, contado até o último mês completo do arquivo da Receita (no máximo 35, o que o arquivo guarda). */
export const janelaReceita = (ctx: CockpitCtx) => Math.min(mesesDoArquivo(mercadoReceita).length - 1, Math.max(1, ctx.period));
export const mesFinalReceita = ultimoMesCompleto(mercadoReceita);
export function useQuadroReceita(ctx: CockpitCtx, meses = janelaReceita(ctx)): QuadroReceita {
  return useMemo(() => quadroReceita(mercadoReceita, municipiosSp(ctx.dataset), { greId: ctx.greId, cityId: ctx.cidadeId, meses }), [ctx.dataset, ctx.greId, ctx.cidadeId, meses]);
}

/* ---------- Abertos e baixados, mês a mês ---------- */
export function BarrasReceita({ ctx, q }: { ctx: CockpitCtx; q: QuadroReceita }) {
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
