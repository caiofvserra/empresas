import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowDownUp, ChevronDown } from 'lucide-react';
import { Chart, Spark, useSpMap } from '../painel/chart';
import { devedoras } from '../painel/analise';
import { rotulosGre, territorioGre } from '../painel/territorio';
import { Segments, brl, int, pct } from '../painel/ui';
import type { CockpitCtx } from './contexto';
import type { LinhaGre } from './medidas';
import { Bloco, Indicador } from './ui';

/** Aba 1 · Visão geral: um cartão por assunto (abre a aba do assunto), o mapa das regionais, o quadro comparativo e a leitura do período. */
const change = (now: number, before: number | null | undefined) => before ? (now - before) / before * 100 : null;

export default function PaginaGeral({ ctx }: { ctx: CockpitCtx }) {
  const { model, history, resumo, rec, malha, estrutura, arts, metas, tokens, period } = ctx;
  const months = history.monthly, before = months.length > period ? months[months.length - 1 - period] : null;
  const base = model.metrics.base.value ?? 0, cobertura = model.metrics.coverage.value, saldo = model.metrics.overdue.value ?? 0;
  const cobradas = model.metrics.compliance.denominatorCompanyIds?.length ?? 0, inad = cobradas ? devedoras(model).size / cobradas * 100 : null;
  const semRegistro = model.metadata.eligibleEstablishmentIds.length - model.metadata.activeEligibleEstablishmentIds.length;
  const taxa = estrutura?.atendimento.taxaNoPrazo ?? null, taxaAntes = estrutura?.atendimento.taxaNoPrazoAntes ?? null;
  return <div className="ck-grid ck-grid-geral">
    <section className="ck-cards" style={{ gridArea: 'kpi' }} aria-label="Um indicador por assunto">
      <Indicador destaque aspecto="Cadastro" label="Empresas registradas" value={int(base)} variacao={{ value: change(base, before?.base), label: `em ${period} meses` }} spark={months.map(row => row.base)} cor={tokens.accent} sub={`${int(ctx.ponte.viaFiscalizacao.length)} entraram após fiscalização`} onOpen={() => ctx.go('cadastro')} />
      <Indicador aspecto="Mercado" label="Cobertura do mercado" value={cobertura === null ? '—' : pct(cobertura, 1)} variacao={{ value: cobertura === null ? null : cobertura - metas.cobertura, kind: 'pp', label: `vs. meta de ${metas.cobertura}%` }} meta={{ atual: cobertura, alvo: metas.cobertura }} sub={`${int(semRegistro)} CNPJs de engenharia sem registro`} onOpen={() => ctx.go('cadastro')} />
      <Indicador aspecto="Fiscalização" label="Autos de infração" value={int(resumo.autos.length)} variacao={{ value: change(resumo.autos.length, resumo.autosPrev) }} spark={resumo.mensal.map(row => row.autos.registro + row.autos.rt + row.autos.art)} cor={tokens.bad} sub={`${int(resumo.acoes.length)} ações · ${int(resumo.regularizacoes.length)} regularizações`} onOpen={() => ctx.go('fiscalizacao')} />
      <Indicador aspecto="Receita" label="Arrecadação de empresas" value={brl(rec.total)} variacao={{ value: rec.totalAntes === null ? null : change(rec.total, rec.totalAntes) }} spark={rec.mensal.map(row => row.anuidades + row.multas)} cor={tokens.good} sub={`${brl(rec.multas)} de multas`} onOpen={() => ctx.go('receita')} />
      <Indicador aspecto="Cobrança" label="Saldo vencido" value={brl(saldo)} variacao={{ value: change(saldo, before?.overdue), goodUp: false, label: `em ${period} meses` }} spark={months.map(row => row.overdue)} cor={tokens.bad} sub={inad === null ? '' : `${pct(inad)} das empresas cobradas inadimplentes`} onOpen={() => ctx.go('receita')} />
      <Indicador aspecto="Responsabilidade técnica" label="ARTs de empresas" value={int(arts.atual.length)} variacao={{ value: change(arts.atual.length, arts.antes) }} spark={arts.mensal} cor={tokens.blue} sub={`${pct(model.metrics.rtCoverage.value ?? 0)} das empresas com RT`} onOpen={() => ctx.go('tecnica')} />
      <Indicador aspecto="Malha fina" label="Empresas com indício" value={int(malha.empresas.length)}
        sub={<><Segments parts={[{ label: 'Com ação fiscal', value: malha.comAcao.length, color: tokens.good }, { label: 'Sem ação fiscal', value: malha.empresas.length - malha.comAcao.length, color: tokens.warn }]} />{pct(malha.comAcao.length / Math.max(1, malha.empresas.length) * 100)} já com ação fiscal</>} onOpen={() => ctx.go('malha')} />
      <Indicador aspecto="Atendimento" label="Solicitações resolvidas no prazo" value={taxa === null ? '…' : pct(taxa)} variacao={{ value: taxa === null || taxaAntes === null ? null : taxa - taxaAntes, kind: 'pp' }} meta={{ atual: taxa, alvo: metas.atendimento }}
        sub={estrutura?.atendimento.medianaDias == null ? 'calculando…' : `mediana de ${int(estrutura.atendimento.medianaDias)} dias`} onOpen={() => ctx.go('atendimento')} />
    </section>
    <MapaRegional ctx={ctx} />
    <Bloco ctx={ctx} id="sc" area="sc" title="Quadro das regionais" question="Cada regional em todos os assuntos. Setas comparam com as metas; cores marcam as maiores lacunas. Clique numa linha para o resumo da regional."><Quadro ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="lt" area="lt" title="Leitura do período" question="Destaques calculados a cada filtro. Clique numa frase para abrir o assunto." className="t-leitura">
      <ul className="leitura">{ctx.insights.map((item, index) => <li key={index} className={`is-${item.tone}`}><button onClick={() => ctx.go(item.page)}><i aria-hidden="true" /><span><b>{item.strong}</b> {item.text}</span></button></li>)}</ul>
    </Bloco>
  </div>;
}

