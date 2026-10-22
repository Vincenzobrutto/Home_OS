import {DotsThree} from '@phosphor-icons/react/dist/csr/DotsThree';
import {FieldInfo} from '../components/FieldInfo';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { contextReturn } from '../lib/contextReturn';
import { newIdempotencyKey } from '../api/queryKeys';
import type {
  ActivityCapabilities,
  CatalogItem,
  ExpenseCapabilities,
  G1ResourceType,
  Home,
  LinkedResource,
  ObjectCapabilities,
  ObjectType,
  Room,
  RoomType,
} from '../api/types';
import { ActivityForm, Dialog, NoteField } from '../activities/components';
import { useActivities } from '../activities/hooks';
import styles from '../activities/activities.module.css';
import { Banner, ErrorState, Field, Loading, cx, ui } from '../components/ui';
import { useDocumentSearch, useDocumentSearchCapabilities } from '../documents/hooks';
import { ExpenseForm } from '../expenses/components';
import { useExpenses } from '../expenses/hooks';
import { formatCents } from '../lib/expenses';
import { useAccount } from '../session/session';
import {
  OBJECT_TYPE_LABEL,
  RESOURCE_LABEL,
  ROOM_TYPE_LABEL,
  UNPLACED_LABEL,
  isAmbiguous,
  isConflict,
  normalizeNote,
  normalizeText,
  objectsErrorMessage,
  validateName,
  validateNote,
} from '../lib/objects';
import { useG1Mutation, useObjectLinks, useRefreshObjects, useRooms, type G1MutationVars, type G1Result } from './hooks';
import own from './objects.module.css';

export { styles as objectStyles, own as objectOwn };

/**
 * Operazione idempotente G1: stessa chiave e stesso payload finché l'esito è ambiguo
 * (riprova esplicita), nuova chiave dopo un esito definitivo. Nessun retry automatico.
 */
type OperationVars = G1MutationVars extends infer V ? (V extends G1MutationVars ? Omit<V, 'idempotencyKey'> : never) : never;

export function useG1Operation(homeId: string) {
  const mutation = useG1Mutation(homeId);
  const [key, setKey] = useState(newIdempotencyKey);
  const [pending, setPending] = useState<OperationVars | null>(null);
  const locked = mutation.isError && isAmbiguous(mutation.error);

  const run = (vars: OperationVars, onSuccess?: (res: G1Result) => void) => {
    if (mutation.isPending) return;
    setPending(vars);
    mutation.mutate({ ...vars, idempotencyKey: key } as G1MutationVars, {
      onSuccess: (res) => {
        setKey(newIdempotencyKey());
        setPending(null);
        onSuccess?.(res);
      },
      onError: (err) => {
        if (!isAmbiguous(err)) setKey(newIdempotencyKey());
      },
    });
  };
  const retry = (onSuccess?: (res: G1Result) => void) => {
    if (pending) run(pending, onSuccess);
  };
  const reset = () => {
    mutation.reset();
    setPending(null);
    setKey(newIdempotencyKey());
  };
  return { mutation, run, retry, reset, locked, key };
}

export function G1Feedback(props: { op: ReturnType<typeof useG1Operation>; homeId: string; title: string; onRetry: () => void }) {
  const refresh = useRefreshObjects(props.homeId);
  const { mutation } = props.op;
  if (!mutation.isError) return null;
  if (isAmbiguous(mutation.error)) {
    return (
      <Banner
        tone="error"
        role="alert"
        title="Esito non confermato"
        actions={
          <button type="button" className={cx(ui.btn, ui.small)} onClick={props.onRetry} disabled={mutation.isPending}>
            Riprova invio
          </button>
        }
      >
        <p>{objectsErrorMessage(mutation.error)} «Riprova invio» ripete la stessa richiesta senza duplicarla.</p>
      </Banner>
    );
  }
  return (
    <Banner
      tone="warning"
      role="alert"
      title={props.title}
      actions={
        isConflict(mutation.error) && (
          <button
            type="button"
            className={cx(ui.btn, ui.small)}
            onClick={() => {
              props.op.reset();
              void refresh();
            }}
          >
            Rileggi i dati
          </button>
        )
      }
    >
      <p>{objectsErrorMessage(mutation.error)}</p>
    </Banner>
  );
}

/** Focus al titolo del modulo all'apertura (il pulsante che lo apre scompare). */
function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return ref;
}

export function roomsText(rooms: Room[]) {
  if (rooms.length === 0) return UNPLACED_LABEL;
  return rooms.map((r) => (r.state === 'archived' ? `${r.name} (ambiente archiviato)` : r.name)).join(', ');
}

export function typeLabel(item: Pick<CatalogItem, 'type'>) {
  return OBJECT_TYPE_LABEL[item.type] ?? item.type;
}

// ---------------------------------------------------------------- ambienti

