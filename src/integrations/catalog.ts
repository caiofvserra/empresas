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
    id: 'govadm-diario', title: 'GovAdm — Relatório de Processos, uma cópia por dia', access: 'staged-database',
    status: 'available-unconfigured', schedule: 'Diária, logo depois da extração do relatório das nove câmaras',
    // 07/11/2026: extracao-govadm (main.py diario) grava o CSV limpo; scripts/govadm-diario.ts guarda a cópia do dia e calcula os dias na fase.
    endpoint: 'extracao-govadm (Playwright, rede do Crea-SP) → saida/*_limpo.csv → scripts/govadm-diario.ts → var/govadm → staging → gateway', fixture: false,
    factTables: ['passagem-por-fase', 'quadro-fases-diario'],
    missingRequirements: ['Agendador diário na máquina da rede interna', 'Carga de dias-na-fase.csv no staging', 'Mapeamento das 17 fases nas quatro fatias do painel, pela SUPCOL', 'Confirmar se o número do processo no GovAdm é o mesmo do SEI', 'Unificar as siglas das câmaras entre GovAdm e Votenet (CEEAS, CAGE)', 'Bloco de dias na fase no painel de Gestão do Conselho'],
    limitations: ['Os dias na fase começam na primeira cópia: antes dela, o início é desconhecido.', 'Dia sem cópia atrasa a mudança de fase em um dia.', 'O relatório traz nome de interessado e de responsável: o histórico fica fora do Git.'],
  },
  {
    id: 'cgu-sancoes', title: 'CGU — sanções a empresas (CEIS e CNEP)', access: 'staged-database',
    status: 'available-unconfigured', schedule: 'Diária, depois que a CGU publica o arquivo do dia, no fim da tarde',
    // 07/11/2026: scripts/sancoes-cgu.ts baixa o CEIS e o CNEP e grava var/sancoes/sancoes-pj.csv; o cruzamento está em integrations/sql/sancoes-x-cadastro.sql.
    endpoint: 'https://portaldatransparencia.gov.br/download-de-dados/{ceis|cnep}/AAAAMMDD → scripts/sancoes-cgu.ts → var/sancoes → staging → gateway', fixture: false,
    factTables: ['sancao-empresa'],
    missingRequirements: ['Agendador diário do coletor', 'Carga de sancoes-pj.csv em stg.cgu_sancao', 'Views bi.vw_empresa e bi.vw_registro_empresa homologadas', 'Bloco de empresas sancionadas no painel quando o cadastro real chegar'],
    limitations: ['O arquivo do dia é a situação daquele dia: sanção já encerrada pode ter saído dele.', 'O alcance de impedimento e suspensão é o que o órgão sancionador informou; muitas vêm sem informação.', 'Só pessoa jurídica: sócio sancionado como pessoa física fica de fora.'],
  },
  {
    id: 'rfb-cnpj', title: 'Receita Federal — CNPJ e QSA em staging', access: 'staged-database',
    status: 'blocked-unconfigured', schedule: 'Mensal, conforme disponibilização oficial e homologação da carga',
    endpoint: 'https://arquivos.receitafederal.gov.br/public.php/webdav/<AAAA-MM>/ → scripts/receita-cnpj.ts → staging (CSV) → SQL Server/Db2 → gateway', fixture: false,
    factTables: ['empresa-externa', 'estabelecimento-externo', 'cnae-estabelecimento', 'qsa-com-governanca'],
    // 07/11/2026: o coletor (scripts/receita-cnpj.ts) baixa o mês, confere se os 30 zip estão completos, grava o agregado por município do painel e os CSV de staging; o cruzamento está em integrations/sql/receita-x-cadastro.sql.
    missingRequirements: ['Agendador mensal do coletor', 'Carga homologada dos CSV de staging com a competência', 'Views bi.vw_registro_empresa e bi.vw_profissional homologadas', 'Regras de finalidade, minimização e acesso ao QSA'],
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
