# Repositório ARTs: achados para os painéis

Leitura feita em 07/11/2026, só leitura. Li os `.md` da raiz e de `docs/` (inteiros: `CONTEXT.md`, `docs/roadmap.md`, `COMECE-AQUI.md`, `docs/plano-consultas-banco.md`, as cinco specs em `.scratch/*/spec.md`, os nove ADRs, `docs/analise/03` a `06`, `docs/revisao/pendencias.md`; por seção: `docs/revisao/perguntas-por-destinatario.md`, tickets de `.scratch/*/issues/`), os dados do protótipo (`prototipo/*-data.js`, `prototipo/creaone-menu.js`), o texto extraído dos PDFs de `docs/fontes/normas/`, `docs/fontes/manual/` e `docs/fontes/creaone/`, as transcrições, o OCR dos vídeos (por busca) e o "Mapa de Campos" dos `docs/RF_*.docx`. Não li imagens nem vídeos. Não abri a pasta `confidencial/`, e nada dela é citado.

## 1. O que é o repositório e o que ele não traz

É a especificação da migração de quatro ARTs (Perícia Judicial, Múltipla, Múltipla de Perícia e Receituário Agronômico) do CreaNet para o CreaOne, mais o rascunho e a Substituição retificadora da ART de Cargo/Função, que já está no CreaOne em versão beta (`AGENTS.md`; `docs/roadmap.md`). Traz specs, 47 tickets (46 `ready-for-agent`, 1 `resolved`), protótipo navegável, base legal e as perguntas abertas por destinatário.

Pontos que valem para todo o relatório:

- **Não há dado real.** Os nomes, CPFs, CNPJs, localizadores e carrinhos do protótipo são fictícios (`prototipo/art-pericia-data.js`, linhas 1 a 6: "Todos os valores abaixo são fictícios ou aproximados"). Nenhum total de ARTs, arrecadação ou perícias aparece no repositório.
- **Não há código coletor.** O que existe é o **plano de consultas SQL ao banco do CreaNet** (`docs/plano-consultas-banco.md`), em DB2, só `SELECT`, com marcadores (`<TAB_ART>`, `<COL_SITUACAO>`) no lugar dos nomes reais. Os resultados, se existirem, ficam só em `confidencial/banco/` (fora do Git). O repositório também não traz o schema do CreaNet (pergunta TI-12).
- **Fonte primária de tudo:** o banco do CreaNet (sistema interno, DB2), que continua sendo o banco das ARTs depois da migração: "Nenhuma tabela ou coluna nova" (ADR 0007, `docs/adr/0007-telas-do-creanet-no-creaone-sem-mudar-o-banco.md`). Os painéis podem, portanto, ler um só lugar para ARTs antigas e novas.
- **Valores de taxa:** só os da Tabela B de 2024 são oficiais (Decisão PL-2065/2024, transcrita no PDF). Faixas da perícia, anuidade, taxa da Cargo/Função e carrinhos são simulados.

## 2. Tipos, modalidades e classificações da ART

### 2.1 Tipificação (Res. 1.137, art. 9º, com a redação da Res. 1.160/2025)

| Tipo legal | Modalidades no CreaOne / CreaNet | Modelo do Anexo I | Observação para os painéis |
|---|---|---|---|
| I. Obra ou serviço | ART Obra/Serviço; ART de Perícia Judicial | A; A.1 (processo ou destinatário público) | No CreaNet a perícia é uma ART de Obra/Serviço com tipo de contratante travado em "Processo Judicial", que hoje **serve de discriminador da modalidade no banco** (`.scratch/art-pericia-judicial/spec.md`, linha 105). O menu do CreaOne abre `ARTObraServico.aspx?type=` com o tipo "PERICIAJUDICIAL" em base64 (`prototipo/creaone-menu.js`). |
| II. Obra ou serviço de rotina ("ART múltipla") | ART Múltipla; ART Múltipla de Perícia (variante, não tipo novo, ADR 0003); ART de Receituário Agronômico (o manual chama de "ART Múltipla de Receituário Agronômico") | B; B.1 | Uma ART por mês com vários itens (contratos, processos ou receitas). A marca da variante "Perícia" no banco ainda é pendência (TI-10). |
| III. Cargo ou função | ART Cargo/Função | C (único que ainda mostra Nível de Atuação) | Vínculo do profissional com pessoa jurídica de direito público ou privado (arts. 41 a 44). |
| (Res. 377/1993) | ART de Aviação Agrícola, uma por Guia de Aplicação | — | Fora desta entrega (ADR 0004). Taxa igual à do receituário (art. 5º). |

O parágrafo único do art. 9º (Res. 1.160) diz que os destinatários podem ser contratantes privados, instituições públicas ou decorrer de nomeação judicial: é a base da perícia e da Múltipla de Perícia.

### 2.2 Forma de Registro: sete códigos legados (ADR 0009)

Complementar - aditivo de prazo; Complementar - aditivo de valor e outras alterações; Complementar - detalhamento de atividades técnicas; Complementar - obra/serviço vinculada à ART cargo/função; Inicial; Substituição- modificação do objeto do contrato ou atividade técnica contratada; Substituição retificadora (`docs/adr/0009-forma-e-participacao-do-creaone.md`). O motivo já vem na opção; não há campo Motivo. As alíneas c (ordem de serviço de contrato global) e d (reinício após paralisação) do art. 10, II, não têm código próprio e caem em "aditivo de valor e outras alterações" (ART-24, pendente). Na Cargo/Função só há Inicial e Substituição retificadora (art. 41, § 2º: mudar cargo, função ou circunscrição pede ART nova). Múltipla e Receituário são sempre Inicial e Individual.

### 2.3 Participação Técnica: sete códigos legados

Coautor, Coautoria- vinculada, Corresponsabilidade, Corresponsabilidade- vinculada, Equipe, Equipe-vinculada, Individual. As "- vinculada" exigem o nº da ART do primeiro profissional (art. 28) e pagam o valor mínimo (`.scratch/art-pericia-judicial/spec.md`, histórias 9 e 40).

### 2.4 Tipo de contratante e de destinatário