export function RoomForm(props: {
  home: Home;
  capabilities: ObjectCapabilities;
  room?: Room;
  onDone: (room: Room) => void;
  onCancel: () => void;
}) {
  const { home, room, capabilities } = props;
  const id = useId();
  const op = useG1Operation(home.id);
  const heading = useFocusOnMount<HTMLHeadingElement>();
  const [name, setName] = useState(room?.name ?? '');
  const [type, setType] = useState<RoomType>(room?.type ?? capabilities.roomTypes[0] ?? 'other');
  const [note, setNote] = useState(room?.note ?? '');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [nothing, setNothing] = useState(false);
  const disabled = op.mutation.isPending || op.locked;
  const done = (res: G1Result) => 'room' in res && props.onDone(res.room);

  const submit = () => {
    const errs = { name: validateName(name, capabilities.limits.roomNameMaxCodePoints), note: validateNote(note, capabilities.limits.noteMaxCodePoints) };
    setErrors(errs);
    setNothing(false);
    if (errs.name || errs.note) {
      document.getElementById(`${id}-${errs.name ? 'name' : 'note'}`)?.focus();
      return;
    }
    const n = normalizeText(name);
    const nn = normalizeNote(note);
    if (!room) {
      op.run({ kind: 'createRoom', body: { name: n, type, ...(nn ? { note: nn } : {}) } }, done);
      return;
    }
    const body: Record<string, unknown> = { expectedVersion: room.version };
    if (n !== room.name) body.name = n;
    if (type !== room.type) body.type = type;
    if (nn !== room.note) body.note = nn;
    if (Object.keys(body).length === 1) {
      setNothing(true);
      return;
    }
    op.run({ kind: 'roomUpdates', roomId: room.id, body: body as never }, done);
  };

  return (
    <form
      className={styles.panel}
      noValidate
      aria-labelledby={`${id}-t`}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h2 id={`${id}-t`} ref={heading} tabIndex={-1}>
        {room ? 'Modifica ambiente' : 'Nuovo ambiente'}
      </h2>
      <p className={styles.meta}>
        Gli ambienti sono condivisi con chi ha accesso a {home.name}. Raccolgono gli oggetti: documenti e costi restano sugli
        oggetti e sulla casa.
      </p>
      <Field id={`${id}-name`} label="Nome" name="roomName" autoComplete="off" value={name} disabled={disabled} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${id}-type`}>
          Tipo
        </label>
        <select id={`${id}-type`} className={styles.select} value={type} disabled={disabled} onChange={(e) => setType(e.target.value as RoomType)}>
          {capabilities.roomTypes.map((t) => (
            <option key={t} value={t}>
              {ROOM_TYPE_LABEL[t] ?? t}
            </option>
          ))}
        </select>
      </div>
      <NoteField id={`${id}-note`} value={note} onChange={setNote} error={errors.note} disabled={disabled} />
      <p className={styles.destination}>
        Destinazione: <strong>ambiente condiviso</strong> in <strong>{home.name}</strong>.
      </p>
      {nothing && (
        <Banner role="status">
          <p>Nessuna modifica da salvare.</p>
        </Banner>
      )}
      <G1Feedback op={op} homeId={home.id} title={room ? 'Modifica non salvata' : 'Ambiente non creato'} onRetry={() => op.retry(done)} />
      <div className={styles.actions}>
        {!op.locked && (
          <button type="submit" className={cx(ui.btn, ui.primary)} disabled={op.mutation.isPending}>
            {op.mutation.isPending ? 'Salvataggio…' : room ? 'Salva modifiche' : 'Crea ambiente'}
          </button>
        )}
        <button type="button" className={cx(ui.btn, ui.ghost)} onClick={props.onCancel} disabled={disabled}>
          Annulla
        </button>
      </div>
    </form>
  );
}

/**
 * Scelta degli ambienti (posizione). Solo ambienti attivi per nuove assegnazioni; quelli
 * archiviati già assegnati restano, etichettati, e si possono togliere. Tutte le pagine
 * sono caricabili: nessun elenco dato per completo alla prima pagina.
 */
export function RoomChecklist(props: {
  homeId: string;
  selected: string[];
  current?: Room[];
  max: number;
  disabled?: boolean;
  onChange: (ids: string[]) => void;
  legend: string;
}) {
  const rooms = useRooms(props.homeId, { state: 'active' });
  const active = rooms.data?.pages.flatMap((p) => p.items) ?? [];
  const archivedAssigned = (props.current ?? []).filter((r) => r.state === 'archived' && !active.some((a) => a.id === r.id));
  const toggle = (roomId: string) =>
    props.onChange(props.selected.includes(roomId) ? props.selected.filter((x) => x !== roomId) : [...props.selected, roomId]);
  return (
    <fieldset className={own.fieldset} disabled={props.disabled}>
      <legend>{props.legend}</legend>
      <span className={ui.hint}>Facoltativo: senza ambienti l’oggetto resta «{UNPLACED_LABEL}». Al massimo {props.max} ambienti.</span>
      {rooms.isPending ? (
        <Loading label="Caricamento degli ambienti…" />
      ) : rooms.isError && !rooms.data ? (
        <ErrorState title="Ambienti non disponibili" error={rooms.error} message={objectsErrorMessage(rooms.error)} onRetry={() => void rooms.refetch()} retrying={rooms.isFetching} />
      ) : active.length === 0 && archivedAssigned.length === 0 ? (
        <p className={styles.meta}>Non ci sono ancora ambienti attivi in questa casa.</p>
      ) : (
        <ul className={own.checklist}>
          {archivedAssigned.map((r) => (
            <li key={r.id}>
              <label className={own.check}>
                <input type="checkbox" checked={props.selected.includes(r.id)} onChange={() => toggle(r.id)} />
                {r.name} (ambiente archiviato)
              </label>
            </li>
          ))}
          {active.map((r) => (
            <li key={r.id}>
              <label className={own.check}>
                <input type="checkbox" checked={props.selected.includes(r.id)} onChange={() => toggle(r.id)} />
                {r.name} · {ROOM_TYPE_LABEL[r.type] ?? r.type}
              </label>
            </li>
          ))}
        </ul>
      )}
      {rooms.hasNextPage && (
        <button type="button" className={cx(ui.btn, ui.small)} onClick={() => void rooms.fetchNextPage()} disabled={rooms.isFetchingNextPage}>
          {rooms.isFetchingNextPage ? 'Caricamento…' : 'Carica altri ambienti'}
        </button>
      )}
    </fieldset>
  );
}

// ---------------------------------------------------------------- oggetti

/** Oggetto manuale: nome, tipo, note; alla creazione anche la posizione (unico POST atomico). */
export function ObjectForm(props: {
  home: Home;
  capabilities: ObjectCapabilities;
  object?: CatalogItem;
  presetRoomId?: string | null;
  onDone: (object: CatalogItem) => void;
  onCancel: () => void;
}) {
  const { home, object, capabilities } = props;
  const id = useId();
  const op = useG1Operation(home.id);
  const heading = useFocusOnMount<HTMLHeadingElement>();
  const [name, setName] = useState(object?.name ?? '');
  const [type, setType] = useState<ObjectType>((object?.type as ObjectType) ?? capabilities.types[0] ?? 'other');
  const [note, setNote] = useState(object?.note ?? '');
  const [roomIds, setRoomIds] = useState<string[]>(props.presetRoomId ? [props.presetRoomId] : []);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [nothing, setNothing] = useState(false);
  const disabled = op.mutation.isPending || op.locked;
  const max = capabilities.limits.maxRoomsPerObject;
  const done = (res: G1Result) => 'object' in res && props.onDone(res.object);

  const submit = () => {
    const errs = {
      name: validateName(name, capabilities.limits.nameMaxCodePoints),
      note: validateNote(note, capabilities.limits.noteMaxCodePoints),
      rooms: roomIds.length > max ? `Al massimo ${max} ambienti.` : undefined,
    };
    setErrors(errs);
    setNothing(false);
    if (errs.name || errs.note || errs.rooms) {
      if (errs.name || errs.note) document.getElementById(`${id}-${errs.name ? 'name' : 'note'}`)?.focus();
      return;
    }
    const n = normalizeText(name);
    const nn = normalizeNote(note);
    if (!object) {
      op.run({ kind: 'createObject', body: { name: n, type, ...(nn ? { note: nn } : {}), ...(roomIds.length ? { roomIds } : {}) } }, done);
      return;
    }
    const body: Record<string, unknown> = { expectedVersion: object.version };
    if (n !== object.name) body.name = n;
    if (type !== object.type) body.type = type;
    if (nn !== (object.note ?? null)) body.note = nn;
    if (Object.keys(body).length === 1) {
      setNothing(true);
      return;
    }
    op.run({ kind: 'objectUpdates', ref: object.ref, body: body as never }, done);
  };

  return (
    <form
      className={styles.panel}
      noValidate
      aria-labelledby={`${id}-t`}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h2 id={`${id}-t`} ref={heading} tabIndex={-1}>
        {object ? 'Modifica oggetto' : 'Nuovo oggetto'}
      </h2>
      <p className={styles.meta}>Oggetto personale: visibile solo a te in {home.name}. Non è una scheda tecnica né un dato verificato.</p>
      <Field id={`${id}-name`} label="Nome" name="objectName" autoComplete="off" value={name} disabled={disabled} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${id}-type`}>
          Tipo
        </label>
        <select id={`${id}-type`} className={styles.select} value={type} disabled={disabled} onChange={(e) => setType(e.target.value as ObjectType)}>
          {capabilities.types.map((t) => (
            <option key={t} value={t}>
              {OBJECT_TYPE_LABEL[t] ?? t}
            </option>
          ))}
        </select>
        {type === 'heating' && <span className={ui.hint}>Un oggetto «Riscaldamento» manuale non contiene dati di caldaia verificati né avvia analisi.</span>}
      </div>
      <NoteField id={`${id}-note`} value={note} onChange={setNote} error={errors.note} disabled={disabled} />
      {!object && (
        <>
          <RoomChecklist homeId={home.id} selected={roomIds} max={max} disabled={disabled} onChange={setRoomIds} legend="Dove si trova" />
          {errors.rooms && <span className={ui.fieldError}>{errors.rooms}</span>}
        </>
      )}
      {nothing && (
        <Banner role="status">
          <p>Nessuna modifica da salvare.</p>
        </Banner>
      )}
      <G1Feedback op={op} homeId={home.id} title={object ? 'Modifica non salvata' : 'Oggetto non creato'} onRetry={() => op.retry(done)} />
      <div className={styles.actions}>
        {!op.locked && (
          <button type="submit" className={cx(ui.btn, ui.primary)} disabled={op.mutation.isPending}>
            {op.mutation.isPending ? 'Salvataggio…' : object ? 'Salva modifiche' : 'Crea oggetto'}
          </button>
        )}
        <button type="button" className={cx(ui.btn, ui.ghost)} onClick={props.onCancel} disabled={disabled}>
          Annulla
        </button>
      </div>
    </form>
  );
}

