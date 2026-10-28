import { useMemo } from 'react';
import { Chart } from '../painel/chart';
import { camaraDaEmpresa, camaras, mercadoPorCamara, situacoesFornecedor } from '../painel/analise';
import type { SituacaoFornecedor } from '../painel/analise';
import { brl, int, money, pct } from '../painel/ui';
import type { CockpitCtx } from './contexto';
import { piso, situacoesDiretoria } from './cruzamentos';
import type { SituacaoDiretoria, Vinculo } from './cruzamentos';
import { Bloco, linhasEmpresas } from './ui';

/** Aba 4 · Malha fina: indícios de irregularidade por cruzamento do cadastro com Receita, quadro societário, RAIS e contratos públicos. */
export default function PaginaMalha({ ctx }: { ctx: CockpitCtx }) {
  return <div className="ck-grid ck-grid-malha">
    <Bloco ctx={ctx} id="mf1" area="mf1" title="Empresas com indício, por cruzamento" question="Quantas empresas cada cruzamento aponta e quantas já tiveram ação fiscal. Clique para a lista."><Indicios ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mf8" area="mf8" title="Contratos públicos de engenharia e situação do fornecedor" question="Contratos do período (PNCP) pela situação da empresa na data: registro, quitação da anuidade e ART." help="Sem quitação de anuidade, a empresa não obteria a certidão de registro e quitação exigida em licitações. ART considerada entre 30 dias antes e 60 dias depois do contrato (Lei 6.496/77)."><Contratos ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mf2" area="mf2" title="CNAE de engenharia sem registro" question="CNPJs ativos na Receita com atividade de engenharia e sem registro no CREA-SP (art. 59 da Lei 5.194/66), por câmara." help="Cruzamento dos dados abertos do CNPJ (situação cadastral e CNAE) com o cadastro de registros. CNAE indica, mas não prova, a atividade: confirmar antes de autuar."><SemRegistro ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mf4" area="mf4" title="Nome de engenharia sem diretoria registrada" question="Empresas com “engenharia” ou “agronomia” no nome e a composição da diretoria pelo registro no CREA (art. 5º da Lei 5.194/66)." help="A lei só permite essas palavras na denominação quando a maioria da diretoria é de profissionais registrados. Cruzamento do Quadro de Sócios e Administradores (QSA) da Receita com o cadastro de profissionais por nome e CPF parcial. Camada demonstrativa."><Diretorias ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mf5" area="mf5" title="Engenheiros empregados abaixo do piso" question={`Salário dos vínculos em CBO de engenheiro em relação ao piso da jornada (8 h: ${money(piso.exigivel8h)}).`} help={`Lei 4.950-A/66: 6 h = 6 × R$ 1.212; 8 h = 8,5 × R$ 1.212 (base congelada pelo STF, ADPFs 53, 149 e 171, 2022). Leitura Confea com o salário mínimo vigente: ${money(piso.confea8h)} em 8 h. Fonte em produção: RAIS identificada ou eSocial, por acordo com o MTE (o dado público não traz CNPJ). Camada demonstrativa.`}><Piso ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mf6" area="mf6" title="Engenheiros empregados e registro" question="Empresas sem registro que empregam engenheiros, e empresas com empregado em cargo de engenheiro sem registro ativo, por câmara." help="Vínculo em CBO de engenheiro indica atividade de engenharia. Empregado nessa ocupação sem registro ativo é indício de exercício ilegal da profissão. Fonte em produção: RAIS identificada ou eSocial. Camada demonstrativa."><EmpregoRegistro ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mf3" area="mf3" title="Registro ativo com CNPJ inativo" question="Registros ativos no CREA-SP de CNPJ baixado, inapto ou suspenso na Receita: cadastro a sanear e anuidade dificilmente recebida."><CnpjInativo ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mf9" area="mf9" title="Cobertura do registro × emprego em engenharia, por regional" question="Cobertura do mercado (eixo horizontal) contra a variação do emprego em ocupações de engenharia (RAIS/CAGED). Tamanho: empresas registradas." help="Linhas tracejadas: médias das regionais. Emprego crescendo com cobertura baixa (canto superior esquerdo) indica mercado crescendo sem o registro acompanhar."><Quadrante ctx={ctx} /></Bloco>
  </div>;
}

