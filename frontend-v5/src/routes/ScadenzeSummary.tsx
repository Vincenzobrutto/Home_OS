import { Link } from 'react-router';
import type { Home } from '../api/types';
import { ActivityRow, activityStyles as styles } from '../activities/components';
import { useActivitySummary } from '../activities/hooks';
import { ErrorState, Loading, cx, ui } from '../components/ui';
import { activityErrorMessage } from '../lib/activities';
import pages from './pages.module.css';

/** Casa: «Le tue scadenze» con conteggi e anteprima dal server; errore mai mostrato come zero. */
export function ScadenzeSummary({ home }: { home: Home }) {
  const summary = useActivitySummary(home.id);
  const base = `/home/${encodeURIComponent(home.id)}`;
  const canEdit = home.permissions.includes('edit');
  const data = summary.data;
  if (summary.isSuccess && data && Object.values(data.counts).every(count => count === 0) && data.nextItems.length === 0) {
    return <section className={cx(ui.card, pages.wide, pages.quietSummary)} aria-labelledby="casa-scadenze">
      <h2 id="casa-scadenze" className={pages.cardTitle}>Le tue scadenze</h2>
      <p>Nessuna attività aperta. <Link to={`${base}/attivita`}>Apri attività</Link>{canEdit && <> · <Link to={`${base}/attivita?nuova-attivita=1`}>Nuova attività</Link></>}</p>
    </section>;
  }
  return (
    <section className={cx(ui.card, pages.wide)} aria-labelledby="casa-scadenze">
      <h2 id="casa-scadenze" className={pages.cardTitle}>
        Le tue scadenze
      </h2>
      <p className={cx(pages.small, pages.muted)}>Promemoria personali con la data scelta da te. Non sono obblighi di legge.</p>
      {summary.isPending ? (
        <Loading label="Caricamento delle scadenze…" />
      ) : summary.isError || !data ? (
        <ErrorState
          title="Scadenze non disponibili"
          error={summary.error}
          message={activityErrorMessage(summary.error)}
          onRetry={() => void summary.refetch()}
          retrying={summary.isFetching}
        />
      ) : (
        <>
          <div className={styles.counts} aria-label="Conteggi delle attività aperte">
            <span className={styles.count}>
              <strong>{data.counts.overdue}</strong> scadute
            </span>
            <span className={styles.count}>
              <strong>{data.counts.today}</strong> oggi
            </span>
            <span className={styles.count}>
              <strong>{data.counts.upcoming}</strong> in programma
            </span>
            <span className={styles.count}>
              <strong>{data.counts.undated}</strong> senza data
            </span>
          </div>
          {data.nextItems.length === 0 ? (
            <p className={pages.muted}>
              Nessuna scadenza nei prossimi 7 giorni.
              {data.counts.undated > 0 && (
                <>
                  {' '}
                  {data.counts.undated === 1 ? 'C’è 1 attività senza data' : `Ci sono ${data.counts.undated} attività senza data`}:{' '}
                  <Link to={`${base}/attivita`}>vedi l’elenco</Link>.
                </>
              )}
            </p>
          ) : (
            <ul className={styles.list} aria-label="Prossime scadenze">
              {data.nextItems.map((a) => (
                <ActivityRow key={a.id} activity={a} homeId={home.id} />
              ))}
            </ul>
          )}
          <p className={cx(pages.spaced, styles.actions)}>
            <Link to={`${base}/attivita`} className={ui.btn}>
              Tutte le attività
            </Link>
            {canEdit && (
              <Link to={`${base}/attivita?nuova-attivita=1`} className={ui.btn}>
                Nuova attività
              </Link>
            )}
          </p>
        </>
      )}
    </section>
  );
}
