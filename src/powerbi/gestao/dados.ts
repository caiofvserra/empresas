import type { Dataset } from '../../domain/types';
import { datasReferencia, datasetAt } from '../../domain/tempo';
import { municipiosSp } from '../../domain/municipios';
import { buildProfissionais, situacaoEm } from '../../domain/profissionais';
import { buildInstitutionalModel } from '../../domain/institutional';
import { canalDe, distanciaUnidade, faixaDistancia, faixasDistancia, municipioDoSolicitante } from '../../domain/gestao';
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
 * Tabelas do cenário de demonstração do pacote Power BI do painel de Atendimento, em esquema estrela (ADR 0001 e 0002). Os painéis
 * de Gestão do Conselho e Financeiro têm modelo próprio em `src/powerbi/conselho/` e `src/powerbi/financeiro/` desde 07/11/2026, e
 * reaproveitam daqui as funções de datas.
 * Dimensões: regionais, municípios (com a unidade de atendimento mais próxima), calendário e datas.
 * Foto de cada fim de mês: profissionais ativos por município.
 * Fatos com data (somados no período em DAX): solicitações de atendimento e uso dos coworkings.
 */
/** As tabelas, uma vez por base. */
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
  const institucional = buildInstitutionalModel(dataset), origem = municipioDoSolicitante(dataset);

  /* ---------- Dimensões ---------- */
  const calendario = meses(PRIMEIRO_MES, fimDoMes(`${Number(mesHoje.slice(0, 4)) + 1}${mesHoje.slice(4)}`).slice(0, 7));

  /* ---------- Profissionais ativos em cada fim de mês, pelo município onde moram ---------- */
  const ativos: Celula[][] = [];
  for (const data of fotos) {
    // Como o painel: o cadastro de profissionais lido na própria data (a base em D), não na de hoje.
    const porCidade = new Map<string, number>();
    for (const p of buildProfissionais(datasetAt(dataset, data)).profissionais) if (situacaoEm(p, data) === 'Ativo') porCidade.set(p.cityId, (porCidade.get(p.cityId) ?? 0) + 1);
    for (const [cityId, n] of porCidade) ativos.push([data, cityId, n]);
  }

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

    { arquivo: 'profissionais-ativos.csv', cabecalho: ['Data', 'Código IBGE', 'Ativos'], linhas: ativos },

    // Atendimento.
    { arquivo: 'solicitacoes.csv', cabecalho: ['Solicitação', 'Código IBGE', 'GRE', 'Município do solicitante', 'Aberta em', 'Mês', 'Prazo', 'Resolvida em', 'Dias até resolver', 'Assunto', 'Solicitante', 'Canal', 'Distância do solicitante', 'Ordem da distância'],
      linhas: institucional.serviceRequests.filter(row => row.createdAt <= hoje).map(row => {
        const km = distancia.get(origem(row))?.km ?? 0, resolvida = row.resolvedAt && row.resolvedAt <= hoje ? row.resolvedAt : null, prazo = new Date(Date.parse(`${row.createdAt}T00:00:00Z`) + row.targetDays * DIA).toISOString().slice(0, 10);
        return [row.id, row.cityId, gre(row.greId), origem(row), row.createdAt, primeiroDia(row.createdAt), prazo, resolvida, resolvida ? diasEntre(row.createdAt, resolvida) : null, row.category, row.userType, canalDe(row, km), faixasDistancia[faixaDistancia(km)], faixaDistancia(km) + 1]; }) },
    { arquivo: 'coworkings.csv', cabecalho: ['Unidade', 'Código IBGE', 'GRE', 'Mesas'], linhas: institucional.coworkUnits.map(row => [nomeCidade.get(row.cityId) ?? row.name, row.cityId, gre(row.greId), row.desks]) },
    { arquivo: 'coworkings-meses.csv', cabecalho: ['Unidade', 'Mês', 'Horas disponíveis', 'Horas usadas', 'Custo'],
      linhas: institucional.coworkMonths.filter(row => row.month <= mesHoje).map(row => { const unidade = unidades.get(row.unitId)!;
        return [nomeCidade.get(unidade.cityId) ?? unidade.name, primeiroDia(row.month), row.availableDeskHours, usoPorMes.get(row.id)?.horas ?? 0, centavos(custoCoworking.get(`${unidade.cityId}:${row.month}`) ?? 0)]; }) },
    { arquivo: 'coworkings-usuarios.csv', cabecalho: ['Unidade', 'Mês', 'Profissional'],
      linhas: institucional.coworkMonths.filter(row => row.month <= mesHoje).flatMap(row => { const unidade = unidades.get(row.unitId)!; return [...new Set(usoPorMes.get(row.id)?.pessoas ?? [])].map(p => [nomeCidade.get(unidade.cityId) ?? unidade.name, primeiroDia(row.month), p]); }) },
  ];
}
