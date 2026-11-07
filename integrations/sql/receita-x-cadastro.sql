-- CONTRATO PROPOSTO, READ-ONLY (07/11/2026). Cruzamento dos dados abertos do CNPJ da Receita com o cadastro do Crea-SP.
-- Roda na base interna, nunca no painel. Homologar nomes de views, tipos e acesso com a TI antes de executar.
--
-- Carga de staging: os quatro CSV que `node --import tsx scripts/receita-cnpj.ts --pasta <pasta> --competencia AAAA-MM`
-- grava em <pasta>/staging (separador ";", UTF-8, cabeçalho na primeira linha). Ficam fora do Git. Toda linha traz a
-- competência do arquivo (AAAA-MM) na primeira coluna, para comparar um mês com o outro. Datas em AAAA-MM-DD.
--   stg.receita_situacao         <- situacao-sp.csv: TODOS os estabelecimentos paulistas, com ou sem atividade da lista
--     (competencia, cnpj, situacao, data_situacao, cnae_principal, municipio_ibge)
--   stg.receita_estabelecimento  <- estabelecimentos-sp.csv: só os estabelecimentos paulistas com atividade da lista do Crea-SP
--     (competencia, cnpj, cnpj_basico, matriz, situacao, data_situacao, inicio_atividade, classe, cnae_enquadramento,
--      cnae_principal, municipio_rfb, municipio_ibge)
--   stg.receita_empresa          <- empresas-sp.csv: razão social, natureza jurídica, capital e porte das empresas desses estabelecimentos
--     (competencia, cnpj_basico, razao_social, natureza_juridica, capital_social, porte)
--   stg.receita_socio            <- socios-sp.csv: sócios dessas empresas, com o CPF mascarado como a Receita publica (***NNNNNN**)
--     (competencia, cnpj_basico, tipo, nome, nome_normalizado, documento, qualificacao, data_entrada)
-- Valores em texto: situacao = Ativa, Suspensa, Inapta, Baixada ou Nula; classe = Sim (registro obrigatório) ou Passível
-- (a analisar); tipo = PJ, PF ou Estrangeiro; matriz = 1 ou 0; porte = 01 (ME), 03 (EPP), 05 (demais) ou vazio.
-- municipio_ibge vem vazio só para código da Receita sem par no IBGE (o coletor lista esses códigos no log).
--
-- Views do cadastro que estas consultas supõem (além de bi.vw_empresa, do sql-server-contract.sql):
--   bi.vw_registro_empresa (registration_id, company_id, cnpj, camara, status, started_at, ceased_at): registro de cada estabelecimento.
--   bi.vw_profissional (professional_id, nome_normalizado, cpf, status): cadastro de profissionais, CPF com 11 dígitos em texto.
--     nome_normalizado segue a regra do coletor: sem acento, maiúsculo, hífen e apóstrofo viram espaço, espaços simples.
--   bi.vw_vinculo_tecnico (company_id, professional_id, started_at, ceased_at): responsáveis técnicos de cada empresa.
-- CNPJ, raiz e CPF são texto: zeros à esquerda contam.

DECLARE @competencia char(7) = '2026-10';

-- 1. Estabelecimentos ativos na Receita com atividade de registro obrigatório (classe Sim) e sem registro ativo no Crea-SP.
--    É a fila de fiscalização por omissão de registro.
--    A filial pode estar coberta pelo registro da matriz: a regra de cobertura por raiz precisa ser confirmada com a SUPCOL.
SELECT e.cnpj, e.cnpj_basico, e.matriz, e.inicio_atividade, e.cnae_enquadramento, e.cnae_principal, e.municipio_ibge,
       emp.razao_social, emp.porte
FROM stg.receita_estabelecimento AS e
JOIN stg.receita_empresa AS emp ON emp.cnpj_basico = e.cnpj_basico AND emp.competencia = e.competencia
WHERE e.competencia = @competencia AND e.situacao = 'Ativa' AND e.classe = 'Sim'
  AND NOT EXISTS (SELECT 1 FROM bi.vw_registro_empresa AS r WHERE r.cnpj = e.cnpj AND r.status = 'Ativo')
  AND NOT (e.matriz = 0 AND EXISTS (SELECT 1 FROM bi.vw_registro_empresa AS r WHERE LEFT(r.cnpj, 8) = e.cnpj_basico AND r.status = 'Ativo'));

