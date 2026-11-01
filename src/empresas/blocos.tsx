import { useMemo } from 'react';
import type { complianceFlow } from '../gestao-v14/metrics';
import { Chart, useSpMap } from '../painel/chart';
import { brl, data, int, mes, pct } from '../painel/ui';
import { camaraPorCnae } from '../painel/analise';
import { rotulosGre, territorioGre } from '../painel/territorio';
import { classesCnae, correspondencias } from '../observatorio/norte';
import { fontesInstalacao } from '../domain/frentes';
import type { FonteInstalacao } from '../domain/frentes';
import { faixasVinculos } from '../domain/parcerias';
import { artsMensais, idadeCapital, mercadoEmArvore, registrosPorCamara, ritmoEconomico, territorio } from '../domain/empresas';
import type { LinhaCnae, LinhaTerritorio, RamoMercado } from '../domain/empresas';
import type { CockpitCtx } from '../cockpit/contexto';
import { artPorCamara, artPorModalidade, camaraPorte, entradasSaidas, pagamento } from '../cockpit/medidas';
import { linhasEmpresas } from '../cockpit/ui';

/**
 * Blocos do painel de Empresas. Regras do Caio (01/11/2026): clicar num item abre as empresas daquele item, nunca o resumo
 * genérico da regional; regional, município, câmara, período e data são filtros do alto da tela e valem para o painel inteiro;
 * cada página cabe numa tela de computador sem rolagem; o bloco mostra só o título e o gráfico, e a explicação fica no (i);
 * os tipos de gráfico variam (mapa, mapa de árvore, calor, rede, rosa, anel, barras radiais), sem ficar tudo em barras.
 */

/** Um anel só: por dentro, a situação do registro; por fora, a anuidade das registradas. Substitui as duas roscas lado a lado. */
export function Situacoes({ ctx, flow }: { ctx: CockpitCtx; flow: ReturnType<typeof complianceFlow> }) {
  const { tokens, model } = ctx, ids = (name: string) => flow.nodes.find(node => node.name === name)?.companyIds ?? [];
  const ativa = ids('Registro vigente'), pay = pagamento(model), emDia = new Set(pay.emDia), inad = new Set(pay.inadimplentes);
  const dentro = [{ name: 'Registro ativo', ids: ativa, color: tokens.blue }, { name: 'Registro inativo', ids: ids('Só histórico'), color: tokens.heat[1] }, { name: 'Nunca registrada', ids: ids('Nunca registrada'), color: tokens.bad }];
  const fora = [{ name: 'Em dia', ids: ativa.filter(id => emDia.has(id)), color: tokens.good }, { name: 'Anuidade atrasada', ids: ativa.filter(id => inad.has(id)), color: tokens.warn }, { name: 'Sem cobrança no período', ids: ativa.filter(id => !emDia.has(id) && !inad.has(id)), color: tokens.line }];
  const total = dentro.reduce((soma, part) => soma + part.ids.length, 0);
  const option = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (item: any) => item.data.vazio ? '' : `<b>${item.name}</b><br/>${int(item.value)} empresas · ${pct(item.value / Math.max(1, item.seriesIndex ? ativa.length : total) * 100)} ${item.seriesIndex ? 'das registradas' : 'do total'}<br/><span style="opacity:.75">clique para ver</span>` },
    title: { text: int(total), subtext: 'empresas', left: 'center', top: 'center', itemGap: 2, textStyle: { color: tokens.ink, fontSize: 17, fontWeight: 800, fontFamily: 'Raleway, Lato, sans-serif' }, subtextStyle: { color: tokens.muted, fontSize: 10 } },
    series: [
      { type: 'pie', radius: ['38%', '60%'], padAngle: 1.5, itemStyle: { borderRadius: 3, borderColor: tokens.surface, borderWidth: 1 }, label: { show: false }, data: dentro.map(part => ({ name: part.name, value: part.ids.length, itemStyle: { color: part.color } })) },
      { type: 'pie', radius: ['64%', '80%'], padAngle: 1.5, itemStyle: { borderRadius: 3, borderColor: tokens.surface, borderWidth: 1 }, label: { show: true, position: 'outside', fontSize: 9.5, color: tokens.muted, formatter: (item: any) => item.data.vazio || !item.value ? '' : `${item.name}\n${pct(item.value / Math.max(1, ativa.length) * 100)}` }, labelLine: { length: 4, length2: 4 },
        data: [...fora.map(part => ({ name: part.name, value: part.ids.length, itemStyle: { color: part.color } })), ...dentro.slice(1).map(part => ({ name: '', value: part.ids.length, vazio: true, itemStyle: { color: 'transparent' }, tooltip: { show: false }, emphasis: { disabled: true }, labelLine: { show: false } }))] },
    ],
  }), [dentro, fora, total, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Empresas por situação do registro e da anuidade" onPick={params => { const part = params.seriesIndex === 0 ? dentro[params.dataIndex] : fora[params.dataIndex];
    if (part?.ids.length) ctx.open({ kind: 'empresas', title: part.name, what: 'Empresas, contadas pela raiz do CNPJ, nesta situação na data escolhida.', ids: part.ids }); }} />;
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
  return <Chart option={option} tokens={tokens} label="Conciliação dos CNPJs com CNAE da lista com o cadastro do Crea-SP" onPick={params => { const classe = classesCnae[params.dataIndex], nome = correspondencias[params.seriesIndex]; const ids = classe && nome ? c.porClasse[classe][nome] : [];
      if (ids.length) ctx.open({ kind: 'cnpjs', title: `“${classe}” · ${nome.toLowerCase()}`, what: 'CNPJs completos ativos na Receita com CNAE da lista do Crea-SP nesta classe e correspondência.', use: nome === 'Sem correspondência' ? 'Sem correspondência não quer dizer irregular. Confirmar atividade antes de orientar ou notificar.' : undefined, ids }); }} />;
}