/** Modifica posizione con CAS (versione 0 = mai impostata); array vuoto = «Da collocare». */
/** Scelta rapida di un ambiente; gli oggetti multiambiente restano espliciti. */
export function QuickPlacement({home,object,onMultiple,focus=false}:{home:Home;object:CatalogItem;onMultiple:()=>void;focus?:boolean}) {
  const id=useId(),rooms=useRooms(home.id,{state:'active'}),op=useG1Operation(home.id);
  const current=object.position.rooms,initial=current.length>1?'multiple':current[0]?.id??'';
  const [selected,setSelected]=useState(initial);
  const selectRef=useRef<HTMLSelectElement>(null);
  useEffect(()=>{if(focus)selectRef.current?.focus();},[focus]);
  const available=rooms.isError?[]:rooms.data?.pages.flatMap(p=>p.items)??[];
  const retained=current.filter(r=>!available.some(a=>a.id===r.id));
  const dirty=selected!==initial,disabled=op.mutation.isPending||op.locked||rooms.isPending||rooms.isError;
  return <form className={own.quickPlacement} aria-label="Collocazione dell’oggetto" onSubmit={e=>{
    e.preventDefault();if(!dirty||disabled||selected==='multiple')return;
    op.run({kind:'position',ref:object.ref,body:{expectedVersion:object.position.version,roomIds:selected?[selected]:[]}});
  }}>
    {focus&&<p role="status">Posizione aggiornata.</p>}
    <div className={own.currentRooms} aria-label="Collocazione attuale"><span>Dove si trova</span>{current.length?current.map(room=><span key={room.id} className={own.roomChip}>{roomsText([room])}</span>):<span className={own.roomChip}>Da collocare</span>}</div>
    <label htmlFor={`${id}-room`}>Stanza</label>
    <div className={styles.actions}>
      <select ref={selectRef} id={`${id}-room`} value={selected} onChange={e=>setSelected(e.target.value)} disabled={disabled||(!available.length&&!current.length)} aria-describedby={`${id}-hint`}>
        <option value="">Da collocare</option>
        {initial==='multiple'&&<option value="multiple" disabled>Più ambienti ({current.length})</option>}
        {!rooms.isError&&retained.map(r=><option key={r.id} value={r.id} disabled>{roomsText([r])}</option>)}
        {available.map(r=><option key={r.id} value={r.id}>{r.name} · {ROOM_TYPE_LABEL[r.type]??r.type}</option>)}
      </select>
      {dirty&&!op.locked&&<button className={cx(ui.btn,ui.primary)} type="submit" disabled={disabled}>{op.mutation.isPending?'Salvataggio…':'Salva stanza'}</button>}
      <button type="button" className={ui.btn} disabled={op.mutation.isPending||op.locked} onClick={onMultiple}>Più ambienti</button>
    </div>
    <p id={`${id}-hint`} className={ui.hint}>{initial==='multiple'?'Scegliendo una stanza sostituisci gli ambienti attuali. Usa «Più ambienti» per mantenerne più di uno.':dirty?'La nuova stanza non è ancora salvata. Premi «Salva stanza» per confermare.':'Scegli una stanza per spostare l’oggetto. «Più ambienti» permette di collegarne diversi.'}</p>
    {rooms.isPending&&<Loading label="Caricamento delle stanze…"/>}
    {rooms.isError&&<ErrorState title="Stanze non disponibili" error={rooms.error} onRetry={()=>void rooms.refetch()}/>}
    {!rooms.isPending&&!rooms.isError&&!available.length&&<p>Non ci sono ancora stanze attive. Crea o conferma gli ambienti della casa per trovarli qui.</p>}
    <Link to={`/home/${encodeURIComponent(home.id)}/ambienti`}>Gestisci ambienti</Link>
    {rooms.hasNextPage&&<button type="button" className={ui.btn} disabled={rooms.isFetchingNextPage} onClick={()=>void rooms.fetchNextPage()}>Carica altre stanze</button>}
    <G1Feedback op={op} homeId={home.id} title="Stanza non salvata" onRetry={()=>op.retry()}/>
  </form>;
}

