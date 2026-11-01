import type { Dataset } from './types';
import { between, chance, pick, share, sum } from './hash';

/**
 * V20 · Controle interno: despesa do Conselho por natureza e função (atividade-fim × atividade-meio), diárias e deslocamentos,
 * pessoal, orçado × realizado, composição da receita, contratos, empenhos e fornecedores. Camada DEMONSTRATIVA mensal de 2021 ao corte.
 * Em produção: API da Transparência do Crea-SP (Implanta): DespesasCentroCusto (≥2021), BalancoOrcamentario, ComparativoDespesa e
 * ComparativoReceita, Empenhos, Pagamentos, Contratos, ContratosAditivos, Licitacoes, QuadrosPessoas. A taxonomia natureza × função segue o
 * repositório `conselho` (QUEDA) do próprio autor. Mostra o que é público, sem juízo: cada bloco diz o que mede e o que não mede.
 */
export type Natureza = 'Pessoal e encargos' | 'Diárias e passagens' | 'Serviços de terceiros' | 'Material de consumo' | 'Investimentos' | 'Transferências e convênios' | 'Outras despesas';
export const naturezas: Natureza[] = ['Pessoal e encargos', 'Diárias e passagens', 'Serviços de terceiros', 'Material de consumo', 'Investimentos', 'Transferências e convênios', 'Outras despesas'];
export type Funcao = 'Fiscalização' | 'Atendimento' | 'Institucional' | 'Direção superior' | 'Administração';
export const funcoes: Funcao[] = ['Fiscalização', 'Atendimento', 'Institucional', 'Direção superior', 'Administração'];
/** Atividade-fim (finalística) e atividade-meio, como no QUEDA. */
export const funcaoFim: Record<Funcao, boolean> = { Fiscalização: true, Atendimento: true, Institucional: true, 'Direção superior': false, Administração: false };
export type Categoria = 'Conselheiros' | 'Empregados' | 'Diretoria e presidência' | 'Inspetores e agentes de campo';
export const categorias: Categoria[] = ['Conselheiros', 'Empregados', 'Diretoria e presidência', 'Inspetores e agentes de campo'];
export type FonteReceita = 'Anuidades PF' | 'Anuidades PJ' | 'Taxas de ART' | 'Multas' | 'Outras receitas';
export const fontesReceita: FonteReceita[] = ['Anuidades PF', 'Anuidades PJ', 'Taxas de ART', 'Multas', 'Outras receitas'];

export interface Despesa { month: string; natureza: Natureza; funcao: Funcao; greId: string | null; orcado: number; realizado: number }
export interface Diaria { month: string; categoria: Categoria; greId: string | null; quantidade: number; valor: number; km: number }
export interface ReceitaMes { month: string; fonte: FonteReceita; prevista: number; realizada: number }
export interface Fornecedor { id: string; nome: string; objeto: string; natureza: Natureza }
export interface Empenho { id: string; month: string; fornecedorId: string; valor: number; pago: number; contratoId?: string }
export interface ContratoConselho { id: string; fornecedorId: string; objeto: string; inicio: string; fim: string; valor: number; aditivos: number; modalidade: 'Pregão' | 'Dispensa' | 'Inexigibilidade' | 'Concorrência' }
export interface Pessoal { funcao: Funcao; efetivos: number; comissionados: number; custoMes: number }
export interface Conselho { despesas: Despesa[]; diarias: Diaria[]; receitas: ReceitaMes[]; fornecedores: Fornecedor[]; empenhos: Empenho[]; contratos: ContratoConselho[]; pessoal: Pessoal[]; months: string[]; anchor: string }

