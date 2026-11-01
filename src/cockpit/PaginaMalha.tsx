import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { camaraDaEmpresa, camaras, grausVinculo, situacoesFornecedor } from '../painel/analise';
import type { ContratoPublico, GrauVinculo, SituacaoFornecedor } from '../painel/analise';
import { brl, data, int, mes, money, pct, short } from '../painel/ui';
import type { CockpitCtx } from './contexto';
import { LIMITE_ART, PRAZO_SUCESSAO, TERMOS_ENGENHARIA, regras, regrasPendentes, statusAjuda } from './cruzamentos';
import type { Indicio, StatusLigacao } from './cruzamentos';
import { Bloco, Parceria, carregando, linhasEmpresas, nomeEmpresa } from './ui';

/**
 * Aba 6 · Malha fina v2: indícios por regra, com status de ligação (confirmado, candidato, contexto), fonte, forma de coleta e
 * versão. Novas na V20: atividade recente com débito, padrão anormal de ART, obra pública sem ART de fiscalização, sucessão de
 * empresas e nome de engenharia sem registro. A lista é para análise; nenhum indício vira auto de infração sem verificação.
 */
export default function PaginaMalha({ ctx }: { ctx: CockpitCtx }) {
  return <div className="ck-grid ck-grid-malha">
    <Bloco ctx={ctx} id="mf1" area="mf1" title="Empresas apontadas por cada regra" question="Cada regra da malha fina, quão segura é a ligação entre as bases, de onde vêm os dados e quantas empresas ela aponta. Clique numa regra para ver as empresas." help={`Confirmado: ${statusAjuda.Confirmado} Candidato: ${statusAjuda.Candidato} Contexto: ${statusAjuda.Contexto}`}><Regras ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mf8" area="mf8" title="Contratos públicos técnicos com e sem ART" question="Para cada contrato técnico do período publicado no PNCP, se foi encontrada a ART correspondente, se há uma ART provável ou se nada foi encontrado." help="A ART é encontrada quando cita o número do contrato. É provável quando a mesma empresa registrou ART entre 30 dias antes e 60 dias depois do contrato. Quando nada aparece, o contrato deve ser verificado, mas isso não prova que falte ART. Só entram contratos com CNPJ válido."><Vinculos ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mf7" area="mf7" title="Situação da empresa na data do contrato" question="Se a empresa contratada tinha registro ativo e anuidade em dia na data de cada contrato técnico." help="Sem anuidade em dia, a empresa não conseguiria a certidão de registro e quitação. A situação é a da data do contrato, não a de hoje."><Fornecedor ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mf2" area="mf2" title="Empresas com atividade de engenharia e sem registro, por câmara" question="Estabelecimentos ativos na Receita com atividade da lista do Crea-SP que não têm registro nem visto. Os de registro obrigatório (“Sim”) aparecem separados dos que dependem de análise (“Passível”)." help="A atividade declarada à Receita delimita quem olhar, mas não prova que a empresa exerce a atividade nem que é obrigada a se registrar. A câmara é estimada pela atividade principal."><SemRegistro ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mf3" area="mf3" title="Registro ativo de empresa fechada na Receita" question="Empresas com registro ativo no Crea-SP cujo CNPJ está baixado, inapto ou suspenso na Receita. É cadastro a corrigir e anuidade que dificilmente será paga."><CnpjInativo ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mf4" area="mf4" title="Profissionais com volume incomum de ARTs" question={`Profissionais que registraram, nos últimos 12 meses, mais de três vezes o número de ARTs do profissional típico (no mínimo ${LIMITE_ART}), para cinco ou mais empresas ou em quatro ou mais regionais.`} help="Volume alto é normal em algumas modalidades e empresas grandes. Antes de qualquer contato, confira se há tempo e área compatíveis (Resolução Confea nº 1.025/2009)."><AutoresAnormais ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mf5" area="mf5" title="Empresa que fecha e outra que abre no lugar" question={`Registro baixado ou cancelado nos últimos 24 meses e, em até ${PRAZO_SUCESSAO} dias, outra empresa aberta no mesmo município com a mesma atividade principal. Se as duas tiveram o mesmo responsável técnico, o caso sobe na fila.`} help="Isso não prova que a nova empresa seja a mesma nem que herde as dívidas da anterior. Essa conclusão depende de análise societária e jurídica."><Sucessoes ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mf6" area="mf6" title="Obras sem ART de fiscalização e empresas com nome de engenharia" question="Obras públicas com ART de execução e sem ART de fiscalização. E empresas ativas sem registro cujo nome contém palavras como “engenharia” ou “construtora”, qualquer que seja a atividade declarada." help="A ART de fiscalização pode estar registrada com outro número, então o primeiro passo é orientar o órgão. O nome mostra como a empresa se apresenta, não prova o que ela faz."><ObrasNomes ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mf9" area="mf9" title="Registro e emprego em engenharia, por regional" question="Compara a parte das empresas de engenharia que está registrada com a variação do emprego formal em ocupações de engenharia, por regional. A bolha maior tem mais empresas registradas." help="O emprego vem somado por município e ocupação e não identifica empresa nem pessoa. As linhas tracejadas são as médias das regionais."><Quadrante ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mh" area="mh" title="Como a malha fina evoluiu nos últimos 12 meses" question="A malha fina refeita com a base como estava no fim de cada um dos 12 meses anteriores: empresas apontadas, empresas com caso confirmado e empresas que já tiveram ação. Abaixo, cada regra no primeiro e no último mês." help="É a mesma conta do seletor de data, repetida mês a mês, sem alterar nenhum valor. A diferença entre meses mostra como os casos mudaram, não o resultado da fiscalização."><HistoricoMalha ctx={ctx} /></Bloco>
  </div>;
}

