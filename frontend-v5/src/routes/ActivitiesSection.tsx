import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { ActivityFilters, Home } from '../api/types';
import { ActivityForm, ActivityRow, activityStyles as styles } from '../activities/components';
import { useActivities, useActivityCapabilities } from '../activities/hooks';
import { Icon } from '../components/Icon';
import { ErrorState, Loading, cx, ui } from '../components/ui';
import { activityErrorMessage, formatCalendarDate } from '../lib/activities';
import pages from './pages.module.css';

const STATE_OPTIONS: Array<{ value: ActivityFilters['state']; label: string }> = [
  { value: 'open', label: 'Aperte' },
  { value: 'completed', label: 'Completate' },
  { value: 'cancelled', label: 'Annullate' },
  { value: 'all', label: 'Tutte' },
];

const DUE_OPTIONS: Array<{ value: ActivityFilters['due']; label: string }> = [
  { value: 'all', label: 'Tutte le scadenze' },
  { value: 'overdue', label: 'Scadute' },
  { value: 'today', label: 'Oggi' },
  { value: 'upcoming', label: 'In programma' },
  { value: 'undated', label: 'Senza data' },
];

/**
 * «Da fare»: attività personali H1, separate dalle verifiche AI e dalle analisi.
 * Un errore o un endpoint assente qui non tocca le sezioni M3/M4 della pagina.
 */
export function ActivitiesSection({ home }: { home: Home }) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const creating = params.get('nuova-attivita') === '1';
  const presetAssetId = params.get('assetId');
  const canEdit = home.permissions.includes('edit');
  const [filters, setFilters] = useState<ActivityFilters>({ state: 'open', due: 'all' });
  const capabilities = useActivityCapabilities(home.id);
  const list = useActivities(home.id, filters);
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const today = list.data?.pages[0]?.today ?? capabilities.data?.today;
  const filtered = filters.state !== 'open' || filters.due !== 'all';
  const base = `/home/${encodeURIComponent(home.id)}`;

  const closeForm = () => {
    const next = new URLSearchParams(params);
    next.delete('nuova-attivita');
    next.delete('assetId');
    setParams(next, { replace: true });
  };

  return (
    <section className={ui.card} aria-labelledby="da-fare-title">
      <div className={pages.heading}>
        <div>
          <h2 id="da-fare-title" className={pages.cardTitle}>
            Da fare
          </h2>
          <p className={cx(pages.small, pages.muted)}>
            Le tue attività personali: promemoria scelti da te, visibili solo a te.
            {today ? ` Oggi è ${formatCalendarDate(today)} (Europe/Rome).` : ''}
          </p>
        </div>
        {canEdit && !creating && (
          <button
            type="button"
            className={cx(ui.btn, ui.primary)}
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set('nuova-attivita', '1');
              setParams(next, { replace: true });
            }}
          >
            <Icon name="plus" />
            Nuova attività
          </button>
        )}
      </div>

      {creating && canEdit && (
        <div className={pages.spaced}>
          <ActivityForm
            // Bozza nuova per ogni richiesta di creazione (anche da un'altra scheda caldaia).
            key={presetAssetId ?? '-'}
            home={home}
            presetAssetId={presetAssetId}
            limits={capabilities.data?.limits}
            onCancel={closeForm}
            onDone={(res) => navigate(`${base}/attivita/${encodeURIComponent(res.activity.id)}`)}
          />
        </div>
      )}

      <div className={cx(styles.filters, pages.spaced)} role="group" aria-label="Filtri delle attività">
        <label className={styles.filter}>
          Stato
          <select
            className={styles.select}
            value={filters.state}
            onChange={(e) => {
              const state = e.target.value as ActivityFilters['state'];
              // Il filtro scadenza vale solo per le aperte.
              setFilters({ state, due: state === 'open' ? filters.due : 'all' });
            }}
          >
            {STATE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {filters.state === 'open' && (
          <label className={styles.filter}>
            Scadenza
            <select
              className={styles.select}
              value={filters.due}
              onChange={(e) => setFilters({ ...filters, due: e.target.value as ActivityFilters['due'] })}
            >
              {DUE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {list.isPending ? (
        <Loading label="Caricamento delle attività…" />
      ) : list.isError && !list.data ? (
        <ErrorState
          title="Attività personali non disponibili"
          error={list.error}
          message={activityErrorMessage(list.error)}
          onRetry={() => void list.refetch()}
          retrying={list.isFetching}
        />
      ) : items.length === 0 ? (
        <p className={pages.muted}>
          {filtered
            ? 'Nessuna attività corrisponde a questo filtro.'
            : canEdit
              ? 'Nessuna attività aperta. Crea un promemoria con «Nuova attività».'
              : 'Nessuna attività aperta.'}
        </p>
      ) : (
        <ul className={styles.list} aria-label="Elenco delle attività">
          {items.map((a) => (
            <ActivityRow key={a.id} activity={a} homeId={home.id} />
          ))}
        </ul>
      )}
      {list.isFetchNextPageError && (
        <ErrorState error={list.error} message={activityErrorMessage(list.error)} title="Altre attività non caricate" />
      )}
      {list.hasNextPage && (
        <p className={pages.spaced}>
          <button type="button" className={ui.btn} onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}>
            {list.isFetchingNextPage ? 'Caricamento…' : 'Mostra altre attività'}
          </button>
        </p>
      )}
    </section>
  );
}
