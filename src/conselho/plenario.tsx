import { useMemo } from 'react';
import { int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { useTamanho } from '../cockpit/tamanho';
import type { LinhaPlenario } from '../domain/gestao';
import { abrirMembros, q } from './comum';

/**
 * O Plenário desenhado (07/11/2026): uma bolinha por cadeira, em fileiras de meia-lua, e as cadeiras de cada câmara juntas numa
 * fatia, para ver de relance o tamanho de cada uma. A legenda dá as cadeiras e a parte dos profissionais ativos da câmara, que
 * era o que o gráfico de halteres comparava. Com uma câmara escolhida no alto, as outras ficam apagadas.
 */
const CORES_CLARO = ['#0D1732', '#FFB000', '#3662E2', '#718096', '#6077B6', '#E19B01', '#AFBBDB', '#000000', '#FFC640'];
const CORES_ESCURO = ['#6077B6', '#FFB000', '#DFE4F2', '#A0AEC0', '#3662E2', '#E19B01', '#FFF6DC', '#7B95E8', '#FFC640'];

/**
 * As cadeiras de um hemiciclo dividido em fatias: cada grupo ganha um ângulo proporcional às suas cadeiras, com uma folga entre
 * as fatias, e dentro da fatia as cadeiras se espalham pelas fileiras na proporção do raio de cada uma. Devolve, para cada grupo,
 * a fileira e o ângulo de cada cadeira, e o ângulo do meio da fatia.
 */
export function fatiasHemiciclo(grupos: number[], fileiras: number, folga = 0.035): { meio: number; lugares: { fileira: number; angulo: number }[] }[] {
  const total = grupos.reduce((a, b) => a + b, 0); if (!total) return [];
  const util = Math.PI - folga * Math.max(0, grupos.length - 1), raios = Array.from({ length: fileiras }, (_, i) => 0.42 + 0.58 * (i / Math.max(1, fileiras - 1)));
  let inicio = Math.PI;
  return grupos.map(n => {
    const span = util * n / total, fim = inicio - span, somaR = raios.reduce((a, b) => a + b, 0);
    const bruto = raios.map(r => n * r / somaR), porFileira = bruto.map(Math.floor);
    let resto = n - porFileira.reduce((a, b) => a + b, 0);
    bruto.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (resto > 0) { porFileira[i]++; resto--; } });
    const lugares = porFileira.flatMap((k, fileira) => Array.from({ length: k }, (_, j) => ({ fileira, angulo: inicio - span * (j + 0.5) / k })));
    const meio = inicio - span / 2; inicio = fim - folga;
    return { meio, lugares };
  });
}

export function PlenarioDesenhado({ ctx }: { ctx: CockpitCtx }) {
  const c = q(ctx), dark = ctx.dark, [ref, { w, h }] = useTamanho<HTMLDivElement>(), [refBloco, bloco] = useTamanho<HTMLDivElement>();
  const curta = bloco.h > 0 && bloco.h < 420; // em 1366 × 768 a legenda vira uma linha por câmara, para sobrar altura para o desenho
  const rows = useMemo(() => [...c.plenario].filter(row => row.cadeiras > 0).sort((a, b) => b.cadeiras - a.cadeiras), [c.plenario]);
  const cores = dark ? CORES_ESCURO : CORES_CLARO, total = rows.reduce((t, row) => t + row.cadeiras, 0);
  const escolhida = c.recorte.colegiado && c.recorte.colegiado !== 'Plenário' ? c.recorte.colegiado : null;
  const desenho = useMemo(() => {
    if (w < 160 || h < 100 || !total) return null;
    const fileiras = Math.max(4, Math.min(12, Math.round(Math.sqrt(total / 3.2)))), R = Math.min(w / 2 - 34, h - 30), r0 = R * 0.42, passo = (R - r0) / Math.max(1, fileiras - 1);
    const fatias = fatiasHemiciclo(rows.map(row => row.cadeiras), fileiras);
    const raio = Math.max(2.2, Math.min(passo * 0.38, (Math.PI * R / total) * fileiras * 0.32));
    const cx = w / 2, cy = h - raio - 2;
    const pontos = fatias.flatMap((f, r) => f.lugares.map(l => ({ r, x: cx + Math.cos(l.angulo) * (r0 + l.fileira * passo), y: cy - Math.sin(l.angulo) * (r0 + l.fileira * passo) })));
    const rotulos = fatias.map((f, r) => ({ r, x: cx + Math.cos(f.meio) * (R + raio + 12), y: cy - Math.sin(f.meio) * (R + raio + 12) + 4, a: Math.cos(f.meio) }));
    return { cx, cy, r0, raio, pontos, rotulos };
  }, [w, h, total, rows]);
  const abrir = (row: LinhaPlenario) => abrirMembros(ctx, `Câmara ${row.camara}`, c.membros.filter(m => m.camara === row.camara).sort((a, b) => a.nome.localeCompare(b.nome)), `Conselheiros em exercício na câmara ${row.camara}, com a organização que indicou. A câmara tem ${int(row.cadeiras)} cadeiras no Plenário.`);
  return <div ref={refBloco} className={`cs-plenario ${curta ? 'is-curta' : ''}`}>
    <div ref={ref} className="cs-plenario-desenho" role="img" aria-label={`O Plenário com ${int(total)} cadeiras: ${rows.map(row => `${row.camara}, ${int(row.cadeiras)}`).join('; ')}.`}>
      {desenho && <svg width={w} height={h}>
        {desenho.pontos.map((p, k) => <circle key={k} cx={p.x} cy={p.y} r={desenho.raio} fill={cores[p.r % cores.length]} opacity={escolhida && rows[p.r].camara !== escolhida ? 0.18 : 1} />)}
        {desenho.rotulos.map(l => <text key={l.r} x={l.x} y={l.y} textAnchor={l.a > 0.3 ? 'start' : l.a < -0.3 ? 'end' : 'middle'} className="cs-plenario-n" fill="var(--ink)" opacity={escolhida && rows[l.r].camara !== escolhida ? 0.3 : 1}>{int(rows[l.r].cadeiras)}</text>)}
        <text x={desenho.cx} y={desenho.cy - (desenho.r0 > 70 ? 30 : 6)} textAnchor="middle" className="cs-plenario-total" fill="var(--ink)" style={{ fontSize: Math.max(15, Math.min(30, desenho.r0 * .42)) }}>{int(total)}</text>
        {desenho.r0 > 70 && <text x={desenho.cx} y={desenho.cy - 12} textAnchor="middle" className="cs-plenario-sub" fill="var(--muted)">cadeiras no Plenário</text>}
      </svg>}
    </div>
    {curta && <p className="cs-plenario-chave">Cadeiras de cada câmara e a parte dela nos profissionais ativos</p>}
    <ul className="cs-plenario-legenda">{rows.map((row, r) => <li key={row.camara} className={escolhida && row.camara !== escolhida ? 'is-apagada' : ''}><button onClick={() => abrir(row)} title={`Ver os conselheiros da câmara ${row.camara}`}>
      <i style={{ background: cores[r % cores.length] }} aria-hidden="true" /><span><b>{row.camara}</b>{curta ? <small>{int(row.cadeiras)}, {row.parteProfissionais === null ? '—' : pct(row.parteProfissionais)}</small> : <small>{int(row.cadeiras)} cadeiras ({row.parteCadeiras === null ? '—' : pct(row.parteCadeiras)}); {row.parteProfissionais === null ? 'sem modalidade própria no registro' : `${pct(row.parteProfissionais)} dos profissionais`}</small>}</span></button></li>)}</ul>
  </div>;
}
