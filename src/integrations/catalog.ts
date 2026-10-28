/** Plans are capabilities, not evidence of a connected production database. */
export type AutomatedSource = {
  id: string;
  title: string;
  access: 'official-api' | 'sql-server-gateway' | 'db2-gateway' | 'staged-database';
  status: 'available-unconfigured' | 'blocked-unconfigured';
  schedule: string;
  endpoint: string;
  factTables: string[];
  missingRequirements: string[];
  fixture: false;
  limitations: string[];
};

export const automatedSourceCatalog: AutomatedSource[] = [
  {
    id: 'pncp', title: 'PNCP — contratos publicados em SP', access: 'official-api',
    status: 'available-unconfigured', schedule: 'Diária; janela móvel de 7 dias e recomposição histórica periódica',
    endpoint: 'https://pncp.gov.br/api/consulta/v1/contratos',
    factTables: ['contratacao-publica'], fixture: false,
    missingRequirements: ['Agendador de produção', 'Armazenamento persistente do coletor', 'Mapeamento do lote para a tabela de staging', 'Atualização agendada do modelo Power BI'],
    limitations: ['Município da unidade contratante, não da obra nem do fornecedor.', 'Filtro temporal da API usa publicação; atualizações antigas exigem recomposição histórica.', 'Categoria publicada não determina atividade fiscalizada ou obrigação de registro.'],
  },
  {
    id: 'creasp-sql-server', title: 'CREA-SP — SQL Server via gateway', access: 'sql-server-gateway',
    status: 'blocked-unconfigured', schedule: 'Diária ou intradiária, conforme capacidade e governança do banco',
    endpoint: 'Sql.Database(servidor, banco) → views de leitura → gateway local → modelo Power BI', fixture: false,
    factTables: ['empresa', 'estabelecimento', 'registro-empresarial', 'profissional', 'vinculo-tecnico', 'art', 'cao', 'movimentacao-financeira', 'fiscalizacao', 'atividade-institucional', 'participacao-institucional', 'orcamento-institucional', 'cowork-utilizacao', 'cowork-capacidade', 'acompanhamento-institucional', 'solicitacao-servico'],
    missingRequirements: ['Servidor, banco e views homologadas', 'Gateway local em modo padrão, conexão de dados e permissões do modelo', 'Credencial de serviço somente leitura armazenada no gateway', 'Contrato de chaves, competência, updated_at e exclusões', 'Validação do query folding e da política incremental', 'Responsável pela validação de cada medida'],
    limitations: ['Não há credenciais ou conexão com dados internos reais nesta entrega.', 'A distribuição das entidades entre SQL Server e Db2 deve ser confirmada pelo CREA-SP; este catálogo não a presume.', 'Views e nomes dos templates são contratos propostos, não esquema confirmado.', 'O navegador não recebe acesso direto ao banco.', 'Fixtures demonstrativas nunca recebem estado conectado.'],
  },
  {
    id: 'creasp-db2', title: 'CREA-SP — Db2 via gateway', access: 'db2-gateway',
    status: 'blocked-unconfigured', schedule: 'Diária ou intradiária, conforme capacidade e governança do banco',
    endpoint: 'DB2.Database(servidor:porta, banco) → views de leitura → gateway local → modelo Power BI', fixture: false,
    factTables: ['entidades-institucionais-conforme-mapeamento-homologado'],
    missingRequirements: ['Servidor, porta, banco, schema e views homologadas', 'Gateway local em modo padrão e conector IBM Db2 compatível', 'Implementação/driver de 64 bits exigido pelo conector instalado no gateway, quando aplicável', 'Credencial de serviço somente leitura armazenada no gateway', 'Contrato de chaves, competência, updated_at e exclusões', 'Teste de filtros RangeStart/RangeEnd e diagnóstico de consultas'],
    limitations: ['Não há credenciais ou conexão com dados internos reais nesta entrega.', 'Testar família/versão Db2 e implementação do conector antes de homologar.', 'A política incremental depende da consulta e da fonte; não se promete query folding sem teste.', 'Nenhuma API intermediária é obrigatória para o Power BI.'],
  },
  {
    id: 'inep', title: 'INEP — formação superior em staging', access: 'staged-database',
    status: 'blocked-unconfigured', schedule: 'Anual, após publicação e processamento homologado do Censo',
    endpoint: 'Publicação oficial → ingestão institucional homologada → SQL Server/Db2 → gateway', fixture: false,
    factTables: ['formacao-superior-agregada'],
    missingRequirements: ['Coletor oficial e validação do layout por edição', 'Classificação de cursos e municípios paulistas', 'Tabela de staging com competência, fonte e data de carga'],
    limitations: ['Não há API pública recorrente homologada nesta entrega.', 'Concluintes são contagens de formação, não profissionais registrados.', 'Snapshots de GitHub ou sites não são fontes automáticas ativas.'],
  },
  {
    id: 'rais-caged', title: 'RAIS / Novo CAGED — emprego agregado em staging', access: 'staged-database',
    status: 'blocked-unconfigured', schedule: 'RAIS anual; Novo CAGED mensal, respeitando revisões',
    endpoint: 'Publicações oficiais → ingestão institucional homologada → SQL Server/Db2 → gateway', fixture: false,
    factTables: ['emprego-formal-agregado'],
    missingRequirements: ['Rotina oficial com layouts e revisões versionados', 'Agregação compatível com acesso e divulgação por município, CNAE, CBO e competência', 'Staging e chaves dimensionais homologadas'],
    limitations: ['Não há ingestão oficial ativa nesta entrega.', 'Emprego agregado não deve ser ligado diretamente a um CNPJ ou a profissionais individualizados.', 'Saldo CAGED não equivale ao estoque total de profissionais.'],
  },
  {
    id: 'rfb-cnpj', title: 'Receita Federal — CNPJ e QSA em staging', access: 'staged-database',
    status: 'blocked-unconfigured', schedule: 'Mensal, conforme disponibilização oficial e homologação da carga',
    endpoint: 'Dados abertos oficiais → ingestão institucional homologada → SQL Server/Db2 → gateway', fixture: false,
    factTables: ['empresa-externa', 'estabelecimento-externo', 'cnae-estabelecimento', 'qsa-com-governanca'],
    missingRequirements: ['Coletor de arquivos oficiais e validação de completude', 'Reconciliação determinística por CNPJ e raiz', 'Regras de finalidade, minimização e acesso ao QSA', 'Competência e staging homologados'],
    limitations: ['Não há API de consulta em massa ativa nesta entrega.', 'Presença de CNAE não define automaticamente obrigação de registro.', 'CPF parcial ou nome de sócio não comprova identidade de profissional.', 'Dados reais não são conciliados com empresas fictícias.'],
  },
];

/** Existing imports remain archived provenance, never automatic fact sources. */
export const excludedSnapshotSources = [
  { artifact: 'creasp-management-public.json', reason: 'Valores transcritos de PDF; sem carga primária recorrente.' },
  { artifact: 'external-education.json', reason: 'Reprodução de microdados em repositório externo; sem ingestão governamental automatizada homologada.' },
  { artifact: 'user-engineer-statistics.json', reason: 'Snapshot do site/repositório do usuário; mistura agregados, notícias e PDFs, sem rotina primária integrada.' },
  { artifact: 'pncp-public-aggregate.json', reason: 'Recorte manual de um dia; substituído por lote validado do coletor oficial quando conectado.' },
];
