import type { Dataset } from '../../domain/types';
import { datasReferencia, datasetAt } from '../../domain/tempo';
import { municipiosSp } from '../../domain/municipios';
import { buildConselho } from '../../domain/conselho';
import { buildEntidades } from '../../domain/entidades';
import { buildProfissionais, situacaoEm } from '../../domain/profissionais';
import { INICIO_IA, modalidadeDaCamara, plenario } from '../../domain/gestao';
import { conselheiros, diariasPorPessoa, membrosDoPlenario, servidores } from '../../domain/pessoas-conselho';
import { alertaNoStatus, buildColegiado, colegiados, desfechos, dias, faixaCadastro, faixaNoStatus, faixasCadastro, faixasNoStatus, faixasPrescricaoRelator, infracaoDaAlinea, nomeColegiado, prescricaoDe, statusEm, statusPendentes } from '../../domain/colegiado';
import type { Pendente } from '../../domain/colegiado';
import { PRIMEIRA_FOTO, PRIMEIRO_MES, centavos, fimDoMes, meses, nomesMes, primeiroDia } from '../gestao/dados';
import type { Dados } from '../gestao/dados';
import type { Celula } from '../csv';

/** Os status do Votenet na ordem do caminho, e os desvios e as idas à pauta que os gráficos contam. */
const EVENTOS_CONTADOS = new Set(['Pautado', 'Pedido de vista', 'Impedimento', 'Diligência']);
const ALERTAS = ['Vermelho', 'Amarelo', 'Sem alerta'] as const;
const trimestre = (data: string) => `${data.slice(0, 4)}-T${Math.floor((Number(data.slice(5, 7)) - 1) / 3) + 1}`;

/**
 * Tabelas do cenário de demonstração para o pacote Power BI do painel de Gestão do Conselho (07/11/2026), em esquema estrela
 * (ADR 0001 e 0002), a partir de `buildColegiado`, a mesma base das cinco páginas.
 * Dimensões: regionais, municípios, colegiados (o Plenário e as nove câmaras), pessoas (conselheiros e funcionários), calendário e datas.
 * Fotos de cada fim de mês: a fila do Votenet (cada processo esperando voto, com o status, com quem está, os dias, o alerta e a
 * prescrição) e as cadeiras e os profissionais ativos de cada câmara.
 * Fatos com data: tramitações (a passagem do processo por um colegiado), idas à pauta e desvios, mandatos dos conselheiros,
 * presenças nas sessões, diárias dos conselheiros, autos de infração com a decisão e o destino da multa, pagamentos às organizações
 * e deliberações de repasse das atas. Nada depois da data do cenário entra nos CSV.
 */
const porBase = new WeakMap<Dataset, Dados[]>();
export function dadosConselho(dataset: Dataset): Dados[] {
  let tabelas = porBase.get(dataset);
  if (!tabelas) { tabelas = montar(dataset); porBase.set(dataset, tabelas); }
  return tabelas;
}

