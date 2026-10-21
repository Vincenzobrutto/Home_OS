import { useAccount } from '../session/session';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import type { Home, ObjectCapabilities, Room, RoomFilters } from '../api/types';
import { Icon } from '../components/Icon';
import { Banner, ErrorState, Loading, Tag, cx, ui, useDocumentTitle } from '../components/ui';
import { G1History } from '../objects/History';
import { RoomForm, StateDialog, objectStyles as styles, roomsText, typeLabel } from '../objects/components';
import { useCatalog, useForgetObjects, useObjectCapabilities, useRoom, useRoomHistory, useRooms } from '../objects/hooks';
import { ROOM_TYPE_LABEL, isForbidden, isNotActive, objectPath, objectsErrorMessage, roomMeta, roomPath } from '../lib/objects';
import { isApiError } from '../api/errors';
import { useCurrentHome } from './HomePages';
import pages from './pages.module.css';
import roomStyles from './rooms.module.css';

/** Ritorno a Casa: ambienti e oggetti sono sottosezioni di Casa nella navigazione. */
export function BackToCasa({ homeId }: { homeId: string }) {
  return (
    <Link to={`/home/${encodeURIComponent(homeId)}/casa`} className={pages.spaced}>
      ← Casa
    </Link>
  );
}

/**
 * Le azioni G1 compaiono solo con capabilities vere del server. 404 = non attivo,
 * errore/503 = non disponibile con Riprova: mai un elenco vuoto o un successo finto.
 */
export function ObjectsGate(props: { home: Home; heading: ReactNode; children: (caps: ObjectCapabilities) => ReactNode }) {
  const caps = useObjectCapabilities(props.home.id);
  const forget = useForgetObjects(props.home.id);
  const forbidden = caps.isError && isForbidden(caps.error);
  useEffect(() => {
    if (forbidden) forget();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una sola pulizia per ogni 403
  }, [forbidden]);
  if (caps.isPending) {
    return (
      <>
        {props.heading}
        <Loading label="Verifica del servizio…" />
      </>
    );
  }
  if (caps.isError) {
    return (
      <>
        {props.heading}
        {isNotActive(caps.error) ? (
          <div className={cx(ui.card, pages.unavailable)}>
            <h2 className={pages.cardTitle}>Ambienti e oggetti non ancora attivi</h2>
            <p className={pages.muted}>Questa funzione non è ancora attiva su questo servizio: qui non viene mostrato né salvato alcun dato.</p>
          </div>
        ) : (
          <ErrorState
            title="Ambienti e oggetti non disponibili"
            error={caps.error}
            message={objectsErrorMessage(caps.error)}
            onRetry={forbidden ? undefined : () => void caps.refetch()}
            retrying={caps.isFetching}
          />
        )}
      </>
    );
  }
  return <>{props.children(caps.data)}</>;
}

const STATE_OPTIONS: Array<{ value: RoomFilters['state']; label: string }> = [
  { value: 'active', label: 'Attivi' },
  { value: 'archived', label: 'Archiviati' },
  { value: 'all', label: 'Tutti' },
];

export function RoomsPage() {
  const home = useCurrentHome();
  useDocumentTitle(`Ambienti · ${home.name}`);
  const heading = (
    <>
      <BackToCasa homeId={home.id} />
      <div className={pages.heading}>
        <div>
          <span className={pages.eyebrow}>{home.name}</span>
          <h1 tabIndex={-1}>Ambienti</h1>
          <p className={pages.lead}>
            Le stanze della casa, condivise con chi vi ha accesso. Apri una stanza per vedere i tuoi oggetti.
          </p>
        </div>
      </div>
    </>
  );
  return <ObjectsGate home={home} heading={heading}>{(caps) => <><>{heading}</><RoomsContent home={home} caps={caps} /></>}</ObjectsGate>;
}

