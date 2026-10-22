import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useSearchParams } from 'react-router';
import { isApiError, isUnauthorized, userMessage } from '../api/errors';
import { newIdempotencyKey } from '../api/queryKeys';
import type { DocumentsPage } from '../api/types';
import { Banner, ErrorState, Loading, cx, ui, useDocumentTitle } from '../components/ui';
import { BackToCasa } from '../routes/RoomsPages';
import { useCurrentHome } from '../routes/HomePages';
import { handleUnauthorized } from '../session/queryClient';
import { useAccount, useApi } from '../session/session';
import {
  KIND_LABEL, draftBody, draftFromEntry, emptyDraft, entryHref, formatEventDate, monthName, periodLabel, validateDraft,
  type DraftErrors, type EventDraft, type HistoryEntry, type HistoryLimits, type HistoryPage as Page,
} from './model';
import styles from './history.module.css';

const DEFAULT_LIMITS: HistoryLimits = { titleMaxCodePoints: 120, descriptionMaxCodePoints: 1000, maxDocuments: 5 };

/** BL-03 — storia della casa: cronologia personale con filtro per anno ed eventi inseriti a mano. */
export function HistoryPage() {
  const home = useCurrentHome(), account = useAccount();
  return <HistoryContent key={account.id + ':' + home.id} />;
}

function HistoryContent() {
  const home = useCurrentHome(), account = useAccount(), api = useApi(), cache = useQueryClient();
  useDocumentTitle('Storia della casa · ' + home.name);
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const year = /^\d{4}$/.test(params.get('anno') ?? '') ? params.get('anno')! : null;
  const base = '/homes/' + encodeURIComponent(home.id);
  const prefix = ['account', account.id, 'home', home.id, 'history'] as const;
  const history = useInfiniteQuery({
    queryKey: [...prefix, 'list', year],
    queryFn: ({ pageParam, signal }) => {
      const q = new URLSearchParams(); if (year) q.set('year', year); if (pageParam) q.set('cursor', pageParam);
      return api.callJson<Page>(base + '/history' + (q.size ? '?' + q.toString() : ''), { accountId: account.id, signal });
    },
    initialPageParam: null as string | null, getNextPageParam: p => p.nextCursor, retry: false,
  });
  const first = history.data?.pages[0];
  const items = useMemo(() => history.data?.pages.flatMap(p => p.items) ?? [], [history.data]);
  const canEdit = !!first?.permissions.includes('edit') && home.permissions.includes('edit');
  const limits = first?.limits ?? DEFAULT_LIMITS;
  const today = first?.today ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
  // «Aggiungi alla storia» dal documento: il modulo si apre con il documento già scelto, la data la decidi tu.
  // Nell'indirizzo solo l'id; il nome arriva dallo stato di navigazione (non resta nella cronologia del browser).
  const stateName = (location.state as { historyDocumentName?: unknown } | null)?.historyDocumentName;
  const fromDocument = params.get('documento') && params.get('nuovo') === '1' ? { id: params.get('documento')!, name: typeof stateName === 'string' ? stateName : 'Documento scelto dall’archivio' } : null;
  const [editing, setEditing] = useState<HistoryEntry | 'new' | null>(fromDocument ? 'new' : null);
  const byYear = useMemo(() => items.reduce<Array<{ year: number; entries: HistoryEntry[] }>>((groups, e) => {
    const g = groups.at(-1); if (g && g.year === e.date.year) g.entries.push(e); else groups.push({ year: e.date.year, entries: [e] }); return groups;
  }, []), [items]);
  const setYear = (value: string | null) => setParams(prev => { const next = new URLSearchParams(prev); if (value) next.set('anno', value); else next.delete('anno'); next.delete('nuovo'); next.delete('documento'); return next; });
  const refresh = () => cache.invalidateQueries({ queryKey: prefix });
  const closeForm = () => { setEditing(null); if (fromDocument) setParams(prev => { const next = new URLSearchParams(prev); next.delete('nuovo'); next.delete('documento'); return next; }, { replace: true }); };

  return (
    <div className={styles.page}>
      <BackToCasa homeId={home.id} />
      <header className={styles.header}>
        <div>
          <h1 tabIndex={-1}>Storia della casa</h1>
          <p className={styles.lead}>Gli eventi della casa nel tempo: quelli che inserisci tu, i lavori, i promemoria completati e gli oggetti aggiunti a Dimora. Visibile solo a te.</p>
        </div>
        {canEdit && editing === null && <button type="button" className={cx(ui.btn, ui.primary)} onClick={() => setEditing('new')}>+ Aggiungi un evento</button>}
      </header>
      {editing !== null && (
        <EventForm key={editing === 'new' ? 'new' : editing.id} homeId={home.id} today={today} limits={limits} entry={editing === 'new' ? null : editing}
          initial={editing === 'new' ? emptyDraft(today, fromDocument ? fromDocument.name.replace(/\.[a-z0-9]{2,5}$/i, '') : '', fromDocument ? [fromDocument] : []) : draftFromEntry(editing)}
          onCancel={closeForm} onDone={() => { closeForm(); void refresh(); }} />
      )}
      {first && first.years.length > 0 && (
        <div className={styles.years} role="group" aria-label="Filtra per anno">
          <button type="button" aria-pressed={!year} className={styles.year} onClick={() => setYear(null)}>Tutti · {first.years.reduce((n, y) => n + y.count, 0)}</button>
          {first.years.map(y => <button key={y.year} type="button" aria-pressed={year === String(y.year)} className={styles.year} onClick={() => setYear(String(y.year))}>{y.year} · {y.count}</button>)}
        </div>
      )}
      {history.isPending ? <Loading label="Caricamento della storia…" /> : history.isError ? <ErrorState error={history.error} onRetry={() => void history.refetch()} /> : items.length === 0 ? (
        <section className={cx(ui.card, styles.empty)}>
          <h2>{year ? `Nessun evento nel ${year}` : 'La storia della casa è ancora vuota'}</h2>
          <p>Aggiungi gli eventi che ricordi, anche solo con l’anno: per esempio «2020 — bagno rifatto». Lavori, promemoria completati e oggetti compariranno qui da soli.</p>
        </section>
      ) : (
        <>
          {byYear.map(group => (
            <section key={group.year} className={styles.group} aria-labelledby={`anno-${group.year}`}>
              <h2 id={`anno-${group.year}`}>{group.year}</h2>
              <ol className={styles.list}>{group.entries.map(e => <EntryRow key={e.id} homeId={home.id} entry={e} canEdit={canEdit} onEdit={() => setEditing(e)} onRemoved={() => void refresh()} />)}</ol>
            </section>
          ))}
          {history.hasNextPage && <button type="button" className={ui.btn} disabled={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}>{history.isFetchingNextPage ? 'Caricamento…' : 'Mostra altri eventi'}</button>}
        </>
      )}
    </div>
  );
}

