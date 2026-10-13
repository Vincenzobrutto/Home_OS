import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { isApiError, userMessage } from '../api/errors';
import { newIdempotencyKey } from '../api/queryKeys';
import type { Home, HomeRole } from '../api/types';
import { AppShell } from '../components/AppShell';
import { Icon } from '../components/Icon';
import { Banner, ErrorState, Field, Loading, Tag, cx, ui, useDocumentTitle } from '../components/ui';
import { hasErrors, validateHome, type FieldErrors } from '../lib/validation';
import { useCreateHome, useHomes } from '../session/hooks';
import { useAccount } from '../session/session';
import styles from './pages.module.css';

export const ROLE_LABEL: Record<HomeRole, string> = {
  owner: 'Proprietario',
  member: 'Membro',
  viewer: 'Sola lettura',
};

export function HomesPage() {
  useDocumentTitle('Le mie case');
  const account = useAccount();
  const homes = useHomes();

  return (
    <AppShell account={account}>
      {homes.isPending ? (
        <>
          <h1 className="visually-hidden" data-pending="">Le mie case</h1>
          <Loading label="Caricamento delle case…" />
        </>
      ) : homes.isError ? (
        <>
          <PageHeading title="Le mie case" />
          {/* Un errore (anche 403) non diventa mai un elenco vuoto. */}
          <ErrorState error={homes.error} onRetry={() => void homes.refetch()} retrying={homes.isFetching} />
        </>
      ) : homes.data.length === 0 ? (
        <Onboarding />
      ) : (
        <HomeChooser homes={homes.data} />
      )}
    </AppShell>
  );
}

function PageHeading(props: { title: string; lead?: string; actions?: ReactNode }) {
  return (
    <div className={styles.heading}>
      <div>
        <span className={styles.eyebrow}>Dimora Home</span>
        <h1 tabIndex={-1}>{props.title}</h1>
        {props.lead && <p className={styles.lead}>{props.lead}</p>}
      </div>
      {props.actions}
    </div>
  );
}

function Onboarding() {
  return (
    <>
      <PageHeading
        title="Crea la tua prima casa"
        lead="Non hai ancora case su Dimora. Inizia con un nome e un indirizzo: potrai completare il resto più avanti."
      />
      <div className={cx(ui.card, styles.formNarrow)}>
        <CreateHomeForm />
      </div>
    </>
  );
}

