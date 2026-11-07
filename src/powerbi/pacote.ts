import type { Dataset } from '../domain/types';
import geometria from '../domain/sp-municipios.json';
import { csv } from './csv';
import { modeloTmdl } from './tmdl';
import { relatorioPbir } from './pbir';
import { temaCreaSp } from './tema';
import { dadosEmpresas } from './empresas/dados';
import { PASTA_PARAMETRO } from './comum';
import { TAMANHO_DA_PAGINA } from './layout';
import { modeloEmpresas } from './empresas/modelo';
import { paginasEmpresas } from './empresas/paginas';
import { LEIA_ME_EMPRESAS } from './empresas/leia-me';
import { dadosConselho } from './conselho/dados';
import { modeloConselho } from './conselho/modelo';
import { paginasConselho } from './conselho/paginas';
import { LEIA_ME_CONSELHO } from './conselho/leia-me';

/** Os painéis com pacote: o modelo, as páginas e as tabelas de dados de cada um, em `src/powerbi/<painel>/`. */
const PAINEIS = {
  empresas: { titulo: 'Empresas', modelo: modeloEmpresas, paginas: paginasEmpresas, dados: dadosEmpresas, leiaMe: LEIA_ME_EMPRESAS },
  conselho: { titulo: 'Gestão do Conselho', modelo: modeloConselho, paginas: paginasConselho, dados: dadosConselho, leiaMe: LEIA_ME_CONSELHO },
} as const;
export type PainelPowerBi = keyof typeof PAINEIS;
/** Os painéis com pacote, na ordem em que o build os grava. */
export const PAINEIS_POWER_BI = Object.keys(PAINEIS) as PainelPowerBi[];

/**
 * O pacote Power BI de um painel: todos os arquivos, com o caminho relativo à pasta do pacote. A pasta abre no Power BI
 * Desktop pelo `<Nome>.pbip`; os CSV ficam em `dados/`, apontados pelo parâmetro "Pasta dos dados". Ver o `LEIA-ME.md`
 * gerado e a ADR 0001.
 */
export function pacotePowerBi(painel: PainelPowerBi, dataset: Dataset): Map<string, string> {
  const { titulo, modelo, paginas, dados, leiaMe: leiaMeDoPainel } = PAINEIS[painel], nome = modelo.nome, arquivos = new Map<string, string>();
  arquivos.set(`${nome}.pbip`, `${JSON.stringify({ $schema: 'https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json', version: '1.0', artifacts: [{ report: { path: `${nome}.Report` } }], settings: { enableAutoRecovery: true } }, null, 2)}\n`);
  arquivos.set('.gitignore', '**/.pbi/localSettings.json\r\n**/.pbi/cache.abf\r\n');
  for (const [caminho, texto] of modeloTmdl(modelo)) arquivos.set(`${nome}.SemanticModel/${caminho}`, texto);
  const relatorio = relatorioPbir({ nome, modelo: nome, tema: { arquivo: 'CreaSP.json', conteudo: temaCreaSp('Inteligência Estratégica Crea-SP') }, paginas, ...TAMANHO_DA_PAGINA });
  for (const [caminho, texto] of relatorio) arquivos.set(`${nome}.Report/${caminho}`, texto);
  for (const tabela of dados(dataset)) arquivos.set(`dados/${tabela.arquivo}`, csv(tabela.cabecalho, tabela.linhas));
  arquivos.set('mapas/sp-municipios.json', JSON.stringify(geometria));
  arquivos.set('LEIA-ME.md', leiaMe(titulo, nome, painel, dataset, leiaMeDoPainel));
  return arquivos;
}

function leiaMe(titulo: string, nome: string, pasta: string, dataset: Dataset, secoes: string): string {
  return `# Pacote Power BI do painel de ${titulo}

Gerado a partir do protótipo em HTML (repositório caiofvserra/empresas, \`npm run build:powerbi\`), com o cenário de demonstração até ${dataset.snapshotDate.split('-').reverse().join('/')}. Os números são fictícios e servem para conferir o modelo e as telas, não o Crea-SP.

## Como abrir

1. Copie a pasta inteira para o computador com o Power BI Desktop (versão de 2026 ou mais nova).
2. Abra \`${nome}.pbip\`. O relatório abre sem dados.
3. Em Página Inicial > Transformar dados > Editar parâmetros, troque "${PASTA_PARAMETRO}" pelo caminho da pasta \`dados\` deste pacote, terminando com \\\\ (por exemplo \`C:\\\\CREA-SP\\\\powerbi\\\\${pasta}\\\\dados\\\\\`).
4. Clique em Atualizar.

${secoes}## Trocar pela base real

Troque a origem de cada tabela (Transformar dados) do CSV para a consulta da base do Crea-SP, mantendo os nomes das colunas. As medidas e as páginas continuam as mesmas.
`.replaceAll('\n', '\r\n');
}
