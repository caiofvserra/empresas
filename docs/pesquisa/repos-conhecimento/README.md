# O que os repositórios de conhecimento trazem para os painéis

Leitura de 07/11/2026, feita com a skill `research` do Matt (quatro leituras em paralelo, cada uma citando o arquivo de origem). Os oito repositórios foram só lidos: nenhum foi alterado, nenhum script de coleta foi rodado. Os relatórios completos, com caminho e linha de cada achado, estão nesta pasta:

| Relatório | Repositórios |
|---|---|
| [arts.md](arts.md) | `caiofvserra/ARTs` |
| [conselho-govadm-iadecisao.md](conselho-govadm-iadecisao.md) | `caiofvserra/conselho` (QUEDA), `caiofvserra/extracao-govadm`, `caiofvserra/iadecisao` |
| [estatisticas-receita.md](estatisticas-receita.md) | `caiofvserra/engineer-statistics`, `caiofvserra/receita-socios-eng`, `caiofvserra/pncp-engineering-activity` |
| [orquestrador.md](orquestrador.md) | `caiofvserra/orquestradorfiscaliza` |

## O que cada repositório é, em uma linha

- **ARTs**: especificação das ARTs de Perícia Judicial, Múltipla, Receituário Agronômico e Cargo/Função no CreaOne. Não tem dado real; tem a taxonomia da ART, as situações com base legal, as taxas de 2024 e um plano de consultas ao banco do CreaNet.
- **conselho (QUEDA)**: coletor e 21 frentes de análise sobre a API de transparência do Crea-SP (Implanta) e o PNCP. Os dados coletados ficam fora do Git; só há números citados no README e no código.
- **extracao-govadm**: robô que baixa todo dia o Relatório de Processos do GOV ADM das nove câmaras e limpa a planilha. Sistema interno, com VPN e login.
- **iadecisao**: lê os PDFs de decisões de câmara (Votenet/SEI) e grava uma linha por decisão, com 59 colunas. Traz uma sessão real anonimizada da CEEC.
- **engineer-statistics**: site de jornalismo de dados sobre engenheiros e o piso salarial. Tem um bruto real do SIC do Confea (30/08/2026) e agregados reais do Portal da Transparência do Crea-SP.
- **receita-socios-eng**: pipeline PySpark sobre o CNPJ aberto da Receita, com CNAE elegível e sócios. Só código.
- **orquestradorfiscaliza**: auditor externo do próprio Crea-SP (Implanta, PNCP, CEIS/CNEP, Receita, DataJud, TCU). Só código; o achado novo é o leitor de documentos do PNCP que procura ART e CREA no processo.
- **pncp-engineering-activity**: vazio. Um commit sem arquivos. Num ramo do GitHub que não veio para a cópia local há uma planilha de portfólio de inovação (23 projetos).

## O que é dado real e o que é só código

Dado real que já pode entrar:

1. **SIC do Confea, 30/08/2026** (`engineer-statistics/docs/research/assets/confea-sic-2026-08-30.json`): 4.738 linhas por Crea, título e gênero. Crea-SP com 346.824 ativos (28,5% do país), 77,8% de ativos contra 72,7% no Brasil, 16,1% de mulheres, 752,6 ativos por 100 mil habitantes. A série de registros novos do Crea-SP para em 2022.
2. **Portal da Transparência do Crea-SP, 2013 a 2026**, em agregados: o `conta-do-conselho.json` já está em `public/data/engineer-statistics/`; o `orgao-maquina.json`, com a receita (ART com 34,81% em 2025, receita de R$ 578,6 mi contra R$ 465,5 mi de despesa), anuidades e dívida ativa, foi removido do site e se recupera com `git show f51b71e^:data/orgao-maquina.json` no engineer-statistics.
3. **Sessão 2138 da CEEC, 16/07/2026** (iadecisao, anonimizada): 24 decisões, 8 pelo art. 59, 3 multas somando R$ 10.801,42. Serve de amostra do formato, não de indicador.
4. **Taxas oficiais da Tabela B de 2024** (ARTs, `docs/fontes/normas`).