const pesoNatureza: Record<Natureza, number> = { 'Pessoal e encargos': 52, 'Diárias e passagens': 4, 'Serviços de terceiros': 22, 'Material de consumo': 3, Investimentos: 6, 'Transferências e convênios': 7, 'Outras despesas': 6 };
const pesoFuncao: Record<Funcao, number> = { Fiscalização: 34, Atendimento: 16, Institucional: 12, 'Direção superior': 10, Administração: 28 };
const objetosFornecedor = ['Tecnologia da informação', 'Limpeza e conservação', 'Vigilância', 'Locação de veículos', 'Correios e logística', 'Consultoria', 'Eventos e comunicação', 'Manutenção predial', 'Telefonia e dados', 'Material de escritório'];
const MESES_TOTAIS = 69; // 2021-01 a 2026-09

const cache = new WeakMap<Dataset, Conselho>();
export function buildConselho(dataset: Dataset): Conselho {
  const saved = cache.get(dataset); if (saved) return saved;
  const anchor = dataset.snapshotDate;
  const months = Array.from({ length: MESES_TOTAIS }, (_, index) => new Date(Date.UTC(2021, index, 1)).toISOString().slice(0, 7)).filter(month => `${month}-01` <= anchor);
  const total = (month: string) => 18_000_000 * (1 + (Number(month.slice(0, 4)) - 2021) * 0.085) * (1 + (Number(month.slice(5, 7)) === 12 ? 0.18 : Number(month.slice(5, 7)) === 1 ? -0.08 : 0));
  const despesas: Despesa[] = [], diarias: Diaria[] = [], receitas: ReceitaMes[] = [];
  const gres = [null, ...dataset.gres.map(row => row.id)];
  for (const month of months) {
    for (const natureza of naturezas) for (const funcao of funcoes) {
      const base = total(month) * pesoNatureza[natureza] / 100 * pesoFuncao[funcao] / 100;
      const orcado = Math.round(base * (0.95 + chance(`orc:${month}:${natureza}:${funcao}`) * 0.2));
      const realizado = Math.round(orcado * (natureza === 'Investimentos' ? 0.45 + chance(`real:${month}:${natureza}:${funcao}`) * 0.5 : 0.82 + chance(`real:${month}:${natureza}:${funcao}`) * 0.26));
      // Território: fiscalização e atendimento têm parte nas regionais; o resto fica na sede.
      const greId = funcaoFim[funcao] && funcao !== 'Institucional' && chance(`gre:${month}:${natureza}:${funcao}`) < 0.72 ? pick(`greid:${month}:${natureza}:${funcao}`, gres.slice(1)) : null;
      despesas.push({ month, natureza, funcao, greId, orcado, realizado });
    }
    for (const categoria of categorias) {
      const peso = categoria === 'Conselheiros' ? 1.6 : categoria === 'Empregados' ? 1 : categoria === 'Diretoria e presidência' ? 0.5 : 1.3;
      for (const greId of categoria === 'Inspetores e agentes de campo' ? gres.slice(1) : [null, ...(categoria === 'Empregados' ? gres.slice(1) : [])]) {
        const key = `dia:${month}:${categoria}:${greId}`, quantidade = between(key, greId ? 2 : 20, greId ? 14 : 90) * (Number(month.slice(5, 7)) === 1 ? 0.6 : 1);
        diarias.push({ month, categoria, greId, quantidade: Math.round(quantidade * peso), valor: Math.round(quantidade * peso * between(`${key}:v`, 320, 980)), km: categoria === 'Inspetores e agentes de campo' ? between(`${key}:km`, 1200, 6800) : categoria === 'Conselheiros' ? between(`${key}:km`, 400, 2400) : 0 });
      }
    }
    const receitaTotal = total(month) * 1.04 * (Number(month.slice(5, 7)) <= 3 ? 1.9 : 0.72);
    const pesos: Record<FonteReceita, number> = { 'Anuidades PF': 44, 'Anuidades PJ': 14, 'Taxas de ART': 30, Multas: 5, 'Outras receitas': 7 };
    for (const fonte of fontesReceita) { const prevista = Math.round(receitaTotal * pesos[fonte] / 100), realizada = Math.round(prevista * (0.84 + chance(`rec:${month}:${fonte}`) * 0.3)); receitas.push({ month, fonte, prevista, realizada }); }
  }
  const fornecedores: Fornecedor[] = Array.from({ length: 60 }, (_, index) => { const objeto = objetosFornecedor[index % objetosFornecedor.length];
    return { id: `FORN-${String(index + 1).padStart(3, '0')}`, nome: `Fornecedor demonstrativo ${String(index + 1).padStart(2, '0')} · ${objeto}`, objeto, natureza: objeto === 'Material de escritório' ? 'Material de consumo' : index % 9 === 0 ? 'Investimentos' : 'Serviços de terceiros' }; });
  const contratos: ContratoConselho[] = Array.from({ length: 90 }, (_, index) => {
    const key = `ctr:${index}`, fornecedor = fornecedores[Math.floor(Math.pow(chance(key), 1.8) * fornecedores.length)];
    const inicio = `${2021 + between(`${key}:ano`, 0, 5)}-${String(between(`${key}:mes`, 1, 12)).padStart(2, '0')}-01`, duracao = between(`${key}:dur`, 12, 60);
    const d = new Date(`${inicio}T00:00:00Z`), fim = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + duracao, 0)).toISOString().slice(0, 10);
    return { id: `CT-${2021 + between(`${key}:ano`, 0, 5)}-${String(index + 1).padStart(3, '0')}`, fornecedorId: fornecedor.id, objeto: fornecedor.objeto, inicio, fim, valor: between(`${key}:valor`, 60, 4800) * 1000, aditivos: between(`${key}:adit`, 0, 4),
      modalidade: pick(`${key}:mod`, ['Pregão', 'Pregão', 'Pregão', 'Dispensa', 'Inexigibilidade', 'Concorrência'] as const) };
  }).filter(row => row.inicio <= anchor);
  const empenhos: Empenho[] = [];
  for (const month of months) for (let index = 0; index < 24; index++) {
    const key = `emp:${month}:${index}`, contrato = chance(`${key}:c`) < 0.7 ? contratos[Math.floor(chance(`${key}:ci`) * contratos.length)] : undefined;
    const fornecedorId = contrato?.fornecedorId ?? fornecedores[Math.floor(Math.pow(chance(`${key}:f`), 1.5) * fornecedores.length)].id;
    const valor = between(`${key}:v`, 8, 420) * 1000;
    empenhos.push({ id: `NE-${month.replace('-', '')}-${String(index + 1).padStart(3, '0')}`, month, fornecedorId, valor, pago: Math.round(valor * (0.6 + chance(`${key}:p`) * 0.4)), ...(contrato ? { contratoId: contrato.id } : {}) });
  }
  const pessoal: Pessoal[] = funcoes.map(funcao => ({ funcao, efetivos: Math.round(pesoFuncao[funcao] * 9.2), comissionados: funcao === 'Direção superior' ? 38 : funcao === 'Administração' ? 22 : between(`pes:${funcao}`, 2, 9), custoMes: Math.round(pesoFuncao[funcao] * 9.2 * 14_800 + (funcao === 'Direção superior' ? 38 : 10) * 21_000) }));
  const value = { despesas, diarias, receitas, fornecedores, empenhos, contratos, pessoal, months, anchor };
  cache.set(dataset, value); return value;
}

