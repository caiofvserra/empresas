import ativosUf from '../../public/data/engineer-statistics/confea-uf.json';
import situacaoUf from '../../public/data/engineer-statistics/confea-situacao-uf.json';
import generoUf from '../../public/data/engineer-statistics/confea-genero.json';
import populacaoUf from '../../public/data/engineer-statistics/populacao-uf.json';
import registrosAno from '../../public/data/engineer-statistics/confea-registros-ano.json';
import orgaoMaquina from '../../public/data/engineer-statistics/orgao-maquina.json';

/**
 * Dados públicos reais do Crea-SP no país (07/11/2026, painel da Presidência): o Confea com a população do IBGE, os registros novos
 * por ano e a receita e a despesa publicadas no Portal da Transparência. Ficam fora de `cockpit/publico.ts` para o pacote Power BI
 * (que roda no Node) ler os mesmos números que a página No país.
 */
export interface Fonte { nome: string; url: string; data: string }
const UF = ['RO', 'AC', 'AM', 'RR', 'PA', 'AP', 'TO', 'MA', 'PI', 'CE', 'RN', 'PB', 'PE', 'AL', 'SE', 'BA', 'MG', 'ES', 'RJ', 'SP', 'PR', 'SC', 'RS', 'MS', 'MT', 'GO', 'DF'];
const UF_CODE = ['11', '12', '13', '14', '15', '16', '17', '21', '22', '23', '24', '25', '26', '27', '28', '29', '31', '32', '33', '35', '41', '42', '43', '50', '51', '52', '53'];
export interface UfRow { uf: string; ativos: number; populacao: number; por100mil: number; pctAtivos: number | null; pctMulheres: number | null }
const population = new Map(populacaoUf.data.valores.map(row => [row.ufCodigo, row.valor]));
const situation = new Map(situacaoUf.data.valores.map(row => [row.ufCodigo, row.percentualAtivos]));
const gender = new Map(generoUf.data.valores.map(row => [row.ufCodigo, row.percentualFeminino]));
export const ufs: UfRow[] = ativosUf.data.valores.map(row => { const residents = population.get(row.ufCodigo) ?? 0;
  return { uf: UF[UF_CODE.indexOf(row.ufCodigo)] ?? row.ufCodigo, ativos: row.valor, populacao: residents, por100mil: residents ? row.valor / residents * 100000 : 0, pctAtivos: situation.get(row.ufCodigo) ?? null, pctMulheres: gender.get(row.ufCodigo) ?? null }; });
export const fonteConfea: Fonte = { nome: 'Confea SIC × IBGE (agregado 6579)', url: ativosUf.meta.snapshot.consultaUrl, data: ativosUf.meta.snapshot.capturadoEm };
export const brasil = { ativos: ufs.reduce((sum, row) => sum + row.ativos, 0), populacao: ufs.reduce((sum, row) => sum + row.populacao, 0), pctMulheres: generoUf.data.brasil ? generoUf.data.brasil.percentualFeminino : null };

const nacional = registrosAno.data.series.find(row => row.id === 'nacional')!, sp = registrosAno.data.series.find(row => row.id === 'crea-sp-decada')!;
export const registrosNovos = { fonte: { nome: 'Confea SIC · registros profissionais novos por ano', url: registrosAno.meta.snapshot.consultaUrl, data: registrosAno.meta.snapshot.capturadoEm } as Fonte,
  serie: nacional.valores.filter(row => /^\d{4}$/.test(row.periodo) && row.periodo >= '2010').map(row => ({ ano: row.periodo, brasil: row.valor, sp: sp.valores.find(item => item.periodo === row.periodo)?.valor ?? null })) };

/**
 * Receita e despesa publicadas pelo Crea-SP no Portal da Transparência, de 2013 a 2026 (07/11/2026, painel da Presidência), copiadas
 * do anexo de dados do repositório engineer-statistics. A receita é a realizada no exercício; a despesa é a paga, com a dotação do
 * orçamento ao lado. O exercício de 2026 não estava encerrado na última coleta.
 */
type ItemOrgao = { id: string; rotulo: string; valor: number; pct: number | null; ano: string; medidas?: { id: string; valor: number }[] };
const blocoOrgao = (id: string) => (orgaoMaquina.data.blocos.find(row => row.id === id)?.itens ?? []) as ItemOrgao[];
const receitasAno = new Map(blocoOrgao('receita-por-exercicio').map(row => [row.ano, row.valor]));
export const contasPublicadas = {
  fonte: { nome: 'Portal da Transparência do Crea-SP · receita e execução do orçamento', url: 'https://transparencia.creasp.org.br', data: orgaoMaquina.meta.atualizadoEm } as Fonte,
  /** O último exercício da série, ainda aberto na data da coleta. */
  aberto: '2026', coletaAte: '2026-09-08',
  exercicios: blocoOrgao('execucao-orcamentaria').map(row => { const medida = (id: string) => row.medidas?.find(m => m.id === id)?.valor ?? null;
    return { ano: row.ano, receita: receitasAno.get(row.ano) ?? null, paga: row.valor, dotacao: medida('dotacao'), empenhada: medida('empenhada') }; }),
  /** Parte da receita de 2013 a 2026 que veio de cada uma das maiores contas (a de ART primeiro). */
  contas: blocoOrgao('contas-de-receita').map(row => ({ nome: row.rotulo.replace(/^[\d.]+\s+/, ''), valor: row.valor, parte: row.pct })),
};
