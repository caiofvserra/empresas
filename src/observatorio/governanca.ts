import casosJson from './casos-uso.json';
import fontesJson from './fontes.json';

/**
 * V20 · o que o projeto elaborou e o painel aplica: regras de leitura dos cruzamentos (plano rev. 2), decisão sobre cada uma
 * das 12 lacunas do V18 (planejamento-fontes-2026-10/REVISAO_REPOSITORIO.md), o bloco do painel que atende cada um dos 34 casos
 * de uso (CASOS_USO.md), o atlas unificado de 98 fontes (observatorio/catalogo-fontes-unificado.csv) com a forma de coleta e as
 * ferramentas de IA e análises avançadas que alimentam o painel. Os JSON vêm de scripts/gerar-observatorio.py.
 * Regra da V20: só entram no painel fontes de coleta automática periódica ou por convênio; coleta pontual fica fora.
 */

/* ---------- Regras de leitura dos cruzamentos ---------- */
export interface RegraLeitura { cruzamento: string; pode: string; naoPode: string; noPainel: string }
export const regrasLeitura: RegraLeitura[] = [
  { cruzamento: 'Receita × Crea-SP', pode: 'Estabelecimento com ou sem registro vigente na data do arquivo da Receita', naoPode: 'Que a empresa é irregular só pelo CNAE ou pela falta de correspondência', noPainel: 'Presidência · indicador-norte 1; Empresas · conciliação; Malha fina · CNAE sem registro, nome de engenharia, sucessão' },
  { cruzamento: 'Contrato público × ART', pode: 'Vínculo confirmado (nº do contrato ou processo na ART) ou candidato para revisão', naoPode: 'Que falta ART porque a busca por CNPJ e período não achou; que qualquer ART da empresa cobre o contrato', noPainel: 'Malha fina · contratos e ART; obra sem ART de fiscalização' },
  { cruzamento: 'Obra ou instalação × empresa', pode: 'Participação com papel explícito: operador, executora, proprietário, concessionária', naoPode: 'Que o operador ou o proprietário executou a obra', noPainel: 'Fora da coleta automática até a captura do CNO e das obras públicas' },
  { cruzamento: 'Quadro societário × profissional', pode: 'Sociedade identificada quando há CPF completo', naoPode: 'Que o sócio é RT, empregado ou diretor técnico; o QSA aberto mascara o CPF', noPainel: 'Retirado: a V18 sorteava a diretoria; depende de acordo (CPF completo)' },
  { cruzamento: 'RAIS e CAGED × empresas', pode: 'Emprego e salário por município, CNAE, CBO e jornada, em agregado', naoPode: 'Quanto uma empresa paga ou se ela descumpre o piso', noPainel: 'Profissionais · emprego e remuneração por CBO (agregado); Malha fina · quadrante' },
  { cruzamento: 'INEP × registro', pode: 'Concluintes por IES e ano contra registrados com a mesma IES e ano de conclusão, em agregado', naoPode: 'Taxa de registro nominal sem a lista das IES; quem se registra em outro Crea', noPainel: 'Formação · três taxas por coorte, por IES, modalidade, canal e natureza' },
  { cruzamento: 'DataJud × perícia', pode: 'Processos por classe, assunto e comarca', naoPode: 'Que houve perícia ou que o perito é engenheiro', noPainel: 'Fora da coleta automática até o acordo com o TJSP' },
  { cruzamento: 'Geografia', pode: 'Município do órgão, do fornecedor e da execução, cada um no seu campo', naoPode: 'Que a obra fica onde está o órgão contratante ou a sede do fornecedor', noPainel: 'Malha fina · fornecedor na data; Controle interno · sede × território' },
];

