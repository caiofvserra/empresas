import { useMemo, useState } from 'react';
import { municipioPorId } from '../domain/municipios';
import { Chart, useSpMap, proporcaoSp } from '../painel/chart';
import { brl, data, int, mes, money, pct, short } from '../painel/ui';
import { rotulosGre, territorioGre } from '../painel/territorio';
import { camaraDaEmpresa, camaras, grausVinculo, situacoesFornecedor } from '../painel/analise';
import type { ContratoPublico, GrauVinculo, SituacaoFornecedor } from '../painel/analise';
import { tipoLabel } from '../painel/fiscalizacao';
import type { Acao, Alvo, Origem, StatusMulta, Tipo } from '../painel/fiscalizacao';
import type { ResultadoFt } from '../painel/forcas';
import { tempoAteAgir } from '../observatorio/norte';
import { acoes24, acoesPorOrigem, destinoAcoes, destinos, esperaPorTipo, regionaisFiscalizacao } from '../domain/painel-fiscalizacao';
import type { Destino, Quartis, RegionalFiscal } from '../domain/painel-fiscalizacao';
import { TERMOS_ENGENHARIA, statusAjuda } from '../cockpit/cruzamentos';
import type { Indicio } from '../cockpit/cruzamentos';
import type { CockpitCtx } from '../cockpit/contexto';
import { avisoVazio, carregando, linhasEmpresas, nomeEmpresa } from '../cockpit/ui';
import { classesPorPosto, cnpjComMascara, corDoTexto, rotuloTrimestre } from '../cockpit/formatos';
import { etapasPca } from '../domain/mercado';
import type { PapelCno } from '../domain/parcerias';

/**
 * Blocos do painel de Fiscalização (03/11/2026), com as regras dos painéis de Empresas e de Profissionais: clicar num item abre as
 * empresas, ações ou contratos daquele item, nunca o resumo da regional; regional, município, câmara, período e data são filtros do
 * alto da tela; cada página cabe numa tela sem rolagem; o bloco mostra só o título e o gráfico, e a explicação fica no (i). Todo
 * gráfico mostra o número que importa sem passar o mouse. Os tempos aparecem em boxplot (mediana e metade do meio), e não só em média.
 */
const legenda = (tokens: CockpitCtx['tokens']) => ({ top: 0, left: 0, itemWidth: 10, itemHeight: 8, itemGap: 10, textStyle: { color: tokens.muted, fontSize: 11 } });
/** Série invisível no fim de uma pilha de barras deitadas: escreve o total à direita, e cada parte da pilha mostra o próprio número. */
const serieTotal = (tokens: CockpitCtx['tokens'], stack: string, totais: number[]) => ({ name: 'total', type: 'bar', stack, data: totais.map(() => 0), itemStyle: { color: 'transparent' }, silent: true, tooltip: { show: false },
  label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (item: any) => int(totais[item.dataIndex]) } });
/** O mesmo aviso de recorte vazio do bloco, para os gráficos que só sabem que estão vazios depois de calcular. */
const semDados = (quem: string) => <p className="tile-vazio" role="status">{avisoVazio(true, quem)}</p>;
const dias = (value: number) => `${int(Math.round(value))} dia${Math.round(value) === 1 ? '' : 's'}`;
export const nomeOrigem: Record<Origem, string> = { 'Cruzamento Receita (CNAE)': 'Cruzamento com a Receita', 'Contrato público (PNCP)': 'Contrato público', Denúncia: 'Denúncia', 'Rotina de campo': 'Rotina de campo', 'Cadastro CREA': 'Cadastro do Crea-SP' };
const nomeTipo: Record<Tipo, string> = { registro: 'Falta de registro', rt: 'Responsável técnico que saiu', art: 'Contrato sem ART' };

/** Abre a lista de ações de um item clicado, com o auto, a multa e a regularização. */
export function abrirAcoes(ctx: CockpitCtx, title: string, acoes: Acao[], what: string, use?: string) {
  if (!acoes.length) return;
  const places = new Map(ctx.dataset.establishments.map(row => [row.id, row]));
  ctx.open({ kind: 'linhas', title, what, use, listTitle: 'Ações, maior multa primeiro',
    summary: [['Ações', int(acoes.length)], ['Multas', brl(acoes.reduce((total, row) => total + (row.auto?.valor ?? 0), 0))], ['Regularizadas', pct(acoes.filter(row => row.regularizedAt).length / acoes.length * 100)]],
    rows: acoes.map(acao => ({ key: acao.id, companyId: acao.companyId, title: nomeEmpresa(ctx, acao.companyId), subtitle: `CNPJ ${cnpjComMascara(places.get(acao.establishmentId)?.cnpj ?? '')}, ação em ${data(acao.date)}`,
      value: acao.auto ? money(acao.auto.valor) : acao.regularizedAt ? 'regularizada' : 'notificada', note: `${nomeTipo[acao.tipo]}, por ${nomeOrigem[acao.origem].toLowerCase()}${acao.auto ? `; multa ${acao.auto.status.toLowerCase()}` : ''}${acao.regularizedAt ? `; regularizada em ${data(acao.regularizedAt)}` : ''}`, sortValue: acao.auto?.valor ?? 0 })) });
}
/** Abre a lista de indícios (casos conhecidos) de um item clicado. */
export function abrirAlvos(ctx: CockpitCtx, title: string, alvos: Alvo[], what: string, use?: string) {
  if (!alvos.length) return;
  const places = new Map(ctx.dataset.establishments.map(row => [row.id, row]));
  ctx.open({ kind: 'linhas', title, what, use, listTitle: 'Indícios, mais antigos primeiro',
    rows: alvos.map(alvo => ({ key: alvo.id, companyId: alvo.companyId, title: nomeEmpresa(ctx, alvo.companyId), subtitle: `CNPJ ${cnpjComMascara(places.get(alvo.establishmentId)?.cnpj ?? '')}, desde ${data(alvo.since)}`, value: alvo.acaoId ? 'com ação' : 'sem ação', note: nomeTipo[alvo.tipo], sortValue: -Date.parse(alvo.since) })) });
}
/** Abre a lista de contratos públicos de um item clicado. */
export function abrirContratos(ctx: CockpitCtx, rows: ContratoPublico[], title: string, use?: string) {
  if (!rows.length) return;
  const buyers = new Map(ctx.dataset.buyers.map(row => [row.id, row.name]));
  ctx.open({ kind: 'linhas', title, what: 'Contratos públicos técnicos do período (PNCP), com a situação do fornecedor na data do contrato e a ART encontrada.', use, listTitle: 'Contratos, maior valor primeiro',
    summary: [['Contratos', int(rows.length)], ['Valor', brl(rows.reduce((total, row) => total + row.valor, 0))], ['Empresas', int(new Set(rows.map(row => row.companyId)).size)]],
    rows: rows.map(row => ({ key: row.id, companyId: row.companyId, title: nomeEmpresa(ctx, row.companyId), subtitle: `${buyers.get(row.buyerId) ?? 'Órgão público'}, em ${data(row.data)}`, value: money(row.valor), note: `${row.objeto}; ${row.situacao.toLowerCase()}; ${nomeGrau[row.vinculo].toLowerCase()}`, sortValue: row.valor })) });
}

/* ---------- Ações ---------- */
export type MetricaMapa = 'acoes' | 'porCem' | 'autos' | 'taxa' | 'semAcao' | 'tempo' | 'divida';
export const metricasMapa: Record<MetricaMapa, { label: string; get: (row: RegionalFiscal) => number | null; fmt: (value: number) => string; alerta?: boolean; menorPrimeiro?: boolean }> = {
  acoes: { label: 'Ações no período', get: row => row.acoes.length, fmt: int },
  porCem: { label: 'Ações a cada 100 estabelecimentos de engenharia', get: row => row.porCem, fmt: value => value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }), menorPrimeiro: true },
  autos: { label: 'Autos de infração', get: row => row.autos.length, fmt: int },
  taxa: { label: 'Ações que já regularizaram', get: row => row.taxa, fmt: value => pct(value), menorPrimeiro: true },
  semAcao: { label: 'Indícios ainda sem nenhuma ação', get: row => row.semAcao.length, fmt: int, alerta: true },
  tempo: { label: 'Dias até a primeira ação, no caso típico', get: row => row.tempo, fmt: value => int(value), alerta: true },
  divida: { label: 'Multas inscritas em dívida ativa', get: row => row.valorDivida, fmt: brl, alerta: true },
};
const rampaMapa = (alerta: boolean, dark: boolean) => alerta
  ? (dark ? ['#3A2E22', '#7A5A10', '#C9851F', '#E5703B', '#FF7B7B'] : ['#FFF4D6', '#FFD98A', '#F6AD55', '#E5703B', '#C53030'])
  : (dark ? ['#1A2D52', '#2F548C', '#4A7FC1', '#7FB0E6', '#D4EDFF'] : ['#EAF1FA', '#BBD5F2', '#7FB0E6', '#3182CE', '#082D74']);

