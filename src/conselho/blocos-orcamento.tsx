import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { brl, int, mes, money, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import type { Exportavel } from '../cockpit/ui';
import { vencimentoContratos } from '../domain/gestao';
import { despesaPublicada, ufs } from '../cockpit/publico';
import { change, compacto, eixoCategoria, eixoValor, g, legenda } from './comum';

/**
 * Blocos da página Orçamento e despesa (06/11/2026). Vêm da antiga aba Controle interno do painel geral, organizada como no QUEDA
 * (atividade-fim e meio, natureza, sede e território, diárias, fornecedores e contratos, pessoal), mais a execução acumulada do ano,
 * o calendário de vencimento dos contratos e a despesa publicada por profissional ativo. Nenhum bloco emite juízo sobre o gasto.
 */
const nomesMes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/* ---------- Execução acumulada do ano ---------- */
export const exportarExecucao = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Mês', 'Orçado acumulado', 'Realizado acumulado', 'Realizado acumulado no ano anterior'], linhas: () => g(ctx).despesaAcumulada.map(row => [nomesMes[row.mes - 1], row.previsto, row.realizado, row.realizadoAntes]) });
export function ExecucaoAno({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = g(ctx).despesaAcumulada, ano = ctx.anchor.slice(0, 4), ultimo = rows.filter(row => row.realizado !== null).at(-1);
  const option = useMemo(() => ({
    grid: { top: 26, right: 8, bottom: 2, left: 4, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>Janeiro a ${nomesMes[row.mes - 1]}</b><br/>${row.realizado === null ? '' : `Realizado em ${ano}: ${money(row.realizado)} (${pct(row.realizado / Math.max(1, row.previsto!) * 100)} do orçado)<br/>Orçado: ${money(row.previsto!)}<br/>`}Realizado em ${Number(ano) - 1}: ${money(row.realizadoAntes)}`; } },
    xAxis: eixoCategoria(tokens, nomesMes), yAxis: eixoValor(tokens),
    series: [
      { name: `Orçado ${ano}`, type: 'bar', barWidth: '62%', barGap: '-100%', data: rows.map(row => row.previsto), itemStyle: { color: tokens.soft, borderColor: tokens.heat[1], borderWidth: 1, borderRadius: [3, 3, 0, 0] }, z: 1 },
      { name: `Realizado ${ano}`, type: 'bar', barWidth: '34%', data: rows.map(row => row.realizado), itemStyle: { color: tokens.brand, borderRadius: [3, 3, 0, 0] }, z: 2,
        label: { show: true, position: 'top', color: tokens.ink, fontSize: 9, formatter: (params: any) => { const row = rows[params.dataIndex]; return row.realizado === null || !row.previsto ? '' : pct(row.realizado / row.previsto * 100); } } },
      { name: `Realizado ${Number(ano) - 1}`, type: 'line', data: rows.map(row => row.realizadoAntes), symbol: 'circle', symbolSize: 4, lineStyle: { color: tokens.accent, width: 1.6, type: [4, 4] }, itemStyle: { color: tokens.accent } },
    ],
  }), [rows, tokens, ano]);
  return <div className="cs-com-nota">
    <Chart option={option} tokens={tokens} label="Despesa orçada e realizada acumulada no ano" />
    {ultimo?.previsto ? <p className="cs-nota"><b>{pct(ultimo.realizado! / ultimo.previsto * 100)}</b> do orçado até {nomesMes[ultimo.mes - 1]}</p> : null}
  </div>;
}

/* ---------- Atividade-fim e atividade-meio por ano ---------- */
export const exportarFimMeio = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Ano', 'Atividade-fim (R$)', 'Atividade-meio (R$)', 'Atividade-fim (%)'], linhas: () => ctx.conselho.fimMeio.map(row => [row.ano, Math.round(row.fim), Math.round(row.meio), Math.round(row.fim / Math.max(1, row.fim + row.meio) * 1000) / 10]) });
export function FimMeio({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = ctx.conselho.fimMeio;
  const option = useMemo(() => ({
    grid: { top: 30, right: 4, bottom: 2, left: 4, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex], total = row.fim + row.meio; return `<b>${row.ano}</b>${row.ano === rows.at(-1)?.ano ? ' · até a data de referência' : ''}<br/>Fim: ${money(row.fim)} (${pct(row.fim / Math.max(1, total) * 100)})<br/>Meio: ${money(row.meio)}`; } },
    xAxis: eixoCategoria(tokens, rows.map(row => row.ano)), yAxis: eixoValor(tokens, { show: false }),
    series: [
      { name: 'Atividade-fim', type: 'bar', stack: 'd', barWidth: '58%', data: rows.map(row => row.fim), itemStyle: { color: tokens.brand } },
      { name: 'Atividade-meio', type: 'bar', stack: 'd', data: rows.map(row => row.meio), itemStyle: { color: tokens.heat[1], borderRadius: [3, 3, 0, 0] }, label: { show: true, position: 'top', color: tokens.ink, fontSize: 10, fontWeight: 700, formatter: (params: any) => { const row = rows[params.dataIndex]; return `${pct(row.fim / Math.max(1, row.fim + row.meio) * 100)} fim`; } } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Despesa em atividades-fim e atividades-meio por ano" />;
}

/* ---------- Despesa por natureza ---------- */
const naturezas = (ctx: CockpitCtx) => [...ctx.conselho.porNatureza].sort((a, b) => b.realizado - a.realizado);
export const exportarNaturezas = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Natureza', 'Orçado 12 meses (R$)', 'Realizado 12 meses (R$)', 'Realizado nos 12 meses anteriores (R$)'], linhas: () => naturezas(ctx).map(row => [row.natureza, Math.round(row.orcado), Math.round(row.realizado), Math.round(row.antes)]) });
export function Naturezas({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => naturezas(ctx), [ctx.conselho]); // eslint-disable-line react-hooks/exhaustive-deps
  const option = useMemo(() => ({
    grid: { top: 24, right: 96, bottom: 2, left: 2, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex], delta = change(row.realizado, row.antes); return `<b>${row.natureza}</b><br/>Orçado: ${money(row.orcado)}<br/>Realizado: ${money(row.realizado)} (${pct(row.realizado / Math.max(1, row.orcado) * 100)} do orçado)${delta === null ? '' : `<br/>${delta >= 0 ? '+' : ''}${pct(delta)} em relação aos 12 meses anteriores`}`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.natureza), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5, width: 130, overflow: 'truncate' } },
    series: [
      { name: 'Orçado', type: 'bar', barWidth: 15, barGap: '-100%', data: rows.map(row => row.orcado), itemStyle: { color: tokens.soft, borderColor: tokens.heat[1], borderWidth: 1, borderRadius: 4 }, z: 1 },
      { name: 'Realizado', type: 'bar', barWidth: 7, data: rows.map(row => row.realizado), itemStyle: { color: tokens.brand, borderRadius: 3 }, z: 2,
        label: { show: true, position: 'right', distance: 24, fontSize: 10, formatter: (params: any) => { const row = rows[params.dataIndex], delta = change(row.realizado, row.antes); return `{n|${brl(row.realizado)}} {${delta === null || Math.abs(delta) < 0.5 ? 'n' : delta > 0 ? 'r' : 'g'}|${delta === null ? '' : `${delta >= 0 ? '+' : ''}${pct(delta)}`}}`; },
          rich: { n: { color: tokens.ink, fontWeight: 700, fontSize: 10 }, g: { color: tokens.good, fontWeight: 700, fontSize: 9.5 }, r: { color: tokens.bad, fontWeight: 700, fontSize: 9.5 } } } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Despesa por natureza: orçado e realizado nos últimos 12 meses" />;
}

/* ---------- Sede e regionais, e a despesa de fiscalização de cada GRE ---------- */
const porGre = (ctx: CockpitCtx) => [...ctx.conselho.sedeTerritorio.porGre].sort((a, b) => b.valor - a.valor);
export const exportarSede = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['GRE', 'Despesa de fiscalização em 12 meses (R$)'], linhas: () => [['Sede (toda a despesa)', Math.round(ctx.conselho.sedeTerritorio.sede)], ['Regionais (toda a despesa)', Math.round(ctx.conselho.sedeTerritorio.territorio)], ...porGre(ctx).map(row => [ctx.dataset.gres.find(item => item.id === row.greId)?.name ?? row.greId, Math.round(row.valor)])] });
export function SedeTerritorio({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, s = ctx.conselho.sedeTerritorio, gres = new Map(ctx.dataset.gres.map(row => [row.id, row.name]));
  const rows = useMemo(() => porGre(ctx), [s]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = s.sede + s.territorio;
  const option = useMemo(() => ({
    grid: { top: 4, right: 58, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${gres.get(row.greId) ?? row.greId}</b><br/>${money(row.valor)} de despesa de fiscalização em 12 meses<br/><span style="opacity:.7">clique para filtrar a página pela GRE</span>`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => gres.get(row.greId) ?? row.greId), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 9.5, interval: 0 } },
    series: [{ type: 'bar', barWidth: 7, data: rows.map(row => row.valor), itemStyle: { color: tokens.blue, borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 9.5, formatter: (params: any) => brl(params.value) } }],
  }), [rows, tokens, gres]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="cs-sede">
    <div className="cs-barra-sede" aria-label="Despesa da sede e das regionais">
      <span style={{ flex: s.sede }}><b>Sede {pct(s.sede / Math.max(1, total) * 100)}</b><small>{brl(s.sede)}</small></span>
      <span style={{ flex: s.territorio }}><b>Regionais {pct(s.territorio / Math.max(1, total) * 100)}</b><small>{brl(s.territorio)}</small></span>
    </div>
    <Chart option={option} tokens={tokens} label="Despesa de fiscalização em cada GRE" onPick={params => { const row = rows[params.dataIndex]; if (row) ctx.filtrar({ gre: row.greId }); }} />
  </div>;
}

/* ---------- Diárias por categoria e por pessoa ---------- */
const diarias = (ctx: CockpitCtx) => [...ctx.conselho.diarias].sort((a, b) => b.valor - a.valor);
const coresDiarias = (ctx: CockpitCtx) => [ctx.tokens.brand, ctx.tokens.blue, '#4A72AD', '#B7791F'];
/** Nome curto para caber no retângulo: primeiro nome e último sobrenome, mantendo o título do conselheiro. */
const nomeCurto = (nome: string) => { const partes = nome.split(' '), titulo = partes[0].startsWith('Eng') ? partes.slice(0, partes[1] === 'agr.' ? 2 : 1) : [], resto = partes.slice(titulo.length); return [...titulo, resto[0], resto.at(-1)].join(' '); };
export function abrirDiarias(ctx: CockpitCtx, categoria: string | null) {
  const pessoas = g(ctx).diariasPessoas.filter(row => !categoria || row.categoria === categoria), nomeGre = new Map(ctx.dataset.gres.map(row => [row.id, row.name]));
  if (!pessoas.length) return;
  ctx.open({ kind: 'linhas', title: categoria ? `Diárias de ${categoria.toLowerCase()}` : 'Diárias por beneficiário', what: 'Quem recebeu diárias nos 12 meses até a data de referência, com o cargo, a lotação, o número de diárias e o valor.', use: 'Diária paga não é irregularidade: compare com a função de cada um (fiscal de campo viaja mais que quem atende na sede).',
    listTitle: 'Pessoas, maior valor primeiro', summary: [['Pessoas', int(pessoas.length)], ['Diárias', int(pessoas.reduce((n, row) => n + row.quantidade, 0))], ['Valor', brl(pessoas.reduce((n, row) => n + row.valor, 0))]],
    rows: pessoas.map(row => ({ key: `${row.categoria}:${row.id}`, title: row.nome, subtitle: `${row.cargo} · ${row.greId ? nomeGre.get(row.greId) ?? row.greId : 'sede'}${categoria ? '' : ` · ${row.categoria}`}`, value: money(row.valor),
      note: `${int(row.quantidade)} diárias em ${int(row.meses)} ${row.meses === 1 ? 'mês' : 'meses'}${row.km ? ` · ${int(row.km)} km` : ''}`, sortValue: row.valor })) });
}
function abrirPessoaDiarias(ctx: CockpitCtx, p: (ReturnType<typeof g>)['diariasPessoas'][number]) {
  const nomeGre = new Map(ctx.dataset.gres.map(row => [row.id, row.name]));
  ctx.open({ kind: 'linhas', title: p.nome, eyebrow: p.categoria, what: `${p.cargo}, ${p.greId ? `lotação na ${nomeGre.get(p.greId) ?? p.greId}` : 'na sede'}. Diárias recebidas em cada mês dos 12 meses até a data de referência.`, use: 'Diária paga não é irregularidade: compare com a função da pessoa e com as outras da mesma categoria.',
    listTitle: 'Meses com diária', summary: [['Diárias', int(p.quantidade)], ['Valor', brl(p.valor)], ['Quilômetros', p.km ? int(p.km) : '—']],
    rows: p.lancamentos.map(l => ({ key: l.month, title: mes(l.month), subtitle: `${int(l.quantidade)} ${l.quantidade === 1 ? 'diária' : 'diárias'}${l.km ? ` em ${int(l.km)} km` : ''}`, value: money(l.valor), note: '', sortValue: -Number(l.month.replace('-', '')) })) });
}
export const exportarDiarias = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Nome', 'Categoria', 'Cargo', 'Lotação', 'Diárias em 12 meses', 'Meses com diária', 'Valor (R$)', 'Quilômetros'],
  linhas: () => { const nomeGre = new Map(ctx.dataset.gres.map(row => [row.id, row.name])); return g(ctx).diariasPessoas.map(row => [row.nome, row.categoria, row.cargo, row.greId ? nomeGre.get(row.greId) ?? row.greId : 'sede', row.quantidade, row.meses, Math.round(row.valor), row.km]); } });
