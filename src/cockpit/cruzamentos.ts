import type { Scope } from '../domain/engine';
import type { EnterpriseModel } from '../enterprise-v10/types';
import type { Fiscalizacao } from '../painel/fiscalizacao';
import { devedoras, saneamento } from '../painel/analise';
import type { ContratoPublico } from '../painel/analise';
import { classeDoEstabelecimento } from '../observatorio/norte';
import { buildProfissionais } from '../domain/profissionais';
import { toDay } from '../domain/hash';
import { buildObras, buildSociedades, quadroSociedades } from '../domain/frentes';
import { buildCno, buildLicencas, quadroCno, quadroLicencas } from '../domain/parcerias';
import type { ParceriaId } from '../domain/parcerias';

/**
 * V20 · malha fina v2 do Inteligência Estratégica Crea-SP: indícios por regra, cada um com status de ligação, fonte, data e versão da regra.
 * Nenhum indício vira auto: a lista é para análise. Às seis regras da V19 somam-se cinco regras internas novas, todas
 * calculadas só com dados que o Crea-SP já tem ou coleta automaticamente: padrão anormal de ART, obra pública sem ART de
 * fiscalização, atividade recente com débito, sucessão de empresas e nome de engenharia sem registro. A V21 acrescenta a regra de
 * contexto do QSA aberto (sócio PJ de engenharia sem registro) e passa a ler a execução das obras no Obrasgov (CIPI). A V22 acrescenta
 * duas regras que dependem de parceria (coleta "Convênio", marcadas com "!"): obra do CNO sem ART localizada e alvará ou licença de
 * obra sem ART ligada ao processo. Elas usam camadas demonstrativas até o acordo e ficam fora das contagens confirmadas.
 */
const unique = (values: string[]) => [...new Set(values)].sort();

/** Status da ligação entre as bases (plano rev. 2, “Regras de leitura dos cruzamentos”). Candidatas ficam fora das contagens confirmadas. */
export type StatusLigacao = 'Confirmado' | 'Candidato' | 'Contexto';
export const statusLigacao: StatusLigacao[] = ['Confirmado', 'Candidato', 'Contexto'];
export const statusAjuda: Record<StatusLigacao, string> = {
  Confirmado: 'Ligação por chave exata ou documento (CNPJ completo, nº do contrato na ART). O fato é verificável; a obrigação ainda depende de análise.',
  Candidato: 'Semelhança de atividade, empresa ou período. Vai para revisão humana e fica fora das contagens confirmadas.',
  Contexto: 'Agregado ou dependente de análise normativa. Orienta prioridade, não aponta empresa.',
};

export type IndicioId = 'cnaeSim' | 'cnaePassivel' | 'contratoSemRegistro' | 'contratoSemVinculo' | 'rtSemSubstituto' | 'cnpjInativo'
  | 'atividadeComDebito' | 'artAnormal' | 'obraSemArtFiscalizacao' | 'sucessao' | 'nomeEngenharia' | 'socioPj' | 'cnoSemArt' | 'licencaSemArt';
export interface Regra { id: IndicioId; label: string; status: StatusLigacao; regra: string; fonte: string; versao: string; naoConcluir: string; coleta: 'Interna' | 'Automática' | 'Convênio';
  /** V22: a regra só sai do demonstrativo com o acordo deste parceiro ("!" na tabela). */
  parceria?: ParceriaId }
