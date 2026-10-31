import { useMemo, useState } from 'react';
import { Chart } from '../painel/chart';
import { int } from '../painel/ui';
import { casos, fontes, lacunas, niveisEvidencia, regrasLeitura, situacoesCaso, usoNoPainel } from '../observatorio/governanca';
import type { Decisao, SituacaoCaso } from '../observatorio/governanca';
import type { CockpitCtx } from './contexto';
import { Bloco } from './ui';

/**
 * Aba 9 · Método: o que o projeto elaborou e a V19 aplica. Regras de leitura do plano rev. 2, decisão sobre as 12 lacunas do V18,
 * onde está cada um dos 34 casos de uso e o atlas unificado de 98 fontes, com nível de evidência.
 */
export default function PaginaMetodo({ ctx }: { ctx: CockpitCtx }) {
  return <div className="ck-grid ck-grid-metodo">
    <Bloco ctx={ctx} id="rl" area="rl" title="O que cada cruzamento permite concluir" question="Regras de leitura do plano do Observatório (rev. 2). Toda ligação é confirmada, candidata ou contexto; a situação no Crea-SP é lida na data do fato."><RegrasLeitura /></Bloco>
    <Bloco ctx={ctx} id="lc" area="lc" title="As 12 lacunas do V18 e a decisão na V19" question="Da revisão do repositório: cada lacuna foi corrigida, rotulada como demonstrativa ou retirada. A última coluna diz o que falta para produção."><Lacunas /></Bloco>
    <Bloco ctx={ctx} id="uc" area="uc" title="Os 34 casos de uso e onde estão" question="Casos com fórmula, grão e tempo do levantamento de 29/10. Clique numa situação para filtrar."><Casos ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ft" area="ft" title="Atlas de 98 fontes, por tema e evidência" question="Catálogo unificado (atlas + levantamento). Evidência: amostra lida, contrato de API, documentação, pista a confirmar ou parceria. Clique numa célula para listar."><Fontes ctx={ctx} /></Bloco>
  </div>;
}

function RegrasLeitura() {
  return <div className="table-wrap"><table className="metodo">
    <thead><tr><th>Cruzamento</th><th>Pode concluir</th><th>Não pode concluir</th><th>Na V19</th></tr></thead>
    <tbody>{regrasLeitura.map(row => <tr key={row.cruzamento}><td><b>{row.cruzamento}</b></td><td>{row.pode}</td><td className="nao">{row.naoPode}</td><td><small>{row.noPainel}</small></td></tr>)}</tbody>
  </table></div>;
}

const decisaoClasse: Record<Decisao, string> = { Corrigida: 'is-confirmado', Rotulada: 'is-contexto', Retirada: 'is-candidato' };
function Lacunas() {
  const contagem = (decisao: Decisao) => lacunas.filter(row => row.decisao === decisao).length;
  return <div className="stack">
    <p className="kpi-line"><b>{contagem('Corrigida')}</b> corrigidas · <b>{contagem('Retirada')}</b> retiradas · <b>{contagem('Rotulada')}</b> rotuladas como demonstrativas</p>
    <div className="table-wrap"><table className="metodo">
      <thead><tr><th>#</th><th>Lacuna</th><th>Decisão</th><th>O que mudou</th><th>Falta para produção</th></tr></thead>
      <tbody>{lacunas.map(row => <tr key={row.n}><td>{row.n}</td><td><b>{row.titulo}</b></td><td><span className={`status ${decisaoClasse[row.decisao]}`}>{row.decisao}</span></td><td>{row.oQueMudou}</td><td><small>{row.falta}</small></td></tr>)}</tbody>
    </table></div>
  </div>;
}