export function Diarias({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => diarias(ctx), [ctx.conselho]); // eslint-disable-line react-hooks/exhaustive-deps
  const pessoas = g(ctx).diariasPessoas, top = pessoas.slice(0, 10), cores = coresDiarias(ctx), total = rows.reduce((n, row) => n + row.valor, 0);
  const corDe = (categoria: string) => cores[rows.findIndex(row => row.categoria === categoria)] ?? tokens.blue;
  const option = useMemo(() => {
    const nomeGre = new Map(ctx.dataset.gres.map(row => [row.id, row.name]));
    return {
      grid: { top: 2, right: 64, bottom: 0, left: 2, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const p = top[items[0].dataIndex]; return p ? `<b>${p.nome}</b><br/>${p.categoria} · ${p.cargo} · ${p.greId ? nomeGre.get(p.greId) ?? p.greId : 'sede'}<br/>${money(p.valor)} · ${int(p.quantidade)} diárias em ${int(p.meses)} meses${p.km ? ` · ${int(p.km)} km` : ''}<br/><span style="opacity:.7">clique para ver as diárias mês a mês</span>` : ''; } },
      xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: top.map(p => nomeCurto(p.nome)), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10, width: 130, overflow: 'truncate' } },
      series: [{ type: 'bar', barWidth: 9, data: top.map(p => ({ value: p.valor, itemStyle: { color: corDe(p.categoria), borderRadius: 3 } })),
        label: { show: true, position: 'right', color: tokens.ink, fontSize: 9.5, formatter: (params: any) => `${brl(params.value)} em ${int(top[params.dataIndex].quantidade)} diárias` } }],
    };
  }, [top, tokens, rows, ctx.dataset]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="cs-sede">
    <div className="cs-barra-sede cs-barra-diarias" aria-label="Diárias por categoria de beneficiário">
      {rows.map(row => <button type="button" key={row.categoria} style={{ flex: row.valor, background: corDe(row.categoria) }} title={`${row.categoria}: ${brl(row.valor)} em ${int(row.quantidade)} diárias. Clique para ver a lista.`} onClick={() => abrirDiarias(ctx, row.categoria)}>
        <b>{row.valor / Math.max(1, total) >= 0.14 ? row.categoria.replace(' e agentes de campo', ' e agentes') : ''}</b><small>{row.valor / Math.max(1, total) >= 0.08 ? brl(row.valor) : ''}</small></button>)}
    </div>
    <Chart option={option} tokens={tokens} label="As dez pessoas que mais receberam diárias em 12 meses" onPick={params => { const p = top[params.dataIndex]; if (p) abrirPessoaDiarias(ctx, p); }} />
  </div>;
}