O resto é coletor pronto (QUEDA, orquestrador, extracao-govadm, iadecisao, fetch-confea), especificação (ARTs) ou número transcrito de fonte secundária (salários por CBO, CAGED, INEP no engineer-statistics). O próprio `src/integrations/catalog.ts` já exclui o snapshot do engineer-statistics como fonte automática, e isso deve continuar.

## Por painel

### Empresas

- **Motor do mercado registrável.** O receita-socios-eng filtra o CNPJ aberto pelo CNAE principal ou secundário marcado "Sim" ou "Passível de obrigação" e liga os sócios pela raiz do CNPJ. A planilha que ele espera tem o mesmo formato de `src/domain/cnae-catalog.json`. É o que falta para tirar do demonstrativo "parte do mercado registrada", "CNPJs sem registro" e "sócios profissionais", hoje sem coletor (`rfb-cnpj` em `src/integrations/catalog.ts:57`). Antes, o pipeline precisa filtrar SP e situação ativa, parar de repetir sócios por filial e gravar município, situação e competência do arquivo.
- **Sócio profissional sem acordo.** Nome mais os seis dígitos visíveis do CPF, casados com o cadastro do Crea-SP (que tem o CPF completo), identificam quase todos; homônimos ficam como candidatos. Com o CPF completo (acordo com Receita ou Serpro) a ligação fica exata e o art. 5º da Lei 5.194/66 vira regra automática.
- **Empresa registrada e sancionada.** CEIS e CNEP diários da CGU, sem credencial (coletor no orquestrador e no QUEDA), cruzados com o cadastro de PJ. Também empresa inapta na Receita ou aberta há menos de 180 dias e já contratando.
- **ART de cargo/função.** A spec do ARTs traz o vínculo (órgão ou empresa, tipo de vínculo, jornada) e a baixa automática quando o RT sai do quadro (Res. 1.137, art. 18, II). Permite "RT sem ART de cargo", "ART de cargo ativa de quem saiu do quadro" e alerta de jornada acima de 44 h. Depende do banco do CreaNet.
- **ART com a taxonomia nova.** Sete formas de registro e sete participações (ADR 0009 do ARTs). Hoje o empresas só conhece "Registrada" e "Baixada" (`src/domain/types.ts:20`).

### Profissionais e formação

- **Comparação nacional real** pelo SIC: ativos, situação, gênero e título por Crea. O empresas usa os agregados `confea-*`, mas não o bruto por título, que permite comparar a composição por modalidade do Crea-SP com a dos outros 26 Creas. Cuidado: título não é pessoa.
- **Preço do rótulo.** O CBO 2142-70 ("analista de projetos viários") paga 56,8% do piso exigível e 60,1% do salário do engenheiro civil; o piso exigível é R$ 10.302 (base congelada) contra R$ 13.778,50 na leitura do Confea. Os números são secundários; o método e a lista de CBOs servem para montar o cálculo sobre Novo CAGED e RAIS públicos por município, que nenhum repositório coleta ainda.
- **Perícias.** A ART de Perícia Judicial passa a trazer o número CNJ validado e o tribunal como destinatário, o que deixa exato o cruzamento com DJE, DataJud e AJ-JT nas ARTs novas. O bloco de peritos já existe no painel (`docs/PROFISSIONAIS.md`); o histórico do CreaNet tem o número do processo em texto livre.
- **Receituário agronômico.** Agrônomos que prescrevem por mês e receitas por área plantada (IBGE PAM). Não há bloco de receituário em nenhum painel.

### Fiscalização e malha fina

