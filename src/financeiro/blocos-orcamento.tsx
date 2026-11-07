import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { brl, int, mes as rotuloMes, money, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import type { Exportavel } from '../cockpit/ui';
import { cnpjComMascara } from '../cockpit/formatos';
import { despesaPublicada, ufs } from '../cockpit/publico';
import { concentracao, execucaoDoAno } from '../domain/financeiro';
import type { DiariasPessoa, FornecedorNoPeriodo } from '../domain/financeiro';
import { compacto, eixoCategoria, eixoValor, legenda } from '../gestao/comum';
import { anosReais, contratosQueTerminam, despesaDoMes, diariasNoPeriodo, fin, fornecedoresNoPeriodo, gruposDespesa, nomesMes, nomesMesLongo, receitaDoMes } from './dados';

/**
 * Blocos da página Orçamento e despesa do painel Financeiro (07/11/2026), com a despesa, o orçamento, as diárias, os
 * fornecedores e os contratos REAIS da Transparência do Crea-SP. Nenhum bloco emite juízo sobre o gasto: mostram quanto, em
 * quê e para quem, e o (i) diz o cuidado de leitura.
 */
const dois = (n: number) => String(n).padStart(2, '0');

/* ---------- Execução acumulada do ano ---------- */
export const exportarExecucao = (mes: string): Exportavel => ({ cabecalho: ['Mês', 'Realizado acumulado (R$)', 'Realizado acumulado no ano anterior (R$)', 'Orçado do ano (R$)'],
  linhas: () => { const e = execucaoDoAno(fin, 'despesa', mes); return e.acumulado.map((row, i) => [nomesMes[i], row.realizado === null ? null : Math.round(row.realizado), Math.round(row.antes), Math.round(e.orcado)]); } });
export function ExecucaoAno({ ctx, mes }: { ctx: CockpitCtx; mes: string }) {
  const { tokens } = ctx, e = execucaoDoAno(fin, 'despesa', mes), ano = Number(mes.slice(0, 4));
  const option = useMemo(() => ({
    grid: { top: 30, right: 8, bottom: 2, left: 4, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', formatter: (items: any[]) => { const i = items[0].dataIndex, row = e.acumulado[i]; return `<b>Janeiro a ${nomesMesLongo[i]}</b><br/>${row.realizado === null ? '' : `Realizado em ${ano}: <b>${money(row.realizado)}</b> (${pct(e.orcado ? row.realizado / e.orcado * 100 : 0)} do orçado do ano)<br/>`}Ritmo do orçado: ${money(e.orcado * (i + 1) / 12)}<br/>Realizado em ${ano - 1}: ${money(row.antes)}`; } },
    xAxis: eixoCategoria(tokens, nomesMes), yAxis: eixoValor(tokens),
    series: [
      { name: `Realizado ${ano}`, type: 'bar', barMaxWidth: 26, data: e.acumulado.map(row => row.realizado), itemStyle: { color: tokens.brand, borderRadius: [3, 3, 0, 0] },
        label: { show: true, position: 'top', color: tokens.ink, fontSize: 11, formatter: (params: any) => { const row = e.acumulado[params.dataIndex]; return row.realizado === null || !e.orcado ? '' : pct(row.realizado / e.orcado * 100); } } },
      { name: 'Ritmo do orçado', type: 'line', data: e.acumulado.map((_, i) => e.orcado * (i + 1) / 12), symbol: 'none', lineStyle: { color: tokens.muted, width: 1.5, type: [5, 4] } },
      { name: `Realizado ${ano - 1}`, type: 'line', data: e.acumulado.map(row => row.antes), symbol: 'circle', symbolSize: 3, lineStyle: { color: tokens.accent, width: 1.5 }, itemStyle: { color: tokens.accent } },
    ],
  }), [e, tokens, ano]);
  return <div className="cs-com-nota"><Chart option={option} tokens={tokens} label="Despesa realizada acumulada no ano contra o orçado e o ano anterior" />
    <p className="cs-nota"><b>{e.orcado ? pct(e.realizado / e.orcado * 100) : '—'}</b> do orçamento de {brl(e.orcado)} realizado até {nomesMesLongo[Number(mes.slice(5, 7)) - 1]}</p></div>;
}

/* ---------- Despesa por grupo: orçado do ano e realizado até o mês ---------- */
const linhasGrupo = (mes: string) => { const ano = mes.slice(0, 4), ate = Number(mes.slice(5, 7));
  return gruposDespesa.map(grupo => ({ grupo, orcado: fin.orcamento.find(row => row.ano === ano && row.tipo === 'despesa' && row.grupo === grupo)?.atual ?? 0,
    realizado: Array.from({ length: ate }, (_, i) => despesaDoMes(`${ano}-${dois(i + 1)}`, grupo)).reduce((a, b) => a + b, 0),
    antes: Array.from({ length: ate }, (_, i) => despesaDoMes(`${Number(ano) - 1}-${dois(i + 1)}`, grupo)).reduce((a, b) => a + b, 0) })).filter(row => row.orcado || row.realizado).sort((a, b) => b.realizado - a.realizado); };
export const exportarGrupos = (mes: string): Exportavel => ({ cabecalho: ['Grupo', 'Orçado do ano (R$)', 'Realizado até o mês (R$)', 'Mesmo período do ano anterior (R$)', '% do orçado'], linhas: () => linhasGrupo(mes).map(row => [row.grupo, Math.round(row.orcado), Math.round(row.realizado), Math.round(row.antes), row.orcado ? Math.round(row.realizado / row.orcado * 1000) / 10 : null]) });
export function Grupos({ ctx, mes }: { ctx: CockpitCtx; mes: string }) {
  const { tokens } = ctx, rows = linhasGrupo(mes);
  const option = useMemo(() => ({
    grid: { top: 26, right: 112, bottom: 2, left: 2, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.grupo}</b><br/>Orçado para ${mes.slice(0, 4)}: ${money(row.orcado)}<br/>Realizado até ${nomesMes[Number(mes.slice(5, 7)) - 1]}: <b>${money(row.realizado)}</b><br/>Mesmo período de ${Number(mes.slice(0, 4)) - 1}: ${money(row.antes)}`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.grupo), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11, width: 176, overflow: 'truncate', interval: 0 } },
    series: [
      { name: 'Orçado do ano', type: 'bar', barMaxWidth: 16, barGap: '-100%', data: rows.map(row => row.orcado), itemStyle: { color: tokens.soft, borderColor: tokens.heat[1], borderWidth: 1, borderRadius: [0, 4, 4, 0] },
        // O rótulo fica depois da barra do orçado, a mais comprida das duas, para não cobrir o realizado.
        label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (params: any) => { const row = rows[params.dataIndex]; return `${brl(row.realizado)}${row.orcado ? ` · ${pct(row.realizado / row.orcado * 100)}` : ''}`; } } },
      { name: 'Realizado até o mês', type: 'bar', barMaxWidth: 8, data: rows.map(row => row.realizado), itemStyle: { color: tokens.brand, borderRadius: [0, 3, 3, 0] }, z: 3 },
    ],
  }), [rows, tokens, mes]);
  return <Chart option={option} tokens={tokens} label="Despesa por grupo: orçado do ano e realizado até o mês" />;
}

/* ---------- Receita, despesa e resultado de cada ano desde 2013 ---------- */
const linhasAno = (mes: string) => anosReais.filter(ano => ano <= mes.slice(0, 4)).map(ano => { const ate = ano === mes.slice(0, 4) ? Number(mes.slice(5, 7)) : 12, meses = Array.from({ length: ate }, (_, i) => `${ano}-${dois(i + 1)}`);
  const receita = meses.reduce((s, m) => s + receitaDoMes(m), 0), despesa = meses.reduce((s, m) => s + despesaDoMes(m), 0); return { ano, ate, receita, despesa, resultado: receita - despesa }; });
export const exportarResultado = (mes: string): Exportavel => ({ cabecalho: ['Ano', 'Receita (R$)', 'Despesa (R$)', 'Resultado (R$)'], linhas: () => linhasAno(mes).map(row => [row.ate < 12 ? `${row.ano} (até ${nomesMes[row.ate - 1]})` : row.ano, Math.round(row.receita), Math.round(row.despesa), Math.round(row.resultado)]) });
export function Resultado({ ctx, mes }: { ctx: CockpitCtx; mes: string }) {
  const { tokens } = ctx, rows = linhasAno(mes);
  const option = useMemo(() => ({
    grid: { top: 30, right: 8, bottom: 2, left: 4, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.ano}${row.ate < 12 ? ` (janeiro a ${nomesMesLongo[row.ate - 1]})` : ''}</b><br/>Receita: ${money(row.receita)}<br/>Despesa: ${money(row.despesa)}<br/>Resultado: <b>${money(row.resultado)}</b>`; } },
    xAxis: eixoCategoria(tokens, rows.map(row => row.ate < 12 ? `${row.ano.slice(2)}*` : row.ano.slice(2))), yAxis: eixoValor(tokens),
    series: [
      { name: 'Resultado', type: 'bar', barMaxWidth: 26, data: rows.map(row => ({ value: row.resultado, itemStyle: { color: row.resultado >= 0 ? tokens.good : tokens.bad, borderRadius: 3 } })),
        label: { show: true, position: 'top', fontSize: 11, fontWeight: 700, color: tokens.ink, formatter: (params: any) => compacto(params.value / 1e6) }, labelLayout: { hideOverlap: true } },
      { name: 'Receita', type: 'line', data: rows.map(row => row.receita), symbol: 'circle', symbolSize: 3, lineStyle: { color: tokens.brand, width: 2 }, itemStyle: { color: tokens.brand } },
      { name: 'Despesa', type: 'line', data: rows.map(row => row.despesa), symbol: 'circle', symbolSize: 3, lineStyle: { color: tokens.accent, width: 2 }, itemStyle: { color: tokens.accent } },
    ],
  }), [rows, tokens]);
  return <div className="cs-com-nota"><Chart option={option} tokens={tokens} label="Receita, despesa e resultado de cada ano desde 2013" />
    <p className="cs-nota">Resultado em R$ milhões. A despesa é a empenhada. O ano com * vai até o mês da data.</p></div>;
}

