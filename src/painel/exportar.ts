/**
 * Exportação do painel (pedido do Caio em 05/11/2026): os dados de um bloco ou de uma lista saem em CSV, e o gráfico sai em PNG.
 * O CSV usa ponto e vírgula, aspas duplas, quebra de linha CRLF e a marca de ordem de bytes, para o Excel em português abrir
 * direto com acentos e colunas certas. O PNG é desenhado a partir do SVG que o ECharts já renderiza, em dobro de resolução.
 * No Power BI, as duas saídas são nativas ("Exportar dados" e "Exportar para PDF"); aqui o protótipo só mostra onde ficam.
 */
export type Celula = string | number | null | undefined;

/** Nome de arquivo sem acento nem espaço: `empresas-registro-mapa-2026-09-30.csv`. */
export function nomeArquivo(partes: (string | undefined)[], extensao: string): string {
  const limpo = partes.filter(Boolean).map(parte => parte!.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  return `${limpo.filter(Boolean).join('-')}.${extensao}`;
}

const celula = (valor: Celula) => {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor.toLocaleString('pt-BR', { maximumFractionDigits: 2, useGrouping: false }) : '';
  return `"${valor.replace(/"/g, '""')}"`;
};

/** Monta o texto do CSV (sem a marca de ordem de bytes), também usado para copiar para a área de transferência. */
export function textoCsv(cabecalho: string[], linhas: Celula[][]): string {
  return [cabecalho.map(celula).join(';'), ...linhas.map(linha => linha.map(celula).join(';'))].join('\r\n');
}

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Baixa um CSV pronto para o Excel em português. */
export function baixarCsv(nome: string, cabecalho: string[], linhas: Celula[][]) {
  baixar(new Blob(['﻿', textoCsv(cabecalho, linhas)], { type: 'text/csv;charset=utf-8' }), nome);
}

/** Baixa o SVG de um gráfico como PNG, com o fundo do tema por trás, em dobro de resolução. Devolve falso quando não há SVG. */
export function baixarPng(nome: string, svg: SVGSVGElement | null, fundo: string): Promise<boolean> {
  if (!svg) return Promise.resolve(false);
  const rect = svg.getBoundingClientRect(), largura = Math.max(1, Math.round(rect.width)), altura = Math.max(1, Math.round(rect.height));
  const copia = svg.cloneNode(true) as SVGSVGElement;
  copia.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); copia.setAttribute('width', String(largura)); copia.setAttribute('height', String(altura));
  const texto = new XMLSerializer().serializeToString(copia), url = URL.createObjectURL(new Blob([texto], { type: 'image/svg+xml;charset=utf-8' }));
  return new Promise(resolve => {
    const imagem = new Image();
    imagem.onload = () => {
      const canvas = document.createElement('canvas'), escala = 2; canvas.width = largura * escala; canvas.height = altura * escala;
      const contexto = canvas.getContext('2d'); if (!contexto) { URL.revokeObjectURL(url); resolve(false); return; }
      contexto.fillStyle = fundo; contexto.fillRect(0, 0, canvas.width, canvas.height); contexto.scale(escala, escala); contexto.drawImage(imagem, 0, 0, largura, altura);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => { if (blob) baixar(blob, nome); resolve(Boolean(blob)); }, 'image/png');
    };
    imagem.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
    imagem.src = url;
  });
}
