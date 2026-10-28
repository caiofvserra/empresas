-- CONTRATO PROPOSTO, READ-ONLY. Não presume distribuição de entidades entre bancos.
-- Homologar schema BI, views, tipos e driver com TI antes de configurar o gateway.
-- Chaves/CNPJ/IBGE devem ser CHAR/VARCHAR; datas UTC apenas com fuso confirmado.
SELECT COMPANY_ID, CNPJ_ROOT, LEGAL_NAME, MUNICIPALITY_ID, SIZE_CODE,
       LEGAL_NATURE_CODE, OPENED_AT, SOURCE_SYSTEM, UPDATED_AT_UTC, IS_DELETED
FROM BI.VW_EMPRESA;

-- Grain: EVENT_ID único. EVENT_AT_UTC imutável; UPDATED_AT_UTC detecta correções.
-- Tombstones/exclusões históricas demandam reconciliação das partições afetadas.
SELECT EVENT_ID, COMPANY_ID, REGISTRATION_ID, EVENT_TYPE,
       EVENT_AT_UTC, UPDATED_AT_UTC, IS_DELETED
FROM BI.VW_MOVIMENTACAO_CADASTRAL;

-- Grain: SOURCE_ID × BATCH_ID; versão da regra e validação precisam ser auditáveis.
SELECT SOURCE_ID, BATCH_ID, COMPETENCE_START, COMPETENCE_END, STARTED_AT_UTC,
       COMPLETED_AT_UTC, SOURCE_ROW_COUNT, LOADED_ROW_COUNT, REJECTED_ROW_COUNT,
       VALIDATION_STATUS, SCHEMA_VERSION, RULES_VERSION
FROM BI.VW_CONTROLE_CARGA;
