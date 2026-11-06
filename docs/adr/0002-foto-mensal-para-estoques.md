# Estoques e taxas vêm de uma foto por data de referência; só os fluxos são calculados em DAX

No pacote Power BI, cada data de referência tem uma foto das empresas e dos estabelecimentos: uma linha por empresa (ou estabelecimento) e por data, com a situação naquele dia já resolvida (registrada, em dia com a anuidade, com RT, RT que saiu sem substituto, cadastro incompleto, registrada 12 meses antes). As medidas de estoque e de taxa só contam linhas da foto da data escolhida. Os fluxos (entradas, saídas, ARTs, valor em ART, aberturas) continuam como fatos com data e são somados em DAX no período escolhido.

O motivo: a situação num dia depende de regras longas (intervalos de registro refeitos a partir das movimentações, saldo da anuidade na data, vínculo de RT com tolerância de 30 dias, alvos da fiscalização). Reescrever tudo em DAX criaria uma segunda versão das regras, sem como conferir uma contra a outra, porque não há como executar DAX fora do Power BI. Com a foto, a regra fica num lugar só, no código do cenário (e depois na carga da base real), e o Power BI só lê.

## Considered Options

- **Tudo em DAX a partir dos fatos brutos** (registros com início e fim, vínculos, boletos). Rejeitado pelo motivo acima.
- **Uma foto por dia.** Rejeitado: o painel só oferece datas de referência no fim de cada mês, e a foto diária multiplicaria o volume por 30.

## Consequences

- Na base real, a carga precisa gravar a foto todo fim de mês e nunca reescrever as anteriores, o que já é a regra do painel ("a data de referência lê a base como estava em D e nunca sobrescreve valores").
- Uma regra nova de estoque muda a carga, não a medida.
- Os filtros de regional, município, câmara, porte e situação na Receita valem pela matriz da empresa (tabela de empresas). No protótipo, a regional filtra as empresas com algum estabelecimento nela; os números podem diferir para empresas com estabelecimentos em mais de uma regional.
