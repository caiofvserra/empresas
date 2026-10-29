# Revisão do repositório e integração Claude — 29/10/2026

## Resultado confirmado

Repositório: https://github.com/caiofvserra/empresas.

- `main` estava em `5dfd4df`, contendo o merge do PR #1 (V14).
- A versão descrita pelo usuário estava em `claude/painel-unico-v15`, commit `03c8810`, com sete commits posteriores de V15 a V18 ainda não integrados.
- Identificação inequívoca: `src/cockpit/Cockpit.tsx` lista Visão geral, Cadastro, Fiscalização, Malha fina, Resp. técnica, Receita, Atendimento e Contexto.
- Integração normal, sem conflitos, sem force push ou exclusões: commit [049d618bfe4dd634be90bd1edcaac9bac4631647](https://github.com/caiofvserra/empresas/commit/049d618bfe4dd634be90bd1edcaac9bac4631647), publicado em `main`.
- Árvore do merge é idêntica à árvore da V18 de Claude. Nenhuma reformulação funcional ou visual realizada.
- Site de produção não foi publicado nem alterado nesta etapa.

## Como abrir a versão correta

A V18 possui entrada separada: `painel.html` → `src/cockpit/main.tsx` → `src/cockpit/Cockpit.tsx`.

A raiz `/` permanece apontando para `src/App.tsx`, que abre V14; `?v=13` abre V13. Portanto, o merge não troca automaticamente a experiência padrão nem a hospedagem Sites. O artefato autocontido da V18 é `entrega/painel-gestao-creasp.html`, gerado por `npm run build:painel`; em desenvolvimento, acessar `/painel.html`.

## Validações da integração

- `npm ci`: concluído.
- `npm run build`: TypeScript e Vite concluídos; aviso não fatal de chunks acima de 500 kB.
- `npm run build:painel`: concluído; HTML autocontido com aproximadamente 2,33 MB.
- Testes completos: 230 testes, 230 aprovados, zero falhas, cerca de 40 segundos.
- Navegação com Chromium/Playwright pelas oito abas: títulos correspondentes e gráficos renderizados; zero `pageerror`.
- Captura: [Captura da V18 demonstrativa](evidencias/visao-geral-v18.png).
- Não é certificação funcional completa de todos os controles, segurança em produção ou conformidade jurídica.

## Pontos fortes para preservar no planejamento

- Organização por domínios, filtros comuns e detalhamento contextual.
- Gráficos de composição, Sankey, Mekko, mapas bivariados, matrizes e séries combinadas.
- Catálogo de 78 indicadores em `docs/INDICADORES_V18.md` e `.xlsx`.
- Continuidade do modelo empresarial V13: empresas, estabelecimentos, registros, movimentações, RT, ART, CAO, cobrança, contratos, emprego agregado.
- Dados demonstrativos e camadas artificiais identificados em comentários/documentação.
- Modelo territorial com malha municipal de SP e separação explícita de contexto público.

## Dados internos modelados hoje e requisitos de produção

| Tema | Entidades já presentes no código | Para produção, confirmar nos sistemas CREA-SP |
|---|---|---|
| Cadastro empresarial | Empresa-raiz, estabelecimento/CNPJ completo, registro/visto, movimentação, município, GRE, CNAE principal/secundários | Identificador canônico, histórico de vigência, situação com datas, natureza jurídica, todas as filiais, jurisdição e câmara efetiva |
| RT | Profissional, vínculo empresa-profissional, modalidade, início/fim | RNP/registro regional, CPF protegido, atribuições, títulos e extensões, carga horária, vínculo contratual, escopo do vínculo |
| ART | Número/ID, empresa, registro, data, modalidade, valor, status | Autor e contratantes identificados, contratada, endereço/geometria da obra, atividade, quantidade/unidade, participação, datas de execução, baixa/cancelamento, ART complementar/substituição, contrato/referência |
| CAO/acervo | Solicitação, emissão, status, ARTs relacionadas | Evento de revogação, atestado/contratante, validade documental, quantidades, atividade, ligação verificável com contrato; CAT separada |
| Financeiro | Título, vencimento, valor/pago, pagamento, parcelamento/recuperação | Livro de baixas/pagamentos parciais, atualização, encargos, estornos, remissão/prescrição, dívida ativa, evento de protesto, competência e caixa |
| Fiscalização | Caso e histórico; camada derivada de ações/autos/multas | Fatos reais de denúncia, diligência, evidência, notificação, auto, defesa, julgamento, recurso, decisão definitiva, cancelamento e recuperação; norma aplicada e vigência |
| Atendimento/institucional | Solicitações, atividades, coworking, orçamento demonstrativos | Vincular empresa beneficiária quando pertinente; prazo por tipo de serviço, timestamps, capacidade observada, custo com rateio defensável |
| Qualidade | Evento de divergência, origem, data e evidência | Catálogo de regras, severidade, responsável, resolução, linhagem e processamento |

Conexão SQL Server/IBM Db2 via gateway ainda depende do inventário de tabelas, chaves, permissões e histórico disponíveis; o código não estabelece conexão com sistemas internos reais.

## Lacunas que o novo planejamento deve corrigir

1. **Presença de ART próxima não prova vínculo com contrato.** `src/painel/analise.ts` e `src/painel/fiscalizacao.ts` usam qualquer ART da mesma empresa entre -30 e +60 dias como proxy. Isso pode gerar tanto falso positivo de vínculo quanto falsa ausência. Produção deve usar ponte documental contrato–ART, CNPJ das partes, objeto, local e período com grau de evidência; exibir “vínculo não identificado”, sem concluir ausência de ART.
2. **CNAE não determina obrigação.** A fiscalização demonstrativa chama alvos de “irregularidade identificada” e agrega classes Relacionado/Depende de análise. O novo desenho deve tratar CNAE como universo de análise e acrescentar atividade básica/serviços efetivamente prestados e avaliação normativa.
3. **QSA não equivale a diretoria integral.** A camada `src/cockpit/cruzamentos.ts` sorteia sócios/administradores/diretores fictícios. QSA público contém identificadores pessoais parcialmente mascarados e qualificações societárias; não permite validar sozinho composição/maioria de diretoria nem identificar profissional por nome com segurança. Exigir documentos e correspondência confirmada; avaliar interpretação jurídica do art. 5º antes de regra automática.
4. **Emprego público agregado não se liga nominalmente ao CNPJ ou CPF.** As ligações empresa–engenheiro–salário são inteiramente demonstrativas. RAIS identificada/eSocial só entram mediante instrumento e autorização; não podem ser prometidas como API pública disponível.
5. **Piso salarial precisa de regra jurídica versionada.** `pisoDaJornada` infere jornada diária de carga semanal e usa patamares fixos; não resolve regime contratual, categoria, convenção, jurisprudência, base salarial, remuneração ou jornada diária real. Planejar indicador descritivo e passível de revisão, não infração automática.
6. **CBO deve ser validada.** `cboPorCamara` associa Eng. Química ao mesmo código mecânico `2144-05`; o mapeamento é demonstrativo e não substitui dicionário CBO oficial nem vínculo profissional/atribuição CREA.
7. **Câmara por CNAE é aproximação.** `camaraDaEmpresa` tem apenas quatro câmaras e fallback Eng. Civil. Produção deve usar cadastro técnico e relações N:N de atividade, atribuição e modalidade; não atribuir tudo ao fallback.
8. **Contexto público está congelado.** `src/cockpit/publico.ts` importa JSON/CSV versionados e resultados de relatório de gestão; a aba não faz atualização rotineira nem responde aos filtros do recorte. Há salários intermediados por salario.com.br e fontes gerais do INEP. Para requisito do usuário, substituir por fontes primárias, arquivos oficiais ou acordos com monitoramento e competência explícita.
9. **Formação não prevê concluintes individualmente.** Dados atuais incluem apenas cursos presenciais de uma seleção histórica; não cobrem automaticamente EAD, estudantes no último ano ou vínculo com empresas. Utilizar INEP com recortes documentados e acordos com IES para formandos, sem comparar estoque a fluxo.
10. **Comparações exigem coortes e tempos compatíveis.** Fluxos de ações, autos, regularizações, pagamentos e concessões têm datas próprias; uma regularização posterior à ação é associação temporal, não efeito causal demonstrado.
11. **Público/restrito deve ser camada de dados.** A presença de fatos detalhados no navegador não implementa RLS/OLS. Grafos de pessoas e salários não devem ser entregues como dataset público.
12. **Responsividade mudou em relação à V13.** Segundo `docs/PAINEL.md`, três abas têm terceira linha/rolagem mesmo em 1920×1080 e todas rolam em 1366×768; manter como escolha existente até reestruturação autorizada.

## Checkout para documentação da próxima etapa

`/workspace/github/empresas-planejamento` — branch `integracao-claude-v18`, baseada no merge `049d618`. Pode receber `planejamento-fontes-2026-10/` sem alterar as fontes da aplicação. Antes de publicar documentação, revisar o diff e usar commit normal.
