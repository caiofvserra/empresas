# Resultados institucionais — base demonstrativa CREA-SP

Todas as nove tabelas são fictícias, reproduzíveis com semente 20260930+v6; não representam a gestão atual, seus beneficiários ou seus gastos. Referência: 2026-09-30.

CSV UTF-8 com BOM, separador ponto e vírgula e datas ISO. Importar IDs como texto; manter centavos inteiros nas colunas orçamentárias e dividir por 100 nas medidas em reais. Plano e execução são grandezas diferentes.

Use municípios, GREs, profissionais e empresas de `data-demo` como dimensões compartilhadas. Município institucional representa local de oferta; domicílio profissional é outra dimensão. Participação sem professionalId deve permanecer sem identidade; não criar beneficiário único fictício.

Orçamento tem grão programa × município × mês, e capacidade tem grão unidade × mês. Não repartir esses fatos por pessoa ao fazer drillthrough. Atividade/participação e capacidade/uso exigem relacionamentos separados para evitar duplicar despesas.

Acompanhamento após 90 dias mede resposta autodeclarada: os não respondentes não têm resultado imputado; aplicação relatada não prova efeito causal ou colocação no mercado. A meta de atendimento de 14 dias é um cenário demonstrativo, não um prazo normativo do CREA-SP.

As contagens, grãos e hashes SHA-256 de cada CSV estão em manifest.json. Reproduzir: `node --import tsx scripts/export-institutional.ts`.