/** Mapa do estado com o limite de cada município, pintado pela regional no indicador escolhido, e as regionais em ordem ao lado. */
export function MapaFiscalizacao({ ctx, metrica }: { ctx: CockpitCtx; metrica: MetricaMapa }) {
  const centroids = useSpMap(), { tokens, dark } = ctx, config = metricasMapa[metrica];
  const [destaque, setDestaque] = useState<string | null>(null);
  const regioes = useMemo(() => centroids ? territorioGre(ctx.dataset, centroids) : null, [centroids, ctx.dataset]);
  const rotulos = useMemo(() => regioes && centroids ? rotulosGre(regioes, centroids) : null, [regioes, centroids]);
  const t = useMemo(() => {
    const tempo = tempoAteAgir(ctx.dataset, ctx.fEstado, null, ctx.period, tipoLabel), elegiveis = new Map(ctx.regionais.map(row => [row.id, row.elegiveis]));
    return regionaisFiscalizacao(ctx.dataset, ctx.fEstado, ctx.period, elegiveis, new Map(tempo.porGre.map(row => [row.id, row.mediana])), null);
  }, [ctx.dataset, ctx.fEstado, ctx.period, ctx.regionais]);
  const linhas = t.linhas, porId = useMemo(() => new Map(linhas.map(row => [row.id, row])), [linhas]);
  const cidadePorNome = useMemo(() => new Map(ctx.dataset.cities.map(row => [row.name, row])), [ctx.dataset]);
  const local = ctx.cidadeId ? municipioPorId(ctx.dataset).get(ctx.cidadeId) : undefined, cidade = local ? { id: local.id, name: local.nome } : undefined;
  const classes = useMemo(() => {
    const rows = linhas.filter(row => config.get(row) !== null).sort((a, b) => config.get(a)! - config.get(b)!), cores = rampaMapa(Boolean(config.alerta), dark);
    const posto = classesPorPosto(rows.map(row => config.get(row)!)), cls = new Map(rows.map((row, index) => [row.id, posto[index]]));
    // Faixa sem nenhuma regional não entra na legenda.
    const faixas = cores.map((cor, index) => { const membros = rows.filter(row => cls.get(row.id) === index).map(row => config.get(row)!); return { cor, min: membros.length ? Math.min(...membros) : null, max: membros.length ? Math.max(...membros) : null }; }).filter(item => item.min !== null);
    return { cls, cores, faixas };
  }, [linhas, config, dark]);
  const cor = (greId: string) => { const index = classes.cls.get(greId); return index === undefined ? tokens.line : classes.cores[index]; };
  const ranking = [...linhas].filter(row => config.get(row) !== null).sort((a, b) => config.menorPrimeiro ? config.get(a)! - config.get(b)! : config.get(b)! - config.get(a)!);
  const maximo = Math.max(...ranking.map(row => Math.abs(config.get(row)!)), 1);
  const option = useMemo(() => {
    if (!regioes || !rotulos || !centroids) return null;
    const foco = cidade ? { center: centroids.get(cidade.name), zoom: 3.2 } : ctx.greId ? { center: rotulos.get(ctx.greId), zoom: 2.2 } : null;
    const dica = (nome: string, greId: string) => { const row = porId.get(greId); if (!row) return nome; const value = config.get(row), local = cidadePorNome.get(nome), noLocal = local ? t.cidades.get(local.id) ?? 0 : null;
      return `<b>${nome}</b> · ${row.name}<br/>${config.label} na regional: <b>${value === null ? '—' : config.fmt(value)}</b>${noLocal !== null ? `<br/>No município: ${int(noLocal)} ações no período` : ''}<br/><span style="opacity:.8">${int(row.acoes.length)} ações · ${int(row.autos.length)} autos · ${row.taxa === null ? '—' : pct(row.taxa)} já regularizaram</span><br/><span style="opacity:.7">clique para ver as ações</span>`; };
    return {
      tooltip: { trigger: 'item', formatter: (item: any) => item.componentType === 'geo' ? dica(item.name, regioes.get(item.name) ?? '') : dica(porId.get(item.data?.greId)?.name ?? '', item.data?.greId ?? '') },
      geo: { map: 'spPainel', ...proporcaoSp, roam: true, scaleLimit: { min: 1, max: 8 }, ...(foco?.center ? { center: foco.center, zoom: foco.zoom } : { left: 2, right: 2, top: 2, bottom: 2 }), selectedMode: false, tooltip: { show: true },
        itemStyle: { areaColor: tokens.soft, borderColor: tokens.surface, borderWidth: 0.35 }, emphasis: { itemStyle: { areaColor: tokens.accent }, label: { show: false } },
        regions: [...regioes].map(([name, greId]) => { const apagado = destaque ? destaque !== greId : Boolean(ctx.greId && ctx.greId !== greId), escolhido = cidade?.name === name;
          return { name, itemStyle: { areaColor: cor(greId), opacity: apagado ? 0.3 : 1, borderColor: escolhido ? tokens.ink : tokens.surface, borderWidth: escolhido ? 1.6 : 0.35 } }; }) },
      series: [{ type: 'scatter', coordinateSystem: 'geo', symbolSize: 1, itemStyle: { color: 'transparent' }, silent: true,
        // O rótulo da regional usa a cor de texto que mais contrasta com a cor da própria regional, com um contorno da cor oposta.
        data: [...rotulos].map(([greId, at]) => { const row = porId.get(greId), value = row ? config.get(row) : null, texto = corDoTexto(cor(greId)), contorno = texto === '#FFFFFF' ? 'rgba(26,32,44,.7)' : 'rgba(255,255,255,.85)';
          return { name: row?.curto ?? greId, greId, valor: value === null ? '—' : config.fmt(value), value: at, label: { rich: { n: { color: texto, fontSize: 11, fontWeight: 700, textBorderColor: contorno, textBorderWidth: 2.5 }, v: { color: texto, fontSize: 11, fontWeight: 800, textBorderColor: contorno, textBorderWidth: 2.5 } } } }; }),
        label: { show: true, formatter: (item: any) => `{n|${item.name}}\n{v|${item.data.valor}}` },
        labelLayout: { hideOverlap: true } }],
    };
  }, [regioes, rotulos, centroids, classes, config, tokens, destaque, ctx.greId, cidade, porId, cidadePorNome, t]); // eslint-disable-line react-hooks/exhaustive-deps
  const abrir = (greId: string | undefined) => { const row = greId ? porId.get(greId) : undefined; if (!row) return;
    if (metrica === 'semAcao') abrirAlvos(ctx, `${row.name}: indícios sem ação`, row.semAcao, 'Indícios em aberto nesta regional que ainda não tiveram nenhuma ação de fiscalização.', 'Comece pelos mais antigos e pelos de registro obrigatório.');
    else if (metrica === 'divida') abrirAcoes(ctx, `${row.name}: multas em dívida ativa`, row.divida, 'Autos do período desta regional cuja multa foi inscrita em dívida ativa.');
    else if (metrica === 'autos') abrirAcoes(ctx, `${row.name}: autos de infração`, row.autos, 'Ações desta regional com auto de infração lavrado no período.');
    else abrirAcoes(ctx, `${row.name}: ações no período`, row.acoes, 'Ações de fiscalização desta regional no período escolhido.'); };
  return <div className="geo-layout is-compacto">
    <div className="geo-map">{option ? <Chart option={option} tokens={tokens} label={`Mapa das regionais por município: ${config.label}`} onPick={params => abrir(params.componentType === 'geo' ? regioes?.get(params.name) : params.data?.greId)} /> : <div className="loading">Carregando o mapa…</div>}
      <ul className="geo-legend" aria-label="Faixas do mapa">{classes.faixas.map((item, index) => <li key={index}><i style={{ background: item.cor }} />{item.min === null ? '—' : item.min === item.max ? config.fmt(item.min) : `${config.fmt(item.min)} a ${config.fmt(item.max!)}`}</li>)}</ul></div>
    <ol className="geo-rank" onMouseLeave={() => setDestaque(null)} aria-label={`Regionais por ${config.label}`}>{ranking.map(row => { const value = config.get(row)!;
      return <li key={row.id}><button onClick={() => abrir(row.id)} onMouseEnter={() => setDestaque(row.id)} onFocus={() => setDestaque(row.id)} className={ctx.greId === row.id ? 'is-selected' : ''}>
        <i style={{ background: cor(row.id) }} /><span>{row.curto}</span><b>{config.fmt(value)}</b><em style={{ width: `${Math.abs(value) / maximo * 100}%` }} /></button></li>; })}</ol>
  </div>;
}

/** Ações em barras, com o número de cada mês; autos e regularizações em linhas, no mesmo eixo. */
export function AcoesMes({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, resumo, janela } = ctx, rows = resumo.mensal;
  const autos = (row: typeof rows[number]) => row.autos.registro + row.autos.rt + row.autos.art;
  const option = useMemo(() => ({
    grid: { top: 26, right: 36, bottom: 2, left: 4, containLabel: true }, legend: { ...legenda(tokens), data: ['Ações', 'Autos de infração', 'Regularizações', 'Período escolhido'] },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${mes(row.month)}</b><br/>${int(row.acoes)} ações · ${int(autos(row))} autos · ${int(row.regularizacoes)} regularizações<br/><span style="opacity:.75">clique para ver as ações do mês</span>`; } },
    xAxis: { type: 'category', data: rows.map(row => mes(row.month)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, interval: 2, fontSize: 11 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
    series: [
      { name: 'Ações', type: 'bar', barWidth: '62%', barMaxWidth: 48, data: rows.map(row => row.acoes), itemStyle: { color: tokens.heat[1], borderRadius: [3, 3, 0, 0] }, label: { show: true, position: 'top', color: tokens.ink, fontSize: 11, fontWeight: 700 },
        markArea: { silent: true, itemStyle: { color: tokens.blue, opacity: 0.07 }, data: [[{ xAxis: mes(janela.start.slice(0, 7)) }, { xAxis: mes(janela.end.slice(0, 7)) }]] } },
      // O valor do último mês vai na ponta de cada linha; os outros meses ficam no clique e na dica.
      { name: 'Autos de infração', type: 'line', data: rows.map(autos), symbol: 'circle', symbolSize: 4, lineStyle: { color: tokens.bad, width: 2 }, itemStyle: { color: tokens.bad }, endLabel: { show: true, color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (item: any) => int(item.value) }, labelLayout: { moveOverlap: 'shiftY' } },
      { name: 'Regularizações', type: 'line', data: rows.map(row => row.regularizacoes), symbol: 'circle', symbolSize: 4, lineStyle: { color: tokens.good, width: 2 }, itemStyle: { color: tokens.good }, endLabel: { show: true, color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (item: any) => int(item.value) }, labelLayout: { moveOverlap: 'shiftY' } },
      // Série vazia só para a legenda explicar a faixa clara do período.
      { name: 'Período escolhido', type: 'bar', data: [], itemStyle: { color: tokens.blue, opacity: 0.15 } },
    ],
  }), [rows, tokens, janela]);
  return <Chart option={option} tokens={tokens} label="Ações, autos e regularizações por mês" onPick={params => { const row = rows[params.dataIndex]; if (!row) return;
    abrirAcoes(ctx, `Ações de ${mes(row.month)}`, ctx.f.acoes.filter(acao => acao.date.startsWith(row.month) && (!ctx.greId || acao.greId === ctx.greId)), 'Ações de fiscalização iniciadas neste mês.'); }} />;
}

const corDestino = (tokens: CockpitCtx['tokens']): Record<Destino, string> => ({ 'Regularizou sem auto': tokens.good, 'Auto lavrado, depois regularizou': tokens.blue, 'Auto lavrado, sem regularizar': tokens.bad, 'Notificada, ainda sem desfecho': tokens.line });
/** Barras de 100% por tipo de caso: o que aconteceu com as ações do período, com a porcentagem escrita em cada parte. */
export function DestinoAcoes({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => destinoAcoes(ctx.resumo.acoes), [ctx.resumo.acoes]), cores = corDestino(tokens);
  const option = useMemo(() => ({
    grid: { top: 40, right: 66, bottom: 2, left: 2, containLabel: true }, legend: { ...legenda(tokens), width: '96%' },
    tooltip: { trigger: 'item', formatter: (item: any) => { const row = rows[item.dataIndex], n = row.partes[item.seriesName as Destino].length; return `<b>${nomeTipo[row.tipo]}</b><br/>${item.seriesName}: ${int(n)} de ${int(row.acoes.length)} ações (${pct(n / row.acoes.length * 100)})<br/><span style="opacity:.75">clique para ver</span>`; } },
    xAxis: { type: 'value', max: 100, show: false },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => nomeTipo[row.tipo]), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11, width: 110, overflow: 'break' } },
    series: destinos.map((destino, index) => ({ name: destino, type: 'bar', stack: 'd', barWidth: '54%', barMaxWidth: 34, data: rows.map(row => row.partes[destino].length / row.acoes.length * 100), itemStyle: { color: cores[destino], borderColor: tokens.surface, borderWidth: 1, borderRadius: index === destinos.length - 1 ? [0, 3, 3, 0] : index === 0 ? [3, 0, 0, 3] : 0 },
      label: { show: true, color: corDoTexto(cores[destino]), fontSize: 11, fontWeight: 700, formatter: (item: any) => item.value >= 9 ? pct(item.value) : '' },
      ...(index === destinos.length - 1 ? { markPoint: undefined } : {}) })).concat([{ name: 'total', type: 'bar', stack: 'd', barWidth: '54%', barMaxWidth: 34, data: rows.map(() => 0), itemStyle: { color: 'transparent' }, silent: true, tooltip: { show: false },
      label: { show: true, position: 'right', color: tokens.muted, fontSize: 11, formatter: (item: any) => `${int(rows[item.dataIndex].acoes.length)} ações` } } as any]),
  }), [rows, tokens, cores]);
  return <Chart option={{ ...option, legend: { ...option.legend, data: destinos } }} tokens={tokens} label="O que aconteceu com as ações do período, por tipo de caso" onPick={params => { const row = rows[params.dataIndex], destino = params.seriesName as Destino; if (!row || !row.partes[destino]) return;
    abrirAcoes(ctx, `${nomeTipo[row.tipo]}: ${destino.toLowerCase()}`, row.partes[destino], 'Ações do período deste tipo de caso, pelo que aconteceu com elas até a data escolhida.'); }} />;
}

/** Ações do período por origem: a parte que já regularizou e a que não, com o total e a porcentagem escritos. */
export function AcoesOrigem({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => acoesPorOrigem(ctx.resumo.acoes, ctx.anchor).sort((a, b) => b.acoes.length - a.acoes.length), [ctx.resumo.acoes, ctx.anchor]);
  const option = useMemo(() => ({
    grid: { top: 24, right: 124, bottom: 2, left: 2, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${nomeOrigem[row.origem]}</b><br/>${int(row.acoes.length)} ações · ${int(row.regularizadas.length)} já regularizaram<br/><span style="opacity:.75">clique para ver</span>`; } },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => nomeOrigem[row.origem]), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [
      { name: 'Já regularizaram', type: 'bar', stack: 'o', barWidth: '56%', barMaxWidth: 34, data: rows.map(row => row.regularizadas.length), itemStyle: { color: tokens.good } },
      { name: 'Ainda não', type: 'bar', stack: 'o', data: rows.map(row => row.acoes.length - row.regularizadas.length), itemStyle: { color: tokens.line, borderRadius: [0, 3, 3, 0] },
        label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, formatter: (item: any) => { const row = rows[item.dataIndex]; return `${int(row.acoes.length)} ações, {g|${pct(row.regularizadas.length / row.acoes.length * 100)} regularizaram}`; }, rich: { g: { color: tokens.muted, fontSize: 11 } } } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Ações do período por origem e a parte que já regularizou" onPick={params => { const row = rows[params.dataIndex]; if (!row) return; const regularizou = params.seriesName === 'Já regularizaram';
    abrirAcoes(ctx, `${nomeOrigem[row.origem]}: ${regularizou ? 'ações que regularizaram' : 'ações ainda sem regularização'}`, regularizou ? row.regularizadas : row.acoes.filter(acao => !acao.regularizedAt), 'Ações do período com esta origem.'); }} />;
}

