// Arquivo gerado pelo coletor oficial; pPncpBatchPath é caminho do current.json.
// Gateway deve enxergar o MESMO caminho de rede e ter permissão de leitura.
// Alternativa: rotina institucional carrega lote no staging SQL Server/Db2.
// Não aponta a public/, nem mistura fornecedores reais com empresas fictícias.
let
    Batch = Json.Document(File.Contents(pPncpBatchPath)),
    Validated = if Batch[schemaVersion] <> "pncp-store-1.0" or Batch[sourceId] <> "pncp" or Batch[fixture] <> false or Batch[uf] <> "SP"
        then error "Lote PNCP não homologável: metadados inválidos." else Batch,
    Rows = Table.FromRecords(Validated[records], {
        "id", "uf", "municipalityId", "municipalityName", "categoryId", "categoryName",
        "publishedAt", "updatedAt", "supplierType", "supplierIdentifier", "supplierName",
        "contractObject", "contractValue", "contractValueSource"
    }, MissingField.UseNull),
    Typed = Table.TransformColumnTypes(Rows, {
        {"id", type text}, {"municipalityId", type text}, {"supplierIdentifier", type text},
        {"categoryId", Int64.Type}, {"contractValue", type number}
    })
in
    Typed
