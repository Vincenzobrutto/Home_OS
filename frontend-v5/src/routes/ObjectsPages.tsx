import {KeepHouseDocuments} from '../objects/KeepHouseDocuments';
import {DotsThree} from '@phosphor-icons/react/dist/csr/DotsThree';
import {CaretDown} from '@phosphor-icons/react/dist/csr/CaretDown';
import detail from '../objects/detail.module.css';
import { CatalogContent } from '../objects/Catalog';
import { ContactsPanel } from '../contacts/components';
import { contextReturn } from '../lib/contextReturn';
import { PurchaseSummary } from '../objects/PurchaseSummary';
import { WarrantyReminder, WarrantySummary } from '../objects/Warranty';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { isApiError } from '../api/errors';
import type { CatalogItem, Home, ObjectCapabilities, ObjectKind } from '../api/types';
import { useActivityCapabilities } from '../activities/hooks';
import { ErrorState, Loading, Tag, cx, ui, useDocumentTitle } from '../components/ui';
import { useExpenseCapabilities } from '../expenses/hooks';
import { useEconomyCapabilities } from '../economy/hooks';
import { G1History } from '../objects/History';
import { LinksSection, ObjectForm, PositionEditor, QuickPlacement, StateDialog, objectStyles as styles, roomsText, typeLabel } from '../objects/components';
import { useObject, useObjectHistory } from '../objects/hooks';
import {
  backToCatalog,
  objectsErrorMessage,
} from '../lib/objects';
import { useAccount } from '../session/session';
import { BackToCasa, ObjectsGate, Unavailable, useFocusAfterVersion } from './RoomsPages';
import { useCurrentHome } from './HomePages';
import pages from './pages.module.css';
import { ProfileSection } from '../object-onboarding/ProfileSection';
import { ReceiptComparisons, ReceiptObjectFields } from '../receipt-integration/Surfaces';
import { ManualSection } from '../objects/ManualSection';

export function ObjectsPage() {
  const home = useCurrentHome();
  const account=useAccount();
  useDocumentTitle(`Oggetti e impianti · ${home.name}`);
  const heading = (
    <>
      <BackToCasa homeId={home.id} />
      <div className={pages.heading}>
        <div>

          <h1 tabIndex={-1}>Oggetti e impianti</h1>
          <p className={pages.muted}>I tuoi oggetti e impianti, visibili solo a te.</p>
        </div>
      </div>
    </>
  );
  return (
    <ObjectsGate home={home} heading={heading}>
      {(caps) => (
        <>
          {heading}
          <CatalogContent key={`${account.id}:${home.id}`} home={home} caps={caps} />
        </>
      )}
    </ObjectsGate>
  );
}

const KINDS: ObjectKind[] = ['object', 'boiler'];

export function ObjectDetailPage() {
  const home = useCurrentHome();
  const account = useAccount();
  const location = useLocation();
  const { kind = '', objectId = '' } = useParams();
  const origin = contextReturn(location.state, account.id, home.id);
  const back = (
    <Link to={origin?.path ?? backToCatalog(home.id, location.state, account.id)} className={pages.spaced}>
      ← {origin?.label ?? 'Oggetti e impianti'}
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
    <ObjectView key={v} home={home} object={query.data} caps={props.caps} back={props.back} focusActions={firstVersion !== null && (query.data.version??0) !== Number(firstVersion.split(':')[0])} focusPlacement={firstVersion !== null && query.data.position.version !== Number(firstVersion.split(':')[1])} />
  );
}

type Panel = 'none' | 'edit' | 'position' | 'state' | 'profile' | 'houseDocuments';

