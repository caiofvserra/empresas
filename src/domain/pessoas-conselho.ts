import type { Dataset } from './types';
import { between, chance, sum } from './hash';
import { municipiosSp } from './municipios';
import { funcoes } from './conselho';
import type { Categoria, Conselho, Funcao } from './conselho';
import type { Entidades } from './entidades';

/**
 * Gastos com nome (06/11/2026): quem são os servidores de cada função, quem são os conselheiros e quem recebeu cada diária.
 * Camada DEMONSTRATIVA: os nomes são fictícios e saem de uma numeração fixa, então nunca se repetem entre servidores e conselheiros.
 * Em produção: QuadrosPessoas e Diarias da API da Transparência do Crea-SP (Implanta), que já publicam nome, cargo, lotação e valor,
 * e a composição do plenário publicada pelo Conselho.
 */
export interface Servidor { id: string; nome: string; funcao: Funcao; vinculo: 'Efetivo' | 'Comissionado'; cargo: string; greId: string | null;
  /** Custo mensal do posto (salário e encargos), na mesma base do quadro de pessoal. */
  remuneracao: number }
export interface Conselheiro { id: string; nome: string; sigla: string; organizacao: string }
export interface Beneficiario { id: string; nome: string; categoria: Categoria; cargo: string; greId: string | null; quantidade: number; valor: number; km: number; meses: number;
  /** As diárias da pessoa em cada mês, na ordem dos meses, com a GRE do lançamento (nula na sede). */
  lancamentos: { month: string; greId: string | null; quantidade: number; valor: number; km: number }[] }

const femininos = ['Adriana', 'Aline', 'Ana', 'Beatriz', 'Bianca', 'Camila', 'Carla', 'Carolina', 'Cláudia', 'Daniela', 'Débora', 'Elisa', 'Fernanda', 'Gabriela', 'Helena', 'Isabela', 'Juliana', 'Larissa', 'Letícia', 'Luciana', 'Mariana', 'Marina', 'Natália', 'Patrícia', 'Paula', 'Priscila', 'Renata', 'Sofia', 'Tatiana', 'Vitória'];
const masculinos = ['André', 'Antônio', 'Bruno', 'Carlos', 'Daniel', 'Diego', 'Eduardo', 'Fábio', 'Felipe', 'Fernando', 'Gustavo', 'Henrique', 'Hugo', 'João', 'José', 'Leonardo', 'Lucas', 'Marcelo', 'Marcos', 'Mateus', 'Otávio', 'Paulo', 'Rafael', 'Ricardo', 'Rodrigo', 'Sérgio', 'Thiago', 'Vinícius', 'Wagner', 'William'];
const sobrenomes = ['Almeida', 'Alves', 'Andrade', 'Araújo', 'Barbosa', 'Barros', 'Batista', 'Borges', 'Campos', 'Cardoso', 'Carvalho', 'Castro', 'Costa', 'Dias', 'Duarte', 'Esteves', 'Farias', 'Ferraz', 'Freitas', 'Gomes', 'Lima', 'Lopes', 'Machado', 'Martins', 'Mendes', 'Moraes', 'Moreira', 'Nogueira', 'Nunes', 'Oliveira', 'Pereira', 'Pinto', 'Queiroz', 'Ramos', 'Ribeiro', 'Rocha', 'Santos', 'Siqueira', 'Souza', 'Teixeira'];
const primeiros = [...femininos, ...masculinos], S = sobrenomes.length, TOTAL = primeiros.length * S * (S - 1);
/** Nome número `n`: a multiplicação por um primo que não divide TOTAL é uma permutação, então números diferentes dão nomes diferentes. */
function nomeNumero(n: number): string {
  const idx = (n * 7919 + 13) % TOTAL, primeiro = primeiros[idx % primeiros.length], resto = Math.floor(idx / primeiros.length), s1 = resto % S, s2 = (s1 + 1 + Math.floor(resto / S)) % S;
  return `${primeiro} ${sobrenomes[s1]} ${sobrenomes[s2]}`;
}

