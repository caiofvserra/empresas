import casosJson from './casos-uso.json';
import fontesJson from './fontes.json';

/**
 * V19 · o que o projeto elaborou e a V19 aplica: regras de leitura dos cruzamentos (plano rev. 2), decisão sobre cada uma
 * das 12 lacunas do V18 (planejamento-fontes-2026-10/REVISAO_REPOSITORIO.md), situação dos 34 casos de uso (CASOS_USO.md)
 * e o atlas unificado de 98 fontes (observatorio/catalogo-fontes-unificado.csv). Os JSON vêm de scripts/gerar-observatorio.py.
 */

/* ---------- Regras de leitura dos cruzamentos ---------- */
export interface RegraLeitura { cruzamento: string; pode: string; naoPode: string; noPainel: string }
export const regrasLeitura: RegraLeitura[] = [
  { cruzamento: 'Receita × Crea-SP', pode: 'Estabelecimento com ou sem registro vigente na data do arquivo da Receita', naoPode: 'Que a empresa é irregular só pelo CNAE ou pela falta de correspondência', noPainel: 'Presidência, Empresas e cobertura, Malha fina' },
  { cruzamento: 'Contrato público × ART', pode: 'Vínculo confirmado (nº do contrato ou processo na ART) ou candidato para revisão', naoPode: 'Que falta ART porque a busca por CNPJ e período não achou; que qualquer ART da empresa cobre o contrato', noPainel: 'Malha fina · contratos e ART' },
  { cruzamento: 'Obra ou instalação × empresa', pode: 'Participação com papel explícito: operador, executora, proprietário, concessionária', naoPode: 'Que o operador ou o proprietário executou a obra', noPainel: 'Ainda não (onda 2 e 3)' },
  { cruzamento: 'Quadro societário × profissional', pode: 'Sociedade identificada quando há CPF completo', naoPode: 'Que o sócio é RT, empregado ou diretor técnico; o QSA aberto mascara o CPF', noPainel: 'Retirado: a V18 sorteava a diretoria' },
  { cruzamento: 'RAIS e CAGED × empresas', pode: 'Emprego e salário por município, CNAE, CBO e jornada, em agregado', naoPode: 'Quanto uma empresa paga ou se ela descumpre o piso', noPainel: 'Malha fina (quadrante agregado) e Contexto' },
  { cruzamento: 'INEP × registro', pode: 'Concluintes e registros novos lado a lado, por área e região', naoPode: 'Taxa de registro dos formados sem a lista nominal das IES', noPainel: 'Contexto' },
  { cruzamento: 'DataJud × perícia', pode: 'Processos por classe, assunto e comarca', naoPode: 'Que houve perícia ou que o perito é engenheiro', noPainel: 'Ainda não (onda 4)' },
  { cruzamento: 'Geografia', pode: 'Município do órgão, do fornecedor e da execução, cada um no seu campo', naoPode: 'Que a obra fica onde está o órgão contratante ou a sede do fornecedor', noPainel: 'Malha fina · fornecedor na data' },
];

