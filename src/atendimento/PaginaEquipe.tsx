import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Chart } from '../painel/chart';
import { int, mes, money, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador, avisoVazio } from '../cockpit/ui';
import type { Exportavel } from '../cockpit/ui';
import { corDoTexto, rotuloTrimestre } from '../cockpit/formatos';
import { diasUteis, situacoes, statusEm } from '../domain/atendimento';
import type { Linha, LinhaColaborador } from '../domain/atendimento';
import { canaisAtendimento, faixaDistancia, faixasDistancia } from '../domain/gestao';
import { municipioPorId, municipiosSp } from '../domain/municipios';
import { situacaoEm } from '../domain/profissionais';
import { MapaMunicipios, g, legenda } from '../gestao/comum';
import type { Medida } from '../gestao/comum';
import { a, abrirColaborador, abrirProtocolos, coresSituacao, decimal, pctOu } from './comum';

/**
 * Painel de Atendimento, página 2 (07/11/2026): quem atende. Os colaboradores pelo nome, com a fila de cada um; o que está sem
 * atribuição; o prazo de cada regional mês a mês; onde moram os solicitantes, a que distância das unidades e por que canal chegam;
 * e o uso dos coworkings.
 */
export default function PaginaEquipe({ ctx }: { ctx: CockpitCtx }) {
  const { q, d, servidores } = a(ctx), { estrutura } = ctx, vazio = avisoVazio(!q.linhas.length, 'Nenhum protocolo aberto no período');
  const maior = [...q.colaboradores].sort((x, y) => y.fila.length - x.fila.length || y.filaFora.length - x.filaFora.length)[0];
  const esperando = q.semAtribuicao.filter(l => diasUteis(statusEm(l.p, ctx.anchor)!.desde, ctx.anchor) > 5);
  const longe = useMemo(() => { const dist = g(ctx).distancia, ativos = ctx.profissionais.modelo.profissionais.filter(row => situacaoEm(row, ctx.anchor) === 'Ativo' && (!ctx.greId || row.greId === ctx.greId) && (!ctx.cidadeId || row.cityId === ctx.cidadeId));
    return { ativos: ativos.length, longe: ativos.filter(row => (dist.get(row.cityId)?.km ?? 0) > 50).length }; }, [ctx.gestao, ctx.profissionais.modelo, ctx.anchor, ctx.greId, ctx.cidadeId]); // eslint-disable-line react-hooks/exhaustive-deps
  const cw = estrutura?.coworking, fila = q.colaboradores.reduce((n, c) => n + c.fila.length, 0), filaFora = q.colaboradores.reduce((n, c) => n + c.filaFora.length, 0);
  return <div className="ck-grid ck-grid-at-equipe">
    <section className="ck-cards is-six" style={{ gridArea: 'kpi' }} aria-label="Indicadores da equipe e do território">
      <Indicador destaque ficha="k-forafila" ctx={ctx} label="Na fila e fora do prazo" value={int(filaFora)} sub={`de ${int(fila)} na fila de ${int(q.colaboradores.length)} colaboradores; ${int(servidores)} no quadro`} onOpen={() => abrirEquipe(ctx, q.colaboradores)} />
      <Indicador ficha="k-porcolaborador" ctx={ctx} label="Fechados por colaborador" value={d.porColaborador === null ? '—' : `${decimal(d.porColaborador)} por mês`} sub="nos últimos 12 meses" />
      <Indicador ficha="k-sematrib" ctx={ctx} label="Sem atribuição" value={int(q.semAtribuicao.length)} sub={`${int(esperando.length)} esperam há mais de 5 dias úteis`}
        onOpen={() => abrirProtocolos(ctx, 'Sem atribuição', q.semAtribuicao, 'Protocolos em aberto ou sem pagamento que ainda não foram distribuídos a um colaborador.', 'Distribua primeiro os que esperam há mais tempo.')} />
      <Indicador ficha="k-fila" ctx={ctx} label="Maior fila de uma pessoa" value={maior ? int(maior.fila.length) : '—'} sub={maior ? `${int(maior.filaFora.length)} fora do prazo, com ${maior.nome}` : 'nenhum protocolo com colaborador'} onOpen={maior ? () => abrirColaborador(ctx, maior) : undefined} />
      <Indicador ficha="k-distancia" ctx={ctx} label="A mais de 50 km da unidade" value={longe.ativos ? pct(longe.longe / longe.ativos * 100) : '—'} sub={`${int(longe.longe)} de ${int(longe.ativos)} profissionais ativos`} />
      <Indicador ficha="k-coworking" ctx={ctx} label="Ocupação dos coworkings" value={cw?.ocupacao == null ? '—' : pct(cw.ocupacao)} variacao={{ value: cw?.ocupacao == null || cw.ocupacaoAntes === null ? null : cw.ocupacao - cw.ocupacaoAntes, kind: 'pp' }}
        sub={!cw ? 'calculando' : cw.unidades.length ? `${int(cw.unidades.length)} unidades com ${int(cw.usuarios)} usuários${cw.usadas ? `, a ${money(cw.custo / cw.usadas)} por hora usada` : ''}` : 'sem unidade nesta regional'} />
    </section>
    <Bloco ctx={ctx} id="co" vazio={vazio} area="co" title="Com quem estão os protocolos" exportar={exportarColaboradores(ctx)}><Colaboradores ctx={ctx} /></Bloco>
    <Mapa ctx={ctx} />
    <Bloco ctx={ctx} id="ca" vazio={avisoVazio(!q.calor.some(row => row.trimestres.some(t => t.fechados)), 'Nenhum protocolo fechado')} area="ca" title="Fechados no prazo, por regional e trimestre" exportar={exportarCalor(ctx)}><Calor ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="cd" vazio={vazio} area="cd" title="Canal pela distância até a unidade" exportar={exportarCanal(ctx)}><CanalDistancia ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="cw" area="cw" title="Uso dos coworkings" vazio={cw && !cw.unidades.length ? 'Nenhuma unidade de coworking nesta regional. Tire o filtro de regional do alto da tela.' : undefined}
      exportar={cw ? { cabecalho: ['Unidade', 'Ocupação (%)', 'Usuários', 'Custo por hora usada (R$)', 'Mesas'], linhas: () => cw.unidades.map(row => [row.nome, row.ocupacao === null ? null : Math.round(row.ocupacao), row.usuarios, row.custoHora === null ? null : Math.round(row.custoHora), row.mesas]) } : undefined}>
      {cw ? <Coworkings ctx={ctx} /> : <div className="loading">Calculando…</div>}</Bloco>
  </div>;
}

