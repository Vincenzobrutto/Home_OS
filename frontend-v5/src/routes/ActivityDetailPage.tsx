import { ContactsPanel } from '../contacts/components';
import { useId, useState, type ReactNode, type RefObject } from 'react';
import { useUpdateFocus } from '../components/useUpdateFocus';
import { Link, useLocation, useParams } from 'react-router';
import { isApiError } from '../api/errors';
import type { ActivityHistoryEvent, ActivityHistorySnapshot, Home, HomeActivity } from '../api/types';
import {
  ActivityForm,
  Dialog,
  DueBadge,
  NoteField,
  OperationFeedback,
  activityStyles as styles,
  dueText,
  useActivityOperation,
} from '../activities/components';
import { useActivity, useActivityCapabilities, useActivityHistory } from '../activities/hooks';
import { Banner, ErrorState, Loading, Tag, cx, ui, useDocumentTitle } from '../components/ui';
import {
  HISTORY_KIND_LABEL,
  PERSONAL_REMINDER,
  STATE_LABEL,
  activityErrorMessage,
  assetLinkText,
  formatCalendarDate,
  formatTimestamp,
  normalizeText,
  validateNote,
} from '../lib/activities';
import { useCurrentHome } from './HomePages';
import pages from './pages.module.css';

export function ActivityDetailPage() {
  const home = useCurrentHome();
  const { activityId = '' } = useParams();
  const location = useLocation();
  const listBase = `/home/${encodeURIComponent(home.id)}/attivita`;
  const saved = location.state?.activityList;
  const fromList = saved && (saved.url === listBase || saved.url?.startsWith(listBase + '?')) ? saved : null;
  const query = useActivity(home.id, activityId);
  const statusRef = useUpdateFocus<HTMLDivElement>(`${home.id}:${activityId}`, query.data?.activity.version);
  const back = (
    <Link to={fromList?.url ?? listBase} state={fromList ? {activityRestore:fromList} : null} className={pages.spaced}>
      ← Attività
    </Link>
  );

  if (query.isPending) {
    return (
      <>
        {back}
        <h1 className="visually-hidden" data-pending="">
          Attività
        </h1>
        <Loading label="Caricamento dell’attività…" />
      </>
    );
  }
  if (query.isError) {
    const status = isApiError(query.error) && query.error.kind === 'http' ? query.error.status : 0;
    if (status === 403 || status === 422) {
      return (
        <Unavailable back={back} title={status === 403 ? 'Attività non disponibile' : 'Indirizzo non valido'}>
          {status === 403 ? 'Questo account non ha accesso all’attività richiesta.' : 'L’indirizzo non corrisponde a un’attività valida.'}
        </Unavailable>
      );
    }
    return (
      <>
        {back}
        <h1 tabIndex={-1}>Attività</h1>
        <div className={pages.spaced}>
          <ErrorState error={query.error} message={activityErrorMessage(query.error)} onRetry={() => void query.refetch()} retrying={query.isFetching} />
        </div>
      </>
    );
  }
  // Chiave sulla versione: dopo una rilettura con dati nuovi le bozze locali ripartono dai dati del server.
  return <ActivityView key={query.data.activity.version} home={home} activity={query.data.activity} today={query.data.today} back={back} statusRef={statusRef} />;
}

function Unavailable(props: { back: ReactNode; title: string; children: string }) {
  useDocumentTitle(props.title);
  return (
    <div className={pages.stack}>
      <div>
        {props.back}
        <h1 tabIndex={-1}>{props.title}</h1>
      </div>
      <Banner tone="warning" role="alert">
        <p>{props.children}</p>
      </Banner>
    </div>
  );
}

type Panel = 'none' | 'edit' | 'complete' | 'cancel' | 'reopen';