function Indicios({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, malha } = ctx, rows = [...malha.indicios].sort((a, b) => b.empresas.length - a.empresas.length);
  const porEmpresa = useMemo(() => { const map = new Map<string, string[]>(); for (const item of malha.indicios) for (const id of item.empresas) map.set(id, [...(map.get(id) ?? []), item.label]); return map; }, [malha]);
  const option = useMemo(() => ({
    grid: { top: 24, right: 40, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const row = rows[items[0].dataIndex]; return `<b>${row.label}</b><br/>${int(row.empresas.length)} empresas · ${int(row.comAcao.length)} já com ação fiscal (${pct(row.comAcao.length / Math.max(1, row.empresas.length) * 100)})`; } },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => row.label), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10.5, width: 190, overflow: 'break' } },
    series: [
      { name: 'Já com ação fiscal', type: 'bar', stack: 'i', barWidth: 13, data: rows.map(row => row.comAcao.length), itemStyle: { color: tokens.good } },
      { name: 'Sem ação fiscal', type: 'bar', stack: 'i', barWidth: 13, data: rows.map(row => row.empresas.length - row.comAcao.length), itemStyle: { color: tokens.warn, borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (params: any) => int(rows[params.dataIndex].empresas.length) } },
    ],
  }), [rows, tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="stack">
    <p className="kpi-line"><b>{int(malha.empresas.length)}</b> empresas com ao menos um indício · <b>{int(malha.multiplos.length)}</b> com dois ou mais · <b>{pct(malha.comAcao.length / Math.max(1, malha.empresas.length) * 100)}</b> já com ação fiscal</p>
    <Chart option={option} tokens={tokens} label="Empresas por indício de irregularidade" onPick={params => { const row = rows[params.dataIndex]; if (!row) return;
      const acted = new Set(row.comAcao), ids = params.seriesIndex === 0 ? row.comAcao : row.empresas.filter(id => !acted.has(id));
      ctx.open({ kind: 'linhas', title: `${row.label} · ${params.seriesIndex === 0 ? 'já com ação fiscal' : 'sem ação fiscal'}`, what: 'Empresas apontadas por este cruzamento de bases. A coluna à direita mostra quantos indícios cada empresa acumula.', use: 'Comece pelas empresas com mais indícios e sem ação fiscal.', listTitle: 'Empresas, mais indícios primeiro',
        rows: linhasEmpresas(ctx, ids, id => { const list = porEmpresa.get(id) ?? []; return { value: `${list.length} indício${list.length > 1 ? 's' : ''}`, note: list.join(' · '), sort: list.length }; }) }); }} />
  </div>;
}

function Contratos({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, malha } = ctx, contratos = malha.contratos;
  const cores: Record<SituacaoFornecedor, string> = { 'Sem registro na data': tokens.bad, 'Registrada, com anuidade vencida': tokens.warn, 'Registrada, sem ART em 60 dias': tokens.accent, 'Regular: registro, quitação e ART': tokens.good };
  const categorias = useMemo(() => [...new Set(contratos.map(row => row.categoria))].sort((a, b) => contratos.filter(row => row.categoria === b).reduce((s, r) => s + r.valor, 0) - contratos.filter(row => row.categoria === a).reduce((s, r) => s + r.valor, 0)), [contratos]);
  const soma = (categoria: string, situacao: SituacaoFornecedor) => contratos.filter(row => row.categoria === categoria && row.situacao === situacao);
  const option = useMemo(() => ({
    grid: { top: 44, right: 10, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => `<b>${items[0].name}</b><br/>${items.map(item => { const rows = soma(items[0].name, item.seriesName); return `${item.marker}${item.seriesName}: ${brl(item.value)} · ${int(rows.length)} contratos`; }).join('<br/>')}` },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted, formatter: (value: number) => brl(value) } },
    yAxis: { type: 'category', inverse: true, data: categorias, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: situacoesFornecedor.map((situacao, index) => ({ name: situacao, type: 'bar', stack: 'c', barWidth: 16, data: categorias.map(categoria => soma(categoria, situacao).reduce((sum, row) => sum + row.valor, 0)), itemStyle: { color: cores[situacao], borderColor: tokens.surface, borderWidth: 1, borderRadius: index === situacoesFornecedor.length - 1 ? [0, 3, 3, 0] : 0 } })),
  }), [categorias, tokens, contratos]); // eslint-disable-line react-hooks/exhaustive-deps
  const semRegistro = contratos.filter(row => row.situacao === 'Sem registro na data'), irregular = malha.contratosIrregulares;
  return <div className="stack">
    <p className="kpi-line"><b>{brl(semRegistro.reduce((sum, row) => sum + row.valor, 0))}</b> com fornecedor sem registro · <b>{int(irregular.length)}</b> de {int(contratos.length)} contratos com alguma pendência</p>
    <Chart option={option} tokens={tokens} label="Valor de contratos públicos de engenharia por categoria e situação do fornecedor" onPick={params => { const rows = soma(params.name, params.seriesName); if (!rows.length) return;
      const nomes = new Map(ctx.dataset.companies.map(row => [row.id, row.tradeName || row.name])), buyers = new Map(ctx.dataset.buyers.map(row => [row.id, row.name]));
      ctx.open({ kind: 'linhas', title: `${params.name} · ${String(params.seriesName).toLowerCase()}`, what: 'Contratos públicos de engenharia do período (PNCP) e a situação da empresa contratada na data do contrato.', use: params.seriesName === 'Regular: registro, quitação e ART' ? undefined : 'Contrato público é prova documental: notifique a empresa e informe o órgão contratante quando couber.', listTitle: 'Contratos, maior valor primeiro',
        summary: [['Contratos', int(rows.length)], ['Valor', brl(rows.reduce((sum, row) => sum + row.valor, 0))], ['Empresas', int(new Set(rows.map(row => row.companyId)).size)]],
        rows: rows.map(row => ({ key: row.id, companyId: row.companyId, title: nomes.get(row.companyId) ?? row.companyId, subtitle: `${buyers.get(row.buyerId) ?? 'Órgão público'} · ${row.data.split('-').reverse().join('/')}`, value: money(row.valor), note: `${row.objeto} · ${row.situacao}`, sortValue: row.valor })) }); }} />
  </div>;
}

