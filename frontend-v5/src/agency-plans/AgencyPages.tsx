import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Link,useNavigate,useParams,useSearchParams} from 'react-router';
import {AppShell} from '../components/AppShell';
import {useDocumentTitle} from '../components/ui';
import {useAccount,useApi} from '../session/session';
import {ApiError} from '../api/errors';
import {agencyPlanApi,type AgencyPractice,type PlansResponse} from './api';
import {pdfPageCount} from './pdfPageCount';
import {AgencyPracticePlanWorkspace} from './AgencyPracticePlanWorkspace';
import styles from './practice-plan.module.css';
import {FascicoloChecklist} from './FascicoloChecklist';
import {SimpleAgencyGiftPanel} from '../agency-gift/SimpleAgencyGiftPanel';
import {PracticeReviewSection} from '../agency-review/PracticeReviewSection';
import {NewPractice} from './NewPractice';
import {ListingPlanExport} from './ListingPlanExport';
import {useJourney,stageLabels} from './journey';
import {PracticeProfile,PracticeListing,PracticeTransaction} from './PracticeJourneyPanels';
type Agency={id:string;name:string;role:string};
type Job={id:string;status:string;capMicros:number;spentMicros:number};
const sourceKinds={unclassified:'Da classificare',deed:'Atto',cadastral:'Visura',floor_plan:'Planimetria',succession:'Successione',ape:'APE',other:'Altro'} as const;
type SourceKind=keyof typeof sourceKinds;
type ClassificationRequest={key:string;sourceId:string;body:{expectedRevision:number;expectedSourceVersion:number;kind:SourceKind}};
function SourceTypeForm(p:{document:AgencyPractice['documents'][number];disabled:boolean;save:(kind:SourceKind)=>void}){
 const [kind,setKind]=useState(p.document.kind);
 return <form onSubmit={e=>{e.preventDefault();if(!p.disabled&&kind!==p.document.kind&&Object.hasOwn(sourceKinds,kind))p.save(kind as SourceKind);}}><label>Tipo di documento<select aria-label={'Tipo di documento per '+p.document.filename} value={kind} disabled={p.disabled} onChange={e=>setKind(e.target.value)}>{!Object.hasOwn(sourceKinds,p.document.kind)&&<option value={p.document.kind}>Tipo non riconosciuto</option>}{Object.entries(sourceKinds).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><button type="submit" disabled={p.disabled||kind===p.document.kind}>Salva tipo</button></form>;
}
const status:Record<string,string>={queued:'In attesa',leased:'Analisi in corso',completed:'Analisi terminata',uncertain:'Esito incerto: nessun reinvio automatico',expired:'Analisi interrotta: richiede verifica',failed:'Analisi non riuscita prima dell’invio AI'};
function message(e:unknown){return e instanceof ApiError&&[401,403].includes(e.status)?'Accesso non disponibile con questa sessione.':e instanceof ApiError&&e.status===409?'La pratica è cambiata. Ricarica prima di riprovare.':'Operazione non conclusa. Riprova con lo stesso invio o ricarica.';}
export function AgenciesPage(){useDocumentTitle("Agenzie");
 const account=useAccount(),api=useApi(),navigate=useNavigate(),[agencies,setAgencies]=useState<Agency[]|null>(null),[enabled,setEnabled]=useState<boolean|null>(null),[name,setName]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),key=useRef<string|null>(null);
 useEffect(()=>{const c=new AbortController();api.callJson<{enabled:boolean}>('/agency-capabilities',{accountId:account.id,signal:c.signal}).then(async cap=>{setEnabled(cap.enabled);if(cap.enabled){const r=await api.callJson<{agencies:Agency[]}>('/agencies',{accountId:account.id,signal:c.signal});if(!c.signal.aborted)setAgencies(r.agencies);}}).catch(e=>{if(!c.signal.aborted)setError(message(e));});return()=>c.abort();},[api,account.id]);
 async function create(){setBusy(true);setError('');key.current??=crypto.randomUUID();try{const r=await api.callJson<{agency:Agency}>('/agencies',{method:'POST',accountId:account.id,idempotencyKey:key.current,body:{name}});navigate('/agenzie/'+r.agency.id);}catch(e){setError(message(e));}finally{setBusy(false);}}
 return <AppShell account={account}><div className={styles.workspace}><h1>Agenzie</h1><p>Fascicoli immobiliari e analisi delle planimetrie.</p>{error&&<p role="alert">{error}</p>}{enabled===false?<p>Area Agenzie non configurata in questo ambiente. Nessun dato dimostrativo viene caricato al suo posto.</p>:agencies===null?<p>Caricamento agenzie…</p>:<><ul>{agencies.map(a=><li key={a.id}><Link to={'/agenzie/'+a.id}>{a.name}</Link> · {a.role==='viewer'?'Consultazione':'Gestione pratiche'}</li>)}</ul>{!agencies.length&&<p>Nessuna agenzia assegnata. Puoi creare il tuo spazio agenzia.</p>}<form onSubmit={e=>{e.preventDefault();void create();}}><label>Nome agenzia<input value={name} maxLength={200} required disabled={busy} onChange={e=>{setName(e.target.value);key.current=null;}}/></label><button disabled={busy||!name.trim()}>Crea spazio agenzia</button></form></>}</div></AppShell>;
}
export function AgencyPracticesPage(){const {agencyId=''}=useParams(),account=useAccount();return <PracticeList key={account.id+':'+agencyId} agencyId={agencyId}/>;}
function PracticeList({agencyId}:{agencyId:string}) {
 useDocumentTitle("Pratiche agenzia");
 const account=useAccount(),api=useApi(),navigate=useNavigate();
 const [data,setData]=useState<{agency:Agency;practices:Array<{id:string;label:string;stage?:keyof typeof stageLabels}>;nextAfter:string|null}|null>(null);
 const [query,setQuery]=useState(''),[creating,setCreating]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const root='/agencies/'+encodeURIComponent(agencyId)+'/practices';
 useEffect(()=>{
  const c=new AbortController();
  Promise.all([
   api.callJson<{agencies:Agency[]}>('/agencies',{accountId:account.id,signal:c.signal}),
   api.callJson<{practices:Array<{id:string;label:string;stage?:keyof typeof stageLabels}>;nextAfter:string|null}>(root,{accountId:account.id,signal:c.signal}),
  ]).then(([all,result])=>{
   const agency=all.agencies.find(a=>a.id===agencyId);
   if(!agency)throw Error('scope');
   if(!c.signal.aborted)setData({agency,...result});
  }).catch(e=>{if(!c.signal.aborted)setError(message(e));});
  return()=>c.abort();
 },[api,account.id,agencyId,root]);
 async function more(){
  if(!data?.nextAfter||busy)return;
  setBusy(true);setError('');
  try{
   const result=await api.callJson<{practices:Array<{id:string;label:string;stage?:keyof typeof stageLabels}>;nextAfter:string|null}>(root+'?after='+encodeURIComponent(data.nextAfter),{accountId:account.id});
   setData(v=>v?{...v,practices:[...v.practices,...result.practices],nextAfter:result.nextAfter}:v);
  }catch(e){setError(message(e));}finally{setBusy(false);}
 }
 const matches=data?.practices.filter(p=>p.label.toLocaleLowerCase('it').includes(query.toLocaleLowerCase('it')));
 return <AppShell account={account}><div className={styles.workspace}>
  <Link to="/agenzie">Spazi agenzia</Link>
  <header className={styles.practiceTools}><div><p>{data?.agency.name}</p><h1>Pratiche di vendita</h1></div>
   {data&&data.agency.role!=='viewer'&&!creating&&<button type="button" onClick={()=>setCreating(true)}>Nuova pratica</button>}
  </header>
  {error&&<p role="alert">{error}</p>}
  {creating?<NewPractice api={api} accountId={account.id} agencyId={agencyId} onCancel={()=>setCreating(false)} onCreated={id=>navigate('/agenzie/'+agencyId+'/pratiche/'+id+'?area=fascicolo')}/>:
   data?<><label>Cerca pratica per immobile o riferimento<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Indirizzo o nome pratica"/></label>
    <p>{data.practices.length} pratiche caricate{data.nextAfter?' · Altre disponibili':''}</p>
    <div className={styles.checklistScroll}><table className={styles.practiceTable}><thead><tr><th>Immobile / riferimento</th><th>Fase</th><th>Apri</th></tr></thead><tbody>
     {matches?.map(practice=><tr key={practice.id}><th scope="row"><Link to={'/agenzie/'+agencyId+'/pratiche/'+practice.id}>{practice.label}</Link></th><td>{stageLabels[practice.stage??'preparation']??'Da verificare'}</td><td><Link to={'/agenzie/'+agencyId+'/pratiche/'+practice.id+'?area=fascicolo'}>Fascicolo</Link></td></tr>)}
    </tbody></table></div>
    {!matches?.length&&<p>{query?'Nessuna corrispondenza nelle pratiche caricate.':'Nessuna pratica assegnata.'}</p>}
    {data.nextAfter&&<button disabled={busy} onClick={()=>void more()}>Carica altre pratiche</button>}
   </>:!error&&<p>Caricamento pratiche…</p>}
 </div></AppShell>;
}
export function AgencyPracticePage(){const {agencyId='',practiceId=''}=useParams(),account=useAccount();return <AgencyPractice key={account.id+':'+agencyId+':'+practiceId} agencyId={agencyId} practiceId={practiceId}/>;}
const practiceAreas = [
 {id:'panoramica', label:'Panoramica'},
 {id:'fascicolo', label:'Fascicolo'},
 {id:'analisi', label:'Analisi documenti'},
 {id:'planimetria', label:'Planimetria'},
 {id:'annuncio', label:'Annuncio'},
 {id:'trattativa', label:'Trattativa'},
 {id:'stipula', label:'Stipula'},
] as const;
type PracticeArea = typeof practiceAreas[number]['id'];

