import type { Dataset, Establishment } from './types';
import type { ContratoPublico } from '../painel/analise';
import { between, chance, dateBetween, pick, share, sum, toDate, toDay, weighted } from './hash';
import { classeDoEstabelecimento } from '../observatorio/norte';
import { buildProfissionais, situacaoEm } from './profissionais';
import type { ModeloProfissionais, Profissional } from './profissionais';
import { modalidades } from './entidades';
import type { Modalidade } from './entidades';
import type { Formacao } from './formacao';
import { populacaoCidade } from './mercado';

/**
 * V22 · Camadas que DEPENDEM DE PARCERIA: o levantamento de 29/10 as deixou fora da coleta automática porque a fonte só chega por
 * acordo (CNO autorizado da Receita, alvarás e AVCB das prefeituras e do Corpo de Bombeiros, licenças da CETESB, nomeações de peritos do
 * TJSP, etapas financeiras do TCE-SP, crédito por CNAE do Banco Central, CPF completo do sócio pessoa física, listas nominais de formandos
 * das IES e vínculos identificados da RAIS). Cada camada mostra o que a parceria permitiria medir, com a estrutura de dados que o acordo
 * precisa entregar, e é marcada no painel com "!" (depende de parceria). Tudo é DEMONSTRATIVO, derivado do mesmo cenário determinístico,
 * e lido na data de referência da base recebida. Nenhuma camada aqui tem dado real.
 */

/* ---------- Parcerias: quem precisa entregar o quê ---------- */
export type ParceriaId = 'rfb-cno' | 'prefeituras' | 'bombeiros' | 'cetesb' | 'tjsp' | 'tce-sp' | 'bcb' | 'rfb-cpf' | 'jucesp' | 'ies' | 'mte' | 'detran' | 'inmetro';
export interface Parceria { id: ParceriaId; parceiro: string; entrega: string; chave: string; prioridade: 'A' | 'B' | 'C'; camadas: string; basePrevista: string;
  /** Plano B (02/11/2026): o que o painel usa se o acordo não sair, sempre com fonte pública ou interna de coleta periódica, e o que se perde. */
  planoB: string }
/** Acordos que as camadas desta versão pressupõem, com a prioridade do plano de 29/10 (A = primeiros acordos sugeridos). Nenhum está firmado. */
export const parcerias: Parceria[] = [
  { id: 'tce-sp', parceiro: 'TCE-SP (e TCM-SP, na capital)', entrega: 'Empenho, liquidação e pagamento por contrato e fornecedor dos municípios paulistas, com a correspondência para o contrato no PNCP', chave: 'número do contrato e CNPJ do fornecedor', prioridade: 'A', camadas: 'Fiscalização, pagamentos dos contratos; cruzamento entre a despesa do Tribunal de Contas e o contrato', basePrevista: 'Acordo de cooperação técnica. Os dados já são públicos, em lotes no portal do Tribunal, mas ainda sem API testada', planoB: 'Ler os lotes de despesa que o próprio Tribunal publica no portal, todo mês, e ligar ao contrato do PNCP pelo número e pelo CNPJ. Perde-se só a regularidade garantida da entrega.' },
  { id: 'prefeituras', parceiro: 'Prefeituras (começando por São Paulo)', entrega: 'Alvarás de construção e de funcionamento com o CNPJ do interessado, o processo, o endereço e o responsável técnico declarado', chave: 'número do processo e CNPJ do interessado, além da ART informada no alvará', prioridade: 'A', camadas: 'Fiscalização, licenças e alvarás; Malha fina, alvará ou licença de obra sem ART', basePrevista: 'Convênio com cada prefeitura. Os mapas abertos de São Paulo não trazem CNPJ', planoB: 'Usar os alvarás que as prefeituras já publicam em dados abertos e ligar pelo endereço da obra ao endereço das ARTs do Crea-SP. Sem CNPJ, a ligação fica como candidata e não entra nas contagens confirmadas.' },
  { id: 'bombeiros', parceiro: 'Corpo de Bombeiros', entrega: 'Autos de vistoria (AVCB e CLCB) com o CNPJ do ocupante, o endereço, a validade e o responsável técnico do projeto', chave: 'número do auto de vistoria e CNPJ do ocupante', prioridade: 'A', camadas: 'Fiscalização, licenças e alvarás', basePrevista: 'Convênio com a Polícia Militar. A consulta pública é feita um a um, sem arquivo em lote', planoB: 'Consultar a página pública do Corpo de Bombeiros só para as empresas que a malha fina já selecionou, em lotes pequenos, e pedir listas pela Lei de Acesso à Informação. Perde-se a visão de todo o estado.' },
  { id: 'rfb-cno', parceiro: 'Receita Federal e Serpro (Cadastro Nacional de Obras)', entrega: 'Obras inscritas no cadastro em SP, com o responsável, o papel dele, a situação, o local e o campo de ART', chave: 'número da obra no cadastro, CNPJ ou CPF do responsável e ART informada', prioridade: 'B', camadas: 'Fiscalização, obras privadas; Malha fina, obra privada sem ART', basePrevista: 'Acesso pelo Conecta, do Serpro, com autorização jurídica, porque o dado não é aberto', planoB: 'Ficar com as obras públicas do PNCP e do Obrasgov, que já são automáticas, e com os alvarás abertos das prefeituras. Perdem-se as obras privadas que não pedem alvará público.' },
  { id: 'cetesb', parceiro: 'CETESB (e IBAMA e ANA, quando trouxerem CNPJ)', entrega: 'Licenças prévia, de instalação e de operação com o CNPJ do titular, o empreendimento, a fase e a validade', chave: 'número do processo e CNPJ do titular', prioridade: 'B', camadas: 'Fiscalização, licenças e alvarás', basePrevista: 'Acordo com a CETESB. Os dados públicos do IBAMA e da ANA não trazem CNPJ confiável', planoB: 'Coletar as licenças que a CETESB publica no portal de consulta, pelo nome e pelo município do empreendimento, como ligação candidata. Perde-se a ligação exata pelo CNPJ.' },
  { id: 'tjsp', parceiro: 'TJSP (e os tribunais do trabalho e o federal da região)', entrega: 'Nomeações de peritos com o número do processo, a comarca, a especialidade, o perito identificado e os honorários fixados', chave: 'número do processo, identidade autorizada do perito e registro informado', prioridade: 'B', camadas: 'Profissionais, perícias judiciais', basePrevista: 'Extrato regular enviado pelo Tribunal. O Diário da Justiça e o e-SAJ só com coleta aprovada', planoB: 'Ler as nomeações de peritos publicadas no Diário da Justiça Eletrônico, pelo nome e pelo número de registro citado. Perde-se o valor dos honorários e parte das nomeações sem registro citado.' },
  { id: 'rfb-cpf', parceiro: 'Receita Federal (CPF completo dos sócios)', entrega: 'Sócios pessoas físicas com CPF completo, qualificação e data de entrada', chave: 'CPF completo, comparado com o cadastro de profissionais', prioridade: 'B', camadas: 'Painel de Empresas, sócios pessoas físicas', basePrevista: 'Convênio com a Receita, porque o quadro de sócios público mascara o CPF', planoB: 'O quadro de sócios aberto da Receita mostra o nome completo e seis dígitos do CPF. Comparar nome e dígitos com o cadastro de profissionais, que tem o CPF completo, identifica quase todos os sócios profissionais. Os poucos casos ambíguos ficam como candidatos.' },
  { id: 'jucesp', parceiro: 'Junta Comercial do Estado de São Paulo (JUCESP)', entrega: 'Atos de abertura e de alteração do contrato social, com o objeto social, as atividades declaradas e a data de cada ato', chave: 'CNPJ e número do registro na Junta (NIRE)', prioridade: 'A', camadas: 'Painel de Empresas, alterações no contrato social', basePrevista: 'Acordo de cooperação técnica com a Junta Comercial. A carga ainda não foi testada', planoB: 'Comparar a atividade (CNAE) de cada empresa no arquivo mensal da Receita com a do mês anterior. A inclusão de engenharia aparece com a data aproximada do mês, sem o texto do objeto social.' },
  { id: 'detran', parceiro: 'DETRAN-SP', entrega: 'Empresas credenciadas para vistoria e inspeção veicular e para desmontagem e reciclagem, com o CNPJ, a atividade, a validade e o responsável técnico informado', chave: 'CNPJ e número do credenciamento', prioridade: 'B', camadas: 'Painel de Empresas, credenciamentos', basePrevista: 'Acordo de cooperação técnica com o DETRAN-SP; não há arquivo público com o CNPJ e o responsável técnico', planoB: 'Coletar as listas de empresas credenciadas que o DETRAN-SP publica no site, por atividade e município, e ligar pelo CNPJ ou pela razão social. Perde-se a validade de cada credenciamento quando a lista não a traz.' },
  { id: 'inmetro', parceiro: 'INMETRO', entrega: 'Laboratórios e organismos de inspeção acreditados, com o CNPJ, o escopo técnico e a validade da acreditação', chave: 'CNPJ e número da acreditação', prioridade: 'C', camadas: 'Painel de Empresas, credenciamentos', basePrevista: 'Habilitação na base de acreditação do INMETRO, que hoje só se consulta uma a uma', planoB: 'Coletar as listas públicas de laboratórios e organismos acreditados que o INMETRO mantém no site, com o CNPJ e o escopo. Este é o caso em que o acordo menos faz falta.' },
  { id: 'ies', parceiro: 'Instituições de ensino parceiras', entrega: 'Lista autorizada de formados por curso e data de conclusão, com CPF, para acompanhar quem se registra', chave: 'CPF, comparado com o primeiro registro profissional', prioridade: 'B', camadas: 'Formação, lista nominal das instituições parceiras', basePrevista: 'Termo com cada instituição, com finalidade amparada em lei. Os dados públicos do INEP não trazem nomes', planoB: 'Comparar o número de formados por curso e instituição do Censo da Educação Superior com os registros novos do Crea-SP pela instituição que o profissional declara no pedido de registro. Perde-se o acompanhamento pessoa a pessoa.' },
  { id: 'mte', parceiro: 'Ministério do Trabalho (RAIS identificada e eSocial)', entrega: 'Número de empregados por empresa e ocupação, sem nenhum salário individual', chave: 'CNPJ do estabelecimento e código da ocupação', prioridade: 'C', camadas: 'Painel de Empresas, empregados técnicos por empresa', basePrevista: 'Acordo com o Ministério. Até lá, só totais por município e ocupação', planoB: 'Continuar com o emprego formal em totais por município e ocupação (RAIS e Novo CAGED públicos). Por empresa, não há substituto: o bloco sai do demonstrativo e fica só a leitura regional.' },
  { id: 'bcb', parceiro: 'Banco Central (crédito em totais)', entrega: 'Saldo e número de operações de crédito por município e atividade da lista, sempre em totais', chave: 'município, atividade e mês', prioridade: 'C', camadas: 'Painel de Empresas, economia, aberturas e registros', basePrevista: 'Pedido de extração em totais. O dado público de crédito não é aberto por atividade', planoB: 'Usar a estatística bancária por município (ESTBAN) e o painel de crédito por atividade e estado (SCR.data), ambos públicos e mensais. Perde-se o cruzamento de município com atividade ao mesmo tempo.' },
];
export const parceriaPorId = Object.fromEntries(parcerias.map(row => [row.id, row])) as Record<ParceriaId, Parceria>;

