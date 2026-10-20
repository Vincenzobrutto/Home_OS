import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import type { SessionResponse } from '../api/types';
import { Link, useNavigate, useParams } from 'react-router';
import type { Share, ShareItem } from '../api/sharingTypes';
import { sharingApi, sharingKeys } from '../api/sharingClient';
import act from '../activities/activities.module.css';
import { Dialog } from '../activities/components';
import { AppShell } from '../components/AppShell';
import { useUpdateFocus } from '../components/useUpdateFocus';
import { Banner, ErrorState, Loading, Tag, cx, ui, useDocumentTitle } from '../components/ui';
import { isNotActiveError } from '../lib/economy';
import { safeFilename } from '../api/client';
import { saveBlob } from '../lib/files';
import {
  formatDateTime,
  formatTime,
  isAmbiguousShareError,
  isShareUnavailableError,
  normalizePairingCode,
  sharingErrorMessage,
  validatePairingCode,
} from '../lib/sharing';
import { ItemMeta, OperationFeedback } from '../sharing/components';
import { useDropOnForbidden, useReceivedShare, useReceivedShares, useSharingOperation, useStoreReceived } from '../sharing/hooks';
import { useAccount, useApi } from '../session/session';
import pages from './pages.module.css';

// C1a lato destinatario, a livello account: funziona anche senza case. Prima dell'accettazione nessun
// titolo, indirizzo o file; dopo, solo i file della consegna. Nessuna Home del mittente.

const receivedPath = (shareId?: string) => `/consegne${shareId ? `/${encodeURIComponent(shareId)}` : ''}`;
const sender = (s: Share) => s.senderName ?? 'mittente';

function Shell({ title, children }: { title: string; children: ReactNode }) {
  const account = useAccount();
  useDocumentTitle(title);
  return <AppShell account={account}>{children}</AppShell>;
}

const RECEIVED_LABEL: Record<Share['state'], string> = {
  awaiting_pairing: 'In attesa',
  awaiting_confirmation: 'In attesa della conferma del mittente',
  pending: 'Invito da accettare',
  accepted: 'Consultabile',
  declined: 'Rifiutata da te',
  revoked: 'Non più disponibile',
  expired: 'Scaduta',
  unavailable: 'Non più disponibile',
};

export function ReceivedListPage() {
  const list = useReceivedShares();
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <Shell title="Documenti ricevuti">
      <div className={pages.heading}>
        <div>
          <h1 tabIndex={-1}>Documenti ricevuti</h1>
          <p className={pages.lead}>Solo ciò che qualcuno ha scelto di darti, per un periodo limitato. Non è l’accesso a una casa.</p>
        </div>
        <Link to={receivedPath('codice')} className={ui.btn}>Ho ricevuto un codice</Link>
      </div>
      <section className={ui.card} aria-label="Documenti ricevuti">
        {list.isPending ? (
          <Loading label="Caricamento dei documenti ricevuti…" />
        ) : list.isError && !list.data ? (
          isNotActiveError(list.error) ? (
            <p className={pages.muted}>La ricezione dei documenti condivisi non è ancora attiva su questo servizio.</p>
          ) : (
            <ErrorState error={list.error} message={sharingErrorMessage(list.error)} onRetry={() => void list.refetch()} retrying={list.isFetching} />
          )
        ) : items.length === 0 ? (
          <p className={pages.muted}>Non hai ancora ricevuto documenti condivisi.</p>
        ) : (
          <ul className={act.list} aria-label="Documenti ricevuti">
            {items.map((s) => (
              <li key={s.id} className={act.item}>
                <div className={act.itemHead}>
                  <Link to={receivedPath(s.id)} className={act.title}>Documenti da {sender(s)}</Link>
                  <Tag tone={s.state === 'pending' || s.state === 'awaiting_confirmation' ? 'warn' : s.state === 'accepted' ? 'blue' : 'neutral'}>{RECEIVED_LABEL[s.state]}</Tag>
                </div>
                <span className={act.meta}>
                  {s.state === 'accepted' ? `${s.items.length === 1 ? '1 file' : `${s.items.length} file`} · fino a ${formatDateTime(s.expiresAt)}` : s.state === 'pending' || s.state === 'awaiting_confirmation' ? 'Contenuto visibile dopo l’accettazione' : 'Contenuto non disponibile'}
                </span>
              </li>
            ))}
          </ul>
        )}
        {list.hasNextPage && (
          <p className={pages.spaced}>
            <button type="button" className={cx(ui.btn, ui.small)} onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}>
              {list.isFetchingNextPage ? 'Caricamento…' : 'Carica altre'}
            </button>
          </p>
        )}
      </section>
    </Shell>
  );
}

