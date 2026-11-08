/**
 * Tema do Power BI com a identidade do protótipo (src/painel/painel.css, tema claro): cores de série, cores estruturais,
 * fontes Raleway (títulos) e Lato (texto) e o fundo da página. Validado pelo schema de tema 2.159 nos testes.
 */
export function temaCreaSp(nome: string) {
  const cor = (color: string) => ({ solid: { color } });
  return {
    $schema: 'https://raw.githubusercontent.com/microsoft/powerbi-desktop-samples/main/Report%20Theme%20JSON%20Schema/reportThemeSchema-2.159.json',
    name: nome,
    dataColors: ['#3662E2', '#FFB000', '#6077B6', '#0D1732', '#AFBBDB', '#15265C', '#E19B01', '#DFE4F2'],
    good: '#007061', neutral: '#DD8A0B', bad: '#B02525',
    maximum: '#15265C', center: '#AFBBDB', minimum: '#ECEFF7', null: '#DCE3EC',
    firstLevelElements: '#1A202C', secondLevelElements: '#4A5568', thirdLevelElements: '#DCE3EC', fourthLevelElements: '#4A5568',
    background: '#FFFFFF', secondaryBackground: '#ECEFF7', tableAccent: '#15265C',
    textClasses: {
      callout: { fontFace: 'Lato', fontSize: 26, color: '#15265C' },
      title: { fontFace: 'Raleway', fontSize: 12, color: '#0D1732' },
      header: { fontFace: 'Lato', fontSize: 11, color: '#1A202C' },
      label: { fontFace: 'Lato', fontSize: 10, color: '#4A5568' },
    },
    visualStyles: {
      page: { '*': { background: [{ color: cor('#F1F3F8'), transparency: 0 }] } },
      '*': { '*': {
        background: [{ show: true, color: cor('#FFFFFF'), transparency: 0 }],
        border: [{ show: true, color: cor('#DCE3EC'), radius: 12 }],
        title: [{ show: true, fontColor: cor('#0D1732'), fontSize: 12, fontFamily: 'Raleway' }],
      } },
    },
  };
}