export const VERSAO_REGRAS = 'v1 · 31/10/2026';
export const VERSAO_REGRAS_V2 = 'v2 · 01/11/2026';
export const VERSAO_REGRAS_V3 = 'v3 · 01/11/2026';
export const VERSAO_REGRAS_V4 = 'v4 · 01/11/2026 (parceria)';
export const regras: Regra[] = [
  { id: 'contratoSemRegistro', status: 'Confirmado', label: 'Contrato técnico com fornecedor sem registro na data', fonte: 'PNCP × cadastro PJ', versao: VERSAO_REGRAS, coleta: 'Automática',
    regra: 'Contrato público de obra, serviço técnico, manutenção ou consultoria cujo estabelecimento contratado (CNPJ completo) não tinha registro vigente na data do contrato.',
    naoConcluir: 'Que o objeto exigia registro: confirmar o objeto e a atividade antes de notificar.' },
  { id: 'cnpjInativo', status: 'Confirmado', label: 'Registro ativo com CNPJ baixado, inapto ou suspenso', fonte: 'Receita (CNPJ) × cadastro PJ', versao: VERSAO_REGRAS, coleta: 'Automática',
    regra: 'Registro ativo no Crea-SP de estabelecimento cuja situação na Receita, no mesmo corte, é baixada, inapta ou suspensa.',
    naoConcluir: 'Que a empresa deixou de atuar: situação cadastral não prova funcionamento.' },
  { id: 'rtSemSubstituto', status: 'Confirmado', label: 'RT baixado sem substituto há mais de 30 dias', fonte: 'Cadastro PJ e vínculos de RT', versao: VERSAO_REGRAS, coleta: 'Interna',
    regra: 'Empresa com registro vigente cujo último vínculo de responsável técnico terminou há mais de 30 dias sem outro vínculo.',
    naoConcluir: 'Que houve atividade técnica sem responsável no período.' },
  { id: 'atividadeComDebito', status: 'Confirmado', label: 'Atividade recente com anuidade vencida', fonte: 'ART × anuidades', versao: VERSAO_REGRAS_V2, coleta: 'Interna',
    regra: 'Empresa registrada com ART nos últimos 90 dias e saldo de anuidade vencido no corte: está em atividade e não obteria a certidão de registro e quitação.',
    naoConcluir: 'Que a empresa está em licitação ou precisa da certidão: a regra ordena a cobrança, não cria obrigação nova.' },
  { id: 'cnaeSim', status: 'Candidato', label: 'CNAE “Sim” sem registro localizado', fonte: 'Receita (CNPJ, CNAE) × lista CNAE Crea-SP × cadastro PJ', versao: VERSAO_REGRAS, coleta: 'Automática',
    regra: 'Estabelecimento ativo na Receita com CNAE principal ou secundário marcado “Sim” na lista do Crea-SP e sem registro ou visto vigente no corte.',
    naoConcluir: 'Que a empresa é irregular: CNAE não prova atividade efetiva nem obrigação.' },
  { id: 'contratoSemVinculo', status: 'Candidato', label: 'Contrato técnico sem ART identificada', fonte: 'PNCP × ART', versao: VERSAO_REGRAS, coleta: 'Automática',
    regra: 'Contrato com chave para a busca, sem ART que cite o contrato e sem ART candidata da mesma empresa entre 30 dias antes e 60 depois.',
    naoConcluir: 'Que falta ART: a busca por empresa e período pode não achar a ART certa.' },
  { id: 'obraSemArtFiscalizacao', status: 'Candidato', label: 'Obra pública sem ART de fiscalização', fonte: 'PNCP × Obrasgov (CIPI) × ART (execução e fiscalização)', versao: VERSAO_REGRAS_V3, coleta: 'Automática',
    regra: 'Obra pública iniciada segundo o Obrasgov (em execução, paralisada ou concluída) com ponte ao contrato do PNCP (CIPI no contrato ou candidata) ou ART de execução identificada, e nenhuma ART de fiscalização da obra registrada por profissional do órgão contratante ou de empresa contratada para fiscalizar.',
    naoConcluir: 'Que o órgão descumpre a Lei 6.496/77: a ART de fiscalização pode estar sob outro contrato ou outra chave. Primeiro, orientar o órgão.' },
  { id: 'artAnormal', status: 'Candidato', label: 'Padrão anormal de ART por profissional', fonte: 'ART (autor, empresa, regional)', versao: VERSAO_REGRAS_V2, coleta: 'Interna',
    regra: 'Profissional com ARTs nos últimos 12 meses acima de três vezes a mediana dos autores (mínimo de 6) e para cinco ou mais empresas ou em quatro ou mais regionais. As empresas listadas são as dessas ARTs.',
    naoConcluir: 'Que o profissional “vende” ART ou acumula RT indevidamente: volumes altos são normais em algumas modalidades e portes. Conferir compatibilidade de tempo e área (Resolução Confea nº 1.025/2009).' },
  { id: 'sucessao', status: 'Candidato', label: 'Sucessão de empresas após baixa do registro', fonte: 'Cadastro PJ × Receita (abertura, CNAE, município) × RT', versao: VERSAO_REGRAS_V2, coleta: 'Automática',
    regra: 'Registro baixado ou cancelado nos últimos 24 meses e outra empresa aberta no mesmo município, com o mesmo CNAE principal, em até 180 dias da baixa. RT em comum entre as duas eleva a prioridade.',
    naoConcluir: 'Que a nova empresa é a mesma ou herda débitos da anterior: isso depende de análise societária e jurídica.' },
  { id: 'nomeEngenharia', status: 'Candidato', label: 'Nome de engenharia sem registro', fonte: 'Receita (razão social, nome fantasia) × cadastro PJ', versao: VERSAO_REGRAS_V2, coleta: 'Automática',
    regra: 'Estabelecimento ativo na Receita, sem registro ou visto vigente, cuja razão social ou nome fantasia contém “engenharia”, “engenheiro”, “construtora” ou “projetos”, qualquer que seja o CNAE.',
    naoConcluir: 'Que a empresa exerce atividade privativa: o nome é indício de apresentação ao mercado, não prova de atividade. Em produção, o classificador de nomes passa por validação humana.' },
  { id: 'cnoSemArt', status: 'Candidato', label: 'Obra do CNO sem ART localizada', fonte: 'CNO autorizado (Receita Federal) × ART', versao: VERSAO_REGRAS_V4, coleta: 'Convênio', parceria: 'rfb-cno',
    regra: 'Obra inscrita no CNO em SP, ativa ou paralisada, com dados mínimos e empresa do universo no papel de executora, cujo campo ART está vazio ou não corresponde a ART da mesma empresa na base do Crea-SP.',
    naoConcluir: 'Que a executora atua sem ART: o campo do CNO é preenchido pelo responsável tributário e a ART pode estar em nome do profissional ou de outra chave. Primeiro, orientar o preenchimento.' },
  { id: 'licencaSemArt', status: 'Candidato', label: 'Alvará ou licença de obra sem ART ligada', fonte: 'Alvarás (prefeituras), AVCB (Corpo de Bombeiros), licenças (CETESB) × ART', versao: VERSAO_REGRAS_V4, coleta: 'Convênio', parceria: 'prefeituras',
    regra: 'Alvará de construção ou reforma, AVCB ou licença de instalação vigente em D sem ART ligada ao processo ou à obra. Aponta a executora identificada no processo; sem ela, a titular do universo.',
    naoConcluir: 'Que falta ART: a ligação exige a chave do processo, e a ART pode existir sob outro número. Titular não é projetista nem executora.' },
  { id: 'socioPj', status: 'Contexto', label: 'Sócio PJ de engenharia sem registro', fonte: 'QSA aberto (Receita) × lista CNAE Crea-SP × cadastro PJ', versao: VERSAO_REGRAS_V3, coleta: 'Automática',
    regra: 'Empresa registrada cujo quadro societário aberto tem sócio pessoa jurídica com CNAE da lista do Crea-SP e sem registro ou visto localizado no corte. Só sócios PJ: o CPF do sócio PF é mascarado.',
    naoConcluir: 'Controle, favorecimento ou que o sócio exerce atividade técnica: a sociedade é declarada, não provada, e a holding pode não prestar serviço. Contexto para a análise da empresa investida.' },
  { id: 'cnaePassivel', status: 'Contexto', label: 'CNAE “Passível” sem registro localizado', fonte: 'Receita (CNPJ, CNAE) × lista CNAE Crea-SP × cadastro PJ', versao: VERSAO_REGRAS, coleta: 'Automática',
    regra: 'Como a regra “Sim”, mas só com CNAE “Passível de obrigação”: depende da atividade básica e dos serviços efetivamente prestados.',
    naoConcluir: 'Que existe obrigação de registro sem avaliação normativa.' },
];
export const regraPorId = Object.fromEntries(regras.map(row => [row.id, row])) as Record<IndicioId, Regra>;