/** ARTs por modalidade em rosa: o raio de cada pétala é o número de ARTs. */
export function ArtModalidade({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => artPorModalidade(ctx.arts.atual), [ctx.arts]);
  const option = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (item: any) => { const row = rows[item.dataIndex]; return `<b>${row.modalidade}</b><br/>${int(row.quantidade)} ARTs · ${brl(row.valor)} declarados<br/>${int(row.ids.length)} empresas`; } },
    series: [{ type: 'pie', roseType: 'radius', radius: ['14%', '78%'], center: ['50%', '52%'], padAngle: 1, itemStyle: { borderRadius: 4, borderColor: tokens.surface, borderWidth: 1 },
      label: { color: tokens.ink, fontSize: 10, formatter: (item: any) => `{n|${item.name}}\n{v|${int(item.value)}}`, rich: { n: { color: tokens.muted, fontSize: 9.5 }, v: { color: tokens.ink, fontSize: 10.5, fontWeight: 700 } } }, labelLine: { length: 4, length2: 6 },
      data: rows.map((row, index) => ({ name: row.modalidade, value: row.quantidade, itemStyle: { color: [tokens.blue, tokens.accent, tokens.brand, tokens.heat[1], tokens.good, tokens.warn, tokens.cat[4]][index % 7] } })) }],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="ARTs de empresas por modalidade" onPick={params => { const row = rows[params.dataIndex]; if (row) ctx.open({ kind: 'empresas', title: `ARTs de ${row.modalidade.toLowerCase()}`, what: 'Empresas com ART desta modalidade no período.', ids: row.ids }); }} />;
}

/** Barras em volta de um círculo: cada anel é uma câmara, e o arco é a parte das registradas sem ART no período. */
export function SemArt({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => artPorCamara(ctx.dataset, ctx.model), [ctx.dataset, ctx.model]);
  const option = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (item: any) => { const row = rows[item.dataIndex]; return `<b>${row.camara}</b><br/>${int(row.semArt.length)} de ${int(row.ativas.length)} empresas registradas sem ART no período`; } },
    polar: { radius: ['18%', '86%'], center: ['50%', '54%'] },
    angleAxis: { max: 100, startAngle: 90, show: false },
    radiusAxis: { type: 'category', data: rows.map(row => row.camara), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false } },
    series: [{ type: 'bar', coordinateSystem: 'polar', barWidth: '62%', roundCap: true, showBackground: true, backgroundStyle: { color: tokens.soft }, data: rows.map(row => row.semArt.length / Math.max(1, row.ativas.length) * 100),
      itemStyle: { color: tokens.warn }, label: { show: true, position: 'start', formatter: (item: any) => `${rows[item.dataIndex].camara}  ${pct(item.value)}`, color: tokens.ink, fontSize: 10, fontWeight: 700 } }],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Empresas registradas sem ART no período por câmara" onPick={params => { const row = rows[params.dataIndex]; if (row?.semArt.length) ctx.open({ kind: 'empresas', title: `${row.camara}: registradas sem ART no período`, what: 'Empresas com registro ativo sem nenhuma ART registrada no período.', use: 'Verifique se a empresa está em atividade; se estiver, oriente sobre a obrigação de ART (Lei 6.496/77).', ids: row.semArt }); }} />;
}

