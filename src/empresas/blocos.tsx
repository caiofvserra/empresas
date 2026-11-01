import { useMemo } from 'react';
import type { complianceFlow } from '../gestao-v14/metrics';
import { Chart } from '../painel/chart';
import { brl, data, int, mes, pct, short } from '../painel/ui';
import { mercadoPorCamara, segmentosMercado } from '../painel/analise';
import type { SegmentoMercado } from '../painel/analise';
import { classesCnae, correspondencias } from '../observatorio/norte';
import { fontesInstalacao } from '../domain/frentes';
import type { FonteInstalacao } from '../domain/frentes';
import { faixasVinculos } from '../domain/parcerias';
import { antiguidadeRegistro, artsMensais, cnaesDoMercado, porCapital, ritmoEconomico } from '../domain/empresas';
import type { LinhaCnae } from '../domain/empresas';
import type { CockpitCtx } from '../cockpit/contexto';
import { artPorCamara, artPorModalidade, camaraPorte, entradasSaidas, pagamento } from '../cockpit/medidas';
import { linhasEmpresas } from '../cockpit/ui';

/**
 * Blocos do painel de Empresas. Os que vieram da antiga aba Empresas do painel geral foram mantidos, com uma regra nova: clicar
 * numa barra, faixa ou ponto abre as empresas daquele item, nunca o resumo genérico da regional. Regional, câmara, período e data
 * são filtros do alto da tela e valem para o painel inteiro, por isso não há mais gráficos repetidos por regional ou por 24 meses.
 */

export function Situacoes({ ctx, flow }: { ctx: CockpitCtx; flow: ReturnType<typeof complianceFlow> }) {
  const { tokens, model, scope } = ctx, ids = (name: string) => flow.nodes.find(node => node.name === name)?.companyIds ?? [];
  const registro = [{ name: 'Ativa', ids: ids('Registro vigente'), color: tokens.blue }, { name: 'Inativa (já registrada)', ids: ids('Só histórico'), color: tokens.heat[1] }, { name: 'Nunca registrada', ids: ids('Nunca registrada'), color: tokens.bad }];
  const pay = pagamento(model), pagamentoParts = [{ name: 'Em dia', ids: pay.emDia, color: tokens.good }, { name: 'Inadimplente', ids: pay.inadimplentes, color: tokens.warn }];
  const vistos = new Set(scope.registrations.filter(row => row.type === 'Visto' && row.status === 'Ativo').map(row => row.companyId)).size;
  const rosca = (parts: { name: string; ids: string[]; color: string }[], total: number, titulo: string) => ({
    tooltip: { trigger: 'item', formatter: (item: any) => `<b>${item.name}</b><br/>${int(item.value)} empresas · ${pct(item.percent)}<br/><span style="opacity:.75">clique para ver</span>` },
    title: { text: int(total), subtext: titulo, left: 'center', top: '33%', textStyle: { color: tokens.ink, fontSize: 19, fontWeight: 800, fontFamily: 'Raleway, Lato, sans-serif' }, subtextStyle: { color: tokens.muted, fontSize: 10.5 } },
    legend: { bottom: 0, left: 'center', itemWidth: 9, itemHeight: 9, itemGap: 8, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    series: [{ type: 'pie', radius: ['52%', '76%'], center: ['50%', '42%'], padAngle: 2, itemStyle: { borderRadius: 4, borderColor: tokens.surface, borderWidth: 2 }, label: { show: false },
      data: parts.map(part => ({ name: part.name, value: part.ids.length, itemStyle: { color: part.color } })) }],
  });
  const abrir = (parts: { name: string; ids: string[] }[], titulo: string) => (params: any) => { const part = parts[params.dataIndex]; if (part?.ids.length) ctx.open({ kind: 'empresas', title: `${titulo} · ${part.name.toLowerCase()}`, what: 'Empresas, contadas pela raiz do CNPJ, nesta situação na data escolhida.', ids: part.ids }); };
  return <div className="duo">
    <Chart option={rosca(registro, registro.reduce((sum, part) => sum + part.ids.length, 0), 'empresas de engenharia')} tokens={tokens} label="Empresas por situação do registro" onPick={abrir(registro, 'Situação do registro')} />
    <Chart option={rosca(pagamentoParts, pay.emDia.length + pay.inadimplentes.length, 'empresas registradas')} tokens={tokens} label="Empresas registradas por situação de pagamento" onPick={abrir(pagamentoParts, 'Situação de pagamento')} />
    <p className="duo-note">{int(vistos)} empresas têm visto ativo de outro CREA. Clique numa fatia para ver as empresas.</p>
  </div>;
}

export function EntradasSaidas({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, janela } = ctx, rows = useMemo(() => entradasSaidas(ctx.history, ctx.f), [ctx.history, ctx.f]);
  const option = useMemo(() => ({
    grid: { top: 30, right: 6, bottom: 2, left: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex], entradas = row.viaFiscalizacao.length + row.demais.length;
      return `<b>${mes(row.month)}</b><br/>Entradas: ${int(entradas)} (${int(row.viaFiscalizacao.length)} após fiscalização)<br/>Saídas: ${int(row.saidas.length)}<br/>Saldo: <b>${entradas - row.saidas.length >= 0 ? '+' : ''}${int(entradas - row.saidas.length)}</b><br/>Empresas registradas: ${int(row.base)}<br/><span style="opacity:.75">clique para ver as empresas</span>`; } },
    xAxis: { type: 'category', data: rows.map(row => mes(row.month)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, interval: 2, fontSize: 10 } },
    yAxis: [{ type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: (value: number) => int(Math.abs(value)) } },
      { type: 'value', scale: true, splitLine: { show: false }, axisLabel: { color: tokens.muted, formatter: (value: number) => value.toLocaleString('pt-BR', { notation: 'compact' }) } }],
    series: [
      { name: 'Entradas após fiscalização', type: 'bar', stack: 'mov', barWidth: '58%', data: rows.map(row => row.viaFiscalizacao.length), itemStyle: { color: tokens.accent },
        markArea: { silent: true, itemStyle: { color: tokens.blue, opacity: 0.07 }, data: [[{ xAxis: mes(janela.start.slice(0, 7)) }, { xAxis: mes(janela.end.slice(0, 7)) }]] } },
      { name: 'Demais entradas', type: 'bar', stack: 'mov', data: rows.map(row => row.demais.length), itemStyle: { color: tokens.blue, borderRadius: [3, 3, 0, 0] } },
      { name: 'Saídas', type: 'bar', stack: 'mov', data: rows.map(row => -row.saidas.length), itemStyle: { color: tokens.bad, borderRadius: [0, 0, 3, 3] } },
      { name: 'Empresas registradas', type: 'line', yAxisIndex: 1, data: rows.map(row => row.base), smooth: 0.3, symbol: 'none', lineStyle: { color: tokens.ink, width: 2 }, itemStyle: { color: tokens.ink } },
    ],
  }), [rows, tokens, janela]);
  return <Chart option={option} tokens={tokens} label="Entradas e saídas de empresas por mês" onPick={params => { const row = rows[params.dataIndex]; if (!row) return;
    const saidas = params.seriesName === 'Saídas', ids = saidas ? row.saidas : params.seriesName === 'Entradas após fiscalização' ? row.viaFiscalizacao : [...row.viaFiscalizacao, ...row.demais];
    if (ids.length) ctx.open({ kind: 'empresas', title: `${saidas ? 'Saídas' : 'Entradas'} em ${mes(row.month)}`, what: saidas ? 'Empresas cujo registro deixou de estar ativo no mês (baixa ou cancelamento).' : 'Empresas que passaram a ter registro ativo no mês.', ids }); }} />;
}

