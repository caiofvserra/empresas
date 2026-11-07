import { useMemo, useState } from 'react';
import { Chart, proporcaoSp, useSpMap } from '../painel/chart';
import { rotulosGre, territorioGre } from '../painel/territorio';
import { municipioPorId, municipiosSp } from '../domain/municipios';
import { faixasPorQuantil } from '../empresas/municipios';
import { brl, int, mes, money, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import type { Gestao } from '../cockpit/contexto';
import type { DevedorLinha } from '../domain/gestao';
import { nomeEmpresa } from '../cockpit/ui';
import type { Beneficiario } from '../domain/pessoas-conselho';

/**
 * Peças comuns do painel de Gestão do Conselho (06/11/2026): as mesmas regras dos outros painéis. Clicar num item abre a lista
 * (processos, devedores, lançamentos); regional, município, câmara, período e data são filtros do alto da tela; cada página cabe numa
 * tela sem rolagem; o bloco mostra só o título e o gráfico, com os números escritos, e a explicação fica no (i).
 */
export const g = (ctx: CockpitCtx): Gestao => ctx.gestao!;
export const change = (now: number, before: number | null | undefined) => before ? (now - before) / before * 100 : null;
export const compacto = (value: number) => value.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
export const legenda = (tokens: CockpitCtx['tokens']) => ({ top: 0, left: 0, itemWidth: 10, itemHeight: 8, itemGap: 10, textStyle: { color: tokens.muted, fontSize: 11 } });
export const eixoCategoria = (tokens: CockpitCtx['tokens'], data: string[], extra: Record<string, unknown> = {}) => ({ type: 'category', data, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 11 }, ...extra });
export const eixoValor = (tokens: CockpitCtx['tokens'], extra: Record<string, unknown> = {}) => ({ type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 11, formatter: compacto }, ...extra });
const dataBr = (value: string) => value.split('-').reverse().join('/');

/** As diárias de uma pessoa, mês a mês, no painel lateral (Financeiro e Conselho). */
export function abrirPessoaDiarias(ctx: CockpitCtx, p: Beneficiario) {
  const nomeGre = new Map(ctx.dataset.gres.map(row => [row.id, row.name]));
  ctx.open({ kind: 'linhas', title: p.nome, eyebrow: p.categoria, what: `${p.cargo}, ${p.greId ? `lotação na ${nomeGre.get(p.greId) ?? p.greId}` : 'na sede'}. Diárias recebidas em cada mês dos 12 meses até a data de referência.`, use: 'Diária paga não é irregularidade: compare com a função da pessoa e com as outras da mesma categoria.',
    listTitle: 'Meses com diária', summary: [['Diárias', int(p.quantidade)], ['Valor', brl(p.valor)], ['Quilômetros', p.km ? int(p.km) : '—']],
    rows: p.lancamentos.map(l => ({ key: l.month, title: mes(l.month), subtitle: `${int(l.quantidade)} ${l.quantidade === 1 ? 'diária' : 'diárias'}${l.km ? ` em ${int(l.km)} km` : ''}`, value: money(l.valor), note: '', sortValue: -Number(l.month.replace('-', '')) })) });
}

/** Lista de devedores no painel lateral: empresas com ficha, profissionais sem ficha de empresa. */
export function abrirDevedores(ctx: CockpitCtx, title: string, rows: DevedorLinha[], what: string, use?: string) {
  if (!rows.length) return;
  const cidades = municipioPorId(ctx.dataset), piso = g(ctx).divida.piso;
  ctx.open({ kind: 'linhas', title, what, use, listTitle: 'Devedores, maior valor primeiro', summary: [['Devedores', int(rows.length)], ['Valor vencido', brl(rows.reduce((total, row) => total + row.valor, 0))], ['Acima do piso', int(rows.filter(row => row.acimaDoPiso).length)]],
    rows: rows.map(row => { const p = row.devedor === 'Profissional' ? ctx.profissionais.modelo.porId.get(row.pessoaId) : undefined;
      return { key: `${row.devedor}:${row.pessoaId}`, ...(row.devedor === 'Empresa' ? { companyId: row.pessoaId } : {}), title: row.devedor === 'Empresa' ? nomeEmpresa(ctx, row.pessoaId) : p?.nome ?? row.pessoaId,
        subtitle: `${row.devedor} · ${cidades.get(row.cityId)?.nome ?? ''} · ${int(row.titulos.length)} ${row.titulos.length === 1 ? 'anuidade' : 'anuidades'}`, value: brl(row.valor),
        note: `${row.acimaDoPiso ? 'pode ir à execução judicial' : `abaixo do piso de ${brl(piso)}`} · vencida desde ${dataBr(row.maisAntigo)}`, sortValue: -row.valor }; }) });
}

