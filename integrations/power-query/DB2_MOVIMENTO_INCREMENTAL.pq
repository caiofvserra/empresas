// Criar RangeStart/RangeEnd (Date/Time) e pDb2Server/pDb2Database (Text).
// Filtro enviado ao servidor em SQL read-only. Homologar o conector e a política:
// native query não garante query folding no Power BI.
// event_at_utc deve ser imutável; updated_at_utc não é chave de particionamento.
// Não aceitar textos/SQL externos nesses parâmetros. DateTime.ToText gera datas tipadas.
let
    StartText = DateTime.ToText(RangeStart, "yyyy-MM-dd HH:mm:ss", "en-US"),
    EndText = DateTime.ToText(RangeEnd, "yyyy-MM-dd HH:mm:ss", "en-US"),
    Query = "SELECT EVENT_ID, COMPANY_ID, REGISTRATION_ID, EVENT_TYPE, EVENT_AT_UTC, UPDATED_AT_UTC, IS_DELETED FROM BI.VW_MOVIMENTACAO_CADASTRAL WHERE EVENT_AT_UTC >= TIMESTAMP('" & StartText & "') AND EVENT_AT_UTC < TIMESTAMP('" & EndText & "')",
    Source = DB2.Database(pDb2Server, pDb2Database, [Implementation = "Microsoft", Query = Query]),
    Normalized = Table.TransformColumnNames(Source, Text.Lower)
in
    Normalized
