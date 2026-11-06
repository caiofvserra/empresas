import type { Dataset } from '../../domain/types';
import { defaultFilters, nomePendencia, type QualityKind } from '../../domain/types';
import { datasReferencia, datasetAt, fiscalizacaoAt } from '../../domain/tempo';
import { selectEnterpriseScope } from '../../enterprise-v10/filters';
import { buildEnterpriseModel } from '../../enterprise-v10/model';
import { buildFiscalizacao } from '../../painel/fiscalizacao';
import { buildProfissionais, modalidadeAntiga, situacaoEm } from '../../domain/profissionais';
import { municipiosSp } from '../../domain/municipios';
import { classeDoEstabelecimento, cobertura } from '../../observatorio/norte';
import { camaraDaEmpresa, camaraPorCnae, camaras, devedoras, quadroTecnico } from '../../painel/analise';
import { anosDesde, cadastroIncompleto, capitalSocial, faixaDaAntiguidade, faixaDoCapital, faixasAntiguidade, faixasCapital, primeirosRegistros, ritmoEconomico } from '../../domain/empresas';
import { permanenciaCoorte } from '../../domain/mercado';
import { mainEstablishments } from '../../gestao-v14/metrics';
import { entradasSaidas } from '../../cockpit/medidas';
import { buildInstalacoes, quadroInstalacoes } from '../../domain/frentes';
import { buildCredenciamentos, buildJucesp, buildSociosPf, buildVinculos, parceriaPorId, quadroCredenciamentos, quadroDenominacao, quadroJucesp, quadroSociosPf, quadroVinculos, type ParceriaId } from '../../domain/parcerias';
import { exportaCredenciamentos, exportaDenominacao, exportaInstalacoes, exportaJucesp, exportaSociosPf, exportaVinculos } from '../../empresas/blocos';
import type { CockpitCtx } from '../../cockpit/contexto';
import type { Celula } from '../csv';

/** Uma tabela de dados do pacote: o nome do CSV, o cabeçalho e as linhas. */
export interface Dados { arquivo: string; cabecalho: string[]; linhas: Celula[][] }

const nomesClasse = { Sim: 'Registro obrigatório', Passível: 'Registro a analisar' } as const;
/** Situação no cadastro do estabelecimento do mercado, com os nomes da legenda do painel. */
export const nomesSituacao = { 'Registro ou visto vigente': 'Com registro ou visto', 'Só histórico': 'Só teve registro no passado', 'Sem correspondência': 'Nunca apareceu no cadastro' } as const;
/** Etapas do funil "Do mercado à ART", com os nomes do painel: a empresa do mercado pela situação do registro na data. */
export const situacoesNoFunil = { ativo: 'Registro ativo', inativo: 'Registro inativo', nunca: 'Nunca registrada' } as const;
/** Coortes da permanência, em meses antes da data escolhida, como no bloco "Abertas na Receita e permanência". */
export const COORTES = [3, 6, 12] as const;
const nomesMes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const primeiroDia = (mes: string) => `${mes.slice(0, 7)}-01`;
const fimDoMes = (ano: number, mes: number) => new Date(Date.UTC(ano, mes, 0)).toISOString().slice(0, 10);
/** Último dia do mês `n` meses antes da data. */
const fimDoMesAntes = (data: string, n: number) => fimDoMes(Number(data.slice(0, 4)), Number(data.slice(5, 7)) - n);
/** Modalidade da ART com o nome usado no cadastro de profissionais. */
const modalidadeDaArt = (modalidade: string) => modalidadeAntiga[modalidade] ?? modalidade;
/** Modalidade com a grafia das câmaras do Conselho ("Segurança do Trabalho"), como o rótulo do painel. */
const rotuloModalidade = (modalidade: string) => camaras.find(camara => camara.toLowerCase() === modalidade.toLowerCase()) ?? modalidade;

