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

test('aberturas da Receita no ritmo da Evolução: soma de 12 meses só com os 12 meses no arquivo, e o índice e a variação refeitos com o dado real', async () => {
  const { comAberturasReais } = await import('../src/domain/empresas.ts');
  const meses = mesesDoArquivo({ desde: '2025-01', competencia: '2026-02' }).map((mes, k) => ({ mes, aberturas: 10 + k }));
  const pontos = ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03'].map(month => ({ month, emprego: 100, aberturas12: 999, registros12: 50, credito: 1, pib: 1 }));
  const fic = { pontos, indice: { emprego: [100, 100, 100, 100, 100], aberturas12: [100, 100, 100, 100, 100], registros12: [100, 100, 100, 100, 100], credito: [100, 100, 100, 100, 100], pib: [100, 100, 100, 100, 100] },
    variacao: { emprego: 0, aberturas12: 0, registros12: 0, credito: 0, pib: 0 }, ultimoMesReceita: '2026-03' };
  const r = comAberturasReais(fic, meses);
  // jan/2025 a dez/2025 = 10+...+21 = 186; fev/2025 a jan/2026 = 198; mar/2025 a fev/2026 = 210.
  assert.deepEqual(r.pontos.map(p => p.aberturas12), [null, 186, 198, 210, null], 'sem os 12 meses no arquivo, o mês fica vazio, e depois do último mês do arquivo também');
  assert.deepEqual(r.indice.aberturas12, [null, null, null, null, null], 'o índice parte do primeiro mês da janela, que aqui não tem a soma completa');
  assert.equal(r.ultimoMesReceita, '2026-02');
  assert.deepEqual(r.pontos.map(p => p.registros12), [50, 50, 50, 50, 50], 'as outras séries não mudam');
  const r2 = comAberturasReais({ ...fic, pontos: fic.pontos.slice(1, 4) }, meses);
  assert.deepEqual(r2.indice.aberturas12, [100, 106.5, 112.9]);
  assert.equal(Math.round(r2.variacao.aberturas12! * 10) / 10, 12.9);
});