- **Contrato de engenharia sem ART.** O orquestrador lê TR, edital e contrato no PNCP atrás de oito marcadores (ART, CREA, engenheiro responsável...) e exige dois, sendo um específico de engenharia (`checks/rito_engenharia.py`). Hoje roda só sobre contratos do Crea-SP; a função para varrer os contratos de órgãos de SP (`pncp_contratos_por_periodo`) existe e não é usada. Com a base de ART do CreaNet (CNPJ da contratada e número do contrato), o candidato vira "contrato de engenharia sem ART registrada", o card que hoje é demonstrativo.
- **Aditivo como gatilho de ART complementar.** `valorAcumulado` acima de 1,25 vez o `valorGlobal` no PNCP, e acréscimo acima de 25% (Lei 14.133, art. 125). Para a fiscalização, aditivo de obra pede ART complementar.
- **Contratada sem registro.** Fornecedor do PNCP × cadastro de PJ do CreaNet, priorizado pelo CNAE de construção. Nenhum repositório faz; é o cruzamento interno × externo de maior valor.
- **Registro tardio.** Obra pública com ART fora dos 10 dias (Res. 1.137, art. 27, § 1º), pelo código de obra pública da ART e pela data do contrato no PNCP. Perícias registradas depois do início, Múltiplas fora do prazo, regularizações.
- **Agro.** Receita agronômica × venda de agrotóxico (CDA-SP/GEDAVE e MAPA, por convênio); crédito rural sem ART de agronomia (SICOR do BCB, individual só por acordo); revendas e aplicadores pelo SIPEAGRO.
- **Piso salarial.** 130 concursos notificados num ano (`engineer-statistics/data/fiscalizacao-piso.json`) e o funil do Confea Valoriza (563 denúncias, 275 processos, 199 ações no país) como linha de base de um indicador de fiscalização do piso.

### Gestão do Conselho (colegiado)

- **Estoque de processos** pelo GOV ADM (extracao-govadm): 13 colunas, entre elas Nº do Processo, Assunto (artigo pronto), Lotação Atual, Responsável, Interessado, Fase (17 fases) e Cargo. Dá processos por câmara, fase, relator ou funcionário, assunto, ano e reincidência do interessado. Não dá dias na fase nem prescrição: falta histórico e data do fato. Fotos diárias sucessivas do mesmo relatório dariam os dias na fase. Validação citada: 919 processos ativos na CEEC.
- **Decisões** pelo iadecisao: câmara, reunião, número e data, processo SEI, votos, artigos, multa e, com a LLM, tipo (20), resultado (14), penalidade e instância. O relator não vem no layout do Votenet.
- **Conselheiro: custo e presença.** Jeton e diária por pessoa saem de `Pagamentos` do Implanta; o jeton serve de proxy de presença enquanto o Votenet não é lido. A ligação é por nome normalizado (CPF mascarado), com risco de homônimo.
- **Representação × dinheiro.** Entidade que indica conselheiro × convênios e repasses; 65% dos R$ 1,36 bi de repasses vão a Confea e Mútua por obrigação legal, por isso o indicador precisa separar esse grupo.
- **Anulação e cancelamento de ART** julgados pela câmara (Res. 1.137, arts. 22, 23 e 25).
- **Antes de ligar:** confirmar se o número do GOV ADM (`NNNNNN/AAAA`) e o número SEI são a mesma chave, e unificar as siglas (o GOV ADM tem CEEAS e CAGE; a taxonomia do iadecisao tem CEGM e não tem CEEAS).

Este bloco foi passado à thread que repensa o painel de Gestão do Conselho.

### Financeiro

