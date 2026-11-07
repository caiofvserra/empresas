import { useMemo, useState } from 'react';
import type { complianceFlow } from '../gestao-v14/metrics';
import { Chart, useSpMap, proporcaoSp } from '../painel/chart';
import { Segments, brl, data, int, mes, pct } from '../painel/ui';
import { camaraPorCnae, camaras, quadroTecnico } from '../painel/analise';
import { faixasPorQuantil, valoresPorCidade } from './municipios';
import { municipioPorId } from '../domain/municipios';
import { sum } from '../domain/hash';
import { rotulosGre, territorioGre } from '../painel/territorio';
import { classesCnae, correspondencias } from '../observatorio/norte';
import { fontesInstalacao } from '../domain/frentes';
import type { FonteInstalacao } from '../domain/frentes';
import { desfechosJucesp, faixasVinculos } from '../domain/parcerias';
import type { DesfechoJucesp } from '../domain/parcerias';
import { BarrasReceita } from './receita-federal';
import type { QuadroReceita } from '../domain/receita-mercado';
import { artsMensais, artsPorProfissional, idadeCapital, mercadoEmArvore, registrosPorCamara, ritmoEconomico } from '../domain/empresas';
import type { LinhaCnae, RamoMercado } from '../domain/empresas';
import type { CockpitCtx } from '../cockpit/contexto';
import { artPorCamara, camaraPorte, entradasSaidas, pagamento, portes, situacaoReceita } from '../cockpit/medidas';
import type { LinhaGre } from '../cockpit/medidas';
import { linhasEmpresas } from '../cockpit/ui';
import type { Exportavel } from '../cockpit/ui';
import { rotuloTrimestre } from '../cockpit/formatos';

/**
 * Blocos do painel de Empresas. Regras do Caio (01/11/2026): clicar num item abre as empresas daquele item, nunca o resumo
 * genérico da regional; regional, município, câmara, período e data são filtros do alto da tela e valem para o painel inteiro;
 * cada página cabe numa tela de computador sem rolagem; o bloco mostra só o título e o gráfico, e a explicação fica no (i);
 * os tipos de gráfico variam (mapa com o limite dos municípios, mapa de árvore, calor, anel, fluxo), sem ficar tudo em barras.
 * Em 02/11/2026 saíram a rede de empresas sócias (pouca informação nova), o mapa de bolhas, a rosa e as barras em círculo, que
 * dificultavam comparar; e um quadrado colorido só aparece quando é legenda de verdade.
 */

/** Um anel só: por dentro, a situação do registro; por fora, a anuidade das registradas. Substitui as duas roscas lado a lado.
 * Desde 05/11/2026 a coroa de dentro também tem rótulo (nome e parte do total), e a fatia "Sem cobrança no período" saiu:
 * em dia e em atraso já somam todas as registradas, e ela era sempre zero. */
const nomeCurtoSituacao: Record<string, string> = { 'Registro ativo': 'Ativo', 'Registro inativo': 'Inativo', 'Nunca registrada': 'Nunca\nregistrada' };
function partesSituacoes(ctx: CockpitCtx, flow: ReturnType<typeof complianceFlow>) {
  const { tokens, model } = ctx, ids = (name: string) => flow.nodes.find(node => node.name === name)?.companyIds ?? [];
  const ativa = ids('Registro vigente'), pay = pagamento(model), emDia = new Set(pay.emDia), inad = new Set(pay.inadimplentes);
  const dentro = [{ name: 'Registro ativo', ids: ativa, color: tokens.blue }, { name: 'Registro inativo', ids: ids('Só histórico'), color: tokens.heat[1] }, { name: 'Nunca registrada', ids: ids('Nunca registrada'), color: tokens.bad }];
  const fora = [{ name: 'Em dia', ids: ativa.filter(id => emDia.has(id)), color: tokens.good }, { name: 'Anuidade atrasada', ids: ativa.filter(id => inad.has(id)), color: tokens.warn }];
  return { ativa, dentro, fora, total: dentro.reduce((soma, part) => soma + part.ids.length, 0) };
}
export const exportarSituacoes = (ctx: CockpitCtx, flow: ReturnType<typeof complianceFlow>): Exportavel => ({ cabecalho: ['Coroa', 'Situação', 'Empresas', 'Parte (%)'], linhas: () => { const p = partesSituacoes(ctx, flow);
  return [...p.dentro.map(part => ['Registro', part.name, part.ids.length, Math.round(part.ids.length / Math.max(1, p.total) * 1000) / 10]), ...p.fora.map(part => ['Anuidade das registradas', part.name, part.ids.length, Math.round(part.ids.length / Math.max(1, p.ativa.length) * 1000) / 10])]; } });
export function Situacoes({ ctx, flow }: { ctx: CockpitCtx; flow: ReturnType<typeof complianceFlow> }) {
  const { tokens } = ctx, { ativa, dentro, fora, total } = partesSituacoes(ctx, flow);
  const option = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (item: any) => item.data.vazio ? '' : `<b>${item.name}</b><br/>${int(item.value)} empresas · ${pct(item.value / Math.max(1, item.seriesIndex ? ativa.length : total) * 100)} ${item.seriesIndex ? 'das registradas' : 'do total'}<br/><span style="opacity:.75">clique para ver</span>` },
    title: { text: int(total), subtext: 'empresas', left: 'center', top: 'center', itemGap: 2, textStyle: { color: tokens.ink, fontSize: 16, fontWeight: 800, fontFamily: 'Raleway, Lato, sans-serif' }, subtextStyle: { color: tokens.muted, fontSize: 11 } },
    series: [
      { type: 'pie', radius: ['30%', '60%'], padAngle: 1.5, itemStyle: { borderRadius: 3, borderColor: tokens.surface, borderWidth: 1 }, labelLine: { show: false },
        label: { show: true, position: 'inside', color: '#FFFFFF', fontSize: 11, lineHeight: 11, fontWeight: 700, textBorderColor: 'rgba(1,34,77,.85)', textBorderWidth: 2, formatter: (item: any) => item.value ? `${nomeCurtoSituacao[item.name] ?? item.name}\n${pct(item.value / Math.max(1, total) * 100)}` : '' },
        data: dentro.map(part => ({ name: part.name, value: part.ids.length, itemStyle: { color: part.color } })) },
      { type: 'pie', radius: ['64%', '80%'], padAngle: 1.5, itemStyle: { borderRadius: 3, borderColor: tokens.surface, borderWidth: 1 }, label: { show: true, position: 'outside', fontSize: 11.5, color: tokens.muted, formatter: (item: any) => item.data.vazio || !item.value ? '' : `${item.name}\n${pct(item.value / Math.max(1, ativa.length) * 100)}` }, labelLine: { length: 4, length2: 4 },
        data: [...fora.map(part => ({ name: part.name, value: part.ids.length, itemStyle: { color: part.color } })), ...dentro.slice(1).map(part => ({ name: '', value: part.ids.length, vazio: true, itemStyle: { color: 'transparent' }, tooltip: { show: false }, emphasis: { disabled: true }, labelLine: { show: false } }))] },
    ],
  }), [dentro, fora, total, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Empresas por situação do registro e da anuidade" onPick={params => { const part = params.seriesIndex === 0 ? dentro[params.dataIndex] : fora[params.dataIndex];
    if (part?.ids.length) ctx.open({ kind: 'empresas', title: part.name, what: 'Empresas, contadas pela raiz do CNPJ, nesta situação na data escolhida.', ids: part.ids }); }} />;
}

export const exportarEntradasSaidas = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Mês', 'Entradas após fiscalização', 'Demais entradas', 'Saídas', 'Empresas registradas no fim do mês'], linhas: () => entradasSaidas(ctx.history, ctx.f).map(row => [mes(row.month), row.viaFiscalizacao.length, row.demais.length, row.saidas.length, row.base]) });
export function EntradasSaidas({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, janela } = ctx, rows = useMemo(() => entradasSaidas(ctx.history, ctx.f), [ctx.history, ctx.f]);
  const option = useMemo(() => ({
    grid: { top: 30, right: 6, bottom: 2, left: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 11.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex], entradas = row.viaFiscalizacao.length + row.demais.length;
      return `<b>${mes(row.month)}</b><br/>Entradas: ${int(entradas)} (${int(row.viaFiscalizacao.length)} após fiscalização)<br/>Saídas: ${int(row.saidas.length)}<br/>Saldo: <b>${entradas - row.saidas.length >= 0 ? '+' : ''}${int(entradas - row.saidas.length)}</b><br/>Empresas registradas: ${int(row.base)}<br/><span style="opacity:.75">clique para ver as empresas</span>`; } },
    xAxis: { type: 'category', data: rows.map(row => mes(row.month)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, interval: 2, fontSize: 11 } },
    yAxis: [{ type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: (value: number) => int(Math.abs(value)) } },
      { type: 'value', scale: true, splitLine: { show: false }, axisLabel: { color: tokens.muted, formatter: (value: number) => int(value) } }], // número inteiro: o formato compacto repetia “2,2 mil” em duas marcas

    series: [
      { name: 'Entradas após fiscalização', type: 'bar', stack: 'mov', barWidth: '58%', data: rows.map(row => row.viaFiscalizacao.length), itemStyle: { color: tokens.accent },
        markArea: { silent: true, itemStyle: { color: tokens.blue, opacity: 0.07 }, data: [[{ xAxis: mes(janela.start.slice(0, 7)) }, { xAxis: mes(janela.end.slice(0, 7)) }]] } },
      // Total de entradas em cima da barra e de saídas embaixo, e o estoque só no último mês (07/11/2026, ler sem passar o mouse).
      { name: 'Demais entradas', type: 'bar', stack: 'mov', data: rows.map(row => row.demais.length), itemStyle: { color: tokens.blue, borderRadius: [3, 3, 0, 0] },
        label: { show: true, position: 'top', color: tokens.ink, fontSize: 11, formatter: (item: any) => int(rows[item.dataIndex].viaFiscalizacao.length + rows[item.dataIndex].demais.length) } },
      { name: 'Saídas', type: 'bar', stack: 'mov', data: rows.map(row => -row.saidas.length), itemStyle: { color: tokens.bad, borderRadius: [0, 0, 3, 3] },
        label: { show: true, position: 'bottom', color: tokens.bad, fontSize: 11, formatter: (item: any) => int(-item.value) } },
      { name: 'Empresas registradas', type: 'line', yAxisIndex: 1, data: rows.map(row => row.base), smooth: 0.3, symbol: 'none', lineStyle: { color: tokens.ink, width: 2 }, itemStyle: { color: tokens.ink },
        endLabel: { show: true, color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (item: any) => int(item.value) } },
    ],
  }), [rows, tokens, janela]);
  return <Chart option={option} tokens={tokens} label="Entradas e saídas de empresas por mês" onPick={params => { const row = rows[params.dataIndex]; if (!row) return;
    const saidas = params.seriesName === 'Saídas', ids = saidas ? row.saidas : params.seriesName === 'Entradas após fiscalização' ? row.viaFiscalizacao : [...row.viaFiscalizacao, ...row.demais];
    if (ids.length) ctx.open({ kind: 'empresas', title: `${saidas ? 'Saídas' : 'Entradas'} em ${mes(row.month)}`, what: saidas ? 'Empresas cujo registro deixou de estar ativo no mês (baixa ou cancelamento).' : 'Empresas que passaram a ter registro ativo no mês.', ids }); }} />;
}

/** Funil do mercado à ART. Desde 05/11/2026 as etapas depois do registro mostram a parte das registradas (e não do universo), que é a leitura que interessa; a primeira etapa continua com a parte do universo. */
const nomesFunil: Record<string, string> = { 'Universo empresarial': 'Universo de engenharia', 'Registro vigente': 'Registro ativo', 'Só histórico': 'Registro inativo', 'Nunca registrada': 'Nunca registrada', 'Com RT': 'Com RT', 'RT não identificado': 'Sem RT identificado', 'Com ART no período': 'Com ART no período', 'Sem ART no período': 'Sem ART no período' };
const primeiraEtapa = ['Registro vigente', 'Só histórico', 'Nunca registrada'];
const baseFunil = (flow: ReturnType<typeof complianceFlow>) => { const total = flow.nodes[0]?.value || 1, ativa = flow.nodes.find(node => node.name === 'Registro vigente')?.value || 1;
  return (name: string) => name === 'Universo empresarial' ? null : primeiraEtapa.includes(name) ? { n: total, de: 'do universo' } : { n: ativa, de: 'das registradas' }; };
