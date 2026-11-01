import type { Dataset } from './types';
import { between, chance, dateBetween, pick, sum, weighted } from './hash';

/**
 * V20 · Entidades de classe e instituições de ensino (IES) ligadas ao Conselho: cadeiras no plenário, convênios, repasses e contratos.
 * Camada DEMONSTRATIVA: nomes, cadeiras e valores são fictícios. Em produção: cadastro de entidades e IES registradas no Crea-SP
 * (Res. Confea 1.070/2015), composição do plenário, e os endpoints Convenios, Contratos e Pagamentos da API da Transparência (Implanta).
 */
export type Natureza = 'Pública' | 'Privada';
export type TipoEntidade = 'Sindicato' | 'Associação' | 'Instituto' | 'Federação';
export type Modalidade = 'Civil' | 'Elétrica' | 'Mecânica e metalúrgica' | 'Química' | 'Agronomia' | 'Geologia e minas' | 'Agrimensura' | 'Segurança do trabalho';
export const modalidades: Modalidade[] = ['Civil', 'Elétrica', 'Mecânica e metalúrgica', 'Química', 'Agronomia', 'Geologia e minas', 'Agrimensura', 'Segurança do trabalho'];
export type Canal = 'Convênio' | 'Contrato' | 'Patrocínio';
export const canais: Canal[] = ['Convênio', 'Contrato', 'Patrocínio'];

export interface Repasse { id: string; orgId: string; canal: Canal; objeto: string; inicio: string; fim: string; valor: number; pagamentos: { data: string; valor: number }[] }
export interface Organizacao {
  id: string; nome: string; sigla: string; grupo: 'Entidade de classe' | 'IES'; tipo: TipoEntidade | 'Universidade' | 'Centro universitário' | 'Faculdade';
  natureza: Natureza; cityId: string; greId: string; modalidades: Modalidade[];
  /** Cadeiras no plenário do Crea-SP ocupadas por conselheiros indicados pela organização (demonstrativo). */
  cadeiras: number;
  /** Só IES: parte dos concluintes em cursos a distância. */
  ead: number | null;
  registradaEm: string;
}
export interface Entidades { organizacoes: Organizacao[]; repasses: Repasse[]; anchor: string }

const nomesEntidade = ['Engenheiros do Estado', 'Agrônomos Paulistas', 'Engenharia Elétrica', 'Engenharia Mecânica', 'Segurança do Trabalho', 'Engenharia Química', 'Geólogos e Minas', 'Agrimensura', 'Engenharia Civil', 'Técnicos Industriais', 'Tecnólogos', 'Engenharia de Produção'];
const siglas = ['SEE', 'AAP', 'AEE', 'AEM', 'AEST', 'AEQ', 'AGM', 'AAG', 'AEC', 'ATI', 'ATE', 'AEP'];
const objetos: Record<Canal, string[]> = {
  Convênio: ['Cursos e palestras de atualização profissional', 'Eventos técnicos regionais', 'Programa de orientação a recém-formados', 'Apoio a semanas de engenharia'],
  Contrato: ['Locação de auditório para eventos', 'Produção de conteúdo técnico', 'Serviço de inscrição e credenciamento'],
  Patrocínio: ['Patrocínio de congresso', 'Patrocínio de feira técnica', 'Patrocínio de premiação'],
};