/* ---------- Mapa das regionais: território de cada GRE pintado pelos municípios, indicador à escolha ---------- */
type Metrica = 'empresas' | 'cobertura' | 'semRegistro' | 'autos' | 'regularizadas' | 'arrecadacao' | 'inadimplencia' | 'arts' | 'indicios' | 'emprego';
const metricas: Record<Metrica, { label: string; get: (row: LinhaGre) => number | null; fmt: (value: number) => string; alerta?: boolean; menorPrimeiro?: boolean }> = {
  empresas: { label: 'Empresas registradas', get: row => row.base, fmt: int },
  cobertura: { label: 'Cobertura do mercado', get: row => row.cobertura, fmt: value => pct(value), menorPrimeiro: true },
  semRegistro: { label: 'CNPJs de engenharia sem registro', get: row => row.semRegistro, fmt: int, alerta: true },
  autos: { label: 'Autos de infração no período', get: row => row.autos, fmt: int },
  regularizadas: { label: '% das ações já regularizadas', get: row => row.regularizadas, fmt: value => pct(value), menorPrimeiro: true },
  arrecadacao: { label: 'Arrecadação de anuidades', get: row => row.arrecadacao, fmt: brl },
  inadimplencia: { label: 'Inadimplência', get: row => row.inadimplencia, fmt: value => pct(value), alerta: true },
  arts: { label: 'ARTs de empresas no período', get: row => row.arts, fmt: int },
  indicios: { label: 'Empresas com indício de irregularidade', get: row => row.indicios.length, fmt: int, alerta: true },
  emprego: { label: 'Empregos técnicos (RAIS/CAGED)', get: row => row.empregoTecnico, fmt: int },
};
const rampa = (alerta: boolean, dark: boolean) => alerta
  ? (dark ? ['#3A2E22', '#7A5A10', '#C9851F', '#E5703B', '#FF7B7B'] : ['#FFF4D6', '#FFD98A', '#F6AD55', '#E5703B', '#C53030'])
  : (dark ? ['#1A2D52', '#2F548C', '#4A7FC1', '#7FB0E6', '#D4EDFF'] : ['#EAF1FA', '#BBD5F2', '#7FB0E6', '#3182CE', '#082D74']);