export const exportarFunil = (flow: ReturnType<typeof complianceFlow>): Exportavel => ({ cabecalho: ['Etapa', 'Empresas', 'Base da porcentagem', 'Parte (%)'], linhas: () => { const base = baseFunil(flow);
  return flow.nodes.map(node => { const b = base(node.name); return [nomesFunil[node.name] ?? node.name, node.value, b ? `${int(b.n)} ${b.de}` : null, b ? Math.round(node.value / b.n * 1000) / 10 : null]; }); } });
export function Funil({ ctx, flow }: { ctx: CockpitCtx; flow: ReturnType<typeof complianceFlow> }) {
  const { tokens } = ctx, nomes = nomesFunil, base = baseFunil(flow), valor = new Map(flow.nodes.map(node => [node.name, node.value]));
  const cores: Record<string, string> = { 'Universo empresarial': tokens.brand, 'Registro vigente': tokens.blue, 'Só histórico': tokens.heat[1], 'Nunca registrada': tokens.bad, 'Com RT': tokens.good, 'RT não identificado': tokens.warn, 'Com ART no período': tokens.cat[4], 'Sem ART no período': tokens.muted };
  const option = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (item: any) => { if (item.dataType === 'edge') return `${nomes[item.data.source]} → ${nomes[item.data.target]}<br/><b>${int(item.data.value)}</b> empresas (${pct(item.data.value / (valor.get(item.data.source) || 1) * 100)} de ${nomes[item.data.source].toLowerCase()})`;
      const b = base(item.name); return `<b>${nomes[item.name]}</b><br/>${int(item.value)} empresas${b ? ` · ${pct(item.value / b.n * 100)} ${b.de}` : ''}`; } },
    series: [{ type: 'sankey', nodeAlign: 'left', left: 4, right: 150, top: 6, bottom: 6, nodeWidth: 12, nodeGap: 10, draggable: false, emphasis: { focus: 'adjacency' },
      data: flow.nodes.map(node => ({ name: node.name, value: node.value, itemStyle: { color: cores[node.name] ?? tokens.blue, borderWidth: 0 } })), links: flow.links.map(link => ({ ...link })),
      lineStyle: { color: 'gradient', opacity: 0.28, curveness: 0.5 },
      label: { color: tokens.ink, fontSize: 11.5, formatter: (item: any) => { const b = base(item.name); return `{n|${nomes[item.name] ?? item.name}}\n{v|${int(item.value)}${b ? ` · ${pct(item.value / b.n * 100)} ${b.de}` : ' empresas'}}`; }, rich: { n: { fontWeight: 700, color: tokens.ink, fontSize: 11.5 }, v: { color: tokens.muted, fontSize: 11.5 } } } }],
  }), [flow, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Funil de conformidade das empresas" onPick={item => { const ids = item.dataType === 'edge' ? item.data.companyIds : flow.nodes.find(node => node.name === item.name)?.companyIds;
    if (ids?.length) ctx.open({ kind: 'empresas', title: item.dataType === 'edge' ? `${nomes[item.data.source]} → ${nomes[item.data.target]}` : nomes[item.name], what: 'Empresas (CNPJ raiz) nesta etapa do funil de conformidade.', ids }); }} />;
}

/** Barras de 100% por câmara, com o total à direita (05/11/2026: antes eram barras absolutas, e a civil esmagava as outras). */
export const exportarCamaraPorte = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Câmara', ...portes.map(porte => porte), 'Total'], linhas: () => camaraPorte(ctx.dataset, ctx.model).map(row => [row.camara, ...row.portes.map(item => item.ids.length), sum(row.portes.map(item => item.ids.length))]) });
export function CamaraPorte({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => camaraPorte(ctx.dataset, ctx.model).map(row => ({ ...row, total: sum(row.portes.map(item => item.ids.length)) })), [ctx.dataset, ctx.model]), cores = [tokens.heat[1], tokens.blue, tokens.brand, tokens.accent];
  const option = useMemo(() => ({
    grid: { top: 26, right: 36, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: tokens.muted, fontSize: 11.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.camara}</b>: ${int(row.total)} empresas registradas<br/>${items.map(item => `${item.marker}${item.seriesName}: ${int(row.portes[item.seriesIndex].ids.length)} (${pct(item.value)})`).join('<br/>')}<br/><span style="opacity:.75">clique para ver as empresas</span>`; } },
    xAxis: { type: 'value', max: 100, show: false },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => row.camara), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: (rows[0]?.portes ?? []).map((item, index) => ({ name: item.porte.replace(' empresa', ''), type: 'bar', stack: 'p', barWidth: 16, data: rows.map(row => row.total ? row.portes[index].ids.length / row.total * 100 : 0), itemStyle: { color: cores[index], borderColor: tokens.surface, borderWidth: 1 },
      label: index === 3 ? { show: true, position: 'right', color: tokens.ink, fontSize: 11, formatter: (params: any) => int(rows[params.dataIndex].total) }
        : { show: true, position: 'inside', color: index === 0 ? tokens.ink : '#FFFFFF', fontSize: 11.5, fontWeight: 700, formatter: (params: any) => params.value >= 10 ? pct(params.value) : '' } })),
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Empresas registradas por câmara e porte, em barras de 100%" onPick={params => { const row = rows[params.dataIndex], part = row?.portes[params.seriesIndex];
    if (part?.ids.length) ctx.open({ kind: 'empresas', title: `${row.camara}, ${part.porte.toLowerCase()}`, what: 'Empresas registradas desta câmara (atividade principal) e porte.', ids: part.ids, recorte: { camara: row.camara } }); }} />;
}

/** As duas classes da lista de atividades do Crea-SP, em palavras: a Receita diz "Sim" e "Passível de obrigação". */
const nomeClasse: Record<string, string> = { Sim: 'Registro obrigatório', Passível: 'Registro a analisar' };
/** Linhas da conciliação: todas as atividades (a mesma conta do cartão "Parte do mercado que está registrada") e as duas classes, cada uma com as três correspondências. */
const linhasConciliacao = (c: CockpitCtx['norte']['cobertura']) => [
  { nome: 'Todas as atividades', partes: correspondencias.map(nome => classesCnae.flatMap(classe => c.porClasse[classe][nome])), taxa: c.taxa },
  ...classesCnae.map(classe => ({ nome: nomeClasse[classe], partes: correspondencias.map(nome => c.porClasse[classe][nome]), taxa: classe === 'Sim' ? c.taxaSim : c.taxaPassivel })),
];
const parte = (n: number, base: number) => Math.round(n / Math.max(1, base) * 1000) / 10;
export const exportarConciliacao = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Parte', 'Linha', 'Categoria', 'Estabelecimentos ou empresas', 'Parte (%)'], linhas: () => {
  const cima = linhasConciliacao(ctx.norte.cobertura).flatMap(row => { const total = sum(row.partes.map(ids => ids.length)); return row.partes.map((ids, k) => ['Receita comparada com o cadastro', row.nome, correspondencias[k], ids.length, parte(ids.length, total)]); });
  const situacoes = situacaoReceita(ctx.dataset, ctx.model), ativas = sum(situacoes.map(row => row.ids.length));
  return [...cima, ...situacoes.map(row => ['Registradas pela situação na Receita', 'Empresas registradas', row.situacao, row.ids.length, parte(row.ids.length, ativas)])]; } });
/**
 * Receita comparada com o cadastro, em duas partes (05/11/2026). Em cima, barras de 100%: os estabelecimentos ativos na Receita com
 * atividade da lista, por correspondência com o cadastro, em todas as atividades e em cada classe, com o total à direita. Embaixo,
 * as empresas registradas pela situação do CNPJ da matriz na Receita: registro ativo com CNPJ baixado ou inapto é cadastro inflado.
 */
export function Conciliacao({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, dark } = ctx, c = ctx.norte.cobertura, cores = [tokens.blue, tokens.heat[1], tokens.warn];
  const rows = useMemo(() => linhasConciliacao(c).map(row => ({ ...row, total: sum(row.partes.map(ids => ids.length)) })), [c]);
  const situacoes = useMemo(() => situacaoReceita(ctx.dataset, ctx.model), [ctx.dataset, ctx.model]), ativas = sum(situacoes.map(row => row.ids.length));
  const corSituacao: Record<string, string> = { Ativa: tokens.blue, Baixada: tokens.bad, Suspensa: tokens.warn, Inapta: tokens.cat[2] };
  const cima = useMemo(() => ({
    grid: { top: 20, right: 40, bottom: 0, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: tokens.muted, fontSize: 11 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex];
      return `<b>${row.nome}</b>: ${int(row.total)} CNPJs<br/>${items.map(item => `${item.marker}${item.seriesName}: ${int(row.partes[item.seriesIndex].length)} (${pct(item.value, 1)})`).join('<br/>')}`; } },
    xAxis: { type: 'value', max: 100, show: false },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => row.nome.replace(/ (?=\S+$)/, '\n')), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11, lineHeight: 12 } },
    series: correspondencias.map((nome, index) => ({ name: nome, type: 'bar', stack: 'c', barWidth: 16, data: rows.map(row => parte(row.partes[index].length, row.total)), itemStyle: { color: cores[index], borderColor: tokens.surface, borderWidth: 1, borderRadius: index === 0 ? [3, 0, 0, 3] : index === 2 ? [0, 3, 3, 0] : 0 },
      label: index === 0 ? { show: true, position: 'insideLeft', color: '#FFFFFF', fontSize: 11, fontWeight: 800, formatter: (item: any) => item.value >= 12 ? pct(item.value, 1) : '' }
        : index === correspondencias.length - 1 ? { show: true, position: 'right', color: tokens.ink, fontSize: 11, formatter: (item: any) => int(rows[item.dataIndex].total) }
        : { show: true, position: 'inside', color: tokens.ink, fontSize: 11.5, formatter: (item: any) => item.value >= 12 ? pct(item.value) : '' } })),
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  const baixo = useMemo(() => ({
    grid: { top: 2, right: 78, bottom: 0, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = situacoes[items[0].dataIndex]; return `CNPJ <b>${row.situacao.toLowerCase()}</b> na Receita<br/>${int(row.ids.length)} empresas registradas · ${pct(parte(row.ids.length, ativas), 1)}<br/><span style="opacity:.75">clique para ver as empresas</span>`; } },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', inverse: true, data: situacoes.map(row => row.situacao), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [{ type: 'bar', barWidth: 12, data: situacoes.map(row => ({ value: row.ids.length, itemStyle: { color: corSituacao[row.situacao], borderRadius: [0, 3, 3, 0] } })),
      label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (item: any) => `${int(item.value)} · ${pct(parte(item.value, ativas), 1)}` } }],
  }), [situacoes, ativas, tokens, dark]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="duas-partes">
    <Chart option={cima} tokens={tokens} label="Conciliação dos CNPJs com CNAE da lista com o cadastro do Crea-SP" onPick={params => { const row = rows[params.dataIndex], nome = correspondencias[params.seriesIndex]; const ids = row && nome ? row.partes[params.seriesIndex] : [];
      if (ids.length) ctx.open({ kind: 'cnpjs', title: `${row.nome}, ${nome.toLowerCase()}`, what: 'CNPJs completos ativos na Receita com CNAE da lista do Crea-SP nesta classe e correspondência.', use: nome === 'Sem correspondência' ? 'Sem correspondência não quer dizer irregular. Confirmar atividade antes de orientar ou notificar.' : undefined, ids }); }} />
    <p className="parte-titulo">Registradas pela situação do CNPJ na Receita</p>
    <Chart option={baixo} tokens={tokens} label="Empresas registradas pela situação do CNPJ da matriz na Receita" onPick={params => { const row = situacoes[params.dataIndex]; if (!row?.ids.length) return;
      ctx.open({ kind: 'empresas', title: `Registradas com CNPJ ${row.situacao.toLowerCase()} na Receita`, what: `Empresas com registro ou visto ativo na data escolhida cuja matriz está ${row.situacao.toLowerCase()} no cadastro de CNPJ da Receita Federal.`, use: row.situacao === 'Ativa' ? undefined : 'Registro ativo com CNPJ baixado, suspenso ou inapto é cadastro inflado e anuidade incobrável: conferir na Receita e tratar a baixa do registro antes de qualquer cobrança.', ids: row.ids }); }} />
  </div>;
}

/** Grafia das câmaras do Conselho no rótulo exibido da modalidade ("Segurança do Trabalho", como no bloco por câmara); as chaves do domínio não mudam (05/11/2026). */
const rotuloModalidade = (modalidade: string) => camaras.find(camara => camara.toLowerCase() === modalidade.toLowerCase()) ?? modalidade;
const linhasArtModalidade = (ctx: CockpitCtx) => artsPorProfissional(ctx.arts.atual, ctx.profissionais.modelo.profissionais, ctx.anchor, ctx.greId, ctx.cidadeId);
export const exportaArtModalidade = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Modalidade', 'ARTs a cada 100 profissionais ativos', 'ARTs no período', 'Empresas com ART', 'Profissionais ativos da modalidade'],
  linhas: () => linhasArtModalidade(ctx).linhas.filter(row => row.porCem !== null).map(row => [rotuloModalidade(row.modalidade), Math.round(row.porCem! * 10) / 10, row.arts, row.empresas.length, row.ativos]) });
/** ARTs a cada 100 profissionais ativos da mesma modalidade: compara as modalidades sem que a maior ganhe só por ser maior. */
export function ArtModalidade({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, r = useMemo(() => linhasArtModalidade(ctx), [ctx.arts, ctx.profissionais, ctx.anchor, ctx.greId, ctx.cidadeId]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = r.linhas.filter(row => row.porCem !== null);
  const option = useMemo(() => ({
    grid: { top: 18, right: 44, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${rotuloModalidade(row.modalidade)}</b><br/><b>${row.porCem!.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</b> ARTs a cada 100 profissionais ativos<br/>${int(row.arts)} ARTs de ${int(row.empresas.length)} empresas no período<br/>${int(row.ativos)} profissionais ativos da modalidade<br/><span style="opacity:.75">clique para ver as empresas</span>`; } },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => rotuloModalidade(row.modalidade)), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11.5 } },
    series: [{ type: 'bar', barWidth: '58%', barMaxWidth: 30, data: rows.map(row => ({ value: row.porCem, itemStyle: { color: r.geral !== null && row.porCem! >= r.geral ? tokens.blue : tokens.heat[1], borderRadius: [0, 3, 3, 0] } })),
      label: { show: true, position: 'right', color: tokens.ink, fontSize: 11.5, fontWeight: 700, formatter: (item: any) => item.value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) },
      markLine: r.geral === null ? undefined : { silent: true, symbol: 'none', lineStyle: { color: tokens.ink, type: 'dashed', width: 1 }, label: { position: 'end', color: tokens.muted, fontSize: 11.5, formatter: `média ${r.geral.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}` }, data: [{ xAxis: r.geral }] } }],
  }), [rows, r.geral, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="ARTs de empresas a cada 100 profissionais ativos, por modalidade" onPick={params => { const row = rows[params.dataIndex]; if (row?.empresas.length) ctx.open({ kind: 'empresas', title: `ARTs de ${rotuloModalidade(row.modalidade).toLowerCase()}`, what: `Empresas com ART desta modalidade no período. São ${int(row.arts)} ARTs para ${int(row.ativos)} profissionais ativos da modalidade no recorte.`, ids: row.empresas }); }} />;
}

