import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador } from '../cockpit/ui';
import type { Exportavel } from '../cockpit/ui';
import { metasPmf, referencias2021 } from '../domain/sistema-confea';
import { CartaoIndicador, ListaMetricas, abrirIndicador, abrirMetricas, exportarMetricas, fmtIndicador, fmtMetrica, s } from './comum';

/**
 * Painel de Indicadores do Sistema, página Julgamento (10/11/2026): a eficiência (julgados sobre recebidos e pendentes) e a eficácia
 * (transitados com êxito sobre transitados) dos três tipos de processo na 1ª instância (câmaras) e na 2ª (Plenário), os motivos de
 * arquivamento sem êxito, a fila de cada instância e as metas 5.1 e 5.2 do PMF. A 3ª instância é do Confea: só a referência.
 * Foi aqui que o Caderno de 2021 descartou os números do Crea-SP (notas 31, 33, 36 e 38).
 */
export default function PaginaJulgamento({ ctx }: { ctx: CockpitCtx }) {
  const q = s(ctx), f = q.fora;
  return <div className="ck-grid ck-grid-cf-julgamento">
    <section className="ck-cards is-six" style={{ gridArea: 'kpi' }} aria-label="Indicadores do Julgamento">
      <CartaoIndicador ctx={ctx} codigo={17} ficha="k-17" destaque />
      <CartaoIndicador ctx={ctx} codigo={20} ficha="k-20" />
      <CartaoIndicador ctx={ctx} codigo={26} ficha="k-26" />
      <CartaoIndicador ctx={ctx} codigo={29} ficha="k-29" />
      <Indicador ctx={ctx} ficha="k-51" aspecto={`Meta ${metasPmf.julgamento.codigo} do PMF`} label="Infrações julgadas em 180 dias" value={pct(f.julgados180, 1)} meta={{ atual: f.julgados180, alvo: metasPmf.julgamento.alvo }}
        sub={`média de ${fmtMetrica(55, q.metricas.get(55))} na 1ª instância (métrica 55)`} onOpen={() => abrirMetricas(ctx, 'Tempo até o julgamento', [55, 93], `${metasPmf.julgamento.texto}. A planilha pede a média do tempo; a parte julgada em até 180 dias vem do GovAdm.`)} />
      <Indicador ctx={ctx} ficha="k-52" aspecto={`Meta ${metasPmf.etica.codigo} do PMF`} label="Éticos julgados em 360 dias" value={pct(f.etica360, 1)} meta={{ atual: f.etica360, alvo: metasPmf.etica.alvo }}
        sub={`média de ${fmtMetrica(82, q.metricas.get(82))} na 1ª instância (métrica 82)`} onOpen={() => abrirMetricas(ctx, 'Tempo até o julgamento dos processos éticos', [82, 121], `${metasPmf.etica.texto}. A planilha pede a média do tempo; a parte julgada em até 360 dias vem do GovAdm.`)} />
    </section>
    <Bloco ctx={ctx} id="in" area="in" title="Eficiência e eficácia em cada instância" exportar={exportarInstancias(ctx)}><Instancias ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="fi" area="fi" title="A fila de processos de infração" exportar={exportarFila(ctx)}><Fila ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="se" area="se" title="Por que a autuação não teve êxito" exportar={exportarSemExito(ctx)}><SemExito ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="fo" area="fo" title="As 80 métricas do Julgamento" exportar={exportarMetricas(ctx, ['Julgamento'])}><ListaMetricas ctx={ctx} subs={['Julgamento']} /></Bloco>
  </div>;
}

/* ---------- Tipo × instância ---------- */
const TIPOS = [
  { nome: 'Infração à legislação', eficiencia: [17, 20, 23], eficacia: [26, 29, 32], tempo: [55, 93] },
  { nome: 'Conduta incompatível', eficiencia: [18, 21, 24], eficacia: [27, 30, 33], tempo: [73, 111] },
  { nome: 'Infração ética', eficiencia: [19, 22, 25], eficacia: [28, 31, 34], tempo: [82, 121] },
];
const exportarInstancias = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Tipo de processo', 'Eficiência 1ª (%)', 'Eficácia 1ª (%)', 'Tempo médio 1ª (dias)', 'Eficiência 2ª (%)', 'Eficácia 2ª (%)', 'Tempo médio 2ª (dias)', 'Eficiência 3ª no Sistema em 2021 (%)', 'Eficácia 3ª no Sistema em 2021 (%)'],
  linhas: () => { const q = s(ctx), v = (c: number) => q.indicadores.get(c)?.valor ?? null;
    return TIPOS.map(t => [t.nome, v(t.eficiencia[0]), v(t.eficacia[0]), q.metricas.get(t.tempo[0]) ?? null, v(t.eficiencia[1]), v(t.eficacia[1]), q.metricas.get(t.tempo[1]) ?? null, referencias2021[t.eficiencia[2]]?.brasil ?? null, referencias2021[t.eficacia[2]]?.brasil ?? null]); } });