/* ---------- 12 lacunas do V18: decisão na V19 ---------- */
export type Decisao = 'Corrigida' | 'Rotulada' | 'Retirada';
export interface Lacuna { n: number; titulo: string; decisao: Decisao; oQueMudou: string; falta: string }
export const lacunas: Lacuna[] = [
  { n: 1, titulo: 'ART próxima não prova vínculo com contrato', decisao: 'Corrigida',
    oQueMudou: 'Contrato × ART em três graus: confirmado por documento (ponte contrato–ART), candidato (mesma empresa entre −30 e +60 dias) e não identificado. A taxa informa quantos contratos tinham chave para a busca.',
    falta: 'Campo de contrato ou processo na ART real; local e objeto para o grau candidato.' },
  { n: 2, titulo: 'CNAE não determina obrigação', decisao: 'Corrigida',
    oQueMudou: '“Sim” e “Passível” separados em todas as contagens. “Irregularidade identificada” virou “sem registro localizado” e “indício para análise”. “Passível” entra como contexto.',
    falta: 'Atividade básica e serviços efetivamente prestados; avaliação normativa por câmara.' },
  { n: 3, titulo: 'QSA não equivale a diretoria integral', decisao: 'Retirada',
    oQueMudou: 'Saiu o bloco que sorteava sócios e diretores para o art. 5º.',
    falta: 'CPF completo (Conecta ou acordo), documentos societários e parecer da GAJ antes de qualquer regra.' },
  { n: 4, titulo: 'Emprego público agregado não se liga ao CNPJ ou CPF', decisao: 'Retirada',
    oQueMudou: 'Saíram os vínculos nominais empresa–engenheiro–salário e os indícios “emprega engenheiros sem registro” e “engenheiro empregado sem registro”. Ficou o quadrante agregado por regional.',
    falta: 'RAIS identificada ou eSocial só com instrumento e autorização do MTE.' },
  { n: 5, titulo: 'Piso salarial precisa de regra jurídica versionada', decisao: 'Retirada',
    oQueMudou: 'Saiu o piso por empresa. A comparação com o piso fica no Contexto, em agregado e como leitura descritiva.',
    falta: 'Regra versionada e validada pela GAJ (jornada contratada, base salarial, categoria).' },
  { n: 6, titulo: 'CBO deve ser validada', decisao: 'Retirada',
    oQueMudou: 'O mapeamento demonstrativo câmara → CBO (que dava à Eng. Química o código mecânico) saiu junto com os vínculos nominais.',
    falta: 'Dicionário CBO oficial (famílias 2142 a 2149, 2221, 2134) na camada de mercado de trabalho.' },
  { n: 7, titulo: 'Câmara por CNAE é aproximação', decisao: 'Rotulada',
    oQueMudou: 'Câmara indicada como aproximação pelo CNAE principal nas ajudas e no método. No cenário nenhuma empresa cai no valor padrão.',
    falta: 'Cadastro técnico com relação N:N entre atividade, atribuição e modalidade.' },
  { n: 8, titulo: 'Contexto público está congelado', decisao: 'Rotulada',
    oQueMudou: 'A aba Contexto diz que é retrato versionado e não responde aos filtros; a fonte de salário aparece como secundária.',
    falta: 'Conectores da Etapa 3 com competência, captura e alerta de atraso; RAIS e CAGED primários.' },
  { n: 9, titulo: 'Formação não prevê concluintes individualmente', decisao: 'Rotulada',
    oQueMudou: 'Formação aparece como concluintes presenciais lado a lado com registros novos, sem taxa de registro.',
    falta: 'Lista nominal de formandos das IES que aderirem; EAD no recorte do INEP.' },
  { n: 10, titulo: 'Comparações exigem coortes e tempos compatíveis', decisao: 'Corrigida',
    oQueMudou: 'Conversão da fiscalização por coorte trimestral com 180 dias completos; tempo até agir com casos abertos censurados; receita atribuível pela data do pagamento. Todos dizem “associação no tempo”.',
    falta: 'Linha de base medida na Etapa 0 e dois ciclos antes de fixar metas.' },
  { n: 11, titulo: 'Público/restrito deve ser camada de dados', decisao: 'Rotulada',
    oQueMudou: 'Sem grafos de pessoas nem salários individuais no navegador. Listas nominais seguem demonstrativas.',
    falta: 'Segurança por linha (cada GRE vê a sua) e perfis no modelo semântico, não no front-end.' },
  { n: 12, titulo: 'Responsividade mudou em relação à V13', decisao: 'Rotulada',
    oQueMudou: 'Mantida a escolha da V18: as abas rolam em 1366×768. A V19 acrescenta uma linha de indicadores-norte na Presidência.',
    falta: 'Reestruturação autorizada do layout se o uso em reunião pedir uma tela só.' },
];

