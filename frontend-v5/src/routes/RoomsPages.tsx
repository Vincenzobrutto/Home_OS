import { useAccount } from '../session/session';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { X } from '@phosphor-icons/react/dist/csr/X';
import { DotsThree } from '@phosphor-icons/react/dist/csr/DotsThree';
import { PencilSimple } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { useAppendPage } from '../lib/useAppendPage';
import { CatalogTile } from '../objects/CatalogTile';
import detail from '../objects/detail.module.css';
import roomDetail from './room-detail.module.css';
import { Blueprint } from '@phosphor-icons/react/dist/csr/Blueprint';
import type { Home, ObjectCapabilities, Room, RoomFilters } from '../api/types';
import { Icon } from '../components/Icon';
import { Banner, ErrorState, Loading, Tag, cx, ui, useDocumentTitle } from '../components/ui';
import { G1History } from '../objects/History';
import { RoomForm, StateDialog, objectStyles as styles } from '../objects/components';
import { useCatalog, useForgetObjects, useObjectCapabilities, useRoom, useRoomHistory, useRooms } from '../objects/hooks';
import { ROOM_TYPE_LABEL, isForbidden, isNotActive, objectsErrorMessage, roomPath } from '../lib/objects';
import { isApiError } from '../api/errors';
import { useCurrentHome } from './HomePages';
import pages from './pages.module.css';
import roomStyles from './rooms.module.css';
import cards from '../objects/catalog.module.css';
import { RoomCard, RoomGlyph } from '../objects/RoomCard';

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
            Apri una stanza per vedere i tuoi oggetti.
          </p>
        </div>
      </div>
    </>
  );
  return <ObjectsGate home={home} heading={heading}>{(caps) => <><>{heading}</><RoomsContent home={home} caps={caps} /></>}</ObjectsGate>;
}

