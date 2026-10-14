import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { isApiError } from '../api/errors';
import type { CatalogFilters, CatalogItem, Home, ObjectCapabilities, ObjectKind } from '../api/types';
import { useActivityCapabilities } from '../activities/hooks';
import { Icon } from '../components/Icon';
import { ErrorState, Loading, Tag, cx, ui, useDocumentTitle } from '../components/ui';
import { useExpenseCapabilities } from '../expenses/hooks';
import { G1History } from '../objects/History';
import { LinksSection, ObjectForm, PositionEditor, StateDialog, objectOwn as own, objectStyles as styles, roomsText, typeLabel } from '../objects/components';
import { useCatalog, useForgetObjects, useObject, useObjectHistory, useRooms } from '../objects/hooks';
import {
  OBJECT_TYPE_LABEL,
  UNPLACED_LABEL,
  backToCatalog,
  catalogFiltersFromParams,
  catalogFiltersToParams,
  isForbidden,
  objectPath,
  objectsErrorMessage,
  validateQuery,
} from '../lib/objects';
import { useAccount } from '../session/session';
import { BackToCasa, ObjectsGate, Unavailable, useFocusAfterVersion } from './RoomsPages';
import { useCurrentHome } from './HomePages';
import pages from './pages.module.css';

const STATE_OPTIONS: Array<{ value: CatalogFilters['state']; label: string }> = [
  { value: 'active', label: 'Attivi' },
  { value: 'archived', label: 'Archiviati' },
  { value: 'all', label: 'Tutti' },
];

export function ObjectsPage() {
  const home = useCurrentHome();
  useDocumentTitle(`Oggetti e impianti · ${home.name}`);
  const heading = (
    <>
      <BackToCasa homeId={home.id} />
      <div className={pages.heading}>
        <div>
          <span className={pages.eyebrow}>{home.name}</span>
          <h1 tabIndex={-1}>Oggetti e impianti</h1>
          <p className={pages.lead}>
            I tuoi oggetti, visibili solo a te, e le tue schede caldaia. Una caldaia compare una volta sola: la sua scheda tecnica
            resta quella originale.
          </p>
        </div>
      </div>
    </>
  );
  return (
    <ObjectsGate home={home} heading={heading}>
      {(caps) => (
        <>
          {heading}
          <CatalogContent home={home} caps={caps} />
        </>
      )}
    </ObjectsGate>
  );
}

