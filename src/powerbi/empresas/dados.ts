import type { Dataset } from '../../domain/types';
import { defaultFilters } from '../../domain/types';
import { datasReferencia, datasetAt, fiscalizacaoAt } from '../../domain/tempo';
import { selectEnterpriseScope } from '../../enterprise-v10/filters';
import { buildEnterpriseModel } from '../../enterprise-v10/model';
import { buildFiscalizacao } from '../../painel/fiscalizacao';
import { buildProfissionais } from '../../domain/profissionais';
import { municipiosSp } from '../../domain/municipios';
import { classeDoEstabelecimento, cobertura } from '../../observatorio/norte';
import { camaraDaEmpresa, camaraPorCnae, devedoras, quadroTecnico } from '../../painel/analise';
import { cadastroIncompleto, primeirosRegistros, ritmoEconomico } from '../../domain/empresas';
import { permanenciaCoorte } from '../../domain/mercado';
import { mainEstablishments } from '../../gestao-v14/metrics';
import { entradasSaidas } from '../../cockpit/medidas';
import { buildInstalacoes, quadroInstalacoes } from '../../domain/frentes';
import { buildCredenciamentos, buildJucesp, buildSociosPf, buildVinculos, quadroCredenciamentos, quadroDenominacao, quadroJucesp, quadroSociosPf, quadroVinculos } from '../../domain/parcerias';
import { exportaCredenciamentos, exportaDenominacao, exportaInstalacoes, exportaJucesp, exportaSociosPf, exportaVinculos } from '../../empresas/blocos';
import type { CockpitCtx } from '../../cockpit/contexto';
import type { Celula } from '../csv';

/** Uma tabela de dados do pacote: o nome do CSV, o cabeçalho e as linhas. */
export interface Dados { arquivo: string; cabecalho: string[]; linhas: Celula[][] }

const nomesClasse = { Sim: 'Registro obrigatório', Passível: 'Registro a analisar' } as const;
/** Situação no cadastro do estabelecimento do mercado, com os nomes da legenda do painel. */
export const nomesSituacao = { 'Registro ou visto vigente': 'Com registro ou visto', 'Só histórico': 'Só teve registro no passado', 'Sem correspondência': 'Nunca apareceu no cadastro' } as const;
const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const primeiroDia = (mes: string) => `${mes.slice(0, 7)}-01`;
const fimDoMes = (ano: number, mes: number) => new Date(Date.UTC(ano, mes, 0)).toISOString().slice(0, 10);
/** Último dia do mês `n` meses antes da data. */
const fimDoMesAntes = (data: string, n: number) => fimDoMes(Number(data.slice(0, 4)), Number(data.slice(5, 7)) - n);

/**
 * Tabelas do cenário de demonstração para o pacote Power BI do painel de Empresas, em esquema estrela (ADR 0001 e 0002).
 * Dimensões: regionais, municípios, empresas, estabelecimentos, calendário, datas de referência e período.
 * Fotos (estoques e taxas resolvidos em cada fim de mês, pelas funções do protótipo): empresas e estabelecimentos.
 * Fatos com data (somados no período em DAX): entradas e saídas, ARTs, emprego formal.
 * Demonstração das parcerias ("!"): uma tabela longa com os números dos blocos da página Vínculos.
 */
