/**
 * Painel Financeiro (07/11/2026): as regras puras de arrecadação, meta, orçamento, despesa, diárias e fornecedores.
 *
 * A receita e a despesa realizadas, o orçamento, os pagamentos e os contratos são REAIS: vêm do Portal da Transparência do
 * Crea-SP (API do Implanta), coletados por `scripts/coletar-financeiro.ts` em public/data/transparencia/financeiro-crea-sp.json.
 * O portal publica o estado inteiro, mês a mês. A divisão por dia e por município é do CreaNet, interna, e no protótipo é
 * demonstrativa (ver `arrecadacaoDoMes`).
 */

const DAY = 86400000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher), base dos feriados móveis. */
function pascoa(ano: number): Date {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}
/**
 * Dias sem expediente na sede do Crea-SP: feriados nacionais (com o 20 de novembro, Lei 14.759/2023), o 9 de julho (estadual),
 * o 25 de janeiro (capital), o carnaval, a Sexta-feira Santa e Corpus Christi.
 */
export function feriados(ano: number): Set<string> {
  const fixos = ['01-01', '01-25', '04-21', '05-01', '07-09', '09-07', '10-12', '11-02', '11-15', '12-25', ...(ano >= 2024 ? ['11-20'] : [])].map(dia => `${ano}-${dia}`);
  const p = pascoa(ano).getTime(), moveis = [-48, -47, -2, 60].map(dias => iso(new Date(p + dias * DAY)));
  return new Set([...fixos, ...moveis]);
}
/** Os dias úteis de um mês ("2026-09"), em ordem. */
export function diasUteis(mes: string): number[] {
  const ano = Number(mes.slice(0, 4)), m = Number(mes.slice(5, 7)), livres = feriados(ano), dias: number[] = [];
  for (let d = new Date(Date.UTC(ano, m - 1, 1)); d.getUTCMonth() === m - 1; d = new Date(d.getTime() + DAY)) {
    const semana = d.getUTCDay();
    if (semana !== 0 && semana !== 6 && !livres.has(iso(d))) dias.push(d.getUTCDate());
  }
  return dias;
}

/* ---------- Dados reais da Transparência ---------- */

export type TipoReceita = 'Anuidades' | 'ART' | 'Dívida ativa' | 'Multas' | 'Serviços e outras';
export const tiposReceita: TipoReceita[] = ['Anuidades', 'ART', 'Dívida ativa', 'Multas', 'Serviços e outras'];
export interface LinhaOrcamento { ano: string; tipo: 'receita' | 'despesa'; grupo: string; inicial: number; atual: number }
/** Diárias de uma pessoa: [mês, valor, número de pagamentos]. */
export interface PessoaDiarias { nome: string; categoria: string; meses: [string, number, number][] }
export interface FornecedorPago { nome: string; cnpj: string; objeto: string; meses: [string, number][] }
export interface ContratoVigente { numero: string; processo: string | null; cnpj: string; contratada: string; valor: number; inicio: string; fim: string }
/** O arquivo gravado pela coleta: [mês, tipo ou grupo, valor] em receita e despesa. */
export interface Financeiro {
  meta: { fonte: string; url: string; capturadoEm: string; ate: string; nota: string };
  receita: [string, string, number][]; despesa: [string, string, number][]; orcamento: LinhaOrcamento[];
  caixa: [string, number][]; diarias: PessoaDiarias[]; fornecedores: FornecedorPago[]; contratos: ContratoVigente[];
}

