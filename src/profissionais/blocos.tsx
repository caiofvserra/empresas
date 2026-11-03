import { useMemo, useState } from 'react';
import { Chart, useSpMap } from '../painel/chart';
import { int, mes, pct } from '../painel/ui';
import { rotulosGre, territorioGre } from '../painel/territorio';
import { faixasIdade, faixaIdade, idadeEm, situacaoEm } from '../domain/profissionais';
import type { Profissional } from '../domain/profissionais';
import { artPorIdade, artsMensaisPorModalidade, ativosNoInicio, fluxoMensal, modalidadeNivel, novosPorModalidade, permanenciaPorAno, regionaisProfissionais, transicoes } from '../domain/painel-profissionais';
import type { RegionalProfissionais } from '../domain/painel-profissionais';
import type { CockpitCtx } from '../cockpit/contexto';
import { linhasProfissionais } from '../cockpit/ui';

/**
 * Blocos do painel de Profissionais (03/11/2026), com as mesmas regras do painel de Empresas: clicar num item abre os profissionais
 * daquele item; regional, município, modalidade, período e data são filtros do alto da tela; cada página cabe numa tela sem rolagem;
 * o bloco mostra só o título e o gráfico, e a explicação fica no (i); os gráficos variam (mapa com o limite dos municípios, mapa de
 * árvore, anel, calor, fluxo, barras e linhas), sem mapa de bolhas, rosa ou barras em círculo.
 */
export const filtroDe = (ctx: CockpitCtx) => ({ cityId: ctx.cidadeId, modalidade: ctx.modalidade });
export const porIds = (ctx: CockpitCtx, ids: string[]) => ids.map(id => ctx.profissionais.modelo.porId.get(id)).filter((row): row is Profissional => Boolean(row));
const dataBr = (value: string) => value.split('-').reverse().join('/');
/** Abre a lista de profissionais de um item clicado. */
export function abrirProfissionais(ctx: CockpitCtx, title: string, rows: Profissional[], what: string, use?: string, eyebrow?: string) {
  if (!rows.length) return;
  ctx.open({ kind: 'linhas', title, what, use, eyebrow, listTitle: 'Profissionais', rows: linhasProfissionais(ctx, rows, row => ({ value: situacaoEm(row, ctx.anchor) ?? '—', note: `registro em ${dataBr(row.registroEm)}`, sort: -Date.parse(row.registroEm) })) });
}
const legenda = (tokens: CockpitCtx['tokens']) => ({ top: 0, left: 0, itemWidth: 10, itemHeight: 8, itemGap: 10, textStyle: { color: tokens.muted, fontSize: 10.5 } });
const delta = (value: number | null) => value === null ? '—' : `${value >= 0 ? '+' : ''}${pct(value)}`;

/* ---------- Registro ---------- */
export type MetricaMapa = 'ativos' | 'variacao' | 'novos' | 'inadimplencia' | 'mulheres' | 'sessenta' | 'arts' | 'semArt' | 'rt';
type Lista = 'ativos' | 'novos' | 'inadimplentes' | 'sessenta' | 'semArt' | 'rts';
export const metricasMapa: Record<MetricaMapa, { label: string; get: (row: RegionalProfissionais) => number | null; fmt: (value: number) => string; alerta?: boolean; menorPrimeiro?: boolean; lista: Lista; what: string }> = {
  ativos: { label: 'Profissionais ativos', get: row => row.ativos.length, fmt: int, lista: 'ativos', what: 'Profissionais com registro ativo nesta regional na data escolhida.' },
  variacao: { label: 'Variação em um ano', get: row => row.variacao, fmt: delta, menorPrimeiro: true, lista: 'ativos', what: 'Profissionais com registro ativo nesta regional na data escolhida.' },
  novos: { label: 'Registros novos a cada 100 ativos', get: row => row.novosPorCem, fmt: value => value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }), menorPrimeiro: true, lista: 'novos', what: 'Profissionais desta regional que fizeram o registro no período escolhido.' },
  inadimplencia: { label: 'Anuidade atrasada', get: row => row.inadimplencia, fmt: value => pct(value), alerta: true, lista: 'inadimplentes', what: 'Profissionais ativos desta regional com anuidade vencida na data escolhida.' },
  mulheres: { label: 'Mulheres entre os ativos', get: row => row.mulheres, fmt: value => pct(value), menorPrimeiro: true, lista: 'ativos', what: 'Profissionais com registro ativo nesta regional na data escolhida.' },
  sessenta: { label: 'Ativos com 60 anos ou mais', get: row => row.sessentaParte, fmt: value => pct(value), alerta: true, lista: 'sessenta', what: 'Profissionais ativos desta regional com 60 anos ou mais na data escolhida.' },
  arts: { label: 'ARTs a cada 100 ativos', get: row => row.artsPorCem, fmt: value => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 }), menorPrimeiro: true, lista: 'ativos', what: 'Profissionais com registro ativo nesta regional na data escolhida.' },
  semArt: { label: 'Ativos sem ART no período', get: row => row.semArtParte, fmt: value => pct(value), alerta: true, lista: 'semArt', what: 'Profissionais ativos desta regional que não registraram nenhuma ART como autor no período.' },
  rt: { label: 'Responsáveis técnicos a cada 100 ativos', get: row => row.rtPorCem, fmt: value => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 }), menorPrimeiro: true, lista: 'rts', what: 'Profissionais ativos desta regional que são responsáveis técnicos de pelo menos uma empresa.' },
};
const rampaMapa = (alerta: boolean, dark: boolean) => alerta
  ? (dark ? ['#3A2E22', '#7A5A10', '#C9851F', '#E5703B', '#FF7B7B'] : ['#FFF4D6', '#FFD98A', '#F6AD55', '#E5703B', '#C53030'])
  : (dark ? ['#1A2D52', '#2F548C', '#4A7FC1', '#7FB0E6', '#D4EDFF'] : ['#EAF1FA', '#BBD5F2', '#7FB0E6', '#3182CE', '#082D74']);

