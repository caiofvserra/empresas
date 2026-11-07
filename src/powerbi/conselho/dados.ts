import type { Dataset } from '../../domain/types';
import { datasReferencia, datasetAt } from '../../domain/tempo';
import { municipiosSp } from '../../domain/municipios';
import { buildConselho, funcaoFim } from '../../domain/conselho';
import { buildEntidades, grupoOrganizacao } from '../../domain/entidades';
import { buildProfissionais, situacaoEm } from '../../domain/profissionais';
import { buildInstitutionalModel } from '../../domain/institutional';
import { camarasConselho, buildCarteira, buildProcessos, canalDe, distanciaUnidade, faixaDistancia, faixaIdadeDivida, faixaIdadeProcesso, faixasDistancia, faixasIdadeDivida, faixasIdadeProcesso, faixasPrescricao,
  faseEm, mesesAtePrescrever, municipioDoSolicitante, pisoExecucao, plenario, recursoPendente, vencidoEm } from '../../domain/gestao';
import { conselheiros, diariasPorPessoa, servidores } from '../../domain/pessoas-conselho';
import { mainEstablishments } from '../../gestao-v14/metrics';
import type { Celula } from '../csv';

/** Uma tabela de dados do pacote: o nome do CSV, o cabeçalho e as linhas. */
export interface Dados { arquivo: string; cabecalho: string[]; linhas: Celula[][] }

const nomesMes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const primeiroDia = (mes: string) => `${mes.slice(0, 7)}-01`;
const fimDoMes = (mes: string) => new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)).toISOString().slice(0, 10);
const DIA = 86400000;
const diasEntre = (de: string, ate: string) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / DIA);
/** Meses de `inicio` (aaaa-mm) a `fim` (aaaa-mm), inclusive. */
function meses(inicio: string, fim: string): string[] {
  const out: string[] = [], d = new Date(`${inicio}-01T00:00:00Z`);
  while (d.toISOString().slice(0, 7) <= fim) { out.push(d.toISOString().slice(0, 7)); d.setUTCMonth(d.getUTCMonth() + 1); }
  return out;
}
/** Primeiro mês do calendário: os processos começam em 2020. O calendário vai até 12 meses depois de hoje, para os contratos que terminam. */
export const PRIMEIRO_MES = '2020-01';
/** Primeira foto: os gráficos mês a mês mostram 24 meses antes da primeira data de referência, e as variações, 12 meses antes. */
export const PRIMEIRA_FOTO = '2022-01';
/** Valor do mês com duas casas, para o CSV. */
const centavos = (valor: number) => Math.round(valor * 100) / 100;

/**
 * Tabelas do cenário de demonstração para o pacote Power BI do painel de Gestão do Conselho, em esquema estrela (ADR 0001 e 0002).
 * Dimensões: regionais, municípios (com a unidade de atendimento mais próxima), câmaras, calendário e datas.
 * Fotos de cada fim de mês (estoques resolvidos pelas funções do protótipo): dívida de anuidade por devedor e idade, processos em
 * julgamento e recursos, composição do plenário e profissionais ativos por município.
 * Fatos com data (somados no período em DAX): receita, despesa, diárias por pessoa, empenhos, contratos, títulos de anuidade,
 * processos, repasses às entidades, solicitações de atendimento e uso dos coworkings.
 */