function CatalogContent({ home, caps }: { home: Home; caps: ObjectCapabilities }) {
  const account = useAccount();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => catalogFiltersFromParams(params), [params]);
  const creating = params.get('nuovo') === '1';
  const presetRoomId = params.get('ambiente');
  const canEdit = home.permissions.includes('edit');
  const id = useId();
  const [draft, setDraft] = useState(filters.q);
  const [basis, setBasis] = useState(filters.q);
  if (basis !== filters.q) {
    setBasis(filters.q);
    setDraft(filters.q);
  }
  const [queryError, setQueryError] = useState<string>();
  const rooms = useRooms(home.id, { state: 'active' });
  const roomItems = rooms.data?.pages.flatMap((p) => p.items) ?? [];
  const catalog = useCatalog(home.id, filters);
  const forget = useForgetObjects(home.id);
  const forbidden = catalog.isError && isForbidden(catalog.error);
  useEffect(() => {
    if (forbidden) forget();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una sola pulizia per ogni 403
  }, [forbidden]);
  const items = catalog.data?.pages.flatMap((p) => p.items) ?? [];
  const filtered = filters.q !== '' || filters.type !== null || filters.roomId !== null || filters.placement !== 'all' || filters.state !== 'active';

  const apply = (next: CatalogFilters) => {
    const p = catalogFiltersToParams(next);
    if (creating) p.set('nuovo', '1');
    setParams(p);
  };
  const setCreating = (on: boolean) => {
    const next = new URLSearchParams(params);
    if (on) next.set('nuovo', '1');
    else next.delete('nuovo');
    setParams(next, { replace: !on });
  };
  // «Ambiente» e «Da collocare» stanno nello stesso selettore: combinazione incompatibile impossibile.
  const whereValue = filters.roomId ?? (filters.placement === 'unplaced' ? '__unplaced__' : '');
  const returnState = { objectsSearch: catalogFiltersToParams(filters).toString(), objectsAccountId: account.id };

  return (
    <div className={pages.stack}>
      {canEdit && !creating && (
        <p className={styles.actions}>
          <button type="button" className={cx(ui.btn, ui.primary)} onClick={() => setCreating(true)}>
            <Icon name="plus" />
            Aggiungi oggetto
          </button>
        </p>
      )}
      {!canEdit && <p className={pages.muted}>Con il tuo ruolo puoi consultare i tuoi oggetti già esistenti, non aggiungerne o modificarli.</p>}
      {canEdit && creating && (
        <ObjectForm
          home={home}
          capabilities={caps}
          presetRoomId={presetRoomId && roomItems.some((r) => r.id === presetRoomId) ? presetRoomId : null}
          onCancel={() => setCreating(false)}
          onDone={(object) => navigate(objectPath(home.id, object.ref), { state: returnState })}
        />
      )}

      <section className={ui.card} aria-labelledby="oggetti-elenco">
        <h2 id="oggetti-elenco" className={pages.cardTitle}>
          Elenco
        </h2>
        <form
          role="search"
          aria-label="Cerca tra i tuoi oggetti"
          className={own.searchRow}
          onSubmit={(e) => {
            e.preventDefault();
            const q = draft.normalize('NFC').trim();
            const problem = validateQuery(q);
            setQueryError(problem);
            if (problem) return;
            apply({ ...filters, q });
          }}
        >
          <label className={ui.label} htmlFor={`${id}-q`}>
            Cerca per nome
          </label>
          <input
            id={`${id}-q`}
            className={ui.input}
            type="search"
            autoComplete="off"
            value={draft}
            aria-invalid={queryError ? true : undefined}
            aria-describedby={queryError ? `${id}-q-error` : undefined}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" className={cx(ui.btn, ui.small)}>
            Cerca
          </button>
          {queryError && (
            <span id={`${id}-q-error`} className={ui.fieldError}>
              {queryError}
            </span>
          )}
        </form>
        <div className={styles.filters} role="group" aria-label="Filtri degli oggetti">
          <label className={styles.filter}>
            Dove
            <select
              className={styles.select}
              value={whereValue}
              onChange={(e) => {
                const v = e.target.value;
                apply({ ...filters, roomId: v && v !== '__unplaced__' ? v : null, placement: v === '__unplaced__' ? 'unplaced' : 'all' });
              }}
            >
              <option value="">Tutti gli ambienti</option>
              <option value="__unplaced__">{UNPLACED_LABEL}</option>
              {filters.roomId && !roomItems.some((r) => r.id === filters.roomId) && <option value={filters.roomId}>Ambiente selezionato</option>}
              {roomItems.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.filter}>
            Tipo
            <select className={styles.select} value={filters.type ?? ''} onChange={(e) => apply({ ...filters, type: (e.target.value || null) as CatalogFilters['type'] })}>
              <option value="">Tutti i tipi</option>
              {[...caps.types, 'boiler' as const].map((t) => (
                <option key={t} value={t}>
                  {OBJECT_TYPE_LABEL[t] ?? t}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.filter}>
            Stato
            <select className={styles.select} value={filters.state} onChange={(e) => apply({ ...filters, state: e.target.value as CatalogFilters['state'] })}>
              {STATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {rooms.hasNextPage && (
          <p className={pages.small}>
            <button type="button" className={cx(ui.btn, ui.small)} onClick={() => void rooms.fetchNextPage()} disabled={rooms.isFetchingNextPage}>
              Carica altri ambienti nel filtro
            </button>
          </p>
        )}
        {catalog.isPending ? (
          <Loading label={filtered ? 'Ricerca in corso…' : 'Caricamento degli oggetti…'} />
        ) : forbidden || (catalog.isError && !catalog.data) ? (
          <ErrorState title="Oggetti non disponibili" error={catalog.error} message={objectsErrorMessage(catalog.error)} onRetry={forbidden ? undefined : () => void catalog.refetch()} retrying={catalog.isFetching} />
        ) : items.length === 0 ? (
          <div role="status">
            <p className={pages.muted}>{filtered ? 'Nessun oggetto corrisponde a questi filtri.' : 'Non hai ancora oggetti o schede caldaia in questa casa.'}</p>
            {filtered && (
              <button type="button" className={cx(ui.btn, ui.small)} onClick={() => apply({ state: 'active', q: '', type: null, roomId: null, placement: 'all' })}>
                Azzera filtri
              </button>
            )}
          </div>
        ) : (
          <ul className={styles.list} aria-label="Oggetti">
            {items.map((o) => (
              <CatalogRow key={`${o.ref.kind}:${o.ref.id}`} item={o} homeId={home.id} state={returnState} />
            ))}
          </ul>
        )}
        {catalog.isFetchNextPageError && <ErrorState title="Altri oggetti non caricati" error={catalog.error} message={objectsErrorMessage(catalog.error)} />}
        {catalog.hasNextPage && (
          <p className={pages.spaced}>
            <button type="button" className={ui.btn} onClick={() => void catalog.fetchNextPage()} disabled={catalog.isFetchingNextPage}>
              {catalog.isFetchingNextPage ? 'Caricamento…' : 'Mostra altri oggetti'}
            </button>
          </p>
        )}
      </section>
    </div>
  );
}

function CatalogRow({ item, homeId, state }: { item: CatalogItem; homeId: string; state: unknown }) {
  return (
    <li className={styles.item}>
      <div className={styles.itemHead}>
        <Link to={objectPath(homeId, item.ref)} state={state} className={styles.title}>
          {item.name}
        </Link>
        <span className={styles.due}>{item.ref.kind === 'boiler' ? item.kindLabel || 'Caldaia' : typeLabel(item)}</span>
        {item.state === 'archived' && <span className={styles.due}>Archiviato</span>}
      </div>
      <span className={cx(styles.meta, own.position)}>
        {roomsText(item.position.rooms)}
        {item.ref.kind === 'boiler' ? ' · scheda tecnica personale' : ''}
      </span>
    </li>
  );
}

const KINDS: ObjectKind[] = ['object', 'boiler'];

export function ObjectDetailPage() {
  const home = useCurrentHome();
  const account = useAccount();
  const location = useLocation();
  const { kind = '', objectId = '' } = useParams();
  const back = (
    <Link to={backToCatalog(home.id, location.state, account.id)} className={pages.spaced}>
      ← Oggetti e impianti
    </Link>
  );
  // Tipo di riferimento non valido: nessuna richiesta, come un ID non valido (422).
  if (!KINDS.includes(kind as ObjectKind)) {
    return (
      <Unavailable back={back} title="Indirizzo non valido">
        L’indirizzo non corrisponde a un oggetto valido.
      </Unavailable>
    );
  }
  return (
    <ObjectsGate home={home} heading={<>{back}<h1 className="visually-hidden" data-pending="">Oggetto</h1></>}>
      {(caps) => <ObjectDetail key={`${kind}:${objectId}`} home={home} kind={kind as ObjectKind} id={objectId} caps={caps} back={back} />}
    </ObjectsGate>
  );
}

function ObjectDetail(props: { home: Home; kind: ObjectKind; id: string; caps: ObjectCapabilities; back: ReactNode }) {
  const { home } = props;
  const ref = useMemo(() => ({ kind: props.kind, id: props.id }), [props.kind, props.id]);
  const query = useObject(home.id, ref);
  const versionOf = (o: CatalogItem) => `${o.version ?? 0}:${o.position.version}`;
  const [firstVersion, setFirstVersion] = useState<string | null>(null);
  if (query.data && firstVersion === null) setFirstVersion(versionOf(query.data));
  if (query.isPending) {
    return (
      <>
        {props.back}
        <h1 className="visually-hidden" data-pending="">
          Oggetto
        </h1>
        <Loading label="Caricamento dell’oggetto…" />
      </>
    );
  }
  if (query.isError) {
    const status = isApiError(query.error) && query.error.kind === 'http' ? query.error.status : 0;
    if (status === 403 || status === 422) {
      return (
        <Unavailable back={props.back} title={status === 403 ? 'Oggetto non disponibile' : 'Indirizzo non valido'}>
          {status === 403 ? 'Questo account non ha accesso all’oggetto richiesto.' : 'L’indirizzo non corrisponde a un oggetto valido.'}
        </Unavailable>
      );
    }
    return (
      <>
        {props.back}
        <h1 tabIndex={-1}>Oggetto</h1>
        <ErrorState error={query.error} message={objectsErrorMessage(query.error)} onRetry={() => void query.refetch()} retrying={query.isFetching} />
      </>
    );
  }
  const v = versionOf(query.data);
  return (
    <ObjectView key={v} home={home} object={query.data} caps={props.caps} back={props.back} focusActions={firstVersion !== null && v !== firstVersion} />
  );
}

type Panel = 'none' | 'edit' | 'position' | 'state';

function ObjectView(props: { home: Home; object: CatalogItem; caps: ObjectCapabilities; back: ReactNode; focusActions: boolean }) {
  const { home, object } = props;
  useDocumentTitle(`${object.name} · ${home.name}`);
  const [panel, setPanel] = useState<Panel>('none');
  const isBoiler = object.ref.kind === 'boiler';
  const active = object.state === 'active';
  const canEdit = home.permissions.includes('edit') && object.permissions.includes('edit');
  const history = useObjectHistory(home.id, object.ref);
  const expenseCaps = useExpenseCapabilities(home.id);
  const activityCaps = useActivityCapabilities(home.id);
  const actionsRef = useFocusAfterVersion(props.focusActions);
  const base = `/home/${encodeURIComponent(home.id)}`;

  return (
    <>
      {props.back}
      <div className={pages.heading}>
        <div>
          <span className={pages.eyebrow}>{home.name} · {isBoiler ? 'Scheda caldaia personale' : 'Oggetto personale'}</span>
          <h1 tabIndex={-1}>{object.name}</h1>
          <div className={styles.actions}>
            <Tag tone="blue">{object.ref.kind === 'boiler' ? object.kindLabel || 'Caldaia' : typeLabel(object)}</Tag>
            {!active && <Tag>Archiviato</Tag>}
          </div>
        </div>
      </div>
      <div className={pages.stack}>
        <section className={ui.card} aria-labelledby="oggetto-dati">
          <h2 id="oggetto-dati" className={pages.cardTitle}>
            Dettagli
          </h2>
          <dl className={pages.detailList}>
            <dt>Tipo</dt>
            <dd>{typeLabel(object)}</dd>
            <dt>Dove si trova</dt>
            <dd className={own.position}>{roomsText(object.position.rooms)}</dd>
            {!isBoiler && (
              <>
                <dt>Nota</dt>
                <dd className={styles.description}>{object.note ?? '—'}</dd>
              </>
            )}
          </dl>
          {isBoiler && object.technicalLink && (
            <p className={pages.spaced}>
              <Link to={`${base}/impianti/${encodeURIComponent(object.technicalLink.assetId)}`} className={ui.btn}>
                Apri la scheda tecnica
              </Link>
            </p>
          )}
          <p className={cx(pages.small, pages.muted, pages.spaced)}>
            {isBoiler
              ? 'Proposte, conferme e storia tecnica restano nella scheda caldaia originale: qui ne vedi posizione e collegamenti.'
              : 'Oggetto personale, visibile solo a te. Non contiene dati tecnici verificati.'}
          </p>
        </section>

        {canEdit && panel !== 'edit' && panel !== 'position' && (
          <div ref={actionsRef} className={styles.actions}>
            {!isBoiler && active && (
              <button type="button" className={cx(ui.btn, ui.primary)} onClick={() => setPanel('edit')}>
                Modifica
              </button>
            )}
            {active && (
              <button type="button" className={ui.btn} onClick={() => setPanel('position')}>
                Cambia posizione
              </button>
            )}
            {!isBoiler && (
              <button type="button" className={ui.btn} onClick={() => setPanel('state')}>
                {active ? 'Archivia' : 'Ripristina'}
              </button>
            )}
          </div>
        )}
        {!canEdit && <p className={pages.muted}>Con il tuo ruolo puoi consultare questo oggetto, non modificarlo.</p>}
        {panel === 'edit' && !isBoiler && (
          <ObjectForm home={home} capabilities={props.caps} object={object} onCancel={() => setPanel('none')} onDone={() => setPanel('none')} />
        )}
        {panel === 'position' && (
          <PositionEditor home={home} capabilities={props.caps} object={object} onCancel={() => setPanel('none')} onDone={() => setPanel('none')} />
        )}
        {panel === 'state' && !isBoiler && (
          <StateDialog
            homeId={home.id}
            title={active ? 'Archivia oggetto' : 'Ripristina oggetto'}
            hint={
              active
                ? 'L’oggetto esce dall’elenco degli attivi. Non viene cancellato: posizione, collegamenti e storia restano, e documenti o costi non cambiano.'
                : 'L’oggetto torna attivo con gli stessi dati, posizione e collegamenti.'
            }
            vars={{ kind: active ? 'objectArchive' : 'objectRestore', ref: object.ref, body: { expectedVersion: object.version ?? 1 } }}
            onClose={() => setPanel('none')}
          />
        )}

        <LinksSection home={home} object={object} resourceType="document" />
        <LinksSection home={home} object={object} resourceType="expense" expenseCapabilities={expenseCaps.data} />
        <LinksSection home={home} object={object} resourceType="activity" activityCapabilities={activityCaps.data} />
        <G1History
          title="Storia dell’oggetto"
          id="oggetto-storia"
          query={history}
          note={isBoiler ? 'Solo posizione e collegamenti: la storia tecnica è nella scheda caldaia.' : undefined}
        />
      </div>
    </>
  );
}