const matrizes = (dataset: Dataset) => { const map = new Map<string, Establishment>(); for (const row of dataset.establishments) if (row.branch === 'Matriz') map.set(row.companyId, row); return map; };
const registradasEm = (dataset: Dataset, anchor: string) => new Set(dataset.registrations.filter(row => row.status === 'Ativo' && row.startedAt <= anchor).map(row => row.companyId));
const dentroDe = (companyIds: Set<string> | null, greId: string | null) => (companyId: string, gre: string) => (!companyIds || companyIds.has(companyId)) && (!greId || gre === greId);
const mesesAntes = (anchor: string, meses: number) => { const d = new Date(anchor + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() - meses); return d.toISOString().slice(0, 10); };

/* ---------- UC16 · obras do CNO (Receita Federal, autorizado) ---------- */
export type PapelCno = 'Executora' | 'Responsável tributário' | 'Proprietário';
export const papeisCno: PapelCno[] = ['Executora', 'Responsável tributário', 'Proprietário'];
export type SituacaoCno = 'Ativa' | 'Paralisada' | 'Encerrada';
export const situacoesCno: SituacaoCno[] = ['Ativa', 'Paralisada', 'Encerrada'];
export interface ObraCno {
  id: string; cno: string; companyId: string; papel: PapelCno; cityId: string; greId: string; inscricao: string; situacao: SituacaoCno;
  /** A obra tem os dados mínimos para a conciliação (local, responsável identificado e situação). */
  dadosMinimos: boolean;
  /** Conteúdo do campo ART/RRT do CNO, quando preenchido. */
  campoArt: string | null;
  /** O campo ART tem formato válido e a ART existe na base do Crea-SP para a mesma empresa. */
  artLocalizada: boolean;
}
export interface Cno { obras: ObraCno[]; anchor: string }
const cacheCno = new WeakMap<Dataset, Cno>();
export function buildCno(dataset: Dataset): Cno {
  const saved = cacheCno.get(dataset); if (saved) return saved;
  const anchor = dataset.snapshotDate, obras: ObraCno[] = [];
  for (const place of matrizes(dataset).values()) {
    if (classeDoEstabelecimento(dataset, place) === null || chance(`cno:${place.companyId}`) >= 0.2) continue;
    const quantas = chance(`cno:${place.companyId}:n`) < 0.75 ? 1 : 2;
    for (let n = 0; n < quantas; n++) {
      const key = `cno:${place.companyId}:${n}`, inscricao = dateBetween(`${key}:ins`, place.openedAt > '2021-01-01' ? place.openedAt : '2021-01-01', anchor);
      if (inscricao > anchor) continue;
      const dadosMinimos = chance(`${key}:min`) < 0.85, campoArt = dadosMinimos && chance(`${key}:art`) < 0.6 ? `SP-${between(`${key}:num`, 2021000000, 2026999999)}` : null;
      obras.push({ id: `CNO-${place.companyId}-${n}`, cno: `${between(`${key}:a`, 10, 99)}.${String(between(`${key}:b`, 0, 999)).padStart(3, '0')}.${String(between(`${key}:c`, 0, 99999)).padStart(5, '0')}/${between(`${key}:d`, 10, 99)}`,
        companyId: place.companyId, papel: weighted<PapelCno>(`${key}:papel`, papeisCno, [5, 3, 2]), cityId: place.cityId, greId: place.greId, inscricao,
        situacao: weighted<SituacaoCno>(`${key}:sit`, situacoesCno, [6, 1.5, 2.5]), dadosMinimos, campoArt, artLocalizada: campoArt !== null && chance(`${key}:loc`) < 0.78 });
    }
  }
  const value = { obras, anchor }; cacheCno.set(dataset, value); return value;
}
export interface QuadroCno {
  obras: ObraCno[]; comDadosMinimos: ObraCno[]; comCampoArt: ObraCno[]; comArtLocalizada: ObraCno[]; cobertura: number | null; preenchimento: number | null;
  porSituacao: { situacao: SituacaoCno; n: number }[]; porPapel: { papel: PapelCno; n: number; registradas: number }[];
  porGre: { greId: string; obras: number; artLocalizada: number; semArt: number }[];
  /** Obras ativas ou paralisadas com executora identificada e sem ART localizada (campo vazio ou não encontrado): regra da malha fina. */
  executorasSemArt: string[];
}
export function quadroCno(layer: Cno, dataset: Dataset, companyIds: Set<string> | null, greId: string | null): QuadroCno {
  const anchor = dataset.snapshotDate, dentro = dentroDe(companyIds, greId), registradas = registradasEm(dataset, anchor);
  const obras = layer.obras.filter(row => row.inscricao <= anchor && dentro(row.companyId, row.greId));
  const comDadosMinimos = obras.filter(row => row.dadosMinimos), comCampoArt = comDadosMinimos.filter(row => row.campoArt), comArtLocalizada = comCampoArt.filter(row => row.artLocalizada);
  const semArt = (rows: ObraCno[]) => rows.filter(row => row.dadosMinimos && row.situacao !== 'Encerrada' && row.papel === 'Executora' && !row.artLocalizada);
  const gres = [...new Set(obras.map(row => row.greId))];
  return { obras, comDadosMinimos, comCampoArt, comArtLocalizada, cobertura: share(comArtLocalizada.length, comDadosMinimos.length), preenchimento: share(comCampoArt.length, comDadosMinimos.length),
    porSituacao: situacoesCno.map(situacao => ({ situacao, n: obras.filter(row => row.situacao === situacao).length })),
    porPapel: papeisCno.map(papel => { const rows = obras.filter(row => row.papel === papel); return { papel, n: rows.length, registradas: rows.filter(row => registradas.has(row.companyId)).length }; }),
    porGre: gres.map(id => { const rows = obras.filter(row => row.greId === id); return { greId: id, obras: rows.length, artLocalizada: rows.filter(row => row.artLocalizada).length, semArt: semArt(rows).length }; }).sort((a, b) => b.obras - a.obras),
    executorasSemArt: [...new Set(semArt(obras).map(row => row.companyId))].sort() };
}