/**
 * As colunas da foto das empresas, na ordem do CSV. `sinal` é 0 ou 1; `texto` e `inteiro` guardam um valor. `modelo.ts` declara as
 * colunas a partir desta lista, e o laço de `dadosEmpresas` preenche cada uma pelo nome: uma coluna nova muda só estes dois lugares.
 */
export const COLUNAS_FOTO_EMPRESAS = [
  ...(['Registrada', 'Anuidade vencida', 'Com RT', 'RT saiu sem substituto', 'Sem vínculo de RT', 'RT cancelado ou interrompido', 'Cadastro incompleto'] as const).map(nome => ({ nome, tipo: 'sinal' as const })),
  ...COORTES.flatMap(meses => [{ nome: `Registrada ${meses} meses antes` as const, tipo: 'sinal' as const }, { nome: `Continua registrada desde ${meses} meses` as const, tipo: 'sinal' as const }]),
  { nome: 'No mercado do funil', tipo: 'sinal' }, { nome: 'Situação no funil', tipo: 'texto' },
  { nome: 'Tempo de registro', tipo: 'texto' }, { nome: 'Ordem do tempo de registro', tipo: 'inteiro' },
  { nome: 'Estabelecimentos registrados', tipo: 'inteiro' }, { nome: 'Vistos', tipo: 'inteiro' },
] as const;
type ColunaFoto = typeof COLUNAS_FOTO_EMPRESAS[number]['nome'];

/**
 * Tabelas do cenário de demonstração para o pacote Power BI do painel de Empresas, em esquema estrela (ADR 0001 e 0002).
 * Dimensões: regionais, municípios, empresas, estabelecimentos, modalidades, calendário e datas.
 * Fotos (estoques e taxas resolvidos em cada fim de mês, pelas funções do protótipo): empresas, estabelecimentos, pendências do
 * cadastro e profissionais ativos por município e modalidade.
 * Fatos com data (somados no período em DAX): entradas e saídas, ARTs, emprego formal e crédito ("!").
 * Demonstração das parcerias ("!"): uma tabela longa com os números dos blocos da página Vínculos.
 */
