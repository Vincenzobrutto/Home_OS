import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import type { Account, Home } from '../api/types';
import { useLogout } from '../session/hooks';
import { Icon, type IconName } from './Icon';
import { Banner, cx } from './ui';
import styles from './AppShell.module.css';
import { EmailVerificationNotice } from './EmailVerificationNotice';
import { contactNavigationState } from '../contacts/navigation';

export type SectionId = 'casa' | 'attivita' | 'documenti' | 'spese' | 'rubrica';

export const SECTIONS: Array<{ id: SectionId; label: string; icon: IconName; available: boolean }> = [
  { id: 'casa', label: 'Casa', icon: 'home', available: true },
  { id: 'attivita', label: 'Attività', icon: 'activity', available: true },
  { id: 'documenti', label: 'Documenti', icon: 'document', available: true },
  { id: 'spese', label: 'Spese', icon: 'expenses', available: true },
  { id: 'rubrica', label: 'Rubrica', icon: 'contacts', available: true },
];


export function Brand() {
  return (
    <span className={styles.brand}>
      Dimora<span>.</span>
    </span>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.app}>
      <a className={styles.skip} href="#main">
        Vai al contenuto
      </a>
      <header className={styles.top}>
        <Brand />
      </header>
      <div className={styles.layout}>
        <main id="main" className={styles.main} tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell(props: { account: Account; home?: Home; children: ReactNode }) {
  const logout = useLogout();
  const { home } = props;
  return (
    <div className={styles.app}>
      <a className={styles.skip} href="#main">
        Vai al contenuto
      </a>
      <header className={styles.top}>
        <Link to="/case" className={styles.brand} aria-label="Dimora, le mie case">
          Dimora<span>.</span>
        </Link>
        <div className={styles.account}>
          {/* Consegne ricevute: livello account, raggiungibile anche senza case; non è una sezione della casa. */}
          <Link to="/consegne" className={styles.logout}>
            <Icon name="document" />
            <span className={styles.logoutLabel}>Consegne ricevute</span>
          </Link>
          <span className={styles.accountName} title={props.account.email}>
            {props.account.name}
          </span>
          <button
            type="button"
            className={styles.logout}
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            aria-label={logout.isPending ? 'Uscita in corso' : `Esci dall’account ${props.account.name}`}
          >
            <Icon name="logout" />
            <span className={styles.logoutLabel}>{logout.isPending ? 'Uscita…' : 'Esci'}</span>
          </button>
        </div>
      </header>
      <div className={cx(styles.layout, home && styles.withSide)}>
        {home && (
          <aside className={styles.side}>
            <span className={styles.sideTitle} id="side-title">
              La tua casa
            </span>
            <SectionNav home={home} accountId={props.account.id} variant="side" />
            <div className={styles.sideFooter}>
              <strong>{home.name}</strong>
              <Link to="/case">Cambia casa</Link>
            </div>
          </aside>
        )}
        <main id="main" className={styles.main} tabIndex={-1}>
          <div className={styles.mainStack}>
            {logout.isError && (
              <Banner tone="error" role="alert" title="Uscita non completata">
                <p>Il servizio non ha confermato l’uscita: la sessione potrebbe essere ancora attiva. Riprova.</p>
              </Banner>
            )}
            <div>{props.children}</div>
            <EmailVerificationNotice key={props.account.id} />
          </div>
        </main>
      </div>
      {home && <SectionNav home={home} accountId={props.account.id} variant="bottom" />}
    </div>
  );
}

function SectionNav({ home, accountId, variant }: { home: Home; accountId: string; variant: 'side' | 'bottom' }) {
  const location = useLocation();
  const { pathname } = location;
  const section = pathname.split('/')[3];
  const activeSection =
    section === 'review' || section === 'impianti' ? 'attivita' : section === 'ambienti' || section === 'oggetti' ? 'casa' : section;
  const linkClass = variant === 'side' ? styles.sideLink : styles.bottomLink;
  return (
    <nav
      className={variant === 'side' ? styles.sideNav : styles.bottomNav}
      aria-label={`Sezioni di ${home.name}`}
    >
      {SECTIONS.map((s) => (
        <Link
          key={s.id}
          to={`/home/${encodeURIComponent(home.id)}/${s.id}`}
          state={s.id === 'rubrica' ? section === 'rubrica' ? location.state : contactNavigationState(accountId, home.id, location) : undefined}
          className={cx(linkClass, !s.available && styles.unavailableLink)}
          aria-current={activeSection === s.id ? 'page' : undefined}
        >
          <Icon name={s.icon} />
          <span>{s.label}</span>
          {!s.available && (
            <>
              <span className={variant === 'side' ? styles.soon : styles.soonBottom} aria-hidden="true">
                <Icon name="lock" />
              </span>
              <span className="visually-hidden"> (non ancora disponibile)</span>
            </>
          )}
        </Link>
      ))}
    </nav>
  );
}
