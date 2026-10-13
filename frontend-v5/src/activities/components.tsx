import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { newIdempotencyKey } from '../api/queryKeys';
import type { ActivityResponse, DueState, Home, HomeActivity, UpdateActivity } from '../api/types';
import { Banner, Field, cx, ui } from '../components/ui';
import {
  DUE_LABEL,
  PERSONAL_REMINDER,
  STATE_LABEL,
  activityErrorMessage,
  assetLinkText,
  formatCalendarDate,
  isAmbiguous,
  isConflict,
  normalizeDescription,
  normalizeText,
  validateDescription,
  validateDueDate,
  validateTitle,
} from '../lib/activities';
import { useAssets } from '../review/hooks';
import { useActivityMutation, useRefreshActivities, type ActivityMutationVars } from './hooks';
import styles from './activities.module.css';

export { styles as activityStyles };

const DUE_CLASS: Partial<Record<DueState, string>> = {
  overdue: styles.dueOverdue,
  today: styles.dueToday,
  upcoming: styles.dueUpcoming,
};

/** Stato temporale dal server (dueState), mai calcolato con l'orologio del dispositivo. */
export function DueBadge({ state }: { state: DueState }) {
  return <span className={cx(styles.due, DUE_CLASS[state])}>{DUE_LABEL[state]}</span>;
}

export function dueText(activity: HomeActivity) {
  return activity.dueDate ? `Data scelta da te: ${formatCalendarDate(activity.dueDate)}` : 'Nessuna data scelta';
}

export function ActivityRow({ activity, homeId }: { activity: HomeActivity; homeId: string }) {
  return (
    <li className={styles.item}>
      <div className={styles.itemHead}>
        <DueBadge state={activity.dueState} />
        {activity.state !== 'open' && <span className={styles.due}>{STATE_LABEL[activity.state]}</span>}
        <Link
          to={`/home/${encodeURIComponent(homeId)}/attivita/${encodeURIComponent(activity.id)}`}
          className={styles.title}
        >
          {activity.title}
        </Link>
      </div>
      <span className={styles.meta}>
        {dueText(activity)}
        {activity.assetLink.state !== 'none' ? ` · ${assetLinkText(activity.assetLink)}` : ''}
      </span>
    </li>
  );
}

/**
 * Operazione idempotente su un'attività: stessa chiave e stesso payload finché
 * l'esito è ambiguo (riprova esplicita), nuova chiave dopo un esito definitivo.
 * Nessun retry automatico.
 */
type OperationVars = ActivityMutationVars extends infer V ? (V extends ActivityMutationVars ? Omit<V, 'idempotencyKey'> : never) : never;

export function useActivityOperation(homeId: string) {
  const mutation = useActivityMutation(homeId);
  const [key, setKey] = useState(newIdempotencyKey);
  const [pending, setPending] = useState<OperationVars | null>(null);
  const locked = mutation.isError && isAmbiguous(mutation.error);

  const run = (vars: OperationVars, onSuccess?: (res: ActivityResponse) => void) => {
    if (mutation.isPending) return;
    setPending(vars);
    mutation.mutate({ ...vars, idempotencyKey: key } as ActivityMutationVars, {
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
  const retry = (onSuccess?: (res: ActivityResponse) => void) => {
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
  op: ReturnType<typeof useActivityOperation>;
  homeId: string;
  title: string;
  onRetry: () => void;
}) {
  const refresh = useRefreshActivities(props.homeId);
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
          {activityErrorMessage(mutation.error)} Non sappiamo se la modifica è stata salvata: «Riprova invio» ripete la
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
      <p>{activityErrorMessage(mutation.error)}</p>
    </Banner>
  );
}

/** Finestra di dialogo modale: focus iniziale, Escape per chiudere, focus restituito all'apertura. */
export function Dialog(props: { title: string; onClose: () => void; dismissDisabled?: boolean; children: ReactNode }) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(props.onClose);
  const blocked = useRef(props.dismissDisabled);
  useEffect(() => { close.current = props.onClose; blocked.current = props.dismissDisabled; }, [props.onClose, props.dismissDisabled]);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const focusable = () => [...(ref.current?.querySelectorAll<HTMLElement>('textarea:not([disabled]), input:not([disabled]), select:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])') ?? [])];
    const focusFirst = () => (focusable()[0] ?? ref.current)?.focus();
    focusFirst();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (!blocked.current) close.current();
      } else if (e.key === 'Tab') {
        const elements = focusable(), first = elements[0], last = elements.at(-1);
        if (!first || !ref.current?.contains(document.activeElement) || (e.shiftKey ? document.activeElement === first : document.activeElement === last)) {
          e.preventDefault();
          (e.shiftKey ? last : first)?.focus();
          if (!first) ref.current?.focus();
        }
      }
    };
    const containFocus = (e: FocusEvent) => { if (e.target instanceof Node && !ref.current?.contains(e.target)) focusFirst(); };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', containFocus);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('focusin', containFocus);
      opener?.focus();
    };
  }, []);
  return (
    <div className={styles.backdrop}>
      <div ref={ref} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <h2 id={titleId}>{props.title}</h2>
        {props.children}
      </div>
    </div>
  );
}

