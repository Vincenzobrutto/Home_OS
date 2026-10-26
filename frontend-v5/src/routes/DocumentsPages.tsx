import {ArchiveFamilies} from '../documents/ArchiveFamilies';
import {canonicalFamily,familyLabel} from '../documents/families';
import { DocumentEditorWorkspace } from '../documents/DocumentEditorWorkspace';
import {ChangeHouseFamily} from '../documents/ChangeHouseFamily';
import {ChangeDocumentType} from '../documents/ChangeDocumentType';
import {documentExamplesEnabled} from '../documents/exampleEnvironment';
import {DocumentRowContext} from '../documents/DocumentRowContext';
import { documentTypeLabels,documentDisplayTitle } from '../documents/presentation';
import { BulkDocumentCompilation } from '../documents/BulkDocumentCompilation';
import { IntakePage } from '../intake-integration/IntakePage';
import { DocumentWorkspaceActions } from '../documents/DocumentWorkspaceActions';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { safeFilename } from '../api/client';
import { isApiError, userMessage } from '../api/errors';
import { newIdempotencyKey } from '../api/queryKeys';
import type { DocumentDetail, DocumentSearchFilters, DocumentSummary, DocumentVisibility, Home } from '../api/types';
import { Icon } from '../components/Icon';
import { ExportIconButton } from '../components/ExportIconButton';
import { Banner, ErrorState, Field, Loading, Tag, cx, ui, useDocumentTitle } from '../components/ui';
import {
  useDocumentSearch,
  useDocumentSearchCapabilities,
  useExportDocuments,
  useForgetHomeDocuments,
  useUploadDocument,
} from '../documents/hooks';
import { DocumentViews, HouseDocumentGroups, OtherDocumentResults } from '../documents/DocumentViews';
import { useCasaDocumentCounts } from './CasaDocumentsSummary';
import { SearchForm } from '../documents/SearchForm';
import { PersonalExportPanel } from '../documents/PersonalExportPanel';
import { useAccount, useSession } from '../session/session';
import {
  EMPTY_FILTERS,
  QUERY_MAX_CODE_POINTS,
  SEARCH_SCOPE_NOTE,
  describeFilters,
  filtersFromParams,
  filtersKey,
  filtersToParams,
  isFiltered,
  isForbidden,
  searchUnavailableMessage,
  validateQuery,
} from '../lib/documentSearch';
import {
  ACCEPT_ATTRIBUTE,
  MAX_EXPORT_DOCUMENTS,
  VISIBILITY_HINT,
  VISIBILITY_LABEL,
  exportProblem,
  formatBytes,
  formatDate,
  formatLabel,
  saveBlob,
  validateDocumentName,
  validateUploadFile,
} from '../lib/files';
import { useCurrentHome } from './HomePages';
import { ExamplePdfs } from './ActivityPage';
import styles from './pages.module.css';
import docs from './documents.module.css';

/** Messaggio per gli errori di lettura dell'archivio. */
export function documentsErrorMessage(error: unknown) {
  if (isApiError(error) && error.kind === 'http') {
    // Backend senza endpoint documentali (o percorso inesistente): mai un archivio vuoto.
    if (error.status === 404) return 'L’archivio documenti non è ancora attivo su questo servizio.';
    if (error.status === 403) return 'Non hai accesso ai documenti di questa casa.';
  }
  return userMessage(error);
}

