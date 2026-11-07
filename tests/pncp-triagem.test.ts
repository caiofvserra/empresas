import test from 'node:test';
import assert from 'node:assert/strict';
import { quadroTriagem } from '../src/domain/pncp-triagem.ts';
import type { TriagemPncp } from '../src/domain/pncp-triagem.ts';

const serie = (lidos: number[], suspeitos: number[], presente: number[], parcial: number[], semSinal: number[], semLeitura: number[]) => ({ lidos, suspeitos, presente, parcial, semSinal, semLeitura });
const triagem: TriagemPncp = { fonte: 'PNCP', rodada: '2026-11-07', modelo: { limiar: 0.45, embeddings: 'BAAI/bge-m3', treinado_em: '2026-07-31 10:00', n_treino: 1 }, periodo: { de: '2026-08-01', ate: '2026-10-31' },
  meses: ['2026-08', '2026-09', '2026-10'],
  municipios: {
    '3550308': serie([10, 20, 30], [2, 4, 6], [1, 1, 2], [0, 1, 1], [1, 2, 2], [0, 0, 1]),
    '3509502': serie([5, 5, 5], [1, 1, 1], [0, 0, 0], [0, 0, 0], [1, 1, 0], [0, 0, 1]),
  } };
const municipios = [{ id: '3550308', greId: 'GRE5' }, { id: '3509502', greId: 'GRE2' }];

test('triagem do PNCP no estado: os últimos meses do arquivo, somados, e a série mês a mês dos suspeitos', () => {
  const q = quadroTriagem(triagem, municipios, { greId: null, cityId: null, meses: 2 });
  assert.deepEqual({ lidos: q.lidos, suspeitos: q.suspeitos, presente: q.presente, parcial: q.parcial, semSinal: q.semSinal, semLeitura: q.semLeitura },
    { lidos: 60, suspeitos: 12, presente: 3, parcial: 2, semSinal: 5, semLeitura: 2 });
  assert.deepEqual(q.meses, [{ mes: '2026-09', suspeitos: 5, semSinal: 3 }, { mes: '2026-10', suspeitos: 7, semSinal: 2 }]);
});

test('triagem do PNCP no recorte e sem rodada: a GRE limita as contagens, e o arquivo vazio dá zero sem quebrar', () => {
  assert.equal(quadroTriagem(triagem, municipios, { greId: 'GRE2', cityId: null, meses: 12 }).suspeitos, 3, 'mais meses que o arquivo: usa todos os que há');
  assert.equal(quadroTriagem(triagem, municipios, { greId: null, cityId: '3509502', meses: 1 }).semLeitura, 1);
  const vazio = quadroTriagem({ ...triagem, rodada: null, modelo: null, periodo: null, meses: [], municipios: {} }, municipios, { greId: null, cityId: null, meses: 12 });
  assert.deepEqual([vazio.suspeitos, vazio.meses.length], [0, 0]);
});
