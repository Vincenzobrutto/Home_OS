import { useCallback, useEffect, useRef, useState } from 'react';
import {MagnifyingGlass} from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import {X} from '@phosphor-icons/react/dist/csr/X';
import {useAppendPage} from '../lib/useAppendPage';
import {useAccount} from '../session/session';
import {isApiError} from '../api/errors';
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
  { value: 'all', label: 'Tutte' },
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
  const account = useAccount();
  const searchInput = useRef<HTMLInputElement>(null);
  const q = (params.get('q') ?? '').trim().normalize('NFC');
  const [search,setSearch] = useState(q),[basis,setBasis] = useState(q);
  if(basis!==q){setBasis(q);setSearch(q);}
  const summary = useActivitySummary(home.id);
  const creating = params.get('nuova-attivita') === '1';
  const presetAssetId = params.get('assetId');
  const canEdit = home.permissions.includes('edit');
  const state=STATE_OPTIONS.find(o=>o.value===params.get('state'))?.value??'open';
  const filters:ActivityFilters={q,state,due:state==='open'?(DUE_OPTIONS.find(o=>o.value===params.get('due'))?.value??'all'):'all'};
  const commitSearch=useCallback((text:string)=>{
    const next=new URLSearchParams(params),clean=text.trim().normalize('NFC');
    if(clean)next.set('q',clean);else next.delete('q');
    restored.current=true;setParams(next,{replace:true,state:null});
  },[params,setParams]);
  useEffect(()=>{if(search.trim().normalize('NFC')===q)return;const timer=setTimeout(()=>commitSearch(search),300);return()=>clearTimeout(timer);},[search,q,commitSearch]);
  const setFilters=(nextFilters:ActivityFilters)=>{
    const next=new URLSearchParams(params),clean=search.trim().normalize('NFC');
    next.set('state',nextFilters.state);
    if(nextFilters.due==='all')next.delete('due');else next.set('due',nextFilters.due);
    if(clean)next.set('q',clean);else next.delete('q');
    restored.current=true;setParams(next,{state:null});
  };
  const capabilities = useActivityCapabilities(home.id);
  const list = useActivities(home.id, filters);
  const denied=isApiError(list.error)&&list.error.status===403;
  const items = denied ? [] : list.data?.pages.flatMap((p) => p.items) ?? [];
  const append=useAppendPage([account.id,home.id,state,filters.due,q].join(':'),items.map(a=>'activity-'+a.id),list.fetchNextPage);
  const counts=summary.isError?undefined:summary.data?.counts;
  const total=denied?undefined:list.data?.pages[0]?.total??(!q&&state==='open'&&counts?(filters.due==='all'?Object.values(counts).reduce((a,b)=>a+b,0):counts[filters.due]):undefined);
  const clearSearch=()=>{setSearch('');commitSearch('');searchInput.current?.focus();};
  const today = list.data?.pages[0]?.today ?? capabilities.data?.today;
  const filtered = filters.state !== 'open' || filters.due !== 'all';
  const base = `/home/${encodeURIComponent(home.id)}`;

  const {data: activityPages, hasNextPage, isFetchNextPageError, isFetchingNextPage, fetchNextPage} = list;
  useEffect(() => {
    const restore = location.state?.activityRestore;
    if (!restore || restore.url !== location.pathname+location.search || restored.current || !activityPages || denied) return;

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
  }, [location.state, activityPages, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage,denied,location.pathname,location.search]);
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

      <div className="activity-search-filters">
        <form role="search" aria-label="Cerca nelle attività" onSubmit={e=>{e.preventDefault();commitSearch(search);}}>
          <MagnifyingGlass size={20} aria-hidden="true"/>
          <input ref={searchInput} type="search" aria-label="Cerca attività" aria-describedby="activity-search-help" placeholder="Cerca per titolo" autoComplete="off" maxLength={120} value={search} onChange={e=>setSearch(e.target.value)}/>
          {search&&<button type="button" aria-label="Azzera ricerca attività" onClick={clearSearch}><X size={20} aria-hidden="true"/></button>}
          <span id="activity-search-help" className="visually-hidden">Cerca nel titolo, tra tutte le pagine dei filtri scelti.</span>
        </form>
        <label className={styles.filter}>Mostra<select aria-label="Mostra attività" className={styles.select} value={state} onChange={e=>setFilters({state:e.target.value as ActivityFilters['state'],due:'all'})}>{STATE_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
        {state==='open'&&<label className={styles.filter}>Scadenza<select className={styles.select} value={filters.due} onChange={e=>setFilters({state:'open',due:e.target.value as ActivityFilters['due']})}>{DUE_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}{!q&&counts?` (${o.value==='all'?Object.values(counts).reduce((a,b)=>a+b,0):counts[o.value]})`:''}</option>)}</select></label>}
      </div>
      {!q&&summary.isError&&<p role="status">Conteggi non disponibili. Puoi comunque filtrare le attività.</p>}
      <div role="status" className="visually-hidden">{search.trim().normalize('NFC')!==q?'Ricerca in corso…':append.notice?`Aggiunte ${append.notice.added} attività · ${append.notice.total} caricate`:''}</div>
      <h3 id="activity-results" tabIndex={-1} aria-live="polite">{q?'Risultati':state==='open'?(filters.due==='all'?'Attività aperte':DUE_OPTIONS.find(o=>o.value===filters.due)?.label):STATE_OPTIONS.find(o=>o.value===state)?.label}{total!==undefined?` · ${total}${q?' attività':''}`:''}</h3>

      {list.isPending ? (
        <Loading label="Caricamento delle attività…" />
      ) : list.isError && (!list.data || denied) ? (
        <ErrorState
          title="Attività personali non disponibili"
          error={list.error}
          message={activityErrorMessage(list.error)}
          onRetry={denied?undefined:() => void list.refetch()}
          retrying={list.isFetching}
        />
      ) : items.length === 0 ? (
        <p className={pages.muted}>
          {q ? 'Nessuna attività trovata con questi filtri.' : filtered
            ? `Nessuna attività ${filters.state === 'open' ? ({overdue:'scaduta',today:'in scadenza oggi',upcoming:'in programma',undated:'senza data',all:'aperta'}[filters.due]) : filters.state === 'completed' ? 'completata' : filters.state === 'cancelled' ? 'annullata' : 'disponibile'}.`
            : canEdit
              ? 'Nessuna attività aperta. Crea un promemoria con «Nuova attività».'
              : 'Nessuna attività aperta.'}
        </p>
      ) : (
        <ul className={styles.list} aria-label="Elenco delle attività" aria-busy={list.isFetching||search.trim().normalize('NFC')!==q}>
          {items.map((a) => (
            <ActivityRow key={a.id} activity={a} homeId={home.id} returnPages={list.data?.pages.length ?? 1} />
          ))}
        </ul>
      )}
      {q&&items.length===0&&!list.isPending&&!list.isError&&<button type="button" className={ui.btn} onClick={clearSearch}>Azzera ricerca</button>}
      {filtered && <p><button type="button" className={ui.btn} onClick={()=>setFilters({state:'open',due:'all'})}>Mostra tutte le aperte</button></p>}
      <p className={cx(pages.small,pages.muted)}>Promemoria personali, non scadenze di legge.{today ? ` Oggi è ${formatCalendarDate(today)} (Europe/Rome).` : ''}</p>
      {!denied && list.isFetchNextPageError && (
        <ErrorState error={list.error} message={activityErrorMessage(list.error)} title="Altre attività non caricate" onRetry={()=>void append.loadMore()} />
      )}
      {!denied && list.hasNextPage && (
        <p className={pages.spaced}>
          <button type="button" className={ui.btn} onClick={() => void append.loadMore()} disabled={list.isFetchingNextPage}>
            {list.isFetchingNextPage ? 'Caricamento…' : 'Mostra altre attività'}
          </button>
        </p>
      )}
    </section>
  );
}
