import type { Scope } from '../domain/engine';
import type { Dataset } from '../domain/types';
import type { EnterpriseModel } from '../enterprise-v10/types';
import { buildProfessionalModel } from '../domain/professionals';
import { mainEstablishments } from '../gestao-v14/metrics';
import { chance } from '../painel/fiscalizacao';
import type { Fiscalizacao } from '../painel/fiscalizacao';
import { camaraDaEmpresa, saneamento } from '../painel/analise';
import type { Camara, ContratoPublico } from '../painel/analise';
import pisos from '../../public/data/engineer-statistics/pisos.json';

/**
 * V18 · malha fina: indícios por cruzamento de bases externas com o cadastro do CREA-SP.
 * Receita (CNPJ e CNAE) e PNCP vêm do cenário; o quadro de administradores (QSA) e os vínculos de emprego
 * identificados (RAIS identificada ou eSocial) são camadas DEMONSTRATIVAS derivadas por sorteio determinístico.
 */
const unique = (values: string[]) => [...new Set(values)].sort();
const pick = <T>(key: string, list: T[]) => list[Math.floor(chance(key) * list.length)];

/* ---------- Piso salarial (Lei 4.950-A/66): valor exigível congelado pelo STF e leitura Confea ---------- */
const leituras = pisos.data.leituras as { id: string; baseCongeladaValor?: number; fatoresPorJornada?: Record<string, number>; valorJornada8h?: number }[];
const stf = leituras.find(row => row.id === 'stf-congelado')!, confea = leituras.find(row => row.id === 'confea-8_5sm')!;
export const piso = { base: stf.baseCongeladaValor ?? 1212, fatores: stf.fatoresPorJornada ?? { 6: 6, 7: 7.25, 8: 8.5 }, exigivel8h: stf.valorJornada8h ?? 10302, confea8h: confea.valorJornada8h ?? 13778.5 };
/** Jornada diária pela carga semanal: até 30 h = 6 h; até 35 h = 7 h; acima = 8 h. */
export const pisoDaJornada = (horasSemanais: number) => Math.round(piso.base * piso.fatores[horasSemanais <= 30 ? '6' : horasSemanais <= 35 ? '7' : '8']);

/* ---------- Art. 5º da Lei 5.194/66: denominação com "engenharia" exige diretoria majoritariamente registrada ---------- */
export type SituacaoDiretor = 'Registro ativo' | 'Registro inativo' | 'Sem registro no CREA';
export interface Diretor { nome: string; papel: string; professionalId?: string; situacao: SituacaoDiretor }
export type SituacaoDiretoria = 'Maioria com registro ativo' | 'Metade ou menos com registro ativo' | 'Nenhum diretor com registro ativo';
export const situacoesDiretoria: SituacaoDiretoria[] = ['Maioria com registro ativo', 'Metade ou menos com registro ativo', 'Nenhum diretor com registro ativo'];
export interface Diretoria { companyId: string; diretores: Diretor[]; ativos: number; situacao: SituacaoDiretoria }
export const denominacaoTecnica = /\b(engenharia|engenheiros|agronomia|agronômica)\b/i;
const primeiros = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio', 'Gabriela', 'Henrique', 'Isabela', 'João', 'Karina', 'Lucas', 'Marina', 'Nelson', 'Olívia', 'Paulo', 'Renata', 'Sérgio', 'Tatiana', 'Vítor'];
const sobrenomes = ['Almeida', 'Barbosa', 'Cardoso', 'Duarte', 'Esteves', 'Ferreira', 'Gomes', 'Lima', 'Moraes', 'Nogueira', 'Oliveira', 'Pereira', 'Queiroz', 'Ribeiro', 'Santos', 'Teixeira', 'Vieira'];
const diretoriaCache = new WeakMap<Dataset, Diretoria[]>();
export function diretorias(dataset: Dataset): Diretoria[] {
  const saved = diretoriaCache.get(dataset); if (saved) return saved;
  const profiles = buildProfessionalModel(dataset).profiles, ativos = profiles.filter(row => row.status === 'Ativo'), inativos = profiles.filter(row => row.status !== 'Ativo');
  const result = dataset.companies.filter(row => denominacaoTecnica.test(`${row.name} ${row.tradeName}`)).map(company => {
    const key = `diretoria:${company.id}`, total = [1, 2, 2, 2, 3, 3, 4][Math.floor(chance(`${key}:n`) * 7)], maioria = Math.floor(total / 2) + 1;
    const registrados = chance(`${key}:conforme`) < 0.72 ? maioria + Math.floor(chance(`${key}:k`) * (total - maioria + 1)) : Math.floor(chance(`${key}:k`) * maioria);
    const diretores = Array.from({ length: total }, (_, index): Diretor => {
      const seed = `${key}:${index}`, papel = index === 0 ? 'Sócio-administrador' : index % 2 ? 'Diretor' : 'Administrador';
      if (index < registrados) { const profile = pick(`${seed}:p`, ativos); return { nome: profile.name, papel, professionalId: profile.id, situacao: 'Registro ativo' }; }
      if (inativos.length && chance(`${seed}:inativo`) < 0.35) { const profile = pick(`${seed}:p`, inativos); return { nome: profile.name, papel, professionalId: profile.id, situacao: 'Registro inativo' }; }
      return { nome: `${pick(`${seed}:a`, primeiros)} ${pick(`${seed}:b`, sobrenomes)}`, papel, situacao: 'Sem registro no CREA' };
    });
    const situacao: SituacaoDiretoria = registrados >= maioria ? 'Maioria com registro ativo' : registrados === 0 ? 'Nenhum diretor com registro ativo' : 'Metade ou menos com registro ativo';
    return { companyId: company.id, diretores, ativos: registrados, situacao };
  });
  diretoriaCache.set(dataset, result); return result;
}

