import type { Dataset } from '../../domain/types';
import { municipiosSp } from '../../domain/municipios';
import { calendarioEntregas, emPorcentagem, exercicioPadrao, exerciciosNaData, indicadorPorCodigo, indicadorRegional, indicadoresDoCrea, metricaPorCodigo, metricas, nomeCurtoIndicador, porRegional,
  quadroSistema, referencias2021, subprogramas } from '../../domain/sistema-confea';
import type { QuadroSistema } from '../../domain/sistema-confea';
import type { Dados } from '../gestao/dados';
import type { Celula } from '../csv';

/*
 * Tabelas do pacote Power BI do painel de Indicadores do Sistema (10/11/2026), lidas do mesmo domínio que as páginas em HTML
 * (`quadroSistema`), na data do cenário. Cada exercício desde 2022 entra inteiro; o do ano da data entra parcial, até ela.
 * As métricas vão numa tabela longa (exercício, nível, regional, código, valor): o nível "Conselho" é o número que vai para o Confea;
 * o nível "Regional" só existe nas métricas que se dividem por regional. Os indicadores vão já calculados pela fórmula da planilha,
 * do mesmo jeito, como o painel mostra: as taxas em % (28,1 é 28,1%; a medida divide por 100), as médias como saem. Os números do
 * Sumário de 2025 levam a marca Real. O CSV guarda duas casas decimais, por isso as taxas não vão em fração.
 */
/** Nome curto das métricas que viram categoria de gráfico: as modalidades, as capitulações, os motivos sem êxito e as contas do custo. */
const NOME_CURTO: Record<number, string> = {
  11: 'Agrimensura', 12: 'Agronomia', 13: 'Civil', 14: 'Eletricista', 15: 'Geologia e Minas', 16: 'Mecânica e Metalúrgica', 17: 'Química', 18: 'Segurança do Trabalho',
  39: 'Art. 6º, alínea a', 40: 'Art. 6º, alínea b', 41: 'Art. 6º, alínea c', 42: 'Art. 6º, alínea d', 43: 'Art. 6º, alínea e', 44: 'Art. 16', 45: 'Art. 55', 46: 'Art. 58', 47: 'Art. 59', 48: 'Art. 82',
  49: 'ART (art. 1º da Lei 6.496/77)', 50: 'Outras (arts. 13, 14, 17, 60, 67)',
  153: 'Verbas indenizatórias', 155: 'Salários, encargos e benefícios', 156: 'Capacitação', 157: 'Seguro, calibração e manutenção de equipamentos', 158: 'Telefonia móvel dos fiscais',
  159: 'Manutenção, seguro, estacionamento e pedágio', 160: 'Aluguel de veículos', 161: 'Combustível',
};
const MOTIVOS = ['Erro de capitulação', 'Descrição insuficiente dos fatos', 'Excesso de exação', 'Falta de motivo ou motivação', 'Prescrição', 'Outros motivos'];
MOTIVOS.forEach((motivo, i) => { NOME_CURTO[67 + i] = motivo; NOME_CURTO[105 + i] = motivo; });
export const nomeCurtoMetrica = (codigo: number) => NOME_CURTO[codigo] ?? metricaPorCodigo.get(codigo)!.nome;

/** Os quadros de cada exercício, na data do cenário, do Conselho inteiro: as regionais vêm dentro de cada um. */
export function quadrosDoPacote(dataset: Dataset): QuadroSistema[] {
  const hoje = dataset.snapshotDate;
  return exerciciosNaData(hoje).map(ex => quadroSistema(dataset, hoje, ex.ano, null));
}

const porBase = new WeakMap<Dataset, Dados[]>();
export function dadosIndicadores(dataset: Dataset): Dados[] {
  let tabelas = porBase.get(dataset);
  if (!tabelas) { tabelas = montar(dataset); porBase.set(dataset, tabelas); }
  return tabelas;
}

