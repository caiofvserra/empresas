-- CONTRATO PROPOSTO, READ-ONLY (07/11/2026). Contratos de serviços gerais do PNCP em SP que o modelo treinado marca como
-- engenharia, cruzados com as ARTs e o registro do fornecedor no Crea-SP.
-- Roda na base interna, nunca no painel. Homologar nomes de views, tipos e acesso com a TI antes de executar.
--
-- Carga de staging: o CSV que `python3 scripts/pncp-triagem.py` grava em var/pncp (separador ";", UTF-8, cabeçalho na primeira
-- linha). Fica fora do Git. Uma linha por contrato de serviços gerais (categoria 8 do PNCP) de unidade paulista, em cada rodada.
--   stg.pncp_triagem <- triagem-sp.csv: os contratos lidos, com a probabilidade do modelo e o que os documentos da compra mostraram
--     (rodada, pncp_id, ncp_compra, orgao_cnpj, municipio_ibge, publicacao, fornecedor_tipo, fornecedor_ni, objeto, prob_engenharia, suspeito, desfecho_rito, marcadores, documentos_lidos)
-- Valores em texto: suspeito = Sim ou Não (Sim quando prob_engenharia passa do limiar do modelo); desfecho_rito = Rito presente,
-- Rito parcial, Sem sinal de rito, Sem compra vinculada, Sem documento, Documento ilegível ou Não analisado (só os suspeitos têm
-- os documentos lidos). Rito presente quer dizer dois marcadores ou mais e um deles de engenharia (ART, Crea, engenheiro
-- responsável, obra ou serviço de engenharia, Lei 14.133/2021, art. 6º, XII ou XXI). marcadores vem separado por "|".
-- Datas em AAAA-MM-DD. CNPJ, CPF e município são texto: zeros à esquerda contam. O valor do contrato não vem no staging.
-- Uma rodada nova relê o período: vale a linha da rodada mais recente de cada contrato.
--
-- Views do cadastro que estas consultas supõem:
--   bi.vw_empresa (company_id, cnpj_root, legal_name, municipality_id, ...): a empresa pela raiz do CNPJ.
--   bi.vw_registro_empresa (registration_id, company_id, cnpj, camara, status, started_at, ceased_at): registro de cada estabelecimento.
--   bi.vw_art (art_id, company_id, contratante_documento, registrada_em): ART registrada pela empresa contratada.
--     Esta view ainda não existe no contrato da TI: os nomes são os que o painel usa e precisam ser homologados.
-- A ART obrigatória para obra e serviço de engenharia vem da Lei 6.496/1977, art. 1º, qualquer que seja o rótulo do contrato.

-- Linha mais recente de cada contrato, fornecedor pessoa jurídica com CNPJ de 14 dígitos. Pessoa física fica de fora: o
-- cruzamento dela é pelo CPF do profissional, que este contrato não cobre.
SELECT t.*
INTO #triagem
FROM stg.pncp_triagem AS t
WHERE t.rodada = (SELECT MAX(u.rodada) FROM stg.pncp_triagem AS u WHERE u.pncp_id = t.pncp_id)
  AND t.suspeito = 'Sim' AND t.fornecedor_tipo = 'PJ' AND LEN(t.fornecedor_ni) = 14;

-- A ART da mesma empresa perto da data (30 dias antes a 60 depois da publicação, a mesma janela do painel). A que tem o órgão do
-- contrato como contratante vale mais que outra qualquer. O número do contrato no PNCP não é o que o órgão escreve na ART, por
-- isso não entra na busca.
SELECT t.pncp_id, MAX(CASE WHEN a.contratante_documento = t.orgao_cnpj THEN 2 ELSE 1 END) AS grau
INTO #art
FROM #triagem AS t
JOIN bi.vw_empresa AS e ON e.cnpj_root = LEFT(t.fornecedor_ni, 8)
JOIN bi.vw_art AS a ON a.company_id = e.company_id
WHERE a.registrada_em >= DATEADD(day, -30, CAST(t.publicacao AS date))
  AND a.registrada_em <= DATEADD(day, 60, CAST(t.publicacao AS date))
GROUP BY t.pncp_id;

-- 1. Lista para conferência: serviços gerais com objeto de engenharia sem rito completo nos documentos, com a ART encontrada e o
--    registro do fornecedor na data da publicação. Não encontrar ART é prioridade de verificação, não infração: a ART pode ter outro número ou ter
--    sido registrada por um profissional contratado pela empresa.
SELECT t.pncp_id, t.ncp_compra, t.municipio_ibge, t.publicacao, t.fornecedor_ni, e.legal_name, t.objeto, t.prob_engenharia,
       t.desfecho_rito, t.marcadores,
       CASE a.grau WHEN 2 THEN 'ART com o órgão como contratante'
                   WHEN 1 THEN 'ART da empresa perto da data' ELSE 'Nenhuma ART encontrada' END AS art,
       CASE WHEN EXISTS (SELECT 1 FROM bi.vw_registro_empresa AS r WHERE LEFT(r.cnpj, 8) = LEFT(t.fornecedor_ni, 8)
                         AND r.started_at <= CAST(t.publicacao AS date) AND (r.ceased_at IS NULL OR r.ceased_at > CAST(t.publicacao AS date)))
            THEN 'Registrada na data' ELSE 'Sem registro na data' END AS registro
FROM #triagem AS t
LEFT JOIN bi.vw_empresa AS e ON e.cnpj_root = LEFT(t.fornecedor_ni, 8)
LEFT JOIN #art AS a ON a.pncp_id = t.pncp_id
WHERE t.desfecho_rito IN ('Sem sinal de rito', 'Rito parcial')
ORDER BY CASE WHEN a.grau IS NULL THEN 0 ELSE 1 END, t.prob_engenharia DESC;

-- 2. Quantos por município, desfecho do rito e ART encontrada. Só números: é o que um bloco do painel leria depois da homologação.
SELECT t.municipio_ibge, t.desfecho_rito,
       CASE WHEN a.grau IS NULL THEN 'Nenhuma ART encontrada' ELSE 'Alguma ART encontrada' END AS art,
       COUNT(*) AS contratos
FROM #triagem AS t
LEFT JOIN #art AS a ON a.pncp_id = t.pncp_id
GROUP BY t.municipio_ibge, t.desfecho_rito, CASE WHEN a.grau IS NULL THEN 'Nenhuma ART encontrada' ELSE 'Alguma ART encontrada' END;
