import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { newIdempotencyKey, queryKeys } from '../api/queryKeys';
import type { ExpenseCapabilities, ExpenseResponse, Home, HomeExpense, UpdateExpense } from '../api/types';
import { Dialog, NoteField } from '../activities/components';
import styles from '../activities/activities.module.css';
import { Banner, Field, cx, ui } from '../components/ui';
import { useDocuments } from '../documents/hooks';
import { formatCalendarDate } from '../lib/activities';
import {
  ORIGIN_LABEL,
  STATE_LABEL,
  assetLinkText,
  centsToInput,
  documentLinkText,
  expenseErrorMessage,
  formatCents,
  isAmbiguous,
  isConflict,
  normalizeNote,
  normalizeText,
  parseAmount,
  validateNote,
  validateSpentOn,
  validateTitle,
} from '../lib/expenses';
import { useAssets } from '../review/hooks';
import { useAccount, useApi } from '../session/session';
import { useExpenseMutation, useRefreshExpenses, type ExpenseMutationVars } from './hooks';
import own from './expenses.module.css';

export { Dialog, NoteField, styles as expenseStyles, own as expenseOwn };

export function expensePath(homeId: string, expenseId?: string) {
  const base = `/home/${encodeURIComponent(homeId)}/spese`;
  return expenseId ? `${base}/${encodeURIComponent(expenseId)}` : base;
}

export function ExpenseRow(props: { expense: HomeExpense; homeId: string; state?: unknown }) {
  const { expense } = props;
  return (
    <li className={styles.item}>
      <div className={styles.itemHead}>
        <Link to={expensePath(props.homeId, expense.id)} state={props.state} className={styles.title}>
          {expense.title}
        </Link>
        <span className={own.amount}>{formatCents(expense.amountCents)}</span>
      </div>
      <span className={styles.meta}>
        {formatCalendarDate(expense.spentOn)} · {ORIGIN_LABEL[expense.origin]}
        {expense.state === 'archived' ? ` · ${STATE_LABEL.archived}` : ''}
        {expense.assetLink.state !== 'none' ? ` · ${assetLinkText(expense.assetLink)}` : ''}
      </span>
    </li>
  );
}

/**
 * Operazione idempotente su una spesa: stessa chiave e stesso payload finché
 * l'esito è ambiguo (riprova esplicita), nuova chiave dopo un esito definitivo.
 * Nessun retry automatico.
 */
type OperationVars = ExpenseMutationVars extends infer V ? (V extends ExpenseMutationVars ? Omit<V, 'idempotencyKey'> : never) : never;

export function useExpenseOperation(homeId: string) {
  const mutation = useExpenseMutation(homeId);
  const [key, setKey] = useState(newIdempotencyKey);
  const [pending, setPending] = useState<OperationVars | null>(null);
  const locked = mutation.isError && isAmbiguous(mutation.error);

  const run = (vars: OperationVars, onSuccess?: (res: ExpenseResponse) => void) => {
    if (mutation.isPending) return;
    setPending(vars);
    mutation.mutate({ ...vars, idempotencyKey: key } as ExpenseMutationVars, {
      onSuccess: (res) => {
        setKey(newIdempotencyKey());
        setPending(null);
        onSuccess?.(res);
      },
      onError: (err) => {
        // Esito noto (4xx): la prossima richiesta è un'operazione nuova.
        if (!isAmbiguous(err)) setKey(newIdempotencyKey());
      },
    });
  };
  /** Ripete esattamente la stessa richiesta (stessa chiave, stesso payload). */
  const retry = (onSuccess?: (res: ExpenseResponse) => void) => {
    if (pending) run(pending, onSuccess);
  };
  const reset = () => {
    mutation.reset();
    setPending(null);
    setKey(newIdempotencyKey());
  };
  return { mutation, run, retry, reset, locked };
}

export function OperationFeedback(props: {
  op: ReturnType<typeof useExpenseOperation>;
  homeId: string;
  title: string;
  onRetry: () => void;
}) {
  const refresh = useRefreshExpenses(props.homeId);
  const { mutation } = props.op;
  if (!mutation.isError) return null;
  if (isAmbiguous(mutation.error)) {
    return (
      <Banner
        tone="error"
        role="alert"
        title="Esito non confermato"
        actions={
          <button type="button" className={cx(ui.btn, ui.small)} onClick={props.onRetry} disabled={mutation.isPending}>
            Riprova invio
          </button>
        }
      >
        <p>
          {expenseErrorMessage(mutation.error)} Non sappiamo se l’operazione è stata salvata: «Riprova invio» ripete la
          stessa richiesta senza duplicarla.
        </p>
      </Banner>
    );
  }
  return (
    <Banner
      tone="warning"
      role="alert"
      title={props.title}
      actions={
        isConflict(mutation.error) && (
          <button
            type="button"
            className={cx(ui.btn, ui.small)}
            onClick={() => {
              props.op.reset();
              void refresh();
            }}
          >
            Rileggi i dati
          </button>
        )
      }
    >
      <p>{expenseErrorMessage(mutation.error)}</p>
    </Banner>
  );
}

