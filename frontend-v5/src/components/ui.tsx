import { useEffect, useId, type ReactNode, type InputHTMLAttributes } from 'react';
import { isApiError, userMessage } from '../api/errors';
import { Icon } from './Icon';
import styles from './ui.module.css';

export { styles as ui };

export function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ');
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Dimora` : 'Dimora';
  }, [title]);
}

export function Banner(props: {
  tone?: 'info' | 'warning' | 'error';
  title?: string;
  children?: ReactNode;
  actions?: ReactNode;
  role?: 'alert' | 'status';
}) {
  const tone = props.tone ?? 'info';
  return (
    <div
      className={cx(
        styles.banner,
        tone === 'warning' && styles.bannerWarning,
        tone === 'error' && styles.bannerError,
      )}
      role={props.role}
    >
      <Icon name={tone === 'info' ? 'info' : 'alert'} />
      <div>
        {props.title && <strong>{props.title}</strong>}
        {props.children}
        {props.actions && <div className={styles.bannerActions}>{props.actions}</div>}
      </div>
    </div>
  );
}

export function Tag(props: { tone?: 'neutral' | 'blue' | 'warn'; children: ReactNode }) {
  return (
    <span
      className={cx(styles.tag, props.tone === 'blue' && styles.tagBlue, props.tone === 'warn' && styles.tagWarn)}
    >
      {props.children}
    </span>
  );
}

export function Loading({ label }: { label: string }) {
  return (
    <div className={styles.status} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

/** Errore di caricamento con retry manuale. Mai sostituito da dati dimostrativi. */
export function ErrorState(props: {
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  title?: string;
  /** Messaggio specifico del contesto; altrimenti quello derivato dall'errore. */
  message?: string;
}) {
  const requestId = isApiError(props.error) ? props.error.requestId : undefined;
  return (
    <Banner
      tone="error"
      role="alert"
      title={props.title ?? 'Impossibile caricare i dati'}
      actions={
        props.onRetry && (
          <button type="button" className={styles.btn} onClick={props.onRetry} disabled={props.retrying}>
            {props.retrying ? 'Nuovo tentativo…' : 'Riprova'}
          </button>
        )
      }
    >
      <p>{props.message ?? userMessage(props.error)}</p>
      {requestId && <p className={styles.requestId}>Codice richiesta: {requestId}</p>}
    </Banner>
  );
}

type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
  trailing?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

export function Field({ label, error, hint, trailing, id, ...input }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const control = (
    <input
      id={inputId}
      className={styles.input}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      {...input}
    />
  );
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      {hint && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}
      {trailing ? (
        <div className={styles.inputRow}>
          {control}
          {trailing}
        </div>
      ) : (
        control
      )}
      {error && (
        <span id={errorId} className={styles.fieldError}>
          {error}
        </span>
      )}
    </div>
  );
}