export function dadosEmpresas(dataset: Dataset): Dados[] {
  const hoje = dataset.snapshotDate, escolhiveis = [...datasReferencia(dataset), hoje];
  // A foto cobre as datas que se podem escolher e os 12 meses antes da primeira, para a comparação com o ano anterior.
  const fotos = [...new Set([...Array.from({ length: 12 }, (_, i) => fimDoMesAntes(escolhiveis[0], 12 - i)), ...escolhiveis])].filter(data => `${data.slice(0, 7)}` >= dataset.months[0]);
  const fBase = buildFiscalizacao(dataset), camara = camaraDaEmpresa(dataset), matriz = mainEstablishments(dataset), primeiro = primeirosRegistros(dataset);
  const municipios = municipiosSp(dataset);
  const classe = (row: Dataset['establishments'][number]) => { const value = classeDoEstabelecimento(dataset, row); return value ? nomesClasse[value] : ''; };
  const cnaes = new Map(dataset.cnaes.map(row => [row.code, row]));
  const naLista = (code: string) => ['Relacionado', 'Depende de análise'].includes(cnaes.get(code)?.classification ?? '');

  const fotoEmpresas: Celula[][] = [], fotoEstab: Celula[][] = [], pendencias: Celula[][] = [], profissionaisAtivos: Celula[][] = [];
  for (const data of fotos) {
    const view = datasetAt(dataset, data), f = fiscalizacaoAt(fBase, data), scope = selectEnterpriseScope(view, { ...defaultFilters, period: 12 }), model = buildEnterpriseModel(scope);
    const ativas = new Set(model.metadata.activeCompanyIds), devedor = devedoras(model), comRt = new Set(model.metrics.rtCoverage.companyIds), profissionais = buildProfissionais(view);
    const qt = quadroTecnico(scope, model, f, profissionais), saiu = new Set(qt.rtBaixado), semVinculo = new Set(qt.semVinculo), inativo = new Set(qt.rtInativo);
    const incompleto = cadastroIncompleto(scope, model), comPendencia = new Set(incompleto.ids);
    const coortes = new Map(COORTES.map(meses => { const p = permanenciaCoorte(view, scope.companyIds, meses); return [meses, { coorte: new Set(p.coorte), continua: new Set(p.permanecem) }]; }));
    // Funil "Do mercado à ART" (complianceFlow): empresas registradas ou com estabelecimento de atividade da lista.
    const jaRegistrada = new Set(scope.registrations.filter(row => row.startedAt <= scope.anchor).map(row => row.companyId));
    const noFunil = new Set(model.companyFacts.filter(row => row.active || row.eligibleEstablishments > 0).map(row => row.companyId));
    // Contagens de estabelecimentos e vistos como em `contagens` (observatorio/norte): registros vigentes na data.
    const estabPorEmpresa = new Map<string, Set<string>>(), vistosPorEmpresa = new Map<string, number>();
    for (const row of scope.registrations) if (row.startedAt <= data && (!row.ceasedAt || row.ceasedAt > data) && row.status === 'Ativo') {
      estabPorEmpresa.set(row.companyId, (estabPorEmpresa.get(row.companyId) ?? new Set()).add(row.establishmentId));
      if (row.type === 'Visto') vistosPorEmpresa.set(row.companyId, (vistosPorEmpresa.get(row.companyId) ?? 0) + 1);
    }
    const tempo = (id: string) => { const inicio = primeiro.get(id); return ativas.has(id) && inicio ? faixaDaAntiguidade(anosDesde(inicio, data)) : null; };
    const valores: Record<ColunaFoto, (id: string) => Celula> = {
      Registrada: id => ativas.has(id), 'Anuidade vencida': id => ativas.has(id) && devedor.has(id), 'Com RT': id => comRt.has(id), 'RT saiu sem substituto': id => saiu.has(id),
      'Sem vínculo de RT': id => semVinculo.has(id), 'RT cancelado ou interrompido': id => inativo.has(id), 'Cadastro incompleto': id => comPendencia.has(id),
      'Registrada 3 meses antes': id => coortes.get(3)!.coorte.has(id), 'Continua registrada desde 3 meses': id => coortes.get(3)!.continua.has(id),
      'Registrada 6 meses antes': id => coortes.get(6)!.coorte.has(id), 'Continua registrada desde 6 meses': id => coortes.get(6)!.continua.has(id),
      'Registrada 12 meses antes': id => coortes.get(12)!.coorte.has(id), 'Continua registrada desde 12 meses': id => coortes.get(12)!.continua.has(id),
      'No mercado do funil': id => noFunil.has(id),
      'Situação no funil': id => !noFunil.has(id) ? '' : ativas.has(id) ? situacoesNoFunil.ativo : jaRegistrada.has(id) ? situacoesNoFunil.inativo : situacoesNoFunil.nunca,
      'Tempo de registro': id => { const faixa = tempo(id); return faixa === null ? '' : faixasAntiguidade[faixa]; }, 'Ordem do tempo de registro': id => (tempo(id) ?? -1) + 1,
      'Estabelecimentos registrados': id => estabPorEmpresa.get(id)?.size ?? 0, Vistos: id => vistosPorEmpresa.get(id) ?? 0,
    };
    const ids = new Set([...ativas, ...noFunil, ...[...coortes.values()].flatMap(row => [...row.coorte])]);
    for (const id of [...ids].sort()) fotoEmpresas.push([data, primeiroDia(data), id, ...COLUNAS_FOTO_EMPRESAS.map(coluna => valores[coluna.nome](id))]);
    for (const { tipo, ids: comTipo } of incompleto.porTipo) for (const id of comTipo) pendencias.push([data, id, nomePendencia[tipo as QualityKind] ?? tipo]);
    // Estabelecimentos: no mercado (a base da parte registrada) e com registro ativo (as abertas que já se registraram).
    const c = cobertura(scope, model), situacao = new Map<string, string>();
    for (const porClasse of Object.values(c.porClasse)) for (const [nome, lista] of Object.entries(porClasse)) for (const id of lista) situacao.set(id, nomesSituacao[nome as keyof typeof nomesSituacao]);
    const ativo = new Set(view.registrations.filter(row => row.status === 'Ativo').map(row => row.establishmentId));
    // Só entram os estabelecimentos com atividade da lista que estão no mercado ou têm registro ativo: os demais não contam em nenhuma medida.
    for (const row of view.establishments) if (classe(row) && (situacao.has(row.id) || ativo.has(row.id))) fotoEstab.push([data, row.id, situacao.has(row.id), situacao.get(row.id) ?? '', ativo.has(row.id)]);
    // Profissionais ativos por município e modalidade (artsPorProfissional), só nas datas que se podem escolher.
    if (escolhiveis.includes(data)) {
      const contagem = new Map<string, number>();
      for (const row of profissionais.profissionais) if (situacaoEm(row, data) === 'Ativo') { const chave = `${row.cityId}|${row.modalidade}`; contagem.set(chave, (contagem.get(chave) ?? 0) + 1); }
      for (const [chave, n] of [...contagem].sort()) { const [cidade, modalidade] = chave.split('|'); profissionaisAtivos.push([data, cidade, modalidade, n]); }
    }
  }

  // Entradas e saídas, uma linha por empresa, mês e movimento, como `history.monthly` (o modelo de 36 meses na data de hoje).
  const historico = buildEnterpriseModel(selectEnterpriseScope(dataset, { ...defaultFilters, period: dataset.months.length }));
  const movimentos: Celula[][] = [];
  for (const row of entradasSaidas(historico, fBase)) {
    const viaFiscal = new Set(row.viaFiscalizacao);
    for (const id of [...row.viaFiscalizacao, ...row.demais]) movimentos.push([id, primeiroDia(row.month), 'Entrada', primeiro.get(id)?.slice(0, 7) === row.month, viaFiscal.has(id)]);
    for (const id of row.saidas) movimentos.push([id, primeiroDia(row.month), 'Saída', false, false]);
  }

  // Emprego formal e crédito ("!") por regional e mês, do bloco de ritmo da economia.
  const emprego: Celula[][] = [], credito: Celula[][] = [];
  for (const gre of dataset.gres) for (const ponto of ritmoEconomico(dataset, gre.id, null, dataset.months.length).pontos) {
    emprego.push([primeiroDia(ponto.month), gre.name, ponto.emprego]); credito.push([primeiroDia(ponto.month), gre.name, ponto.credito]);
  }
  const modalidades = [...new Set([...Object.values(modalidadeAntiga), ...dataset.arts.map(row => modalidadeDaArt(row.modality)), ...profissionaisAtivos.map(row => String(row[2]))])].sort();

  return [
    { arquivo: 'regionais.csv', cabecalho: ['GRE', 'Ordem'], linhas: dataset.gres.map((gre, i) => [gre.name, i + 1]) },
    { arquivo: 'municipios.csv', cabecalho: ['Código IBGE', 'Município', 'GRE'], linhas: municipios.map(row => [row.id, row.nome, dataset.gres.find(gre => gre.id === row.greId)?.name ?? '']) },
    { arquivo: 'empresas.csv', cabecalho: ['Empresa', 'Raiz do CNPJ', 'Razão social', 'Porte', 'Câmara', 'Situação na Receita', 'Código IBGE', 'Só visto (sede fora de SP)', 'Primeiro registro', 'Capital social', 'Ordem do capital social'],
      linhas: dataset.companies.map(row => { const sede = matriz.get(row.id), faixa = faixaDoCapital(capitalSocial(row.id, row.size));
        return [row.id, row.rootCnpj, row.name, row.size, camara.get(row.id) ?? '', sede?.rfbStatus ?? '', sede?.cityId ?? '', row.externalOnly, primeiro.get(row.id) ?? '', faixasCapital[faixa], faixa + 1]; }) },
    { arquivo: 'estabelecimentos.csv', cabecalho: ['Estabelecimento', 'Empresa', 'CNPJ', 'Matriz ou filial', 'Código IBGE', 'Atividade principal', 'Atividade da lista', 'Câmara da atividade', 'Classe', 'Aberto em', 'Mês de abertura', 'Situação na Receita'],
      linhas: dataset.establishments.map(row => { const enquadra = naLista(row.cnaeMain) ? row.cnaeMain : row.cnaeSecondary.find(naLista) ?? '';
        return [row.id, row.companyId, row.cnpj, row.branch, row.cityId, row.cnaeMain, enquadra ? `${enquadra} ${cnaes.get(enquadra)?.label ?? ''}`.trim() : '', enquadra ? camaraPorCnae[enquadra] ?? 'Sem câmara definida' : '', classe(row), row.openedAt, primeiroDia(row.openedAt), row.rfbStatus]; }) },
    { arquivo: 'modalidades.csv', cabecalho: ['Modalidade', 'Rótulo'], linhas: modalidades.map(modalidade => [modalidade, rotuloModalidade(modalidade)]) },
    { arquivo: 'calendario.csv', cabecalho: ['Mês', 'Rótulo', 'Trimestre', 'Ano', 'Ordem'], linhas: dataset.months.map((mes, i) => [primeiroDia(mes), `${nomesMes[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`, `${mes.slice(0, 4)}-T${Math.floor((Number(mes.slice(5, 7)) - 1) / 3) + 1}`, Number(mes.slice(0, 4)), i + 1]) },
    { arquivo: 'datas-referencia.csv', cabecalho: ['Data', 'Rótulo'], linhas: escolhiveis.map(data => [data, `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}${data === hoje ? ' (hoje)' : ''}`]) },
    { arquivo: 'datas-das-fotos.csv', cabecalho: ['Data'], linhas: fotos.map(data => [data]) },
    { arquivo: 'foto-empresas.csv', cabecalho: ['Data', 'Mês', 'Empresa', ...COLUNAS_FOTO_EMPRESAS.map(coluna => coluna.nome)], linhas: fotoEmpresas },
    { arquivo: 'foto-estabelecimentos.csv', cabecalho: ['Data', 'Estabelecimento', 'No mercado', 'Situação no cadastro', 'Registro ativo'], linhas: fotoEstab },
    { arquivo: 'pendencias.csv', cabecalho: ['Data', 'Empresa', 'Pendência'], linhas: pendencias },
    { arquivo: 'profissionais-ativos.csv', cabecalho: ['Data', 'Código IBGE', 'Modalidade', 'Ativos'], linhas: profissionaisAtivos },
    { arquivo: 'entradas-saidas.csv', cabecalho: ['Empresa', 'Mês', 'Tipo', 'Primeira vez', 'Após fiscalização'], linhas: movimentos },
    { arquivo: 'arts.csv', cabecalho: ['ART', 'Empresa', 'Data', 'Mês', 'Valor', 'Modalidade'], linhas: dataset.arts.filter(row => row.date <= hoje).map(row => [row.id, row.companyId, row.date, primeiroDia(row.date), row.value, modalidadeDaArt(row.modality)]) },
    { arquivo: 'emprego.csv', cabecalho: ['Mês', 'GRE', 'Empregados'], linhas: emprego },
    { arquivo: 'credito.csv', cabecalho: ['Mês', 'GRE', 'Saldo'], linhas: credito },
    { arquivo: 'parcerias.csv', cabecalho: ['Bloco', 'Grupo', 'Série', 'Valor', 'Ordem'], linhas: parcerias(dataset) },
  ];
}