/* ---------- UC17 · licenças e alvarás (prefeituras, Corpo de Bombeiros, CETESB, IBAMA, ANA) ---------- */
export type FonteLicenca = 'Alvará municipal' | 'AVCB' | 'CETESB' | 'IBAMA' | 'ANA';
export const fontesLicenca: FonteLicenca[] = ['Alvará municipal', 'AVCB', 'CETESB', 'IBAMA', 'ANA'];
export const parceriaDaLicenca: Record<FonteLicenca, ParceriaId> = { 'Alvará municipal': 'prefeituras', AVCB: 'bombeiros', CETESB: 'cetesb', IBAMA: 'cetesb', ANA: 'cetesb' };
const tiposLicenca: Record<FonteLicenca, string[]> = { 'Alvará municipal': ['Alvará de construção', 'Alvará de funcionamento', 'Alvará de reforma'], AVCB: ['AVCB', 'CLCB'], CETESB: ['Licença prévia', 'Licença de instalação', 'Licença de operação'], IBAMA: ['Licença de operação', 'CTF'], ANA: ['Outorga de uso de água'] };
/** Tipos que correspondem a obra ou instalação: a ART de projeto ou execução deveria existir e se ligar pelo processo. */
const tiposDeObra = new Set(['Alvará de construção', 'Alvará de reforma', 'Licença de instalação', 'AVCB']);
export type FaseLicenca = 'Vigente' | 'Em análise' | 'Expirada';
export const fasesLicenca: FaseLicenca[] = ['Vigente', 'Em análise', 'Expirada'];
export interface Licenca {
  id: string; fonte: FonteLicenca; tipo: string; processo: string; companyId: string; cityId: string; greId: string; emissao: string; validade: string; fase: FaseLicenca;
  /** Empresa executora ou projetista identificada no processo (CNPJ), quando o licenciador a registra. */
  executoraId: string | null;
  /** ART ligada ao processo ou à obra (não por mera titularidade). */
  artPonte: boolean; obra: boolean;
}
export interface Licencas { licencas: Licenca[]; anchor: string }
const cacheLic = new WeakMap<Dataset, Licencas>();
export function buildLicencas(dataset: Dataset): Licencas {
  const saved = cacheLic.get(dataset); if (saved) return saved;
  const anchor = dataset.snapshotDate, companies = dataset.companies, licencas: Licenca[] = [];
  [...matrizes(dataset).values()].forEach((place, index) => {
    if (chance(`lic:${place.companyId}`) >= 0.24) return;
    const quantas = between(`lic:${place.companyId}:n`, 1, 3);
    for (let n = 0; n < quantas; n++) {
      const key = `lic:${place.companyId}:${n}`, fonte = weighted<FonteLicenca>(`${key}:f`, fontesLicenca, [4, 3, 2, 0.5, 0.5]), tipo = pick(`${key}:t`, tiposLicenca[fonte]);
      const emissao = dateBetween(`${key}:e`, '2022-01-01', anchor); if (emissao > anchor) continue;
      const validade = toDate(toDay(emissao) + between(`${key}:v`, 365, 1825)), obra = tiposDeObra.has(tipo);
      const executora = obra && chance(`${key}:ex`) < 0.55 ? companies[(index * 53 + n * 17 + between(`${key}:eo`, 1, 500)) % companies.length] : null;
      const executoraId = executora && executora.id !== place.companyId ? executora.id : null;
      licencas.push({ id: `LIC-${place.companyId}-${n}`, fonte, tipo, processo: `${fonte === 'AVCB' ? 'AVCB' : 'PROC'}-${between(`${key}:p`, 100000, 999999)}/${emissao.slice(0, 4)}`, companyId: place.companyId, cityId: place.cityId, greId: place.greId,
        emissao, validade, fase: chance(`${key}:an`) < 0.1 ? 'Em análise' : validade < anchor ? 'Expirada' : 'Vigente', executoraId, artPonte: obra && chance(`${key}:art`) < (executoraId ? 0.6 : 0.25), obra });
    }
  });
  const value = { licencas, anchor }; cacheLic.set(dataset, value); return value;
}
export interface QuadroLicencas {
  licencas: Licenca[]; vigentes: Licenca[]; titularesDistintos: number;
  porFonte: { fonte: FonteLicenca; n: number; vigentes: number; titularRegistrado: number; executoraIdentificada: number; artPonte: number; obras: number }[];
  /** Taxas por papel (UC17): entidades com correspondência confirmada no papel ÷ entidades com identificador suficiente naquele papel. */
  taxaTitular: number | null; taxaExecutora: number | null; taxaArt: number | null;
  porGre: { greId: string; n: number; obras: number; semArt: number }[];
  /** Licenças ou alvarás de obra vigentes sem ART ligada ao processo: empresa executora quando identificada, senão a titular (se do universo). */
  obrasSemArt: string[];
}
export function quadroLicencas(layer: Licencas, dataset: Dataset, companyIds: Set<string> | null, greId: string | null): QuadroLicencas {
  const anchor = dataset.snapshotDate, dentro = dentroDe(companyIds, greId), registradas = registradasEm(dataset, anchor);
  const licencas = layer.licencas.filter(row => row.emissao <= anchor && dentro(row.companyId, row.greId)).map(row => ({ ...row, fase: row.fase === 'Em análise' ? row.fase : row.validade < anchor ? 'Expirada' as FaseLicenca : 'Vigente' as FaseLicenca }));
  const vigentes = licencas.filter(row => row.fase === 'Vigente'), obras = licencas.filter(row => row.obra);
  const comExecutora = obras.filter(row => row.executoraId), semArtRows = vigentes.filter(row => row.obra && !row.artPonte);
  const gres = [...new Set(licencas.map(row => row.greId))];
  return { licencas, vigentes, titularesDistintos: new Set(licencas.map(row => row.companyId)).size,
    porFonte: fontesLicenca.map(fonte => { const rows = licencas.filter(row => row.fonte === fonte); return { fonte, n: rows.length, vigentes: rows.filter(row => row.fase === 'Vigente').length, titularRegistrado: rows.filter(row => registradas.has(row.companyId)).length, executoraIdentificada: rows.filter(row => row.executoraId).length, artPonte: rows.filter(row => row.artPonte).length, obras: rows.filter(row => row.obra).length }; }),
    taxaTitular: share(licencas.filter(row => registradas.has(row.companyId)).length, licencas.length), taxaExecutora: share(comExecutora.length, obras.length), taxaArt: share(obras.filter(row => row.artPonte).length, obras.length),
    porGre: gres.map(id => { const rows = licencas.filter(row => row.greId === id); return { greId: id, n: rows.length, obras: rows.filter(row => row.obra).length, semArt: rows.filter(row => row.fase === 'Vigente' && row.obra && !row.artPonte).length }; }).sort((a, b) => b.n - a.n),
    obrasSemArt: [...new Set(semArtRows.map(row => row.executoraId ?? row.companyId))].sort() };
}