const corStatus = (tokens: CockpitCtx['tokens']): Record<StatusMulta, string> => ({ Paga: tokens.good, 'Em prazo de defesa': tokens.heat[1], 'Em julgamento': tokens.warn, 'Dívida ativa': tokens.bad, Cancelada: tokens.muted });
/** Anel com o valor das multas aplicadas no período, pela situação na data escolhida; o valor e a parte vão escritos em cada fatia. */
export function DestinoMultas({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, resumo } = ctx, cores = corStatus(tokens), total = resumo.aplicada;
  const partes = (['Paga', 'Em prazo de defesa', 'Em julgamento', 'Dívida ativa', 'Cancelada'] as StatusMulta[]).map(status => ({ status, ...resumo.multas[status] })).filter(row => row.valor > 0);
  const option = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (item: any) => `<b>${item.name}</b><br/>${brl(item.value)} · ${pct(item.value / Math.max(1, total) * 100)} do valor<br/>${int(partes[item.dataIndex].acoes.length)} autos<br/><span style="opacity:.75">clique para ver</span>` },
    title: { text: brl(total), subtext: 'em multas aplicadas', left: 'center', top: 'center', itemGap: 2, textStyle: { color: tokens.ink, fontSize: 16, fontWeight: 800, fontFamily: 'Raleway, Lato, sans-serif' }, subtextStyle: { color: tokens.muted, fontSize: 11 } },
    series: [{ type: 'pie', radius: ['34%', '50%'], padAngle: 1.5, itemStyle: { borderRadius: 3, borderColor: tokens.surface, borderWidth: 1 },
      label: { show: true, position: 'outside', alignTo: 'edge', edgeDistance: 4, fontSize: 11, color: tokens.ink, lineHeight: 13, formatter: (item: any) => `${item.name} (${pct(item.value / Math.max(1, total) * 100)})\n{b|${brl(item.value)}}`, rich: { b: { fontWeight: 800, fontSize: 11 } } }, labelLine: { length: 8, length2: 0 },
      data: partes.map(row => ({ name: row.status, value: row.valor, itemStyle: { color: cores[row.status] } })) }],
  }), [partes, tokens, total]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Valor das multas aplicadas no período pela situação na data escolhida" onPick={params => { const row = partes[params.dataIndex]; if (row) abrirAcoes(ctx, `Multas: ${row.status.toLowerCase()}`, row.acoes, 'Autos do período com a multa nesta situação na data escolhida.', row.status === 'Dívida ativa' ? 'A cobrança segue pela dívida ativa; confira se a empresa continua ativa na Receita.' : undefined); }} />;
}