export function PositionEditor(props: { home: Home; capabilities: ObjectCapabilities; object: CatalogItem; onDone: () => void; onCancel: () => void }) {
  const { home, object } = props;
  const id = useId();
  const op = useG1Operation(home.id);
  const heading = useFocusOnMount<HTMLHeadingElement>();
  const initial = object.position.rooms.map((r) => r.id);
  const [roomIds, setRoomIds] = useState<string[]>(initial);
  const [error, setError] = useState<string>();
  const [nothing, setNothing] = useState(false);
  const disabled = op.mutation.isPending || op.locked;
  const max = props.capabilities.limits.maxRoomsPerObject;

  const submit = () => {
    setNothing(false);
    if (roomIds.length > max) {
      setError(`Al massimo ${max} ambienti.`);
      return;
    }
    setError(undefined);
    const same = roomIds.length === initial.length && roomIds.every((r) => initial.includes(r));
    if (same) {
      setNothing(true);
      return;
    }
    op.run({ kind: 'position', ref: object.ref, body: { expectedVersion: object.position.version, roomIds } }, props.onDone);
  };

  return (
    <form
      className={styles.panel}
      noValidate
      aria-labelledby={`${id}-t`}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h2 id={`${id}-t`} ref={heading} tabIndex={-1}>
        Dove si trova
      </h2>
      <RoomChecklist homeId={home.id} selected={roomIds} current={object.position.rooms} max={max} disabled={disabled} onChange={setRoomIds} legend="Ambienti" />
      {error && <span className={ui.fieldError}>{error}</span>}
      <p className={styles.meta}>Cambiare posizione non modifica documenti, costi, attività o la scheda tecnica.</p>
      {nothing && (
        <Banner role="status">
          <p>Nessuna modifica da salvare.</p>
        </Banner>
      )}
      <G1Feedback op={op} homeId={home.id} title="Posizione non salvata" onRetry={() => op.retry(props.onDone)} />
      <div className={styles.actions}>
        {!op.locked && (
          <button type="submit" className={cx(ui.btn, ui.primary)} disabled={op.mutation.isPending}>
            {op.mutation.isPending ? 'Salvataggio…' : 'Salva posizione'}
          </button>
        )}
        <button type="button" className={cx(ui.btn, ui.ghost)} onClick={props.onCancel} disabled={disabled}>
          Annulla
        </button>
      </div>
    </form>
  );
}

