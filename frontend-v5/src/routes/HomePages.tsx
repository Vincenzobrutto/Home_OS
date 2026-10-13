import { Fragment } from 'react';
import { Link, Outlet, useOutletContext, useParams } from 'react-router';
import { isApiError } from '../api/errors';
import type { Home, HomePermission } from '../api/types';
import { AppShell, PublicShell, SECTIONS, type SectionId } from '../components/AppShell';
import { Icon } from '../components/Icon';
import { Banner, ErrorState, Loading, Tag, cx, ui, useDocumentTitle } from '../components/ui';
import { useHome } from '../session/hooks';
import { useAccount, useSession } from '../session/session';
import { ROLE_LABEL } from './HomesPages';
import { ScadenzeSummary } from './ScadenzeSummary';
import { BOILER_STATE_LABEL, PERSONAL_LABEL, m3ErrorMessage } from '../lib/review';
import { useAssets, useReview } from '../review/hooks';
import styles from './pages.module.css';

type HomeContext = { home: Home };

export function useCurrentHome() {
  return useOutletContext<HomeContext>().home;
}

/**
 * Contesto casa dall'URL (/home/:homeId/...). Ogni accesso è verificato dal
 * server con GET /homes/:homeId; il frontend non deduce diritti dal routing.
 */
export function HomeLayout() {
  const { homeId = '' } = useParams();
  const account = useAccount();
  const home = useHome(homeId);

  if (home.isPending) {
    return (
      <AppShell account={account}>
        <h1 className="visually-hidden" data-pending="">Casa</h1>
        <Loading label="Caricamento della casa…" />
      </AppShell>
    );
  }

  if (home.isError) {
    const status = isApiError(home.error) && home.error.kind === 'http' ? home.error.status : 0;
    return (
      <AppShell account={account}>
        {status === 403 || status === 404 ? (
          <HomeUnavailable status={status} />
        ) : (
          <>
            <h1 tabIndex={-1}>Casa non disponibile</h1>
            <div className={styles.spaced}>
              <ErrorState error={home.error} onRetry={() => void home.refetch()} retrying={home.isFetching} />
            </div>
          </>
        )}
      </AppShell>
    );
  }

  return (
    <AppShell account={account} home={home.data}>
      {/* Stato locale azzerato al cambio di casa: nessuna bozza passa da una casa all'altra. */}
      <Fragment key={home.data.id}>
        <Outlet context={{ home: home.data } satisfies HomeContext} />
      </Fragment>
    </AppShell>
  );
}

function HomeUnavailable({ status }: { status: number }) {
  useDocumentTitle('Accesso non consentito');
  // 403: nessun dettaglio sulla casa richiesta, nemmeno il nome.
  return (
    <div className={styles.stack}>
      <h1 tabIndex={-1}>{status === 403 ? 'Accesso non consentito' : 'Casa non trovata'}</h1>
      <Banner tone="warning" role="alert">
        <p>
          {status === 403
            ? 'Questo account non ha accesso alla casa richiesta.'
            : 'La casa richiesta non esiste o non è più disponibile.'}
        </p>
      </Banner>
      <p>
        <Link to="/case" className={cx(ui.btn, ui.primary)}>
          Vai alle mie case
        </Link>
      </p>
    </div>
  );
}

const PERMISSION_LABEL: Record<HomePermission, string> = {
  read: 'Consultare la casa',
  edit: 'Modificare i dati della casa',
  manage_members: 'Gestire le persone con accesso',
  export: 'Esportare i dati',
  sell: 'Avviare una vendita',
};