/** A rede dos maiores grupos societários: cada ponto é uma empresa, e cada linha liga a empresa à sócia. Verde é registrada. */
export function RedeSocietaria({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, dataset } = ctx, q = ctx.frentes.sociedades;
  const rede = useMemo(() => {
    const grupos = q.grupos.slice(0, 8), membros = new Set(grupos.flatMap(row => row.empresas)), anchor = dataset.snapshotDate;
    const registrada = new Set(dataset.registrations.filter(row => row.status === 'Ativo' && row.startedAt <= anchor && (!row.ceasedAt || row.ceasedAt > anchor)).map(row => row.companyId));
    const nomes = new Map(dataset.companies.map(row => [row.id, row.name])), ligacoes = new Map<string, [string, string]>();
    for (const row of ctx.frentes.sociedades.socios) if (row.socioCompanyId && membros.has(row.empresaId) && membros.has(row.socioCompanyId)) ligacoes.set(`${row.empresaId}|${row.socioCompanyId}`, [row.empresaId, row.socioCompanyId]);
    const grau = new Map<string, number>(); for (const [a, b] of ligacoes.values()) { grau.set(a, (grau.get(a) ?? 0) + 1); grau.set(b, (grau.get(b) ?? 0) + 1); }
    return { nos: [...membros].map(id => ({ id, name: nomes.get(id) ?? id, registrada: registrada.has(id), grau: grau.get(id) ?? 0 })), ligacoes: [...ligacoes.values()], registradas: [...membros].filter(id => registrada.has(id)).length, membros: membros.size };
  }, [q, dataset, ctx.frentes.sociedades.socios]);
  const option = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (item: any) => item.dataType === 'node' ? `<b>${item.data.name}</b><br/>${item.data.registrada ? 'Registrada no Crea-SP' : 'Sem registro ativo'}<br/>${int(item.data.grau)} ligações societárias` : '' },
    series: [{ type: 'graph', layout: 'force', roam: true, zoom: 1.5, draggable: false, force: { repulsion: 70, edgeLength: [16, 36], gravity: 0.22, layoutAnimation: false }, left: 6, right: 6, top: 6, bottom: 6,
      data: rede.nos.map(no => ({ ...no, symbolSize: 10 + Math.min(14, no.grau * 3), itemStyle: { color: no.registrada ? tokens.good : tokens.warn, borderColor: tokens.surface, borderWidth: 1 } })),
      links: rede.ligacoes.map(([source, target]) => ({ source, target })), lineStyle: { color: tokens.muted, opacity: 0.45, width: 1 }, emphasis: { focus: 'adjacency', lineStyle: { width: 2 } }, label: { show: false } }],
  }), [rede, tokens]);
  return <div className="split">
    <Chart option={option} tokens={tokens} label="Rede dos maiores grupos societários" onPick={params => { if (params.dataType !== 'node') return; const grupo = q.grupos.find(row => row.empresas.includes(params.data.id));
      if (grupo) ctx.open({ kind: 'empresas', title: `Grupo societário de ${params.data.name}`, what: 'Empresas com atividade de engenharia ligadas entre si porque uma é sócia da outra, segundo o quadro de sócios publicado pela Receita.', use: 'A ligação é societária, não técnica. Veja o registro e o RT de cada empresa antes de qualquer leitura.', ids: grupo.empresas }); }} />
    <ul className="side-list" aria-label="Sócios empresas">
      <li><span className="side-serie"><i style={{ background: tokens.good }} /><span>Registradas na rede</span><b>{int(rede.registradas)}</b></span></li>
      <li><span className="side-serie"><i style={{ background: tokens.warn }} /><span>Sem registro ativo</span><b>{int(rede.membros - rede.registradas)}</b></span></li>
      <li><button onClick={() => q.empresasComSocioPj.length && ctx.open({ kind: 'empresas', title: 'Empresas com outra empresa como sócia', what: 'Empresas com atividade de engenharia que têm ao menos uma empresa no quadro de sócios publicado pela Receita.', ids: q.empresasComSocioPj })}><i style={{ background: tokens.blue }} /><span>Têm empresa como sócia</span><b>{int(q.empresasComSocioPj.length)}</b></button></li>
      <li><button onClick={() => q.investidasRegistradasComSocioEngenhariaSemRegistro.length && ctx.open({ kind: 'empresas', title: 'Registradas com sócia de engenharia sem registro', what: 'Empresas registradas que têm como sócia outra empresa com atividade da lista do Crea-SP, mas sem registro encontrado.', use: 'A sócia pode não exercer a atividade.', ids: q.investidasRegistradasComSocioEngenhariaSemRegistro })}><i style={{ background: tokens.bad }} /><span>Sócia de engenharia sem registro</span><b>{int(q.investidasRegistradasComSocioEngenhariaSemRegistro.length)}</b></button></li>
    </ul>
  </div>;
}