function SemRegistro({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, rows = useMemo(() => mercadoPorCamara(ctx.scope, ctx.model, ctx.f), [ctx.scope, ctx.model, ctx.f]);
  const comAcao = rows.reduce((sum, row) => sum + row.partes['Sem registro, com ação'].length, 0), total = comAcao + rows.reduce((sum, row) => sum + row.partes['Sem registro, sem ação'].length, 0);
  const option = useMemo(() => ({
    grid: { top: 24, right: 34, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
    yAxis: { type: 'category', inverse: true, data: rows.map(row => row.camara), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: [
      { name: 'Já com ação fiscal', type: 'bar', stack: 's', barWidth: 15, data: rows.map(row => row.partes['Sem registro, com ação'].length), itemStyle: { color: tokens.good } },
      { name: 'Sem ação fiscal', type: 'bar', stack: 's', barWidth: 15, data: rows.map(row => row.partes['Sem registro, sem ação'].length), itemStyle: { color: tokens.bad, borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 10, formatter: (params: any) => int(rows[params.dataIndex].partes['Sem registro, com ação'].length + rows[params.dataIndex].partes['Sem registro, sem ação'].length) } },
    ],
  }), [rows, tokens]);
  return <div className="stack">
    <p className="kpi-line"><b>{int(total)}</b> CNPJs sem registro · <b>{pct(comAcao / Math.max(1, total) * 100)}</b> já com ação fiscal</p>
    <Chart option={option} tokens={tokens} label="CNPJs de engenharia sem registro por câmara" onPick={params => { const row = rows[params.dataIndex]; if (!row) return; const segment = params.seriesIndex === 0 ? 'Sem registro, com ação' : 'Sem registro, sem ação';
      ctx.open({ kind: 'cnpjs', title: `${row.camara} · ${params.seriesIndex === 0 ? 'sem registro, já com ação fiscal' : 'sem registro e sem ação fiscal'}`, what: 'CNPJs ativos na Receita com CNAE de engenharia desta câmara, sem registro ativo no CREA-SP.', use: 'Confirme a atividade (contratos, RAIS, site) antes de notificar.', ids: row.partes[segment], segmento: segment }); }} />
  </div>;
}

function Diretorias({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, malha } = ctx, cores: Record<SituacaoDiretoria, string> = { 'Maioria com registro ativo': tokens.good, 'Metade ou menos com registro ativo': tokens.warn, 'Nenhum diretor com registro ativo': tokens.bad };
  const grupos = situacoesDiretoria.map(situacao => ({ situacao, rows: malha.diretorias.filter(row => row.situacao === situacao) }));
  const total = malha.diretorias.length, irregulares = total - grupos[0].rows.length;
  const option = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (item: any) => `<b>${item.name}</b><br/>${int(item.value)} empresas · ${pct(item.percent)}` },
    title: { text: int(total), subtext: 'com o termo no nome', left: 'center', top: '36%', textStyle: { color: tokens.ink, fontSize: 19, fontWeight: 800, fontFamily: 'Raleway, Lato, sans-serif' }, subtextStyle: { color: tokens.muted, fontSize: 10.5 } },
    series: [{ type: 'pie', radius: ['55%', '80%'], center: ['50%', '50%'], padAngle: 2, itemStyle: { borderRadius: 4, borderColor: tokens.surface, borderWidth: 2 }, label: { show: false }, data: grupos.map(item => ({ name: item.situacao, value: item.rows.length, itemStyle: { color: cores[item.situacao] } })) }],
  }), [grupos, tokens, total]); // eslint-disable-line react-hooks/exhaustive-deps
  const abrir = (situacao: SituacaoDiretoria) => { const rows = grupos.find(item => item.situacao === situacao)?.rows ?? []; if (!rows.length) return;
    const byId = new Map(rows.map(row => [row.companyId, row]));
    ctx.open({ kind: 'linhas', title: `Diretoria · ${situacao.toLowerCase()}`, what: 'Empresas com “engenharia” ou “agronomia” na razão social e a situação, no CREA, de cada administrador do quadro societário (QSA).', use: situacao === 'Maioria com registro ativo' ? undefined : 'Notifique para adequar a denominação ou a composição da diretoria (art. 5º da Lei 5.194/66).', listTitle: 'Empresas, menos diretores registrados primeiro',
      rows: linhasEmpresas(ctx, rows.map(row => row.companyId), id => { const row = byId.get(id)!; return { value: `${row.ativos} de ${row.diretores.length} com registro ativo`, note: row.diretores.map(item => `${item.nome} (${item.papel.toLowerCase()}, ${item.situacao.toLowerCase()})`).join(' · '), sort: row.diretores.length - row.ativos }; }) }); };
  return <div className="split">
    <Chart option={option} tokens={tokens} label="Empresas com termo técnico no nome pela composição da diretoria" onPick={params => abrir(grupos[params.dataIndex]?.situacao)} />
    <ul className="side-list">{grupos.map(item => <li key={item.situacao}><button onClick={() => abrir(item.situacao)}><i style={{ background: cores[item.situacao] }} /><span>{item.situacao}</span><b>{int(item.rows.length)}</b></button></li>)}
      <li className="side-note"><b>{int(irregulares)}</b> empresas ({pct(irregulares / Math.max(1, total) * 100)}) sem maioria de diretores registrados</li></ul>
  </div>;
}

