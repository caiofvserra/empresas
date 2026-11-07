/**
 * Dados abertos do CNPJ da Receita Federal: leitura das linhas, enquadramento pela lista de atividades do Crea-SP e contagem do
 * mercado paulista por município. Adapta a regra do repositório receita-socios-eng (CNAE principal ou secundário da lista, "Sim" ou
 * "Passível de obrigação"), com o filtro de UF e de situação cadastral que ele não tinha e sem repetir o sócio a cada filial.
 * Funções puras: o download e a leitura dos arquivos ficam em scripts/receita-cnpj.ts.
 */

import type { MercadoReceita, MunicipioMercado, Porte } from '../../src/domain/receita-mercado.ts';
import { mesesDoArquivo } from '../../src/domain/receita-mercado.ts';
export type Situacao = 'Nula' | 'Ativa' | 'Suspensa' | 'Inapta' | 'Baixada';
export type Classe = 'Sim' | 'Passível';

export interface Estabelecimento {
  cnpj: string; basico: string; matriz: boolean; situacao: Situacao; dataSituacao: string | null; inicio: string | null;
  cnaePrincipal: string; cnaesSecundarios: string[]; uf: string; municipioRfb: string;
}

const situacoes: Record<string, Situacao> = { '01': 'Nula', '02': 'Ativa', '03': 'Suspensa', '04': 'Inapta', '08': 'Baixada' };

/** Campos de uma linha dos arquivos da Receita: todos entre aspas e separados por ponto e vírgula. */
export function campos(linha: string): string[] {
  const texto = linha.endsWith('\r') ? linha.slice(0, -1) : linha;
  if (!texto.startsWith('"') || !texto.endsWith('"')) return texto.split(';');
  return texto.slice(1, -1).split('";"');
}

/**
 * Remenda os registros que a Receita publica com uma quebra de linha dentro de um campo (um endereço, um complemento): o pedaço
 * fica com um número ímpar de aspas e é juntado à linha seguinte até as aspas fecharem. Devolve a linha inteira, ou null enquanto
 * o registro não fecha. Linhas que não começam com aspas passam sem mudança.
 */
export function remendador(): (linha: string) => string | null {
  let pendente: string | null = null;
  const aspas = (texto: string) => { let n = 0; for (let i = 0; i < texto.length; i++) if (texto.charCodeAt(i) === 34) n++; return n; };
  return linha => {
    const atual = pendente === null ? linha : `${pendente}\n${linha}`;
    if (atual.startsWith('"') && aspas(atual) % 2 === 1) { pendente = atual; return null; }
    pendente = null; return atual;
  };
}
export function* remendar(linhas: Iterable<string>): Generator<string> {
  const passo = remendador();
  for (const linha of linhas) { const inteira = passo(linha); if (inteira !== null) yield inteira; }
}

/** CNAE de sete dígitos no formato da lista do Crea-SP (0000-0/00). */
export const formatarCnae = (codigo: string) => {
  const d = codigo.replace(/\D/g, '');
  return d.length === 7 ? `${d.slice(0, 4)}-${d.slice(4, 5)}/${d.slice(5)}` : '';
};
const dataIso = (valor: string) => /^\d{8}$/.test(valor) && valor !== '00000000' ? `${valor.slice(0, 4)}-${valor.slice(4, 6)}-${valor.slice(6)}` : null;

/** Linha com menos de 21 campos é pedaço de um registro com quebra de linha dentro de um campo: fica de fora (null). */
export function lerEstabelecimento(linha: string): Estabelecimento | null {
  const c = campos(linha);
  if (c.length < 21) return null;
  return {
    cnpj: `${c[0]}${c[1]}${c[2]}`, basico: c[0], matriz: c[3] === '1',
    situacao: situacoes[c[5]] ?? 'Nula', dataSituacao: dataIso(c[6]), inicio: dataIso(c[10]),
    cnaePrincipal: formatarCnae(c[11]),
    cnaesSecundarios: (c[12] ?? '').split(',').map(formatarCnae).filter(Boolean),
    uf: c[19], municipioRfb: c[20],
  };
}

export type Catalogo = Map<string, Classe>;
/** A lista de atividades do Crea-SP (src/domain/cnae-catalog.json): "Relacionado" é registro obrigatório, "Depende de análise" é passível. */
export function catalogoCnae(linhas: { code: string; classification: string }[]): Catalogo {
  const catalogo: Catalogo = new Map();
  for (const row of linhas) {
    if (row.classification === 'Relacionado') catalogo.set(row.code, 'Sim');
    else if (row.classification === 'Depende de análise') catalogo.set(row.code, 'Passível');
  }
  return catalogo;
}