/** Instalações de setores regulados e financiamentos do BNDES: uma linha por fonte, com o número e o valor, no recorte de regional e município. */
export function Instalacoes({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.frentes.instalacoes, cores: Record<FonteInstalacao, string> = { ANEEL: tokens.accent, ANP: tokens.blue, ANM: tokens.heat[1], BNDES: tokens.brand };
  const nomes: Record<FonteInstalacao, string> = { ANEEL: 'Usinas e agentes de energia (ANEEL)', ANP: 'Postos e instalações de combustível (ANP)', ANM: 'Processos de mineração (ANM)', BNDES: 'Financiamentos do BNDES' };
  const lista = useMemo(() => q.instalacoes.filter(row => !ctx.cidadeId || row.cityId === ctx.cidadeId), [q, ctx.cidadeId]);
  const maior = Math.max(1, ...fontesInstalacao.map(fonte => lista.filter(row => row.fonte === fonte).length));
  return <ul className="fonte-list" aria-label="Instalações por fonte">
    {fontesInstalacao.map(fonte => { const rows = lista.filter(row => row.fonte === fonte), valor = rows.reduce((soma, row) => soma + row.valor, 0), noUniverso = rows.filter(row => row.companyId).length;
      return <li key={fonte}><button disabled={!rows.length} onClick={() => ctx.open({ kind: 'linhas', title: nomes[fonte], what: 'Instalações, processos ou financiamentos desta fonte no recorte escolhido, com a empresa responsável identificada pelo CNPJ.', use: 'A empresa é operadora, titular ou financiada. Isso não faz dela a projetista, a instaladora nem a responsável técnica.', listTitle: 'Agentes, maior valor primeiro',
        rows: rows.map(item => ({ key: item.id, companyId: item.companyId ?? undefined, title: item.agenteNome, subtitle: `${item.agenteCnpj} · ${item.tipo}`, value: fonte === 'BNDES' ? brl(item.valor) : `${item.valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${item.unidade}`, note: item.companyId ? 'empresa com atividade de engenharia' : 'CNPJ fora da lista do Crea-SP', sortValue: item.valor })) })}>
        <span className="fonte-nome"><i style={{ background: cores[fonte] }} />{nomes[fonte]}</span>
        <b>{int(rows.length)}</b>
        <span className="fonte-barra"><em style={{ width: `${rows.length / maior * 100}%`, background: cores[fonte] }} /></span>
        <small>{int(noUniverso)} com atividade de engenharia · {fonte === 'BNDES' ? brl(valor) : `${valor.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })} ${rows[0]?.unidade ?? ''}`}</small>
      </button></li>; })}
  </ul>;
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
      <Chart option={option} tokens={tokens} label="Estabelecimentos abertos na Receita por mês e situação no cadastro" onPick={() => a.ids.length && ctx.open({ kind: 'cnpjs', title: 'Abertos na Receita em 24 meses', what: 'Estabelecimentos com CNAE da lista do Crea-SP abertos nos últimos 24 meses antes da data de referência (data de abertura da Receita).', use: 'Aberturas são mercado novo; a correspondência no cadastro é uma decomposição, não um filtro. Sem registro não quer dizer irregular.', ids: a.ids })} />
    <ul className="side-list" aria-label="Permanência das coortes">
      <li className="side-head">Continuam registradas</li>
      {coortes.map(row => <li key={row.mesesAtras}><button onClick={() => row.saidas.length && ctx.open({ kind: 'empresas', title: `Saíram da base em ${row.mesesAtras} meses`, what: `Empresas com registro ou visto vigente em ${data(row.d0)} e sem registro vigente na data de referência.`, use: 'Perda de vínculo institucional; cadastro vigente não prova atividade e a saída não tem causa atribuída.', ids: row.saidas })}><i style={{ background: row.taxa !== null && row.taxa >= 90 ? tokens.good : tokens.warn }} /><span>Registradas há {row.mesesAtras} meses<br /><small>{int(row.permanecem.length)} de {int(row.coorte.length)} seguem registradas</small></span><b>{row.taxa === null ? '—' : pct(row.taxa, 1)}</b></button></li>)}
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
    <Chart option={option} tokens={tokens} label="Sócios pessoa física por qualificação e presença no cadastro profissional" />
    <ul className="side-list" aria-label="Leituras do quadro societário">
      <li><button onClick={() => abrir('Registradas sem RT com sócio profissional ativo', q.registradasSemRtComSocioProfissional, 'Empresas registradas sem vínculo de RT vigente cujo sócio é profissional com registro ativo.', 'Orientar a anotação do RT: o sócio pode ser o responsável natural. Sociedade não é vínculo de responsabilidade.')}><i style={{ background: tokens.accent }} /><span>Registradas sem RT com sócio profissional ativo</span><b>{int(q.registradasSemRtComSocioProfissional.length)}</b></button></li>
      <li><button onClick={() => abrir('Registradas com sócio profissional inativo', q.registradasComSocioProfissionalInativo, 'Empresas registradas cujo sócio profissional está com registro cancelado ou interrompido na data de referência.', 'Contexto para o relacionamento com o profissional; nada a notificar à empresa por isso.')}><i style={{ background: tokens.muted }} /><span>Sócio profissional cancelado ou interrompido</span><b>{int(q.registradasComSocioProfissionalInativo.length)}</b></button></li>
      <li><button disabled><i style={{ background: tokens.blue }} /><span>Sócio profissional é RT da própria empresa</span><b>{int(q.socioEhRt.length)}</b></button></li>
    </ul>
  </div>;
}

export function Vinculos({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.parcerias.vinculos, rows = q.porFaixa;
  const option = useMemo(() => ({
    grid: { top: 24, right: 8, bottom: 2, left: 2, containLabel: true }, legend: { top: 0, left: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: faixasVinculos.map(faixa => faixa), axisLabel: { color: tokens.muted, fontSize: 10, interval: 0 }, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    series: [
      { type: 'bar', name: 'Registradas', stack: 'v', barWidth: 22, data: rows.map(row => row.registradas), itemStyle: { color: tokens.good } },
      { type: 'bar', name: 'Sem registro (universo)', stack: 'v', data: rows.map(row => row.semRegistro), itemStyle: { color: tokens.warn, borderRadius: [3, 3, 0, 0] } },
    ],
  }), [rows, tokens]);
  const abrir = (titulo: string, ids: string[], what: string, use: string) => ids.length && ctx.open({ kind: 'linhas', eyebrow: 'Contexto que depende de acordo com o Ministério do Trabalho', title: titulo, what, use, listTitle: 'Empresas, mais vínculos técnicos primeiro', rows: linhasEmpresas(ctx, ids, id => { const row = q.empresas.find(item => item.companyId === id)!; return { value: `${int(row.vinculosTecnicos)} técnico${row.vinculosTecnicos === 1 ? '' : 's'}`, note: `${int(row.vinculosTotal)} vínculos no total`, sort: row.vinculosTecnicos }; }) });
  return <div className="split">
    <Chart option={option} tokens={tokens} label="Empresas por faixa de vínculos técnicos e situação do registro" />
    <ul className="side-list" aria-label="Leituras dos vínculos">
      <li><button onClick={() => abrir('Registradas com empregados técnicos e sem RT vigente', q.registradasSemRt, 'Empresas registradas com ao menos um vínculo CLT em CBO de engenharia e nenhum responsável técnico vigente na data de referência.', 'Conferir se há atividade técnica e orientar a anotação do RT. Empregado em CBO técnico não é RT.')}><i style={{ background: tokens.accent }} /><span>Registradas com técnicos e sem RT vigente</span><b>{int(q.registradasSemRt.length)}</b></button></li>
      <li><button onClick={() => abrir('Universo sem registro com empregados técnicos', q.semRegistroComTecnicos, 'Estabelecimentos com CNAE da lista, sem registro vigente, com vínculos em CBO de engenharia.', 'Prioriza a análise do CNAE sem registro; o vínculo não prova atividade privativa.')}><i style={{ background: tokens.warn }} /><span>Universo sem registro com técnicos</span><b>{int(q.semRegistroComTecnicos.length)}</b></button></li>
    </ul>
  </div>;
}

/* ---------- Painel de Empresas · visuais novos ---------- */
/** Cor de 0 a 100% registrado: do vermelho (pouco registrado) ao azul (muito registrado). */
const rampaCobertura = (dark: boolean) => dark ? ['#FF7B7B', '#E5703B', '#C9A227', '#4A7FC1', '#7FB0E6'] : ['#C53030', '#E5703B', '#D69E2E', '#3182CE', '#082D74'];
const corCobertura = (taxa: number | null, dark: boolean, minimo = 40, maximo = 90) => { if (taxa === null) return dark ? '#2D3748' : '#E2E8F0'; const cores = rampaCobertura(dark), t = Math.max(0, Math.min(0.999, (taxa - minimo) / (maximo - minimo))); return cores[Math.floor(t * cores.length)]; };

/** Mapa do estado: o território de cada regional pintado pela parte registrada, e uma bolha por município (tamanho = estabelecimentos). */
export function MapaMercado({ ctx }: { ctx: CockpitCtx }) {
  const centroids = useSpMap(), { tokens, dark } = ctx;
  const t = useMemo(() => territorio(ctx.scope, ctx.model), [ctx.scope, ctx.model]);
  const regioes = useMemo(() => centroids ? territorioGre(ctx.dataset, centroids) : null, [centroids, ctx.dataset]);
  const foco = useMemo(() => { if (!regioes || !centroids) return null; const cidade = ctx.cidadeId ? ctx.dataset.cities.find(row => row.id === ctx.cidadeId) : undefined;
    // Com uma regional ou um município escolhido, o mapa aproxima dele; o resto do estado fica apagado ao fundo.
    if (cidade) return { center: centroids.get(cidade.name), zoom: 3.2 }; if (ctx.greId) return { center: rotulosGre(regioes, centroids).get(ctx.greId), zoom: 2.2 }; return null; }, [regioes, centroids, ctx.greId, ctx.cidadeId, ctx.dataset]);
  const porGre = useMemo(() => new Map(t.gres.map(row => [row.id, row])), [t]), cidades = useMemo(() => new Map(ctx.dataset.cities.map(row => [row.id, row])), [ctx.dataset]);
  const maior = Math.max(1, ...t.cidades.map(row => row.total));
  // A escala de cor vai da regional ou município menos registrado ao mais registrado, para as diferenças aparecerem.
  const taxas = [...t.cidades, ...t.gres].map(row => row.taxa).filter((value): value is number => value !== null);
  const piso = Math.floor(Math.min(...taxas, 100) / 5) * 5, teto = Math.max(piso + 10, Math.ceil(Math.max(...taxas, 0) / 5) * 5);
  const cor = (taxa: number | null) => corCobertura(taxa, dark, piso, teto);
  const option = useMemo(() => {
    if (!regioes || !centroids) return null;
    return {
      tooltip: { trigger: 'item', formatter: (item: any) => { const row = item.componentType === 'geo' ? porGre.get(regioes.get(item.name) ?? '') : item.data?.linha as LinhaTerritorio | undefined; if (!row) return item.name;
        return `<b>${row.nome}</b>${item.componentType === 'geo' ? ' (regional)' : ''}<br/>${int(row.total)} estabelecimentos com atividade de engenharia<br/>${int(row.registrados.length)} registrados · <b>${row.taxa === null ? '—' : pct(row.taxa)}</b><br/>${int(row.semRegistro.length)} nunca apareceram no cadastro<br/><span style="opacity:.75">clique para ver os que faltam</span>`; } },
      geo: { map: 'spPainel', roam: true, scaleLimit: { min: 1, max: 8 }, ...(foco?.center ? { center: foco.center, zoom: foco.zoom } : { left: 2, right: 2, top: 2, bottom: 2 }), selectedMode: false, tooltip: { show: true },
        itemStyle: { areaColor: tokens.soft, borderColor: tokens.surface, borderWidth: 0.3 }, emphasis: { itemStyle: { areaColor: tokens.line }, label: { show: false } },
        regions: [...regioes].map(([name, greId]) => { const row = porGre.get(greId), fora = Boolean(ctx.greId && greId !== ctx.greId);
          return { name, itemStyle: fora ? { areaColor: tokens.soft, opacity: 1, borderColor: tokens.line, borderWidth: 0.3 } : { areaColor: row ? cor(row.taxa) : tokens.soft, opacity: 0.45, borderColor: tokens.surface, borderWidth: 0.3 } }; }) },
      series: [{ type: 'scatter', coordinateSystem: 'geo', zlevel: 2,
        data: t.cidades.map(row => { const cidade = cidades.get(row.id), at = cidade ? centroids.get(cidade.name) : undefined; if (!at) return null;
          const escolhida = ctx.cidadeId === row.id;
          return { name: row.nome, linha: row, value: [...at, row.total], symbolSize: 6 + Math.sqrt(row.total / maior) * 30, itemStyle: { color: cor(row.taxa), opacity: 0.92, borderColor: escolhida ? tokens.ink : tokens.surface, borderWidth: escolhida ? 2 : 1 } }; }).filter(Boolean),
        label: { show: true, position: 'right', fontSize: 9.5, color: tokens.ink, formatter: (item: any) => item.data.linha.total / maior > 0.18 ? item.name : '', textBorderColor: tokens.surface, textBorderWidth: 2 }, labelLayout: { hideOverlap: true } }],
    };
  }, [regioes, centroids, t, porGre, cidades, maior, tokens, dark, ctx.greId, ctx.cidadeId, piso, teto, foco]); // eslint-disable-line react-hooks/exhaustive-deps
  const abrir = (row: LinhaTerritorio | undefined) => { if (!row) return; const ids = row.semRegistro.length ? row.semRegistro : row.registrados;
    if (ids.length) ctx.open({ kind: 'cnpjs', title: `${row.nome}: ${row.semRegistro.length ? 'nunca apareceram no cadastro' : 'registrados'}`, what: 'Estabelecimentos ativos na Receita com atividade da lista do Crea-SP neste lugar, na data escolhida.', use: row.semRegistro.length ? 'Não estar no cadastro não quer dizer irregular. Confirme a atividade antes de orientar ou notificar.' : undefined, ids }); };
  return <div className="mapa-wrap">
    {option ? <Chart option={option} tokens={tokens} label="Mapa do mercado de engenharia por município" onPick={params => abrir(params.componentType === 'geo' ? porGre.get(regioes?.get(params.name) ?? '') : params.data?.linha)} /> : <div className="loading">Carregando o mapa…</div>}
    <div className="mapa-legenda" aria-hidden="true"><span>{piso}%</span>{rampaCobertura(dark).map(value => <i key={value} style={{ background: value }} />)}<span>{teto}% registrado</span></div>
  </div>;
}

/** Mapa de árvore: cada retângulo grande é uma câmara, e os de dentro são as atividades (CNAE). Tamanho = estabelecimentos; cor = parte registrada. */
export function ArvoreMercado({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, dark } = ctx, ramos = useMemo(() => mercadoEmArvore(ctx.scope, ctx.model, camaraPorCnae), [ctx.scope, ctx.model]);
  const taxas = ramos.flatMap(ramo => ramo.atividades.map(row => row.cobertura)).filter((value): value is number => value !== null);
  const piso = Math.floor(Math.min(...taxas, 100) / 5) * 5, teto = Math.max(piso + 10, Math.ceil(Math.max(...taxas, 0) / 5) * 5);
  const option = useMemo(() => ({
    tooltip: { formatter: (item: any) => { const d = item.data; if (!d?.linha) return d?.ramo ? `<b>${d.name}</b><br/>${int(d.value)} estabelecimentos · ${pct(d.ramo.registrados / Math.max(1, d.ramo.total) * 100)} registrados` : '';
      const row = d.linha as LinhaCnae; return `<b>${row.code}</b> ${row.label}<br/>${int(row.total)} estabelecimentos · ${row.cobertura === null ? '—' : pct(row.cobertura)} registrados<br/>${int(row.semRegistro.length)} sem registro<br/><span style="opacity:.75">clique para ver os CNPJs sem registro</span>`; } },
    series: [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, left: 0, right: 0, top: 0, bottom: 0, squareRatio: 1.2,
      upperLabel: { show: true, height: 18, color: '#FFFFFF', fontSize: 10.5, fontWeight: 700, formatter: (item: any) => item.data?.ramo ? `${item.name} · ${pct(item.data.ramo.registrados / Math.max(1, item.data.ramo.total) * 100)} registrado` : item.name },
      levels: [{ itemStyle: { borderColor: tokens.surface, borderWidth: 0, gapWidth: 3 } }, { itemStyle: { borderColor: dark ? '#1A2D52' : '#01224D', borderWidth: 2, gapWidth: 1 }, upperLabel: { show: true } }, { itemStyle: { borderColor: tokens.surface, borderWidth: 1, gapWidth: 1 } }],
      label: { show: true, fontSize: 9.5, color: '#FFFFFF', overflow: 'truncate', lineHeight: 12, formatter: (item: any) => { const row = item.data?.linha as LinhaCnae | undefined; return row ? `{p|${row.cobertura === null ? '' : pct(row.cobertura)}}\n${row.label}\n{c|${row.code}}` : item.name; }, rich: { p: { fontSize: 12, fontWeight: 800, color: '#FFFFFF' }, c: { fontSize: 8.5, color: 'rgba(255,255,255,.75)' } } },
      data: ramos.map(ramo => ({ name: ramo.camara, value: ramo.total, ramo, itemStyle: { color: dark ? '#1A2D52' : '#01224D' },
        children: ramo.atividades.map(linha => ({ name: linha.code, value: linha.total, linha, itemStyle: { color: corCobertura(linha.cobertura, dark, piso, teto) } })) })) }],
  }), [ramos, tokens, dark, piso, teto]);
  return <Chart option={option} tokens={tokens} label="Mercado por câmara e atividade, com a parte registrada" onPick={params => { const d = params.data; if (!d) return;
    if (d.linha) { const row = d.linha as LinhaCnae, ids = row.semRegistro.length ? row.semRegistro : row.registrados; if (ids.length) ctx.open({ kind: 'cnpjs', title: `${row.code}: ${row.semRegistro.length ? 'sem registro' : 'registrados'}`, what: `Estabelecimentos ativos na Receita cuja atividade da lista do Crea-SP é ${row.code} (${row.label}).`, use: row.semRegistro.length ? 'Não estar no cadastro não quer dizer irregular. Confirme a atividade antes de orientar ou notificar.' : undefined, ids }); }
    else if (d.ramo) { const ids = (d.ramo as RamoMercado).atividades.flatMap(row => row.semRegistro); if (ids.length) ctx.open({ kind: 'cnpjs', title: `${d.name}: sem registro`, what: 'Estabelecimentos ativos na Receita com atividade da lista desta câmara e sem registro na data escolhida.', use: 'Não estar no cadastro não quer dizer irregular. Confirme a atividade antes de orientar ou notificar.', ids }); } }} />;
}

/** Matriz de calor: tempo de registro nas linhas, capital social nas colunas. Cada célula é o número de empresas registradas. */
const curtoIdade = ['menos de 1 ano', '1 a 2 anos', '2 a 5 anos', '5 a 10 anos', '10 anos ou mais'];
const curtoCapital = ['até 50 mil', '50 a 200 mil', '200 mil a 1 mi', '1 a 5 mi', 'mais de 5 mi'];
export function IdadeCapital({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, dark } = ctx, m = useMemo(() => idadeCapital(ctx.scope, ctx.model), [ctx.scope, ctx.model]), maior = Math.max(1, ...m.celulas.map(row => row.ids.length));
  const option = useMemo(() => ({
    grid: { top: 4, right: 4, bottom: 34, left: 4, containLabel: true },
    tooltip: { formatter: (item: any) => { const cel = m.celulas[item.dataIndex]; return `Registradas há <b>${curtoIdade[cel.idade]}</b><br/>Capital social <b>${curtoCapital[cel.capital]}</b><br/>${int(cel.ids.length)} empresas`; } },
    xAxis: { type: 'category', data: curtoCapital, splitArea: { show: false }, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.muted, fontSize: 9.5, interval: 0, width: 56, overflow: 'break' }, name: 'capital social (R$)', nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: tokens.muted, fontSize: 9.5 } },
    yAxis: { type: 'category', data: curtoIdade, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.muted, fontSize: 9.5 } },
    visualMap: { show: false, min: 0, max: maior, inRange: { color: dark ? ['#13233F', '#2F548C', '#7FB0E6'] : ['#EAF1FA', '#7FB0E6', '#082D74'] } },
    series: [{ type: 'heatmap', data: m.celulas.map(cel => ({ value: [cel.capital, cel.idade, cel.ids.length], label: { color: !dark && cel.ids.length > maior * 0.55 ? '#FFFFFF' : tokens.ink } })), itemStyle: { borderColor: tokens.surface, borderWidth: 2, borderRadius: 4 },
      label: { show: true, fontSize: 10, fontWeight: 700, formatter: (item: any) => item.value[2] ? int(item.value[2]) : '' } }],
  }), [m, maior, tokens, dark]);
  return <Chart option={option} tokens={tokens} label="Empresas registradas por tempo de registro e capital social" onPick={params => { const cel = m.celulas[params.dataIndex]; if (cel?.ids.length) ctx.open({ kind: 'empresas', title: `Registradas há ${curtoIdade[cel.idade]}, capital ${curtoCapital[cel.capital]}`, what: 'Empresas com registro ativo na data escolhida, pelo tempo desde o primeiro registro e pelo capital social declarado à Receita.', ids: cel.ids }); }} />;
}