/** Mapa do estado com o limite de cada município, pintado pela regional no indicador escolhido, e as regionais em ordem ao lado. */
export function MapaProfissionais({ ctx, metrica }: { ctx: CockpitCtx; metrica: MetricaMapa }) {
  const centroids = useSpMap(), { tokens, dark } = ctx, config = metricasMapa[metrica];
  const [destaque, setDestaque] = useState<string | null>(null);
  const regioes = useMemo(() => centroids ? territorioGre(ctx.dataset, centroids) : null, [centroids, ctx.dataset]);
  const rotulos = useMemo(() => regioes && centroids ? rotulosGre(regioes, centroids) : null, [regioes, centroids]);
  const t = useMemo(() => regionaisProfissionais(ctx.profissionais.modelo, ctx.dataset, ctx.period, filtroDe(ctx)), [ctx.profissionais.modelo, ctx.dataset, ctx.period, ctx.modalidade]); // eslint-disable-line react-hooks/exhaustive-deps
  const linhas = t.linhas, porId = useMemo(() => new Map(linhas.map(row => [row.id, row])), [linhas]);
  const cidadePorNome = useMemo(() => new Map(ctx.dataset.cities.map(row => [row.name, row])), [ctx.dataset]);
  const cidade = ctx.cidadeId ? ctx.dataset.cities.find(row => row.id === ctx.cidadeId) : undefined;
  const classes = useMemo(() => {
    const rows = linhas.filter(row => config.get(row) !== null).sort((a, b) => config.get(a)! - config.get(b)!), cores = rampaMapa(Boolean(config.alerta), dark);
    const cls = new Map(rows.map((row, index) => [row.id, Math.min(4, Math.floor(index / rows.length * 5))]));
    const faixas = cores.map((cor, index) => { const membros = rows.filter(row => cls.get(row.id) === index).map(row => config.get(row)!); return { cor, min: membros.length ? Math.min(...membros) : null, max: membros.length ? Math.max(...membros) : null }; });
    return { cls, cores, faixas };
  }, [linhas, config, dark]);
  const cor = (greId: string) => { const index = classes.cls.get(greId); return index === undefined ? tokens.line : classes.cores[index]; };
  const ranking = [...linhas].filter(row => config.get(row) !== null).sort((a, b) => config.menorPrimeiro ? config.get(a)! - config.get(b)! : config.get(b)! - config.get(a)!);
  const maximo = Math.max(...ranking.map(row => Math.abs(config.get(row)!)), 1);
  const option = useMemo(() => {
    if (!regioes || !rotulos || !centroids) return null;
    const foco = cidade ? { center: centroids.get(cidade.name), zoom: 3.2 } : ctx.greId ? { center: rotulos.get(ctx.greId), zoom: 2.2 } : null;
    const dica = (nome: string, greId: string) => { const row = porId.get(greId); if (!row) return nome; const value = config.get(row), local = cidadePorNome.get(nome), noLocal = local ? t.cidades.get(local.id) ?? 0 : null;
      return `<b>${nome}</b> · ${row.name}<br/>${config.label} na regional: <b>${value === null ? '—' : config.fmt(value)}</b>${noLocal !== null ? `<br/>No município: ${int(noLocal)} profissionais ativos` : ''}<br/><span style="opacity:.8">${int(row.ativos.length)} ativos · ${delta(row.variacao)} em um ano · ${row.inadimplencia === null ? '—' : pct(row.inadimplencia)} com anuidade atrasada</span><br/><span style="opacity:.7">clique para ver os profissionais</span>`; };
    return {
      tooltip: { trigger: 'item', formatter: (item: any) => item.componentType === 'geo' ? dica(item.name, regioes.get(item.name) ?? '') : dica(porId.get(item.data?.greId)?.name ?? '', item.data?.greId ?? '') },
      geo: { map: 'spPainel', roam: true, scaleLimit: { min: 1, max: 8 }, ...(foco?.center ? { center: foco.center, zoom: foco.zoom } : { left: 2, right: 2, top: 2, bottom: 2 }), selectedMode: false, tooltip: { show: true },
        itemStyle: { areaColor: tokens.soft, borderColor: tokens.surface, borderWidth: 0.35 }, emphasis: { itemStyle: { areaColor: tokens.accent }, label: { show: false } },
        regions: [...regioes].map(([name, greId]) => { const apagado = destaque ? destaque !== greId : Boolean(ctx.greId && ctx.greId !== greId), escolhido = cidade?.name === name;
          return { name, itemStyle: { areaColor: cor(greId), opacity: apagado ? 0.3 : 1, borderColor: escolhido ? tokens.ink : tokens.surface, borderWidth: escolhido ? 1.6 : 0.35 } }; }) },
      series: [{ type: 'scatter', coordinateSystem: 'geo', symbolSize: 1, itemStyle: { color: 'transparent' }, silent: true,
        data: [...rotulos].map(([greId, at]) => { const row = porId.get(greId), value = row ? config.get(row) : null; return { name: row?.curto ?? greId, greId, valor: value === null ? '—' : config.fmt(value), value: at }; }),
        label: { show: true, formatter: (item: any) => `{n|${item.name}}\n{v|${item.data.valor}}`, rich: { n: { color: '#1A202C', fontSize: 9.5, fontWeight: 700, textBorderColor: 'rgba(255,255,255,.85)', textBorderWidth: 2.5 }, v: { color: '#1A202C', fontSize: 10.5, fontWeight: 800, textBorderColor: 'rgba(255,255,255,.85)', textBorderWidth: 2.5 } } },
        labelLayout: { hideOverlap: true } }],
    };
  }, [regioes, rotulos, centroids, classes, config, tokens, destaque, ctx.greId, cidade, porId, cidadePorNome, t]); // eslint-disable-line react-hooks/exhaustive-deps
  const abrir = (greId: string | undefined) => { const row = greId ? porId.get(greId) : undefined; if (!row) return;
    const rows = config.lista === 'novos' ? row.novos : config.lista === 'inadimplentes' ? row.inadimplentes : config.lista === 'sessenta' ? row.sessenta : config.lista === 'semArt' ? row.semArt : config.lista === 'rts' ? row.rts : row.ativos;
    abrirProfissionais(ctx, `${row.name}: ${config.label.toLowerCase()}`, rows, config.what); };
  return <div className="geo-layout is-compacto">
    <div className="geo-map">{option ? <Chart option={option} tokens={tokens} label={`Mapa das regionais por município: ${config.label}`} onPick={params => abrir(params.componentType === 'geo' ? regioes?.get(params.name) : params.data?.greId)} /> : <div className="loading">Carregando o mapa…</div>}
      <ul className="geo-legend" aria-label="Faixas do mapa">{classes.faixas.map((item, index) => <li key={index}><i style={{ background: item.cor }} />{item.min === null ? '—' : item.min === item.max ? config.fmt(item.min) : `${config.fmt(item.min)} a ${config.fmt(item.max!)}`}</li>)}</ul></div>
    <ol className="geo-rank" onMouseLeave={() => setDestaque(null)} aria-label={`Regionais por ${config.label}`}>{ranking.map(row => { const value = config.get(row)!;
      return <li key={row.id}><button onClick={() => abrir(row.id)} onMouseEnter={() => setDestaque(row.id)} onFocus={() => setDestaque(row.id)} className={ctx.greId === row.id ? 'is-selected' : ''}>
        <i style={{ background: cor(row.id) }} /><span>{row.curto}</span><b>{config.fmt(value)}</b><em style={{ width: `${Math.abs(value) / maximo * 100}%` }} /></button></li>; })}</ol>
  </div>;
}

