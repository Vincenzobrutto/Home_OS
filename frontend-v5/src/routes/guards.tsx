import { Fragment, useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { PublicShell } from '../components/AppShell';
import { ErrorState, Loading } from '../components/ui';
import { safeNextPath } from '../lib/validation';
import { AccountProvider, useAuthSignals, useSession } from '../session/session';
import styles from './pages.module.css';

/**
 * A ogni cambio di rotta (non al primo caricamento) sposta il focus sul titolo
 * della nuova pagina. I titoli provvisori degli stati di caricamento hanno
 * data-pending: si attende il titolo definitivo, per al massimo 5 secondi.
 * Non sottrae il focus a un campo in cui l'utente sta già scrivendo.
 */
export function RootLayout() {
  const location = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const tryFocus = () => {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return true;
      const heading = document.querySelector<HTMLElement>('main h1:not([data-pending])');
      if (!heading) return false;
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus();
      return true;
    };
    if (tryFocus()) return;
    const observer = new MutationObserver(() => {
      if (tryFocus()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = window.setTimeout(() => observer.disconnect(), 5000);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [location.pathname]);
  return <Outlet />;
}

function SessionProblem(props: { error: unknown; onRetry: () => void; retrying: boolean }) {
  return (
    <PublicShell>
      <div className={styles.authWrap}>
        <h1>Dimora non è raggiungibile</h1>
        <ErrorState
          title="Servizio non disponibile"
          error={props.error}
          onRetry={props.onRetry}
          retrying={props.retrying}
        />
      </div>
    </PublicShell>
  );
}

function SessionLoading() {
  return (
    <PublicShell>
      <Loading label="Verifica della sessione…" />
    </PublicShell>
  );
}

/** Rotte private: serve un account. Il routing non autorizza nulla, il server verifica sempre. */
export function RequireAccount() {
  const session = useSession();
  const location = useLocation();
  const signals = useAuthSignals();

  if (session.isPending) return <SessionLoading />;
  if (session.isError && !session.data) {
    return (
      <SessionProblem error={session.error} onRetry={() => void session.refetch()} retrying={session.isFetching} />
    );
  }
  const account = session.data?.account;
  if (!account) {
    // Sessione assente/scaduta: dopo l'accesso si torna qui. Logout esplicito: nessun ritorno.
    // L'ingresso "/" non è una destinazione da ricordare.
    if (signals.explicitLogout || location.pathname === '/') return <Navigate to="/accedi" replace />;
    // La nuova sessione potrebbe appartenere a un altro account: nessuna ricerca o bozza nel ritorno.
    const next = location.pathname;
    return <Navigate to={`/accedi?next=${encodeURIComponent(next)}`} replace />;
  }
  // La chiave per account azzera ogni stato locale (bozze, form) al cambio di account.
  return (
    <AccountProvider account={account}>
      <Fragment key={account.id}>
        <Outlet />
      </Fragment>
    </AccountProvider>
  );
}

/** Rotte per anonimi (accesso, registrazione). */
export function AnonymousOnly() {
  const session = useSession();
  const [params] = useSearchParams();

  if (session.isPending) return <SessionLoading />;
  if (session.isError && !session.data) {
    return (
      <SessionProblem error={session.error} onRetry={() => void session.refetch()} retrying={session.isFetching} />
    );
  }
  if (session.data?.account) {
    return <Navigate to={safeNextPath(params.get('next'))} replace />;
  }
  return <Outlet />;
}