export function dadosEmpresas(dataset: Dataset): Dados[] {
  const hoje = dataset.snapshotDate, escolhiveis = [...datasReferencia(dataset), hoje];
  // A foto cobre as datas que se podem escolher e os 12 meses antes da primeira, para a comparação com o ano anterior.
  const fotos = [...new Set([...Array.from({ length: 12 }, (_, i) => fimDoMesAntes(escolhiveis[0], 12 - i)), ...escolhiveis])].filter(data => `${data.slice(0, 7)}` >= dataset.months[0]);
  const fBase = buildFiscalizacao(dataset), camara = camaraDaEmpresa(dataset), matriz = mainEstablishments(dataset);
  const municipios = municipiosSp(dataset);
  const classe = (row: Dataset['establishments'][number]) => { const value = classeDoEstabelecimento(dataset, row); return value ? nomesClasse[value] : ''; };
  const cnaes = new Map(dataset.cnaes.map(row => [row.code, row]));
  const naLista = (code: string) => ['Relacionado', 'Depende de análise'].includes(cnaes.get(code)?.classification ?? '');

  const fotoEmpresas: Celula[][] = [], fotoEstab: Celula[][] = [];
  for (const data of fotos) {
    const view = datasetAt(dataset, data), f = fiscalizacaoAt(fBase, data), scope = selectEnterpriseScope(view, { ...defaultFilters, period: 12 }), model = buildEnterpriseModel(scope);
    const ativas = new Set(model.metadata.activeCompanyIds), devedor = devedoras(model), comRt = new Set(model.metrics.rtCoverage.companyIds);
    const qt = quadroTecnico(scope, model, f, buildProfissionais(view)), saiu = new Set(qt.rtBaixado), semVinculo = new Set(qt.semVinculo), inativo = new Set(qt.rtInativo);
    const incompleto = new Set(cadastroIncompleto(scope, model).ids), p12 = permanenciaCoorte(view, scope.companyIds, 12), coorte = new Set(p12.coorte), continua = new Set(p12.permanecem);
    // Contagens de estabelecimentos e vistos como em `contagens` (observatorio/norte): registros vigentes na data.
    const estabPorEmpresa = new Map<string, Set<string>>(), vistosPorEmpresa = new Map<string, number>();
    for (const row of scope.registrations) if (row.startedAt <= data && (!row.ceasedAt || row.ceasedAt > data) && row.status === 'Ativo') {
      estabPorEmpresa.set(row.companyId, (estabPorEmpresa.get(row.companyId) ?? new Set()).add(row.establishmentId));
      if (row.type === 'Visto') vistosPorEmpresa.set(row.companyId, (vistosPorEmpresa.get(row.companyId) ?? 0) + 1);
    }
    for (const id of [...new Set([...ativas, ...coorte])].sort())
      fotoEmpresas.push([data, primeiroDia(data), id, ativas.has(id), ativas.has(id) && devedor.has(id), comRt.has(id), saiu.has(id), semVinculo.has(id), inativo.has(id), incompleto.has(id), coorte.has(id), continua.has(id), estabPorEmpresa.get(id)?.size ?? 0, vistosPorEmpresa.get(id) ?? 0]);
    // Estabelecimentos: no mercado (a base da parte registrada) e com registro ativo (as abertas que já se registraram).
    const c = cobertura(scope, model), situacao = new Map<string, string>();
    for (const porClasse of Object.values(c.porClasse)) for (const [nome, ids] of Object.entries(porClasse)) for (const id of ids) situacao.set(id, nomesSituacao[nome as keyof typeof nomesSituacao]);
    const ativo = new Set(view.registrations.filter(row => row.status === 'Ativo').map(row => row.establishmentId));
    // Só entram os estabelecimentos com atividade da lista que estão no mercado ou têm registro ativo: os demais não contam em nenhuma medida.
    for (const row of view.establishments) if (classe(row) && (situacao.has(row.id) || ativo.has(row.id))) fotoEstab.push([data, row.id, situacao.has(row.id), situacao.get(row.id) ?? '', ativo.has(row.id)]);
  }

  // Entradas e saídas, uma linha por empresa, mês e movimento, como `history.monthly` (o modelo de 36 meses na data de hoje).
  const historico = buildEnterpriseModel(selectEnterpriseScope(dataset, { ...defaultFilters, period: dataset.months.length }));
  const primeiro = primeirosRegistros(dataset), movimentos: Celula[][] = [];
  for (const row of entradasSaidas(historico, fBase)) {
    const viaFiscal = new Set(row.viaFiscalizacao);
    for (const id of [...row.viaFiscalizacao, ...row.demais]) movimentos.push([id, primeiroDia(row.month), 'Entrada', primeiro.get(id)?.slice(0, 7) === row.month, viaFiscal.has(id)]);
    for (const id of row.saidas) movimentos.push([id, primeiroDia(row.month), 'Saída', false, false]);
  }

  const emprego: Celula[][] = [];
  for (const gre of dataset.gres) for (const ponto of ritmoEconomico(dataset, gre.id, null, dataset.months.length).pontos) emprego.push([primeiroDia(ponto.month), gre.name, ponto.emprego]);

  return [
    { arquivo: 'regionais.csv', cabecalho: ['GRE', 'Ordem'], linhas: dataset.gres.map((gre, i) => [gre.name, i + 1]) },
    { arquivo: 'municipios.csv', cabecalho: ['Código IBGE', 'Município', 'GRE'], linhas: municipios.map(row => [row.id, row.nome, dataset.gres.find(gre => gre.id === row.greId)?.name ?? '']) },
    { arquivo: 'empresas.csv', cabecalho: ['Empresa', 'Raiz do CNPJ', 'Razão social', 'Porte', 'Câmara', 'Situação na Receita', 'Código IBGE', 'Só visto (sede fora de SP)'],
      linhas: dataset.companies.map(row => { const sede = matriz.get(row.id); return [row.id, row.rootCnpj, row.name, row.size, camara.get(row.id) ?? '', sede?.rfbStatus ?? '', sede?.cityId ?? '', row.externalOnly]; }) },
    { arquivo: 'estabelecimentos.csv', cabecalho: ['Estabelecimento', 'Empresa', 'CNPJ', 'Matriz ou filial', 'Código IBGE', 'Atividade principal', 'Atividade da lista', 'Câmara da atividade', 'Classe', 'Aberto em', 'Situação na Receita'],
      linhas: dataset.establishments.map(row => { const enquadra = naLista(row.cnaeMain) ? row.cnaeMain : row.cnaeSecondary.find(naLista) ?? '';
        return [row.id, row.companyId, row.cnpj, row.branch, row.cityId, row.cnaeMain, enquadra ? `${enquadra} ${cnaes.get(enquadra)?.label ?? ''}`.trim() : '', enquadra ? camaraPorCnae[enquadra] ?? 'Sem câmara definida' : '', classe(row), row.openedAt, row.rfbStatus]; }) },
    { arquivo: 'calendario.csv', cabecalho: ['Mês', 'Rótulo', 'Trimestre', 'Ano', 'Ordem'], linhas: dataset.months.map((mes, i) => [primeiroDia(mes), `${meses[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`, `${mes.slice(0, 4)}-T${Math.floor((Number(mes.slice(5, 7)) - 1) / 3) + 1}`, Number(mes.slice(0, 4)), i + 1]) },
    { arquivo: 'datas-referencia.csv', cabecalho: ['Data', 'Rótulo'], linhas: escolhiveis.map(data => [data, `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}${data === hoje ? ' (hoje)' : ''}`]) },
    { arquivo: 'datas-das-fotos.csv', cabecalho: ['Data'], linhas: fotos.map(data => [data]) },
    { arquivo: 'foto-empresas.csv', cabecalho: ['Data', 'Mês', 'Empresa', 'Registrada', 'Anuidade vencida', 'Com RT', 'RT saiu sem substituto', 'Sem vínculo de RT', 'RT cancelado ou interrompido', 'Cadastro incompleto', 'Registrada 12 meses antes', 'Continua registrada', 'Estabelecimentos registrados', 'Vistos'], linhas: fotoEmpresas },
    { arquivo: 'foto-estabelecimentos.csv', cabecalho: ['Data', 'Estabelecimento', 'No mercado', 'Situação no cadastro', 'Registro ativo'], linhas: fotoEstab },
    { arquivo: 'entradas-saidas.csv', cabecalho: ['Empresa', 'Mês', 'Movimento', 'Primeira vez', 'Após fiscalização'], linhas: movimentos },
    { arquivo: 'arts.csv', cabecalho: ['ART', 'Empresa', 'Data', 'Mês', 'Valor', 'Modalidade'], linhas: dataset.arts.filter(row => row.date <= hoje).map(row => [row.id, row.companyId, row.date, primeiroDia(row.date), row.value, row.modality]) },
    { arquivo: 'emprego.csv', cabecalho: ['Mês', 'GRE', 'Empregados'], linhas: emprego },
    { arquivo: 'parcerias.csv', cabecalho: ['Bloco', 'Grupo', 'Série', 'Valor', 'Ordem'], linhas: parcerias(dataset) },
  ];
}

