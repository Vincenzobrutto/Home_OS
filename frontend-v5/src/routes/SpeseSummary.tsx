import { Link } from 'react-router';
import type { Home } from '../api/types';
import { isApiError } from '../api/errors';
import { ErrorState, Loading, cx, ui } from '../components/ui';
import type { ExpenseSummary } from '../api/types';
import { ExpenseRow, expenseOwn as own, expensePath, expenseStyles as styles } from '../expenses/components';
import { useExpenseSummary } from '../expenses/hooks';
import { expenseErrorMessage, formatCents } from '../lib/expenses';
import pages from './pages.module.css';
import casa from './casa.module.css';

/** Casa: riepilogo dell'anno corrente (server) e ultime tre spese; errore mai mostrato come zero. */
export function SpeseSummary({ home,compact=false }: { home: Home;compact?:boolean }) {
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
          {compact?<p aria-label={`Totali del ${data.year}`}><span>Totale registrato</span><br/><strong style={{fontSize:"2rem"}}>{formatCents(data.totalCents)}</strong><br/><span>Costi registrati, non pagamenti</span></p>:<SummaryTotals data={data} />}
          {data.lastItems.length === 0 ? (
            <p className={pages.muted}>Nessuna spesa attiva registrata nel {data.year}.</p>
          ) : (
            <ul className={styles.list} aria-label="Ultime spese">
              {data.lastItems.map((e) => (
                compact?<li className={casa.expenseRow} key={e.id}><Link to={`${expensePath(home.id)}/${encodeURIComponent(e.id)}`}>{e.title}</Link><strong>{formatCents(e.amountCents)}</strong><small>{e.spentOn.split('-').reverse().join('/')}</small></li>:<ExpenseRow key={e.id} expense={e} homeId={home.id} />
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

/** Totali annui H3a: condivisi da Casa e dalla pagina Spese, qui per non portare la pagina Spese nell'entry. */
export function SummaryTotals({ data }: { data: ExpenseSummary }) {
  return (
    <div className={own.totals} aria-label={`Totali del ${data.year}`}>
      <span className={own.total}>
        <span className={own.totalLabel}>Inserite da te ({data.counts.manual})</span>
        <span className={own.totalValue}>{formatCents(data.totalsCents.manual)}</span>
      </span>
      <span className={own.total}>
        <span className={own.totalLabel}>Collegate a un documento ({data.counts.document})</span>
        <span className={own.totalValue}>{formatCents(data.totalsCents.document)}</span>
      </span>
      <span className={cx(own.total, own.combined)}>
        <span className={own.totalLabel}>Totale registrato</span>
        <span className={own.totalValue}>{formatCents(data.totalCents)}</span>
      </span>
    </div>
  );
}