/* ---------- Resultado ---------- */
const nomeTrimestre = rotuloTrimestre;
/** Ações de cada trimestre que regularizaram em até 180 dias, com a parte escrita no alto da barra; trimestre que não fechou fica claro. */
export function ConversaoTrimestre({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = ctx.norte.conversao.coortes;
  const option = useMemo(() => ({
    grid: { top: 26, right: 6, bottom: 2, left: 4, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${rotuloTrimestre(row.trimestre)}</b>${row.completa ? '' : ' (ainda dentro dos 180 dias)'}<br/>${int(row.acoes.length)} ações · ${int(row.convertidas.length)} regularizaram em até 180 dias (${row.taxa === null ? '—' : pct(row.taxa)})`; } },
    xAxis: { type: 'category', data: rows.map(row => nomeTrimestre(row.trimestre)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 11, lineHeight: 12 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
    series: [
      { name: 'Regularizaram em até 180 dias', type: 'bar', stack: 'c', barWidth: '56%', barMaxWidth: 64, itemStyle: { color: tokens.good }, data: rows.map(row => ({ value: row.convertidas.length, itemStyle: { color: row.completa ? tokens.good : tokens.soft, borderColor: row.completa ? undefined : tokens.good, borderWidth: row.completa ? 0 : 1 } })),
        label: { show: true, position: 'inside', color: corDoTexto(tokens.good), fontSize: 11, fontWeight: 700, formatter: (item: any) => rows[item.dataIndex].completa && item.value ? int(item.value) : '' } },
      { name: 'Não regularizaram', type: 'bar', stack: 'c', itemStyle: { color: tokens.line }, data: rows.map(row => ({ value: row.acoes.length - row.convertidas.length, itemStyle: { color: row.completa ? tokens.line : tokens.soft, borderColor: row.completa ? undefined : tokens.line, borderWidth: row.completa ? 0 : 1, borderRadius: [3, 3, 0, 0] } })),
        label: { show: true, position: 'top', color: tokens.ink, fontSize: 11, fontWeight: 800, formatter: (item: any) => { const row = rows[item.dataIndex]; return row.completa ? (row.taxa === null ? '' : pct(row.taxa)) : '{e|em curso}'; }, rich: { e: { color: tokens.muted, fontSize: 11, fontWeight: 400 } } } },
    ],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Ações de cada trimestre que regularizaram em até 180 dias" onPick={params => { const row = rows[params.dataIndex]; if (!row) return; const sim = params.seriesName === 'Regularizaram em até 180 dias';
    abrirAcoes(ctx, `Ações do ${rotuloTrimestre(row.trimestre)}: ${sim ? 'regularizaram em até 180 dias' : 'não regularizaram em 180 dias'}`, sim ? row.convertidas : row.acoes.filter(acao => !row.convertidas.includes(acao)), 'Ações iniciadas no trimestre.', 'Uma coisa veio depois da outra, mas a ação pode não ter sido a causa.'); }} />;
}

/** Boxplot deitado: cada linha é um grupo; a caixa vai do primeiro ao terceiro quartil, o traço é a mediana, e a mediana e a metade do meio vão escritas. */
function Boxplot({ ctx, grupos, label, onPick }: { ctx: CockpitCtx; grupos: { nome: string; q: Quartis | null; nota: string; cor?: string }[]; label: string; onPick?: (index: number) => void }) {
  const { tokens } = ctx, linhas = grupos.filter(row => row.q), maximo = Math.max(30, ...linhas.map(row => row.q!.max));
  const option = useMemo(() => ({
    grid: { top: 18, right: 104, bottom: 20, left: 2, containLabel: true },
    tooltip: { trigger: 'item', formatter: (item: any) => { const row = linhas[item.dataIndex]; if (!row?.q) return ''; const q = row.q; return `<b>${row.nome}</b><br/>Mediana: <b>${dias(q.mediana)}</b><br/>Metade dos casos entre ${int(q.q1)} e ${int(q.q3)} dias<br/>De ${int(q.min)} a ${int(q.max)} dias, sem os casos extremos${q.foraMax.length ? ` (${int(q.foraMax.length)} acima)` : ''}<br/>${row.nota}`; } },
    xAxis: { type: 'value', min: 0, max: Math.ceil(maximo * 1.04 / 30) * 30, name: 'dias', nameLocation: 'end', nameGap: 4, nameTextStyle: { color: tokens.muted, fontSize: 11, verticalAlign: 'top', padding: [8, 0, 0, 0] }, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 11, showMaxLabel: false } },
    yAxis: { type: 'category', inverse: true, data: linhas.map(row => row.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11, lineHeight: 13, formatter: (value: string, index: number) => `${value}\n{n|${linhas[index].nota}}`, rich: { n: { color: tokens.muted, fontSize: 11 } } } },
    series: [
      { type: 'boxplot', boxWidth: [10, 22], data: linhas.map(row => ({ value: [row.q!.min, row.q!.q1, row.q!.mediana, row.q!.q3, row.q!.max], itemStyle: { color: tokens.soft, borderColor: row.cor ?? tokens.blue, borderWidth: 1.6 } })) },
      { type: 'scatter', symbolSize: 0, silent: true, tooltip: { show: false }, data: linhas.map((row, index) => [row.q!.max, index]),
        label: { show: true, position: 'right', distance: 6, color: tokens.ink, fontSize: 11, lineHeight: 13, formatter: (item: any) => { const q = linhas[item.dataIndex].q!; return `{b|${dias(q.mediana)}}\n{m|metade entre ${int(q.q1)} e ${int(q.q3)}}`; }, rich: { b: { fontWeight: 800, fontSize: 11, color: tokens.ink }, m: { color: tokens.muted, fontSize: 11 } } } },
    ],
  }), [linhas, tokens, maximo]);
  return linhas.length ? <Chart option={option} tokens={tokens} label={label} onPick={params => onPick?.(grupos.indexOf(linhas[params.dataIndex]))} /> : semDados('Nenhum caso');
}

/** Dias da ação até a regularização, por origem, nas ações dos últimos 24 meses que já regularizaram. */
export function DiasRegularizar({ ctx }: { ctx: CockpitCtx }) {
  const rows = useMemo(() => acoesPorOrigem(acoes24(ctx.f, ctx.greId), ctx.anchor).filter(row => row.regularizadas.length >= 3).sort((a, b) => (a.quartis?.mediana ?? 0) - (b.quartis?.mediana ?? 0)), [ctx.f, ctx.greId, ctx.anchor]);
  return <Boxplot ctx={ctx} label="Dias da ação até a regularização, por origem da ação" grupos={rows.map(row => ({ nome: nomeOrigem[row.origem], q: row.quartis, nota: `${int(row.regularizadas.length)} de ${int(row.acoes.length)} ações regularizaram` }))}
    onPick={index => { const row = rows[index]; if (row) abrirAcoes(ctx, `${nomeOrigem[row.origem]}: ações que regularizaram`, row.regularizadas, 'Ações dos últimos 24 meses com esta origem que já regularizaram, com a data da regularização.'); }} />;
}

/** Dias do indício até a primeira ação, por tipo de indício, nos indícios que surgiram no período e já tiveram ação. */
export function EsperaTipo({ ctx }: { ctx: CockpitCtx }) {
  const rows = useMemo(() => esperaPorTipo(ctx.norte.tempo.esperas), [ctx.norte.tempo]);
  return <Boxplot ctx={ctx} label="Dias do indício até a primeira ação, por tipo de indício" grupos={rows.map(row => ({ nome: nomeTipo[row.tipo], q: row.quartis, cor: ctx.tokens.accent, nota: `${int(row.comAcao.length)} com ação, ${pct(row.semAcao.length / row.total * 100)} ainda esperam` }))}
    onPick={index => { const row = rows[index]; if (row) abrirAlvos(ctx, `${nomeTipo[row.tipo]}: indícios do período ainda sem ação`, row.semAcao.map(item => item.alvo), 'Indícios que surgiram no período e ainda não tiveram ação de fiscalização.', 'Comece pelos mais antigos.'); }} />;
}

/** Cada força-tarefa contra as ações parecidas fora dela: dois pontos ligados por um traço, com a parte regularizada escrita. */
export function ForcasTarefas({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => [...ctx.forcas].reverse(), [ctx.forcas]), gres = new Map(ctx.dataset.gres.map(row => [row.id, short(row.name)]));
  const nome = (item: ResultadoFt) => `${item.ft.nome.split(' · ')[0]}, ${gres.get(item.ft.greId) ?? ''}`;
  const option = useMemo(() => ({
    grid: { top: 24, right: 12, bottom: 2, left: 2, containLabel: true }, legend: { ...legenda(tokens), data: ['Na força-tarefa', 'Ações parecidas fora dela'] },
    tooltip: { trigger: 'item', formatter: (item: any) => { const row = rows[item.dataIndex] ?? rows[item.value?.[1]]; if (!row) return ''; return `<b>${row.ft.nome}</b><br/>${data(row.ft.inicio)} a ${data(row.ft.fim)}${row.fechada ? '' : ' (ainda sem os 180 dias)'}<br/>Na força-tarefa: ${row.grupo.taxa === null ? '—' : pct(row.grupo.taxa)} de ${int(row.grupo.acoes.length)} ações<br/>Fora dela: ${row.comparacao.taxa === null ? '—' : pct(row.comparacao.taxa)} de ${int(row.comparacao.acoes.length)} ações<br/><span style="opacity:.75">clique para ver as ações</span>`; } },
    xAxis: { type: 'value', min: 0, max: 100, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 11, formatter: '{value}%' } },
    yAxis: { type: 'category', data: rows.map(nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11, lineHeight: 13, formatter: (value: string, index: number) => { const row = rows[index]; return `${value}\n{n|de ${mes(row.ft.inicio.slice(0, 7))} a ${mes(row.ft.fim.slice(0, 7))}, ${int(row.grupo.acoes.length)} ações, ${row.fechada ? 'fechada' : 'em aberto'}}`; }, rich: { n: { color: tokens.muted, fontSize: 11 } } } },
    series: [
      { type: 'bar', stack: 'l', silent: true, tooltip: { show: false }, barWidth: 3, data: rows.map(row => Math.min(row.grupo.taxa ?? 0, row.comparacao.taxa ?? 0)), itemStyle: { color: 'transparent' } },
      { type: 'bar', stack: 'l', silent: true, tooltip: { show: false }, barWidth: 3, data: rows.map(row => Math.abs((row.grupo.taxa ?? 0) - (row.comparacao.taxa ?? 0))), itemStyle: { color: tokens.line } },
      { name: 'Ações parecidas fora dela', type: 'scatter', symbolSize: 11, data: rows.map((row, index) => [row.comparacao.taxa, index]), itemStyle: { color: tokens.muted },
        label: { show: true, position: 'bottom', distance: 3, color: tokens.muted, fontSize: 11, formatter: (item: any) => item.value[0] === null ? '' : pct(item.value[0]) } },
      { name: 'Na força-tarefa', type: 'scatter', symbolSize: 13, data: rows.map((row, index) => ({ value: [row.grupo.taxa, index], itemStyle: { color: row.fechada ? tokens.blue : tokens.surface, borderColor: tokens.blue, borderWidth: 2 } })), itemStyle: { color: tokens.blue },
        label: { show: true, position: 'top', distance: 3, color: tokens.ink, fontSize: 11, fontWeight: 800, formatter: (item: any) => item.value[0] === null ? '' : pct(item.value[0]) } },
    ],
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return rows.length ? <Chart option={option} tokens={tokens} label="Parte das ações que regularizou em 180 dias, na força-tarefa e fora dela" onPick={params => { const index = Array.isArray(params.value) ? params.value[1] : params.dataIndex, row = rows[index]; if (!row) return; const fora = params.seriesName === 'Ações parecidas fora dela';
    abrirAcoes(ctx, fora ? `Ações parecidas fora da força-tarefa ${nome(row)}` : `Força-tarefa ${nome(row)}`, fora ? row.comparacao.acoes : row.grupo.acoes, fora ? 'Ações do mesmo tipo e período fora de qualquer força-tarefa, em todo o estado.' : row.ft.descricao, 'A comparação mostra o que aconteceu, mas não prova que a força-tarefa causou o resultado.'); }} /> : semDados('Nenhuma força-tarefa');
}

/** Anuidades e multas recebidas em até um ano depois de uma ação, mês a mês no período, com o valor escrito. */
export function ReceitaMes({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, r = ctx.norte.receita, rows = r.mensal;
  const option = useMemo(() => ({
    grid: { top: 18, right: 6, bottom: 2, left: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>${items[0].name}</b><br/>${brl(items[0].value)} recebidos de empresas que tiveram ação até um ano antes` },
    xAxis: { type: 'category', data: rows.map(row => mes(row.month)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 11, interval: rows.length > 12 ? 2 : 'auto' } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: (value: number) => brl(value).replace('R$ ', '') } },
    series: [{ type: 'bar', barWidth: '58%', barMaxWidth: 56, data: rows.map(row => row.valor), itemStyle: { color: tokens.good, borderRadius: [3, 3, 0, 0] }, label: { show: rows.length <= 12, position: 'top', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (item: any) => item.value ? brl(item.value).replace('R$ ', '') : '' } }],
  }), [rows, tokens]);
  return <Chart option={option} tokens={tokens} label="Receita recebida depois de uma ação, mês a mês" onPick={params => { const row = rows[params.dataIndex]; if (!row) return; const ids = [...new Set(r.pagamentos.filter(item => item.data.startsWith(row.month)).map(item => item.companyId))];
    if (ids.length) ctx.open({ kind: 'empresas', title: `Pagaram em ${mes(row.month)} depois de uma ação`, what: 'Empresas que pagaram anuidade ou multa neste mês, até um ano depois de uma ação de fiscalização.', use: 'Uma coisa veio depois da outra, mas a ação pode não ter sido a causa.', ids }); }} />;
}