function RoomsContent({ home, caps }: { home: Home; caps: ObjectCapabilities }) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const stateParam = params.get('stato');
  const state: RoomFilters['state'] = stateParam === 'archived' || stateParam === 'all' ? stateParam : 'active';
  const creating = params.get('nuovo') === '1';
  const canEdit = home.permissions.includes('edit');
  const rooms = useRooms(home.id, { state });
  const catalog = useCatalog(home.id, { state: 'active', q: '', type: null, roomId: null, placement: 'all', sort: 'name' });
  const forget = useForgetObjects(home.id);
  const forbidden = rooms.isError && isForbidden(rooms.error);
  useEffect(() => {
    if (forbidden) forget();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una sola pulizia per ogni 403
  }, [forbidden]);
  const loaded = rooms.data?.pages.flatMap((p) => p.items) ?? [];
  const facets = !catalog.isError ? catalog.data?.pages[0]?.facets : undefined;
  const counts = new Map(facets?.rooms.map(r => [r.id, r.count]));
  // Facets cover every active room, including rooms beyond the loaded room page.
  const items: Array<Pick<Room, 'id' | 'name' | 'state'>> = state === 'active' && facets
    ? facets.rooms.map(r => ({id:r.id,name:r.name,state:'active'})) : loaded;
  items.sort((a,b) => Number((counts.get(b.id)??0)>0)-Number((counts.get(a.id)??0)>0)||a.name.localeCompare(b.name,'it')||a.id.localeCompare(b.id));
  const setCreating = (on: boolean) => {
    const next = new URLSearchParams(params);
    if (on) next.set('nuovo', '1');
    else next.delete('nuovo');
    setParams(next, { replace: !on });
  };

  return (
    <div className={pages.stack}>
      {canEdit && !creating && (
        <p className={styles.actions}>
          <button type="button" className={cx(ui.btn, ui.primary)} onClick={() => setCreating(true)}>
            <Icon name="plus" />
            Aggiungi ambiente
          </button>
          <Link className={ui.btn} to={`/home/${home.id}/ambienti/da-planimetria`}>Da una planimetria</Link>
        </p>
      )}
      {!canEdit && <p className={pages.muted}>Con il tuo ruolo puoi consultare gli ambienti, non aggiungerne o modificarli.</p>}
      {canEdit && creating && (
        <RoomForm home={home} capabilities={caps} onCancel={() => setCreating(false)} onDone={(room) => navigate(roomPath(home.id, room.id))} />
      )}
      <section className={ui.card} aria-labelledby="ambienti-elenco">
        <div className={roomStyles.toolbar}>
        <h2 id="ambienti-elenco" className={pages.cardTitle}>
          Le stanze
        </h2>
        <div className={styles.filters} role="group" aria-label="Filtri degli ambienti">
          <label className={styles.filter}>
            Mostra
            <select
              className={styles.select}
              value={state}
              onChange={(e) => {
                const next = new URLSearchParams(params);
                if (e.target.value === 'active') next.delete('stato');
                else next.set('stato', e.target.value);
                setParams(next);
              }}
            >
              {STATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        </div>
        {rooms.isPending ? (
          <Loading label="Caricamento degli ambienti…" />
        ) : forbidden || (rooms.isError && !rooms.data) ? (
          <ErrorState title="Ambienti non disponibili" error={rooms.error} message={objectsErrorMessage(rooms.error)} onRetry={forbidden ? undefined : () => void rooms.refetch()} retrying={rooms.isFetching} />
        ) : items.length === 0 ? (
          <p className={pages.muted} role="status">
            {state === 'active' ? 'Non ci sono ancora ambienti in questa casa.' : state === 'archived' ? 'Nessun ambiente archiviato.' : 'Nessun ambiente.'}
          </p>
        ) : (
          <ul className={cx(styles.list,roomStyles.list)} aria-label="Ambienti">
            {items.map((r) => (
              <RoomRow key={r.id} room={r} meta={!facets ? loaded.find(item=>item.id===r.id) : undefined} count={counts.get(r.id)} homeId={home.id} />
            ))}
          </ul>
        )}
        {rooms.hasNextPage && !(state === 'active' && facets) && (
          <p className={pages.spaced}>
            <button type="button" className={ui.btn} onClick={() => void rooms.fetchNextPage()} disabled={rooms.isFetchingNextPage}>
              {rooms.isFetchingNextPage ? 'Caricamento…' : 'Mostra altri ambienti'}
            </button>
          </p>
        )}
      </section>
    </div>
  );
}

