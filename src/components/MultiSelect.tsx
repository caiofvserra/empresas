import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
export interface SelectOption { value: string; label: string; meta?: string }
export default function MultiSelect({ label, displayLabel, options, value, onChange }: { label: string; displayLabel?: string; options: SelectOption[]; value: string[]; onChange: (value: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const host = useRef<HTMLDivElement>(null);
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => { if (!host.current?.contains(event.target as Node)) setOpen(false); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); host.current?.querySelector('button')?.focus(); } };
    document.addEventListener('mousedown', outside); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', key); };
  }, [open]);
  const filtered = options.filter(o => `${o.label} ${o.value} ${o.meta ?? ''}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  return <div className="p-multiselect" ref={host}><span className="p-filter-label">{displayLabel ?? label}</span><button className="p-multiselect-trigger" aria-label={`Filtrar ${label}`} aria-expanded={open} onClick={() => setOpen(!open)}><span>{value.length === 0 ? 'Todos' : value.length === 1 ? options.find(o => o.value === value[0])?.label ?? value[0] : `${value.length} selecionados`}</span><ChevronDown size={14} /></button>{open && <div className="p-multiselect-menu" aria-label={`Opções de ${label}`}><label className="p-search"><Search size={14} /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder={`Pesquisar ${label}`} aria-label={`Pesquisar ${label}`} /></label><div className="p-select-actions"><button onClick={() => onChange([])}>Limpar seleção</button><span>{filtered.length} opções</span></div><div className="p-select-options">{filtered.map(o => <label key={o.value} className={value.includes(o.value) ? 'selected' : ''}><input type="checkbox" checked={value.includes(o.value)} onChange={() => toggle(o.value)} /><span><strong>{o.label}</strong>{o.meta && <small>{o.meta}</small>}</span>{value.includes(o.value) && <Check size={14} />}</label>)}{!filtered.length && <p className="p-empty">Nenhuma opção encontrada.</p>}</div><button className="p-select-done" onClick={() => setOpen(false)}>Aplicar seleção <X size={13} /></button></div>}</div>;
}