/**
 * Os blocos da página Vínculos, na ordem da página: o nome (o mesmo do protótipo) e o acordo de que dependem; sem acordo, o
 * bloco usa fontes abertas e não leva "!". `modelo.ts` e `paginas.ts` leem esta lista.
 */
export const BLOCOS_PARCERIA = [
  { id: 'socios', bloco: 'Sócios que são profissionais', acordo: 'Receita Federal (CPF completo dos sócios)' },
  { id: 'nome', bloco: 'Nome com engenharia e diretoria', acordo: 'Receita Federal (CPF completo dos sócios)' },
  { id: 'instalacoes', bloco: 'Usinas, postos, minas e financiamentos', acordo: '' },
  { id: 'empregados', bloco: 'Empregados técnicos por empresa', acordo: 'Ministério do Trabalho (RAIS identificada)' },
  { id: 'credenciadas', bloco: 'Credenciadas no DETRAN-SP e no INMETRO', acordo: 'DETRAN-SP e INMETRO' },
  { id: 'jucesp', bloco: 'Engenharia incluída no contrato social', acordo: 'Junta Comercial do Estado de São Paulo (JUCESP)' },
] as const;
/** Nome da medida de um bloco da página Vínculos: com "!" na frente quando depende de acordo. */
export const medidaDoBloco = (bloco: typeof BLOCOS_PARCERIA[number]) => `${bloco.acordo ? '! ' : ''}${bloco.bloco}`;

