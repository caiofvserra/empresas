import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Chart } from '../painel/chart';
import { int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador } from '../cockpit/ui';
import type { Exportavel } from '../cockpit/ui';
import { corDoTexto, variacaoPlana } from '../cockpit/formatos';
import { municipiosSp } from '../domain/municipios';
import { INDICADORES, indicador, porLugar, porRegionalDaFoto, valorDe, variacao } from '../domain/presidencia';
import type { Indicador as Ind, IndicadorId, Valores } from '../domain/presidencia';
import { MapaMunicipios } from '../gestao/comum';
import type { Medida } from '../gestao/comum';
import { MINIMO_TAXA, formato, misturar, nomeGre, nomePainel, sentido, variacaoTexto } from './comum';

/**
 * Painel da Presidência, página Regionais (07/11/2026): as dezesseis regionais em todos os assuntos. O mapa pinta cada município pelo
 * indicador escolhido, o quadro põe cada regional numa linha contra a meta e o mapa de calor mostra o que mudou em um ano. Clicar
 * numa regional filtra o painel inteiro por ela.
 */
type Linhas = Map<string, Valores>;
function useRegionais(ctx: CockpitCtx) {
  const p = ctx.presidencia, atual = p?.atual ?? null, antes = p?.anoAntes ?? null;
  return useMemo(() => ({ atual: atual ? porRegionalDaFoto(atual, ctx.dataset, ctx.camara) : null as Linhas | null, antes: antes ? porRegionalDaFoto(antes, ctx.dataset, ctx.camara) : null as Linhas | null }), [atual, antes, ctx.dataset, ctx.camara]);
}
const v = (linhas: Linhas | null, greId: string, id: IndicadorId) => { const row = linhas?.get(greId); return row ? valorDe(indicador(id), row[id]) : null; };

export default function PaginaRegionais({ ctx }: { ctx: CockpitCtx }) {
  const r = useRegionais(ctx), calculando = r.atual ? undefined : 'Calculando as regionais';
  const gres = ctx.dataset.gres.map(row => row.id), metas = ctx.metas;
  const extremo = (id: IndicadorId, maior: boolean, linhas: Linhas | null = r.atual, conta = (greId: string) => v(linhas, greId, id)) => {
    const rows = gres.map(greId => ({ greId, value: conta(greId) })).filter((row): row is { greId: string; value: number } => row.value !== null);
    return rows.sort((a, b) => maior ? b.value - a.value : a.value - b.value)[0] ?? null;
  };
  const naMeta = gres.filter(greId => (v(r.atual, greId, 'mercado') ?? -1) >= metas.cobertura).length;
  const fila = extremo('pendentes', true), divida = extremo('divida', true), atendimento = extremo('atendimento', false), regularizacao = extremo('regularizacao', false);
  const alta = extremo('profissionais', true, r.atual, greId => r.atual && r.antes ? variacao(indicador('profissionais'), r.atual.get(greId)!.profissionais, r.antes.get(greId)!.profissionais) : null);
  const total = (id: IndicadorId) => r.atual ? valorDe(indicador(id), sumLinhas(r.atual, id)) ?? 0 : 0, abrir = (greId?: string) => greId ? () => ctx.filterGre(greId) : undefined;
  return <div className="ck-grid ck-grid-pr-regionais">
    <section className="ck-cards is-six" style={{ gridArea: 'kpi' }} aria-label="As regionais que pedem atenção">
      <Indicador destaque ctx={ctx} ficha="k-meta" aspecto="Empresas" label="Regionais na meta de mercado" value={r.atual ? `${int(naMeta)} de ${int(gres.length)}` : '…'} sub={`com ${metas.cobertura}% ou mais do mercado registrado`} onOpen={() => ctx.go('mercado')} />
      <Indicador ctx={ctx} ficha="k-fila" aspecto="Gestão do Conselho" label="Mais processos esperando voto" value={fila ? nomeGre(ctx, fila.greId) : '…'} sub={fila ? `${int(fila.value)} processos, ${pct(fila.value / Math.max(1, total('pendentes')) * 100)} do total` : ''} onOpen={abrir(fila?.greId)} />
      <Indicador ctx={ctx} ficha="k-divida" aspecto="Financeiro" label="Mais anuidades vencidas" value={divida ? nomeGre(ctx, divida.greId) : '…'} sub={divida ? `${formato(indicador('divida'), divida.value)} vencidos, ${pct(divida.value / Math.max(1, total('divida')) * 100)} do total` : ''} onOpen={abrir(divida?.greId)} />
      <Indicador ctx={ctx} ficha="k-atendimento" aspecto="Atendimento" label="Menos protocolos fechados no prazo" value={atendimento ? nomeGre(ctx, atendimento.greId) : '…'} sub={atendimento ? `${pct(atendimento.value, 1)} dos fechados no prazo, contra a meta de ${metas.atendimento}%` : ''} onOpen={abrir(atendimento?.greId)} />
      <Indicador ctx={ctx} ficha="k-regularizacao" aspecto="Fiscalização" label="Menos ações terminadas em regularização" value={regularizacao ? nomeGre(ctx, regularizacao.greId) : '…'} sub={regularizacao ? `${pct(regularizacao.value, 1)} das ações, contra a meta de ${metas.regularizacao}%` : ''} onOpen={abrir(regularizacao?.greId)} />
      <Indicador ctx={ctx} ficha="k-profissionais" aspecto="Profissionais" label="Maior alta de profissionais em um ano" value={alta ? nomeGre(ctx, alta.greId) : '…'} sub={alta ? `${alta.value > 0 ? '+' : ''}${pct(alta.value, 1)} de profissionais com registro ativo` : ''} onOpen={abrir(alta?.greId)} />
    </section>
    <Mapa ctx={ctx} vazio={calculando} />
    <Bloco ctx={ctx} id="qd" area="qd" title="As regionais em todos os assuntos" vazio={calculando} exportar={exportarQuadro(ctx, r.atual)}><Quadro ctx={ctx} linhas={r.atual} /></Bloco>
    <Bloco ctx={ctx} id="cv" area="cv" title="O que mudou em um ano em cada regional" vazio={calculando ?? (r.antes ? undefined : 'A base ainda não existia um ano antes da data escolhida')} exportar={exportarCalor(ctx, r.atual, r.antes)}><Calor ctx={ctx} atual={r.atual!} antes={r.antes!} /></Bloco>
  </div>;
}