/* ---------- 12 lacunas do V18: decisão na V19 e o que a V20 mudou ---------- */
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
    oQueMudou: 'Saíram os vínculos nominais empresa–engenheiro–salário e os indícios “emprega engenheiros sem registro”. Na V20, emprego e remuneração aparecem por CBO em agregado, na aba Profissionais.',
    falta: 'RAIS identificada ou eSocial só com instrumento e autorização do MTE.' },
  { n: 5, titulo: 'Piso salarial precisa de regra jurídica versionada', decisao: 'Retirada',
    oQueMudou: 'Saiu o piso por empresa. A V20 compara a remuneração mediana por CBO com duas leituras do piso (base congelada pelo STF e leitura do Confea), em agregado e como leitura descritiva.',
    falta: 'Regra versionada e validada pela GAJ (jornada contratada, base salarial, categoria).' },
  { n: 6, titulo: 'CBO deve ser validada', decisao: 'Retirada',
    oQueMudou: 'O mapeamento demonstrativo câmara → CBO saiu. A V20 usa os rótulos oficiais da CBO (famílias 2142 a 2149, 2221) e marca as ocupações com rótulo “analista” que a CBO lista como sinônimo.',
    falta: 'Dicionário CBO oficial completo na camada de mercado de trabalho.' },
  { n: 7, titulo: 'Câmara por CNAE é aproximação', decisao: 'Rotulada',
    oQueMudou: 'Câmara indicada como aproximação pelo CNAE principal nas fichas e no método. No cenário nenhuma empresa cai no valor padrão.',
    falta: 'Cadastro técnico com relação N:N entre atividade, atribuição e modalidade.' },
  { n: 8, titulo: 'Contexto público está congelado', decisao: 'Corrigida',
    oQueMudou: 'A aba Contexto saiu na V20. Ficam só fontes de coleta automática periódica (INEP anual, CAGED mensal, Transparência) ou por convênio; o Portal Salário (coleta pontual, fonte secundária) foi retirado. Cada ficha diz a rotina de coleta.',
    falta: 'Conectores da Etapa 3 com competência, captura e alerta de atraso; RAIS e CAGED primários.' },
  { n: 9, titulo: 'Formação não prevê concluintes individualmente', decisao: 'Corrigida',
    oQueMudou: 'A V20 cruza concluintes do Censo por IES e ano com os registrados que informam a mesma IES e ano de conclusão, em agregado, e calcula três taxas por coorte (registro em 24 meses, atividade, permanência).',
    falta: 'Lista nominal de formandos das IES que aderirem; canal (presencial, EaD) por pessoa no Censo.' },
  { n: 10, titulo: 'Comparações exigem coortes e tempos compatíveis', decisao: 'Corrigida',
    oQueMudou: 'Conversão da fiscalização por coorte trimestral com 180 dias completos; tempo até agir com casos abertos censurados; receita atribuível pela data do pagamento; forças-tarefas contra grupo de comparação do mesmo tipo e período. Todos dizem “associação no tempo”.',
    falta: 'Linha de base medida na Etapa 0 e dois ciclos antes de fixar metas.' },
  { n: 11, titulo: 'Público/restrito deve ser camada de dados', decisao: 'Rotulada',
    oQueMudou: 'Sem grafos de pessoas nem salários individuais no navegador. Listas nominais seguem demonstrativas; profissionais aparecem sem CPF.',
    falta: 'Segurança por linha (cada GRE vê a sua) e perfis no modelo semântico, não no front-end.' },
  { n: 12, titulo: 'Responsividade mudou em relação à V13', decisao: 'Rotulada',
    oQueMudou: 'As abas rolam em 1366×768. A V20 acrescenta a data de referência no cabeçalho e onze abas no trilho, com rótulos curtos.',
    falta: 'Reestruturação autorizada do layout se o uso em reunião pedir uma tela só.' },
];

