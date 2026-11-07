// Regras de escrita dos números que valem para todos os painéis.

/**
 * A variação que arredonda para zero fica neutra (07/11/2026): "+0%" em vermelho, com seta de queda, assustava sem motivo.
 * Porcentagem aparece sem casa decimal e ponto percentual com uma.
 */
export const variacaoPlana = (value: number, kind: 'pct' | 'pp') => kind === 'pp' ? Math.abs(value) < 0.05 : Math.abs(value) < 0.5;

/** Trimestre escrito do mesmo jeito em todo o painel (07/11/2026): "2024-T4" vira "4º tri/24", como no mapa de calor. */
export const rotuloTrimestre = (chave: string) => `${chave.slice(6)}º tri/${chave.slice(2, 4)}`;