Manual ARTFácil (`docs/fontes/manual/artfacil-crea-sp.pdf`, p. 6): Pessoa Física; Pessoa Física Estrangeira; PJ de Direito Privado; PJ de Direito Público; PJ Estrangeira. Na perícia o Anexo I pede "tipo de destinatário do serviço" (item 1.3), que no protótipo é PJ de direito público, PJ de direito privado ou pessoa física; onde gravá-lo é pendência (TI-14), porque a coluna do tipo de contratante já guarda "Processo Judicial".

### 2.5 Outros domínios úteis

- **Finalidade** (perícia): Agrícola, Ambiental, Comercial, Industrial, Infraestrutura, Institucional, Lazer, Residencial, Saúde, Segurança, Transporte, Outra (`prototipo/art-pericia-data.js`, linha 131). O CreaNet **marcava "Saúde" de antemão** (`.scratch/art-pericia-judicial/spec.md`, história 30): qualquer estatística de finalidade das perícias antigas tem esse viés.
- **Atividade da perícia:** Perícia, Laudo, Avaliação, Vistoria, Parecer Técnico, Arbitramento, Inspeção (mesmo arquivo, linha 129).
- **Documento do contrato na Múltipla:** Contrato, Nota Fiscal, Ordem de Serviço, Processo, Receituário, Renavam (Modelo B).
- **Variante BIM:** "Trabalho em BIM" grava a variante "em BIM" do código da atividade (`.scratch/art-comum/spec.md`, história 58): permite medir adoção de BIM por área.
- **Entidade de Classe:** código legado "0-NÃO DESTINADA" quando o profissional não escolhe (manual, p. 25). Se a entidade recebe parte do valor da ART, e em que proporção, é a pergunta ART-29 (não respondida).
- **Ação Institucional e Convênio:** convênio do Crea que dá "condições de excepcionalidade para registro da ART" (Anexo I, item 1.2). O menu do CreaOne tem "Convênio de Programas Sociais" com Defensoria Pública e Ministério Público (`prototipo/creaone-menu.js`).
- **Modelo da ART** no CreaNet: "Eletrônica - Resolução 1025" (`docs/fontes/creaone/creanet-servicos-art.pdf`), resolução já revogada pela 1.137.

## 3. Situações da ART: ciclo de vida, baixa, cancelamento, nulidade, substituição

### 3.1 Estados e códigos (`.scratch/art-comum/spec.md`, módulo 2, linhas 303 a 308, e linha 349)

| Na ART | Na Consulta de ART do CreaOne | Código legado no CreaNet | Regra |
|---|---|---|---|
| Rascunho | Em Preenchimento | PREENCHIMENTO | Identificado pelo Localizador ("LC" + 8 dígitos nos exemplos). Sem valor jurídico. |
| Enviada | Pendente Pagamento | ENVIADA | "Cadastrada" no manual: "sem valor jurídico" até o pagamento. |
| Registrada | Ativa | código de ART paga (nome não informado) | Recebe o nº da ART (13 dígitos) só depois da confirmação do pagamento (P-14). |
| Baixada | Baixada | código de ART com baixa | Continua válida; motivo, atividades e data vão ao SIC (art. 19). |
| — | Anulada; Cancelada | códigos a confirmar | Aparecem só no filtro da consulta (`docs/analise/06-prints-creaone-consulta-e-obra-servico.md`, seção "Situações"). |

A lista exata de situações do CreaOne é a pergunta ONE-11. O OCR dos vídeos mostra o rótulo do CreaNet "Status da ART: PREENCHIMENTO (n/5)" e "ENVIADA (5/5)", em que n/5 é a etapa do assistente (`docs/fontes/videos/ocr-art-pericia-judicial-creanet.txt`). Isso permite um indicador de **abandono por etapa** se o banco guardar a etapa (indício; não confirmado).

### 3.2 Base legal das saídas (texto da Res. 1.137 em `docs/fontes/normas/res-confea-1137-2023.pdf`)

- **Baixa (arts. 13 a 19).** Obrigatória ao fim da atividade. Motivos: conclusão; interrupção por rescisão contratual, substituição do responsável técnico ou paralisação (art. 14). Pedida pelo profissional com motivo, atividades concluídas e, se não concluída, a fase (art. 15). Pedida pelo contratante ou pela empresa (art. 16): o Crea notifica o profissional, que tem **10 dias** para se manifestar. **Baixa automática** (art. 18) quando o profissional falece, tem o registro cancelado ou suspenso, ou deixa o quadro técnico da empresa contratada. Só a ART baixada (ou com atestado) entra no **acervo técnico** e, daí, na CAT (art. 45).
- **Cancelamento (arts. 20 a 23).** Quando nenhuma atividade foi executada ou houve registro em duplicidade "com apresentação de comprovante de pagamento" (redação da Res. 1.160). Pedido pelo profissional (com declaração de que contratante e empresa estão cientes, § 1º), pela empresa ou pelo contratante (10 dias para o profissional se manifestar, § 2º). O Crea abre processo administrativo de cancelamento quando constata que as atividades não foram executadas, julgado pela **câmara especializada** (art. 22).
- **Nulidade (arts. 24 a 26).** Cinco hipóteses: lacuna, erro ou inexatidão insanável; incompatibilidade com as atribuições; **empréstimo de nome** (após trânsito em julgado); outra forma de exercício ilegal; apropriação de atividade de outro profissional. Decide a câmara especializada; antes, o Crea notifica para correção em **10 dias** (art. 25, § 1º). Motivo e data da decisão vão ao SIC (art. 26).
- **Substituição (art. 10, III).** (a) muda a caracterização do objeto ou da atividade; (b) corrige erro de preenchimento. A (b) é a antiga "Retificadora", **isenta** (R$ 0,00; ADR 0006, D-04 pendente). O manual diz que a retificadora da Cargo/Função é usada "geralmente para fins de Certidão de Acervo Técnico" (p. 12).
- **Regularização (art. 68; Res. 1.050/2013 com a redação da Res. 1.139/2023, texto em `docs/fontes/normas/res-confea-1139-2023.md`).** Só obra ou serviço **concluído** há no máximo **5 anos** do protocolo; o Crea pode pedir documentos em até **60 dias**, e o interessado tem **30 dias** para enviá-los. Taxa de **R$ 405,52** e estimativa de **20 dias úteis** na tela do CreaNet.