const rampa = (alerta: boolean, dark: boolean) => alerta
  ? (dark ? ['#3A2E22', '#7A5A10', '#C9851F', '#E5703B', '#FF7B7B'] : ['#FFF4D6', '#FFD98A', '#F6AD55', '#E5703B', '#C53030'])
  : (dark ? ['#2A4A7F', '#3B67A8', '#5B8FD0', '#8DBCEB', '#D4EDFF'] : ['#C3D9F2', '#93BCEA', '#5E9BDD', '#2B6CB0', '#082D74']);
const semDados = (dark: boolean) => dark ? '#3A4250' : '#E3E6EA';

export interface Medida { label: string; curto: string; fmt: (value: number) => string; alerta?: boolean; menorPrimeiro?: boolean;
  /** Valor de cada município (nulo = poucos dados) e de cada regional. */
  cidade: Map<string, number | null>; gre: Map<string, number | null>; dica?: (cityId: string) => string }
/**
 * Mapa do estado com o limite de cada um dos 645 municípios, pintado pelo valor do município em cinco faixas, como nos outros painéis.
 * O valor de cada GRE fica na lista ao lado; passar o mouse numa GRE acende os municípios dela. Sem bolhas.
 */
export function MapaMunicipios({ ctx, medida, onCidade, onGre }: { ctx: CockpitCtx; medida: Medida; onCidade: (cityId: string) => void; onGre: (greId: string) => void }) {
  const centroids = useSpMap(), { tokens, dark } = ctx, [destaque, setDestaque] = useState<string | null>(null);
  const regioes = useMemo(() => centroids ? territorioGre(ctx.dataset, centroids) : null, [centroids, ctx.dataset]);
  const rotulos = useMemo(() => regioes && centroids ? rotulosGre(regioes, centroids) : null, [regioes, centroids]);
  const porNome = useMemo(() => new Map(municipiosSp(ctx.dataset).map(row => [row.nome, row])), [ctx.dataset]);
  const nomeGre = useMemo(() => new Map(ctx.dataset.gres.map(row => [row.id, row.name])), [ctx.dataset]);
  const local = ctx.cidadeId ? municipioPorId(ctx.dataset).get(ctx.cidadeId) : undefined;
  const classes = useMemo(() => {
    const valores = [...medida.cidade.values()].filter((value): value is number => value !== null), classe = faixasPorQuantil(valores), cores = rampa(Boolean(medida.alerta), dark);
    const faixas = cores.map((cor, index) => { const membros = valores.filter(value => classe(value) === index).sort((a, b) => a - b); return { cor, min: membros[0] ?? null, max: membros.at(-1) ?? null }; }).filter(row => row.min !== null);
    return { classe, cores, faixas, temVazio: valores.length < medida.cidade.size };
  }, [medida, dark]);
  const cor = (nome: string) => { const row = porNome.get(nome), value = row ? medida.cidade.get(row.id) ?? null : null; return value === null ? semDados(dark) : classes.cores[classes.classe(value)]; };
  const ranking = [...medida.gre].filter((item): item is [string, number] => item[1] !== null).sort((a, b) => medida.menorPrimeiro ? a[1] - b[1] : b[1] - a[1]);
  const maximo = Math.max(...ranking.map(item => Math.abs(item[1])), 1);
  const option = useMemo(() => {
    if (!regioes || !rotulos || !centroids) return null;
    const foco = local ? { center: centroids.get(local.nome), zoom: 3.2 } : ctx.greId ? { center: rotulos.get(ctx.greId), zoom: 2.2 } : null;
    const dica = (nome: string) => { const row = porNome.get(nome); if (!row) return nome; const value = medida.cidade.get(row.id) ?? null, daGre = medida.gre.get(row.greId) ?? null;
      return `<b>${nome}</b> · ${nomeGre.get(row.greId) ?? ''}<br/>${medida.label}: <b>${value === null ? 'poucos dados' : medida.fmt(value)}</b>${medida.dica ? `<br/><span style="opacity:.8">${medida.dica(row.id)}</span>` : ''}<br/><span style="opacity:.8">Na ${nomeGre.get(row.greId) ?? 'GRE'}: ${daGre === null ? '—' : medida.fmt(daGre)}</span>`; };
    return {
      tooltip: { trigger: 'item', formatter: (item: any) => item.componentType === 'geo' ? dica(item.name) : '' },
      geo: { map: 'spPainel', ...proporcaoSp, roam: true, scaleLimit: { min: 1, max: 8 }, ...(foco?.center ? { center: foco.center, zoom: foco.zoom } : { left: 2, right: 2, top: 2, bottom: 2 }), selectedMode: false, tooltip: { show: true },
        itemStyle: { areaColor: tokens.soft, borderColor: tokens.surface, borderWidth: 0.35 }, emphasis: { itemStyle: { areaColor: tokens.accent }, label: { show: false } },
        regions: [...regioes].map(([name, greId]) => { const apagado = destaque ? destaque !== greId : Boolean(ctx.greId && ctx.greId !== greId), escolhido = local?.nome === name;
          return { name, itemStyle: { areaColor: cor(name), opacity: apagado ? 0.25 : 1, borderColor: escolhido ? tokens.ink : tokens.surface, borderWidth: escolhido ? 1.6 : 0.35 } }; }) },
      series: [{ type: 'scatter', coordinateSystem: 'geo', symbolSize: 1, itemStyle: { color: 'transparent' }, silent: true,
        data: [...rotulos].map(([greId, at]) => ({ name: nomeGre.get(greId) ?? greId, value: at })),
        label: { show: true, formatter: (item: any) => item.name, color: dark ? '#E2E8F0' : '#1A202C', fontSize: 11, fontWeight: 700, textBorderColor: dark ? 'rgba(8,20,40,.9)' : 'rgba(255,255,255,.85)', textBorderWidth: 2.5 },
        labelLayout: { hideOverlap: true } }],
    };
  }, [regioes, rotulos, centroids, classes, medida, tokens, destaque, ctx.greId, local, porNome, nomeGre]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="geo-layout is-compacto">
    <div className="geo-map">{option ? <Chart option={option} tokens={tokens} label={`Mapa por município: ${medida.label}`} onPick={params => { if (params.componentType === 'geo') { const row = porNome.get(params.name); if (row) onCidade(row.id); } }} /> : <div className="loading">Carregando o mapa…</div>}
      <ul className="geo-legend" aria-label="Faixas dos municípios">{classes.faixas.map((item, index) => <li key={index}><i style={{ background: item.cor }} />{item.min === item.max ? medida.fmt(item.min!) : `${medida.fmt(item.min!)} a ${medida.fmt(item.max!)}`}</li>)}{classes.temVazio && <li><i style={{ background: semDados(dark) }} />poucos dados</li>}</ul></div>
    <ol className="geo-rank is-gre" onMouseLeave={() => setDestaque(null)} aria-label={`GREs por ${medida.label}`}><li className="geo-rank-head"><span>GRE</span><b>{medida.curto}</b></li>{ranking.map(([greId, value]) =>
      <li key={greId}><button onClick={() => onGre(greId)} onMouseEnter={() => setDestaque(greId)} onFocus={() => setDestaque(greId)} className={ctx.greId === greId ? 'is-selected' : ''}>
        <span>{nomeGre.get(greId) ?? greId}</span><b>{medida.fmt(value)}</b><em style={{ width: `${Math.abs(value) / maximo * 100}%` }} /></button></li>)}</ol>
  </div>;
}

/** Porcentagem sem casas, com "—" quando não há base. */
export const pctOu = (value: number | null | undefined, digits = 0) => value === null || value === undefined ? '—' : pct(value, digits);
/** Índice do último valor preenchido de uma série (o rótulo vai no fim da linha). */
export const ultimoIndice = (values: (number | null)[]) => { for (let index = values.length - 1; index >= 0; index--) if (values[index] !== null) return index; return -1; };
