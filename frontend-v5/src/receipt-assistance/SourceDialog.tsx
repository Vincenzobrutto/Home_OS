import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cx, ui } from '../components/ui';
import type { ReceiptCitation, ReceiptOriginal } from './model';
import styles from './receipt.module.css';

export type SourceRequest = { kind: 'original' } | { kind: 'field'; label: string; sources: ReceiptCitation[] };

/**
 * Dialogo modale per una fonte o per l'originale. Nessun iframe o URL firmato: l'anteprima è uno slot
 * del container e l'apertura dell'originale è la sua callback. Esc chiude, il focus torna al chiamante.
 */
export function SourceDialog(props: {
  request: SourceRequest;
  original: ReceiptOriginal;
  openState: { status: 'idle' | 'opening' } | { status: 'error'; message: string };
  preview?: ReactNode;
  onOpenOriginal: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<Element | null>(null);
  const onClose = useRef(props.onClose);
  useEffect(() => { onClose.current = props.onClose; });
  useEffect(() => {
    returnTo.current = document.activeElement;
    closeRef.current?.focus();
    // Esc ascoltato sul documento: chiude anche se il focus è uscito dal dialogo.
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose.current(); } };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (returnTo.current instanceof HTMLElement) returnTo.current.focus();
    };
  }, []);
  const { request, original } = props;
  const opening = props.openState.status === 'opening';
  return (
    <div className={styles.backdrop}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={styles.dialog}>
        <div className={styles.dialogHead}>
          <h2 id={titleId}>{request.kind === 'original' ? 'Documento originale' : `Fonte · ${request.label}`}</h2>
          <button ref={closeRef} type="button" className={cx(ui.btn, ui.small)} onClick={props.onClose}>Chiudi</button>
        </div>
        <p className={styles.note}>{original.name}{original.pageCount ? ` · ${original.pageCount} ${original.pageCount === 1 ? 'pagina' : 'pagine'}` : ''}</p>
        {request.kind === 'field' && (
          <>
            {request.sources.map((s, i) => (
              <div key={i}>
                <p className={styles.note}>Pagina {s.page}</p>
                <p className={styles.excerpt}>{s.excerpt}</p>
              </div>
            ))}
            <p className={styles.note}>L’estratto documenta la proposta. Le modifiche che inserisci tu non vengono attribuite al documento.</p>
          </>
        )}
        {props.preview}
        {original.status === 'available' ? (
          // aria-disabled invece di disabled: il pulsante resta focalizzabile durante l'apertura.
          <button type="button" className={cx(ui.btn, styles.dialogAction)} aria-disabled={opening || undefined} onClick={() => { if (!opening) props.onOpenOriginal(); }}>
            {opening ? 'Apertura…' : 'Apri l’originale'}
          </button>
        ) : (
          <p className={styles.note}>L’originale non è disponibile in questo momento.</p>
        )}
        {props.openState.status === 'error' && <p className={styles.formError} role="alert">{props.openState.message}</p>}
      </div>
    </div>
  );
}