### 3.3 Motivos gravados hoje no CreaNet (gravações de 06/11/2026, `docs/analise/05-telas-creanet.md`, T13 e T14)

- Baixa por terceiros (vai para o "Sub-Serviço" do protocolo): RESCISÃO CONTRATUAL; PARALISAÇÃO DA OBRA/SERVIÇO; SUBSTITUIÇÃO DO RESPONSÁVEL TÉCNICO; BAIXA DO RESP. PERANTE EMPR. CONTRATADA. A conclusão não está na lista (é do próprio profissional).
- Cancelamento: CANCELAMENTO DE ART- CONTRATO NÃO FOI EXECUTADO; …NENHUMA DAS ATIVIDADES TÉCNICAS FORAM EXECUTADAS; …DUPLICIDADE DE PAGAMENTO - DN Nº 85/2011. Sem taxa. Protocolo com situação "Solicitação Enviada", estimativa de 10 dias úteis.
- Regularização: protocolo com situação "Aguardando Pagamento", serviço "Serviços ART", sub-serviço "Regularização de ART". Só aceita Localizador em PREENCHIMENTO.
- Baixa pelo próprio profissional: **sem fonte** no repositório (M1-BAIXA-PROF); o protótipo segue os arts. 14 e 15.

## 4. Campos do CreaNet e onde estão gravados

Os nomes de coluna dos RFs são **ilustrativos** (`localizador`, `nr_art`, `nr_contrato`, `dt_celebracao`, `vl_contrato`, `tp_contratante`, `status`, `registro_profissional`); o nome real é pergunta à TI do CreaNet (`.scratch/art-comum/spec.md`, linha 353).

### 4.1 Comuns (`.scratch/art-comum/spec.md`, tabela "Destino dos campos comuns", linhas 355 a 376)

Localizador; nº da ART; situação; registro do profissional; Forma de Registro e Participação Técnica (mesmos códigos); nº das ARTs vinculadas (forma, participação, contrato); Ação Institucional e Convênio; Empresa Contratada (registro e CNPJ); endereços; Área, Subárea, Atividade, Obra/Serviço, Complemento (códigos da TOS) e a variante BIM; Observações (tamanho da coluna pendente, D-05; o impresso mostra 110 caracteres); declarações de arbitragem (Lei 9.307/1996) e acessibilidade (Decreto 5.296/2004); Mês/Ano de Referência (MM/AAAA). Sem destino conhecido: **Valor da ART** (TI-04), **log de auditoria** (TI-06), **Crédito Rural** (TI-08) e o que gravar no **Nível de Atuação** (TI-07, ADR 0001). A consulta do CreaNet mostra ainda "Valor de Contrato", "Custo da obra", "Valor da ART a Pagar", "Data de preenchimento", "Data de Pagamento" e "Valor Pago" (`docs/fontes/creaone/creanet-servicos-art.pdf`).

### 4.2 Perícia Judicial (`.scratch/art-pericia-judicial/spec.md`, linhas 108 a 127)

| Dado | Coluna no CreaNet | Qualidade do dado antigo |
|---|---|---|
| Nº do processo | coluna do nº do contrato | Texto livre: aceitava "sd", "123" (Problem Statement). A versão normalizada CNJ não tem coluna. |
| Data de nomeação | coluna "Celebrado em" | — |
| Honorários | coluna do valor do contrato; define a faixa da taxa | Honorários não arbitrados = valor proposto ao juízo (premissa P-01). |
| Destinatário (tribunal) e CPF/CNPJ | colunas do contratante (D-01, pendente) | Hoje "PARTES INTEGRANTES DO PROCESSO", **sem CPF/CNPJ**. |
| Locais periciados, início, previsão de término | mesmas colunas | — |
| Latitude e longitude | colunas rotuladas "Coordenadas (DDD)" | Rótulo confundido com DDD de telefone: dado antigo pouco confiável. |
| "Registrada depois do início" | sem coluna; derivável da data de início do local e da data do registro | — |

### 4.3 Múltipla e Múltipla de Perícia (`.scratch/art-multipla/spec.md`, linhas 118 a 134)

Mês/Ano de Referência (MM/AAAA, texto livre no CreaNet); Quantidade de Contratos (campo legado gravado no envio); local, unidade, documento e nº do documento, **Valor Individual da ART** (mesma coluna); itens com contratante, CPF/CNPJ, telefone, datas, valor do contrato, quantidade e informações complementares numa "estrutura de itens" cujas colunas os RFs não dão (TI-10). Pendentes: Crédito Rural por contrato; Tipo de Contratante por contrato (D-13; sem coluna, só o CPF/CNPJ fica); nº do processo de cada item e a marca da variante Perícia.

Regras do CreaNet que distorcem a série histórica: limite de 300 contratos por ART; valor individual de 0,48% do contrato (inventado); 12 meses anteriores aceitos como mês de referência; início do contrato obrigatoriamente dentro do mês (Problem Statement da spec; achados MU-01 a MU-04 em `docs/analise/03-verificacao-normativa.md`).

### 4.4 Receituário Agronômico (`.scratch/art-receituario/spec.md`, linhas 102 a 117)

Mês/Ano de Referência; Quantidade de Receitas (na coluna da "Quantidade de Contrato"); Área, Subárea e Atividade fixas ("Agronomia, Agrícola, Florestal, Pesca e Aquicultura" / "Prescrição de Receituário Agronômico e Receitas" / "Prescrição"); tipo de receituário (agronômico, florestal ou os dois, uma atividade por escolha); receitas nas colunas dos "contratos de receita" (produtor, CPF/CNPJ, endereço da propriedade, datas, valor); valor por receita na coluna do "Valor por Contrato". **Sem coluna conhecida:** nº do receituário (D-07) e Crédito Rural por receita (D-08). A receita agronômica completa (cultura, diagnóstico, produto) fica na tabela da tela T15 do CreaNet, ainda sem nome (M1-BANCO).

