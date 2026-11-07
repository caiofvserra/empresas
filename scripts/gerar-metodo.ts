/**
 * Gera docs/METODO.md a partir dos mesmos dados que alimentavam a antiga aba Método do painel geral.
 *
 * Em 07/11/2026 o Caio decidiu que o Método não é painel: as frentes de dados, os cruzamentos, os casos de uso, as regras da malha
 * fina, o atlas de fontes, as ferramentas de IA, o radar normativo, o caminho de uma fonte nova e as parcerias viram um documento.
 * Rodar: `npm run docs:metodo`. O texto sai dos módulos de governança; para mudar o documento, mude os dados e rode de novo.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { casasLegislativas, casos, coletaDe, coletas, ferramentasIa, fontes, frentePorId, frentes, gatePromocao, lacunas, niveisEvidencia, prontidaoFontes, proposicoes, regrasLeitura, situacoesCaso, usoNoPainel } from '../src/observatorio/governanca';
import { regras, regrasPendentes, statusAjuda } from '../src/cockpit/cruzamentos';
import { parcerias } from '../src/domain/parcerias';
import { fichas, parceriasDe } from '../src/cockpit/fichas';

/** Célula de tabela Markdown: sem quebra de linha e com a barra escapada. */
const c = (value: unknown) => String(value ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim() || '—';
const tabela = (cabecalho: string[], linhas: unknown[][]) => [`| ${cabecalho.join(' | ')} |`, `| ${cabecalho.map(() => '---').join(' | ')} |`, ...linhas.map(row => `| ${row.map(c).join(' | ')} |`)].join('\n');
const dataBr = (iso: string) => iso ? iso.split('-').reverse().join('/') : '';
const conta = <T,>(rows: T[], test: (row: T) => boolean) => rows.filter(test).length;

const blocosDaParceria = (id: string) => Object.values(fichas).filter(ficha => (parceriasDe(ficha) as string[]).includes(id)).length;
const comParceria = Object.values(fichas).filter(row => row.parceria).length;
const temas = [...new Set(fontes.map(row => row.tema))].sort((a, b) => conta(fontes, row => row.tema === b) - conta(fontes, row => row.tema === a));
const niveis = niveisEvidencia.filter(nivel => fontes.some(row => row.evidencia === nivel));

const partes = [
  `# Método da Inteligência Estratégica Crea-SP

Este documento reúne o que antes ficava na aba Método do painel geral: de onde vêm os dados, o que cada cruzamento permite concluir, onde está cada uso previsto, as regras da malha fina, as fontes mapeadas, as ferramentas de inteligência artificial, os projetos de lei acompanhados, os passos para uma fonte nova entrar e os acordos de que os painéis dependem.

O texto é gerado por \`scripts/gerar-metodo.ts\` a partir dos mesmos dados que os painéis usam. Para mudar este documento, mude os dados e rode \`npm run docs:metodo\`.`,

  `## Fontes externas e o que cada uma acrescenta

${conta(frentes, row => row.situacao === 'No painel')} frentes já estão nos painéis, ${conta(frentes, row => row.situacao === 'Parcial')} estão em parte, ${conta(frentes, row => row.situacao === 'Planejada')} estão planejadas e ${conta(frentes, row => row.situacao === 'Depende de acordo')} dependem de acordo.

${tabela(['Frente', 'Fontes', 'Potencial mais relevante', 'Coleta', 'Situação', 'Nos painéis'], frentes.map(row => [row.frente, row.fontes, row.potencial, row.coleta, row.situacao, row.noPainel]))}`,

  `## O que cada cruzamento permite concluir, e o que não permite

São ${regrasLeitura.length} cruzamentos entre bases. A coluna "Não pode concluir" é tão importante quanto a anterior: ela diz onde o número para de valer como prova.

${tabela(['Cruzamento', 'Frente', 'Como as bases se ligam', 'Pode concluir', 'Não pode concluir', 'Situação', 'Nos painéis'], regrasLeitura.map(row => [row.cruzamento, frentePorId[row.frente]?.frente, row.chave, row.pode, row.naoPode, row.situacao, row.noPainel]))}`,

  `## Problemas apontados na versão 18 e o que foi feito

${conta(lacunas, row => row.decisao === 'Corrigida')} medidas foram corrigidas, ${conta(lacunas, row => row.decisao === 'Retirada')} foram retiradas e ${conta(lacunas, row => row.decisao === 'Rotulada')} passaram a ser marcadas como demonstrativas.

${tabela(['#', 'Problema', 'Decisão', 'O que mudou', 'Falta para produção'], lacunas.map(row => [row.n, row.titulo, row.decisao, row.oQueMudou, row.falta]))}`,

  `## Os ${casos.length} usos previstos e onde cada um está

${situacoesCaso.map(item => `${item}: ${conta(casos, row => row.situacao === item)}`).join('; ')}.

${tabela(['Caso', 'Grupo', 'Prioridade', 'Situação', 'Onde está', 'Resumo'], casos.map(row => [row.nome, row.grupo, row.prioridade, row.situacao, row.onde, row.resumo]))}`,

  `## Regras da malha fina

- Confirmado: ${statusAjuda.Confirmado}
- Candidato: ${statusAjuda.Candidato}
- Contexto: ${statusAjuda.Contexto}

${tabela(['Regra', 'O que verifica', 'Confiança', 'Coleta', 'Fonte e versão', 'Não pode concluir'], regras.map(row => [row.label, row.regra, row.status, row.coleta, `${row.fonte} · ${row.versao}`, row.naoConcluir]))}

Pendentes: ${regrasPendentes.map(row => `${row.label} (${row.motivo})`).join('; ')}.`,

  `## As ${fontes.length} fontes de dados mapeadas

Só entram nos painéis as fontes que podem ser coletadas automaticamente ou por acordo. ${coletas.map(item => `${item}: ${conta(fontes, row => coletaDe(row) === item)}`).join('; ')}.

Fontes por tema e pelo que já se comprovou sobre elas:

${tabela(['Tema', ...niveis, 'Total'], temas.map(tema => [tema, ...niveis.map(nivel => conta(fontes, row => row.tema === tema && row.evidencia === nivel) || ''), conta(fontes, row => row.tema === tema)]))}

${tabela(['Fonte', 'Tema', 'Órgão', 'Acesso e rotina', 'Coleta', 'Chaves de ligação', 'Uso nos painéis'], fontes.map(row => [row.fonte, row.tema, row.orgao, `${row.acesso} · ${row.rotina}`, coletaDe(row), row.chaves, usoNoPainel[row.fonte] ?? `${row.evidencia}${row.data ? ` · ${row.data}` : ''}`]))}`,

  `## Inteligência artificial e análises avançadas

${conta(ferramentasIa, row => row.situacao === 'No painel')} ferramentas já estão nos painéis, ${conta(ferramentasIa, row => row.situacao === 'Protótipo')} estão em protótipo e ${conta(ferramentasIa, row => row.situacao === 'Planejada')} estão planejadas. Nenhum resultado delas é tratado como fato antes de ser conferido por uma pessoa e de se medir quantas vezes a ferramenta erra.

${tabela(['Ferramenta', 'Tipo', 'Alimenta', 'Entrada', 'Resultado', 'Validação', 'Situação'], ferramentasIa.map(row => [row.nome, row.tipo, row.bloco, row.entrada, row.saida, row.validacao, row.situacao]))}`,

  `## Projetos de lei que podem afetar a engenharia

Os projetos listados são exemplos inventados até a coleta automática entrar. Projeto em tramitação não é lei: em produção, a coleta acompanha a data de cada andamento, e uma pessoa confirma se o projeto é relevante. ${casasLegislativas.map(item => `${item}: ${conta(proposicoes, row => row.casa === item)}`).join('; ')}.

${tabela(['Casa', 'Proposição', 'Assunto', 'Ementa', 'Etapa', 'Última tramitação', 'Relevância'], proposicoes.slice().sort((a, b) => b.ultimaTramitacao.localeCompare(a.ultimaTramitacao)).map(row => [row.casa, row.sigla, row.familia, row.ementa, row.etapa, dataBr(row.ultimaTramitacao), row.relevancia]))}`,

  `## Quando uma fonte nova pode entrar nos painéis

Os ${gatePromocao.length} passos que uma fonte precisa cumprir antes de alimentar os painéis de verdade:

${gatePromocao.map((passo, index) => `${index + 1}. ${passo}`).join('\n')}

${tabela(['Fonte', 'Frente', 'Passo alcançado', 'O que se sabe (29/10/2026)', 'Pendente', 'Nos painéis'], prontidaoFontes.map(row => [row.fonte, frentePorId[row.frente]?.frente, `${row.passo} de ${gatePromocao.length}`, row.evidencia, row.pendente, row.noPainel]))}`,

  `## Acordos de que os painéis dependem

${parcerias.length} parcerias estão previstas, e ${conta(parcerias, row => row.prioridade === 'A')} delas têm prioridade alta. ${comParceria} blocos dos painéis levam o sinal "!" porque dependem de alguma delas. Como nenhum acordo é certo, cada parceria tem um plano B com dados públicos ou pedidos pela Lei de Acesso à Informação, mais fraco, mas que não depende de convênio. Até o acordo, os blocos mostram dados de exemplo, e os casos que eles apontam não contam como confirmados.

${tabela(['Parceiro', 'Prioridade', 'Blocos', 'O que precisa entregar', 'Como os dados se ligam', 'Base prevista', 'Se o acordo não sair', 'Onde aparece'], parcerias.map(row => [row.parceiro, row.prioridade, blocosDaParceria(row.id), row.entrega, row.chave, row.basePrevista, row.planoB, row.camadas]))}`,
];

const destino = join(import.meta.dirname, '..', 'docs', 'METODO.md');
writeFileSync(destino, `${partes.join('\n\n')}\n`);
console.log(`docs/METODO.md: ${partes.length - 1} seções`);