/* ---------- 34 casos de uso: o bloco do painel que atende cada um ---------- */
export type SituacaoCaso = 'No painel' | 'Parcial' | 'Depende de acordo' | 'Fora da coleta automática';
export const situacoesCaso: SituacaoCaso[] = ['No painel', 'Parcial', 'Depende de acordo', 'Fora da coleta automática'];
/** Caso → situação e bloco (aba · bloco). "Fora da coleta automática" = a fonte ainda não tem captura periódica. */
const ondeEsta: Record<string, [SituacaoCaso, string]> = {
  UC01: ['No painel', 'Empresas · três contagens'], UC02: ['No painel', 'Presidência · indicador-norte 1; Empresas · conciliação Receita × Crea-SP'], UC03: ['No painel', 'Empresas · entradas e saídas; ponte da base'],
  UC04: ['Parcial', 'Empresas · saídas; a coorte de permanência de empresas ainda não é exibida'], UC05: ['Fora da coleta automática', 'Aberturas e baixas da Receita por GRE: exige a carga mensal do CNPJ com data de abertura e baixa'],
  UC06: ['No painel', 'Atendimento · qualidade do cadastro; Malha fina · CNPJ inativo'], UC07: ['Depende de acordo', 'QSA com CPF completo (Conecta ou acordo); retirado da V18'],
  UC08: ['No painel', 'Empresas · quadro técnico; Profissionais · carga de RT'], UC09: ['No painel', 'Malha fina · RT baixado sem substituto'], UC10: ['No painel', 'Empresas · ARTs por regional, modalidade e sem ART; Profissionais · ARTs por autor'], UC11: ['No painel', 'Empresas · prazo da certidão de acervo operacional'],
  UC12: ['Parcial', 'Malha fina · contratos técnicos do período (cenário; em produção, PNCP diário)'], UC13: ['No painel', 'Malha fina · fornecedor na data do contrato'], UC14: ['No painel', 'Malha fina · contrato e ART em três graus; obra sem ART de fiscalização'],
  UC15: ['Fora da coleta automática', 'Painel de obras públicas: exige PNCP (obras) e CNO com captura periódica'], UC16: ['Depende de acordo', 'Campos ART/RRT do CNO no Serpro'], UC17: ['Depende de acordo', 'Alvarás e AVCB (prefeituras e Corpo de Bombeiros)'],
  UC18: ['Fora da coleta automática', 'Setores regulados (ANEEL, ANP, ANATEL): fontes públicas sem conector periódico ainda'], UC19: ['Fora da coleta automática', 'Financiamentos BNDES: base pública, sem conector periódico ainda'], UC20: ['No painel', 'Malha fina · empresas com dois ou mais indícios (11 regras, status e coleta)'],
  UC21: ['No painel', 'Receita · inadimplência e saldo vencido'], UC22: ['No painel', 'Receita · arrecadação; Presidência · receita atribuível'], UC23: ['No painel', 'Receita · recuperação da dívida'], UC24: ['No painel', 'Atendimento · prazos; Empresas · prazo de registro'],
  UC25: ['No painel', 'Profissionais · emprego por CBO (agregado); Malha fina · quadrante cobertura × emprego'], UC26: ['No painel', 'Profissionais · remuneração mediana × duas leituras do piso (CAGED mensal, agregado)'], UC27: ['No painel', 'Formação · concluintes por ano, canal, IES e modalidade (INEP anual)'],
  UC28: ['Parcial', 'Formação · três taxas por coorte em agregado por IES e ano; a taxa nominal depende da lista das IES'], UC29: ['Depende de acordo', 'DataJud e TJSP: perícias por processo'], UC30: ['Depende de acordo', 'Perito nomeado sem registro: captura do DJE e e-SAJ'],
  UC31: ['Fora da coleta automática', 'Densidade empresarial com IBGE e Seade: agregados anuais, conector ainda não ligado'], UC32: ['Fora da coleta automática', 'Monitor legislativo: Câmara, Senado e Alesp, sem conector ainda'], UC33: ['Fora da coleta automática', 'Planos de contratação (PNCP): endpoint público, conector ainda não ligado'], UC34: ['Fora da coleta automática', 'Concentração do mercado público: PNCP por órgão e fornecedor, conector ainda não ligado'],
};
export interface Caso { id: string; nome: string; grupo: string; resumo: string; prioridade: string; gestao: string; situacao: SituacaoCaso; onde: string }
export const casos: Caso[] = casosJson.casos.map(row => { const [situacao, onde] = ondeEsta[row.id] ?? ['Fora da coleta automática', '—']; return { ...row, situacao, onde }; });

/* ---------- Atlas unificado de fontes, com a forma de coleta ---------- */
export interface Fonte { fonte: string; orgao: string; tema: string; acesso: string; rotina: string; chaves: string; valor: string; evidencia: string; data: string; origem: string }
export const fontes: Fonte[] = fontesJson.fontes;
/** Níveis de evidência do atlas, do mais forte ao mais fraco. */
export const niveisEvidencia = ['amostra', 'contrato', 'documentação', 'pista', 'parceria', 'reuso'];
export type Coleta = 'Automática' | 'Convênio' | 'Fora da coleta automática';
export const coletas: Coleta[] = ['Automática', 'Convênio', 'Fora da coleta automática'];
const rotinaPeriodica = /diári|semanal|mensal|trimestral|semestral|anual|bimestral|periódica|contínua|dinâmica|por série|por semestre|segue as fontes|conforme a rfb|conforme conjunto/i;
/**
 * Forma de coleta de cada fonte, derivada do acesso e da rotina do atlas: pública com rotina periódica → automática; por convênio,
 * chave ou acesso restrito → convênio; sob demanda, eventual, descontinuada, a confirmar ou sem rotina → fora da coleta automática.
 */
export function coletaDe(fonte: Fonte): Coleta {
  if (fonte.acesso !== 'Público') return 'Convênio';
  return rotinaPeriodica.test(fonte.rotina) ? 'Automática' : 'Fora da coleta automática';
}
/** Como cada fonte aparece na V20: simulada no cenário demonstrativo ou dado real versionado, e em que aba. */
export const usoNoPainel: Record<string, string> = {
  'CNPJ · dados abertos': 'Simulada: cobertura, malha fina, sucessão, nome de engenharia', 'PNCP · Portal Nacional de Contratações': 'Simulada: contratos, ART e obras sem fiscalização',
  'Novo CAGED · microdados': 'Simulada em agregado: Profissionais (emprego e remuneração por CBO), quadrante', 'RAIS · microdados': 'Simulada em agregado: Profissionais, quadrante',
  'INEP · Censo da Educação Superior': 'Simulada por IES e ano: Formação (três taxas por coorte)', 'CREA-SP · Portal da Transparência': 'Real: Controle interno (despesa publicada); simulada: fim × meio, diárias, contratos, receita',
  'Confea · normativos e relatório estatístico': 'Real: pisos (Lei 4.950-A e leitura Confea) em Profissionais', 'IBGE · SIDRA / Agregados v3': 'Real: população nas fichas', 'IBGE · localidades e malhas': 'Real: mapas das regionais',
  'RAIS identificada / eSocial': 'Retirada da V18 (depende de acordo com o MTE)',
};