-- 1b. A mesma lista para a atividade a analisar (classe Passível), à parte: o código sozinho não define a obrigação, e cada caso
--     pede conferência do que a empresa faz de fato antes de virar ação de fiscalização.
SELECT e.cnpj, e.cnpj_basico, e.matriz, e.inicio_atividade, e.cnae_enquadramento, e.cnae_principal, e.municipio_ibge,
       emp.razao_social, emp.porte
FROM stg.receita_estabelecimento AS e
JOIN stg.receita_empresa AS emp ON emp.cnpj_basico = e.cnpj_basico AND emp.competencia = e.competencia
WHERE e.competencia = @competencia AND e.situacao = 'Ativa' AND e.classe = 'Passível'
  AND NOT EXISTS (SELECT 1 FROM bi.vw_registro_empresa AS r WHERE r.cnpj = e.cnpj AND r.status = 'Ativo')
  AND NOT (e.matriz = 0 AND EXISTS (SELECT 1 FROM bi.vw_registro_empresa AS r WHERE LEFT(r.cnpj, 8) = e.cnpj_basico AND r.status = 'Ativo'));

-- 2. Parte do mercado registrada por município: estabelecimentos ativos de registro obrigatório e quantos deles têm registro
--    ativo (o próprio CNPJ ou, na filial, a matriz). A câmara não entra aqui: não há tabela oficial que ligue cada CNAE a uma
--    câmara, e a câmara do registro só existe para quem está registrado (consulta 2b).
WITH mercado AS (
  SELECT e.municipio_ibge, e.cnpj,
         CASE WHEN EXISTS (SELECT 1 FROM bi.vw_registro_empresa AS r WHERE r.cnpj = e.cnpj AND r.status = 'Ativo')
                OR (e.matriz = 0 AND EXISTS (SELECT 1 FROM bi.vw_registro_empresa AS r WHERE LEFT(r.cnpj, 8) = e.cnpj_basico AND r.status = 'Ativo'))
              THEN 1 ELSE 0 END AS registrado
  FROM stg.receita_estabelecimento AS e
  WHERE e.competencia = @competencia AND e.situacao = 'Ativa' AND e.classe = 'Sim'
)
SELECT municipio_ibge, COUNT(*) AS estabelecimentos, SUM(registrado) AS registrados,
       CAST(SUM(registrado) AS decimal(9, 4)) / NULLIF(COUNT(*), 0) AS parte_registrada
FROM mercado
GROUP BY municipio_ibge;

-- 2b. Registros ativos por câmara e município, com a atividade que a Receita mostra para cada CNPJ registrado.
SELECT r.camara, s.municipio_ibge, COUNT(*) AS registros,
       SUM(CASE WHEN e.cnpj IS NOT NULL THEN 1 ELSE 0 END) AS com_atividade_da_lista
FROM bi.vw_registro_empresa AS r
JOIN stg.receita_situacao AS s ON s.cnpj = r.cnpj AND s.competencia = @competencia
LEFT JOIN stg.receita_estabelecimento AS e ON e.cnpj = r.cnpj AND e.competencia = @competencia
WHERE r.status = 'Ativo'
GROUP BY r.camara, s.municipio_ibge;

-- 3. Registros ativos no Crea-SP cujo CNPJ está baixado, inapto, suspenso ou nulo na Receita, tenha a empresa atividade
--    da lista ou não (a situação vem de stg.receita_situacao, que traz todos os estabelecimentos paulistas).
--    Candidatos a cancelamento ou revisão do registro.
SELECT r.registration_id, r.cnpj, s.situacao, s.data_situacao, s.cnae_principal, s.municipio_ibge
FROM bi.vw_registro_empresa AS r
JOIN stg.receita_situacao AS s ON s.cnpj = r.cnpj AND s.competencia = @competencia
WHERE r.status = 'Ativo' AND s.situacao <> 'Ativa';

