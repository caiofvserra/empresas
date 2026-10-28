-- CONTRATO PROPOSTO, READ-ONLY. Não criar/alterar tabelas nem executar no schema operacional.
-- Homologar views e tipos com TI/gestores. Identificadores/CNPJs/IBGE são texto.
-- company_id é chave empresarial; CNPJ completo pertence a estabelecimento (14 caracteres).
-- cnpj_root tem 8 caracteres e não deve ser interpretado como inteiro.
-- updated_at_utc requer fuso confirmado e normalização na origem/staging.
-- is_deleted preserva exclusões para reconciliação; não é licença para apagar histórico.
SELECT company_id, cnpj_root, legal_name, municipality_id, size_code,
       legal_nature_code, opened_at, source_system, updated_at_utc, is_deleted
FROM bi.vw_empresa;

-- Grain: uma movimentação por event_id; company_id/registration_id devem existir nas dimensões.
-- event_at_utc é imutável. Correção deve atualizar updated_at_utc, não mover o evento de partição.
SELECT event_id, company_id, registration_id, event_type,
       event_at_utc, updated_at_utc, is_deleted
FROM bi.vw_movimentacao_cadastral;

-- Grain: fonte × lote; status COMPLETE exige contagens/chaves e integridade conciliadas.
-- Não confundir competência com instante de processamento ou data do refresh Power BI.
SELECT source_id, batch_id, competence_start, competence_end, started_at_utc,
       completed_at_utc, source_row_count, loaded_row_count, rejected_row_count,
       validation_status, schema_version, rules_version
FROM bi.vw_controle_carga;

-- Grain: numeroControlePNCP único; município é unidade contratante, não localização da obra.
SELECT pncp_id, municipality_id, category_id, publication_at_original,
       updated_at_original, supplier_identifier, supplier_type,
       contract_object, contract_value_brl, batch_id
FROM bi.vw_pncp_contrato_sp;
