> **Arquivo histórico — substituído pela diretriz V7.** O conteúdo abaixo preserva decisões e evidências das versões anteriores; não descreve as fontes ativas do BI. A V7 exclui fatos capturados manualmente de sites, PDFs e snapshots dessas medidas. Em produção, o relatório deve consumir SQL Server/DB2 pelo gateway ou APIs homologadas, com rotina automática de ingestão; arquivos oficiais podem alimentar o banco por ETL homologado. Consulte [ATUALIZACAO_AUTOMATICA_V7.md](ATUALIZACAO_AUTOMATICA_V7.md). A integração institucional ainda precisa ser configurada e validada.

# Fontes de integração propostas

A implementação utiliza efetivamente a planilha CNAE e o organograma enviados, além da geometria e nomes de municípios do IBGE. Os demais dados são sintéticos. Esta matriz organiza a integração futura; não indica credenciais, acesso concedido, disponibilidade de microdados ou validação de cada endpoint.

| Fonte oficial | Aplicação prevista | Granularidade e limite |
| --- | --- | --- |
| [Receita Federal — CNPJ](https://www.gov.br/receitafederal/pt-br/assuntos/cadastros/cnpj) | Abertura, situação, CNAEs, porte, natureza e conciliação cadastral. | Separar raiz de empresa e CNPJ de estabelecimento. Normalizar códigos e guardar data de carga. |
| [RAIS](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/estatisticas-trabalho/rais) | Estoque de empregos por município, atividade e ocupação. | Usar agregações ou microdados autorizados; não presumir identificação individual disponível. |
| [Novo CAGED](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/estatisticas-trabalho/novo-caged) | Admissões, desligamentos e saldo mensal. | Fluxos não equivalem ao estoque de profissionais. Registrar revisões e competência. |
| [CBO](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo) | Taxonomia de ocupações técnicas e de engenharia. | Ocupação declarada não comprova formação, atribuição ou registro no CREA. |
| [IBGE — SIDRA](https://sidra.ibge.gov.br/) | CEMPRE, estrutura empresarial, emprego e contexto municipal. | Séries agregadas têm defasagem; alinhar universo e competência antes de comparar. |
| [PNCP](https://www.gov.br/pncp/pt-br) | Fornecedores, objetos, valores e contratação pública. | Classificar objetos para revisão técnica; valores contratados não equivalem a execução. |
| [Portal da Transparência](https://portaldatransparencia.gov.br/) | Contratos e relações de fornecedores com a administração federal. | Cobertura federal e dos dados efetivamente publicados; não extrapolar a todos os entes. |
| [SICAF](https://www.gov.br/compras/pt-br/sistemas/conheca-o-compras/sicaf) | Informações cadastrais públicas de fornecedores, conforme acesso disponível. | Confirmar publicidade, requisitos de acesso e reutilização de cada conjunto. |
| [INPI](https://www.gov.br/inpi/pt-br) | Patentes, marcas e indícios de atividade tecnológica empresarial. | Vinculação por CNPJ depende da disponibilidade de identificadores e normalização. |
| [ANP](https://www.gov.br/anp/pt-br), [ANEEL](https://www.gov.br/aneel/pt-br) e [ANATEL](https://www.gov.br/anatel/pt-br) | Empresas e instalações de setores regulados. | Esquemas heterogêneos; validar identificadores de operador, instalação e pessoa jurídica. |
| [ANA](https://www.gov.br/ana/pt-br) e [SINISA](https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento/sinisa) | Prestadores, serviços e infraestrutura de saneamento; histórico SNIS quando pertinente. | Cobertura e granularidade variáveis, sem presumir identificação de toda empresa executora. |
| [IBAMA — CTF](https://www.gov.br/ibama/pt-br/servicos/cadastros/ctf) | Atividades e empresas em cadastros ambientais publicáveis. | Confirmar finalidade, publicidade e significado de cada situação cadastral. |
| [CEIS/CNEP](https://portaldatransparencia.gov.br/sancoes) | Contexto de sanções administrativas publicadas. | Sanção de outro órgão não determina irregularidade perante o CREA; distinguir fundamento e vigência. |
| [JUCESP](https://www.jucesp.sp.gov.br/) | Movimentações e informações empresariais estaduais. | Acesso e reutilização dependem do serviço e da base específica. |
| [INEP — Educação Superior](https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/censo-da-educacao-superior) | Oferta de cursos e formação por região. | Análise agregada de formação; não identifica automaticamente vínculo com uma empresa. |

## Ordem de integração

1. Homologar regras e chaves internas de empresas, estabelecimentos, registros, vínculos, ARTs, CAOs e obrigações com as áreas responsáveis.
2. Conciliar Receita/CNPJ pelo identificador completo. Guardar coincidência de raiz e sugestões de nome como resultados separados para revisão, sem fusão automática.
3. Incorporar RAIS, CAGED, CBO e IBGE no domínio agregado de território, atividade, ocupação e tempo; validar universo e disponibilidade de cada publicação.
4. Integrar PNCP com chave de fornecedor e estabelecimento quando publicada. Validar contrato, instrumento, objeto, competência e valor antes da classificação textual.
5. Acrescentar fontes regulatórias, inovação, formação e sanções conforme utilidade, acesso e qualidade comprovados.

Cada carga precisa de URL/arquivo de origem, versão, hash quando aplicável, competência, instante de obtenção, volume, rejeições, regras de transformação, processamento e responsável confirmado. Não é adequado afirmar ausência de empresa ou atividade quando a fonte está incompleta ou indisponível.

Normas consultadas e distinções entre cadastro, triagem, notificação, auto, defesa e decisão estão em [NORMAS.md](NORMAS.md). A proveniência dos arquivos efetivamente lidos está em [SOURCES.md](SOURCES.md).