function Instancias({ ctx }: { ctx: CockpitCtx }) {
  const q = s(ctx);
  const celula = (c: number) => { const v = q.indicadores.get(c)!; return <td className="num is-clicavel" tabIndex={0} onClick={() => abrirIndicador(ctx, c)} onKeyDown={event => { if (event.key === 'Enter') abrirIndicador(ctx, c); }} title={`Indicador ${c}: clique para ver as métricas`}>
    {v.falta.length ? <b className="cf-alerta">falta {v.falta.join(', ')}</b> : <>{fmtIndicador(c, v.valor)}{referencias2021[c] && <small className="cf-ref"> Sistema {fmtIndicador(c, referencias2021[c].brasil)}</small>}</>}</td>; };
  const tempo = (c: number) => <td className="num cf-antes">{q.metricas.get(c) === null ? <b className="cf-alerta">vazia ({c})</b> : fmtMetrica(c, q.metricas.get(c))}</td>;
  return <div className="table-wrap"><table className="metodo is-dense cf-instancias">
    <thead><tr><th scope="col" rowSpan={2}>Tipo de processo</th><th scope="colgroup" colSpan={3}>1ª instância (câmaras)</th><th scope="colgroup" colSpan={3}>2ª instância (Plenário)</th><th scope="colgroup" colSpan={2} title="Os processos julgados no Confea: o Crea-SP não tem esses números">3ª instância (Confea)</th></tr>
      <tr><th scope="col" className="num">Eficiência</th><th scope="col" className="num">Eficácia</th><th scope="col" className="num">Tempo médio</th><th scope="col" className="num">Eficiência</th><th scope="col" className="num">Eficácia</th><th scope="col" className="num">Tempo médio</th><th scope="col" className="num">Eficiência</th><th scope="col" className="num">Eficácia</th></tr></thead>
    <tbody>{TIPOS.map(t => <tr key={t.nome}><th scope="row">{t.nome}</th>{celula(t.eficiencia[0])}{celula(t.eficacia[0])}{tempo(t.tempo[0])}{celula(t.eficiencia[1])}{celula(t.eficacia[1])}{tempo(t.tempo[1])}
      <td className="num cf-antes">{referencias2021[t.eficiencia[2]] ? `Sistema ${fmtIndicador(t.eficiencia[2], referencias2021[t.eficiencia[2]].brasil)}` : '—'}</td><td className="num cf-antes">{referencias2021[t.eficacia[2]] ? `Sistema ${fmtIndicador(t.eficacia[2], referencias2021[t.eficacia[2]].brasil)}` : '—'}</td></tr>)}</tbody></table>
    <p className="cf-nota">Eficiência: julgados sobre recebidos mais pendentes de anos anteriores. Eficácia: decisões transitadas em julgado com êxito na execução da autuação sobre todas as transitadas. Referência: média dos Creas no Caderno de 2021.</p></div>;
}

/* ---------- A fila de cada instância (métricas 56 a 58 e 94 a 96) ---------- */
const FILA = [{ nome: '1ª instância', c: [56, 57, 58] }, { nome: '2ª instância', c: [94, 95, 96] }];
const exportarFila = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Instância', 'Pendentes de anos anteriores', 'Recebidos no exercício', 'Julgados no exercício', 'Ficam para o próximo exercício'],
  linhas: () => FILA.map(f => { const [p, r, j] = f.c.map(c => s(ctx).metricas.get(c) ?? 0); return [f.nome, p, r, j, p + r - j]; }) });
