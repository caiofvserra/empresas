import { useMemo } from 'react';
import { brl, int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { useTamanho } from '../cockpit/tamanho';
import { destinoDe } from '../domain/painel-fiscalizacao';
import type { Acao } from '../painel/fiscalizacao';
import { abrirAcoes } from './blocos';

/**
 * O caminho das ações como uma linha de metrô (07/11/2026): a linha principal vai da ação ao auto de infração, à multa e à
 * dívida ativa, que é o pior fim. Os ramais verdes descem para as saídas boas: regularizou sem auto, regularizou depois do auto
 * e multa paga. Cada estação abre a lista das ações. O rito é o da Resolução Confea nº 1.008/2004.
 */
interface Estacao { x: number; n: number; nome: string; lista: Acao[]; titulo: string; o: string; valor?: number }

export function CaminhoAcoes({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, [ref, { w, h }] = useTamanho<HTMLDivElement>();
  const d = useMemo(() => {
    const acoes = ctx.resumo.acoes, por = (destino: ReturnType<typeof destinoDe>) => acoes.filter(row => destinoDe(row) === destino);
    const autos = acoes.filter(row => row.auto), multas = autos.filter(row => row.auto!.status !== 'Cancelada');
    const status = (...s: string[]) => multas.filter(row => s.includes(row.auto!.status));
    const soma = (rows: Acao[]) => rows.reduce((t, row) => t + (row.auto?.valor ?? 0), 0);
    return { acoes, autos, multas, semAuto: por('Regularizou sem auto'), depois: por('Auto lavrado, depois regularizou'), aguardando: por('Notificada, ainda sem desfecho'),
      paga: status('Paga'), divida: status('Dívida ativa'), andamento: status('Em prazo de defesa', 'Em julgamento'), soma };
  }, [ctx.resumo.acoes]);

  const desenho = useMemo(() => {
    if (w < 200 || h < 70) return null;
    // Em telas baixas (1366 × 768) o ramal fica curto e o rótulo vai ao lado da estação, na mesma linha.
    const compacto = h < 170, m = 70, y0 = compacto ? h - 34 : Math.round(Math.min(h * .44, h - 92)), y1 = compacto ? h - 12 : h - 34, g = (w - 2 * m - 40) / 3, xs = [0, 1, 2, 3].map(i => m + i * g);
    const linha = tokens.ink, verde = tokens.good, vermelho = tokens.bad;
    const principais: Estacao[] = [
      { x: xs[0], n: d.acoes.length, nome: 'Ações de fiscalização', lista: d.acoes, titulo: 'Ações de fiscalização', o: 'Ações do período, do recorte escolhido.' },
      { x: xs[1], n: d.autos.length, nome: 'Viraram auto de infração', lista: d.autos, titulo: 'Ações que viraram auto de infração', o: 'Ações do período em que a empresa não se regularizou no prazo da notificação e foi autuada.' },
      { x: xs[2], n: d.multas.length, nome: 'Multas aplicadas', lista: d.multas, titulo: 'Multas aplicadas', o: 'Autos do período com multa, tirando os cancelados.', valor: d.soma(d.multas) },
      { x: xs[3], n: d.divida.length, nome: 'Em dívida ativa', lista: d.divida, titulo: 'Multas em dívida ativa', o: 'Multas do período que não foram pagas e já foram inscritas em dívida ativa.', valor: d.soma(d.divida) },
    ];
    const ramais: (Estacao & { de: number })[] = [
      { de: xs[0], x: xs[0] + g * (compacto ? .12 : .42), n: d.semAuto.length, nome: 'regularizaram sem auto', lista: d.semAuto, titulo: 'Regularizaram sem auto', o: 'Ações em que a empresa se regularizou ainda na notificação.' },
      { de: xs[1], x: xs[1] + g * (compacto ? .12 : .42), n: d.depois.length, nome: compacto ? 'regularizaram com auto' : 'regularizaram depois do auto', lista: d.depois, titulo: 'Regularizaram depois do auto', o: 'Ações que viraram auto e em que a empresa se regularizou depois.' },
      { de: xs[2], x: xs[2] + g * (compacto ? .12 : .42), n: d.paga.length, nome: 'multas pagas', lista: d.paga, titulo: 'Multas pagas', o: 'Multas do período já pagas.', valor: d.soma(d.paga) },
    ];
    return { compacto, y0, y1, g, xs, linha, verde, vermelho, principais, ramais };
  }, [w, h, d, tokens]);

  const abrir = (e: Estacao) => abrirAcoes(ctx, e.titulo, e.lista, e.o, 'O caminho segue o rito da Resolução Confea nº 1.008/2004. A empresa pode se regularizar em qualquer etapa.');
  const base = Math.max(1, d.acoes.length);
  return <div ref={ref} className="fs-metro" role="img" aria-label={`O caminho das ações: ${int(d.acoes.length)} ações, ${int(d.autos.length)} viraram auto, ${int(d.multas.length)} multas, ${int(d.divida.length)} em dívida ativa; ${int(d.semAuto.length)} regularizaram sem auto, ${int(d.depois.length)} depois do auto e ${int(d.paga.length)} multas foram pagas.`}>
    {desenho && <svg width={w} height={h}>
      {desenho.ramais.map((r, i) => <path key={i} d={desenho.compacto ? `M${r.de} ${desenho.y0} C ${r.de + 10} ${desenho.y0}, ${r.de + 8} ${desenho.y1}, ${r.x} ${desenho.y1}` : `M${r.de} ${desenho.y0} C ${r.de + 26} ${desenho.y0}, ${r.de + desenho.g * .14} ${desenho.y1}, ${r.x} ${desenho.y1}`} fill="none" stroke={desenho.verde} strokeWidth={desenho.compacto ? 5 : 8} strokeLinecap="round" />)}
      <path d={`M${desenho.xs[0]} ${desenho.y0} H${desenho.xs[2]}`} stroke={desenho.linha} strokeWidth={desenho.compacto ? 7 : 10} strokeLinecap="round" />
      <path d={`M${desenho.xs[2]} ${desenho.y0} H${desenho.xs[3]}`} stroke={desenho.vermelho} strokeWidth={desenho.compacto ? 7 : 10} strokeLinecap="round" />
      {!desenho.compacto && <><text className="fs-metro-trecho" x={(desenho.xs[0] + desenho.xs[1]) / 2 + 30} y={desenho.y0 + 24} textAnchor="middle" fill={tokens.muted}>{int(d.aguardando.length)} ainda sem desfecho</text>
      <text className="fs-metro-trecho" x={(desenho.xs[2] + desenho.xs[3]) / 2 + 30} y={desenho.y0 + 24} textAnchor="middle" fill={tokens.muted}>{int(d.andamento.length)} em defesa ou julgamento</text></>}
      {desenho.principais.map((e, i) => <g key={e.nome} className="fs-metro-estacao" tabIndex={0} role="button" aria-label={`${e.nome}: ${int(e.n)}. Abrir a lista.`} onClick={() => abrir(e)} onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrir(e); } }}>
        <circle cx={e.x} cy={desenho.y0} r={(i === 0 ? 14 : 11) * (desenho.compacto ? .7 : 1)} fill={i === 0 ? tokens.accent : tokens.surface} stroke={i === 3 ? desenho.vermelho : desenho.linha} strokeWidth={desenho.compacto ? 3 : 4} />
        <text x={e.x} y={desenho.y0 - (desenho.compacto ? 32 : 46)} textAnchor="middle" className="fs-metro-nome" fill={tokens.muted}>{e.nome}</text>
        <text x={e.x} y={desenho.y0 - (desenho.compacto ? 13 : 21)} textAnchor="middle" className={`fs-metro-num ${desenho.compacto ? 'is-compacto' : ''}`} fill={i === 3 ? desenho.vermelho : tokens.ink}>{int(e.n)}{i > 0 && i < 3 && <tspan className="fs-metro-parte" fill={tokens.muted}> {pct(e.n / base * 100)}</tspan>}{e.valor !== undefined && <tspan className="fs-metro-parte" fill={tokens.muted}> {brl(e.valor)}</tspan>}</text>
      </g>)}
      {desenho.ramais.map(r => <g key={r.nome} className="fs-metro-estacao" tabIndex={0} role="button" aria-label={`${int(r.n)} ${r.nome}. Abrir a lista.`} onClick={() => abrir(r)} onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrir(r); } }}>
        <circle cx={r.x} cy={desenho.y1} r={desenho.compacto ? 6 : 10} fill={tokens.surface} stroke={desenho.verde} strokeWidth={desenho.compacto ? 3 : 4} />
        <text x={r.x + (desenho.compacto ? 11 : 18)} y={desenho.y1 + (desenho.compacto ? 5 : 7)} className={`fs-metro-num is-ramal ${desenho.compacto ? 'is-compacto' : ''}`} fill={tokens.ink}>{int(r.n)}<tspan className="fs-metro-nome" fill={tokens.ink}> {r.nome}</tspan></text>
        {!desenho.compacto && <text x={r.x + 18} y={desenho.y1 + 24} className="fs-metro-trecho" fill={tokens.muted}>{r.valor !== undefined ? brl(r.valor) : `${pct(r.n / base * 100)} das ações`}</text>}
      </g>)}
    </svg>}
  </div>;
}
