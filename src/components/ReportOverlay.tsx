import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export default function ReportOverlay({ title, subtitle, kind = 'records', onClose, children }: { title: string; subtitle?: string; kind?: 'records' | 'filters'; onClose: () => void; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    root.current?.querySelector<HTMLButtonElement>('[data-close]')?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if ((event.target as HTMLElement)?.closest('.p-multiselect-menu')) return;
        event.preventDefault(); close.current();
      }
      if (event.key !== 'Tab' || !root.current) return;
      const controls = [...root.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]')].filter(el => el.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = oldOverflow; before?.focus(); };
  }, []);
  return <div className="p-report-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={root} className={kind === 'filters' ? 'p-filter-drawer' : 'p-records-dialog'} role="dialog" aria-modal="true" aria-label={title}>
      <header className="p-overlay-header"><div><span className="p-eyebrow">{kind === 'filters' ? 'SEGMENTAÇÕES DO RELATÓRIO' : 'DETALHAMENTO DO RECORTE'}</span><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button data-close className="p-iconbutton" aria-label={`Fechar ${title.toLowerCase()}`} onClick={onClose}><X size={20} /></button></header>
      <div className="p-overlay-body">{children}</div>
    </div>
  </div>;
}
