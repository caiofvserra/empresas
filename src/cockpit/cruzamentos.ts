import type { Scope } from '../domain/engine';
import type { EnterpriseModel } from '../enterprise-v10/types';
import type { Fiscalizacao } from '../painel/fiscalizacao';
import { saneamento } from '../painel/analise';
import type { ContratoPublico } from '../painel/analise';
import { classeDoEstabelecimento } from '../observatorio/norte';

/**
 * V19 · malha fina v1 do Observatório: indícios por regra, cada um com status de ligação, fonte, data e versão da regra.
 * Nenhum indício vira auto: a lista é para análise. Saíram da V18 as camadas que sorteavam diretoria pelo QSA
 * e vínculos nominais de emprego e salário (lacunas 3, 4 e 5 da revisão do repositório).
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

export type IndicioId = 'cnaeSim' | 'cnaePassivel' | 'contratoSemRegistro' | 'contratoSemVinculo' | 'rtSemSubstituto' | 'cnpjInativo';
export interface Regra { id: IndicioId; label: string; status: StatusLigacao; regra: string; fonte: string; versao: string; naoConcluir: string }
export const VERSAO_REGRAS = 'v1 · 31/10/2026';
export const regras: Regra[] = [
  { id: 'contratoSemRegistro', status: 'Confirmado', label: 'Contrato técnico com fornecedor sem registro na data', fonte: 'PNCP × cadastro PJ', versao: VERSAO_REGRAS,
    regra: 'Contrato público de obra, serviço técnico, manutenção ou consultoria cujo estabelecimento contratado (CNPJ completo) não tinha registro vigente na data do contrato.',
    naoConcluir: 'Que o objeto exigia registro: confirmar o objeto e a atividade antes de notificar.' },
  { id: 'cnpjInativo', status: 'Confirmado', label: 'Registro ativo com CNPJ baixado, inapto ou suspenso', fonte: 'Receita (CNPJ) × cadastro PJ', versao: VERSAO_REGRAS,
    regra: 'Registro ativo no Crea-SP de estabelecimento cuja situação na Receita, no mesmo corte, é baixada, inapta ou suspensa.',
    naoConcluir: 'Que a empresa deixou de atuar: situação cadastral não prova funcionamento.' },
  { id: 'rtSemSubstituto', status: 'Confirmado', label: 'RT baixado sem substituto há mais de 30 dias', fonte: 'Cadastro PJ e vínculos de RT', versao: VERSAO_REGRAS,
    regra: 'Empresa com registro vigente cujo último vínculo de responsável técnico terminou há mais de 30 dias sem outro vínculo.',
    naoConcluir: 'Que houve atividade técnica sem responsável no período.' },
  { id: 'cnaeSim', status: 'Candidato', label: 'CNAE “Sim” sem registro localizado', fonte: 'Receita (CNPJ, CNAE) × lista CNAE Crea-SP × cadastro PJ', versao: VERSAO_REGRAS,
    regra: 'Estabelecimento ativo na Receita com CNAE principal ou secundário marcado “Sim” na lista do Crea-SP e sem registro ou visto vigente no corte.',
    naoConcluir: 'Que a empresa é irregular: CNAE não prova atividade efetiva nem obrigação.' },
  { id: 'contratoSemVinculo', status: 'Candidato', label: 'Contrato técnico sem ART identificada', fonte: 'PNCP × ART', versao: VERSAO_REGRAS,
    regra: 'Contrato com chave para a busca, sem ART que cite o contrato e sem ART candidata da mesma empresa entre 30 dias antes e 60 depois.',
    naoConcluir: 'Que falta ART: a busca por empresa e período pode não achar a ART certa.' },
  { id: 'cnaePassivel', status: 'Contexto', label: 'CNAE “Passível” sem registro localizado', fonte: 'Receita (CNPJ, CNAE) × lista CNAE Crea-SP × cadastro PJ', versao: VERSAO_REGRAS,
    regra: 'Como a regra “Sim”, mas só com CNAE “Passível de obrigação”: depende da atividade básica e dos serviços efetivamente prestados.',
    naoConcluir: 'Que existe obrigação de registro sem avaliação normativa.' },
];
export const regraPorId = Object.fromEntries(regras.map(row => [row.id, row])) as Record<IndicioId, Regra>;

/** Regras do plano para a malha fina v1 que o cenário ainda não sustenta. */
export const regrasPendentes = [
  { label: 'RT sem atividade', motivo: 'exige o autor (profissional) de cada ART; o cenário só liga ART à empresa' },
  { label: 'RT de empresas demais, longe demais', motivo: 'exige domicílio do profissional e regra aprovada pelas câmaras' },
];

