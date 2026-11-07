import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { int, mes } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import type { Evolucao } from '../painel/evolucao';
import { Bloco, Indicador, Selo, avisoVazio } from '../cockpit/ui';
import { MapaMunicipios } from '../gestao/comum';
import { AtividadesCnpj, MesesCnpj, SituacaoPorte, ultimoMesReceita, exportarAtividadesCnpj, exportarMapaCnpj, exportarMesesCnpj, exportarSituacaoPorte, medidaCnpj, mercadoReceita, mesesReceita, metricasCnpj, useQuadroReceita } from './blocos-cnpj';
import type { MetricaCnpj } from './blocos-cnpj';

/**
 * Painel de Empresas, página 5 (07/11/2026): o mercado de engenharia nos dados abertos do CNPJ da Receita Federal, com dado real.
 * Conta os estabelecimentos paulistas com atividade da lista do Crea-SP por município, situação, porte e mês de abertura e de baixa.
 * Não compara com o cadastro do Crea-SP, que no painel ainda é demonstrativo: o cruzamento CNPJ a CNPJ roda na base interna.
 */
export default function PaginaCnpj({ ctx }: { ctx: CockpitCtx }) {
  const meses = mesesReceita(ctx), q = useQuadroReceita(ctx), serieLonga = useQuadroReceita(ctx, 35), competencia = mercadoReceita.competencia;
  const [metrica, setMetrica] = useState<MetricaCnpj>('ativos');
  const medida = useMemo(() => medidaCnpj(ctx, metrica), [ctx.dataset, ctx.period, metrica]); // eslint-disable-line react-hooks/exhaustive-deps
  const serie = (campo: 'aberturas' | 'baixas'): Evolucao => ({ tipo: 'fluxo', meses: serieLonga.meses.map(row => row.mes), valores: serieLonga.meses.map(row => row[campo]), fmt: int, nome: campo === 'aberturas' ? 'Abertos na Receita' : 'Baixados na Receita' });
  const selo = <Selo data={competencia} />, ate = `até ${mes(ultimoMesReceita)}`;
  const vazio = avisoVazio(q.sim + q.passivel === 0 && q.aberturas === 0 && q.baixas === 0, 'Nenhum estabelecimento com atividade da lista');
  return <div className="ck-grid ck-grid-cnpj">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores do mercado de engenharia na Receita Federal">
      <Indicador ficha="k-obrigatorio" ctx={ctx} label="Ativos com atividade de registro obrigatório" value={int(q.sim)} sub={`${int(q.principal.sim)} pela atividade principal`} />
      <Indicador ficha="k-analisar" ctx={ctx} label="Ativos com atividade a analisar" value={int(q.passivel)} sub={`${int(q.principal.passivel)} pela atividade principal`} />
      <Indicador ficha="k-abertos" ctx={ctx} label={`Abertos em ${meses} meses`} serie={serie('aberturas')} value={int(q.aberturas)} sub={ate} />
      <Indicador ficha="k-baixados" ctx={ctx} label={`Baixados em ${meses} meses`} serie={{ ...serie('baixas'), goodUp: false }} value={int(q.baixas)} sub={ate} />
      <Indicador ficha="k-saldo" ctx={ctx} label="Saldo do período" value={`${q.aberturas - q.baixas >= 0 ? '+' : ''}${int(q.aberturas - q.baixas)}`} sub="abertos menos baixados" />
    </section>
    <Bloco ctx={ctx} id="mp" area="mp" title="Mapa por município" badge={selo} question="Cada município é pintado pelo próprio valor no indicador escolhido, em cinco faixas. A lista ao lado traz as GREs em ordem." help="Clique num município ou numa GRE para filtrar a página por ele."
      exportar={exportarMapaCnpj(ctx)}
      actions={<label className="ck-select is-compact"><span className="sr-only">Indicador do mapa</span><select value={metrica} onChange={event => setMetrica(event.target.value as MetricaCnpj)}>{(Object.keys(metricasCnpj) as MetricaCnpj[]).map(id => <option key={id} value={id}>{metricasCnpj[id]}</option>)}</select><ChevronDown size={14} /></label>}>
      <MapaMunicipios ctx={ctx} medida={medida} onCidade={id => ctx.filtrar({ cidade: id })} onGre={id => ctx.filtrar({ gre: id })} /></Bloco>
    <Bloco ctx={ctx} id="at" area="at" vazio={vazio} title="Atividades com mais estabelecimentos" badge={selo} question="Os estabelecimentos ativos do recorte pela atividade (CNAE) da lista do Crea-SP que os enquadra: a principal, ou a secundária quando a principal não está na lista." exportar={exportarAtividadesCnpj(q)}><AtividadesCnpj ctx={ctx} q={q} /></Bloco>
    <Bloco ctx={ctx} id="sp" area="sp" vazio={vazio} title="Situação na Receita e porte" badge={selo} question="Em cima, os estabelecimentos com atividade da lista pela situação na Receita. Embaixo, os ativos pelo porte da empresa." exportar={exportarSituacaoPorte(q)}><SituacaoPorte ctx={ctx} q={q} /></Bloco>
    <Bloco ctx={ctx} id="mm" area="mm" vazio={vazio} title="Abertos e baixados, mês a mês" badge={selo} question={`Os estabelecimentos com atividade da lista abertos (acima do zero) e baixados (abaixo) em cada um dos ${meses} meses ${ate}, com o saldo na linha.`} exportar={exportarMesesCnpj(q)}><MesesCnpj ctx={ctx} q={q} /></Bloco>
  </div>;
}