/** Regras do plano para a malha fina que o cenário ainda não sustenta. */
export const regrasPendentes = [
  { label: 'RT de empresas demais, longe demais', motivo: 'exige domicílio do profissional e regra aprovada pelas câmaras' },
  { label: 'Perito nomeado sem registro ativo', motivo: 'aponta profissional, não empresa; está em Profissionais · perícias judiciais, que depende do acordo com o TJSP (!)' },
];

export const TERMOS_ENGENHARIA = /engenharia|engenheir|construtora|projetos/i;
export const PRAZO_ATIVIDADE = 90;
export const PRAZO_SUCESSAO = 180;
/** Mínimo de ARTs no período para um autor entrar na regra de padrão anormal. */
export const LIMITE_ART = 6;

export interface Indicio extends Regra { empresas: string[]; comAcao: string[] }
export interface Sucessao { anterior: string; nova: string; baixaEm: string; abertaEm: string; cityId: string; cnae: string; rtComum: boolean }
export interface Malha {
  indicios: Indicio[]; empresas: string[]; comAcao: string[]; multiplos: string[];
  /** Empresas com ao menos um indício confirmado (sem contar candidatos e contexto). */
  confirmadas: string[];
  semRegistro: string[]; semRegistroSim: string[]; semRegistroPassivel: string[]; cnpjInativo: ReturnType<typeof saneamento>;
  contratos: ContratoPublico[]; contratosComChave: ContratoPublico[];
  /** Detalhe das regras novas da V20. */
  autoresAnormais: { id: string; nome: string; arts: number; empresas: number; regionais: number }[]; medianaArts: number;
  obrasSemFiscalizacao: ContratoPublico[]; obrasComExecucao: ContratoPublico[];
  sucessoes: Sucessao[]; nomesSemRegistro: string[];
}

