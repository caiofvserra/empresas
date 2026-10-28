import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export default function EnterpriseDialog({ title, subtitle, children, onClose }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const before = document.body.style.overflow; document.body.style.overflow = 'hidden';
    root.current?.querySelector<HTMLButtonElement>('[data-close]')?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { if ((event.target as HTMLElement)?.closest('.p-multiselect-menu')) return; event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const elements = [...(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]') ?? [])].filter(element => element.getClientRects().length);
      if (!elements.length) return;
      if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === elements.at(-1)) { event.preventDefault(); elements[0].focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = before; previous?.focus(); };
  }, []);
  return <div className="e10-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="e10-dialog" ref={root} role="dialog" aria-modal="true" aria-label={title}>
    <header className="e10-dialog-head"><div><p className="e10-eyebrow">CREA-SP · INTELIGÊNCIA EMPRESARIAL</p><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button data-close aria-label={`Fechar ${title.toLocaleLowerCase('pt-BR')}`} onClick={onClose}><X size={20} /></button></header>
    <div className="e10-dialog-body">{children}</div>
  </section></div>;
}
