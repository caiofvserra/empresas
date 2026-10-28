// Template de conexão direta: confirmar família/versão Db2 e implementação.
// Criar pDb2Server (hostname:porta) e pDb2Database como parâmetros Text.
// Credenciais ficam no Desktop/gateway; nenhuma API intermediária é necessária.
// Dimensão mutável: carga completa. Views abaixo são propostas, não schema real.
let
    Source = DB2.Database(pDb2Server, pDb2Database, [
        Implementation = "Microsoft",
        Query = "SELECT COMPANY_ID AS company_id, CNPJ_ROOT AS cnpj_root, LEGAL_NAME AS legal_name, MUNICIPALITY_ID AS municipality_id, SIZE_CODE AS size_code, LEGAL_NATURE_CODE AS legal_nature_code, OPENED_AT AS opened_at, SOURCE_SYSTEM AS source_system, UPDATED_AT_UTC AS updated_at_utc FROM BI.VW_EMPRESA WHERE IS_DELETED = 0"
    ]),
    // Aliases não delimitados podem voltar em caixa alta no Db2.
    Normalized = Table.TransformColumnNames(Source, Text.Lower),
    Typed = Table.TransformColumnTypes(Normalized, {
        {"company_id", type text}, {"cnpj_root", type text}, {"municipality_id", type text},
        {"opened_at", type date}, {"updated_at_utc", type datetime}
    })
in
    Typed
