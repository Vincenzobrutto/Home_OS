import { Link } from 'react-router';
import { isApiError } from '../api/errors';
import { Banner, ErrorState, Loading, cx, ui } from '../components/ui';
import { sharingErrorMessage } from '../lib/sharing';
import { useShares, useSharingCapabilities } from '../sharing/hooks';
import styles from './pages.module.css';

export function CasaSharingSummary({ homeId }: { homeId: string }) {
  const caps = useSharingCapabilities(homeId);
  const notActive = caps.isError && isApiError(caps.error) && caps.error.kind === 'http' && caps.error.status === 404;
  return (
    <section className={cx(ui.card, styles.wide)} aria-labelledby="casa-condivisioni">
      <h2 id="casa-condivisioni" className={styles.cardTitle}>Condivisioni</h2>
      <p className={styles.muted}>Consegna originali scelti da te a una persona precisa, per un periodo limitato, senza darle accesso alla casa.</p>
      {caps.isPending ? <Loading label="Verifica delle condivisioni…" /> : notActive || (caps.isSuccess && !caps.data.enabled) ? (
        <p className={styles.muted}>Le condivisioni non sono attive su questo servizio.</p>
      ) : caps.isError ? (
        <ErrorState error={caps.error} message={sharingErrorMessage(caps.error)} onRetry={() => void caps.refetch()} retrying={caps.isFetching} />
      ) : <SharingAttention homeId={homeId} />}
      <p className={styles.spaced}><Link className={ui.btn} to={`/home/${encodeURIComponent(homeId)}/condivisioni`}>Apri le condivisioni</Link></p>
    </section>
  );
}

function SharingAttention({ homeId }: { homeId: string }) {
  const shares = useShares(homeId, true);
  // Le pagine caricate possono dimostrare una presenza, mai un totale globale o un'assenza.
  const needsConfirmation = !shares.isError && shares.data?.pages.some(page => page.items.some(share => share.permissions.includes('confirm_pairing')));
  if (shares.isPending) return <Loading label="Controllo delle condivisioni…" />;
  if (shares.isError) return <ErrorState error={shares.error} message={sharingErrorMessage(shares.error)} onRetry={() => void shares.refetch()} retrying={shares.isFetching} />;
  return needsConfirmation ? (
    <div className={styles.spaced}>
      <Banner tone="warning" title="Hai condivisioni da confermare">
        <p>Una persona ha inserito il codice. Prima di approvare, confronta il codice di confronto con lei tramite un recapito che conosci già.</p>
      </Banner>
    </div>
  ) : shares.hasNextPage ? <p className={cx(styles.small, styles.muted, styles.spaced)}>Apri l’elenco completo per controllare anche le altre condivisioni.</p> : null;
}
