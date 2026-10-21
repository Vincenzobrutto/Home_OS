import {isUtility} from '../lib/billPeriod';
import {ExpenseOverview} from '../expenses/ExpenseOverview';
import { LinkedDocument } from '../expenses/LinkedDocument';
import { ContactsPanel } from '../contacts/components';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { isApiError } from '../api/errors';
import type { EconomyCapabilities, EconomyExpense, ExpenseHistoryEvent, ExpenseSnapshot } from '../api/economyTypes';
import type { Home } from '../api/types';
import act from '../activities/activities.module.css';
import { Dialog, NoteField } from '../activities/components';
import { Banner, ErrorState, Loading, Tag, cx, ui, useDocumentTitle } from '../components/ui';
import { EconomyExpenseForm, EconomyFeedback, objectHref, workPath } from '../economy/components';
import { useEconomyCapabilities, useEconomyExpense, useEconomyExpenseHistory, useEconomyOperation } from '../economy/hooks';
import { formatCalendarDate, formatTimestamp } from '../lib/activities';
import { categoryLabel, economyErrorMessage, familyLabel, isNotActiveError } from '../lib/economy';
import { HISTORY_KIND_LABEL, documentLinkText, formatCents, normalizeText, validateNote } from '../lib/expenses';
import { useAccount } from '../session/session';
import { ExpenseDetailPage as LegacyExpenseDetailPage } from './ExpenseDetailPage';
import { useCurrentHome } from './HomePages';
import pages from './pages.module.css';

/** Dettaglio costo: proiezione economy-v1 se attiva, altrimenti la pagina H3a. */
export function ExpenseDetailRoute() {
  const home = useCurrentHome();
  const caps = useEconomyCapabilities(home.id);
  if (caps.isPending) return <Loading label="Caricamento del costo…" />;
  if (caps.isError && isNotActiveError(caps.error)) return <LegacyExpenseDetailPage />;
  if (caps.isSuccess && (!caps.data.enabled || !caps.data.features.history)) return <LegacyExpenseDetailPage />;
  return <EconomyExpenseDetail home={home} caps={caps.data} />;
}

function backTo(homeId: string, state: unknown, accountId: string) {
  const s = state as { accountId?: unknown; expensesSearch?: unknown } | null;
  const base = `/home/${encodeURIComponent(homeId)}/spese`;
  if (s?.accountId !== accountId || typeof s.expensesSearch !== 'string') return base;
  return s.expensesSearch ? `${base}?${s.expensesSearch}` : base;
}

function EconomyExpenseDetail({ home, caps }: { home: Home; caps?: EconomyCapabilities }) {
  const account = useAccount();
  const location = useLocation();
  const { expenseId = '' } = useParams();
  const query = useEconomyExpense(home.id, expenseId);
  const [firstVersion, setFirstVersion] = useState<number | null>(null);
  if (query.data && firstVersion === null) setFirstVersion(query.data.version);
  const nav = location.state as { accountId?: string; economyQ?: string; expenseRestore?: {id:string;y:number;pages:number} } | null;
  const back = (
    <Link to={backTo(home.id, location.state, account.id)} state={nav?.accountId === account.id ? { accountId: account.id, economyQ: nav.economyQ, expenseRestore:nav.expenseRestore } : undefined} className={pages.spaced}>
      ← Spese
    </Link>
  );
  if (query.isPending) {
    return (
      <>
        {back}
        <Loading label="Caricamento del costo…" />
      </>
    );
  }
  if (query.isError) {
    const status = isApiError(query.error) && query.error.kind === 'http' ? query.error.status : 0;
    return (
      <>
        {back}
        <h1 tabIndex={-1}>{status === 403 ? 'Costo non disponibile' : 'Costo'}</h1>
        {status === 403 || status === 422 ? (
          <Banner tone="warning" role="alert">
            <p>{status === 403 ? 'Questo account non ha accesso al costo richiesto.' : 'L’indirizzo non corrisponde a un costo valido.'}</p>
          </Banner>
        ) : (
          <ErrorState error={query.error} message={economyErrorMessage(query.error)} onRetry={() => void query.refetch()} retrying={query.isFetching} />
        )}
      </>
    );
  }
  return <ExpenseView key={query.data.version} home={home} caps={caps} expense={query.data} back={back} focusActions={firstVersion !== null && query.data.version !== firstVersion} />;
}

type Panel = 'none' | 'edit' | 'archive' | 'restore';