/** Tipo de receita do painel pelo código da conta (plano de contas dos Creas, igual de 2013 a 2026). */
export function tipoReceita(codigo: string): TipoReceita | null {
  if (!codigo.startsWith('6.2.1.2.')) return null;
  const resto = codigo.slice('6.2.1.2.'.length);
  if (/^\d\.01/.test(resto)) return 'ART';
  if (/^\d\.02/.test(resto)) return 'Anuidades';
  if (/^\d\.08\.01/.test(resto)) return 'Dívida ativa';
  if (/^\d\.08\.02/.test(resto)) return 'Multas';
  return 'Serviços e outras';
}
/** Grupo de despesa do painel pelo código e pelo nome da conta. */
export function grupoDespesa(codigo: string, nome: string): string | null {
  if (!codigo.startsWith('6.2.2.1.1.')) return null;
  const c = codigo.slice('6.2.2.1.1.'.length), n = nome.toLocaleLowerCase('pt-BR');
  if (c.startsWith('02')) return 'Investimentos';
  if (c.startsWith('01.01')) return 'Pessoal e encargos';
  if (c.startsWith('01.04.01') || c.startsWith('01.04.02')) return 'Benefícios ao pessoal';
  if (c.startsWith('01.04.05') || c.startsWith('01.04.06') || c.startsWith('01.04.08')) return 'Diárias e deslocamento';
  if (c.startsWith('01.04')) return 'Serviços e materiais';
  if (c.startsWith('01.05.02')) return 'Cota-parte ao Confea e à Mútua';
  if (c.startsWith('01.05')) return 'Tributos';
  if (c.startsWith('01.08')) return 'Convênios e parcerias';
  if (c.startsWith('01.06') && /senten|honor|sucumb/.test(n)) return 'Sentenças e honorários';
  return 'Outras despesas';
}