/* ---------- Calendário de vencimento dos contratos ---------- */
export const exportarVencimentos = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Mês', 'Contratos que terminam', 'Valor (R$)'], linhas: () => vencimentoContratos(g(ctx).contas, ctx.anchor).map(row => [mes(row.month), row.n, row.valor]) });
export function Vencimentos({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => vencimentoContratos(g(ctx).contas, ctx.anchor), [ctx.gestao, ctx.anchor]) // eslint-disable-line react-hooks/exhaustive-deps;
  const option = useMemo(() => ({
    grid: { top: 22, right: 4, bottom: 2, left: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${mes(row.month)}</b><br/>${int(row.n)} contratos terminam · ${money(row.valor)}${row.contratos.length ? `<br/>${row.contratos.slice(0, 4).map(c => `${c.objeto} (${c.modalidade.toLowerCase()})`).join('<br/>')}` : ''}<br/><span style="opacity:.7">clique para ver os contratos</span>`; } },
    xAxis: eixoCategoria(tokens, rows.map(row => mes(row.month)), { axisLabel: { color: tokens.muted, fontSize: 9.5, interval: 0 } }), yAxis: eixoValor(tokens, { show: false }),
    series: [{ type: 'bar', barWidth: '60%', data: rows.map((row, index) => ({ value: row.valor, itemStyle: { color: index < 3 ? tokens.bad : index < 6 ? tokens.accent : tokens.heat[1], borderRadius: [3, 3, 0, 0] } })),
      label: { show: true, position: 'top', fontSize: 9.5, formatter: (params: any) => { const row = rows[params.dataIndex]; return row.n ? `{n|${int(row.n)}}\n{v|${compacto(row.valor)}}` : ''; }, rich: { n: { color: tokens.ink, fontWeight: 800, fontSize: 10.5 }, v: { color: tokens.muted, fontSize: 9 } } } }],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Contratos vigentes que terminam em cada um dos próximos 12 meses" onPick={params => { const row = rows[params.dataIndex]; if (!row?.n) return;
    ctx.open({ kind: 'linhas', title: `Contratos que terminam em ${mes(row.month)}`, what: 'Contratos vigentes na data escolhida cujo prazo termina neste mês.', use: 'Abra a renovação ou a nova licitação com pelo menos três meses de antecedência.', listTitle: 'Contratos',
      summary: [['Contratos', int(row.n)], ['Valor', brl(row.valor)], ['Com aditivo', int(row.contratos.filter(c => c.aditivos > 0).length)]],
      rows: row.contratos.map(c => ({ key: c.id, title: `${c.id} · ${c.objeto}`, subtitle: `${c.fornecedor} · ${c.modalidade}`, value: money(c.valor), note: `termina em ${c.fim.split('-').reverse().join('/')} · ${int(c.aditivos)} ${c.aditivos === 1 ? 'aditivo' : 'aditivos'}`, sortValue: Date.parse(c.fim) })) }); }} />;
}

/* ---------- Fornecedores ---------- */
export const exportarFornecedores = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Fornecedor', 'Objeto', 'Empenhado 12 meses (R$)', 'Pago 12 meses (R$)', 'Contratos vigentes'], linhas: () => ctx.conselho.fornecedores.map(row => [row.fornecedor.nome, row.fornecedor.objeto, Math.round(row.empenhado), Math.round(row.pago), row.contratos]) });
function abrirFornecedor(ctx: CockpitCtx, row: (typeof ctx.conselho.fornecedores)[number]) {
  const contas = g(ctx).contas, meses = new Set(contas.months.filter(month => `${month}-01` <= ctx.anchor).slice(-12)), contratos = new Map(contas.contratos.map(c => [c.id, c]));
  const empenhos = contas.empenhos.filter(e => e.fornecedorId === row.fornecedor.id && meses.has(e.month));
  ctx.open({ kind: 'linhas', title: row.fornecedor.nome, eyebrow: row.fornecedor.objeto, what: 'Empenhos dos 12 meses até a data de referência para este fornecedor, com o contrato a que cada um se refere e quanto já foi pago.', use: 'Na Transparência do Conselho, cada empenho e contrato tem o processo de compra e os aditivos.',
    listTitle: 'Empenhos, maior valor primeiro', summary: [['Empenhado', brl(row.empenhado)], ['Pago', brl(row.pago)], ['Contratos vigentes', int(row.contratos)]],
    rows: empenhos.map(e => { const c = e.contratoId ? contratos.get(e.contratoId) : undefined;
      return { key: e.id, title: e.id, subtitle: `${mes(e.month)} · ${c ? `contrato ${c.id} (${c.modalidade.toLowerCase()}, até ${c.fim.split('-').reverse().join('/')})` : 'sem contrato'}`, value: money(e.valor), note: `pago ${money(e.pago)}`, sortValue: e.valor }; }) });
}
export function Fornecedores({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, c = ctx.conselho, rows = c.fornecedores.slice(0, 8), total = c.fornecedores.reduce((sum, row) => sum + row.empenhado, 0);
  const option = useMemo(() => ({
    grid: { top: 24, right: 92, bottom: 2, left: 2, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.fornecedor.nome}</b><br/>${row.fornecedor.objeto} · ${row.fornecedor.natureza.toLowerCase()}<br/>Empenhado: ${money(row.empenhado)} (${pct(row.empenhado / Math.max(1, total) * 100)}) · Pago: ${money(row.pago)}<br/>${int(row.contratos)} contrato${row.contratos === 1 ? '' : 's'} vigente${row.contratos === 1 ? '' : 's'}<br/><span style="opacity:.7">clique para ver os empenhos</span>`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.fornecedor.nome.replace(' (demonstrativo)', '')), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10, width: 170, overflow: 'truncate' } },
    series: [
      { name: 'Empenhado', type: 'bar', barWidth: 12, barGap: '-100%', data: rows.map(row => row.empenhado), itemStyle: { color: tokens.soft, borderColor: tokens.heat[1], borderWidth: 1, borderRadius: 3 }, z: 1, label: { show: true, position: 'right', color: tokens.ink, fontSize: 9.5, formatter: (params: any) => `${brl(params.value)} (${pct(params.value / Math.max(1, total) * 100)})` } },
      { name: 'Pago', type: 'bar', barWidth: 6, data: rows.map(row => row.pago), itemStyle: { color: tokens.brand, borderRadius: 3 }, z: 2 },
    ],
  }), [rows, tokens, total]);
  return <div className="cs-com-nota">
    <Chart option={option} tokens={tokens} label="Oito maiores fornecedores por valor empenhado em 12 meses" onPick={params => { const row = rows[params.dataIndex]; if (row) abrirFornecedor(ctx, row); }} />
    <p className="cs-nota">Cinco maiores: <b>{c.concentracao === null ? '—' : pct(c.concentracao)}</b> do empenhado · HHI {int(c.hhi)}</p>
  </div>;
}