function PracticeOverview({practice,plans,stage='preparation'}:{practice:AgencyPractice;plans:PlansResponse['plans']|null;stage?:keyof typeof stageLabels}) {
 const currentPlans = plans?.filter(plan=>plan.rooms!==null);
 const plan = currentPlans?.[0];
 const rooms = plan?.rooms?.length ?? 0;
 const issues = plan?.issues?.length ?? 0;
 const floorPlan = practice.documents.some(document=>document.kind==='floor_plan');
 const requiresReview = plan && (!rooms || issues || plan.surfaceProposal?.state==='pending');
 const phaseAction=stage==='completed'?'Prepara la consegna al proprietario':stage==='closing'?'Prepara la stipula':stage==='negotiation'?'Segui la trattativa':stage==='marketing'?'Completa l’annuncio':null;
 const nextAction = phaseAction || (requiresReview ? 'Sistemare la planimetria'
  : !practice.documents.length ? 'Aggiungere i documenti'
  : plan?.measurementConfiguration && !plan.measurement ? 'Aggiornare il computo'
  : !plan && floorPlan && plans ? 'Aprire la planimetria'
  : 'Controllare il fascicolo');
 const phaseArea=stage==='completed'||stage==='closing'?'stipula':stage==='negotiation'?'trattativa':stage==='marketing'?'annuncio':null;
 const area = phaseArea || (requiresReview || nextAction==='Aggiornare il computo' || nextAction==='Aprire la planimetria' ? 'planimetria' : 'fascicolo');
 return <section className={styles.nextAction} aria-labelledby="practice-next-action">
   <p>Prossima azione</p>
   <h2 id="practice-next-action">{nextAction}</h2>
   <p>{practice.documents.length} {practice.documents.length===1?'documento disponibile':'documenti disponibili'}.</p>
   <p>{plan?(requiresReview?'Planimetria da completare.':'Contorni disponibili.'):plans?(floorPlan?'Documento di planimetria presente.':'Planimetria da acquisire.'):'Stato della planimetria in verifica.'}</p>
   {plan&&<p>{rooms} {rooms===1?'vano salvato':'vani salvati'} · {issues} {issues===1?'verifica aperta':'verifiche aperte'}.</p>}
   <Link className={styles.primaryAction} to={'?area='+area}>{area==='planimetria'?'Vai alla planimetria':area==='fascicolo'?'Apri il fascicolo':area==='stipula'?'Vai alla stipula':area==='trattativa'?'Vai alla trattativa':'Apri annuncio'}</Link>
  </section>;
}

