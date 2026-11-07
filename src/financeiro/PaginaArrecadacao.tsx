import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { brl, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador } from '../cockpit/ui';
import type { Evolucao } from '../painel/evolucao';
import { municipioPorId } from '../domain/municipios';
import { diasUteis } from '../domain/financeiro';
import { MapaMunicipios } from '../gestao/comum';
import { Calendario, DiaADia, MetaRealizado, PorTipo, exportarDiaADia, exportarMetaRealizado, exportarPorTipo, medidaArrecadacao, metricasArrecadacao } from './blocos-arrecadacao';
import type { MetricaArrecadacao } from './blocos-arrecadacao';
import { arrecadadoNoMes, mesesAte, metaDoMes, nomesMesLongo, ritmo, useQuadro } from './dados';
import './financeiro.css';

/**
 * Painel Financeiro, página 1 (07/11/2026): o mês da data dia a dia contra a meta, como o painel de arrecadação que o Crea-SP já
 * usa (meta, arrecadado até o dia, quanto falta, dias úteis que restam e a média diária necessária), o ano mês a mês, cada tipo
 * contra o ano anterior e o mapa dos municípios. O dia escolhido no alto do primeiro bloco faz o papel do filtro de dia do painel antigo.
 */
export default function PaginaArrecadacao({ ctx }: { ctx: CockpitCtx }) {
  const q = useQuadro(ctx), { tokens } = ctx, mes = q.mes, indice = Number(mes.slice(5, 7)) - 1;
  const ultimoDia = new Date(Date.UTC(q.ano, indice + 1, 0)).getUTCDate(), uteis = diasUteis(mes);
  const [escolhido, setEscolhido] = useState<number | null>(null), dia = escolhido && escolhido <= ultimoDia ? escolhido : ultimoDia;
  const [metrica, setMetrica] = useState<MetricaArrecadacao>('ano');
  const r = ritmo(q, mes, dia), mesAntes = `${q.ano - 1}${mes.slice(4)}`;
  const anoAte = Array.from({ length: indice + 1 }, (_, i) => `${q.ano}-${String(i + 1).padStart(2, '0')}`);
  const noAno = anoAte.reduce((s, m) => s + arrecadadoNoMes(q, m), 0), noAnoAntes = anoAte.reduce((s, m) => s + arrecadadoNoMes(q, `${q.ano - 1}${m.slice(4)}`), 0);
  const metaAno = Array.from({ length: 12 }, (_, i) => metaDoMes(q, i)).reduce((a, b) => a + b, 0), metaAteMes = Array.from({ length: indice + 1 }, (_, i) => metaDoMes(q, i)).reduce((a, b) => a + b, 0);
  // O mês completo um ano antes, para a variação do cartão do mês quando o dia escolhido é o último.
  const antesAteDia = dia >= ultimoDia ? arrecadadoNoMes(q, mesAntes) : null;
  const serie = useMemo(() => { const meses = mesesAte(mes, 36);
    return { tipo: 'fluxo', meses, valores: meses.map(m => arrecadadoNoMes(q, m)), fmt: brl, curto: (value: number) => (value / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 0 }), unidade: 'em R$ milhões' } as Evolucao; }, [q, mes]);
  const medida = useMemo(() => medidaArrecadacao(ctx, q, metrica), [ctx.gestao, q, metrica]); // eslint-disable-line react-hooks/exhaustive-deps
  const cidades = municipioPorId(ctx.dataset), nomeMes = nomesMesLongo[indice];
  const seletorDia = <label className="ck-select is-compact"><span className="sr-only">Mês até o dia</span><select value={dia} onChange={event => setEscolhido(Number(event.target.value))}>
    {uteis.map(d => <option key={d} value={d}>até {d} de {nomeMes}</option>)}{!uteis.includes(ultimoDia) && <option value={ultimoDia}>mês inteiro</option>}</select><ChevronDown size={14} /></label>;
  return <div className="ck-grid fin-grid-arrecadacao">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores da arrecadação do mês">
      <Indicador destaque ficha="k-mes" ctx={ctx} label={`Arrecadado em ${nomeMes}${dia < ultimoDia ? ` até o dia ${dia}` : ''}`} serie={serie} value={brl(r.arrecadado)}
        variacao={antesAteDia ? { value: (r.arrecadado / antesAteDia - 1) * 100, label: `em relação a ${nomeMes} de ${q.ano - 1}` } : undefined} spark={serie.valores.slice(-12) as number[]} cor={tokens.accent}
        sub={`${r.meta ? pct(r.arrecadado / r.meta * 100) : '—'} da meta do mês, de ${brl(r.meta)}`} />
      <Indicador ficha="k-falta" ctx={ctx} label="Falta para a meta do mês" value={r.falta ? brl(r.falta) : 'Meta batida'} sub={r.falta ? `${r.uteisRestantes} de ${r.uteis} dias úteis ainda pela frente` : `${brl(r.arrecadado - r.meta)} acima da meta, em ${r.uteis} dias úteis`} />
      <Indicador ficha="k-media" ctx={ctx} label="Média diária necessária" value={r.mediaNecessaria ? brl(r.mediaNecessaria) : '—'} sub={r.uteisPassados ? `até agora, ${brl(r.arrecadado / r.uteisPassados)} por dia útil` : 'nenhum dia útil passou'} />
      <Indicador ficha="k-ano" ctx={ctx} label={`Arrecadado em ${q.ano}`} value={brl(noAno)} variacao={noAnoAntes ? { value: (noAno / noAnoAntes - 1) * 100, label: `em relação a janeiro a ${nomeMes} de ${q.ano - 1}` } : undefined}
        sub={`${metaAteMes ? pct(noAno / metaAteMes * 100) : '—'} da meta até ${nomeMes}; ${metaAno ? pct(noAno / metaAno * 100) : '—'} da meta do ano`} />
      <Indicador ficha="k-projecao" ctx={ctx} label="O mês no ritmo atual" value={dia >= ultimoDia ? 'Mês fechado' : brl(r.projecao)} sub={dia >= ultimoDia ? `fechou em ${r.meta ? pct(r.arrecadado / r.meta * 100) : '—'} da meta` : `${r.meta ? pct(r.projecao / r.meta * 100) : '—'} da meta, se cada dia útil render a média até agora`} />
    </section>
    <Bloco ctx={ctx} id="dd" area="dd" title={`${nomeMes[0].toUpperCase()}${nomeMes.slice(1)} de ${q.ano}, dia a dia`} actions={seletorDia} exportar={exportarDiaADia(q, mes, dia)}><DiaADia ctx={ctx} q={q} mes={mes} dia={dia} /></Bloco>
    <Bloco ctx={ctx} id="mr" area="mr" title={`Meta e realizado em ${q.ano}`} exportar={exportarMetaRealizado(q)}><MetaRealizado ctx={ctx} q={q} /></Bloco>
    <Bloco ctx={ctx} id="cl" area="cl" title="Calendário do mês"><Calendario ctx={ctx} q={q} mes={mes} dia={dia} /></Bloco>
    <Bloco ctx={ctx} id="tp" area="tp" title={`Cada tipo em ${q.ano} e em ${q.ano - 1}`} exportar={exportarPorTipo(q, mes)}><PorTipo ctx={ctx} q={q} mes={mes} /></Bloco>
    <Bloco ctx={ctx} id="mp" area="mp" title="Arrecadação por município"
      exportar={{ cabecalho: ['Município', medida.label], linhas: () => [...medida.cidade].map(([id, value]) => [cidades.get(id)?.nome ?? id, value === null ? null : Math.round(value)]) }}
      actions={<label className="ck-select is-compact"><span className="sr-only">Indicador do mapa</span><select value={metrica} onChange={event => setMetrica(event.target.value as MetricaArrecadacao)}>{(Object.keys(metricasArrecadacao) as MetricaArrecadacao[]).map(id => <option key={id} value={id}>{metricasArrecadacao[id]}</option>)}</select><ChevronDown size={14} /></label>}>
      <MapaMunicipios ctx={ctx} medida={medida} onCidade={cityId => ctx.filtrar({ cidade: cityId })} onGre={greId => ctx.filterGre(greId)} />
    </Bloco>
  </div>;
}