const linhasSemArt = (ctx: CockpitCtx) => artPorCamara(ctx.dataset, ctx.model).map(row => ({ ...row, comArt: row.ativas.filter(id => !row.semArt.includes(id)), taxa: row.semArt.length / Math.max(1, row.ativas.length) * 100 })).sort((a, b) => b.taxa - a.taxa);
export const exportaSemArt = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Câmara', 'Empresas registradas', 'Sem ART no período', 'Com ART no período', 'Sem ART (%)'], linhas: () => linhasSemArt(ctx).map(row => [row.camara, row.ativas.length, row.semArt.length, row.comArt.length, Math.round(row.taxa * 10) / 10]) });
/** Barras de 100% por câmara: a parte das registradas com ART no período e a parte sem nenhuma ART. As câmaras com mais empresas sem ART ficam no alto. */
export function SemArt({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => linhasSemArt(ctx), [ctx.dataset, ctx.model]); // eslint-disable-line react-hooks/exhaustive-deps
  const option = useMemo(() => ({
    grid: { top: 22, right: 8, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 11 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.camara}</b><br/>${int(row.semArt.length)} de ${int(row.ativas.length)} empresas registradas sem ART no período (<b>${pct(row.taxa)}</b>)<br/><span style="opacity:.75">clique para ver as empresas</span>`; } },
    xAxis: { type: 'value', max: 100, show: false },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => `${row.camara}  ${int(row.ativas.length)}`), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11.5 } },
    series: [
      { name: 'Sem ART no período', type: 'bar', stack: 's', barWidth: '50%', barMaxWidth: 30, data: rows.map(row => row.taxa), itemStyle: { color: tokens.warn, borderRadius: [3, 0, 0, 3] },
        label: { show: true, position: 'insideLeft', color: '#1A202C', fontSize: 11.5, fontWeight: 800, formatter: (item: any) => item.value >= 8 ? pct(item.value) : '' } },
      { name: 'Com ART', type: 'bar', stack: 's', data: rows.map(row => 100 - row.taxa), itemStyle: { color: tokens.soft, borderColor: tokens.line, borderWidth: 1, borderRadius: [0, 3, 3, 0] } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Empresas registradas com e sem ART no período, por câmara" onPick={params => { const row = rows[params.dataIndex]; if (!row) return; const sem = params.seriesIndex === 0, ids = sem ? row.semArt : row.comArt;
    if (ids.length) ctx.open({ kind: 'empresas', title: `${row.camara}: registradas ${sem ? 'sem ART' : 'com ART'} no período`, what: sem ? 'Empresas com registro ativo sem nenhuma ART registrada no período.' : 'Empresas com registro ativo e ao menos uma ART no período.', use: sem ? 'Verifique se a empresa está em atividade; se estiver, oriente sobre a obrigação de ART (Lei 6.496/77).' : undefined, ids, recorte: { camara: row.camara } }); }} />;
}

const nomesInstalacao: Record<FonteInstalacao, string> = { ANEEL: 'Usinas e agentes de energia (ANEEL)', ANP: 'Postos e instalações de combustível (ANP)', ANM: 'Processos de mineração (ANM)', BNDES: 'Financiamentos do BNDES' };
/** Uma linha por fonte no recorte de regional e município: total, registradas no Crea-SP, com atividade de engenharia sem registro e CNPJ fora da lista. */
function linhasInstalacoes(ctx: CockpitCtx) {
  const q = ctx.frentes.instalacoes, registradas = new Set(q.registradas), lista = q.instalacoes.filter(row => !ctx.cidadeId || row.cityId === ctx.cidadeId);
  return fontesInstalacao.map(fonte => { const rows = lista.filter(row => row.fonte === fonte), noUniverso = rows.filter(row => row.companyId).length, reg = rows.filter(row => row.companyId && registradas.has(row.companyId)).length;
    return { fonte, rows, valor: rows.reduce((soma, row) => soma + row.valor, 0), unidade: rows[0]?.unidade ?? '', registradas: reg, semRegistro: noUniverso - reg, fora: rows.length - noUniverso, situacao: (companyId: string | null) => companyId ? registradas.has(companyId) ? 'registrada no Crea-SP' : 'atividade de engenharia sem registro' : 'CNPJ fora da lista do Crea-SP' }; });
}
export const exportaInstalacoes = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Fonte', 'Instalações, processos ou financiamentos', 'Registradas no Crea-SP', 'Com atividade de engenharia sem registro', 'CNPJ fora da lista', 'Valor', 'Unidade'],
  linhas: () => linhasInstalacoes(ctx).map(row => [nomesInstalacao[row.fonte], row.rows.length, row.registradas, row.semRegistro, row.fora, row.fonte === 'BNDES' ? Math.round(row.valor) : Math.round(row.valor * 10) / 10, row.fonte === 'BNDES' ? 'R$' : row.unidade]) });
/** Instalações de setores regulados e financiamentos do BNDES: barra em três tons (registradas, com atividade de engenharia sem registro, fora da lista), com o número e o valor. */
export function Instalacoes({ ctx }: { ctx: CockpitCtx }) {
  // Um tom só, o da legenda (07/11/2026): a cor por fonte não batia com a legenda em tinta e criava uma segunda legenda.
  const linhas = useMemo(() => linhasInstalacoes(ctx), [ctx.frentes.instalacoes, ctx.cidadeId]); // eslint-disable-line react-hooks/exhaustive-deps
  const maior = Math.max(1, ...linhas.map(row => row.rows.length)), largura = (n: number) => `${n / maior * 100}%`;
  return <div className="fonte-wrap">
    <div className="fonte-legenda" aria-label="Tons da barra"><span><i style={{ background: 'var(--ink)' }} />registradas no Crea-SP</span><span><i style={{ background: 'color-mix(in srgb, var(--ink) 45%, transparent)' }} />atividade de engenharia sem registro</span><span><i style={{ background: 'color-mix(in srgb, var(--muted) 40%, transparent)' }} />CNPJ fora da lista</span></div>
    <ul className="fonte-list" aria-label="Instalações por fonte">
      {linhas.map(({ fonte, rows, valor, unidade, registradas, semRegistro, fora, situacao }) => <li key={fonte}><button disabled={!rows.length} onClick={() => ctx.open({ kind: 'linhas', title: nomesInstalacao[fonte], what: 'Instalações, processos ou financiamentos desta fonte no recorte escolhido, com a empresa responsável identificada pelo CNPJ e a situação dela no Crea-SP.', use: 'A empresa é operadora, titular ou financiada. Isso não faz dela a projetista, a instaladora nem a responsável técnica.', listTitle: 'Agentes, maior valor primeiro',
        rows: rows.map(item => ({ key: item.id, companyId: item.companyId ?? undefined, title: item.agenteNome, subtitle: `${item.agenteCnpj} · ${item.tipo}`, value: fonte === 'BNDES' ? brl(item.valor) : `${item.valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${item.unidade}`, note: situacao(item.companyId), sortValue: item.valor })) })}>
        <span className="fonte-nome">{nomesInstalacao[fonte]}</span>
        <b>{int(rows.length)}</b>
        <span className="fonte-barra" title={`${int(registradas)} registradas · ${int(semRegistro)} com atividade de engenharia sem registro · ${int(fora)} fora da lista`}><em style={{ width: largura(registradas), background: 'var(--ink)' }} /><em style={{ width: largura(semRegistro), background: 'color-mix(in srgb, var(--ink) 45%, transparent)' }} /><em style={{ width: largura(fora), background: 'color-mix(in srgb, var(--muted) 40%, transparent)' }} /></span>
        <small>{int(registradas + semRegistro)} com atividade de engenharia · {int(registradas)} registradas · {fonte === 'BNDES' ? brl(valor) : `${valor.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })} ${unidade}`}</small>
      </button></li>)}
    </ul>
  </div>;
}

/**
 * Abertos e baixados na Receita mês a mês, com dado real dos dados abertos do CNPJ (07/11/2026, quando a página CNPJ saiu), e a
 * permanência das coortes do cadastro ao lado. Os dois lados não se cruzam: a Receita não diz quem tem registro no Crea-SP.
 */
export const exportarDinamica = (ctx: CockpitCtx, q: QuadroReceita): Exportavel => ({ cabecalho: ['Parte', 'Linha', 'Abertos na Receita ou registradas na coorte', 'Baixados na Receita ou continuam registradas'],
  linhas: () => [...q.meses.map(row => ['Abertos e baixados na Receita', mes(row.mes), row.aberturas, row.baixas]),
    ...ctx.mercado.permanencia.map(row => ['Permanência no cadastro', `Registradas há ${row.mesesAtras} meses`, row.coorte.length, row.permanecem.length])] });
export function Dinamica({ ctx, q }: { ctx: CockpitCtx; q: QuadroReceita }) {
  const coortes = ctx.mercado.permanencia;
  return <div className="split is-wide">
    <BarrasReceita ctx={ctx} q={q} />
    <ul className="side-list" aria-label="Permanência das coortes">
      <li className="side-head">Continuam registradas</li>
      {coortes.map(row => <li key={row.mesesAtras}><button onClick={() => row.saidas.length && ctx.open({ kind: 'empresas', title: `Saíram da base em ${row.mesesAtras} meses`, what: `Empresas com registro ou visto vigente em ${data(row.d0)} e sem registro vigente na data de referência.`, use: 'Perda de vínculo institucional; cadastro vigente não prova atividade e a saída não tem causa atribuída.', ids: row.saidas })} className="is-acao"><span>Registradas há {row.mesesAtras} meses<br /><small>{int(row.permanecem.length)} de {int(row.coorte.length)} seguem registradas</small></span><b>{row.taxa === null ? '—' : pct(row.taxa, 1)}</b></button></li>)}
    </ul>
  </div>;
}

const taxaSocios = (ctx: CockpitCtx) => ctx.parcerias.sociosPf.porQualificacao.map(row => ({ ...row, taxa: row.n ? row.profissionais / row.n * 100 : 0 }));
export const exportaSociosPf = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Qualificação', 'Sócios', 'Profissionais do sistema Confea/Crea', 'Outros sócios pessoa física', 'Profissionais (%)'], linhas: () => taxaSocios(ctx).map(row => [row.qualificacao, row.n, row.profissionais, row.n - row.profissionais, Math.round(row.taxa * 10) / 10]) });
/** Barras de 100% por qualificação do sócio: a parte azul são os sócios que são profissionais do sistema, com a porcentagem e a contagem escritas na barra (05/11/2026). */
export function SociosPf({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.parcerias.sociosPf, rows = useMemo(() => taxaSocios(ctx), [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const empresasComSocioRt = useMemo(() => [...new Set(q.socioEhRt.map(row => row.empresaId))].sort(), [q]);
  const option = useMemo(() => ({
    grid: { top: 24, right: 8, bottom: 2, left: 2, containLabel: true }, legend: { top: 0, left: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 11 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.qualificacao}</b><br/>${int(row.profissionais)} de ${int(row.n)} sócios são profissionais do sistema (<b>${pct(row.taxa)}</b>)`; } },
    xAxis: { type: 'value', max: 100, show: false },
    // A contagem fica na segunda linha do rótulo do eixo, porque dentro da barra o texto não cabe no bloco de quatro colunas.
    yAxis: { type: 'category', inverse: true, data: rows.map(row => row.qualificacao), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { interval: 0, color: tokens.ink, fontSize: 11.5, lineHeight: 13, rich: { n: { color: tokens.ink, fontSize: 11.5, lineHeight: 13 }, s: { color: tokens.muted, fontSize: 11.5, lineHeight: 12 } }, formatter: (value: string, index: number) => { const row = rows[index]; return row ? `{n|${value}}\n{s|${int(row.profissionais)} de ${int(row.n)} são profissionais}` : value; } } },
    series: [
      { type: 'bar', name: 'Profissionais do sistema Confea/Crea', stack: 'q', barWidth: '50%', barMaxWidth: 30, data: rows.map(row => row.taxa), itemStyle: { color: tokens.blue, borderRadius: [3, 0, 0, 3] },
        label: { show: true, position: 'insideLeft', color: '#FFFFFF', fontSize: 11.5, fontWeight: 800, formatter: (item: any) => item.value >= 10 ? pct(item.value) : '' } },
      { type: 'bar', name: 'Outros sócios pessoa física', stack: 'q', data: rows.map(row => 100 - row.taxa), itemStyle: { color: tokens.soft, borderColor: tokens.line, borderWidth: 1, borderRadius: [0, 3, 3, 0] },
        label: { show: true, position: 'insideLeft', color: tokens.ink, fontSize: 11, formatter: (item: any) => `${pct(100 - rows[item.dataIndex].taxa)} outros` } },
    ],
  }), [rows, tokens]);
  const abrir = (titulo: string, ids: string[], what: string, use: string) => ids.length && ctx.open({ kind: 'empresas', title: titulo, what, use, ids, eyebrow: 'Contexto que depende de acordo com a Receita (CPF completo dos sócios)' });
  return <div className="split">
    <Chart option={option} tokens={tokens} label="Sócios pessoa física por qualificação e presença no cadastro profissional" />
    <ul className="side-list" aria-label="Leituras do quadro societário">
      <li><button className="is-acao" onClick={() => abrir('Registradas sem RT com sócio profissional ativo', q.registradasSemRtComSocioProfissional, 'Empresas registradas sem vínculo de RT vigente cujo sócio é profissional com registro ativo.', 'Orientar a anotação do RT: o sócio pode ser o responsável natural. Sociedade não é vínculo de responsabilidade.')}><span>Registradas sem RT com sócio profissional ativo<small>empresas</small></span><b>{int(q.registradasSemRtComSocioProfissional.length)}</b></button></li>
      <li><button className="is-acao" onClick={() => abrir('Registradas com sócio profissional inativo', q.registradasComSocioProfissionalInativo, 'Empresas registradas cujo sócio profissional está com registro cancelado ou interrompido na data de referência.', 'Contexto para o relacionamento com o profissional; nada a notificar à empresa por isso.')}><span>Sócio profissional cancelado ou interrompido<small>empresas</small></span><b>{int(q.registradasComSocioProfissionalInativo.length)}</b></button></li>
      <li><button className="is-acao" onClick={() => abrir('Sócio profissional é RT da própria empresa', empresasComSocioRt, 'Empresas em que um sócio profissional também é o responsável técnico de vínculo vigente na data de referência.', 'Contexto: sociedade e responsabilidade técnica coincidem. Nada a notificar por isso.')}><span>Sócio profissional é RT da própria empresa<small>sócios, em {int(empresasComSocioRt.length)} empresas</small></span><b>{int(q.socioEhRt.length)}</b></button></li>
    </ul>
  </div>;
}

