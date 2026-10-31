import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { camaraDaEmpresa, camaras, grausVinculo, situacoesFornecedor } from '../painel/analise';
import type { ContratoPublico, GrauVinculo, SituacaoFornecedor } from '../painel/analise';
import { brl, int, money, pct } from '../painel/ui';
import type { CockpitCtx } from './contexto';
import { regrasPendentes, statusAjuda } from './cruzamentos';
import type { Indicio, StatusLigacao } from './cruzamentos';
import { Bloco, linhasEmpresas } from './ui';

/**
 * Aba 4 · Malha fina v1: indícios por regra, com status de ligação (confirmado, candidato, contexto), fonte e versão.
 * A lista é para análise; nenhum indício vira auto de infração sem verificação.
 */
export default function PaginaMalha({ ctx }: { ctx: CockpitCtx }) {
  return <div className="ck-grid ck-grid-malha">
    <Bloco ctx={ctx} id="mf1" area="mf1" title="Indícios por regra" question="Cada regra com o status da ligação entre as bases, a fonte e a versão. Clique numa regra para a lista de empresas." help={`Confirmado: ${statusAjuda.Confirmado} Candidato: ${statusAjuda.Candidato} Contexto: ${statusAjuda.Contexto}`}><Regras ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mf8" area="mf8" title="Contratos públicos técnicos e ART" question="Vínculo de cada contrato do período (PNCP) com ART, em três graus, e quantos tinham chave para a busca." help="Confirmado: a ART cita o número do contrato ou do processo. Candidato: ART da mesma empresa entre 30 dias antes e 60 depois, para revisão. Não identificado: nenhum dos dois; é prioridade para verificar, não prova de que falta ART. A taxa só usa contratos com CNPJ do fornecedor válido (chave para a busca)."><Vinculos ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mf7" area="mf7" title="Fornecedor na data do contrato" question="Registro vigente e quitação da anuidade do estabelecimento contratado, na data de cada contrato técnico." help="Sem quitação, a empresa não obteria a certidão de registro e quitação. A situação é lida na data do contrato, não na data de hoje."><Fornecedor ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mf2" area="mf2" title="CNAE da lista sem registro localizado, por câmara" question="Estabelecimentos ativos na Receita com CNAE da lista do Crea-SP e sem registro ou visto vigente. “Sim” separado de “Passível”." help="CNAE delimita o universo de análise; não prova atividade efetiva nem obrigação. “Passível de obrigação” depende da atividade básica e dos serviços prestados. Câmara aproximada pelo CNAE principal (cenário); em produção, pelo cadastro técnico."><SemRegistro ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mf3" area="mf3" title="Registro ativo com CNPJ inativo" question="Registros ativos no Crea-SP de CNPJ baixado, inapto ou suspenso na Receita: cadastro a sanear e anuidade dificilmente recebida."><CnpjInativo ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mf9" area="mf9" title="Cobertura × emprego em engenharia, por regional" question="Contexto agregado: cobertura do mercado contra a variação do emprego em ocupações de engenharia (RAIS/CAGED, por município e CBO). Tamanho: empresas registradas." help="Emprego é agregado por município, CNAE e CBO e não se liga a CNPJ ou CPF. Linhas tracejadas: médias das regionais."><Quadrante ctx={ctx} /></Bloco>
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
      <thead><tr><th>Regra</th><th>Status</th><th>Empresas</th><th>Sem ação fiscal</th></tr></thead>
      <tbody>{malha.indicios.map(item => { const sem = item.empresas.length - item.comAcao.length;
        return <tr key={item.id} tabIndex={0} onClick={() => abrir(item, false)} onKeyDown={event => { if (event.key === 'Enter') abrir(item, false); }}>
          <td><b>{item.label}</b><small>{item.fonte} · regra {item.versao}</small></td><td><Status status={item.status} /></td>
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