export function CasaPage() {
  const home = useCurrentHome();
  useDocumentTitle(home.name);
  return (
    <>
      <div className={styles.hero}>
        <span className={styles.eyebrow}>Casa</span>
        <h1 tabIndex={-1}>{home.name}</h1>
        <p className={styles.lead}>{home.address}</p>
        <div className={styles.heroMeta}>
          <Tag tone="blue">{ROLE_LABEL[home.role] ?? home.role}</Tag>
        </div>
      </div>
      <div className={styles.grid}>
        <section className={ui.card} aria-labelledby="casa-dati">
          <h2 id="casa-dati" className={styles.cardTitle}>
            Dati della casa
          </h2>
          <dl className={styles.detailList}>
            <dt>Nome</dt>
            <dd>{home.name}</dd>
            <dt>Indirizzo</dt>
            <dd>{home.address}</dd>
            <dt>Il tuo ruolo</dt>
            <dd>{ROLE_LABEL[home.role] ?? home.role}</dd>
          </dl>
          <p className={cx(styles.small, styles.muted, styles.spaced)}>
            L’indirizzo descrive la casa: non è una prova di proprietà.
          </p>
        </section>
        <section className={ui.card} aria-labelledby="casa-permessi">
          <h2 id="casa-permessi" className={styles.cardTitle}>
            Permessi del tuo ruolo
          </h2>
          {home.permissions.length > 0 ? (
            <ul className={styles.list}>
              {home.permissions.map((p) => (
                <li key={p}>{PERMISSION_LABEL[p] ?? p}</li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>Nessun permesso attivo su questa casa.</p>
          )}
          <p className={cx(styles.small, styles.muted, styles.spaced)}>
            I permessi sono verificati dal servizio a ogni operazione. Oggi puoi consultare la casa e, in Documenti,
            caricare ed esportare originali secondo il tuo ruolo, creare schede caldaia e confermare i dati proposti dall’analisi di test; modifica dei dati della casa, gestione accessi e vendita
            arriveranno nei prossimi incrementi.
          </p>
        </section>
        <ScadenzeSummary home={home} />
        <ImpiantiSummary homeId={home.id} />
        <section className={cx(ui.card, ui.tint, styles.wide)} aria-labelledby="casa-prossime">
          <h2 id="casa-prossime" className={styles.cardTitle}>
            Documenti e sezioni in arrivo
          </h2>
          <p className={styles.muted}>
            In Documenti conservi gli originali della casa (PDF, JPEG, PNG).{' '}
            <Link to={`/home/${encodeURIComponent(home.id)}/documenti`}>Apri i documenti</Link>
          </p>
          <p className={cx(styles.muted, styles.spaced)}>
            Spese non è ancora attiva in questa versione: lì non viene mostrato né salvato alcun dato.
          </p>
        </section>
      </div>
    </>
  );
}

export function UnavailableSection({ section }: { section: Exclude<SectionId, 'casa' | 'documenti' | 'attivita'> }) {
  const home = useCurrentHome();
  const meta = SECTIONS.find((s) => s.id === section)!;
  useDocumentTitle(`${meta.label} · ${home.name}`);
  return (
    <>
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>{home.name}</span>
          <h1 tabIndex={-1}>{meta.label}</h1>
        </div>
      </div>
      <div className={cx(ui.card, styles.unavailable)}>
        <Tag tone="warn">
          <Icon name="lock" />
          Non ancora disponibile
        </Tag>
        <p>
          La sezione {meta.label} non è ancora attiva in Dimora V5. Qui non vengono mostrati né salvati dati.
        </p>
        <Link to={`/home/${encodeURIComponent(home.id)}/casa`} className={cx(ui.btn)}>
          Torna a Casa
        </Link>
      </div>
    </>
  );
}

export function SectionNotFound() {
  const home = useCurrentHome();
  useDocumentTitle('Pagina non trovata');
  return (
    <div className={styles.stack}>
      <h1 tabIndex={-1}>Pagina non trovata</h1>
      <p>
        <Link to={`/home/${encodeURIComponent(home.id)}/casa`}>Torna a Casa</Link>
      </p>
    </div>
  );
}

export function NotFoundPage() {
  useDocumentTitle('Pagina non trovata');
  const session = useSession();
  const target = session.data?.account ? '/case' : '/accedi';
  return (
    <PublicShell>
      <div className={styles.authWrap}>
        <h1 tabIndex={-1}>Pagina non trovata</h1>
        <p className={styles.spaced}>
          <Link to={target} className={cx(ui.btn, ui.primary)}>
            {session.data?.account ? 'Vai alle mie case' : 'Vai all’accesso'}
          </Link>
        </p>
      </div>
    </PublicShell>
  );
}

/** Caldaie personali e verifiche aperte: solo dati reali dal server, nessun valore preinserito. */
function ImpiantiSummary({ homeId }: { homeId: string }) {
  const assets = useAssets(homeId);
  const reviewQuery = useReview(homeId);
  const boilers = assets.data?.pages.flatMap((p) => p.items) ?? [];
  const openCount = reviewQuery.data?.pages[0]?.openCount;
  const base = `/home/${encodeURIComponent(homeId)}`;
  return (
    <section className={cx(ui.card, styles.wide)} aria-labelledby="casa-impianti">
      <h2 id="casa-impianti" className={styles.cardTitle}>
        Impianti e verifiche
      </h2>
      {assets.isPending || reviewQuery.isPending ? (
        <Loading label="Caricamento delle schede…" />
      ) : assets.isError || reviewQuery.isError ? (
        <ErrorState
          error={assets.error ?? reviewQuery.error}
          message={m3ErrorMessage(assets.error ?? reviewQuery.error)}
          onRetry={() => {
            void assets.refetch();
            void reviewQuery.refetch();
          }}
          retrying={assets.isFetching || reviewQuery.isFetching}
        />
      ) : (
        <>
          <p>
            <Link to={`${base}/review`}>
              {openCount === 1 ? '1 verifica da rivedere' : `${openCount} verifiche da rivedere`}
            </Link>
          </p>
          {boilers.length === 0 ? (
            <p className={cx(styles.muted, styles.spaced)}>
              Nessuna scheda caldaia. Puoi crearne una da un’analisi di test o a mano in{' '}
              <Link to={`${base}/attivita`}>Attività</Link>.
            </p>
          ) : (
            <ul className={styles.list}>
              {boilers.map((b) => (
                <li key={b.id}>
                  <Link to={`${base}/impianti/${encodeURIComponent(b.id)}`}>{b.name}</Link> — {BOILER_STATE_LABEL[b.state]}
                </li>
              ))}
            </ul>
          )}
          <p className={cx(styles.small, styles.muted, styles.spaced)}>{PERSONAL_LABEL}: ogni scheda è visibile solo a chi l’ha creata.</p>
        </>
      )}
    </section>
  );
}
