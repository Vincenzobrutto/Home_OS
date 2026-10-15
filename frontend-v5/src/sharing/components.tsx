import type { ReactNode } from 'react';
import type { ShareItem } from '../api/sharingTypes';
import { Banner, cx, ui } from '../components/ui';
import { formatBytes } from '../lib/files';
import { isAmbiguousShareError, isShareConflict, isShareUnavailableError, sharingErrorMessage } from '../lib/sharing';
import act from '../activities/activities.module.css';

/** Esito di una scrittura: esito ignoto con riprova identica, conflitto con rilettura, altro con messaggio. */
export function OperationFeedback(props: {
  op: { error: unknown; pending: boolean; retry: () => void; reset: () => void };
  title: string;
  onReread?: () => void;
  extra?: ReactNode;
}) {
  const { error, pending } = props.op;
  if (error === null) return null;
  if (isAmbiguousShareError(error)) {
    return (
      <Banner
        tone="error"
        role="alert"
        title="Esito non confermato"
        actions={<button type="button" className={cx(ui.btn, ui.small)} onClick={props.op.retry} disabled={pending}>{pending ? 'Invio…' : 'Riprova invio'}</button>}
      >
        <p>Non sappiamo se l’operazione è stata registrata (rete o servizio non raggiungibile). «Riprova invio» ripete la stessa richiesta, senza duplicarla.</p>
      </Banner>
    );
  }
  const reread = isShareConflict(error) || isShareUnavailableError(error);
  return (
    <Banner
      tone="warning"
      role="alert"
      title={props.title}
      actions={reread && props.onReread ? <button type="button" className={cx(ui.btn, ui.small)} onClick={() => { props.op.reset(); props.onReread?.(); }}>Rileggi lo stato</button> : undefined}
    >
      <p>{sharingErrorMessage(error)}</p>
      {props.extra}
    </Banner>
  );
}

export function ItemMeta({ item }: { item: ShareItem }) {
  return <span className={act.meta}>{formatBytes(item.byteSize)} · versione {item.documentVersion}</span>;
}

/** Ciò che una condivisione C1a non contiene mai, scritto e non solo assente. */
export function NeverIncluded() {
  return (
    <ul className={act.meta} style={{ columns: '14rem', margin: '6px 0 0', paddingLeft: 18 }}>
      <li>Spese, costi e riepiloghi</li>
      <li>Grafici e confronti</li>
      <li>Bozze da documento</li>
      <li>Attività e scadenze</li>
      <li>Oggetti e schede tecniche</li>
      <li>Note personali</li>
      <li>Accesso alla casa</li>
      <li>Documenti caricati da altri</li>
    </ul>
  );
}