/** A equipe inteira no painel lateral: cada pessoa com a fila, os fora do prazo e os fechados. */
function abrirEquipe(ctx: CockpitCtx, rows: LinhaColaborador[]) {
  if (!rows.length) return;
  const nomeGre = new Map(ctx.dataset.gres.map(row => [row.id, row.name]));
  ctx.open({ kind: 'linhas', title: 'Colaboradores com protocolo', what: 'Quem estava com algum protocolo aberto no período, no último status lido na data escolhida.', listTitle: 'Colaboradores, maior fila primeiro',
    summary: [['Colaboradores', int(rows.length)], ['Na fila', int(rows.reduce((n, c) => n + c.fila.length, 0))], ['Fora do prazo', int(rows.reduce((n, c) => n + c.filaFora.length, 0))]],
    rows: rows.map(c => ({ key: c.id, title: c.nome, subtitle: `${c.cargo}, ${c.greId ? nomeGre.get(c.greId) ?? c.greId : 'sede'}`, value: `${int(c.fila.length)} na fila, ${int(c.filaFora.length)} fora do prazo`,
      note: `${int(c.fechados)} fechados, ${pctOu(c.noPrazo)} no prazo; tempo típico de ${c.mediana === null ? '—' : `${int(c.mediana)} dias úteis`}`, sortValue: -c.fila.length })) });
}

/* ---------- Colaboradores pelo nome ---------- */
const exportarColaboradores = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Colaborador', 'Cargo', 'GRE', ...situacoes, 'Na fila', 'Fora do prazo na fila', 'Fechados no prazo (%)', 'Mediana (dias úteis)'],
  linhas: () => a(ctx).q.colaboradores.map(c => [c.nome, c.cargo, c.greId ?? 'sede', ...situacoes.map(s => c.partes[s].length), c.fila.length, c.filaFora.length, c.noPrazo === null ? null : Math.round(c.noPrazo), c.mediana]) });
