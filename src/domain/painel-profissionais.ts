import type { Dataset } from './types';
import { modalidades } from './entidades';
import type { Modalidade } from './entidades';
import { tituloPorCodigo } from './titulos';
import { addDays, share, sum } from './hash';
import { adimplenteEm, cbos, fatorGenero, faixaIdade, faixasIdade, idadeEm, noRecorte, rtDoVinculo, situacaoEm } from './profissionais';
import type { EmpregoCbo, FiltroProfissional, Genero, ModeloProfissionais, Profissional, SituacaoProfissional } from './profissionais';

/**
 * Medidas do painel de Profissionais (separado do painel geral em 03/11/2026). Tudo é lido na data de referência (a base como
 * estava naquele dia) e respeita o recorte do alto da tela: regional, município do endereço e modalidade. O emprego formal sai em
 * totais por regional e ocupação (Novo CAGED e RAIS); com um município escolhido, a série é a da regional dele.
 */
const mesInicio = (date: string, months: number) => { const d = new Date(`${date.slice(0, 7)}-01T00:00:00Z`); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1)).toISOString().slice(0, 10); };
/** Os `n` meses (AAAA-MM) que terminam no mês da data. */
export const ultimosMeses = (anchor: string, n: number) => Array.from({ length: n }, (_, index) => mesInicio(anchor, index - n + 1).slice(0, 7));
/** Primeiro dia do período de `period` meses que termina na data, e o dia anterior a ele. */
export const inicioPeriodo = (anchor: string, period: number) => mesInicio(anchor, -(period - 1));
const dentroDe = (date: string | undefined, start: string, end: string) => Boolean(date && date >= start && date <= end);

/** ARTs do período por autor, com o autor no recorte. */
function artsPorAutor(modelo: ModeloProfissionais, dataset: Dataset, start: string, end: string) {
  const porAutor = new Map<string, number>();
  for (const art of dataset.arts) if (dentroDe(art.date, start, end)) { const autor = modelo.autoria.get(art.id); if (autor) porAutor.set(autor, (porAutor.get(autor) ?? 0) + 1); }
  return porAutor;
}