/* ---------- Mapa por município com o indicador escolhido ---------- */
const doMapa = INDICADORES.filter(row => row.lugar !== 'estado');
function Mapa({ ctx, vazio }: { ctx: CockpitCtx; vazio?: string }) {
  const [id, setId] = useState<IndicadorId>('mercado'), ind = indicador(id), foto = ctx.presidencia?.atual ?? null;
  const medida = useMemo<Medida | null>(() => {
    if (!foto) return null;
    const regionais = porRegionalDaFoto(foto, ctx.dataset, ctx.camara), gre = new Map([...regionais].map(([greId, row]) => [greId, valorDe(ind, row[id])]));
    const partes = porLugar(foto, id, ctx.camara), cidade = new Map(municipiosSp(ctx.dataset).map(row => {
      if (ind.lugar === 'regional') return [row.id, gre.get(row.greId) ?? null];
      const p = partes.get(row.id) ?? { n: 0, d: 0 };
      return [row.id, ind.unidade === 'taxa' ? (p.d >= MINIMO_TAXA ? p.n / p.d * 100 : null) : p.n];
    }));
    const fmt = (value: number) => formato(ind, value);
    return { label: ind.nome, curto: ind.unidade === 'taxa' ? '%' : ind.unidade === 'reais' ? 'R$' : 'n', fmt, alerta: !ind.sobeBom, menorPrimeiro: ind.sobeBom && ind.unidade === 'taxa', cidade, gre,
      dica: ind.lugar === 'regional' ? () => 'O painel de Atendimento não separa os municípios: vale o número da regional.' : ind.unidade === 'taxa' ? cityId => { const p = partes.get(cityId); return p ? `${int(p.n)} de ${int(p.d)}` : 'nenhum caso'; } : undefined };
  }, [foto, id, ctx.dataset, ctx.camara]); // eslint-disable-line react-hooks/exhaustive-deps
  const seletor = <label className="ck-select pr-select"><select aria-label="Indicador do mapa" value={id} onChange={event => setId(event.target.value as IndicadorId)}>
    {doMapa.map(row => <option key={row.id} value={row.id}>{nomePainel[row.painel]}: {row.nome.charAt(0).toLowerCase()}{row.nome.slice(1)}</option>)}</select></label>;
  return <Bloco ctx={ctx} id="mp" area="mp" title="Cada município" actions={seletor} vazio={vazio}>
    {medida && <MapaMunicipios ctx={ctx} medida={medida} onCidade={cityId => ctx.filtrar({ cidade: cityId })} onGre={greId => ctx.filterGre(greId)} />}
  </Bloco>;
}

