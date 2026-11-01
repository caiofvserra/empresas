import { useMemo, useState } from 'react';
import { Chart } from '../painel/chart';
import { data, int } from '../painel/ui';
import { casasLegislativas, casos, coletaDe, coletas, familiasNormativas, ferramentasIa, fontes, frentePorId, frentes, gatePromocao, lacunas, niveisEvidencia, prontidaoFontes, proposicoes, regrasLeitura, situacoesCaso, usoNoPainel } from '../observatorio/governanca';
import type { CasaLegislativa, Coleta, Decisao, EtapaProposicao, SituacaoCaso, SituacaoCruzamento, SituacaoFerramenta } from '../observatorio/governanca';

/** Classe CSS a partir de um rótulo com acento (Automática → automatica). */
const chave = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
import { regras, regrasPendentes, statusAjuda } from './cruzamentos';
import type { CockpitCtx } from './contexto';
import { Status } from './PaginaMalha';
import { Bloco, Parceria } from './ui';
import { parcerias } from '../domain/parcerias';
import { fichas, parceriasDe } from './fichas';

/**
 * Aba 11 · Método: o que o projeto elaborou e a V20 aplica. Regras de leitura do plano rev. 2, decisão sobre as 12 lacunas do V18,
 * o bloco que atende cada um dos 34 casos de uso, as regras da malha fina com status e coleta, o atlas de 98 fontes com a forma de
 * coleta e as ferramentas de IA e análises avançadas que alimentam o painel.
 */
export default function PaginaMetodo({ ctx }: { ctx: CockpitCtx }) {
  return <div className="ck-grid ck-grid-metodo">
    <Bloco ctx={ctx} id="fr" area="fr" title="Fontes externas e o que cada uma acrescenta" question="As oito frentes de dados externos e a base interna: que fontes reúnem, o que de mais útil permitem ver, como os dados são coletados e onde já aparecem no painel."><Frentes ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="rl" area="rl" title="O que cada cruzamento permite concluir, e o que não permite" question="Os 20 principais cruzamentos entre bases: o campo que liga uma à outra, o que se pode concluir, o que não se pode e onde aparecem no painel. Clique numa frente para filtrar."><RegrasLeitura ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="lc" area="lc" title="Problemas apontados na versão 18 e o que foi feito" question="Os 12 problemas da revisão do repositório e a decisão sobre cada um: corrigido, marcado como demonstrativo ou retirado. A última coluna diz o que ainda falta para usar em produção."><Lacunas /></Bloco>
    <Bloco ctx={ctx} id="uc" area="uc" title="Os 34 usos previstos e onde cada um está" question="Os casos de uso do levantamento de 29/10, com a situação de cada um e o bloco do painel que o atende. Clique numa situação para filtrar."><Casos ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mr" area="mr" title="Regras da malha fina" question="Todas as regras, quão segura é cada ligação, de onde vêm os dados, como são coletados e o que não se pode concluir de cada uma." help={`Confirmado: ${statusAjuda.Confirmado} Candidato: ${statusAjuda.Candidato} Contexto: ${statusAjuda.Contexto}`}><RegrasMalha /></Bloco>
    <Bloco ctx={ctx} id="ft" area="ft" title="As 98 fontes de dados mapeadas" question="Todas as fontes levantadas, por tema, pelo que já se comprovou sobre elas e pela forma de coleta. Só entram no painel as que podem ser coletadas automaticamente ou por acordo. Clique numa célula para ver a lista."><Fontes ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="ia" area="ia" title="Inteligência artificial e análises avançadas" question="O que roda fora do painel e alimenta seus números: classificação de nomes, pareamento de empresas, detecção de padrões incomuns, extração de textos e previsão. Todo resultado entra como caso a confirmar, com revisão de uma pessoa."><Ferramentas ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="rn" area="rn" title="Projetos de lei que podem afetar a engenharia" question="Projetos em tramitação na Câmara, no Senado e na Assembleia Legislativa, por assunto, etapa e data do último andamento. Os projetos listados são exemplos inventados até a coleta automática entrar. Clique numa casa para filtrar." help="Projeto em tramitação não é lei. Em produção, a coleta acompanha a data de cada andamento, e uma pessoa confirma se o projeto é relevante."><Radar ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="gt" area="gt" title="Quando uma fonte nova pode entrar no painel" question="Os sete passos que uma fonte precisa cumprir antes de alimentar o painel de verdade, e até onde cada fonte nova já chegou. Nenhuma passou do sexto passo ainda."><Gate ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="pc" area="pc" title="Acordos de que o painel depende" question="Cada acordo necessário para os blocos marcados com “!”: com quem, o que o parceiro precisa entregar, como os dados se ligam, a prioridade no plano e onde o bloco está. Nenhum acordo foi assinado ainda." help="Prioridade A são os primeiros acordos sugeridos no plano. Até o acordo, os blocos mostram dados de exemplo, e os casos que eles apontam não contam como confirmados."><ParceriasTabela /></Bloco>
  </div>;
}