const cache = new WeakMap<Dataset, Entidades>();
export function buildEntidades(dataset: Dataset): Entidades {
  const saved = cache.get(dataset); if (saved) return saved;
  const anchor = dataset.snapshotDate, cities = dataset.cities;
  const organizacoes: Organizacao[] = [];
  for (let index = 0; index < 24; index++) {
    const key = `ent:${index}`, city = cities[(index * 7 + 3) % cities.length], modalidade = modalidades[index % modalidades.length];
    const tipo = weighted<TipoEntidade>(`${key}:tipo`, ['Sindicato', 'Associação', 'Instituto', 'Federação'], [3, 6, 2, 1]);
    const base = nomesEntidade[index % nomesEntidade.length];
    organizacoes.push({ id: `ENT-${String(index + 1).padStart(2, '0')}`, nome: `${tipo === 'Sindicato' ? 'Sindicato dos' : tipo === 'Associação' ? 'Associação de' : tipo === 'Instituto' ? 'Instituto de' : 'Federação de'} ${base}${index >= 12 ? ` · ${city.name}` : ''} (demonstrativo)`,
      sigla: `${siglas[index % siglas.length]}${index >= 12 ? '-' + city.name.slice(0, 3).toUpperCase() : ''}`, grupo: 'Entidade de classe', tipo, natureza: 'Privada', cityId: city.id, greId: city.greId,
      modalidades: [modalidade, ...(chance(`${key}:m2`) < 0.3 ? [pick(`${key}:m2p`, modalidades)] : [])].filter((item, position, list) => list.indexOf(item) === position),
      cadeiras: weighted(`${key}:cad`, [0, 1, 2, 3, 4, 6], [5, 8, 6, 3, 2, 1]), ead: null, registradaEm: dateBetween(`${key}:reg`, '1990-01-01', '2022-12-31') });
  }
  for (let index = 0; index < 36; index++) {
    const key = `ies:${index}`, city = cities[(index * 5 + 1) % cities.length];
    const natureza: Natureza = index % 4 === 0 ? 'Pública' : 'Privada';
    const tipo = natureza === 'Pública' ? 'Universidade' : weighted<'Universidade' | 'Centro universitário' | 'Faculdade'>(`${key}:tipo`, ['Universidade', 'Centro universitário', 'Faculdade'], [2, 4, 5]);
    const ead = natureza === 'Pública' ? between(`${key}:ead`, 0, 8) : tipo === 'Faculdade' ? between(`${key}:ead`, 10, 55) : between(`${key}:ead`, 35, 88);
    const cursos = modalidades.filter((_, position) => position === 0 || chance(`${key}:c${position}`) < (natureza === 'Pública' ? 0.6 : 0.4));
    organizacoes.push({ id: `IES-${String(index + 1).padStart(2, '0')}`, nome: `${tipo} ${natureza === 'Pública' ? 'Estadual' : 'Particular'} de ${city.name}${index >= 24 ? ' II' : ''} (demonstrativo)`,
      sigla: `${tipo === 'Universidade' ? 'U' : tipo === 'Centro universitário' ? 'CU' : 'F'}${natureza === 'Pública' ? 'E' : 'P'}-${city.name.replace(/\s.*/, '').slice(0, 3).toUpperCase()}${index >= 24 ? '2' : ''}`,
      grupo: 'IES', tipo, natureza, cityId: city.id, greId: city.greId, modalidades: cursos,
      cadeiras: natureza === 'Pública' ? weighted(`${key}:cad`, [0, 1, 2, 3], [2, 4, 3, 2]) : weighted(`${key}:cad`, [0, 1, 2, 3, 4], [8, 7, 5, 3, 2]), ead, registradaEm: dateBetween(`${key}:reg`, '1985-01-01', '2020-12-31') });
  }
  const repasses: Repasse[] = [];
  for (const org of organizacoes) {
    const apetite = org.cadeiras + (org.grupo === 'Entidade de classe' ? 2 : org.natureza === 'Privada' ? 1 : 0);
    const quantos = between(`${org.id}:n`, 0, Math.min(9, apetite * 2));
    for (let index = 0; index < quantos; index++) {
      const key = `${org.id}:rep:${index}`;
      const canal = weighted<Canal>(`${key}:canal`, canais, org.grupo === 'IES' ? [6, 3, 1] : [5, 2, 3]);
      const inicio = dateBetween(`${key}:ini`, '2021-01-15', '2026-06-30'), meses = between(`${key}:meses`, 3, 24);
      const fimDay = Math.floor(Date.parse(`${inicio}T00:00:00Z`) / 86400000) + meses * 30;
      const fim = new Date(fimDay * 86400000).toISOString().slice(0, 10);
      const valor = between(`${key}:valor`, 8, canal === 'Patrocínio' ? 120 : 400) * 1000;
      const parcelas = Math.max(1, Math.min(meses, between(`${key}:parc`, 1, 6)));
      const pagamentos = Array.from({ length: parcelas }, (_, parcela) => ({ data: new Date((Math.floor(Date.parse(`${inicio}T00:00:00Z`) / 86400000) + Math.floor((fimDay - Math.floor(Date.parse(`${inicio}T00:00:00Z`) / 86400000)) * (parcela + 1) / (parcelas + 1))) * 86400000).toISOString().slice(0, 10), valor: Math.round(valor / parcelas) }))
        .filter(row => row.data <= anchor);
      repasses.push({ id: `REP-${org.id}-${index + 1}`, orgId: org.id, canal, objeto: pick(`${key}:obj`, objetos[canal]), inicio, fim, valor, pagamentos });
    }
  }
  const value = { organizacoes, repasses, anchor };
  cache.set(dataset, value); return value;
}

