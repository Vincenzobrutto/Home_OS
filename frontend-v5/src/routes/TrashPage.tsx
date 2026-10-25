import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAccount, useApi } from '../session/session';
import { newIdempotencyKey } from '../api/queryKeys';
import { userMessage } from '../api/errors';
import { ErrorState, Loading, cx, ui, useDocumentTitle } from '../components/ui';
import { Modal } from '../document-intake/ReviewDialog';
import { useCurrentHome } from './HomePages';
import { purgeLabel, trashPaths, useTrash, type TrashEntry } from '../documents/trash';
import styles from '../documents/trash.module.css';
import pages from './pages.module.css';

type Pending = { kind: 'purge'; entry: TrashEntry } | { kind: 'empty' } | null;

/** /home/:homeId/cestino — only what the caller deleted, 30 days before the definitive deletion. */
export function TrashPage() {
  const home = useCurrentHome(), account = useAccount(), api = useApi(), cache = useQueryClient();
  useDocumentTitle('Cestino');
  const trash = useTrash(account.id, home.id);
  const editable = home.permissions.includes('edit');
  const [busy, setBusy] = useState<string | null>(null), [error, setError] = useState(''), [status, setStatus] = useState(''), [pending, setPending] = useState<Pending>(null);
  const keys = useRef(new Map<string, string>());
  const keyFor = (op: string) => { let key = keys.current.get(op); if (!key) { key = newIdempotencyKey(); keys.current.set(op, key); } return key; };
  async function run(op: string, path: string, body: unknown, done: string) {
    if (busy) return;
    setBusy(op); setError(''); setStatus('');
    try {
      await api.callJson(path, { method: 'POST', body, accountId: account.id, idempotencyKey: keyFor(op) });
      keys.current.delete(op); setPending(null); setStatus(done);
    } catch (e) { setError(userMessage(e)); }
    finally { setBusy(null); await cache.invalidateQueries({ queryKey: ['account', account.id, 'home', home.id] }); }
  }
  const items = trash.data?.items ?? [];
  return <>
    <div className={pages.heading}><div>
      <p className={pages.eyebrow}>{home.name}</p>
      <h1>Cestino</h1>
      <p className={pages.lead}>Qui trovi solo ciò che hai eliminato tu. Ogni elemento resta 30 giorni: puoi ripristinarlo, poi viene eliminato definitivamente.</p>
    </div></div>
    {status && <p role="status">{status}</p>}
    {error && <p role="alert">{error}</p>}
    {trash.isPending ? <Loading label="Caricamento del cestino…" /> : trash.isError ? <ErrorState error={trash.error} onRetry={() => void trash.refetch()} retrying={trash.isFetching} /> : !items.length ? <p className={ui.card}>Il cestino è vuoto.</p> : <>
      {editable && <div className={styles.toolbar}><button type="button" className={ui.btn} disabled={!!busy} onClick={() => { setError(''); setPending({ kind: 'empty' }); }}>Svuota cestino</button></div>}
      <ul className={styles.list} aria-label="Elementi nel cestino">
        {items.map(entry => <li key={entry.id} className={cx(ui.card, styles.item)}>
          <div>
            <h2>{entry.name || 'Documento senza titolo'}</h2>
            <p className={styles.meta}>Documento · eliminato il {new Date(entry.trashedAt).toLocaleDateString('it-IT')} · {purgeLabel(entry.purgeAfter)}</p>
          </div>
          {editable && <div className={styles.actions}>
            <button type="button" className={ui.btn} disabled={!!busy} aria-label={'Ripristina ' + (entry.name || 'documento')} onClick={() => void run('restore:' + entry.id + ':' + entry.version, trashPaths.restore(home.id, entry.id), { expectedVersion: entry.version }, `«${entry.name || 'Documento'}» è stato ripristinato.`)}>{busy === 'restore:' + entry.id + ':' + entry.version ? 'Ripristino…' : 'Ripristina'}</button>
            <button type="button" className={ui.btn} disabled={!!busy} aria-label={'Elimina subito ' + (entry.name || 'documento')} onClick={() => { setError(''); setPending({ kind: 'purge', entry }); }}>Elimina subito</button>
          </div>}
        </li>)}
      </ul>
    </>}
    {pending && <Modal labelledBy="trash-confirm" onClose={() => { if (!busy) setPending(null); }}>
      <div className={styles.panel}>
        <h2 id="trash-confirm">{pending.kind === 'empty' ? 'Svuotare il cestino?' : 'Eliminare definitivamente?'}</h2>
        <p>{pending.kind === 'empty' ? `${items.length === 1 ? 'L’elemento' : `I ${items.length} elementi`} nel cestino ${items.length === 1 ? 'sarà eliminato' : 'saranno eliminati'} definitivamente.` : `«${pending.entry.name || 'Documento'}» sarà eliminato definitivamente.`} Non si può annullare. I dati già confermati nelle schede restano, con la fonte indicata come eliminata.</p>
        {error && <p role="alert">{error}</p>}
        <div className={styles.actions}>
          <button type="button" className={cx(ui.btn, ui.primary)} disabled={!!busy} onClick={() => pending.kind === 'empty'
            ? void run('empty', trashPaths.empty(home.id), {}, 'Cestino svuotato.')
            : void run('purge:' + pending.entry.id + ':' + pending.entry.version, trashPaths.purge(home.id, pending.entry.id), { expectedVersion: pending.entry.version }, `«${pending.entry.name || 'Documento'}» eliminato definitivamente.`)}>
            {busy ? 'Eliminazione…' : pending.kind === 'empty' ? 'Svuota cestino' : 'Elimina definitivamente'}
          </button>
          <button type="button" className={ui.btn} data-autofocus disabled={!!busy} onClick={() => setPending(null)}>Annulla</button>
        </div>
      </div>
    </Modal>}
  </>;
}