const cargos: Record<Funcao, { efetivo: [string, number][]; comissionado: [string, number][] }> = {
  Fiscalização: { efetivo: [['Agente fiscal', 1], ['Engenheiro fiscal', 1.45], ['Agente fiscal', 1]], comissionado: [['Chefe de unidade de fiscalização', 1.8]] },
  Atendimento: { efetivo: [['Assistente de atendimento', 0.8], ['Assistente de atendimento', 0.8], ['Analista de atendimento', 1.1]], comissionado: [['Chefe de unidade de atendimento', 1.6]] },
  Institucional: { efetivo: [['Analista institucional', 1.15], ['Assistente técnico', 0.9]], comissionado: [['Assessor institucional', 1.6]] },
  'Direção superior': { efetivo: [['Gerente', 1.6], ['Superintendente', 2.1]], comissionado: [['Assessor da presidência', 1.4], ['Chefe de gabinete', 2], ['Diretor de área', 2.2]] },
  Administração: { efetivo: [['Assistente administrativo', 0.8], ['Analista administrativo', 1.15], ['Contador', 1.3]], comissionado: [['Coordenador administrativo', 1.5]] },
};
/** Parte dos postos de cada função lotada nas regionais (o resto fica na sede). */
const naRegional: Record<Funcao, number> = { Fiscalização: 0.78, Atendimento: 0.7, Institucional: 0.1, 'Direção superior': 0, Administração: 0.15 };

const cacheServidores = new WeakMap<Conselho, Servidor[]>();
/** Um servidor por posto do quadro de pessoal, com cargo, lotação (sede ou GRE) e custo mensal que soma o publicado para a função. */
export function servidores(conselho: Conselho, dataset: Dataset): Servidor[] {
  const saved = cacheServidores.get(conselho); if (saved) return saved;
  const pesoGre = new Map<string, number>(); for (const row of municipiosSp(dataset)) pesoGre.set(row.greId, (pesoGre.get(row.greId) ?? 0) + Math.pow(Math.max(5000, row.populacao), 0.85));
  const gres = dataset.gres.map(row => row.id).filter(id => pesoGre.has(id)), pesoTotal = sum(gres.map(id => pesoGre.get(id)!));
  const sorteiaGre = (key: string) => { let alvo = chance(key) * pesoTotal; for (const id of gres) { alvo -= pesoGre.get(id)!; if (alvo <= 0) return id; } return gres.at(-1)!; };
  const out: Servidor[] = []; let numero = 0;
  for (const funcao of funcoes) {
    const linha = conselho.pessoal.find(row => row.funcao === funcao); if (!linha) continue;
    const postos: Omit<Servidor, 'remuneracao'>[] = [], pesos: number[] = [];
    (['Efetivo', 'Comissionado'] as const).forEach(vinculo => { const n = vinculo === 'Efetivo' ? linha.efetivos : linha.comissionados;
      for (let index = 0; index < n; index++) {
        const key = `srv:${funcao}:${vinculo}:${index}`, opcoes = cargos[funcao][vinculo === 'Efetivo' ? 'efetivo' : 'comissionado'], [cargo, fator] = opcoes[between(`${key}:cargo`, 0, opcoes.length - 1)];
        // Fiscalização e atendimento: ao menos dois e um posto efetivo em cada GRE; o resto pelo porte da regional.
        const minimo = vinculo === 'Efetivo' ? (funcao === 'Fiscalização' ? 2 : funcao === 'Atendimento' ? 1 : 0) : 0;
        const greId = index < minimo * gres.length ? gres[index % gres.length] : vinculo === 'Efetivo' && chance(`${key}:lot`) < naRegional[funcao] ? sorteiaGre(`${key}:gre`) : null;
        postos.push({ id: `SRV-${String(++numero).padStart(4, '0')}`, nome: nomeNumero(numero), funcao, vinculo, cargo, greId }); pesos.push(fator * (0.85 + chance(`${key}:sal`) * 0.3));
      } });
    const soma = sum(pesos);
    postos.forEach((posto, index) => out.push({ ...posto, remuneracao: Math.round(linha.custoMes * pesos[index] / soma) }));
  }
  cacheServidores.set(conselho, out); return out;
}

/** Um conselheiro por cadeira do plenário, com a entidade de classe ou a escola que o indicou. Nomes numerados depois dos servidores. */
export function conselheiros(entidades: Entidades): Conselheiro[] {
  let numero = 5000;
  return entidades.organizacoes.flatMap(org => Array.from({ length: org.cadeiras }, (_, index) => {
    const titulo = org.modalidades[0] === 'Agronomia' ? 'Eng. agr.' : 'Eng.';
    return { id: `CONS-${org.id}-${index + 1}`, nome: `${titulo} ${nomeNumero(++numero)}`, sigla: org.sigla, organizacao: org.nome };
  }));
}

/**
 * Diárias dos `nMeses` meses (12, no painel) até a data de referência, pessoa a pessoa, maior valor primeiro. Cada lançamento mensal (categoria, sede ou GRE)
 * é dividido entre duas a cinco pessoas do grupo certo: inspetores entre os fiscais lotados na GRE, empregados entre os servidores da
 * sede ou da GRE, diretoria entre a direção superior, conselheiros entre o plenário. As somas fecham com o total da categoria.
 */