export function Funil({ ctx, flow }: { ctx: CockpitCtx; flow: ReturnType<typeof complianceFlow> }) {
  const { tokens } = ctx, total = flow.nodes[0]?.value || 1;
  const nomes: Record<string, string> = { 'Universo empresarial': 'Universo de engenharia', 'Registro vigente': 'Registro ativo', 'Só histórico': 'Registro inativo', 'Nunca registrada': 'Nunca registrada', 'Com RT': 'Com RT', 'RT não identificado': 'Sem RT identificado', 'Com ART no período': 'Com ART no período', 'Sem ART no período': 'Sem ART no período' };
  const cores: Record<string, string> = { 'Universo empresarial': tokens.brand, 'Registro vigente': tokens.blue, 'Só histórico': tokens.heat[1], 'Nunca registrada': tokens.bad, 'Com RT': tokens.good, 'RT não identificado': tokens.warn, 'Com ART no período': tokens.cat[4], 'Sem ART no período': tokens.muted };
  const option = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (item: any) => item.dataType === 'edge' ? `${nomes[item.data.source]} → ${nomes[item.data.target]}<br/><b>${int(item.data.value)}</b> empresas (${pct(item.data.value / total * 100)} do universo)` : `<b>${nomes[item.name]}</b><br/>${int(item.value)} empresas · ${pct(item.value / total * 100)}` },
    series: [{ type: 'sankey', nodeAlign: 'left', left: 4, right: 128, top: 6, bottom: 6, nodeWidth: 12, nodeGap: 10, draggable: false, emphasis: { focus: 'adjacency' },
      data: flow.nodes.map(node => ({ name: node.name, value: node.value, itemStyle: { color: cores[node.name] ?? tokens.blue, borderWidth: 0 } })), links: flow.links.map(link => ({ ...link })),
      lineStyle: { color: 'gradient', opacity: 0.28, curveness: 0.5 },
      label: { color: tokens.ink, fontSize: 10.5, formatter: (item: any) => `{n|${nomes[item.name] ?? item.name}}\n{v|${int(item.value)} · ${pct(item.value / total * 100)}}`, rich: { n: { fontWeight: 700, color: tokens.ink, fontSize: 10.5 }, v: { color: tokens.muted, fontSize: 10 } } } }],
  }), [flow, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Funil de conformidade das empresas" onPick={item => { const ids = item.dataType === 'edge' ? item.data.companyIds : flow.nodes.find(node => node.name === item.name)?.companyIds;
    if (ids?.length) ctx.open({ kind: 'empresas', title: item.dataType === 'edge' ? `${nomes[item.data.source]} → ${nomes[item.data.target]}` : nomes[item.name], what: 'Empresas (CNPJ raiz) nesta etapa do funil de conformidade.', ids }); }} />;
}