export function dadosConselho(dataset: Dataset): Dados[] {
  const hoje = dataset.snapshotDate, mesHoje = hoje.slice(0, 7), escolhiveis = [...datasReferencia(dataset), hoje];
  const fotos = meses(PRIMEIRA_FOTO, mesHoje).map(fimDoMes).map(data => data > hoje ? hoje : data);
  const municipios = municipiosSp(dataset), nomeGre = new Map(dataset.gres.map(row => [row.id, row.name])), gre = (id: string | null | undefined) => (id ? nomeGre.get(id) : '') ?? '';
  const distancia = distanciaUnidade(dataset);
  const contas = buildConselho(dataset), entidades = buildEntidades(dataset), profissionais = buildProfissionais(dataset);
  const equipe = servidores(contas, dataset), plenarioNomes = conselheiros(entidades);
  const processos = buildProcessos(dataset), carteira = buildCarteira(dataset, profissionais), matriz = mainEstablishments(dataset);
  const institucional = buildInstitutionalModel(dataset), origem = municipioDoSolicitante(dataset);
  const fornecedorDe = new Map(contas.fornecedores.map(row => [row.id, row.nome]));

  /* ---------- Dimensões ---------- */
  const calendario = meses(PRIMEIRO_MES, fimDoMes(`${Number(mesHoje.slice(0, 4)) + 1}${mesHoje.slice(4)}`).slice(0, 7));

  /* ---------- Dívida de anuidade: uma linha por devedor e faixa de idade, em cada fim de mês ---------- */
  const fotoDivida: Celula[][] = [];
  for (const data of fotos) {
    const abertos = carteira.titulos.filter(t => vencidoEm(t, data)), porDevedor = new Map<string, typeof abertos>();
    for (const t of abertos) porDevedor.set(`${t.devedor}:${t.pessoaId}`, [...(porDevedor.get(`${t.devedor}:${t.pessoaId}`) ?? []), t]);
    const piso = pisoExecucao(Number(data.slice(0, 4)));
    for (const [chave, titulos] of porDevedor) {
      const t0 = titulos[0], acima = titulos.reduce((n, t) => n + t.valor, 0) >= piso, porFaixa = new Map<number, { valor: number; perto: number }>();
      for (const t of titulos) { const dias = diasEntre(t.vencimento, data), item = porFaixa.get(faixaIdadeDivida(dias)) ?? { valor: 0, perto: 0 }; item.valor += t.valor; if (dias > 1461) item.perto += t.valor; porFaixa.set(faixaIdadeDivida(dias), item); }
      const situacao = t0.devedor === 'Empresa' ? matriz.get(t0.pessoaId)?.rfbStatus ?? 'Ativa' : '';
      for (const [faixa, item] of porFaixa) fotoDivida.push([data, chave, t0.devedor, t0.cityId, faixasIdadeDivida[faixa], faixa + 1, centavos(item.valor), acima, centavos(item.perto), situacao]);
    }
  }

  /* ---------- Processos: o fato de cada processo e a foto dos que estão em julgamento ou com recurso esperando ---------- */
  const fotoProcessos: Celula[][] = [];
  for (const data of fotos) for (const row of processos) {
    if (row.entrada > data) continue;
    const fase = faseEm(row, data), recurso = recursoPendente(row, data);
    if (!fase && !recurso) continue;
    const idade = fase ? faixaIdadeProcesso(diasEntre(row.entrada, data)) : null, m = fase ? mesesAtePrescrever(row, data) : null;
    const prescricao = m === null ? null : m >= 0 && m <= 3 ? 0 : m > 3 && m <= 6 ? 1 : m > 6 && m <= 12 ? 2 : null;
    fotoProcessos.push([data, row.id, fase ?? '', idade === null ? '' : faixasIdadeProcesso[idade], idade === null ? null : idade + 1, prescricao === null ? '' : faixasPrescricao[prescricao], prescricao === null ? null : prescricao + 1, prescricao !== null, recurso]);
  }

  /* ---------- Plenário e profissionais ativos em cada fim de mês ---------- */
  const fotoPlenario: Celula[][] = [], ativos: Celula[][] = [];
  for (const data of fotos) {
    // Como o painel: o cadastro de profissionais e as entidades lidos na própria data (a base em D), não na de hoje.
    const view = datasetAt(dataset, data), naData = buildProfissionais(view);
    for (const row of plenario(buildEntidades(view), naData, data)) fotoPlenario.push([data, row.camara, row.cadeiras, row.profissionais]);
    const porCidade = new Map<string, number>();
    for (const p of naData.profissionais) if (situacaoEm(p, data) === 'Ativo') porCidade.set(p.cityId, (porCidade.get(p.cityId) ?? 0) + 1);
    for (const [cityId, n] of porCidade) ativos.push([data, cityId, n]);
  }

  /* ---------- Diárias: cada pessoa em cada mês, com a GRE do lançamento ---------- */
  const diarias = diariasPorPessoa(contas, equipe, plenarioNomes, hoje, null, contas.months.length)
    .flatMap(p => p.lancamentos.map(l => [primeiroDia(l.month), p.id, p.categoria, gre(l.greId), l.quantidade, l.valor, l.km] as Celula[]));

  /* ---------- Coworkings ---------- */
  const usoPorMes = new Map<string, { horas: number; pessoas: string[] }>();
  for (const row of institucional.coworkUsage) { const item = usoPorMes.get(row.coworkMonthId) ?? { horas: 0, pessoas: [] }; item.horas += row.usedDeskHours; item.pessoas.push(row.professionalId); usoPorMes.set(row.coworkMonthId, item); }
  const custoCoworking = new Map<string, number>();
  for (const row of institucional.budgetEntries) if (row.programId === 'coworkings') custoCoworking.set(`${row.cityId}:${row.month}`, (custoCoworking.get(`${row.cityId}:${row.month}`) ?? 0) + row.executedCents / 100);
  const nomeCidade = new Map(dataset.cities.map(row => [row.id, row.name])), unidades = new Map(institucional.coworkUnits.map(row => [row.id, row]));

  return [
    { arquivo: 'regionais.csv', cabecalho: ['GRE', 'Ordem'], linhas: dataset.gres.map((row, i) => [row.name, i + 1]) },
    { arquivo: 'municipios.csv', cabecalho: ['Código IBGE', 'Município', 'GRE', 'Unidade mais próxima', 'Distância até a unidade (km)'],
      linhas: municipios.map(row => [row.id, row.nome, gre(row.greId), distancia.get(row.id)?.unidade ?? '', distancia.get(row.id)?.km ?? null]) },
    { arquivo: 'camaras.csv', cabecalho: ['Câmara', 'Ordem'], linhas: camarasConselho.map((camara, i) => [camara, i + 1]) },
    { arquivo: 'calendario.csv', cabecalho: ['Mês', 'Rótulo', 'Ano', 'Mês do ano', 'Nome do mês', 'Ordem'],
      linhas: calendario.map((mes, i) => [primeiroDia(mes), `${nomesMes[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`, Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), nomesMes[Number(mes.slice(5, 7)) - 1], i + 1]) },
    { arquivo: 'datas-referencia.csv', cabecalho: ['Data', 'Rótulo'], linhas: escolhiveis.map(data => [data, `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}${data === hoje ? ' (hoje)' : ''}`]) },
    { arquivo: 'datas-das-fotos.csv', cabecalho: ['Data'], linhas: fotos.map(data => [data]) },

    // Receita e despesa.
    { arquivo: 'receitas.csv', cabecalho: ['Mês', 'Origem', 'Prevista', 'Realizada'], linhas: contas.receitas.filter(row => row.month <= mesHoje).map(row => [primeiroDia(row.month), row.fonte, row.prevista, row.realizada]) },
    { arquivo: 'despesas.csv', cabecalho: ['Mês', 'Natureza', 'Função', 'Atividade', 'GRE', 'Orçado', 'Realizado'],
      linhas: contas.despesas.filter(row => row.month <= mesHoje).map(row => [primeiroDia(row.month), row.natureza, row.funcao, funcaoFim[row.funcao] ? 'Atividade-fim' : 'Atividade-meio', gre(row.greId), row.orcado, row.realizado]) },
    { arquivo: 'diarias.csv', cabecalho: ['Mês', 'Pessoa', 'Categoria', 'GRE', 'Diárias', 'Valor', 'Quilômetros'], linhas: diarias },
    { arquivo: 'pessoas.csv', cabecalho: ['Pessoa', 'Nome', 'Tipo', 'Cargo', 'Função', 'Vínculo', 'Lotação', 'Custo mensal', 'Indicado por'],
      linhas: [...equipe.map(s => [s.id, s.nome, 'Servidor', s.cargo, s.funcao, s.vinculo, s.greId ? gre(s.greId) : 'Sede', s.remuneracao, '']),
        ...plenarioNomes.map(c => [c.id, c.nome, 'Conselheiro', `Conselheiro indicado por ${c.sigla}`, '', '', 'Sede', null, c.sigla])] },
    { arquivo: 'fornecedores.csv', cabecalho: ['Fornecedor', 'Nome', 'Objeto', 'Natureza'], linhas: contas.fornecedores.map(row => [row.id, row.nome, row.objeto, row.natureza]) },
    { arquivo: 'empenhos.csv', cabecalho: ['Empenho', 'Mês', 'Fornecedor', 'Valor', 'Pago', 'Contrato'],
      linhas: contas.empenhos.filter(row => row.month <= mesHoje).map(row => [row.id, primeiroDia(row.month), row.fornecedorId, row.valor, row.pago, row.contratoId ?? '']) },
    { arquivo: 'contratos.csv', cabecalho: ['Contrato', 'Fornecedor', 'Nome do fornecedor', 'Objeto', 'Modalidade', 'Início', 'Fim', 'Valor', 'Aditivos'],
      linhas: contas.contratos.map(row => [row.id, row.fornecedorId, fornecedorDe.get(row.fornecedorId) ?? '', row.objeto, row.modalidade, row.inicio, row.fim, row.valor, row.aditivos]) },

    // Dívida de anuidade.
    { arquivo: 'titulos.csv', cabecalho: ['Título', 'Devedor', 'Tipo de devedor', 'Código IBGE', 'Vencimento', 'Valor', 'Pago em', 'Dias até o pagamento'],
      linhas: carteira.titulos.filter(t => t.vencimento <= hoje).map(t => { const pago = t.pagoEm && t.pagoEm <= hoje ? t.pagoEm : null;
        return [t.id, `${t.devedor}:${t.pessoaId}`, t.devedor, t.cityId, t.vencimento, t.valor, pago, pago ? diasEntre(t.vencimento, pago) : null]; }) },
    { arquivo: 'foto-divida.csv', cabecalho: ['Data', 'Devedor', 'Tipo de devedor', 'Código IBGE', 'Idade da anuidade', 'Ordem da idade', 'Valor', 'Acima do piso', 'Perto de prescrever', 'Situação do CNPJ'], linhas: fotoDivida },

    // Câmaras e plenário.
    { arquivo: 'processos.csv', cabecalho: ['Processo', 'Câmara', 'Tipo', 'Código IBGE', 'Entrada', 'Mês de entrada', 'Julgado em', 'Mês do julgamento', 'Dias até o julgamento', 'Decisão', 'Multa', 'Prescreve em'],
      linhas: processos.filter(row => row.entrada <= hoje).map(row => { const julgado = row.julgadoEm <= hoje;
        return [row.id, row.camara, row.tipo, row.cityId, row.entrada, primeiroDia(row.entrada), julgado ? row.julgadoEm : null, julgado ? primeiroDia(row.julgadoEm) : null, julgado ? diasEntre(row.entrada, row.julgadoEm) : null, julgado ? row.decisao : '', row.multa ?? null, row.prescreveEm ?? null]; }) },
    { arquivo: 'foto-processos.csv', cabecalho: ['Data', 'Processo', 'Fase', 'Tempo em julgamento', 'Ordem do tempo', 'Prazo da prescrição', 'Ordem do prazo', 'Prescreve em até 12 meses', 'Recurso esperando o plenário'], linhas: fotoProcessos },
    { arquivo: 'foto-plenario.csv', cabecalho: ['Data', 'Câmara', 'Cadeiras', 'Profissionais ativos'], linhas: fotoPlenario },
    { arquivo: 'profissionais-ativos.csv', cabecalho: ['Data', 'Código IBGE', 'Ativos'], linhas: ativos },

    // Entidades e escolas.
    { arquivo: 'organizacoes.csv', cabecalho: ['Organização', 'Sigla', 'Nome', 'Natureza', 'Tipo', 'Código IBGE', 'Registrada em', 'Cadeiras', 'Ensino a distância'],
      linhas: entidades.organizacoes.map(org => [org.id, org.sigla, org.nome, grupoOrganizacao(org), org.tipo, org.cityId, org.registradaEm, org.cadeiras, org.ead === null ? null : centavos(org.ead / 100)]) },
    { arquivo: 'repasses.csv', cabecalho: ['Repasse', 'Organização', 'Canal', 'Objeto', 'Início', 'Fim', 'Valor'],
      linhas: entidades.repasses.map(row => [row.id, row.orgId, row.canal, row.objeto, row.inicio, row.fim, row.valor]) },
    { arquivo: 'pagamentos-repasses.csv', cabecalho: ['Repasse', 'Organização', 'Data', 'Mês', 'Valor'],
      linhas: entidades.repasses.flatMap(row => row.pagamentos.filter(pay => pay.data <= hoje).map(pay => [row.id, row.orgId, pay.data, primeiroDia(pay.data), pay.valor])) },

    // Atendimento.
    { arquivo: 'solicitacoes.csv', cabecalho: ['Solicitação', 'Código IBGE', 'Município do solicitante', 'Aberta em', 'Mês', 'Prazo', 'Resolvida em', 'Dias até resolver', 'Assunto', 'Solicitante', 'Canal', 'Distância do solicitante', 'Ordem da distância'],
      linhas: institucional.serviceRequests.filter(row => row.createdAt <= hoje).map(row => {
        const km = distancia.get(origem(row))?.km ?? 0, resolvida = row.resolvedAt && row.resolvedAt <= hoje ? row.resolvedAt : null, prazo = new Date(Date.parse(`${row.createdAt}T00:00:00Z`) + row.targetDays * DIA).toISOString().slice(0, 10);
        return [row.id, row.cityId, origem(row), row.createdAt, primeiroDia(row.createdAt), prazo, resolvida, resolvida ? diasEntre(row.createdAt, resolvida) : null, row.category, row.userType, canalDe(row, km), faixasDistancia[faixaDistancia(km)], faixaDistancia(km) + 1]; }) },
    { arquivo: 'coworkings.csv', cabecalho: ['Unidade', 'Código IBGE', 'Mesas'], linhas: institucional.coworkUnits.map(row => [nomeCidade.get(row.cityId) ?? row.name, row.cityId, row.desks]) },
    { arquivo: 'coworkings-meses.csv', cabecalho: ['Unidade', 'Mês', 'Horas disponíveis', 'Horas usadas', 'Custo'],
      linhas: institucional.coworkMonths.filter(row => row.month <= mesHoje).map(row => { const unidade = unidades.get(row.unitId)!;
        return [nomeCidade.get(unidade.cityId) ?? unidade.name, primeiroDia(row.month), row.availableDeskHours, usoPorMes.get(row.id)?.horas ?? 0, centavos(custoCoworking.get(`${unidade.cityId}:${row.month}`) ?? 0)]; }) },
    { arquivo: 'coworkings-usuarios.csv', cabecalho: ['Unidade', 'Mês', 'Profissional'],
      linhas: institucional.coworkMonths.filter(row => row.month <= mesHoje).flatMap(row => { const unidade = unidades.get(row.unitId)!; return [...new Set(usoPorMes.get(row.id)?.pessoas ?? [])].map(p => [nomeCidade.get(unidade.cityId) ?? unidade.name, primeiroDia(row.month), p]); }) },
  ];
}
