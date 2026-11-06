/**
 * Tema do Power BI com a identidade do protótipo (src/painel/painel.css, tema claro): cores de série, cores estruturais,
 * fontes Raleway (títulos) e Lato (texto) e o fundo da página. Validado pelo schema de tema 2.159 nos testes.
 */
export function temaCreaSp(nome: string) {
  const cor = (color: string) => ({ solid: { color } });
  return {
    $schema: 'https://raw.githubusercontent.com/microsoft/powerbi-desktop-samples/main/Report%20Theme%20JSON%20Schema/reportThemeSchema-2.159.json',
    name: nome,
    dataColors: ['#3182CE', '#FABD07', '#805AD5', '#2D3748', '#2C9C8F', '#082D74', '#DD8A0B', '#A9C9EE'],
    good: '#007061', neutral: '#DD8A0B', bad: '#C53030',
    maximum: '#082D74', center: '#A9C9EE', minimum: '#EAF1FA', null: '#DCE3EC',
    firstLevelElements: '#1A202C', secondLevelElements: '#4A5568', thirdLevelElements: '#DCE3EC', fourthLevelElements: '#4A5568',
    background: '#FFFFFF', secondaryBackground: '#EAF1FA', tableAccent: '#082D74',
    textClasses: {
      callout: { fontFace: 'Lato', fontSize: 26, color: '#082D74' },
      title: { fontFace: 'Raleway', fontSize: 12, color: '#01224D' },
      header: { fontFace: 'Lato', fontSize: 11, color: '#1A202C' },
      label: { fontFace: 'Lato', fontSize: 10, color: '#4A5568' },
    },
    visualStyles: {
      page: { '*': { background: [{ color: cor('#F1F4F8'), transparency: 0 }] } },
      '*': { '*': {
        background: [{ show: true, color: cor('#FFFFFF'), transparency: 0 }],
        border: [{ show: true, color: cor('#DCE3EC'), radius: 12 }],
        title: [{ show: true, fontColor: cor('#01224D'), fontSize: 12, fontFamily: 'Raleway' }],
      } },
    },
  };
}