/* ---------- UC29 e UC30 · perícias judiciais (TJSP) ---------- */
export type PontePericia = 'Confirmada' | 'Aguardando verificação' | 'Sem chave';
export const pontesPericia: PontePericia[] = ['Confirmada', 'Aguardando verificação', 'Sem chave'];
export interface Nomeacao {
  id: string; processo: string; cityId: string; greId: string; especialidade: Modalidade; data: string;
  /** Perito identificado no cadastro profissional do Crea-SP (identidade autorizada pelo tribunal), ou `null` quando não localizado. */
  profissionalId: string | null; registroInformado: string | null; honorariosArbitrados: number;
  /** A nomeação traz número CNJ, órgão e perito identificado: dados mínimos comparáveis com a ART. */
  dadosMinimos: boolean; ponte: PontePericia;
}
export interface Pericias { nomeacoes: Nomeacao[]; anchor: string }
const cachePer = new WeakMap<Dataset, Pericias>();
export function buildPericias(dataset: Dataset, modelo: ModeloProfissionais = buildProfissionais(dataset)): Pericias {
  const saved = cachePer.get(dataset); if (saved) return saved;
  const anchor = dataset.snapshotDate, inicio = mesesAntes(anchor, 24), nomeacoes: Nomeacao[] = [];
  const porGre = new Map<string, Profissional[]>();
  for (const row of modelo.profissionais) porGre.set(row.greId, [...(porGre.get(row.greId) ?? []), row]);
  for (const city of dataset.cities) {
    const quantas = between(`per:${city.id}`, 2, 16); let anterior: string | null = null;
    for (let n = 0; n < quantas; n++) {
      const key = `per:${city.id}:${n}`, data = dateBetween(`${key}:d`, inicio, anchor); if (data > anchor) continue;
      const candidatos = porGre.get(city.greId) ?? [], perito = candidatos.length && chance(`${key}:id`) < 0.82 ? candidatos[between(`${key}:p`, 0, candidatos.length - 1)] : null;
      const especialidade = perito ? perito.modalidade : weighted<Modalidade>(`${key}:esp`, modalidades, [50, 15, 15, 4, 6, 3, 4, 3]);
      const dadosMinimos = chance(`${key}:min`) < 0.8 && perito !== null;
      const ano = data.slice(0, 4), proprio = `${String(between(`${key}:n1`, 0, 9999999)).padStart(7, '0')}-${String(between(`${key}:dv`, 0, 99)).padStart(2, '0')}.${ano}.8.26.${String(between(`${key}:f`, 1, 699)).padStart(4, '0')}`;
      // Um processo pode ter mais de uma nomeação (substituição ou perícia complementar): processos nunca são o mesmo total.
      const numero: string = anterior && chance(`${key}:mesmo`) < 0.18 ? anterior : proprio; anterior = numero;
      nomeacoes.push({ id: `NOM-${city.id}-${n}`, processo: numero, cityId: city.id, greId: city.greId, especialidade, data, profissionalId: perito?.id ?? null,
        registroInformado: perito && chance(`${key}:reg`) < 0.9 ? `${between(`${key}:r`, 5000000000, 5099999999)}` : null, honorariosArbitrados: between(`${key}:h`, 1500, 18000),
        dadosMinimos, ponte: !dadosMinimos ? 'Sem chave' : weighted<PontePericia>(`${key}:ponte`, ['Confirmada', 'Aguardando verificação'], [65, 35]) });
    }
  }
  nomeacoes.sort((a, b) => a.data.localeCompare(b.data));
  const value = { nomeacoes, anchor }; cachePer.set(dataset, value); return value;
}
export interface QuadroPericias {
  nomeacoes: Nomeacao[]; processos: number; comarcas: number; honorariosArbitrados: number;
  /** UC30: rastreabilidade = ponte confirmada ÷ nomeações com dados mínimos; cobertura de chaves = com dados mínimos ÷ todas. */
  rastreabilidade: number | null; coberturaChaves: number | null; porPonte: { ponte: PontePericia; n: number }[];
  porEspecialidade: { especialidade: Modalidade; n: number; semRegistroAtivo: number }[]; mensal: { month: string; n: number }[];
  /** Peritos nomeados que não estão ativos no cadastro em D (cancelados, interrompidos) e nomeações sem perito localizado. */
  peritosSemRegistroAtivo: Profissional[]; naoLocalizadas: number; nomeacoesSemRegistroAtivo: Nomeacao[];
}
export function quadroPericias(layer: Pericias, dataset: Dataset, modelo: ModeloProfissionais, greId: string | null): QuadroPericias {
  const anchor = dataset.snapshotDate, nomeacoes = layer.nomeacoes.filter(row => row.data <= anchor && (!greId || row.greId === greId));
  const ativo = (id: string | null) => { const row = id ? modelo.porId.get(id) : undefined; return row ? situacaoEm(row, anchor) === 'Ativo' : false; };
  const semAtivo = nomeacoes.filter(row => !ativo(row.profissionalId)), comMinimos = nomeacoes.filter(row => row.dadosMinimos), confirmadas = comMinimos.filter(row => row.ponte === 'Confirmada');
  const meses: string[] = []; for (let m = 11; m >= 0; m--) meses.push(mesesAntes(anchor, m).slice(0, 7));
  const peritos = new Map<string, Profissional>();
  for (const row of semAtivo) { const p = row.profissionalId ? modelo.porId.get(row.profissionalId) : undefined; if (p) peritos.set(p.id, p); }
  return { nomeacoes, processos: new Set(nomeacoes.map(row => row.processo)).size, comarcas: new Set(nomeacoes.map(row => row.cityId)).size, honorariosArbitrados: sum(nomeacoes.map(row => row.honorariosArbitrados)),
    rastreabilidade: share(confirmadas.length, comMinimos.length), coberturaChaves: share(comMinimos.length, nomeacoes.length), porPonte: pontesPericia.map(ponte => ({ ponte, n: nomeacoes.filter(row => row.ponte === ponte).length })),
    porEspecialidade: modalidades.map(especialidade => { const rows = nomeacoes.filter(row => row.especialidade === especialidade); return { especialidade, n: rows.length, semRegistroAtivo: rows.filter(row => !ativo(row.profissionalId)).length }; }).filter(row => row.n > 0).sort((a, b) => b.n - a.n),
    mensal: meses.map(month => ({ month, n: nomeacoes.filter(row => row.data.slice(0, 7) === month).length })),
    peritosSemRegistroAtivo: [...peritos.values()].sort((a, b) => a.nome.localeCompare(b.nome)), naoLocalizadas: semAtivo.filter(row => !row.profissionalId).length, nomeacoesSemRegistroAtivo: semAtivo };
}