- **Receita e despesa reais de 2013 a 2026** pelos agregados do portal (item 2 acima). O painel usa só a despesa de `conta-do-conselho.json`; receita, peso da ART e dívida ativa estão no histórico do engineer-statistics e não foram aproveitados.
- **Endpoints do Implanta** com coletor no QUEDA e no orquestrador (16 no orquestrador, de 30 no contrato da API): `Pagamentos`, `Empenhos`, `DespesasCentroCusto` (desde 2021), `ComparativoReceita`, `ComparativoDespesa`, `BalancoOrcamentario`, `Contratos`, `ContratosAditivos`, `Convenios`, entre outros. Dão orçado × empenhado × liquidado × pago, despesa por centro de custo, dezembro concentrado, despesa por profissional ativo e benchmark entre Creas.
- **Fornecedores:** concentração (HHI acima de 0,15), fracionamento, empresa recente, sancionada, CNAE incompatível com o objeto, Benford. Hoje o painel só tem os oito maiores fornecedores, demonstrativos.
- **Diárias nominais:** não existe endpoint de diárias no Implanta (as 30 operações do `planejamento-fontes-2026-10/contratos/implanta-contrato-extraido.json` foram conferidas). A diária por pessoa sai de `Pagamentos`, pela conta contábil, com CPF parcial. O comentário de `src/domain/pessoas-conselho.ts` (linhas 11 e 12) cita "Diarias" como endpoint e precisa ser corrigido quando o bloco sair do demonstrativo.
- **Pessoal:** `QuadrosPessoas` e `Conselheiros` vêm vazios na API; o quadro só por arquivo do RH ou pedido de acesso.
- **ART como receita:** Tabela B de 2024, mínimo, teto, regra da Múltipla, isenção da retificadora, regularização a R$ 405,52; carrinho com validade de 9 dias, forma de pagamento e sacado. Permite arrecadação de ART por modalidade, ARTs enviadas sem pagamento, carrinhos vencidos e renúncia por isenção e teto. O receituário é cobrado a R$ 2,10 por receita contra R$ 1,93 na norma (faixa 1), diferença a apurar.
- **Multa decidida × multa arrecadada:** a multa das decisões (iadecisao) contra a receita de multas (`ComparativoReceita`).

### Atendimento

- **Implanta:** `EstatisticaAnualSolicitacoes` e `EstatisticaAcessoModulo` existem na API e nenhum repositório coleta.
- **Protocolos de ART** (spec do ARTs): baixa por terceiros, cancelamento e regularização, com serviço, sub-serviço, situação e prazo estimado (10 e 20 dias úteis). Volume e prazo por serviço contra a estimativa e a norma.

### Presidência

- Crea-SP contra os outros 26 Creas pelo SIC (ativos por 100 mil habitantes, % de ativos, % de mulheres).
- **Painel de exposição:** o que um auditor externo encontra e pediria por LAI ao Crea-SP. O orquestrador lista as bases que o portal publica vazias e os achados de gravidade alta; números citados no código, como R$ 1,33 bi pagos ao favorecido genérico "DIVERSOS FUNCIONARIOS" e 965 de 965 contratos sem número de licitação, são hipóteses a conferir contra a contabilidade interna antes que um terceiro os use.
- Acórdãos do TCU sobre o conselho.

## Prioridade sugerida

1. **CNPJ da Receita × cadastro de empresas** (receita-socios-eng ajustado). Só dado aberto, mensal, e destrava o painel de Empresas e a lista de fiscalização.
2. **Receita e despesa reais do portal** no Financeiro, a partir do que já está no engineer-statistics, e o coletor do Implanta do QUEDA para manter atualizado.
3. **GOV ADM diário** no painel de Gestão do Conselho, guardando uma foto por dia para ter dias na fase.
4. **Contrato de engenharia sem ART** no PNCP de órgãos de SP, com o leitor de documentos do orquestrador e a base de ART do CreaNet.
5. **CEIS/CNEP × empresas registradas**, diário e sem credencial.

## Cuidados

- Os números do engineer-statistics são, na maioria, transcritos de fontes secundárias, nacionais, com janela fixada em ago/2026.
- No orquestrador, os 88 dispositivos legais estão marcados "a conferir" e o benchmark deixa de fora Crea-RJ, Crea-MG e Crea-PR. No `orgaos.json`, Confea e Mútua aparecem com 23.530 profissionais ativos, o mesmo número do Crea-DF, o que parece cópia por engano.
- No iadecisao, `familia_do_desfecho` procura "parcialmente deferido" com espaço, mas o valor gravado é `parcialmente_deferido`; visto só na leitura do código. O `exemplos/saida_exemplo.xlsx` tem multas improváveis e não deve servir de referência.
- QUEDA e orquestrador foram escritos para um operador anônimo de fora. Dentro do Crea-SP, a contabilidade e o próprio Implanta são a fonte primária: use os endpoints e campos mapeados como especificação, com acesso institucional, e mantenha o CPF mascarado e a regra de que homônimo nunca vira identidade.