const corSituacao = (tokens: CockpitCtx['tokens']): Record<SituacaoCruzamento, string> => ({ 'No painel': tokens.good, Parcial: tokens.accent, Planejada: tokens.blue, 'Depende de acordo': tokens.heat[1], 'Fora da coleta automática': tokens.muted });
const Situacao = ({ situacao, tokens }: { situacao: SituacaoCruzamento; tokens: CockpitCtx['tokens'] }) => <span className="chip"><i className="dot" style={{ background: corSituacao(tokens)[situacao] }} />{situacao}</span>;

function Frentes({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, contagem = (situacao: SituacaoCruzamento) => frentes.filter(row => row.situacao === situacao).length;
  return <div className="stack">
    <p className="kpi-line"><b>{contagem('No painel')}</b> no painel · <b>{contagem('Parcial')}</b> parciais · <b>{contagem('Planejada')}</b> planejadas · <b>{contagem('Depende de acordo')}</b> dependem de acordo · {regrasLeitura.length} cruzamentos na matriz</p>
    <div className="table-wrap"><table className="metodo is-dense">
      <thead><tr><th>Frente</th><th>Potencial mais relevante</th><th>Coleta</th><th>Situação</th><th>No painel</th></tr></thead>
      <tbody>{frentes.map(row => <tr key={row.id}><td><b>{row.frente}</b><small>{row.fontes}</small></td><td>{row.potencial}</td><td><span className={`coleta is-${chave(row.coleta)}`}>{row.coleta}</span></td><td><Situacao situacao={row.situacao} tokens={tokens} /></td><td><small>{row.noPainel}</small></td></tr>)}</tbody>
    </table></div>
  </div>;
}

function RegrasLeitura({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, [frente, setFrente] = useState<string | null>(null);
  const rows = frente ? regrasLeitura.filter(row => row.frente === frente) : regrasLeitura;
  return <div className="stack">
    <div className="seg is-wrap" role="radiogroup" aria-label="Frente">
      <button role="radio" aria-checked={frente === null} className={frente === null ? 'on' : ''} onClick={() => setFrente(null)}>Todas · {regrasLeitura.length}</button>
      {frentes.map(item => <button key={item.id} role="radio" aria-checked={frente === item.id} className={frente === item.id ? 'on' : ''} onClick={() => setFrente(frente === item.id ? null : item.id)}>{item.frente} · {regrasLeitura.filter(row => row.frente === item.id).length}</button>)}
    </div>
    <div className="table-wrap"><table className="metodo is-dense">
      <thead><tr><th>Cruzamento</th><th>Chave e condição</th><th>Pode concluir</th><th>Não pode concluir</th><th>Situação</th><th>No painel</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.cruzamento}><td><b>{row.cruzamento}</b><small>{frentePorId[row.frente]?.frente}</small></td><td><small>{row.chave}</small></td><td>{row.pode}</td><td className="nao">{row.naoPode}</td><td><Situacao situacao={row.situacao} tokens={tokens} /></td><td><small>{row.noPainel}</small></td></tr>)}</tbody>
    </table></div>
  </div>;
}

const decisaoClasse: Record<Decisao, string> = { Corrigida: 'is-confirmado', Rotulada: 'is-contexto', Retirada: 'is-candidato' };
function Lacunas() {
  const contagem = (decisao: Decisao) => lacunas.filter(row => row.decisao === decisao).length;
  return <div className="stack">
    <p className="kpi-line"><b>{contagem('Corrigida')}</b> corrigidas · <b>{contagem('Retirada')}</b> retiradas · <b>{contagem('Rotulada')}</b> rotuladas como demonstrativas</p>
    <div className="table-wrap"><table className="metodo">
      <thead><tr><th>#</th><th>Lacuna</th><th>Decisão</th><th>O que mudou</th><th>Falta para produção</th></tr></thead>
      <tbody>{lacunas.map(row => <tr key={row.n}><td>{row.n}</td><td><b>{row.titulo}</b></td><td><span className={`status ${decisaoClasse[row.decisao]}`}>{row.decisao}</span></td><td>{row.oQueMudou}</td><td><small>{row.falta}</small></td></tr>)}</tbody>
    </table></div>
  </div>;
}