function RoomsContent({ home, caps }: { home: Home; caps: ObjectCapabilities }) {
  const [params, setParams] = useSearchParams();
  const account = useAccount();
  const location = useLocation();
  const navigate = useNavigate();
  const stateParam = params.get('stato');
  const state: RoomFilters['state'] = stateParam === 'archived' || stateParam === 'all' ? stateParam : 'active';
  const creating = params.get('nuovo') === '1';
  const search = params.get('q') ?? '';
  const searchInput = useRef<HTMLInputElement>(null);
  const content = state === 'active' && ['populated','empty'].includes(params.get('contenuto') ?? '') ? params.get('contenuto') : null;
  const canEdit = home.permissions.includes('edit');
  const rooms = useRooms(home.id, { state });
  const catalog = useCatalog(home.id, { state: 'active', q: '', type: null, roomId: null, placement: 'all', sort: 'name' });
  const forget = useForgetObjects(home.id);
  const forbidden = rooms.isError && isForbidden(rooms.error);
  useEffect(() => {
    if (forbidden) forget();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una sola pulizia per ogni 403
  }, [forbidden]);
  const loaded = !forbidden ? rooms.data?.pages.flatMap((p) => p.items) ?? [] : [];
  const facets = !forbidden && !catalog.isError ? catalog.data?.pages[0]?.facets : undefined;
  const counts = new Map(facets?.rooms.map(r => [r.id, r.count]));
  // Facets cover every active room, including rooms beyond the loaded room page.
  const items: Array<Pick<Room, 'id' | 'name' | 'state'>> = state === 'active' && facets
    ? facets.rooms.map(r => ({id:r.id,name:r.name,state:'active'})) : loaded;
  items.sort((a,b) => Number((counts.get(b.id)??0)>0)-Number((counts.get(a.id)??0)>0)||a.name.localeCompare(b.name,'it')||a.id.localeCompare(b.id));
  const visible = items.filter(r => r.name.toLocaleLowerCase('it').includes(search.trim().toLocaleLowerCase('it')) && (!content || (content === 'populated' ? (counts.get(r.id) ?? 0) > 0 : counts.get(r.id) === 0)));
  const partial = !!rooms.hasNextPage && !(state === 'active' && facets);
  const setCreating = (on: boolean) => {
    const next = new URLSearchParams(params);
    if (on) next.set('nuovo', '1');
    else next.delete('nuovo');
    setParams(next, { replace: !on });
  };

  return (
    <div className={pages.stack}>
      <div className={roomStyles.tools}>
        <form role="search" aria-label="Cerca ambienti" onSubmit={e => e.preventDefault()}>
          <MagnifyingGlass size={20} aria-hidden="true" />
          <input ref={searchInput} type="search" aria-label="Cerca un ambiente" placeholder="Cerca un ambiente" maxLength={120} value={search} onChange={e => {const next=new URLSearchParams(params);if(e.target.value)next.set('q',e.target.value);else next.delete('q');setParams(next,{replace:true});}} />
          {search && <button type="button" className={ui.btn} aria-label="Azzera ricerca" onClick={() => {const next=new URLSearchParams(params);next.delete('q');setParams(next,{replace:true});searchInput.current?.focus();}}><X size={20} aria-hidden="true" /></button>}
        </form>
        {canEdit && !creating && <>
          <button type="button" className={cx(ui.btn, ui.primary)} onClick={() => setCreating(true)}>
            <Icon name="plus" />
            Aggiungi ambiente
          </button>
          <Link className={ui.btn} to={`/home/${home.id}/ambienti/da-planimetria`}><Blueprint size={18} aria-hidden="true" />Da planimetria</Link>
        </>}
      </div>
      {!canEdit && <p className={pages.muted}>Con il tuo ruolo puoi consultare gli ambienti, non aggiungerne o modificarli.</p>}
      {canEdit && creating && (
        <RoomForm home={home} capabilities={caps} onCancel={() => setCreating(false)} onDone={(room) => navigate(roomPath(home.id, room.id))} />
      )}
      <section aria-labelledby="ambienti-elenco">
        <div className={roomStyles.toolbar}>
        <h2 id="ambienti-elenco" className="visually-hidden">
          Le stanze
        </h2>
        <p role="status" className={roomStyles.resultCount}>{rooms.isPending ? 'Caricamento…' : `${visible.length} ${visible.length === 1 ? 'ambiente' : 'ambienti'}${partial ? ' caricati' : ''}${search || content ? ' trovati' : ''}`}</p>
        <div className={styles.filters} role="group" aria-label="Filtri degli ambienti">
          <label className={styles.filter}>
            Mostra
            <select
              className={styles.select}
              value={content ?? state}
              onChange={(e) => {
                const next = new URLSearchParams(params);
                const value=e.target.value;
                next.delete('contenuto');
                if (value === 'active' || value === 'populated' || value === 'empty') next.delete('stato');
                else next.set('stato', value);
                if (value === 'populated' || value === 'empty') next.set('contenuto',value);
                setParams(next);
              }}
            >
              {STATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
              <option value="populated" disabled={!facets}>Con oggetti</option>
              <option value="empty" disabled={!facets}>Senza oggetti</option>
            </select>
          </label>
        </div>
        </div>
        {rooms.isPending || (content && catalog.isPending) ? (
          <Loading label="Caricamento degli ambienti…" />
        ) : forbidden || (rooms.isError && !rooms.data) ? (
          <ErrorState title="Ambienti non disponibili" error={rooms.error} message={objectsErrorMessage(rooms.error)} onRetry={forbidden ? undefined : () => void rooms.refetch()} retrying={rooms.isFetching} />
        ) : content && catalog.isError ? (
          <ErrorState title="Conteggi degli oggetti non disponibili" error={catalog.error} message={objectsErrorMessage(catalog.error)} onRetry={() => void catalog.refetch()} retrying={catalog.isFetching} />
        ) : visible.length === 0 ? (
          <div className={cards.empty}><p className={pages.muted} role="status">
            {search || content ? 'Nessun ambiente corrisponde alla ricerca e ai filtri.' : state === 'active' ? 'Non ci sono ancora ambienti in questa casa.' : state === 'archived' ? 'Nessun ambiente archiviato.' : 'Nessun ambiente.'}
          </p>{(search || content) && <button className={ui.btn} onClick={() => {const next=new URLSearchParams(params);next.delete('q');next.delete('contenuto');setParams(next,{replace:true});}}>Azzera ricerca e filtri</button>}</div>
        ) : (
          <ul className={cards.grid} aria-label="Ambienti">
            {visible.map((r) => (
              <RoomCard key={r.id} room={r} meta={loaded.find(item=>item.id===r.id)} count={counts.get(r.id)} homeId={home.id} returnState={{roomCatalog:{accountId:account.id,homeId:home.id,search:location.search}}} />
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
      <p className={roomStyles.privacy}>Gli ambienti sono condivisi con chi ha accesso alla casa. Qui vedi solo i tuoi oggetti.{partial && ' La ricerca riguarda gli ambienti caricati: usa Mostra altri ambienti per cercare anche nelle pagine successive.'}</p>
    </div>
  );
}

export function RoomDetailPage() {
  const home = useCurrentHome();
  const account = useAccount();
  const location = useLocation();
  const origin = (location.state as {roomCatalog?:{accountId?:unknown;homeId?:unknown;search?:unknown}} | null)?.roomCatalog;
  const catalogSearch = origin?.accountId === account.id && origin.homeId === home.id && typeof origin.search === 'string' && origin.search.startsWith('?') ? origin.search : '';
  const { roomId = '' } = useParams();
  const back = (
    <Link to={roomPath(home.id)+catalogSearch} className={pages.spaced}>
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
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null), menuButton = useRef<HTMLButtonElement>(null), editButton = useRef<HTMLButtonElement>(null);
  const canEdit = home.permissions.includes('edit') && room.permissions.includes('edit');
  const active = room.state === 'active';
  const history = useRoomHistory(home.id, room.id);
  const objects = useCatalog(home.id, { state: 'active', q: '', type: null, roomId: room.id, placement: 'all' });
  const denied = objects.isError && isForbidden(objects.error);
  const objectItems = denied ? [] : Array.from(new Map((objects.data?.pages.flatMap(p => p.items) ?? []).map(o => [o.ref.kind+':'+o.ref.id,o])).values());
  const append = useAppendPage([account.id,home.id,room.id].join(':'),objectItems.map(o=>`catalog-${o.ref.kind}-${o.ref.id}`),objects.fetchNextPage);
  const actionsRef = useFocusAfterVersion(props.focusActions);
  const total = !denied && !(objects.isError && !objects.data) ? objects.data?.pages[0]?.total : undefined;
  useEffect(() => {
    if (!menu) return;
    const outside = (e: PointerEvent) => {if(!menuRef.current?.contains(e.target as Node))setMenu(false);};
    const escape = (e: KeyboardEvent) => {if(e.key==='Escape'){e.preventDefault();setMenu(false);menuButton.current?.focus();}};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
    return () => {document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[menu]);
  const closeEdit = () => {setPanel('none');requestAnimationFrame(()=>editButton.current?.focus());};

  return <div className={cx(detail.page,roomDetail.page)}>
    {props.back}
    <header className={cx(detail.header,roomDetail.heading)}>
      <div className={roomDetail.identity}><span className={roomDetail.glyph}><RoomGlyph type={room.type}/></span><div>
        <h1 tabIndex={-1}>{room.name}</h1><p>Ambiente condiviso</p>{!active&&<Tag>Archiviato</Tag>}
      </div></div>
      {canEdit&&<div ref={actionsRef} className={detail.headerActions}>
        {active ? <>
          <button ref={editButton} type="button" className={cx(ui.btn,ui.primary)} disabled={panel==='edit'} onClick={()=>{setMenu(false);setPanel('edit');}}><PencilSimple size={18} aria-hidden="true"/>Modifica</button>
          <div ref={menuRef} className={detail.menu}><button ref={menuButton} type="button" className={ui.btn} disabled={panel==='edit'} aria-label="Altre azioni dell’ambiente" aria-expanded={menu} onClick={()=>setMenu(!menu)}><DotsThree size={24} aria-hidden="true"/></button>
            {menu&&<div className={detail.menuItems}><button className={ui.btn} onClick={()=>{setMenu(false);menuButton.current?.focus();setPanel('state');}}>Archivia</button></div>}
          </div>
        </> : <button className={ui.btn} onClick={()=>setPanel('state')}>Ripristina</button>}
      </div>}
    </header>
    {room.note&&<p className={roomDetail.note}>{room.note}</p>}
    {!canEdit&&<p className={pages.muted}>Con il tuo ruolo puoi consultare questo ambiente, non modificarlo.</p>}
    {panel==='edit'&&active&&<div className={roomDetail.form}><RoomForm home={home} capabilities={props.caps} room={room} onCancel={closeEdit} onDone={closeEdit}/></div>}
    <section aria-labelledby="ambiente-oggetti">
      <div className={roomDetail.objectsTitle}><h2 id="ambiente-oggetti">I tuoi oggetti {total!==undefined ? <span className={roomDetail.count}>{total}</span> : !objects.isPending&&!denied&&objectItems.length>0 ? <span className={roomDetail.count}>{objectItems.length}{objects.hasNextPage?' caricati':''}</span> : null}</h2>
        <p>Qui vedi solo gli oggetti del tuo account.</p>
      </div>
      {objects.isPending ? <Loading label="Caricamento degli oggetti…"/> : denied || (objects.isError&&!objects.data) ?
        <ErrorState error={objects.error} message={objectsErrorMessage(objects.error)} onRetry={denied?undefined:()=>void objects.refetch()} retrying={objects.isFetching}/> : objectItems.length===0 ?
        <div className={cards.empty}><p className={pages.muted}>Nessun tuo oggetto in questo ambiente.</p><Link className={ui.btn} to={`/home/${home.id}/oggetti`}>Vai a Oggetti e impianti</Link></div> :
        <ul className={cards.grid} aria-label="Oggetti in questo ambiente">{objectItems.map(o=><CatalogTile key={o.ref.kind+':'+o.ref.id} item={o} homeId={home.id} contextRoomId={room.id} today={objects.data?.pages[0]?.today} state={{accountId:account.id,returnTo:{path:roomPath(home.id,room.id),label:room.name}}} onOpen={()=>{}}/>)}</ul>}
      <p role="status" className="visually-hidden">{append.notice?`Aggiunti ${append.notice.added} oggetti · ${append.notice.total} caricati`:''}</p>
      {objects.isFetchNextPageError&&!denied&&<ErrorState title="Altri oggetti non disponibili" error={objects.error} onRetry={()=>void append.loadMore()} retrying={objects.isFetchingNextPage}/>}
      {objects.hasNextPage&&!denied&&<p className={pages.spaced}><button className={ui.btn} onClick={()=>void append.loadMore()} disabled={objects.isFetchingNextPage}>{objects.isFetchingNextPage?'Caricamento…':'Mostra altri oggetti'}</button></p>}
    </section>
    <div className={cx(detail.secondary,roomDetail.secondary)}>
      <details><summary>Dettagli dell’ambiente</summary><dl><dt>Tipo</dt><dd>{ROOM_TYPE_LABEL[room.type]??room.type}</dd><dt>Visibilità dell’ambiente</dt><dd>Condiviso con chi ha accesso alla casa.</dd></dl></details>
      <details><summary>Storia dell’ambiente</summary><G1History title="Storia dell’ambiente" id="ambiente-storia" query={history}/></details>
    </div>
    {panel==='state'&&<StateDialog homeId={home.id} title={active?'Archivia ambiente':'Ripristina ambiente'} hint={active?'L’ambiente esce dalle scelte per nuove posizioni. Non viene cancellato: oggetti e posizioni esistenti restano, con l’ambiente indicato come archiviato.':'L’ambiente torna disponibile per nuove posizioni, con gli stessi dati e la sua storia.'} vars={{kind:active?'roomArchive':'roomRestore',roomId:room.id,body:{expectedVersion:room.version}}} onClose={()=>setPanel('none')}/>}
  </div>;
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
