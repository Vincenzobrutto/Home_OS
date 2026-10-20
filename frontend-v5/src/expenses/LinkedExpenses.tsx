import { Link } from 'react-router';
import type { Home } from '../api/types';
import { ErrorState, Loading, cx, ui } from '../components/ui';
import { isApiError } from '../api/errors';
import { expenseErrorMessage } from '../lib/expenses';
import pages from '../routes/pages.module.css';
import { ExpenseRow, expensePath, expenseStyles as styles } from './components';
import { useExpenses } from './hooks';
import { useEconomyCapabilities, useEconomyExpenses } from '../economy/hooks';
import { billPeriodLabel, isUtility } from '../lib/billPeriod';
import { DEFAULT_FILTERS } from '../lib/economy';

/**
 * Costi collegati a una caldaia o a un documento: la stessa lista server filtrata
 * per riferimento (spese attive di tutti gli anni). Un costo è un solo record:
 * qui compare il riferimento, non una copia, e nessun totale è calcolato sul client.
 */
export function LinkedExpenses(props: {
  home: Home;
  by: { assetId: string } | { documentId: string };
  title: string;
  addLabel: string;
}) {
  const { home } = props;
  const caps = useEconomyCapabilities(home.id);
  const economic = 'documentId' in props.by && !!caps.data;
  const legacy = useExpenses(home.id, { state: 'active', year: null, source: 'all', ...props.by }, !economic && !caps.isPending);
  // Same document filter, across all years: never hide a December bill in January.
  const economy = useEconomyExpenses(home.id, { ...DEFAULT_FILTERS, period: { kind: 'range', from: '0001-01-01', to: '9999-12-31' }, documentId: 'documentId' in props.by ? props.by.documentId : null }, { enabled: economic });
  const list = economic ? economy : legacy;
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const canEdit = home.permissions.includes('edit');
  const param = 'assetId' in props.by ? `assetId=${encodeURIComponent(props.by.assetId)}` : `documentId=${encodeURIComponent(props.by.documentId)}`;
  const notActive = list.isError && isApiError(list.error) && list.error.kind === 'http' && list.error.status === 404;
  const headingId = `costi-${'assetId' in props.by ? 'caldaia' : 'documento'}`;

  return (
    <section className={ui.card} aria-labelledby={headingId}>
      <h2 id={headingId} className={pages.cardTitle}>
        {props.title}
      </h2>
      <p className={cx(pages.small, pages.muted)}>Le tue spese collegate, visibili solo a te. Ogni costo è registrato una sola volta in Spese.</p>
      {list.isPending ? (
        <Loading label="Caricamento dei costi collegati…" />
      ) : notActive ? (
        <p className={pages.muted}>Le spese non sono ancora attive su questo servizio.</p>
      ) : list.isError && !list.data ? (
        <ErrorState
          title="Costi non disponibili"
          error={list.error}
          message={expenseErrorMessage(list.error)}
          onRetry={() => void list.refetch()}
          retrying={list.isFetching}
        />
      ) : (
        <>
          {items.length === 0 ? (
            <p className={pages.muted}>Nessuna spesa attiva collegata.</p>
          ) : (
            <ul className={styles.list} aria-label={props.title}>
              {economic ? economy.data?.pages.flatMap(p => p.items).map(e => (
                <ExpenseRow key={e.id} expense={e} homeId={home.id} referencePeriod={billPeriodLabel(e)} issuedOn={isUtility(e.category) ? e.documentDate : null} />
              )) : items.map(e => <ExpenseRow key={e.id} expense={e} homeId={home.id} />)}
            </ul>
          )}
          {list.hasNextPage && (
            <p className={pages.spaced}>
              <button type="button" className={ui.btn} onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}>
                {list.isFetchingNextPage ? 'Caricamento…' : 'Mostra altri costi'}
              </button>
            </p>
          )}
        </>
      )}
      {canEdit && !notActive && (
        <p className={pages.spaced}>
          <Link to={`${expensePath(home.id)}?nuova-spesa=1&${param}`} className={ui.btn}>
            {props.addLabel}
          </Link>
        </p>
      )}
    </section>
  );
}