export function diariasPorPessoa(conselho: Conselho, equipe: Servidor[], plenario: Conselheiro[], anchor: string, greId: string | null, nMeses = 12): Beneficiario[] {
  const meses = new Set(conselho.months.filter(month => `${month}-01` <= anchor).slice(-nMeses));
  const efetivos = equipe.filter(s => s.vinculo === 'Efetivo');
  const fiscais = new Map<string | null, Servidor[]>(), outros = new Map<string | null, Servidor[]>();
  for (const s of efetivos) { const alvo = s.funcao === 'Fiscalização' ? fiscais : s.funcao === 'Direção superior' ? null : outros; if (alvo) alvo.set(s.greId, [...(alvo.get(s.greId) ?? []), s]); }
  const direcao = equipe.filter(s => s.funcao === 'Direção superior');
  const pessoaConselheiro = plenario.map(c => ({ id: c.id, nome: c.nome, cargo: `Conselheiro indicado por ${c.sigla}`, greId: null as string | null }));
  const pessoaServidor = (s: Servidor) => ({ id: s.id, nome: s.nome, cargo: s.cargo, greId: s.greId });
  const grupo = (categoria: Categoria, gre: string | null) => {
    if (categoria === 'Conselheiros') return pessoaConselheiro;
    if (categoria === 'Diretoria e presidência') return direcao.map(pessoaServidor);
    if (categoria === 'Inspetores e agentes de campo') return (fiscais.get(gre) ?? fiscais.get(null) ?? []).map(pessoaServidor);
    return (outros.get(gre)?.length ? outros.get(gre)! : outros.get(null) ?? []).map(pessoaServidor);
  };
  const total = new Map<string, Beneficiario>(), mesesDe = new Map<string, Set<string>>();
  for (const row of conselho.diarias) {
    if (!meses.has(row.month) || (greId && row.greId !== greId) || row.quantidade <= 0) continue;
    const key = `dpp:${row.month}:${row.categoria}:${row.greId}`, pool = grupo(row.categoria, row.greId); if (!pool.length) continue;
    const k = Math.min(pool.length, between(`${key}:k`, 2, 5), row.quantidade);
    // Quem viaja mais tem peso maior em todos os meses: a mesma pessoa aparece com frequência, como na vida real.
    const escolhidos = pool.map(p => ({ p, score: chance(`${key}:${p.id}`) * (0.2 + chance(`viaja:${p.id}`)) })).sort((a, b) => b.score - a.score).slice(0, k).map(item => item.p);
    const pesos = escolhidos.map(p => 0.4 + chance(`${key}:peso:${p.id}`)), soma = sum(pesos);
    const unidades = pesos.map(peso => Math.max(1, Math.floor(row.quantidade * peso / soma)));
    let sobra = row.quantidade - sum(unidades);
    for (let index = 0; sobra !== 0; index = (index + 1) % unidades.length) { if (sobra > 0) { unidades[index]++; sobra--; } else if (unidades[index] > 1) { unidades[index]--; sobra++; } }
    let acumulado = 0, valorAcumulado = 0;
    escolhidos.forEach((p, index) => {
      acumulado += unidades[index]; const ate = Math.round(row.valor * acumulado / row.quantidade), valor = ate - valorAcumulado; valorAcumulado = ate;
      const id = `${row.categoria}:${p.id}`, atual = total.get(id) ?? { id: p.id, nome: p.nome, categoria: row.categoria, cargo: p.cargo, greId: p.greId, quantidade: 0, valor: 0, km: 0, meses: 0, lancamentos: [] };
      const km = Math.round(row.km * unidades[index] / row.quantidade), doMes = atual.lancamentos.find(l => l.month === row.month && l.greId === row.greId);
      if (doMes) { doMes.quantidade += unidades[index]; doMes.valor += valor; doMes.km += km; } else atual.lancamentos.push({ month: row.month, greId: row.greId, quantidade: unidades[index], valor, km });
      atual.quantidade += unidades[index]; atual.valor += valor; atual.km += km; total.set(id, atual);
      mesesDe.set(id, (mesesDe.get(id) ?? new Set()).add(row.month));
    });
  }
  return [...total.entries()].map(([id, row]) => ({ ...row, meses: mesesDe.get(id)?.size ?? 0, lancamentos: [...row.lancamentos].sort((a, b) => a.month.localeCompare(b.month)) })).filter(row => row.valor > 0).sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome));
}