/* ---------- Pessoal por função, com a lista nominal ao clicar ---------- */
function abrirPessoal(ctx: CockpitCtx, funcao: string | null) {
  const nomeGre = new Map(ctx.dataset.gres.map(row => [row.id, row.name])), rows = g(ctx).equipe.filter(s => (!funcao || s.funcao === funcao) && (!ctx.greId || s.greId === ctx.greId));
  if (!rows.length) return;
  ctx.open({ kind: 'linhas', title: funcao ? `Pessoal de ${funcao.toLowerCase()}` : 'Quadro de pessoal', what: `Servidores${ctx.greId ? ` lotados em ${nomeGre.get(ctx.greId) ?? ctx.greId}` : ''}, com cargo, vínculo, lotação e custo mensal do posto (salário e encargos).`, use: 'Os nomes e as remunerações dos servidores são públicos na Transparência do Conselho.',
    listTitle: 'Servidores, maior custo primeiro', summary: [['Servidores', int(rows.length)], ['Comissionados', int(rows.filter(s => s.vinculo === 'Comissionado').length)], ['Custo mensal', brl(rows.reduce((n, s) => n + s.remuneracao, 0))]],
    rows: rows.map(s => ({ key: s.id, title: s.nome, subtitle: `${s.cargo} · ${s.vinculo.toLowerCase()} · ${s.greId ? nomeGre.get(s.greId) ?? s.greId : 'sede'}${funcao ? '' : ` · ${s.funcao}`}`, value: `${money(s.remuneracao)}/mês`, note: s.id, sortValue: s.remuneracao })) });
}
export const exportarPessoal = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Nome', 'Função', 'Cargo', 'Vínculo', 'Lotação', 'Custo mensal (R$)'],
  linhas: () => { const nomeGre = new Map(ctx.dataset.gres.map(row => [row.id, row.name])); return g(ctx).equipe.filter(s => !ctx.greId || s.greId === ctx.greId).map(s => [s.nome, s.funcao, s.cargo, s.vinculo, s.greId ? nomeGre.get(s.greId) ?? s.greId : 'sede', s.remuneracao]); } });
