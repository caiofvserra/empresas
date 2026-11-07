# Painel de Atendimento

Painel temático de 07/11/2026. Abre em `/atendimento.html` no site e em `entrega/painel-atendimento-creasp.html` sem servidor. A página veio do painel de Gestão do Conselho, que passou a ser só do colegiado (decisão do Caio em 07/11/2026). O código fica em `src/atendimento/`.

Os filtros no alto são regional, município, período e data de referência; não há filtro de câmara. Segue as regras de tela dos outros painéis. Cada página cabe numa tela Full HD (1920×1080) sem rolagem, e os blocos têm larguras diferentes. O bloco mostra só o título e o gráfico; a explicação fica no (i).

Próximo passo: trazer os indicadores do painel de protocolos que o Crea-SP já usa (protocolos abertos, com exigência, cancelados, sem pagamento e fechados, dentro e fora do prazo; tipo e subtipo de serviço por situação; protocolos por GRE; os colaboradores com mais protocolos, pelo nome, e os sem atribuição; a mediana do prazo por mês contra o ano anterior). A tela está em `referencias/paineis-antigos/` nos arquivos do projeto.

## O que a página tem

- **Atendimento.** Prazo de resposta, solicitações, tempo de resposta, profissionais que moram a mais de 50 km de uma unidade e uso dos coworkings. Mapa da distância até a unidade mais próxima em cada município. Solicitações por assunto e situação. Canal do atendimento pela distância. Solicitações por mês. Uso dos coworkings.

## Pacote Power BI

O painel tem pacote Power BI em `entrega/powerbi/atendimento/`, que abre pelo `Atendimento.pbip`. O mapa da distância até a unidade monta-se no Desktop, com o passo no LEIA-ME do pacote. Ver [POWERBI.md](POWERBI.md).