export interface Indicio extends Regra { empresas: string[]; comAcao: string[] }
export interface Malha {
  indicios: Indicio[]; empresas: string[]; comAcao: string[]; multiplos: string[];
  /** Empresas com ao menos um indício confirmado (sem contar candidatos e contexto). */
  confirmadas: string[];
  semRegistro: string[]; semRegistroSim: string[]; semRegistroPassivel: string[]; cnpjInativo: ReturnType<typeof saneamento>;
  contratos: ContratoPublico[]; contratosComChave: ContratoPublico[];
}
export function malhaFina(scope: Scope, model: EnterpriseModel, f: Fiscalizacao, contratos: ContratoPublico[]): Malha {
  const places = new Map(scope.dataset.establishments.map(row => [row.id, row]));
  const vigente = new Set(model.metadata.activeEligibleEstablishmentIds);
  const semRegistro = model.metadata.eligibleEstablishmentIds.filter(id => !vigente.has(id));
  const classe = (id: string) => { const place = places.get(id); return place ? classeDoEstabelecimento(scope.dataset, place) : null; };
  const semRegistroSim = semRegistro.filter(id => classe(id) === 'Sim'), semRegistroPassivel = semRegistro.filter(id => classe(id) !== 'Sim');
  const cnpjInativo = saneamento(scope, model);
  const empresaDe = (ids: string[]) => unique(ids.map(id => places.get(id)?.companyId ?? '').filter(Boolean));
  const contratosComChave = contratos.filter(row => row.chave);
  const rtAbertos = f.alvos.filter(row => row.tipo === 'rt' && !row.regularizedAt && scope.companyIds.has(row.companyId));
  const acted = new Set(f.acoes.map(row => row.companyId));
  const grupos: Record<IndicioId, string[]> = {
    contratoSemRegistro: unique(contratos.filter(row => row.situacao === 'Sem registro na data').map(row => row.companyId)),
    cnpjInativo: cnpjInativo.companies.slice().sort(),
    rtSemSubstituto: unique(rtAbertos.map(row => row.companyId)),
    cnaeSim: empresaDe(semRegistroSim),
    contratoSemVinculo: unique(contratosComChave.filter(row => row.vinculo === 'Não identificado').map(row => row.companyId)),
    cnaePassivel: empresaDe(semRegistroPassivel),
  };
  const indicios = regras.map(regra => ({ ...regra, empresas: grupos[regra.id], comAcao: grupos[regra.id].filter(company => acted.has(company)) }));
  const contagem = new Map<string, number>();
  for (const item of indicios) for (const id of item.empresas) contagem.set(id, (contagem.get(id) ?? 0) + 1);
  const empresas = [...contagem.keys()].sort();
  const confirmadas = unique(indicios.filter(item => item.status === 'Confirmado').flatMap(item => item.empresas));
  return { indicios, empresas, comAcao: empresas.filter(id => acted.has(id)), multiplos: empresas.filter(id => contagem.get(id)! > 1), confirmadas,
    semRegistro, semRegistroSim, semRegistroPassivel, cnpjInativo, contratos, contratosComChave };
}
