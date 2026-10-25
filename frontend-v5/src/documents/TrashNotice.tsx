import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router';
import { useAccount, useApi } from '../session/session';
import { newIdempotencyKey } from '../api/queryKeys';
import { userMessage } from '../api/errors';
import { ui, cx } from '../components/ui';
import { trashPaths, type TrashEntry } from './trash';
import styles from './trash.module.css';

type Notice = { pathname: string; entry: TrashEntry };
const TrashNoticeContext = createContext<(entry: TrashEntry) => void>(() => undefined);
export const useTrashNotice = () => useContext(TrashNoticeContext);

/**
 * «Spostato nel cestino · Annulla · Vai al cestino». The row that triggered it disappears,
 * so the notice lives at home level; it stays until closed or until the page changes.
 */
export function TrashNoticeProvider({ homeId, children }: { homeId: string; children: ReactNode }) {
  const { pathname } = useLocation();
  const [notice, setNotice] = useState<Notice | null>(null);
  // Discard the event, rather than hiding it: returning to the old pathname must
  // not remount an Undo action for a lifecycle that may already be restored.
  if (notice && notice.pathname !== pathname) setNotice(null);
  const show = useCallback((entry: TrashEntry) => setNotice({ pathname, entry }), [pathname]);
  const visible = notice && notice.pathname === pathname ? notice : null;
  return <TrashNoticeContext.Provider value={show}>
    {visible && <TrashNoticeBar key={visible.entry.id + ':' + visible.entry.version} homeId={homeId} entry={visible.entry} onClose={() => setNotice(null)} />}
    {children}
  </TrashNoticeContext.Provider>;
}

function TrashNoticeBar({ homeId, entry, onClose }: { homeId: string; entry: TrashEntry; onClose: () => void }) {
  const account = useAccount(), api = useApi(), cache = useQueryClient();
  const key = useRef(newIdempotencyKey());
  const [state, setState] = useState<'moved' | 'restoring' | 'restored'>('moved'), [error, setError] = useState('');
  const title = useMemo(() => entry.name || 'Documento', [entry.name]);
  async function undo() {
    if (state !== 'moved') return;
    setState('restoring'); setError('');
    try {
      await api.callJson(trashPaths.restore(homeId, entry.id), { method: 'POST', body: { expectedVersion: entry.version }, accountId: account.id, idempotencyKey: key.current });
      setState('restored');
      await cache.invalidateQueries({ queryKey: ['account', account.id, 'home', homeId] });
    } catch (e) { setState('moved'); setError(userMessage(e)); }
  }
  return <div className={cx(ui.card, styles.notice)} role="status" aria-live="polite">
    <p>{state === 'restored' ? <>«{title}» è stato ripristinato.</> : <>«{title}» spostato nel cestino.</>}</p>
    {error && <p role="alert">{error}</p>}
    <div className={styles.actions}>
      {state !== 'restored' && <button type="button" className={ui.btn} onClick={() => void undo()} disabled={state === 'restoring'}>{state === 'restoring' ? 'Ripristino…' : 'Annulla'}</button>}
      {state !== 'restored' && <Link to={'/home/' + encodeURIComponent(homeId) + '/cestino'} className={ui.btn}>Vai al cestino</Link>}
      <button type="button" className={ui.btn} onClick={onClose} aria-label="Chiudi avviso">Chiudi</button>
    </div>
  </div>;
}