/* ---------- Ferramentas de IA e análises avançadas que alimentam o painel ---------- */
export type TipoFerramenta = 'Classificador' | 'Pareamento' | 'Anomalia' | 'Extração' | 'Previsão';
export type SituacaoFerramenta = 'No painel' | 'Protótipo' | 'Planejada';
export interface FerramentaIa { nome: string; tipo: TipoFerramenta; bloco: string; entrada: string; saida: string; validacao: string; situacao: SituacaoFerramenta }
/**
 * O que roda fora da ferramenta de BI e entra no painel como candidato, nunca como fato. Toda saída tem validação humana e taxa de
 * falso positivo medida antes de virar regra; a versão da regra e a data ficam na ficha do bloco.
 */
export const ferramentasIa: FerramentaIa[] = [
  { nome: 'Classificador de objeto de contrato (PNCP)', tipo: 'Classificador', bloco: 'Malha fina · contratos públicos técnicos e ART', entrada: 'Objeto, modalidade, valor e CNAE do fornecedor de cada contrato do PNCP', saida: 'Probabilidade de o contrato ser obra ou serviço de engenharia (prob_eng_obra) e prioridade (mk_score), com verificação por modelo de linguagem nos casos ambíguos (llm_verif)', validacao: 'Amostra revisada pela SUPFIS; categoria “objeto ambíguo” fica fora das contagens confirmadas', situacao: 'Protótipo' },
  { nome: 'Pareamento de registros (record linkage)', tipo: 'Pareamento', bloco: 'Malha fina · sucessão de empresas; nome de engenharia sem registro', entrada: 'Razão social, nome fantasia, município, CNAE, RT e datas de baixa e abertura', saida: 'Pares candidatos com pontuação de semelhança; RT em comum e endereço igual elevam a prioridade', validacao: 'Status “Candidato”: análise societária e jurídica antes de qualquer tratativa; falso positivo medido por amostra', situacao: 'No painel' },
  { nome: 'Classificador de nomes de engenharia', tipo: 'Classificador', bloco: 'Malha fina · nome de engenharia sem registro', entrada: 'Razão social e nome fantasia dos CNPJs ativos sem registro', saida: 'Indício de apresentação ao mercado como empresa de engenharia (regra por termos na V20; classificador treinado em produção)', validacao: 'Validação humana por amostra; a regra nunca gera auto', situacao: 'No painel' },
  { nome: 'Detecção de padrão anormal de ART', tipo: 'Anomalia', bloco: 'Malha fina · padrão anormal de ART por profissional', entrada: 'ARTs por autor, empresa, regional e mês', saida: 'Autores acima de três vezes a mediana com dispersão em empresas ou regionais (regra v2); em produção, modelo de anomalia por modalidade e porte', validacao: 'Conferência de compatibilidade de tempo e área pela câmara antes de qualquer tratativa', situacao: 'No painel' },
  { nome: 'Extração de nomeações de peritos (DJE e e-SAJ)', tipo: 'Extração', bloco: 'Malha fina · perito nomeado sem registro (regra pendente)', entrada: 'Texto dos diários e andamentos processuais', saida: 'Nome, registro informado e comarca da nomeação, para cruzar com o cadastro profissional', validacao: 'Depende do acordo com o TJSP; fora da coleta automática até lá', situacao: 'Planejada' },
  { nome: 'Previsão de fila e prazo de atendimento', tipo: 'Previsão', bloco: 'Atendimento · solicitações por mês; Empresas · prazo de registro', entrada: 'Série mensal de solicitações, prazos e resoluções por regional e assunto', saida: 'Previsão de volume e de risco de atraso nos próximos 3 meses, com intervalo', validacao: 'Erro medido contra o realizado a cada mês; entra no painel só depois de dois ciclos', situacao: 'Planejada' },
  { nome: 'Leitura automática do período', tipo: 'Extração', bloco: 'Presidência · leitura do período', entrada: 'Medidas de todos os blocos, metas de leitura e comparações ao ano anterior', saida: 'Frases curtas com o destaque de cada assunto (regras na V20; redação por modelo de linguagem em avaliação)', validacao: 'Toda frase cita a medida e o bloco de origem; sem inferência de causa', situacao: 'No painel' },
];
