import test from 'node:test';
import assert from 'node:assert/strict';
import { dataDoArquivo, diasNaFase, historicoVazio, lerRelatorio, lotacoesQueFaltaram, quadroFases, registrarCopia } from '../scripts/integrations/govadm.ts';

// Relatório de Processos do GovAdm depois da limpeza do extracao-govadm (CSV com ";", UTF-8 com BOM). Nomes fictícios.
const cabecalho = '﻿Nº do Processo;Categoria;Assunto;Lotação Atual;Responsável;Lotação Origem;Descrição;Interessado;Fase;Favorecidos;Data;Nível de Sigilo;Cargo';
const linha = (processo: string, lotacao: string, fase: string, responsavel = 'Pessoa A') => `${processo};Infração;Falta de registro;${lotacao};${responsavel};UGI Centro;texto;Interessado X;${fase};;05/11/2026;Público;Assessor`;
const relatorio = (...linhas: string[]) => [cabecalho, ...linhas].join('\r\n');
const copia = (...linhas: string[]) => lerRelatorio(relatorio(...linhas));

test('lê o relatório limpo do GovAdm pelos nomes das colunas, sem os arquivados e sem as colunas de texto livre', () => {
  const linhas = lerRelatorio(relatorio(linha('SF-1/2026', 'CEEC', 'Relato'), linha('SF-2/2026', 'CEEC', 'Arquivado'), linha('SF-3/2026', 'CEEC', 'Desarquivado'), ''));
  assert.deepEqual(linhas, [
    { processo: 'SF-1/2026', lotacao: 'CEEC', fase: 'Relato', responsavel: 'Pessoa A', cargo: 'Assessor' },
    { processo: 'SF-3/2026', lotacao: 'CEEC', fase: 'Desarquivado', responsavel: 'Pessoa A', cargo: 'Assessor' },
  ]);
  assert.throws(() => lerRelatorio('Processo;Fase\n1;Relato'), /Lotação Atual/);
  assert.deepEqual(lerRelatorio('No do Processo;Lotação Atual;Responsável;Fase\nP1;CEEC;Pessoa A;Relato'), [{ processo: 'P1', lotacao: 'CEEC', fase: 'Relato', responsavel: 'Pessoa A', cargo: '' }], 'sem a coluna Cargo, e com "No" no lugar de "Nº", como aceita o extracao-govadm');
});

test('descrição com ponto e vírgula, aspas e quebra de linha (o csv do Python põe entre aspas) não desloca as colunas', () => {
  const texto = `${cabecalho}\r\nP1;Infração;Assunto;CEEC;Pessoa A;UGI;"linha um; com ""aspas""\r\nlinha dois";Interessado;Relato;;05/11/2026;Público;Assessor\r\n`;
  assert.deepEqual(lerRelatorio(texto).map(l => [l.processo, l.fase, l.cargo]), [['P1', 'Relato', 'Assessor']]);
});

test('a data da cópia vem do nome do arquivo gerado pelo extracao-govadm, e só se for uma data de verdade', () => {
  assert.equal(dataDoArquivo('relatorio_processos_20261107_0600_limpo.csv'), '2026-11-07');
  assert.equal(dataDoArquivo('relatorio_processos_20261399_0600_limpo.csv'), null);
  assert.equal(dataDoArquivo('outro.csv'), null);
});

test('uma cópia por dia: o período na fase começa no dia em que a fase muda, e a primeira cópia não sabe desde quando', () => {
  let h = historicoVazio();
  h = registrarCopia(h, '2026-11-01', copia(linha('P1', 'CEEC', 'Relato'), linha('P2', 'CEEE', 'Pauta')));
  h = registrarCopia(h, '2026-11-02', copia(linha('P1', 'CEEC', 'Relato', 'Pessoa B'), linha('P2', 'CEEE', 'Manifestação'), linha('P3', 'CEEC', 'Designação')));
  h = registrarCopia(h, '2026-11-05', copia(linha('P1', 'CEEC', 'Relato', 'Pessoa B'), linha('P3', 'CEEC', 'Relato'), linha('P9', 'CEEE', 'Pauta')));
  assert.deepEqual(h.copias.map(c => c.data), ['2026-11-01', '2026-11-02', '2026-11-05']);
  assert.deepEqual(diasNaFase(h, '2026-11-05').filter(r => r.lotacao === 'CEEC'), [
    { processo: 'P1', lotacao: 'CEEC', fase: 'Relato', responsavel: 'Pessoa B', cargo: 'Assessor', desde: '2026-11-01', dias: 4, desdeConhecido: false },
    { processo: 'P3', lotacao: 'CEEC', fase: 'Relato', responsavel: 'Pessoa A', cargo: 'Assessor', desde: '2026-11-05', dias: 0, desdeConhecido: true },
  ], 'trocar o responsável não reinicia a contagem');
  assert.deepEqual(h.processos.P2.map(p => [p.fase, p.desde, p.ate]), [['Pauta', '2026-11-01', '2026-11-02'], ['Manifestação', '2026-11-02', '2026-11-05']], 'o P2 saiu das câmaras');
});

