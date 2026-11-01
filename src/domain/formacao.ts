import type { Dataset } from './types';
import { buildEntidades } from './entidades';
import type { Modalidade, Organizacao } from './entidades';
import { modalidades } from './entidades';
import { addDays, between, chance, share, sum } from './hash';
import { adimplenteEm, buildProfissionais, situacaoEm } from './profissionais';
import type { ModeloProfissionais, Profissional } from './profissionais';

/**
 * V20 · Formação e ingresso: concluintes por IES, ano, modalidade e canal (presencial ou EaD) contra os registros novos no Crea-SP,
 * por coorte de conclusão. Camada DEMONSTRATIVA (INEP fictício por IES, consistente com os profissionais do cenário).
 * Em produção: Censo da Educação Superior (INEP, carga anual, microdados por curso e IES) × cadastro profissional (IES e ano de conclusão informados no registro).
 */
export type Canal = 'Presencial' | 'EaD';
export interface Concluintes { iesId: string; ano: number; modalidade: Modalidade; canal: Canal; concluintes: number }
export interface Formacao { concluintes: Concluintes[]; anos: number[]; ies: Organizacao[]; anchor: string }

const cache = new WeakMap<Dataset, Formacao>();
/** Concluintes derivados dos registrados: cada IES tem uma taxa de registro própria (pública maior, EaD menor), então concluintes = registrados ÷ taxa. */
export function buildFormacao(dataset: Dataset): Formacao {
  const saved = cache.get(dataset); if (saved) return saved;
  const ies = buildEntidades(dataset).organizacoes.filter(row => row.grupo === 'IES'), profissionais = buildProfissionais(dataset).profissionais;
  const anos = Array.from({ length: 10 }, (_, index) => 2016 + index);
  const concluintes: Concluintes[] = [];
  for (const escola of ies) for (const ano of anos) for (const modalidade of escola.modalidades) {
    const registrados = profissionais.filter(row => row.iesId === escola.id && row.anoConclusao === ano && row.modalidade === modalidade).length;
    const taxaBase = escola.natureza === 'Pública' ? 0.58 : 0.42, ead = (escola.ead ?? 0) / 100;
    const key = `conc:${escola.id}:${ano}:${modalidade}`;
    const totalEstimado = Math.max(registrados, Math.round(registrados / (taxaBase * (1 - ead * 0.45) * (0.85 + chance(key) * 0.3))) + between(`${key}:extra`, 0, 2));
    const eadParte = Math.round(totalEstimado * ead * (0.8 + chance(`${key}:ead`) * 0.4));
    if (totalEstimado - eadParte > 0) concluintes.push({ iesId: escola.id, ano, modalidade, canal: 'Presencial', concluintes: totalEstimado - eadParte });
    if (eadParte > 0) concluintes.push({ iesId: escola.id, ano, modalidade, canal: 'EaD', concluintes: eadParte });
  }
  const value = { concluintes, anos, ies, anchor: dataset.snapshotDate };
  cache.set(dataset, value); return value;
}

