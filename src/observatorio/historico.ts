import type { Dataset } from '../domain/types';
import { defaultFilters } from '../domain/types';
import { datasReferencia, datasetAt, fiscalizacaoAt } from '../domain/tempo';
import { selectEnterpriseScope } from '../enterprise-v10/filters';
import { buildEnterpriseModel } from '../enterprise-v10/model';
import type { Fiscalizacao } from '../painel/fiscalizacao';
import { tipoLabel } from '../painel/fiscalizacao';
import { contratosPublicos } from '../painel/analise';
import { malhaFina } from '../cockpit/cruzamentos';
import type { IndicioId } from '../cockpit/cruzamentos';
import { cobertura, conversao, receitaAtribuivel, tempoAteAgir } from './norte';

/**
 * V21 · Histórico por data de referência: os indicadores-norte e os indícios da malha fina recalculados com a base como estava no
 * último dia de cada mês. Nada é guardado nem sobrescrito: cada ponto é a mesma leitura "como estava em D" do seletor do cabeçalho,
 * aplicada mês a mês. Em produção, é a tabela diária de indicadores do DW (um registro por indicador, recorte e data), alimentada
 * por um job que roda a cada carga; o painel só lê. O cálculo aqui é pesado (cerca de 1 s por data), por isso roda depois da
 * primeira pintura, um ponto de cada vez, e fica em cache por recorte.
 */
export interface PontoHistorico {
  data: string; registradas: number; cobertura: number | null; conversao: number | null; receita: number; tempo: number | null; abertos: number;
  confirmadas: number; comIndicio: number; comAcao: number; porRegra: Record<IndicioId, number>;
}
export interface Historico { pontos: PontoHistorico[]; datas: string[]; completo: boolean }

/** Datas do histórico: últimos 12 fins de mês antes de D, mais o próprio D. */
export function datasHistorico(view: Dataset, quantos = 12): string[] {
  const datas = datasReferencia(view, 0).filter(value => value < view.snapshotDate).slice(-quantos);
  return [...datas, view.snapshotDate];
}

const cache = new Map<string, PontoHistorico>();
/** Um ponto do histórico: a base lida em `data`, no recorte da regional (a câmara não se aplica, por custo). */
export function pontoHistorico(dataset: Dataset, f: Fiscalizacao, data: string, greId: string | null): PontoHistorico {
  const key = `${dataset.seed}|${data}|${greId ?? ''}`, hit = cache.get(key); if (hit) return hit;
  const view = datasetAt(dataset, data), fd = fiscalizacaoAt(f, data);
  const scope = selectEnterpriseScope(view, { ...defaultFilters, greIds: greId ? [greId] : [], period: 12 }), model = buildEnterpriseModel(scope);
  const malha = malhaFina(scope, model, fd, contratosPublicos(scope, 12));
  const c = cobertura(scope, model), cv = conversao(fd, greId), r = receitaAtribuivel(view, fd, greId, 12), t = tempoAteAgir(view, fd, greId, 12, tipoLabel);
  const porRegra = Object.fromEntries(malha.indicios.map(row => [row.id, row.empresas.length])) as Record<IndicioId, number>;
  const ponto: PontoHistorico = { data, registradas: model.metadata.activeCompanyIds.length, cobertura: c.taxa, conversao: cv.atual?.taxa ?? null, receita: r.total, tempo: t.mediana, abertos: t.abertos,
    confirmadas: malha.confirmadas.length, comIndicio: malha.empresas.length, comAcao: malha.comAcao.length, porRegra };
  cache.set(key, ponto); if (cache.size > 200) cache.delete(cache.keys().next().value!);
  return ponto;
}