/** Archivia/ripristina (ambiente o oggetto manuale) in dialogo con CAS. */
export function StateDialog(props: {
  homeId: string;
  title: string;
  hint: string;
  vars: OperationVars;
  onClose: () => void;
  /** Dopo un successo; di default chiude. */
  onDone?: () => void;
}) {
  const op = useG1Operation(props.homeId);
  const done = props.onDone ?? props.onClose;
  const disabled = op.mutation.isPending || op.locked;
  return (
    <Dialog title={props.title} onClose={props.onClose} dismissDisabled={disabled}>
      <form
        noValidate
        aria-label={props.title}
        onSubmit={(e) => {
          e.preventDefault();
          op.run(props.vars, done);
        }}
      >
        <p className={styles.meta}>{props.hint}</p>
        <G1Feedback op={op} homeId={props.homeId} title="Operazione non eseguita" onRetry={() => op.retry(done)} />
        <div className={styles.actions}>
          {!op.locked && (
            <button type="submit" className={cx(ui.btn, ui.primary)} disabled={op.mutation.isPending}>
              {op.mutation.isPending ? 'Invio…' : props.title}
            </button>
          )}
          <button type="button" className={cx(ui.btn, ui.ghost)} onClick={props.onClose} disabled={disabled}>
            Torna indietro
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------- collegamenti

function resourceHref(homeId: string, type: G1ResourceType, resourceId: string) {
  const base = `/home/${encodeURIComponent(homeId)}`;
  const id = encodeURIComponent(resourceId);
  return type === 'document' ? `${base}/documenti/${id}` : type === 'expense' ? `${base}/spese/${id}` : `${base}/attivita/${id}`;
}

const SECTION_TITLE: Record<G1ResourceType, string> = {
  document: 'Documenti collegati',
  expense: 'I tuoi costi',
  activity: 'Le tue attività',
};

const SECTION_NOTE: Record<G1ResourceType, string> = {
  document: 'Solo i documenti che puoi leggere. Collegarli non cambia chi può vederli.',
  expense: 'Visibili solo a te. Ogni costo è un solo record in Spese, qui ne vedi il riferimento.',
  activity: 'Visibili solo a te. Completare un’attività non registra né paga un costo.',
};

const EMPTY_TEXT: Record<G1ResourceType, string> = {
  document: 'Nessun documento collegato.',
  expense: 'Nessun tuo costo collegato.',
  activity: 'Nessuna tua attività collegata.',
};

/**
 * Sezione collegamenti per tipo di risorsa: lista server paginata (native + reference,
 * senza duplicati), collega una risorsa esistente autorizzata, rimuovi un riferimento con
 * CAS; i collegamenti nativi si gestiscono nella risorsa originale. Nessun contatore.
 */
export function LinksSection(props: {
  home: Home;
  object: CatalogItem;
  resourceType: G1ResourceType;
  expenseCapabilities?: ExpenseCapabilities;
  activityCapabilities?: ActivityCapabilities;
  /** economy-v1 attivo: registrazione atomica con objectRef e ritorno alla scheda. */
  economyEnabled?: boolean;
  compact?:boolean;
}) {
  const { home, object, resourceType } = props;
  const links = useObjectLinks(home.id, object.ref, resourceType);
  const account = useAccount();
  const returnContext = contextReturn(useLocation().state, account.id, home.id);
  const objectPathHere = `/home/${encodeURIComponent(home.id)}/oggetti/${encodeURIComponent(object.ref.kind)}/${encodeURIComponent(object.ref.id)}`;
  const refParam = encodeURIComponent(`${object.ref.kind}:${object.ref.id}`);
  const items = links.data?.pages.flatMap((p) => p.items) ?? [];
  const canEdit = home.permissions.includes('edit') && object.permissions.includes('edit');
  const isBoiler = object.ref.kind === 'boiler';
  const active = object.state === 'active';
  const [panel, setPanel] = useState<'none' | 'pick' | 'create'>('none');
  const [removing, setRemoving] = useState<LinkedResource | null>(null);
  const headingId = useId();
  const assetId = object.technicalLink?.assetId;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [refocus, setRefocus] = useState(0);
  useEffect(() => {
    if (refocus) headingRef.current?.focus();
  }, [refocus]);
  const finished = () => {
    setPanel('none');
    setRemoving(null);
    setRefocus((n) => n + 1);
  };

  const actionButtons=(<p className={cx(styles.actions, own.spaced)}>
          {(resourceType === 'document' || !isBoiler) && (
            <button type="button" className={ui.btn} onClick={() => setPanel('pick')}>
              {resourceType === 'document' ? 'Collega un documento' : resourceType === 'expense' ? 'Collega un costo esistente' : 'Collega un’attività esistente'}
            </button>
          )}
          {resourceType === 'expense' && props.economyEnabled && (
            <Link
              to={`/home/${encodeURIComponent(home.id)}/spese?nuova-spesa=1&perOggetto=${refParam}`}
              state={{ accountId: account.id, returnTo: { path: objectPathHere, label: object.name } }}
              className={ui.btn}
            >
              Registra un costo per questo oggetto
            </Link>
          )}
          {resourceType === 'expense' && !props.economyEnabled &&
            (isBoiler && assetId ? (
              <Link to={`/home/${encodeURIComponent(home.id)}/spese?nuova-spesa=1&assetId=${encodeURIComponent(assetId)}`} className={ui.btn}>
                Registra un costo
              </Link>
            ) : props.expenseCapabilities ? (
              <button type="button" className={ui.btn} onClick={() => setPanel('create')}>
                Registra un costo per questo oggetto
              </button>
            ) : null)}
          {resourceType === 'activity' &&
            (isBoiler && assetId ? (
              <Link to={`/home/${encodeURIComponent(home.id)}/attivita?nuova-attivita=1&assetId=${encodeURIComponent(assetId)}`} className={ui.btn}>
                Crea promemoria
              </Link>
            ) : props.activityCapabilities ? (
              <button type="button" className={ui.btn} onClick={() => setPanel('create')}>
                Crea promemoria per questo oggetto
              </button>
            ) : null)}
        </p>);
  return (
    <section className={cx(ui.card,props.compact&&own.compactLinks)} aria-labelledby={headingId}>
      <h2 aria-label={SECTION_TITLE[resourceType]} id={headingId} ref={headingRef} tabIndex={-1} className={own.sectionTitle}>
        {SECTION_TITLE[resourceType]}{props.compact&&<FieldInfo label={SECTION_TITLE[resourceType]}><p>{SECTION_NOTE[resourceType]}</p></FieldInfo>}
      </h2>
      {!props.compact&&<p className={styles.meta}>{SECTION_NOTE[resourceType]}</p>}
      {links.isPending ? (
        <Loading label="Caricamento dei collegamenti…" />
      ) : links.isError && !links.data ? (
        <ErrorState title="Collegamenti non disponibili" error={links.error} message={objectsErrorMessage(links.error)} onRetry={() => void links.refetch()} retrying={links.isFetching} />
      ) : items.length === 0 ? (
        <p className={styles.meta}>{EMPTY_TEXT[resourceType]}</p>
      ) : (
        <ul className={styles.list} aria-label={SECTION_TITLE[resourceType]}>
          {items.map((l, i) => (
            <li key={l.linkId ?? `${l.origin}-${l.resource?.id ?? i}`} className={styles.item}>
              {l.state === 'unavailable' || !l.resource ? (
                <span className={styles.meta}>{RESOURCE_LABEL[resourceType]} non più disponibile per il tuo account</span>
              ) : (
                <Link to={resourceHref(home.id, resourceType, l.resource.id)} state={resourceType === 'document' ? {accountId:account.id,returnTo:{path:objectPathHere,label:object.name},returnState:returnContext?{accountId:account.id,returnTo:returnContext}:undefined} : undefined} className={styles.title}>
                  {l.resource.title}
                </Link>
              )}
              {!props.compact&&<span className={styles.meta}>
                {l.origin === 'native'
                  ? isBoiler
                    ? 'Collegamento della scheda caldaia: si gestisce dalla risorsa originale'
                    : 'Collegamento originale: si gestisce dalla risorsa'
                  : 'Collegato da te a questo oggetto'}
              </span>}
              {resourceType === 'expense' && l.resource?.amountCents !== undefined && l.resource.currency === 'EUR' && (
                <span className={styles.meta}>{props.compact?'':'Costo registrato: '}{formatCents(l.resource.amountCents)}{props.compact&&l.resource.spentOn&&<> · {l.resource.spentOn.split('-').reverse().join('/')}</>}</span>
              )}
              {resourceType === 'expense' && l.resource?.document && <Link className={styles.meta} to={'/home/'+encodeURIComponent(home.id)+'/documenti/'+encodeURIComponent(l.resource.document.id)} aria-label={'Apri documento '+l.resource.document.title}>Apri documento</Link>}
              {props.compact?<details className={own.rowMenu}><summary aria-label={`Azioni per ${l.resource?.title??'collegamento'}`}><DotsThree size={22} aria-hidden="true"/></summary><div><p>{l.origin==='native'?'Collegamento originale: si gestisce dalla risorsa.':'Collegato da te a questo oggetto'}</p>{canEdit&&l.origin==='reference'&&l.linkId&&l.version!==null&&<button type="button" className={ui.btn} onClick={()=>setRemoving(l)}>Rimuovi collegamento</button>}</div></details>:canEdit && l.origin === 'reference' && l.linkId && l.version !== null && (
                <span>
                  <button type="button" className={cx(ui.btn, ui.small)} onClick={() => setRemoving(l)}>
                    Rimuovi collegamento
                  </button>
                </span>
              )}

            </li>
          ))}
        </ul>
      )}
      {links.hasNextPage && (
        <p className={own.spaced}>
          <button type="button" className={ui.btn} onClick={() => void links.fetchNextPage()} disabled={links.isFetchingNextPage}>
            {links.isFetchingNextPage ? 'Caricamento…' : 'Mostra altri collegamenti'}
          </button>
        </p>
      )}

      {canEdit&&active&&panel==='none'&&(props.compact&&resourceType==='expense'?<details className={own.actionMenu}><summary>Collega o registra spesa</summary>{actionButtons}</details>:actionButtons)}

      {resourceType === 'expense' && props.economyEnabled && (
        <p className={own.spaced}>
          <Link to={`/home/${encodeURIComponent(home.id)}/spese?vista=elenco&oggetto=${refParam}`}>Vedi i costi di questo oggetto in Spese, con totale e periodo</Link>
        </p>
      )}
      {!active && <p className={styles.meta}>Oggetto archiviato: nessun nuovo collegamento finché non lo ripristini.</p>}

      {panel === 'pick' && <LinkPicker home={home} object={object} resourceType={resourceType} onClose={() => setPanel('none')} onDone={finished} />}
      {panel === 'create' && !isBoiler && (
        <CreateAndLink
          home={home}
          object={object}
          resourceType={resourceType as 'expense' | 'activity'}
          expenseCapabilities={props.expenseCapabilities}
          activityCapabilities={props.activityCapabilities}
          onClose={() => setPanel('none')}
          onDone={finished}
        />
      )}
      {removing && removing.linkId && removing.version !== null && (
        <StateDialog
          homeId={home.id}
          title="Rimuovi collegamento"
          hint="Il collegamento con questo oggetto viene rimosso. La risorsa originale non cambia e non viene cancellata."
          vars={{ kind: 'unlink', ref: object.ref, linkId: removing.linkId, body: { expectedVersion: removing.version } }}
          onClose={() => setRemoving(null)}
          onDone={finished}
        />
      )}
    </section>
  );
}

/** Esito di un collegamento: successo, oppure errore con riprova della sola fase di link. */
function useLinkStep(homeId: string, object: CatalogItem, resourceType: G1ResourceType) {
  const op = useG1Operation(homeId);
  const link = (resourceId: string, onDone?: () => void) => op.run({ kind: 'link', ref: object.ref, body: { resourceType, resourceId } }, onDone);
  return { op, link };
}

/** Picker di risorse esistenti autorizzate, paginato; documenti con la ricerca server H2. */
function LinkPicker(props: { home: Home; object: CatalogItem; resourceType: G1ResourceType; onClose: () => void; onDone: () => void }) {
  const { home, object, resourceType } = props;
  const heading = useFocusOnMount<HTMLHeadingElement>();
  const { op, link } = useLinkStep(home.id, object, resourceType);
  const [chosen, setChosen] = useState<{ id: string; title: string } | null>(null);
  const disabled = op.mutation.isPending || op.locked;
  const choose = (r: { id: string; title: string }) => {
    setChosen(r);
    link(r.id, props.onDone);
  };
  return (
    <div className={styles.panel} role="group" aria-labelledby={`${object.ref.id}-${resourceType}-pick`}>
      <h3 id={`${object.ref.id}-${resourceType}-pick`} ref={heading} tabIndex={-1} className={own.sectionTitle}>
        {resourceType === 'document' ? 'Collega un documento' : resourceType === 'expense' ? 'Collega un costo esistente' : 'Collega un’attività esistente'}
      </h3>
      {resourceType === 'document' && <DocumentChoices homeId={home.id} disabled={disabled} onChoose={choose} />}
      {resourceType === 'expense' && <ExpenseChoices homeId={home.id} disabled={disabled} onChoose={choose} />}
      {resourceType === 'activity' && <ActivityChoices homeId={home.id} disabled={disabled} onChoose={choose} />}
      {chosen && op.mutation.isPending && <p className={styles.meta}>Collegamento di «{chosen.title}»…</p>}
      <G1Feedback op={op} homeId={home.id} title="Collegamento non salvato" onRetry={() => op.retry(props.onDone)} />
      <div className={styles.actions}>
        <button type="button" className={cx(ui.btn, ui.ghost)} onClick={props.onClose} disabled={disabled}>
          Chiudi
        </button>
      </div>
    </div>
  );
}

function ChoiceList(props: { label: string; items: Array<{ id: string; title: string; meta?: string }>; disabled: boolean; onChoose: (r: { id: string; title: string }) => void; more?: ReactNode; empty: string }) {
  if (props.items.length === 0) return <p className={styles.meta}>{props.empty}</p>;
  return (
    <>
      <ul className={styles.list} aria-label={props.label}>
        {props.items.map((r) => (
          <li key={r.id} className={styles.item}>
            <span className={styles.title}>{r.title}</span>
            {r.meta && <span className={styles.meta}>{r.meta}</span>}
            <span>
              <button type="button" className={cx(ui.btn, ui.small)} disabled={props.disabled} onClick={() => props.onChoose(r)} aria-label={`Collega «${r.title}»`}>
                Collega
              </button>
            </span>
          </li>
        ))}
      </ul>
      {props.more}
    </>
  );
}

/** Documenti: ricerca H2 sul server (titolo/nome file); senza H2 attiva, elenco M2 paginato. */
function DocumentChoices(props: { homeId: string; disabled: boolean; onChoose: (r: { id: string; title: string }) => void }) {
  const id = useId();
  const caps = useDocumentSearchCapabilities(props.homeId);
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const docs = useDocumentSearch(props.homeId, { q, format: 'all', visibility: 'all' }, !q || caps.isSuccess);
  const items = (docs.data?.pages.flatMap((p) => p.items) ?? []).filter((d) => d.permissions.includes('read'));
  return (
    <>
      {caps.isSuccess && (
        <form
          role="search"
          aria-label="Cerca un documento da collegare"
          className={own.searchRow}
          onSubmit={(e) => {
            e.preventDefault();
            setQ(draft.normalize('NFC').trim());
          }}
        >
          <label className={ui.label} htmlFor={`${id}-q`}>
            Cerca nei documenti
          </label>
          <input id={`${id}-q`} className={ui.input} type="search" value={draft} placeholder="Titolo o nome del file" onChange={(e) => setDraft(e.target.value)} />
          <button type="submit" className={cx(ui.btn, ui.small)}>
            Cerca
          </button>
        </form>
      )}
      {docs.isPending ? (
        <Loading label="Caricamento dei documenti…" />
      ) : docs.isError && !docs.data ? (
        <ErrorState title="Documenti non disponibili" error={docs.error} onRetry={() => void docs.refetch()} retrying={docs.isFetching} />
      ) : (
        <ChoiceList
          label="Documenti da collegare"
          items={items.map((d) => ({ id: d.id, title: d.name, meta: d.originalFilename }))}
          disabled={props.disabled}
          onChoose={props.onChoose}
          empty={q ? 'Nessun documento corrisponde alla ricerca.' : 'Nessun documento leggibile in questa casa.'}
          more={
            docs.hasNextPage && (
              <button type="button" className={cx(ui.btn, ui.small)} onClick={() => void docs.fetchNextPage()} disabled={docs.isFetchingNextPage}>
                Mostra altri documenti
              </button>
            )
          }
        />
      )}
    </>
  );
}

/** Costi propri senza caldaia nativa (un costo con caldaia appartiene già a quella scheda). */
function ExpenseChoices(props: { homeId: string; disabled: boolean; onChoose: (r: { id: string; title: string }) => void }) {
  const list = useExpenses(props.homeId, { state: 'active', year: null, source: 'all' });
  const items = (list.data?.pages.flatMap((p) => p.items) ?? []).filter((e) => e.assetLink.state === 'none');
  if (list.isPending) return <Loading label="Caricamento dei costi…" />;
  if (list.isError && !list.data) return <ErrorState title="Costi non disponibili" error={list.error} onRetry={() => void list.refetch()} retrying={list.isFetching} />;
  return (
    <ChoiceList
      label="Costi da collegare"
      items={items.map((e) => ({ id: e.id, title: e.title, meta: `${formatCents(e.amountCents)} · ${e.spentOn}` }))}
      disabled={props.disabled}
      onChoose={props.onChoose}
      empty={list.hasNextPage ? 'Nessun costo collegabile in questa pagina: mostra altri costi.' : 'Nessun tuo costo collegabile (i costi già legati a una caldaia restano su quella scheda).'}
      more={
        list.hasNextPage && (
          <button type="button" className={cx(ui.btn, ui.small)} onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}>
            Mostra altri costi
          </button>
        )
      }
    />
  );
}

function ActivityChoices(props: { homeId: string; disabled: boolean; onChoose: (r: { id: string; title: string }) => void }) {
  const list = useActivities(props.homeId, { state: 'all', due: 'all' });
  const items = (list.data?.pages.flatMap((p) => p.items) ?? []).filter((a) => a.assetLink.state === 'none');
  if (list.isPending) return <Loading label="Caricamento delle attività…" />;
  if (list.isError && !list.data) return <ErrorState title="Attività non disponibili" error={list.error} onRetry={() => void list.refetch()} retrying={list.isFetching} />;
  return (
    <ChoiceList
      label="Attività da collegare"
      items={items.map((a) => ({ id: a.id, title: a.title }))}
      disabled={props.disabled}
      onChoose={props.onChoose}
      empty={list.hasNextPage ? 'Nessuna attività collegabile in questa pagina: mostra altre attività.' : 'Nessuna tua attività collegabile (quelle legate a una caldaia restano su quella scheda).'}
      more={
        list.hasNextPage && (
          <button type="button" className={cx(ui.btn, ui.small)} onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}>
            Mostra altre attività
          </button>
        )
      }
    />
  );
}