export const Status = ({ status }: { status: StatusLigacao }) => <span className={`status is-${status.toLowerCase()}`} title={statusAjuda[status]}>{status}</span>;

function Regras({ ctx }: { ctx: CockpitCtx }) {
  const { malha } = ctx, max = Math.max(1, ...malha.indicios.map(row => row.empresas.length));
  const porEmpresa = useMemo(() => { const map = new Map<string, Indicio[]>(); for (const item of malha.indicios) for (const id of item.empresas) map.set(id, [...(map.get(id) ?? []), item]); return map; }, [malha]);
  const abrir = (item: Indicio, semAcao: boolean) => { const acted = new Set(item.comAcao), ids = semAcao ? item.empresas.filter(id => !acted.has(id)) : item.empresas; if (!ids.length) return;
    ctx.open({ kind: 'linhas', eyebrow: `${item.status} · ${item.fonte} · regra ${item.versao}`, title: `${item.label}${semAcao ? ' · sem ação fiscal' : ''}`, what: item.regra, use: `Comece pelas empresas com mais indícios confirmados e sem ação fiscal. Não concluir ${item.naoConcluir.charAt(0).toLowerCase()}${item.naoConcluir.slice(1)}`, listTitle: 'Empresas, mais indícios primeiro',
      rows: linhasEmpresas(ctx, ids, id => { const list = porEmpresa.get(id) ?? [], confirmados = list.filter(row => row.status === 'Confirmado').length;
        return { value: `${list.length} indício${list.length > 1 ? 's' : ''} · ${confirmados} confirmado${confirmados === 1 ? '' : 's'}`, note: list.map(row => `${row.label} (${row.status.toLowerCase()})`).join(' · '), sort: confirmados * 10 + list.length }; }) }); };
  return <div className="stack">
    <p className="kpi-line"><b>{int(malha.confirmadas.length)}</b> empresas com indício confirmado · <b>{int(malha.empresas.length)}</b> com algum indício · <b>{int(malha.multiplos.length)}</b> com dois ou mais · <b>{pct(malha.comAcao.length / Math.max(1, malha.empresas.length) * 100)}</b> já com ação fiscal</p>
    <div className="table-wrap"><table className="regras">
      <thead><tr><th>Regra</th><th>Status</th><th>Coleta</th><th>Empresas</th><th>Sem ação fiscal</th></tr></thead>
      <tbody>{malha.indicios.map(item => { const sem = item.empresas.length - item.comAcao.length;
        return <tr key={item.id} tabIndex={0} onClick={() => abrir(item, false)} onKeyDown={event => { if (event.key === 'Enter') abrir(item, false); }}>
          <td><b>{item.label}{item.parceria && <Parceria id={item.parceria} compacto />}</b><small>{item.fonte} · regra {item.versao}</small></td><td><Status status={item.status} /></td><td><span className={`coleta is-${item.coleta.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}>{item.coleta}</span></td>
          <td><span className="cellbar"><i style={{ width: `${item.empresas.length / max * 100}%` }} /><em>{int(item.empresas.length)}</em></span></td>
          <td><button className="link" onClick={event => { event.stopPropagation(); abrir(item, true); }}>{int(sem)} · {pct(sem / Math.max(1, item.empresas.length) * 100)}</button></td></tr>; })}</tbody>
    </table></div>
    <p className="pendentes">Ainda sem regra no cenário: {regrasPendentes.map(row => `${row.label} (${row.motivo})`).join('; ')}.</p>
  </div>;
}

function Vinculos({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, malha } = ctx, contratos = malha.contratos;
  const cores: Record<GrauVinculo, string> = { 'Confirmado por documento': tokens.good, 'Candidato para revisão': tokens.accent, 'Não identificado': tokens.warn, 'Sem chave para a busca': tokens.line };
  const categorias = useMemo(() => [...new Set(contratos.map(row => row.categoria))].sort(), [contratos]);
  const de = (categoria: string, grau: GrauVinculo) => contratos.filter(row => row.categoria === categoria && row.vinculo === grau);
  const option = useMemo(() => ({
    grid: { top: 44, right: 30, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>${items[0].name}</b><br/>${items.map(item => { const rows = de(items[0].name, item.seriesName); return `${item.marker}${item.seriesName}: ${int(rows.length)} contratos · ${brl(rows.reduce((s, r) => s + r.valor, 0))}`; }).join('<br/>')}` },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
    yAxis: { type: 'category', inverse: true, data: categorias, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: grausVinculo.map((grau, index) => ({ name: grau, type: 'bar', stack: 'v', barWidth: 16, data: categorias.map(categoria => de(categoria, grau).length), itemStyle: { color: cores[grau], borderColor: tokens.surface, borderWidth: 1, borderRadius: index === grausVinculo.length - 1 ? [0, 3, 3, 0] : 0 } })),
  }), [categorias, tokens, contratos]); // eslint-disable-line react-hooks/exhaustive-deps
  const comChave = malha.contratosComChave, confirmados = comChave.filter(row => row.vinculo === 'Confirmado por documento').length, naoId = comChave.filter(row => row.vinculo === 'Não identificado');
  return <div className="stack">
    <p className="kpi-line"><b>{int(comChave.length)}</b> de {int(contratos.length)} contratos com chave para a busca · <b>{pct(confirmados / Math.max(1, comChave.length) * 100)}</b> com vínculo confirmado · <b>{int(naoId.length)}</b> ({brl(naoId.reduce((s, r) => s + r.valor, 0))}) sem ART identificada</p>
    <Chart option={option} tokens={tokens} label="Contratos públicos técnicos por categoria e grau de vínculo com ART" onPick={params => abrirContratos(ctx, de(params.name, params.seriesName), `${params.name} · ${String(params.seriesName).toLowerCase()}`, params.seriesName === 'Não identificado' ? 'Prioridade para verificar, começando pelos de maior valor. Vínculo não identificado não é infração.' : params.seriesName === 'Candidato para revisão' ? 'Confirme se a ART candidata corresponde ao objeto, ao local e ao período do contrato.' : undefined)} />
  </div>;
}

function abrirContratos(ctx: CockpitCtx, rows: ContratoPublico[], title: string, use?: string) {
  if (!rows.length) return;
  const nomes = new Map(ctx.dataset.companies.map(row => [row.id, row.tradeName || row.name])), buyers = new Map(ctx.dataset.buyers.map(row => [row.id, row.name]));
  ctx.open({ kind: 'linhas', title, what: 'Contratos públicos técnicos do período (PNCP), a situação do fornecedor na data do contrato e o vínculo com ART.', use, listTitle: 'Contratos, maior valor primeiro',
    summary: [['Contratos', int(rows.length)], ['Valor', brl(rows.reduce((sum, row) => sum + row.valor, 0))], ['Empresas', int(new Set(rows.map(row => row.companyId)).size)]],
    rows: rows.map(row => ({ key: row.id, companyId: row.companyId, title: nomes.get(row.companyId) ?? row.companyId, subtitle: `${buyers.get(row.buyerId) ?? 'Órgão público'} · ${row.data.split('-').reverse().join('/')}`, value: money(row.valor),
      note: `${row.objeto} · ${row.situacao} · ${row.vinculo}${row.artsDocumento.length ? ` (${row.artsDocumento.join(', ')})` : row.artsCandidatas.length ? ` (${row.artsCandidatas.length} ART candidata${row.artsCandidatas.length > 1 ? 's' : ''})` : ''}`, sortValue: row.valor })) });
}

function Fornecedor({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, malha } = ctx, contratos = malha.contratos;
  const cores: Record<SituacaoFornecedor, string> = { 'Sem registro na data': tokens.bad, 'Registrada, com anuidade vencida': tokens.warn, 'Registrada e quitada': tokens.good };
  const grupos = situacoesFornecedor.map(situacao => ({ situacao, rows: contratos.filter(row => row.situacao === situacao) }));
  const total = contratos.reduce((s, r) => s + r.valor, 0);
  const option = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (item: any) => `<b>${item.name}</b><br/>${brl(item.value)} · ${pct(item.percent)} do valor<br/>${int(grupos[item.dataIndex].rows.length)} contratos` },
    title: { text: brl(total), subtext: 'em contratos técnicos', left: 'center', top: '36%', textStyle: { color: tokens.ink, fontSize: 17, fontWeight: 800, fontFamily: 'Raleway, Lato, sans-serif' }, subtextStyle: { color: tokens.muted, fontSize: 10.5 } },
    series: [{ type: 'pie', radius: ['55%', '80%'], center: ['50%', '50%'], padAngle: 2, itemStyle: { borderRadius: 4, borderColor: tokens.surface, borderWidth: 2 }, label: { show: false },
      data: grupos.map(item => ({ name: item.situacao, value: item.rows.reduce((s, r) => s + r.valor, 0), itemStyle: { color: cores[item.situacao] } })) }],
  }), [grupos, tokens, total]); // eslint-disable-line react-hooks/exhaustive-deps
  const abrir = (situacao: SituacaoFornecedor) => abrirContratos(ctx, grupos.find(item => item.situacao === situacao)?.rows ?? [], `Fornecedor · ${situacao.toLowerCase()}`, situacao === 'Sem registro na data' ? 'Confirme o objeto e a atividade; informe o órgão contratante quando couber.' : undefined);
  return <div className="split">
    <Chart option={option} tokens={tokens} label="Valor de contratos técnicos pela situação do fornecedor na data" onPick={params => abrir(grupos[params.dataIndex]?.situacao)} />
    <ul className="side-list">{grupos.map(item => <li key={item.situacao}><button onClick={() => abrir(item.situacao)}><i style={{ background: cores[item.situacao] }} /><span>{item.situacao}</span><b>{int(item.rows.length)}</b></button></li>)}
      <li className="side-note">Lido na data do contrato. Município do órgão e do fornecedor não indicam o local da obra.</li></ul>
  </div>;
}