/* ---------- Leituras por data de referência ---------- */
export interface LinhaOrganizacao extends Organizacao { convenios: number; contratos: number; patrocinios: number; repassado: number; repassadoAno: number; repassadoAntes: number; vigentes: number }
export interface QuadroEntidades {
  linhas: LinhaOrganizacao[]; cadeiras: number; cadeirasPorNatureza: { grupo: string; cadeiras: number; organizacoes: number; repassado: number }[];
  repassePorAno: { ano: string; canal: Canal; grupo: string; valor: number }[]; total: number; totalAntes: number; anos: string[];
}
/** Repasses pagos até D (data do pagamento); janela de 12 meses até D contra os 12 anteriores. Cadeiras: composição demonstrativa fixa. */
export function quadroEntidades(entidades: Entidades, anchor: string, greId: string | null): QuadroEntidades {
  const inicioAno = new Date(Date.parse(`${anchor}T00:00:00Z`) - 365 * 86400000).toISOString().slice(0, 10), inicioAntes = new Date(Date.parse(`${inicioAno}T00:00:00Z`) - 365 * 86400000).toISOString().slice(0, 10);
  const orgs = entidades.organizacoes.filter(row => row.registradaEm <= anchor && (!greId || row.greId === greId));
  const linhas: LinhaOrganizacao[] = orgs.map(org => {
    const mine = entidades.repasses.filter(row => row.orgId === org.id && row.inicio <= anchor);
    const pagos = mine.flatMap(row => row.pagamentos.filter(pay => pay.data <= anchor));
    return { ...org, convenios: mine.filter(row => row.canal === 'Convênio').length, contratos: mine.filter(row => row.canal === 'Contrato').length, patrocinios: mine.filter(row => row.canal === 'Patrocínio').length,
      repassado: sum(pagos.map(row => row.valor)), repassadoAno: sum(pagos.filter(row => row.data > inicioAno).map(row => row.valor)), repassadoAntes: sum(pagos.filter(row => row.data > inicioAntes && row.data <= inicioAno).map(row => row.valor)),
      vigentes: mine.filter(row => row.fim >= anchor).length };
  }).sort((a, b) => b.repassado - a.repassado || b.cadeiras - a.cadeiras);
  const grupoDe = (org: Organizacao) => org.grupo === 'IES' ? `IES ${org.natureza.toLowerCase()}` : 'Entidade de classe';
  const grupos = ['Entidade de classe', 'IES pública', 'IES privada'];
  const anos = [...new Set(entidades.repasses.flatMap(row => row.pagamentos.filter(pay => pay.data <= anchor).map(pay => pay.data.slice(0, 4))))].sort();
  const repassePorAno = anos.flatMap(ano => canais.flatMap(canal => grupos.map(grupo => ({ ano, canal, grupo,
    valor: sum(linhas.filter(org => grupoDe(org) === grupo).flatMap(org => entidades.repasses.filter(row => row.orgId === org.id && row.canal === canal).flatMap(row => row.pagamentos.filter(pay => pay.data <= anchor && pay.data.startsWith(ano)).map(pay => pay.valor)))) }))));
  return { linhas, cadeiras: sum(linhas.map(row => row.cadeiras)),
    cadeirasPorNatureza: grupos.map(grupo => { const rows = linhas.filter(org => grupoDe(org) === grupo); return { grupo, cadeiras: sum(rows.map(row => row.cadeiras)), organizacoes: rows.length, repassado: sum(rows.map(row => row.repassado)) }; }),
    repassePorAno, total: sum(linhas.map(row => row.repassadoAno)), totalAntes: sum(linhas.map(row => row.repassadoAntes)), anos };
}
export const grupoOrganizacao = (org: Organizacao) => org.grupo === 'IES' ? `IES ${org.natureza.toLowerCase()}` : 'Entidade de classe';
