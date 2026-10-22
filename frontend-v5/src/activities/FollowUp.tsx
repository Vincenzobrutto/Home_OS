import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { ActivityResponse, Home, HomeActivity } from '../api/types';
import { Field, cx, ui } from '../components/ui';
import {
  FOLLOW_UP_MONTHS,
  STATE_LABEL,
  addMonths,
  formatCalendarDate,
  isValidCalendarDate,
  normalizeDescription,
  normalizeText,
  validateDescription,
  validateTitle,
} from '../lib/activities';
import { OperationFeedback, activityStyles as styles, useActivityOperation } from './components';

const activityHref = (homeId: string, id: string) => `/home/${encodeURIComponent(homeId)}/attivita/${encodeURIComponent(id)}`;

/**
 * BL-01: stato del prossimo promemoria. Nessuna ricorrenza automatica: la proposta compare solo su richiesta
 * o subito dopo il completamento, e nulla viene creato finché l'utente non conferma.
 */
export function FollowUpSummary(props: { home: Home; activity: HomeActivity; canEdit: boolean; onPropose: () => void }) {
  const { activity } = props;
  const next = activity.followUp?.next;
  if (activity.state !== 'completed' && !next) return null;
  return (
    <section className={ui.card} aria-labelledby="attivita-prossimo">
      <h2 id="attivita-prossimo" className={styles.followUpTitle}>
        Prossimo promemoria
      </h2>
      {next ? (
        <p>
          <Link to={activityHref(props.home.id, next.id)}>{next.title}</Link>
          <span className={styles.meta}>
            {' · '}
            {next.dueDate ? formatCalendarDate(next.dueDate) : 'senza data'} · {STATE_LABEL[next.state]}
          </span>
        </p>
      ) : props.canEdit ? (
        <>
          <p className={styles.meta}>
            Se va ripetuto, Dimora propone una data a 6, 12 o 24 mesi dal completamento. Nulla viene creato finché non
            confermi.
          </p>
          <div className={styles.actions}>
            <button type="button" className={ui.btn} onClick={props.onPropose}>
              Proponi il prossimo promemoria
            </button>
          </div>
        </>
      ) : (
        <p className={styles.meta}>Nessun prossimo promemoria.</p>
      )}
    </section>
  );
}

export function FollowUpForm(props: {
  home: Home;
  activity: HomeActivity;
  today: string;
  limits?: { titleMaxCodePoints: number; descriptionMaxCodePoints: number };
  onClose: () => void;
  onDone: (res: ActivityResponse) => void;
  /** Solo se aperto dall'utente: subito dopo il completamento il focus resta sullo stato aggiornato. */
  autoFocus?: boolean;
}) {
  const { activity } = props;
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const autoFocus = props.autoFocus;
  useEffect(() => { if (autoFocus) heading.current?.focus(); }, [autoFocus]);
  const op = useActivityOperation(props.home.id);
  // Base della proposta: giorno di completamento (Europe/Rome, dal server), non la scadenza precedente.
  const base = activity.completedOn ?? props.today;
  const [months, setMonths] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [title, setTitle] = useState(activity.title);
  const [description, setDescription] = useState(activity.description ?? '');
  const [copyLinks, setCopyLinks] = useState(true);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const disabled = op.mutation.isPending || op.locked;

  const submit = () => {
    const errs = {
      title: validateTitle(title, props.limits?.titleMaxCodePoints),
      description: validateDescription(description, props.limits?.descriptionMaxCodePoints),
      date: !dueDate
        ? 'Scegli fra 6, 12 o 24 mesi oppure indica una data.'
        : !isValidCalendarDate(dueDate)
          ? 'Inserisci una data valida (giorno, mese e anno).'
          : dueDate < base
            ? 'La data non può precedere il completamento.'
            : undefined,
    };
    setErrors(errs);
    const first = (['date', 'title', 'desc'] as const).find((k) => (k === 'desc' ? errs.description : errs[k]));
    if (first) {
      document.getElementById(`${id}-${first}`)?.focus();
      return;
    }
    op.run(
      {
        kind: 'follow-up',
        activityId: activity.id,
        body: { expectedVersion: activity.version, title: normalizeText(title), description: normalizeDescription(description), dueDate, copyLinks },
      },
      props.onDone,
    );
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
      <h2 id={`${id}-t`} ref={heading} tabIndex={-1}>
        Prossimo promemoria
      </h2>
      <p className={styles.meta}>
        Calcolato dal giorno del completamento ({formatCalendarDate(base)}). Puoi cambiare data, titolo e descrizione; se
        non ti serve, scegli «Non ora» e non viene creato nulla.
      </p>
      <div className={ui.field}>
        <span className={ui.label} id={`${id}-when`}>
          Quando ricordartelo
        </span>
        <div className={styles.choices} role="group" aria-labelledby={`${id}-when`}>
          {FOLLOW_UP_MONTHS.map((n) => (
            <button
              key={n}
              type="button"
              className={cx(ui.btn, ui.small)}
              aria-pressed={months === n}
              disabled={disabled}
              onClick={() => {
                setMonths(n);
                setDueDate(addMonths(base, n));
              }}
            >
              Tra {n} mesi
            </button>
          ))}
        </div>
      </div>
      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${id}-date`}>
          Data del prossimo promemoria
        </label>
        <input
          id={`${id}-date`}
          className={ui.input}
          type="date"
          min={base}
          value={dueDate}
          disabled={disabled}
          onChange={(e) => {
            setDueDate(e.target.value);
            setMonths(FOLLOW_UP_MONTHS.find((n) => addMonths(base, n) === e.target.value) ?? null);
          }}
          aria-invalid={errors.date ? true : undefined}
          aria-describedby={errors.date ? `${id}-date-error` : undefined}
        />
        {errors.date && (
          <span id={`${id}-date-error`} className={ui.fieldError}>
            {errors.date}
          </span>
        )}
      </div>
      <Field id={`${id}-title`} label="Titolo" name="followUpTitle" value={title} disabled={disabled} onChange={(e) => setTitle(e.target.value)} error={errors.title} />
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
      <label className={styles.check}>
        <input type="checkbox" checked={copyLinks} disabled={disabled} onChange={(e) => setCopyLinks(e.target.checked)} />
        Mantieni i collegamenti a oggetti e caldaia ancora disponibili
      </label>
      <OperationFeedback op={op} homeId={props.home.id} title="Promemoria non creato" onRetry={() => op.retry(props.onDone)} />
      <div className={styles.actions}>
        {!op.locked && (
          <button type="submit" className={cx(ui.btn, ui.primary)} disabled={op.mutation.isPending}>
            {op.mutation.isPending ? 'Invio…' : 'Crea il prossimo promemoria'}
          </button>
        )}
        <button type="button" className={cx(ui.btn, ui.ghost)} onClick={props.onClose} disabled={disabled}>
          Non ora
        </button>
      </div>
    </form>
  );
}