/**
 * Os blocos da página Vínculos, na ordem da página: o nome (o mesmo do protótipo) e os acordos de que dependem, pelo catálogo de
 * parcerias (`domain/parcerias.ts`); sem acordo, o bloco usa fontes abertas e não leva "!". `modelo.ts` e `paginas.ts` leem esta lista.
 */
export const BLOCOS_PARCERIA: { id: 'socios' | 'nome' | 'instalacoes' | 'empregados' | 'credenciadas' | 'jucesp'; bloco: string; acordos: ParceriaId[] }[] = [
  { id: 'socios', bloco: 'Sócios que são profissionais', acordos: ['rfb-cpf'] },
  { id: 'nome', bloco: 'Nome com engenharia e diretoria', acordos: ['rfb-cpf'] },
  { id: 'instalacoes', bloco: 'Usinas, postos, minas e financiamentos', acordos: [] },
  { id: 'empregados', bloco: 'Empregados técnicos por empresa', acordos: ['mte'] },
  { id: 'credenciadas', bloco: 'Credenciadas no DETRAN-SP e no INMETRO', acordos: ['detran', 'inmetro'] },
  { id: 'jucesp', bloco: 'Engenharia incluída no contrato social', acordos: ['jucesp'] },
];
/** Marca de bloco que depende de acordo: "!" no fim do título do visual e no começo do nome e da descrição da medida. */
export const MARCA_ACORDO = '!';
export const comMarca = { titulo: (titulo: string) => `${titulo} ${MARCA_ACORDO}`, medida: (nome: string) => `${MARCA_ACORDO} ${nome}` };
/** Nome da medida de um bloco da página Vínculos: com "!" na frente quando depende de acordo. */
export const medidaDoBloco = (bloco: typeof BLOCOS_PARCERIA[number]) => bloco.acordos.length ? comMarca.medida(bloco.bloco) : bloco.bloco;
/** Ficha de um bloco "!": de quem depende o acordo e o plano B do catálogo, o que o painel usa se o acordo não sair. */
export function fichaDoAcordo(acordos: ParceriaId[]): string {
  const parceiros = acordos.map(id => parceriaPorId[id].parceiro), planos = acordos.map(id => parceriaPorId[id].planoB);
  return `${MARCA_ACORDO} Demonstração: o bloco depende de acordo com ${parceiros.join(' e com ')}. Os números são do cenário e não valem para o Crea-SP. Plano B: ${planos.join(' ')}`;
}