function Colaboradores({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, q = a(ctx).q, cores = coresSituacao(tokens);
  const semAtrib = useMemo(() => { const partes = Object.fromEntries(situacoes.map(s => [s, q.semAtribuicao.filter(l => l.situacao === s)])) as Record<typeof situacoes[number], Linha[]>; return partes; }, [q]);
  const rows = useMemo(() => [{ id: '', nome: 'Sem atribuição', partes: semAtrib, total: q.semAtribuicao.length, fila: q.semAtribuicao.length }, ...q.colaboradores.slice(0, 16).map(c => ({ id: c.id, nome: c.nome, partes: c.partes, total: c.linhas.length, fila: c.fila.length }))], [q, semAtrib]);
  const max = Math.max(1, ...rows.map(r => r.total));
  const option = useMemo(() => ({
    grid: { top: 24, right: 70, bottom: 2, left: 2, containLabel: true }, legend: { ...legenda(tokens), data: [...situacoes] },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const r = rows[items[0].dataIndex]; return `<b>${r.nome}</b><br/>${situacoes.map(s => `${s}: ${int(r.partes[s].length)}`).join('<br/>')}<br/>Na fila: ${int(r.fila)}`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(r => r.nome), axisTick: { show: false }, axisLine: { show: false },
      axisLabel: { fontSize: 11, width: 160, overflow: 'truncate', color: (_: string, index: number) => index === 0 ? tokens.bad : tokens.ink, fontWeight: (_: string, index: number) => index === 0 ? 700 : 400 } },
    series: [...situacoes.map(s => ({ name: s, type: 'bar', stack: 'c', barMaxWidth: 14, data: rows.map(r => r.partes[s].length), itemStyle: { color: cores[s], borderColor: tokens.surface, borderWidth: 1 },
      label: { show: true, position: 'inside', color: corDoTexto(cores[s]), fontSize: 11, fontWeight: 700, formatter: (p: any) => p.value >= max * 0.1 ? int(p.value) : '' } })),
      { name: 'total', type: 'bar', stack: 'c', barMaxWidth: 14, data: rows.map(() => 0), itemStyle: { color: 'transparent' }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, formatter: (p: any) => `${int(rows[p.dataIndex].total)}, ${int(rows[p.dataIndex].fila)} na fila` } }],
  }), [rows, tokens, cores, max]);
  return <Chart option={option} tokens={tokens} label="Protocolos do período por colaborador e situação, com os sem atribuição no alto" onPick={p => { const r = rows[p.dataIndex]; if (!r) return;
    if (!r.id) { abrirProtocolos(ctx, 'Sem atribuição', q.semAtribuicao, 'Protocolos em aberto ou sem pagamento que ainda não foram distribuídos a um colaborador.', 'Distribua primeiro os que esperam há mais tempo.'); return; }
    const c = q.colaboradores.find(row => row.id === r.id); if (c) abrirColaborador(ctx, c); }} />;
}

