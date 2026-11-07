import type { Dataset } from '../../domain/types';
import { municipiosSp } from '../../domain/municipios';
import { mesesAteData } from '../../domain/gestao';
import { ESTADO, INDICADORES, camaraDaChave, fotoPresidencia, insumosPresidencia, lugarDaChave, paineisResumo } from '../../domain/presidencia';
import type { FotoPresidencia, Indicador } from '../../domain/presidencia';
import { brasil, contasPublicadas, registrosNovos, ufs } from '../../domain/publico-pais';
import { camaras } from '../../painel/analise';
import { metasPadrao } from '../../cockpit/leitura';
import { fimDoMes, nomesMes } from '../gestao/dados';
import type { Dados } from '../gestao/dados';
import type { Celula } from '../csv';

/*
 * Tabelas do pacote Power BI do painel da Presidência (07/11/2026). O centro é a foto: os indicadores dos seis painéis no último
 * dia de cada mês, em partes (numerador e denominador), pelo lugar que o painel de origem conhece e pela câmara, exatamente como a
 * página Resumo do HTML guarda (`fotoPresidencia`). O período dos fluxos é o padrão do painel, 12 meses.
 * A data de referência vai de 12 meses antes de hoje até hoje; as fotos começam 12 meses antes da primeira data, para a série de
 * 13 meses e a comparação com um ano antes. Ao lado, os dados públicos reais da página No país.
 */
export const PERIODO_DA_FOTO = 12;
/** Nome do painel de cada indicador, como no HTML. */
export const NOME_DO_PAINEL: Record<string, string> = { empresas: 'Empresas', profissionais: 'Profissionais', fiscalizacao: 'Fiscalização', financeiro: 'Financeiro', atendimento: 'Atendimento', conselho: 'Colegiados' };
/**
 * Como a medida lê cada indicador: pela soma dos municípios; pela soma das regionais (o município segue a sua regional); pelo estado
 * sem filtro e pela regional com filtro, porque as empresas não se somam entre lugares; ou só pelo estado.
 */
export const leituraDe = (ind: Indicador) => ind.lugar === 'municipio' ? 'Município' : ind.lugar === 'estado' ? 'Estado' : ind.soma ? 'Regional' : 'Estado e regional';
export const nivelDaChave = (lugar: string, ind: Indicador) => lugar === ESTADO ? 'Estado' : ind.lugar === 'municipio' ? 'Município' : 'Regional';

/** As datas de referência (os 12 fins de mês antes de hoje e hoje) e as datas das fotos (mais 12 meses para trás). */
export function datasDaPresidencia(dataset: Dataset) {
  const hoje = dataset.snapshotDate, fim = (month: string) => { const d = fimDoMes(month); return d > hoje ? hoje : d; };
  return { referencia: mesesAteData(hoje, 13).map(fim), fotos: mesesAteData(hoje, 25).map(fim) };
}

const porBase = new WeakMap<Dataset, { fotos: Map<string, FotoPresidencia>; tabelas: Dados[] }>();
/** As fotos de cada fim de mês, calculadas uma vez por base (cada uma leva de dois a quatro segundos). */
export function fotosDaPresidencia(dataset: Dataset): Map<string, FotoPresidencia> { return montado(dataset).fotos; }
export function dadosPresidencia(dataset: Dataset): Dados[] { return montado(dataset).tabelas; }

function montado(dataset: Dataset) {
  let valor = porBase.get(dataset);
  if (!valor) {
    const fotos = new Map(datasDaPresidencia(dataset).fotos.map(data => [data, fotoPresidencia(insumosPresidencia(dataset, data, PERIODO_DA_FOTO))]));
    valor = { fotos, tabelas: montar(dataset, fotos) };
    porBase.set(dataset, valor);
  }
  return valor;
}

const rotuloMes = (data: string) => `${nomesMes[Number(data.slice(5, 7)) - 1]}/${data.slice(2, 4)}`;

