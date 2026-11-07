import { useEffect, useRef, useState } from 'react';

/** Largura e altura de um elemento, atualizadas quando ele muda de tamanho. Os desenhos em SVG (o metrô da Fiscalização e o plenário dos Colegiados) se refazem com elas. */
export function useTamanho<T extends HTMLElement>() {
  const ref = useRef<T>(null), [tamanho, setTamanho] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ler = () => setTamanho(t => (t.w === el.clientWidth && t.h === el.clientHeight ? t : { w: el.clientWidth, h: el.clientHeight }));
    ler(); const ro = new ResizeObserver(ler); ro.observe(el); return () => ro.disconnect();
  }, []);
  return [ref, tamanho] as const;
}