### 4.5 Cargo/Função (`.scratch/art-cargo-funcao/spec.md`; Modelo C do Anexo I)

Contratante só pessoa jurídica (CNPJ), tipo direito privado ou público; Identificação do Cargo/Função; Tipo de Vínculo (domínio do CreaNet desconhecido; seis tipos provisórios no protótipo: CLT, estatutário, comissão, prazo determinado, sócio ou diretor, prestação de serviço; CF-VINCULO); Unidade Administrativa e endereço; Data de Início e Previsão de Término; jornada em horas por semana (aviso acima de 44 h); retificadora com o nº da ART corrigida na coluna de ART vinculada. Só há print da etapa 1 da ART beta (CF-CAMPOS).

### 4.6 Telas migradas: carrinho, pagamento, protocolos, personalização (`.scratch/art-comum/spec.md`, linhas 382 a 408)

Todo destino está como "M1-BANCO" (a coluna que a tela antiga já grava, a confirmar). Campos: nº do carrinho, data de inclusão e vencimento (validade), ARTs e valor de cada uma, itens de cobrança (código, descrição, valor), forma de pagamento e operadora, sacado do boleto (nome e CPF/CNPJ), nosso número e linha digitável, data de pagamento e autenticação; protocolo (nº, tipo de serviço, sub-serviço, data), ARTs do pedido, motivo, profissional substituto, estágio da obra, justificativa, aceite do termo, anexos, endereço e prioridade da regularização (licitação); personalização (participação, forma, tipo de ART, empresa, ação institucional, tipo de contratante, CEPs, finalidade, unidade, entidade de classe); baixa pelo profissional (motivo, atividades, fase, data).

## 5. Valores de taxa por faixa

| Parâmetro | Valor no repositório | Natureza | Fonte |
|---|---|---|---|
| Tabela B 2024 (rotina), faixas 1 a 7 | até R$ 500 = 1,93; até 1.000 = 3,93; até 2.000 = 5,86; até 3.000 = 9,81; até 4.500 = 15,77; até 6.000 = 23,64; até 7.500 = 31,70; faixa 8 (7.500,01 a 15.000) = Tabela A | **Oficial 2024** (Decisão PL-1.241/2023, citada na PL-2065/2024) | `docs/fontes/normas/decisao-pl-2065-2024-art-multipla-mensal.pdf`; `prototipo/art-multipla-data.js` |
| Mínimo da ART múltipla (faixa 1 da Tabela A) | R$ 108,39 | 2024 | Res. 1.067/2015, art. 6º, § 2º |
| Teto (Lei 12.514/2011, art. 11) | R$ 150,00 na lei, corrigido pelo INPC: R$ 262,55 em 2024 | Oficial | PL-2065/2024 |
| Regra da Múltipla | `min(teto, max(soma dos valores individuais, mínimo))` | Regra | `.scratch/art-comum/spec.md`, módulo 9 |
| Valor por receita | R$ 2,10 (52 a 300 receitas; 300 = R$ 630,00) | Sistema antigo | `prototipo/art-receituario-data.js` |
| Faixas da perícia | até R$ 8.000 = 108,39; até 15.000 = 189,62; acima = 285,59 | **Simuladas** | `.scratch/art-pericia-judicial/spec.md`, linha 104 |
| ART vinculada ("- vinculada") | valor mínimo | Sistema antigo | idem, história 40 |
| Substituição retificadora | R$ 0,00 | ADR 0006 (D-04 pendente) | — |
| Cargo/Função Inicial | R$ 108,39 | Simulado (CF-TAXA, FIN-05) | `prototipo/art-cargo-funcao-data.js` |
| Taxa de regularização | R$ 405,52 | Tela do CreaNet | `docs/analise/05-telas-creanet.md`, T12 |
| Anuidade 2026 no carrinho | R$ 650,00 | Simulado | `prototipo/servicos-art-data.js` |

Duas inconsistências que interessam ao Financeiro, ambas **indício** a confirmar com FIN-01 e D-06:

1. A Res. 1.067, art. 6º, § 1º, manda cobrar cada receita pela **faixa 1 da Tabela B** (R$ 1,93 em 2024). O CreaNet cobra **R$ 2,10** (o próprio arquivo do protótipo diz "R$ 1,93 em 2024, arredondado no sistema antigo para R$ 2,10"). A diferença é de R$ 0,17 por receita (cerca de 9%).
2. Se o teto da Lei 12.514 valer para o Receituário (pergunta ao jurídico, ART-05), toda ART de receituário acima de 125 receitas (125 × 2,10 = R$ 262,50) passa do teto; a de 300 receitas (R$ 630,00) fica R$ 367,45 acima.

Na Múltipla, o CreaNet calculou o valor individual por 0,48% do contrato, e não pela Tabela B (achado MU-02). A coluna do Valor Individual existe; a diferença entre o cobrado e o devido é calculável no banco.

## 6. Prazos normativos e operacionais

| Prazo | Valor | Base |
|---|---|---|
| Registro da ART de obra ou serviço | antes do início da atividade | Res. 1.137, art. 27 |
| Obra pública | até 10 dias após a ordem de serviço ou o contrato, se não começou | art. 27, § 1º |
| Perícia | prazo 0 em parâmetro (`PRAZO_REGISTRO_DIAS = 0`); o protótipo antigo usava 10 dias, que a norma dá só a obra pública | D-02, achado PJ-02 |
| ART múltipla | até o último dia útil do mês seguinte ao da execução; vedado item concluído antes ou iniciado depois do mês | art. 37 e parágrafo único |
| Cargo/Função | após o contrato ou o ato de nomeação; só vale com o vínculo comprovado | arts. 41, § 1º, e 43 |
| Aviação agrícola | uma ART por Guia, até a data do serviço | Res. 377/1993, art. 3º |
| Manifestação do profissional (baixa ou cancelamento por terceiros) | 10 dias | arts. 16, § 1º, e 21, § 2º |
| Correção antes da anulação | 10 dias | art. 25, § 1º |
| Regularização | serviço concluído há até 5 anos; documentos pedidos em até 60 dias; 30 dias para enviar | Res. 1.050/2013 com a Res. 1.139/2023 |
| Estimativas de atendimento no CreaNet | regularização 20 dias úteis; baixa por terceiros 10; cancelamento 10 | telas T12 a T14 |
| Validade do carrinho (vencimento do boleto) | 9 dias (observado no vídeo; P-16) | sistema antigo |
| Confirmação do pagamento | boleto até 1 dia útil; cartão até 2 horas | extrato do carrinho (T8) |
| Pesquisa de carrinhos | só emitidos desde 01/01/2020 | T9 |
| Vigência da Res. 1.160/2025 | 90 dias após 11/12/2025 | Res. 1.160, art. 8º |