function montar(dataset: Dataset): Dados[] {
  const hoje = dataset.snapshotDate, padrao = exercicioPadrao(hoje), quadros = quadrosDoPacote(dataset);
  const nomeGre = new Map(dataset.gres.map(row => [row.id, row.name])), gre = (id: string) => nomeGre.get(id) ?? id;
  const valores: Celula[][] = [], indicadores: Celula[][] = [], situacao: Celula[][] = [], conferencias: Celula[][] = [], acoes: Celula[][] = [];
  for (const q of quadros) {
    const ano = q.exercicio.ano;
    for (const m of metricas) valores.push([ano, 'Conselho', '', m.codigo, q.estado.get(m.codigo) ?? null, q.real(m.codigo)]);
    for (const r of q.regionais) for (const m of metricas) if (porRegional(m.codigo)) valores.push([ano, 'Regional', gre(r.greId), m.codigo, r.metricas.get(m.codigo) ?? null, false]);
    for (const c of indicadoresDoCrea) {
      const v = q.indicadores.get(c)!;
      indicadores.push([ano, 'Conselho', '', c, v.valor, v.valor !== null, v.falta.join(', ')]);
    }
    for (const r of q.regionais) for (const c of indicadoresDoCrea) if (indicadorRegional(c)) {
      const v = r.indicadores.get(c)!;
      indicadores.push([ano, 'Regional', gre(r.greId), c, v.valor, v.valor !== null, v.falta.join(', ')]);
    }
    for (const m of metricas) situacao.push([ano, m.codigo, q.situacao.get(m.codigo) ?? 'Vazia']);
    q.conferencias.forEach((c, i) => conferencias.push([ano, c.tipo === 'soma' ? 'Soma' : 'Coerência', c.texto, c.metricas.join(', '), c.situacao, c.diferenca, i + 1]));
    for (const [id, v] of q.municipios) acoes.push([ano, id, v.acoes, v.autos]);
  }
  const ordemSub = (sub: string) => subprogramas.indexOf(sub as typeof subprogramas[number]) + 1;
  return [
    { arquivo: 'regionais.csv', cabecalho: ['GRE', 'Ordem'], linhas: dataset.gres.map((row, i) => [row.name, i + 1]) },
    { arquivo: 'municipios.csv', cabecalho: ['Código IBGE', 'Município', 'GRE'], linhas: municipiosSp(dataset).map(row => [row.id, row.nome, gre(row.greId)]) },
    { arquivo: 'exercicios.csv', cabecalho: ['Ano', 'Rótulo', 'Parcial', 'Padrão', 'Infrações julgadas em 180 dias', 'Éticos julgados em 360 dias', 'Registro em 30 dias'],
      linhas: quadros.map(q => [q.exercicio.ano, q.exercicio.parcial ? `${q.exercicio.ano}*` : String(q.exercicio.ano), q.exercicio.parcial, q.exercicio.ano === padrao, q.fora.julgados180, q.fora.etica360, q.fora.registro30]) },
    { arquivo: 'exercicios-da-serie.csv', cabecalho: ['Ano', 'Rótulo'], linhas: quadros.map(q => [q.exercicio.ano, q.exercicio.parcial ? `${q.exercicio.ano}*` : String(q.exercicio.ano)]) },
    { arquivo: 'metricas.csv', cabecalho: ['Código', 'Rótulo', 'Nome', 'Nome curto', 'Subprograma', 'Ordem do subprograma', 'Tema', 'Recorte', 'Por regional', 'Definição', 'Orientação'],
      linhas: metricas.map(m => [m.codigo, `M ${m.codigo}`, m.nome, nomeCurtoMetrica(m.codigo), m.subprograma, ordemSub(m.subprograma), m.tema, m.recorte === 'exercicio' ? 'Somado no exercício' : m.recorte === 'fim' ? 'Em 31/12' : 'Na publicação', porRegional(m.codigo), m.definicao, m.orientacao]) },
    { arquivo: 'indicadores.csv', cabecalho: ['Indicador', 'Rótulo', 'Nome curto', 'Nome', 'Subprograma', 'Ordem do subprograma', 'Objetivo', 'Fórmula', 'Unidade', 'Por regional', 'Sistema em 2021', 'Sudeste em 2021'],
      linhas: indicadoresDoCrea.map(c => { const ind = indicadorPorCodigo.get(c)!, ref = referencias2021[c];
        return [c, `I ${c}`, nomeCurtoIndicador[c], ind.nome, ind.subprograma, ordemSub(ind.subprograma), ind.objetivo, ind.formula, emPorcentagem(c) ? '%' : 'número', indicadorRegional(c),
          ref?.brasil ?? null, ref?.sudeste ?? null]; }) },
    { arquivo: 'valores.csv', cabecalho: ['Ano', 'Nível', 'GRE', 'Código', 'Valor', 'Real'], linhas: valores },
    { arquivo: 'valores-indicadores.csv', cabecalho: ['Ano', 'Nível', 'GRE', 'Indicador', 'Valor', 'Sai', 'Faltam'], linhas: indicadores },
    { arquivo: 'situacao-metricas.csv', cabecalho: ['Ano', 'Código', 'Situação'], linhas: situacao },
    { arquivo: 'conferencias.csv', cabecalho: ['Ano', 'Tipo', 'Conferência', 'Métricas', 'Situação', 'Diferença', 'Ordem'], linhas: conferencias },
    { arquivo: 'acoes-municipios.csv', cabecalho: ['Ano', 'Código IBGE', 'Ações', 'Autos'], linhas: acoes },
    { arquivo: 'calendario-entregas.csv', cabecalho: ['Data', 'Ritmo', 'Entrega', 'Consequência'], linhas: calendarioEntregas(hoje).map(e => [e.data, e.ritmo, e.o_que, e.consequencia]) },
  ];
}