export const exportaVinculos = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Empregados técnicos por empresa', 'Registradas', 'Sem registro (atividade da lista)'], linhas: () => ctx.parcerias.vinculos.porFaixa.map(row => [row.faixa, row.registradas, row.semRegistro]) });
export function Vinculos({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.parcerias.vinculos, rows = q.porFaixa, maiorVinculo = Math.max(1, ...rows.map(row => row.registradas + row.semRegistro));
  const option = useMemo(() => ({
    grid: { top: 24, right: 8, bottom: 2, left: 2, containLabel: true }, legend: { top: 0, left: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 11 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: faixasVinculos.map(faixa => faixa), axisLabel: { color: tokens.muted, fontSize: 11, interval: 0 }, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 11 } },
    series: [
      // O número de cada parte dentro da barra (07/11/2026, ler sem passar o mouse); parte pequena demais fica sem número.
      { type: 'bar', name: 'Registradas', stack: 'v', barWidth: '40%', data: rows.map(row => row.registradas), itemStyle: { color: tokens.good },
        label: { show: true, position: 'inside', color: '#FFFFFF', fontSize: 11, fontWeight: 700, formatter: (item: any) => item.value >= maiorVinculo * 0.08 ? int(item.value) : '' } },
      { type: 'bar', name: 'Sem registro (atividade da lista)', stack: 'v', data: rows.map(row => row.semRegistro), itemStyle: { color: tokens.warn, borderRadius: [3, 3, 0, 0] },
        label: { show: true, position: 'inside', color: '#1A202C', fontSize: 11, fontWeight: 700, formatter: (item: any) => item.value >= maiorVinculo * 0.08 ? int(item.value) : '' } },
    ],
  }), [rows, tokens]);
  const abrir = (titulo: string, ids: string[], what: string, use: string) => ids.length && ctx.open({ kind: 'linhas', eyebrow: 'Contexto que depende de acordo com o Ministério do Trabalho', title: titulo, what, use, listTitle: 'Empresas, mais vínculos técnicos primeiro', rows: linhasEmpresas(ctx, ids, id => { const row = q.empresas.find(item => item.companyId === id)!; return { value: `${int(row.vinculosTecnicos)} técnico${row.vinculosTecnicos === 1 ? '' : 's'}`, note: `${int(row.vinculosTotal)} vínculos no total`, sort: row.vinculosTecnicos }; }) });
  return <div className="split">
    <Chart option={option} tokens={tokens} label="Empresas por faixa de vínculos técnicos e situação do registro" />
    <ul className="side-list" aria-label="Leituras dos vínculos">
      <li><button className="is-acao" onClick={() => abrir('Registradas com empregados técnicos e sem RT vigente', q.registradasSemRt, 'Empresas registradas com ao menos um vínculo CLT em CBO de engenharia e nenhum responsável técnico vigente na data de referência.', 'Conferir se há atividade técnica e orientar a anotação do RT. Empregado em CBO técnico não é RT.')}><span>Registradas com técnicos e sem RT vigente</span><b>{int(q.registradasSemRt.length)}</b></button></li>
      <li><button className="is-acao" onClick={() => abrir('Universo sem registro com empregados técnicos', q.semRegistroComTecnicos, 'Estabelecimentos com CNAE da lista, sem registro vigente, com vínculos em CBO de engenharia.', 'Prioriza a análise do CNAE sem registro; o vínculo não prova atividade privativa.')}><span>Universo sem registro com técnicos</span><b>{int(q.semRegistroComTecnicos.length)}</b></button></li>
    </ul>
  </div>;
}

/* ---------- Painel de Empresas · visuais novos ---------- */

/** Indicadores do mapa. `alerta` pinta do amarelo ao vermelho (quanto mais, pior); os demais vão do azul claro ao escuro. */
export type MetricaMapa = 'cobertura' | 'semRegistro' | 'empresas' | 'crescimento' | 'rt' | 'inadimplencia' | 'arts' | 'emprego';
type Abre = 'faltam' | 'ativas' | 'devedoras';
export const metricasMapa: Record<MetricaMapa, { label: string; curto: string; base?: string; get: (row: LinhaGre) => number | null; fmt: (value: number) => string; alerta?: boolean; menorPrimeiro?: boolean; abre: Abre }> = {
  cobertura: { label: 'Parte do mercado registrada', curto: 'registrada', base: 'estabelecimentos da lista', get: row => row.cobertura, fmt: value => pct(value), menorPrimeiro: true, abre: 'faltam' },
  semRegistro: { label: 'CNPJs da lista sem registro', curto: 'sem registro', base: 'estabelecimentos da lista', get: row => row.semRegistro, fmt: int, alerta: true, abre: 'faltam' },
  empresas: { label: 'Empresas registradas', curto: 'registradas', get: row => row.base, fmt: int, abre: 'ativas' },
  crescimento: { label: 'Variação das registradas', curto: 'variação', base: 'registradas no início do período', get: row => row.crescimento, fmt: value => `${value >= 0 ? '+' : ''}${pct(value)}`, menorPrimeiro: true, abre: 'ativas' },
  rt: { label: 'Registradas com RT', curto: 'com RT', base: 'empresas registradas', get: row => row.rt, fmt: value => pct(value), menorPrimeiro: true, abre: 'ativas' },
  inadimplencia: { label: 'Anuidade atrasada', curto: 'atrasada', base: 'empresas registradas', get: row => row.inadimplencia, fmt: value => pct(value), alerta: true, abre: 'devedoras' },
  arts: { label: 'ARTs de empresas no período', curto: 'ARTs', base: 'empresas registradas', get: row => row.arts, fmt: int, abre: 'ativas' },
  emprego: { label: 'Empregos técnicos', curto: 'empregos', get: row => row.empregoTecnico, fmt: int, abre: 'ativas' },
};
const rampaMapa = (alerta: boolean, dark: boolean) => alerta
  ? (dark ? ['#3A2E22', '#7A5A10', '#C9851F', '#E5703B', '#FF7B7B'] : ['#FFF4D6', '#FFD98A', '#F6AD55', '#E5703B', '#C53030'])
  : (dark ? ['#2A4A7F', '#3B67A8', '#5B8FD0', '#8DBCEB', '#D4EDFF'] : ['#C3D9F2', '#93BCEA', '#5E9BDD', '#2B6CB0', '#082D74']);
/** Município sem valor: cinza neutro, para não se confundir com a faixa mais clara do azul. */
const semDados = (dark: boolean) => dark ? '#3A4250' : '#E3E6EA';

