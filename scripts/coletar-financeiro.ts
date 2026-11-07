/**
 * Coleta a receita, a despesa, os pagamentos e os contratos do Crea-SP no Portal da Transparência (API do Implanta) e grava
 * os agregados que o painel Financeiro usa em public/data/transparencia/financeiro-crea-sp.json.
 *
 * Uso: NODE_USE_ENV_PROXY=1 npm run coletar:financeiro -- [--cache <pasta>] [--desde 2013] [--ate 2026-10]
 *
 * - Receita e despesa: ComparativoReceita e ComparativoDespesa, um pedido por mês (o realizado do mês) e um por exercício
 *   (o orçado inicial e o reformulado). Desde 2013.
 * - Pagamentos: os últimos 37 meses, para as diárias por pessoa (contas 6.2.2.1.1.01.04.05) e os maiores fornecedores.
 *   O CPF vem mascarado do portal e não é gravado; o nome é o que o portal publica.
 * - Contratos: os vigentes em algum momento dos últimos 37 meses.
 *
 * Os agregados de endpoints diferentes não se somam entre si: o realizado da despesa no ComparativoDespesa é o empenhado do
 * mês, e os Pagamentos são o que saiu do caixa. O painel usa cada um no seu bloco.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { grupoDespesa, tipoReceita } from '../src/domain/financeiro';

const HOST = 'https://crea-sp.implanta.net.br/transparencia/api/v1.0';
const args = process.argv.slice(2), arg = (name: string) => { const index = args.indexOf(`--${name}`); return index >= 0 ? args[index + 1] : undefined; };
const cache = arg('cache'), desde = Number(arg('desde') ?? 2013);
const hoje = new Date(), ultimoFechado = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 1, 1));
const ate = arg('ate') ?? ultimoFechado.toISOString().slice(0, 7);
if (cache) mkdirSync(cache, { recursive: true });

const espera = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function obter<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const consulta = new URLSearchParams(params).toString(), arquivo = cache ? join(cache, `${endpoint}_${consulta.replace(/[^0-9A-Za-z]+/g, '_')}.json`) : '';
  if (arquivo && existsSync(arquivo)) return JSON.parse(readFileSync(arquivo, 'utf8')) as T;
  for (let tentativa = 0; ; tentativa++) {
    try {
      const resposta = await fetch(`${HOST}/${endpoint}?${consulta}`, { headers: { Accept: 'application/json' } });
      if (!resposta.ok) throw new Error(`${resposta.status} em ${endpoint}?${consulta}`);
      const texto = await resposta.text(), dado = JSON.parse(texto) as T;
      if (arquivo) writeFileSync(arquivo, texto);
      return dado;
    } catch (erro) {
      if (tentativa >= 4) throw erro;
      await espera(2000 * 2 ** tentativa);
    }
  }
}
async function emLotes<I, O>(itens: I[], tamanho: number, fazer: (item: I) => Promise<O>): Promise<O[]> {
  const saida: O[] = [];
  for (let index = 0; index < itens.length; index += tamanho) { saida.push(...await Promise.all(itens.slice(index, index + tamanho).map(fazer))); process.stdout.write('.'); }
  process.stdout.write('\n');
  return saida;
}

interface Conta { CODIGO: string; NOME: string; ANALITICA: boolean; VALOR_ORCADO: number; TOTAL_EXERCICIO: number; REALIZADO_PERIODO: number; NIVEL: number }
interface Pagamento { DATA_PAGAMENTO: string; CONTA_EMPENHO: string; VALOR: number; CPF_CNPJ: string; NOME_RAZAO_SOCIAL: string; HISTORICO: string }
interface Contrato { NUMERO_CONTRATO: string; NUMERO_PROCESSO_COMPRA: string | null; CONTRATADA: string; VALOR: number; DATA_INICIO_VIGENCIA: string; DATA_FINAL_VIGENCIA: string; OBJETO?: string }

/** Soma o valor das contas analíticas (folhas) por grupo, sem contar duas vezes as contas-mãe. */
function somarFolhas(contas: Conta[], grupo: (conta: Conta) => string | null, valor: (conta: Conta) => number) {
  const codigos = contas.map(conta => conta.CODIGO), folha = (codigo: string) => !codigos.some(outro => outro !== codigo && outro.startsWith(`${codigo}.`));
  const saida = new Map<string, number>();
  for (const conta of contas) { const nome = grupo(conta); if (!nome || !folha(conta.CODIGO)) continue; saida.set(nome, (saida.get(nome) ?? 0) + valor(conta)); }
  return saida;
}
const meses = (de: string, ate: string) => { const lista: string[] = []; for (let d = new Date(`${de}-01T00:00:00Z`); d.toISOString().slice(0, 7) <= ate; d.setUTCMonth(d.getUTCMonth() + 1)) lista.push(d.toISOString().slice(0, 7)); return lista; };
const mmaaaa = (mes: string) => `${mes.slice(5, 7)}/${mes.slice(0, 4)}`;
const centavos = (valor: number) => Math.round(valor * 100) / 100;

