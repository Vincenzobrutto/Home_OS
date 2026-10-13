import { Link } from 'react-router';
import type { Home } from '../api/types';
import { isApiError } from '../api/errors';
import { ErrorState, Loading, cx, ui } from '../components/ui';
import { ExpenseRow, expensePath, expenseStyles as styles } from '../expenses/components';
import { useExpenseSummary } from '../expenses/hooks';
import { expenseErrorMessage } from '../lib/expenses';
import { SummaryTotals } from './ExpensesPage';
import pages from './pages.module.css';

/** Casa: riepilogo dell'anno corrente (server) e ultime tre spese; errore mai mostrato come zero. */
export function SpeseSummary({ home }: { home: Home }) {
  const summary = useExpenseSummary(home.id, null);
  const canEdit = home.permissions.includes('edit');
  const data = summary.data;
  const notActive = summary.isError && isApiError(summary.error) && summary.error.kind === 'http' && summary.error.status === 404;
  return (
    <section className={cx(ui.card, pages.wide)} aria-labelledby="casa-spese">
      <h2 id="casa-spese" className={pages.cardTitle}>
        {data ? `Le tue spese del ${data.year}` : 'Le tue spese'}
      </h2>
      <p className={cx(pages.small, pages.muted)}>Costi registrati da te per questa casa, visibili solo a te.</p>
      {summary.isPending ? (
        <Loading label="Caricamento delle spese…" />
      ) : notActive ? (
        <p className={pages.muted}>Le spese non sono ancora attive su questo servizio: nessun totale è calcolato.</p>
      ) : summary.isError || !data ? (
        <ErrorState
          title="Spese non disponibili"
          error={summary.error}
          message={expenseErrorMessage(summary.error)}
          onRetry={() => void summary.refetch()}
          retrying={summary.isFetching}
        />
      ) : (
        <>
          <SummaryTotals data={data} />
          {data.lastItems.length === 0 ? (
            <p className={pages.muted}>Nessuna spesa attiva registrata nel {data.year}.</p>
          ) : (
            <ul className={styles.list} aria-label="Ultime spese">
              {data.lastItems.map((e) => (
                <ExpenseRow key={e.id} expense={e} homeId={home.id} />
              ))}
            </ul>
          )}
          <p className={cx(pages.spaced, styles.actions)}>
            <Link to={expensePath(home.id)} className={ui.btn}>
              Tutte le spese
            </Link>
            {canEdit && (
              <Link to={`${expensePath(home.id)}?nuova-spesa=1`} className={ui.btn}>
                Aggiungi spesa
              </Link>
            )}
          </p>
        </>
      )}
    </section>
  );
}