/* ---------- 34 casos de uso: onde estão na V19 ---------- */
export type SituacaoCaso = 'No painel' | 'Parcial' | 'Próximas ondas' | 'Depende de acordo';
export const situacoesCaso: SituacaoCaso[] = ['No painel', 'Parcial', 'Próximas ondas', 'Depende de acordo'];
const ondeEsta: Record<string, [SituacaoCaso, string]> = {
  UC01: ['No painel', 'Empresas e cobertura · três contagens'], UC02: ['No painel', 'Presidência · indicador-norte; Empresas e cobertura'], UC03: ['No painel', 'Empresas e cobertura · entradas, saídas e ponte'],
  UC04: ['Parcial', 'Empresas e cobertura · saídas; coorte de permanência ainda não exibida'], UC05: ['Próximas ondas', 'Aberturas e baixas da Receita por GRE (onda 2)'],
  UC06: ['No painel', 'Atendimento · qualidade do cadastro; Malha fina · CNPJ inativo'], UC07: ['Depende de acordo', 'QSA com CPF completo; retirado da V18'],
  UC08: ['No painel', 'Resp. técnica · quadro técnico'], UC09: ['No painel', 'Malha fina · RT baixado sem substituto'], UC10: ['No painel', 'Resp. técnica · ARTs'], UC11: ['No painel', 'Resp. técnica · prazo da CAO'],
  UC12: ['Parcial', 'Malha fina · contratos técnicos do período (cenário)'], UC13: ['No painel', 'Malha fina · fornecedor na data do contrato'], UC14: ['No painel', 'Malha fina · contrato e ART em três graus'],
  UC15: ['Próximas ondas', 'Painel de obras públicas (onda 2)'], UC16: ['Depende de acordo', 'Campos ART/RRT do CNO no Serpro'], UC17: ['Depende de acordo', 'Alvarás e AVCB (onda 4)'],
  UC18: ['Próximas ondas', 'Setores regulados: ANEEL, ANP, ANATEL (onda 3)'], UC19: ['Próximas ondas', 'Financiamentos BNDES (onda 3)'], UC20: ['Parcial', 'Malha fina · empresas com dois ou mais indícios'],
  UC21: ['No painel', 'Receita · inadimplência'], UC22: ['No painel', 'Receita; Presidência · receita atribuível'], UC23: ['No painel', 'Receita · recuperação'], UC24: ['No painel', 'Atendimento; Empresas · prazo de registro'],
  UC25: ['Parcial', 'Malha fina · quadrante agregado; Contexto'], UC26: ['Parcial', 'Contexto · fonte secundária, trocar por RAIS/CAGED'], UC27: ['Parcial', 'Contexto · INEP presencial'],
  UC28: ['Depende de acordo', 'Lista nominal de formandos das IES'], UC29: ['Depende de acordo', 'DataJud e TJSP (onda 4)'], UC30: ['Depende de acordo', 'Perícias com ART (onda 4)'],
  UC31: ['Próximas ondas', 'Densidade empresarial com IBGE e Seade (onda 3)'], UC32: ['Próximas ondas', 'Monitor legislativo (onda 4)'], UC33: ['Próximas ondas', 'Planos de contratação (onda 2)'], UC34: ['Próximas ondas', 'Concentração do mercado público (onda 2)'],
};
export interface Caso { id: string; nome: string; grupo: string; resumo: string; prioridade: string; gestao: string; situacao: SituacaoCaso; onde: string }
export const casos: Caso[] = casosJson.casos.map(row => { const [situacao, onde] = ondeEsta[row.id] ?? ['Próximas ondas', '—']; return { ...row, situacao, onde }; });

/* ---------- Atlas unificado de fontes ---------- */
export interface Fonte { fonte: string; orgao: string; tema: string; acesso: string; rotina: string; chaves: string; valor: string; evidencia: string; data: string; origem: string }
export const fontes: Fonte[] = fontesJson.fontes;
/** Níveis de evidência do atlas, do mais forte ao mais fraco. */
export const niveisEvidencia = ['amostra', 'contrato', 'documentação', 'pista', 'parceria', 'reuso'];
/** Como cada fonte aparece na V19: simulada no cenário demonstrativo ou retrato real versionado na aba Contexto. */
export const usoNoPainel: Record<string, string> = {
  'CNPJ · dados abertos': 'Simulada: cobertura, malha fina', 'PNCP · Portal Nacional de Contratações': 'Simulada: contratos e ART',
  'Novo CAGED · microdados': 'Simulada em agregado: quadrante', 'RAIS · microdados': 'Simulada em agregado: quadrante',
  'INEP · Censo da Educação Superior': 'Real: Contexto', 'CREA-SP · Portal da Transparência': 'Real: Contexto', 'Confea · normativos e relatório estatístico': 'Real: Contexto',
  'IBGE · SIDRA / Agregados v3': 'Real: Contexto', 'IBGE · localidades e malhas': 'Real: mapas', 'RAIS identificada / eSocial': 'Retirada da V18 (depende de acordo)',
};