## 7. Perícias judiciais

**O que a nova ART traz.** Número CNJ obrigatório e validado (módulo 97, ano entre 1900 e o atual), com decomposição em J.TR (ramo e tribunal) e OOOO (foro de origem) (`.scratch/art-comum/spec.md`, módulo 5). O tribunal vira o destinatário, já com o CNPJ, e o endereço do foro é sugerido (ADR 0002). A Múltipla de Perícia relaciona várias nomeações do mês, uma linha por processo (Modelo B.1), sem processo repetido. Há aviso de outro registro para o mesmo processo (duplicidade, art. 20).

**Dependência externa:** a tabela de tribunais e foros no padrão CNJ não tem fonte oficial definida (ONE-03); o protótipo traz uma base simulada com quatro tribunais (TJSP, TRT-2, TRT-15 e TRF-3) e poucos foros (`prototipo/art-pericia-data.js`, linhas 58 a 83). Fonte natural: tabelas do CNJ (códigos de tribunal e de unidade de origem); não há coletor no repositório.

**Consultas planejadas (bloco 4 de `docs/plano-consultas-banco.md`, linhas 459 a 554), todas agregadas:** 4.1 contratante das perícias por tamanho do documento (CPF, CNPJ ou vazio); 4.2 formato do nº do processo (tamanho e pontuação: mede quantos já são CNJ de 20 dígitos); 4.3 perícias com e sem empresa contratada; 4.4 as 10 atividades mais usadas; 4.5 dias entre nomeação e registro, em faixas (0 ou antes, 1 a 10, 11 a 30, mais de 30). O repositório não traz os resultados.

**Indicadores possíveis:** ARTs de perícia por mês, por tribunal e por foro (só nas ARTs novas, ou nas antigas cujo número normaliza para CNJ); honorários declarados (mediana e faixas) por especialidade; peritos ativos por título; parte das perícias registradas depois do início (art. 27) e dias da nomeação ao registro; peritos com várias nomeações no mês que ainda usam ARTs separadas (candidatos à Múltipla de Perícia); perícias com registro suspenso ou interrompido no período (art. 8º).

**Cruzamentos:** nomeações publicadas (Diário da Justiça Eletrônico, sistemas de auxiliares da justiça, DataJud) contra ARTs de perícia pelo nº CNJ e pelo registro do perito: **perito nomeado sem ART** (malha fina da Fiscalização) e **ART de perícia sem nomeação encontrada**. O DataJud dá movimentos por nº CNJ, mas se ele identifica o perito não está confirmado neste repositório.

## 8. Receituário Agronômico (agrotóxicos)

**Base:** Res. Confea 1.149/2025 (revogou a 344/1990), que remete à Lei 14.785/2023 (agrotóxicos). Só engenheiro agrônomo e engenheiro florestal prescrevem (art. 2º). O receituário tem, no mínimo, usuário e endereço, cultura e área, local com **coordenadas obrigatórias**, diagnóstico, produto comercial, quantidade, forma de aplicação, período, precauções, responsável técnico, cadastro do aplicador e intervalos de segurança (art. 3º). Os sistemas devem gerar "relatórios de rastreabilidade para auditorias e fiscalizações" (art. 6º, IV). São infrações: prescrição sem diagnóstico, **uso do receituário "para fins meramente comerciais"** e negligência (art. 8º). O art. 8º, parágrafo único, prevê cooperação com outros órgãos que fiscalizam a Lei 14.785. A prescrição "off-label" deve bater com a monografia da Anvisa (art. 7º).

**O que a ART guarda.** A ART não emite o receituário; ela relaciona as receitas do mês (de 52 a 300). Cada receita passa a ter nº do receituário (sem coluna conhecida), produtor, CPF/CNPJ, endereço da propriedade, datas, valor e Crédito Rural. Cultura, diagnóstico e produto ficam só na receita completa da tela T15, que é **opcional** hoje (M3-RECEITA-OPCIONAL); princípio ativo não é pedido. Depois do pagamento, o sistema grava as receitas como receita agronômica ligada ao nº da ART (`art-receituario 07`).

**Consultas planejadas (bloco 6, linhas 628 a 694):** 6.2 receitas por ART (máximo, ARTs acima de 300, abaixo de 52); 6.3 data da receita contra o mês de referência; 6.4 quantas receitas têm o cadastro completo (cultura); 6.5 tipo de receituário por título.

**Indicadores possíveis:** agrônomos com ART de receituário por mês e por regional; receitas relacionadas contra quantidade paga (ARTs pagas e não preenchidas); agrônomos que batem o teto de 300 receitas todo mês (indício de uso comercial, art. 8º, II); parte das receitas completas; receitas com Crédito Rural; receitas por município da propriedade; agrônomo responsável técnico de revenda de agrotóxico (pela empresa contratada da ART).

**Cruzamentos com dados externos:**

- **CDA-SP (Defesa Agropecuária, GEDAVE)** e **MAPA**: receitas e vendas de agrotóxicos por revenda e por propriedade, contra as receitas declaradas na ART (pelo CPF do agrônomo, CNPJ da revenda e município). Depende de convênio.
- **MAPA Agrofit**: produto e cultura registrados, para conferir a receita completa e sinalizar "off-label" (art. 7º). Base pública.
- **MAPA SIPEAGRO**: estabelecimentos registrados (revendas e aplicadores) pelo CNPJ.
- **Banco Central (SICOR, Matriz de Dados do Crédito Rural, pública por município)**: operações de crédito rural contra ARTs e receitas marcadas com Crédito Rural (Res. 1.160, Anexo I, item 1.4). Mede quanto do crédito rural tem ART de agronomia. A fonte é um conhecimento meu, não está no repositório.
- **IBGE (Produção Agrícola Municipal)**: área plantada por município, para medir receitas por mil hectares e achar municípios com muita lavoura e pouca receita.
- **ANAC e MAPA (aviação agrícola)**: aplicações aéreas contra ARTs por Guia de Aplicação, se a modalidade entrar (ADR 0004 a deixa fora).