const corCaso = (tokens: CockpitCtx['tokens']): Record<SituacaoCaso, string> => ({ 'No painel': tokens.good, Parcial: tokens.accent, 'Depende de acordo': tokens.heat[1], 'Fora da coleta automática': tokens.muted });
function Casos({ ctx }: { ctx: CockpitCtx }) {
  const [filtro, setFiltro] = useState<SituacaoCaso | null>(null), cores = corCaso(ctx.tokens);
  const rows = filtro ? casos.filter(row => row.situacao === filtro) : casos;
  return <div className="stack">
    <div className="seg is-wrap" role="radiogroup" aria-label="Situação do caso de uso">
      <button role="radio" aria-checked={filtro === null} className={filtro === null ? 'on' : ''} onClick={() => setFiltro(null)}>Todos · {casos.length}</button>
      {situacoesCaso.map(item => <button key={item} role="radio" aria-checked={filtro === item} className={filtro === item ? 'on' : ''} onClick={() => setFiltro(filtro === item ? null : item)}><i className="dot" style={{ background: cores[item] }} />{item} · {casos.filter(row => row.situacao === item).length}</button>)}
    </div>
    <div className="table-wrap"><table className="metodo">
      <thead><tr><th>Caso</th><th>Prioridade</th><th>Situação</th><th>Bloco do painel</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.id} title={row.resumo}><td><b>{row.id} · {row.nome}</b><small>{row.grupo}</small></td><td>{row.prioridade}</td><td><span className="chip" style={{ borderColor: cores[row.situacao] }}><i className="dot" style={{ background: cores[row.situacao] }} />{row.situacao}</span></td><td><small>{row.onde}</small></td></tr>)}</tbody>
    </table></div>
  </div>;
}

function RegrasMalha() {
  return <div className="stack">
    <div className="table-wrap"><table className="metodo">
      <thead><tr><th>Regra</th><th>Status</th><th>Coleta</th><th>Fonte e versão</th><th>Não pode concluir</th></tr></thead>
      <tbody>{regras.map(row => <tr key={row.id} title={row.regra}><td><b>{row.label}</b></td><td><Status status={row.status} /></td><td><span className={`coleta is-${row.coleta.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}`}>{row.coleta}</span></td><td><small>{row.fonte} · {row.versao}</small></td><td className="nao"><small>{row.naoConcluir}</small></td></tr>)}</tbody>
    </table></div>
    <p className="pendentes">Pendentes: {regrasPendentes.map(row => `${row.label} (${row.motivo})`).join('; ')}.</p>
  </div>;
}