export function NoteField(props: { id: string; value: string; onChange: (v: string) => void; error?: string; disabled?: boolean; label?: string }) {
  return (
    <div className={ui.field}>
      <label className={ui.label} htmlFor={props.id}>
        {props.label ?? 'Nota (facoltativa)'}
      </label>
      <textarea
        id={props.id}
        className={styles.textarea}
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.value)}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={props.error ? `${props.id}-error` : undefined}
      />
      {props.error && (
        <span id={`${props.id}-error`} className={ui.fieldError}>
          {props.error}
        </span>
      )}
    </div>
  );
}

const KEEP = '__keep__';

/**
 * Creazione/modifica di un promemoria personale. In modifica si inviano solo i
 * campi cambiati; il collegamento alla caldaia si omette se non toccato, null
 * solo con rimozione esplicita, ID per una nuova scelta. Un collegamento
 * «non più disponibile» resta tale finché l'utente non sceglie diversamente.
 */
export function ActivityForm(props: {
  home: Home;
  activity?: HomeActivity;
  presetAssetId?: string | null;
  limits?: { titleMaxCodePoints: number; descriptionMaxCodePoints: number };
  onDone: (res: ActivityResponse) => void;
  onCancel: () => void;
}) {
  const { home, activity } = props;
  const id = useId();
  const op = useActivityOperation(home.id);
  const assets = useAssets(home.id);
  const boilers = (assets.data?.pages.flatMap((p) => p.items) ?? []).filter((a) => a.permissions.includes('read'));
  const initialAsset = activity
    ? activity.assetLink.state === 'linked'
      ? activity.assetLink.asset.id
      : activity.assetLink.state === 'unavailable'
        ? KEEP
        : ''
    : (props.presetAssetId ?? '');
  const [title, setTitle] = useState(activity?.title ?? '');
  const [description, setDescription] = useState(activity?.description ?? '');
  const [dueDate, setDueDate] = useState(activity?.dueDate ?? '');
  const [assetChoice, setAssetChoice] = useState(initialAsset);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [nothing, setNothing] = useState(false);
  const disabled = op.mutation.isPending || op.locked;

  // Caldaia indicata dall'URL ma non tra le proprie schede: nessuna destinazione implicita.
  const presetMissing =
    !activity && !!props.presetAssetId && assets.isSuccess && !boilers.some((b) => b.id === props.presetAssetId);
  const effectiveAsset = presetMissing && assetChoice === props.presetAssetId ? '' : assetChoice;
  const assetName =
    effectiveAsset === KEEP
      ? null
      : (boilers.find((b) => b.id === effectiveAsset)?.name ??
        (activity?.assetLink.state === 'linked' && activity.assetLink.asset.id === effectiveAsset ? activity.assetLink.asset.name : null));

  const submit = () => {
    const errs = {
      title: validateTitle(title, props.limits?.titleMaxCodePoints),
      description: validateDescription(description, props.limits?.descriptionMaxCodePoints),
      dueDate: validateDueDate(dueDate),
    };
    setErrors(errs);
    setNothing(false);
    if (Object.values(errs).some(Boolean)) {
      document.getElementById(`${id}-${errs.title ? 'title' : errs.description ? 'desc' : 'date'}`)?.focus();
      return;
    }
    const nTitle = normalizeText(title);
    const nDesc = normalizeDescription(description);
    const nDate = dueDate || null;
    if (!activity) {
      op.run(
        {
          kind: 'create',
          body: {
            title: nTitle,
            ...(nDesc ? { description: nDesc } : {}),
            ...(nDate ? { dueDate: nDate } : {}),
            ...(effectiveAsset ? { assetId: effectiveAsset } : {}),
          },
        },
        props.onDone,
      );
      return;
    }
    const body: Record<string, unknown> = { expectedVersion: activity.version };
    if (nTitle !== activity.title) body.title = nTitle;
    if (nDesc !== activity.description) body.description = nDesc;
    if (nDate !== activity.dueDate) body.dueDate = nDate;
    if (effectiveAsset !== initialAsset) body.assetId = effectiveAsset === '' ? null : effectiveAsset;
    if (Object.keys(body).length === 1) {
      setNothing(true);
      return;
    }
    op.run({ kind: 'updates', activityId: activity.id, body: body as unknown as UpdateActivity }, props.onDone);
  };

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
      <h2 id={`${id}-t`} tabIndex={-1}>
        {activity ? 'Modifica attività' : 'Nuova attività'}
      </h2>
      <p className={styles.meta}>
        {PERSONAL_REMINDER}: visibile solo a te. Non è un obbligo né una scadenza di legge, e non cambia i dati della
        caldaia.
      </p>
      <Field
        id={`${id}-title`}
        label="Titolo"
        name="activityTitle"
        value={title}
        disabled={disabled}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
      />
      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${id}-desc`}>
          Descrizione (facoltativa)
        </label>
        <textarea
          id={`${id}-desc`}
          className={styles.textarea}
          value={description}
          disabled={disabled}
          onChange={(e) => setDescription(e.target.value)}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={errors.description ? `${id}-desc-error` : undefined}
        />
        {errors.description && (
          <span id={`${id}-desc-error`} className={ui.fieldError}>
            {errors.description}
          </span>
        )}
      </div>
      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${id}-date`}>
          Data scelta da te (facoltativa)
        </label>
        <div className={styles.dateRow}>
          <input
            id={`${id}-date`}
            className={ui.input}
            type="date"
            value={dueDate}
            disabled={disabled}
            onChange={(e) => setDueDate(e.target.value)}
            aria-invalid={errors.dueDate ? true : undefined}
            aria-describedby={errors.dueDate ? `${id}-date-error` : undefined}
          />
          {dueDate && (
            <button type="button" className={cx(ui.btn, ui.small)} disabled={disabled} onClick={() => setDueDate('')}>
              Togli la data
            </button>
          )}
        </div>
        {errors.dueDate && (
          <span id={`${id}-date-error`} className={ui.fieldError}>
            {errors.dueDate}
          </span>
        )}
      </div>
      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${id}-asset`}>
          Caldaia collegata (facoltativa)
        </label>
        <select
          id={`${id}-asset`}
          className={styles.select}
          value={effectiveAsset}
          disabled={disabled}
          onChange={(e) => setAssetChoice(e.target.value)}
        >
          {initialAsset === KEEP && <option value={KEEP}>Mantieni il collegamento attuale (non più disponibile)</option>}
          <option value="">{activity && initialAsset ? 'Rimuovi il collegamento' : 'Nessuna caldaia'}</option>
          {boilers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
          {/* Collegamento attuale leggibile ma non ancora nell'elenco caricato. */}
          {activity?.assetLink.state === 'linked' && !boilers.some((b) => b.id === initialAsset) && (
            <option value={initialAsset}>{activity.assetLink.asset.name}</option>
          )}
        </select>
        {assets.isError && <span className={ui.hint}>Le schede caldaia non sono disponibili ora: puoi creare il promemoria senza collegamento.</span>}
      </div>
      {presetMissing && (
        <Banner tone="warning">
          <p>La caldaia indicata non è tra le tue schede: il promemoria non verrà collegato.</p>
        </Banner>
      )}
      <p className={styles.destination}>
        Destinazione: <strong>promemoria personale</strong> in <strong>{home.name}</strong>
        {effectiveAsset === KEEP
          ? ', collegamento attuale non più disponibile'
          : assetName
            ? `, collegato a «${assetName}»`
            : ', senza caldaia collegata'}
        .
      </p>
      {nothing && (
        <Banner role="status">
          <p>Nessuna modifica da salvare.</p>
        </Banner>
      )}
      <OperationFeedback op={op} homeId={home.id} title={activity ? 'Modifica non salvata' : 'Attività non creata'} onRetry={() => op.retry(props.onDone)} />
      <div className={styles.actions}>
        {!op.locked && (
          <button type="submit" className={cx(ui.btn, ui.primary)} disabled={op.mutation.isPending}>
            {op.mutation.isPending ? 'Salvataggio…' : activity ? 'Salva modifiche' : 'Crea attività'}
          </button>
        )}
        <button type="button" className={cx(ui.btn, ui.ghost)} onClick={props.onCancel} disabled={disabled}>
          Annulla
        </button>
      </div>
    </form>
  );
}