function ActivityView({ home, activity, today, back, statusRef }: { home: Home; activity: HomeActivity; today: string; back: ReactNode; statusRef: RefObject<HTMLDivElement | null> }) {
  useDocumentTitle(`${activity.title} · ${home.name}`);
  const capabilities = useActivityCapabilities(home.id);
  const [panel, setPanel] = useState<Panel>('none');
  const canEdit = home.permissions.includes('edit') && activity.permissions.includes('edit');
  const isOpen = activity.state === 'open';
  const base = `/home/${encodeURIComponent(home.id)}`;

  return (
    <>
      {back}
      <div className={pages.heading}>
        <div>
          <span className={pages.eyebrow}>
            {home.name} · {PERSONAL_REMINDER}
          </span>
          <h1 tabIndex={-1}>{activity.title}</h1>
          <div className={styles.actions} ref={statusRef} tabIndex={-1} role="status" aria-label="Stato dell’attività">
            <Tag tone="blue">{STATE_LABEL[activity.state]}</Tag>
            <DueBadge state={activity.dueState} />
          </div>
        </div>
      </div>
      <div className={pages.stack}>
        <section className={ui.card} aria-labelledby="attivita-dati">
          <h2 id="attivita-dati" className={pages.cardTitle}>
            Dettagli
          </h2>
          <dl className={pages.detailList}>
            <dt>Data</dt>
            <dd>{dueText(activity)}</dd>
            <dt>Oggi</dt>
            <dd>{formatCalendarDate(today)} (Europe/Rome)</dd>
            <dt>Descrizione</dt>
            <dd className={styles.description}>{activity.description ?? '—'}</dd>
            {activity.assetLink.state !== 'none' && <><dt>Caldaia</dt>
            <dd>
              {activity.assetLink.state === 'linked' ? (
                <Link to={`${base}/impianti/${encodeURIComponent(activity.assetLink.asset.id)}`}>{activity.assetLink.asset.name}</Link>
              ) : (
                assetLinkText(activity.assetLink)
              )}
            </dd></>}
            <dt>Creata</dt>
            <dd>{formatTimestamp(activity.createdAt)}</dd>
            {activity.completedAt && (
              <>
                <dt>Completata da te</dt>
                <dd>{formatTimestamp(activity.completedAt)}</dd>
              </>
            )}
            {activity.cancelledAt && (
              <>
                <dt>Annullata</dt>
                <dd>{formatTimestamp(activity.cancelledAt)}</dd>
              </>
            )}
          </dl>
          <p className={cx(pages.small, pages.muted, pages.spaced)}>
            Promemoria personale: completarlo registra quello che dichiari, non certifica un intervento e non cambia i dati
            o le verifiche degli oggetti o degli impianti.
          </p>
        </section>

        {/* Con il dialogo di annullamento aperto i pulsanti restano: alla chiusura il focus torna al pulsante d'origine. */}
        {canEdit && (panel === 'none' || panel === 'cancel') && (
          <div className={styles.actions}>
            {isOpen ? (
              <>
                <button type="button" className={cx(ui.btn, ui.primary)} onClick={() => setPanel('complete')}>
                  Completa
                </button>
                <button type="button" className={ui.btn} onClick={() => setPanel('edit')}>
                  Modifica
                </button>
                <button type="button" className={ui.btn} onClick={() => setPanel('cancel')}>
                  Annulla attività
                </button>
              </>
            ) : (
              <button type="button" className={ui.btn} onClick={() => setPanel('reopen')}>
                Riapri attività
              </button>
            )}
          </div>
        )}
        {!canEdit && <p className={pages.muted}>Con il tuo ruolo puoi consultare questa attività, non modificarla.</p>}

        {panel === 'edit' && isOpen && (
          <ActivityForm
            home={home}
            activity={activity}
            limits={capabilities.data?.limits}
            onCancel={() => setPanel('none')}
            onDone={() => setPanel('none')}
          />
        )}
        {panel === 'complete' && isOpen && (
          <ActionForm
            home={home}
            activity={activity}
            kind="complete"
            title="Completa l’attività"
            confirmLabel="Conferma completamento"
            hint="Dichiari di averla svolta. Puoi aggiungere una nota sul lavoro fatto."
            noteMax={capabilities.data?.limits.noteMaxCodePoints}
            onClose={() => setPanel('none')}
          />
        )}
        {panel === 'reopen' && !isOpen && (
          <ActionForm
            home={home}
            activity={activity}
            kind="reopen"
            title="Riapri l’attività"
            confirmLabel="Conferma riapertura"
            hint="Torna aperta con la stessa data, titolo e descrizione; la storia resta. Se la data è passata risulterà scaduta."
            noteMax={capabilities.data?.limits.noteMaxCodePoints}
            onClose={() => setPanel('none')}
          />
        )}
        {panel === 'cancel' && isOpen && (
            <ActionForm
              modal
              home={home}
              activity={activity}
              kind="cancel"
              title=""
              confirmLabel="Annulla attività"
              hint="L’attività non viene eliminata: resta consultabile con la sua storia e puoi riaprirla."
              noteMax={capabilities.data?.limits.noteMaxCodePoints}
              onClose={() => setPanel('none')}
              backLabel="Torna indietro"
            />
        )}

        <ContactsPanel homeId={home.id} resource={{kind:"activity",id:activity.id}} canEdit={home.permissions.includes("edit") && activity.permissions.includes("edit")} />
        <HistorySection homeId={home.id} activityId={activity.id} />
      </div>
    </>
  );
}