function AgencyPractice(p:{agencyId:string;practiceId:string}){useDocumentTitle("Pratica agenzia");
 const account=useAccount(),api=useApi(),root='/agencies/'+encodeURIComponent(p.agencyId)+'/practices/'+encodeURIComponent(p.practiceId),scope=account.id+':'+p.agencyId+':'+p.practiceId;
 const planApi=useMemo(()=>agencyPlanApi(api,{accountId:account.id,agencyId:p.agencyId,practiceId:p.practiceId}),[api,account.id,p.agencyId,p.practiceId]);
 const [practice,setPractice]=useState<AgencyPractice|null>(null),[options,setOptions]=useState<{available:boolean;enabled:boolean;canEdit:boolean;budgetAvailable:boolean;capMicros:number;priceVersion:string}|null>(null),[jobs,setJobs]=useState<Job[]>([]),[reload,setReload]=useState(0),[error,setError]=useState(''),[busy,setBusy]=useState(false),[file,setFile]=useState<File|null>(null),[visibility,setVisibility]=useState('private'),[selected,setSelected]=useState(''),[pageChoice,setPageChoice]=useState<{key:string;value:number}|null>(null),[instructions,setInstructions]=useState(''),[approvedDocument,setApprovedDocument]=useState(''),[workspaceKey,setWorkspaceKey]=useState(0),[newPlans,setNewPlans]=useState(false);
 const refreshScope=useCallback(()=>setReload(v=>v+1),[]);
 const journey=useJourney(api,root,account.id,refreshScope);
 const [analysisPlans,setAnalysisPlans]=useState<PlansResponse['plans']|null>(null);
 const [search]=useSearchParams();
 const area:PracticeArea = practiceAreas.find(item=>item.id===search.get('area'))?.id ?? 'panoramica';
 const [uploadPending,setUploadPending]=useState<{key:string;body:FormData}|null>(null),[analysisPending,setAnalysisPending]=useState<{key:string;body:{sourceId:string;version:number;page:number;expectedRevision:number;instructions:string;expectedCapMicros:number;priceVersion:string;approved:true}}|null>(null);
 const [classificationPending,setClassificationPending]=useState<ClassificationRequest|null>(null),[classificationConflict,setClassificationConflict]=useState(false),classificationFlight=useRef(false);
 const uploadKey=useRef<string|null>(null),analysisKey=useRef<string|null>(null),alive=useRef(true),completed=useRef(new Set<string>());
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{const c=new AbortController();Promise.all([planApi.practice(c.signal),planApi.plans(c.signal),api.callJson<NonNullable<typeof options>>(root+'/analysis-options',{accountId:account.id,signal:c.signal})]).then(([pr,plans,o])=>{if(!c.signal.aborted){setPractice(pr);setAnalysisPlans(plans.plans);setOptions(o);}}).catch(e=>{if(!c.signal.aborted){setError(message(e));if(e instanceof ApiError&&[401,403].includes(e.status))setPractice(null);}});return()=>c.abort();},[planApi,api,root,account.id,reload]);
 useEffect(()=>{const c=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;async function poll(){try{const r=await api.callJson<{jobs:Job[]}>(root+'/analysis-jobs',{accountId:account.id,signal:c.signal});if(c.signal.aborted)return;setJobs(r.jobs);for(const j of r.jobs)if(j.status==='completed'&&!completed.current.has(j.id)){completed.current.add(j.id);setNewPlans(true);setReload(v=>v+1);}if(r.jobs.some(j=>['queued','leased'].includes(j.status)))timer=setTimeout(()=>void poll(),1500);}catch(e){if(!c.signal.aborted){setError(message(e));if(e instanceof ApiError&&[401,403].includes(e.status)){setPractice(null);setOptions(null);setJobs([]);}}}}void poll();return()=>{c.abort();if(timer)clearTimeout(timer);};},[api,account.id,root,reload,planApi]);
 async function upload(){if(!file||!practice||classificationPending||classificationConflict)return;setBusy(true);setError('');let request=uploadPending;if(!request){uploadKey.current??=crypto.randomUUID();const form=new FormData();form.set('file',file);form.set('metadata',JSON.stringify({expectedRevision:practice.revision,visibility}));request={key:uploadKey.current,body:form};setUploadPending(request);}try{const r=await api.callJson<{practice:AgencyPractice}>(root+'/sources',{method:'POST',accountId:account.id,idempotencyKey:request.key,body:request.body});if(alive.current){setUploadPending(null);setPractice(r.practice);setFile(null);uploadKey.current=null;setReload(v=>v+1);}}catch(e){if(alive.current){if(e instanceof ApiError&&e.status===422){setUploadPending(null);uploadKey.current=null;}setError(message(e));if(e instanceof ApiError&&[401,403].includes(e.status)){setPractice(null);setOptions(null);}}}finally{if(alive.current)setBusy(false);}}
 async function classify(id:string,version:number,kind:SourceKind){
  if(!practice||!options?.canEdit||busy||classificationFlight.current||uploadPending||analysisPending||classificationConflict)return;
  const request=classificationPending??{key:crypto.randomUUID(),sourceId:id,body:{expectedRevision:practice.revision,expectedSourceVersion:version,kind}};
  if(request.sourceId!==id||request.body.expectedSourceVersion!==version||request.body.kind!==kind)return;
  classificationFlight.current=true;setBusy(true);setError('');setClassificationPending(request);
  try{const result=await api.callJson<{practice:AgencyPractice}>(root+'/sources/'+encodeURIComponent(request.sourceId)+'/classification',{method:'POST',accountId:account.id,idempotencyKey:request.key,body:request.body});if(alive.current){setClassificationPending(null);setSelected('');setApprovedDocument('');analysisKey.current=null;setPractice(result.practice);setReload(v=>v+1);}}
  catch(e){if(alive.current){setError(message(e));if(e instanceof ApiError&&[401,403,404].includes(e.status)){setClassificationPending(null);setPractice(null);setOptions(null);setJobs([]);}else if(e instanceof ApiError&&e.status===409){setClassificationPending(null);setClassificationConflict(true);}else if(e instanceof ApiError&&e.kind==='http'&&e.status<500&&e.status!==408)setClassificationPending(null);}}
  finally{classificationFlight.current=false;if(alive.current)setBusy(false);}
 }
 const floorPlans=practice?.documents.filter(document=>document.kind==='floor_plan')??[];
 const selectedDocument=floorPlans.length===1?floorPlans[0]:floorPlans.find(document=>document.id===selected);
 const selectedDocumentKey=selectedDocument?JSON.stringify([selectedDocument.id,selectedDocument.version]):'';
 const [documentPages,setDocumentPages]=useState<{key:string;count:number|null}|null>(null);
 const sourceId=selectedDocument?.id,sourceVersion=selectedDocument?.version,sourceHash=selectedDocument?.sha256;
 const sourceMime=selectedDocument?.mimeType;
 const pageCount=sourceMime==='image/png'?1:documentPages?.key===selectedDocumentKey?documentPages.count:undefined;
 const page=pageCount===1?1:pageChoice?.key===selectedDocumentKey?pageChoice.value:1;
 const pageValid=!!pageCount&&pageCount<=20&&Number.isInteger(page)&&page>=1&&page<=pageCount;
 useEffect(()=>{
  if(area!=='planimetria'||!sourceId||sourceMime==='image/png')return;
  const controller=new AbortController();
  async function loadPageCount(){
   try{
    if(!sourceHash||sourceVersion===undefined)throw new Error('Missing document metadata');
    const file=await api.callBinary(root+'/sources/'+encodeURIComponent(sourceId!)+'/file?version='+sourceVersion+'&sha256='+encodeURIComponent(sourceHash),controller.signal,account.id);
    if(file.contentType.split(';')[0]!=='application/pdf')throw new Error('Unsupported document');
    const count=await pdfPageCount(file.blob,controller.signal);
    if(!controller.signal.aborted)setDocumentPages({key:selectedDocumentKey,count});
   }catch{
    if(!controller.signal.aborted)setDocumentPages({key:selectedDocumentKey,count:null});
   }
  }
  void loadPageCount();
  return()=>controller.abort();
 },[account.id,api,area,root,selectedDocumentKey,sourceHash,sourceId,sourceMime,sourceVersion]);
 const approved=!!selectedDocumentKey&&approvedDocument===selectedDocumentKey;
 async function analyze(){if(!practice||classificationPending||classificationConflict||(!approved&&!analysisPending))return;let request=analysisPending;if(!request){const document=selectedDocument;if(!document||!pageValid)return;analysisKey.current??=crypto.randomUUID();request={key:analysisKey.current,body:{sourceId:document.id,version:document.version,page,expectedRevision:practice.revision,instructions,expectedCapMicros:options?.capMicros??0,priceVersion:options?.priceVersion||'',approved:true}};setAnalysisPending(request);}setBusy(true);setError('');try{await api.callJson(root+'/analysis-jobs',{method:'POST',accountId:account.id,idempotencyKey:request.key,body:request.body});if(alive.current){setAnalysisPending(null);setApprovedDocument('');analysisKey.current=null;setReload(v=>v+1);}}catch(e){if(alive.current){if(e instanceof ApiError&&e.status===422){setAnalysisPending(null);analysisKey.current=null;}setError(message(e));if(e instanceof ApiError&&[401,403].includes(e.status)){setPractice(null);setOptions(null);}}}finally{if(alive.current)setBusy(false);}}
 return <AppShell account={account}><div className={area==='planimetria'?styles.workspace+' '+styles.mapPage:styles.workspace}>
  <Link to={'/agenzie/'+p.agencyId}>Torna alle pratiche</Link>
  <header className={styles.practiceHeader}>
   <p>Pratica di compravendita</p>
   <h1>{practice?.label||'Pratica immobile'}</h1>
  </header>
  {error&&<p role="alert">{error}</p>}
  {!practice&&!error&&<p role="status">Caricamento pratica…</p>}
  {practice&&<>
   <nav className={area==='planimetria'?styles.areaNavigation+' '+styles.mapNavigation:styles.areaNavigation} aria-label="Aree della pratica">
    {practiceAreas.map(item=><Link key={item.id} to={item.id==='panoramica'?'?':'?area='+item.id} aria-current={area===item.id?'page':undefined}>{item.label}</Link>)}
   </nav>
   {journey.notice&&<p role="status" className={styles.toast}>{journey.notice}</p>}
   {journey.error&&<div role="alert"><p>{journey.error}</p>{journey.uncertain&&<button type="button" disabled={journey.busy} onClick={()=>void journey.retry()}>Riprova lo stesso salvataggio</button>}<button type="button" disabled={journey.busy} onClick={journey.refresh}>Ricarica dati della pratica</button></div>}
   {journey.snapshot&&area!=='planimetria'&&<div className={styles.journeyTrack} aria-label="Fasi della vendita">{Object.entries(stageLabels).map(([id,label])=><span key={id} aria-current={journey.snapshot?.state.stage===id?'step':undefined}>{label}</span>)}</div>}
   {area==='panoramica'&&<>
    <PracticeOverview practice={practice} plans={analysisPlans} stage={journey.snapshot?.state.stage}/>
    {journey.snapshot&&<PracticeProfile key={JSON.stringify(journey.snapshot.state.profile)} state={journey.snapshot.state} save={journey.save} stale={journey.snapshot.profileStale} disabled={!options?.canEdit||journey.busy||journey.uncertain}/>}
   </>}
   {area==='fascicolo'&&<button type="button" disabled={busy} onClick={()=>{setUploadPending(null);setAnalysisPending(null);setClassificationPending(null);setClassificationConflict(false);setPractice(null);uploadKey.current=null;analysisKey.current=null;setFile(null);setApprovedDocument('');setError('');setWorkspaceKey(v=>v+1);setReload(v=>v+1);}}>Ricarica pratica e scarta modifiche locali</button>}
   <div hidden={area!=='fascicolo'}>
    {journey.snapshot?<FascicoloChecklist key={JSON.stringify(journey.snapshot.state.checklist)} documents={practice.documents} canEdit={!!options?.canEdit&&!journey.uncertain} initial={journey.snapshot.state.checklist} saving={journey.busy} onSave={checklist=>journey.save({operation:'checklist',checklist})}/>:<p>Caricamento checklist salvata…</p>}
    <nav className={styles.planTasks} aria-label="Azioni del fascicolo"><a className={styles.primaryAction} href="#carica-documenti">Carica documenti</a><Link className={styles.primaryAction} to="?area=analisi">Analizza documenti</Link></nav>
    <section id="carica-documenti" className={styles.panel}><h2>Documenti della pratica</h2><label>Documento PDF o PNG<input type="file" accept="application/pdf,image/png" disabled={busy||!!uploadPending||!!analysisPending||!!classificationPending||classificationConflict||!options?.canEdit} onChange={e=>{setFile(e.target.files?.[0]||null);uploadKey.current=null;}}/></label><label>Visibilità<select value={visibility} disabled={busy||!!uploadPending||!!analysisPending||!!classificationPending||classificationConflict||!options?.canEdit} onChange={e=>{setVisibility(e.target.value);uploadKey.current=null;}}><option value="private">Privato, visibile solo a me</option><option value="practice">Condiviso nella pratica</option></select></label><button type="button" disabled={busy||!!analysisPending||!!classificationPending||classificationConflict||!file||!options?.canEdit} onClick={()=>void upload()}>{uploadPending?'Riprova lo stesso caricamento':'Carica documento nella pratica'}</button>{classificationPending&&<p role="status">Il tipo scelto è in attesa di esito. Puoi riprovare lo stesso invio oppure ricaricare la pratica.</p>}{classificationPending&&!busy&&<button type="button" disabled={!options?.canEdit} onClick={()=>void classify(classificationPending.sourceId,classificationPending.body.expectedSourceVersion,classificationPending.body.kind)}>Riprova lo stesso tipo</button>}<ul>{practice.documents.map(d=><li key={d.id}>{d.filename} · {journey.snapshot?.state.checklist.assignments[d.id]==='mandate'?'Incarico di vendita':Object.hasOwn(sourceKinds,d.kind)?sourceKinds[d.kind as SourceKind]:'Tipo non riconosciuto'}{journey.snapshot?.state.checklist.assignments[d.id]!=='mandate'&&<SourceTypeForm key={d.id+':'+d.version+':'+d.kind} document={d} disabled={busy||!!uploadPending||!!analysisPending||!!classificationPending||classificationConflict||!options?.canEdit} save={kind=>void classify(d.id,d.version,kind)}/>}</li>)}</ul></section>
   </div>
   <div hidden={area!=='analisi'} id="analisi-documenti"><PracticeReviewSection journeyMode documents={practice.documents} practiceRevision={practice.revision} onChanged={refreshScope} onAccessDenied={refreshScope} transport={api} scope={{accountId:account.id,agencyId:p.agencyId,practiceId:p.practiceId}} readOnly={!options?.canEdit||!!analysisPending||!!uploadPending||!!classificationPending||classificationConflict}/></div>
   <div hidden={area!=='planimetria'}>

    <AgencyPracticePlanWorkspace embedded onSaved={refreshScope} key={workspaceKey} api={planApi} scopeKey={scope+':'+workspaceKey} readOnly={!options?.canEdit||!!analysisPending||!!uploadPending||!!classificationPending||classificationConflict}/>
    <details className={styles.panel} open={!(analysisPlans?.length)||undefined}><summary>Analisi del documento</summary><h2>Analizza la planimetria</h2>{floorPlans.length===0?<p>Carica e classifica un documento come planimetria per analizzarlo.</p>:floorPlans.length===1?<p><strong>Documento</strong> · {floorPlans[0]!.filename} · v{floorPlans[0]!.version}</p>:<label>Documento<select value={selectedDocument?.id??''} disabled={busy||!!analysisPending||!!uploadPending||!!classificationPending||classificationConflict} onChange={e=>{setSelected(e.target.value);setPageChoice(null);analysisKey.current=null;setApprovedDocument('');}}><option value="">Scegli una planimetria</option>{floorPlans.map(d=><option key={d.id} value={d.id}>{d.filename} · v{d.version}</option>)}</select></label>}{selectedDocument&&pageCount===undefined&&<p role="status">Verifica del numero di pagine…</p>}
    {selectedDocument&&pageCount===null&&<p role="alert">Impossibile leggere il numero di pagine. Controlla il documento e ricarica la pratica.</p>}
    {pageCount!==undefined&&pageCount!==null&&pageCount>20&&<p>Per l’analisi carica un PDF di massimo 20 pagine.</p>}
    {pageCount!==undefined&&pageCount!==null&&pageCount>1&&pageCount<=20&&<label>Pagina<input type="number" min="1" max={pageCount} value={page} disabled={busy||!!analysisPending||!!uploadPending||!!classificationPending||classificationConflict} onChange={e=>{setPageChoice({key:selectedDocumentKey,value:Number(e.target.value)});analysisKey.current=null;setApprovedDocument('');}}/></label>}<label>Indicazioni per l’analisi, facoltative<textarea value={instructions} maxLength={4000} disabled={busy||!!analysisPending||!!uploadPending||!!classificationPending||classificationConflict} onChange={e=>{setInstructions(e.target.value);analysisKey.current=null;setApprovedDocument('');}}/></label>{analysisPending&&<button type="button" disabled={busy} onClick={()=>void analyze()}>Riprova lo stesso avvio</button>}{options?.available?<><p>La pagina selezionata viene inviata ad Anthropic (Claude Sonnet 5.5) per lettura e controllo; Dimora ricava i contorni localmente. Limite massimo per questa analisi: {(options.capMicros/1000000).toLocaleString('it-IT')} USD, dal budget dell’agenzia. Il risultato richiede controllo.</p><label><input type="checkbox" checked={approved} disabled={!pageValid||busy||!!analysisPending||!!uploadPending||!!classificationPending||classificationConflict} onChange={e=>setApprovedDocument(e.target.checked?selectedDocumentKey:'')}/>Autorizzo l’analisi di questo documento con il budget indicato.</label><button disabled={busy||!!analysisPending||!!uploadPending||!!classificationPending||classificationConflict||!selectedDocument||!approved||!pageValid} onClick={()=>void analyze()}>Analizza planimetria</button></>:<p>{!options?.enabled?'Analisi AI non configurata in questo ambiente.':'Analisi non disponibile: serve un budget attivo e l’accesso in modifica.'} I piani già presenti rimangono consultabili.</p>}<ul>{jobs.map(j=><li key={j.id}>{j.status==='completed'?analysisOutcome(analysisPlans?.find(plan=>plan.id===j.id)):status[j.status]||'Stato da verificare'} · costo registrato {(j.spentMicros/1000000).toLocaleString('it-IT')} USD</li>)}</ul>{newPlans&&<div role="status"><p>L’analisi è terminata. Apri la planimetria per controllare il risultato. Le modifiche locali non salvate verranno scartate.</p><button type="button" onClick={()=>{setWorkspaceKey(v=>v+1);setNewPlans(false);}}>Apri risultato dell’analisi</button></div>}</details>
   </div>
   {area==='annuncio'&&<>{journey.snapshot&&<PracticeListing key={JSON.stringify(journey.snapshot.state.listing)} state={journey.snapshot.state} save={journey.save} disabled={!options?.canEdit||journey.busy||journey.uncertain}/>}<section className={styles.panel}><h2>Pianta per l’annuncio</h2>{analysisPlans?.filter(plan=>plan.rooms?.length).map(plan=><ListingPlanExport key={plan.id+':'+plan.geometryRevision} rooms={plan.rooms!} disabled={!options?.canEdit}/>)}{!analysisPlans?.some(plan=>plan.rooms?.length)&&<p>Salva almeno un vano nella planimetria per esportare la pianta.</p>}</section></>}
   {(area==='trattativa'||area==='stipula')&&journey.snapshot&&<PracticeTransaction closing={area==='stipula'} key={JSON.stringify(journey.snapshot.state.transaction)} state={journey.snapshot.state} save={journey.save} disabled={!options?.canEdit||journey.busy||journey.uncertain} delivery={'/agenzie/'+p.agencyId+'/pratiche/'+p.practiceId+'/consegna'}/>}

  </>}
 </div></AppShell>;
}

