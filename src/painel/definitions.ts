import { dataset } from '../domain/dataset';
import type { AreaRow, IndicatorId } from './metrics';
import { brl } from './metrics';

/** Definições: o que é, por que importa, o que fazer. */
export const info: Record<IndicatorId, { label: string; short: string; what: string; action: string; list: string; column: (row: AreaRow) => number | null; format: (value: number) => string; higherIsWorse: boolean }> = {
  base: { label: 'Empresas com registro ativo', short: 'Empresas ativas', what: 'Empresas (CNPJ raiz) com registro vigente no CREA-SP no fim do período.', action: 'Entender por que empresas saíram e contatar as que ainda operam.', list: 'Empresas que saíram do registro no período', column: row => row.active, format: value => value.toLocaleString('pt-BR'), higherIsWorse: false },
  receipts: { label: 'Arrecadação de empresas', short: 'Arrecadação', what: 'Pagamentos efetivos de pessoas jurídicas no período, incluindo dívida recuperada.', action: 'Comparar com o mesmo período do ano anterior e localizar regionais em queda.', list: 'Maiores pagadores no período', column: row => row.receipts, format: brl, higherIsWorse: false },
  debt: { label: 'Saldo vencido de empresas', short: 'Inadimplência', what: 'Valor em aberto de obrigações já vencidas, no corte. O percentual é a parcela de empresas cobradas com algum atraso.', action: 'Priorizar cobrança pelos maiores saldos e pelos atrasos mais antigos.', list: 'Maiores devedores', column: row => row.defaultRate, format: value => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`, higherIsWorse: true },
  gap: { label: 'CNPJs sem registro', short: 'Sem registro', what: 'CNPJs ativos na Receita, com CNAE de engenharia, sem registro vigente no CREA-SP (nunca registrados ou com registro inativo).', action: 'Base para fiscalização e orientação ao registro. CNAE não prova obrigação: confirmar a atividade.', list: 'CNPJs sem registro, mais recentes primeiro', column: row => row.gap, format: value => value.toLocaleString('pt-BR'), higherIsWorse: true },
  noRt: { label: 'Empresas sem responsável técnico', short: 'Sem RT', what: 'Empresas com registro ativo sem vínculo de responsável técnico identificado no corte.', action: 'Notificar para indicação de RT; conferir antes se o vínculo não está só desatualizado no cadastro.', list: 'Empresas ativas sem RT, há mais tempo primeiro', column: row => row.noRt, format: value => value.toLocaleString('pt-BR'), higherIsWorse: true },
  cases: { label: 'Fiscalizações em aberto', short: 'Fiscalização', what: 'Casos de fiscalização de empresas ainda não concluídos.', action: 'Atacar os casos mais antigos e a etapa onde a fila acumula.', list: 'Casos abertos, mais antigos primeiro', column: row => row.openCases, format: value => value.toLocaleString('pt-BR'), higherIsWorse: true },
};
export const order: IndicatorId[] = ['base', 'receipts', 'debt', 'gap', 'noRt', 'cases'];
export const sizes = ['Microempresa', 'Pequena empresa', 'Média empresa', 'Grande empresa'];
export const short = (name: string) => name.split('·')[1]?.trim() ?? name;
export const pct = (value: number, digits = 1) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: digits })}%`;
export const monthLabel = (value: string) => new Date(`${value}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '');
export const cut = new Date(`${dataset.snapshotDate}T12:00:00Z`).toLocaleDateString('pt-BR');
