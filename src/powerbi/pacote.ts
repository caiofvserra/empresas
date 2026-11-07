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
import { dadosGestao } from './gestao/dados';
import type { Dados } from './gestao/dados';
import { modeloGestao } from './gestao/modelo';
import { paginasGestao } from './gestao/paginas';
import { LEIA_ME_ATENDIMENTO, LEIA_ME_FINANCEIRO } from './gestao/leia-me';
import { dadosConselho } from './conselho/dados';
import { modeloConselho } from './conselho/modelo';
import { paginasConselho } from './conselho/paginas';
import { LEIA_ME_CONSELHO } from './conselho/leia-me';
import { recortarModelo } from './recorte';
import type { Modelo } from './modelo';
import type { Pagina } from './pbir';

/** `titulo` entra no LEIA-ME depois de "Pacote Power BI do", como em "painel de Empresas". */
interface PainelComPacote { titulo: string; modelo: Modelo; paginas: Pagina[]; dados: (dataset: Dataset) => Dados[]; leiaMe: string }
/**
 * Um painel que sai do modelo comum de `src/powerbi/gestao/` (Financeiro e Atendimento, separados em 07/11/2026): as suas páginas,
 * o recorte do modelo que elas usam e só os CSV das tabelas desse recorte.
 */
function daGestao(titulo: string, nome: string, pasta: string, ids: string[], leiaMe: string): PainelComPacote {
  const paginas = paginasGestao.filter(pagina => ids.includes(pagina.id)), modelo = recortarModelo(modeloGestao, nome, pasta, paginas);
  const arquivos = new Set(modelo.tabelas.map(tabela => tabela.arquivo));
  return { titulo, modelo, paginas, dados: dataset => dadosGestao(dataset).filter(tabela => arquivos.has(tabela.arquivo)), leiaMe };
}
/** Os painéis com pacote: o modelo, as páginas e as tabelas de dados de cada um, em `src/powerbi/<painel>/`. */
const PAINEIS = {
  empresas: { titulo: 'painel de Empresas', modelo: modeloEmpresas, paginas: paginasEmpresas, dados: dadosEmpresas, leiaMe: LEIA_ME_EMPRESAS },
  financeiro: daGestao('painel Financeiro', 'Financeiro', 'financeiro', ['receita', 'orcamento'], LEIA_ME_FINANCEIRO),
  atendimento: daGestao('painel de Atendimento', 'Atendimento', 'atendimento', ['protocolos', 'equipe', 'demanda'], LEIA_ME_ATENDIMENTO),
  conselho: { titulo: 'painel de Gestão do Conselho', modelo: modeloConselho, paginas: paginasConselho, dados: dadosConselho, leiaMe: LEIA_ME_CONSELHO },
} satisfies Record<string, PainelComPacote>;
export type PainelPowerBi = keyof typeof PAINEIS;
/** Os painéis com pacote, na ordem em que o build os grava. */
export const PAINEIS_POWER_BI = Object.keys(PAINEIS) as PainelPowerBi[];

/** O modelo do pacote de um painel (no Financeiro e no Atendimento, já recortado do modelo comum). */
export const modeloPowerBi = (painel: PainelPowerBi): Modelo => PAINEIS[painel].modelo;

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
  return `# Pacote Power BI do ${titulo}

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