/* ---------- Mapa: uma linha por regional e uma por município, no estado inteiro (o mapa mostra todos e aproxima do escolhido) ---------- */
export interface MedidasProfissionais {
  ativos: Profissional[]; antes: number; variacao: number | null; novos: Profissional[]; novosPorCem: number | null;
  inadimplentes: Profissional[]; inadimplencia: number | null; mulheres: number | null; sessenta: Profissional[]; sessentaParte: number | null;
  arts: number; artsPorCem: number | null; semArt: Profissional[]; semArtParte: number | null; rts: Profissional[]; rtPorCem: number | null;
}
export interface RegionalProfissionais extends MedidasProfissionais { id: string; name: string; curto: string }
export interface MunicipioProfissionais extends MedidasProfissionais { id: string; nome: string; greId: string }
/** Abaixo deste número de ativos, as partes e taxas do município ficam vazias ("poucos dados"): poucas pessoas fazem a porcentagem pular. */
export const MINIMO_MUNICIPIO = 20;
export function regionaisProfissionais(modelo: ModeloProfissionais, dataset: Dataset, period: number, filtro: FiltroProfissional = {}) {
  const anchor = dataset.snapshotDate, start = inicioPeriodo(anchor, period), umAnoAntes = addDays(anchor, -365);
  const doRecorte = modelo.profissionais.filter(row => noRecorte(row, null, { modalidade: filtro.modalidade, genero: filtro.genero }) && row.registroEm <= anchor);
  const porAutor = artsPorAutor(modelo, dataset, start, anchor), rts = new Set(dataset.technicalLinks.filter(row => row.startDate <= anchor && (!row.endDate || row.endDate > anchor)).map(row => rtDoVinculo(modelo, row)));
  const medidas = (mine: Profissional[], minimo: number): MedidasProfissionais => {
    const ativos = mine.filter(row => situacaoEm(row, anchor) === 'Ativo'), n = ativos.length, conta = n >= minimo;
    const antes = mine.filter(row => row.registroEm <= umAnoAntes && situacaoEm(row, umAnoAntes) === 'Ativo').length, novos = mine.filter(row => dentroDe(row.registroEm, start, anchor));
    const inadimplentes = ativos.filter(row => !adimplenteEm(row, anchor)), sessenta = ativos.filter(row => idadeEm(row, anchor) >= 60), semArt = ativos.filter(row => !porAutor.get(row.id));
    const arts = sum(ativos.map(row => porAutor.get(row.id) ?? 0)), comRt = ativos.filter(row => rts.has(row.id)), parte = (k: number) => conta ? share(k, n) : null, porCem = (k: number) => conta && n ? k / n * 100 : null;
    return { ativos, antes, variacao: antes >= minimo && antes ? (n - antes) / antes * 100 : null, novos, novosPorCem: porCem(novos.length),
      inadimplentes, inadimplencia: parte(inadimplentes.length), mulheres: parte(ativos.filter(row => row.genero === 'Feminino').length), sessenta, sessentaParte: parte(sessenta.length),
      arts, artsPorCem: porCem(arts), semArt, semArtParte: parte(semArt.length), rts: comRt, rtPorCem: porCem(comRt.length) };
  };
  const linhas: RegionalProfissionais[] = dataset.gres.map(gre => ({ id: gre.id, name: gre.name, curto: gre.name, ...medidas(doRecorte.filter(row => row.greId === gre.id), 1) }));
  const porCidade = new Map<string, Profissional[]>();
  for (const row of doRecorte) porCidade.set(row.cityId, [...(porCidade.get(row.cityId) ?? []), row]);
  const municipios = new Map<string, MunicipioProfissionais>(dataset.cities.map(city => [city.id, { id: city.id, nome: city.name, greId: city.greId, ...medidas(porCidade.get(city.id) ?? [], MINIMO_MUNICIPIO) }]));
  const cidades = new Map([...municipios].map(([id, row]) => [id, row.ativos.length]));
  return { linhas, municipios, cidades };
}

/* ---------- Situação no início do período e na data escolhida: só o que mudou ---------- */
export type Estado = SituacaoProfissional | 'Sem registro';
export interface Transicao { de: Estado; para: SituacaoProfissional; ids: string[] }
export function transicoes(modelo: ModeloProfissionais, dataset: Dataset, period: number, greId: string | null, filtro: FiltroProfissional = {}) {
  const anchor = dataset.snapshotDate, antes = addDays(inicioPeriodo(anchor, period), -1), mapa = new Map<string, Transicao>();
  for (const row of modelo.profissionais) {
    if (!noRecorte(row, greId, filtro) || row.registroEm > anchor) continue;
    const de: Estado = situacaoEm(row, antes) ?? 'Sem registro', para = situacaoEm(row, anchor)!;
    if (de === para) continue;
    const key = `${de}|${para}`, item = mapa.get(key) ?? { de, para, ids: [] };
    item.ids.push(row.id); mapa.set(key, item);
  }
  return { antes, fluxos: [...mapa.values()].sort((a, b) => b.ids.length - a.ids.length) };
}

/** Ativos no dia anterior ao início do período: o ponto de partida da ponte e do saldo. */
export function ativosNoInicio(modelo: ModeloProfissionais, dataset: Dataset, period: number, greId: string | null, filtro: FiltroProfissional = {}) {
  const antes = addDays(inicioPeriodo(dataset.snapshotDate, period), -1);
  return { antes, ativos: modelo.profissionais.filter(row => noRecorte(row, greId, filtro) && situacaoEm(row, antes) === 'Ativo') };
}

