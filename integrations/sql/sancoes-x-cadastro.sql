-- CONTRATO PROPOSTO, READ-ONLY (07/11/2026). Cruzamento das sanções da CGU (CEIS e CNEP) com as empresas registradas no Crea-SP.
-- Roda na base interna, nunca no painel. Homologar nomes de views, tipos e acesso com a TI antes de executar.
--
-- Carga de staging: o CSV que `node --import tsx scripts/sancoes-cgu.ts` grava em var/sancoes (separador ";", UTF-8, cabeçalho
-- na primeira linha). Fica fora do Git. Uma linha por sanção contra pessoa jurídica; CPF de sancionado não entra.
--   stg.cgu_sancao <- sancoes-pj.csv: o CEIS e o CNEP do dia, com a data do arquivo da CGU na primeira coluna
--     (data_arquivo, cadastro, codigo, cnpj, cnpj_basico, nome, categoria, impede_contratar, alcance, inicio, fim, orgao, uf_orgao, esfera, processo, fundamentacao)
-- Valores em texto: cadastro = CEIS ou CNEP; impede_contratar = Sim ou Não; alcance = Todas as esferas, Esfera do órgão,
-- Só o órgão ou Sem informação; esfera = Federal, Estadual, Municipal ou vazio. Datas em AAAA-MM-DD; fim vazio quer dizer sem prazo.
-- impede_contratar = Sim para impedimento ou proibição de contratar (Lei 14.133/2021, art. 156, III), inidoneidade (art. 156, IV;
-- Lei 8.666/1993, art. 87, IV) e suspensão de licitar (Lei 8.666/1993, art. 87, III). A inidoneidade vale em todas as esferas
-- (Lei 14.133/2021, art. 156, § 5º); nas outras, o alcance é o que o órgão sancionador informou à CGU.
--
-- Views do cadastro que estas consultas supõem (as mesmas de receita-x-cadastro.sql e sql-server-contract.sql):
--   bi.vw_registro_empresa (registration_id, company_id, cnpj, camara, status, started_at, ceased_at): registro de cada estabelecimento.
--   bi.vw_empresa (company_id, cnpj_root, legal_name, municipality_id, ...): a empresa pela raiz do CNPJ.
--   bi.vw_pncp_contrato_sp (pncp_id, municipality_id, category_id, publication_at_original, supplier_identifier, contract_object, ...).
-- A sanção é da pessoa jurídica, e o cruzamento é pela raiz do CNPJ (oito primeiros dígitos): a sanção registrada na matriz vale
-- para as filiais. CNPJ e raiz são texto: zeros à esquerda contam.

DECLARE @data_arquivo char(10) = '2026-11-06';
DECLARE @dia char(10) = @data_arquivo; -- a data em que a sanção precisa estar em vigor

-- 1. Empresas com registro ativo no Crea-SP e sanção em vigor que impede contratar com a administração.
--    É a lista para conferência: a sanção não muda o registro, mas a empresa não pode ser contratada onde a sanção alcança.
SELECT DISTINCT e.company_id, e.cnpj_root, e.legal_name, e.municipality_id, s.cadastro, s.categoria, s.alcance, s.esfera,
       s.orgao, s.uf_orgao, s.inicio, s.fim, s.processo
FROM stg.cgu_sancao AS s
JOIN bi.vw_empresa AS e ON e.cnpj_root = s.cnpj_basico
WHERE s.data_arquivo = @data_arquivo AND s.impede_contratar = 'Sim'
  AND s.inicio <= @dia AND (s.fim = '' OR s.fim >= @dia)
  AND EXISTS (SELECT 1 FROM bi.vw_registro_empresa AS r WHERE LEFT(r.cnpj, 8) = s.cnpj_basico AND r.status = 'Ativo');

-- 2. Quantas empresas registradas estão sancionadas, por câmara do registro e alcance. Só números: é o que um bloco do painel leria.
--    Uma empresa com mais de uma sanção conta uma vez em cada alcance em que aparece.
SELECT r.camara, s.alcance, COUNT(DISTINCT s.cnpj_basico) AS empresas
FROM stg.cgu_sancao AS s
JOIN bi.vw_registro_empresa AS r ON LEFT(r.cnpj, 8) = s.cnpj_basico AND r.status = 'Ativo'
WHERE s.data_arquivo = @data_arquivo AND s.impede_contratar = 'Sim'
  AND s.inicio <= @dia AND (s.fim = '' OR s.fim >= @dia)
GROUP BY r.camara, s.alcance;

-- 3. Empresas registradas punidas pela Lei Anticorrupção (CNEP), em vigor: multa, publicação extraordinária da decisão e as outras
--    sanções da Lei 12.846/2013. Não impedem contratar, mas contam na leitura do risco da empresa.
SELECT DISTINCT e.company_id, e.cnpj_root, e.legal_name, s.categoria, s.esfera, s.orgao, s.inicio, s.fim, s.processo
FROM stg.cgu_sancao AS s
JOIN bi.vw_empresa AS e ON e.cnpj_root = s.cnpj_basico
WHERE s.data_arquivo = @data_arquivo AND s.cadastro = 'CNEP'
  AND s.inicio <= @dia AND (s.fim = '' OR s.fim >= @dia)
  AND EXISTS (SELECT 1 FROM bi.vw_registro_empresa AS r WHERE LEFT(r.cnpj, 8) = s.cnpj_basico AND r.status = 'Ativo');

-- 4. Contratos públicos de SP no PNCP com fornecedor que tinha, na data da publicação do contrato, sanção que impede contratar em
--    todas as esferas. As de alcance menor ficam de fora: o PNCP não diz de que esfera é o contratante sem uma tabela de órgãos.
--    O arquivo do dia pode não trazer sanção já encerrada: para contrato antigo, a lista é um piso, não o total.
SELECT c.pncp_id, c.municipality_id, c.category_id, c.publication_at_original, c.supplier_identifier, c.contract_object,
       s.cadastro, s.categoria, s.orgao, s.inicio, s.fim
FROM bi.vw_pncp_contrato_sp AS c
JOIN stg.cgu_sancao AS s ON s.cnpj_basico = LEFT(c.supplier_identifier, 8) AND LEN(c.supplier_identifier) = 14
WHERE s.data_arquivo = @data_arquivo AND s.impede_contratar = 'Sim' AND s.alcance = 'Todas as esferas'
  AND s.inicio <= CONVERT(char(10), c.publication_at_original, 23)
  AND (s.fim = '' OR s.fim >= CONVERT(char(10), c.publication_at_original, 23));