## 9. ART de Cargo/Função: vínculo com empresa ou órgão público

O vínculo com pessoa jurídica de direito público ou privado **obriga** à ART no Crea da circunscrição (art. 41). Só a mudança de cargo, função ou circunscrição obriga a nova ART (§ 2º). A ART de cargo não dispensa as ARTs de obra ou serviço (art. 42). O registro só vale com o vínculo comprovado (art. 43) e quem paga é a empresa (art. 44). Baixa automática quando o profissional deixa o quadro técnico (art. 18, II).

**Indicadores possíveis:** profissionais com ART de cargo ativa, por tipo de vínculo e por tipo de contratante (público ou privado); órgãos públicos com e sem ART de cargo; jornada declarada acima de 44 h ou soma de jornadas simultâneas acima de 44 h (indício de acúmulo ou de vínculo só no papel); ARTs de cargo ativas de profissional que já saiu do quadro técnico da empresa (falha da baixa automática do art. 18); retificadoras isentas por ano (o manual liga a retificadora à CAT); empresas com responsável técnico sem ART de cargo (o RT do painel de Empresas contra a ART).

**Cruzamentos:** quadro técnico e RT do cadastro de empresas do Crea-SP (interno); RAIS e Novo CAGED (empregos em ocupações de engenharia por CNPJ, só em totais sem acordo); portais da transparência e folhas de pagamento de prefeituras e do estado (engenheiros e agrônomos servidores sem ART de cargo); Receita Federal (situação do CNPJ do contratante).

## 10. Carrinho, pagamento e boleto (Financeiro)

Regras do carrinho do CreaNet que continuam (ADR 0007; `.scratch/art-comum/spec.md`, módulo 16): só ART Enviada entra; uma ART fica em no máximo um carrinho aberto; finalizar gera o número e a validade (9 dias); situação derivada, **não gravada**: Pago (tem data de pagamento), Vencido (validade passou sem pagamento), Aberto. O boleto é do Banco do Brasil, com Pix só pelo QR Code, e não muda. Pagadores possíveis: profissional, contratantes das ARTs do carrinho e empresa contratada, nunca o tribunal (M4-SACADO). O cartão é pago no site da operadora; a única credenciada visível é a Giro Pagamentos (a outra opção tinha imagem quebrada). Itens de cobrança ("Receita", no sentido financeiro): anuidade e taxas liberadas pelo Financeiro (lista desconhecida, FIN-02). A taxa da regularização entra sozinha (FIN-03, pendente). O extrato mostra forma, data, autenticação, operadora, anuidades e taxas e cada ART com situação e valor.

**Consultas planejadas (bloco 7, linhas 698 a 798):** 7.2 situações do carrinho; 7.3 dias entre emissão e vencimento; 7.4 tipos de item no carrinho; 7.5 quem é o sacado (profissional, contratante, empresa ou outro), comparando documentos sem mostrá-los; 7.6 tempo até a confirmação por forma de pagamento (até 2 h, até 24 h); 7.7 que gatilho ou rotina muda a situação da ART depois do pagamento.

**Indicadores possíveis:** arrecadação de ART por modalidade, forma de registro e mês; ARTs enviadas e nunca pagas (estoque "Pendente Pagamento" e receita que não entrou); carrinhos vencidos sem pagamento; boleto contra cartão e operadora; quem paga (profissional contra empresa, que pelos arts. 39 e 44 deveria pagar nas ARTs de vínculo); valor isento por Substituição retificadora; receita limitada pelo teto na Múltipla; cancelamentos por duplicidade de pagamento (DN 85/2011) e o item de menu "Solicitar Reembolso de Taxa, Anuidade ou ART" (`prototipo/creaone-menu.js`); taxas de regularização pagas contra protocolos "Aguardando Pagamento"; diferença entre o cobrado e o devido na Múltipla (0,48% contra Tabela B) e no Receituário (R$ 2,10 contra R$ 1,93).

**Dado externo:** INPC do IBGE, que corrige o teto da Lei 12.514 a cada ano; tabelas anuais do Confea (decisões plenárias).

## 11. Solicitações e protocolos (Atendimento)

Baixa por terceiros, cancelamento e regularização gravam no protocolo do CreaNet (tipo de serviço, sub-serviço, data, situação) e são acompanhadas em "Acompanhar serviços solicitados", que já está no CreaOne. A consulta 8.2 do plano conta protocolos por serviço e sub-serviço desde 2025; a 8.3 conta anexos por motivo de cancelamento. Indicadores: volume por serviço e motivo; tempo até a conclusão contra a estimativa de cada tela (10 e 20 dias úteis) e os prazos da norma (10 dias de manifestação; 60 e 30 dias da regularização); pedidos de regularização com prioridade para licitação; baixas por terceiros recusadas por serem do próprio profissional. O repositório também registra defeitos do CreaNet que geram atendimento, como a mensagem técnica da operadora ("Não é possível converter um objeto do tipo 'BMCREANET.Util.API.Retorno'…", T6) e o boleto que não reabre (Q4).

## 12. Plano de consultas ao banco: o que serve aos painéis

`docs/plano-consultas-banco.md` é o único "coletor" do repositório: SQL DB2 de leitura, com regras de segurança (sem `SELECT *` em tabela de pessoa, sem CPF, CNPJ, nome ou número de ART na saída; linhas 18 a 27). Quem roda é Caio, no cliente de banco, com login só de leitura; o resultado vai para `confidencial/banco/`. Para os painéis, os blocos dão:

