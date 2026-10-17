import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './FieldInfo.module.css';

/** On-demand field explanations, usable by touch and keyboard as well as pointer. */
export function FieldInfo({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false), title = useId();
  const trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const returnTo = trigger.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
      if (event.key !== 'Tab') return;
      const items = [...(panel.current?.querySelectorAll<HTMLElement>('button, a[href], [tabindex="0"]') ?? [])];
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = overflow; returnTo?.focus(); };
  }, [open]);
  return <>
    <button ref={trigger} type="button" className={styles.info} aria-label={'Informazioni su ' + label} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><span aria-hidden="true">i</span></button>
    {open && createPortal(<div className={styles.backdrop} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={title} className={styles.panel}>
        <div className={styles.header}><h2 id={title}>{label}</h2><button type="button" onClick={() => setOpen(false)}>Chiudi</button></div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>, document.body)}
  </>;
}