/* ---------- Diárias por categoria e por pessoa ---------- */
export const categoriasDiarias = ['Conselheiros', 'Empregados', 'Inspetores', 'Colaboradores', 'Jetons'];
const nomeCategoria: Record<string, string> = { Conselheiros: 'Conselheiros', Empregados: 'Empregados', Inspetores: 'Inspetores', Colaboradores: 'Colaboradores', Jetons: 'Jetons de conselheiros' };
const coresDiarias = (tokens: CockpitCtx['tokens']): Record<string, string> => ({ Conselheiros: tokens.brand, Empregados: tokens.blue, Inspetores: '#4A72AD', Colaboradores: '#B7791F', Jetons: tokens.heat[1] });
/** Nome em caixa alta, como a Transparência publica, escrito com as iniciais maiúsculas. */
export const nomeProprio = (nome: string) => nome.toLocaleLowerCase('pt-BR').replace(/(^|\s)(\p{L})/gu, (_, espaco, letra) => espaco + letra.toLocaleUpperCase('pt-BR')).replace(/\s(D[aeo]s?|E)\s/g, m => m.toLocaleLowerCase('pt-BR'));
export function abrirPessoa(ctx: CockpitCtx, p: DiariasPessoa) {
  ctx.open({ kind: 'linhas', eyebrow: nomeCategoria[p.categoria] ?? p.categoria, title: nomeProprio(p.nome), what: 'Diárias pagas a esta pessoa em cada mês do período, como a Transparência do Crea-SP publica (nome e valor; o CPF não é usado).', use: 'Diária paga não é irregularidade: compare com a função da pessoa e com as outras da mesma categoria.',
    listTitle: 'Meses com diária', summary: [['Valor', money(p.valor)], ['Pagamentos', int(p.pagamentos)], ['Meses', int(p.meses)]],
    rows: p.porMes.map(([m, valor, n]) => ({ key: m, title: rotuloMes(m), subtitle: `${int(n)} ${n === 1 ? 'pagamento' : 'pagamentos'}`, value: money(valor), note: '', sortValue: -Number(m.replace('-', '')) })) });
}
export function abrirCategoria(ctx: CockpitCtx, pessoas: DiariasPessoa[], categoria: string | null) {
  const lista = pessoas.filter(row => !categoria || row.categoria === categoria); if (!lista.length) return;
  ctx.open({ kind: 'linhas', title: categoria ? `Diárias: ${nomeCategoria[categoria] ?? categoria}` : 'Diárias por beneficiário', what: 'Quem recebeu diárias no período, com o valor e o número de pagamentos, pelo nome publicado na Transparência do Crea-SP.', use: 'Fiscal de campo e conselheiro do interior viajam mais que quem trabalha na sede. Compare dentro da mesma categoria.',
    listTitle: 'Pessoas, maior valor primeiro', summary: [['Pessoas', int(lista.length)], ['Pagamentos', int(lista.reduce((n, row) => n + row.pagamentos, 0))], ['Valor', brl(lista.reduce((n, row) => n + row.valor, 0))]],
    rows: lista.map(row => ({ key: `${row.categoria}:${row.nome}`, title: nomeProprio(row.nome), subtitle: `${nomeCategoria[row.categoria] ?? row.categoria}`, value: money(row.valor), note: `${int(row.pagamentos)} pagamentos em ${int(row.meses)} ${row.meses === 1 ? 'mês' : 'meses'}`, sortValue: row.valor })) });
}
export const exportarDiarias = (meses: string[]): Exportavel => ({ cabecalho: ['Nome', 'Categoria', 'Pagamentos', 'Meses com diária', 'Valor (R$)'], linhas: () => diariasNoPeriodo(fin, meses).map(row => [nomeProprio(row.nome), nomeCategoria[row.categoria] ?? row.categoria, row.pagamentos, row.meses, Math.round(row.valor)]) });
export function Diarias({ ctx, meses }: { ctx: CockpitCtx; meses: string[] }) {
  const { tokens } = ctx, pessoas = useMemo(() => diariasNoPeriodo(fin, meses), [meses]), cores = coresDiarias(tokens), top = pessoas.slice(0, 10);
  const porCategoria = categoriasDiarias.map(categoria => ({ categoria, valor: pessoas.filter(p => p.categoria === categoria).reduce((s, p) => s + p.valor, 0), n: pessoas.filter(p => p.categoria === categoria).length })).filter(row => row.valor > 0);
  const total = porCategoria.reduce((s, row) => s + row.valor, 0);
  const option = useMemo(() => ({
    grid: { top: 2, right: 70, bottom: 0, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const p = top[items[0].dataIndex]; return p ? `<b>${nomeProprio(p.nome)}</b><br/>${nomeCategoria[p.categoria]}<br/>${money(p.valor)} em ${int(p.pagamentos)} pagamentos, ${int(p.meses)} ${p.meses === 1 ? 'mês' : 'meses'}<br/><span style="opacity:.7">clique para ver mês a mês</span>` : ''; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: top.map(p => nomeProprio(p.nome)), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11, width: 190, overflow: 'truncate' } },
    series: [{ type: 'bar', barMaxWidth: 12, data: top.map(p => ({ value: p.valor, itemStyle: { color: cores[p.categoria] ?? tokens.blue, borderRadius: 3 } })),
      label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, formatter: (params: any) => brl(params.value) } }],
  }), [top, tokens, cores]);
  if (!pessoas.length) return <p className="tile-vazio" role="status">Nenhuma diária no período.</p>;
  return <div className="cs-sede">
    <div className="cs-barra-sede cs-barra-diarias" aria-label="Diárias por categoria de beneficiário">
      {porCategoria.map(row => <button type="button" key={row.categoria} style={{ flex: row.valor, background: cores[row.categoria] }} title={`${nomeCategoria[row.categoria]}: ${brl(row.valor)} para ${int(row.n)} pessoas. Clique para ver a lista.`} onClick={() => abrirCategoria(ctx, pessoas, row.categoria)}>
        <b>{row.valor / Math.max(1, total) >= 0.14 ? row.categoria : ''}</b><small>{row.valor / Math.max(1, total) >= 0.08 ? brl(row.valor) : ''}</small></button>)}
    </div>
    <Chart option={option} tokens={tokens} label="As dez pessoas que mais receberam diárias no período" onPick={params => { const p = top[params.dataIndex]; if (p) abrirPessoa(ctx, p); }} />
  </div>;
}