// ---------------------------------------------------------------------------------
// Codice: mai nell'URL; solo nello stato del modulo e nel body della richiesta.
// ---------------------------------------------------------------------------------

export function ClaimCodePage() {
  const account = useAccount();
  return <ClaimCode key={account.id} />;
}

function ClaimCode() {
  const api = useApi();
  const account = useAccount();
  const navigate = useNavigate();
  const store = useStoreReceived();
  const id = useId();
  const [code, setCode] = useState('');
  const [disclose, setDisclose] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const op = useSharingOperation<Share>();
  const locked = op.pending || op.ambiguous;
  const codeInput = useRef<HTMLInputElement>(null);
  const errorResult = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!op.pending && op.error && document.activeElement === document.body) {
      if (!locked) codeInput.current?.focus();
      else errorResult.current?.focus();
    }
  }, [op.pending, op.error, locked]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (locked) return;
    const problem = validatePairingCode(code);
    setFieldError(problem);
    if (problem || !disclose) return;
    const value = normalizePairingCode(code);
    op.run(
      (key) => sharingApi(api).claim(value, key, account.id),
      (share) => {
        setCode('');
        store(share);
        navigate(receivedPath(share.id), { replace: true });
      },
    );
  };
  return (
    <Shell title="Inserisci il codice">
      <Link to={receivedPath()} className={pages.spaced}>← Documenti ricevuti</Link>
      <h1 tabIndex={-1}>Inserisci il codice</h1>
      <p className={pages.lead}>Ti è stato comunicato da chi vuole darti dei documenti. Da solo non mostra nulla: prima il mittente conferma che sei tu, poi accetti l’invito.</p>
      <section className={ui.card}>
        <form onSubmit={submit} noValidate>
          <div className={ui.field}>
            <label className={ui.label} htmlFor={`${id}-code`}>Codice</label>
            <input
              id={`${id}-code`}
              ref={codeInput}
              className={ui.input}
              value={code}
              onChange={(e) => { setCode(e.target.value); setFieldError(null); }}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={16}
              disabled={locked}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={`${id}-hint${fieldError ? ` ${id}-err` : ''}${op.error ? ` ${id}-server-error` : ''}`}
            />
            <span className={ui.hint} id={`${id}-hint`}>10 caratteri; spazi e trattini sono ammessi.</span>
            {fieldError && <span className={ui.fieldError} id={`${id}-err`} role="alert">{fieldError}</span>}
          </div>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', margin: '12px 0' }}>
            <input type="checkbox" checked={disclose} onChange={(e) => setDisclose(e.target.checked)} disabled={locked} />
            <span>Il mittente vedrà il nome e l’email del mio account (dichiarati, non verificati) per riconoscermi.</span>
          </label>
          <div id={`${id}-server-error`} ref={errorResult} tabIndex={-1}>
          <OperationFeedback
            op={op}
            title="Codice non accettato"
            extra={isShareUnavailableError(op.error) ? <p>Controlla il codice o chiedine uno nuovo a chi te l’ha dato.</p> : undefined}
          />
          </div>
          {!op.ambiguous && (
            <button type="submit" className={cx(ui.btn, ui.primary)} disabled={op.pending || !disclose}>{op.pending ? 'Invio…' : 'Invia il codice'}</button>
          )}
        </form>
      </section>
    </Shell>
  );
}