export function Pessoal({ ctx }: { ctx: CockpitCtx }) {
  // Com uma regional escolhida, conta só quem está lotado nela, como a lista que abre ao clicar.
  const equipe = g(ctx).equipe.filter(s => !ctx.greId || s.greId === ctx.greId);
  const rows = ctx.conselho.pessoal.map(row => { const da = equipe.filter(s => s.funcao === row.funcao); return { funcao: row.funcao, efetivos: da.filter(s => s.vinculo === 'Efetivo').length, comissionados: da.filter(s => s.vinculo === 'Comissionado').length, custoMes: da.reduce((n, s) => n + s.remuneracao, 0) }; });
  const total = rows.reduce((sum, row) => sum + row.efetivos + row.comissionados, 0), custo = rows.reduce((sum, row) => sum + row.custoMes, 0), maior = Math.max(...rows.map(row => row.efetivos + row.comissionados), 1);
  const tecla = (funcao: string | null) => (event: React.KeyboardEvent) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); abrirPessoal(ctx, funcao); } };
  return <ul className="cs-pessoal" aria-label="Pessoal por função">
    {rows.map(row => { const n = row.efetivos + row.comissionados; return <li key={row.funcao} role="button" tabIndex={0} title={`Ver os servidores de ${row.funcao.toLowerCase()}`} onClick={() => abrirPessoal(ctx, row.funcao)} onKeyDown={tecla(row.funcao)}><span>{row.funcao}</span><b>{int(n)}</b><i aria-hidden="true"><em style={{ width: `${row.efetivos / maior * 100}%` }} /><em className="is-comissionado" style={{ width: `${row.comissionados / maior * 100}%` }} /></i><small>{brl(row.custoMes)}/mês</small></li>; })}
    <li className="is-total" role="button" tabIndex={0} title="Ver todos os servidores" onClick={() => abrirPessoal(ctx, null)} onKeyDown={tecla(null)}><span>Total</span><b>{int(total)}</b><i aria-hidden="true" /><small>{brl(custo)}/mês</small></li>
    <li className="cs-legenda-pessoal"><span><em /> efetivos</span><span><em className="is-comissionado" /> comissionados</span></li>
  </ul>;
}