/**
 * Classe e atividade que enquadram o estabelecimento. A principal vale quando está na lista; senão, a secundária da lista com a
 * classe mais forte ("Sim" antes de "Passível"), a primeira na ordem da Receita. A mesma regra de classeDoEstabelecimento.
 */
export function enquadrar(e: Pick<Estabelecimento, 'cnaePrincipal' | 'cnaesSecundarios'>, catalogo: Catalogo): { classe: Classe; cnae: string } | null {
  const principal = catalogo.get(e.cnaePrincipal);
  if (principal) return { classe: principal, cnae: e.cnaePrincipal };
  const sim = e.cnaesSecundarios.find(code => catalogo.get(code) === 'Sim');
  if (sim) return { classe: 'Sim', cnae: sim };
  const passivel = e.cnaesSecundarios.find(code => catalogo.get(code) === 'Passível');
  return passivel ? { classe: 'Passível', cnae: passivel } : null;
}

/* ---------- Contagem do mercado paulista ---------- */
export type { MercadoReceita, MunicipioMercado, Porte };
const portePorCodigo: Record<string, Porte> = { '01': 'ME', '03': 'EPP', '05': 'Demais' };
type Fora = MunicipioMercado['fora'];

interface Parcial { sim: number; passivel: number; principal: { sim: number; passivel: number }; fora: Fora; aberturas: Map<string, number>; baixas: Map<string, number>; cnaes: Map<string, number>; basicos: Map<string, number> }
export interface Contagem { desde: string; uf: string; porMunicipio: Map<string, Parcial> }
export const novaContagem = ({ desde, uf = 'SP' }: { desde: string; uf?: string }): Contagem => ({ desde, uf, porMunicipio: new Map() });
const mais = (mapa: Map<string, number>, chave: string, n = 1) => mapa.set(chave, (mapa.get(chave) ?? 0) + n);

/** Soma um estabelecimento à contagem, se for da UF e tiver atividade da lista, e devolve o enquadramento (ou null, se ficou fora). */
export function contar(contagem: Contagem, e: Estabelecimento, catalogo: Catalogo): ReturnType<typeof enquadrar> {
  if (e.uf !== contagem.uf) return null;
  const enq = enquadrar(e, catalogo);
  if (!enq) return null;
  let p = contagem.porMunicipio.get(e.municipioRfb);
  if (!p) { p = { sim: 0, passivel: 0, principal: { sim: 0, passivel: 0 }, fora: { Suspensa: 0, Inapta: 0, Baixada: 0 }, aberturas: new Map(), baixas: new Map(), cnaes: new Map(), basicos: new Map() }; contagem.porMunicipio.set(e.municipioRfb, p); }
  if (e.inicio && e.inicio.slice(0, 7) >= contagem.desde) mais(p.aberturas, e.inicio.slice(0, 7));
  if (e.situacao === 'Ativa') {
    const chave = enq.classe === 'Sim' ? 'sim' : 'passivel';
    p[chave] += 1;
    if (enq.cnae === e.cnaePrincipal) p.principal[chave] += 1;
    mais(p.cnaes, enq.cnae); mais(p.basicos, e.basico);
  } else if (e.situacao !== 'Nula') {
    p.fora[e.situacao] += 1;
    if (e.situacao === 'Baixada' && e.dataSituacao && e.dataSituacao.slice(0, 7) >= contagem.desde) mais(p.baixas, e.dataSituacao.slice(0, 7));
  }
  return enq;
}

/** Os empresas (raízes) que têm estabelecimento ativo da lista: é para elas que se lê o porte no arquivo de Empresas. */
export const basicosAtivos = (contagem: Contagem) => new Set([...contagem.porMunicipio.values()].flatMap(p => [...p.basicos.keys()]));

const ordenado = (mapa: Map<string, number>) => Object.fromEntries([...mapa].sort((a, b) => a[0].localeCompare(b[0])));
/** As `n` atividades com mais ativos (empate pela ordem do código), em ordem de código. */
const maiores = (mapa: Map<string, number>, n: number) => ordenado(new Map([...mapa].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n)));

/**
 * Fecha a contagem: troca o código de município da Receita pelo do IBGE, lê o porte de cada empresa, põe aberturas e baixas numa
 * série com um número por mês e guarda as atividades em três níveis: todas no estado e em cada GRE, e só as `maisAtividades` maiores
 * em cada município (o resto do município aparece no painel como "outras atividades"). É o que deixa o arquivo do painel pequeno.
 */
