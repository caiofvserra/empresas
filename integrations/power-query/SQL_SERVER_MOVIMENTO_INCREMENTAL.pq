// Criar RangeStart e RangeEnd (Date/Time) e pSqlServer/pSqlDatabase (Text).
// Incremental por data de evento IMUTÁVEL, limite inferior inclusivo/superior exclusivo.
// Testar query folding antes de ativar política no modelo Power BI.
// updated_at_utc pode detectar alterações nas partições atualizadas, não CDC completo.
// Correções/exclusões históricas exigem reconciliação e atualização das partições afetadas.
let
    Source = Sql.Database(pSqlServer, pSqlDatabase, [CreateNavigationProperties = false]),
    Movements = Source{[Schema = "bi", Item = "vw_movimentacao_cadastral"]}[Data],
    Partition = Table.SelectRows(Movements, each [event_at_utc] >= RangeStart and [event_at_utc] < RangeEnd)
in
    Partition