// ---------------------------------------------------------------------------------
// Dettaglio destinatario
// ---------------------------------------------------------------------------------

export function ReceivedDetailPage() {
  const account = useAccount();
  const { shareId = '' } = useParams();
  return <ReceivedDetail key={`${account.id}:${shareId}`} shareId={shareId} />;
}

function ReceivedDetail({ shareId }: { shareId: string }) {
  const api = useApi();
  const account = useAccount();
  const query = useReceivedShare(shareId);
  const resultFocus = useUpdateFocus<HTMLHeadingElement>(shareId, query.data?.version);
  useDropOnForbidden(sharingKeys.receivedShare(account.id, shareId), query);
  const store = useStoreReceived();
  const op = useSharingOperation<Share>();
  const [confirmDecline, setConfirmDecline] = useState(false);
  const back = <Link to={receivedPath()} className={pages.spaced}>← Documenti ricevuti</Link>;
  const forbidden = query.isError && isShareUnavailableError(query.error);
  if (query.isPending) return <Shell title="Documenti condivisi">{back}<Loading label="Caricamento dei documenti condivisi…" /></Shell>;
  if (forbidden || !query.data) {
    return (
      <Shell title="Documenti condivisi">
        {back}
        <h1 tabIndex={-1}>{forbidden ? 'Documenti non disponibili' : 'Documenti condivisi'}</h1>
        {forbidden ? (
          <p className={pages.muted}>Questa condivisione non esiste, non è destinata al tuo account o non è più disponibile.</p>
        ) : (
          <ErrorState error={query.error} message={sharingErrorMessage(query.error)} onRetry={() => void query.refetch()} retrying={query.isFetching} />
        )}
      </Shell>
    );
  }
  const s = query.data;
  const act2 = (action: 'accept' | 'decline') => op.run((key) => sharingApi(api).receivedAction(s.id, action, { expectedVersion: s.version }, key, account.id), store);
  const gone = s.state === 'revoked' || s.state === 'unavailable' || s.state === 'expired';
  return (
    <Shell title={`Documenti da ${sender(s)}`}>
      {back}
      <h1 tabIndex={-1} ref={resultFocus}>
        {s.state === 'pending' ? `${sender(s)} vuole darti dei documenti` : s.state === 'awaiting_confirmation' ? 'In attesa del mittente' : gone ? 'Non più disponibile' : `Documenti da ${sender(s)}`}
      </h1>
      {query.isError && (
        <Banner tone="warning" role="status" actions={<button type="button" className={cx(ui.btn, ui.small)} onClick={() => void query.refetch()}>Aggiorna</button>}>
          <p>Ultimo aggiornamento non riuscito: lo stato mostrato potrebbe non essere attuale.</p>
        </Banner>
      )}
      <div className={pages.stack}>
        {s.state === 'awaiting_confirmation' && (
          <section className={ui.card} aria-labelledby="cmp">
            <h2 id="cmp" className={pages.cardTitle}>Codice di confronto</h2>
            {s.comparison ? (
              <>
                <p style={{ font: '700 24px/1.3 ui-monospace, Consolas, monospace', letterSpacing: 3, margin: '4px 0' }} aria-label={`Codice di confronto: ${s.comparison.code.split('').join(' ')}`}>{s.comparison.code}</p>
                <p className={act.meta}>Valido fino alle {formatTime(s.comparison.expiresAt)}. Il mittente ti contatterà tramite un recapito che conosce e ti chiederà questo codice. Non vedi ancora nessun documento.</p>
              </>
            ) : (
              <p className={act.meta}>Il mittente deve confermare che sei tu. Non vedi ancora nessun documento.</p>
            )}
          </section>
        )}
        {s.state === 'pending' && (
          <section className={ui.card}>
            <p>Accettando potrai consultare e scaricare i file scelti per te fino a {formatDateTime(s.expiresAt)}. Non entri nella casa e non vedi altro. Prima di accettare non vedi titoli né contenuti.</p>
            <OperationFeedback op={op} title="Operazione non eseguita" onReread={() => void query.refetch()} />
            {!op.ambiguous && (
              <p className={act.actions}>
                <button type="button" className={cx(ui.btn, ui.primary)} onClick={() => act2('accept')} disabled={op.pending}>Accetta</button>
                <button type="button" className={ui.btn} onClick={() => setConfirmDecline(true)} disabled={op.pending}>Rifiuta</button>
              </p>
            )}
          </section>
        )}
        {s.state === 'accepted' && <AcceptedFiles share={s} />}
        {s.state === 'declined' && <Banner><p>Hai rifiutato questo invito: i file non sono consultabili.</p></Banner>}
        {gone && (
          <Banner>
            <p>{s.state === 'expired' && s.expiresAt ? `Il periodo di consultazione è terminato il ${formatDateTime(s.expiresAt)}.` : 'Questa condivisione non è più consultabile.'} Le copie che hai già scaricato restano tue.</p>
          </Banner>
        )}
      </div>
      {confirmDecline && (
        <Dialog title="Rifiutare l’invito?" onClose={() => setConfirmDecline(false)}>
          <p>Non potrai consultare i file. Il mittente vedrà che l’invito è stato rifiutato.</p>
          <p className={act.actions}>
            <button type="button" className={ui.btn} onClick={() => setConfirmDecline(false)}>Torna indietro</button>
            <button type="button" className={cx(ui.btn, ui.primary)} onClick={() => { setConfirmDecline(false); act2('decline'); }}>Rifiuta</button>
          </p>
        </Dialog>
      )}
    </Shell>
  );
}