/* ---------- Entradas e saídas mês a mês ---------- */
export interface MesFluxo { month: string; novos: string[]; cancelamentos: string[]; interrupcoes: string[]; reativacoes: string[] }
export function fluxoMensal(modelo: ModeloProfissionais, dataset: Dataset, greId: string | null, filtro: FiltroProfissional = {}, n = 24): MesFluxo[] {
  const anchor = dataset.snapshotDate, meses = ultimosMeses(anchor, n), porMes = new Map(meses.map(month => [month, { month, novos: [] as string[], cancelamentos: [] as string[], interrupcoes: [] as string[], reativacoes: [] as string[] }]));
  const marca = (date: string | undefined, campo: 'novos' | 'cancelamentos' | 'interrupcoes' | 'reativacoes', id: string) => { if (!date || date > anchor) return; porMes.get(date.slice(0, 7))?.[campo].push(id); };
  for (const row of modelo.profissionais) {
    if (!noRecorte(row, greId, filtro)) continue;
    marca(row.registroEm, 'novos', row.id); marca(row.canceladoEm, 'cancelamentos', row.id);
    for (const item of row.interrupcoes) { marca(item.inicio, 'interrupcoes', row.id); marca(item.fim, 'reativacoes', row.id); }
  }
  return [...porMes.values()];
}

/** Registros novos por modalidade e mês: uma linha por modalidade com registro no intervalo. */
export function novosPorModalidade(modelo: ModeloProfissionais, dataset: Dataset, greId: string | null, filtro: FiltroProfissional = {}, n = 24) {
  const anchor = dataset.snapshotDate, meses = ultimosMeses(anchor, n), inicio = `${meses[0]}-01`;
  const linhas = modalidades.map(modalidade => { const porMes = new Map<string, Profissional[]>();
    for (const row of modelo.profissionais) if (row.modalidade === modalidade && noRecorte(row, greId, filtro) && dentroDe(row.registroEm, inicio, anchor)) { const month = row.registroEm.slice(0, 7); porMes.set(month, [...(porMes.get(month) ?? []), row]); }
    return { modalidade, porMes, total: sum([...porMes.values()].map(rows => rows.length)) }; }).filter(row => row.total > 0);
  return { meses, linhas };
}

/** Por ano de registro (os últimos 15 anos): quantos se registraram e quantos continuam ativos na data escolhida. */
export function permanenciaPorAno(modelo: ModeloProfissionais, dataset: Dataset, greId: string | null, filtro: FiltroProfissional = {}, anos = 15) {
  const anchor = dataset.snapshotDate, ultimo = Number(anchor.slice(0, 4));
  return Array.from({ length: anos }, (_, index) => ultimo - anos + 1 + index).map(ano => {
    const rows = modelo.profissionais.filter(row => row.registroEm.startsWith(String(ano)) && row.registroEm <= anchor && noRecorte(row, greId, filtro));
    const ativos = rows.filter(row => situacaoEm(row, anchor) === 'Ativo'), fora = rows.filter(row => situacaoEm(row, anchor) !== 'Ativo');
    return { ano, registrados: rows, ativos, fora, parte: share(ativos.length, rows.length) };
  });
}