/** CSV do mapa: município, GRE, valor do indicador e a base da porcentagem (05/11/2026). */
export const exportarMapa = (ctx: CockpitCtx, metrica: MetricaMapa): Exportavel => { const config = metricasMapa[metrica];
  return { cabecalho: ['Município', 'GRE', config.label, config.base ?? 'Empresas ou estabelecimentos na base'], linhas: () => { const gres = new Map(ctx.linhas.map(row => [row.id, row.curto]));
    return [...valoresPorCidade(ctx, metrica, ctx.period).values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(row => [row.nome, gres.get(row.greId) ?? row.greId, row.valor === null ? null : Math.round(row.valor * 10) / 10, row.base]); } }; };
/**
 * Mapa do estado com o limite de cada município (pedido do Caio em 02/11/2026: nada de bolhas). Desde 04/11/2026 cada município é
 * pintado pelo próprio valor no indicador escolhido, em cinco faixas; ao lado, as GREs em ordem, e passar o mouse numa GRE acende
 * os municípios dela. Com uma GRE ou um município escolhido no alto da tela, o mapa aproxima dele, e o município escolhido ganha contorno.
 */
export function MapaMercado({ ctx, metrica }: { ctx: CockpitCtx; metrica: MetricaMapa }) {
  const centroids = useSpMap(), { tokens, dark, linhas } = ctx, config = metricasMapa[metrica];
  const [destaque, setDestaque] = useState<string | null>(null);
  const regioes = useMemo(() => centroids ? territorioGre(ctx.dataset, centroids) : null, [centroids, ctx.dataset]);
  const rotulos = useMemo(() => regioes && centroids ? rotulosGre(regioes, centroids) : null, [regioes, centroids]);
  const cidades = useMemo(() => valoresPorCidade(ctx, metrica, ctx.period), [ctx.stateScope, ctx.stateModel, ctx.stateHistory, ctx.linhas, metrica, ctx.period]); // eslint-disable-line react-hooks/exhaustive-deps
  const porNome = useMemo(() => new Map([...cidades.values()].map(row => [row.nome, row])), [cidades]);
  const local = ctx.cidadeId ? municipioPorId(ctx.dataset).get(ctx.cidadeId) : undefined, cidade = local ? { name: local.nome } : undefined;
  const classes = useMemo(() => {
    const valores = [...cidades.values()].map(row => row.valor).filter((value): value is number => value !== null).sort((a, b) => a - b), cores = rampaMapa(Boolean(config.alerta), dark);
    const classe = faixasPorQuantil(valores);
    const faixas = cores.map((cor, index) => { const membros = valores.filter(value => classe(value) === index); return { cor, min: membros.length ? membros[0] : null, max: membros.length ? membros.at(-1)! : null }; }).filter(row => row.min !== null);
    return { classe, cores, faixas };
  }, [cidades, config, dark]);
  const porId = useMemo(() => new Map(linhas.map(row => [row.id, row])), [linhas]);
  const corCidade = (nome: string) => { const row = porNome.get(nome); return row?.valor === null || row?.valor === undefined ? semDados(dark) : classes.cores[classes.classe(row.valor)]; };
  const ranking = [...linhas].filter(row => config.get(row) !== null).sort((a, b) => config.menorPrimeiro ? config.get(a)! - config.get(b)! : config.get(b)! - config.get(a)!);
  const maximo = Math.max(...ranking.map(row => Math.abs(config.get(row)!)), 1);
  const option = useMemo(() => {
    if (!regioes || !rotulos || !centroids) return null;
    const foco = cidade ? { center: centroids.get(cidade.name), zoom: 3.2 } : ctx.greId ? { center: rotulos.get(ctx.greId), zoom: 2.2 } : null;
    const dica = (nome: string) => { const local = porNome.get(nome), gre = local ? porId.get(local.greId) : undefined; if (!local) return nome; const daGre = gre ? config.get(gre) : null;
      return `<b>${nome}</b> · ${gre?.curto ?? ''}<br/>${config.label}: <b>${local.valor === null ? (local.base ? 'poucos dados' : 'sem dados') : config.fmt(local.valor)}</b>${config.base ? `<br/><span style="opacity:.8">${int(local.base)} ${config.base}</span>` : ''}<br/><span style="opacity:.8">Na GRE: ${daGre === null ? '—' : config.fmt(daGre)}</span><br/><span style="opacity:.7">clique para ver ${config.abre === 'faltam' ? 'os CNPJs sem registro' : 'as empresas'} do município</span>`; };
    return {
      tooltip: { trigger: 'item', formatter: (item: any) => item.componentType === 'geo' ? dica(item.name) : '' },
      geo: { map: 'spPainel', ...proporcaoSp, roam: true, scaleLimit: { min: 1, max: 8 }, ...(foco?.center ? { center: foco.center, zoom: foco.zoom } : { left: 2, right: 2, top: 2, bottom: 2 }), selectedMode: false, tooltip: { show: true },
        itemStyle: { areaColor: tokens.soft, borderColor: tokens.surface, borderWidth: 0.35 }, emphasis: { itemStyle: { areaColor: tokens.accent }, label: { show: false } },
        regions: [...regioes].map(([name, greId]) => { const apagado = destaque ? destaque !== greId : Boolean(ctx.greId && ctx.greId !== greId), escolhido = cidade?.name === name;
          return { name, itemStyle: { areaColor: corCidade(name), opacity: apagado ? 0.25 : 1, borderColor: escolhido ? tokens.ink : tokens.surface, borderWidth: escolhido ? 1.6 : 0.35 } }; }) },
      series: [{ type: 'scatter', coordinateSystem: 'geo', symbolSize: 1, itemStyle: { color: 'transparent' }, silent: true,
        data: [...rotulos].map(([greId, at]) => ({ name: porId.get(greId)?.curto ?? greId, greId, value: at })),
        label: { show: true, formatter: (item: any) => item.name, color: dark ? '#E2E8F0' : '#1A202C', fontSize: 11.5, fontWeight: 700, textBorderColor: dark ? 'rgba(8,20,40,.9)' : 'rgba(255,255,255,.85)', textBorderWidth: 2.5 },
        labelLayout: { hideOverlap: true } }],
    };
  }, [regioes, rotulos, centroids, classes, config, tokens, destaque, ctx.greId, cidade, porId, porNome]); // eslint-disable-line react-hooks/exhaustive-deps
  const abrirGre = (greId: string | undefined) => { const row = greId ? porId.get(greId) : undefined; if (!row) return; const recorte = { gre: row.id };
    if (config.abre === 'faltam') { if (row.semRegistroIds.length) ctx.open({ kind: 'cnpjs', title: `${row.name}: CNPJs da lista sem registro`, what: 'Estabelecimentos ativos na Receita com atividade da lista do Crea-SP nesta GRE e sem registro localizado na data escolhida.', use: 'Não estar no cadastro não quer dizer irregular. Confirme a atividade antes de orientar ou notificar.', ids: row.semRegistroIds, recorte }); return; }
    const devedoras = config.abre === 'devedoras', ids = devedoras ? row.devedoras : row.ativas;
    if (ids.length) ctx.open({ kind: 'empresas', title: `${row.name}: ${devedoras ? 'registradas com anuidade atrasada' : 'empresas registradas'}`, what: devedoras ? 'Empresas registradas nesta GRE com anuidade vencida na data escolhida.' : 'Empresas com registro ativo nesta GRE na data escolhida.', ids, recorte }); };
  const abrirCidade = (nome: string) => { const row = porNome.get(nome); if (!row?.ids.length) return; const recorte = { cidade: row.id };
    if (config.abre === 'faltam') ctx.open({ kind: 'cnpjs', title: `${nome}: CNPJs da lista sem registro`, what: 'Estabelecimentos ativos na Receita com atividade da lista do Crea-SP neste município e sem registro localizado na data escolhida.', use: 'Não estar no cadastro não quer dizer irregular. Confirme a atividade antes de orientar ou notificar.', ids: row.ids, recorte });
    else ctx.open({ kind: 'empresas', title: `${nome}: ${config.abre === 'devedoras' ? 'registradas com anuidade atrasada' : 'empresas registradas'}`, what: config.abre === 'devedoras' ? 'Empresas registradas com matriz neste município e anuidade vencida na data escolhida.' : 'Empresas com registro ativo e matriz neste município na data escolhida.', ids: row.ids, recorte }); };
  return <div className="geo-layout is-compacto">
    <div className="geo-map">{option ? <Chart option={option} tokens={tokens} label={`Mapa por município: ${config.label}`} onPick={params => { if (params.componentType === 'geo') abrirCidade(params.name); }} /> : <div className="loading">Carregando o mapa…</div>}
      <ul className="geo-legend" aria-label="Faixas dos municípios">{classes.faixas.map((item, index) => <li key={index}><i style={{ background: item.cor }} />{item.min === item.max ? config.fmt(item.min!) : `${config.fmt(item.min!)} a ${config.fmt(item.max!)}`}</li>)}<li><i style={{ background: semDados(dark) }} />poucos dados</li></ul></div>
    <ol className="geo-rank is-gre" onMouseLeave={() => setDestaque(null)} aria-label={`GREs por ${config.label}`}><li className="geo-rank-head"><span>GRE</span><b>{config.curto}</b></li>{ranking.map(row => { const value = config.get(row)!;
      return <li key={row.id}><button onClick={() => abrirGre(row.id)} onMouseEnter={() => setDestaque(row.id)} onFocus={() => setDestaque(row.id)} className={ctx.greId === row.id ? 'is-selected' : ''}>
        <span>{row.curto}</span><b>{config.fmt(value)}</b><em style={{ width: `${Math.abs(value) / maximo * 100}%` }} /></button></li>; })}</ol>
  </div>;
}

/** Mapa de árvore: cada retângulo grande é uma câmara, e os de dentro são as atividades (CNAE). Tamanho = estabelecimentos enquadrados pela atividade; cor = parte registrada, comparada com a meta.
 * As menores atividades de cada câmara, que juntas somam até 10% dela, viram "Outras atividades". Pequeno, o bloco mostra menos atividades por câmara (proporcional ao tamanho dela); ampliado, mostra todas acima da regra. Outras atividades fica sempre por último. */
/** No bloco pequeno, cada câmara mostra com nome cerca de uma atividade a cada 7% do mercado que ela tem (no mínimo 2). */
const atividadesNoBloco = (parte: number) => Math.max(2, Math.round(parte * 14));
/** Três faixas ancoradas na meta de cobertura do painel (05/11/2026): abaixo da meta em laranja-vermelho, da meta até 15 pontos acima em azul, e mais que isso em azul-escuro. Antes a rampa ia do mínimo ao máximo do recorte, e o mesmo 70% mudava de cor conforme o filtro. */
const faixasMeta = (meta: number, dark: boolean) => [
  { nome: `abaixo de ${meta}%`, cor: dark ? '#E5703B' : '#C9512F', ate: meta },
  { nome: `${meta}% a ${meta + 15}%`, cor: dark ? '#4A7FC1' : '#3182CE', ate: meta + 15 },
  { nome: `acima de ${meta + 15}%`, cor: dark ? '#7FB0E6' : '#082D74', ate: Number.POSITIVE_INFINITY },
];
const corMeta = (taxa: number | null, faixas: ReturnType<typeof faixasMeta>, dark: boolean) => taxa === null ? (dark ? '#2D3748' : '#E2E8F0') : faixas.find(faixa => taxa < faixa.ate)!.cor;
const ramosDe = (ctx: CockpitCtx, ampliado: boolean) => mercadoEmArvore(ctx.scope, ctx.model, camaraPorCnae, { camaras, resto: 0.1, maxPorCamara: ampliado ? Number.POSITIVE_INFINITY : atividadesNoBloco });
export const exportarArvore = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Câmara', 'Atividade', 'CNAE', 'Estabelecimentos', 'Parte registrada (%)'],
  linhas: () => ramosDe(ctx, true).flatMap(ramo => ramo.todas.map(row => [ramo.camara, row.label, row.code, row.total, row.cobertura === null ? null : Math.round(row.cobertura * 10) / 10])) });