| Bloco | Linhas | O que devolve que vira indicador |
|---|---|---|
| 0 | 132 a 250 | Tabelas e número de linhas (`SYSCAT.TABLES`), mapa por assunto (ART, contratos, receitas, perícia, carrinho, protocolo, log, valores) |
| 1 | 254 a 321 | Nº da ART por situação (1.4); tipo de ART por origem do preenchimento (1.5: CreaNet contra CreaOne, se houver coluna) |
| 2 | 325 a 400 | Domínios de situação, forma, participação, tipo de ART e tipo de contratante; uso por tipo (2.3); valor mínimo e máximo por forma (2.4); tipo de contratante por tipo de ART (2.5) |
| 3 | 403 a 456 | Se existe e se é preenchida a coluna do Crédito Rural |
| 4 | 459 a 554 | Perícias: documento do contratante, formato do processo, empresa, atividades, dias até o registro |
| 5 | 558 a 625 | Múltiplas: ARTs e itens por tipo (5.2), contratos iniciados antes do mês (5.3), **meses de atraso** do registro (5.4) |
| 6 | 628 a 694 | Receitas por ART, janela do mês, cadastro completo, tipo por título |
| 7 | 698 a 798 | Carrinho: situações, validade, itens, sacado, tempo até a confirmação |
| 8 | 802 a 869 | Protocolos por serviço e sub-serviço, anexos por motivo |
| 9 | 873 a 918 | Personalização: um padrão por profissional, uso de cada campo |
| 10 | 922 a 956 | Estrutura do log de auditoria (quem, quando, valor antigo e novo) |
| 11 | 960 a 1032 | Tabelas de valores por ano (procura 108,39, 262,55, 2,10 e 405,52), tribunais e foros, ação institucional, entidade de classe por tipo de ART (11.5), TOS |

Os mesmos SELECTs, com os nomes reais, servem de base para a extração periódica dos painéis. Eles já respeitam a regra de não tirar dado pessoal. Frequência: não há rotina; o plano é pontual.

## 13. Indicadores e cruzamentos novos que este repositório permite

Interno com interno (banco do CreaNet):

1. **ARTs por tipo, forma e participação**, mês a mês, com a nova taxonomia (sete formas, sete participações). O painel de Empresas hoje só tem ART "Registrada" ou "Baixada" (`src/domain/types.ts`, linha 20).
2. **Funil do registro:** rascunho, enviada, paga, baixada; tempo de cada passo; ARTs enviadas sem pagamento.
3. **Saídas da ART:** baixas por motivo (conclusão contra interrupção), baixas automáticas por suspensão ou falecimento (art. 18), cancelamentos por motivo, anulações (art. 24, inclusive empréstimo de nome) e substituições retificadoras.
4. **Registro tardio:** perícias registradas depois do início (art. 27), Múltiplas registradas além do último dia útil do mês seguinte (consulta 5.4), regularizações (serviço concluído sem ART).
5. **Acervo:** parte das ARTs registradas que nunca foram baixadas e, por isso, não entram no acervo nem na CAT (art. 45).
6. **Arrecadação e renúncia:** valor por modalidade, isenções, teto, diferença entre cobrado e devido.

Interno com externo (alto valor):

| Cruzamento | Chave | Dado externo | Acesso | Painel |
|---|---|---|---|---|
| Perito nomeado sem ART de perícia | nº CNJ, registro ou CPF do perito | Diário da Justiça Eletrônico; DataJud (CNJ); cadastro de peritos da Justiça do Trabalho (AJ-JT) | DJE público; DataJud com chave; AJ-JT restrito | Profissionais, Fiscalização |
| Destinatário e foro da perícia | J.TR e OOOO do nº CNJ | Tabelas de tribunais e unidades do CNJ | Público (fonte a definir, ONE-03) | Profissionais |
| Obra pública com ART fora dos 10 dias (art. 27, § 1º) | código de obra pública da ART (campo "Código", Anexo I, item 1.4) e CNPJ do contratante | PNCP, Obrasgov (data do contrato e da ordem de serviço) | Público | Fiscalização |
| Crédito rural sem ART de agronomia | município, CPF/CNPJ do produtor (com acordo) | SICOR / Matriz de Dados do Crédito Rural (BCB) | Totais públicos; individual só por acordo | Fiscalização, Profissionais |
| Receita agronômica contra venda de agrotóxico | CPF do agrônomo, CNPJ da revenda, município | CDA-SP (GEDAVE), MAPA | Convênio | Fiscalização |
| Produto e cultura da receita completa | produto, cultura | MAPA Agrofit; monografias da Anvisa | Público | Fiscalização |
| Revenda e aplicador registrados | CNPJ | MAPA SIPEAGRO | Público | Empresas, Fiscalização |
| Receitas por área plantada | município | IBGE PAM | Público | Fiscalização, Presidência |
| Servidor engenheiro sem ART de cargo | CNPJ do órgão, CPF (com acordo) | Portais da transparência, folhas de pagamento | Público em parte | Fiscalização, Empresas |
| Vínculo de cargo que não existe mais | CNPJ e CPF | RAIS/eSocial (só com acordo; sem ele, totais) | Acordo | Empresas |
| ART ativa de profissional falecido | CPF | Situação do CPF na Receita Federal | Acordo | Profissionais, Fiscalização |
| Teto da ART corrigido | ano | INPC (IBGE) | Público | Financeiro |

## 14. O que já existe no repositório empresas (para não repetir)

