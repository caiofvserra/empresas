// Regras de escrita dos números que valem para todos os painéis.

/**
 * A variação que arredonda para zero fica neutra (07/11/2026): "+0%" em vermelho, com seta de queda, assustava sem motivo.
 * Porcentagem aparece sem casa decimal e ponto percentual com uma.
 */
export const variacaoPlana = (value: number, kind: 'pct' | 'pp') => kind === 'pp' ? Math.abs(value) < 0.05 : Math.abs(value) < 0.5;

/** Trimestre escrito do mesmo jeito em todo o painel (07/11/2026): "2024-T4" vira "4º tri/24", como no mapa de calor. */
export const rotuloTrimestre = (chave: string) => `${chave.slice(6)}º tri/${chave.slice(2, 4)}`;

/** Luminância relativa (WCAG 2) de uma cor em "#RRGGBB" ou "rgb(r, g, b)". */
const luminancia = (cor: string) => {
  const hex = cor.trim().match(/^#([0-9a-f]{6})$/i), rgb = cor.match(/(\d+(?:\.\d+)?)/g);
  const canais = hex ? [0, 2, 4].map(i => parseInt(hex[1].slice(i, i + 2), 16)) : (rgb ?? ['0', '0', '0']).slice(0, 3).map(Number);
  const [r, g, b] = canais.map(c => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const ESCURO = '#1A202C';
/**
 * Cor do rótulo escrito dentro de uma barra, célula ou fatia (07/11/2026): branco ou quase preto, o que der mais contraste com o
 * fundo. Branco fixo sobre azul-claro ou verde-menta ficava abaixo de 2:1.
 */
export const corDoTexto = (fundo: string): '#FFFFFF' | typeof ESCURO => {
  const l = luminancia(fundo), contra = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  return contra(l, 1) >= contra(l, luminancia(ESCURO)) ? '#FFFFFF' : ESCURO;
};

/**
 * Faixa de cor de cada valor num mapa de cinco faixas por posição (07/11/2026). Valores iguais ficam sempre na mesma faixa, pela
 * primeira posição que ocupam na ordem: antes, regionais empatadas caíam em faixas vizinhas e a legenda mostrava "4 a 8" e "8".
 */
export const classesPorPosto = (valores: number[], faixas = 5) => {
  const ordem = [...valores].sort((a, b) => a - b), primeira = new Map<number, number>();
  ordem.forEach((valor, index) => { if (!primeira.has(valor)) primeira.set(valor, index); });
  return valores.map(valor => Math.min(faixas - 1, Math.floor(primeira.get(valor)! / ordem.length * faixas)));
};

/** CNPJ escrito com a máscara de sempre (07/11/2026): na gaveta, os 14 dígitos corridos eram difíceis de conferir. */
export const cnpjComMascara = (valor: string) => {
  const d = valor.replace(/\D/g, '');
  return d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : valor;
};