/** Cor da variação em um ano: vermelho para queda, cinza perto de zero, azul para alta. */
// Tecnólogo em âmbar escuro, para o texto branco continuar legível (o amarelo da marca não dá contraste).
const corNivel = (nivel: string, tokens: CockpitCtx['tokens']) => nivel === 'Engenheiro' ? tokens.blue : nivel === 'Técnico' ? tokens.good : '#B7791F';
/** Mapa de árvore: cada retângulo grande é uma modalidade, e os de dentro são os níveis (uma cor por nível). Tamanho = ativos. A variação em um ano vai escrita. */
export function ArvoreModalidade({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, dark } = ctx, ramos = useMemo(() => modalidadeNivel(ctx.profissionais.modelo, ctx.dataset, ctx.greId, filtroDe(ctx)), [ctx.profissionais.modelo, ctx.dataset, ctx.greId, ctx.cidadeId, ctx.modalidade]); // eslint-disable-line react-hooks/exhaustive-deps
  const option = useMemo(() => ({
    title: { text: '{a|■} engenheiros   {b|■} técnicos   {c|■} tecnólogos   ·   tamanho = ativos', left: 0, top: 0, textStyle: { fontSize: 10, fontWeight: 400, color: tokens.muted, rich: { a: { color: corNivel('Engenheiro', tokens), fontSize: 12 }, b: { color: corNivel('Técnico', tokens), fontSize: 12 }, c: { color: corNivel('Tecnólogo', tokens), fontSize: 12 } } } },
    tooltip: { formatter: (item: any) => { const d = item.data; if (d?.celula) { const c = d.celula; return `<b>${c.modalidade}</b> · ${c.nivel}s<br/>${int(c.ativos.length)} ativos · ${delta(c.variacao)} em um ano<br/><span style="opacity:.75">clique para ver os profissionais</span>`; }
      return d?.ramo ? `<b>${d.name}</b><br/>${int(d.ramo.ativos)} ativos · ${delta(d.ramo.antes ? (d.ramo.ativos - d.ramo.antes) / d.ramo.antes * 100 : null)} em um ano` : ''; } },
    series: [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, left: 0, right: 0, top: 20, bottom: 0, squareRatio: 1.3,
      upperLabel: { show: true, height: 18, color: '#FFFFFF', fontSize: 10.5, fontWeight: 700, formatter: (item: any) => item.data?.ramo ? `${item.name} · ${int(item.data.ramo.ativos)}` : item.name },
      levels: [{ itemStyle: { borderColor: tokens.surface, borderWidth: 0, gapWidth: 3 } }, { itemStyle: { borderColor: dark ? '#1A2D52' : '#01224D', borderWidth: 2, gapWidth: 1 }, upperLabel: { show: true } }, { itemStyle: { borderColor: tokens.surface, borderWidth: 1, gapWidth: 1 } }],
      label: { show: true, fontSize: 10, color: '#FFFFFF', overflow: 'truncate', lineHeight: 13, formatter: (item: any) => { const c = item.data?.celula; return c ? `${c.nivel}s\n{n|${int(c.ativos.length)}}\n{v|${delta(c.variacao)} em um ano}` : item.name; }, rich: { n: { fontSize: 12.5, fontWeight: 800, color: '#FFFFFF' }, v: { fontSize: 9.5, color: 'rgba(255,255,255,.9)' } } },
      data: ramos.map(ramo => ({ name: ramo.modalidade, value: ramo.ativos, ramo, itemStyle: { color: dark ? '#1A2D52' : '#01224D' },
        children: ramo.niveis.map(celula => ({ name: `${ramo.modalidade} ${celula.nivel}`, value: celula.ativos.length, celula, itemStyle: { color: corNivel(celula.nivel, tokens) } })) })) }],
  }), [ramos, tokens, dark]);
  return <Chart option={option} tokens={tokens} label="Profissionais ativos por modalidade e nível, com a variação em um ano" onPick={params => { const d = params.data; if (!d) return;
    if (d.celula) abrirProfissionais(ctx, `${d.celula.modalidade}: ${d.celula.nivel.toLowerCase()}s ativos`, d.celula.ativos, 'Profissionais com registro ativo nesta modalidade e neste nível na data escolhida.');
    else if (d.ramo) abrirProfissionais(ctx, `${d.name}: ativos`, d.ramo.niveis.flatMap((row: { ativos: Profissional[] }) => row.ativos), 'Profissionais com registro ativo nesta modalidade na data escolhida.'); }} />;
}

