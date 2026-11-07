import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { brl, int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador, avisoVazio } from '../cockpit/ui';
import { AcoesMes, AcoesOrigem, DestinoMultas, MapaFiscalizacao, metricasMapa } from './blocos';
import type { MetricaMapa } from './blocos';
import { useSeriesFiscalizacao } from './series';
import { CaminhoAcoes } from './caminho';

const change = (now: number, before: number) => before > 0 ? (now - before) / before * 100 : null;
const cruzamento = new Set(['Cruzamento Receita (CNAE)', 'Contrato público (PNCP)', 'Cadastro CREA']);

/** Painel de Fiscalização, página 1: quantas ações, onde, de que origem, quantas viram auto e o que acontece com as multas. */
export default function PaginaAcoes({ ctx }: { ctx: CockpitCtx }) {
  const { resumo, tokens, ponte, period } = ctx, [metrica, setMetrica] = useState<MetricaMapa>('acoes'), series = useSeriesFiscalizacao(ctx);
  const entradas = ponte.espontaneas.length + ponte.viaFiscalizacao.length + ponte.retornos.length;
  const semAcao = avisoVazio(!resumo.acoes.length, 'Nenhuma ação');
  const viaCruzamento = resumo.acoes.filter(row => cruzamento.has(row.origem)).length;
  return <div className="ck-grid ck-grid-fs-acoes">
    <section className="ck-cards is-five" style={{ gridArea: 'kpi' }} aria-label="Indicadores das ações de fiscalização">
      <Indicador destaque ficha="k-acoes" ctx={ctx} label="Ações de fiscalização" serie={series.acoes} value={int(resumo.acoes.length)} variacao={{ value: change(resumo.acoes.length, resumo.acoesPrev) }} spark={resumo.mensal.map(row => row.acoes)} cor={tokens.accent}
        sub={`${int(resumo.acoes.length / period)} por mês; ${pct(viaCruzamento / Math.max(1, resumo.acoes.length) * 100)} vieram do cruzamento de dados`} onOpen={() => ctx.open({ kind: 'acoes' })} />
      <Indicador ficha="k-autos" ctx={ctx} label="Autos de infração" serie={series.autos} value={int(resumo.autos.length)} variacao={{ value: change(resumo.autos.length, resumo.autosPrev), goodUp: false }} spark={resumo.mensal.map(row => row.autos.registro + row.autos.rt + row.autos.art)} cor={tokens.bad}
        sub={`${pct(resumo.acoes.filter(row => row.auto).length / Math.max(1, resumo.acoes.length) * 100)} das ações do período viraram auto`} onOpen={() => ctx.open({ kind: 'autos' })} />
      <Indicador ficha="k-multas" ctx={ctx} label="Multas aplicadas" serie={series.multas} value={brl(resumo.aplicada)} variacao={{ value: change(resumo.aplicada, resumo.aplicadaPrev) }}
        sub={`${brl(resumo.multas['Dívida ativa'].valor)} já em dívida ativa`} onOpen={() => ctx.open({ kind: 'multas' })} />
      <Indicador ficha="k-recebidas" ctx={ctx} label="Multas recebidas" serie={series.recebidas} value={brl(resumo.recebida)} sub={`inclui autos antigos; ${resumo.pagaCoorte === null ? '—' : pct(resumo.pagaCoorte)} do aplicado no período já foi pago`} onOpen={() => ctx.open({ kind: 'multas', status: 'Paga' })} />
      <Indicador ficha="k-registros" ctx={ctx} label="Registros que vieram da fiscalização" value={int(ponte.viaFiscalizacao.length)} sub={`${pct(ponte.viaFiscalizacao.length / Math.max(1, entradas) * 100)} das empresas que entraram na base`}
        onOpen={() => ctx.open({ kind: 'empresas', title: 'Registros que vieram da fiscalização', what: 'Empresas que passaram a ter registro ativo no período depois de uma ação de fiscalização por falta de registro.', use: 'Uma coisa veio depois da outra, mas a ação pode não ter sido a causa.', ids: ponte.viaFiscalizacao })} />
    </section>
    <Bloco ctx={ctx} id="mp" area="mp" title="Fiscalização por regional" question="Cada município aparece com o seu limite e a cor da regional a que pertence. Os números no mapa e a lista ao lado são de cada regional, no estado inteiro." help="Escolha o indicador no seletor do bloco. Regional e município, no alto da tela, só aproximam o mapa. Clique numa regional para ver as ações."
      actions={<label className="ck-select is-compact"><span className="sr-only">Indicador do mapa</span><select value={metrica} onChange={event => setMetrica(event.target.value as MetricaMapa)}>{(Object.keys(metricasMapa) as MetricaMapa[]).map(id => <option key={id} value={id}>{metricasMapa[id].label}</option>)}</select><ChevronDown size={14} /></label>}><MapaFiscalizacao ctx={ctx} metrica={metrica} /></Bloco>
    <Bloco ctx={ctx} id="me" vazio={avisoVazio(!resumo.mensal.some(row => row.acoes), 'Nenhuma ação')} area="me" title="Ações, autos e regularizações por mês" question="Nos últimos 24 meses, as barras são as ações de cada mês, com o número em cima. As linhas são os autos de infração e as regularizações do mesmo mês. A faixa clara marca o período escolhido. O número de autos e de regularizações do último mês vai escrito na ponta de cada linha." help="Clique numa barra para ver as ações do mês."><AcoesMes ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ds" vazio={semAcao} area="ds" title="O caminho das ações" question="Como uma linha de metrô: a linha principal vai da ação ao auto de infração, à multa e à dívida ativa. Os ramais verdes descem para as saídas boas: regularizou sem auto, regularizou depois do auto e multa paga." help="O rito segue a Resolução Confea nº 1.008/2004: notificação, auto de infração, defesa, julgamento pela câmara e multa paga ou inscrita em dívida ativa. A empresa pode se regularizar em qualquer etapa. A porcentagem é das ações do período. Clique numa estação para ver as ações."><CaminhoAcoes ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="or" vazio={semAcao} area="or" title="De onde vieram as ações" question="As ações do período pela origem da informação que levou a elas, com a parte que já regularizou." help="O cruzamento com a Receita, os contratos públicos e o cadastro do Crea-SP são as origens que o programa de dados alimenta. Clique numa barra para ver as ações."><AcoesOrigem ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mu" vazio={avisoVazio(!resumo.aplicada, 'Nenhuma multa')} area="mu" title="O que aconteceu com as multas" question="O valor das multas aplicadas no período, pela situação de cada uma na data escolhida: paga, em prazo de defesa, em julgamento, em dívida ativa ou cancelada." help="Valor aplicado não é valor recebido. As multas mais recentes ainda estão no prazo de defesa. Clique numa fatia para ver os autos."><DestinoMultas ctx={ctx} /></Bloco>
  </div>;
}