/* ---------- TCE despesa × contrato (TCE-SP e TCM-SP) ---------- */
export type PonteTce = 'Validada' | 'De-para pendente' | 'Sem ponte';
export const pontesTce: PonteTce[] = ['Validada', 'De-para pendente', 'Sem ponte'];
export interface EtapaFinanceira { contractId: string; companyId: string; buyerId: string; fonte: 'TCE-SP' | 'TCM-SP'; contratado: number; empenhado: number; liquidado: number; pago: number; ponte: PonteTce; ultimoPagamento: string | null }
export interface DespesaTce { etapas: EtapaFinanceira[]; anchor: string }
const cacheTce = new WeakMap<Dataset, DespesaTce>();
/** Uma linha por contrato do cenário: as etapas financeiras publicadas pelo tribunal, lidas em D. Valores de etapas distintas nunca se somam. */
export function buildDespesaTce(dataset: Dataset): DespesaTce {
  const saved = cacheTce.get(dataset); if (saved) return saved;
  const anchor = dataset.snapshotDate, esferas = new Map(dataset.buyers.map(row => [row.id, row.sphere]));
  const etapas: EtapaFinanceira[] = dataset.contracts.filter(row => row.date <= anchor && esferas.get(row.buyerId) !== 'Federal').map(contract => {
    const key = `tce:${contract.id}`, ponte = weighted<PonteTce>(`${key}:p`, pontesTce, [5, 3, 2]);
    const meses = Math.max(0, (toDay(anchor) - toDay(contract.date)) / 30), avanco = Math.min(1, meses / between(`${key}:dur`, 6, 24));
    const empenhado = Math.round(contract.value * between(`${key}:e`, 70, 100) / 100), liquidado = Math.round(empenhado * avanco * between(`${key}:l`, 60, 100) / 100), pago = Math.round(liquidado * between(`${key}:pg`, 70, 100) / 100);
    return { contractId: contract.id, companyId: contract.companyId, buyerId: contract.buyerId, fonte: chance(`${key}:f`) < 0.12 ? 'TCM-SP' : 'TCE-SP', contratado: contract.value, empenhado, liquidado, pago, ponte,
      ultimoPagamento: pago > 0 ? toDate(toDay(contract.date) + Math.round(meses * 30 * between(`${key}:up`, 50, 100) / 100)) : null };
  });
  const value = { etapas, anchor }; cacheTce.set(dataset, value); return value;
}
export interface QuadroTce {
  etapas: EtapaFinanceira[]; contratosNoPeriodo: number; contratado: number; empenhado: number; liquidado: number; pago: number;
  porPonte: { ponte: PonteTce; n: number; contratado: number }[]; coberturaPonte: number | null;
  porOrgao: { buyerId: string; contratos: number; contratado: number; pago: number }[];
  /** Contratos com ponte validada e nenhum pagamento publicado: execução ainda não refletida nas etapas do tribunal. */
  semPagamento: EtapaFinanceira[];
}
export function quadroTce(layer: DespesaTce, contratos: ContratoPublico[]): QuadroTce {
  const ids = new Set(contratos.map(row => row.id)), etapas = layer.etapas.filter(row => ids.has(row.contractId)), validadas = etapas.filter(row => row.ponte === 'Validada');
  const orgaos = [...new Set(etapas.map(row => row.buyerId))];
  return { etapas, contratosNoPeriodo: contratos.length, contratado: sum(etapas.map(row => row.contratado)), empenhado: sum(etapas.map(row => row.empenhado)), liquidado: sum(etapas.map(row => row.liquidado)), pago: sum(etapas.map(row => row.pago)),
    porPonte: pontesTce.map(ponte => { const rows = etapas.filter(row => row.ponte === ponte); return { ponte, n: rows.length, contratado: sum(rows.map(row => row.contratado)) }; }), coberturaPonte: share(validadas.length, etapas.length),
    porOrgao: orgaos.map(buyerId => { const rows = etapas.filter(row => row.buyerId === buyerId); return { buyerId, contratos: rows.length, contratado: sum(rows.map(row => row.contratado)), pago: sum(rows.map(row => row.pago)) }; }).sort((a, b) => b.contratado - a.contratado),
    semPagamento: validadas.filter(row => row.pago === 0) };
}

/* ---------- Contexto econômico: PIB e VAB (IBGE, automático) e crédito por CNAE (BCB, parceria) ---------- */
export const pibCidade = (cityId: string) => populacaoCidade(cityId) * between(`pib:${cityId}`, 18_000, 62_000);
export const vabCidade = (cityId: string) => Math.round(pibCidade(cityId) * between(`vab:${cityId}`, 70, 86) / 100);
/** Saldo de crédito PJ nos CNAEs da lista (R$) e operações, por município: só chega em agregado pelo acordo com o BCB. */
export const creditoCidade = (cityId: string) => { const saldo = Math.round(pibCidade(cityId) * between(`cred:${cityId}`, 8, 40) / 1000); return { saldo, operacoes: Math.max(1, Math.round(saldo / between(`cred:${cityId}:op`, 90_000, 260_000))) }; };
export interface ContextoGre { greId: string; name: string; pib: number; vab: number; creditoSaldo: number; creditoOperacoes: number; elegiveis: number; registradas: number; creditoPorElegivel: number | null; pibPorHabitante: number | null; populacao: number }
const cacheCtx = new WeakMap<Dataset, ContextoGre[]>();
export function contextoEconomico(view: Dataset): ContextoGre[] {
  const saved = cacheCtx.get(view); if (saved) return saved;
  const vigentes = new Set(view.registrations.filter(row => row.status === 'Ativo').map(row => row.establishmentId));
  const rows = view.gres.map(gre => {
    const cidades = view.cities.filter(row => row.greId === gre.id), populacao = sum(cidades.map(row => populacaoCidade(row.id)));
    const pib = sum(cidades.map(row => pibCidade(row.id))), vab = sum(cidades.map(row => vabCidade(row.id))), credito = cidades.map(row => creditoCidade(row.id));
    const elegiveis = view.establishments.filter(row => row.greId === gre.id && row.rfbStatus === 'Ativa' && classeDoEstabelecimento(view, row) !== null);
    const creditoSaldo = sum(credito.map(row => row.saldo));
    return { greId: gre.id, name: gre.name, pib, vab, creditoSaldo, creditoOperacoes: sum(credito.map(row => row.operacoes)), elegiveis: elegiveis.length, registradas: elegiveis.filter(row => vigentes.has(row.id)).length,
      creditoPorElegivel: elegiveis.length ? creditoSaldo / elegiveis.length : null, pibPorHabitante: populacao ? pib / populacao : null, populacao };
  });
  cacheCtx.set(view, rows); return rows;
}