const corCaso = (tokens: CockpitCtx['tokens']): Record<SituacaoCaso, string> => ({ 'No painel': tokens.good, Parcial: tokens.accent, 'Próximas ondas': tokens.blue, 'Depende de acordo': tokens.heat[1] });
function Casos({ ctx }: { ctx: CockpitCtx }) {
  const [filtro, setFiltro] = useState<SituacaoCaso | null>(null), cores = corCaso(ctx.tokens);
  const rows = filtro ? casos.filter(row => row.situacao === filtro) : casos;
  return <div className="stack">
    <div className="seg is-wrap" role="radiogroup" aria-label="Situação do caso de uso">
      <button role="radio" aria-checked={filtro === null} className={filtro === null ? 'on' : ''} onClick={() => setFiltro(null)}>Todos · {casos.length}</button>
      {situacoesCaso.map(item => <button key={item} role="radio" aria-checked={filtro === item} className={filtro === item ? 'on' : ''} onClick={() => setFiltro(filtro === item ? null : item)}><i className="dot" style={{ background: cores[item] }} />{item} · {casos.filter(row => row.situacao === item).length}</button>)}
    </div>
    <div className="table-wrap"><table className="metodo">
      <thead><tr><th>Caso</th><th>Prioridade</th><th>Situação</th><th>Onde</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.id} title={row.resumo}><td><b>{row.id} · {row.nome}</b><small>{row.grupo}</small></td><td>{row.prioridade}</td><td><span className="chip" style={{ borderColor: cores[row.situacao] }}><i className="dot" style={{ background: cores[row.situacao] }} />{row.situacao}</span></td><td><small>{row.onde}</small></td></tr>)}</tbody>
    </table></div>
  </div>;
}

function Fontes({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, [sel, setSel] = useState<{ tema: string; evidencia: string } | null>(null);
  const temas = useMemo(() => [...new Set(fontes.map(row => row.tema))].sort((a, b) => fontes.filter(row => row.tema === b).length - fontes.filter(row => row.tema === a).length), []);
  const niveis = niveisEvidencia.filter(nivel => fontes.some(row => row.evidencia === nivel));
  const celulas = useMemo(() => temas.flatMap((tema, y) => niveis.map((nivel, x) => [x, y, fontes.filter(row => row.tema === tema && row.evidencia === nivel).length] as [number, number, number])), [temas, niveis]);
  const option = useMemo(() => ({
    grid: { top: 4, right: 8, bottom: 26, left: 4, containLabel: true },
    tooltip: { formatter: (item: any) => `<b>${temas[item.value[1]]}</b><br/>${niveis[item.value[0]]}: ${int(item.value[2])} fontes` },
    xAxis: { type: 'category', data: niveis, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: { type: 'category', inverse: true, data: temas, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10, width: 170, overflow: 'truncate' } },
    visualMap: { show: false, min: 0, max: Math.max(...celulas.map(row => row[2]), 1), inRange: { color: [tokens.soft, tokens.blue] } },
    series: [{ type: 'heatmap', data: celulas, label: { show: true, color: tokens.ink, fontSize: 10, formatter: (item: any) => item.value[2] || '' }, itemStyle: { borderColor: tokens.surface, borderWidth: 2, borderRadius: 3 } }],
  }), [celulas, temas, niveis, tokens]);
  const lista = sel ? fontes.filter(row => row.tema === sel.tema && row.evidencia === sel.evidencia) : fontes.filter(row => usoNoPainel[row.fonte]);
  return <div className="stack">
    <p className="kpi-line"><b>{int(fontes.length)}</b> fontes · <b>{int(fontes.filter(row => row.acesso === 'Público').length)}</b> públicas · <b>{int(fontes.filter(row => row.acesso === 'Convênio').length)}</b> por convênio · <b>{int(fontes.filter(row => row.evidencia === 'amostra').length)}</b> com amostra lida</p>
    <div className="fontes-heat"><Chart option={option} tokens={tokens} label="Fontes do atlas por tema e nível de evidência" onPick={item => { const tema = temas[item.value?.[1]], evidencia = niveis[item.value?.[0]]; if (tema && evidencia && item.value[2]) setSel({ tema, evidencia }); }} /></div>
    <div className="table-wrap is-short"><table className="metodo">
      <thead><tr><th colSpan={3}>{sel ? <>{sel.tema} · {sel.evidencia} <button className="link" onClick={() => setSel(null)}>limpar</button></> : 'Fontes que a V19 usa ou simula'}</th></tr></thead>
      <tbody>{lista.map(row => <tr key={row.fonte}><td><b>{row.fonte}</b><small>{row.orgao} · {row.acesso} · {row.rotina}</small></td><td><small>{row.chaves}</small></td><td><small>{usoNoPainel[row.fonte] ?? `${row.evidencia}${row.data ? ` · ${row.data}` : ''}`}</small></td></tr>)}</tbody>
    </table></div>
  </div>;
}
