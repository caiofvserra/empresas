// Template de conexão direta; nomes de views/colunas são contratos a homologar.
// Criar pSqlServer e pSqlDatabase como parâmetros Text no Power Query.
// Credencial somente leitura configurada no Desktop e na conexão do gateway.
// Dimensão mutável: carga completa, não particionar por updated_at.
let
    Source = Sql.Database(pSqlServer, pSqlDatabase, [CreateNavigationProperties = false]),
    Companies = Source{[Schema = "bi", Item = "vw_empresa"]}[Data],
    CurrentRows = Table.SelectRows(Companies, each [is_deleted] = false),
    Columns = Table.SelectColumns(CurrentRows, {
        "company_id", "cnpj_root", "legal_name", "municipality_id", "size_code",
        "legal_nature_code", "opened_at", "source_system", "updated_at_utc"
    }),
    Typed = Table.TransformColumnTypes(Columns, {
        {"company_id", type text}, {"cnpj_root", type text}, {"municipality_id", type text},
        {"opened_at", type date}, {"updated_at_utc", type datetime}
    })
in
    Typed