/* ---------- Quadro: cada regional numa linha ---------- */
const colunas: IndicadorId[] = ['mercado', 'profissionais', 'anuidadePf', 'acoes', 'regularizacao', 'divida', 'atendimento', 'pendentes', 'vermelho'];
const cabecas: Record<string, string> = { mercado: 'Mercado registrado', profissionais: 'Profissionais ativos', anuidadePf: 'Anuidade em dia', acoes: 'Ações fiscais', regularizacao: 'Regularização', divida: 'Anuidades vencidas', atendimento: 'Atendimento no prazo', pendentes: 'Esperando voto', vermelho: 'Alerta vermelho' };
const exportarQuadro = (ctx: CockpitCtx, linhas: Linhas | null): Exportavel => ({ cabecalho: ['Regional', ...colunas.map(id => indicador(id).nome)], linhas: () => linhas ? ctx.dataset.gres.map(gre => [gre.name, ...colunas.map(id => { const value = v(linhas, gre.id, id); return value === null ? '' : Math.round(value * 10) / 10; })]) : [] });
function Quadro({ ctx, linhas }: { ctx: CockpitCtx; linhas: Linhas | null }) {
  const [ordem, setOrdem] = useState<{ id: IndicadorId | 'gre'; desc: boolean }>({ id: 'gre', desc: false });
  const { metas } = ctx;
  if (!linhas) return null;
  const maximos = new Map(colunas.map(id => [id, Math.max(1e-9, ...ctx.dataset.gres.map(gre => v(linhas, gre.id, id) ?? 0))]));
  const rows = [...ctx.dataset.gres].sort((a, b) => {
    if (ordem.id === 'gre') return (Number(a.id.replace(/\D/g, '')) - Number(b.id.replace(/\D/g, ''))) * (ordem.desc ? -1 : 1);
    const x = v(linhas, a.id, ordem.id) ?? -Infinity, y = v(linhas, b.id, ordem.id) ?? -Infinity; return ordem.desc ? y - x : x - y; });
  const celula = (ind: Ind, value: number | null) => {
    if (value === null) return { className: 'is-vazio', style: undefined };
    if (ind.meta) return { className: value >= metas[ind.meta] ? 'is-na-meta' : 'is-fora-da-meta', style: undefined };
    const fundo = misturar(ctx.tokens.surface, ind.sobeBom ? ctx.tokens.heat[2] : ctx.tokens.bad, 0.08 + value / maximos.get(ind.id)! * 0.5);
    return { className: 'is-escala', style: { background: fundo, color: corDoTexto(fundo) } };
  };
  const ordenar = (id: IndicadorId | 'gre') => setOrdem(previous => ({ id, desc: previous.id === id ? !previous.desc : id !== 'gre' }));
  const seta = (id: IndicadorId | 'gre') => ordem.id === id ? (ordem.desc ? <ArrowDown size={11} /> : <ArrowUp size={11} />) : null;
  return <div className="pr-quadro-wrap"><table className="pr-quadro">
    <thead><tr><th scope="col"><button onClick={() => ordenar('gre')}>Regional{seta('gre')}</button></th>
      {colunas.map(id => { const ind = indicador(id); return <th key={id} scope="col" aria-sort={ordem.id === id ? (ordem.desc ? 'descending' : 'ascending') : undefined}><button onClick={() => ordenar(id)} title={`${ind.nome} (${nomePainel[ind.painel]})${ind.meta ? `; meta de ${metas[ind.meta]}%` : ''}. Clique para ordenar.`}>{cabecas[id]}{seta(id)}</button></th>; })}</tr></thead>
    <tbody>{rows.map(gre => <tr key={gre.id} className={ctx.greId === gre.id ? 'is-selected' : ''} onClick={() => ctx.filterGre(gre.id)} tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); ctx.filterGre(gre.id); } }} aria-label={`${gre.name}: filtrar o painel por esta regional`}>
      <th scope="row">{gre.name}</th>
      {colunas.map(id => { const ind = indicador(id), value = v(linhas, gre.id, id), c = celula(ind, value); return <td key={id} className={c.className} style={c.style}>{formato(ind, value)}</td>; })}</tr>)}</tbody>
    <tfoot><tr><th scope="row">Estado</th>{colunas.map(id => { const ind = indicador(id), estado = valorDe(ind, sumLinhas(linhas, id)); return <td key={id}>{formato(ind, estado)}</td>; })}</tr></tfoot>
  </table></div>;
}
const sumLinhas = (linhas: Linhas, id: IndicadorId) => [...linhas.values()].reduce((p, row) => ({ n: p.n + row[id].n, d: p.d + row[id].d }), { n: 0, d: 0 });