export function ArvoreMercado({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, dark } = ctx, ampliado = ctx.focus === 'tm', faixas = faixasMeta(ctx.metas.cobertura, dark);
  const ramos = useMemo(() => ramosDe(ctx, ampliado), [ctx.scope, ctx.model, ampliado]); // eslint-disable-line react-hooks/exhaustive-deps
  const geral = Math.max(1, sum(ramos.map(ramo => ramo.total)));
  const option = useMemo(() => ({
    tooltip: { formatter: (item: any) => { const d = item.data; if (!d?.linha) return d?.ramo ? `<b>${d.name}</b><br/>${d.ramo.total ? `${int(d.ramo.total)} estabelecimentos · ${pct(d.ramo.registrados / d.ramo.total * 100)} registrados<br/>${int(d.ramo.todas.length)} atividades da lista` : 'Nenhum estabelecimento da lista nesta câmara no recorte'}` : '';
      const row = d.linha as LinhaCnae;
      if (row.agrupadas) return `<b>${row.label}</b> de ${d.camara}<br/>${int(row.total)} estabelecimentos · ${row.cobertura === null ? '—' : pct(row.cobertura)} registrados<br/>${row.agrupadas.slice(0, 8).map(x => `${x.code} ${x.label}: ${int(x.total)}`).join('<br/>')}${row.agrupadas.length > 8 ? `<br/>e mais ${row.agrupadas.length - 8}` : ''}<br/><span style="opacity:.75">clique para ver os CNPJs sem registro</span>`;
      return `<b>${row.code}</b> ${row.label}<br/>${int(row.total)} estabelecimentos com esta atividade como principal · ${row.cobertura === null ? '—' : pct(row.cobertura)} registrados<br/>${int(row.semRegistro.length)} sem registro${row.secundaria ? `<br/>Outros ${int(row.secundaria)} têm esta atividade como secundária (contados na principal)` : ''}<br/><span style="opacity:.75">clique para ver os CNPJs sem registro</span>`; } },
    series: [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, left: 0, right: 0, top: 0, bottom: 0, squareRatio: 1.2, leafDepth: 2, sort: false,
      upperLabel: { show: true, height: 18, color: '#FFFFFF', fontSize: 11.5, fontWeight: 700, overflow: 'truncate', formatter: (item: any) => { const ramo = item.data?.ramo as RamoMercado | undefined; return ramo ? `${ramo.total ? pct(ramo.registrados / ramo.total * 100) : '—'} · ${item.name}` : item.name; } },
      levels: [{ itemStyle: { borderColor: tokens.surface, borderWidth: 0, gapWidth: 3 } }, { itemStyle: { borderColor: dark ? '#1A2D52' : '#01224D', borderWidth: 2, gapWidth: 1 }, upperLabel: { show: true } }, { itemStyle: { borderColor: tokens.surface, borderWidth: 1, gapWidth: 1 } }],
      label: { show: true, fontSize: 11.5, color: '#FFFFFF', overflow: 'truncate', lineHeight: 12, formatter: (item: any) => { const row = item.data?.linha as LinhaCnae | undefined; if (!row) return item.data?.ramo && !item.data.ramo.total ? 'sem estabelecimentos' : '';
        return `{p|${row.cobertura === null ? '' : pct(row.cobertura)}}\n${row.label}\n{c|${`${int(row.total)} estabelecimentos`}}`; }, rich: { p: { fontSize: 12, fontWeight: 800, color: '#FFFFFF' }, c: { fontSize: 11, color: 'rgba(255,255,255,.75)' } } },
      data: ramos.map(ramo => ({ name: ramo.camara, ramo, itemStyle: { color: dark ? '#1A2D52' : '#01224D' },
        ...(ramo.total ? { value: ramo.total, children: ramo.atividades.map(linha => ({ name: linha.code, value: linha.total, linha, camara: ramo.camara, itemStyle: { color: linha.agrupadas ? (dark ? '#4A5568' : '#718096') : corMeta(linha.cobertura, faixas, dark), ...(linha.agrupadas ? { decal: undefined } : {}) } })) }
          : { value: geral * 0.012 }) })) }],
  }), [ramos, tokens, dark, faixas, geral]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="arvore-layout">
    <Chart option={option} tokens={tokens} label="Mercado por câmara e atividade, com a parte registrada comparada com a meta" onPick={params => { const d = params.data; if (!d) return;
      if (d.linha) { const row = d.linha as LinhaCnae, ids = row.semRegistro.length ? row.semRegistro : row.registrados, nome = row.agrupadas ? `${d.camara}, ${row.label.toLowerCase()}` : row.label;
        if (ids.length) ctx.open({ kind: 'cnpjs', title: `${nome}: ${row.semRegistro.length ? 'sem registro' : 'registrados'}`, what: row.agrupadas ? `Estabelecimentos ativos na Receita das atividades menores de ${d.camara}: ${row.agrupadas.map(x => x.code).join(', ')}.` : `Estabelecimentos ativos na Receita cuja atividade da lista do Crea-SP é ${row.code} (${row.label}).`, use: row.semRegistro.length ? 'Não estar no cadastro não quer dizer irregular. Confirme a atividade antes de orientar ou notificar.' : undefined, ids, recorte: { camara: d.camara } }); }
      else if (d.ramo) { const ids = (d.ramo as RamoMercado).todas.flatMap(row => row.semRegistro); if (ids.length) ctx.open({ kind: 'cnpjs', title: `${d.name}: sem registro`, what: 'Estabelecimentos ativos na Receita com atividade da lista desta câmara e sem registro na data escolhida.', use: 'Não estar no cadastro não quer dizer irregular. Confirme a atividade antes de orientar ou notificar.', ids, recorte: { camara: d.name } }); } }} />
    <ul className="geo-legend is-meta" aria-label="Parte registrada comparada com a meta">{faixas.map(faixa => <li key={faixa.nome}><i style={{ background: faixa.cor }} />{faixa.nome}</li>)}</ul>
  </div>;
}

/** Matriz de calor: tempo de registro nas linhas, capital social nas colunas. Cada célula é o número de empresas registradas. */
const curtoIdade = ['menos de 1 ano', '1 a 2 anos', '2 a 5 anos', '5 a 10 anos', '10 anos ou mais'];
const curtoCapital = ['até 50 mil', '50 a 200 mil', '200 mil a 1 mi', '1 a 5 mi', 'mais de 5 mi'];
export const exportarIdadeCapital = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Tempo de registro', 'Capital social (R$)', 'Empresas registradas'], linhas: () => idadeCapital(ctx.scope, ctx.model).celulas.map(cel => [curtoIdade[cel.idade], curtoCapital[cel.capital], cel.ids.length]) });
export function IdadeCapital({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, dark } = ctx, m = useMemo(() => idadeCapital(ctx.scope, ctx.model), [ctx.scope, ctx.model]), maior = Math.max(1, ...m.celulas.map(row => row.ids.length));
  const option = useMemo(() => ({
    grid: { top: 4, right: 4, bottom: 38, left: 4, containLabel: true },
    tooltip: { formatter: (item: any) => { const cel = m.celulas[item.dataIndex]; return `Registradas há <b>${curtoIdade[cel.idade]}</b><br/>Capital social <b>${curtoCapital[cel.capital]}</b><br/>${int(cel.ids.length)} empresas`; } },
    xAxis: { type: 'category', data: curtoCapital, splitArea: { show: false }, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.muted, fontSize: 11.5, interval: 0, formatter: (value: string) => value === '200 mil a 1 mi' ? '200 mil\na 1 mi' : value }, name: 'capital social (R$)', nameLocation: 'middle', nameGap: 32, nameTextStyle: { color: tokens.muted, fontSize: 11.5 } },
    yAxis: { type: 'category', data: curtoIdade, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.muted, fontSize: 11.5 } },
    visualMap: { show: false, min: 0, max: maior, inRange: { color: dark ? ['#13233F', '#2F548C', '#7FB0E6'] : ['#EAF1FA', '#7FB0E6', '#082D74'] } },
    series: [{ type: 'heatmap', data: m.celulas.map(cel => ({ value: [cel.capital, cel.idade, cel.ids.length], label: { color: !dark && cel.ids.length > maior * 0.55 ? '#FFFFFF' : tokens.ink } })), itemStyle: { borderColor: tokens.surface, borderWidth: 2, borderRadius: 4 },
      label: { show: true, fontSize: 11, fontWeight: 700, formatter: (item: any) => item.value[2] ? int(item.value[2]) : '' } }],
  }), [m, maior, tokens, dark]);
  return <Chart option={option} tokens={tokens} label="Empresas registradas por tempo de registro e capital social" onPick={params => { const cel = m.celulas[params.dataIndex]; if (cel?.ids.length) ctx.open({ kind: 'empresas', title: `Registradas há ${curtoIdade[cel.idade]}, capital ${curtoCapital[cel.capital]}`, what: 'Empresas com registro ativo na data escolhida, pelo tempo desde o primeiro registro e pelo capital social declarado à Receita.', ids: cel.ids }); }} />;
}

/** Calor dos novos registros: uma linha por câmara, uma coluna por trimestre, com o número em cada célula. A cor compara cada câmara com ela mesma (o trimestre mais forte da linha fica mais escuro), para as câmaras pequenas também mostrarem o seu ritmo. Cobre os meses da janela do alto da tela. */
const trimestresDe = (months: string[]) => { const lista: { chave: string; rotulo: string; meses: string[] }[] = [];
  for (const month of months) { const [ano, m] = month.split('-').map(Number), tri = Math.floor((m - 1) / 3) + 1, chave = `${ano}-${tri}`, atual = lista[lista.length - 1];
    if (atual?.chave === chave) atual.meses.push(month); else lista.push({ chave, rotulo: rotuloTrimestre(`${ano}-T${tri}`), meses: [month] }); }
  return lista; };
const calorRegistros = (ctx: CockpitCtx) => { const r = registrosPorCamara(ctx.historyScope, ctx.camaraDe, ctx.janela.months.length), trimestres = trimestresDe(r.months);
  const celulas = r.linhas.flatMap((linha, y) => { const porTri = trimestres.map(tri => tri.meses.flatMap(month => linha.porMes.get(month) ?? [])), maiorDaLinha = Math.max(1, ...porTri.map(ids => ids.length));
    return porTri.map((ids, x) => ({ x, y, ids, forca: ids.length / maiorDaLinha })); });
  return { r, trimestres, celulas }; };