function AcceptedFiles({ share }: { share: Share }) {
  const api = useApi();
  const account = useAccount();
  const queryClient = useQueryClient();
  const alive = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const current = () => alive.current && queryClient.getQueryData<SessionResponse>(queryKeys.session)?.account?.id === account.id;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ item: ShareItem; error: unknown } | null>(null);
  const download = async (item: ShareItem) => {
    setBusy(item.documentId);
    setError(null);
    try {
      const file = await sharingApi(api).file(share.id, item.documentId, undefined, account.id);
      if (!current()) return;
      saveBlob(file.blob, file.filename ?? safeFilename(item.name));
    } catch (err) {
      if (!current()) return;
      setError({ item, error: err });
      if (isShareUnavailableError(err)) void queryClient.resetQueries({ queryKey: sharingKeys.receivedShare(account.id, share.id), exact: true });
    } finally {
      if (current()) setBusy(null);
    }
  };
  return (
    <section className={ui.card} aria-labelledby="files">
      <h2 id="files" className={pages.cardTitle}>{share.items.length === 1 ? '1 file per te' : `${share.items.length} file per te`}</h2>
      <p className={act.meta}>Consultabile fino a {formatDateTime(share.expiresAt)}. Puoi scaricare i file; non puoi inoltrare la condivisione dentro Dimora.</p>
      {error && (
        <Banner tone={isAmbiguousShareError(error.error) ? 'error' : 'warning'} role="alert" title="Download non riuscito">
          <p>{isShareUnavailableError(error.error) ? 'Questa condivisione non è più disponibile per te.' : `«${error.item.name}»: ${sharingErrorMessage(error.error)}`}</p>
        </Banner>
      )}
      <ul className={act.list} aria-label="Documenti condivisi">
        {(error && isShareUnavailableError(error.error) ? [] : share.items).map((it) => (
          <li key={it.documentId} className={act.item}>
            <div className={act.itemHead}>
              <strong>{it.name}</strong>
              <button type="button" className={cx(ui.btn, ui.small)} onClick={() => void download(it)} disabled={busy !== null} aria-label={`Scarica ${it.name}`}>
                {busy === it.documentId ? 'Download…' : 'Scarica'}
              </button>
            </div>
            <ItemMeta item={it} />
          </li>
        ))}
      </ul>
    </section>
  );
}
