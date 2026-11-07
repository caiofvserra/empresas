import type { Dataset } from '../../domain/types';
import { datasReferencia, datasetAt, fiscalizacaoAt } from '../../domain/tempo';
import { municipiosSp } from '../../domain/municipios';
import { buildProfissionais } from '../../domain/profissionais';
import { adimplenciaPorMunicipio, buildCarteira, faixaIdadeDivida, faixasIdadeDivida, pisoExecucao, vencidoEm } from '../../domain/gestao';
import { PROTESTOS, arrecadacaoDoMes, diasUteis, metaMensal, pesosDaArrecadacao, tiposReceita } from '../../domain/financeiro';
import { buildFiscalizacao } from '../../painel/fiscalizacao';
import { mainEstablishments } from '../../gestao-v14/metrics';
import bruto from '../../../public/data/transparencia/financeiro-crea-sp.json';
import { PRIMEIRA_FOTO, centavos, diasEntre, fimDoMes, meses, nomesMes, primeiroDia } from '../gestao/dados';
import type { Dados } from '../gestao/dados';
import type { Celula } from '../csv';
import type { Financeiro } from '../../domain/financeiro';

const fin = bruto as unknown as Financeiro;

/** Os grupos de despesa na ordem do painel. */
export const GRUPOS = ['Pessoal e encargos', 'Benefícios ao pessoal', 'Serviços e materiais', 'Cota-parte ao Confea e à Mútua', 'Tributos', 'Convênios e parcerias', 'Diárias e deslocamento', 'Sentenças e honorários', 'Investimentos', 'Outras despesas'];
const DIAS_DA_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/**
 * Tabelas do pacote Power BI do painel Financeiro (07/11/2026), em esquema estrela (ADR 0001 e 0002).
 * REAIS, da Transparência do Crea-SP (o mesmo arquivo das páginas, `npm run coletar:financeiro`), do estado inteiro: a receita de
 * cada mês por tipo desde 2013, a despesa por grupo, o orçamento inicial e o reformulado de cada ano, a meta de arrecadação de cada
 * mês (a receita orçada reformulada no ritmo do ano anterior), as diárias de cada pessoa pelo nome, o pago a cada fornecedor e os
 * contratos. O CPF não é gravado.
 * DEMONSTRATIVAS, do cenário: a divisão da receita pelos dias úteis e o peso de cada município em cada tipo (em produção, a baixa
 * de cada boleto no CreaNet), a dívida de anuidade de cada fim de mês por devedor e idade, os títulos e os profissionais ativos e
 * em atraso por município. Os pesos são os da data do cenário; nada depois dela entra nos CSV do cenário.
 */
const porBase = new WeakMap<Dataset, Dados[]>();
export function dadosFinanceiro(dataset: Dataset): Dados[] {
  let tabelas = porBase.get(dataset);
  if (!tabelas) { tabelas = montar(dataset); porBase.set(dataset, tabelas); }
  return tabelas;
}