/** Um anel só, com os registrados em quatro situações: ativo em dia, ativo com anuidade atrasada, interrompido e cancelado. */
export function SituacaoAnuidade({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, p = ctx.profissionais.resumo, atrasados = new Set(p.inadimplentes.map(row => row.id));
  const partes = [{ name: 'Ativo, anuidade em dia', rows: p.ativos.filter(row => !atrasados.has(row.id)), color: tokens.blue }, { name: 'Ativo, anuidade atrasada', rows: p.inadimplentes, color: tokens.warn },
    { name: 'Interrompido', rows: p.interrompidos, color: tokens.muted }, { name: 'Cancelado', rows: p.cancelados, color: tokens.bad }];
  const total = p.registrados.length;
  const option = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (item: any) => `<b>${item.name}</b><br/>${int(item.value)} profissionais · ${pct(item.value / Math.max(1, total) * 100)} dos registrados<br/><span style="opacity:.75">clique para ver</span>` },
    title: { text: int(total), subtext: 'já registrados', left: 'center', top: 'center', itemGap: 2, textStyle: { color: tokens.ink, fontSize: 17, fontWeight: 800, fontFamily: 'Raleway, Lato, sans-serif' }, subtextStyle: { color: tokens.muted, fontSize: 10 } },
    series: [{ type: 'pie', radius: ['50%', '72%'], padAngle: 1.5, itemStyle: { borderRadius: 3, borderColor: tokens.surface, borderWidth: 1 },
      label: { show: true, position: 'outside', fontSize: 10, color: tokens.ink, lineHeight: 13, formatter: (item: any) => `${item.name.replace(', ', ',\n')}\n{b|${pct(item.value / Math.max(1, total) * 100)}}`, rich: { b: { fontWeight: 800, fontSize: 11 } } }, labelLine: { length: 6, length2: 6 },
      data: partes.map(part => ({ name: part.name, value: part.rows.length, itemStyle: { color: part.color } })) }],
  }), [p, tokens, total]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Profissionais pela situação do registro e da anuidade" onPick={params => { const part = partes[params.dataIndex];
    if (part) abrirProfissionais(ctx, `Situação: ${part.name.toLowerCase()}`, part.rows, 'Profissionais nesta situação na data escolhida.', part.name === 'Ativo, anuidade atrasada' ? 'Cobrança por lote, começando pelos que registraram ART recentemente.' : undefined); }} />;
}

/** Pirâmide: mulheres à esquerda e homens à direita, por faixa de idade. */
export function Piramide({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, p = ctx.profissionais.resumo;
  const celulas = useMemo(() => faixasIdade.map(faixa => { const rows = porIds(ctx, p.porIdade.find(row => row.nome === faixa)?.ids ?? []);
    return { faixa, mulheres: rows.filter(row => row.genero === 'Feminino'), homens: rows.filter(row => row.genero === 'Masculino') }; }), [p, ctx]);
  const maximo = Math.max(1, ...celulas.map(row => Math.max(row.mulheres.length, row.homens.length)));
  const option = useMemo(() => ({
    grid: { top: 22, right: 30, bottom: 2, left: 30, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = celulas[items[0].dataIndex]; return `<b>${row.faixa} anos</b><br/>${int(row.mulheres.length)} mulheres · ${int(row.homens.length)} homens<br/><span style="opacity:.75">clique para ver</span>`; } },
    xAxis: { type: 'value', min: -maximo, max: maximo, show: false },
    yAxis: { type: 'category', data: celulas.map(row => row.faixa), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: [
      { name: 'Mulheres', type: 'bar', stack: 'p', barWidth: '62%', data: celulas.map(row => -row.mulheres.length), itemStyle: { color: tokens.accent, borderRadius: [4, 0, 0, 4] }, label: { show: true, position: 'left', color: tokens.ink, fontSize: 10, formatter: (params: any) => int(Math.abs(params.value)) } },
      { name: 'Homens', type: 'bar', stack: 'p', barWidth: '62%', data: celulas.map(row => row.homens.length), itemStyle: { color: tokens.blue, borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (params: any) => int(params.value) } },
    ],
  }), [celulas, tokens, maximo]);
  return <Chart option={option} tokens={tokens} label="Profissionais ativos por faixa de idade e gênero" onPick={params => { const row = celulas[params.dataIndex]; if (!row) return; const mulheres = params.seriesName === 'Mulheres';
    abrirProfissionais(ctx, `${row.faixa} anos: ${mulheres ? 'mulheres' : 'homens'}`, mulheres ? row.mulheres : row.homens, 'Profissionais ativos nesta faixa de idade e gênero.'); }} />;
}

/** Matriz de calor: modalidades nas linhas, faixas de idade nas colunas; cada célula é o número de ativos. */
export function IdadeModalidade({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, dark } = ctx, ativos = ctx.profissionais.resumo.ativos, anchor = ctx.anchor;
  const m = useMemo(() => { const linhas = [...new Set(ativos.map(row => row.modalidade))].sort((a, b) => ativos.filter(row => row.modalidade === b).length - ativos.filter(row => row.modalidade === a).length);
    const celulas = linhas.flatMap((modalidade, y) => faixasIdade.map((faixa, x) => { const rows = ativos.filter(row => row.modalidade === modalidade && faixaIdade(idadeEm(row, anchor)) === faixa); const total = ativos.filter(row => row.modalidade === modalidade).length; return { x, y, modalidade, faixa, rows, parte: total ? rows.length / total * 100 : 0 }; }));
    return { linhas, celulas }; }, [ativos, anchor]);
  const option = useMemo(() => ({
    grid: { top: 4, right: 4, bottom: 18, left: 4, containLabel: true },
    tooltip: { formatter: (item: any) => { const cel = m.celulas[item.dataIndex]; return `<b>${cel.modalidade}</b>, ${cel.faixa} anos<br/>${int(cel.rows.length)} ativos · ${pct(cel.parte)} da modalidade<br/><span style="opacity:.75">clique para ver</span>`; } },
    xAxis: { type: 'category', position: 'bottom', data: faixasIdade.map(faixa => `${faixa} anos`), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.muted, fontSize: 9.5, interval: 0 } },
    yAxis: { type: 'category', inverse: true, data: m.linhas, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10 } },
    visualMap: { show: false, min: 0, max: 40, inRange: { color: dark ? ['#13233F', '#2F548C', '#7FB0E6'] : ['#EAF1FA', '#7FB0E6', '#082D74'] } },
    series: [{ type: 'heatmap', data: m.celulas.map(cel => ({ value: [cel.x, cel.y, cel.parte], label: { color: !dark && cel.parte > 24 ? '#FFFFFF' : tokens.ink } })), itemStyle: { borderColor: tokens.surface, borderWidth: 2, borderRadius: 4 },
      label: { show: true, fontSize: 10, fontWeight: 700, formatter: (item: any) => item.value[2] ? pct(item.value[2]) : '' } }],
  }), [m, tokens, dark]);
  return <Chart option={option} tokens={tokens} label="Profissionais ativos por modalidade e faixa de idade" onPick={params => { const cel = m.celulas[params.dataIndex]; if (cel) abrirProfissionais(ctx, `${cel.modalidade}, ${cel.faixa} anos`, cel.rows, 'Profissionais ativos desta modalidade nesta faixa de idade.'); }} />;
}