export const exportarRegistrosCalor = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Câmara', 'Trimestre', 'Empresas com primeiro registro'], linhas: () => { const { r, trimestres, celulas } = calorRegistros(ctx); return celulas.map(cel => [r.linhas[cel.y].camara, trimestres[cel.x].rotulo, cel.ids.length]); } });
export function RegistrosCalor({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, dark } = ctx, { r, trimestres, celulas } = useMemo(() => calorRegistros(ctx), [ctx.historyScope, ctx.camaraDe, ctx.janela.months.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const option = useMemo(() => ({
    grid: { top: 4, right: 4, bottom: 2, left: 4, containLabel: true },
    tooltip: { formatter: (item: any) => { const cel = celulas[item.dataIndex]; return `<b>${r.linhas[cel.y].camara}</b>, ${trimestres[cel.x].rotulo}<br/>${int(cel.ids.length)} empresas fizeram o primeiro registro`; } },
    xAxis: { type: 'category', data: trimestres.map(tri => tri.rotulo), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.muted, fontSize: 11.5, interval: 0 } },
    yAxis: { type: 'category', inverse: true, data: r.linhas.map(row => `${row.camara}\n${int(row.total)} empresas`), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11, lineHeight: 13 } },
    visualMap: { show: false, min: 0, max: 1, inRange: { color: dark ? ['#13233F', '#2F548C', '#FABD07'] : ['#F1F5FA', '#7FB0E6', '#082D74'] } },
    series: [{ type: 'heatmap', data: celulas.map(cel => ({ value: [cel.x, cel.y, cel.forca], label: { color: dark ? (cel.forca > 0.7 ? '#1A202C' : tokens.ink) : cel.forca > 0.55 ? '#FFFFFF' : tokens.ink } })), itemStyle: { borderColor: tokens.surface, borderWidth: 1.5, borderRadius: 3 },
      label: { show: true, fontSize: 11, fontWeight: 700, formatter: (item: any) => { const cel = celulas[item.dataIndex]; return cel.ids.length ? int(cel.ids.length) : ''; } } }],
  }), [r, trimestres, celulas, tokens, dark]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Novos registros de empresas por câmara e trimestre" onPick={params => { const cel = celulas[params.dataIndex]; if (cel?.ids.length) ctx.open({ kind: 'empresas', title: `${r.linhas[cel.y].camara}: primeiro registro no ${trimestres[cel.x].rotulo}`, what: 'Empresas que fizeram o primeiro registro no Crea-SP neste trimestre, pela câmara da atividade principal.', ids: cel.ids, recorte: { camara: r.linhas[cel.y].camara } }); }} />;
}

const partesDenominacao = (ctx: CockpitCtx) => { const q = ctx.parcerias.denominacao, { tokens } = ctx; return [{ name: 'Diretoria com maioria de profissionais', ids: q.atendem, color: tokens.good }, { name: 'Diretoria sem maioria de profissionais', ids: q.naoAtendem, color: tokens.bad }, { name: 'Sem dirigente identificado', ids: q.semDirigente, color: tokens.muted }]; };
export const exportaDenominacao = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Situação', 'Empresas'], linhas: () => [...partesDenominacao(ctx).map(part => [part.name, part.ids.length]), ['Diretoria sem maioria de profissionais, registradas', ctx.parcerias.denominacao.naoAtendemRegistradas.length]] });
/** Nome com “engenharia” ou “agronomia” e quem dirige a empresa (Lei 5.194/66, arts. 4º e 5º). Depende do CPF completo dos sócios. */
export function Denominacao({ ctx }: { ctx: CockpitCtx }) {
  const q = ctx.parcerias.denominacao, eyebrow = 'Demonstração que depende de acordo com a Receita Federal (CPF completo dos sócios)';
  const partes = partesDenominacao(ctx);
  const total = partes.reduce((soma, part) => soma + part.ids.length, 0);
  const abrir = (titulo: string, ids: string[]) => ids.length && ctx.open({ kind: 'empresas', eyebrow, title: titulo, what: 'Empresas com “engenharia” ou “agronomia” na razão social, pela composição da diretoria na data escolhida. A Lei 5.194/66 (art. 5º) pede que a maioria da diretoria seja de profissionais registrados.', use: 'Orientar a troca do nome ou a composição da diretoria. A lei não exige sócio engenheiro para o registro: exige responsável técnico.', ids });
  // Barra de 100% no lugar do anel (07/11/2026): o anel de Registro é o único da página, e a parte de cada situação se lê sem passar o mouse.
  return <div className="split">
    <div className="denom">
      <p className="denom-total"><b>{int(total)}</b> com engenharia ou agronomia no nome</p>
      <div className="denom-barra" role="group" aria-label="Empresas com engenharia no nome pela composição da diretoria">
        {partes.filter(part => part.ids.length).map(part => <button key={part.name} style={{ flexGrow: part.ids.length, background: part.color }} title={`${part.name}: ${int(part.ids.length)} empresas`} aria-label={`${part.name}: ${int(part.ids.length)} empresas, ${pct(part.ids.length / total * 100)}`} onClick={() => abrir(`Nome com engenharia: ${part.name.toLowerCase()}`, part.ids)}>{part.ids.length / total >= 0.08 ? pct(part.ids.length / total * 100) : ''}</button>)}
      </div>
    </div>
    <ul className="side-list" aria-label="Nome e diretoria">
      {partes.map(part => <li key={part.name}><button onClick={() => abrir(`Nome com engenharia: ${part.name.toLowerCase()}`, part.ids)}><i style={{ background: part.color }} /><span>{part.name}</span><b>{int(part.ids.length)}</b></button></li>)}
      <li><button className="is-acao" onClick={() => abrir('Registradas cujo nome não condiz com a diretoria', q.naoAtendemRegistradas)}><span>Registradas, entre as que não têm maioria</span><b>{int(q.naoAtendemRegistradas.length)}</b></button></li>
    </ul>
  </div>;
}

/** Economia, empresas abertas e registros: quatro séries com o primeiro mês igual a 100, para comparar o ritmo de cada uma. O PIB saiu do gráfico em 05/11/2026: anual e com dois anos de atraso, virava uma linha reta que não dizia nada (continua na ficha). */
const seriesRitmo = [
  { key: 'emprego', nome: 'Emprego formal em engenharia', curto: 'Emprego', fonte: 'Novo CAGED e RAIS', parceria: false },
  { key: 'credito', nome: 'Crédito a empresas de engenharia (!)', curto: 'Crédito a empresas (!)', fonte: 'Banco Central, depende de acordo', parceria: true },
  { key: 'aberturas12', nome: 'Empresas de engenharia abertas na Receita', curto: 'Abertas na Receita', fonte: 'dado real da Receita, soma de 12 meses', parceria: false },
  { key: 'registros12', nome: 'Empresas que se registraram no Crea-SP', curto: 'Registradas no Crea-SP', fonte: 'soma de 12 meses', parceria: false },
] as const;
/** O gráfico cobre os meses da janela do alto da tela (`janela.months`), e não mais a constante 24. */
export const useRitmo = (ctx: CockpitCtx) => useMemo(() => ritmoEconomico(ctx.dataset, ctx.greId, ctx.camara ? ctx.scope.companyIds : null, ctx.janela.months.length, ctx.cidadeId), [ctx.dataset, ctx.greId, ctx.camara, ctx.scope, ctx.cidadeId, ctx.janela.months.length]);
export const exportarRitmo = (ctx: CockpitCtx, r: ReturnType<typeof ritmoEconomico>): Exportavel => ({
  cabecalho: ['Mês', 'Emprego formal em engenharia', 'Crédito a empresas de engenharia (R$)', 'Abertas na Receita em 12 meses', 'Registradas no Crea-SP em 12 meses', 'Índice do emprego', 'Índice do crédito', 'Índice das abertas', 'Índice das registradas'],
  linhas: () => r.pontos.map((ponto, k) => [mes(ponto.month), ponto.emprego, ponto.credito, ponto.aberturas12, ponto.registros12, r.indice.emprego[k], r.indice.credito[k], r.indice.aberturas12[k], r.indice.registros12[k]]),
});
export function Ritmo({ ctx, r }: { ctx: CockpitCtx; r: ReturnType<typeof ritmoEconomico> }) {
  const { tokens } = ctx, meses = ctx.janela.months.length;
  // Crédito em roxo e emprego na cor do texto (05/11/2026): o laranja tracejado do crédito se confundia com o amarelo das registradas, e o cinza fino do emprego sumia.
  const cores: Record<typeof seriesRitmo[number]['key'], string> = { emprego: tokens.ink, credito: tokens.cat[2], aberturas12: tokens.blue, registros12: tokens.accent };
  const option = useMemo(() => ({
    grid: { top: 8, right: 12, bottom: 2, left: 4, containLabel: true },
    tooltip: { trigger: 'axis', formatter: (items: any[]) => { const ponto = r.pontos[items[0].dataIndex];
      const valor = (key: string) => { const v = (ponto as any)[key]; return v === null ? 'sem arquivo da Receita' : key === 'credito' ? brl(v) : `${int(v)}${key === 'emprego' ? ' empregados' : ''}`; };
      return `<b>${mes(ponto.month)}</b><br/>${items.map(item => { const s = seriesRitmo[item.seriesIndex]; return `${item.marker}${s.nome}: <b>${item.value === null || item.value === undefined ? '—' : item.value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</b> <span style="opacity:.75">(${valor(s.key)}, ${s.fonte})</span>`; }).join('<br/>')}`; } },
    xAxis: { type: 'category', data: r.pontos.map(row => mes(row.month)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 11, interval: 2 } },
    yAxis: { type: 'value', scale: true, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 11 } },
    series: seriesRitmo.map(s => ({ name: s.curto, type: 'line', data: r.indice[s.key], smooth: 0.25, symbol: 'none', connectNulls: false,
      lineStyle: { color: cores[s.key], width: s.key === 'registros12' || s.key === 'aberturas12' ? 2.8 : 2, type: s.parceria ? 'dashed' : 'solid' }, itemStyle: { color: cores[s.key] },
      markLine: s.key === 'emprego' ? { silent: true, symbol: 'none', lineStyle: { color: tokens.line, type: 'solid' }, label: { show: false }, data: [{ yAxis: 100 }] } : undefined })),
  }), [r, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  const v = r.variacao, sinal = (value: number | null) => value === null ? '—' : `${value >= 0 ? '+' : ''}${pct(value)}`;
  return <div className="split is-wide">
    <Chart option={option} tokens={tokens} label="Economia, empresas de engenharia abertas e registros no Crea-SP, com o primeiro mês igual a 100" onPick={params => { const ponto = r.pontos[params.dataIndex]; if (!ponto) return;
      const fim = `${ponto.month}-31`, inicio = `${Number(ponto.month.slice(0, 4)) - 1}${ponto.month.slice(4)}-31`, primeira = new Map<string, string>();
      for (const row of ctx.dataset.registrations) { const atual = primeira.get(row.companyId); if (!atual || row.startedAt < atual) primeira.set(row.companyId, row.startedAt); }
      const novas = [...primeira].filter(([id, data]) => data > inicio && data <= fim && ctx.scope.companyIds.has(id)).map(([id]) => id);
      if (novas.length) ctx.open({ kind: 'empresas', title: `Empresas que se registraram nos 12 meses até ${mes(ponto.month)}`, what: 'Empresas que fizeram o primeiro registro no Crea-SP nos 12 meses que terminam no mês escolhido.', ids: novas }); }} />
    <ul className="side-list" aria-label={`Variação em ${meses} meses`}>
      <li className="side-head">Variação em {meses} meses</li>
      {seriesRitmo.map(s => <li key={s.key}><span className="side-serie"><i style={{ background: cores[s.key] }} /><span>{s.curto}<small>{s.key === 'aberturas12' ? `${s.fonte}, até ${mes(r.ultimoMesReceita)}` : s.fonte}</small></span><b>{sinal(v[s.key])}</b></span></li>)}
    </ul>
  </div>;
}

/** Os meses do gráfico seguem a janela do painel (`janela.months`, hoje 24), e não uma constante. */
const linhasArtsMes = (ctx: CockpitCtx) => artsMensais(ctx.historyScope, ctx.janela.months.length);
export const exportaArtsMes = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Mês', 'ARTs no mês', 'Empresas com ART', 'Mesmo mês do ano anterior'], linhas: () => linhasArtsMes(ctx).map(row => [row.month, row.n, row.empresas.length, row.anoAnterior]) });
/** ARTs de empresas por mês na janela do painel, com a linha do mesmo mês do ano anterior em todos os meses. */
export function ArtsMes({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => linhasArtsMes(ctx), [ctx.historyScope, ctx.janela.months.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const option = useMemo(() => ({
    grid: { top: 28, right: 6, bottom: 2, left: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 11.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${mes(row.month)}</b><br/>${int(row.n)} ARTs de ${int(row.empresas.length)} empresas${row.anoAnterior === null ? '' : `<br/>${int(row.anoAnterior)} no mesmo mês do ano anterior`}<br/><span style="opacity:.75">clique para ver as empresas</span>`; } },
    // Um rótulo a cada três meses com 24 meses; a regra acompanha a janela quando ela crescer.
    xAxis: { type: 'category', data: rows.map(row => mes(row.month)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 11, interval: Math.max(0, Math.round(rows.length / 8) - 1) } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 11 } },
    series: [
      // Número em cada barra (07/11/2026, regra de ler sem passar o mouse); com mais de 24 meses, só a cada três.
      { name: 'ARTs no mês', type: 'bar', barWidth: '58%', data: rows.map(row => row.n), itemStyle: { color: tokens.blue, borderRadius: [3, 3, 0, 0] },
        label: { show: true, position: 'top', color: tokens.ink, fontSize: 11, formatter: (item: any) => rows.length <= 24 || (rows.length - 1 - item.dataIndex) % 3 === 0 ? int(item.value) : '' } },
      { name: 'Mesmo mês do ano anterior', type: 'line', data: rows.map(row => row.anoAnterior), symbol: 'circle', symbolSize: 4, lineStyle: { color: tokens.accent, width: 2 }, itemStyle: { color: tokens.accent } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="ARTs de empresas por mês" onPick={params => { const row = rows[params.dataIndex]; if (row?.empresas.length) ctx.open({ kind: 'empresas', title: `Empresas com ART em ${mes(row.month)}`, what: 'Empresas que registraram ao menos uma ART no mês escolhido.', ids: row.empresas }); }} />;
}

/** Rótulo curto da atividade credenciada; o órgão vira cabeçalho do grupo no eixo, em vez de repetir "(DETRAN-SP)" em cada linha (05/11/2026). */
const atividadeCurta: Record<string, string> = { 'Vistoria de identificação veicular': 'Vistoria veicular' };
export const exportaCredenciamentos = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Órgão', 'Atividade', 'Registradas com RT', 'Registradas sem RT', 'Sem registro', 'Credenciadas'], linhas: () => ctx.parcerias.credenciamentos.linhas.map(row => [row.fonte, row.atividade, row.comRt.length, row.registradasSemRt.length, row.semRegistro.length, row.empresas.length]) });
/** Empresas credenciadas no DETRAN-SP e no INMETRO, com a situação no cadastro e o RT. Depende de acordo com cada órgão. */
export function Credenciamentos({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.parcerias.credenciamentos, rows = q.linhas;
  const option = useMemo(() => ({
    grid: { top: 26, right: 30, bottom: 2, left: 2, containLabel: true }, legend: { top: 0, left: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 11 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.atividade}</b> (${row.fonte})<br/>${items.map(item => `${item.marker} ${item.seriesName}: <b>${int(item.value)}</b>`).join('<br/>')}<br/>${int(row.empresas.length)} credenciadas<br/><span style="opacity:.75">clique para ver as empresas</span>`; } },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => atividadeCurta[row.atividade] ?? row.atividade), axisTick: { show: false }, axisLine: { show: false },
      // A primeira linha de cada órgão leva o nome dele em cima, como cabeçalho do grupo.
      axisLabel: { interval: 0, color: tokens.ink, fontSize: 11.5, lineHeight: 13, rich: { g: { color: tokens.muted, fontSize: 11, fontWeight: 800, lineHeight: 12 }, n: { color: tokens.ink, fontSize: 11.5 } }, formatter: (value: string, index: number) => rows[index] && rows[index - 1]?.fonte !== rows[index].fonte ? `{g|${rows[index].fonte}}\n{n|${value}}` : `{n|${value}}` } },
    series: [
      { type: 'bar', name: 'Registradas com RT', stack: 'c', barWidth: '55%', barMaxWidth: 22, data: rows.map(row => row.comRt.length), itemStyle: { color: tokens.good } },
      { type: 'bar', name: 'Registradas sem RT', stack: 'c', data: rows.map(row => row.registradasSemRt.length), itemStyle: { color: tokens.accent } },
      { type: 'bar', name: 'Sem registro', stack: 'c', data: rows.map(row => row.semRegistro.length), itemStyle: { color: tokens.bad, borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, formatter: (params: any) => int(rows[params.dataIndex].empresas.length) } },
    ],
  }), [rows, tokens]);
  const eyebrow = 'Demonstração que depende de acordo com o DETRAN-SP e com o INMETRO';
  return <div className="split">
    <Chart option={option} tokens={tokens} label="Empresas credenciadas por atividade e situação no cadastro" onPick={params => { const row = rows[params.dataIndex]; if (!row) return; const ids = [row.comRt, row.registradasSemRt, row.semRegistro][params.seriesIndex] ?? [];
      if (ids.length) ctx.open({ kind: 'empresas', eyebrow, title: `${row.atividade} (${row.fonte}): ${params.seriesName.toLowerCase()}`, what: 'Empresas com credenciamento vigente nesta atividade na data escolhida, pela situação no cadastro do Crea-SP.', use: 'O credenciamento mostra que a empresa exerce atividade técnica. Confirme a atribuição antes de orientar sobre registro ou RT.', ids }); }} />
    <ul className="side-list" aria-label="Leituras dos credenciamentos">
      <li><button className="is-acao" onClick={() => q.semRegistro.length && ctx.open({ kind: 'empresas', eyebrow, title: 'Credenciadas sem registro no Crea-SP', what: 'Empresas com credenciamento vigente no DETRAN-SP ou no INMETRO e sem registro ativo no Crea-SP na data escolhida.', use: 'Prioridade para orientação: a atividade credenciada costuma exigir responsável técnico.', ids: q.semRegistro })}><span>Credenciadas sem registro</span><b>{int(q.semRegistro.length)}</b></button></li>
      <li><button className="is-acao" onClick={() => q.registradasSemRt.length && ctx.open({ kind: 'empresas', eyebrow, title: 'Credenciadas registradas sem RT', what: 'Empresas credenciadas, registradas e sem responsável técnico vigente na data escolhida.', ids: q.registradasSemRt })}><span>Registradas sem RT vigente</span><b>{int(q.registradasSemRt.length)}</b></button></li>
    </ul>
  </div>;
}

/** Nomes curtos, para a legenda caber numa linha no bloco de quatro colunas; a ficha e as listas explicam cada desfecho. */
const nomesDesfecho: Record<DesfechoJucesp, string> = { registradasDepois: 'Registradas depois do ato', jaRegistradas: 'Já registradas antes', semRegistro: 'Sem registro' };
export const exportaJucesp = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Trimestre', 'Aberturas', 'Alterações do contrato', 'Registradas depois do ato', 'Já registradas antes do ato', 'Sem registro no Crea-SP', 'Trimestre em curso'],
  linhas: () => ctx.parcerias.jucesp.trimestres.map(row => [rotuloTrimestre(row.trimestre), row.aberturas, row.alteracoes, row.registradasDepois, row.jaRegistradas, row.semRegistro, row.emCurso ? 'sim' : 'não']) });