const meses12 = (ano: number) => Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`);
/** Soma de [mês, grupo, valor] por grupo e mês. */
export function porGrupoEMes(linhas: [string, string, number][]): Map<string, Map<string, number>> {
  const saida = new Map<string, Map<string, number>>();
  for (const [mes, grupo, valor] of linhas) { const item = saida.get(grupo) ?? new Map<string, number>(); item.set(mes, (item.get(mes) ?? 0) + valor); saida.set(grupo, item); }
  return saida;
}

/**
 * Meta de arrecadação de cada mês, por tipo: a receita orçada do ano (com as reformulações) dividida no mesmo ritmo do ano
 * anterior. Sem ano anterior, em doze partes iguais. Vale até a TI informar a meta oficial do Crea-SP.
 */
export function metaMensal(fin: Financeiro, ano: number): Map<string, number[]> {
  const realizado = porGrupoEMes(fin.receita), saida = new Map<string, number[]>();
  for (const linha of fin.orcamento) {
    if (linha.tipo !== 'receita' || linha.ano !== String(ano)) continue;
    const antes = meses12(ano - 1).map(mes => realizado.get(linha.grupo)?.get(mes) ?? 0), total = antes.reduce((a, b) => a + b, 0);
    saida.set(linha.grupo, antes.map(valor => total > 0 ? linha.atual * valor / total : linha.atual / 12));
  }
  return saida;
}

export interface RitmoDoMes { meta: number; arrecadado: number; falta: number; uteis: number; uteisPassados: number; uteisRestantes: number; mediaNecessaria: number; projecao: number }
/**
 * O mês até um dia, como o painel de arrecadação do Crea-SP mostra: o arrecadado até o dia, quanto falta para a meta, os dias
 * úteis que restam e a média por dia útil que fecha a meta. A projeção repete a média dos dias úteis já passados.
 */
export function ritmoDoMes(mes: string, porDia: Map<number, number>, meta: number, ate: number): RitmoDoMes {
  const uteis = diasUteis(mes), passados = uteis.filter(dia => dia <= ate).length, restantes = uteis.length - passados;
  let arrecadado = 0; for (const [dia, valor] of porDia) if (dia <= ate) arrecadado += valor;
  const falta = Math.max(0, meta - arrecadado);
  return { meta, arrecadado, falta, uteis: uteis.length, uteisPassados: passados, uteisRestantes: restantes, mediaNecessaria: falta > 0 && restantes > 0 ? falta / restantes : 0,
    projecao: passados ? arrecadado / passados * uteis.length : 0 };
}

/** Número entre 0 e 1 fixo para a mesma chave (a divisão demonstrativa sai igual a cada leitura). */
const sorte = (chave: string) => { let h = 2166136261; for (let i = 0; i < chave.length; i++) { h ^= chave.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; };
/**
 * A arrecadação de cada dia útil do mês, por tipo. O total do mês por tipo é o REAL do portal; a divisão pelos dias é
 * DEMONSTRATIVA, porque a Transparência publica só o mês: em produção, cada dia vem da baixa dos boletos no CreaNet.
 * A ART entra todo dia; a anuidade pesa mais nos primeiros dias úteis e no vencimento.
 */
export function arrecadacaoDoMes(fin: Financeiro, mes: string): Map<number, Record<string, number>> {
  const uteis = diasUteis(mes), saida = new Map<number, Record<string, number>>(uteis.map(dia => [dia, {}]));
  for (const [m, tipo, valor] of fin.receita) {
    if (m !== mes || !uteis.length) continue;
    const pesos = uteis.map((dia, i) => 0.7 + 0.6 * sorte(`${mes}:${tipo}:${dia}`) + (tipo === 'Anuidades' && (i < 3 || i === uteis.length - 1) ? 1.5 : 0) + (i === uteis.length - 1 ? 0.4 : 0));
    const total = pesos.reduce((a, b) => a + b, 0);
    uteis.forEach((dia, i) => { const linha = saida.get(dia)!; linha[tipo] = (linha[tipo] ?? 0) + valor * pesos[i] / total; });
  }
  return saida;
}

export interface Comparacao { atual: number; antes: number }
/** Cada tipo de receita no mês e no acumulado de janeiro até o mês, contra o mesmo intervalo do ano anterior. */
export function comparativoAnual(fin: Financeiro, mes: string): Map<string, { mes: Comparacao; acumulado: Comparacao }> {
  const ano = Number(mes.slice(0, 4)), n = Number(mes.slice(5, 7)), anterior = `${ano - 1}${mes.slice(4)}`, saida = new Map<string, { mes: Comparacao; acumulado: Comparacao }>();
  for (const [m, tipo, valor] of fin.receita) {
    const item = saida.get(tipo) ?? { mes: { atual: 0, antes: 0 }, acumulado: { atual: 0, antes: 0 } }, numero = Number(m.slice(5, 7)), deAno = Number(m.slice(0, 4));
    if (m === mes) item.mes.atual += valor;
    if (m === anterior) item.mes.antes += valor;
    if (numero <= n && deAno === ano) item.acumulado.atual += valor;
    if (numero <= n && deAno === ano - 1) item.acumulado.antes += valor;
    saida.set(tipo, item);
  }
  return saida;
}

export interface DiariasPessoa { nome: string; categoria: string; valor: number; pagamentos: number; meses: number; porMes: [string, number, number][] }
/** As diárias de cada pessoa somadas só nos meses escolhidos, maior valor primeiro. O nome é o que a Transparência publica. */
export function diariasNoPeriodo(fin: Financeiro, meses: string[]): DiariasPessoa[] {
  const dentro = new Set(meses);
  return fin.diarias.map(p => { const porMes = p.meses.filter(([mes]) => dentro.has(mes));
    return { nome: p.nome, categoria: p.categoria, valor: porMes.reduce((a, row) => a + row[1], 0), pagamentos: porMes.reduce((a, row) => a + row[2], 0), meses: porMes.length, porMes }; })
    .filter(p => p.valor > 0).sort((a, b) => b.valor - a.valor);
}
/** Índice de Herfindahl: a soma dos quadrados das partes de cada fornecedor. Acima de 0,15 o gasto está concentrado em poucos. */
export function concentracao(valores: number[]): number | null {
  const total = valores.reduce((a, b) => a + b, 0);
  return total > 0 ? valores.reduce((soma, valor) => soma + (valor / total) ** 2, 0) : null;
}
export interface FornecedorNoPeriodo { nome: string; cnpj: string; objeto: string; pago: number; porMes: [string, number][] }
/** O que foi pago a cada fornecedor (pessoa jurídica) nos meses escolhidos, maior primeiro. */
export function fornecedoresNoPeriodo(fin: Financeiro, meses: string[]): FornecedorNoPeriodo[] {
  const dentro = new Set(meses);
  return fin.fornecedores.map(f => { const porMes = f.meses.filter(([mes]) => dentro.has(mes)); return { nome: f.nome, cnpj: f.cnpj, objeto: f.objeto, pago: porMes.reduce((a, row) => a + row[1], 0), porMes }; })
    .filter(f => f.pago > 0).sort((a, b) => b.pago - a.pago);
}
/** Contratos vigentes na data que terminam nos próximos `meses` meses, o mais próximo primeiro. */
export function contratosQueTerminam(fin: Financeiro, data: string, meses: number): ContratoVigente[] {
  const limite = new Date(`${data}T00:00:00Z`); limite.setUTCMonth(limite.getUTCMonth() + meses);
  const ate = limite.toISOString().slice(0, 10);
  return fin.contratos.filter(row => row.inicio <= data && row.fim > data && row.fim <= ate).sort((a, b) => a.fim.localeCompare(b.fim));
}

export interface Execucao { orcado: number; realizado: number; acumulado: { mes: string; realizado: number | null; antes: number }[] }
/**
 * Execução do orçamento de receita ou de despesa no ano do mês: o orçado reformulado do ano inteiro, o realizado de janeiro até
 * o mês e o realizado acumulado mês a mês, com o mesmo acumulado do ano anterior.
 */
export function execucaoDoAno(fin: Financeiro, tipo: 'receita' | 'despesa', mes: string): Execucao {
  const ano = Number(mes.slice(0, 4)), linhas = tipo === 'receita' ? fin.receita : fin.despesa, porMes = new Map<string, number>();
  for (const [m, , valor] of linhas) porMes.set(m, (porMes.get(m) ?? 0) + valor);
  const orcado = fin.orcamento.filter(row => row.tipo === tipo && row.ano === String(ano)).reduce((a, row) => a + row.atual, 0);
  let atual = 0, antes = 0;
  const acumulado = meses12(ano).map((m, i) => { antes += porMes.get(meses12(ano - 1)[i]) ?? 0; if (m <= mes) atual += porMes.get(m) ?? 0; return { mes: m, realizado: m <= mes ? atual : null, antes }; });
  return { orcado, realizado: atual, acumulado };
}
/** Parte do recorte (municípios escolhidos) no peso do estado; sem recorte, 1. */
export function parteDoRecorte(pesos: Map<string, number>, cidades: Set<string> | null): number {
  if (!cidades) return 1;
  let total = 0, dentro = 0; for (const [id, peso] of pesos) { total += peso; if (cidades.has(id)) dentro += peso; }
  return total > 0 ? dentro / total : 0;
}

/** O que pesa a arrecadação de cada município no cenário, contado em cada um dos 645 (`cidades`). */
export interface BasesDaArrecadacao { cidades: string[]; ativos: Map<string, number>; estabelecimentos: Map<string, number>; vencido: Map<string, number>; acoes: Map<string, number> }
/**
 * Peso de cada município na arrecadação de cada tipo (divisão demonstrativa): anuidades e serviços pelos profissionais ativos, ART
 * pelos estabelecimentos com atividade de engenharia somados a um terço dos ativos, dívida ativa pelo valor vencido dos devedores
 * e multas pelas ações de fiscalização. Todo município tem um piso: a ART e a anuidade existem nos 645, ainda que o cenário não
 * tenha caído em algum. Em produção, a divisão sai da baixa de cada boleto no CreaNet, com o endereço de quem pagou.
 */
export function pesosDaArrecadacao(b: BasesDaArrecadacao): Record<TipoReceita, Map<string, number>> {
  const ativos = new Map<string, number>(), art = new Map<string, number>(), divida = new Map<string, number>(), multas = new Map<string, number>();
  for (const id of b.cidades) {
    const n = b.ativos.get(id) ?? 0;
    ativos.set(id, n + 1); art.set(id, (b.estabelecimentos.get(id) ?? 0) + n / 3 + 1);
    divida.set(id, (b.vencido.get(id) ?? 0) + 50); multas.set(id, (b.acoes.get(id) ?? 0) + 0.2);
  }
  return { Anuidades: ativos, ART: art, 'Dívida ativa': divida, Multas: multas, 'Serviços e outras': ativos };
}