function ActionForm(props: {
  home: Home;
  activity: HomeActivity;
  kind: 'complete' | 'cancel' | 'reopen';
  title: string;
  confirmLabel: string;
  hint: string;
  noteMax?: number;
  onClose: () => void;
  backLabel?: string;
  modal?: boolean;
}) {
  const id = useId();
  const op = useActivityOperation(props.home.id);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | undefined>();
  const disabled = op.mutation.isPending || op.locked;

  const submit = () => {
    const e = validateNote(note, props.noteMax);
    setError(e);
    if (e) return;
    const n = normalizeText(note);
    op.run(
      {
        kind: props.kind,
        activityId: props.activity.id,
        body: { expectedVersion: props.activity.version, ...(n ? { note: n } : {}) },
      },
      props.onClose,
    );
  };

  const form = (
    <form
      className={props.title ? styles.panel : undefined}
      noValidate
      aria-label={props.title || props.confirmLabel}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {props.title && <h2 className={pages.cardTitle}>{props.title}</h2>}
      <p className={styles.meta}>{props.hint}</p>
      <NoteField id={`${id}-note`} value={note} onChange={setNote} error={error} disabled={disabled} />
      <OperationFeedback op={op} homeId={props.home.id} title="Operazione non eseguita" onRetry={() => op.retry(props.onClose)} />
      <div className={styles.actions}>
        {!op.locked && (
          <button type="submit" className={cx(ui.btn, ui.primary)} disabled={op.mutation.isPending}>
            {op.mutation.isPending ? 'Invio…' : props.confirmLabel}
          </button>
        )}
        <button type="button" className={cx(ui.btn, ui.ghost)} onClick={props.onClose} disabled={disabled}>
          {props.backLabel ?? 'Chiudi'}
        </button>
      </div>
    </form>
  );
  return props.modal ? <Dialog title={props.confirmLabel} onClose={props.onClose} dismissDisabled={disabled}>{form}</Dialog> : form;
}

function snapshotText(s: ActivityHistorySnapshot | null) {
  if (!s) return '—';
  const date = s.dueDate ? formatCalendarDate(s.dueDate) : 'senza data';
  return `${s.title} · ${date} · ${STATE_LABEL[s.state]} · ${assetLinkText(s.assetLink)}`;
}

function changeList(e: ActivityHistoryEvent) {
  const b = e.before;
  const a = e.after;
  if (!b) return [`Creata: ${snapshotText(a)}`];
  const out: string[] = [];
  if (b.title !== a.title) out.push(`Titolo: ${b.title} → ${a.title}`);
  if (b.description !== a.description) out.push(`Descrizione: ${b.description ?? '—'} → ${a.description ?? '—'}`);
  if (b.dueDate !== a.dueDate) {
    out.push(`Data: ${b.dueDate ? formatCalendarDate(b.dueDate) : 'senza data'} → ${a.dueDate ? formatCalendarDate(a.dueDate) : 'senza data'}`);
  }
  if (b.state !== a.state) out.push(`Stato: ${STATE_LABEL[b.state]} → ${STATE_LABEL[a.state]}`);
  if (JSON.stringify(b.assetLink) !== JSON.stringify(a.assetLink)) {
    out.push(`Caldaia: ${assetLinkText(b.assetLink)} → ${assetLinkText(a.assetLink)}`);
  }
  return out;
}

function HistorySection({ homeId, activityId }: { homeId: string; activityId: string }) {
  const history = useActivityHistory(homeId, activityId);
  const events = history.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <section className={ui.card} aria-labelledby="attivita-storia">
      <h2 id="attivita-storia" className={pages.cardTitle}>
        Storia dell’attività
      </h2>
      <p className={cx(pages.small, pages.muted)}>Registra le tue azioni sul promemoria, senza modificare i dati tecnici degli oggetti o degli impianti.</p>
      {history.isPending ? (
        <Loading label="Caricamento della storia…" />
      ) : history.isError && !history.data ? (
        <ErrorState error={history.error} message={activityErrorMessage(history.error)} onRetry={() => void history.refetch()} retrying={history.isFetching} />
      ) : events.length === 0 ? (
        <p className={pages.muted}>Ancora nessun evento.</p>
      ) : (
        <ol className={styles.history}>
          {events.map((e) => (
            <li key={e.id} className={styles.event}>
              <strong>{HISTORY_KIND_LABEL[e.kind]}</strong>
              <span className={styles.meta}>{formatTimestamp(e.at)} · tua azione</span>
              {changeList(e).map((c, i) => (
                <span key={i}>{c}</span>
              ))}
              {e.note && <span>Nota: {e.note}</span>}
            </li>
          ))}
        </ol>
      )}
      {history.hasNextPage && (
        <p className={pages.spaced}>
          <button type="button" className={ui.btn} onClick={() => void history.fetchNextPage()} disabled={history.isFetchingNextPage}>
            Mostra eventi precedenti
          </button>
        </p>
      )}
    </section>
  );
}