function RoomRow({ room, meta, count, homeId }: { room: Pick<Room,'id'|'name'|'state'>; meta?: Room; count?: number; homeId: string }) {
  return (
    <li className={styles.item}>
      <div className={styles.itemHead}>
        <Link to={roomPath(homeId, room.id)} className={styles.title}>
          {room.name}
        </Link>
        {count !== undefined && <span className={styles.meta}>{count === 0 ? 'Nessun tuo oggetto' : `${count} ${count === 1 ? 'tuo oggetto' : 'tuoi oggetti'}`}</span>}
        {room.state === 'archived' && <span className={styles.due}>Archiviato</span>}
      </div>
      {meta && roomMeta(meta) && <span className={styles.meta}>{roomMeta(meta)}</span>}
    </li>
  );
}

export function RoomDetailPage() {
  const home = useCurrentHome();
  const { roomId = '' } = useParams();
  const back = (
    <Link to={roomPath(home.id)} className={pages.spaced}>
      ← Ambienti
    </Link>
  );
  return (
    <ObjectsGate home={home} heading={<>{back}<h1 className="visually-hidden" data-pending="">Ambiente</h1></>}>
      {(caps) => <RoomDetail home={home} roomId={roomId} caps={caps} back={back} />}
    </ObjectsGate>
  );
}

function RoomDetail(props: { home: Home; roomId: string; caps: ObjectCapabilities; back: ReactNode }) {
  const { home } = props;
  const query = useRoom(home.id, props.roomId);
  const [firstVersion, setFirstVersion] = useState<number | null>(null);
  if (query.data && firstVersion === null) setFirstVersion(query.data.version);
  if (query.isPending) {
    return (
      <>
        {props.back}
        <h1 className="visually-hidden" data-pending="">
          Ambiente
        </h1>
        <Loading label="Caricamento dell’ambiente…" />
      </>
    );
  }
  if (query.isError) {
    const status = isApiError(query.error) && query.error.kind === 'http' ? query.error.status : 0;
    if (status === 403 || status === 422) {
      return (
        <Unavailable back={props.back} title={status === 403 ? 'Ambiente non disponibile' : 'Indirizzo non valido'}>
          {status === 403 ? 'Questo account non ha accesso all’ambiente richiesto.' : 'L’indirizzo non corrisponde a un ambiente valido.'}
        </Unavailable>
      );
    }
    return (
      <>
        {props.back}
        <h1 tabIndex={-1}>Ambiente</h1>
        <ErrorState error={query.error} message={objectsErrorMessage(query.error)} onRetry={() => void query.refetch()} retrying={query.isFetching} />
      </>
    );
  }
  return (
    <RoomView
      key={query.data.version}
      home={home}
      room={query.data}
      caps={props.caps}
      back={props.back}
      focusActions={firstVersion !== null && query.data.version !== firstVersion}
    />
  );
}

export function Unavailable(props: { back: ReactNode; title: string; children: string }) {
  useDocumentTitle(props.title);
  return (
    <div className={pages.stack}>
      <div>
        {props.back}
        <h1 tabIndex={-1}>{props.title}</h1>
      </div>
      <Banner tone="warning" role="alert">
        <p>{props.children}</p>
      </Banner>
    </div>
  );
}