export function fecharContagem(contagem: Contagem, { competencia, municipios, gres = new Map(), porte, nomesRfb, maisAtividades = 20, fonte = 'Receita Federal, dados abertos do CNPJ' }:
  { competencia: string; municipios: Map<string, string>; gres?: Map<string, string>; porte: Map<string, string>; nomesRfb: Map<string, string>; maisAtividades?: number; fonte?: string }): MercadoReceita {
  const meses = mesesDoArquivo({ desde: contagem.desde, competencia }), posicao = new Map(meses.map((mes, i) => [mes, i]));
  const serie = (mapa: Map<string, number>, base: number[]) => { for (const [mes, n] of mapa) { const i = posicao.get(mes); if (i !== undefined) base[i] += n; } return base; };
  const porIbge = new Map<string, { linha: MunicipioMercado; cnaes: Map<string, number> }>(), naoLocalizados: MercadoReceita['naoLocalizados'] = [], empresas = new Set<string>();
  const estado = new Map<string, number>(), porGre = new Map<string, Map<string, number>>();
  let sim = 0, passivel = 0, fora = 0;
  for (const [rfb, p] of [...contagem.porMunicipio].sort((a, b) => a[0].localeCompare(b[0]))) {
    const ibge = municipios.get(rfb);
    if (!ibge) { naoLocalizados.push({ rfb, nome: nomesRfb.get(rfb) ?? '', estabelecimentos: p.sim + p.passivel + p.fora.Suspensa + p.fora.Inapta + p.fora.Baixada }); continue; }
    // Dois códigos da Receita que caem no mesmo município do IBGE somam.
    let atual = porIbge.get(ibge);
    if (!atual) { atual = { linha: { sim: 0, passivel: 0, principal: { sim: 0, passivel: 0 }, fora: { Suspensa: 0, Inapta: 0, Baixada: 0 }, porte: { ME: 0, EPP: 0, Demais: 0, 'Não informado': 0 },
      aberturas: meses.map(() => 0), baixas: meses.map(() => 0), cnaes: {} }, cnaes: new Map() }; porIbge.set(ibge, atual); }
    const l = atual.linha;
    l.sim += p.sim; l.passivel += p.passivel; l.principal.sim += p.principal.sim; l.principal.passivel += p.principal.passivel;
    for (const s of ['Suspensa', 'Inapta', 'Baixada'] as const) l.fora[s] += p.fora[s];
    for (const [basico, n] of p.basicos) { l.porte[portePorCodigo[porte.get(basico) ?? ''] ?? 'Não informado'] += n; empresas.add(basico); }
    serie(p.aberturas, l.aberturas); serie(p.baixas, l.baixas);
    const gre = gres.get(ibge);
    for (const [cnae, n] of p.cnaes) {
      mais(atual.cnaes, cnae, n); mais(estado, cnae, n);
      if (gre) { if (!porGre.has(gre)) porGre.set(gre, new Map()); mais(porGre.get(gre)!, cnae, n); }
    }
    sim += p.sim; passivel += p.passivel; fora += p.fora.Suspensa + p.fora.Inapta + p.fora.Baixada;
  }
  const saida: Record<string, MunicipioMercado> = {};
  for (const [ibge, { linha, cnaes }] of [...porIbge].sort((a, b) => a[0].localeCompare(b[0]))) saida[ibge] = { ...linha, cnaes: maiores(cnaes, maisAtividades) };
  const gresSaida = Object.fromEntries([...porGre].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR', { numeric: true })).map(([gre, mapa]) => [gre, ordenado(mapa)]));
  return { competencia, desde: contagem.desde, fonte, total: { sim, passivel, empresas: empresas.size, fora }, municipios: saida, cnaes: ordenado(estado), gres: gresSaida, naoLocalizados };
}

/* ---------- Município da Receita × município do IBGE ---------- */
/** Nome em maiúsculas, sem acento, hífen, apóstrofo nem espaço repetido. */
export const nomeNormalizado = (nome: string) => nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/['’`-]/g, ' ').replace(/\s+/g, ' ').trim();
/** Nomes antigos que a Receita ainda usa para municípios paulistas, já normalizados, com o nome atual do IBGE. */
export const nomesAntigos: Record<string, string> = {
  EMBU: 'EMBU DAS ARTES', 'MOJI MIRIM': 'MOGI MIRIM', 'MOJI GUACU': 'MOGI GUACU', 'MOJI DAS CRUZES': 'MOGI DAS CRUZES',
  'SAO LUIS DO PARAITINGA': 'SAO LUIZ DO PARAITINGA', 'FLORINIA': 'FLORINEA',
};
/** Código do município da Receita para o do IBGE, só para os códigos que aparecem nos estabelecimentos de SP. */
export function ligarMunicipios(nomesRfb: Map<string, string>, ibge: { id: string; nome: string }[], codigosSp: Iterable<string>): { municipios: Map<string, string>; semPar: string[] } {
  const porNome = new Map(ibge.map(row => [nomeNormalizado(row.nome), row.id]));
  const municipios = new Map<string, string>(), semPar: string[] = [];
  for (const codigo of codigosSp) {
    const nome = nomeNormalizado(nomesRfb.get(codigo) ?? ''), id = porNome.get(nome) ?? porNome.get(nomesAntigos[nome] ?? '');
    if (id) municipios.set(codigo, id); else semPar.push(codigo);
  }
  return { municipios, semPar };
}

/* ---------- Sócios e profissionais ---------- */
export interface Socio { basico: string; tipo: 'PJ' | 'PF' | 'Estrangeiro'; nome: string; documento: string; qualificacao: string; entrada: string | null }
const tiposSocio: Record<string, Socio['tipo']> = { '1': 'PJ', '2': 'PF', '3': 'Estrangeiro' };
/** Linha do arquivo de Sócios. O CPF vem mascarado pela própria Receita: só os seis dígitos do meio aparecem (***456789**). */
export function lerSocio(linha: string): Socio | null {
  const c = campos(linha);
  if (c.length < 6) return null;
  return { basico: c[0], tipo: tiposSocio[c[1]] ?? 'Estrangeiro', nome: c[2], documento: c[3], qualificacao: c[4], entrada: dataIso(c[5]) };
}
const meioDoCpf = (cpf: string) => { const d = cpf.replace(/\D/g, ''); return d.length === 11 ? d.slice(3, 9) : null; };
/** Profissionais do cadastro do Crea-SP (que tem o CPF completo) pela chave nome normalizado + seis dígitos do meio do CPF. */
export function indiceProfissionais(profissionais: { id: string; nome: string; cpf: string }[]): Map<string, string[]> {
  const indice = new Map<string, string[]>();
  for (const p of profissionais) { const meio = meioDoCpf(p.cpf); if (!meio) continue; const chave = `${nomeNormalizado(p.nome)}|${meio}`; indice.set(chave, [...(indice.get(chave) ?? []), p.id]); }
  return indice;
}
/**
 * Casa um sócio pessoa física com o cadastro de profissionais sem o CPF completo: nome e seis dígitos iguais identificam quase todos.
 * Dois profissionais com a mesma chave ficam como homônimos, para conferir; o nome sozinho nunca identifica ninguém.
 */
export function casarSocio(s: Socio, indice: Map<string, string[]>): { situacao: 'Identificado' | 'Homônimo' | 'Sem par'; profissionais: string[] } {
  const meio = s.tipo === 'PF' && /^\*{3}\d{6}\*{2}$/.test(s.documento) ? s.documento.slice(3, 9) : null;
  const achados = meio ? indice.get(`${nomeNormalizado(s.nome)}|${meio}`) ?? [] : [];
  return { situacao: achados.length === 1 ? 'Identificado' : achados.length > 1 ? 'Homônimo' : 'Sem par', profissionais: achados };
}

/* ---------- Staging para a base interna ---------- */
/**
 * Colunas dos CSV de staging, na ordem gravada, e a tabela de destino no contrato integrations/sql/receita-x-cadastro.sql.
 * O teste confere que o contrato descreve exatamente estas colunas.
 */
export const colunasStaging = {
  'situacao-sp.csv': { tabela: 'stg.receita_situacao', colunas: ['competencia', 'cnpj', 'situacao', 'data_situacao', 'cnae_principal', 'municipio_ibge'] },
  'estabelecimentos-sp.csv': { tabela: 'stg.receita_estabelecimento', colunas: ['competencia', 'cnpj', 'cnpj_basico', 'matriz', 'situacao', 'data_situacao', 'inicio_atividade', 'classe', 'cnae_enquadramento', 'cnae_principal', 'municipio_rfb', 'municipio_ibge'] },
  'empresas-sp.csv': { tabela: 'stg.receita_empresa', colunas: ['competencia', 'cnpj_basico', 'razao_social', 'natureza_juridica', 'capital_social', 'porte'] },
  'socios-sp.csv': { tabela: 'stg.receita_socio', colunas: ['competencia', 'cnpj_basico', 'tipo', 'nome', 'nome_normalizado', 'documento', 'qualificacao', 'data_entrada'] },
} as const;