/* ---------- Atuação: ART por idade e modalidade, e ARTs mês a mês por modalidade ---------- */
/** Parte dos ativos que registrou ao menos uma ART no período, por modalidade e faixa de idade. Modalidades sem nenhuma ART no período ficam de fora. */
export function artPorIdade(modelo: ModeloProfissionais, dataset: Dataset, ativos: Profissional[], period: number) {
  const anchor = dataset.snapshotDate, porAutor = artsPorAutor(modelo, dataset, inicioPeriodo(anchor, period), anchor);
  const celulas: { modalidade: Modalidade; faixa: number; ativos: Profissional[]; comArt: Profissional[]; parte: number | null }[] = [];
  const comAlguma = new Set(ativos.filter(row => porAutor.get(row.id)).map(row => row.modalidade));
  const linhas = modalidades.filter(modalidade => comAlguma.has(modalidade));
  linhas.forEach(modalidade => faixasIdade.forEach((faixa, index) => {
    const rows = ativos.filter(row => row.modalidade === modalidade && faixaIdade(idadeEm(row, anchor)) === faixa), comArt = rows.filter(row => porAutor.get(row.id));
    celulas.push({ modalidade, faixa: index, ativos: rows, comArt, parte: share(comArt.length, rows.length) });
  }));
  const porFaixa = faixasIdade.map((faixa, index) => { const rows = celulas.filter(row => row.faixa === index); const n = sum(rows.map(row => row.ativos.length)), c = sum(rows.map(row => row.comArt.length)); return { faixa, ativos: n, comArt: c, parte: share(c, n) }; });
  return { linhas, celulas, porFaixa };
}
export function artsMensaisPorModalidade(modelo: ModeloProfissionais, dataset: Dataset, greId: string | null, filtro: FiltroProfissional = {}, n = 24) {
  const anchor = dataset.snapshotDate, meses = ultimosMeses(anchor, n), inicio = `${meses[0]}-01`, contagem = new Map<string, Map<string, number>>();
  for (const art of dataset.arts) {
    if (!dentroDe(art.date, inicio, anchor)) continue;
    const autor = modelo.porId.get(modelo.autoria.get(art.id) ?? ''); if (!autor || !noRecorte(autor, greId, filtro)) continue;
    const linha = contagem.get(autor.modalidade) ?? new Map<string, number>(); linha.set(art.date.slice(0, 7), (linha.get(art.date.slice(0, 7)) ?? 0) + 1); contagem.set(autor.modalidade, linha);
  }
  const series = modalidades.filter(modalidade => contagem.has(modalidade)).map(modalidade => ({ modalidade, valores: meses.map(month => contagem.get(modalidade)?.get(month) ?? 0) }));
  const anoAntes = meses.map((_, index) => index >= 12 ? sum(series.map(row => row.valores[index - 12])) : null);
  return { meses, series, anoAntes };
}

/* ---------- Emprego formal em totais (Novo CAGED e RAIS) ---------- */
/** Ocupações do recorte: as de engenharia; com uma modalidade escolhida, só as daquela modalidade. */
export const ocupacoesDo = (modalidade: string | null) => cbos.filter(row => row.engenharia && (!modalidade || row.modalidade === modalidade));
/** Mês a mês, até a data: estoque de empregos com carteira, admissões e desligamentos nas ocupações de engenharia do recorte. */
export function empregoMensal(emprego: EmpregoCbo[], anchor: string, greId: string | null, modalidade: string | null, genero: Genero | null = null) {
  const parte = new Map(ocupacoesDo(modalidade).map(row => [row.cbo, fatorGenero(row, genero).quantidade])), mes = anchor.slice(0, 7), porMes = new Map<string, { month: string; estoque: number; admissoes: number; desligamentos: number }>();
  for (const row of emprego) {
    const f = parte.get(row.cbo);
    if (f === undefined || row.month > mes || (greId && row.greId !== greId)) continue;
    const item = porMes.get(row.month) ?? { month: row.month, estoque: 0, admissoes: 0, desligamentos: 0 };
    item.estoque += row.estoque * f; item.admissoes += row.admissoes * f; item.desligamentos += row.desligamentos * f; porMes.set(row.month, item);
  }
  return [...porMes.values()].sort((a, b) => a.month.localeCompare(b.month)).map(row => { const estoque = Math.round(row.estoque), admissoes = Math.round(row.admissoes), desligamentos = Math.round(row.desligamentos); return { month: row.month, estoque, admissoes, desligamentos, saldo: admissoes - desligamentos }; });
}
/** Regional por ocupação: saldo de contratações nos 12 meses até o último mês disponível e o estoque nesse mês. */
export function empregoRegionalOcupacao(emprego: EmpregoCbo[], dataset: Dataset, anchor: string, modalidade: string | null, genero: Genero | null = null) {
  const ocupacoes = ocupacoesDo(modalidade), mes = anchor.slice(0, 7), validos = emprego.filter(row => row.month <= mes);
  const ultimo = validos.reduce((latest, row) => row.month > latest ? row.month : latest, ''), inicio = mesInicio(`${ultimo}-01`, -11).slice(0, 7);
  const celulas = dataset.gres.flatMap((gre, y) => ocupacoes.map((info, x) => { const rows = validos.filter(row => row.greId === gre.id && row.cbo === info.cbo);
    const f = fatorGenero(info, genero).quantidade;
    return { x, y, greId: gre.id, cbo: info.cbo, saldo: Math.round(sum(rows.filter(row => row.month >= inicio).map(row => row.admissoes - row.desligamentos)) * f), estoque: Math.round((rows.find(row => row.month === ultimo)?.estoque ?? 0) * f) }; }));
  return { ocupacoes, gres: dataset.gres, celulas, ultimo };
}

