import type { Dataset } from '../../domain/types';
import { datasReferencia, datasetAt } from '../../domain/tempo';
import { municipiosSp } from '../../domain/municipios';
import { buildConselho, funcaoFim } from '../../domain/conselho';
import { buildEntidades } from '../../domain/entidades';
import { buildProfissionais, situacaoEm } from '../../domain/profissionais';
import { buildInstitutionalModel } from '../../domain/institutional';
import { buildCarteira, distanciaUnidade, faixaIdadeDivida, faixasIdadeDivida, pisoExecucao, vencidoEm } from '../../domain/gestao';
import { dadosAtendimento } from './dados-atendimento';
import { conselheiros, diariasPorPessoa, servidores } from '../../domain/pessoas-conselho';
import { mainEstablishments } from '../../gestao-v14/metrics';
import type { Celula } from '../csv';

/** Uma tabela de dados do pacote: o nome do CSV, o cabeçalho e as linhas. */
export interface Dados { arquivo: string; cabecalho: string[]; linhas: Celula[][] }

export const nomesMes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const primeiroDia = (mes: string) => `${mes.slice(0, 7)}-01`;
export const fimDoMes = (mes: string) => new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)).toISOString().slice(0, 10);
const DIA = 86400000;
export const diasEntre = (de: string, ate: string) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / DIA);
/** Meses de `inicio` (aaaa-mm) a `fim` (aaaa-mm), inclusive. */
export function meses(inicio: string, fim: string): string[] {
  const out: string[] = [], d = new Date(`${inicio}-01T00:00:00Z`);
  while (d.toISOString().slice(0, 7) <= fim) { out.push(d.toISOString().slice(0, 7)); d.setUTCMonth(d.getUTCMonth() + 1); }
  return out;
}
/** Primeiro mês do calendário: a base começa em 2020. O calendário vai até 12 meses depois de hoje, para os contratos que terminam. */
export const PRIMEIRO_MES = '2020-01';
/** Primeira foto: os gráficos mês a mês mostram 24 meses antes da primeira data de referência, e as variações, 12 meses antes. */
export const PRIMEIRA_FOTO = '2022-01';
/** Valor do mês com duas casas, para o CSV. */
export const centavos = (valor: number) => Math.round(valor * 100) / 100;

/**
 * Tabelas do cenário de demonstração para os pacotes Power BI dos painéis Financeiro e Atendimento (cada um leva só as suas), em
 * esquema estrela (ADR 0001 e 0002). O painel de Gestão do Conselho tem o seu modelo em `src/powerbi/conselho/` desde 07/11/2026.
 * Dimensões: regionais, municípios (com a unidade de atendimento mais próxima), calendário e datas.
 * Fotos de cada fim de mês (estoques resolvidos pelas funções do protótipo): dívida de anuidade por devedor e idade e profissionais
 * ativos por município.
 * Fatos com data (somados no período em DAX): receita, despesa, diárias por pessoa, empenhos, contratos, títulos de anuidade,
 * uso dos coworkings; e as tabelas do Atendimento, de `dados-atendimento.ts` (protocolos e a foto deles em cada fim de mês).
 */
/** As tabelas, uma vez por base: os dois pacotes partem delas. */
const porBase = new WeakMap<Dataset, Dados[]>();
export function dadosGestao(dataset: Dataset): Dados[] {
  let tabelas = porBase.get(dataset);
  if (!tabelas) { tabelas = montar(dataset); porBase.set(dataset, tabelas); }
  return tabelas;
}

function montar(dataset: Dataset): Dados[] {
  const hoje = dataset.snapshotDate, mesHoje = hoje.slice(0, 7), escolhiveis = [...datasReferencia(dataset), hoje];
  const fotos = meses(PRIMEIRA_FOTO, mesHoje).map(fimDoMes).map(data => data > hoje ? hoje : data);
  const municipios = municipiosSp(dataset), nomeGre = new Map(dataset.gres.map(row => [row.id, row.name])), gre = (id: string | null | undefined) => (id ? nomeGre.get(id) : '') ?? '';
  const distancia = distanciaUnidade(dataset);
  const contas = buildConselho(dataset), entidades = buildEntidades(dataset), profissionais = buildProfissionais(dataset);
  const equipe = servidores(contas, dataset), plenarioNomes = conselheiros(entidades);
  const carteira = buildCarteira(dataset, profissionais), matriz = mainEstablishments(dataset);
  const institucional = buildInstitutionalModel(dataset);
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

  /* ---------- Profissionais ativos em cada fim de mês, pelo município onde moram ---------- */
  const ativos: Celula[][] = [];
  for (const data of fotos) {
    // Como o painel: o cadastro de profissionais lido na própria data (a base em D), não na de hoje.
    const porCidade = new Map<string, number>();
    for (const p of buildProfissionais(datasetAt(dataset, data)).profissionais) if (situacaoEm(p, data) === 'Ativo') porCidade.set(p.cityId, (porCidade.get(p.cityId) ?? 0) + 1);
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

    { arquivo: 'profissionais-ativos.csv', cabecalho: ['Data', 'Código IBGE', 'Ativos'], linhas: ativos },

    // Atendimento: protocolos, a foto de cada fim de mês, a equipe e a demanda de fora (em dados-atendimento.ts), e os coworkings.
    ...dadosAtendimento(dataset, fotos),
    { arquivo: 'coworkings.csv', cabecalho: ['Unidade', 'Código IBGE', 'GRE', 'Mesas'], linhas: institucional.coworkUnits.map(row => [nomeCidade.get(row.cityId) ?? row.name, row.cityId, gre(row.greId), row.desks]) },
    { arquivo: 'coworkings-meses.csv', cabecalho: ['Unidade', 'Mês', 'Horas disponíveis', 'Horas usadas', 'Custo'],
      linhas: institucional.coworkMonths.filter(row => row.month <= mesHoje).map(row => { const unidade = unidades.get(row.unitId)!;
        return [nomeCidade.get(unidade.cityId) ?? unidade.name, primeiroDia(row.month), row.availableDeskHours, usoPorMes.get(row.id)?.horas ?? 0, centavos(custoCoworking.get(`${unidade.cityId}:${row.month}`) ?? 0)]; }) },
    { arquivo: 'coworkings-usuarios.csv', cabecalho: ['Unidade', 'Mês', 'Profissional'],
      linhas: institucional.coworkMonths.filter(row => row.month <= mesHoje).flatMap(row => { const unidade = unidades.get(row.unitId)!; return [...new Set(usoPorMes.get(row.id)?.pessoas ?? [])].map(p => [nomeCidade.get(unidade.cityId) ?? unidade.name, primeiroDia(row.month), p]); }) },
  ];
}
