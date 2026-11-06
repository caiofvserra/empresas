import type { Dataset } from '../domain/types';
import geometria from '../domain/sp-municipios.json';
import { csv } from './csv';
import { modeloTmdl } from './tmdl';
import { relatorioPbir } from './pbir';
import { temaCreaSp } from './tema';
import { dadosEmpresas } from './empresas/dados';
import { PASTA_PARAMETRO, modeloEmpresas } from './empresas/modelo';
import { paginasEmpresas } from './empresas/paginas';

export type PainelPowerBi = 'empresas';

/**
 * O pacote Power BI de um painel: todos os arquivos, com o caminho relativo à pasta do pacote. A pasta abre no Power BI
 * Desktop pelo `<Nome>.pbip`; os CSV ficam em `dados/`, apontados pelo parâmetro "Pasta dos dados". Ver o `LEIA-ME.md`
 * gerado e a ADR 0001. Hoje só o painel de Empresas tem pacote.
 */
export function pacotePowerBi(painel: PainelPowerBi, dataset: Dataset): Map<string, string> {
  const modelo = modeloEmpresas, nome = modelo.nome, arquivos = new Map<string, string>();
  arquivos.set(`${nome}.pbip`, `${JSON.stringify({ $schema: 'https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json', version: '1.0', artifacts: [{ report: { path: `${nome}.Report` } }], settings: { enableAutoRecovery: true } }, null, 2)}\n`);
  arquivos.set('.gitignore', '**/.pbi/localSettings.json\r\n**/.pbi/cache.abf\r\n');
  for (const [caminho, texto] of modeloTmdl(modelo)) arquivos.set(`${nome}.SemanticModel/${caminho}`, texto);
  const relatorio = relatorioPbir({ nome, modelo: nome, tema: { arquivo: 'CreaSP.json', conteudo: temaCreaSp('Crea-SP · Inteligência Estratégica') }, paginas: paginasEmpresas, largura: 1280, altura: 720 });
  for (const [caminho, texto] of relatorio) arquivos.set(`${nome}.Report/${caminho}`, texto);
  for (const tabela of dadosEmpresas(dataset)) arquivos.set(`dados/${tabela.arquivo}`, csv(tabela.cabecalho, tabela.linhas));
  arquivos.set('mapas/sp-municipios.json', JSON.stringify(geometria));
  arquivos.set('LEIA-ME.md', leiaMe(painel, dataset));
  return arquivos;
}

function leiaMe(painel: PainelPowerBi, dataset: Dataset): string {
  return `# Pacote Power BI do painel de ${painel === 'empresas' ? 'Empresas' : painel}

Gerado a partir do protótipo em HTML (repositório caiofvserra/empresas, \`npm run build:powerbi\`), com o cenário de demonstração até ${dataset.snapshotDate.split('-').reverse().join('/')}. Os números são fictícios e servem para conferir o modelo e as telas, não o Crea-SP.

## Como abrir

1. Copie a pasta inteira para o computador com o Power BI Desktop (versão de 2026 ou mais nova).
2. Abra \`Empresas.pbip\`. O relatório abre sem dados.
3. Em Página Inicial > Transformar dados > Editar parâmetros, troque "${PASTA_PARAMETRO}" pelo caminho da pasta \`dados\` deste pacote, terminando com \\\\ (por exemplo \`C:\\\\CREA-SP\\\\powerbi\\\\empresas\\\\dados\\\\\`).
4. Clique em Atualizar.

## O que vem pronto

- O modelo em esquema estrela: regionais, municípios, empresas, estabelecimentos, calendário, datas de referência e período; as fotos de cada fim de mês (empresas e estabelecimentos); entradas e saídas, ARTs e emprego formal; e os blocos que dependem de acordo, em demonstração.
- As medidas dos cartões e dos gráficos, em pastas com o nome de cada página, cada uma com a descrição de como é calculada.
- As quatro páginas (Registro e mercado, Evolução, RT e ART, Vínculos), com os filtros no alto sincronizados entre elas e o tema do Crea-SP.

Os estoques e as taxas (registradas, em dia, com RT) vêm da foto da data escolhida; os fluxos (entradas, saídas, ARTs, aberturas) são somados no período. Na base real, a carga precisa gravar a foto todo fim de mês sem reescrever as anteriores.

## O que falta montar no Desktop

Os blocos marcados "A montar" na tela dizem o que falta. O mapa por município usa o Mapa de formas com o arquivo \`mapas/sp-municipios.json\`.

Os arquivos seguem os schemas oficiais da Microsoft, mas os nomes internos dos campos de alguns visuais (cartão, rosca, mapa de árvore, linha) não são documentados. Se um visual abrir vazio, arraste de novo a medida para ele e salve: o Desktop corrige o arquivo.

## Trocar pela base real

Troque a origem de cada tabela (Transformar dados) do CSV para a consulta da base do Crea-SP, mantendo os nomes das colunas. As medidas e as páginas continuam as mesmas.
`.replaceAll('\n', '\r\n');
}
