import type { Dataset } from '../domain/types';
import geometria from '../domain/sp-municipios.json';
import { csv } from './csv';
import { modeloTmdl } from './tmdl';
import { relatorioPbir } from './pbir';
import { temaCreaSp } from './tema';
import { dadosEmpresas } from './empresas/dados';
import { PASTA_PARAMETRO, modeloEmpresas } from './empresas/modelo';
import { TAMANHO_DA_PAGINA, paginasEmpresas } from './empresas/paginas';

/** Os painéis com pacote: o modelo, as páginas e as tabelas de dados de cada um, em `src/powerbi/<painel>/`. */
const PAINEIS = {
  empresas: { titulo: 'Empresas', modelo: modeloEmpresas, paginas: paginasEmpresas, dados: dadosEmpresas },
} as const;
export type PainelPowerBi = keyof typeof PAINEIS;

/**
 * O pacote Power BI de um painel: todos os arquivos, com o caminho relativo à pasta do pacote. A pasta abre no Power BI
 * Desktop pelo `<Nome>.pbip`; os CSV ficam em `dados/`, apontados pelo parâmetro "Pasta dos dados". Ver o `LEIA-ME.md`
 * gerado e a ADR 0001.
 */
export function pacotePowerBi(painel: PainelPowerBi, dataset: Dataset): Map<string, string> {
  const { titulo, modelo, paginas, dados } = PAINEIS[painel], nome = modelo.nome, arquivos = new Map<string, string>();
  arquivos.set(`${nome}.pbip`, `${JSON.stringify({ $schema: 'https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json', version: '1.0', artifacts: [{ report: { path: `${nome}.Report` } }], settings: { enableAutoRecovery: true } }, null, 2)}\n`);
  arquivos.set('.gitignore', '**/.pbi/localSettings.json\r\n**/.pbi/cache.abf\r\n');
  for (const [caminho, texto] of modeloTmdl(modelo)) arquivos.set(`${nome}.SemanticModel/${caminho}`, texto);
  const relatorio = relatorioPbir({ nome, modelo: nome, tema: { arquivo: 'CreaSP.json', conteudo: temaCreaSp('Inteligência Estratégica Crea-SP') }, paginas, ...TAMANHO_DA_PAGINA });
  for (const [caminho, texto] of relatorio) arquivos.set(`${nome}.Report/${caminho}`, texto);
  for (const tabela of dados(dataset)) arquivos.set(`dados/${tabela.arquivo}`, csv(tabela.cabecalho, tabela.linhas));
  arquivos.set('mapas/sp-municipios.json', JSON.stringify(geometria));
  arquivos.set('LEIA-ME.md', leiaMe(titulo, nome, dataset));
  return arquivos;
}

function leiaMe(titulo: string, nome: string, dataset: Dataset): string {
  return `# Pacote Power BI do painel de ${titulo}

Gerado a partir do protótipo em HTML (repositório caiofvserra/empresas, \`npm run build:powerbi\`), com o cenário de demonstração até ${dataset.snapshotDate.split('-').reverse().join('/')}. Os números são fictícios e servem para conferir o modelo e as telas, não o Crea-SP.

## Como abrir

1. Copie a pasta inteira para o computador com o Power BI Desktop (versão de 2026 ou mais nova).
2. Abra \`${nome}.pbip\`. O relatório abre sem dados.
3. Em Página Inicial > Transformar dados > Editar parâmetros, troque "${PASTA_PARAMETRO}" pelo caminho da pasta \`dados\` deste pacote, terminando com \\\\ (por exemplo \`C:\\\\CREA-SP\\\\powerbi\\\\empresas\\\\dados\\\\\`).
4. Clique em Atualizar.

## O que vem pronto

- O modelo em esquema estrela: regionais, municípios, empresas, estabelecimentos, modalidades, calendário, datas de referência e período; as fotos de cada fim de mês (empresas, estabelecimentos e pendências do cadastro); entradas e saídas, ARTs, profissionais ativos e emprego formal; e os blocos que dependem de acordo, em demonstração.
- As medidas dos cartões e dos gráficos, em pastas com o nome de cada página, cada uma com a descrição de como é calculada.
- As quatro páginas (Registro e mercado, Evolução, RT e ART, Vínculos), com os filtros no alto sincronizados entre elas e o tema do Crea-SP. Os gráficos saem com rótulos de dados e legenda, para ler sem passar o mouse.
- Em cada cartão, como no painel: o número, a comparação (com um ano antes; com a meta, na parte registrada e no RT; com o primeiro mês do gráfico, no emprego) e a linha de apoio.
- O funil "Do mercado à ART", a matriz de tempo de registro e capital social, o gráfico de economia com as quatro séries em índice (o primeiro mês igual a 100), as abertas na Receita mês a mês, a permanência de 3, 6 e 12 meses e as ARTs por modalidade a cada 100 profissionais.
- O período é um parâmetro do tipo "Intervalo numérico", de 1 a 36 meses, com controle deslizante. O painel em HTML tem atalhos de 3, 6, 12 e 24 meses; no Power BI, eles podem virar indicadores (bookmarks) com botões, montados no Desktop.

Os estoques e as taxas (registradas, em dia, com RT) vêm da foto da data escolhida; os fluxos (entradas, saídas, ARTs, aberturas) são somados no período. Na base real, a carga precisa gravar a foto todo fim de mês sem reescrever as anteriores.

Tudo o que depende de acordo leva "!" no título e no nome da medida, e a descrição da medida diz com quem é o acordo e qual é o plano B. Os números desses blocos são do cenário e não mudam com os filtros.

## O que falta montar no Desktop

O mapa por município: insira o visual Mapa de formas no lugar do bloco "A montar"; em Formatar > Configurações do mapa > Mapa personalizado, carregue \`mapas/sp-municipios.json\`; ponha Municípios[Município] em Local e a medida "Parte do mercado que está registrada" em Saturação de cor.

A escala de cor das duas matrizes (novos registros por trimestre; tempo de registro e capital social): em Formatar > Elementos da célula, ligue a Cor da tela de fundo e escolha a escala de cor. Os números já aparecem nas células.

Os filtros de regional, município e câmara chegam aos estabelecimentos do mercado pela empresa: valem o município e a câmara da matriz, e não os do próprio estabelecimento (ver a ADR 0002 do repositório).

Os arquivos seguem os schemas oficiais da Microsoft, mas os nomes internos dos campos de alguns visuais (cartão, rosca, mapa de árvore, linha) não são documentados. Se um visual abrir vazio, arraste de novo a medida para ele e salve: o Desktop corrige o arquivo.

## Trocar pela base real

Troque a origem de cada tabela (Transformar dados) do CSV para a consulta da base do Crea-SP, mantendo os nomes das colunas. As medidas e as páginas continuam as mesmas.
`.replaceAll('\n', '\r\n');
}