const corColeta = (tokens: CockpitCtx['tokens']): Record<Coleta, string> => ({ Automática: tokens.good, Convênio: tokens.accent, 'Fora da coleta automática': tokens.muted });
function Fontes({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, [sel, setSel] = useState<{ tema: string; evidencia: string } | null>(null), [coleta, setColeta] = useState<Coleta | null>(null), cores = corColeta(tokens);
  const base = useMemo(() => coleta ? fontes.filter(row => coletaDe(row) === coleta) : fontes, [coleta]);
  const temas = useMemo(() => [...new Set(fontes.map(row => row.tema))].sort((a, b) => fontes.filter(row => row.tema === b).length - fontes.filter(row => row.tema === a).length), []);
  const niveis = niveisEvidencia.filter(nivel => fontes.some(row => row.evidencia === nivel));
  const celulas = useMemo(() => temas.flatMap((tema, y) => niveis.map((nivel, x) => [x, y, base.filter(row => row.tema === tema && row.evidencia === nivel).length] as [number, number, number])), [temas, niveis, base]);
  const option = useMemo(() => ({
    grid: { top: 4, right: 8, bottom: 26, left: 4, containLabel: true },
    tooltip: { formatter: (item: any) => `<b>${temas[item.value[1]]}</b><br/>${niveis[item.value[0]]}: ${int(item.value[2])} fontes` },
    xAxis: { type: 'category', data: niveis, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.muted, fontSize: 10 } },
    yAxis: { type: 'category', inverse: true, data: temas, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: tokens.ink, fontSize: 10, width: 170, overflow: 'truncate' } },
    visualMap: { show: false, min: 0, max: Math.max(...celulas.map(row => row[2]), 1), inRange: { color: [tokens.soft, tokens.blue] } },
    series: [{ type: 'heatmap', data: celulas, label: { show: true, color: tokens.ink, fontSize: 10, formatter: (item: any) => item.value[2] || '' }, itemStyle: { borderColor: tokens.surface, borderWidth: 2, borderRadius: 3 } }],
  }), [celulas, temas, niveis, tokens]);
  const lista = sel ? base.filter(row => row.tema === sel.tema && row.evidencia === sel.evidencia) : base.filter(row => usoNoPainel[row.fonte]);
  const conta = (item: Coleta) => fontes.filter(row => coletaDe(row) === item).length;
  return <div className="stack">
    <div className="seg is-wrap" role="radiogroup" aria-label="Forma de coleta">
      <button role="radio" aria-checked={coleta === null} className={coleta === null ? 'on' : ''} onClick={() => setColeta(null)}>Todas · {fontes.length}</button>
      {coletas.map(item => <button key={item} role="radio" aria-checked={coleta === item} className={coleta === item ? 'on' : ''} onClick={() => setColeta(coleta === item ? null : item)}><i className="dot" style={{ background: cores[item] }} />{item} · {conta(item)}</button>)}
    </div>
    <div className="fontes-heat"><Chart option={option} tokens={tokens} label="Fontes do atlas por tema e nível de evidência" onPick={item => { const tema = temas[item.value?.[1]], evidencia = niveis[item.value?.[0]]; if (tema && evidencia && item.value[2]) setSel({ tema, evidencia }); }} /></div>
    <div className="table-wrap is-short"><table className="metodo">
      <thead><tr><th colSpan={4}>{sel ? <>{sel.tema} · {sel.evidencia} <button className="link" onClick={() => setSel(null)}>limpar</button></> : 'Fontes que a V20 usa ou simula'}</th></tr></thead>
      <tbody>{lista.map(row => { const forma = coletaDe(row); return <tr key={row.fonte}><td><b>{row.fonte}</b><small>{row.orgao} · {row.acesso} · {row.rotina}</small></td><td><span className="chip" style={{ borderColor: cores[forma] }}><i className="dot" style={{ background: cores[forma] }} />{forma}</span></td><td><small>{row.chaves}</small></td><td><small>{usoNoPainel[row.fonte] ?? `${row.evidencia}${row.data ? ` · ${row.data}` : ''}`}</small></td></tr>; })}</tbody>
    </table></div>
  </div>;
}

const corFerramenta = (tokens: CockpitCtx['tokens']): Record<SituacaoFerramenta, string> => ({ 'No painel': tokens.good, Protótipo: tokens.accent, Planejada: tokens.muted });
function Ferramentas({ ctx }: { ctx: CockpitCtx }) {
  const cores = corFerramenta(ctx.tokens);
  return <div className="stack">
    <p className="kpi-line"><b>{int(ferramentasIa.filter(row => row.situacao === 'No painel').length)}</b> no painel · <b>{int(ferramentasIa.filter(row => row.situacao === 'Protótipo').length)}</b> em protótipo · <b>{int(ferramentasIa.filter(row => row.situacao === 'Planejada').length)}</b> planejadas · nenhuma saída vira fato sem validação humana e taxa de falso positivo medida</p>
    <div className="table-wrap"><table className="metodo">
      <thead><tr><th>Ferramenta</th><th>Tipo</th><th>Alimenta</th><th>Entrada e saída</th><th>Validação</th><th>Situação</th></tr></thead>
      <tbody>{ferramentasIa.map(row => <tr key={row.nome}><td><b>{row.nome}</b></td><td>{row.tipo}</td><td><small>{row.bloco}</small></td><td><small>{row.entrada}</small><small>→ {row.saida}</small></td><td><small>{row.validacao}</small></td><td><span className="chip" style={{ borderColor: cores[row.situacao] }}><i className="dot" style={{ background: cores[row.situacao] }} />{row.situacao}</span></td></tr>)}</tbody>
    </table></div>
  </div>;
}

