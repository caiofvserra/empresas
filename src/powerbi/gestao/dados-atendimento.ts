import type { Dataset, Establishment } from '../../domain/types';
import { distanciaUnidade, faixaDistancia, faixasDistancia } from '../../domain/gestao';
import { buildProfissionais } from '../../domain/profissionais';
import { buildFormacao } from '../../domain/formacao';
import { classeDoEstabelecimento } from '../../observatorio/norte';
import { SERVICOS_ART, buildAtendimento, diasUteis, ler, pedidosDeInformacao, situacoes, statusEm, statusProtocolo, tiposOuvidoria } from '../../domain/atendimento';
import { rotuloTrimestre } from '../../cockpit/formatos';
import type { Celula } from '../csv';
import type { Dados } from './dados';

/** A chave da linha "Sem atribuição" na tabela de colaboradores: o protocolo que ninguém pegou aponta para ela. */
export const SEM_ATRIBUICAO = 'sem-atribuicao';
/** O período mais longo que o filtro escolhe: a foto de cada data guarda os protocolos abertos nos 36 meses até ela. */
const MESES_NA_FOTO = 36;
const DIA = 86400000;
const somaDias = (data: string, n: number) => new Date(Date.parse(`${data}T00:00:00Z`) + n * DIA).toISOString().slice(0, 10);
const primeiroDia = (data: string) => `${data.slice(0, 7)}-01`;
const inicioDaFoto = (data: string) => new Date(Date.UTC(Number(data.slice(0, 4)), Number(data.slice(5, 7)) - MESES_NA_FOTO, 1)).toISOString().slice(0, 10);
const trimestre = (data: string) => { const q = Math.ceil(Number(data.slice(5, 7)) / 3); return { rotulo: rotuloTrimestre(`${data.slice(0, 4)}-T${q}`), ordem: Number(data.slice(0, 4)) * 10 + q }; };

/**
 * Tabelas do painel de Atendimento (07/11/2026), a partir de `buildAtendimento`, a mesma base das três páginas, em esquema estrela
 * (ADR 0001 e 0002). Os protocolos são lidos da base inteira: o que abriu antes da data existe nela, ainda que o registro que ele
 * pede só entre no cadastro depois.
 * - Protocolos: um por linha, pelo número (ano e sequência, como no CreaNet), com o serviço, o prazo, a taxa, o município e a unidade de quem pediu, o canal e a distância até a unidade.
 * - Foto dos protocolos: em cada fim de mês com foto, cada protocolo aberto nos 36 meses até ele, lido nessa data (status, situação,
 *   prazo, com quem está, dias úteis com o Crea-SP, dias com o solicitante). É o estoque que muda com a data (ADR 0002).
 * - Colaboradores: o quadro de atendimento, com a lotação, e a linha "Sem atribuição".
 * - Demanda de fora: aberturas de estabelecimentos de engenharia na Receita (com o primeiro pedido de registro da empresa), ARTs
 *   registradas por mês e município da matriz, concluintes do INEP e os formados que já se registraram, por município da escola.
 * - Ouvidoria e pedidos de informação (demonstrativo, o Crea-SP inteiro), lidos em cada data com foto: o ano da data vai até ela.
 * Nada depois da data do cenário entra nos CSV.
 */