/** Riferimento indicato dall'URL: verificato con la lettura autorizzata, mai dedotto. */
function usePresetDocument(homeId: string, documentId: string | null) {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: queryKeys.document(account.id, homeId, documentId ?? '-'),
    queryFn: ({ signal }) => api.getDocument(homeId, documentId!, signal, account.id),
    enabled: !!documentId,
  });
}

function usePresetAsset(homeId: string, assetId: string | null) {
  const api = useApi();
  const account = useAccount();
  return useQuery({
    queryKey: queryKeys.asset(account.id, homeId, assetId ?? '-'),
    queryFn: ({ signal }) => api.getAsset(homeId, assetId!, signal, account.id),
    enabled: !!assetId,
  });
}

const KEEP = '__keep__';

type LinkInitial = { choice: string; name: string | null };

function initialDocument(expense: HomeExpense | undefined): LinkInitial {
  if (!expense) return { choice: '', name: null };
  const l = expense.documentLink;
  return l.state === 'linked' ? { choice: l.document.id, name: l.document.name } : { choice: l.state === 'unavailable' ? KEEP : '', name: null };
}

function initialAsset(expense: HomeExpense | undefined): LinkInitial {
  if (!expense) return { choice: '', name: null };
  const l = expense.assetLink;
  return l.state === 'linked' ? { choice: l.asset.id, name: l.asset.name } : { choice: l.state === 'unavailable' ? KEEP : '', name: null };
}

/**
 * Registrazione/modifica di una spesa personale.
 * - Importo come stringa nel campo, convertito in centesimi interi solo all'invio.
 * - In modifica si inviano solo i campi cambiati; i collegamenti si omettono se non
 *   toccati, null solo con rimozione esplicita. Un collegamento «non più
 *   disponibile» resta tale finché l'utente non sceglie diversamente.
 * - Documento e caldaia scelti fra quelli autorizzati, con tutte le pagine
 *   caricabili; un ID dall'URL è solo una proposta verificata con il server.
 */
