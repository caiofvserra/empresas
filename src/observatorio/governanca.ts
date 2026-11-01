import casosJson from './casos-uso.json';
import fontesJson from './fontes.json';

/**
 * V20 · o que o projeto elaborou e o painel aplica: as frentes e a matriz de cruzamentos do mapa de relações (MAPA_RELACOES.md), decisão sobre cada uma
 * das 12 lacunas do V18 (planejamento-fontes-2026-10/REVISAO_REPOSITORIO.md), o bloco do painel que atende cada um dos 34 casos
 * de uso (CASOS_USO.md), o atlas unificado de 98 fontes (observatorio/catalogo-fontes-unificado.csv) com a forma de coleta e as
 * ferramentas de IA e análises avançadas que alimentam o painel. Os JSON vêm de scripts/gerar-observatorio.py.
 * Regra da V20: só entram no painel fontes de coleta automática periódica ou por convênio; coleta pontual fica fora.
 */

export type SituacaoCaso = 'No painel' | 'Parcial' | 'Depende de acordo' | 'Fora da coleta automática';
export const situacoesCaso: SituacaoCaso[] = ['No painel', 'Parcial', 'Depende de acordo', 'Fora da coleta automática'];

/* ---------- Frentes de cruzamento e matriz dos principais cruzamentos (planejamento-fontes-2026-10/MAPA_RELACOES.md) ---------- */
export type ColetaFrente = 'Automática' | 'Convênio' | 'Mista' | 'Interna';
export type SituacaoCruzamento = SituacaoCaso | 'Planejada';
export const situacoesCruzamento: SituacaoCruzamento[] = ['No painel', 'Parcial', 'Planejada', 'Depende de acordo', 'Fora da coleta automática'];
export interface Frente { id: string; frente: string; fontes: string; potencial: string; coleta: ColetaFrente; situacao: SituacaoCruzamento; noPainel: string }
/** As oito frentes externas do mapa de relações, com o potencial mais relevante de cada uma, e a base interna do Crea-SP. */
export const frentes: Frente[] = [
  { id: 'rfb', frente: 'RFB, CNAEs e QSA', fontes: 'Dados abertos do CNPJ (Receita Federal), tabela CNAE, QSA aberto, JUCESP', potencial: 'Universo empresarial, filiais, mudanças cadastrais e relações societárias identificáveis', coleta: 'Automática', situacao: 'Parcial', noPainel: 'Empresas · conciliação e cobertura; Malha fina · CNAE sem registro, sucessão, nome de engenharia. Rede societária de sócios PJ ainda não entrou; sócio PF depende de acordo (CPF completo).' },
  { id: 'pncp', frente: 'PNCP e Obrasgov', fontes: 'PNCP e Compras.gov.br; Obrasgov e Transferegov (CIPI)', potencial: 'Relacionar fornecedor, contrato, projeto CIPI e ART quando houver ponte documental', coleta: 'Automática', situacao: 'Parcial', noPainel: 'Malha fina · contratos públicos técnicos e ART (três graus), obra pública sem ART de fiscalização. Obrasgov e CIPI ainda não capturados.' },
  { id: 'reg', frente: 'ANEEL, ANP e BNDES', fontes: 'ANEEL SIGA e agentes, ANP autorizações, ANM processos, BNDES operações', potencial: 'Identificar empresas, instalações e investimentos com atividade técnica observável', coleta: 'Automática', situacao: 'Planejada', noPainel: 'Ainda não entrou. Planejado como contexto por empresa e regional: instalações e operações com CNPJ do agente, nunca como prova de que o agente é projetista, instalador ou RT.' },
  { id: 'cno', frente: 'CNO e municípios', fontes: 'CNO autorizado (Serpro), alvarás e licenças municipais, CETESB, IBAMA, ANA', potencial: 'Relacionar obras, licenciamento e documentos técnicos; parte depende de compartilhamento autorizado', coleta: 'Convênio', situacao: 'Depende de acordo', noPainel: 'Fora do painel até o acordo. Entraria em Malha fina · obra sem ART e em Fiscalização · alvos, com o campo ART do CNO verificado.' },
  { id: 'mte', frente: 'INEP, Seade, RAIS e CAGED', fontes: 'Censo da Educação Superior (INEP), Seade, RAIS e Novo CAGED por CBO, CNAE e município', potencial: 'Formação, emprego e remuneração em agregações compatíveis, sem inventar vínculos nominais', coleta: 'Automática', situacao: 'No painel', noPainel: 'Formação · três taxas por coorte, por IES, modalidade, canal e natureza; Profissionais · emprego e remuneração por CBO (agregado); Malha fina · quadrante emprego × registro.' },
  { id: 'trib', frente: 'Tribunais', fontes: 'DJE e e-SAJ (TJSP), DataJud (CNJ)', potencial: 'Nomeações e especialidades relacionadas à ART; DataJud sozinho não fornece esse conjunto completo', coleta: 'Mista', situacao: 'Depende de acordo', noPainel: 'Fora do painel. A extração das nomeações no DJE é automática, mas a identidade do perito e a especialidade dependem do acordo com o TJSP; entraria em Malha fina · perito nomeado sem registro.' },
  { id: 'tce', frente: 'TCE, IBGE e Banco Central', fontes: 'TCE-SP (despesa e contratos municipais), IBGE (SIDRA, malhas, população), BCB (crédito)', potencial: 'Contratações, pagamentos e contexto territorial/econômico', coleta: 'Mista', situacao: 'Parcial', noPainel: 'IBGE real nos mapas e nas fichas (população). Despesa e pagamentos do TCE-SP e crédito do BCB ainda não entraram; o TCE-SP é o primeiro acordo sugerido no plano.' },
  { id: 'leg', frente: 'Câmara, Senado e ALESP', fontes: 'APIs de dados abertos da Câmara, do Senado e da ALESP', potencial: 'Monitoramento de mudanças normativas relevantes', coleta: 'Automática', situacao: 'Planejada', noPainel: 'Ainda não entrou. Planejado como lista de proposições por assunto validado em Método, nunca como norma aprovada só por projeto.' },
  { id: 'crea', frente: 'Bases internas do Crea-SP', fontes: 'SQL Server e Db2: registro, RT, ART, CAO, financeiro, fiscalização, atendimento', potencial: 'Registro, responsabilidade técnica, ART, acervo e financeiro com chaves e histórico de início e fim', coleta: 'Interna', situacao: 'No painel', noPainel: 'Todas as abas; a data de referência lê essas bases como estavam em D. A ação fiscal ainda não tem campo de origem; a lista de forças-tarefas é demonstrativa.' },
];
export const frentePorId = Object.fromEntries(frentes.map(row => [row.id, row])) as Record<string, Frente>;