const faixasPiso: [string, number][] = [['menos de 70%', 0.7], ['70 a 85%', 0.85], ['85 a 100%', 1], ['100 a 115%', 1.15], ['115 a 130%', 1.3], ['130% ou mais', Infinity]];
function Piso({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, malha } = ctx;
  const faixas = useMemo(() => faixasPiso.map(([nome], index) => ({ nome, vinculos: malha.vinculos.filter(row => { const razao = row.salario / row.piso; return razao < faixasPiso[index][1] && (index === 0 || razao >= faixasPiso[index - 1][1]); }) })), [malha]);
  const empresas = new Set(malha.abaixoPiso.map(row => row.companyId)).size;
  const option = useMemo(() => ({
    grid: { top: 12, right: 6, bottom: 24, left: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: any[]) => { const item = faixas[items[0].dataIndex]; return `<b>Salário ${item.nome} do piso</b><br/>${int(item.vinculos.length)} vínculos em ${int(new Set(item.vinculos.map(row => row.companyId)).size)} empresas`; } },
    xAxis: { type: 'category', data: faixas.map(item => item.nome), name: 'salário em relação ao piso da jornada', nameLocation: 'middle', nameGap: 22, nameTextStyle: { color: tokens.muted, fontSize: 10 }, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: tokens.muted, fontSize: 10, interval: 0 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
    series: [{ type: 'bar', barWidth: '66%', data: faixas.map((item, index) => ({ value: item.vinculos.length, itemStyle: { borderRadius: [4, 4, 0, 0], color: index < 3 ? tokens.bad : tokens.blue } })), label: { show: true, position: 'top', color: tokens.ink, fontSize: 10, formatter: (params: any) => int(params.value) } }],
  }), [faixas, tokens]);
  const abrir = (vinculos: Vinculo[], titulo: string) => { if (!vinculos.length) return;
    const porEmpresa = new Map<string, Vinculo[]>(); for (const row of vinculos) porEmpresa.set(row.companyId, [...(porEmpresa.get(row.companyId) ?? []), row]);
    ctx.open({ kind: 'linhas', title: titulo, what: 'Vínculos de emprego em CBO de engenheiro e o salário em relação ao piso da jornada (Lei 4.950-A/66).', use: 'Oriente a empresa sobre o piso e, se persistir, encaminhe ao Ministério do Trabalho ou ao Ministério Público do Trabalho.', listTitle: 'Empresas, menor salário relativo primeiro',
      rows: linhasEmpresas(ctx, [...porEmpresa.keys()], id => { const rows = porEmpresa.get(id)!, menor = rows.reduce((min, row) => row.salario / row.piso < min.salario / min.piso ? row : min, rows[0]);
        return { value: `menor: ${money(menor.salario)} (${pct(menor.salario / menor.piso * 100)} do piso)`, note: `${rows.length} vínculo${rows.length > 1 ? 's' : ''} · ${[...new Set(rows.map(row => row.ocupacao))].join(', ')} · ${menor.horas} h/semana`, sort: 1 - menor.salario / menor.piso }; }) }); };
  return <div className="stack">
    <p className="kpi-line"><b>{int(malha.abaixoPiso.length)}</b> vínculos abaixo do piso ({pct(malha.abaixoPiso.length / Math.max(1, malha.vinculos.length) * 100)}) em <b>{int(empresas)}</b> empresas · <button className="link" onClick={() => abrir(malha.abaixoPiso, 'Engenheiros empregados abaixo do piso')}>ver empresas</button></p>
    <Chart option={option} tokens={tokens} label="Vínculos de engenheiros pela relação entre salário e piso" onPick={params => { const item = faixas[params.dataIndex]; if (item) abrir(item.vinculos, `Salário ${item.nome} do piso`); }} />
  </div>;
}