/* ---------- Malha fina ---------- */
/** A confiança da ligação entre as bases, nas palavras de quem lê o painel. */
const nomeStatus: Record<Indicio['status'], string> = { Confirmado: 'confirmado', Candidato: 'a conferir', Contexto: 'só contexto' };
/** Empresas apontadas por regra, com ação e sem ação; a confiança da ligação vai escrita ao lado do nome. */
export function Regras({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, malha } = ctx, rows = useMemo(() => [...malha.indicios].filter(row => row.empresas.length).sort((a, b) => b.empresas.length - a.empresas.length), [malha]);
  const option = useMemo(() => ({
    grid: { top: 24, right: 118, bottom: 2, left: 2, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.label}</b><br/>${row.status}: ${statusAjuda[row.status]}<br/>${int(row.empresas.length)} empresas · ${int(row.comAcao.length)} já com ação fiscal<br/>Fontes: ${row.fonte}<br/><span style="opacity:.75">clique para ver as empresas</span>`; } },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => row.label), axisTick: { show: false }, axisLine: { show: false },
      axisLabel: { color: tokens.ink, fontSize: 11, formatter: (value: string, index: number) => { const row = rows[index]; return `${value}${row.parceria ? ' {p|!}' : ''}  {${row.status === 'Confirmado' ? 'c' : 'x'}|${nomeStatus[row.status]}}`; },
        // A confiança vai em texto, e não em cor: o âmbar sobre branco ficava em 2,7:1.
        rich: { c: { color: tokens.ink, fontSize: 11, fontWeight: 800 }, x: { color: tokens.muted, fontSize: 11 }, p: { color: '#FFFFFF', backgroundColor: '#C05621', borderRadius: 7, padding: [1, 4], fontSize: 11, fontWeight: 800 } } } },
    series: [
      { name: 'Já com ação fiscal', type: 'bar', stack: 'r', barWidth: '62%', barMaxWidth: 34, data: rows.map(row => row.comAcao.length), itemStyle: { color: tokens.good } },
      { name: 'Sem ação fiscal', type: 'bar', stack: 'r', data: rows.map(row => row.empresas.length - row.comAcao.length), itemStyle: { color: tokens.warn, borderRadius: [0, 3, 3, 0] },
        label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, formatter: (item: any) => { const row = rows[item.dataIndex], sem = row.empresas.length - row.comAcao.length; return `${int(row.empresas.length)}, {s|${pct(sem / row.empresas.length * 100)} sem ação}`; }, rich: { s: { color: tokens.muted, fontSize: 11 } } } },
    ],
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  const porEmpresa = useMemo(() => { const map = new Map<string, Indicio[]>(); for (const item of malha.indicios) for (const id of item.empresas) map.set(id, [...(map.get(id) ?? []), item]); return map; }, [malha]);
  return <Chart option={option} tokens={tokens} label="Empresas apontadas por regra da malha fina, com e sem ação fiscal" onPick={params => { const item = rows[params.dataIndex]; if (!item) return; const semAcao = params.seriesName === 'Sem ação fiscal', acted = new Set(item.comAcao), ids = semAcao ? item.empresas.filter(id => !acted.has(id)) : item.comAcao; if (!ids.length) return;
    ctx.open({ kind: 'linhas', eyebrow: `${item.status}. Fontes: ${item.fonte}`, title: `${item.label}${semAcao ? ', sem ação fiscal' : ', já com ação fiscal'}`, what: item.regra, use: `Comece pelas empresas com mais indícios confirmados e sem ação fiscal. Não concluir ${item.naoConcluir.charAt(0).toLowerCase()}${item.naoConcluir.slice(1)}`, listTitle: 'Empresas, mais indícios primeiro',
      rows: linhasEmpresas(ctx, ids, id => { const list = porEmpresa.get(id) ?? [], confirmados = list.filter(row => row.status === 'Confirmado').length; return { value: `${list.length} indício${list.length > 1 ? 's' : ''}, ${confirmados} confirmado${confirmados === 1 ? '' : 's'}`, note: list.map(row => `${row.label} (${nomeStatus[row.status]})`).join('; '), sort: confirmados * 10 + list.length }; }) }); }} />;
}

/** Estabelecimentos com atividade de engenharia e sem registro, por câmara: obrigatório com ação, obrigatório sem ação e a analisar. */
export function SemRegistroCamara({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, malha } = ctx, camara = useMemo(() => camaraDaEmpresa(ctx.dataset), [ctx.dataset]), places = useMemo(() => new Map(ctx.dataset.establishments.map(row => [row.id, row])), [ctx.dataset]);
  const acted = useMemo(() => new Set(ctx.f.alvos.filter(row => row.tipo === 'registro' && !row.regularizedAt && row.acaoId).map(row => row.establishmentId)), [ctx.f]);
  const { linhas, series } = useMemo(() => {
    const por = (ids: string[], filtro: (id: string) => boolean) => camaras.map(name => ids.filter(id => filtro(id) && camara.get(places.get(id)?.companyId ?? '') === name));
    const series = [
      { name: 'Obrigatório, com ação', color: tokens.good, ids: por(malha.semRegistroSim, id => acted.has(id)) },
      { name: 'Obrigatório, sem ação', color: tokens.bad, ids: por(malha.semRegistroSim, id => !acted.has(id)) },
      { name: 'A analisar', color: tokens.heat[1], ids: por(malha.semRegistroPassivel, () => true) },
    ];
    const linhas = camaras.map((nome, index) => ({ nome, index, total: series.reduce((n, item) => n + item.ids[index].length, 0) })).filter(row => row.total).sort((a, b) => b.total - a.total);
    return { linhas, series };
  }, [malha, acted, tokens, camara, places]);
  const option = useMemo(() => ({
    grid: { top: 24, right: 34, bottom: 2, left: 2, containLabel: true }, legend: { ...legenda(tokens), data: series.map(item => item.name) },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = linhas[items[0].dataIndex]; return `<b>${row.nome}</b><br/>${series.map(item => `${item.name}: ${int(item.ids[row.index].length)}`).join('<br/>')}<br/><span style="opacity:.75">clique para ver os CNPJs</span>`; } },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', inverse: true, data: linhas.map(row => row.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [...series.map((item, index) => ({ name: item.name, type: 'bar', stack: 's', barWidth: '60%', barMaxWidth: 30, data: linhas.map(row => item.ids[row.index].length), itemStyle: { color: item.color, borderRadius: index === series.length - 1 ? [0, 3, 3, 0] : 0 },
      label: { show: true, color: corDoTexto(item.color), fontSize: 11, fontWeight: 700, formatter: (params: any) => params.value >= 16 ? int(params.value) : '' } })), serieTotal(tokens, 's', linhas.map(row => row.total))],
  }), [linhas, series, tokens]);
  return <Chart option={option} tokens={tokens} label="Estabelecimentos com atividade de engenharia e sem registro, por câmara" onPick={params => { const row = linhas[params.dataIndex], item = series[params.seriesIndex], ids = row && item ? item.ids[row.index] : []; if (!ids?.length) return;
    ctx.open({ kind: 'cnpjs', title: `${row.nome}: registro ${item.name.toLowerCase()}`, what: 'Estabelecimentos ativos na Receita com atividade da lista do Crea-SP, desta câmara, sem registro nem visto na data escolhida.', use: 'Confirme a atividade (contratos, licenças, site) antes de orientar ou notificar. Nenhum auto sai só da atividade declarada.', ids }); }} />;
}

/** Registros ativos de empresa fechada na Receita, pela situação do CNPJ, e o valor vencido dessas empresas ao lado. */
export function CnpjFechado({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, malha } = ctx, places = useMemo(() => new Map(ctx.dataset.establishments.map(row => [row.id, row])), [ctx.dataset]);
  const grupos = (['Baixada', 'Inapta', 'Suspensa'] as const).map(status => ({ status, ids: malha.cnpjInativo.establishmentIds.filter(id => places.get(id)?.rfbStatus === status) }));
  const option = useMemo(() => ({
    grid: { top: 4, right: 40, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>CNPJ ${String(items[0].name).toLowerCase()} na Receita</b><br/>${int(items[0].value)} estabelecimentos com registro ativo<br/><span style="opacity:.75">clique para ver</span>` },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: grupos.map(item => item.status), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [{ type: 'bar', barWidth: '56%', barMaxWidth: 34, data: grupos.map(item => ({ value: item.ids.length, itemStyle: { color: tokens.warn, borderRadius: [0, 4, 4, 0] } })), label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, fontWeight: 700 } }],
  }), [grupos, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="split is-wide is-estreita">
    <Chart option={option} tokens={tokens} label="Registros ativos por situação do CNPJ na Receita" onPick={params => { const item = grupos[params.dataIndex]; if (item?.ids.length) ctx.open({ kind: 'cnpjs', title: `Registro ativo com CNPJ ${item.status.toLowerCase()}`, what: 'Estabelecimentos com registro ativo no Crea-SP cujo CNPJ está nesta situação na Receita Federal.', use: 'Rever o registro: a base fica inflada e a anuidade lançada dificilmente será recebida.', ids: item.ids }); }} />
    <ul className="side-list" aria-label="Valor vencido"><li className="side-big"><b>{brl(malha.cnpjInativo.vencido)}</b><small>vencidos dessas {int(malha.cnpjInativo.companies.length)} empresas</small></li></ul>
  </div>;
}