function EntryRow({ homeId, entry, canEdit, onEdit, onRemoved }: { homeId: string; entry: HistoryEntry; canEdit: boolean; onEdit: () => void; onRemoved: () => void }) {
  const href = entryHref(homeId, entry);
  return (
    <li className={styles.entry}>
      <div className={styles.when}>{entry.kind === 'work' && entry.period ? periodLabel(entry.period) : formatEventDate(entry.date)}</div>
      <div className={styles.body}>
        <h3>{href ? <Link to={href}>{entry.title}</Link> : entry.title}</h3>
        <p className={styles.meta}><span className={cx(styles.kind, styles[entry.kind])}>{KIND_LABEL[entry.kind]}</span> {entry.sourceLabel}</p>
        {entry.description && <p className={styles.description}>{entry.description}</p>}
        {entry.documents.length > 0 && (
          <ul className={styles.docs} aria-label="Documenti collegati">
            {entry.documents.map(d => <li key={d.id}><Link to={`/home/${encodeURIComponent(homeId)}/documenti/${encodeURIComponent(d.id)}`}>{d.name}</Link></li>)}
          </ul>
        )}
        {entry.unavailableDocuments > 0 && <p className={styles.meta}>{entry.unavailableDocuments === 1 ? 'Un documento collegato non è più disponibile.' : `${entry.unavailableDocuments} documenti collegati non sono più disponibili.`}</p>}
        {entry.kind === 'manual' && canEdit && <ManualActions homeId={homeId} entry={entry} onEdit={onEdit} onRemoved={onRemoved} />}
      </div>
    </li>
  );
}

