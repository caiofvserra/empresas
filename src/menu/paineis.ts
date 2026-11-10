/**
 * Os painéis que a página inicial do site lista, na ordem do menu. `paginas` repete os rótulos do menu lateral de cada painel
 * (src/cockpit/Cockpit.tsx); o teste tests/menu.test.ts confere que as duas listas não se separam. O painel de Gestão do Conselho
 * aparece como Colegiados, nome escolhido pelo Caio em 07/11/2026. Indicadores do Sistema (10/11/2026) é a planilha do Confea por subprograma.
 */
import type { PainelId } from '../cockpit/Cockpit';

export type PainelDoMenu = { id: PainelId; nome: string; arquivo: string; paginas: string[] };

export const paineisDoMenu: PainelDoMenu[] = [
  { id: 'presidencia', nome: 'Presidência', arquivo: 'presidencia.html', paginas: ['Resumo', 'Regionais', 'Riscos', 'No país'] },
  { id: 'empresas', nome: 'Empresas', arquivo: 'empresas.html', paginas: ['Registro', 'Evolução', 'RT e ART', 'Vínculos'] },
  { id: 'profissionais', nome: 'Profissionais', arquivo: 'profissionais.html', paginas: ['Registro', 'Evolução', 'ART e RT', 'Formação', 'Trabalho'] },
  { id: 'fiscalizacao', nome: 'Fiscalização', arquivo: 'fiscalizacao.html', paginas: ['Ações', 'Resultado', 'Malha fina', 'Contratos', 'Obras'] },
  { id: 'conselho', nome: 'Colegiados', arquivo: 'conselho.html', paginas: ['Colegiado', 'Processos', 'Conselheiros', 'Decisões', 'Representação'] },
  { id: 'financeiro', nome: 'Financeiro', arquivo: 'financeiro.html', paginas: ['Arrecadação', 'Receita', 'Dívida', 'Orçamento'] },
  { id: 'atendimento', nome: 'Atendimento', arquivo: 'atendimento.html', paginas: ['Protocolos', 'Equipe e território', 'Demanda'] },
  { id: 'indicadores', nome: 'Indicadores do Sistema', arquivo: 'indicadores.html', paginas: ['Registro', 'Fiscalização', 'Julgamento', 'Suporte e Liderança', 'Entrega ao Confea'] },
];

/** "Resumo, Regionais, Riscos e No país". */
export const emFrase = (itens: string[]) => itens.length < 2 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