/* ---------- Maiores fornecedores ---------- */
export function abrirFornecedor(ctx: CockpitCtx, f: FornecedorNoPeriodo) {
  ctx.open({ kind: 'linhas', eyebrow: 'Fornecedor', title: nomeProprio(f.nome), what: `CNPJ ${cnpjComMascara(f.cnpj)}. Pagamentos do Crea-SP a este fornecedor em cada mês do período, pela Transparência. Conta principal: ${f.objeto}.`, use: 'Pagamento alto e regular costuma ser contrato contínuo (tecnologia, limpeza, locação). Confira o contrato antes de concluir.',
    listTitle: 'Meses com pagamento', summary: [['Pago no período', money(f.pago)], ['Meses', int(f.porMes.length)]],
    rows: f.porMes.map(([m, valor]) => ({ key: m, title: rotuloMes(m), subtitle: '', value: money(valor), note: '', sortValue: -Number(m.replace('-', '')) })) });
}
export const exportarFornecedores = (meses: string[]): Exportavel => ({ cabecalho: ['Fornecedor', 'CNPJ', 'Conta principal', 'Pago no período (R$)'], linhas: () => fornecedoresNoPeriodo(fin, meses).map(row => [row.nome, cnpjComMascara(row.cnpj), row.objeto, Math.round(row.pago)]) });
export function Fornecedores({ ctx, meses }: { ctx: CockpitCtx; meses: string[] }) {
  const { tokens } = ctx, todos = useMemo(() => fornecedoresNoPeriodo(fin, meses), [meses]), top = todos.slice(0, 10);
  const total = todos.reduce((s, f) => s + f.pago, 0), cinco = todos.slice(0, 5).reduce((s, f) => s + f.pago, 0), hhi = concentracao(todos.map(f => f.pago));
  const option = useMemo(() => ({
    grid: { top: 2, right: 64, bottom: 0, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const f = top[items[0].dataIndex]; return f ? `<b>${nomeProprio(f.nome)}</b><br/>CNPJ ${cnpjComMascara(f.cnpj)}<br/>${f.objeto}<br/>Pago: <b>${money(f.pago)}</b> (${pct(total ? f.pago / total * 100 : 0, 1)} do pago a empresas)` : ''; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: top.map(f => nomeProprio(f.nome)), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11, width: 200, overflow: 'truncate' } },
    series: [{ type: 'bar', barMaxWidth: 12, data: top.map(f => f.pago), itemStyle: { color: tokens.blue, borderRadius: 3 }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, formatter: (params: any) => brl(params.value) } }],
  }), [top, tokens, total]);
  if (!top.length) return <p className="tile-vazio" role="status">Nenhum pagamento a empresas no período.</p>;
  return <div className="cs-com-nota"><Chart option={option} tokens={tokens} label="Os dez fornecedores que mais receberam no período" onPick={params => { const f = top[params.dataIndex]; if (f) abrirFornecedor(ctx, f); }} />
    <p className="cs-nota">Os cinco maiores ficam com <b>{total ? pct(cinco / total * 100) : '—'}</b> do pago a empresas. Índice de concentração: <b>{hhi === null ? '—' : hhi.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</b>{hhi !== null && hhi > 0.15 ? ', alta' : ''}.</p></div>;
}

