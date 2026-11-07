/**
 * Mercado de engenharia na Receita Federal, com dado real (07/11/2026): estabelecimentos paulistas com atividade da lista do Crea-SP
 * nos dados abertos do CNPJ, contados por município do IBGE pelo coletor scripts/receita-cnpj.ts. O arquivo traz só números, sem
 * nenhum nome ou CNPJ. É um retrato da competência do arquivo da Receita: não muda com a data de referência do painel.
 */
export type Porte = 'ME' | 'EPP' | 'Demais' | 'Não informado';
export type SituacaoReceita = 'Ativa' | 'Suspensa' | 'Inapta' | 'Baixada';

export interface MunicipioMercado {
  /** Estabelecimentos ativos com atividade de registro obrigatório e com atividade a analisar (estoque na competência). */
  sim: number; passivel: number;
  /** Parte dos ativos acima enquadrada pela atividade principal; o resto entrou por uma atividade secundária. */
  principal: { sim: number; passivel: number };
  /** Estabelecimentos com atividade da lista que estão suspensos, inaptos ou baixados na competência. */
  fora: Record<Exclude<SituacaoReceita, 'Ativa'>, number>;
  /** Ativos da lista pelo porte da empresa declarado à Receita. */
  porte: Record<Porte, number>;
  /** Estabelecimentos com atividade da lista abertos (início da atividade) e baixados em cada mês, um número por mês de `desde` até a competência. */
  aberturas: number[]; baixas: number[];
  /** Ativos pela atividade que os enquadra: só as 20 maiores do município. As outras ficam nas contas da GRE e do estado. */
  cnaes: Record<string, number>;
}
export interface MercadoReceita {
  competencia: string; desde: string; fonte: string;
  total: { sim: number; passivel: number; empresas: number; fora: number };
  municipios: Record<string, MunicipioMercado>;
  /** Ativos pela atividade que os enquadra, todas as atividades: no estado e em cada GRE (GRE1 a GRE16). */
  cnaes: Record<string, number>; gres: Record<string, Record<string, number>>;
  /** Códigos de município da Receita, em SP, sem correspondência no IBGE (devem ficar vazios). */
  naoLocalizados: { rfb: string; nome: string; estabelecimentos: number }[];
}

/**
 * O que o painel lê do arquivo: aberturas e baixas no recorte, no total e mês a mês. Os estoques, portes e atividades do arquivo
 * ficam para o pacote Power BI de produção e para a conferência do coletor; o painel não os mostra desde que a página CNPJ saiu.
 */
export interface QuadroReceita {
  aberturas: number; baixas: number;
  meses: { mes: string; aberturas: number; baixas: number }[];
}

/** Os `meses` meses que terminam na competência, em ordem. */
export function mesesAte(competencia: string, meses: number): string[] {
  const [ano, mes] = competencia.split('-').map(Number);
  return Array.from({ length: meses }, (_, i) => new Date(Date.UTC(ano, mes - meses + i, 1)).toISOString().slice(0, 7));
}

/** Os meses do arquivo, de `desde` até a competência: a posição de cada mês nas séries de aberturas e baixas. */
export function mesesDoArquivo(mercado: Pick<MercadoReceita, 'desde' | 'competencia'>): string[] {
  const [a0, m0] = mercado.desde.split('-').map(Number), [a1, m1] = mercado.competencia.split('-').map(Number);
  return mesesAte(mercado.competencia, (a1 - a0) * 12 + m1 - m0 + 1);
}
/**
 * Último mês completo do arquivo: o anterior à competência. A Receita gera o arquivo nos primeiros dias do mês da competência
 * (o de 2026-10 vai até 11/10/2026), então o mês da competência sai pela metade e as séries terminam no mês anterior.
 */
export const ultimoMesCompleto = (mercado: Pick<MercadoReceita, 'competencia'>) => mesesAte(mercado.competencia, 2)[0];

/** Soma as aberturas e baixas da Receita no recorte (GRE ou município) e nos últimos `meses` meses completos do arquivo. */
export function quadroReceita(mercado: MercadoReceita, municipios: { id: string; greId: string }[], { greId, cityId, meses }: { greId: string | null; cityId: string | null; meses: number }): QuadroReceita {
  const lista = mesesAte(ultimoMesCompleto(mercado), meses), noRecorte = municipios.filter(row => (!greId || row.greId === greId) && (!cityId || row.id === cityId));
  const q: QuadroReceita = { aberturas: 0, baixas: 0, meses: lista.map(mes => ({ mes, aberturas: 0, baixas: 0 })) };
  const doArquivo = new Map(mesesDoArquivo(mercado).map((mes, i) => [mes, i])), posicoes = lista.map(mes => doArquivo.get(mes) ?? -1);
  for (const m of noRecorte) {
    const row = mercado.municipios[m.id];
    if (!row) continue;
    posicoes.forEach((i, k) => { const a = row.aberturas[i] ?? 0, b = row.baixas[i] ?? 0; q.meses[k].aberturas += a; q.meses[k].baixas += b; q.aberturas += a; q.baixas += b; });
  }
  return q;
}