- **Perícias:** o painel de Profissionais já tem o bloco "nomeações de peritos" com parceria TJSP e plano B pelo Diário da Justiça (`docs/PROFISSIONAIS.md`, linhas 13 e 37; `src/domain/parcerias.ts`, linha 34). Os dados são de cenário demonstrativo. O que este repositório acrescenta: o nº CNJ validado e o tribunal como destinatário na própria ART, o que torna o cruzamento por número de processo exato nas ARTs novas, e as consultas 4.1 a 4.5 para medir as antigas.
- **Fontes agro e judiciais:** o observatório já lista "MAPA Agrofit e CDA-SP (GEDAVE)" (convênio), "MAPA · SIPEAGRO" (público, semanal), "DataJud · API pública" (chave, diária) e "TRT-2 e TRT-15 · peritos (AJ-JT)" (restrito) (`src/observatorio/fontes.json`, linhas 474, 654, 894 e 918). Não há bloco de receituário em nenhum painel.
- **Crédito:** existe a parceria Banco Central em totais (ESTBAN e SCR.data), voltada a empresas (`parcerias.ts`, linha 41). O crédito rural (SICOR) não aparece.
- **Obras e contratos sem ART:** Fiscalização já cruza PNCP, Obrasgov e CNO com ARTs (`docs/FISCALIZACAO.md`, linhas 14, 15 e 24). O prazo de 10 dias do art. 27, § 1º, e o código de obra pública da ART não aparecem.
- **RT e ART de empresas:** `docs/EMPRESAS.md`, linha 27. O vínculo técnico com "ART cargo/função" está só no modelo de dados (`docs/NORMAS.md`, linha 31).
- **Receita de ART:** o Conselho mostra "taxas de ART" como uma origem da receita (`src/cockpit/fichas.ts`, linha 172), mas o cenário "não tem taxa de ART nem estorno" (`src/observatorio/norte.ts`, linha 198). Carrinho, boleto, forma de pagamento, isenção e teto não existem lá.

## 15. Quadro por painel

| Painel | O que este repositório oferece | Dado no repositório | Depende de | Como usar |
|---|---|---|---|---|
| **Empresas** | ART de cargo/função (vínculo PJ pública ou privada, tipo de vínculo, jornada); empresa contratada em cada ART; sacado do boleto empresa; baixa automática quando o RT sai do quadro (art. 18, II); revendas de agrotóxico com agrônomo RT | Só especificação e protótipo fictício | Banco do CreaNet (TI-12, CF-VINCULO); RAIS ou eSocial para o vínculo real | Cartões "RT sem ART de cargo" e "ART de cargo ativa de quem saiu do quadro"; ARTs por empresa contratada e por tipo; alerta de jornada acima de 44 h |
| **Profissionais e perícias** | Perícia com nº CNJ, tribunal, foro, honorários, data de nomeação; Múltipla de Perícia; receituário por agrônomo; títulos habilitados | Plano de consultas (bloco 4, 6); tabela simulada de tribunais | Banco do CreaNet; DJE, DataJud, AJ-JT; fonte oficial de tribunais (ONE-03) | Perícias por tribunal e especialidade; honorários típicos; dias da nomeação ao registro; peritos sem ART; agrônomos que prescrevem por mês |
| **Fiscalização e malha fina** | Registro depois do início (art. 27); Múltipla fora do prazo (art. 37); obra pública fora dos 10 dias; nulidade por empréstimo de nome; receituário de uso comercial (art. 8º, II, Res. 1.149); Crédito Rural; coordenadas do local; regularizações | Plano de consultas (blocos 4, 5, 6, 8); normas transcritas | Banco do CreaNet; PNCP, Obrasgov; CDA-SP/GEDAVE e MAPA (convênio); Agrofit; SICOR; DJE | Alertas de registro tardio; peritos nomeados sem ART; agrônomos no teto de 300 receitas; crédito rural sem ART de agronomia; mapa de locais periciados e propriedades |
| **Gestão do Conselho** | Cancelamento por processo administrativo e anulação julgados pela câmara especializada (arts. 22, 23 e 25); baixa duvidosa à câmara (art. 17, § 3º); entidade de classe indicada na ART | Só norma | Votenet (processos por câmara) e banco do CreaNet (situação Anulada/Cancelada) | Processos de anulação e cancelamento por câmara e motivo; prazo de 10 dias da notificação; ARTs por entidade de classe (consulta 11.5) |
| **Financeiro** | Tabela B 2024 oficial, mínimo, teto e regra da Múltipla; R$ 2,10 por receita; regularização R$ 405,52; isenção da retificadora; carrinho (validade, forma, operadora, sacado, itens de cobrança); confirmação por forma; duplicidade e reembolso | Valores de 2024 oficiais; o resto simulado | Banco do CreaNet (blocos 7 e 11); FIN-01 a FIN-05 com o Financeiro; INPC | Arrecadação de ART por modalidade; enviadas sem pagamento; carrinhos vencidos; boleto contra cartão; quem paga; renúncia por isenção e teto; diferença entre cobrado e devido |
| **Atendimento** | Protocolos de baixa por terceiros, cancelamento e regularização, com serviço, sub-serviço, situação e estimativa (10 e 20 dias úteis); prazos da norma; defeitos do CreaNet que geram chamado | Telas e textos do CreaNet transcritos | Banco do CreaNet (bloco 8) | Volume e prazo por serviço e motivo, contra a estimativa e a norma; regularizações aguardando pagamento |
| **Presidência** | Visão de ARTs por tipo e situação; migração do CreaNet para o CreaOne (origem do preenchimento, consulta 1.5); pendências que travam a migração | Roadmap e perguntas por destinatário | Banco do CreaNet; equipe do CreaOne (ONE-09) | Cartões de ARTs, arrecadação e saídas; parte preenchida no CreaOne; riscos (TI-01, TI-12, R-01) |

## 16. Limites e o que não foi confirmado

- O repositório não traz nenhum número real de ARTs, perícias, receitas ou arrecadação. Todo indicador acima depende de rodar as consultas no banco do CreaNet ou de extração da TI.
- Os nomes das situações Registrada, Baixada, Anulada e Cancelada no banco, a coluna do valor da ART, a do Crédito Rural, a do nº do receituário e a marca da Múltipla de Perícia são desconhecidos (TI-04, TI-08, TI-10, TI-11, ONE-11).
- A série histórica tem vieses do CreaNet: finalidade "Saúde" pré-marcada na perícia, nº do processo em texto livre, coordenadas rotuladas "(DDD)", limite de 300 contratos, valor individual de 0,48% na Múltipla e perícia sem CPF/CNPJ do contratante.
- Se a entidade de classe recebe parte do valor da ART, e quanto, não está respondido (ART-29).
- As fontes externas citadas no item 13 que não estão no repositório empresas (SICOR, IBGE PAM, transparência de folhas, situação do CPF) são sugestões minhas, sem coletor nem teste de acesso.
