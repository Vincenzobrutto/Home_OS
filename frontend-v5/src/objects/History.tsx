import type { UseInfiniteQueryResult, InfiniteData } from '@tanstack/react-query';
import type { G1HistoryEvent, Page } from '../api/types';
import styles from '../activities/activities.module.css';
import { ErrorState, Loading, cx, ui } from '../components/ui';
import { formatTimestamp } from '../lib/activities';
import { OBJECT_TYPE_LABEL, ROOM_TYPE_LABEL, UNPLACED_LABEL, objectsErrorMessage } from '../lib/objects';
import pages from '../routes/pages.module.css';

const KIND_LABEL: Record<string, string> = {
  created: 'Creato',
  updated: 'Modificato',
  archived: 'Archiviato',
  restored: 'Ripristinato',
  position: 'Posizione modificata',
  position_updated: 'Posizione modificata',
  linked: 'Collegamento aggiunto',
  link_created: 'Collegamento aggiunto',
  unlinked: 'Collegamento rimosso',
  link_removed: 'Collegamento rimosso',
  manual_updated: 'Manuale collegato o aggiornato',
  profile_updated: 'Dati e garanzia aggiornati',
  onboarding_confirmed: 'Dati e documento confermati',
  manual_removed: 'Collegamento al manuale rimosso',
};

type Snap = Record<string, unknown> | null;

const asSnap = (v: unknown): Snap => (v && typeof v === 'object' ? (v as Record<string, unknown>) : null);

function roomNames(v: unknown) {
  if (!Array.isArray(v)) return null;
  if (v.length === 0) return UNPLACED_LABEL;
  return v.map((r) => (r && typeof r === 'object' && 'name' in r ? String((r as { name: unknown }).name) : 'ambiente')).join(', ');
}

function typeText(v: unknown) {
  return typeof v === 'string' ? (ROOM_TYPE_LABEL[v as keyof typeof ROOM_TYPE_LABEL] ?? OBJECT_TYPE_LABEL[v as keyof typeof OBJECT_TYPE_LABEL] ?? v) : '—';
}

/**
 * Differenze leggibili fra gli snapshot proiettati dal server. Campi sconosciuti
 * vengono ignorati; nessun ID o riferimento redatto viene ricostruito dal client.
 */
export function changeList(e: G1HistoryEvent) {
  const b = asSnap(e.before);
  const a = asSnap(e.after);
  if (!a) return [];
  const out: string[] = [];
  const text = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v));
  if (!b) {
    if (typeof a.name === 'string') out.push(`Nome: ${a.name}`);
    if (a.type !== undefined) out.push(`Tipo: ${typeText(a.type)}`);
    return out;
  }
  if (a.name !== b.name && a.name !== undefined) out.push(`Nome: ${text(b.name)} → ${text(a.name)}`);
  if (a.type !== b.type && a.type !== undefined) out.push(`Tipo: ${typeText(b.type)} → ${typeText(a.type)}`);
  if (a.note !== b.note && 'note' in a) out.push(`Nota: ${text(b.note)} → ${text(a.note)}`);
  if (a.state !== b.state && a.state !== undefined) out.push(`Stato: ${text(b.state) === 'archived' ? 'archiviato' : 'attivo'} → ${a.state === 'archived' ? 'archiviato' : 'attivo'}`);
  const br = roomNames(asSnap(b.position)?.rooms ?? b.rooms);
  const ar = roomNames(asSnap(a.position)?.rooms ?? a.rooms);
  if (ar !== null && ar !== br) out.push(`Posizione: ${br ?? '—'} → ${ar}`);
  return out;
}

export function G1History(props: {
  title: string;
  id: string;
  query: UseInfiniteQueryResult<InfiniteData<Page<G1HistoryEvent>>>;
  note?: string;
}) {
  const { query } = props;
  const events = query.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <section className={ui.card} aria-labelledby={props.id}>
      <h2 id={props.id} className={pages.cardTitle}>
        {props.title}
      </h2>
      {props.note && <p className={cx(pages.small, pages.muted)}>{props.note}</p>}
      {query.isPending ? (
        <Loading label="Caricamento della storia…" />
      ) : query.isError && !query.data ? (
        <ErrorState error={query.error} message={objectsErrorMessage(query.error)} onRetry={() => void query.refetch()} retrying={query.isFetching} />
      ) : events.length === 0 ? (
        <p className={pages.muted}>Ancora nessun evento.</p>
      ) : (
        <ol className={styles.history}>
          {events.map((e) => (
            <li key={e.id} className={styles.event}>
              <strong>{KIND_LABEL[e.kind] ?? 'Modifica'}</strong>
              <span className={styles.meta}>{formatTimestamp(e.at)}</span>
              {changeList(e).map((c, i) => (
                <span key={i}>{c}</span>
              ))}
            </li>
          ))}
        </ol>
      )}
      {query.hasNextPage && (
        <p className={pages.spaced}>
          <button type="button" className={ui.btn} onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
            Mostra eventi precedenti
          </button>
        </p>
      )}
    </section>
  );
}