function EmpregoRegistro({ ctx }: { ctx: CockpitCtx }) {
  const { tokens, malha } = ctx, camara = camaraDaEmpresa(ctx.dataset);
  const semRegistroEngenheiro = useMemo(() => [...new Set(malha.engenheirosSemRegistro.map(row => row.companyId))], [malha]);
  const series = [{ name: 'Sem registro, emprega engenheiros', ids: malha.empregaSemRegistro, color: tokens.bad }, { name: 'Engenheiro empregado sem registro ativo', ids: semRegistroEngenheiro, color: tokens.warn }];
  const option = useMemo(() => ({
    grid: { top: 24, right: 30, bottom: 2, left: 2, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: tokens.muted, fontSize: 10.5 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: tokens.line, type: 'dashed' } }, axisLabel: { color: tokens.muted } },
    yAxis: { type: 'category', inverse: true, data: camaras, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 11 } },
    series: series.map(item => ({ name: item.name, type: 'bar', barWidth: 9, barGap: '30%', data: camaras.map(name => item.ids.filter(id => camara.get(id) === name).length), itemStyle: { color: item.color, borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', color: tokens.ink, fontSize: 9.5 } })),
  }), [tokens, malha]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="stack">
    <p className="kpi-line"><b>{int(malha.empregaSemRegistro.length)}</b> empresas sem registro empregam engenheiros · <b>{int(malha.engenheirosSemRegistro.length)}</b> empregados como engenheiro sem registro ativo</p>
    <Chart option={option} tokens={tokens} label="Empresas por cruzamento entre emprego de engenheiros e registro" onPick={params => { const item = series[params.seriesIndex], name = camaras[params.dataIndex]; if (!item || !name) return;
      const vinc = new Map<string, Vinculo[]>(); for (const row of malha.vinculos) vinc.set(row.companyId, [...(vinc.get(row.companyId) ?? []), row]);
      ctx.open({ kind: 'linhas', title: `${name} · ${item.name.toLowerCase()}`, what: params.seriesIndex === 0 ? 'Empresas sem registro ativo no CREA-SP com empregados em CBO de engenheiro (RAIS identificada).' : 'Empresas com empregado em CBO de engenheiro cujo CPF não tem registro ativo no CREA.', use: params.seriesIndex === 0 ? 'Indício forte de atividade de engenharia: priorize a notificação para registro.' : 'Verifique o exercício ilegal da profissão e a responsabilidade da empresa.', listTitle: 'Empresas, mais vínculos primeiro',
        rows: linhasEmpresas(ctx, item.ids.filter(id => camara.get(id) === name), id => { const rows = vinc.get(id) ?? [], sem = rows.filter(row => !row.profissionalAtivo).length; return { value: `${rows.length} engenheiro${rows.length > 1 ? 's' : ''} empregado${rows.length > 1 ? 's' : ''}`, note: `${sem} sem registro ativo · ${[...new Set(rows.map(row => row.ocupacao))].join(', ')}`, sort: rows.length }; }) }); }} />
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