function MapaRegional({ ctx }: { ctx: CockpitCtx }) {
  const [metrica, setMetrica] = useState<Metrica>('empresas');
  const [destaque, setDestaque] = useState<string | null>(null);
  const centroids = useSpMap(), { tokens, linhas, dark } = ctx, config = metricas[metrica];
  const territorio = useMemo(() => centroids ? territorioGre(ctx.dataset, centroids) : null, [centroids, ctx.dataset]);
  const rotulos = useMemo(() => territorio && centroids ? rotulosGre(territorio, centroids) : null, [territorio, centroids]);
  const classes = useMemo(() => {
    const rows = linhas.filter(row => config.get(row) !== null).sort((a, b) => config.get(a)! - config.get(b)!), colors = rampa(Boolean(config.alerta), dark);
    const cls = new Map(rows.map((row, index) => [row.id, Math.min(4, Math.floor(index / rows.length * 5))]));
    const faixas = colors.map((color, index) => { const members = rows.filter(row => cls.get(row.id) === index).map(row => config.get(row)!); return { color, min: members.length ? Math.min(...members) : null, max: members.length ? Math.max(...members) : null }; });
    return { cls, colors, faixas };
  }, [linhas, config, dark]);
  const byId = new Map(linhas.map(row => [row.id, row]));
  const color = (greId: string) => { const index = classes.cls.get(greId); return index === undefined ? tokens.line : classes.colors[index]; };
  const ranking = [...linhas].filter(row => config.get(row) !== null).sort((a, b) => config.menorPrimeiro ? config.get(a)! - config.get(b)! : config.get(b)! - config.get(a)!);
  const maximo = Math.max(...ranking.map(row => Math.abs(config.get(row)!)), 1);
  const option = useMemo(() => {
    if (!territorio || !rotulos) return null;
    const tip = (greId: string) => { const row = byId.get(greId); if (!row) return ''; const value = config.get(row);
      return `<b>${row.name}</b><br/>${config.label}: <b>${value === null ? '—' : config.fmt(value)}</b><br/><span style="opacity:.8">Empresas ${int(row.base)} · cobertura ${row.cobertura === null ? '—' : pct(row.cobertura)} · autos ${int(row.autos)} · inadimplência ${row.inadimplencia === null ? '—' : pct(row.inadimplencia)}</span><br/><span style="opacity:.7">clique para o resumo da regional</span>`; };
    return {
      tooltip: { trigger: 'item', formatter: (params: any) => tip(params.componentType === 'geo' ? territorio.get(params.name) ?? '' : params.data?.greId ?? '') },
      geo: { map: 'spPainel', roam: true, scaleLimit: { min: 1, max: 5 }, left: 4, right: 4, top: 4, bottom: 4, selectedMode: false, tooltip: { show: true },
        itemStyle: { areaColor: tokens.soft, borderColor: tokens.surface, borderWidth: 0.35 }, emphasis: { disabled: true },
        regions: [...territorio].map(([name, greId]) => { const faded = destaque ? destaque !== greId : Boolean(ctx.greId && ctx.greId !== greId), selected = ctx.greId === greId;
          return { name, itemStyle: { areaColor: color(greId), opacity: faded ? 0.3 : 1, borderColor: selected ? tokens.ink : tokens.surface, borderWidth: selected ? 0.8 : 0.35 } }; }) },
      series: [{ type: 'scatter', coordinateSystem: 'geo', symbolSize: 1, itemStyle: { color: 'transparent' },
        data: [...rotulos].map(([greId, at]) => { const row = byId.get(greId), value = row ? config.get(row) : null; return { name: row?.curto ?? greId, greId, valor: value === null ? '—' : config.fmt(value), value: at }; }),
        label: { show: true, formatter: (params: any) => `{n|${params.name}}\n{v|${params.data.valor}}`, rich: { n: { color: '#1A202C', fontSize: 10, fontWeight: 700, textBorderColor: 'rgba(255,255,255,.85)', textBorderWidth: 2.5 }, v: { color: '#1A202C', fontSize: 11, fontWeight: 800, textBorderColor: 'rgba(255,255,255,.85)', textBorderWidth: 2.5, padding: [1, 0, 0, 0] } } },
        labelLayout: { hideOverlap: true } }],
    };
  }, [territorio, rotulos, classes, config, tokens, destaque, ctx.greId]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (params: any) => { const greId = params.componentType === 'geo' ? territorio?.get(params.name) : params.data?.greId; if (greId) ctx.open({ kind: 'gre', id: greId }); };
  return <Bloco ctx={ctx} id="map" area="map" title="Mapa das regionais" question="Território de cada GRE pintado pelos seus municípios. Escolha o indicador; as cores dividem as regionais em cinco faixas."
    actions={<label className="ck-select is-compact"><span className="sr-only">Indicador do mapa</span><select value={metrica} onChange={event => setMetrica(event.target.value as Metrica)}>{(Object.keys(metricas) as Metrica[]).map(id => <option key={id} value={id}>{metricas[id].label}</option>)}</select><ChevronDown size={14} /></label>}>
    <div className="geo-layout">
      <div className="geo-map">{option ? <Chart option={option} tokens={tokens} label={`Mapa das regionais: ${config.label}`} onPick={pick} /> : <div className="loading">Carregando malha municipal…</div>}
        <ul className="geo-legend" aria-label="Faixas do mapa">{classes.faixas.map((item, index) => <li key={index}><i style={{ background: item.color }} />{item.min === null ? '—' : item.min === item.max ? config.fmt(item.min) : `${config.fmt(item.min)} a ${config.fmt(item.max!)}`}</li>)}</ul></div>
      <ol className="geo-rank" onMouseLeave={() => setDestaque(null)} aria-label={`Regionais por ${config.label}`}>{ranking.map(row => { const value = config.get(row)!;
        return <li key={row.id}><button onClick={() => ctx.open({ kind: 'gre', id: row.id })} onMouseEnter={() => setDestaque(row.id)} onFocus={() => setDestaque(row.id)} className={ctx.greId === row.id ? 'is-selected' : ''}>
          <i style={{ background: color(row.id) }} /><span>{row.curto}</span><b>{config.fmt(value)}</b><em style={{ width: `${Math.abs(value) / maximo * 100}%` }} /></button></li>; })}</ol>
    </div>
  </Bloco>;
}

/* ---------- Quadro das regionais (scorecard) ---------- */
type Coluna = { key: string; label: string; title: string; get: (row: LinhaGre) => number | null; cell: (row: LinhaGre) => ReactNode };
function Quadro({ ctx }: { ctx: CockpitCtx }) {
  const { linhas, tokens, metas } = ctx;
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: 'base', dir: -1 });
  const max = (get: (row: LinhaGre) => number | null) => Math.max(...linhas.map(row => get(row) ?? 0), 1);
  const maxBase = max(row => row.base), maxSem = max(row => row.semRegistro), maxInad = max(row => row.inadimplencia), maxInd = max(row => row.indicios.length);
  const flag = (value: number | null, alvo: number) => value === null ? '—' : <><span className={`flag ${value >= alvo ? 'is-good' : 'is-bad'}`} aria-label={value >= alvo ? 'na meta' : 'abaixo da meta'}>{value >= alvo ? '▲' : '▼'}</span>{pct(value)}</>;
  const heat = (value: number, top: number, color: string, text: string) => <span className="heat" style={{ background: `color-mix(in srgb, ${color} ${Math.round(value / top * 60) + 6}%, transparent)` }}>{text}</span>;
  const colunas: Coluna[] = [
    { key: 'base', label: 'Empresas', title: 'Empresas com registro ativo', get: row => row.base, cell: row => <span className="cellbar"><i style={{ width: `${row.base / maxBase * 100}%`, background: tokens.heat[1] }} /><em>{int(row.base)}</em></span> },
    { key: 'spark', label: '24 meses', title: 'Empresas registradas, mês a mês', get: () => null, cell: row => <span className="cellspark"><Spark values={row.spark} color={(row.spark.at(-1) ?? 0) >= (row.spark[0] ?? 0) ? tokens.good : tokens.bad} /></span> },
    { key: 'crescimento', label: 'Variação', title: 'Variação da base no período', get: row => row.crescimento, cell: row => row.crescimento === null ? '—' : <span className={row.crescimento >= 0 ? 'pos' : 'neg'}>{row.crescimento >= 0 ? '+' : ''}{pct(row.crescimento)}</span> },
    { key: 'cobertura', label: 'Cobertura', title: `Cobertura do mercado · meta ${metas.cobertura}%`, get: row => row.cobertura, cell: row => flag(row.cobertura, metas.cobertura) },
    { key: 'semRegistro', label: 'Sem registro', title: 'CNPJs de engenharia sem registro', get: row => row.semRegistro, cell: row => heat(row.semRegistro, maxSem, tokens.accent, int(row.semRegistro)) },
    { key: 'autos', label: 'Autos', title: 'Autos de infração no período', get: row => row.autos, cell: row => int(row.autos) },
    { key: 'regularizadas', label: 'Regularizadas', title: `% das ações já regularizadas · meta ${metas.regularizacao}%`, get: row => row.regularizadas, cell: row => flag(row.regularizadas, metas.regularizacao) },
    { key: 'arrecadacao', label: 'Arrecadação', title: 'Anuidades recebidas no período', get: row => row.arrecadacao, cell: row => brl(row.arrecadacao) },
    { key: 'inadimplencia', label: 'Inadimplência', title: 'Empresas ativas com saldo vencido', get: row => row.inadimplencia, cell: row => row.inadimplencia === null ? '—' : heat(row.inadimplencia, maxInad, tokens.bad, pct(row.inadimplencia)) },
    { key: 'indicios', label: 'Indícios', title: 'Empresas com indício de irregularidade (Malha fina)', get: row => row.indicios.length, cell: row => heat(row.indicios.length, maxInd, tokens.warn, int(row.indicios.length)) },
  ];
  const coluna = colunas.find(item => item.key === sort.key)!;
  const rows = [...linhas].sort((a, b) => ((coluna.get(a) ?? -Infinity) - (coluna.get(b) ?? -Infinity)) * sort.dir);
  return <div className="table-wrap"><table className="quadro-gre">
    <thead><tr><th>Regional</th>{colunas.map(item => <th key={item.key} aria-sort={sort.key === item.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      {item.key === 'spark' ? <span title={item.title}>{item.label}</span> : <button title={item.title} onClick={() => setSort({ key: item.key, dir: sort.key === item.key ? (sort.dir === 1 ? -1 : 1) : -1 })}>{item.label}{sort.key === item.key && <ArrowDownUp size={10} />}</button>}</th>)}</tr></thead>
    <tbody>{rows.map(row => <tr key={row.id} tabIndex={0} className={ctx.greId === row.id ? 'is-selected' : ''} onClick={() => ctx.open({ kind: 'gre', id: row.id })} onKeyDown={event => { if (event.key === 'Enter') ctx.open({ kind: 'gre', id: row.id }); }}>
      <td className="gre-name"><b>{row.id.replace('GRE', '')}</b>{row.curto}</td>{colunas.map(item => <td key={item.key}>{item.cell(row)}</td>)}</tr>)}</tbody>
  </table></div>;
}