/** Profissionais pelo número de ARTs no último ano, com o limite da regra marcado; os que passam do limite ficam em laranja. */
export function ArtsAutores({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, malha } = ctx, limite = malha.limiteArt;
  // A última barra começa no limite da regra, para o laranja prometido no (i) aparecer sempre; entre 6 e o limite fica uma barra à parte.
  const faixas = useMemo(() => { const v = malha.volumesArt, cortes = [1, 2, 3, 4, 5].filter(n => n < limite);
    return [...cortes.map(n => ({ nome: String(n), n: v.filter(x => x === n).length, acima: false })), ...(limite > 6 ? [{ nome: `6–${int(limite - 1)}`, n: v.filter(x => x >= 6 && x < limite).length, acima: false }] : []),
      { nome: `${int(limite)}+`, n: v.filter(x => x >= limite).length, acima: true }]; }, [malha, limite]);
  const option = useMemo(() => ({
    grid: { top: 18, right: 6, bottom: 24, left: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>${items[0].name} ART${items[0].name === '1' ? '' : 's'} no último ano</b><br/>${int(items[0].value)} profissiona${items[0].value === 1 ? 'l' : 'is'}` },
    xAxis: { type: 'category', data: faixas.map(row => row.nome), name: 'ARTs no último ano', nameLocation: 'middle', nameGap: 22, nameTextStyle: { color: tokens.muted, fontSize: 11 }, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.ink, fontSize: 11, interval: 0 } },
    yAxis: { type: 'value', show: false },
    series: [{ type: 'bar', barWidth: '62%', barMaxWidth: 56, data: faixas.map(row => ({ value: row.n, itemStyle: { color: row.acima ? tokens.warn : tokens.heat[1], borderRadius: [3, 3, 0, 0] } })), label: { show: true, position: 'top', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (item: any) => int(item.value) } }],
  }), [faixas, tokens]);
  const indicio = malha.indicios.find(row => row.id === 'artAnormal');
  return <div className="split is-wide">
    <Chart option={option} tokens={tokens} label="Profissionais pelo número de ARTs no último ano" />
    <ul className="side-list" aria-label="Limite da regra"><li className="side-big"><b>{int(malha.autoresAnormais.length)}</b><small>{malha.autoresAnormais.length ? `${malha.autoresAnormais.length === 1 ? 'profissional chegou' : 'profissionais chegaram'} a ${int(limite)} ARTs ou mais e ${malha.autoresAnormais.length === 1 ? 'atende' : 'atendem'} empresas ou regionais demais` : `nenhum profissional chegou ao limite de ${int(limite)} ARTs no último ano`}</small></li>
      {malha.autoresAnormais.slice(0, 4).map(row => <li key={row.id}><button className="is-acao" onClick={() => indicio?.empresas.length && ctx.open({ kind: 'empresas', title: `Empresas das ARTs de ${row.nome}`, what: `${int(row.arts)} ARTs no último ano, para ${int(row.empresas)} empresas em ${int(row.regionais)} regionais.`, use: 'Confira se há tempo e área de atuação compatíveis antes de qualquer contato.', ids: indicio.empresas })}><span>{row.nome}<small>{int(row.empresas)} empresas, {int(row.regionais)} regionais</small></span><b>{int(row.arts)}</b></button></li>)}</ul>
  </div>;
}

/** Pares de empresas (uma fecha, outra abre no lugar), pela regional da nova, separando os que têm o mesmo responsável técnico. */
export function Sucessoes({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, malha } = ctx, rows = malha.sucessoes, cities = useMemo(() => new Map([...municipioPorId(ctx.dataset).values()].map(row => [row.id, row.nome])), [ctx.dataset]);
  const porGre = useMemo(() => { const gre = new Map(ctx.dataset.establishments.filter(row => row.branch === 'Matriz').map(row => [row.companyId, row.greId])), nomes = new Map(ctx.dataset.gres.map(row => [row.id, short(row.name)]));
    const map = new Map<string, typeof rows>(); for (const row of rows) { const id = gre.get(row.nova) ?? '—'; map.set(id, [...(map.get(id) ?? []), row]); }
    return [...map].map(([id, pares]) => ({ nome: nomes.get(id) ?? id, comRt: pares.filter(row => row.rtComum), sem: pares.filter(row => !row.rtComum) })).sort((a, b) => b.comRt.length + b.sem.length - a.comRt.length - a.sem.length).slice(0, 8); }, [rows, ctx.dataset]);
  const option = useMemo(() => ({
    // A legenda só mostra as séries que têm algum par no recorte.
    grid: { top: 24, right: 30, bottom: 2, left: 2, containLabel: true }, legend: { ...legenda(tokens), data: [porGre.some(row => row.comRt.length) && 'Mesmo responsável técnico', porGre.some(row => row.sem.length) && 'Mesmo município e atividade'].filter(Boolean) },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = porGre[items[0].dataIndex]; return `<b>${row.nome}</b><br/>${int(row.comRt.length)} pares com o mesmo responsável técnico · ${int(row.sem.length)} só no mesmo município e atividade<br/><span style="opacity:.75">clique para ver os pares</span>`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: porGre.map(row => row.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11, interval: 0 } },
    series: [
      { name: 'Mesmo responsável técnico', type: 'bar', stack: 's', barWidth: '60%', barMaxWidth: 34, data: porGre.map(row => row.comRt.length), itemStyle: { color: tokens.warn } },
      { name: 'Mesmo município e atividade', type: 'bar', stack: 's', data: porGre.map(row => row.sem.length), itemStyle: { color: tokens.heat[1], borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (item: any) => int(porGre[item.dataIndex].comRt.length + porGre[item.dataIndex].sem.length) } },
    ],
  }), [porGre, tokens]);
  return rows.length ? <Chart option={option} tokens={tokens} label="Pares de empresas que fecham e abrem no lugar, por regional da empresa nova" onPick={params => { const row = porGre[params.dataIndex]; if (!row) return; const pares = params.seriesName === 'Mesmo responsável técnico' ? row.comRt : row.sem; if (!pares.length) return;
    ctx.open({ kind: 'linhas', title: `${row.nome}: ${String(params.seriesName).toLowerCase()}`, what: 'Pares de empresas: registro baixado ou cancelado e empresa aberta no mesmo município, com a mesma atividade principal, em até 180 dias.', use: 'Candidato para revisão: a ligação depende de análise societária e jurídica.', listTitle: 'Pares',
      rows: pares.map((par, index) => ({ key: `${par.anterior}-${par.nova}-${index}`, companyId: par.nova, title: nomeEmpresa(ctx, par.nova), subtitle: `${cities.get(par.cityId) ?? ''}, aberta em ${data(par.abertaEm)}`, value: par.rtComum ? 'mesmo RT' : 'mesmo município e atividade', note: `sucede ${nomeEmpresa(ctx, par.anterior)}, com baixa em ${data(par.baixaEm)}`, sortValue: par.rtComum ? 1 : 0 })) }); }} /> : semDados('Nenhum par de empresas');
}

/** Empresas ativas sem registro com palavra de engenharia no nome, por palavra. */
export function NomesEngenharia({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, malha } = ctx, nomes = malha.nomesSemRegistro;
  const porTermo = useMemo(() => { const places = new Map(ctx.dataset.establishments.map(row => [row.id, row])), companies = new Map(ctx.dataset.companies.map(row => [row.id, row])), map = new Map<string, string[]>();
    for (const id of nomes) { const company = companies.get(places.get(id)?.companyId ?? ''), texto = `${company?.name ?? ''} ${company?.tradeName ?? ''}`, termo = texto.match(TERMOS_ENGENHARIA)?.[0].toLowerCase() ?? 'outro'; const nome = termo === 'engenheir' ? 'engenheiro' : termo; map.set(nome, [...(map.get(nome) ?? []), id]); }
    return [...map].map(([termo, ids]) => ({ termo, ids })).sort((a, b) => b.ids.length - a.ids.length); }, [nomes, ctx.dataset]);
  const option = useMemo(() => ({
    grid: { top: 4, right: 36, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>“${items[0].name}” no nome</b><br/>${int(items[0].value)} estabelecimentos ativos sem registro<br/><span style="opacity:.75">clique para ver</span>` },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: porTermo.map(row => `“${row.termo}”`), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [{ type: 'bar', barWidth: '56%', barMaxWidth: 34, data: porTermo.map(row => row.ids.length), itemStyle: { color: tokens.warn, borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, fontWeight: 700 } }],
  }), [porTermo, tokens]);
  return <Chart option={option} tokens={tokens} label="Estabelecimentos sem registro com palavra de engenharia no nome" onPick={params => { const row = porTermo[params.dataIndex]; if (row) ctx.open({ kind: 'cnpjs', title: `“${row.termo}” no nome e nenhum registro`, what: 'Estabelecimentos ativos na Receita, sem registro nem visto, cuja razão social ou nome fantasia tem esta palavra.', use: 'Candidato: confirme a atividade antes de orientar. O nome mostra como a empresa se apresenta, e não o que ela faz.', ids: row.ids }); }} />;
}

/** A malha fina refeita no fim de cada um dos 12 meses anteriores: três linhas, com o número do primeiro e do último mês escrito. */
export function HistoricoMalha({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, h = ctx.historico, pontos = h.pontos;
  const option = useMemo(() => {
    const serie = (name: string, cor: string, get: (p: typeof pontos[number]) => number) => ({ type: 'line', name, data: pontos.map(get), symbol: 'circle', symbolSize: 5, lineStyle: { color: cor, width: 2 }, itemStyle: { color: cor },
      label: { show: true, color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (item: any) => item.dataIndex === 0 || item.dataIndex === pontos.length - 1 ? int(item.value) : '' }, labelLayout: { moveOverlap: 'shiftY' } });
    return { grid: { top: 34, right: 14, bottom: 2, left: 4, containLabel: true }, legend: legenda(tokens), tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: pontos.map(p => mes(p.data.slice(0, 7))), axisLabel: { color: tokens.muted, fontSize: 11 }, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } } },
      yAxis: { type: 'value', splitNumber: 3, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 11 } },
      series: [serie('Com indício', tokens.blue, p => p.comIndicio), serie('Confirmado', tokens.warn, p => p.confirmadas), serie('Com ação', tokens.good, p => p.comAcao)] };
  }, [pontos, tokens]);
  return pontos.length ? <div className="stack">{!h.completo && <p className="kpi-line">Calculando {int(pontos.length)} de {int(h.datas.length)} meses…</p>}<Chart option={option} tokens={tokens} label="Empresas com indício, com indício confirmado e com ação fiscal, mês a mês" /></div> : carregando;
}