function montar(dataset: Dataset): Dados[] {
  const hoje = dataset.snapshotDate, mesHoje = hoje.slice(0, 7), ate = (data: string | undefined) => data && data <= hoje ? data : null;
  const fotos = meses(PRIMEIRA_FOTO, mesHoje).map(fimDoMes).map(data => data > hoje ? hoje : data);
  const nomeGre = new Map(dataset.gres.map(row => [row.id, row.name])), gre = (id: string | null | undefined) => (id ? nomeGre.get(id) : '') ?? '';
  const base = buildColegiado(dataset), entidades = buildEntidades(dataset), registradaEm = new Map(entidades.organizacoes.map(org => [org.id, org.registradaEm]));
  const tramitacoes = base.tramitacoes.filter(t => t.entrada <= hoje);
  const nomeDe = (id: string) => base.pessoas.get(id)?.nome ?? '';
  const recursoDe = new Map(tramitacoes.filter(t => t.instancia === 'Plenário').map(t => [t.processo.id, t.entrada]));
  const calendario = meses(PRIMEIRO_MES, fimDoMes(`${Number(mesHoje.slice(0, 4)) + 1}${mesHoje.slice(4)}`).slice(0, 7));

  /* ---------- A fila do Votenet em cada fim de mês ---------- */
  const fila: Celula[][] = [];
  for (const data of fotos) for (const t of tramitacoes) {
    const evento = statusEm(t, data); if (!evento) continue;
    const row: Pendente = { t, evento, diasNoStatus: dias(evento.desde, data), diasTotais: dias(t.entrada, data) };
    const alerta = alertaNoStatus(row.diasNoStatus), indiceAlerta = alerta === 'vermelho' ? 0 : alerta === 'amarelo' ? 1 : 2, faixa = faixaNoStatus(row.diasNoStatus);
    const prescricao = prescricaoDe(row), m = prescricao ? dias(data, prescricao.em) / 30.44 : null, perto = m !== null && m >= 0 && m <= 12;
    const prazo = perto ? (m! <= 3 ? 0 : m! <= 6 ? 1 : 2) : null;
    fila.push([data, t.id, evento.status, statusPendentes.indexOf(evento.status) + 1, evento.com, row.diasNoStatus, faixasNoStatus[faixa], faixa + 1, ALERTAS[indiceAlerta], indiceAlerta + 1,
      row.diasTotais, row.diasTotais > 365, t.entrada < `${data.slice(0, 4)}-01-01`, perto, prazo === null ? '' : faixasPrescricaoRelator[prazo], prazo === null ? null : prazo + 1,
      perto && prescricao!.motivo === 'três anos parado', row.diasNoStatus > 730, perto ? t.processo.multa ?? 0 : null]);
  }

  /* ---------- Cadeiras e profissionais ativos de cada câmara em cada fim de mês ---------- */
  const camaras: Celula[][] = [];
  for (const data of fotos) {
    // Como o painel: o cadastro de profissionais e as entidades lidos na própria data (a base em D), não na de hoje.
    const view = datasetAt(dataset, data), naData = buildProfissionais(view), ativas = new Map<string, number>();
    for (const p of naData.profissionais) if (p.genero === 'Feminino' && situacaoEm(p, data) === 'Ativo') ativas.set(p.modalidade, (ativas.get(p.modalidade) ?? 0) + 1);
    for (const row of plenario(buildEntidades(view), naData, data)) { const mod = modalidadeDaCamara[row.camara]; camaras.push([data, row.camara, row.cadeiras, row.profissionais, mod ? ativas.get(mod) ?? 0 : 0]); }
  }

  /* ---------- Diárias dos conselheiros, pessoa a pessoa, mês a mês ---------- */
  const contas = buildConselho(dataset);
  const diarias = diariasPorPessoa(contas, servidores(contas, dataset), conselheiros(entidades), hoje, null, contas.months.length).filter(p => p.categoria === 'Conselheiros')
    .flatMap(p => p.lancamentos.map(l => [primeiroDia(l.month), p.id, l.quantidade, l.valor] as Celula[]));

  return [
    { arquivo: 'regionais.csv', cabecalho: ['GRE', 'Ordem'], linhas: dataset.gres.map((row, i) => [row.name, i + 1]) },
    { arquivo: 'municipios.csv', cabecalho: ['Código IBGE', 'Município', 'GRE'], linhas: municipiosSp(dataset).map(row => [row.id, row.nome, gre(row.greId)]) },
    { arquivo: 'colegiados.csv', cabecalho: ['Colegiado', 'Nome', 'Ordem'], linhas: colegiados.map((colegiado, i) => [colegiado, nomeColegiado(colegiado), i + 1]) },
    { arquivo: 'calendario.csv', cabecalho: ['Mês', 'Rótulo', 'Ano', 'Mês do ano', 'Nome do mês', 'Ordem'],
      linhas: calendario.map((mes, i) => [primeiroDia(mes), `${nomesMes[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`, Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), nomesMes[Number(mes.slice(5, 7)) - 1], i + 1]) },
    { arquivo: 'datas-referencia.csv', cabecalho: ['Data', 'Rótulo'], linhas: [...datasReferencia(dataset), hoje].map(data => [data, `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}${data === hoje ? ' (hoje)' : ''}`]) },
    { arquivo: 'datas-das-fotos.csv', cabecalho: ['Data'], linhas: fotos.map(data => [data]) },
    { arquivo: 'pessoas.csv', cabecalho: ['Pessoa', 'Nome', 'Papel', 'Detalhe'], linhas: [...base.pessoas.values()].map(p => [p.id, p.nome, p.papel, p.detalhe]) },

    // Processos: cada passagem por um colegiado, a fila em cada fim de mês e as idas à pauta e os desvios.
    { arquivo: 'tramitacoes.csv', cabecalho: ['Tramitação', 'Processo', 'Colegiado', 'Instância', 'Câmara de origem', 'Tipo', 'Código IBGE', 'Entrada', 'Mês de entrada', 'Entrada do processo', 'Julgado na câmara em', 'Recurso em', 'Plenário em',
      'Votado em', 'Mês do voto', 'Relator', 'Dias da abertura ao voto', 'Assinado em', 'Dias de relato', 'Relato com IA', 'Distribuído depois da IA', 'Trimestre do relato', 'Dias até o Votenet', 'Tempo até o Votenet', 'Ordem do tempo até o Votenet', 'Decisão do Plenário'],
      linhas: tramitacoes.map(t => {
        const p = t.processo, votado = ate(t.votadoEm), assinado = ate(t.assinadoEm), relato = assinado && t.assinadoEm < t.votadoEm, camara = t.instancia === 'Câmara', cadastro = camara ? dias(t.entrada, p.cadastroEm) : null;
        return [t.id, p.id, t.colegiado, t.instancia, p.camara, p.tipo, p.cityId, t.entrada, primeiroDia(t.entrada), ate(p.entrada), ate(p.julgadoEm), ate(p.recursoEm), ate(p.plenarioEm),
          votado, votado ? primeiroDia(votado) : null, nomeDe(t.relator), camara && votado ? dias(p.aberturaEm, votado) : null, assinado, relato ? dias(t.distribuidoEm, t.assinadoEm) : null, t.ia, t.distribuidoEm >= INICIO_IA,
          relato && t.assinadoEm >= INICIO_IA ? trimestre(t.assinadoEm) : '', cadastro, cadastro === null ? '' : faixasCadastro[faixaCadastro(cadastro)], cadastro === null ? null : faixaCadastro(cadastro) + 1,
          !camara && votado ? p.decisaoPlenario ?? '' : ''];
      }) },
    { arquivo: 'foto-fila.csv', cabecalho: ['Data', 'Tramitação', 'Status', 'Ordem do status', 'Pessoa', 'Dias no status', 'Tempo no status', 'Ordem do tempo', 'Alerta', 'Ordem do alerta', 'Dias desde a entrada', 'Mais de um ano',
      'De exercício anterior', 'Perto da prescrição', 'Prazo da prescrição', 'Ordem do prazo', 'Pela intercorrente', 'Parado há mais de dois anos', 'Multa'], linhas: fila },
    { arquivo: 'eventos.csv', cabecalho: ['Tramitação', 'Status', 'Desde', 'Mês', 'Pessoa'],
      linhas: tramitacoes.flatMap(t => t.eventos.filter(e => EVENTOS_CONTADOS.has(e.status) && e.desde <= hoje).map(e => [t.id, e.status, e.desde, primeiroDia(e.desde), e.com])) },

    // Conselheiros: os mandatos, a presença em cada sessão e as diárias.
    { arquivo: 'conselheiros.csv', cabecalho: ['Mandato', 'Pessoa', 'Nome', 'Gênero', 'Câmara', 'Organização', 'Sigla', 'Natureza', 'Terço', 'Início', 'Fim', 'Organização registrada em'],
      linhas: membrosDoPlenario(entidades).filter(m => m.inicio <= hoje).map(m => [`${m.id}:${m.inicio}`, m.id, m.nome, m.genero, m.camara, m.orgId, m.sigla, m.natureza, m.terco, m.inicio, m.fim, registradaEm.get(m.orgId) ?? null]) },
    { arquivo: 'presencas.csv', cabecalho: ['Sessão', 'Data', 'Colegiado', 'Pessoa', 'Presente'],
      linhas: base.sessoes.filter(s => s.data <= hoje).flatMap(s => { const presentes = new Set(s.presentes); return s.membros.map(id => [s.id, s.data, s.colegiado, id, presentes.has(id)]); }) },
    { arquivo: 'diarias.csv', cabecalho: ['Mês', 'Pessoa', 'Diárias', 'Valor'], linhas: diarias },

    // Decisões: cada auto de infração votado na câmara, com o que veio depois.
    { arquivo: 'autos.csv', cabecalho: ['Processo', 'Câmara', 'Código IBGE', 'Julgado em', 'Ano da decisão', 'Desfecho', 'Ordem do desfecho', 'Infração', 'Reincidente', 'Multa da câmara', 'Multa final', 'Recurso ao Plenário em', 'Plenário em', 'Recurso ao Confea em', 'Trânsito em julgado', 'Pago em'],
      linhas: base.desdobramentos.filter(d => d.processo.julgadoEm <= hoje).map(d => { const p = d.processo, decidido = ate(p.plenarioEm);
        return [p.id, p.camara, p.cityId, p.julgadoEm, Number(p.julgadoEm.slice(0, 4)), d.desfecho, desfechos.indexOf(d.desfecho) + 1, infracaoDaAlinea[d.alinea], d.reincidente, d.multaCamara, decidido ? d.multaFinal : d.multaCamara,
          ate(recursoDe.get(p.id)), decidido, ate(d.confeaEm), ate(d.transitoEm), ate(d.pagoEm)]; }) },

    // Representação: cadeiras e profissionais por câmara, as organizações, o que receberam e as deliberações das atas.
    { arquivo: 'foto-camaras.csv', cabecalho: ['Data', 'Câmara', 'Cadeiras', 'Profissionais ativos', 'Profissionais ativas'], linhas: camaras },
    { arquivo: 'organizacoes.csv', cabecalho: ['Organização', 'Sigla', 'Nome', 'Natureza'],
      linhas: entidades.organizacoes.map(org => [org.id, org.sigla, org.nome, org.grupo === 'IES' ? 'Instituição de ensino' : 'Entidade de classe']) },
    { arquivo: 'pagamentos-repasses.csv', cabecalho: ['Repasse', 'Organização', 'Canal', 'Início do repasse', 'Data', 'Valor'],
      linhas: entidades.repasses.flatMap(r => r.pagamentos.filter(pg => pg.data <= hoje).map(pg => [r.id, r.orgId, r.canal, r.inicio, pg.data, centavos(pg.valor)])) },
    { arquivo: 'deliberacoes.csv', cabecalho: ['Deliberação', 'Data', 'Canal', 'Organização', 'Nome da organização', 'Valor', 'Objeto', 'Proposta por', 'Proposta pela própria organização', 'Quem propôs é da organização'],
      linhas: base.deliberacoes.filter(d => d.data <= hoje).map(d => [d.id, d.data, d.canal, d.orgId, d.organizacao, d.valor, d.objeto, nomeDe(d.proponente), d.conflito, d.conflito ? 'Sim' : 'Não']) },
  ];
}