/* ---------- UC07 (complemento) · sócios pessoa física com CPF completo (RFB) ---------- */
export type QualificacaoPf = 'Sócio-administrador' | 'Sócio' | 'Administrador';
export interface SocioPf {
  id: string; empresaId: string; nome: string; qualificacao: QualificacaoPf; participacao: number; desde: string;
  /** Sócio identificado no cadastro profissional pelo CPF completo, ou `null` quando não é profissional do sistema Confea/Crea. */
  profissionalId: string | null;
}
export interface SociosPf { socios: SocioPf[]; anchor: string }
const cachePf = new WeakMap<Dataset, SociosPf>();
const nomesPf = ['A. Silva', 'B. Santos', 'C. Oliveira', 'D. Souza', 'E. Rodrigues', 'F. Ferreira', 'G. Alves', 'H. Pereira', 'I. Lima', 'J. Gomes', 'K. Costa', 'L. Ribeiro', 'M. Martins', 'N. Carvalho', 'O. Araújo'];
export function buildSociosPf(dataset: Dataset, modelo: ModeloProfissionais = buildProfissionais(dataset)): SociosPf {
  const saved = cachePf.get(dataset); if (saved) return saved;
  const anchor = dataset.snapshotDate, socios: SocioPf[] = [], profissionais = modelo.profissionais, abertura = new Map([...matrizes(dataset)].map(([id, row]) => [id, row.openedAt]));
  const rts = new Map<string, string[]>();
  for (const link of dataset.technicalLinks) if (modelo.porId.has(link.professionalId)) rts.set(link.companyId, [...(rts.get(link.companyId) ?? []), link.professionalId]);
  for (const company of dataset.companies) {
    const quantos = chance(`pf:${company.id}`) < 0.3 ? 0 : between(`pf:${company.id}:n`, 1, 3), meusRts = rts.get(company.id) ?? [];
    for (let n = 0; n < quantos; n++) {
      const key = `pf:${company.id}:${n}`, desde = dateBetween(`${key}:desde`, abertura.get(company.id) ?? '2012-01-01', anchor); if (desde > anchor) continue;
      // Parte dos sócios profissionais é o próprio RT (atual ou antigo) da empresa: sociedade e responsabilidade técnica coincidem com frequência.
      const sorteio = chance(`${key}:prof`);
      const profissional = n === 0 && meusRts.length && sorteio < 0.3 ? modelo.porId.get(meusRts[between(`${key}:rt`, 0, meusRts.length - 1)])! : profissionais.length && sorteio < 0.4 ? profissionais[between(`${key}:pi`, 0, profissionais.length - 1)] : null;
      socios.push({ id: key, empresaId: company.id, nome: profissional ? profissional.nome : `${pick(`${key}:nome`, nomesPf)} (demonstrativo)`, qualificacao: n === 0 ? 'Sócio-administrador' : weighted<QualificacaoPf>(`${key}:q`, ['Sócio', 'Administrador', 'Sócio-administrador'], [6, 1, 3]),
        participacao: between(`${key}:p`, 5, 90), desde, profissionalId: profissional?.id ?? null });
    }
  }
  const value = { socios, anchor }; cachePf.set(dataset, value); return value;
}
/* ---------- Nome da empresa e quem a dirige (Lei 5.194/66, arts. 4º e 5º) ---------- */
/**
 * A lei não exige que os sócios sejam profissionais para a empresa se registrar: basta o responsável técnico (art. 8º, parágrafo
 * único, e art. 59). A exigência vale para o nome. "Engenharia" ou "agronomia" na razão social pede diretoria composta, na maioria,
 * de profissionais registrados (art. 5º); "engenheiro" ou "engenheiro-agrônomo" pede sociedade só de profissionais (art. 4º).
 * O art. 59, § 1º, condiciona o registro a um nome condizente com a finalidade e com a qualificação de quem compõe a empresa.
 */
export interface LinhaDenominacao { empresaId: string; nome: string; regra: 'Maioria da diretoria (art. 5º)' | 'Só profissionais (art. 4º)'; dirigentes: number; profissionaisAtivos: number; atende: boolean; registrada: boolean }
export interface QuadroDenominacao { linhas: LinhaDenominacao[]; atendem: string[]; naoAtendem: string[]; naoAtendemRegistradas: string[]; semDirigente: string[] }
const termoArt4 = /\bengenheir[oa]s?\b|\bengenheir[oa]s?-agr[oô]nom[oa]s?\b/i, termoArt5 = /\bengenharia\b|\bagronomia\b/i;
export function quadroDenominacao(layer: SociosPf, dataset: Dataset, modelo: ModeloProfissionais, companyIds: Set<string> | null, greId: string | null): QuadroDenominacao {
  const anchor = dataset.snapshotDate, gre = new Map([...matrizes(dataset)].map(([id, row]) => [id, row.greId])), dentro = dentroDe(companyIds, greId), registradas = registradasEm(dataset, anchor);
  const porEmpresa = new Map<string, SocioPf[]>();
  for (const row of layer.socios) if (row.desde <= anchor) porEmpresa.set(row.empresaId, [...(porEmpresa.get(row.empresaId) ?? []), row]);
  const ativo = (id: string | null) => { const row = id ? modelo.porId.get(id) : undefined; return row ? situacaoEm(row, anchor) === 'Ativo' : false; };
  const linhas: LinhaDenominacao[] = [];
  for (const company of dataset.companies) {
    if (!dentro(company.id, gre.get(company.id) ?? '')) continue;
    const art4 = termoArt4.test(company.name), art5 = termoArt5.test(company.name); if (!art4 && !art5) continue;
    const socios = porEmpresa.get(company.id) ?? [];
    // Art. 5º fala da diretoria: sócios-administradores e administradores. Art. 4º fala de quem compõe a pessoa jurídica: todos os sócios.
    const dirigentes = art4 ? socios : socios.filter(row => row.qualificacao !== 'Sócio'), profissionaisAtivos = dirigentes.filter(row => ativo(row.profissionalId)).length;
    const atende = dirigentes.length > 0 && (art4 ? profissionaisAtivos === dirigentes.length : profissionaisAtivos > dirigentes.length / 2);
    linhas.push({ empresaId: company.id, nome: company.name, regra: art4 ? 'Só profissionais (art. 4º)' : 'Maioria da diretoria (art. 5º)', dirigentes: dirigentes.length, profissionaisAtivos, atende, registrada: registradas.has(company.id) });
  }
  const ids = (filtro: (row: LinhaDenominacao) => boolean) => linhas.filter(filtro).map(row => row.empresaId);
  return { linhas, atendem: ids(row => row.atende), naoAtendem: ids(row => !row.atende && row.dirigentes > 0), naoAtendemRegistradas: ids(row => !row.atende && row.dirigentes > 0 && row.registrada), semDirigente: ids(row => row.dirigentes === 0) };
}
export interface QuadroSociosPf {
  socios: SocioPf[]; empresasComSocioPf: string[]; sociosProfissionais: SocioPf[]; sociosProfissionaisAtivos: number;
  /** Sócio profissional que também é RT vigente da própria empresa. */
  socioEhRt: SocioPf[];
  /** Empresa registrada sem RT vigente cujo sócio é profissional ativo da modalidade (contexto: candidato natural a RT). */
  registradasSemRtComSocioProfissional: string[];
  /** Empresa registrada cujo sócio profissional está com registro cancelado ou interrompido em D (contexto). */
  registradasComSocioProfissionalInativo: string[];
  porQualificacao: { qualificacao: QualificacaoPf; n: number; profissionais: number }[];
}
export function quadroSociosPf(layer: SociosPf, dataset: Dataset, modelo: ModeloProfissionais, companyIds: Set<string> | null, greId: string | null): QuadroSociosPf {
  const anchor = dataset.snapshotDate, gre = new Map([...matrizes(dataset)].map(([id, row]) => [id, row.greId])), dentro = dentroDe(companyIds, greId), registradas = registradasEm(dataset, anchor);
  const socios = layer.socios.filter(row => row.desde <= anchor && dentro(row.empresaId, gre.get(row.empresaId) ?? ''));
  const rtVigente = new Map<string, Set<string>>();
  for (const link of dataset.technicalLinks) if (link.startDate <= anchor && (!link.endDate || link.endDate > anchor)) rtVigente.set(link.companyId, (rtVigente.get(link.companyId) ?? new Set()).add(link.professionalId));
  const situacao = (id: string | null) => { const row = id ? modelo.porId.get(id) : undefined; return row ? situacaoEm(row, anchor) : null; };
  const sociosProfissionais = socios.filter(row => row.profissionalId && situacao(row.profissionalId) !== null);
  const socioEhRt = sociosProfissionais.filter(row => rtVigente.get(row.empresaId)?.has(row.profissionalId!));
  const unicos = (ids: string[]) => [...new Set(ids)].sort();
  return { socios, empresasComSocioPf: unicos(socios.map(row => row.empresaId)), sociosProfissionais, sociosProfissionaisAtivos: sociosProfissionais.filter(row => situacao(row.profissionalId) === 'Ativo').length, socioEhRt,
    registradasSemRtComSocioProfissional: unicos(sociosProfissionais.filter(row => registradas.has(row.empresaId) && !rtVigente.get(row.empresaId)?.size && situacao(row.profissionalId) === 'Ativo').map(row => row.empresaId)),
    registradasComSocioProfissionalInativo: unicos(sociosProfissionais.filter(row => registradas.has(row.empresaId) && situacao(row.profissionalId) !== 'Ativo').map(row => row.empresaId)),
    porQualificacao: (['Sócio-administrador', 'Sócio', 'Administrador'] as QualificacaoPf[]).map(qualificacao => ({ qualificacao, n: socios.filter(row => row.qualificacao === qualificacao).length, profissionais: sociosProfissionais.filter(row => row.qualificacao === qualificacao).length })) };
}