/* ---------- Contratos ---------- */
export const nomeGrau: Record<GrauVinculo, string> = { 'Confirmado por documento': 'ART cita o contrato', 'Candidato para revisão': 'ART provável, a conferir', 'Não identificado': 'Nenhuma ART encontrada', 'Sem dados para a busca': 'CNPJ inválido, sem busca' };
/** Contratos técnicos do período por categoria, pela ART encontrada, com o total escrito no fim da barra. */
export function ContratosArt({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, contratos = ctx.malha.contratos;
  const cores: Record<GrauVinculo, string> = { 'Confirmado por documento': tokens.good, 'Candidato para revisão': tokens.accent, 'Não identificado': tokens.bad, 'Sem dados para a busca': tokens.line };
  const graus = grausVinculo.filter(grau => contratos.some(row => row.vinculo === grau));
  const categorias = useMemo(() => [...new Set(contratos.map(row => row.categoria))].sort((a, b) => contratos.filter(row => row.categoria === b).length - contratos.filter(row => row.categoria === a).length), [contratos]);
  const de = (categoria: string, grau: GrauVinculo) => contratos.filter(row => row.categoria === categoria && row.vinculo === grau);
  const option = useMemo(() => ({
    grid: { top: 24, right: 36, bottom: 2, left: 2, containLabel: true }, legend: { ...legenda(tokens), data: graus.map(grau => nomeGrau[grau]) },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>${items[0].name}</b><br/>${graus.map(grau => { const rows = de(items[0].name, grau); return `${nomeGrau[grau]}: ${int(rows.length)} contratos · ${brl(rows.reduce((s, r) => s + r.valor, 0))}`; }).join('<br/>')}<br/><span style="opacity:.75">clique para ver os contratos</span>` },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', inverse: true, data: categorias, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [...graus.map((grau, index) => ({ name: nomeGrau[grau], type: 'bar', stack: 'v', barWidth: '58%', barMaxWidth: 40, data: categorias.map(categoria => de(categoria, grau).length), itemStyle: { color: cores[grau], borderColor: tokens.surface, borderWidth: 1, borderRadius: index === graus.length - 1 ? [0, 3, 3, 0] : 0 },
      label: { show: true, color: corDoTexto(cores[grau]), fontSize: 11, fontWeight: 700, formatter: (params: any) => params.value >= 4 ? int(params.value) : '' } })), serieTotal(tokens, 'v', categorias.map(categoria => contratos.filter(row => row.categoria === categoria).length))],
  }), [categorias, graus, tokens, contratos]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Contratos públicos técnicos por categoria e pela ART encontrada" onPick={params => { const grau = graus[params.seriesIndex]; if (!grau) return; abrirContratos(ctx, de(params.name, grau), `${params.name}: ${nomeGrau[grau].toLowerCase()}`, grau === 'Não identificado' ? 'Verifique primeiro os de maior valor. Não encontrar a ART não é infração.' : grau === 'Candidato para revisão' ? 'Confirme se a ART corresponde ao objeto, ao local e ao período do contrato.' : undefined); }} />;
}

/** Anel com o valor dos contratos técnicos pela situação do fornecedor na data do contrato, com valor e parte escritos. */
export function Fornecedor({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, contratos = ctx.malha.contratos;
  const curto: Record<SituacaoFornecedor, string> = { 'Sem registro na data': 'Sem registro', 'Registrada, com anuidade vencida': 'Anuidade vencida', 'Registrada e quitada': 'Registrada e em dia' };
  const cores: Record<SituacaoFornecedor, string> = { 'Sem registro na data': tokens.bad, 'Registrada, com anuidade vencida': tokens.warn, 'Registrada e quitada': tokens.good };
  const grupos = situacoesFornecedor.map(situacao => ({ situacao, rows: contratos.filter(row => row.situacao === situacao) })).filter(row => row.rows.length), total = contratos.reduce((s, r) => s + r.valor, 0);
  const option = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (item: any) => `<b>${item.name}</b><br/>${brl(item.value)} · ${pct(item.percent)} do valor<br/>${int(grupos[item.dataIndex].rows.length)} contratos<br/><span style="opacity:.75">clique para ver</span>` },
    title: { text: brl(total), subtext: 'contratados', left: 'center', top: 'center', itemGap: 2, textStyle: { color: tokens.ink, fontSize: 15, fontWeight: 800, fontFamily: 'Raleway, Lato, sans-serif' }, subtextStyle: { color: tokens.muted, fontSize: 11 } },
    series: [{ type: 'pie', radius: ['32%', '48%'], padAngle: 1.5, itemStyle: { borderRadius: 3, borderColor: tokens.surface, borderWidth: 1 },
      label: { show: true, position: 'outside', alignTo: 'edge', edgeDistance: 4, fontSize: 11, color: tokens.ink, lineHeight: 13, formatter: (item: any) => `${curto[item.name as SituacaoFornecedor]}\n{b|${pct(item.percent)}, ${int(grupos[item.dataIndex].rows.length)} contratos}`, rich: { b: { fontWeight: 800, fontSize: 11 } } }, labelLine: { length: 8, length2: 0 },
      data: grupos.map(item => ({ name: item.situacao, value: item.rows.reduce((s, r) => s + r.valor, 0), itemStyle: { color: cores[item.situacao] } })) }],
  }), [grupos, tokens, total]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Valor dos contratos técnicos pela situação do fornecedor na data do contrato" onPick={params => { const item = grupos[params.dataIndex]; if (item) abrirContratos(ctx, item.rows, `Fornecedor: ${item.situacao.toLowerCase()}`, item.situacao === 'Sem registro na data' ? 'Confirme o objeto e a atividade; informe o órgão contratante quando couber.' : undefined); }} />;
}

/** Os contratos de maior valor em que nenhuma ART foi encontrada. */
export function ContratosSemArt({ ctx }: { ctx: CockpitCtx }) {
  const rows = useMemo(() => ctx.malha.contratos.filter(row => row.vinculo === 'Não identificado').sort((a, b) => b.valor - a.valor), [ctx.malha]);
  return <ul className="side-list is-cheia" aria-label="Contratos sem ART encontrada">{rows.slice(0, 7).map(row => <li key={row.id}><button className="is-acao" onClick={() => abrirContratos(ctx, [row], nomeEmpresa(ctx, row.companyId), 'Verifique com o órgão contratante antes de qualquer notificação.')}><span>{nomeEmpresa(ctx, row.companyId)}<small>{row.objeto}, em {data(row.data)}</small></span><b>{brl(row.valor)}</b></button></li>)}
    {rows.length > 7 && <li><button className="is-acao" onClick={() => abrirContratos(ctx, rows, 'Contratos sem ART encontrada', 'Verifique primeiro os de maior valor. Não encontrar a ART não é infração.')}><span>Ver todos os {int(rows.length)} contratos</span><b>{brl(rows.reduce((s, r) => s + r.valor, 0))}</b></button></li>}
    {!rows.length && <li className="side-note">Todos os contratos do recorte têm ART encontrada ou provável.</li>}</ul>;
}

/** Os dez maiores fornecedores pela parte no valor contratado, com a parte e o valor escritos; laranja é fornecedor sem registro em algum contrato. */
export function Concentracao({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, c = ctx.mercado.concentracao, top = useMemo(() => c.fornecedores.slice(0, 10), [c]);
  const option = useMemo(() => ({
    grid: { top: 24, right: 92, bottom: 2, left: 2, containLabel: true }, legend: { ...legenda(tokens), data: ['Registrada em todos os contratos', ...(top.some(row => !row.registradaEmTodos) ? ['Sem registro em algum contrato'] : [])] },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = top[items[0].dataIndex]; return `<b>${nomeEmpresa(ctx, row.companyId)}</b><br/>${brl(row.valor)} em ${int(row.contratos)} contrato${row.contratos === 1 ? '' : 's'} · ${pct(row.participacao, 1)} do valor${row.registradaEmTodos ? '' : '<br/>sem registro na data de ao menos um contrato'}`; } },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', inverse: true, data: top.map(row => nomeEmpresa(ctx, row.companyId)), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11, width: 150, overflow: 'truncate' } },
    // Duas séries empilhadas, uma por cor, para a legenda explicar o laranja; cada barra só tem valor numa delas.
    series: [{ registrada: true, name: 'Registrada em todos os contratos', cor: tokens.blue }, { registrada: false, name: 'Sem registro em algum contrato', cor: tokens.warn }].map(item => ({ name: item.name, type: 'bar', stack: 'c', barWidth: '58%', barMaxWidth: 34,
      data: top.map(row => row.registradaEmTodos === item.registrada ? row.participacao : '-'), itemStyle: { color: item.cor, borderRadius: [0, 3, 3, 0] },
      label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, formatter: (params: any) => `{b|${pct(params.value, 1)}}  ${brl(top[params.dataIndex].valor)}`, rich: { b: { fontWeight: 800, fontSize: 11 } } } })),
  }), [top, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Os dez maiores fornecedores e a parte de cada um no valor contratado" onPick={params => { const row = top[params.dataIndex]; if (row) abrirContratos(ctx, ctx.malha.contratos.filter(item => item.companyId === row.companyId), `${nomeEmpresa(ctx, row.companyId)}: contratos do período`, 'Participação descreve o mercado e não indica favorecimento.'); }} />;
}

/** O que os órgãos públicos planejam contratar, por etapa, com valor e número de itens escritos. */
export function PlanoContratacao({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, d = ctx.mercado.demanda, rows = etapasPca.map(etapa => d.porEtapa.find(row => row.etapa === etapa) ?? { etapa, n: 0, valor: 0 });
  const option = useMemo(() => ({
    grid: { top: 4, right: 110, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.etapa}</b><br/>${int(row.n)} itens técnicos · ${brl(row.valor)}`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.etapa), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [{ type: 'bar', barWidth: '56%', barMaxWidth: 34, data: rows.map(row => ({ value: row.valor, itemStyle: { color: tokens.blue, borderRadius: [0, 4, 4, 0] } })), label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, formatter: (item: any) => `{b|${brl(item.value)}}  ${int(rows[item.dataIndex].n)} itens`, rich: { b: { fontWeight: 800, fontSize: 11 } } } }],
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Itens técnicos dos planos de contratação, por etapa" />;
}

/** Contratado, empenhado, liquidado e pago nos contratos técnicos do período, com o valor e a parte do contratado escritos. */
export function EtapasTce({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.parcerias.tce;
  // As quatro etapas são do mesmo gasto, por isso têm a mesma cor. O contratado é o dos contratos achados no Tribunal, e não o de todos.
  const etapas = [{ label: 'Contratado (Tribunal)', valor: q.contratado }, { label: 'Empenhado', valor: q.empenhado }, { label: 'Liquidado', valor: q.liquidado }, { label: 'Pago', valor: q.pago }];
  const option = useMemo(() => ({
    grid: { top: 4, right: 92, bottom: 2, left: 2, containLabel: true }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (value: number) => brl(value) },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: etapas.map(row => row.label), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [{ type: 'bar', barWidth: '56%', barMaxWidth: 34, data: etapas.map(row => ({ value: row.valor, itemStyle: { color: tokens.blue, borderRadius: [0, 3, 3, 0] } })), label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, formatter: (params: any) => `{b|${brl(params.value)}}${params.dataIndex ? `  ${pct(params.value / Math.max(1, q.contratado) * 100)}` : ''}`, rich: { b: { fontWeight: 800, fontSize: 11 } } } }],
  }), [etapas, tokens, q.contratado]); // eslint-disable-line react-hooks/exhaustive-deps
  const abrir = () => { if (!q.etapas.length) return; ctx.open({ kind: 'linhas', eyebrow: 'Depende de parceria (TCE-SP)', title: 'Contratos técnicos e o que já foi pago', what: 'Contratos técnicos do período com as etapas da despesa publicadas pelo Tribunal de Contas, lidas na data escolhida.', use: 'Pago menor que o contratado é execução em curso, e não irregularidade.', listTitle: 'Contratos',
    rows: q.etapas.map(row => ({ key: row.contractId, companyId: row.companyId, title: nomeEmpresa(ctx, row.companyId), subtitle: `${row.fonte}; ligação com o contrato ${row.ponte.toLowerCase()}`, value: `${brl(row.pago)} pagos`, note: `${brl(row.contratado)} contratados, ${brl(row.empenhado)} empenhados e ${brl(row.liquidado)} liquidados`, sortValue: row.contratado })) }); };
  return <Chart option={option} tokens={tokens} label="Valor contratado, empenhado, liquidado e pago" onPick={abrir} />;
}

/* ---------- Obras ---------- */
export const obrasDoRecorte = (ctx: CockpitCtx) => ctx.frentes.obras.obras.filter(row => !ctx.cidadeId || row.cityId === ctx.cidadeId);
/** Obras públicas por regional do local da obra: iniciadas com e sem ART de fiscalização e não iniciadas, com o total escrito. */
export function ObrasRegional({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, obras = useMemo(() => obrasDoRecorte(ctx), [ctx.frentes, ctx.cidadeId]); // eslint-disable-line react-hooks/exhaustive-deps
  const nomes = useMemo(() => new Map(ctx.dataset.gres.map(row => [row.id, short(row.name)])), [ctx.dataset]);
  const grupos = useMemo(() => { const map = new Map<string, typeof obras>(); for (const row of obras) map.set(row.greId, [...(map.get(row.greId) ?? []), row]);
    return [...map].map(([greId, rows]) => ({ greId, com: rows.filter(row => row.situacao !== 'Não iniciada' && row.artFiscalizacao), sem: rows.filter(row => row.situacao !== 'Não iniciada' && !row.artFiscalizacao), nao: rows.filter(row => row.situacao === 'Não iniciada'), total: rows.length })).sort((a, b) => b.total - a.total); }, [obras]);
  const series = [{ campo: 'com' as const, name: 'Com ART de fiscalização', cor: tokens.good }, { campo: 'sem' as const, name: 'Sem ART de fiscalização', cor: tokens.warn }, { campo: 'nao' as const, name: 'Ainda não começou', cor: tokens.line }].filter(item => grupos.some(row => row[item.campo].length));
  const option = useMemo(() => ({
    grid: { top: 24, right: 30, bottom: 2, left: 2, containLabel: true }, legend: { ...legenda(tokens), data: series.map(item => item.name) },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = grupos[items[0].dataIndex]; return `<b>${nomes.get(row.greId)}</b><br/>${int(row.total)} obras · ${int(row.sem.length)} começaram sem ART de fiscalização<br/><span style="opacity:.75">clique para ver as obras</span>`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: grupos.map(row => nomes.get(row.greId) ?? row.greId), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11, interval: 0 } },
    series: [...series.map((item, index) => ({ name: item.name, type: 'bar', stack: 'o', barWidth: '62%', barMaxWidth: 34, data: grupos.map(row => row[item.campo].length), itemStyle: { color: item.cor, borderRadius: index === series.length - 1 ? [0, 3, 3, 0] : 0 },
      label: { show: true, color: corDoTexto(item.cor), fontSize: 11, fontWeight: 700, formatter: (params: any) => params.value >= 3 ? int(params.value) : '' } })), serieTotal(tokens, 'o', grupos.map(row => row.total))],
  }), [grupos, series, tokens, nomes]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Obras públicas por regional, com e sem ART de fiscalização" onPick={params => { const row = grupos[params.dataIndex], item = series[params.seriesIndex]; if (!row || !item) return; abrirObras(ctx, row[item.campo], `${nomes.get(row.greId)}: ${item.name.toLowerCase()}`); }} />;
}
export function abrirObras(ctx: CockpitCtx, obras: ReturnType<typeof obrasDoRecorte>, title: string) {
  if (!obras.length) return;
  ctx.open({ kind: 'linhas', title, what: 'Obras públicas do Obrasgov, pelo local onde a obra acontece, ligadas ao contrato do PNCP e lidas na data escolhida.', use: 'Oriente o órgão contratante sobre a ART de fiscalização antes de qualquer notificação. A ART pode ter outro número.', listTitle: 'Obras, maior valor primeiro',
    rows: obras.map(row => ({ key: row.id, companyId: row.companyId, title: nomeEmpresa(ctx, row.companyId), subtitle: `${row.objeto}, ${row.situacao.toLowerCase()}`, value: brl(row.valor), note: `${row.artFiscalizacao ? 'ART de fiscalização encontrada' : 'sem ART de fiscalização'}; ligação com o contrato: ${row.ponte.toLowerCase()}`, sortValue: row.valor })) });
}

/** Anel das obras públicas pela situação na data escolhida, com o número e a parte escritos. */
export function SituacaoObras({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, obras = useMemo(() => obrasDoRecorte(ctx), [ctx.frentes, ctx.cidadeId]); // eslint-disable-line react-hooks/exhaustive-deps
  const cores = { 'Não iniciada': tokens.line, 'Em execução': tokens.blue, Paralisada: tokens.warn, Concluída: tokens.good } as Record<string, string>;
  const partes = (['Em execução', 'Paralisada', 'Concluída', 'Não iniciada'] as const).map(situacao => ({ situacao, rows: obras.filter(row => row.situacao === situacao) })).filter(row => row.rows.length);
  const option = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (item: any) => `<b>${item.name}</b><br/>${int(item.value)} obras · ${pct(item.percent)}<br/><span style="opacity:.75">clique para ver</span>` },
    title: { text: int(obras.length), subtext: 'obras públicas', left: 'center', top: 'center', itemGap: 2, textStyle: { color: tokens.ink, fontSize: 17, fontWeight: 800, fontFamily: 'Raleway, Lato, sans-serif' }, subtextStyle: { color: tokens.muted, fontSize: 11 } },
    series: [{ type: 'pie', radius: ['46%', '66%'], padAngle: 1.5, itemStyle: { borderRadius: 3, borderColor: tokens.surface, borderWidth: 1 },
      label: { show: true, position: 'outside', fontSize: 11, color: tokens.ink, lineHeight: 13, formatter: (item: any) => `${item.name}\n{b|${int(item.value)} (${pct(item.percent)})}`, rich: { b: { fontWeight: 800, fontSize: 11 } } }, labelLine: { length: 6, length2: 6 },
      data: partes.map(row => ({ name: row.situacao, value: row.rows.length, itemStyle: { color: cores[row.situacao] } })) }],
  }), [partes, tokens, obras.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Obras públicas pela situação na data escolhida" onPick={params => { const row = partes[params.dataIndex]; if (row) abrirObras(ctx, row.rows, `Obras ${row.situacao.toLowerCase()}`); }} />;
}