export function dadosAtendimento(dataset: Dataset, fotos: string[]): Dados[] {
  const hoje = dataset.snapshotDate, base = buildAtendimento(dataset), distancia = distanciaUnidade(dataset);
  const nomeGre = new Map(dataset.gres.map(row => [row.id, row.name])), gre = (id: string | null) => (id ? nomeGre.get(id) : '') ?? '';
  const protocolos = base.protocolos.filter(p => p.abertoEm <= hoje);

  const foto: Celula[][] = [];
  for (const data of fotos) {
    const desde = inicioDaFoto(data);
    for (const p of protocolos) {
      if (p.abertoEm > data || p.abertoEm < desde) continue;
      const l = ler(p, data)!, prazo = l.prazo ?? 'Sem prazo';
      foto.push([data, p.numero, l.status, statusProtocolo.indexOf(l.status) + 1, l.situacao, situacoes.indexOf(l.situacao) + 1, prazo, ['Dentro do prazo', 'Fora do prazo', 'Sem prazo'].indexOf(prazo) + 1,
        l.com ?? SEM_ATRIBUICAO, Boolean(l.com), l.diasCrea, l.diasSolicitante, l.fechadoEm, diasUteis(statusEm(p, data)!.desde, data), p.eventos.some(e => e.status === 'Exigência' && e.desde <= data)]);
    }
  }

  // A demanda de fora. O primeiro pedido de registro de cada empresa entre 30 dias antes e 180 depois de cada abertura.
  const pedidosPor = new Map<string, string[]>();
  for (const p of protocolos) if (p.subtipo === 'Registro de empresa' && p.companyId) pedidosPor.set(p.companyId, [...(pedidosPor.get(p.companyId) ?? []), p.abertoEm]);
  const pediuEm = (e: Establishment) => (pedidosPor.get(e.companyId) ?? []).filter(d => d >= somaDias(e.openedAt, -30) && d <= somaDias(e.openedAt, 180)).sort()[0] ?? null;
  const aberturas = dataset.establishments.filter(e => e.openedAt <= hoje && classeDoEstabelecimento(dataset, e) !== null);
  const matriz = new Map<string, string>(); for (const e of dataset.establishments) if (e.branch === 'Matriz' || !matriz.has(e.companyId)) matriz.set(e.companyId, e.cityId);
  const arts = new Map<string, number>();
  for (const a of dataset.arts) if (a.date <= hoje && matriz.has(a.companyId)) { const chave = `${primeiroDia(a.date)}|${matriz.get(a.companyId)}`; arts.set(chave, (arts.get(chave) ?? 0) + 1); }
  const formacao = buildFormacao(dataset), cidadeDaEscola = new Map(formacao.ies.map(i => [i.id, i.cityId]));
  const concluintes = new Map<string, number>();
  for (const c of formacao.concluintes) if (cidadeDaEscola.has(c.iesId)) concluintes.set(`${c.ano}|${c.iesId}`, (concluintes.get(`${c.ano}|${c.iesId}`) ?? 0) + c.concluintes);
  const primeiroAno = Number(hoje.slice(0, 4)) - 5;

  return [
    { arquivo: 'protocolos.csv', cabecalho: ['Protocolo', 'Serviço', 'Tipo', 'Prazo do serviço', 'Taxa', 'Solicitante', 'Código IBGE', 'Unidade', 'Canal', 'Aberto em', 'Mês', 'Trimestre', 'Ordem do trimestre',
      'Motivo da exigência', 'Distância do solicitante', 'Ordem da distância', 'Serviço de ART', 'Pedido de registro de profissional'],
      linhas: protocolos.map(p => { const t = trimestre(p.abertoEm), faixa = faixaDistancia(distancia.get(p.cityId)?.km ?? 0);
        return [p.numero, p.subtipo, p.tipo, p.prazo, p.taxa, p.solicitante, p.cityId, p.unidade, p.canal, p.abertoEm, primeiroDia(p.abertoEm), t.rotulo, t.ordem,
          p.motivoExigencia ?? '', faixasDistancia[faixa], faixa + 1, SERVICOS_ART.has(p.subtipo), p.subtipo.startsWith('Registro com')]; }) },
    { arquivo: 'foto-protocolos.csv', cabecalho: ['Data', 'Protocolo', 'Status', 'Ordem do status', 'Situação', 'Ordem da situação', 'Prazo', 'Ordem do prazo', 'Pessoa', 'Atribuído',
      'Dias com o Crea-SP', 'Dias com o solicitante', 'Fechado em', 'Dias úteis no status', 'Já teve exigência'], linhas: foto },
    { arquivo: 'colaboradores.csv', cabecalho: ['Pessoa', 'Nome', 'Cargo', 'Lotação', 'GRE', 'No quadro'],
      // Quem está lotado na sede atende pela capital: conta no quadro da regional dela (a GRE 5), como no painel.
      linhas: [...[...base.colaboradores.values()].map(c => [c.id, c.nome, c.cargo, c.greId ? gre(c.greId) : 'Sede', gre(c.greId ?? 'GRE5'), true] as Celula[]), [SEM_ATRIBUICAO, 'Sem atribuição', '', '', '', false]] },
    { arquivo: 'aberturas-receita.csv', cabecalho: ['Estabelecimento', 'Código IBGE', 'Aberta em', 'Mês', 'Pediu registro em'],
      linhas: aberturas.map(e => [e.id, e.cityId, e.openedAt, primeiroDia(e.openedAt), pediuEm(e)]) },
    { arquivo: 'arts-por-mes.csv', cabecalho: ['Mês', 'Código IBGE', 'ARTs'], linhas: [...arts].map(([chave, n]) => { const [mes, cityId] = chave.split('|'); return [mes, cityId, n]; }) },
    { arquivo: 'concluintes.csv', cabecalho: ['Ano', 'Instituição', 'Código IBGE', 'Concluintes'],
      linhas: [...concluintes].filter(([chave]) => Number(chave.split('|')[0]) >= primeiroAno).map(([chave, n]) => { const [ano, iesId] = chave.split('|'); return [Number(ano), iesId, cidadeDaEscola.get(iesId)!, n]; }) },
    { arquivo: 'formados-registrados.csv', cabecalho: ['Profissional', 'Código IBGE', 'Ano de conclusão', 'Registro em'],
      linhas: buildProfissionais(dataset).profissionais.filter(p => p.anoConclusao >= primeiroAno && p.registroEm <= hoje && cidadeDaEscola.has(p.iesId))
        .map(p => [p.id, cidadeDaEscola.get(p.iesId)!, p.anoConclusao, p.registroEm]) },
    { arquivo: 'ouvidoria-e-informacao.csv', cabecalho: ['Data', 'Ano', 'Tipo', 'Ordem do tipo', 'Quantidade', 'Respondidos no prazo', 'Recursos'],
      linhas: fotos.flatMap(data => pedidosDeInformacao(data).flatMap(l => [
        [data, l.ano, 'Pedido de informação', 1, l.pedidos, l.noPrazo, l.recursos] as Celula[],
        ...tiposOuvidoria.map((tipo, i) => [data, l.ano, tipo, i + 2, l.ouvidoria[tipo], null, null] as Celula[])])) },
  ];
}