function RoomView(props: { home: Home; room: Room; caps: ObjectCapabilities; back: ReactNode; focusActions: boolean }) {
  const { home, room } = props;
  const account = useAccount();
  useDocumentTitle(`${room.name} · ${home.name}`);
  const [panel, setPanel] = useState<'none' | 'edit' | 'state'>('none');
  const canEdit = home.permissions.includes('edit') && room.permissions.includes('edit');
  const active = room.state === 'active';
  const history = useRoomHistory(home.id, room.id);
  const objects = useCatalog(home.id, { state: 'active', q: '', type: null, roomId: room.id, placement: 'all' });
  const objectItems = objects.data?.pages.flatMap((p) => p.items) ?? [];
  const actionsRef = useFocusAfterVersion(props.focusActions);

  return (
    <>
      {props.back}
      <div className={pages.heading}>
        <div>
          <span className={pages.eyebrow}>{home.name} · Ambiente condiviso</span>
          <h1 tabIndex={-1}>{room.name}</h1>
          <div className={styles.actions}>
            <Tag tone="blue">{ROOM_TYPE_LABEL[room.type] ?? room.type}</Tag>
            {!active && <Tag>Archiviato</Tag>}
          </div>
        </div>
      </div>
      <div className={pages.stack}>
        <section className={ui.card} aria-labelledby="ambiente-oggetti">
          <h2 id="ambiente-oggetti" className={pages.cardTitle}>
            I tuoi oggetti in questo ambiente
          </h2>
          <p className={cx(pages.small, pages.muted)}>Solo oggetti e schede caldaia tuoi: gli oggetti sono personali fino alla condivisione.</p>
          {objects.isPending ? (
            <Loading label="Caricamento degli oggetti…" />
          ) : objects.isError && !objects.data ? (
            <ErrorState error={objects.error} message={objectsErrorMessage(objects.error)} onRetry={() => void objects.refetch()} retrying={objects.isFetching} />
          ) : objectItems.length === 0 ? (
            <p className={pages.muted}>Nessun tuo oggetto in questo ambiente.</p>
          ) : (
            <ul className={styles.list} aria-label="Oggetti in questo ambiente">
              {objectItems.map((o) => (
                <li key={`${o.ref.kind}:${o.ref.id}`} className={styles.item}>
                  <Link to={objectPath(home.id, o.ref)} state={{accountId: account.id, returnTo: {path: roomPath(home.id, room.id), label: room.name}}} className={styles.title}>
                    {o.name}
                  </Link>
                  <span className={styles.meta}>
                    {typeLabel(o)}
                    {o.position.rooms.length > 1 ? ` · anche in altri ${o.position.rooms.length - 1} ambienti` : ''}
                    {o.position.rooms.length > 1 ? ` (${roomsText(o.position.rooms.filter((r) => r.id !== room.id))})` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {objects.hasNextPage && (
            <p className={pages.spaced}>
              <button type="button" className={ui.btn} onClick={() => void objects.fetchNextPage()} disabled={objects.isFetchingNextPage}>
                Mostra altri oggetti
              </button>
            </p>
          )}
        </section>
        <details className={ui.card}><summary className={pages.cardTitle}>Dettagli dell’ambiente</summary>
          <dl className={pages.detailList}>
            <dt>Tipo</dt>
            <dd>{ROOM_TYPE_LABEL[room.type] ?? room.type}</dd>
            {room.note && <><dt>Nota</dt><dd className={styles.description}>{room.note}</dd></>}
          </dl>
          <p className={cx(pages.small, pages.muted, pages.spaced)}>
            L’ambiente raccoglie i tuoi oggetti e i loro collegamenti.
          </p>
        </details>
        {canEdit && panel !== 'edit' && (
          <div ref={actionsRef} className={styles.actions}>
            {active && (
              <button type="button" className={cx(ui.btn, ui.primary)} onClick={() => setPanel('edit')}>
                Modifica
              </button>
            )}
            <button type="button" className={ui.btn} onClick={() => setPanel('state')}>
              {active ? 'Archivia' : 'Ripristina'}
            </button>
          </div>
        )}
        {!canEdit && <p className={pages.muted}>Con il tuo ruolo puoi consultare questo ambiente, non modificarlo.</p>}
        {panel === 'edit' && active && (
          <RoomForm home={home} capabilities={props.caps} room={room} onCancel={() => setPanel('none')} onDone={() => setPanel('none')} />
        )}
        {panel === 'state' && (
          <StateDialog
            homeId={home.id}
            title={active ? 'Archivia ambiente' : 'Ripristina ambiente'}
            hint={
              active
                ? 'L’ambiente esce dalle scelte per nuove posizioni. Non viene cancellato: oggetti e posizioni esistenti restano, con l’ambiente indicato come archiviato.'
                : 'L’ambiente torna disponibile per nuove posizioni, con gli stessi dati e la sua storia.'
            }
            vars={{ kind: active ? 'roomArchive' : 'roomRestore', roomId: room.id, body: { expectedVersion: room.version } }}
            onClose={() => setPanel('none')}
          />
        )}

        <details><summary className={ui.btn}>Storia dell’ambiente</summary><G1History title="Storia dell’ambiente" id="ambiente-storia" query={history} /></details>
      </div>
    </>
  );
}

/**
 * Dopo un'operazione riuscita la vista si rimonta (chiave = versione): il focus va alla
 * prima azione, non al body. Le callback di mutate non bastano: il form è già smontato.
 */
export function useFocusAfterVersion(focus: boolean) {
  const [ref] = useState(() => ({ current: null as HTMLDivElement | null }));
  const [should] = useState(focus);
  useEffect(() => {
    if (should) ref.current?.querySelector('button')?.focus();
  }, [ref, should]);
  return (el: HTMLDivElement | null) => {
    ref.current = el;
  };
}