/**
 * Os blocos da página Vínculos ("!", dependem de acordo) na data de hoje, em formato longo: bloco, grupo (a linha do gráfico),
 * série (a cor) e valor. Vêm das mesmas tabelas que o painel exporta em CSV, então batem com a tela.
 */
function parcerias(dataset: Dataset): Celula[][] {
  const profissionais = buildProfissionais(dataset), scope = selectEnterpriseScope(dataset, { ...defaultFilters, period: 12 }), ids = scope.companyIds, socios = buildSociosPf(dataset, profissionais);
  const ctx = { dataset, cidadeId: null, tokens: { good: '', bad: '', muted: '' }, frentes: { instalacoes: quadroInstalacoes(buildInstalacoes(dataset), dataset, null) },
    parcerias: { sociosPf: quadroSociosPf(socios, dataset, profissionais, ids, null), denominacao: quadroDenominacao(socios, dataset, profissionais, ids, null), vinculos: quadroVinculos(buildVinculos(dataset), dataset, ids, null),
      credenciamentos: quadroCredenciamentos(buildCredenciamentos(dataset), dataset, ids, null), jucesp: quadroJucesp(buildJucesp(dataset), dataset, ids, null) } } as unknown as CockpitCtx;
  const tabelas: Record<typeof BLOCOS_PARCERIA[number]['id'], ReturnType<typeof exportaSociosPf>> = { socios: exportaSociosPf(ctx), nome: exportaDenominacao(ctx), instalacoes: exportaInstalacoes(ctx), empregados: exportaVinculos(ctx), credenciadas: exportaCredenciamentos(ctx), jucesp: exportaJucesp(ctx) };
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