function analysisOutcome(plan: PlansResponse['plans'][number] | undefined) {
 if (!plan?.rooms) return 'Analisi terminata';
 const count = plan.edits?.[0]?.rooms.length ?? plan.rooms.length;
 const issues = plan.issues?.length ?? 0;
 const outcome = count === 0 ? 'Nessun contorno ricostruito' : `${count} ${count === 1 ? 'contorno ricostruito' : 'contorni ricostruiti'}`;
 return issues ? `${outcome} · ${issues} ${issues === 1 ? 'verifica aperta' : 'verifiche aperte'}` : outcome;
}

export function AgencyDeliveryPage() {
 const {agencyId='', practiceId=''} = useParams();
 const account = useAccount();
 return <AgencyDelivery key={account.id+':'+agencyId+':'+practiceId} agencyId={agencyId} practiceId={practiceId}/>;
}

function AgencyDelivery({agencyId,practiceId}:{agencyId:string;practiceId:string}) {
 useDocumentTitle('Consegna dopo la stipula');
 const account = useAccount(), api = useApi();
 const scope = useMemo(()=>({accountId:account.id,agencyId,practiceId}),[account.id,agencyId,practiceId]);
 const planApi = useMemo(()=>agencyPlanApi(api,scope),[api,scope]);
 const [confirmed,setConfirmed] = useState(false);
 const [state,setState] = useState<{practice:AgencyPractice;enabled:boolean;canEdit:boolean}|null>(null);
 const [error,setError] = useState('');
 useEffect(()=>{
  const controller = new AbortController(), signal = controller.signal;
  const root = '/agencies/'+encodeURIComponent(agencyId)+'/practices/'+encodeURIComponent(practiceId);
  Promise.all([planApi.practice(signal),api.gift.capabilities(account.id,signal),api.callJson<{canEdit:boolean}>(root+'/analysis-options',{accountId:account.id,signal})])
   .then(([practice,capabilities,options])=>{if(!signal.aborted)setState({practice,enabled:capabilities.enabled,canEdit:options.canEdit});})
   .catch(e=>{if(!signal.aborted)setError(message(e));});
  return ()=>controller.abort();
 },[api,account.id,agencyId,practiceId,planApi]);
 return <AppShell account={account}><div className={styles.workspace}>
  <Link to={'/agenzie/'+agencyId+'/pratiche/'+practiceId}>Torna alla pratica</Link>
  <h1>Consegna dopo la stipula</h1>
  {error&&<p role="alert">{error}</p>}
  {state?<><p>{state.practice.label}</p>{state.enabled?<><label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> La stipula si è conclusa</label>
   <SimpleAgencyGiftPanel api={api.gift} scope={scope} readOnly={!state.canEdit||!confirmed}/>
  </>:<p>Consegna digitale non disponibile in questo ambiente.</p>}</>:!error&&<p role="status">Caricamento pratica…</p>}
 </div></AppShell>;
}