/* ---------- Modalidade, nível e título profissional dos ativos, com a variação em relação a um ano antes ---------- */
export interface CelulaTitulo { codigo: string; titulo: string; ativos: Profissional[]; antes: number; variacao: number | null }
export interface CelulaNivel { modalidade: Modalidade; nivel: string; ativos: Profissional[]; antes: number; variacao: number | null; titulos: CelulaTitulo[] }
export function modalidadeNivel(modelo: ModeloProfissionais, dataset: Dataset, greId: string | null, filtro: FiltroProfissional = {}) {
  const anchor = dataset.snapshotDate, umAnoAntes = addDays(anchor, -365), celulas = new Map<string, { modalidade: Modalidade; nivel: string; ativos: Profissional[]; antes: number; titulos: Map<string, { ativos: Profissional[]; antes: number }> }>();
  for (const row of modelo.profissionais) {
    if (!noRecorte(row, greId, filtro) || row.registroEm > anchor) continue;
    const key = `${row.modalidade}|${row.nivel}`, item = celulas.get(key) ?? { modalidade: row.modalidade, nivel: row.nivel, ativos: [] as Profissional[], antes: 0, titulos: new Map<string, { ativos: Profissional[]; antes: number }>() };
    const titulo = item.titulos.get(row.titulo) ?? { ativos: [] as Profissional[], antes: 0 };
    if (situacaoEm(row, anchor) === 'Ativo') { item.ativos.push(row); titulo.ativos.push(row); }
    if (row.registroEm <= umAnoAntes && situacaoEm(row, umAnoAntes) === 'Ativo') { item.antes += 1; titulo.antes += 1; }
    item.titulos.set(row.titulo, titulo); celulas.set(key, item);
  }
  const variacao = (agora: number, antes: number) => antes ? (agora - antes) / antes * 100 : null;
  return modalidades.map(modalidade => { const filhos = [...celulas.values()].filter(row => row.modalidade === modalidade && row.ativos.length);
    const niveis: CelulaNivel[] = filhos.map(row => ({ modalidade: row.modalidade, nivel: row.nivel, ativos: row.ativos, antes: row.antes, variacao: variacao(row.ativos.length, row.antes),
      titulos: [...row.titulos].filter(([, t]) => t.ativos.length).map(([codigo, t]) => ({ codigo, titulo: tituloPorCodigo.get(codigo)?.titulo ?? codigo, ativos: t.ativos, antes: t.antes, variacao: variacao(t.ativos.length, t.antes) })).sort((x, y) => y.ativos.length - x.ativos.length) }));
    return { modalidade, ativos: sum(filhos.map(row => row.ativos.length)), antes: sum(filhos.map(row => row.antes)), niveis }; })
    .filter(row => row.ativos > 0).sort((a, b) => b.ativos - a.ativos);
}