async function main() {
  const todos = meses(`${desde}-01`, ate), anos = [...new Set(todos.map(mes => mes.slice(0, 4)))];
  console.log(`Receita e despesa de ${todos[0]} a ${ate}: ${todos.length} meses`);
  const receita: [string, string, number][] = [], despesa: [string, string, number][] = [];
  for (const [endpoint, destino, grupo] of [['ComparativoReceita', receita, (conta: Conta) => tipoReceita(conta.CODIGO)], ['ComparativoDespesa', despesa, (conta: Conta) => grupoDespesa(conta.CODIGO, conta.NOME)]] as const) {
    const respostas = await emLotes(todos, 8, mes => obter<Conta[]>(endpoint, { referenciaInicio: mmaaaa(mes), referenciaTermino: mmaaaa(mes) }).then(contas => ({ mes, contas })));
    for (const { mes, contas } of respostas) for (const [nome, valor] of somarFolhas(contas, grupo, conta => conta.REALIZADO_PERIODO)) destino.push([mes, nome, centavos(valor)]);
  }
  console.log('Orçamento por exercício');
  const orcamento: { ano: string; tipo: 'receita' | 'despesa'; grupo: string; inicial: number; atual: number }[] = [];
  for (const [endpoint, tipo, grupo] of [['ComparativoReceita', 'receita', (conta: Conta) => tipoReceita(conta.CODIGO)], ['ComparativoDespesa', 'despesa', (conta: Conta) => grupoDespesa(conta.CODIGO, conta.NOME)]] as const) {
    const respostas = await emLotes(anos, 4, ano => { const fim = ano === ate.slice(0, 4) ? ate.slice(5, 7) : '12'; return obter<Conta[]>(endpoint, { referenciaInicio: `01/${ano}`, referenciaTermino: `${fim}/${ano}` }).then(contas => ({ ano, contas })); });
    for (const { ano, contas } of respostas) {
      const inicial = somarFolhas(contas, grupo, conta => conta.VALOR_ORCADO), atual = somarFolhas(contas, grupo, conta => conta.TOTAL_EXERCICIO);
      for (const nome of new Set([...inicial.keys(), ...atual.keys()])) orcamento.push({ ano, tipo, grupo: nome, inicial: centavos(inicial.get(nome) ?? 0), atual: centavos(atual.get(nome) ?? 0) });
    }
  }

  const recentes = todos.slice(-37);
  console.log(`Pagamentos de ${recentes[0]} a ${ate}`);
  const categoriaDiaria = (conta: string) => /04\.05\.001/.test(conta) ? 'Empregados' : /04\.05\.002/.test(conta) ? 'Conselheiros' : /04\.05\.003/.test(conta) ? 'Colaboradores' : /04\.05\.004/.test(conta) ? 'Inspetores' : /04\.05\.005/.test(conta) ? 'Jetons' : null;
  const pessoas = new Map<string, { nome: string; categoria: string; meses: Map<string, { valor: number; quantidade: number }> }>();
  const fornecedores = new Map<string, { nome: string; cnpj: string; conta: Map<string, number>; meses: Map<string, number> }>();
  const caixa = new Map<string, number>();
  const pagamentos = await emLotes(recentes, 6, mes => obter<Pagamento[]>('Pagamentos', { referenciaInicio: mmaaaa(mes), referenciaTermino: mmaaaa(mes) }).then(linhas => ({ mes, linhas })));
  for (const { mes, linhas } of pagamentos) for (const row of linhas) {
    caixa.set(mes, (caixa.get(mes) ?? 0) + row.VALOR);
    const categoria = categoriaDiaria(row.CONTA_EMPENHO), nome = (row.NOME_RAZAO_SOCIAL ?? '').replace(/\s+/g, ' ').trim();
    if (categoria && nome) {
      // A chave usa o CPF mascarado só para separar homônimos; ele não é gravado.
      const chave = `${categoria}|${nome}|${row.CPF_CNPJ}`, pessoa = pessoas.get(chave) ?? { nome, categoria, meses: new Map() };
      const item = pessoa.meses.get(mes) ?? { valor: 0, quantidade: 0 }; item.valor += row.VALOR; item.quantidade += 1; pessoa.meses.set(mes, item); pessoas.set(chave, pessoa);
    }
    const cnpj = (row.CPF_CNPJ ?? '').replace(/\D/g, '');
    if (cnpj.length === 14 && !categoria && !/01\.01\.|05\.02\./.test(row.CONTA_EMPENHO)) {
      const fornecedor = fornecedores.get(cnpj) ?? { nome, cnpj, conta: new Map(), meses: new Map() };
      const conta = row.CONTA_EMPENHO.replace(/^[\d.]+-/, '').trim();
      fornecedor.conta.set(conta, (fornecedor.conta.get(conta) ?? 0) + row.VALOR); fornecedor.meses.set(mes, (fornecedor.meses.get(mes) ?? 0) + row.VALOR); fornecedores.set(cnpj, fornecedor);
    }
  }
  // Homônimos na mesma categoria ganham um número, para a lista não juntar duas pessoas.
  const vistos = new Map<string, number>();
  const diarias = [...pessoas.values()].map(pessoa => { const chave = `${pessoa.categoria}|${pessoa.nome}`, n = (vistos.get(chave) ?? 0) + 1; vistos.set(chave, n);
    return { nome: n > 1 ? `${pessoa.nome} (${n})` : pessoa.nome, categoria: pessoa.categoria, meses: [...pessoa.meses].map(([mes, item]) => [mes, centavos(item.valor), item.quantidade]) }; });
  const maiores = [...fornecedores.values()].map(row => ({ ...row, total: [...row.meses.values()].reduce((a, b) => a + b, 0) })).sort((a, b) => b.total - a.total).slice(0, 150)
    .map(row => ({ nome: row.nome, cnpj: row.cnpj, objeto: [...row.conta].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '', meses: [...row.meses].map(([mes, valor]) => [mes, centavos(valor)]) }));

  console.log('Contratos');
  const contratos = await obter<Contrato[]>('Contratos', { vigenciaInicio: mmaaaa(recentes[0]), vigenciaTermino: mmaaaa(ate) }).catch(() => [] as Contrato[]);
  // A contratada vem como "CNPJ - nome"; quando é pessoa física, o começo é um pedaço do CPF mascarado e não é gravado.
  const saidaContratos = contratos.map(row => { const [documento, ...nome] = row.CONTRATADA.split(' - '), cnpj = documento.replace(/\D/g, '');
    return { numero: row.NUMERO_CONTRATO, processo: row.NUMERO_PROCESSO_COMPRA, cnpj: cnpj.length === 14 ? cnpj : '', contratada: nome.join(' - ').replace(/\s+/g, ' ').trim(), valor: centavos(row.VALOR), inicio: row.DATA_INICIO_VIGENCIA?.slice(0, 10), fim: row.DATA_FINAL_VIGENCIA?.slice(0, 10) }; });

  const saida = {
    meta: { fonte: 'Portal da Transparência do Crea-SP (API do Implanta)', url: 'https://crea-sp.implanta.net.br/transparencia/', capturadoEm: new Date().toISOString().slice(0, 10), ate,
      nota: 'Receita e despesa realizadas por mês (ComparativoReceita e ComparativoDespesa, contas analíticas). A despesa realizada é a empenhada. Pagamentos são o que saiu do caixa. O CPF não é gravado.' },
    receita, despesa, orcamento, caixa: [...caixa].map(([mes, valor]) => [mes, centavos(valor)]), diarias, fornecedores: maiores, contratos: saidaContratos,
  };
  const destino = 'public/data/transparencia/financeiro-crea-sp.json';
  mkdirSync('public/data/transparencia', { recursive: true });
  writeFileSync(destino, JSON.stringify(saida));
  console.log(`Gravado ${destino}: ${receita.length} linhas de receita, ${despesa.length} de despesa, ${diarias.length} pessoas com diária, ${maiores.length} fornecedores, ${saidaContratos.length} contratos`);
}
if (process.argv[1]?.endsWith('coletar-financeiro.ts')) main().catch(erro => { console.error(erro); process.exit(1); });
