/**
 * Contratos de serviços gerais do PNCP em SP que o modelo treinado do estudo do PNCP marca como engenharia (07/11/2026), com o que
 * os documentos da compra mostraram do rito. Dado real, contado por município do IBGE e mês de publicação pelo script
 * scripts/pncp-triagem.py; o arquivo traz só números, sem número de controle, CNPJ, objeto ou valor. O cruzamento com as ARTs
 * é feito na base interna (integrations/sql/pncp-triagem-x-art.sql). Até a primeira rodada, o arquivo vem vazio.
 */
export interface MunicipioTriagem { lidos: number[]; suspeitos: number[]; presente: number[]; parcial: number[]; semSinal: number[]; semLeitura: number[] }
export interface TriagemPncp {
  fonte: string; rodada: string | null;
  modelo: { limiar: number; embeddings: string; treinado_em: string; n_treino: number } | null;
  periodo: { de: string; ate: string } | null;
  /** Meses de publicação, em ordem; cada série dos municípios tem um número por mês. */
  meses: string[]; municipios: Record<string, MunicipioTriagem>;
}
export interface QuadroTriagem {
  lidos: number; suspeitos: number; presente: number; parcial: number; semSinal: number; semLeitura: number;
  meses: { mes: string; suspeitos: number; semSinal: number }[];
}
const campos = ['lidos', 'suspeitos', 'presente', 'parcial', 'semSinal', 'semLeitura'] as const;

/** Soma a triagem no recorte (GRE ou município) e nos últimos `meses` meses do arquivo. */
export function quadroTriagem(t: TriagemPncp, municipios: { id: string; greId: string }[], { greId, cityId, meses }: { greId: string | null; cityId: string | null; meses: number }): QuadroTriagem {
  const inicio = Math.max(0, t.meses.length - meses), lista = t.meses.slice(inicio);
  const q: QuadroTriagem = { lidos: 0, suspeitos: 0, presente: 0, parcial: 0, semSinal: 0, semLeitura: 0, meses: lista.map(mes => ({ mes, suspeitos: 0, semSinal: 0 })) };
  for (const m of municipios) {
    const row = t.municipios[m.id];
    if (!row || (greId && m.greId !== greId) || (cityId && m.id !== cityId)) continue;
    lista.forEach((_, k) => {
      const i = inicio + k;
      for (const c of campos) q[c] += row[c][i] ?? 0;
      q.meses[k].suspeitos += row.suspeitos[i] ?? 0; q.meses[k].semSinal += row.semSinal[i] ?? 0;
    });
  }
  return q;
}
