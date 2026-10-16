import { useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { isApiError, userMessage } from '../api/errors';
import { PublicShell } from '../components/AppShell';
import { Banner, Field, cx, ui, useDocumentTitle } from '../components/ui';
import { hasErrors, validateLogin, validateRegister, type FieldErrors } from '../lib/validation';
import { useLogin, useRegister } from '../session/hooks';
import { useSession } from '../session/session';
import styles from './pages.module.css';

/** Porta il focus sul primo campo con errore, nell'ordine del form. */
function focusFirstError(form: HTMLFormElement | null, order: string[], errors: Record<string, string | undefined>) {
  const first = order.find((name) => errors[name]);
  if (!first || !form) return;
  form.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
}

/** Errori campo restituiti dal server (422), limitati ai campi del form. */
function serverFieldErrors<K extends string>(error: unknown, fields: readonly K[]): FieldErrors<K> {
  if (!isApiError(error)) return {};
  const out: FieldErrors<K> = {};
  for (const f of fields) {
    const msg = error.fieldErrors[f];
    if (msg) out[f] = msg;
  }
  return out;
}

function PasswordToggle(props: { visible: boolean; onToggle: () => void; controls: string }) {
  return (
    <button
      type="button"
      className={cx(ui.btn, ui.small)}
      onClick={props.onToggle}
      aria-controls={props.controls}
      aria-pressed={props.visible}
    >
      {props.visible ? 'Nascondi' : 'Mostra'}
    </button>
  );
}

const LOGIN_FIELDS = ['email', 'password'] as const;

export function LoginPage() {
  useDocumentTitle('Accedi');
  const [params] = useSearchParams();
  const login = useLogin();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors<'email' | 'password'>>({});
  const [showPassword, setShowPassword] = useState(false);
  const sessionExpired = params.has('next');

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (login.isPending) return;
    const { errors: clientErrors, data } = validateLogin(values);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) {
      focusFirstError(formRef.current, [...LOGIN_FIELDS], clientErrors);
      return;
    }
    login.mutate(data, {
      onError: (error) => {
        const fieldErrors = serverFieldErrors(error, LOGIN_FIELDS);
        setErrors(fieldErrors);
        // Credenziali errate: la password non resta nel campo.
        if (isApiError(error) && error.status === 401) setValues((v) => ({ ...v, password: '' }));
      },
    });
    // In caso di successo la guardia AnonymousOnly porta alla destinazione richiesta.
  };

  const formError = login.isError ? userMessage(login.error) : null;

  return (
    <PublicShell>
      <div className={styles.authWrap}>
        <span className={styles.eyebrow}>Dimora Home</span>
        <h1>Accedi</h1>
        <p className={styles.lead}>Entra per vedere le tue case.</p>
        {sessionExpired && !login.isError && (
          <div className={styles.spaced}>
            <Banner title="Accesso richiesto">
              <p>Accedi per aprire la pagina richiesta.</p>
            </Banner>
          </div>
        )}
        <form ref={formRef} className={styles.form} onSubmit={onSubmit} noValidate aria-describedby={formError ? 'login-error' : undefined}>
          {formError && (
            <div id="login-error">
              <Banner tone="error" role="alert" title="Accesso non riuscito">
                <p>{formError}</p>
              </Banner>
            </div>
          )}
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={values.email}
            onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            error={errors.email}
            required
          />
          <Field
            id="login-password"
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={values.password}
            onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
            error={errors.password}
            required
            trailing={
              <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((s) => !s)} controls="login-password" />
            }
          />
          <div className={styles.formActions}>
            <button type="submit" className={cx(ui.btn, ui.primary)} disabled={login.isPending}>
              {login.isPending ? 'Accesso in corso…' : 'Accedi'}
            </button>
          </div>
        </form>
        <p><Link to="/recupera-accesso" state={{email:values.email}}>Hai dimenticato la password?</Link></p>
        <p className={styles.altLink}>
          Non hai un account? <Link to="/registrati">Crea un account locale di sviluppo</Link>
        </p>
      </div>
    </PublicShell>
  );
}

const REGISTER_FIELDS = ['name', 'email', 'password'] as const;

export function RegisterPage() {
  useDocumentTitle('Crea account');
  const recoveryEnabled = useSession().data?.authRecovery?.enabled === true;
  const register = useRegister();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors<'name' | 'email' | 'password'>>({});
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (register.isPending) return;
    const { errors: clientErrors, data } = validateRegister(values);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) {
      focusFirstError(formRef.current, [...REGISTER_FIELDS], clientErrors);
      return;
    }
    register.mutate(data, {
      onError: (error) => {
        const fieldErrors = serverFieldErrors(error, REGISTER_FIELDS);
        setErrors(fieldErrors);
        if (hasErrors(fieldErrors)) focusFirstError(formRef.current, [...REGISTER_FIELDS], fieldErrors);
      },
    });
  };

  const formError = register.isError ? userMessage(register.error) : null;

  return (
    <PublicShell>
      <div className={styles.authWrap}>
        <span className={styles.eyebrow}>Dimora Home</span>
        <h1>Crea un account</h1>
        <div className={styles.spaced}>
          <Banner tone="warning" title="Solo sviluppo locale">
            <p>
              {recoveryEnabled ? 'Questa registrazione crea un account del pilota locale. Conferma la tua email prima di caricare documenti. Il pilota completo è ancora in preparazione: usa dati sintetici.' : 'Questa registrazione crea un account locale di sviluppo. La verifica dell’email non è ancora attiva: non usare dati personali reali.'}
            </p>
          </Banner>
        </div>
        <form ref={formRef} className={styles.form} onSubmit={onSubmit} noValidate>
          {formError && (
            <Banner tone="error" role="alert" title="Registrazione non completata">
              <p>{formError}</p>
              <p><Link to="/recupera-accesso" state={{email:values.email}}>Se hai già un account, recupera l’accesso</Link></p>
            </Banner>
          )}
          <Field
            label="Nome"
            name="name"
            autoComplete="name"
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            error={errors.name}
            required
          />
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={values.email}
            onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            error={errors.email}
            required
          />
          <Field
            id="register-password"
            label="Password"
            hint="Da 12 a 128 caratteri. Gli spazi contano e non vengono rimossi."
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={values.password}
            onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
            error={errors.password}
            required
            trailing={
              <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((s) => !s)} controls="register-password" />
            }
          />
          <div className={styles.formActions}>
            <button type="submit" className={cx(ui.btn, ui.primary)} disabled={register.isPending}>
              {register.isPending ? 'Creazione in corso…' : 'Crea account'}
            </button>
          </div>
        </form>
        <p className={styles.altLink}>
          Hai già un account? <Link to="/accedi">Accedi</Link>
        </p>
      </div>
    </PublicShell>
  );
}