/** Calor dos novos registros: uma linha por câmara, uma coluna por mês. Mostra em que meses e em que área o cadastro cresceu. */
export function RegistrosCalor({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, dark } = ctx, r = useMemo(() => registrosPorCamara(ctx.historyScope, ctx.camaraDe, 24), [ctx.historyScope, ctx.camaraDe]);
  const celulas = r.linhas.flatMap((linha, y) => r.months.map((month, x) => ({ x, y, ids: linha.porMes.get(month) ?? [] })));
  const maior = Math.max(1, ...celulas.map(row => row.ids.length));
  const option = useMemo(() => ({
    grid: { top: 4, right: 4, bottom: 2, left: 4, containLabel: true },
    tooltip: { formatter: (item: any) => { const cel = celulas[item.dataIndex]; return `<b>${r.linhas[cel.y].camara}</b>, ${mes(r.months[cel.x])}<br/>${int(cel.ids.length)} empresas fizeram o primeiro registro`; } },
    xAxis: { type: 'category', data: r.months.map(mes), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.muted, fontSize: 9.5, interval: 3 } },
    yAxis: { type: 'category', inverse: true, data: r.linhas.map(row => `${row.camara}\n${int(row.total)} empresas`), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10, lineHeight: 13 } },
    visualMap: { show: false, min: 0, max: maior, inRange: { color: dark ? ['#13233F', '#2F548C', '#FABD07'] : ['#F1F5FA', '#7FB0E6', '#082D74'] } },
    series: [{ type: 'heatmap', data: celulas.map(cel => [cel.x, cel.y, cel.ids.length]), itemStyle: { borderColor: tokens.surface, borderWidth: 1.5, borderRadius: 3 } },
],
  }), [r, celulas, maior, tokens, dark]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Novos registros de empresas por câmara e mês" onPick={params => { const cel = celulas[params.dataIndex]; if (cel?.ids.length) ctx.open({ kind: 'empresas', title: `${r.linhas[cel.y].camara}: primeiro registro em ${mes(r.months[cel.x])}`, what: 'Empresas que fizeram o primeiro registro no Crea-SP neste mês, pela câmara da atividade principal.', ids: cel.ids }); }} />;
}