/* ---------- Mapa dos 645 municípios ---------- */
type MetricaMapa = 'total' | 'pormil' | 'prazo' | 'km';
const metricasMapa: Record<MetricaMapa, string> = { total: 'Protocolos no período', pormil: 'Protocolos por 1.000 profissionais ativos', prazo: 'Fechados no prazo (%)', km: 'Distância até a unidade (km)' };
const opcoesMapa: Record<MetricaMapa, string> = { total: 'Protocolos', pormil: 'Por 1.000 profissionais', prazo: 'No prazo', km: 'Distância' };
function medidaMapa(ctx: CockpitCtx, metrica: MetricaMapa): Medida {
  const gest = g(ctx), q = a(ctx).q, cidade = new Map<string, number | null>(), soma = new Map<string, { protocolos: number; ativos: number; fechados: number; noPrazo: number; km: number }>();
  for (const m of municipiosSp(ctx.dataset)) {
    const linhas = q.porMunicipio.get(m.id) ?? [], ativos = gest.adimplencia.get(m.id)?.ativos.length ?? 0, fechados = linhas.filter(l => l.situacao === 'Fechado'), noPrazo = fechados.filter(l => l.prazo === 'Dentro do prazo').length, km = gest.distancia.get(m.id)?.km ?? 0;
    // Município com poucos profissionais ou poucos fechados fica em "poucos dados", para a taxa não pular por um protocolo só.
    cidade.set(m.id, metrica === 'km' ? km : metrica === 'total' ? linhas.length : metrica === 'pormil' ? (ativos >= 10 ? linhas.length / ativos * 1000 : null) : (fechados.length >= 3 ? noPrazo / fechados.length * 100 : null));
    const item = soma.get(m.greId) ?? { protocolos: 0, ativos: 0, fechados: 0, noPrazo: 0, km: 0 }; item.protocolos += linhas.length; item.ativos += ativos; item.fechados += fechados.length; item.noPrazo += noPrazo; item.km += km * ativos; soma.set(m.greId, item);
  }
  const gre = new Map([...soma].map(([greId, s]) => [greId, metrica === 'km' ? (s.ativos ? s.km / s.ativos : null) : metrica === 'total' ? s.protocolos : metrica === 'pormil' ? (s.ativos ? s.protocolos / s.ativos * 1000 : null) : (s.fechados ? s.noPrazo / s.fechados * 100 : null)]));
  return { label: metricasMapa[metrica], curto: metrica === 'km' ? 'km' : metrica === 'total' ? 'protocolos' : metrica === 'pormil' ? 'por mil' : 'no prazo', fmt: metrica === 'km' ? (v: number) => `${int(v)} km` : metrica === 'prazo' ? (v: number) => pct(v) : (v: number) => int(v),
    alerta: metrica === 'km' || metrica === 'prazo', menorPrimeiro: metrica === 'prazo', cidade, gre,
    dica: id => { const linhas = q.porMunicipio.get(id) ?? [], dist = gest.distancia.get(id); return `${int(linhas.length)} protocolos no período; ${int(gest.adimplencia.get(id)?.ativos.length ?? 0)} profissionais ativos; ${dist ? (dist.km ? `${int(dist.km)} km até ${dist.unidade}` : `unidade na cidade (${dist.unidade})`) : ''}`; } };
}
function Mapa({ ctx }: { ctx: CockpitCtx }) {
  const [metrica, setMetrica] = useState<MetricaMapa>('total'), q = a(ctx).q, cidades = municipioPorId(ctx.dataset), nomeGre = new Map(ctx.dataset.gres.map(row => [row.id, row.name]));
  const medida = useMemo(() => medidaMapa(ctx, metrica), [ctx.gestao, metrica]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Bloco ctx={ctx} id="mp" area="mp" title="Os 645 municípios"
    exportar={{ cabecalho: ['Município', 'GRE', 'Protocolos no período', 'Profissionais ativos', 'Unidade mais próxima', 'Distância (km)'], linhas: () => municipiosSp(ctx.dataset).map(m => [m.nome, nomeGre.get(m.greId) ?? m.greId, q.porMunicipio.get(m.id)?.length ?? 0, g(ctx).adimplencia.get(m.id)?.ativos.length ?? 0, g(ctx).distancia.get(m.id)?.unidade ?? '', g(ctx).distancia.get(m.id)?.km ?? null]) }}
    actions={<label className="ck-select is-compact"><span className="sr-only">Indicador do mapa</span><select value={metrica} onChange={event => setMetrica(event.target.value as MetricaMapa)}>{(Object.keys(metricasMapa) as MetricaMapa[]).map(id => <option key={id} value={id}>{opcoesMapa[id]}</option>)}</select><ChevronDown size={14} /></label>}>
    <MapaMunicipios ctx={ctx} medida={medida} onCidade={cityId => abrirProtocolos(ctx, `Protocolos de ${cidades.get(cityId)?.nome ?? cityId}`, q.porMunicipio.get(cityId) ?? [], 'Protocolos abertos no período por quem mora ou tem sede no município.')}
      onGre={greId => abrirProtocolos(ctx, `Protocolos da ${nomeGre.get(greId) ?? greId}`, q.porGre.find(row => row.greId === greId)?.linhas ?? [], 'Protocolos abertos no período por quem mora ou tem sede nos municípios da regional.')} /></Bloco>;
}

/* ---------- Calor: fechados no prazo por regional e trimestre ---------- */
const exportarCalor = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['GRE', ...a(ctx).q.trimestres.flatMap(t => [`${t}: fechados`, `${t}: no prazo (%)`])], linhas: () => a(ctx).q.calor.map(row => [row.greId, ...row.trimestres.flatMap(t => [t.fechados, t.noPrazo === null ? null : Math.round(t.noPrazo)])]) });
function Calor({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, metas } = ctx, q = a(ctx).q, nomeGre = new Map(ctx.dataset.gres.map(row => [row.id, row.name]));
  const linhas = q.calor.filter(row => row.trimestres.some(t => t.fechados)), colunas = q.trimestres;
  // Três faixas pela meta: na meta ou acima, até 15 pontos abaixo e mais de 15 abaixo. A cor da célula vem daqui para o número usar corDoTexto.
  const corDe = (v: number | null) => v === null ? tokens.soft : v >= metas.atendimento ? tokens.good : v >= metas.atendimento - 15 ? tokens.accent : tokens.bad;
  const option = useMemo(() => ({
    grid: { top: 22, right: 4, bottom: 2, left: 2, containLabel: true },
    graphic: [{ type: 'text', right: 4, top: 0, style: { rich: { g: { fill: tokens.good, font: '700 11px Lato, sans-serif' }, a: { fill: tokens.accent, font: '700 11px Lato, sans-serif' }, b: { fill: tokens.bad, font: '700 11px Lato, sans-serif' }, t: { fill: tokens.muted, font: '11px Lato, sans-serif' } },
      text: `{g|●} {t|na meta de ${metas.atendimento}% ou acima}   {a|●} {t|até 15 pontos abaixo}   {b|●} {t|mais de 15 abaixo}` } }],
    tooltip: { formatter: (item: any) => { const row = linhas[item.value[1]], t = row.trimestres[item.value[0]]; return `<b>${nomeGre.get(row.greId) ?? row.greId}</b>, ${rotuloTrimestre(t.chave)}<br/>Fechados no prazo: ${pctOu(t.noPrazo)} de ${int(t.fechados)} fechados`; } },
    xAxis: { type: 'category', position: 'top', data: colunas.map(rotuloTrimestre), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.muted, fontSize: 11, margin: 22 } },
    yAxis: { type: 'category', inverse: true, data: linhas.map(row => nomeGre.get(row.greId) ?? row.greId), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [{ type: 'heatmap', data: linhas.flatMap((row, y) => row.trimestres.map((t, x) => { const cor = corDe(t.noPrazo); return { value: [x, y, t.noPrazo], itemStyle: { color: cor }, label: { color: corDoTexto(cor) } }; })),
      label: { show: true, fontSize: 11, fontWeight: 700, formatter: (item: any) => item.value[2] === null ? '' : pct(item.value[2]) }, itemStyle: { borderColor: tokens.surface, borderWidth: 2, borderRadius: 3 } }],
  }), [linhas, colunas, tokens, metas.atendimento]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Fechados no prazo, em %, por regional e trimestre de abertura" onPick={p => { const [x, y] = p.value ?? []; const row = linhas[y], chave = colunas[x]; if (!row || !chave) return;
    const meses = q.mensal.filter(m => `${m.mes.slice(0, 4)}-T${Math.ceil(Number(m.mes.slice(5, 7)) / 3)}` === chave);
    abrirProtocolos(ctx, `${nomeGre.get(row.greId) ?? row.greId}, ${rotuloTrimestre(chave)}`, meses.flatMap(m => m.linhas.filter(l => l.p.greId === row.greId)), 'Protocolos da regional abertos neste trimestre, com a situação na data escolhida.'); }} />;
}