/**
 * Os blocos da página Vínculos ("!", dependem de acordo) na data de hoje, em formato longo: bloco, grupo (a linha do gráfico),
 * série (a cor) e valor. Vêm das mesmas tabelas que o painel exporta em CSV, então batem com a tela.
 */
function parcerias(dataset: Dataset): Celula[][] {
  const profissionais = buildProfissionais(dataset), scope = selectEnterpriseScope(dataset, { ...defaultFilters, period: 12 }), ids = scope.companyIds, socios = buildSociosPf(dataset, profissionais);
  const ctx = { dataset, cidadeId: null, tokens: { good: '', bad: '', muted: '' }, frentes: { instalacoes: quadroInstalacoes(buildInstalacoes(dataset), dataset, null) },
    parcerias: { sociosPf: quadroSociosPf(socios, dataset, profissionais, ids, null), denominacao: quadroDenominacao(socios, dataset, profissionais, ids, null), vinculos: quadroVinculos(buildVinculos(dataset), dataset, ids, null),
      credenciamentos: quadroCredenciamentos(buildCredenciamentos(dataset), dataset, ids, null), jucesp: quadroJucesp(buildJucesp(dataset), dataset, ids, null) } } as unknown as CockpitCtx;
  const tabelas = { socios: exportaSociosPf(ctx), nome: exportaDenominacao(ctx), instalacoes: exportaInstalacoes(ctx), empregados: exportaVinculos(ctx), credenciadas: exportaCredenciamentos(ctx), jucesp: exportaJucesp(ctx) };
  const colunas: Record<keyof typeof tabelas, [number[], number]> = { socios: [[2, 3], 1], nome: [[1], 1], instalacoes: [[2, 3, 4], 1], empregados: [[1, 2], 1], credenciadas: [[2, 3, 4], 2], jucesp: [[3, 4, 5], 1] };
  const linhas: Celula[][] = [];
  for (const { id, bloco } of BLOCOS_PARCERIA) {
    const tabela = tabelas[id], [valores, chave] = colunas[id];
    tabela.linhas().forEach((linha, ordem) => {
      const grupo = linha.slice(0, chave).join(', ');
      for (const coluna of valores) linhas.push([bloco, grupo, tabela.cabecalho[coluna], Number(linha[coluna]), ordem + 1]);
    });
  }
  return linhas;
}
