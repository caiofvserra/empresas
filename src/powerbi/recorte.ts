import type { Modelo } from './modelo';
import type { Pagina } from './pbir';

/**
 * O modelo de um painel tirado de um modelo maior (07/11/2026: do antigo painel de Gestão do Conselho saíram o Financeiro e o
 * Atendimento, que partem do mesmo modelo). Ficam:
 * - as medidas que os visuais das páginas usam e as que essas medidas citam;
 * - as tabelas que esses visuais e medidas leem;
 * - as tabelas do lado "um" das relações das que ficaram, para os filtros continuarem chegando aos fatos;
 * - as relações entre as tabelas que ficaram.
 * O parâmetro da pasta dos dados passa a apontar para a pasta do painel.
 */
export function recortarModelo(modelo: Modelo, nome: string, pasta: string, paginas: Pagina[]): Modelo {
  const medidaDe = new Map(modelo.tabelas.flatMap(tabela => (tabela.medidas ?? []).map(medida => [medida.nome, medida] as const)));
  const citada = modelo.tabelas.map(tabela => {
    const aspas = `'${tabela.nome.replaceAll("'", "''")}'`, simples = /^[A-Za-z_]\w*$/.test(tabela.nome) ? new RegExp(`\\b${tabela.nome}\\b`) : null;
    return { nome: tabela.nome, em: (dax: string) => dax.includes(aspas) || Boolean(simples?.test(dax)) };
  });
  const tabelas = new Set<string>(), medidas = new Set<string>();
  const usarMedida = (nomeDaMedida: string) => {
    const medida = medidaDe.get(nomeDaMedida); if (!medida || medidas.has(nomeDaMedida)) return;
    medidas.add(nomeDaMedida);
    for (const tabela of citada) if (tabela.em(medida.dax)) tabelas.add(tabela.nome);
    for (const match of medida.dax.matchAll(/(?<![\w'\]])\[([^\]]+)\]/g)) usarMedida(match[1]);
  };
  for (const pagina of paginas) for (const visual of pagina.visuais) for (const campos of Object.values(visual.papeis ?? {}))
    for (const campo of campos) if ('medida' in campo) usarMedida(campo.medida); else tabelas.add(campo.coluna[0]);
  for (const tabela of modelo.tabelas) if ((tabela.medidas ?? []).some(medida => medidas.has(medida.nome))) tabelas.add(tabela.nome);
  for (let mudou = true; mudou;) {
    mudou = false;
    for (const { de, para } of modelo.relacoes) if (tabelas.has(de[0]) && !tabelas.has(para[0])) { tabelas.add(para[0]); mudou = true; }
  }
  return {
    nome,
    parametros: modelo.parametros.map(parametro => ({ ...parametro, valor: parametro.valor.replace(/powerbi\\[^\\]+\\/, `powerbi\\${pasta}\\`) })),
    tabelas: modelo.tabelas.filter(tabela => tabelas.has(tabela.nome)).map(tabela => tabela.medidas ? { ...tabela, medidas: tabela.medidas.filter(medida => medidas.has(medida.nome)) } : tabela),
    relacoes: modelo.relacoes.filter(({ de, para }) => tabelas.has(de[0]) && tabelas.has(para[0])),
  };
}