function SemRegistro({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, malha } = ctx, camara = camaraDaEmpresa(ctx.dataset), places = new Map(ctx.dataset.establishments.map(row => [row.id, row]));
  const acted = useMemo(() => new Set(ctx.f.alvos.filter(row => row.tipo === 'registro' && !row.regularizedAt && row.acaoId).map(row => row.establishmentId)), [ctx.f]);
  const series = useMemo(() => {
    const por = (ids: string[], filtro: (id: string) => boolean) => camaras.map(name => ids.filter(id => filtro(id) && camara.get(places.get(id)?.companyId ?? '') === name));
    return [
      { name: '“Sim”, já com ação fiscal', color: tokens.good, ids: por(malha.semRegistroSim, id => acted.has(id)) },
      { name: '“Sim”, sem ação fiscal', color: tokens.bad, ids: por(malha.semRegistroSim, id => !acted.has(id)) },
      { name: '“Passível”', color: tokens.heat[1], ids: por(malha.semRegistroPassivel, () => true) },
    ];
  }, [malha, acted, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  const option = useMemo(() => ({
    grid: { top: 24, right: 34, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
    yAxis: { type: 'category', inverse: true, data: camaras, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: series.map((item, index) => ({ name: item.name, type: 'bar', stack: 's', barWidth: 15, data: item.ids.map(ids => ids.length), itemStyle: { color: item.color, borderRadius: index === series.length - 1 ? [0, 3, 3, 0] : 0 } })),
  }), [series, tokens]);
  const sim = malha.semRegistroSim.length, comAcao = series[0].ids.flat().length;
  return <div className="stack">
    <p className="kpi-line"><b>{int(sim)}</b> CNPJs “Sim” sem registro localizado ({pct(comAcao / Math.max(1, sim) * 100)} já com ação) · <b>{int(malha.semRegistroPassivel.length)}</b> “Passível”, à parte</p>
    <Chart option={option} tokens={tokens} label="CNPJs com CNAE da lista sem registro localizado, por câmara e classe" onPick={params => { const item = series[params.seriesIndex], ids = item?.ids[params.dataIndex]; if (!ids?.length) return;
      ctx.open({ kind: 'cnpjs', title: `${camaras[params.dataIndex]} · ${item.name.replace(/[“”]/g, '')}`, what: 'CNPJs ativos na Receita com CNAE da lista do Crea-SP desta câmara e classe, sem registro ou visto vigente no corte.', use: 'Confirme a atividade (contratos, licenças, site) antes de orientar ou notificar. Nenhum auto sai só do CNAE.', ids }); }} />
  </div>;
}

function CnpjInativo({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, malha } = ctx, places = new Map(ctx.dataset.establishments.map(row => [row.id, row]));
  const grupos = (['Baixada', 'Inapta', 'Suspensa'] as const).map(status => ({ status, ids: malha.cnpjInativo.establishmentIds.filter(id => places.get(id)?.rfbStatus === status) }));
  const option = useMemo(() => ({
    grid: { top: 8, right: 34, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>CNPJ ${String(items[0].name).toLowerCase()}</b><br/>${int(items[0].value)} estabelecimentos com registro ativo` },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: grupos.map(item => item.status), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [{ type: 'bar', barWidth: 16, data: grupos.map((item, index) => ({ value: item.ids.length, itemStyle: { color: [tokens.bad, tokens.warn, tokens.heat[1]][index], borderRadius: [0, 4, 4, 0] } })), label: { show: true, position: 'right', color: tokens.ink, fontSize: 11, fontWeight: 700 } }],
  }), [grupos, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="stack">
    <p className="kpi-line"><b>{int(malha.cnpjInativo.registros.length)}</b> registros ativos · <b>{int(malha.cnpjInativo.companies.length)}</b> empresas · <b>{brl(malha.cnpjInativo.vencido)}</b> vencidos dessas empresas</p>
    <Chart option={option} tokens={tokens} label="Registros ativos por situação do CNPJ na Receita" onPick={params => { const item = grupos[params.dataIndex]; if (item?.ids.length) ctx.open({ kind: 'cnpjs', title: `Registro ativo com CNPJ ${item.status.toLowerCase()}`, what: 'Estabelecimentos com registro ativo no CREA-SP cujo CNPJ está nesta situação na Receita Federal.', use: 'Rever o registro: a base fica inflada e a anuidade lançada dificilmente será recebida.', ids: item.ids }); }} />
  </div>;
}

function Quadrante({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = ctx.linhas.filter(row => row.cobertura !== null && row.empregoVar !== null);
  const option = useMemo(() => {
    if (!rows.length) return {};
    const meanX = rows.reduce((sum, row) => sum + row.cobertura!, 0) / rows.length, meanY = rows.reduce((sum, row) => sum + row.empregoVar!, 0) / rows.length;
    const xs = rows.map(row => row.cobertura!), ys = rows.map(row => row.empregoVar!);
    const zone = (x: number, y: number) => x < meanX && y >= meanY ? tokens.bad : x >= meanX && y >= meanY ? tokens.good : x < meanX ? tokens.accent : tokens.blue;
    const canto = (text: string, side: 'left' | 'right', vertical: 'top' | 'bottom') => ({ type: 'text', [side]: side === 'left' ? 54 : 26, [vertical]: vertical === 'top' ? 10 : 46, style: { text, fill: tokens.muted, fontSize: 10, fontWeight: 700 } });
    return {
      grid: { top: 12, right: 22, bottom: 34, left: 8, containLabel: true },
      graphic: [canto('↖ MERCADO CRESCE, REGISTRO NÃO ACOMPANHA', 'left', 'top'), canto('CONSOLIDADO ↗', 'right', 'top'), canto('↙ MONITORAR', 'left', 'bottom'), canto('MERCADO EM AJUSTE ↘', 'right', 'bottom')],
      tooltip: { formatter: (item: any) => `<b>${item.data.name}</b><br/>Cobertura: ${pct(item.value[0], 1)}<br/>Emprego em engenharia: ${item.value[1] >= 0 ? '+' : ''}${pct(item.value[1], 1)}<br/>Empresas registradas: ${int(item.value[2])}` },
      xAxis: { type: 'value', name: 'cobertura do mercado (%)', nameLocation: 'middle', nameGap: 22, nameTextStyle: { color: tokens.muted, fontSize: 10 }, min: Math.floor((Math.min(...xs) - 2) / 5) * 5, max: Math.ceil((Math.max(...xs) + 2) / 5) * 5, splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
      yAxis: { type: 'value', min: Math.floor(Math.min(...ys) - 1), max: Math.ceil(Math.max(...ys) + 1), splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: '{value}%' } },
      series: [{ type: 'scatter', data: rows.map(row => ({ name: row.curto, id: row.id, value: [row.cobertura, row.empregoVar, row.base], itemStyle: { color: zone(row.cobertura!, row.empregoVar!), opacity: 0.88, borderColor: tokens.surface, borderWidth: 1.5 } })),
        symbolSize: (value: number[]) => Math.max(12, Math.sqrt(value[2]) * 2.2), label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (item: any) => item.data.name }, labelLayout: { hideOverlap: true },
        markLine: { silent: true, symbol: 'none', lineStyle: { color: tokens.muted, type: 'dashed', width: 1 }, label: { show: false }, data: [{ xAxis: meanX }, { yAxis: meanY }] } }],
    };
  }, [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Chart option={option} tokens={tokens} label="Cobertura do registro contra variação do emprego em engenharia por regional" onPick={item => item.data?.id && ctx.open({ kind: 'gre', id: item.data.id })} />;
}

function AutoresAnormais({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, malha } = ctx, rows = malha.autoresAnormais.slice(0, 12);
  const option = useMemo(() => ({
    grid: { top: 4, right: 110, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.nome}</b><br/>${int(row.arts)} ARTs em 12 meses · ${int(row.empresas)} empresas · ${int(row.regionais)} regionais<br/><span style="opacity:.75">mediana dos autores: ${int(malha.medianaArts)}</span>`; } },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: rows.map(row => row.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10, width: 120, overflow: 'truncate' } },
    series: [{ type: 'bar', barWidth: 10, data: rows.map(row => row.arts), itemStyle: { color: tokens.accent, borderRadius: [0, 3, 3, 0] }, markLine: { silent: true, symbol: 'none', lineStyle: { color: tokens.muted, type: 'dashed' }, label: { formatter: `mediana ${int(malha.medianaArts)}`, color: tokens.muted, fontSize: 9.5, position: 'insideEndTop' }, data: [{ xAxis: malha.medianaArts }] },
      label: { show: true, position: 'right', color: tokens.ink, fontSize: 9.5, formatter: (params: any) => { const row = rows[params.dataIndex]; return `${int(row.arts)} · ${int(row.empresas)} emp. · ${int(row.regionais)} GRE`; } } }],
  }), [rows, tokens, malha.medianaArts]);
  const indicio = malha.indicios.find(row => row.id === 'artAnormal');
  return <div className="stack">
    <p className="kpi-line"><b>{int(malha.autoresAnormais.length)}</b> profissionais no padrão · <b>{int(indicio?.empresas.length ?? 0)}</b> empresas com ARTs desses autores · mediana de <b>{int(malha.medianaArts)}</b> ARTs por autor em 12 meses</p>
    {rows.length ? <Chart option={option} tokens={tokens} label="Autores com padrão anormal de ART" onPick={() => { if (indicio?.empresas.length) ctx.open({ kind: 'empresas', title: 'Empresas com ART de autor em padrão anormal', what: 'Empresas das ARTs dos profissionais que satisfazem a regra no período.', use: 'Candidato para revisão: conferir compatibilidade de tempo e área antes de qualquer tratativa.', ids: indicio.empresas }); }} /> : <div className="empty-note">Nenhum profissional no padrão neste recorte.</div>}
  </div>;
}

function Sucessoes({ ctx }: { ctx: CockpitCtx }) {
  const { malha } = ctx, rows = malha.sucessoes, cities = new Map(ctx.dataset.cities.map(row => [row.id, row.name]));
  const comRt = rows.filter(row => row.rtComum).length, empresas = new Set(rows.map(row => row.nova)).size;
  const abrir = () => { if (!rows.length) return;
    ctx.open({ kind: 'linhas', title: 'Sucessão de empresas após baixa do registro', what: 'Pares de empresas: registro baixado ou cancelado e empresa aberta no mesmo município, com o mesmo CNAE principal, em até 180 dias.', use: 'Candidato para revisão: a ligação depende de análise societária e jurídica. Pares com RT em comum primeiro.', listTitle: 'Pares, RT em comum primeiro',
      summary: [['Pares', int(rows.length)], ['Empresas novas', int(empresas)], ['Com RT em comum', int(comRt)]],
      rows: rows.map((row, index) => ({ key: `${row.anterior}-${row.nova}-${index}`, companyId: row.nova, title: nomeEmpresa(ctx, row.nova), subtitle: `${cities.get(row.cityId) ?? ''} · CNAE ${row.cnae} · aberta em ${data(row.abertaEm)}`, value: row.rtComum ? 'RT em comum' : 'mesmo município e CNAE', note: `sucede ${nomeEmpresa(ctx, row.anterior)} (baixa em ${data(row.baixaEm)})`, sortValue: row.rtComum ? 1 : 0 })) }); };
  const porGre = useMemo(() => { const gre = new Map(ctx.dataset.establishments.filter(row => row.branch === 'Matriz').map(row => [row.companyId, row.greId])), nomes = new Map(ctx.dataset.gres.map(row => [row.id, short(row.name)]));
    const count = new Map<string, number>(); for (const row of rows) { const id = gre.get(row.nova) ?? '—'; count.set(id, (count.get(id) ?? 0) + 1); }
    return [...count].map(([id, n]) => ({ nome: nomes.get(id) ?? id, n })).sort((a, b) => b.n - a.n); }, [rows, ctx.dataset]);
  const { tokens } = ctx;
  const option = useMemo(() => ({
    grid: { top: 4, right: 40, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>${items[0].name}</b><br/>${int(items[0].value)} pares candidatos` },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: porGre.map(row => row.nome), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10, interval: 0 } },
    series: [{ type: 'bar', barWidth: 9, data: porGre.map(row => row.n), itemStyle: { color: tokens.heat[2], borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 10 } }],
  }), [porGre, tokens]);
  return <div className="stack">
    <p className="kpi-line"><b>{int(rows.length)}</b> pares candidatos · <b>{int(empresas)}</b> empresas novas · <b>{int(comRt)}</b> com RT em comum · <button className="link" onClick={abrir}>ver os pares</button></p>
    {rows.length ? <Chart option={option} tokens={tokens} label="Pares candidatos de sucessão por regional da empresa nova" onPick={abrir} /> : <div className="empty-note">Nenhum par candidato neste recorte.</div>}
  </div>;
}

function ObrasNomes({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, malha } = ctx, obras = malha.obrasSemFiscalizacao, nomes = malha.nomesSemRegistro;
  const places = new Map(ctx.dataset.establishments.map(row => [row.id, row]));
  const porTermo = useMemo(() => { const companies = new Map(ctx.dataset.companies.map(row => [row.id, row])), count = new Map<string, number>();
    for (const id of nomes) { const company = companies.get(places.get(id)?.companyId ?? ''), texto = `${company?.name ?? ''} ${company?.tradeName ?? ''}`, termo = texto.match(TERMOS_ENGENHARIA)?.[0].toLowerCase() ?? 'outro'; count.set(termo, (count.get(termo) ?? 0) + 1); }
    return [...count].map(([termo, n]) => ({ termo, n })).sort((a, b) => b.n - a.n); }, [nomes, ctx.dataset]); // eslint-disable-line react-hooks/exhaustive-deps
  const option = useMemo(() => ({
    grid: { top: 4, right: 40, bottom: 2, left: 2, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>“${items[0].name}”</b> no nome<br/>${int(items[0].value)} CNPJs ativos sem registro` },
    xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: porTermo.map(row => row.termo), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5 } },
    series: [{ type: 'bar', barWidth: 12, data: porTermo.map(row => row.n), itemStyle: { color: tokens.warn, borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 10 } }],
  }), [porTermo, tokens]);
  return <div className="split">
    <div className="stack">
      <p className="kpi-line"><b>{int(obras.length)}</b> obras com ART de execução e sem ART de fiscalização, de <b>{int(malha.obrasComExecucao.length)}</b> com execução identificada ({brl(obras.reduce((sum, row) => sum + row.valor, 0))}) · <button className="link" onClick={() => abrirContratos(ctx, obras, 'Obras públicas sem ART de fiscalização', 'Orientar o órgão contratante sobre a ART de fiscalização antes de qualquer notificação. A ART pode estar sob outra chave.')}>ver as obras</button></p>
      <p className="kpi-line"><b>{int(nomes.length)}</b> CNPJs ativos sem registro com termo de engenharia no nome, por termo:</p>
      <Chart option={option} tokens={tokens} label="CNPJs sem registro com termo de engenharia no nome, por termo" onPick={() => { if (nomes.length) ctx.open({ kind: 'cnpjs', title: 'Nome de engenharia sem registro', what: 'Estabelecimentos ativos na Receita, sem registro ou visto vigente, cuja razão social ou nome fantasia contém termo de engenharia.', use: 'Candidato: confirmar a atividade antes de orientar. Em produção, o classificador de nomes passa por validação humana.', ids: nomes }); }} />
    </div>
    <ul className="side-list" aria-label="Obras sem ART de fiscalização">{obras.slice(0, 6).map(row => <li key={row.id}><span className="side-row"><span>{nomeEmpresa(ctx, row.companyId)}</span><b>{brl(row.valor)}</b><small>{row.objeto} · {data(row.data)}</small></span></li>)}
      <li className="side-note">Maiores obras sem ART de fiscalização. Lido na data de referência.</li></ul>
  </div>;
}

