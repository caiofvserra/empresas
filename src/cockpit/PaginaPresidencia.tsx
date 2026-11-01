import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowDownUp, ChevronDown, FileText, BarChart3 } from 'lucide-react';
import { Chart, Spark, useSpMap } from '../painel/chart';
import { devedoras } from '../painel/analise';
import { rotulosGre, territorioGre } from '../painel/territorio';
import { Segments, brl, data, int, mes, money, pct } from '../painel/ui';
import { classesCnae, correspondencias, fichas } from '../observatorio/norte';
import type { NorteId } from '../observatorio/norte';
import type { CockpitCtx } from './contexto';
import type { LinhaGre } from './medidas';
import { Bloco, Indicador } from './ui';

/**
 * Aba 1 · Presidência: os quatro indicadores-norte com ficha, um cartão por assunto (os doze assuntos do painel, cada um com a
 * sua ficha), o mapa e o quadro das regionais contra o ano anterior, e a leitura do período. Tudo lido na data de referência.
 */
const change = (now: number, before: number | null | undefined) => before ? (now - before) / before * 100 : null;

export default function PaginaPresidencia({ ctx }: { ctx: CockpitCtx }) {
  const { model, history, resumo, rec, malha, estrutura, metas, tokens, period } = ctx;
  const months = history.monthly, before = months.length > period ? months[months.length - 1 - period] : null;
  const base = model.metrics.base.value ?? 0, cobertura = model.metrics.coverage.value, saldo = model.metrics.overdue.value ?? 0;
  const cobradas = model.metrics.compliance.denominatorCompanyIds?.length ?? 0, inad = cobradas ? devedoras(model).size / cobradas * 100 : null;
  const semRegistro = model.metadata.eligibleEstablishmentIds.length - model.metadata.activeEligibleEstablishmentIds.length;
  const taxa = estrutura?.atendimento.taxaNoPrazo ?? null, taxaAntes = estrutura?.atendimento.taxaNoPrazoAntes ?? null;
  const p = ctx.profissionais.resumo, ativosAntes = p.porNivel.reduce((sum, row) => sum + row.antes, 0);
  const coorte = ctx.formacao.coortes.filter(row => row.fechada24).at(-1), coorteAntes = ctx.formacao.coortes.filter(row => row.fechada24).at(-2);
  const ft = ctx.forcas.filter(row => row.fechada && row.diferenca !== null).at(-1), abertas = ctx.forcas.filter(row => !row.fechada).length;
  const e = ctx.entidades, c = ctx.conselho;
  return <div className="ck-grid ck-grid-presidencia">
    <Norte ctx={ctx} id="cobertura" area="n1" />
    <Norte ctx={ctx} id="conversao" area="n2" />
    <Norte ctx={ctx} id="receita" area="n3" />
    <Norte ctx={ctx} id="tempo" area="n4" />
    <section className="ck-cards is-six" style={{ gridArea: 'kpi' }} aria-label="Um indicador por assunto">
      <Indicador destaque ficha="k-empresas" ctx={ctx} aspecto="Empresas" label="Empresas registradas" value={int(base)} variacao={{ value: change(base, before?.base), label: `em ${period} meses` }} spark={months.map(row => row.base)} cor={tokens.accent} sub={`${int(ctx.ponte.viaFiscalizacao.length)} entraram após fiscalização`} onOpen={() => ctx.go('cadastro')} />
      <Indicador ficha="k-cobertura" ctx={ctx} aspecto="Mercado" label="Cobertura cadastral" value={cobertura === null ? '—' : pct(cobertura, 1)} variacao={{ value: cobertura === null ? null : cobertura - metas.cobertura, kind: 'pp', label: `vs. meta de ${metas.cobertura}%` }} meta={{ atual: cobertura, alvo: metas.cobertura }} sub={`${int(semRegistro)} CNPJs da lista sem registro localizado`} onOpen={() => ctx.go('cadastro')} />
      <Indicador ficha="k-profissionais" ctx={ctx} aspecto="Profissionais" label="Profissionais ativos" value={int(p.ativos.length)} variacao={{ value: change(p.ativos.length, ativosAntes), label: 'vs. um ano antes' }} spark={p.mensal.map(row => row.novos)} cor={tokens.blue} sub={`${int(p.novos.length)} registros novos no período · ${p.taxaAdimplencia === null ? '—' : pct(p.taxaAdimplencia)} em dia`} onOpen={() => ctx.go('profissionais')} />
      <Indicador ficha="k-formacao" ctx={ctx} aspecto="Formação" label={`Registro em 24 meses · ${coorte?.ano ?? '—'}`} value={coorte?.taxaRegistro24 == null ? '—' : pct(coorte.taxaRegistro24, 1)} variacao={{ value: coorte?.taxaRegistro24 != null && coorteAntes?.taxaRegistro24 != null ? coorte.taxaRegistro24 - coorteAntes.taxaRegistro24 : null, kind: 'pp', label: `vs. coorte ${coorteAntes?.ano ?? 'anterior'}` }} sub={coorte ? `${int(coorte.registradosEm24.length)} de ${int(coorte.concluintes)} concluintes (INEP)` : 'nenhuma coorte fechada'} onOpen={() => ctx.go('formacao')} />
      <Indicador ficha="k-autos" ctx={ctx} aspecto="Fiscalização" label="Autos de infração" value={int(resumo.autos.length)} variacao={{ value: change(resumo.autos.length, resumo.autosPrev) }} spark={resumo.mensal.map(row => row.autos.registro + row.autos.rt + row.autos.art)} cor={tokens.bad} sub={`${int(resumo.acoes.length)} ações · ${int(resumo.regularizacoes.length)} regularizações`} onOpen={() => ctx.go('fiscalizacao')} />
      <Indicador ficha="k-forcas" ctx={ctx} aspecto="Forças-tarefas" label={ft ? `${ft.ft.id} vs. grupo de comparação` : 'Forças-tarefas'} value={ft ? `${ft.diferenca! >= 0 ? '+' : ''}${ft.diferenca!.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} p.p.` : '—'} sub={ft ? `${ft.grupo.taxa === null ? '—' : pct(ft.grupo.taxa)} em ${int(ft.grupo.acoes.length)} ações contra ${ft.comparacao.taxa === null ? '—' : pct(ft.comparacao.taxa)} em ${int(ft.comparacao.acoes.length)} · ${int(abertas)} em aberto` : `${int(ctx.forcas.length)} forças-tarefas, nenhuma fechada`} onOpen={() => ctx.go('fiscalizacao')} />
      <Indicador ficha="k-receita" ctx={ctx} aspecto="Receita" label="Arrecadação de empresas" value={brl(rec.total)} variacao={{ value: rec.totalAntes === null ? null : change(rec.total, rec.totalAntes) }} spark={rec.mensal.map(row => row.anuidades + row.multas)} cor={tokens.good} sub={`${brl(rec.multas)} de multas`} onOpen={() => ctx.go('receita')} />
      <Indicador ficha="k-saldo" ctx={ctx} aspecto="Cobrança" label="Saldo vencido" value={brl(saldo)} variacao={{ value: change(saldo, before?.overdue), goodUp: false, label: `em ${period} meses` }} spark={months.map(row => row.overdue)} cor={tokens.bad} sub={inad === null ? '' : `${pct(inad)} das empresas cobradas inadimplentes`} onOpen={() => ctx.go('receita')} />
      <Indicador ficha="k-entidades" ctx={ctx} aspecto="Entidades e IES" label="Repasses em 12 meses" value={brl(e.total)} variacao={{ value: change(e.total, e.totalAntes), label: 'vs. 12 meses anteriores' }} sub={`${int(e.linhas.length)} organizações · ${int(e.cadeiras)} cadeiras no plenário`} onOpen={() => ctx.go('entidades')} />
      <Indicador ficha="k-controle" ctx={ctx} aspecto="Controle interno" label="Despesa em atividades-fim" value={c.fimMeioAtual.taxaFim === null ? '—' : pct(c.fimMeioAtual.taxaFim)} spark={c.ritmo.slice(-12).map(row => row.realizado)} cor={tokens.heat[2]} sub={`${brl(c.fimMeioAtual.fim + c.fimMeioAtual.meio)} realizados em 12 meses`} onOpen={() => ctx.go('controle')} />
      <Indicador ficha="k-malha" ctx={ctx} aspecto="Malha fina" label="Empresas com indício confirmado" value={int(malha.confirmadas.length)}
        sub={<><Segments parts={[{ label: 'Com ação fiscal', value: malha.comAcao.length, color: tokens.good }, { label: 'Sem ação fiscal', value: malha.empresas.length - malha.comAcao.length, color: tokens.warn }]} />{int(malha.empresas.length)} com algum indício · {pct(malha.comAcao.length / Math.max(1, malha.empresas.length) * 100)} com ação</>} onOpen={() => ctx.go('malha')} />
      <Indicador ficha="k-atendimento" ctx={ctx} aspecto="Atendimento" label="Solicitações resolvidas no prazo" value={taxa === null ? '…' : pct(taxa)} variacao={{ value: taxa === null || taxaAntes === null ? null : taxa - taxaAntes, kind: 'pp' }} meta={{ atual: taxa, alvo: metas.atendimento }}
        sub={estrutura?.atendimento.medianaDias == null ? 'calculando…' : `mediana de ${int(estrutura.atendimento.medianaDias)} dias`} onOpen={() => ctx.go('atendimento')} />
    </section>
    <MapaRegional ctx={ctx} />
    <Bloco ctx={ctx} id="sc" area="sc" title="Quadro das regionais" question="Cada regional em todos os assuntos. Setas comparam com as metas; cores marcam as maiores lacunas. Clique numa linha para o resumo da regional."><Quadro ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="lt" area="lt" title="Leitura do período" question="Destaques calculados a cada filtro e data de referência. Clique numa frase para abrir o assunto." className="t-leitura">
      <ul className="leitura">{ctx.insights.map((item, index) => <li key={index} className={`is-${item.tone}`}><button onClick={() => ctx.go(item.page)}><i aria-hidden="true" /><span><b>{item.strong}</b> {item.text}</span></button></li>)}</ul>
    </Bloco>
  </div>;
}