-- 4. Registros ativos no Crea-SP fora da lista ou fora do arquivo paulista.
--    fora_da_lista: o CNPJ está ativo em SP, mas nenhuma atividade dele (principal ou secundária) está na lista do Crea-SP.
--      Não é irregularidade: a lista é um apoio. Serve para revisar a lista ou o enquadramento da empresa.
--    fora_de_sp: o CNPJ não está entre os estabelecimentos paulistas da Receita (endereço em outra UF, ou CNPJ inexistente,
--      que pede conferência do cadastro).
SELECT r.registration_id, r.cnpj,
       CASE WHEN s.cnpj IS NULL THEN 'fora_de_sp' ELSE 'fora_da_lista' END AS motivo, s.situacao, s.cnae_principal
FROM bi.vw_registro_empresa AS r
LEFT JOIN stg.receita_situacao AS s ON s.cnpj = r.cnpj AND s.competencia = @competencia
WHERE r.status = 'Ativo'
  AND NOT EXISTS (SELECT 1 FROM stg.receita_estabelecimento AS e WHERE e.cnpj = r.cnpj AND e.competencia = @competencia)
  AND (s.cnpj IS NULL OR s.situacao = 'Ativa');

-- 5. Sócios pessoas físicas que podem ser profissionais registrados. A Receita publica o CPF com os três primeiros e os dois
--    últimos dígitos escondidos (***NNNNNN**). O par só vale com o nome normalizado igual E os seis dígitos do meio iguais.
--    Mesmo assim é candidato, não identidade: com mais de um profissional distinto no mesmo par, é homônimo e fica para
--    conferência. A mesma regra está em scripts/integrations/receita.ts (casarSocio), com teste.
WITH socio AS (
  SELECT DISTINCT s.cnpj_basico, s.nome_normalizado, SUBSTRING(s.documento, 4, 6) AS meio, s.qualificacao, s.data_entrada
  FROM stg.receita_socio AS s
  WHERE s.competencia = @competencia AND s.tipo = 'PF' AND s.documento LIKE '***[0-9][0-9][0-9][0-9][0-9][0-9]**'
), profissional AS (
  SELECT p.professional_id, p.nome_normalizado, SUBSTRING(p.cpf, 4, 6) AS meio, p.status
  FROM bi.vw_profissional AS p
), candidatos AS (
  -- Profissionais distintos por chave (nome normalizado + seis dígitos): conta pessoas, não linhas do quadro de sócios.
  SELECT nome_normalizado, meio, COUNT(DISTINCT professional_id) AS n FROM profissional GROUP BY nome_normalizado, meio
)
SELECT s.cnpj_basico, s.nome_normalizado, s.qualificacao, s.data_entrada, p.professional_id, p.status,
       CASE WHEN c.n = 1 THEN 'Identificado' ELSE 'Homônimo' END AS situacao_par
FROM socio AS s
JOIN profissional AS p ON p.nome_normalizado = s.nome_normalizado AND p.meio = s.meio
JOIN candidatos AS c ON c.nome_normalizado = s.nome_normalizado AND c.meio = s.meio;

-- 6. Sócio identificado que é responsável técnico da própria empresa (Lei 5.194/66, art. 8º, parágrafo único: a pessoa jurídica
--    exerce a atividade com profissional habilitado). Só pares "Identificado" da consulta 5; homônimo não entra.
--    Resultado da consulta 5 gravado antes em stg.receita_socio_profissional (mesmas colunas).
SELECT sp.cnpj_basico, sp.professional_id, v.started_at AS rt_desde
FROM stg.receita_socio_profissional AS sp
JOIN bi.vw_empresa AS emp ON emp.cnpj_root = sp.cnpj_basico
JOIN bi.vw_vinculo_tecnico AS v ON v.company_id = emp.company_id AND v.professional_id = sp.professional_id
WHERE sp.situacao_par = 'Identificado' AND (v.ceased_at IS NULL OR v.ceased_at > GETDATE());