export interface RegraLeitura { cruzamento: string; frente: string; chave: string; pode: string; naoPode: string; situacao: SituacaoCruzamento; noPainel: string }
/** Matriz dos principais cruzamentos do mapa de relações: chave e condição, o que resulta, o que não permite concluir e onde está no painel. */
export const regrasLeitura: RegraLeitura[] = [
  { cruzamento: 'RFB × registro/visto CREA', frente: 'rfb', chave: 'CNPJ completo, raiz como consolidação separada; situações e datas', pode: 'Correspondência exata no universo selecionado; divergências', naoPode: 'Obrigação de registro ou infração apenas pelo CNAE', situacao: 'No painel', noPainel: 'Presidência · indicador-norte 1; Empresas · conciliação Receita × Crea-SP; Malha fina · CNAE sem registro' },
  { cruzamento: 'QSA PJ × RFB × CREA', frente: 'rfb', chave: 'CNPJ do sócio PJ e da empresa investida; papel e fotografia', pode: 'Rede societária declarada e presença cadastral', naoPode: 'Controle final, favorecimento ou identidade de PF por nome ou CPF parcial', situacao: 'Planejada', noPainel: 'Ainda não entrou: rede de sócios PJ é candidata à próxima versão; sócio PF depende de acordo' },
  { cruzamento: 'PNCP × CREA', frente: 'pncp', chave: 'Identificador do fornecedor e vigência na data escolhida', pode: 'Fornecedores em contratos técnicos com registro ou visto identificado', naoPode: 'Que fornecedor sem correspondência esteja irregular', situacao: 'No painel', noPainel: 'Malha fina · contrato técnico com fornecedor sem registro na data' },
  { cruzamento: 'PNCP × ART', frente: 'pncp', chave: 'Contrato ou compra, partes, objeto, local e referência validados', pode: 'Rastreabilidade documental dos contratos', naoPode: 'Vínculo confirmado por qualquer ART da empresa na mesma época', situacao: 'No painel', noPainel: 'Malha fina · contratos públicos técnicos e ART, em três graus' },
  { cruzamento: 'PNCP × Obrasgov', frente: 'pncp', chave: 'CIPI, identificadores e documentos presentes em ambas as fontes', pode: 'Contrato associado a projeto, localização e execução', naoPode: 'Cobertura universal da ponte ou obra executada só pela publicação', situacao: 'Planejada', noPainel: 'Obrasgov ainda não capturado; entraria em Malha fina · obra pública sem ART de fiscalização' },
  { cruzamento: 'Obrasgov × ART', frente: 'pncp', chave: 'Projeto, contrato, obra e referências verificadas', pode: 'Documentação técnica relacionada ao empreendimento', naoPode: 'Ausência de responsabilidade só porque a ponte ainda não foi encontrada', situacao: 'Planejada', noPainel: 'Depende da captura do Obrasgov' },
  { cruzamento: 'CNO × ART', frente: 'cno', chave: 'Campo ART com formato verificado; obra e responsável', pode: 'Correspondência obra–documento; qualidade de preenchimento', naoPode: 'Que responsável tributário seja RT ou executor; acesso público anônimo', situacao: 'Depende de acordo', noPainel: 'Fora do painel até o CNO autorizado' },
  { cruzamento: 'Alvará/licença × ART', frente: 'cno', chave: 'Processo, cadastro imobiliário ou referência oficial; geografia auxilia', pode: 'Empreendimentos com documentação identificada', naoPode: 'Correspondência determinística por endereço ou nome do interessado', situacao: 'Depende de acordo', noPainel: 'Fora do painel até acordos municipais' },
  { cruzamento: 'ANEEL SIGA × agentes × CREA', frente: 'reg', chave: 'CEG → agente/CNPJ; vigência e participações', pode: 'Usinas e agentes com presença cadastral; expansão regional', naoPode: 'Que agente seja projetista, instalador ou RT', situacao: 'Planejada', noPainel: 'Contexto por regional planejado' },
  { cruzamento: 'ANP × RFB × CREA', frente: 'reg', chave: 'CNPJ do estabelecimento autorizado, local e data', pode: 'Universo de instalações e operadores selecionados', naoPode: 'Que autorização ANP implique a mesma obrigação em todos os casos', situacao: 'Planejada', noPainel: 'Contexto por regional planejado' },
  { cruzamento: 'ANM × titulares × CREA', frente: 'reg', chave: 'Processo e cadastro complementar identificado; camada sem CNPJ não basta', pode: 'Empreendimentos minerários com titular confirmado', naoPode: 'Mina em operação ou titular identificado apenas por nome', situacao: 'Planejada', noPainel: 'Contexto por regional planejado' },
  { cruzamento: 'IBAMA/CETESB/ANA × CREA', frente: 'cno', chave: 'CNPJ quando disponível; licença, outorga ou empreendimento; papéis', pode: 'Atividades e demandas técnicas específicas', naoPode: 'Que todo licenciado seja prestador de serviço profissional', situacao: 'Planejada', noPainel: 'Contexto de licenciamento planejado' },
  { cruzamento: 'BNDES × RFB/CREA × PNCP', frente: 'reg', chave: 'CNPJ, projeto, contrato ou município, conforme o recurso', pode: 'Investimento apoiado e presença cadastral e técnica observável', naoPode: 'Financiamento como receita, contrato público ou obra concluída', situacao: 'Planejada', noPainel: 'Contexto por regional planejado' },
  { cruzamento: 'TCE despesa × contrato/fornecedor', frente: 'tce', chave: 'Empenho, processo ou contrato com ponte validada; de-para municipal', pode: 'Valores publicados em etapas financeiras distintas', naoPode: 'Parecer de regularidade do tribunal ou somar valores PNCP, empenho e pagamento', situacao: 'Depende de acordo', noPainel: 'Primeiro acordo sugerido no plano (TCE-SP)' },
  { cruzamento: 'Nomeação judicial × ART', frente: 'trib', chave: 'Processo CNJ, ato, identidade autorizada e especialidade', pode: 'Nomeações técnicas com documentação identificada', naoPode: 'Profissão do perito inferida pelo assunto; que laudo demonstre necessidade legal do título', situacao: 'Depende de acordo', noPainel: 'Malha fina · regra pendente (perito nomeado sem registro); extração no DJE planejada' },
  { cruzamento: 'RT × ART × CAO', frente: 'crea', chave: 'Relações internas com vigência e atividades', pode: 'Continuidade técnica e acervo empresarial documentado', naoPode: 'RT ativo sozinho provar cobertura de qualquer atividade', situacao: 'No painel', noPainel: 'Empresas · quadro técnico, RT baixado sem substituto, certidões; Profissionais · carga de RT' },
  { cruzamento: 'Emprego × cadastro/ART', frente: 'mte', chave: 'Município × CNAE × tempo em nível compatível', pode: 'Diferença de trajetórias setoriais e territoriais', naoPode: 'Empregados nominais da empresa ou efeito causal da atuação do Crea', situacao: 'No painel', noPainel: 'Profissionais · emprego e remuneração por CBO; Malha fina · quadrante emprego × registro' },
  { cruzamento: 'Formação × ingresso CREA', frente: 'mte', chave: 'Agregado compatível; nominal apenas em coorte interna autorizada', pode: 'Oferta regional e ingresso observado após conclusão', naoPode: 'Todos os concluintes registrados; taxa individual INEP sem identificação autorizada', situacao: 'Parcial', noPainel: 'Formação · três taxas por coorte (agregado por IES e ano); coorte nominal depende das listas das IES' },
  { cruzamento: 'Crédito/PIB/população × empresas', frente: 'tce', chave: 'Dimensões, tempo e abrangência compatíveis', pode: 'Contexto econômico e escalas territoriais', naoPode: 'Crédito, faturamento ou produtividade de um CNPJ específico', situacao: 'Parcial', noPainel: 'População (IBGE) nas fichas e mapas; PIB e crédito ainda não entraram' },
  { cruzamento: 'Câmara/Senado/ALESP × setores', frente: 'leg', chave: 'ID da proposição, assunto validado, vigência ou etapa', pode: 'Mudanças potenciais que afetam atividades e empresas', naoPode: 'Norma aprovada só por projeto; relevância garantida por palavra-chave', situacao: 'Planejada', noPainel: 'Monitoramento normativo planejado em Método' },
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