/* ---------- Evolução ---------- */
export const useFluxo = (ctx: CockpitCtx) => useMemo(() => fluxoMensal(ctx.profissionais.modelo, ctx.dataset, ctx.greId, filtroDe(ctx), 24), [ctx.profissionais.modelo, ctx.dataset, ctx.greId, ctx.cidadeId, ctx.modalidade]); // eslint-disable-line react-hooks/exhaustive-deps
/** Entradas para cima, saídas para baixo, mês a mês, com o período escolhido destacado e a linha do saldo. */
export function EntradasSaidasMes({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, janela } = ctx, rows = useFluxo(ctx);
  const option = useMemo(() => ({
    grid: { top: 26, right: 6, bottom: 2, left: 4, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex], saldo = row.novos.length + row.reativacoes.length - row.cancelamentos.length - row.interrupcoes.length;
      return `<b>${mes(row.month)}</b><br/>Registros novos: ${int(row.novos.length)} · voltaram: ${int(row.reativacoes.length)}<br/>Interromperam: ${int(row.interrupcoes.length)} · cancelaram: ${int(row.cancelamentos.length)}<br/>Saldo: <b>${saldo >= 0 ? '+' : ''}${int(saldo)}</b><br/><span style="opacity:.75">clique para ver os profissionais</span>`; } },
    xAxis: { type: 'category', data: rows.map(row => mes(row.month)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, interval: 2, fontSize: 10 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: (value: number) => int(Math.abs(value)) } },
    series: [
      { name: 'Registros novos', type: 'bar', stack: 'f', barWidth: '58%', data: rows.map(row => row.novos.length), itemStyle: { color: tokens.blue },
        markArea: { silent: true, itemStyle: { color: tokens.blue, opacity: 0.07 }, data: [[{ xAxis: mes(janela.start.slice(0, 7)) }, { xAxis: mes(janela.end.slice(0, 7)) }]] } },
      { name: 'Voltaram', type: 'bar', stack: 'f', data: rows.map(row => row.reativacoes.length), itemStyle: { color: tokens.heat[1], borderRadius: [3, 3, 0, 0] } },
      { name: 'Interromperam', type: 'bar', stack: 'f', data: rows.map(row => -row.interrupcoes.length), itemStyle: { color: tokens.warn } },
      { name: 'Cancelaram', type: 'bar', stack: 'f', data: rows.map(row => -row.cancelamentos.length), itemStyle: { color: tokens.bad, borderRadius: [0, 0, 3, 3] } },
      { name: 'Saldo', type: 'line', data: rows.map(row => row.novos.length + row.reativacoes.length - row.cancelamentos.length - row.interrupcoes.length), smooth: 0.3, symbol: 'circle', symbolSize: 4, lineStyle: { color: tokens.ink, width: 1.6 }, itemStyle: { color: tokens.ink } },
    ],
  }), [rows, tokens, janela]);
  return <Chart option={option} tokens={tokens} label="Entradas e saídas do registro profissional por mês" onPick={params => { const row = rows[params.dataIndex]; if (!row) return;
    const campo = params.seriesName === 'Voltaram' ? 'reativacoes' : params.seriesName === 'Interromperam' ? 'interrupcoes' : params.seriesName === 'Cancelaram' ? 'cancelamentos' : 'novos';
    const textos = { novos: 'fizeram o registro', reativacoes: 'voltaram depois de uma interrupção', interrupcoes: 'interromperam o registro', cancelamentos: 'cancelaram o registro' };
    abrirProfissionais(ctx, `${mes(row.month)}: ${textos[campo]}`, porIds(ctx, row[campo]), `Profissionais que ${textos[campo]} neste mês.`); }} />;
}

