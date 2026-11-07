import test from 'node:test';
import assert from 'node:assert/strict';
import { mesesDoArquivo, quadroReceita } from '../src/domain/receita-mercado.ts';
import type { MercadoReceita } from '../src/domain/receita-mercado.ts';

// Séries mês a mês do arquivo (jan/2025 a out/2026), montadas a partir dos meses com movimento.
const serie = (porMes: Record<string, number>) => mesesDoArquivo({ desde: '2025-01', competencia: '2026-10' }).map(mes => porMes[mes] ?? 0);
const linha = (sim: number, aberturas: Record<string, number>, baixas: Record<string, number>, cnaes: Record<string, number>) =>
  ({ sim, passivel: 1, principal: { sim: sim - 1, passivel: 1 }, fora: { Suspensa: 1, Inapta: 0, Baixada: 2 }, porte: { ME: sim, EPP: 1, Demais: 0, 'Não informado': 0 }, aberturas: serie(aberturas), baixas: serie(baixas), cnaes });
const mercado: MercadoReceita = { competencia: '2026-10', desde: '2025-01', fonte: 'Receita', total: { sim: 30, passivel: 3, empresas: 20, fora: 9 }, naoLocalizados: [],
  cnaes: { '7112-0/00': 22, '4120-4/00': 11, '4321-5/00': 1 }, gres: { GRE2: { '7112-0/00': 16, '4120-4/00': 6 }, GRE5: { '7112-0/00': 6, '4120-4/00': 5 } },
  municipios: {
    '3550308': linha(10, { '2026-08': 2, '2026-09': 3, '2025-01': 9 }, { '2026-09': 1 }, { '7112-0/00': 6, '4120-4/00': 5 }),
    '3509502': linha(15, { '2026-09': 4 }, {}, { '7112-0/00': 16 }),
    '3501608': linha(5, {}, { '2026-07': 2 }, { '4120-4/00': 6 }),
  } };
const municipios = [{ id: '3550308', greId: 'GRE5' }, { id: '3509502', greId: 'GRE2' }, { id: '3501608', greId: 'GRE2' }, { id: '3500105', greId: 'GRE2' }];

test('quadro da Receita no estado: estoques da competência, aberturas e baixas dos últimos meses completos e atividades em ordem', () => {
  const q = quadroReceita(mercado, municipios, { greId: null, cityId: null, meses: 3 });
  assert.deepEqual({ sim: q.sim, passivel: q.passivel, aberturas: q.aberturas, baixas: q.baixas }, { sim: 30, passivel: 3, aberturas: 9, baixas: 3 });
  assert.deepEqual(q.principal, { sim: 27, passivel: 3 }, 'enquadrados pela atividade principal, sem as secundárias');
  assert.deepEqual(q.meses, [{ mes: '2026-07', aberturas: 0, baixas: 2 }, { mes: '2026-08', aberturas: 2, baixas: 0 }, { mes: '2026-09', aberturas: 7, baixas: 1 }],
    'as séries terminam no mês anterior à competência: o arquivo de outubro só traz os primeiros dias de outubro');
  assert.deepEqual(q.situacao, { Ativa: 33, Suspensa: 3, Inapta: 0, Baixada: 6 });
  assert.deepEqual(q.porte, { ME: 30, EPP: 3, Demais: 0, 'Não informado': 0 });
  assert.deepEqual(q.atividades, [{ cnae: '7112-0/00', n: 22 }, { cnae: '4120-4/00', n: 11 }, { cnae: '4321-5/00', n: 1 }], 'no estado, a lista completa do arquivo');
});

test('quadro da Receita no recorte: a GRE e o município escolhidos limitam todas as contagens', () => {
  const gre = quadroReceita(mercado, municipios, { greId: 'GRE2', cityId: null, meses: 3 });
  assert.deepEqual({ sim: gre.sim, aberturas: gre.aberturas, baixas: gre.baixas }, { sim: 20, aberturas: 4, baixas: 2 });
  assert.deepEqual(gre.atividades, [{ cnae: '7112-0/00', n: 16 }, { cnae: '4120-4/00', n: 6 }], 'na GRE, a lista da GRE');
  const cidade = quadroReceita(mercado, municipios, { greId: null, cityId: '3550308', meses: 2 });
  assert.deepEqual({ sim: cidade.sim, aberturas: cidade.aberturas, baixas: cidade.baixas }, { sim: 10, aberturas: 5, baixas: 1 });
  assert.deepEqual(cidade.atividades, [{ cnae: '7112-0/00', n: 6 }, { cnae: '4120-4/00', n: 5 }]);
});