export function ExpenseForm(props: {
  home: Home;
  capabilities: ExpenseCapabilities;
  expense?: HomeExpense;
  presetDocumentId?: string | null;
  presetAssetId?: string | null;
  onDone: (res: ExpenseResponse) => void;
  onCancel: () => void;
}) {
  const { home, expense, capabilities } = props;
  const limits = capabilities.limits;
  const id = useId();
  const op = useExpenseOperation(home.id);
  const documents = useDocuments(home.id);
  const assets = useAssets(home.id);
  const presetDoc = usePresetDocument(home.id, expense ? null : (props.presetDocumentId ?? null));
  const presetAsset = usePresetAsset(home.id, expense ? null : (props.presetAssetId ?? null));

  const docInit = initialDocument(expense);
  const assetInit = initialAsset(expense);
  const [title, setTitle] = useState(expense?.title ?? '');
  const [amount, setAmount] = useState(expense ? centsToInput(expense.amountCents) : '');
  const [spentOn, setSpentOn] = useState(expense?.spentOn ?? '');
  const [note, setNote] = useState(expense?.note ?? '');
  const [docChoice, setDocChoice] = useState<string | null>(null);
  const [assetChoice, setAssetChoice] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [nothing, setNothing] = useState(false);
  const disabled = op.mutation.isPending || op.locked;
  // Il pulsante che apre il modulo scompare: il focus va al titolo del modulo, non al body.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // Proposte dall'URL: valgono solo se il server conferma la lettura.
  const presetDocOk = presetDoc.isSuccess && presetDoc.data.permissions.includes('read');
  const presetAssetOk = presetAsset.isSuccess && presetAsset.data.permissions.includes('read');
  const effectiveDoc = docChoice ?? (presetDocOk ? presetDoc.data.id : docInit.choice);
  const effectiveAsset = assetChoice ?? (presetAssetOk ? presetAsset.data.id : assetInit.choice);

  const docItems = (documents.data?.pages.flatMap((p) => p.items) ?? []).filter((d) => d.permissions.includes('read'));
  const boilers = (assets.data?.pages.flatMap((p) => p.items) ?? []).filter((a) => a.permissions.includes('read'));
  const extraDoc =
    presetDocOk && !docItems.some((d) => d.id === presetDoc.data.id)
      ? { id: presetDoc.data.id, name: presetDoc.data.name }
      : docInit.name && !docItems.some((d) => d.id === docInit.choice)
        ? { id: docInit.choice, name: docInit.name }
        : null;
  const extraAsset =
    presetAssetOk && !boilers.some((b) => b.id === presetAsset.data.id)
      ? { id: presetAsset.data.id, name: presetAsset.data.name }
      : assetInit.name && !boilers.some((b) => b.id === assetInit.choice)
        ? { id: assetInit.choice, name: assetInit.name }
        : null;
  const docName = effectiveDoc && effectiveDoc !== KEEP ? (docItems.find((d) => d.id === effectiveDoc)?.name ?? extraDoc?.name ?? null) : null;
  const assetName =
    effectiveAsset && effectiveAsset !== KEEP ? (boilers.find((b) => b.id === effectiveAsset)?.name ?? extraAsset?.name ?? null) : null;

  const submit = () => {
    const parsed = parseAmount(amount, limits.amountMaxCents);
    const errs = {
      title: validateTitle(title, limits.titleMaxCodePoints),
      amount: parsed.error,
      spentOn: validateSpentOn(spentOn, capabilities.today),
      note: validateNote(note, limits.noteMaxCodePoints),
    };
    setErrors(errs);
    setNothing(false);
    const first = (['title', 'amount', 'spentOn', 'note'] as const).find((k) => errs[k]);
    if (first) {
      document.getElementById(`${id}-${first}`)?.focus();
      return;
    }
    const nTitle = normalizeText(title);
    const nNote = normalizeNote(note);
    const cents = parsed.cents!;
    if (!expense) {
      op.run(
        {
          kind: 'create',
          body: {
            title: nTitle,
            amountCents: cents,
            spentOn,
            ...(nNote ? { note: nNote } : {}),
            ...(effectiveDoc ? { documentId: effectiveDoc } : {}),
            ...(effectiveAsset ? { assetId: effectiveAsset } : {}),
          },
        },
        props.onDone,
      );
      return;
    }
    const body: Record<string, unknown> = { expectedVersion: expense.version };
    if (nTitle !== expense.title) body.title = nTitle;
    if (cents !== expense.amountCents) body.amountCents = cents;
    if (spentOn !== expense.spentOn) body.spentOn = spentOn;
    if (nNote !== expense.note) body.note = nNote;
    if (effectiveDoc !== docInit.choice) body.documentId = effectiveDoc === '' ? null : effectiveDoc;
    if (effectiveAsset !== assetInit.choice) body.assetId = effectiveAsset === '' ? null : effectiveAsset;
    if (Object.keys(body).length === 1) {
      setNothing(true);
      return;
    }
    op.run({ kind: 'updates', expenseId: expense.id, body: body as unknown as UpdateExpense }, props.onDone);
  };

  const fieldError = (name: string) =>
    errors[name] ? (
      <span id={`${id}-${name}-error`} className={ui.fieldError}>
        {errors[name]}
      </span>
    ) : null;

  return (
    <form
      className={styles.panel}
      noValidate
      aria-labelledby={`${id}-t`}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h2 id={`${id}-t`} ref={headingRef} tabIndex={-1}>
        {expense ? 'Modifica spesa' : 'Nuova spesa'}
      </h2>
      <p className={styles.meta}>
        Registri un costo che hai sostenuto: visibile solo a te. Non è un pagamento, un incasso o una stima, e non cambia
        documenti o dati della caldaia.
      </p>
      <Field
        id={`${id}-title`}
        label="Titolo"
        name="expenseTitle"
        autoComplete="off"
        value={title}
        disabled={disabled}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
      />
      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${id}-amount`}>
          Importo in euro
        </label>
        <span id={`${id}-amount-hint`} className={ui.hint}>
          Per esempio 1.234,56 oppure 85,5. Centesimi con la virgola.
        </span>
        <input
          id={`${id}-amount`}
          className={ui.input}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          name="amount"
          value={amount}
          disabled={disabled}
          onChange={(e) => setAmount(e.target.value)}
          aria-invalid={errors.amount ? true : undefined}
          aria-describedby={`${id}-amount-hint${errors.amount ? ` ${id}-amount-error` : ''}`}
        />
        {fieldError('amount')}
      </div>
      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${id}-spentOn`}>
          Data della spesa
        </label>
        <input
          id={`${id}-spentOn`}
          className={ui.input}
          type="date"
          max={capabilities.today}
          value={spentOn}
          disabled={disabled}
          onChange={(e) => setSpentOn(e.target.value)}
          aria-invalid={errors.spentOn ? true : undefined}
          aria-describedby={errors.spentOn ? `${id}-spentOn-error` : undefined}
        />
        {fieldError('spentOn')}
      </div>
      <NoteField id={`${id}-note`} value={note} onChange={setNote} error={errors.note} disabled={disabled} label="Nota (facoltativa)" />

      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${id}-doc`}>
          Documento collegato (facoltativo)
        </label>
        <select id={`${id}-doc`} className={styles.select} value={effectiveDoc} disabled={disabled} onChange={(e) => setDocChoice(e.target.value)}>
          {docInit.choice === KEEP && <option value={KEEP}>Mantieni il collegamento attuale (non più disponibile)</option>}
          <option value="">{expense && docInit.choice ? 'Rimuovi il collegamento' : 'Nessun documento'}</option>
          {extraDoc && <option value={extraDoc.id}>{extraDoc.name}</option>}
          {docItems.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        {documents.hasNextPage && (
          <button type="button" className={cx(ui.btn, ui.small)} disabled={disabled || documents.isFetchingNextPage} onClick={() => void documents.fetchNextPage()}>
            {documents.isFetchingNextPage ? 'Caricamento…' : 'Carica altri documenti nell’elenco'}
          </button>
        )}
        {documents.isError && <span className={ui.hint}>I documenti non sono disponibili ora: puoi registrare la spesa senza collegamento.</span>}
      </div>
      {props.presetDocumentId && !expense && presetDoc.isError && (
        <Banner tone="warning">
          <p>Il documento indicato non è leggibile dal tuo account: la spesa non verrà collegata a quel documento.</p>
        </Banner>
      )}

      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${id}-asset`}>
          Caldaia collegata (facoltativa)
        </label>
        <select id={`${id}-asset`} className={styles.select} value={effectiveAsset} disabled={disabled} onChange={(e) => setAssetChoice(e.target.value)}>
          {assetInit.choice === KEEP && <option value={KEEP}>Mantieni il collegamento attuale (non più disponibile)</option>}
          <option value="">{expense && assetInit.choice ? 'Rimuovi il collegamento' : 'Nessuna caldaia'}</option>
          {extraAsset && <option value={extraAsset.id}>{extraAsset.name}</option>}
          {boilers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        {assets.hasNextPage && (
          <button type="button" className={cx(ui.btn, ui.small)} disabled={disabled || assets.isFetchingNextPage} onClick={() => void assets.fetchNextPage()}>
            {assets.isFetchingNextPage ? 'Caricamento…' : 'Carica altre schede nell’elenco'}
          </button>
        )}
        {assets.isError && <span className={ui.hint}>Le schede caldaia non sono disponibili ora: puoi registrare la spesa senza collegamento.</span>}
      </div>
      {props.presetAssetId && !expense && presetAsset.isError && (
        <Banner tone="warning">
          <p>La caldaia indicata non è tra le tue schede: la spesa non verrà collegata.</p>
        </Banner>
      )}

      <p className={styles.destination}>
        Destinazione: <strong>spesa personale</strong> in <strong>{home.name}</strong>
        {effectiveDoc === KEEP ? ', documento attuale non più disponibile' : docName ? `, dal documento «${docName}»` : ', senza documento'}
        {effectiveAsset === KEEP ? ', caldaia attuale non più disponibile' : assetName ? `, per «${assetName}»` : ''}.
        {' '}Il costo resta un solo record, richiamato da documento e caldaia.
      </p>
      {nothing && (
        <Banner role="status">
          <p>Nessuna modifica da salvare.</p>
        </Banner>
      )}
      <OperationFeedback op={op} homeId={home.id} title={expense ? 'Modifica non salvata' : 'Spesa non registrata'} onRetry={() => op.retry(props.onDone)} />
      <div className={styles.actions}>
        {!op.locked && (
          <button type="submit" className={cx(ui.btn, ui.primary)} disabled={op.mutation.isPending}>
            {op.mutation.isPending ? 'Salvataggio…' : expense ? 'Salva modifiche' : 'Registra spesa'}
          </button>
        )}
        <button type="button" className={cx(ui.btn, ui.ghost)} onClick={props.onCancel} disabled={disabled}>
          Annulla
        </button>
      </div>
    </form>
  );
}

export function originText(expense: HomeExpense) {
  return ORIGIN_LABEL[expense.origin];
}

export { documentLinkText, assetLinkText };