/* ---------- V21 · radar normativo e gate de promoção de fontes ---------- */
const corEtapa = (tokens: CockpitCtx['tokens']): Record<EtapaProposicao, string> => ({ Apresentada: tokens.muted, 'Em comissão': tokens.blue, 'Pronta para o plenário': tokens.accent, 'Aprovada na casa': tokens.warn, Sancionada: tokens.good, Arquivada: tokens.line });
function Radar({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, [casa, setCasa] = useState<CasaLegislativa | null>(null), cores = corEtapa(tokens);
  const rows = useMemo(() => (casa ? proposicoes.filter(row => row.casa === casa) : proposicoes).slice().sort((a, b) => b.ultimaTramitacao.localeCompare(a.ultimaTramitacao)), [casa]);
  const porFamilia = useMemo(() => familiasNormativas.map(familia => ({ familia, n: rows.filter(row => row.familia === familia).length })).filter(row => row.n > 0), [rows]);
  return <div className="stack">
    <div className="seg is-wrap" role="radiogroup" aria-label="Casa legislativa">
      <button role="radio" aria-checked={casa === null} className={casa === null ? 'on' : ''} onClick={() => setCasa(null)}>Todas · {proposicoes.length}</button>
      {casasLegislativas.map(item => <button key={item} role="radio" aria-checked={casa === item} className={casa === item ? 'on' : ''} onClick={() => setCasa(casa === item ? null : item)}>{item} · {proposicoes.filter(row => row.casa === item).length}</button>)}
    </div>
    <p className="kpi-line">{porFamilia.map(row => <span key={row.familia} className="chip" style={{ marginRight: 4 }}>{row.familia} · {row.n}</span>)}</p>
    <div className="table-wrap"><table className="metodo is-dense">
      <thead><tr><th>Casa e proposição</th><th>Família de assunto</th><th>Ementa</th><th>Etapa</th><th>Última tramitação</th><th>Relevância</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.id}><td><b>{row.casa}</b><small>{row.sigla}</small></td><td>{row.familia}</td><td><small>{row.ementa}</small></td><td><span className="chip"><i className="dot" style={{ background: cores[row.etapa] }} />{row.etapa}</span></td><td>{data(row.ultimaTramitacao)}</td><td><span className={`status is-${row.relevancia === 'Revisada' ? 'confirmado' : 'candidato'}`}>{row.relevancia}</span></td></tr>)}</tbody>
    </table></div>
  </div>;
}

function Gate({ ctx }: { ctx: CockpitCtx }) {
  const { tokens } = ctx, passos = gatePromocao.length;
  return <div className="stack">
    <ol className="gate" aria-label="Passos do gate">{gatePromocao.map((passo, index) => <li key={index}><b>{index + 1}</b><small>{passo}</small></li>)}</ol>
    <div className="table-wrap"><table className="metodo is-dense">
      <thead><tr><th>Fonte</th><th>Frente</th><th>Passo alcançado</th><th>Evidência (29/10)</th><th>Pendente</th><th>No painel</th></tr></thead>
      <tbody>{prontidaoFontes.map(row => <tr key={row.fonte}><td><b>{row.fonte}</b></td><td><small>{frentePorId[row.frente]?.frente}</small></td>
        <td><span className="gate-bar" title={`${row.passo} de ${passos}`}>{Array.from({ length: passos }, (_, index) => <i key={index} style={{ background: index < row.passo ? (row.passo >= 5 ? tokens.good : tokens.blue) : tokens.soft }} />)}<b>{row.passo}/{passos}</b></span></td>
        <td><small>{row.evidencia}</small></td><td className="nao"><small>{row.pendente}</small></td><td><small>{row.noPainel}</small></td></tr>)}</tbody>
    </table></div>
  </div>;
}

function ParceriasTabela() {
  const blocos = (id: string) => Object.values(fichas).filter(ficha => (parceriasDe(ficha) as string[]).includes(id)).length;
  return <div className="stack">
    <p className="kpi-line"><b>{parcerias.length}</b> parcerias · <b>{parcerias.filter(row => row.prioridade === 'A').length}</b> de prioridade A · <b>{Object.values(fichas).filter(row => row.parceria).length}</b> blocos marcados com “!”</p>
    <div className="table-wrap"><table className="metodo is-dense">
      <thead><tr><th>Parceiro</th><th>Prioridade</th><th>O que precisa entregar</th><th>Chave</th><th>Base prevista</th><th>Camadas no painel</th></tr></thead>
      <tbody>{parcerias.map(row => <tr key={row.id}><td><b>{row.parceiro}</b><small>{blocos(row.id)} bloco{blocos(row.id) === 1 ? '' : 's'} <Parceria id={row.id} compacto /></small></td><td>{row.prioridade}</td><td><small>{row.entrega}</small></td><td><small>{row.chave}</small></td><td className="nao"><small>{row.basePrevista}</small></td><td><small>{row.camadas}</small></td></tr>)}</tbody>
    </table></div>
  </div>;
}