test('câmara que faltou na extração não fecha os processos dela, e processo que some um dia e volta igual não perde os dias', () => {
  let h = historicoVazio();
  h = registrarCopia(h, '2026-11-01', copia(linha('P1', 'CEEC', 'Relato'), linha('P2', 'CEEE', 'Pauta'), linha('P3', 'CEEE', 'Relato')));
  const so = copia(linha('P1', 'CEEC', 'Relato'));
  assert.deepEqual(lotacoesQueFaltaram(h, so), ['CEEE']);
  h = registrarCopia(h, '2026-11-02', so);
  h = registrarCopia(h, '2026-11-03', copia(linha('P1', 'CEEC', 'Relato'), linha('P2', 'CEEE', 'Pauta')));
  h = registrarCopia(h, '2026-11-04', copia(linha('P1', 'CEEC', 'Relato'), linha('P2', 'CEEE', 'Pauta'), linha('P3', 'CEEE', 'Relato')));
  assert.deepEqual(diasNaFase(h, '2026-11-04').map(r => [r.processo, r.desde, r.desdeConhecido]), [['P1', '2026-11-01', false], ['P2', '2026-11-01', false], ['P3', '2026-11-01', false]]);
});

test('processo repetido na mesma cópia: vale a linha igual ao período atual, para a ordem das linhas não inventar mudança', () => {
  let h = registrarCopia(historicoVazio(), '2026-11-01', copia(linha('P1', 'CEEC', 'Relato')));
  h = registrarCopia(h, '2026-11-02', copia(linha('P1', 'CEEE', 'Pauta'), linha('P1', 'CEEC', 'Relato')));
  assert.equal(h.processos.P1.length, 1);
});

test('cópia repetida do mesmo dia é ignorada, e cópia mais antiga que a última é recusada', () => {
  const um = registrarCopia(historicoVazio(), '2026-11-02', copia(linha('P1', 'CEEC', 'Relato')));
  assert.equal(registrarCopia(um, '2026-11-02', copia(linha('P1', 'CEEC', 'Pauta'))), um);
  assert.throws(() => registrarCopia(um, '2026-11-01', []), /mais antiga/);
});

test('quadro por câmara e fase: quantos processos, a mediana de dias e quantos passam de 90 dias, sem nome de ninguém', () => {
  let h = historicoVazio();
  h = registrarCopia(h, '2026-07-01', copia(linha('P1', 'CEEC', 'Relato'), linha('P3', 'CEEE', 'Manifestação')));
  h = registrarCopia(h, '2026-08-01', copia(linha('P1', 'CEEC', 'Relato'), linha('P2', 'CEEC', 'Relato'), linha('P3', 'CEEE', 'Pauta')));
  h = registrarCopia(h, '2026-10-15', copia(linha('P1', 'CEEC', 'Relato'), linha('P2', 'CEEC', 'Relato'), linha('P3', 'CEEE', 'Pauta'), linha('P4', 'CEEC', 'Relato')));
  assert.deepEqual(quadroFases(h, '2026-10-15'), [
    { lotacao: 'CEEC', fase: 'Relato', processos: 3, medianaDias: 75, parados: 1, desdeDesconhecido: 1 },
    { lotacao: 'CEEE', fase: 'Pauta', processos: 1, medianaDias: 75, parados: 0, desdeDesconhecido: 0 },
  ]);
});