function ObjectView(props: { home: Home; object: CatalogItem; caps: ObjectCapabilities; back: ReactNode; focusActions: boolean; focusPlacement:boolean }) {
  const { home, object } = props;
  useDocumentTitle(`${object.name} · ${home.name}`);
  const [panel, setPanel] = useState<Panel>('none');
  const isBoiler = object.ref.kind === 'boiler';
  const active = object.state === 'active';
  const canEdit = home.permissions.includes('edit') && object.permissions.includes('edit');
  const history = useObjectHistory(home.id, object.ref);
  const expenseCaps = useExpenseCapabilities(home.id);
  const economyCaps = useEconomyCapabilities(home.id);
  const activityCaps = useActivityCapabilities(home.id);
  const actionsRef = useFocusAfterVersion(props.focusActions);
  const base = `/home/${encodeURIComponent(home.id)}`;

  const finishPanel=()=>{setPanel('none');requestAnimationFrame(()=>{const target=panel==='position'?document.querySelector<HTMLSelectElement>('form[aria-label="Collocazione dell’oggetto"] select'):document.getElementById('object-edit-button');target?.focus();});};
  const [menu,setMenu]=useState(false),[more,setMore]=useState(false),[reminding,setReminding]=useState(false);
  return <div className={detail.page}>
    {props.back}
    <header className={detail.header}>
      <div><h1 tabIndex={-1}>{object.name}</h1><div className={styles.actions}><Tag tone="blue">{isBoiler?object.kindLabel||'Caldaia':typeLabel(object)}</Tag><span className={pages.muted}>Visibile solo a te</span>{!active&&<Tag>Archiviato</Tag>}</div></div>
      {canEdit&&panel==='none'&&<div ref={actionsRef} className={detail.headerActions} onKeyDown={e=>{if(e.key==='Escape'){setMenu(false);setMore(false);}}}>
        {!isBoiler&&active&&<div className={detail.menu}><button id="object-edit-button" type="button" className={cx(ui.btn,ui.primary)} aria-expanded={menu} onClick={()=>{setMenu(!menu);setMore(false);}}>Modifica <CaretDown size={16} aria-hidden="true"/></button>{menu&&<div className={detail.menuItems}><button className={ui.btn} onClick={()=>{setPanel('edit');setMenu(false);}}>Nome e tipo</button>{object.profile&&!object.profile.unavailable&&<button className={ui.btn} onClick={()=>{setPanel('profile');setMenu(false);}}>Dati e garanzia</button>}</div>}</div>}
        {!isBoiler&&(!active?<button className={ui.btn} onClick={()=>setPanel('state')}>Ripristina</button>:<div className={detail.menu}><button className={ui.btn} aria-label="Altre azioni" aria-expanded={more} onClick={()=>{setMore(!more);setMenu(false);}}><DotsThree size={22} aria-hidden="true"/></button>{more&&<div className={detail.menuItems}><button className={ui.btn} onClick={()=>{setPanel('houseDocuments');setMore(false);}}>Sposta in Documenti della casa</button><button className={ui.btn} onClick={()=>{setPanel('state');setMore(false);}}>Archivia</button></div>}</div>)}
      </div>}
    </header>
    <section className={detail.placement} aria-labelledby="oggetto-dati"><h2 id="oggetto-dati" className="visually-hidden">Dettagli</h2>
      {canEdit&&active&&panel==='none'?<QuickPlacement home={home} object={object} focus={props.focusPlacement} onMultiple={()=>setPanel('position')}/>:panel==='position'?<PositionEditor home={home} capabilities={props.caps} object={object} onCancel={finishPanel} onDone={finishPanel}/>:<p>Dove si trova: {roomsText(object.position.rooms)}</p>}
      {object.note&&<p>{object.note}</p>}
      {isBoiler&&object.technicalLink&&<Link className={ui.btn} to={`${base}/impianti/${object.technicalLink.assetId}`}>Apri la scheda tecnica</Link>}
    </section>
    {!canEdit&&<p className={pages.muted}>Con il tuo ruolo puoi consultare questo oggetto, non modificarlo.</p>}
    {panel==='edit'&&!isBoiler&&<ObjectForm home={home} capabilities={props.caps} object={object} onCancel={finishPanel} onDone={finishPanel}/>}<div hidden={panel==='edit'}>
      {!isBoiler&&<div className={detail.summary}><PurchaseSummary homeId={home.id} object={object} enabled={!!economyCaps.data?.enabled} compact/><WarrantySummary home={home} object={object} canRemind={canEdit&&active&&!!activityCaps.data&&panel==='none'} onRemind={()=>setReminding(true)}/></div>}
      {reminding&&!isBoiler&&<div className={detail.reminder}><WarrantyReminder home={home} object={object} activityCapabilities={activityCaps.data} onClose={()=>setReminding(false)}/></div>}
      <div className={detail.grid}>
        <div className={detail.main}>
          {!isBoiler&&<>{object.profile?<ProfileSection object={object} homeId={home.id} canEdit={canEdit} compact detailLayout editMode={panel==='profile'} onEditModeChange={editing=>{if(editing)setPanel('profile');else finishPanel();}}/>:<ReceiptObjectFields objectId={object.ref.id}/>}<ReceiptComparisons objectId={object.ref.id}/></>}
          <section className={detail.documents} aria-label="Documenti e manuali"><h2>Documenti e manuali</h2><LinksSection home={home} object={object} resourceType="document" compact={!isBoiler}/>{!isBoiler&&<ManualSection homeId={home.id} object={object} canEdit={canEdit} compact/>}</section>
        </div>
        <div className={detail.aside}><LinksSection home={home} object={object} resourceType="expense" expenseCapabilities={expenseCaps.data} economyEnabled={!!economyCaps.data?.enabled&&!!economyCaps.data?.features.history} compact={!isBoiler}/><LinksSection home={home} object={object} resourceType="activity" activityCapabilities={activityCaps.data} compact={!isBoiler}/></div>
      </div>
      <div className={detail.secondary}><details><summary>Contatti</summary><ContactsPanel homeId={home.id} resource={{kind:object.ref.kind,id:object.ref.id}} canEdit={canEdit}/></details><details><summary>Storia dell’oggetto</summary><G1History title="Storia dell’oggetto" id="oggetto-storia" query={history} note={isBoiler?'Solo posizione e collegamenti: la storia tecnica è nella scheda caldaia.':undefined}/></details></div>
    </div>
    {panel==='houseDocuments'&&!isBoiler&&<KeepHouseDocuments homeId={home.id} objectId={object.ref.id} onClose={finishPanel}/>}
    {panel==='state'&&!isBoiler&&<StateDialog homeId={home.id} title={active?'Archivia oggetto':'Ripristina oggetto'} hint={active?'L’oggetto esce dall’elenco degli attivi. Non viene cancellato: posizione, collegamenti e storia restano, e documenti o costi non cambiano.':'L’oggetto torna attivo con gli stessi dati, posizione e collegamenti.'} vars={{kind:active?'objectArchive':'objectRestore',ref:object.ref,body:{expectedVersion:object.version??1}}} onClose={finishPanel}/>}
  </div>;
}