/**
 * Atos da Junta Comercial que incluíram atividade de engenharia no contrato social, empilhados pelo desfecho na data escolhida
 * (registrou-se depois, já era registrada, segue sem registro), com o tipo do ato na dica e nas listas (05/11/2026). Depende de acordo com a JUCESP.
 */
export function Jucesp({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.parcerias.jucesp, rows = q.trimestres, maiorAto = Math.max(1, ...rows.map(row => row.registradasDepois + row.jaRegistradas + row.semRegistro)), cores: Record<DesfechoJucesp, string> = { registradasDepois: tokens.good, jaRegistradas: tokens.blue, semRegistro: tokens.bad };
  const option = useMemo(() => ({
    grid: { top: 30, right: 6, bottom: 2, left: 4, containLabel: true }, legend: { top: 0, left: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, itemGap: 8, textStyle: { color: tokens.muted, fontSize: 11 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${rotuloTrimestre(row.trimestre)}</b>${row.emCurso ? ' (em curso)' : ''}<br/>${int(row.aberturas)} aberturas · ${int(row.alteracoes)} alterações do contrato<br/>${items.map(item => `${item.marker} ${item.seriesName}: <b>${int(item.value)}</b>`).join('<br/>')}<br/><span style="opacity:.75">clique numa parte para ver as empresas</span>`; } },
    xAxis: { type: 'category', data: rows.map(row => `${rotuloTrimestre(row.trimestre).replace(' ', '\n')}${row.emCurso ? '\nem curso' : ''}`), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 11, interval: 0, lineHeight: 12 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 11 } },
    series: desfechosJucesp.map((desfecho, index) => ({ type: 'bar', name: nomesDesfecho[desfecho], stack: 'j', barWidth: '52%', data: rows.map(row => row[desfecho]), itemStyle: { color: cores[desfecho], borderRadius: index === 2 ? [3, 3, 0, 0] : 0 },
      // O número de cada desfecho dentro da barra (07/11/2026, ler sem passar o mouse) e, na última parte, o total de atos do
      // trimestre em cima da pilha. Parte pequena demais fica sem número.
      label: index === 2 ? { show: true, position: 'top', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (item: any) => int(rows[item.dataIndex].aberturas + rows[item.dataIndex].alteracoes) }
        : { show: true, position: 'inside', color: '#FFFFFF', fontSize: 11, fontWeight: 700, formatter: (item: any) => item.value >= maiorAto * 0.12 ? int(item.value) : '' } })),
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  const eyebrow = 'Demonstração que depende de acordo com a Junta Comercial (JUCESP)', atoDe = useMemo(() => new Map(q.atos.map(ato => [ato.companyId, ato])), [q]);
  // Cada empresa tem no máximo um ato no cenário (abertura ou alteração), então a lista mostra o tipo e a data do ato de cada uma.
  const abrir = (titulo: string, ids: string[], what: string, use?: string) => ids.length && ctx.open({ kind: 'linhas', eyebrow, title: titulo, what, use, listTitle: 'Empresas, ato mais recente primeiro',
    rows: linhasEmpresas(ctx, ids, id => { const ato = atoDe.get(id); return { value: ato?.tipo ?? '—', note: ato ? `ato em ${data(ato.data)}` : '', sort: ato ? Date.parse(ato.data) : 0 }; }) });
  return <div className="split">
    <Chart option={option} tokens={tokens} label="Atos da Junta Comercial que incluíram engenharia, por trimestre e desfecho" onPick={params => { const row = rows[params.dataIndex], desfecho = desfechosJucesp[params.seriesIndex]; if (row && desfecho) abrir(`${rotuloTrimestre(row.trimestre)}: ${nomesDesfecho[desfecho].toLowerCase()}`, row.atos[desfecho].map(ato => ato.companyId), 'Empresas com ato na Junta Comercial neste trimestre que incluiu atividade da lista do Crea-SP, pelo desfecho na data escolhida.'); }} />
    <ul className="side-list" aria-label="Leituras dos atos da Junta">
      <li><button className="is-acao" onClick={() => abrir('Incluíram engenharia no contrato e seguem sem registro', q.alteracoesSemRegistro, 'Empresas que, nos últimos 24 meses, alteraram o contrato social para incluir atividade da lista do Crea-SP e não têm registro ativo na data escolhida.', 'É o aviso mais cedo de empresa nova na área: orientar sobre o registro antes de qualquer ação fiscal.')}><span>Alteraram o contrato e seguem sem registro</span><b>{int(q.alteracoesSemRegistro.length)}</b></button></li>
      <li><button className="is-acao" onClick={() => abrir('Registraram-se depois do ato na Junta', q.registradasDepois, 'Empresas que fizeram o primeiro registro no Crea-SP depois do ato (abertura ou alteração) que incluiu a atividade de engenharia.')}><span>Registraram-se depois do ato</span><b>{int(q.registradasDepois.length)}</b></button></li>
      <li><button className="is-acao" onClick={() => abrir('Atos com engenharia sem registro no Crea-SP', q.semRegistro, 'Empresas abertas ou alteradas nos últimos 24 meses com atividade da lista e sem registro ativo na data escolhida.')}><span>Abertas ou alteradas, sem registro</span><b>{int(q.semRegistro.length)}</b></button></li>
    </ul>
  </div>;
}

/* ---------- Responsáveis técnicos (aba RT) ---------- */
const quadroRtDe = (ctx: CockpitCtx) => quadroTecnico(ctx.scope, ctx.model, ctx.f, ctx.profissionais.modelo);
export const exportaQuadroRt = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Empresas por responsável técnico', 'Profissionais'], linhas: () => quadroRtDe(ctx).distribuicao.map(row => [row.empresas === 5 ? '5 ou mais' : row.empresas, row.profissionais.length]) });
/**
 * Quadro técnico do painel de Empresas em duas colunas (05/11/2026): à esquerda, a barra segmentada e a lista com a parte de cada
 * situação, mais a linha de RT com registro profissional cancelado ou interrompido; à direita, quantas empresas cada RT assume.
 */
export function QuadroRt({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, qt = useMemo(() => quadroRtDe(ctx), [ctx.scope, ctx.model, ctx.f, ctx.profissionais.modelo]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = Math.max(1, qt.comRt.length + qt.rtBaixado.length + qt.semVinculo.length), parte = (n: number) => `${int(n)} · ${pct(n / total * 100)}`;
  // "Sem vínculo carregado" em cinza com contraste nos dois temas: a cor das linhas de grade sumia no tema escuro.
  const cinza = tokens.muted, acima = qt.distribuicao.filter(row => row.empresas > qt.limite).reduce((soma, row) => soma + row.profissionais.length, 0);
  const option = useMemo(() => ({
    grid: { top: 42, right: 4, bottom: 20, left: 4, containLabel: true },
    title: { text: `Quantas empresas cada RT assume. Em vermelho, mais de ${qt.limite}`, left: 0, top: 0, textStyle: { color: tokens.ink, fontSize: 11, fontWeight: 700, fontFamily: 'Lato, sans-serif' } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `${int(items[0].value)} profissionais respondem por ${items[0].name} empresa(s)<br/><span style="opacity:.75">clique para ver os profissionais</span>` },
    xAxis: { type: 'category', data: qt.distribuicao.map(row => row.empresas === 5 ? '5+' : String(row.empresas)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted }, name: 'empresas por profissional', nameLocation: 'middle', nameGap: 22, nameTextStyle: { color: tokens.muted, fontSize: 11.5 } },
    yAxis: { type: 'value', show: false },
    series: [{ type: 'bar', barWidth: '62%', barMaxWidth: 46, data: qt.distribuicao.map(row => ({ value: row.profissionais.length, itemStyle: { color: row.empresas > qt.limite ? tokens.bad : tokens.heat[1], borderRadius: [3, 3, 0, 0] } })), label: { show: true, position: 'top', fontSize: 11, color: tokens.ink } }],
  }), [qt, tokens]);
  return <div className="quadro-rt">
    <div className="quadro-rt-esq">
      <Segments parts={[{ label: 'Com RT', value: qt.comRt.length, color: tokens.good }, { label: 'RT baixado sem substituto', value: qt.rtBaixado.length, color: tokens.bad }, { label: 'Sem vínculo carregado', value: qt.semVinculo.length, color: cinza }]} />
      <ul className="qt-list">
        <li><button onClick={() => ctx.open({ kind: 'empresas', title: 'Empresas com RT identificado', what: 'Empresas com registro ativo e responsável técnico com vínculo vigente.', ids: qt.comRt })}><i style={{ background: tokens.good }} /><span>Com RT identificado</span><b>{parte(qt.comRt.length)}</b></button></li>
        <li><button onClick={() => ctx.open({ kind: 'alvos', tipo: 'rt' })}><i style={{ background: tokens.bad }} /><span>RT baixado sem substituto</span><b>{parte(qt.rtBaixado.length)}</b></button></li>
        <li className="is-muted"><button onClick={() => ctx.open({ kind: 'empresas', title: 'Empresas sem vínculo de RT no cadastro', what: 'Empresas ativas sem nenhum vínculo de RT carregado. O registro exige RT; tratar como falha de carga a conferir, não como infração.', ids: qt.semVinculo })}><i style={{ background: cinza }} /><span>Sem RT no cadastro, a conferir</span><b>{parte(qt.semVinculo.length)}</b></button></li>
        <li><button className="qt-acao" onClick={() => qt.rtInativo.length && ctx.open({ kind: 'empresas', title: 'RT com registro profissional cancelado ou interrompido', what: 'Empresas com registro ativo cujo responsável técnico de vínculo vigente está com o registro profissional cancelado ou interrompido na data escolhida.', use: 'Notificar a empresa para indicar outro responsável técnico: quem responde por ela não pode exercer a profissão.', ids: qt.rtInativo })}><span>RT com registro profissional cancelado ou interrompido<small>entre as {int(qt.comRt.length)} com RT · {int(acima)} profissionais respondem por mais de {qt.limite} empresas</small></span><b>{int(qt.rtInativo.length)}</b></button></li>
      </ul>
    </div>
    <div className="quadro-rt-dir"><Chart option={option} tokens={tokens} label="Distribuição de empresas por responsável técnico" onPick={params => { const row = qt.distribuicao[params.dataIndex]; if (row?.profissionais.length) ctx.open({ kind: 'profissionais', empresas: row.empresas, ids: row.profissionais }); }} /></div>
  </div>;
}
