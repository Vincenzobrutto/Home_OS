import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { isApiError } from '../api/errors';
import type { ExpenseCapabilities, ExpenseHistoryEvent, ExpenseSnapshot, Home, HomeExpense } from '../api/types';
import { Banner, ErrorState, Loading, Tag, cx, ui, useDocumentTitle } from '../components/ui';
import {
  Dialog,
  ExpenseForm,
  NoteField,
  OperationFeedback,
  expenseOwn as own,
  expenseStyles as styles,
  useExpenseOperation,
} from '../expenses/components';
import { useExpense, useExpenseCapabilities, useExpenseHistory } from '../expenses/hooks';
import { formatCalendarDate, formatTimestamp } from '../lib/activities';
import {
  HISTORY_KIND_LABEL,
  ORIGIN_LABEL,
  PERSONAL_EXPENSE,
  STATE_LABEL,
  assetLinkText,
  documentLinkText,
  expenseErrorMessage,
  formatCents,
  normalizeText,
  validateNote,
} from '../lib/expenses';
import { useAccount } from '../session/session';
import { backToExpenses } from './ExpensesPage';
import { useCurrentHome } from './HomePages';
import pages from './pages.module.css';

export function ExpenseDetailPage() {
  const home = useCurrentHome();
  const account = useAccount();
  const location = useLocation();
  const { expenseId = '' } = useParams();
  const query = useExpense(home.id, expenseId);
  const capabilities = useExpenseCapabilities(home.id);
  // Prima versione vista: se cambia (operazione riuscita o rilettura) la vista si rimonta e il
  // focus va alla nuova azione. Le callback di mutate non bastano: il dialogo è già smontato.
  const [firstVersion, setFirstVersion] = useState<number | null>(null);
  if (query.data && firstVersion === null) setFirstVersion(query.data.expense.version);
  const back = (
    <Link to={backToExpenses(home.id, location.state, account.id)} className={pages.spaced}>
      ← Spese
    </Link>
  );

  if (query.isPending) {
    return (
      <>
        {back}
        <h1 className="visually-hidden" data-pending="">
          Spesa
        </h1>
        <Loading label="Caricamento della spesa…" />
      </>
    );
  }
  if (query.isError) {
    const status = isApiError(query.error) && query.error.kind === 'http' ? query.error.status : 0;
    if (status === 403 || status === 422) {
      return (
        <Unavailable back={back} title={status === 403 ? 'Spesa non disponibile' : 'Indirizzo non valido'}>
          {status === 403 ? 'Questo account non ha accesso alla spesa richiesta.' : 'L’indirizzo non corrisponde a una spesa valida.'}
        </Unavailable>
      );
    }
    return (
      <>
        {back}
        <h1 tabIndex={-1}>Spesa</h1>
        <div className={pages.spaced}>
          <ErrorState error={query.error} message={expenseErrorMessage(query.error)} onRetry={() => void query.refetch()} retrying={query.isFetching} />
        </div>
      </>
    );
  }
  // Chiave sulla versione: dopo una rilettura con dati nuovi le bozze locali ripartono dai dati del server.
  return (
    <ExpenseView
      key={query.data.expense.version}
      home={home}
      expense={query.data.expense}
      capabilities={capabilities.data}
      back={back}
      focusActions={firstVersion !== null && query.data.expense.version !== firstVersion}
    />
  );
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

type Panel = 'none' | 'edit' | 'archive' | 'restore';

function ExpenseView(props: {
  home: Home;
  expense: HomeExpense;
  capabilities?: ExpenseCapabilities;
  back: ReactNode;
  focusActions: boolean;
}) {
  const { home, expense } = props;
  useDocumentTitle(`${expense.title} · ${home.name}`);
  const [panel, setPanel] = useState<Panel>('none');
  const actionsRef = useRef<HTMLDivElement>(null);
  const focusOnMount = useRef(props.focusActions);
  useEffect(() => {
    if (focusOnMount.current) actionsRef.current?.querySelector('button')?.focus();
  }, []);
  const done = () => setPanel('none');
  const canEdit = home.permissions.includes('edit') && expense.permissions.includes('edit') && !!props.capabilities;
  const active = expense.state === 'active';
  const base = `/home/${encodeURIComponent(home.id)}`;

  return (
    <>
      {props.back}
      <div className={pages.heading}>
        <div>
          <span className={pages.eyebrow}>
            {home.name} · {PERSONAL_EXPENSE}
          </span>
          <h1 tabIndex={-1}>{expense.title}</h1>
          <div className={styles.actions}>
            <Tag tone="blue">{ORIGIN_LABEL[expense.origin]}</Tag>
            <Tag>{STATE_LABEL[expense.state]}</Tag>
          </div>
        </div>
      </div>
      <div className={pages.stack}>
        <section className={ui.card} aria-labelledby="spesa-dati">
          <h2 id="spesa-dati" className={pages.cardTitle}>
            Dettagli
          </h2>
          <dl className={pages.detailList}>
            <dt>Importo</dt>
            <dd className={own.amount}>{formatCents(expense.amountCents)}</dd>
            <dt>Data della spesa</dt>
            <dd>{formatCalendarDate(expense.spentOn)}</dd>
            <dt>Origine</dt>
            <dd>{ORIGIN_LABEL[expense.origin]}</dd>
            <dt>Documento</dt>
            <dd>
              {expense.documentLink.state === 'linked' ? (
                <Link to={`${base}/documenti/${encodeURIComponent(expense.documentLink.document.id)}`}>{expense.documentLink.document.name}</Link>
              ) : (
                documentLinkText(expense.documentLink)
              )}
            </dd>
            <dt>Caldaia</dt>
            <dd>
              {expense.assetLink.state === 'linked' ? (
                <Link to={`${base}/impianti/${encodeURIComponent(expense.assetLink.asset.id)}`}>{expense.assetLink.asset.name}</Link>
              ) : (
                assetLinkText(expense.assetLink)
              )}
            </dd>
            <dt>Nota</dt>
            <dd className={styles.description}>{expense.note ?? '—'}</dd>
            <dt>Registrata</dt>
            <dd>{formatTimestamp(expense.createdAt)}</dd>
            {expense.archivedAt && (
              <>
                <dt>Archiviata</dt>
                <dd>{formatTimestamp(expense.archivedAt)}</dd>
              </>
            )}
          </dl>
          <p className={cx(pages.small, pages.muted, pages.spaced)}>
            Costo dichiarato da te: non è un pagamento verificato né un incasso, e non cambia il documento o la scheda
            caldaia collegati.
          </p>
        </section>

        {/* Con il dialogo aperto i pulsanti restano: alla chiusura il focus torna al pulsante d'origine. */}
        {canEdit && panel !== 'edit' && (
          <div ref={actionsRef} className={styles.actions}>
            {active ? (
              <>
                <button type="button" className={cx(ui.btn, ui.primary)} onClick={() => setPanel('edit')}>
                  Modifica
                </button>
                <button type="button" className={ui.btn} onClick={() => setPanel('archive')}>
                  Archivia
                </button>
              </>
            ) : (
              <button type="button" className={ui.btn} onClick={() => setPanel('restore')}>
                Ripristina
              </button>
            )}
          </div>
        )}
        {!canEdit && home.permissions.includes('edit') && !props.capabilities && (
          <p className={pages.muted}>Le modifiche non sono disponibili finché il servizio spese non risponde.</p>
        )}
        {!home.permissions.includes('edit') && <p className={pages.muted}>Con il tuo ruolo puoi consultare questa spesa, non modificarla.</p>}
        {!active && canEdit && <p className={pages.muted}>Una spesa archiviata non si modifica: ripristinala prima.</p>}

        {panel === 'edit' && active && props.capabilities && (
          <ExpenseForm home={home} capabilities={props.capabilities} expense={expense} onCancel={() => setPanel('none')} onDone={done} />
        )}
        {panel === 'archive' && active && (
          <ActionDialog
            home={home}
            expense={expense}
            kind="archive"
            confirmLabel="Archivia spesa"
            hint="La spesa esce dall’elenco delle attive e dai totali. Non viene cancellata: resta con la sua storia e puoi ripristinarla."
            noteMax={props.capabilities?.limits.noteMaxCodePoints}
            onClose={() => setPanel('none')}
            onDone={done}
          />
        )}
        {panel === 'restore' && !active && (
          <ActionDialog
            home={home}
            expense={expense}
            kind="restore"
            confirmLabel="Ripristina spesa"
            hint="La spesa torna attiva con gli stessi dati e rientra nei totali dell’anno della sua data."
            noteMax={props.capabilities?.limits.noteMaxCodePoints}
            onClose={() => setPanel('none')}
            onDone={done}
          />
        )}

        <HistorySection homeId={home.id} expenseId={expense.id} />
      </div>
    </>
  );
}

function ActionDialog(props: {
  home: Home;
  expense: HomeExpense;
  kind: 'archive' | 'restore';
  confirmLabel: string;
  hint: string;
  noteMax?: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const id = useId();
  const op = useExpenseOperation(props.home.id);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | undefined>();
  // Invio in corso o esito ambiguo: niente chiusura che perderebbe la riprova.
  const disabled = op.mutation.isPending || op.locked;

  const submit = () => {
    const e = validateNote(note, props.noteMax);
    setError(e);
    if (e) return;
    const n = normalizeText(note);
    op.run(
      { kind: props.kind, expenseId: props.expense.id, body: { expectedVersion: props.expense.version, ...(n ? { note: n } : {}) } },
      props.onDone,
    );
  };

  return (
    <Dialog title={props.confirmLabel} onClose={props.onClose} dismissDisabled={disabled}>
      <form
        noValidate
        aria-label={props.confirmLabel}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <p className={styles.meta}>{props.hint}</p>
        <NoteField id={`${id}-note`} value={note} onChange={setNote} error={error} disabled={disabled} label="Nota sull’operazione (facoltativa)" />
        <OperationFeedback op={op} homeId={props.home.id} title="Operazione non eseguita" onRetry={() => op.retry(props.onDone)} />
        <div className={styles.actions}>
          {!op.locked && (
            <button type="submit" className={cx(ui.btn, ui.primary)} disabled={op.mutation.isPending}>
              {op.mutation.isPending ? 'Invio…' : props.confirmLabel}
            </button>
          )}
          <button type="button" className={cx(ui.btn, ui.ghost)} onClick={props.onClose} disabled={disabled}>
            Torna indietro
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function snapshotText(s: ExpenseSnapshot) {
  return `${s.title} · ${formatCents(s.amountCents)} · ${formatCalendarDate(s.spentOn)} · ${ORIGIN_LABEL[s.origin]}`;
}

function changeList(e: ExpenseHistoryEvent) {
  const b = e.before;
  const a = e.after;
  if (!b) return [`Registrata: ${snapshotText(a)}`];
  const out: string[] = [];
  if (b.title !== a.title) out.push(`Titolo: ${b.title} → ${a.title}`);
  if (b.amountCents !== a.amountCents) out.push(`Importo: ${formatCents(b.amountCents)} → ${formatCents(a.amountCents)}`);
  if (b.spentOn !== a.spentOn) out.push(`Data: ${formatCalendarDate(b.spentOn)} → ${formatCalendarDate(a.spentOn)}`);
  if (b.note !== a.note) out.push(`Nota: ${b.note ?? '—'} → ${a.note ?? '—'}`);
  if (b.state !== a.state) out.push(`Stato: ${STATE_LABEL[b.state]} → ${STATE_LABEL[a.state]}`);
  if (JSON.stringify(b.documentLink) !== JSON.stringify(a.documentLink)) {
    out.push(`Documento: ${documentLinkText(b.documentLink)} → ${documentLinkText(a.documentLink)}`);
  }
  if (JSON.stringify(b.assetLink) !== JSON.stringify(a.assetLink)) {
    out.push(`Caldaia: ${assetLinkText(b.assetLink)} → ${assetLinkText(a.assetLink)}`);
  }
  return out;
}

function HistorySection({ homeId, expenseId }: { homeId: string; expenseId: string }) {
  const history = useExpenseHistory(homeId, expenseId);
  const events = history.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <section className={ui.card} aria-labelledby="spesa-storia">
      <h2 id="spesa-storia" className={pages.cardTitle}>
        Storia della spesa
      </h2>
      {history.isPending ? (
        <Loading label="Caricamento della storia…" />
      ) : history.isError && !history.data ? (
        <ErrorState error={history.error} message={expenseErrorMessage(history.error)} onRetry={() => void history.refetch()} retrying={history.isFetching} />
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
