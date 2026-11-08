# Paleta do Manual do CreaOne

Desde 08/11/2026 os painéis usam a paleta do Manual do CreaOne (página 4 do manual), no lugar da paleta de `docs/DESIGN_SYSTEM_V13.md`.

| Cor | Hex | RGB | CMYK |
|---|---|---|---|
| Azul 800 | #0D1732 | 13, 23, 50 | C96 M86 Y47 K61 |
| Amarelo | #FFB000 | 255, 176, 0 | C0 M38 Y100 K0 |
| Azul 700 | #15265C | 21, 38, 92 | C100 M93 Y33 K26 |
| Azul 500 | #3662E2 | 54, 98, 226 | C81 M63 Y0 K0 |
| Azul | #6077B6 | 96, 119, 182 | C70 M52 Y0 K0 |
| Preto | #000000 | 0, 0, 0 | C0 M0 Y0 K100 |

## Tons derivados

Fundos, escalas de mapa e o tema escuro precisam de tons mais claros e mais escuros. Eles saem das cores acima, misturadas com branco ou preto:

- Azul claro: #DFE4F2 e #AFBBDB (do Azul #6077B6); fundo suave #ECEFF7.
- Amarelo: claro #FFC640, creme #FFF6DC e escuro #E19B01 (o fim do degradê do próprio manual).
- Azul do tema escuro: #7B95E8 (do Azul 500), linha #24366E.

## Cores que ficam fora da paleta

Verde (#007061), vermelho (#B02525) e laranja (#DD8A0B) continuam só como cores de situação: melhorou ou piorou, dentro ou fora do prazo, risco. Não são cor de painel.

## Uma cor por painel

Escolhida pelo Caio em 08/11/2026 na folha de códigos (project-files/design/paleta-creaone/paleta-creaone.png) e definida em `src/cockpit/identidade.css`:

O canto onde o menu encontra o cabeçalho tem a mesma cor nos dois; dali cada um segue no seu degradê ou fica numa cor só. Nenhum cabeçalho fica branco.

| Painel | Canto | Menu | Cabeçalho |
|---|---|---|---|
| Presidência | Amarelo | Amarelo ao AM+15 | Amarelo ao creme (D19) |
| Colegiados | M09 (#805800) | M09 ao Preto (D09) | M09, filete amarelo |
| Empresas | Azul 700 | Azul 700 ao Azul 800 | Azul 700 ao Azul 500 (D10) |
| Profissionais | Azul 500 | Azul 500 ao Azul 700 (D10) | Azul 500 à M14 (#1B3171) |
| Atendimento | Azul | Azul ao AZ-90 (D25) | Azul ao AZ+40 (#3A476D) |
| Fiscalização | Preto | Preto | Preto, faixa zebrada amarela |
| Financeiro | Azul 800 | Azul 800 ao A8-90 (D17) | Azul 800 |