/**
 * Due operazioni, non una transazione: 1) crea il costo/attività con l'API H3a/H1 (senza
 * caldaia); 2) collega con G1. Se la seconda fallisce la risorsa esiste già: «Registrato,
 * collegamento da completare», si conserva l'ID e si riprova solo il collegamento con la
 * stessa chiave. Mai ricreare il costo. Stato solo in memoria (azzerato al cambio contesto).
 */
export function CreateAndLink(props: {
  home: Home;
  object: CatalogItem;
  resourceType: 'expense' | 'activity';
  expenseCapabilities?: ExpenseCapabilities;
  activityCapabilities?: ActivityCapabilities;
  /** Valori iniziali del promemoria (BL-02): modificabili, salvati solo con conferma esplicita. */
  activityInitial?: { title?: string; description?: string; dueDate?: string };
  onClose: () => void;
  onDone: () => void;
}) {
  const { home, object, resourceType } = props;
  const { op, link } = useLinkStep(home.id, object, resourceType);
  const [created, setCreated] = useState<{ id: string; title: string } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const afterCreate = (resource: { id: string; title: string }) => {
    setCreated(resource);
    link(resource.id, props.onDone);
  };
  useEffect(() => {
    if (created && op.mutation.isError) headingRef.current?.focus();
  }, [created, op.mutation.isError]);

  if (!created) {
    return resourceType === 'expense' && props.expenseCapabilities ? (
      <ExpenseForm
        home={home}
        capabilities={props.expenseCapabilities}
        forObject={object.name}
        onCancel={props.onClose}
        onDone={(res) => afterCreate({ id: res.expense.id, title: res.expense.title })}
      />
    ) : resourceType === 'activity' ? (
      <ActivityForm
        home={home}
        forObject={object.name}
        initial={props.activityInitial}
        limits={props.activityCapabilities?.limits}
        onCancel={props.onClose}
        onDone={(res) => afterCreate({ id: res.activity.id, title: res.activity.title })}
      />
    ) : null;
  }

  const label = resourceType === 'expense' ? 'Costo registrato' : 'Promemoria creato';
  return (
    <div className={styles.panel} role="group" aria-labelledby={`${object.ref.id}-${resourceType}-link`}>
      <h3 id={`${object.ref.id}-${resourceType}-link`} ref={headingRef} tabIndex={-1} className={own.sectionTitle}>
        {op.mutation.isError ? `${label}, collegamento da completare` : `${label}: collegamento in corso…`}
      </h3>
      <p className={styles.meta}>
        «<Link to={resourceHref(home.id, resourceType, created.id)}>{created.title}</Link>» è salvato. Il collegamento a «{object.name}» è
        un’operazione separata: riprovarla non crea un secondo {resourceType === 'expense' ? 'costo' : 'promemoria'}.
      </p>
      {op.mutation.isError && (
        <Banner
          tone={isAmbiguous(op.mutation.error) ? 'error' : 'warning'}
          role="alert"
          title="Registrato, collegamento da completare"
          actions={
            !isConflict(op.mutation.error) && (
              <button
                type="button"
                className={cx(ui.btn, ui.small)}
                disabled={op.mutation.isPending}
                onClick={() => (isAmbiguous(op.mutation.error) ? op.retry(props.onDone) : link(created.id, props.onDone))}
              >
                Completa il collegamento
              </button>
            )
          }
        >
          <p>{objectsErrorMessage(op.mutation.error)}</p>
        </Banner>
      )}
      <div className={styles.actions}>
        <button type="button" className={cx(ui.btn, ui.ghost)} onClick={props.onClose} disabled={op.mutation.isPending || op.locked}>
          Chiudi
        </button>
      </div>
    </div>
  );
}
