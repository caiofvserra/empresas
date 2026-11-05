/**
 * Evolução mês a mês de um indicador (05/11/2026, pedido do Caio a partir de um painel de referência).
 *
 * Onde cada comparação fica: o cartão mostra o número e uma variação só, contra um ano antes (a que não se engana com a
 * sazonalidade). Ao clicar no cartão, o painel lateral abre com a evolução dos últimos 12 meses ao lado dos mesmos meses um ano
 * antes e três comparações: contra o mês anterior, contra o mesmo mês um ano antes e no acumulado do ano. Um quadro fixo que troca
 * de gráfico ao clicar (como no painel de referência) não cabe na regra de tela única sem rolagem.
 *
 * Fluxo é o que acontece no mês (registros novos, ações, autos) e soma no acumulado. Estoque é a situação no último dia do mês
 * (profissionais ativos) e taxa é uma parte em % (anuidade em dia); nesses dois, o "acumulado do ano" é a mudança desde dezembro.
 */
export type TipoSerie = 'fluxo' | 'estoque' | 'taxa';
export interface Evolucao {
  tipo: TipoSerie;
  /** Meses em ordem ('AAAA-MM'), o último é o mês da data escolhida no alto da tela; 24 meses ou mais. */
  meses: string[];
  valores: (number | null)[];
  /** Formato do valor nas comparações; `curto` é o rótulo do gráfico (cai para `fmt`). */
  fmt: (value: number) => string; curto?: (value: number) => string;
  /** Unidade dos rótulos curtos do gráfico, quando eles não a trazem ("em R$ mil"). */
  unidade?: string;
  /** Nome do indicador (o rótulo do cartão), escrito no título da seção. */
  nome?: string;
  /** Alta é boa? (cancelamentos e autos, não). */
  goodUp?: boolean;
}
export interface Comparacao { titulo: string; agora: number | null; antes: number | null; quando: string; contra: string; variacao: number | null; kind: 'pct' | 'pp' }

const nomesMes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
/** 'AAAA-MM' por extenso curto: "out/2026". */
export const mesAno = (month: string) => `${nomesMes[Number(month.slice(5, 7)) - 1]}/${month.slice(0, 4)}`;
const soma = (values: (number | null)[]) => values.some(value => value === null) ? null : values.reduce<number>((total, value) => total + value!, 0);
export const variacaoDe = (agora: number | null, antes: number | null, kind: 'pct' | 'pp') => agora === null || antes === null ? null : kind === 'pp' ? agora - antes : antes > 0 ? (agora - antes) / antes * 100 : null;
const kindDe = (serie: Evolucao) => serie.tipo === 'taxa' ? 'pp' as const : 'pct' as const;

/** As três comparações do painel lateral. */
export function comparacoes(serie: Evolucao): Comparacao[] {
  const { meses, valores } = serie, ultimo = meses.length - 1, kind = kindDe(serie), mes = meses[ultimo], ano = mes.slice(0, 4);
  const valor = (index: number) => index >= 0 ? valores[index] ?? null : null;
  const item = (titulo: string, agora: number | null, antes: number | null, quando: string, contra: string): Comparacao => ({ titulo, agora, antes, quando, contra, kind, variacao: variacaoDe(agora, antes, kind) });
  const out = [item('Contra o mês anterior', valor(ultimo), valor(ultimo - 1), mesAno(mes), ultimo > 0 ? mesAno(meses[ultimo - 1]) : '—'),
    item('Contra um ano antes', valor(ultimo), valor(ultimo - 12), mesAno(mes), ultimo >= 12 ? mesAno(meses[ultimo - 12]) : '—')];
  if (serie.tipo === 'fluxo') {
    const doAno = meses.map((month, index) => month.startsWith(ano) ? index : -1).filter(index => index >= 0);
    const antes = doAno[0] - 12 >= 0 ? soma(doAno.map(index => valores[index - 12])) : null;
    const trecho = (year: string) => doAno.length > 1 ? `jan a ${mesAno(mes).replace(ano, year)}` : mesAno(mes).replace(ano, year);
    out.push(item('No acumulado do ano', soma(doAno.map(index => valores[index])), antes, trecho(ano), trecho(String(Number(ano) - 1))));
  } else {
    // Estoque e taxa não somam: o acumulado do ano é a mudança desde o fim de dezembro.
    const dezembro = meses.indexOf(`${Number(ano) - 1}-12`);
    out.push(item('Desde dezembro', valor(ultimo), dezembro >= 0 ? valor(dezembro) : null, mesAno(mes), dezembro >= 0 ? mesAno(meses[dezembro]) : '—'));
  }
  return out;
}

/**
 * Variação do cartão contra um ano antes, para cartões que ainda não tinham uma. No fluxo, soma os `period` meses até a data
 * escolhida e compara com os mesmos meses um ano antes (o que o cartão mostra); no estoque e na taxa, compara o último mês.
 */
export function variacaoAnual(serie: Evolucao, period: number): { value: number | null; kind: 'pct' | 'pp' } {
  const { valores } = serie, ultimo = valores.length - 1, kind = kindDe(serie);
  if (serie.tipo !== 'fluxo') return { value: ultimo >= 12 ? variacaoDe(valores[ultimo], valores[ultimo - 12], kind) : null, kind };
  if (ultimo - 12 - period + 1 < 0) return { value: null, kind };
  return { value: variacaoDe(soma(valores.slice(ultimo - period + 1)), soma(valores.slice(ultimo - 12 - period + 1, ultimo - 12 + 1)), kind), kind };
}

/*
 * O cartão sabe a série; quem abre o painel lateral é a página (onOpen). Para não mudar cada página, o cartão marca a série
 * enquanto chama onOpen, e o `open` do cockpit anexa a série marcada ao detalhe que está sendo aberto.
 */
let pendente: Evolucao | null = null;
export function abrirComEvolucao(serie: Evolucao, abrir: () => void) { pendente = serie; try { abrir(); } finally { pendente = null; } }
export function anexarEvolucao<T extends { evolucao?: Evolucao }>(detail: T): T { return pendente && !detail.evolucao ? { ...detail, evolucao: pendente } : detail; }