function HomeChooser({ homes }: { homes: Home[] }) {
  return (
    <>
      <PageHeading
        title="Le mie case"
        lead={homes.length > 1 ? 'Scegli la casa da aprire.' : 'Apri la tua casa o aggiungine un’altra.'}
        actions={
          <Link to="/case/nuova" className={cx(ui.btn, ui.primary)}>
            <Icon name="plus" />
            Aggiungi una casa
          </Link>
        }
      />
      <ul className={styles.homeList} aria-label="Case disponibili">
        {homes.map((home) => (
          <li key={home.id}>
            <Link to={`/home/${encodeURIComponent(home.id)}/casa`} className={styles.homeCard}>
              <h2>{home.name}</h2>
              <p>{home.address}</p>
              <span className={styles.homeCardFooter}>
                <Tag tone="blue">{ROLE_LABEL[home.role] ?? home.role}</Tag>
                <span>
                  Apri <span className="visually-hidden">{home.name}</span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export function CreateHomePage() {
  useDocumentTitle('Nuova casa');
  const account = useAccount();
  return (
    <AppShell account={account}>
      <PageHeading title="Aggiungi una casa" lead="Nome e indirizzo descrivono la casa: non sono una prova di proprietà." />
      <div className={cx(ui.card, styles.formNarrow)}>
        <CreateHomeForm cancelTo="/case" />
      </div>
    </AppShell>
  );
}

const HOME_FIELDS = ['name', 'address'] as const;

/**
 * Creazione casa con Idempotency-Key.
 * La chiave resta la stessa finché la richiesta non va a buon fine: un nuovo
 * tentativo dopo un errore di rete non crea doppioni. Se nel frattempo i dati
 * cambiano e il server risponde 409, il conflitto è mostrato esplicitamente e
 * l'utente decide se inviare una richiesta nuova (nuova chiave).
 * La bozza vive solo in memoria nel componente, legato all'account corrente.
 */
function CreateHomeForm({ cancelTo }: { cancelTo?: string }) {
  const navigate = useNavigate();
  const create = useCreateHome();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState({ name: '', address: '' });
  const [errors, setErrors] = useState<FieldErrors<'name' | 'address'>>({});
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  const submit = (key: string) => {
    const { errors: clientErrors, data } = validateHome(values);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) {
      const first = HOME_FIELDS.find((f) => clientErrors[f]);
      if (first) formRef.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
      return;
    }
    create.mutate(
      { input: data, idempotencyKey: key },
      {
        onSuccess: (home) => {
          navigate(`/home/${encodeURIComponent(home.id)}/casa`);
        },
        onError: (error) => {
          if (isApiError(error)) {
            const fieldErrors: FieldErrors<'name' | 'address'> = {};
            for (const f of HOME_FIELDS) if (error.fieldErrors[f]) fieldErrors[f] = error.fieldErrors[f];
            setErrors(fieldErrors);
          }
        },
      },
    );
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (create.isPending) return;
    submit(idempotencyKey);
  };

  const sendAsNew = () => {
    const key = newIdempotencyKey();
    setIdempotencyKey(key);
    submit(key);
  };

  const error = create.error;
  const isConflict = isApiError(error) && error.kind === 'http' && error.status === 409;
  const isService = isApiError(error) && error.kind === 'service';

  return (
    <form ref={formRef} className={styles.form} onSubmit={onSubmit} noValidate aria-label="Nuova casa">
      {isConflict ? (
        <Banner
          tone="warning"
          role="alert"
          title="Richiesta in conflitto"
          actions={
            <>
              <Link to="/case" className={cx(ui.btn, ui.small)}>
                Controlla le mie case
              </Link>
              <button type="button" className={cx(ui.btn, ui.small)} onClick={sendAsNew}>
                Invia come nuova richiesta
              </button>
            </>
          }
        >
          <p>
            Una richiesta precedente con dati diversi risulta già registrata. Controlla l’elenco delle case prima di
            inviare una nuova richiesta, per non creare un doppione.
          </p>
          {error.message && <p className={styles.small}>{error.message}</p>}
        </Banner>
      ) : isService ? (
        <Banner tone="error" role="alert" title="Esito non confermato">
          <p>
            {userMessage(error)} Non sappiamo se la casa è stata creata: puoi riprovare con lo stesso pulsante, la
            richiesta non verrà duplicata.
          </p>
        </Banner>
      ) : create.isError ? (
        <Banner tone="error" role="alert" title="Casa non creata">
          <p>{userMessage(error)}</p>
        </Banner>
      ) : null}
      <Field
        label="Nome della casa"
        hint="Per esempio «Appartamento via Roma». Massimo 80 caratteri."
        name="name"
        autoComplete="off"
        value={values.name}
        onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
        error={errors.name}
        required
      />
      <Field
        label="Indirizzo"
        hint="Massimo 200 caratteri."
        name="address"
        autoComplete="street-address"
        value={values.address}
        onChange={(e) => setValues((v) => ({ ...v, address: e.target.value }))}
        error={errors.address}
        required
      />
      <div className={styles.formActions}>
        <button type="submit" className={cx(ui.btn, ui.primary)} disabled={create.isPending}>
          {create.isPending ? 'Creazione in corso…' : isService ? 'Riprova' : 'Crea casa'}
        </button>
        {cancelTo && (
          <Link to={cancelTo} className={cx(ui.btn, ui.ghost)}>
            Annulla
          </Link>
        )}
      </div>
    </form>
  );
}