/* ---------- Contratos que terminam nos próximos 12 meses ---------- */
const porMesDeFim = (data: string) => { const lista = contratosQueTerminam(fin, data, 12), meses = Array.from({ length: 12 }, (_, i) => { const d = new Date(`${data.slice(0, 7)}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + i); return d.toISOString().slice(0, 7); });
  return meses.map(m => { const doMes = lista.filter(row => row.fim.slice(0, 7) === m); return { mes: m, contratos: doMes, valor: doMes.reduce((s, row) => s + row.valor, 0) }; }); };
export const exportarContratos = (data: string): Exportavel => ({ cabecalho: ['Contrato', 'Contratada', 'CNPJ', 'Valor (R$)', 'Início', 'Fim'], linhas: () => contratosQueTerminam(fin, data, 12).map(row => [row.numero, row.contratada, cnpjComMascara(row.cnpj), Math.round(row.valor), row.inicio.split('-').reverse().join('/'), row.fim.split('-').reverse().join('/')]) });
export function abrirContratos(ctx: CockpitCtx, titulo: string, lista: ReturnType<typeof contratosQueTerminam>) {
  if (!lista.length) return;
  ctx.open({ kind: 'linhas', title: titulo, what: 'Contratos do Crea-SP vigentes na data que terminam no intervalo, pela Transparência: número, contratada, valor e vigência.', use: 'Comece a renovação ou a nova licitação pelo menos três meses antes do fim.',
    listTitle: 'Contratos, o fim mais próximo primeiro', summary: [['Contratos', int(lista.length)], ['Valor', brl(lista.reduce((s, row) => s + row.valor, 0))]],
    rows: lista.map(row => ({ key: row.numero, title: nomeProprio(row.contratada), subtitle: `${row.numero} · ${row.cnpj ? `CNPJ ${cnpjComMascara(row.cnpj)}` : 'pessoa física'}`, value: money(row.valor), note: `termina em ${row.fim.split('-').reverse().join('/')}`, sortValue: -Date.parse(row.fim) })) });
}
export function Contratos({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = porMesDeFim(ctx.anchor);
  const option = useMemo(() => ({
    grid: { top: 18, right: 4, bottom: 2, left: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${nomesMesLongo[Number(row.mes.slice(5, 7)) - 1]} de ${row.mes.slice(0, 4)}</b><br/>${int(row.contratos.length)} contratos terminam<br/>${money(row.valor)}`; } },
    xAxis: eixoCategoria(tokens, rows.map((row, i) => i === 0 || row.mes.endsWith('-01') ? `${nomesMes[Number(row.mes.slice(5, 7)) - 1]}\n${row.mes.slice(0, 4)}` : nomesMes[Number(row.mes.slice(5, 7)) - 1]), { axisLabel: { color: tokens.muted, fontSize: 11, interval: 0, rotate: 0, lineHeight: 14 } }), yAxis: eixoValor(tokens, { show: false, minInterval: 1 }),
    series: [{ type: 'bar', barMaxWidth: 26, data: rows.map((row, i) => ({ value: row.contratos.length, itemStyle: { color: i < 3 ? tokens.bad : tokens.blue, borderRadius: [3, 3, 0, 0] } })),
      label: { show: true, position: 'top', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (params: any) => params.value ? String(params.value) : '' } }],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Contratos vigentes que terminam em cada um dos próximos 12 meses" onPick={params => { const row = rows[params.dataIndex]; if (row) abrirContratos(ctx, `Contratos que terminam em ${nomesMesLongo[Number(row.mes.slice(5, 7)) - 1]} de ${row.mes.slice(0, 4)}`, row.contratos); }} />;
}

/* ---------- Despesa e receita por profissional ativo ---------- */
/**
 * O ano fechado mais recente, dividido pelos profissionais ativos de SP no Confea. Os outros Creas publicam no mesmo sistema
 * (crea-XX.implanta.net.br), mas a rede deste ambiente ainda não chega a eles: a comparação entra quando essa coleta for liberada.
 */
export function DespesaPorAtivo({ ctx }: { ctx: CockpitCtx }) {
  void ctx;
  const ultimo = despesaPublicada.exercicios.at(-1)!, sp = ufs.find(row => row.uf === 'SP'), ativos = sp?.ativos ?? 0;
  const receita = Array.from({ length: 12 }, (_, i) => receitaDoMes(`${ultimo.ano}-${dois(i + 1)}`)).reduce((a, b) => a + b, 0);
  const porAtivo = (valor: number) => ativos ? money(valor / ativos) : '—';
  return <div className="fin-por-ativo">
    <div className="fin-por-ativo-par">
      <div className="cs-bench-sp"><span>Despesa por ativo em {ultimo.ano}</span><strong>{porAtivo(ultimo.valor)}</strong><small>{brl(ultimo.valor)} de despesa</small></div>
      <div className="cs-bench-sp"><span>Receita por ativo em {ultimo.ano}</span><strong>{porAtivo(receita)}</strong><small>{brl(receita)} de receita</small></div>
    </div>
    <p className="cs-nota">Para {int(ativos)} profissionais ativos em SP no Confea. A comparação com outros Creas entra quando a coleta deles for liberada.</p>
  </div>;
}