/** Richiesta idempotente: una risposta persa si chiarisce ripetendo la stessa chiave, mai con una richiesta nuova. */
function usePendingWrite(homeId: string) {
  const api = useApi(), account = useAccount(), cache = useQueryClient();
  const pending = useRef<{ path: string; body: unknown; key: string } | null>(null);
  const [state, setState] = useState<{ busy: boolean; error: string; uncertain: boolean }>({ busy: false, error: '', uncertain: false });
  async function send(path?: string, body?: unknown) {
    if (!pending.current) { if (!path) return false; pending.current = { path, body, key: newIdempotencyKey() }; }
    setState({ busy: true, error: '', uncertain: false });
    try {
      await api.callJson('/homes/' + encodeURIComponent(homeId) + pending.current.path, { method: 'POST', body: pending.current.body, idempotencyKey: pending.current.key, accountId: account.id });
      pending.current = null; setState({ busy: false, error: '', uncertain: false }); return true;
    } catch (e) {
      if (isUnauthorized(e)) await handleUnauthorized(cache);
      if (isApiError(e) && e.status < 500) { pending.current = null; setState({ busy: false, error: userMessage(e), uncertain: false }); }
      else setState({ busy: false, error: '', uncertain: true });
      return false;
    }
  }
  return { ...state, send, retry: () => send() };
}

function ManualActions({ homeId, entry, onEdit, onRemoved }: { homeId: string; entry: HistoryEntry; onEdit: () => void; onRemoved: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const write = usePendingWrite(homeId);
  const remove = async () => { if (await write.send(`/history/events/${encodeURIComponent(entry.sourceId)}/removal`, { expectedVersion: entry.version })) { setConfirm(false); onRemoved(); } };
  return (
    <div className={styles.actions}>
      {!confirm ? <>
        <button type="button" className={styles.link} onClick={onEdit}>Modifica</button>
        <button type="button" className={styles.link} onClick={() => setConfirm(true)}>Rimuovi</button>
      </> : <div role="group" aria-label="Conferma rimozione" className={styles.confirm}>
        <span>Rimuovere «{entry.title}» dalla storia? I documenti collegati restano nell’archivio.</span>
        <button type="button" className={cx(ui.btn, ui.small)} disabled={write.busy || write.uncertain} onClick={() => void remove()}>Rimuovi dalla storia</button>
        <button type="button" className={cx(ui.btn, ui.small)} disabled={write.busy} onClick={() => setConfirm(false)}>Annulla</button>
      </div>}
      {write.error && <p role="alert" className={styles.error}>{write.error}</p>}
      {write.uncertain && <p role="alert" className={styles.error}>Esito incerto. <button type="button" className={styles.link} onClick={() => void write.retry().then(ok => { if (ok) onRemoved(); })}>Verifica con la stessa richiesta</button></p>}
    </div>
  );
}

function EventForm({ homeId, today, limits, entry, initial, onCancel, onDone }: { homeId: string; today: string; limits: HistoryLimits; entry: HistoryEntry | null; initial: EventDraft; onCancel: () => void; onDone: () => void }) {
  const id = useId();
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<DraftErrors>({});
  const write = usePendingWrite(homeId);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const set = (patch: Partial<EventDraft>) => setDraft(d => ({ ...d, ...patch }));
  const locked = write.busy || write.uncertain;
  const submit = async () => {
    const problems = validateDraft(draft, today, limits); setErrors(problems);
    if (Object.keys(problems).length) { document.getElementById(`${id}-${Object.keys(problems)[0]}`)?.focus(); return; }
    const body = draftBody(draft);
    const ok = entry ? await write.send(`/history/events/${encodeURIComponent(entry.sourceId)}/updates`, { expectedVersion: entry.version, ...body }) : await write.send('/history/events', body);
    if (ok) onDone();
  };
  return (
    <form className={cx(ui.card, styles.form)} noValidate aria-labelledby={`${id}-h`} onSubmit={e => { e.preventDefault(); void submit(); }}>
      <h2 id={`${id}-h`} ref={heading} tabIndex={-1}>{entry ? 'Modifica l’evento' : 'Aggiungi un evento alla storia'}</h2>
      <fieldset disabled={locked} className={styles.fields}>
        <label>Cosa è successo
          <input id={`${id}-title`} className={ui.input} value={draft.title} maxLength={limits.titleMaxCodePoints * 2} placeholder="Per esempio: bagno rifatto" onChange={e => set({ title: e.target.value })} aria-invalid={!!errors.title || undefined} />
        </label>
        {errors.title && <p className={styles.error}>{errors.title}</p>}
        <div role="group" aria-labelledby={`${id}-when`} className={styles.when2}>
          <span id={`${id}-when`} className={styles.legend}>Quando</span>
          <label>Precisione
            <select className={ui.input} value={draft.precision} onChange={e => set({ precision: e.target.value as EventDraft['precision'] })}>
              <option value="year">Solo l’anno</option><option value="month">Mese e anno</option><option value="day">Giorno preciso</option>
            </select>
          </label>
          {draft.precision === 'day' && <label>Giorno<input className={ui.input} inputMode="numeric" value={draft.day} onChange={e => set({ day: e.target.value })} /></label>}
          {draft.precision !== 'year' && <label>Mese<select className={ui.input} value={draft.month} onChange={e => set({ month: e.target.value })}><option value="">Scegli</option>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{monthName(i + 1)}</option>)}</select></label>}
          <label>Anno<input id={`${id}-date`} className={ui.input} inputMode="numeric" value={draft.year} onChange={e => set({ year: e.target.value })} aria-invalid={!!errors.date || undefined} /></label>
          <p className={styles.hint}>Se non ricordi il giorno, lascia solo l’anno: Dimora non inventa date.</p>
        </div>
        {errors.date && <p className={styles.error}>{errors.date}</p>}
        <label>Descrizione (facoltativa)
          <textarea id={`${id}-description`} className={ui.input} rows={3} value={draft.description} onChange={e => set({ description: e.target.value })} />
        </label>
        {errors.description && <p className={styles.error}>{errors.description}</p>}
        <DocumentPicker homeId={homeId} selected={draft.documents} max={limits.maxDocuments} onChange={documents => set({ documents })} />
        {errors.documents && <p id={`${id}-documents`} className={styles.error}>{errors.documents}</p>}
      </fieldset>
      {write.error && <Banner tone="error"><p>{write.error}</p></Banner>}
      {write.uncertain && <Banner tone="warning"><p>Esito incerto: non sappiamo se l’evento è stato salvato.</p><button type="button" className={ui.btn} onClick={() => void write.retry().then(ok => { if (ok) onDone(); })}>Verifica con la stessa richiesta</button></Banner>}
      <div className={styles.formActions}>
        <button type="submit" className={cx(ui.btn, ui.primary)} disabled={locked}>{write.busy ? 'Salvataggio…' : entry ? 'Salva modifiche' : 'Aggiungi alla storia'}</button>
        <button type="button" className={ui.btn} disabled={write.busy} onClick={onCancel}>Annulla</button>
      </div>
    </form>
  );
}