export function DocumentsPage() {
  const account=useAccount();
  const location=useLocation();
  const cache=useQueryClient();
  const home = useCurrentHome();
  const originKey=['account',account.id,'home',home.id,'documents-search-origin'];
  const viewKey=['account',account.id,'home',home.id,'documents-view'];
  useDocumentTitle(`Documenti · ${home.name}`);
  const canUpload = home.permissions.includes('edit');
  const [uploadOpen,setUploadOpen]=useState(false);
  const [familyNotice,setFamilyNotice]=useState<{accountId:string;homeId:string}|null>(null);
  const familyNoticeRef=useRef<HTMLParagraphElement>(null);
  useEffect(()=>{familyNoticeRef.current?.focus();},[familyNotice]);
  const canExport = home.permissions.includes('export');
  const [exportSlot, setExportSlot] = useState<HTMLSpanElement | null>(null);
  const [params, setParams] = useSearchParams();
  const uploadVisible=uploadOpen||params.has('aggiungi');
  const capabilities = useDocumentSearchCapabilities(home.id);
  const viewsEnabled = !!capabilities.data?.documentViews;
  const familiesEnabled=!!capabilities.data?.documentFamilies;
  const applied = useMemo<DocumentSearchFilters>(() => {
    const parsed = filtersFromParams(params);
    if(familiesEnabled){const related=parsed.related??(parsed.view==='house'?'house':parsed.view==='objects'?'objects':undefined);const group=canonicalFamily(parsed.group);return {...parsed,view:'archive',related,group,workflow:parsed.workflow??'all',...(parsed.collection==='house'?{collection:undefined,related:'house'}:{})};}
    const houseLink = viewsEnabled && parsed.collection === 'house';
    return {...parsed, ...(viewsEnabled ? {view: houseLink ? 'house' as const : parsed.view ?? 'all', ...(houseLink ? {collection:undefined} : {})} : {}),
      workflow: parsed.workflow ?? 'all'};
  }, [params, viewsEnabled,familiesEnabled]);
  const appliedKey = filtersKey(applied);
  const viewDocuments = useDocumentSearch(home.id, applied, viewsEnabled && !validateQuery(applied.q, capabilities.data?.limits.queryMaxCodePoints) && !params.has('oggetti-documento'));
  const summary = viewDocuments.isError ? undefined : viewDocuments.data?.pages[0]?.summary;
  const maxQuery = capabilities.data?.limits.queryMaxCodePoints ?? QUERY_MAX_CODE_POINTS;
  // Solo q/format/visibility nell'indirizzo; ?ricerca=1 (ingresso da Casa) non va all'API e cade alla prima ricerca applicata.
  const apply = (filters: DocumentSearchFilters, replace = false) => {
    if(!applied.q&&!filters.q)cache.removeQueries({queryKey:originKey,exact:true});
    const workflow=filters.workflow??applied.workflow;
    const next=filtersToParams({...filters,workflow,...(viewsEnabled?{view:familiesEnabled?'archive':filters.view??'all'}:{})});
    if(workflow==='all')next.set('workflow','all');
    setParams(next, { replace });
  };
  const beginSearch=()=>{
    if(!applied.q&&!cache.getQueryData(originKey)){
      cache.setQueryData(originKey,{filters:applied,snapshot:{filters:appliedKey,pages:viewDocuments.data?.pages.length??1,y:window.scrollY,
        openedFiles:Array.from(document.querySelectorAll<HTMLDetailsElement>('details[data-file-id][open]')).map(details=>details.dataset.fileId!)}});
    }
  };
  const applySearch=(filters:DocumentSearchFilters,replace=false)=>{
    if(!applied.q&&filters.q)beginSearch();
    if(applied.q&&!filters.q){
      const origin=cache.getQueryData<{filters:DocumentSearchFilters;snapshot:{filters:string;pages:number;y:number;openedFiles:string[]}}>(originKey);
      if(origin){cache.setQueryData(viewKey,origin.snapshot);cache.removeQueries({queryKey:originKey,exact:true});apply(origin.filters,replace);return;}
    }
    apply(filters,replace);
  };
  const closeUpload=(documentId?:string,batchId?:string,documentIds?:string[])=>{setUploadOpen(false);const next=filtersToParams({...applied,workflow:documentId?'pending':applied.workflow});if(documentId&&batchId){next.set('oggetti-documento',documentId);next.set('lotto',batchId);next.set('compila','manuale');if(documentIds?.length)next.set('coda',documentIds.join(','));}setParams(next,{replace:true});};

  if(params.has('oggetti-documento'))return <DocumentEditorWorkspace key={account.id+":"+home.id}/>;
  return (
    <>
      <div className={cx(styles.heading, docs.documentsHeading)}>
        <div>
          <span className={styles.eyebrow}>{home.name}</span>
          <div className={docs.titleActions}>
            <h1 tabIndex={-1}>{viewsEnabled?'Documenti':['house','floor_plans','building','energy','contracts','technical'].includes(applied.collection??'')?'Documenti della casa':'Documenti'}</h1>
            <span ref={setExportSlot} />
          </div>
          <p className={styles.lead}>Originali e dati salvati, in un unico archivio.</p>
        </div>
        {canUpload && (
          <div className={docs.toolbarActions}>
            <button type="button" className={cx(ui.btn,ui.primary)} aria-label="Aggiungi documenti" aria-expanded={uploadVisible} onClick={()=>{setParams(filtersToParams(applied));setUploadOpen(!uploadVisible);}}><Icon name="plus"/><span className={docs.viewDesktop}>Aggiungi documenti</span><span className={docs.viewMobile}>Aggiungi</span></button>
          </div>
        )}
      </div>
      {(()=>{const result=(location.state as {houseDocumentResult?:{accountId:string;homeId:string;count:number;archived:boolean}}|null)?.houseDocumentResult;return result?.accountId===account.id&&result.homeId===home.id&&Number.isSafeInteger(result.count)&&result.count>0&&result.count<=50?<Banner title="Documenti conservati nella casa"><p>{result.count} document{result.count===1?'o disponibile':'i disponibili'} nell’archivio documenti. File, spese e collegamenti sono conservati. {result.archived?'La scheda oggetto è stata archiviata e rimossa dalle stanze.':'La scheda oggetto resta nella sua stanza.'}</p></Banner>:null;})()}
      {params.has('documento-salvato')&&<Banner title="Documento salvato" actions={<button type="button" className={ui.btn} onClick={()=>apply({...applied,workflow:'completed'})}>Vai ai documenti completati</button>}><p>Il salvataggio è riuscito. Il documento e l’originale restano disponibili.</p></Banner>}
      {canUpload&&uploadVisible&&<section className={docs.panel}><IntakePage workspace onUploaded={closeUpload}/><button type="button" className={ui.btn} onClick={()=>closeUpload()}>Chiudi caricamento</button></section>}
      {!canUpload && (
        <p className={cx(docs.note, docs.panel)}>
          Con il tuo ruolo puoi consultare e scaricare i documenti visibili, non caricarne di nuovi.
        </p>
      )}

      {viewsEnabled && !familiesEnabled && <DocumentViews value={applied.view ?? 'all'} summary={summary} onChange={view => apply({...applied,view,group:undefined})}/>}
      {familyNotice?.accountId===account.id&&familyNotice.homeId===home.id&&<p role="status" tabIndex={-1} ref={familyNoticeRef}>Famiglia aggiornata. Tipo del documento e collegamenti invariati.</p>}
      {capabilities.isSuccess ? (
        <SearchForm
          home={home}
          applied={applied}
          maxQuery={maxQuery}
          collectionsEnabled={!!capabilities.data.collections}
          documentViewsEnabled={viewsEnabled}
          documentFamiliesEnabled={familiesEnabled}
          autoFocus={params.get('ricerca') === '1'}
          onApply={applySearch}
          onSearchStart={beginSearch}
        />
      ) : capabilities.isError && !isForbidden(capabilities.error) ? (
        <div className={docs.panel}>
          <Banner
            tone="warning"
            title="Ricerca non attiva"
            actions={
              <button
                type="button"
                className={cx(ui.btn, ui.small)}
                onClick={() => void capabilities.refetch()}
                disabled={capabilities.isFetching}
              >
                {capabilities.isFetching ? 'Nuovo tentativo…' : 'Riprova'}
              </button>
            }
          >
            <p>{searchUnavailableMessage(capabilities.error)}</p>
          </Banner>
        </div>
      ) : null}
      {!capabilities.isSuccess && <div className={docs.statusSegments} role="group" aria-label="Stato dei documenti">{([['all','Tutti'],['pending','Da fare'],['completed','Completati']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={applied.workflow===value} onClick={()=>apply({...applied,workflow:value})}>{label}</button>)}</div>}

      {!applied.q && applied.workflow === 'all' && <DocumentsToComplete homeId={home.id} onOpen={() => apply({...EMPTY_FILTERS,view:viewsEnabled?'all':undefined,workflow:'pending'})}/>}

      {/* Archivio rimontato a ogni cambio dei filtri applicati: prima pagina e selezione ZIP vuota. */}
      <DocumentsArchive
        key={appliedKey}
        home={home}
        filters={applied}
        searchState={capabilities.isSuccess ? 'ready' : capabilities.isError ? 'unavailable' : 'pending'}
        maxQuery={maxQuery}
        onReset={() => apply({...EMPTY_FILTERS,workflow:'all'})}
        canExport={canExport}
        exportSlot={exportSlot}
        canUpload={canUpload}
        onGroup={group => apply({...applied,group})}
        onFamilyChanged={group=>{setFamilyNotice({accountId:account.id,homeId:home.id});apply({...applied,group});}}
        onView={view=>apply({...applied,view,group:undefined})}
      />
      {canUpload && documentExamplesEnabled() && (
        <div className={styles.spaced}>
          <details><summary>Documenti di esempio</summary><ExamplePdfs homeId={home.id} /></details>
        </div>
      )}
    </>
  );
}

function DocumentsToComplete({homeId,onOpen}:{homeId:string;onOpen:()=>void}) {
  const summary=useCasaDocumentCounts(homeId);
  if(!summary.isSuccess||summary.isError)return null;
  const total=(['to_compile','review','analyzing','attention'] as const).reduce((sum,key)=>sum+summary.data.counts[key],0);
  if(!total)return null;
  return <p className={docs.pendingNotice}><span>{total} document{total===1?'o':'i'} da completare nell’archivio</span><button type="button" className={ui.btn} onClick={onOpen}>Apri</button></p>;
}

function DocumentsArchive(props: {
  home: Home;
  filters: DocumentSearchFilters;
  /** Stato delle capabilities H2: i filtri si applicano solo con la ricerca attiva. */
  searchState: 'ready' | 'pending' | 'unavailable';
  maxQuery: number;
  onReset: () => void;
  canExport: boolean;
  exportSlot: HTMLSpanElement | null;
  canUpload: boolean;
  onGroup: (group?: DocumentSearchFilters['group']) => void;
  onFamilyChanged: (group:NonNullable<DocumentSearchFilters['group']>)=>void;
  onView: (view:NonNullable<DocumentSearchFilters['view']>)=>void;
}) {
  const { home, canExport, filters } = props;
  const account = useAccount(), cache = useQueryClient();
  const viewKey = ['account', account.id, 'home', home.id, 'documents-view'];
  const [restore] = useState(() => cache.getQueryData<{filters:string;pages:number;y:number;focus?:string;openedFiles?:string[]}>(viewKey));
  const restored = useRef(false);
  const filtered = isFiltered(filters);
  const searchFiltered = isFiltered({...filters,workflow:'all'});
  const queryProblem = filtered ? validateQuery(filters.q, props.maxQuery) : undefined;
  // Senza filtri: lista M2, consultabile anche se la ricerca non è attiva.
  // Con filtri: solo a ricerca attiva e query valida, mai una ricerca locale sulle pagine già caricate.
  const runnable = !searchFiltered || (props.searchState === 'ready' && !queryProblem);
  const documents = useDocumentSearch(home.id, filters, runnable);
  const {data,hasNextPage,isFetchingNextPage,isFetchNextPageError,fetchNextPage} = documents;
  useEffect(() => {
    if (restored.current || !restore || restore.filters !== filtersKey(filters) || !data || documents.isError) return;
    if (data.pages.length < restore.pages && hasNextPage && !isFetchNextPageError) { if (!isFetchingNextPage) void fetchNextPage(); return; }
    const frame = requestAnimationFrame(() => { restored.current=true; if (restore.focus) document.getElementById(restore.focus)?.focus({preventScroll:true}); window.scrollTo(0,restore.y); });
    return () => cancelAnimationFrame(frame);
  }, [restore,filters,data,documents.isError,hasNextPage,isFetchNextPageError,isFetchingNextPage,fetchNextPage]);
  const exporter = useExportDocuments(home.id);
  const forget = useForgetHomeDocuments(home.id);
  const forbidden = documents.isError && isForbidden(documents.error);
  useEffect(() => {
    if (forbidden) forget();
    if (forbidden) {cache.removeQueries({queryKey:viewKey,exact:true});cache.removeQueries({queryKey:['account',account.id,'home',home.id,'documents-search-origin'],exact:true});}
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una sola pulizia per ogni 403
  }, [forbidden]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [selecting, setSelecting] = useState(false);
  const [aiSelected,setAiSelected]=useState<Set<string>>(()=>new Set());
  const [aiLocked,setAiLocked]=useState(false);
  const [aiSelecting,setAiSelecting]=useState(false);
  const [exported, setExported] = useState<number | null>(null);

  const items = useMemo(() => documents.data?.pages.flatMap((p) => p.items) ?? [], [documents.data]);
  const aiEligible = items.filter(doc => doc.workflowState !== 'completed' && !doc.aiAnalysisSucceeded && doc.workflowState !== 'review');
  const aiFirstPage = aiEligible.slice(0, 20);
  const selectedDocs = items.filter((d) => selected.has(d.id));
  const problem = exportProblem(selectedDocs);
  const totalBytes = selectedDocs.reduce((sum, d) => sum + d.byteSize, 0);

  if (searchFiltered && props.searchState === 'unavailable') {
    return (
      <div className={cx(ui.card, styles.unavailable)}>
        <h2 className={styles.cardTitle}>Filtri non applicati</h2>
        <p className={styles.muted}>
          La ricerca non è attiva, quindi i filtri indicati nell’indirizzo ({describeFilters(filters)}) non sono stati
          applicati. Nessun risultato è stato calcolato.
        </p>
        <button type="button" className={ui.btn} onClick={props.onReset}>
          Mostra tutti i documenti
        </button>
      </div>
    );
  }
  if (queryProblem) {
    return (
      <Banner
        tone="error"
        role="alert"
        title="Ricerca non valida"
        actions={
          <button type="button" className={cx(ui.btn, ui.small)} onClick={props.onReset}>
            Azzera filtri
          </button>
        }
      >
        <p>{queryProblem} Correggi il testo per aggiornare i risultati.</p>
      </Banner>
    );
  }
  if (documents.isPending) {
    return <Loading label={filtered ? 'Ricerca in corso…' : 'Caricamento dei documenti…'} />;
  }
  // 403 (accesso revocato): nessun risultato resta visibile, nemmeno quelli già ottenuti.
  if (forbidden) {
    return <ErrorState title="Accesso non consentito" error={documents.error} message={documentsErrorMessage(documents.error)} />;
  }
  // Errore senza pagine già caricate: niente elenco. Errore su "Mostra altri": elenco conservato.
  if (documents.isError && !documents.data) {
    return (
      <ErrorState
        title={filtered ? 'Ricerca non riuscita' : 'Archivio non disponibile'}
        error={documents.error}
        message={documentsErrorMessage(documents.error)}
        onRetry={() => void documents.refetch()}
        retrying={documents.isFetching}
      />
    );
  }

  const summary = data?.pages[0]?.summary;
  const house = filters.view === 'house' && summary;
  const archive=filters.view==='archive'&&summary;
  const grouped=!!archive&&!filters.q&&!selecting&&!aiSelecting;
  if (house && !filters.group) return <>
    {summary.views.house === 0 && <div className={docs.panel}><p>Nessun documento in questa vista{isFiltered({...filters,view:'all',group:undefined}) ? ' con i filtri attuali' : ''}.</p><OtherDocumentResults view="house" summary={summary} onChange={props.onView}/>{!summary.views.all&&<button type="button" className={ui.btn} onClick={props.onReset}>Mostra tutto l’archivio</button>}</div>}
    <HouseDocumentGroups summary={summary} onChange={props.onGroup}/>
  </>;
  if (house && !items.length) return <HouseDocumentGroups summary={summary} selected={filters.group} onChange={props.onGroup}>
    <p className={docs.groupEmpty}>{filters.q || filters.format!=='all' || filters.visibility!=='all' || filters.collection && filters.collection!=='all' || filters.workflow!=='all' ? 'Nessun risultato con questi filtri. Rimuovi un filtro o cerca in tutto l’archivio.' : 'Non hai ancora documenti di questa tipologia. Puoi aggiungerli da “Aggiungi documenti”.'}</p>
    {isFiltered({...filters,view:'all',group:undefined})&&<OtherDocumentResults view="house" summary={summary} onChange={props.onView}/>}
  </HouseDocumentGroups>;

  if (!archive && items.length === 0 && filtered) {
    return (
      <div className={cx(ui.card, styles.unavailable)}>
        {canExport && props.exportSlot && createPortal(<ExportIconButton label="Esporta ZIP" disabled={selecting} onClick={() => setSelecting(true)} hint={selecting ? 'Nessun documento in questa raccolta da esportare' : 'Apri le opzioni di esportazione'} />, props.exportSlot)}
        {canExport && selecting && <>
          <button type="button" className={ui.btn} onClick={() => setSelecting(false)}>Annulla selezione</button>
          <PersonalExportPanel homeId={home.id} />
        </>}
        <h2 className={styles.cardTitle}>{filters.view&&filters.view!=='all'?'Nessun documento in questa vista':filters.q||filters.format!=='all'||filters.visibility!=='all'||filters.collection&&filters.collection!=='all'?'Nessun documento corrisponde ai filtri':filters.workflow==='completed'?'Nessun documento completato':'Nessun documento da completare'}</h2>
        <p className={styles.muted} role="status">
          {isFiltered({...filters,workflow:'all',view:'all',group:undefined})?<>Filtri applicati: {describeFilters(filters)}. {SEARCH_SCOPE_NOTE} Prova un altro testo o rimuovi i filtri.</>:filters.workflow==='completed'?'I documenti appariranno qui dopo il salvataggio della revisione.':filters.workflow&&filters.workflow!=='all'?'Non ci sono documenti da completare. Rimuovi il filtro di stato per consultare l’archivio.':'Qui trovi i documenti collegati agli oggetti e agli impianti della casa.'}
        </p>
        <OtherDocumentResults view={filters.view??'all'} summary={summary} onChange={props.onView}/>
      </div>
    );
  }

  if (!archive && items.length === 0) {
    return (
      <div className={cx(ui.card, styles.unavailable)}>
        {canExport && props.exportSlot && createPortal(<ExportIconButton label="Esporta ZIP" disabled={selecting} onClick={() => setSelecting(true)} hint={selecting ? 'Nessun documento da esportare' : 'Apri le opzioni di esportazione'} />, props.exportSlot)}
        {canExport && selecting && <>
          <button type="button" className={ui.btn} onClick={() => setSelecting(false)}>Annulla selezione</button>
          <PersonalExportPanel homeId={home.id} />
        </>}
        <h2 className={styles.cardTitle}>Nessun documento in questa casa</h2>
        <p className={styles.muted}>
          {props.canUpload
            ? 'Carica il primo originale: PDF, JPEG o PNG fino a circa 21 MB.'
            : 'Non ci sono documenti visibili per il tuo account.'}
        </p>
      </div>
    );
  }

  const toggle = (id: string) => {
    setExported(null);
    exporter.reset();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runExport = () => {
    if (problem || exporter.isPending) return;
    const chosen = selectedDocs;
    exporter.mutate(chosen, {
      onSuccess: (zip) => {
        saveBlob(zip.blob, zip.filename ?? safeFilename(`Documenti ${home.name}.zip`));
        setExported(chosen.length);
        setSelected(new Set());
        setSelecting(false);
      },
    });
  };

  function documentList() { return <>
      <ul
        className={docs.list}
        aria-label={isFiltered({...filters,workflow:'all'}) ? `Risultati della ricerca in ${home.name}` : `Documenti di ${home.name}`}
      >
        {items.map((doc) => (
          <DocumentRow
            key={doc.id}
            doc={doc}
            fileDetailsOpen={restore?.filters===filtersKey(filters)&&restore.openedFiles?.includes(doc.id)||false}
            showTypeCorrection={props.canUpload&&!selecting&&!aiSelecting&&doc.permissions.includes('read')}
            archiveFamily={!!archive}
            inSelectedGroup={!!archive&&filters.group===doc.family}
            canChangeFamily={!!(house||archive)&&props.canUpload&&!selecting&&!aiSelecting}
            onFamilyChanged={props.onFamilyChanged}
            homeId={home.id}
            backSearch={filtersToParams(filters).toString()}
            selectable={canExport && selecting}
            selected={selected.has(doc.id)}
            onToggle={() => toggle(doc.id)}
            aiSelectable={props.canUpload&&!selecting&&aiSelecting&&doc.workflowState!=='completed'&&!doc.aiAnalysisSucceeded&&doc.workflowState!=='review'} aiSelected={aiSelected.has(doc.id)} aiLocked={aiLocked} onAiToggle={()=>setAiSelected(old=>{const next=new Set(old);if(next.has(doc.id))next.delete(doc.id);else if(doc.workflowState!=='completed'&&!doc.aiAnalysisSucceeded&&doc.workflowState!=='review')next.add(doc.id);return next;})}
          />
        ))}
      </ul>

      {documents.isFetchNextPageError && (
        <div className={docs.panel}>
          <ErrorState
            title="Altri documenti non caricati"
            error={documents.error}
            message={documentsErrorMessage(documents.error)}
          />
        </div>
      )}
      {documents.hasNextPage && (
        <div className={docs.more}>
          <button
            type="button"
            className={ui.btn}
            onClick={() => void documents.fetchNextPage()}
            disabled={documents.isFetchingNextPage}
          >
            {documents.isFetchingNextPage ? 'Caricamento…' : 'Mostra altri documenti'}
          </button>
        </div>
      )}
  </>; }

  return (
    <section aria-labelledby="archivio-title" onClickCapture={event => {
      const target = event.target as HTMLElement;
      const row = target.closest('li');
      if (!row || !target.closest('a,button')) return;
      cache.setQueryData(viewKey,{filters:filtersKey(filters),pages:documents.data?.pages.length??1,y:window.scrollY,focus:row.querySelector('a[id]')?.id,openedFiles:Array.from(event.currentTarget.querySelectorAll<HTMLDetailsElement>('details[data-file-id][open]')).map(details=>details.dataset.fileId!)});
    }}>
      {canExport && props.exportSlot && createPortal(
        <ExportIconButton label={exporter.isPending ? 'Preparazione ZIP…' : 'Esporta ZIP'}
          hint={exporter.isPending ? 'Preparazione ZIP…' : selecting ? problem || 'Scarica i documenti selezionati in ZIP' : 'Seleziona i documenti da esportare'}
          onClick={() => { if (selecting) runExport(); else { setExported(null); setSelecting(true); } }}
          disabled={selecting && !!problem} busy={exporter.isPending} />, props.exportSlot)}
      <h2 id="archivio-title" className="visually-hidden">
        Archivio
      </h2>
      {canExport && selecting && (
        <div className={docs.toolbar}>
          <div className={docs.toolbarInfo} aria-live="polite">
            <strong>
              {selected.size === 0
                ? 'Seleziona i documenti da esportare'
                : `${selectedDocs.length} selezionat${selectedDocs.length === 1 ? 'o' : 'i'} · ${formatBytes(totalBytes)}`}
            </strong>
            <span className={docs.limits}>
              ZIP con al massimo {MAX_EXPORT_DOCUMENTS} documenti e circa 105 MB complessivi: limite tecnico di questa
              versione.
              {' '}Lo ZIP contiene solo gli originali selezionati e un elenco dei file con i codici per verificarne l’integrità; attività, spese e oggetti si esportano separatamente dal riquadro dei dati personali qui sotto.
            </span>
            {selected.size > 0 && problem && <span className={docs.problem}>{problem}</span>}
          </div>
          <div className={docs.toolbarActions}>
            <button type="button" className={cx(ui.btn, ui.small)} disabled={exporter.isPending} onClick={() => {
              setSelecting(false); setSelected(new Set()); setExported(null); exporter.reset();
            }}>Annulla selezione</button>
            {selected.size > 0 && (
              <button
                type="button"
                className={cx(ui.btn, ui.small)}
                onClick={() => {
                  setSelected(new Set());
                  setExported(null);
                  exporter.reset();
                }}
              >
                Deseleziona
              </button>
            )}
          </div>
        </div>
      )}
      {props.canUpload&&!selecting&&filters.workflow!=='completed'&&(aiEligible.length>0||aiSelecting)&&<div className={docs.selectionToggle}><button type="button" className={ui.btn} aria-expanded={aiSelecting} onClick={()=>{setAiSelecting(v=>!v);setAiSelected(new Set());}} disabled={aiLocked}>{aiSelecting?'Annulla selezione AI':'Seleziona per compilare con l’AI'}</button></div>}
      {props.canUpload&&!selecting&&aiSelecting&&<div className={docs.toolbar}><label className={docs.bulkConsent}><input type="checkbox" checked={aiFirstPage.length>0&&aiFirstPage.every(d=>aiSelected.has(d.id))} disabled={aiLocked||!aiFirstPage.length} onChange={e=>setAiSelected(e.target.checked?new Set(aiFirstPage.map(d=>d.id)):new Set())}/>Seleziona {aiEligible.length>20?'i primi 20 documenti da completare':'tutti i documenti da completare mostrati'}</label><span>Sono esclusi i documenti completati e quelli già analizzati con successo. Riapri le proposte disponibili per confermarle.</span></div>}
      {/* A locked attempt preserves its exact authorized group for idempotent recovery. New attempts exclude completed records and successful extractions. */}
      {props.canUpload&&!selecting&&<BulkDocumentCompilation homeId={home.id} selected={items.filter(d=>aiSelected.has(d.id)&&(aiLocked||d.workflowState!=='completed'&&!d.aiAnalysisSucceeded&&d.workflowState!=='review'))} onClear={()=>setAiSelected(new Set())} onLocked={setAiLocked}/>}
      {canExport && selecting && <PersonalExportPanel homeId={home.id} />}

      {exporter.isError && (
        <div className={docs.panel}>
          <Banner tone="error" role="alert" title="Esportazione non eseguita">
            <p>{exportErrorMessage(exporter.error)}</p>
          </Banner>
        </div>
      )}
      {exported !== null && (
        <div className={docs.panel} role="status">
          <Banner title="ZIP pronto">
            <p>
              Lo ZIP con {exported} document{exported === 1 ? 'o' : 'i'} è stato scaricato. I documenti in Dimora non sono
              stati modificati.
            </p>
          </Banner>
        </div>
      )}

      {(filters.q || filters.format!=='all' || filters.visibility!=='all' || filters.collection && filters.collection!=='all') && (
        <h2 className={docs.searchResultsTitle} aria-live="polite">
          Risultati per {describeFilters({...filters,workflow:'all'})}
          {documents.hasNextPage ? ' — ce ne sono altri' : ''}
        </h2>
      )}
      {archive&&!items.length&&!grouped&&<p className={docs.groupEmpty}>Nessun documento con questi filtri. Prova un altro titolo o rimuovi i filtri.</p>}
      {archive&&summary.views.all===0&&<p className={docs.groupEmpty} role="status">{isFiltered({...filters,group:undefined})?'Nessun documento con i filtri attuali. Rimuovi un filtro o prova un altro titolo.':props.canUpload?'Non ci sono ancora documenti in questa casa. Usa “Aggiungi documenti” per caricare il primo originale.':'Non ci sono documenti visibili per il tuo account.'}</p>}
      {grouped ? <><p className={docs.archiveCount}>{summary.views.all} document{summary.views.all===1?'o':'i'} {isFiltered({...filters,group:undefined})?'con i filtri attuali':'nell’archivio'}</p><ArchiveFamilies summary={summary} selected={filters.group} onChange={props.onGroup}>{items.length?documentList():<p className={docs.groupEmpty}>Nessun documento in questa famiglia con i filtri attuali.</p>}</ArchiveFamilies></> : house ? <HouseDocumentGroups summary={summary} selected={filters.group} onChange={props.onGroup}>{filters.group==='other'&&props.canUpload&&<p className={docs.groupEmpty}>Usa “Cambia famiglia” per spostare un documento senza modificarne il tipo.</p>}{documentList()}</HouseDocumentGroups> : documentList()}

    </section>
  );
}

function exportErrorMessage(error: unknown) {
  if (isApiError(error) && error.kind === 'http') {
    if (error.status === 403) {
      return 'Almeno un documento selezionato non è esportabile con i tuoi permessi. Nessun file è stato esportato.';
    }
    if (error.code === 'export_too_large') return 'La selezione supera circa 105 MB complessivi. Nessun file è stato esportato.';
    if (error.status === 404) return 'L’esportazione non è ancora attiva su questo servizio.';
  }
  return `${userMessage(error)} Nessun file è stato esportato.`;
}

function DocumentRow(props: {
  doc: DocumentSummary;
  archiveFamily?:boolean;
  inSelectedGroup?:boolean;
  showTypeCorrection?:boolean;
  canChangeFamily?:boolean;
  onFamilyChanged:(group:NonNullable<DocumentSearchFilters['group']>)=>void;
  fileDetailsOpen?:boolean;
  homeId: string;
  /** Filtri applicati, per tornare dal dettaglio agli stessi risultati. */
  backSearch: string;
  selectable: boolean;
  selected: boolean;
  onToggle: () => void;
  aiSelectable:boolean;aiSelected:boolean;aiLocked:boolean;onAiToggle:()=>void;
}) {
  const { doc } = props;
  const account = useAccount();
  const exportable = doc.permissions.includes('export');
  const title=documentDisplayTitle(doc,'Documento senza titolo'),types=documentTypeLabels(doc.organization);
  const [fileOpen,setFileOpen]=useState(props.fileDetailsOpen??false);
  return (
    <li className={cx(docs.item, props.selected && docs.itemSelected)}>
      {props.aiSelectable&&<label className={docs.check}><input type="checkbox" checked={props.aiSelected} disabled={props.aiLocked} onChange={props.onAiToggle} aria-label={`Seleziona «${title}» per compilazione AI`}/></label>}
      {props.selectable && (
        <label className={docs.check} title={exportable ? undefined : 'Non esportabile con i tuoi permessi'}>
          <input
            type="checkbox"
            checked={props.selected}
            onChange={props.onToggle}
            disabled={!exportable}
            aria-label={`Seleziona «${title}» per lo ZIP${exportable ? '' : ' (non esportabile)'}`}
          />
        </label>
      )}
      <span className={docs.symbol} aria-hidden="true">
        <Icon name="document" />
      </span>
      <div className={docs.body}>
        <Link
          id={'document-'+doc.id}
          className={docs.title}
          to={`/home/${encodeURIComponent(props.homeId)}/documenti/${encodeURIComponent(doc.id)}`}
          state={props.backSearch ? { documentsSearch: props.backSearch, documentsAccountId: account.id } : undefined}
        >
          {title}
        </Link>
        <div className={docs.rowInfo}><span className={docs.rowType}>{types.join(' · ')||'Tipo non indicato'}</span><Tag>{VISIBILITY_LABEL[doc.visibility] ?? doc.visibility}</Tag>{props.showTypeCorrection&&<ChangeDocumentType homeId={props.homeId} document={doc} />}{props.archiveFamily&&!props.inSelectedGroup&&<span className={docs.rowFamily}>{familyLabel(doc.family)}</span>}{props.canChangeFamily&&doc.organization&&<ChangeHouseFamily archive={props.archiveFamily} key={doc.id+':'+doc.organization.version} homeId={props.homeId} document={doc} onChanged={props.onFamilyChanged}/>}</div>
        <DocumentRowContext doc={doc} homeId={props.homeId}/>
        {doc.permissions.includes('read') && (
          <DocumentWorkspaceActions homeId={props.homeId} document={doc}/>
        )}
        <details className={docs.fileDetails} data-file-id={doc.id} open={fileOpen} onToggle={e=>setFileOpen(e.currentTarget.open)}><summary aria-label={'Dettagli del file: '+title}>Dettagli del file</summary><dl>
          <div><dt>Nome originale</dt><dd>{doc.originalFilename}</dd></div>
          {title!==(doc.organization?.title.trim()||doc.name.trim())&&<div><dt>Titolo salvato</dt><dd>{doc.organization?.title||doc.name}</dd><dd>Il nome visualizzato usa i dati confermati e gli oggetti collegati. La ricerca continua a usare titolo salvato e nome originale.</dd></div>}
          <div><dt>Formato</dt><dd>{formatLabel(doc.mimeType)}</dd></div>
          <div><dt>Dimensione</dt><dd>{formatBytes(doc.byteSize)}</dd></div>
          <div><dt>Caricato il</dt><dd>{formatDate(doc.createdAt)}</dd></div>
        </dl></details>
      </div>
    </li>
  );
}

const UPLOAD_FIELDS = ['file', 'name', 'visibility'] as const;
const admissionRefused = (error: unknown) => isApiError(error) && error.status === 503 && ['file_check_unavailable', 'storage_capacity_low'].includes(error.code);
type UploadField = (typeof UPLOAD_FIELDS)[number];

/**
 * Caricamento di un originale.
 * - File e bozza solo in memoria; il componente è smontato al cambio di casa/account.
 * - Idempotency-Key per operazione: un esito ambiguo (rete/servizio) blocca i campi
 *   e consente di riprovare con la stessa chiave e lo stesso file, senza doppioni.
 *   Cambiare i dati dopo un esito ambiguo richiede una nuova operazione esplicita.
 * - Un rifiuto definitivo (422/413/415) permette di correggere: nuova chiave al prossimo invio.
 */
/** Esportato anche per «Da documento» in Spese: stesso caricamento M2, nessun secondo archivio. */
export function UploadForm(props: {
  home: Home;
  titleId: string;
  onCancel: () => void;
  onUploaded: (doc: DocumentDetail) => void;
}) {
  const { home } = props;
  const uploadAccount = useAccount();
  const verificationEnabled = useSession().data?.authRecovery?.enabled === true;
  const upload = useUploadDocument(home.id);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [nameEdited, setNameEdited] = useState(false);
  const [visibility, setVisibility] = useState<DocumentVisibility>('private');
  const [errors, setErrors] = useState<Partial<Record<UploadField, string>>>({});
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [locked, setLocked] = useState(false);
  const fileInputId = useId();

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const error = upload.error;
  const refused = admissionRefused(error);
  const isService = isApiError(error) && error.kind === 'service' && !refused;
  const isConflict = isApiError(error) && error.status === 409 && error.code === 'idempotency_conflict';

  const focusField = (field: UploadField) => {
    const selector = field === 'visibility' ? 'input[name="visibility"]:checked' : `[name="${field}"]`;
    formRef.current?.querySelector<HTMLInputElement>(selector)?.focus();
  };

  const send = (key: string) => {
    const clientErrors: Partial<Record<UploadField, string>> = {
      file: validateUploadFile(file),
      name: validateDocumentName(name),
    };
    setErrors(clientErrors);
    const first = UPLOAD_FIELDS.find((f) => clientErrors[f]);
    if (first || !file) {
      if (first) focusField(first);
      return;
    }
    upload.mutate(
      { input: { file, name: name.trim(), visibility }, idempotencyKey: key },
      {
        onSuccess: (doc) => props.onUploaded(doc),
        onError: (err) => {
          if (!isApiError(err)) return;
          if (admissionRefused(err)) {
            // These codes prove admission failed before a document/ledger commit.
            setLocked(false);
            setErrors({});
            return;
          }
          if (err.kind === 'service') {
            // Esito sconosciuto: il documento potrebbe essere stato salvato.
            setLocked(true);
            return;
          }
          const fieldErrors: Partial<Record<UploadField, string>> = {};
          for (const f of UPLOAD_FIELDS) if (err.fieldErrors[f]) fieldErrors[f] = err.fieldErrors[f];
          if (err.code === 'file_too_large' || err.code === 'unsupported_file_type') {
            fieldErrors.file = fieldErrors.file ?? err.message;
          }
          setErrors(fieldErrors);
          if ([413, 415, 422].includes(err.status)) {
            // Rifiuto definitivo: il prossimo invio, con dati corretti, è una nuova operazione.
            setIdempotencyKey(newIdempotencyKey());
          }
          const first = UPLOAD_FIELDS.find((f) => fieldErrors[f]);
          if (first) focusField(first);
        },
      },
    );
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (upload.isPending) return;
    send(idempotencyKey);
  };

  const startNewOperation = () => {
    setIdempotencyKey(newIdempotencyKey());
    setLocked(false);
    upload.reset();
  };

  const onFileChange = (chosen: File | null) => {
    setFile(chosen);
    setErrors((e) => ({ ...e, file: chosen ? validateUploadFile(chosen) : undefined }));
    if (chosen && !nameEdited) setName(chosen.name);
  };

  const disabled = locked || upload.isPending;
  const formError =
    upload.isError && !isService && !refused && !isConflict && !Object.values(errors).some(Boolean) ? userMessage(error) : null;

  if (uploadAccount.requiresEmailVerification && !uploadAccount.emailVerifiedAt) return <Banner tone="warning" title="Conferma la tua email prima di caricare"><p>{verificationEnabled?'Richiedi il link di conferma dal riquadro «Conferma la tua email» in questa pagina. Casa, Attività e Spese restano disponibili.':'La verifica email non è disponibile in questo momento. Nessun file è stato caricato. Riprova più tardi.'}</p><button className={ui.btn} onClick={props.onCancel}>Chiudi</button></Banner>;
  return (
    <form ref={formRef} className={cx(styles.form, docs.formFlush)} onSubmit={onSubmit} noValidate aria-labelledby={props.titleId}>
      <div>
        <h2 id={props.titleId} ref={titleRef} tabIndex={-1}>
          Carica documento
        </h2>
        <p className={docs.note}>Un file per volta: PDF, JPEG o PNG fino a circa 21 MB (limite tecnico di questa versione).</p>
      </div>
      <p className={docs.destination}>
        Destinazione: <strong>{home.name}</strong>
      </p>
      <p className={docs.note}>
        Prova personale: usa inizialmente documenti non delicati e conserva gli originali. In questa versione non puoi eliminare i documenti caricati.
        {' '}I nuovi file vengono controllati con Microsoft Defender di questo PC: secondo le impostazioni di Windows, Microsoft può ricevere informazioni o campioni dei file.
      </p>

      {refused && <Banner tone="warning" role="alert" title="Documento non salvato">
        <p>{isApiError(error) && error.code === 'storage_capacity_low'
          ? 'L’archivio non ha spazio sufficiente in questo momento. Il documento non è stato salvato: riprova più tardi.'
          : 'Non è stato possibile completare il controllo del file. Il documento non è stato salvato: riprova tra qualche minuto.'}</p>
      </Banner>}

      {isService && (
        <Banner
          tone="error"
          role="alert"
          title="Esito non confermato"
          actions={
            <>
              <button type="button" className={cx(ui.btn, ui.small)} onClick={() => send(idempotencyKey)} disabled={upload.isPending}>
                Riprova invio
              </button>
              <button type="button" className={cx(ui.btn, ui.small)} onClick={startNewOperation} disabled={upload.isPending}>
                Modifica e invia come nuovo
              </button>
            </>
          }
        >
          <p>
            Non è stato possibile confermare l’esito dell’invio. Il documento potrebbe essere già stato salvato. «Riprova invio» ripete la stessa
            richiesta senza creare doppioni; per cambiare file o dati controlla prima l’archivio.
          </p>
        </Banner>
      )}
      {isConflict && (
        <Banner
          tone="warning"
          role="alert"
          title="Richiesta in conflitto"
          actions={
            <button
              type="button"
              className={cx(ui.btn, ui.small)}
              onClick={() => {
                const key = newIdempotencyKey();
                setIdempotencyKey(key);
                upload.reset();
                send(key);
              }}
            >
              Invia come nuova richiesta
            </button>
          }
        >
          <p>
            Una richiesta precedente con dati diversi risulta già registrata. Controlla l’archivio prima di inviare una
            nuova richiesta, per non creare un doppione.
          </p>
        </Banner>
      )}
      {formError && (
        <Banner tone="error" role="alert" title="Documento non caricato">
          <p>{formError}</p>
        </Banner>
      )}

      <div className={ui.field}>
        <label className={ui.label} htmlFor={fileInputId}>
          File
        </label>
        <span id={`${fileInputId}-hint`} className={ui.hint}>
          PDF, JPEG o PNG, massimo circa 21 MB. Le foto vengono archiviate; l’analisi legge solo il testo presente nei PDF.
        </span>
        <input
          id={fileInputId}
          className={docs.fileInput}
          type="file"
          name="file"
          accept={ACCEPT_ATTRIBUTE}
          disabled={disabled}
          aria-invalid={errors.file ? true : undefined}
          aria-describedby={`${fileInputId}-hint${errors.file ? ` ${fileInputId}-error` : ''}`}
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
        {file && !errors.file && (
          <span className={docs.fileChosen}>
            Selezionato: {file.name} · {formatBytes(file.size)}
          </span>
        )}
        {errors.file && (
          <span id={`${fileInputId}-error`} className={ui.fieldError}>
            {errors.file}
          </span>
        )}
      </div>

      <Field
        label="Titolo"
        hint="Proposto dal nome del file, puoi cambiarlo. Massimo 160 caratteri."
        name="name"
        autoComplete="off"
        value={name}
        disabled={disabled}
        onChange={(e) => {
          setName(e.target.value);
          setNameEdited(true);
        }}
        error={errors.name}
      />

      <fieldset className={docs.fieldset} disabled={disabled}>
        <legend>Chi può vederlo</legend>
        {(['private', 'home'] as const).map((v) => (
          <label key={v} className={docs.radio}>
            <input
              type="radio"
              name="visibility"
              value={v}
              checked={visibility === v}
              onChange={() => setVisibility(v)}
            />
            <span>
              <strong>{VISIBILITY_LABEL[v]}</strong>
              <small>{VISIBILITY_HINT[v]}</small>
            </span>
          </label>
        ))}
        {errors.visibility && <span className={ui.fieldError}>{errors.visibility}</span>}
      </fieldset>

      <div className={styles.formActions}>
        {!locked && (
          <button type="submit" className={cx(ui.btn, ui.primary)} disabled={upload.isPending || isConflict}>
            {upload.isPending ? 'Caricamento e controllo del file…' : refused ? 'Riprova' : 'Carica'}
          </button>
        )}
        <button type="button" className={cx(ui.btn, ui.ghost)} onClick={props.onCancel} disabled={upload.isPending}>
          Annulla
        </button>
      </div>
    </form>
  );
}