function montar(dataset: Dataset, fotos: Map<string, FotoPresidencia>): Dados[] {
  const hoje = dataset.snapshotDate, { referencia } = datasDaPresidencia(dataset);
  const municipios = municipiosSp(dataset), greDe = new Map(municipios.map(row => [row.id, row.greId]));
  const nomeGre = new Map(dataset.gres.map(row => [row.id, row.name])), gre = (id: string | undefined) => (id ? nomeGre.get(id) : '') ?? '';

  // A foto: uma linha por data, indicador, lugar e câmara, com o numerador e o denominador.
  const foto: Celula[][] = [];
  for (const [data, f] of fotos) for (const ind of INDICADORES) for (const [chave, p] of f.partes[ind.id]) {
    const lugar = lugarDaChave(chave), nivel = nivelDaChave(lugar, ind);
    foto.push([data, ind.id, nivel, nivel === 'Estado' ? '' : nivel === 'Município' ? gre(greDe.get(lugar)) : gre(lugar), nivel === 'Município' ? lugar : '', camaraDaChave(chave), p.n, p.d]);
  }

  return [
    { arquivo: 'regionais.csv', cabecalho: ['GRE', 'Ordem'], linhas: dataset.gres.map((row, i) => [row.name, i + 1]) },
    { arquivo: 'municipios.csv', cabecalho: ['Código IBGE', 'Município', 'GRE'], linhas: municipios.map(row => [row.id, row.nome, gre(row.greId)]) },
    { arquivo: 'camaras.csv', cabecalho: ['Câmara', 'Ordem'], linhas: camaras.map((camara, i) => [camara, i + 1]) },
    { arquivo: 'indicadores.csv', cabecalho: ['Indicador', 'Nome', 'Painel', 'Ordem do painel', 'Unidade', 'Tipo', 'Leitura', 'Divide por câmara', 'Sobe é bom', 'Meta', 'Principal', 'Ordem'],
      linhas: INDICADORES.map((ind, i) => [ind.id, ind.nome, NOME_DO_PAINEL[ind.painel], paineisResumo.indexOf(ind.painel) + 1, ind.unidade, ind.tipo, leituraDe(ind), ind.camara, ind.sobeBom,
        ind.meta ? metasPadrao[ind.meta] / 100 : null, Boolean(ind.principal), i + 1]) },
    { arquivo: 'datas-referencia.csv', cabecalho: ['Data', 'Rótulo'], linhas: referencia.map(data => [data, `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}${data === hoje ? ' (hoje)' : ''}`]) },
    { arquivo: 'datas-das-fotos.csv', cabecalho: ['Data'], linhas: [...fotos.keys()].map(data => [data]) },
    { arquivo: 'meses-da-serie.csv', cabecalho: ['Data', 'Rótulo', 'Ordem'], linhas: [...fotos.keys()].map((data, i) => [data, rotuloMes(data), i + 1]) },
    { arquivo: 'foto.csv', cabecalho: ['Data', 'Indicador', 'Nível', 'GRE', 'Código IBGE', 'Câmara', 'N', 'D'], linhas: foto },

    // No país: só dados públicos reais.
    { arquivo: 'ufs.csv', cabecalho: ['UF', 'Profissionais ativos', 'População', 'Por 100 mil habitantes', 'Ativos entre os registros (%)', 'Mulheres (%)'],
      linhas: ufs.map(row => [row.uf, row.ativos, row.populacao, row.por100mil, row.pctAtivos, row.pctMulheres]) },
    { arquivo: 'pais.csv', cabecalho: ['Profissionais ativos', 'População', 'Mulheres (%)'], linhas: [[brasil.ativos, brasil.populacao, brasil.pctMulheres]] },
    { arquivo: 'exercicios.csv', cabecalho: ['Ano', 'Receita realizada', 'Despesa paga', 'Dotação', 'Encerrado'],
      linhas: contasPublicadas.exercicios.map(row => [Number(row.ano), row.receita, row.paga, row.dotacao, row.ano !== contasPublicadas.aberto]) },
    { arquivo: 'contas-de-receita.csv', cabecalho: ['Conta', 'Valor', 'Parte (%)', 'Ordem'], linhas: contasPublicadas.contas.map((row, i) => [row.nome, row.valor, row.parte, i + 1]) },
    { arquivo: 'registros-novos.csv', cabecalho: ['Ano', 'No país', 'No Crea-SP'], linhas: registrosNovos.serie.map(row => [Number(row.ano), row.brasil, row.sp]) },
  ];
}