/** Nome com “engenharia” e quem dirige a empresa (Lei 5.194/66, arts. 4º e 5º). Depende do CPF completo dos sócios. */
export function Denominacao({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.parcerias.denominacao, eyebrow = 'Demonstração que depende de acordo com a Receita Federal (CPF completo dos sócios)';
  const partes = [{ name: 'Diretoria atende à lei', ids: q.atendem, color: tokens.good }, { name: 'Diretoria não atende', ids: q.naoAtendem, color: tokens.bad }, { name: 'Sem dirigente identificado', ids: q.semDirigente, color: tokens.line }];
  const total = partes.reduce((soma, part) => soma + part.ids.length, 0);
  const option = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (item: any) => `<b>${item.name}</b><br/>${int(item.value)} empresas · ${pct(item.percent)}` },
    title: { text: int(total), subtext: 'com “engenharia”\nno nome', left: 'center', top: '36%', itemGap: 2, textStyle: { color: tokens.ink, fontSize: 16, fontWeight: 800, fontFamily: 'Raleway, Lato, sans-serif' }, subtextStyle: { color: tokens.muted, fontSize: 9, lineHeight: 11 } },
    series: [{ type: 'pie', radius: ['56%', '80%'], center: ['50%', '50%'], startAngle: 90, padAngle: 2, itemStyle: { borderRadius: 4, borderColor: tokens.surface, borderWidth: 1 }, label: { show: false }, data: partes.map(part => ({ name: part.name, value: part.ids.length, itemStyle: { color: part.color } })) }],
  }), [partes, total, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  const abrir = (titulo: string, ids: string[]) => ids.length && ctx.open({ kind: 'empresas', eyebrow, title: titulo, what: 'Empresas com “engenharia” ou “agronomia” na razão social, pela composição da diretoria na data escolhida. A Lei 5.194/66 (art. 5º) pede que a maioria da diretoria seja de profissionais registrados.', use: 'Orientar a troca do nome ou a composição da diretoria. A lei não exige sócio engenheiro para o registro: exige responsável técnico.', ids });
  return <div className="split">
    <Chart option={option} tokens={tokens} label="Empresas com engenharia no nome pela composição da diretoria" onPick={params => { const part = partes[params.dataIndex]; if (part) abrir(`Nome com engenharia: ${part.name.toLowerCase()}`, part.ids); }} />
    <ul className="side-list" aria-label="Nome e diretoria">
      <li><button onClick={() => abrir('Registradas cujo nome não condiz com a diretoria', q.naoAtendemRegistradas)}><i style={{ background: tokens.bad }} /><span>Registradas, diretoria sem maioria de profissionais</span><b>{int(q.naoAtendemRegistradas.length)}</b></button></li>
      <li><button onClick={() => abrir('Nome com engenharia e diretoria sem maioria de profissionais', q.naoAtendem)}><i style={{ background: tokens.warn }} /><span>Todas sem maioria de profissionais</span><b>{int(q.naoAtendem.length)}</b></button></li>
      <li><button onClick={() => abrir('Nome com engenharia e diretoria com maioria de profissionais', q.atendem)}><i style={{ background: tokens.good }} /><span>Diretoria com maioria de profissionais</span><b>{int(q.atendem.length)}</b></button></li>
    </ul>
  </div>;
}