/* ---------- Mapa das regionais: território de cada GRE pintado pelos municípios, indicador à escolha ---------- */
type Metrica = 'empresas' | 'cobertura' | 'semRegistro' | 'autos' | 'regularizadas' | 'arrecadacao' | 'inadimplencia' | 'arts' | 'indicios' | 'emprego';
const metricas: Record<Metrica, { label: string; get: (row: LinhaGre) => number | null; fmt: (value: number) => string; alerta?: boolean; menorPrimeiro?: boolean }> = {
  empresas: { label: 'Empresas registradas', get: row => row.base, fmt: int },
  cobertura: { label: 'Cobertura cadastral estimada', get: row => row.cobertura, fmt: value => pct(value), menorPrimeiro: true },
  semRegistro: { label: 'CNPJs da lista sem registro localizado', get: row => row.semRegistro, fmt: int, alerta: true },
  autos: { label: 'Autos de infração no período', get: row => row.autos, fmt: int },
  regularizadas: { label: '% das ações já regularizadas', get: row => row.regularizadas, fmt: value => pct(value), menorPrimeiro: true },
  arrecadacao: { label: 'Arrecadação de anuidades', get: row => row.arrecadacao, fmt: brl },
  inadimplencia: { label: 'Inadimplência', get: row => row.inadimplencia, fmt: value => pct(value), alerta: true },
  arts: { label: 'ARTs de empresas no período', get: row => row.arts, fmt: int },
  indicios: { label: 'Empresas com indício para análise', get: row => row.indicios.length, fmt: int, alerta: true },
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
    { key: 'semRegistro', label: 'Sem registro', title: 'CNPJs da lista sem registro localizado', get: row => row.semRegistro, cell: row => heat(row.semRegistro, maxSem, tokens.accent, int(row.semRegistro)) },
    { key: 'autos', label: 'Autos', title: 'Autos de infração no período', get: row => row.autos, cell: row => int(row.autos) },
    { key: 'regularizadas', label: 'Regularizadas', title: `% das ações já regularizadas · meta ${metas.regularizacao}%`, get: row => row.regularizadas, cell: row => flag(row.regularizadas, metas.regularizacao) },
    { key: 'arrecadacao', label: 'Arrecadação', title: 'Anuidades recebidas no período', get: row => row.arrecadacao, cell: row => brl(row.arrecadacao) },
    { key: 'inadimplencia', label: 'Inadimplência', title: 'Empresas ativas com saldo vencido', get: row => row.inadimplencia, cell: row => row.inadimplencia === null ? '—' : heat(row.inadimplencia, maxInad, tokens.bad, pct(row.inadimplencia)) },
    { key: 'indicios', label: 'Indícios', title: 'Empresas com algum indício para análise (Malha fina)', get: row => row.indicios.length, cell: row => heat(row.indicios.length, maxInd, tokens.warn, int(row.indicios.length)) },
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

/* ---------- Indicadores-norte: número, decomposição e ficha (fórmula, data, leitura) ---------- */
function Norte({ ctx, id, area }: { ctx: CockpitCtx; id: NorteId; area: string }) {
  const [ficha, setFicha] = useState(false);
  const item = fichas[id], { norte, tokens } = ctx;
  const toggle = <button className="icon-btn ghost-icon" onClick={() => setFicha(value => !value)} aria-pressed={ficha} aria-label={ficha ? 'Ver o gráfico' : 'Ver a ficha do indicador'} title={ficha ? 'Ver o gráfico' : 'Ficha: fórmula, data e leitura'}>{ficha ? <BarChart3 size={14} /> : <FileText size={14} />}</button>;
  let valor = '—', sub: ReactNode = null, chart: ReactNode = null;
  if (id === 'cobertura') {
    const c = norte.cobertura; valor = c.taxa === null ? '—' : pct(c.taxa, 1);
    sub = <>“Sim” <b>{c.taxaSim === null ? '—' : pct(c.taxaSim, 1)}</b> · “Passível” <b>{c.taxaPassivel === null ? '—' : pct(c.taxaPassivel, 1)}</b> · {int(c.total)} CNPJs · competência {data(c.competenciaReceita)}</>;
    const cores = [tokens.blue, tokens.heat[1], tokens.warn];
    chart = <Chart tokens={tokens} label="Cobertura por classe da lista CNAE e correspondência no cadastro" option={{
      grid: { top: 22, right: 8, bottom: 2, left: 2, containLabel: true }, legend: { top: 0, left: 0, itemWidth: 8, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 9.5 } },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, xAxis: { type: 'value', show: false },
      yAxis: { type: 'category', inverse: true, data: classesCnae.map(row => `“${row}”`), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
      series: correspondencias.map((nome, index) => ({ name: nome, type: 'bar', stack: 'c', barWidth: 13, data: classesCnae.map(classe => c.porClasse[classe][nome].length), itemStyle: { color: cores[index], borderColor: tokens.surface, borderWidth: 1 } })) }}
      onPick={params => { const classe = classesCnae[params.dataIndex], nome = correspondencias[params.seriesIndex], ids = classe && nome ? c.porClasse[classe][nome] : [];
        if (ids.length) ctx.open({ kind: 'cnpjs', title: `“${classe}” · ${nome.toLowerCase()}`, what: 'CNPJs completos ativos na Receita com CNAE da lista do Crea-SP nesta classe e correspondência no cadastro.', use: nome === 'Sem correspondência' ? 'Sem correspondência não quer dizer irregular: confirmar atividade antes de orientar.' : undefined, ids }); }} />;
  } else if (id === 'conversao') {
    const c = norte.conversao; valor = c.atual?.taxa == null ? '—' : pct(c.atual.taxa, 1);
    sub = c.atual ? <>coorte {c.atual.trimestre.replace('-', ' ')} · {int(c.atual.convertidas.length)} de {int(c.atual.acoes.length)} ações{c.anterior?.taxa != null && <> · {c.anterior.trimestre.replace('-', ' ')}: {pct(c.anterior.taxa, 1)}</>}</> : 'nenhuma coorte completou 180 dias';
    chart = <Chart tokens={tokens} label="Conversão em 180 dias por coorte trimestral de ações" option={{
      grid: { top: 10, right: 4, bottom: 2, left: 2, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = c.coortes[items[0].dataIndex]; return `<b>${row.trimestre.replace('-', ' ')}</b>${row.completa ? '' : ' · coorte em aberto'}<br/>${int(row.convertidas.length)} de ${int(row.acoes.length)} ações regularizadas em até 180 dias`; } },
      xAxis: { type: 'category', data: c.coortes.map(row => row.trimestre.slice(2).replace('-', ' ')), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 9.5 } },
      yAxis: { type: 'value', max: 100, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 9.5, formatter: '{value}%' } },
      series: [{ type: 'bar', barWidth: '62%', data: c.coortes.map(row => ({ value: row.taxa === null ? null : Math.round(row.taxa * 10) / 10, itemStyle: { color: row.completa ? tokens.good : tokens.line, borderRadius: [3, 3, 0, 0] } })) }] }}
      onPick={params => { const row = c.coortes[params.dataIndex]; if (row?.acoes.length) ctx.open({ kind: 'linhas', title: `Coorte ${row.trimestre.replace('-', ' ')}${row.completa ? '' : ' · em aberto'}`, what: 'Ações fiscais iniciadas no trimestre e se houve regularização em até 180 dias.', use: 'Associação no tempo: a regularização pode ter outras causas.', listTitle: 'Ações, regularizadas primeiro',
        rows: row.acoes.map(acao => { const ok = row.convertidas.includes(acao); return { key: acao.id, companyId: acao.companyId, title: ctx.dataset.companies.find(item => item.id === acao.companyId)?.name ?? acao.companyId, subtitle: `${acao.origem} · ${data(acao.date)}`, value: ok ? `regularizada em ${data(acao.regularizedAt!)}` : 'sem regularização em 180 dias', note: acao.resolucao ?? acao.tipo, sortValue: ok ? 1 : 0 }; }) }); }} />;
  } else if (id === 'receita') {
    const r = norte.receita; valor = brl(r.total);
    const delta = r.totalAntes ? (r.total - r.totalAntes) / r.totalAntes * 100 : null;
    sub = <>{int(r.casos)} casos · {brl(r.anuidades)} anuidades · {brl(r.multas)} multas{delta !== null && <> · {delta >= 0 ? '+' : ''}{pct(delta)} vs. ano anterior</>}</>;
    chart = <Chart tokens={tokens} label="Receita atribuível por mês do pagamento" option={{
      grid: { top: 10, right: 4, bottom: 2, left: 2, containLabel: true }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>${items[0].name}</b><br/>${money(items[0].value)}` },
      xAxis: { type: 'category', data: r.mensal.map(row => mes(row.month)), axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 9.5, interval: 'auto' } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, fontSize: 9.5, formatter: (value: number) => value.toLocaleString('pt-BR', { notation: 'compact' }) } },
      series: [{ type: 'bar', barWidth: '62%', data: r.mensal.map(row => row.valor), itemStyle: { color: tokens.accent, borderRadius: [3, 3, 0, 0] } }] }}
      onPick={params => { const month = r.mensal[params.dataIndex]?.month, rows = r.pagamentos.filter(row => row.data.startsWith(month ?? '#')); if (!rows.length) return;
        ctx.open({ kind: 'linhas', title: `Receita atribuível · ${mes(month!)}`, what: 'Pagamentos recebidos no mês de empresas com caso aberto a partir de indício, em até 12 meses da abertura.', use: 'Associação, não efeito causal.', listTitle: 'Pagamentos, maior valor primeiro',
          rows: rows.map((row, index) => ({ key: `${row.acaoId}-${index}`, companyId: row.companyId, title: ctx.dataset.companies.find(item => item.id === row.companyId)?.name ?? row.companyId, subtitle: `${row.tipo} · ${data(row.data)}`, value: money(row.valor), note: `caso ${row.acaoId} · ${row.origem}`, sortValue: row.valor })) }); }} />;
  } else {
    const t = norte.tempo; valor = t.mediana === null ? `> ${int(Math.max(0, ...t.esperas.map(row => row.dias)))} dias` : `${int(t.mediana)} dias`;
    sub = <>{int(t.esperas.length)} indícios no período · {int(t.abertos)} ainda sem ação{t.medianaAgidos !== null && <> · {int(t.medianaAgidos)} dias entre os já agidos</>}</>;
    const rows = t.porTipo;
    chart = <Chart tokens={tokens} label="Tempo até agir por tipo de indício" option={{
      grid: { top: 4, right: 40, bottom: 2, left: 2, containLabel: true }, xAxis: { type: 'value', show: false },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.nome}</b><br/>mediana: ${row.mediana === null ? 'mais da metade sem ação' : `${int(row.mediana)} dias`}<br/>${int(row.agidos)} agidos · ${int(row.abertos)} abertos`; } },
      yAxis: { type: 'category', inverse: true, data: rows.map(row => row.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10, width: 120, overflow: 'truncate' } },
      series: [{ type: 'bar', barWidth: 12, data: rows.map(row => row.mediana ?? 0), itemStyle: { color: tokens.blue, borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (params: any) => rows[params.dataIndex].mediana === null ? 'em aberto' : `${int(params.value)} d` } }] }}
      onPick={params => { const row = rows[params.dataIndex]; if (row) ctx.open({ kind: 'alvos', tipo: row.id as never }); }} />;
  }
  return <Bloco ctx={ctx} id={area} area={area} title={item.nome} question={ficha ? `${item.caso} · ficha do indicador` : item.leitura} actions={toggle} className="t-norte">
    {ficha ? <dl className="ficha">
      <dt>Fórmula</dt><dd>{item.formula}</dd><dt>Unidade e grão</dt><dd>{item.unidade} · {item.grao}</dd><dt>Data de referência</dt><dd>{item.data}</dd>
      <dt>Leitura</dt><dd>{item.leitura}</dd><dt>Desconhecido</dt><dd>{item.desconhecido}</dd><dt>Dono</dt><dd>{item.dono}</dd><dt>No protótipo</dt><dd>{item.prototipo}</dd>
    </dl> : <div className="norte"><p className="norte-valor"><strong>{valor}</strong><span>{sub}</span></p><div className="norte-chart">{chart}</div></div>}
  </Bloco>;
}
