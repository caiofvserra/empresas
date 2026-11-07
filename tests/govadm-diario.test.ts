import test from 'node:test';
import assert from 'node:assert/strict';
import { dataDoArquivo, diasNaFase, historicoVazio, lerRelatorio, quadroFases, registrarFoto } from '../scripts/integrations/govadm.ts';

// Relatório de Processos do GovAdm depois da limpeza do extracao-govadm (CSV com ";", UTF-8 com BOM). Nomes fictícios.
const cabecalho = '﻿Nº do Processo;Categoria;Assunto;Lotação Atual;Responsável;Lotação Origem;Descrição;Interessado;Fase;Favorecidos;Data;Nível de Sigilo;Cargo';
const linha = (processo: string, lotacao: string, fase: string, responsavel = 'Pessoa A') => `${processo};Infração;Falta de registro;${lotacao};${responsavel};UGI Centro;texto;Interessado X;${fase};;05/11/2026;Público;Assessor`;
const relatorio = (...linhas: string[]) => [cabecalho, ...linhas].join('\r\n');

test('lê o relatório limpo do GovAdm pelos nomes das colunas, sem os arquivados e sem as colunas de texto livre', () => {
  const linhas = lerRelatorio(relatorio(linha('SF-1/2026', 'CEEC', 'Relato'), linha('SF-2/2026', 'CEEC', 'Arquivado'), ''));
  assert.deepEqual(linhas, [{ processo: 'SF-1/2026', categoria: 'Infração', assunto: 'Falta de registro', lotacao: 'CEEC', responsavel: 'Pessoa A', cargo: 'Assessor', fase: 'Relato', data: '2026-11-05' }]);
  assert.throws(() => lerRelatorio('Processo;Fase\n1;Relato'), /Lotação Atual/);
});

test('a data da foto vem do nome do arquivo gerado pelo extracao-govadm', () => {
  assert.equal(dataDoArquivo('relatorio_processos_20261107_0600_limpo.csv'), '2026-11-07');
  assert.equal(dataDoArquivo('outro.csv'), null);
});

test('uma foto por dia: a passagem pela fase começa no dia em que a fase muda, e a primeira foto não sabe desde quando', () => {
  let h = historicoVazio();
  h = registrarFoto(h, '2026-11-01', lerRelatorio(relatorio(linha('P1', 'CEEC', 'Relato'), linha('P2', 'CEEE', 'Pauta'))));
  h = registrarFoto(h, '2026-11-02', lerRelatorio(relatorio(linha('P1', 'CEEC', 'Relato', 'Pessoa B'), linha('P2', 'CEEE', 'Manifestação'), linha('P3', 'CEEC', 'Designação'))));
  h = registrarFoto(h, '2026-11-05', lerRelatorio(relatorio(linha('P1', 'CEEC', 'Relato', 'Pessoa B'), linha('P3', 'CEEC', 'Relato'))));
  assert.deepEqual(h.fotos, ['2026-11-01', '2026-11-02', '2026-11-05']);
  assert.deepEqual(diasNaFase(h, '2026-11-05'), [
    { processo: 'P1', lotacao: 'CEEC', fase: 'Relato', responsavel: 'Pessoa B', cargo: 'Assessor', desde: '2026-11-01', dias: 4, desdeConhecido: false },
    { processo: 'P3', lotacao: 'CEEC', fase: 'Relato', responsavel: 'Pessoa A', cargo: 'Assessor', desde: '2026-11-05', dias: 0, desdeConhecido: true },
  ], 'trocar o responsável não reinicia a contagem; o P2 saiu das câmaras e não está mais em fase nenhuma');
  assert.deepEqual(h.processos.P2.map(p => [p.fase, p.desde, p.ate]), [['Pauta', '2026-11-01', '2026-11-02'], ['Manifestação', '2026-11-02', '2026-11-05']]);
});

test('foto repetida do mesmo dia é ignorada, e foto mais antiga que a última é recusada', () => {
  const um = registrarFoto(historicoVazio(), '2026-11-02', lerRelatorio(relatorio(linha('P1', 'CEEC', 'Relato'))));
  assert.equal(registrarFoto(um, '2026-11-02', lerRelatorio(relatorio(linha('P1', 'CEEC', 'Pauta')))), um);
  assert.throws(() => registrarFoto(um, '2026-11-01', []), /mais antiga/);
});

test('quadro por câmara e fase: quantos processos, a mediana de dias e quantos passam de 90 dias, sem nome de ninguém', () => {
  let h = historicoVazio();
  h = registrarFoto(h, '2026-07-01', lerRelatorio(relatorio(linha('P1', 'CEEC', 'Relato'))));
  h = registrarFoto(h, '2026-08-01', lerRelatorio(relatorio(linha('P1', 'CEEC', 'Relato'), linha('P2', 'CEEC', 'Relato'), linha('P3', 'CEEE', 'Pauta'))));
  h = registrarFoto(h, '2026-10-15', lerRelatorio(relatorio(linha('P1', 'CEEC', 'Relato'), linha('P2', 'CEEC', 'Relato'), linha('P3', 'CEEE', 'Pauta'), linha('P4', 'CEEC', 'Relato'))));
  assert.deepEqual(quadroFases(h, '2026-10-15'), [
    { lotacao: 'CEEC', fase: 'Relato', processos: 3, medianaDias: 75, acima90: 1, desdeDesconhecido: 1 },
    { lotacao: 'CEEE', fase: 'Pauta', processos: 1, medianaDias: 75, acima90: 0, desdeDesconhecido: 0 },
  ]);
});

test('descrição com ponto e vírgula, aspas e quebra de linha (o csv do Python põe entre aspas) não desloca as colunas', () => {
  const texto = `${cabecalho}\r\nP1;Infração;Assunto;CEEC;Pessoa A;UGI;"linha um; com ""aspas""\r\nlinha dois";Interessado;Relato;;05/11/2026;Público;Assessor\r\n`;
  assert.deepEqual(lerRelatorio(texto).map(l => [l.processo, l.fase, l.cargo]), [['P1', 'Relato', 'Assessor']]);
});