export function malhaFina(scope: Scope, model: EnterpriseModel, f: Fiscalizacao, contratos: ContratoPublico[]): Malha {
  const dataset = scope.dataset, anchor = scope.anchor, places = new Map(dataset.establishments.map(row => [row.id, row]));
  const vigente = new Set(model.metadata.activeEligibleEstablishmentIds);
  const semRegistro = model.metadata.eligibleEstablishmentIds.filter(id => !vigente.has(id));
  const classe = (id: string) => { const place = places.get(id); return place ? classeDoEstabelecimento(dataset, place) : null; };
  const semRegistroSim = semRegistro.filter(id => classe(id) === 'Sim'), semRegistroPassivel = semRegistro.filter(id => classe(id) !== 'Sim');
  const cnpjInativo = saneamento(scope, model);
  const empresaDe = (ids: string[]) => unique(ids.map(id => places.get(id)?.companyId ?? '').filter(Boolean));
  const contratosComChave = contratos.filter(row => row.chave);
  const rtAbertos = f.alvos.filter(row => row.tipo === 'rt' && !row.regularizedAt && scope.companyIds.has(row.companyId));
  const acted = new Set(f.acoes.map(row => row.companyId));

  // Atividade recente com débito: ART nos últimos 90 dias e saldo vencido no corte.
  const devedores = devedoras(model), limiteAtividade = toDay(anchor) - PRAZO_ATIVIDADE;
  const comArtRecente = new Set(scope.arts.filter(row => row.date <= anchor && toDay(row.date) >= limiteAtividade).map(row => row.companyId));
  const atividadeComDebito = unique([...comArtRecente].filter(id => devedores.has(id)));

  // Padrão anormal de ART: autor contra a mediana dos autores ativos no período (12 meses até D).
  const matriz = new Map<string, typeof dataset.establishments[number]>();
  for (const row of dataset.establishments) if (row.branch === 'Matriz') matriz.set(row.companyId, row);
  const modelo = buildProfissionais(dataset), inicioArts = toDay(anchor) - 365;
  const porAutor = new Map<string, { arts: number; empresas: Set<string>; regionais: Set<string> }>();
  for (const art of scope.arts) {
    if (art.date > anchor || toDay(art.date) < inicioArts) continue;
    const autor = modelo.autoria.get(art.id); if (!autor) continue;
    const item = porAutor.get(autor) ?? { arts: 0, empresas: new Set<string>(), regionais: new Set<string>() };
    item.arts++; item.empresas.add(art.companyId);
    const place = matriz.get(art.companyId); if (place) item.regionais.add(place.greId);
    porAutor.set(autor, item);
  }
  const volumes = [...porAutor.values()].map(row => row.arts).sort((a, b) => a - b), medianaArts = volumes.length ? volumes[Math.floor(volumes.length / 2)] : 0;
  const autoresAnormais = [...porAutor].filter(([, row]) => row.arts >= Math.max(LIMITE_ART, 3 * medianaArts) && (row.regionais.size >= 4 || row.empresas.size >= 5))
    .map(([id, row]) => ({ id, nome: modelo.porId.get(id)?.nome ?? id, arts: row.arts, empresas: row.empresas.size, regionais: row.regionais.size })).sort((a, b) => b.arts - a.arts);
  const empresasArtAnormal = unique(autoresAnormais.flatMap(row => [...porAutor.get(row.id)!.empresas]));

  // Obra pública sem ART de fiscalização: obra iniciada no Obrasgov com ponte ao contrato (CIPI ou candidata) ou ART de execução identificada, e sem ART de fiscalização.
  const obraDe = new Map(buildObras(dataset).obras.map(row => [row.contractId, row]));
  const obrasComExecucao = contratos.filter(row => { const obra = obraDe.get(row.id); return row.categoria === 'Obras' && obra && obra.situacao !== 'Não iniciada' && (obra.ponte !== 'Não identificada' || row.vinculo === 'Confirmado por documento' || row.vinculo === 'Candidato para revisão'); });
  const obrasSemFiscalizacao = obrasComExecucao.filter(row => !obraDe.get(row.id)!.artFiscalizacao);

  // Sócio PJ de engenharia sem registro (QSA aberto): contexto para a empresa investida registrada.
  const socioPj = quadroSociedades(buildSociedades(dataset), dataset, scope.companyIds, null).investidasRegistradasComSocioEngenhariaSemRegistro.slice().sort();

  // Regras que dependem de parceria (camadas demonstrativas): obra do CNO sem ART localizada e alvará ou licença de obra sem ART ligada.
  const cnoSemArt = quadroCno(buildCno(dataset), dataset, scope.companyIds, null).executorasSemArt;
  const licencaSemArt = quadroLicencas(buildLicencas(dataset), dataset, scope.companyIds, null).obrasSemArt;

  // Sucessão de empresas: baixa nos últimos 24 meses e abertura no mesmo município e CNAE em até 180 dias.
  const rtDe = new Map<string, Set<string>>();
  for (const link of dataset.technicalLinks) rtDe.set(link.companyId, (rtDe.get(link.companyId) ?? new Set()).add(link.professionalId));
  const inicioBaixas = toDay(anchor) - 730, baixas = scope.registrations.filter(row => row.status !== 'Ativo' && row.ceasedAt && row.ceasedAt <= anchor && toDay(row.ceasedAt) >= inicioBaixas);
  const porChave = new Map<string, typeof dataset.establishments[number][]>();
  for (const row of matriz.values()) { const key = `${row.cityId}|${row.cnaeMain}`; porChave.set(key, [...(porChave.get(key) ?? []), row]); }
  const sucessoes: Sucessao[] = [];
  for (const baixa of baixas) {
    const antiga = matriz.get(baixa.companyId); if (!antiga) continue;
    for (const nova of porChave.get(`${antiga.cityId}|${antiga.cnaeMain}`) ?? []) {
      if (nova.companyId === antiga.companyId || nova.openedAt < baixa.ceasedAt! || nova.openedAt > anchor || toDay(nova.openedAt) - toDay(baixa.ceasedAt!) > PRAZO_SUCESSAO) continue;
      const a = rtDe.get(antiga.companyId), b = rtDe.get(nova.companyId);
      sucessoes.push({ anterior: antiga.companyId, nova: nova.companyId, baixaEm: baixa.ceasedAt!, abertaEm: nova.openedAt, cityId: nova.cityId, cnae: nova.cnaeMain, rtComum: Boolean(a && b && [...a].some(id => b.has(id))) });
    }
  }
  sucessoes.sort((a, b) => Number(b.rtComum) - Number(a.rtComum) || b.abertaEm.localeCompare(a.abertaEm));

  // Nome de engenharia sem registro: qualquer CNAE, estabelecimento ativo na Receita sem registro vigente.
  const nomes = new Map(dataset.companies.map(row => [row.id, `${row.name} ${row.tradeName}`]));
  const nomesSemRegistro = scope.establishments.filter(row => row.rfbStatus === 'Ativa' && row.openedAt <= anchor && !vigente.has(row.id) && TERMOS_ENGENHARIA.test(nomes.get(row.companyId) ?? '')).map(row => row.id);

  const grupos: Record<IndicioId, string[]> = {
    contratoSemRegistro: unique(contratos.filter(row => row.situacao === 'Sem registro na data').map(row => row.companyId)),
    cnpjInativo: cnpjInativo.companies.slice().sort(),
    rtSemSubstituto: unique(rtAbertos.map(row => row.companyId)),
    atividadeComDebito,
    cnaeSim: empresaDe(semRegistroSim),
    contratoSemVinculo: unique(contratosComChave.filter(row => row.vinculo === 'Não identificado').map(row => row.companyId)),
    obraSemArtFiscalizacao: unique(obrasSemFiscalizacao.map(row => row.companyId)),
    artAnormal: empresasArtAnormal,
    sucessao: unique(sucessoes.map(row => row.nova)),
    nomeEngenharia: empresaDe(nomesSemRegistro),
    socioPj,
    cnoSemArt, licencaSemArt,
    cnaePassivel: empresaDe(semRegistroPassivel),
  };
  const indicios = regras.map(regra => ({ ...regra, empresas: grupos[regra.id], comAcao: grupos[regra.id].filter(company => acted.has(company)) }));
  const contagem = new Map<string, number>();
  for (const item of indicios) for (const id of item.empresas) contagem.set(id, (contagem.get(id) ?? 0) + 1);
  const empresas = [...contagem.keys()].sort();
  const confirmadas = unique(indicios.filter(item => item.status === 'Confirmado').flatMap(item => item.empresas));
  return { indicios, empresas, comAcao: empresas.filter(id => acted.has(id)), multiplos: empresas.filter(id => contagem.get(id)! > 1), confirmadas,
    semRegistro, semRegistroSim, semRegistroPassivel, cnpjInativo, contratos, contratosComChave,
    autoresAnormais, medianaArts, obrasSemFiscalizacao, obrasComExecucao, sucessoes, nomesSemRegistro };
}