/* ---------- V21 · indícios por data de referência ---------- */
function HistoricoMalha({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, h = ctx.historico, pontos = h.pontos, regrasAtivas = regras;
  const option = useMemo(() => pontos.length ? {
    grid: { top: 24, right: 8, bottom: 2, left: 2, containLabel: true }, legend: { top: 0, left: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: tokens.muted, fontSize: 10 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: pontos.map(p => mes(p.data.slice(0, 7))), axisLabel: { color: tokens.muted, fontSize: 10 }, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    series: [
      { type: 'line', name: 'Empresas com indício', data: pontos.map(p => p.comIndicio), symbol: 'circle', symbolSize: 5, lineStyle: { color: tokens.blue, width: 2 }, itemStyle: { color: tokens.blue } },
      { type: 'line', name: 'Confirmadas', data: pontos.map(p => p.confirmadas), symbol: 'circle', symbolSize: 5, lineStyle: { color: tokens.warn, width: 2 }, itemStyle: { color: tokens.warn } },
      { type: 'line', name: 'Com ação fiscal', data: pontos.map(p => p.comAcao), symbol: 'circle', symbolSize: 5, lineStyle: { color: tokens.good, width: 2 }, itemStyle: { color: tokens.good } },
    ],
  } : {}, [pontos, tokens]);
  const primeiro = pontos[0], ultimo = pontos[pontos.length - 1];
  return <div className="split is-wide">
    <div className="stack">
      <p className="kpi-line">{h.completo ? <><b>{int(pontos.length)}</b> datas, de {data(h.datas[0])} a {data(h.datas[h.datas.length - 1])}</> : <>Calculando <b>{int(pontos.length)}</b> de {int(h.datas.length)} datas…</>} · regional aplicada; a câmara não se aplica ao histórico</p>
      {pontos.length ? <Chart option={option} tokens={tokens} label="Empresas com indício, confirmadas e com ação, por data de referência" /> : carregando}
    </div>
    <ul className="side-list" aria-label="Regras na primeira e na última data">
      {primeiro && ultimo ? regrasAtivas.map(regra => { const a = primeiro.porRegra[regra.id] ?? 0, b = ultimo.porRegra[regra.id] ?? 0; return <li key={regra.id}><button disabled><i style={{ background: b > a ? tokens.warn : b < a ? tokens.good : tokens.muted }} /><span><small>{regra.label}</small></span><b>{int(a)} → {int(b)}</b></button></li>; }) : <li className="side-note">Aguardando o primeiro ponto…</li>}
      <li className="side-note">Primeira → última data do histórico, por regra.</li>
    </ul>
  </div>;
}