/** Economia, empresas abertas e registros: cinco séries com o primeiro mês igual a 100, para comparar o ritmo de cada uma. */
const seriesRitmo = [
  { key: 'emprego', nome: 'Emprego formal em engenharia', curto: 'Emprego', fonte: 'Novo CAGED e RAIS', parceria: false },
  { key: 'pib', nome: 'PIB dos municípios', curto: 'PIB', fonte: 'IBGE, anual', parceria: false },
  { key: 'credito', nome: 'Crédito a empresas de engenharia (!)', curto: 'Crédito (!)', fonte: 'Banco Central, depende de acordo', parceria: true },
  { key: 'aberturas12', nome: 'Empresas de engenharia abertas na Receita', curto: 'Abertas na Receita', fonte: 'soma de 12 meses', parceria: false },
  { key: 'registros12', nome: 'Empresas que se registraram no Crea-SP', curto: 'Registradas no Crea-SP', fonte: 'soma de 12 meses', parceria: false },
] as const;
export const useRitmo = (ctx: CockpitCtx) => useMemo(() => ritmoEconomico(ctx.dataset, ctx.greId, ctx.camara ? ctx.scope.companyIds : null, 24, ctx.cidadeId), [ctx.dataset, ctx.greId, ctx.camara, ctx.scope, ctx.cidadeId]);
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
    series: seriesRitmo.map(s => ({ name: s.curto, type: 'line', data: r.indice[s.key], smooth: 0.25, symbol: 'none', step: s.key === 'pib' ? 'end' : undefined,
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
      <li className="side-head">Variação em 24 meses</li>
      {seriesRitmo.map(s => <li key={s.key}><span className="side-serie"><i style={{ background: cores[s.key] }} /><span>{s.curto}<small>{s.fonte}</small></span><b>{sinal(v[s.key])}</b></span></li>)}
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
    </ul>
  </div>;
}