/* ---------- UC28 · coorte nominal das IES parceiras ---------- */
export const iesParceira = (iesId: string) => chance(`ies-parceira:${iesId}`) < 0.4;
export interface CoorteNominal {
  ano: number; iesParceiras: number; diplomados: number;
  /** Primeiro registro até 3, 6, 12 e 24 meses depois do fim do ano de conclusão; registros anteriores à conclusão ficam à parte. */
  ate: { meses: number; registrados: number; taxa: number | null; fechada: boolean }[]; registroAnterior: number; registrados: Profissional[];
}
export interface QuadroCoorteNominal { coortes: CoorteNominal[]; iesParceiras: number; iesTotal: number; coberturaIes: number | null; ultimaFechada: CoorteNominal | null }
/** Lido em D: só coortes cujo prazo já passou fecham; a taxa vale só para as IES parceiras, nunca extrapola para todas as IES de SP. */
export function coorteNominal(formacao: Formacao, modelo: ModeloProfissionais, dataset: Dataset, greId: string | null): QuadroCoorteNominal {
  const anchor = dataset.snapshotDate, parceiras = new Set(formacao.ies.filter(row => iesParceira(row.id)).map(row => row.id)), modalidadesDa = new Map(formacao.ies.map(row => [row.id, new Set<string>(row.modalidades)]));
  // Só pessoas da lista nominal: IES parceira e curso (modalidade) que a IES oferece; o recorte regional segue o endereço profissional.
  const profissionais = modelo.profissionais.filter(row => parceiras.has(row.iesId) && modalidadesDa.get(row.iesId)?.has(row.modalidade) && row.registroEm <= anchor && (!greId || row.greId === greId));
  const coortes = formacao.anos.map(ano => {
    const fim = `${ano}-12-31`, diplomados = sum(formacao.concluintes.filter(row => row.ano === ano && parceiras.has(row.iesId)).map(row => row.concluintes));
    const pessoas = profissionais.filter(row => row.anoConclusao === ano), anteriores = pessoas.filter(row => row.registroEm <= fim), depois = pessoas.filter(row => row.registroEm > fim);
    const ate = [3, 6, 12, 24].map(meses => { const limite = mesesAntes(fim, -meses); const registrados = depois.filter(row => row.registroEm <= limite).length; const fechada = limite <= anchor; return { meses, registrados, taxa: fechada ? share(registrados, diplomados) : null, fechada }; });
    return { ano, iesParceiras: parceiras.size, diplomados, ate, registroAnterior: anteriores.length, registrados: depois };
  }).filter(row => row.diplomados > 0);
  const fechadas = coortes.filter(row => row.ate[3].fechada);
  return { coortes, iesParceiras: parceiras.size, iesTotal: formacao.ies.length, coberturaIes: share(parceiras.size, formacao.ies.length), ultimaFechada: fechadas.at(-1) ?? null };
}

/* ---------- MTE · vínculos técnicos por empresa (RAIS identificada) ---------- */
export interface VinculosEmpresa { companyId: string; greId: string; vinculosTotal: number; vinculosTecnicos: number }
export interface Vinculos { empresas: VinculosEmpresa[]; anchor: string }
const cacheVinc = new WeakMap<Dataset, Vinculos>();
const porteBase: Record<string, [number, number]> = { Microempresa: [1, 9], 'Pequena empresa': [8, 49], 'Média empresa': [40, 199], 'Grande empresa': [150, 900] };
/** Vínculos CLT por empresa-raiz no último mês disponível: total e em CBOs de engenharia. Só contagens; nenhum salário individual. */
export function buildVinculos(dataset: Dataset): Vinculos {
  const saved = cacheVinc.get(dataset); if (saved) return saved;
  const anchor = dataset.snapshotDate, gre = matrizes(dataset), empresas: VinculosEmpresa[] = [];
  for (const company of dataset.companies) {
    const place = gre.get(company.id); if (!place || place.openedAt > anchor || place.rfbStatus !== 'Ativa' || chance(`vinc:${company.id}`) >= 0.7) continue;
    const [min, max] = porteBase[company.size] ?? [1, 9], total = between(`vinc:${company.id}:t`, min, max);
    empresas.push({ companyId: company.id, greId: place.greId, vinculosTotal: total, vinculosTecnicos: Math.min(total, Math.round(total * between(`vinc:${company.id}:tec`, 0, 35) / 100)) });
  }
  const value = { empresas, anchor }; cacheVinc.set(dataset, value); return value;
}
export const faixasVinculos = ['nenhum', '1 a 2', '3 a 9', '10 ou mais'];
export const faixaVinculos = (n: number) => n === 0 ? faixasVinculos[0] : n <= 2 ? faixasVinculos[1] : n <= 9 ? faixasVinculos[2] : faixasVinculos[3];
export interface QuadroVinculos {
  empresas: VinculosEmpresa[]; comTecnicos: VinculosEmpresa[]; vinculosTecnicos: number; vinculosTotal: number;
  porFaixa: { faixa: string; registradas: number; semRegistro: number }[];
  /** Empresa registrada com empregados em CBO de engenharia e nenhum RT vigente (contexto). */
  registradasSemRt: string[];
  /** Estabelecimento do universo (CNAE da lista) sem registro e com empregados em CBO de engenharia (contexto). */
  semRegistroComTecnicos: string[];
}
export function quadroVinculos(layer: Vinculos, dataset: Dataset, companyIds: Set<string> | null, greId: string | null): QuadroVinculos {
  const anchor = dataset.snapshotDate, dentro = dentroDe(companyIds, greId), registradas = registradasEm(dataset, anchor), places = matrizes(dataset);
  const empresas = layer.empresas.filter(row => dentro(row.companyId, row.greId)), comTecnicos = empresas.filter(row => row.vinculosTecnicos > 0);
  const rtVigente = new Set(dataset.technicalLinks.filter(link => link.startDate <= anchor && (!link.endDate || link.endDate > anchor)).map(link => link.companyId));
  const universo = (id: string) => { const place = places.get(id); return place ? classeDoEstabelecimento(dataset, place) !== null : false; };
  return { empresas, comTecnicos, vinculosTecnicos: sum(empresas.map(row => row.vinculosTecnicos)), vinculosTotal: sum(empresas.map(row => row.vinculosTotal)),
    porFaixa: faixasVinculos.map(faixa => ({ faixa, registradas: empresas.filter(row => registradas.has(row.companyId) && faixaVinculos(row.vinculosTecnicos) === faixa).length, semRegistro: empresas.filter(row => !registradas.has(row.companyId) && universo(row.companyId) && faixaVinculos(row.vinculosTecnicos) === faixa).length })),
    registradasSemRt: comTecnicos.filter(row => registradas.has(row.companyId) && !rtVigente.has(row.companyId)).map(row => row.companyId).sort(),
    semRegistroComTecnicos: comTecnicos.filter(row => !registradas.has(row.companyId) && universo(row.companyId)).map(row => row.companyId).sort() };
}


