import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import type { ActivityFilters, Home } from '../api/types';
import { ActivityForm, ActivityRow, activityStyles as styles } from '../activities/components';
import { useActivities, useActivityCapabilities, useActivitySummary } from '../activities/hooks';
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
 * Scadenze: attività personali H1, separate dalle verifiche AI e dalle analisi.
 * Un errore o un endpoint assente qui non tocca le sezioni M3/M4 della pagina.
 */
export function ActivitiesSection({ home }: { home: Home }) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const restored = useRef(false);
  const summary = useActivitySummary(home.id);
  const creating = params.get('nuova-attivita') === '1';
  const presetAssetId = params.get('assetId');
  const canEdit = home.permissions.includes('edit');
  const state=STATE_OPTIONS.find(o=>o.value===params.get('state'))?.value??'open';
  const filters:ActivityFilters={state,due:state==='open'?(DUE_OPTIONS.find(o=>o.value===params.get('due'))?.value??'all'):'all'};
  const setFilters=(nextFilters:ActivityFilters)=>{const next=new URLSearchParams(params);next.set('state',nextFilters.state);if(nextFilters.due==='all')next.delete('due');else next.set('due',nextFilters.due);setParams(next);};
  const capabilities = useActivityCapabilities(home.id);
  const list = useActivities(home.id, filters);
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const today = list.data?.pages[0]?.today ?? capabilities.data?.today;
  const filtered = filters.state !== 'open' || filters.due !== 'all';
  const base = `/home/${encodeURIComponent(home.id)}`;

  const {data: activityPages, hasNextPage, isFetchNextPageError, isFetchingNextPage, fetchNextPage} = list;
  useEffect(() => {
    const restore = location.state?.activityRestore;
    if (!restore || restored.current || !activityPages) return;

    if (activityPages.pages.length < (restore.pages ?? 1) && hasNextPage && !isFetchNextPageError) {
      if (!isFetchingNextPage) void fetchNextPage();
      return;
    }
    const frame = requestAnimationFrame(() => {
      restored.current = true;
      (document.getElementById('activity-' + restore.id) ?? document.getElementById('activity-results'))?.focus({preventScroll:true});
      window.scrollTo(0, Math.max(0, restore.y));
    });
    return () => cancelAnimationFrame(frame);
  }, [location.state, activityPages, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);
  const closeForm = () => {
    const next = new URLSearchParams(params);
    next.delete('nuova-attivita');
    next.delete('assetId');
    setParams(next, { replace: true });
  };

  return (
    <section className="activity-workspace" aria-labelledby="da-fare-title">
      <h2 id="da-fare-title" className="visually-hidden">Le tue attività</h2>

      {creating && canEdit && (
        <div className={pages.spaced}>
          <ActivityForm
            // Bozza nuova per ogni richiesta di creazione (anche da un'altra scheda caldaia).
            key={presetAssetId ?? '-'}
            home={home}
            presetAssetId={presetAssetId}
            limits={capabilities.data?.limits}
            onCancel={closeForm}
            onDone={(res) => {
              const next = new URLSearchParams(params);
              next.delete('nuova-attivita');
              next.delete('assetId');
              navigate(`${base}/attivita/${encodeURIComponent(res.activity.id)}`, {state:{activityList:{
                url:`${base}/attivita${next.size ? '?' + next.toString() : ''}`,
                y:0, id:res.activity.id, pages:list.data?.pages.length ?? 1,
              }}});
            }}
          />
        </div>
      )}

      <div className="activity-filters" role="group" aria-label="Filtri delle attività">
        {DUE_OPTIONS.map(o => {
          const counts = summary.isError ? undefined : summary.data?.counts;
          const count = !counts ? undefined : o.value === 'all' ? Object.values(counts).reduce((a,b)=>a+b,0) : counts[o.value];
          return <button key={o.value} type="button" className={ui.btn} aria-pressed={filters.state === 'open' && filters.due === o.value} onClick={() => setFilters({state:'open',due:o.value})}>
            {o.value === 'all' ? 'Tutte aperte' : o.label}{' '}{count !== undefined && <span className="activity-count">{count}</span>}
          </button>;
        })}
        <label className={styles.filter}>Storico<select aria-label="Stato" className={styles.select} value={filters.state} onChange={e=>setFilters({state:e.target.value as ActivityFilters['state'],due:'all'})}>{STATE_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.value === 'open' ? 'Aperte' : o.label}</option>)}</select></label>
      </div>
      {summary.isError && <p role="status">Conteggi non disponibili. Puoi comunque filtrare le attività.</p>}
      <h3 id="activity-results" tabIndex={-1} aria-live="polite">{filters.state === 'open' ? (filters.due === 'all' ? 'Tutte le attività aperte' : DUE_OPTIONS.find(o=>o.value===filters.due)?.label) : STATE_OPTIONS.find(o=>o.value===filters.state)?.label}{filters.state === 'open' && !summary.isError && summary.data && <> · {filters.due === 'all' ? Object.values(summary.data.counts).reduce((a,b)=>a+b,0) : summary.data.counts[filters.due]} attività</>}</h3>

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
            ? `Nessuna attività ${filters.state === 'open' ? ({overdue:'scaduta',today:'in scadenza oggi',upcoming:'in programma',undated:'senza data',all:'aperta'}[filters.due]) : filters.state === 'completed' ? 'completata' : filters.state === 'cancelled' ? 'annullata' : 'disponibile'}.`
            : canEdit
              ? 'Nessuna attività aperta. Crea un promemoria con «Nuova attività».'
              : 'Nessuna attività aperta.'}
        </p>
      ) : (
        <ul className={styles.list} aria-label="Elenco delle attività">
          {items.map((a) => (
            <ActivityRow key={a.id} activity={a} homeId={home.id} returnPages={list.data?.pages.length ?? 1} />
          ))}
        </ul>
      )}
      {filtered && <p><button type="button" className={ui.btn} onClick={()=>setFilters({state:'open',due:'all'})}>Mostra tutte le aperte</button></p>}
      <p className={cx(pages.small,pages.muted)}>Promemoria personali, non scadenze di legge.{today ? ` Oggi è ${formatCalendarDate(today)} (Europe/Rome).` : ''}</p>
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