export function CamaraPorte({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => camaraPorte(ctx.dataset, ctx.model), [ctx.dataset, ctx.model]), cores = [tokens.heat[1], tokens.blue, tokens.brand, tokens.accent];
  const option = useMemo(() => ({
    grid: { top: 26, right: 30, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => row.camara), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: (rows[0]?.portes ?? []).map((item, index) => ({ name: item.porte.replace(' empresa', ''), type: 'bar', stack: 'p', barWidth: 16, data: rows.map(row => row.portes[index].ids.length), itemStyle: { color: cores[index], borderColor: tokens.surface, borderWidth: 1 },
      label: index === 3 ? { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (params: any) => int(rows[params.dataIndex].portes.reduce((sum, part) => sum + part.ids.length, 0)) } : undefined })),
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Empresas registradas por câmara e porte" onPick={params => { const row = rows[params.dataIndex], part = row?.portes[params.seriesIndex];
    if (part?.ids.length) ctx.open({ kind: 'empresas', title: `${row.camara}, ${part.porte.toLowerCase()}`, what: 'Empresas registradas desta câmara (atividade principal) e porte.', ids: part.ids }); }} />;
}

export function Contagens({ ctx }: { ctx: CockpitCtx }) {
  const c = ctx.norte.contagens;
  const itens: [string, number, string][] = [['Empresas (raiz CNPJ)', c.raizes, 'com ao menos um registro ou visto vigente'], ['Estabelecimentos (CNPJ completo)', c.estabelecimentos, 'com registro ou visto vigente'], ['Registros e vistos vigentes', c.registros, `${int(c.vistos)} vistos de outro CREA`]];
  return <div className="tres">
    {itens.map(([label, value, note]) => <div key={label} className="tres-item"><span>{label}</span><strong>{int(value)}</strong><small>{note}</small></div>)}
    <p className="duo-note">{int(c.raizesHistorico)} empresas já tiveram registro e hoje não têm nenhum. Contagem na data de {data(ctx.dataset.snapshotDate)}.</p>
  </div>;
}

export function Conciliacao({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, c = ctx.norte.cobertura, cores = [tokens.blue, tokens.heat[1], tokens.warn];
  const option = useMemo(() => ({
    grid: { top: 26, right: 40, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const classe = classesCnae[items[0].dataIndex], total = correspondencias.reduce((sum, nome) => sum + c.porClasse[classe][nome].length, 0);
      return `<b>“${classe}”</b> · ${int(total)} CNPJs<br/>${items.map(item => `${item.marker}${item.seriesName}: ${int(item.value)} (${pct(item.value / Math.max(1, total) * 100)})`).join('<br/>')}`; } },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
    yAxis: { type: 'category', inverse: true, data: classesCnae.map(row => `“${row}”`), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: correspondencias.map((nome, index) => ({ name: nome, type: 'bar', stack: 'c', barWidth: 22, data: classesCnae.map(classe => c.porClasse[classe][nome].length), itemStyle: { color: cores[index], borderColor: tokens.surface, borderWidth: 1 },
      label: index === correspondencias.length - 1 ? { show: true, position: 'right', color: tokens.ink, fontSize: 10.5, formatter: (params: any) => { const classe = classesCnae[params.dataIndex]; const taxa = classe === 'Sim' ? c.taxaSim : c.taxaPassivel; return taxa === null ? '' : pct(taxa, 1); } } : undefined })),
  }), [c, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="stack">
    <p className="kpi-line"><b>{c.taxa === null ? '—' : pct(c.taxa, 1)}</b> dos {int(c.total)} estabelecimentos estão no cadastro. Nas atividades de registro obrigatório a cobertura é de <b>{c.taxaSim === null ? '—' : pct(c.taxaSim, 1)}</b>; nas que dependem de análise, <b>{c.taxaPassivel === null ? '—' : pct(c.taxaPassivel, 1)}</b>. Receita e cadastro comparados em {data(c.competenciaReceita)}.</p>
    <Chart option={option} tokens={tokens} label="Conciliação dos CNPJs com CNAE da lista com o cadastro do Crea-SP" onPick={params => { const classe = classesCnae[params.dataIndex], nome = correspondencias[params.seriesIndex]; const ids = classe && nome ? c.porClasse[classe][nome] : [];
      if (ids.length) ctx.open({ kind: 'cnpjs', title: `“${classe}” · ${nome.toLowerCase()}`, what: 'CNPJs completos ativos na Receita com CNAE da lista do Crea-SP nesta classe e correspondência.', use: nome === 'Sem correspondência' ? 'Sem correspondência não quer dizer irregular. Confirmar atividade antes de orientar ou notificar.' : undefined, ids }); }} />
  </div>;
}

export function CoberturaGre({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => [...ctx.norte.cobertura.porGre].sort((a, b) => (a.taxaSim ?? 0) - (b.taxaSim ?? 0)), [ctx.norte]), cores = [tokens.blue, tokens.heat[1], tokens.warn];
  const short = (name: string) => name.split('·')[1]?.trim() ?? name;
  const option = useMemo(() => ({
    grid: { top: 24, right: 36, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: tokens.muted, fontSize: 10 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', max: 100, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: '{value}%' } },
    yAxis: { type: 'category', data: rows.map(row => short(row.name)), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10 } },
    series: correspondencias.map((nome, index) => ({ name: nome, type: 'bar', stack: 'g', barWidth: 10, data: rows.map(row => { const total = correspondencias.reduce((sum, item) => sum + row.sim[item].length, 0); return total ? Math.round(row.sim[nome].length / total * 1000) / 10 : 0; }),
      itemStyle: { color: cores[index] }, label: index === 0 ? { show: true, position: 'insideLeft', color: '#FFFFFF', fontSize: 9.5, formatter: (params: any) => params.value >= 12 ? `${params.value.toLocaleString('pt-BR')}%` : '' } : undefined })),
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Cobertura dos CNPJs “Sim” por regional" onPick={params => { const row = rows[params.dataIndex], nome = correspondencias[params.seriesIndex]; const ids = row && nome ? row.sim[nome] : [];
    if (ids.length) ctx.open({ kind: 'cnpjs', title: `${short(row.name)}: ${nome.toLowerCase()}`, what: 'Estabelecimentos ativos na Receita desta regional com atividade de registro obrigatório (“Sim”) nesta situação no cadastro do Crea-SP.', use: nome === 'Sem correspondência' ? 'Não estar no cadastro não quer dizer irregular. Confirme a atividade antes de orientar ou notificar.' : undefined, ids }); }} />;
}

export function ArtModalidade({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => artPorModalidade(ctx.arts.atual), [ctx.arts]);
  const option = useMemo(() => ({
    grid: { top: 4, right: 128, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.modalidade}</b><br/>${int(row.quantidade)} ARTs · ${brl(row.valor)} declarados<br/>${int(row.ids.length)} empresas`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.modalidade), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [{ type: 'bar', barWidth: 14, data: rows.map(row => row.quantidade), itemStyle: { color: tokens.blue, borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (params: any) => `${int(params.value)} · ${brl(rows[params.dataIndex].valor)}` } }],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="ARTs de empresas por modalidade" onPick={params => { const row = rows[params.dataIndex]; if (row) ctx.open({ kind: 'empresas', title: `ARTs de ${row.modalidade.toLowerCase()}`, what: 'Empresas com ART desta modalidade no período.', ids: row.ids }); }} />;
}

export function SemArt({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => artPorCamara(ctx.dataset, ctx.model), [ctx.dataset, ctx.model]);
  const option = useMemo(() => ({
    grid: { top: 8, right: 70, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.camara}</b><br/>${int(row.semArt.length)} de ${int(row.ativas.length)} empresas registradas sem ART no período`; } },
    xAxis: { type: 'value', max: 100, show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.camara), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [{ type: 'bar', barWidth: 16, data: rows.map(row => row.semArt.length / row.ativas.length * 100), itemStyle: { color: tokens.warn, borderRadius: [0, 4, 4, 0] }, showBackground: true, backgroundStyle: { color: tokens.soft, borderRadius: 4 },
      label: { show: true, position: 'right', color: tokens.ink, fontSize: 10.5, formatter: (params: any) => `${pct(params.value)} · ${int(rows[params.dataIndex].semArt.length)}` } }],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Empresas registradas sem ART no período por câmara" onPick={params => { const row = rows[params.dataIndex]; if (row?.semArt.length) ctx.open({ kind: 'empresas', title: `${row.camara} · registradas sem ART no período`, what: 'Empresas com registro ativo sem nenhuma ART registrada no período.', use: 'Verifique se a empresa está em atividade; se estiver, oriente sobre a obrigação de ART (Lei 6.496/77).', ids: row.semArt }); }} />;
}

export function RedeSocietaria({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.frentes.sociedades, grupos = useMemo(() => q.grupos.slice().sort((a, b) => b.empresas.length - a.empresas.length || a.id.localeCompare(b.id)).slice(0, 10), [q]);
  const option = useMemo(() => ({
    grid: { top: 6, right: 40, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = grupos[items[0].dataIndex]; return `<b>Grupo ${row.id}</b><br/>${int(row.empresas.length)} empresas do universo, ${int(row.registradas)} registradas<br/>${int(row.externos)} sócios PJ de fora (${int(row.externosEngenharia)} com CNAE da lista)`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: grupos.map(row => `Grupo ${row.id}`), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: [
      { type: 'bar', name: 'Registradas', stack: 'g', barWidth: 12, data: grupos.map(row => row.registradas), itemStyle: { color: tokens.good } },
      { type: 'bar', name: 'Sem registro vigente', stack: 'g', data: grupos.map(row => row.empresas.length - row.registradas), itemStyle: { color: tokens.warn, borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (params: any) => int(grupos[params.dataIndex].empresas.length) } },
    ],
  }), [grupos, tokens]);
  return <div className="split">
    <div className="stack">
      <p className="kpi-line"><b>{int(q.empresasComSocioPj.length)}</b> empresas têm outra empresa como sócia. Desses sócios, <b>{int(q.sociosInternos)}</b> também têm atividade de engenharia e <b>{int(q.sociosExternos)}</b> não têm. Há <b>{int(q.gruposMultiplos)}</b> grupos com duas ou mais empresas; o maior reúne {int(q.maiorGrupo)}.</p>
      <Chart option={option} tokens={tokens} label="Maiores grupos societários por número de empresas" onPick={params => { const row = grupos[params.dataIndex]; if (row) ctx.open({ kind: 'empresas', title: `Grupo societário ${row.id}`, what: 'Empresas com atividade de engenharia ligadas entre si porque uma é sócia da outra, segundo o quadro de sócios publicado pela Receita.', use: 'Contexto: a ligação é societária, não técnica. Ver o registro e o RT de cada empresa antes de qualquer leitura.', ids: row.empresas }); }} />
    </div>
    <ul className="side-list" aria-label="Sócios PJ de engenharia">
      <li><button onClick={() => q.investidasRegistradasComSocioEngenhariaSemRegistro.length && ctx.open({ kind: 'empresas', title: 'Registradas com sócio PJ de engenharia sem registro', what: 'Empresas registradas que têm como sócia outra empresa com atividade da lista do Crea-SP, mas sem registro encontrado.', use: 'Contexto para a malha fina (regra sócio PJ): o sócio pode não exercer a atividade.', ids: q.investidasRegistradasComSocioEngenhariaSemRegistro })}><i style={{ background: tokens.warn }} /><span>Registradas com sócio PJ de engenharia sem registro</span><b>{int(q.investidasRegistradasComSocioEngenhariaSemRegistro.length)}</b></button></li>
      <li><button disabled><i style={{ background: tokens.muted }} /><span>Sócios PJ de fora com CNAE da lista</span><b>{int(q.externosEngenharia.length)}</b></button></li>
      <li className="side-note">Os sócios vêm do quadro societário que a Receita publica todo mês. Os sócios pessoas físicas estão no bloco ao lado.</li>
    </ul>
  </div>;
}

export function Instalacoes({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.frentes.instalacoes, gres = useMemo(() => new Map(ctx.dataset.gres.map(row => [row.id, short(row.name)])), [ctx.dataset]);
  const rows = useMemo(() => q.porGre.slice().sort((a, b) => b.n - a.n), [q]), cores: Record<FonteInstalacao, string> = { ANEEL: tokens.accent, ANP: tokens.blue, ANM: tokens.heat[1], BNDES: tokens.brand };
  const option = useMemo(() => ({
    grid: { top: 24, right: 8, bottom: 2, left: 2, containLabel: true }, legend: { top: 0, left: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: rows.map(row => gres.get(row.greId) ?? row.greId), axisLabel: { color: tokens.muted, fontSize: 10, interval: 0, rotate: 30 }, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    series: fontesInstalacao.map(fonte => ({ type: 'bar', name: fonte, stack: 'f', barWidth: 16, data: rows.map(row => row.porFonte[fonte]), itemStyle: { color: cores[fonte] } })),
  }), [rows, gres, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="split is-wide">
    <div className="stack">
      <p className="kpi-line"><b>{int(q.instalacoes.length)}</b> instalações e operações têm uma empresa responsável identificada pelo CNPJ. Nos últimos 12 meses surgiram <b>{int(q.novas12)}</b> novas ({q.novasAntes ? `${q.novas12 >= q.novasAntes ? '+' : ''}${pct((q.novas12 - q.novasAntes) / q.novasAntes * 100)} em relação aos 12 meses anteriores` : 'sem período anterior para comparar'}).</p>
      <Chart option={option} tokens={tokens} label="Instalações e investimentos por regional e fonte" onPick={params => { const row = rows[params.dataIndex], fonte = fontesInstalacao[params.seriesIndex]; if (!row || !fonte) return;
        const lista = q.instalacoes.filter(item => item.greId === row.greId && item.fonte === fonte);
        if (lista.length) ctx.open({ kind: 'linhas', title: `${fonte} em ${gres.get(row.greId) ?? row.greId}`, what: 'Instalações, processos ou financiamentos desta fonte na regional, com a empresa responsável identificada pelo CNPJ.', use: 'A empresa é operadora, titular ou financiada. Isso não faz dela a projetista, a instaladora nem a responsável técnica.', listTitle: 'Agentes, maior valor primeiro',
          rows: lista.map(item => ({ key: item.id, companyId: item.companyId ?? undefined, title: item.agenteNome, subtitle: `${item.agenteCnpj} · ${item.tipo}`, value: fonte === 'BNDES' ? brl(item.valor) : `${item.valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${item.unidade}`, note: item.companyId ? 'empresa com atividade de engenharia' : 'CNPJ fora da lista do Crea-SP', sortValue: item.valor })) }); }} />
    </div>
    <ul className="side-list" aria-label="Por fonte">
      {q.porFonte.map(row => <li key={row.fonte}><button disabled><i style={{ background: cores[row.fonte] }} /><span>{row.fonte} · {int(row.n)} registros<br /><small>{int(row.agentesNoUniverso)} agentes no universo, {int(row.agentesRegistrados)} registrados</small></span><b>{row.fonte === 'BNDES' ? brl(row.valor) : `${row.valor.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })} ${row.unidade}`}</b></button></li>)}
      <li className="side-note">A empresa aparece como operadora, titular ou financiada, pelo CNPJ exato. Isso não prova que ela fez o projeto, a instalação ou tenha RT.</li>
    </ul>
  </div>;
}

export function Dinamica({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, a = ctx.mercado.aberturas, coortes = ctx.mercado.permanencia;
  const option = useMemo(() => ({
    grid: { top: 24, right: 8, bottom: 2, left: 2, containLabel: true }, legend: { top: 0, left: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = a.meses[items[0].dataIndex]; return `<b>${mes(row.month)}</b><br/>${int(row.aberturas)} estabelecimentos abertos com CNAE da lista<br/>${int(row.comRegistro)} já com registro ou visto na data escolhida`; } },
    xAxis: { type: 'category', data: a.meses.map(row => mes(row.month)), axisLabel: { color: tokens.muted, fontSize: 10, interval: 2 }, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    series: [
      { type: 'bar', name: 'Já registrados', stack: 'a', barWidth: 10, data: a.meses.map(row => row.comRegistro), itemStyle: { color: tokens.good } },
      { type: 'bar', name: 'Sem registro na data escolhida', stack: 'a', data: a.meses.map(row => row.aberturas - row.comRegistro), itemStyle: { color: tokens.soft, borderColor: tokens.line, borderWidth: 1 } },
    ],
  }), [a, tokens]);
  return <div className="split is-wide">
    <div className="stack">
      <p className="kpi-line"><b>{int(a.total)}</b> estabelecimentos com atividade de engenharia foram abertos nos últimos 24 meses, e <b>{int(a.comRegistro)}</b> deles já se registraram ({a.total ? pct(a.comRegistro / a.total * 100) : '—'}). Outros <b>{int(a.foraDeAtividade)}</b> já aparecem na Receita como baixados, inaptos ou suspensos.</p>
      <Chart option={option} tokens={tokens} label="Estabelecimentos abertos na Receita por mês e situação no cadastro" onPick={() => a.ids.length && ctx.open({ kind: 'cnpjs', title: 'Abertos na Receita em 24 meses', what: 'Estabelecimentos com CNAE da lista do Crea-SP abertos nos últimos 24 meses antes da data de referência (data de abertura da Receita).', use: 'Aberturas são mercado novo; a correspondência no cadastro é uma decomposição, não um filtro. Sem registro não quer dizer irregular.', ids: a.ids })} />
    </div>
    <ul className="side-list" aria-label="Permanência das coortes">
      {coortes.map(row => <li key={row.mesesAtras}><button onClick={() => row.saidas.length && ctx.open({ kind: 'empresas', title: `Saíram da base em ${row.mesesAtras} meses`, what: `Empresas com registro ou visto vigente em ${data(row.d0)} e sem registro vigente na data de referência.`, use: 'Perda de vínculo institucional; cadastro vigente não prova atividade e a saída não tem causa atribuída.', ids: row.saidas })}><i style={{ background: row.taxa !== null && row.taxa >= 90 ? tokens.good : tokens.warn }} /><span>Coorte de {row.mesesAtras} meses ({data(row.d0)})<br /><small>{int(row.permanecem.length)} de {int(row.coorte.length)} permanecem · {int(row.saidas.length)} saíram</small></span><b>{row.taxa === null ? '—' : pct(row.taxa, 1)}</b></button></li>)}
      <li className="side-note">Cada linha acompanha as empresas que estavam registradas naquela data; quem entrou depois não conta. As aberturas vêm do arquivo mensal da Receita, que chega com algumas semanas de atraso.</li>
    </ul>
  </div>;
}

export function SociosPf({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.parcerias.sociosPf;
  const option = useMemo(() => ({
    grid: { top: 24, right: 40, bottom: 2, left: 2, containLabel: true }, legend: { top: 0, left: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: q.porQualificacao.map(row => row.qualificacao), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: [
      { type: 'bar', name: 'Profissionais do sistema Confea/Crea', stack: 'q', barWidth: 14, data: q.porQualificacao.map(row => row.profissionais), itemStyle: { color: tokens.blue } },
      { type: 'bar', name: 'Demais sócios PF', stack: 'q', data: q.porQualificacao.map(row => row.n - row.profissionais), itemStyle: { color: tokens.soft, borderColor: tokens.line, borderWidth: 1, borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (params: any) => int(q.porQualificacao[params.dataIndex].n) } },
    ],
  }), [q, tokens]);
  const abrir = (titulo: string, ids: string[], what: string, use: string) => ids.length && ctx.open({ kind: 'empresas', title: titulo, what, use, ids, eyebrow: 'Contexto que depende de acordo com a Receita (CPF completo dos sócios)' });
  return <div className="split">
    <div className="stack">
      <p className="kpi-line"><b>{int(q.empresasComSocioPf.length)}</b> empresas têm sócio pessoa física identificado. Entre esses sócios, <b>{int(q.sociosProfissionais.length)}</b> são profissionais registrados no sistema Confea/Crea ({int(q.sociosProfissionaisAtivos)} com registro ativo), e <b>{int(q.socioEhRt.length)}</b> são o próprio responsável técnico da empresa.</p>
      <Chart option={option} tokens={tokens} label="Sócios pessoa física por qualificação e presença no cadastro profissional" />
    </div>
    <ul className="side-list" aria-label="Leituras do quadro societário">
      <li><button onClick={() => abrir('Registradas sem RT com sócio profissional ativo', q.registradasSemRtComSocioProfissional, 'Empresas registradas sem vínculo de RT vigente cujo sócio é profissional com registro ativo.', 'Orientar a anotação do RT: o sócio pode ser o responsável natural. Sociedade não é vínculo de responsabilidade.')}><i style={{ background: tokens.accent }} /><span>Registradas sem RT com sócio profissional ativo</span><b>{int(q.registradasSemRtComSocioProfissional.length)}</b></button></li>
      <li><button onClick={() => abrir('Registradas com sócio profissional inativo', q.registradasComSocioProfissionalInativo, 'Empresas registradas cujo sócio profissional está com registro cancelado ou interrompido na data de referência.', 'Contexto para o relacionamento com o profissional; nada a notificar à empresa por isso.')}><i style={{ background: tokens.muted }} /><span>Registradas com sócio profissional cancelado ou interrompido</span><b>{int(q.registradasComSocioProfissionalInativo.length)}</b></button></li>
      <li><button disabled><i style={{ background: tokens.blue }} /><span>Sócio profissional é RT da própria empresa</span><b>{int(q.socioEhRt.length)}</b></button></li>
      <li className="side-note">Este bloco depende de um acordo com a Receita Federal, porque o quadro de sócios público mascara o CPF. As alterações do contrato social, que vêm da Junta Comercial, estão no fim desta página. Os números são demonstrativos.</li>
    </ul>
  </div>;
}

export function Vinculos({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.parcerias.vinculos, rows = q.porFaixa;
  const option = useMemo(() => ({
    grid: { top: 24, right: 8, bottom: 2, left: 2, containLabel: true }, legend: { top: 0, left: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: faixasVinculos.map(faixa => `${faixa} técnico${faixa === 'nenhum' ? '' : 's'}`), axisLabel: { color: tokens.muted, fontSize: 10, interval: 0 }, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    series: [
      { type: 'bar', name: 'Registradas', stack: 'v', barWidth: 22, data: rows.map(row => row.registradas), itemStyle: { color: tokens.good } },
      { type: 'bar', name: 'Sem registro (universo)', stack: 'v', data: rows.map(row => row.semRegistro), itemStyle: { color: tokens.warn, borderRadius: [3, 3, 0, 0] } },
    ],
  }), [rows, tokens]);
  const abrir = (titulo: string, ids: string[], what: string, use: string) => ids.length && ctx.open({ kind: 'linhas', eyebrow: 'Contexto que depende de acordo com o Ministério do Trabalho', title: titulo, what, use, listTitle: 'Empresas, mais vínculos técnicos primeiro', rows: linhasEmpresas(ctx, ids, id => { const row = q.empresas.find(item => item.companyId === id)!; return { value: `${int(row.vinculosTecnicos)} técnico${row.vinculosTecnicos === 1 ? '' : 's'}`, note: `${int(row.vinculosTotal)} vínculos no total`, sort: row.vinculosTecnicos }; }) });
  return <div className="split">
    <div className="stack">
      <p className="kpi-line"><b>{int(q.vinculosTecnicos)}</b> empregados em ocupações de engenharia trabalham em <b>{int(q.comTecnicos.length)}</b> empresas. Essas empresas têm {int(q.vinculosTotal)} empregados ao todo.</p>
      <Chart option={option} tokens={tokens} label="Empresas por faixa de vínculos técnicos e situação do registro" />
    </div>
    <ul className="side-list" aria-label="Leituras dos vínculos">
      <li><button onClick={() => abrir('Registradas com empregados técnicos e sem RT vigente', q.registradasSemRt, 'Empresas registradas com ao menos um vínculo CLT em CBO de engenharia e nenhum responsável técnico vigente na data de referência.', 'Conferir se há atividade técnica e orientar a anotação do RT. Empregado em CBO técnico não é RT.')}><i style={{ background: tokens.accent }} /><span>Registradas com técnicos e sem RT vigente</span><b>{int(q.registradasSemRt.length)}</b></button></li>
      <li><button onClick={() => abrir('Universo sem registro com empregados técnicos', q.semRegistroComTecnicos, 'Estabelecimentos com CNAE da lista, sem registro vigente, com vínculos em CBO de engenharia.', 'Prioriza a análise do CNAE sem registro; o vínculo não prova atividade privativa.')}><i style={{ background: tokens.warn }} /><span>Universo sem registro com técnicos</span><b>{int(q.semRegistroComTecnicos.length)}</b></button></li>
      <li className="side-note">Depende de acordo com o Ministério do Trabalho (RAIS identificada ou eSocial). O painel usa só contagens por empresa e ocupação, sem nenhum salário individual. Os números são demonstrativos.</li>
    </ul>
  </div>;
}

/* ---------- Painel de Empresas · visuais novos ---------- */
const coresMercado = (tokens: CockpitCtx['tokens']): Record<SegmentoMercado, string> => ({ 'Registro ativo, em dia': tokens.blue, 'Registro ativo, inadimplente': tokens.heat[1], 'Sem registro, com ação': tokens.warn, 'Sem registro, sem ação': tokens.bad });
const nomesMercado: Record<SegmentoMercado, string> = { 'Registro ativo, em dia': 'Registradas e em dia', 'Registro ativo, inadimplente': 'Registradas com anuidade atrasada', 'Sem registro, com ação': 'Sem registro, já procuradas pela fiscalização', 'Sem registro, sem ação': 'Sem registro e sem ação' };

/** Mercado de cada câmara em barras deitadas: o comprimento é o número de estabelecimentos, e as cores dizem quanto está registrado. Substitui o gráfico de colunas de larguras diferentes. */
export function MercadoCamara({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => mercadoPorCamara(ctx.scope, ctx.model, ctx.f), [ctx.scope, ctx.model, ctx.f]), cores = coresMercado(tokens);
  const registrados = (row: typeof rows[number]) => row.partes['Registro ativo, em dia'].length + row.partes['Registro ativo, inadimplente'].length;
  const option = useMemo(() => ({
    grid: { top: 30, right: 74, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 9, itemHeight: 9, itemGap: 10, textStyle: { color: tokens.muted, fontSize: 10 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex];
      return `<b>${row.camara}</b>: ${int(row.total)} estabelecimentos<br/>${items.map(item => `${item.marker}${item.seriesName}: ${int(item.value)} (${pct(item.value / Math.max(1, row.total) * 100)})`).join('<br/>')}<br/><span style="opacity:.75">clique numa faixa para ver os CNPJs</span>`; } },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => row.camara), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: segmentosMercado.map((segmento, index) => ({ name: nomesMercado[segmento], type: 'bar', stack: 'm', barWidth: 16, data: rows.map(row => row.partes[segmento].length), itemStyle: { color: cores[segmento], borderColor: tokens.surface, borderWidth: 1 },
      label: index === segmentosMercado.length - 1 ? { show: true, position: 'right', color: tokens.ink, fontSize: 10.5, formatter: (params: any) => { const row = rows[params.dataIndex]; return `${pct(registrados(row) / Math.max(1, row.total) * 100)} registrado`; } } : undefined })),
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Estabelecimentos com atividade de engenharia por câmara e situação no cadastro" onPick={params => { const row = rows[params.dataIndex], segmento = segmentosMercado[params.seriesIndex]; const ids = row && segmento ? row.partes[segmento] : [];
    if (ids.length) ctx.open({ kind: 'cnpjs', title: `${row.camara}: ${nomesMercado[segmento].toLowerCase()}`, what: 'Estabelecimentos ativos na Receita com atividade da lista do Crea-SP desta câmara, nesta situação na data escolhida.', use: segmento.startsWith('Sem registro') ? 'Não estar no cadastro não quer dizer irregular. Confirme a atividade antes de orientar ou notificar.' : undefined, ids, segmento }); }} />;
}

/** As atividades (CNAE) com mais estabelecimentos sem registro, com a parte já registrada de cada uma. */
export function CnaeMercado({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => cnaesDoMercado(ctx.scope, ctx.model, 12), [ctx.scope, ctx.model]);
  const nome = (row: LinhaCnae) => { const texto = `${row.code} ${row.label}`; return texto.length > 46 ? `${texto.slice(0, 45)}…` : texto; };
  const option = useMemo(() => ({
    grid: { top: 26, right: 52, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: tokens.muted, fontSize: 10 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex];
      return `<b>${row.code}</b> ${row.label}<br/>Registro ${row.classe === 'Sim' ? 'obrigatório' : 'depende de análise'}<br/>${int(row.total)} estabelecimentos, ${int(row.registrados.length)} registrados (${row.cobertura === null ? '—' : pct(row.cobertura)})<br/>${int(row.semRegistro.length)} sem registro`; } },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: { type: 'category', inverse: true, data: rows.map(nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10 } },
    series: [
      { name: 'Sem registro', type: 'bar', stack: 'c', barWidth: 13, data: rows.map(row => row.semRegistro.length), itemStyle: { color: tokens.bad } },
      { name: 'Registrados', type: 'bar', stack: 'c', data: rows.map(row => row.registrados.length), itemStyle: { color: tokens.blue, borderRadius: [0, 3, 3, 0] },
        label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (params: any) => { const row = rows[params.dataIndex]; return row.cobertura === null ? '' : pct(row.cobertura); } } },
    ],
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Atividades com mais estabelecimentos sem registro" onPick={params => { const row = rows[params.dataIndex]; if (!row) return; const sem = params.seriesIndex === 0, ids = sem ? row.semRegistro : row.registrados;
    if (ids.length) ctx.open({ kind: 'cnpjs', title: `${row.code}: ${sem ? 'sem registro' : 'registrados'}`, what: `Estabelecimentos ativos na Receita cuja atividade da lista do Crea-SP é ${row.code} (${row.label}).`, use: sem ? 'Não estar no cadastro não quer dizer irregular. Confirme a atividade antes de orientar ou notificar.' : undefined, ids }); }} />;
}

/** Faixas de barras simples, usadas por antiguidade do registro e por capital social. */
function Faixas({ ctx, faixas, label, titulo, what, cor }: { ctx: CockpitCtx; faixas: { nome: string; ids: string[] }[]; label: string; titulo: string; what: string; cor: string }) {
  const { tokens } = ctx, total = Math.max(1, faixas.reduce((soma, row) => soma + row.ids.length, 0));
  const option = useMemo(() => ({
    grid: { top: 18, right: 6, bottom: 2, left: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>${items[0].name}</b><br/>${int(items[0].value)} empresas (${pct(items[0].value / total * 100)})` },
    xAxis: { type: 'category', data: faixas.map(row => row.nome), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10, interval: 0, width: 80, overflow: 'break' } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    series: [{ type: 'bar', barWidth: '58%', data: faixas.map(row => row.ids.length), itemStyle: { color: cor, borderRadius: [4, 4, 0, 0] }, label: { show: true, position: 'top', color: tokens.ink, fontSize: 10, formatter: (params: any) => int(params.value) } }],
  }), [faixas, tokens, cor, total]);
  return <Chart option={option} tokens={tokens} label={label} onPick={params => { const row = faixas[params.dataIndex]; if (row?.ids.length) ctx.open({ kind: 'empresas', title: `${titulo}: ${row.nome}`, what, ids: row.ids }); }} />;
}
export function Antiguidade({ ctx }: { ctx: CockpitCtx }) {
  const a = useMemo(() => antiguidadeRegistro(ctx.scope, ctx.model), [ctx.scope, ctx.model]);
  return <div className="stack">
    <p className="kpi-line">Metade das empresas registradas está no Crea-SP há mais de <b>{a.mediana === null ? '—' : `${a.mediana.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} anos`}</b>.</p>
    <Faixas ctx={ctx} faixas={a.faixas} cor={ctx.tokens.blue} label="Empresas registradas pelo tempo desde o primeiro registro" titulo="Registradas há" what="Empresas com registro ativo na data escolhida, pelo tempo desde o primeiro registro no Crea-SP." />
  </div>;
}
export function Capital({ ctx }: { ctx: CockpitCtx }) {
  const faixas = useMemo(() => porCapital(ctx.scope, ctx.model), [ctx.scope, ctx.model]);
  return <Faixas ctx={ctx} faixas={faixas} cor={ctx.tokens.brand} label="Empresas registradas por faixa de capital social" titulo="Capital social" what="Empresas com registro ativo na data escolhida, pela faixa do capital social declarado à Receita Federal." />;
}

/** Economia, empresas abertas e registros: cinco séries com o primeiro mês igual a 100, para comparar o ritmo de cada uma. */
const seriesRitmo = [
  { key: 'emprego', nome: 'Emprego formal em engenharia', fonte: 'Novo CAGED e RAIS', parceria: false },
  { key: 'pib', nome: 'PIB dos municípios', fonte: 'IBGE, anual', parceria: false },
  { key: 'credito', nome: 'Crédito a empresas de engenharia (!)', fonte: 'Banco Central, depende de acordo', parceria: true },
  { key: 'aberturas12', nome: 'Empresas de engenharia abertas na Receita', fonte: 'soma de 12 meses', parceria: false },
  { key: 'registros12', nome: 'Empresas que se registraram no Crea-SP', fonte: 'soma de 12 meses', parceria: false },
] as const;
export const useRitmo = (ctx: CockpitCtx) => useMemo(() => ritmoEconomico(ctx.dataset, ctx.greId, ctx.camara ? ctx.scope.companyIds : null, 24), [ctx.dataset, ctx.greId, ctx.camara, ctx.scope]);
export function Ritmo({ ctx, r }: { ctx: CockpitCtx; r: ReturnType<typeof ritmoEconomico> }) {
  const { tokens } = ctx;
  const cores: Record<typeof seriesRitmo[number]['key'], string> = { emprego: tokens.muted, pib: tokens.heat[1], credito: tokens.warn, aberturas12: tokens.blue, registros12: tokens.accent };
  const option = useMemo(() => ({
    grid: { top: 34, right: 12, bottom: 2, left: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 14, itemHeight: 8, itemGap: 12, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', formatter: (items: any[]) => { const ponto = r.pontos[items[0].dataIndex];
      const valor = (key: string) => key === 'pib' || key === 'credito' ? brl((ponto as any)[key]) : `${int((ponto as any)[key])}${key === 'emprego' ? ' empregados' : ''}`;
      return `<b>${mes(ponto.month)}</b><br/>${items.map(item => { const s = seriesRitmo[item.seriesIndex]; return `${item.marker}${s.nome}: <b>${item.value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</b> <span style="opacity:.75">(${valor(s.key)}, ${s.fonte})</span>`; }).join('<br/>')}`; } },
    xAxis: { type: 'category', data: r.pontos.map(row => mes(row.month)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10, interval: 2 } },
    yAxis: { type: 'value', scale: true, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    series: seriesRitmo.map(s => ({ name: s.nome, type: 'line', data: r.indice[s.key], smooth: 0.25, symbol: 'none', step: s.key === 'pib' ? 'end' : undefined,
      lineStyle: { color: cores[s.key], width: s.key === 'registros12' || s.key === 'aberturas12' ? 2.8 : 1.6, type: s.parceria ? 'dashed' : s.key === 'pib' ? 'dotted' : 'solid' }, itemStyle: { color: cores[s.key] },
      markLine: s.key === 'emprego' ? { silent: true, symbol: 'none', lineStyle: { color: tokens.line, type: 'solid' }, label: { show: false }, data: [{ yAxis: 100 }] } : undefined })),
  }), [r, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  const v = r.variacao, sinal = (value: number | null) => value === null ? '—' : `${value >= 0 ? '+' : ''}${pct(value)}`;
  return <div className="split is-wide">
    <Chart option={option} tokens={tokens} label="Economia, empresas de engenharia abertas e registros no Crea-SP, com o primeiro mês igual a 100" onPick={params => { const ponto = r.pontos[params.dataIndex]; if (!ponto) return;
      const fim = `${ponto.month}-31`, inicio = `${Number(ponto.month.slice(0, 4)) - 1}${ponto.month.slice(4)}-31`, primeira = new Map<string, string>();
      for (const row of ctx.dataset.registrations) { const atual = primeira.get(row.companyId); if (!atual || row.startedAt < atual) primeira.set(row.companyId, row.startedAt); }
      const novas = [...primeira].filter(([id, data]) => data > inicio && data <= fim && ctx.scope.companyIds.has(id)).map(([id]) => id);
      if (novas.length) ctx.open({ kind: 'empresas', title: `Empresas que se registraram nos 12 meses até ${mes(ponto.month)}`, what: 'Empresas que fizeram o primeiro registro no Crea-SP nos 12 meses que terminam no mês escolhido.', ids: novas }); }} />
    <ul className="side-list" aria-label="Variação em 24 meses">
      <li className="side-head">Variação nos últimos 24 meses</li>
      {seriesRitmo.map(s => <li key={s.key}><span className="side-serie"><i style={{ background: cores[s.key] }} /><span>{s.nome}<small>{s.fonte}</small></span><b>{sinal(v[s.key])}</b></span></li>)}
      <li className="side-note">Se os registros sobem menos que as aberturas, o mercado cresce mais depressa que o cadastro. A linha tracejada (crédito) depende de acordo com o Banco Central.</li>
    </ul>
  </div>;
}

/** ARTs de empresas por mês nos últimos 24 meses, com o mesmo mês do ano anterior. */
export function ArtsMes({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => artsMensais(ctx.historyScope), [ctx.historyScope]);
  const option = useMemo(() => ({
    grid: { top: 28, right: 6, bottom: 2, left: 4, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${mes(row.month)}</b><br/>${int(row.n)} ARTs de ${int(row.empresas.length)} empresas${row.anoAnterior === null ? '' : `<br/>${int(row.anoAnterior)} no mesmo mês do ano anterior`}<br/><span style="opacity:.75">clique para ver as empresas</span>`; } },
    xAxis: { type: 'category', data: rows.map(row => mes(row.month)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10, interval: 2 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    series: [
      { name: 'ARTs no mês', type: 'bar', barWidth: '58%', data: rows.map(row => row.n), itemStyle: { color: tokens.blue, borderRadius: [3, 3, 0, 0] } },
      { name: 'Mesmo mês do ano anterior', type: 'line', data: rows.map(row => row.anoAnterior), symbol: 'circle', symbolSize: 4, lineStyle: { color: tokens.accent, width: 2 }, itemStyle: { color: tokens.accent } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="ARTs de empresas por mês" onPick={params => { const row = rows[params.dataIndex]; if (row?.empresas.length) ctx.open({ kind: 'empresas', title: `Empresas com ART em ${mes(row.month)}`, what: 'Empresas que registraram ao menos uma ART no mês escolhido.', ids: row.empresas }); }} />;
}

/** Empresas credenciadas no DETRAN-SP e no INMETRO, com a situação no cadastro e o RT. Depende de acordo com cada órgão. */
export function Credenciamentos({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.parcerias.credenciamentos, rows = q.linhas;
  const option = useMemo(() => ({
    grid: { top: 26, right: 36, bottom: 2, left: 2, containLabel: true }, legend: { top: 0, left: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => `${row.atividade} (${row.fonte})`), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: [
      { type: 'bar', name: 'Registradas com RT', stack: 'c', barWidth: 13, data: rows.map(row => row.comRt.length), itemStyle: { color: tokens.good } },
      { type: 'bar', name: 'Registradas sem RT', stack: 'c', data: rows.map(row => row.registradasSemRt.length), itemStyle: { color: tokens.accent } },
      { type: 'bar', name: 'Sem registro', stack: 'c', data: rows.map(row => row.semRegistro.length), itemStyle: { color: tokens.bad, borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (params: any) => int(rows[params.dataIndex].empresas.length) } },
    ],
  }), [rows, tokens]);
  const eyebrow = 'Demonstração que depende de acordo com o DETRAN-SP e com o INMETRO';
  return <div className="split">
    <Chart option={option} tokens={tokens} label="Empresas credenciadas por atividade e situação no cadastro" onPick={params => { const row = rows[params.dataIndex]; if (!row) return; const ids = [row.comRt, row.registradasSemRt, row.semRegistro][params.seriesIndex] ?? [];
      if (ids.length) ctx.open({ kind: 'empresas', eyebrow, title: `${row.atividade} (${row.fonte}): ${params.seriesName.toLowerCase()}`, what: 'Empresas com credenciamento vigente nesta atividade na data escolhida, pela situação no cadastro do Crea-SP.', use: 'O credenciamento mostra que a empresa exerce atividade técnica. Confirme a atribuição antes de orientar sobre registro ou RT.', ids }); }} />
    <ul className="side-list" aria-label="Leituras dos credenciamentos">
      <li><button onClick={() => q.semRegistro.length && ctx.open({ kind: 'empresas', eyebrow, title: 'Credenciadas sem registro no Crea-SP', what: 'Empresas com credenciamento vigente no DETRAN-SP ou no INMETRO e sem registro ativo no Crea-SP na data escolhida.', use: 'Prioridade para orientação: a atividade credenciada costuma exigir responsável técnico.', ids: q.semRegistro })}><i style={{ background: tokens.bad }} /><span>Credenciadas sem registro</span><b>{int(q.semRegistro.length)}</b></button></li>
      <li><button onClick={() => q.registradasSemRt.length && ctx.open({ kind: 'empresas', eyebrow, title: 'Credenciadas registradas sem RT', what: 'Empresas credenciadas, registradas e sem responsável técnico vigente na data escolhida.', ids: q.registradasSemRt })}><i style={{ background: tokens.accent }} /><span>Registradas sem RT vigente</span><b>{int(q.registradasSemRt.length)}</b></button></li>
      <li className="side-note">Depende de acordo com o DETRAN-SP e de habilitação no INMETRO. Os números são demonstrativos e mostram os dados que os órgãos precisariam entregar.</li>
    </ul>
  </div>;
}

/** Atos da Junta Comercial que incluíram atividade de engenharia no contrato social e o registro que veio depois. Depende de acordo com a JUCESP. */
export function Jucesp({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.parcerias.jucesp, rows = q.trimestres;
  const option = useMemo(() => ({
    grid: { top: 26, right: 6, bottom: 2, left: 4, containLabel: true }, legend: { top: 0, left: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: rows.map(row => row.trimestre.replace('-', ' ')), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    series: [
      { type: 'bar', name: 'Aberturas com engenharia', stack: 'j', barWidth: '52%', data: rows.map(row => row.aberturas), itemStyle: { color: tokens.blue } },
      { type: 'bar', name: 'Alterações que incluíram engenharia', stack: 'j', data: rows.map(row => row.alteracoes), itemStyle: { color: tokens.brand, borderRadius: [3, 3, 0, 0] } },
      { type: 'line', name: 'Registraram-se depois no Crea-SP', data: rows.map(row => row.registradasDepois), symbol: 'circle', symbolSize: 5, lineStyle: { color: tokens.good, width: 2 }, itemStyle: { color: tokens.good } },
    ],
  }), [rows, tokens]);
  const eyebrow = 'Demonstração que depende de acordo com a Junta Comercial (JUCESP)';
  return <div className="split">
    <Chart option={option} tokens={tokens} label="Atos da Junta Comercial que incluíram engenharia, por trimestre" />
    <ul className="side-list" aria-label="Leituras dos atos da Junta">
      <li><button onClick={() => q.alteracoesSemRegistro.length && ctx.open({ kind: 'empresas', eyebrow, title: 'Incluíram engenharia no contrato e seguem sem registro', what: 'Empresas que, nos últimos 24 meses, alteraram o contrato social para incluir atividade da lista do Crea-SP e não têm registro ativo na data escolhida.', use: 'É o aviso mais cedo de empresa nova na área: orientar sobre o registro antes de qualquer ação fiscal.', ids: q.alteracoesSemRegistro })}><i style={{ background: tokens.warn }} /><span>Alteraram o contrato e seguem sem registro</span><b>{int(q.alteracoesSemRegistro.length)}</b></button></li>
      <li><button onClick={() => q.registradasDepois.length && ctx.open({ kind: 'empresas', eyebrow, title: 'Registraram-se depois do ato na Junta', what: 'Empresas que fizeram o primeiro registro no Crea-SP depois do ato que incluiu a atividade de engenharia.', ids: q.registradasDepois })}><i style={{ background: tokens.good }} /><span>Registraram-se depois do ato</span><b>{int(q.registradasDepois.length)}</b></button></li>
      <li><button onClick={() => q.semRegistro.length && ctx.open({ kind: 'empresas', eyebrow, title: 'Atos com engenharia sem registro no Crea-SP', what: 'Empresas abertas ou alteradas nos últimos 24 meses com atividade da lista e sem registro ativo na data escolhida.', ids: q.semRegistro })}><i style={{ background: tokens.bad }} /><span>Abertas ou alteradas, sem registro</span><b>{int(q.semRegistro.length)}</b></button></li>
      <li className="side-note">A Receita mostra a atividade atual, mas não diz quando a engenharia entrou no contrato. A Junta Comercial tem a data de cada ato, e esse dado depende de acordo. Os números são demonstrativos.</li>
    </ul>
  </div>;
}