/** As maiores obras que começaram sem ART de fiscalização. */
export function ObrasSemArt({ ctx }: { ctx: CockpitCtx }) {
  const rows = useMemo(() => obrasDoRecorte(ctx).filter(row => row.situacao !== 'Não iniciada' && !row.artFiscalizacao).sort((a, b) => b.valor - a.valor), [ctx.frentes, ctx.cidadeId]); // eslint-disable-line react-hooks/exhaustive-deps
  return <ul className="side-list is-cheia" aria-label="Obras sem ART de fiscalização">{rows.slice(0, 7).map(row => <li key={row.id}><button className="is-acao" onClick={() => abrirObras(ctx, [row], nomeEmpresa(ctx, row.companyId))}><span>{nomeEmpresa(ctx, row.companyId)}<small>{row.objeto}, {row.situacao.toLowerCase()}</small></span><b>{brl(row.valor)}</b></button></li>)}
    {rows.length > 7 && <li><button className="is-acao" onClick={() => abrirObras(ctx, rows, 'Obras sem ART de fiscalização')}><span>Ver todas as {int(rows.length)} obras</span><b>{brl(rows.reduce((s, r) => s + r.valor, 0))}</b></button></li>}
    {!rows.length && <li className="side-note">Nenhuma obra começou sem ART de fiscalização no recorte.</li>}</ul>;
}

/** Obras privadas do cadastro da Receita: as quatro etapas da busca pela ART, com o número e a parte da primeira etapa escritos. */
export function CnoFunil({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.parcerias.cno;
  const etapas = [{ label: 'Obras privadas em SP', rows: q.obras }, { label: 'Com os dados mínimos', rows: q.comDadosMinimos }, { label: 'Informam o número da ART', rows: q.comCampoArt }, { label: 'ART encontrada', rows: q.comArtLocalizada }];
  const option = useMemo(() => ({
    grid: { top: 4, right: 84, bottom: 2, left: 2, containLabel: true }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: etapas.map(row => row.label), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [{ type: 'bar', name: 'Obras', barWidth: '56%', barMaxWidth: 34, data: etapas.map(row => ({ value: row.rows.length, itemStyle: { color: tokens.blue, borderRadius: [0, 3, 3, 0] } })), label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, formatter: (params: any) => `{b|${int(params.value)}}${params.dataIndex ? `  ${pct(params.value / Math.max(1, etapas[0].rows.length) * 100)}` : ''}`, rich: { b: { fontWeight: 800, fontSize: 11 } } } }],
  }), [etapas, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Obras privadas do Cadastro Nacional de Obras e a ART" onPick={params => { const etapa = etapas[params.dataIndex]; if (!etapa?.rows.length) return;
    ctx.open({ kind: 'linhas', eyebrow: 'Depende de parceria (Cadastro Nacional de Obras)', title: `Obras privadas: ${etapa.label.toLowerCase()}`, what: 'Obras inscritas no Cadastro Nacional de Obras, em SP, cujo responsável tem atividade de engenharia, na data escolhida.', use: 'O papel do responsável (executora, responsável pelos tributos ou proprietário) muda o que a ART deve cobrir.', listTitle: 'Obras',
      rows: etapa.rows.map(row => ({ key: row.id, companyId: row.companyId, title: nomeEmpresa(ctx, row.companyId), subtitle: `${row.papel}, ${row.situacao.toLowerCase()}`, value: row.artLocalizada ? 'ART encontrada' : row.campoArt ? 'ART não encontrada' : 'número da ART em branco', note: `inscrita em ${data(row.inscricao)}`, sortValue: row.artLocalizada ? 0 : 1 })) }); }} />;
}

/** Obras privadas pelo papel do responsável, com quantos responsáveis têm registro no Crea-SP. */
export function CnoPapel({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.parcerias.cno, rows = q.porPapel;
  const nomePapel: Record<PapelCno, string> = { Executora: 'Executa a obra', 'Responsável tributário': 'Responde pelos tributos', Proprietário: 'É a proprietária' };
  const option = useMemo(() => ({
    grid: { top: 24, right: 40, bottom: 2, left: 2, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${nomePapel[row.papel]}</b><br/>${int(row.n)} obras · ${int(row.registradas)} com responsável registrado (${pct(row.registradas / Math.max(1, row.n) * 100)})`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => nomePapel[row.papel]), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [
      { name: 'Responsável registrado', type: 'bar', stack: 'p', barWidth: '56%', barMaxWidth: 34, data: rows.map(row => row.registradas), itemStyle: { color: tokens.good }, label: { show: true, color: corDoTexto(tokens.good), fontSize: 11, fontWeight: 700, formatter: (item: any) => pct(item.value / Math.max(1, rows[item.dataIndex].n) * 100) } },
      { name: 'Sem registro', type: 'bar', stack: 'p', data: rows.map(row => row.n - row.registradas), itemStyle: { color: tokens.line, borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, fontWeight: 700, formatter: (item: any) => int(rows[item.dataIndex].n) } },
    ],
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Obras privadas pelo papel do responsável e o registro dele no Crea-SP" />;
}

/** Licenças e alvarás por órgão: titular registrado ou não, com o total e as que têm ART ligada escritos. */
export function LicencasFonte({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = ctx.parcerias.licencas, rows = q.porFonte.filter(row => row.n);
  const option = useMemo(() => ({
    grid: { top: 24, right: 150, bottom: 2, left: 2, containLabel: true }, legend: legenda(tokens),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.fonte}</b><br/>${int(row.n)} licenças (${int(row.vigentes)} vigentes) · ${int(row.titularRegistrado)} titulares registrados<br/>${int(row.obras)} de obra ou instalação · ${int(row.artPonte)} com ART ligada<br/><span style="opacity:.75">clique para ver</span>`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.fonte === 'Alvará municipal' ? 'Alvará da prefeitura' : row.fonte === 'AVCB' ? 'Corpo de Bombeiros' : row.fonte), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [
      { name: 'Titular registrado', type: 'bar', stack: 'l', barWidth: '58%', barMaxWidth: 34, data: rows.map(row => row.titularRegistrado), itemStyle: { color: tokens.good } },
      { name: 'Titular sem registro', type: 'bar', stack: 'l', data: rows.map(row => row.n - row.titularRegistrado), itemStyle: { color: tokens.line, borderRadius: [0, 3, 3, 0] },
        label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, formatter: (item: any) => { const row = rows[item.dataIndex]; return `{b|${int(row.n)}}  ${row.obras ? `${int(row.artPonte)} de ${int(row.obras)} obra${row.obras === 1 ? '' : 's'} com ART` : 'sem obras'}`; }, rich: { b: { fontWeight: 800, fontSize: 11 } } } },
    ],
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Licenças e alvarás por órgão, pelo registro do titular e pela ART" onPick={params => { const row = rows[params.dataIndex]; if (!row) return; const lista = q.licencas.filter(item => item.fonte === row.fonte); if (!lista.length) return;
    ctx.open({ kind: 'linhas', eyebrow: 'Depende de parceria', title: `Licenças e alvarás: ${row.fonte}`, what: 'Licenças, alvarás e autos de vistoria cujo titular tem atividade de engenharia, na data escolhida.', use: 'O titular nem sempre executa a obra. A ART só se liga pelo número do processo.', listTitle: 'Licenças',
      rows: lista.map(item => ({ key: item.id, companyId: item.companyId, title: nomeEmpresa(ctx, item.companyId), subtitle: `${item.tipo}, ${item.fase.toLowerCase()}`, value: item.obra ? (item.artPonte ? 'ART ligada' : 'sem ART ligada') : 'não é obra', note: item.executoraId ? `executora: ${nomeEmpresa(ctx, item.executoraId)}` : 'executora não identificada', sortValue: item.obra && !item.artPonte ? 1 : 0 })) }); }} />;
}
