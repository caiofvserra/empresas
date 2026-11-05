import { useMemo, useState } from 'react';
import { noRecorte, situacaoEm } from '../domain/profissionais';
import { ChevronDown } from 'lucide-react';
import { int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador } from '../cockpit/ui';
import { ArvoreModalidade, IdadeModalidade, MapaProfissionais, Piramide, SituacaoAnuidade, abrirProfissionais, filtroDe, metricasMapa, porIds } from './blocos';
import type { MetricaMapa } from './blocos';
import { useSeriesProfissionais } from './series';

const change = (now: number, before: number) => before > 0 ? (now - before) / before * 100 : null;

/** Painel de Profissionais, página 1: quantos têm registro ativo, onde moram, em que modalidade e nível, quem são e se pagam a anuidade. */
export default function PaginaProfissionais({ ctx }: { ctx: CockpitCtx }) {
  const { metas } = ctx, p = ctx.profissionais.resumo, antes = p.porNivel.reduce((sum, row) => sum + row.antes, 0);
  const sessenta = porIds(ctx, p.porIdade.at(-1)?.ids ?? []), mulheres = porIds(ctx, p.porGenero.find(row => row.nome === 'Feminino')?.ids ?? []);
  const [metrica, setMetrica] = useState<MetricaMapa>('ativos'), series = useSeriesProfissionais(ctx);
  // A parte das mulheres ignora o filtro de gênero (com "Mulheres" escolhido, daria sempre 100%): conta todos os ativos do recorte.
  const semGenero = useMemo(() => ctx.genero ? ctx.profissionais.modelo.profissionais.filter(row => noRecorte(row, ctx.greId, { ...filtroDe(ctx), genero: null }) && row.registroEm <= ctx.anchor && situacaoEm(row, ctx.anchor) === 'Ativo') : null, [ctx.genero, ctx.greId, ctx.cidadeId, ctx.modalidade, ctx.anchor, ctx.profissionais.modelo]); // eslint-disable-line react-hooks/exhaustive-deps
  const parteMulheres = semGenero ? (semGenero.length ? semGenero.filter(row => row.genero === 'Feminino').length / semGenero.length * 100 : null) : p.mulheres;
  return <div className="ck-grid ck-grid-pf-registro">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores do registro profissional">
      <Indicador destaque ficha="k-ativos" ctx={ctx} label="Profissionais com registro ativo" serie={series.ativos} value={int(p.ativos.length)} variacao={{ value: change(p.ativos.length, antes), label: 'em relação a um ano antes' }} sub={`${int(p.registrados.length)} já se registraram alguma vez`}
        onOpen={() => abrirProfissionais(ctx, 'Profissionais com registro ativo', p.ativos, 'Profissionais com registro ativo na data escolhida.')} />
      <Indicador ficha="k-fora" ctx={ctx} label="Registro interrompido ou cancelado" serie={series.fora} value={int(p.interrompidos.length + p.cancelados.length)} sub={`${int(p.interrompidos.length)} interrompidos e ${int(p.cancelados.length)} cancelados`}
        onOpen={() => abrirProfissionais(ctx, 'Registro interrompido', p.interrompidos, 'Profissionais com o registro interrompido na data escolhida. Podem voltar a qualquer momento.')} />
      <Indicador ficha="k-adimplencia" ctx={ctx} label="Anuidade em dia" serie={series.adimplencia} value={p.taxaAdimplencia === null ? '—' : pct(p.taxaAdimplencia)} meta={{ atual: p.taxaAdimplencia, alvo: metas.adimplencia }} variacao={{ value: p.taxaAdimplencia === null ? null : p.taxaAdimplencia - metas.adimplencia, kind: 'pp', label: `em relação à meta de ${metas.adimplencia}%` }} sub={`${int(p.inadimplentes.length)} ativos com anuidade atrasada`}
        onOpen={() => abrirProfissionais(ctx, 'Profissionais ativos com anuidade atrasada', p.inadimplentes, 'Profissionais ativos com anuidade vencida na data escolhida.', 'Cobrança por lote, começando pelos que registraram ART recentemente.')} />
      <Indicador ficha="k-mulheres" ctx={ctx} label="Mulheres entre os ativos" serie={series.mulheres} value={parteMulheres === null ? '—' : pct(parteMulheres, 1)} sub={ctx.genero ? `${int(semGenero!.filter(row => row.genero === 'Feminino').length)} de ${int(semGenero!.length)} ativos, sem o filtro de gênero` : `${int(mulheres.length)} profissionais ativas`}
        onOpen={() => abrirProfissionais(ctx, 'Mulheres com registro ativo', mulheres, 'Profissionais ativas na data escolhida.')} />
      <Indicador ficha="k-sessenta" ctx={ctx} label="Ativos com 60 anos ou mais" serie={series.sessenta} value={p.ativos.length ? pct(sessenta.length / p.ativos.length * 100) : '—'} sub={`${int(sessenta.length)} profissionais; a idade típica é ${p.idadeMediana === null ? '—' : int(p.idadeMediana)} anos`}
        onOpen={() => abrirProfissionais(ctx, 'Ativos com 60 anos ou mais', sessenta, 'Profissionais ativos com 60 anos ou mais na data escolhida.')} />
    </section>
    <Bloco ctx={ctx} id="mp" area="mp" title="Mapa por município" question="Cada município é pintado pelo próprio valor no indicador escolhido, em cinco faixas. A lista ao lado traz as GREs em ordem, com o valor de cada uma; passar o mouse numa GRE acende os municípios dela. Clicar num município ou numa GRE abre os profissionais." help="O profissional fica na regional do endereço que ele declara no cadastro. Passe o mouse num município para ver também quantos ativos moram nele. Clique num município ou numa regional da lista para ver os profissionais."
      actions={<label className="ck-select is-compact"><span className="sr-only">Indicador do mapa</span><select value={metrica} onChange={event => setMetrica(event.target.value as MetricaMapa)}>{(Object.keys(metricasMapa) as MetricaMapa[]).map(id => <option key={id} value={id}>{metricasMapa[id].label}</option>)}</select><ChevronDown size={14} /></label>}><MapaProfissionais ctx={ctx} metrica={metrica} /></Bloco>
    <Bloco ctx={ctx} id="tm" area="tm" title="Modalidade, nível e título" question="Cada retângulo grande é uma modalidade, dividida pelos títulos principais e os demais juntos. Só Segurança do Trabalho se divide em níveis (engenheiros, tecnólogos e técnicos): no Crea-SP, técnico e tecnólogo só dessa modalidade. O tamanho é o número de ativos. Clicar numa modalidade ou em outros títulos abre todos os títulos, pelo código do catálogo do Confea; clicar num título abre os profissionais." help="Clique num retângulo para ver os profissionais."><ArvoreModalidade ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="an" area="an" title="Situação e anuidade" question="Todos os que já se registraram, em quatro situações: ativo com a anuidade em dia, ativo com a anuidade atrasada, interrompido e cancelado."><SituacaoAnuidade ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="pi" area="pi" title="Idade e gênero" question="Mulheres à esquerda e homens à direita, por faixa de idade, entre os ativos. Ajuda a prever quando será preciso repor o quadro técnico."><Piramide ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mt" area="mt" title="Idade em cada modalidade" question="A parte dos ativos de cada modalidade em cada faixa de idade. Cada linha soma 100%. Linhas escuras à direita são modalidades com quadro mais velho."><IdadeModalidade ctx={ctx} /></Bloco>
  </div>;
}