function Fila({ ctx }: { ctx: CockpitCtx }) {
  const q = s(ctx), { tokens } = ctx, linhas = FILA.map(f => { const [p, r, j] = f.c.map(c => q.metricas.get(c) ?? 0); return { ...f, p, r, j, sobra: Math.max(0, p + r - j) }; });
  const partes = [{ nome: 'Julgados no exercício', cor: tokens.good, v: (l: typeof linhas[number]) => l.j }, { nome: 'Ficam para o próximo', cor: tokens.bad, v: (l: typeof linhas[number]) => l.sobra }];
  // Barras em 100% da carga de cada instância (pendentes mais recebidos), para a 2ª instância, bem menor, ficar legível; os rótulos mostram os processos.
  const carga = (l: typeof linhas[number]) => Math.max(1, l.p + l.r);
  const option = useMemo(() => ({
    grid: { top: 26, right: 4, bottom: 2, left: 2, containLabel: true }, legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 11 }, data: partes.map(p => p.nome) },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const l = linhas[items[0].dataIndex]; return `<b>${l.nome}</b><br/>Pendentes de anos anteriores: ${int(l.p)}<br/>Recebidos: ${int(l.r)}<br/>Julgados: ${int(l.j)}<br/>Ficam para o próximo: ${int(l.sobra)}`; } },
    xAxis: { type: 'value', show: false, max: 100 },
    yAxis: { type: 'category', inverse: true, data: linhas.map(l => `${l.nome}\n${int(l.p + l.r)} na fila, ${pct(l.j / carga(l) * 100)} julgados`), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11, lineHeight: 16 } },
    series: partes.map(parte => ({ name: parte.nome, type: 'bar', stack: 'f', barMaxWidth: 34, data: linhas.map(l => parte.v(l) / carga(l) * 100), itemStyle: { color: parte.cor, borderColor: tokens.surface, borderWidth: 1 },
      label: { show: true, position: 'inside', color: '#FFFFFF', fontSize: 11, fontWeight: 700, formatter: (p: any) => int(parte.v(linhas[p.dataIndex])) } })),
  }), [linhas, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Processos de infração à legislação em cada instância, em parte da fila: julgados no exercício e os que ficam para o próximo; ao lado do nome, a fila e a eficiência" onPick={p => { const l = linhas[p.dataIndex]; if (l) abrirMetricas(ctx, `Fila da ${l.nome}`, l.c, 'Pendentes de anos anteriores, recebidos e julgados no exercício.'); }} />;
}

/* ---------- Motivos sem êxito (métricas 67 a 72 e 105 a 110) ---------- */
const MOTIVOS = ['Erro de capitulação', 'Descrição insuficiente dos fatos', 'Excesso de exação', 'Falta de motivo ou motivação', 'Prescrição', 'Outros motivos'];
const exportarSemExito = (ctx: CockpitCtx): Exportavel => ({ cabecalho: ['Motivo', '1ª instância (métricas 67 a 72)', '2ª instância (métricas 105 a 110)'], linhas: () => MOTIVOS.map((m, i) => [m, s(ctx).metricas.get(67 + i) ?? null, s(ctx).metricas.get(105 + i) ?? null]) });
function SemExito({ ctx }: { ctx: CockpitCtx }) {
  const q = s(ctx), { tokens } = ctx, linhas = MOTIVOS.map((nome, i) => ({ nome, um: q.metricas.get(67 + i) ?? 0, dois: q.metricas.get(105 + i) ?? 0 }));
  const tot = [linhas.reduce((t, l) => t + l.um, 0), linhas.reduce((t, l) => t + l.dois, 0)];
  const option = useMemo(() => ({
    grid: { top: 26, right: 40, bottom: 2, left: 2, containLabel: true }, legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 11 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', show: false, max: 100 }, yAxis: { type: 'category', inverse: true, data: MOTIVOS, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [{ name: '1ª instância', key: 'um' }, { name: '2ª instância', key: 'dois' }].map((serie, k) => ({ name: serie.name, type: 'bar', barMaxWidth: 10, barGap: '20%',
      data: linhas.map(l => (k ? l.dois : l.um) / Math.max(1, tot[k]) * 100), itemStyle: { color: k ? tokens.blue : tokens.brand },
      label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (p: any) => pct(p.value) } })),
  }), [linhas, tokens, tot]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Decisões sem êxito na execução da autuação, pela parte de cada motivo de arquivamento, na 1ª e na 2ª instância"
    onPick={p => { const i = p.dataIndex; abrirMetricas(ctx, MOTIVOS[i], [67 + i, 105 + i], 'Decisões transitadas em julgado arquivadas por este motivo, na 1ª e na 2ª instância. Erro de capitulação e descrição insuficiente nascem na lavratura do auto: são assunto da fiscalização.'); }} />;
}