/* ---------- Vínculos de emprego em CBO de engenheiro (RAIS identificada ou eSocial) ---------- */
export interface Vinculo { id: string; companyId: string; cbo: string; ocupacao: string; horas: number; salario: number; piso: number; profissionalAtivo: boolean }
const cboPorCamara: Record<Camara, string> = { 'Eng. Civil': '2142-05', 'Eng. Elétrica': '2143-05', 'Eng. Mec. e Metalúrgica': '2144-05', 'Eng. Química': '2144-05' };
const engenheiros = ['2142-05', '2143-05', '2144-05'];
/** Probabilidade de ter engenheiro empregado e faixa de quantidade, por porte. */
const faixa: Record<string, [number, number, number]> = { Microempresa: [0.45, 1, 1], 'Pequena empresa': [0.6, 1, 3], 'Média empresa': [1, 1, 6], 'Grande empresa': [1, 3, 14] };
const vinculoCache = new WeakMap<Dataset, Vinculo[]>();
export function vinculos(dataset: Dataset): Vinculo[] {
  const saved = vinculoCache.get(dataset); if (saved) return saved;
  const main = mainEstablishments(dataset), camara = camaraDaEmpresa(dataset), labels = new Map(dataset.cbos.map(row => [row.code, row.label]));
  const result: Vinculo[] = [];
  for (const company of dataset.companies) {
    const place = main.get(company.id), key = `rais:${company.id}`;
    const [probability, min, max] = faixa[company.size] ?? [0.5, 1, 2];
    if (!place || place.rfbStatus !== 'Ativa' || chance(`${key}:tem`) >= probability) continue;
    const quantidade = min + Math.floor(chance(`${key}:n`) * (max - min + 1));
    // Fator da empresa: algumas pagam sistematicamente menos; o porte eleva a média.
    const fator = (0.88 + chance(`${key}:empresa`) * 0.26) * (company.size === 'Grande empresa' ? 1.1 : company.size === 'Média empresa' ? 1.04 : 1);
    for (let index = 0; index < quantidade; index++) {
      const seed = `${key}:${index}`, cbo = chance(`${seed}:cbo`) < 0.75 ? cboPorCamara[camara.get(company.id) ?? 'Eng. Civil'] : pick(`${seed}:outro`, engenheiros);
      const sorteio = chance(`${seed}:horas`), horas = sorteio < 0.15 ? 30 : sorteio < 0.45 ? 40 : 44, pisoJornada = pisoDaJornada(horas);
      const razao = (0.55 + 0.886 * chance(`${seed}:salario`) ** 0.563) * fator;
      result.push({ id: `VINC-${company.id}-${index + 1}`, companyId: company.id, cbo, ocupacao: labels.get(cbo) ?? cbo, horas, salario: Math.round(pisoJornada * razao / 10) * 10, piso: pisoJornada, profissionalAtivo: chance(`${seed}:registro`) >= 0.08 });
    }
  }
  vinculoCache.set(dataset, result); return result;
}