/* ---------- Painel de Empresas · credenciamentos técnicos (DETRAN-SP e INMETRO) ---------- */
export type FonteCredenciamento = 'DETRAN-SP' | 'INMETRO';
export const fontesCredenciamento: FonteCredenciamento[] = ['DETRAN-SP', 'INMETRO'];
export const atividadesCredenciamento: Record<FonteCredenciamento, string[]> = {
  'DETRAN-SP': ['Vistoria de identificação veicular', 'Inspeção veicular', 'Desmontagem e reciclagem'],
  INMETRO: ['Laboratório de ensaio', 'Laboratório de calibração', 'Organismo de inspeção'],
};
export interface Credenciamento { id: string; fonte: FonteCredenciamento; atividade: string; companyId: string; greId: string; desde: string; validade: string }
export interface Credenciamentos { credenciamentos: Credenciamento[] }
const cacheCred = new WeakMap<Dataset, Credenciamentos>();
/** Empresas credenciadas por órgãos técnicos, sorteadas de forma estável entre as matrizes do cenário. Demonstrativo: depende de acordo com cada órgão. */
export function buildCredenciamentos(dataset: Dataset): Credenciamentos {
  const saved = cacheCred.get(dataset); if (saved) return saved;
  const rows: Credenciamento[] = [], inicio = `${dataset.months[0]}-01`;
  for (const place of matrizes(dataset).values()) for (const fonte of fontesCredenciamento) {
    if (chance(`cred:${fonte}:${place.companyId}`) > (fonte === 'DETRAN-SP' ? 0.035 : 0.022)) continue;
    const desde = dateBetween(`cred:${fonte}:${place.companyId}:d`, inicio, dataset.snapshotDate);
    rows.push({ id: `${fonte}-${place.companyId}`, fonte, atividade: pick(`cred:${fonte}:${place.companyId}:a`, atividadesCredenciamento[fonte]), companyId: place.companyId, greId: place.greId, desde,
      validade: toDate(toDay(desde) + between(`cred:${fonte}:${place.companyId}:v`, 365, 1460)) });
  }
  const value = { credenciamentos: rows }; cacheCred.set(dataset, value); return value;
}
export interface LinhaCredenciamento { fonte: FonteCredenciamento; atividade: string; empresas: string[]; registradas: string[]; comRt: string[]; semRegistro: string[]; registradasSemRt: string[] }
export interface QuadroCredenciamentos { linhas: LinhaCredenciamento[]; total: number; semRegistro: string[]; registradasSemRt: string[] }
/** Credenciamentos vigentes na data de referência, por fonte e atividade, com a situação da empresa no cadastro e o RT vigente. */
export function quadroCredenciamentos(layer: Credenciamentos, dataset: Dataset, companyIds: Set<string> | null, greId: string | null): QuadroCredenciamentos {
  const anchor = dataset.snapshotDate, registradas = registradasEm(dataset, anchor), dentro = dentroDe(companyIds, greId);
  const rt = new Set(dataset.technicalLinks.filter(row => row.startDate <= anchor && (!row.endDate || row.endDate > anchor)).map(row => row.companyId));
  const vigentes = layer.credenciamentos.filter(row => row.desde <= anchor && row.validade >= anchor && dentro(row.companyId, row.greId));
  const linhas = fontesCredenciamento.flatMap(fonte => atividadesCredenciamento[fonte].map(atividade => {
    const empresas = [...new Set(vigentes.filter(row => row.fonte === fonte && row.atividade === atividade).map(row => row.companyId))];
    const reg = empresas.filter(id => registradas.has(id));
    return { fonte, atividade, empresas, registradas: reg, comRt: reg.filter(id => rt.has(id)), semRegistro: empresas.filter(id => !registradas.has(id)), registradasSemRt: reg.filter(id => !rt.has(id)) };
  }));
  const unicos = (ids: string[]) => [...new Set(ids)];
  return { linhas, total: new Set(vigentes.map(row => row.companyId)).size, semRegistro: unicos(linhas.flatMap(row => row.semRegistro)), registradasSemRt: unicos(linhas.flatMap(row => row.registradasSemRt)) };
}

/* ---------- Painel de Empresas · alterações no contrato social (JUCESP) ---------- */
export interface AlteracaoJucesp { id: string; companyId: string; greId: string; data: string; tipo: 'Abertura' | 'Alteração do objeto social' }
export interface Jucesp { atos: AlteracaoJucesp[] }
const cacheJucesp = new WeakMap<Dataset, Jucesp>();
/** Atos da Junta Comercial que incluíram uma atividade da lista do Crea-SP no contrato social: a abertura da empresa ou uma alteração posterior. Demonstrativo. */
export function buildJucesp(dataset: Dataset): Jucesp {
  const saved = cacheJucesp.get(dataset); if (saved) return saved;
  const atos: AlteracaoJucesp[] = [], inicio = `${dataset.months[0]}-01`;
  for (const place of matrizes(dataset).values()) {
    if (classeDoEstabelecimento(dataset, place) === null) continue;
    if (place.openedAt >= inicio) atos.push({ id: `jc-a-${place.companyId}`, companyId: place.companyId, greId: place.greId, data: place.openedAt, tipo: 'Abertura' });
    else if (chance(`jucesp:${place.companyId}`) < 0.07) atos.push({ id: `jc-o-${place.companyId}`, companyId: place.companyId, greId: place.greId, data: dateBetween(`jucesp:${place.companyId}:d`, inicio, dataset.snapshotDate), tipo: 'Alteração do objeto social' });
  }
  const value = { atos }; cacheJucesp.set(dataset, value); return value;
}
export interface TrimestreJucesp { trimestre: string; aberturas: number; alteracoes: number; registradasDepois: number }
export interface QuadroJucesp { trimestres: TrimestreJucesp[]; atos: AlteracaoJucesp[]; registradasDepois: string[]; jaRegistradas: string[]; semRegistro: string[]; alteracoesSemRegistro: string[] }
/** Atos dos últimos 24 meses até a data de referência: quantos foram seguidos de registro no Crea-SP, quantos já tinham registro e quantos seguem sem registro. */
export function quadroJucesp(layer: Jucesp, dataset: Dataset, companyIds: Set<string> | null, greId: string | null): QuadroJucesp {
  const anchor = dataset.snapshotDate, inicio = mesesAntes(anchor, 24), dentro = dentroDe(companyIds, greId);
  const atos = layer.atos.filter(row => row.data > inicio && row.data <= anchor && dentro(row.companyId, row.greId));
  const regs = dataset.registrations.filter(row => row.startedAt <= anchor);
  const primeira = new Map<string, string>(), vigente = new Set<string>();
  for (const row of regs) { const atual = primeira.get(row.companyId); if (!atual || row.startedAt < atual) primeira.set(row.companyId, row.startedAt); if (row.status === 'Ativo') vigente.add(row.companyId); }
  const depois = (row: AlteracaoJucesp) => vigente.has(row.companyId) && (primeira.get(row.companyId) ?? '') >= row.data;
  const antes = (row: AlteracaoJucesp) => vigente.has(row.companyId) && (primeira.get(row.companyId) ?? '9') < row.data;
  const trimestre = (date: string) => `${date.slice(0, 4)}-T${Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1}`;
  const nomes = [...new Set(atos.map(row => trimestre(row.data)))].sort();
  return {
    trimestres: nomes.map(nome => { const rows = atos.filter(row => trimestre(row.data) === nome); return { trimestre: nome, aberturas: rows.filter(row => row.tipo === 'Abertura').length, alteracoes: rows.filter(row => row.tipo !== 'Abertura').length, registradasDepois: rows.filter(depois).length }; }),
    atos, registradasDepois: atos.filter(depois).map(row => row.companyId), jaRegistradas: atos.filter(antes).map(row => row.companyId),
    semRegistro: atos.filter(row => !vigente.has(row.companyId)).map(row => row.companyId), alteracoesSemRegistro: atos.filter(row => row.tipo !== 'Abertura' && !vigente.has(row.companyId)).map(row => row.companyId),
  };
}
