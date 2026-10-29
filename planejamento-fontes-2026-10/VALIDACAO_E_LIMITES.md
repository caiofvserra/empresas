# Validação e limites da entrega

Pesquisa e revisão em29/10/2026. Esta entrega é documentação de planejamento; não comprova autorização de acesso institucional, integração em produção, execução de um `.pbix` ou funcionamento futuro dos serviços.

## Repositório

A versão Claude foi identificada pela estrutura de navegação e pelo histórico. O merge normal `049d618bfe4dd634be90bd1edcaac9bac4631647` preservou os sete commits posteriores àV14 e a integração anterior. A árvore do merge é a mesma daV18 do Claude; não houve substituição arbitrária de arquivos, force push ou publicação do Site.

Validações executadas no merge: `npm run build`, `npm run build:painel` e230 testes aprovados; navegação pelas oito abas em Chromium sem erro de execução. Isso valida a integração do protótipo, não os pressupostos de uso com dados reais. Os pontos a revisar estão emREVISAO_REPOSITORIO.md.

## Pesquisa e consolidação

- Cinco inventários de origem:22+17+27+27+12 =105 fichas.
- JUCESP unificada com todas as origens/evidências preservadas:104 entradas canônicas e105 origens auditáveis.
- Tipos editoriais:56 fontes,32subconjuntos,11parcerias,4catálogos e1reuso. Não constituem104 APIs distintas.
- Evidência predominante:23amostras de dados,8contratos,51documentações,10leads,11parcerias e1reuso. A ficha literal prevalece sobre a classificação resumida.
- Resumo de146observaçõesHTTP sem corpos, credenciais ou republicação de fornecedores/peritos/alunos. HTTP200 pode ser HTML de manutenção, login ou rejeição.
- Leitura de13anexos;27 entidades internas propostas a partir deles. Modelo no papel não prova campo disponível ou preenchido no SQL Server/Db2.
- ListaCNAE extraída:702 códigos distintos,638Sim/sim e64Passível de obrigação. A extração preserva classe e página, mas requer conferência e aceite do dono da regra antes de produção.
-34 casos de uso;28 tipos de nós e34 tipos de relações no grafo planejado. Não há instâncias reais de pessoa, empresa ou documento nesse grafo.

## Revisões de semântica incorporadas

O numerador da atividadeART está limitado à população empresarial elegível no período. A recuperação de dívida distingue saldo inicial de juros/encargos posteriores, pagamentos e estornos. A rastreabilidade pericial distingue cobertura de chaves e correspondência entre os casos comparáveis. Observações espelhadas por dois portais não viram duas evidências independentes.

A população não foi rotulada como expansão física urbana. O CNO foi classificado como acesso condicionado, suaURL de documentação não é vendida como endpoint de dados, e númeroART externo exige origem e validação. A geografia doSCR deve ser homologada no dicionário do produto antes de virar filtroSP. Os grafos dizem tipos planejados/confirmáveis, sem afirmar rede já construída.

As limitações mais importantes foram mantidas: DataJud não identifica sozinho nomeação ou profissão; INEP/RAIS/CAGED públicos não permitem pareamento nominal artificial; SIGA e SIGMINE exigem cadastros complementares paraCNPJ; AprovaDigital e licenças da capital amostradas não possuemCNPJ/RT; proprietário/operador não é sinônimo de executor/RT;CNAE não constitui conclusão de obrigação.

## Cobertura que permanece pendente

O portal nacional entrou em manutenção e a consulta API sem chave retornou401. Não foi executada varredura nacional completa nem gerada chave de acesso. As possibilidades foram investigadas nos contratos, buscas indexadas e publicadores. O roteiro para ampliar a cobertura está em[página própria](pesquisas/ROTEIRO_CATALOGO_NACIONAL.md).

Uma parte das fontes tem apenas documentação, histórico antigo ou acesso condicionado. Os arquivos atuais doCNPJ, JUCESP, INEP e alguns outros não foram integralmente baixados e homologados. Algumas respostas foram503/403 ou timeout; isso registra indisponibilidade nesta sessão, não extinção da fonte. Não se promete atualidade a partir da data de edição do catálogo.

Não foram acessados bancos internos, enviadas solicitações a órgãos, assinados acordos, instalados gateways ou configurados agendamentos. A rotina de coleta proposta não é a frequência efetivamente garantida pelo órgão. A classificação de publicação pública e eventual fundamentoTCU precisam de validação específica por indicador.

## Verificação reproduzível da documentação

```bash
python planejamento-fontes-2026-10/scripts/validar-compilado.py
```

O script usa apenasPython3/biblioteca padrão. Confere unicidade e contagens, origens, campos das fichas, referências dos casos e do grafo, classesCNAE, planilha de oito abas, links locais e hashes de toda a entrega. Não chamaAPI, banco ou credencial. Seu sucesso não altera os níveis de evidência das fontes.

O manifesto verifica integridade do pacote. Ele não atesta que documentos externos não sofreram alterações posteriores. Os anexos originais, a matriz integral daChelfo e os corpos de respostas permaneceram fora do repositório público.