/* ---------- Mapa de calor: a variação em um ano de cada regional ---------- */
const doCalor: IndicadorId[] = ['mercado', 'profissionais', 'anuidadePf', 'acoes', 'regularizacao', 'divida', 'atendimento', 'pendentes'];
/** A variação curta da célula, com uma casa abaixo de 10 para que a alta pequena de profissionais não vire "0%"; só o que arredonda para zero fica "0", sem sinal. */
const curta = (ind: Ind, value: number | null) => value === null ? '—' : variacaoPlana(value, 'pp') ? (ind.unidade === 'taxa' ? '0' : '0%')
  : `${value > 0 ? '+' : ''}${value.toLocaleString('pt-BR', { maximumFractionDigits: Math.abs(value) < 10 ? 1 : 0 })}${ind.unidade === 'taxa' ? '' : '%'}`;
const exportarCalor = (ctx: CockpitCtx, atual: Linhas | null, antes: Linhas | null): Exportavel => ({ cabecalho: ['Regional', ...doCalor.map(id => `${indicador(id).nome} (${indicador(id).unidade === 'taxa' ? 'p.p.' : '%'})`)],
  linhas: () => atual && antes ? ctx.dataset.gres.map(gre => [gre.name, ...doCalor.map(id => { const value = variacao(indicador(id), atual.get(gre.id)![id], antes.get(gre.id)![id]); return value === null ? '' : Math.round(value * 10) / 10; })]) : [] });
function Calor({ ctx, atual, antes }: { ctx: CockpitCtx; atual: Linhas; antes: Linhas }) {
  const { tokens, dark } = ctx, gres = ctx.dataset.gres;
  const option = useMemo(() => {
    const neutro = dark ? '#15294F' : '#F4F6F9';
    const dados = doCalor.flatMap((id, y) => { const ind = indicador(id), valores = gres.map(gre => variacao(ind, atual.get(gre.id)![id], antes.get(gre.id)![id])), max = Math.max(1, ...valores.map(value => Math.abs(value ?? 0)));
      return gres.map((gre, x) => { const value = valores[x], s = sentido(ind, value), cor = value === null || s === 'flat' ? neutro : misturar(neutro, s === 'good' ? tokens.good : tokens.bad, 0.2 + Math.abs(value) / max * 0.8);
        return { value: [x, y, value ?? 0], greId: gre.id, id, texto: curta(ind, value), itemStyle: { color: cor, borderColor: tokens.surface, borderWidth: 2, borderRadius: 3 }, label: { color: corDoTexto(cor) } }; }); });
    return {
      grid: { top: 2, right: 4, bottom: 2, left: 2, containLabel: true },
      tooltip: { formatter: (p: any) => { const ind = indicador(p.data.id), gre = p.data.greId; return `<b>${nomeGre(ctx, gre)}</b><br/>${ind.nome}<br/>agora: ${formato(ind, valorDe(ind, atual.get(gre)![ind.id]))}<br/>um ano antes: ${formato(ind, valorDe(ind, antes.get(gre)![ind.id]))}<br/>variação: ${variacaoTexto(ind, variacao(ind, atual.get(gre)![ind.id], antes.get(gre)![ind.id]))}<br/><span style="opacity:.7">clique para ver a regional</span>`; } },
      xAxis: { type: 'category', data: gres.map(gre => gre.name), position: 'bottom', axisTick: { show: false }, axisLine: { show: false }, // Em telas estreitas, o nome da regional quebra em duas linhas para caberem as 16.
        axisLabel: { interval: 0, color: tokens.ink, fontSize: 11, fontWeight: 700, lineHeight: 12, formatter: (nome: string) => window.innerWidth < 1600 ? nome.replace(' ', '\n') : nome }, splitArea: { show: false } },
      yAxis: { type: 'category', inverse: true, data: doCalor.map(id => `${(cabecas[id])} (${indicador(id).unidade === 'taxa' ? 'p.p.' : '%'})`), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
      // O ECharts exige um visualMap no mapa de calor; ele só fixa a opacidade, e a cor de cada célula vem do item (o texto precisa saber a cor).
      visualMap: { show: false, dimension: 2, min: -1e15, max: 1e15, inRange: { opacity: 1 } },
      series: [{ type: 'heatmap', data: dados, label: { show: true, fontSize: 11, fontWeight: 700, formatter: (p: any) => p.data.texto } }],
    };
  }, [atual, antes, tokens, dark, gres]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Variação em um ano de cada indicador em cada regional; verde é melhora e vermelho é piora" onPick={p => { if (p.data?.greId) ctx.filterGre(p.data.greId); }} />;
}