/* ---------- Despesa publicada por profissional ativo (dados reais) e os outros Creas ---------- */
export function DespesaPorAtivo({ ctx }: { ctx: CockpitCtx }) {
  const ultimo = despesaPublicada.exercicios.at(-1)!, sp = ufs.find(row => row.uf === 'SP'), porAtivo = sp?.ativos ? ultimo.valor / sp.ativos : null;
  const outros = [...ufs].filter(row => row.uf !== 'SP').sort((a, b) => b.ativos - a.ativos).slice(0, 6);
  void ctx;
  return <div className="cs-benchmark">
    <div className="cs-bench-sp"><span>Crea-SP · {ultimo.ano}</span><strong>{porAtivo === null ? '—' : money(porAtivo)}</strong><small>de despesa publicada por profissional ativo: {brl(ultimo.valor)} para {int(sp?.ativos ?? 0)} ativos</small></div>
    <table className="metodo is-dense"><thead><tr><th>Crea</th><th className="num">Ativos</th><th className="num">Despesa por ativo</th></tr></thead>
      <tbody>{outros.map(row => <tr key={row.uf}><td><b>Crea-{row.uf}</b></td><td className="num">{int(row.ativos)}</td><td className="num cs-a-ligar">coleta a ligar</td></tr>)}</tbody></table>
  </div>;
}