function montar(dataset: Dataset): Dados[] {
  const hoje = dataset.snapshotDate, mesHoje = hoje.slice(0, 7), ate = fin.meta.ate, escolhiveis = [...datasReferencia(dataset), hoje];
  const fotos = meses(PRIMEIRA_FOTO, mesHoje).map(fimDoMes).map(data => data > hoje ? hoje : data);
  const municipios = municipiosSp(dataset), nomeGre = new Map(dataset.gres.map(row => [row.id, row.name])), gre = (id: string | null | undefined) => (id ? nomeGre.get(id) : '') ?? '';
  const profissionais = buildProfissionais(dataset), carteira = buildCarteira(dataset, profissionais), matriz = mainEstablishments(dataset);
  const primeiroAno = Number(fin.receita[0]?.[0].slice(0, 4) ?? 2013), calendario = meses(`${primeiroAno}-01`, fimDoMes(`${Number(mesHoje.slice(0, 4)) + 1}${mesHoje.slice(4)}`).slice(0, 7));
  const anos = [...new Set(calendario.map(mes => Number(mes.slice(0, 4))))];

  /* ---------- Arrecadação: cada dia útil por tipo (real no mês, dividida pelos dias) e o peso de cada município ---------- */
  const mesesComDia = meses(PRIMEIRA_FOTO, ate), dias: Celula[][] = [], arrecadacao: Celula[][] = [];
  for (const mes of mesesComDia) {
    const uteis = new Set(diasUteis(mes)), ultimo = Number(fimDoMes(mes).slice(8, 10)), primeiraSemana = new Date(`${mes}-01T00:00:00Z`).getUTCDay();
    for (let d = 1; d <= ultimo; d++) {
      const data = `${mes}-${String(d).padStart(2, '0')}`, semana = new Date(`${data}T00:00:00Z`).getUTCDay();
      dias.push([data, primeiroDia(mes), d, Math.floor((d - 1 + primeiraSemana) / 7) + 1, DIAS_DA_SEMANA[semana], semana + 1, uteis.has(d)]);
    }
    for (const [dia, linha] of arrecadacaoDoMes(fin, mes)) for (const tipo of tiposReceita) if (linha[tipo]) arrecadacao.push([`${mes}-${String(dia).padStart(2, '0')}`, tipo, centavos(linha[tipo])]);
  }
  const ativosHoje = new Map<string, number>(), estabelecimentos = new Map<string, number>(), vencido = new Map<string, number>(), acoes = new Map<string, number>();
  for (const [id, item] of adimplenciaPorMunicipio(profissionais, hoje)) ativosHoje.set(id, item.ativos.length);
  for (const row of dataset.establishments) estabelecimentos.set(row.cityId, (estabelecimentos.get(row.cityId) ?? 0) + 1);
  for (const row of carteira.titulos) vencido.set(row.cityId, (vencido.get(row.cityId) ?? 0) + row.valor);
  for (const row of fiscalizacaoAt(buildFiscalizacao(dataset), hoje).acoes) acoes.set(row.cityId, (acoes.get(row.cityId) ?? 0) + 1);
  const pesos = pesosDaArrecadacao({ cidades: municipios.map(c => c.id), ativos: ativosHoje, estabelecimentos, vencido, acoes });

  /* ---------- Meta de cada mês por tipo: a receita orçada reformulada no ritmo do ano anterior ---------- */
  const metas: Celula[][] = [];
  for (const ano of anos) for (const [tipo, valores] of metaMensal(fin, ano)) valores.forEach((valor, i) => metas.push([`${ano}-${String(i + 1).padStart(2, '0')}-01`, tipo, centavos(valor)]));

  /* ---------- Dívida de anuidade: uma linha por devedor e faixa de idade, em cada fim de mês ---------- */
  const fotoDivida: Celula[][] = [], adimplencia: Celula[][] = [];
  for (const data of fotos) {
    const abertos = carteira.titulos.filter(t => vencidoEm(t, data)), porDevedor = new Map<string, typeof abertos>();
    for (const t of abertos) porDevedor.set(`${t.devedor}:${t.pessoaId}`, [...(porDevedor.get(`${t.devedor}:${t.pessoaId}`) ?? []), t]);
    const piso = pisoExecucao(Number(data.slice(0, 4))), umAno = `${Number(data.slice(0, 4)) - 1}${data.slice(4)}`;
    for (const [chave, titulos] of porDevedor) {
      const t0 = titulos[0], acima = titulos.reduce((n, t) => n + t.valor, 0) >= piso, maisAntigo = titulos.map(t => t.vencimento).sort()[0], porFaixa = new Map<number, { valor: number; perto: number }>();
      for (const t of titulos) { const dias_ = diasEntre(t.vencimento, data), item = porFaixa.get(faixaIdadeDivida(dias_)) ?? { valor: 0, perto: 0 }; item.valor += t.valor; if (dias_ > 1461) item.perto += t.valor; porFaixa.set(faixaIdadeDivida(dias_), item); }
      const situacao = t0.devedor === 'Empresa' ? matriz.get(t0.pessoaId)?.rfbStatus ?? 'Ativa' : '';
      // Protestável: acima do piso e com anuidade vencida há um ano ou mais, a regra do bloco de protestos do painel.
      for (const [faixa, item] of porFaixa) fotoDivida.push([data, chave, t0.devedor, t0.cityId, faixasIdadeDivida[faixa], faixa + 1, centavos(item.valor), acima, centavos(item.perto), situacao, acima && maisAntigo <= umAno]);
    }
    // Como o painel: o cadastro de profissionais lido na própria data (a base em D), não na de hoje.
    for (const [cityId, item] of adimplenciaPorMunicipio(buildProfissionais(datasetAt(dataset, data)), data)) adimplencia.push([data, cityId, item.ativos.length, item.atraso.length]);
  }

  /* ---------- Diárias pelo nome, pagamentos a fornecedores e contratos (reais) ---------- */
  const pessoas = fin.diarias.map((p, i) => ({ id: `P${String(i + 1).padStart(5, '0')}`, ...p }));
  const fornecedores = fin.fornecedores.map((f, i) => ({ id: `F${String(i + 1).padStart(4, '0')}`, ...f }));

  return [
    { arquivo: 'regionais.csv', cabecalho: ['GRE', 'Ordem'], linhas: dataset.gres.map((row, i) => [row.name, i + 1]) },
    { arquivo: 'municipios.csv', cabecalho: ['Código IBGE', 'Município', 'GRE'], linhas: municipios.map(row => [row.id, row.nome, gre(row.greId)]) },
    { arquivo: 'calendario.csv', cabecalho: ['Mês', 'Rótulo', 'Ano', 'Mês do ano', 'Nome do mês', 'Ordem'],
      linhas: calendario.map((mes, i) => [primeiroDia(mes), `${nomesMes[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`, Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), nomesMes[Number(mes.slice(5, 7)) - 1], i + 1]) },
    { arquivo: 'dias.csv', cabecalho: ['Dia', 'Mês', 'Dia do mês', 'Semana do mês', 'Dia da semana', 'Ordem do dia da semana', 'Útil'], linhas: dias },
    { arquivo: 'datas-referencia.csv', cabecalho: ['Data', 'Rótulo'], linhas: escolhiveis.map(data => [data, `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}${data === hoje ? ' (hoje)' : ''}`]) },
    { arquivo: 'datas-das-fotos.csv', cabecalho: ['Data'], linhas: fotos.map(data => [data]) },
    { arquivo: 'tipos-receita.csv', cabecalho: ['Tipo', 'Ordem'], linhas: tiposReceita.map((tipo, i) => [tipo, i + 1]) },
    { arquivo: 'grupos-despesa.csv', cabecalho: ['Grupo', 'Ordem'], linhas: GRUPOS.map((grupo, i) => [grupo, i + 1]) },

    // Reais.
    { arquivo: 'receitas.csv', cabecalho: ['Mês', 'Tipo', 'Valor'], linhas: fin.receita.filter(([mes]) => mes <= ate).map(([mes, tipo, valor]) => [primeiroDia(mes), tipo, centavos(valor)]) },
    { arquivo: 'despesas.csv', cabecalho: ['Mês', 'Grupo', 'Valor'], linhas: fin.despesa.filter(([mes]) => mes <= ate).map(([mes, grupo, valor]) => [primeiroDia(mes), grupo, centavos(valor)]) },
    { arquivo: 'orcamento.csv', cabecalho: ['Ano', 'Natureza', 'Grupo', 'Inicial', 'Atual'], linhas: fin.orcamento.map(row => [Number(row.ano), row.tipo === 'receita' ? 'Receita' : 'Despesa', row.grupo, centavos(row.inicial), centavos(row.atual)]) },
    { arquivo: 'metas.csv', cabecalho: ['Mês', 'Tipo', 'Meta'], linhas: metas },
    { arquivo: 'pessoas.csv', cabecalho: ['Pessoa', 'Nome', 'Categoria'], linhas: pessoas.map(p => [p.id, p.nome, p.categoria]) },
    { arquivo: 'diarias.csv', cabecalho: ['Mês', 'Pessoa', 'Valor', 'Pagamentos'], linhas: pessoas.flatMap(p => p.meses.map(([mes, valor, n]) => [primeiroDia(mes), p.id, centavos(valor), n] as Celula[])) },
    { arquivo: 'fornecedores.csv', cabecalho: ['Fornecedor', 'Nome', 'CNPJ', 'Objeto'], linhas: fornecedores.map(f => [f.id, f.nome, f.cnpj, f.objeto]) },
    { arquivo: 'pagamentos.csv', cabecalho: ['Mês', 'Fornecedor', 'Valor'], linhas: fornecedores.flatMap(f => f.meses.map(([mes, valor]) => [primeiroDia(mes), f.id, centavos(valor)] as Celula[])) },
    { arquivo: 'contratos.csv', cabecalho: ['Contrato', 'Contratada', 'CNPJ', 'Valor', 'Início', 'Fim'], linhas: fin.contratos.map(row => [row.numero, row.contratada, row.cnpj, centavos(row.valor), row.inicio, row.fim]) },

    // Demonstrativas.
    { arquivo: 'arrecadacao.csv', cabecalho: ['Dia', 'Tipo', 'Valor'], linhas: arrecadacao },
    { arquivo: 'pesos.csv', cabecalho: ['Código IBGE', 'Tipo', 'Peso'], linhas: tiposReceita.flatMap(tipo => [...pesos[tipo]].map(([id, peso]) => [id, tipo, Math.round(peso * 1000)] as Celula[])) },
    { arquivo: 'titulos.csv', cabecalho: ['Título', 'Devedor', 'Tipo de devedor', 'Código IBGE', 'Vencimento', 'Valor', 'Pago em', 'Dias até o pagamento'],
      linhas: carteira.titulos.filter(t => t.vencimento <= hoje).map(t => { const pago = t.pagoEm && t.pagoEm <= hoje ? t.pagoEm : null;
        return [t.id, `${t.devedor}:${t.pessoaId}`, t.devedor, t.cityId, t.vencimento, t.valor, pago, pago ? diasEntre(t.vencimento, pago) : null]; }) },
    { arquivo: 'foto-divida.csv', cabecalho: ['Data', 'Devedor', 'Tipo de devedor', 'Código IBGE', 'Idade da anuidade', 'Ordem da idade', 'Valor', 'Acima do piso', 'Perto de prescrever', 'Situação do CNPJ', 'Protestável'], linhas: fotoDivida },
    { arquivo: 'categorias-protesto.csv', cabecalho: ['Categoria', 'Fator por milhão', 'Ordem'], linhas: PROTESTOS.map(([nome, fator], i) => [nome, Math.round(fator * 1e6), i + 1]) },
    { arquivo: 'foto-adimplencia.csv', cabecalho: ['Data', 'Código IBGE', 'Ativos', 'Em atraso'], linhas: adimplencia },
  ];
}
