# Catálogo de possibilidades de dados — CREA-SP

O catálogo possui **104 entradas canônicas, resultantes de105 fichas pesquisadas**. São fontes, subconjuntos, catálogos, parcerias e reuso; não104 APIs independentes nem104 integrações homologadas.

- `catalogo-fontes.json`, `.csv` e `.xlsx`: catálogo canônico.
- [CATALOGO_FONTES.md](../CATALOGO_FONTES.md): ficha legível de cada entrada, com URLs e limitações.
- `origens-auditoria.json` e `.csv`:105 fichas de pesquisa, com cada registro original integral e um identificador de origem.
- [Resumo HTTP](../evidencias/evidencias-http-resumo.json) e [CSV](../evidencias/evidencias-http-resumo.csv): somente metadados; sem corpos de resposta ou credenciais.
- [MANIFESTO.json](../MANIFESTO.json): contagens e hashes de toda a entrega.

## Consolidação e semântica

As duas fichas `SP-JUCESP` descreviam a mesma camada. Foi mantida uma entrada canônica, com dois endpoints de descoberta e as duas origens completas em`origens`. A prioridade canônica éP2 para implantação enquanto o corpo CSV não estiver homologado;P1 na origem alternativa expressa relevância estratégica. Nomes, prioridades, URLs e evidências originais foram preservados.

`familia_id` identifica o provedor ou ecossistema quando possível. Produtos de uma família podem ter escopos, grãos, contratos e finalidades diferentes; família não é contagem de APIs independentes. Outros produtos relacionados foram mantidos com o escopo declarado.

No JSON, listas e objetos conservam seus tipos; no Excel/CSV são texto JSON. Campos ausentes usam“não informado”. Contagens por origem referem-se às105 fichas; demais contagens referem-se às104 entradas canônicas.

## Evidência e atualização

Documentação inclui catálogos e metadados. Contrato não prova acesso aos fatos. Amostra confirma apenas o recorte testado. Lead ainda precisa de qualificação. Parceria/habilitação não foi obtida nesta pesquisa. HTTP 200 pode serHTML de manutenção ou erro semântico; consultar a descrição literal da ficha.

Dados foram pesquisados em 29/10/2026. Método e data ausentes nos relatóriosHTTP originais não foram inventados. `fonte_ids` contém correspondências por rota ou candidatos por domínio; não significa que todos os subconjuntos do órgão foram testados.

RAIS e Novo CAGED públicos não permitem presumir pareamento nominal CNPJ/CPF com o CREA. Matrículas/concluintes não equivalem a profissionais registrados. CNAE,CBO,classificação textual ou ausência de correspondência não comprovam obrigação ou infração.

Os catálogos e arquivosHTTP foram resumidos; a matriz integral de 959 registros da curadoria Chelfo e corpos brutos não integram este compilado.