/* ---------- Canal pela distância ---------- */
function canais(ctx: CockpitCtx) {
  const dist = g(ctx).distancia, out = faixasDistancia.map(faixa => ({ faixa, linhas: [] as Linha[], porCanal: Object.fromEntries(canaisAtendimento.map(c => [c, 0])) as Record<string, number> }));
  for (const l of a(ctx).q.linhas) { const item = out[faixaDistancia(dist.get(l.p.cityId)?.km ?? 0)]; item.linhas.push(l); item.porCanal[l.p.canal] += 1; }
  return out.filter(row => row.linhas.length);
}
const exportarCanal = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Distância do solicitante até a unidade', ...canaisAtendimento, 'Total'], linhas: () => canais(ctx).map(row => [row.faixa, ...canaisAtendimento.map(c => row.porCanal[c]), row.linhas.length]) });
function CanalDistancia({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => canais(ctx), [ctx.gestao]), cores = [tokens.brand, tokens.cat[0], tokens.accent, tokens.cat[2]]; // eslint-disable-line react-hooks/exhaustive-deps
  const option = useMemo(() => ({
    grid: { top: 24, right: 40, bottom: 2, left: 2, containLabel: true }, legend: { ...legenda(tokens), data: canaisAtendimento },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>Solicitante ${row.faixa}</b>: ${int(row.linhas.length)} protocolos<br/>${canaisAtendimento.map(c => `${c}: ${int(row.porCanal[c])} (${pct(row.porCanal[c] / row.linhas.length * 100)})`).join('<br/>')}`; } },
    xAxis: { type: 'value', show: false, max: 100 }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.faixa), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [...canaisAtendimento.map((canal, index) => ({ name: canal, type: 'bar', stack: 'c', barMaxWidth: 16, data: rows.map(row => row.porCanal[canal] / row.linhas.length * 100), itemStyle: { color: cores[index], borderColor: tokens.surface, borderWidth: 1 },
      label: { show: true, position: 'inside', color: corDoTexto(cores[index]), fontSize: 11, fontWeight: 700, formatter: (p: any) => p.value >= 9 ? pct(p.value) : '' } })),
      { name: 'total', type: 'bar', stack: 'c', barMaxWidth: 16, data: rows.map(() => 0), itemStyle: { color: 'transparent' }, label: { show: true, position: 'right', color: tokens.muted, fontSize: 11, formatter: (p: any) => int(rows[p.dataIndex].linhas.length) } }],
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Canal dos protocolos pela distância entre o solicitante e a unidade mais próxima" onPick={p => { const row = rows[p.dataIndex]; if (!row) return; const canal = canaisAtendimento[p.seriesIndex];
    abrirProtocolos(ctx, canal ? `${canal}, solicitantes ${row.faixa}` : `Solicitantes ${row.faixa}`, canal ? row.linhas.filter(l => l.p.canal === canal) : row.linhas, 'Protocolos do período de quem mora ou tem sede nesta faixa de distância até a unidade mais próxima.'); }} />;
}

/* ---------- Coworkings ---------- */
function Coworkings({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, cw = ctx.estrutura!.coworking;
  const corDe = (v: number | null) => v === null ? tokens.soft : v >= 75 ? tokens.heat[3] : v >= 50 ? tokens.heat[2] : v >= 25 ? tokens.heat[1] : tokens.heat[0];
  const option = useMemo(() => ({
    grid: { top: 2, right: 4, bottom: 2, left: 2, containLabel: true },
    tooltip: { formatter: (item: any) => { const u = cw.unidades[item.value[1]]; return `<b>${u.nome}</b>, ${mes(cw.meses[item.value[0]])}<br/>Ocupação: ${pctOu(item.value[2])}<br/>${int(u.usuarios)} usuários, ${u.mesas} mesas${u.custoHora === null ? '' : `, ${money(u.custoHora)} por hora usada`}`; } },
    xAxis: { type: 'category', data: cw.meses.map(mes), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.muted, fontSize: 11 } },
    yAxis: { type: 'category', data: cw.unidades.map(u => `${u.nome} (${pctOu(u.ocupacao)})`), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [{ type: 'heatmap', data: cw.celulas.map(([x, y, v]) => { const cor = corDe(v); return { value: [x, y, v], itemStyle: { color: cor }, label: { color: corDoTexto(cor) } }; }),
      label: { show: true, fontSize: 11, formatter: (item: any) => item.value[2] === null ? '' : Math.round(item.value[2]) }, itemStyle: { borderColor: tokens.surface, borderWidth: 2, borderRadius: 3 } }],
  }), [cw, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Ocupação dos coworkings por unidade e mês, em %" />;
}