/* ---------- Leituras em D ---------- */
export interface QuadroConselho {
  anos: string[]; ultimoMes: string;
  fimMeio: { ano: string; fim: number; meio: number }[]; fimMeioAtual: { fim: number; meio: number; taxaFim: number | null };
  porNatureza: { natureza: Natureza; realizado: number; orcado: number; antes: number }[];
  porFuncao: { funcao: Funcao; realizado: number; orcado: number; fim: boolean }[];
  sedeTerritorio: { sede: number; territorio: number; porGre: { greId: string; valor: number; acoes: number; custoPorAcao: number | null }[] };
  diarias: { categoria: Categoria; quantidade: number; valor: number; antes: number; km: number }[]; diariasMensal: { month: string; valor: number }[];
  orcadoRealizado: { ano: string; orcado: number; realizado: number; execucao: number | null }[];
  receita: { fonte: FonteReceita; realizada: number; prevista: number; antes: number }[]; receitaAnual: { ano: string; fonte: FonteReceita; valor: number }[];
  fornecedores: { fornecedor: Fornecedor; empenhado: number; pago: number; contratos: number }[]; concentracao: number | null; hhi: number;
  contratos: { vigentes: number; valorVigente: number; comAditivo: number; porModalidade: { modalidade: string; n: number; valor: number }[]; vencem90: number };
  pessoal: Pessoal[]; ritmo: { month: string; realizado: number; mediaAno: number }[];
}
const anoDe = (month: string) => month.slice(0, 4);
export function quadroConselho(conselho: Conselho, anchor: string, greId: string | null, acoesPorGre: Map<string, number>): QuadroConselho {
  const months = conselho.months.filter(month => `${month}-01` <= anchor), ultimoMes = months.at(-1) ?? anchor.slice(0, 7);
  const anos = [...new Set(months.map(anoDe))];
  const d12 = months.slice(-12), d12Antes = months.slice(-24, -12), set12 = new Set(d12), setAntes = new Set(d12Antes);
  const desp = conselho.despesas.filter(row => set12.has(row.month) && (!greId || row.greId === greId || row.greId === null));
  const despAntes = conselho.despesas.filter(row => setAntes.has(row.month) && (!greId || row.greId === greId || row.greId === null));
  const fimMeio = anos.map(ano => { const rows = conselho.despesas.filter(row => anoDe(row.month) === ano && months.includes(row.month)); return { ano, fim: sum(rows.filter(row => funcaoFim[row.funcao]).map(row => row.realizado)), meio: sum(rows.filter(row => !funcaoFim[row.funcao]).map(row => row.realizado)) }; });
  const fim = sum(desp.filter(row => funcaoFim[row.funcao]).map(row => row.realizado)), meio = sum(desp.filter(row => !funcaoFim[row.funcao]).map(row => row.realizado));
  const porGre = (greId ? [greId] : [...new Set(conselho.despesas.map(row => row.greId).filter((id): id is string => id !== null))]).map(id => { const valor = sum(desp.filter(row => row.greId === id && row.funcao === 'Fiscalização').map(row => row.realizado)), acoes = acoesPorGre.get(id) ?? 0; return { greId: id, valor, acoes, custoPorAcao: acoes ? valor / acoes : null }; });
  const dia = conselho.diarias.filter(row => set12.has(row.month) && (!greId || row.greId === greId)), diaAntes = conselho.diarias.filter(row => setAntes.has(row.month) && (!greId || row.greId === greId));
  const rec = conselho.receitas.filter(row => set12.has(row.month)), recAntes = conselho.receitas.filter(row => setAntes.has(row.month));
  const emp = conselho.empenhos.filter(row => set12.has(row.month));
  const porFornecedor = conselho.fornecedores.map(fornecedor => { const rows = emp.filter(row => row.fornecedorId === fornecedor.id); return { fornecedor, empenhado: sum(rows.map(row => row.valor)), pago: sum(rows.map(row => row.pago)), contratos: conselho.contratos.filter(row => row.fornecedorId === fornecedor.id && row.inicio <= anchor && row.fim >= anchor).length }; }).filter(row => row.empenhado).sort((a, b) => b.empenhado - a.empenhado);
  const totalEmp = sum(porFornecedor.map(row => row.empenhado));
  const vigentes = conselho.contratos.filter(row => row.inicio <= anchor && row.fim >= anchor);
  const em90 = new Date(Date.parse(`${anchor}T00:00:00Z`) + 90 * 86400000).toISOString().slice(0, 10);
  const mediaAno = new Map(anos.map(ano => { const rows = months.filter(month => anoDe(month) === ano); return [ano, sum(conselho.despesas.filter(row => anoDe(row.month) === ano && months.includes(row.month)).map(row => row.realizado)) / Math.max(1, rows.length)]; }));
  return { anos, ultimoMes, fimMeio, fimMeioAtual: { fim, meio, taxaFim: share(fim, fim + meio) },
    porNatureza: naturezas.map(natureza => ({ natureza, realizado: sum(desp.filter(row => row.natureza === natureza).map(row => row.realizado)), orcado: sum(desp.filter(row => row.natureza === natureza).map(row => row.orcado)), antes: sum(despAntes.filter(row => row.natureza === natureza).map(row => row.realizado)) })),
    porFuncao: funcoes.map(funcao => ({ funcao, realizado: sum(desp.filter(row => row.funcao === funcao).map(row => row.realizado)), orcado: sum(desp.filter(row => row.funcao === funcao).map(row => row.orcado)), fim: funcaoFim[funcao] })),
    sedeTerritorio: { sede: sum(desp.filter(row => row.greId === null).map(row => row.realizado)), territorio: sum(desp.filter(row => row.greId !== null).map(row => row.realizado)), porGre: porGre.sort((a, b) => (b.custoPorAcao ?? 0) - (a.custoPorAcao ?? 0)) },
    diarias: categorias.map(categoria => ({ categoria, quantidade: sum(dia.filter(row => row.categoria === categoria).map(row => row.quantidade)), valor: sum(dia.filter(row => row.categoria === categoria).map(row => row.valor)), antes: sum(diaAntes.filter(row => row.categoria === categoria).map(row => row.valor)), km: sum(dia.filter(row => row.categoria === categoria).map(row => row.km)) })),
    diariasMensal: months.slice(-24).map(month => ({ month, valor: sum(conselho.diarias.filter(row => row.month === month && (!greId || row.greId === greId)).map(row => row.valor)) })),
    orcadoRealizado: anos.map(ano => { const rows = conselho.despesas.filter(row => anoDe(row.month) === ano && months.includes(row.month)), orcado = sum(rows.map(row => row.orcado)), realizado = sum(rows.map(row => row.realizado)); return { ano, orcado, realizado, execucao: share(realizado, orcado) }; }),
    receita: fontesReceita.map(fonte => ({ fonte, realizada: sum(rec.filter(row => row.fonte === fonte).map(row => row.realizada)), prevista: sum(rec.filter(row => row.fonte === fonte).map(row => row.prevista)), antes: sum(recAntes.filter(row => row.fonte === fonte).map(row => row.realizada)) })),
    receitaAnual: anos.flatMap(ano => fontesReceita.map(fonte => ({ ano, fonte, valor: sum(conselho.receitas.filter(row => anoDe(row.month) === ano && months.includes(row.month) && row.fonte === fonte).map(row => row.realizada)) }))),
    fornecedores: porFornecedor, concentracao: share(sum(porFornecedor.slice(0, 5).map(row => row.empenhado)), totalEmp), hhi: totalEmp ? sum(porFornecedor.map(row => Math.pow(row.empenhado / totalEmp * 100, 2))) : 0,
    contratos: { vigentes: vigentes.length, valorVigente: sum(vigentes.map(row => row.valor)), comAditivo: vigentes.filter(row => row.aditivos > 0).length, porModalidade: ['Pregão', 'Dispensa', 'Inexigibilidade', 'Concorrência'].map(modalidade => ({ modalidade, n: vigentes.filter(row => row.modalidade === modalidade).length, valor: sum(vigentes.filter(row => row.modalidade === modalidade).map(row => row.valor)) })), vencem90: vigentes.filter(row => row.fim <= em90).length },
    pessoal: conselho.pessoal, ritmo: months.slice(-24).map(month => ({ month, realizado: sum(conselho.despesas.filter(row => row.month === month).map(row => row.realizado)), mediaAno: mediaAno.get(anoDe(month)) ?? 0 })) };
}