/* ---------- Coortes: concluintes do ano → registrados → com atividade → ativos e adimplentes ---------- */
export interface Coorte {
  ano: number; concluintes: number; registrados: Profissional[]; registradosEm24: Profissional[]; comAtividade: Profissional[]; ativosAdimplentes: Profissional[];
  taxaRegistro: number | null; taxaRegistro24: number | null; taxaAtividade: number | null; taxaPermanencia: number | null;
  /** A coorte só fecha quando D já passou 24 meses do fim do ano de conclusão (registro) ou 48 meses (atividade e permanência). */
  fechada24: boolean; fechada48: boolean;
}
export interface LinhaIes { ies: Organizacao; concluintes: number; registrados: number; taxa: number | null; ead: number | null; cadeiras: number }
export interface QuadroFormacao {
  coortes: Coorte[]; porIes: LinhaIes[]; porModalidade: { modalidade: Modalidade; concluintes: number; registrados: number; taxa: number | null }[];
  porCanal: { canal: Canal; concluintes: number; registrados: number; taxa: number | null }[];
  porNatureza: { natureza: string; concluintes: number; registrados: number; taxa: number | null; ead: number | null }[];
  serie: { ano: number; presencial: number; ead: number; registrados: number }[]; anosFechados: number[];
}
/** Tudo lido em D: registros e atividade posteriores a D não existem ainda. Atividade = ao menos uma ART como autor em 24 meses do registro. */
export function quadroFormacao(formacao: Formacao, modelo: ModeloProfissionais, dataset: Dataset, greId: string | null): QuadroFormacao {
  const anchor = dataset.snapshotDate, iesPorId = new Map(formacao.ies.map(row => [row.id, row]));
  const escolas = formacao.ies.filter(row => !greId || row.greId === greId), escolaIds = new Set(escolas.map(row => row.id));
  const conc = formacao.concluintes.filter(row => escolaIds.has(row.iesId) && `${row.ano}-12-31` <= anchor);
  const profs = modelo.profissionais.filter(row => escolaIds.has(row.iesId) && row.registroEm <= anchor);
  const artsPorAutor = new Map<string, string[]>();
  for (const art of dataset.arts) { const autor = modelo.autoria.get(art.id); if (autor) artsPorAutor.set(autor, [...(artsPorAutor.get(autor) ?? []), art.date]); }
  const comAtividade = (row: Profissional) => (artsPorAutor.get(row.id) ?? []).some(date => date > row.registroEm && date <= addDays(row.registroEm, 730) && date <= anchor);
  const anos = [...new Set(conc.map(row => row.ano))].sort();
  const coortes: Coorte[] = anos.map(ano => {
    const total = sum(conc.filter(row => row.ano === ano).map(row => row.concluintes)), registrados = profs.filter(row => row.anoConclusao === ano);
    const em24 = registrados.filter(row => row.registroEm <= `${ano + 2}-12-31`);
    const atividade = em24.filter(comAtividade), fechada24 = `${ano + 2}-12-31` <= anchor, fechada48 = `${ano + 4}-12-31` <= anchor;
    const permanencia = em24.filter(row => { const marco = addDays(row.registroEm, 730); return marco <= anchor && situacaoEm(row, marco) === 'Ativo' && adimplenteEm(row, marco); });
    return { ano, concluintes: total, registrados, registradosEm24: em24, comAtividade: atividade, ativosAdimplentes: permanencia,
      taxaRegistro: share(registrados.length, total), taxaRegistro24: share(em24.length, total), taxaAtividade: share(atividade.length, em24.length), taxaPermanencia: share(permanencia.length, em24.length), fechada24, fechada48 };
  });
  const fechados = coortes.filter(row => row.fechada24).map(row => row.ano), setFechados = new Set(fechados);
  const concF = conc.filter(row => setFechados.has(row.ano)), profsF = profs.filter(row => setFechados.has(row.anoConclusao) && row.registroEm <= `${row.anoConclusao + 2}-12-31`);
  const linha = <T>(items: T[], concDe: (item: T) => Concluintes[], profDe: (item: T) => Profissional[]) => items.map(item => { const c = sum(concDe(item).map(row => row.concluintes)), r = profDe(item).length; return { item, concluintes: c, registrados: r, taxa: share(r, c) }; });
  const porIes: LinhaIes[] = linha(escolas, escola => concF.filter(row => row.iesId === escola.id), escola => profsF.filter(row => row.iesId === escola.id))
    .map(row => ({ ies: row.item, concluintes: row.concluintes, registrados: row.registrados, taxa: row.taxa, ead: row.item.ead, cadeiras: row.item.cadeiras })).filter(row => row.concluintes).sort((a, b) => b.concluintes - a.concluintes);
  const porModalidade = linha(modalidades, modalidade => concF.filter(row => row.modalidade === modalidade), modalidade => profsF.filter(row => row.modalidade === modalidade)).map(row => ({ modalidade: row.item, concluintes: row.concluintes, registrados: row.registrados, taxa: row.taxa })).filter(row => row.concluintes);
  // Canal do registrado: o cenário não guarda o canal por pessoa; atribui-se pela parte EaD da IES (demonstrativo, declarado na ficha).
  const canalDe = (row: Profissional): Canal => chance(`canal:${row.id}`) * 100 < (iesPorId.get(row.iesId)?.ead ?? 0) ? 'EaD' : 'Presencial';
  const porCanal = linha(['Presencial', 'EaD'] as Canal[], canal => concF.filter(row => row.canal === canal), canal => profsF.filter(row => canalDe(row) === canal)).map(row => ({ canal: row.item, concluintes: row.concluintes, registrados: row.registrados, taxa: row.taxa }));
  const porNatureza = linha(['Pública', 'Privada'], natureza => concF.filter(row => iesPorId.get(row.iesId)?.natureza === natureza), natureza => profsF.filter(row => iesPorId.get(row.iesId)?.natureza === natureza))
    .map(row => { const mine = escolas.filter(escola => escola.natureza === row.item); return { natureza: row.item, concluintes: row.concluintes, registrados: row.registrados, taxa: row.taxa, ead: mine.length ? sum(mine.map(escola => escola.ead ?? 0)) / mine.length : null }; });
  const serie = anos.map(ano => ({ ano, presencial: sum(conc.filter(row => row.ano === ano && row.canal === 'Presencial').map(row => row.concluintes)), ead: sum(conc.filter(row => row.ano === ano && row.canal === 'EaD').map(row => row.concluintes)), registrados: profs.filter(row => row.anoConclusao === ano).length }));
  return { coortes, porIes, porModalidade, porCanal, porNatureza, serie, anosFechados: fechados };
}