/** Ponte dos ativos: quantos eram ativos no início do período, o que entrou, o que saiu e quantos são ativos na data escolhida. */
export function PonteAtivos({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, t = useMemo(() => transicoes(ctx.profissionais.modelo, ctx.dataset, ctx.period, ctx.greId, filtroDe(ctx)), [ctx.profissionais.modelo, ctx.dataset, ctx.period, ctx.greId, ctx.cidadeId, ctx.modalidade]); // eslint-disable-line react-hooks/exhaustive-deps
  const passos = useMemo(() => {
    const ids = (filtro: (row: { de: string; para: string }) => boolean) => t.fluxos.filter(filtro).flatMap(row => row.ids);
    const antes = ativosNoInicio(ctx.profissionais.modelo, ctx.dataset, ctx.period, ctx.greId, filtroDe(ctx)).ativos;
    const passos = [
      { nome: `Ativos em ${dataBr(t.antes)}`, tipo: 'total' as const, ids: antes.map(row => row.id), cor: tokens.heat[2] },
      { nome: 'Registros novos', tipo: 'mais' as const, ids: ids(row => row.de === 'Sem registro' && row.para === 'Ativo'), cor: tokens.good },
      { nome: 'Voltaram a ficar ativos', tipo: 'mais' as const, ids: ids(row => row.de !== 'Sem registro' && row.de !== 'Ativo' && row.para === 'Ativo'), cor: tokens.good },
      { nome: 'Interromperam', tipo: 'menos' as const, ids: ids(row => row.de === 'Ativo' && row.para === 'Interrompido'), cor: tokens.warn },
      { nome: 'Cancelaram', tipo: 'menos' as const, ids: ids(row => row.de === 'Ativo' && row.para === 'Cancelado'), cor: tokens.bad },
    ];
    const final = passos.reduce((n, row) => row.tipo === 'menos' ? n - row.ids.length : n + row.ids.length, 0);
    return [...passos, { nome: 'Ativos na data escolhida', tipo: 'total' as const, ids: ctx.profissionais.resumo.ativos.map(row => row.id), cor: tokens.blue, conta: final }];
  }, [t, ctx.profissionais, ctx.greId, ctx.cidadeId, ctx.modalidade, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  const bases: number[] = []; let nivel = 0;
  for (const passo of passos) { if (passo.tipo === 'total') { bases.push(0); nivel = passo.ids.length; } else if (passo.tipo === 'mais') { bases.push(nivel); nivel += passo.ids.length; } else { nivel -= passo.ids.length; bases.push(nivel); } }
  const menor = Math.min(...passos.filter(row => row.tipo === 'total').map(row => row.ids.length), ...bases.filter(Boolean));
  const piso = Math.max(0, Math.floor(menor * 0.85 / 100) * 100);
  const option = useMemo(() => ({
    grid: { top: 14, right: 6, bottom: 2, left: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = passos[items[0].dataIndex]; return `<b>${row.nome}</b><br/>${row.tipo === 'menos' ? '−' : row.tipo === 'mais' ? '+' : ''}${int(row.ids.length)} profissionais<br/><span style="opacity:.75">clique para ver</span>`; } },
    xAxis: { type: 'category', data: passos.map(row => row.nome), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.ink, fontSize: 10, interval: 0, width: 92, overflow: 'break', lineHeight: 12 } },
    yAxis: { type: 'value', min: piso, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: (value: number) => int(value) } },
    series: [
      { type: 'bar', stack: 'p', silent: true, data: passos.map((row, index) => row.tipo === 'total' ? piso : bases[index]), itemStyle: { color: 'transparent' } },
      { type: 'bar', stack: 'p', barWidth: '56%', data: passos.map(row => ({ value: row.tipo === 'total' ? row.ids.length - piso : row.ids.length, itemStyle: { color: row.cor, borderRadius: 3 } })),
        label: { show: true, position: 'top', color: tokens.ink, fontSize: 11, fontWeight: 800, formatter: (item: any) => { const row = passos[item.dataIndex]; return `${row.tipo === 'menos' ? '−' : row.tipo === 'mais' ? '+' : ''}${int(row.ids.length)}`; } } },
    ],
  }), [passos, bases, piso, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Ponte dos profissionais ativos do início do período até a data escolhida" onPick={params => { const row = passos[params.dataIndex]; if (row) abrirProfissionais(ctx, row.nome, porIds(ctx, row.ids), 'Profissionais desta etapa da ponte, do início do período até a data escolhida.'); }} />;
}

/** Registros novos por modalidade: o período escolhido ao lado do mesmo período um ano antes. */
export function NovosModalidade({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, n = ctx.period, r = useMemo(() => novosPorModalidade(ctx.profissionais.modelo, ctx.dataset, ctx.greId, filtroDe(ctx), n + 12), [ctx.profissionais.modelo, ctx.dataset, ctx.greId, ctx.cidadeId, ctx.modalidade, n]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => { const agora = r.meses.slice(-n), antes = r.meses.slice(0, n);
    return r.linhas.map(linha => ({ modalidade: linha.modalidade, agora: agora.flatMap(month => linha.porMes.get(month) ?? []), antes: antes.flatMap(month => linha.porMes.get(month) ?? []).length }))
      .filter(row => row.agora.length || row.antes).sort((a, b) => b.agora.length - a.agora.length); }, [r, n]);
  const option = useMemo(() => ({
    grid: { top: 24, right: 70, bottom: 2, left: 2, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.modalidade}</b><br/>${int(row.agora.length)} registros novos no período · ${int(row.antes)} um ano antes<br/><span style="opacity:.75">clique para ver os profissionais</span>`; } },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => row.modalidade), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: [
      { name: 'No período', type: 'bar', barWidth: '34%', barGap: '10%', data: rows.map(row => row.agora.length), itemStyle: { color: tokens.blue, borderRadius: [0, 3, 3, 0] },
        label: { show: true, position: 'right', color: tokens.ink, fontSize: 10.5, fontWeight: 700, formatter: (item: any) => { const row = rows[item.dataIndex]; const v = row.antes ? (row.agora.length - row.antes) / row.antes * 100 : null; return `${int(row.agora.length)}  {d|${v === null ? '' : delta(v)}}`; }, rich: { d: { color: tokens.muted, fontSize: 9.5, fontWeight: 400 } } } },
      { name: 'Mesmo período um ano antes', type: 'bar', barWidth: '34%', data: rows.map(row => row.antes), itemStyle: { color: tokens.line, borderRadius: [0, 3, 3, 0] } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Registros novos por modalidade, no período e um ano antes" onPick={params => { const row = rows[params.dataIndex]; if (row?.agora.length) abrirProfissionais(ctx, `${row.modalidade}: registros novos no período`, row.agora, 'Profissionais desta modalidade que fizeram o registro no período escolhido.'); }} />;
}

/** Por ano de registro: barras com quantos se registraram e a linha com a parte que continua ativa. */
export function PermanenciaAno({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => permanenciaPorAno(ctx.profissionais.modelo, ctx.dataset, ctx.greId, filtroDe(ctx), 15), [ctx.profissionais.modelo, ctx.dataset, ctx.greId, ctx.cidadeId, ctx.modalidade]); // eslint-disable-line react-hooks/exhaustive-deps
  const option = useMemo(() => ({
    grid: { top: 26, right: 4, bottom: 2, left: 4, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>Registrados em ${row.ano}</b><br/>${int(row.registrados.length)} profissionais · ${int(row.ativos.length)} continuam ativos (${row.parte === null ? '—' : pct(row.parte)})<br/><span style="opacity:.75">clique para ver</span>`; } },
    xAxis: { type: 'category', data: rows.map(row => String(row.ano)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10, interval: 1 } },
    yAxis: [{ type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } }, { type: 'value', min: 0, max: 100, splitLine: { show: false }, axisLabel: { color: tokens.muted, formatter: '{value}%' } }],
    series: [
      { name: 'Continuam ativos', type: 'bar', stack: 'a', barWidth: '58%', data: rows.map(row => row.ativos.length), itemStyle: { color: tokens.blue } },
      { name: 'Não estão mais ativos', type: 'bar', stack: 'a', data: rows.map(row => row.fora.length), itemStyle: { color: tokens.line, borderRadius: [3, 3, 0, 0] } },
      { name: 'Parte ativa', type: 'line', yAxisIndex: 1, data: rows.map(row => row.parte), symbol: 'circle', symbolSize: 5, lineStyle: { color: tokens.accent, width: 2 }, itemStyle: { color: tokens.accent } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Profissionais por ano de registro e a parte que continua ativa" onPick={params => { const row = rows[params.dataIndex]; if (!row) return; const fora = params.seriesName === 'Não estão mais ativos';
    abrirProfissionais(ctx, `Registrados em ${row.ano}: ${fora ? 'não estão mais ativos' : 'continuam ativos'}`, fora ? row.fora : row.ativos, `Profissionais que fizeram o registro em ${row.ano}, pela situação na data escolhida.`); }} />;
}

/* ---------- ART e RT ---------- */
/** ARTs a cada 100 profissionais ativos de cada modalidade, com a média. Modalidade sem ART no período fica de fora. */
export function ArtsModalidade({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, p = ctx.profissionais.resumo, rows = useMemo(() => p.artsPorModalidade.filter(row => row.arts > 0 && row.porCem !== null).sort((a, b) => b.porCem! - a.porCem!), [p]);
  const media = (() => { const arts = rows.reduce((t, row) => t + row.arts, 0), ativos = rows.reduce((t, row) => t + row.ativos, 0); return ativos ? arts / ativos * 100 : null; })();
  const option = useMemo(() => ({
    grid: { top: 16, right: 40, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.modalidade}</b><br/><b>${row.porCem!.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</b> ARTs a cada 100 ativos<br/>${int(row.arts)} ARTs no período · ${int(row.ativos)} ativos<br/><span style="opacity:.75">clique para ver os ativos sem ART</span>`; } },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => row.modalidade), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: [{ type: 'bar', barWidth: '58%', barMaxWidth: 28, data: rows.map(row => ({ value: row.porCem, itemStyle: { color: media !== null && row.porCem! >= media ? tokens.blue : tokens.heat[1], borderRadius: [0, 3, 3, 0] } })),
      label: { show: true, position: 'right', color: tokens.ink, fontSize: 10.5, fontWeight: 700, formatter: (item: any) => item.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) },
      markLine: media === null ? undefined : { silent: true, symbol: 'none', lineStyle: { color: tokens.ink, type: 'dashed', width: 1 }, label: { position: 'start', color: tokens.muted, fontSize: 9.5, formatter: `média de todas: ${media.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` }, data: [{ xAxis: media }] } }],
  }), [rows, media, tokens]);
  return <Chart option={option} tokens={tokens} label="ARTs a cada 100 profissionais ativos, por modalidade" onPick={params => { const row = rows[params.dataIndex]; if (!row) return;
    const autores = new Set(p.arts.map(art => ctx.profissionais.modelo.autoria.get(art.id)));
    abrirProfissionais(ctx, `${row.modalidade}: ativos sem ART no período`, p.ativos.filter(item => item.modalidade === row.modalidade && !autores.has(item.id)), 'Profissionais ativos desta modalidade que não registraram nenhuma ART como autor no período.', 'Pode ser trabalho sem ART (ensino, setor público, empregado) ou atividade parada. Não é indício sozinho.'); }} />;
}

/** ARTs dos últimos 12 meses, em barras, e a linha com o mesmo mês um ano antes. */
export function ArtsMes({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, r = useMemo(() => artsMensaisPorModalidade(ctx.profissionais.modelo, ctx.dataset, ctx.greId, filtroDe(ctx), 24), [ctx.profissionais.modelo, ctx.dataset, ctx.greId, ctx.cidadeId, ctx.modalidade]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => r.meses.slice(12).map((month, index) => ({ month, agora: r.series.reduce((n, serie) => n + serie.valores[index + 12], 0), antes: r.series.reduce((n, serie) => n + serie.valores[index], 0) })), [r]);
  const option = useMemo(() => ({
    grid: { top: 26, right: 6, bottom: 2, left: 4, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; const v = row.antes ? (row.agora - row.antes) / row.antes * 100 : null; return `<b>${mes(row.month)}</b><br/>${int(row.agora)} ARTs · ${int(row.antes)} no mesmo mês um ano antes (${delta(v)})`; } },
    xAxis: { type: 'category', data: rows.map(row => mes(row.month)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
    series: [
      { name: 'ARTs no mês', type: 'bar', barWidth: '58%', data: rows.map(row => row.agora), itemStyle: { color: tokens.blue, borderRadius: [3, 3, 0, 0] }, label: { show: true, position: 'insideTop', color: '#FFFFFF', fontSize: 9.5, fontWeight: 700 } },
      { name: 'Mesmo mês um ano antes', type: 'line', data: rows.map(row => row.antes), symbol: 'circle', symbolSize: 5, lineStyle: { color: tokens.accent, width: 2 }, itemStyle: { color: tokens.accent } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="ARTs por mês nos últimos 12 meses, com o mesmo mês um ano antes" />;
}

/** Profissionais ativos pela quantidade de ARTs no período, e a lista dos que mais registraram ao lado. */
export function Concentracao({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, p = ctx.profissionais.resumo, faixas = p.faixasArt;
  const option = useMemo(() => ({
    grid: { top: 4, right: 40, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>${items[0].name} ART${items[0].name === '1 a 2' ? '' : 's'}</b><br/>${int(items[0].value)} profissionais ativos<br/><span style="opacity:.75">clique para ver</span>` },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: faixas.map(row => row.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: [{ type: 'bar', barWidth: '56%', data: faixas.map((row, index) => ({ value: row.ids.length, itemStyle: { color: index === 0 ? tokens.line : tokens.heat[2], borderRadius: [0, 4, 4, 0] } })), label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, fontWeight: 700, formatter: (params: any) => int(params.value) } }],
  }), [faixas, tokens]);
  return <div className="split is-wide">
    <Chart option={option} tokens={tokens} label="Profissionais ativos por faixa de ARTs no período" onPick={params => { const row = faixas[params.dataIndex]; if (row) abrirProfissionais(ctx, `Ativos com ${row.nome === '4 ou mais' ? '4 ARTs ou mais' : row.nome} no período`, porIds(ctx, row.ids), 'Profissionais ativos nesta faixa de ARTs registradas como autor no período.'); }} />
    <ul className="side-list" aria-label="Autores com mais ARTs"><li className="side-head">Mais ARTs no período</li>{p.top.slice(0, 7).map(row => <li key={row.id}><button className="is-acao" onClick={() => abrirProfissionais(ctx, row.nome, porIds(ctx, [row.id]), `${int(row.arts)} ARTs no período, para ${int(row.empresas)} empresa${row.empresas === 1 ? '' : 's'} distinta${row.empresas === 1 ? '' : 's'}.`)}><span>{row.nome}<small>{int(row.empresas)} empresa{row.empresas === 1 ? '' : 's'}</small></span><b>{int(row.arts)}</b></button></li>)}</ul>
  </div>;
}

/** Responsáveis técnicos pelo número de empresas que assumem; acima de três, em vermelho. */
export function CargaRt({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, p = ctx.profissionais.resumo, rows = p.cargaRt;
  const option = useMemo(() => ({
    grid: { top: 4, right: 70, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>${items[0].name}</b><br/>${int(items[0].value)} responsáveis técnicos<br/><span style="opacity:.75">clique para ver</span>` },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: [{ type: 'bar', barWidth: '56%', data: rows.map((row, index) => ({ value: row.ids.length, itemStyle: { color: index <= 1 ? tokens.good : index === 2 ? tokens.accent : tokens.bad, borderRadius: [0, 4, 4, 0] } })), showBackground: true, backgroundStyle: { color: tokens.soft, borderRadius: 4 },
      label: { show: true, position: 'right', color: tokens.ink, fontSize: 10.5, fontWeight: 700, formatter: (params: any) => `${int(params.value)} · ${pct(params.value / Math.max(1, p.rtAtivos) * 100)}` } }],
  }), [rows, tokens, p.rtAtivos]);
  return <Chart option={option} tokens={tokens} label="Responsáveis técnicos pelo número de empresas" onPick={params => { const row = rows[params.dataIndex]; if (row) abrirProfissionais(ctx, `Responsáveis técnicos de ${row.nome}`, porIds(ctx, row.ids), 'Profissionais com vínculo de responsável técnico vigente neste número de empresas.', params.dataIndex >= 3 ? 'Verificar se há tempo e área de atuação compatíveis antes de qualquer tratativa.' : undefined); }} />;
}

/** Calor: parte dos ativos que registrou ART no período, por modalidade e faixa de idade. */
export function ArtIdade({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, dark } = ctx, a = useMemo(() => artPorIdade(ctx.profissionais.modelo, ctx.dataset, ctx.profissionais.resumo.ativos, ctx.period), [ctx.profissionais.modelo, ctx.dataset, ctx.profissionais.resumo, ctx.period]);
  const option = useMemo(() => ({
    grid: { top: 4, right: 4, bottom: 2, left: 4, containLabel: true },
    tooltip: { formatter: (item: any) => { const cel = a.celulas[item.dataIndex]; return `<b>${cel.modalidade}</b>, ${faixasIdade[cel.faixa]} anos<br/>${int(cel.comArt.length)} de ${int(cel.ativos.length)} ativos registraram ART (${cel.parte === null ? '—' : pct(cel.parte)})<br/><span style="opacity:.75">clique para ver os que registraram</span>`; } },
    xAxis: { type: 'category', position: 'top', data: faixasIdade.map(faixa => `${faixa} anos`), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.muted, fontSize: 9.5, interval: 0 } },
    yAxis: { type: 'category', inverse: true, data: a.linhas, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10 } },
    visualMap: { show: false, min: 0, max: 80, inRange: { color: dark ? ['#13233F', '#7A5A10', '#FABD07'] : ['#FFF8E6', '#F6AD55', '#C05621'] } },
    series: [{ type: 'heatmap', data: a.celulas.map((cel, index) => ({ value: [cel.faixa, a.linhas.indexOf(cel.modalidade), cel.parte ?? 0], index, label: { color: !dark && (cel.parte ?? 0) > 50 ? '#FFFFFF' : tokens.ink } })), itemStyle: { borderColor: tokens.surface, borderWidth: 2, borderRadius: 4 },
      label: { show: true, fontSize: 10, fontWeight: 700, formatter: (item: any) => a.celulas[item.dataIndex].parte === null ? '' : pct(item.value[2]) } }],
  }), [a, tokens, dark]);
  return <Chart option={option} tokens={tokens} label="Parte dos ativos que registrou ART, por modalidade e faixa de idade" onPick={params => { const cel = a.celulas[params.dataIndex]; if (cel) abrirProfissionais(ctx, `${cel.modalidade}, ${faixasIdade[cel.faixa]} anos: registraram ART`, cel.comArt, 'Profissionais ativos desta modalidade e faixa de idade que registraram ao menos uma ART no período.'); }} />;
}