function ExpenseView(props: { home: Home; caps?: EconomyCapabilities; expense: EconomyExpense; back: ReactNode; focusActions: boolean }) {
  const { home, expense, caps } = props;
  useDocumentTitle(`${expense.title} · ${home.name}`);
  const [panel, setPanel] = useState<Panel>('none');
  const actionsRef = useRef<HTMLDivElement>(null);
  const focusOnMount = useRef(props.focusActions);
  useEffect(() => {
    if (focusOnMount.current) actionsRef.current?.querySelector('button')?.focus();
  }, []);
  const canEdit = home.permissions.includes('edit') && expense.permissions.includes('edit') && !!caps;
  const active = expense.state === 'active';
  const o = expense.objectLink;
  const w = expense.workLink;
  return (
    <>
      {props.back}

      <div className={pages.heading}>
        <div>
          <span className={pages.eyebrow}>
            {home.name} · {familyLabel(expense.family, caps)}
          </span>
          <h1 tabIndex={-1}>{expense.title}</h1>
          <div className={act.actions}>
            <Tag tone="blue">{categoryLabel(expense.category, caps)}</Tag>
            <Tag>{active ? 'Attivo' : 'Archiviato'}</Tag>
          </div>
        </div>
      </div>
      <div className={pages.stack}>
        <section className={ui.card} aria-label="Riepilogo della spesa"><ExpenseOverview expense={expense}/></section>
        <section className={ui.card} aria-labelledby="costo-dati">
          <h2 id="costo-dati" className={pages.cardTitle}>
            Dettagli
          </h2>
          <dl className={pages.detailList}>
            <dt>Origine dell’importo</dt>
            <dd>{expense.amountOrigin === 'extraction_confirmed' ? 'Proposto da un documento e confermato da te' : 'Dichiarato da te'}</dd>
            {isUtility(expense.category)&&<><dt>Data registrata per la spesa</dt><dd>{formatCalendarDate(expense.spentOn)}</dd></>}
            <dt>Categoria</dt>
            <dd>{categoryLabel(expense.category, caps)}</dd>
            <dt>Famiglia</dt>
            <dd>{familyLabel(expense.family, caps)}</dd>
            <dt>Oggetto</dt>
            <dd>{o.state === 'linked' ? <Link to={objectHref(home.id, o.value.ref)}>{o.value.name}</Link> : o.state === 'unavailable' ? 'Oggetto non più disponibile per il tuo account' : 'Costo non attribuito a un oggetto'}</dd>
            <dt>Lavoro</dt>
            <dd>
              {w.state === 'linked' ? (
                <>
                  <Link to={workPath(home.id, w.value.id)}>{w.value.name}</Link>
                  {w.value.state === 'archived' ? ' (archiviato)' : ''}
                </>
              ) : w.state === 'unavailable' ? (
                'Lavoro non più disponibile'
              ) : (
                'Nessun lavoro'
              )}
            </dd>
            <dt>Documento</dt>
            <dd>{expense.documentLink.state === 'linked' ? <LinkedDocument homeId={home.id} document={expense.documentLink.document} /> : documentLinkText(expense.documentLink)}</dd>
            {expense.documentNumber && (<><dt>Numero documento</dt><dd>{expense.documentNumber}</dd></>)}
            <dt>Nota</dt>
            <dd className={act.description}>{expense.note ?? '—'}</dd>
            <dt>Registrato</dt>
            <dd>{formatTimestamp(expense.createdAt)}</dd>
          </dl>
          <p className={cx(pages.small, pages.muted, pages.spaced)}>Costo registrato da te: non è un pagamento verificato e non cambia documento, oggetto o lavoro collegati.</p>
        </section>

        {canEdit && panel !== 'edit' && (
          <div ref={actionsRef} className={act.actions}>
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
        {!home.permissions.includes('edit') && <p className={pages.muted}>Con il tuo ruolo puoi consultare questo costo, non modificarlo.</p>}
        {panel === 'edit' && active && caps && <EconomyExpenseForm home={home} caps={caps} expense={expense} onCancel={() => setPanel('none')} onDone={() => setPanel('none')} />}
        {(panel === 'archive' || panel === 'restore') && (
          <StateDialog home={home} expense={expense} kind={panel} noteMax={caps?.limits.noteMaxCodePoints} onClose={() => setPanel('none')} />
        )}
        <ContactsPanel homeId={home.id} resource={{kind:"expense",id:expense.id}} canEdit={canEdit} />
        <History homeId={home.id} expenseId={expense.id} caps={caps} />
      </div>
    </>
  );
}

function StateDialog(props: { home: Home; expense: EconomyExpense; kind: 'archive' | 'restore'; noteMax?: number; onClose: () => void }) {
  const id = useId();
  const op = useEconomyOperation(props.home.id);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string>();
  const disabled = op.mutation.isPending || op.locked;
  const label = props.kind === 'archive' ? 'Archivia costo' : 'Ripristina costo';
  return (
    <Dialog title={label} onClose={props.onClose} dismissDisabled={disabled}>
      <form
        noValidate
        aria-label={label}
        onSubmit={(e) => {
          e.preventDefault();
          const v = validateNote(note, props.noteMax);
          setError(v);
          if (v) return;
          const n = normalizeText(note);
          op.run({ kind: props.kind, expenseId: props.expense.id, body: { expectedVersion: props.expense.version, ...(n ? { note: n } : {}) } }, props.onClose);
        }}
      >
        <p className={act.meta}>
          {props.kind === 'archive'
            ? 'Il costo esce dai totali ma non viene cancellato: resta con la sua storia e puoi ripristinarlo.'
            : 'Il costo torna nei totali del periodo della sua data, con gli stessi dati.'}
        </p>
        <NoteField id={`${id}-note`} value={note} onChange={setNote} error={error} disabled={disabled} label="Nota sull’operazione (facoltativa)" />
        <EconomyFeedback op={op} homeId={props.home.id} title="Operazione non eseguita" onRetry={() => op.retry(props.onClose)} />
        <div className={act.actions}>
          {!op.locked && (
            <button type="submit" className={cx(ui.btn, ui.primary)} disabled={op.mutation.isPending}>
              {op.mutation.isPending ? 'Invio…' : label}
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

function linkName(l: { state: string; value: { name: string } | null }) {
  return l.state === 'linked' && l.value ? l.value.name : l.state === 'unavailable' ? 'non più disponibile' : '—';
}

export function snapshotChanges(e: ExpenseHistoryEvent, caps?: EconomyCapabilities) {
  const a = e.after;
  const b = e.before;
  if (!b) return [`Registrato: ${a.title} · ${formatCents(a.amountCents)} · ${formatCalendarDate(a.spentOn)} · ${categoryLabel(a.category, caps)}`];
  const out: string[] = [];
  const diff = <K extends keyof ExpenseSnapshot>(k: K, label: string, fmt: (v: ExpenseSnapshot[K]) => string = (v) => (v === null || v === undefined ? '—' : String(v))) => {
    if (JSON.stringify(b[k]) !== JSON.stringify(a[k])) out.push(`${label}: ${fmt(b[k])} → ${fmt(a[k])}`);
  };
  diff('title', 'Descrizione');
  diff('amountCents', 'Importo', (v) => formatCents(v as number));
  diff('spentOn', 'Data', (v) => formatCalendarDate(v as string));
  diff('category', 'Categoria', (v) => categoryLabel(v as ExpenseSnapshot['category'], caps));
  diff('family', 'Famiglia', (v) => familyLabel(v as ExpenseSnapshot['family'], caps));
  diff('supplier', 'Fornitore');
  diff('documentNumber', 'Numero documento');
  diff('documentDate', 'Data documento');
  diff('competenceFrom', 'Competenza dal');
  diff('competenceTo', 'Competenza al');
  diff('dueOn', 'Scadenza');
  diff('note', 'Nota');
  diff('state', 'Stato', (v) => (v === 'archived' ? 'archiviato' : 'attivo'));
  diff('amountOrigin', 'Origine importo', (v) => (v === 'extraction_confirmed' ? 'da documento, confermato' : 'dichiarato da te'));
  diff('objectLink', 'Oggetto', (v) => linkName(v as never));
  diff('workLink', 'Lavoro', (v) => linkName(v as never));
  diff('documentLink', 'Documento', (v) => documentLinkText(v as ExpenseSnapshot['documentLink']));
  return out;
}

function History({ homeId, expenseId, caps }: { homeId: string; expenseId: string; caps?: EconomyCapabilities }) {
  const history = useEconomyExpenseHistory(homeId, expenseId);
  const events = history.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <section className={ui.card} aria-labelledby="costo-storia">
      <h2 id="costo-storia" className={pages.cardTitle}>
        Storia del costo
      </h2>
      {history.isPending ? (
        <Loading label="Caricamento della storia…" />
      ) : history.isError && !history.data ? (
        <ErrorState error={history.error} message={economyErrorMessage(history.error)} onRetry={() => void history.refetch()} retrying={history.isFetching} />
      ) : events.length === 0 ? (
        <p className={pages.muted}>Ancora nessun evento.</p>
      ) : (
        <ol className={act.history}>
          {events.map((e) => (
            <li key={e.id} className={act.event}>
              <strong>{HISTORY_KIND_LABEL[e.kind]}</strong>
              <span className={act.meta}>{formatTimestamp(e.at)}</span>
              {snapshotChanges(e, caps).map((c, i) => (
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
