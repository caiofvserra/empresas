import casosJson from './casos-uso.json';
import fontesJson from './fontes.json';

/**
 * V20/V21 · o que o projeto elaborou e o painel aplica: as frentes e a matriz de cruzamentos do mapa de relações (MAPA_RELACOES.md), decisão sobre cada uma
 * das 12 lacunas do V18 (planejamento-fontes-2026-10/REVISAO_REPOSITORIO.md), o bloco do painel que atende cada um dos 34 casos
 * de uso (CASOS_USO.md), o atlas unificado de 98 fontes (observatorio/catalogo-fontes-unificado.csv) com a forma de coleta e as
 * ferramentas de IA e análises avançadas que alimentam o painel. Os JSON vêm de scripts/gerar-observatorio.py.
 * Regra da V20: só entram no painel fontes de coleta automática periódica ou por convênio; coleta pontual fica fora.
 * V21: as frentes com fonte automática entraram como camadas (QSA PJ, Obrasgov/CIPI, ANEEL/ANP/ANM/BNDES, PCA, população), o radar
 * normativo entrou como estrutura demonstrativa e o gate de promoção de fontes (revisão independente de 29/10) passou a ser mostrado.
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
  { id: 'rfb', frente: 'Receita Federal, atividades e sócios', fontes: 'Dados abertos do CNPJ da Receita Federal, tabela de atividades (CNAE), quadro de sócios e Junta Comercial (JUCESP)', potencial: 'Conhecer todas as empresas e filiais, as mudanças no cadastro e as ligações entre sócios', coleta: 'Automática', situacao: 'Parcial', noPainel: 'Na aba Empresas: comparação com a Receita, cobertura, rede de sócios empresas, aberturas e sócios pessoas físicas (!, que dependem de acordo para o CPF completo). Na Malha fina: atividade sem registro, sucessão de empresas, nome de engenharia e empresa sócia sem registro.' },
  { id: 'pncp', frente: 'Contratos públicos e obras públicas', fontes: 'PNCP e Compras.gov.br; Obrasgov e Transferegov, com o código de projeto CIPI', potencial: 'Ligar fornecedor, contrato, obra e ART quando houver documento que os ligue', coleta: 'Automática', situacao: 'No painel', noPainel: 'Na Malha fina: contratos públicos de engenharia e suas ARTs, e obras sem ART de fiscalização. Na Fiscalização: obras públicas por situação e mercado público, com a concentração de fornecedores e a demanda planejada.' },
  { id: 'reg', frente: 'Agências reguladoras e BNDES', fontes: 'ANEEL (geração e agentes), ANP (autorizações), ANM (processos minerários) e BNDES (financiamentos)', potencial: 'Encontrar empresas, instalações e investimentos com atividade técnica visível', coleta: 'Automática', situacao: 'No painel', noPainel: 'Na aba Empresas: instalações e investimentos por regional e fonte, com a empresa identificada pelo CNPJ e sua situação no cadastro. Ser a empresa responsável não a torna projetista, instaladora ou RT.' },
  { id: 'cno', frente: 'Obras privadas e licenças', fontes: 'Cadastro Nacional de Obras (com acesso autorizado pelo Serpro), alvarás municipais, CETESB, IBAMA e ANA', potencial: 'Ligar obras, licenças e documentos técnicos. Parte depende de acesso autorizado', coleta: 'Convênio', situacao: 'Depende de acordo', noPainel: 'Entrou como demonstração (!). Na Fiscalização: obras privadas e o campo de ART, e licenças e alvarás das prefeituras, dos Bombeiros e da CETESB. Na Malha fina: obra privada sem ART e alvará ou licença sem ART. Os números só serão reais com os acordos.' },
  { id: 'mte', frente: 'Educação e trabalho', fontes: 'Censo da Educação Superior (INEP), Fundação Seade, RAIS e Novo CAGED por ocupação, atividade e município', potencial: 'Formação, emprego e salários em totais, sem criar ligações com pessoas', coleta: 'Automática', situacao: 'No painel', noPainel: 'Na Formação: as três taxas por ano de formatura, por instituição, modalidade, canal e natureza, e a lista nominal das instituições parceiras (!). Em Profissionais: emprego e salário por ocupação, em totais, e empregados técnicos por empresa (!, pela RAIS identificada). Na Malha fina: emprego comparado com registro por regional.' },
  { id: 'trib', frente: 'Tribunais', fontes: 'Diário da Justiça e e-SAJ do TJSP; DataJud do CNJ', potencial: 'Nomeações de peritos e especialidades ligadas à ART. O DataJud sozinho não traz esses dados', coleta: 'Mista', situacao: 'Depende de acordo', noPainel: 'Entrou como demonstração (!). Em Profissionais: perícias judiciais, com nomeações por especialidade, ART encontrada e peritos sem registro ativo. A leitura do Diário pode ser automática, mas a identidade do perito depende do acordo com o TJSP.' },
  { id: 'tce', frente: 'Tribunal de Contas, IBGE e Banco Central', fontes: 'TCE-SP (despesa e contratos dos municípios), IBGE (tabelas, mapas e população) e Banco Central (crédito)', potencial: 'Pagamentos dos contratos e o contexto econômico de cada região', coleta: 'Mista', situacao: 'Parcial', noPainel: 'Os dados do IBGE são reais nos mapas e nas fichas, e a população e o PIB entram na aba Empresas. Entraram como demonstração (!) os pagamentos por contrato do TCE-SP, na Fiscalização, e o crédito por regional do Banco Central, na aba Empresas.' },
  { id: 'leg', frente: 'Câmara, Senado e Assembleia Legislativa', fontes: 'Dados abertos da Câmara dos Deputados, do Senado e da ALESP', potencial: 'Acompanhar projetos de lei que mudam as regras da engenharia', coleta: 'Automática', situacao: 'Parcial', noPainel: 'No Método: radar de projetos, com casa, proposição, assunto, etapa e última tramitação. A lista é demonstrativa até a coleta entrar em funcionamento. Projeto em tramitação não é lei.' },
  { id: 'crea', frente: 'Bases internas do Crea-SP', fontes: 'Bancos SQL Server e Db2: registro, responsáveis técnicos, ART, acervo, financeiro, fiscalização e atendimento', potencial: 'Registro, responsabilidade técnica, ART, acervo e financeiro, com o início e o fim de cada fato', coleta: 'Interna', situacao: 'No painel', noPainel: 'Todas as abas. A data no alto da tela lê essas bases como estavam naquele dia. A ação fiscal ainda não registra de onde veio, e a lista de forças-tarefas é demonstrativa.' },
];
export const frentePorId = Object.fromEntries(frentes.map(row => [row.id, row])) as Record<string, Frente>;

export interface RegraLeitura { cruzamento: string; frente: string; chave: string; pode: string; naoPode: string; situacao: SituacaoCruzamento; noPainel: string }
/** Matriz dos principais cruzamentos do mapa de relações: chave e condição, o que resulta, o que não permite concluir e onde está no painel. */
export const regrasLeitura: RegraLeitura[] = [
  { cruzamento: 'Receita Federal e registro no Crea-SP', frente: 'rfb', chave: 'CNPJ completo, com a raiz em conta separada, e as situações e datas de cada base', pode: 'Saber quem está nas duas bases e onde elas divergem', naoPode: 'Concluir que há obrigação de registro ou infração só pela atividade (CNAE)', situacao: 'No painel', noPainel: 'Presidência, indicador principal 1; Empresas, comparação com a Receita; Malha fina, atividade sem registro' },
  { cruzamento: 'Empresas sócias e cadastro do Crea-SP', frente: 'rfb', chave: 'CNPJ da empresa sócia e da empresa investida, no arquivo mais recente da Receita', pode: 'Ver a rede de sócios declarada e quem dela está no cadastro', naoPode: 'Dizer quem controla de fato, apontar favorecimento ou identificar pessoas pelo nome ou por parte do CPF', situacao: 'No painel', noPainel: 'Empresas, rede de sócios empresas; Malha fina, empresa sócia de engenharia sem registro (contexto). Sócios pessoas físicas dependem de acordo' },
  { cruzamento: 'Contratos públicos e registro', frente: 'pncp', chave: 'CNPJ do fornecedor e a situação do registro na data do contrato', pode: 'Saber quais fornecedores de contratos de engenharia têm registro ou visto', naoPode: 'Concluir que o fornecedor não encontrado esteja irregular', situacao: 'No painel', noPainel: 'Malha fina, contrato com fornecedor sem registro na data' },
  { cruzamento: 'Contratos públicos e ART', frente: 'pncp', chave: 'Número do contrato ou da compra, partes, objeto e local', pode: 'Saber quais contratos têm ART documentada', naoPode: 'Dar a ligação por confirmada só porque a empresa tem alguma ART na mesma época', situacao: 'No painel', noPainel: 'Malha fina, contratos públicos e ART, em três graus de confiança' },
  { cruzamento: 'Contratos públicos e obras públicas', frente: 'pncp', chave: 'Código CIPI e documentos presentes nas duas fontes', pode: 'Ligar o contrato ao projeto, ao local e à execução', naoPode: 'Supor que todo contrato tem obra ligada, ou que a obra foi executada só porque foi publicada', situacao: 'No painel', noPainel: 'Fiscalização, obras públicas por situação e pela ligação com o contrato' },
  { cruzamento: 'Obras públicas e ART', frente: 'pncp', chave: 'Projeto, contrato e obra, com referências conferidas', pode: 'Encontrar a documentação técnica da obra', naoPode: 'Concluir que falta responsável técnico só porque a ligação ainda não foi encontrada', situacao: 'No painel', noPainel: 'Fiscalização, obras com ART de execução e de fiscalização; Malha fina, obra sem ART de fiscalização' },
  { cruzamento: 'Obras privadas e ART', frente: 'cno', chave: 'Campo de ART do cadastro de obras, com formato conferido, a obra e o responsável', pode: 'Ligar a obra ao documento técnico e medir o preenchimento do campo', naoPode: 'Tratar o responsável pelos tributos como RT ou executor. O cadastro não é público', situacao: 'Depende de acordo', noPainel: 'Fiscalização, obras privadas (!); Malha fina, obra privada sem ART (!). Demonstrativo até o acesso autorizado' },
  { cruzamento: 'Alvarás e licenças e ART', frente: 'cno', chave: 'Número do processo, cadastro do imóvel ou outra referência oficial; o endereço só ajuda', pode: 'Encontrar empreendimentos com documentação técnica', naoPode: 'Ligar com certeza só pelo endereço ou pelo nome do interessado', situacao: 'Depende de acordo', noPainel: 'Fiscalização, licenças e alvarás (!); Malha fina, alvará ou licença sem ART (!). Demonstrativo até os acordos com as prefeituras e os Bombeiros' },
  { cruzamento: 'Usinas de energia e cadastro', frente: 'reg', chave: 'Código da usina ligado à empresa (CNPJ), com vigência e participações', pode: 'Ver usinas e empresas no cadastro e a expansão por região', naoPode: 'Concluir que a empresa é projetista, instaladora ou RT', situacao: 'No painel', noPainel: 'Empresas, instalações e investimentos da ANEEL, por regional' },
  { cruzamento: 'Postos e instalações de combustível e cadastro', frente: 'reg', chave: 'CNPJ do estabelecimento autorizado, local e data', pode: 'Conhecer as instalações e os operadores', naoPode: 'Supor que toda autorização da ANP gera a mesma obrigação', situacao: 'No painel', noPainel: 'Empresas, instalações e investimentos da ANP, por regional' },
  { cruzamento: 'Mineração e cadastro', frente: 'reg', chave: 'Processo minerário com titular identificado; o mapa sem CNPJ não basta', pode: 'Conhecer empreendimentos de mineração com titular confirmado', naoPode: 'Dizer que a mina está em operação ou identificar o titular só pelo nome', situacao: 'Parcial', noPainel: 'Empresas, instalações e investimentos da ANM. Só entram processos com titular identificado pelo CNPJ' },
  { cruzamento: 'Licenças ambientais e cadastro', frente: 'cno', chave: 'CNPJ quando existe, a licença, a outorga ou o empreendimento, e o papel de cada empresa', pode: 'Ver atividades e demandas técnicas específicas', naoPode: 'Supor que toda empresa licenciada presta serviço de engenharia', situacao: 'Depende de acordo', noPainel: 'Fiscalização, licenças e alvarás (!), por fonte. Os dados públicos do IBAMA e da ANA não trazem CNPJ confiável, e a CETESB só por acordo' },
  { cruzamento: 'Financiamentos do BNDES e cadastro', frente: 'reg', chave: 'CNPJ, projeto, contrato ou município, conforme o tipo de recurso', pode: 'Ver investimentos apoiados e a presença das empresas no cadastro', naoPode: 'Tratar o financiamento como receita, contrato público ou obra pronta', situacao: 'No painel', noPainel: 'Empresas, instalações e investimentos do BNDES, por regional' },
  { cruzamento: 'Pagamentos do Tribunal de Contas e contratos', frente: 'tce', chave: 'Empenho, processo ou contrato com ligação confirmada, e uma tabela de correspondência para os municípios', pode: 'Ver os valores publicados em cada etapa da despesa', naoPode: 'Tratar o dado como parecer do Tribunal, ou somar o valor do contrato com o empenho e o pagamento', situacao: 'Depende de acordo', noPainel: 'Fiscalização, pagamentos dos contratos (!): contratado, empenhado, liquidado e pago lado a lado. É o primeiro acordo sugerido no plano' },
  { cruzamento: 'Nomeações de peritos e ART', frente: 'trib', chave: 'Número do processo, ato de nomeação, identidade autorizada do perito e especialidade', pode: 'Ver nomeações técnicas com documentação', naoPode: 'Deduzir a profissão do perito pelo assunto, ou concluir que o laudo exigia o título', situacao: 'Depende de acordo', noPainel: 'Profissionais, perícias judiciais (!): ART encontrada e peritos sem registro ativo' },
  { cruzamento: 'Responsável técnico, ART e acervo', frente: 'crea', chave: 'Ligações internas do Crea-SP, com início, fim e atividades', pode: 'Ver a continuidade técnica e o acervo das empresas', naoPode: 'Concluir que um RT ativo cobre qualquer atividade da empresa', situacao: 'No painel', noPainel: 'Empresas, responsáveis técnicos, RT que saiu sem substituto e certidões; Profissionais, empresas por RT' },
  { cruzamento: 'Emprego e registro', frente: 'mte', chave: 'Município, atividade e período, em totais comparáveis', pode: 'Comparar a evolução de setores e regiões', naoPode: 'Saber quem são os empregados de uma empresa, ou medir o efeito da atuação do Crea-SP', situacao: 'No painel', noPainel: 'Profissionais, emprego e salário por ocupação; Malha fina, emprego comparado com registro por regional' },
  { cruzamento: 'Formação e registro', frente: 'mte', chave: 'Totais comparáveis; lista com nomes só com termo autorizado', pode: 'Ver quantos se formam em cada região e quantos se registram depois', naoPode: 'Supor que todos os formados se registram, ou calcular taxa por pessoa sem identificação autorizada', situacao: 'Parcial', noPainel: 'Formação, três taxas por ano de formatura (em totais por instituição) e lista nominal das instituições parceiras (!)' },
  { cruzamento: 'Crédito, PIB e população e empresas', frente: 'tce', chave: 'Mesmas regiões, períodos e alcance', pode: 'Dar o contexto econômico de cada região', naoPode: 'Medir crédito, faturamento ou produtividade de uma empresa', situacao: 'Parcial', noPainel: 'População do IBGE nas fichas, nos mapas e na densidade por regional; PIB no contexto econômico da aba Empresas; crédito no mesmo bloco, com o sinal de parceria (!)' },
  { cruzamento: 'Projetos de lei e setores', frente: 'leg', chave: 'Número da proposição, assunto conferido e etapa', pode: 'Antecipar mudanças que podem afetar atividades e empresas', naoPode: 'Tratar projeto como lei aprovada, ou garantir a relevância só por palavra-chave', situacao: 'Parcial', noPainel: 'Método, radar de projetos (lista demonstrativa até a coleta entrar em funcionamento)' },
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
  UC04: ['No painel', 'Empresas · dinâmica da base: permanência da coorte de empresas registradas (3, 6 e 12 meses)'], UC05: ['No painel', 'Empresas · dinâmica da base: aberturas na Receita com CNAE da lista, por mês e regional, e quantas já têm registro'],
  UC06: ['No painel', 'Atendimento · qualidade do cadastro; Malha fina · CNPJ inativo'], UC07: ['Parcial', 'Empresas · rede societária: sócios PJ do QSA aberto (chave CNPJ) e sócios PF identificados (!, CPF completo por acordo com a Receita)'],
  UC08: ['No painel', 'Empresas · quadro técnico; Profissionais · carga de RT'], UC09: ['No painel', 'Malha fina · RT baixado sem substituto'], UC10: ['No painel', 'Empresas · ARTs por regional, modalidade e sem ART; Profissionais · ARTs por autor'], UC11: ['No painel', 'Empresas · prazo da certidão de acervo operacional'],
  UC12: ['Parcial', 'Fiscalização · mercado público (carteira técnica, concentração, demanda planejada) e obras; Malha fina · contratos técnicos. Local de execução só nas obras com CIPI'], UC13: ['No painel', 'Malha fina · fornecedor na data do contrato'], UC14: ['No painel', 'Malha fina · contrato e ART em três graus; obra sem ART de fiscalização'],
  UC15: ['No painel', 'Fiscalização · obras públicas (Obrasgov e CIPI) por situação, ponte com o contrato e ART de execução e fiscalização'], UC16: ['Depende de acordo', 'Fiscalização · obras do CNO (!): funil dados mínimos → campo ART → ART localizada; Malha fina · obra do CNO sem ART'], UC17: ['Depende de acordo', 'Fiscalização · licenças e alvarás (!): prefeituras, Corpo de Bombeiros, CETESB, IBAMA e ANA, com taxas por papel; Malha fina · alvará ou licença sem ART'],
  UC18: ['No painel', 'Empresas · instalações e investimentos (ANEEL, ANP, ANM) por regional, com o agente no cadastro; ANATEL fora'], UC19: ['No painel', 'Empresas · instalações e investimentos (BNDES) por regional'], UC20: ['No painel', 'Malha fina · empresas com dois ou mais indícios (11 regras, status e coleta)'],
  UC21: ['No painel', 'Receita · inadimplência e saldo vencido'], UC22: ['No painel', 'Receita · arrecadação; Presidência · receita atribuível'], UC23: ['No painel', 'Receita · recuperação da dívida'], UC24: ['No painel', 'Atendimento · prazos; Empresas · prazo de registro'],
  UC25: ['No painel', 'Profissionais · emprego por CBO (agregado); Malha fina · quadrante cobertura × emprego'], UC26: ['No painel', 'Profissionais · remuneração mediana × duas leituras do piso (CAGED mensal, agregado)'], UC27: ['No painel', 'Formação · concluintes por ano, canal, IES e modalidade (INEP anual)'],
  UC28: ['Parcial', 'Formação · três taxas por coorte em agregado por IES e ano, e coorte nominal das IES parceiras (!): primeiro registro até 3, 6, 12 e 24 meses'], UC29: ['Depende de acordo', 'Profissionais · perícias judiciais (!): nomeações e processos distintos por especialidade e comarca'], UC30: ['Depende de acordo', 'Profissionais · perícias judiciais (!): rastreabilidade da ponte com a ART, cobertura de chaves e peritos sem registro ativo'],
  UC31: ['No painel', 'Empresas · densidade por regional (estabelecimentos elegíveis por 10 mil habitantes × cobertura) e contexto econômico (PIB e VAB do IBGE; crédito por CNAE com marcador de parceria !)'], UC32: ['Parcial', 'Método · radar normativo: estrutura dos dados abertos da Câmara, do Senado e da ALESP, lista demonstrativa até o conector'], UC33: ['No painel', 'Fiscalização · mercado público: demanda planejada (PCA) por etapa, categoria e exercício'], UC34: ['No painel', 'Fiscalização · mercado público: participação dos cinco maiores fornecedores e HHI'],
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
  'RAIS identificada / eSocial': 'Demonstrativa com marcador de parceria (!): Profissionais · vínculos técnicos por empresa, só contagens (depende de acordo com o MTE)',
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

/* ---------- V21 · radar normativo (Câmara, Senado e ALESP) ---------- */
export type CasaLegislativa = 'Câmara' | 'Senado' | 'ALESP';
export const casasLegislativas: CasaLegislativa[] = ['Câmara', 'Senado', 'ALESP'];
/** Famílias de assunto do radar, do levantamento de 29/10 (pesquisas/EMPRESAS_ECONOMIA_LEGISLATIVO.md); a classificação é revisável. */
export const familiasNormativas = ['Registro, atribuições e ART', 'Formação e estágio', 'Responsabilidade e segurança', 'Contratação de serviços técnicos', 'Obras e habitação', 'Licenciamento', 'Concessões, energia e saneamento', 'Mineração e agroindústria', 'Inovação e transformação produtiva', 'Trabalho e remuneração'];
export type EtapaProposicao = 'Apresentada' | 'Em comissão' | 'Pronta para o plenário' | 'Aprovada na casa' | 'Sancionada' | 'Arquivada';
export type Relevancia = 'Regra textual' | 'Revisada';
export interface Proposicao { id: string; casa: CasaLegislativa; sigla: string; familia: string; ementa: string; etapa: EtapaProposicao; ultimaTramitacao: string; relevancia: Relevancia }
/**
 * Lista DEMONSTRATIVA com a estrutura dos dados abertos (id, casa, sigla, assunto, etapa, data da última tramitação, origem da relevância).
 * As proposições são fictícias: não correspondem a projetos reais. Em produção, a coleta usa as datas de tramitação (`dataInicio`/`dataFim`
 * na Câmara), não só o ano de apresentação, recupera proposições antigas em movimento e guarda o ID e a URI de cada uma.
 */
export const proposicoes: Proposicao[] = [
  { id: 'cam-1', casa: 'Câmara', sigla: 'PL (exemplo) 1', familia: 'Registro, atribuições e ART', ementa: 'Altera a exigência de registro de empresas prestadoras de serviços técnicos de engenharia.', etapa: 'Em comissão', ultimaTramitacao: '2026-09-22', relevancia: 'Revisada' },
  { id: 'cam-2', casa: 'Câmara', sigla: 'PL (exemplo) 2', familia: 'Contratação de serviços técnicos', ementa: 'Dispõe sobre a responsabilidade técnica na fiscalização de obras públicas contratadas pela União.', etapa: 'Pronta para o plenário', ultimaTramitacao: '2026-09-15', relevancia: 'Revisada' },
  { id: 'cam-3', casa: 'Câmara', sigla: 'PL (exemplo) 3', familia: 'Trabalho e remuneração', ementa: 'Modifica a base de cálculo da remuneração mínima de profissionais diplomados em engenharia.', etapa: 'Em comissão', ultimaTramitacao: '2026-08-30', relevancia: 'Regra textual' },
  { id: 'cam-4', casa: 'Câmara', sigla: 'PL (exemplo) 4', familia: 'Formação e estágio', ementa: 'Regula o estágio supervisionado em cursos de engenharia e a supervisão por profissional registrado.', etapa: 'Apresentada', ultimaTramitacao: '2026-09-28', relevancia: 'Regra textual' },
  { id: 'sen-1', casa: 'Senado', sigla: 'PL (exemplo) 5', familia: 'Responsabilidade e segurança', ementa: 'Institui inspeção periódica obrigatória de estruturas em edificações de uso coletivo.', etapa: 'Em comissão', ultimaTramitacao: '2026-09-10', relevancia: 'Revisada' },
  { id: 'sen-2', casa: 'Senado', sigla: 'PL (exemplo) 6', familia: 'Concessões, energia e saneamento', ementa: 'Altera o marco do saneamento quanto à comprovação de capacidade técnica das concessionárias.', etapa: 'Aprovada na casa', ultimaTramitacao: '2026-08-05', relevancia: 'Revisada' },
  { id: 'sen-3', casa: 'Senado', sigla: 'PL (exemplo) 7', familia: 'Licenciamento', ementa: 'Simplifica o licenciamento ambiental de empreendimentos de pequeno porte.', etapa: 'Em comissão', ultimaTramitacao: '2026-07-18', relevancia: 'Regra textual' },
  { id: 'ale-1', casa: 'ALESP', sigla: 'PL (exemplo) 8', familia: 'Obras e habitação', ementa: 'Cria programa estadual de regularização de edificações com laudo técnico obrigatório.', etapa: 'Em comissão', ultimaTramitacao: '2026-09-25', relevancia: 'Revisada' },
  { id: 'ale-2', casa: 'ALESP', sigla: 'PL (exemplo) 9', familia: 'Contratação de serviços técnicos', ementa: 'Exige certidão de acervo operacional nas licitações estaduais de obras acima de determinado valor.', etapa: 'Apresentada', ultimaTramitacao: '2026-09-18', relevancia: 'Regra textual' },
  { id: 'ale-3', casa: 'ALESP', sigla: 'PL (exemplo) 10', familia: 'Mineração e agroindústria', ementa: 'Dispõe sobre o controle técnico de barragens de rejeito no estado.', etapa: 'Arquivada', ultimaTramitacao: '2026-06-02', relevancia: 'Regra textual' },
  { id: 'cam-5', casa: 'Câmara', sigla: 'PL (exemplo) 11', familia: 'Inovação e transformação produtiva', ementa: 'Cria incentivo a empresas de engenharia com projetos de pesquisa aplicada.', etapa: 'Sancionada', ultimaTramitacao: '2026-05-14', relevancia: 'Revisada' },
  { id: 'sen-4', casa: 'Senado', sigla: 'PL (exemplo) 12', familia: 'Registro, atribuições e ART', ementa: 'Dispõe sobre a anotação de responsabilidade técnica em serviços prestados por meio eletrônico.', etapa: 'Em comissão', ultimaTramitacao: '2026-09-05', relevancia: 'Regra textual' },
];

/* ---------- V21 · gate de promoção de uma fonte ao núcleo operacional (evidencias/REVISAO_INDEPENDENTE.md) ---------- */
/** Os sete passos do gate; uma fonte só entra no núcleo quando cumpre todos. O passo alcançado é o último cumprido com evidência. */
export const gatePromocao = [
  'Proprietário, produto, URL de dados real, versão, licença e autorização identificados; leitura pública distinta de API operacional.',
  'Requisição com conteúdo semanticamente válido, dicionário e competência verificáveis; HTTP 200 de login ou manutenção é falha.',
  'Paginação, filtros e completude testados numa população pequena conhecida; resultado vazio não prova inexistência.',
  'Chaves homologadas com papéis e tempo; medida a não correspondência, a ambiguidade e a ausência de campo.',
  'Denominação, grão, fórmula e denominador do indicador validados; universo indisponível aparece como tal, não como zero.',
  'Cadência do publicador e cadência de coleta registradas em campos diferentes.',
  'Respostas brutas fora do repositório; publicados só contratos, dicionários, testes e exemplos sintéticos.',
];
export interface ProntidaoFonte { fonte: string; frente: string; passo: number; evidencia: string; pendente: string; noPainel: string }
/** Fontes das camadas da V21 e o passo do gate que cada uma alcançou com a evidência do levantamento de 29/10. */
export const prontidaoFontes: ProntidaoFonte[] = [
  { fonte: 'CNPJ · QSA aberto (Receita Federal)', frente: 'rfb', passo: 2, evidencia: 'Layout mensal verificado; sócio PJ com CNPJ exato, sócio PF com CPF mascarado.', pendente: 'Homologar a descarga da competência corrente e a chave por versão do arquivo (passo 3).', noPainel: 'Empresas · rede societária' },
  { fonte: 'Obrasgov · CIPI', frente: 'pncp', passo: 2, evidencia: 'Projeto testado com geometria; contrato e execução vazios na amostra; CIPI nulo no contrato PNCP amostrado.', pendente: 'Medir o preenchimento do CIPI em população conhecida (passo 3) antes de contar a ponte como cobertura.', noPainel: 'Fiscalização · obras públicas' },
  { fonte: 'PNCP · planos de contratação (PCA)', frente: 'pncp', passo: 1, evidencia: 'Endpoint documentado; não executado no levantamento.', pendente: 'Requisição válida com dicionário (passo 2) e chaves item–contratação (passo 4).', noPainel: 'Fiscalização · mercado público' },
  { fonte: 'ANEEL · SIGA e agentes', frente: 'reg', passo: 2, evidencia: 'CKAN e DataStore com GET de dados 200; CEG liga usina ao CNPJ do agente.', pendente: 'Paginação e completude por UF (passo 3); papel do agente por vigência (passo 4).', noPainel: 'Empresas · instalações e investimentos' },
  { fonte: 'ANP · instalações e revendas', frente: 'reg', passo: 2, evidencia: 'REST OpenAPI com GET amostral SP 200; CNPJ, autorização e coordenadas.', pendente: 'SLA de atualização a homologar (passo 6); completude por modalidade (passo 3).', noPainel: 'Empresas · instalações e investimentos' },
  { fonte: 'ANM · SIGMINE e SCM', frente: 'reg', passo: 1, evidencia: 'Diretório oficial atualizado; a camada SIGMINE não garante CNPJ.', pendente: 'Cadastro complementar com CNPJ (passo 4); sem ele, só território.', noPainel: 'Empresas · instalações e investimentos (parcial)' },
  { fonte: 'BNDES · operações de financiamento', frente: 'reg', passo: 2, evidencia: 'CSV e DataStore com GET 200; CNPJ do cliente, município IBGE, CNAE, datas e valores.', pendente: 'Completude mensal e deduplicação por contrato (passo 3).', noPainel: 'Empresas · instalações e investimentos' },
  { fonte: 'Câmara · dados abertos', frente: 'leg', passo: 2, evidencia: 'OpenAPI confirma keywords, ano, dataInicio e dataFim; consulta ilustrativa 200.', pendente: 'Rotina por data de tramitação com temas múltiplos (passo 3); classificação revisável (passo 5).', noPainel: 'Método · radar normativo' },
  { fonte: 'Senado · dados abertos v3', frente: 'leg', passo: 1, evidencia: 'OpenAPI 4.1.3 obtido; recurso de tipos com JSON válido; busca temática não homologada.', pendente: 'Requisição temática válida (passo 2) respeitando o limite de 10 requisições/s.', noPainel: 'Método · radar normativo' },
  { fonte: 'ALESP · tramitação (XML)', frente: 'leg', passo: 2, evidencia: 'XML de 20,9 MB com HTTP 200; elementos mudaram em 16/10/2026.', pendente: 'Parser versionado com verificação de schema (passo 3).', noPainel: 'Método · radar normativo' },
  { fonte: 'TCE-SP · despesa e contratos municipais', frente: 'tce', passo: 1, evidencia: 'Portal público com arquivos por lote e dicionário; sem API homologada nem de-para com o PNCP.', pendente: 'Acordo de cooperação e requisição válida de um lote (passo 2); de-para contrato × PNCP numa população conhecida (passo 3).', noPainel: 'Fiscalização · etapas financeiras (!)' },
  { fonte: 'Prefeituras · alvarás (começando por São Paulo)', frente: 'cno', passo: 0, evidencia: 'GeoSampa aberto não traz CNPJ nas camadas amostradas; alvarás estruturados só por convênio.', pendente: 'Identificar proprietário, licença e autorização (passo 1).', noPainel: 'Fiscalização · licenças e alvarás (!)' },
  { fonte: 'Corpo de Bombeiros · AVCB (Via Fácil)', frente: 'cno', passo: 0, evidencia: 'Consulta pública unitária, sem lote nem API.', pendente: 'Convênio e definição do produto de dados (passo 1).', noPainel: 'Fiscalização · licenças e alvarás (!)' },
  { fonte: 'CETESB · licenças ambientais', frente: 'cno', passo: 0, evidencia: 'Consulta pública sem API comprovada; CNPJ do titular só por acordo.', pendente: 'Acordo e identificação do produto (passo 1).', noPainel: 'Fiscalização · licenças e alvarás (!)' },
  { fonte: 'Receita Federal e Serpro · CNO autorizado', frente: 'cno', passo: 0, evidencia: 'Cadastro não aberto; esquema documentado, dados não acessados.', pendente: 'Autorização jurídica e técnica via Conecta (passo 1).', noPainel: 'Fiscalização · obras do CNO (!); Malha fina' },
  { fonte: 'TJSP · nomeações de peritos', frente: 'trib', passo: 1, evidencia: 'DJE e e-SAJ públicos; APIs nominais não comprovadas; identidade do perito só por acordo.', pendente: 'Extrato institucional regular ou captura homologada (passo 2).', noPainel: 'Profissionais · perícias judiciais (!)' },
  { fonte: 'Receita Federal · CPF completo do QSA; JUCESP · atos', frente: 'rfb', passo: 0, evidencia: 'QSA aberto mascara o CPF; JUCESP com carga não homologada.', pendente: 'Convênio para o identificador completo (passo 1).', noPainel: 'Empresas · sócios PF identificados (!)' },
  { fonte: 'IES parceiras · listas nominais de formandos', frente: 'mte', passo: 0, evidencia: 'Serviço de envio de formandos documentado; extração e uso exigem autorização e base legal.', pendente: 'Termo com cada IES e finalidade registrada (passo 1).', noPainel: 'Formação · coorte nominal (!)' },
  { fonte: 'MTE · RAIS identificada ou eSocial', frente: 'mte', passo: 0, evidencia: 'Microdados públicos só em agregado; vínculo por CNPJ exige acordo.', pendente: 'Acordo com o MTE e escopo sem salário individual (passo 1).', noPainel: 'Profissionais · vínculos técnicos por empresa (!)' },
  { fonte: 'Banco Central · SCR agregado por CNAE', frente: 'tce', passo: 0, evidencia: 'SCR público não abre por CNAE e município; extração agregada só por pedido.', pendente: 'Pedido de extração e dicionário (passo 1).', noPainel: 'Empresas · contexto econômico (!)' },
  { fonte: 'IBGE · população estimada (SIDRA 6579)', frente: 'tce', passo: 5, evidencia: 'JSON válido para SP; nome corrigido para população estimada, não expansão urbana.', pendente: 'Coleta municipal completa e cadência anual registrada (passo 6).', noPainel: 'Empresas · densidade por regional' },
];