/* ---------- Malha fina: indícios por empresa ---------- */
export type IndicioId = 'semRegistro' | 'contrato' | 'empregaSemRegistro' | 'piso' | 'diretoria' | 'engenheiroSemRegistro' | 'cnpjInativo';
export const indicioLabel: Record<IndicioId, string> = {
  semRegistro: 'CNAE de engenharia sem registro', contrato: 'Contrato público sem registro, quitação ou ART', empregaSemRegistro: 'Sem registro e emprega engenheiros',
  piso: 'Engenheiro abaixo do piso', diretoria: 'Nome de engenharia sem diretoria registrada', engenheiroSemRegistro: 'Engenheiro empregado sem registro ativo', cnpjInativo: 'Registro ativo com CNPJ inativo',
};
export interface Indicio { id: IndicioId; label: string; empresas: string[]; comAcao: string[] }
export interface Malha {
  indicios: Indicio[]; empresas: string[]; comAcao: string[]; multiplos: string[];
  semRegistro: string[]; cnpjInativo: ReturnType<typeof saneamento>;
  diretorias: Diretoria[]; vinculos: Vinculo[]; abaixoPiso: Vinculo[]; empregaSemRegistro: string[]; engenheirosSemRegistro: Vinculo[];
  contratos: ContratoPublico[]; contratosIrregulares: ContratoPublico[];
}
export function malhaFina(scope: Scope, model: EnterpriseModel, f: Fiscalizacao, contratos: ContratoPublico[]): Malha {
  const inScope = (id: string) => scope.companyIds.has(id), places = new Map(scope.dataset.establishments.map(row => [row.id, row]));
  const activeEligible = new Set(model.metadata.activeEligibleEstablishmentIds), activeCompanies = new Set(model.metadata.activeCompanyIds);
  const semRegistro = model.metadata.eligibleEstablishmentIds.filter(id => !activeEligible.has(id));
  const cnpjInativo = saneamento(scope, model);
  const diretoriasScope = diretorias(scope.dataset).filter(row => inScope(row.companyId));
  const vinculosScope = vinculos(scope.dataset).filter(row => inScope(row.companyId));
  const abaixoPiso = vinculosScope.filter(row => row.salario < row.piso);
  const empregaSemRegistro = unique(vinculosScope.filter(row => !activeCompanies.has(row.companyId)).map(row => row.companyId));
  const engenheirosSemRegistro = vinculosScope.filter(row => !row.profissionalAtivo);
  const contratosIrregulares = contratos.filter(row => row.situacao !== 'Regular: registro, quitação e ART');
  const acted = new Set(f.acoes.map(row => row.companyId));
  const grupos: Record<IndicioId, string[]> = {
    semRegistro: unique(semRegistro.map(id => places.get(id)?.companyId ?? '').filter(Boolean)),
    contrato: unique(contratosIrregulares.map(row => row.companyId)),
    empregaSemRegistro,
    piso: unique(abaixoPiso.map(row => row.companyId)),
    diretoria: diretoriasScope.filter(row => row.situacao !== 'Maioria com registro ativo').map(row => row.companyId).sort(),
    engenheiroSemRegistro: unique(engenheirosSemRegistro.map(row => row.companyId)),
    cnpjInativo: cnpjInativo.companies.slice().sort(),
  };
  const indicios = (Object.keys(grupos) as IndicioId[]).map(id => ({ id, label: indicioLabel[id], empresas: grupos[id], comAcao: grupos[id].filter(company => acted.has(company)) }));
  const contagem = new Map<string, number>();
  for (const item of indicios) for (const id of item.empresas) contagem.set(id, (contagem.get(id) ?? 0) + 1);
  const empresas = [...contagem.keys()].sort();
  return { indicios, empresas, comAcao: empresas.filter(id => acted.has(id)), multiplos: empresas.filter(id => contagem.get(id)! > 1),
    semRegistro, cnpjInativo, diretorias: diretoriasScope, vinculos: vinculosScope, abaixoPiso, empregaSemRegistro, engenheirosSemRegistro, contratos, contratosIrregulares };
}