/** Documenti collegati all'evento: ricerca per titolo o nome file tra quelli leggibili, al massimo `max`. */
function DocumentPicker({ homeId, selected, max, onChange }: { homeId: string; selected: Array<{ id: string; name: string }>; max: number; onChange: (next: Array<{ id: string; name: string }>) => void }) {
  const api = useApi(), account = useAccount(), id = useId();
  const [q, setQ] = useState(''), [applied, setApplied] = useState('');
  const results = useQuery({
    queryKey: ['account', account.id, 'home', homeId, 'history', 'document-picker', applied],
    queryFn: ({ signal }) => api.listDocuments(homeId, { limit: 10 }, signal, account.id, { q: applied, format: 'all', visibility: 'all' } as Parameters<typeof api.listDocuments>[4]) as Promise<DocumentsPage>,
    enabled: !!applied, retry: false,
  });
  const chosen = new Set(selected.map(s => s.id));
  return (
    <div className={styles.picker}>
      <span className={styles.legend}>Documenti collegati (facoltativi)</span>
      {selected.length > 0 && <ul className={styles.chosen}>{selected.map(d => <li key={d.id}>{d.name} <button type="button" className={styles.link} aria-label={`Togli ${d.name}`} onClick={() => onChange(selected.filter(x => x.id !== d.id))}>Togli</button></li>)}</ul>}
      {selected.length < max && (
        <div className={styles.search}>
          <label htmlFor={`${id}-q`} className="visually-hidden">Cerca un documento</label>
          <input id={`${id}-q`} className={ui.input} placeholder="Cerca un documento per titolo o nome del file" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setApplied(q.trim()); } }} />
          <button type="button" className={ui.btn} onClick={() => setApplied(q.trim())}>Cerca</button>
        </div>
      )}
      {results.isFetching && <p className={styles.hint}>Ricerca…</p>}
      {results.data && (results.data.items.length ? (
        <ul className={styles.results}>{results.data.items.filter(d => !chosen.has(d.id)).map(d => <li key={d.id}><span>{d.name}</span><button type="button" className={cx(ui.btn, ui.small)} disabled={selected.length >= max} onClick={() => onChange([...selected, { id: d.id, name: d.name }])}>Collega</button></li>)}</ul>
      ) : <p className={styles.hint}>Nessun documento trovato.</p>)}
    </div>
  );
}
